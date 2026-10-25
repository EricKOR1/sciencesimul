/* =========================================================
   행성우주과학 Ⅰ. 우주탐사와 행성계 - 제3법칙과 모든 천체 (3차시)
   성취기준 [12행우01-03] 태양계를 지배하는 힘이 태양의 중력임을 이해하고, 케플러의 세 가지 법칙을 이용하여 태양계 구성 천체들의 운동을 설명할 수 있다. (제3법칙)
   ① 관찰: 목성 관측 (가상 천체 망원경, 배율 M = f_o / f_e, 갈릴레이 위성)
   ② 분석: 주기와 거리 (위성 4개의 관측 일지, T와 a 읽기, a³/T²)
   ③ 설명: 법칙의 의미 (a³/T² = GM / 4π², 중심 천체의 질량, 상수 짝짓기)
   ④ 적용: 모든 천체 (T²–a³ 그래프, 예측)
   다루지 않음: 궤도 에너지, 세 천체 문제.
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
    C.counts = function () { return { placed: C.items.filter((i) => i.loc != null).length, right: C.items.filter((i) => i.loc === i.bin).length }; };
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


  initStage('#e8eef8', 800, 620, 480, 860, 1.25);
  if (PHONE) view.canvas.style.touchAction = 'pan-y';
  const outlineT = (x, y, s, size, color, align) => T(x, y, s, size, color || '#e2e8f0', align || 'left', 800, { stroke: 'rgba(5,10,30,.75)', strokeWidth: 4 });
  const sup = (n) => String(n).split('').map((c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c])).join('');
  const sci = (x, d) => { if (!(x > 0)) return '0'; let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e); const dd = d == null ? 1 : d; if (+m.toFixed(dd) >= 10) { m /= 10; e += 1; } return m.toFixed(dd) + '×10' + sup(e); };

  /* ================= 자료 ================= */
  const AUKM = 1.496e8;                          // 1 AU (km)
  const DJ = 1.43;                               // 목성 지름 (10⁵ km)
  const FO = 1000;                               // 대물렌즈 초점거리 (mm)
  const FE = [40, 20, 10];                       // 접안렌즈 초점거리 (mm)
  const FOVAPP = 50;                             // 접안렌즈 겉보기 시야 (°)
  const MOONS = [
    { n: '이오', T: 1.769, a: 4.22, c: '#facc15', ph: 40 * DEG },
    { n: '에우로파', T: 3.551, a: 6.71, c: '#e2e8f0', ph: 130 * DEG },
    { n: '가니메데', T: 7.155, a: 10.70, c: '#d6d3d1', ph: 220 * DEG },
    { n: '칼리스토', T: 16.69, a: 18.83, c: '#a8a29e', ph: 310 * DEG },
  ];
  MOONS.forEach((m) => { m.dj = m.a / DJ; m.k = m.a * m.a * m.a / (m.T * m.T); });
  const moonX = (m, t) => m.dj * Math.sin(TAU * t / m.T + m.ph);        // 옆에서 본 위치 (목성 지름 단위)
  const moonZ = (m, t) => Math.cos(TAU * t / m.T + m.ph);               // +: 관측자 쪽
  const THJ = 40;                                                        // 목성 각지름 (″)
  const K_SUN = Math.pow(AUKM / 1e5, 3) / Math.pow(365.25, 2);          // 태양 둘레 a³/T² (10⁵ km³/일²)
  const K_JUP = MOONS.reduce((s, m) => s + m.k, 0) / 4;
  const K_EARTH = Math.pow(3.84, 3) / Math.pow(27.32, 2);
  const MJ_MS = K_JUP / K_SUN;
  const BODIES = [
    { n: '천왕성', a: 19.19, T: 84.0, c: '#7dd3fc' }, { n: '해왕성', a: 30.07, T: 164.8, c: '#3b82f6' }, { n: '세레스', a: 2.77, T: 4.60, c: '#a8a29e' },
    { n: '명왕성', a: 39.48, T: 247.9, c: '#c8b8a8' }, { n: '에리스', a: 67.7, T: 558, c: '#e5e7eb' }, { n: '핼리 혜성', a: 17.8, T: 75.3, c: '#67e8f9' }, { n: '아포피스', a: 0.922, T: 0.886, c: '#d97706' },
  ];
  const CARDS3 = [
    { label: '수성', sub: 'a 579, T 88.0일', a: 579.1, T: 87.97, bin: 0 }, { label: '화성', sub: 'a 2279, T 687일', a: 2279.4, T: 686.98, bin: 0 },
    { label: '세레스', sub: 'a 4139, T 1680일', a: 4139, T: 1680, bin: 0 }, { label: '핼리 혜성', sub: 'a 2.66×10⁴, T 27500일', a: 26629, T: 27502, bin: 0 },
    { label: '이오', sub: 'a 4.22, T 1.769일', a: 4.22, T: 1.769, bin: 1 }, { label: '에우로파', sub: 'a 6.71, T 3.551일', a: 6.71, T: 3.551, bin: 1 },
    { label: '칼리스토', sub: 'a 18.83, T 16.69일', a: 18.83, T: 16.69, bin: 1 }, { label: '달', sub: 'a 3.84, T 27.32일', a: 3.84, T: 27.32, bin: 2 },
  ];
  const FRAC = (a) => a * a * a;
  const PLN = [
    { k: 'ven', n: '금성', ic: '🌟' }, { k: 'mar', n: '화성', ic: '🔴' }, { k: 'jup', n: '목성', ic: '🟤' }, { k: 'sat', n: '토성', ic: '🪐' },
  ];

  /* 행성 시각 자료: 시기 슬라이더 s (0~1) → 위치 */
  function planetGeom(k, s) {
    if (k === 'ven') {
      const psi = s * Math.PI, rv = 0.723, ex = 1, vx = rv * Math.cos(psi), vy = rv * Math.sin(psi), d = Math.hypot(ex - vx, vy);
      const ca = (rv * rv + d * d - 1) / (2 * rv * d), alpha = Math.acos(clamp(ca, -1, 1));
      return { d, th: 12104 / (d * AUKM) * ARC, k: (1 + Math.cos(alpha)) / 2, alpha, px: vx, py: vy, r: rv };
    }
    if (k === 'mar') {
      const psi = s * Math.PI, rm = 1.524, mx = rm * Math.cos(psi), my = rm * Math.sin(psi), d = Math.hypot(mx - 1, my);
      const ca = (rm * rm + d * d - 1) / (2 * rm * d), alpha = Math.acos(clamp(ca, -1, 1));
      return { d, th: 6779 / (d * AUKM) * ARC, k: (1 + Math.cos(alpha)) / 2, alpha, px: mx, py: my, r: rm };
    }
    if (k === 'jup') { const d = 4.93, psi = Math.acos((5.2 * 5.2 + 1 - d * d) / (2 * 5.2)); return { d, th: THJ, k: 1, alpha: 0, px: 5.2 * Math.cos(psi), py: 5.2 * Math.sin(psi), r: 5.2 }; }
    const d = 9.5, psi = Math.acos((9.54 * 9.54 + 1 - d * d) / (2 * 9.54)); return { d, th: 116460 / (d * AUKM) * ARC, k: 1, alpha: 0, px: 9.54 * Math.cos(psi), py: 9.54 * Math.sin(psi), r: 9.54 };
  }
  const ARC = 206265;

  /* ================= 상태 ================= */
  const S = {
    view: 'scope', clock: 0, fade: 0,
    pl: 2, fe: 0, ph: 0.35, sky: 0, tday: 0, tplay: true, found: new Set(), foundWrong: 0,
    logT: 0, logOn: false, cur: 8, curOn: false, rev: false, doneRead: false,
    cM: 1, cm: 1, cT: 0,
    plot: BODIES.map(() => false), fly: [],
    flags: { calcRead: false, calcK: false, calcMass: false, calcPred: false },
  };
  let game = null;
  const VIEW_LABEL = { scope: '🔭 가상 천체 망원경', log: '📈 위성 관측 일지', meaning: '⚖ a³/T²의 의미', all: '🌌 모든 천체의 T²–a³' };
  const modeBtns = $$('#modeSeg button');
  const MAG = () => FO / FE[S.fe];

  /* ---------- 위상 그리기 (오른쪽이 밝은 모형) ---------- */
  function drawPhaseDisc(x, y, R, alpha, base, dark) {
    ctx.save();
    ctx.fillStyle = dark || '#1e293b'; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    const c = Math.cos(alpha);
    ctx.beginPath(); ctx.arc(x, y, R, -Math.PI / 2, Math.PI / 2, false);
    ctx.ellipse(x, y, Math.max(0.01, R * Math.abs(c)), R, 0, Math.PI / 2, -Math.PI / 2, c < 0);
    ctx.closePath();
    const g = ctx.createRadialGradient(x + R * 0.2, y - R * 0.2, R * 0.1, x, y, R); g.addColorStop(0, shade(base, 0.35)); g.addColorStop(1, shade(base, -0.15));
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();
  }
  function drawBigPlanet(k, x, y, R, g, t) {
    if (k === 'jup') {
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.clip();
      const bg = ctx.createLinearGradient(x, y - R, x, y + R);
      ['#d8c3a5', '#b8865a', '#e8d9bd', '#a0643c', '#e5cfa8', '#9c6a48', '#d9c4a0', '#b07c55', '#e3d1b0'].forEach((c, i, a) => bg.addColorStop(i / (a.length - 1), c));
      ctx.fillStyle = bg; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
      ctx.fillStyle = '#c2552f'; ctx.beginPath(); ctx.ellipse(x + R * 0.28, y + R * 0.3, R * 0.2, R * 0.11, 0, 0, TAU); ctx.fill();
      const sh = ctx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.1, x, y, R * 1.05); sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = sh; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
      ctx.restore();
    } else if (k === 'sat') {
      const rg = (w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; };
      const rx = R * 2.05, ry = R * 0.72;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.38);
      [[1.0, R * 0.2, 'rgba(226,205,150,.9)'], [1.18, R * 0.3, 'rgba(238,222,176,.95)'], [1.4, R * 0.04, 'rgba(20,20,30,.9)'], [1.56, R * 0.26, 'rgba(210,190,140,.85)']].forEach(([f, w, c]) => { rg(w, c); ctx.beginPath(); ctx.ellipse(0, 0, rx * f / 1.7, ry * f / 1.7, 0, Math.PI, TAU); ctx.stroke(); });
      ctx.restore();
      const bg = ctx.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.1, x, y, R); bg.addColorStop(0, '#f0e2b6'); bg.addColorStop(0.6, '#d9c27a'); bg.addColorStop(1, '#8a7440');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.38);
      [[1.0, R * 0.2, 'rgba(226,205,150,.95)'], [1.18, R * 0.3, 'rgba(238,222,176,1)'], [1.4, R * 0.04, 'rgba(20,20,30,.9)'], [1.56, R * 0.26, 'rgba(210,190,140,.9)']].forEach(([f, w, c]) => { rg(w, c); ctx.beginPath(); ctx.ellipse(0, 0, rx * f / 1.7, ry * f / 1.7, 0, 0, Math.PI); ctx.stroke(); });
      ctx.restore();
    } else if (k === 'ven') {
      drawPhaseDisc(x, y, R, g.alpha, '#f3e2b0', '#2a2a3a');
    } else {
      drawPhaseDisc(x, y, R, g.alpha, '#d9663f', '#2a2030');
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(90,40,30,.35)'; ctx.beginPath(); ctx.ellipse(x - R * 0.1, y + R * 0.1, R * 0.4, R * 0.25, 0.4, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(x + R * 0.1, y - R * 0.92, R * 0.3, R * 0.12, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  const arcFmt = (s) => (s >= 3600 ? f2(s / 3600) + '°' : s >= 120 ? f0(s / 60) + '′' : f0(s) + '″');

  /* ---------- ① 가상 천체 망원경 ---------- */
  function LS() {
    if (PHONE) return { A: { x: 8, y: 8, w: 464, h: 440 }, I: { x: 8, y: 456, w: 228, h: 236 }, G: { x: 244, y: 456, w: 228, h: 236 }, C: { x: 8, y: 700, w: 464, h: 152 } };
    return { A: { x: 10, y: 8, w: 490, h: 430 }, I: { x: 510, y: 8, w: 280, h: 210 }, G: { x: 510, y: 226, w: 280, h: 212 }, C: { x: 10, y: 446, w: 780, h: 164 } };
  }
  let moonPts = [];
  function drawScope(dt, t) {
    const L = LS(), A = L.A, k = PLN[S.pl].k, M = MAG(), g = planetGeom(k, S.sky);
    if (S.tplay) S.tday += dt * 0.5;
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2, R = Math.min(A.w, A.h) / 2 - 16, u = M * R / (FOVAPP / 2 * 3600);       // 참 하늘 1″ 당 화면 px
    // 바깥 판
    ctx.fillStyle = '#0f172a'; rr(A.x, A.y, A.w, A.h, 14).fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); sg.addColorStop(0, '#0b1230'); sg.addColorStop(1, '#030612'); ctx.fillStyle = sg; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    STARS.forEach((s) => { ctx.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t * 0.8 + s[3])); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - R + s[0] * 2 * R, cy - R + s[1] * 2 * R, s[2] * 0.7, 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
    moonPts = [];
    const rad = Math.max(1.5, g.th * u / 2);
    if (k === 'jup') {
      D.glow(cx, cy, Math.max(rad * 3, 10), '#f5deb3', 0.4);
      // 위성 (뒤쪽)
      const items = MOONS.map((m, i) => ({ m, i, x: moonX(m, S.tday) * THJ * u, z: moonZ(m, S.tday) }));
      const draw = (it) => {
        const px = cx + it.x * Math.cos(0.05), py = cy + it.x * Math.sin(0.05);
        const hid = it.z < 0 && Math.abs(it.x) < rad;
        moonPts.push({ x: px, y: py, i: it.i, hid });
        if (hid) return;
        D.glow(px, py, 9, it.m.c, 0.55); D.sphere(px, py, 2.4, it.m.c, { gloss: false });
        if (S.found.has(it.i)) { ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 9, 0, TAU); ctx.stroke(); outlineT(px, py - 14, it.m.n, 13, '#bbf7d0', 'center'); }
      };
      items.filter((it) => it.z < 0).forEach(draw);
      drawBigPlanet('jup', cx, cy, rad, g, t);
      items.filter((it) => it.z >= 0).forEach(draw);
    } else if (k === 'sat') {
      const rx = g.th * 1.13 * u, ry = rx * 0.38;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.38); ctx.strokeStyle = 'rgba(226,205,150,.85)'; ctx.lineWidth = Math.max(1.2, rad * 0.5); ctx.beginPath(); ctx.ellipse(0, 0, Math.max(rx, 3), Math.max(ry, 1.2), 0, 0, TAU); ctx.stroke(); ctx.restore();
      D.sphere(cx, cy, rad, '#d9c27a', { gloss: false });
    } else {
      if (rad > 2.5) drawPhaseDisc(cx, cy, rad, g.alpha, k === 'ven' ? '#f3e2b0' : '#d9663f'); else { D.glow(cx, cy, 8, k === 'ven' ? '#fff3c4' : '#fb923c', 0.8); D.sphere(cx, cy, rad, k === 'ven' ? '#fff3c4' : '#fb923c', { gloss: false }); }
    }
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R + 6, 0, TAU); ctx.stroke();
    outlineT(A.x + 12, A.y + 24 * FS, '접안렌즈 ' + FE[S.fe] + ' mm · 배율 ' + M + '배', 14, '#e2e8f0');
    outlineT(A.x + A.w - 12, A.y + 24 * FS, '시야 ' + f2(FOVAPP / M) + '°', 13.5, '#cbd5e1', 'right');
    if (k === 'jup') {
      outlineT(A.x + 12, A.y + A.h - 14, '위성 ' + S.found.size + ' / 4 찾음 · 빛나는 점을 눌러요', 13, '#86efac');
      D.label(A.x + A.w - 12, A.y + A.h - 22, S.tplay ? '⏸ 시간 멈춤' : '▶ 시간 가기', { bg: 'rgba(30,41,59,.9)', size: 13, pad: 9, align: 'right' });
      S.tbtn = { x: A.x + A.w - 100, y: A.y + A.h - 40, w: 90, h: 36 };
    } else S.tbtn = null;
    // 확대 그림
    const I = L.I; panel(I.x, I.y, I.w, I.h, { fill: '#0f172a', line: '#334155' });
    T(I.x + 12, I.y + 22 * FS, '🔍 확대 그림 (화면용)', 13.5, '#e2e8f0', 'left', 800);
    const ir = Math.min(I.w * 0.28, I.h * 0.3);
    drawBigPlanet(k, I.x + I.w / 2, I.y + I.h / 2 + 8, ir, g, t);
    T(I.x + I.w / 2, I.y + I.h - 12, PLN[S.pl].n + ' 각지름 약 ' + f1(g.th) + '″' + (k === 'sat' ? ' (고리 제외)' : ''), 12.5, '#cbd5e1', 'center', 700);
    // 위치 그림
    const G = L.G; panel(G.x, G.y, G.w, G.h, { fill: '#0f172a', line: '#334155' });
    T(G.x + 12, G.y + 22 * FS, '위에서 본 위치', 13.5, '#e2e8f0', 'left', 800);
    const gx = G.x + G.w / 2, gy = G.y + G.h / 2 + 8, sc = Math.min(G.w, G.h - 40) / 2 * 0.86 / Math.max(g.r, 1.2);
    ctx.strokeStyle = 'rgba(147,197,253,.4)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(gx, gy, sc, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(gx, gy, g.r * sc, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    sunDraw(gx, gy, 6);
    const ex = gx + sc, ey = gy, px = gx + g.px * sc, py = gy - g.py * sc;
    ctx.strokeStyle = 'rgba(253,224,71,.8)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(px, py); ctx.stroke();
    D.sphere(ex, ey, 5, '#3b82f6', { gloss: false }); D.sphere(px, py, 5, k === 'jup' ? '#e0a96d' : k === 'sat' ? '#d9c27a' : k === 'ven' ? '#f3e2b0' : '#ef6a4a', { gloss: false });
    T(ex + 8, ey + 16, '지구', 12.5, '#93c5fd', 'left', 800); T(px + 8, py - 8, PLN[S.pl].n, 12.5, '#fde68a', 'left', 800);
    T(G.x + G.w / 2, G.y + G.h - 12, '지구까지 거리 d = ' + f2(g.d) + ' AU', 12.5, '#cbd5e1', 'center', 700);
    // 아래 정보
    const C = L.C; panel(C.x, C.y, C.w, C.h, { fill: '#ffffff' });
    const x0 = C.x + 14, W = C.w - 28, fs = PHONE ? 13 : 14;
    T(x0, C.y + 24 * FS, '배율 M = f_o / f_e = ' + FO + ' mm / ' + FE[S.fe] + ' mm = ' + M + '배', 14.5, '#1d4ed8', 'left', 800);
    T(x0, C.y + 48 * FS, '시야(실제 하늘) = 50° / M = ' + f2(FOVAPP / M) + '°', fs, '#334155', 'left', 800);
    drawWrap(x0, C.y + 72 * FS, k === 'jup' ? '목성 각지름 ' + THJ + '″ → 접안렌즈 속 ' + THJ + '″ × ' + M + ' = ' + f0(THJ * M) + '″ ≈ ' + arcFmt(THJ * M) + (THJ * M === 2000 ? ' (보름달 각지름 약 31′와 비슷)' : '') : PLN[S.pl].n + ' 각지름 ' + f1(g.th) + '″ → 접안렌즈 속 ' + arcFmt(g.th * M) + (k === 'sat' ? '. 고리 때문에 더 넓게 보여요.' : '. 위상 ' + f0(g.k * 100) + ' %가 밝아요.'), W, fs, { color: '#334155', weight: 800 });
    if (k === 'ven' || k === 'mar') drawWrap(x0, C.y + 118 * FS, k === 'ven' ? '금성은 지구와의 거리가 변하며 위상과 크기가 함께 바뀌어요 (거리 가까울수록 가는 초승달이고 커요).' : '화성은 충(가까울 때)에 가장 크게 보여요. 거리 0.52 AU일 때 각지름 약 18″.', W, 13, { color: '#64748b' });
    if (k === 'jup') drawWrap(x0, C.y + 100 * FS, '갈릴레이가 1610년에 발견한 위성 4개(이오·에우로파·가니메데·칼리스토)가 일직선으로 놓여 왔다 갔다 해요. 목성 앞이나 뒤에서 가려지기도 해요.', W, 13, { color: '#64748b' });
    if (k === 'sat') drawWrap(x0, C.y + 100 * FS, '토성은 고리가 있어요. 작은 망원경으로도 고리와 모양을 알아볼 수 있어요.', W, 13, { color: '#64748b' });
  }
  function scopeDown(p) {
    const L = LS(), A = L.A;
    if (S.tbtn && p.x >= S.tbtn.x && p.x <= S.tbtn.x + S.tbtn.w && p.y >= S.tbtn.y && p.y <= S.tbtn.y + S.tbtn.h) { S.tplay = !S.tplay; Sound.click(); return false; }
    if (PLN[S.pl].k !== 'jup') return false;
    let best = null, bd = 1e9;
    moonPts.forEach((m) => { if (m.hid) return; const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } });
    if (best && bd <= 22) {
      if (MAG() !== 50) { say('배율 50배(접안렌즈 20 mm)에서 위성을 찾아요. 지금은 ' + MAG() + '배예요.', true, 2.6); Sound.fail(); return false; }
      if (!S.found.has(best.i)) { S.found.add(best.i); Sound.success(); parts.burst(best.x, best.y, { count: 12, speed: 90, size: 2.5, colors: ['#4ade80', '#fde047'] }); updateCtl(); }
    }
    return false;
  }

  /* ---------- ② 관측 일지 ---------- */
  function LL() {
    if (PHONE) return { c: { x: 8, y: 8, w: 464, h: 300 }, m: { x: 8, y: 316, w: 464, h: 262 }, t: { x: 8, y: 586, w: 464, h: 266 } };
    return { c: { x: 10, y: 8, w: 780, h: 292 }, m: { x: 10, y: 308, w: 340, h: 302 }, t: { x: 360, y: 308, w: 430, h: 302 } };
  }
  const LOGDAYS = 24, YMAX = 14.5, STEPD = 0.25;
  const chartGeom = (c) => { const ml = PHONE ? 44 : 50, mr = 12, mt = 40, mb = 36, ix = c.x + ml, iy = c.y + mt, iw = c.w - ml - mr, ih = c.h - mt - mb; return { ix, iy, iw, ih, X: (d) => ix + iw * d / LOGDAYS, Y: (v) => iy + ih / 2 - v / YMAX * ih / 2 }; };
  const SHORT = ['이오', '에우', '가니', '칼리'];
  function drawLog(dt, t) {
    const L = LL(), c = L.c, G = chartGeom(c);
    if (S.logOn) { S.logT = Math.min(LOGDAYS, S.logT + dt * 2.4); if (S.logT >= LOGDAYS) S.logOn = false; }
    panel(c.x, c.y, c.w, c.h, { fill: '#ffffff' });
    T(c.x + 12, c.y + 22 * FS, '관측 일지: 6시간마다 한 점씩 기록한 위성의 위치', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    T(c.x + 12, c.y + 40 * FS, '위(+)·아래(−): 목성 중심에서 옆으로 벗어난 거리 (목성 지름 D_J 단위)', 12.5, '#64748b', 'left', 700);
    for (let v = -10; v <= 10; v += 5) { ctx.strokeStyle = v === 0 ? '#64748b' : 'rgba(100,116,139,.25)'; ctx.lineWidth = v === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(G.ix, G.Y(v)); ctx.lineTo(G.ix + G.iw, G.Y(v)); ctx.stroke(); T(G.ix - 6, G.Y(v) + 5, (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v), 12.5, '#475569', 'right', 700); }
    for (let d = 0; d <= LOGDAYS; d += 2) { ctx.strokeStyle = 'rgba(100,116,139,.2)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(G.X(d), G.iy); ctx.lineTo(G.X(d), G.iy + G.ih); ctx.stroke(); if (!PHONE || d % 4 === 0) T(G.X(d), c.y + c.h - 18, String(d), 12.5, '#475569', 'center', 700); }
    T(c.x + c.w - 12, c.y + c.h - 4, '날짜 (일)', 12.5, '#64748b', 'right', 700);
    MOONS.forEach((m) => {
      ctx.strokeStyle = shade(m.c, -0.35); ctx.lineWidth = 1.6; ctx.beginPath(); let first = true;
      for (let d = 0; d <= S.logT + 1e-9; d += STEPD / 4) { const x = G.X(d), y = G.Y(moonX(m, d)); first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); first = false; }
      ctx.stroke();
      for (let d = 0; d <= S.logT + 1e-9; d += STEPD) { D.sphere(G.X(d), G.Y(moonX(m, d)), 2.3, m.c, { gloss: false, outline: shade(m.c, -0.5), outlineWidth: 0.8 }); }
    });
    if (S.logT < LOGDAYS) { ctx.strokeStyle = 'rgba(37,99,235,.55)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(G.X(S.logT), G.iy); ctx.lineTo(G.X(S.logT), G.iy + G.ih); ctx.stroke(); ctx.setLineDash([]); }
    // 커서
    if (S.curOn) {
      const cd = Math.min(S.cur, S.logT);
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(G.X(cd), G.iy); ctx.lineTo(G.X(cd), G.iy + G.ih); ctx.stroke();
      const lab = 't = ' + f2(cd) + '일   ' + MOONS.map((m, i) => SHORT[i] + ' ' + (moonX(m, cd) >= 0 ? '+' : '−') + f2(Math.abs(moonX(m, cd)))).join('  ');
      D.label(c.x + c.w / 2, c.y + 56 * FS, lab, { bg: 'rgba(30,41,59,.92)', size: PHONE ? 12.5 : 13, pad: 8 });
    } else T(c.x + c.w - 12, c.y + 22 * FS, '그래프를 눌러 값을 읽어요', 12.5, '#b45309', 'right', 800);
    // 모형
    const m = L.m; panel(m.x, m.y, m.w, m.h, { fill: '#0f172a', line: '#334155' });
    T(m.x + 12, m.y + 22 * FS, '위에서 본 위성 궤도 (눈금대로)', 13.5, '#e2e8f0', 'left', 800);
    const tm = S.logT >= LOGDAYS ? (S.logT + (t - (S.tEnd || (S.tEnd = t)))) * 0.6 : S.logT, mcx = m.x + m.w / 2, mcy = m.y + m.h / 2 + 4, sc = (Math.min(m.w, m.h) / 2 - 30) / MOONS[3].dj;
    D.sphere(mcx, mcy, Math.max(5, 0.5 * sc), '#e0a96d', { gloss: true });
    MOONS.forEach((mo) => {
      ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(mcx, mcy, mo.dj * sc, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      const th = TAU * tm / mo.T + mo.ph, mx = mcx + mo.dj * sc * Math.sin(th), my = mcy - mo.dj * sc * Math.cos(th);
      ctx.strokeStyle = 'rgba(250,204,21,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, mcy); ctx.stroke();
      D.sphere(mx, my, 4, mo.c, { gloss: false });
    });
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(m.x + 14, mcy); ctx.lineTo(m.x + m.w - 14, mcy); ctx.stroke();
    D.arrow(mcx, m.y + m.h - 16, mcx, m.y + m.h - 40, { color: '#60a5fa', width: 3, head: 8 }); T(mcx + 12, m.y + m.h - 16, '지구에서 본 방향', 12.5, '#93c5fd', 'left', 800);
    // 표
    const tb = L.t; panel(tb.x, tb.y, tb.w, tb.h, { fill: '#ffffff' });
    T(tb.x + 12, tb.y + 22 * FS, '📋 위성 4개의 기록', 14.5, '#1e293b', 'left', 800);
    const cols = PHONE ? [0.04, 0.27, 0.45, 0.66, 0.9] : [0.03, 0.22, 0.4, 0.58, 0.8], hy = tb.y + 48 * FS;
    ['위성', 'T (일)', 'a (D_J)', 'a (10⁵ km)', 'a³/T²'].forEach((h, i) => T(tb.x + tb.w * cols[i] + (i ? 0 : 0), hy, h, PHONE ? 12 : 12.5, '#64748b', i ? 'center' : 'left', 800));
    const show = S.doneRead || (game && game.free), showK = S.kSolved || (game && game.free), rh = PHONE ? 34 : 40;
    MOONS.forEach((mo, i) => {
      const yy = hy + 14 + i * rh;
      D.sphere(tb.x + tb.w * cols[0] + 6, yy + rh / 2 - 8, 5, mo.c, { gloss: false });
      T(tb.x + tb.w * cols[0] + 16, yy + rh / 2 - 3, SHORT[i] === '이오' ? '이오' : mo.n, PHONE ? 12.5 : 13.5, '#1e293b', 'left', 800);
      T(tb.x + tb.w * cols[1], yy + rh / 2 - 3, show ? String(mo.T) : '?', 13.5, show ? '#c2410c' : '#cbd5e1', 'center', 800);
      T(tb.x + tb.w * cols[2], yy + rh / 2 - 3, show ? f2(mo.dj) : '?', 13.5, show ? '#1d4ed8' : '#cbd5e1', 'center', 800);
      T(tb.x + tb.w * cols[3], yy + rh / 2 - 3, show ? f2(mo.a) : '?', 13.5, show ? '#1d4ed8' : '#cbd5e1', 'center', 800);
      T(tb.x + tb.w * cols[4], yy + rh / 2 - 3, showK ? f1(mo.k) : '?', 13.5, showK ? '#15803d' : '#cbd5e1', 'center', 800);
    });
    drawWrap(tb.x + 14, hy + 14 + 4 * rh + 14, show ? 'a (10⁵ km) = a (D_J) × 1.43 (목성 지름 1.43×10⁵ km). 거리가 멀수록 주기가 길어요.' : '먼저 그래프에서 이오와 칼리스토의 T와 a를 읽어 입력해 봐요.', tb.w - 28, 12.5, { color: '#475569' });
    if (showK) T(tb.x + 14, tb.y + tb.h - 12, 'a³/T² ≈ ' + f1(MOONS.reduce((s, mo) => s + mo.k, 0) / 4) + ' (10⁵ km³/일²), 모두 같아요!', 13.5, '#15803d', 'left', 800);
  }
  function logDown(p) {
    const G = chartGeom(LL().c), c = LL().c;
    if (p.x >= G.ix - 4 && p.x <= G.ix + G.iw + 4 && p.y >= c.y && p.y <= c.y + c.h) { S.cur = clamp(LOGDAYS * (p.x - G.ix) / G.iw, 0, LOGDAYS); S.curOn = true; return true; }
    return false;
  }
  function logMove(p) { const G = chartGeom(LL().c); S.cur = clamp(LOGDAYS * (p.x - G.ix) / G.iw, 0, LOGDAYS); }
  function startLog() { S.logT = 0; S.logOn = true; S.tEnd = 0; S.curOn = false; if (RM) { S.logT = LOGDAYS; S.logOn = false; } updateCtl(); }

  /* ---------- ③ 법칙의 의미 ---------- */
  const cvalStr = (v) => (v >= 100 ? sci(v, 2) : v >= 1 ? f1(v) : f3(v));
  function LM3() {
    if (PHONE) return { s: { x: 8, y: 8, w: 464, h: 224 }, d: { x: 8, y: 240, w: 464, h: 214 }, grid: { x: 8, y: 462, w: 464, h: 168, cols: 2, cardH: 36, gap: 6 }, detail: { x: 8, y: 636, w: 464, h: 50 }, bins: [0, 1, 2].map((i) => ({ x: 8 + i * 157, y: 692, w: 150, h: 160 })) };
    return { s: { x: 10, y: 8, w: 380, h: 300 }, d: { x: 400, y: 8, w: 390, h: 300 }, grid: { x: 10, y: 316, w: 780, h: 92, cols: 4, cardH: 42, gap: 8 }, detail: { x: 10, y: 412, w: 780, h: 34 }, bins: [0, 1, 2].map((i) => ({ x: 10 + i * 264, y: 450, w: 252, h: 160 })) };
  }
  const cK = makeClassifier({
    items: CARDS3.map((c) => ({ label: c.label, chip: c.label, sub: PHONE ? '' : c.sub, a: c.a, T: c.T, bin: c.bin, open: true })),
    bins: [{ label: '☀ 태양 둘레 ' + sci(K_SUN, 1), sub: '', color: '#f59e0b' }, { label: '🟤 목성 둘레 ' + f1(K_JUP), sub: '', color: '#b45309' }, { label: '🌍 지구 둘레 ' + f3(K_EARTH), sub: '', color: '#2563eb' }],
    chipCols: 1, minRows: 4, layout: LM3,
    placeholder: '카드를 눌러 a³/T² 값을 계산해 보고, 같은 값의 상자에 넣어요.',
    detailFn: (it) => ({ title: it.label + ': a = ' + (it.a >= 1e4 ? sci(it.a, 2) : it.a) + ' (10⁵ km), T = ' + it.T + '일', body: 'a³ / T² = ' + cvalStr(it.a * it.a * it.a / (it.T * it.T)) + ' (10⁵ km³/일²)' }),
    onChange() { updateCtl(); },
  });
  const cardsBody = () => cK.items;
  const mKStr = () => f1(S.cM * 100) + '';
  function drawMeaning(dt, t) {
    const L = LM3(), s = L.s, d = L.d;
    S.cT += dt;
    // 실험 장면
    panel(s.x, s.y, s.w, s.h, { fill: '#0f172a', line: '#334155' });
    ctx.save(); rr(s.x, s.y, s.w, s.h, 14).clip();
    for (let i = 0; i < 40; i++) { const q = STARS[i]; ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.fillRect(s.x + q[0] * s.w, s.y + q[1] * s.h, 1.4, 1.4); } ctx.globalAlpha = 1;
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2 + 8, Ro = Math.min(s.w, s.h) / 2 - (PHONE ? 38 : 44), M = S.cM, m = S.cm, Tyr = 1 / Math.sqrt(M);
    const rs = 9 + 9 * Math.cbrt(M), col = M < 0.8 ? '#fb923c' : M < 1.3 ? '#fbbf24' : '#fde68a';
    ctx.strokeStyle = 'rgba(147,197,253,.5)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, Ro, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    D.glow(cx, cy, rs * 3.4, col, 0.5); D.sphere(cx, cy, rs, col, { gloss: true, light: '#fffbe6' });
    const ang = (S.cT / 6) / Tyr * TAU, pr = 4 + 1.1 * Math.cbrt(m);
    D.sphere(cx + Ro * Math.cos(ang), cy - Ro * Math.sin(ang), pr, '#3b82f6', { gloss: true });
    ctx.restore();
    outlineT(s.x + 12, s.y + 24 * FS, '중심 천체 질량 M과 도는 천체 질량 m', PHONE ? 13 : 14);
    outlineT(s.x + 12, s.y + s.h - 40 * FS, 'M = ' + f1(M) + ' M☉ · m = ' + (m < 10 ? f1(m) : f0(m)) + ' M⊕ · a = 1 AU', 13.5, '#fde68a');
    outlineT(s.x + 12, s.y + s.h - 14, 'T = ' + f2(Tyr) + ' 년 → a³/T² = ' + f2(1 / (Tyr * Tyr)) + ' (AU³/년²)', 13.5, '#86efac');
    // 유도
    panel(d.x, d.y, d.w, d.h, { fill: '#ffffff' });
    const x0 = d.x + 14, W = d.w - 28, fs = PHONE ? 13 : 13.5;
    T(x0, d.y + 24 * FS, '왜 a³/T²이 일정할까? (hm 위성 운동에서 배운 식)', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    let y = d.y + 52 * FS;
    y = drawWrap(x0, y, '① 중력이 구심력: G M m / a² = m (2π/T)² a', W, fs, { color: '#334155', weight: 800 }) + 24 * FS;
    y = drawWrap(x0, y, '② 정리하면: a³ / T² = G M / (4π²)', W, fs, { color: '#1d4ed8', weight: 800 }) + 24 * FS;
    y = drawWrap(x0, y, '③ 오른쪽은 중심 천체의 질량 M으로만 정해져요. 도는 천체의 m은 약분돼 사라져요.', W, fs, { color: '#334155', weight: 800 }) + 24 * FS;
    y = drawWrap(x0, y, '④ AU · 년 · M☉ 단위에서는 T² = a³ / M', W, fs, { color: '#15803d', weight: 800 }) + 28 * FS;
    T(x0, y, '태양 둘레: a³/T² = ' + sci(K_SUN, 2) + ' (10⁵ km³/일²)', fs, '#b45309', 'left', 800);
    T(x0, y + 22 * FS, '목성 둘레(위성): a³/T² = ' + f1(K_JUP), fs, '#92400e', 'left', 800);
    const solved = S.massOk || (game && game.free);
    if (solved) T(x0, y + 44 * FS, 'M목성 / M태양 = ' + f1(K_JUP) + ' / ' + sci(K_SUN, 2) + ' = ' + sci(MJ_MS, 1) + ' (약 1/' + f0(1 / MJ_MS / 10) + '0)', fs, '#15803d', 'left', 800);
    cK.draw(dt);
    if (PHONE) T(L.grid.x + 4, L.grid.y - 4, '', 12);
  }
  /* ---------- ④ 모든 천체 ---------- */
  function LA4() {
    if (PHONE) return { g: { x: 8, y: 8, w: 464, h: 380 }, t: { x: 8, y: 396, w: 464, h: 330 }, p: { x: 8, y: 734, w: 464, h: 118 } };
    return { g: { x: 10, y: 8, w: 500, h: 424 }, t: { x: 520, y: 8, w: 270, h: 424 }, p: { x: 10, y: 440, w: 780, h: 170 } };
  }
  const gGeom = (g) => { const ix = g.x + (PHONE ? 46 : 52), iy = g.y + 36, iw = g.w - (ix - g.x) - 14, ih = g.h - 36 - 40; return { ix, iy, iw, ih, X: (v) => ix + iw * (v + 1) / 7, Y: (v) => iy + ih - ih * (v + 1) / 7 }; };
  const rowGeom = (L, i) => { const rh = PHONE ? 40 : 42; return { x: L.t.x, y: L.t.y + 62 * FS + i * rh, w: L.t.w, h: rh - 2 }; };
  const plotDone = () => S.plot.filter(Boolean).length;
  function plotBody(i) { if (i == null) i = S.plot.indexOf(false); if (i < 0 || S.plot[i]) return; S.plot[i] = true; S.fly.push({ i, t: 0 }); Sound.click(); updateCtl(); }
  const pw = (n) => ['10⁻¹', '1', '10', '10²', '10³', '10⁴', '10⁵', '10⁶'][n + 1];
  function drawAll(dt, t) {
    const L = LA4(), g = L.g, G = gGeom(g);
    panel(g.x, g.y, g.w, g.h, { fill: '#ffffff' });
    T(g.x + 12, g.y + 22 * FS, 'T² – a³ 그래프 (두 축 모두 10배마다 같은 간격)', PHONE ? 12.5 : 14, '#1e293b', 'left', 800);
    for (let v = -1; v <= 6; v++) {
      ctx.strokeStyle = 'rgba(100,116,139,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(G.ix, G.Y(v)); ctx.lineTo(G.ix + G.iw, G.Y(v)); ctx.moveTo(G.X(v), G.iy); ctx.lineTo(G.X(v), G.iy + G.ih); ctx.stroke();
      T(G.ix - 6, G.Y(v) + 5, pw(v), PHONE ? 11.5 : 12.5, '#475569', 'right', 700);
      if (!PHONE || v % 2 === 0) T(G.X(v), g.y + g.h - 20, pw(v), PHONE ? 11.5 : 12.5, '#475569', 'center', 700);
    }
    T(g.x + g.w - 12, g.y + g.h - 4, 'a³ (AU³)', 12.5, '#1d4ed8', 'right', 800); T(g.x + 12, g.y + g.h - 4, 'T² (년²): 세로축', 12.5, '#c2410c', 'left', 800);
    // 기준선 T² = a³ (기울기 1)
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(G.X(-1), G.Y(-1)); ctx.lineTo(G.X(6), G.Y(6)); ctx.stroke();
    T(G.X(1.2), G.Y(2.7), 'T² = a³ (기울기 1)', 13, '#15803d', 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
    // 점
    BODIES.forEach((b, i) => {
      if (!S.plot[i]) return;
      const fl = S.fly.find((f) => f.i === i); let tt = 1;
      if (fl) { fl.t = Math.min(1, fl.t + dt / (RM ? 0.01 : 0.9)); tt = SciSim.ease.outCubic(fl.t); if (fl.t >= 1) S.fly = S.fly.filter((f) => f !== fl); }
      const fx = G.X(Math.log10(b.a * b.a * b.a)), fy = G.Y(Math.log10(b.T * b.T)), rg = rowGeom(L, i), sx = rg.x + 22, sy = rg.y + rg.h / 2;
      const x = lerp(sx, fx, tt), y = lerp(sy, fy, tt);
      D.sphere(x, y, 6.5, b.c, { gloss: true, outline: '#1e293b', outlineWidth: 1.2 });
      if (tt >= 1) { const up = i % 2 === 0; T(x + (up ? -8 : 8), y + (up ? -12 : 20), b.n, 12.5, '#1e293b', up ? 'right' : 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 }); }
    });
    if (S.predOk || (game && game.free && S.predOk)) [[39.5, 248], [17.94, 76], [100, 1000]].forEach(([a, Tt]) => { const x = G.X(Math.log10(a * a * a)), y = G.Y(Math.log10(Tt * Tt)); D.spark(x, y, 9, t, '#f59e0b'); });
    // 표
    const tb = L.t; panel(tb.x, tb.y, tb.w, tb.h, { fill: '#ffffff' });
    T(tb.x + 12, tb.y + 24 * FS, '🪐 태양 둘레 천체 7개', 14.5, '#1e293b', 'left', 800);
    const hy = tb.y + 50 * FS;
    T(tb.x + 40, hy, '천체', 12.5, '#64748b', 'left', 800); T(tb.x + tb.w * 0.55, hy, 'a (AU)', 12.5, '#64748b', 'center', 800); T(tb.x + tb.w * 0.76, hy, 'T (년)', 12.5, '#64748b', 'center', 800); T(tb.x + tb.w - 8, hy, 'T²/a³', 12.5, '#64748b', 'right', 800);
    BODIES.forEach((b, i) => {
      const r = rowGeom(L, i), on = S.plot[i];
      if (on) { ctx.fillStyle = 'rgba(34,197,94,.1)'; rr(r.x + 6, r.y, r.w - 12, r.h, 8).fill(); } else { ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; rr(r.x + 6, r.y, r.w - 12, r.h, 8).stroke(); ctx.setLineDash([]); }
      D.sphere(r.x + 22, r.y + r.h / 2, 6, b.c, { gloss: false });
      T(r.x + 34, r.y + r.h / 2 + 5, b.n, PHONE ? 12.5 : 13.5, '#1e293b', 'left', 800);
      T(r.x + r.w * 0.55, r.y + r.h / 2 + 5, String(b.a), 13, '#475569', 'center', 700); T(r.x + r.w * 0.76, r.y + r.h / 2 + 5, String(b.T), 13, '#475569', 'center', 700);
      T(r.x + r.w - 10, r.y + r.h / 2 + 5, on ? f3(b.T * b.T / (b.a * b.a * b.a)) : '?', 13.5, on ? '#15803d' : '#cbd5e1', 'right', 800);
    });
    if (plotDone() < 7) T(tb.x + 12, tb.y + tb.h - 12, '행을 누르면 점이 찍혀요', 12.5, '#64748b', 'left', 700);
    const p = L.p; panel(p.x, p.y, p.w, p.h, { fill: '#ffffff' });
    const done = plotDone() === 7;
    T(p.x + 14, p.y + 24 * FS, done ? '✔ 모든 점이 직선 T² = a³ 위에 있어요 (T²/a³ = 1.00)' : '점 ' + plotDone() + ' / 7', 14.5, done ? '#15803d' : '#1e293b', 'left', 800);
    drawWrap(p.x + 14, p.y + 50 * FS, done ? '질량이 달라도(왜소행성·소행성·혜성도) 태양을 도는 천체라면 모두 같아요: 중심 천체가 태양이기 때문이에요.' : '표의 a와 T로 T²/a³을 계산해 그래프에 점을 찍어요. 두 눈금 모두 10배마다 같은 간격이에요.', p.w - 28, 13.5, { color: '#334155', weight: 700 });
    if (S.flags.calcPred || (game && game.free)) drawWrap(p.x + 14, p.y + (PHONE ? 96 : 104) * FS, '예측: ① a = 39.5 AU의 T  ② T = 76년 혜성의 a  ③ a = 100 AU의 T', p.w - 28, 13.5, { color: '#b45309', weight: 800 });
  }
  function allDown(p) {
    const L = LA4();
    for (let i = 0; i < 7; i++) { const r = rowGeom(L, i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { plotBody(i); return false; } }
    return false;
  }

  /* ================= 조작 · 화면 전환 ================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); }
    updateCtl();
  }
  const FREE = () => !!(game && game.free);
  function updateCtl() {
    const free = FREE(), k = PLN[S.pl].k;
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#ctlSky').hidden = !(S.view === 'scope' && (k === 'ven' || k === 'mar'));
    $('#calcRead').hidden = !(S.view === 'log' && (S.flags.calcRead || free));
    $('#calcK').hidden = !(S.view === 'log' && (S.flags.calcK || free));
    $('#calcMass').hidden = !(S.view === 'meaning' && (S.flags.calcMass || free));
    $('#calcPred').hidden = !(S.view === 'all' && (S.flags.calcPred || free));
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#grpPl .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.pl));
    $$('#grpFe .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.fe));
    $$('#grpM .opt').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.m - S.cm) < 0.01));
    $('#bPlot').disabled = plotDone() >= 7;
    $('#bRec').textContent = S.logOn ? '⏳ 기록 중…' : S.logT >= LOGDAYS ? '↺ 다시 기록' : '▶ 관측 일지 기록';
    $('#oSky').textContent = k === 'ven' ? '위치 ' + f0(S.sky * 180) + '° (0° = 가까움)' : '위치 ' + f0(S.sky * 180) + '° (0° = 충)';
  }
  modeBtns.forEach((b) => clickable(b, () => setView(b.dataset.view)));
  $$('#grpPl .opt').forEach((b) => clickable(b, () => { S.pl = +b.dataset.k; updateCtl(); }));
  $$('#grpFe .opt').forEach((b) => clickable(b, () => { S.fe = +b.dataset.k; updateCtl(); }));
  bindSlider($('#sSky'), $('#oSky'), (v) => '', (v) => { S.sky = v / 100; updateCtl(); });
  clickable($('#bRec'), () => { if (!S.logOn) startLog(); });
  clickable($('#bRecAll'), () => { S.logT = LOGDAYS; S.logOn = false; updateCtl(); });
  bindSlider($('#sM'), $('#oM'), (v) => f1(v) + ' M☉', (v) => { S.cM = v; });
  $$('#grpM .opt').forEach((b) => clickable(b, () => { S.cm = +b.dataset.m; updateCtl(); }));
  clickable($('#bPlot'), () => plotBody());

  SciSim.pointer(view, {
    down(p) {
      switch (S.view) {
        case 'scope': return scopeDown(p);
        case 'log': return logDown(p);
        case 'meaning': return cK.down(p);
        case 'all': return allDown(p);
        default: return false;
      }
    },
    move(p) { if (S.view === 'log') logMove(p); else if (S.view === 'meaning') cK.move(p); },
    up(p) { if (S.view === 'meaning') cK.up(p); },
    hover(p) {
      if (S.view === 'meaning') return cK.hit(p) ? 'pointer' : '';
      if (S.view === 'log') { const G = chartGeom(LL().c); return p.x > G.ix && p.x < G.ix + G.iw && p.y < LL().c.y + LL().c.h ? 'ew-resize' : ''; }
      if (S.view === 'scope') return moonPts.some((m) => Math.hypot(m.x - p.x, m.y - p.y) < 22) ? 'pointer' : '';
      return '';
    },
  });

  /* ================= 미션 ================= */
  const near = (x, v, tol) => x != null && Math.abs(x - v) <= tol;
  const levels = [
    {
      title: '목성 관측: 망원경으로 위성 찾기', short: '목성 관측', icon: '🔭', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 행성 관측 자료로 케플러의 법칙을 직접 확인하고, 이 법칙은 태양계 어디까지 맞을까?</p>' +
        '<div class="si-link">🔗 <b>역학과 에너지에서</b> 케플러 제3법칙(T² ∝ r³)을 원 궤도와 여섯 행성으로 확인했고, 이오의 주기로 목성의 질량을 구했어요. 이번에는 <b>직접 관측 자료</b>를 만들고 타원 궤도의 <b>긴반지름 a</b>로 확장해서, 위성·왜소행성·소행성·혜성까지 알아봐요.</div>' +
        '<p>먼저 가상 천체 망원경으로 금성·화성·목성·토성을 관측해요. 접안렌즈를 바꾸면 <b>배율 M = f_o / f_e</b>와 시야가 어떻게 달라지는지 보고, 목성 곁의 <b>갈릴레이 위성 4개</b>를 찾아봐요.</p>',
      features: ['scope'],
      setup() { S.pl = 2; S.fe = 0; S.found = new Set(); S.tplay = true; S.flags.calcRead = false; setView('scope'); },
      recap: '망원경의 배율은 M = f_o / f_e예요. 목성 곁에는 이오·에우로파·가니메데·칼리스토가 일직선으로 보이고, 날마다 위치가 바뀌어요.',
      summary: '<ul><li><b>배율 M = f_o / f_e</b>: 대물 f_o = 1000 mm, 접안 f_e = 20 mm → 50배. 접안렌즈 시야(약 50°)를 배율로 나눈 만큼의 하늘이 보여서 배율이 높을수록 시야가 좁아져요.</li><li>목성의 각지름은 약 40″ → 50배로 보면 2000″ ≈ 33′로 보름달(약 31′)과 비슷해요. 목성 줄무늬와 <b>갈릴레이 위성 4개</b>(이오·에우로파·가니메데·칼리스토)가 일직선으로 보여요.</li><li>금성은 위상과 크기가 변하고, 화성은 충 무렵에 크게 보이며, 토성은 고리가 보여요. 행성은 맨눈과 달리 <b>작은 원반</b>으로 보여요.</li></ul>',
      missions: [
        {
          title: '배율 50배로 목성의 위성 4개 찾기',
          goal: '목성을 고르고 <b>배율 50배</b>가 되는 접안렌즈를 선택하세요. 목성 곁에서 빛나는 <b>위성 4개를 눌러</b> 찾아요.',
          hint: 'f_o = 1000 mm이므로 M = 1000 / f_e = 50이 되려면 f_e = 20 mm예요. 위성이 목성 뒤에 가려져 안 보일 때는 조금 기다려요.',
          setup() { S.pl = 2; S.fe = 0; S.found = new Set(); S.tplay = true; setView('scope'); },
          check: () => PLN[S.pl].k === 'jup' && MAG() === 50 && S.found.size === 4,
          hold: 0.6,
          status: () => mark(MAG() === 50) + ' 배율 ' + MAG() + '배 &nbsp; ' + mark(S.found.size === 4) + ' 찾은 위성 ' + S.found.size + ' / 4',
          explain: '배율 M = f_o / f_e = 1000 / 20 = <b>50배</b>예요. 목성 곁에서 <b>이오·에우로파·가니메데·칼리스토</b>가 일직선 위를 왔다 갔다 해요. 목성의 적도 방향으로 놓인 위성 궤도를 거의 옆에서 보기 때문이에요.',
        },
        {
          type: 'quiz', title: '배율을 높이면 무조건 좋을까?',
          goal: '접안렌즈를 바꿔 배율을 100배로 올리면 목성이 더 크게 보여요. 그런데 배율을 높이는 것이 <b>항상 더 잘 보이는 것은 아닌</b> 까닭은?',
          setup() { S.pl = 2; S.fe = 2; setView('scope'); },
          choices: ['시야가 좁아져 천체를 찾기 어렵고, 대기 요동도 함께 커져 상이 흔들리고 흐려져요', '배율이 높을수록 상은 항상 더 밝고 선명해져요', '행성은 맨눈으로 봐도 망원경과 똑같은 모양이라 배율이 필요 없어요', '배율은 대물렌즈의 지름으로만 정해져서 접안렌즈와 관계없어요'],
          answer: 0,
          feedback: ['', '배율을 높이면 같은 빛이 더 넓게 퍼져서 오히려 어두워지고, 대기 요동과 렌즈의 한계로 흐려질 수 있어요.', '행성은 맨눈에 점으로 보이지만 망원경으로 보면 원반이에요. 금성은 위상, 토성은 고리가 보이죠.', '배율은 M = f_o / f_e라서 접안렌즈 f_e를 바꾸면 달라져요.'],
          explain: '배율이 높아질수록 <b>시야는 좁아지고</b>(50° / M), 밝기는 약해지며 <b>대기 요동</b>이 크게 보여요. 그래서 관측 조건에 맞는 배율을 골라야 해요.',
        },
      ],
    },
    {
      title: '주기와 거리: 관측 일지 분석', short: '주기와 거리', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 목성 곁의 위성 4개가 왔다 갔다 하는 것을 봤어요. 위성의 위치를 6시간마다 기록하면 <b>사인 곡선</b>이 그려져요. 곡선의 한 주기가 위성의 공전 주기 T이고, 가장 멀리 벗어난 거리(최대 이각)가 궤도의 긴반지름 a예요.</div>' +
        '<p>관측 일지에서 <b>T와 a</b>를 읽고, 네 위성의 <b>a³ / T²</b>을 계산해 비교해요.</p>',
      features: ['log'],
      setup() { S.flags.calcRead = false; S.flags.calcK = false; S.doneRead = false; S.kSolved = false; startLog(); setView('log'); },
      recap: '곡선에서 주기 T와 최대 이각 a를 읽을 수 있어요. 목성 둘레를 도는 네 위성은 a³ / T²이 모두 약 24로 같아요.',
      summary: '<ul><li>위성의 위치 x(t) = a sin(2πt / T) 모양의 사인 곡선: 곡선의 한 번 왕복이 <b>주기 T</b>, 가장 멀리 간 거리가 <b>긴반지름 a</b>예요.</li><li>이오 T = 1.769일, a = 4.22×10⁵ km(2.95 D_J) · 에우로파 3.551일, 6.71×10⁵ km · 가니메데 7.155일, 10.70×10⁵ km · 칼리스토 16.69일, 18.83×10⁵ km.</li><li>a³ / T² = 24.0, 24.0, 23.9, 24.0 (×10⁵ km³/일²) → <b>약 24.0으로 모두 같아요</b>. 거리가 멀수록 주기가 길어요(제3법칙).</li></ul>',
      missions: [
        {
          title: '곡선에서 T와 a 읽기', manual: true,
          goal: '그래프를 눌러 값을 읽어 <b>이오</b>와 <b>칼리스토</b>의 공전 주기 T(일)와 최대 이각 a(<b>목성 지름 D_J</b> 단위)를 입력하세요.',
          hint: '곡선의 꼭대기(가장 위)에서 다음 꼭대기까지의 날수가 주기 T예요. 꼭대기의 높이가 a(D_J)예요. 칼리스토는 24일 동안 두 번 꼭대기가 나와요.',
          setup() { S.flags.calcRead = true; S.flags.calcK = false; S.doneRead = false; S.kSolved = false; clrIn('inTIo', 'inAIo', 'inTCa', 'inACa'); S.logT = LOGDAYS; S.logOn = false; setView('log'); },
          check() {
            const v = ['inTIo', 'inAIo', 'inTCa', 'inACa'].map(numOf);
            if (v.some((x) => x == null)) return '네 칸에 모두 숫자를 입력해 주세요.';
            const ok = [near(v[0], MOONS[0].T, 0.12), near(v[1], MOONS[0].dj, 0.25), near(v[2], MOONS[3].T, 0.8), near(v[3], MOONS[3].dj, 0.8)];
            ['inTIo', 'inAIo', 'inTCa', 'inACa'].forEach((id, i) => fbIn(id, ok[i]));
            if (ok.every(Boolean)) { S.doneRead = true; return true; }
            if (!ok[0] || !ok[2]) return 'T는 곡선이 한 번 왕복하는 데 걸린 날수예요. 이오는 약 1~2일, 칼리스토는 약 17일이에요.';
            return 'a는 위로 가장 멀리 간 높이(D_J)예요. 이오 약 3, 칼리스토 약 13이에요.';
          },
          status: () => '이오 T ' + ($('#inTIo').value.trim() || '—') + ' · a ' + ($('#inAIo').value.trim() || '—') + ' / 칼리스토 T ' + ($('#inTCa').value.trim() || '—') + ' · a ' + ($('#inACa').value.trim() || '—'),
          explain: '이오는 <b>T ≈ 1.77일, a ≈ 2.95 D_J</b>(= 4.22×10⁵ km), 칼리스토는 <b>T ≈ 16.7일, a ≈ 13.2 D_J</b>(= 18.8×10⁵ km)예요. D_J = 1.43×10⁵ km를 곱하면 km로 바뀌어요. 먼 위성일수록 주기가 길어요.',
        },
        {
          title: '네 위성의 a³ / T² 계산', manual: true,
          goal: '표의 T(일)와 a(10⁵ km)로 네 위성의 <b>a³ / T²</b>을 계산해 입력하세요. (소수 첫째 자리까지)',
          hint: '이오: 4.22³ = 75.2, 1.769² = 3.13 이므로 75.2 / 3.13 ≈ 24예요. 나머지 위성도 같은 방법으로 해요.',
          setup() { S.flags.calcRead = false; S.flags.calcK = true; S.doneRead = true; S.kSolved = false; clrIn('inK0', 'inK1', 'inK2', 'inK3'); setView('log'); },
          check() {
            const v = ['inK0', 'inK1', 'inK2', 'inK3'].map(numOf);
            if (v.some((x) => x == null)) return '네 칸에 모두 숫자를 입력해 주세요.';
            const ok = v.map((x, i) => near(x, MOONS[i].k, 1.0));
            ['inK0', 'inK1', 'inK2', 'inK3'].forEach((id, i) => fbIn(id, ok[i]));
            if (ok.every(Boolean)) { S.kSolved = true; return true; }
            if (v.some((x, i) => near(x, MOONS[i].a / MOONS[i].T, 0.5) )) return 'a / T가 아니에요. a를 세제곱하고 T를 제곱해서 나눠요.';
            return 'a는 세제곱, T는 제곱이에요. 빨간 칸의 값을 다시 계산해 보세요. 모두 약 24가 나와요.';
          },
          status: () => '입력 ' + ['inK0', 'inK1', 'inK2', 'inK3'].map((id) => $('#' + id).value.trim() || '—').join(' / '),
          explain: 'a³ / T² = <b>24.0 · 24.0 · 23.9 · 24.0</b> (×10⁵ km³/일²)로 거의 같아요. 위성의 질량이 달라도, 거리와 주기가 달라도 <b>같은 중심 천체(목성)를 돌면 a³ / T²이 같아요</b>.',
        },
        {
          type: 'quiz', title: '칼리스토의 주기가 더 긴 까닭',
          goal: '칼리스토의 공전 주기(16.7일)가 이오(1.77일)보다 훨씬 긴 까닭은?',
          setup() { S.flags.calcK = false; setView('log'); },
          choices: ['목성에서 멀수록 주기가 길어요 (a³ / T²이 같으므로 a가 크면 T도 커요)', '칼리스토가 이오보다 훨씬 무거워서 천천히 돌아요', '칼리스토는 목성이 아니라 태양을 돌아서 느려요', '위성의 주기는 모두 같고 관측이 달라 보일 뿐이에요'],
          answer: 0,
          feedback: ['', '같은 중심 천체를 돌면 위성의 질량은 주기에 영향을 주지 않아요. 거리가 주기를 정해요.', '칼리스토도 목성을 돌아요. 그래서 a³ / T²이 이오와 같아요.', '표를 보면 T가 1.769일부터 16.69일까지 서로 달라요.'],
          explain: 'a³ / T² = 일정이므로 <b>a가 클수록 T도 커져요</b>(T² ∝ a³). 칼리스토의 a는 이오의 약 4.5배라서 T는 약 4.5^(3/2) ≈ 9.5배(16.69 / 1.769 = 9.4)예요.',
        },
      ],
    },
    {
      title: '법칙의 의미: a³ / T²이 알려 주는 것', short: '법칙의 의미', icon: '⚖', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 목성 위성의 a³ / T²이 모두 24로 같다는 것을 확인했어요. 그런데 태양 둘레 행성의 값은 약 2.5×10⁴으로 훨씬 커요. <b>왜 이런 차이가 생길까요?</b></div>' +
        '<p>중력이 구심력이 되는 식에서 a³ / T² = GM / 4π²이 나와요. 이 값은 <b>중심 천체의 질량 M</b>으로만 정해져요. 중심 천체가 바뀌면 값이 달라지고, 도는 천체의 질량은 상관없어요.</p>',
      features: ['meaning'],
      setup() { S.cM = 1; S.cm = 1; setSlider($('#sM'), $('#oM'), 1, (v) => f1(v) + ' M☉'); S.flags.calcMass = false; S.massOk = false; cK.reset(); setView('meaning'); },
      recap: 'a³ / T² = GM / (4π²)이라 중심 천체의 질량만 알면 값이 정해져요. 태양 둘레는 약 2.5×10⁴, 목성 둘레는 24, 지구 둘레는 0.076 (10⁵ km³/일²)이에요.',
      summary: '<ul><li>중력 = 구심력: G M m / a² = m (2π / T)² a → <b>a³ / T² = G M / (4π²)</b>. 오른쪽에는 중심 천체의 질량 M만 있어요(도는 천체의 질량 m은 사라져요).</li><li>AU·년·태양 질량(M☉) 단위에서는 <b>T² = a³ / M</b>이에요. 태양 둘레(M = 1)는 a³ / T² = 1이에요.</li><li>같은 단위(10⁵ km³/일²)로 비교: 태양 둘레 <b>2.51×10⁴</b>, 목성 둘레 <b>24.0</b>, 지구 둘레(달: a = 3.84×10⁵ km, T = 27.3일) <b>0.076</b>. → 목성의 질량은 태양의 24.0 / 2.51×10⁴ = <b>9.6×10⁻⁴</b>(약 1/1050)배.</li><li>중심 천체가 바뀌면 상수가 바뀌고, 같은 중심 천체를 도는 천체끼리는 질량이 달라도 같아요.</li></ul>',
      missions: [
        {
          title: '목성의 질량은 태양의 몇 배?', manual: true,
          goal: '태양 둘레의 a³ / T² = 2.51×10⁴, 목성 둘레(위성)의 a³ / T² = 24.0 (같은 단위)예요. <b>M목성 / M태양</b>을 <b>×10⁻⁴</b> 단위로 입력하세요.',
          hint: 'a³ / T² = GM / 4π²이므로 값의 비가 질량의 비예요: 24.0 / 25100 = 9.6×10⁻⁴ → 9.6을 입력해요.',
          setup() { S.flags.calcMass = true; S.massOk = false; clrIn('inMass'); setView('meaning'); },
          check() {
            const x = numOf('inMass');
            if (x == null) return '숫자(×10⁻⁴ 단위)를 입력해 주세요.';
            const ok = near(x, MJ_MS * 1e4, 0.6); fbIn('inMass', ok);
            if (ok) { S.massOk = true; return true; }
            if (near(x, 1 / (MJ_MS * 1e4) * 1e4, 40) || x > 100) return '비가 거꾸로예요. 목성(24.0)이 분자, 태양(2.51×10⁴)이 분모예요.';
            if (x < 0.5) return '단위가 ×10⁻⁴예요. 9.6×10⁻⁴이면 9.6을 입력해요.';
            return '24.0 ÷ 25100 을 계산해 ×10⁻⁴ 단위로 바꿔 보세요.';
          },
          status: () => '입력 ' + ($('#inMass').value.trim() || '—') + ' ×10⁻⁴',
          explain: 'M목성 / M태양 = (a³/T²)목성 / (a³/T²)태양 = 24.0 / 2.51×10⁴ = <b>9.6×10⁻⁴</b> (약 1/1050)이에요. 위성의 관측만으로 목성의 질량을 태양과 비교해서 알아냈어요!',
        },
        {
          title: '같은 상수끼리 짝짓기', manual: true,
          goal: '천체 8개의 a³ / T² 값을 구해 <b>태양 둘레 · 목성 둘레 · 지구 둘레</b> 상자로 나눠 ✔ 확인하기를 눌러요.',
          hint: '카드를 눌러 a와 T로 계산된 값을 확인해요. 값이 약 2.5×10⁴이면 태양, 약 24이면 목성, 약 0.076이면 지구 둘레예요.',
          setup() { cK.reset(); S.flags.calcMass = false; setView('meaning'); },
          check() {
            const pl = cK.items.filter((i) => i.loc != null).length;
            if (pl < 8) return '아직 상자에 넣지 않은 카드가 ' + (8 - pl) + '장 있어요.';
            const bad = cK.items.filter((i) => i.loc !== i.bin); cK.items.forEach((i) => { i.wrong = i.loc !== i.bin; });
            return bad.length ? '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요. a³ / T² 값을 비교해 보세요.' : true;
          },
          status: () => mark(cK.counts().placed === 8) + ' 분류 ' + cK.counts().placed + ' / 8',
          explain: '수성·화성·세레스·핼리 혜성은 모두 <b>태양 둘레</b>(약 2.5×10⁴), 이오·에우로파·칼리스토는 <b>목성 둘레</b>(약 24), 달은 <b>지구 둘레</b>(약 0.076)예요. 중심 천체가 같으면 천체의 종류와 질량이 달라도 값이 같아요.',
        },
        {
          type: 'quiz', title: '질량이 큰 천체는 주기가 더 짧을까?',
          goal: '같은 태양 둘레를 도는 두 천체 중 <b>질량이 더 큰 천체</b>는 같은 거리(a)에서 공전 주기가 더 짧을까요?',
          setup() { S.cm = 1; setView('meaning'); },
          choices: ['아니에요. 같은 a에서는 도는 천체의 질량과 관계없이 T가 같아요', '네. 무거울수록 중력이 커서 더 빨리 돌아요', '아니에요. 무거울수록 관성이 커서 더 느리게 돌아요', '네. 질량이 클수록 주기는 길어져요'],
          answer: 0,
          feedback: ['', '무거울수록 중력도 커지지만 관성(질량)도 같은 비율로 커서 가속도는 같아요. 그래서 T는 같아요.', '관성이 커지는 만큼 중력도 커져서 서로 상쇄돼요. 질량은 T에 영향을 주지 않아요.', 'a³ / T² = GM / 4π²에는 도는 천체의 질량 m이 없어요.'],
          explain: 'T² = 4π²a³ / (GM)에는 <b>중심 천체의 질량 M만</b> 있어요. 도는 천체의 질량 m은 양변에서 약분돼요. 그래서 지구와 목성(질량이 318배)도 태양에서 같은 거리라면 같은 주기를 가져요.',
        },
      ],
    },
    {
      title: '모든 천체: 왜소행성과 혜성도', short: '모든 천체', icon: '🌌', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> a³ / T²이 중심 천체의 질량으로 정해진다는 것을 알았어요. 그렇다면 태양을 도는 천체는 행성뿐 아니라 <b>왜소행성·소행성·혜성도 모두 같은 값(T² / a³ = 1)</b>이어야 해요.</div>' +
        '<p>천왕성부터 아포피스까지 7개 천체의 a와 T로 T² / a³을 확인하고 그래프에 점을 찍어요. 그다음 법칙으로 <b>새로운 천체의 주기와 거리를 예측</b>해 봐요.</p>',
      features: ['all'],
      setup() { S.plot = BODIES.map(() => false); S.fly = []; S.predOk = false; S.flags.calcPred = false; setView('all'); },
      recap: '태양을 도는 모든 천체는 T² / a³ = 1이에요. 행성뿐 아니라 왜소행성·소행성·혜성도 태양의 중력을 받기 때문이에요.',
      summary: '<ul><li>태양 둘레 천체의 T² / a³ (AU, 년): 천왕성 0.998, 해왕성 0.999, 세레스 0.996, 명왕성 0.999, 에리스 1.003, 핼리 혜성 1.005, 아포피스 1.002 → <b>모두 1.00</b>.</li><li>T²–a³ 그래프(눈금은 10배마다 같은 간격)에서 모든 점이 <b>기울기 1인 직선 T² = a³ 위</b>에 놓여요.</li><li>예측: a = 39.5 AU → T = √(39.5³) ≈ <b>248년</b>(명왕성), T = 76년인 혜성 → a = 76^(2/3) ≈ <b>17.9 AU</b>, a = 100 AU → T = <b>1000년</b>.</li><li>케플러의 법칙은 <b>태양의 중력을 받는 모든 천체</b>(행성·왜소행성·소행성·혜성)에 적용돼요. 단, 중심 천체가 바뀌면(목성의 위성, 지구의 달) 상수가 달라져요.</li></ul>',
      missions: [
        {
          title: '7개 천체를 T²–a³ 그래프에 찍기',
          goal: '표의 천체 7개를 눌러(또는 📍 버튼으로) <b>T²–a³ 그래프에 점을 모두 찍고</b>, 점들이 놓이는 모양을 살펴보세요.',
          hint: '📍 다음 천체 점 찍기를 일곱 번 눌러요. 표의 행을 눌러도 돼요. T² / a³이 모두 1에 가까워야 해요.',
          setup() { S.plot = BODIES.map(() => false); S.fly = []; S.flags.calcPred = false; setView('all'); },
          check: () => plotDone() === 7,
          hold: 0.9,
          status: () => mark(plotDone() === 7) + ' 찍은 점 ' + plotDone() + ' / 7',
          explain: '일곱 점이 모두 <b>직선 T² = a³</b> 위에 놓여요(T² / a³ = 0.996 ~ 1.005). 질량이 아주 다른 천왕성, 왜소행성 세레스·명왕성·에리스, 혜성, 소행성도 마찬가지예요.',
        },
        {
          title: '케플러 제3법칙으로 예측하기', manual: true,
          goal: '태양 둘레 천체에 T² = a³(AU, 년)을 적용해 <b>세 가지를 예측</b>하세요: ① a = 39.5 AU인 천체의 T(년) ② T = 76년인 혜성의 a(AU) ③ a = 100 AU인 천체의 T(년)',
          hint: 'T² = a³이에요. ① T = √(39.5³) ② a = T^(2/3) ③ T = √(100³) = 100^1.5',
          setup() { S.flags.calcPred = true; S.predOk = false; clrIn('inP0', 'inP1', 'inP2'); setView('all'); },
          check() {
            const v = ['inP0', 'inP1', 'inP2'].map(numOf);
            if (v.some((x) => x == null)) return '세 칸에 모두 숫자를 입력해 주세요.';
            const ex = [Math.sqrt(Math.pow(39.5, 3)), Math.pow(76, 2 / 3), Math.pow(100, 1.5)], tol = [5, 0.4, 20];
            const ok = v.map((x, i) => near(x, ex[i], tol[i])); ['inP0', 'inP1', 'inP2'].forEach((id, i) => fbIn(id, ok[i]));
            if (ok.every(Boolean)) { S.predOk = true; return true; }
            if (near(v[2], 100 * 100 * 100, 1) || near(v[2], 10000, 1)) return 'T² = a³이므로 T는 그 제곱근이에요. T = √(100³) = 100^1.5예요.';
            if (near(v[0], 39.5, 1) || near(v[2], 100, 1)) return 'T가 a에 비례하는 것이 아니에요. T² = a³이라서 T = a^(3/2)예요.';
            return '빨간 칸의 값을 다시 계산해 보세요. T = a^(3/2), a = T^(2/3)이에요.';
          },
          status: () => '입력 ' + ['inP0', 'inP1', 'inP2'].map((id) => $('#' + id).value.trim() || '—').join(' / '),
          explain: '① T = 39.5^1.5 ≈ <b>248년</b>(명왕성의 주기와 같아요) ② a = 76^(2/3) ≈ <b>17.9 AU</b>(핼리 혜성의 a예요) ③ T = 100^1.5 = <b>1000년</b>. 관측하지 않은 천체의 주기도 법칙으로 알 수 있어요.',
        },
        {
          type: 'quiz', title: '혜성과 소행성에도 성립하는 까닭',
          goal: '케플러 제3법칙이 행성뿐 아니라 <b>혜성·소행성·왜소행성</b>에도 성립하는 까닭은?',
          setup() { setView('all'); },
          choices: ['모두 태양의 중력을 받으며 태양 둘레를 도는 천체이기 때문이에요', '모두 질량이 같기 때문이에요', '모두 원 궤도를 돌기 때문이에요', '혜성과 소행성은 행성에서 떨어져 나온 조각이기 때문이에요'],
          answer: 0,
          feedback: ['', '질량은 달라요. 질량이 달라도 a³ / T²은 중심 천체의 질량으로만 정해져요.', '혜성은 아주 긴 타원 궤도예요(핼리 e = 0.967). 제3법칙은 타원의 긴반지름 a로 성립해요.', '기원이 무엇이든 태양의 중력을 받는다는 사실이 중요해요.'],
          explain: 'a³ / T² = GM☉ / 4π²는 <b>중심 천체가 태양</b>이면 같은 값이에요. 행성·왜소행성·소행성·혜성은 모두 태양의 중력을 받으니 질량과 궤도 모양이 달라도(타원의 a 사용) 같은 법칙을 따라요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-kepler-period', mount: '#game', badge: '케플러 관측가', homeHref: '../../index.html#hu',
    featureLabels: { scope: '🔭 가상 천체 망원경 · 접안렌즈', log: '📈 위성 관측 일지 · 읽기 커서', meaning: '⚖ 중심 천체 질량 실험 · 상수 짝짓기', all: '🌌 T²–a³ 그래프 · 예측' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    if (S.view === 'scope') { const g = planetGeom(PLN[S.pl].k, S.sky); setReadouts(['배율 M = f_o / f_e', MAG() + '배', '실제 하늘 시야', f2(FOVAPP / MAG()) + '°', PLN[S.pl].n + ' 각지름', f1(g.th) + '″']); }
    else if (S.view === 'log') setReadouts(['기록한 날수', f1(S.logT) + '일', '읽은 시각 t', S.curOn ? f2(Math.min(S.cur, S.logT)) + '일' : '—', '표본 간격', '6시간']);
    else if (S.view === 'meaning') setReadouts(['중심 천체 M', f1(S.cM) + ' M☉', '공전 주기 T (a = 1 AU)', f2(1 / Math.sqrt(S.cM)) + '년', 'a³ / T²', f2(S.cM)]);
    else setReadouts(['찍은 점', plotDone() + ' / 7', '기준선', 'T² = a³', '예측', S.predOk ? '맞았어요' : '—']);
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
      case 'scope': drawScope(dt, t); break;
      case 'log': drawLog(dt, t); break;
      case 'meaning': drawMeaning(dt, t); break;
      default: drawAll(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.view === 'log' && S.logOn !== S._lo) { S._lo = S.logOn; updateCtl(); }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, MOONS, BODIES, K_SUN, K_JUP, K_EARTH, MJ_MS, cK, get game() { return game; }, setView, startLog, plotBody, updateCtl, LS, LL, LM3, LA4, chartGeom, planetGeom, moonPts: () => moonPts, MAG, moonX };
})();
