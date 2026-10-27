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
   행성우주과학 Ⅱ. 태양과 별의 관측 - 별까지의 거리 (3차시)
   성취기준 [12행우02-02] 별의 시차와 밝기를 이용하여 거리를 측정하는 다양한 방법을 비교·평가할 수 있다.
   ① 실험: 연주 시차 (d = 1/p)
   ② 설명: 거리 지수 (m − M = 5 log d − 5, 겉보기 밝기 ∝ 1/d²)
   ③ 분석: 방법 비교 (시차 vs 분광형 → 절대 등급 → 거리 지수, ΔM 오차)
   ④ 적용: 방법 평가 (측정 장비별 한계 거리 d_max = 0.1 / σ_p)
   다루지 않음: 시차 오차의 통계 처리, 분광 시차의 이론, 우주 팽창에 의한 거리 정의 차이. 성간 소광은 무시.
   ========================================================= */
  initStage('#e8eef8', 800, 620, 480, 860, 1.25);
  if (PHONE) view.canvas.style.touchAction = 'pan-y';

  /* ================= 자료 ================= */
  const lg = (x) => Math.log10(x);
  const STAR8 = [
    { n: '프록시마 센타우리', s: '프록시마', p: 0.7681, m: 11.13, c: '#f87171' },
    { n: '시리우스', s: '시리우스', p: 0.3792, m: -1.46, c: '#bfdbfe', sp: 'A1V', Mest: 1.4 },
    { n: '알타이르', s: '알타이르', p: 0.1947, m: 0.76, c: '#fde68a' },
    { n: '베가', s: '베가', p: 0.1302, m: 0.03, c: '#dbeafe', sp: 'A0V', Mest: 0.6 },
    { n: '폴룩스', s: '폴룩스', p: 0.0968, m: 1.14, c: '#fdba74' },
    { n: '아르크투루스', s: '아르크투루스', p: 0.0888, m: -0.05, c: '#fb923c' },
    { n: '카펠라', s: '카펠라', p: 0.0760, m: 0.08, c: '#fde047' },
    { n: '알데바란', s: '알데바란', p: 0.0489, m: 0.85, c: '#f97316' },
  ];
  STAR8.forEach((s) => { s.d = 1 / s.p; s.M = s.m + 5 - 5 * lg(s.d); });
  const ALT = 2, SIR = 1, VEG = 3;
  const dMod = (m, M) => Math.pow(10, (m - M + 5) / 5);              // 거리 지수 → 거리(pc)
  const SIGP = 0.01;                                                  // 지상 시차 정밀도 (″)
  const INST = [
    { n: '지상 망원경', sig: 0.01, c: '#64748b' },
    { n: '히파르코스 위성', sig: 0.001, c: '#0ea5e9' },
    { n: '가이아 위성', sig: 2e-5, c: '#16a34a' },
  ];
  INST.forEach((q) => { q.dmax = 0.1 / q.sig; });                     // 오차 10 %가 되는 최대 거리(pc)
  const supN = (e) => '10' + sup(e);
  const fPc = (d) => (d >= 1000 ? comma(d) : d >= 100 ? f0(d) : d >= 10 ? f1(d) : f2(d)) + ' pc';
  const mFmt = (x) => f2(x).replace('-', '−');
  const mFmt1 = (x) => f1(x).replace('-', '−');

  /* ================= 상태 ================= */
  const S = {
    view: 'par', clock: 0, fade: 0,
    flags: { calcP: false, calcD: false, calcM: false, calcBr: false, calcDm: false, calcErr: false, calcG: false },
    pr: { sel: ALT, m: 0, ms: 0, cap: [], pOk: false, dOk: false, hold: 0 },
    iv: { rho: 3, ok: false, brOk: false },
    cl: { m: 5, M: 3, dOk: false, mMs: 5, MMs: 3 },
    cm: { sel: SIR, dM: 0.5, dOk: false, errOk: false },
    ev: { logd: 1, gOk: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { par: '📐 연주 시차 측정', inv: '💡 거리와 밝기', calc: '🧮 거리 지수 계산기', cmp: '⚖ 두 방법 비교', eval: '🔭 방법 평가' };
  const VIEW_BTN = { par: '📐 연주 시차', inv: '💡 거리와 밝기', calc: '🧮 거리 지수', cmp: '⚖ 방법 비교', eval: '🔭 방법 평가' };
  let viewList = ['par'];
  const modeSeg = $('#modeSeg');
  function buildSeg() {
    modeSeg.innerHTML = '';
    viewList.forEach((v) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.view = v; b.textContent = VIEW_BTN[v]; clickable(b, () => setView(v)); modeSeg.appendChild(b); });
  }
  const modeBtns = () => $$('#modeSeg button');
  const curStar = () => STAR8[S.pr.sel];

  /* ================= ① 연주 시차 ================= */
  const BGSTARS = (() => { const r = rng(21), a = []; for (let i = 0; i < 46; i++) a.push([r(), r(), 0.8 + r() * 1.5, 0.35 + r() * 0.5]); return a; })();
  const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const starX = (m, p) => -p * Math.cos(m / 12 * TAU);                // 별의 겉보기 위치 (″): 지구가 1월(m = 0)에 있을 때 −p
  function LPr() {
    return PHONE
      ? { Or: { x: 8, y: 8, w: 232, h: 270 }, Tr: { x: 248, y: 8, w: 224, h: 270 }, Sk: { x: 8, y: 286, w: 464, h: 330 }, No: { x: 8, y: 624, w: 464, h: 228 } }
      : { Or: { x: 10, y: 8, w: 390, h: 300 }, Tr: { x: 408, y: 8, w: 382, h: 300 }, Sk: { x: 10, y: 316, w: 780, h: 296 } };
  }
  const monthName = (m) => MONTHS[Math.round(m) % 12] + (m - Math.round(m) !== 0 && Math.abs(m - Math.round(m)) > 0.01 ? ' 중순' : '');
  function skyGeom(Sk) { const half = (Sk.w - 56) / 2; return { cx: Sk.x + Sk.w / 2, cy: Sk.y + Sk.h * 0.46, sc: half / 1.0 }; }
  function drawPar(dt, t) {
    const L = LPr(), P = S.pr, st = curStar();
    P.ms = approach(P.ms, P.m, dt, 10);
    // 위: 지구 궤도 (위에서 내려다본 그림)
    const O = L.Or;
    panel(O.x, O.y, O.w, O.h, { r: 14, title: '위에서 본 지구의 공전', tsize: PHONE ? 12 : 14 });
    const cx = O.x + O.w / 2, cy = O.y + O.h * (PHONE ? 0.58 : 0.64), ro = PHONE ? 54 : 78, sy = O.y + 56 * Math.min(FS, 1.15);
    const th = P.ms / 12 * TAU, ex = cx + Math.cos(th) * ro, ey = cy - Math.sin(th) * ro;
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(cx, cy, ro, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    [[0, '1월'], [3, '4월'], [6, '7월'], [9, '10월']].forEach((q) => { const a = q[0] / 12 * TAU, x = cx + Math.cos(a) * (ro + 22), y = cy - Math.sin(a) * (ro + 16); T(x, y + 4, q[1], 12, '#64748b', 'center', 700); D.sphere(cx + Math.cos(a) * ro, cy - Math.sin(a) * ro, 3, '#94a3b8', { gloss: false }); });
    // 별 방향 (위쪽, 아주 멀어요)
    ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, sy + 12); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(cx, sy + 12); ctx.stroke(); ctx.setLineDash([]);
    D.glow(cx, sy, 22, st.c, 0.7); D.sphere(cx, sy, 8, st.c, { gloss: true });
    T(cx + 16, sy + 4, PHONE ? '먼 별' : '별 (아주 멀리 있어요)', 12, '#334155', 'left', 800);
    sunDraw(cx, cy, 13); D.sphere(ex, ey, 8, '#3b82f6', { gloss: true, shadow: true }); T(ex + (Math.cos(th) >= 0 ? 12 : -12), ey + 4, '지구', 12, '#1d4ed8', Math.cos(th) >= 0 ? 'left' : 'right', 800);
    T(O.x + 10, O.y + O.h - 8, PHONE ? '궤도 반지름 1 AU' : '궤도 반지름 = 1 AU', 11.5, '#475569', 'left', 800);
    // 삼각형 (축척 없는 그림)
    const Tr = L.Tr;
    panel(Tr.x, Tr.y, Tr.w, Tr.h, { r: 14, title: '시차 삼각형 (축척은 달라요)', tsize: PHONE ? 12 : 14 });
    const bx = Tr.x + (PHONE ? 46 : 80), by = Tr.y + Tr.h - (PHONE ? 74 : 46), base = PHONE ? 84 : 120, Hmax = Tr.h - (PHONE ? 150 : 104);
    const H = 0.34 * Hmax + 0.66 * Hmax * clamp(Math.log(st.d) / Math.log(21), 0, 1);
    const sx = bx, sy2 = by - H, pAng = Math.atan2(base, H);
    ctx.fillStyle = 'rgba(59,130,246,.1)'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + base, by); ctx.lineTo(sx, sy2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + base, by); ctx.lineTo(sx, sy2); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + 12, by); ctx.lineTo(bx + 12, by - 12); ctx.lineTo(bx, by - 12); ctx.stroke();
    sunDraw(bx, by, 9); D.sphere(bx + base, by, 6, '#3b82f6', { gloss: true }); D.glow(sx, sy2, 18, st.c, 0.7); D.sphere(sx, sy2, 7, st.c, { gloss: true });
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy2, 34, Math.PI / 2 - pAng, Math.PI / 2); ctx.stroke();
    T(sx + 40, sy2 + 44, P.pOk || FREE() ? 'p = ' + st.p.toFixed(4).replace(/0+$/, '').replace(/\.$/, '') + '″' : 'p', 13, '#dc2626', 'left', 800, { stroke: '#fff', strokeWidth: 3 });
    T(bx + base / 2, by + 20, '1 AU', 13, '#334155', 'center', 800);
    T(bx - 8, (by + sy2) / 2 + 4, P.dOk || FREE() ? 'd = ' + f2(st.d) + ' pc' : 'd = ?', 13, '#334155', 'right', 800);
    drawWrap(Tr.x + 12, Tr.y + Tr.h - (PHONE ? 30 : 12), PHONE ? '멀수록 p는 작아져요 (그림은 축척이 달라요)' : '별이 멀수록 p는 작아져요. 실제로는 별이 1 AU의 20만 배 넘게 멀어요.', Tr.w - 24, 11, { color: '#64748b' });
    // 아래: 하늘 (두 시기의 영상)
    const Sk = L.Sk, G = skyGeom(Sk);
    D.shadow(() => { ctx.fillStyle = '#0a1230'; rr(Sk.x, Sk.y, Sk.w, Sk.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(Sk.x, Sk.y, Sk.w, Sk.h, 14); ctx.clip();
    BGSTARS.forEach((b) => { ctx.globalAlpha = b[3]; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(Sk.x + b[0] * Sk.w, Sk.y + 36 + b[1] * (Sk.h - 100), b[2], 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
    ctx.restore();
    T(Sk.x + 14, Sk.y + 24, '🔭 망원경 영상: 먼 배경별은 가만히 있어요', PHONE ? 12.5 : 14, '#e2e8f0', 'left', 800);
    // 눈금자 (″)
    const ry = Sk.y + Sk.h - 40;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(G.cx - G.sc, ry); ctx.lineTo(G.cx + G.sc, ry); ctx.stroke();
    for (let k = -10; k <= 10; k++) { const x = G.cx + k * G.sc / 10, h = k % 5 === 0 ? 8 : 4; ctx.beginPath(); ctx.moveTo(x, ry - h); ctx.lineTo(x, ry + h); ctx.stroke(); if (k % 5 === 0) T(x, ry + 24, (k / 10).toFixed(k === 0 ? 0 : 1).replace('-', '−') + '″', 12, '#cbd5e1', 'center', 700); }
    // 찍은 사진 (유령 표시)
    P.cap.forEach((c, i) => {
      const x = G.cx + c.x * G.sc, y = G.cy;
      ctx.strokeStyle = i === 0 ? '#38bdf8' : '#fbbf24'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.stroke();
      ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.lineTo(x, ry); ctx.stroke(); ctx.setLineDash([]);
      D.label(x, y - 30, '📸 ' + MONTHS[Math.round(c.m) % 12] + '  ' + mFmt(c.x) + '″', { bg: i === 0 ? '#0369a1' : '#a16207', size: PHONE ? 11.5 : 12.5 });
    });
    if (P.cap.length === 2) {
      const a = P.cap[0].x, b = P.cap[1].x, x1 = G.cx + a * G.sc, x2 = G.cx + b * G.sc, yy = G.cy + 40;
      ctx.strokeStyle = '#f87171'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, yy); ctx.lineTo(x2, yy); ctx.stroke();
      D.arrow(Math.min(x1, x2) + 6, yy, Math.min(x1, x2), yy, { color: '#f87171', width: 3, head: 9 }); D.arrow(Math.max(x1, x2) - 6, yy, Math.max(x1, x2), yy, { color: '#f87171', width: 3, head: 9 });
      D.label((x1 + x2) / 2, yy + 24, '이동 Δ = ' + f2(Math.abs(a - b)) + '″', { bg: '#dc2626', size: PHONE ? 12 : 13 });
    }
    // 지금의 별
    const lx = G.cx + starX(P.ms, st.p) * G.sc;
    D.glow(lx, G.cy, 34, st.c, 0.55); D.sphere(lx, G.cy, 10, st.c, { gloss: true });
    T(lx, G.cy + 34 + (P.cap.length ? 0 : 0), st.s + ' (지금 ' + MONTHS[Math.round(P.m) % 12] + ')', 12.5, '#fff', 'center', 800, { stroke: 'rgba(0,0,10,.7)', strokeWidth: 3 });
    if (PHONE && L.No) {
      const N = L.No; panel(N.x, N.y, N.w, N.h, { r: 14, title: '읽는 방법' });
      let y = N.y + 44 * FS;
      y = drawWrap(N.x + 14, y, '· 슬라이더로 지구를 돌려 별이 좌우로 움직이는 것을 봐요.', N.w - 28, 13) + 20 * FS;
      y = drawWrap(N.x + 14, y, '· 6개월 간격(1월·7월)으로 사진을 찍으면 이동 Δ가 가장 커요. 이동의 절반이 시차 p예요.', N.w - 28, 13) + 20 * FS;
      drawWrap(N.x + 14, y, '· 거리 d(pc) = 1 / p(″)', N.w - 28, 13, { color: '#0369a1', weight: 800 });
    }
  }

  /* ================= ② 거리와 밝기: 겉보기 밝기 ∝ 1/d², 등급 차 Δm = 5 log(d₂/d₁) ================= */
  function LIv() {
    return PHONE
      ? { A: { x: 8, y: 8, w: 464, h: 352 }, B: { x: 8, y: 368, w: 464, h: 330 }, No: { x: 8, y: 706, w: 464, h: 146 } }
      : { A: { x: 10, y: 8, w: 780, h: 300 }, B: { x: 10, y: 316, w: 780, h: 296 } };
  }
  function drawBulb(x, y, r, a) { D.glow(x, y, r * 3.4, '#fde68a', 0.6 * a); D.sphere(x, y, r, '#fbbf24', { gloss: true, light: '#fffbe0', dark: '#d97706' }); }
  function drawInv(dt, t) {
    const L = LIv(), I = S.iv, rho = I.rho;
    const A = L.A;
    D.shadow(() => { ctx.fillStyle = '#0a1230'; rr(A.x, A.y, A.w, A.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14); ctx.clip();
    BGSTARS.forEach((b) => { ctx.globalAlpha = b[3] * 0.7; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(A.x + b[0] * A.w, A.y + b[1] * A.h, b[2], 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
    const ox = A.x + 54, unit = (A.w - 130) / 10 * (PHONE ? 1 : 1), rowA = A.y + A.h * 0.36, rowB = A.y + A.h * 0.72;
    const xA = ox + unit * 1, xB = ox + unit * rho;
    // 관측자
    [rowA, rowB].forEach((y) => { D.sphere(ox, y, 11, '#60a5fa', { gloss: true }); });
    T(ox, A.y + 26, '관측자', 12.5, '#93c5fd', 'center', 800);
    // 빛의 퍼짐: 거리가 멀수록 같은 면적에 닿는 빛이 적어요 (1/d²)
    [[rowA, xA, 1], [rowB, xB, rho]].forEach((q) => {
      const y = q[0], x = q[1], d = q[2];
      ctx.save(); ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2;
      for (let k = 1; k <= 7; k++) { const rad = (k * unit * 0.52 + ((RM ? 0 : t) * unit * 0.6) % (unit * 0.52)); const dist = rad; const al = clamp(1 / Math.pow(Math.max(dist / unit, 0.3) / 0.5 + 0.0001, 2) * 0.5, 0, 0.55); if (x - rad < ox - 6) continue; ctx.globalAlpha = al * (1 - ((k * unit * 0.52 + ((RM ? 0 : t) * unit * 0.6) % (unit * 0.52)) / (unit * 4.2))); ctx.beginPath(); ctx.arc(x, y, rad, Math.PI * 0.82, Math.PI * 1.18); ctx.stroke(); }
      ctx.restore();
      // 관측자 쪽에 도착하는 빛의 밝기 (같은 광도의 별은 d²에 반비례)
      const br = 1 / (d * d);
      D.glow(ox, y, 26, '#fde68a', clamp(br, 0.02, 1) * 0.9);
      ctx.strokeStyle = 'rgba(253,230,138,.35)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ox + 14, y); ctx.lineTo(x - 16, y); ctx.stroke(); ctx.setLineDash([]);
      drawBulb(x, y, 11, 1);
    });
    ctx.restore();
    T(xA, rowA - 24, '별 ① 거리 d₁ = 1', 13, '#fde68a', 'center', 800, { stroke: 'rgba(0,0,10,.7)', strokeWidth: 3 });
    T(xB, rowB - 24, '별 ② 거리 d₂ = ' + f1(rho) + ' (같은 광도)', 13, '#fde68a', 'center', 800, { stroke: 'rgba(0,0,10,.7)', strokeWidth: 3 });
    T(A.x + A.w - 12, A.y + A.h - 12, '두 별의 실제 밝기(광도)는 똑같아요', 12.5, '#cbd5e1', 'right', 800);
    // 아래: 겉보기 밝기 막대와 등급 눈금
    const B = L.B;
    panel(B.x, B.y, B.w, B.h, { r: 14, title: '관측자가 보는 밝기와 등급', tsize: PHONE ? 12.5 : 14 });
    const bx = B.x + 50, by1 = B.y + B.h - 44, by0 = B.y + 56 * Math.min(FS, 1.15), bh = by1 - by0, bw = PHONE ? 70 : 110;
    const bright = 1 / (rho * rho), dm = 5 * lg(rho);
    // 막대 (밝기, 별 ①을 1로)
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by0); ctx.lineTo(bx, by1); ctx.lineTo(bx + bw * 2 + 70, by1); ctx.stroke();
    T(bx, by0 - 8, '상대 밝기 (별 ① = 1)', 12, '#475569', 'left', 800);
    [[0, 1, '별 ①', '#f59e0b'], [1, bright, '별 ②', '#38bdf8']].forEach((q) => { const x = bx + 20 + q[0] * (bw + 24), h = q[1] * bh; ctx.fillStyle = q[3]; rr(x, by1 - h, bw, Math.max(h, 0.5), 4).fill(); T(x + bw / 2, by1 + 18, q[2], 13, '#334155', 'center', 800); T(x + bw / 2, by1 - h - 8, q[0] === 0 ? '1' : (bright >= 0.1 ? f2(bright) : '1/' + f0(1 / bright)), 13, '#0f172a', 'center', 800); });
    // 등급 눈금 (위쪽이 밝아요)
    const gx = bx + bw * 2 + 110, gy0 = by0 + 14, gy1 = by1, YM = (m_) => gy0 + m_ / 6.5 * (gy1 - gy0);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, gy0); ctx.lineTo(gx, gy1); ctx.stroke();
    for (let k = 0; k <= 6; k++) { ctx.beginPath(); ctx.moveTo(gx - 6, YM(k)); ctx.lineTo(gx + 6, YM(k)); ctx.stroke(); T(gx - 12, YM(k) + 4, String(k), 12, '#64748b', 'right', 700); }
    T(gx - 20, by0 - 8, '등급 차 (큰 값 = 어두움)', 12, '#475569', 'right', 800);
    D.sphere(gx + 28, YM(0), 8, '#f59e0b', { gloss: true }); T(gx + 42, YM(0) + 4, '별 ① 기준 0등급', 12.5, '#334155', 'left', 800);
    D.sphere(gx + 28, YM(clamp(dm, 0, 6.5)), 8, '#38bdf8', { gloss: true }); T(gx + 42, YM(clamp(dm, 0, 6.5)) + 4, '별 ②: +' + f2(dm) + '등급', 12.5, '#0369a1', 'left', 800);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(gx + 28, YM(0) + 10); ctx.lineTo(gx + 28, YM(clamp(dm, 0, 6.5)) - 10); ctx.stroke(); ctx.setLineDash([]);
    // 식
    const fx = B.x + B.w - 14, fy = B.y + 28 * FS;
    T(fx, fy, '밝기 비 = (d₂/d₁)² = ' + f1(rho) + '² = ' + f2(rho * rho).replace(/\.00$/, ''), PHONE ? 11.5 : 13, '#0369a1', 'right', 800);
    T(fx, fy + 20 * Math.min(FS, 1.15), '등급 차 Δm = 5 log(d₂/d₁) = ' + f2(dm), PHONE ? 11.5 : 13, '#0369a1', 'right', 800);
    if (L.No) { const N = L.No; panel(N.x, N.y, N.w, N.h, { r: 14 }); drawWrap(N.x + 14, N.y + 28 * FS, '거리가 2배가 되면 밝기는 1/4, 10배가 되면 1/100 (= 5등급 어두움)이에요. 1등급 차이는 밝기 약 2.512배예요.', N.w - 28, 13, { color: '#334155' }); }
  }

  /* ================= ② 거리 지수 계산기 ================= */
  function LCl() {
    return PHONE
      ? { A: { x: 8, y: 8, w: 464, h: 370 }, B: { x: 8, y: 386, w: 464, h: 320 }, No: { x: 8, y: 714, w: 464, h: 138 } }
      : { A: { x: 10, y: 8, w: 780, h: 300 }, B: { x: 10, y: 316, w: 780, h: 296 } };
  }
  const clDist = () => dMod(S.cl.m, S.cl.M);
  function drawCalc(dt, t) {
    const L = LCl(), C = S.cl, A = L.A;
    C.mMs = approach(C.mMs, C.m, dt, 12); C.MMs = approach(C.MMs, C.M, dt, 12);
    D.shadow(() => { ctx.fillStyle = '#0a1230'; rr(A.x, A.y, A.w, A.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14); ctx.clip();
    BGSTARS.forEach((b) => { ctx.globalAlpha = b[3] * 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(A.x + b[0] * A.w, A.y + b[1] * A.h, b[2], 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
    ctx.restore();
    // 로그 거리 축 (0.1 ~ 10⁴ pc)
    const ax0 = A.x + 40, ax1 = A.x + A.w - 30, ay = A.y + A.h * 0.58, X = (d) => ax0 + (lg(d) + 1) / 5 * (ax1 - ax0);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax0, ay); ctx.lineTo(ax1, ay); ctx.stroke();
    for (let e = -1; e <= 4; e++) { const x = X(Math.pow(10, e)); ctx.beginPath(); ctx.moveTo(x, ay - 8); ctx.lineTo(x, ay + 8); ctx.stroke(); T(x, ay + 28, (e < 0 ? '0.1' : f0(Math.pow(10, e))) + ' pc', 12, '#cbd5e1', 'center', 700); }
    T(A.x + 14, A.y + 26, '별까지의 거리 (로그 눈금)', 13.5, '#e2e8f0', 'left', 800);
    // 10 pc 기준 별 (절대 등급)
    const x10 = X(10);
    D.glow(x10, ay - 54, 28, '#fde68a', clamp(Math.pow(2.512, -(C.MMs - 0) * 0.35) , 0.12, 1) * 0.8); D.sphere(x10, ay - 54, 9, '#fde68a', { gloss: true });
    D.label(x10, ay - 88, '10 pc에 놓았을 때: M = ' + mFmt1(C.MMs), { bg: '#a16207', size: PHONE ? 11.5 : 13 });
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(253,230,138,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x10, ay - 44); ctx.lineTo(x10, ay); ctx.stroke(); ctx.setLineDash([]);
    // 실제 별
    const d = clDist(), xd = X(clamp(d, 0.1, 1e4));
    const glowA = clamp(Math.pow(2.512, -(C.mMs - 0) * 0.35), 0.1, 1);
    D.glow(xd, ay + 70 - 0, 26, '#bae6fd', glowA * 0.8); D.sphere(xd, ay + 70, 9, '#7dd3fc', { gloss: true });
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(125,211,252,.6)'; ctx.beginPath(); ctx.moveTo(xd, ay + 60); ctx.lineTo(xd, ay + 8); ctx.stroke(); ctx.setLineDash([]);
    D.label(clamp(xd, A.x + 90, A.x + A.w - 90), ay + 104, '보이는 별: m = ' + mFmt1(C.mMs), { bg: '#0369a1', size: PHONE ? 11.5 : 13 });
    if (C.dOk || FREE()) D.label(clamp(xd, A.x + 50, A.x + A.w - 50), ay - 20, fPc(d), { bg: '#16a34a', size: PHONE ? 12 : 13 });
    // 아래: 식과 값
    const B = L.B;
    panel(B.x, B.y, B.w, B.h, { r: 14, title: '거리 지수 m − M = 5 log d − 5', tsize: 15 });
    const mm = C.m - C.M;
    let y = B.y + 52 * FS; const x0 = B.x + 20;
    T(x0, y, '겉보기 등급 m = ' + mFmt1(C.m), 15, '#0369a1', 'left', 800); T(x0 + (PHONE ? 230 : 280), y, '절대 등급 M = ' + mFmt1(C.M), 15, '#a16207', 'left', 800);
    y += 34 * Math.min(FS, 1.2);
    T(x0, y, 'm − M = ' + mFmt1(mm), 17, '#0f172a', 'left', 800);
    y += 34 * Math.min(FS, 1.2);
    T(x0, y, 'log d = (m − M + 5) / 5 = ' + f2((mm + 5) / 5), 15, '#334155', 'left', 800);
    y += 34 * Math.min(FS, 1.2);
    T(x0, y, 'd = ' + (C.dOk || FREE() ? '10^' + f2((mm + 5) / 5) + ' = ' + fPc(d) : '? (계산해서 오른쪽 칸에 입력해요)'), 15, C.dOk || FREE() ? '#15803d' : '#b45309', 'left', 800);
    y += 36 * Math.min(FS, 1.2);
    drawWrap(x0, y, '절대 등급 M은 10 pc 거리에서 본 등급이에요. m − M = 0이면 10 pc, m이 M보다 5 크면 100 pc예요.', B.w - 40, 13.5, { color: '#475569' });
    if (L.No) { const N = L.No; panel(N.x, N.y, N.w, N.h, { r: 14 }); drawWrap(N.x + 14, N.y + 28 * FS, '두 슬라이더로 m과 M을 바꾸고 거리를 계산해요.', N.w - 28, 13, { color: '#334155' }); }
  }

  /* ================= ③ 방법 비교: 시차 거리 vs 거리 지수 거리 ================= */
  function LCm() {
    return PHONE
      ? { Sh: { x: 8, y: 8, w: 464, h: 332 }, Br: { x: 8, y: 348, w: 464, h: 360 }, No: { x: 8, y: 716, w: 464, h: 136 } }
      : { Sh: { x: 10, y: 8, w: 780, h: 258 }, Br: { x: 10, y: 274, w: 780, h: 338 } };
  }
  const cmStar = () => STAR8[S.cm.sel];
  const cmMest = () => cmStar().Mest;
  const cmDmod = () => dMod(cmStar().m, cmMest());
  function drawCmp(dt, t) {
    const L = LCm(), C = S.cm, st = cmStar(), Sh = L.Sh;
    panel(Sh.x, Sh.y, Sh.w, Sh.h, { r: 14, title: '📋 스프레드시트: ' + st.n + ' (' + st.sp + ')', tsize: PHONE ? 13 : 14.5 });
    const x0 = Sh.x + 14, w = Sh.w - 28;
    const rows = [
      ['① 연주 시차', 'p = ' + st.p.toFixed(4) + '″', 'd = 1 / p = ' + f2(st.d) + ' pc', '오차 ±' + f1(SIGP / st.p * 100) + ' %'],
      ['② 밝기 → M', 'm = ' + mFmt(st.m), 'M = m + 5 − 5 log d = ' + mFmt(st.M), '(시차 거리 사용)'],
      ['③ 분광형 → M', st.sp + ' → H-R도에서 M = ' + mFmt1(st.Mest), 'd = 10^((m − M + 5)/5) = ' + (C.dOk || FREE() ? f2(cmDmod()) + ' pc' : '?'), '오차 ΔM = ±' + f1(C.dM)],
    ];
    const cw = PHONE ? [0.2, 0.2, 0.34, 0.26] : [0.14, 0.2, 0.42, 0.24];
    let cx = x0; const cxs = cw.map((c) => { const o = cx; cx += c * w; return [o, c * w]; });
    const hy = Sh.y + 34 * FS, rh = PHONE ? 62 : 50;
    ctx.fillStyle = '#e2e8f0'; rr(x0, hy, w, 24, 6).fill();
    ['방법', '쓰는 값', '계산', '한계'].forEach((h, i) => T(cxs[i][0] + 8, hy + 17, h, 12.5, '#334155', 'left', 800));
    rows.forEach((r, i) => {
      const y = hy + 30 + i * rh;
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y + rh - 2); ctx.lineTo(x0 + w, y + rh - 2); ctx.stroke();
      r.forEach((c, j) => { const col = j === 0 ? '#0f172a' : j === 2 ? '#0369a1' : '#334155'; const lines = wrapLines(c, cxs[j][1] - 12, PHONE ? 11.5 : 12.5, 800); lines.slice(0, 3).forEach((ln, k) => T(cxs[j][0] + 8, y + 18 + k * (PHONE ? 16 : 15) * Math.min(FS, 1.1), ln, PHONE ? 11.5 : 12.5, col, 'left', 800)); });
    });
    // 아래: 거리 막대 (선형 눈금)
    const Br = L.Br, dpar = st.d, dmod = cmDmod(), lo = dmod / Math.pow(10, C.dM / 5), hi = dmod * Math.pow(10, C.dM / 5);
    panel(Br.x, Br.y, Br.w, Br.h, { r: 14, title: '두 방법으로 구한 거리 (pc)', tsize: PHONE ? 12.5 : 14 });
    const axmax = Math.ceil(st.d * 1.7 / (st.d > 5 ? 2 : 1)) * (st.d > 5 ? 2 : 1), X = (d) => Br.x + 60 + d / axmax * (Br.w - 84);
    const ay = Br.y + Br.h - 40;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0), ay); ctx.lineTo(X(axmax), ay); ctx.stroke();
    const stepT = axmax <= 6 ? 1 : 2;
    for (let d = 0; d <= axmax + 1e-6; d += stepT) { ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(X(d), Br.y + 50); ctx.lineTo(X(d), ay); ctx.stroke(); T(X(d), ay + 18, String(d), 12, '#64748b', 'center', 700); }
    T(X(axmax / 2), ay + 36, '별까지의 거리 d (pc)', 12.5, '#475569', 'center', 800);
    const ys = [Br.y + 96, Br.y + 190];
    // 시차 막대
    const sig = SIGP * dpar * dpar;                                   // d의 불확실성 = σ_p / p² (pc)
    T(Br.x + 12, ys[0] - 22, '시차로 구한 거리', 13, '#0f172a', 'left', 800);
    ctx.fillStyle = '#7dd3fc'; rr(X(0), ys[0] - 12, X(dpar) - X(0), 24, 6).fill();
    ctx.strokeStyle = '#0c4a6e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(dpar - sig), ys[0]); ctx.lineTo(X(dpar + sig), ys[0]); ctx.moveTo(X(dpar - sig), ys[0] - 8); ctx.lineTo(X(dpar - sig), ys[0] + 8); ctx.moveTo(X(dpar + sig), ys[0] - 8); ctx.lineTo(X(dpar + sig), ys[0] + 8); ctx.stroke();
    T(X(dpar) + 10, ys[0] - 18, f2(dpar) + ' pc (±' + f2(sig) + ')', 12.5, '#0c4a6e', 'left', 800);
    // 거리 지수 막대
    T(Br.x + 12, ys[1] - 22, '거리 지수로 구한 거리 (분광형 → M, ΔM = ±' + f1(C.dM) + ')', 13, '#0f172a', 'left', 800);
    if (C.dOk || FREE()) {
      ctx.fillStyle = '#fcd34d'; rr(X(0), ys[1] - 12, X(dmod) - X(0), 24, 6).fill();
      ctx.fillStyle = 'rgba(220,38,38,.28)'; ctx.fillRect(X(lo), ys[1] - 17, X(hi) - X(lo), 34);
      ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(lo), ys[1] - 17); ctx.lineTo(X(lo), ys[1] + 17); ctx.moveTo(X(hi), ys[1] - 17); ctx.lineTo(X(hi), ys[1] + 17); ctx.stroke();
      T(X(hi) + 10, ys[1] - 22, f2(dmod) + ' pc (' + f2(lo) + ' ~ ' + f2(hi) + ')', 12.5, '#7f1d1d', 'left', 800);
    } else T(X(0) + 10, ys[1] + 5, '③의 거리를 계산해 입력하면 막대가 나타나요', 13, '#94a3b8', 'left', 800);
    // 시차 거리 기준선
    ctx.setLineDash([6, 5]); ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(dpar), Br.y + 56); ctx.lineTo(X(dpar), ay); ctx.stroke(); ctx.setLineDash([]);
    if (C.dOk || FREE()) { const up = (hi / dmod - 1) * 100, dn = (1 - lo / dmod) * 100; T(Br.x + 12, Br.y + 44 * Math.min(FS, 1.15), C.errOk || FREE() ? '거리 오차: 최대 +' + f0(up) + ' % / −' + f0(dn) + ' % (10^(ΔM/5) = ' + f2(Math.pow(10, C.dM / 5)) + '배)' : '빨간 범위가 ΔM 때문에 생기는 거리의 불확실성이에요', PHONE ? 11.5 : 12.5, '#b91c1c', 'left', 800); }
    if (L.No) { const N = L.No; panel(N.x, N.y, N.w, N.h, { r: 14 }); drawWrap(N.x + 14, N.y + 28 * FS, '시차는 기하학적으로 직접 재서 가까운 별에서 정확해요. 거리 지수는 M을 분광형으로 추정하므로 ΔM이 거리 오차가 돼요.', N.w - 28, 13, { color: '#334155' }); }
  }

  /* ================= ④ 방법 평가: 한계 거리 d_max = 0.1 / σ_p ================= */
  const EVST = [{ d: 5, n: '별 가 · 5 pc' }, { d: 80, n: '별 나 · 80 pc' }, { d: 800, n: '별 다 · 800 pc' }, { d: 20000, n: '별 라 · 20000 pc' }];
  const EVBIN = [
    { label: '지상 망원경 시차', sub: 'σ 0.01″ → d ≤ 10 pc', color: '#475569' },
    { label: '히파르코스 위성 시차', sub: 'σ 0.001″ → d ≤ 100 pc', color: '#0284c7' },
    { label: '가이아 위성 시차', sub: 'σ 2×10⁻⁵″ → d ≤ 5000 pc', color: '#15803d' },
    { label: '시차로는 어려워요', sub: '거리 지수 등 다른 방법', color: '#b45309' },
  ];
  const cEv = makeClassifier({
    items: EVST.map((q, i) => ({ id: i, label: q.n, sub: '', bin: i, open: true })),
    bins: EVBIN,
    chipCols: 1, minRows: 1,
    layout() {
      return PHONE
        ? { grid: { x: 8, y: 336, w: 464, h: 108, cols: 2, cardH: 48, gap: 8 }, bins: [0, 1, 2, 3].map((i) => ({ x: 8 + (i % 2) * 236, y: 456 + Math.floor(i / 2) * 200, w: 228, h: 192 })), detail: null }
        : { grid: { x: 10, y: 286, w: 780, h: 52, cols: 4, cardH: 46, gap: 10 }, bins: [0, 1, 2, 3].map((i) => ({ x: 10 + i * 197.5, y: 346, w: 187, h: 266 })), detail: null };
    },
  });
  function drawEval(dt, t) {
    const E = S.ev, A = PHONE ? { x: 8, y: 8, w: 464, h: 320 } : { x: 10, y: 8, w: 780, h: 270 };
    panel(A.x, A.y, A.w, A.h, { r: 14, title: PHONE ? '장비별 한계 거리 d_max = 0.1 / σ_p' : '시차 측정 장비별 한계 거리 (오차 10 %): d_max = 0.1 / σ_p', tsize: PHONE ? 12.5 : 14 });
    const ax0 = A.x + (PHONE ? 112 : 150), ax1 = A.x + A.w - 20, ay = A.y + A.h - 34, X = (d) => ax0 + lg(d) / 5 * (ax1 - ax0);
    const top = A.y + 46 * Math.min(FS, 1.15);
    for (let e = 0; e <= 5; e++) { const x = X(Math.pow(10, e)); ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, ay); ctx.stroke(); T(x, ay + 18, e === 0 ? '1' : e === 1 ? '10' : e === 2 ? '100' : e === 3 ? '1000' : e === 4 ? '10⁴' : '10⁵', 12, '#64748b', 'center', 700); }
    T(ax0 + (ax1 - ax0) / 2, ay + 33, '별까지의 거리 d (pc, 로그 눈금)', 12, '#475569', 'center', 800);
    const rh = PHONE ? 48 : 42;
    INST.forEach((q, i) => {
      const y = top + 8 + i * rh, w = X(q.dmax) - X(1), show = i < 2 || S.flags.calcG === false || E.gOk || FREE();
      T(A.x + 12, y + 14, PHONE ? q.n.replace(' 망원경', '').replace(' 위성', '') : q.n, PHONE ? 12 : 13.5, '#0f172a', 'left', 800); T(A.x + 12, y + 14 + 15 * Math.min(FS, 1.15), 'σ_p = ' + (q.sig >= 1e-3 ? f3(q.sig) : '2×10⁻⁵') + '″', 11.5, '#64748b', 'left', 700);
      if (show) { ctx.fillStyle = q.c; ctx.globalAlpha = 0.9; rr(X(1), y, w, 22, 6).fill(); ctx.globalAlpha = 1; if (w > 120) T(X(q.dmax) - 8, y + 16, 'd_max ' + comma(q.dmax) + ' pc', 12, '#fff', 'right', 800); else T(X(q.dmax) + 8, y + 16, 'd_max ' + comma(q.dmax) + ' pc', 12, q.c, 'left', 800); }
      else { ctx.strokeStyle = q.c; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; rr(X(1), y, X(5000) - X(1), 22, 6).stroke(); ctx.setLineDash([]); T(ax0 + 12, y + 16, 'd_max = 0.1 / σ_p = ? (계산해서 입력해요)', 12, '#64748b', 'left', 800); }
    });
    // 별 위치 + 거리 커서
    const dd = Math.pow(10, E.logd), xc = X(dd);
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(xc, top - 4); ctx.lineTo(xc, ay); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(xc, ay, 7, '#dc2626', { gloss: true });
    const lines = INST.map((q) => { const e = q.sig * dd * 100; return q.n.replace(' 망원경', '').replace(' 위성', '') + ' ' + (e > 100 ? '100 % 넘음' : (e >= 10 ? f0(e) : e >= 1 ? f1(e) : f2(e)) + ' %'); });
    if (PHONE) { T(A.x + 12, top + 8 + 3 * rh + 10, 'd = ' + fPc(dd) + ' 일 때 시차 거리 오차', 12, '#7f1d1d', 'left', 800); drawWrap(A.x + 12, top + 8 + 3 * rh + 28, lines.join(' · '), A.w - 24, 11.5, { color: '#7f1d1d', weight: 800 }); }
    else D.label(clamp(xc, A.x + 160, A.x + A.w - 160), top + 8 + 3 * rh + 8, 'd = ' + fPc(dd) + ' → 거리 오차  ' + lines.join(' · '), { bg: '#7f1d1d', size: 12.5 });
    // 별 4개 위치 (분류 후 표시)
    EVST.forEach((q, i) => { const it = cEv.items[i]; if (it.loc != null && cEv.isRight(it)) { const x = X(q.d); D.sphere(x, ay - 14, 6, '#16a34a', { gloss: true }); T(x, ay - 26, f0(q.d) + ' pc', 11, '#15803d', 'center', 800); } });
    cEv.draw(dt, {});
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
  const monFmt = (m) => MONTHS[Math.floor(m + 1e-6) % 12] + (Math.abs(m - Math.floor(m)) > 0.01 ? ' 중순' : ' 초');
  const capOK = () => { const c = S.pr.cap; if (c.length !== 2) return false; const a = c[0].m, b = c[1].m; return (Math.abs(a) < 0.3 && Math.abs(b - 6) < 0.3) || (Math.abs(b) < 0.3 && Math.abs(a - 6) < 0.3); };
  function setMonth(m) { S.pr.m = clamp(Math.round(m * 2) / 2, 0, 12); const s = $('#sMon'); if (s) setSlider(s, $('#oMon'), S.pr.m, monFmt); }
  function setStar(i) { S.pr.sel = i; S.pr.cap = []; S.pr.pOk = false; S.pr.dOk = false; clrIn('inP', 'inD'); updateCtl(); }
  function takePhoto() {
    const P = S.pr, c = { m: P.m, x: starX(P.m, curStar().p) };
    if (P.cap.length >= 2) P.cap = [];
    P.cap.push(c); Sound.click(); P.pOk = false; fbIn('inP', false); clrIn('inP');
    const G = skyGeom(LPr().Sk); parts.burst(G.cx + c.x * G.sc, G.cy, { count: 10, color: '#fde68a', speed: 60, life: 0.5 });
  }
  function updateCtl() {
    const free = FREE();
    const list = free ? ['par', 'inv', 'calc', 'cmp', 'eval'] : viewList;
    if (modeSeg.children.length !== list.length || Array.from(modeSeg.children).some((b, i) => b.dataset.view !== list[i])) { viewList = list; buildSeg(); }
    modeSeg.hidden = list.length < 2;
    modeBtns().forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    if (list.indexOf(S.view) < 0) { S.view = list[0]; S.fade = 1; }
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcP').hidden = !(S.view === 'par' && (S.flags.calcP || free));
    $('#calcD').hidden = !(S.view === 'par' && (S.flags.calcD || free));
    $('#calcM').hidden = !(S.view === 'calc' && (S.flags.calcM || free));
    $('#calcBr').hidden = !(S.view === 'inv' && (S.flags.calcBr || free));
    $('#calcDm').hidden = !(S.view === 'cmp' && (S.flags.calcDm || free));
    $('#calcErr').hidden = !(S.view === 'cmp' && (S.flags.calcErr || free));
    $('#calcG').hidden = !(S.view === 'eval' && (S.flags.calcG || free));
    $$('#grpStar .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.pr.sel));
    $$('#grpCm .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.cm.sel));
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
  }
  sl('#sMon', '#oMon', monFmt, (v) => { S.pr.m = v; });
  sl('#sRho', '#oRho', (v) => f1(v) + '배', (v) => { S.iv.rho = v; });
  sl('#sMa', '#oMa', (v) => f1(v) + '등급', (v) => { S.cl.m = v; S.cl.dOk = false; });
  sl('#sMb', '#oMb', (v) => f1(v) + '등급', (v) => { S.cl.M = v; S.cl.dOk = false; });
  sl('#sdM', '#odM', (v) => '±' + f1(v), (v) => { S.cm.dM = v; });
  sl('#sDe', '#oDe', (v) => fPc(Math.pow(10, v)), (v) => { S.ev.logd = v; });
  $$('#grpStar .opt').forEach((b) => clickable(b, () => setStar(+b.dataset.k)));
  $$('#grpCm .opt').forEach((b) => clickable(b, () => { S.cm.sel = +b.dataset.k; S.cm.dOk = false; S.cm.errOk = false; clrIn('inDm2', 'inErr'); updateCtl(); }));
  clickable($('#bShot'), takePhoto);
  clickable($('#bClrP'), () => { S.pr.cap = []; S.pr.pOk = false; clrIn('inP'); });
  $('#inP').addEventListener('input', () => { const v = numOf('inP'), P = S.pr; if (v != null && capOK() && near(v, curStar().p, Math.max(0.01, curStar().p * 0.06))) { P.pOk = true; fbIn('inP', true); } });
  $('#inD').addEventListener('input', () => { const v = numOf('inD'), P = S.pr; if (v != null && near(v, curStar().d, Math.max(0.12, curStar().d * 0.03))) { P.dOk = true; fbIn('inD', true); } });
  $('#inBr').addEventListener('input', () => { const v = numOf('inBr'); if (v != null && near(v, 100, 5)) { S.iv.brOk = true; fbIn('inBr', true); } });
  $('#inDc').addEventListener('input', () => { const v = numOf('inDc'); if (v != null && near(v, clDist(), Math.max(0.05, clDist() * 0.05))) { S.cl.dOk = true; fbIn('inDc', true); } });
  $('#inDm2').addEventListener('input', () => { const v = numOf('inDm2'); if (v != null && near(v, cmDmod(), 0.15)) { S.cm.dOk = true; fbIn('inDm2', true); } });
  $('#inErr').addEventListener('input', () => { const v = numOf('inErr'); if (v != null && near(v, 26, 2)) { S.cm.errOk = true; fbIn('inErr', true); } });
  $('#inG').addEventListener('input', () => { const v = numOf('inG'); if (v != null && near(v, INST[2].dmax, 250)) { S.ev.gOk = true; fbIn('inG', true); } });

  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'eval') return cEv.down(p);
      if (S.view === 'par') {
        const O = LPr().Or;
        if (p.x >= O.x && p.x <= O.x + O.w && p.y >= O.y + 50 && p.y <= O.y + O.h) { S.pr.drag = true; parDrag(p); return true; }
      }
      return false;
    },
    move(p) { if (S.view === 'eval') cEv.move(p); else if (S.view === 'par' && S.pr.drag) parDrag(p); },
    up(p) { if (S.view === 'eval') cEv.up(p); S.pr.drag = false; },
    hover(p) {
      if (S.view === 'eval') return cEv.hit(p) ? 'pointer' : '';
      if (S.view === 'par') { const O = LPr().Or; return p.x >= O.x && p.x <= O.x + O.w && p.y >= O.y + 50 && p.y <= O.y + O.h ? 'grab' : ''; }
      return '';
    },
  });
  function parDrag(p) {
    const O = LPr().Or, cx = O.x + O.w / 2, cy = O.y + O.h * (PHONE ? 0.58 : 0.64);
    let a = Math.atan2(-(p.y - cy), p.x - cx); if (a < 0) a += TAU;
    setMonth(a / TAU * 12);
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '연주 시차: 별의 이동으로 거리 구하기', short: '연주 시차', icon: '📐', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 별까지의 거리를 어떻게 재며, 가까운 별과 먼 별은 왜 방법이 다를까?</p>' +
        '<div class="si-link">🔗 <b>중학교 별의 연주 시차</b>에서 시차가 클수록 가까운 별이라는 것을 배웠고, <b>별의 등급</b>도 배웠어요. <b>일반선택 지구과학의 H-R도</b>에서는 별의 분광형으로 절대 등급을 알 수 있다는 것도 배웠어요. 이번 차시에서는 이것을 <b>수식으로 계산</b>해요.</div>' +
        '<p>지구가 6개월 간격으로 궤도의 양 끝에 오면 가까운 별이 먼 배경별 사이에서 움직여 보여요. 이동 각의 절반이 <b>연주 시차 p</b>이고, 거리는 <b>d(pc) = 1 / p(″)</b>예요. (1 pc ≈ 3.26광년 ≈ 206265 AU)</p>',
      features: ['par'],
      setup() { S.pr.cap = []; S.pr.pOk = false; S.pr.dOk = false; S.pr.sel = ALT; S.flags.calcP = false; S.flags.calcD = false; clrIn('inP', 'inD'); setMonth(0); S.pr.ms = 0; setViews(['par']); setView('par'); },
      recap: '시차 p는 6개월 간격 이동의 절반이고 d(pc) = 1 / p(″)예요. 시차가 클수록 가까운 별이에요.',
      summary: '<ul><li><b>연주 시차 p</b>: 지구가 공전 궤도 반대편(6개월 간격)에 있을 때 별의 위치 변화의 <b>절반</b>. 궤도 반지름 1 AU를 한 변으로 하는 삼각형에서 별에서 본 각이에요.</li><li><b>d(pc) = 1 / p(″)</b>. 1 pc = 206265 AU ≈ 3.26광년 ≈ 3.09×10¹⁶ m.</li><li>예) 알타이르 p = 0.1947″ → d = 5.1 pc(약 16.7광년). 시차가 클수록 같은 기선(1 AU)으로 더 큰 각이 되므로 <b>가까운 별</b>이에요.</li></ul>',
      missions: [
        {
          title: '알타이르의 시차 재기',
          goal: '별 목록에서 <b>알타이르</b>를 고르고, 지구를 <b>1월 초</b>와 <b>7월 초</b>로 옮겨 사진을 찍어(📸) 이동 Δ를 재요. <b>p = Δ ÷ 2</b>를 입력하세요(″).',
          hint: '아래 지구를 끌거나 슬라이더로 1월 초에서 한 번, 7월 초에서 한 번 찍어요. 이동 Δ는 약 0.39″이고, 그 절반이 p예요.',
          setup() { S.pr.cap = []; S.pr.pOk = false; S.flags.calcP = true; S.flags.calcD = false; clrIn('inP'); setMonth(0); setView('par'); S.pr.sel = ALT; updateCtl(); },
          check: () => S.pr.sel === ALT && capOK() && S.pr.pOk,
          hold: 0.7,
          status: () => mark(S.pr.sel === ALT) + ' 알타이르 &nbsp; ' + mark(capOK()) + ' 1월·7월 사진 ' + S.pr.cap.length + ' / 2 &nbsp; ' + mark(S.pr.pOk) + ' p ' + ($('#inP').value.trim() || '—') + '″',
          explain: '알타이르는 1월과 7월 사이에 약 <b>0.39″</b> 움직여 보여요. 시차 p는 그 절반인 <b>0.195″</b>(0.1947″)예요. 6개월 간격이어야 이동이 가장 커요.',
        },
        {
          title: '시차로 거리 계산하기',
          goal: '알타이르의 시차 p = 0.1947″로 거리 <b>d = 1 / p</b>를 계산해 입력하세요 (pc).',
          hint: 'd = 1 / 0.1947 ≈ 5.1이에요. 1 pc는 약 3.26광년이니까 약 17광년이에요.',
          setup() { S.flags.calcD = true; S.pr.dOk = false; clrIn('inD'); setView('par'); S.pr.sel = ALT; updateCtl(); },
          check: () => S.pr.dOk,
          hold: 0.6,
          status: () => mark(S.pr.dOk) + ' d = ' + ($('#inD').value.trim() || '—') + ' pc',
          explain: 'd = 1 / 0.1947 ≈ <b>5.1 pc</b>(약 16.7광년)이에요. 시차가 작아질수록 거리는 커져요.',
        },
        {
          type: 'quiz', title: '시차가 클수록 가까운 까닭',
          goal: '연주 시차가 <b>큰 별</b>일수록 어떤 별일까요?',
          setup() { setView('par'); },
          choices: ['더 가까운 별이에요. 같은 기선(1 AU)이라도 가까울수록 각이 커져요', '더 먼 별이에요. 멀수록 크게 움직여 보여요', '시차와 거리는 관계가 없어요', '더 밝은 별이에요'],
          answer: 0,
          feedback: ['', '반대예요. 삼각형에서 먼 별은 1 AU 기선이 거의 점처럼 보여서 각이 작아져요(d = 1 / p).', '시차와 거리는 d = 1 / p의 관계예요. 별을 바꿔 가며 삼각형의 각을 비교해 보세요.', '시차는 별의 밝기가 아니라 위치 변화예요. 밝기와는 관계없어요.'],
          explain: 'd = 1 / p이므로 시차 p가 클수록 거리 d는 작아요. 프록시마(p = 0.7681″)는 1.30 pc, 알데바란(p = 0.0489″)은 20.4 pc예요.',
        },
      ],
    },
    {
      title: '거리 지수: 밝기로 거리 구하기', short: '거리 지수', icon: '💡', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 시차로 거리를 구했지만, 별이 아주 멀면 시차가 너무 작아 재기 어려워요. 그럴 때는 별이 <b>얼마나 밝게 보이는지</b>를 이용해요. 중학교에서 배운 겉보기 등급·절대 등급과 일반선택 지구과학의 광도를 이어서 써요.</div>' +
        '<p>같은 광도의 별은 멀수록 어두워 보여요. 거리가 d배가 되면 밝기는 1/d²이고 등급 차이는 5 log d예요. 절대 등급 <b>M</b>은 별을 <b>10 pc</b>에 놓았을 때의 겉보기 등급이고, <b>거리 지수 m − M = 5 log d − 5</b>예요.</p>',
      features: ['inv', 'calc'],
      setup() { S.iv.rho = 3; S.iv.brOk = false; S.cl.dOk = false; S.flags.calcM = false; S.flags.calcBr = false; setSlider($('#sRho'), $('#oRho'), 3, (v) => f1(v) + '배'); setViews(['inv', 'calc']); setView('inv'); },
      recap: '겉보기 밝기는 거리의 제곱에 반비례하고(거리 10배 → 밝기 1/100 = 5등급), m − M = 5 log d − 5로 거리를 구해요. 등급이 작다고 가까운 별은 아니에요.',
      summary: '<ul><li>광도가 같으면 겉보기 밝기 ∝ 1/d². 거리가 10배 → 밝기 1/100 → <b>5등급</b> 어두움. 1등급 차이 = 밝기 약 2.512배(5등급 = 100배).</li><li>거리비 d₂/d₁이면 <b>등급 차 Δm = 5 log(d₂/d₁)</b>.</li><li><b>절대 등급 M</b> = 별을 10 pc에 놓았을 때의 등급. <b>거리 지수 m − M = 5 log d − 5</b> → d = 10^((m − M + 5)/5) pc. (성간 소광은 무시)</li><li>예) m = 5.0, M = 0.0이면 m − M = 5, d = 100 pc. 겉보기 등급 m이 작은 별이 반드시 가까운 별은 아니에요(광도가 클 수 있어요).</li></ul>',
      missions: [
        {
          title: '거리 지수로 거리 계산하기',
          goal: '두 슬라이더로 <b>m = 5.0, M = 0.0</b>인 별을 만들고, <b>거리 d(pc)</b>를 계산해 입력하세요.',
          hint: 'm − M = 5이므로 5 log d − 5 = 5 → log d = 2 → d = 100이에요.',
          setup() { S.flags.calcM = true; S.cl.dOk = false; clrIn('inDc'); setSlider($('#sMa'), $('#oMa'), 3, (v) => f1(v) + '등급'); setSlider($('#sMb'), $('#oMb'), 3, (v) => f1(v) + '등급'); S.cl.m = 3; S.cl.M = 3; setView('calc'); },
          check: () => near(S.cl.m, 5, 0.05) && near(S.cl.M, 0, 0.05) && S.cl.dOk,
          hold: 0.7,
          status: () => mark(near(S.cl.m, 5, 0.05)) + ' m = ' + f1(S.cl.m) + ' &nbsp; ' + mark(near(S.cl.M, 0, 0.05)) + ' M = ' + f1(S.cl.M) + ' &nbsp; ' + mark(S.cl.dOk) + ' d ' + ($('#inDc').value.trim() || '—') + ' pc',
          explain: 'm − M = 5 log d − 5에서 5 = 5 log d − 5이므로 log d = 2, <b>d = 100 pc</b>예요. m − M = 0이면 d = 10 pc예요.',
        },
        {
          title: '거리가 10배이면 몇 등급, 몇 배?', manual: true,
          goal: '"💡 거리와 밝기"에서 거리비를 <b>10배</b>로 맞추고, 그때의 등급 차 <b>5등급</b>이 밝기 몇 배의 차이인지 입력하세요. (별 ①이 별 ②보다 몇 배 밝은가)',
          hint: '밝기 비는 (d₂/d₁)² = 10² = 100이에요. 막대 그래프의 별 ②는 별 ①의 1/100이에요.',
          setup() { S.flags.calcBr = true; S.iv.brOk = false; clrIn('inBr'); setView('inv'); },
          check() { if (!near(S.iv.rho, 10, 0.06)) return '거리비를 10배로 맞춰 주세요.'; const v = numOf('inBr'); if (v == null) return '밝기 비를 입력해 주세요.'; return near(v, 100, 5) ? true : v < 20 ? '등급이 5 차이날 때 밝기비는 5배가 아니에요. 밝기는 거리의 제곱에 반비례해요.' : '거리비 10을 제곱해 보세요.'; },
          status: () => mark(near(S.iv.rho, 10, 0.06)) + ' 거리비 ' + f1(S.iv.rho) + '배 &nbsp; ' + mark(S.iv.brOk) + ' 밝기 비 ' + ($('#inBr').value.trim() || '—') + '배',
          explain: '밝기는 거리의 제곱에 반비례해서 거리가 10배이면 <b>1/100</b>이에요. 5등급 차이 = 밝기 <b>100배</b>(1등급 = 약 2.512배, 2.512⁵ ≈ 100)예요.',
        },
        {
          type: 'quiz', title: '겉보기 등급이 작으면 가까운 별일까?',
          goal: '겉보기 등급 m이 <b>작은 별</b>(밝게 보이는 별)은 반드시 <b>가까운 별</b>일까요?',
          setup() { setView('calc'); },
          choices: ['아니에요. 광도(절대 등급)가 큰 별은 멀어도 밝게 보여요', '맞아요. 밝게 보이면 항상 가까워요', '맞아요. 겉보기 등급은 거리만으로 정해져요', '아니에요. 겉보기 등급은 거리와 전혀 관계가 없어요'],
          answer: 0,
          feedback: ['', '같은 거리라도 광도가 다르면 밝기가 달라요. 거리를 구하려면 m과 M을 함께 써야 해요(m − M = 5 log d − 5).', '겉보기 등급은 거리와 광도(절대 등급) 둘 다에 따라 정해져요.', '거리가 멀수록 어두워져요(m − M = 5 log d − 5). 다만 광도도 함께 영향을 줘요.'],
          explain: '겉보기 등급은 <b>거리와 광도</b>가 함께 정해요. 예) 시리우스(m = −1.46)는 가까워서, 카펠라(m = 0.08)는 광도가 커서 밝게 보여요. 거리를 알려면 M도 알아야 해요.',
        },
      ],
    },
    {
      title: '방법 비교: 시차와 분광형으로 구한 거리', short: '방법 비교', icon: '⚖', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 시차(d = 1 / p)와 거리 지수(m − M = 5 log d − 5)로 거리를 구하는 방법을 배웠어요. 거리 지수에 쓰는 M은 별을 보고 바로 알 수 없어요. <b>일반선택 지구과학의 H-R도</b>에서 별의 <b>분광형</b>으로 절대 등급을 추정해요.</div>' +
        '<p>시리우스와 베가에 <b>두 방법</b>을 모두 적용해 거리를 비교해요. 분광형으로 추정한 M에 오차 ΔM이 있으면 거리가 얼마나 달라지는지 막대로 확인해요.</p>',
      features: ['cmp'],
      setup() { S.cm.sel = SIR; S.cm.dM = 0.5; S.cm.dOk = false; S.cm.errOk = false; S.flags.calcDm = false; S.flags.calcErr = false; clrIn('inDm2', 'inErr'); setSlider($('#sdM'), $('#odM'), 0.5, (v) => '±' + f1(v)); setViews(['cmp']); setView('cmp'); },
      recap: '시차는 직접 재는 방법이라 가까운 별에서 정확하고, 거리 지수는 분광형으로 M을 추정해야 해서 ΔM만큼 거리가 달라져요(ΔM = 0.5이면 약 ±26 %).',
      summary: '<ul><li>시리우스: 시차 p = 0.3792″ → d = 2.64 pc, m = −1.46 → M = 1.43. 분광형 A1V(H-R도 M ≈ 1.4)로 거리 지수를 쓰면 d = 10^((−1.46 − 1.4 + 5)/5) ≈ 2.68 pc로 시차 거리와 거의 같아요.</li><li><b>ΔM의 영향</b>: 거리는 10^(ΔM/5)배로 달라져요. ΔM = ±0.5 → ×1.26(약 +26 %), ÷1.26(약 −21 %). ΔM = 1이면 1.58배.</li><li>시차는 <b>기하학적 직접 측정</b>이라 광도를 몰라도 되고, 거리 지수는 <b>간접 측정</b>이라 표준 광도(M)에 의존해요.</li></ul>',
      missions: [
        {
          title: '시리우스의 거리 지수 거리',
          goal: '시리우스(분광형 A1V)의 M을 H-R도에서 <b>1.4</b>로 추정했어요. <b>d = 10^((m − M + 5)/5)</b>로 거리를 계산해 입력하세요 (pc).',
          hint: 'm = −1.46, M = 1.4이므로 m − M = −2.86이에요. (−2.86 + 5) / 5 = 0.428이고 10^0.428 ≈ 2.68이에요.',
          setup() { S.cm.sel = SIR; S.flags.calcDm = true; S.flags.calcErr = false; S.cm.dOk = false; S.cm.errOk = false; clrIn('inDm2', 'inErr'); updateCtl(); setView('cmp'); },
          check: () => S.cm.sel === SIR && S.cm.dOk,
          hold: 0.7,
          status: () => mark(S.cm.sel === SIR) + ' 시리우스 &nbsp; ' + mark(S.cm.dOk) + ' d ' + ($('#inDm2').value.trim() || '—') + ' pc',
          explain: 'd = 10^((−1.46 − 1.4 + 5)/5) ≈ <b>2.68 pc</b>이에요. 시차로 구한 2.64 pc와 약 2 % 차이로 거의 같아요. 두 방법이 서로 맞는다는 확인이 돼요.',
        },
        {
          title: 'M의 오차가 만드는 거리 오차', manual: true,
          goal: '오차 슬라이더를 <b>ΔM = ±0.5</b>로 맞추고, 거리가 <b>최대 몇 %</b> 커질 수 있는지 계산해 입력하세요. (10^(ΔM/5)로 계산해요)',
          hint: '10^(0.5/5) = 10^0.1 ≈ 1.26이에요. 그러니까 약 26 % 커져요.',
          setup() { S.flags.calcErr = true; S.cm.errOk = false; clrIn('inErr'); setSlider($('#sdM'), $('#odM'), 0.5, (v) => '±' + f1(v)); S.cm.dM = 0.5; setView('cmp'); },
          check() { if (!near(S.cm.dM, 0.5, 0.05)) return 'ΔM 슬라이더를 ±0.5에 맞춰 주세요.'; const v = numOf('inErr'); if (v == null) return '최대 몇 %인지 입력해 주세요.'; return near(v, 26, 2) ? true : v > 45 ? '10^(ΔM/5)는 ΔM = 0.5일 때 1.26배예요. 퍼센트로는 26 %예요.' : '10^(0.5/5)를 계산해 보세요(약 1.26배).'; },
          status: () => mark(near(S.cm.dM, 0.5, 0.05)) + ' ΔM = ±' + f1(S.cm.dM) + ' &nbsp; ' + mark(S.cm.errOk) + ' 최대 +' + ($('#inErr').value.trim() || '—') + ' %',
          explain: '거리는 10^(ΔM/5)배로 달라져요. ΔM = 0.5이면 1.26배로 <b>약 +26 %</b>(작은 쪽은 1/1.26 ≈ 0.79배, 약 −21 %)예요. 분광형으로 M을 정확히 알수록 거리 지수가 정확해져요.',
        },
      ],
    },
    {
      title: '방법 평가: 거리에 알맞은 측정 방법', short: '방법 평가', icon: '🔭', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 시차는 직접 재서 정확하지만 먼 별에서는 각이 너무 작고, 거리 지수는 먼 별에도 쓰지만 광도(M)를 알아야 한다는 것을 알았어요. 이제 별의 거리에 따라 <b>어떤 방법</b>이 알맞은지 <b>평가</b>해요.</div>' +
        '<p>시차의 측정 정밀도 σ_p가 클수록 가까운 별만 잴 수 있어요. 오차가 10 %가 되는 거리 <b>d_max = 0.1 / σ_p</b>로 지상 망원경, 히파르코스 위성, 가이아 위성을 비교하고, 거리가 다른 별 4개에 알맞은 방법을 골라요.</p>',
      features: ['eval'],
      setup() { cEv.reset(); S.ev.gOk = false; S.flags.calcG = false; clrIn('inG'); setViews(['eval']); setView('eval'); },
      recap: '시차는 d_max = 0.1 / σ_p까지의 가까운 별에 쓰고, 그보다 먼 별에는 거리 지수 같은 간접 방법이 필요해요. 두 방법은 서로의 한계를 채워 줘요.',
      summary: '<ul><li><b>한계 거리</b> d_max = 0.1 / σ_p(오차 10 %): 지상 σ_p ≈ 0.01″ → <b>10 pc</b>, 히파르코스(1989~93) 0.001″ → <b>100 pc</b>, 가이아(2013~) 약 2×10⁻⁵″ → <b>5000 pc</b>(5 kpc).</li><li>거리가 멀수록 시차 각이 작아서 상대 오차(σ_p × d)가 급증해요.</li><li><b>시차</b>: 직접 측정(기하학), 가까운 별. <b>거리 지수(분광 시차)</b>: 간접 측정, 광도(M)를 알아야 하고 ΔM이 거리 오차가 돼요. 더 먼 천체(성단·세페이드·초신성 등)는 다른 방법이 필요해요.</li></ul>',
      missions: [
        {
          title: '가이아 위성의 한계 거리 계산하기',
          goal: '가이아 위성의 시차 정밀도 <b>σ_p = 2×10⁻⁵″</b>일 때 오차 10 %가 되는 한계 거리 <b>d_max = 0.1 / σ_p</b>를 계산해 입력하세요 (pc).',
          hint: '0.1 / 0.00002 = 5000이에요. 지상 망원경은 0.1 / 0.01 = 10 pc였어요.',
          setup() { S.flags.calcG = true; S.ev.gOk = false; clrIn('inG'); setView('eval'); },
          check: () => S.ev.gOk,
          hold: 0.6,
          status: () => mark(S.ev.gOk) + ' d_max = ' + ($('#inG').value.trim() || '—') + ' pc',
          explain: 'd_max = 0.1 / (2×10⁻⁵) = <b>5000 pc</b>(5 kpc)이에요. 정밀도가 500배 좋아지면 잴 수 있는 거리도 500배 늘어요.',
        },
        {
          title: '별 4개에 알맞은 방법 연결하기', manual: true,
          goal: '거리가 다른 별 카드 4장을 <b>가장 알맞은 측정 방법</b> 상자에 넣으세요.',
          hint: '막대 그래프에서 각 별의 거리가 어느 장비의 한계 거리 안에 처음 들어가는지 보세요. 5000 pc보다 먼 별은 시차로 어려워요.',
          setup() { cEv.reset(); setView('eval'); },
          check() {
            const c = cEv.counts(); if (c.placed < 4) return '아직 상자에 넣지 않은 카드가 ' + (4 - c.placed) + '장 있어요.';
            const bad = cEv.items.filter((i) => !cEv.isRight(i)); bad.forEach((i) => { i.wrong = true; });
            return bad.length ? '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요. 별의 거리와 각 장비의 한계 거리를 비교해 보세요.' : true;
          },
          status: () => mark(cEv.counts().placed === 4) + ' 놓은 카드 ' + cEv.counts().placed + ' / 4 &nbsp; ' + mark(cEv.counts().right === 4) + ' 맞게 ' + cEv.counts().right + ' / 4',
          explain: '5 pc → 지상 시차(≤ 10 pc), 80 pc → 히파르코스(≤ 100 pc), 800 pc → 가이아(≤ 5000 pc), 20000 pc → 시차로는 어려워서 거리 지수 같은 다른 방법이 필요해요.',
        },
        {
          type: 'quiz', title: '거리에 따라 방법이 달라지는 까닭',
          goal: '별까지의 <b>거리 규모</b>에 따라 알맞은 측정 방법이 달라지는 까닭은?',
          setup() { setView('eval'); },
          choices: ['시차는 멀수록 각이 너무 작아 재기 어렵고, 거리 지수는 별의 광도(M)를 알아야 쓸 수 있기 때문이에요', '먼 별은 시차가 커서 오히려 재기 쉽기 때문이에요', '거리 지수는 별이 가까울 때만 쓸 수 있기 때문이에요', '모든 거리에서 한 가지 방법만 쓰면 되기 때문이에요'],
          answer: 0,
          feedback: ['', '반대예요. d = 1 / p이므로 먼 별일수록 시차는 작아져서 재기 어려워요.', '거리 지수는 광도를 알면 먼 별에도 쓸 수 있어요. 문제는 M을 정확히 아는 것이에요.', '시차는 먼 별에서 오차가 커지고 거리 지수는 광도를 알아야 해서 한 가지만으로는 부족해요.'],
          explain: '가까운 별은 <b>시차</b>로 직접 재고, 시차를 잴 수 없는 먼 별은 분광형으로 M을 알아내 <b>거리 지수</b>로 구해요. 가까운 별의 시차로 거리 지수의 광도(M)를 검증하기도 해서 두 방법이 서로 도와요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-stellar-distance', mount: '#game', badge: '우주 측량사', homeHref: '../../index.html#hu',
    featureLabels: { par: '📐 지구 공전 · 별 이동 사진 · 시차 삼각형', inv: '💡 거리와 밝기 비교', calc: '🧮 거리 지수 계산기', cmp: '⚖ 시차 거리와 거리 지수 거리 비교', eval: '🔭 장비별 한계 거리 · 방법 고르기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view, st = curStar();
    if (v === 'par') setReadouts(['고른 별', st.s, '지구 위치', monFmt(S.pr.m), '찍은 사진', S.pr.cap.length + ' / 2']);
    else if (v === 'inv') setReadouts(['거리비 d₂/d₁', f1(S.iv.rho), '밝기 비 (①/②)', f2(S.iv.rho * S.iv.rho).replace(/\.00$/, '') + '배', '등급 차 Δm', f2(5 * lg(S.iv.rho))]);
    else if (v === 'calc') setReadouts(['m − M', mFmt1(S.cl.m - S.cl.M), '거리 지수로 구한 d', S.cl.dOk || FREE() ? fPc(clDist()) : '?', 'log d', f2((S.cl.m - S.cl.M + 5) / 5)]);
    else if (v === 'cmp') { const s2 = cmStar(); setReadouts(['시차 거리', f2(s2.d) + ' pc', '거리 지수 거리', S.cm.dOk || FREE() ? f2(cmDmod()) + ' pc' : '?', 'ΔM', '±' + f1(S.cm.dM)]); }
    else setReadouts(['별의 거리', fPc(Math.pow(10, S.ev.logd)), '지상 시차 오차', f0(Math.min(999, SIGP * Math.pow(10, S.ev.logd) * 100)) + ' %', '가이아 시차 오차', f2(INST[2].sig * Math.pow(10, S.ev.logd) * 100) + ' %']);
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
      case 'par': drawPar(dt, t); break;
      case 'inv': drawInv(dt, t); break;
      case 'calc': drawCalc(dt, t); break;
      case 'cmp': drawCmp(dt, t); break;
      default: drawEval(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, setViews, updateCtl, STAR8, INST, setMonth, takePhoto, setStar, capOK, cEv, LPr, LIv, LCl, LCm, skyGeom, starX, dMod, clDist, cmDmod, EVST, monFmt };
})();
