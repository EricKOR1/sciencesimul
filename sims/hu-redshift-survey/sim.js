/* =========================================================
   행성우주과학 Ⅲ. 은하와 우주 - 적색 편이 탐사 (5차시)
   성취기준 [12행우03-04] 대규모로 이루어진 외부은하의 적색 편이 탐사의 성과를 이해하고, 은하의 공간 분포를 파악함에 있어서 분광 관측 자료의 중요성을 인식할 수 있다.
   ① 관찰: 하늘 사진 (방향만 있는 2차원, 은하 6개 스펙트럼 촬영)
   ② 분석: 분광 거리 (z = (λ − λ₀)/λ₀, v = cz, d = v/H₀)
   ③ 기록: 쐐기 도표 (θ, d 극좌표, 분광 z 0.43 Mpc vs 측광 z 129 Mpc)
   ④ 적용: 거리 사다리, 탐사 규모(CfA→2dF→SDSS→DESI), 관측 시간 22만/640 = 344 h
   다루지 않음: 상대론적 적색 편이 식, 우주 팽창의 거리 정의(공동 이동 거리 등), 은하 고유 운동 보정 상세. 군집 구조의 해석은 다음 두 차시.
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
  const C_KMS = 3.0e5, H0 = 70, LAM0 = 393.4, RMAX = 320, THMAX = 20;
  const SIG_SPEC = C_KMS * 1e-4 / H0;        // 분광 z 오차 10⁻⁴ → 0.43 Mpc
  const SIG_PHOT = C_KMS * 0.03 / H0;        // 측광 z 오차 0.03 → 129 Mpc
  const roundN = (x, n) => Math.round(x / n) * n;
  const fmtV = (v) => comma(v);
  /* 분광 은하 6개 (G1~G6): 관측 K선 파장 → z → v = cz → d = v / H0 */
  const TG = [
    { id: 'G1', lam: 394.8, th: 12, u: -0.34, sz: 2.8, br: 0.55 },
    { id: 'G2', lam: 397.8, th: -14, u: 0.36, sz: 4.6, br: 0.78 },
    { id: 'G3', lam: 405.2, th: 4, u: -0.40, sz: 7.8, br: 1.0 },
    { id: 'G4', lam: 421.0, th: 9, u: 0.50, sz: 5.4, br: 0.86 },
    { id: 'G5', lam: 396.0, th: -8, u: -0.58, sz: 6.4, br: 0.92 },
    { id: 'G6', lam: 400.6, th: 15, u: 0.10, sz: 3.2, br: 0.6 },
  ];
  TG.forEach((g, i) => {
    g.i = i; g.zT = (g.lam - LAM0) / LAM0; g.z = +g.zT.toFixed(4);
    g.v = roundN(C_KMS * g.zT, 5); g.dPos = C_KMS * g.zT / H0; g.d = Math.round(g.v / H0);
    g.dl = +(g.lam - LAM0).toFixed(1);
  });
  /* 합성 은하 400개: 하늘의 각도 th(-20°~20°), 거리 d(Mpc), 사진 속 높이 u(-1~1) */
  const VOIDS = [{ x: -20, y: 150, r: 20 }, { x: 22, y: 105, r: 16 }, { x: 10, y: 200, r: 25 }];
  const GAL = [];
  (function gen() {
    const R = rng(77), gauss = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * R()); };
    const inVoid = (x, y) => VOIDS.some((v) => Math.hypot(x - v.x, y - v.y) < v.r);
    const feat = () => ({ sz: 1.6 + 5.2 * Math.pow(R(), 1.7), br: 0.38 + 0.62 * R(), rot: R() * Math.PI, ar: 0.45 + 0.55 * R(), warm: R() < 0.55 });
    TG.forEach((g) => GAL.push(Object.assign(feat(), { th: g.th, d: g.dPos, u: g.u, kind: 'target', sz: g.sz, br: g.br, eps: gauss(), tg: g, ar: 0.7 })));
    const add = (kind, x, y) => {
      const d = Math.hypot(x, y), th = Math.atan2(x, y) / DEG;
      if (d < 8 || d > 305 || Math.abs(th) > 19.4 || inVoid(x, y)) return false;
      GAL.push(Object.assign(feat(), { th, d, u: R() * 1.9 - 0.95, kind, eps: gauss() })); return true;
    };
    const fill = (n, kind, fn) => { let c = 0, tries = 0; while (c < n && tries++ < 20000) if (add(kind, ...fn())) c++; };
    fill(40, 'cl1', () => [-6.3 + 1.5 * gauss(), 59.7 + 1.5 * gauss()]);
    const P1 = [-33, 97], P2 = [58, 166], ux = (P2[0] - P1[0]) / Math.hypot(P2[0] - P1[0], P2[1] - P1[1]), uy = (P2[1] - P1[1]) / Math.hypot(P2[0] - P1[0], P2[1] - P1[1]);
    fill(90, 'band', () => { const t = R(), o = 2.5 * gauss(); return [P1[0] + t * (P2[0] - P1[0]) - uy * o, P1[1] + t * (P2[1] - P1[1]) + ux * o]; });
    fill(35, 'cl2', () => [-45 + 2.5 * gauss(), 215 + 2.5 * gauss()]);
    fill(30, 'cl3', () => [70 + 2.5 * gauss(), 262 + 2.5 * gauss()]);
    fill(25, 'fil', () => { const t = R(), o = 3 * gauss(); return [-45 + t * 115 - 0.378 * o, 215 + t * 47 + 0.926 * o]; });
    fill(400 - GAL.length, 'bg', () => { const r = RMAX * Math.sqrt(R()), a = (R() * 2 - 1) * THMAX * DEG; return [r * Math.sin(a), r * Math.cos(a)]; });
  })();
  /* 쐐기에 찍는 차례 (G1~G6은 처음부터) */
  const ORDER = (function () { const R = rng(5), a = []; for (let i = 6; i < GAL.length; i++) a.push(i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; })();
  const STARS_FG = (function () { const R = rng(31), a = []; for (let i = 0; i < 130; i++) a.push([R(), R(), 0.5 + R() * 0.9, R() * 6]); return a; })();
  const LADDER = [
    { label: '연주시차', sub: '시차각 p, d = 1/p', chip: '시차', bin: 0, t: '별을 6개월 간격으로 보면 위치가 조금 달라 보이는 시차각 p로 d = 1/p를 구해요. 먼 별은 시차각이 너무 작아서 우주 망원경(가이아)으로 재도 수 kpc까지예요.' },
    { label: '주계열 맞추기', sub: 'C-M도 겹치기', chip: '맞추기', bin: 1, t: '성단의 C-M도를 표준 주계열에 겹쳐 m − M을 구해요. 성단의 별 하나하나가 구별되는 수십 kpc 이내의 성단까지 쓸 수 있어요.' },
    { label: '세페이드 변광성', sub: '주기-광도 관계', chip: '세페이드', bin: 2, t: '주기로 절대 등급을 알고 m − M으로 거리를 구해요. 다른 은하 속의 세페이드도 하나씩 보이는 수십 Mpc까지 쓸 수 있어요.' },
    { label: '초신성', sub: '최대 광도가 같아요', chip: '초신성', bin: 3, t: '최대 광도가 거의 같은 초신성의 겉보기 밝기로 거리를 재요. 아주 밝아서 수 Gpc 떨어진 은하에서도 보여요. 세페이드로 먼저 보정해야 해요.' },
    { label: '허블-르메트르 법칙', sub: 'z → v → d', chip: '허블 법칙', bin: 4, t: 'z를 재서 v = cz, d = v / H₀로 거리를 구해요. 가장 먼 은하까지 쓰지만 H₀를 아래 단계(세페이드·초신성)로 보정해야 해서 가장 위 단이에요.' },
  ];
  const RUNG = [{ label: '1단', sub: '수 kpc까지', color: '#0ea5e9' }, { label: '2단', sub: '수십 kpc', color: '#14b8a6' }, { label: '3단', sub: '수십 Mpc', color: '#22c55e' }, { label: '4단', sub: '수 Gpc', color: '#f59e0b' }, { label: '5단', sub: '수천 Mpc ~', color: '#ef4444' }];
  const SURV = [
    { n: 'CfA', yr: '1980년대', v: 1.1e3, txt: '약 1,100개', c: '#38bdf8' },
    { n: '2dF', yr: '1997~2002', v: 2.2e5, txt: '약 22만 개', c: '#22c55e' },
    { n: 'SDSS', yr: '2000~', v: 1e6, txt: '100만 개 이상', c: '#f59e0b' },
    { n: 'DESI', yr: '2021~', v: 3e7, txt: '수천만 개(목표)', c: '#ef4444', goal: true },
  ];

  /* ================= 상태 ================= */
  const S = {
    view: 'sky', clock: 0, fade: 0, game: null,
    taken: new Set(), sel: -1,
    sp: { lam: LAM0, reveal: 1, gi: -1 },
    zOK: TG.map(() => false), vOK: TG.map(() => false), dOK: TG.map(() => false),
    wd: { list: [], set: new Set(), next: 0, mode: 'spec', blur: 0, seen: { spec: false, phot: false }, errOK: [false, false] },
    ld: { rise: 0, hrOK: false },
    hit: [], flags: { calcV: false, calcErr: false, calcHr: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { sky: '🔭 하늘 사진 (2차원)', spec: '🌈 스펙트럼으로 거리 구하기', wedge: '🗺️ 쐐기 도표 (3차원 지도)', ladder: '🪜 거리 사다리와 탐사 규모' };
  const modeBtns = $$('#modeSeg button');
  const dZ = (g) => '0.' + String(Math.round(g.z * 10000)).padStart(4, '0');

  /* ---------- 도우미 ---------- */
  function darkPanel(x, y, w, h, r) {
    D.shadow(() => { ctx.fillStyle = '#0a1226'; rr(x, y, w, h, r || 14).fill(); }, { blur: 6, y: 2, color: 'rgba(20,40,80,.2)' });
  }
  function reflectD(d) { let v = Math.abs(d); if (v > RMAX) v = 2 * RMAX - v; return clamp(v, 0, RMAX); }
  function drawGalaxy(x, y, r, br, rot, ar, warm, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.globalAlpha = (alpha == null ? 1 : alpha);
    const c = warm ? '255,226,170' : '176,208,255';
    ctx.fillStyle = 'rgba(' + c + ',' + (0.16 * br + 0.06).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.7, r * 1.7 * ar, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(' + c + ',' + (0.35 + 0.5 * br).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(0, 0, r, r * ar, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.45 * br).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.4, r * 0.4 * ar, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  const specNote = (g) => g.id + ' · K선 ' + g.lam.toFixed(1) + ' nm';

  /* ---------- 배치 ---------- */
  function LSky() {
    return PHONE
      ? { P: { x: 8, y: 8, w: 464, h: 396 }, IM: { x: 16, y: 44, w: 448, h: 352 }, SP: { x: 8, y: 412, w: 464, h: 440 } }
      : { P: { x: 10, y: 8, w: 780, h: 312 }, IM: { x: 20, y: 44, w: 760, h: 268 }, SP: { x: 10, y: 328, w: 780, h: 284 } };
  }
  function LSpec() { return PHONE ? { SP: { x: 8, y: 8, w: 464, h: 262 }, CA: { x: 8, y: 278, w: 464, h: 574 } } : { SP: { x: 10, y: 8, w: 780, h: 232 }, CA: { x: 10, y: 248, w: 780, h: 364 } }; }
  function LWedge() {
    return PHONE
      ? { P: { x: 8, y: 8, w: 464, h: 584 }, I: { x: 8, y: 600, w: 464, h: 252 }, ax: 240, ay: 566, R: 496, MP: { x: 18, y: 636, w: 226, h: 128 } }
      : { P: { x: 10, y: 8, w: 386, h: 604 }, I: { x: 404, y: 8, w: 386, h: 604 }, ax: 203, ay: 582, R: 506, MP: { x: 418, y: 50, w: 358, h: 168 } };
  }
  const wpos = (th, d, L) => { const k = L.R / RMAX, a = th * DEG; return { x: L.ax + d * k * Math.sin(a), y: L.ay - d * k * Math.cos(a) }; };
  const ppos = (g, M) => ({ x: M.x + (g.th + THMAX) / (2 * THMAX) * M.w, y: M.y + (g.u + 1) / 2 * M.h });
  function LLad() {
    return PHONE
      ? { P: { x: 8, y: 8, w: 464, h: 520 }, Q: { x: 8, y: 536, w: 464, h: 316 } }
      : { P: { x: 10, y: 8, w: 780, h: 392 }, Q: { x: 10, y: 408, w: 780, h: 204 } };
  }

  /* =========================================================
     ① 하늘 사진 + 스펙트럼 촬영
     ========================================================= */
  function selectGal(i) {
    if (i < 0 || i >= TG.length) return;
    S.sel = i;
    const first = !S.taken.has(i);
    S.taken.add(i);
    if (S.sp.gi !== i) { S.sp.gi = i; if (first) { S.sp.reveal = 0; S.sp.lam = LAM0; } else S.sp.reveal = 1; }
    if (first) Sound.click();
    resetCalcInputs(); updateCtl();
  }
  function drawSpecStrip(R, o) {
    o = o || {};
    const sp = S.sp, g = sp.gi >= 0 ? TG[sp.gi] : null;
    const x0 = R.x + 34, x1 = R.x + R.w - 22, gx = (l) => x0 + (l - 389) / 38 * (x1 - x0);
    const sy = R.y + (o.sy || 78), sh = o.sh || 62;
    // 눈금
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, sy + sh + 8); ctx.lineTo(x1, sy + sh + 8); ctx.stroke();
    for (let l = 390; l <= 425; l += 5) { const x = gx(l); ctx.beginPath(); ctx.moveTo(x, sy + sh + 8); ctx.lineTo(x, sy + sh + 14); ctx.stroke(); T(x, sy + sh + 29, String(l), PHONE ? 10 : 11.5, '#cbd5e1', 'center', 700); }
    T((x0 + x1) / 2, sy + sh + 29 + (PHONE ? 15 : 17), '파장 (nm)', PHONE ? 10.5 : 12, '#94a3b8', 'center', 800);
    // 띠
    ctx.save(); rr(x0, sy, x1 - x0, sh, 8); ctx.clip();
    const gr = ctx.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#6d28d9'); gr.addColorStop(0.55, '#4f46e5'); gr.addColorStop(1, '#2563eb');
    ctx.fillStyle = '#0b1020'; ctx.fillRect(x0, sy, x1 - x0, sh);
    const rv = g ? sp.reveal : 0, xr = x0 + (x1 - x0) * rv;
    if (rv > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(x0, sy, xr - x0, sh); ctx.clip();
      ctx.fillStyle = gr; ctx.fillRect(x0, sy, x1 - x0, sh);
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x0, sy, x1 - x0, sh * 0.35);
      // 흡수선 (K선): 가운데가 어둡고 가장자리가 부드러워요
      const lx = gx(sp.lam), hw = (x1 - x0) / 38 * 0.9;
      const ab = ctx.createLinearGradient(lx - hw * 1.8, 0, lx + hw * 1.8, 0); ab.addColorStop(0, 'rgba(8,10,28,0)'); ab.addColorStop(0.5, 'rgba(8,10,28,.95)'); ab.addColorStop(1, 'rgba(8,10,28,0)');
      ctx.fillStyle = ab; ctx.fillRect(lx - hw * 1.8, sy, hw * 3.6, sh);
      ctx.restore();
      if (rv < 0.999) { D.glow(xr, sy + sh / 2, 26, '#e0e7ff', 0.6); ctx.fillStyle = 'rgba(224,231,255,.9)'; ctx.fillRect(xr - 1.5, sy, 3, sh); }
    }
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.6; rr(x0, sy, x1 - x0, sh, 8).stroke();
    // 정지 파장
    const rx = gx(LAM0);
    D.dashedLine(rx, sy - 12, rx, sy + sh + 8, { color: '#e2e8f0', width: 1.6, dash: [4, 4] });
    D.label(clamp(rx, x0 + 50, x1 - 150), sy - 24, 'λ₀ = ' + LAM0 + ' nm (정지 파장)', { bg: '#475569', size: PHONE ? 10.5 : 12 });
    if (!g) { T((x0 + x1) / 2, sy + sh / 2 + 5, '은하를 골라 스펙트럼을 찍어요', PHONE ? 12.5 : 14, '#94a3b8', 'center', 800); return { gx, sy, sh }; }
    // 관측 파장 + 이동 화살표
    if (rv > 0.99) {
      const lx = gx(sp.lam), arrowOn = Math.abs(sp.lam - LAM0) > 0.25;
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(lx, sy + sh + 1); ctx.lineTo(lx - 7, sy + sh + 14); ctx.lineTo(lx + 7, sy + sh + 14); ctx.closePath(); ctx.fill();
      if (arrowOn) D.arrow(rx + 4, sy - 40, lx, sy - 40, { color: '#fbbf24', width: 3, head: 10 });
      D.label(clamp((rx + lx) / 2, x0 + 130, x1 - 130), sy - 56, '적색 편이 Δλ = ' + ((sp.lam - LAM0) < 0.05 ? '0.0' : (g.dl * clamp((sp.lam - LAM0) / g.dl, 0, 1)).toFixed(1)) + ' nm  →  관측 ' + g.lam.toFixed(1) + ' nm', { bg: '#b45309', size: PHONE ? 10.5 : 12 });
    }
    return { gx, sy, sh };
  }
  function drawSpecPanel(R, withChips, title) {
    darkPanel(R.x, R.y, R.w, R.h);
    const g = S.sp.gi >= 0 ? TG[S.sp.gi] : null;
    T(R.x + 14, R.y + 24 * FS, '🌈 ' + (g ? g.id + '의 스펙트럼: Ca II K선' : title || '스펙트럼 촬영기'), PHONE ? 12.5 : 14.5, '#e2e8f0', 'left', 800);
    drawSpecStrip(R, { sy: PHONE ? 100 : 102, sh: PHONE ? 54 : 52 });
    if (withChips) {
      S.hit = [];
      const cols = PHONE ? 3 : 6, gap = 8, cw = (R.w - 24 - gap * (cols - 1)) / cols, ch = PHONE ? 62 : 54, y0 = R.y + R.h - (PHONE ? 2 * ch + gap + 12 : ch + 12);
      TG.forEach((q, i) => {
        const x = R.x + 12 + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap), on = S.sp.gi === i, tk = S.taken.has(i);
        ctx.fillStyle = on ? 'rgba(251,191,36,.22)' : 'rgba(255,255,255,.07)'; rr(x, y, cw, ch, 10).fill();
        ctx.strokeStyle = on ? '#fbbf24' : tk ? '#4ade80' : 'rgba(255,255,255,.22)'; ctx.lineWidth = on ? 2.5 : 1.5; rr(x, y, cw, ch, 10).stroke();
        T(x + 10, y + 21 * Math.min(FS, 1.1), q.id + (tk ? ' ✓' : ''), 14, tk ? '#bbf7d0' : '#cbd5e1', 'left', 800);
        T(x + 10, y + 41 * Math.min(FS, 1.12), tk ? q.lam.toFixed(1) + ' nm' : '아직 안 찍음', PHONE ? 11 : 12, tk ? '#fde68a' : '#94a3b8', 'left', 800);
        S.hit.push({ x, y, w: cw, h: ch, i });
      });
    }
  }
  function drawSky(dt, t) {
    const L = LSky(), P = L.P, IM = L.IM, sc = PHONE ? 0.82 : 1;
    darkPanel(P.x, P.y, P.w, P.h);
    ctx.save(); rr(IM.x, IM.y, IM.w, IM.h, 10); ctx.clip();
    const bg = ctx.createLinearGradient(0, IM.y, 0, IM.y + IM.h); bg.addColorStop(0, '#04070f'); bg.addColorStop(1, '#0c1330');
    ctx.fillStyle = bg; ctx.fillRect(IM.x, IM.y, IM.w, IM.h);
    STARS_FG.forEach((s) => { ctx.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.3 + s[3])); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(IM.x + s[0] * IM.w, IM.y + s[1] * IM.h, s[2] * 0.75, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
    GAL.forEach((g) => { if (g.kind === 'target') return; const p = ppos(g, IM); drawGalaxy(p.x, p.y, g.sz * sc, g.br, g.rot, g.ar, g.warm); });
    TG.forEach((q, i) => { const g = GAL[i], p = ppos(g, IM); drawGalaxy(p.x, p.y, g.sz * sc, g.br, g.rot, g.ar, g.warm); });
    ctx.restore();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; rr(IM.x, IM.y, IM.w, IM.h, 10).stroke();
    // 표시
    S.hit2 = [];
    TG.forEach((q, i) => {
      const g = GAL[i], p = ppos(g, IM), tk = S.taken.has(i), on = S.sel === i, r = g.sz * sc + 9, col = tk ? '#4ade80' : '#fbbf24';
      ctx.strokeStyle = col; ctx.lineWidth = on ? 3 : 2; const a = r * 0.5;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { ctx.beginPath(); ctx.moveTo(p.x + sx * r, p.y + sy * (r - a)); ctx.lineTo(p.x + sx * r, p.y + sy * r); ctx.lineTo(p.x + sx * (r - a), p.y + sy * r); ctx.stroke(); });
      if (!tk) D.ring(p.x, p.y, r + 5, t + i * 0.3, { color: '#fbbf24', width: 1.5, speed: 0.9 });
      const ly = p.y - r - 9 < IM.y + 10 ? p.y + r + 14 : p.y - r - 7;
      T(p.x, ly, q.id + (tk ? ' ✓' : ''), PHONE ? 11 : 12.5, col, 'center', 800, { stroke: 'rgba(0,0,0,.7)', strokeWidth: 3 });
      S.hit2.push({ x: p.x, y: p.y, r: Math.max(24, r + 10), i });
    });
    T(P.x + 14, P.y + 24 * FS, '🔭 하늘 한 부분의 사진 (은하 400개)', PHONE ? 12 : 14.5, '#e2e8f0', 'left', 800);
    if (!PHONE) T(P.x + P.w - 14, P.y + 24 * FS, '표시된 은하를 눌러요', 12.5, '#fde68a', 'right', 800);
    drawSpecPanel(L.SP, true);
  }

  /* =========================================================
     ② 분광 거리: z → v → d
     ========================================================= */
  const calcShown = (kind, i) => FREE() || (kind === 'z' ? S.zOK[i] : kind === 'v' ? S.vOK[i] : S.dOK[i]);
  function resetCalcInputs() { clrIn('inZ', 'inV', 'inD'); const i = S.sel; if (i >= 0) { if (S.zOK[i]) { $('#inZ').value = dZ(TG[i]); fbIn('inZ', true); } if (S.vOK[i]) { $('#inV').value = String(TG[i].v); fbIn('inV', true); } if (S.dOK[i]) { $('#inD').value = String(TG[i].d); fbIn('inD', true); } } }
  function drawSpec(dt, t) {
    const L = LSpec(), CA = L.CA, i = S.sel, g = i >= 0 ? TG[i] : null;
    drawSpecPanel(L.SP, false, '스펙트럼에서 K선의 이동을 읽어요');
    panel(CA.x, CA.y, CA.w, CA.h, { r: 14 });
    T(CA.x + 14, CA.y + 24 * FS, g ? '🧮 ' + g.id + '의 거리 구하기' : '🧮 은하를 골라 거리를 구해요', 14.5, '#1e293b', 'left', 800);
    const lw = PHONE ? CA.w - 24 : 392, ly = CA.y + 40 * FS;
    const steps = [
      ['① 적색 편이  z = (λ − λ₀) / λ₀', g ? '= (' + g.lam.toFixed(1) + ' − ' + LAM0 + ') / ' + LAM0 + ' = ' + (calcShown('z', i) ? dZ(g) : '?') : '', calcShown('z', i), '#0ea5e9'],
      ['② 후퇴 속도  v = c z   (c = 3.0×10⁵ km/s)', g ? '= 3.0×10⁵ × ' + (calcShown('z', i) ? dZ(g) : 'z') + ' = ' + (calcShown('v', i) ? fmtV(g.v) + ' km/s' : '?') : '', calcShown('v', i), '#8b5cf6'],
      ['③ 거리  d = v / H₀   (H₀ = 70 km/s/Mpc)', g ? '= ' + (calcShown('v', i) ? fmtV(g.v) : 'v') + ' / 70 = ' + (calcShown('d', i) ? g.d + ' Mpc' : '?') : '', calcShown('d', i), '#16a34a'],
    ];
    const sh = PHONE ? 72 : 92;
    steps.forEach((s_, k) => {
      const y = ly + k * (sh + 8), done = s_[2];
      D.shadow(() => { ctx.fillStyle = done ? '#f0fdf4' : '#fff'; rr(CA.x + 12, y, lw, sh, 12).fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = done ? '#16a34a' : s_[3]; ctx.lineWidth = done ? 2.5 : 1.8; rr(CA.x + 12, y, lw, sh, 12).stroke();
      T(CA.x + 24, y + (PHONE ? 25 : 26), s_[0], PHONE ? 12 : 13.5, '#1e293b', 'left', 800);
      T(CA.x + 24, y + (PHONE ? 54 : 58), s_[1] || '—', PHONE ? 12 : 14, done ? '#15803d' : '#64748b', 'left', 800);
      if (done) D.check(CA.x + 12 + lw - 22, y + 22, 11, 1);
    });
    // 표
    const tx = PHONE ? CA.x + 12 : CA.x + 12 + lw + 14, tw = PHONE ? CA.w - 24 : CA.w - lw - 38, ty = PHONE ? ly + 3 * (sh + 8) + 8 : ly, rh = PHONE ? 33 : 38;
    const cols = [0.15, 0.24, 0.17, 0.22, 0.22];
    const heads = ['은하', 'λ (nm)', 'z', 'v (km/s)', 'd (Mpc)'];
    ctx.fillStyle = '#eef2f7'; rr(tx, ty, tw, rh - 4, 8).fill();
    let cx = tx; heads.forEach((h_, k) => { T(cx + tw * cols[k] / 2, ty + 22, h_, PHONE ? 11 : 12.5, '#475569', 'center', 800); cx += tw * cols[k]; });
    TG.forEach((q, r) => {
      const y = ty + (r + 1) * rh, on = r === i;
      ctx.fillStyle = on ? 'rgba(14,165,233,.14)' : (r % 2 ? 'rgba(100,116,139,.05)' : 'rgba(100,116,139,.09)'); rr(tx, y, tw, rh - 4, 8).fill();
      if (on) { ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; rr(tx, y, tw, rh - 4, 8).stroke(); }
      const vals = [q.id, q.lam.toFixed(1), calcShown('z', r) ? dZ(q) : '—', calcShown('v', r) ? fmtV(q.v) : '—', calcShown('d', r) ? String(q.d) : '—'];
      let xx = tx; vals.forEach((v, k) => { T(xx + tw * cols[k] / 2, y + 22, v, PHONE ? 11.5 : 13, k >= 2 && v !== '—' ? '#15803d' : '#1e293b', 'center', 800); xx += tw * cols[k]; });
    });
    const ny = ty + 7 * rh + 18;
    drawWrap(tx, ny, 'Δλ가 클수록 z가 크고 d도 커요. 같은 방법으로 사진 속 모든 은하의 거리를 잴 수 있어요.', tw, PHONE ? 12 : 12.5, { color: '#64748b' });
  }

  /* =========================================================
     ③ 쐐기 도표
     ========================================================= */
  const WD = S.wd;
  function wdPlot(idx, delay) {
    if (WD.set.has(idx)) return false;
    WD.set.add(idx); WD.list.push({ i: idx, t0: S.clock + (delay || 0) }); return true;
  }
  function wdBatch(n) {
    let c = 0;
    const st = Math.min(0.014, 1.4 / Math.max(1, n));
    while (c < n && WD.next < ORDER.length) { if (wdPlot(ORDER[WD.next++], c * st)) c++; }
    if (c) Sound.click();
    return c;
  }
  const wdReset = () => { WD.list = []; WD.set = new Set(); WD.next = 0; TG.forEach((q, i) => wdPlot(i, -10)); };
  function galDisp(g, blur) { const sig = SIG_SPEC + (SIG_PHOT - SIG_SPEC) * blur; return reflectD(g.d + g.eps * sig); }
  function drawWedge(dt, t) {
    const L = LWedge(), P = L.P, I = L.I, k = L.R / RMAX;
    WD.blur = approach(WD.blur, WD.mode === 'phot' ? 1 : 0, dt, 2.4);
    const blurE = smooth(WD.blur);
    darkPanel(P.x, P.y, P.w, P.h);
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14); ctx.clip();
    const bg = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); bg.addColorStop(0, '#05081a'); bg.addColorStop(1, '#101a3c'); ctx.fillStyle = bg; ctx.fillRect(P.x, P.y, P.w, P.h);
    ctx.restore();
    // 쐐기 영역
    const a0 = (-THMAX - 90) * DEG, a1 = (THMAX - 90) * DEG;
    ctx.beginPath(); ctx.moveTo(L.ax, L.ay); ctx.arc(L.ax, L.ay, L.R, a0, a1); ctx.closePath();
    ctx.fillStyle = 'rgba(99,102,241,.10)'; ctx.fill(); ctx.strokeStyle = 'rgba(148,163,184,.65)'; ctx.lineWidth = 1.8; ctx.stroke();
    [100, 200, 300].forEach((d) => { ctx.beginPath(); ctx.arc(L.ax, L.ay, d * k, a0, a1); ctx.strokeStyle = 'rgba(148,163,184,.35)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]); const lp = wpos(0, d, L); D.label(lp.x + 6, lp.y + (PHONE ? 8 : 9), d + ' Mpc', { bg: 'rgba(15,23,42,.85)', size: PHONE ? 9.5 : 11.5, align: 'left', pad: 5, color: '#cbd5e1' }); });
    [-20, -10, 0, 10, 20].forEach((th) => { const pp = wpos(th, RMAX + 2, L); if (th !== 0 && Math.abs(th) !== 20) { ctx.beginPath(); ctx.moveTo(L.ax, L.ay); ctx.lineTo(pp.x, pp.y); ctx.strokeStyle = 'rgba(148,163,184,.2)'; ctx.lineWidth = 1; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]); } const lp = wpos(th, RMAX + 14, L); T(lp.x, lp.y, (th > 0 ? '+' : '') + th + '°', PHONE ? 9.5 : 11.5, '#94a3b8', 'center', 700); });
    D.glow(L.ax, L.ay, 22, '#93c5fd', 0.7); D.sphere(L.ax, L.ay, 7, '#60a5fa', { gloss: true });
    T(L.ax, L.ay + 20 * Math.min(FS, 1.1), '우리 (관측자)', PHONE ? 10.5 : 12, '#bfdbfe', 'center', 800);
    T(P.x + 14, P.y + 24 * FS, '🗺️ 쐐기 도표: 방향 θ와 거리 d', PHONE ? 12 : 14, '#e2e8f0', 'left', 800);
    // 은하 점
    const MP = L.MP;
    const tgSet = new Set([0, 1, 2, 3, 4, 5]);
    WD.list.forEach((e) => {
      const g = GAL[e.i], dd = galDisp(g, blurE), wp = wpos(g.th, dd, L), pp = ppos(g, MP);
      const pr = clamp((S.clock - e.t0) / 0.8, 0, 1);
      if (S.clock < e.t0) return;
      const q = RM ? 1 : SciSim.ease.outCubic(pr);
      const x = pp.x + (wp.x - pp.x) * q, y = pp.y + (wp.y - pp.y) * q - 70 * Math.sin(Math.PI * q) * (1 - q * 0.2) * (RM ? 0 : 1);
      const tgt = tgSet.has(e.i);
      if (pr < 1) D.glow(x, y, 10, '#fde68a', 0.6 * (1 - pr * 0.4));
      ctx.fillStyle = tgt ? '#fbbf24' : (g.kind === 'cl1' || g.kind === 'cl2' || g.kind === 'cl3' ? '#c7d2fe' : '#e0e7ff'); ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.arc(x, y, tgt ? 4 : (PHONE ? 2.2 : 2.4), 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      if (tgt && pr >= 1) { ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.stroke(); T(x + 11, y - 7, GAL[e.i].tg.id, PHONE ? 10 : 11.5, '#fde68a', 'left', 800, { stroke: 'rgba(0,0,0,.7)', strokeWidth: 3 }); }
    });
    // 안내 패널
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    T(I.x + 14, I.y + 24 * FS, PHONE ? '🖼 하늘 사진 (2차원)' : '🖼 하늘 사진 (2차원): 거리를 몰라요', PHONE ? 12 : 14, '#1e293b', 'left', 800);
    ctx.fillStyle = '#0a1226'; rr(MP.x, MP.y, MP.w, MP.h, 8).fill();
    GAL.forEach((g, i) => { const pp = ppos(g, MP), on = WD.set.has(i); ctx.fillStyle = on ? '#fde68a' : 'rgba(148,163,184,.55)'; ctx.beginPath(); ctx.arc(pp.x, pp.y, on ? 2 : 1.5, 0, TAU); ctx.fill(); });
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.6; rr(MP.x, MP.y, MP.w, MP.h, 8).stroke();
    const n = WD.list.length;
    const tx = PHONE ? I.x + 250 : I.x + 14, ty0 = PHONE ? I.y + 40 : MP.y + MP.h + 28, tw = PHONE ? I.w - 262 : I.w - 28;
    let yy = ty0;
    if (PHONE) { yy = drawWrap(tx, yy, '노란 점: 분광 관측을 마친 은하', tw, 11, { color: '#64748b' }) + 14 * FS; }
    else { yy = drawWrap(tx, yy, '노란 점은 분광 관측을 마친 은하예요. 사진에는 방향만 있고 거리는 없어요.', I.w - 28, 12.5, { color: '#64748b' }) + 16 * FS; }
    // 오차 카드 두 장
    const cw = PHONE ? tw : (I.w - 36) / 2, ch = PHONE ? 62 : 78;
    const cards = [
      { k: 'spec', title: '🔬 분광 z', a: '오차 약 10⁻⁴', b: '거리 오차 ' + f2(SIG_SPEC) + ' Mpc', c: '#16a34a' },
      { k: 'phot', title: '📷 측광 z', a: '오차 약 0.03', b: '거리 오차 ' + f0(SIG_PHOT) + ' Mpc', c: '#dc2626' },
    ];
    cards.forEach((c, j) => {
      const x = PHONE ? tx : I.x + 12 + j * (cw + 12), y = PHONE ? yy + j * (ch + 6) : yy, on = WD.mode === c.k;
      D.shadow(() => { ctx.fillStyle = on ? mixc('#ffffff', c.c, 0.14) : '#fff'; rr(x, y, cw, ch, 12).fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = on ? c.c : '#cbd5e1'; ctx.lineWidth = on ? 3 : 1.5; rr(x, y, cw, ch, 12).stroke();
      T(x + 10, y + (PHONE ? 19 : 22), c.title, PHONE ? 12 : 13.5, '#1e293b', 'left', 800);
      T(x + 10, y + (PHONE ? 37 : 42), c.a, PHONE ? 11 : 12.5, '#475569', 'left', 700);
      T(x + 10, y + (PHONE ? 55 : 61), c.b, PHONE ? 11 : 12.5, c.c, 'left', 800);
    });
    if (!PHONE) {
      yy += ch + 18;
      T(I.x + 14, yy, '같은 거리 눈금으로 비교한 거리 오차', 12.5, '#475569', 'left', 800); yy += 14;
      const bx = I.x + 14, bw = I.w - 28, kk = bw / RMAX;
      ctx.fillStyle = 'rgba(100,116,139,.14)'; rr(bx, yy, bw, 14, 7).fill();
      ctx.fillStyle = '#16a34a'; ctx.fillRect(bx, yy - 2, Math.max(0.8, SIG_SPEC * kk), 18);
      ctx.fillStyle = '#dc2626'; ctx.fillRect(bx, yy + 24, SIG_PHOT * kk, 14);
      T(bx + 4 + SIG_SPEC * kk, yy + 10, f2(SIG_SPEC) + ' Mpc (점 하나보다 작아요)', 11.5, '#166534', 'left', 800);
      T(bx + SIG_PHOT * kk + 6, yy + 36, f0(SIG_PHOT) + ' Mpc', 11.5, '#b91c1c', 'left', 800);
      T(bx, yy + 56, '0', 11, '#64748b', 'left', 700); T(bx + bw, yy + 56, RMAX + ' Mpc', 11, '#64748b', 'right', 700);
      yy += 78;
      T(I.x + 14, yy, '지도에 찍힌 은하 ' + n + ' / 400', 14, '#0369a1', 'left', 800);
    } else {
      T(MP.x, MP.y + MP.h + 24 * FS, '찍힌 은하 ' + n + ' / 400', 13, '#0369a1', 'left', 800);
    }
  }

  /* =========================================================
     ④ 거리 사다리 + 탐사 규모
     ========================================================= */
  const LD = S.ld;
  function LCls() {
    const L = LLad(), P = L.P;
    if (PHONE) {
      const bw = (448 - 4 * 6) / 5, hs = [150, 168, 186, 204, 222], by = P.y + P.h - 10;
      return { grid: { x: P.x + 8, y: P.y + 38, w: 448, cols: 2, cardH: 44, gap: 6 }, detail: { x: P.x + 8, y: P.y + 38 + 3 * 50 + 4, w: 448, h: 74 }, bins: hs.map((h, b) => { const hh = h * Math.min(1, LD.rise * 1.4 - b * 0.12 + 0.0); return { x: P.x + 8 + b * (bw + 6), y: by - hh, w: bw, h: hh }; }) };
    }
    const bw = (760 - 4 * 8) / 5, hs = [124, 142, 160, 178, 196], by = P.y + P.h - 10;
    return { grid: { x: P.x + 10, y: P.y + 36, w: 760, cols: 5, cardH: 50, gap: 8 }, detail: { x: P.x + 10, y: P.y + 94, w: 760, h: 58 }, bins: hs.map((h, b) => { const hh = h * clamp(LD.rise * 1.4 - b * 0.12, 0, 1); return { x: P.x + 10 + b * (bw + 8), y: by - hh, w: bw, h: hh }; }) };
  }
  const cLd = makeClassifier({
    items: LADDER.map((e) => ({ label: e.label, sub: e.sub, chip: e.chip, bin: e.bin, open: true, t: e.t })),
    bins: RUNG, chipCols: 1, minRows: 1, placeholder: '카드를 눌러 방법의 원리와 한계를 읽고, 거리 범위가 알맞은 단에 쌓아요.',
    layout: () => { const L = LCls(); return { grid: L.grid, detail: L.detail, bins: L.bins }; },
    detailFn: (it) => ({ title: it.label, body: it.t }),
    onPlace(it, b) {
      it.wrong = b !== it.bin;
      if (it.wrong) { say('「' + it.label + '」은(는) 그 단이 아니에요. 카드 설명의 거리 범위를 다시 읽어 보세요.', true, 3.4); Sound.fail(); }
      else parts.burst(it.x + it.w / 2, it.y + it.h / 2, { count: 10, speed: 120, colors: [RUNG[b].color, '#fbbf24'] });
    },
    onChange() { updateCtl(); },
  });
  const ladOK = () => cLd.items.every((i) => i.loc != null && cLd.isRight(i));
  const HRS_SLIT = 220000 * 0.5, HRS_FIB = 220000 / 640;
  function drawLadder(dt, t) {
    const L = LLad(), P = L.P, Q = L.Q;
    LD.rise = approach(LD.rise, 1, dt, 1.6);
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    T(P.x + 14, P.y + 24 * FS, '🪜 거리 사다리: 방법을 거리 범위에 맞게 쌓아요', PHONE ? 12.5 : 14.5, '#1e293b', 'left', 800);
    cLd.draw(dt, {});
    // 탐사 규모 + 관측 시간
    panel(Q.x, Q.y, Q.w, Q.h, { r: 14 });
    T(Q.x + 14, Q.y + 24 * FS, '🔭 적색 편이 탐사가 모은 은하 수 (로그 눈금)', PHONE ? 12.5 : 14, '#1e293b', 'left', 800);
    const bx = Q.x + (PHONE ? 84 : 88), bw = PHONE ? Q.w - 84 - 16 : 250, by0 = Q.y + 42 * Math.min(FS, 1.1), rh = PHONE ? 31 : 33;
    const X = (v) => bx + clamp((Math.log10(v) - 2) / 6, 0, 1) * bw;
    SURV.forEach((s_, i) => {
      const y = by0 + i * rh, prog = clamp(LD.rise * 1.3 - 0.35 - i * 0.12, 0, 1), w = (X(s_.v) - bx) * smooth(prog);
      T(Q.x + 14, y + 18, s_.n, PHONE ? 12.5 : 13.5, '#1e293b', 'left', 800);
      ctx.fillStyle = 'rgba(100,116,139,.12)'; rr(bx, y + 4, bw, rh - 12, 6).fill();
      if (w > 0.5) { ctx.save(); rr(bx, y + 4, bw, rh - 12, 6); ctx.clip(); ctx.fillStyle = s_.c; ctx.globalAlpha = s_.goal ? 0.55 : 1; ctx.fillRect(bx, y + 4, w, rh - 12); ctx.restore(); }
      if (s_.goal && w > 2) { ctx.strokeStyle = s_.c; ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); ctx.strokeRect(bx + 0.5, y + 4.5, w - 1, rh - 13); ctx.setLineDash([]); }
      ctx.save(); ctx.font = D.font(PHONE ? 10.5 : 12, 800); const tw_ = ctx.measureText(s_.txt).width; ctx.restore();
      if (bx + w + 8 + tw_ <= Q.x + Q.w - 8) T(bx + w + 8, y + 18, s_.txt, PHONE ? 10.5 : 12, '#334155', 'left', 800);
      else T(bx + w - 8, y + 18, s_.txt, PHONE ? 10.5 : 12, '#fff', 'right', 800, { stroke: 'rgba(0,0,0,.35)', strokeWidth: 3 });
    });
    const ayb = by0 + SURV.length * rh + 2;
    [2, 3, 4, 5, 6, 7, 8].forEach((e) => { const x = bx + (e - 2) / 6 * bw; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, ayb - 4); ctx.lineTo(x, ayb + 2); ctx.stroke(); T(x, ayb + 15, '10' + sup(e), PHONE ? 9.5 : 11, '#64748b', 'center', 700); });
    // 시간 비교
    const tx = PHONE ? Q.x + 20 : Q.x + 480, ty = PHONE ? ayb + 44 : Q.y + 60, tw = PHONE ? Q.w - 40 : Q.w - 480 - 18;
    const shown = LD.hrOK || FREE(), fs_ = PHONE ? 11 : 12, lh = 19 * Math.min(FS, 1.1);
    ctx.fillStyle = 'rgba(14,165,233,.07)'; rr(tx - 10, ty - 34, tw + 20, PHONE ? 112 : Q.h - 60 - 4, 10).fill();
    T(tx, ty - 12, '⏱ 22만 은하 관측 시간 (밤 = 8시간)', fs_ + 0.5, '#0369a1', 'left', 800);
    T(tx, ty + 8, '슬릿 1개(30분): 22만 × 0.5 = ' + comma(HRS_SLIT) + ' h', fs_, '#475569', 'left', 700);
    T(tx, ty + 8 + lh * 0.95, '→ 약 ' + comma(HRS_SLIT / 8) + '밤', fs_, '#b91c1c', 'left', 800);
    T(tx, ty + 8 + lh * 2.1, '광섬유 640개(1시간): 22만 / 640 = ' + (shown ? f0(HRS_FIB) + ' h' : '?'), fs_, shown ? '#15803d' : '#94a3b8', 'left', 800);
    T(tx, ty + 8 + lh * 3.05, shown ? '→ 약 ' + f0(HRS_FIB / 8) + '밤' : '→ 계산해 입력하면 나타나요', fs_, shown ? '#15803d' : '#94a3b8', 'left', 800);
  }

  /* =========================================================
     컨트롤 · 입력 · 장면 전환
     ========================================================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); S.hit = []; S.hit2 = []; }
    updateCtl();
  }
  const specOK = () => S.zOK[1] && S.vOK[1] && S.dOK[1];
  const errOK = () => WD.errOK[0] && WD.errOK[1];
  const tolRel = (x, v, r) => x != null && Math.abs(x - v) <= Math.abs(v) * r;
  function updateCtl() {
    const free = FREE(), v = S.view;
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === v));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(v); });
    $('#calcV').hidden = !((v === 'spec') && (S.flags.calcV || free));
    $('#calcErr').hidden = !(v === 'wedge' && (S.flags.calcErr || free));
    $('#calcHr').hidden = !(v === 'ladder' && (S.flags.calcHr || free));
    $('#tbLabel').textContent = VIEW_LABEL[v];
    $$('#grpGal .opt').forEach((b) => { const i = +b.dataset.k; b.classList.toggle('on', i === S.sel); b.classList.toggle('done', S.taken.has(i)); b.textContent = TG[i].id + (S.taken.has(i) ? ' ✓' : ''); });
    $$('#grpMode .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === WD.mode));
    $('#bObs').disabled = WD.next >= ORDER.length;
    $('#bAll').disabled = WD.next >= ORDER.length;
    $('#bObs').textContent = '📡 은하 40개 분광 관측 (+40)';
  }
  TG.forEach((g, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.k = i; b.textContent = g.id; $('#grpGal').appendChild(b); clickable(b, () => selectGal(i)); });
  clickable($('#bObs'), () => { wdBatch(40); updateCtl(); });
  clickable($('#bAll'), () => { wdBatch(1000); updateCtl(); });
  $$('#grpMode .opt').forEach((b) => clickable(b, () => { WD.mode = b.dataset.k; WD.seen[WD.mode] = true; updateCtl(); }));
  $('#inZ').addEventListener('input', () => { const i = S.sel; if (i < 0) return; const x = numOf('inZ'), g = TG[i]; if (x != null && Math.abs(x - g.zT) <= Math.max(0.0004, g.zT * 0.04)) { S.zOK[i] = true; fbIn('inZ', true); } });
  $('#inV').addEventListener('input', () => { const i = S.sel; if (i < 0) return; if (tolRel(numOf('inV'), TG[i].v, 0.03)) { S.vOK[i] = true; fbIn('inV', true); } });
  $('#inD').addEventListener('input', () => { const i = S.sel; if (i < 0) return; const x = numOf('inD'); if (x != null && Math.abs(x - TG[i].v / H0) <= Math.max(1.2, TG[i].d * 0.03)) { S.dOK[i] = true; fbIn('inD', true); } });
  $('#inE0').addEventListener('input', () => { if (tolRel(numOf('inE0'), SIG_SPEC, 0.1)) { WD.errOK[0] = true; fbIn('inE0', true); } });
  $('#inE1').addEventListener('input', () => { if (tolRel(numOf('inE1'), SIG_PHOT, 0.03)) { WD.errOK[1] = true; fbIn('inE1', true); } });
  $('#inH').addEventListener('input', () => { if (tolRel(numOf('inH'), HRS_FIB, 0.02)) { LD.hrOK = true; fbIn('inH', true); } });

  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'sky') {
        for (const h of S.hit || []) if (inR(p, h)) { selectGal(h.i); return false; }
        let best = null, bd = 1e9;
        for (const h of S.hit2 || []) { const d = Math.hypot(p.x - h.x, p.y - h.y); if (d < h.r && d < bd) { bd = d; best = h; } }
        if (best) { selectGal(best.i); return false; }
        return false;
      }
      if (S.view === 'ladder') { const r = cLd.down(p); updateCtl(); return r; }
      return false;
    },
    move(p) { if (S.view === 'ladder') cLd.move(p); },
    up(p) { if (S.view === 'ladder') { cLd.up(p); updateCtl(); } },
    hover(p) {
      if (S.view === 'sky') { for (const h of S.hit || []) if (inR(p, h)) return 'pointer'; for (const h of S.hit2 || []) if (Math.hypot(p.x - h.x, p.y - h.y) < h.r) return 'pointer'; }
      if (S.view === 'ladder') return cLd.hit(p) ? 'pointer' : '';
      return '';
    },
  });

  /* ================= 미션 ================= */
  const figPair = '<svg viewBox="0 0 360 120" width="100%" role="img" aria-label="사진 속 작고 어두운 은하 G1과 크고 밝은 은하 G3. 어느 쪽이 가까운지 사진만으로는 알 수 없다."><rect width="360" height="120" rx="12" fill="#0a1226"/><g><ellipse cx="90" cy="60" rx="14" ry="9" fill="#fde2a8" opacity=".35"/><ellipse cx="90" cy="60" rx="7" ry="4.6" fill="#ffe3a8"/><circle cx="90" cy="60" r="2.4" fill="#fff"/><text x="90" y="98" text-anchor="middle" fill="#cbd5e1" font-size="13" font-weight="800">G1 (작고 어두워요)</text></g><g><ellipse cx="260" cy="56" rx="38" ry="22" fill="#b0d0ff" opacity=".3"/><ellipse cx="260" cy="56" rx="20" ry="12" fill="#c9dcff"/><ellipse cx="260" cy="56" rx="8" ry="5" fill="#fff"/><text x="260" y="98" text-anchor="middle" fill="#cbd5e1" font-size="13" font-weight="800">G3 (크고 밝아요)</text></g><text x="180" y="20" text-anchor="middle" fill="#fde68a" font-size="13" font-weight="800">어느 쪽이 더 가까울까?</text></svg>';
  const levels = [
    {
      title: '하늘 사진: 방향만 보이는 은하', short: '하늘 사진', icon: '🔭', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 은하들은 우주 공간에 어떻게 퍼져 있을까? 사진만으로는 왜 알 수 없을까?</p>' +
        '<div class="si-link">🔗 <b>지구과학에서</b> 멀리 있는 은하의 스펙트럼선이 긴 파장 쪽으로 옮겨 가는 <b>적색 편이</b>(z = Δλ/λ₀)와 <b>허블-르메트르 법칙</b>(v = H₀d)을 배웠어요. 앞 차시들에서는 별과 성단의 거리를 재는 도구를 하나씩 만들었어요.</div>' +
        '<p>하늘 한 부분을 찍은 사진에는 은하가 <b>400개</b>나 담겨 있어요. 그런데 사진 속 위치는 <b>하늘 위의 방향(2차원)</b>뿐이에요. 표시된 은하 6개의 <b>스펙트럼</b>을 찍어 거리를 알아낼 준비를 해요.</p>',
      features: ['sky'],
      setup() { setView('sky'); },
      recap: '사진에는 방향(2차원)만 있어서 거리 방향이 겹쳐 보여요. 스펙트럼의 K선이 정지 파장 393.4 nm보다 길어진 정도(적색 편이)가 거리를 알려 줄 열쇠예요.',
      summary: '<ul><li>은하 사진은 하늘 위의 <b>방향(2차원)</b>만 알려 줘요. 크기와 밝기는 은하마다 달라서 <b>거리의 기준이 될 수 없어요</b>.</li><li>스펙트럼의 Ca II <b>K선</b>(정지 파장 λ₀ = 393.4 nm)이 긴 파장 쪽으로 옮겨 가요(적색 편이). 6개 은하는 394.8 ~ 421.0 nm로 은하마다 달라요.</li><li>분광 관측은 은하의 <b>빛을 파장별로 나누어</b> 적색 편이 z를 재는 관측이에요.</li></ul>',
      missions: [
        {
          title: '은하 6개의 스펙트럼 찍기',
          goal: '사진에 표시된 은하 <b>G1~G6</b>을 눌러 <b>6개</b> 모두 스펙트럼을 찍으세요.',
          hint: '사진 속 ⌜⌝ 표시를 하나씩 눌러요. 오른쪽 G1~G6 버튼이나 아래 상자를 눌러도 돼요.',
          setup() { setView('sky'); },
          check: () => S.taken.size === 6,
          hold: 0.5,
          status: () => TG.map((g, i) => mark(S.taken.has(i)) + ' ' + g.id).join(' &nbsp; '),
          explain: '6개 은하의 K선은 모두 정지 파장(393.4 nm)보다 긴 쪽에 있고, 옮겨진 정도 Δλ는 <b>1.4 nm(G1)부터 27.6 nm(G4)까지</b> 달라요. 이 차이가 바로 거리 차이예요.',
        },
        {
          type: 'quiz', title: '사진 한 장으로 3차원 위치를 알 수 있을까?', figure: figPair,
          goal: '은하 사진 한 장만으로 은하의 <b>3차원 위치</b>를 알 수 없는 까닭은?',
          setup() { setView('sky'); },
          choices: ['사진에는 하늘 위의 방향만 있고, 거리 방향의 정보가 없어요', '크게 보이는 은하가 가까운 은하라서 사진이 작으면 못 알아봐요', '은하가 너무 많아서 일일이 세지 못해요', '사진에서는 은하의 색을 구별할 수 없어요'],
          answer: 0,
          feedback: ['', '크고 밝게 보이는 G3도 G1보다 훨씬 멀어요. 은하의 실제 크기와 밝기가 제각각이라 겉보기 크기로는 거리를 알 수 없어요.', '개수가 많은 것이 문제가 아니에요. 아무리 적어도 사진 한 장에는 거리 정보가 없어요.', '사진에서도 색은 구별해요. 하지만 색만으로 거리를 정할 수는 없어요.'],
          explain: '사진은 3차원 공간을 하늘이라는 2차원 면에 <b>겹쳐</b> 찍은 거예요. 거리는 <b>스펙트럼의 적색 편이</b>로 재야 해요. (G1은 15 Mpc, G3는 129 Mpc예요.)',
        },
      ],
    },
    {
      title: '분광 거리: K선의 이동으로 거리 구하기', short: '분광 거리', icon: '🌈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 은하 6개의 스펙트럼을 찍었어요. 이제 K선의 이동량으로 <b>z → v → d</b> 순서로 거리를 계산해요.</div>' +
        '<p><b>z = (λ − λ₀) / λ₀</b>, z가 작을 때 <b>v = cz</b> (c = 3.0×10⁵ km/s), 허블-르메트르 법칙 <b>d = v / H₀</b> (H₀ = 70 km/s/Mpc)를 써요. 은하를 고르면 스펙트럼의 K선이 정지 파장에서 관측 파장으로 옮겨 가요.</p>',
      features: ['spec'],
      setup() { setView('spec'); if (S.sel < 0) { S.sel = 1; S.sp.gi = 1; S.sp.lam = TG[1].lam; S.sp.reveal = 1; } resetCalcInputs(); },
      recap: '적색 편이 z가 클수록 후퇴 속도 v = cz가 크고, d = v / H₀로 계산한 거리도 멀어요. 스펙트럼 한 장이 은하 하나의 거리를 알려 줘요.',
      summary: '<ul><li><b>z = (λ − λ₀) / λ₀</b>, <b>v = cz</b> (z ≪ 1), <b>d = v / H₀</b> (H₀ = 70 km/s/Mpc).</li><li>예) G2: λ = 397.8 nm → z = 0.0112 → v = 3,355 km/s → <b>d = 48 Mpc</b>. 6개 은하는 15 · 28 · 48 · 78 · 129 · 301 Mpc로 z가 클수록 멀어요.</li><li>이 방법은 거리를 허블-르메트르 법칙에 맡기므로 <b>은하의 고유 운동</b>이 섞인 가까운 은하에서는 오차가 커요.</li></ul>',
      missions: [
        {
          title: 'K선 이동으로 적색 편이 z 구하기',
          goal: '<b>G2</b>의 K선은 <b>397.8 nm</b>에서 관측돼요. <b>z = (λ − λ₀) / λ₀</b> (λ₀ = 393.4 nm)를 계산해 입력하세요.',
          hint: 'z = (397.8 − 393.4) / 393.4 = 4.4 / 393.4 ≈ 0.0112예요.',
          setup() { setView('spec'); selectGal(1); S.sp.lam = LAM0; S.flags.calcV = false; updateCtl(); },
          check: () => S.zOK[1],
          hold: 0.5,
          status: () => mark(S.zOK[1]) + ' z = ' + ($('#inZ').value.trim() || '—'),
          explain: 'Δλ = 397.8 − 393.4 = 4.4 nm이고, z = 4.4 / 393.4 = <b>0.0112</b>예요. 파장이 약 1.1 % 늘어났다는 뜻이에요.',
        },
        {
          title: '후퇴 속도 v와 거리 d 구하기',
          goal: 'z = 0.0112로 <b>v = cz</b> (km/s)와 <b>d = v / H₀</b> (Mpc)를 구해 입력하세요. (c = 3.0×10⁵ km/s, H₀ = 70 km/s/Mpc)',
          hint: 'v = 3.0×10⁵ × 0.0112 ≈ 3,355 km/s (z를 0.0112로 쓰면 3,360), d = 3,355 / 70 ≈ 48 Mpc예요.',
          setup() { setView('spec'); selectGal(1); S.flags.calcV = true; updateCtl(); },
          check: () => S.vOK[1] && S.dOK[1],
          hold: 0.5,
          status: () => mark(S.vOK[1]) + ' v = ' + ($('#inV').value.trim() || '—') + ' km/s &nbsp; ' + mark(S.dOK[1]) + ' d = ' + ($('#inD').value.trim() || '—') + ' Mpc',
          explain: 'v = 3.0×10⁵ × 0.0112 ≈ <b>3,355 km/s</b>, d = 3,355 / 70 ≈ <b>48 Mpc</b>이에요. 약 1.6억 광년(1 Mpc ≈ 326만 광년) 떨어진 은하예요.',
        },
        {
          type: 'quiz', title: '적색 편이가 클수록 먼 은하인 까닭',
          goal: '스펙트럼선이 더 많이 옮겨 간(z가 큰) 은하가 <b>더 먼 은하</b>인 까닭은?',
          setup() { setView('spec'); },
          choices: ['멀수록 더 빨리 멀어져서 파장이 많이 늘어나고, 이것이 허블-르메트르 법칙이에요', '먼 은하는 붉은 별이 많아서 스펙트럼이 붉어요', '먼 은하일수록 빛이 우주 먼지에 많이 가려져서 붉어져요', '먼 은하의 별은 온도가 더 낮아서 긴 파장의 빛을 내요'],
          answer: 0,
          feedback: ['', '별의 색이 아니라 스펙트럼선이 전체적으로 이동한 거예요. 같은 종류의 선(K선)이 옮겨 간 정도를 재요.', '먼지에 의한 붉어짐(적색화)은 선의 위치를 옮기지 않아요. 선이 옮겨 간 것은 후퇴 속도 때문이에요.', '온도가 다르면 선의 세기가 달라질 뿐 위치는 같아요. 선의 위치가 옮겨 간 것이 적색 편이예요.'],
          explain: '은하가 후퇴하면 도플러 효과로 파장이 늘어나요(적색 편이). 허블-르메트르 법칙에 따라 <b>멀수록 후퇴 속도가 커서</b> z도 커져요.',
        },
      ],
    },
    {
      title: '쐐기 도표: 은하의 3차원 지도', short: '쐐기 도표', icon: '🗺️', phase: '기록',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 스펙트럼 한 장으로 은하 하나의 거리를 알았어요. 은하 수백 개의 스펙트럼을 찍어 <b>방향 θ와 거리 d</b>를 쐐기(부채꼴) 도표에 찍으면 3차원 지도가 돼요.</div>' +
        '<p>분광 관측으로 은하를 찍어 보내고, <b>분광 z</b>와 사진의 색으로 어림한 <b>측광 z</b>로 그린 지도를 비교해요. 해석은 다음 두 차시에서 해요.</p>',
      features: ['wedge'],
      setup() { setView('wedge'); WD.mode = 'spec'; WD.blur = 0; if (!WD.list.length) wdReset(); },
      recap: '방향(2차원)에 거리를 더하면 은하의 분포가 지도에 드러나요. 분광 z는 거리 오차가 0.43 Mpc로 작아 구조가 선명하고, 측광 z는 129 Mpc라 구조가 뭉개져요.',
      summary: '<ul><li>쐐기 도표는 <b>방향 θ</b>(각도)와 <b>거리 d</b>(반지름)를 극좌표로 나타낸 3차원 지도예요. 사진(2차원)에서는 보이지 않던 은하의 분포가 드러나요.</li><li>거리 오차 <b>cΔz / H₀</b>: 분광 z(Δz ≈ 10⁻⁴)는 3×10⁵ × 10⁻⁴ / 70 = <b>0.43 Mpc</b>, 측광 z(Δz ≈ 0.03)는 3×10⁵ × 0.03 / 70 = <b>129 Mpc</b>.</li><li>분광 관측은 오차가 은하단 크기(수 Mpc)보다 작아 <b>구조를 선명하게</b> 보여 줘요.</li></ul>',
      missions: [
        {
          title: '은하 40개를 쐐기에 찍기',
          goal: '<b>📡 은하 40개 분광 관측</b> 버튼으로 은하를 쐐기 도표에 <b>40개 이상</b> 찍으세요.',
          hint: '오른쪽 버튼을 누르면 사진 속 은하가 지도로 날아가 거리에 맞는 자리에 찍혀요.',
          setup() { setView('wedge'); WD.mode = 'spec'; },
          check: () => WD.list.length >= 40,
          hold: 0.8,
          status: () => mark(WD.list.length >= 40) + ' 찍은 은하 ' + WD.list.length + ' / 40개 이상',
          explain: '사진에서는 이리저리 흩어져 보이던 은하들이 지도에서는 <b>거리 방향으로 펼쳐지며</b> 덩어리와 빈 곳이 보이기 시작해요. 은하가 많아질수록 구조가 뚜렷해져요.',
        },
        {
          title: '분광 z와 측광 z의 거리 오차 비교', manual: true,
          goal: '은하를 <b>100개 이상</b> 찍고 지도를 <b>두 방식으로 비교</b>한 뒤, 오차 <b>cΔz / H₀</b> (Mpc)를 각각 계산해 입력하세요. (분광 Δz = 10⁻⁴, 측광 Δz = 0.03)',
          hint: '분광: 3×10⁵ × 10⁻⁴ / 70 ≈ 0.43 Mpc, 측광: 3×10⁵ × 0.03 / 70 ≈ 129 Mpc예요. 🔬 / 📷 버튼으로 지도가 선명해졌다 흐려지는 것을 봐요.',
          setup() { setView('wedge'); S.flags.calcErr = true; WD.seen.spec = false; WD.seen.phot = false; WD.mode = 'spec'; WD.seen.spec = true; WD.errOK = [false, false]; clrIn('inE0', 'inE1'); updateCtl(); },
          check() {
            if (WD.list.length < 100) return '은하를 더 찍어요 (지금 ' + WD.list.length + '개, 100개 이상). 구조 차이가 보이려면 은하가 많아야 해요.';
            if (!WD.seen.phot) return '📷 측광 z 버튼을 눌러 지도가 어떻게 달라지는지 봐요.';
            if (!WD.errOK[0] || !WD.errOK[1]) return '두 방식의 거리 오차를 모두 계산해 입력해요.';
            return true;
          },
          status: () => mark(WD.list.length >= 100) + ' 은하 ' + WD.list.length + '/100 &nbsp; ' + mark(WD.seen.phot) + ' 측광 지도 &nbsp; ' + mark(WD.errOK[0]) + ' 분광 오차 &nbsp; ' + mark(WD.errOK[1]) + ' 측광 오차',
          explain: '분광 z는 <b>0.43 Mpc</b>, 측광 z는 <b>129 Mpc</b>의 거리 오차예요. 약 300배 차이라서 측광 z로는 은하단(수 Mpc)이나 빈 곳(수십 Mpc)이 모두 뭉개져요.',
        },
        {
          type: 'quiz', title: '분광 관측이 구조를 선명하게 보여 주는 까닭',
          goal: '분광 관측으로 그린 지도에서 은하단과 빈 곳이 <b>선명하게 보이는</b> 까닭은?',
          setup() { setView('wedge'); },
          choices: ['분광 z의 거리 오차(약 0.43 Mpc)가 은하단이나 빈 곳의 크기보다 훨씬 작아서예요', '분광 관측은 은하를 더 크게 찍기 때문이에요', '측광 z는 항상 거리를 실제보다 가깝게 재기 때문이에요', '분광 관측은 은하를 더 많이 찍을 수 있어서 모양이 같아져요'],
          answer: 0,
          feedback: ['', '관측의 정밀도는 사진의 크기가 아니라 파장을 얼마나 정확히 재느냐에 달려 있어요.', '측광 z의 오차는 한쪽으로 치우치지 않고 가깝게도 멀게도 퍼져요. 그래서 지도가 뭉개져요.', '같은 400개 은하라도 거리 오차가 작으면 구조가 보이고 크면 뭉개져요. 개수 때문이 아니에요.'],
          explain: '구조를 알아보려면 거리 오차가 구조의 크기보다 작아야 해요. 분광 z의 <b>0.43 Mpc</b>는 은하단(수 Mpc)보다 훨씬 작지만, 측광 z의 <b>129 Mpc</b>는 모든 구조보다 커요.',
        },
      ],
    },
    {
      title: '거리 사다리: 탐사가 가능해진 까닭', short: '거리 사다리', icon: '🪜', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 적색 편이로 먼 은하의 거리를 쟀어요. 하지만 H₀를 정하려면 <b>더 가까운 거리 측정</b>이 필요해요. 거리 규모마다 방법이 달라 <b>거리 사다리</b>로 이어져요.</div>' +
        '<p>방법 5개를 쓰는 거리 범위에 맞게 쌓아 보고, 탐사가 CfA에서 2dF, SDSS, DESI로 커진 규모와 <b>다중 천체 분광기</b>(광섬유 640개)가 관측 시간을 줄이는 효과를 계산해요.</p>',
      features: ['ladder'],
      setup() { setView('ladder'); LD.rise = 1; },
      recap: '방법마다 쓸 수 있는 거리가 달라서 사다리처럼 이어요. 광섬유 640개로 동시에 분광하면 22만 은하가 344시간에 끝나 대규모 탐사가 가능해졌어요.',
      summary: '<ul><li><b>거리 사다리</b>: 연주시차(수 kpc) → 주계열 맞추기(수십 kpc) → 세페이드(수십 Mpc) → 초신성(수 Gpc) → 적색 편이·허블-르메트르 법칙(수천 Mpc 이상). 각 단계는 <b>아래 단계로 보정</b>돼요.</li><li>적색 편이 탐사: CfA(1980년대) 약 1,100개 → 2dF(1997~2002) 약 22만 개 → SDSS(2000~) 100만 개 이상 → DESI(2021~) 수천만 개 목표.</li><li>관측 시간: 슬릿 1개 22만 × 0.5 h = 110,000 h(약 13,750밤), 광섬유 640개 220,000 / 640 = <b>344 h</b>(약 43밤).</li></ul>',
      missions: [
        {
          title: '거리 사다리 쌓기', manual: true,
          goal: '방법 카드 5장을 <b>거리 범위가 가까운 것부터</b> 1단~5단에 쌓으세요. (카드를 눌러 설명을 읽어요)',
          hint: '연주시차 → 주계열 맞추기 → 세페이드 → 초신성 → 허블-르메트르 법칙 순서예요. 마지막 단은 H₀를 아래 단계로 보정해서 써요.',
          setup() { setView('ladder'); cLd.reset(); LD.rise = 0; },
          check() {
            const pl = cLd.items.filter((i) => i.loc != null).length;
            if (pl < 5) return '아직 쌓지 않은 카드가 ' + (5 - pl) + '장 있어요.';
            const bad = cLd.items.filter((i) => !cLd.isRight(i));
            return bad.length ? '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요. 카드 설명의 거리 범위를 비교해 보세요.' : true;
          },
          status: () => mark(cLd.counts().placed === 5) + ' 쌓은 카드 ' + cLd.counts().placed + ' / 5 &nbsp; ' + mark(cLd.counts().right === 5) + ' 알맞게 ' + cLd.counts().right + ' / 5',
          explain: '가까운 곳은 <b>연주시차</b>(수 kpc), 그다음 <b>주계열 맞추기</b>(수십 kpc), <b>세페이드</b>(수십 Mpc), <b>초신성</b>(수 Gpc), 가장 먼 곳은 <b>적색 편이</b>예요. 거리 규모에 따라 방법이 달라지는 까닭은 <b>방법마다 유효한 거리 범위가 다르고</b> 위 단계가 아래 단계로 보정되기 때문이에요.',
        },
        {
          title: '640개 광섬유로 22만 은하를 관측하는 시간',
          goal: '광섬유 <b>640개</b>로 은하 <b>22만 개</b>를 동시에 관측해요. 노출이 <b>1시간</b>이면 모두 몇 시간(h)일까요?',
          hint: '640개씩 한 묶음이면 220,000 / 640 ≈ 343.75번이고, 한 번에 1시간이에요. 약 344 h예요.',
          setup() { setView('ladder'); S.flags.calcHr = true; LD.hrOK = false; clrIn('inH'); updateCtl(); },
          check: () => LD.hrOK,
          hold: 0.5,
          status: () => mark(LD.hrOK) + ' 관측 시간 = ' + ($('#inH').value.trim() || '—') + ' h',
          explain: '220,000 / 640 ≈ <b>344 h</b>(8시간 관측 기준 약 43밤)예요. 슬릿 하나에 은하 한 개씩(30분 노출) 찍으면 110,000 h(약 1.4만 밤)가 걸려서, <b>다중 천체 분광기</b> 덕분에 대규모 탐사가 가능해졌어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-redshift-survey', mount: '#game', badge: '우주 지도 제작자', homeHref: '../../index.html#hu',
    featureLabels: { sky: '🔭 하늘 사진 · 스펙트럼 촬영', spec: '🌈 K선 이동 · z → v → d 계산', wedge: '🗺️ 쐐기 도표 · 분광/측광 비교', ladder: '🪜 거리 사다리 카드 · 탐사 규모' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view, g = S.sel >= 0 ? TG[S.sel] : null;
    if (v === 'sky') setReadouts(['사진 속 은하', '400개', '스펙트럼 찍은 은하', S.taken.size + ' / 6', '사진에 있는 정보', '방향 (2차원)']);
    else if (v === 'spec') setReadouts(['고른 은하', g ? g.id : '—', '관측 K선 λ', g ? g.lam.toFixed(1) + ' nm' : '—', '적색 편이 z', g && calcShown('z', S.sel) ? dZ(g) : '?']);
    else if (v === 'wedge') setReadouts(['찍은 은하', WD.list.length + ' / 400', '거리 측정', WD.mode === 'spec' ? '분광 z' : '측광 z', '거리 오차', WD.mode === 'spec' ? f2(SIG_SPEC) + ' Mpc' : f0(SIG_PHOT) + ' Mpc']);
    else { const c = cLd.counts(); setReadouts(['쌓은 카드', c.placed + ' / 5', '알맞게 쌓음', c.right + ' / 5', '고른 카드', cLd.sel >= 0 ? LADDER[cLd.sel].chip : '—']); }
  }

  /* ================= 루프 ================= */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock += dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    // 스펙트럼 촬영 애니메이션
    if (S.sp.gi >= 0) {
      const g = TG[S.sp.gi];
      S.sp.reveal = approach(S.sp.reveal, 1, dt, 3.2); if (S.sp.reveal > 0.995) S.sp.reveal = 1;
      if (S.sp.reveal >= 1) S.sp.lam = approach(S.sp.lam, g.lam, dt, 3.2);
      if (Math.abs(S.sp.lam - g.lam) < 0.01) S.sp.lam = g.lam;
    }
    view.apply();
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    switch (S.view) {
      case 'sky': drawSky(dt, S.clock); break;
      case 'spec': drawSpec(dt, S.clock); break;
      case 'wedge': drawWedge(dt, S.clock); break;
      default: drawLadder(dt, S.clock);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, updateCtl, TG, GAL, WD, LD, cLd, selectGal, wdBatch, wdReset, specOK, errOK, ladOK, SIG_SPEC, SIG_PHOT, LADDER, HRS_FIB };

})();
