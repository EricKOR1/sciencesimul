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
   행성우주과학 Ⅱ. 태양과 별의 관측 - 흑점과 태양의 자전 (1차시)
   성취기준 [12행우02-01] 태양의 광구와 대기에서 나타나는 현상을 설명하고, 이러한 현상이 다양한 파장의 관측 자료에서 어떻게 나타나는지 비교·분석할 수 있다. (광구·흑점·차등 자전·활동 주기)
   ① 관찰: 광구 관찰 (태양 필터, 쌀알 무늬, 주연 감광, 흑점 밝기)
   ② 기록: 흑점 이동 (x/R → 경도 λ → T 회합 → T 항성)
   ③ 분석: 차등 자전 (위도별 주기, 합성 영상)
   ④ 분석: 활동 주기 (월평균 흑점 수, 나비 도표)
   다루지 않음: 흑점의 자기장 생성(발전) 이론, 자기 극성 법칙, 태양 내부 구조. 대기와 다파장은 다음 차시.
   ========================================================= */
  initStage('#e8eef8', 800, 620, 480, 860, 1.25);
  if (PHONE) view.canvas.style.touchAction = 'pan-y';

  /* ================= 자료 ================= */

  const limb = (r) => 1 - 0.6 * (1 - Math.sqrt(Math.max(0, 1 - r * r)));            // 주연 감광 I(r)/I(0)
  const OMEGA_E = 360 / 365.25;                                                       // 지구 공전 각속도 (도/일)
  const omSid = (phi) => 14.4 - 2.7 * Math.pow(Math.sin(phi * DEG), 2);               // 항성 각속도 (도/일)
  const omSyn = (phi) => omSid(phi) - OMEGA_E;                                        // 회합 각속도 (도/일)
  const tSyn = (phi) => 360 / omSyn(phi), tSid = (phi) => 360 / omSid(phi);
  const PHI_A = 10, LON_A0 = -62, W_A = 120 / 9;                                      // 흑점 A: 위도 10°, 9일 동안 -62° → +58°
  const cosA = Math.cos(PHI_A * DEG);
  const xA = (d) => Math.round(cosA * Math.sin((LON_A0 + W_A * d) * DEG) * 1000) / 1000;   // 날짜 d의 x/R (소수 셋째 자리)
  const lonOf = (x) => Math.asin(clamp(x / cosA, -1, 1)) / DEG;
  const DAYS = 10;
  /* 흑점 4개 (위도 5, 20, 35, 45도): 0일, 6일의 가로 위치 */
  const SP4 = [5, 20, 35, 45].map((phi, i) => {
    const lon0 = [-40, -30, -35, -25][i], w = omSyn(phi), c = Math.cos(phi * DEG);
    const x0 = Math.round(c * Math.sin(lon0 * DEG) * 1000) / 1000, x6 = Math.round(c * Math.sin((lon0 + 6 * w) * DEG) * 1000) / 1000;
    const l0 = Math.asin(x0 / c) / DEG, l6 = Math.asin(x6 / c) / DEG, om = (l6 - l0) / 6;
    return { phi, x0, x6, l0, l6, om, T: tSyn(phi), Tsid: tSid(phi), col: ['#2563eb', '#16a34a', '#d97706', '#dc2626'][i], ok: false, show: 0, v: 0 };
  });
  /* 월평균 흑점 수 (합성 자료): 1996~2026년, 극소 1996.6 · 2008.9 · 2019.9, 극대 약 2001.9 · 2014.3 · 2024.6 */
  const CYC = [{ s: 1996.6, e: 2008.9, amp: 175, pk: 0.43 }, { s: 2008.9, e: 2019.9, amp: 118, pk: 0.49 }, { s: 2019.9, e: 2031.0, amp: 155, pk: 0.42 }];
  const YR0 = 1996, YR1 = 2026, SSN = [];
  (function () {
    const r = rng(777);
    const shape = (u, pk) => { if (u <= 0 || u >= 1) return 0; const a = 3, b = a * (1 - pk) / pk, m = Math.pow(pk, a) * Math.pow(1 - pk, b); return Math.pow(u, a) * Math.pow(1 - u, b) / m; };
    for (let k = 0; k <= (YR1 - YR0) * 12; k++) {
      const y = YR0 + k / 12; let v = 6 + 4 * Math.sin(k * 0.9);
      CYC.forEach((c) => { v += c.amp * shape((y - c.s) / (c.e - c.s), c.pk); });
      v += (r() - 0.5) * (v * 0.12 + 6);
      SSN.push(Math.max(0, Math.round(v)));
    }
  })();
  /* 극대(진짜) 위치: 각 주기 구간의 최댓값 (5개월 이동 평균 기준) */
  const smoothSSN = (k) => { let s = 0, n = 0; for (let j = -6; j <= 6; j++) { const i = k + j; if (i >= 0 && i < SSN.length) { s += SSN[i]; n++; } } return s / n; };
  const PEAKS = CYC.map((c) => {
    let best = -1, bk = 0;
    for (let k = 0; k < SSN.length; k++) { const y = YR0 + k / 12; if (y >= c.s && y < c.e && smoothSSN(k) > best) { best = smoothSSN(k); bk = k; } }
    return { k: bk, y: YR0 + bk / 12, v: SSN[bk] };
  });
  /* 나비 도표 점 (주기 초 ±30° → 말기 ±5°) */
  const BFLY = [];
  (function () {
    const r = rng(4242);
    const ends = [1996.0].concat(CYC.map((c) => c.s));
    for (let k = 0; k < SSN.length; k++) {
      const y = YR0 + k / 12, n = Math.round(SSN[k] / 14);
      let ci = -1; CYC.forEach((c, i) => { if (y >= c.s && y < c.e) ci = i; });
      for (let j = 0; j < n; j++) {
        let u, lat;
        if (ci < 0) { u = 1; lat = 6 + r() * 6; }                         // 1996.0~1996.6: 앞 주기의 끝 (적도 쪽)
        else { const c = CYC[ci]; u = (y - c.s) / (c.e - c.s); lat = 5 + 24 * Math.pow(1 - u, 1.15) + (r() - 0.5) * 9; }
        BFLY.push({ y: y + r() / 12, lat: Math.max(2, lat) * (r() < 0.5 ? 1 : -1) });
      }
      // 새 주기의 시작 (고위도 ±30° 부근): 극소 무렵에 다음 주기 흑점이 높은 위도에 나타남
      const cn = CYC.find((c) => y >= c.s - 1.4 && y < c.s);
      if (cn && r() < 0.5) BFLY.push({ y: y + r() / 12, lat: (26 + r() * 8) * (r() < 0.5 ? 1 : -1) });
    }
  })();
  const ssnAt = (yr) => { const k = clamp(Math.round((yr - YR0) * 12), 0, SSN.length - 1); return SSN[k]; };

  /* ================= 상태 ================= */
  const S = {
    view: 'photo', clock: 0, fade: 0, flags: { calcI: false, calcT: false, inset: false, pickTrend: false, calcP: false, pickBf: false },
    ph: { filter: false, viewing: false, vis: 0, r: 0.5, warn: 0, rot: 0, iOk: false, glow: 0 },
    tr: { day: 0, play: false, rec: new Array(DAYS).fill(null), hov: null, angOk: false, tOk: false, bad: 0, simT: 0 },
    df: { trend: -1, cDay: 0, cMax: 0, play: false, pts: 0 },
    cy: { yr: 2001.9, marks: [], pOk: false, bf: -1, mode: false, flare: 0 },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { photo: '🔭 필터를 낀 망원경으로 본 광구', zoom: '🔍 광구 확대: 쌀알 무늬와 흑점', track: '📋 흑점 A의 10일 이동 기록', diff: '📈 위도별 흑점 주기', compose: '🛰 위성 영상 합성', cycle: '🌞 흑점 수와 나비 도표' };
  const VIEW_BTN = { photo: '🔭 전체', zoom: '🔍 확대', track: '📋 기록', diff: '📋 표와 그래프', compose: '🛰 영상 합성', cycle: '📈 활동 주기' };
  let viewList = ['photo'];
  const modeSeg = $('#modeSeg');
  function buildSeg() {
    modeSeg.innerHTML = '';
    viewList.forEach((v) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.view = v; b.textContent = VIEW_BTN[v]; clickable(b, () => { if (!b.disabled) setView(v); }); modeSeg.appendChild(b); });
  }
  const modeBtns = () => $$('#modeSeg button');

  /* ================= 태양 그리기 ================= */
  function makeTex(seed, n, sz) {
    const c = document.createElement('canvas'); c.width = c.height = sz; const g = c.getContext('2d'), r = rng(seed);
    g.fillStyle = 'rgba(90,30,0,.55)'; g.fillRect(0, 0, sz, sz);
    const cell = sz / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x0 = (i + 0.5 + (r() - 0.5) * 0.7) * cell, y0 = (j + 0.5 + (r() - 0.5) * 0.7) * cell, rad = cell * (0.62 + r() * 0.22), b = 0.55 + r() * 0.4;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const x = x0 + dx * sz, y = y0 + dy * sz; if (x < -rad || x > sz + rad || y < -rad || y > sz + rad) continue;
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, 'rgba(255,240,190,' + b + ')'); gr.addColorStop(0.55, 'rgba(255,205,110,' + b * 0.7 + ')'); gr.addColorStop(1, 'rgba(255,170,60,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
      }
    }
    return c;
  }
  const TEX = [makeTex(11, 18, 256), makeTex(23, 18, 256)];
  const photoCol = (r) => mixc('#b8480c', '#fff1bd', (limb(r) - 0.4) / 0.6);
  function diskBase(cx, cy, R, alpha) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    [0, 0.35, 0.6, 0.8, 0.9, 0.96, 1].forEach((r) => g.addColorStop(r, photoCol(r)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); ctx.restore();
  }
  function granules(cx, cy, R, t, a, scale) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    const w = RM ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.1), ts = 256 * (scale || 1.4) * R * 2 / 256;
    const tile = (tex, ox, oy) => { for (let x = cx - R - ((ox % ts) + ts) % ts; x < cx + R; x += ts) for (let y = cy - R - ((oy % ts) + ts) % ts; y < cy + R; y += ts) ctx.drawImage(tex, x, y, ts, ts); };
    ctx.globalAlpha = a * (1 - 0.55 * w); tile(TEX[0], 0, 0);
    ctx.globalAlpha = a * (0.45 + 0.55 * w); tile(TEX[1], R * 0.37, R * 0.21);
    ctx.restore();
  }
  function limbShade(cx, cy, R) {
    const g = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.0);
    g.addColorStop(0, 'rgba(60,20,0,0)'); g.addColorStop(1, 'rgba(60,20,0,.35)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  }
  /* 흑점: (x, y)=원반 위 위치(R 단위), ru=암부 반지름(px), 가장자리에서는 납작하게 */
  function spotAt(cx, cy, R, xr, yr, ru, a) {
    const rho2 = xr * xr + yr * yr; if (rho2 >= 0.995) return;
    const mu = Math.sqrt(1 - rho2), ang = Math.atan2(yr, xr), px = cx + xr * R, py = cy - yr * R;
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; ctx.translate(px, py); ctx.rotate(-ang); ctx.scale(Math.max(0.18, mu), 1);
    const g = ctx.createRadialGradient(0, 0, ru * 0.2, 0, 0, ru * 2.4);
    g.addColorStop(0, 'rgba(28,10,2,1)'); g.addColorStop(0.4, 'rgba(36,14,3,1)'); g.addColorStop(0.46, 'rgba(110,52,14,.95)'); g.addColorStop(0.8, 'rgba(150,76,22,.55)'); g.addColorStop(1, 'rgba(150,76,22,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, ru * 2.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(40,16,4,.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) { const q = i * 0.45; ctx.beginPath(); ctx.moveTo(Math.cos(q) * ru * 1.05, Math.sin(q) * ru * 1.05); ctx.lineTo(Math.cos(q) * ru * 2.1, Math.sin(q) * ru * 2.1); ctx.stroke(); }
    ctx.restore();
  }
  /* 위도 φ, 경도 λ(중앙 자오선 기준)인 점의 원반 좌표 (B0 = 0, 지구에서 본 모습) */
  const sph = (phi, lon) => ({ x: Math.cos(phi * DEG) * Math.sin(lon * DEG), y: Math.sin(phi * DEG), z: Math.cos(phi * DEG) * Math.cos(lon * DEG) });
  /* 눈금자: 원반 가운데 가로축의 x/R */
  function xRuler(cx, cy, R, y0, col) {
    ctx.save(); ctx.strokeStyle = col || 'rgba(255,255,255,.75)'; ctx.fillStyle = col || '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - R, y0); ctx.lineTo(cx + R, y0); ctx.stroke();
    for (let k = -4; k <= 4; k++) { const x = cx + k * R / 4, h = k % 2 === 0 ? 7 : 4; ctx.beginPath(); ctx.moveTo(x, y0 - h); ctx.lineTo(x, y0 + h); ctx.stroke(); if (k % 2 === 0) T(x, y0 + 21, (k / 4).toFixed(k === 0 ? 0 : 1).replace('-', '−'), 12, col || '#fff', 'center', 800); }
    ctx.restore();
  }

  /* ================= ① 광구 관찰 ================= */
  const SPOTS3 = [{ phi: 10, lon0: -80, ru: 7 }, { phi: -18, lon0: -20, ru: 5 }, { phi: 24, lon0: 40, ru: 4.5 }];
  function LPh() {
    return PHONE
      ? { E: { x: 8, y: 8, w: 464, h: 410, cx: 240, cy: 213, er: 196, R: 166 }, G: { x: 8, y: 426, w: 464, h: 236 }, B: { x: 8, y: 670, w: 464, h: 182 } }
      : { E: { x: 10, y: 8, w: 430, h: 470, cx: 225, cy: 243, er: 208, R: 176 }, G: { x: 450, y: 8, w: 340, h: 470 }, B: { x: 10, y: 486, w: 780, h: 126 } };
  }
  /* 밝기 곡선 그래프: 가로 r(0~1), 세로 I(r)/I(0) (30~100 %) */
  function igeom(G) { const l = 56, r = 22, t = 62, b = PHONE ? 58 : 66; return { x0: G.x + l, x1: G.x + G.w - r, y0: G.y + t, y1: G.y + G.h - b }; }
  function drawIGraph(G, rr_, o) {
    o = o || {};
    panel(G.x, G.y, G.w, G.h, { r: 14, title: '주연 감광: 가장자리로 갈수록 어두워요', tsize: PHONE ? 12.5 : 14 });
    const g = igeom(G), X = (r) => g.x0 + r * (g.x1 - g.x0), Y = (i) => g.y1 - (i - 0.3) / 0.7 * (g.y1 - g.y0);
    ctx.lineWidth = 1; for (let i = 0.3; i <= 1.0001; i += 0.1) { ctx.strokeStyle = i < 0.31 ? '#94a3b8' : '#e2e8f0'; ctx.beginPath(); ctx.moveTo(g.x0, Y(i)); ctx.lineTo(g.x1, Y(i)); ctx.stroke(); T(g.x0 - 8, Y(i) + 4, Math.round(i * 100) + '%', 12, '#64748b', 'right', 700); }
    ctx.strokeStyle = '#eef2f7'; for (let i = 0.35; i < 1; i += 0.1) { ctx.beginPath(); ctx.moveTo(g.x0, Y(i)); ctx.lineTo(g.x1, Y(i)); ctx.stroke(); }
    for (let r = 0; r <= 1.0001; r += 0.1) { ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(X(r), g.y0); ctx.lineTo(X(r), g.y1); ctx.stroke(); T(X(r), g.y1 + 18, r.toFixed(1), 12, '#64748b', 'center', 700); }
    T((g.x0 + g.x1) / 2, g.y1 + (PHONE ? 38 : 42), '중심에서 거리 r (태양 반지름 R = 1)', 12.5, '#475569', 'center', 800);
    T(g.x0 - 40, g.y0 - 12, '밝기 (중심 = 100 %)', 12.5, '#475569', 'left', 800);
    const pts = []; for (let k = 0; k <= 100; k++) { const r = Math.min(0.995, k / 100); pts.push([X(r), Y(limb(r))]); }
    line(pts, '#f59e0b', 4);
    if (o.spotLine) { ctx.setLineDash([6, 5]); line([[g.x0, Y(0.226)], [g.x1, Y(0.226)]], '#7c2d12', 2); ctx.setLineDash([]); }
    const mx = X(rr_), my = Y(limb(rr_));
    ctx.setLineDash([4, 4]); line([[mx, g.y1], [mx, my]], 'rgba(220,38,38,.7)', 2); line([[g.x0, my], [mx, my]], 'rgba(220,38,38,.7)', 2); ctx.setLineDash([]);
    D.sphere(mx, my, 8, '#ef4444', { gloss: true });
    T(mx, g.y1 - 8, 'r = ' + f2(rr_), 12.5, '#b91c1c', mx > g.x1 - 50 ? 'right' : 'center', 800, { stroke: '#fff', strokeWidth: 3 });
  }
  function drawEyepiece(L, dt, t) {
    const E = L.E, P = S.ph;
    sm(P, 'vis', P.viewing ? 1 : 0, dt, 5);
    sm(P, 'glow', !P.filter ? 1 : 0, dt, 6);
    P.warn = Math.max(0, P.warn - dt);
    if (P.vis > 0.02) P.rot += dt * (RM ? 0.25 : 1.1);
    D.shadow(() => { ctx.fillStyle = '#0b1020'; rr(E.x, E.y, E.w, E.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); ctx.beginPath(); ctx.arc(E.cx, E.cy, E.er, 0, TAU); ctx.clip();
    ctx.fillStyle = '#04060c'; ctx.fillRect(E.x, E.y, E.w, E.h);
    // 필터 없이: 눈부신 빛
    if (P.glow > 0.02 && !P.viewing) {
      const g = ctx.createRadialGradient(E.cx, E.cy, 4, E.cx, E.cy, E.er);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.95 * P.glow) + ')'); g.addColorStop(0.35, 'rgba(255,240,170,' + (0.8 * P.glow) + ')'); g.addColorStop(1, 'rgba(255,170,40,' + (0.35 * P.glow) + ')');
      ctx.fillStyle = g; ctx.fillRect(E.x, E.y, E.w, E.h);
    }
    // 필터를 낀 광구
    if (P.vis > 0.02) {
      ctx.globalAlpha = P.vis;
      D.glow(E.cx, E.cy, E.R * 1.25, '#ffb703', 0.28);
      diskBase(E.cx, E.cy, E.R); granules(E.cx, E.cy, E.R, t, 0.28, 1.0);
      SPOTS3.forEach((s) => {
        const lon = (((s.lon0 + omSyn(s.phi) * P.rot + 180) % 360) + 360) % 360 - 180;
        if (Math.abs(lon) < 88) { const q = sph(s.phi, lon); spotAt(E.cx, E.cy, E.R, q.x, q.y, s.ru * (E.R / 160), 1); }
      });
      limbShade(E.cx, E.cy, E.R);
      // 프로브 (가장자리 방향 가로선)
      ctx.strokeStyle = 'rgba(239,68,68,.9)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(E.cx, E.cy); ctx.lineTo(E.cx + P.r * E.R, E.cy); ctx.stroke(); ctx.setLineDash([]);
      D.sphere(E.cx + P.r * E.R, E.cy, 7, '#ef4444', { gloss: true });
      D.sphere(E.cx, E.cy, 4, '#ffffff', { gloss: false });
      ctx.globalAlpha = 1;
    } else if (P.filter) {
      // 필터 장착만: 어두운 유리
      ctx.fillStyle = 'rgba(40,30,10,.55)'; ctx.fillRect(E.x, E.y, E.w, E.h);
      T(E.cx, E.cy - 6, '태양 필터를 끼웠어요', 16, '#fde68a', 'center', 800);
      T(E.cx, E.cy + 20, '이제 망원경으로 태양을 볼 수 있어요', 13.5, '#cbd5e1', 'center', 700);
    }
    ctx.restore();
    // 접안 렌즈 테두리 + 필터 링
    ctx.lineWidth = 8; ctx.strokeStyle = '#1e293b'; ctx.beginPath(); ctx.arc(E.cx, E.cy, E.er + 3, 0, TAU); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = P.filter ? '#f5c542' : '#475569'; ctx.beginPath(); ctx.arc(E.cx, E.cy, E.er - 2, 0, TAU); ctx.stroke();
    if (P.filter) { ctx.fillStyle = '#f5c542'; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; ctx.beginPath(); ctx.arc(E.cx + Math.cos(a) * (E.er + 3), E.cy + Math.sin(a) * (E.er + 3), 2.2, 0, TAU); ctx.fill(); } }
    // 경고 문구 (필터 없이)
    if (!P.filter) {
      const w = P.warn > 0 ? 0.6 + 0.4 * Math.sin(t * 22) : 1;
      D.label(E.cx, E.cy - 28, '⚠ 태양을 맨눈이나 필터 없는 망원경으로 보면 안 돼요', { bg: P.warn > 0 ? '#dc2626' : '#b45309', size: PHONE ? 12 : 13, color: '#fff' });
      D.label(E.cx, E.cy + 4, '눈을 크게 다칠 수 있어요. 먼저 필터를 끼워요', { bg: 'rgba(30,41,59,.9)', size: PHONE ? 12 : 13, color: '#fff' });
      if (P.warn > 0) { ctx.strokeStyle = 'rgba(220,38,38,' + w + ')'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(E.cx, E.cy, E.er - 6, 0, TAU); ctx.stroke(); }
    }
    T(E.x + 14, E.y + 24, P.filter ? '🕶 필터 있음' : '🕶 필터 없음', 14, P.filter ? '#fde68a' : '#fca5a5', 'left', 800);
  }
  function drawPhoto(dt, t) {
    const L = LPh(), P = S.ph;
    drawEyepiece(L, dt, t);
    drawIGraph(L.G, P.r, {});
    const B = L.B;
    panel(B.x, B.y, B.w, B.h, { r: 14, title: '광구 (태양의 눈에 보이는 표면)' });
    let y = B.y + 44 * FS;
    const tx = B.x + 14, tw = B.w - 28;
    y = drawWrap(tx, y, '· 두께 약 500 km, 표면 온도 약 5800 K인 얇은 층이라서 선명한 가장자리가 보여요.', tw, 13.5) + 22 * FS;
    y = drawWrap(tx, y, '· 가장자리는 시선이 비스듬해 더 높은(더 차가운) 층이 보이므로 어두워요. 이것이 주연 감광이에요.', tw, 13.5) + 22 * FS;
    drawWrap(tx, y, P.viewing ? '· 붉은 점을 움직이면 오른쪽 그래프에서 밝기를 읽을 수 있어요. 흑점은 시간이 지나면 왼쪽(동)에서 오른쪽(서)으로 움직여요.' : '· 필터를 끼우고 "망원경으로 태양 보기"를 누르면 광구가 보여요.', tw, 13.5, { color: '#0369a1', weight: 800 });
  }

  /* ================= ① 확대: 쌀알 무늬와 흑점 ================= */
  function LZm() {
    return PHONE
      ? { Lz: { x: 8, y: 8, w: 464, h: 390, cx: 240, cy: 206, R: 176 }, C: { x: 8, y: 406, w: 464, h: 250 }, B: { x: 8, y: 664, w: 464, h: 188 } }
      : { Lz: { x: 10, y: 8, w: 400, h: 400, cx: 210, cy: 208, R: 172 }, C: { x: 420, y: 8, w: 370, h: 250 }, B: { x: 420, y: 266, w: 370, h: 142 }, N: { x: 10, y: 416, w: 780, h: 196 } };
  }
  const PARC = []; for (let c = 0; c < 3; c++) for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) PARC.push({ ph: (k / 3 + (c * 0.13 + (sg > 0 ? 0.5 / 3 : 0))) % 1, cell: c, s: sg, sp: 0.9 + 0.05 * k });
  function drawZoom(dt, t) {
    const L = LZm(), Z = L.Lz;
    D.shadow(() => { ctx.fillStyle = '#0b1020'; rr(Z.x, Z.y, Z.w, Z.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); ctx.beginPath(); ctx.arc(Z.cx, Z.cy, Z.R, 0, TAU); ctx.clip();
    diskBase(Z.cx, Z.cy, Z.R * 1.0); ctx.fillStyle = 'rgba(255,200,110,.55)'; ctx.fillRect(Z.x, Z.y, Z.w, Z.h);
    granules(Z.cx, Z.cy, Z.R, t, 0.95, 1.4);
    // 흑점 (암부 + 반암부)
    const sx = Z.cx + Z.R * 0.28, sy = Z.cy + Z.R * 0.1, ru = Z.R * 0.17;
    const g = ctx.createRadialGradient(sx, sy, ru * 0.3, sx, sy, ru * 2.5);
    g.addColorStop(0, 'rgba(24,8,2,1)'); g.addColorStop(0.4, 'rgba(32,12,3,1)'); g.addColorStop(0.46, 'rgba(112,54,14,.97)'); g.addColorStop(0.85, 'rgba(160,84,26,.6)'); g.addColorStop(1, 'rgba(160,84,26,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, ru * 2.5, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = '#1e293b'; ctx.beginPath(); ctx.arc(Z.cx, Z.cy, Z.R + 2, 0, TAU); ctx.stroke();
    // 표시
    const sx2 = Z.cx + Z.R * 0.28, sy2 = Z.cy + Z.R * 0.1, ru2 = Z.R * 0.17;
    D.label(sx2 - ru2 * 0.1, sy2 + ru2 * 2.9 > Z.cy + Z.R - 14 ? sy2 + ru2 * 1.25 : sy2 + ru2 * 2.9, '암부 약 4000 K', { bg: '#7c2d12', size: 12.5 });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx2, sy2, ru2 * 2.5, 0, TAU); ctx.setLineDash([4, 5]); ctx.stroke(); ctx.setLineDash([]);
    D.label(sx2 + ru2 * 0.2, sy2 - ru2 * 2.5 - 12, '반암부', { bg: '#a16207', size: 12.5 });
    D.label(Z.cx - Z.R * 0.42, Z.cy - Z.R * 0.5, '쌀알 무늬: 광구 약 5800 K', { bg: '#b45309', size: 12.5 });
    // 눈금 (쌀알 지름 약 1000 km)
    const cellPx = 14.2 * (1.4 * Z.R * 2 / 256);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(Z.cx - Z.R * 0.7, Z.cy + Z.R * 0.78); ctx.lineTo(Z.cx - Z.R * 0.7 + cellPx, Z.cy + Z.R * 0.78); ctx.stroke();
    T(Z.cx - Z.R * 0.7 + cellPx / 2, Z.cy + Z.R * 0.78 - 8, '약 1000 km', 12, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.6)', strokeWidth: 3 });
    // 단면: 대류
    const C = L.C;
    panel(C.x, C.y, C.w, C.h, { r: 14, title: '쌀알 무늬의 단면: 대류' });
    const bx = C.x + 14, bw = C.w - 28, top = C.y + 38 * FS, bot = C.y + C.h - 50, nc = 3, cw = (bw - 120) / nc;
    ctx.save(); rr(bx, top, bw, bot - top, 10); ctx.clip();
    const bg = ctx.createLinearGradient(0, top, 0, bot); bg.addColorStop(0, '#fde68a'); bg.addColorStop(0.35, '#f59e0b'); bg.addColorStop(1, '#b45309'); ctx.fillStyle = bg; ctx.fillRect(bx, top, bw, bot - top);
    ctx.fillStyle = 'rgba(15,23,42,.55)'; ctx.fillRect(bx, top, bw, 18);
    ctx.restore();
    T(bx + 8, top + 13, '광구 표면 (약 500 km 두께)', 12, '#fff', 'left', 800);
    // 가스 알갱이: 중앙에서 상승(밝고 뜨거움), 가장자리에서 하강(어둡고 식음)
    const Hr = (bot - top - 66) / 2, ym = (top + bot) / 2 + 12;
    PARC.forEach((p) => {
      const a = (((RM ? 0 : t) * 0.9 * p.sp + p.ph) % 1) * TAU, cx_ = bx + 10 + cw * (p.cell + 0.5);
      const px = cx_ + p.s * (cw / 4) * (1 - Math.cos(a)), py = ym - Hr * Math.sin(a);
      const hot = a < Math.PI ? 1 - a / Math.PI : (a - Math.PI) / Math.PI;
      D.sphere(px, py, 4.4, mixc('#7c2d12', '#fff7c2', hot), { gloss: false });
    });
    for (let c = 0; c < nc; c++) D.arrow(bx + 10 + cw * (c + 0.5), top + 76 * FS, bx + 10 + cw * (c + 0.5), top + 30 * FS, { color: '#dc2626', width: 4, head: 11 });
    for (let c = 0; c <= nc; c++) D.arrow(bx + 10 + cw * c, top + 30 * FS, bx + 10 + cw * c, top + 76 * FS, { color: '#1d4ed8', width: 4, head: 11 });
    T(bx, bot + 20, '↑ 밝은 중심: 뜨거운 가스가 상승', 12.5, '#b91c1c', 'left', 800);
    T(bx, bot + 20 + 19 * Math.min(FS, 1.15), '↓ 어두운 경계: 식은 가스가 하강', 12.5, '#1d4ed8', 'left', 800);
    // 흑점 아래: 자기장
    const mx0 = bx + bw - 108;
    ctx.fillStyle = 'rgba(15,23,42,.35)'; rr(mx0, top + 20, 100, bot - top - 20, 8).fill();
    ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2.5; for (let k = 0; k < 4; k++) { const x = mx0 + 18 + k * 21; ctx.beginPath(); ctx.moveTo(x, top + 28); ctx.lineTo(x, bot - 6); ctx.stroke(); }
    T(mx0 + 50, top + 16, '흑점 아래', 12, '#fff', 'center', 800);
    T(mx0 + 50, (top + bot) / 2 + 8, '강한 자기장', 12, '#bbf7d0', 'center', 800, { stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 });
    // 막대: 온도 → 밝기
    const B = L.B;
    panel(B.x, B.y, B.w, B.h, { r: 14, title: '온도가 낮으면 밝기가 크게 줄어요' });
    const hx = B.x + 90, hw = B.w - 106, hy = B.y + 52 * FS;
    T(B.x + 12, hy + 14, '광구', 13, '#334155', 'left', 800); hbar(hx, hy, hw, 20, 1, 1, '#f59e0b'); T(hx + 8, hy + 15, '5800 K · 100 %', 12.5, '#fff', 'left', 800, { stroke: 'rgba(120,53,15,.7)', strokeWidth: 3 });
    const q = Math.pow(4000 / 5800, 4);
    T(B.x + 12, hy + 54, '흑점 암부', 13, '#334155', 'left', 800); hbar(hx, hy + 40, hw, 20, q, 1, '#7c2d12'); T(hx + q * hw + 8, hy + 55, '4000 K · 약 ' + Math.round(q * 100) + ' %', 12.5, '#7c2d12', 'left', 800);
    drawWrap(B.x + 14, hy + 90 * Math.min(FS, 1.1), '밝기는 T⁴에 비례해요: (4000 / 5800)⁴ = ' + f2(q), B.w - 28, 12.5, { color: '#475569' });
    if (L.N) {
      const N = L.N;
      panel(N.x, N.y, N.w, N.h, { r: 14, title: '쌀알 무늬와 흑점이 생기는 까닭' });
      let y = N.y + 44 * FS;
      y = drawWrap(N.x + 14, y, '· 쌀알 무늬: 광구 아래의 대류예요. 밝은 중심에서 뜨거운 가스가 올라오고, 어두운 경계에서 식은 가스가 내려가요. 쌀알의 지름은 약 1000 km, 수명은 약 5~10분이에요.', N.w - 28, 13.5) + 22 * FS;
      y = drawWrap(N.x + 14, y, '· 흑점: 강한 자기장(약 0.2~0.4 T)이 대류를 막아 열이 덜 올라와서 주위보다 온도가 낮아요. 구멍이 아니라 주위보다 어두울 뿐이에요.', N.w - 28, 13.5) + 22 * FS;
      drawWrap(N.x + 14, y, '· 약 4000 K인 암부도 스스로 빛을 내고 있어요(주위 광구의 약 23 % 밝기). 그래서 주위와 비교해야 검게 보여요.', N.w - 28, 13.5, { color: '#0369a1', weight: 800 });
    }
  }

  /* ================= ② 흑점 이동 기록 ================= */
  function LTr() {
    return PHONE
      ? { Dk: { x: 8, y: 8, w: 464, h: 340, cx: 240, cy: 164, R: 138 }, Tb: { x: 8, y: 356, w: 464, h: 304 }, In: { x: 8, y: 668, w: 464, h: 184 } }
      : { Dk: { x: 10, y: 8, w: 380, h: 380, cx: 200, cy: 176, R: 150 }, Tb: { x: 400, y: 8, w: 390, h: 336 }, In: { x: 10, y: 396, w: 380, h: 216 }, No: { x: 400, y: 352, w: 390, h: 260 } };
  }
  function trStats() {
    const ds = []; S.tr.rec.forEach((v, d) => { if (v != null) ds.push(d); });
    if (ds.length < 2) return { n: ds.length, avg: null };
    const d0 = ds[0], d1 = ds[ds.length - 1];
    return { n: ds.length, avg: (lonOf(S.tr.rec[d1]) - lonOf(S.tr.rec[d0])) / (d1 - d0), d0, d1 };
  }
  const trN = () => S.tr.rec.filter((v) => v != null).length;
  function trDisk(L, dt, t) {
    const K = L.Dk, Tr = S.tr;
    D.shadow(() => { ctx.fillStyle = '#0b1020'; rr(K.x, K.y, K.w, K.h, 14).fill(); }, { blur: 6, y: 2 });
    D.glow(K.cx, K.cy, K.R * 1.3, '#ffb703', 0.22);
    diskBase(K.cx, K.cy, K.R); granules(K.cx, K.cy, K.R, t, 0.22, 1.0);
    // 위도선, 중앙 자오선
    ctx.save(); ctx.beginPath(); ctx.arc(K.cx, K.cy, K.R, 0, TAU); ctx.clip();
    ctx.strokeStyle = 'rgba(80,30,0,.28)'; ctx.lineWidth = 1;
    [-60, -30, 0, 30, 60].forEach((ph) => { const y = K.cy - Math.sin(ph * DEG) * K.R; ctx.beginPath(); ctx.moveTo(K.cx - K.R, y); ctx.lineTo(K.cx + K.R, y); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(80,30,0,.4)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(K.cx, K.cy - K.R); ctx.lineTo(K.cx, K.cy + K.R); ctx.stroke(); ctx.setLineDash([]);
    // 흑점 A
    const lon = LON_A0 + W_A * Tr.day, q = sph(PHI_A, lon);
    spotAt(K.cx, K.cy, K.R, q.x, q.y, 8, 1);
    limbShade(K.cx, K.cy, K.R);
    ctx.restore();
    // 이미 기록한 위치
    Tr.rec.forEach((v, d) => {
      if (v == null) return;
      const px = K.cx + v * K.R, py = K.cy - Math.sin(PHI_A * DEG) * K.R;
      ctx.strokeStyle = d === Math.round(Tr.day) ? '#22c55e' : 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 7, 0, TAU); ctx.stroke();
      T(px, py - 12, String(d), 12, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.65)', strokeWidth: 3 });
    });
    // 눈금자 + 호버 십자선
    xRuler(K.cx, K.cy, K.R, K.cy + K.R + 20, '#e2e8f0');
    T(K.x + 14, K.y + 24, '날짜 ' + Math.round(Tr.day) + '일', 15, '#fde68a', 'left', 800);
    T(K.x + K.w - 14, K.y + 24, '동(왼쪽) → 서(오른쪽)', 12.5, '#cbd5e1', 'right', 800);
    if (Tr.hov && Math.hypot(Tr.hov.x - K.cx, Tr.hov.y - K.cy) <= K.R) {
      ctx.strokeStyle = 'rgba(56,189,248,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Tr.hov.x, K.cy - K.R); ctx.lineTo(Tr.hov.x, K.cy + K.R); ctx.stroke();
      D.label(clamp(Tr.hov.x, K.x + 60, K.x + K.w - 60), K.y + 50, 'x/R = ' + f2((Tr.hov.x - K.cx) / K.R).replace('-', '−'), { bg: '#0369a1', size: 12.5 });
    }
    if (Tr.bad > 0) { Tr.bad -= dt; D.label(K.cx, K.cy - K.R - 0, '흑점 A를 눌러 위치를 기록해요', { bg: '#dc2626', size: 13 }); }
    if (trN() === 0) T(K.cx, K.y + 48, '흑점 A의 중심을 눌러 x/R을 기록해요', 13, '#fde68a', 'center', 800);
  }
  function trTable(L) {
    const B = L.Tb, Tr = S.tr, st = trStats();
    panel(B.x, B.y, B.w, B.h, { r: 14, title: '📋 스프레드시트: 흑점 A (위도 10°)', tsize: PHONE ? 13 : 14 });
    const cols = [0.17, 0.25, 0.30, 0.28], x0 = B.x + 10, wAll = B.w - 20, hy = B.y + 34 * FS, rh = PHONE ? 19.5 : 21.5;
    let cx_ = x0; const cxs = cols.map((c) => { const o = cx_; cx_ += c * wAll; return [o, c * wAll]; });
    const heads = ['날짜(일)', 'x/R', '경도 λ (°)', '하루 이동 (°)'];
    ctx.fillStyle = '#e2e8f0'; rr(x0, hy, wAll, 22, 6).fill();
    heads.forEach((h, i) => T(cxs[i][0] + cxs[i][1] / 2, hy + 15, h, 12, '#334155', 'center', 800));
    for (let d = 0; d < DAYS; d++) {
      const y = hy + 24 + d * rh, v = Tr.rec[d], cur = d === Math.round(Tr.day);
      if (cur) { ctx.fillStyle = 'rgba(14,165,233,.14)'; rr(x0, y, wAll, rh - 1, 4).fill(); }
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y + rh - 0.5); ctx.lineTo(x0 + wAll, y + rh - 0.5); ctx.stroke();
      tc(cxs[0][0] + cxs[0][1] / 2, y + 15, String(d), 12.5, '#334155', 800);
      if (v != null) {
        tc(cxs[1][0] + cxs[1][1] / 2, y + 15, v.toFixed(3).replace('-', '−'), 12.5, '#0f172a', 800);
        tc(cxs[2][0] + cxs[2][1] / 2, y + 15, f1(lonOf(v)).replace('-', '−'), 12.5, '#0369a1', 800);
        const pv = Tr.rec[d - 1];
        if (pv != null) tc(cxs[3][0] + cxs[3][1] / 2, y + 15, f1(lonOf(v) - lonOf(pv)), 12.5, '#0369a1', 800); else tc(cxs[3][0] + cxs[3][1] / 2, y + 15, '—', 12.5, '#cbd5e1', 800);
      } else { for (let i = 1; i < 4; i++) tc(cxs[i][0] + cxs[i][1] / 2, y + 15, '—', 12.5, '#cbd5e1', 800); }
    }
    const fy = hy + 24 + DAYS * rh + 6;
    T(x0, fy + 12, 'λ = arcsin( x/R ÷ cos φ ), φ = 10°'.replace('÷', '/'), 12.5, '#0369a1', 'left', 800);
    const avgTxt = st.avg != null ? f1(st.avg) + ' °/일' : '기록 2개 이상 필요';
    T(x0, fy + 12 + 19 * Math.min(FS, 1.15), '평균 하루 이동 각도 = ' + avgTxt, 12.5, '#0f172a', 'left', 800);
  }
  function trInset(L, dt) {
    const I = L.In, Tr = S.tr;
    panel(I.x, I.y, I.w, I.h, { r: 14, title: '🌍 위에서 내려다본 태양과 지구' });
    const show = S.flags.inset || FREE();
    const cx = I.x + I.w * (PHONE ? 0.3 : 0.34), cy = I.y + I.h * 0.58 + 6, Rs = PHONE ? 30 : 34, Re = PHONE ? 66 : 74;
    if (!show) {
      drawWrap(I.x + 14, I.y + 56 * FS, '기록과 계산을 마치면 이 그림이 열려요. 지구도 태양 둘레를 돌고 있다는 점이 숫자에 영향을 줘요.', I.w - 28, 13.5, { color: '#64748b' });
      return;
    }
    const tEnd = 29;
    if (!RM) { Tr.simT += dt * 3.2; if (Tr.simT > tEnd + 2) Tr.simT = 0; } else Tr.simT = 27;
    const tt = Math.min(Tr.simT, tEnd), ts = tSid(PHI_A), ty = tSyn(PHI_A);
    const th_s = tt * omSid(PHI_A) * DEG, th_e = tt * OMEGA_E * DEG;
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(cx, cy, Re, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    D.arrow(cx + Rs + 2, cy, cx + Re + 52, cy, { color: '#94a3b8', width: 2, head: 8, dash: [5, 4] });
    T(cx + Re + 56, cy - 8, '먼 별', 12, '#64748b', 'left', 800); T(cx + Re + 56, cy + 7, '방향', 12, '#64748b', 'left', 800);
    D.glow(cx, cy, Rs * 2, '#ffb703', 0.4); D.sphere(cx, cy, Rs, '#ffb703', { gloss: true, light: '#fff3b0', dark: '#e07b00' });
    const ex = cx + Math.cos(th_e) * Re, ey = cy - Math.sin(th_e) * Re;
    ctx.strokeStyle = 'rgba(56,189,248,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
    D.sphere(ex, ey, 9, '#3b82f6', { gloss: true }); T(ex, ey - 14, '지구', 12, '#1d4ed8', 'center', 800);
    const sx = cx + Math.cos(th_s) * Rs, sy = cy - Math.sin(th_s) * Rs;
    D.sphere(sx, sy, 5.5, '#3b1d0a', { gloss: false }); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 5.5, 0, TAU); ctx.stroke();
    T(I.x + 14, I.y + I.h - 12, '경과 ' + f1(tt) + '일 · 흑점이 돈 각도 ' + f0(tt * omSid(PHI_A)) + '°', 12.5, '#334155', 'left', 800);
    const ly = I.y + 52 * FS;
    if (tt >= ts - 1e-6) D.label(I.x + I.w - 14, ly, '한 바퀴(360°): ' + f1(ts) + '일 = 항성 주기', { bg: '#16a34a', size: 12.5, align: 'right' });
    if (tt >= ty - 1e-6) D.label(I.x + I.w - 14, ly + 28, '다시 지구를 향함: ' + f1(ty) + '일 = 회합 주기', { bg: '#0369a1', size: 12.5, align: 'right' });
  }
  function drawTrack(dt, t) {
    const L = LTr(), Tr = S.tr;
    if (Tr.play) { Tr.pt = (Tr.pt || 0) + dt; if (Tr.pt > 0.75) { Tr.pt = 0; if (Tr.day < DAYS - 1) setDay(Tr.day + 1); else { Tr.play = false; updateCtl(); } } }
    trDisk(L, dt, t); trTable(L); trInset(L, dt);
    if (L.No) {
      const N = L.No; panel(N.x, N.y, N.w, N.h, { r: 14, title: '읽는 방법' });
      let y = N.y + 44 * FS;
      y = drawWrap(N.x + 14, y, '· 흑점의 가로 위치 x/R = cos φ × sin λ 예요. λ는 중앙 자오선에서 잰 경도라서 x/R에서 거꾸로 구해요.', N.w - 28, 13.5) + 22 * FS;
      y = drawWrap(N.x + 14, y, '· 하루에 움직인 경도가 일정하면 한 바퀴(360°)에 걸리는 시간 T = 360° / (하루 이동 각도)예요. 이것은 지구에서 본 겉보기(회합) 주기예요.', N.w - 28, 13.5) + 22 * FS;
      y = drawWrap(N.x + 14, y, '· 가장자리(|x/R| > 0.9)에서는 위치가 조금만 바뀌어도 경도가 크게 달라져서 값이 정확하지 않아요.', N.w - 28, 13.5) + 22 * FS;
      if (S.flags.inset || FREE()) drawWrap(N.x + 14, y, '· 지구도 같은 방향으로 공전하므로 1/T항성 = 1/T회합 + 1/365.25 → T항성 = ' + f1(1 / (1 / tSyn(PHI_A) + 1 / 365.25)) + '일', N.w - 28, 13.5, { color: '#0369a1', weight: 800 });
    }
  }
  function setDay(d) { S.tr.day = clamp(d, 0, DAYS - 1); const s = $('#sDay'); if (s) setSlider(s, $('#oDay'), S.tr.day, (v) => v + '일'); }

  /* ================= ③ 차등 자전: 위도별 주기 표 · 그래프 ================= */
  function LDf() {
    return PHONE
      ? { Tb: { x: 8, y: 8, w: 464, h: 224 }, Gr: { x: 8, y: 240, w: 464, h: 340 }, No: { x: 8, y: 588, w: 464, h: 264 } }
      : { Tb: { x: 10, y: 8, w: 780, h: 204 }, Gr: { x: 10, y: 220, w: 500, h: 392 }, No: { x: 518, y: 220, w: 272, h: 392 } };
  }
  const dfAll = () => SP4.every((s) => s.ok);
  function drawDiff(dt, t) {
    const L = LDf(), Tb = L.Tb;
    SP4.forEach((s) => { s.show = approach(s.show, s.ok ? 1 : 0, dt, 6); });
    panel(Tb.x, Tb.y, Tb.w, Tb.h, { r: 14, title: PHONE ? '📋 스프레드시트: 흑점 4개 (0일, 6일 영상)' : '📋 스프레드시트: 영상 두 장(0일, 6일)에서 읽은 흑점 4개', tsize: PHONE ? 12 : 14 });
    const heads = ['흑점', '위도 φ', 'x/R (0일)', 'x/R (6일)', 'λ (0일)', 'λ (6일)', '하루 이동', 'T회합(일)'];
    const ws = PHONE ? [0.1, 0.1, 0.13, 0.13, 0.12, 0.12, 0.14, 0.16] : [0.08, 0.1, 0.13, 0.13, 0.12, 0.12, 0.15, 0.17];
    const x0 = Tb.x + 10, wAll = Tb.w - 20, hy = Tb.y + 34 * FS; let cx_ = x0;
    const cxs = ws.map((c) => { const o = cx_ + (c * wAll) / 2; cx_ += c * wAll; return o; });
    ctx.fillStyle = '#e2e8f0'; rr(x0, hy, wAll, PHONE ? 30 : 24, 6).fill();
    heads.forEach((h, i) => {
      if (PHONE && h.indexOf(' (') > 0) { const a = h.split(' ('); T(cxs[i], hy + 12, a[0], 11, '#334155', 'center', 800); T(cxs[i], hy + 25, '(' + a[1], 11, '#334155', 'center', 800); } else T(cxs[i], hy + (PHONE ? 19 : 16), h, PHONE ? 11 : 12, '#334155', 'center', 800);
    });
    const rh = PHONE ? 31 : 30;
    SP4.forEach((s, i) => {
      const y = hy + (PHONE ? 34 : 28) + i * rh;
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y + rh - 1); ctx.lineTo(x0 + wAll, y + rh - 1); ctx.stroke();
      const cy_ = y + rh / 2 + 4, sz = PHONE ? 12 : 13;
      D.sphere(cxs[0], cy_ - 4, 7, s.col, { gloss: false });
      tc(cxs[1], cy_, s.phi + '°', sz, '#0f172a', 800);
      tc(cxs[2], cy_, s.x0.toFixed(3).replace('-', '−'), sz, '#0f172a', 800); tc(cxs[3], cy_, s.x6.toFixed(3).replace('-', '−'), sz, '#0f172a', 800);
      tc(cxs[4], cy_, f1(s.l0).replace('-', '−') + '°', sz, '#0369a1', 800); tc(cxs[5], cy_, f1(s.l6).replace('-', '−') + '°', sz, '#0369a1', 800);
      tc(cxs[6], cy_, f2(s.om) + '°', sz, '#0369a1', 800);
      if (s.ok) tc(cxs[7], cy_, f1(s.T), sz, '#15803d', 800); else tc(cxs[7], cy_, '?', sz + 2, '#f59e0b', 800);
    });
    T(x0, Tb.y + Tb.h - 8, PHONE ? 'λ = arcsin( x/R / cos φ ), T = 360° / 하루 이동' : '경도 λ = arcsin( x/R / cos φ ), 하루 이동 = (λ(6일) − λ(0일)) / 6, T회합 = 360° / (하루 이동)', PHONE ? 11 : 12.5, '#0369a1', 'left', 800);
    // 그래프
    const G = L.Gr;
    panel(G.x, G.y, G.w, G.h, { r: 14, title: '위도 – 회합 주기 그래프', tsize: 14 });
    const gx0 = G.x + 54, gx1 = G.x + G.w - 22, gy0 = G.y + (PHONE ? 64 : 52), gy1 = G.y + G.h - 56;
    const X = (p) => gx0 + p / 50 * (gx1 - gx0), Y = (v) => gy1 - (v - 26) / 5 * (gy1 - gy0);
    for (let v = 26; v <= 31; v++) { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, Y(v)); ctx.lineTo(gx1, Y(v)); ctx.stroke(); T(gx0 - 8, Y(v) + 4, String(v), 12, '#64748b', 'right', 700); }
    for (let p = 0; p <= 50; p += 10) { ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(X(p), gy0); ctx.lineTo(X(p), gy1); ctx.stroke(); T(X(p), gy1 + 17, p + '°', 12, '#64748b', 'center', 700); }
    T((gx0 + gx1) / 2, gy1 + 38, '태양의 위도 φ (적도 0° → 극 쪽)', 12.5, '#475569', 'center', 800);
    T(gx0 - 42, gy0 - 14, '회합 주기 (일)', 12.5, '#475569', 'left', 800);
    const allOk = dfAll();
    if (allOk) { const pts = []; for (let p = 0; p <= 50; p += 2) pts.push([X(p), Y(tSyn(p))]); line(pts, 'rgba(100,116,139,.55)', 3, { dash: [7, 5] }); T(X(50) - 4, Y(tSyn(50)) - 14, '경향선', 12.5, '#475569', 'right', 800); }
    SP4.forEach((s) => {
      if (s.show < 0.02) return;
      const px = X(s.phi), py = Y(s.T), sc = 0.4 + 0.6 * smooth(s.show);
      ctx.save(); ctx.globalAlpha = Math.min(1, s.show * 1.4);
      D.shadow(() => D.sphere(px, py + (1 - sc) * -30, 10 * sc, s.col, { gloss: true }), { blur: 5, y: 2 });
      T(px, py - 16, f1(s.T) + '일', 12.5, s.col, 'center', 800, { stroke: '#fff', strokeWidth: 3 });
      ctx.restore();
    });
    if (!allOk) T((gx0 + gx1) / 2, (gy0 + gy1) / 2, '표의 T를 계산해 입력하면 점이 찍혀요', 13.5, '#94a3b8', 'center', 800);
    // 오른쪽 설명
    const N = L.No;
    panel(N.x, N.y, N.w, N.h, { r: 14, title: allOk ? '그래프에서 읽기' : '계산 도우미' });
    let y = N.y + 44 * FS; const nw = N.w - 28;
    if (!allOk) {
      y = drawWrap(N.x + 14, y, '1. 표의 "하루 이동" 칸은 스프레드시트가 계산했어요.', nw, 13.5) + 22 * FS;
      y = drawWrap(N.x + 14, y, '2. T회합 = 360° / (하루 이동)을 직접 계산해 오른쪽 아래 칸에 입력해요 (소수 첫째 자리).', nw, 13.5) + 22 * FS;
      drawWrap(N.x + 14, y, '3. 4개를 모두 맞히면 점이 그래프로 날아가 찍혀요.', nw, 13.5, { color: '#0369a1', weight: 800 });
    } else {
      y = drawWrap(N.x + 14, y, '· 적도 쪽 흑점은 ' + f1(SP4[0].T) + '일, 위도 45° 흑점은 ' + f1(SP4[3].T) + '일 만에 한 바퀴 돌아요.', nw, 13.5) + 22 * FS;
      y = drawWrap(N.x + 14, y, '· 점들이 오른쪽 위로 올라가요: 고위도일수록 주기가 길어요.', nw, 13.5, { color: '#0369a1', weight: 800 }) + 22 * FS;
      y = drawWrap(N.x + 14, y, '· 지구의 공전을 빼면 항성 주기는 ' + SP4.map((s) => f1(s.Tsid)).join(' · ') + '일이에요.', nw, 13.5) + 22 * FS;
      drawWrap(N.x + 14, y, '· 실제 태양은 극 부근에서 항성 주기가 약 35일까지 길어져요.', nw, 13.5, { color: '#475569' });
    }
  }

  /* ================= ③ 위성 영상 합성: 같은 경도의 세로선 추적 ================= */
  const LON_L0 = -50;
  const cLon = (phi, day) => LON_L0 + omSyn(phi) * day;
  function lineAt(cx, cy, R, day, col, lw, o) {
    o = o || {};
    const pts = []; let seg = [];
    for (let ph = -78; ph <= 78; ph += 3) {
      const lon = o.rigid ? LON_L0 + omSyn(0) * day : cLon(ph, day);
      if (Math.abs(lon) < 89) { const q = sph(ph, lon); seg.push([cx + q.x * R, cy - q.y * R]); } else if (seg.length) { pts.push(seg); seg = []; }
    }
    if (seg.length) pts.push(seg);
    pts.forEach((sg) => line(sg, col, lw, { dash: o.dash, alpha: o.alpha }));
  }
  function gridLines(cx, cy, R, a) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip(); ctx.strokeStyle = 'rgba(80,30,0,' + a + ')'; ctx.lineWidth = 1;
    [-60, -30, 0, 30, 60].forEach((ph) => { const y = cy - Math.sin(ph * DEG) * R; ctx.beginPath(); ctx.moveTo(cx - R, y); ctx.lineTo(cx + R, y); ctx.stroke(); });
    ctx.restore();
  }
  function LCm() {
    return PHONE
      ? { M: { x: 8, y: 8, w: 464, h: 470, cx: 240, cy: 250, R: 205 }, Th: { x: 8, y: 486, w: 464, h: 190 }, No: { x: 8, y: 684, w: 464, h: 168 } }
      : { M: { x: 10, y: 8, w: 500, h: 604, cx: 260, cy: 310, R: 218 }, Th: { x: 518, y: 8, w: 272, h: 388 }, No: { x: 518, y: 404, w: 272, h: 208 } };
  }
  function drawCompose(dt, t) {
    const L = LCm(), M = L.M, Df = S.df;
    if (Df.play) { Df.cDay = Math.min(7, Df.cDay + dt * 0.9); if (Df.cDay >= 7) { Df.play = false; updateCtl(); } setCDay(Df.cDay, true); }
    Df.cMax = Math.max(Df.cMax, Df.cDay);
    D.shadow(() => { ctx.fillStyle = '#0b1020'; rr(M.x, M.y, M.w, M.h, 14).fill(); }, { blur: 6, y: 2 });
    D.glow(M.cx, M.cy, M.R * 1.25, '#ffb703', 0.2); diskBase(M.cx, M.cy, M.R); granules(M.cx, M.cy, M.R, t, 0.18, 1.0); gridLines(M.cx, M.cy, M.R, 0.25);
    ctx.save(); ctx.beginPath(); ctx.arc(M.cx, M.cy, M.R, 0, TAU); ctx.clip();
    const di = Math.floor(Df.cDay + 1e-6);
    for (let d = 0; d <= di; d++) if (d < Df.cDay - 0.02) lineAt(M.cx, M.cy, M.R, d, '#1e3a8a', 2, { alpha: 0.35 });
    lineAt(M.cx, M.cy, M.R, Df.cDay, 'rgba(255,255,255,.9)', 7);
    lineAt(M.cx, M.cy, M.R, Df.cDay, '#1d4ed8', 4);
    if (Df.cDay > 0.05) lineAt(M.cx, M.cy, M.R, Df.cDay, '#dc2626', 3, { rigid: true, dash: [7, 6] });
    ctx.restore();
    limbShade(M.cx, M.cy, M.R);
    T(M.x + 14, M.y + 24, '경과 ' + f1(Df.cDay) + '일', 15, '#fde68a', 'left', 800);
    D.label(M.x + M.w - 14, M.y + 24, '파랑: 실제로 움직인 선', { bg: '#1d4ed8', size: 12.5, align: 'right' });
    D.label(M.x + M.w - 14, M.y + 52, '빨강 점선: 굳은 공이라면', { bg: '#dc2626', size: 12.5, align: 'right' });
    D.label(M.cx, M.y + M.h - 22, '처음에는 경도 −50°의 세로선(투영돼서 휘어 보여요)에서 출발해요', { bg: 'rgba(15,23,42,.85)', size: 12.5 });
    // 썸네일: 0~7일 영상 8장
    const Th = L.Th, cols = PHONE ? 4 : 2, rows = 8 / cols, rad = PHONE ? 34 : 33;
    panel(Th.x, Th.y, Th.w, Th.h, { r: 14, title: '7일 동안의 영상 8장', tsize: 13.5 });
    for (let d = 0; d <= 7; d++) {
      const gx = Th.x + (Th.w / cols) * ((d % cols) + 0.5), gy = Th.y + 44 * FS + ((Th.h - 44 * FS) / rows) * (Math.floor(d / cols) + 0.5) - 4;
      diskBase(gx, gy, rad); ctx.save(); ctx.beginPath(); ctx.arc(gx, gy, rad, 0, TAU); ctx.clip(); lineAt(gx, gy, rad, d, '#1d4ed8', 2.4); ctx.restore();
      ctx.strokeStyle = d <= Df.cDay + 1e-6 ? '#1d4ed8' : 'rgba(100,116,139,.3)'; ctx.lineWidth = d === di ? 3.5 : 1.5; ctx.beginPath(); ctx.arc(gx, gy, rad + 2, 0, TAU); ctx.stroke();
      T(gx, gy + rad + (PHONE ? 15 : 14), d + '일', 12, d <= Df.cDay + 1e-6 ? '#1d4ed8' : '#94a3b8', 'center', 800);
    }
    const N = L.No;
    panel(N.x, N.y, N.w, N.h, { r: 14, title: '읽는 방법' });
    let y = N.y + 44 * FS;
    y = drawWrap(N.x + 14, y, '· 적도: 하루 ' + f1(omSyn(0)) + '° 이동', N.w - 28, 13.5) + 20 * FS;
    y = drawWrap(N.x + 14, y, '· 위도 45°: 하루 ' + f1(omSyn(45)) + '° 이동 (회합)', N.w - 28, 13.5) + 22 * FS;
    drawWrap(N.x + 14, y, Df.cDay >= 6.9 ? '7일 뒤: 위도 45°의 선이 적도보다 뒤처져 선이 휘었어요. 위도마다 다른 속도로 돌아요.' : '슬라이더를 7일까지 움직이거나 재생해서 선이 어떻게 변하는지 보세요.', N.w - 28, 13.5, { color: '#0369a1', weight: 800 });
  }
  function setCDay(v, quiet) { S.df.cDay = clamp(v, 0, 7); const s = $('#sCd'); if (s) setSlider(s, $('#oCd'), Math.round(S.df.cDay * 10) / 10, (x) => f1(x) + '일'); }

  /* ================= ④ 활동 주기: 흑점 수 곡선 · 나비 도표 ================= */
  function LCy() {
    return PHONE
      ? { Ch: { x: 8, y: 8, w: 464, h: 306 }, Bf: { x: 8, y: 322, w: 464, h: 268 }, Bt: { x: 8, y: 598, w: 464, h: 254 } }
      : { Ch: { x: 10, y: 8, w: 780, h: 262 }, Bf: { x: 10, y: 278, w: 780, h: 238 }, Bt: { x: 10, y: 524, w: 780, h: 88 } };
  }
  const cyGeom = (P) => ({ x0: P.x + 52, x1: P.x + P.w - 18, X: (y) => P.x + 52 + (y - YR0) / (YR1 - YR0) * (P.w - 70) });
  const cyYearAt = (px, P) => YR0 + (px - (P.x + 52)) / (P.w - 70) * (YR1 - YR0);
  const markOK = () => { const m = S.cy.marks; return m.length === 3 && m.every((y, i) => Math.abs(y - PEAKS[i].y) < 0.45); };
  const markMean = () => { const m = S.cy.marks; return m.length === 3 ? (m[2] - m[0]) / 2 : null; };
  function addMark(yr) {
    const k0 = Math.round((yr - YR0) * 12); let best = -1, bk = -1;
    for (let k = Math.max(0, k0 - 18); k <= Math.min(SSN.length - 1, k0 + 18); k++) if (smoothSSN(k) > best) { best = smoothSSN(k); bk = k; }
    const y = YR0 + bk / 12, C = S.cy;
    C.marks = C.marks.filter((m) => Math.abs(m - y) > 3);
    if (C.marks.length >= 3) C.marks = [];
    C.marks.push(y); C.marks.sort((a, b) => a - b);
    return y;
  }
  function drawCycle(dt, t) {
    const L = LCy(), Ch = L.Ch, Bf = L.Bf, Bt = L.Bt, C = S.cy, g = cyGeom(Ch);
    // 위: 월평균 흑점 수
    panel(Ch.x, Ch.y, Ch.w, Ch.h, { r: 14, title: '월평균 흑점 수 (교육용 합성 자료)', tsize: PHONE ? 12.5 : 14 });
    const cy0 = Ch.y + (PHONE ? 60 : 46), cy1 = Ch.y + Ch.h - 34, Y = (v) => cy1 - v / 220 * (cy1 - cy0);
    for (let v = 0; v <= 200; v += 50) { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x0, Y(v)); ctx.lineTo(g.x1, Y(v)); ctx.stroke(); T(g.x0 - 8, Y(v) + 4, String(v), 12, '#64748b', 'right', 700); }
    for (let y = 2000; y <= 2025; y += 5) { ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(g.X(y), cy0); ctx.lineTo(g.X(y), cy1); ctx.stroke(); }
    for (let y = 2000; y <= 2025; y += 5) T(g.X(y), cy1 + 18, String(y), 12, '#64748b', 'center', 700);
    const pts = SSN.map((v, k) => [g.X(YR0 + k / 12), Y(v)]);
    ctx.save(); ctx.beginPath(); ctx.rect(g.x0, cy0 - 4, g.x1 - g.x0, cy1 - cy0 + 4); ctx.clip();
    const fg = ctx.createLinearGradient(0, cy0, 0, cy1); fg.addColorStop(0, 'rgba(245,158,11,.35)'); fg.addColorStop(1, 'rgba(245,158,11,.04)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(pts[0][0], cy1); pts.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(pts[pts.length - 1][0], cy1); ctx.closePath(); ctx.fill();
    line(pts, '#d97706', 1.8);
    ctx.restore();
    T(g.x0 - 42, cy0 - 10, '흑점 수', 12.5, '#475569', 'left', 800);
    T(g.x1, cy1 + 34, '연도', 12.5, '#475569', 'right', 800);
    // 극대 표시
    C.marks.forEach((m, i) => {
      const k = Math.round((m - YR0) * 12), x = g.X(m), y = Y(SSN[k]);
      ctx.setLineDash([5, 4]); line([[x, cy0 - 2], [x, cy1]], '#dc2626', 2); ctx.setLineDash([]);
      D.sphere(x, y, 6, '#ef4444', { gloss: true });
      D.label(clamp(x, g.x0 + 28, g.x1 - 28), cy0 - 2 + (i % 2) * 0, f1(m), { bg: '#dc2626', size: 12.5 });
    });
    for (let i = 1; i < C.marks.length; i++) {
      const xa = g.X(C.marks[i - 1]), xb = g.X(C.marks[i]), yy = cy1 - 12;
      line([[xa + 4, yy], [xb - 4, yy]], '#dc2626', 2); D.arrow(xb - 4, yy, xb - 12, yy, { color: '#dc2626', width: 2, head: 7 });
      T((xa + xb) / 2, yy - 6, f1(C.marks[i] - C.marks[i - 1]) + '년', 12.5, '#b91c1c', 'center', 800, { stroke: '#fff', strokeWidth: 3 });
    }
    // 커서
    const xc = g.X(C.yr), kc = Math.round((C.yr - YR0) * 12);
    ctx.setLineDash([3, 4]); line([[xc, cy0 - 2], [xc, Bf.y + Bf.h - 30]], 'rgba(14,165,233,.9)', 1.8); ctx.setLineDash([]);
    D.sphere(xc, Y(SSN[clamp(kc, 0, SSN.length - 1)]), 5.5, '#0ea5e9', { gloss: true });
    if (C.marks.length === 0) T(g.x1 - 4, cy0 + 12, PHONE ? '곡선의 극대 근처를 눌러요' : '곡선의 극대(봉우리) 근처를 눌러 세 번 표시해요', 12.5, '#94a3b8', 'right', 800);

    // 아래: 나비 도표
    panel(Bf.x, Bf.y, Bf.w, Bf.h, { r: 14, title: '나비 도표: 흑점이 나타나는 위도', tsize: PHONE ? 12.5 : 14 });
    const by0 = Bf.y + (PHONE ? 60 : 44), by1 = Bf.y + Bf.h - 30, YL = (lat) => (by0 + by1) / 2 - lat / 40 * ((by1 - by0) / 2);
    [-30, -10, 0, 10, 30].forEach((la) => { ctx.strokeStyle = la === 0 ? '#94a3b8' : '#e2e8f0'; ctx.lineWidth = la === 0 ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(g.x0, YL(la)); ctx.lineTo(g.x1, YL(la)); ctx.stroke(); T(g.x0 - 8, YL(la) + 4, (la > 0 ? '+' : la < 0 ? '−' : '') + Math.abs(la) + '°', 12, '#64748b', 'right', 700); });
    for (let y = 2000; y <= 2025; y += 5) { ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(g.X(y), by0); ctx.lineTo(g.X(y), by1); ctx.stroke(); }
    ctx.save(); ctx.beginPath(); ctx.rect(g.x0, by0 - 2, g.x1 - g.x0, by1 - by0 + 4); ctx.clip();
    BFLY.forEach((b) => { ctx.fillStyle = b.lat > 0 ? 'rgba(217,119,6,.55)' : 'rgba(13,148,136,.55)'; ctx.beginPath(); ctx.arc(g.X(b.y), YL(clamp(b.lat, -40, 40)), 1.9, 0, TAU); ctx.fill(); });
    ctx.restore();
    T(g.x0 - 42, by0 - 8, '위도', 12.5, '#475569', 'left', 800);
    D.label(g.x1 - 4, by0 + 12, '주황: 북반구 · 청록: 남반구', { bg: '#475569', size: 12, align: 'right' });
    // 아래 패널: 작은 태양
    const sunY = Bt.y + (PHONE ? 78 : 44), sunR = PHONE ? 46 : 32, sx = Bt.x + 26 + sunR;
    panel(Bt.x, Bt.y, Bt.w, Bt.h, { r: 14 });
    const n = ssnAt(C.yr), cnt = Math.round(n / 22);
    diskBase(sx, sunY, sunR); const rg = rng(99);
    for (let i = 0; i < cnt; i++) { const a = rg() * TAU, rd = Math.sqrt(rg()) * 0.8; spotAt(sx, sunY, sunR, Math.cos(a) * rd, Math.sin(a) * rd * 0.8, 2.4 + rg() * 2.2, 1); }
    limbShade(sx, sunY, sunR);
    // 플레어: 흑점 수가 많을수록 자주
    C.flare = Math.max(0, C.flare - dt * 2.2);
    if (!RM && Math.random() < dt * Math.pow(n / 100, 2) * 2.4) { C.flare = 1; C.fa = Math.random() * TAU; }
    if (C.flare > 0.02) { const fx = sx + Math.cos(C.fa) * sunR * 0.95, fy = sunY + Math.sin(C.fa) * sunR * 0.95; D.glow(fx, fy, sunR * 0.9 * C.flare + 6, '#fff7c2', 0.9 * C.flare); }
    const tx = sx + sunR + 22, tw = Bt.w - (tx - Bt.x) - 14;
    T(tx, Bt.y + 24 * FS, f1(C.yr) + '년 · 월평균 흑점 수 ' + n, 14.5, '#0f172a', 'left', 800);
    let yy = Bt.y + 24 * FS + 22 * FS;
    yy = drawWrap(tx, yy, '흑점이 많은 극대기에는 플레어·코로나 물질 방출(CME)이 잦아요(작은 태양의 번쩍임).', tw, 13);
    drawWrap(tx, yy + 20 * FS, '1645~1715년 마운더 극소기에는 흑점이 거의 보이지 않았어요.', tw, 13, { color: '#475569' });
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
  const setFilter = (on) => {
    const P = S.ph; P.filter = on;
    if (!on && P.viewing) { P.viewing = false; P.warn = 2.5; say('필터를 빼면 안 돼요! 태양을 볼 때는 항상 필터를 끼워 둬요', true, 3.2); }
    updateCtl();
  };
  function updateCtl() {
    const free = FREE(), P = S.ph;
    if (free && !P.viewing) { P.filter = true; P.viewing = true; }
    const list = free ? ['photo', 'zoom', 'track', 'diff', 'compose', 'cycle'] : viewList;
    if (modeSeg.children.length !== list.length || Array.from(modeSeg.children).some((b, i) => b.dataset.view !== list[i])) { viewList = list; buildSeg(); }
    modeSeg.hidden = list.length < 2;
    modeBtns().forEach((b) => { b.classList.toggle('on', b.dataset.view === S.view); b.disabled = b.dataset.view === 'zoom' && !P.viewing; });
    if (list.indexOf(S.view) < 0) { S.view = list[0]; S.fade = 1; }
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#rBox').hidden = !(S.view === 'photo' && (P.viewing || free));
    $('#calcI').hidden = !(S.view === 'photo' && (S.flags.calcI || free));
    $('#calcT').hidden = !(S.view === 'track' && (S.flags.calcT || free));
    $('#trendBox').hidden = !(S.view === 'diff' && (S.flags.pickTrend || free));
    $('#calcP').hidden = !(S.view === 'cycle' && (S.flags.calcP || free));
    $('#bfBox').hidden = !(S.view === 'cycle' && (S.flags.pickBf || free));
    $('#bFilter').textContent = P.filter ? '🕶 필터 빼기' : '🕶 태양 필터 끼우기';
    $('#bFilter').classList.toggle('on', P.filter);
    $('#bPlay').textContent = S.tr.play ? '⏸ 멈춤' : '▶ 10일 재생';
    $('#bPlayC').textContent = S.df.play ? '⏸ 멈춤' : '▶ 재생';
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#grpTrend .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.df.trend));
    $$('#grpBf .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.cy.bf));
  }
  sl('#sR', '#oR', (v) => f2(v), (v) => { S.ph.r = v; });
  sl('#sDay', '#oDay', (v) => v + '일', (v) => { S.tr.day = v; });
  sl('#sCd', '#oCd', (v) => f1(v) + '일', (v) => { S.df.cDay = v; S.df.play = false; updateCtl(); });
  sl('#sYr', '#oYr', (v) => f1(v) + '년', (v) => { S.cy.yr = v; });
  clickable($('#bFilter'), () => setFilter(!S.ph.filter));
  clickable($('#bScope'), () => {
    const P = S.ph;
    if (!P.filter) { P.warn = 2.5; P.viewing = false; say('안 돼요! 필터 없이 태양을 보면 눈을 크게 다쳐요. 먼저 필터를 끼워요', true, 3.4); Sound.fail && Sound.fail(); return; }
    P.viewing = true; updateCtl();
  });
  clickable($('#bPlay'), () => { const Tr = S.tr; Tr.play = !Tr.play; if (Tr.play && Tr.day >= DAYS - 1) setDay(0); Tr.pt = 0; updateCtl(); });
  clickable($('#bClr'), () => { S.tr.rec = new Array(DAYS).fill(null); S.tr.angOk = false; S.tr.tOk = false; clrIn('inAng', 'inTs'); });
  clickable($('#bPlayC'), () => { const Df = S.df; Df.play = !Df.play; if (Df.play && Df.cDay >= 7) setCDay(0); updateCtl(); });
  clickable($('#bClrM'), () => { S.cy.marks = []; S.cy.pOk = false; clrIn('inP'); });
  $$('#grpTrend .opt').forEach((b) => clickable(b, () => { S.df.trend = +b.dataset.k; updateCtl(); }));
  $$('#grpBf .opt').forEach((b) => clickable(b, () => { S.cy.bf = +b.dataset.k; updateCtl(); }));
  // 숫자 입력 확인
  $('#inI').addEventListener('input', () => { const v = numOf('inI'); if (v != null && near(S.ph.r, 0.9, 0.011) && near(v, limb(0.9) * 100, 2)) { S.ph.iOk = true; fbIn('inI', true); } });
  $('#inAng').addEventListener('input', () => { const st = trStats(), v = numOf('inAng'); if (st.avg != null && near(v, st.avg, 0.4)) { S.tr.angOk = true; fbIn('inAng', true); } });
  $('#inTs').addEventListener('input', () => { const st = trStats(), v = numOf('inTs'); if (st.avg != null && near(v, 360 / st.avg, 0.5)) { S.tr.tOk = true; fbIn('inTs', true); } });
  [0, 1, 2, 3].forEach((i) => $('#inT' + i).addEventListener('input', () => { const was = dfAll(); SP4[i].ok = near(numOf('inT' + i), SP4[i].T, 0.3); if (SP4[i].ok) { fbIn('inT' + i, true); if (!was && dfAll()) say('4개 모두 맞았어요! 점이 그래프에 찍혀요', false, 2.4); } }));
  $('#inP').addEventListener('input', () => { const v = numOf('inP'), m = markMean(); if (m != null && near(v, m, 0.5)) { S.cy.pOk = true; fbIn('inP', true); } });

  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'track') {
        const L = LTr(), K = L.Dk, Tr = S.tr, lon = LON_A0 + W_A * Tr.day, q = sph(PHI_A, lon);
        const px = K.cx + q.x * K.R, py = K.cy - q.y * K.R;
        if (Math.hypot(p.x - K.cx, p.y - K.cy) > K.R + 6) return false;
        if (Math.hypot(p.x - px, p.y - py) <= 26) {
          const d = Math.round(Tr.day); Tr.rec[d] = xA(d); Sound.click();
          parts.burst(px, py, { count: 12, color: '#fde68a', speed: 70, life: 0.6 });
          if (!Tr.play && d < DAYS - 1 && !FREE() && trN() < 5) setTimeout(() => { if (S.view === 'track' && Math.round(S.tr.day) === d) setDay(d + 1); }, 450);
        } else { Tr.bad = 1.6; Sound.fail && Sound.fail(); }
        return false;
      }
      if (S.view === 'cycle') {
        const L = LCy(), g = cyGeom(L.Ch);
        if (p.x > g.x0 - 4 && p.x < g.x1 + 4) {
          if (p.y >= L.Ch.y + 30 && p.y <= L.Ch.y + L.Ch.h) { const y = addMark(cyYearAt(p.x, L.Ch)); S.cy.yr = clamp(y, YR0, YR1); setSlider($('#sYr'), $('#oYr'), Math.round(S.cy.yr * 10) / 10, (v) => f1(v) + '년'); S.cy.pOk = false; Sound.click(); }
          else if (p.y >= L.Bf.y && p.y <= L.Bf.y + L.Bf.h) { S.cy.yr = clamp(cyYearAt(p.x, L.Bf), YR0, YR1); setSlider($('#sYr'), $('#oYr'), Math.round(S.cy.yr * 10) / 10, (v) => f1(v) + '년'); Sound.click(); }
        }
        return false;
      }
      return false;
    },
    move() {},
    up() {},
    hover(p) {
      if (S.view === 'track') { S.tr.hov = p; const K = LTr().Dk; return Math.hypot(p.x - K.cx, p.y - K.cy) <= K.R ? 'crosshair' : ''; }
      if (S.view === 'cycle') { const L = LCy(), g = cyGeom(L.Ch); return p.x > g.x0 && p.x < g.x1 && p.y > L.Ch.y + 30 && p.y < L.Bf.y + L.Bf.h ? 'pointer' : ''; }
      return '';
    },
  });
  view.canvas.addEventListener('pointerleave', () => { S.tr.hov = null; });

  /* ================= 미션 ================= */
  const mkLevel = (o) => o;
  const levels = [
    {
      title: '광구 관찰: 필터, 쌀알 무늬, 흑점', short: '광구 관찰', icon: '🔭', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 흑점이 움직이는 속도로 태양이 자전하는 빠르기를 알 수 있을까? 태양은 단단한 공처럼 돌까?</p>' +
        '<div class="si-link">🔗 <b>중학교 태양 활동</b>에서 쌀알 무늬와 흑점을 배웠고, <b>일반선택 지구과학의 흑체 복사</b>에서 표면 온도가 낮으면 방출하는 에너지가 크게 줄어든다(∝ T⁴)는 것을 배웠어요. 이번에는 이것을 <b>숫자로 읽고 재서</b> 태양의 자전을 알아내요.</div>' +
        '<p>태양은 눈에 보이는 얇은 층인 <b>광구</b>에서 빛을 내요. <b>반드시 태양 필터를 낀 망원경</b>으로 관측하고, 필터 없이 태양을 보면 눈을 크게 다쳐요. 광구에서 쌀알 무늬, 가장자리의 어두워짐(주연 감광), 흑점을 살펴봐요.</p>',
      features: ['photo'],
      setup() { const P = S.ph; P.filter = false; P.viewing = false; P.vis = 0; P.r = 0.5; P.iOk = false; S.flags.calcI = false; setSlider($('#sR'), $('#oR'), 0.5, (v) => f2(v)); clrIn('inI'); setViews(['photo', 'zoom']); setView('photo'); },
      recap: '광구는 필터를 낀 망원경으로 관측해요. 가장자리는 더 차가운 높은 층이 보여 어둡고(주연 감광), 흑점은 약 4000 K로 주위(5800 K)보다 차가워서 어둡게 보여요.',
      summary: '<ul><li><b>안전</b>: 태양은 반드시 태양 필터(또는 투영판)를 쓰고 관측해요. 맨눈이나 필터 없는 망원경으로는 절대 보지 않아요.</li><li><b>광구</b>: 두께 약 500 km, 표면 온도 약 5800 K. <b>쌀알 무늬</b>(지름 약 1000 km, 수명 5~10분)는 대류예요 — 밝은 중심에서 뜨거운 가스가 올라오고 어두운 경계에서 식은 가스가 내려가요.</li><li><b>주연 감광</b>: I(r)/I(0) = 1 − 0.6(1 − √(1 − r²)). r = 0.9에서 약 66 %. 가장자리는 시선이 비스듬해 더 높고 차가운 층이 보여서 어두워요.</li><li><b>흑점</b>: 암부 약 4000 K, 밝기는 주위의 (4000 / 5800)⁴ ≈ 23 %. 강한 자기장(약 0.2~0.4 T)이 대류를 막아 온도가 낮아요. 구멍이 아니라 주위보다 어두울 뿐이에요.</li></ul>',
      missions: [
        {
          title: '필터를 끼우고 광구 띄우기',
          goal: '먼저 <b>태양 필터를 끼운 뒤</b> 망원경으로 태양을 보세요. (필터 없이 보려고 하면 어떻게 되는지도 눌러 봐요)',
          hint: '"🕶 태양 필터 끼우기"를 먼저 누른 다음 "🔭 망원경으로 태양 보기"를 눌러요.',
          setup() { const P = S.ph; P.filter = false; P.viewing = false; P.vis = 0; P.iOk = false; S.flags.calcI = false; setView('photo'); },
          check: () => S.ph.filter && S.ph.viewing && S.ph.vis > 0.9,
          hold: 0.8,
          status: () => mark(S.ph.filter) + ' 태양 필터 장착 &nbsp; ' + mark(S.ph.viewing && S.ph.vis > 0.9) + ' 광구가 보여요',
          explain: '태양빛은 너무 강해서 맨눈이나 필터 없는 망원경으로 보면 <b>눈을 크게 다쳐요</b>. 광구는 태양 필터(또는 투영판)로 빛을 크게 줄여서 관측해요.',
        },
        {
          title: '가장자리의 밝기 읽기', manual: true,
          goal: '붉은 점을 중심에서 <b>r = 0.90</b>에 맞추고, 그래프를 읽어 <b>중심 대비 밝기(%)</b>를 입력하세요.',
          hint: 'r 슬라이더를 0.90에 맞추면 그래프의 점이 곡선 위에 놓여요. 점에서 왼쪽으로 가로선을 따라가 세로축의 눈금을 읽어요(60 %와 70 % 사이).',
          setup() { const P = S.ph; P.filter = true; P.viewing = true; P.vis = 1; P.iOk = false; P.r = 0.5; setSlider($('#sR'), $('#oR'), 0.5, (v) => f2(v)); S.flags.calcI = true; clrIn('inI'); setView('photo'); },
          check() {
            if (!near(S.ph.r, 0.9, 0.011)) return 'r 슬라이더를 0.90에 맞춰 주세요.';
            const v = numOf('inI'); if (v == null) return '읽은 밝기(%)를 입력해 주세요.';
            if (!near(v, limb(0.9) * 100, 2)) return v > 80 ? '가장자리 쪽이라 중심보다 훨씬 어두워요. 그래프에서 점의 높이를 다시 읽어 보세요.' : '그래프의 점 높이를 다시 읽어 보세요. 60 %와 70 % 사이예요.';
            return true;
          },
          status: () => mark(near(S.ph.r, 0.9, 0.011)) + ' r = ' + f2(S.ph.r) + ' &nbsp; ' + mark(S.ph.iOk) + ' 밝기 ' + ($('#inI').value.trim() || '—') + ' %',
          explain: 'r = 0.9에서 I(r)/I(0) = 1 − 0.6(1 − √(1 − 0.81)) ≈ <b>0.66</b>이에요. 가장자리는 시선이 비스듬해서 더 높은(차가운) 층이 보이므로 어두워요.',
        },
        {
          type: 'quiz', title: '흑점이 검게 보이는 까닭',
          goal: '흑점이 주위보다 <b>검게 보이는 까닭</b>은 무엇일까요?',
          setup() { setView('zoom'); },
          choices: ['주위(약 5800 K)보다 온도가 낮아(약 4000 K) 밝기가 주위의 약 23 %이기 때문이에요', '흑점은 구멍이라서 빛이 전혀 나오지 않기 때문이에요', '흑점은 주위보다 뜨거워서 눈부셔서 검게 보이기 때문이에요', '달의 그림자가 태양을 가리기 때문이에요'],
          answer: 0,
          feedback: ['', '흑점도 약 4000 K로 빛을 내요. 주위가 훨씬 밝아서 어둡게 보일 뿐이에요.', '흑점은 주위보다 온도가 낮아요. (4000 / 5800)⁴ ≈ 0.23만큼만 밝아요.', '달은 관계없어요. 흑점은 태양 표면 자체의 현상이에요.'],
          explain: '강한 자기장이 대류를 막아 열 공급이 줄면 온도가 약 4000 K로 낮아져요. 방출 에너지는 T⁴에 비례하므로 (4000 / 5800)⁴ ≈ <b>0.23</b>, 즉 주위의 약 23 %만 밝아서 검게 보여요.',
        },
      ],
    },
    {
      title: '흑점 이동: 위치 기록과 자전 주기', short: '흑점 이동', icon: '📋', phase: '기록',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 흑점이 광구 위의 어두운 점이라는 것을 알았어요. 흑점이 매일 움직이는 것을 <b>10일 연속 영상</b>으로 기록하면 태양이 자전하는 빠르기를 구할 수 있어요.</div>' +
        '<p>흑점 A의 가로 위치 <b>x/R</b>을 눌러 기록하면 스프레드시트가 경도 <b>λ = arcsin(x/R ÷ cos φ)</b>를 계산해 줘요. 하루에 움직인 각도로 한 바퀴(360°) 도는 시간을 구해요.</p>',
      features: ['track'],
      setup() { S.flags.calcT = false; setDay(0); S.tr.play = false; setViews(['track']); setView('track'); },
      recap: '흑점은 동쪽(왼쪽)에서 서쪽(오른쪽)으로 하루 약 13.3° 움직여서 겉보기(회합) 주기가 27일이에요. 지구도 공전하므로 실제(항성) 자전 주기는 약 25.1일이에요.',
      summary: '<ul><li>흑점은 지구에서 볼 때 <b>동쪽에서 서쪽으로</b> 이동해요 — 태양이 서쪽에서 동쪽 방향으로 자전하기 때문이에요.</li><li>x/R = cos φ × sin λ → <b>λ = arcsin(x/R ÷ cos φ)</b>. 흑점 A(φ = 10°)는 하루 약 <b>13.3°</b> 이동해 <b>T회합 = 360° ÷ 13.3° ≈ 27일</b>.</li><li>지구가 같은 방향으로 하루 약 0.99° 공전하므로 <b>1/T항성 = 1/T회합 + 1/365.25</b> → <b>T항성 ≈ 25.1일</b>.</li><li>가장자리(|x/R| &gt; 0.9)의 값은 오차가 커서 정확하지 않아요.</li></ul>',
      missions: [
        {
          title: '10일 동안 흑점 위치 기록하기',
          goal: '날짜 슬라이더를 움직이며 흑점 A의 중심을 눌러 <b>5일 이상</b> x/R을 기록하세요.',
          hint: '날짜를 바꾸고 흑점 A(어두운 점)를 누르면 표에 x/R, 경도 λ가 채워져요. 가장자리에서 가장 먼 날부터 골라도 좋아요.',
          setup() { S.tr.rec = new Array(DAYS).fill(null); S.tr.angOk = false; S.tr.tOk = false; clrIn('inAng', 'inTs'); setDay(0); setView('track'); },
          check: () => trN() >= 5,
          hold: 0.6,
          status: () => mark(trN() >= 5) + ' 기록한 날 ' + trN() + ' / 10 (5일 이상)',
          explain: '표의 λ 칸은 스프레드시트가 arcsin으로 계산했어요. 날마다 경도가 거의 일정하게 늘어나요: 하루 약 <b>13.3°</b>씩 이동해요.',
        },
        {
          title: '이동 각도로 회합 주기 구하기', manual: true,
          goal: '표에서 구한 <b>하루 이동 각도(°/일)</b>와 <b>T회합 = 360° ÷ 이동 각도(일)</b>를 입력하세요.',
          hint: '표 아래의 "평균 하루 이동 각도"가 약 13.3°예요. 360 ÷ 13.3 ≈ 27이에요.',
          setup() { if (trN() < 5) for (let d = 0; d < DAYS; d++) S.tr.rec[d] = xA(d); S.flags.calcT = true; S.tr.angOk = false; S.tr.tOk = false; clrIn('inAng', 'inTs'); setView('track'); },
          check() {
            const st = trStats(); if (st.avg == null) return '먼저 표에 기록을 2개 이상 채워 주세요.';
            const a = numOf('inAng'), tt = numOf('inTs'); if (a == null || tt == null) return '이동 각도와 주기를 모두 입력해 주세요.';
            if (!near(a, st.avg, 0.4)) return '표의 "평균 하루 이동 각도"를 확인해 보세요.';
            if (!near(tt, 360 / st.avg, 0.5)) return '주기 T = 360° ÷ (하루 이동 각도)예요. 다시 계산해 보세요.';
            return true;
          },
          status: () => mark(S.tr.angOk) + ' 이동 각도 ' + ($('#inAng').value.trim() || '—') + ' °/일 &nbsp; ' + mark(S.tr.tOk) + ' T회합 ' + ($('#inTs').value.trim() || '—') + ' 일',
          explain: 'T회합 = 360° ÷ 13.3° ≈ <b>27.0일</b>이에요. 지구에서 본 겉보기 주기라서 회합 주기라고 해요.',
        },
        {
          type: 'quiz', title: '회합 주기가 실제 자전보다 긴 까닭',
          goal: '구한 27일은 태양의 <b>실제 자전 주기(항성 주기)</b>보다 길어요. 그 까닭은?',
          setup() { S.flags.inset = true; setView('track'); },
          choices: ['지구도 태양 둘레를 같은 방향으로 공전해서, 흑점이 한 바퀴 돈 뒤에도 조금 더 돌아야 지구를 다시 향해요 (항성 주기 약 25.1일)', '태양이 정확히 27일에 한 바퀴 돌아요. 따로 보정할 것이 없어요', '흑점이 태양 표면에서 점점 느려지기 때문이에요', '지구는 태양의 자전과 반대로 공전해서 더 길어 보여요'],
          answer: 0,
          feedback: ['', '지구의 공전 때문에 겉보기 주기와 실제 주기가 달라요. 아래 "위에서 내려다본" 그림을 보세요.', '흑점은 거의 일정한 빠르기로 돌아요. 표의 하루 이동 각도가 일정했어요.', '태양의 자전과 지구의 공전은 같은 방향이에요. 같은 방향이라서 겉보기 주기가 더 길어져요.'],
          explain: '지구가 같은 방향으로 하루 약 0.99° 공전하므로 1/T항성 = 1/27.0 + 1/365.25 → <b>T항성 ≈ 25.1일</b>이에요. 흑점이 한 바퀴(360°)를 돈 뒤에도 지구가 움직인 만큼 더 돌아야 다시 정면에 와요.',
        },
      ],
    },
    {
      title: '차등 자전: 위도마다 다른 주기', short: '차등 자전', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 흑점 A(위도 10°)의 회합 주기가 약 27일임을 구했어요. 다른 위도의 흑점도 똑같이 27일일까요? 태양이 <b>단단한 공</b>이라면 모든 흑점의 주기가 같아야 해요.</div>' +
        '<p>위도가 다른 흑점 4개(5°·20°·35°·45°)의 위치 표로 <b>T회합</b>을 각각 계산해 위도–주기 그래프에 찍어요. 그런 다음 위성 영상 8장을 합성해 같은 경도의 세로선이 어떻게 변하는지 봐요.</p>',
      features: ['diff', 'compose'],
      setup() { SP4.forEach((s) => { s.ok = false; s.show = 0; }); S.df.cMax = 0; setCDay(0); S.df.play = false; setViews(['diff', 'compose']); setView('diff'); },
      recap: '태양은 단단한 공이 아니라 기체라서 위도마다 따로 돌아요(차등 자전). 적도가 가장 빠르고 위도가 높을수록 주기가 길어져요.',
      summary: () => '<ul><li>위도별 회합 주기: ' + SP4.map((s) => s.phi + '° ' + f1(s.T) + '일').join(' · ') + ' (항성: ' + SP4.map((s) => f1(s.Tsid)).join(' · ') + '일). 위도가 높을수록 길어요.</li><li><b>차등 자전</b>: 적도가 가장 빠르고 극에 가까울수록 느려요. 실제 태양은 극 부근에서 항성 주기가 약 35일까지 길어져요.</li><li>회합 각속도 = ω항성 − 0.99°/일, 모형 ω항성 = 14.4 − 2.7 sin²φ (°/일).</li><li>태양은 굳은 천체가 아니라 <b>기체(플라스마)</b>라서 위도마다 따로 돌 수 있어요.</li></ul>',
      missions: [
        {
          title: '흑점 4개의 주기 표 완성하기',
          goal: '표의 "하루 이동" 값으로 흑점 4개의 <b>T회합 = 360° ÷ (하루 이동)</b>을 계산해 입력하세요 (소수 첫째 자리).',
          hint: '예) 위도 5°: 하루 이동이 13.39°이므로 360 ÷ 13.39 ≈ 26.9일이에요. 다른 위도도 같은 방법으로 해요.',
          setup() { SP4.forEach((s) => { s.ok = false; s.show = 0; }); clrIn('inT0', 'inT1', 'inT2', 'inT3'); setView('diff'); },
          check: () => dfAll(),
          hold: 0.8,
          status: () => SP4.map((s) => mark(s.ok) + ' ' + s.phi + '°').join(' &nbsp; '),
          explain: '회합 주기는 <b>26.9 · 27.5 · 28.7 · 29.8일</b>이에요. 위도가 높은 흑점일수록 천천히 돌아서 점이 오른쪽 위로 올라가요.',
        },
        {
          title: '그래프의 경향 고르기', manual: true,
          goal: '"🛰 영상 합성"에서 경과일을 <b>7일</b>까지 보고, 그래프의 경향을 고르세요.',
          hint: '합성 영상에서 위도 45° 쪽 선이 적도 쪽보다 뒤처지는지 보세요. 그래프는 오른쪽 위로 올라가요.',
          setup() { S.flags.pickTrend = true; S.df.trend = -1; S.df.cMax = 0; S.df.play = false; setCDay(0); setView('diff'); },
          check() {
            if (S.df.cMax < 6.9) return '"🛰 영상 합성" 장면에서 경과일을 7일까지 움직여 선이 어떻게 변하는지 먼저 확인해요.';
            if (S.df.trend < 0) return '경향을 하나 골라 주세요.';
            return S.df.trend === 0 ? true : S.df.trend === 1 ? '그래프가 오른쪽 위로 올라가요. 위도가 높을수록 주기가 길고 느리게 돌아요.' : '점들이 같은 높이가 아니에요. 위도에 따라 주기가 달라요.';
          },
          status: () => mark(S.df.cMax >= 6.9) + ' 합성 영상 7일 &nbsp; ' + mark(S.df.trend === 0) + ' 경향 선택',
          explain: '적도가 빠르고(주기 짧음) 고위도가 느려요(주기 김). 영상 합성에서도 처음 세로선이 7일 뒤 <b>적도 쪽이 앞서</b> 휘어 보여요.',
        },
        {
          type: 'quiz', title: '태양에서 차등 자전이 가능한 까닭',
          goal: '지구는 모든 곳이 한 번에 같은 주기로 도는데, 태양은 <b>위도마다 다른 주기</b>로 돌 수 있어요. 그 까닭은?',
          setup() { setView('compose'); },
          choices: ['태양은 굳은 천체가 아니라 기체(플라스마)로 되어 있어서 위도마다 따로 돌 수 있기 때문이에요', '태양의 적도에 흑점이 더 많아서 무거워지기 때문이에요', '지구가 태양의 위도마다 다른 힘으로 끌어당기기 때문이에요', '흑점이 표면 위를 헤엄쳐서 움직이는 것일 뿐 태양은 한 덩어리로 돌아요'],
          answer: 0,
          feedback: ['', '흑점의 수와 자전 주기는 관계없어요. 물질이 굳어 있는지가 중요해요.', '지구의 중력이 위도에 따라 달라지는 것이 아니에요.', '흑점은 태양 표면의 일부분이에요. 흑점의 이동이 표면의 자전을 알려 줘요.'],
          explain: '지구는 단단한 암석이라 모든 곳이 한 덩어리로 돌지만, 태양은 <b>기체</b>라서 위도마다 따로 돌 수 있어요. 그래서 적도가 빠르고 극에 가까울수록 느린 차등 자전이 나타나요.',
        },
      ],
    },
    {
      title: '활동 주기: 흑점 수와 나비 도표', short: '활동 주기', icon: '🦋', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 흑점의 이동으로 자전을 알아냈어요. 이번에는 흑점의 <b>수</b>가 오랜 시간에 걸쳐 변하는 것을 살펴봐요. 흑점은 항상 같은 수가 보이지 않아요.</div>' +
        '<p>월평균 흑점 수 곡선에서 극대 세 곳을 표시해 <b>활동 주기</b>를 구하고, 흑점이 나타나는 위도가 시간에 따라 어떻게 변하는지(<b>나비 도표</b>)를 읽어요. (교육용 합성 자료)</p>',
      features: ['cycle'],
      setup() { S.cy.marks = []; S.cy.pOk = false; S.cy.bf = -1; S.flags.calcP = false; S.flags.pickBf = false; clrIn('inP'); setViews(['cycle']); setView('cycle'); },
      recap: '흑점 수는 약 11년 주기로 늘었다 줄고, 주기가 진행될수록 흑점이 나타나는 위도는 ±30° 부근에서 적도 쪽(±5°)으로 내려와요.',
      summary: '<ul><li><b>태양 활동 주기</b>: 월평균 흑점 수가 약 <b>11년</b>(극대 간격 약 11~13년) 주기로 변해요. 극대는 2001·2014·2024년경, 극소는 1996·2008·2019년경이에요.</li><li><b>나비 도표</b>: 주기 초에는 위도 ±30° 부근에 흑점이 나타나고 주기 말에는 ±5° 적도 쪽으로 이동해요.</li><li>활동이 극대일 때 플레어와 코로나 질량 방출(CME)이 잦아요. 1645~1715년 <b>마운더 극소기</b>에는 흑점이 거의 없었어요.</li></ul>',
      missions: [
        {
          title: '극대 세 개로 활동 주기 구하기',
          goal: '흑점 수 곡선의 <b>극대(봉우리) 세 곳</b>을 눌러 표시하고, <b>평균 주기 = (세 번째 극대 − 첫 번째 극대) ÷ 2</b>를 입력하세요 (년).',
          hint: '곡선에서 높은 봉우리 세 개를 차례로 눌러요(약 2002년, 2014년, 2025년 근처). 표시된 연도에서 (세 번째 − 첫 번째)를 구해 2로 나눠요.',
          setup() { S.cy.marks = []; S.cy.pOk = false; S.flags.calcP = true; clrIn('inP'); setView('cycle'); },
          check: () => markOK() && S.cy.pOk,
          hold: 0.6,
          status: () => mark(markOK()) + ' 극대 표시 ' + S.cy.marks.length + ' / 3 &nbsp; ' + mark(S.cy.pOk) + ' 평균 주기 ' + ($('#inP').value.trim() || '—') + ' 년',
          explain: '극대는 ' + PEAKS.map((p) => f1(p.y)).join(' · ') + '년경이고 평균 주기는 (' + f1(PEAKS[2].y) + ' − ' + f1(PEAKS[0].y) + ') ÷ 2 ≈ <b>' + f1((PEAKS[2].y - PEAKS[0].y) / 2) + '년</b>이에요. 태양 활동은 약 11년 주기로 변해요.',
        },
        {
          title: '나비 도표 읽기', manual: true,
          goal: '아래쪽 나비 도표를 보고 흑점이 나타나는 <b>위도가 주기 동안 어떻게 변하는지</b> 고르세요.',
          hint: '각 주기의 시작 무렵에는 위도의 절댓값이 크고, 주기 끝에는 0°에 가까워요.',
          setup() { S.flags.pickBf = true; S.cy.bf = -1; setView('cycle'); },
          check() { if (S.cy.bf < 0) return '하나를 골라 주세요.'; return S.cy.bf === 0 ? true : S.cy.bf === 1 ? '반대로 생각해 보세요. 각 주기의 시작에 높은 위도에서 나타나요.' : '나비 도표를 보면 위도가 시간에 따라 달라져요.'; },
          status: () => mark(S.cy.bf === 0) + ' 답 고르기',
          explain: '주기 초에는 위도 <b>±30°</b> 부근에서 나타나고, 주기가 진행되면서 <b>적도 쪽(±5°)</b>으로 이동해요. 그래서 그래프가 나비 날개 모양으로 보여요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-sunspot-rotation', mount: '#game', badge: '태양 관측가', homeHref: '../../index.html#hu',
    featureLabels: { photo: '🔭 태양 필터 · 광구 보기 · 확대', track: '📋 10일 영상 · 스프레드시트 · 지구 공전 그림', diff: '📈 위도 – 주기 그래프 · 영상 합성', compose: '🛰 영상 합성', cycle: '🌞 흑점 수 곡선 · 나비 도표' },
    onFeatures() { updateCtl(); },
    levels,
  });
  levels.forEach((lv) => { if (typeof lv.summary === 'function') lv.summary = lv.summary(); });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view, P = S.ph, Tr = S.tr, st = trStats();
    if (v === 'photo') setReadouts(['태양 필터', P.filter ? '있음' : '없음', '중심에서 거리 r', f2(P.r), '화면', P.viewing ? '광구가 보여요' : '볼 수 없어요']);
    else if (v === 'zoom') setReadouts(['쌀알 지름', '약 1000 km', '광구 온도', '약 5800 K', '흑점 암부', '약 4000 K']);
    else if (v === 'track') setReadouts(['기록한 날', trN() + ' / 10', '평균 하루 이동', st.avg != null ? f1(st.avg) + ' °/일' : '—', 'T회합 = 360° / 이동', (Tr.tOk || FREE()) && st.avg != null ? f1(360 / st.avg) + ' 일' : '?']);
    else if (v === 'diff') setReadouts(['맞힌 흑점', SP4.filter((s) => s.ok).length + ' / 4', '위도 5° T회합', SP4[0].ok ? f1(SP4[0].T) + ' 일' : '?', '위도 45° T회합', SP4[3].ok ? f1(SP4[3].T) + ' 일' : '?']);
    else if (v === 'compose') setReadouts(['경과', f1(S.df.cDay) + ' 일', '적도 하루 이동', f1(omSyn(0)) + ' °', '위도 45° 하루 이동', f1(omSyn(45)) + ' °']);
    else setReadouts(['커서 연도', f1(S.cy.yr) + ' 년', '월평균 흑점 수', String(ssnAt(S.cy.yr)), '극대 평균 간격', markMean() != null ? f1(markMean()) + ' 년' : '—']);
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
      case 'photo': drawPhoto(dt, t); break;
      case 'zoom': drawZoom(dt, t); break;
      case 'track': drawTrack(dt, t); break;
      case 'diff': drawDiff(dt, t); break;
      case 'compose': drawCompose(dt, t); break;
      default: drawCycle(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, setViews, updateCtl, SP4, PEAKS, SSN, BFLY, xA, lonOf, trStats, addMark, markOK, dfAll, LTr, LCy, LDf, LCm, setDay, setCDay, limb, tSyn, tSid };
})();
