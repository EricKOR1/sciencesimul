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
  const numOf = (id) => { const e = $('#' + id); if (!e) return null; const v = e.value.trim().replace(',', '.'); return v === '' || !isFinite(+v) ? null : +v; };
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

/* =========================================================
   행성우주과학 Ⅱ. 태양과 별의 관측 - 태양 대기와 다파장 관측 (2차시)
   성취기준 [12행우02-01] 태양의 광구와 대기에서 나타나는 현상을 설명하고, 이러한 현상이 다양한 파장의 관측 자료에서 어떻게 나타나는지 비교·분석할 수 있다.
   ① 모형: 대기 구조 (높이–온도, 밀도, 층 이름)
   ② 관찰: 대기 현상 (홍염·암선, 플레어, CME, 코로나 홀)
   ③ 분석: 다파장 (6개 파장 영상, 온도, 대기 투과율)
   ④ 탐구: 영상 합성 (21.1·19.3·17.1 nm → 빨강·초록·파랑)
   다루지 않음: 코로나 가열 이론, 자기 재결합의 수식, 방출선 스펙트럼의 원자 물리(고온일수록 철 이온이 전자를 더 많이 잃는다는 한 줄만).
   ========================================================= */
  initStage('#e8eef8', 800, 620, 480, 860, 1.25);
  if (PHONE) view.canvas.style.touchAction = 'pan-y';

  /* ================= 자료 ================= */
  const lg = (x) => Math.log10(x);
  const sph = (phi, lon) => ({ x: Math.cos(phi * DEG) * Math.sin(lon * DEG), y: Math.sin(phi * DEG), z: Math.cos(phi * DEG) * Math.cos(lon * DEG) });
  const limb = (r) => 1 - 0.6 * (1 - Math.sqrt(Math.max(0, 1 - r * r)));
  /* 높이 h(km) → 온도 T(K): 0 km 5800 K → 500 km 4400 K(온도 최저층) → 2000 km 2×10⁴ K → 2100 km 10⁶ K(천이층) → 코로나 */
  function Tof(h) {
    h = clamp(h, 0, 10000);
    if (h <= 500) return 5800 + (4400 - 5800) * (h / 500);
    if (h <= 2000) return 4400 * Math.pow(20000 / 4400, (h - 500) / 1500);
    if (h <= 2100) return 20000 * Math.pow(1e6 / 20000, (h - 2000) / 100);
    return 1e6 * (1 + 0.5 * (h - 2100) / 7900);
  }
  const H_EDGE = [0, 500, 2000, 2100, 10000];                      // 층 경계
  const LAYER = [
    { n: '광구', c: '#f59e0b', h0: 0, h1: 500, T: '5800 K → 4400 K', rho: 1e23, tr: '0 ~ 500 km', Tm: 5800 },
    { n: '채층', c: '#ef4444', h0: 500, h1: 2000, T: '4400 K → 2×10⁴ K', rho: 1e20, tr: '500 ~ 2000 km', Tm: 1e4 },
    { n: '천이층', c: '#a855f7', h0: 2000, h1: 2100, T: '2×10⁴ K → 10⁶ K', rho: null, tr: '2000 ~ 2100 km (얇아요)', Tm: 2e5 },
    { n: '코로나', c: '#e2e8f0', h0: 2100, h1: 10000, T: '10⁶ K 이상', rho: 1e15, tr: '2100 km 위로 수백만 km', Tm: 1e6 },
  ];
  const layerOf = (h) => (h < 500 ? 0 : h < 2000 ? 1 : h < 2100 ? 2 : 3);
  /* 단면 그림에서 높이 → 세로 비율(그림에서는 층 길이를 맞춰 늘려 그렸어요) */
  const BAND = [0, 0.16, 0.42, 0.56, 1];
  function bandFrac(h) {
    for (let i = 0; i < 4; i++) if (h <= H_EDGE[i + 1] || i === 3) { const f = clamp((h - H_EDGE[i]) / (H_EDGE[i + 1] - H_EDGE[i]), 0, 1); return BAND[i] + f * (BAND[i + 1] - BAND[i]); }
    return 1;
  }
  const sup2 = (e) => '10' + sup(e);
  const TK = (T_) => (T_ >= 1e5 ? sci(T_, T_ >= 1e6 ? 1 : 0) : f0(Math.round(T_ / 10) * 10)) + ' K';
  /* 6개 파장 (+ 합성용 21.1) */
  const WL = [
    { k: 0, nm: '450 nm', name: '가시광선', short: '가시광', layer: '광구', T: 6000, Ttxt: '약 6000 K', feat: '쌀알 무늬 · 흑점', col: [255, 214, 140], tr: 0.9, bin: 0 },
    { k: 1, nm: '656.3 nm', name: 'Hα (수소선)', short: 'Hα', layer: '채층', T: 1e4, Ttxt: '약 10⁴ K', feat: '홍염 · 암선', col: [255, 84, 52], tr: 0.9, bin: 1 },
    { k: 2, nm: '30.4 nm', name: '극자외선 (He II)', short: '30.4 nm', layer: '채층 상부 · 천이층', T: 5e4, Ttxt: '약 5×10⁴ K', feat: '홍염이 가장자리 밖으로 솟아요', col: [255, 196, 60], tr: 0, bin: 2 },
    { k: 3, nm: '17.1 nm', name: '극자외선 (Fe IX)', short: '17.1 nm', layer: '코로나 아래층', T: 6e5, Ttxt: '약 6×10⁵ K', feat: '코로나 루프', col: [255, 212, 96], tr: 0, bin: 3 },
    { k: 4, nm: '19.3 nm', name: '극자외선 (Fe XII)', short: '19.3 nm', layer: '코로나', T: 1.2e6, Ttxt: '약 1.2×10⁶ K', feat: '코로나 홀은 어두워요', col: [120, 224, 156], tr: 0, bin: 4 },
    { k: 5, nm: '9.4 nm', name: '극자외선 (Fe XVIII)', short: '9.4 nm', layer: '활동 영역 · 플레어', T: 6e6, Ttxt: '약 6×10⁶ K 이상', feat: '가장 뜨거운 플라스마', col: [78, 214, 236], tr: 0, bin: 5 },
  ];
  const WL211 = { nm: '21.1 nm', name: '극자외선 (Fe XIV)', short: '21.1 nm', T: 2e6, Ttxt: '약 2×10⁶ K', tr: 0 };
  const WLC = [WL211, WL[4], WL[3]];                              // 합성용 세 장 (뜨거움 → 차가움)
  /* 지구 대기 투과율 */
  const transOf = (nm) => { if (nm < 300) return 0; if (nm < 350) return 0.6 * smooth((nm - 300) / 50); if (nm < 400) return 0.6 + 0.3 * smooth((nm - 350) / 50); return nm <= 700 ? 0.9 : 0.9 - 0.15 * smooth((nm - 700) / 300); };
  /* 활동 영역, 코로나 홀 (원반 좌표: 가로 u, 세로 v, 태양 반지름 = 1) */
  const AR = [{ x: -0.5, y: 0.25, s: 1.0 }, { x: 0.4, y: -0.28, s: 0.8 }, { x: 0.62, y: 0.4, s: 0.55 }];
  const CH = [{ x: -0.22, y: -0.5, rx: 0.22, ry: 0.27 }, { x: 0.05, y: 0.9, rx: 0.5, ry: 0.2 }];
  const FIL = [[-0.12, 0.42], [-0.02, 0.4], [0.08, 0.44], [0.18, 0.39], [0.3, 0.41], [0.38, 0.36]];
  const inCH = (u, v) => CH.some((c) => ((u - c.x) / c.rx) ** 2 + ((v - c.y) / c.ry) ** 2 <= 1);
  const gau = (u, v, cx, cy, s) => Math.exp(-((u - cx) ** 2 + (v - cy) ** 2) / (2 * s * s));
  function hash2(i, j, s) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, s) { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = hash2(i, j, s), b = hash2(i + 1, j, s), c = hash2(i, j + 1, s), d = hash2(i + 1, j + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  const fbm = (x, y, s) => 0.55 * vnoise(x, y, s) + 0.3 * vnoise(2 * x, 2 * y, s + 1) + 0.15 * vnoise(4 * x, 4 * y, s + 2);
  const distSeg = (u, v, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = clamp(((u - a[0]) * dx + (v - a[1]) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(u - (a[0] + t * dx), v - (a[1] + t * dy)); };
  const filD = (u, v) => { let m = 9; for (let i = 0; i < FIL.length - 1; i++) m = Math.min(m, distSeg(u, v, FIL[i], FIL[i + 1])); return m; };
  /* 파장별 밝기 지도 (0~1): k = 0 가시광, 1 Hα, 2 30.4, 3 17.1, 4 19.3, 5 9.4, 6 21.1 */
  const NPX = 260, PXR = 86;                                     // 지도 해상도, 태양 반지름의 픽셀 수
  function intensity(k, u, v) {
    const r = Math.hypot(u, v), th = Math.atan2(v, u), net = fbm(u * 9 + 3, v * 9 + 7, 11 + k);
    const chd = CH.reduce((m, c) => Math.max(m, 1 / (1 + Math.exp((((u - c.x) / c.rx) ** 2 + ((v - c.y) / c.ry) ** 2 - 1) * 7))), 0);
    const polar = Math.exp(-(((th - Math.PI / 2) / 0.42) ** 2));                     // 북극 코로나 홀 (바깥쪽)
    const streamer = 0.5 * Math.exp(-(((th - 0.15) / 0.2) ** 2)) + 0.5 * Math.exp(-(((th - Math.PI - 0.1) / 0.22) ** 2));
    const ars = (w) => AR.reduce((a, q) => a + q.s * gau(u, v, q.x, q.y, w), 0);
    const mu = r < 1 ? Math.sqrt(1 - r * r) : 0;
    const fil = Math.exp(-((filD(u, v) / 0.022) ** 2));
    if (k === 0) {                                                // 가시광선: 광구
      if (r > 1) return 0;
      let I = limb(r) * (0.9 + 0.12 * net);
      [[-0.53, 0.26, 0.05], [-0.45, 0.22, 0.03], [0.42, -0.3, 0.045]].forEach((s) => { const d = Math.hypot(u - s[0], v - s[1]); I *= 1 - 0.8 * Math.exp(-((d / s[2]) ** 2)) - 0.35 * Math.exp(-((d / (s[2] * 2.2)) ** 2)); });
      return clamp(I, 0, 1);
    }
    if (k === 1) {                                                // Hα: 채층
      if (r <= 1) { let I = 0.34 + 0.3 * net + 0.5 * ars(0.1) + 0.18 * (1 - mu) - 0.5 * fil; if (Math.hypot(u + 0.47, v - 0.22) < 0.045) I += 0.5; return clamp(I, 0, 1); }
      const a = Math.exp(-(r - 1) / 0.012) * 0.28, pr = Math.exp(-(((th + 0.26) / 0.06) ** 2)) * Math.exp(-(r - 1) / 0.07) * (r < 1.2 ? 1 : 0);
      return clamp(a + 0.95 * pr, 0, 1);
    }
    if (k === 2) {                                                // 30.4 nm: 채층 상부, 천이층
      if (r <= 1) return clamp(0.3 + 0.3 * net + 0.5 * ars(0.12) + 0.32 * (1 - mu) - 0.2 * fil, 0, 1);
      const a = 0.62 * Math.exp(-(r - 1) / 0.035), pr = Math.exp(-(((th + 0.26) / 0.08) ** 2)) * Math.exp(-(r - 1) / 0.1) * (r < 1.3 ? 1 : 0);
      return clamp(a + 0.9 * pr, 0, 1);
    }
    if (k === 3 || k === 4 || k === 6) {                          // 17.1 / 19.3 / 21.1 nm: 코로나
      const w = k === 3 ? 0.18 : k === 4 ? 0.12 : 0.07, q = k === 3 ? 0.3 : k === 4 ? 0.2 : 0.09, h = k === 3 ? 0.09 : k === 4 ? 0.13 : 0.17;
      const ar = (k === 3 ? 0.35 : k === 4 ? 0.55 : 1.0) * ars(w);
      if (r <= 1) {
        const loops = k === 3 ? 0.09 * Math.max(0, Math.sin(Math.atan2(v - 0.25, u + 0.5) * 9 + Math.hypot(u + 0.5, v - 0.25) * 20)) * gau(u, v, -0.5, 0.25, 0.2) : 0;
        return clamp((q * (0.7 + 0.5 * net) * (1 + 0.5 * (1 - mu)) + ar + loops) * (1 - 0.92 * chd), 0, 1);
      }
      const base = (k === 3 ? 0.5 : k === 4 ? 0.34 : 0.14) * Math.exp(-(r - 1) / h) * (1 + 0.9 * streamer) * (1 - 0.88 * polar);
      return clamp(base + 0.6 * ar * Math.exp(-(r - 1) / 0.1), 0, 1);
    }
    // 9.4 nm: 활동 영역·플레어 (가장 뜨거운 플라스마)
    const fl = Math.hypot(u + 0.47, v - 0.22) < 1 ? gau(u, v, -0.47, 0.22, 0.03) : 0;
    if (r <= 1) return clamp((0.035 * (0.6 + net) + 0.62 * ars(0.06) + 0.55 * fl) * (1 - 0.9 * chd), 0, 1);
    return clamp(0.07 * Math.exp(-(r - 1) / 0.07) * (1 + 0.8 * streamer) * (1 - 0.9 * polar) + 0.3 * ars(0.06) * Math.exp(-(r - 1) / 0.06), 0, 1);
  }
  /* 지도 → 캔버스: 회색 값 배열과 색 입힌 영상 (처음 필요할 때 계산하고, 그 전에도 조금씩 미리 계산해 둬요) */
  const GRAY = [], IMG = [];
  function getImg(k) {
    if (IMG[k]) return IMG[k];
    const g = new Float32Array(NPX * NPX);
    for (let y = 0; y < NPX; y++) for (let x = 0; x < NPX; x++) g[y * NPX + x] = intensity(k, (x - NPX / 2 + 0.5) / PXR, -(y - NPX / 2 + 0.5) / PXR);
    GRAY[k] = g;
    const col = k === 6 ? [240, 110, 120] : WL[k].col;
    const c = document.createElement('canvas'); c.width = c.height = NPX; const cg = c.getContext('2d'), id = cg.createImageData(NPX, NPX);
    for (let i = 0; i < NPX * NPX; i++) { const v = Math.pow(g[i], 0.62); id.data[i * 4] = Math.min(255, col[0] * v * 1.15); id.data[i * 4 + 1] = Math.min(255, col[1] * v * 1.15); id.data[i * 4 + 2] = Math.min(255, col[2] * v * 1.15); id.data[i * 4 + 3] = 255; }
    cg.putImageData(id, 0, 0); IMG[k] = c; return c;
  }
  (function warm(k) { if (k > 6) return; setTimeout(() => { getImg(k); warm(k + 1); }, 350); })(0);
  /* 합성: assign[i] = 0:빨강 1:초록 2:파랑 (i = 21.1, 19.3, 17.1) */
  const COMP = document.createElement('canvas'); COMP.width = COMP.height = NPX;
  function composite(assign) {
    getImg(6); getImg(4); getImg(3);
    const g = COMP.getContext('2d'), id = g.createImageData(NPX, NPX), srcs = [GRAY[6], GRAY[4], GRAY[3]];
    for (let i = 0; i < NPX * NPX; i++) {
      const ch = [0, 0, 0]; for (let s = 0; s < 3; s++) ch[assign[s]] += Math.pow(srcs[s][i], 0.62);
      id.data[i * 4] = Math.min(255, ch[0] * 255); id.data[i * 4 + 1] = Math.min(255, ch[1] * 255); id.data[i * 4 + 2] = Math.min(255, ch[2] * 255); id.data[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0);
  }
  /* 영상 칸: (u, v) → 화면 좌표 */
  function imgRect(cx, cy, R) { const s = R / PXR; return { x: cx - NPX / 2 * s, y: cy - NPX / 2 * s, w: NPX * s, h: NPX * s }; }
  function drawImg(c, cx, cy, R, a, round) {
    const q = imgRect(cx, cy, R);
    ctx.save(); ctx.globalAlpha = a; if (round) { ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, TAU); ctx.clip(); }
    ctx.imageSmoothingEnabled = true; ctx.drawImage(c, q.x, q.y, q.w, q.h); ctx.restore();
  }

  /* ================= 상태 ================= */
  const S = {
    view: 'graph', clock: 0, fade: 0,
    flags: { calcE: false, findCh: false, assignDone: false },
    ly: { h: 100, zoom: false, hs: 100 },
    ph: { rot: 0, play: false, flare: -1, cme: -1, xr: [], sel: -1, eOk: false, flareN: 0 },
    wv: { sel: 1, prev: 1, fade: 1, hole: false, bad: 0, hov: null },
    rg: { as: [2, 1, 0], tgt: 0, hotOk: false, holeOk: false, ringT: 0, hotPt: null, holePt: null, fade: 0, prevAs: null },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { graph: '🌡 높이에 따른 온도', cards: '🗂 층 이름 붙이기', phen: '🔥 태양 대기에서 일어나는 현상', pair: '🧩 현상과 설명 짝짓기', wave: '🛰 파장별 태양 영상', match: '🧩 파장과 온도 짝짓기', rgb: '🎨 세 영상 합성하기' };
  const VIEW_BTN = { graph: '🌡 온도 그래프', cards: '🗂 층 이름', phen: '🔥 현상', pair: '🧩 짝짓기', wave: '🛰 파장별 영상', match: '🧩 파장 짝짓기', rgb: '🎨 영상 합성' };
  let viewList = ['graph'];
  const modeSeg = $('#modeSeg');
  function buildSeg() {
    modeSeg.innerHTML = '';
    viewList.forEach((v) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.view = v; b.textContent = VIEW_BTN[v]; clickable(b, () => setView(v)); modeSeg.appendChild(b); });
  }
  const modeBtns = () => $$('#modeSeg button');
  const hNow = () => S.ly.h;

  /* ================= ① 높이–온도 그래프, 층 단면 ================= */
  function LGr() {
    return PHONE
      ? { Sec: { x: 8, y: 8, w: 170, h: 600 }, Gr: { x: 186, y: 8, w: 286, h: 320 }, Bars: { x: 186, y: 336, w: 286, h: 272 }, No: { x: 8, y: 616, w: 464, h: 236 } }
      : { Sec: { x: 10, y: 8, w: 250, h: 604 }, Gr: { x: 268, y: 8, w: 522, h: 316 }, Bars: { x: 268, y: 332, w: 522, h: 170 }, No: { x: 268, y: 510, w: 522, h: 102 } };
  }
  function secBox(P) { return { x: P.x + 12, y: P.y + 36 * FS, w: P.w - 24, h: P.h - 36 * FS - 14 }; }
  function drawSection(P, t, o) {
    o = o || {};
    panel(P.x, P.y, P.w, P.h, { r: 14, title: o.title || '태양 가장자리 단면', tsize: PHONE ? 12.5 : 14 });
    const B = secBox(P), yy = (f) => B.y + B.h - f * B.h;
    ctx.save(); rr(B.x, B.y, B.w, B.h, 10); ctx.clip();
    // 코로나 (맨 위)
    const sp = ctx.createLinearGradient(0, yy(1), 0, yy(BAND[3])); sp.addColorStop(0, '#05081a'); sp.addColorStop(1, '#2a3560'); ctx.fillStyle = sp; ctx.fillRect(B.x, yy(1), B.w, yy(BAND[3]) - yy(1));
    for (let i = 0; i < 6; i++) { const x = B.x + B.w * (0.12 + i * 0.16), w = 12 + (i % 3) * 8; const g = ctx.createLinearGradient(0, yy(BAND[3]), 0, yy(0.78)); g.addColorStop(0, 'rgba(226,232,240,.5)'); g.addColorStop(1, 'rgba(226,232,240,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w, yy(BAND[3])); ctx.lineTo(x - 2, yy(0.78 + (i % 2) * 0.06)); ctx.lineTo(x + 2, yy(0.78 + (i % 2) * 0.06)); ctx.lineTo(x + w, yy(BAND[3])); ctx.closePath(); ctx.fill(); }
    // 천이층
    ctx.fillStyle = '#a855f7'; ctx.fillRect(B.x, yy(BAND[3]), B.w, yy(BAND[2]) - yy(BAND[3]));
    // 채층
    const cg = ctx.createLinearGradient(0, yy(BAND[2]), 0, yy(BAND[1])); cg.addColorStop(0, '#f87171'); cg.addColorStop(1, '#b91c1c'); ctx.fillStyle = cg; ctx.fillRect(B.x, yy(BAND[2]), B.w, yy(BAND[1]) - yy(BAND[2]));
    ctx.strokeStyle = 'rgba(254,202,202,.65)'; ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) { const x = B.x + 8 + i * (B.w - 16) / 15, ph = (RM ? 0 : t * 1.6) + i * 1.7, hh = (0.35 + 0.65 * Math.abs(Math.sin(ph))) * (yy(BAND[1]) - yy(BAND[2])) * 0.9; ctx.beginPath(); ctx.moveTo(x, yy(BAND[1])); ctx.lineTo(x + Math.sin(ph * 0.7) * 3, yy(BAND[1]) - hh); ctx.stroke(); }
    // 광구
    const pg = ctx.createLinearGradient(0, yy(BAND[1]), 0, yy(0)); pg.addColorStop(0, '#fde68a'); pg.addColorStop(1, '#f59e0b'); ctx.fillStyle = pg; ctx.fillRect(B.x, yy(BAND[1]), B.w, yy(0) - yy(BAND[1]));
    ctx.fillStyle = 'rgba(180,83,9,.25)'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(B.x + 18 + i * (B.w - 36) / 8, yy(0.07 + (i % 2) * 0.05), 16, 7, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    // 층 이름·경계
    const names = o.letters ? ['A', 'B', 'C', 'D'] : LAYER.map((l) => l.n);
    for (let i = 0; i < 4; i++) {
      const ym = (yy(BAND[i]) + yy(BAND[i + 1])) / 2;
      const cap = o.letters ? names[i] : names[i];
      const sz = i === 2 ? 12 : 14;
      T(B.x + B.w / 2, ym + 5, cap, sz, i === 3 ? '#f1f5f9' : '#fff', 'center', 800, { stroke: 'rgba(15,23,42,.65)', strokeWidth: 3.5 });
      if (i < 3) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(B.x, yy(BAND[i + 1])); ctx.lineTo(B.x + B.w, yy(BAND[i + 1])); ctx.stroke(); ctx.setLineDash([]); }
    }
    T(B.x + B.w / 2, B.y + B.h - 6, '▲ 위로 올라갈수록 태양에서 멀어져요', PHONE ? 10.5 : 11.5, 'rgba(255,255,255,.9)', 'center', 800, { stroke: 'rgba(15,23,42,.6)', strokeWidth: 3 });
    return { B, yy };
  }
  function drawGraphView(dt, t) {
    const L = LGr(), P = S.ly;
    P.hs = approach(P.hs, P.h, dt, 12);
    const { B, yy } = drawSection(L.Sec, t, {});
    // 단면 위의 높이 표시
    const my = yy(bandFrac(P.hs));
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(B.x, my); ctx.lineTo(B.x + B.w, my); ctx.stroke();
    D.label(B.x + B.w / 2, clamp(my + (my < B.y + 40 ? 20 : -16), B.y + 14, B.y + B.h - 24), f0(P.h) + ' km · ' + TK(Tof(P.hs)), { bg: '#0f172a', size: PHONE ? 11.5 : 12.5 });
    // 그래프
    const G = L.Gr;
    panel(G.x, G.y, G.w, G.h, { r: 14, title: '높이에 따른 온도 (세로 눈금은 로그)', tsize: PHONE ? 12 : 14 });
    const gx0 = G.x + (PHONE ? 50 : 62), gx1 = G.x + G.w - 14, gy0 = G.y + 50 * Math.min(FS, 1.2), gy1 = G.y + G.h - 46;
    const h0 = P.zoom ? 1900 : 0, h1 = P.zoom ? 2300 : 10000;
    const X = (h) => gx0 + (h - h0) / (h1 - h0) * (gx1 - gx0), Y = (T_) => gy1 - (lg(T_) - 3.4) / 3.1 * (gy1 - gy0);
    [1e4, 1e5, 1e6].forEach((v) => { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, Y(v)); ctx.lineTo(gx1, Y(v)); ctx.stroke(); T(gx0 - 6, Y(v) + 4, sup2(lg(v)) + ' K', 12, '#64748b', 'right', 700); });
    ctx.setLineDash([5, 5]); line([[gx0, Y(5800)], [gx1, Y(5800)]], '#f59e0b', 1.8); ctx.setLineDash([]);
    T(gx1 - 2, Y(5800) + 15, '광구 표면 5800 K', 12, '#b45309', 'right', 800);
    const ticks = P.zoom ? [1900, 2000, 2100, 2200, 2300] : [0, 2000, 4000, 6000, 8000, 10000];
    ticks.forEach((h) => { ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(X(h), gy0); ctx.lineTo(X(h), gy1); ctx.stroke(); T(X(h), gy1 + 17, comma(h), 11.5, '#64748b', 'center', 700); });
    T((gx0 + gx1) / 2, gy1 + 36, '광구 표면에서의 높이 h (km)' + (P.zoom ? ' — 천이층 확대' : ''), 12.5, '#475569', 'center', 800);
    // 층 경계 + 이름
    [500, 2000, 2100].forEach((h) => { if (h < h0 || h > h1) return; ctx.setLineDash([4, 4]); line([[X(h), gy0], [X(h), gy1]], 'rgba(100,116,139,.6)', 1.4); ctx.setLineDash([]); });
    LAYER.forEach((l, i) => { const a = Math.max(l.h0, h0), b = Math.min(l.h1, h1); if (b <= a) return; const xc = (X(a) + X(b)) / 2; if (X(b) - X(a) > 34 || i === 2) T(clamp(xc, gx0 + 26, gx1 - 26), gy0 - 6, l.n, PHONE ? 11.5 : 12.5, shade(l.c === '#e2e8f0' ? '#64748b' : l.c, -0.1), 'center', 800); });
    // 곡선
    LAYER.forEach((l) => {
      const pts = []; const a = Math.max(l.h0, h0), b = Math.min(l.h1, h1); if (b <= a) return;
      for (let k = 0; k <= 80; k++) { const h = a + (b - a) * k / 80; pts.push([X(h), Y(Tof(h))]); }
      line(pts, l.c === '#e2e8f0' ? '#64748b' : l.c, 4.5);
    });
    const mx = X(clamp(P.hs, h0, h1)), my2 = Y(Tof(P.hs));
    ctx.setLineDash([4, 4]); line([[mx, gy1], [mx, my2]], 'rgba(15,23,42,.45)', 1.6); line([[gx0, my2], [mx, my2]], 'rgba(15,23,42,.45)', 1.6); ctx.setLineDash([]);
    D.shadow(() => D.sphere(mx, my2, 9, '#0f172a', { gloss: true }), { blur: 5, y: 2 });
    D.label(clamp(mx, gx0 + 56, gx1 - 56), clamp(my2 - 22, gy0 + 6, gy1 - 8), f0(P.hs) + ' km: ' + TK(Tof(P.hs)), { bg: '#0f172a', size: PHONE ? 11.5 : 12.5 });
    // 막대: 온도와 밀도
    const Bb = L.Bars;
    panel(Bb.x, Bb.y, Bb.w, Bb.h, { r: 14, title: '층별 온도와 입자 수 (로그 눈금)', tsize: PHONE ? 12 : 14 });
    const lw = 44, sel = layerOf(P.h), rows = [[0, '#f59e0b'], [1, '#ef4444'], [3, '#64748b']], rowH = PHONE ? 30 : 28;
    const col2 = !PHONE, cw = col2 ? (Bb.w - 20) / 2 : Bb.w - 20;
    const bars = (x0, y0, ttl, key, lo, span, color, fmtv) => {
      T(x0 + lw, y0, ttl, 12, '#475569', 'left', 800);
      rows.forEach((rw, i) => {
        const y = y0 + 8 + i * rowH, l = LAYER[rw[0]], bx = x0 + lw, bwid = cw - lw - 6, f = (lg(l[key]) - lo) / span;
        T(x0, y + 12, l.n, 12.5, sel === rw[0] ? '#0f172a' : '#64748b', 'left', 800);
        hbar(bx, y, bwid, 15, f, 1, color === 0 ? rw[1] : color);
        T(bx + 6, y + 12, fmtv(l), 11.5, '#0f172a', 'left', 800, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 });
        if (sel === rw[0]) { ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; rr(bx - 2, y - 2, bwid + 4, 19, 8).stroke(); }
      });
    };
    const yb = Bb.y + 46 * Math.min(FS, 1.15);
    bars(Bb.x + 10, yb, '온도 (10³ K → 10⁷ K)', 'Tm', 3, 4, 0, (l) => TK(l.Tm));
    if (col2) bars(Bb.x + 10 + cw + 0, yb, '입자 수 (개/m³, 10¹⁴ → 10²⁴)', 'rho', 14, 10, '#0ea5e9', (l) => sup2(lg(l.rho)));
    else bars(Bb.x + 10, yb + 8 + 3 * rowH + 30, '입자 수 (개/m³, 10¹⁴ → 10²⁴)', 'rho', 14, 10, '#0ea5e9', (l) => sup2(lg(l.rho)));
    // 설명
    const N = L.No;
    panel(N.x, N.y, N.w, N.h, { r: 14 });
    let ly = N.y + 26 * FS; const nw = N.w - 28;
    const li = layerOf(P.h), l = LAYER[li];
    ly = drawWrap(N.x + 14, ly, '지금 위치: ' + l.n + ' (' + l.tr + '), 온도 ' + l.T + '.', nw, 13.5, { color: '#0f172a', weight: 800 }) + 21 * FS;
    drawWrap(N.x + 14, ly, li === 2 ? '천이층은 아주 얇은 층이에요. 온도가 약 2×10⁴ K에서 10⁶ K까지 수십 배 솟아요.' : li === 3 ? '코로나는 100만 K이 넘지만 입자가 아주 적어(약 10¹⁵ 개/m³) 밝기는 광구의 약 100만 분의 1이에요.' : li === 0 ? '광구: 표면에서 위로 갈수록 온도가 내려가 약 500 km에서 4400 K(온도 최저층)가 돼요.' : '채층: 온도 최저층 위에서 온도가 서서히 올라 2000 km 부근에서 약 2×10⁴ K예요.', nw, 13.5, { color: '#475569' });
  }
  /* ================= ① 층 이름 카드 분류 ================= */
  const BIN_COL = ['#d97706', '#dc2626', '#9333ea', '#475569'];
  const cLy = makeClassifier({
    items: LAYER.map((l, i) => ({ id: i, label: l.n, bin: i, open: true })),
    bins: [
      { label: 'A · 0 ~ 500 km', sub: '5800 K → 4400 K · 입자 수 10²³ 개/m³', color: BIN_COL[0] },
      { label: 'B · 500 ~ 2000 km', sub: '4400 K → 2×10⁴ K · 입자 수 10²⁰ 개/m³', color: BIN_COL[1] },
      { label: 'C · 2000 ~ 2100 km', sub: '2×10⁴ K → 10⁶ K (온도가 급상승)', color: BIN_COL[2] },
      { label: 'D · 2100 km 위', sub: '10⁶ K 이상 · 입자 수 10¹⁵ 개/m³', color: BIN_COL[3] },
    ],
    chipCols: 1, minRows: 1,
    layout() {
      if (PHONE) return { grid: { x: 8, y: 10, w: 464, h: 120, cols: 2, cardH: 50, gap: 8 }, bins: [0, 1, 2, 3].map((i) => ({ x: 74, y: 150 + (3 - i) * 176, w: 398, h: 166 })), detail: null };
      return { grid: { x: 228, y: 12, w: 556, h: 60, cols: 4, cardH: 52, gap: 8 }, bins: [0, 1, 2, 3].map((i) => ({ x: 228, y: 90 + (3 - i) * 130, w: 556, h: 122 })), detail: null };
    },
  });
  function drawCards(dt, t) {
    const L = cLy.cfg.layout();
    const Sx = PHONE ? { x: 8, y: 150, w: 58, h: 698 } : { x: 10, y: 8, w: 210, h: 604 };
    if (PHONE) {
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(Sx.x, Sx.y, Sx.w, 674, 12).fill(); }, { blur: 5, y: 2 });
      const bands = [[3, 150, 166], [2, 326, 166], [1, 502, 166], [0, 678, 166]];
      [3, 2, 1, 0].forEach((i, k) => { const y = 150 + k * 176; ctx.fillStyle = [BIN_COL[0], BIN_COL[1], BIN_COL[2], '#1e293b'][i]; ctx.globalAlpha = 0.9; rr(Sx.x + 6, y, 46, 166, 8).fill(); ctx.globalAlpha = 1; T(Sx.x + 29, y + 88, 'ABCD'[i], 16, '#fff', 'center', 800); });
    } else {
      drawSection(Sx, t, { letters: true, title: '단면 (A~D)' });
    }
    cLy.draw(dt, {});
  }

  /* ================= ② 대기 현상: 홍염 · 암선 · 플레어 · CME · 코로나 홀 ================= */
  const WROT = 13.4;                                               // 도/일 (흑점이 도는 빠르기와 비슷하게)
  const PF = { fil: { lat: 28, lon0: -85 }, ar1: { lat: -18, lon0: -10 }, ar2: { lat: 14, lon0: -170 } };
  const pfLon = (f, day) => ((((f.lon0 + WROT * day + 180) % 360) + 360) % 360) - 180;
  const PHEN = [
    { n: '홍염 · 암선', c: '#f97316', t: '채층의 차가운 가스가 자기장 고리를 따라 코로나로 솟은 것이에요. 가장자리에서는 밝은 불꽃(홍염), 원반 위에서는 어두운 실 모양(암선)으로 보여요.' },
    { n: '플레어', c: '#facc15', t: '자기장 에너지가 짧은 시간(수분~수 시간)에 방출돼요. X선·자외선이 갑자기 늘어요. 큰 플레어의 에너지는 약 10²⁵ J이에요.' },
    { n: 'CME', c: '#38bdf8', t: '코로나 질량 방출: 질량 10¹²~10¹³ kg의 코로나 물질이 400~3000 km/s로 행성 사이 공간으로 날아가요.' },
    { n: '코로나 홀', c: '#a78bfa', t: '자기장이 열려 있어서 X선·극자외선 영상에서 어둡게 보여요. 빠른 태양풍이 나오는 곳이에요.' },
  ];
  function LPh() {
    return PHONE
      ? { Sc: { x: 8, y: 8, w: 464, h: 452, cx: 240, cy: 236, R: 92 }, XR: { x: 8, y: 468, w: 232, h: 190 }, EN: { x: 248, y: 468, w: 224, h: 190 }, LG: { x: 8, y: 666, w: 464, h: 186 } }
      : { Sc: { x: 10, y: 8, w: 520, h: 604, cx: 270, cy: 306, R: 122 }, XR: { x: 538, y: 8, w: 252, h: 206 }, EN: { x: 538, y: 222, w: 252, h: 198 }, LG: { x: 538, y: 428, w: 252, h: 184 } };
  }
  const SPACE_STARS = (() => { const r = rng(5), a = []; for (let i = 0; i < 70; i++) a.push([r(), r(), 0.5 + r() * 1.1, r() * 6]); return a; })();
  function drawPhen(dt, t) {
    const L = LPh(), Sc = L.Sc, P = S.ph, R = Sc.R, cx = Sc.cx, cy = Sc.cy;
    if (P.play) { P.rot = Math.min(13, P.rot + dt * 1.6); setRot(P.rot, true); if (P.rot >= 13) { P.play = false; updateCtl(); } }
    if (P.flare >= 0) { P.flare += dt; if (P.flare >= 1.2 && !P.cmeDone) { P.cmeDone = true; P.cme = 0; } if (P.flare > 14) P.flare = -1; }
    if (P.cme >= 0) { P.cme += dt; if (P.cme > 9) P.cme = -1; }
    // 배경
    D.shadow(() => { ctx.fillStyle = '#060a1c'; rr(Sc.x, Sc.y, Sc.w, Sc.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(Sc.x, Sc.y, Sc.w, Sc.h, 14); ctx.clip();
    SPACE_STARS.forEach((s) => { ctx.globalAlpha = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.3 + s[3])); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(Sc.x + s[0] * Sc.w, Sc.y + s[1] * Sc.h, s[2], 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
    // 코로나: 진주빛 후광, 적도 쪽 스트리머, 북극 코로나 홀
    const g = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 2.05); g.addColorStop(0, 'rgba(226,232,240,.55)'); g.addColorStop(0.35, 'rgba(203,213,225,.22)'); g.addColorStop(1, 'rgba(203,213,225,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 2.05, 0, TAU); ctx.fill();
    [[0, 1], [Math.PI, 1], [0.35, 0.7], [Math.PI - 0.3, 0.7]].forEach((s, i) => { const a = s[0], len = R * (1.75 + 0.25 * s[1]); ctx.save(); ctx.translate(cx, cy); ctx.rotate(-a); const sg = ctx.createLinearGradient(R * 0.9, 0, len, 0); sg.addColorStop(0, 'rgba(226,232,240,.5)'); sg.addColorStop(1, 'rgba(226,232,240,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(R * 0.9, -R * 0.22); ctx.lineTo(len, -R * 0.03); ctx.lineTo(len, R * 0.03); ctx.lineTo(R * 0.9, R * 0.22); ctx.closePath(); ctx.fill(); ctx.restore(); });
    // 북극 코로나 홀: 어두운 부채꼴 + 열린 자기장(직선)과 태양풍 알갱이
    const hs = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 2.05); hs.addColorStop(0, 'rgba(6,10,28,.88)'); hs.addColorStop(1, 'rgba(6,10,28,.2)');
    ctx.fillStyle = hs; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 2.05, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(167,139,250,.75)'; ctx.lineWidth = 1.6; for (let i = -3; i <= 3; i++) { const a = -Math.PI / 2 + i * 0.1; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 1.0, cy + Math.sin(a) * R * 1.0); ctx.lineTo(cx + Math.cos(a) * R * 2.0, cy + Math.sin(a) * R * 2.0); ctx.stroke(); }
    if (!RM) for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (i % 7 - 3) * 0.1, f = ((t * 0.35 + i * 0.17) % 1), rad = R * (1.02 + f * 1.0); ctx.fillStyle = 'rgba(221,214,254,' + (0.9 * (1 - f)) + ')'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 2.2, 0, TAU); ctx.fill(); }
    ctx.restore();
    // 태양 원반 (Hα 느낌: 채층)
    D.glow(cx, cy, R * 1.25, '#ff6a3d', 0.45);
    const dg = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.25, R * 0.1, cx, cy, R); dg.addColorStop(0, '#ff8a4c'); dg.addColorStop(0.7, '#e2552b'); dg.addColorStop(1, '#9a2a12');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    // 활동 영역 (플라지)
    ['ar1', 'ar2'].forEach((k) => { const f = PF[k], q = sph(f.lat, pfLon(f, P.rot)); if (q.z > 0.02) D.glow(cx + q.x * R, cy - q.y * R, R * 0.3 * (0.4 + 0.6 * q.z), '#ffd89a', 0.7 * q.z); });
    // 암선 (원반 위의 홍염)
    const fl = pfLon(PF.fil, P.rot), da = clamp((80 - Math.abs(fl)) / 12, 0, 1);
    if (da > 0.02) {
      const pts = []; for (let i = 0; i <= 8; i++) { const lo = fl - 15 + i * 3.75, la = PF.fil.lat + Math.sin(i * 0.9 + 0.5) * 3.5; if (Math.abs(lo) < 88) { const q = sph(la, lo); pts.push([cx + q.x * R, cy - q.y * R]); } }
      if (pts.length > 1) line(pts, 'rgba(60,8,2,' + (0.85 * da) + ')', Math.max(2.5, R * 0.045));
    }
    ctx.restore();
    // 플레어 섬광
    const a1 = PF.ar1, q1 = sph(a1.lat, pfLon(a1, P.rot)), fx = cx + q1.x * R, fy = cy - q1.y * R;
    if (P.flare >= 0 && q1.z > 0.02) {
      const tf = P.flare, amp = tf < 0.4 ? tf / 0.4 : Math.max(0, 1 - (tf - 0.4) / 5);
      if (amp > 0.01) { D.glow(fx, fy, R * 0.55 * (0.5 + amp), '#ffffff', 0.9 * amp); D.glow(fx, fy, R * 0.25 + 10 * amp, '#fff7c2', 1); if (amp > 0.5 && !RM) { ctx.strokeStyle = 'rgba(255,255,255,' + amp + ')'; ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + t; ctx.beginPath(); ctx.moveTo(fx + Math.cos(a) * 8, fy + Math.sin(a) * 8); ctx.lineTo(fx + Math.cos(a) * (20 + 24 * amp), fy + Math.sin(a) * (20 + 24 * amp)); ctx.stroke(); } } }
    }
    // 홍염 (가장자리의 밝은 아치)
    const pl = pfLon(PF.fil, P.rot), pa = clamp((26 - Math.abs(Math.abs(pl) - 90)) / 10, 0, 1);
    if (pa > 0.02) {
      const sgn = pl >= 0 ? 1 : -1, q = sph(PF.fil.lat, 90 * sgn), th = Math.atan2(q.y, q.x), fl_ = 1 + 0.08 * Math.sin(t * 1.7);
      ctx.save(); ctx.globalAlpha = pa; ctx.lineCap = 'round';
      [[0.36, 0.2, 1], [0.27, 0.14, 0.85], [0.18, 0.09, 0.7]].forEach((a3) => {
        const hgt = R * a3[0] * fl_ * (0.6 + 0.4 * pa), sp = a3[1];
        const bx0 = cx + Math.cos(th - sp) * R * 0.99, by0 = cy - Math.sin(th - sp) * R * 0.99, bx1 = cx + Math.cos(th + sp) * R * 0.99, by1 = cy - Math.sin(th + sp) * R * 0.99;
        const tx = cx + Math.cos(th) * (R + hgt * 1.9), ty = cy - Math.sin(th) * (R + hgt * 1.9);
        [[10, 'rgba(255,110,60,' + 0.25 * a3[2] + ')'], [5.5, 'rgba(255,150,90,' + 0.75 * a3[2] + ')'], [2.4, 'rgba(255,232,205,' + a3[2] + ')']].forEach((w) => { ctx.strokeStyle = w[1]; ctx.lineWidth = w[0]; ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.quadraticCurveTo(tx, ty, bx1, by1); ctx.stroke(); });
      });
      ctx.restore();
    }
    // CME 구름
    if (P.cme >= 0) {
      const f = P.cme / 9, rad = R * (0.25 + 2.0 * (1 - Math.pow(1 - f, 2))), ang = Math.atan2(-(fy - cy), fx - cx), a2 = 0.62 + 0.2 * f;
      ctx.save(); ctx.beginPath(); rr(Sc.x, Sc.y, Sc.w, Sc.h, 14); ctx.clip(); ctx.globalAlpha = 1 - f * 0.8;
      const ox = fx + Math.cos(ang) * R * 0.1, oy = fy - Math.sin(ang) * R * 0.1;
      const cg = ctx.createRadialGradient(ox, oy, rad * 0.4, ox, oy, rad); cg.addColorStop(0, 'rgba(125,211,252,0)'); cg.addColorStop(0.8, 'rgba(125,211,252,.28)'); cg.addColorStop(1, 'rgba(186,230,253,.75)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, rad, -ang - a2, -ang + a2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(224,242,254,.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ox, oy, rad, -ang - a2, -ang + a2); ctx.stroke();
      ctx.restore();
    }
    // 이름표
    T(Sc.x + 14, Sc.y + 24, '☀ 자전 ' + f1(P.rot) + '일', 14, '#fde68a', 'left', 800);
    D.label(cx + R * 0.0, Sc.y + 22, '코로나 홀: 북극 쪽 어두운 부채꼴', { bg: 'rgba(124,58,237,.9)', size: PHONE ? 11.5 : 12.5 });
    if (P.sel >= 0) {
      const sc = PHEN[P.sel], px = cx, ring = (x, y, r) => { ctx.strokeStyle = sc.c; ctx.lineWidth = 3.5; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; };
      if (P.sel === 0) { if (pa > 0.05) { const q = sph(PF.fil.lat, 90 * (pl >= 0 ? 1 : -1)); ring(cx + q.x * R * 1.12, cy - q.y * R * 1.12, 40); } else if (da > 0.05) { const q = sph(PF.fil.lat, pl); ring(cx + q.x * R, cy - q.y * R, 34); } }
      else if (P.sel === 1) { if (q1.z > 0.02) ring(fx, fy, 34); }
      else if (P.sel === 2) { if (P.cme >= 0) ring(cx + (fx - cx) * 2.3, cy + (fy - cy) * 2.3, 46); }
      else ring(cx, cy - R * 1.45, 50);
      drawWrap(Sc.x + 14, Sc.y + Sc.h - (PHONE ? 78 : 62), sc.n + ': ' + sc.t, Sc.w - 28, PHONE ? 12 : 12.5, { color: '#e2e8f0', weight: 700, stroke: 'rgba(6,10,28,.85)', strokeWidth: 3 });
    } else T(Sc.x + Sc.w / 2, Sc.y + Sc.h - 14, '아래 오른쪽 목록을 눌러 현상을 찾아봐요', PHONE ? 12 : 13, '#94a3b8', 'center', 800);
    // 플레어 X선 곡선
    const XR = L.XR;
    panel(XR.x, XR.y, XR.w, XR.h, { r: 14, title: '플레어의 X선 세기', tsize: PHONE ? 12 : 13.5 });
    const xx0 = XR.x + 40, xx1 = XR.x + XR.w - 12, xy0 = XR.y + 38 * FS, xy1 = XR.y + XR.h - 28, YX = (f) => xy1 - (lg(f) + 8) / 5 * (xy1 - xy0);
    [[1e-6, 'C'], [1e-5, 'M'], [1e-4, 'X']].forEach((c) => { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx0, YX(c[0])); ctx.lineTo(xx1, YX(c[0])); ctx.stroke(); T(xx0 - 6, YX(c[0]) + 4, c[1], 12, '#64748b', 'right', 800); });
    T(xx0, xy1 + 16, '0', 11.5, '#64748b', 'left', 700); T(xx1, xy1 + 16, '60분', 11.5, '#64748b', 'right', 700); T((xx0 + xx1) / 2, xy1 + 16, '시간', 11.5, '#64748b', 'center', 700);
    const flux = (m) => { const base = 2e-7; if (m < 8) return base; const a = clamp((m - 8) / 5, 0, 1); const rise = base + (1.6e-4 - base) * a * a; return m < 13 ? rise : Math.max(base, 1.6e-4 * Math.exp(-(m - 13) / 14) + base); };
    const tm = P.flare >= 0 ? clamp(P.flare / 12 * 60, 0, 60) : (P.flareN > 0 ? 60 : 0), pts = [];
    for (let m = 0; m <= tm + 1e-6; m += 1) pts.push([xx0 + m / 60 * (xx1 - xx0), YX(flux(m))]);
    if (pts.length > 1) line(pts, '#dc2626', 3); else line([[xx0, YX(2e-7)], [xx1, YX(2e-7)]], '#cbd5e1', 2);
    if (pts.length > 1 && P.flare >= 0) D.sphere(pts[pts.length - 1][0], pts[pts.length - 1][1], 5, '#dc2626', { gloss: false });
    T(xx1, xy0 + 4, '세로축: X선 세기(로그)', 11, '#94a3b8', 'right', 700);
    // 에너지 비교
    const EN = L.EN;
    panel(EN.x, EN.y, EN.w, EN.h, { r: 14, title: '큰 플레어의 에너지', tsize: PHONE ? 12 : 13.5 });
    const ex0 = EN.x + 12, ew = EN.w - 24, ey = EN.y + 46 * FS, EX = (e) => (lg(e) - 19) / 7;
    T(ex0, ey, '큰 플레어  10²⁵ J', 12.5, '#b45309', 'left', 800); hbar(ex0, ey + 6, ew, 16, EX(1e25), 1, '#f59e0b');
    T(ex0, ey + 48 * Math.min(FS, 1.1), '인류의 1년 에너지 소비  6×10²⁰ J', 12.5, '#475569', 'left', 800); hbar(ex0, ey + 54 * Math.min(FS, 1.1), ew, 16, EX(6e20), 1, '#64748b');
    T(ex0, ey + 92 * Math.min(FS, 1.1), '막대는 로그 눈금이라 길이 차보다 훨씬 커요', 11.5, '#94a3b8', 'left', 700);
    // 목록
    const LG = L.LG;
    panel(LG.x, LG.y, LG.w, LG.h, { r: 14, title: '눌러서 찾아보기', tsize: PHONE ? 12 : 13.5 });
    PHEN.forEach((p, i) => {
      const rh = PHONE ? 34 : 32, y = LG.y + 40 * Math.min(FS, 1.15) + i * (rh + 4), sel = P.sel === i;
      ctx.fillStyle = sel ? p.c : '#f1f5f9'; ctx.globalAlpha = sel ? 0.9 : 1; rr(LG.x + 10, y, LG.w - 20, rh, 10).fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = p.c; ctx.lineWidth = 2; rr(LG.x + 10, y, LG.w - 20, rh, 10).stroke();
      T(LG.x + 24, y + rh / 2 + 5, (i + 1) + '  ' + p.n, 13.5, sel ? '#0f172a' : '#334155', 'left', 800);
    });
  }
  function setRot(v, quiet) { S.ph.rot = clamp(v, 0, 13); const s = $('#sRot'); if (s) setSlider(s, $('#oRot'), Math.round(S.ph.rot * 10) / 10, (x) => f1(x) + '일'); }

  /* ----- 카드 분류: 현상 ↔ 설명 ----- */
  const cPair = makeClassifier({
    items: [{ label: '홍염', bin: 0 }, { label: '플레어', bin: 1 }, { label: 'CME (코로나 질량 방출)', bin: 2 }, { label: '코로나 홀', bin: 3 }].map((o, i) => Object.assign({ id: i, open: true }, o)),
    bins: [
      { label: '채층 가스가 코로나로 솟은 고리', sub: '자기장을 따라 올라가요', color: '#ea580c' },
      { label: '짧은 시간에 에너지가 터져 나와요', sub: 'X선·자외선이 갑자기 늘어요 (수분~수 시간)', color: '#ca8a04' },
      { label: '코로나 물질이 우주로 날아가요', sub: '질량 10¹²~10¹³ kg, 400~3000 km/s', color: '#0284c7' },
      { label: 'X선·극자외선 영상에서 어두워요', sub: '자기장이 열려 빠른 태양풍이 나와요', color: '#7c3aed' },
    ],
    chipCols: 1, minRows: 1,
    layout() {
      return PHONE
        ? { grid: { x: 8, y: 10, w: 464, h: 120, cols: 2, cardH: 50, gap: 8 }, bins: [0, 1, 2, 3].map((i) => ({ x: 8, y: 150 + i * 176, w: 464, h: 166 })), detail: null }
        : { grid: { x: 10, y: 12, w: 780, h: 60, cols: 4, cardH: 56, gap: 10 }, bins: [0, 1, 2, 3].map((i) => ({ x: 10 + (i % 2) * 395, y: 100 + Math.floor(i / 2) * 252, w: 385, h: 240 })), detail: null };
    },
  });
  function drawPair(dt) { cPair.draw(dt, {}); }

  /* ================= ③ 다파장 영상 ================= */
  function LWv() {
    return PHONE
      ? { Im: { x: 8, y: 8, w: 464, h: 424, cx: 240, cy: 224, R: 150 }, Tm: { x: 8, y: 440, w: 232, h: 238 }, Tr: { x: 248, y: 440, w: 224, h: 238 }, Tx: { x: 8, y: 686, w: 464, h: 166 } }
      : { Im: { x: 10, y: 8, w: 480, h: 604, cx: 250, cy: 312, R: 158 }, Tm: { x: 498, y: 8, w: 292, h: 290 }, Tr: { x: 498, y: 306, w: 292, h: 190 }, Tx: { x: 498, y: 504, w: 292, h: 108 } };
  }
  function drawWave(dt, t) {
    const L = LWv(), Im = L.Im, W = S.wv, w = WL[W.sel];
    W.fade = approach(W.fade, 1, dt, 6); W.bad = Math.max(0, W.bad - dt);
    D.shadow(() => { ctx.fillStyle = '#04060f'; rr(Im.x, Im.y, Im.w, Im.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(Im.x, Im.y, Im.w, Im.h, 14); ctx.clip();
    if (W.fade < 0.999 && W.prev !== W.sel) drawImg(getImg(WL[W.prev].k), Im.cx, Im.cy, Im.R, 1, false);
    drawImg(getImg(w.k), Im.cx, Im.cy, Im.R, W.prev === W.sel ? 1 : W.fade, false);
    // 태양 가장자리 가이드 (희미한 원)
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.setLineDash([3, 5]); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(Im.cx, Im.cy, Im.R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    T(Im.x + 14, Im.y + 26, w.nm + ' · ' + w.name, PHONE ? 13 : 15, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.7)', strokeWidth: 4 });
    T(Im.x + 14, Im.y + 26 + 20 * Math.min(FS, 1.2), '보이는 층: ' + w.layer + ' · ' + w.Ttxt, PHONE ? 12 : 13, '#fde68a', 'left', 800, { stroke: 'rgba(0,0,0,.7)', strokeWidth: 3.5 });
    T(Im.x + Im.w - 14, Im.y + Im.h - 12, w.feat, PHONE ? 12 : 13, '#e2e8f0', 'right', 800, { stroke: 'rgba(0,0,0,.7)', strokeWidth: 3.5 });
    if (S.flags.findCh || FREE()) T(Im.x + 14, Im.y + Im.h - 12, '어두운 코로나 홀을 눌러 보세요', PHONE ? 12 : 13, '#cbd5e1', 'left', 800, { stroke: 'rgba(0,0,0,.7)', strokeWidth: 3.5 });
    if (W.hole) CH.forEach((c) => { const x = Im.cx + c.x * Im.R, y = Im.cy - c.y * Im.R; ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, c.rx * Im.R, c.ry * Im.R, 0, 0, TAU); ctx.stroke(); });
    if (W.hole) D.label(Im.cx, Im.y + Im.h - 38, '✅ 코로나 홀: 19.3 nm 영상에서 어두워요', { bg: '#15803d', size: PHONE ? 12 : 13 });
    if (W.bad > 0) D.label(Im.cx, Im.cy, '그곳은 코로나 홀이 아니에요', { bg: '#dc2626', size: 13 });
    // 온도 막대 (로그)
    const Tm = L.Tm;
    panel(Tm.x, Tm.y, Tm.w, Tm.h, { r: 14, title: '이 영상의 온도', tsize: PHONE ? 12 : 13.5 });
    const ty0 = Tm.y + 44 * Math.min(FS, 1.2), ty1 = Tm.y + Tm.h - 16, YT = (T_) => ty1 - (lg(T_) - 3.5) / 3.5 * (ty1 - ty0), bx = Tm.x + 58;
    const gg = ctx.createLinearGradient(0, ty1, 0, ty0); gg.addColorStop(0, '#fbbf24'); gg.addColorStop(0.5, '#f87171'); gg.addColorStop(1, '#a855f7'); ctx.fillStyle = gg; rr(bx - 7, ty0, 14, ty1 - ty0, 7).fill();
    [4, 5, 6, 7].forEach((e) => { T(bx - 14, YT(Math.pow(10, e)) + 4, sup2(e), 12, '#64748b', 'right', 700); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx - 7, YT(Math.pow(10, e))); ctx.lineTo(bx + 7, YT(Math.pow(10, e))); ctx.stroke(); });
    T(Tm.x + 12, ty0 - 8, 'K', 12, '#64748b', 'left', 800);
    WL.forEach((q, i) => {
      const y = YT(q.T), on = i === W.sel;
      D.sphere(bx, y, on ? 9 : 5.5, on ? '#0f172a' : `rgb(${q.col[0]},${q.col[1]},${q.col[2]})`, { gloss: on });
      if (on) { ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5); ctx.beginPath(); ctx.arc(bx, y, 14, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
      T(bx + 18, y + 4, q.short + (on ? '  ' + q.Ttxt : ''), on ? 12.5 : 12, on ? '#0f172a' : '#64748b', 'left', on ? 800 : 700);
    });
    // 지구 대기 투과율
    const Tr = L.Tr;
    panel(Tr.x, Tr.y, Tr.w, Tr.h, { r: 14, title: '지구 대기를 통과하는 빛', tsize: PHONE ? 12 : 13.5 });
    const rx0 = Tr.x + 34, rx1 = Tr.x + Tr.w - 12, ry0 = Tr.y + 40 * Math.min(FS, 1.2), ry1 = Tr.y + Tr.h - (PHONE ? 38 : 34), XR_ = (nm) => rx0 + (lg(nm) - 0.8) / 2.3 * (rx1 - rx0), YR_ = (p) => ry1 - p * (ry1 - ry0);
    [0, 0.5, 1].forEach((p) => { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rx0, YR_(p)); ctx.lineTo(rx1, YR_(p)); ctx.stroke(); T(rx0 - 5, YR_(p) + 4, Math.round(p * 100) + '', 11, '#64748b', 'right', 700); });
    const cp = []; for (let k = 0; k <= 90; k++) { const nm = Math.pow(10, 0.8 + 2.3 * k / 90); cp.push([XR_(nm), YR_(transOf(nm))]); }
    ctx.fillStyle = 'rgba(14,165,233,.18)'; ctx.beginPath(); ctx.moveTo(rx0, ry1); cp.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(rx1, ry1); ctx.closePath(); ctx.fill(); line(cp, '#0284c7', 2.5);
    [10, 100, 1000].forEach((nm) => { T(XR_(nm), ry1 + 15, String(nm), 11, '#64748b', 'center', 700); });
    T((rx0 + rx1) / 2, ry1 + (PHONE ? 31 : 29), '파장 (nm, 로그)', 11, '#94a3b8', 'center', 700);
    const nmv = [450, 656.3, 30.4, 17.1, 19.3, 9.4];
    WL.forEach((q, i) => { const x = XR_(nmv[i]), on = i === W.sel; ctx.strokeStyle = on ? '#0f172a' : `rgba(${q.col[0]},${q.col[1]},${q.col[2]},.9)`; ctx.lineWidth = on ? 3 : 1.8; ctx.beginPath(); ctx.moveTo(x, ry0); ctx.lineTo(x, ry1); ctx.stroke(); });
    const pv = Math.round(transOf(nmv[W.sel]) * 100);
    D.label(rx1 - 60, ry0 + 12, w.nm + ': ' + pv + ' %' + (pv < 5 ? ' (거의 막힘)' : ''), { bg: pv < 5 ? '#dc2626' : '#15803d', size: 11.5 });
    // 설명
    const Tx = L.Tx;
    panel(Tx.x, Tx.y, Tx.w, Tx.h, { r: 14 });
    drawWrap(Tx.x + 12, Tx.y + 26 * FS, pv < 5 ? w.nm + ' 빛은 지구 대기에 거의 다 흡수돼요. 우주 망원경(위성)으로 관측해요.' : w.nm + ' 빛은 대기를 잘 통과해서 지상 망원경으로도 관측할 수 있어요.', Tx.w - 24, 12.5, { color: '#0f172a', weight: 800 });
  }
  /* ----- 카드 분류: 파장 ↔ 층·온도 ----- */
  const cMatch = makeClassifier({
    items: WL.map((q, i) => ({ id: i, label: q.nm, sub: q.short === 'Hα' ? 'Hα (수소선)' : q.name, bin: q.bin, open: true })),
    bins: [
      { label: '광구 · 약 6000 K', sub: '쌀알 무늬 · 흑점', color: '#d97706' },
      { label: '채층 · 약 10⁴ K', sub: '홍염 · 암선', color: '#dc2626' },
      { label: '채층 상부·천이층 · 약 5×10⁴ K', sub: '가장자리 밖으로 솟은 홍염', color: '#9333ea' },
      { label: '코로나 아래층 · 약 6×10⁵ K', sub: '코로나 루프', color: '#ca8a04' },
      { label: '코로나 · 약 1.2×10⁶ K', sub: '코로나 홀은 어두움', color: '#15803d' },
      { label: '활동 영역·플레어 · 약 6×10⁶ K 이상', sub: '가장 뜨거운 플라스마', color: '#0e7490' },
    ],
    chipCols: 1, minRows: 1,
    layout() {
      return PHONE
        ? { grid: { x: 8, y: 8, w: 464, h: 160, cols: 3, cardH: 70, gap: 8 }, bins: [0, 1, 2, 3, 4, 5].map((i) => ({ x: 8 + (i % 2) * 235, y: 176 + Math.floor(i / 2) * 226, w: 229, h: 216 })), detail: null }
        : { grid: { x: 10, y: 10, w: 780, h: 120, cols: 3, cardH: 54, gap: 10 }, bins: [0, 1, 2, 3, 4, 5].map((i) => ({ x: 10 + (i % 3) * 263, y: 150 + Math.floor(i / 3) * 232, w: 254, h: 222 })), detail: null };
    },
  });
  function drawMatch(dt) { cMatch.draw(dt, {}); }

  /* ================= ④ 영상 합성 ================= */
  function LRg() {
    return PHONE
      ? { St: { x: 8, y: 8, w: 464, h: 148 }, Co: { x: 8, y: 164, w: 464, h: 396, cx: 240, cy: 362, R: 150 }, Lg: { x: 8, y: 568, w: 464, h: 284 } }
      : { St: { x: 10, y: 8, w: 780, h: 168 }, Co: { x: 10, y: 184, w: 520, h: 428, cx: 270, cy: 398, R: 170 }, Lg: { x: 538, y: 184, w: 252, h: 428 } };
  }
  const CHN = [{ n: '빨강', c: '#ef4444' }, { n: '초록', c: '#22c55e' }, { n: '파랑', c: '#3b82f6' }];
  const rgOK = () => S.rg.as[0] === 0 && S.rg.as[1] === 1 && S.rg.as[2] === 2;
  const COMPOLD = document.createElement('canvas'); COMPOLD.width = COMPOLD.height = NPX;
  let compKey = '';
  function ensureComp() {
    const key = S.rg.as.join('');
    if (key !== compKey) { compKey = key; COMPOLD.getContext('2d').drawImage(COMP, 0, 0); composite(S.rg.as); S.rg.fade = 1; }
  }
  function drawRgb(dt, t) {
    const L = LRg(), St = L.St, Co = L.Co, Lg = L.Lg, G = S.rg;
    ensureComp(); G.fade = approach(G.fade, 0, dt, 5); G.ringT += dt;
    panel(St.x, St.y, St.w, St.h, { r: 14, title: '위성 영상 3장 (같은 날, 파장만 달라요)', tsize: PHONE ? 12 : 14 });
    const tw = St.w / 3, rad = PHONE ? 44 : 52;
    WLC.forEach((q, i) => {
      const cx = St.x + tw * (i + 0.5) - (PHONE ? 0 : 74), cy = St.y + St.h / 2 + (PHONE ? 6 : 12) + (PHONE ? 4 : 0);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.clip(); ctx.fillStyle = '#04060f'; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); drawImg(getImg([6, 4, 3][i]), cx, cy, rad / 1.35, 1, false); ctx.restore();
      ctx.strokeStyle = CHN[G.as[i]].c; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, rad + 2, 0, TAU); ctx.stroke();
      const lx = PHONE ? cx : cx + rad + 8;
      if (PHONE) { T(cx, cy + rad + 17, q.nm, 12, '#334155', 'center', 800); T(cx, cy + rad + 31, CHN[G.as[i]].n + ' 채널', 12, CHN[G.as[i]].c, 'center', 800); }
      else { T(lx, cy - 18, q.nm, 14, '#334155', 'left', 800); T(lx, cy + 2, q.Ttxt, 12.5, '#64748b', 'left', 700); T(lx, cy + 24, '→ ' + CHN[G.as[i]].n + ' 채널', 14, CHN[G.as[i]].c, 'left', 800); }
    });
    // 합성
    D.shadow(() => { ctx.fillStyle = '#04060f'; rr(Co.x, Co.y, Co.w, Co.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(Co.x, Co.y, Co.w, Co.h, 14); ctx.clip();
    drawImg(COMP, Co.cx, Co.cy, Co.R, 1, false);
    if (G.fade > 0.01) { ctx.globalAlpha = G.fade; ctx.drawImage(COMPOLD, Co.cx - NPX / 2 * Co.R / PXR, Co.cy - NPX / 2 * Co.R / PXR, NPX * Co.R / PXR, NPX * Co.R / PXR); ctx.globalAlpha = 1; }
    ctx.restore();
    T(Co.x + 14, Co.y + 26, '🎨 합성 영상' + (rgOK() ? '' : ' (채널을 바꿔 보세요)'), PHONE ? 13 : 15, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.7)', strokeWidth: 4 });
    const mk = (pt, col, txt) => { if (!pt) return; const x = Co.cx + pt.u * Co.R, y = Co.cy - pt.v * Co.R; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 18, 0, TAU); ctx.stroke(); D.label(x, y - 28, txt, { bg: col, size: 12 }); };
    mk(G.hotPt, '#f59e0b', G.hotOk ? '✅ 가장 뜨거운 곳' : '선택');
    mk(G.holePt, '#22c55e', G.holeOk ? '✅ 코로나 홀' : '선택');
    // 읽는 법
    panel(Lg.x, Lg.y, Lg.w, Lg.h, { r: 14, title: '색 읽는 법' });
    let y = Lg.y + 40 * FS; const nw = Lg.w - 24;
    const ord = [0, 1, 2].map((ch) => G.as.findIndex((a) => a === ch));
    ord.forEach((si, ch) => {
      ctx.fillStyle = CHN[ch].c; rr(Lg.x + 12, y - 12, 14, 14, 4).fill();
      y = drawWrap(Lg.x + 34, y, CHN[ch].n + ' = ' + (si >= 0 ? WLC[si].nm + ' (' + WLC[si].Ttxt + ')' : '비어 있어요'), nw - 24, 12.5, { color: '#334155', weight: 800 }) + 21 * FS;
    });
    y += 4 * FS;
    y = drawWrap(Lg.x + 12, y, rgOK() ? '· 노랑·흰색: 세 파장이 모두 강한 곳 → 가장 뜨거운 활동 영역' : '· 뜨거운 파장일수록 빨강으로, 차가운 파장일수록 파랑으로 넣으면 색만 봐도 온도를 읽을 수 있어요.', nw, 12.5, { color: '#0369a1', weight: 800 }) + 20 * FS;
    y = drawWrap(Lg.x + 12, y, rgOK() ? '· 파랑·청록: 상대적으로 차가운 코로나(조용한 곳)' : '', nw, 12.5, { color: '#334155', weight: 700 }) + (rgOK() ? 20 * FS : 0);
    drawWrap(Lg.x + 12, y, rgOK() ? '· 검정: 세 파장 모두 어두움 → 코로나 홀' : '', nw, 12.5, { color: '#334155', weight: 700 });
  }

  /* =========================================================
     컨트롤 · 입력 · 장면 전환
     ========================================================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); }
    updateCtl();
  }
  function setViews(list) { viewList = list; buildSeg(); updateCtl(); }
  const sl = (id, oid, fmt, cb) => bindSlider($(id), $(oid), fmt, cb);
  const hFmt = (v) => comma(v) + ' km';
  function setZoom(on) {
    const P = S.ly, s = $('#sH'); P.zoom = on;
    if (on) { s.min = 1900; s.max = 2300; s.step = 5; P.h = clamp(Math.round(P.h / 5) * 5, 1900, 2300); } else { s.min = 0; s.max = 10000; s.step = 50; P.h = clamp(Math.round(P.h / 50) * 50, 0, 10000); }
    setSlider(s, $('#oH'), P.h, hFmt); updateCtl();
  }
  function setH(h) { const s = $('#sH'); S.ly.h = clamp(h, +s.min, +s.max); setSlider(s, $('#oH'), S.ly.h, hFmt); }
  const clsOf = (c) => c.counts();
  function startFlare() {
    const P = S.ph, q = sph(PF.ar1.lat, pfLon(PF.ar1, P.rot));
    if (q.z <= 0.06) { say('활동 영역이 태양 뒤쪽이에요. 자전 슬라이더를 0일 쪽으로 돌려 보세요', true, 3); return; }
    P.flare = 0; P.cme = -1; P.cmeDone = false; P.flareN++; Sound.success && Sound.success();
    say('플레어 발생! X선이 갑자기 늘고, 곧 코로나 물질이 날아가요(CME)', false, 3.2);
  }
  function updateCtl() {
    const free = FREE();
    const list = free ? ['graph', 'cards', 'phen', 'pair', 'wave', 'match', 'rgb'] : viewList;
    if (modeSeg.children.length !== list.length || Array.from(modeSeg.children).some((b, i) => b.dataset.view !== list[i])) { viewList = list; buildSeg(); }
    modeSeg.hidden = list.length < 2;
    modeBtns().forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    if (list.indexOf(S.view) < 0) { S.view = list[0]; S.fade = 1; }
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcE').hidden = !(S.view === 'phen' && (S.flags.calcE || free));
    $('#bZoom').classList.toggle('on', S.ly.zoom);
    $('#bZoom').textContent = S.ly.zoom ? '🔍 전체 높이로 보기' : '🔍 천이층 확대해서 보기';
    $('#bPlayR').textContent = S.ph.play ? '⏸ 멈춤' : '▶ 자전 재생';
    $$('#grpWave .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.wv.sel));
    $$('#rgBox .opt').forEach((b) => b.classList.toggle('on', S.rg.as[+b.dataset.s] === +b.dataset.c));
    $$('#grpTgt .opt').forEach((b) => { const k = +b.dataset.k; b.classList.toggle('on', S.rg.tgt === k); b.classList.toggle('done', k === 0 ? S.rg.hotOk : S.rg.holeOk); });
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
  }
  sl('#sH', '#oH', hFmt, (v) => { S.ly.h = v; });
  sl('#sRot', '#oRot', (v) => f1(v) + '일', (v) => { S.ph.rot = v; S.ph.play = false; updateCtl(); });
  clickable($('#bZoom'), () => setZoom(!S.ly.zoom));
  clickable($('#bPlayR'), () => { S.ph.play = !S.ph.play; if (S.ph.play && S.ph.rot >= 13) setRot(0); updateCtl(); });
  clickable($('#bFlare'), startFlare);
  $$('#grpWave .opt').forEach((b) => clickable(b, () => { const k = +b.dataset.k; if (k !== S.wv.sel) { S.wv.prev = S.wv.sel; S.wv.sel = k; S.wv.fade = 0; } updateCtl(); }));
  $$('#rgBox .opt').forEach((b) => clickable(b, () => { S.rg.as[+b.dataset.s] = +b.dataset.c; updateCtl(); }));
  $$('#grpTgt .opt').forEach((b) => clickable(b, () => { S.rg.tgt = +b.dataset.k; updateCtl(); }));
  $('#inE').addEventListener('input', () => { const v = numOf('inE'); if (v != null && v >= 1.4 && v <= 2.1) { S.ph.eOk = true; fbIn('inE', true); } });

  const CLS = { cards: cLy, pair: cPair, match: cMatch };
  SciSim.pointer(view, {
    down(p) {
      const c = CLS[S.view];
      if (c) { const r = c.down(p); return r; }
      if (S.view === 'phen') {
        const LG = LPh().LG;
        PHEN.forEach((q, i) => { const rh = PHONE ? 34 : 32, y = LG.y + 40 * Math.min(FS, 1.15) + i * (rh + 4); if (p.x >= LG.x + 10 && p.x <= LG.x + LG.w - 10 && p.y >= y && p.y <= y + rh) { S.ph.sel = S.ph.sel === i ? -1 : i; Sound.click(); } });
        return false;
      }
      if (S.view === 'wave') {
        const Im = LWv().Im, u = (p.x - Im.cx) / Im.R, v = -(p.y - Im.cy) / Im.R, W = S.wv;
        if (p.x < Im.x || p.x > Im.x + Im.w || p.y < Im.y || p.y > Im.y + Im.h) return false;
        if (Math.hypot(u, v) < 0.98 && inCH(u, v)) {
          if (W.sel === 4) { if (!W.hole) { W.hole = true; Sound.success && Sound.success(); parts.burst(p.x, p.y, { count: 16, color: '#86efac', speed: 80, life: 0.7 }); } }
          else say('코로나 홀은 코로나를 보는 극자외선 영상에서 어두워요. 이 미션은 19.3 nm 영상에서 찾아요', false, 3);
        } else if (S.flags.findCh || FREE()) { if (W.sel === 4) { W.bad = 1.3; Sound.fail && Sound.fail(); } }
        return false;
      }
      if (S.view === 'rgb') {
        const Co = LRg().Co, G = S.rg, u = (p.x - Co.cx) / Co.R, v = -(p.y - Co.cy) / Co.R;
        if (p.x < Co.x || p.x > Co.x + Co.w || p.y < Co.y || p.y > Co.y + Co.h || !rgOK()) { if (!rgOK() && p.x >= Co.x && p.x <= Co.x + Co.w && p.y >= Co.y && p.y <= Co.y + Co.h) say('먼저 세 영상을 알맞은 채널에 넣어 합성을 완성해요', true, 2.4); return false; }
        if (G.tgt === 0) {
          const hit = AR.some((a) => Math.hypot(u - a.x, v - a.y) < 0.17);
          G.hotPt = { u, v }; G.hotOk = hit; if (hit) { Sound.success && Sound.success(); parts.burst(p.x, p.y, { count: 14, color: '#fcd34d', speed: 70, life: 0.7 }); } else { say('그곳은 세 파장이 모두 강한 곳이 아니에요. 노랑·흰색으로 가장 밝은 곳을 찾아봐요', true, 2.8); Sound.fail && Sound.fail(); }
        } else {
          const hit = Math.hypot(u, v) < 0.98 && inCH(u, v);
          G.holePt = { u, v }; G.holeOk = hit; if (hit) { Sound.success && Sound.success(); parts.burst(p.x, p.y, { count: 14, color: '#86efac', speed: 70, life: 0.7 }); } else { say('코로나 홀은 세 파장이 모두 어두운(검은) 곳이에요', true, 2.6); Sound.fail && Sound.fail(); }
        }
        updateCtl(); return false;
      }
      return false;
    },
    move(p) { const c = CLS[S.view]; if (c) c.move(p); },
    up(p) { const c = CLS[S.view]; if (c) c.up(p); },
    hover(p) {
      const c = CLS[S.view]; if (c) return c.hit(p) ? 'pointer' : '';
      if (S.view === 'phen') { const LG = LPh().LG; return p.x >= LG.x && p.x <= LG.x + LG.w && p.y >= LG.y + 36 && p.y <= LG.y + LG.h ? 'pointer' : ''; }
      if (S.view === 'wave' || S.view === 'rgb') return 'crosshair';
      return '';
    },
  });

  /* ================= 미션 ================= */
  const lyOK = () => Tof(S.ly.h) >= 1e6 && S.ly.h <= 2200;
  const levels = [
    {
      title: '대기 구조: 높이에 따른 온도', short: '대기 구조', icon: '🌡', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 태양을 여러 파장으로 보면 왜 모습이 다를까?</p>' +
        '<div class="si-link">🔗 <b>흑점과 태양의 자전</b>에서 광구를 관측했어요. 광구 위에는 <b>채층</b>과 <b>코로나</b>가 있어요. 중학교에서 코로나·홍염·플레어를 배웠고, 일반선택 지구과학의 <b>흑체 복사</b>에서 온도와 빛을 연결했어요. 이번에는 태양 대기를 <b>높이와 온도</b>로 나타내 봐요.</div>' +
        '<p>태양 표면(광구)에서 위로 올라가면 온도가 어떻게 변할까요? 슬라이더로 높이 h를 올려 보고, <b>광구 · 채층 · 천이층 · 코로나</b>의 온도와 입자 수(밀도)를 비교해요.</p>',
      features: ['graph'],
      setup() { S.ly.h = 100; setZoom(false); setH(100); setViews(['graph', 'cards']); cLy.reset(); setView('graph'); },
      recap: '광구에서는 위로 갈수록 식다가(약 4400 K), 채층·천이층을 지나 코로나에서 100만 K 이상으로 올라가요. 코로나는 아주 희박해서 밝기는 광구의 약 100만 분의 1이에요.',
      summary: '<ul><li><b>높이–온도</b>: 광구 0 km 5800 K → 온도 최저층 약 500 km 4400 K → 채층 약 2000 km까지 2×10⁴ K → <b>천이층</b>(얇은 층)에서 10⁶ K로 급상승 → <b>코로나</b> 10⁶ K 이상(수백만 km로 퍼짐).</li><li><b>입자 수(개/m³)</b>: 광구 약 10²³, 채층 약 10²⁰, 코로나 약 10¹⁵ → 코로나는 매우 희박해서 밝기가 광구의 약 100만 분의 1이에요(개기 일식이나 코로나그래프로 관측).</li><li>표면(5800 K)보다 위층이 더 뜨거운 것은 <b>코로나 가열 문제</b>로, 아직 완전히 풀리지 않았어요.</li><li>채층은 개기 일식 때 달 가장자리의 붉은 테두리(수소 Hα 656.3 nm)로 보여요.</li></ul>',
      missions: [
        {
          title: '온도가 100만 K을 넘는 높이 찾기',
          goal: '슬라이더로 높이를 올려, 온도가 처음으로 <b>10⁶ K(100만 K)</b> 이상이 되는 높이를 찾으세요.',
          hint: '약 2000 km 위의 아주 얇은 층에서 온도가 갑자기 올라가요. "🔍 천이층 확대해서 보기"를 누르면 눈금이 촘촘해져요.',
          setup() { setZoom(false); setH(500); S.ly.hs = 500; setView('graph'); },
          check: () => lyOK(),
          hold: 0.7,
          status: () => mark(lyOK()) + ' 높이 ' + comma(S.ly.h) + ' km · ' + TK(Tof(S.ly.h)),
          explain: '약 <b>2100 km</b>에서 온도가 10⁶ K에 도달해요. 2000~2100 km의 얇은 <b>천이층</b>에서 온도가 2×10⁴ K에서 10⁶ K로 수십 배 솟아요. 열이 표면에서 위로 흐른다면 식어야 하는데 오히려 더 뜨거워지는 이 현상을 코로나 가열 문제라고 불러요.',
        },
        {
          title: '층 이름 카드 놓기', manual: true,
          goal: '층 이름 카드 4장을 그 층의 <b>높이·온도</b>가 적힌 상자(A~D)에 넣으세요.',
          hint: '높이가 낮은 곳부터 광구, 채층, 천이층, 코로나예요. 천이층은 높이 범위가 100 km밖에 안 되는 얇은 층이에요.',
          setup() { cLy.reset(); setView('cards'); },
          check() {
            const c = cLy.counts(); if (c.placed < 4) return '아직 상자에 넣지 않은 카드가 ' + (4 - c.placed) + '장 있어요.';
            const bad = cLy.items.filter((i) => !cLy.isRight(i)); bad.forEach((i) => { i.wrong = true; });
            return bad.length ? '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요. 높이 범위와 온도를 다시 보세요.' : true;
          },
          status: () => mark(clsOf(cLy).placed === 4) + ' 놓은 카드 ' + clsOf(cLy).placed + ' / 4 &nbsp; ' + mark(clsOf(cLy).right === 4) + ' 맞게 ' + clsOf(cLy).right + ' / 4',
          explain: 'A 광구(0~500 km, 5800 K → 4400 K), B 채층(500~2000 km), C 천이층(2000~2100 km, 온도 급상승), D 코로나(2100 km 위, 10⁶ K 이상)예요.',
        },
        {
          type: 'quiz', title: '코로나는 뜨거운데 왜 어두울까?',
          goal: '코로나는 온도가 광구보다 훨씬 높은데도 광구보다 <b>훨씬 어둡게</b> 보여요. 그 까닭은?',
          setup() { setView('graph'); setH(5000); },
          choices: ['코로나는 입자 수가 아주 적어(약 10¹⁵ 개/m³) 밝기가 광구의 약 100만 분의 1이기 때문이에요', '코로나는 광구보다 온도가 낮기 때문이에요', '코로나는 100만 K이므로 광구보다 훨씬 밝고 열을 많이 내요', '코로나는 개기 일식 때만 생기는 층이기 때문이에요'],
          answer: 0,
          feedback: ['', '코로나는 광구(5800 K)보다 훨씬 뜨거운 10⁶ K 이상이에요.', '온도가 높아도 빛을 내는 입자가 아주 적으면 내는 빛의 양은 적어요.', '코로나는 항상 있어요. 광구가 너무 밝아서 일식 때나 코로나그래프로 광구를 가려야 보여요.'],
          explain: '코로나는 온도는 높지만 <b>밀도가 매우 낮아</b>(광구의 약 10⁻⁸배) 밝기가 광구의 약 100만 분의 1이에요. 그래서 개기 일식 때나 코로나그래프로 광구를 가려야 보여요.',
        },
      ],
    },
    {
      title: '대기 현상: 홍염 · 플레어 · CME · 코로나 홀', short: '대기 현상', icon: '🔥', phase: '관찰',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 태양 대기가 채층·천이층·코로나로 이루어졌다는 것을 알았어요. 이 대기에서는 <b>자기장</b> 때문에 여러 현상이 일어나요. 같은 현상이 파장에 따라 다르게 보이는 이유를 다음 단계에서 알아볼 거예요.</div>' +
        '<p>자전 슬라이더로 <b>홍염</b>이 가장자리에서 원반 위로 오는 모습을 보고, 플레어를 일으켜 X선과 <b>CME</b>를 관찰해요. 오른쪽 목록에서 <b>코로나 홀</b>도 찾아봐요.</p>',
      features: ['phen'],
      setup() { S.ph.rot = 0; S.ph.play = false; S.ph.sel = -1; S.ph.flare = -1; S.ph.cme = -1; setRot(0); cPair.reset(); S.flags.calcE = false; clrIn('inE'); setViews(['phen', 'pair']); setView('phen'); },
      recap: '홍염은 채층 가스가 자기장 고리를 따라 솟은 것이고, 플레어는 짧은 시간에 에너지를 방출하며, CME는 코로나 물질이 날아가는 현상이에요. 코로나 홀은 자기장이 열려 어둡고 빠른 태양풍이 나와요.',
      summary: '<ul><li><b>홍염</b>: 채층 물질이 자기장 고리를 따라 코로나로 솟은 것. 가장자리에서는 밝은 불꽃, 원반 위에서는 어두운 실 모양 <b>암선</b>(같은 현상, 배경이 달라요).</li><li><b>플레어</b>: 자기장 에너지가 수분~수 시간에 방출. X선·자외선 급증. 큰 플레어 에너지 약 10²⁵ J ≈ 인류 연간 에너지 소비(6×10²⁰ J)의 약 2만 배.</li><li><b>CME</b>(코로나 질량 방출): 질량 10¹²~10¹³ kg의 코로나 물질이 400~3000 km/s로 방출.</li><li><b>코로나 홀</b>: 자기장이 열려 있어 X선·극자외선으로 어둡게 보이고, 빠른 태양풍이 나오는 곳.</li></ul>',
      missions: [
        {
          title: '현상과 설명 짝짓기', manual: true,
          goal: '현상 카드 4장을 알맞은 <b>설명 상자</b>에 넣으세요. (🔥 현상 장면에서 직접 보고 와도 좋아요)',
          hint: 'CME는 코로나 물질이 우주로 날아가는 것, 코로나 홀은 X선 영상에서 어두운 곳이에요.',
          setup() { cPair.reset(); setView('pair'); },
          check() {
            const c = cPair.counts(); if (c.placed < 4) return '아직 상자에 넣지 않은 카드가 ' + (4 - c.placed) + '장 있어요.';
            const bad = cPair.items.filter((i) => !cPair.isRight(i)); bad.forEach((i) => { i.wrong = true; });
            return bad.length ? '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요. 설명을 다시 읽어 보세요.' : true;
          },
          status: () => mark(clsOf(cPair).placed === 4) + ' 놓은 카드 ' + clsOf(cPair).placed + ' / 4 &nbsp; ' + mark(clsOf(cPair).right === 4) + ' 맞게 ' + clsOf(cPair).right + ' / 4',
          explain: '홍염 = 채층 가스가 솟은 고리, 플레어 = 짧은 시간의 에너지 방출, CME = 코로나 물질이 날아감, 코로나 홀 = X선·극자외선에서 어두운 곳(빠른 태양풍의 근원)이에요.',
        },
        {
          title: '플레어 에너지는 얼마나 클까?',
          goal: '큰 플레어의 에너지 <b>10²⁵ J</b>은 인류가 1년 동안 쓰는 에너지 <b>6×10²⁰ J</b>의 약 <b>몇 만 배</b>일까요? (만 배 단위, 소수 첫째 자리)',
          hint: '10²⁵ ÷ (6×10²⁰) = 10⁵ ÷ 6 ≈ 16700이에요. 만 배 단위로는 약 1.7이에요.',
          setup() { S.flags.calcE = true; S.ph.eOk = false; clrIn('inE'); setView('phen'); },
          check: () => S.ph.eOk,
          hold: 0.6,
          status: () => mark(S.ph.eOk) + ' 약 ' + ($('#inE').value.trim() || '—') + ' 만 배',
          explain: '10²⁵ J ÷ (6×10²⁰ J) ≈ 1.7×10⁴, 즉 약 <b>2만 배</b>예요. 그림의 막대는 로그 눈금이라 실제 차이는 막대보다 훨씬 커요.',
        },
        {
          type: 'quiz', title: '홍염과 암선은 같은 현상일까?',
          goal: '가장자리의 밝은 <b>홍염</b>과 원반 위의 어두운 <b>암선</b>은 같은 현상이에요. 밝기가 다르게 보이는 까닭은?',
          setup() { setView('phen'); },
          choices: ['보는 배경이 달라서예요: 가장자리에서는 어두운 우주를 배경으로 밝게, 원반 위에서는 밝은 채층을 배경으로 어둡게 보여요', '홍염은 뜨거운 가스, 암선은 차가운 가스이기 때문이에요', '암선은 흑점이 길게 늘어선 것이기 때문이에요', '암선은 지구 대기의 구름이 비친 것이기 때문이에요'],
          answer: 0,
          feedback: ['', '둘은 같은 가스(채층 온도의 차가운 가스)예요. 자전으로 가장자리에서 원반 위로 오면 암선이 돼요.', '암선은 흑점과 달리 자기장 고리를 따라 떠 있는 채층 가스예요.', '태양 영상은 위성이나 필터 망원경으로 찍어요. 지구 구름과는 관계없어요.'],
          explain: '같은 채층 가스가 <b>어두운 우주 배경</b> 앞에서는 스스로 빛나서 밝게, <b>밝은 채층 원반</b> 앞에서는 빛을 덜 내서 어둡게 보여요. 자전 슬라이더에서 홍염이 원반 위로 오면 암선이 되는 것을 볼 수 있어요.',
        },
      ],
    },
    {
      title: '다파장 관측: 파장마다 다른 층', short: '다파장', icon: '🛰', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 태양 대기의 층마다 온도가 다르고, 같은 현상도 배경에 따라 다르게 보이는 것을 알았어요. <b>일반선택 지구과학의 흑체 복사</b>에서 온도가 다르면 빛의 파장이 달라진다는 것도 배웠어요.</div>' +
        '<p>같은 날의 태양을 <b>6개 파장</b>(가시광선 · Hα · 30.4 · 17.1 · 19.3 · 9.4 nm)으로 보면 서로 다른 층이 보여요. 파장마다 보이는 층과 온도를 짝짓고, 코로나 홀을 찾고, 지구 대기가 막는 빛을 확인해요.</p>',
      features: ['wave'],
      setup() { S.wv.sel = 1; S.wv.prev = 1; S.wv.fade = 1; S.wv.hole = false; S.flags.findCh = false; cMatch.reset(); setViews(['wave', 'match']); setView('wave'); },
      recap: '파장마다 그 빛을 내는 플라스마의 온도가 달라서 서로 다른 층이 보여요. 극자외선·X선은 지구 대기에 흡수되어 우주 망원경이 필요해요.',
      summary: '<ul><li><b>450 nm</b> 광구 약 6000 K(쌀알·흑점) · <b>Hα 656.3 nm</b> 채층 약 10⁴ K(홍염·암선) · <b>30.4 nm</b>(He II) 채층 상부·천이층 약 5×10⁴ K · <b>17.1 nm</b>(Fe IX) 코로나 아래층 약 6×10⁵ K(코로나 루프) · <b>19.3 nm</b>(Fe XII) 코로나 약 1.2×10⁶ K(코로나 홀은 어두움) · <b>9.4 nm</b>(Fe XVIII) 활동 영역·플레어 약 6×10⁶ K 이상.</li><li>온도가 높을수록 철 이온이 전자를 더 많이 잃어서 더 짧은 파장의 선을 내요(한 줄 정보).</li><li>지구 대기가 자외선·X선을 흡수해서 극자외선 영상은 <b>우주 망원경(위성)</b>으로 찍어요.</li><li>영상의 색은 사람이 입힌 것이지만, 밝은 곳은 그 파장의 빛을 내는 플라스마가 있는 곳이에요.</li></ul>',
      missions: [
        {
          title: '파장과 층·온도 짝짓기', manual: true,
          goal: '파장 카드 6장을 <b>보이는 층과 온도</b>가 적힌 상자에 넣으세요. (🛰 파장별 영상에서 온도 그래프를 참고해요)',
          hint: '파장이 짧을수록 더 뜨거운 플라스마예요. 가시광선이 가장 차갑고(광구), 9.4 nm가 가장 뜨거워요.',
          setup() { cMatch.reset(); setView('match'); },
          check() {
            const c = cMatch.counts(); if (c.placed < 6) return '아직 상자에 넣지 않은 카드가 ' + (6 - c.placed) + '장 있어요.';
            const bad = cMatch.items.filter((i) => !cMatch.isRight(i)); bad.forEach((i) => { i.wrong = true; });
            return bad.length ? '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요. 파장별 영상의 온도를 다시 확인해요.' : true;
          },
          status: () => mark(clsOf(cMatch).placed === 6) + ' 놓은 카드 ' + clsOf(cMatch).placed + ' / 6 &nbsp; ' + mark(clsOf(cMatch).right === 6) + ' 맞게 ' + clsOf(cMatch).right + ' / 6',
          explain: '450 nm 광구 6000 K, Hα 채층 10⁴ K, 30.4 nm 천이층 5×10⁴ K, 17.1 nm 6×10⁵ K, 19.3 nm 1.2×10⁶ K, 9.4 nm 6×10⁶ K 이상이에요. 뜨거울수록 더 높은 층(코로나)이에요.',
        },
        {
          title: '19.3 nm 영상에서 코로나 홀 찾기',
          goal: '<b>19.3 nm</b> 영상을 고르고, 어둡게 보이는 <b>코로나 홀</b>을 눌러 보세요.',
          hint: '19.3 nm 버튼을 누르면 초록빛 영상이 나와요. 원반에서 어둡게 뚫린 곳(북극 쪽과 아래쪽 왼편)을 눌러요.',
          setup() { S.flags.findCh = true; S.wv.hole = false; S.wv.prev = S.wv.sel; S.wv.sel = 1; S.wv.fade = 1; setView('wave'); },
          check: () => S.wv.hole,
          hold: 0.4,
          status: () => mark(S.wv.sel === 4) + ' 19.3 nm 영상 &nbsp; ' + mark(S.wv.hole) + ' 코로나 홀 찾음',
          explain: '코로나 홀은 자기장이 열려 있어 뜨거운 가스가 우주로 빠져나가므로 그곳 코로나가 희박해서 <b>극자외선·X선 영상에서 어두워요</b>. 빠른 태양풍의 근원이에요.',
        },
        {
          type: 'quiz', title: '9.4 nm 영상에서 활동 영역이 밝은 까닭',
          goal: '9.4 nm 영상에서는 <b>활동 영역과 플레어</b>만 밝게 보여요. 그 까닭은?',
          setup() { setView('wave'); S.wv.prev = S.wv.sel; S.wv.sel = 5; S.wv.fade = 0; },
          choices: ['그 파장의 빛은 온도가 아주 높은(약 6×10⁶ K 이상) 플라스마가 내기 때문이에요', '파장이 달라서 색만 다르게 칠한 것이에요', '활동 영역은 모든 파장에서 똑같이 밝아요', '9.4 nm 빛은 지구 대기를 가장 잘 통과하기 때문이에요'],
          answer: 0,
          feedback: ['', '색은 사람이 입힌 것이지만, 밝은 곳은 그 파장의 빛을 내는 뜨거운 플라스마가 실제로 있는 곳이에요.', '가시광선에서는 흑점이 어둡지만 9.4 nm에서는 활동 영역이 밝아요. 파장마다 달라요.', '9.4 nm 빛은 지구 대기에 거의 다 흡수돼서 위성으로만 볼 수 있어요.'],
          explain: '9.4 nm 빛(Fe XVIII)은 <b>약 6×10⁶ K 이상</b>의 아주 뜨거운 플라스마만 내요. 조용한 코로나(약 10⁶ K)는 거의 어둡고, 활동 영역·플레어에만 그렇게 뜨거운 플라스마가 있어서 밝게 보여요.',
        },
      ],
    },
    {
      title: '영상 합성: 세 파장을 색으로', short: '영상 합성', icon: '🎨', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 파장마다 보이는 층과 온도가 다르다는 것을 알았어요. 위성이 보낸 영상은 흑백이에요. 연구자들은 여러 영상을 <b>컴퓨터로 합성</b>해서 한눈에 온도 분포를 읽어요.</div>' +
        '<p>같은 날의 세 영상(<b>21.1 · 19.3 · 17.1 nm</b>)을 빨강·초록·파랑 <b>채널</b>에 넣어 합성해요. 뜨거운 파장을 빨강, 차가운 파장을 파랑으로 넣으면 색으로 온도를 읽을 수 있어요.</p>' +
        '<p>합성 영상에서 <b>가장 뜨거운 활동 영역</b>과 <b>코로나 홀</b>을 찾아봐요.</p>',
      features: ['rgb'],
      setup() { S.rg.as = [2, 1, 0]; S.rg.hotOk = false; S.rg.holeOk = false; S.rg.hotPt = null; S.rg.holePt = null; S.rg.tgt = 0; setViews(['rgb']); setView('rgb'); },
      recap: '세 파장을 온도 순서대로 빨강·초록·파랑에 넣으면 색으로 온도를 읽을 수 있어요. 노랑·흰색은 가장 뜨거운 활동 영역, 검정은 코로나 홀이에요.',
      summary: '<ul><li><b>영상 합성</b>: 21.1 nm(약 2×10⁶ K)를 빨강, 19.3 nm(약 1.2×10⁶ K)를 초록, 17.1 nm(약 6×10⁵ K)를 파랑 채널에 넣으면 뜨거울수록 붉게 보여요.</li><li><b>읽는 법</b>: 노랑·흰색 = 세 파장이 모두 강한 곳 = 가장 뜨거운 활동 영역 · 파랑·청록 = 상대적으로 차가운 코로나 · 검정 = 모든 파장이 어두운 곳 = 코로나 홀.</li><li>채널을 바꾸면 색이 달라지지만 밝기의 분포(어느 곳에 플라스마가 있는가)는 변하지 않아요.</li></ul>',
      missions: [
        {
          title: '세 영상을 알맞은 채널에 넣기',
          goal: '<b>가장 뜨거운 21.1 nm</b>를 빨강, <b>19.3 nm</b>를 초록, <b>가장 차가운 17.1 nm</b>를 파랑 채널에 넣어 합성을 완성하세요.',
          hint: '오른쪽 위의 버튼에서 21.1 nm → 빨강, 19.3 nm → 초록, 17.1 nm → 파랑을 눌러요. 처음에는 거꾸로 되어 있어요.',
          setup() { S.rg.as = [2, 1, 0]; S.rg.hotOk = false; S.rg.holeOk = false; S.rg.hotPt = null; S.rg.holePt = null; updateCtl(); setView('rgb'); },
          check: () => rgOK(),
          hold: 0.8,
          status: () => WLC.map((q, i) => mark(S.rg.as[i] === i) + ' ' + q.nm + ' → ' + CHN[S.rg.as[i]].n).join(' &nbsp; '),
          explain: '뜨거운 순서(21.1 → 19.3 → 17.1)대로 <b>빨강 → 초록 → 파랑</b>을 주면 뜨거울수록 붉은 쪽으로 보여요. 채널을 바꿔도 밝기 분포는 같고 색만 달라져요.',
        },
        {
          title: '뜨거운 곳과 코로나 홀 찾기', manual: true,
          goal: '합성 영상에서 <b>가장 뜨거운 영역(활동 영역)</b>과 <b>코로나 홀</b>을 각각 눌러 표시하세요.',
          hint: '활동 영역은 노랑·흰색으로 가장 밝은 점이에요. 코로나 홀은 세 파장이 모두 어두운 검은 곳(북극 쪽, 아래쪽 왼편)이에요.',
          setup() { S.rg.hotOk = false; S.rg.holeOk = false; S.rg.hotPt = null; S.rg.holePt = null; S.rg.tgt = 0; setView('rgb'); updateCtl(); },
          check() { if (!rgOK()) return '먼저 채널을 알맞게 바꿔 합성을 완성해요.'; if (!S.rg.hotOk) return '"가장 뜨거운 영역"을 합성 영상에서 눌러 표시해 주세요.'; if (!S.rg.holeOk) return '"코로나 홀"을 합성 영상에서 눌러 표시해 주세요.'; return true; },
          status: () => mark(S.rg.hotOk) + ' 가장 뜨거운 영역 &nbsp; ' + mark(S.rg.holeOk) + ' 코로나 홀',
          explain: '세 파장이 모두 강한 노랑·흰색 점은 <b>활동 영역</b>(가장 뜨거움), 모든 채널이 어두운 검은 곳은 <b>코로나 홀</b>이에요. 색의 분포로 온도와 구조를 한눈에 읽을 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-solar-atmosphere', mount: '#game', badge: '태양 대기 분석가', homeHref: '../../index.html#hu',
    featureLabels: { graph: '🌡 높이–온도 그래프 · 층 이름 카드', phen: '🔥 홍염·플레어·CME·코로나 홀', wave: '🛰 파장별 영상 6장 · 온도 · 대기 투과율', rgb: '🎨 세 영상 합성' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view, P = S.ly, c = CLS[v];
    if (v === 'graph') setReadouts(['높이 h', comma(P.h) + ' km', '온도', TK(Tof(P.h)), '층', LAYER[layerOf(P.h)].n]);
    else if (c) { const k = clsOf(c); setReadouts(['놓은 카드', k.placed + ' / ' + c.items.length, '맞게 놓음', k.right + ' / ' + c.items.length, '고른 카드', c.sel >= 0 ? c.items[c.sel].label : '—']); }
    else if (v === 'phen') setReadouts(['자전', f1(S.ph.rot) + ' 일', '고른 현상', S.ph.sel >= 0 ? PHEN[S.ph.sel].n : '—', '큰 플레어 에너지', '10²⁵ J']);
    else if (v === 'wave') { const w = WL[S.wv.sel]; setReadouts(['파장', w.nm, '보이는 층', w.layer, '온도', w.Ttxt]); }
    else setReadouts(['채널 배정', rgOK() ? '알맞아요' : '바꿔 보세요', '가장 뜨거운 곳', S.rg.hotOk ? '찾았어요' : '—', '코로나 홀', S.rg.holeOk ? '찾았어요' : '—']);
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
      case 'graph': drawGraphView(dt, t); break;
      case 'cards': drawCards(dt, t); break;
      case 'phen': drawPhen(dt, t); break;
      case 'pair': drawPair(dt); break;
      case 'wave': drawWave(dt, t); break;
      case 'match': drawMatch(dt); break;
      default: drawRgb(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, setViews, updateCtl, setZoom, setH, setRot, startFlare, Tof, LAYER, WL, WLC, AR, CH, inCH, cLy, cPair, cMatch, rgOK, LPh, LWv, LRg, LGr, getImg, PHEN, lyOK };
})();
