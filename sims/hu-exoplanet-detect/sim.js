/* =========================================================
   행성우주과학 Ⅰ. 우주탐사와 행성계 - 외계 행성 찾기 (6차시)
   성취기준 [12행우01-05] 외계 행성계 탐사의 원리를 이해하고, 외계 행성에 생명체가 존재할 수 있는 조건과 외계 생명체의 존재 가능성에 대해 논증할 수 있다. (탐사 원리)
   ① 분석: 시선 속도 (질량 중심 모형, 도플러 이동, 51 Peg b의 a·v·질량)
   ② 탐구: 통과 관측 (깊이 δ = (R_p/R_s)², 통과 확률, 밀도)
   ③ 탐구: 미세 렌즈 (밝기 곡선, 행성 봉우리의 폭 ∝ √질량)
   ④ 적용: 방법 비교 (얻는 정보, 알맞은 방법, 선택 효과)
   다루지 않음: 경사각 i 보정 식, 이심률이 큰 궤도의 곡선 모형, 별 활동 잡음 제거, 렌즈 방정식의 수치 계산.
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
  const AU_KM = 1.496e8, C_KMS = 299792.458, MJ_PER_MSUN = 1047.35, RSUN_PER_AU = 215.03, REARTH_PER_RSUN = 109.1;
  const PR = [   // 태양 둘레 행성: 궤도 속력 v (km/s), 질량비 q = M_행성 / M_태양
    { n: '지구', v: 29.8, q: 3.0e-6, qt: '1 / 333,000', c: '#3b82f6' },
    { n: '해왕성', v: 5.4, q: 5.15e-5, qt: '1 / 19,400', c: '#60a5fa' },
    { n: '토성', v: 9.7, q: 2.86e-4, qt: '1 / 3,500', c: '#d9c27a' },
    { n: '목성', v: 13.1, q: 1 / 1047, qt: '1 / 1047', c: '#d4a373' },
  ];
  const Kof = (p) => p.v * 1000 * p.q;                      // m/s
  const PEG = { M: 1.1, K: 56, Pd: 4.2 };
  PEG.Py = PEG.Pd / 365.25;
  PEG.a = Math.cbrt(PEG.M * PEG.Py * PEG.Py);               // AU
  PEG.v = 2 * Math.PI * PEG.a * AU_KM / (PEG.Pd * 86400);   // km/s
  PEG.mr = (PEG.K / 1000) / PEG.v;                          // M_p / M_star
  PEG.Mj = PEG.mr * PEG.M * MJ_PER_MSUN;                    // M_J
  const TRA = [0.05, 0.4, 1, 5.2];                          // 궤도 반지름 (AU)
  const traP = (a) => Math.sqrt(a * a * a);                  // 년 (1 M☉)
  const DEN = [
    { n: 'HD 209458 b', Mv: 0.69, Mu: 'M_J', Rv: 1.38, Ru: 'R_J', ref: 1.33, refN: '목성 1.33', gas: true },
    { n: '케플러-10b', Mv: 3.3, Mu: 'M⊕', Rv: 1.47, Ru: 'R⊕', ref: 5.51, refN: '지구 5.51', gas: false },
  ];
  DEN.forEach((d) => { d.rho = d.ref * d.Mv / Math.pow(d.Rv, 3); });
  const TB_ROWS = ['시선 속도법', '통과법', '미세 렌즈법'], TB_COLS = ['질량', '반지름', '궤도 주기'];
  const TB_TRUTH = [[true, false, true], [false, true, true], [true, false, false]];
  const TB_NOTE = ['별의 흔들림 → 질량(하한)과 주기', '밝기 감소 → 반지름과 주기', '밝기 증가 → 질량 정보, 한 번뿐이라 주기는 몰라요'];
  const MS = [{ n: '지구형', m: 1, c: '#3b82f6' }, { n: '해왕성형', m: 17, c: '#60a5fa' }, { n: '토성형', m: 95, c: '#d9c27a' }, { n: '목성형', m: 318, c: '#d4a373' }];
  const lensDur = (m) => 0.1 * Math.sqrt(m);                 // 추가 봉우리의 지속 시간 (일)
  const durTxt = (d) => (d < 1 ? f1(d * 24) + ' 시간' : f1(d) + ' 일');
  const TE = 30, U0 = 0.3, TP = 17;                          // 사건 시간(일), 최소 접근, 행성 봉우리 시각(일)
  const ampU = (u) => (u * u + 2) / (u * Math.sqrt(u * u + 4));
  const lensA = (t) => ampU(Math.sqrt(U0 * U0 + (t / TE) * (t / TE)));
  const bumpAt = (t, tp, m) => { const w = lensDur(m) / 2.355; return 0.3 * lensA(tp) * Math.exp(-0.5 * Math.pow((t - tp) / w, 2)); };
  const METH = [{ n: '시선 속도법', c: '#dc2626' }, { n: '통과법', c: '#2563eb' }, { n: '미세 렌즈법', c: '#16a34a' }];
  /* 가상 행성 900개: 탐지 한계로 어떤 행성이 찾아지는지 보여 줘요 */
  const POP = (function () {
    const r = rng(4242), out = [];
    for (let i = 0; i < 900; i++) {
      const la = -2 + r() * 3.5, lm = -2.5 + Math.pow(r(), 1.8) * 3.68, a = Math.pow(10, la), mj = Math.pow(10, lm), me = mj * 317.8, P = Math.pow(a, 1.5);
      const Re = me < 130 ? Math.pow(me, 0.28) : 11.2, k = Re / REARTH_PER_RSUN;
      const K = 28.4 * mj * Math.pow(P, -1 / 3), ru = r(), rl = r();
      const det = [K >= 8 && P < 8, ru < 1 / (a * RSUN_PER_AU) && k * k >= 5e-5 && P < 3, a >= 0.7 && a <= 8 && rl < 0.12];
      out.push({ la, lm, det, show: 0 });
    }
    return out;
  })();
  const MATCH = [
    { label: '뜨거운 목성', sub: '별 가까이(0.05 AU)의 큰 행성', icon: '🔥', oks: [0, 1], bin: 0, info: '질량이 크고 별에 가까워 별을 크게 흔들고 통과 확률도 높아요. 시선 속도법과 통과법 모두 알맞아요.' },
    { label: '지구 크기 행성', sub: '별 가까이, 정밀 우주 망원경', icon: '🌍', oks: [1], bin: 1, info: '별을 흔드는 속도는 약 0.1 m/s라 시선 속도법으로 어려워요. 밝기가 약 0.008 % 줄어드는 통과를 우주 망원경으로 재요.' },
    { label: '5 AU 목성형 (먼 별)', sub: '수 kpc 거리 별의 행성', icon: '🪐', oks: [2], bin: 2, info: '아주 먼 별은 스펙트럼을 정밀하게 못 재고 통과 확률도 0.1 % 정도예요. 렌즈 사건으로 찾아요.' },
    { label: '자유 부유 행성', sub: '별 없이 홀로 떠돌아요', icon: '🌑', oks: [2], bin: 2, info: '도는 별이 없으니 흔들림도 통과도 없어요. 중력 렌즈 효과만 단서가 돼요.' },
  ];

  /* ================= 상태 ================= */
  const S = {
    view: 'rv', clock: 0, fade: 0,
    rv: { pl: 3, ph: 0, ok: false, okPl: -1 },
    pg: { t: 4.2, a: false, v: false, m: false, ok: false, pts: null },
    tr: { rp: 3, ai: 2, inc: 90, u: -1.6, hold: 0, ratioOk: false, flags: 0 },
    de: { ok: [false, false] },
    ln: { pl: true, mi: 3, cur: 0, ok: false, x: 0, hid: [1, 0], pick: [-1, -1], ok2: false, t: 0 },
    tb: { cell: [[-1, -1, -1], [-1, -1, -1], [-1, -1, -1]], wrong: [[false, false, false], [false, false, false], [false, false, false]], pop: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] },
    sc: { m: 0, all: true, fade: 0 },
    flags: { calcK: false, calcPeg: false, calcRatio: false, calcDen: false, inc: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { rv: '🌀 질량 중심과 별의 흔들림', peg: '📈 51 Peg b의 시선 속도', transit: '🌑 행성이 별 앞을 지날 때', density: '🧮 질량 + 반지름 → 밀도', lens: '🔎 미세 중력 렌즈', lens2: '❓ 미지의 행성은?', table: '📋 방법별로 얻는 정보', match: '🎯 행성에 알맞은 방법', scatter: '🔵 방법별 발견 분포 (모형)' };
  const modeBtns = $$('#modeSeg button');
  const fSci = (x, d) => sci(x, d == null ? 1 : d);

  /* =========================================================
     ① 시선 속도: 질량 중심 모형과 51 Peg b
     ========================================================= */
  function LRv() {
    return PHONE ? { M: { x: 8, y: 8, w: 464, h: 246 }, R: { x: 8, y: 262, w: 464, h: 330 }, B: { x: 8, y: 600, w: 464, h: 252 } } : { M: { x: 10, y: 8, w: 380, h: 300 }, R: { x: 398, y: 8, w: 392, h: 300 }, B: { x: 10, y: 316, w: 780, h: 296 } };
  }
  const RV = S.rv;
  const fK = (k) => (k >= 1 ? f1(k) : f2(k));
  const rvK = () => Kof(PR[RV.pl]);
  const rvSolved = () => RV.ok || FREE();
  function drawRv(dt, t) {
    const { M, R, B } = LRv(), p = PR[RV.pl], K = rvK();
    RV.ph += dt * TAU / (RM ? 1e9 : 4.5);
    const ph = RV.ph;
    // ---- 질량 중심 모형
    D.shadow(() => { ctx.fillStyle = '#0b1230'; rr(M.x, M.y, M.w, M.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(M.x, M.y, M.w, M.h, 14); ctx.clip(); spaceBg(M.x, M.y, M.w, M.h, t, '#0b1230', '#16224a');
    const cx = M.x + M.w / 2, cy = M.y + M.h / 2 - 6, rp = Math.min(M.w, M.h) / 2 - (PHONE ? 38 : 46);
    const rs = rp * Math.min(0.4, p.q * 200);
    ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, rp, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (rs > 0.4) { ctx.strokeStyle = 'rgba(253,224,71,.5)'; ctx.beginPath(); ctx.arc(cx, cy, rs, 0, TAU); ctx.stroke(); }
    const px = cx + rp * Math.cos(ph), py = cy - rp * Math.sin(ph), sx = cx - rs * Math.cos(ph), sy = cy + rs * Math.sin(ph);
    ctx.strokeStyle = 'rgba(226,232,240,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
    // 관측자 방향
    ctx.strokeStyle = 'rgba(56,189,248,.5)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, M.y + M.h - 30); ctx.stroke(); ctx.setLineDash([]);
    T(cx, M.y + M.h - 12, '👁 관측자 (아래에서 봐요)', PHONE ? 11 : 12.5, '#7dd3fc', 'center', 800);
    D.glow(sx, sy, 34, '#fde047', 0.6); D.sphere(sx, sy, PHONE ? 14 : 15, '#fbbf24', { gloss: true, light: '#fff3b0', dark: '#e07b00' });
    D.sphere(px, py, 6.5, p.c, { gloss: true });
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6); ctx.stroke();
    outlineT(cx + 9, cy - 8, '질량 중심', 11.5, '#f8fafc', 'left');
    if (rs > 3) { const vx = Math.sin(ph) * 22, vy = Math.cos(ph) * 22; D.arrow(sx, sy, sx + vx, sy + vy, { color: '#fb7185', width: 2.5, head: 8 }); }
    ctx.restore();
    outlineT(M.x + 14, M.y + 24 * FS, '🌀 ' + p.n + '과 태양이 질량 중심을 돌아요', PHONE ? 12 : 13.5, '#e2e8f0', 'left');
    outlineT(M.x + M.w - 10, M.y + 44 * FS, '별의 흔들림은 보이게 과장했어요', 11, '#93a4c3', 'right');
    // ---- 스펙트럼 + 곡선
    panel(R.x, R.y, R.w, R.h, { r: 14 });
    T(R.x + 14, R.y + 24 * FS, '🌈 스펙트럼선과 시선 속도', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    const sxb = R.x + 14, swb = R.w - 28, syb = R.y + 38 * FS, sh = PHONE ? 38 : 46;
    const g = ctx.createLinearGradient(sxb, 0, sxb + swb, 0); ['#7c3aed', '#2563eb', '#16a34a', '#eab308', '#f97316', '#dc2626'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    ctx.fillStyle = g; rr(sxb, syb, swb, sh, 8).fill();
    const cosph = Math.cos(ph), rvNow = -K * cosph, shiftPx = rvNow * 0.9;
    [0.16, 0.33, 0.5, 0.68, 0.85].forEach((f) => {
      const x0 = sxb + swb * f; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x0 - 1, syb + sh, 2, 8);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(x0 + shiftPx - 1.5, syb, 3, sh);
    });
    T(sxb + 4, syb + sh + 22, '← 파란색 쪽', 11.5, '#2563eb', 'left', 800); T(sxb + swb - 4, syb + sh + 22, '붉은색 쪽 →', 11.5, '#dc2626', 'right', 800);
    T(sxb + swb / 2, syb + sh + 22, Math.abs(rvNow) < 0.02 * K ? '이동 없음' : rvNow < 0 ? '다가오는 중: 청색 이동' : '멀어지는 중: 적색 이동', 12, '#334155', 'center', 800);
    T(sxb + swb / 2, syb + sh + 40, '(흰 눈금 = 제자리, 이동은 보이게 과장)', 10.5, '#64748b', 'center', 700);
    // 곡선
    const cx0 = R.x + 52, cw = R.w - 52 - 16, cy0 = syb + sh + 58, ch = R.y + R.h - 16 - cy0, ymax = 15;
    const Y = (v) => cy0 + ch / 2 - clamp(v / ymax, -1, 1) * ch / 2, X = (x) => cx0 + x / 2 * cw;
    ctx.fillStyle = 'rgba(100,116,139,.06)'; rr(cx0, cy0, cw, ch, 6).fill();
    [-10, 0, 10].forEach((v) => { ctx.strokeStyle = v === 0 ? '#94a3b8' : 'rgba(148,163,184,.4)'; ctx.lineWidth = v === 0 ? 1.8 : 1; ctx.beginPath(); ctx.moveTo(cx0, Y(v)); ctx.lineTo(cx0 + cw, Y(v)); ctx.stroke(); T(cx0 - 6, Y(v) + 4, (v > 0 ? '+' : '') + v, 11.5, '#64748b', 'right', 700); });
    T(R.x + 10, cy0 + ch / 2 - 18, 'm/s', 11, '#64748b', 'left', 700);
    const pts = []; for (let i = 0; i <= 120; i++) { const x = i / 60; pts.push([X(x), Y(-K * Math.cos(TAU * x))]); }
    line(pts, p.c === '#d4a373' ? '#ea580c' : '#0ea5e9', 2.6);
    const mx = X((ph / TAU) % 2); D.sphere(mx, Y(rvNow), 6, '#0f172a', { gloss: false });
    T(cx0 + cw / 2, cy0 + ch + 12, '시간 (행성이 두 번 도는 동안)', 11, '#64748b', 'center', 700);
    // ---- 정보 판
    panel(B.x, B.y, B.w, B.h, { r: 14 });
    T(B.x + 14, B.y + 24 * FS, '⚖ 질량 중심 모형: M★ v★ = M_행성 v_행성', 14.5, '#1e293b', 'left', 800);
    let yy = B.y + 52 * FS;
    const rows = [['행성', p.n + ' (태양 둘레)'], ['행성의 궤도 속력 v_행성', p.v + ' km/s'], ['질량비 M_행성 / M_태양', p.qt], ['태양의 속도 진폭 K = v_행성 × (M_행성 / M_태양)', rvSolved() ? fK(K) + ' m/s' : '?']];
    rows.forEach((r, i) => { T(B.x + 14, yy, r[0], PHONE ? 12.5 : 13.5, '#475569', 'left', 800); T(B.x + B.w - 14, yy, r[1], PHONE ? 12.5 : 13.5, i === 3 ? (rvSolved() ? '#15803d' : '#94a3b8') : '#1e293b', 'right', 800); yy += (PHONE ? 22 : 26) * FS; });
    if (rvSolved()) {
      const dl = 500 * K / (C_KMS * 1000);
      yy = drawWrap(B.x + 14, yy + 2, '도플러 효과: Δλ = λ v / c. λ = 500 nm, v = ' + fK(K) + ' m/s → Δλ = ' + sci(dl, 1) + ' nm. 이렇게 작은 변화를 재려면 약 1 m/s 이하의 정밀도가 필요해요.', B.w - 28, 12.5, { color: '#0369a1', weight: 800 });
      drawWrap(B.x + 14, yy + 20 * FS, K < 1 ? '지구가 일으키는 흔들림은 1 m/s보다 훨씬 작아서 시선 속도법으로 찾기 어려워요.' : '행성이 무거울수록 별이 더 크게 흔들려서 찾기 쉬워요.', B.w - 28, 12.5, { color: '#b45309', weight: 800 });
    } else drawWrap(B.x + 14, yy + 2, '행성을 고르고 K를 계산해 입력하세요. 곡선의 높이로 어림해 볼 수도 있어요.', B.w - 28, 13, { color: '#b45309', weight: 800 });
  }
  /* ---- 51 Peg b ---- */
  const PG = S.pg;
  (function () { const r = rng(515), pts = []; for (let t = 0.2; t < 12.1; t += 0.28) pts.push([t, -PEG.K * Math.cos(TAU * (t - 0.9) / PEG.Pd) + (r() + r() + r() - 1.5) * 6]); PG.pts = pts; })();
  const pgV = (t) => -PEG.K * Math.cos(TAU * (t - 0.9) / PEG.Pd);
  function LPg() { return PHONE ? { C: { x: 8, y: 8, w: 464, h: 330 }, B: { x: 8, y: 346, w: 464, h: 506 } } : { C: { x: 10, y: 8, w: 780, h: 322 }, B: { x: 10, y: 338, w: 780, h: 274 } }; }
  function pgGeom() { const { C } = LPg(), ix = C.x + 56, iw = C.w - 56 - 16, top = C.y + 40, ph = C.h - 40 - 46; return { C, ix, iw, top, ph, X: (t) => ix + t / 12 * iw, Y: (v) => top + ph / 2 - clamp(v / 80, -1, 1) * ph / 2 }; }
  function drawPeg(dt, t) {
    const { C, ix, iw, top, ph, X, Y } = pgGeom(), B = LPg().B;
    panel(C.x, C.y, C.w, C.h, { r: 14 });
    T(C.x + 14, C.y + 24 * FS, '📈 페가수스자리 51번 별 b: 시선 속도 관측 (1995)', PHONE ? 12.5 : 14.5, '#1e293b', 'left', 800);
    [-80, -40, 0, 40, 80].forEach((v) => { ctx.strokeStyle = v === 0 ? '#94a3b8' : 'rgba(148,163,184,.4)'; ctx.lineWidth = v === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(ix, Y(v)); ctx.lineTo(ix + iw, Y(v)); ctx.stroke(); T(ix - 6, Y(v) + 4, (v > 0 ? '+' : '') + v, 12, '#64748b', 'right', 700); });
    for (let d = 0; d <= 12; d += 2) { T(X(d), top + ph + 20, d + '일', 12.5, '#64748b', 'center', 700); ctx.strokeStyle = 'rgba(148,163,184,.3)'; ctx.beginPath(); ctx.moveTo(X(d), top); ctx.lineTo(X(d), top + ph); ctx.stroke(); }
    T(C.x + 10, top + ph / 2 - 20, 'm/s', 11.5, '#64748b', 'left', 700);
    const fit = []; for (let i = 0; i <= 240; i++) { const tt = i / 20; fit.push([X(tt), Y(pgV(tt))]); }
    line(fit, 'rgba(234,88,12,.55)', 2);
    PG.pts.forEach((q) => { D.sphere(X(q[0]), Y(q[1]), 3.6, '#0369a1', { gloss: false }); });
    const cx = X(PG.t), v = pgV(PG.t);
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, top + ph); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(cx, Y(v), 6, '#0f172a', { gloss: false });
    D.label(clamp(cx, ix + 70, ix + iw - 70), top + 12, f1(PG.t) + '일 · ' + (v >= 0 ? '+' : '') + f0(v) + ' m/s', { bg: '#0f172a', size: 12.5 });
    // 주기 표시
    const p0 = 0.9 + PEG.Pd / 2, p1 = p0 + PEG.Pd;
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(p0), Y(-PEG.K) - 8); ctx.lineTo(X(p1), Y(-PEG.K) - 8); ctx.stroke();
    D.label((X(p0) + X(p1)) / 2, Y(-PEG.K) - 22, '한 주기 P = ' + PEG.Pd + '일', { bg: '#16a34a', size: 12 });
    D.dashedLine(ix, Y(PEG.K), ix + iw, Y(PEG.K), { color: '#dc2626', width: 1.5, dash: [4, 4] }); T(ix + iw - 4, Y(PEG.K) - 5, '최대 +56 m/s', 12, '#b91c1c', 'right', 800);
    T(C.x + C.w / 2, C.y + C.h - 10, '곡선을 눌러 끌어 읽어요 · 점은 관측, 선은 맞춘 곡선', PHONE ? 11 : 12.5, '#475569', 'center', 700);
    // ---- 계산 판
    panel(B.x, B.y, B.w, B.h, { r: 14 });
    T(B.x + 14, B.y + 24 * FS, '🧮 곡선에서 행성의 궤도와 질량을 알아내요', 14.5, '#1e293b', 'left', 800);
    let yy = B.y + 50 * FS;
    yy = drawWrap(B.x + 14, yy, '별 질량 M★ = 1.1 M☉, 속도 진폭 K = 56 m/s, 주기 P = 4.2일 = ' + f3(PEG.Py) + '년', B.w - 28, 13.5, { color: '#334155', weight: 800 });
    const steps = [
      ['① 케플러 제3법칙 a³ = M★ P² (AU, 년, M☉)', PG.a || FREE(), 'a = ' + f3(PEG.a) + ' AU (수성 궤도 0.387 AU의 약 1/7)'],
      ['② 행성의 궤도 속력 v = 2πa / P', PG.v || FREE(), 'v = ' + f0(PEG.v) + ' km/s'],
      ['③ 질량비 M_행성 / M★ = v★ / v_행성', PG.m || FREE(), '= 0.056 / ' + f0(PEG.v) + ' = ' + sci(PEG.mr, 1) + ' → M = ' + f2(PEG.Mj) + ' M_J'],
    ];
    steps.forEach((s) => {
      yy += 26 * FS; ctx.fillStyle = s[1] ? 'rgba(22,163,74,.1)' : 'rgba(100,116,139,.07)'; rr(B.x + 8, yy - 18 * FS, B.w - 16, (PHONE ? 52 : 44) * FS * (PHONE ? 1 : 1), 8).fill();
      T(B.x + 14, yy, s[0], PHONE ? 12 : 13.5, '#1e293b', 'left', 800);
      if (s[1]) T(B.x + 14, yy + 20 * FS, '→ ' + s[2], PHONE ? 12 : 13.5, '#15803d', 'left', 800); else T(B.x + 14, yy + 20 * FS, '→ 계산해서 입력하면 여기에 나타나요', 12.5, '#94a3b8', 'left', 700);
      yy += 22 * FS;
    });
    if (PG.a || FREE()) {
      // 궤도 크기 비교 (축척 맞춤)
      const ox = B.x + B.w - (PHONE ? 64 : 90), oy = B.y + B.h - (PHONE ? 70 : 84), sc = (PHONE ? 44 : 56) / 0.387;
      D.glow(ox, oy, 16, '#fde047', 0.6); D.sphere(ox, oy, 5, '#fbbf24', { gloss: false });
      ctx.strokeStyle = 'rgba(148,163,184,.9)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(ox, oy, 0.387 * sc, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, PEG.a * sc, 0, TAU); ctx.stroke();
      T(ox, oy + 0.387 * sc + 14, '수성 궤도', 11, '#64748b', 'center', 700); T(ox + PEG.a * sc + 4, oy - 4, '51 Peg b', 11, '#c2410c', 'left', 800);
    }
  }
  function pgDown(p) { const g = pgGeom(); if (p.x >= g.ix - 8 && p.x <= g.ix + g.iw + 8 && p.y >= g.C.y && p.y <= g.C.y + g.C.h) { pgMove(p); return true; } return false; }
  function pgMove(p) { const g = pgGeom(); PG.t = clamp(Math.round((p.x - g.ix) / g.iw * 12 * 10) / 10, 0, 12); }

  /* =========================================================
     ② 통과 관측: 깊이 δ = (R_p / R_s)², 밀도
     ========================================================= */
  const TR = S.tr;
  function LTr() {
    return PHONE ? { Sv: { x: 8, y: 8, w: 464, h: 232 }, Lc: { x: 8, y: 248, w: 464, h: 258 }, I: { x: 8, y: 514, w: 464, h: 338 } } : { Sv: { x: 10, y: 8, w: 330, h: 300 }, Lc: { x: 348, y: 8, w: 442, h: 300 }, I: { x: 10, y: 316, w: 780, h: 296 } };
  }
  function overlap(d, k) {
    if (d >= 1 + k) return 0;
    if (d <= Math.abs(1 - k)) return Math.PI * Math.min(1, k) * Math.min(1, k);
    const a = k * k * Math.acos((d * d + k * k - 1) / (2 * d * k)) + Math.acos((d * d + 1 - k * k) / (2 * d)) - 0.5 * Math.sqrt(Math.max(0, (-d + k + 1) * (d + k - 1) * (d - k + 1) * (d + k + 1)));
    return a;
  }
  const trK = () => TR.rp / REARTH_PER_RSUN;
  const trA = () => TRA[TR.ai];
  const trB = () => trA() * RSUN_PER_AU * Math.cos(TR.inc * DEG);
  const flux = (u) => 1 - overlap(Math.hypot(u, trB()), trK()) / Math.PI;
  const trV = () => { const a = trA() * RSUN_PER_AU, P = traP(trA()) * 365.25 * 24; return 2 * Math.PI * a / P; };           // R☉ / 시간
  const trDepth = () => { let m = 1; for (let i = -170; i <= 170; i++) m = Math.min(m, flux(i / 100)); return 1 - m; };
  const trDur = () => { const k = trK(), b = trB(); return b < 1 + k ? 2 * Math.sqrt((1 + k) * (1 + k) - b * b) / trV() : 0; };
  const trProb = () => 1 / (trA() * RSUN_PER_AU);
  const fPct = (x) => (x >= 0.1 ? f2(x) : x >= 0.001 ? (Math.round(x * 10000) / 10000).toFixed(4) : (Math.round(x * 100000) / 100000).toFixed(5));   // x: % 값
  const fP = (yr) => (yr < 0.05 ? f1(yr * 365.25) + '일' : yr < 1 ? f0(yr * 365.25) + '일' : f1(yr) + '년');
  function drawTransit(dt, t) {
    const { Sv, Lc, I } = LTr(), k = trK(), b = trB(), dep = trDepth();
    // 위상 u (별 반지름 단위)
    if (TR.hold > 0) TR.hold -= dt; else { TR.u += dt * 0.95; if (TR.u > 1.7) { TR.u = -1.7; TR.hold = 0.7; } }
    if (RM) TR.u = 0;
    // ---- 별 판
    D.shadow(() => { ctx.fillStyle = '#0b1230'; rr(Sv.x, Sv.y, Sv.w, Sv.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(Sv.x, Sv.y, Sv.w, Sv.h, 14); ctx.clip(); spaceBg(Sv.x, Sv.y, Sv.w, Sv.h, t, '#0b1230', '#16224a');
    const cx = Sv.x + Sv.w / 2, cy = Sv.y + Sv.h / 2 + 8, Rs = Math.min(Sv.w * 0.5 - 24, Sv.h * 0.5 - 38);
    D.glow(cx, cy, Rs * 1.5, '#fde047', 0.45); D.sphere(cx, cy, Rs, '#fbbf24', { gloss: false, light: '#fff7c2', dark: '#e07b00' });
    const px = cx + TR.u * Rs, py = cy - b * Rs;
    ctx.strokeStyle = 'rgba(226,232,240,.4)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(Sv.x + 10, py); ctx.lineTo(Sv.x + Sv.w - 10, py); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(px, py, Math.max(1.4, k * Rs), '#111827', { gloss: false, outline: 'rgba(255,255,255,.35)', outlineWidth: 1 });
    ctx.restore();
    outlineT(Sv.x + 14, Sv.y + 24 * FS, '🌞 별을 똑바로 본 모습', 13.5, '#e2e8f0', 'left');
    outlineT(Sv.x + Sv.w / 2, Sv.y + Sv.h - 10, b >= 1 + k ? '궤도면이 시선과 나란하지 않아 통과가 안 보여요' : '검은 원 = 행성의 그림자', PHONE ? 11 : 12, b >= 1 + k ? '#fca5a5' : '#cbd5e1', 'center');
    // ---- 밝기 곡선
    panel(Lc.x, Lc.y, Lc.w, Lc.h, { r: 14 });
    T(Lc.x + 14, Lc.y + 24 * FS, '💡 별의 밝기', 14.5, '#1e293b', 'left', 800);
    const ix = Lc.x + 62, iw = Lc.w - 62 - 16, top = Lc.y + 38 * FS, ph = Lc.h - 38 * FS - 44, v = trV(), thalf = 1.7 / v;
    const ymin = 1 - Math.max(dep, 0.00002) * 1.4, X = (u) => ix + (u + 1.7) / 3.4 * iw, Y = (f) => top + (1 - (f - ymin) / (1.0015 - ymin)) * ph;
    ctx.fillStyle = 'rgba(100,116,139,.06)'; rr(ix, top, iw, ph, 6).fill();
    // 눈금: 100 % 와 최저점
    ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(ix, Y(1)); ctx.lineTo(ix + iw, Y(1)); ctx.stroke(); ctx.setLineDash([]);
    T(ix - 6, Y(1) + 4, '100 %', 11.5, '#64748b', 'right', 700);
    if (dep > 0) { ctx.strokeStyle = 'rgba(220,38,38,.5)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(ix, Y(1 - dep)); ctx.lineTo(ix + iw, Y(1 - dep)); ctx.stroke(); ctx.setLineDash([]); }
    const pts = []; const uMax = TR.u; for (let i = 0; i <= 340; i++) { const u = -1.7 + i / 100; if (u > uMax) break; pts.push([X(u), Y(flux(u))]); }
    if (pts.length > 1) line(pts, '#ea580c', 3);
    D.sphere(X(clamp(TR.u, -1.7, 1.7)), Y(flux(TR.u)), 5.5, '#0f172a', { gloss: false });
    for (let hh = -1; hh <= 1; hh++) { const u = hh * 1.0; T(X(u), top + ph + 18, f1(u / v) + '시간', 11.5, '#64748b', 'center', 700); }
    if (dep > 0) {
      D.arrow(ix + iw - 24, Y(1), ix + iw - 24, Y(1 - dep), { color: '#dc2626', width: 2.5, head: 8 });
      D.label(ix + iw - 40, (Y(1) + Y(1 - dep)) / 2 + (Y(1 - dep) - Y(1) < 22 ? 24 : 0), '깊이 ' + fPct(dep * 100) + ' %', { bg: '#dc2626', size: 12.5, align: 'right' });
    } else T(ix + iw / 2, top + ph / 2, '밝기가 줄지 않아요', 14, '#b91c1c', 'center', 800);
    T(Lc.x + Lc.w / 2, Lc.y + Lc.h - 8, '시간 (통과 중심에서 몇 시간)', 11.5, '#64748b', 'center', 700);
    // ---- 정보 판
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    T(I.x + 14, I.y + 24 * FS, '🌑 통과 깊이 δ = (R_p / R_s)²', 14.5, '#1e293b', 'left', 800);
    let yy = I.y + 50 * FS;
    const solved = TR.ratioOk || FREE();
    const rows = [['행성 반지름 R_p', f1(TR.rp) + ' R⊕ (태양 반지름은 109.1 R⊕)'], ['R_p / R_s', solved ? f3(k) : '?'], ['공전 주기 P = √(a³)', fP(traP(trA()))], ['통과 지속 시간', dep > 0 ? f1(trDur()) + ' 시간' : '—'], ['통과가 보일 확률 ≈ R_s / a', fPct(trProb() * 100) + ' %']];
    rows.forEach((r) => { T(I.x + 14, yy, r[0], PHONE ? 12.5 : 13.5, '#475569', 'left', 800); T(I.x + I.w - 14, yy, r[1], PHONE ? 12.5 : 13.5, '#1e293b', 'right', 800); yy += (PHONE ? 22 : 26) * FS; });
    if (solved) yy = drawWrap(I.x + 14, yy + 2, 'δ = (' + f3(k) + ')² = ' + fPct(k * k * 100) + ' %. 지구 크기(1 R⊕)는 0.0084 %, 목성 크기(11.2 R⊕)는 약 1 %예요.', I.w - 28, 12.5, { color: '#0369a1', weight: 800 });
    else yy = drawWrap(I.x + 14, yy + 2, '깊이는 곡선에서 읽을 수 있어요. 깊이를 1.0 %로 만든 뒤 R_p / R_s를 구해 입력해요.', I.w - 28, 12.5, { color: '#b45309', weight: 800 });
    drawWrap(I.x + 14, yy + 20 * FS, '궤도 반지름이 클수록 주기가 길고, 통과가 보일 확률은 낮아요. 통과가 보이려면 궤도면이 시선과 나란해야 해요.', I.w - 28, 12.5, { color: '#64748b' });
  }

  /* ---- 밀도 ---- */
  function LDe() { return PHONE ? { P: [{ x: 8, y: 8, w: 464, h: 280 }, { x: 8, y: 296, w: 464, h: 280 }], F: { x: 8, y: 584, w: 464, h: 268 } } : { P: [{ x: 10, y: 8, w: 385, h: 440 }, { x: 405, y: 8, w: 385, h: 440 }], F: { x: 10, y: 456, w: 780, h: 156 } }; }
  function drawDensity(dt, t) {
    const L = LDe();
    DEN.forEach((d, i) => {
      const P = L.P[i], ok = S.de.ok[i] || FREE();
      panel(P.x, P.y, P.w, P.h, { r: 14 });
      T(P.x + 14, P.y + 24 * FS, (i === 0 ? '🌫️ ' : '🪨 ') + d.n, 15, '#1e293b', 'left', 800);
      // 행성 (반지름 비율을 맞춰 그려요: 1 R⊕ = rEarth px)
      const rE = PHONE ? 5.2 : 6.4, Rkm = d.Ru === 'R_J' ? d.Rv * 11.2 : d.Rv, rad = Rkm * rE, cx = P.x + P.w * (PHONE ? 0.27 : 0.5), cy = P.y + (PHONE ? P.h * 0.55 : 150);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.clip();
      const gg = ctx.createRadialGradient(cx - rad * 0.35, cy - rad * 0.4, rad * 0.1, cx, cy, rad);
      if (!ok) { gg.addColorStop(0, '#cbd5e1'); gg.addColorStop(1, '#64748b'); ctx.fillStyle = gg; ctx.fillRect(cx - rad, cy - rad, 2 * rad, 2 * rad); T(cx, cy + 6, '?', Math.max(14, rad * 0.5), '#fff', 'center', 800); }
      else if (d.gas) { const bg = ctx.createLinearGradient(0, cy - rad, 0, cy + rad); ['#f5d9b0', '#e08f5a', '#f2e0c0', '#c9703f', '#f0d8b2'].forEach((c, j, a) => bg.addColorStop(j / (a.length - 1), c)); ctx.fillStyle = bg; ctx.fillRect(cx - rad, cy - rad, 2 * rad, 2 * rad); }
      else { gg.addColorStop(0, '#b08968'); gg.addColorStop(1, '#6b4a2f'); ctx.fillStyle = gg; ctx.fillRect(cx - rad, cy - rad, 2 * rad, 2 * rad); ctx.fillStyle = 'rgba(40,20,10,.4)'; [[-0.3, -0.2, 2.2], [0.25, 0.3, 1.6], [0.1, -0.45, 1.2]].forEach(([a, b, s]) => { ctx.beginPath(); ctx.arc(cx + a * rad, cy + b * rad, s * 1.6, 0, TAU); ctx.fill(); }); }
      const sh = ctx.createRadialGradient(cx - rad * 0.4, cy - rad * 0.45, rad * 0.1, cx, cy, rad * 1.1); sh.addColorStop(0, 'rgba(255,255,255,.25)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.5)'); ctx.fillStyle = sh; ctx.fillRect(cx - rad, cy - rad, 2 * rad, 2 * rad);
      ctx.restore();
      const tx = PHONE ? P.x + P.w * 0.5 : P.x + 14, ty0 = PHONE ? P.y + 50 * FS : P.y + 300;
      const lines = [['질량 M (시선 속도법)', d.Mv + ' ' + d.Mu], ['반지름 R (통과법)', d.Rv + ' ' + d.Ru], ['기준 ρ', d.refN + ' g/cm³']];
      lines.forEach((l, j) => { T(tx, ty0 + j * 24 * FS + (PHONE ? 0 : 0), l[0], PHONE ? 12 : 13.5, '#475569', 'left', 800); T(P.x + P.w - 14, ty0 + j * 24 * FS, l[1], PHONE ? 12 : 13.5, '#1e293b', 'right', 800); });
      const ry = ty0 + 3 * 24 * FS + 8;
      ctx.fillStyle = ok ? 'rgba(22,163,74,.1)' : 'rgba(100,116,139,.07)'; rr(P.x + 8, ry - 18 * FS, P.w - 16, 30 * FS, 8).fill();
      T(tx, ry, '밀도 ρ', 14, '#1e293b', 'left', 800); T(P.x + P.w - 14, ry, ok ? f2(d.rho) + ' g/cm³ → ' + (d.gas ? '기체 행성' : '암석 행성') : '?', 14, ok ? '#15803d' : '#94a3b8', 'right', 800);
      if (ok) drawWrap(PHONE ? tx : P.x + 14, ry + 24 * FS, d.gas ? '물보다 가벼워요. 수소·헬륨이 대부분인 기체 행성이에요.' : '지구와 비슷하게 무거워요. 암석과 금속으로 된 행성이에요.', PHONE ? P.w / 2 - 14 : P.w - 28, 12.5, { color: '#0369a1', weight: 800 });
    });
    const F = L.F; panel(F.x, F.y, F.w, F.h, { r: 14 });
    T(F.x + 14, F.y + 24 * FS, '🔗 두 방법을 합치면 밀도를 알 수 있어요', 14, '#1e293b', 'left', 800);
    drawWrap(F.x + 14, F.y + 50 * FS, '시선 속도법은 질량(M), 통과법은 반지름(R)을 알려 줘요. 밀도 ρ = M / V ∝ M / R³이라 같은 행성을 두 방법으로 모두 관측하면 기체 행성인지 암석 행성인지 알 수 있어요. 행성 그림은 반지름 비율을 맞췄어요.', F.w - 28, 13.5, { color: '#334155' });
  }

  /* =========================================================
     ③ 미세 중력 렌즈: 밝기 곡선과 행성 봉우리
     ========================================================= */
  const LN = S.ln;
  function LLn() {
    return PHONE ? { Dg: { x: 8, y: 8, w: 464, h: 214 }, Lc: { x: 8, y: 230, w: 464, h: 240 }, Zi: { x: 8, y: 478, w: 464, h: 250 } } : { Dg: { x: 10, y: 8, w: 780, h: 204 }, Lc: { x: 10, y: 220, w: 780, h: 216 }, Zi: { x: 10, y: 444, w: 780, h: 168 } };
  }
  const lnM = () => MS[LN.mi].m;
  const lnTot = (t) => lensA(t) + (LN.pl ? bumpAt(t, TP, lnM()) : 0);
  let lnAnim = -60, lnHold = 0;
  function lnGeom() {
    const { Lc } = LLn(), ix = Lc.x + 52, iw = Lc.w - 52 - 16, top = Lc.y + 38 * FS, ph = Lc.h - 38 * FS - 36;
    return { Lc, ix, iw, top, ph, X: (t) => ix + (t + 60) / 120 * iw, Y: (a) => top + (1 - (a - 1) / (3.9 - 1)) * ph };
  }
  function drawLens(dt, t) {
    const { Dg, Lc, Zi } = LLn(), g = lnGeom();
    if (lnHold > 0) lnHold -= dt; else { lnAnim += dt * 9; if (lnAnim > 60) { lnAnim = -60; lnHold = 0.8; } }
    if (RM) lnAnim = LN.cur;
    // ---- 하늘 장면
    D.shadow(() => { ctx.fillStyle = '#0b1230'; rr(Dg.x, Dg.y, Dg.w, Dg.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(Dg.x, Dg.y, Dg.w, Dg.h, 14); ctx.clip(); spaceBg(Dg.x, Dg.y, Dg.w, Dg.h, t, '#0b1230', '#16224a');
    const cx = Dg.x + Dg.w / 2, cy = Dg.y + Dg.h / 2 + 8, th = Math.min(Dg.h * 0.34, 62), xs = (tt) => cx + tt / TE * th, ys = cy - U0 * th;
    ctx.strokeStyle = 'rgba(125,211,252,.55)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, th, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    outlineT(cx + th * 0.72, cy + th * 0.82, '아인슈타인 고리', 10.5, '#7dd3fc', 'left');
    ctx.strokeStyle = 'rgba(147,197,253,.35)'; ctx.beginPath(); ctx.moveTo(Dg.x + 8, ys); ctx.lineTo(Dg.x + Dg.w - 8, ys); ctx.stroke();
    D.glow(cx, cy, 30, '#fde047', 0.55); D.sphere(cx, cy, 9, '#fbbf24', { gloss: true });
    // 행성
    const plx = cx + TP / TE * th, ply = ys;
    if (LN.pl) { const rP = 3.5 + Math.log10(lnM()) * 1.2; D.sphere(plx, ply + 0.1, rP, MS[LN.mi].c, { gloss: true }); }
    const sx = xs(lnAnim), u = Math.sqrt(U0 * U0 + (lnAnim / TE) * (lnAnim / TE)), A = lnTot(lnAnim);
    // 상 (렌즈를 기준으로 원본 별 방향에 두 개)
    const dx = lnAnim / TE, dy = U0, ang = Math.atan2(-dy, dx), sq = Math.sqrt(u * u + 4), r1 = 0.5 * (u + sq), r2 = 0.5 * (u - sq);
    const im = (r, sz, a) => { const x = cx + Math.cos(ang) * r * th, y = cy + Math.sin(ang) * r * th; D.glow(x, y, sz * 2.4, '#93c5fd', a); D.sphere(x, y, sz, '#dbeafe', { gloss: false }); };
    im(r1, 3 + 2 * Math.sqrt(A), 0.55); im(r2, 2 + 1.2 * Math.sqrt(A), 0.4);
    D.sphere(sx, ys, 3.2, '#60a5fa', { gloss: false, outline: '#fff', outlineWidth: 1 });
    ctx.restore();
    outlineT(Dg.x + 14, Dg.y + 24 * FS, '🔭 하늘에서 본 모습: 앞 별(노랑)이 배경별(파랑)을 지나가요', PHONE ? 11.5 : 13, '#e2e8f0', 'left');
    if (LN.pl) outlineT(plx, ply - 14, '행성', 11.5, '#fde68a', 'center');
    // 밝기 막대
    const bx = Dg.x + Dg.w - 22, by0 = Dg.y + 40 * FS, bh = Dg.h - 60 * FS;
    ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(bx - 7, by0, 14, bh, 7).fill();
    const hf = clamp((A - 1) / 2.9, 0, 1) * bh; ctx.save(); rr(bx - 7, by0, 14, bh, 7); ctx.clip(); ctx.fillStyle = '#fbbf24'; ctx.fillRect(bx - 7, by0 + bh - hf, 14, hf); ctx.restore();
    outlineT(bx, by0 - 6, '밝기', 11.5, '#fde68a', 'center'); outlineT(bx, by0 + bh + 16, '×' + f1(A), 11.5, '#fde68a', 'center');
    // ---- 밝기 곡선
    panel(Lc.x, Lc.y, Lc.w, Lc.h, { r: 14 });
    T(Lc.x + 14, Lc.y + 24 * FS, '💡 배경별의 밝기 (평소 = 1)', 14.5, '#1e293b', 'left', 800);
    ctx.fillStyle = 'rgba(100,116,139,.06)'; rr(g.ix, g.top, g.iw, g.ph, 6).fill();
    [1, 2, 3].forEach((a) => { ctx.strokeStyle = 'rgba(148,163,184,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.ix, g.Y(a)); ctx.lineTo(g.ix + g.iw, g.Y(a)); ctx.stroke(); T(g.ix - 6, g.Y(a) + 4, '×' + a, 12, '#64748b', 'right', 700); });
    for (let d = -60; d <= 60; d += 20) T(g.X(d), g.top + g.ph + 18, d + '일', 12, '#64748b', 'center', 700);
    // 창 (확대 범위)
    ctx.fillStyle = 'rgba(14,165,233,.14)'; ctx.fillRect(g.X(LN.cur - 3), g.top, g.X(LN.cur + 3) - g.X(LN.cur - 3), g.ph);
    const base = [], full = [];
    for (let d = -60; d <= 60.001; d += 0.5) base.push([g.X(d), g.Y(lensA(d))]);
    for (let d = -60; d <= 60.001; d += 0.05) full.push([g.X(d), clamp(g.Y(lnTot(d)), g.top, g.top + g.ph)]);
    if (LN.pl) line(base, 'rgba(100,116,139,.8)', 2, { dash: [5, 4] });
    line(full, '#ea580c', 2.6);
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(g.X(LN.cur), g.top); ctx.lineTo(g.X(LN.cur), g.top + g.ph); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(g.X(clamp(lnAnim, -60, 60)), clamp(g.Y(lnTot(clamp(lnAnim, -60, 60))), g.top, g.top + g.ph), 5, '#0f172a', { gloss: false });
    D.label(clamp(g.X(LN.cur), g.ix + 34, g.ix + g.iw - 34), g.top + 10, 't = ' + (LN.cur > 0 ? '+' : '') + f1(LN.cur) + '일', { bg: '#0f172a', size: 12 });
    if (!LN.pl) T(g.ix + g.iw / 2, g.top + g.ph * 0.72, '행성이 없으면 매끈한 종 모양이에요', 13.5, '#64748b', 'center', 800);
    // ---- 확대
    panel(Zi.x, Zi.y, Zi.w, Zi.h, { r: 14 });
    T(Zi.x + 14, Zi.y + 24 * FS, '🔍 확대: t = ' + f1(LN.cur) + '일 앞뒤 3일', 14.5, '#1e293b', 'left', 800);
    const zix = Zi.x + 52, ziw = Zi.w - 52 - 16, ztop = Zi.y + 38 * FS, zph = Zi.h - 38 * FS - 34;
    const zv = []; for (let d = -3; d <= 3.0001; d += 0.02) zv.push(lnTot(LN.cur + d));
    const zb = []; for (let d = -3; d <= 3.0001; d += 0.5) zb.push(lensA(LN.cur + d));
    let lo = Math.min.apply(null, zv.concat(zb)), hi = Math.max.apply(null, zv.concat(zb)); const pad = Math.max(0.12, (hi - lo) * 0.2); lo -= pad; hi += pad;
    const ZX = (d) => zix + (d + 3) / 6 * ziw, ZY = (a) => ztop + (1 - (a - lo) / (hi - lo)) * zph;
    ctx.fillStyle = 'rgba(100,116,139,.06)'; rr(zix, ztop, ziw, zph, 6).fill();
    for (let d = -3; d <= 3; d++) { ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ZX(d), ztop); ctx.lineTo(ZX(d), ztop + zph); ctx.stroke(); T(ZX(d), ztop + zph + 18, (d > 0 ? '+' : '') + d + '일', 12, '#64748b', 'center', 700); }
    const zb2 = []; for (let d = -3; d <= 3.0001; d += 0.5) zb2.push([ZX(d), ZY(lensA(LN.cur + d))]);
    if (LN.pl) line(zb2, 'rgba(100,116,139,.8)', 2, { dash: [5, 4] });
    const zp = []; for (let i = 0; i < zv.length; i++) zp.push([ZX(-3 + i * 0.02), ZY(zv[i])]);
    line(zp, '#ea580c', 2.6);
    T(Zi.x + 10, ztop + zph / 2, '밝기', 11.5, '#64748b', 'left', 700);
    if (LN.pl) {
      const peakNear = Math.abs(LN.cur - TP) <= 3;
      if (peakNear) { const px = ZX(TP - LN.cur); D.label(clamp(px, zix + 80, zix + ziw - 80), ztop + 10, '행성 봉우리: ' + durTxt(lensDur(lnM())), { bg: '#ea580c', size: 12 }); }
      else T(zix + ziw / 2, ztop + zph / 2, '이 날짜 근처에는 추가 봉우리가 없어요', 13.5, '#64748b', 'center', 800);
    } else T(zix + ziw / 2, ztop + 20, '행성이 없을 때의 곡선이에요', 13, '#64748b', 'center', 800);
  }
  function lnDown(p) { const g = lnGeom(); if (p.x >= g.ix - 8 && p.x <= g.ix + g.iw + 8 && p.y >= g.Lc.y && p.y <= g.Lc.y + g.Lc.h) { lnMove(p); return true; } return false; }
  function lnMove(p) { const g = lnGeom(); LN.cur = clamp(Math.round(((p.x - g.ix) / g.iw * 120 - 60) * 2) / 2, -60, 60); const s = $('#sCur'); s.value = LN.cur; updateCurOut(); }
  function updateCurOut() { const s = $('#sCur'); s.style.setProperty('--pct', ((s.value - s.min) / (s.max - s.min)) * 100 + '%'); $('#oCur').textContent = (+s.value > 0 ? '+' : '') + s.value + '일'; }
  const lnFound = () => LN.pl && Math.abs(LN.cur - TP) <= 1;

  /* ---- 미지의 행성 X, Y ---- */
  function drawLens2(dt, t) {
    const hs = PHONE ? [{ x: 8, y: 8, w: 464, h: 290 }, { x: 8, y: 306, w: 464, h: 290 }] : [{ x: 10, y: 8, w: 385, h: 440 }, { x: 405, y: 8, w: 385, h: 440 }], inf = PHONE ? { x: 8, y: 604, w: 464, h: 248 } : { x: 10, y: 456, w: 780, h: 156 };
    ['X', 'Y'].forEach((nm_, i) => {
      const P = hs[i], type = LN.hid[i], dur = type === 1 ? lensDur(318) : lensDur(1);
      panel(P.x, P.y, P.w, P.h, { r: 14 });
      T(P.x + 14, P.y + 24 * FS, '❓ 미지의 행성 ' + nm_ + '의 추가 봉우리', 14.5, '#1e293b', 'left', 800);
      const ix = P.x + 46, iw = P.w - 46 - 16, top = P.y + 40 * FS, ph = P.h - 40 * FS - 52, X = (d) => ix + (d + 3) / 6 * iw;
      const rn = rng(900 + i), w = dur / 2.355;
      const val = (d) => 1 + 0.32 * Math.exp(-0.5 * (d / w) * (d / w));
      const Y = (a) => top + (1 - (a - 0.95) / (1.42 - 0.95)) * ph;
      ctx.fillStyle = 'rgba(100,116,139,.06)'; rr(ix, top, iw, ph, 6).fill();
      for (let d = -3; d <= 3; d++) { ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(d), top); ctx.lineTo(X(d), top + ph); ctx.stroke(); T(X(d), top + ph + 18, (d > 0 ? '+' : '') + d + '일', 12, '#64748b', 'center', 700); }
      ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(ix, Y(1)); ctx.lineTo(ix + iw, Y(1)); ctx.stroke(); ctx.setLineDash([]);
      T(ix - 6, Y(1) + 4, '기준', 11, '#64748b', 'right', 700);
      const pts = []; for (let d = -3; d <= 3.0001; d += 0.02) pts.push([X(d), Y(val(d) + (rn() - 0.5) * 0.012)]);
      line(pts, '#ea580c', 2.4);
      T(P.x + P.w / 2, P.y + P.h - 8, '봉우리의 폭이 몇 시간인지 며칠인지 읽어요 (눈금: 1일)', PHONE ? 11 : 12.5, '#475569', 'center', 700);
    });
    panel(inf.x, inf.y, inf.w, inf.h, { r: 14 });
    T(inf.x + 14, inf.y + 24 * FS, '📏 폭 ∝ √(행성 질량)', 14.5, '#1e293b', 'left', 800);
    let yy = drawWrap(inf.x + 14, inf.y + 50 * FS, '행성이 무거울수록 추가 봉우리가 오래 지속돼요. 지속 시간 ≈ 0.1일 × √(행성 질량 / 지구 질량): 지구형 약 2.4시간, 해왕성형 약 10시간, 토성형 약 1일, 목성형 약 1.8일(1~2일)이에요.', inf.w - 28, 13.5, { color: '#334155' });
    drawWrap(inf.x + 14, yy + 24 * FS, '질량이 318배(목성 질량 / 지구 질량) 차이 나면 폭은 √318 ≈ 18배 차이가 나요.', inf.w - 28, 13.5, { color: '#b45309', weight: 800 });
  }

  /* =========================================================
     ④ 방법 비교: 얻는 정보 표, 알맞은 방법, 발견 분포
     ========================================================= */
  const TB = S.tb;
  function LTb() {
    return PHONE ? { T: { x: 8, y: 8, w: 464, h: 360 }, N: { x: 8, y: 376, w: 464, h: 476 }, lw: 96, hh: 56, rh: 78 } : { T: { x: 10, y: 8, w: 780, h: 330 }, N: { x: 10, y: 346, w: 780, h: 266 }, lw: 180, hh: 52, rh: 76 };
  }
  const tbFilled = () => TB.cell.every((r) => r.every((c) => c >= 0));
  const tbRight = () => TB.cell.every((r, i) => r.every((c, j) => c === (TB_TRUTH[i][j] ? 1 : 0)));
  function tbCellRect(i, j) { const L = LTb(), cw = (L.T.w - L.lw - 24) / 3; return { x: L.T.x + 12 + L.lw + j * cw, y: L.T.y + 48 * FS + L.hh * 0.4 + i * L.rh, w: cw - 8, h: L.rh - 8 }; }
  function drawTable(dt, t) {
    const L = LTb(), P = L.T, N = L.N;
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    T(P.x + 14, P.y + 24 * FS, '📋 어떤 방법으로 무엇을 알 수 있을까? (칸을 눌러 ○ / × 정하기)', PHONE ? 12.5 : 14.5, '#1e293b', 'left', 800);
    const cw = (P.w - L.lw - 24) / 3, hy = P.y + 48 * FS + 4;
    TB_COLS.forEach((c, j) => { D.label(P.x + 12 + L.lw + j * cw + (cw - 8) / 2, hy + 6, c, { bg: '#475569', size: PHONE ? 12 : 13.5 }); });
    const all = tbFilled();
    TB_ROWS.forEach((r, i) => {
      const y = P.y + 48 * FS + L.hh * 0.4 + i * L.rh;
      ctx.fillStyle = METH[i].c; rr(P.x + 12, y, 6, L.rh - 8, 3).fill();
      T(P.x + 26, y + (L.rh - 8) / 2 + 5, r, PHONE ? 12.5 : 14.5, '#1e293b', 'left', 800);
      for (let j = 0; j < 3; j++) {
        const c = tbCellRect(i, j), v = TB.cell[i][j], truth = TB_TRUTH[i][j] ? 1 : 0;
        TB.pop[i][j] = approach(TB.pop[i][j], 0, dt, 10);
        const wr = all && v !== truth, sc = 1 + TB.pop[i][j] * 0.12;
        ctx.save(); ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(sc, sc); ctx.translate(-c.x - c.w / 2, -c.y - c.h / 2);
        D.shadow(() => { ctx.fillStyle = v === 1 ? '#dcfce7' : v === 0 ? '#fee2e2' : '#ffffff'; rr(c.x, c.y, c.w, c.h, 12).fill(); }, { blur: 4, y: 2 });
        ctx.strokeStyle = wr ? '#dc2626' : v === 1 ? '#16a34a' : v === 0 ? '#f87171' : '#cbd5e1'; ctx.lineWidth = wr ? 4 : 2; rr(c.x, c.y, c.w, c.h, 12).stroke();
        T(c.x + c.w / 2, c.y + c.h / 2 + 11, v === 1 ? '○' : v === 0 ? '×' : '?', 30, v === 1 ? '#15803d' : v === 0 ? '#b91c1c' : '#94a3b8', 'center', 800);
        ctx.restore();
      }
    });
    if (all) T(P.x + P.w / 2, P.y + P.h - 12, tbRight() ? '✅ 모두 맞았어요' : '⚠ 빨간 테두리 칸을 다시 생각해 봐요', 13.5, tbRight() ? '#15803d' : '#b91c1c', 'center', 800);
    panel(N.x, N.y, N.w, N.h, { r: 14 });
    T(N.x + 14, N.y + 24 * FS, '🔎 방법마다 보이는 단서', 14.5, '#1e293b', 'left', 800);
    let yy = N.y + 52 * FS;
    TB_ROWS.forEach((r, i) => {
      D.label(N.x + 14, yy - 5, r, { bg: METH[i].c, size: 12.5, align: 'left' });
      yy = drawWrap(N.x + 14, yy + 22 * FS, TB_NOTE[i], N.w - 28, 13.5, { color: '#334155' }) + 34 * FS;
    });
    drawWrap(N.x + 14, yy - 6 * FS, '시선 속도법의 질량과 통과법의 반지름을 합치면 같은 행성의 밀도를 구할 수 있어요. 질량은 궤도면이 시선과 나란한 경우로 구한 하한값이에요.', N.w - 28, 13, { color: '#b45309', weight: 800 });
  }
  function tbDown(p) {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (inR(p, tbCellRect(i, j))) { TB.cell[i][j] = TB.cell[i][j] === -1 ? 1 : TB.cell[i][j] === 1 ? 0 : -1; TB.pop[i][j] = 1; Sound.click(); updateCtl(); return false; }
    return false;
  }

  function LMa() {
    if (PHONE) return { grid: { x: 8, y: 8, w: 464, cols: 1, cardH: 48, gap: 6 }, bins: [0, 1, 2].map((i) => ({ x: 8, y: 226 + i * 116, w: 464, h: 110 })), I: { x: 8, y: 576, w: 464, h: 276 } };
    const bw = (780 - 16) / 3;
    return { grid: { x: 10, y: 8, w: 780, cols: 2, cardH: 58, gap: 8 }, bins: [0, 1, 2].map((i) => ({ x: 10 + i * (bw + 8), y: 148, w: bw, h: 170 })), I: { x: 10, y: 326, w: 780, h: 286 } };
  }
  const cMa = makeClassifier({
    items: MATCH.map((m) => ({ label: m.label, sub: m.sub, icon: m.icon, bin: m.bin, oks: m.oks, open: true, chip: m.label })),
    bins: METH.map((m) => ({ label: m.n, color: m.c })),
    chipCols: 1, minRows: 2,
    layout: () => { const L = LMa(); return { grid: L.grid, bins: L.bins }; },
    onPlace(it, b) {
      it.wrong = it.oks.indexOf(b) < 0;
      if (it.wrong) { say('「' + it.label + '」에는 그 방법이 알맞지 않아요.', true, 3); Sound.fail(); }
      else parts.burst(it.x + it.w / 2, it.y + it.h / 2, { count: 10, speed: 120, colors: [METH[b].c, '#fbbf24'] });
    },
    onChange() { updateCtl(); },
  });
  const maOK = () => cMa.items.every((i) => cMa.isRight(i));
  function drawMatch(dt, t) {
    const L = LMa(), I = L.I;
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    const it = cMa.sel >= 0 ? MATCH[cMa.sel] : null;
    T(I.x + 14, I.y + 24 * FS, it ? it.icon + ' ' + it.label : '🎯 카드를 눌러 보세요', 14.5, '#1e293b', 'left', 800);
    let yy = I.y + 50 * FS;
    if (it) yy = drawWrap(I.x + 14, yy, it.info, I.w - 28, 13.5, { color: '#334155' }) + 24 * FS;
    else yy = drawWrap(I.x + 14, yy, '행성의 질량·거리·별과의 거리에 따라 알맞은 탐사 방법이 달라요.', I.w - 28, 13.5, { color: '#64748b' }) + 24 * FS;
    if (!PHONE) [['시선 속도법', '질량이 크고 별에 가까울수록 별이 크게 흔들려요 (K ∝ 질량, 가까울수록 커요)'], ['통과법', '궤도면이 시선과 나란하고, 크기가 클수록 깊이 (R_p/R_s)²가 커요. 가까울수록 확률이 높아요'], ['미세 렌즈법', '먼 별이나 별 없는 행성도 가능해요. 한 번 지나가면 다시 못 봐요']].forEach((r, i) => {
      D.label(I.x + 14, yy - 5, r[0], { bg: METH[i].c, size: 12, align: 'left' });
      yy = drawWrap(I.x + 14, yy + 20 * FS, r[1], I.w - 28, 12.5, { color: '#475569' }) + 30 * FS;
    });
    cMa.draw(dt, {});
  }

  /* ---- 방법별 발견 분포 ---- */
  function LSc() { return PHONE ? { P: { x: 8, y: 8, w: 464, h: 500 }, I: { x: 8, y: 516, w: 464, h: 336 } } : { P: { x: 10, y: 8, w: 780, h: 420 }, I: { x: 10, y: 436, w: 780, h: 176 } }; }
  function scGeom() { const { P } = LSc(), lm_ = PHONE ? 100 : 112, ix = P.x + lm_, iw = P.w - lm_ - 16, top = P.y + 40 * FS, ph = P.h - 40 * FS - 48; return { P, ix, iw, top, ph, X: (la) => ix + (la + 2) / 3.5 * iw, Y: (lm) => top + (1 - (lm + 2.7) / 4.0) * ph }; }
  const scCount = (m) => POP.filter((p) => p.det[m]).length;
  function drawScatterEx(dt, t) {
    const { P, ix, iw, top, ph, X, Y } = scGeom(), I = LSc().I, SC = S.sc;
    SC.fade = approach(SC.fade, 1, dt, 3);
    panel(P.x, P.y, P.w, P.h, { r: 14 });
    T(P.x + 14, P.y + 24 * FS, '🔵 가상 행성 900개와 찾아낸 행성 (탐지 한계 모형)', PHONE ? 12.5 : 14.5, '#1e293b', 'left', 800);
    ctx.fillStyle = 'rgba(100,116,139,.05)'; rr(ix, top, iw, ph, 6).fill();
    [-2, -1, 0, 1].forEach((la) => { ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(la), top); ctx.lineTo(X(la), top + ph); ctx.stroke(); T(X(la), top + ph + 18, la === 0 ? '1' : la === 1 ? '10' : la === -1 ? '0.1' : '0.01', 12.5, '#64748b', 'center', 700); });
    [[Math.log10(1 / 317.8), '지구 1 M⊕'], [Math.log10(17 / 317.8), '해왕성 17 M⊕'], [0, '목성 1 M_J'], [1, '10 M_J']].forEach(([lm, l]) => { ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.beginPath(); ctx.moveTo(ix, Y(lm)); ctx.lineTo(ix + iw, Y(lm)); ctx.stroke(); T(ix - 6, Y(lm) + 4, l, PHONE ? 10.5 : 12, '#64748b', 'right', 700); });
    T(ix + iw / 2, top + ph + 38 * Math.min(FS, 1.1), '별과의 거리 a (AU, 로그 눈금)', 12.5, '#475569', 'center', 800);
    if (SC.all) POP.forEach((p) => { if (!p.det.some(Boolean)) { ctx.fillStyle = 'rgba(100,116,139,.22)'; ctx.beginPath(); ctx.arc(X(p.la), Y(p.lm), 2, 0, TAU); ctx.fill(); } });
    [0, 1, 2].forEach((m) => {
      if (SC.m !== 0 && SC.m !== m + 1) return;
      ctx.fillStyle = rgba(METH[m].c, 0.85 * SC.fade); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 0.8;
      POP.forEach((p) => { if (p.det[m]) { ctx.beginPath(); ctx.arc(X(p.la) + (m - 1) * 0.0, Y(p.lm), 3.3, 0, TAU); ctx.fill(); ctx.stroke(); } });
    });
    // 범례
    [0, 1, 2].forEach((m, i) => { const lx = ix + 8 + i * (PHONE ? 112 : 150), ly = top + 14; ctx.fillStyle = METH[m].c; ctx.beginPath(); ctx.arc(lx, ly, 5, 0, TAU); ctx.fill(); T(lx + 10, ly + 4, (PHONE ? ['시선속도', '통과', '렌즈'][m] : METH[m].n) + ' ' + scCount(m), PHONE ? 10.5 : 12.5, '#1e293b', 'left', 800); });
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    T(I.x + 14, I.y + 24 * FS, '⚠ 선택 효과: 찾기 쉬운 행성이 먼저 발견돼요', 14.5, '#1e293b', 'left', 800);
    let yy = drawWrap(I.x + 14, I.y + 50 * FS, '회색 점(못 찾은 행성)까지 합치면 행성은 모든 거리·질량에 고르게 있어요. 하지만 찾아낸 행성은 방법마다 한쪽에 몰려 있어요.', I.w - 28, 13.5, { color: '#334155' });
    yy = drawWrap(I.x + 14, yy + 22 * FS, '시선 속도법: 별에 가까운 무거운 행성 (K가 커요) · 통과법: 별에 가까운 큰 행성 (확률 R_s/a와 깊이) · 미세 렌즈법: 1~8 AU 구간.', I.w - 28, 13, { color: '#0369a1', weight: 800 });
    drawWrap(I.x + 14, yy + 22 * FS, '이 그림은 실제 발견 목록이 아니라, 탐지 한계를 단순하게 적용한 모형이에요. 그래서 "우주에는 뜨거운 목성이 가장 흔하다"고 결론 낼 수 없어요.', I.w - 28, 12.5, { color: '#b45309', weight: 800 });
  }

  /* =========================================================
     컨트롤 · 입력 · 장면 전환
     ========================================================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); if (v === 'scatter') S.sc.fade = 0; if (v === 'transit') { TR.u = -1.7; TR.hold = 0; } }
    updateCtl();
  }
  const grpPl = $('#grpPl');
  PR.forEach((p, i) => { const e = document.createElement('button'); e.type = 'button'; e.className = 'opt'; e.dataset.k = i; e.textContent = p.n; grpPl.appendChild(e); });
  // 통과 깊이는 비싸서 한 번만 계산해요
  let trMemo = { key: '', v: 0 };
  const depthNow = () => { const key = TR.rp + '|' + TR.ai + '|' + TR.inc; if (trMemo.key !== key) trMemo = { key, v: trDepth() }; return trMemo.v; };
  const depthIn = () => { const d = depthNow() * 100; return d >= 0.9 && d <= 1.1; };
  const rvOK = () => RV.ok && RV.pl === 3;
  const ratioNow = () => { const x = numOf('inRatio'); return x != null && depthNow() > 0 && near(x, Math.sqrt(depthNow()), 0.012); };
  const trOK = () => { TR.ratioOk = ratioNow(); return depthIn() && TR.ratioOk; };
  function updateCtl() {
    const free = FREE();
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcK').hidden = !(S.view === 'rv' && (S.flags.calcK || free));
    $('#calcPeg').hidden = !(S.view === 'peg' && (S.flags.calcPeg || free));
    $('#pegNote').hidden = !(S.view === 'peg' && !(S.flags.calcPeg || free));
    $('#calcRatio').hidden = !(S.view === 'transit' && (S.flags.calcRatio || free));
    $('#ctlInc').hidden = !(S.view === 'transit' && (S.flags.inc || free));
    $('#calcDen').hidden = !(S.view === 'density' && (S.flags.calcDen || free));
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#grpPl .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === RV.pl));
    $$('#grpA .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === TR.ai));
    $$('#grpMs .opt').forEach((b) => { b.classList.toggle('on', +b.dataset.k === LN.mi); b.disabled = !LN.pl; });
    $('#bPl').textContent = LN.pl ? '행성 있음 (눌러서 없애기)' : '행성 없음 (눌러서 놓기)';
    $$('#grpX .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === LN.pick[0]));
    $$('#grpY .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === LN.pick[1]));
    $$('#grpMeth .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.sc.m));
    $('#bAllPl').textContent = S.sc.all ? '회색 점(못 찾은 행성) 숨기기' : '회색 점(못 찾은 행성) 보이기';
  }
  const sl = (id, oid, fmt, cb) => bindSlider($(id), $(oid), fmt, cb);
  sl('#sRp', '#oRp', (v) => f1(v) + ' R⊕', (v) => { TR.rp = v; });
  sl('#sInc', '#oInc', (v) => f1(v) + '°', (v) => { TR.inc = v; });
  sl('#sCur', '#oCur', (v) => (v > 0 ? '+' : '') + v + '일', (v) => { LN.cur = v; });
  modeBtns.forEach((b) => clickable(b, () => setView(b.dataset.view)));
  $$('#grpPl .opt').forEach((b) => clickable(b, () => { RV.pl = +b.dataset.k; updateCtl(); }));
  $$('#grpA .opt').forEach((b) => clickable(b, () => { TR.ai = +b.dataset.k; TR.u = -1.7; updateCtl(); }));
  clickable($('#bPl'), () => { LN.pl = !LN.pl; updateCtl(); });
  $$('#grpMs .opt').forEach((b) => clickable(b, () => { LN.mi = +b.dataset.k; updateCtl(); }));
  $$('#grpX .opt').forEach((b) => clickable(b, () => { LN.pick[0] = +b.dataset.k; updateCtl(); }));
  $$('#grpY .opt').forEach((b) => clickable(b, () => { LN.pick[1] = +b.dataset.k; updateCtl(); }));
  $$('#grpMeth .opt').forEach((b) => clickable(b, () => { S.sc.m = +b.dataset.k; S.sc.fade = 0; updateCtl(); }));
  clickable($('#bAllPl'), () => { S.sc.all = !S.sc.all; updateCtl(); });
  $('#inK').addEventListener('input', () => { if (RV.pl === 3 && near(numOf('inK'), Kof(PR[3]), 0.7)) { RV.ok = true; fbIn('inK', true); } else RV.ok = false; });
  const pgUpd = () => { PG.a = near(numOf('inA'), PEG.a, 0.005); PG.v = near(numOf('inVp'), PEG.v, 8); PG.m = near(numOf('inMp'), PEG.Mj, 0.05); };
  $('#inA').addEventListener('input', () => { pgUpd(); if (PG.a) fbIn('inA', true); });
  $('#inVp').addEventListener('input', () => { pgUpd(); if (PG.v) fbIn('inVp', true); });
  $('#inMp').addEventListener('input', () => { pgUpd(); if (PG.m) fbIn('inMp', true); });
  $('#inRatio').addEventListener('input', () => { TR.ratioOk = ratioNow(); if (TR.ratioOk) fbIn('inRatio', true); });
  $('#inD1').addEventListener('input', () => { if (nearRel(numOf('inD1'), DEN[0].rho, 0.12)) { S.de.ok[0] = true; fbIn('inD1', true); } });
  $('#inD2').addEventListener('input', () => { if (nearRel(numOf('inD2'), DEN[1].rho, 0.12)) { S.de.ok[1] = true; fbIn('inD2', true); } });

  SciSim.pointer(view, {
    down(p) {
      switch (S.view) {
        case 'peg': return pgDown(p);
        case 'lens': return lnDown(p);
        case 'table': return tbDown(p);
        case 'match': { const r = cMa.down(p); updateCtl(); return r; }
        default: return false;
      }
    },
    move(p) { if (S.view === 'peg') pgMove(p); else if (S.view === 'lens') lnMove(p); else if (S.view === 'match') cMa.move(p); },
    up(p) { if (S.view === 'match') { cMa.up(p); updateCtl(); } },
    hover(p) {
      if (S.view === 'match') return cMa.hit(p) ? 'pointer' : '';
      if (S.view === 'peg') { const g = pgGeom(); return p.x > g.ix && p.x < g.ix + g.iw ? 'ew-resize' : ''; }
      if (S.view === 'lens') { const g = lnGeom(); return p.x > g.ix && p.x < g.ix + g.iw && p.y > g.Lc.y && p.y < g.Lc.y + g.Lc.h ? 'ew-resize' : ''; }
      if (S.view === 'table') { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (inR(p, tbCellRect(i, j))) return 'pointer'; }
      return '';
    },
  });

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '시선 속도: 별의 흔들림 읽기', short: '시선 속도', icon: '🌀', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 보이지 않는 행성을 어떻게 찾고, 무엇을 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>물질과 에너지·역학과 에너지에서</b> 도플러 효과(Δλ / λ = v / c)와 케플러 제3법칙(T² = a³ / M)을 배웠어요. 이번에는 이 둘로 <b>별의 흔들림에서 행성의 질량과 궤도</b>를 알아내요.</div>' +
        '<p>별과 행성은 <b>공통 질량 중심</b> 둘레를 돌아요. 그래서 별이 주기적으로 다가오고 멀어지며 스펙트럼선이 좌우로 이동해요. 이 <b>시선 속도법</b>으로 목성과 51 Peg b를 분석해 봐요.</p>',
      features: ['rv', 'peg'],
      setup() { setView('rv'); },
      recap: '행성의 질량이 클수록 별이 크게 흔들려요. 스펙트럼선의 주기적 이동에서 주기·질량(하한)·궤도를 알 수 있어요.',
      summary: '<ul><li>별과 행성은 <b>공통 질량 중심</b>을 돌아요: M★ v★ = M_행성 v_행성. 그래서 v★ = v_행성 × (M_행성 / M★).</li><li>목성이 태양에 일으키는 속도는 13.1 km/s × 1/1047 = <b>12.5 m/s</b>, 지구는 약 <b>0.09 m/s</b>. 스펙트럼선이 Δλ = λ v / c만큼 움직여요(500 nm, 12.5 m/s → 2.1×10⁻⁵ nm). 약 1 m/s 이하의 정밀도가 필요해요.</li><li><b>51 Peg b</b>(1995, 2019 노벨 물리학상): M★ = 1.1 M☉, K = 56 m/s, P = 4.2일 → a³ = M P²에서 <b>a ≈ 0.053 AU</b>(수성 궤도의 약 1/7), v = 2πa / P ≈ <b>136 km/s</b>, M_행성 / M★ = 0.056 / 136 ≈ 4.1×10⁻⁴ → <b>약 0.47 M_J</b>.</li><li>시선 속도법은 궤도면이 시선과 나란한 경우를 가정해 얻은 <b>질량의 하한</b>이에요.</li></ul>',
      missions: [
        {
          title: '목성이 태양을 흔드는 속도',
          goal: '<b>목성</b>을 고르고, 목성이 태양에 일으키는 속도 진폭 <b>K</b>를 <b>m/s</b>로 계산해 입력하세요. (v_목성 = 13.1 km/s, 질량비 1/1047)',
          hint: 'K = v_행성 × (M_행성 / M_태양) = 13.1 km/s × 1/1047 ≈ 0.0125 km/s예요. 1 km/s = 1000 m/s로 바꾸면 약 12.5 m/s예요.',
          setup() { RV.pl = 3; RV.ok = false; S.flags.calcK = true; clrIn('inK'); setView('rv'); },
          check: () => rvOK(),
          hold: 0.5,
          status: () => mark(RV.pl === 3) + ' 목성 선택 &nbsp; ' + mark(rvOK()) + ' K = ' + ($('#inK').value.trim() || '—') + ' m/s',
          explain: 'K = 13.1 km/s / 1047 ≈ <b>12.5 m/s</b>예요. 500 nm 빛의 파장은 Δλ = λ v / c ≈ 2.1×10⁻⁵ nm만 변해요. 지구는 0.09 m/s라서 같은 방법으로 찾기가 훨씬 어려워요.',
        },
        {
          title: '51 Peg b의 궤도와 질량 구하기',
          goal: '곡선에서 읽은 <b>K = 56 m/s, P = 4.2일</b>과 M★ = 1.1 M☉로 행성의 <b>① 궤도 반지름 a(AU) ② 궤도 속력(km/s) ③ 질량(M_J)</b>을 차례로 계산해 입력하세요.',
          hint: '① P = 4.2 / 365 = 0.0115년, a³ = 1.1 × 0.0115² → a ≈ 0.053 AU ② v = 2πa / P = 2π × 0.053 × 1.5×10⁸ km / (4.2 × 86400 s) ≈ 136 km/s ③ M_행성 / M★ = 0.056 / 136 ≈ 4.1×10⁻⁴ → × 1.1 M☉ × 1047 ≈ 0.47 M_J',
          setup() { PG.a = false; PG.v = false; PG.m = false; S.flags.calcPeg = true; clrIn('inA', 'inVp', 'inMp'); setView('peg'); },
          check: () => PG.a && PG.v && PG.m,
          hold: 0.6,
          status: () => mark(PG.a) + ' a ' + ($('#inA').value.trim() || '—') + ' AU &nbsp; ' + mark(PG.v) + ' v ' + ($('#inVp').value.trim() || '—') + ' km/s &nbsp; ' + mark(PG.m) + ' M ' + ($('#inMp').value.trim() || '—') + ' M_J',
          explain: 'a ≈ <b>0.053 AU</b>(수성 궤도 0.387 AU의 약 1/7), v ≈ <b>136 km/s</b>, 질량 ≈ <b>0.47 M_J</b>(목성의 약 절반)예요. 별 바로 곁을 도는 "뜨거운 목성"이에요.',
        },
        {
          type: 'quiz', title: '행성이 무거울수록 별이 더 흔들리는 까닭',
          goal: '행성의 질량이 클수록 별의 속도 진폭 K가 커지는 까닭은?',
          setup() { setView('rv'); },
          choices: ['질량 중심은 무거운 쪽 가까이에 있어서, 행성이 무거울수록 별이 질량 중심에서 더 멀리 돌고 더 빨라지기 때문이에요', '행성이 별 안에서 스스로 빛을 내서 별이 흔들려 보이기 때문이에요', '행성이 무거우면 별의 스펙트럼선이 모두 사라지기 때문이에요', '행성이 무거울수록 별의 온도가 변하기 때문이에요'],
          answer: 0,
          feedback: ['', '행성은 스스로 빛을 내지 않아요. 별의 흔들림을 도플러 효과로 알아내는 거예요.', '스펙트럼선은 사라지지 않고 좌우로 이동해요.', '별의 온도가 아니라 별의 속도 변화가 원인이에요.'],
          explain: 'M★ v★ = M_행성 v_행성이라 <b>행성이 무거울수록 v★도 커져요</b>. 질량 중심에서의 거리가 질량에 반비례하기 때문이에요.',
        },
      ],
    },
    {
      title: '통과 관측: 밝기가 줄어들 때', short: '통과 관측', icon: '🌑', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 시선 속도법으로 행성의 질량을 구했어요. 이번에는 행성이 별 앞을 지나갈 때 별빛이 조금 줄어드는 <b>통과(식 현상)법</b>으로 <b>행성의 크기</b>를 알아내요.</div>' +
        '<p>밝기가 줄어드는 정도(깊이)는 <b>δ = (R_p / R_s)²</b>이에요. 행성 크기와 궤도 반지름을 바꿔 곡선이 어떻게 달라지는지 살펴보고, 두 방법을 합쳐 <b>밀도</b>를 구해 봐요.</div>',
      features: ['transit', 'density'],
      setup() { setView('transit'); },
      recap: '깊이는 (R_p / R_s)²이에요. 목성 크기는 약 1 %, 지구 크기는 약 0.0084 %. 질량(시선 속도법)과 반지름(통과법)으로 밀도를 구해요.',
      summary: '<ul><li><b>통과 깊이 δ = (R_p / R_s)²</b>: 태양 크기 별 앞의 목성(R_p = 0.10 R☉)은 약 1.0 %, 지구(0.0092 R☉)는 약 0.0084 %(84 ppm).</li><li><b>통과 확률 ≈ R_s / a</b>: 지구 궤도(1 AU) 0.47 %, a = 0.05 AU 행성 약 9.3 %. 궤도면이 시선과 나란해야(i ≈ 90°) 통과가 보여요.</li><li>시선 속도법의 <b>질량</b>과 통과법의 <b>반지름</b>으로 밀도를 구해요: HD 209458 b(0.69 M_J, 1.38 R_J)는 0.35 g/cm³(기체 행성), 케플러-10b(3.3 M⊕, 1.47 R⊕)는 5.7 g/cm³(암석 행성).</li><li>통과법만으로는 <b>질량</b>을 알 수 없어요. 케플러 우주망원경(2009~2018)은 수천 개의 후보를 찾았어요.</li></ul>',
      missions: [
        {
          title: '깊이 1.0 %로 만들고 R_p / R_s 구하기',
          goal: '행성 반지름 슬라이더로 밝기 곡선의 <b>깊이를 1.0 %</b>(0.9 ~ 1.1 %)로 맞추고, 그때의 <b>R_p / R_s</b>를 구해 입력하세요.',
          hint: 'δ = (R_p / R_s)² = 0.010이면 R_p / R_s = √0.010 = 0.10이에요. 태양 반지름이 109 R⊕이므로 R_p ≈ 10.9 R⊕, 목성 크기(11.2 R⊕) 근처예요.',
          setup() { TR.rp = 3; $('#sRp').value = 3; $('#sRp').dispatchEvent(new Event('input')); TR.ai = 0; TR.inc = 90; $('#sInc').value = 90; $('#sInc').dispatchEvent(new Event('input')); TR.ratioOk = false; S.flags.calcRatio = true; clrIn('inRatio'); setView('transit'); },
          check: () => trOK(),
          hold: 0.8,
          status: () => mark(depthIn()) + ' 관측된 깊이 ' + fPct(depthNow() * 100) + ' % (목표 1.0 %) &nbsp; ' + mark(ratioNow()) + ' R_p / R_s ' + ($('#inRatio').value.trim() || '—'),
          explain: 'δ = (R_p / R_s)² = 0.010 → R_p / R_s = <b>0.10</b>이에요. 지구 크기 행성은 (1 / 109)² ≈ <b>0.0084 %</b>로 슬라이더를 가장 작게 해도 거의 보이지 않아요.',
        },
        {
          title: '밀도로 기체 행성과 암석 행성 가리기',
          goal: '시선 속도법의 질량과 통과법의 반지름으로 <b>HD 209458 b</b>와 <b>케플러-10b</b>의 밀도(g/cm³)를 계산해 입력하세요.',
          hint: 'ρ = ρ_기준 × (M / M_기준) / (R / R_기준)³. HD 209458 b: 1.33 × 0.69 / 1.38³ ≈ 0.35, 케플러-10b: 5.51 × 3.3 / 1.47³ ≈ 5.7예요.',
          setup() { S.de.ok = [false, false]; S.flags.calcDen = true; clrIn('inD1', 'inD2'); setView('density'); },
          check: () => S.de.ok[0] && S.de.ok[1],
          hold: 0.6,
          status: () => mark(S.de.ok[0]) + ' HD 209458 b ' + ($('#inD1').value.trim() || '—') + ' &nbsp; ' + mark(S.de.ok[1]) + ' 케플러-10b ' + ($('#inD2').value.trim() || '—'),
          explain: 'HD 209458 b는 <b>0.35 g/cm³</b>로 물보다 가벼운 <b>기체 행성</b>, 케플러-10b는 <b>5.7 g/cm³</b>로 지구(5.5)와 비슷한 <b>암석 행성</b>이에요. 질량과 반지름을 모두 알아야 속을 알 수 있어요.',
        },
        {
          type: 'quiz', title: '통과법만으로는 알 수 없는 것',
          goal: '행성이 별 앞을 지나는 밝기 곡선만으로는 <b>알 수 없는 것</b>은?',
          setup() { S.flags.inc = true; setView('transit'); },
          choices: ['행성의 질량 (밝기 감소는 크기와 주기만 알려 줘요)', '행성의 반지름', '행성의 공전 주기', '행성이 별 앞을 지난다는 사실'],
          answer: 0,
          feedback: ['', '깊이 δ = (R_p / R_s)²에서 반지름을 알 수 있어요.', '통과가 반복되는 간격이 공전 주기예요.', '밝기가 일정하게 줄어드는 것으로 알 수 있어요.'],
          explain: '통과법은 <b>반지름과 주기</b>를 주지만 <b>질량</b>은 못 줘요. 또 궤도면이 시선과 나란해야 통과가 보여서(기울기 i를 바꿔 보세요) 대부분의 행성은 통과법으로 보이지 않아요.',
        },
      ],
    },
    {
      title: '미세 렌즈: 지나가는 중력 렌즈', short: '미세 렌즈', icon: '🔎', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 별 곁을 도는 행성은 흔들림과 통과로 찾았어요. 그런데 <b>멀리 있거나 별이 없는 행성</b>은요? 앞쪽 별의 중력이 렌즈처럼 배경별의 빛을 모아 <b>일시적으로 밝아지게</b> 해요. (일반 상대성 이론의 중력 렌즈: 렌즈 방정식의 계산은 다루지 않아요.)</div>' +
        '<p>앞 별이 배경별 앞을 지나가는 동안의 <b>밝기 곡선</b>을 보고, 렌즈 별 곁의 <b>행성이 만드는 짧은 봉우리</b>를 찾아봐요.</p>',
      features: ['lens', 'lens2'],
      setup() { setView('lens'); },
      recap: '행성이 있으면 종 모양 곡선 위에 짧은 추가 봉우리가 생겨요. 봉우리의 지속 시간은 √(질량)에 비례해서 목성형은 며칠, 지구형은 몇 시간이에요.',
      summary: '<ul><li><b>미세 중력 렌즈</b>: 앞 별의 중력이 배경별의 빛을 모아 밝기가 좌우 대칭의 종 모양(특징 시간 약 30일)으로 올라갔다 내려와요.</li><li>렌즈 별 곁에 행성이 있으면 곡선에 <b>짧은 추가 봉우리</b>가 생겨요. 지속 시간 ∝ √(질량): 목성형 약 1~2일, 지구형 약 2~3시간.</li><li><b>일회성</b> 사건이에요. 같은 정렬이 다시 오지 않아 반복 관측이 안 되지만, 수 kpc 먼 곳의 행성과 별을 돌지 않는 자유 부유 행성도 찾을 수 있어요.</li></ul>',
      missions: [
        {
          title: '곡선에서 행성 봉우리 찾기',
          goal: '렌즈 별 곁에 <b>행성이 있는</b> 곡선(주황)과 없는 곡선(회색 점선)을 비교하세요. 그래프를 눌러 끌어 <b>확대 창이 추가 봉우리 위</b>로 오게 맞추세요.',
          hint: '주황 곡선이 회색 점선 위로 솟은 곳이 행성 봉우리예요. 확대 그래프(아래)의 가운데에 뾰족한 봉우리가 보이도록 날짜를 옮겨요. 17일 근처를 살펴봐요.',
          setup() { LN.pl = true; LN.mi = 3; LN.cur = -30; $('#sCur').value = -30; updateCurOut(); setView('lens'); },
          check: () => lnFound(),
          hold: 0.8,
          status: () => mark(LN.pl) + ' 행성 있음 &nbsp; ' + mark(lnFound()) + ' 확대 창 t = ' + (LN.cur > 0 ? '+' : '') + f1(LN.cur) + '일',
          explain: '행성이 있으면 종 모양 곡선 위 <b>t ≈ +17일</b>에 짧은 추가 봉우리가 나타나요. 배경별이 행성의 하늘 위치를 지나는 순간이에요. 행성이 없으면 매끈한 곡선이에요.',
        },
        {
          title: '봉우리의 폭으로 행성 종류 구분하기', manual: true,
          goal: '미지의 행성 <b>X</b>와 <b>Y</b>의 추가 봉우리 폭을 읽고, 각각 <b>지구형(몇 시간)</b>인지 <b>목성형(며칠)</b>인지 고르세요.',
          hint: '눈금 한 칸이 1일이에요. 봉우리의 폭이 1일보다 훨씬 좁으면(몇 시간) 지구형, 1~2일이면 목성형이에요.',
          setup() { LN.hid = Math.random() < 0.5 ? [1, 0] : [0, 1]; LN.pick = [-1, -1]; setView('lens2'); },
          check() {
            if (LN.pick[0] < 0 || LN.pick[1] < 0) return '행성 X와 Y를 모두 골라 주세요.';
            const ok = LN.pick[0] === LN.hid[0] && LN.pick[1] === LN.hid[1];
            if (ok) { LN.ok2 = true; return true; }
            return '봉우리가 눈금(1일)보다 훨씬 좁으면 지구형, 1~2일에 걸쳐 넓으면 목성형이에요. 다시 읽어 보세요.';
          },
          status: () => 'X ' + (LN.pick[0] < 0 ? '—' : LN.pick[0] === 0 ? '지구형' : '목성형') + ' · Y ' + (LN.pick[1] < 0 ? '—' : LN.pick[1] === 0 ? '지구형' : '목성형'),
          explain: '지속 시간 ≈ 0.1일 × √(질량 / 지구 질량)이에요. 지구형은 약 <b>2.4시간</b>, 목성형은 약 <b>1.8일</b>로 질량이 318배 차이 나면 폭은 약 18배 차이가 나요. 같은 별에서 렌즈 사건은 <b>정렬이 한 번뿐이라 다시 관측할 수 없어요</b>.',
        },
      ],
    },
    {
      title: '방법 비교: 무엇을 얻고 무엇을 놓칠까', short: '방법 비교', icon: '⚖', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 세 가지 탐사 방법(시선 속도법·통과법·미세 렌즈법)을 모두 써 봤어요. 방법마다 <b>얻는 정보</b>와 <b>잘 찾는 행성</b>이 달라요. 직접 촬영은 아주 밝은 큰 행성에만 쓸 수 있어 간단히만 소개해요.</div>' +
        '<p>방법별로 알 수 있는 정보 표를 채우고, 행성 4종에 알맞은 방법을 고른 뒤, 발견된 행성의 분포가 한쪽으로 치우치는 이유를 알아봐요.</p>',
      features: ['table', 'match', 'scatter'],
      setup() { setView('table'); },
      recap: '시선 속도법은 질량·주기, 통과법은 반지름·주기, 미세 렌즈법은 질량 정보를 줘요. 찾기 쉬운 행성부터 발견되는 선택 효과가 있어요.',
      summary: '<ul><li><b>시선 속도법</b>: 질량(하한)·주기. <b>통과법</b>: 반지름·주기. <b>미세 렌즈법</b>: 질량 정보, 일회성이라 주기는 알 수 없어요. 앞의 두 방법을 합치면 밀도를 구해요.</li><li>알맞은 방법: 별 가까이의 뜨거운 목성은 시선 속도법·통과법, 지구 크기 행성은 정밀한 통과 관측, 먼 곳의 5 AU 목성형과 자유 부유 행성은 미세 렌즈법.</li><li><b>선택 효과</b>: 처음 발견된 외계 행성에 뜨거운 목성이 많은 것은 흔해서가 아니라 <b>찾기 쉬운(무겁고 별에 가까운) 행성부터</b> 발견됐기 때문이에요.</li><li>확인된 외계 행성은 2025년에 약 6000개예요.</li></ul>',
      missions: [
        {
          title: '방법별 얻는 정보 표 채우기', manual: true,
          goal: '표의 9칸을 눌러 방법마다 <b>질량 · 반지름 · 궤도 주기</b>를 알 수 있으면 ○, 없으면 ×로 채우세요.',
          hint: '시선 속도법은 별의 흔들림(질량·주기), 통과법은 밝기 감소(반지름·주기), 미세 렌즈법은 한 번뿐인 사건이라 주기를 몰라요.',
          setup() { TB.cell = [[-1, -1, -1], [-1, -1, -1], [-1, -1, -1]]; setView('table'); },
          check() {
            if (!tbFilled()) return '아직 ?로 남은 칸이 ' + TB.cell.flat().filter((c) => c < 0).length + '개 있어요.';
            return tbRight() ? true : '빨간 테두리 칸이 알맞지 않아요. 방법마다 어떤 단서를 쓰는지 떠올려 보세요.';
          },
          status: () => mark(tbFilled()) + ' 채운 칸 ' + TB.cell.flat().filter((c) => c >= 0).length + ' / 9 &nbsp; ' + mark(tbRight()) + ' 모두 맞음',
          explain: '<b>시선 속도법</b>: 질량(하한) ○, 반지름 ×, 주기 ○. <b>통과법</b>: 질량 ×, 반지름 ○, 주기 ○. <b>미세 렌즈법</b>: 질량 ○(정보), 반지름 ×, 주기 ×(일회성).',
        },
        {
          title: '행성에 알맞은 방법 고르기', manual: true,
          goal: '행성 카드 4장을 <b>가장 알맞은 탐사 방법</b> 상자에 넣으세요. (뜨거운 목성은 두 방법 모두 가능해요)',
          hint: '지구 크기 행성은 별을 거의 못 흔들지만 통과 깊이를 재요. 먼 별의 행성이나 별 없는 행성은 렌즈 효과가 단서예요.',
          setup() { cMa.reset(); setView('match'); },
          check() {
            const pl = cMa.items.filter((i) => i.loc != null).length;
            if (pl < 4) return '아직 상자에 넣지 않은 카드가 ' + (4 - pl) + '장 있어요.';
            const bad = cMa.items.filter((i) => !cMa.isRight(i));
            return bad.length ? '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요.' : true;
          },
          status: () => mark(cMa.counts().placed === 4) + ' 넣은 카드 ' + cMa.counts().placed + ' / 4 &nbsp; ' + mark(cMa.counts().right === 4) + ' 맞게 ' + cMa.counts().right + ' / 4',
          explain: '뜨거운 목성은 <b>시선 속도법·통과법</b>, 지구 크기 행성은 <b>통과법</b>(우주 망원경), 먼 별의 5 AU 목성형과 자유 부유 행성은 <b>미세 렌즈법</b>이에요.',
        },
        {
          type: 'quiz', title: '뜨거운 목성이 많이 발견된 까닭',
          goal: '처음 발견된 외계 행성 중에는 별 가까이의 <b>뜨거운 목성</b>이 많아요. 그 까닭은?',
          setup() { setView('scatter'); },
          choices: ['무겁고 별에 가까운 행성이 별을 더 크게 흔들고 통과도 잘 보여 먼저 발견됐기 때문이에요 (선택 효과)', '우주에서 뜨거운 목성이 가장 흔한 행성이기 때문이에요', '뜨거운 목성에서만 생명체가 살 수 있기 때문이에요', '작은 행성이나 먼 행성은 아예 존재하지 않기 때문이에요'],
          answer: 0,
          feedback: ['', '분포의 치우침은 찾기 쉬운 것부터 발견된 탓이에요. 이 모형에서도 실제 행성은 거리·질량에 고르게 있어요.', '뜨거운 목성은 표면 온도가 매우 높아 액체 물이 있기 어려워요.', '작은 행성과 먼 행성도 있지만 지금의 방법으로 찾기 어려울 뿐이에요.'],
          explain: '발견 목록은 <b>탐지 한계</b>의 영향을 받아요(<b>선택 효과</b>). 시선 속도법은 K가 큰 행성, 통과법은 깊이와 확률이 큰 행성을 먼저 찾아서, 발견된 행성만으로 우주의 행성 분포를 결론 내릴 수 없어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-exoplanet-detect', mount: '#game', badge: '외계 행성 사냥꾼', homeHref: '../../index.html#hu',
    featureLabels: { rv: '🌀 질량 중심 모형 · 스펙트럼선', peg: '📈 51 Peg b 시선 속도 곡선', transit: '🌑 통과 밝기 곡선', density: '🧮 밀도 계산 카드', lens: '🔎 미세 렌즈 밝기 곡선 · 확대 창', lens2: '❓ 미지의 행성 봉우리', table: '📋 방법별 정보 표', match: '🎯 행성–방법 짝짓기', scatter: '🔵 발견 분포 모형' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view;
    if (v === 'rv') { const p = PR[RV.pl]; setReadouts(['고른 행성', p.n, '행성의 궤도 속력', p.v + ' km/s', '태양의 속도 진폭 K', rvSolved() ? fK(Kof(p)) + ' m/s' : '?']); }
    else if (v === 'peg') setReadouts(['읽은 시각', f1(PG.t) + '일', '그때의 속도', (pgV(PG.t) >= 0 ? '+' : '') + f0(pgV(PG.t)) + ' m/s', '맞힌 계산 단계', [PG.a, PG.v, PG.m].filter(Boolean).length + ' / 3']);
    else if (v === 'transit') setReadouts(['관측된 깊이', fPct(depthNow() * 100) + ' %', '공전 주기 P', fP(traP(trA())), '통과가 보일 확률', fPct(trProb() * 100) + ' %']);
    else if (v === 'density') setReadouts(['HD 209458 b 밀도', S.de.ok[0] || FREE() ? f2(DEN[0].rho) + ' g/cm³' : '?', '케플러-10b 밀도', S.de.ok[1] || FREE() ? f2(DEN[1].rho) + ' g/cm³' : '?', '구한 밀도', S.de.ok.filter(Boolean).length + ' / 2']);
    else if (v === 'lens') setReadouts(['확대한 날', (LN.cur > 0 ? '+' : '') + f1(LN.cur) + '일', '렌즈 별 곁 행성', LN.pl ? MS[LN.mi].n + ' · 봉우리 ' + durTxt(lensDur(lnM())) : '없음', '그날의 밝기', '×' + f2(lnTot(LN.cur))]);
    else if (v === 'lens2') setReadouts(['행성 X의 답', LN.pick[0] < 0 ? '—' : LN.pick[0] === 0 ? '지구형' : '목성형', '행성 Y의 답', LN.pick[1] < 0 ? '—' : LN.pick[1] === 0 ? '지구형' : '목성형', '폭의 비 (목성형 / 지구형)', '√318 ≈ 18배']);
    else if (v === 'table') setReadouts(['채운 칸', TB.cell.flat().filter((c) => c >= 0).length + ' / 9', '맞은 칸', tbFilled() ? TB.cell.flat().filter((c, k) => c === (TB_TRUTH[Math.floor(k / 3)][k % 3] ? 1 : 0)).length + ' / 9' : '—', '방법', '3가지']);
    else if (v === 'match') { const c = cMa.counts(); setReadouts(['넣은 카드', c.placed + ' / 4', '알맞게 넣은 카드', c.right + ' / 4', '방법', '3가지']); }
    else setReadouts(['시선 속도법으로 찾음', scCount(0) + '개', '통과법으로 찾음', scCount(1) + '개', '미세 렌즈법으로 찾음', scCount(2) + '개']);
  }

  /* ================= 루프 ================= */
  updateCtl(); updateCurOut();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    view.apply();
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    switch (S.view) {
      case 'rv': drawRv(dt, t); break;
      case 'peg': drawPeg(dt, t); break;
      case 'transit': drawTransit(dt, t); break;
      case 'density': drawDensity(dt, t); break;
      case 'lens': drawLens(dt, t); break;
      case 'lens2': drawLens2(dt, t); break;
      case 'table': drawTable(dt, t); break;
      case 'match': drawMatch(dt, t); break;
      default: drawScatterEx(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, updateCtl, PEG, PR, DEN, POP, TR, RV, PG, LN, TB, cMa, depthNow, trK, TE, TP, lnFound, lensDur, tbRight, tbFilled, rvOK, trOK, depthIn, LLn, lnGeom, pgGeom, tbCellRect, scCount, lnMove };


})();
