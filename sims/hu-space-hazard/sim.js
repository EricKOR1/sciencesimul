/* =========================================================
   행성우주과학 Ⅰ. 우주탐사와 행성계 - 우주 위험 감시 (5차시)
   성취기준 [12행우01-02] 태양 활동 감시 시스템과 지구 접근 천체를 비롯한 지구를 위협하는 우주 위험 감시 기술의 중요성을 우주 재난 측면에서 인식할 수 있다.
   ① 분석: 우주 기상 (X선 등급, CME 도달 시간 t = d / v)
   ② 탐구: 감시와 대응 (L1 경보 시간, 분야–피해–대응 표)
   ③ 분석: 충돌 위험 (근지구 천체, E = ½mv², DART와 어긋남 Δs ≈ 3Δv·t)
   ④ 적용: 우주 쓰레기 (E = ½mv², 케슬러 증후군, 재진입 시간)
   다루지 않음: 지자기 폭풍의 전리권·자기권 물리, 충돌 크레이터 형성 모델, 토리노·팔레르모 척도 계산, 궤도 결정 알고리즘.
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

  /* 조사 고르기: 마지막 글자의 받침 유무 */
  const hasBatchim = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  const eunNeun = (w) => (hasBatchim(w) ? '은' : '는');
  const iGa = (w) => (hasBatchim(w) ? '이' : '가');
  initStage('#e8eef8', 800, 620, 480, 860, 1.25);
  if (PHONE) view.canvas.style.touchAction = 'pan-y';

  /* ================= 자료 ================= */
  const DSE = 1.5e8, L1KM = 1.5e6;                 // 태양–지구, L1–지구 (km)
  const MT_J = 4.2e15, HIRO_MT = 0.015, CAR_J = 5.8e5, RHO_AST = 3000, RHO_AL = 2700, RE_KM = 6371, YR_S = 3.156e7;
  const FLARES = [{ t: 3.0, f: 4e-7 }, { t: 7.5, f: 3e-6 }, { t: 12.0, f: 2e-5 }, { t: 16.5, f: 1.5e-4 }, { t: 21.0, f: 6e-5 }];
  const FL_BASE = 5e-8;
  function fluxAt(t) {
    let f = FL_BASE * (1 + 0.15 * Math.sin(t * 1.3));
    FLARES.forEach((o) => { const dt = t - o.t; f += o.f * (dt < 0 ? Math.exp(-Math.pow(dt / 0.35, 2)) : Math.exp(-dt / 0.8)); });
    return f;
  }
  function clsOf(f) {
    const tb = [['X', 1e-4], ['M', 1e-5], ['C', 1e-6], ['B', 1e-7], ['A', 1e-8]];
    for (const [l, b] of tb) if (f >= b || l === 'A') return l + f1(f / b);
    return 'A';
  }
  const fmtT = (h) => (h >= 100 ? f0(h) : f1(h));
  const ASTS = [
    { n: '아포피스', a: 0.922, e: 0.191, c: '#f59e0b' }, { n: '에로스', a: 1.458, e: 0.223, c: '#a78bfa' }, { n: '베스타', a: 2.362, e: 0.089, c: '#94a3b8' },
  ];
  const DOPT = [20, 50, 140, 340, 1000];
  const INTERVAL = [[20, '20 m급', '수십~100년'], [140, '140 m급', '약 수만 년'], [1000, '1 km급', '약 50만 년'], [10000, '10 km급', '약 1억 년']];
  const astM = (D) => RHO_AST * Math.PI / 6 * D * D * D;               // kg
  const astE = (D, v) => 0.5 * astM(D) * v * v * 1e6;                   // J (v: km/s)
  const dbM = (cm) => RHO_AL * Math.PI / 6 * Math.pow(cm / 100, 3);     // kg
  const dbE = (cm, v) => 0.5 * dbM(cm) * v * v * 1e6;
  const dsKm = (dvCm, tYr) => 3 * (dvCm / 100) * tYr * YR_S / 1000;     // Δs ≈ 3 Δv t (km)
  const WHO = [
    { n: '위성', ic: '🛰️', dmg: ['장비 고장', '방사선·궤도'], rsp: ['안전 모드', '운영 정지'] },
    { n: 'GPS 항법', ic: '📍', dmg: ['측위 오차', '위치 틀어짐'], rsp: ['작업 연기', '보정 신호'] },
    { n: '극항로 항공', ic: '✈️', dmg: ['방사선 피폭', '승객 피폭'], rsp: ['저위도 항로', '극항로 우회'] },
    { n: '송전망', ic: '⚡', dmg: ['유도 전류', '변압기 과열'], rsp: ['부하 조정', '예비 전력'] },
    { n: '단파 통신', ic: '📻', dmg: ['통신 두절', '전리권 교란'], rsp: ['주파수 변경', '위성 통신'] },
  ];
  const ALERT = ['관심', '주의', '경계', '심각'];
  const RULES = [
    { t: '수명이 끝난 위성은 궤도에서 내려요', ok: true }, { t: '파편을 만들 수 있는 시험은 하지 않아요', ok: true }, { t: '감시 자료를 모두가 공유해요', ok: true },
    { t: '작은 파편은 위험하지 않으니 무시해요', ok: false }, { t: '위성을 많이 쏘고 뒤처리는 하지 않아요', ok: false }, { t: '쓰레기를 높은 궤도로 밀어 올려 숨겨요', ok: false },
  ];
  const REENTRY = [['400 km', 0.2, 1, '수개월~1년'], ['800 km', 30, 100, '수십~100년'], ['1000 km 이상', 200, 1000, '수백 년']];

  /* ================= 상태 ================= */
  const S = {
    view: 'flare', clock: 0, fade: 0,
    fl: { t: 16.5, seen: [false, false, false, false, false], v: 1000, cme: { on: false, t: 0, done: false, light: 0 }, ok: false },
    mo: { w: 800, on: false, t: 0, alarm: 0, ok: false, done: false },
    im: { di: 0, v: 20, boom: 0, boomed: false, neo: 0, eOk: false, ang: 0, shake: 0 },
    da: { dv: 0.5, ty: 2, shot: false, dart: 0, ds: 0, hit: 0, ok: false },
    db: { sz: 0, rel: 10, eOk: false, objs: [], frag: 0, hits: 0, rules: RULES.map(() => false), ruleOk: false, ang: 0, flash: 0 },
    flags: { calcT: false, calcAl: false, calcE: false, calcJ: false, rule: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { flare: '☀️ 태양 X선 등급과 CME', monitor: '📡 L1 위성의 경보', table: '📋 분야 – 피해 – 대응', impact: '☄️ 근지구 천체의 충돌 에너지', dart: '🛰️ DART: 궤도를 살짝 바꾸기', debris: '🛰️ 우주 쓰레기와 연쇄 충돌' };
  const modeBtns = $$('#modeSeg button');

  /* =========================================================
     ① 우주 기상: X선 등급 그래프와 CME 도달 시간
     ========================================================= */
  function LF() {
    return PHONE ? { C: { x: 8, y: 8, w: 464, h: 396 }, M: { x: 8, y: 412, w: 464, h: 440 } } : { C: { x: 10, y: 8, w: 780, h: 296 }, M: { x: 10, y: 312, w: 780, h: 300 } };
  }
  function fcGeom() {
    const { C } = LF(), ix = C.x + 58, iw = C.w - 58 - (PHONE ? 30 : 44), top = C.y + 44, ph = C.h - 44 - 52;
    return { C, ix, iw, top, ph, X: (t) => ix + t / 24 * iw, Y: (f) => top + (1 - (Math.log10(f) + 8) / 5) * ph };
  }
  const cmeT = (v) => DSE / v / 3600;
  function drawFlare(dt, t) {
    const { C, ix, iw, top, ph, X, Y } = fcGeom(), M = LF().M, F = S.fl, cme = F.cme;
    panel(C.x, C.y, C.w, C.h, { r: 14 });
    T(C.x + 14, C.y + 24 * FS, '☀️ 태양 X선 세기 (1일, 로그 눈금)', 14.5, '#1e293b', 'left', 800);
    // 등급 띠
    const bands = [['A', -8, -7, '#e2e8f0'], ['B', -7, -6, '#dbeafe'], ['C', -6, -5, '#dcfce7'], ['M', -5, -4, '#fef3c7'], ['X', -4, -3, '#fee2e2']];
    bands.forEach((b) => { const y0 = Y(Math.pow(10, b[2])), y1 = Y(Math.pow(10, b[1])); ctx.fillStyle = b[3]; ctx.fillRect(ix, y0, iw, y1 - y0); T(ix + iw + 10, (y0 + y1) / 2 + 5, b[0], 14, '#334155', 'left', 800); });
    for (let k = -8; k <= -3; k++) { const y = Y(Math.pow(10, k)); ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ix, y); ctx.lineTo(ix + iw, y); ctx.stroke(); T(ix - 6, y + 4, '10' + sup(k), 12, '#64748b', 'right', 700); }
    T(C.x + 14, top + ph / 2, 'W/m²', 12, '#64748b', 'left', 700);
    for (let h = 0; h <= 24; h += 6) { T(X(h), top + ph + 20, h + '시', 12.5, '#64748b', 'center', 700); }
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ix, top); ctx.lineTo(ix, top + ph); ctx.lineTo(ix + iw, top + ph); ctx.stroke();
    // 곡선
    const pts = []; for (let i = 0; i <= 288; i++) { const tt = i / 288 * 24; pts.push([X(tt), clamp(Y(fluxAt(tt)), top, top + ph)]); }
    line(pts, '#ea580c', 2.6);
    // 읽기 커서
    const cx = X(F.t), fv = fluxAt(F.t), cy = clamp(Y(fv), top, top + ph);
    FLARES.forEach((o, i) => { if (Math.abs(F.t - o.t) < 0.7) F.seen[i] = true; });
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, top + ph); ctx.stroke(); ctx.setLineDash([]);
    FLARES.forEach((o, i) => { const px = X(o.t), py = clamp(Y(fluxAt(o.t)), top, top + ph); D.sphere(px, py, 5.5, F.seen[i] ? '#ea580c' : '#94a3b8', { gloss: false, outline: '#fff', outlineWidth: 1.5 }); T(px, py - 11, F.seen[i] ? clsOf(fluxAt(o.t)) : '?', 12.5, F.seen[i] ? '#9a3412' : '#64748b', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 }); });
    D.sphere(cx, cy, 7, '#0f172a', { gloss: false });
    D.label(clamp(cx, ix + 80, ix + iw - 80), top + 14, f1(F.t) + '시 · ' + sci(fv, 1) + ' W/m² · ' + clsOf(fv) + '급', { bg: '#0f172a', size: 12.5 });
    T(C.x + C.w / 2, C.y + C.h - 8, '그래프를 눌러 끌며 읽어요 · 등급이 한 단계 오르면 10배 (X는 C의 100배)', PHONE ? 11 : 12.5, '#475569', 'center', 700);
    // ---- CME 판
    panel(M.x, M.y, M.w, M.h, { r: 14 });
    T(M.x + 14, M.y + 24 * FS, '☄️ 코로나 질량 방출(CME)이 지구까지 가는 시간', 14.5, '#1e293b', 'left', 800);
    const sx = M.x + 56, ex = M.x + M.w - 56, my = M.y + (PHONE ? 120 : 122);
    const T_h = cmeT(F.v);
    if (cme.on) { cme.t += dt / (RM ? 0.0001 : 0.1); cme.light = Math.min(1, cme.light + dt / 1.0); if (cme.t >= T_h) { cme.t = T_h; if (!cme.done) { cme.done = true; Sound.success(); parts.burst(ex - 16, my, { count: 18, speed: 160, colors: ['#22c55e', '#a78bfa', '#38bdf8'] }); } } }
    // 궤도 길
    const g = ctx.createLinearGradient(sx, 0, ex, 0); g.addColorStop(0, 'rgba(250,204,21,.35)'); g.addColorStop(1, 'rgba(56,189,248,.35)'); ctx.fillStyle = g; rr(sx, my - 3, ex - sx, 6, 3).fill();
    D.glow(sx, my, 40, '#fde047', 0.7); D.sphere(sx, my, 20, '#fbbf24', { gloss: true, light: '#fff3b0', dark: '#e07b00' });
    D.sphere(ex, my, 14, '#3b82f6', { gloss: true });
    T(sx, my + 42, '태양', 13, '#475569', 'center', 800); T(ex, my + 36, '지구', 13, '#475569', 'center', 800);
    T((sx + ex) / 2, my - 34, 'd = 1.5×10⁸ km', 13.5, '#334155', 'center', 800);
    // 빛 (플레어)
    if (cme.on && cme.light < 1) { const lx = lerp(sx + 20, ex - 16, cme.light); D.glow(lx, my, 22, '#fde047', 0.9); D.sphere(lx, my, 6, '#fef08a', { gloss: false }); T(lx, my - 18, '빛', 12, '#a16207', 'center', 800); }
    if (cme.on && cme.light >= 1) T(ex - 4, my - 26, '빛은 약 8분 만에 도착', 12, '#a16207', 'right', 800);
    // CME 구름
    if (cme.on) {
      const fr = clamp(cme.t / T_h, 0, 1), fx = lerp(sx + 22, ex - 18, fr);
      for (let i = 0; i < 4; i++) { ctx.strokeStyle = rgba('#a855f7', 0.7 - i * 0.15); ctx.lineWidth = 3 - i * 0.5; ctx.beginPath(); ctx.arc(fx - i * 9, my, 18 + i * 4 + fr * 6, -1.1, 1.1); ctx.stroke(); }
      D.glow(fx, my, 30, '#a855f7', 0.35);
      if (cme.done) { D.ring(ex, my, 24, t, { color: '#a855f7' }); }
    }
    // 시계
    const ty = my + 78;
    D.label(M.x + M.w / 2, ty, cme.on ? '경과 시간 ' + fmtT(cme.t) + ' 시간' + (cme.done ? ' · 도착!' : '') : 'CME 속도 ' + F.v + ' km/s', { bg: cme.done ? '#15803d' : '#475569', size: 14 });
    const tr = F.v;
    let yy = ty + 30 * FS;
    yy = drawWrap(M.x + 14, yy, 'CME 속도 ' + tr + ' km/s는 ' + (tr < 600 ? '느린' : tr < 1500 ? '보통' : '매우 빠른') + ' 편이에요. 속도가 클수록 도착이 빨라요.', M.w - 28, 13.5, { color: '#334155' });
    if (cme.done || FREE() || F.ok) yy = drawWrap(M.x + 14, yy + 22 * FS, 't = d / v = 1.5×10⁸ km / ' + tr + ' km/s = ' + sci(DSE / tr, 2) + ' s ≈ ' + fmtT(T_h) + ' 시간', M.w - 28, 14, { color: '#0369a1', weight: 800 });
    else yy = drawWrap(M.x + 14, yy + 22 * FS, '속도를 정하고 도달 시간을 계산한 뒤 🚀 CME 보내기로 확인해요.', M.w - 28, 13.5, { color: '#b45309', weight: 800 });
    drawWrap(M.x + 14, yy + 22 * FS, '비교: 태양풍(약 400 km/s)은 약 104시간(4일 넘게) 걸려요. 플레어의 빛이 먼저 오고 입자는 하루 이상 뒤에 와서 그 사이에 대비할 수 있어요.', M.w - 28, 12.5, { color: '#64748b' });
  }
  function flDown(p) { const g = fcGeom(); if (p.x >= g.ix - 10 && p.x <= g.ix + g.iw + 10 && p.y >= g.C.y && p.y <= g.C.y + g.C.h) { flMove(p); return true; } return false; }
  function flMove(p) { const g = fcGeom(); S.fl.t = clamp(Math.round((p.x - g.ix) / g.iw * 24 * 10) / 10, 0, 24); }
  function flLaunch() { const c = S.fl.cme; c.on = true; c.t = 0; c.done = false; c.light = 0; parts.clear(); updateCtl(); }
  /* 선 그리기 */

  /* =========================================================
     ② 감시와 대응: L1 경보 시간, 분야-피해-대응 표
     ========================================================= */
  function LMo() {
    return PHONE ? { Fl: { x: 8, y: 8, w: 464, h: 300 }, Sc: { x: 8, y: 316, w: 464, h: 536 } } : { Fl: { x: 10, y: 8, w: 780, h: 200 }, Sc: { x: 10, y: 216, w: 780, h: 396 } };
  }
  const alMin = (v) => L1KM / v / 60;
  function drawMonitor(dt, t) {
    const { Fl, Sc } = LMo(), W = S.mo;
    // 흐름도
    panel(Fl.x, Fl.y, Fl.w, Fl.h, { r: 14 });
    T(Fl.x + 14, Fl.y + 24 * FS, '🔁 감시 → 경보 → 대응 흐름', 14.5, '#1e293b', 'left', 800);
    const steps = [['🛰️', 'L1 위성', 'ACE·DSCOVR가 태양풍을 먼저 측정'], ['📡', '지상 수신', '자료를 지상국으로 전송'], ['🏢', '우주전파센터', '경보 발령 (한국천문연구원)'], ['🛡️', '분야별 대응', '위성·항공·송전망 조치']];
    if (PHONE) {
      const rh = (Fl.h - 44 * FS) / 4;
      steps.forEach((s, i) => { const y = Fl.y + 40 * FS + i * rh; ctx.fillStyle = 'rgba(14,165,233,.09)'; rr(Fl.x + 12, y, Fl.w - 24, rh - 6, 10).fill(); T(Fl.x + 28, y + rh / 2 + 6, s[0], 20, '#000', 'left', 700); T(Fl.x + 62, y + rh / 2 - 2, s[1], 14, '#0c4a6e', 'left', 800); T(Fl.x + 62, y + rh / 2 + 15, s[2], 11.5, '#475569', 'left', 700); if (i < 3) D.arrow(Fl.x + 36, y + rh - 6, Fl.x + 36, y + rh + 1, { color: '#0ea5e9', width: 2, head: 6 }); });
    } else {
      const bw = (Fl.w - 24 - 3 * 30) / 4;
      steps.forEach((s, i) => {
        const x = Fl.x + 12 + i * (bw + 30), y = Fl.y + 42 * FS, h = Fl.h - 42 * FS - 38;
        ctx.fillStyle = 'rgba(14,165,233,.09)'; rr(x, y, bw, h, 12).fill(); ctx.strokeStyle = 'rgba(14,165,233,.5)'; ctx.lineWidth = 1.5; rr(x, y, bw, h, 12).stroke();
        T(x + bw / 2, y + 30, s[0], 24, '#000', 'center', 700); T(x + bw / 2, y + 54, s[1], 14, '#0c4a6e', 'center', 800); drawWrap(x + bw / 2, y + 74, s[2], bw - 16, 12, { color: '#475569', align: 'center' });
        if (i < 3) D.arrow(x + bw + 3, y + h / 2, x + bw + 27, y + h / 2, { color: '#0ea5e9', width: 3, head: 9 });
      });
      const ax = Fl.x + 14, ay = Fl.y + Fl.h - 18;
      T(ax, ay + 4, '경보 단계', 12.5, '#475569', 'left', 800);
      ALERT.forEach((a, i) => D.label(ax + 78 + i * 70, ay, a, { bg: ['#38bdf8', '#facc15', '#fb923c', '#dc2626'][i], size: 12.5, align: 'left', color: i === 1 ? '#422006' : '#fff' }));
    }
    // L1 장면
    panel(Sc.x, Sc.y, Sc.w, Sc.h, { r: 14 });
    T(Sc.x + 14, Sc.y + 24 * FS, '📡 L1 위성이 태양풍을 먼저 만나요 (그림은 축척이 아니에요)', PHONE ? 13 : 14.5, '#1e293b', 'left', 800);
    const sx = Sc.x + 50, l1x = Sc.x + Sc.w * 0.55, ex = Sc.x + Sc.w - 56, my = Sc.y + Sc.h * (PHONE ? 0.3 : 0.36);
    const mm = alMin(W.w);
    if (W.on) { W.t += dt / (RM ? 0.0001 : 0.06); if (W.t >= mm) { W.t = mm; if (!W.done) { W.done = true; Sound.success(); parts.burst(ex - 16, my, { count: 16, speed: 150, colors: ['#22c55e', '#38bdf8'] }); } } }
    const frL1 = clamp(W.t / mm, 0, 1);
    ctx.fillStyle = 'rgba(250,204,21,.25)'; rr(sx, my - 3, ex - sx, 6, 3).fill();
    D.glow(sx, my, 36, '#fde047', 0.7); D.sphere(sx, my, 18, '#fbbf24', { gloss: true, light: '#fff3b0', dark: '#e07b00' });
    D.sphere(ex, my, 13, '#3b82f6', { gloss: true });
    T(sx, my + 38, '태양', 13, '#475569', 'center', 800); T(ex, my + 34, '지구', 13, '#475569', 'center', 800);
    // 지구 쪽으로 가는 구간: l1x → ex (실제 1.5×10⁶ km)
    ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(l1x, my + 22); ctx.lineTo(ex, my + 22); ctx.stroke(); ctx.setLineDash([]);
    T((l1x + ex) / 2, my + 40, '1.5×10⁶ km', 13, '#0369a1', 'center', 800);
    D.sphere(l1x, my, 9, '#e2e8f0', { gloss: true, outline: '#475569', outlineWidth: 2 }); ctx.fillStyle = '#475569'; ctx.fillRect(l1x - 17, my - 3, 8, 6); ctx.fillRect(l1x + 9, my - 3, 8, 6);
    T(l1x, my - 20, 'L1 위성', 13, '#334155', 'center', 800);
    // 태양풍 바람
    if (W.on) {
      const wx = l1x + (ex - 16 - l1x) * frL1;
      for (let i = 0; i < 6; i++) { const x = wx - i * 11; if (x > l1x - 4) { ctx.fillStyle = rgba('#38bdf8', 0.85 - i * 0.12); ctx.beginPath(); ctx.arc(x, my + ((i % 3) - 1) * 6, 3.4, 0, TAU); ctx.fill(); } }
      if (W.alarm > 0 || true) { const blink = (Math.sin(t * 10) > 0) ? 1 : 0.35; D.label(l1x, my - 44, '🚨 경보 발령!', { bg: rgba('#dc2626', blink), size: 12.5 }); }
      if (W.done) D.ring(ex, my, 22, t, { color: '#0ea5e9' });
    }
    // 시계 + 설명
    const ty = Sc.y + Sc.h * (PHONE ? 0.52 : 0.62);
    D.label(Sc.x + Sc.w / 2, ty, W.on ? '경보 후 ' + f1(W.t) + ' 분 경과' + (W.done ? ' · 지구 도착!' : '') : '태양풍 속도 ' + W.w + ' km/s', { bg: W.done ? '#15803d' : '#475569', size: 14 });
    let yy = ty + 30 * FS;
    yy = drawWrap(Sc.x + 14, yy, 'L1은 지구에서 태양 쪽으로 150만 km 떨어진 지점이에요. 태양풍은 L1을 먼저 지나 지구에 도착해요.', Sc.w - 28, 13.5, { color: '#334155' });
    if (W.done || FREE() || W.ok) yy = drawWrap(Sc.x + 14, yy + 22 * FS, '경보 시간 = 1.5×10⁶ km / ' + W.w + ' km/s = ' + sci(L1KM / W.w, 2) + ' s ≈ ' + f1(mm) + '분', Sc.w - 28, 14, { color: '#0369a1', weight: 800 });
    else yy = drawWrap(Sc.x + 14, yy + 22 * FS, '속도를 정하고 경보 시간을 계산한 뒤 🌬 태양풍 보내기로 확인해요.', Sc.w - 28, 13.5, { color: '#b45309', weight: 800 });
    drawWrap(Sc.x + 14, yy + 22 * FS, '비교: 400 km/s → 62분, 800 km/s → 31분, 2000 km/s → 12.5분. 시간이 짧아도 위성을 안전 모드로 바꾸고 송전망 부하를 조정하기에는 충분해요.', Sc.w - 28, 12.5, { color: '#64748b' });
  }
  function moSend() { const W = S.mo; W.on = true; W.t = 0; W.done = false; updateCtl(); }

  /* ---- 분야–피해–대응 표 ---- */
  function LTb() {
    if (PHONE) {
      const bw = 228, bh = 106;
      return { grid: { x: 8, y: 8, w: 464, cols: 2, cardH: 40, gap: 5 }, bins: [{ x: 8, y: 236, w: bw, h: bh }, { x: 244, y: 236, w: bw, h: bh }, { x: 8, y: 348, w: bw, h: bh }, { x: 244, y: 348, w: bw, h: bh }, { x: 8, y: 460, w: 464, h: bh }], F: { x: 8, y: 574, w: 464, h: 278 } };
    }
    const bw = (780 - 4 * 8) / 5;
    return { grid: { x: 10, y: 8, w: 780, cols: 5, cardH: 54, gap: 8 }, bins: [0, 1, 2, 3, 4].map((i) => ({ x: 10 + i * (bw + 8), y: 132, w: bw, h: 150 })), F: { x: 10, y: 290, w: 780, h: 322 } };
  }
  const tbItems = [];
  WHO.forEach((w, i) => { tbItems.push({ label: w.dmg[0], sub: w.dmg[1], icon: '⚠️', bin: i, kind: '피해', open: true, chip: w.dmg[0] }); });
  WHO.forEach((w, i) => { tbItems.push({ label: w.rsp[0], sub: w.rsp[1], icon: '🛡️', bin: i, kind: '대응', open: true, chip: w.rsp[0] }); });
  // 카드 순서를 섞어요 (분야 순서대로 놓이지 않게)
  const TB_ORDER = [3, 7, 0, 9, 5, 1, 8, 4, 6, 2];
  const cT = makeClassifier({
    items: TB_ORDER.map((k) => Object.assign({}, tbItems[k])),
    bins: WHO.map((w) => ({ label: w.ic + ' ' + w.n, color: '#0ea5e9' })),
    chipCols: 1, minRows: 2,
    layout: () => { const L = LTb(); return { grid: L.grid, bins: L.bins }; },
    onPlace(it, b) {
      it.wrong = b !== it.bin;
      if (it.wrong) { say('「' + it.label + '」' + eunNeun(it.label) + ' 그 분야의 ' + it.kind + iGa(it.kind) + ' 아니에요.', true, 3); Sound.fail(); }
      else parts.burst(it.x + it.w / 2, it.y + it.h / 2, { count: 8, speed: 110, colors: ['#0ea5e9', '#fbbf24'] });
    },
    onChange() { updateCtl(); },
  });
  const tbOK = () => cT.items.every((i) => i.loc != null && cT.isRight(i));
  function drawTable(dt, t) {
    const L = LTb(), F = L.F;
    panel(F.x, F.y, F.w, F.h, { r: 14 });
    T(F.x + 14, F.y + 24 * FS, '🌍 우주 기상 재난: 감시 자료 → 경보 → 대응 행동', 14.5, '#1e293b', 'left', 800);
    let yy = F.y + 52 * FS;
    yy = drawWrap(F.x + 14, yy, '큰 태양 폭발이 일어나면 위성(방사선·대기 팽창), 위성 항법(GPS 오차), 극항로 항공(방사선·통신), 송전망(유도 전류), 단파 통신(전리권 교란)에 피해가 생길 수 있어요.', F.w - 28, 13.5, { color: '#334155' });
    yy = drawWrap(F.x + 14, yy + 24 * FS, '우리나라는 한국천문연구원 우주전파센터가 4단계(관심·주의·경계·심각) 경보를 발령해요.', F.w - 28, 13.5, { color: '#334155' });
    if (!PHONE) drawWrap(F.x + 14, yy + 24 * FS, '예: 1989년 3월 퀘벡 정전(약 9시간), 2022년 2월 지자기 폭풍으로 막 발사한 스타링크 위성 다수 추락, 2024년 5월 극심한 폭풍으로 저위도 오로라와 항법 오차.', F.w - 28, 13, { color: '#64748b' });
    const c = cT.counts();
    D.label(F.x + F.w / 2, F.y + F.h - 22, c.placed + ' / 10 장 분류 · 맞게 ' + c.right + '장', { bg: c.right === 10 ? '#15803d' : '#475569', size: 13 });
    cT.draw(dt, {});
  }

  /* =========================================================
     ③ 충돌 위험: 근지구 천체 궤도, 충돌 에너지, DART
     ========================================================= */
  function LIm() {
    return PHONE ? { O: { x: 8, y: 8, w: 464, h: 262 }, E: { x: 8, y: 278, w: 464, h: 250 }, B: { x: 8, y: 536, w: 464, h: 316 } } : { O: { x: 10, y: 8, w: 400, h: 300 }, E: { x: 418, y: 8, w: 372, h: 300 }, B: { x: 10, y: 316, w: 780, h: 296 } };
  }
  const IM = S.im;
  const imD = () => DOPT[IM.di];
  const nm = (D) => (D >= 1000 ? f0(D / 1000) + ' km' : D + ' m');
  function drawImpact(dt, t) {
    const { O, E, B } = LIm(), a = ASTS[IM.neo], q = a.a * (1 - a.e), Q = a.a * (1 + a.e);
    const D_ = imD(), m = astM(D_), v = IM.v, En = astE(D_, v), Mt = En / MT_J;
    IM.ang += dt * TAU / (a.a * Math.sqrt(a.a) * 2.5);
    IM.boom = IM.boomed ? Math.min(1, IM.boom + dt / (RM ? 0.01 : 1.4)) : 0;
    // ---- 궤도 판
    panel(O.x, O.y, O.w, O.h, { r: 14 });
    T(O.x + 14, O.y + 24 * FS, '🔭 ' + a.n + '의 궤도', 14.5, '#1e293b', 'left', 800);
    const ocx = O.x + O.w / 2, ocy = O.y + O.h / 2 + 4, R0 = Math.min(O.w / 2, O.h / 2 - 30 * FS) - 10, sc = R0 / Math.max(Q, 1.4);
    ctx.save(); rr(O.x + 6, O.y + 38 * FS, O.w - 12, O.h - 44 * FS, 10); ctx.clip();
    ctx.fillStyle = '#0f172a'; ctx.fillRect(O.x, O.y, O.w, O.h);
    ctx.strokeStyle = 'rgba(96,165,250,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ocx, ocy, sc, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(250,204,21,.7)'; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(ocx, ocy, 1.3 * sc, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = rgba(a.c, 0.95); ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i <= 160; i++) { const E_ = i / 160 * TAU, x = ocx + a.a * (Math.cos(E_) - a.e) * sc, y = ocy - a.a * Math.sqrt(1 - a.e * a.e) * Math.sin(E_) * sc; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    const Ea = kepE(normA(IM.ang), a.e); D.sphere(ocx + a.a * (Math.cos(Ea) - a.e) * sc, ocy - a.a * Math.sqrt(1 - a.e * a.e) * Math.sin(Ea) * sc, 6, a.c, { gloss: true });
    D.sphere(ocx + Math.cos(IM.ang * Math.pow(a.a, 1.5)) * sc, ocy - Math.sin(IM.ang * Math.pow(a.a, 1.5)) * sc, 5, '#3b82f6', { gloss: true });
    sunDraw(ocx, ocy, 8);
    outlineT(ocx + sc * 0.02, ocy + sc + 16, '지구 궤도 1 AU', PHONE ? 10.5 : 11.5, '#93c5fd', 'center');
    outlineT(ocx, ocy - 1.3 * sc - 6, 'NEO 경계 q = 1.3 AU', PHONE ? 10.5 : 11.5, '#fde68a', 'center');
    ctx.restore();
    const info = ['a = ' + f2(a.a) + ' AU, e = ' + f2(a.e), 'q = a(1 − e) = ' + f2(q) + ' AU', 'Q = a(1 + e) = ' + f2(Q) + ' AU'];
    info.forEach((s, i) => outlineT(O.x + 14, O.y + 58 * FS + i * 17 * FS, s, 12, '#e2e8f0', 'left'));
    const neo = q <= 1.3, cross = q < 1 && Q > 1;
    D.label(O.x + O.w - 16, O.y + O.h - 52 * Math.min(FS, 1.1), neo ? 'NEO (q ≤ 1.3 AU)' : '근지구 천체 아님', { bg: neo ? '#15803d' : '#64748b', size: 12.5, align: 'right' });
    D.label(O.x + O.w - 16, O.y + O.h - 24 * Math.min(FS, 1.1), cross ? '지구 궤도와 교차' : '지구 궤도와 교차하지 않음', { bg: cross ? '#dc2626' : '#475569', size: 12.5, align: 'right' });
    // ---- 에너지 판
    panel(E.x, E.y, E.w, E.h, { r: 14 });
    T(E.x + 14, E.y + 24 * FS, '💥 충돌 에너지  E = ½mv²', 14.5, '#1e293b', 'left', 800);
    const ry = E.y + 52 * FS, lh = (PHONE ? 23 : 27) * FS, vx = E.x + E.w - 14;
    const rows = [['지름 D', nm(D_)], ['밀도 ρ', '3000 kg/m³'], ['질량 m = ρ × π/6 × D³', sci(m, 2) + ' kg'], ['충돌 속력 v', v + ' km/s']];
    rows.forEach((r, i) => { T(E.x + 14, ry + i * lh, r[0], 13.5, '#475569', 'left', 800); T(vx, ry + i * lh, r[1], 13.5, '#1e293b', 'right', 800); });
    const show = IM.boomed || FREE();
    const k = SciSim.ease.outCubic(IM.boom);
    ctx.fillStyle = show ? 'rgba(220,38,38,.09)' : 'rgba(100,116,139,.07)'; rr(E.x + 8, ry + 4 * lh - 18 * FS, E.w - 16, 30 * FS, 8).fill();
    T(E.x + 14, ry + 4 * lh, '에너지 E', 14, '#1e293b', 'left', 800);
    T(vx, ry + 4 * lh, show ? sci(En, 2) + ' J' : '?', 14, show ? '#b91c1c' : '#94a3b8', 'right', 800);
    if (show) {
      T(vx, ry + 5 * lh, '= ' + (Mt >= 100 ? sci(Mt, 2) : Mt >= 10 ? f0(Mt) : f2(Mt)) + ' Mt TNT', 14, '#b91c1c', 'right', 800);
      const hx = Mt / HIRO_MT;
      T(vx, ry + 6 * lh, '히로시마 원폭(15 kt)의 약 ' + (hx >= 1e4 ? sci(hx, 1) : comma(hx)) + '배', 12.5, '#475569', 'right', 800);
    } else drawWrap(E.x + 14, ry + 5 * lh - 4, '직접 계산한 뒤 💥 충돌시키기로 확인해요.', E.w - 28, 13, { color: '#b45309', weight: 800 });
    // 작은 충돌 그림
    const gy = E.y + E.h - 14;
    if (!PHONE) {
    if (k > 0 || show) { const cx = E.x + E.w / 2, rad = 6 + 22 * k; if (!RM) D.glow(cx, gy - 6, rad * 2.2, '#fb923c', 0.65 * (1 - k * 0.5)); }
    ctx.fillStyle = '#4b5563'; ctx.beginPath(); ctx.ellipse(E.x + E.w / 2, gy + 2, 70, 6, 0, 0, TAU); ctx.fill();
    const ax = lerp(E.x + E.w - 70, E.x + E.w / 2, IM.boomed ? clamp(IM.boom * 3, 0, 1) : 0), ay = lerp(gy - 60, gy - 8, IM.boomed ? clamp(IM.boom * 3, 0, 1) : 0);
    if (IM.boom < 0.33) D.sphere(ax, ay, 5 + Math.min(10, Math.log10(D_) * 2), '#a8a29e', { gloss: true, shadow: true });
    }
    // ---- 아래 판: 충돌 간격 + 에너지 눈금
    panel(B.x, B.y, B.w, B.h, { r: 14 });
    T(B.x + 14, B.y + 24 * FS, '📊 지름이 10배 → 질량 1000배 → 에너지 1000배', 14, '#1e293b', 'left', 800);
    const half = PHONE ? B.w - 28 : (B.w - 40) / 2;
    // 표
    const tx = B.x + 14, ty = B.y + 50 * FS, rh = PHONE ? 28 : 34;
    T(tx, ty, '지름', 12.5, '#64748b', 'left', 800); T(tx + half, ty, '평균 충돌 간격', 12.5, '#64748b', 'right', 800);
    INTERVAL.forEach((r, i) => {
      const y = ty + 10 + i * rh, on = Math.abs(Math.log10(r[0] / D_)) < 0.15;
      ctx.fillStyle = on ? 'rgba(14,165,233,.14)' : 'rgba(100,116,139,.06)'; rr(tx - 4, y, half + 8, rh - 5, 8).fill();
      T(tx + 6, y + rh / 2 + 3, r[1], 13.5, '#1e293b', 'left', 800); T(tx + half - 6, y + rh / 2 + 3, r[2], 13.5, '#0369a1', 'right', 800);
    });
    // 로그 에너지 눈금
    const gx = PHONE ? B.x + 24 : B.x + 14 + half + 40, gw = PHONE ? B.w - 56 : half - 40 - 14, gyy = PHONE ? B.y + B.h - 46 : B.y + B.h - 70;
    const GX = (mt) => gx + clamp((Math.log10(mt) + 2) / 10, 0, 1) * gw;
    T(gx, (PHONE ? ty + 10 + 4 * rh + 18 : ty), '충돌 에너지 (Mt TNT, 로그 눈금)', 12.5, '#64748b', 'left', 800);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx, gyy); ctx.lineTo(gx + gw, gyy); ctx.stroke();
    for (let e = -2; e <= 8; e += 2) { const x = GX(Math.pow(10, e)); ctx.beginPath(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.moveTo(x, gyy - 5); ctx.lineTo(x, gyy + 5); ctx.stroke(); T(x, gyy + 22, e === 0 ? '1' : '10' + sup(e), 12, '#64748b', 'center', 700); }
    [[HIRO_MT, '히로시마 15 kt', 44, 'left'], [0.5, '첼랴빈스크', -40, 'left'], [astE(10000, 20) / MT_J, '10 km급 충돌', -16, 'right']].forEach(([mt, lab, dy, al]) => { const x = GX(mt); D.sphere(x, gyy, 5, '#94a3b8', { gloss: false }); T(x + (al === 'left' ? -4 : 4), gyy + dy, lab, PHONE ? 11 : 12, '#475569', al, 800); });
    if (show) { const x = GX(Mt); D.shadow(() => D.sphere(x, gyy, 9, '#dc2626', { gloss: true }), { blur: 6, y: 2 }); D.label(clamp(x, gx + 50, gx + gw - 50), gyy - 18, 'D ' + nm(D_) + ': ' + (Mt >= 100 ? sci(Mt, 1) : Mt >= 10 ? f0(Mt) : f2(Mt)) + ' Mt', { bg: '#dc2626', size: 12 }); }
  }
  const normA = (a) => { a = a % TAU; return a < 0 ? a + TAU : a; };
  function imBoom() { IM.boomed = true; IM.boom = 0; Sound.success(); const E = LIm().E; parts.burst(E.x + E.w / 2, E.y + E.h - 20, { count: 22, speed: 180, colors: ['#fb923c', '#fbbf24', '#ef4444'] }); updateCtl(); }

  /* ---- DART ---- */
  function LDa() { return PHONE ? { A: { x: 8, y: 8, w: 464, h: 320 }, B: { x: 8, y: 336, w: 464, h: 516 } } : { A: { x: 10, y: 8, w: 780, h: 330 }, B: { x: 10, y: 346, w: 780, h: 266 } }; }
  const DA = S.da;
  const daDs = () => dsKm(DA.dv, DA.ty);
  function drawDart(dt, t) {
    const { A, B } = LDa(), ds = daDs();
    DA.ds = approach(DA.ds, DA.shot && DA.dart >= 1 ? ds : 0, dt, 5);
    if (DA.shot && DA.dart < 1) DA.dart = Math.min(1, DA.dart + dt / (RM ? 0.01 : 1.6));
    DA.hit = DA.dart >= 1 && DA.shot ? Math.min(1, DA.hit + dt / 0.8) : 0;
    panel(A.x, A.y, A.w, A.h, { r: 14 });
    T(A.x + 14, A.y + 24 * FS, '🎯 지구에 도착하는 위치의 어긋남 Δs', 14.5, '#1e293b', 'left', 800);
    const x0 = A.x + (PHONE ? 60 : 110), sc = (A.w - (PHONE ? 90 : 160) - (x0 - A.x)) / 45000, cy = A.y + A.h * 0.5 + 10, RE = RE_KM * sc;
    // 눈금
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, cy + RE + 22); ctx.lineTo(x0 + 45000 * sc, cy + RE + 22); ctx.stroke();
    for (let k = 0; k <= 45000; k += 10000) { const x = x0 + k * sc; ctx.beginPath(); ctx.moveTo(x, cy + RE + 17); ctx.lineTo(x, cy + RE + 27); ctx.stroke(); if (!PHONE || k % 20000 === 0) T(x, cy + RE + 44, k === 0 ? '0' : comma(k) + ' km', 11.5, '#64748b', 'center', 700); }
    // 지구
    D.shadow(() => D.sphere(x0, cy, RE, '#3b82f6', { gloss: true }), { blur: 8, y: 3 });
    T(x0 - RE * 0.55, cy + RE * 0.62, '지구', 13, '#fff', 'center', 800);
    D.dashedLine(x0 + RE, cy - RE - 14, x0 + RE, cy + RE + 22, { color: '#16a34a', width: 2, dash: [5, 4] });
    D.label(x0 + RE, cy - RE - 24, '지구 반지름 6,371 km', { bg: '#16a34a', size: 12 });
    // 어긋남 막대
    const bx = x0 + DA.ds * sc, bxg = x0 + ds * sc;
    ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(bxg, cy); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(bxg, cy, 6, 'rgba(245,158,11,.4)', { gloss: false, outline: '#f59e0b', outlineWidth: 2 }); if (!DA.shot) T(bxg, cy + 24, '예상 도착 위치', 11.5, '#b45309', 'center', 800, { stroke: 'rgba(255,255,255,.92)', strokeWidth: 4 });
    const miss = ds >= RE_KM;
    // 소행성
    const ax = x0 + DA.ds * sc;
    if (DA.ds > 1) D.arrow(x0, cy + 34, ax, cy + 34, { color: miss ? '#16a34a' : '#f59e0b', width: 4, head: 11 });
    D.sphere(ax, cy, 10, '#a8a29e', { gloss: true, shadow: true });
    T(ax, cy - 18, '소행성', 12.5, '#334155', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
    // DART
    if (DA.shot && DA.dart < 1) { const k = SciSim.ease.inOutQuad(DA.dart), sx = A.x + 30, sy = A.y + A.h - 40, dx = lerp(sx, x0, k), dy = lerp(sy, cy, k); D.glow(dx, dy, 18, '#38bdf8', 0.6); D.sphere(dx, dy, 6, '#e2e8f0', { gloss: true }); T(dx + 10, dy - 8, 'DART', 11.5, '#0369a1', 'left', 800); }
    if (DA.hit > 0 && DA.hit < 1) { D.glow(x0, cy, 30 + 50 * DA.hit, '#fbbf24', 0.8 * (1 - DA.hit)); }
    D.label(A.x + A.w / 2, A.y + A.h - 22, 'Δs ≈ 3 × Δv × t = ' + (ds >= 1000 ? comma(ds) : f0(ds)) + ' km' + (miss ? '  ✅ 지구 반지름보다 커요 (빗나감)' : '  (지구 반지름 6,371 km보다 작아요)'), { bg: miss ? '#15803d' : '#475569', size: PHONE ? 12 : 13.5 });
    // 설명 판
    panel(B.x, B.y, B.w, B.h, { r: 14 });
    T(B.x + 14, B.y + 24 * FS, '🛰️ 속도를 조금만 바꿔도 시간이 지나면 크게 어긋나요', 14, '#1e293b', 'left', 800);
    let yy = B.y + 50 * FS;
    yy = drawWrap(B.x + 14, yy, '궤도 진행 방향으로 속도를 Δv만큼 바꾸면 공전 주기가 달라져요(케플러 제3법칙). 시간이 지날수록 소행성의 위치가 쌓여서 어긋나요: Δs ≈ 3 Δv t.', B.w - 28, 13.5, { color: '#334155' });
    yy = drawWrap(B.x + 14, yy + 24 * FS, '지금 설정: Δv = ' + f1(DA.dv) + ' cm/s, t = ' + (DA.ty % 1 ? f1(DA.ty) : f0(DA.ty)) + '년 → Δs = 3 × ' + f2(DA.dv / 100) + ' m/s × ' + sci(DA.ty * YR_S, 2) + ' s = ' + comma(ds) + ' km', B.w - 28, 13.5, { color: '#0369a1', weight: 800 });
    yy = drawWrap(B.x + 14, yy + 24 * FS, '실제 DART(2022): 질량 570 kg의 탐사선이 6.1 km/s로 디모르포스(지름 160 m)에 충돌해 공전 주기를 11시간 55분에서 11시간 23분으로 32분 줄였어요.', B.w - 28, 13.5, { color: '#334155' });
    drawWrap(B.x + 14, yy + 24 * FS, '그래서 위험을 미리 알수록(t가 클수록) 아주 작은 Δv로도 지구를 비켜 가게 할 수 있어요. 감시가 중요한 까닭이에요.', B.w - 28, 13.5, { color: '#b45309', weight: 800 });
  }
  function daShoot() { DA.shot = true; DA.dart = 0; DA.hit = 0; Sound.click(); updateCtl(); }
  function daReset() { DA.shot = false; DA.dart = 0; DA.hit = 0; DA.ds = 0; updateCtl(); }

  /* =========================================================
     ④ 우주 쓰레기: 에너지, 연쇄 충돌(케슬러 증후군), 재진입 시간
     ========================================================= */
  function LDb() {
    return PHONE ? { Sc: { x: 8, y: 8, w: 464, h: 340 }, En: { x: 8, y: 356, w: 464, h: 210 }, Re: { x: 8, y: 574, w: 464, h: 278 } } : { Sc: { x: 10, y: 8, w: 500, h: 420 }, En: { x: 518, y: 8, w: 272, h: 420 }, Re: { x: 10, y: 436, w: 780, h: 176 } };
  }
  const DB_ = S.db, RP = 0.034;                                // 궤도 각속도 상수
  const dbR0 = () => (PHONE ? 42 : 52);                         // 지구 반지름(px)
  const dbN0 = () => (PHONE ? 12 : 14), dbSp = () => (PHONE ? 6.6 : 7.4), dbOuter = () => dbR0() * 1.3 + (dbN0() - 1) * dbSp();
  function dbInit() {
    const r = rng(2024), R0 = dbR0(), objs = [];
    // 서로 반지름이 충분히 달라 처음에는 부딪히지 않아요
    for (let i = 0; i < dbN0(); i++) objs.push({ r: R0 * 1.3 + i * dbSp(), a: r() * TAU, dir: (i % 3 === 0 ? -1 : 1), sat: false, s: 2 + (i % 3 === 0 ? 0.6 : 0), life: 0 });
    objs.push({ r: R0 * 1.3 - 12, a: 0.4, dir: 1, sat: true, s: 5, life: 0 }, { r: dbOuter() + 14, a: 3.4, dir: -1, sat: true, s: 5, life: 0 });
    DB_.objs = objs; DB_.frag = 0; DB_.hits = 0; DB_.flash = 0;
  }
  function dbCrash() {
    // 위성과 마주 오는 파편이 같은 반지름에서 정면으로 만나요
    const a0 = Math.random() * TAU, rr0 = dbOuter() + 28;
    DB_.objs.push({ r: rr0, a: a0, dir: 1, sat: true, s: 5, life: 0, fresh: 2 }, { r: rr0, a: a0 + 0.55, dir: -1, sat: false, s: 3, life: 0, fresh: 2 });
    updateCtl();
  }
  function dbFrag(o1, o2) {
    const n = 11 + Math.floor(Math.random() * 5), R0 = dbR0();
    DB_.hits++; DB_.flash = 1;
    const x = (o1.r * Math.cos(o1.a) + o2.r * Math.cos(o2.a)) / 2, y = (o1.r * Math.sin(o1.a) + o2.r * Math.sin(o2.a)) / 2, rr_ = Math.hypot(x, y), aa = Math.atan2(y, x);
    DB_.objs = DB_.objs.filter((o) => o !== o1 && o !== o2);
    for (let i = 0; i < n && DB_.objs.length < 240; i++) DB_.objs.push({ r: clamp(rr_ + (Math.random() - 0.5) * 24, R0 * 1.15, dbOuter() + 40), a: aa + (Math.random() - 0.5) * 0.3, dir: Math.random() < 0.65 ? 1 : -1, sat: false, s: 2, life: 0, fresh: 0.8 });
    const L = LDb(); parts.burst(L.Sc.x + L.Sc.w / 2 + x, L.Sc.y + L.Sc.h / 2 + 6 + y, { count: 12, speed: 110, colors: ['#fb923c', '#fbbf24', '#fff'], gravity: 0 });
    Sound.tick();
  }
  const dbN = () => DB_.objs.length;
  let dbInited = false;
  function dbStep(dt) {
    const O = DB_.objs, n = O.length;
    for (let i = 0; i < n; i++) { const o = O[i]; o.a -= o.dir * RP * Math.pow(dbR0() * 1.3 / o.r, 1.5) * dt * 6; /* dir = +1: 위에서 볼 때 시계 반대 방향(지구 자전과 같은 방향) */ o.life += dt; if (o.fresh > 0) o.fresh -= dt; }
    if (n >= 236) return;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const p = O[i], q = O[j]; if (p.dir === q.dir) continue;
      if (Math.abs(p.r - q.r) > p.s + q.s) continue;
      const dx = p.r * Math.cos(p.a) - q.r * Math.cos(q.a), dy = p.r * Math.sin(p.a) - q.r * Math.sin(q.a);
      if (dx * dx + dy * dy < (p.s + q.s + 1.5) * (p.s + q.s + 1.5)) { dbFrag(p, q); return; }
    }
  }
  function drawDebris(dt, t) {
    const { Sc, En, Re } = LDb(), R0 = dbR0();
    if (!dbInited) { dbInit(); dbInited = true; }
    if (!RM) dbStep(dt); DB_.flash = Math.max(0, DB_.flash - dt * 2);
    // 장면
    D.shadow(() => { ctx.fillStyle = '#0b1230'; rr(Sc.x, Sc.y, Sc.w, Sc.h, 14).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(Sc.x, Sc.y, Sc.w, Sc.h, 14); ctx.clip(); spaceBg(Sc.x, Sc.y, Sc.w, Sc.h, t, '#0b1230', '#16224a'); ctx.fillStyle = 'rgba(8,14,40,.55)'; ctx.fillRect(Sc.x, Sc.y, Sc.w, Sc.h);
    const cx = Sc.x + Sc.w / 2, cy = Sc.y + Sc.h / 2 + 6;
    D.glow(cx, cy, R0 * 1.8, '#38bdf8', 0.25); D.sphere(cx, cy, R0, '#2563eb', { gloss: true, light: '#7dd3fc', dark: '#1e3a8a' });
    ctx.fillStyle = 'rgba(34,197,94,.65)'; ctx.beginPath(); ctx.ellipse(cx - R0 * 0.3, cy - R0 * 0.2, R0 * 0.35, R0 * 0.22, 0.4, 0, TAU); ctx.ellipse(cx + R0 * 0.35, cy + R0 * 0.25, R0 * 0.28, R0 * 0.18, -0.3, 0, TAU); ctx.fill();
    DB_.objs.forEach((o) => {
      const x = cx + o.r * Math.cos(o.a), y = cy + o.r * Math.sin(o.a);
      if (o.sat) { D.sphere(x, y, 5.5, '#e2e8f0', { gloss: true, outline: '#38bdf8', outlineWidth: 1.5 }); ctx.fillStyle = '#38bdf8'; ctx.fillRect(x - 11, y - 1.5, 5, 3); ctx.fillRect(x + 6, y - 1.5, 5, 3); }
      else { ctx.fillStyle = o.fresh > 0 ? '#fbbf24' : '#e2e8f0'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, o.s + 1.2, 0, TAU); ctx.fill(); ctx.stroke(); }
    });
    ctx.restore();
    outlineT(Sc.x + 14, Sc.y + 24 * FS, PHONE ? '🌍 위성과 파편' : '🌍 저궤도의 위성(파랑)과 파편(흰 점)', 13.5, '#e2e8f0', 'left');
    const nfr = DB_.objs.filter((o) => !o.sat).length;
    D.label(Sc.x + Sc.w - 14, Sc.y + 26 * Math.min(FS, 1.1), '파편 ' + nfr + '개 · 충돌 ' + DB_.hits + '번', { bg: nfr > 60 ? '#dc2626' : '#475569', size: 13, align: 'right' });
    if (DB_.hits >= 4) D.label(Sc.x + Sc.w / 2, Sc.y + Sc.h - 18, '충돌 → 파편 → 또 충돌: 케슬러 증후군', { bg: '#b91c1c', size: 12.5 });
    // 에너지 판
    panel(En.x, En.y, En.w, En.h, { r: 14 });
    T(En.x + 14, En.y + 24 * FS, '💥 파편 충돌 에너지', 14.5, '#1e293b', 'left', 800);
    const cm = DB_.sz === 0 ? 1 : 10, m = dbM(cm), v = DB_.rel, E_ = dbE(cm, v), ry = En.y + 52 * FS, lh = (PHONE ? 25 : 30) * FS, vx = En.x + En.w - 14;
    [['지름', cm + ' cm'], ['질량 m', f2(m * (cm === 1 ? 1000 : 1)) + (cm === 1 ? ' g' : ' kg')], ['상대 속력 v', v + ' km/s']].forEach((r, i) => { T(En.x + 14, ry + i * lh, r[0], 13.5, '#475569', 'left', 800); T(vx, ry + i * lh, r[1], 13.5, '#1e293b', 'right', 800); });
    const show = DB_.eOk || FREE();
    ctx.fillStyle = show ? 'rgba(220,38,38,.09)' : 'rgba(100,116,139,.07)'; rr(En.x + 8, ry + 3 * lh - 18 * FS, En.w - 16, 28 * FS, 8).fill();
    T(En.x + 14, ry + 3 * lh, 'E = ½mv²', 14, '#1e293b', 'left', 800); T(vx, ry + 3 * lh, show ? sci(E_, 2) + ' J' : '?', 14, show ? '#b91c1c' : '#94a3b8', 'right', 800);
    if (show) {
      const car = E_ / CAR_J;
      yyW(En, ry + 4 * lh + 4, '시속 100 km 승용차(5.8×10⁵ J)의 ' + (car >= 10 ? '약 ' + f0(car) + '배' : car >= 1 ? '약 ' + f1(car) + '배' : '약 1/' + f0(1 / car)));
    } else yyW(En, ry + 4 * lh + 4, '직접 계산해 입력하면 승용차와 비교해 줘요.');
    // 재진입 판
    panel(Re.x, Re.y, Re.w, Re.h, { r: 14 });
    T(Re.x + 14, Re.y + 24 * FS, '⏳ 파편이 대기권에 재진입해 사라지는 데 걸리는 시간 (로그 눈금)', PHONE ? 12.5 : 14, '#1e293b', 'left', 800);
    const lx = Re.x + 14, lw = PHONE ? 96 : 118, gx = lx + lw, gw = Re.w - 28 - lw - 6, ty = Re.y + 46 * FS, rh = (Re.h - 46 * FS - 34) / 3;
    const GX = (yr) => gx + clamp((Math.log10(yr) + 1) / 4, 0, 1) * gw;
    REENTRY.forEach((r, i) => {
      const y = ty + i * rh, h = Math.min(rh * 0.6, 22), x0 = GX(r[1]), x1 = GX(r[2]);
      T(lx, y + h * 0.5 + 5, r[0], PHONE ? 12 : 13.5, '#334155', 'left', 800);
      ctx.fillStyle = 'rgba(100,116,139,.12)'; rr(gx, y, gw, h, h / 2).fill();
      const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, '#38bdf8'); g.addColorStop(1, i === 0 ? '#22c55e' : i === 1 ? '#f59e0b' : '#dc2626'); ctx.fillStyle = g; rr(x0, y, Math.max(1, x1 - x0), h, h / 2).fill();
      T((x0 + x1) / 2, y + h + 12, r[3], 11.5, '#475569', 'center', 800);
    });
    const ay = Re.y + Re.h - 14;
    [[0.1, '0.1년'], [1, '1년'], [10, '10년'], [100, '100년'], [1000, '1000년']].forEach(([yr, l]) => { const x = GX(yr); D.dashedLine(x, ty - 2, x, ay - 12, { color: 'rgba(100,116,139,.35)', width: 1, dash: [3, 4] }); T(x, ay, l, 11.5, '#64748b', 'center', 700); });
  }
  function yyW(En, y, text) { drawWrap(En.x + 14, y, text, En.w - 28, 13, { color: '#0369a1', weight: 800 }); }

  /* =========================================================
     컨트롤 · 입력 · 장면 전환
     ========================================================= */
  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); }
    updateCtl();
  }
  const grpRule = $('#grpRule');
  RULES.forEach((r, i) => { const e = document.createElement('button'); e.type = 'button'; e.className = 'opt'; e.dataset.k = i; e.style.textAlign = 'left'; e.style.padding = '6px 10px'; e.textContent = r.t; grpRule.appendChild(e); });
  grpRule.style.gridTemplateColumns = '1fr';
  const flOK = () => S.fl.v === 1000 && near(numOf('inT'), cmeT(1000), 2);
  const moOK = () => S.mo.w === 800 && near(numOf('inAl'), alMin(800), 1.5);
  const imOK = () => IM.di === 2 && IM.v === 20 && numOf('inE') != null && numOf('inE') >= 165 && numOf('inE') <= 250;
  const daOK = () => daDs() >= RE_KM && DA.shot && DA.hit >= 1;
  const dbOK = () => DB_.sz === 0 && DB_.rel === 10 && near(numOf('inJ'), dbE(1, 10) / 1e4, 0.7);
  const ruleOKf = () => RULES.every((r, i) => r.ok === DB_.rules[i]);
  function updateCtl() {
    const free = FREE();
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcT').hidden = !(S.view === 'flare' && (S.flags.calcT || free));
    $('#calcAl').hidden = !(S.view === 'monitor' && (S.flags.calcAl || free));
    $('#calcE').hidden = !(S.view === 'impact' && (S.flags.calcE || free));
    $('#calcJ').hidden = !(S.view === 'debris' && (S.flags.calcJ || free));
    $('#ruleBox').hidden = !(S.view === 'debris' && (S.flags.rule || free));
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#grpD .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === IM.di));
    $$('#grpNeo .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === IM.neo));
    $$('#grpSz .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === DB_.sz));
    $$('#grpRule .opt').forEach((b) => b.classList.toggle('on', DB_.rules[+b.dataset.k]));
    $('#bShoot').disabled = DA.shot && DA.hit < 1;
  }
  const sl = (id, oid, fmt, cb) => bindSlider($(id), $(oid), fmt, cb);
  sl('#sV', '#oV', (v) => v + ' km/s', (v) => { S.fl.v = v; S.fl.cme.on = false; S.fl.cme.done = false; });
  sl('#sW', '#oW', (v) => v + ' km/s', (v) => { S.mo.w = v; S.mo.on = false; S.mo.done = false; });
  sl('#sVi', '#oVi', (v) => v + ' km/s', (v) => { IM.v = v; IM.boomed = false; });
  sl('#sDv', '#oDv', (v) => f1(v) + ' cm/s', (v) => { DA.dv = v; if (DA.shot) daReset(); });      // 값을 바꾸면 다시 발사해야 해요
  sl('#sTy', '#oTy', (v) => (v % 1 ? f1(v) : f0(v)) + ' 년', (v) => { DA.ty = v; if (DA.shot) daReset(); });
  sl('#sRel', '#oRel', (v) => v + ' km/s', (v) => { DB_.rel = v; });
  modeBtns.forEach((b) => clickable(b, () => setView(b.dataset.view)));
  clickable($('#bLaunch'), flLaunch);
  clickable($('#bWind'), moSend);
  $$('#grpD .opt').forEach((b) => clickable(b, () => { IM.di = +b.dataset.k; IM.boomed = false; updateCtl(); }));
  $$('#grpNeo .opt').forEach((b) => clickable(b, () => { IM.neo = +b.dataset.k; updateCtl(); }));
  clickable($('#bBoom'), imBoom);
  clickable($('#bShoot'), daShoot);
  clickable($('#bDartReset'), daReset);
  $$('#grpSz .opt').forEach((b) => clickable(b, () => { DB_.sz = +b.dataset.k; updateCtl(); }));
  clickable($('#bCrash'), dbCrash);
  clickable($('#bDebReset'), () => { dbInit(); parts.clear(); updateCtl(); });
  $$('#grpRule .opt').forEach((b) => clickable(b, () => { const i = +b.dataset.k; DB_.rules[i] = !DB_.rules[i]; updateCtl(); }));
  $('#inT').addEventListener('input', () => { S.fl.ok = flOK(); if (S.fl.ok) fbIn('inT', true); });
  $('#inAl').addEventListener('input', () => { S.mo.ok = moOK(); if (S.mo.ok) fbIn('inAl', true); });
  $('#inE').addEventListener('input', () => { IM.eOk = imOK(); if (IM.eOk) fbIn('inE', true); });
  $('#inJ').addEventListener('input', () => { DB_.eOk = dbOK(); if (DB_.eOk) fbIn('inJ', true); });

  SciSim.pointer(view, {
    down(p) {
      switch (S.view) {
        case 'flare': return flDown(p);
        case 'table': { const r = cT.down(p); updateCtl(); return r; }
        default: return false;
      }
    },
    move(p) { if (S.view === 'flare') flMove(p); else if (S.view === 'table') cT.move(p); },
    up(p) { if (S.view === 'table') { cT.up(p); updateCtl(); } },
    hover(p) {
      if (S.view === 'table') return cT.hit(p) ? 'pointer' : '';
      if (S.view === 'flare') { const g = fcGeom(); return p.x > g.ix && p.x < g.ix + g.iw && p.y < g.C.y + g.C.h ? 'ew-resize' : ''; }
      return '';
    },
  });

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '우주 기상: 태양 폭발이 오기까지', short: '우주 기상', icon: '☀️', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 지구를 위협하는 우주의 위험은 얼마나 미리 알 수 있고, 얼마나 막을 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교·통합과학에서</b> 태양 활동(흑점·플레어·코로나 질량 방출)을 배웠고, <b>앞 차시</b>에서 케플러 법칙과 소천체를 배웠어요. 이번에는 태양 표면의 모습보다 <b>우주 환경이 바뀔 때 얼마나 미리 예측할 수 있는지</b>에 초점을 맞춰요.</div>' +
        '<p>태양 X선 그래프에서 <b>플레어 등급</b>을 읽고, 함께 날아오는 <b>CME가 지구까지 가는 시간 t = d / v</b>를 계산해 봐요.</p>',
      features: ['flare'],
      setup() { setView('flare'); },
      recap: '플레어의 빛은 약 8분, CME는 하루 이상 걸려요. 그 사이 시간이 우주 기상 예보와 대비를 가능하게 해요.',
      summary: '<ul><li><b>플레어 등급</b>(GOES X선 0.1~0.8 nm, W/m²): A < 10⁻⁷, B 10⁻⁷, C 10⁻⁶, M 10⁻⁵, X ≥ 10⁻⁴. 한 단계 오를 때마다 <b>10배</b>(X는 C의 100배).</li><li><b>CME 도달 시간 t = d / v</b>, d = 1.5×10⁸ km: 500 km/s → 83시간, 1000 km/s → 42시간, 2000 km/s → 21시간, 3000 km/s → 14시간. 태양풍(400 km/s)은 약 104시간.</li><li>플레어의 빛(약 8분)이 먼저 오고 입자는 하루 이상 뒤에 도착하므로 <b>예보와 대비가 가능</b>해요.</li><li>피해 사례: 1989년 퀘벡 정전, 2022년 스타링크 위성 추락, 2024년 5월 극심한 지자기 폭풍.</li></ul>',
      missions: [
        {
          title: 'CME 도달 시간 계산하기',
          goal: 'CME 속도를 <b>1000 km/s</b>로 맞추고, 태양에서 지구까지(1.5×10⁸ km) 가는 데 걸리는 <b>시간</b>을 계산해 입력하세요.',
          hint: 't = d / v = 1.5×10⁸ km / 1000 km/s = 1.5×10⁵ s예요. 3600초가 1시간이니 약 42시간이에요. 🚀 CME 보내기로 확인해도 돼요.',
          setup() { S.fl.v = 1000; $('#sV').value = 1000; $('#sV').dispatchEvent(new Event('input')); S.flags.calcT = true; S.fl.ok = false; clrIn('inT'); S.fl.cme.on = false; S.fl.cme.done = false; setView('flare'); },
          check: () => flOK(),
          hold: 0.5,
          status: () => mark(S.fl.v === 1000) + ' 속도 1000 km/s &nbsp; ' + mark(flOK()) + ' 도달 시간 ' + ($('#inT').value.trim() || '—') + ' 시간',
          explain: 't = d / v = 1.5×10⁸ km / 1000 km/s = 1.5×10⁵ s ≈ <b>42시간</b>(약 1.7일)이에요. 속도가 2배가 되면 시간은 절반이 돼요.',
        },
        {
          type: 'quiz', title: '우주 기상 예보가 가능한 까닭',
          goal: '태양에서 큰 폭발이 일어나도 지구는 <b>미리 대비할 수 있는 시간</b>이 있어요. 그 까닭은?',
          setup() { setView('flare'); },
          choices: ['플레어의 빛은 약 8분, CME 입자는 하루 이상 뒤에 도착해서 그 사이에 경보와 대비를 할 수 있어요', '태양 폭발의 영향은 순간 도달하므로 대비할 필요가 없어요', 'CME는 빛과 같은 속력으로 날아와서 항상 8분 뒤에 도착해요', '태양 폭발은 반드시 지구 반대 방향으로만 일어나요'],
          answer: 0,
          feedback: ['', '입자(CME)는 빛보다 훨씬 느려서 하루 이상 걸려요. 그래서 예측과 대비가 의미가 있어요. 빛(X선) 자체는 8분이에요.', 'CME 속도는 400~3000 km/s로 빛(30만 km/s)의 천분의 1 정도예요.', '폭발은 모든 방향에서 일어나고, 지구 쪽으로 향한 CME만 지구에 영향을 줘요.'],
          explain: '플레어의 빛은 약 <b>8분</b>이면 오지만, CME는 속도 400~3000 km/s라서 <b>14시간~4일</b> 걸려요. 이 시간 동안 위성·항공·송전망이 대비할 수 있어요.',
        },
      ],
    },
    {
      title: '감시와 대응: L1 위성의 경보', short: '감시와 대응', icon: '📡', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> CME가 도착하기까지 하루 이상이 걸린다는 것을 알았어요. 하지만 CME가 <b>지구 바로 앞</b>에 오면 어떻게 알까요? 지구에서 태양 쪽으로 <b>150만 km</b> 떨어진 <b>L1 지점의 위성</b>(ACE, DSCOVR 등)이 태양풍을 먼저 측정해요.</div>' +
        '<p>태양풍 속도에 따른 <b>L1 경보 시간</b>을 계산하고, 우주 기상 피해와 <b>대응 행동</b>을 분야별로 짝지어 보세요.</p>',
      features: ['monitor', 'table'],
      setup() { setView('monitor'); },
      recap: 'L1 위성은 태양풍 속도에 따라 12~60분 전에 경보를 줘요. 분야마다 피해가 달라서 대응도 달라요.',
      summary: '<ul><li><b>L1 지점</b>(지구에서 태양 쪽 150만 km)의 위성이 태양풍을 먼저 측정해 <b>경보 시간 = 1.5×10⁶ km / v</b>: 400 km/s → 62분, 800 km/s → 31분, 2000 km/s → 12.5분.</li><li>경보 시간이 짧아도 위성을 안전 모드로 바꾸고 송전망 부하를 조정하기에는 충분해요(조치할 수 있는 최소 시간 확보).</li><li><b>분야–피해–대응</b>: 위성(전자 장비 고장·대기 팽창) → 안전 모드, GPS(측위 오차) → 정밀 작업 연기, 극항로 항공(방사선·통신 두절) → 저위도 항로, 송전망(유도 전류) → 부하 조정, 단파 통신(전리권 교란) → 주파수·위성 통신 전환.</li><li>우리나라는 한국천문연구원 우주전파센터가 4단계(관심·주의·경계·심각) 경보를 발령해요.</li></ul>',
      missions: [
        {
          title: 'L1 경보 시간 계산하기',
          goal: '태양풍 속도를 <b>800 km/s</b>로 맞추고, L1 위성(지구에서 1.5×10⁶ km)이 경보를 주는 시간을 <b>분</b> 단위로 계산해 입력하세요.',
          hint: 't = 1.5×10⁶ km / 800 km/s = 1875 s예요. 60으로 나누면 약 31분이에요.',
          setup() { S.mo.w = 800; $('#sW').value = 800; $('#sW').dispatchEvent(new Event('input')); S.flags.calcAl = true; S.mo.ok = false; clrIn('inAl'); S.mo.on = false; S.mo.done = false; setView('monitor'); },
          check: () => moOK(),
          hold: 0.5,
          status: () => mark(S.mo.w === 800) + ' 속도 800 km/s &nbsp; ' + mark(moOK()) + ' 경보 시간 ' + ($('#inAl').value.trim() || '—') + ' 분',
          explain: 't = 1.5×10⁶ km / 800 km/s ≈ 1875 s ≈ <b>31분</b>이에요. 짧아 보여도 위성을 안전 모드로 돌리고 송전망 부하를 조정하기에는 충분해요.',
        },
        {
          title: '분야 – 피해 – 대응 표 완성하기', manual: true,
          goal: '피해 카드 5장과 대응 카드 5장을 <b>알맞은 분야</b>(위성·GPS 항법·극항로 항공·송전망·단파 통신) 상자에 넣으세요.',
          hint: '송전망은 유도 전류로 변압기가 과열돼서 부하를 조정해요. 극항로 항공은 방사선에 대비해 항로를 바꿔요. 위성은 안전 모드로 전환해요.',
          setup() { cT.reset(); setView('table'); },
          check() {
            const pl = cT.items.filter((i) => i.loc != null).length;
            if (pl < 10) return '아직 상자에 넣지 않은 카드가 ' + (10 - pl) + '장 있어요.';
            const bad = cT.items.filter((i) => !cT.isRight(i));
            return bad.length ? '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요.' : true;
          },
          status: () => mark(cT.counts().placed === 10) + ' 분류 ' + cT.counts().placed + ' / 10 &nbsp; ' + mark(cT.counts().right === 10) + ' 맞게 ' + cT.counts().right + ' / 10',
          explain: '위성: 장비 고장 → 안전 모드 · GPS: 측위 오차 → 정밀 작업 연기 · 극항로 항공: 방사선 피폭 → 저위도 항로 · 송전망: 유도 전류 → 부하 조정 · 단파 통신: 통신 두절 → 주파수 변경. <b>감시 자료가 있어야 대응 행동</b>을 정할 수 있어요.',
        },
      ],
    },
    {
      title: '충돌 위험: 에너지와 방어', short: '충돌 위험', icon: '☄️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 우주 기상은 몇 분~며칠 전에 알 수 있다는 것을 배웠어요. 소천체의 충돌은 <b>수년 전에도</b> 알 수 있어요. <b>앞 차시의 소행성 궤도(a, e)와 제3법칙</b>을 그대로 써요.</div>' +
        '<p>근일점 q가 1.3 AU 이하인 <b>근지구 천체(NEO)</b>의 충돌 에너지 <b>E = ½mv²</b>를 계산하고, <b>DART</b>처럼 속도를 조금 바꾸면 소행성이 얼마나 어긋나는지 알아봐요.</p>',
      features: ['impact', 'dart'],
      setup() { setView('impact'); },
      recap: 'E = ½mv²에서 질량이 D³에 비례하므로 지름 10배는 에너지 1000배예요. 빨리 알수록 작은 Δv로도 빗나가게 할 수 있어요.',
      summary: '<ul><li><b>근지구 천체(NEO)</b>: 근일점 q = a(1 − e) ≤ 1.3 AU. 아포피스(a = 0.92 AU, e = 0.19)는 q = 0.75, Q = 1.10 AU라 지구 궤도와 교차해요(2029년 4월 약 3.2만 km까지 접근하지만 충돌은 없어요).</li><li><b>충돌 에너지 E = ½mv²</b>, m = ρ × π/6 × D³(ρ = 3000 kg/m³, v = 20 km/s): D = 20 m → 약 0.6 Mt, 140 m → 약 200 Mt, 1 km → 약 75000 Mt (1 Mt = 4.2×10¹⁵ J).</li><li>지름이 10배면 질량이 <b>1000배</b>, 에너지도 1000배예요.</li><li><b>DART 방어</b>: 공전 방향 속도를 Δv만 바꿔도 주기가 달라져 어긋남 Δs ≈ 3 Δv t가 쌓여요. Δv = 1 cm/s, t = 10년이면 Δs ≈ 9500 km로 지구 반지름(6371 km)보다 커요. DART(2022)는 디모르포스의 주기를 32분 줄였어요.</li></ul>',
      missions: [
        {
          title: '지름 140 m 소행성의 충돌 에너지',
          goal: '지름 <b>140 m</b>, 속력 <b>20 km/s</b>인 소행성의 충돌 에너지 E를 <b>Mt TNT</b> 단위로 계산해 입력하세요. (ρ = 3000 kg/m³)',
          hint: 'm = 3000 × π/6 × 140³ ≈ 4.3×10⁹ kg, E = ½mv² = ½ × 4.3×10⁹ × (2×10⁴)² ≈ 8.6×10¹⁷ J, 4.2×10¹⁵ J로 나누면 약 200 Mt예요.',
          setup() { IM.di = 2; IM.v = 20; $('#sVi').value = 20; $('#sVi').dispatchEvent(new Event('input')); IM.boomed = false; S.flags.calcE = true; IM.eOk = false; clrIn('inE'); setView('impact'); },
          check: () => imOK(),
          hold: 0.5,
          status: () => mark(IM.di === 2) + ' D = 140 m &nbsp; ' + mark(IM.v === 20) + ' v = 20 km/s &nbsp; ' + mark(imOK()) + ' E ' + ($('#inE').value.trim() || '—') + ' Mt',
          explain: 'm ≈ 4.3×10⁹ kg, E = ½mv² ≈ <b>8.6×10¹⁷ J ≈ 200 Mt</b>예요. 히로시마 원폭(15 kt)의 약 1만 4천 배예요. 140 m는 "잠재적 위험 천체"의 기준 크기예요.',
        },
        {
          title: 'DART로 지구를 비켜 가게 하기',
          goal: '속도 변화 <b>Δv</b>와 사전 경고 시간 <b>t</b>를 정해 DART를 발사하고, 어긋남 Δs가 <b>지구 반지름(6371 km) 이상</b>이 되게 하세요.',
          hint: 'Δs ≈ 3 Δv t예요. Δv = 1 cm/s, t = 10년이면 약 9500 km예요. 슬라이더를 정한 뒤 🛰️ DART 발사를 눌러요.',
          setup() { DA.dv = 0.5; DA.ty = 2; $('#sDv').value = 0.5; $('#sTy').value = 2; $('#sDv').dispatchEvent(new Event('input')); $('#sTy').dispatchEvent(new Event('input')); daReset(); setView('dart'); },
          check: () => daOK(),
          hold: 0.8,
          status: () => mark(daDs() >= RE_KM) + ' Δs = ' + comma(daDs()) + ' km (6371 km 이상) &nbsp; ' + mark(DA.shot && DA.hit >= 1) + ' DART 발사',
          explain: 'Δs ≈ 3 Δv t이므로 Δv = 1 cm/s, t = 10년이면 약 <b>9500 km</b>로 지구 반지름보다 커요. <b>미리 알수록</b>(t가 클수록) 아주 작은 속도 변화로도 빗나가게 할 수 있어요.',
        },
        {
          type: 'quiz', title: '지름이 10배면 에너지는?',
          goal: '같은 속력으로 충돌하는 소행성의 <b>지름이 10배</b>가 되면 충돌 에너지는 몇 배가 될까요?',
          setup() { setView('impact'); },
          choices: ['1000배 (질량이 지름의 세제곱에 비례해요)', '10배 (지름에 비례해요)', '100배 (단면적에 비례해요)', '20배 (지름과 속력의 합에 비례해요)'],
          answer: 0,
          feedback: ['', '지름이 10배면 부피가 10³배가 되고, 밀도가 같으면 질량도 1000배예요. 에너지는 질량에 비례해요.', '단면적은 D²에 비례하지만, 에너지는 부피(질량) D³에 비례해요.', '에너지는 합이 아니라 ½mv²이에요. v가 같으면 m에 비례해요.'],
          explain: 'm = ρ × π/6 × D³이므로 D가 10배면 m이 <b>1000배</b>, E = ½mv²도 1000배예요. 140 m의 200 Mt가 1 km에서는 약 75000 Mt가 돼요.',
        },
      ],
    },
    {
      title: '우주 쓰레기: 작아도 위험해요', short: '우주 쓰레기', icon: '🛰️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> E = ½mv²으로 소행성의 충돌 에너지를 계산했어요. 지구 둘레에는 사람이 만든 <b>우주 쓰레기</b>가 약 7.5 km/s로 돌고 있어요. 같은 식으로 <b>작은 파편</b>의 위험도 계산할 수 있어요.</div>' +
        '<p>1 cm 파편의 충돌 에너지를 구하고, <b>충돌이 파편을 늘리는 연쇄(케슬러 증후군)</b>를 모의한 뒤, 우주 환경을 지키는 규칙을 골라 봐요.</p>',
      features: ['debris'],
      setup() { setView('debris'); },
      recap: '작은 파편도 상대 속력이 매우 커서 위험해요. 충돌은 파편을 늘리고, 높은 궤도의 쓰레기는 수백 년 남아요.',
      summary: '<ul><li>추적되는 10 cm 이상 파편 약 3만 개, 1~10 cm 약 100만 개. 저궤도 속력 약 7.5 km/s, 정면 충돌 상대 속력은 최대 약 15 km/s.</li><li><b>1 cm 알루미늄 구</b>(1.4 g)가 10 km/s로 충돌하면 E = ½mv² = 7×10⁴ J(시속 100 km 승용차 5.8×10⁵ J의 약 1/8). 10 cm이면 질량이 1000배라 7×10⁷ J.</li><li>충돌 → 파편 → 연쇄 충돌: <b>케슬러 증후군</b>(2009년 이리듐 33과 코스모스 2251 충돌로 파편 수천 개).</li><li>재진입: 400 km는 수개월~1년, 800 km는 수십~100년, 1000 km 이상은 수백 년.</li><li>우주 환경도 지구와 이어진 환경이라 오염이 쌓이면 모두에게 피해가 가요: 수명 끝난 위성 내리기, 파편 만들지 않기, 감시 자료 공유.</li></ul>',
      missions: [
        {
          title: '1 cm 파편의 충돌 에너지',
          goal: '지름 <b>1 cm</b> 알루미늄 구(밀도 2700 kg/m³)가 상대 속력 <b>10 km/s</b>로 충돌할 때의 에너지를 <b>×10⁴ J</b> 단위로 계산해 입력하세요.',
          hint: 'm = 2700 × π/6 × (0.01 m)³ ≈ 1.4×10⁻³ kg, E = ½ × 1.4×10⁻³ × (10⁴)² ≈ 7×10⁴ J이에요. 7을 입력해요.',
          setup() { DB_.sz = 0; DB_.rel = 10; $('#sRel').value = 10; $('#sRel').dispatchEvent(new Event('input')); S.flags.calcJ = true; DB_.eOk = false; clrIn('inJ'); setView('debris'); },
          check: () => dbOK(),
          hold: 0.5,
          status: () => mark(DB_.sz === 0) + ' 1 cm &nbsp; ' + mark(DB_.rel === 10) + ' 10 km/s &nbsp; ' + mark(dbOK()) + ' E ' + ($('#inJ').value.trim() || '—') + '×10⁴ J',
          explain: 'm ≈ 1.4 g, E = ½mv² ≈ <b>7×10⁴ J</b>이에요. 시속 100 km 승용차(5.8×10⁵ J)의 약 1/8이지만, 작은 점에 몰리는 에너지라 위성에 구멍을 낼 수 있어요.',
        },
        {
          type: 'quiz', title: '작은 쓰레기도 위험한 까닭',
          goal: '지름 1 cm밖에 안 되는 우주 쓰레기도 위성에 큰 피해를 주는 까닭은?',
          setup() { DB_.sz = 0; setView('debris'); },
          choices: ['상대 속력이 매우 커서(약 10 km/s) 작은 질량이어도 운동 에너지가 커요', '작은 파편은 질량이 작으니 에너지도 거의 0이라 사실 위험하지 않아요', '우주 쓰레기는 속력이 느려서 천천히 부딪히기 때문이에요', '작은 파편은 대기권에서 절대 타지 않기 때문이에요'],
          answer: 0,
          feedback: ['', '질량이 작아도 에너지는 속력의 제곱에 비례해요. 1 cm 파편도 7×10⁴ J로 작지 않아요.', '궤도 속력이 약 7.5 km/s라 서로 다른 방향이면 상대 속력이 최대 약 15 km/s나 돼요.', '재진입 여부는 고도에 달렸어요. 낮은 궤도는 수개월~1년 안에 대기권에서 타요.'],
          explain: 'E = ½mv²에서 <b>v가 아주 커서</b> 작은 파편도 에너지가 커요. 10 cm이면 질량 1000배라 7×10⁷ J로 승용차 100대가 넘는 에너지예요.',
        },
        {
          title: '우주 환경을 지키는 규칙 고르기', manual: true,
          goal: '우주 환경도 지구와 이어진 환경이에요. 모두를 위해 <b>지켜야 할 규칙 3개</b>를 고르세요.',
          hint: '파편을 줄이고(수명 끝난 위성 내리기, 파편 만들지 않기), 함께 감시하는(자료 공유) 규칙이 알맞아요.',
          setup() { DB_.rules = RULES.map(() => false); S.flags.rule = true; setView('debris'); },
          check() {
            const n = DB_.rules.filter(Boolean).length;
            if (n === 0) return '규칙 카드를 눌러 골라 주세요.';
            if (ruleOKf()) { DB_.ruleOk = true; return true; }
            if (DB_.rules[3]) return '작은 파편도 위험해요. 무시하는 것은 규칙이 될 수 없어요.';
            if (DB_.rules[4]) return '쓴 위성의 뒤처리를 하지 않으면 쓰레기가 쌓여 모두가 피해를 봐요.';
            if (DB_.rules[5]) return '높은 궤도로 밀어 올리면 수백 년 동안 남아 문제가 더 오래가요.';
            return '규칙이 3개 필요해요. 파편을 줄이고 자료를 나누는 것을 떠올려 보세요.';
          },
          status: () => '고른 규칙 ' + DB_.rules.filter(Boolean).length + ' / 3',
          explain: '<b>수명이 끝난 위성 내리기 · 파편을 만들 수 있는 시험 하지 않기 · 감시 자료 공유</b>가 우주 환경을 지키는 규칙이에요. 한 나라의 쓰레기가 모든 나라의 위성을 위협하기 때문이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-space-hazard', mount: '#game', badge: '우주 안전 지킴이', homeHref: '../../index.html#hu',
    featureLabels: { flare: '☀️ X선 등급 그래프 · CME 도달 시간', monitor: '📡 L1 경보 시간 계산', table: '📋 분야–피해–대응 표', impact: '☄️ 근지구 천체 궤도 · 충돌 에너지', dart: '🛰️ DART 어긋남 계산', debris: '🛰️ 우주 쓰레기 연쇄 충돌 · 재진입 시간' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view;
    if (v === 'flare') { const fv = fluxAt(S.fl.t); setReadouts(['읽은 시각의 등급', clsOf(fv), 'CME 속도', S.fl.v + ' km/s', '플레어 빛의 도착', '약 8분']); }
    else if (v === 'monitor') setReadouts(['태양풍 속도', S.mo.w + ' km/s', 'L1 – 지구', '1.5×10⁶ km', '경보 후 지난 시간', S.mo.on ? f1(S.mo.t) + '분' : '—']);
    else if (v === 'table') { const c = cT.counts(); setReadouts(['넣은 카드', c.placed + ' / 10', '맞게 넣은 카드', c.right + ' / 10', '분야', '5개']); }
    else if (v === 'impact') setReadouts(['지름 D', nm(imD()), '질량 m', sci(astM(imD()), 2) + ' kg', '충돌 속력', IM.v + ' km/s']);
    else if (v === 'dart') setReadouts(['속도 변화 Δv', f1(DA.dv) + ' cm/s', '사전 경고 t', (DA.ty % 1 ? f1(DA.ty) : f0(DA.ty)) + '년', '어긋남 Δs', comma(daDs()) + ' km']);
    else setReadouts(['궤도의 파편', DB_.objs.filter((o) => !o.sat).length + '개', '충돌 횟수', DB_.hits + '번', '고른 파편 에너지', DB_.eOk || FREE() ? sci(dbE(DB_.sz === 0 ? 1 : 10, DB_.rel), 2) + ' J' : '—']);
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
      case 'flare': drawFlare(dt, t); break;
      case 'monitor': drawMonitor(dt, t); break;
      case 'table': drawTable(dt, t); break;
      case 'impact': drawImpact(dt, t); break;
      case 'dart': drawDart(dt, t); break;
      default: drawDebris(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, updateCtl, cT, LTb, fcGeom, flLaunch, moSend, imBoom, daShoot, dbCrash, dbInit, DB_, IM, DA, RULES, flOK, moOK, imOK, daOK, dbOK, daDs, astE, dbE, cmeT, alMin, dbN, LF, LMo, LIm, LDa, LDb };


})();
