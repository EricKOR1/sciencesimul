/* =========================================================
   행성우주과학 Ⅲ. 은하와 우주 - 우주 거대 구조 (7차시)
   성취기준 [12행우03-05] 은하의 공간 분포 자료를 통해 은하의 집단을 이해하고, 은하 장성, 보이드 등 우주의 거시적인 구조를 현대 우주론과 관련지어 설명할 수 있다.
   ① 관찰: 은하 지도 (앞 차시의 쐐기 도표 400개, 은하단 3곳·보이드 3곳 찾기, 무작위 점과 비교)
   ② 분석: 밀도 분석 (격자 셀 n, 평균 n̄, 밀도 대비 δ = (n − n̄)/n̄)
   ③ 설명: 큰 구조 (장성·보이드·초은하단의 크기, 신의 손가락 σ/H₀ ≈ 14 Mpc, 1 Mpc = 326만 광년)
   ④ 모형: 구조 기원 (2차원 입자 모형: 초기 ±5 % 요동이 중력으로 자라 그물 구조)
   다루지 않음: 상관 함수, 파워 스펙트럼, 바리온 음향 진동, 암흑 물질의 정체, 우주 구성 성분 비율, 표준 모형 매개 변수.
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

  initStage('#e8eef8', 800, 620, 480, 900, 1.25);
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
    const inC3 = (x, y) => x >= 64 && x < 80 && y >= 256 && y < 272;      // 먼 은하단의 가운데 셀(분석에서 쓰는 16 Mpc 칸)
    const addX = (kind, x, y) => (inC3(x, y) ? false : add(kind, x, y));
    const fillX = (n, kind, fn) => { let c = 0, tries = 0; while (c < n && tries++ < 20000) if (addX(kind, ...fn())) c++; };
    fill(40, 'cl1', () => [-8 + 1.5 * gauss(), 72 + 1.5 * gauss()]);
    const P1 = [-33, 97], P2 = [58, 166], ux = (P2[0] - P1[0]) / Math.hypot(P2[0] - P1[0], P2[1] - P1[1]), uy = (P2[1] - P1[1]) / Math.hypot(P2[0] - P1[0], P2[1] - P1[1]);
    fillX(90, 'band', () => { const t = R(), o = 2.5 * gauss(); return [P1[0] + t * (P2[0] - P1[0]) - uy * o, P1[1] + t * (P2[1] - P1[1]) + ux * o]; });
    fill(35, 'cl2', () => [-40 + 2.5 * gauss(), 216 + 2.5 * gauss()]);
    { let c = 0, tries = 0; while (c < 24 && tries++ < 20000) { const x = 72 + 3 * gauss(), y = 264 + 3 * gauss(); if (inC3(x, y) && add('cl3', x, y)) c++; } }
    { let c = 0, tries = 0; while (c < 6 && tries++ < 20000) { const x = 72 + 4.5 * gauss(), y = 264 + 4.5 * gauss(); if (!inC3(x, y) && Math.abs(x - 72) < 24 && Math.abs(y - 264) < 24 && add('cl3', x, y)) c++; } }
    fillX(25, 'fil', () => { const t = 0.04 + 0.92 * R(), o = 3 * gauss(); return [-40 + t * 90 - 0.316 * o, 216 + t * 30 + 0.949 * o]; });
    fillX(400 - GAL.length, 'bg', () => { const r = RMAX * Math.sqrt(R()), a = (R() * 2 - 1) * THMAX * DEG; return [r * Math.sin(a), r * Math.cos(a)]; });
  })();


  /* ---- 이 차시에서 쓰는 도우미 ---- */
  GAL.forEach((g) => { g.r = g.d * Math.cos(g.th * DEG); g.t = g.d * Math.sin(g.th * DEG); });
  const GAUSS = (function () { const R = rng(4242); return () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * R()); }; })();
  GAL.forEach((g) => { g.fog = GAUSS(); });
  const RAND = (function () { const R = rng(808), a = []; for (let i = 0; i < 400; i++) { const d = RMAX * Math.sqrt(R()), th = (R() * 2 - 1) * THMAX * DEG; a.push({ r: d * Math.cos(th), t: d * Math.sin(th) }); } return a; })();
  const CT = [{ r: 72, t: -8, rad: 9, n: '은하단' }, { r: 216, t: -40, rad: 9, n: '은하단' }, { r: 264, t: 72, rad: 9, n: '은하단' }];
  const VT = VOIDS.map((v) => ({ r: v.y, t: v.x, rad: v.r }));
  const SIG_V = 1000, FOG_MPC = SIG_V / H0;     // 은하단 속 은하의 무작위 속도 약 1000 km/s → 시선 방향 약 14 Mpc
  const MPC_LY = 3.26;                           // 1 Mpc = 326만 광년

  /* ---------- 배치 ---------- */
  const LMap = () => PHONE
    ? { P: { x: 8, y: 8, w: 464, h: 360 }, I: { x: 8, y: 376, w: 464, h: 104 }, Q: { x: 8, y: 488, w: 464, h: 404 }, K0: 1.375 }
    : { P: { x: 10, y: 8, w: 780, h: 532 }, I: { x: 10, y: 548, w: 780, h: 64 }, K0: 2.2 };
  const LGrid = () => PHONE
    ? { P: { x: 8, y: 8, w: 464, h: 540 }, B: { x: 8, y: 556, w: 464, h: 336 }, K: 1.3, ax: 22, ay: 190 }
    : { P: { x: 10, y: 8, w: 780, h: 332 }, B: { x: 10, y: 348, w: 780, h: 264 }, K: 1.2, ax: 30, ay: 188 };
  const LStr = () => PHONE
    ? { A: { x: 8, y: 8, w: 464, h: 360 }, P: { x: 8, y: 376, w: 464, h: 516 }, K: 0.6, ax: 20, ay: 488 }
    : { A: { x: 10, y: 8, w: 780, h: 252 }, P: { x: 10, y: 268, w: 780, h: 344 }, K: 1.14, ax: 24, ay: 450 };
  const LOri = () => PHONE
    ? { P: { x: 8, y: 8, w: 464, h: 500 }, I: { x: 8, y: 516, w: 464, h: 376 }, box: { x: 20, y: 46, s: 440 } }
    : { P: { x: 10, y: 8, w: 520, h: 604 }, I: { x: 538, y: 8, w: 252, h: 604 }, box: { x: 22, y: 60, s: 496 } };
  function drawWedgeFrame(T0, labels, t) {
    // T0: {x(r), y(t), K}  → 쐐기 틀, 거리 호, 방향 눈금
    const a = T0.pos(0, 0), K = T0.K;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.arc(a.x, a.y, RMAX * K, -THMAX * DEG, THMAX * DEG); ctx.closePath();
    ctx.fillStyle = 'rgba(99,102,241,.10)'; ctx.fill(); ctx.strokeStyle = 'rgba(148,163,184,.65)'; ctx.lineWidth = 1.8; ctx.stroke();
    [100, 200, 300].forEach((d) => { ctx.beginPath(); ctx.arc(a.x, a.y, d * K, -THMAX * DEG, THMAX * DEG); ctx.strokeStyle = 'rgba(148,163,184,.35)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]); if (labels) { const lp = T0.pos(d, 0); D.label(lp.x + 4, lp.y, d + ' Mpc', { bg: 'rgba(15,23,42,.85)', size: PHONE ? 9.5 : 11.5, align: 'left', pad: 5, color: '#cbd5e1' }); } });
    D.glow(a.x, a.y, 20, '#93c5fd', 0.6); D.sphere(a.x, a.y, 6, '#60a5fa', { gloss: false });
  }
  function mkT(ox, oy, K, cx, cy) { return { K, cx, cy, ox, oy, pos: (r, t) => ({ x: ox + (r - (cx || 0)) * K, y: oy - (t - (cy || 0)) * K }), inv: (x, y) => ({ r: (cx || 0) + (x - ox) / K, t: (cy || 0) - (y - oy) / K }) }; }

  /* ================= 상태 ================= */
  const S = {
    view: 'map', clock: 0, fade: 0,
    mp: { z: 1, cx: 160, cy: 0, mix: 0, mixT: 0, mode: 'c', mk: [], down: null, msg: '' },
    gr: { s: 16, sel: null, fill: 0, hl: null, hide: false, nOK: false, dOK: false, lock: false, ver: 0 },
    st: { fog: 0, fogT: 0, tOK: false, order: false },
    or: { eps: 5, age: 138, play: false, ageD: 138, epsD: 5 },
    flags: { calcN: false, calcD: false, calcT: false },
  };
  let game = null;
  const FREE = () => !!(game && game.free);
  const VIEW_LABEL = { map: '🗺️ 은하 지도 (쐐기 도표)', grid: '🔢 격자 셀의 은하 수와 밀도 대비', struct: '🏗️ 큰 구조의 이름과 크기', origin: '🧪 구조는 어떻게 자랐을까?' };
  const modeBtns = $$('#modeSeg button');
  const darkP = (x, y, w, h) => D.shadow(() => { ctx.fillStyle = '#0a1226'; rr(x, y, w, h, 14).fill(); }, { blur: 6, y: 2, color: 'rgba(20,40,80,.2)' });
  const markersOK = () => S.mp.mk.filter((m) => m.ok);

  /* =========================================================
     ① 은하 지도
     ========================================================= */
  function mapT() { const L = LMap(), P = L.P, M = S.mp; return mkT(P.x + P.w / 2, P.y + 40 + (P.h - 40) / 2, L.K0 * M.z, M.cx, M.cy); }
  function clampPan() { const M = S.mp, L = LMap(), K = L.K0 * M.z, hw = (L.P.w - 16) / 2 / K, hh = (L.P.h - 56) / 2 / K; M.cx = clamp(M.cx, Math.min(RMAX / 2, hw * 0.4), Math.max(RMAX / 2, RMAX - hw * 0.4)); M.cy = clamp(M.cy, -Math.max(0, 115 - hh * 0.4), Math.max(0, 115 - hh * 0.4)); if (M.z <= 1.001) { M.cx = RMAX / 2; M.cy = 0; } }
  function placeMark(r, t) {
    const M = S.mp, kind = M.mode;
    if (kind === 'c') {
      let hit = -1; CT.forEach((c, i) => { if (Math.hypot(r - c.r, t - c.t) <= c.rad + 2) hit = i; });
      if (hit >= 0 && M.mk.some((m) => m.ok && m.kind === 'c' && m.id === hit)) { say('이미 표시한 은하단이에요. 다른 곳을 찾아요.', true, 2.4); return; }
      if (hit >= 0) { M.mk.push({ kind, r: CT[hit].r, t: CT[hit].t, ok: true, id: hit, life: 0 }); Sound.click(); M.burst = { r: CT[hit].r, t: CT[hit].t, c: '#ef4444' }; }
      else { M.mk.push({ kind, r, t, ok: false, life: 1.3 }); say('그곳은 은하가 몰려 있는 곳이 아니에요. 점이 빽빽한 곳을 찾아요.', true, 2.8); Sound.fail(); }
    } else {
      let hit = -1; VT.forEach((v, i) => { if (Math.hypot(r - v.r, t - v.t) < v.rad) hit = i; });
      if (hit >= 0 && M.mk.some((m) => m.ok && m.kind === 'v' && m.id === hit)) { say('이미 표시한 빈 곳이에요. 다른 곳을 찾아요.', true, 2.4); return; }
      if (hit >= 0) { M.mk.push({ kind, r: VT[hit].r, t: VT[hit].t, ok: true, id: hit, life: 0 }); Sound.click(); M.burst = { r: VT[hit].r, t: VT[hit].t, c: '#38bdf8' }; }
      else {
        const near = GAL.filter((g) => Math.hypot(g.r - r, g.t - t) < 9).length, d = Math.hypot(r, t);
        M.mk.push({ kind, r, t, ok: false, life: 1.3 });
        say(near >= 3 ? '그 근처에는 은하가 많아요. 은하가 거의 없는 넓은 곳을 찾아요.' : d < 45 ? '관측자와 가까운 곳은 부피가 좁아서 은하가 적게 보일 뿐이에요. 더 넓은 빈 곳을 찾아요.' : '빈 곳의 한가운데를 눌러 보세요.', true, 3.2); Sound.fail();
      }
    }
    updateCtl();
  }
  function drawMap(dt, t) {
    const L = LMap(), P = L.P, I = L.I, M = S.mp;
    M.z = approach(M.z, M.zT == null ? M.z : M.zT, dt, 8); if (Math.abs(M.z - (M.zT == null ? M.z : M.zT)) < 0.002) M.z = M.zT == null ? M.z : M.zT;
    clampPan();
    M.mix = approach(M.mix, M.mixT, dt, 3); if (Math.abs(M.mix - M.mixT) < 0.002) M.mix = M.mixT;
    const T0 = mapT(), K = T0.K, mix = smooth(M.mix);
    darkP(P.x, P.y, P.w, P.h);
    ctx.save(); rr(P.x, P.y + 40, P.w, P.h - 40, 0); ctx.clip();
    const bg = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); bg.addColorStop(0, '#05081a'); bg.addColorStop(1, '#101a3c'); ctx.fillStyle = bg; ctx.fillRect(P.x, P.y, P.w, P.h);
    drawWedgeFrame(T0, true, t);
    GAL.forEach((g, i) => { const rd = RAND[i % RAND.length], r = g.r + (rd.r - g.r) * mix, tt = g.t + (rd.t - g.t) * mix, p = T0.pos(r, tt); if (p.x < P.x - 6 || p.x > P.x + P.w + 6) return; ctx.fillStyle = '#e0e7ff'; ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(p.x, p.y, clamp(1.8 + 0.35 * M.z, 2, 3.6), 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
    // 표시
    M.mk.forEach((m) => {
      const p = T0.pos(m.r, m.t);
      if (!m.ok) { ctx.strokeStyle = 'rgba(248,113,113,' + clamp(m.life, 0, 1).toFixed(2) + ')'; ctx.lineWidth = 3; const q = 10; ctx.beginPath(); ctx.moveTo(p.x - q, p.y - q); ctx.lineTo(p.x + q, p.y + q); ctx.moveTo(p.x + q, p.y - q); ctx.lineTo(p.x - q, p.y + q); ctx.stroke(); return; }
      if (m.kind === 'c') { ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 10 * Math.max(1, K / 2.2), 0, TAU); ctx.stroke(); D.label(p.x + 14 * Math.max(1, K / 2.2), p.y - 12, '은하단', { bg: '#dc2626', size: PHONE ? 10 : 12, pad: 7, align: 'left' }); }
      else { const v = VT[m.id]; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.arc(p.x, p.y, v.rad * K, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(56,189,248,.10)'; ctx.fill(); D.label(p.x, p.y, '보이드 ' + f0(v.rad * 2) + ' Mpc', { bg: '#0369a1', size: PHONE ? 10 : 12, pad: 7 }); }
    });
    ctx.restore();
    T(P.x + 14, P.y + 26 * FS, '🗺️ 은하 400개 (쐐기를 옆으로 눕혔어요)' + (M.mixT ? ' · 무작위로 흩뿌린 점' : ''), PHONE ? 11.5 : 14, '#e2e8f0', 'left', 800);
    T(P.x + P.w - 14, P.y + 26 * FS, '확대 ×' + f1(M.z) + (M.z > 1.05 ? ' · 끌어서 이동' : ''), PHONE ? 11 : 12.5, '#fde68a', 'right', 800);
    if (M.burst) { parts.burst(T0.pos(M.burst.r, M.burst.t).x, T0.pos(M.burst.r, M.burst.t).y, { count: 14, speed: 140, colors: [M.burst.c, '#fbbf24'] }); M.burst = null; }
    M.mk = M.mk.filter((m) => m.ok || (m.life -= dt) > 0);
    if (PHONE) drawRandPanel(L.Q, t);
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    const nc = markersOK().filter((m) => m.kind === 'c').length, nv = markersOK().filter((m) => m.kind === 'v').length;
    if (!PHONE) {
      T(I.x + 14, I.y + 26, '은하가 몰린 곳(은하단) ' + nc + ' / 3 · 빈 곳(보이드) ' + nv + ' / 3', 14.5, '#1e293b', 'left', 800);
      T(I.x + 14, I.y + 50, M.mixT ? '점을 무작위로 뿌리면 이런 모습이에요: 큰 덩어리나 빈 곳이 없어요.' : '점이 빽빽한 곳은 은하단, 은하가 거의 없는 넓은 곳은 보이드예요. 오른쪽 도구로 표시해요.', 12.5, '#64748b', 'left', 700);
    } else {
      T(I.x + 14, I.y + 28 * FS, '은하단 ' + nc + ' / 3 · 보이드 ' + nv + ' / 3', 14, '#1e293b', 'left', 800);
      drawWrap(I.x + 14, I.y + 56 * FS, '빽빽한 곳은 은하단, 은하가 거의 없는 넓은 곳은 보이드예요. 아래 그림은 같은 개수(400개)의 점을 무작위로 뿌린 모습이에요.', I.w - 28, 12, { color: '#64748b' });
    }
  }

  function drawRandPanel(Q, t) {
    darkP(Q.x, Q.y, Q.w, Q.h);
    ctx.save(); rr(Q.x, Q.y + 40, Q.w, Q.h - 40, 0); ctx.clip();
    const T1 = mkT(Q.x + Q.w / 2, Q.y + 40 + (Q.h - 40) / 2, LMap().K0, RMAX / 2, 0);
    drawWedgeFrame(T1, false, t);
    RAND.forEach((g) => { const p = T1.pos(g.r, g.t); ctx.fillStyle = '#e0e7ff'; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, TAU); ctx.fill(); });
    ctx.restore();
    T(Q.x + 14, Q.y + 26 * FS, '🎲 비교: 무작위로 뿌린 점 400개', 11.5, '#e2e8f0', 'left', 800);
  }

  /* =========================================================
     ② 밀도 분석
     ========================================================= */
  const GRM = new Map();
  function gridInfo(s) {
    if (GRM.has(s)) return GRM.get(s);
    const TN = Math.tan(THMAX * DEG), cells = new Map(), list = [];
    for (let i = -Math.ceil(120 / s) - 1; i <= Math.ceil(120 / s); i++) for (let j = 0; j * s < RMAX + s; j++) {
      const x0 = i * s, y0 = j * s, cs = [[x0, y0], [x0 + s, y0], [x0, y0 + s], [x0 + s, y0 + s]];
      if (cs.every(([x, y]) => y > 0 && Math.abs(x) <= y * TN && Math.hypot(x, y) <= RMAX)) { const c = { i, j, x0, y0, n: 0, key: i + ',' + j, gal: [] }; cells.set(c.key, c); list.push(c); }
    }
    GAL.forEach((g) => { const k = Math.floor(g.t / s) + ',' + Math.floor(g.r / s), c = cells.get(k); if (c) { c.n++; c.gal.push(g); } });
    const tot = list.reduce((a, c) => a + c.n, 0), nbar = tot / list.length;
    list.forEach((c) => { c.d = (c.n - nbar) / nbar; });
    const res = { s, cells, list, nbar, tot };
    GRM.set(s, res); return res;
  }
  const MISSION_CELL = '4,16';          // 먼 은하단의 가운데 칸 (s = 16)
  function cellColor(d) {
    const stops = [[-1, [37, 99, 235]], [-0.5, [147, 197, 253]], [0, [241, 245, 249]], [1.5, [253, 186, 116]], [4, [249, 115, 22]], [10, [185, 28, 28]]];
    for (let i = 1; i < stops.length; i++) if (d <= stops[i][0]) { const a = stops[i - 1], b = stops[i], k = clamp((d - a[0]) / (b[0] - a[0]), 0, 1); return 'rgb(' + a[1].map((v, j) => Math.round(v + (b[1][j] - v) * k)).join(',') + ')'; }
    return 'rgb(185,28,28)';
  }
  const cellHidden = (c) => S.gr.hide && !FREE() && c.key === MISSION_CELL && S.gr.s === 16;
  const CELLCARDS = [];
  function buildCellCards() {
    const G = gridInfo(16), by = (f) => G.list.filter(f);
    const cl = by((c) => c.n >= 17).sort((a, b) => b.n - a.n).slice(0, 3), wall = by((c) => c.n >= 7 && c.n <= 12).sort((a, b) => a.n - b.n);
    const wl = [wall[Math.floor(wall.length * 0.25)], wall[Math.floor(wall.length * 0.75)]], vd = [G.cells.get('-2,9'), G.cells.get('1,6')];
    const pick = [cl[0], wl[0], vd[0], cl[2] || cl[1], vd[1], wl[1]];
    const names = ['A', 'B', 'C', 'D', 'E', 'F'];
    pick.forEach((c, i) => CELLCARDS.push({ key: c.key, n: c.n, d: c.d, name: names[i], bin: c.n >= 17 ? 0 : c.n >= 7 ? 1 : 2 }));
  }
  buildCellCards();
  function gridGeom() {
    const L = LGrid(), T0 = mkT(L.ax, L.ay, L.K, 0, 0);
    return Object.assign({ T0, L }, { cellRect: (c, s) => { const a = T0.pos(c.y0, c.x0 + s), b = T0.pos(c.y0 + s, c.x0); return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }; } });
  }
  function cellAt(p) {
    const gg = gridGeom(), G = gridInfo(S.gr.s), w = gg.T0.inv(p.x, p.y);
    return G.cells.get(Math.floor(w.t / S.gr.s) + ',' + Math.floor(w.r / S.gr.s)) || null;
  }
  function LGrCls() {
    const L = LGrid(), B = L.B;
    if (PHONE) { const bw = (B.w - 16 - 12) / 3; return { grid: { x: B.x + 8, y: B.y + 10, w: B.w - 16, cols: 2, cardH: 42, gap: 6 }, bins: [0, 1, 2].map((i) => ({ x: B.x + 8 + i * (bw + 6), y: B.y + 10 + 3 * 48 + 8, w: bw, h: B.h - 10 - 144 - 16 })) }; }
    const bw = (B.w - 16 - 12) / 3;
    return { grid: { x: B.x + 8, y: B.y + 8, w: B.w - 16, cols: 6, cardH: 44, gap: 6 }, bins: [0, 1, 2].map((i) => ({ x: B.x + 8 + i * (bw + 6), y: B.y + 8 + 44 + 10, w: bw, h: B.h - 8 - 44 - 10 - 10 })) };
  }
  const cGr = makeClassifier({
    items: CELLCARDS.map((c) => ({ label: '셀 ' + c.name, sub: 'n = ' + c.n + ' · δ = ' + (c.d >= 0 ? '+' : '−') + f1(Math.abs(c.d)), chip: '셀 ' + c.name + ' (n = ' + c.n + ')', bin: c.bin, open: true, key: c.key })),
    bins: PHONE ? [{ label: '🔴 은하단', sub: 'δ ≫ 1', color: '#dc2626' }, { label: '🟠 필라·장성', sub: 'δ +1~+3', color: '#f59e0b' }, { label: '🔵 보이드', sub: 'δ −0.7~−1', color: '#2563eb' }] : [{ label: '🔴 은하단 (δ ≫ 1)', color: '#dc2626' }, { label: '🟠 필라멘트·장성 (δ +1~+3)', color: '#f59e0b' }, { label: '🔵 보이드 (δ −0.7~−1)', color: '#2563eb' }],
    chipCols: 1, minRows: 2,
    layout: () => { const L = LGrCls(); return { grid: L.grid, bins: L.bins }; },
    onPlace(it, b) {
      it.wrong = b !== it.bin;
      if (it.wrong) { say('「' + it.label + '」은(는) 그 분류가 아니에요. n과 δ를 기준과 비교해 보세요.', true, 3.4); Sound.fail(); }
      else parts.burst(it.x + it.w / 2, it.y + it.h / 2, { count: 10, speed: 120, colors: [['#dc2626', '#f59e0b', '#2563eb'][b], '#fbbf24'] });
    },
    onChange() { updateCtl(); },
  });
  const grClsOK = () => cGr.items.every((i) => i.loc != null && cGr.isRight(i));
  function drawGrid(dt, t) {
    const gg = gridGeom(), L = gg.L, P = L.P, T0 = gg.T0, G = gridInfo(S.gr.s), s = S.gr.s;
    S.gr.fill = approach(S.gr.fill, 1, dt, 1.4);
    darkP(P.x, P.y, P.w, P.h);
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14); ctx.clip();
    drawWedgeFrame(T0, false, t);
    const rowMax = Math.ceil(RMAX / s) + 1;
    const hlKey = cGr.sel >= 0 && s === 16 ? CELLCARDS[cGr.sel].key : null;
    G.list.forEach((c) => {
      const R = gg.cellRect(c, s), al = clamp(S.gr.fill * 1.8 - (c.j / rowMax) * 0.8, 0, 1);
      ctx.globalAlpha = 0.82 * al; ctx.fillStyle = cellHidden(c) ? '#94a3b8' : cellColor(c.d); ctx.fillRect(R.x, R.y, R.w, R.h); ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(15,23,42,.45)'; ctx.lineWidth = 1; ctx.strokeRect(R.x + 0.5, R.y + 0.5, R.w - 1, R.h - 1);
    });
    GAL.forEach((g) => { const p = T0.pos(g.r, g.t); ctx.fillStyle = 'rgba(15,23,42,.65)'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, TAU); ctx.fill(); });
    const sel = S.gr.sel && G.cells.get(S.gr.sel), hl = hlKey && G.cells.get(hlKey);
    [[sel, '#fde047', 3.5], [hl, '#22d3ee', 3.5]].forEach(([c, col, w]) => { if (!c) return; const R = gg.cellRect(c, s); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.strokeRect(R.x - 1, R.y - 1, R.w + 2, R.h + 2); });
    ctx.restore();
    T(P.x + 14, P.y + 26 * FS, '🔢 셀 한 칸 = ' + s + ' × ' + s + ' Mpc · 분석한 셀 ' + G.list.length + '개', PHONE ? 11.5 : 14, '#e2e8f0', 'left', 800);
    // 오른쪽(또는 아래) 정보
    const ix = PHONE ? P.x + 12 : P.x + 440, iy = PHONE ? P.y + 372 : P.y + 44, iw = PHONE ? P.w - 24 : P.w - 452;
    const c = sel;
    const sz = PHONE ? 120 : 138;
    ctx.fillStyle = '#05091a'; rr(ix, iy, sz, sz, 10).fill();
    ctx.save(); rr(ix, iy, sz, sz, 10); ctx.clip();
    if (c) { c.gal.forEach((g) => { const x = ix + ((g.t - c.x0) / s) * sz, y = iy + sz - ((g.r - c.y0) / s) * sz; D.glow(x, y, 9, '#fde68a', 0.5); ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.arc(x, y, PHONE ? 3.6 : 4.2, 0, TAU); ctx.fill(); }); }
    else T(ix + sz / 2, iy + sz / 2 + 4, '셀을 눌러요', 12.5, '#94a3b8', 'center', 800);
    ctx.restore(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.6; rr(ix, iy, sz, sz, 10).stroke();
    T(ix, iy - 8, '🔍 고른 셀을 확대한 모습', PHONE ? 11 : 12, '#cbd5e1', 'left', 800);
    const tx = ix + sz + 14, tw = iw - sz - 14;
    const nShow = c && (!cellHidden(c) || S.gr.nOK), dShow = c && (!cellHidden(c) || S.gr.dOK);
    const rows = [['셀 은하 수 n', c ? (nShow ? String(c.n) : '?') : '—'], ['전체 평균 n̄', f1(G.nbar)], ['밀도 대비 δ', c ? (dShow ? (c.d >= 0 ? '+' : '−') + f1(Math.abs(c.d)) : '?') : '—']];
    rows.forEach((r, i) => { const y = iy + 22 + i * (PHONE ? 36 : 40); T(tx, y, r[0], PHONE ? 12 : 13, '#94a3b8', 'left', 800); T(tx + tw, y + 20, r[1], PHONE ? 17 : 20, r[1] === '?' ? '#fde68a' : '#f1f5f9', 'right', 800); });
    drawWrap(tx, iy + 22 + 3 * (PHONE ? 36 : 40) + 4, 'δ = (n − n̄) / n̄', tw, PHONE ? 12 : 13, { color: '#7dd3fc', weight: 800 });
    // 색 막대
    const by = PHONE ? iy + sz + 40 : iy + sz + 30, bw = iw, N = 40;
    for (let i = 0; i < N; i++) { const d = -1 + (i / (N - 1)) * 11; ctx.fillStyle = cellColor(d); ctx.fillRect(ix + (i / N) * bw, by, bw / N + 1, 12); }
    [[-1, '−1'], [0, '0'], [1.5, '+1.5'], [4, '+4'], [10, '+10']].forEach(([d, l]) => { const x = ix + ((d + 1) / 11) * bw; ctx.fillStyle = '#e2e8f0'; ctx.fillRect(x - 0.5, by + 12, 1.5, 4); T(x, by + 30, l, 10.5, '#cbd5e1', 'center', 700); });
    T(ix, by - 8, '셀 색 = 밀도 대비 δ (붉을수록 은하가 몰려 있어요)', PHONE ? 10.5 : 11.5, '#cbd5e1', 'left', 800);
    // 분류 판
    const B = L.B; panel(B.x, B.y, B.w, B.h, { r: 14 });
    cGr.draw(dt, {});
  }

  /* =========================================================
     ③ 큰 구조
     ========================================================= */
  const STRU = [
    { n: '은하단', sub: '은하 수백~수천 개', size: '약 10 Mpc', pl: '약 10', bin: 0, L: 10, h: 700 },
    { n: '보이드', sub: '은하가 거의 없는 빈 곳', size: '20~100 Mpc', pl: '20~100', bin: 1, L: 100, h: 7000, lo: 20 },
    { n: '초은하단', sub: '군·단 수십 개', size: '30~100 Mpc 이상', pl: '30~100+', bin: 2, L: 100, h: 7000, lo: 30 },
    { n: 'CfA 장성', sub: '1989 · 두께 약 5 Mpc', size: '길이 약 200 Mpc', pl: '약 200', bin: 3, L: 200, h: 14000 },
    { n: '슬론 장성', sub: '2003 · 더 긴 장성', size: '길이 약 400 Mpc', pl: '약 400', bin: 4, L: 400, h: 28000 },
  ];
  function LStrCls() {
    const L = LStr(), A = L.A;
    if (PHONE) { const bw = (A.w - 16 - 24) / 5; return { grid: { x: A.x + 8, y: A.y + 34, w: A.w - 16, cols: 2, cardH: 44, gap: 6 }, bins: STRU.map((_, i) => ({ x: A.x + 8 + i * (bw + 6), y: A.y + 34 + 3 * 50 + 8, w: bw, h: A.h - 34 - 3 * 50 - 8 - 10 })) }; }
    const bw = (A.w - 16 - 24) / 5;
    return { grid: { x: A.x + 8, y: A.y + 34, w: A.w - 16, cols: 5, cardH: 48, gap: 8 }, bins: STRU.map((_, i) => ({ x: A.x + 8 + i * (bw + 6), y: A.y + 34 + 48 + 12, w: bw, h: A.h - 34 - 48 - 12 - 10 })) };
  }
  const cSt = makeClassifier({
    items: STRU.map((s) => ({ label: s.n, sub: s.sub, chip: s.n, bin: s.bin, open: true })),
    bins: STRU.map((s) => ({ label: PHONE ? s.pl : s.size, color: ['#0ea5e9', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'][s.bin] })),
    chipCols: 1, minRows: 1,
    layout: () => { const L = LStrCls(); return { grid: L.grid, bins: L.bins }; },
    onPlace(it, b) {
      it.wrong = b !== it.bin;
      if (it.wrong) { say('「' + it.label + '」은(는) 그 크기가 아니에요. 구조의 이름과 크기를 다시 떠올려 보세요.', true, 3.4); Sound.fail(); }
      else parts.burst(it.x + it.w / 2, it.y + it.h / 2, { count: 10, speed: 120, colors: ['#3b82f6', '#fbbf24'] });
    },
    onChange() { updateCtl(); },
  });
  const stOK = () => cSt.items.every((i) => i.loc != null && cSt.isRight(i));
  const tShown = () => S.st.tOK || FREE();
  function drawStruct(dt, t) {
    const L = LStr(), A = L.A, P = L.P, ST = S.st;
    ST.fog = approach(ST.fog, ST.fogT, dt, 2.2); if (Math.abs(ST.fog - ST.fogT) < 0.003) ST.fog = ST.fogT;
    panel(A.x, A.y, A.w, A.h, { r: 14 });
    T(A.x + 14, A.y + 24 * FS, (PHONE ? '🏗️ 이름과 크기(Mpc)를 연결해요' : '🏗️ 구조의 이름과 크기를 연결해요'), PHONE ? 12.5 : 14.5, '#1e293b', 'left', 800);
    cSt.draw(dt, {});
    darkP(P.x, P.y, P.w, P.h);
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14); ctx.clip();
    const T0 = mkT(L.ax + (PHONE ? 0 : 0), L.ay, L.K, 0, 0);
    drawWedgeFrame(T0, true, t);
    GAL.forEach((g) => { const f = g.kind === 'cl1' || g.kind === 'cl2' || g.kind === 'cl3' ? ST.fog * g.fog * clamp(FOG_MPC, 0, 40) : 0, r = clamp(g.r + f, 1, RMAX), p = T0.pos(r, g.t); const isC = g.kind === 'cl1' || g.kind === 'cl2' || g.kind === 'cl3'; ctx.fillStyle = isC ? '#fca5a5' : '#e0e7ff'; ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(p.x, p.y, PHONE ? 1.8 : 2.2, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
    ctx.restore();
    T(P.x + 14, P.y + 26 * FS, '👆 신의 손가락: ' + (ST.fogT ? '적색 편이로 재면 은하단이 시선 방향으로 늘어나 보여요' : '실제 위치'), PHONE ? 10.5 : 13.5, '#e2e8f0', 'left', 800);
    if (ST.fog > 0.05) { const a = T0.pos(CT[2].r - FOG_MPC, CT[2].t + 22), b = T0.pos(CT[2].r + FOG_MPC, CT[2].t + 22); ctx.globalAlpha = ST.fog; D.arrow(a.x, a.y, b.x, b.y, { color: '#fbbf24', width: 3, head: 9 }); D.label((a.x + b.x) / 2, a.y - 14, '± ' + f0(FOG_MPC) + ' Mpc', { bg: '#b45309', size: PHONE ? 10 : 11.5, pad: 6 }); ctx.globalAlpha = 1; }
    // 표
    const open = S.st.order || FREE();
    const bx = PHONE ? P.x + 8 : P.x + 430, by = PHONE ? P.y + 176 : P.y + 36, bw = PHONE ? P.w - 16 : P.w - 440, bh = PHONE ? P.h - 184 : P.h - 44;
    ctx.fillStyle = '#ffffff'; rr(bx, by, bw, bh, 12).fill();
    T(bx + 12, by + 24, '⚖ 크기 d에서의 허블 흐름 H₀d (σ 약 1000 km/s 이하)', PHONE ? 11 : 12.5, '#1e293b', 'left', 800);
    if (!open) { drawWrap(bx + 12, by + 52, '구조의 이름과 크기를 모두 연결하면 각 구조의 H₀d와 팽창의 영향을 비교할 수 있어요.', bw - 24, 12.5, { color: '#64748b' }); }
    else {
      STRU.forEach((s, i) => {
        const y = by + 46 + i * 26, ex = s.h > SIG_V;
        ctx.fillStyle = i % 2 ? 'rgba(100,116,139,.05)' : 'rgba(100,116,139,.09)'; rr(bx + 8, y - 17, bw - 16, 24, 7).fill();
        T(bx + 14, y, s.n, PHONE ? 11.5 : 12.5, '#1e293b', 'left', 800);
        const hd = s.lo ? comma(70 * s.lo) + '~' + comma(70 * s.L) : comma(s.h);
        T(bx + bw * 0.27, y, s.size.replace('길이 ', ''), PHONE ? 10 : 11.5, '#475569', 'left', 700);
        T(bx + bw * 0.6, y, hd + (s.n === '초은하단' ? '+' : ''), PHONE ? 10 : 11.5, ex ? '#b91c1c' : '#15803d', 'left', 800);
        T(bx + bw - 12, y, ex ? '팽창' : '중력', PHONE ? 10.5 : 11.5, ex ? '#b91c1c' : '#15803d', 'right', 800);
      });
      const yy = by + 46 + 5 * 26 + 8;
      drawWrap(bx + 12, yy, 'H₀d가 σ(약 1000 km/s)보다 훨씬 큰 장성·보이드·초은하단은 우주 팽창의 영향을 받는 규모예요. 은하단은 H₀d가 작아 중력으로 묶여 있어요.', bw - 24, PHONE ? 11.5 : 12.5, { color: '#0369a1', weight: 800 });
      const y2 = yy + (PHONE ? 58 : 56);
      if (tShown()) drawWrap(bx + 12, y2, 'CfA 장성 길이 200 Mpc = 200 × 3.26 = 652백만 광년 ≈ 6.5억 광년. 빛이 가로지르는 데 약 6.5억 년이 걸려요.', bw - 24, PHONE ? 11.5 : 12.5, { color: '#7c3aed', weight: 800 });
      else drawWrap(bx + 12, y2, '1 Mpc = 326만 광년이에요. 장성의 길이를 광년으로 바꿔 보세요.', bw - 24, PHONE ? 11.5 : 12.5, { color: '#b45309', weight: 800 });
    }
    if (!PHONE) { T(P.x + 14, P.y + P.h - 14, '관측 가능한 우주 반지름 약 14000 Mpc에 비하면 가장 큰 구조도 작아요.', 12, '#94a3b8', 'left', 700); }
    else { T(bx + 12, P.y + P.h - 10, '관측 가능한 우주 반지름 약 14000 Mpc', 10.5, '#64748b', 'left', 700); }
  }

  /* =========================================================
     ④ 구조 기원: 입자 모형 (PM 중력 계산)
     ========================================================= */
  const NG = 64, NPX = 64, NP = NPX * NPX, STEPS = 140, A_I = 0.02, A_F = 1.0;
  function fft1(re, im, inv) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = 2 * Math.PI / len * (inv ? 1 : -1), wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) { const ur = re[i + j], ui = im[i + j], vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr; re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
    }
    if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
  function fft2(re, im, inv) {
    const rr_ = new Float64Array(NG), ii_ = new Float64Array(NG);
    for (let y = 0; y < NG; y++) { for (let x = 0; x < NG; x++) { rr_[x] = re[y * NG + x]; ii_[x] = im[y * NG + x]; } fft1(rr_, ii_, inv); for (let x = 0; x < NG; x++) { re[y * NG + x] = rr_[x]; im[y * NG + x] = ii_[x]; } }
    for (let x = 0; x < NG; x++) { for (let y = 0; y < NG; y++) { rr_[y] = re[y * NG + x]; ii_[y] = im[y * NG + x]; } fft1(rr_, ii_, inv); for (let y = 0; y < NG; y++) { re[y * NG + x] = rr_[y]; im[y * NG + x] = ii_[y]; } }
  }
  const MODES = (function () { const R = rng(31415), a = []; let n = 0; while (n < 14) { const nx = Math.floor(R() * 7), ny = Math.floor(R() * 13) - 6, m = Math.hypot(nx, ny); if (m < 1 || m > 5 || (nx === 0 && ny <= 0)) continue; a.push({ nx, ny, amp: (0.5 + R()) / Math.pow(m, 1.5), ph: R() * TAU }); n++; } const rms = Math.sqrt(a.reduce((s, q) => s + q.amp * q.amp / 2, 0)); a.forEach((q) => { q.amp /= rms; }); return a; })();
  const SIMC = new Map(), SIMJOBS = [];
  function* simGen(eps) {      // eps: 초기 밀도 요동의 크기 (0 ~ 0.05)
    const px = new Float64Array(NP), py = new Float64Array(NP), vx = new Float64Array(NP), vy = new Float64Array(NP);
    for (let j = 0; j < NPX; j++) for (let i = 0; i < NPX; i++) {
      const q = j * NPX + i, X = (i + 0.5) / NPX, Y = (j + 0.5) / NPX; let dx = 0, dy = 0;
      // 처음 위치 x = q + a_i ψ,  a_i ψ = −A (k / |k|²) sin θ  (k = 2π n),  처음 운동량 p = a_i^{3/2} ψ
      MODES.forEach((m) => { const k2 = (m.nx * m.nx + m.ny * m.ny), th = TAU * (m.nx * X + m.ny * Y) + m.ph, f = eps * m.amp * Math.sin(th) / (TAU * k2); dx -= f * m.nx; dy -= f * m.ny; });
      px[q] = ((X + dx) % 1 + 1) % 1; py[q] = ((Y + dy) % 1 + 1) % 1;
      vx[q] = Math.sqrt(A_I) * dx; vy[q] = Math.sqrt(A_I) * dy;
    }
    const frames = [], dln = Math.log(A_F / A_I) / STEPS, re = new Float64Array(NG * NG), im = new Float64Array(NG * NG), gxr = new Float64Array(NG * NG), gxi = new Float64Array(NG * NG), gyr = new Float64Array(NG * NG), gyi = new Float64Array(NG * NG), rho = new Float64Array(NG * NG);
    const snap = () => { const f = new Float32Array(2 * NP); for (let q = 0; q < NP; q++) { f[2 * q] = px[q]; f[2 * q + 1] = py[q]; } frames.push(f); };
    snap();
    let a = A_I;
    for (let st = 0; st < STEPS; st++) {
      const da = a * (Math.exp(dln) - 1), am = a + da / 2;
      rho.fill(0);
      for (let q = 0; q < NP; q++) { const gx = px[q] * NG - 0.5, gy = py[q] * NG - 0.5, i0 = Math.floor(gx), j0 = Math.floor(gy), fx = gx - i0, fy = gy - j0, ia = ((i0 % NG) + NG) % NG, ib = (ia + 1) % NG, ja = ((j0 % NG) + NG) % NG, jb = (ja + 1) % NG; rho[ja * NG + ia] += (1 - fx) * (1 - fy); rho[ja * NG + ib] += fx * (1 - fy); rho[jb * NG + ia] += (1 - fx) * fy; rho[jb * NG + ib] += fx * fy; }
      for (let c = 0; c < NG * NG; c++) { re[c] = rho[c] - 1; im[c] = 0; }
      fft2(re, im, false);
      for (let jy = 0; jy < NG; jy++) for (let ix = 0; ix < NG; ix++) {
        const c = jy * NG + ix, kx = TAU * (ix < NG / 2 ? ix : ix - NG), ky = TAU * (jy < NG / 2 ? jy : jy - NG), k2 = kx * kx + ky * ky;
        if (k2 === 0) { gxr[c] = gxi[c] = gyr[c] = gyi[c] = 0; continue; }
        const cc = 1.5 / a / k2;
        gxr[c] = -cc * kx * im[c]; gxi[c] = cc * kx * re[c]; gyr[c] = -cc * ky * im[c]; gyi[c] = cc * ky * re[c];
      }
      fft2(gxr, gxi, true); fft2(gyr, gyi, true);
      const kick = Math.sqrt(a) * da, drift = Math.pow(am, -1.5) * da;
      for (let q = 0; q < NP; q++) {
        const gx = px[q] * NG - 0.5, gy = py[q] * NG - 0.5, i0 = Math.floor(gx), j0 = Math.floor(gy), fx = gx - i0, fy = gy - j0, ia = ((i0 % NG) + NG) % NG, ib = (ia + 1) % NG, ja = ((j0 % NG) + NG) % NG, jb = (ja + 1) % NG;
        const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
        const fxv = gxr[ja * NG + ia] * w00 + gxr[ja * NG + ib] * w10 + gxr[jb * NG + ia] * w01 + gxr[jb * NG + ib] * w11;
        const fyv = gyr[ja * NG + ia] * w00 + gyr[ja * NG + ib] * w10 + gyr[jb * NG + ia] * w01 + gyr[jb * NG + ib] * w11;
        vx[q] += fxv * kick; vy[q] += fyv * kick;
        px[q] = (((px[q] + vx[q] * drift) % 1) + 1) % 1; py[q] = (((py[q] + vy[q] * drift) % 1) + 1) % 1;
      }
      a += da; snap();
      if (st % 2 === 1) yield;
    }
    return { frames, eps };
  }
  const simKey = (eps) => String(Math.round(eps * 1000));
  const simReady = (eps) => SIMC.has(simKey(eps));
  function queueSim(eps) { const k = simKey(eps); if (SIMC.has(k) || SIMJOBS.some((j) => j.k === k)) return; SIMJOBS.push({ k, g: simGen(eps) }); }
  function pumpSim(ms) { const t0 = performance.now(); while (SIMJOBS.length && performance.now() - t0 < ms) { const j = SIMJOBS[0], r = j.g.next(); if (r.done) { SIMC.set(j.k, r.value); SIMJOBS.shift(); } } return SIMJOBS.length > 0; }
  function runSim(eps) { queueSim(eps); const k = simKey(eps); while (!SIMC.has(k)) pumpSim(1000); return SIMC.get(k); }
  (function pumpLoop() { if (pumpSim(4)) setTimeout(pumpLoop, 14); else setTimeout(pumpLoop, 400); })();
  [5, 0, 1, 2, 3, 4].forEach((e) => queueSim(e / 100));
  const ageOfA = (a) => 138 * Math.pow(a, 1.5);
  const aOfAge = (t) => clamp(Math.pow(t / 138, 2 / 3), A_I, A_F);
  const frameAt = (age) => { const a = aOfAge(age), f = clamp(Math.log(a / A_I) / Math.log(A_F / A_I) * STEPS, 0, STEPS), i0 = Math.min(STEPS - 1, Math.floor(f)); return { i0, fr: f - i0 }; };
  const ORB = { buf: new Float32Array(2 * NP), cnt: new Int32Array(32 * 32), blk: new Int32Array(64), key: '' };
  function orbPositions(eps, age) {
    if (!simReady(eps / 100)) { queueSim(eps / 100); ORB.key = ''; return false; }
    const key = eps + '|' + age.toFixed(2); if (ORB.key === key) return true;
    ORB.key = key;
    const sim = SIMC.get(simKey(eps / 100)), { i0, fr } = frameAt(age), A = sim.frames[i0], B = sim.frames[i0 + 1], o = ORB.buf;
    for (let q = 0; q < 2 * NP; q++) { let d = B[q] - A[q]; d -= Math.round(d); let v = A[q] + d * fr; v -= Math.floor(v); o[q] = v; }
    ORB.cnt.fill(0); ORB.blk.fill(0);
    for (let q = 0; q < NP; q++) { const cx = Math.min(31, Math.floor(o[2 * q] * 32)), cy = Math.min(31, Math.floor(o[2 * q + 1] * 32)); ORB.cnt[cy * 32 + cx]++; ORB.blk[Math.min(7, Math.floor(o[2 * q + 1] * 8)) * 8 + Math.min(7, Math.floor(o[2 * q] * 8))]++; }
    return true;
  }
  const orbStats = (eps, age) => { if (!orbPositions(eps, age)) return { voids: 0, dense: 0, ratio: 1, ready: false }; const m = NP / 64; let voids = 0, dense = 0, mx = 0; for (let b = 0; b < 64; b++) { if (ORB.blk[b] <= 0.3 * m) voids++; if (ORB.blk[b] >= 3 * m) dense++; mx = Math.max(mx, ORB.blk[b]); } return { voids, dense, ratio: mx / m, ready: true }; };
  const DCOL = ['#1d4ed8', '#60a5fa', '#cbd5e1', '#fde68a', '#fb923c', '#ef4444'];
  function drawOrigin(dt, t) {
    const L = LOri(), P = L.P, I = L.I, O = S.or, bx = L.box;
    if (O.play) { O.age = Math.min(138, O.age + dt * 22); if (O.age >= 138) O.play = false; setSlider($('#sAge'), $('#oAge'), Math.round(O.age), (v) => v + '억 년'); }
    O.ageD = approach(O.ageD, O.age, dt, 10); O.epsD = approach(O.epsD, O.eps, dt, 10);
    const eps = O.eps, age = O.ageD;
    const ready = orbPositions(eps, age);
    darkP(P.x, P.y, P.w, P.h);
    T(P.x + 14, P.y + 28 * FS, '🧪 ±' + eps + ' % 요동 · 우주 나이 ' + f1(age) + '억 년', PHONE ? 12 : 14.5, '#e2e8f0', 'left', 800);
    ctx.fillStyle = '#05091a'; rr(bx.x, bx.y, bx.s, bx.s, 8).fill();
    if (!ready) { T(bx.x + bx.s / 2, bx.y + bx.s / 2, '중력 계산 중…', 18, '#cbd5e1', 'center', 800); }
    const o = ORB.buf, buckets = [[], [], [], [], [], []];
    for (let q = 0; q < NP; q++) { const cx = Math.min(31, Math.floor(o[2 * q] * 32)), cy = Math.min(31, Math.floor(o[2 * q + 1] * 32)), c = ORB.cnt[cy * 32 + cx], bi = c <= 1 ? 0 : c <= 2 ? 1 : c <= 6 ? 2 : c <= 12 ? 3 : c <= 24 ? 4 : 5; buckets[bi].push(q); }
    const ps = PHONE ? 2.2 : 2.6;
    if (ready) buckets.forEach((arr, bi) => { ctx.fillStyle = DCOL[bi]; arr.forEach((q) => { ctx.fillRect(bx.x + o[2 * q] * bx.s - ps / 2, bx.y + o[2 * q + 1] * bx.s - ps / 2, ps, ps); }); });
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.8; rr(bx.x, bx.y, bx.s, bx.s, 8).stroke();
    T(bx.x + bx.s - 6, bx.y + bx.s - 8, '한 변 약 ' + (PHONE ? '100' : '100') + ' Mpc 상자 (모형)', 11, '#94a3b8', 'right', 700);
    panel(I.x, I.y, I.w, I.h, { r: 14 });
    const st = orbStats(eps, age), a = aOfAge(age), z = 1 / a - 1;
    T(I.x + 14, I.y + 26 * FS, '📊 지금 모습', 14, '#1e293b', 'left', 800);
    const rows = [['우주 나이', f1(age) + '억 년'], ['적색 편이 z', z < 10 ? f1(z) : f0(z)], ['빈 곳 칸 (평균의 30 % 이하)', st.voids + ' / 64'], ['밀한 칸 (평균의 3배 이상)', st.dense + ' / 64']];
    rows.forEach((r, i) => { const y = I.y + 56 * Math.min(FS, 1.1) + i * (PHONE ? 32 : 34); T(I.x + 14, y, r[0], PHONE ? 11.5 : 12.5, '#475569', 'left', 800); T(I.x + I.w - 14, y + (PHONE ? 0 : 17), r[1], PHONE ? 13 : 15, '#0f172a', PHONE ? 'right' : 'right', 800); });
    // 색 범례
    const ly = I.y + I.h - (PHONE ? 118 : 238);
    T(I.x + 14, ly, '점 색 = 둘레의 밀도', 12, '#475569', 'left', 800);
    ['매우 낮음 (보이드)', '낮음', '평균 근처', '조금 높음', '높음', '매우 높음 (은하단)'].forEach((l, i) => { const y = ly + 18 + i * 20; ctx.fillStyle = DCOL[i]; ctx.fillRect(I.x + 14, y - 9, 12, 12); T(I.x + 32, y + 1, l, 11.5, '#334155', 'left', 700); });
    if (!PHONE) drawWrap(I.x + 14, I.y + I.h - 104, '실제 우주의 초기 요동은 약 10⁻⁵로 훨씬 작아요. 모형은 보기 쉽게 크게 줬어요.', I.w - 28, 11.5, { color: '#b45309', weight: 800 });
    else drawWrap(I.x + 14, I.y + I.h - 30, '실제 초기 요동은 약 10⁻⁵예요. 모형은 크게 줬어요.', I.w - 28, 11, { color: '#b45309', weight: 800 });
  }

  /* =========================================================
     컨트롤 · 입력 · 장면 전환
     ========================================================= */
  function setView(v) { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); } updateCtl(); }
  const nGrOK = () => { const c = gridInfo(16).cells.get(MISSION_CELL); return numOf('inN') === c.n; };
  function updateCtl() {
    const free = FREE(), v = S.view;
    $('#modeSeg').hidden = !free;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.view === v));
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(v); });
    $('#calcN').hidden = !(v === 'grid' && (S.flags.calcN || free));
    $('#calcD').hidden = !(v === 'grid' && (S.flags.calcD || free));
    $('#calcT').hidden = !(v === 'struct' && (S.flags.calcT || free));
    $('#sS').disabled = S.gr.lock && !free;
    $('#tbLabel').textContent = VIEW_LABEL[v];
    $$('#grpMark .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === S.mp.mode));
    $$('#grpRand .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.mp.mixT));
    $$('#grpFog .opt').forEach((b) => b.classList.toggle('on', +b.dataset.k === S.st.fogT));
    $('#bPlay').textContent = S.or.play ? '⏸ 멈춤' : '▶ 재생';
    $('#oS').textContent = $('#sS').value + ' Mpc';
  }
  $$('#grpMark .opt').forEach((b) => clickable(b, () => { S.mp.mode = b.dataset.k; updateCtl(); }));
  clickable($('#bClear'), () => { S.mp.mk = []; updateCtl(); });
  $$('#grpRand .opt').forEach((b) => clickable(b, () => { S.mp.mixT = +b.dataset.k; updateCtl(); }));
  $$('#grpFog .opt').forEach((b) => clickable(b, () => { S.st.fogT = +b.dataset.k; updateCtl(); }));
  bindSlider($('#sZ'), $('#oZ'), (v) => '×' + f1(v), (v) => { S.mp.zT = v; });
  bindSlider($('#sS'), $('#oS'), (v) => v + ' Mpc', (v) => { S.gr.s = v; S.gr.fill = 0; S.gr.sel = null; });
  bindSlider($('#sEps'), $('#oEps'), (v) => '±' + v + ' %', (v) => { S.or.eps = v; });
  bindSlider($('#sAge'), $('#oAge'), (v) => v + '억 년', (v) => { S.or.age = v; S.or.play = false; updateCtl(); });
  clickable($('#bPlay'), () => { if (S.or.age >= 138) { S.or.age = 1; $('#sAge').value = 1; } S.or.play = !S.or.play; updateCtl(); });
  $('#inN').addEventListener('input', () => { if (nGrOK()) { S.gr.nOK = true; fbIn('inN', true); } });
  $('#inDl').addEventListener('input', () => { const c = gridInfo(16).cells.get(MISSION_CELL); if (near(numOf('inDl'), c.d, 0.8)) { S.gr.dOK = true; fbIn('inDl', true); } });
  $('#inT').addEventListener('input', () => { if (near(numOf('inT'), 200 * MPC_LY / 100, 0.35)) { S.st.tOK = true; fbIn('inT', true); } });

  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'map') { const P = LMap().P; if (p.x >= P.x && p.x <= P.x + P.w && p.y >= P.y + 40 && p.y <= P.y + P.h) { S.mp.down = { x: p.x, y: p.y, cx: S.mp.cx, cy: S.mp.cy, moved: false }; return true; } return false; }
      if (S.view === 'grid') { const r = cGr.down(p); if (r) return true; const c = cellAt(p); if (c) { S.gr.sel = c.key; updateCtl(); } return false; }
      if (S.view === 'struct') { const r = cSt.down(p); updateCtl(); return r; }
      return false;
    },
    move(p) {
      if (S.view === 'map' && S.mp.down) { const d = S.mp.down, K = mapT().K; if (!d.moved && Math.hypot(p.x - d.x, p.y - d.y) > 7) d.moved = true; if (d.moved && S.mp.z > 1.01) { S.mp.cx = d.cx - (p.x - d.x) / K; S.mp.cy = d.cy + (p.y - d.y) / K; } }
      else if (S.view === 'grid') cGr.move(p); else if (S.view === 'struct') cSt.move(p);
    },
    up(p) {
      if (S.view === 'map') { const d = S.mp.down; S.mp.down = null; if (d && !d.moved) { const w = mapT().inv(p.x, p.y), r = Math.hypot(w.r, w.t), th = Math.atan2(w.t, w.r) / DEG; if (w.r > 0 && Math.abs(th) <= THMAX + 0.5 && r <= RMAX + 5) placeMark(w.r, w.t); } }
      else if (S.view === 'grid') { cGr.up(p); updateCtl(); } else if (S.view === 'struct') { cSt.up(p); updateCtl(); }
    },
    hover(p) {
      if (S.view === 'map') return 'crosshair';
      if (S.view === 'grid') return cGr.hit(p) ? 'pointer' : (cellAt(p) ? 'pointer' : '');
      if (S.view === 'struct') return cSt.hit(p) ? 'pointer' : '';
      return '';
    },
  });
  const setPhoneTouch = () => { if (PHONE) view.canvas.style.touchAction = S.view === 'map' && S.mp.z > 1.05 ? 'none' : 'pan-y'; };

  /* ================= 미션 ================= */
  const nbar16 = () => gridInfo(16).nbar;
  const mcell = () => gridInfo(16).cells.get(MISSION_CELL);
  const dTxt = (d) => (d >= 0 ? '+' : '−') + f1(Math.abs(d));
  const levels = [
    {
      title: '은하 지도: 몰린 곳과 빈 곳', short: '은하 지도', icon: '🗺️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 우주는 은하가 고르게 퍼진 공간일까? 아니라면 어떤 모양일까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시들에서</b> 적색 편이 탐사로 은하 400개의 <b>쐐기 도표</b>를 그렸고, 은하군·은하단과 초은하단의 규모를 알아봤어요. 이번에는 전천 탐사로 얻은 <b>은하의 공간 분포</b>에서 구조를 직접 찾아봐요.</div>' +
        '<p>쐐기 도표(이번에는 옆으로 눕혔어요)를 확대·이동하며 은하가 <b>몰린 곳</b>과 <b>빈 곳</b>을 눈으로 찾아 표시해요. 점을 무작위로 뿌린 그림과도 비교해 봐요.</p>',
      features: ['map'],
      setup() { setView('map'); S.mp.z = 1; S.mp.zT = 1; S.mp.cx = RMAX / 2; S.mp.cy = 0; S.mp.mixT = 0; S.mp.mix = 0; $('#sZ').value = 1; $('#oZ').textContent = '×1.0'; },
      recap: '은하는 고르게 퍼져 있지 않고 은하단(몰린 곳)과 보이드(빈 곳)가 그물처럼 얽혀 있어요. 무작위로 뿌린 점에는 이런 큰 덩어리와 빈 곳이 없어요.',
      summary: '<ul><li>쐐기 도표의 은하 분포는 <b>균일하지 않아요</b>: 은하가 몰린 <b>은하단</b>(3곳)과 은하가 거의 없는 <b>보이드</b>(3곳), 그리고 이들을 잇는 띠(필라멘트·장성)가 보여요.</li><li>점 400개를 <b>무작위로</b> 뿌리면 큰 덩어리도 넓은 빈 곳도 없이 비교적 고르게 흩어져요.</li><li>그래서 실제 우주의 은하 분포는 <b>거품(스펀지)·그물 모양</b>이에요.</li></ul>',
      missions: [
        {
          title: '은하단 3곳과 보이드 3곳 표시하기',
          goal: '쐐기 도표에서 은하가 <b>몰린 곳 3곳</b>(● 은하단)과 은하가 거의 없는 <b>빈 곳 3곳</b>(○ 보이드)을 눌러 표시하세요.',
          hint: '도구에서 ● / ○를 고른 뒤 도표를 눌러요. 점이 아주 빽빽한 곳(은하단)과 둥글게 비어 있는 넓은 곳(보이드)을 찾아요. 확대하면 더 잘 보여요.',
          setup() { setView('map'); S.mp.mk = []; S.mp.mixT = 0; updateCtl(); },
          check: () => markersOK().filter((m) => m.kind === 'c').length === 3 && markersOK().filter((m) => m.kind === 'v').length === 3,
          hold: 0.8,
          status: () => mark(markersOK().filter((m) => m.kind === 'c').length === 3) + ' 은하단 ' + markersOK().filter((m) => m.kind === 'c').length + ' / 3 &nbsp; ' + mark(markersOK().filter((m) => m.kind === 'v').length === 3) + ' 보이드 ' + markersOK().filter((m) => m.kind === 'v').length + ' / 3',
          explain: '은하단은 가까운 곳(약 72 Mpc)과 먼 곳 2곳(약 220 · 274 Mpc)에서, 보이드는 지름 약 32~50 Mpc의 넓은 빈 곳 3곳에서 찾았어요. 은하는 뭉치거나 비어 있는 곳이 뚜렷해요.',
        },
        {
          type: 'quiz', title: '무작위 분포와 실제 분포 비교',
          goal: '도구의 <b>🎲 무작위 점</b>을 눌러 실제 분포와 비교해 보세요. 은하가 우주에 고르게 흩어져 있다면 어떤 모습일까요?',
          setup() { setView('map'); updateCtl(); },
          choices: ['큰 덩어리와 넓은 빈 곳이 없이 비교적 고르게 흩어진 모습이에요', '실제와 똑같이 은하단과 보이드가 생겨요', '모든 점이 한 곳에 뭉쳐요', '은하는 원래부터 지금과 같은 그물 모양이에요'],
          answer: 0,
          feedback: ['', '무작위 점에서는 우연히 몇 개 모일 뿐 은하단이나 지름 수십 Mpc의 빈 곳은 생기지 않아요. 실제 분포는 훨씬 뚜렷한 구조예요.', '무작위로 뿌리면 한 곳에 뭉치지 않고 퍼져요.', '은하가 처음부터 그물 모양이었던 것은 아니에요. 4단계에서 자라는 과정을 볼 거예요.'],
          explain: '실제 은하 분포에는 <b>거품·그물 모양</b>의 구조가 있어요. 무작위로 흩어졌다면 이런 구조가 없었을 거예요. 구조가 있다는 것은 은하가 모이게 만든 원인이 있었다는 뜻이에요.',
        },
      ],
    },
    {
      title: '밀도 분석: 칸마다 은하를 세어요', short: '밀도 분석', icon: '🔢', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 눈으로 몰린 곳과 빈 곳을 찾았어요. 이번에는 도표를 <b>격자 셀</b>로 나누어 칸마다 은하를 세어, 구조를 <b>숫자로</b> 알아봐요.</div>' +
        '<p>셀의 은하 수 <b>n</b>과 전체 평균 <b>n̄</b>로 <b>밀도 대비 δ = (n − n̄) / n̄</b>를 구해요. 은하단은 δ ≫ 1, 필라멘트·장성은 δ ≈ +1~+3, 보이드는 δ ≈ −0.7~−1이에요.</p>',
      features: ['grid'],
      setup() { setView('grid'); S.gr.s = 16; $('#sS').value = 16; S.gr.fill = 0.5; S.gr.sel = MISSION_CELL; S.gr.hide = false; },
      recap: '셀의 은하 수를 평균과 비교한 밀도 대비 δ로 구조를 구분해요. 은하단은 δ가 +수~+10 이상이고, 필라멘트·장성은 +1~+3, 보이드는 −1에 가까워요.',
      summary: () => '<ul><li>도표를 한 변 <b>16 Mpc</b>의 셀로 나누면 분석한 셀 ' + gridInfo(16).list.length + '개, 셀 평균 <b>n̄ = ' + f1(nbar16()) + '</b>이에요.</li><li><b>밀도 대비 δ = (n − n̄) / n̄</b>. 예) 은하 ' + mcell().n + '개인 셀: δ = (' + mcell().n + ' − ' + f1(nbar16()) + ') / ' + f1(nbar16()) + ' ≈ <b>' + dTxt(mcell().d) + '</b>.</li><li><b>은하단</b> 셀 δ ≫ 1(n이 17개 이상), <b>필라멘트·장성</b> 셀 δ ≈ +1~+3(n이 7~12개), <b>보이드</b> 셀 δ ≈ −0.7~−1(n이 0~1개).</li><li>셀 크기를 너무 작게 하면 셀마다 은하가 거의 없고, 너무 크게 하면 구조가 평균에 묻혀요. 구조 크기에 맞는 규모를 골라요.</li></ul>',
      missions: [
        {
          title: '노란 칸의 은하 수 n 세기',
          goal: '노란 테두리의 셀(먼 은하단의 가운데)을 오른쪽 확대 그림으로 보고, 셀 안의 <b>은하 수 n</b>을 세어 입력하세요.',
          hint: '확대 그림의 노란 점이 은하예요. 하나씩 세어 보세요. (n은 20개보다 많아요)',
          setup() { setView('grid'); S.gr.s = 16; setSlider($('#sS'), $('#oS'), 16, (v) => v + ' Mpc'); S.gr.lock = false; S.gr.sel = MISSION_CELL; S.gr.hide = true; S.gr.nOK = false; S.gr.dOK = false; S.flags.calcN = true; S.flags.calcD = false; clrIn('inN', 'inDl'); S.gr.fill = 0; updateCtl(); },
          check: () => S.gr.nOK,
          hold: 0.5,
          status: () => mark(S.gr.nOK) + ' n = ' + ($('#inN').value.trim() || '—') + '개',
          explain: '이 셀에는 은하가 <b>24개</b> 있어요. 평균(n̄ = ' + '3.3' + ')보다 훨씬 많은 셀이에요.',
        },
        {
          title: '이 셀의 밀도 대비 δ 구하기',
          goal: 'n = 24, n̄ (전체 평균, 화면에 표시)로 <b>δ = (n − n̄) / n̄</b>를 계산해 입력하세요. (소수 첫째 자리까지)',
          hint: 'δ = (24 − 3.3) / 3.3 ≈ 6.3이에요(n̄ = 3.31로 계산하면 6.2). n̄는 오른쪽 숫자 칸에 표시돼요.',
          setup() { setView('grid'); S.gr.s = 16; setSlider($('#sS'), $('#oS'), 16, (v) => v + ' Mpc'); S.gr.lock = false; S.gr.sel = MISSION_CELL; S.gr.hide = true; S.gr.nOK = true; S.gr.dOK = false; S.flags.calcN = true; S.flags.calcD = true; clrIn('inDl'); updateCtl(); },
          check: () => S.gr.dOK,
          hold: 0.5,
          status: () => mark(S.gr.dOK) + ' δ = ' + ($('#inDl').value.trim() || '—'),
          explain: 'δ = (24 − 3.3) / 3.3 ≈ <b>+6.3</b>이에요(n̄ = 3.31로 계산하면 +6.2). 이 셀의 은하 밀도는 평균보다 약 7배 높아요(δ = +6.2는 평균의 1 + 6.2 = 7.2배).',
        },
        {
          title: '셀 6개를 구조별로 분류', manual: true,
          goal: '셀 카드 6장을 <b>은하단 · 필라멘트·장성 · 보이드</b> 상자로 나누세요. (카드를 누르면 도표에서 그 셀이 하늘색으로 표시돼요)',
          hint: 'δ ≫ 1(n이 17개 이상)은 은하단, δ가 +1~+3(n 7~12개)은 필라멘트·장성, δ가 −1에 가까운(n 0~1개)은 보이드예요.',
          setup() { setView('grid'); S.gr.s = 16; setSlider($('#sS'), $('#oS'), 16, (v) => v + ' Mpc'); S.gr.lock = true; S.gr.hide = false; S.gr.sel = null; cGr.reset(); S.gr.fill = 0; updateCtl(); },
          check() {
            const pl = cGr.items.filter((i) => i.loc != null).length;
            if (pl < 6) return '아직 상자에 넣지 않은 카드가 ' + (6 - pl) + '장 있어요.';
            const bad = cGr.items.filter((i) => !cGr.isRight(i));
            return bad.length ? '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요. n과 δ를 기준과 비교해 보세요.' : true;
          },
          status: () => mark(cGr.counts().placed === 6) + ' 분류 ' + cGr.counts().placed + ' / 6 &nbsp; ' + mark(cGr.counts().right === 6) + ' 맞게 ' + cGr.counts().right + ' / 6',
          explain: 'δ가 매우 큰 셀은 <b>은하단</b>, δ가 +1~+3인 셀은 <b>필라멘트·장성</b>, 은하가 거의 없는 δ ≈ −1인 셀은 <b>보이드</b>예요. 숫자로 구조를 구분할 수 있어요.',
        },
      ],
    },
    {
      title: '큰 구조: 장성 · 보이드 · 초은하단', short: '큰 구조', icon: '🏗️', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 셀의 밀도로 은하단·필라멘트·보이드를 구분했어요. 이번에는 우주의 거시적 구조의 <b>이름과 크기</b>를 정리하고, 지도에서 은하단이 <b>길쭉하게</b> 보이는 까닭을 알아봐요.</div>' +
        '<p><b>크기</b>: 은하단 약 10 Mpc, 보이드 20~100 Mpc, 초은하단 30~100 Mpc 이상, CfA 장성 길이 약 200 Mpc, 슬론 장성 길이 약 400 Mpc. 1 Mpc = 326만 광년이에요.</p>',
      features: ['struct'],
      setup() { setView('struct'); },
      recap: '장성과 보이드는 수십~수백 Mpc 규모의 구조예요. 구조가 클수록 우주 팽창의 영향을 받아요. 은하단이 시선 방향으로 늘어나 보이는 신의 손가락은 은하의 무작위 속도가 거리로 잘못 환산된 거예요.',
      summary: '<ul><li><b>크기</b>: 은하단 약 10 Mpc · 보이드 20~100 Mpc · 초은하단 30~100 Mpc 이상 · <b>CfA 장성</b>(1989) 길이 약 200 Mpc, 폭 약 60 Mpc, 두께 약 5 Mpc · <b>슬론 장성</b>(2003) 길이 약 400 Mpc.</li><li>1 Mpc = 326만 광년: 200 Mpc = 6.5억 광년이라 빛이 CfA 장성을 가로지르는 데 <b>약 6.5억 년</b>이 걸려요.</li><li>장성·보이드·초은하단은 H₀d가 은하의 무작위 속도보다 훨씬 커서 <b>우주 팽창의 영향을 받는 규모</b>예요(은하단은 중력으로 묶여요).</li><li><b>신의 손가락</b>: 은하단 속 은하의 무작위 속도 약 1000 km/s가 적색 편이에 섞여 시선 방향으로 약 σ/H₀ = 1000 / 70 ≈ 14 Mpc 늘어나 보여요.</li></ul>',
      missions: [
        {
          title: '구조 이름과 크기 연결', manual: true,
          goal: '구조 카드 5장을 알맞은 <b>크기 상자</b>에 놓으세요.',
          hint: '은하단 약 10 Mpc, 보이드 20~100 Mpc, 초은하단 30~100 Mpc 이상, CfA 장성 길이 약 200 Mpc, 슬론 장성 길이 약 400 Mpc예요.',
          setup() { setView('struct'); cSt.reset(); S.st.order = false; updateCtl(); },
          check() {
            const pl = cSt.items.filter((i) => i.loc != null).length;
            if (pl < 5) return '아직 놓지 않은 카드가 ' + (5 - pl) + '장 있어요.';
            const bad = cSt.items.filter((i) => !cSt.isRight(i));
            if (bad.length) return '빨간 테두리 카드 ' + bad.length + '장이 알맞지 않아요.';
            S.st.order = true; return true;
          },
          status: () => mark(cSt.counts().placed === 5) + ' 연결 ' + cSt.counts().placed + ' / 5 &nbsp; ' + mark(cSt.counts().right === 5) + ' 알맞게 ' + cSt.counts().right + ' / 5',
          explain: '<b>은하단 약 10 Mpc</b>, <b>보이드 20~100 Mpc</b>, <b>초은하단 30~100 Mpc 이상</b>, <b>CfA 장성 약 200 Mpc</b>, <b>슬론 장성 약 400 Mpc</b>예요. 오른쪽 표에서 각 구조의 H₀d와 팽창의 영향도 비교해 보세요.',
        },
        {
          title: 'CfA 장성을 빛이 가로지르는 시간',
          goal: 'CfA 장성의 길이는 <b>200 Mpc</b>예요. 1 Mpc = 326만 광년일 때 빛이 가로지르는 데 걸리는 시간을 <b>억 년</b> 단위로 구해 입력하세요.',
          hint: '200 × 3.26 = 652(백만 광년) = 6.52억 광년이고, 빛은 1년에 1광년을 가요. 약 6.5억 년이에요.',
          setup() { setView('struct'); S.flags.calcT = true; S.st.order = true; S.st.tOK = false; clrIn('inT'); updateCtl(); },
          check: () => S.st.tOK,
          hold: 0.5,
          status: () => mark(S.st.tOK) + ' 시간 = ' + ($('#inT').value.trim() || '—') + '억 년',
          explain: '200 Mpc × 326만 광년 = 6.52억 광년이라 빛으로도 약 <b>6.5억 년</b>이 걸려요. 슬론 장성(400 Mpc)은 약 13억 년이에요.',
        },
        {
          type: 'quiz', title: '은하단이 시선 방향으로 길쭉하게 보이는 까닭',
          goal: '도구의 <b>🔭 적색 편이로 본 위치</b>를 켜면 은하단이 시선 방향으로 <b>길쭉하게</b> 보여요. 그 까닭은?',
          setup() { setView('struct'); S.st.order = true; S.st.fogT = 1; updateCtl(); },
          choices: ['은하의 무작위 속도가 적색 편이에 섞여 거리로 잘못 환산되기 때문이에요', '은하단이 실제로 시선 방향으로 길쭉한 모양이기 때문이에요', '멀리 있는 은하는 항상 더 길게 보이기 때문이에요', '측광 z의 오차가 커서 거리가 뭉개지기 때문이에요'],
          answer: 0,
          feedback: ['', '실제 은하단은 둥근 덩어리예요. 늘어나는 것은 우리가 적색 편이로 계산한 거리 위치뿐이에요.', '같은 은하단의 위치가 한 방향으로만 늘어나는 이유는 거리와 상관없어요. 시선 방향의 속도 효과예요.', '이 지도는 분광 z를 쓴 거예요. 오차는 작아요. 문제는 적색 편이에 은하의 실제 운동이 섞인다는 점이에요.'],
          explain: '은하단 속 은하는 약 1000 km/s로 무작위로 움직여요. 이 속도가 적색 편이에 더해져 거리로 환산되면 σ / H₀ = 1000 / 70 ≈ <b>14 Mpc</b>만큼 시선 방향으로 흩어져 보이고, 이것이 <b>신의 손가락</b>이에요.',
        },
      ],
    },
    {
      title: '구조 기원: 작은 요동이 자라요', short: '구조 기원', icon: '🧪', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 우주에는 은하단·장성·보이드가 거품 모양으로 얽혀 있다는 것을 알았어요. 이 구조는 어디서 왔을까요? 지구과학에서 배운 <b>우주 배경 복사의 작은 온도 요동(ΔT/T ≈ 10⁻⁵)</b>이 씨앗이에요.</div>' +
        '<p>거의 균일한 입자 분포에 <b>작은 요동</b>(±5 %)을 주고, 중력이 시간이 흐르며 어떻게 구조를 키우는지 봐요. 요동을 <b>0 %</b>로 하면 어떻게 될까요?</p>',
      features: ['origin'],
      setup() { setView('origin'); S.or.eps = 5; S.or.age = 138; S.or.ageD = 138; S.or.epsD = 5; S.or.play = false; setSlider($('#sEps'), $('#oEps'), 5, (v) => '±' + v + ' %'); setSlider($('#sAge'), $('#oAge'), 138, (v) => v + '억 년'); },
      recap: '거의 균일한 우주의 작은 요동이 중력으로 자라 은하단·필라멘트·보이드가 되었어요. 요동이 없으면 구조도 생기지 않아요.',
      summary: '<ul><li>초기 우주는 거의 균일했어요: 우주 배경 복사의 온도 요동 <b>ΔT/T ≈ 10⁻⁵</b>, 밀도 요동도 약 10⁻⁵ 정도예요.</li><li><b>중력</b>이 조금 밀한 곳으로 주변을 끌어당겨 더 밀하게 만들고, 빈 곳은 더 비게 만들어 <b>시간이 흐르며 요동이 자라요</b>. 그 결과가 현재의 은하단(교점)·필라멘트·장성·보이드예요.</li><li>요동이 <b>0 %</b>이면 중력이 균일하게 작용해 구조가 생기지 않아요.</li><li>수백 Mpc보다 큰 규모에서는 어디서나 평균 밀도가 거의 같아서 우주는 큰 규모에서 균일해요. 관측 가능한 우주(반지름 약 14000 Mpc)에 비하면 가장 큰 구조도 작아요.</li></ul>',
      missions: [
        {
          title: '요동 5 %에서 시간을 늘려 보이드 만들기',
          goal: '요동을 <b>±5 %</b>로 두고 우주 나이를 <b>100억 년 이상</b>으로 늘려, <b>빈 곳 칸이 6칸 이상</b> 생기고 <b>밀한 칸이 생기는지</b> 확인하세요.',
          hint: '우주 나이 슬라이더를 오른쪽으로 옮기거나 ▶ 재생을 눌러요. 처음에는 거의 균일하다가 시간이 지나며 구조가 자라요.',
          setup() { setView('origin'); S.or.eps = 5; S.or.age = 6; S.or.ageD = 6; S.or.epsD = 5; S.or.play = false; setSlider($('#sEps'), $('#oEps'), 5, (v) => '±' + v + ' %'); setSlider($('#sAge'), $('#oAge'), 6, (v) => v + '억 년'); updateCtl(); },
          check: () => { if (S.or.eps !== 5 || S.or.ageD < 100) return false; const st = orbStats(5, S.or.ageD); return st.voids >= 6 && st.dense >= 1; },
          hold: 0.8,
          status: () => { const st = orbStats(S.or.eps, S.or.ageD); return mark(S.or.eps === 5) + ' 요동 ±' + S.or.eps + ' % &nbsp; ' + mark(S.or.ageD >= 100) + ' 나이 ' + f0(S.or.ageD) + '억 년 &nbsp; ' + mark(st.voids >= 6) + ' 빈 곳 ' + st.voids + '칸 &nbsp; ' + mark(st.dense >= 1) + ' 밀한 칸 ' + st.dense + '칸'; },
          explain: '시간이 흐르면 밀도가 조금 높은 곳으로 입자가 모여 <b>필라멘트와 은하단</b>이 되고, 빈 곳은 점점 커져 <b>보이드</b>가 돼요. 쐐기 도표와 비슷한 그물 모양이에요.',
        },
        {
          title: '요동 0 %에서는 구조가 안 생겨요',
          goal: '요동을 <b>0 %</b>로 바꾸고 우주 나이를 <b>100억 년 이상</b>으로 두어, 구조가 생기지 않는 것을 확인하세요.',
          hint: '요동 슬라이더를 0 %로 내리고 나이 슬라이더를 오른쪽 끝으로 옮겨요.',
          setup() { setView('origin'); S.or.eps = 5; S.or.age = 138; S.or.play = false; setSlider($('#sEps'), $('#oEps'), 5, (v) => '±' + v + ' %'); setSlider($('#sAge'), $('#oAge'), 138, (v) => v + '억 년'); updateCtl(); },
          check: () => { if (S.or.eps !== 0 || S.or.ageD < 100) return false; const st = orbStats(0, S.or.ageD); return st.voids === 0 && st.dense === 0; },
          hold: 0.8,
          status: () => { const st = orbStats(S.or.eps, S.or.ageD); return mark(S.or.eps === 0) + ' 요동 ±' + S.or.eps + ' % &nbsp; ' + mark(S.or.ageD >= 100) + ' 나이 ' + f0(S.or.ageD) + '억 년 &nbsp; ' + mark(st.voids === 0 && st.dense === 0) + ' 빈 곳 ' + st.voids + ' · 밀한 칸 ' + st.dense; },
          explain: '완전히 균일한 우주에서는 모든 방향의 중력이 서로 상쇄되어 <b>입자가 모이지 않아요</b>. 구조가 생기려면 아주 작더라도 <b>처음 요동</b>이 있어야 해요.',
        },
        {
          type: 'quiz', title: '거의 균일했던 우주에 구조가 생긴 까닭',
          goal: '초기 우주는 거의 균일했는데 지금 은하가 <b>뭉쳐 있는</b> 까닭은?',
          setup() { setView('origin'); S.or.age = 138; updateCtl(); },
          choices: ['작은 밀도 요동이 중력으로 시간이 흐르며 자랐기 때문이에요', '우주는 처음부터 지금과 같은 그물 모양이었기 때문이에요', '우주 팽창이 은하를 한곳으로 모았기 때문이에요', '빛이 은하를 끌어당겨 뭉치게 했기 때문이에요'],
          answer: 0,
          feedback: ['', '초기 우주는 거의 균일했어요(우주 배경 복사). 지금의 그물 모양은 시간이 흐르며 만들어졌어요.', '팽창은 은하 사이를 멀어지게 해요. 모으는 것은 중력이에요.', '빛(복사)의 압력이 구조를 만든 것이 아니라, 물질(암흑 물질 포함)의 중력이 요동을 키웠어요.'],
          explain: '조금 밀한 곳은 중력이 조금 더 커서 주변을 끌어당겨 <b>더 밀해지고</b>, 빈 곳은 더 비게 돼요. 이렇게 <b>작은 요동이 중력으로 자라</b> 은하단·장성·보이드가 만들어졌어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hu-cosmic-web', mount: '#game', badge: '우주 그물 탐험가', homeHref: '../../index.html#hu',
    featureLabels: { map: '🗺️ 확대·이동 · 은하단/보이드 표시 · 무작위 비교', grid: '🔢 격자 셀 · 밀도 대비 δ 색 지도', struct: '🏗️ 구조 이름·크기 카드 · 신의 손가락', origin: '🧪 요동 · 우주 나이 슬라이더 (입자 모형)' },
    onFeatures() { updateCtl(); },
    levels,
  });
  levels.forEach((lv) => { if (typeof lv.summary === 'function') lv.summary = lv.summary(); });

  /* ================= 읽음 칸 ================= */
  function readouts() {
    const v = S.view;
    if (v === 'map') { const nc = markersOK().filter((m) => m.kind === 'c').length, nv = markersOK().filter((m) => m.kind === 'v').length; setReadouts(['표시한 은하단', nc + ' / 3', '표시한 보이드', nv + ' / 3', '확대', '×' + f1(S.mp.z)]); }
    else if (v === 'grid') { const G = gridInfo(S.gr.s), c = S.gr.sel && G.cells.get(S.gr.sel); setReadouts(['셀 한 칸', S.gr.s + ' Mpc', '전체 평균 n̄', f1(G.nbar), '고른 셀의 n', c && (!cellHidden(c) || S.gr.nOK) ? String(c.n) : '—']); }
    else if (v === 'struct') { const c = cSt.counts(); setReadouts(['연결한 카드', c.placed + ' / 5', '알맞게 연결', c.right + ' / 5', '신의 손가락', S.st.fogT ? '± ' + f0(FOG_MPC) + ' Mpc' : '꺼짐']); }
    else { const st = orbStats(S.or.eps, S.or.ageD); setReadouts(['초기 요동', '±' + S.or.eps + ' %', '우주 나이', f0(S.or.ageD) + '억 년', '빈 곳 칸', st.voids + ' / 64']); }
  }

  /* ================= 루프 ================= */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock += dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    setPhoneTouch();
    view.apply();
    ctx.fillStyle = '#e8eef8'; ctx.fillRect(0, 0, VW, VH);
    switch (S.view) {
      case 'map': drawMap(dt, S.clock); break;
      case 'grid': drawGrid(dt, S.clock); break;
      case 'struct': drawStruct(dt, S.clock); break;
      default: drawOrigin(dt, S.clock);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(232,238,248,' + (S.fade * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  window.__sim = { S, VW, VH, get game() { return game; }, setView, updateCtl, GAL, CT, VT, gridInfo, CELLCARDS, cGr, cSt, runSim, orbStats, placeMark, markersOK, MODES, STRU, FOG_MPC, aOfAge };

})();
