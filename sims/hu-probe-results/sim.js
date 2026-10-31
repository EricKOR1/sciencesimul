/* =========================================================
   행성우주과학 Ⅰ. 우주탐사와 행성계 - 탐사선이 밝힌 것 (1차시)
   성취기준 [12행우01-01] 태양계 탐사선의 활동을 통해 알아낸 성과를 이해하고, 인공위성을 활용한 우주탐사의 필요성을 토론할 수 있다.
   ① 관찰: 탐사 방식 (목적지 · 빛 신호 지연 t = d/c · 방식 4가지)
   ② 분석: 탐사 성과 (모둠 자료 보드 12장, 충돌구 헤아리기)
   ③ 설명: 우주 관측 (대기 투과 곡선, 분해능 θ = 1.22 λ/D)
   ④ 적용: 토론하기 (우리나라 우주개발 카드, 찬성/반대/조건 근거 카드)
   다루지 않음: 궤도 계산(호만 전이, 중력 도움), 로켓 방정식, 탐사선 기기의 작동 원리.
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


  initStage('#e8eef8', 800, 620, 480, 820, 1.25);
  if (PHONE) view.canvas.style.touchAction = 'pan-y';

  /* ================= 자료 ================= */
  const AU_S = 500;                       // 1 AU 빛이 가는 시간 (s): 1.5×10⁸ km ÷ 3.0×10⁵ km/s
  const tstr = (s) => (s < 1.5 ? f1(s) + '초' : s < 90 ? f0(s) + '초' : s < 7200 ? f0(s / 60) + '분' : f1(s / 3600) + '시간');
  const dstr = (d) => String(d < 0.01 ? +d.toFixed(4) : +d.toFixed(2));
  const METH = [
    { n: '근접 통과', ic: '➡️', d: '천체 곁을 한 번 지나가며 관측해요. 연료는 적게 들지만 관측 시간이 짧아요. 예: 보이저 1·2호(1977 발사)는 목성·토성을, 2호는 천왕성·해왕성까지 지나갔어요.' },
    { n: '궤도선', ic: '🔄', d: '천체 둘레의 궤도를 돌며 오랫동안 관측해요. 예: 카시니(토성, 2004~2017), 주노(목성, 2016~), 다누리(달, 2022~).' },
    { n: '착륙선·로버', ic: '🛬', d: '표면에 내려 직접 조사해요. 예: 퍼서비어런스(화성 제제로 분화구, 2021)와 인저뉴어티 헬리콥터(2021~2024).' },
    { n: '시료 회수', ic: '📦', d: '표면 물질을 지구로 가져와 실험실에서 분석해요. 예: 하야부사2호(류구 시료 약 5.4 g, 2020), OSIRIS-REx(베누 시료 약 120 g, 2023), 창어 5호(달, 2020).' },
  ];
  const DEST = [
    { n: '달', ic: '🌕', col: '#cbd5e1', dmin: 0.00257, dmax: 0.00257, goal: '달 둘레를 돌며 극지방의 그늘진 곳까지 오랫동안 촬영하고 싶어요.', meth: 1, probe: '다누리 (2022 발사)',
      wrong: { 0: '한 번 스쳐 지나가면 극지방을 오랫동안 촬영할 수 없어요.', 2: '착륙선은 내려앉은 한 곳만 조사해요. 달 전체를 오래 촬영하려면 궤도를 도는 탐사선이 좋아요.', 3: '시료 회수는 흙을 가져오는 일이에요. 이번 목표는 궤도에서 오래 촬영하는 거예요.' } },
    { n: '소행성', ic: '☄️', col: '#8b7d6b', dmin: null, dmax: 2.4, goal: '소행성 표면의 흙을 지구로 가져와 실험실에서 정밀하게 분석하고 싶어요.', meth: 3, probe: '하야부사2호 (류구, 2020 귀환)',
      wrong: { 0: '지나가며 사진만 찍어서는 흙을 가져올 수 없어요.', 1: '궤도선은 멀리서 관측만 해요. 지구에서 정밀 분석하려면 시료를 가져와야 해요.', 2: '착륙선은 현장에서 간단히 조사해요. 정밀 분석 장비는 지구 실험실에 있어요.' } },
    { n: '화성', ic: '🔴', col: '#e2725b', dmin: 0.36, dmax: 2.67, goal: '옛 호수 바닥이었던 분화구의 암석을 눈앞에서 직접 조사하고 싶어요.', meth: 2, probe: '퍼서비어런스 (2021 착륙)',
      wrong: { 0: '스쳐 지나가면 암석을 눈앞에서 조사할 수 없어요.', 1: '궤도선은 위에서 관측해요. 암석을 조사하려면 표면에 내려야 해요.', 3: '이번 목표는 현장 조사예요. 시료는 먼저 로버가 직접 모아야 해요.' } },
    { n: '목성', ic: '🟤', col: '#e0a96d', dmin: 4.2, dmax: 6.2, goal: '거대 행성의 대기와 자기장, 중력장을 몇 년 동안 반복해서 측정하고 싶어요.', meth: 1, probe: '주노 (2016~)',
      wrong: { 0: '잠깐 지나가면 몇 년 동안 반복 측정할 수 없어요.', 2: '목성은 단단한 표면이 없는 기체 행성이라 내려앉을 수 없어요.', 3: '표면이 없는 기체 행성에서는 가져올 시료가 없어요.' } },
    { n: '토성', ic: '🪐', col: '#d9c27a', dmin: 8.0, dmax: 11.1, goal: '고리와 위성 엔셀라두스를 10년 넘게 가까이에서 관찰하고 싶어요.', meth: 1, probe: '카시니 (2004~2017)',
      wrong: { 0: '지나가며 보는 것으로는 10년 넘는 관찰이 어려워요.', 2: '토성은 기체 행성이라 내려앉을 표면이 없어요.', 3: '표면이 없는 기체 행성에서는 가져올 시료가 없어요.' } },
    { n: '명왕성', ic: '⚪', col: '#c8b8a8', dmin: 33, dmax: 33, goal: '너무 멀어서 오래 머물 연료가 없어요. 빠르게 지나가며 촬영하고 싶어요.', meth: 0, probe: '뉴호라이즌스 (2015)',
      wrong: { 1: '궤도에 들어가려면 속도를 크게 줄여야 해서 연료가 훨씬 많이 필요해요.', 2: '착륙은 더 많은 연료와 기술이 필요해요. 이번엔 지나가며 관측하는 방식이에요.', 3: '시료를 싣고 33 AU를 돌아오는 것은 지금 기술로 매우 어려워요.' } },
  ];
  /* 모둠 자료 카드 12장 (P: 행성·위성·태양 탐사선, S: 소천체 탐사선) */
  const CARDS = [
    { label: '화성', sub: '퍼서비어런스 2021', text: '과거에 호수와 삼각주가 있던 제제로 분화구에서 시료를 채취해 보관해요.', bin: 0, mine: true },
    { label: '목성', sub: '주노 2016~', text: '극 지역에 사이클론이 모여 있고, 내부 구조와 중력장·자기장이 예상보다 복잡해요.', bin: 0 },
    { label: '엔셀라두스', sub: '카시니 2004~2017', text: '토성 위성의 남극 균열에서 물 얼음 입자가 간헐천처럼 분출해요. 지하 바다의 증거예요.', bin: 0, mine: true },
    { label: '명왕성', sub: '뉴호라이즌스 2015', text: '질소 얼음 평원과 젊은 지형이 있어요. 지질 활동이 있는 왜소행성이에요.', bin: 1 },
    { label: '아로코스', sub: '뉴호라이즌스 2019', text: '카이퍼 벨트 천체예요. 두 덩어리가 부드럽게 붙은 접촉 쌍성이에요.', bin: 1 },
    { label: '소행성 류구', sub: '하야부사2 2020', text: '가져온 시료(약 5.4 g)에서 물을 품은 광물과 아미노산 등 유기물이 발견됐어요.', bin: 1, mine: true },
    { label: '소행성 베누', sub: 'OSIRIS-REx 2023', text: '느슨하게 뭉친 잔해 더미예요. 가져온 시료(약 120 g)에서 유기물이 발견됐어요.', bin: 1 },
    { label: '혜성 67P', sub: '로제타 2014~2016', text: '밀도가 약 0.53 g/cm³인 성긴 얼음·먼지 덩어리예요.', bin: 1 },
    { label: '디모르포스', sub: 'DART 2022', text: '쌍성 소행성이에요. 충돌로 공전 주기가 11시간 55분에서 11시간 23분으로 줄었어요.', bin: 1 },
    { label: '달 (창어 5호)', sub: '창어 5호 2020', text: '시료 분석 결과 현무암이 약 20억 년 전에도 분출했어요. 달의 화산 활동이 오래 이어졌어요.', bin: 0 },
    { label: '태양', sub: '파커 태양 탐사선', text: '코로나 안쪽(태양 표면에서 약 6백만 km 이내)까지 들어갔어요.', bin: 0 },
    { label: '달 (다누리)', sub: '다누리 2022~ (우리나라)', text: '달 궤도에서 극지방의 영구 음영 지역 등을 촬영하고 탐사해요. 우리나라가 만든 첫 달 탐사선이에요.', bin: 0 },
  ];
  /* 충돌구 헤아리기 구역: 지름 5 km 이상만 세어요 (100 km × 100 km = 10⁴ km²) */
  const REG = [
    { n: '달 고지', big: 36, small: 52, base: '#b9b6ae', seed: 11, tag: '밝고 울퉁불퉁한 고지' },
    { n: '달 바다', big: 9, small: 24, base: '#5f636d', seed: 29, tag: '어두운 용암 평원' },
    { n: '올림푸스 사면', big: 1, small: 10, base: '#b9684b', seed: 47, tag: '화성 화산의 비탈' },
  ];
  const CRATER_PX = 500;                 // 사진 한 변 (px) = 100 km  →  5 km = 25 px
  function makeRegion(R, idx) {
    let s = R.seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    let list = [];
    function tryPlace(rad, big) {
      for (let k = 0; k < 600; k++) {
        const x = rad + rnd() * (1 - 2 * rad), y = rad + rnd() * (1 - 2 * rad);
        let ok = true;
        for (const c of list) { if (Math.hypot(c.x - x, c.y - y) < c.r + rad + (big || c.big ? 0.025 : 0.012)) { ok = false; break; } }
        if (ok) { list.push({ x, y, r: rad, big }); return true; }
      }
      return false;
    }
    for (let attempt = 0; attempt < 40; attempt++) {
      list = [];
      const sizes = [];
      for (let i = 0; i < R.big; i++) sizes.push((6 + Math.pow(rnd(), 1.8) * 9) / 200);       // 지름 6~15 km → 반지름(사진 길이 1 기준)
      sizes.sort((a, b) => b - a);
      let ok = sizes.every((r) => tryPlace(r, true));
      for (let i = 0; i < R.small; i++) tryPlace((1 + rnd() * 2.6) / 200, false);          // 지름 1~3.6 km (5 km 미만)
      if (ok) break;
    }
    // 오프스크린 그림
    const cv = document.createElement('canvas'); cv.width = cv.height = CRATER_PX;
    const g = cv.getContext('2d'), P = CRATER_PX;
    const bg = g.createLinearGradient(0, 0, P, P); bg.addColorStop(0, shade(R.base, 0.12)); bg.addColorStop(1, shade(R.base, -0.12));
    g.fillStyle = bg; g.fillRect(0, 0, P, P);
    let s2 = R.seed * 7 + 3; const r2 = () => ((s2 = (s2 * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 1400; i++) { g.fillStyle = r2() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.09)'; g.fillRect(r2() * P, r2() * P, 1 + r2() * 2.2, 1 + r2() * 2.2); }
    if (idx === 2) { g.strokeStyle = 'rgba(80,30,10,.28)'; g.lineWidth = 6; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(r2() * P, 0); g.bezierCurveTo(r2() * P, P * 0.3, r2() * P, P * 0.6, r2() * P, P); g.stroke(); } }
    if (idx === 1) { g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(r2() * P, r2() * P); g.bezierCurveTo(r2() * P, r2() * P, r2() * P, r2() * P, r2() * P, r2() * P); g.stroke(); } }
    list.forEach((c) => {
      const X = c.x * P, Y = c.y * P, rad = c.r * P;
      const gr = g.createRadialGradient(X + rad * 0.25, Y + rad * 0.25, rad * 0.1, X, Y, rad);
      gr.addColorStop(0, 'rgba(0,0,0,.05)'); gr.addColorStop(0.75, 'rgba(0,0,0,.34)'); gr.addColorStop(1, 'rgba(0,0,0,.55)');
      g.fillStyle = gr; g.beginPath(); g.arc(X, Y, rad, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.42)'; g.lineWidth = Math.max(1.4, rad * 0.14); g.beginPath(); g.arc(X, Y, rad, Math.PI * 0.85, Math.PI * 1.9); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = Math.max(1.2, rad * 0.1); g.beginPath(); g.arc(X, Y, rad, -Math.PI * 0.1, Math.PI * 0.8); g.stroke();
    });
    return { list, cv, bigIdx: list.map((c, i) => (c.big ? i : -1)).filter((i) => i >= 0) };
  }
  const REGIONS = REG.map(makeRegion);
  REG.forEach((R, i) => { if (REGIONS[i].bigIdx.length !== R.big) console.warn('crater placement', R.n, REGIONS[i].bigIdx.length, R.big); });

  /* 대기 투과율 (모식도): x = log10(파장, m) */
  const DIPS = [[-6.027, 0.35, 0.02], [-5.947, 0.3, 0.02], [-5.854, 0.85, 0.03], [-5.72, 0.8, 0.035], [-5.57, 0.98, 0.05]];
  const bump = (x, c, h, w) => h * Math.exp(-Math.pow((x - c) / w, 2));
  const ss = (a, b, x) => smooth((x - a) / (b - a));
  function trans(x) {
    let t = 0;
    t += 0.88 * ss(-6.7, -6.35, x) * (1 - ss(-5.5, -5.15, x));        // 자외선 끝~근적외선 창
    DIPS.forEach((d) => { t -= bump(x, d[0], d[1], d[2]) * ss(-6.7, -6.35, x); });
    t += bump(x, -5.4, 0.55, 0.05) + bump(x, -4.95, 0.72, 0.09);       // 중적외선 창 (4 µm, 8~13 µm)
    t += 0.45 * ss(-3.05, -2.8, x) * (1 - ss(-2.1, -1.9, x));          // 밀리미터 파
    t += 0.95 * ss(-2.1, -1.9, x) * (1 - ss(0.9, 1.3, x));             // 전파의 창 (약 1 cm ~ 10 m)
    return clamp(t, 0, 0.95);
  }
  const BANDS = [
    { n: '감마선', s: 'γ', a: -12, b: -11, col: '#a855f7', c: -11.5, lam: '0.01 nm 보다 짧음' },
    { n: 'X선', s: 'X', a: -11, b: -8, col: '#6366f1', c: -9.4, lam: '0.01 ~ 10 nm' },
    { n: '자외선', s: 'UV', a: -8, b: -6.4, col: '#8b5cf6', c: -7.2, lam: '10 ~ 400 nm' },
    { n: '가시광선', s: '가시', a: -6.4, b: -6.155, col: '#22c55e', c: -6.26, lam: '400 ~ 700 nm' },
    { n: '적외선', s: 'IR', a: -6.155, b: -3, col: '#ef4444', c: -5.0, lam: '0.7 µm ~ 1 mm' },
    { n: '전파', s: '전파', a: -3, b: 2, col: '#16a34a', c: -0.5, lam: '1 mm 보다 긺' },
  ];
  const bandOf = (x) => { for (let i = 0; i < BANDS.length; i++) if (x < BANDS[i].b) return i; return BANDS.length - 1; };
  const NEED_OK = [0, 1, 2];                        // 위성이 꼭 필요한 파장: 감마선, X선, 자외선
  const absAlt = (x) => (x < -6.7 ? 'ion' : x < -6.5 ? 'ozone' : x > 1 ? 'ion' : 'trop');   // 200 nm보다 짧은 빛(자외선 일부·X선·감마선)은 높은 대기(전리층 높이)에서, 200~300 nm는 오존층에서 흡수
  function lamStr(x) {
    const m = Math.pow(10, x);
    if (m < 1e-9 * 0.95) return f2(m * 1e12) + ' pm';
    if (m < 1e-6 * 0.95) return (m * 1e9 < 10 ? f1(m * 1e9) : f0(m * 1e9)) + ' nm';
    if (m < 1e-3 * 0.95) return (m * 1e6 < 10 ? f1(m * 1e6) : f0(m * 1e6)) + ' µm';
    if (m < 1) return (m * 1e3 < 10 ? f1(m * 1e3) : f0(m * 1e3)) + ' mm';
    return (m < 10 ? f1(m) : f0(m)) + ' m';
  }
  const HUBBLE = { D: 2.4, lam: 550 };
  const SEEING = 0.8;                               // 지상 망원경 상의 번짐 (″)
  const ARC = 206265;
  const thetaRad = (lamNm, D) => 1.22 * lamNm * 1e-9 / D;
  const thetaArc = (lamNm, D) => thetaRad(lamNm, D) * ARC;

  const KOREA = [
    { n: '누리호', ic: '🚀', to: 0, info: '우리 기술로 만든 발사체예요. 2022년 2차 발사에서 위성을 궤도에 올렸고, 2023년 3차 발사도 성공했어요.' },
    { n: '다누리', ic: '🌕', to: 1, info: '우리나라 첫 달 궤도선이에요(2022년 발사). 달 궤도를 돌며 극지방의 영구 음영 지역 등을 촬영해요.' },
    { n: '아리랑', ic: '📷', to: 2, info: '다목적 실용위성이에요. 낮은 궤도(약 500~700 km)에서 지구를 정밀하게 촬영해 지도·재난 감시에 써요.' },
    { n: '천리안 2A·2B', ic: '🌦', to: 3, info: '정지궤도(약 36,000 km) 위성이에요. 2A는 기상, 2B는 해양·환경을 한반도 위에서 계속 관측해요.' },
  ];
  const KOREA_R = [
    { t: '낮은 궤도에서 지구 표면을 정밀하게 촬영해요', id: 2 },
    { t: '우리 기술로 만든 로켓으로 위성을 궤도에 올려요', id: 0 },
    { t: '정지궤도에서 한반도의 기상·해양·환경을 관측해요', id: 3 },
    { t: '달 궤도를 돌며 극지방의 그늘진 곳까지 촬영해요', id: 1 },
  ];
  const ARGS = [
    { label: '새로운 지식', short: '새로운 지식', text: '탐사선이 엔셀라두스 지하 바다의 증거를 찾아 생명 탐색의 범위를 넓혔어요.', bin: 0 },
    { label: '기술 파급', short: '기술 파급', text: '우주용으로 개발한 이미지 센서·소재 기술이 카메라와 의료 영상 등 일상 기술로 이어져요.', bin: 0 },
    { label: '재난 감시', short: '재난 감시', text: '소행성 충돌과 태양 폭풍을 미리 감시해 재난에 대비할 수 있어요.', bin: 0 },
    { label: '위성 통신·내비', short: '통신·내비', text: '위성 통신, 내비게이션, 기상 예보가 우리 일상을 지탱해요.', bin: 0 },
    { label: '높은 비용', short: '높은 비용', text: '탐사선 한 대를 만들어 보내는 데 수천억~수조 원이 들어요.', bin: 1 },
    { label: '우주 쓰레기', short: '우주 쓰레기', text: '수명이 끝난 위성과 로켓 조각이 우주 쓰레기로 쌓여 다른 위성을 위협해요.', bin: 1 },
    { label: '지상 문제 먼저', short: '지상 문제 먼저', text: '기후 변화와 빈곤 같은 지상의 문제에 예산을 먼저 써야 해요.', bin: 1 },
    { label: '성과 공개·평가', short: '성과 공개', text: '비용 대비 성과를 국민에게 공개하고 평가한다면 계속 투자해도 좋아요.', bin: 2 },
    { label: '국제 협력', short: '국제 협력', text: '여러 나라가 비용을 나누는 국제 협력으로 진행한다면 계속 투자해도 좋아요.', bin: 2 },
    { label: '수명 끝 위성 처리', short: '쓰레기 처리', text: '수명이 끝난 위성을 안전하게 처리하는 설계를 의무로 한다면 계속 투자해도 좋아요.', bin: 2 },
  ];
  const STANCE = ['찬성', '반대', '조건부'];

  /* ================= 상태 ================= */
  const S = {
    view: 'map', clock: 0, fade: 0,
    dest: 2, meth: -1, conn: [false, false, false, false, false, false], connM: [-1, -1, -1, -1, -1, -1], fl: null,
    recv: false, recvAt: [],
    reg: 0, stk: [new Set(), new Set(), new Set()], findT: 0,
    lx: -6.26, need: new Set(),
    D: 1.0, lam: 550, sep: 0.4,
    kSel: -1, kLink: {}, kBad: -1, kBadT: 0,
    stance: -1, evid: -1,
    flags: { calcDelay: false, needBox: false, calcRes: false, debBox: false, kDone: false },
    infoOpen: false,
  };
  let game = null;
  const hasF = (n) => (game ? game.has(n) : true);
  const VIEWS = ['map', 'board', 'crater', 'atmo', 'res', 'korea', 'debate'];
  const VIEW_LABEL = { map: '🗺️ 태양계 탐사 지도', board: '🗂 모둠 자료 보드', crater: '🔍 충돌구 헤아리기', atmo: '🌫️ 대기 투과 곡선', res: '🔭 분해능: 지상 vs 우주', korea: '🇰🇷 우리나라 우주개발', debate: '💬 토론 근거 카드' };
  const lvOf = (v) => ({ map: 0, board: 1, crater: 1, atmo: 2, res: 2, korea: 3, debate: 3 }[v]);

  /* ---------- ① 지도 ---------- */
  function LM() {
    if (PHONE) return { mapH: 334, ex: 36, ey: 196, sx: (i) => 98 + i * 68, sy: 196, R: 13, p1: { x: 8, y: 344, w: VW - 16, h: 232 }, p2: { x: 8, y: 584, w: VW - 16, h: 228 } };
    return { mapH: 336, ex: 54, ey: 186, sx: (i) => 168 + i * 116, sy: 186, R: 19, p1: { x: 10, y: 346, w: 478, h: 264 }, p2: { x: 498, y: 346, w: 292, h: 264 } };
  }
  const dRef = (d) => (d.dmin == null ? d.dmax * 0.6 : (d.dmin + d.dmax) / 2);
  const bodyR = (i, L) => L.R * [0.85, 0.75, 1, 1.35, 1.2, 0.8][i];
  function drawBody(i, x, y, R, t) {
    const c = DEST[i].col;
    if (i === 1) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.25);
      const g = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R * 1.2); g.addColorStop(0, '#bfae96'); g.addColorStop(0.6, c); g.addColorStop(1, '#4b4235');
      ctx.fillStyle = g; ctx.beginPath();
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, rr_ = R * (1.15 + 0.22 * Math.sin(k * 2.3 + 1)); ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr_, Math.sin(a) * rr_ * 0.82); }
      ctx.closePath(); ctx.fill(); ctx.restore(); return;
    }
    if (i === 4) {                                   // 토성: 고리 뒤쪽 → 구 → 고리 앞쪽
      ctx.strokeStyle = 'rgba(226,205,150,.8)'; ctx.lineWidth = R * 0.32; ctx.beginPath(); ctx.ellipse(x, y, R * 1.85, R * 0.55, -0.35, Math.PI, TAU); ctx.stroke();
      D.sphere(x, y, R, c, { gloss: true });
      ctx.beginPath(); ctx.ellipse(x, y, R * 1.85, R * 0.55, -0.35, 0, Math.PI); ctx.stroke();
      return;
    }
    D.sphere(x, y, R, c, { gloss: true });
    if (i === 3) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.clip(); ctx.strokeStyle = 'rgba(120,70,30,.45)'; ctx.lineWidth = R * 0.14; [-0.5, -0.15, 0.25, 0.6].forEach((o) => { ctx.beginPath(); ctx.moveTo(x - R, y + R * o); ctx.lineTo(x + R, y + R * o); ctx.stroke(); }); ctx.restore(); }
    if (i === 0) { ctx.fillStyle = 'rgba(100,116,139,.35)'; [[-0.3, -0.1, 0.22], [0.25, 0.25, 0.18], [0.1, -0.45, 0.14]].forEach((q) => { ctx.beginPath(); ctx.arc(x + q[0] * R, y + q[1] * R, q[2] * R, 0, TAU); ctx.fill(); }); }
    if (i === 5) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(x - R * 0.1, y + R * 0.1, R * 0.45, R * 0.35, 0.4, 0, TAU); ctx.fill(); }
  }
  function drawProbe(x, y, sc, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0); ctx.scale(sc, sc);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(-15, -3.5, 8, 7); ctx.fillRect(7, -3.5, 8, 7);
    ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1; ctx.strokeRect(-15, -3.5, 8, 7); ctx.strokeRect(7, -3.5, 8, 7);
    D.shadow(() => { ctx.fillStyle = '#fbbf24'; rr(-6, -5, 12, 10, 3).fill(); }, { blur: 3, y: 1 });
    ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.arc(0, -7, 3.5, Math.PI, TAU); ctx.fill();
    ctx.restore();
  }
  const FLIGHT_DUR = [4.4, 5.6, 5.2, 6.8];
  function bez(p0, c, p1, u) { const a = 1 - u; return { x: a * a * p0.x + 2 * a * u * c.x + u * u * p1.x, y: a * a * p0.y + 2 * a * u * c.y + u * u * p1.y }; }
  function flightGeom(d, L) {
    const sx = L.sx(d), sy = L.sy, R = bodyR(d, L);
    const p0 = { x: L.ex + 14, y: L.ey - 10 }, p1 = { x: sx, y: sy - R - 20 }, c = { x: (p0.x + p1.x) / 2, y: Math.min(p0.y, p1.y) - 110 };
    return { sx, sy, R, p0, p1, c };
  }
  function flightPos(fl, L) {
    const g = flightGeom(fl.d, L), t = fl.t, m = fl.m;
    const tan = (() => { const dx = g.p1.x - g.c.x, dy = g.p1.y - g.c.y, n = Math.hypot(dx, dy) || 1; return { x: dx / n, y: dy / n }; })();
    let pos = { x: g.p0.x, y: g.p0.y }, sc = 1, extra = {};
    const arrive = m === 0 ? 2.4 : m === 3 ? 2.2 : 2.3;
    if (t <= arrive) { pos = bez(g.p0, g.c, g.p1, SciSim.ease.inOutSine(t / arrive)); }
    else if (m === 0) { const s = (t - arrive) * 95; pos = { x: g.p1.x + tan.x * s, y: g.p1.y + tan.y * s }; extra.flash = clamp(1 - (t - arrive) / 0.7, 0, 1); }
    else if (m === 1) { const a = -Math.PI / 2 + (t - arrive) * 2.5, r = g.R + 20; pos = { x: g.sx + Math.cos(a) * r, y: g.sy + Math.sin(a) * r * 0.8 }; }
    else if (m === 2) {
      const k = clamp((t - arrive) / 1.3, 0, 1); pos = { x: g.p1.x, y: lerp(g.p1.y, g.sy - g.R * 0.92, SciSim.ease.outCubic(k)) }; sc = lerp(1, 0.55, k);
      if (t > arrive + 1.4) { extra.rover = (t - arrive - 1.4); }
    } else {
      if (t <= 2.9) { const k = clamp((t - arrive) / 0.7, 0, 1); pos = { x: g.p1.x, y: lerp(g.p1.y, g.sy - g.R * 0.95, k) }; extra.dust = k > 0.9; }
      else if (t <= 5.2) { const u = 1 - SciSim.ease.inOutSine((t - 2.9) / 2.3); pos = bez(g.p0, g.c, g.p1, u); extra.cap = true; }
      else { pos = { x: g.p0.x, y: g.p0.y }; extra.cap = true; }
    }
    return { pos, sc, g, extra };
  }
  function sendProbe() {
    const d = S.dest, m = S.meth;
    if (m < 0) { say('먼저 탐사 방식을 골라 주세요.', true, 2.2); return; }
    const D0 = DEST[d];
    if (m !== D0.meth) { Sound.fail(); say(METH[m].n + (m === 1 ? '은' : '는') + ' 어려워요. ' + (D0.wrong[m] || ''), true, 4.2); S.badT = S.clock; return; }
    S.fl = { d, m, t: 0, dur: FLIGHT_DUR[m] };
    if (!S.conn[d]) { S.conn[d] = true; S.connM[d] = m; }
    Sound.success(); say('성공! ' + D0.probe + ' → ' + D0.n + ' (' + METH[m].n + ')', false, 3.4);
    updateCtl();
  }
  function connCount() { return S.conn.filter(Boolean).length; }
  function drawMap(dt, t) {
    const L = LM();
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, L.mapH, VW, VH - L.mapH);
    spaceBg(0, 0, VW, L.mapH, t);
    // 거리 줄
    const lastX = L.sx(5) + 14;
    ctx.strokeStyle = 'rgba(148,163,184,.35)'; ctx.setLineDash([4, 7]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L.ex, L.sy); ctx.lineTo(lastX, L.sy); ctx.stroke(); ctx.setLineDash([]);
    T(VW - 10, 24, PHONE ? '간격은 줄여서 그렸어요' : '지도의 간격은 실제 거리와 달라요 (줄여서 그렸어요)', 13, '#94a3b8', 'right', 700);
    T(10, 24, '지구에서 먼 순서 →', 13, '#cbd5e1', 'left', 800);
    // 연결 자취
    DEST.forEach((d, i) => {
      if (!S.conn[i]) return;
      const g = flightGeom(i, L);
      ctx.strokeStyle = 'rgba(253,224,71,.4)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath();
      for (let k = 0; k <= 24; k++) { const q = bez(g.p0, g.c, g.p1, k / 24); k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
      ctx.stroke(); ctx.setLineDash([]);
    });
    // 지구
    D.glow(L.ex, L.ey, L.R * 2.4, '#60a5fa', 0.35); D.sphere(L.ex, L.ey, L.R, '#3b82f6', { gloss: true });
    ctx.fillStyle = 'rgba(34,197,94,.7)'; ctx.beginPath(); ctx.ellipse(L.ex - 4, L.ey - 3, L.R * 0.45, L.R * 0.3, 0.4, 0, TAU); ctx.fill();
    T(L.ex, L.ey + L.R + 20, '지구', 13.5, '#e2e8f0', 'center', 800);
    // 목적지
    DEST.forEach((d, i) => {
      const x = L.sx(i), y = L.sy, R = bodyR(i, L), sel = S.dest === i;
      if (sel) { D.ring(x, y, R + 12, t, { color: '#fde047', width: 3 }); }
      drawBody(i, x, y, R, t);
      T(x, y + R + 22, d.n, 14, sel ? '#fde047' : '#e2e8f0', 'center', 800);
      if (!PHONE) T(x, y + R + 40, d.dmin == null ? '~' + dstr(d.dmax) + ' AU' : d.dmin === d.dmax ? dstr(d.dmin) + ' AU' : dstr(d.dmin) + '~' + dstr(d.dmax) + ' AU', 12.5, '#94a3b8', 'center', 700);
      if (S.conn[i]) {
        D.check(x + R * 0.9, y - R * 0.9, 9, 1);
        if (S.connM[i] === 1) {
          ctx.strokeStyle = 'rgba(253,224,71,.55)'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.ellipse(x, y, R + 20, (R + 20) * 0.8, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          const a = -Math.PI / 2 + t * 1.6; drawProbe(x + Math.cos(a) * (R + 20), y + Math.sin(a) * (R + 20) * 0.8, 0.45, 0);
        } else if (S.connM[i] === 2) { ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - R); ctx.lineTo(x, y - R - 12); ctx.stroke(); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(x, y - R - 12); ctx.lineTo(x + 9, y - R - 9); ctx.lineTo(x, y - R - 6); ctx.fill(); }
      }
    });
    // 빛 신호
    const dd = DEST[S.dest], sigS = dRef(dd) * AU_S, per = 1.0 + 0.75 * Math.log10(1 + sigS), u = (t % per) / per;
    const sx = L.sx(S.dest), ax = sx + (L.ex + L.R - sx) * u, ay = L.sy + 0;
    ctx.strokeStyle = 'rgba(253,230,138,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, L.sy + 0); ctx.lineTo(ax, ay); ctx.stroke();
    D.glow(ax, ay, 12, '#fde68a', 0.9); D.sphere(ax, ay, 4, '#fff7c2', { gloss: false });
    // 비행
    if (S.fl) {
      const fl = S.fl; fl.t += dt;
      const r = flightPos(fl, L), g = r.g;
      if (!fl.trail) fl.trail = [];
      if (!RM && fl.t < fl.dur && (!fl.trail.length || Math.hypot(fl.trail[fl.trail.length - 1].x - r.pos.x, fl.trail[fl.trail.length - 1].y - r.pos.y) > 5)) fl.trail.push({ x: r.pos.x, y: r.pos.y });
      ctx.strokeStyle = 'rgba(253,224,71,.7)'; ctx.lineWidth = 2; ctx.beginPath(); fl.trail.forEach((q, k) => (k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
      if (r.extra.flash) { D.glow(g.sx, g.sy, 60, '#ffffff', 0.7 * r.extra.flash); }
      if (r.extra.dust && Math.random() < 0.5) parts.emit({ x: g.sx + (Math.random() - 0.5) * 14, y: g.sy - g.R * 0.95, vx: (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 30, life: 0.7, size: 2.5, color: '#d6c8a8', gravity: 40 });
      if (r.extra.rover != null) { const rx = g.sx + Math.sin(r.extra.rover * 1.6) * g.R * 0.45, ry = g.sy - g.R * 0.82; ctx.fillStyle = '#fde047'; rr(rx - 5, ry - 4, 10, 5, 2).fill(); ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(rx - 3, ry + 2, 1.8, 0, TAU); ctx.arc(rx + 3, ry + 2, 1.8, 0, TAU); ctx.fill(); }
      if (r.extra.cap) { D.glow(r.pos.x, r.pos.y, 14, '#fb923c', 0.85); D.sphere(r.pos.x, r.pos.y, 4.5, '#fed7aa', { gloss: false }); }
      else if (!(r.extra.rover != null)) drawProbe(r.pos.x, r.pos.y, r.sc * (PHONE ? 0.8 : 1), 0);
      if (fl.m === 3 && !fl.landed && fl.t > 5.2) { fl.landed = true; parts.burst(L.ex, L.ey, { count: 22, speed: 120, colors: ['#fde047', '#fb923c', '#fff'] }); }
      if (fl.t >= fl.dur) S.fl = null;
    }
    // 패널 1: 목적지 정보
    const p1 = L.p1, p2 = L.p2, ds = DEST[S.dest];
    panel(p1.x, p1.y, p1.w, p1.h, { fill: 'rgba(255,255,255,.96)' });
    T(p1.x + 14, p1.y + 26 * FS, ds.ic + ' ' + ds.n + ' 탐사', 16, '#1e293b', 'left', 800);
    let by = drawWrap(p1.x + 14, p1.y + 52 * FS, '목표: ' + ds.goal, p1.w - 28, 13.5, { color: '#334155' });
    by += 24 * FS;
    const dtxt = ds.dmin == null ? '지구에서 최대 약 ' + dstr(ds.dmax) + ' AU' : ds.dmin === ds.dmax ? (ds.dmax < 0.01 ? '약 ' + dstr(ds.dmax) + ' AU (38만 km)' : '약 ' + dstr(ds.dmax) + ' AU') : dstr(ds.dmin) + ' ~ ' + dstr(ds.dmax) + ' AU';
    T(p1.x + 14, by, '거리 d  ' + dtxt, 14, '#1d4ed8', 'left', 800);
    const ttxt = ds.dmin == null ? '최대 약 ' + tstr(ds.dmax * AU_S) : ds.dmin === ds.dmax ? '약 ' + tstr(ds.dmax * AU_S) : tstr(ds.dmin * AU_S) + ' ~ ' + tstr(ds.dmax * AU_S);
    T(p1.x + 14, by + 24 * FS, '빛 신호 편도 t = d / c  ' + ttxt, 14, '#b45309', 'left', 800);
    drawWrap(p1.x + 14, by + 46 * FS, '(1 AU = 1.5×10⁸ km, c = 3.0×10⁵ km/s → 빛은 1 AU를 500초에 가요)', p1.w - 28, 12.5, { color: '#64748b' });
    if (S.conn[S.dest]) T(p1.x + 14, p1.y + p1.h - 12, '✔ ' + ds.probe + ' · ' + METH[ds.meth].n, 13.5, '#15803d', 'left', 800);
    // 패널 2: 방식 카드
    panel(p2.x, p2.y, p2.w, p2.h, { fill: 'rgba(255,255,255,.96)' });
    if (S.meth < 0) {
      T(p2.x + 14, p2.y + 26 * FS, '🛠 탐사 방식 4가지', 15, '#1e293b', 'left', 800);
      METH.forEach((m, i) => T(p2.x + 14, p2.y + (52 + i * 24) * FS, m.ic + ' ' + m.n, 14, '#334155', 'left', 800));
      drawWrap(p2.x + 14, p2.y + (52 + 4 * 24 + 8) * FS, '오른쪽 버튼에서 방식을 골라 보세요. 보이저 1호는 약 165 AU(편도 약 23시간)에 있어요.', p2.w - 28, 12.5, { color: '#64748b' });
    } else {
      T(p2.x + 14, p2.y + 26 * FS, METH[S.meth].ic + ' ' + METH[S.meth].n, 16, '#1e293b', 'left', 800);
      drawWrap(p2.x + 14, p2.y + 52 * FS, METH[S.meth].d, p2.w - 28, 13.5, { color: '#334155' });
    }
  }
  function mapDown(p) {
    const L = LM();
    for (let i = 0; i < 6; i++) {
      const x = L.sx(i), y = L.sy;
      if (Math.hypot(p.x - x, p.y - y) < Math.max(30, bodyR(i, L) + 12)) { S.dest = i; Sound.click(); updateCtl(); return false; }
    }
    return false;
  }

  /* ---------- ② 모둠 자료 보드 ---------- */
  function LB() {
    if (PHONE) {
      const bw = (VW - 24) / 2;
      return { grid: { x: 8, y: 8, w: VW - 16, h: 342, cols: 2, cardH: 52, gap: 6 }, detail: { x: 8, y: 360, w: VW - 16, h: 112 }, bins: [{ x: 8, y: 482, w: bw, h: 290 }, { x: 16 + bw, y: 482, w: bw, h: 290 }] };
    }
    return { grid: { x: 10, y: 10, w: 780, h: 208, cols: 4, cardH: 64, gap: 8 }, detail: { x: 10, y: 228, w: 780, h: 100 }, bins: [{ x: 10, y: 340, w: 385, h: 270 }, { x: 405, y: 340, w: 385, h: 270 }] };
  }
  const cB = makeClassifier({
    items: CARDS.map((c) => ({ label: c.label, chip: c.label, sub: c.sub, text: c.text, bin: c.bin, mine: !!c.mine, open: false, closedLabel: '?' })),
    bins: [{ label: '🌍 행성·위성·태양 탐사선', sub: '', color: '#2563eb' }, { label: '☄️ 소천체 탐사선', sub: '', color: '#d97706' }],
    chipCols: PHONE ? 1 : 2, minRows: PHONE ? 6 : 4,
    layout: LB,
    placeholder: '카드를 눌러 보세요. 파란 카드는 우리 모둠 자료예요. 눌러서 열어 봐요.',
    detailFn: (it) => ({ title: it.label + ' · ' + it.sub, body: it.text }),
    onOpen(it) {
      if (it.mine) { it.open = true; Sound.success(); C_burst(it); updateCtl(); }
      else say(S.recv ? '조금만 기다려요!' : '다른 모둠 자료는 📡 버튼으로 받아요.', true, 2.2);
    },
    onChange() { updateCtl(); },
  });
  function C_burst(it) { parts.burst(it.x + it.w / 2, it.y + it.h / 2, { count: 14, speed: 120, size: 3 }); }
  function boardReset() {
    cB.reset(); S.recv = false; S.recvAt = [];
    cB.items.forEach((it) => { it.open = false; it.flip = 0; });
  }
  function boardRecv() {
    if (S.recv) return;
    if (!cB.items.filter((i) => i.mine).every((i) => i.open)) { say('먼저 파란 카드(우리 모둠) 세 장을 열어 보세요.', true, 2.6); return; }
    S.recv = true; Sound.success();
    let k = 0; cB.items.forEach((it) => { if (!it.open) { it.openAt = performance.now() + k * 120; k++; } });
    say('다른 모둠의 자료가 도착했어요!', false, 2.6); updateCtl();
  }
  function boardOpened() { return cB.items.filter((i) => i.mine && i.open).length; }
  function boardStep() {
    const now = performance.now();
    cB.items.forEach((it) => { if (it.openAt && now >= it.openAt) { it.open = true; it.openAt = 0; Sound.tick && Sound.tick(); } });
  }
  function drawBoard(dt, t) {
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    boardStep();
    cB.draw(dt);
  }

  /* ---------- ② 충돌구 헤아리기 ---------- */
  function LC() {
    if (PHONE) return { img: { x: 8, y: 8, s: 464 }, tb: { x: 8, y: 480, w: VW - 16, h: 190 }, tx: { x: 8, y: 678, w: VW - 16, h: 134 } };
    return { img: { x: 10, y: 10, s: 486 }, tb: { x: 506, y: 10, w: 284, h: 486 }, tx: { x: 10, y: 506, w: 780, h: 104 } };
  }
  const regCount = (i) => S.stk[i].size;
  function drawCrater(dt, t) {
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    const L = LC(), r = S.reg, R = REGIONS[r], I = L.img, sc = I.s / CRATER_PX;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(I.x - 3, I.y - 3, I.s + 6, I.s + 6, 12).fill(); }, { blur: 8, y: 2 });
    ctx.save(); rr(I.x, I.y, I.s, I.s, 10).clip(); ctx.drawImage(R.cv, I.x, I.y, I.s, I.s);
    // 번호 스티커
    let k = 0;
    R.bigIdx.forEach((ci) => {
      const c = R.list[ci];
      const X = I.x + c.x * I.s, Y = I.y + c.y * I.s;
      if (S.stk[r].has(ci)) {
        k++;
        const num = Array.from(S.stk[r]).indexOf(ci) + 1;
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(X, Y, c.r * I.s + 2, 0, TAU); ctx.stroke();
        D.sphere(X, Y, 10, '#f97316', { gloss: false, text: String(num), textScale: num > 9 ? 0.95 : 1.15 });
      } else if (S.findT > 0) {
        D.ring(X, Y, c.r * I.s + 5, t * 1.5, { color: '#22d3ee', width: 3 });
      }
    });
    ctx.restore();
    T(I.x + 10, I.y + 24, REG[r].n + ' (' + REG[r].tag + ') · 100 km × 100 km', 13.5, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.65)', strokeWidth: 4 });
    // 표
    const tb = L.tb;
    panel(tb.x, tb.y, tb.w, tb.h, { fill: 'rgba(255,255,255,.97)' });
    T(tb.x + 12, tb.y + 24 * FS, '지름 5 km 이상 충돌구 수', 14, '#1e293b', 'left', 800);
    T(tb.x + 12, tb.y + 44 * FS, '(100 km × 100 km = 10⁴ km² 당)', 12.5, '#64748b', 'left', 700);
    const rowH = PHONE ? 34 : 60, y0 = tb.y + 56 * FS;
    REG.forEach((g, i) => {
      const yy = y0 + i * rowH, sel = i === r;
      if (sel) { ctx.fillStyle = 'rgba(14,165,233,.12)'; rr(tb.x + 6, yy - 2, tb.w - 12, rowH - 4, 8).fill(); }
      T(tb.x + 14, yy + (PHONE ? 22 : 20), g.n, 14, '#1e293b', 'left', 800);
      const n = regCount(i), ok = n === g.big;
      T(tb.x + tb.w - 14, yy + (PHONE ? 22 : 20), n + '개' + (ok ? ' ✔' : ''), 14.5, ok ? '#15803d' : '#b45309', 'right', 800);
      if (!PHONE) {
        const bx = tb.x + 14, bw = tb.w - 28, by = yy + 32;
        ctx.fillStyle = '#e2e8f0'; rr(bx, by, bw, 10, 5).fill();
        const wv = bw * n / 36; if (wv > 0.5) { ctx.save(); rr(bx, by, bw, 10, 5).clip(); ctx.fillStyle = ok ? '#22c55e' : '#f59e0b'; ctx.fillRect(bx, by, wv, 10); ctx.restore(); }
      }
    });
    if (!PHONE) T(tb.x + 14, y0 + 3 * rowH + 14, '막대: 36개 눈금 (꽉 차면 36개)', 12.5, '#64748b', 'left', 700);
    const allOk = REG.every((g, i) => regCount(i) === g.big);
    if (allOk) {
      T(tb.x + 14, tb.y + tb.h - (PHONE ? 38 : 58), '오래된 표면 순서 (상대 연령 약 36 : 9 : 1)', 13, '#1e293b', 'left', 800);
      T(tb.x + 14, tb.y + tb.h - (PHONE ? 14 : 30), '달 고지 > 달 바다 > 올림푸스 사면', 14, '#c2410c', 'left', 800);
    }
    const tx = L.tx;
    panel(tx.x, tx.y, tx.w, tx.h, { fill: 'rgba(255,255,255,.97)' });
    const km = I.s / 100, ly = tx.y + tx.h - 20;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx.x + 16, ly); ctx.lineTo(tx.x + 16 + 20 * km, ly); ctx.stroke();
    T(tx.x + 16 + 20 * km + 8, ly + 5, '= 20 km', 13, '#334155', 'left', 800);
    const rx = tx.x + 16 + 20 * km + (PHONE ? 100 : 100);
    ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(rx, ly, 2.5 * km, 0, TAU); ctx.stroke();
    T(rx + 2.5 * km + 8, ly + 5, PHONE ? '= 5 km' : '= 지름 5 km (이보다 큰 것만 세요)', 13, '#a16207', 'left', 800);
    drawWrap(tx.x + 14, tx.y + 26 * FS, '충돌구를 눌러 번호 스티커를 붙여요. 지름 5 km 이상만 세요. 같은 면적에서 충돌구가 많을수록 표면이 만들어진 지 오래된 곳이에요. 절대 나이는 아폴로·창어 5호가 가져온 달 시료로 눈금을 맞춰요.', tx.w - 28, 13.5, { color: '#334155' });
  }
  function craterDown(p) {
    const L = LC(), I = L.img, R = REGIONS[S.reg];
    // 표의 행을 눌러 구역 바꾸기
    const tb = L.tb, rowH = PHONE ? 34 : 60, y0 = tb.y + 56 * FS;
    if (p.x >= tb.x && p.x <= tb.x + tb.w) for (let i = 0; i < 3; i++) if (p.y >= y0 + i * rowH - 2 && p.y <= y0 + (i + 1) * rowH - 4) { setReg(i); return false; }
    if (p.x < I.x || p.x > I.x + I.s || p.y < I.y || p.y > I.y + I.s) return false;
    const ux = (p.x - I.x) / I.s, uy = (p.y - I.y) / I.s;
    let best = -1, bd = 1e9;
    R.list.forEach((c, i) => { const d = Math.hypot(c.x - ux, c.y - uy); if (d <= c.r + 0.012 && d < bd) { bd = d; best = i; } });
    if (best < 0) return false;
    const c = R.list[best];
    if (!c.big) { say('이 충돌구는 지름이 5 km보다 작아서 세지 않아요.', true, 2.4); Sound.fail(); return false; }
    const set = S.stk[S.reg];
    if (set.has(best)) set.delete(best); else { set.add(best); Sound.click(); parts.burst(I.x + c.x * I.s, I.y + c.y * I.s, { count: 8, speed: 70, size: 2.5, colors: ['#fde047', '#f97316'] }); }
    updateCtl();
    return false;
  }
  function setReg(i) { if (S.reg !== i) { S.reg = i; S.findT = 0; Sound.click(); updateCtl(); } }

  /* ---------- ③ 대기 투과 곡선 ---------- */
  function LA() {
    if (PHONE) return { g: { x: 8, y: 8, w: VW - 16, h: 252 }, d: { x: 8, y: 268, w: VW - 16, h: 296 }, i: { x: 8, y: 572, w: VW - 16, h: 200 } };
    return { g: { x: 10, y: 8, w: 780, h: 262 }, d: { x: 10, y: 280, w: 508, h: 330 }, i: { x: 528, y: 280, w: 262, h: 330 } };
  }
  function graphGeom(g) {
    const px0 = g.x + (PHONE ? 40 : 46), pw = g.w - (px0 - g.x) - 14, py0 = g.y + 66, ph = g.h - 66 - 36;
    return { px0, pw, py0, ph, X: (x) => px0 + (x + 12) / 14 * pw, Y: (v) => py0 + ph - v * ph };
  }
  const beamColor = (x) => {
    const b = bandOf(x);
    if (b === 3) { const f = clamp((x - -6.4) / (-6.155 - -6.4), 0, 1); return 'hsl(' + Math.round(270 - 270 * f) + ',85%,55%)'; }
    return BANDS[b].col;
  };
  let sparkAcc = 0;
  function drawAtmo(dt, t) {
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    const L = LA(), g = L.g, G = graphGeom(g), T0 = trans(S.lx), bi = bandOf(S.lx);
    panel(g.x, g.y, g.w, g.h, { fill: 'rgba(255,255,255,.97)' });
    T(g.x + 12, g.y + 22 * FS, '지구 대기의 투과율 (모식도)', 14.5, '#1e293b', 'left', 800);
    T(g.x + g.w - 12, g.y + 22 * FS, '파장 ' + lamStr(S.lx), 14, '#c2410c', 'right', 800);
    // 파장대 띠
    BANDS.forEach((b, i) => {
      const x1 = G.X(b.a), x2 = G.X(b.b);
      ctx.fillStyle = b.col; ctx.globalAlpha = i === bi ? 0.95 : 0.55; ctx.fillRect(x1, g.y + 32 * FS, x2 - x1, 20 * FS); ctx.globalAlpha = 1;
      if (i === 3) { const gr = ctx.createLinearGradient(x1, 0, x2, 0); gr.addColorStop(0, '#7c3aed'); gr.addColorStop(0.25, '#3b82f6'); gr.addColorStop(0.5, '#22c55e'); gr.addColorStop(0.75, '#eab308'); gr.addColorStop(1, '#ef4444'); ctx.fillStyle = gr; ctx.fillRect(x1, g.y + 32 * FS, x2 - x1, 20 * FS); }
      if (S.need.has(i)) { ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 3; ctx.strokeRect(x1 + 1, g.y + 32 * FS, x2 - x1 - 2, 20 * FS); }
      const lab = PHONE ? b.s : b.n;
      if (i === 3) T((x1 + x2) / 2, g.y + 32 * FS - 4, PHONE ? '' : '가시광선', 12.5, '#334155', 'center', 800);
      else T((x1 + x2) / 2, g.y + 32 * FS + 14 * FS, lab, PHONE ? 12 : 13, '#fff', 'center', 800, { stroke: 'rgba(15,23,42,.35)', strokeWidth: 3 });
    });
    // 축
    ctx.strokeStyle = 'rgba(100,116,139,.3)'; ctx.lineWidth = 1;
    [0, 0.5, 1].forEach((v) => { ctx.beginPath(); ctx.moveTo(G.px0, G.Y(v)); ctx.lineTo(G.px0 + G.pw, G.Y(v)); ctx.stroke(); T(G.px0 - 6, G.Y(v) + 5, f0(v * 100) + '%', 12.5, '#475569', 'right', 700); });
    [[-12, '1 pm'], [-9, '1 nm'], [-6, '1 µm'], [-3, '1 mm'], [0, '1 m'], [2, '100 m']].forEach(([x, s]) => { ctx.strokeStyle = 'rgba(100,116,139,.22)'; ctx.beginPath(); ctx.moveTo(G.X(x), G.py0); ctx.lineTo(G.X(x), G.py0 + G.ph); ctx.stroke(); T(G.X(x), g.y + g.h - 12, s, 12.5, '#475569', 'center', 700); });
    // 곡선
    const N = 280; ctx.beginPath(); ctx.moveTo(G.px0, G.Y(0));
    for (let i = 0; i <= N; i++) { const x = -12 + 14 * i / N; ctx.lineTo(G.X(x), G.Y(trans(x))); }
    ctx.lineTo(G.px0 + G.pw, G.Y(0)); ctx.closePath();
    const fg = ctx.createLinearGradient(0, G.py0, 0, G.py0 + G.ph); fg.addColorStop(0, 'rgba(56,189,248,.55)'); fg.addColorStop(1, 'rgba(56,189,248,.12)'); ctx.fillStyle = fg; ctx.fill();
    ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let i = 0; i <= N; i++) { const x = -12 + 14 * i / N; const px = G.X(x), py = G.Y(trans(x)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    // 현재 파장
    const mx = G.X(S.lx), my = G.Y(T0);
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(mx, g.y + 54 * FS); ctx.lineTo(mx, G.py0 + G.ph); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(mx, my, 7, '#dc2626', { gloss: false, outline: '#fff', outlineWidth: 2 });
    T(clamp(mx, g.x + 90, g.x + g.w - 60), Math.max(G.py0 + 14, my - 12), 'T = ' + f0(T0 * 100) + '%', 13.5, '#7f1d1d', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
    // ---- 빛줄기 그림 ----
    const d = L.d;
    ctx.save(); rr(d.x, d.y, d.w, d.h, 14).clip();
    const yIon = d.y + d.h * 0.3, yOz = d.y + d.h * 0.52, yTr = d.y + d.h * 0.74, yG = d.y + d.h * 0.88;
    const sg = ctx.createLinearGradient(0, d.y, 0, yG);
    sg.addColorStop(0, '#0b1230'); sg.addColorStop(0.2, '#101a3d'); sg.addColorStop(0.3, '#2b4a8c'); sg.addColorStop(0.6, '#6aa7e0'); sg.addColorStop(1, '#cfe8ff');
    ctx.fillStyle = sg; ctx.fillRect(d.x, d.y, d.w, d.h);
    STARS.slice(0, 40).forEach((s) => { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 1.4 + s[3]) * 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(d.x + s[0] * d.w, d.y + s[1] * d.h * 0.28, s[2] * 0.8, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#4b7a3c'; ctx.fillRect(d.x, yG, d.w, d.h - (yG - d.y));
    ctx.fillStyle = '#35592b'; ctx.fillRect(d.x, yG, d.w, 5);
    // 층
    [[yIon, '전리층 (약 100 km)', 'rgba(167,139,250,.65)'], [yOz, '오존층 (약 30 km)', 'rgba(52,211,153,.65)'], [yTr, '대류권 (약 10 km 이하): 수증기', 'rgba(255,255,255,.7)']].forEach(([yy, s, c]) => {
      ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(d.x, yy); ctx.lineTo(d.x + d.w, yy); ctx.stroke(); ctx.setLineDash([]);
      T(d.x + 8, yy - 6, s, 12.5, '#fff', 'left', 800, { stroke: 'rgba(15,23,42,.55)', strokeWidth: 3 });
    });
    // 별과 빛줄기
    const bx1 = d.x + d.w * 0.3, bx2 = d.x + d.w * 0.76, top = d.y + 26, col = beamColor(S.lx);
    T(d.x + d.w * 0.53, d.y + 17, '✦ 먼 천체에서 온 빛', 13, '#fde68a', 'center', 800);
    const abs = T0 < 0.12, aY = absAlt(S.lx) === 'ion' ? yIon : absAlt(S.lx) === 'ozone' ? yOz : yTr - 8;
    const yEnd = abs ? aY : yG - 34;
    const grad = ctx.createLinearGradient(0, top, 0, yEnd);
    const aEnd = abs ? 0.05 : Math.max(0.12, T0);
    grad.addColorStop(0, col); grad.addColorStop(1, col);
    ctx.lineCap = 'round';
    // 우주 망원경 쪽 (항상 도착)
    ctx.strokeStyle = col; ctx.globalAlpha = 0.9; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx2, top); ctx.lineTo(bx2, d.y + d.h * 0.2); ctx.stroke();
    ctx.globalAlpha = 0.28; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(bx2, top); ctx.lineTo(bx2, d.y + d.h * 0.2); ctx.stroke(); ctx.globalAlpha = 1;
    // 지상 쪽: 위에서 아래로 점점 약해짐
    const seg = 24;
    for (let k = 0; k < seg; k++) {
      const y1 = top + (yEnd - top) * k / seg, y2 = top + (yEnd - top) * (k + 1) / seg, f = (k + 0.5) / seg;
      // 지나온 층마다 투과율을 곱한 것처럼: 위쪽은 밝고 흡수 높이에서 사라져요
      const a = abs ? 0.95 * (1 - Math.pow(f, 2.2)) + 0.03 : 0.95 * (1 - f * (1 - aEnd));
      ctx.strokeStyle = col; ctx.globalAlpha = Math.max(0, a); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx1, y1); ctx.lineTo(bx1, y2 + 0.5); ctx.stroke();
      ctx.globalAlpha = Math.max(0, a * 0.3); ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(bx1, y1); ctx.lineTo(bx1, y2 + 0.5); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 흘러가는 알갱이
    ctx.fillStyle = '#fff';
    for (let k = 0; k < 7; k++) { const f = ((t * 0.5 + k / 7) % 1); const yy = top + (yEnd - top) * f; ctx.globalAlpha = (abs ? 1 - f : 1 - f * (1 - aEnd)) * 0.9; ctx.beginPath(); ctx.arc(bx1, yy, 2.4, 0, TAU); ctx.fill(); const y3 = top + (d.y + d.h * 0.2 - top) * f; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(bx2, y3, 2.4, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (abs && !RM) {
      sparkAcc += dt * 22;
      while (sparkAcc > 1) { sparkAcc -= 1; parts.emit({ x: bx1 + (Math.random() - 0.5) * 16, y: aY, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 60, life: 0.55, size: 2.4, color: '#fde68a', drag: 2, shape: 'star' }); }
    }
    if (abs) { D.label(bx1, aY - 16, '흡수!', { bg: '#dc2626', size: 13, pad: 8 }); }
    else if (T0 < 0.9) T(bx1 + 14, yTr + 18, '일부만 도달', 12.5, '#fff', 'left', 800, { stroke: 'rgba(15,23,42,.6)', strokeWidth: 3 });
    // 망원경
    ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(bx1, yG - 6, 20, Math.PI, TAU); ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#334155'; ctx.fillRect(bx1 - 4, yG - 28, 8, 20);
    T(bx1, yG + 20, '지상 망원경', 13, '#fff', 'center', 800);
    const sy_ = d.y + d.h * 0.2;
    drawProbe(bx2, sy_ + 14, 1.3, 0);
    T(bx2, sy_ + 44, '우주 망원경', 13, '#fff', 'center', 800);
    ctx.restore();
    // ---- 정보 ----
    const I = L.i;
    panel(I.x, I.y, I.w, I.h, { fill: 'rgba(255,255,255,.97)' });
    const b = BANDS[bi];
    T(I.x + 12, I.y + 26 * FS, b.n + ' · ' + b.lam, 14.5, '#1e293b', 'left', 800);
    T(I.x + 12, I.y + 50 * FS, '대기 투과율 T = ' + f0(T0 * 100) + ' %', 15, T0 < 0.12 ? '#b91c1c' : T0 < 0.5 ? '#b45309' : '#15803d', 'left', 800);
    const verdict = T0 < 0.12 ? '지상까지 거의 못 와요 → 우주 망원경이 필요해요' : T0 < 0.5 ? '대기의 창이 좁아 일부만 지상에 와요' : '지상에서도 관측할 수 있어요';
    let yy = drawWrap(I.x + 12, I.y + 76 * FS, verdict, I.w - 24, 13.5, { color: T0 < 0.12 ? '#b91c1c' : T0 < 0.5 ? '#92400e' : '#166534' });
    yy += 28 * FS;
    T(I.x + 12, yy, '대표 우주 망원경', 13.5, '#475569', 'left', 800);
    const TEL = [['허블', '가시광선·자외선', [2, 3]], ['제임스 웹', '적외선', [4]], ['찬드라', 'X선', [1]], ['페르미', '감마선', [0]], ['아리랑 등', '지구 관측(가시·적외)', [3, 4]]];
    TEL.forEach((q, i) => { const on = q[2].includes(bi); T(I.x + 12, yy + (22 + i * 21) * FS, (on ? '▶ ' : '· ') + q[0] + ' (' + q[1] + ')', PHONE ? 12.5 : 12.5, on ? '#0369a1' : '#64748b', 'left', on ? 800 : 700); });
  }
  function atmoDown(p) {
    const G = graphGeom(LA().g);
    if (p.y >= LA().g.y && p.y <= LA().g.y + LA().g.h && p.x >= G.px0 - 4 && p.x <= G.px0 + G.pw + 4) { atmoSet(-12 + 14 * (p.x - G.px0) / G.pw); return true; }
    return false;
  }
  function atmoMove(p) { const G = graphGeom(LA().g); atmoSet(-12 + 14 * (p.x - G.px0) / G.pw); }
  function atmoSet(x) { S.lx = clamp(Math.round(x * 100) / 100, -12, 2); setSlider($('#sLam'), $('#oLam'), S.lx, (v) => lamStr(v)); }

  /* ---------- ③ 분해능 ---------- */
  function LR() {
    if (PHONE) return { a: { x: 8, y: 8, w: 228, h: 252 }, b: { x: 244, y: 8, w: 228, h: 252 }, p: { x: 8, y: 270, w: VW - 16, h: 502 } };
    return { a: { x: 10, y: 8, w: 385, h: 300 }, b: { x: 405, y: 8, w: 385, h: 300 }, p: { x: 10, y: 318, w: 780, h: 292 } };
  }
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sci = (x) => { if (!(x > 0)) return '0'; let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e); if (Math.round(m * 10) / 10 >= 10) { m /= 10; e += 1; } return (Math.round(m * 10) / 10).toFixed(1) + '×10' + String(e).split('').map((c) => SUP[c] || c).join(''); };
  function starPair(cx, cy, pxPerArc, fwhmArc, sep) {
    const sig = Math.max(0.9, fwhmArc * pxPerArc / 2.355), off = sep * pxPerArc / 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    [-1, 1].forEach((s) => {
      const x = cx + s * off, gr = ctx.createRadialGradient(x, cy, 0, x, cy, sig * 3.4);
      for (let k = 0; k <= 8; k++) { const r = k / 8 * 3.4; gr.addColorStop(k / 8, 'rgba(190,215,255,' + (0.95 * Math.exp(-r * r / 2)).toFixed(3) + ')'); }
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, cy, sig * 3.4, 0, TAU); ctx.fill();
    });
    ctx.restore();
  }
  function insetDraw(box, title, fwhm, sub, col) {
    panel(box.x, box.y, box.w, box.h, { fill: 'rgba(255,255,255,.97)' });
    T(box.x + box.w / 2, box.y + 22 * FS, title, 14, '#1e293b', 'center', 800);
    const r = Math.min(box.w, box.h - 78 * FS) / 2 - 10, cx = box.x + box.w / 2, cy = box.y + 36 * FS + r + 4, pxA = (2 * r) / 2.4;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, '#0f1a3a'); g.addColorStop(1, '#050816'); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    STARS.slice(0, 40).forEach((s) => { ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.fillRect(cx - r + s[0] * 2 * r, cy - r + s[1] * 2 * r, 1.2, 1.2); }); ctx.globalAlpha = 1;
    starPair(cx, cy, pxA, fwhm, S.sep);
    ctx.restore();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    // 눈금: 1″
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - r + 12, cy + r - 14); ctx.lineTo(cx - r + 12 + pxA, cy + r - 14); ctx.stroke();
    T(cx - r + 12 + pxA + 6, cy + r - 9, '1″', 12.5, '#fff', 'left', 800);
    const res = S.sep >= 0.85 * fwhm;
    T(cx, box.y + box.h - 30 * FS, '상의 폭 약 ' + (fwhm < 0.1 ? f3(fwhm) : f2(fwhm)) + '″', 13.5, '#475569', 'center', 800);
    T(cx, box.y + box.h - 10 * FS, res ? '✅ 두 별이 갈라져 보여요' : '❌ 하나로 뭉쳐 보여요', 14, res ? '#15803d' : '#b91c1c', 'center', 800);
    return res;
  }
  function drawRes(dt, t) {
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    const L = LR(), th = thetaArc(S.lam, S.D), fg = Math.sqrt(SEEING * SEEING + th * th);
    insetDraw(L.a, '지상 망원경 (대기 요동)', fg, '', '#64748b');
    insetDraw(L.b, '우주 망원경 (대기 밖)', th, '', '#0284c7');
    const p = L.p; panel(p.x, p.y, p.w, p.h, { fill: 'rgba(255,255,255,.97)' });
    T(p.x + 14, p.y + 28 * FS, '분해능 θ = 1.22 λ / D', 16, '#1e293b', 'left', 800);
    T(p.x + 14, p.y + 54 * FS, 'λ = ' + f0(S.lam) + ' nm = ' + sci(S.lam * 1e-9) + ' m,   D = ' + f1(S.D) + ' m', 14, '#334155', 'left', 800);
    T(p.x + 14, p.y + 80 * FS, 'θ = ' + sci(thetaRad(S.lam, S.D)) + ' rad', 14.5, '#1d4ed8', 'left', 800);
    T(p.x + 14, p.y + 106 * FS, '1 rad = 206265″ 이므로  θ = ' + (th < 0.1 ? f3(th) : f2(th)) + '″', 14.5, '#c2410c', 'left', 800);
    // 막대 비교 (같은 눈금, 0 ~ 1.0″)
    const bx = p.x + 14, bw = p.w - 28, by = p.y + 140 * FS, mx = 1.0;
    T(bx, by - 6, '상의 폭 비교 (눈금 0 ~ 1.0″)', 13, '#475569', 'left', 800);
    [[fg, '지상 (대기 요동 ' + SEEING + '″ 포함)', '#64748b'], [th, '우주 (회절 한계)', '#0284c7']].forEach((q, i) => {
      const yy = by + 8 + i * 36 * FS;
      ctx.fillStyle = '#e2e8f0'; rr(bx, yy, bw, 16, 8).fill();
      const w2 = bw * clamp(q[0] / mx, 0, 1); ctx.save(); rr(bx, yy, bw, 16, 8).clip(); ctx.fillStyle = q[2]; ctx.fillRect(bx, yy, w2, 16); ctx.restore();
      T(bx + 6, yy + 33 * FS - 4, q[1] + '  ' + (q[0] < 0.1 ? f3(q[0]) : f2(q[0])) + '″', 13, '#334155', 'left', 700);
    });
    const ny = by + 8 + 2 * 36 * FS + 14 * FS;
    drawWrap(p.x + 14, ny, '지상에서는 망원경을 아무리 크게 만들어도 대기 요동 때문에 실제 상은 약 0.5~1″ 이하로 선명해지기 어려워요. 우주 망원경은 대기 밖에 있어 이론적 한계 θ에 가깝게 볼 수 있어요.', p.w - 28, 13.5, { color: '#334155' });
  }

  /* ---------- ④ 우리나라 우주개발 ---------- */
  function LK() {
    if (PHONE) return { m: { x: 8, y: 8, w: VW - 16, h: 350 }, lc: { x: 14, w: 214, h: 62, y0: 46, gap: 14 }, rc: { x: 248, w: 218, h: 74, y0: 46, gap: 4 }, inf: { x: 8, y: 366, w: VW - 16, h: 84 }, o: { x: 8, y: 458, w: VW - 16, h: 354 } };
    return { m: { x: 10, y: 8, w: 780, h: 300 }, lc: { x: 24, w: 232, h: 52, y0: 48, gap: 10 }, rc: { x: 540, w: 236, h: 52, y0: 48, gap: 10 }, inf: { x: 276, y: 56, w: 244, h: 236 }, o: { x: 10, y: 318, w: 780, h: 292 } };
  }
  const lcRect = (L, i) => ({ x: L.lc.x, y: L.m.y + L.lc.y0 + i * (L.lc.h + L.lc.gap), w: L.lc.w, h: L.lc.h });
  const rcRect = (L, i) => ({ x: L.rc.x, y: L.m.y + L.rc.y0 + i * (L.rc.h + L.rc.gap), w: L.rc.w, h: L.rc.h });
  const korDone = () => Object.keys(S.kLink).length;
  const korRight = (id) => KOREA_R.findIndex((r) => r.id === id);
  let lastKInfo = -1;
  function drawKorea(dt, t) {
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    const L = LK(), m = L.m;
    panel(m.x, m.y, m.w, m.h, { fill: 'rgba(255,255,255,.97)' });
    T(m.x + 12, m.y + 24 * FS, PHONE ? '왼쪽과 오른쪽을 하나씩 눌러 이어요' : '왼쪽 위성·발사체와 오른쪽 하는 일을 이어요 (하나 누르고 하나 누르기)', PHONE ? 12.5 : 14, '#1e293b', 'left', 800);
    // 연결선
    KOREA.forEach((k, i) => {
      if (S.kLink[i] == null) return;
      const a = lcRect(L, i), b = rcRect(L, S.kLink[i]);
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a.x + a.w, a.y + a.h / 2); ctx.bezierCurveTo(a.x + a.w + 40, a.y + a.h / 2, b.x - 40, b.y + b.h / 2, b.x, b.y + b.h / 2); ctx.stroke();
    });
    if (S.kBad >= 0 && S.clock - S.kBadT < 0.9) {
      const a = lcRect(L, S.kBad), b = rcRect(L, S.kBadR);
      ctx.strokeStyle = 'rgba(226,70,75,' + (1 - (S.clock - S.kBadT) / 0.9).toFixed(2) + ')'; ctx.lineWidth = 4; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(a.x + a.w, a.y + a.h / 2); ctx.lineTo(b.x, b.y + b.h / 2); ctx.stroke(); ctx.setLineDash([]);
    }
    KOREA.forEach((k, i) => {
      const r = lcRect(L, i), done = S.kLink[i] != null, sel = S.kSel === i;
      D.shadow(() => { ctx.fillStyle = done ? '#dcfce7' : '#fff'; rr(r.x, r.y, r.w, r.h, 12).fill(); }, { blur: sel ? 10 : 4, y: sel ? 5 : 2 });
      ctx.strokeStyle = done ? '#16a34a' : sel ? '#f59e0b' : '#cbd5e1'; ctx.lineWidth = sel ? 4 : 2; rr(r.x, r.y, r.w, r.h, 12).stroke();
      T(r.x + 10, r.y + r.h / 2 + 8, k.ic, 24, '#000', 'left', 700);
      T(r.x + 46, r.y + r.h / 2 + 5 * FS, k.n, PHONE ? 14 : 15, '#1e293b', 'left', 800);
      if (done) D.check(r.x + r.w - 16, r.y + 16, 10, 1);
    });
    KOREA_R.forEach((k, j) => {
      const r = rcRect(L, j), linked = Object.values(S.kLink).includes(j);
      D.shadow(() => { ctx.fillStyle = linked ? '#dcfce7' : '#fff'; rr(r.x, r.y, r.w, r.h, 12).fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = linked ? '#16a34a' : S.kSel >= 0 ? '#f59e0b' : '#cbd5e1'; ctx.lineWidth = 2; if (S.kSel >= 0 && !linked) ctx.setLineDash([6, 4]); rr(r.x, r.y, r.w, r.h, 12).stroke(); ctx.setLineDash([]);
      ctx.save(); rr(r.x, r.y, r.w, r.h, 12).clip();
      drawWrap(r.x + 10, r.y + 20 * FS, k.t, r.w - 20, PHONE ? 12.5 : 13.5, { color: '#334155', weight: 700, lh: 1.25 });
      ctx.restore();
    });
    // 가운데 설명 (태블릿) / 아래 설명 (폰)
    const inf = L.inf;
    if (!PHONE) { ctx.fillStyle = '#f1f5f9'; rr(inf.x, inf.y, inf.w, inf.h, 12).fill(); }
    else { panel(inf.x, inf.y, inf.w, inf.h, { fill: '#f1f5f9' }); }
    const li = lastKInfo >= 0 && S.kLink[lastKInfo] != null ? lastKInfo : -1;
    if (li >= 0) { T(inf.x + 12, inf.y + 24 * FS, KOREA[li].ic + ' ' + KOREA[li].n, 14.5, '#166534', 'left', 800); drawWrap(inf.x + 12, inf.y + 48 * FS, KOREA[li].info, inf.w - 24, PHONE ? 12.5 : 13.5, { color: '#334155' }); }
    else drawWrap(inf.x + 12, inf.y + 28 * FS, '이으면 그 위성이 하는 일을 자세히 알려 줘요.', inf.w - 24, 13.5, { color: '#64748b' });
    // 궤도 그림
    const o = L.o; panel(o.x, o.y, o.w, o.h, { fill: 'rgba(8,15,40,.96)' });
    const Re = PHONE ? 19 : 21, cx = o.x + (PHONE ? o.w / 2 : 180), cy = o.y + (PHONE ? 38 + 126 : o.h / 2 + 6);
    ctx.save(); rr(o.x, o.y, o.w, o.h, 14).clip();
    STARS.slice(0, 70).forEach((s) => { ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.fillRect(o.x + s[0] * o.w, o.y + s[1] * o.h, 1.4, 1.4); }); ctx.globalAlpha = 1;
    T(o.x + 12, o.y + 24 * FS, '지구에서 본 궤도 (크기는 실제 비율)', 13.5, '#e2e8f0', 'left', 800);
    const rL = Re * (6371 + 700) / 6371, rG = Re * 42164 / 6371, wE = 0.5, ph = t * wE, wL = wE * 14.5;
    ctx.strokeStyle = 'rgba(147,197,253,.55)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, rG, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(250,204,21,.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, rL + 1, 0, TAU); ctx.stroke();
    D.glow(cx, cy, Re * 2, '#60a5fa', 0.4); D.sphere(cx, cy, Re, '#2563eb', { gloss: true });
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Re, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(34,197,94,.75)'; ctx.beginPath(); ctx.ellipse(cx + Math.cos(ph + 1) * Re * 0.4, cy + Math.sin(ph + 1) * Re * 0.4, Re * 0.4, Re * 0.28, ph, 0, TAU); ctx.fill(); ctx.restore();
    const pinA = ph, px = cx + Math.cos(pinA) * Re, py = cy + Math.sin(pinA) * Re;
    // 정지궤도 위성
    const gx = cx + Math.cos(pinA) * rG, gy = cy + Math.sin(pinA) * rG;
    ctx.strokeStyle = 'rgba(134,239,172,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
    drawProbe(gx, gy, 0.8, pinA + Math.PI / 2);
    T(gx + 20, gy - 14, '천리안', 13, '#86efac', 'left', 800);
    // 저궤도 위성
    const la = ph * 14.5 / 1 + 1.2, lx_ = cx + Math.cos(la) * rL, ly_ = cy + Math.sin(la) * rL;
    let dd = Math.abs(((la - pinA) % TAU + TAU + Math.PI) % TAU - Math.PI);
    const seeing = dd < 0.32;
    if (seeing) { ctx.strokeStyle = 'rgba(253,224,71,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx_, ly_); ctx.lineTo(px, py); ctx.stroke(); }
    ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(lx_, ly_, 3.5, 0, TAU); ctx.fill();
    D.sphere(px, py, 4.5, '#ef4444', { gloss: false, outline: '#fff', outlineWidth: 1.5 });
    ctx.restore();
    // 설명 글
    const tx = PHONE ? o.x + 14 : o.x + 360, ty = PHONE ? o.y + o.h - 68 : o.y + 52, tw = PHONE ? o.w - 28 : o.w - 376;
    if (PHONE) {
      T(tx, ty, '● 빨간 점: 한반도', 13, '#fca5a5', 'left', 800);
      T(tx, ty + 24 * FS, '🟡 아리랑(700 km): 한반도 위를 잠깐씩', 12.5, '#fde68a', 'left', 800);
      T(tx, ty + 46 * FS, '🟢 천리안(36,000 km): 24시간, 계속 머물러요', 12.5, '#86efac', 'left', 800);
    } else {
      T(tx, ty, '● 빨간 점: 한반도', 13.5, '#fca5a5', 'left', 800);
      let ey_ = drawWrap(tx, ty + 24 * FS, '🟡 아리랑: 약 700 km, 하루에 지구를 약 14.5바퀴 돌아요 → 한반도 위를 잠깐씩 지나가요', tw, 12.5, { color: '#fde68a' });
      ey_ = drawWrap(tx, ey_ + 24 * FS, '🟢 천리안: 약 36,000 km, 공전 주기 24시간 = 자전 주기 → 한반도 위에 계속 머물며 구름을 쉬지 않고 관측해요', tw, 12.5, { color: '#86efac' });
    }
    if (seeing) D.label(px + 30, py - 22, '📷 아리랑 촬영!', { bg: 'rgba(250,204,21,.95)', color: '#422006', size: 12.5, pad: 7 });
  }
  function korDown(p) {
    const L = LK();
    for (let i = 0; i < 4; i++) {
      const r = lcRect(L, i);
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        if (S.kLink[i] != null) { delete S.kLink[i]; S.kSel = -1; Sound.click(); updateCtl(); return false; }
        S.kSel = S.kSel === i ? -1 : i; Sound.click(); return false;
      }
    }
    for (let j = 0; j < 4; j++) {
      const r = rcRect(L, j);
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        if (S.kSel < 0) { say('먼저 왼쪽 카드를 하나 눌러 주세요.', true, 2); return false; }
        if (Object.values(S.kLink).includes(j)) { say('이미 연결된 카드예요. 왼쪽 카드를 누르면 연결이 풀려요.', true, 2.4); return false; }
        const i = S.kSel;
        if (KOREA[i].to === KOREA_R[j].id) {
          S.kLink[i] = j; lastKInfo = i; S.kSel = -1; Sound.success();
          const a = rcRect(L, j); parts.burst(a.x + a.w / 2, a.y + a.h / 2, { count: 16, speed: 130, size: 3 });
        } else { S.kBad = i; S.kBadR = j; S.kBadT = S.clock; S.kSel = -1; Sound.fail(); say('짝이 맞지 않아요. 다시 생각해 봐요.', true, 2); }
        updateCtl();
        return false;
      }
    }
    return false;
  }

  /* ---------- ④ 토론 근거 카드 ---------- */
  function LD() {
    if (PHONE) { const bw = 149; return { grid: { x: 8, y: 8, w: VW - 16, h: 274, cols: 2, cardH: 50, gap: 6 }, detail: { x: 8, y: 290, w: VW - 16, h: 104 }, bins: [0, 1, 2].map((i) => ({ x: 8 + i * (bw + 8), y: 402, w: bw, h: 222 })), s: { x: 8, y: 632, w: VW - 16, h: 140 } }; }
    return { grid: { x: 10, y: 8, w: 780, h: 116, cols: 5, cardH: 54, gap: 8 }, detail: { x: 10, y: 132, w: 780, h: 78 }, bins: [0, 1, 2].map((i) => ({ x: 10 + i * 264, y: 218, w: 252, h: 250 })), s: { x: 10, y: 478, w: 780, h: 132 } };
  }
  const cD = makeClassifier({
    items: ARGS.map((a) => ({ label: a.label, chip: a.short, text: a.text, bin: a.bin, open: true })),
    bins: [{ label: '👍 찬성', sub: '계속 투자해야 해요', color: '#16a34a' }, { label: '👎 반대', sub: '예산을 줄여야 해요', color: '#dc2626' }, { label: '🤝 조건부', sub: '조건이 맞으면 찬성', color: '#d97706' }],
    chipCols: 1, minRows: 4, layout: LD,
    placeholder: '근거 카드를 눌러 보세요. 읽고 알맞은 상자에 넣어요. (눌러서 고른 뒤 상자를 누르거나, 끌어다 놓아요.)',
    detailFn: (it) => ({ title: it.label, body: it.text }),
    onChange() { updateCtl(); },
  });
  function drawDebate(dt, t) {
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    cD.draw(dt);
    const L = LD(), s = L.s;
    panel(s.x, s.y, s.w, s.h, { fill: 'rgba(255,255,255,.97)', line: '#cbd5e1', lw: 1.5 });
    T(s.x + 14, s.y + 26 * FS, '✍ 토론 주제: 우주탐사에 예산을 계속 써야 할까요?', 14.5, '#1e293b', 'left', 800);
    const done = cD.items.every((i) => i.loc != null);
    if (!done) drawWrap(s.x + 14, s.y + 54 * FS, '근거 카드를 모두 상자에 나눈 뒤, 내 입장 문장을 완성해요.', s.w - 28, 13.5, { color: '#64748b' });
    else {
      const st = S.stance >= 0 ? '「' + STANCE[S.stance] + '」' : '「 ? 」';
      T(s.x + 14, s.y + 54 * FS, '나는 ' + st + ' 입장이에요.', 15, '#0369a1', 'left', 800);
      if (S.evid >= 0) { T(s.x + 14, s.y + 80 * FS, '내가 고른 근거: ' + ARGS[S.evid].label, 14, '#1e293b', 'left', 800); drawWrap(s.x + 14, s.y + 104 * FS, ARGS[S.evid].text, s.w - 28, 13.5, { color: '#334155' }); }
      else drawWrap(s.x + 14, s.y + 80 * FS, '내 입장을 뒷받침하는 근거 카드를 골라 주세요.', s.w - 28, 13.5, { color: '#64748b' });
    }
  }

  /* ================= 조작 · 화면 전환 ================= */
  const modeBtns = $$('#modeSeg button');
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); S.fl = null; }
    updateCtl();
  }
  function updateCtl() {
    const free = game && game.free;
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcDelay').hidden = !(S.view === 'map' && (S.flags.calcDelay || free));
    $('#needBox').hidden = !(S.view === 'atmo' && (S.flags.needBox || free));
    $('#calcRes').hidden = !(S.view === 'res' && (S.flags.calcRes || free));
    $('#debBox').hidden = !(S.view === 'debate' && (free || cD.items.every((i) => i.loc != null)));
    $$('#grpDest .opt').forEach((b) => { const k = +b.dataset.k; b.classList.toggle('on', k === S.dest); b.classList.toggle('done', S.conn[k]); });
    $$('#grpMeth .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.meth));
    $$('#grpReg .opt').forEach((b) => { const k = +b.dataset.k; b.classList.toggle('on', k === S.reg); b.classList.toggle('done', regCount(k) === REG[k].big); });
    $$('#grpBand .opt').forEach((b) => b.classList.toggle('on', bandOf(S.lx) === +b.dataset.k));
    $$('#grpNeed .opt').forEach((b) => b.classList.toggle('on', S.need.has(+b.dataset.k)));
    $$('#grpStance .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.stance));
    $('#bRecv').disabled = S.recv || boardOpened() < 3;
    $('#bRecv').textContent = S.recv ? '✔ 다른 모둠 자료를 받았어요' : '📡 다른 모둠 자료 받기';
    $('#boardNote').textContent = S.recv ? '받은 12장을 두 상자로 나눠 보세요. (카드를 눌러 고른 뒤 상자를 누르거나 끌어다 놓아요.)' : '파란 카드가 우리 모둠 자료예요. 세 장을 모두 눌러 열면 다른 모둠 자료를 받을 수 있어요.';
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $('#sendNote').textContent = S.meth < 0 ? '목적지와 방식을 골라요.' : DEST[S.dest].n + '에 ' + METH[S.meth].n + ' 탐사선을 보내요.';
    const sel = $('#selEvid');
    if (sel && !sel.dataset.ready) { sel.dataset.ready = '1'; sel.innerHTML = '<option value="-1">근거 카드 고르기</option>' + ARGS.map((a, i) => '<option value="' + i + '">' + a.label + '</option>').join(''); }
    if (sel) sel.value = String(S.evid);
  }
  modeBtns.forEach((b) => clickable(b, () => setView(b.dataset.view)));
  $$('#grpDest .opt').forEach((b) => clickable(b, () => { S.dest = +b.dataset.k; updateCtl(); }));
  $$('#grpMeth .opt').forEach((b) => clickable(b, () => { S.meth = +b.dataset.k; updateCtl(); }));
  clickable($('#bSend'), sendProbe);
  clickable($('#bRecv'), boardRecv);
  clickable($('#bBoardReset'), () => { boardReset(); updateCtl(); });
  $$('#grpReg .opt').forEach((b) => clickable(b, () => setReg(+b.dataset.k)));
  clickable($('#bFind'), () => { S.findT = 4; });
  clickable($('#bCClear'), () => { S.stk[S.reg].clear(); updateCtl(); });
  bindSlider($('#sLam'), $('#oLam'), (v) => lamStr(v), (v) => { S.lx = v; updateCtl(); });
  $$('#grpBand .opt').forEach((b) => clickable(b, () => atmoSet(BANDS[+b.dataset.k].c)));
  $$('#grpNeed .opt').forEach((b) => clickable(b, () => { const k = +b.dataset.k; if (S.need.has(k)) S.need.delete(k); else S.need.add(k); updateCtl(); }));
  bindSlider($('#sD'), $('#oD'), (v) => f1(v) + ' m', (v) => { S.D = v; });
  bindSlider($('#sLamR'), $('#oLamR'), (v) => f0(v) + ' nm', (v) => { S.lam = v; });
  bindSlider($('#sSep'), $('#oSep'), (v) => f2(v) + '″', (v) => { S.sep = v; });
  clickable($('#bKClear'), () => { S.kLink = {}; S.kSel = -1; lastKInfo = -1; updateCtl(); });
  $$('#grpStance .opt').forEach((b) => clickable(b, () => { S.stance = +b.dataset.k; updateCtl(); }));
  $('#selEvid').addEventListener('change', (e) => { S.evid = +e.target.value; });
  clickable($('#bDebReset'), () => { cD.reset(); S.stance = -1; S.evid = -1; updateCtl(); });

  SciSim.pointer(view, {
    down(p) {
      switch (S.view) {
        case 'map': return mapDown(p);
        case 'board': return cB.down(p);
        case 'crater': return craterDown(p);
        case 'atmo': return atmoDown(p);
        case 'korea': return korDown(p);
        case 'debate': return cD.down(p);
        default: return false;
      }
    },
    move(p) { if (S.view === 'board') cB.move(p); else if (S.view === 'debate') cD.move(p); else if (S.view === 'atmo') atmoMove(p); },
    up(p) { if (S.view === 'board') cB.up(p); else if (S.view === 'debate') cD.up(p); },
    hover(p) {
      if (S.view === 'board') return cB.hit(p) ? 'pointer' : '';
      if (S.view === 'debate') return cD.hit(p) ? 'pointer' : '';
      if (S.view === 'map') { const L = LM(); for (let i = 0; i < 6; i++) if (Math.hypot(p.x - L.sx(i), p.y - L.sy) < 30) return 'pointer'; return ''; }
      if (S.view === 'crater') return 'crosshair';
      if (S.view === 'atmo') { const G = graphGeom(LA().g); return p.x > G.px0 && p.x < G.px0 + G.pw && p.y < LA().g.y + LA().g.h ? 'ew-resize' : ''; }
      return '';
    },
  });

  /* ================= 미션 ================= */
  const needOk = () => S.need.size === 3 && NEED_OK.every((k) => S.need.has(k));
  const argsDone = () => cD.items.every((i) => i.loc != null);
  const argsRight = () => cD.items.every((i) => i.loc === i.bin);
  const levels = [
    {
      title: '탐사 방식: 어디로, 어떻게 보낼까', short: '탐사 방식', icon: '🗺️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 탐사선과 인공위성은 지상의 망원경으로는 알 수 없는 무엇을 알려 줬을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 태양계 탐사와 인공위성이 어떻게 쓰이는지 배웠어요. 이제 최근 탐사선이 밝혀낸 사실을 <b>탐사 방식별·대상별</b>로 모아 비교해요.</div>' +
        '<p>먼저 태양계 지도에서 목적지를 골라 <b>지구까지의 거리 d</b>와 <b>빛 신호가 오가는 시간 t = d / c</b>를 알아보고, 목적에 알맞은 <b>탐사 방식</b> 네 가지를 연결해 봐요.</p>',
      features: ['map'],
      setup() { S.conn = [false, false, false, false, false, false]; S.connM = [-1, -1, -1, -1, -1, -1]; S.fl = null; S.meth = -1; S.dest = 2; S.flags.calcDelay = false; setView('map'); },
      recap: '목적에 따라 근접 통과·궤도선·착륙선·시료 회수 중 알맞은 방식을 골라요. 먼 곳일수록 빛 신호도 오래 걸려요(t = d / c).',
      summary: '<ul><li><b>탐사 방식 4가지</b>: 근접 통과(플라이바이: 보이저 1·2호, 1977 발사) · 궤도선(카시니 2004~2017, 주노 2016~, 다누리 2022~) · 착륙선·로버(퍼서비어런스 2021, 인저뉴어티 2021~2024) · 시료 회수(하야부사2호 2020, OSIRIS-REx 2023, 창어 5호 2020). 목적에 따라 알맞은 방식이 달라요.</li><li><b>신호 지연</b> t = d / c (1 AU = 1.5×10⁸ km, c = 3.0×10⁵ km/s → 빛은 1 AU를 500 s에 가요): 달 약 1.3초, 화성 편도 약 3~22분, 목성 약 35~52분, 명왕성 약 4.6시간, 보이저 1호(약 165 AU) 약 23시간.</li><li>신호가 순간 도착하지 않으므로 착륙선은 지구의 명령을 기다리지 않고 <b>스스로 판단해 내려야</b> 해요.</li></ul>',
      missions: [
        {
          title: '목적에 맞는 탐사 방식 연결하기',
          goal: '목적지를 고르고 <b>탐사 방식</b>을 골라 🚀를 눌러요. 목표에 알맞은 방식으로 <b>세 곳 이상</b> 성공시켜 보세요.',
          hint: '목표 글을 읽어요. 지나가며 보기 · 오래 돌며 관측 · 표면에서 직접 조사 · 흙을 가져오기 중 무엇이 필요한지 생각해 봐요.',
          setup() { S.conn = [false, false, false, false, false, false]; S.connM = [-1, -1, -1, -1, -1, -1]; S.fl = null; S.meth = -1; S.flags.calcDelay = false; setView('map'); },
          check: () => connCount() >= 3,
          hold: 0.8,
          status: () => mark(connCount() >= 3) + ' 성공한 탐사 ' + Math.min(3, connCount()) + ' / 3 &nbsp;(지금까지 ' + connCount() + '곳)',
          explain: '<b>스쳐 지나가기</b>는 먼 곳(명왕성), <b>궤도선</b>은 오래 관측할 때(달·목성·토성), <b>착륙선·로버</b>는 표면 조사(화성), <b>시료 회수</b>는 지구 실험실의 정밀 분석(소행성 류구)에 알맞아요. 목성·토성은 단단한 표면이 없는 기체 행성이라 착륙할 수 없어요.',
        },
        {
          title: '빛 신호는 얼마나 걸릴까?', manual: true,
          goal: '목성이 지구에 가장 가까운 <b>d = 4.2 AU</b>일 때 빛 신호의 편도 시간 t = d / c를 <b>분</b> 단위로 입력하세요. (1 AU = 1.5×10⁸ km, c = 3.0×10⁵ km/s)',
          hint: '1 AU는 1.5×10⁸ km ÷ 3.0×10⁵ km/s = 500초예요. 4.2배 하면 몇 초일까요? 그다음 60으로 나눠 분으로 바꿔요.',
          setup() { S.flags.calcDelay = true; S.dest = 3; clrIn('inDelay'); setView('map'); },
          check() {
            const x = numOf('inDelay');
            if (x == null) return '숫자(분)를 입력해 주세요.';
            const ok = Math.abs(x - 35) <= 1.5; fbIn('inDelay', ok);
            if (ok) return true;
            if (Math.abs(x - 2100) < 60) return '초 단위로 구했네요. 분으로 바꾸려면 60으로 나눠요.';
            if (Math.abs(x - 4.2) < 0.3) return '거리 d를 그대로 썼어요. t = d / c, 즉 거리를 속력으로 나눈 시간이에요.';
            if (Math.abs(x - 0.58) < 0.06) return '시간(h) 단위예요. 분으로 바꿔 입력해 주세요.';
            if (x <= 0.5) return '신호가 순간 도착하는 것이 아니에요. 4.2 AU × 500 s 로 구해 보세요.';
            return 't = 4.2 AU × 500 s/AU = 2100 s 예요. 분으로 바꿔 보세요.';
          },
          status: () => '입력 ' + ($('#inDelay').value.trim() || '—') + ' 분',
          explain: 't = d / c = 4.2 × 500 s = <b>2100 s = 35분</b>. 가장 가까울 때도 목성은 편도 35분이에요. 화성은 편도 최소 약 3분이라 착륙 과정(약 7분)을 지구에서 실시간으로 조종할 수 없어서, 착륙선은 <b>스스로 판단해 내려야</b> 해요. 빛 신호도 순간적으로 도착하지 않아요.',
        },
      ],
    },
    {
      title: '탐사 성과: 모둠 자료로 비교', short: '탐사 성과', icon: '📊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 탐사 방식과 신호 지연을 알아봤어요. 이제 탐사선이 <b>새로 밝혀낸 사실</b>을 여러 모둠의 자료로 모아 행성 탐사선과 소천체 탐사선으로 나누고, 표면 사진의 충돌구로 표면의 나이를 비교해요.</div>' +
        '<p>먼저 우리 모둠 카드 3장을 읽고 <b>다른 모둠의 자료를 받아</b> 12장의 <b>모둠 자료 보드</b>를 완성해요. 그다음 <b>충돌구를 직접 세어</b> 어느 표면이 더 오래됐는지 알아봐요.</p>',
      features: ['board', 'crater'],
      setup() { boardReset(); S.stk.forEach((s) => s.clear()); S.reg = 0; setView('board'); },
      recap: '탐사선은 지하 바다·유기물·화산 활동 같은 새 사실을 밝혔어요. 단위 면적당 충돌구가 많을수록 오래된 표면이에요.',
      summary: '<ul><li><b>행성·위성·태양 탐사선</b>: 퍼서비어런스(화성 제제로 분화구의 옛 호수·삼각주 지형), 주노(목성 극 지역의 사이클론, 복잡한 내부·자기장), 카시니(엔셀라두스 남극의 물 얼음 분출 → 지하 바다), 창어 5호(달 현무암 약 20억 년 전 분출), 파커(코로나 안쪽 진입), 다누리(달 극지방 영구 음영 지역).</li><li><b>소천체 탐사선</b>: 뉴호라이즌스(명왕성의 질소 얼음 평원, 아로코스는 접촉 쌍성), 하야부사2(류구 시료의 물 품은 광물·아미노산), OSIRIS-REx(베누 잔해 더미·유기물), 로제타(혜성 67P 밀도 약 0.53 g/cm³), DART(디모르포스의 공전 주기 11시간 55분 → 11시간 23분).</li><li><b>충돌구 헤아리기</b>: 같은 면적(10⁴ km²)에서 지름 5 km 이상 충돌구 수는 달 고지 36개, 달 바다 9개, 올림푸스 사면 1개 → 상대 연령 약 36 : 9 : 1. 절대 나이는 아폴로·창어 5호의 시료로 눈금을 맞춰요.</li></ul>',
      missions: [
        {
          title: '모둠 자료 모으고 분류하기', manual: true,
          goal: '파란 카드 3장을 열고 📡로 다른 모둠 자료를 받아요. 12장을 <b>행성·위성·태양 탐사선</b>과 <b>소천체 탐사선</b>으로 나눠 ✔ 확인하기를 눌러요.',
          hint: '소천체는 왜소행성·소행성·혜성이에요. 명왕성은 왜소행성이라 소천체 쪽이고, 달과 태양은 소천체가 아니에요.',
          setup() { boardReset(); setView('board'); },
          check() {
            if (boardOpened() < 3) return '먼저 파란 카드 세 장을 눌러 열어 보세요.';
            if (!S.recv) return '📡 다른 모둠 자료를 받아 12장을 모아요.';
            const pl = cB.items.filter((i) => i.loc != null).length;
            if (pl < 12) return '아직 상자에 넣지 않은 카드가 ' + (12 - pl) + '장 있어요.';
            const bad = cB.items.filter((i) => i.loc !== i.bin);
            cB.items.forEach((i) => { i.wrong = i.loc !== i.bin; });
            if (bad.length) return '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요. 소천체는 왜소행성·소행성·혜성이에요.';
            return true;
          },
          status: () => mark(boardOpened() === 3) + ' 열어 본 내 모둠 카드 ' + boardOpened() + ' / 3 &nbsp; ' + mark(S.recv) + ' 자료 받기 &nbsp; ' + mark(cB.counts().placed === 12) + ' 분류 ' + cB.counts().placed + ' / 12',
          explain: '행성 탐사선(화성·목성·엔셀라두스·달·태양)과 <b>소천체</b> 탐사선(왜소행성 명왕성, 카이퍼 벨트 천체 아로코스, 소행성 류구·베누, 혜성 67P, 쌍성 소행성 디모르포스)으로 나뉘어요. 여러 모둠의 자료를 모으니 한 팀이 혼자 조사하는 것보다 훨씬 넓게 비교할 수 있어요.',
        },
        {
          title: '충돌구 헤아리기',
          goal: '세 구역 사진(100 km × 100 km)에서 지름 <b>5 km 이상</b> 충돌구를 눌러 모두 세어 보세요.',
          hint: '노란 원(5 km)보다 작은 충돌구는 세지 않아요. 💡 빠진 충돌구 보이기를 누르면 아직 안 센 충돌구가 깜빡여요.',
          setup() { S.stk.forEach((s) => s.clear()); S.reg = 0; setView('crater'); },
          check: () => REG.every((g, i) => regCount(i) === g.big),
          hold: 0.8,
          status: () => REG.map((g, i) => mark(regCount(i) === g.big) + ' ' + g.n + ' ' + regCount(i) + '개').join(' &nbsp; '),
          explain: '세어 보면 달 고지 <b>36개</b>, 달 바다 <b>9개</b>, 올림푸스 사면 <b>1개</b>예요. 같은 면적에서 충돌구가 많을수록 오래 노출된 표면이라 상대 연령은 약 <b>36 : 9 : 1</b>이에요. 절대 나이는 아폴로와 창어 5호가 가져온 시료로 눈금을 맞춰요.',
        },
        {
          type: 'quiz', title: '충돌구가 많은 표면은?',
          goal: '같은 면적에서 충돌구가 <b>많은</b> 표면(달 고지)은 적은 표면(달 바다)보다 어떤 표면일까요?',
          setup() { setView('crater'); },
          choices: ['더 오래전에 만들어져, 충돌구가 오랫동안 쌓였어요', '더 최근에 만들어져, 충돌이 활발해요', '용암으로 덮여 새로 만들어진 표면이에요', '태양에 더 가까워서 충돌이 더 많았어요'],
          answer: 0,
          feedback: ['', '충돌구는 표면이 우주에 노출된 시간에 비례해 늘어나요. 많다는 것은 오래 노출됐다는 뜻이에요.', '용암이 덮이면 기존 충돌구가 묻혀 오히려 줄어들어요. 충돌구가 적은 달 바다가 그 예예요.', '달 고지와 달 바다는 태양까지의 거리가 같아요. 차이는 표면이 만들어진 시기예요.'],
          explain: '충돌구는 시간이 지나며 계속 <b>쌓여요</b>. 그래서 단위 면적당 충돌구가 많을수록 오래된 표면이고, 용암이 덮인 달 바다(9개)나 비교적 젊은 올림푸스 화산(1개)은 충돌구가 적어요.',
        },
      ],
    },
    {
      title: '우주 관측: 대기 밖으로', short: '우주 관측', icon: '🔭', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 탐사선 자료로 새 사실을 알았어요. 그런데 탐사선이 닿지 않는 별과 은하는 어떻게 볼까요? <b>인공위성(우주 망원경)</b>이 필요한 까닭을 지구 대기의 <b>흡수</b>와 <b>흔들림</b>으로 알아봐요. (통합과학 스펙트럼, 지구과학의 선택적 흡수와 연결돼요.)</div>' +
        '<p>먼저 <b>대기 투과율 곡선</b>에서 파장마다 빛이 지상에 도달하는지 살펴보고, 허블 우주 망원경의 <b>분해능 θ = 1.22 λ / D</b>를 계산해 지상 망원경과 비교해요.</p>',
      features: ['atmo', 'res'],
      setup() { S.need = new Set(); S.flags.needBox = false; S.flags.calcRes = false; atmoSet(-6.26); setView('atmo'); },
      recap: '지구 대기는 가시광선·일부 적외선·전파만 통과시켜요. 우주 망원경은 대기의 흡수와 요동이 없어 모든 파장을 이론적 한계까지 선명하게 볼 수 있어요.',
      summary: '<ul><li><b>대기의 창</b>: 지구 대기는 가시광선, 일부 적외선, 전파(약 1 cm ~ 10 m)만 지상까지 통과시켜요. 감마선·X선·자외선은 대기(전리층·오존층)가 흡수해서 <b>우주 망원경</b>으로만 관측해요.</li><li>대표 우주 망원경: 허블(가시광선·자외선), 제임스 웹(적외선), 찬드라(X선), 페르미(감마선).</li><li><b>분해능</b> θ = 1.22 λ / D (rad, 1 rad = 206265″): 허블(D = 2.4 m, λ = 550 nm)은 θ = 2.8×10⁻⁷ rad ≈ <b>0.058″</b>. 지상의 큰 망원경은 대기 요동 때문에 실제로 약 0.5~1″예요.</li><li>그래서 우주 망원경은 ① 흡수되는 파장을 관측하고 ② 요동 없이 더 선명하게 볼 수 있어요. (별에 가까워서가 아니에요.)</li></ul>',
      missions: [
        {
          title: '위성이 꼭 필요한 파장 고르기', manual: true,
          goal: '곡선을 보며 파장을 바꿔 봐요. 지상까지 거의 도달하지 못해 <b>우주 망원경이 꼭 필요한 파장 세 가지</b>를 골라 ✔ 확인하기를 눌러요.',
          hint: '대기 투과율(T)이 0에 가까운 파장대를 찾아요. 파란 곡선이 0인 곳이 가시광선보다 짧은 쪽에 모여 있어요.',
          setup() { S.need = new Set(); S.flags.needBox = true; S.flags.calcRes = false; setView('atmo'); },
          check() {
            if (S.need.size < 3) return '세 가지를 골라 주세요. (지금 ' + S.need.size + '개)';
            if (S.need.size > 3) return '세 가지만 골라요. (지금 ' + S.need.size + '개)';
            if (needOk()) return true;
            if (S.need.has(3)) return '가시광선은 대기를 잘 통과해요(T 약 90 %). 지상에서도 볼 수 있어요.';
            if (S.need.has(5)) return '전파(약 1 cm ~ 10 m)는 대기의 창이에요. 지상 전파 망원경으로 관측해요.';
            if (S.need.has(4)) return '적외선은 일부 파장이 지상에 와요(대기의 창). 거의 0인 파장대 세 곳을 골라요.';
            return '곡선이 0에 가까운 파장대를 골라요.';
          },
          status: () => '고른 파장 ' + S.need.size + ' / 3: ' + (S.need.size ? Array.from(S.need).sort().map((k) => BANDS[k].n).join(', ') : '—'),
          explain: '<b>감마선·X선·자외선</b>은 전리층과 오존층 등 대기가 흡수해서 지상에 거의 도달하지 못해요. 그래서 페르미(감마선), 찬드라(X선), 허블(자외선) 같은 <b>우주 망원경</b>이 필요해요. 가시광선·전파와 일부 적외선은 대기의 창으로 지상에 도달해요.',
        },
        {
          title: '허블의 분해능 계산하기', manual: true,
          goal: '허블 우주 망원경(<b>D = 2.4 m</b>)이 <b>λ = 550 nm</b> 가시광선으로 볼 때 분해능 θ = 1.22 λ / D를 <b>초각(″)</b>으로 입력하세요.',
          hint: '아래 분해능 계산기의 슬라이더를 D = 2.4 m, λ = 550 nm로 맞추면 θ가 나와요. 1 rad = 206265″예요.',
          setup() { S.flags.calcRes = true; S.D = 1.0; S.lam = 550; S.sep = 0.4; setSlider($('#sD'), $('#oD'), 1.0, (v) => f1(v) + ' m'); setSlider($('#sLamR'), $('#oLamR'), 550, (v) => f0(v) + ' nm'); setSlider($('#sSep'), $('#oSep'), 0.4, (v) => f2(v) + '″'); clrIn('inTheta'); setView('res'); },
          check() {
            const x = numOf('inTheta');
            if (x == null) return '숫자(″)를 입력해 주세요.';
            const ok = Math.abs(x - thetaArc(HUBBLE.lam, HUBBLE.D)) <= 0.004; fbIn('inTheta', ok);
            if (ok) return true;
            if (x > 0 && x < 1e-5) return '라디안(rad) 값이에요. 206265를 곱해 초각(″)으로 바꿔요.';
            if (Math.abs(x - thetaArc(550, 1.0)) < 0.01) return 'D = 1.0 m 일 때 값이에요. 허블의 D는 2.4 m예요.';
            return 'θ = 1.22 × 550×10⁻⁹ m ÷ 2.4 m = 2.8×10⁻⁷ rad 이고, 여기에 206265를 곱해요.';
          },
          status: () => '계산기: D = ' + f1(S.D) + ' m, λ = ' + f0(S.lam) + ' nm → θ = ' + f3(thetaArc(S.lam, S.D)) + '″',
          explain: 'θ = 1.22 × (550×10⁻⁹ m) ÷ 2.4 m = <b>2.8×10⁻⁷ rad</b> = 2.8×10⁻⁷ × 206265″ ≈ <b>0.058″</b>. 지상 망원경은 대기 요동 때문에 실제로 0.5~1″ 정도라, 같은 크기여도 허블이 훨씬 선명해요.',
        },
        {
          type: 'quiz', title: '우주 망원경이 더 선명한 까닭',
          goal: '허블 같은 우주 망원경이 지상의 큰 망원경보다 선명하고 더 많은 파장을 볼 수 있는 가장 큰 까닭은?',
          setup() { setView('res'); },
          choices: ['대기의 흡수와 흔들림(요동)을 받지 않아요', '지구보다 별에 가까워서 별이 더 크게 보여요', '우주에서는 빛이 더 빨리 와서 더 밝아요', '우주 망원경이 항상 지상 망원경보다 더 커요'],
          answer: 0,
          feedback: ['', '별까지의 거리(수 광년 이상)에 비해 지구 상공 수백 km는 아주 작아요. 별이 더 커 보이는 것이 아니에요.', '빛의 속력은 어디서나 같아요. 중요한 것은 대기가 빛을 흡수하고 흔드는 것이에요.', '허블(2.4 m)보다 큰 지상 망원경(8~10 m)도 많아요. 핵심은 대기 밖에 있다는 점이에요.'],
          explain: '우주 망원경은 <b>대기 밖</b>에 있어 ① 대기가 흡수하는 자외선·X선·감마선도 관측하고 ② 대기 요동 없이 이론적 한계(회절 한계)에 가까운 선명한 상을 얻어요.',
        },
      ],
    },
    {
      title: '토론하기: 우주탐사, 계속해야 할까', short: '토론하기', icon: '🗣️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 탐사선과 우주 망원경이 알려 준 것들을 정리했어요. 이제 <b>우리나라의 우주개발</b>을 알아보고, "우주탐사에 예산을 계속 써야 할까?"를 근거 카드로 토론해요.</div>' +
        '<p>누리호·다누리·아리랑·천리안을 하는 일과 이어 보고, 토론 근거 카드를 <b>찬성·반대·조건부</b>로 나눈 뒤 내 입장 문장을 완성해요.</p>',
      features: ['korea', 'debate'],
      setup() { S.kLink = {}; S.kSel = -1; lastKInfo = -1; cD.reset(); S.stance = -1; S.evid = -1; setView('korea'); },
      recap: '우리나라는 누리호·다누리·아리랑·천리안으로 우주개발을 해요. 우주탐사는 새 지식과 기술, 안전을 주지만 비용과 쓰레기 문제도 있어서 근거로 토론해요.',
      summary: '<ul><li><b>우리나라의 우주개발</b>: 누리호(국내 기술 발사체, 2022년 2차 발사에서 위성을 궤도에 올리고 2023년 3차도 성공) · 다누리(달 궤도선, 2022 발사) · 아리랑(다목적 실용위성, 지구 관측) · 천리안 2A·2B(정지궤도 기상·해양·환경 위성).</li><li><b>정지궤도</b>(약 36,000 km)의 공전 주기는 24시간이라 한 지역 위에 머물러요. 낮은 궤도의 아리랑은 하루에 지구를 약 14.5바퀴 돌며 지나가는 곳을 정밀하게 촬영해요.</li><li><b>토론 근거</b>: 찬성(새 지식, 기술 파급, 재난 감시, 위성 통신·내비) · 반대(높은 비용, 우주 쓰레기, 지상 문제 먼저) · 조건부(성과 공개·평가, 국제 협력, 수명 끝 위성 처리). 입장과 근거가 같은 상자에 있어야 설득력이 있어요.</li></ul>',
      missions: [
        {
          title: '우리나라 우주개발 연결하기', manual: true,
          goal: '왼쪽 <b>누리호·다누리·아리랑·천리안 2A·2B</b>를 하나 누르고, 오른쪽 <b>하는 일</b> 카드를 눌러 4쌍을 모두 이어요.',
          hint: '발사체는 위성을 올리는 로켓, 다누리는 달, 아리랑은 낮은 궤도의 지구 관측, 천리안은 정지궤도 기상 위성이에요.',
          setup() { S.kLink = {}; S.kSel = -1; lastKInfo = -1; setView('korea'); },
          check() { return korDone() === 4 ? true : '아직 ' + (4 - korDone()) + '쌍이 남았어요.'; },
          status: () => '연결 ' + korDone() + ' / 4',
          explain: '누리호는 위성을 궤도에 올리는 <b>발사체</b>, 다누리는 <b>달 궤도선</b>, 아리랑은 낮은 궤도의 <b>지구 관측 위성</b>, 천리안은 <b>정지궤도</b>에서 한반도의 기상·해양·환경을 보는 위성이에요.',
        },
        {
          title: '토론 근거 분류하고 내 입장 쓰기', manual: true,
          goal: '근거 카드 10장을 <b>찬성·반대·조건부</b> 상자로 나눈 뒤, 내 입장과 같은 상자의 근거를 골라 문장을 완성해요.',
          hint: '문장에 "~한다면 찬성"이라는 말이 있으면 조건부 카드예요. 비용·쓰레기·지상 문제는 반대 근거예요.',
          setup() { cD.reset(); S.stance = -1; S.evid = -1; setView('debate'); },
          check() {
            if (!argsDone()) return '아직 상자에 넣지 않은 카드가 ' + (10 - cD.items.filter((i) => i.loc != null).length) + '장 있어요.';
            const bad = cD.items.filter((i) => i.loc !== i.bin);
            cD.items.forEach((i) => { i.wrong = i.loc !== i.bin; });
            if (bad.length) return '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요. 조건이 붙은 카드는 조건부 상자예요.';
            if (S.stance < 0) return '내 입장(찬성·반대·조건부)을 골라 주세요.';
            if (S.evid < 0) return '내 입장을 뒷받침하는 근거 카드를 골라 주세요.';
            if (ARGS[S.evid].bin !== S.stance) return '고른 근거는 「' + STANCE[ARGS[S.evid].bin] + '」 상자의 카드예요. 입장과 같은 상자의 근거를 골라요.';
            return true;
          },
          status: () => mark(cD.counts().placed === 10) + ' 분류 ' + cD.counts().placed + ' / 10 &nbsp; ' + mark(S.stance >= 0 && S.evid >= 0) + ' 입장·근거',
          explain: '좋은 토론은 <b>입장과 근거가 일치</b>해야 해요. 찬성(새 지식·기술·안전·일상), 반대(비용·쓰레기·지상 문제), 조건부(공개·협력·처리 의무)처럼 근거를 나누면 서로 어느 점에서 다른지 분명해져요.',
        },
        {
          type: 'quiz', title: '천리안이 정지궤도에 있는 까닭',
          goal: '기상 위성 천리안이 지상 약 36,000 km의 <b>정지궤도</b>에 있어야 하는 까닭은?',
          setup() { setView('korea'); },
          choices: ['지구 자전과 같은 주기(24시간)로 돌아 한 지역 위에 머물며 계속 관측해요', '지구에 가장 가까운 궤도라 가장 자세히 찍을 수 있어요', '궤도가 높을수록 빨리 돌아 지구 전체를 빨리 훑어요', '대기가 없어서 구름 아래까지 투과해서 볼 수 있어요'],
          answer: 0,
          feedback: ['', '정지궤도는 가장 높은 쪽이에요. 가까운 낮은 궤도의 아리랑이 정밀 촬영에 알맞아요.', '높은 궤도일수록 더 느리게 돌아요(T² ∝ r³). 약 36,000 km에서 주기가 24시간이 돼요.', '구름을 투과해 보는 것이 아니라 위에서 구름의 움직임을 봐요. 정지궤도의 장점은 같은 곳을 계속 보는 것이에요.'],
          explain: '정지궤도 위성의 공전 주기는 지구 자전 주기(24시간)와 같아서 항상 한반도 위에 있어요. 그래서 구름의 움직임을 <b>쉬지 않고</b> 관측하는 기상 관측에 알맞아요. 낮은 궤도의 위성은 한 지역 위를 잠깐씩만 지나가요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-probe-results', mount: '#game', badge: '우주탐사 분석가', homeHref: '../../index.html#hu',
    featureLabels: { map: '🗺️ 태양계 탐사 지도 · 탐사 방식 카드', board: '🗂 모둠 자료 보드 (12장)', crater: '🔍 충돌구 헤아리기', atmo: '🌫️ 대기 투과 곡선 · 빛줄기', res: '🔭 분해능 계산기', korea: '🇰🇷 우리나라 우주개발 연결 · 궤도 그림', debate: '💬 토론 근거 카드 · 내 입장 문장' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const free = game && game.free;
    if (S.view === 'map') {
      const ds = DEST[S.dest], hide = S.flags.calcDelay && !free;
      const dtxt = ds.dmin == null ? '최대 약 ' + dstr(ds.dmax) + ' AU' : ds.dmin === ds.dmax ? dstr(ds.dmax) + ' AU' : dstr(ds.dmin) + '~' + dstr(ds.dmax) + ' AU';
      const ttxt = ds.dmin == null ? '최대 약 ' + tstr(ds.dmax * AU_S) : ds.dmin === ds.dmax ? tstr(ds.dmax * AU_S) : tstr(ds.dmin * AU_S) + '~' + tstr(ds.dmax * AU_S);
      setReadouts(['목적지', ds.n, '지구까지 거리 d', dtxt, '빛 신호 편도 t', hide ? '직접 계산해요' : ttxt]);
    } else if (S.view === 'board') {
      setReadouts(['내 모둠 카드', boardOpened() + ' / 3', '받은 자료', S.recv ? '9 / 9' : '0 / 9', '분류', cB.counts().placed + ' / 12']);
    } else if (S.view === 'crater') {
      setReadouts(['지금 구역', REG[S.reg].n, '센 충돌구', regCount(S.reg) + '개', '세 구역 합', S.stk.reduce((a, s) => a + s.size, 0) + '개']);
    } else if (S.view === 'atmo') {
      const b = BANDS[bandOf(S.lx)];
      setReadouts(['파장 λ', lamStr(S.lx), '파장대', b.n, '대기 투과율 T', f0(trans(S.lx) * 100) + ' %']);
    } else if (S.view === 'res') {
      const th = thetaArc(S.lam, S.D);
      setReadouts(['분해능 θ', (th < 0.1 ? f3(th) : f2(th)) + '″', '지상 상의 폭', f2(Math.sqrt(SEEING * SEEING + th * th)) + '″', '두 별 각도', f2(S.sep) + '″']);
    } else if (S.view === 'korea') {
      setReadouts(['이은 카드', korDone() + ' / 4', '정지궤도 주기', '24시간', '아리랑 (700 km)', '약 99분']);
    } else {
      const c = cD.counts();
      setReadouts(['분류', c.placed + ' / 10', '내 입장', S.stance >= 0 ? STANCE[S.stance] : '—', '고른 근거', S.evid >= 0 ? ARGS[S.evid].label : '—']);
    }
  }

  /* ================= 루프 ================= */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.findT > 0) S.findT -= dt;
    view.apply();
    switch (S.view) {
      case 'map': drawMap(dt, t); break;
      case 'board': drawBoard(dt, t); break;
      case 'crater': drawCrater(dt, t); break;
      case 'atmo': drawAtmo(dt, t); break;
      case 'res': drawRes(dt, t); break;
      case 'korea': drawKorea(dt, t); break;
      default: drawDebate(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, DEST, METH, CARDS, REG, REGIONS, BANDS, ARGS, KOREA, KOREA_R, cB, cD, get game() { return game; },
    setView, sendProbe, boardRecv, boardReset, updateCtl, trans, thetaArc, korDown, LK, lcRect, rcRect, LM, LB, LC, LD, LA, LR, lamStr, atmoSet, boardOpened, regCount,
  };
})();
