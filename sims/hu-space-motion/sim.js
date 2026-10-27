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
   행성우주과학 Ⅱ. 태양과 별의 관측 - 별의 공간 운동 (4차시)
   성취기준 [12행우02-03] 별의 시선속도와 접선속도의 합으로 공간 운동이 나타남을 이해하고, 별자리를 구성하는 별들의 장시간에 걸친 형태 변화를 추론할 수 있다.
   ① 분석: 시선 속도 (v_r = c Δλ / λ₀)
   ② 분석: 접선 속도 (v_t = 4.74 μ d)
   ③ 설명: 공간 운동 (v = √(v_r² + v_t²), 바너드별의 최근접)
   ④ 탐구: 별자리 (북두칠성의 3차원 점 도표, 시간에 따른 모양 변화)
   다루지 않음: 태양의 운동 보정(국부 정지 기준), 은하 회전에 의한 운동의 분해, 가속도 운동. 천구 좌표계는 도입하지 않고 '하늘에서 보이는 각도'와 거리로만 나타내요.
   ========================================================= */
  initStage('#e8eef8', 800, 620, 480, 860, 1.25);
  if (PHONE) view.canvas.style.touchAction = 'pan-y';

  /* ================= 자료 ================= */
  const lg = (x) => Math.log10(x);
  const C_KMS = 299792, LAM0 = 656.28;
  const K474 = 4.74;
  const STAR4 = [
    { n: '바너드별', mu: 10.358, p: 0.5469, vr: -110.5, c: '#fca5a5' },
    { n: '시리우스', mu: 1.339, p: 0.3792, vr: -5.5, c: '#bfdbfe' },
    { n: '아르크투루스', mu: 2.28, p: 0.0888, vr: -5.2, c: '#fdba74' },
    { n: '베가', mu: 0.35, p: 0.1302, vr: -13.9, c: '#dbeafe' },
  ];
  STAR4.forEach((s) => { s.d = 1 / s.p; s.vt = K474 * s.mu * s.d; s.v = Math.hypot(s.vr, s.vt); s.th = Math.atan2(s.vt, Math.abs(s.vr)) / DEG; s.dl = LAM0 * s.vr / C_KMS; });
  const BAR = STAR4[0];
  /* 북두칠성 (거리 pc, 메그레즈 기준 하늘 위치(동쪽·북쪽 도), 고유 운동(동쪽·북쪽 mas/년)) */
  const DIP = [
    { n: '두베', d: 37.9, dx: -9.8, dy: 4.7, pe: -136.5, pn: -35.3, grp: false },
    { n: '메라크', d: 24.4, dx: -10.0, dy: -0.7, pe: 81.7, pn: 33.7, grp: true },
    { n: '페크다', d: 25.6, dx: -2.9, dy: -3.3, pe: 107.8, pn: 11.2, grp: true },
    { n: '메그레즈', d: 24.7, dx: 0, dy: 0, pe: 103.6, pn: 7.8, grp: true },
    { n: '알리오스', d: 24.8, dx: 5.3, dy: -1.1, pe: 111.7, pn: -8.7, grp: true },
    { n: '미자르', d: 25.0, dx: 9.3, dy: -2.1, pe: 121.2, pn: -22.0, grp: true },
    { n: '알카이드', d: 31.0, dx: 12.5, dy: -7.7, pe: -121.2, pn: -15.6, grp: false },
  ];
  DIP.forEach((s) => { s.mu = Math.hypot(s.pe, s.pn) / 1000; s.vt = K474 * s.mu * s.d; });
  const ORI = [
    { n: '베텔게우스', d: 170, dx: 4.74, dy: 8.61 }, { n: '벨라트릭스', d: 77, dx: -2.77, dy: 7.55 }, { n: '리겔', d: 260, dx: -5.41, dy: -7.0 },
    { n: '알닐람', d: 600, dx: 0, dy: 0 }, { n: '알니타크', d: 230, dx: 1.15, dy: -0.74 }, { n: '민타카', d: 380, dx: -1.05, dy: 0.9 }, { n: '사이프', d: 200, dx: 2.9, dy: -8.47 },
  ];
  const DS = {
    dip: { name: '북두칠성', st: DIP, rx: 15, ry: 10, z0: 20, z1: 40, zt: [20, 25, 30, 35, 40], pm: true },
    ori: { name: '오리온', st: ORI, rx: 8, ry: 12, z0: 0, z1: 700, zt: [0, 200, 400, 600], pm: false },
  };
  const sg = (x) => (x < 0 ? '−' : '') + Math.abs(x);
  const f1s = (x) => (x < 0 ? '−' : '') + f1(Math.abs(x));
  const f2s = (x) => (x < 0 ? '−' : '') + f2(Math.abs(x));
  const f3s = (x) => (x < 0 ? '−' : '') + f3(Math.abs(x));
  const PC_KM = 3.0857e13, YR_S = 3.15576e7;
  const KMS_PC_YR = YR_S / PC_KM;                                 // 1 km/s = 1.0227e-6 pc/년
  /* 바너드별의 거리 d(t) */
  const barDist = (t) => { const r = BAR.d + BAR.vr * KMS_PC_YR * t, x = BAR.vt * KMS_PC_YR * t; return Math.hypot(r, x); };
  const barMin = BAR.d * BAR.vt / BAR.v, barTmin = BAR.d * Math.abs(BAR.vr) / (BAR.v * BAR.v) / KMS_PC_YR;

  /* ================= 상태 ================= */
  const S = {
    view: 'rad', clock: 0, fade: 0,
    flags: { calcVr: false, calcVt: false, calcV: false, calcDm: false, pickGrp: false, showVt: false },
    rd: { sel: 0, vcus: -60, ok: false, lam: 0, vrs: 0 },
    tn: { sel: 0, dt: 5, blink: false, bt: 0, ok: false, ph: 0 },
    vc: { t: 0, ts: 0, vOk: false, dmOk: false },
    cn: { ds: 'dip', yaw: 0, ys: 0, t: 0, ts: 0, sel: new Set(), grpOk: false, arrows: false, tAbs: 0, yawMax: 0, drag: null },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { rad: '🌈 스펙트럼선의 이동', tan: '🔭 두 해의 하늘 사진', vec: '🧭 공간 운동과 최근접', con: '⭐ 별자리의 3차원 점 도표' };
  const VIEW_BTN = { rad: '🌈 시선 속도', tan: '🔭 접선 속도', vec: '🧭 공간 운동', con: '⭐ 별자리' };
  let viewList = ['rad'];
  const modeSeg = $('#modeSeg');
  function buildSeg() {
    modeSeg.innerHTML = '';
    viewList.forEach((v) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.view = v; b.textContent = VIEW_BTN[v]; clickable(b, () => setView(v)); modeSeg.appendChild(b); });
  }
  const modeBtns = () => $$('#modeSeg button');
  const BGS = (() => { const r = rng(33), a = []; for (let i = 0; i < 60; i++) a.push([r(), r(), 0.7 + r() * 1.5, 0.3 + r() * 0.5]); return a; })();
  const rdVr = () => (S.rd.sel < 4 ? STAR4[S.rd.sel].vr : S.rd.vcus);
  const rdName = () => (S.rd.sel < 4 ? STAR4[S.rd.sel].n : '가상의 별');

  /* ================= ① 시선 속도: 스펙트럼선의 이동 ================= */
  function LRd() {
    return PHONE
      ? { Sp: { x: 8, y: 8, w: 464, h: 336 }, Bp: { x: 8, y: 352, w: 464, h: 500 } }
      : { Sp: { x: 10, y: 8, w: 780, h: 312 }, Bp: { x: 10, y: 328, w: 780, h: 284 } };
  }
  function absLine(x, y, h, a) {
    for (let k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(20,0,0,' + (a * (0.28 + k * 0.2)) + ')'; const w = 16 - k * 4; ctx.fillRect(x - w / 2, y, w, h); }
  }
  function drawRad(dt, t) {
    const L = LRd(), R = S.rd, Sp = L.Sp, vr = rdVr(), lamObs = LAM0 * (1 + vr / C_KMS);
    R.lam = approach(R.lam || LAM0, lamObs, dt, 7);
    panel(Sp.x, Sp.y, Sp.w, Sp.h, { r: 14, title: 'Hα 흡수선 (실험실 기준 656.28 nm)', tsize: PHONE ? 12.5 : 14 });
    const x0 = Sp.x + 36, x1 = Sp.x + Sp.w - 36, pxn = (x1 - x0) / 1.0, X = (l) => x0 + (l - (LAM0 - 0.5)) * pxn;
    const yRef = Sp.y + 56 * Math.min(FS, 1.15), hS = PHONE ? 64 : 56, yObs = yRef + hS + (PHONE ? 78 : 66);
    [[yRef, '실험실에서 잰 스펙트럼 (기준)'], [yObs, '별빛의 스펙트럼 (' + rdName() + ')']].forEach((q, i) => {
      const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#ffa23c'); g.addColorStop(0.5, '#ee3a1c'); g.addColorStop(1, '#a50f0f');
      ctx.fillStyle = g; rr(x0, q[0], x1 - x0, hS, 8).fill();
      T(x0, q[0] - 8, q[1], PHONE ? 12.5 : 13.5, '#334155', 'left', 800);
    });
    ctx.save(); rr(x0, yRef, x1 - x0, hS, 8); ctx.clip(); absLine(X(LAM0), yRef, hS, 1); ctx.restore();
    ctx.save(); rr(x0, yObs, x1 - x0, hS, 8); ctx.clip(); absLine(X(R.lam), yObs, hS, 1); ctx.restore();
    // 눈금 (nm)
    const ty = yObs + hS + 4;
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, ty); ctx.lineTo(x1, ty); ctx.stroke();
    for (let k = 0; k <= 20; k++) { const l = LAM0 - 0.5 + k * 0.05, x = X(l), h = k % 2 === 0 ? 7 : 4; ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x, ty + h); ctx.stroke(); if (k % 4 === 0) T(x, ty + 22, l.toFixed(2), 12, '#475569', 'center', 700); }
    T(x1, ty + 40, '파장 (nm)', 12, '#64748b', 'right', 800);
    // 기준선과 관측선을 잇는 점선, Δλ 화살표
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X(LAM0), yRef + hS); ctx.lineTo(X(LAM0), yObs + hS); ctx.stroke(); ctx.setLineDash([]);
    const dl = R.lam - LAM0, ay = (yRef + hS + yObs) / 2;
    if (Math.abs(dl) * pxn > 3) { D.arrow(X(LAM0), ay, X(R.lam), ay, { color: dl < 0 ? '#2563eb' : '#dc2626', width: 4, head: 10 }); }
    const lbl = 'Δλ = ' + f3s(LAM0 * vr / C_KMS) + ' nm' + (vr < -0.0001 ? '  (청색 편이)' : vr > 0.0001 ? '  (적색 편이)' : '');
    D.label(clamp((X(LAM0) + X(R.lam)) / 2, Sp.x + 120, Sp.x + Sp.w - 120), ay - 18, lbl, { bg: vr < 0 ? '#2563eb' : '#dc2626', size: PHONE ? 12 : 13.5 });
    T(X(R.lam), yObs - 2 + hS + 0, '', 1, '#000');
    // 아래: 별과 빛의 물결, 식
    const Bp = L.Bp;
    panel(Bp.x, Bp.y, Bp.w, Bp.h, { r: 14, title: '도플러 이동으로 시선 속도 구하기', tsize: PHONE ? 12.5 : 14 });
    R.vrs = approach(R.vrs, vr, dt, 6);
    const sx0 = Bp.x + 26, sw = PHONE ? Bp.w - 52 : 380, sy = Bp.y + (PHONE ? 118 : 120);
    // 관측자(지구) 왼쪽, 별 오른쪽
    D.sphere(sx0, sy, 11, '#3b82f6', { gloss: true }); T(sx0, sy + 30, '지구', 12.5, '#1d4ed8', 'center', 800);
    const star = vr < 0 ? Math.max(sx0 + 90, sx0 + sw - 70 - ((RM ? 0 : t) * Math.abs(vr) * 0.12) % (sw - 160)) : Math.min(sx0 + sw - 40, sx0 + 90 + ((RM ? 0 : t) * Math.abs(vr) * 0.12) % (sw - 160));
    const stx = Math.abs(vr) < 0.5 ? sx0 + sw - 70 : star, sc = STAR4[Math.min(R.sel, 3)];
    D.glow(stx, sy, 34, sc.c, 0.6); D.sphere(stx, sy, 14, sc.c, { gloss: true });
    if (Math.abs(vr) > 0.5) D.arrow(stx + (vr < 0 ? 20 : -20), sy - 30, stx + (vr < 0 ? -26 : 26), sy - 30, { color: vr < 0 ? '#2563eb' : '#dc2626', width: 4, head: 10 });
    T(stx, sy + 36, vr < 0 ? '다가오는 중' : vr > 0 ? '멀어지는 중' : '시선 방향 운동 없음', 12.5, vr < 0 ? '#2563eb' : '#dc2626', 'center', 800);
    // 빛의 물결 (파장을 과장해서 그림)
    const wl = 22 * (1 + R.vrs / C_KMS * 260);
    ctx.strokeStyle = vr < 0 ? '#3b82f6' : vr > 0 ? '#ef4444' : '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = sx0 + 24; x <= stx - 20; x += 2) { const y = sy + Math.sin((x - sx0) / wl * TAU - (RM ? 0 : t * 6)) * 8; if (x === sx0 + 24) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    T(sx0 + 24, sy - 22, '빛의 물결 (파장 변화는 과장했어요)', 11.5, '#64748b', 'left', 700);
    // 식
    const fx = PHONE ? Bp.x + 16 : Bp.x + 420, fy = PHONE ? Bp.y + 230 : Bp.y + 60, fw = PHONE ? Bp.w - 32 : Bp.w - 436;
    const show = S.flags.calcVr === false || R.ok || FREE();
    let y = fy;
    y = drawWrap(fx, y, 'v_r = c × Δλ / λ₀', fw, 15, { color: '#0369a1', weight: 800 }) + 24 * FS;
    y = drawWrap(fx, y, 'c = 299792 km/s,  λ₀ = 656.28 nm', fw, 13, { color: '#475569' }) + 22 * FS;
    y = drawWrap(fx, y, 'Δλ = λ관측 − λ₀ = ' + f3s(LAM0 * vr / C_KMS) + ' nm', fw, 13.5, { color: '#0f172a', weight: 800 }) + 22 * FS;
    y = drawWrap(fx, y, 'v_r = ' + (show ? f1s(vr) + ' km/s' : '? (계산해서 입력해요)') + (show && vr < 0 ? '  (접근)' : show && vr > 0 ? '  (후퇴)' : ''), fw, 14.5, { color: show ? '#15803d' : '#b45309', weight: 800 }) + 24 * FS;
    drawWrap(fx, y, '부호: 접근하면 − (파장이 짧아져 청색 편이), 멀어지면 + (적색 편이)', fw, 12.5, { color: '#475569' });
  }

  /* ================= ② 접선 속도: 두 해의 하늘 사진 ================= */
  function LTn() {
    return PHONE
      ? { Im: { x: 8, y: 8, w: 464, h: 330 }, Bp: { x: 8, y: 346, w: 464, h: 506 } }
      : { Im: { x: 10, y: 8, w: 780, h: 296 }, Bp: { x: 10, y: 312, w: 780, h: 300 } };
  }
  const tnStar = () => STAR4[S.tn.sel];
  function drawTan(dt, t) {
    const L = LTn(), N = S.tn, Im = L.Im, st = tnStar(), th = st.mu * N.dt;
    if (N.blink && !RM) { N.bt += dt; if (N.bt > 0.7) { N.bt = 0; N.ph = 1 - N.ph; } } else N.ph = 1;
    D.shadow(() => { ctx.fillStyle = '#0a1230'; rr(Im.x, Im.y, Im.w, Im.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(Im.x, Im.y, Im.w, Im.h, 14); ctx.clip();
    BGS.forEach((b) => { ctx.globalAlpha = b[3]; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(Im.x + b[0] * Im.w, Im.y + 40 + b[1] * (Im.h - 100), b[2], 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
    ctx.restore();
    // 눈금: 시야 −10″ ~ 130″
    const X = (a) => Im.x + 30 + (a + 10) / 140 * (Im.w - 60), ry = Im.y + Im.h - 38, yS = Im.y + Im.h * 0.46;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(-10), ry); ctx.lineTo(X(130), ry); ctx.stroke();
    for (let a = -10; a <= 130; a += 10) { const h = a % 50 === 0 ? 8 : 4; ctx.beginPath(); ctx.moveTo(X(a), ry - h); ctx.lineTo(X(a), ry + h); ctx.stroke(); if (a % 50 === 0 || a === 0) T(X(a), ry + 24, a + '″', 12, '#cbd5e1', 'center', 700); }
    T(Im.x + 14, Im.y + 24, '🔭 같은 하늘을 ' + N.dt + '년 간격으로 찍은 두 사진 (' + st.n + ')', PHONE ? 12.5 : 14, '#e2e8f0', 'left', 800);
    const xa = X(0), xb = X(th);
    const showA = !N.blink || N.ph === 0, showB = !N.blink || N.ph === 1;
    if (showA) { D.glow(xa, yS, 26, st.c, N.blink ? 0.7 : 0.35); D.sphere(xa, yS, 8, st.c, { gloss: true }); if (!N.blink) { ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(xa, yS, 15, 0, TAU); ctx.stroke(); } T(xa, yS - 26, '2000년', 12.5, '#7dd3fc', 'center', 800); }
    if (showB) { D.glow(xb, yS, 26, st.c, 0.7); D.sphere(xb, yS, 8, st.c, { gloss: true }); T(xb, yS - 26, (2000 + N.dt) + '년', 12.5, '#fde68a', 'center', 800); }
    if (!N.blink && th > 0) {
      const yy = yS + 40;
      ctx.strokeStyle = '#f87171'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(xb, yy); ctx.stroke();
      ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xa, yS + 16); ctx.lineTo(xa, yy); ctx.moveTo(xb, yS + 16); ctx.lineTo(xb, yy); ctx.stroke(); ctx.setLineDash([]);
      D.label(clamp((xa + xb) / 2, Im.x + 90, Im.x + Im.w - 90), yy + 24, '이동 각 θ = ' + f1(th) + '″', { bg: '#dc2626', size: PHONE ? 12 : 13.5 });
    }
    if (N.blink) D.label(Im.x + Im.w - 14, Im.y + 24, '👁 깜박이는 중: 별이 어디로 움직이나요?', { bg: '#7c3aed', size: 12, align: 'right' });
    // 아래: 계산표
    const Bp = L.Bp;
    panel(Bp.x, Bp.y, Bp.w, Bp.h, { r: 14, title: '📋 스프레드시트: 고유 운동 μ와 접선 속도 v_t', tsize: PHONE ? 12.5 : 14 });
    const x0 = Bp.x + 12, w = Bp.w - 24, hy = Bp.y + 36 * Math.min(FS, 1.2);
    const cw = PHONE ? [0.3, 0.17, 0.17, 0.17, 0.19] : [0.22, 0.17, 0.17, 0.17, 0.27];
    let cx = x0; const cxs = cw.map((c) => { const o = cx + c * w / 2; cx += c * w; return o; });
    ctx.fillStyle = '#e2e8f0'; rr(x0, hy, w, PHONE ? 38 : 26, 6).fill();
    const hd = PHONE ? [['별'], ['μ', '(″/년)'], ['p', '(″)'], ['d', '(pc)'], ['v_t', '(km/s)']] : [['별'], ['μ (″/년)'], ['p (″)'], ['d = 1/p (pc)'], ['v_t = 4.74 μ d (km/s)']];
    hd.forEach((h, i) => h.forEach((s, k) => T(cxs[i], hy + 17 + k * 15, s, PHONE ? 11.5 : 12, '#334155', 'center', 800)));
    const rh = PHONE ? 34 : 32;
    STAR4.forEach((s, i) => {
      const y = hy + (PHONE ? 44 : 32) + i * rh, cur = i === N.sel;
      if (cur) { ctx.fillStyle = 'rgba(14,165,233,.12)'; rr(x0, y, w, rh - 2, 6).fill(); }
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y + rh - 1); ctx.lineTo(x0 + w, y + rh - 1); ctx.stroke();
      const cy_ = y + rh / 2 + 5, sz = PHONE ? 12 : 13;
      T(cxs[0], cy_, s.n, PHONE ? 11.5 : 13, '#0f172a', 'center', 800); T(cxs[1], cy_, s.mu.toFixed(3), sz, '#0f172a', 'center', 800); T(cxs[2], cy_, s.p.toFixed(4), sz, '#0f172a', 'center', 800); T(cxs[3], cy_, f2(s.d), sz, '#0f172a', 'center', 800);
      const rev = S.flags.showVt || FREE() || (cur && N.ok);
      T(cxs[4], cy_, rev ? f1(s.vt) : '?', sz, rev ? '#15803d' : '#f59e0b', 'center', 800);
    });
    let y = hy + (PHONE ? 44 : 32) + 4 * rh + 18 * FS;
    y = drawWrap(x0 + 4, y, '고유 운동 μ = 이동 각 θ / 시간 간격 Δt = ' + f1(th) + '″ / ' + N.dt + '년 = ' + f3(st.mu) + '″/년 (선택한 별: ' + st.n + ')', w - 8, PHONE ? 12.5 : 13.5, { color: '#0369a1', weight: 800 }) + 22 * FS;
    y = drawWrap(x0 + 4, y, '접선 속도 v_t(km/s) = 4.74 × μ(″/년) × d(pc)  (1 AU/년 = 4.74 km/s)', w - 8, PHONE ? 12.5 : 13.5, { color: '#334155', weight: 800 }) + 22 * FS;
    if (S.flags.showVt || FREE()) drawWrap(x0 + 4, y, '시리우스 μ(1.339″)가 베가(0.35″)보다 4배쯤 크지만, v_t는 ' + f1(STAR4[1].vt) + ' km/s와 ' + f1(STAR4[3].vt) + ' km/s로 비슷해요: 거리가 다르기 때문이에요.', w - 8, PHONE ? 12.5 : 13.5, { color: '#b45309', weight: 800 });
  }

  /* ================= ③ 공간 운동: v_r + v_t → v, 바너드별의 최근접 ================= */
  function LVc() {
    return PHONE
      ? { Vc: { x: 8, y: 8, w: 464, h: 300 }, Pa: { x: 8, y: 316, w: 464, h: 300 }, Ch: { x: 8, y: 624, w: 464, h: 228 } }
      : { Vc: { x: 10, y: 8, w: 390, h: 300 }, Pa: { x: 408, y: 8, w: 382, h: 300 }, Ch: { x: 10, y: 316, w: 780, h: 296 } };
  }
  const vcStar = () => BAR;
  function drawVec(dt, t) {
    const L = LVc(), V = S.vc, st = BAR;
    V.ts = approach(V.ts, V.t, dt, 10);
    // 위 왼쪽: 속도 화살표 합성
    const A = L.Vc;
    panel(A.x, A.y, A.w, A.h, { r: 14, title: '시선 속도 + 접선 속도 = 공간 속도', tsize: PHONE ? 12.5 : 14 });
    const k = (A.h - 120) / 150, ox = A.x + A.w * 0.34, oy = A.y + 56 * Math.min(FS, 1.15) + 20;   // 별의 현재 위치(시작점)
    const vrp = Math.abs(st.vr) * k, vtp = st.vt * k;
    // 시선: 아래쪽이 지구
    ctx.setLineDash([5, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ox, oy - 12); ctx.lineTo(ox, A.y + A.h - 30); ctx.stroke(); ctx.setLineDash([]);
    T(ox - 8, A.y + A.h - 14, '↓ 지구 쪽 (시선 방향)', 12, '#64748b', 'left', 800);
    D.glow(ox, oy, 22, st.c, 0.6); D.sphere(ox, oy, 8, st.c, { gloss: true });
    D.arrow(ox, oy, ox, oy + vrp, { color: '#2563eb', width: 4, head: 11 });
    D.arrow(ox, oy, ox + vtp, oy, { color: '#16a34a', width: 4, head: 11 });
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(100,116,139,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ox + vtp, oy); ctx.lineTo(ox + vtp, oy + vrp); ctx.moveTo(ox, oy + vrp); ctx.lineTo(ox + vtp, oy + vrp); ctx.stroke(); ctx.setLineDash([]);
    D.arrow(ox, oy, ox + vtp, oy + vrp, { color: '#dc2626', width: 5, head: 13 });
    const thr = Math.atan2(vtp, vrp);
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ox, oy, 40, Math.PI / 2 - thr, Math.PI / 2); ctx.stroke();
    T(ox + 14, oy + 66, 'θ', 14, '#b45309', 'left', 800);
    T(ox - 10, oy + vrp / 2 + 4, 'v_r', 13.5, '#2563eb', 'right', 800); T(ox + vtp / 2, oy - 10, 'v_t', 13.5, '#16a34a', 'center', 800); T(ox + vtp / 2 + 8, oy + vrp / 2 + 18, 'v', 14, '#dc2626', 'left', 800);
    const lx = A.x + A.w - 12; let ly = A.y + 56 * Math.min(FS, 1.15);
    T(lx, ly, 'v_r = ' + f1s(st.vr) + ' km/s (접근)', PHONE ? 11.5 : 12.5, '#2563eb', 'right', 800); ly += 20 * Math.min(FS, 1.2);
    T(lx, ly, 'v_t = ' + f1(st.vt) + ' km/s', PHONE ? 11.5 : 12.5, '#16a34a', 'right', 800); ly += 20 * Math.min(FS, 1.2);
    T(lx, ly, 'v = ' + (V.vOk || FREE() ? f1(st.v) + ' km/s' : '?'), PHONE ? 11.5 : 12.5, '#dc2626', 'right', 800); ly += 20 * Math.min(FS, 1.2);
    T(lx, ly, 'θ = ' + (V.vOk || FREE() ? f1(st.th) + '°' : '?'), PHONE ? 11.5 : 12.5, '#b45309', 'right', 800);
    // 위 오른쪽: 평면 경로 (위에서 본 모습)
    const P = L.Pa;
    panel(P.x, P.y, P.w, P.h, { r: 14, title: PHONE ? '바너드별의 경로 (위에서 본 모습)' : '바너드별의 경로 (위에서 본 모습, 단위 pc)', tsize: PHONE ? 12.5 : 14 });
    const sc = (P.h - 100) / 2.5, px0 = P.x + 44, py0 = P.y + P.h - 60 - 0.5 * sc;          // 관측자(0,0)의 화면 위치: y = 0.5 pc 위쪽 여유
    const PX = (x) => px0 + x * sc, PY = (y) => py0 - y * sc;
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; for (let g = 0; g <= 2; g++) { ctx.beginPath(); ctx.moveTo(PX(g), PY(-0.5)); ctx.lineTo(PX(g), PY(2.0)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(PX(-0.1), PY(g)); ctx.lineTo(PX(2.1), PY(g)); ctx.stroke(); T(PX(g), PY(-0.5) + 14, g + ' pc', 11.5, '#94a3b8', 'center', 700); }
    // 경로 (0 ~ 20000년)
    const pts = []; for (let i = 0; i <= 40; i++) { const tt = i / 40 * 20000; pts.push([PX(st.vt * KMS_PC_YR * tt), PY(st.d + st.vr * KMS_PC_YR * tt)]); }
    ctx.setLineDash([5, 5]); line(pts, '#94a3b8', 2.5); ctx.setLineDash([]);
    const tt = V.ts, bx = st.vt * KMS_PC_YR * tt, by = st.d + st.vr * KMS_PC_YR * tt;
    line(pts.filter((q, i) => i / 40 * 20000 <= tt + 1), '#dc2626', 3.5);
    // 최근접 원호
    ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(14,165,233,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(PX(0), PY(0), barMin * sc, Math.PI * 0.05, Math.PI * 0.5); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(PX(0), PY(0), 8, '#3b82f6', { gloss: true }); T(PX(0) + 12, PY(0) + 18, '지구', 12, '#1d4ed8', 'left', 800);
    ctx.strokeStyle = 'rgba(15,23,42,.5)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(PX(0), PY(0)); ctx.lineTo(PX(bx), PY(by)); ctx.stroke();
    D.glow(PX(bx), PY(by), 20, st.c, 0.7); D.sphere(PX(bx), PY(by), 7, st.c, { gloss: true });
    D.label(clamp(PX(bx) + 8, P.x + 80, P.x + P.w - 70), clamp(PY(by) - 20, P.y + 44, P.y + P.h - 20), 'd = ' + f2(Math.hypot(bx, by)) + ' pc', { bg: '#0f172a', size: PHONE ? 11.5 : 12.5 });
    T(P.x + 12, P.y + P.h - 10, '출발 d = ' + f2(st.d) + ' pc (0년)', 11.5, '#64748b', 'left', 700);
    // 아래: d(t) 그래프
    const C = L.Ch;
    panel(C.x, C.y, C.w, C.h, { r: 14, title: '시간에 따른 지구–바너드별 거리 d(t)', tsize: PHONE ? 12.5 : 14 });
    const gx0 = C.x + 52, gx1 = C.x + C.w - 18, gy0 = C.y + 52 * Math.min(FS, 1.1), gy1 = C.y + C.h - 52, GX = (tt_) => gx0 + tt_ / 20000 * (gx1 - gx0), GY = (d) => gy1 - (d - 0.8) / 1.3 * (gy1 - gy0);
    for (let d = 1; d <= 2; d += 0.5) { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, GY(d)); ctx.lineTo(gx1, GY(d)); ctx.stroke(); T(gx0 - 6, GY(d) + 4, f1(d), 12, '#64748b', 'right', 700); }
    for (let k2 = 0; k2 <= 20000; k2 += 5000) { ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(GX(k2), gy0); ctx.lineTo(GX(k2), gy1); ctx.stroke(); T(GX(k2), gy1 + 17, comma(k2), 12, '#64748b', 'center', 700); }
    T((gx0 + gx1) / 2, gy1 + 36, '지금부터 흐른 시간 (년)', 12.5, '#475569', 'center', 800); T(gx0 - 44, gy0 - 12, '거리 (pc)', 12.5, '#475569', 'left', 800);
    const cp = []; for (let i = 0; i <= 100; i++) { const t_ = i / 100 * 20000; cp.push([GX(t_), GY(barDist(t_))]); } line(cp, '#2563eb', 3.5);
    const m1 = [GX(barTmin), GY(barMin)];
    if (V.dmOk || FREE()) { D.sphere(m1[0], m1[1], 6, '#16a34a', { gloss: false }); D.label(clamp(m1[0], C.x + 150, C.x + C.w - 150), m1[1] + 28, '최근접: 약 ' + f0(Math.round(barTmin / 100) * 100) + '년 뒤, ' + f2(barMin) + ' pc', { bg: '#15803d', size: PHONE ? 11.5 : 12.5 }); }
    const cxp = GX(tt), cyp = GY(barDist(tt));
    ctx.setLineDash([4, 4]); line([[cxp, gy1], [cxp, cyp]], 'rgba(220,38,38,.6)', 1.6); ctx.setLineDash([]); D.sphere(cxp, cyp, 7, '#dc2626', { gloss: true });
    T(C.x + C.w - 14, C.y + 26, '지금 ' + comma(Math.round(tt / 100) * 100) + '년 뒤: d = ' + f2(barDist(tt)) + ' pc', PHONE ? 12 : 13.5, '#dc2626', 'right', 800);
  }

  /* ================= ④ 별자리: 회전하는 3차원 점 도표 ================= */
  function LCn() {
    return PHONE
      ? { Pl: { x: 8, y: 8, w: 464, h: 470 }, Ib: { x: 8, y: 486, w: 464, h: 366 } }
      : { Pl: { x: 10, y: 8, w: 780, h: 448 }, Ib: { x: 10, y: 464, w: 780, h: 148 } };
  }
  const cnDS = () => DS[S.cn.ds];
  /* 별의 (x, y, z) 상자 좌표(px) — 동서·남북은 같은 각도 눈금, 깊이는 거리 눈금 */
  function cnGeom() {
    const L = LCn(), P = L.Pl, ds = cnDS(), sA = Math.min((P.w / 2 - (PHONE ? 40 : 90)) / ds.rx, (P.h / 2 - 64) / ds.ry), Hz = Math.min(P.w / 2 - (PHONE ? 40 : 90), (P.h / 2 - 64)) * (PHONE ? 0.8 : 0.9);
    return { P, ds, sA, Hx: ds.rx * sA, Hy: ds.ry * sA, Hz, cx: P.x + P.w / 2, cy: P.y + P.h / 2 + 12, zm: (ds.z0 + ds.z1) / 2 };
  }
  function cnPos(s, t) {
    const G = cnGeom(), ds = G.ds;
    const dx = s.dx + (ds.pm ? s.pe * t / 3.6e6 : 0), dy = s.dy + (ds.pm ? s.pn * t / 3.6e6 : 0);
    return { x: -dx * G.sA, y: dy * G.sA, z: (s.d - G.zm) / ((ds.z1 - ds.z0) / 2) * G.Hz };
  }
  function cnProj(q, yawDeg) {
    const G = cnGeom(), c = Math.cos(yawDeg * DEG), s = Math.sin(yawDeg * DEG);
    return { sx: G.cx + q.x * c + q.z * s, sy: G.cy - q.y, w: -q.x * s + q.z * c };
  }
  function drawCon(dt, t) {
    const Cn = S.cn, G = cnGeom(), P = G.P, ds = G.ds;
    Cn.ys = approach(Cn.ys, Cn.yaw, dt, 9); Cn.ts = approach(Cn.ts, Cn.t, dt, 8);
    Cn.yawMax = Math.max(Cn.yawMax, Cn.yaw);
    D.shadow(() => { ctx.fillStyle = '#0a1230'; rr(P.x, P.y, P.w, P.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14); ctx.clip();
    BGS.forEach((b) => { ctx.globalAlpha = b[3] * 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(P.x + b[0] * P.w, P.y + b[1] * P.h, b[2], 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
    // 상자 (12개 모서리)
    const cs = []; for (let i = 0; i < 8; i++) cs.push({ x: (i & 1 ? 1 : -1) * G.Hx, y: (i & 2 ? 1 : -1) * G.Hy, z: (i & 4 ? 1 : -1) * G.Hz });
    const pc = cs.map((q) => cnProj(q, Cn.ys));
    [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach((e) => { const a = pc[e[0]], b = pc[e[1]], w = (a.w + b.w) / 2; ctx.strokeStyle = 'rgba(148,163,184,' + (0.25 + 0.3 * (1 - (w + G.Hz) / (2 * G.Hz + 1))) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke(); });
    // 바닥 눈금: 깊이 표시용 지구 방향
    const earth = cnProj({ x: 0, y: -G.Hy, z: -G.Hz - 14 }, Cn.ys); T(earth.sx, earth.sy + 4, '🌍 지구쪽', 12, '#7dd3fc', 'center', 800);
    // 별
    const items = ds.st.map((s, i) => { const q0 = cnPos(s, 0), q = cnPos(s, ds.pm ? Cn.ts : 0), p = cnProj(q, Cn.ys), p0 = cnProj(q0, Cn.ys), pf = cnProj(q, Cn.ys); return { s, i, q, p, p0, qf: cnPos(s, 100000) }; });
    items.sort((a, b) => a.p.w - b.p.w);
    items.forEach((it) => {
      const s = it.s, p = it.p, floor = cnProj({ x: it.q.x, y: -G.Hy, z: it.q.z }, Cn.ys), dep = clamp((p.w + G.Hz) / (2 * G.Hz), 0, 1), r = 5.5 + 3.5 * dep, sel = Cn.sel.has(it.i);
      ctx.strokeStyle = 'rgba(148,163,184,.28)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(floor.sx, floor.sy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(148,163,184,.4)'; ctx.beginPath(); ctx.ellipse(floor.sx, floor.sy, 4, 2, 0, 0, TAU); ctx.fill();
      if (ds.pm && Math.abs(Cn.ts) > 500) { const a = it.p0; ctx.strokeStyle = 'rgba(253,224,71,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(p.sx, p.sy); ctx.stroke(); ctx.fillStyle = 'rgba(253,224,71,.4)'; ctx.beginPath(); ctx.arc(a.sx, a.sy, 3.5, 0, TAU); ctx.fill(); }
      if (ds.pm && Cn.arrows) { const f = cnProj(it.qf, Cn.ys); D.arrow(p.sx, p.sy, p.sx + (f.sx - p.sx), p.sy + (f.sy - p.sy), { color: s.grp ? '#4ade80' : '#fb923c', width: 2.5, head: 8 }); }
      D.glow(p.sx, p.sy, r * 3.6, '#fde68a', 0.25 + 0.4 * dep); D.sphere(p.sx, p.sy, r, sel ? '#fbbf24' : '#e0f2fe', { gloss: true });
      if (sel) { ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.sx, p.sy, r + 6, 0, TAU); ctx.stroke(); }
      T(p.sx + r + 5, p.sy - r - 2, s.n, 12, sel ? '#86efac' : '#e2e8f0', 'left', 800, { stroke: 'rgba(5,10,30,.8)', strokeWidth: 3 });
    });
    ctx.restore();
    T(P.x + 14, P.y + 24, ds.name + ' · 시점 ' + f0(Cn.ys) + '° ' + (Cn.ys < 12 ? '(하늘에서 본 모습)' : Cn.ys > 78 ? '(옆에서 본 모습)' : ''), PHONE ? 12.5 : 14, '#e2e8f0', 'left', 800);
    T(P.x + 14, P.y + P.h - 14, '가로·세로: 하늘에서의 각도(동서 ±' + ds.rx + '°, 남북 ±' + ds.ry + '°) · 깊이: 거리 ' + ds.z0 + ' ~ ' + ds.z1 + ' pc', PHONE ? 10.5 : 12, '#94a3b8', 'left', 700);
    if (ds.pm) D.label(P.x + P.w - 14, P.y + 24, '시간 ' + (Cn.ts >= 0 ? '+' : '−') + comma(Math.abs(Math.round(Cn.ts / 1000) * 1000)) + '년', { bg: '#7c3aed', size: PHONE ? 11.5 : 12.5, align: 'right' });
    else D.label(P.x + P.w - 14, P.y + 24, '이 자료는 고유 운동이 없어요', { bg: '#475569', size: PHONE ? 11.5 : 12.5, align: 'right' });
    // 정보 표
    const Ib = LCn().Ib;
    panel(Ib.x, Ib.y, Ib.w, Ib.h, { r: 14, title: ds.pm ? '별 7개 (눌러서 고르기): 거리 · 접선 속도 · 움직이는 방향' : '별 7개: 거리 (더 흩어져 있어요)', tsize: PHONE ? 12 : 13.5 });
    const rows = ds.st.length, two = !PHONE, rh = PHONE ? 38 : 24, yy0 = Ib.y + 34 * Math.min(FS, 1.15);
    ds.st.forEach((s, i) => {
      const col = two ? (i < 4 ? 0 : 1) : 0, row = two ? (i < 4 ? i : i - 4) : i, w = two ? Ib.w / 2 - 14 : Ib.w - 24, x = Ib.x + 10 + col * (Ib.w / 2), y = yy0 + row * rh, sel = S.cn.sel.has(i);
      ctx.fillStyle = sel ? 'rgba(34,197,94,.18)' : '#f8fafc'; rr(x, y, w, rh - 3, 7).fill(); ctx.strokeStyle = sel ? '#22c55e' : '#e2e8f0'; ctx.lineWidth = sel ? 2.5 : 1; rr(x, y, w, rh - 3, 7).stroke();
      const dir = ds.pm ? (s.pe > 0 ? '← 동쪽(왼쪽)으로' : '→ 서쪽(오른쪽)으로') : '';
      T(x + 10, y + rh / 2 + 4, (sel ? '☑ ' : '☐ ') + s.n, PHONE ? 12.5 : 12.5, '#0f172a', 'left', 800);
      T(x + (PHONE ? 130 : 108), y + rh / 2 + 4, f1(s.d) + ' pc', PHONE ? 12 : 12.5, '#0369a1', 'left', 800);
      if (ds.pm) { T(x + (PHONE ? 215 : 178), y + rh / 2 + 4, 'v_t ' + f1(s.vt), PHONE ? 12 : 12.5, '#334155', 'left', 800); T(x + (PHONE ? 300 : 250), y + rh / 2 + 4, dir.replace(' 동쪽(왼쪽)으로', ' 동').replace(' 서쪽(오른쪽)으로', ' 서'), PHONE ? 12 : 12.5, s.pe > 0 ? '#16a34a' : '#ea580c', 'left', 800); }
    });
  }
  function cnHitStar(p) {
    const G = cnGeom(), ds = G.ds; let best = -1, bd = 22;
    ds.st.forEach((s, i) => { const q = cnPos(s, ds.pm ? S.cn.ts : 0), pr = cnProj(q, S.cn.ys), d = Math.hypot(p.x - pr.sx, p.y - pr.sy); if (d < bd) { bd = d; best = i; } });
    return best;
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
  const numM = (id) => { const e = $('#' + id); if (!e) return null; const v = e.value.trim().replace('−', '-').replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'); return v === '' || !isFinite(+v) ? null : +v; };
  const tFmt = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + comma(Math.abs(v)) + '년';
  function setT(v) { S.cn.t = clamp(v, -100000, 100000); const s = $('#sTm'); if (s) setSlider(s, $('#oTm'), S.cn.t, tFmt); }
  function setYaw(v) { S.cn.yaw = clamp(v, 0, 90); const s = $('#sYaw'); if (s) setSlider(s, $('#oYaw'), Math.round(S.cn.yaw), (x) => x + '°'); }
  function setTv(v) { S.vc.t = clamp(v, 0, 20000); const s = $('#sTv'); if (s) setSlider(s, $('#oTv'), S.vc.t, (x) => comma(x) + '년'); }
  function updateCtl() {
    const free = FREE();
    const list = free ? ['rad', 'tan', 'vec', 'con'] : viewList;
    if (modeSeg.children.length !== list.length || Array.from(modeSeg.children).some((b, i) => b.dataset.view !== list[i])) { viewList = list; buildSeg(); }
    modeSeg.hidden = list.length < 2;
    modeBtns().forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    if (list.indexOf(S.view) < 0) { S.view = list[0]; S.fade = 1; }
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcVr').hidden = !(S.view === 'rad' && (S.flags.calcVr || free));
    $('#vcusBox').hidden = !(S.view === 'rad' && S.rd.sel === 4);
    $('#calcVt').hidden = !(S.view === 'tan' && (S.flags.calcVt || free));
    $('#calcV').hidden = !(S.view === 'vec' && (S.flags.calcV || free));
    $('#calcDm').hidden = !(S.view === 'vec' && (S.flags.calcDm || free));
    $$('#grpRd .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.rd.sel));
    $$('#grpTn .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.tn.sel));
    $$('#grpDs .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === S.cn.ds));
    $('#bBlink').classList.toggle('on', S.tn.blink); $('#bBlink').textContent = S.tn.blink ? '👁 깜박이기 끄기' : '👁 두 사진 깜박이기';
    $('#bArrow').classList.toggle('on', S.cn.arrows); $('#bArrow').textContent = S.cn.arrows ? '➡ 운동 화살표 끄기' : '➡ 운동 화살표 켜기';
    $('#sTm').disabled = !cnDS().pm;
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
  }
  sl('#sVc', '#oVc', (v) => f0(v) + ' km/s', (v) => { S.rd.vcus = v; });
  sl('#sDt', '#oDt', (v) => v + '년', (v) => { S.tn.dt = v; });
  sl('#sTv', '#oTv', (v) => comma(v) + '년', (v) => { S.vc.t = v; });
  sl('#sYaw', '#oYaw', (v) => v + '°', (v) => { S.cn.yaw = v; });
  sl('#sTm', '#oTm', tFmt, (v) => { S.cn.t = v; });
  $$('#grpRd .opt').forEach((b) => clickable(b, () => { S.rd.sel = +b.dataset.k; S.rd.ok = false; clrIn('inVr'); updateCtl(); }));
  $$('#grpTn .opt').forEach((b) => clickable(b, () => { S.tn.sel = +b.dataset.k; S.tn.ok = false; clrIn('inVt'); updateCtl(); }));
  $$('#grpDs .opt').forEach((b) => clickable(b, () => { S.cn.ds = b.dataset.k; S.cn.sel = new Set(); S.cn.grpOk = false; if (!cnDS().pm) setT(0); updateCtl(); }));
  clickable($('#bBlink'), () => { S.tn.blink = !S.tn.blink; S.tn.bt = 0; S.tn.ph = 0; updateCtl(); });
  clickable($('#bArrow'), () => { S.cn.arrows = !S.cn.arrows; updateCtl(); });
  clickable($('#bSky'), () => setYaw(0));
  clickable($('#bSide'), () => setYaw(90));
  $('#inVr').addEventListener('input', () => { const v = numM('inVr'); if (v != null && S.rd.sel === 0 && near(v, BAR.vr, 1.5)) { S.rd.ok = true; fbIn('inVr', true); } });
  $('#inVt').addEventListener('input', () => { const v = numM('inVt'); if (v != null && S.tn.sel === 0 && near(v, BAR.vt, 2.5)) { S.tn.ok = true; fbIn('inVt', true); } });
  $('#inV').addEventListener('input', () => { const v = numM('inV'); if (v != null && near(v, BAR.v, 1.5)) { S.vc.vOk = true; fbIn('inV', true); } });
  $('#inDm').addEventListener('input', () => { const v = numM('inDm'); if (v != null && near(v, barMin, 0.05)) { S.vc.dmOk = true; fbIn('inDm', true); } });

  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'con') {
        const L = LCn(), P = L.Pl, Ib = L.Ib, ds = cnDS();
        if (p.x >= P.x && p.x <= P.x + P.w && p.y >= P.y && p.y <= P.y + P.h) {
          const i = cnHitStar(p);
          if (i >= 0) { if (S.cn.sel.has(i)) S.cn.sel.delete(i); else S.cn.sel.add(i); Sound.click(); S.cn.grpOk = false; return false; }
          S.cn.drag = { x: p.x, yaw: S.cn.yaw }; return true;
        }
        if (p.x >= Ib.x && p.x <= Ib.x + Ib.w && p.y >= Ib.y + 30 && p.y <= Ib.y + Ib.h) {
          const rh = PHONE ? 38 : 24, yy0 = Ib.y + 34 * Math.min(FS, 1.15);
          ds.st.forEach((s, i) => { const col = PHONE ? 0 : (i < 4 ? 0 : 1), row = PHONE ? i : (i < 4 ? i : i - 4), x = Ib.x + 10 + col * (PHONE ? 0 : Ib.w / 2), w = PHONE ? Ib.w - 24 : Ib.w / 2 - 14, y = yy0 + row * rh; if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + rh - 3) { if (S.cn.sel.has(i)) S.cn.sel.delete(i); else S.cn.sel.add(i); Sound.click(); } });
        }
      }
      return false;
    },
    move(p) { const d = S.cn.drag; if (d) setYaw(d.yaw + (p.x - d.x) * 0.3); },
    up() { S.cn.drag = null; },
    hover(p) { if (S.view === 'con') { const P = LCn().Pl; return cnHitStar(p) >= 0 ? 'pointer' : p.x >= P.x && p.x <= P.x + P.w && p.y >= P.y && p.y <= P.y + P.h ? 'ew-resize' : ''; } return ''; },
  });

  /* ================= 미션 ================= */
  const GRP = [1, 2, 3, 4, 5];
  const grpOK = () => { const s = S.cn.sel; return s.size === 5 && GRP.every((i) => s.has(i)); };
  const levels = [
    {
      title: '시선 속도: 스펙트럼선으로 속도 재기', short: '시선 속도', icon: '🌈', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 별은 어느 방향으로 얼마나 빠르게 움직이고, 별자리 모양은 영원할까?</p>' +
        '<div class="si-link">🔗 <b>일반선택 지구과학의 허블 법칙</b>에서 스펙트럼선의 이동 Δλ/λ = v/c를 배웠고, <b>역학과 에너지의 도플러 효과</b>도 배웠어요. 또 <b>별까지의 거리</b>에서 d = 1/p를 구했어요. 이번에는 별빛으로 별의 <b>운동</b>을 알아내요.</div>' +
        '<p>별의 운동은 우리 시선 방향의 <b>시선 속도 v_r</b>과 시선에 수직인 <b>접선 속도 v_t</b>로 나눌 수 있어요. 먼저 스펙트럼선의 이동으로 v_r을 구해요: <b>v_r = c × Δλ / λ₀</b> (접근하면 −, 멀어지면 +).</p>',
      features: ['rad'],
      setup() { S.rd.sel = 0; S.rd.ok = false; S.flags.calcVr = false; clrIn('inVr'); setViews(['rad']); setView('rad'); },
      recap: '스펙트럼선의 이동 Δλ로 v_r = c Δλ / λ₀를 구해요. 청색 편이(−)이면 별이 다가오고, 적색 편이(+)이면 멀어져요.',
      summary: '<ul><li><b>시선 속도</b> v_r = c × Δλ / λ₀ (c = 299792 km/s). 접근하면 파장이 짧아져 <b>청색 편이(v_r &lt; 0)</b>, 멀어지면 <b>적색 편이(v_r &gt; 0)</b>.</li><li>바너드별: Hα(λ₀ = 656.28 nm)가 Δλ = −0.242 nm 이동 → v_r = 299792 × (−0.242) / 656.28 ≈ <b>−110.5 km/s</b>(접근).</li><li>청색 편이는 별이 푸르다는 뜻이 아니라 <b>스펙트럼선이 파란 쪽으로 이동</b>한 것이에요.</li></ul>',
      missions: [
        {
          title: '바너드별의 시선 속도 계산하기',
          goal: '<b>바너드별</b>을 고르고 Hα 흡수선의 이동량 Δλ를 읽어, <b>v_r = c × Δλ / λ₀</b>를 계산해 입력하세요 (km/s, 접근이면 −).',
          hint: 'Δλ = −0.242 nm이므로 v_r = 299792 × (−0.242) / 656.28 ≈ −110.5예요. 접근하는 별이라 부호가 −예요.',
          setup() { S.rd.sel = 0; S.flags.calcVr = true; S.rd.ok = false; clrIn('inVr'); setView('rad'); updateCtl(); },
          check: () => S.rd.sel === 0 && S.rd.ok,
          hold: 0.7,
          status: () => mark(S.rd.sel === 0) + ' 바너드별 &nbsp; ' + mark(S.rd.ok) + ' v_r ' + ($('#inVr').value.trim() || '—') + ' km/s',
          explain: 'v_r = 299792 × (−0.242) / 656.28 ≈ <b>−110.5 km/s</b>이에요. 부호가 −이므로 바너드별은 초속 약 110 km로 우리에게 <b>다가오고</b> 있어요.',
        },
        {
          type: 'quiz', title: '청색 편이의 뜻',
          goal: '별의 스펙트럼선이 파란 쪽으로 이동하는 <b>청색 편이</b>가 나타났어요. 이것은 무엇을 뜻할까요?',
          setup() { setView('rad'); },
          choices: ['별이 우리 쪽으로 다가오고 있어요', '별이 푸른색(표면 온도가 높은 별)이에요', '별이 우리에게서 멀어지고 있어요', '별이 시선과 수직으로 움직이고 있어요'],
          answer: 0,
          feedback: ['', '별의 색과 스펙트럼선의 이동은 다른 거예요. 선이 파란 쪽으로 옮겨진 것이 청색 편이예요.', '멀어지면 파장이 길어져 적색 편이가 나타나요.', '시선에 수직인 운동(접선 속도)은 도플러 이동을 만들지 않아요.'],
          explain: '다가오는 별의 빛은 파장이 짧아져(<b>청색 편이</b>) v_r이 −예요. 별의 색과는 관계없어요. 시선에 수직인 운동은 스펙트럼선을 이동시키지 못해서 다른 방법(고유 운동)으로 재요.',
        },
      ],
    },
    {
      title: '접선 속도: 고유 운동으로 속도 재기', short: '접선 속도', icon: '🔭', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 시선 방향의 속도 v_r을 구했어요. 하지만 시선에 수직인 방향의 운동은 스펙트럼선으로 알 수 없어요. 몇 해 간격의 하늘 사진에서 별이 <b>조금씩 움직인 각</b>(고유 운동 μ)을 재고, <b>거리</b>(d = 1/p)를 알면 속도로 바꿀 수 있어요.</div>' +
        '<p>두 사진을 겹치거나 깜박여서 별이 움직인 각 θ를 재면 <b>μ = θ / Δt</b>예요. 접선 속도는 <b>v_t = 4.74 × μ(″/년) × d(pc)</b> (km/s)예요. (1 AU/년 = 4.74 km/s)</p>',
      features: ['tan'],
      setup() { S.tn.sel = 0; S.tn.dt = 5; S.tn.blink = false; S.tn.ok = false; S.flags.calcVt = false; S.flags.showVt = false; clrIn('inVt'); setSlider($('#sDt'), $('#oDt'), 5, (v) => v + '년'); setViews(['tan']); setView('tan'); },
      recap: '고유 운동 μ(″/년)와 거리 d(pc)로 v_t = 4.74 μ d를 구해요. μ가 크다고 반드시 빠른 별은 아니에요: 가까워서 크게 보일 수 있어요.',
      summary: '<ul><li><b>고유 운동 μ</b>: 하늘에서 별이 1년 동안 움직이는 각(″/년). μ = θ / Δt.</li><li><b>접선 속도</b> v_t(km/s) = <b>4.74 × μ × d</b> (μ: ″/년, d: pc). 바너드별 μ = 10.358″/년, d = 1.83 pc → v_t ≈ <b>89.8 km/s</b>(약 90).</li><li>시리우스 μ = 1.339″/년 &gt; 베가 0.35″/년이지만 v_t는 16.7 vs 12.7 km/s로 비슷해요 — 고유 운동이 큰 것은 <b>가깝기</b> 때문일 수 있어요.</li></ul>',
      missions: [
        {
          title: '바너드별의 접선 속도 계산하기',
          goal: '바너드별의 고유 운동 <b>μ = 10.358″/년</b>, 거리 <b>d = 1.83 pc</b>로 <b>v_t = 4.74 × μ × d</b>를 계산해 입력하세요 (km/s). 두 사진도 깜박여 보세요.',
          hint: '4.74 × 10.358 × 1.83 ≈ 89.9예요. 약 90 km/s예요.',
          setup() { S.tn.sel = 0; S.flags.calcVt = true; S.tn.ok = false; clrIn('inVt'); setView('tan'); updateCtl(); },
          check: () => S.tn.sel === 0 && S.tn.ok,
          hold: 0.7,
          status: () => mark(S.tn.sel === 0) + ' 바너드별 &nbsp; ' + mark(S.tn.ok) + ' v_t ' + ($('#inVt').value.trim() || '—') + ' km/s',
          explain: 'v_t = 4.74 × 10.358 × 1.83 ≈ <b>90 km/s</b>예요(정확히는 89.8). 바너드별은 하늘에서 해마다 10.4″씩 움직이고, 속도로는 초속 약 90 km예요.',
        },
        {
          type: 'quiz', title: '고유 운동이 큰 별은 빠른 별일까?',
          goal: '시리우스(μ = 1.339″/년)가 베가(μ = 0.35″/년)보다 하늘에서 훨씬 빨리 움직여 보여요. 그럼 시리우스가 <b>훨씬 빠른 별</b>일까요?',
          setup() { S.flags.showVt = true; setView('tan'); },
          choices: ['아니에요. 시리우스는 가까워서(2.64 pc) 같은 속도라도 각이 크게 보여요. 두 별의 v_t는 비슷해요', '맞아요. μ가 클수록 항상 속도도 커요', '아니에요. 고유 운동은 속도와 관계가 전혀 없어요', '맞아요. 시리우스가 베가보다 4배 빨라요'],
          answer: 0,
          feedback: ['', 'v_t = 4.74 μ d이므로 거리도 필요해요. 시리우스는 2.64 pc, 베가는 7.68 pc예요.', '관계는 있어요. 다만 거리를 곱해야 속도가 돼요(v_t = 4.74 μ d).', '표를 보면 v_t는 16.7 km/s와 12.7 km/s로 4배 차이가 아니에요.'],
          explain: '시리우스 v_t = 4.74 × 1.339 × 2.64 ≈ 16.7 km/s, 베가 4.74 × 0.35 × 7.68 ≈ 12.7 km/s로 <b>비슷해요</b>. μ의 차이는 대부분 <b>거리 차이</b> 때문이에요.',
        },
      ],
    },
    {
      title: '공간 운동: 두 속도의 합', short: '공간 운동', icon: '🧭', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 바너드별의 시선 속도 v_r = −110.5 km/s와 접선 속도 v_t = 89.8 km/s를 각각 구했어요. 별은 이 둘을 합친 하나의 <b>공간 속도</b>로 우주 공간을 움직여요.</div>' +
        '<p>v_r과 v_t는 서로 <b>직각</b>이라서 <b>v = √(v_r² + v_t²)</b>이고, 시선과 이루는 각은 <b>θ = arctan(v_t / |v_r|)</b>예요. 시간 슬라이더로 바너드별이 앞으로 지구와 얼마나 가까워지는지도 볼 수 있어요.</p>',
      features: ['vec'],
      setup() { S.vc.vOk = false; S.vc.dmOk = false; S.flags.calcV = false; S.flags.calcDm = false; clrIn('inV', 'inDm'); setTv(0); setViews(['vec']); setView('vec'); },
      recap: '공간 속도는 v = √(v_r² + v_t²)이고, 바너드별은 약 9800년 뒤 약 1.15 pc까지 가까워진 뒤 다시 멀어져요.',
      summary: '<ul><li><b>공간 속도</b> v = √(v_r² + v_t²). 바너드별: √(110.5² + 89.8²) ≈ <b>142.4 km/s</b>. 시선과 이루는 각 θ = arctan(v_t / |v_r|) ≈ 39°.</li><li><b>최근접 거리</b> d_min = d × v_t / v = 1.83 × 89.8 / 142.4 ≈ <b>1.15 pc</b>(약 3.8광년), 약 9800년 뒤. 그 뒤에는 다시 멀어져요.</li><li>시선 속도는 도플러 이동, 접선 속도는 고유 운동 × 거리로 구한 값을 직각으로 합성해요.</li></ul>',
      missions: [
        {
          title: '바너드별의 공간 속도 계산하기',
          goal: '<b>v_r = −110.5 km/s</b>, <b>v_t = 89.8 km/s</b>로 공간 속도 <b>v = √(v_r² + v_t²)</b>를 계산해 입력하세요 (km/s).',
          hint: '110.5² = 12210, 89.8² = 8064이므로 합은 20274이고 √20274 ≈ 142.4예요.',
          setup() { S.flags.calcV = true; S.flags.calcDm = false; S.vc.vOk = false; clrIn('inV'); setView('vec'); },
          check: () => S.vc.vOk,
          hold: 0.7,
          status: () => mark(S.vc.vOk) + ' v ' + ($('#inV').value.trim() || '—') + ' km/s',
          explain: 'v = √(110.5² + 89.8²) ≈ <b>142.4 km/s</b>이에요. 시선과 이루는 각은 arctan(89.8 / 110.5) ≈ 39°예요.',
        },
        {
          title: '바너드별의 최근접 거리 구하기', manual: true,
          goal: '현재 거리 d = 1.83 pc와 v_t, v로 최근접 거리 <b>d_min = d × v_t / v</b>를 계산해 입력하세요 (pc). 시간 슬라이더로 직접 확인해도 좋아요.',
          hint: 'd_min = 1.83 × 89.8 / 142.4 ≈ 1.15예요. 시간 슬라이더를 약 10000년 쪽으로 움직여 보세요.',
          setup() { S.flags.calcDm = true; S.vc.dmOk = false; clrIn('inDm'); setView('vec'); },
          check() { const v = numM('inDm'); if (v == null) return '최근접 거리를 입력해 주세요 (pc).'; if (near(v, barMin, 0.05)) return true; return v > 1.6 ? '지금 거리(1.83 pc)보다 가까워질 거예요. v_t / v를 곱해 보세요.' : '1.83 × (v_t / v)를 다시 계산해 보세요.'; },
          status: () => mark(S.vc.dmOk) + ' d_min ' + ($('#inDm').value.trim() || '—') + ' pc',
          explain: 'd_min = d × v_t / v = 1.83 × 89.8 / 142.4 ≈ <b>1.15 pc</b>(약 3.8광년)이에요. 약 9800년 뒤 가장 가깝고, 그 뒤에는 다시 멀어져요.',
        },
      ],
    },
    {
      title: '별자리: 별들의 입체 분포와 변화', short: '별자리', icon: '⭐', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>중학교 별자리의 변화</b>에서 별자리 모양이 계절에 따라 다르게 보이는 것을 배웠고, <b>앞 단계에서</b> 별이 공간 속도로 움직인다는 것을 알았어요. 별자리 별들이 서로 가까이 있을까요? 모양은 영원할까요?</div>' +
        '<p><b>북두칠성</b> 7개 별을 회전하는 <b>3차원 점 도표</b>에 놓았어요. 가로·세로는 하늘에서 보이는 각도, 깊이는 거리예요. 시점을 돌려 옆에서 보고, 시간 슬라이더로 ±10만 년 뒤의 모양도 봐요.</p>',
      features: ['con'],
      setup() { S.cn.ds = 'dip'; S.cn.sel = new Set(); S.cn.grpOk = false; S.cn.yawMax = 0; S.cn.arrows = false; setYaw(0); setT(0); S.cn.ys = 0; S.cn.ts = 0; setViews(['con']); setView('con'); },
      recap: '별자리 별들은 같은 방향에 있을 뿐 거리가 다르고(24~38 pc) 서로 다른 속도로 움직여서, 수만 년 뒤에는 별자리 모양이 달라져요.',
      summary: '<ul><li>북두칠성 7개 별은 거리가 <b>24~38 pc</b>로 같은 평면에 있지 않아요. 하늘에서는 모양이 있지만 옆에서 보면 흩어져 있어요 — 별자리는 <b>같은 방향에 있는 별들의 집단</b>일 뿐, 서로 중력으로 묶인 무리가 아니에요.</li><li>가운데 5개(메라크·페크다·메그레즈·알리오스·미자르)는 거의 같은 방향·속도로 함께 움직이는 <b>같은 운동 집단</b>이고, 두베와 알카이드는 반대 방향으로 움직여요.</li><li>위치 = 현재 + μ × 시간. 10만 년 뒤에는 모양이 지금과 크게 달라져요. 오리온의 별들은 77~600 pc로 더 멀리 흩어져 있어요.</li></ul>',
      missions: [
        {
          title: '옆에서 보기: 같은 평면일까?',
          goal: '시점을 <b>옆으로 돌려</b>(70° 이상) 북두칠성 별 7개가 같은 평면에 있지 않은지 확인하세요.',
          hint: '"↔ 옆에서 보기" 버튼을 누르거나 시점 슬라이더를 90° 쪽으로 움직이세요. 도표를 끌어서 돌려도 돼요.',
          setup() { S.cn.ds = 'dip'; setYaw(0); setT(0); S.cn.sel = new Set(); updateCtl(); setView('con'); },
          check: () => S.cn.ds === 'dip' && S.cn.yaw >= 70,
          hold: 0.8,
          status: () => mark(S.cn.yaw >= 70) + ' 시점 ' + f0(S.cn.yaw) + '° (70° 이상)',
          explain: '하늘에서는 국자 모양이지만 옆에서 보면 별들의 거리가 <b>24~38 pc</b>로 제각각이에요. 두베(37.9 pc)와 알카이드(31.0 pc)는 나머지보다 훨씬 멀리 있어요.',
        },
        {
          title: '같은 운동 집단 5개 고르기', manual: true,
          goal: '거의 같은 방향·속도로 함께 움직이는 별 <b>5개</b>를 도표나 목록에서 눌러 고르세요. (▶ 운동 화살표를 켜면 쉬워요)',
          hint: '화살표 방향이 반대인 두 별(두베, 알카이드)을 빼고 나머지 5개를 골라요.',
          setup() { S.cn.sel = new Set(); S.cn.arrows = true; updateCtl(); setView('con'); },
          check() { const s = S.cn.sel; if (s.size < 5) return '별을 5개 골라 주세요. (지금 ' + s.size + '개)'; if (s.size > 5) return '5개만 골라야 해요. 반대 방향으로 움직이는 별은 빼요.'; return grpOK() ? true : '고른 별 중에 반대 방향으로 움직이는 별이 있어요. 목록의 움직이는 방향(동/서)을 비교해 보세요.'; },
          status: () => mark(S.cn.sel.size === 5) + ' 고른 별 ' + S.cn.sel.size + ' / 5 &nbsp; ' + mark(grpOK()) + ' 같은 운동 집단',
          explain: '메라크·페크다·메그레즈·알리오스·미자르는 모두 같은 쪽(동쪽)으로 비슷한 빠르기로 움직이는 <b>같은 운동 집단</b>이에요. 두베와 알카이드는 반대 방향(서쪽)으로 움직여요.',
        },
        {
          type: 'quiz', title: '별자리의 별들은 가까이 있을까?',
          goal: '별자리를 이루는 별들은 서로 <b>가까이 있고 중력으로 묶인 무리</b>일까요?',
          setup() { setView('con'); },
          choices: ['아니에요. 같은 방향에 있어서 모여 보일 뿐 서로 거리가 많이 달라요', '맞아요. 별자리 별들은 서로 중력으로 묶인 별 무리예요', '맞아요. 별자리의 별들은 모두 같은 거리에 있어요', '아니에요. 별자리 별들은 모두 같은 별이에요'],
          answer: 0,
          feedback: ['', '북두칠성 별들의 거리는 24~38 pc로 제각각이고 운동도 달라요. 중력으로 묶인 무리가 아니에요.', '옆에서 보면 거리가 서로 달라요(24~38 pc). 오리온은 77~600 pc로 더 심해요.', '서로 다른 별이에요. 같은 방향에 있을 뿐이에요.'],
          explain: '별자리는 <b>시선 방향의 범위가 비슷한 별들</b>을 사람이 이어서 이름 붙인 것이에요. 물리적인 연관은 없고, 서로 다른 거리·속도로 움직여서 모양이 변해요.',
        },
        {
          title: '10만 년 뒤의 북두칠성', 
          goal: '시간 슬라이더를 <b>±8만 년 이상</b>으로 움직여, 별자리 모양이 지금과 어떻게 다른지 확인하세요.',
          hint: '시간 슬라이더를 오른쪽 끝(+100,000년) 쪽으로 움직여 보세요. 두베와 알카이드는 반대로 움직여요.',
          setup() { S.cn.ds = 'dip'; setT(0); setYaw(0); updateCtl(); setView('con'); },
          check: () => S.cn.ds === 'dip' && Math.abs(S.cn.t) >= 80000,
          hold: 0.8,
          status: () => mark(Math.abs(S.cn.t) >= 80000) + ' 시간 ' + tFmt(S.cn.t),
          explain: '10만 년 뒤 두베와 알카이드는 약 3.4~3.8° 서쪽으로, 가운데 별들은 약 2.3~3.4° 동쪽으로 움직여서 국자 모양이 크게 달라져요. 별자리의 모양도 영원하지 않아요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-space-motion', mount: '#game', badge: '별 운동 탐구자', homeHref: '../../index.html#hu',
    featureLabels: { rad: '🌈 스펙트럼선 이동 · 시선 속도', tan: '🔭 두 해의 하늘 사진 · 접선 속도', vec: '🧭 속도 합성 · 바너드별의 최근접', con: '⭐ 회전하는 3차원 점 도표 · 시간 슬라이더' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view;
    if (v === 'rad') { const vr = rdVr(); setReadouts(['고른 별', rdName(), 'Δλ', f3s(LAM0 * vr / C_KMS) + ' nm', '시선 방향', vr < -0.05 ? '다가와요' : vr > 0.05 ? '멀어져요' : '정지']); }
    else if (v === 'tan') { const st = tnStar(); setReadouts(['이동 각 θ', f1(st.mu * S.tn.dt) + '″', '고유 운동 μ', f3(st.mu) + '″/년', '접선 속도 v_t', S.flags.showVt || FREE() || S.tn.ok ? f1(st.vt) + ' km/s' : '?']); }
    else if (v === 'vec') setReadouts(['지금부터', comma(Math.round(S.vc.t / 100) * 100) + '년', '지구와의 거리', f2(barDist(S.vc.ts)) + ' pc', '공간 속도 v', S.vc.vOk || FREE() ? f1(BAR.v) + ' km/s' : '?']);
    else setReadouts(['자료', cnDS().name, '시점', f0(S.cn.yaw) + '°', '고른 별', S.cn.sel.size + '개']);
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
      case 'rad': drawRad(dt, t); break;
      case 'tan': drawTan(dt, t); break;
      case 'vec': drawVec(dt, t); break;
      default: drawCon(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, setViews, updateCtl, STAR4, BAR, DIP, DS, barDist, barMin, barTmin, setT, setYaw, setTv, LRd, LTn, LVc, LCn, cnGeom, cnPos, cnProj, cnHitStar, grpOK };
})();
