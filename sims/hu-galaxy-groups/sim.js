/* =========================================================
   행성우주과학 Ⅲ. 은하와 우주 - 은하군과 은하단 (6차시)
   성취기준 [12행우03-05] 은하의 공간 분포 자료를 통해 은하의 집단을 이해하고, 은하 장성, 보이드 등 우주의 거시적인 구조를 현대 우주론과 관련지어 설명할 수 있다.
   ① 관찰: 국부 은하군 (M31 시선 속도 −110 km/s vs 허블 흐름 H₀d = 55 km/s)
   ② 분석: 은하단 (처녀자리·머리털자리, d = cz/H₀, 은하군/은하단 특징 분류)
   ③ 탐구: 군집 찾기 (친구의 친구 방법, 연결 거리 b = 0.5~10 Mpc)
   ④ 설명: 구조 규모 (은하 < 은하군 < 은하단 < 초은하단, H₀d와 σ 비교)
   다루지 않음: 비리얼 정리에 의한 은하단 질량 계산, 은하단 암흑 물질 분포, 충돌하는 은하단 분석, 중력 렌즈. 장성·보이드의 식별은 다음 차시.
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
  const H0 = 70, C_KMS = 3.0e5;
  const hub = (d) => H0 * d;
  const fHub = (v) => (v < 10 ? f1(v) : f0(v));
  /* ---- ① 국부 은하군 (예시 값, 시선 속도는 우리은하 기준) ---- */
  const SEL = [
    { id: 'm31', n: 'M31 (안드로메다)', short: 'M31', x: 0.74, y: 0.25, vr: -110, c: '#fbbf24', r: 7.5 },
    { id: 'm33', n: 'M33 (삼각형자리)', short: 'M33', x: 0.52, y: 0.66, vr: -44, c: '#a78bfa', r: 6 },
    { id: 'lmc', n: '대마젤란 은하', short: '대마젤란', x: -0.03, y: -0.04, vr: 64, c: '#f472b6', r: 4.5 },
    { id: 'smc', n: '소마젤란 은하', short: '소마젤란', x: -0.05, y: -0.035, vr: 21, c: '#fb7185', r: 4 },
    { id: 'leo', n: '사자자리 I', short: '사자자리 I', x: 0.2, y: -0.157, vr: 168, c: '#34d399', r: 3.6 },
  ];
  SEL.forEach((m) => { m.d = Math.hypot(m.x, m.y); m.h = hub(m.d); });
  const LGM = [];          // 국부 은하군 구성원 (지도의 점)
  (function () {
    const R = rng(11), gauss = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * R()); };
    LGM.push({ x: 0, y: 0, c: '#93c5fd', r: 6, mw: true });
    SEL.forEach((m) => LGM.push({ x: m.x, y: m.y, c: m.c, r: m.r, sel: m.id }));
    // 우리은하 위성 은하 14개 (0.25 Mpc 안, 8개는 0.15 Mpc 안)
    const rs = [0.066, 0.076, 0.086, 0.086, 0.105, 0.147, 0.11, 0.13, 0.17, 0.19, 0.21, 0.23, 0.18, 0.22];
    rs.forEach((r, i) => { const a = i * 2.4 + 0.7; LGM.push({ x: r * Math.cos(a), y: r * Math.sin(a), c: '#cbd5e1', r: 2.4, sat: 'mw' }); });
    // M31 둘레 위성 14개
    for (let i = 0; i < 14; i++) { const a = R() * TAU, r = 0.03 + 0.17 * R(); LGM.push({ x: 0.74 + r * Math.cos(a), y: 0.25 + r * Math.sin(a), c: '#cbd5e1', r: 2.4, sat: 'm31' }); }
    // 나머지 48개: 지름 약 3 Mpc 안에 흩어져 있어요
    let c = 0; while (c < 48) { const r = 1.42 * Math.sqrt(R()), a = R() * TAU, x = r * Math.cos(a), y = r * Math.sin(a); if (Math.hypot(x, y) < 0.3 || Math.hypot(x - 0.74, y - 0.25) < 0.22 || Math.hypot(x - 0.52, y - 0.66) < 0.1) continue; LGM.push({ x, y, c: '#cbd5e1', r: 2.4 }); c++; }
  })();
  /* ---- ② 은하단 ---- */
  const CLU = [
    { id: 'virgo', n: '처녀자리 은하단', d: 16.5, num: '약 1300~2000개', sig: '약 700 km/s', gas: '약 3×10⁷ K', center: 'M87 (cz = 1280 km/s, H₀d = ' + hub(16.5) + ' km/s)', size: '약 10 Mpc', a: 0.34 },
    { id: 'coma', n: '머리털자리 은하단', cz: 6900, d: 6900 / H0, num: '수천 개', sig: '약 1000 km/s', gas: '약 9×10⁷ K', center: '거대 타원 은하', size: '', a: 0.24 },
  ];
  const CL_GAL = CLU.map((cl, k) => {
    const R = rng(900 + k * 17), gauss = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * R()); }, a = [];
    for (let i = 0; i < 150; i++) {
      const rr = cl.a * Math.sqrt(Math.pow(R(), -1.2) - 1) * 1.5, r = Math.min(rr, 0.95), th = R() * TAU;
      const ell = R() < (0.9 - 0.55 * r);
      a.push({ x: r * Math.cos(th), y: r * Math.sin(th) * 0.82, ell, s: ell ? 1.4 + 2.2 * R() : 1.6 + 2.2 * R(), rot: R() * Math.PI, br: 0.5 + 0.5 * R() });
    }
    a.push({ x: 0, y: 0, ell: true, s: 6.5, rot: 0.4, br: 1, cd: true });
    return a;
  });
  const CARDS = [
    { label: '은하 수', sub: '수~수십 개', chip: '은하 수~수십 개', bin: 0 },
    { label: '지름', sub: '약 1~3 Mpc', chip: '지름 1~3 Mpc', bin: 0 },
    { label: '질량', sub: '약 10¹³ M☉', chip: '질량 10¹³ M☉', bin: 0 },
    { label: '은하 수', sub: '수백~수천 개', chip: '은하 수백~수천', bin: 1 },
    { label: '지름', sub: '약 10 Mpc에 이르러요', chip: '지름 ~10 Mpc', bin: 1 },
    { label: '질량', sub: '10¹⁴~10¹⁵ M☉', chip: '질량 10¹⁴~10¹⁵', bin: 1 },
    { label: '은하 사이 가스', sub: '10⁷~10⁸ K의 X선 가스', chip: 'X선 고온 가스', bin: 1 },
    { label: '은하의 종류', sub: '타원·렌즈형이 많아요', chip: '타원 은하 많음', bin: 1 },
    { label: '속도 분산', sub: '약 500~1500 km/s', chip: 'σ 500~1500', bin: 1 },
  ];
  /* ---- ③ 군집 찾기 (합성: 80 × 80 Mpc, 은하 150개) ---- */
  const FOF = [];
  (function () {
    const R = rng(2026), gauss = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * R()); };
    const clump = (cx, cy, n, sg, rmax) => { for (let i = 0; i < n; i++) { let x, y; do { x = (R() * 2 - 1) * rmax; y = (R() * 2 - 1) * rmax; } while (Math.hypot(x, y) > rmax); FOF.push({ x: cx + x, y: cy + y, kind: 'clump' }); } };
    clump(50, 44, 25, 1.0, 2.0);                       // 큰 덩어리(은하단): 약 25개, 지름 4 Mpc
    clump(22, 60, 8, 0.4, 0.75); clump(18, 22, 8, 0.4, 0.75);   // 작은 덩어리(은하군) 2곳: 약 8개, 지름 1.5 Mpc
    const along = (pts, n) => { const seg = []; let L = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; } for (let k = 1; k <= n; k++) { let s = L * k / (n + 1), i = 0; while (s > seg[i]) { s -= seg[i]; i++; } const f = s / seg[i]; FOF.push({ x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f + 0.4 * gauss(), y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f + 0.4 * gauss(), kind: 'chain' }); } };
    along([[18, 22], [8, 40], [22, 60]], 10); along([[22, 60], [40, 66], [50, 44]], 10);   // 사슬 약 20개
    let guard = 0; while (FOF.length < 150 && guard++ < 50000) {
      const x = 40 + 16 * gauss(), y = 42 + 16 * gauss();
      if (x < 2 || x > 78 || y < 2 || y > 78) continue;
      if (FOF.some((g) => Math.hypot(g.x - x, g.y - y) < (g.kind === 'scat' ? 1.4 : 3.0))) continue;
      FOF.push({ x, y, kind: 'scat' });
    }
  })();
  function fofComps(b) {
    const n = FOF.length, par = Array.from({ length: n }, (_, i) => i), find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
    const edges = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = Math.hypot(FOF[i].x - FOF[j].x, FOF[i].y - FOF[j].y); if (d < b) { edges.push([i, j, d]); const a = find(i), c = find(j); if (a !== c) par[Math.max(a, c)] = Math.min(a, c); } }
    const root = FOF.map((_, i) => find(i)), cnt = new Map(); root.forEach((r) => cnt.set(r, (cnt.get(r) || 0) + 1));
    const sizes = [...cnt.values()];
    return { root, cnt, edges, nClump: sizes.filter((s) => s >= 2).length, largest: Math.max(...sizes), big: sizes.filter((s) => s >= 15).length, small: sizes.filter((s) => s >= 5 && s < 15).length };
  }
  const BG = []; for (let b = 0.5; b <= 10.001; b += 0.5) { const c = fofComps(b); BG.push({ b, nClump: c.nClump, largest: c.largest, big: c.big, small: c.small }); }
  const PAL = ['#ef4444', '#3b82f6', '#16a34a', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6', '#6366f1', '#a16207'];
  /* ---- ④ 구조 규모 ---- */
  const SC = [
    { n: '은하', sub: '별 수천억 개', d: 0.03, sig: 200, c: '#38bdf8', pos: 0 },
    { n: '은하군', sub: '은하 수~수십 개', d: 2, sig: 200, c: '#22c55e', pos: 1 },
    { n: '은하단', sub: '은하 수백~수천 개', d: 5, sig: 1000, c: '#f59e0b', pos: 2 },
    { n: '초은하단', sub: '군·단 수십 개', d: 50, sig: 300, c: '#ef4444', pos: 3 },
  ];
  SC.forEach((s) => { s.h = hub(s.d); s.exp = s.h > s.sig; });
  const SCBIN = [{ label: '① 가장 작아요', color: '#0ea5e9' }, { label: '②', color: '#14b8a6' }, { label: '③', color: '#f59e0b' }, { label: '④ 가장 커요', color: '#ef4444' }];

  /* ================= 상태 ================= */
  const S = {
    view: 'local', clock: 0, fade: 0, sel: 0, selOrd: 0,
    ar: { obs: 0, hub: 0 },
    hmOK: false, czOK: false, hdOK: [false, false, false],
    cl: { k: 0, xray: 0, tgt: 0 },
    fof: { b: 0.5, bs: 0.5, cache: null, cb: -1 },
    sc: { rise: 0, ordered: false },
    hit: [], flags: { calcHM: false, calcCz: false, calcHd: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { local: '🌌 국부 은하군 (지름 약 3 Mpc)', cluster: '🫧 은하단: 처녀자리와 머리털자리', fof: '🔗 군집 찾기: 연결 거리 b', scale: '📏 구조의 규모와 우주 팽창' };
  const modeBtns = $$('#modeSeg button');
  const selM = () => SEL[S.sel];

  /* ---------- 배치 ---------- */
  function LLoc() {
    return PHONE
      ? { P: { x: 8, y: 8, w: 464, h: 540 }, I: { x: 8, y: 556, w: 464, h: 296 }, cx: 240, cy: 246, R: 206, ins: { x: 402, y: 478, r: 62 } }
      : { P: { x: 10, y: 8, w: 780, h: 440 }, I: { x: 10, y: 456, w: 780, h: 156 }, cx: 300, cy: 236, R: 194, ins: { x: 652, y: 318, r: 86 } };
  }
  const LCl = () => PHONE
    ? { A: { x: 8, y: 8, w: 464, h: 346 }, PIC: { x: 18, y: 40, w: 444, h: 168 }, B: { x: 8, y: 362, w: 464, h: 490 } }
    : { A: { x: 10, y: 8, w: 780, h: 226 }, PIC: { x: 20, y: 40, w: 376, h: 178 }, B: { x: 10, y: 242, w: 780, h: 370 } };
  const LFof = () => PHONE
    ? { M: { x: 8, y: 8, w: 464, h: 480 }, G: { x: 8, y: 496, w: 464, h: 356 } }
    : { M: { x: 10, y: 8, w: 486, h: 604 }, G: { x: 504, y: 8, w: 286, h: 604 } };
  const LSc = () => PHONE
    ? { P: { x: 8, y: 8, w: 464, h: 440 }, Q: { x: 8, y: 456, w: 464, h: 396 } }
    : { P: { x: 10, y: 8, w: 780, h: 250 }, Q: { x: 10, y: 266, w: 780, h: 346 } };

  /* =========================================================
     ① 국부 은하군
     ========================================================= */
  function selectMem(i) { S.sel = i; updateCtl(); }
  function dark(x, y, w, h) { D.shadow(() => { ctx.fillStyle = '#0a1226'; rr(x, y, w, h, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(20,40,80,.2)' }); }
  function drawLocal(dt, t) {
    const L = LLoc(), P = L.P, I = L.I, k = L.R / 1.5, m = selM();
    dark(P.x, P.y, P.w, P.h);
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14); ctx.clip(); spaceBg(P.x, P.y, P.w, P.h, t, '#070d22', '#101a3c'); ctx.restore();
    T(P.x + 14, P.y + 24 * FS, '🌌 국부 은하군: 점 ' + LGM.length + '개', PHONE ? 12.5 : 14.5, '#e2e8f0', 'left', 800);
    // 지름 3 Mpc 원
    ctx.strokeStyle = 'rgba(147,197,253,.55)'; ctx.lineWidth = 1.8; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(L.cx, L.cy, L.R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(99,102,241,.07)'; ctx.beginPath(); ctx.arc(L.cx, L.cy, L.R, 0, TAU); ctx.fill();
    T(L.cx, L.cy - L.R - 8, '지름 약 3 Mpc', PHONE ? 11 : 12.5, '#93c5fd', 'center', 800);
    // 눈금자 0.5 Mpc
    const sx = L.cx - L.R, sy = L.cy + L.R + (PHONE ? 22 : 16);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 0.5 * k, sy); ctx.stroke(); T(sx + 0.25 * k, sy - 7, '0.5 Mpc', 11.5, '#cbd5e1', 'center', 700);
    // 구성원
    LGM.forEach((g) => { const x = L.cx + g.x * k, y = L.cy - g.y * k; if (g.mw) return; if (g.sel) return; ctx.fillStyle = g.c; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(x, y, g.r * (PHONE ? 0.9 : 1), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; });
    const draw1 = (id) => { const g = LGM.find((q) => q.sel === id), x = L.cx + g.x * k, y = L.cy - g.y * k; D.glow(x, y, g.r * 3, g.c, 0.5); D.sphere(x, y, g.r, g.c, { gloss: g.r > 5 }); };
    ['m33', 'leo', 'm31'].forEach(draw1);
    D.glow(L.cx, L.cy, 24, '#93c5fd', 0.7); D.sphere(L.cx, L.cy, 7, '#60a5fa', { gloss: true });
    T(L.cx, L.cy + 24, '우리은하', PHONE ? 11 : 12.5, '#bfdbfe', 'center', 800, { stroke: 'rgba(5,10,30,.8)', strokeWidth: 3 });
    const mp = (id) => { const g = LGM.find((q) => q.sel === id); return { x: L.cx + g.x * k, y: L.cy - g.y * k }; };
    [['m31', 'M31', -14, -18], ['m33', 'M33', 12, -12], ['leo', '사자자리 I', 6, 20]].forEach(([id, n, dx, dy]) => { const p = mp(id); T(p.x + dx, p.y + dy, n, PHONE ? 11 : 12.5, '#fde68a', 'center', 800, { stroke: 'rgba(5,10,30,.8)', strokeWidth: 3 }); });
    // 선택 표시 + 속도 화살표
    const ins = L.ins, ik = ins.r / 0.15;
    const inInset = m.id === 'lmc' || m.id === 'smc';
    const selPos = inInset ? { x: ins.x + m.x * ik, y: ins.y - m.y * ik } : mp(m.id), kk = inInset ? ik : k;
    const ux = m.x / m.d, uy = -m.y / m.d;
    S.ar.obs = approach(S.ar.obs, m.vr, dt, 7); S.ar.hub = approach(S.ar.hub, m.h, dt, 7);
    D.ring(selPos.x, selPos.y, (m.r + 7), t, { color: '#fbbf24', width: 2, speed: 1 });
    const vs = 0.6, px = -uy * 12, py = ux * 12;
    const L1 = S.ar.obs * vs;
    if (Math.abs(L1) > 2) D.arrow(selPos.x + px, selPos.y + py, selPos.x + px + ux * L1, selPos.y + py + uy * L1, { color: S.ar.obs < 0 ? '#38bdf8' : '#f87171', width: 5, head: 13 });
    const hubVis = FREE() || m.id !== 'm31' || S.hmOK;
    const L2 = S.ar.hub * vs;
    if (hubVis && Math.abs(L2) > 5) D.arrow(selPos.x - px, selPos.y - py, selPos.x - px + ux * L2, selPos.y - py + uy * L2, { color: '#e2e8f0', width: 3.5, head: 11, dash: [7, 5] });
    // 확대 상자: 우리은하 둘레
    ctx.save(); ctx.beginPath(); ctx.arc(ins.x, ins.y, ins.r, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(8,16,40,.95)'; ctx.fillRect(ins.x - ins.r, ins.y - ins.r, 2 * ins.r, 2 * ins.r);
    LGM.forEach((g) => { if (Math.hypot(g.x, g.y) > 0.16 || g.mw) return; const x = ins.x + g.x * ik, y = ins.y - g.y * ik; D.glow(x, y, g.r * 2.4, g.c, 0.4); ctx.fillStyle = g.c; ctx.beginPath(); ctx.arc(x, y, g.sel ? g.r : 2.6, 0, TAU); ctx.fill(); });
    D.sphere(ins.x, ins.y, 5, '#60a5fa', { gloss: false });
    ctx.restore();
    ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ins.x, ins.y, ins.r, 0, TAU); ctx.stroke();
    T(ins.x, ins.y - ins.r - 8, '🔍 우리은하 둘레 ×' + f1(ik / k), PHONE ? 10.5 : 12, '#bfdbfe', 'center', 800);
    [['lmc', '대마젤란', 0], ['smc', '소마젤란', 1]].forEach(([id, n, j]) => { const g = SEL.find((q) => q.id === id); T(ins.x + g.x * ik + (j ? -5 : 5), ins.y - g.y * ik + (j ? 17 : -9), n, PHONE ? 9.5 : 11, '#fbcfe8', j ? 'right' : 'left', 800, { stroke: 'rgba(5,10,30,.8)', strokeWidth: 3 }); });
    S.hit = SEL.map((q, i) => { const inI = q.id === 'lmc' || q.id === 'smc'; const p = inI ? { x: ins.x + q.x * ik, y: ins.y - q.y * ik } : mp(q.id); return { x: p.x, y: p.y, r: inI ? 11 : Math.max(16, q.r + 8), i }; });
    // 범례
    const lx = PHONE ? P.x + 14 : P.x + 548, ly = PHONE ? P.y + P.h - 56 : P.y + 70;
    if (!PHONE) {
      D.arrow(lx, ly, lx + 36, ly, { color: '#38bdf8', width: 5, head: 12 }); T(lx + 46, ly + 5, '다가와요 (v < 0)', 12.5, '#bae6fd', 'left', 800);
      D.arrow(lx, ly + 28, lx + 36, ly + 28, { color: '#f87171', width: 5, head: 12 }); T(lx + 46, ly + 33, '멀어져요 (v > 0)', 12.5, '#fecaca', 'left', 800);
      D.arrow(lx, ly + 56, lx + 36, ly + 56, { color: '#e2e8f0', width: 3.5, head: 11, dash: [7, 5] }); T(lx + 46, ly + 61, '허블 흐름 H₀d', 12.5, '#e2e8f0', 'left', 800);
      T(lx, ly + 90, '화살표 길이는 속도에 비례해요', 11.5, '#94a3b8', 'left', 700); T(lx, ly + 106, '(우리은하와 잇는 방향의 속도, 예시 값)', 11.5, '#94a3b8', 'left', 700);
    } else {
      D.arrow(lx, ly, lx + 26, ly, { color: '#38bdf8', width: 4, head: 10 }); T(lx + 32, ly + 5, '다가옴', 11, '#bae6fd', 'left', 800);
      D.arrow(lx + 88, ly, lx + 114, ly, { color: '#f87171', width: 4, head: 10 }); T(lx + 120, ly + 5, '멀어짐', 11, '#fecaca', 'left', 800);
      D.arrow(lx, ly + 26, lx + 26, ly + 26, { color: '#e2e8f0', width: 3, head: 9, dash: [6, 4] }); T(lx + 32, ly + 31, '허블 흐름 H₀d', 11, '#e2e8f0', 'left', 800);
    }
    // 정보 판
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    T(I.x + 14, I.y + 24 * FS, '🔎 ' + m.n, 15, '#1e293b', 'left', 800);
    const hdTxt = hubVis ? '+' + fHub(m.h) + ' km/s' : '?';
    const rows = [['거리 d', f2(m.d) + ' Mpc'], ['관측한 시선 속도 v', (m.vr > 0 ? '+' : '−') + Math.abs(m.vr) + ' km/s ' + (m.vr < 0 ? '(다가옴, 청색 편이)' : '(멀어짐)')], ['허블 흐름이라면 H₀d = 70 × ' + f2(m.d), hdTxt]];
    let yy = I.y + 50 * FS;
    rows.forEach((r, i) => { T(I.x + 14, yy, r[0], PHONE ? 12.5 : 13.5, '#475569', 'left', 800); T(I.x + I.w - 14, yy, r[1], PHONE ? 12 : 13.5, i === 1 ? (m.vr < 0 ? '#0369a1' : '#b91c1c') : (hubVis ? '#334155' : '#94a3b8'), 'right', 800); yy += (PHONE ? 26 : 25) * FS; });
    let msg;
    if (!hubVis) msg = 'M31의 허블 흐름 속도를 직접 계산해 보세요.';
    else if (m.vr < 0) msg = '→ 허블 흐름이라면 멀어져야 하는데 실제로는 다가와요: 중력으로 서로 묶여 있기 때문이에요.';
    else msg = '→ 이 정도 거리에서는 허블 흐름(+' + fHub(m.h) + ')보다 중력에 의한 운동이 더 커요.';
    drawWrap(I.x + 14, yy + 2, msg, I.w - 28, PHONE ? 12.5 : 13, { color: '#0369a1', weight: 800 });
    if (PHONE) drawWrap(I.x + 14, I.y + I.h - 32, '속도 값은 우리은하 기준의 예시 값이에요. 국부 은하군 구성원은 약 80여 개예요.', I.w - 28, 11.5, { color: '#64748b' });
    else T(I.x + I.w - 14, I.y + 24 * FS, '속도 값은 우리은하 기준 예시 값 · 구성원 약 80여 개', 12, '#64748b', 'right', 700);
  }

  /* =========================================================
     ② 은하단
     ========================================================= */
  const CLS = S.cl;
  function LCls() {
    const L = LCl(), B = L.B;
    if (PHONE) return { grid: { x: B.x + 8, y: B.y + 10, w: B.w - 16, cols: 2, cardH: 44, gap: 6 }, bins: [{ x: B.x + 8, y: B.y + 10 + 5 * 50 + 6, w: (B.w - 22) / 2, h: B.h - 10 - 250 - 14 }, { x: B.x + 14 + (B.w - 22) / 2, y: B.y + 10 + 5 * 50 + 6, w: (B.w - 22) / 2, h: B.h - 10 - 250 - 14 }] };
    return { grid: { x: B.x + 8, y: B.y + 10, w: B.w - 16, cols: 3, cardH: 34, gap: 6 }, bins: [{ x: B.x + 8, y: B.y + 10 + 3 * 40 + 6, w: (B.w - 22) / 2, h: B.h - 10 - 120 - 14 }, { x: B.x + 14 + (B.w - 22) / 2, y: B.y + 10 + 3 * 40 + 6, w: (B.w - 22) / 2, h: B.h - 10 - 120 - 14 }] };
  }
  const cCl = makeClassifier({
    items: CARDS.map((c) => ({ label: c.label, sub: c.sub, chip: c.chip, bin: c.bin, open: true })),
    bins: [{ label: '👥 은하군', color: '#16a34a' }, { label: '🏙 은하단', color: '#dc2626' }],
    chipCols: 1, minRows: 5,
    layout: () => { const L = LCls(); return { grid: L.grid, bins: L.bins }; },
    onPlace(it, b) {
      it.wrong = b !== it.bin;
      if (it.wrong) { say('「' + it.label + '」은(는) 그 집단의 특징이 아니에요. 규모·은하 수·X선 가스를 비교해 보세요.', true, 3.4); Sound.fail(); }
      else parts.burst(it.x + it.w / 2, it.y + it.h / 2, { count: 10, speed: 120, colors: [it.bin ? '#dc2626' : '#16a34a', '#fbbf24'] });
    },
    onChange() { updateCtl(); },
  });
  const clsOK = () => cCl.items.every((i) => i.loc != null && cCl.isRight(i));
  const czShown = () => S.czOK || FREE();
  function drawGalDot(x, y, s, rot, ell, br, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
    ctx.fillStyle = ell ? 'rgba(255,196,120,' + (0.35 + 0.5 * br).toFixed(2) + ')' : 'rgba(150,200,255,' + (0.35 + 0.5 * br).toFixed(2) + ')';
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * (ell ? 0.75 : 0.5), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawCluster(dt, t) {
    const L = LCl(), A = L.A, PIC = L.PIC, k = CLS.k, cl = CLU[k];
    CLS.xray = approach(CLS.xray, CLS.tgt, dt, 4);
    dark(A.x, A.y, A.w, A.h);
    T(A.x + 14, A.y + 24 * FS, '🫧 ' + cl.n + (CLS.tgt ? ' · X선으로 본 모습' : ' · 가시광선으로 본 모습'), PHONE ? 12 : 14, '#e2e8f0', 'left', 800);
    ctx.save(); rr(PIC.x, PIC.y, PIC.w, PIC.h, 10); ctx.clip();
    const bg = ctx.createLinearGradient(0, PIC.y, 0, PIC.y + PIC.h); bg.addColorStop(0, '#04070f'); bg.addColorStop(1, '#0c1330'); ctx.fillStyle = bg; ctx.fillRect(PIC.x, PIC.y, PIC.w, PIC.h);
    const cx = PIC.x + PIC.w / 2, cy = PIC.y + PIC.h / 2, sc = PIC.h * 0.46, xr = CLS.xray;
    // X선 가스
    const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, sc * 1.5); gg.addColorStop(0, 'rgba(196,181,253,' + (0.15 + 0.7 * xr).toFixed(3) + ')'); gg.addColorStop(0.35, 'rgba(129,140,248,' + (0.08 + 0.45 * xr).toFixed(3) + ')'); gg.addColorStop(1, 'rgba(99,102,241,0)');
    ctx.fillStyle = gg; ctx.fillRect(PIC.x, PIC.y, PIC.w, PIC.h);
    CL_GAL[k].forEach((g) => { const al = 1 - 0.78 * xr; drawGalDot(cx + g.x * sc * 2.0 * (PIC.w / PIC.h) * 0.62, cy + g.y * sc * 2.0, g.s * (PHONE ? 1.0 : 1.25), g.rot, g.ell, g.br, al); });
    ctx.restore();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; rr(PIC.x, PIC.y, PIC.w, PIC.h, 10).stroke();
    T(PIC.x + 10, PIC.y + PIC.h - 10, '붉은 노랑: 타원·렌즈형 · 푸른빛: 나선 · 보라 안개: X선 가스', PHONE ? 9.5 : 11, '#cbd5e1', 'left', 700, { stroke: 'rgba(5,10,30,.8)', strokeWidth: 3 });
    // 표
    const tx = PHONE ? A.x + 14 : PIC.x + PIC.w + 16, tw = PHONE ? A.w - 28 : A.x + A.w - tx - 14, ty = PHONE ? PIC.y + PIC.h + 26 : A.y + 44, rh = PHONE ? 25 : 28;
    const rows = [['거리', k === 1 ? (czShown() ? '약 ' + f0(cl.d) + ' Mpc' : 'cz = 6900 → ?') : '약 16.5 Mpc'], ['은하 수', cl.num], ['속도 분산 σ', cl.sig], ['X선 가스 온도', cl.gas], ['중심', k === 0 ? 'M87 (cz = 1280 km/s)' : cl.center]];
    rows.forEach((r, i) => { ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.09)'; rr(tx, ty + i * rh - 14, tw, rh - 2, 7).fill(); T(tx + 10, ty + i * rh + 4, r[0], PHONE ? 11.5 : 12.5, '#94a3b8', 'left', 800); const hl = k === 1 && i === 0 && !czShown(); T(tx + tw - 10, ty + i * rh + 4, r[1], PHONE ? 11.5 : 12.5, hl ? '#fde68a' : '#e2e8f0', 'right', 800); });
    if (k === 0) T(tx + 2, ty + 5 * rh + 10, 'M87: H₀d = 70 × 16.5 = ' + hub(16.5) + ' km/s', PHONE ? 11 : 12, '#93c5fd', 'left', 700);
    else T(tx + 2, ty + 5 * rh + 10, czShown() ? 'd = cz / H₀ = 6900 / 70 = ' + f0(cl.d) + ' Mpc' : '허블-르메트르 법칙: d = cz / H₀', PHONE ? 11 : 12, czShown() ? '#86efac' : '#93c5fd', 'left', 700);
    // 분류 판
    const B = L.B;
    panel(B.x, B.y, B.w, B.h, { r: 14 });
    cCl.draw(dt, {});
  }

  /* =========================================================
     ③ 군집 찾기
     ========================================================= */
  const FS_ = S.fof;
  function fofGet() { if (FS_.cb !== FS_.bs) { FS_.cache = fofComps(FS_.bs); FS_.cb = FS_.bs; } return FS_.cache; }
  const FM = new Map();
  const fofNow = () => { const k = FS_.b; let r = FM.get(k); if (!r) { r = fofComps(k); FM.set(k, r); } return r; };
  function drawFof(dt, t) {
    const L = LFof(), M = L.M, G = L.G;
    FS_.bs = Math.abs(FS_.b - FS_.bs) < 0.004 ? FS_.b : approach(FS_.bs, FS_.b, dt, 6);
    const C = fofGet();
    dark(M.x, M.y, M.w, M.h);
    T(M.x + 14, M.y + 24 * FS, '🔗 은하 150개 (80 × 80 Mpc) · 연결 거리 b = ' + f1(FS_.b) + ' Mpc', PHONE ? 11.5 : 14, '#e2e8f0', 'left', 800);
    const side = PHONE ? 440 : 456, mx = M.x + (M.w - side) / 2, my = M.y + 40 * Math.min(FS, 1.12), s = side / 80;
    ctx.fillStyle = '#05091a'; rr(mx, my, side, side, 8).fill(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; rr(mx, my, side, side, 8).stroke();
    const pos = (g) => ({ x: mx + g.x * s, y: my + (80 - g.y) * s });
    const colOf = (i) => { const r = C.root[i]; return C.cnt.get(r) >= 2 ? PAL[r % PAL.length] : null; };
    // 연결선
    ctx.lineWidth = 1.4;
    C.edges.forEach((e) => { const a = pos(FOF[e[0]]), b = pos(FOF[e[1]]), c = colOf(e[0]); ctx.strokeStyle = c || '#64748b'; ctx.globalAlpha = 0.65; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
    ctx.globalAlpha = 1;
    // 연결 거리 원 (가장 큰 덩어리가 아니라 큰 덩어리의 한 은하 예시)
    ctx.strokeStyle = 'rgba(251,191,36,.9)'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(pos(FOF[60]).x, pos(FOF[60]).y, FS_.bs * s, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    FOF.forEach((g, i) => { const p = pos(g), c = colOf(i); ctx.fillStyle = c || '#94a3b8'; ctx.beginPath(); ctx.arc(p.x, p.y, c ? 3.1 : 2.4, 0, TAU); ctx.fill(); if (c) { ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 0.8; ctx.stroke(); } });
    // 눈금자
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mx + 10, my + side - 12); ctx.lineTo(mx + 10 + 10 * s, my + side - 12); ctx.stroke(); T(mx + 10 + 5 * s, my + side - 18, '10 Mpc', 11.5, '#e2e8f0', 'center', 800);
    T(mx + side - 8, my + side - 10, '점선 원: 반지름 b (은하 하나의 이웃 범위)', PHONE ? 9.5 : 11, '#fde68a', 'right', 700);
    // 아래 글
    const by = my + side + (PHONE ? 22 : 24);
    const big = C.big, small = C.small;
    T(M.x + 14, by, '은하단급(은하 15개 이상) ' + big + '개 · 은하군급(5~14개) ' + small + '개', PHONE ? 11.5 : 13.5, '#86efac', 'left', 800);
    T(M.x + 14, by + 22 * Math.min(FS, 1.12), '연결된 덩어리(2개 이상) ' + C.nClump + '개 · 가장 큰 덩어리 ' + C.largest + '개', PHONE ? 11.5 : 13.5, '#e2e8f0', 'left', 800);
    // 그래프
    panel(G.x, G.y, G.w, G.h, { r: 14 });
    const charts = PHONE
      ? [{ k: 'nClump', y: G.y + 52, h: 110, ymax: 40, title: '연결된 덩어리의 수 (2개 이상)', col: '#2563eb', x: G.x + 14, w: (G.w - 40) / 2 }, { k: 'largest', y: G.y + 52, h: 110, ymax: 150, title: '가장 큰 덩어리의 은하 수', col: '#dc2626', x: G.x + G.w / 2 + 6, w: (G.w - 40) / 2 }]
      : [{ k: 'nClump', y: G.y + 52, h: 150, ymax: 40, title: '연결된 덩어리의 수 (2개 이상)', col: '#2563eb', x: G.x + 40, w: G.w - 62 }, { k: 'largest', y: G.y + 52 + 215, h: 150, ymax: 150, title: '가장 큰 덩어리의 은하 수', col: '#dc2626', x: G.x + 40, w: G.w - 62 }];
    T(G.x + 14, G.y + 24 * FS, '📈 b에 따라 달라지는 집단', 14, '#1e293b', 'left', 800);
    charts.forEach((c) => {
      const x0 = c.x, w = c.w, y0 = c.y, h = c.h, gx = (b) => x0 + (b - 0.5) / 9.5 * w, gy = (v) => y0 + h - clamp(v / c.ymax, 0, 1) * h;
      T(PHONE ? x0 : G.x + 14, y0 - 10, c.title, PHONE ? 10.5 : 12, '#475569', 'left', 800);
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + h); ctx.lineTo(x0 + w, y0 + h); ctx.stroke();
      [0, c.ymax / 2, c.ymax].forEach((v) => { T(x0 - 5, gy(v) + 4, String(f0(v)), 10.5, '#64748b', 'right', 700); });
      [0.5, 2, 4, 6, 8, 10].forEach((b) => { T(gx(b), y0 + h + 15 * Math.min(FS, 1.1), String(b), 10.5, '#64748b', 'center', 700); });
      T(x0 + w, y0 + h + 30 * Math.min(FS, 1.1), 'b (Mpc)', 10.5, '#64748b', 'right', 700);
      ctx.strokeStyle = c.col; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.beginPath(); BG.forEach((q, i) => { const x = gx(q.b), y = gy(q[c.k]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      // 현재 b
      const bnow = clamp(FS_.bs, 0.5, 10), vnow = c.k === 'nClump' ? C.nClump : C.largest;
      ctx.strokeStyle = 'rgba(245,158,11,.9)'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(gx(bnow), y0); ctx.lineTo(gx(bnow), y0 + h); ctx.stroke(); ctx.setLineDash([]);
      D.sphere(gx(bnow), gy(vnow), 5, c.col, { gloss: false }); T(clamp(gx(bnow) + 8, x0 + 4, x0 + w - 30), clamp(gy(vnow) - 8, y0 + 12, y0 + h - 4), String(vnow), 12, c.col, 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    });
    if (!PHONE) drawWrap(G.x + 14, G.y + 52 + 215 + 150 + 52, 'b가 작으면 아주 가까운 은하끼리만 이어져 덩어리가 많고 작아요. b를 키우면 덩어리가 합쳐져 하나의 거대한 덩어리가 돼요.', G.w - 28, 12.5, { color: '#64748b' });
    else drawWrap(G.x + 14, G.y + 52 + 110 + 56, 'b가 작으면 덩어리가 많고 작아요. b를 키우면 덩어리가 합쳐져 하나의 거대한 덩어리가 돼요. 집단의 경계는 b를 어떻게 정하느냐에 따라 달라져요.', G.w - 28, 12, { color: '#64748b' });
  }

  /* =========================================================
     ④ 구조 규모
     ========================================================= */
  function LScCls() {
    const L = LSc(), P = L.P;
    if (PHONE) return { grid: { x: P.x + 8, y: P.y + 40, w: P.w - 16, cols: 2, cardH: 46, gap: 6 }, bins: [0, 1, 2, 3].map((i) => ({ x: P.x + 8 + i * ((P.w - 16 - 18) / 4 + 6), y: P.y + 40 + 2 * 52 + 12, w: (P.w - 16 - 18) / 4, h: P.h - 40 - 104 - 20 })) };
    return { grid: { x: P.x + 8, y: P.y + 38, w: P.w - 16, cols: 4, cardH: 48, gap: 8 }, bins: [0, 1, 2, 3].map((i) => ({ x: P.x + 8 + i * ((P.w - 16 - 24) / 4 + 8), y: P.y + 38 + 48 + 14, w: (P.w - 16 - 24) / 4, h: P.h - 38 - 48 - 14 - 12 })) };
  }
  const cSc = makeClassifier({
    items: SC.map((s) => ({ label: s.n, sub: s.sub, chip: s.n, bin: s.pos, open: true })),
    bins: SCBIN, chipCols: 1, minRows: 1, placeholder: '',
    layout: () => { const L = LScCls(); return { grid: L.grid, bins: L.bins }; },
    detailFn: (it) => ({ title: it.label, body: it.sub }),
    onPlace(it, b) {
      it.wrong = b !== it.bin;
      if (it.wrong) { say('「' + it.label + '」은(는) 그 자리가 아니에요. 국부 은하군·은하단·초은하단의 지름을 떠올려 보세요.', true, 3.4); Sound.fail(); }
      else parts.burst(it.x + it.w / 2, it.y + it.h / 2, { count: 10, speed: 120, colors: [SCBIN[b].color, '#fbbf24'] });
    },
    onChange() { updateCtl(); },
  });
  const scOK = () => cSc.items.every((i) => i.loc != null && cSc.isRight(i));
  const hdShown = () => S.hdOK.every(Boolean) || FREE();
  function drawScale(dt, t) {
    const L = LSc(), P = L.P, Q = L.Q;
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    T(P.x + 14, P.y + 24 * FS, '📏 구조 4개를 크기순으로 배열해요', PHONE ? 12.5 : 14.5, '#1e293b', 'left', 800);
    cSc.draw(dt, {});
    panel(Q.x, Q.y, Q.w, Q.h, { r: 14 });
    const open = S.sc.ordered || FREE();
    S.sc.rise = approach(S.sc.rise, open ? 1 : 0, dt, 2);
    T(Q.x + 14, Q.y + 24 * FS, '⚖ 중력으로 묶임 vs 우주 팽창 (H₀d와 무작위 속도 σ 비교)', PHONE ? 11.5 : 14, '#1e293b', 'left', 800);
    if (S.sc.rise < 0.02) { drawWrap(Q.x + 14, Q.y + 60 * FS, '구조 4개를 크기순으로 배열하면 각 규모에서 허블 흐름 속도 H₀d와 은하의 무작위 속도 σ를 비교할 수 있어요.', Q.w - 28, 13.5, { color: '#64748b' }); return; }
    const rise = smooth(S.sc.rise);
    // 위쪽: 로그 크기 눈금
    const ax = Q.x + 40, aw = Q.w - 70, ay = Q.y + 88 * Math.min(FS, 1.05);
    const Xs = (d) => ax + (Math.log10(d) + 2) / 4 * aw;       // 0.01 ~ 100 Mpc
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + aw, ay); ctx.stroke();
    [-2, -1, 0, 1, 2].forEach((e) => { const x = ax + (e + 2) / 4 * aw; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, ay - 5); ctx.lineTo(x, ay + 5); ctx.stroke(); T(x, ay + 20, (e === -2 ? '0.01' : e === -1 ? '0.1' : String(Math.pow(10, e))) + (e === 2 ? ' Mpc' : ''), PHONE ? 10.5 : 11.5, '#64748b', 'center', 700); });
    SC.forEach((s, i) => { const x = Xs(s.d), y = ay - (i % 2 ? 50 : 27) * rise - (1 - rise) * 40; ctx.globalAlpha = rise; D.shadow(() => D.sphere(x, ay, 8 + 0, s.c, { gloss: true }), { blur: 4, y: 2 }); D.label(x, y, s.n + ' ' + (s.d < 0.1 ? f2(s.d) : f0(s.d)) + ' Mpc', { bg: s.c, size: PHONE ? 10 : 11.5, pad: 7, color: '#fff' }); ctx.globalAlpha = 1; });
    // 아래쪽: H₀d vs σ 막대 (로그 눈금 1 ~ 10⁴ km/s)
    const gy0 = ay + 46 * Math.min(FS, 1.05), gh = Q.y + Q.h - gy0 - 64 * Math.min(FS, 1.05), gx0 = Q.x + 52, gw = Q.w - 72;
    const Yv = (v) => gy0 + gh - clamp((Math.log10(Math.max(v, 1)) / 4), 0, 1) * gh;
    [0, 1, 2, 3, 4].forEach((e) => { const y = Yv(Math.pow(10, e)); ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, y); ctx.lineTo(gx0 + gw, y); ctx.stroke(); T(gx0 - 6, y + 4, comma(Math.pow(10, e)), 10.5, '#64748b', 'right', 700); });
    T(Q.x + 12, gy0 - 8, 'km/s (로그)', 10.5, '#64748b', 'left', 700);
    const colw = gw / 4;
    SC.forEach((s, i) => {
      const cx = gx0 + colw * (i + 0.5), bw = Math.min(30, colw * 0.28), ok = s.exp;
      const hh = Yv(s.h), sg = Yv(s.sig), base = gy0 + gh;
      const grow = clamp(rise * 1.4 - i * 0.14, 0, 1);
      const top1 = base - (base - hh) * smooth(grow), top2 = base - (base - sg) * smooth(grow);
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(cx - bw - 3, top1, bw, base - top1); ctx.fillStyle = '#f59e0b'; ctx.fillRect(cx + 3, top2, bw, base - top2);
      if (grow > 0.95) { T(cx - bw / 2 - 3, top1 - 5, s.h < 10 ? f1(s.h) : comma(s.h), PHONE ? 9.5 : 11, '#1d4ed8', 'center', 800); T(cx + bw / 2 + 3, top2 - 5, comma(s.sig), PHONE ? 9.5 : 11, '#b45309', 'center', 800); }
      T(cx, base + 17 * Math.min(FS, 1.1), s.n, PHONE ? 11 : 12.5, '#1e293b', 'center', 800);
      const vd = ok ? '팽창이 지배' : '중력으로 묶임';
      if (grow > 0.95) D.label(cx, base + 40 * Math.min(FS, 1.05), vd, { bg: ok ? '#dc2626' : '#16a34a', size: PHONE ? 9.5 : 11, pad: 6 });
    });
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(Q.x + Q.w - (PHONE ? 196 : 250), Q.y + 12, 12, 12); T(Q.x + Q.w - (PHONE ? 180 : 232), Q.y + 22, 'H₀d (지름 기준)', PHONE ? 10.5 : 12, '#1d4ed8', 'left', 800);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(Q.x + Q.w - (PHONE ? 86 : 108), Q.y + 12, 12, 12); T(Q.x + Q.w - (PHONE ? 70 : 90), Q.y + 22, 'σ (무작위)', PHONE ? 10.5 : 12, '#b45309', 'left', 800);
    if (hdShown()) T(Q.x + 14, Q.y + Q.h - 7, '허블 흐름 H₀d: 1 Mpc 70 · 10 Mpc 700 · 100 Mpc 7000 km/s', PHONE ? 10.5 : 12, '#0369a1', 'left', 800);
  }

  /* =========================================================
     컨트롤 · 입력 · 장면 전환
     ========================================================= */
  function setView(v) { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); S.hit = []; } updateCtl(); }
  function updateCtl() {
    const free = FREE(), v = S.view;
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === v));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(v); });
    $('#calcHM').hidden = !(v === 'local' && (S.flags.calcHM || free));
    $('#calcCz').hidden = !(v === 'cluster' && S.cl.k === 1 && (S.flags.calcCz || free));
    $('#calcHd').hidden = !(v === 'scale' && (S.flags.calcHd || free));
    $('#clsNote').hidden = !(v === 'cluster');
    $('#tbLabel').textContent = VIEW_LABEL[v];
    $$('#grpMem .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.sel));
    $$('#grpCl .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.cl.k));
    $$('#grpBand .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.cl.tgt));
    $('#oB').textContent = f1(S.fof.b) + ' Mpc';
  }
  SEL.forEach((m, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.k = i; b.textContent = m.short; $('#grpMem').appendChild(b); clickable(b, () => selectMem(i)); });
  $$('#grpCl .opt').forEach((b) => clickable(b, () => { S.cl.k = +b.dataset.k; updateCtl(); }));
  $$('#grpBand .opt').forEach((b) => clickable(b, () => { S.cl.tgt = +b.dataset.k; updateCtl(); }));
  bindSlider($('#sB'), $('#oB'), (v) => f1(v) + ' Mpc', (v) => { S.fof.b = v; });
  $('#inHM').addEventListener('input', () => { if (near(numOf('inHM'), SEL[0].h, 3)) { S.hmOK = true; fbIn('inHM', true); } });
  $('#inCz').addEventListener('input', () => { if (near(numOf('inCz'), CLU[1].d, 1.5)) { S.czOK = true; fbIn('inCz', true); } });
  [['inS1', 70, 0], ['inS10', 700, 1], ['inS100', 7000, 2]].forEach(([id, v, i]) => $('#' + id).addEventListener('input', () => { if (nearRel(numOf(id), v, 0.03)) { S.hdOK[i] = true; fbIn(id, true); } }));

  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'local') { let best = -1, bd = 1e9; (S.hit || []).forEach((h) => { const d = Math.hypot(p.x - h.x, p.y - h.y); if (d < h.r && d < bd) { bd = d; best = h.i; } }); if (best >= 0) selectMem(best); return false; }
      if (S.view === 'cluster') { const r = cCl.down(p); updateCtl(); return r; }
      if (S.view === 'scale') { const r = cSc.down(p); updateCtl(); return r; }
      return false;
    },
    move(p) { if (S.view === 'cluster') cCl.move(p); else if (S.view === 'scale') cSc.move(p); },
    up(p) { if (S.view === 'cluster') { cCl.up(p); updateCtl(); } else if (S.view === 'scale') { cSc.up(p); updateCtl(); } },
    hover(p) {
      if (S.view === 'local') return (S.hit || []).some((h) => Math.hypot(p.x - h.x, p.y - h.y) < h.r) ? 'pointer' : '';
      if (S.view === 'cluster') return cCl.hit(p) ? 'pointer' : '';
      if (S.view === 'scale') return cSc.hit(p) ? 'pointer' : '';
      return '';
    },
  });

  /* ================= 미션 ================= */
  const fofAt = (b) => BG.find((q) => Math.abs(q.b - b) < 0.01);
  const levels = [
    {
      title: '국부 은하군: 우리 은하의 이웃', short: '국부 은하군', icon: '🌌', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 은하는 홀로 있을까? 은하가 모인 집단은 얼마나 클까, 그리고 팽창하는 우주에서 모두 멀어질까?</p>' +
        '<div class="si-link">🔗 <b>지구과학에서</b> 허블-르메트르 법칙 <b>v = H₀d</b>(H₀ = 70 km/s/Mpc)를 배웠고, 앞 차시(적색 편이 탐사)에서 은하의 3차원 분포를 지도에 그렸어요. 이제 은하들이 모인 <b>집단</b>을 살펴봐요.</div>' +
        '<p>우리은하는 <b>국부 은하군</b>의 구성원이에요. 안드로메다(M31, 0.78 Mpc), 삼각형자리(M33), 마젤란 은하 같은 이웃의 <b>시선 속도</b>를 허블 흐름 H₀d와 비교해 봐요.</p>',
      features: ['local'],
      setup() { setView('local'); S.sel = 0; S.ar.obs = SEL[0].vr; S.ar.hub = SEL[0].h; },
      recap: '국부 은하군은 지름 약 3 Mpc에 은하 80여 개가 모인 집단이에요. M31은 허블 흐름(+55 km/s)과 달리 −110 km/s로 다가와요. 서로 중력으로 묶여 있기 때문이에요.',
      summary: '<ul><li><b>국부 은하군</b>: 우리은하 · 안드로메다(M31, 0.78 Mpc) · 삼각형자리(M33, 0.84 Mpc)와 대마젤란(0.050 Mpc) · 소마젤란(0.061 Mpc) 같은 작은 위성 은하 등 구성원 <b>약 80여 개</b>, 지름 <b>약 3 Mpc</b>.</li><li>M31의 시선 속도는 <b>−110 km/s</b>(다가옴, 청색 편이). 허블 흐름이라면 <b>H₀d = 70 × 0.78 ≈ 55 km/s</b>(멀어짐)여야 해요.</li><li>중력으로 묶인 은하들은 우주 팽창을 따라 멀어지지 않고 서로 가까워지기도 해요.</li></ul>',
      missions: [
        {
          title: 'M31의 허블 흐름 속도 구하기',
          goal: 'M31까지의 거리는 <b>0.78 Mpc</b>예요. 허블 흐름이라면 멀어지는 속도 <b>H₀d</b> (km/s)를 계산해 입력하세요. (H₀ = 70 km/s/Mpc)',
          hint: 'H₀d = 70 × 0.78 = 54.6 ≈ 55 km/s예요.',
          setup() { setView('local'); selectMem(0); S.flags.calcHM = true; updateCtl(); },
          check: () => S.hmOK,
          hold: 0.5,
          status: () => mark(S.hmOK) + ' H₀d = ' + ($('#inHM').value.trim() || '—') + ' km/s',
          explain: 'H₀d = 70 × 0.78 ≈ <b>55 km/s</b>예요. 그런데 M31의 실제 시선 속도는 <b>−110 km/s</b>(다가옴)예요. 허블 흐름과 방향이 반대예요.',
        },
        {
          type: 'quiz', title: 'M31이 우리은하에 가까워지는 까닭',
          goal: 'M31이 우리은하에서 멀어지지 않고 <b>다가오고 있는</b> 까닭은?',
          setup() { setView('local'); selectMem(0); },
          choices: ['두 은하가 서로 중력으로 묶여 있어서 허블 흐름보다 중력이 더 크게 작용해요', '모든 은하는 우리은하에서 멀어지지만 M31만 예외로 틀린 측정이에요', '우주가 M31 방향으로는 수축하고 있어서예요', '청색 편이는 은하가 멀어질 때 나타나는 현상이에요'],
          answer: 0,
          feedback: ['', '허블-르메트르 법칙은 멀리 있는 은하들의 평균적인 경향이에요. 가까운 이웃은 중력의 영향이 커서 예외가 많아요.', '우주 전체가 수축하는 것은 아니에요. 국부 은하군 안에서 중력이 팽창을 이긴 거예요.', '청색 편이는 다가올 때, 적색 편이는 멀어질 때 나타나요.'],
          explain: '약 3 Mpc 안의 국부 은하군에서는 <b>중력</b>이 우주 팽창의 효과(H₀d)보다 커서 M31과 우리은하는 서로 끌려 가까워지고 있어요.',
        },
      ],
    },
    {
      title: '은하단: 처녀자리와 머리털자리', short: '은하단', icon: '🫧', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 중력으로 묶인 작은 집단(은하군)을 봤어요. 이번에는 은하가 <b>수백~수천 개</b> 모인 <b>은하단</b>의 거리와 특징을 알아봐요. 거리는 앞 차시처럼 <b>d = cz / H₀</b>로 구해요.</div>' +
        '<p>처녀자리와 머리털자리 은하단을 가시광선과 <b>X선</b>으로 비교하고, 은하군과 은하단의 특징 카드를 알맞은 상자에 분류해요.</p>',
      features: ['cluster'],
      setup() { setView('cluster'); },
      recap: '은하단은 은하 수백~수천 개, 지름 약 2~10 Mpc, 질량 10¹⁴~10¹⁵ M☉이고, 10⁷~10⁸ K의 X선 가스와 중심의 거대 타원 은하가 특징이에요.',
      summary: '<ul><li><b>은하군</b>: 은하 수~수십 개, 지름 약 1~3 Mpc, 질량 약 10¹³ M☉.</li><li><b>은하단</b>: 은하 수백~수천 개, 지름 약 2~10 Mpc, 질량 10¹⁴~10¹⁵ M☉, 고온(10⁷~10⁸ K) <b>X선 가스</b>, 중심에 거대 타원 은하, 타원·렌즈형 은하의 비율이 높고 속도 분산이 약 500~1500 km/s예요.</li><li>처녀자리 은하단: 약 16.5 Mpc, 은하 약 1300~2000개, 중심 M87. 머리털자리 은하단: cz = 6900 km/s → <b>d = 6900 / 70 ≈ 99 Mpc</b>, 은하 수천 개, 속도 분산 약 1000 km/s.</li><li>밀도가 높은 은하단 중심에는 타원 은하가 많아요: 은하가 합쳐지고 가스가 사라진 흔적이에요.</li></ul>',
      missions: [
        {
          title: '머리털자리 은하단까지의 거리',
          goal: '머리털자리 은하단의 적색 편이 속도는 <b>cz = 6900 km/s</b>예요. <b>d = cz / H₀</b> (Mpc)를 계산해 입력하세요.',
          hint: 'd = 6900 / 70 ≈ 98.6 ≈ 99 Mpc예요. 머리털자리 은하단 버튼을 눌러요.',
          setup() { setView('cluster'); S.cl.k = 1; S.flags.calcCz = true; updateCtl(); },
          check: () => S.czOK,
          hold: 0.5,
          status: () => mark(S.cl.k === 1) + ' 머리털자리 &nbsp; ' + mark(S.czOK) + ' d = ' + ($('#inCz').value.trim() || '—') + ' Mpc',
          explain: 'd = 6900 / 70 ≈ <b>99 Mpc</b>이에요. 처녀자리 은하단(약 16.5 Mpc)보다 약 6배 멀어요.',
        },
        {
          title: '은하군 / 은하단 특징 분류', manual: true,
          goal: '특징 카드 9장을 <b>은하군</b>과 <b>은하단</b> 상자로 나누세요. (규모 · 은하 수 · 타원 은하 비율 · X선 가스를 비교해요)',
          hint: '은하단은 은하 수백~수천 개, 질량 10¹⁴~10¹⁵ M☉, 고온 X선 가스, 타원 은하가 많은 곳이에요. 은하군은 수~수십 개, 1~3 Mpc, 약 10¹³ M☉예요.',
          setup() { setView('cluster'); cCl.reset(); },
          check() {
            const pl = cCl.items.filter((i) => i.loc != null).length;
            if (pl < 9) return '아직 상자에 넣지 않은 카드가 ' + (9 - pl) + '장 있어요.';
            const bad = cCl.items.filter((i) => !cCl.isRight(i));
            return bad.length ? '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요.' : true;
          },
          status: () => mark(cCl.counts().placed === 9) + ' 분류 ' + cCl.counts().placed + ' / 9 &nbsp; ' + mark(cCl.counts().right === 9) + ' 맞게 ' + cCl.counts().right + ' / 9',
          explain: '<b>은하군</b>: 수~수십 개 · 1~3 Mpc · 약 10¹³ M☉. <b>은하단</b>: 수백~수천 개 · 지름 약 10 Mpc에 이름 · 10¹⁴~10¹⁵ M☉ · 고온 X선 가스 · 타원 은하 많음 · σ 500~1500 km/s.',
        },
        {
          type: 'quiz', title: '은하단 중심에 타원 은하가 많은 까닭',
          goal: '은하단 <b>중심에 가까울수록 타원 은하가 많은</b> 경향은 무엇을 뜻할까요?',
          setup() { setView('cluster'); },
          choices: ['밀도가 높은 곳에서 은하가 합쳐지고 가스가 사라져 타원 은하가 많아졌다는 뜻이에요', '타원 은하는 가스가 많아서 별이 계속 태어나기 때문이에요', '은하단 바깥에는 은하가 없기 때문이에요', '은하단 중심은 온도가 낮아서 나선 은하만 살아남기 때문이에요'],
          answer: 0,
          feedback: ['', '타원·렌즈형 은하는 오히려 가스가 적고 새 별이 거의 태어나지 않아요.', '은하단 바깥에도 나선 은하가 있어요. 중심으로 갈수록 비율이 달라질 뿐이에요.', '은하단 중심은 고온(10⁷~10⁸ K)의 가스로 가득해요.'],
          explain: '밀도가 높은 은하단 중심에서는 은하끼리 <b>합쳐지고</b> 가스가 흩어져 나선 은하가 타원 은하로 바뀌기 쉬워요. 그래서 타원·렌즈형 비율이 높아요.',
        },
      ],
    },
    {
      title: '군집 찾기: 연결 거리 b로 집단 나누기', short: '군집 찾기', icon: '🔗', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 은하군과 은하단의 특징을 정리했어요. 그런데 지도에서 은하의 집단을 어떻게 <b>나눌까요?</b> 이웃한 은하를 이어 가는 <b>친구의 친구</b> 방법(friends-of-friends)을 써 봐요.</div>' +
        '<p>두 은하의 거리가 <b>연결 거리 b</b>보다 가까우면 같은 집단으로 이어요. 은하 150개가 있는 80 × 80 Mpc 평면에서 b를 바꿔 집단이 어떻게 달라지는지 봐요.</p>',
      features: ['fof'],
      setup() { setView('fof'); S.fof.b = 0.5; S.fof.bs = 0.5; setSlider($('#sB'), $('#oB'), 0.5, (v) => f1(v) + ' Mpc'); },
      recap: 'b가 작으면 작은 덩어리가 많고, 2 Mpc에서는 은하단과 은하군이 따로 분리되고, 8 Mpc에서는 하나의 거대한 덩어리로 합쳐져요. 집단의 크기는 b를 어떻게 정하느냐에 따라 달라요.',
      summary: '<ul><li><b>친구의 친구 방법</b>: 두 은하 사이 거리가 연결 거리 b보다 가까우면 같은 집단으로 이어요. 연결된 덩어리 하나가 한 집단이에요.</li><li>b = 0.5 Mpc: 아주 작은 덩어리 여러 개. <b>b = 2 Mpc</b>: 은하단 1개(은하 약 25개, 지름 약 4 Mpc)와 은하군 2곳(각 약 8개, 지름 약 1.5 Mpc)이 따로 분리. <b>b = 8 Mpc</b>: 사슬로 이어져 하나의 초은하단급 덩어리.</li><li>집단의 경계는 자연이 하나로 정해 놓은 것이 아니라 <b>b라는 기준을 정해서</b> 나눠요.</li></ul>',
      missions: [
        {
          title: 'b = 2 Mpc: 은하단 1개와 은하군 2개',
          goal: '연결 거리를 <b>b = 2 Mpc</b>로 맞추고, <b>은하단급 1개 · 은하군급 2개</b>가 따로 나뉘는지 확인하세요.',
          hint: '슬라이더를 2.0 Mpc에 맞춰요. 은하 15개 이상이 은하단급, 5~14개가 은하군급이에요.',
          setup() { setView('fof'); },
          check: () => { const q = fofNow(); return Math.abs(S.fof.bs - S.fof.b) < 0.03 && S.fof.b >= 1.5 && S.fof.b <= 2.5 && q.big === 1 && q.small === 2; },
          hold: 0.8,
          status: () => { const q = fofNow(); return mark(S.fof.b >= 1.5 && S.fof.b <= 2.5) + ' b = ' + f1(S.fof.b) + ' Mpc &nbsp; ' + mark(q.big === 1) + ' 은하단급 ' + q.big + '개 &nbsp; ' + mark(q.small === 2) + ' 은하군급 ' + q.small + '개'; },
          explain: 'b = 2 Mpc에서는 은하 25개의 <b>은하단</b> 덩어리 1개와 은하 8개의 <b>은하군</b> 덩어리 2개가 서로 이어지지 않고 분리돼요. 덩어리 사이의 사슬 은하는 간격이 3 Mpc보다 커서 이어지지 않아요.',
        },
        {
          title: 'b = 8 Mpc: 하나의 거대한 덩어리',
          goal: '연결 거리를 <b>b = 8 Mpc</b> 근처로 키워, 모든 덩어리가 <b>하나의 초은하단급 덩어리</b>로 합쳐지는지 확인하세요.',
          hint: '슬라이더를 8.0 Mpc 이상으로 올려요. 가장 큰 덩어리의 은하 수가 크게 늘어나요.',
          setup() { setView('fof'); },
          check: () => { const q = fofNow(); return Math.abs(S.fof.bs - S.fof.b) < 0.03 && S.fof.b >= 7.5 && q.big === 1 && q.small === 0 && q.largest >= 100; },
          hold: 0.8,
          status: () => { const q = fofNow(); return mark(S.fof.b >= 7.5) + ' b = ' + f1(S.fof.b) + ' Mpc &nbsp; ' + mark(q.largest >= 100) + ' 가장 큰 덩어리 ' + q.largest + '개 (100개 이상)'; },
          explain: 'b = 8 Mpc에서는 은하단·은하군·사슬 은하가 모두 이어져 <b>하나의 거대한 덩어리</b>(초은하단급)가 돼요. 같은 은하 지도에서도 b에 따라 "집단"의 크기가 완전히 달라져요.',
        },
        {
          type: 'quiz', title: 'b를 바꾸면 집단의 크기가 달라지는 까닭',
          goal: 'b를 바꾸면 <b>같은 은하들인데도 집단의 크기가 달라지는</b> 까닭은?',
          setup() { setView('fof'); },
          choices: ['집단을 나누는 기준(b)을 정해야 해서, 기준에 따라 경계가 달라지기 때문이에요', '자연이 집단의 경계를 하나로 정해 놓았는데 b가 틀렸기 때문이에요', 'b가 커지면 은하가 실제로 더 많이 생기기 때문이에요', '은하는 b에 따라 위치가 바뀌기 때문이에요'],
          answer: 0,
          feedback: ['', '은하 집단의 경계는 연속적으로 변해서 자연이 하나로 정해 놓지 않았어요. 연구 목적에 맞는 기준을 정해요.', 'b는 은하를 연결하는 기준일 뿐 은하의 수는 그대로 150개예요.', '은하의 위치는 그대로이고 연결 방법만 달라져요.'],
          explain: '집단의 경계는 연속적이어서 <b>어떤 기준으로 나누느냐</b>에 따라 달라져요. 그래서 은하군·은하단·초은하단의 크기는 대략적인 기준이에요.',
        },
      ],
    },
    {
      title: '구조 규모: 중력으로 묶인 곳과 팽창하는 곳', short: '구조 규모', icon: '📏', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 은하군·은하단·초은하단이 모두 은하가 모인 집단이라는 것을 알았어요. 그런데 <b>어디까지가 중력으로 묶이고 어디부터 우주 팽창의 영향을 받을까요?</b></div>' +
        '<p>구조를 크기순으로 배열한 뒤, 각 규모의 <b>허블 흐름 속도 H₀d</b>와 은하의 <b>무작위 속도 σ</b>를 비교해요. σ가 H₀d보다 크면 중력으로 묶여 있고, H₀d가 σ를 넘으면 팽창이 지배해요.</p>',
      features: ['scale'],
      setup() { setView('scale'); },
      recap: '은하군·은하단은 σ가 H₀d보다 커서 중력으로 묶인 집단이고, 초은하단(약 50 Mpc)은 H₀d가 σ보다 커서 우주 팽창의 영향을 받는 규모예요.',
      summary: '<ul><li>크기순: <b>은하</b>(약 0.03 Mpc) &lt; <b>은하군</b>(약 2 Mpc) &lt; <b>은하단</b>(약 5 Mpc) &lt; <b>초은하단</b>(약 50 Mpc 이상).</li><li>허블 흐름 속도 <b>H₀d</b>: 1 Mpc <b>70</b>, 10 Mpc <b>700</b>, 100 Mpc <b>7000 km/s</b>.</li><li>σ ≫ H₀d이면 <b>중력으로 묶여</b> 팽창의 영향이 작아요(은하군 · 은하단). H₀d가 σ를 넘는 <b>초은하단</b>은 우주 팽창의 영향을 받는 규모예요. (지름을 d로 쓴 어림 비교)</li></ul>',
      missions: [
        {
          title: '구조 4개를 크기순으로 배열', manual: true,
          goal: '<b>은하 · 은하군 · 은하단 · 초은하단</b> 카드를 <b>가장 작은 것부터 가장 큰 것</b>까지 ①~④에 놓으세요.',
          hint: '지름은 은하 약 0.03 Mpc, 은하군 약 2 Mpc, 은하단 약 5 Mpc, 초은하단 약 50 Mpc예요.',
          setup() { setView('scale'); cSc.reset(); S.sc.ordered = false; S.sc.rise = 0; },
          check() {
            const pl = cSc.items.filter((i) => i.loc != null).length;
            if (pl < 4) return '아직 놓지 않은 카드가 ' + (4 - pl) + '장 있어요.';
            const bad = cSc.items.filter((i) => !cSc.isRight(i));
            if (bad.length) return '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요. 지름을 비교해 보세요.';
            S.sc.ordered = true; return true;
          },
          status: () => mark(cSc.counts().placed === 4) + ' 놓은 카드 ' + cSc.counts().placed + ' / 4 &nbsp; ' + mark(cSc.counts().right === 4) + ' 알맞게 ' + cSc.counts().right + ' / 4',
          explain: '<b>은하(0.03 Mpc) &lt; 은하군(2) &lt; 은하단(5) &lt; 초은하단(50)</b> 순이에요. 로그 눈금에서 크기가 몇 자릿수씩 차이 나요. 이제 아래 그래프가 열려요.',
        },
        {
          title: '1 · 10 · 100 Mpc의 허블 흐름 속도',
          goal: '<b>H₀d</b> (km/s)를 거리 <b>1 Mpc, 10 Mpc, 100 Mpc</b>에서 각각 계산해 입력하세요. (H₀ = 70 km/s/Mpc)',
          hint: '70 × 1 = 70, 70 × 10 = 700, 70 × 100 = 7000 km/s예요.',
          setup() { setView('scale'); S.flags.calcHd = true; S.sc.ordered = true; S.hdOK = [false, false, false]; clrIn('inS1', 'inS10', 'inS100'); updateCtl(); },
          check: () => S.hdOK.every(Boolean),
          hold: 0.5,
          status: () => ['1 Mpc', '10 Mpc', '100 Mpc'].map((n, i) => mark(S.hdOK[i]) + ' ' + n).join(' &nbsp; '),
          explain: 'H₀d는 거리에 <b>비례</b>해서 <b>70, 700, 7000 km/s</b>예요. 거리가 10배가 되면 허블 흐름 속도도 10배가 돼요.',
        },
        {
          type: 'quiz', title: '팽창의 영향을 받는 규모는?',
          goal: '그래프에서 <b>H₀d가 무작위 속도 σ보다 커서</b> 우주 팽창의 영향을 받는 규모는?',
          setup() { setView('scale'); S.sc.ordered = true; },
          choices: ['초은하단 (약 50 Mpc)', '은하단 (약 5 Mpc)', '은하군 (약 2 Mpc)', '은하 (약 0.03 Mpc)'],
          answer: 0,
          feedback: ['', '은하단은 σ(약 1000 km/s)가 H₀d(약 350 km/s)보다 커서 중력으로 묶여 있어요.', '은하군은 σ가 H₀d보다 커서 중력으로 묶여 있어요. 국부 은하군이 그 예예요.', '은하 안의 별은 훨씬 큰 속도(약 200 km/s)로 돌고 있어서 H₀d(약 2 km/s)는 거의 의미가 없어요.'],
          explain: '초은하단은 지름 약 50 Mpc에서 <b>H₀d ≈ 3500 km/s</b>로 σ(약 300 km/s)보다 훨씬 커요. 그래서 초은하단은 <b>우주 팽창의 영향을 받는 규모</b>예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-galaxy-groups', mount: '#game', badge: '은하 집단 탐험가', homeHref: '../../index.html#hu',
    featureLabels: { local: '🌌 국부 은하군 지도 · 속도 화살표', cluster: '🫧 은하단 사진 · X선 · 특징 카드', fof: '🔗 연결 거리 b 슬라이더 · 그래프', scale: '📏 크기순 배열 · H₀d와 σ 비교' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view;
    if (v === 'local') { const m = selM(); setReadouts(['고른 은하', m.short, '거리 d', f2(m.d) + ' Mpc', '시선 속도', (m.vr > 0 ? '+' : '−') + Math.abs(m.vr) + ' km/s']); }
    else if (v === 'cluster') { const c = cCl.counts(), cl = CLU[S.cl.k]; setReadouts(['은하단', cl.n.replace(' 은하단', ''), '분류한 카드', c.placed + ' / 9', '맞게 분류', c.right + ' / 9']); }
    else if (v === 'fof') { const q = fofNow(); setReadouts(['연결 거리 b', f1(S.fof.b) + ' Mpc', '연결된 덩어리', q.nClump + '개', '가장 큰 덩어리', q.largest + '개']); }
    else { const c = cSc.counts(); setReadouts(['놓은 카드', c.placed + ' / 4', '알맞게 놓음', c.right + ' / 4', '허블 흐름 100 Mpc', hdShown() ? '7,000 km/s' : '?']); }
  }

  /* ================= 루프 ================= */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock += dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    switch (S.view) {
      case 'local': drawLocal(dt, S.clock); break;
      case 'cluster': drawCluster(dt, S.clock); break;
      case 'fof': drawFof(dt, S.clock); break;
      default: drawScale(dt, S.clock);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, updateCtl, SEL, LGM, CLU, FOF, BG, SC, CARDS, cCl, cSc, fofComps, fofNow, selectMem, scOK, clsOK };

})();
