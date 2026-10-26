/* =========================================================
   행성우주과학 Ⅰ. 우주탐사와 행성계 - 행성과 소천체 (4차시)
   성취기준 [12행우01-04] 행성과 소천체의 정의를 구분하여 이해하고, 소천체 탐사 자료를 통해 이들의 특징을 추론할 수 있다.
   ① 관찰: 행성의 조건 (IAU 2006 세 조건, 궤도 지배 정도 μ)
   ② 탐구: 소천체 (a–e 산점도, 혜성 꼬리 방향)
   ③ 분석: 탐사 자료 (밀도 ρ = M/V, 공극률)
   ④ 확인: 원시와 분화 (운석 분류, 베스타 분화)
   다루지 않음: 소천체의 궤도 진화(공명·섭동 계산), 운석의 동위 원소 연대 측정, 핵 구조의 세부 모델.
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
  function wrapLines(text, maxW, size, weight) {
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
  const MUC = '#16a34a', DWC = '#7c3aed', SBC = '#c2410c', MOC = '#64748b';
  const CLS = [
    { n: '행성', color: '#2563eb', sub: '㉠㉡㉢ 모두 만족' },
    { n: '왜소행성', color: DWC, sub: '㉢만 불만족' },
    { n: '소천체', color: SBC, sub: '㉡ 불만족' },
    { n: '위성', color: MOC, sub: '㉠ 불만족' },
  ];
  /* 천체 8개: A 공전 · B 둥근 모양 · C 궤도 지배 (evidence: 근거 글) */
  const B8 = [
    { id: 'earth', n: '지구', ic: '🌍', d: '지름 12,742 km', cls: 0, A: true, B: true, C: true, mu: 1.7e6,
      ea: '태양 둘레를 1년에 한 바퀴 돌아요', eb: '자체 중력으로 둥근 공 모양이에요', ec: '궤도 근처의 천체를 몰아냈어요 (μ = 1.7×10⁶ ≫ 1)', col: '#3b82f6' },
    { id: 'ceres', n: '세레스', ic: '🔹', d: '지름 939 km', cls: 1, A: true, B: true, C: false, mu: 0.33,
      ea: '태양 둘레를 4.6년에 한 바퀴 돌아요', eb: '둥근 모양이에요 (지름 939 km)', ec: '소행성대에 다른 천체가 많아요 (μ = 0.33 ≪ 1)', col: '#a8a29e' },
    { id: 'pluto', n: '명왕성', ic: '🔹', d: '지름 2,377 km', cls: 1, A: true, B: true, C: false, mu: 0.08,
      ea: '태양 둘레를 248년에 한 바퀴 돌아요', eb: '둥근 모양이에요 (지름 2,377 km)', ec: '카이퍼 벨트 천체들과 섞여 있어요 (μ = 0.08 ≪ 1)', col: '#d6b89a' },
    { id: 'eris', n: '에리스', ic: '🔹', d: '지름 2,326 km', cls: 1, A: true, B: true, C: false, mu: 0.10,
      ea: '태양 둘레를 558년에 한 바퀴 돌아요', eb: '둥근 모양이에요 (지름 2,326 km)', ec: '궤도 근처에 다른 천체가 많아요 (μ = 0.10 ≪ 1)', col: '#e5e7eb' },
    { id: 'moon', n: '달', ic: '🌙', d: '지름 3,474 km', cls: 3, A: false, B: true, C: false, mu: null,
      ea: '태양이 아니라 지구 둘레를 돌아요', eb: '둥근 모양이에요 (지름 3,474 km)', ec: '지구의 위성이라 따질 수 없어요', col: '#cbd5e1' },
    { id: 'vesta', n: '베스타', ic: '☄️', d: '지름 523 km', cls: 2, A: true, B: false, C: false, mu: null,
      ea: '소행성대에서 태양을 3.6년에 한 바퀴 돌아요', eb: '찌그러진 공 모양이에요 (둥글지 않아요)', ec: '소행성대에 비슷한 천체가 많아요', col: '#9ca3af' },
    { id: 'ryugu', n: '류구', ic: '☄️', d: '지름 0.9 km', cls: 2, A: true, B: false, C: false, mu: null,
      ea: '태양 둘레를 1.3년에 한 바퀴 돌아요', eb: '팽이 모양이에요 (둥글지 않아요)', ec: '지구 근처를 지나는 작은 천체예요', col: '#6b7280' },
    { id: 'jupiter', n: '목성', ic: '🪐', d: '지름 139,820 km', cls: 0, A: true, B: true, C: true, mu: 6.3e5,
      ea: '태양 둘레를 11.9년에 한 바퀴 돌아요', eb: '자체 중력으로 둥근 공 모양이에요', ec: '궤도 근처의 천체를 몰아냈어요 (μ = 6.3×10⁵ ≫ 1)', col: '#d4a373' },
  ];
  /* μ 그래프: 행성 8 + 왜소행성 3 (stem: 막대 높이 단계) */
  const MU = [
    { n: '수성', mu: 9.1e4, pl: true, st: 1 }, { n: '금성', mu: 1.35e6, pl: true, st: 3 }, { n: '지구', mu: 1.7e6, pl: true, st: 5 },
    { n: '화성', mu: 1.8e5, pl: true, st: 2 }, { n: '목성', mu: 6.3e5, pl: true, st: 4 }, { n: '토성', mu: 1.9e5, pl: true, st: 6 },
    { n: '천왕성', mu: 2.9e4, pl: true, st: 3 }, { n: '해왕성', mu: 2.4e4, pl: true, st: 1 },
    { n: '세레스', mu: 0.33, pl: false, st: 2 }, { n: '명왕성', mu: 0.08, pl: false, st: 4 }, { n: '에리스', mu: 0.10, pl: false, st: 1 },
  ];
  /* a–e 산점도 12개: g 0 소행성대 · 1 카이퍼 벨트 · 2 혜성 */
  const SC = [
    { n: '베스타', a: 2.36, e: 0.09, g: 0 }, { n: '에우노미아', a: 2.64, e: 0.19, g: 0 }, { n: '팔라스', a: 2.77, e: 0.23, g: 0 }, { n: '이다', a: 2.86, e: 0.04, g: 0 },
    { n: '명왕성', a: 39.5, e: 0.25, g: 1 }, { n: '하우메아', a: 43.1, e: 0.19, g: 1 }, { n: '아로코스', a: 44.2, e: 0.04, g: 1 }, { n: '마케마케', a: 45.5, e: 0.16, g: 1 },
    { n: '엔케 혜성', a: 2.22, e: 0.85, g: 2 }, { n: '67P 혜성', a: 3.46, e: 0.64, g: 2 }, { n: '템펠-터틀 혜성', a: 10.3, e: 0.906, g: 2 }, { n: '핼리 혜성', a: 17.8, e: 0.967, g: 2 },
  ];
  const GRP = [
    { n: '소행성대 천체', color: '#c2410c', txt: '화성–목성 사이(2.1~3.3 AU), 이심률이 작아요' },
    { n: '카이퍼 벨트 천체', color: '#2563eb', txt: '해왕성 바깥(30~50 AU), 이심률이 작은 편이에요' },
    { n: '혜성', color: '#0d9488', txt: '이심률이 매우 커서 길쭉한 타원 궤도를 돌아요' },
  ];
  /* 탐사 자료 6개: d (km) · M (kg) */
  const DB = [
    { id: 'ryugu', n: '류구', kind: '소행성', d: 0.90, M: 4.5e11, probe: '하야부사2', rock: 2.4, col: '#6b7280', inf: '밀도가 물과 비슷해요. 암석(약 2.4 g/cm³)의 절반 정도라 속이 비어 있는 느슨한 잔해 더미예요.' },
    { id: 'bennu', n: '베누', kind: '소행성', d: 0.49, M: 7.3e10, probe: '오시리스-렉스', rock: 2.4, col: '#4b5563', inf: '류구와 밀도가 같아요. 바위와 자갈이 느슨하게 뭉친 잔해 더미로 공극이 많아요.' },
    { id: 'p67', n: '67P 혜성', kind: '혜성', d: 3.30, M: 9.98e12, probe: '로제타', rock: null, col: '#57534e', inf: '밀도가 물의 절반이에요. 단단한 얼음 덩어리가 아니라 얼음과 먼지가 성기게 뭉친 천체예요.' },
    { id: 'vesta', n: '베스타', kind: '소행성', d: 523, M: 2.59e20, probe: '돈', rock: null, col: '#9ca3af', inf: '밀도가 매우 커요. 무거운 철 핵이 안쪽에 있어서 분화된 천체로 볼 수 있어요.' },
    { id: 'ceres', n: '세레스', kind: '왜소행성', d: 939, M: 9.38e20, probe: '돈', rock: null, col: '#a8a29e', inf: '암석보다 가벼워요. 밝은 점은 염류이고, 얼음이 섞인 층이 있을 가능성이 있어요.' },
    { id: 'moon', n: '달', kind: '위성', d: 3474, M: 7.342e22, probe: '(비교용)', rock: null, col: '#cbd5e1', inf: '암석으로 된 달의 평균 밀도예요. 베스타의 밀도가 이보다 더 커요.' },
  ];
  DB.forEach((b) => { b.V = Math.PI / 6 * Math.pow(b.d * 1000, 3); b.rho = b.M / b.V / 1000; });   // V: m³, rho: g/cm³
  const RHO_ROCK = 2.4;
  /* 운석 8개 */
  const MET = [
    { n: '콘드라이트 A', sub: '둥근 알갱이(콘드룰)가 가득', bin: 0, layer: 'none', info: '둥근 알갱이(콘드룰)가 박힌 돌이에요. 한 번도 녹은 적 없는 원시 물질이에요.' },
    { n: '콘드라이트 B', sub: '탄소가 많은 검은 돌', bin: 0, layer: 'none', info: '콘드룰과 유기물이 섞인 검은 돌이에요. 태양계 초기 성분을 그대로 간직해요.' },
    { n: '에이콘드라이트 A', sub: '현무암 같은 암석', bin: 1, layer: 'crust', info: '콘드룰이 없고 화산암(현무암) 같아요. 분화된 천체의 지각 조각이에요.' },
    { n: '에이콘드라이트 B', sub: '베스타에서 온 돌', bin: 1, layer: 'crust', info: '콘드룰이 없는 암석이에요. 베스타 같은 분화된 천체의 지각·맨틀 조각이에요.' },
    { n: '철 운석 A', sub: '철–니켈 금속 덩어리', bin: 1, layer: 'core', info: '철과 니켈로 된 금속 덩어리예요. 분화된 천체의 핵 조각이에요.' },
    { n: '철 운석 B', sub: '자른 면에 격자무늬', bin: 1, layer: 'core', info: '천천히 식은 철–니켈 결정의 무늬예요. 큰 천체의 핵에서 아주 천천히 식었다는 뜻이에요.' },
    { n: '석철 운석 A', sub: '금속 속에 초록 결정', bin: 1, layer: 'boundary', info: '금속 속에 감람석 결정이 박혀 있어요. 핵과 맨틀의 경계 조각이에요.' },
    { n: '석철 운석 B', sub: '금속과 암석이 섞인 돌', bin: 1, layer: 'boundary', info: '금속과 암석이 반반 섞였어요. 핵과 맨틀의 경계 조각이에요.' },
  ];
  const FALL = [['콘드라이트', 86, '#16a34a'], ['에이콘드라이트', 8, '#7c3aed'], ['철 운석', 5, '#475569'], ['석철 운석', 1, '#f59e0b']];
  const EVID = [
    { t: '밀도 3.46 g/cm³ (류구의 약 3배)', ok: true }, { t: '표면이 현무암(화산암)으로 된 지각', ok: true },
    { t: '콘드룰이 가득한 암석뿐이에요', ok: false }, { t: '표면 전체가 얼음으로 덮여 있어요', ok: false }, { t: '밀도 0.53 g/cm³ (물보다 가벼워요)', ok: false },
  ];
  const TERMS = [
    { n: '소행성', ic: '🪨', t: '주로 화성–목성 사이 소행성대에 있는 암석·금속 천체예요. 지름은 수 m에서 수백 km까지 다양해요.' },
    { n: '혜성', ic: '☄️', t: '얼음과 먼지로 된 핵(수 km)이 태양에 가까워지면 코마와 꼬리를 만들어요.' },
    { n: '유성체', ic: '✨', t: '우주 공간을 떠도는 작은 암석·먼지 조각이에요. 대개 지름 1 m보다 작아요.' },
    { n: '유성', ic: '🌠', t: '유성체가 지구 대기에 들어와 타면서 빛나는 현상이에요. 별똥별이라고도 해요.' },
    { n: '운석', ic: '🪨', t: '유성체가 다 타지 않고 지표까지 떨어진 조각이에요.' },
  ];

  /* ================= 상태 ================= */
  const S = {
    view: 'judge', clock: 0, fade: 0,
    stampSel: -1, stampT: 0, snd: [0, 0, 0],
    mu: { c: 3, fly: 0, ok: false },
    sc: { sel: -1, asg: SC.map(() => -1), wrong: SC.map(() => false), zone: 0, shown: 0 },
    cm: { M: 0, play: true, mode: 'play', guess: 0, rev: 0, okIn: false, okOut: false, last: '', term: -1, drag: false, a: 3.0, e: 0.8 },
    dt: { sel: 0, vol: DB.map(() => false), rho: DB.map(() => false), volV: DB.map(() => 0), rhoV: DB.map(() => 0), bar: DB.map(() => 0), porOk: false, enter: 0 },
    mt: { size: 0, heat: false, p: 0, temp: 0, ev: EVID.map(() => false), evOk: false, selCard: -1, small: 0 },
    clsOk: false,
    flags: { porBox: false, evBox: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { judge: '✅ 행성의 세 가지 조건', mu: '📈 궤도 지배 정도 μ', scatter: '🔵 a–e 산점도', comet: '☄️ 혜성의 꼬리', data: '🧮 모둠 데이터 보드', meteor: '🪨 운석과 베스타의 분화' };
  const modeBtns = $$('#modeSeg button');
  const fSig = (x) => (x >= 100 ? comma(x) : x >= 10 ? f1(x) : x >= 1 ? f2(x) : f3(x));
  const fMu = (x) => (x >= 1000 ? sci(x, 1) : x >= 10 ? f0(x) : x >= 1 ? f1(x) : x >= 0.1 ? f2(x) : (Math.round(x * 1000) / 1000).toString());

  /* =========================================================
     ① 행성의 조건: 판정 도장 + 분류 상자
     ========================================================= */
  function LJ() {
    if (PHONE) {
      const bw = 228, bh = 142;
      return { grid: { x: 8, y: 8, w: 464, cols: 2, cardH: 44, gap: 6 }, P: { x: 8, y: 210, w: 464, h: 186 },
        bins: [{ x: 8, y: 404, w: bw, h: bh }, { x: 244, y: 404, w: bw, h: bh }, { x: 8, y: 552, w: bw, h: bh }, { x: 244, y: 552, w: bw, h: bh }], R: { x: 8, y: 702, w: 464, h: 150 } };
    }
    const bw = 189;
    return { grid: { x: 10, y: 8, w: 780, cols: 4, cardH: 50, gap: 8 }, P: { x: 10, y: 124, w: 780, h: 168 },
      bins: [0, 1, 2, 3].map((i) => ({ x: 10 + i * (bw + 8), y: 300, w: bw, h: 150 })), R: { x: 10, y: 458, w: 780, h: 154 } };
  }
  const WHY = (b) => (!b.A ? '㉠이 ✕예요. 태양이 아닌 천체를 돌면 위성이에요.' : !b.B ? '㉡이 ✕예요. 둥글지 않은 천체는 소천체예요.' : '㉢이 ✕예요. ㉠㉡은 ○이니 왜소행성이에요.');
  const cJ = makeClassifier({
    items: B8.map((b) => ({ id: b.id, label: b.n, sub: b.d, icon: b.ic, bin: b.cls, open: true, chip: b.n })),
    bins: CLS.map((c) => ({ label: c.n, sub: c.sub, color: c.color })),
    chipCols: 1, minRows: 3,
    layout: () => { const L = LJ(); return { grid: L.grid, bins: L.bins }; },
    onPlace(it, b) {
      it.wrong = b !== it.bin;
      if (it.wrong) { say('「' + it.label + '」은(는) ' + CLS[b].n + '이 아니에요. 도장이 ✕인 조건을 다시 보세요.', true, 3.2); Sound.fail(); }
      else { parts.burst(it.x + it.w / 2, it.y + it.h / 2, { count: 10, speed: 120, colors: [CLS[b].color, '#fbbf24'] }); }
    },
    onChange() { S.clsOk = cJ.items.every((i) => cJ.isRight(i)); updateCtl(); },
  });
  function stampDraw(x, y, ok, p) {
    if (p <= 0) return;
    const sc = SciSim.ease.outBack(clamp(p, 0, 1)), r = 17 * sc;
    if (ok) { D.check(x, y, r, clamp(p * 1.4, 0, 1)); return; }
    ctx.save(); D.sphere(x, y, r, '#dc2626', { gloss: false });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.24; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.4); ctx.lineTo(x + r * 0.4, y + r * 0.4); ctx.moveTo(x + r * 0.4, y - r * 0.4); ctx.lineTo(x - r * 0.4, y + r * 0.4); ctx.stroke(); ctx.restore();
  }
  function drawJudge(dt, t) {
    const L = LJ(), P = L.P, R = L.R;
    if (cJ.sel !== S.stampSel) { S.stampSel = cJ.sel; S.stampT = RM ? 9 : 0; }
    S.stampT += dt;
    // 판정 도장 판
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    const b = cJ.sel >= 0 ? B8[cJ.sel] : null;
    if (!b) {
      T(P.x + P.w / 2, P.y + P.h / 2 - 6, '🔎 카드를 눌러 세 가지 조건을 검사해 보세요', 16, '#475569', 'center', 800);
      T(P.x + P.w / 2, P.y + P.h / 2 + 22 * FS, '도장 ✓/✕를 보고 알맞은 상자에 넣어요', 13.5, '#64748b', 'center', 700);
    } else {
      const hx = P.x + 14, top = P.y + 10;
      T(hx, top + 26 * FS, b.ic + ' ' + b.n, 19, '#1e293b', 'left', 800);
      T(hx, top + 46 * FS, b.d, 13, '#64748b', 'left', 700);
      const rows = [['㉠ 태양 둘레를 공전한다', b.ea, b.A], ['㉡ 자체 중력으로 둥근 모양이다', b.eb, b.B], ['㉢ 궤도 근처의 천체를 몰아냈다', b.ec, b.C]];
      const rx = PHONE ? P.x + 14 : P.x + 190, ry0 = PHONE ? P.y + 62 * FS : P.y + 12, rh = PHONE ? (P.h - 62 * FS - 8) / 3 : (P.h - 20) / 3;
      rows.forEach((r, i) => {
        const y = ry0 + i * rh, p = (S.stampT - (0.3 + 0.5 * i)) / 0.35, w = P.x + P.w - 14 - rx;
        ctx.fillStyle = 'rgba(100,116,139,.07)'; rr(rx, y + 2, w, rh - 4, 10).fill();
        T(rx + 10, y + rh * 0.38, r[0], 14, '#1e293b', 'left', 800);
        ctx.save(); rr(rx, y, w - 44, rh, 0).clip(); drawWrap(rx + 10, y + rh * 0.38 + 17 * FS, r[1], w - 62, 12.5, { color: '#475569' }); ctx.restore();
        stampDraw(rx + w - 24, y + rh / 2, r[2], p);
        if (p > 0 && !S.snd[i]) { S.snd[i] = 1; Sound.tick(); }
        if (p <= 0) S.snd[i] = 0;
      });
    }
    // 정의 판
    panel(R.x, R.y, R.w, R.h, { r: 14 });
    T(R.x + 14, R.y + 22 * FS, '📜 국제천문연맹(IAU) 2006 행성의 정의', 14.5, '#1e293b', 'left', 800);
    const lines = [['행성', '㉠ ㉡ ㉢ 모두 ○', CLS[0].color], ['왜소행성', '㉠ ㉡ ○, ㉢ ✕ (위성이 아님)', CLS[1].color], ['소천체', '태양을 공전하지만 ㉡ ✕ (둥글지 않음)', CLS[2].color], ['위성', '㉠ ✕ (다른 천체 둘레를 돎)', CLS[3].color]];
    const ly0 = R.y + 44 * FS, lh = (R.h - 48 * FS) / 4;
    lines.forEach((l, i) => {
      const y = ly0 + i * lh;
      D.label(R.x + 14, y + lh * 0.3, l[0], { bg: l[2], size: 12.5, align: 'left', pad: 8 });
      T(R.x + (PHONE ? 112 : 124), y + lh * 0.3 + 5, l[1], PHONE ? 12 : 13.5, '#334155', 'left', 700);
    });
    cJ.draw(dt, {});
  }

  /* =========================================================
     ① 궤도 지배 정도 μ 그래프 (로그 눈금)
     ========================================================= */
  const MU_ORDER = MU.slice().sort((a, b) => a.mu - b.mu);
  const MU_ST = { '해왕성': 1, '천왕성': 4, '수성': 2, '화성': 5, '토성': 3, '목성': 6, '금성': 1, '지구': 4, '명왕성': 2, '에리스': 4, '세레스': 1 };
  MU.forEach((m, i) => { m.st = MU_ST[m.n]; m.lg = Math.log10(m.mu); m.fx = 0; m.fy = 0; m.fl = 0; });
  function LMU() {
    return PHONE ? { C: { x: 8, y: 8, w: 464, h: 540 }, I: { x: 8, y: 556, w: 464, h: 296 } } : { C: { x: 10, y: 8, w: 780, h: 410 }, I: { x: 10, y: 426, w: 780, h: 186 } };
  }
  function muGeom() {
    const { C } = LMU(), ix = C.x + 34, iw = C.w - 68, ay = C.y + C.h - 60, top = C.y + 54, step = (ay - 34 - top) / 6;
    return { C, ix, iw, ay, top, step, X: (lg) => ix + (lg + 2) / 9 * iw, Y: (st) => ay - 22 - st * step };
  }
  const muWrong = () => MU.filter((m) => (m.lg >= S.mu.c) !== m.pl);
  const muOK = () => muWrong().length === 0 && Math.abs(S.mu.c) <= 0.3 + 1e-9;
  let muEnterT = -1;
  function drawMu(dt, t) {
    const { C, ix, iw, ay, top, X, Y } = muGeom(), I = LMU().I;
    if (S.mu.fl === 0 && muEnterT < 0) muEnterT = 0;
    S.mu.fly = clamp(S.mu.fly + dt / (RM ? 0.01 : 1.3), 0, 1);
    panel(C.x, C.y, C.w, C.h, { r: 14 });
    T(C.x + 14, C.y + 24 * FS, PHONE ? '📈 궤도 지배 정도 μ' : '📈 궤도 지배 정도 μ (로그 눈금: 한 칸 = 10배)', 14.5, '#1e293b', 'left', 800);
    // 영역 색
    const bx = X(S.mu.c);
    ctx.save(); rr(ix, top, iw, ay - top, 8); ctx.clip();
    ctx.fillStyle = rgba(DWC, 0.1); ctx.fillRect(ix, top, bx - ix, ay - top);
    ctx.fillStyle = rgba('#2563eb', 0.1); ctx.fillRect(bx, top, ix + iw - bx, ay - top);
    ctx.restore();
    T(ix + 8, top + 18 * FS, '왜소행성 쪽', 13, shade(DWC, -0.1), 'left', 800);
    T(ix + iw - 8, top + 18 * FS, '행성 쪽', 13, '#1d4ed8', 'right', 800);
    // 축
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ix, ay); ctx.lineTo(ix + iw, ay); ctx.stroke();
    for (let lg = -2; lg <= 7; lg++) {
      const x = X(lg); ctx.strokeStyle = lg === 0 ? '#0f172a' : '#94a3b8'; ctx.lineWidth = lg === 0 ? 3 : 1.5; ctx.beginPath(); ctx.moveTo(x, ay - 5); ctx.lineTo(x, ay + 6); ctx.stroke();
      if (lg % 2 === 0 || lg === 1 && false) T(x, ay + 22 * Math.min(FS, 1.15), lg === 0 ? '1' : lg === 2 ? '100' : lg === -2 ? '0.01' : '10' + sup(lg), 13, lg === 0 ? '#0f172a' : '#64748b', 'center', 800);
    }
    T(ix + iw / 2, ay + 44 * Math.min(FS, 1.15), 'μ = (천체의 질량) / (같은 궤도대 나머지 천체 질량의 합)', 12.5, '#475569', 'center', 700);
    // 점
    MU.forEach((m, i) => {
      const gx = X(m.lg), gy = Y(m.st);
      const k = SciSim.ease.outCubic(clamp((S.mu.fly * 1.6 - i * 0.06), 0, 1));
      const sx = C.x + 30, sy = C.y + 30;
      const x = lerp(sx, gx, k), y = lerp(sy, gy, k);
      if (k > 0.98) { ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(gx, gy + 9); ctx.lineTo(gx, ay); ctx.stroke(); ctx.setLineDash([]); }
      const right = m.lg >= S.mu.c, bad = right !== m.pl;
      const col = right ? '#2563eb' : DWC;
      D.sphere(x, y, 9, col, { gloss: true, outline: bad ? '#dc2626' : null, outlineWidth: 3 });
      if (k > 0.98) T(gx, gy - 14 * FS, m.n, PHONE ? 11 : 12.5, bad ? '#b91c1c' : '#1e293b', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
    });
    // 경계선 (끌 수 있어요)
    ctx.save(); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(bx, top - 4); ctx.lineTo(bx, ay + 2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    D.shadow(() => { D.sphere(bx, top - 8, 11, '#0f172a', { gloss: false }); }, { blur: 5, y: 2 });
    T(bx, top - 5, '↔', 13, '#fff', 'center', 800);
    D.label(clamp(bx, ix + 50, ix + iw - 50), top - 28, 'μ_c = ' + fMu(Math.pow(10, S.mu.c)), { bg: '#0f172a', size: 12.5 });
    if (muOK() && !RM) D.ring(bx, ay - 2, 12, t, { color: '#16a34a' });
    // 설명 판
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    const wr = muWrong().length;
    T(I.x + 14, I.y + 24 * FS, wr === 0 ? '✅ 경계선이 두 무리를 정확히 가르고 있어요' : '⚠ 잘못 칠해진 천체 ' + wr + '개 (빨간 테두리)', 14.5, wr === 0 ? '#15803d' : '#b91c1c', 'left', 800);
    let y2 = drawWrap(I.x + 14, I.y + 50 * FS, '행성 8개의 μ는 10⁴ ~ 10⁶ 이상이고, 왜소행성의 μ는 1보다 훨씬 작아요. 두 무리 사이가 크게 벌어져 있어요.', I.w - 28, 13.5, { color: '#334155' });
    y2 = drawWrap(I.x + 14, y2 + 24 * FS, 'μ = 1은 "내 질량 = 같은 궤도대 나머지 천체 질량의 합"인 곳이에요. μ가 1보다 훨씬 크면 그 궤도를 지배한 천체(㉢ ○)예요.', I.w - 28, 13.5, { color: '#334155' });
    drawWrap(I.x + 14, y2 + 24 * FS, '경계선을 끌거나 슬라이더로 움직여 행성과 왜소행성이 갈리는 곳을 찾아요.', I.w - 28, 13.5, { color: '#b45309', weight: 800 });
  }
  function muDown(p) {
    const { ix, iw, top, X } = muGeom(), bx = X(S.mu.c);
    if (Math.abs(p.x - bx) < 26 && p.y > top - 30) { muMove(p); return true; }
    return false;
  }
  function muMove(p) {
    const { ix, iw } = muGeom();
    S.mu.c = clamp(Math.round(((p.x - ix) / iw * 9 - 2) * 20) / 20, -2, 7);
    $('#sMu').value = S.mu.c; updateMuOut();
  }
  function updateMuOut() { const s = $('#sMu'); s.style.setProperty('--pct', ((s.value - s.min) / (s.max - s.min)) * 100 + '%'); $('#oMu').textContent = fMu(Math.pow(10, +s.value)); }

  /* =========================================================
     ② a–e 산점도: 12개 천체를 세 무리로
     ========================================================= */
  function LSC() {
    return PHONE ? { P: { x: 8, y: 8, w: 464, h: 520 }, Q: { x: 8, y: 536, w: 464, h: 316 } } : { P: { x: 10, y: 8, w: 590, h: 604 }, Q: { x: 608, y: 8, w: 182, h: 604 } };
  }
  function scGeom() {
    const { P } = LSC(), ix = P.x + 56, iw = P.w - 56 - 18, top = P.y + 44, ph = P.h - 44 - 58;
    return { P, ix, iw, top, ph, X: (a) => ix + Math.log10(a) / 2 * iw, Y: (e) => top + (1 - e) * ph };
  }
  const scDone = () => S.sc.asg.every((g, i) => g === SC[i].g);
  const scAllSet = () => S.sc.asg.every((g) => g >= 0);
  const fT = (a) => { const T_ = Math.pow(a, 1.5); return T_ >= 100 ? f0(T_) : T_ >= 10 ? f1(T_) : f1(T_); };
  function drawScatter(dt, t) {
    const { P, ix, iw, top, ph, X, Y } = scGeom(), Q = LSC().Q;
    S.sc.zone = approach(S.sc.zone, scDone() || FREE() ? 1 : 0, dt, 3);
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    T(P.x + 14, P.y + 24 * FS, '🔵 긴반지름 a와 이심률 e', 14.5, '#1e293b', 'left', 800);
    // 영역 (분류를 마치면 나타나요)
    const za = S.sc.zone;
    if (za > 0.01) {
      ctx.save(); ctx.globalAlpha = za;
      const rect = (a0, a1, e0, e1, c, label, ly) => { const x0 = X(a0), x1 = X(a1), y0 = Y(e1), y1 = Y(e0); ctx.fillStyle = rgba(c, 0.13); rr(x0, y0, x1 - x0, y1 - y0, 8).fill(); ctx.strokeStyle = rgba(c, 0.7); ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); rr(x0, y0, x1 - x0, y1 - y0, 8).stroke(); ctx.setLineDash([]); T((x0 + x1) / 2, ly, label, 12.5, shade(c, -0.25), 'center', 800); };
      rect(2.1, 3.3, 0, 0.3, GRP[0].color, '소행성대', Y(0.3) - 6);
      rect(30, 50, 0, 0.3, GRP[1].color, '카이퍼 벨트', Y(0.3) - 6);
      const yy = Y(1) + 0, y2 = Y(0.6); ctx.fillStyle = rgba(GRP[2].color, 0.08); ctx.fillRect(ix, yy, iw, y2 - yy);
      T(ix + iw - 8, yy + 17 * FS, '혜성: 이심률 e가 커요', 12.5, shade(GRP[2].color, -0.2), 'right', 800);
      ctx.restore();
    }
    // 눈금
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
    for (let k = 0; k <= 5; k++) { const e = k / 5, y = Y(e); ctx.beginPath(); ctx.moveTo(ix, y); ctx.lineTo(ix + iw, y); ctx.stroke(); T(ix - 8, y + 4, f1(e), 12.5, '#64748b', 'right', 700); }
    [1, 2, 3, 5, 10, 20, 30, 50, 100].forEach((a) => { const x = X(a); ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + ph); ctx.stroke(); if ([1, 10, 100].includes(a) || (!PHONE && [3, 30].includes(a))) T(x, top + ph + 20 * Math.min(FS, 1.15), String(a), 13, '#64748b', 'center', 800); });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ix, top); ctx.lineTo(ix, top + ph); ctx.lineTo(ix + iw, top + ph); ctx.stroke();
    T(ix + iw / 2, top + ph + 44 * Math.min(FS, 1.15), '긴반지름 a (AU, 로그 눈금)', 13, '#475569', 'center', 800);
    T(ix - 8, top - 10, 'e', 13.5, '#475569', 'right', 800);
    // 행성 궤도 표시
    [[1, '지구'], [5.2, '목성'], [30.1, '해왕성']].forEach(([a, n]) => { const x = X(a); D.dashedLine(x, top + 4, x, top + ph, { color: 'rgba(30,41,59,.45)', width: 1.5, dash: [3, 5] }); T(x + 4, top + 16, n + ' 궤도', 11.5, '#475569', 'left', 800); });
    // 점
    const sel = S.sc.sel;
    SC.forEach((o, i) => {
      const x = X(o.a), y = Y(o.e), g = S.sc.asg[i], c = g >= 0 ? GRP[g].color : '#94a3b8', bad = S.sc.wrong[i];
      const r = PHONE ? 10.5 : 9;
      if (i === sel) { D.ring(x, y, r + 7, t, { color: '#f59e0b', width: 3, speed: 1.4 }); }
      D.sphere(x, y, r, c, { gloss: true, outline: bad ? '#dc2626' : '#1e293b', outlineWidth: bad ? 3 : 1.2 });
      if (g < 0) T(x, y + 4, '?', 12, '#fff', 'center', 800);
    });
    SC.forEach((o, i) => {
      const g = S.sc.asg[i]; if (g < 0) return;
      const x = X(o.a), y = Y(o.e), up = (i % 2 === 0), right = x < ix + iw - 90;
      T(x + (right ? 13 : -13), y + (up ? -9 : 17), o.n, PHONE ? 11 : 12, '#1e293b', right ? 'left' : 'right', 800, { stroke: 'rgba(255,255,255,.92)', strokeWidth: 4 });
    });
    // 오른쪽(또는 아래) 정보 판
    panel(Q.x, Q.y, Q.w, Q.h, { r: 14 });
    const done = S.sc.asg.filter((g) => g >= 0).length;
    T(Q.x + 14, Q.y + 24 * FS, '🔎 선택한 천체', 14.5, '#1e293b', 'left', 800);
    const lx = Q.x + 14, ww = Q.w - 28;
    if (sel < 0) { drawWrap(lx, Q.y + 50 * FS, '점을 눌러 a와 e를 읽고, 알맞은 무리로 나눠 보세요.', ww, 13.5, { color: '#64748b' }); }
    else {
      const o = SC[sel], g = S.sc.asg[sel];
      T(lx, Q.y + 50 * FS, g >= 0 ? o.n : '미확인 천체 ' + (sel + 1), 15.5, g >= 0 ? GRP[g].color : '#334155', 'left', 800);
      const rows = ['긴반지름 a = ' + f2(o.a) + ' AU', '이심률 e = ' + f2(o.e), '근일점 q = a(1 − e) = ' + f2(o.a * (1 - o.e)) + ' AU', '원일점 Q = a(1 + e) = ' + f2(o.a * (1 + o.e)) + ' AU', '공전 주기 T = a^1.5 ≈ ' + fT(o.a) + '년'];
      let yy = Q.y + 74 * FS;
      rows.forEach((r) => { yy = drawWrap(lx, yy, r, ww, 13, { color: '#334155', weight: 700 }) + 21 * FS; });
      if (g >= 0) drawWrap(lx, yy, S.sc.wrong[sel] ? '⚠ 다른 무리 같아요. a와 e를 다시 봐요.' : '✅ ' + GRP[g].txt, ww, 12.5, { color: S.sc.wrong[sel] ? '#b91c1c' : '#15803d', weight: 800 });
    }
    // 하단: 진행
    const by = Q.y + Q.h - (PHONE ? 62 : 74);
    ctx.fillStyle = 'rgba(100,116,139,.1)'; rr(Q.x + 10, by, Q.w - 20, PHONE ? 52 : 64, 10).fill();
    T(Q.x + Q.w / 2, by + 22 * Math.min(FS, 1.1), '분류한 천체', 12.5, '#64748b', 'center', 800);
    T(Q.x + Q.w / 2, by + 46 * Math.min(FS, 1.1), done + ' / 12', 18, scDone() ? '#15803d' : '#1e293b', 'center', 800);
  }
  function scDown(p) {
    const { X, Y } = scGeom(); let best = -1, bd = PHONE ? 22 : 18;
    SC.forEach((o, i) => { const d = Math.hypot(X(o.a) - p.x, Y(o.e) - p.y); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && S.sc.sel !== best) { S.sc.sel = best; Sound.click(); updateCtl(); }
    else if (best >= 0) { S.sc.sel = best; }
    return false;
  }
  function scAssign(k) {
    const i = S.sc.sel; if (i < 0) return;
    S.sc.asg[i] = k; S.sc.wrong[i] = k !== SC[i].g; Sound.click();
    const { X, Y } = scGeom();
    if (S.sc.wrong[i]) { say('이 천체는 ' + GRP[k].n + '가 아닌 것 같아요. a와 e를 다시 읽어 봐요.', true, 3); Sound.fail(); }
    else parts.burst(X(SC[i].a), Y(SC[i].e), { count: 10, speed: 110, colors: [GRP[k].color, '#fbbf24'] });
    updateCtl();
  }

  /* =========================================================
     ② 혜성 모형: 꼬리는 항상 태양 반대쪽
     ========================================================= */
  const CM = S.cm;
  function LCM() {
    return PHONE ? { Sc: { x: 8, y: 8, w: 464, h: 500 }, G: { x: 8, y: 516, w: 464, h: 336 }, k: 64 } : { Sc: { x: 10, y: 8, w: 780, h: 420 }, G: { x: 10, y: 436, w: 780, h: 176 }, k: 100 };
  }
  function cmGeom() {
    const { Sc, G, k } = LCM(), q = CM.a * (1 - CM.e), Q = CM.a * (1 + CM.e);
    const sx = PHONE ? Sc.x + 32 + Q * k : Sc.x + 70 + Q * k, sy = Sc.y + Sc.h / 2 + (PHONE ? 6 : 8);
    return { Sc, G, k, sx, sy, q, Q };
  }
  function cmPos(M) {
    const e = CM.e, E = kepE(M, e), xo = CM.a * (Math.cos(E) - e), yo = CM.a * Math.sqrt(1 - e * e) * Math.sin(E);
    const g = cmGeom(), r = CM.a * (1 - e * Math.cos(E));
    return { x: g.sx + xo * g.k, y: g.sy - yo * g.k, r, E };
  }
  const normM = (m) => { m = m % TAU; if (m < 0) m += TAU; return m; };
  const cmLeg = () => { const m = normM(CM.M); return m < Math.PI ? 'out' : 'in'; };
  const cmTailLen = (r) => (r >= 3 ? 0 : 150 * Math.pow(1 - r / 3, 1.2) * LCM().k / 100);
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); };
  CM.M = 0; CM.tailA = 1; CM.cx = 0; CM.cy = 0;
  function cmSunAngle() { const g = cmGeom(); const p = cmPos(CM.M); return Math.atan2(p.y - g.sy, p.x - g.sx); }   // 태양 → 혜성 방향 (= 꼬리 방향)
  function cmEnterPredict() {
    const p = cmPos(CM.M);
    if (p.r > 2.5) { say('태양에서 너무 멀어서 꼬리가 거의 없어요. 2.5 AU 안쪽으로 오면 예측해요.', true, 3.4); Sound.fail(); return false; }
    CM.mode = 'predict'; CM.play = false; CM.guess = -Math.PI / 2; CM.rev = 0; CM.last = ''; updateCtl(); return true;
  }
  function cmReveal() {
    CM.mode = 'reveal'; CM.rev = 0;
    const err = angDiff(CM.guess, cmSunAngle()), leg = cmLeg(), ok = err <= 18 * DEG;
    CM.errDeg = Math.round(err / DEG);
    if (ok) {
      if (leg === 'in') CM.okIn = true; else CM.okOut = true;
      const p = cmPos(CM.M); parts.burst(p.x, p.y, { count: 16, speed: 150, colors: ['#38bdf8', '#fbbf24', '#fff'] }); Sound.success();
      CM.last = '✅ 맞았어요! (' + (leg === 'in' ? '들어오는 길' : '나가는 길') + ', 오차 ' + CM.errDeg + '°)';
    } else { Sound.fail(); CM.last = '❌ ' + CM.errDeg + '° 빗나갔어요. 꼬리는 태양의 반대쪽이에요.'; }
    updateCtl();
  }
  function drawTail(x, y, ang, len, alpha, moveAng) {
    if (len < 1 || alpha <= 0.01) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
    // 먼지 꼬리: 넓고 약간 휘어요
    const bend = moveAng != null ? clamp(Math.sin(moveAng - ang), -1, 1) * 0.28 : 0;
    ctx.save(); ctx.rotate(ang + bend); let g = ctx.createLinearGradient(0, 0, len * 0.92, 0); g.addColorStop(0, 'rgba(255,236,170,.85)'); g.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -5); ctx.quadraticCurveTo(len * 0.5, -len * 0.1, len * 0.92, -len * 0.16); ctx.lineTo(len * 0.92, len * 0.16); ctx.quadraticCurveTo(len * 0.5, len * 0.1, 0, 5); ctx.closePath(); ctx.fill(); ctx.restore();
    // 이온(플라스마) 꼬리: 좁고 곧아요
    ctx.rotate(ang); g = ctx.createLinearGradient(0, 0, len, 0); g.addColorStop(0, 'rgba(125,211,252,.95)'); g.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(len, -1); ctx.lineTo(len, 1); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawComet(dt, t) {
    const g = cmGeom(), { Sc, G, k, sx, sy } = g;
    // 시간
    if (CM.mode === 'play' && CM.play) { CM.M += dt * TAU / 9; if (CM.M > Math.PI) CM.M -= TAU; }
    CM.M = Math.atan2(Math.sin(CM.M), Math.cos(CM.M));                  // -π ~ π
    const sl = $('#sMean'); if (document.activeElement !== sl || CM.mode !== 'play') { const dv = Math.round(CM.M / DEG); if (+sl.value !== dv) { sl.value = dv; updateMeanOut(); } }
    const p = cmPos(CM.M), tailAng = Math.atan2(p.y - sy, p.x - sx);
    CM.tailA = approach(CM.tailA, (CM.mode === 'predict') ? 0 : 1, dt, 9);
    CM.rev = Math.min(1, CM.rev + dt / (RM ? 0.01 : 0.7));
    // 무대
    D.shadow(() => { ctx.fillStyle = '#0b1230'; rr(Sc.x, Sc.y, Sc.w, Sc.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(Sc.x, Sc.y, Sc.w, Sc.h, 14); ctx.clip();
    spaceBg(Sc.x, Sc.y, Sc.w, Sc.h, t, '#0b1230', '#16224a');
    // 지구 궤도 · 활동 경계
    ctx.strokeStyle = 'rgba(96,165,250,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 1 * k, 0, TAU); ctx.stroke();
    outlineT(sx, sy + k + 15, '지구 궤도 1 AU', PHONE ? 10.5 : 11.5, '#93c5fd', 'center');
    ctx.strokeStyle = 'rgba(250,204,21,.4)'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(sx, sy, 3 * k, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // 혜성 궤도
    ctx.strokeStyle = 'rgba(226,232,240,.55)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const E = i / 200 * TAU, q = { x: sx + CM.a * (Math.cos(E) - CM.e) * k, y: sy - CM.a * Math.sqrt(1 - CM.e * CM.e) * Math.sin(E) * k }; i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); } ctx.stroke();
    // 방향 화살표 (공전 방향)
    { const q1 = cmPos(-1.0), q2 = cmPos(-0.9); D.arrow(q1.x, q1.y, q2.x, q2.y, { color: '#e2e8f0', width: 2, head: 9 }); }
    sunDraw(sx, sy, PHONE ? 11 : 13);
    // 근일점 · 원일점 표시
    const pq = cmPos(0), pQ = cmPos(Math.PI);
    ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(pq.x, pq.y, 3.5, 0, TAU); ctx.fill(); outlineT(pq.x + 2, pq.y + 22, '근일점 ' + f1(g.q) + ' AU', PHONE ? 10.5 : 11.5, '#fde68a', 'center');
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(pQ.x, pQ.y, 3.5, 0, TAU); ctx.fill(); outlineT(PHONE ? pQ.x - 6 : pQ.x, pQ.y + 20, '원일점 ' + f1(g.Q) + ' AU', PHONE ? 10.5 : 11.5, '#cbd5e1', PHONE ? 'left' : 'center');
    // 꼬리 + 혜성
    const len = cmTailLen(p.r), coma = 5 + 15 * Math.max(0, 1 - p.r / 3) * (k / 100 + 0.2);
    const q2 = cmPos(CM.M + 0.02), moveAng = Math.atan2(q2.y - p.y, q2.x - p.x);
    drawTail(p.x, p.y, tailAng, len * CM.tailA, 1, moveAng);
    if (coma > 6) { D.glow(p.x, p.y, coma * 1.6, '#e0f2fe', 0.55 * CM.tailA + 0.15); }
    D.sphere(p.x, p.y, PHONE ? 5 : 4.5, '#475569', { gloss: false, outline: '#e2e8f0', outlineWidth: 1 });
    // 화살표: 공전 방향 (진행) · 태양 방향
    if (CM.mode !== 'play' || !CM.play) {
      D.arrow(p.x, p.y, p.x + Math.cos(moveAng) * 38, p.y + Math.sin(moveAng) * 38, { color: '#fcd34d', width: 3, head: 10 });
      outlineT(p.x + Math.cos(moveAng) * 44, p.y + Math.sin(moveAng) * 44 + 4, '진행', PHONE ? 10.5 : 11.5, '#fde68a', Math.cos(moveAng) < 0 ? 'right' : 'left');
    }
    // 예측 화살표
    if (CM.mode === 'predict' || CM.mode === 'reveal') {
      const R = 74 * (k / 100 + 0.25), hx = p.x + Math.cos(CM.guess) * R, hy = p.y + Math.sin(CM.guess) * R;
      const okNow = CM.mode === 'reveal' && angDiff(CM.guess, tailAng) <= 18 * DEG;
      const col = CM.mode === 'reveal' ? (okNow ? '#4ade80' : '#f87171') : '#fb923c';
      D.arrow(p.x, p.y, hx, hy, { color: col, width: 4, head: 13 });
      if (CM.mode === 'predict') { D.shadow(() => D.sphere(hx, hy, 13, '#fff', { gloss: false, outline: '#fb923c', outlineWidth: 3 }), { blur: 6, y: 2 }); T(hx, hy + 4, '꼬리', 10.5, '#c2410c', 'center', 800); if (!RM) D.ring(hx, hy, 15, t, { color: '#fb923c', width: 2 }); }
      else { outlineT(hx + (Math.cos(CM.guess) < 0 ? -8 : 8), hy + 4, '내 예측', PHONE ? 11 : 12, col, Math.cos(CM.guess) < 0 ? 'right' : 'left'); }
    }
    ctx.restore();
    T(Sc.x + 14, Sc.y + 24 * FS, '☄️ 모형 혜성: a = ' + f1(CM.a) + ' AU, e = ' + f1(CM.e), 14, '#e2e8f0', 'left', 800, { stroke: 'rgba(5,10,30,.6)', strokeWidth: 3 });
    // 결과 메시지
    if (CM.last) { const w = Math.min(Sc.w - 28, 440); D.label(Sc.x + Sc.w / 2, Sc.y + Sc.h - 22, CM.last, { bg: CM.last[0] === '✅' ? '#15803d' : '#b91c1c', size: PHONE ? 12 : 13.5 }); }
    // 용어 판
    panel(G.x, G.y, G.w, G.h, { r: 14 });
    T(G.x + 14, G.y + 22 * FS, '📚 용어 카드 (눌러 보세요)', 14, '#1e293b', 'left', 800);
    const cw = (G.w - 24 - 4 * 6) / 5, cy0 = G.y + 34 * FS;
    TERMS.forEach((tm, i) => {
      const x = G.x + 12 + i * (cw + 6), on = CM.term === i, h = PHONE ? 40 : 38;
      ctx.fillStyle = on ? '#e0f2fe' : '#f1f5f9'; rr(x, cy0, cw, h, 10).fill(); ctx.strokeStyle = on ? '#0ea5e9' : '#cbd5e1'; ctx.lineWidth = on ? 3 : 1.5; rr(x, cy0, cw, h, 10).stroke();
      T(x + cw / 2, cy0 + h / 2 + 5, PHONE ? tm.n : tm.ic + ' ' + tm.n, PHONE ? 11.5 : 13.5, '#1e293b', 'center', 800);
    });
    const by = cy0 + (PHONE ? 40 : 38) + 10;
    if (CM.term < 0) drawWrap(G.x + 14, by + 16 * FS, '소행성·혜성·유성체·유성·운석은 서로 달라요. 용어를 눌러 뜻을 확인해요.', G.w - 28, 13.5, { color: '#64748b' });
    else {
      T(G.x + 14, by + 16 * FS, TERMS[CM.term].n, 15, '#0369a1', 'left', 800);
      drawWrap(G.x + 14, by + 38 * FS, TERMS[CM.term].t, G.w - 28, 13.5, { color: '#334155' });
    }
    // 유성체 → 유성 → 운석
    const ch = [['유성체', '우주 공간', 2], ['유성', '대기에서 빛남', 3], ['운석', '지표에 도착', 4]], cx0 = G.x + 20, cwid = (G.w - 40) / 3, yy = G.y + G.h - (PHONE ? 36 : 30);
    ch.forEach((c, i) => {
      const x = cx0 + i * cwid, on = CM.term === c[2];
      D.label(x + 4, yy, (i + 1) + ' ' + c[0], { bg: on ? '#0ea5e9' : '#64748b', size: 12.5, align: 'left', pad: 8 });
      if (!PHONE) T(x + 4 + 70, yy + 4, c[1], 12, on ? '#0369a1' : '#64748b', 'left', 700);
      if (i < 2) D.arrow(x + cwid - 22, yy, x + cwid - 4, yy, { color: '#94a3b8', width: 2, head: 7 });
    });
  }
  function cmDown(p) {
    const G = LCM().G, cw = (G.w - 24 - 4 * 6) / 5, cy0 = G.y + 34 * FS, h = PHONE ? 40 : 38;
    for (let i = 0; i < 5; i++) { const x = G.x + 12 + i * (cw + 6); if (inR(p, { x, y: cy0, w: cw, h })) { CM.term = CM.term === i ? -1 : i; Sound.click(); return false; } }
    if (CM.mode === 'predict') {
      const pc = cmPos(CM.M), k = LCM().k, R = 74 * (k / 100 + 0.25), hx = pc.x + Math.cos(CM.guess) * R, hy = pc.y + Math.sin(CM.guess) * R;
      if (Math.hypot(p.x - hx, p.y - hy) < 34) { CM.drag = true; return true; }
    }
    return false;
  }
  function cmMove(p) { if (!CM.drag) return; const pc = cmPos(CM.M); CM.guess = Math.atan2(p.y - pc.y, p.x - pc.x); }
  function updateMeanOut() { const s = $('#sMean'); s.style.setProperty('--pct', ((s.value - s.min) / (s.max - s.min)) * 100 + '%'); $('#oMean').textContent = (+s.value > 0 ? '+' : '') + s.value + '°'; }

  /* =========================================================
     ③ 탐사 자료 보드: 밀도 ρ = M / V
     ========================================================= */
  const DT = S.dt;
  function LDT() {
    if (PHONE) {
      const cw = 150, ch = 86;
      return { cards: DB.map((_, i) => ({ x: 8 + (i % 3) * (cw + 7), y: 8 + Math.floor(i / 3) * (ch + 6), w: cw, h: ch })), Pp: { x: 8, y: 194, w: 464, h: 214 }, Cp: { x: 8, y: 416, w: 464, h: 232 }, Bp: { x: 8, y: 656, w: 464, h: 196 } };
    }
    const cw = (780 - 5 * 8) / 6;
    return { cards: DB.map((_, i) => ({ x: 10 + i * (cw + 8), y: 8, w: cw, h: 98 })), Pp: { x: 10, y: 114, w: 336, h: 262 }, Cp: { x: 354, y: 114, w: 436, h: 262 }, Bp: { x: 10, y: 384, w: 780, h: 228 } };
  }
  /* 표면 모식도: 특징 위치를 시드로 고정해요 */
  const SURF = {};
  (function () {
    const mk = (id, seed, o) => {
      const r = rng(seed), F = [];
      const inside = () => { let u, v; do { u = r() * 2 - 1; v = r() * 2 - 1; } while (u * u + v * v > 0.8); return [u, v]; };
      for (let i = 0; i < (o.crater || 0); i++) { const [u, v] = inside(); F.push({ t: 'c', u, v, s: (o.crMin || 0.06) + r() * (o.crMax || 0.14) }); }
      for (let i = 0; i < (o.boulder || 0); i++) { const [u, v] = inside(); F.push({ t: 'b', u, v, s: 0.025 + r() * 0.045 }); }
      for (let i = 0; i < (o.crack || 0); i++) { const [u, v] = inside(); F.push({ t: 'k', u, v, s: 0.15 + r() * 0.3, a: r() * Math.PI }); }
      for (let i = 0; i < (o.mare || 0); i++) { const [u, v] = inside(); F.push({ t: 'm', u: u * 0.8, v: v * 0.8, s: 0.2 + r() * 0.22 }); }
      for (let i = 0; i < (o.groove || 0); i++) F.push({ t: 'g', u: 0, v: -0.22 + i * 0.11 + (r() - 0.5) * 0.03, s: 1 });
      for (let i = 0; i < (o.bright || 0); i++) F.push({ t: 'w', u: 0.18 + i * 0.16, v: -0.1 + i * 0.1, s: 0.07 - i * 0.02 });
      if (o.basin) F.push({ t: 'c', u: 0.05, v: 0.62, s: 0.46 });
      SURF[id] = F;
    };
    mk('ryugu', 11, { crater: 4, boulder: 34, crMin: 0.1, crMax: 0.12 });
    mk('bennu', 12, { crater: 3, boulder: 40, crMin: 0.1, crMax: 0.1 });
    mk('p67', 13, { crater: 0, boulder: 16, crack: 7 });
    mk('vesta', 14, { crater: 9, groove: 5, basin: true, crMin: 0.06, crMax: 0.1 });
    mk('ceres', 15, { crater: 18, bright: 2, crMin: 0.04, crMax: 0.1 });
    mk('moon', 16, { crater: 16, mare: 4, crMin: 0.04, crMax: 0.09 });
  })();
  function shapePath(id, cx, cy, R) {
    ctx.beginPath();
    if (id === 'ryugu' || id === 'bennu') {
      const nn = id === 'ryugu' ? 1.55 : 2.4, ky = id === 'ryugu' ? 0.92 : 0.95;
      for (let i = 0; i <= 72; i++) {
        const a = i / 72 * TAU, cs = Math.cos(a), sn = Math.sin(a);
        const x = cx + R * Math.sign(cs) * Math.pow(Math.abs(cs), 2 / nn), y = cy + R * ky * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / nn);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    } else if (id === 'p67') {
      ctx.arc(cx - R * 0.34, cy + R * 0.04, R * 0.62, 0, TAU); ctx.moveTo(cx + R * 0.78, cy - R * 0.12); ctx.arc(cx + R * 0.46, cy - R * 0.12, R * 0.4, 0, TAU);
    } else if (id === 'vesta') { ctx.ellipse(cx, cy, R, R * 0.9, 0, 0, TAU); }
    else ctx.arc(cx, cy, R, 0, TAU);
  }
  function drawSurface(id, cx, cy, R, t, spin) {
    const b = DB.find((x) => x.id === id), F = SURF[id];
    ctx.save();
    if (spin && !RM) { ctx.translate(cx, cy); ctx.rotate(Math.sin(t * 0.35) * 0.35); ctx.translate(-cx, -cy); }
    shapePath(id, cx, cy, R);
    D.shadow(() => { ctx.fillStyle = b.col; ctx.fill(); }, { blur: 8, y: 3, color: 'rgba(0,0,0,.35)' });
    shapePath(id, cx, cy, R); ctx.clip();
    const cdark = shade(b.col, -0.28), clite = shade(b.col, 0.3);
    F.forEach((f) => {
      const x = cx + f.u * R, y = cy + f.v * R, s = f.s * R;
      if (f.t === 'c') {
        const g = ctx.createRadialGradient(x - s * 0.25, y - s * 0.25, s * 0.1, x, y, s); g.addColorStop(0, rgba(cdark, 0.75)); g.addColorStop(0.8, rgba(cdark, 0.35)); g.addColorStop(1, rgba(clite, 0.45));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
      } else if (f.t === 'b') { ctx.fillStyle = rgba('#000000', 0.28); ctx.beginPath(); ctx.ellipse(x + s * 0.45, y + s * 0.45, s * 1.1, s * 0.7, 0.5, 0, TAU); ctx.fill(); ctx.fillStyle = clite; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); }
      else if (f.t === 'k') { ctx.strokeStyle = rgba(cdark, 0.85); ctx.lineWidth = Math.max(1, R * 0.018); ctx.beginPath(); ctx.moveTo(x - Math.cos(f.a) * f.s * R, y - Math.sin(f.a) * f.s * R); ctx.lineTo(x + Math.cos(f.a) * f.s * R, y + Math.sin(f.a) * f.s * R); ctx.stroke(); }
      else if (f.t === 'm') { ctx.fillStyle = rgba(cdark, 0.55); ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.8, 0.5, 0, TAU); ctx.fill(); }
      else if (f.t === 'g') { ctx.strokeStyle = rgba(cdark, 0.6); ctx.lineWidth = Math.max(1, R * 0.02); ctx.beginPath(); ctx.moveTo(cx - R, y); ctx.lineTo(cx + R, y); ctx.stroke(); }
      else if (f.t === 'w') { D.glow(x, y, s * R * 0.7 + 6, '#ffffff', 0.9); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, Math.max(1.8, s * R * 0.35), 0, TAU); ctx.fill(); }
    });
    const sh = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.1, cx, cy, R * 1.25);
    sh.addColorStop(0, 'rgba(255,255,255,.28)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = sh; ctx.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);
    ctx.restore();
    // 혜성 분출 (67P)
    if (id === 'p67') { ctx.save(); ctx.strokeStyle = 'rgba(224,242,254,.7)'; ctx.lineWidth = Math.max(1, R * 0.03); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - R * 0.1 + i * R * 0.12, cy - R * 0.55); ctx.lineTo(cx - R * 0.1 + i * R * 0.12 + R * 0.1, cy - R * 1.1); ctx.stroke(); } ctx.restore(); }
  }
  const dtSel = () => DB[DT.sel];
  const fD = (d) => (d < 1 ? f2(d) : d < 10 ? f2(d) : comma(d));
  function porPct() { const b = DB[0]; return (1 - b.rho / RHO_ROCK) * 100; }
  function drawData(dt, t) {
    const L = LDT(), b = dtSel(), i0 = DT.sel;
    DT.enter = Math.min(1, DT.enter + dt / (RM ? 0.01 : 0.7));
    // 카드
    DB.forEach((o, i) => {
      const c = L.cards[i], on = i === DT.sel, k = SciSim.ease.outBack(clamp(DT.enter * 1.5 - i * 0.12, 0, 1));
      ctx.save(); const cxm = c.x + c.w / 2, cym = c.y + c.h / 2; ctx.translate(cxm, cym); ctx.scale(k, k); ctx.translate(-cxm, -cym);
      D.shadow(() => { ctx.fillStyle = on ? '#e0f2fe' : '#ffffff'; rr(c.x, c.y, c.w, c.h, 12).fill(); }, { blur: on ? 9 : 5, y: 2 });
      ctx.strokeStyle = on ? '#0ea5e9' : '#cbd5e1'; ctx.lineWidth = on ? 3 : 1.5; rr(c.x, c.y, c.w, c.h, 12).stroke();
      drawSurface(o.id, c.x + c.w / 2, c.y + (PHONE ? 30 : 36), PHONE ? 19 : 24, t, false);
      T(c.x + c.w / 2, c.y + c.h - (PHONE ? 22 : 24) * Math.min(FS, 1.1), o.n, 13.5, '#1e293b', 'center', 800);
      T(c.x + c.w / 2, c.y + c.h - 6 * Math.min(FS, 1.15), DT.rho[i] ? f2(o.rho) + ' g/cm³' : (o.kind), 11.5, DT.rho[i] ? '#15803d' : '#64748b', 'center', 800);
      ctx.restore();
    });
    // 사진 판
    const P = L.Pp;
    D.shadow(() => { ctx.fillStyle = '#0f172a'; rr(P.x, P.y, P.w, P.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14); ctx.clip(); spaceBg(P.x, P.y, P.w, P.h, t, '#0b1230', '#111d3d'); ctx.restore();
    const pr = Math.min(P.w, P.h) * 0.3;
    drawSurface(b.id, P.x + P.w / 2, P.y + P.h / 2 - 6, pr, t, true);
    outlineT(P.x + 14, P.y + 24 * FS, '📷 ' + b.n + ' · ' + b.probe, 14, '#e2e8f0', 'left');
    outlineT(P.x + P.w / 2, P.y + P.h - 12, '탐사선 사진을 본뜬 모식도 (크기는 맞추지 않았어요)', PHONE ? 10.5 : 11.5, '#93a4c3', 'center');
    // 계산 판
    const C = L.Cp; panel(C.x, C.y, C.w, C.h, { r: 14 });
    T(C.x + 14, C.y + 24 * FS, '🧮 ' + b.n + '의 밀도', 15, '#1e293b', 'left', 800);
    const lx = C.x + 14, vx = C.x + C.w - 14;
    let y = C.y + 52 * FS;
    T(lx, y, '지름 d', 14, '#475569', 'left', 800); T(vx, y, fD(b.d) + ' km  (= ' + comma(b.d * 1000) + ' m)', 14, '#1e293b', 'right', 800); y += 30 * FS;
    T(lx, y, '질량 M', 14, '#475569', 'left', 800); T(vx, y, sci(b.M, 2) + ' kg', 14, '#1e293b', 'right', 800); y += 30 * FS;
    DT.volV[i0] = DT.vol[i0] ? roll(DT.volV[i0], b.V, dt) : 0;
    T(lx, y, '부피 V = π/6 × d³', 14, '#475569', 'left', 800); T(vx, y, DT.vol[i0] ? sci(Math.max(DT.volV[i0], 1), 2) + ' m³' : '?', 14, DT.vol[i0] ? '#0369a1' : '#94a3b8', 'right', 800); y += 30 * FS;
    DT.rhoV[i0] = DT.rho[i0] ? roll(DT.rhoV[i0], b.rho, dt) : 0;
    ctx.fillStyle = DT.rho[i0] ? 'rgba(22,163,74,.1)' : 'rgba(100,116,139,.07)'; rr(C.x + 8, y - 20 * FS, C.w - 16, 30 * FS, 8).fill();
    T(lx, y, '밀도 ρ = M / V', 14.5, '#1e293b', 'left', 800); T(vx, y, DT.rho[i0] ? f2(DT.rhoV[i0]) + ' g/cm³  (' + comma(DT.rhoV[i0] * 1000) + ' kg/m³)' : '?', 14.5, DT.rho[i0] ? '#15803d' : '#94a3b8', 'right', 800); y += 32 * FS;
    if (DT.rho[i0]) {
      const yy = drawWrap(lx, y, '물 = 1.00 g/cm³ · ' + (b.rock ? '구성 암석 약 ' + f1(b.rock) + ' g/cm³' : b.id === 'moon' ? '달의 평균 밀도' : ''), C.w - 28, 12.5, { color: '#64748b' });
      drawWrap(lx, yy + 20 * FS, '🔎 ' + b.inf, C.w - 28, 13, { color: '#0f172a', weight: 800 });
    } else drawWrap(lx, y, '① 부피를 구하고 ② M / V로 밀도를 계산해요. 1 g/cm³ = 1000 kg/m³', C.w - 28, 12.5, { color: '#64748b' });
    if (DT.rho[0] && (S.flags.porBox || FREE()) && i0 === 0) { const por = porPct(); T(vx, C.y + C.h - 12, DT.porOk || FREE() ? '공극률 = 1 − ρ/ρ암석 ≈ ' + f0(por) + ' %' : '공극률 = 1 − ρ/ρ암석 = ?', 13, '#b45309', 'right', 800); }
    // 막대 그래프
    const B = L.Bp; panel(B.x, B.y, B.w, B.h, { r: 14 });
    T(B.x + 14, B.y + 24 * FS, '📊 모둠 데이터 보드: 밀도 비교 (g/cm³)', 14.5, '#1e293b', 'left', 800);
    const lw = PHONE ? 72 : 92, bx = B.x + 14 + lw, bw = B.w - 28 - lw - (PHONE ? 46 : 60), top = B.y + 40 * FS, rh = (B.h - 40 * FS - (PHONE ? 22 : 26)) / 6, VMAX = 4;
    const X = (v) => bx + clamp(v / VMAX, 0, 1) * bw;
    DB.forEach((o, i) => {
      const y = top + i * rh, h = Math.min(rh * 0.62, 20);
      DT.bar[i] = approach(DT.bar[i], DT.rho[i] ? o.rho : 0, dt, 6);
      T(B.x + 14, y + h * 0.5 + 6, o.n, PHONE ? 12 : 13.5, i === DT.sel ? '#0369a1' : '#334155', 'left', 800);
      hbar(bx, y, bw, h, DT.bar[i], VMAX, o.col === '#cbd5e1' ? '#94a3b8' : o.col);
      if (DT.rho[i]) T(X(DT.bar[i]) + 6, y + h * 0.5 + 5, f2(o.rho), 12.5, '#1e293b', 'left', 800);
      else T(bx + 8, y + h * 0.5 + 5, '아직 계산 안 함', 11.5, '#94a3b8', 'left', 700);
    });
    [[1, '물 1.0', '#0ea5e9'], [RHO_ROCK, '암석 2.4', '#d97706']].forEach(([v, lab, c]) => {
      const x = X(v); D.dashedLine(x, top - 4, x, top + 6 * rh - 2, { color: c, width: 2, dash: [5, 4] }); T(x, B.y + B.h - 8, lab, 12, c, 'center', 800);
    });
    T(bx, B.y + B.h - 8, '0', 12, '#64748b', 'left', 700); T(bx + bw, B.y + B.h - 8, '4', 12, '#64748b', 'right', 700);
  }
  function dtDown(p) {
    const L = LDT();
    L.cards.forEach((c, i) => { if (inR(p, c) && DT.sel !== i) { DT.sel = i; Sound.click(); updateCtl(); } });
    return false;
  }
  function dtCheckRho(fromInput) {
    const b = dtSel(), v = numOf('inRho'); if (v == null) return false;
    const ok = Math.abs(v - b.rho) <= b.rho * 0.07 + 0.005;
    if (ok) { if (!DT.rho[DT.sel]) { DT.rho[DT.sel] = true; DT.vol[DT.sel] = true; parts.burst(LDT().Cp.x + LDT().Cp.w - 60, LDT().Cp.y + 100, { count: 14, speed: 140 }); Sound.success(); updateCtl(); } fbIn('inRho', true); }
    else if (!fromInput) { fbIn('inRho', false); say('밀도가 달라요. V = π/6 × d³ (m³)을 먼저 구하고 M / V를 g/cm³로 바꿔 보세요.', true, 3.6); Sound.fail(); }
    return ok;
  }

  /* =========================================================
     ④ 운석 분류와 베스타의 분화
     ========================================================= */
  const MT = S.mt;
  function LMT() {
    if (PHONE) return { grid: { x: 8, y: 8, w: 464, cols: 2, cardH: 44, gap: 6 }, bins: [{ x: 8, y: 210, w: 464, h: 136 }, { x: 8, y: 352, w: 464, h: 136 }], V: { x: 8, y: 496, w: 464, h: 150 }, R: { x: 8, y: 654, w: 464, h: 198 } };
    return { grid: { x: 10, y: 8, w: 780, cols: 4, cardH: 50, gap: 8 }, bins: [{ x: 10, y: 124, w: 386, h: 170 }, { x: 404, y: 124, w: 386, h: 170 }], V: { x: 10, y: 302, w: 430, h: 310 }, R: { x: 448, y: 302, w: 342, h: 310 } };
  }
  const cM = makeClassifier({
    items: MET.map((m) => ({ id: m.n, label: m.n, sub: m.sub, bin: m.bin, open: true, chip: m.n })),
    bins: [{ label: '🧊 원시 물질 천체의 조각', sub: '한 번도 녹지 않은 천체', color: '#16a34a' }, { label: '🔥 분화된 천체의 조각', sub: '내부가 녹아 층으로 나뉜 천체', color: '#7c3aed' }],
    chipCols: 2, minRows: 3,
    layout: () => { const L = LMT(); return { grid: L.grid, bins: L.bins }; },
    onPlace(it, b) {
      it.wrong = b !== it.bin;
      if (it.wrong) { say('「' + it.label + '」은(는) 그 상자가 아니에요. 콘드룰이 있으면 한 번도 녹지 않은 물질이에요.', true, 3.4); Sound.fail(); }
      else parts.burst(it.x + it.w / 2, it.y + it.h / 2, { count: 10, speed: 120, colors: [b === 0 ? '#16a34a' : '#7c3aed', '#fbbf24'] });
    },
    onChange() { updateCtl(); },
  });
  /* 베스타 속의 철 알갱이: 처음엔 흩어져 있다가 녹으면 중심으로 가라앉아요 */
  const SPECK = (function () {
    const r = rng(77), N = 54, out = [];
    for (let i = 0; i < N; i++) {
      const a = r() * TAU, rad = Math.sqrt(r()) * 0.92;
      const fa = i * 2.39996, fr = 0.38 * Math.sqrt((i + 0.5) / N);
      out.push({ x0: Math.cos(a) * rad, y0: Math.sin(a) * rad, x1: Math.cos(fa) * fr, y1: Math.sin(fa) * fr, d: r() * 0.35, s: 0.9 + r() * 0.9 });
    }
    return out;
  })();
  const GRAINS = (function () { const r = rng(99), out = []; for (let i = 0; i < 70; i++) { const a = r() * TAU, rad = Math.sqrt(r()) * 0.95; out.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, s: 0.6 + r() * 1.2, c: r() }); } return out; })();
  const mtOk = () => cM.items.every((i) => cM.isRight(i)) && cM.items.every((i) => i.loc != null);
  const evOK = () => EVID.every((e, i) => e.ok === MT.ev[i]);
  function drawMeteor(dt, t) {
    const L = LMT(), V = L.V, Rp = L.R;
    // 가열 상태
    const big = MT.size === 0, tgt = MT.heat ? (big ? 1500 : 320) : 20;
    const rate = MT.heat ? 330 : 700;
    if (MT.temp < tgt) MT.temp = Math.min(tgt, MT.temp + rate * dt * (RM ? 20 : 1)); else if (MT.temp > tgt) MT.temp = Math.max(tgt, MT.temp - rate * dt * (RM ? 20 : 1));
    MT.p = clamp((MT.temp - 950) / 450, 0, 1);
    // 베스타 단면 판
    D.shadow(() => { ctx.fillStyle = '#0f172a'; rr(V.x, V.y, V.w, V.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(V.x, V.y, V.w, V.h, 14); ctx.clip(); spaceBg(V.x, V.y, V.w, V.h, t, '#0b1230', '#111d3d');
    const cx = V.x + V.w / 2 + (PHONE ? 20 : 26), cy = V.y + V.h / 2 + (PHONE ? 8 : 10), Rbig = Math.min(V.w * 0.34, V.h * 0.38), R = big ? Rbig : Rbig * 0.3;
    const p = MT.p, eo = SciSim.ease.inOutCubic(p);
    // 바탕 암석
    const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, '#9a8f84'); g.addColorStop(1, '#6b6259'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    GRAINS.forEach((gr) => { ctx.fillStyle = gr.c > 0.5 ? 'rgba(210,190,160,.55)' : 'rgba(70,60,50,.5)'; ctx.beginPath(); ctx.arc(cx + gr.x * R, cy + gr.y * R, gr.s * (R / Rbig) * 1.8 + 0.4, 0, TAU); ctx.fill(); });
    // 층 (분화가 진행되면 나타나요)
    const aMantle = smooth((p - 0.35) / 0.4), aCrust = smooth((p - 0.55) / 0.4);
    ctx.fillStyle = rgba('#7f8f4a', 0.9 * aMantle); ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba('#3f4a5a', 0.95 * aCrust); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.arc(cx, cy, R * 0.9, 0, TAU, true); ctx.fill();
    const rc = R * 0.42 * smooth((p - 0.15) / 0.7);
    if (rc > 1) { const cg = ctx.createRadialGradient(cx - rc * 0.3, cy - rc * 0.3, rc * 0.1, cx, cy, rc); cg.addColorStop(0, '#cbd5e1'); cg.addColorStop(1, '#64748b'); ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, rc, 0, TAU); ctx.fill(); }
    // 철 알갱이
    SPECK.forEach((s) => {
      const k = SciSim.ease.inOutCubic(clamp((p * 1.35 - s.d) / 0.65, 0, 1));
      const x = cx + lerp(s.x0, s.x1, k) * R, y = cy + lerp(s.y0, s.y1, k) * R;
      ctx.fillStyle = k > 0.95 ? 'rgba(226,232,240,.0)' : '#334155'; ctx.beginPath(); ctx.arc(x, y, s.s * (R / Rbig) * 2.1 + 0.5, 0, TAU); ctx.fill();
      if (k <= 0.95) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(x - 0.6, y - 0.6, s.s * (R / Rbig) * 0.8, 0, TAU); ctx.fill(); }
    });
    // 열 빛
    if (MT.temp > 600 && big) { const a = clamp((MT.temp - 600) / 800, 0, 1) * (1 - p * 0.6); const hg = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R); hg.addColorStop(0, 'rgba(255,140,40,' + (0.55 * a).toFixed(3) + ')'); hg.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = hg; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R); }
    const sh = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.1, cx, cy, R * 1.2); sh.addColorStop(0, 'rgba(255,255,255,.22)'); sh.addColorStop(0.55, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.5)'); ctx.fillStyle = sh; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    ctx.restore();
    ctx.strokeStyle = 'rgba(226,232,240,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    // 층 이름
    if (big && p > 0.85) {
      const lab = (txt, ang, rad, col) => { const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad; outlineT(x, y, txt, PHONE ? 11 : 12.5, col, 'center'); };
      lab('핵(철·니켈)', 0, 0, '#f8fafc'); lab('맨틀', -2.2, R * 0.66, '#ecfccb'); lab('지각(현무암)', -0.9, R * 0.96 + (PHONE ? 6 : 10), '#e2e8f0');
    }
    // 고른 운석이 온 곳
    const sc = cM.sel >= 0 ? MET[cM.sel] : null;
    if (sc && big && p > 0.6) {
      const lay = sc.layer;
      if (lay === 'core') D.ring(cx, cy, R * 0.42, t, { color: '#facc15', width: 3 });
      else if (lay === 'boundary') D.ring(cx, cy, R * 0.45, t, { color: '#facc15', width: 3 });
      else if (lay === 'crust') D.ring(cx, cy, R * 0.97, t, { color: '#facc15', width: 3 });
    }
    ctx.restore();
    outlineT(V.x + 14, V.y + 24 * FS, '🔥 분화: 녹으면 무거운 철이 가라앉아요', 14, '#e2e8f0', 'left');
    outlineT(cx, V.y + V.h - 12, big ? '베스타급 (지름 523 km)' : '작은 소행성 (지름 1 km) · 그림은 크기를 맞추지 않았어요', PHONE ? 10.5 : 12, '#93a4c3', 'center');
    // 온도계
    const tx = V.x + 30, ty0 = V.y + 50 * FS, th = V.h - 100 * FS, Tmax = 1600;
    ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(tx - 7, ty0, 14, th, 7).fill();
    const fh = clamp(MT.temp / Tmax, 0, 1) * th;
    const tg = ctx.createLinearGradient(0, ty0 + th, 0, ty0); tg.addColorStop(0, '#38bdf8'); tg.addColorStop(0.55, '#fbbf24'); tg.addColorStop(1, '#ef4444');
    ctx.save(); rr(tx - 7, ty0, 14, th, 7); ctx.clip(); ctx.fillStyle = tg; ctx.fillRect(tx - 7, ty0 + th - fh, 14, fh); ctx.restore();
    const my = ty0 + th - (1000 / Tmax) * th; D.dashedLine(tx - 14, my, tx + 22, my, { color: '#fca5a5', width: 2, dash: [4, 3] });
    outlineT(tx + 14, my - 6, '녹는 온도', 11, '#fecaca', 'left'); outlineT(tx + 14, my + 8, '약 1000 ℃', 11, '#fecaca', 'left');
    outlineT(tx, ty0 + th + 22, f0(MT.temp) + ' ℃', 12.5, '#f8fafc', 'center');
    if (!big && MT.temp >= 300) outlineT(cx, V.y + 52 * FS, '열이 빨리 빠져나가 녹지 못해요', 12.5, '#fde68a', 'center');
    // 오른쪽 판: 고른 운석 + 낙하 비율
    panel(Rp.x, Rp.y, Rp.w, Rp.h, { r: 14 });
    T(Rp.x + 14, Rp.y + 22 * FS, '☄️ 고른 운석', 14, '#1e293b', 'left', 800);
    let yy = Rp.y + 42 * FS;
    if (!sc) yy = drawWrap(Rp.x + 14, yy, '카드를 눌러 설명을 읽고, 베스타 단면에서 어디서 왔는지 찾아봐요.', Rp.w - 28, 13, { color: '#64748b' });
    else {
      T(Rp.x + 14, yy, sc.n, 14.5, '#0369a1', 'left', 800);
      yy = drawWrap(Rp.x + 14, yy + 20 * FS, sc.info, Rp.w - 28, 12.5, { color: '#334155' });
      if (sc.layer === 'none') yy = drawWrap(Rp.x + 14, yy + 18 * FS, '→ 베스타 단면에는 없어요. 녹은 적이 없는 천체의 조각이에요.', Rp.w - 28, 12.5, { color: '#15803d', weight: 800 });
      else if (big && p < 0.6) yy = drawWrap(Rp.x + 14, yy + 18 * FS, '→ 🔥 가열해서 베스타를 분화시키면 어디서 왔는지 보여요.', Rp.w - 28, 12.5, { color: '#b45309', weight: 800 });
      else if (!big) yy = drawWrap(Rp.x + 14, yy + 18 * FS, '→ 베스타급 천체를 골라 가열해 보세요.', Rp.w - 28, 12.5, { color: '#b45309', weight: 800 });
    }
    const fy = Math.max(yy + 18 * FS, Rp.y + Rp.h - (PHONE ? 4 : 0) - 4 * (PHONE ? 20 : 26) - 22 * FS);
    T(Rp.x + 14, fy, '🌠 관측된 낙하 운석 (%)', 13, '#1e293b', 'left', 800);
    const lw = PHONE ? 92 : 104, bx = Rp.x + 14 + lw, bw = Rp.w - 28 - lw - 34, rh = Math.min(PHONE ? 20 : 26, (Rp.y + Rp.h - fy - 12) / 4);
    FALL.forEach((f, i) => { const y = fy + 8 + i * rh; T(Rp.x + 14, y + rh * 0.55 + 4, f[0], 12, '#334155', 'left', 800); hbar(bx, y + 2, bw, rh - 6, f[1], 100, f[2]); T(bx + bw + 6, y + rh * 0.55 + 4, f[1] + '', 12, '#1e293b', 'left', 800); });
    cM.draw(dt, {});
  }

  /* =========================================================
     컨트롤 · 입력 · 장면 전환
     ========================================================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); if (v === 'mu') S.mu.fly = 0; if (v === 'data') S.dt.enter = 0; }
    updateCtl();
  }
  const grpBody = $('#grpBody'), grpEv = $('#grpEv');
  DB.forEach((b, i) => { const e = document.createElement('button'); e.type = 'button'; e.className = 'opt'; e.dataset.k = i; e.textContent = b.n; grpBody.appendChild(e); });
  EVID.forEach((ev, i) => { const e = document.createElement('button'); e.type = 'button'; e.className = 'opt'; e.dataset.k = i; e.style.textAlign = 'left'; e.style.padding = '6px 10px'; e.textContent = ev.t; grpEv.appendChild(e); });
  grpEv.style.gridTemplateColumns = '1fr';
  function updateCtl() {
    const free = FREE();
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcPor').hidden = !(S.view === 'data' && (S.flags.porBox || free));
    $('#evBox').hidden = !(S.view === 'meteor' && (S.flags.evBox || free));
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    // judge
    $$('#grpCls .opt').forEach((b) => { b.disabled = cJ.sel < 0; });
    // scatter
    const si = S.sc.sel, ag = si >= 0 ? S.sc.asg[si] : -1;
    $('#scSel').textContent = si < 0 ? '🔵 점을 눌러 고르세요' : '🔵 ' + (ag >= 0 ? SC[si].n : '미확인 천체 ' + (si + 1));
    $$('#grpGrp .opt').forEach((b) => { b.disabled = si < 0; b.classList.toggle('on', +b.dataset.k === ag); });
    // comet
    $('#bPlay').disabled = CM.mode !== 'play'; $('#bPlay').textContent = CM.play ? '⏸ 멈추기' : '▶ 돌리기';
    $('#bPredict').textContent = CM.mode === 'play' ? '🎯 꼬리 방향 예측' : CM.mode === 'predict' ? '🔎 꼬리 확인' : '▶ 다시 돌리기';
    $('#sMean').disabled = CM.mode === 'predict';
    $('#cmNote').textContent = CM.mode === 'play' ? '혜성이 태양에서 2.5 AU 안쪽일 때 멈추고 꼬리 방향을 예측해요.' : CM.mode === 'predict' ? '주황색 손잡이를 끌어 꼬리가 향할 방향에 놓고 확인을 눌러요.' : (CM.last || '');
    // data
    $$('#grpBody .opt').forEach((b) => { b.classList.toggle('on', +b.dataset.k === DT.sel); b.classList.toggle('done', DT.rho[+b.dataset.k]); });
    $('#bVol').disabled = DT.vol[DT.sel]; $('#bAuto').disabled = DT.rho[DT.sel] || (DT.sel === 0 && !DT.rho[0]);
    $('#bAuto').title = DT.sel === 0 && !DT.rho[0] ? '류구는 직접 계산해서 입력해 보세요' : '';
    // meteor
    $$('#grpSize .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === MT.size));
    $('#bHeat').textContent = MT.heat ? '🔥 가열 중…' : '🔥 가열하기'; $('#bHeat').disabled = MT.heat;
    $$('#grpEv .opt').forEach((b) => b.classList.toggle('on', MT.ev[+b.dataset.k]));
  }
  modeBtns.forEach((b) => clickable(b, () => setView(b.dataset.view)));
  $$('#grpCls .opt').forEach((b) => clickable(b, () => { if (cJ.sel >= 0) cJ.place(cJ.items[cJ.sel], +b.dataset.k); }));
  $('#sMu').addEventListener('input', () => { S.mu.c = +$('#sMu').value; updateMuOut(); });
  $$('#grpGrp .opt').forEach((b) => clickable(b, () => scAssign(+b.dataset.k)));
  $('#sMean').addEventListener('input', () => {
    CM.M = +$('#sMean').value * DEG; CM.play = false;
    if (CM.mode === 'reveal') { CM.mode = 'play'; CM.last = ''; }
    updateMeanOut(); updateCtl();
  });
  clickable($('#bPlay'), () => { if (CM.mode === 'play') { CM.play = !CM.play; updateCtl(); } });
  clickable($('#bPredict'), () => {
    if (CM.mode === 'play') cmEnterPredict();
    else if (CM.mode === 'predict') cmReveal();
    else { CM.mode = 'play'; CM.play = true; CM.last = ''; updateCtl(); }
  });
  $$('#grpBody .opt').forEach((b) => clickable(b, () => { DT.sel = +b.dataset.k; clrIn('inRho'); updateCtl(); }));
  clickable($('#bVol'), () => { DT.vol[DT.sel] = true; updateCtl(); });
  clickable($('#bAuto'), () => { if (DT.sel === 0 && !DT.rho[0]) return; DT.vol[DT.sel] = true; DT.rho[DT.sel] = true; updateCtl(); });
  $('#inRho').addEventListener('input', () => dtCheckRho(true));
  $('#inRho').addEventListener('change', () => dtCheckRho(false));
  $('#inRho').addEventListener('keydown', (e) => { if (e.key === 'Enter') dtCheckRho(false); });
  $$('#grpSize .opt').forEach((b) => clickable(b, () => { MT.size = +b.dataset.k; MT.heat = false; updateCtl(); }));
  clickable($('#bHeat'), () => { MT.heat = true; updateCtl(); });
  clickable($('#bCool'), () => { MT.heat = false; updateCtl(); });
  $$('#grpEv .opt').forEach((b) => clickable(b, () => { const i = +b.dataset.k; MT.ev[i] = !MT.ev[i]; updateCtl(); }));

  SciSim.pointer(view, {
    down(p) {
      switch (S.view) {
        case 'judge': { const r = cJ.down(p); updateCtl(); return r; }
        case 'mu': return muDown(p);
        case 'scatter': return scDown(p);
        case 'comet': return cmDown(p);
        case 'data': return dtDown(p);
        case 'meteor': { const r = cM.down(p); updateCtl(); return r; }
        default: return false;
      }
    },
    move(p) { if (S.view === 'judge') cJ.move(p); else if (S.view === 'mu') muMove(p); else if (S.view === 'comet') cmMove(p); else if (S.view === 'meteor') cM.move(p); },
    up(p) { if (S.view === 'judge') { cJ.up(p); updateCtl(); } else if (S.view === 'comet') CM.drag = false; else if (S.view === 'meteor') { cM.up(p); updateCtl(); } },
    hover(p) {
      if (S.view === 'judge') return cJ.hit(p) ? 'pointer' : '';
      if (S.view === 'meteor') return cM.hit(p) ? 'pointer' : '';
      if (S.view === 'mu') { const g = muGeom(); return Math.abs(p.x - g.X(S.mu.c)) < 26 && p.y > g.top - 30 ? 'ew-resize' : ''; }
      if (S.view === 'scatter') { const g = scGeom(); return SC.some((o) => Math.hypot(g.X(o.a) - p.x, g.Y(o.e) - p.y) < 18) ? 'pointer' : ''; }
      if (S.view === 'data') return LDT().cards.some((c) => inR(p, c)) ? 'pointer' : '';
      return '';
    },
  });

  /* ================= 미션 ================= */
  const fb = (b, ok, bad) => (b ? ok : bad);
  const levels = [
    {
      title: '행성의 조건: 누가 행성일까?', short: '행성의 조건', icon: '✅', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 행성이 아닌 태양계 천체들은 어떻게 구분하고, 그 속에는 어떤 정보가 숨어 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 태양계 식구(행성·왜소행성·소행성·혜성)를 배웠어요. 이번에는 <b>국제천문연맹(IAU)의 2006년 정의</b> 세 가지 조건을 직접 적용해 천체를 판정해요. 뒤 단계에서는 <b>통합과학·지구시스템과학</b>에서 배운 태양계 형성(집적과 분화)이 다시 나와요.</div>' +
        '<p>천체 카드 8장을 눌러 <b>㉠ 공전 · ㉡ 둥근 모양 · ㉢ 궤도 지배</b> 도장을 확인하고, <b>행성 · 왜소행성 · 소천체 · 위성</b> 상자로 나눠 보세요.</p>',
      features: ['judge', 'mu'],
      setup() { setView('judge'); },
      recap: '행성은 ㉠㉡㉢을 모두 만족해요. ㉢만 못 하면 왜소행성, ㉡도 못 하면 소천체예요.',
      summary: '<ul><li><b>IAU 2006 행성의 정의</b>: ㉠ 태양 둘레를 공전 ㉡ 자체 중력으로 둥근 모양(정수압 평형) ㉢ 공전 궤도 근처의 다른 천체를 몰아냄(궤도 지배).</li><li><b>왜소행성</b> = ㉠㉡ 만족, ㉢ 불만족, 위성이 아닌 천체. <b>소천체</b> = 태양을 공전하지만 ㉡도 만족하지 못하는 작은 천체(소행성·혜성·카이퍼 벨트 천체 등). 다른 천체 둘레를 도는 <b>위성</b>은 따로 불러요.</li><li>궤도 지배 정도 <b>μ = (천체 질량) / (같은 궤도대 나머지 천체 질량의 합)</b>: 행성 8개는 2.4×10⁴ ~ 1.7×10⁶ ≫ 1, 세레스 0.33 · 에리스 0.10 · 명왕성 0.08 ≪ 1이라 두 무리로 갈려요.</li><li>명왕성이 왜소행성인 까닭은 크기만이 아니라 <b>㉢ 궤도 지배를 못 하기 때문</b>이에요.</li></ul>',
      missions: [
        {
          title: '천체 카드 8장 판정하기', manual: true,
          goal: '카드를 눌러 ㉠㉡㉢ 도장을 확인하고, <b>8장 모두</b> 알맞은 상자에 넣으세요. 다 넣었으면 확인을 눌러요.',
          hint: '㉠이 ✕이면 위성, ㉠㉡이 ○이고 ㉢만 ✕이면 왜소행성, ㉡이 ✕이면 소천체, 셋 다 ○이면 행성이에요.',
          setup() { cJ.reset(); S.clsOk = false; setView('judge'); },
          check() {
            const pl = cJ.items.filter((i) => i.loc != null).length;
            if (pl < 8) return '아직 상자에 넣지 않은 카드가 ' + (8 - pl) + '장 있어요.';
            const bad = cJ.items.filter((i) => !cJ.isRight(i));
            return bad.length ? '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요. 도장 ✓/✕를 다시 보세요.' : true;
          },
          status: () => mark(cJ.counts().placed === 8) + ' 넣은 카드 ' + cJ.counts().placed + ' / 8 &nbsp; ' + mark(cJ.counts().right === 8) + ' 맞게 넣은 카드 ' + cJ.counts().right + ' / 8',
          explain: '<b>행성</b>: 지구·목성(세 조건 모두 ○). <b>왜소행성</b>: 세레스·명왕성·에리스(㉢ ✕). <b>소천체</b>: 베스타·류구(둥글지 않아요). <b>위성</b>: 달(지구 둘레를 돌아요, ㉠ ✕).',
        },
        {
          title: '행성과 왜소행성의 경계 찾기',
          goal: '궤도 지배 정도 <b>μ</b> 그래프에서 행성 8개와 왜소행성 3개를 가르는 <b>경계선 μ_c를 1 근처</b>(0.5 ~ 2)에 맞추세요.',
          hint: '로그 눈금에서 굵은 눈금이 μ = 1이에요. 경계선(↔)을 끌거나 슬라이더를 움직여 굵은 눈금에 맞춰요.',
          setup() { S.mu.c = 3; $('#sMu').value = 3; updateMuOut(); setView('mu'); S.mu.fly = 0; },
          check: () => muOK(),
          hold: 0.8,
          status: () => mark(muWrong().length === 0) + ' 잘못 칠한 천체 ' + muWrong().length + '개 &nbsp; ' + mark(Math.abs(S.mu.c) <= 0.3 + 1e-9) + ' 경계 μ_c = ' + fMu(Math.pow(10, S.mu.c)),
          explain: '행성 8개의 μ는 <b>2.4×10⁴ ~ 1.7×10⁶</b>, 왜소행성은 <b>0.08 ~ 0.33</b>이라 약 7만 배 넘게 벌어져 있어요. 그 사이 어디에 선을 그어도 갈리지만, <b>μ = 1</b>은 "내 질량 = 나머지 천체 질량의 합"인 자연스러운 기준이에요.',
        },
        {
          type: 'quiz', title: '명왕성이 왜소행성이 된 까닭',
          goal: '2006년에 명왕성이 행성에서 왜소행성으로 분류된 <b>가장 직접적인 까닭</b>은?',
          setup() { setView('judge'); },
          choices: ['공전 궤도 근처의 다른 천체를 몰아내지 못했기 때문이에요 (㉢ 불만족)', '지름이 작아서 행성이 될 수 없기 때문이에요', '자체 중력으로 둥근 모양을 이루지 못했기 때문이에요', '태양이 아니라 해왕성 둘레를 돌기 때문이에요'],
          answer: 0,
          feedback: ['', '행성의 정의에는 지름 기준이 없어요. 달(3,474 km)이 명왕성(2,377 km)보다 크지만 행성이 아니고, 크기보다 ㉢ 궤도 지배가 기준이에요.', '명왕성은 지름 약 2,377 km로 충분히 둥글어요. ㉡은 만족해요.', '명왕성은 해왕성이 아니라 태양 둘레를 돌아요. ㉠은 만족해요.'],
          explain: '명왕성은 ㉠㉡은 만족하지만 카이퍼 벨트에서 비슷한 천체들과 섞여 있어요(μ = 0.08). <b>㉢ 궤도 지배</b>를 못 하므로 왜소행성이에요.',
        },
      ],
    },
    {
      title: '소천체: 소행성·카이퍼 벨트·혜성', short: '소천체', icon: '🔵', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 둥글지 않은 소천체와 ㉢을 못 하는 왜소행성을 가려냈어요. 소천체는 <b>어디에 있고 어떤 궤도</b>를 돌까요? 케플러 법칙에서 쓴 <b>긴반지름 a와 이심률 e</b>로 소천체를 구분해 봐요.</div>' +
        '<p>산점도에서 12개 천체를 세 무리로 나누고, 혜성 모형을 돌려 <b>꼬리가 어느 쪽을 향하는지</b> 알아봐요. 아래 용어 카드도 읽어 보세요.</p>',
      features: ['scatter', 'comet'],
      setup() { setView('scatter'); },
      recap: '소행성대는 a 2.1~3.3 AU, 카이퍼 벨트는 30~50 AU에서 이심률이 작고, 혜성은 이심률이 커요. 혜성 꼬리는 항상 태양 반대쪽이에요.',
      summary: '<ul><li><b>소행성대</b>: 화성–목성 사이 a = 2.1 ~ 3.3 AU, 이심률이 작아요. 전체 질량은 달의 약 4 %(세레스가 그중 약 1/3)라서 대부분이 빈 공간이에요. 탐사선이 소행성대를 안전하게 지나가요.</li><li><b>카이퍼 벨트</b>: 해왕성 바깥 30 ~ 50 AU. 명왕성은 a = 39.5 AU, 공전 주기 248년으로 해왕성과 3 : 2 공명을 해요. 단주기 혜성의 고향이에요.</li><li><b>혜성</b>: 얼음과 먼지로 된 핵(수 km). 태양에 가까워지면 코마와 꼬리가 생겨요. <b>꼬리는 항상 태양 반대쪽</b>(태양풍·복사압)이라 나가는 길에서는 꼬리가 혜성보다 앞서요. 단주기 혜성(카이퍼 벨트 기원), 장주기 혜성(오르트 구름 기원).</li><li>유성체 → (대기에서 빛나면) 유성 → (지표에 떨어지면) 운석.</li></ul>',
      missions: [
        {
          title: '12개 천체를 세 무리로 나누기', manual: true,
          goal: '산점도의 점을 눌러 <b>a와 e</b>를 읽고, <b>소행성대 · 카이퍼 벨트 · 혜성</b> 중 하나로 12개를 모두 분류하세요.',
          hint: 'a가 2~3 AU이고 e가 작으면 소행성대, a가 30~50 AU이고 e가 작으면 카이퍼 벨트, e가 0.6보다 크면 혜성이에요.',
          setup() { S.sc.asg = SC.map(() => -1); S.sc.wrong = SC.map(() => false); S.sc.sel = -1; S.sc.zone = 0; setView('scatter'); },
          check() {
            const n = S.sc.asg.filter((g) => g < 0).length;
            if (n) return '아직 분류하지 않은 천체가 ' + n + '개 있어요.';
            const bad = S.sc.asg.filter((g, i) => g !== SC[i].g).length;
            return bad ? '빨간 테두리 천체 ' + bad + '개가 알맞지 않아요. a와 e를 다시 읽어 보세요.' : true;
          },
          status: () => mark(S.sc.asg.every((g) => g >= 0)) + ' 분류 ' + S.sc.asg.filter((g) => g >= 0).length + ' / 12 &nbsp; ' + mark(scDone()) + ' 맞게 분류 ' + S.sc.asg.filter((g, i) => g === SC[i].g).length + ' / 12',
          explain: '<b>소행성대</b> 4개(a 2.4~2.9 AU, e 0.04~0.23), <b>카이퍼 벨트</b> 4개(a 39~46 AU, e 0.04~0.25), <b>혜성</b> 4개(e 0.64~0.97). 혜성 가운데 엔케 혜성은 a가 작아도 e가 커서 혜성이에요. 참고로 소행성대가 빽빽할 것 같지만 전체 질량이 달의 약 4 %라서 탐사선은 쉽게 지나가요.',
        },
        {
          title: '혜성 꼬리 방향 맞히기',
          goal: '혜성을 <b>들어오는 길</b>과 <b>나가는 길</b>에서 한 번씩 멈추고, 꼬리 방향을 예측해 <b>두 번 모두</b> 맞혀 보세요.',
          hint: '🕒 슬라이더로 혜성을 근일점(0°) 가까이 옮기고 🎯 예측을 눌러요. 꼬리는 혜성의 진행 방향이 아니라 태양에서 혜성으로 향하는 방향이에요. 들어오는 길은 −33° ~ 0°, 나가는 길은 0° ~ +33°예요.',
          setup() { CM.mode = 'play'; CM.play = true; CM.M = -1.6; CM.okIn = false; CM.okOut = false; CM.last = ''; CM.guess = -Math.PI / 2; CM.tailA = 1; setView('comet'); },
          check: () => CM.okIn && CM.okOut,
          hold: 0.4,
          status: () => mark(CM.okIn) + ' 들어오는 길에서 맞힘 &nbsp; ' + mark(CM.okOut) + ' 나가는 길에서 맞힘',
          explain: '꼬리는 <b>항상 태양의 반대쪽</b>을 향해요(태양풍과 복사압이 밀어내기 때문). 그래서 근일점을 지나 <b>나가는 길에서는 꼬리가 혜성보다 앞서 가요</b>. "꼬리는 진행 방향의 반대쪽"이라는 생각은 틀렸어요.',
        },
      ],
    },
    {
      title: '탐사 자료: 밀도로 속 들여다보기', short: '탐사 자료', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소천체의 궤도를 구분했어요. 탐사선이 가까이서 잰 <b>지름과 질량</b>이 있으면 밀도 <b>ρ = M / V</b>를 구할 수 있고, 표면 사진과 함께 <b>천체의 속</b>을 추론할 수 있어요. 여러 모둠이 보낸 데이터를 한 보드에 모아 비교해요.</div>' +
        '<p>구의 부피 <b>V = π/6 × d³</b>(d: 지름)으로 6개 천체의 밀도를 구하고, 물(1.0)과 암석(약 2.4 g/cm³)에 견주어 봐요.</p>',
      features: ['data'],
      setup() { setView('data'); },
      recap: '밀도 ρ = M / V로 속을 추론해요. 류구·베누는 1.2 g/cm³라 빈틈이 많고, 67P는 0.53이라 성기며, 베스타는 3.46이라 철 핵이 있어요.',
      summary: () => '<ul><li><b>밀도 ρ = M / V</b>, 구의 부피 <b>V = π/6 × d³</b>. 1 g/cm³ = 1000 kg/m³.</li><li>' + DB.map((b) => b.n + ' ' + f2(b.rho)).join(' · ') + ' (g/cm³).</li><li><b>류구·베누</b>: 탄소질 소행성. 구성 암석(약 2.4 g/cm³)에 비해 밀도가 절반이라 <b>공극률 ' + f0(porPct()) + ' %</b>: 자갈과 바위가 느슨하게 뭉친 잔해 더미예요.</li><li><b>67P 혜성</b>: 0.53 g/cm³로 물보다 가벼워요. 단단한 얼음 덩어리가 아니라 얼음과 먼지가 성기게 뭉친 천체예요.</li><li><b>베스타</b>: 3.46 g/cm³로 암석보다 무거워요. 철 핵이 있는 분화된 천체예요. <b>세레스</b>: 2.16 g/cm³, 밝은 점은 염류이고 얼음이 섞인 층이 있을 수 있어요.</li></ul>',
      missions: [
        {
          title: '류구의 밀도 계산하기',
          goal: '<b>류구</b>(지름 0.90 km, 질량 4.5×10¹¹ kg)의 밀도를 <b>g/cm³</b>로 계산해 입력하세요.',
          hint: '① V = π/6 × (900 m)³ ≈ 3.8×10⁸ m³ ② ρ = 4.5×10¹¹ / 3.8×10⁸ ≈ 1.2×10³ kg/m³ = 1.2 g/cm³. ① 부피 계산 버튼으로 V를 확인해도 돼요.',
          setup() { DT.sel = 0; DT.rho = DB.map(() => false); DT.vol = DB.map(() => false); DT.volV = DB.map(() => 0); DT.rhoV = DB.map(() => 0); DT.bar = DB.map(() => 0); DT.porOk = false; S.flags.porBox = false; clrIn('inRho', 'inPor'); setView('data'); },
          check: () => DT.rho[0] === true,
          hold: 0.5,
          status: () => mark(DT.sel === 0) + ' 류구 선택 &nbsp; ' + mark(DT.vol[0]) + ' 부피 구함 &nbsp; ' + mark(DT.rho[0]) + ' 밀도 입력 ' + ($('#inRho').value.trim() || '—'),
          explain: 'V = π/6 × (900 m)³ ≈ <b>3.8×10⁸ m³</b>, ρ = 4.5×10¹¹ kg / 3.8×10⁸ m³ ≈ <b>1.2×10³ kg/m³ = 1.2 g/cm³</b>예요. 물(1.0 g/cm³)과 거의 같아요.',
        },
        {
          title: '류구의 공극률 어림하기', manual: true,
          goal: '류구를 이루는 암석의 밀도가 <b>2.4 g/cm³</b>라면, 류구 안에서 빈틈이 차지하는 비율(<b>공극률</b>)은 약 몇 %일까요?',
          hint: '공극률 = 1 − (류구의 밀도 / 구성 암석의 밀도) = 1 − 1.18 / 2.4 예요. 백분율로 입력해요.',
          setup() { DT.sel = 0; DT.rho[0] = true; DT.vol[0] = true; S.flags.porBox = true; DT.porOk = false; clrIn('inPor'); setView('data'); },
          check() {
            const v = numOf('inPor'); if (v == null) return '공극률(%)을 입력해 주세요.';
            const ok = near(v, porPct(), 5); fbIn('inPor', ok);
            if (ok) { DT.porOk = true; return true; }
            if (near(v, 100 - porPct(), 5)) return '그 값은 암석이 차지하는 비율이에요. 빈틈의 비율 = 100 % − 암석의 비율이에요.';
            return '공극률 = (1 − 1.18 / 2.4) × 100 을 계산해 보세요.';
          },
          status: () => '입력 ' + ($('#inPor').value.trim() || '—') + ' %',
          explain: '1 − 1.18 / 2.4 ≈ <b>0.51</b>, 즉 <b>약 50 %</b>가 빈틈이에요. 류구는 하나의 단단한 바위가 아니라 <b>자갈과 바위가 느슨하게 모인 잔해 더미</b>예요.',
        },
        {
          type: 'quiz', title: '밀도 0.53 g/cm³인 혜성 핵',
          goal: '67P 혜성 핵의 밀도는 <b>0.53 g/cm³</b>예요. 이 값이 알려 주는 것은?',
          setup() { DT.sel = 2; DT.rho[2] = true; DT.vol[2] = true; setView('data'); },
          choices: ['물보다 가벼워요. 얼음과 먼지가 성기게 뭉쳐 빈틈이 많은 천체예요', '단단한 순수 얼음 덩어리예요', '철 핵이 있는 분화된 천체예요', '암석으로만 이루어진 천체예요'],
          answer: 0,
          feedback: ['', '순수한 물 얼음의 밀도도 약 0.92 g/cm³라서 0.53보다 커요. 빈틈이 많다는 뜻이에요.', '철 핵이 있으면 밀도가 커져요(베스타 3.46). 0.53은 아주 가벼운 값이에요.', '암석은 약 2.4 g/cm³ 이상이에요. 0.53은 물(1.0)보다도 가벼워요.'],
          explain: '혜성 핵은 "더러운 눈덩이"처럼 <b>얼음과 먼지가 성기게 뭉친</b> 천체예요. 밀도가 물보다 작아서 빈틈이 아주 많아요.',
        },
      ],
    },
    {
      title: '원시와 분화: 운석이 전하는 이야기', short: '원시와 분화', icon: '🪨', phase: '확인',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 밀도로 베스타는 철 핵이 있고 류구는 느슨하다는 것을 추론했어요. <b>지구시스템과학에서 배운 태양계 형성</b>에서 미행성이 집적하고, 큰 천체는 내부가 녹아 층으로 나뉘는 <b>분화</b>가 일어났어요. 소천체는 그 두 단계를 모두 보여 줘요.</div>' +
        '<p>운석 8개를 <b>원시 물질 천체의 조각</b>과 <b>분화된 천체의 조각</b>으로 나누고, 베스타를 가열해 분화 과정을 지켜봐요.</p>',
      features: ['meteor'],
      setup() { setView('meteor'); },
      recap: '콘드라이트는 한 번도 녹지 않은 원시 물질, 에이콘드라이트·철·석철 운석은 분화된 천체의 지각·맨틀·핵 조각이에요.',
      summary: '<ul><li><b>콘드라이트</b>(관측된 낙하 운석의 약 86 %): 콘드룰이 박힌 원시 물질, 나이 약 45.7억 년. 한 번도 녹지 않아 태양계 초기 물질을 그대로 보존해요.</li><li><b>분화된 천체의 조각</b>: 에이콘드라이트(약 8 %, 지각·맨틀 조각, 베스타 기원 등) · 철 운석(약 5 %, 핵) · 석철 운석(약 1 %, 핵–맨틀 경계).</li><li>베스타처럼 큰 천체는 열이 빠져나가지 못해 내부가 녹고, 무거운 철이 가라앉아 <b>핵–맨틀–지각</b>의 층이 생겼어요(분화).</li><li>대부분의 작은 소행성은 한 번도 녹지 않아 <b>집적 단계에서 멈춘</b> 태양계 초기 정보를 담고 있어요. 류구·베누 시료가 그 증거예요.</li></ul>',
      missions: [
        {
          title: '운석 8개 분류하기', manual: true,
          goal: '카드를 눌러 설명을 읽고, 운석 8개를 <b>원시 물질</b>과 <b>분화된 천체의 조각</b> 상자로 나누세요.',
          hint: '콘드룰(둥근 알갱이)이 있는 콘드라이트만 원시 물질이에요. 콘드룰이 없는 암석, 철–니켈 금속, 금속과 암석이 섞인 돌은 녹았다가 굳은 분화된 천체의 조각이에요.',
          setup() { cM.reset(); MT.heat = false; MT.size = 0; MT.temp = 20; setView('meteor'); },
          check() {
            const pl = cM.items.filter((i) => i.loc != null).length;
            if (pl < 8) return '아직 상자에 넣지 않은 카드가 ' + (8 - pl) + '장 있어요.';
            const bad = cM.items.filter((i) => !cM.isRight(i));
            return bad.length ? '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요. 콘드룰이 있는지 보세요.' : true;
          },
          status: () => mark(cM.counts().placed === 8) + ' 넣은 카드 ' + cM.counts().placed + ' / 8 &nbsp; ' + mark(cM.counts().right === 8) + ' 맞게 넣은 카드 ' + cM.counts().right + ' / 8',
          explain: '<b>원시 물질</b>: 콘드라이트 2개. <b>분화된 천체의 조각</b>: 에이콘드라이트(지각·맨틀), 철 운석(핵), 석철 운석(핵–맨틀 경계) 6개. 관측된 낙하 운석의 약 86 %가 콘드라이트예요.',
        },
        {
          title: '베스타가 분화됐다는 증거 고르기', manual: true,
          goal: '🔥 가열하기로 베스타가 녹는 모습을 본 뒤, 베스타가 <b>분화된 천체</b>라는 증거를 모두 고르세요. (2개)',
          hint: '분화된 천체는 무거운 철이 가운데로 모여 평균 밀도가 크고, 겉은 용암이 굳은 현무암 같은 암석이에요.',
          setup() { MT.size = 0; MT.heat = false; MT.ev = EVID.map(() => false); MT.evOk = false; S.flags.evBox = true; setView('meteor'); },
          check() {
            const n = MT.ev.filter(Boolean).length;
            if (n === 0) return '증거 카드를 눌러 골라 주세요.';
            if (evOK()) { MT.evOk = true; return true; }
            if (MT.ev[2]) return '콘드룰이 가득한 암석은 녹은 적 없는 원시 물질의 특징이에요.';
            if (MT.ev[3] || MT.ev[4]) return '얼음이 많거나 밀도가 아주 작으면 가볍고 성긴 천체예요. 분화된 천체는 무거워요.';
            return '증거가 하나 더 있어요. 밀도와 표면 암석을 떠올려 보세요.';
          },
          status: () => '고른 증거 ' + MT.ev.filter(Boolean).length + '개',
          explain: '<b>밀도 3.46 g/cm³</b>(철 핵 때문)와 <b>현무암 지각</b>이 분화의 증거예요. 콘드룰이 가득한 암석은 원시 물질의 특징이고, 베스타 표면은 얼음으로 덮여 있지 않아요.',
        },
        {
          type: 'quiz', title: '철 운석은 어디에서 왔을까?',
          goal: '철 운석(철–니켈 금속 덩어리)은 <b>어떤 천체의 어느 부분</b>에서 떨어져 나온 조각일까요?',
          setup() { MT.size = 0; setView('meteor'); },
          choices: ['분화된 큰 천체의 핵이 부서져 나온 조각이에요', '한 번도 녹지 않은 작은 소행성의 표면 조각이에요', '혜성 핵의 얼음 속에 섞여 있던 조각이에요', '지구의 핵이 우주로 날아갔다가 돌아온 조각이에요'],
          answer: 0,
          feedback: ['', '녹은 적 없는 천체의 조각은 콘드룰이 있는 콘드라이트예요. 철–니켈 덩어리는 녹아서 철이 분리돼야 생겨요.', '혜성 핵은 얼음과 먼지로 이루어져 철 덩어리가 거의 없어요.', '철 운석은 소행성대에서 부서진 분화된 천체의 핵 조각이에요. 지구와는 관계가 없어요.'],
          explain: '큰 천체가 녹으면 무거운 철–니켈이 가라앉아 <b>핵</b>이 돼요. 이 천체가 충돌로 부서지면 핵 조각이 <b>철 운석</b>이 돼요. 반대로 <b>콘드라이트가 가장 원시적</b>인 까닭은 한 번도 녹지 않았기 때문이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-small-bodies', mount: '#game', badge: '소천체 탐사가', homeHref: '../../index.html#hu',
    featureLabels: { judge: '✅ 판정 도장 · 분류 상자', mu: '📈 궤도 지배 정도 μ 그래프', scatter: '🔵 a–e 산점도', comet: '☄️ 혜성 꼬리 모형 · 용어 카드', data: '🧮 모둠 데이터 보드 · 밀도 계산기', meteor: '🪨 운석 분류 · 베스타 분화 모의' },
    onFeatures() { updateCtl(); },
    levels,
  });
  levels.forEach((lv) => { if (typeof lv.summary === 'function') lv.summary = lv.summary(); });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view;
    if (v === 'judge') { const c = cJ.counts(); setReadouts(['판정해서 넣은 카드', c.placed + ' / 8', '맞게 넣은 카드', c.right + ' / 8', '고른 천체', cJ.sel >= 0 ? B8[cJ.sel].n : '—']); }
    else if (v === 'mu') { const w = MU.filter((m) => m.lg >= S.mu.c).length; setReadouts(['경계선 μ_c', fMu(Math.pow(10, S.mu.c)), '행성 쪽 천체', w + '개', '왜소행성 쪽 천체', (MU.length - w) + '개']); }
    else if (v === 'scatter') { const o = S.sc.sel >= 0 ? SC[S.sc.sel] : null; setReadouts(['분류한 천체', S.sc.asg.filter((g) => g >= 0).length + ' / 12', '맞게 분류', S.sc.asg.filter((g, i) => g === SC[i].g).length + ' / 12', '고른 천체 a / e', o ? f2(o.a) + ' AU / ' + f2(o.e) : '—']); }
    else if (v === 'comet') {
      const p = cmPos(CM.M), leg = Math.abs(CM.M) < 0.02 ? '근일점' : cmLeg() === 'in' ? '들어오는 길' : '나가는 길';
      setReadouts(['태양과의 거리 r', f2(p.r) + ' AU', '궤도 구간', leg, '꼬리', CM.mode === 'predict' ? '예측 중' : p.r < 3 ? '있음 (r < 3 AU)' : '없음 (너무 멀어요)']);
    }
    else if (v === 'data') { const b = dtSel(); setReadouts(['고른 천체', b.n, '부피 V', DT.vol[DT.sel] ? sci(b.V, 2) + ' m³' : '—', '밀도 ρ', DT.rho[DT.sel] ? f2(b.rho) + ' g/cm³' : '—']); }
    else { const c = cM.counts(); setReadouts(['분류한 운석', c.placed + ' / 8', '맞게 분류', c.right + ' / 8', '내부 온도', f0(MT.temp) + ' ℃']); }
  }

  /* ================= 루프 ================= */
  updateCtl(); updateMuOut(); updateMeanOut();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    switch (S.view) {
      case 'judge': drawJudge(dt, t); break;
      case 'mu': drawMu(dt, t); break;
      case 'scatter': drawScatter(dt, t); break;
      case 'comet': drawComet(dt, t); break;
      case 'data': drawData(dt, t); break;
      default: drawMeteor(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, B8, MU, SC, DB, MET, EVID, cJ, cM, CM, DT, MT, get game() { return game; }, setView, updateCtl, LJ, LMU, muGeom, scGeom, LCM, cmGeom, cmPos, cmSunAngle, cmLeg, LDT, LMT, porPct, muOK, scDone, scAssign, cmEnterPredict, cmReveal, dtCheckRho, evOK };


})();
