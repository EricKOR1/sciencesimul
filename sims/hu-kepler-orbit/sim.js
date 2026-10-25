/* =========================================================
   행성우주과학 Ⅰ. 우주탐사와 행성계 - 타원 궤도와 면적 속도 (2차시)
   성취기준 [12행우01-03] 태양계를 지배하는 힘이 태양의 중력임을 이해하고, 케플러의 세 가지 법칙을 이용하여 태양계 구성 천체들의 운동을 설명할 수 있다. (제1·2법칙)
   ① 관찰: 태양의 중력 (질량 비교 막대, 중력 끄기, 목성/태양 중력비)
   ② 탐구: 타원 궤도 (핀과 줄, 이심률 e = c/a, 근일점 q = a(1-e), 원일점 Q = a(1+e))
   ③ 탐구: 면적 속도 (같은 시간 부채꼴, r × v⊥ 일정)
   ④ 적용: 혜성 궤도 (핼리 혜성, 원일점 속력)
   다루지 않음: 궤도 에너지식(vis-viva)의 유도, 쌍곡선·포물선 궤도, 섭동, 타원 방정식의 미적분 유도.
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


  initStage('#e8eef8', 800, 620, 480, 820, 1.25);
  if (PHONE) view.canvas.style.touchAction = 'pan-y';

  /* ================= 자료 ================= */
  const PL = [
    { n: '수성', a: 0.387, e: 0.206, c: '#a8a29e' }, { n: '금성', a: 0.723, e: 0.007, c: '#f2c46d' }, { n: '지구', a: 1.0, e: 0.017, c: '#3b82f6' },
    { n: '화성', a: 1.524, e: 0.093, c: '#ef6a4a' }, { n: '목성', a: 5.203, e: 0.049, c: '#e0a96d' }, { n: '토성', a: 9.537, e: 0.057, c: '#d9c27a' },
    { n: '천왕성', a: 19.19, e: 0.046, c: '#7dd3fc' }, { n: '해왕성', a: 30.07, e: 0.009, c: '#3b82f6' },
  ];
  const V1AU = 29.78;                               // a = 1 AU 원 궤도 속력 (km/s) = 2π AU / 1 년
  const MASS = [{ n: '목성', v: 317.8, c: '#e0a96d' }, { n: '토성', v: 95.2, c: '#d9c27a' }, { n: '해왕성', v: 17.1, c: '#3b82f6' }, { n: '천왕성', v: 14.5, c: '#7dd3fc' }, { n: '지구형 4개', v: 1 + 0.815 + 0.107 + 0.055, c: '#a8a29e' }];
  const MTOT = MASS.reduce((s, m) => s + m.v, 0);
  const JUP_SUN = 1 / 1047, D_JUP = 4.2;
  const RATIO = JUP_SUN / (D_JUP * D_JUP);          // 목성 중력 / 태양 중력 (지구가 받는 힘 비)
  const HALLEY = { a: 17.8, e: 0.967 };
  const VQ_HALLEY = 54.5;                           // 핼리 혜성 근일점 속력 (km/s), a = 17.8 AU, e = 0.967
  const qOf = (a, e) => a * (1 - e), QOf = (a, e) => a * (1 + e);
  const speedAt = (r, a) => V1AU * Math.sqrt(Math.max(0, 2 / r - 1 / a));
  function kepE2(M, e) { M = ((M % TAU) + TAU) % TAU; let E = e > 0.8 ? Math.PI : M + e * Math.sin(M); for (let i = 0; i < 30; i++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-10) break; } return E; }
  const kpos = (M, e, a) => { const E = kepE2(M, e); return { x: a * (Math.cos(E) - e), y: a * Math.sqrt(1 - e * e) * Math.sin(E), E }; };
  /* 같은 시간(1/12 주기) 동안 쓸고 가는 넓이 (타원 전체에 대한 비율), 직접 수치 적분 */
  function sectorFrac(M0, e) {
    const n = 96, pts = [];
    for (let i = 0; i <= n; i++) pts.push(kpos(M0 + (30 * DEG) * i / n, e, 1));
    let A = 0; for (let i = 0; i < n; i++) A += (pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y) / 2;
    return A / (Math.PI * Math.sqrt(1 - e * e));
  }
  function arcLen(M0, e) {                           // a = 1 AU 모형에서 한 달 동안 이동한 거리 (AU)
    const n = 96; let L = 0, p = kpos(M0, e, 1);
    for (let i = 1; i <= n; i++) { const q = kpos(M0 + (30 * DEG) * i / n, e, 1); L += Math.hypot(q.x - p.x, q.y - p.y); p = q; }
    return L;
  }
  const secKind = (M0) => { const c = Math.cos(M0 + 15 * DEG); return c > 0.5 ? 'near' : c < -0.5 ? 'far' : 'mid'; };
  const KIND = { near: '근일점 쪽', far: '원일점 쪽', mid: '중간' };
  const sci5 = (x) => { const e = Math.floor(Math.log10(x)); return (Math.round(x / Math.pow(10, e) * 10) / 10).toFixed(1) + '×10' + String(e).split('').map((c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c])).join(''); };

  /* ================= 상태 ================= */
  const R0 = PHONE ? 100 : 140;
  const S = {
    view: 'grav', clock: 0, fade: 0,
    // ① 중력
    g: { on: true, vk: 1.0, x: R0, y: 0, vx: 0, vy: 0, trail: [], offT: 0, dist: R0, hitSun: false },
    // ② 타원
    a: 2.0, e: 0.3, ad: 2.0, ed: 0.3, E: 0, pl: -1, plSeen: {},
    // ③ 면적 속도
    e3: 0.6, M3: 0, play3: true, sec: [], paint: null, jump: null,
    // ④ 혜성
    a4: HALLEY.a, e4: HALLEY.e, M4: Math.PI * 0.12, play4: true, zoom: false, kd: 1, trail4: [], visitedQ: false,
    flags: { calcRatio: false, calcRV: false, calcVq: false, hideAns: false },
  };
  let game = null;
  const VIEW_LABEL = { grav: '☀ 태양의 중력', ellipse: '📍 타원 궤도 (제1법칙)', area: '⏱ 같은 시간, 같은 넓이 (제2법칙)', comet: '☄️ 핼리 혜성 궤도' };
  const modeBtns = $$('#modeSeg button');
  const grBoot = () => {
    const g = S.g; g.on = true; g.x = R0; g.y = 0; const GMv = gmOf(); g.vx = 0; g.vy = g.vk * Math.sqrt(GMv / R0); g.trail = []; g.offT = 0; g.dist = R0; g.hitSun = false;
  };
  const gmOf = () => { const w = TAU / 7; return w * w * R0 * R0 * R0; };    // 원 궤도 주기 7초
  grBoot();

  const rct = (L) => L;
  const spaceBox = (r, t, o) => { spaceBg(r.x, r.y, r.w, r.h, t, o && o.top, o && o.bottom); };
  const outlineT = (x, y, s, size, color, align) => T(x, y, s, size, color || '#e2e8f0', align || 'left', 800, { stroke: 'rgba(5,10,30,.75)', strokeWidth: 4 });

  /* ---------- ① 태양의 중력 ---------- */
  function LG() {
    if (PHONE) return { A: { x: 8, y: 8, w: 464, h: 340 }, B: { x: 8, y: 356, w: 464, h: 182 }, C: { x: 8, y: 546, w: 464, h: 266 } };
    return { A: { x: 10, y: 8, w: 520, h: 414 }, B: { x: 540, y: 8, w: 250, h: 414 }, C: { x: 10, y: 432, w: 780, h: 178 } };
  }
  function gStep(dt) {
    const g = S.g, GM = gmOf();
    if (g.hitSun) return;
    const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
    for (let i = 0; i < n; i++) {
      if (g.on) {
        let r2 = g.x * g.x + g.y * g.y, r3 = Math.pow(r2, 1.5);
        g.vx -= GM * g.x / r3 * h / 2; g.vy -= GM * g.y / r3 * h / 2;
        g.x += g.vx * h; g.y += g.vy * h;
        r2 = g.x * g.x + g.y * g.y; r3 = Math.pow(r2, 1.5);
        g.vx -= GM * g.x / r3 * h / 2; g.vy -= GM * g.y / r3 * h / 2;
      } else { g.x += g.vx * h; g.y += g.vy * h; }
    }
    g.dist = Math.hypot(g.x, g.y);
    if (!g.on) g.offT += dt;
    if (g.dist < 13) { g.hitSun = true; }
    if (g.dist > 1500) { grBoot(); }
    if (!g.trail.length || Math.hypot(g.trail[g.trail.length - 1][0] - g.x, g.trail[g.trail.length - 1][1] - g.y) > 3) { g.trail.push([g.x, g.y]); if (g.trail.length > 420) g.trail.shift(); }
  }
  const massStr = (p) => (p >= 1 ? f1(p) : p >= 0.1 ? f2(p) : f3(p));
  function drawGrav(dt, t) {
    const L = LG(), A = L.A, g = S.g;
    spaceBox(A, t);
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2 + 6;
    ctx.strokeStyle = 'rgba(147,197,253,.28)'; ctx.setLineDash([5, 7]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // 자취
    ctx.strokeStyle = 'rgba(125,211,252,.75)'; ctx.lineWidth = 2.5; ctx.beginPath(); g.trail.forEach((p, i) => (i ? ctx.lineTo(cx + p[0], cy + p[1]) : ctx.moveTo(cx + p[0], cy + p[1]))); ctx.stroke();
    sunDraw(cx, cy, PHONE ? 13 : 16);
    const px = cx + g.x, py = cy + g.y, pr = PHONE ? 7.5 : 9;
    // 중력 화살표 (거리의 제곱에 반비례해 길어졌다 짧아져요)
    if (g.on && !g.hitSun) {
      const r = Math.max(g.dist, 1), Fl = clamp(R0 * R0 / (r * r) * (PHONE ? 30 : 42), 8, 110);
      D.arrow(px, py, px - g.x / r * Fl, py - g.y / r * Fl, { color: '#fb7185', width: 4, head: 11 });
      outlineT(px - g.x / r * Fl * 0.5 + (g.y / r) * 14, py - g.y / r * Fl * 0.5 - (g.x / r) * 14, '중력 F', 13, '#fda4af', 'center');
    }
    // 속도 화살표
    const sp = Math.hypot(g.vx, g.vy), vk = (PHONE ? 0.3 : 0.3) * sp;
    if (!g.hitSun && sp > 1) { D.arrow(px, py, px + g.vx / sp * Math.min(vk, 130), py + g.vy / sp * Math.min(vk, 130), { color: '#fde047', width: 4, head: 11 }); }
    D.sphere(px, py, pr, '#3b82f6', { gloss: true });
    if (g.hitSun) { D.label(cx, cy - 36, '태양에 떨어졌어요! ↺ 다시 출발', { bg: '#dc2626', size: 13.5, pad: 10 }); }
    ctx.restore();
    outlineT(A.x + 12, A.y + 24 * FS, '위에서 본 행성과 태양 (지구와 비슷한 모형)', 14);
    D.label(A.x + A.w - 12, A.y + 24 * FS + 24, g.on ? '☀ 태양 중력 ON' : '☀ 태양 중력 OFF → 직진!', { bg: g.on ? '#16a34a' : '#dc2626', size: 13.5, pad: 10, align: 'right' });
    if (!g.on) outlineT(A.x + 12, A.y + A.h - 14, '힘이 없으면 속도는 그대로 → 접선 방향으로 직진 (관성)', 13, '#fde68a');
    // 정보
    const B = L.B; panel(B.x, B.y, B.w, B.h, { fill: 'rgba(255,255,255,.97)' });
    T(B.x + 12, B.y + 26 * FS, '🔎 지금 상태', 15, '#1e293b', 'left', 800);
    T(B.x + 12, B.y + 54 * FS, '태양 중력  ' + (g.on ? '있음' : '없음'), 14, g.on ? '#15803d' : '#b91c1c', 'left', 800);
    T(B.x + 12, B.y + 80 * FS, '접선 속도  ' + f2(g.vk) + ' × (원 궤도 속력)', 13.5, '#334155', 'left', 800);
    T(B.x + 12, B.y + 106 * FS, '태양까지 거리 r  ' + f2(g.dist / R0) + ' R', 13.5, '#1d4ed8', 'left', 800);
    drawWrap(B.x + 12, B.y + 134 * FS, '중력이 있으면 접선 속도 때문에 행성은 계속 "떨어지면서 옆으로" 움직여 태양 둘레를 돌아요. 중력을 끄면 곧장 날아가요.', B.w - 24, 13, { color: '#475569' });
    // 질량 비교 막대 (축척대로)
    const C = L.C; panel(C.x, C.y, C.w, C.h, { fill: 'rgba(255,255,255,.97)' });
    const bx = C.x + 14, bw = C.w - 28;
    T(bx, C.y + 24 * FS, '태양계 전체 질량에서 차지하는 비율 (눈금대로 그렸어요)', 13.5, '#1e293b', 'left', 800);
    const y1 = C.y + 36 * FS;
    ctx.fillStyle = '#e2e8f0'; rr(bx, y1, bw, 22, 6).fill();
    ctx.save(); rr(bx, y1, bw, 22, 6).clip(); ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx, y1, bw * 0.9986, 22); ctx.fillStyle = '#334155'; ctx.fillRect(bx + bw * 0.9986, y1, Math.max(bw * 0.0014, 1), 22); ctx.restore();
    T(bx + 10, y1 + 16, '태양 99.86 %', 13.5, '#422006', 'left', 800);
    // 확대 선
    const y2 = y1 + 44 * FS;
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(bx + bw * 0.9993, y1 + 22); ctx.lineTo(bx + bw, y2); ctx.moveTo(bx + bw * 0.9993, y1 + 22); ctx.lineTo(bx, y2); ctx.stroke(); ctx.setLineDash([]);
    T(bx + bw * 0.5, y1 + 36 * FS, '▲ 나머지 0.14 % (행성 전부)를 확대해 100 %로 그렸어요', 12.5, '#475569', 'center', 800);
    let xx = bx;
    ctx.save(); rr(bx, y2, bw, 22, 6).clip();
    MASS.forEach((m) => { const w = bw * m.v / MTOT; ctx.fillStyle = m.c; ctx.fillRect(xx, y2, w, 22); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(xx, y2, 1, 22); if (w > 70) T(xx + w / 2, y2 + 16, m.n + ' ' + f0(m.v / MTOT * 100) + ' %', 13, '#1e293b', 'center', 800); xx += w; });
    ctx.restore();
    const ly = y2 + 22 + 18 * FS;
    T(bx, ly, '토성 ' + f0(MASS[1].v / MTOT * 100) + ' % · 해왕성 ' + f1(MASS[2].v / MTOT * 100) + ' % · 천왕성 ' + f1(MASS[3].v / MTOT * 100) + ' % · 지구형 행성 ' + f1(MASS[4].v / MTOT * 100) + ' %', 12.5, '#475569', 'left', 700);
    // 계산 정보
    const cy2 = ly + 22 * FS;
    T(bx, cy2, '목성의 질량은 태양의 1/1047 (0.095 %). 지구에서 목성까지 가장 가까울 때 d = 4.2 AU', PHONE ? 12.5 : 13.5, '#1d4ed8', 'left', 800);
    if (!S.flags.hideAns || (game && game.free)) T(bx, cy2 + 22 * FS, '지구가 받는 힘의 비: F목성 / F태양 = (1/1047) ÷ 4.2² = ' + sci5(RATIO) + ' (약 0.005 %)', PHONE ? 12.5 : 13.5, '#b45309', 'left', 800);
    else T(bx, cy2 + 22 * FS, '지구가 받는 힘의 비 F목성 / F태양 은? (F는 M / d²에 비례, 지구–태양 거리 1 AU)', PHONE ? 12.5 : 13.5, '#b45309', 'left', 800);
  }

  /* ---------- ② 타원 궤도 ---------- */
  function LE() {
    if (PHONE) return { A: { x: 8, y: 8, w: 464, h: 330 }, T: { x: 8, y: 346, w: 464, h: 262 }, B: { x: 8, y: 616, w: 464, h: 196 } };
    return { A: { x: 10, y: 8, w: 520, h: 400 }, T: { x: 540, y: 8, w: 250, h: 400 }, B: { x: 10, y: 416, w: 780, h: 194 } };
  }
  function dimLine(x1, x2, y, color, label) {
    ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.moveTo(x1, y - 5); ctx.lineTo(x1, y + 5); ctx.moveTo(x2, y - 5); ctx.lineTo(x2, y + 5); ctx.stroke();
    if (Math.abs(x2 - x1) > 18) outlineT((x1 + x2) / 2, y + 17, label, 13, color, 'center');
  }
  function drawEllipse(dt, t) {
    const L = LE(), A = L.A;
    S.ad = approach(S.ad, S.a, dt, 9); S.ed = approach(S.ed, S.e, dt, 9);
    const a = S.ad, e = S.ed, b = a * Math.sqrt(1 - e * e), c = a * e;
    spaceBox(A, t);
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    const k = Math.min((A.w / 2 - 44) / a, (A.h / 2 - 78) / Math.max(b, 0.05)), cx = A.x + A.w / 2, cy = A.y + A.h / 2 - 12;
    const apx = a * k, bpx = b * k, cpx = c * k, sunX = cx + cpx, f2X = cx - cpx;
    // 타원
    ctx.strokeStyle = 'rgba(125,211,252,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, apx, bpx, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(56,189,248,.06)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx - apx - 18, cy); ctx.lineTo(cx + apx + 18, cy); ctx.stroke(); ctx.setLineDash([]);
    // 줄과 연필
    S.E += dt * 0.9; const Ei = S.E, pX = cx + apx * Math.cos(Ei), pY = cy - bpx * Math.sin(Ei);
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sunX, cy); ctx.lineTo(pX, pY); ctx.lineTo(f2X, cy); ctx.stroke();
    // 핀
    [[sunX, '태양'], [f2X, '빈 초점']].forEach(([x, s], i) => {
      if (i === 0) sunDraw(x, cy, 11); else { D.sphere(x, cy, 6, '#94a3b8', { gloss: true }); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 5, cy - 5); ctx.lineTo(x + 5, cy + 5); ctx.moveTo(x + 5, cy - 5); ctx.lineTo(x - 5, cy + 5); ctx.stroke(); }
    });
    if (c * k > 26 || true) { outlineT(sunX, cy - 20, '태양 (초점)', 13, '#fde68a', 'center'); if (cpx > 30) outlineT(f2X, cy - 16, '빈 초점', 13, '#cbd5e1', 'center'); }
    D.sphere(pX, pY, 5, '#f87171', { gloss: false, outline: '#fff', outlineWidth: 1.5 });
    outlineT(cx + apx + 6, cy - 12, '근일점', 13, '#93c5fd', 'left'); outlineT(cx - apx - 6, cy - 12, '원일점', 13, '#fdba74', 'right');
    D.sphere(cx + apx, cy, 4, '#60a5fa', { gloss: false }); D.sphere(cx - apx, cy, 4, '#fb923c', { gloss: false });
    // 길이 표시 (축 아래)
    const dy = cy + Math.min(bpx, 120) * 0.0 + 30;
    const yd = cy + bpx + 26 > A.y + A.h - 60 ? A.y + A.h - 60 : cy + bpx + 26;
    dimLine(sunX, cx + apx, yd, '#60a5fa', 'q = a(1 − e)');
    dimLine(cx - apx, sunX, yd + 26, '#fb923c', 'Q = a(1 + e)');
    if (cpx > 10) dimLine(cx, sunX, yd - 26 < cy + 14 ? cy + 26 : yd - 26, '#4ade80', 'c');
    // 축척
    const unit = a > 1.4 ? 1 : 0.5;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(A.x + 14, A.y + A.h - 16); ctx.lineTo(A.x + 14 + unit * k, A.y + A.h - 16); ctx.stroke();
    outlineT(A.x + 14 + unit * k + 8, A.y + A.h - 11, unit + ' AU', 13, '#fff', 'left');
    ctx.restore();
    outlineT(A.x + 12, A.y + 24 * FS, '핀 두 개와 줄로 타원 그리기', 14);
    outlineT(A.x + 12, A.y + 46 * FS, '줄 길이 = 2a (일정), 핀 사이 = 2c', 13, '#cbd5e1');
    // 표
    const Tb = L.T; panel(Tb.x, Tb.y, Tb.w, Tb.h, { fill: 'rgba(255,255,255,.97)' });
    T(Tb.x + 12, Tb.y + 24 * FS, '🪐 행성의 이심률 e', 14.5, '#1e293b', 'left', 800);
    const rh = PHONE ? 28 : 38, y0 = Tb.y + 42 * FS;
    T(Tb.x + 40, y0 + 4, '행성', 12.5, '#64748b', 'left', 800); T(Tb.x + Tb.w * 0.62, y0 + 4, 'a (AU)', 12.5, '#64748b', 'center', 800); T(Tb.x + Tb.w - 14, y0 + 4, 'e', 12.5, '#64748b', 'right', 800);
    PL.forEach((p, i) => {
      const yy = y0 + 12 + i * rh, sel = S.pl === i;
      if (sel) { ctx.fillStyle = 'rgba(14,165,233,.16)'; rr(Tb.x + 6, yy - 2, Tb.w - 12, rh - 3, 8).fill(); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; rr(Tb.x + 6, yy - 2, Tb.w - 12, rh - 3, 8).stroke(); }
      D.sphere(Tb.x + 22, yy + rh / 2 - 3, 6, p.c, { gloss: false });
      T(Tb.x + 36, yy + rh / 2 + 2, p.n, 14, '#1e293b', 'left', 800);
      T(Tb.x + Tb.w * 0.62, yy + rh / 2 + 2, String(p.a), 13.5, '#475569', 'center', 700);
      T(Tb.x + Tb.w - 14, yy + rh / 2 + 2, f3(p.e), 14, '#c2410c', 'right', 800);
    });
    T(Tb.x + 12, Tb.y + Tb.h - 12, '행을 누르면 그 행성의 e로 모양을 보여 줘요', 12.5, '#64748b', 'left', 700);
    // 아래 계산 칸
    const B = L.B; panel(B.x, B.y, B.w, B.h, { fill: 'rgba(255,255,255,.97)' });
    const q = qOf(S.a, S.e), Q = QOf(S.a, S.e), cc = S.a * S.e;
    T(B.x + 14, B.y + 26 * FS, 'a = ' + f2(S.a) + ' AU    c = a × e = ' + f2(cc) + ' AU    e = c / a = ' + f2(S.e), PHONE ? 13 : 15, '#1e293b', 'left', 800);
    T(B.x + 14, B.y + 54 * FS, '근일점 q = a(1 − e) = ' + f2(q) + ' AU', 14.5, '#1d4ed8', 'left', 800);
    T(B.x + 14, B.y + 80 * FS, '원일점 Q = a(1 + e) = ' + f2(Q) + ' AU', 14.5, '#c2410c', 'left', 800);
    // 막대: 원일점 거리 Q + 근일점 거리 q = 2a (같은 눈금)
    const bx = B.x + 14, bw = B.w - 28, ks = bw / 6.4, by = B.y + 100 * FS;
    ctx.fillStyle = '#e2e8f0'; rr(bx, by, bw, 20, 6).fill();
    ctx.save(); rr(bx, by, bw, 20, 6).clip(); ctx.fillStyle = '#fb923c'; ctx.fillRect(bx, by, Q * ks, 20); ctx.fillStyle = '#60a5fa'; ctx.fillRect(bx + Q * ks, by, q * ks, 20); ctx.restore();
    if (Q * ks > 60) T(bx + Q * ks / 2, by + 15, 'Q', 13, '#fff', 'center', 800);
    if (q * ks > 40) T(bx + Q * ks + q * ks / 2, by + 15, 'q', 13, '#fff', 'center', 800);
    T(bx, by + 38 * FS, '눈금 0 ~ 6.4 AU: Q + q = 2a = ' + f2(2 * S.a) + ' AU (주황 + 파랑)', 12.5, '#64748b', 'left', 700);
    drawWrap(B.x + 14, by + 60 * FS, 'e가 0이면 원, 클수록 길쭉해요. 태양은 타원의 한 초점에 있어요(중심이 아니에요).', B.w - 28, 12.5, { color: '#475569' });
  }
  function tableClick(p) {
    const L = LE(), Tb = L.T, rh = PHONE ? 28 : 38, y0 = Tb.y + 42 * FS;
    if (p.x < Tb.x || p.x > Tb.x + Tb.w) return false;
    for (let i = 0; i < PL.length; i++) { const yy = y0 + 12 + i * rh; if (p.y >= yy - 2 && p.y <= yy + rh - 3) { pickPlanet(i); return false; } }
    return false;
  }
  function pickPlanet(i) {
    S.pl = i; S.plSeen[i] = true; S.e = PL[i].e; setSlider($('#sE'), $('#oE'), PL[i].e, (v) => f2(v)); $('#oE').textContent = f3(PL[i].e); Sound.click(); updateCtl();
  }

  /* ---------- ③ 면적 속도 ---------- */
  function LA3() {
    if (PHONE) return { A: { x: 8, y: 8, w: 464, h: 360 }, P: { x: 8, y: 376, w: 464, h: 190 }, B: { x: 8, y: 574, w: 464, h: 238 } };
    return { A: { x: 10, y: 8, w: 520, h: 414 }, P: { x: 540, y: 8, w: 250, h: 414 }, B: { x: 10, y: 432, w: 780, h: 178 } };
  }
  const SEC_COL = ['rgba(248,113,113,.62)', 'rgba(96,165,250,.62)', 'rgba(74,222,128,.62)', 'rgba(251,191,36,.62)', 'rgba(192,132,252,.62)', 'rgba(45,212,191,.62)'];
  const mod2pi = (x) => ((x % TAU) + TAU) % TAU;
  function areaStep(dt) {
    if (S.jump) {
      S.M3u = approach(S.M3u, S.jump.tgt, dt, 4.5);
      if (Math.abs(S.M3u - S.jump.tgt) < 0.01) { S.M3u = S.jump.tgt; const j = S.jump; S.jump = null; if (j.paint) startPaint(); }
    } else if (S.play3) S.M3u += dt * TAU / 12;
    S.M3 = mod2pi(S.M3u);
    if (S.paint) {
      const pr = (S.M3u - S.paint.u0) / (30 * DEG);
      if (pr >= 1) { S.sec.push({ M0: mod2pi(S.paint.u0), col: S.secIdx++ % 6 }); S.paint = null; updateCtl(); Sound.success(); }
    }
  }
  S.M3u = 0; S.secIdx = 0;
  function startPaint() { if (S.paint || S.sec.length >= 6) { if (S.sec.length >= 6) showHint('부채꼴은 여섯 개까지예요. 🗑 지우기를 눌러요.', 2600); return; } S.paint = { u0: S.M3u }; if (!S.play3) { S.play3 = true; } updateCtl(); }
  function jumpPaint(kind) {
    if (S.paint || S.jump) return;
    const M0 = kind === 'near' ? -15 * DEG : 165 * DEG;
    let tgt = S.M3u + mod2pi(M0 - S.M3u); if (tgt - S.M3u < 0.05) tgt += 0;
    S.jump = { tgt, paint: true }; S.play3 = true; updateCtl();
  }
  function drawArea(dt, t) {
    const L = LA3(), A = L.A; areaStep(dt);
    spaceBox(A, t);
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    const e = S.e3, apx = PHONE ? 196 : 212, bpx = apx * Math.sqrt(1 - e * e), cx = A.x + A.w / 2, cy = A.y + A.h / 2 - 4, sunX = cx + e * apx, sunY = cy;
    const P = (M) => { const q = kpos(M, e, 1); return [sunX + q.x * apx, sunY - q.y * apx]; };
    ctx.strokeStyle = 'rgba(147,197,253,.7)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(cx, cy, apx, bpx, 0, 0, TAU); ctx.stroke();
    const drawSec = (M0, frac, col) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sunX, sunY);
      const n = Math.max(2, Math.ceil(40 * frac)); for (let j = 0; j <= n; j++) { const q = P(M0 + 30 * DEG * frac * j / n); ctx.lineTo(q[0], q[1]); }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.4; ctx.stroke();
    };
    S.sec.forEach((s, i) => {
      drawSec(s.M0, 1, SEC_COL[s.col]);
      const mq = P(s.M0 + 15 * DEG), lx = sunX + (mq[0] - sunX) * 0.58, ly = sunY + (mq[1] - sunY) * 0.58;
      D.label(lx, ly, String(i + 1), { bg: 'rgba(15,23,42,.82)', size: 13, pad: 6 });
    });
    if (S.paint) { const fr = clamp((S.M3u - S.paint.u0) / (30 * DEG), 0, 1); drawSec(mod2pi(S.paint.u0), fr, 'rgba(250,250,250,.38)'); }
    // 행성
    const E = kepE2(S.M3, e), q = kpos(S.M3, e, 1), pp = P(S.M3), r = Math.hypot(q.x, q.y);
    const den = 1 - e * Math.cos(E), vx = -Math.sin(E) / den, vy = Math.sqrt(1 - e * e) * Math.cos(E) / den, vs = Math.hypot(vx, vy);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sunX, sunY); ctx.lineTo(pp[0], pp[1]); ctx.stroke(); ctx.setLineDash([]);
    sunDraw(sunX, sunY, 10);
    D.arrow(pp[0], pp[1], pp[0] + vx / vs * vs * 50, pp[1] - vy / vs * vs * 50, { color: '#fde047', width: 3.5, head: 10 });
    D.sphere(pp[0], pp[1], 8, '#3b82f6', { gloss: true });
    // 근일점·원일점 표시
    outlineT(cx + apx - 4, cy + 20, '근일점', 13, '#93c5fd', 'right'); outlineT(cx - apx + 4, cy + 20, '원일점', 13, '#fdba74', 'left');
    if (S.jump) outlineT(cx, A.y + A.h - 14, '이동 중…', 13, '#fde68a', 'center');
    ctx.restore();
    outlineT(A.x + 12, A.y + 24 * FS, '같은 시간(한 달)에 쓸고 가는 넓이 · 이심률 e = ' + f2(e) + ' 모형', PHONE ? 12.5 : 14);
    outlineT(A.x + 12, A.y + A.h - 14, '노란 화살표 = 속도 (길이 ∝ 속력)', 13, '#fde68a');
    // 오른쪽 목록
    const Pn = L.P; panel(Pn.x, Pn.y, Pn.w, Pn.h, { fill: 'rgba(255,255,255,.97)' });
    T(Pn.x + 12, Pn.y + 24 * FS, '색칠한 부채꼴 (한 달 = T/12)', 14, '#1e293b', 'left', 800);
    const rh = PHONE ? 25 : 32;
    S.sec.forEach((s, i) => {
      const yy = Pn.y + 36 * FS + i * rh + 6;
      ctx.fillStyle = SEC_COL[s.col].replace('.62', '.95'); rr(Pn.x + 12, yy - 13, 18, 18, 5).fill(); T(Pn.x + 21, yy + 1, String(i + 1), 13, '#0f172a', 'center', 800);
      T(Pn.x + 38, yy + 2, KIND[secKind(s.M0)] + ' · 넓이 ' + f1(sectorFrac(s.M0, e) * 100) + ' %', PHONE ? 13 : 13.5, '#1e293b', 'left', 800);
      if (!PHONE) T(Pn.x + 38, yy + 18, '한 달 이동 거리 ' + f2(arcLen(s.M0, e)) + ' AU', 12.5, '#64748b', 'left', 700);
      else T(Pn.x + Pn.w - 10, yy + 2, f2(arcLen(s.M0, e)) + ' AU', 13, '#64748b', 'right', 700);
    });
    if (!S.sec.length) drawWrap(Pn.x + 12, Pn.y + 62 * FS, '아래 버튼으로 근일점 쪽과 원일점 쪽에서 한 달 동안 쓸고 가는 넓이를 색칠해 봐요.', Pn.w - 24, 13, { color: '#64748b' });
    else if (S.sec.length >= 2) T(Pn.x + 12, Pn.y + Pn.h - 12, '모양은 달라도 넓이는 모두 같아요 (1/12 = 8.3 %)', 12.5, '#15803d', 'left', 800);
    // 아래 계산 칸
    const B = L.B; panel(B.x, B.y, B.w, B.h, { fill: 'rgba(255,255,255,.97)' });
    const vperp = V1AU * Math.sqrt(1 - e * e) / r, rv = r * vperp, hide = S.flags.hideAns && !(game && game.free);
    T(B.x + 14, B.y + 24 * FS, '지금 행성 (a = 1 AU, T = 1 년 모형)', 14, '#1e293b', 'left', 800);
    T(B.x + 14, B.y + 50 * FS, 'r = ' + f2(r) + ' AU', 14, '#1d4ed8', 'left', 800);
    T(B.x + 14 + (PHONE ? 130 : 160), B.y + 50 * FS, 'v⊥ = ' + f1(vperp) + ' km/s', 14, '#c2410c', 'left', 800);
    T(B.x + 14, B.y + 76 * FS, 'r × v⊥ = ' + f1(rv) + ' AU·km/s', 14.5, '#15803d', 'left', 800);
    T(B.x + 14, B.y + 100 * FS, '← 행성이 어디에 있든 같아요!', 12.5, '#15803d', 'left', 700);
    const tx = PHONE ? B.x + 14 : B.x + 400, ty = PHONE ? B.y + 128 * FS : B.y + 24 * FS;
    T(tx, ty, '지구의 실제 값 (r: 태양까지 거리, v: 공전 속력)', PHONE ? 12.5 : 13.5, '#1e293b', 'left', 800);
    T(tx, ty + 26 * FS, '근일점 (1월 초)  r = 0.9833 AU, v = 30.3 km/s  →  r×v = ' + (hide ? '?' : f1(0.9833 * 30.3)), PHONE ? 12 : 12.5, '#334155', 'left', 700);
    T(tx, ty + 50 * FS, '원일점 (7월 초)  r = 1.0167 AU, v = 29.3 km/s  →  r×v = ' + (hide ? '?' : f1(1.0167 * 29.3)), PHONE ? 12 : 12.5, '#334155', 'left', 700);
    drawWrap(tx, ty + 76 * FS, '(v는 거의 r에 수직이라 r × v가 r × v⊥와 같아요.)', PHONE ? B.w - 28 : B.w - 414, 12, { color: '#64748b' });
  }
  const secHas = (k) => S.sec.some((s) => secKind(s.M0) === k);

  /* ---------- ④ 혜성 ---------- */
  function L4() {
    if (PHONE) return { A: { x: 8, y: 8, w: 464, h: 330 }, B: { x: 8, y: 346, w: 464, h: 466 } };
    return { A: { x: 10, y: 8, w: 780, h: 370 }, B: { x: 10, y: 388, w: 780, h: 222 } };
  }
  function cometStep(dt) {
    if (S.play4) S.M4 += dt * TAU / 16;
    S.kd = approach(S.kd, S.zoom ? 1 : 0, dt, 5);
  }
  function drawComet(dt, t) {
    const L = L4(), A = L.A; cometStep(dt);
    const a = S.a4, e = S.e4, b = a * Math.sqrt(1 - e * e), q = qOf(a, e), Q = QOf(a, e);
    spaceBox(A, t);
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    const kFull = Math.min((A.w - 70) / (2 * a), (A.h / 2 - 34) / Math.max(b, 0.02)), kZoom = Math.min(A.w / 2 - 24, A.h / 2 - 24) / 2.2;
    const z = S.kd, k = kFull * Math.pow(kZoom / kFull, z);
    const fx = (-a * e) * (1 - z), cx = A.x + A.w / 2, cy = A.y + A.h / 2;
    const X = (wx) => cx + (wx - fx) * k, Y = (wy) => cy - wy * k;
    // 행성 궤도 (기준)
    [[1, '지구 1 AU'], [5.2, '목성 5.2 AU'], [9.54, '토성'], [30.07, '해왕성 30 AU']].forEach(([r, s]) => {
      if (r * k < 5) return;
      ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.setLineDash([3, 5]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(X(0), Y(0), r * k, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      const lx = X(0) + r * k * 0.7071, ly = Y(0) - r * k * 0.7071;
      if (lx > A.x + 20 && lx < A.x + A.w - 50 && ly > A.y + 36 && ly < A.y + A.h - 10 && (r * k > 18)) outlineT(lx + 4, ly - 2, s, 12.5, '#94a3b8', 'left');
    });
    // 혜성 궤도
    ctx.strokeStyle = 'rgba(103,232,249,.85)'; ctx.lineWidth = 2.6; ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const E = TAU * i / 200, wx = a * (Math.cos(E) - e), wy = b * Math.sin(E); i ? ctx.lineTo(X(wx), Y(wy)) : ctx.moveTo(X(wx), Y(wy)); }
    ctx.stroke();
    sunDraw(X(0), Y(0), clamp(5 + 3 * z, 5, 11));
    // 근일점 · 원일점
    const pq = [X(q), Y(0)], pQ = [X(-Q), Y(0)];
    D.sphere(pq[0], pq[1], 3.5, '#60a5fa', { gloss: false }); D.sphere(pQ[0], pQ[1], 3.5, '#fb923c', { gloss: false });
    if (pq[0] > A.x && pq[0] < A.x + A.w) outlineT(Math.min(pq[0] + 8, A.x + A.w - 100) , pq[1] + 24, '근일점 ' + f2(q) + ' AU', 13, '#93c5fd', 'left');
    if (pQ[0] > A.x + 60 && pQ[0] < A.x + A.w) outlineT(pQ[0] + (PHONE ? 4 : 8), pQ[1] + 22, '원일점 ' + f1(Q) + ' AU', 13, '#fdba74', 'left');
    // 혜성
    const cp = kpos(S.M4, e, a), r = Math.hypot(cp.x, cp.y), sx = X(cp.x), sy = Y(cp.y);
    if (!S.trail4.length || Math.hypot(S.trail4[S.trail4.length - 1][0] - cp.x, S.trail4[S.trail4.length - 1][1] - cp.y) > 0.01 * a) { S.trail4.push([cp.x, cp.y]); if (S.trail4.length > 60) S.trail4.shift(); }
    // 꼬리: 태양 반대 방향, 가까울수록 길어요
    const tl = r < 4 ? clamp(34 / Math.max(r, 0.25), 0, 110) * Math.min(1, (4 - r) / 2) : 0;
    if (tl > 2) {
      const dx = (sx - X(0)), dy = (sy - Y(0)), dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
      const g = ctx.createLinearGradient(sx, sy, sx + ux * tl, sy + uy * tl); g.addColorStop(0, 'rgba(186,230,253,.9)'); g.addColorStop(1, 'rgba(186,230,253,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - uy * 4, sy + ux * 4); ctx.lineTo(sx + ux * tl, sy + uy * tl); ctx.lineTo(sx + uy * 4, sy - ux * 4); ctx.closePath(); ctx.fill();
    }
    D.glow(sx, sy, 14, '#bae6fd', 0.8); D.sphere(sx, sy, 3.6, '#ffffff', { gloss: false });
    if (Math.abs(r - q) < q * 0.15 + 0.02) S.visitedQ = true;
    ctx.restore();
    outlineT(A.x + 12, A.y + 24 * FS, (Math.abs(a - HALLEY.a) < 0.15 && Math.abs(e - HALLEY.e) < 0.006 ? '핼리 혜성' : '혜성') + ' 궤도 (눈금대로)', 14);
    outlineT(A.x + A.w - 12, A.y + 24 * FS, '꼬리는 태양 반대쪽', 13, '#bae6fd', 'right');
    // 아래 칸
    const B = L.B; panel(B.x, B.y, B.w, B.h, { fill: 'rgba(255,255,255,.97)' });
    const hide = S.flags.hideAns && !(game && game.free), bx = B.x + 14, ls = PHONE ? 26 : 22;
    T(bx, B.y + 24 * FS, 'a = ' + f1(a) + ' AU    e = ' + f3(e), PHONE ? 14 : 15, '#1e293b', 'left', 800);
    T(bx, B.y + 24 * FS + ls, '근일점 q = a(1 − e) = ' + f2(q) + ' AU', 14.5, '#1d4ed8', 'left', 800);
    T(bx, B.y + 24 * FS + 2 * ls, '원일점 Q = a(1 + e) = ' + f1(Q) + ' AU', 14.5, '#c2410c', 'left', 800);
    T(bx, B.y + 24 * FS + 3 * ls, '속력 비 v근일점 / v원일점 = Q / q = ' + f1(Q / q) + ' 배', 14.5, '#15803d', 'left', 800);
    const sp = speedAt(r, a);
    T(bx, B.y + 24 * FS + 4 * ls, '지금 r = ' + (r < 10 ? f2(r) : f1(r)) + ' AU,  속력 ' + (hide ? '?' : (sp < 10 ? f2(sp) : f1(sp))) + ' km/s', 14, '#334155', 'left', 800);
    const by = B.y + 24 * FS + 4 * ls + 14 * FS, bw = B.w - 28, ks = bw / 60;
    ctx.fillStyle = '#e2e8f0'; rr(bx, by, bw, 14, 6).fill();
    ctx.save(); rr(bx, by, bw, 14, 6).clip(); ctx.fillStyle = '#fb923c'; ctx.fillRect(bx, by, Math.min(Q * ks, bw), 14); ctx.fillStyle = '#60a5fa'; ctx.fillRect(bx, by, Math.min(q * ks, bw), 14); ctx.restore();
    T(bx, by + 30 * FS, '눈금 0 ~ 60 AU: 파랑 = q, 주황 = Q', 12.5, '#64748b', 'left', 700);
    drawWrap(bx, by + 50 * FS, '근일점에서는 r이 작아 v⊥가 아주 커요. 같은 시간에 쓸고 가는 넓이가 같으려면 근일점에서는 길고 가는 부채꼴이 돼요.', B.w - 28, 12.5, { color: '#475569' });
  }

  /* ================= 조작 · 화면 전환 ================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); }
    updateCtl();
  }
  const FREE = () => !!(game && game.free);
  function updateCtl() {
    const free = FREE();
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcRatio').hidden = !(S.view === 'grav' && (S.flags.calcRatio || free));
    $('#calcRV').hidden = !(S.view === 'area' && (S.flags.calcRV || free));
    $('#calcVq').hidden = !(S.view === 'comet' && (S.flags.calcVq || free));
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $('#bGrav').textContent = S.g.on ? '☀ 태양 중력 끄기' : '☀ 태양 중력 켜기';
    $('#bGrav').classList.toggle('btn-primary', S.g.on);
    $$('#grpPl .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.pl));
    $('#bPlay3').textContent = S.play3 ? '⏸ 멈춤' : '▶ 재생';
    $('#bPlay4').textContent = S.play4 ? '⏸ 멈춤' : '▶ 재생';
    const busy = !!(S.paint || S.jump);
    ['bNearP', 'bFarP', 'bPaint'].forEach((id) => { $('#' + id).disabled = busy; });
    $$('#grpZoom .opt').forEach((b) => b.classList.toggle('on', (b.dataset.k === 'z') === S.zoom));
  }
  modeBtns.forEach((b) => clickable(b, () => setView(b.dataset.view)));
  clickable($('#bGrav'), () => { S.g.on = !S.g.on; updateCtl(); });
  clickable($('#bGReset'), () => { grBoot(); updateCtl(); });
  bindSlider($('#sVk'), $('#oVk'), (v) => f2(v) + ' ×', (v) => { S.g.vk = v; grBoot(); updateCtl(); });
  bindSlider($('#sA'), $('#oA'), (v) => f1(v) + ' AU', (v) => { S.a = v; });
  bindSlider($('#sE'), $('#oE'), (v) => f2(v), (v) => { S.e = v; S.pl = -1; updateCtl(); });
  $$('#grpPl .opt').forEach((b) => clickable(b, () => pickPlanet(+b.dataset.k)));
  bindSlider($('#sE3'), $('#oE3'), (v) => f2(v), (v) => { S.e3 = v; S.sec = []; S.paint = null; updateCtl(); });
  clickable($('#bPlay3'), () => { S.play3 = !S.play3; updateCtl(); });
  clickable($('#bNearP'), () => jumpPaint('near'));
  clickable($('#bFarP'), () => jumpPaint('far'));
  clickable($('#bPaint'), startPaint);
  clickable($('#bSecClr'), () => { S.sec = []; S.paint = null; S.jump = null; updateCtl(); });
  bindSlider($('#sA4'), $('#oA4'), (v) => f1(v) + ' AU', (v) => { S.a4 = v; S.trail4 = []; });
  bindSlider($('#sE4'), $('#oE4'), (v) => f2(v), (v) => { S.e4 = v; S.trail4 = []; });
  clickable($('#bHalley'), () => { setHalley(); });
  clickable($('#bPlay4'), () => { S.play4 = !S.play4; updateCtl(); });
  $$('#grpZoom .opt').forEach((b) => clickable(b, () => { S.zoom = b.dataset.k === 'z'; updateCtl(); }));
  function setHalley() { S.a4 = HALLEY.a; S.e4 = HALLEY.e; S.trail4 = []; setSlider($('#sA4'), $('#oA4'), HALLEY.a, (v) => f1(v) + ' AU'); setSlider($('#sE4'), $('#oE4'), 0.97, (v) => f2(v)); $('#oE4').textContent = f3(HALLEY.e); updateCtl(); }
  function setSl(id, o, v, fmt) { setSlider($(id), $(o), v, fmt); }

  SciSim.pointer(view, {
    down(p) { if (S.view === 'ellipse') return tableClick(p); return false; },
    move() {}, up() {},
    hover(p) { if (S.view === 'ellipse') { const Tb = LE().T; return p.x > Tb.x && p.x < Tb.x + Tb.w ? 'pointer' : ''; } return ''; },
  });

  /* ================= 미션 ================= */
  const lvSet = (v) => () => setView(v);
  const levels = [
    {
      title: '태양의 중력: 왜 떨어지지 않을까', short: '태양의 중력', icon: '☀️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 행성은 왜 태양으로 떨어지지 않고, 타원을 돌면서 어디서 가장 빠를까?</p>' +
        '<div class="si-link">🔗 <b>역학과 에너지에서</b> 케플러 법칙과 만유인력을 배웠어요(제3법칙 T² ∝ r³, 제1·2법칙은 정성적으로). 이번 차시에서는 <b>태양의 중력</b>이 태양계를 지배함을 확인하고, 제1·2법칙을 <b>이심률과 면적 속도</b>로 정량적으로 알아봐요.</div>' +
        '<p>먼저 태양이 얼마나 무거운지 비교하고, 중력을 껐다 켜며 행성의 움직임이 어떻게 달라지는지 관찰해요.</p>',
      features: ['grav'],
      setup() { S.flags.calcRatio = false; S.flags.hideAns = false; grBoot(); S.g.vk = 1; setSl('#sVk', '#oVk', 1, (v) => f2(v) + ' ×'); setView('grav'); },
      recap: '태양계 질량의 99.86 %는 태양이에요. 행성은 태양의 중력을 받아 접선 방향 속도로 "떨어지며 옆으로" 돌아요. 다른 행성의 중력은 태양에 비해 아주 작아요.',
      summary: '<ul><li><b>태양은 태양계 전체 질량의 99.86 %</b>예요. 행성 전부를 합쳐도 0.14 %이고, 그중 목성이 약 71 %(전체의 0.095 %)예요. → 태양계를 지배하는 힘은 <b>태양의 중력</b>이에요.</li><li>태양 중력을 끄면 행성은 접선 방향으로 <b>직진</b>해요(관성). 중력이 있으면 접선 속도를 계속 안쪽으로 휘게 해서 태양 둘레를 돌아요.</li><li>목성이 지구에 가장 가까울 때(4.2 AU) 지구가 받는 목성의 중력은 태양의 F ∝ M / d²로 계산하면 (1/1047) ÷ 4.2² = <b>5.4×10⁻⁵</b>배(약 0.005 %). 그래서 행성의 운동은 태양 하나만 있는 것처럼 케플러 법칙으로 잘 설명돼요.</li></ul>',
      missions: [
        {
          title: '중력을 끄면 어떻게 될까?',
          goal: '행성이 돌고 있을 때 ☀ <b>태양 중력 끄기</b>를 눌러 행성이 어디로 가는지 관찰하세요. 원래 궤도 반지름의 <b>1.6배</b> 이상 멀어질 때까지 지켜봐요.',
          hint: '끄기 버튼을 누르면 행성이 접선 방향으로 곧장 날아가요. 멀어질 때까지 기다리세요. (↺ 다시 출발로 되돌릴 수 있어요.)',
          setup() { grBoot(); S.flags.calcRatio = false; setView('grav'); },
          check: () => !S.g.on && S.g.offT >= 0.8 && S.g.dist >= 1.6 * R0,
          hold: 0.3,
          status: () => mark(!S.g.on) + ' 중력 끄기 &nbsp; ' + mark(S.g.dist >= 1.6 * R0 && !S.g.on) + ' 멀어진 거리 ' + f2(S.g.dist / R0) + ' R / 1.6 R',
          explain: '중력이 없으면 행성은 <b>일직선으로 등속 운동</b>(관성)을 해요. 태양의 중력이 있어서 접선 방향의 속도가 계속 안쪽으로 휘어 <b>원이나 타원 궤도</b>가 만들어져요.',
        },
        {
          title: '목성의 중력은 태양의 몇 배?', manual: true,
          goal: '목성은 태양 질량의 1/1047이고, 지구에서 가장 가까울 때 <b>d = 4.2 AU</b>예요. 지구가 받는 <b>목성의 중력 ÷ 태양의 중력</b>을 <b>×10⁻⁵</b> 단위로 입력하세요. (지구–태양 거리는 1 AU, F는 M / d²에 비례)',
          hint: '비 = (M목성 ÷ 4.2²) ÷ (M태양 ÷ 1²) = (1/1047) ÷ 17.64예요. 계산 결과를 5.4×10⁻⁵처럼 쓰면 5.4를 입력해요.',
          setup() { S.flags.calcRatio = true; S.flags.hideAns = true; clrIn('inRatio'); setView('grav'); },
          check() {
            const x = numOf('inRatio');
            if (x == null) return '숫자를 입력해 주세요. (×10⁻⁵ 단위, 예: 3.2)';
            const ok = Math.abs(x - RATIO * 1e5) <= 0.3; fbIn('inRatio', ok);
            if (ok) return true;
            if (Math.abs(x - 95.5) < 4) return '거리의 효과를 빠뜨렸어요. 힘은 거리의 제곱에 반비례하므로 4.2²으로 나눠요.';
            if (Math.abs(x - 22.7) < 2) return '거리를 한 번만 나눴어요. 역제곱이므로 4.2를 두 번(4.2²) 나눠요.';
            if (x < 0.1) return '단위가 ×10⁻⁵예요. 5.4×10⁻⁵이면 5.4를 입력해요.';
            return '(1/1047) ÷ 4.2² = 9.55×10⁻⁴ ÷ 17.64 를 계산해 ×10⁻⁵ 단위로 바꿔요.';
          },
          status: () => '입력 ' + ($('#inRatio').value.trim() || '—') + ' ×10⁻⁵',
          explain: 'F목성 / F태양 = (1/1047) ÷ 4.2² = 9.55×10⁻⁴ ÷ 17.64 = <b>5.4×10⁻⁵</b>, 즉 태양 중력의 약 <b>0.005 %</b>예요. 가장 큰 행성인 목성도 이 정도이니, 행성의 운동은 태양의 중력만 있는 것처럼 설명돼요.',
        },
        {
          type: 'quiz', title: '행성이 태양으로 떨어지지 않는 까닭',
          goal: '태양이 행성을 계속 당기는데도 행성이 태양으로 떨어지지 않는 까닭은?',
          setup() { S.flags.hideAns = false; setView('grav'); },
          choices: ['접선 방향 속도가 있어서, 계속 떨어지면서도 옆으로 움직여 태양 둘레를 돌아요', '원심력이 중력과 균형을 이루어 알짜힘이 0이에요', '태양이 행성을 당기지 않기 때문이에요', '우주에는 공기가 없어서 행성이 멈추지 않기 때문이에요'],
          answer: 0,
          feedback: ['', '행성에 작용하는 힘은 태양의 중력뿐이에요. 이 힘이 구심력 역할을 해서 궤도를 휘게 해요. 균형이 아니에요.', '중력을 끄면 직진했었죠? 중력이 궤도를 휘게 해요.', '공기가 없는 것은 속도가 유지되는 이유지만, 궤도가 휘는 까닭은 중력이에요.'],
          explain: '행성은 중력 때문에 태양 쪽으로 계속 <b>떨어지고</b> 있지만, <b>접선 방향 속도</b> 때문에 옆으로도 움직여서 태양을 비껴 돌아요. 속도가 너무 작으면 태양에 떨어지고, 알맞으면 궤도를 돌아요.',
        },
      ],
    },
    {
      title: '타원 궤도: 이심률과 근일점·원일점', short: '타원 궤도', icon: '📍', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 중력 때문에 행성이 궤도를 돈다는 것을 확인했어요. 그 궤도는 원이 아니라 <b>태양을 한 초점으로 하는 타원</b>이에요(케플러 제1법칙).</div>' +
        '<p>핀 두 개와 줄로 타원을 그려 보며 <b>긴반지름 a</b>와 <b>이심률 e = c / a</b>를 알아보고, 태양에 가장 가까운 <b>근일점 q = a(1 − e)</b>와 가장 먼 <b>원일점 Q = a(1 + e)</b>를 계산해요.</p>',
      features: ['ellipse'],
      setup() { S.a = 2.0; S.e = 0.3; S.ad = 2.0; S.ed = 0.3; S.pl = -1; setSl('#sA', '#oA', 2, (v) => f1(v) + ' AU'); setSl('#sE', '#oE', 0.3, (v) => f2(v)); setView('ellipse'); },
      recap: '타원의 모양은 이심률 e = c / a로 나타내요. e가 0이면 원이고, q = a(1 − e), Q = a(1 + e)예요. 행성의 e는 모두 작아 원에 가까워요.',
      summary: '<ul><li><b>제1법칙</b>: 행성은 태양을 한 초점으로 하는 타원 궤도를 돌아요. 긴반지름 a, 초점 거리 c, <b>이심률 e = c / a</b>(원은 0, 클수록 길쭉).</li><li><b>근일점 거리 q = a(1 − e)</b>, <b>원일점 거리 Q = a(1 + e)</b>, q + Q = 2a. 예) a = 1 AU, e = 0.5이면 q = 0.5 AU, Q = 1.5 AU.</li><li>행성의 이심률: 수성 0.206, 금성 0.007, 지구 0.017, 화성 0.093, 목성 0.049, 토성 0.057, 천왕성 0.046, 해왕성 0.009 → 거의 원이고 수성이 가장 길쭉해요. 금성이 가장 원에 가까워요.</li><li>지구는 1월 초에 근일점이지만 북반구는 겨울이에요. 계절은 거리가 아니라 자전축의 기울기 때문이에요.</li></ul>',
      missions: [
        {
          title: 'a = 1 AU, e = 0.5 궤도 만들기',
          goal: '슬라이더로 <b>긴반지름 a = 1.0 AU</b>, <b>이심률 e = 0.5</b>인 타원을 만들고, 근일점 q와 원일점 Q를 읽어 보세요.',
          hint: 'a 슬라이더를 1.0으로, e 슬라이더를 0.5로 맞춰요. 아래 칸에 q와 Q가 계산돼 나와요.',
          setup() { S.a = 2.0; S.e = 0.3; S.pl = -1; setSl('#sA', '#oA', 2, (v) => f1(v) + ' AU'); setSl('#sE', '#oE', 0.3, (v) => f2(v)); setView('ellipse'); },
          check: () => Math.abs(S.a - 1.0) < 0.05 && Math.abs(S.e - 0.5) < 0.03,
          hold: 0.8,
          status: () => mark(Math.abs(S.a - 1.0) < 0.05) + ' a = ' + f1(S.a) + ' AU &nbsp; ' + mark(Math.abs(S.e - 0.5) < 0.03) + ' e = ' + f2(S.e) + ' &nbsp; (q = ' + f2(qOf(S.a, S.e)) + ', Q = ' + f2(QOf(S.a, S.e)) + ')',
          explain: 'c = a × e = 0.5 AU이므로 근일점 <b>q = a(1 − e) = 0.5 AU</b>, 원일점 <b>Q = a(1 + e) = 1.5 AU</b>예요. q + Q = 2a = 2 AU로, 두 값을 더하면 긴지름이 돼요.',
        },
        {
          title: '이심률이 가장 작은 행성', manual: true,
          goal: '표를 보고 이심률 e가 <b>가장 작은</b>(가장 원에 가까운) 행성을 골라 ✔ 확인하기를 누르세요.',
          hint: '표의 e 열을 위에서 아래로 비교해 보세요. 소수 셋째 자리까지 꼼꼼히 봐요. 행성 이름을 누르면 그 e로 궤도 모양이 나와요.',
          setup() { S.pl = -1; setView('ellipse'); },
          check() {
            if (S.pl < 0) return '표의 행(또는 행성 버튼)을 눌러 행성을 골라 주세요.';
            if (S.pl === 1) return true;
            if (S.pl === 0) return '수성(0.206)은 오히려 가장 길쭉해요. 가장 작은 값을 찾아요.';
            if (S.pl === 7) return '해왕성 0.009도 작지만 더 작은 것이 있어요. 소수 셋째 자리까지 비교해요.';
            return PL[S.pl].n + '의 e는 ' + f3(PL[S.pl].e) + '이에요. 더 작은 행성이 있어요.';
          },
          status: () => '고른 행성: ' + (S.pl >= 0 ? PL[S.pl].n + ' (e = ' + f3(PL[S.pl].e) + ')' : '—'),
          explain: '금성의 이심률이 <b>0.007</b>로 가장 작아 거의 완전한 원이에요. 수성(0.206)이 가장 길쭉하지만 그래도 원에 가까워요. 태양계 행성의 궤도는 모두 <b>원에 매우 가까운 타원</b>이에요.',
        },
        {
          type: 'quiz', title: '1월 초에 가장 가까운데 왜 겨울?',
          goal: '지구는 1월 초에 태양과 가장 가깝지만(근일점, 약 0.983 AU) 북반구는 겨울이에요. 계절이 생기는 가장 큰 까닭은?',
          setup() { setView('ellipse'); },
          choices: ['자전축이 기울어져 있어서 태양 빛의 각도와 낮의 길이가 달라지기 때문이에요', '여름에는 지구가 태양에 더 가깝기 때문이에요', '지구–태양 거리가 크게 변하기 때문이에요', '태양의 활동이 계절마다 달라지기 때문이에요'],
          answer: 0,
          feedback: ['', '1월 초 근일점에 북반구는 겨울이에요. 거리가 계절의 원인이라면 반대가 되어야 해요.', '지구의 e는 0.017이라 거리 변화가 약 3 %뿐이에요.', '태양의 활동 주기는 약 11년이고 계절과는 관계없어요.'],
          explain: '지구의 이심률은 0.017로 거리 차이가 약 3 %밖에 안 돼요. 계절은 <b>자전축이 23.5° 기울어져</b> 태양 빛이 비치는 각도와 낮의 길이가 달라지기 때문에 생겨요.',
        },
      ],
    },
    {
      title: '면적 속도: 같은 시간, 같은 넓이', short: '면적 속도', icon: '⏱', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 행성이 타원 궤도를 돌며 태양과의 거리 r이 변한다는 것을 알았어요. 그러면 속력은 어떻게 변할까요? <b>제2법칙(면적 속도 일정)</b>을 정량적으로 확인해요.</div>' +
        '<p>행성과 태양을 이은 선이 <b>같은 시간(한 달) 동안 쓸고 가는 넓이</b>를 근일점 쪽과 원일점 쪽에서 비교하고, <b>r × v⊥</b>가 일정함을 계산해요. 이심률을 크게 그린 모형을 써요.</p>',
      features: ['area'],
      setup() { S.e3 = 0.6; setSl('#sE3', '#oE3', 0.6, (v) => f2(v)); S.sec = []; S.paint = null; S.jump = null; S.play3 = true; S.flags.calcRV = false; S.flags.hideAns = false; setView('area'); },
      recap: '같은 시간에 쓸고 가는 넓이는 같아요(면적 속도 일정). 그래서 r × v⊥가 일정하고, 근일점에서 가장 빠르고 원일점에서 가장 느려요.',
      summary: '<ul><li><b>제2법칙</b>: 행성과 태양을 이은 선분이 <b>같은 시간 동안 쓸고 가는 넓이는 같아요</b>(면적 속도 ½ r v⊥ = 일정). 지구는 한 달 동안 쓸고 가는 넓이가 항상 타원 전체의 1/12(8.3 %)예요.</li><li>그래서 <b>r × v⊥ = 일정</b>: 지구 근일점 0.9833 AU × 30.3 km/s = 29.8, 원일점 1.0167 AU × 29.3 km/s = 29.8 (AU·km/s). r이 작은 근일점에서 v가 가장 커요.</li><li>물리적 의미: 중력이 항상 태양을 향한 중심력이라 <b>돌림힘이 0</b> → <b>각운동량 보존</b>. 수성은 v근일점 / v원일점 = Q / q = 1.52(58.98 → 38.86 km/s)예요.</li></ul>',
      missions: [
        {
          title: '근일점 쪽과 원일점 쪽 부채꼴 비교',
          goal: '<b>근일점 쪽</b>과 <b>원일점 쪽</b>에서 각각 한 달 동안 쓸고 가는 부채꼴을 색칠하고, 넓이를 비교해 보세요.',
          hint: '🎨 근일점 쪽 한 달 칠하기와 🎨 원일점 쪽 한 달 칠하기를 차례로 눌러요. 행성이 움직이는 동안 부채꼴이 칠해져요.',
          setup() { S.sec = []; S.paint = null; S.jump = null; S.play3 = true; S.flags.calcRV = false; setView('area'); },
          check: () => secHas('near') && secHas('far') && !S.paint,
          hold: 0.6,
          status: () => mark(secHas('near')) + ' 근일점 쪽 &nbsp; ' + mark(secHas('far')) + ' 원일점 쪽',
          explain: '두 부채꼴은 <b>모양은 달라도 넓이가 같아요</b>(각각 8.3 %). 근일점 쪽은 r이 작아 긴 호를 가는 가는 부채꼴, 원일점 쪽은 r이 커서 짧은 호를 가는 넓은 부채꼴이에요. 같은 시간에 가는 거리가 근일점에서 더 길어요 → 더 빨라요.',
        },
        {
          title: '지구의 r × v 계산하기', manual: true,
          goal: '지구의 근일점(r = 0.9833 AU, v = 30.3 km/s)과 원일점(r = 1.0167 AU, v = 29.3 km/s)에서 <b>r × v</b>를 각각 계산해 입력하세요. (단위 AU·km/s)',
          hint: '0.9833 × 30.3과 1.0167 × 29.3을 곱해 보세요. 두 값이 비슷해야 해요.',
          setup() { S.flags.calcRV = true; S.flags.hideAns = true; clrIn('inPer', 'inAph'); setView('area'); },
          check() {
            const p = numOf('inPer'), q = numOf('inAph');
            if (p == null || q == null) return '근일점과 원일점 값을 모두 입력해 주세요.';
            const okp = Math.abs(p - 29.8) <= 0.3, okq = Math.abs(q - 29.8) <= 0.3; fbIn('inPer', okp); fbIn('inAph', okq);
            if (okp && okq) return true;
            if (p > 100 || q > 100) return '곱셈 결과가 너무 커요. 0.9833 × 30.3은 30 정도예요.';
            return '곱셈을 다시 해 보세요. 두 값 모두 약 29.8이 나와요.';
          },
          status: () => '근일점 ' + ($('#inPer').value.trim() || '—') + ' · 원일점 ' + ($('#inAph').value.trim() || '—'),
          explain: '근일점 0.9833 × 30.3 = <b>29.8</b>, 원일점 1.0167 × 29.3 = <b>29.8</b>. 거리와 속력이 달라도 <b>r × v가 같아요</b>. r이 작은 근일점에서는 v가 커야 곱이 일정해요.',
        },
        {
          type: 'quiz', title: '면적 속도가 일정한 까닭',
          goal: '행성의 면적 속도(같은 시간에 쓸고 가는 넓이)가 일정한 물리적 까닭은?',
          setup() { S.flags.hideAns = false; setView('area'); },
          choices: ['중력이 항상 태양 쪽으로만 작용해 돌림힘이 0이라서, 각운동량이 보존돼요', '행성의 속력이 항상 일정하기 때문이에요', '태양에 가까울수록 행성의 질량이 커지기 때문이에요', '태양이 행성을 당기는 힘의 크기가 항상 같기 때문이에요'],
          answer: 0,
          feedback: ['', '속력은 일정하지 않아요(근일점에서 더 빨라요). 일정한 것은 r × v⊥예요.', '행성의 질량은 변하지 않아요.', '중력의 크기는 1/r²로 변해요. 힘의 방향이 항상 태양을 향한다는 점이 핵심이에요.'],
          explain: '중력은 항상 <b>태양을 향하므로</b> 태양에 대한 돌림힘이 0이고, 그래서 <b>각운동량 L = m r v⊥가 보존</b>돼요. r × v⊥가 일정하다는 것이 곧 면적 속도 일정이에요.',
        },
      ],
    },
    {
      title: '혜성 궤도: 아주 긴 타원', short: '혜성 궤도', icon: '☄️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> r × v⊥가 일정함을 알았어요. 이를 이심률이 아주 큰 <b>핼리 혜성</b>(a = 17.8 AU, e = 0.967)에 적용해요. 케플러 법칙은 행성뿐 아니라 태양을 도는 모든 천체에 성립해요.</div>' +
        '<p>혜성이 근일점에서 얼마나 빠르고 원일점에서 얼마나 느린지 계산하고, 원하는 근일점·원일점을 가진 궤도를 직접 만들어 봐요.</p>',
      features: ['comet'],
      setup() { setHalley(); S.zoom = false; S.flags.calcVq = false; S.flags.hideAns = false; S.play4 = true; setView('comet'); },
      recap: '근일점과 원일점에서 r × v⊥가 같아 속력비는 Q / q예요. a = (q + Q) / 2, e = (Q − q) / (Q + q)로 궤도를 정할 수 있어요.',
      summary: '<ul><li><b>핼리 혜성</b>: a = 17.8 AU, e = 0.967 → q = a(1 − e) = <b>0.587 AU</b>, Q = a(1 + e) = <b>35.0 AU</b>, 공전 주기 약 76년.</li><li>근일점에서 약 54.5 km/s로 지나가요. 근일점과 원일점에서 r × v가 같으므로 <b>v원일점 = v근일점 × q / Q = 54.5 × 0.587 / 35.0 ≈ 0.91 km/s</b> (약 60배 차이).</li><li>혜성의 꼬리는 태양의 영향으로 <b>항상 태양 반대 방향</b>이고, 태양에 가까울수록 길어요.</li><li>근일점 q, 원일점 Q로 궤도 정하기: <b>a = (q + Q) / 2, e = (Q − q) / (Q + q)</b>. 예) q = 0.6, Q = 4.4 → a = 2.5 AU, e = 0.76.</li></ul>',
      missions: [
        {
          title: '핼리 혜성의 원일점 속력', manual: true,
          goal: '핼리 혜성은 근일점(0.587 AU)에서 <b>54.5 km/s</b>로 지나가요. r × v⊥가 일정하다는 것을 이용해 원일점(35.0 AU)에서의 속력을 <b>km/s</b>로 입력하세요.',
          hint: '근일점과 원일점에서 r × v가 같아요: 0.587 × 54.5 = 35.0 × v. v를 구해요.',
          setup() { setHalley(); S.zoom = false; S.flags.calcVq = true; S.flags.hideAns = true; clrIn('inVq'); setView('comet'); },
          check() {
            const x = numOf('inVq');
            if (x == null) return '숫자(km/s)를 입력해 주세요.';
            const ok = Math.abs(x - VQ_HALLEY * qOf(HALLEY.a, HALLEY.e) / QOf(HALLEY.a, HALLEY.e)) <= 0.06; fbIn('inVq', ok);
            if (ok) return true;
            if (x > 40) return '근일점 속력(54.5 km/s)에 가까워요. 원일점은 훨씬 멀어서 훨씬 느려요.';
            if (Math.abs(x - 54.5 * 35 / 0.587) < 300 && x > 1000) return 'q와 Q를 거꾸로 곱했어요. v원일점 = v근일점 × q / Q 예요.';
            return 'v원일점 = 54.5 × (0.587 ÷ 35.0) 를 계산해 보세요.';
          },
          status: () => '입력 ' + ($('#inVq').value.trim() || '—') + ' km/s',
          explain: 'r × v가 일정하므로 v원일점 = v근일점 × (q / Q) = 54.5 × 0.587 / 35.0 ≈ <b>0.91 km/s</b>예요. 근일점 속력의 약 <b>1/60</b>이에요. 근일점에서 속력이 큰 만큼 r이 작아서, 같은 시간에 쓸고 가는 넓이는 같아요(길고 가는 부채꼴).',
        },
        {
          title: '근일점 0.6 AU, 원일점 4.4 AU 궤도 만들기',
          goal: '슬라이더 a, e로 <b>근일점 q = 0.6 AU</b>, <b>원일점 Q = 4.4 AU</b>인 혜성 궤도를 만들어 보세요. (q = a(1 − e), Q = a(1 + e))',
          hint: 'q + Q = 2a이므로 a = (0.6 + 4.4) / 2 = 2.5예요. 그다음 q = a(1 − e)에서 e를 구해요.',
          setup() { S.a4 = 3.0; S.e4 = 0.5; S.trail4 = []; S.flags.calcVq = false; S.flags.hideAns = false; setSl('#sA4', '#oA4', 3, (v) => f1(v) + ' AU'); setSl('#sE4', '#oE4', 0.5, (v) => f2(v)); S.zoom = false; setView('comet'); },
          check: () => Math.abs(qOf(S.a4, S.e4) - 0.6) <= 0.04 && Math.abs(QOf(S.a4, S.e4) - 4.4) <= 0.12,
          hold: 0.8,
          status: () => mark(Math.abs(qOf(S.a4, S.e4) - 0.6) <= 0.04) + ' q = ' + f2(qOf(S.a4, S.e4)) + ' AU &nbsp; ' + mark(Math.abs(QOf(S.a4, S.e4) - 4.4) <= 0.12) + ' Q = ' + f2(QOf(S.a4, S.e4)) + ' AU',
          explain: 'a = (q + Q) / 2 = (0.6 + 4.4) / 2 = <b>2.5 AU</b>, e = (Q − q) / (Q + q) = 3.8 / 5.0 = <b>0.76</b>이에요. 이 궤도에서 근일점과 원일점의 속력비는 Q / q ≈ 7.3배예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-kepler-orbit', mount: '#game', badge: '케플러 궤도 탐험가', homeHref: '../../index.html#hu',
    featureLabels: { grav: '☀ 태양의 중력 · 질량 비교 막대', ellipse: '📍 핀과 줄 타원 · 이심률 표', area: '⏱ 같은 시간 부채꼴 · r×v 계산', comet: '☄️ 핼리 혜성 궤도 · a, e 슬라이더' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const g = S.g;
    if (S.view === 'grav') setReadouts(['태양 중력', g.on ? '켜짐' : '꺼짐', '태양까지 거리 r', f2(g.dist / R0) + ' R', '태양의 질량 비율', '99.86 %']);
    else if (S.view === 'ellipse') setReadouts(['이심률 e = c / a', f2(S.e), '근일점 q', f2(qOf(S.a, S.e)) + ' AU', '원일점 Q', f2(QOf(S.a, S.e)) + ' AU']);
    else if (S.view === 'area') {
      const q = kpos(S.M3, S.e3, 1), r = Math.hypot(q.x, q.y), v = V1AU * Math.sqrt(1 - S.e3 * S.e3) / r;
      setReadouts(['태양까지 거리 r', f2(r) + ' AU', 'v⊥ (모형)', f1(v) + ' km/s', 'r × v⊥', f1(r * v) + ' AU·km/s']);
    } else {
      const q = qOf(S.a4, S.e4), Q = QOf(S.a4, S.e4);
      setReadouts(['근일점 q', f2(q) + ' AU', '원일점 Q', f1(Q) + ' AU', '속력비 Q / q', f1(Q / q) + ' 배']);
    }
  }

  /* ================= 루프 ================= */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.view === 'grav') gStep(dt);
    view.apply();
    switch (S.view) {
      case 'grav': drawGrav(dt, t); break;
      case 'ellipse': drawEllipse(dt, t); break;
      case 'area': drawArea(dt, t); break;
      default: drawComet(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, R0, get game() { return game; }, setView, grBoot, pickPlanet, jumpPaint, startPaint, sectorFrac, kpos, kepE2, qOf, QOf, speedAt, updateCtl, setHalley, secHas, LE, LG, LA3, L4, PL };
})();
