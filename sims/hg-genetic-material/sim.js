(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  /* ===== 공통 도구 (화면 · 글자 · 카드 분류) ===== */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const L = (a, b) => (PHONE ? b : a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const approach = SciSim.approach;
  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* 받침 유무에 따라 조사 고르기: josa('핵형', '은', '는') */
  function josa(w, a, b) { const ch = String(w).charCodeAt(String(w).length - 1); if (ch < 0xAC00 || ch > 0xD7A3) return b; return ((ch - 0xAC00) % 28) ? a : b; }
  let clock = 0;

  const BG = '#f1f6f3';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FONT_EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function E(ch, x, y, size, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = size + 'px ' + FONT_EMO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; ctx.fillText(ch, 0, 0); ctx.restore();
  }
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '', sp = -1;
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; sp = -1; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) {
        if (sp > 0 && ch !== ' ') { out.push(line.slice(0, sp).trimEnd()); line = line.slice(sp + 1) + ch; } else { out.push(line); line = ch.trim() === '' ? '' : ch; }
        sp = line.lastIndexOf(' ');
      } else { line = t; if (ch === ' ') sp = line.length - 1; }
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function fitSize(str, maxW, size, minS, weight) {
    ctx.save(); let s = size;
    while (s > minS) { ctx.font = D.font(s, weight || 800); if (ctx.measureText(str).width <= maxW) break; s -= 0.5; }
    ctx.restore(); return s;
  }
  /* 너비에 맞춰 글자 크기를 줄여 쓰기 */
  function TF(x, y, str, maxW, size, minS, color, align, weight, extra) {
    const s = fitSize(str, maxW, size, minS, weight); T(x, y, str, s, color, align, weight, extra); return s;
  }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700);
    ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
    return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function bgFill(top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  function callout(x1, y1, x2, y2, text, o) {
    o = o || {};
    D.dashedLine(x1, y1, x2, y2, { color: o.line || '#64748b', width: 1.6, dash: [4, 4] });
    ctx.fillStyle = o.line || '#64748b'; ctx.beginPath(); ctx.arc(x1, y1, 3, 0, TAU); ctx.fill();
    return D.label(x2, y2, text, { bg: o.bg || '#fff', color: o.color || '#1f2d44', border: o.border || '#cbd5e1', size: o.size || 13, align: o.align });
  }
  /* 시간 지연이 있는 효과(리셋 시 지울 수 있게 한 곳에서 관리) */
  const FX = { list: [] };
  FX.add = (e) => { e.age = -(e.delay || 0); FX.list.push(e); };
  FX.clear = () => { FX.list.length = 0; };
  FX.update = (dt) => { for (let i = FX.list.length - 1; i >= 0; i--) { const e = FX.list[i]; e.age += dt; if (e.age >= e.life) { FX.list.splice(i, 1); if (e.done) e.done(); } } };
  FX.draw = () => {
    FX.list.forEach((e) => {
      if (e.age < 0) return;
      const p = e.age / e.life;
      if (e.kind === 'text') T(e.x, e.y - 24 * p, e.text, e.size || 15, e.color || '#16a34a', 'center', 800, { alpha: 1 - p * p, stroke: '#fff', strokeWidth: 4 });
    });
  };

  /* 포인터를 현재 장면의 처리기로 넘겨요 */
  let PT = null;
  SciSim.pointer(view, {
    down(p, e) { return PT && PT.down ? !!PT.down(p, e) : false; },
    move(p, e) { if (PT && PT.move) PT.move(p, e); },
    up(p, e) { if (PT && PT.up) PT.up(p, e); },
    hover(p) { return PT && PT.hover ? PT.hover(p) : 'default'; },
  });

  /* ---------- 카드 그리기 ---------- */
  function drawCard(c) {
    ctx.save();
    const w = c.w, h = c.h, cx = c.x + w / 2, cy = c.y + h / 2;
    ctx.translate(cx, cy); const s = 1 + c.lift * 0.06; ctx.scale(s, s);
    const sh = c.shake > 0 && !RM ? Math.sin(clock * 60) * 3 * c.shake : 0; ctx.translate(sh, 0);
    const r = Math.min(12, h / 2.4);
    D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, r); ctx.fillStyle = c.bad ? '#fdeceb' : (c.sel ? '#fff8dc' : (c.fill || '#fff')); ctx.fill(); }, { blur: 5 + c.lift * 10, y: 2 + c.lift * 4 });
    ctx.strokeStyle = c.bad ? '#e2464b' : c.sel ? '#f59e0b' : C.shade(c.col || '#16a34a', 0.15); ctx.lineWidth = c.bad || c.sel ? 3 : 2; D.roundRect(-w / 2, -h / 2, w, h, r); ctx.stroke();
    const chip = h < 36;
    if (chip) {
      TF(0, 5, w > 300 ? c.label : (c.short || c.label), w - 10, clamp(h * 0.58, 11, 14), 10.5, '#26324a', 'center', 800);
    } else {
      let lx = -w / 2 + 10, maxW = w - 20;
      if (c.icon) { E(c.icon, -w / 2 + 24, 1, 22); lx = -w / 2 + 40; maxW = w - 48; }
      if (c.sub) {
        TF(lx, -2, c.label, maxW, 14.5, 12, '#26324a', 'left', 800);
        TF(lx, 16, c.sub, maxW, 12, 10.5, '#5a6679', 'left', 700);
      } else {
        const sz = fitSize(c.label, maxW, 14.5, 12.5, 800);
        ctx.save(); ctx.font = D.font(sz, 800);
        if (ctx.measureText(c.label).width > maxW && h >= 44) {
          const ls = wrap(c.label, maxW, 12.5, 800).slice(0, 2);
          ls.forEach((l, i) => T(lx, (ls.length === 1 ? 5 : -2 + i * 15), l, 12.5, '#26324a', 'left', 800));
        } else T(lx, 5, c.label, sz, '#26324a', 'left', 800);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /* ================= 카드 분류기 (끌어서 상자에 넣기, 눌러서 선택) =================
     o.cards: [{id, label, short, icon, col, sub}]   o.boxes: [{id, label, col, x, y, w, h, cols, hdr}]
     o.tray(i) -> {x, y}   o.cw, o.ch: 카드 크기   o.kh: 상자 속 칩 높이   o.onTap(card)   o.onChange() */
  class Sorter {
    constructor(o) {
      this.o = o; this.boxes = o.boxes; this.seq = 0; this.drag = null; this.hot = null;
      this.cards = o.cards.map((d, i) => { const p = o.tray(i); return Object.assign({}, d, { x: p.x, y: p.y, w: o.cw, h: o.ch, zone: null, lift: 0, bad: false, shake: 0, home: p, seq: 0, sel: false }); });
    }
    boxAt(p) { for (const b of this.boxes) if (inRect(p.x, p.y, b)) return b; return null; }
    chipRect(box, k, n) {
      const cols = box.cols || 2, gap = 6, rows = Math.max(1, Math.ceil(n / cols));
      const kw = (box.w - gap * (cols + 1)) / cols, hdr = box.hdr || 26, avail = box.h - hdr - 6;
      const sp = Math.min(this.o.kh + 4, avail / rows), col = k % cols, row = Math.floor(k / cols);
      return { x: box.x + gap + col * (kw + gap), y: box.y + hdr + 1 + row * sp, w: kw, h: Math.max(18, Math.min(this.o.kh, sp - 3)) };
    }
    layout(instant) {
      this.boxes.forEach((b) => {
        const mem = this.cards.filter((c) => c.zone === b.id).sort((a, c) => a.seq - c.seq);
        mem.forEach((c, k) => { if (this.drag && this.drag.c === c) return; const r = this.chipRect(b, k, mem.length); this.moveTo(c, r.x, r.y, r.w, r.h, instant); });
      });
      this.cards.forEach((c) => { if (!c.zone && !(this.drag && this.drag.c === c)) this.moveTo(c, c.home.x, c.home.y, this.o.cw, this.o.ch, instant); });
    }
    moveTo(c, x, y, w, h, instant) {
      if (instant || RM) { c.x = x; c.y = y; c.w = w; c.h = h; SciSim.tween(c, { x, y, w, h }, { duration: 0.0001 }); return; }   // 진행 중인 이동을 끝내요
      SciSim.tween(c, { x, y, w, h }, { duration: 0.35, ease: 'outBack' });
    }
    place(c, zoneId) {
      const was = c.zone; c.zone = zoneId || null; c.bad = false; if (zoneId) c.seq = ++this.seq; c.lift = 0;
      this.layout(); if (was !== c.zone) { Sound.click(); this.o.onChange && this.o.onChange(); }
    }
    reset() { this.cards.forEach((c) => { c.zone = null; c.bad = false; c.sel = false; }); this.drag = null; this.selected = null; this.layout(true); this.o.onChange && this.o.onChange(); }
    get placed() { return this.cards.filter((c) => c.zone).length; }
    markBad(ids) {
      this.cards.forEach((c) => { const bad = ids.indexOf(c.id) >= 0; if (bad && !c.bad) c.shake = 1; c.bad = bad; });
    }
    down(p) {
      for (let i = this.cards.length - 1; i >= 0; i--) {
        const c = this.cards[i];
        if (inRect(p.x, p.y, c)) {
          SciSim.tween(c, { x: c.x, y: c.y, w: c.w, h: c.h }, { duration: 0.0001 });
          this.drag = { c, dx: p.x - c.x, dy: p.y - c.y, sx: p.x, sy: p.y, moved: false };
          this.cards.splice(i, 1); this.cards.push(c); Sound.tick(); return true;
        }
      }
      return false;
    }
    move(p) {
      const d = this.drag; if (!d) return;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true;
      if (d.moved) { d.c.x = clamp(p.x - d.dx, 0, VW - d.c.w); d.c.y = clamp(p.y - d.dy, 0, VH - d.c.h); this.hot = this.boxAt(p); }
    }
    up(p) {
      const d = this.drag; if (!d) return; this.drag = null; this.hot = null; const c = d.c;
      if (!d.moved) { this.layout(); this.o.onTap && this.o.onTap(c); return; }
      const b = this.boxAt(p); this.place(c, b ? b.id : null); if (!b) this.layout();
    }
    hover(p) { return this.cards.some((c) => inRect(p.x, p.y, c)) ? 'grab' : 'default'; }
    update(dt) {
      this.cards.forEach((c) => { c.lift = approach(c.lift, this.drag && this.drag.c === c && this.drag.moved ? 1 : 0, dt, 14); c.shake = Math.max(0, c.shake - dt * 3); });
    }
    drawBoxes() {
      this.boxes.forEach((b) => {
        const hot = this.hot === b;
        D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = C.rgba(b.col, hot ? 0.28 : 0.13); ctx.fill();
        ctx.setLineDash([7, 5]); ctx.strokeStyle = C.rgba(b.col, hot ? 1 : 0.7); ctx.lineWidth = hot ? 3 : 2; ctx.stroke(); ctx.setLineDash([]);
        if (b.label) TF(b.x + b.w / 2, b.y + 19, b.label, b.w - 16, 14.5, 12, C.shade(b.col, -0.35), 'center', 800);
        if (b.draw) b.draw(b);
      });
    }
    drawCards() { this.cards.forEach((c) => { c.sel = !!(this.o.isSel && this.o.isSel(c)); drawCard(c); }); }
    draw() { this.drawBoxes(); this.drawCards(); }
  }

  /* 읽음 칸 (캔버스 아래 3칸) */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function setReads(a) {
    const k = a.join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = a[0]; v1.textContent = a[1]; l2.textContent = a[2]; v2.textContent = a[3]; l3.textContent = a[4]; v3.textContent = a[5];
  }
  /* 수 입력칸: 숫자만 읽어요 */
  function numOf(id) { const e = $('#' + id); if (!e) return NaN; const s = String(e.value).replace(/[^0-9.\-]/g, ''); return s === '' ? NaN : parseFloat(s); }
  /* 모드 버튼 (현재 단계의 것만 보여 줘요) */
  function modeButtons(cur, lvNow, free, setModeFn) {
    $$('#modeSeg button').forEach((b) => {
      const lv = +b.dataset.lv;
      b.classList.toggle('on', b.dataset.mode === cur);
      b.classList.toggle('lv-off', !free && lv !== lvNow);
    });
  }
  function bindModeSeg(setModeFn) {
    $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setModeFn(b.dataset.mode); }));
  }
  /* 칩 버튼 묶음: root 안의 button[data-v] 중 하나를 on */
  function chipSet(root, val) { $$('button', root).forEach((b) => b.classList.toggle('on', String(b.dataset.v) === String(val))); }


  /* ---------- 분수·퍼센트 입력 읽기: '1/4', '0.25', '25%', '4분의 1' ---------- */
  function parseFrac(s) {
    s = String(s == null ? '' : s).trim().replace(/\s+/g, '').replace(/,/g, '');
    if (!s) return NaN;
    let m = /^(\d+(?:\.\d+)?)분의(\d+(?:\.\d+)?)$/.exec(s);
    if (m) return +m[2] / +m[1];
    m = /^(\d+(?:\.\d+)?)[\/:](\d+(?:\.\d+)?)$/.exec(s);
    if (m) return +m[2] === 0 ? NaN : +m[1] / +m[2];
    m = /^(\d+(?:\.\d+)?)%$/.exec(s);
    if (m) return +m[1] / 100;
    m = /^(\d*\.?\d+)$/.exec(s);
    if (m) return +m[1];
    return NaN;
  }
  const fracIs = (s, target, tol) => { const v = parseFrac(s); return isFinite(v) && Math.abs(v - target) <= (tol == null ? 1e-3 : tol); };
  /* 모드 버튼: 현재 단계의 것만 보여 줘요 (data-lv) */
  function bindModes(setModeFn) { $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setModeFn(b.dataset.mode); })); }
  /* 간단한 막대 그리기 도우미: 값은 0~max 범위로 묶어요 */
  function barRect(x, base, w, v, max, hPx) { const hh = clamp(v / max, 0, 1) * hPx; return { x, y: base - hh, w, h: hh }; }
  function fmtN(n, d) { return Number(n).toLocaleString('ko-KR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  const pct = (a, b, d) => (b > 0 ? fmtN(a / b * 100, d == null ? 0 : d) + ' %' : '—');
  function dot(x, y, r, col, o) { D.sphere(x, y, r, col, o || {}); }
  /* 사람 아이콘(원 머리 + 몸) */
  function person(x, y, s, col, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.fillStyle = col; ctx.strokeStyle = o.line || C.shade(col, -0.25); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, -s * 0.62, s * 0.3, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.46, s * 0.55); ctx.quadraticCurveTo(-s * 0.46, -s * 0.2, 0, -s * 0.2); ctx.quadraticCurveTo(s * 0.46, -s * 0.2, s * 0.46, s * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  /* 염색체(막대 하나): 가운데가 잘록한 알약 모양 */
  function chromo(x, y, w, h, col, o) {
    o = o || {};
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, C.shade(col, 0.25)); g.addColorStop(0.5, col); g.addColorStop(1, C.shade(col, -0.2));
    ctx.fillStyle = g; D.roundRect(x - w / 2, y - h / 2, w, h, Math.min(w / 2, 10)); ctx.fill();
    ctx.strokeStyle = C.shade(col, -0.35); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }

  /* 카드를 누르면 선택, 상자를 누르면 놓기 (끌기가 어려운 기기를 위해) */
  function selectable(opts) {
    let so = null;
    opts.onTap = (c) => { so.selected = so.selected === c ? null : c; Sound.click(); if (opts.afterTap) opts.afterTap(c); };
    opts.isSel = (c) => !!so && so.selected === c;
    so = new Sorter(opts); so.selected = null;
    return so;
  }
  function sorterPT(get) {
    return {
      down(p) {
        const so = get();
        if (so.selected && !so.cards.some((c) => inRect(p.x, p.y, c))) {
          const b = so.boxAt(p), c = so.selected; so.selected = null;
          so.place(c, b ? b.id : null); return false;
        }
        return so.down(p);
      },
      move: (p) => get().move(p), up: (p) => get().up(p), hover: (p) => get().hover(p),
    };
  }


  /* =========================================================
     고등학교 생물의 유전 · Ⅰ. 유전자와 유전물질 - 유전 물질 규명 실험 (단원 59, 6차시)
     성취기준 [12유전01-05] DNA의 구조와 유전물질 규명 관련 과학사적 연구 결과를 설명하기 위한 발표 자료를 창의적으로 제작할 수 있다. (앞부분: 유전 물질 규명)
     ① 실험: 형질 전환  ② 실험: 허시 · 체이스  ③ 탐구: DNA 추출  ④ 분석: 증거 종합
     (실험 결과의 숫자는 모두 예시 값이고, 모든 실험은 가상 실험이에요)
     ========================================================= */
  const S = { mode: 'griffith', fade: 0, t: 0 };
  let game = null;
  const ease = SciSim.ease;
  const ctlNodes = $$('#ctrlCard .control');
  function chipOn(root, val) { $$('button', root).forEach((b) => b.classList.toggle('on', String(b.dataset.v) === String(val))); }
  const CS = '#d97706', CR = '#64748b';

  /* ---------- 공통 그림: 세균, 쥐, 주사기, 시험관 ---------- */
  function bacterium(x, y, r, capsule, o) {
    o = o || {};
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    if (capsule) { ctx.fillStyle = 'rgba(250,204,21,.4)'; ctx.beginPath(); ctx.arc(x, y, r * 1.65, 0, TAU); ctx.fill(); ctx.strokeStyle = '#eab308'; ctx.lineWidth = 1.5; ctx.stroke(); }
    D.sphere(x, y, r, capsule ? '#dc2626' : '#64748b', { gloss: false });
    ctx.restore();
  }
  function mouseDraw(x, y, s, st, t) {
    // st: {dead: 0..1, bob}
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const dead = st.dead || 0, bob = dead > 0.5 || RM ? 0 : Math.sin(t * 3 + x) * 1.5;
    ctx.scale(1, 1 - 2 * dead); ctx.translate(0, bob);
    const body = dead > 0.5 ? '#cbd5e1' : '#f1f5f9', line = dead > 0.5 ? '#94a3b8' : '#64748b';
    ctx.strokeStyle = '#f9a8d4'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-34, 6); ctx.quadraticCurveTo(-56, 0, -60, -18); ctx.stroke();
    D.shadow(() => { ctx.beginPath(); ctx.ellipse(0, 2, 38, 24, 0, 0, TAU); ctx.fillStyle = body; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 2, 38, 24, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(34, -4, 16, 0, TAU); ctx.fillStyle = body; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(28, -18, 8, 0, TAU); ctx.fillStyle = '#fbcfe8'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.arc(50, 0, 3.2, 0, TAU); ctx.fill();
    if (dead > 0.5) { ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(37, -11); ctx.lineTo(43, -5); ctx.moveTo(43, -11); ctx.lineTo(37, -5); ctx.stroke(); }
    else { ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(40, -7, 2.6, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function syringeDraw(x, y, ang, col, fill) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-30, 0); ctx.stroke(); // 바늘
    D.roundRect(-6, -9, 56, 18, 4); ctx.fillStyle = 'rgba(241,245,249,.95)'; ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.stroke();
    D.roundRect(-3, -6, 50 * clamp(fill, 0, 1), 12, 3); ctx.fillStyle = col; ctx.fill();
    ctx.fillStyle = '#64748b'; ctx.fillRect(50 - 50 * (1 - fill) + 0, -3, 12 + 0, 6);
    ctx.fillRect(58 - 50 * (1 - fill), -9, 4, 18);
    ctx.restore();
  }

  /* =========================================================
     ① 그리피스 (1928): 쥐 4마리에 주사하기
     ========================================================= */
  const GR = [
    { name: 'R형 세균 (살아 있음)', col: '#94a3b8', dead: false, blood: 'none', cap: '살았어요. 혈액에서 세균이 보이지 않아요.' },
    { name: 'S형 세균 (살아 있음)', col: '#dc2626', dead: true, blood: 'S', cap: '죽었어요. 혈액에 S형 세균이 가득해요.' },
    { name: '열처리해 죽인 S형 세균', col: '#7f1d1d', dead: false, blood: 'none', cap: '살았어요. 죽은 세균은 병을 일으키지 못해요.' },
    { name: '열처리한 S형 + 살아 있는 R형', col: '#a855f7', dead: true, blood: 'S', cap: '죽었어요! 혈액에서 살아 있는 S형 세균이 나왔어요.' },
  ];
  const gm = GR.map(() => ({ phase: 0, p: 0, day: 0, res: 0, dead: 0, mic: 0 }));
  function grInject(i) {
    const m = gm[i]; if (m.phase !== 0) return; m.phase = 1; m.p = 0; Sound.click(); updateCtl();
  }
  function grReset() { gm.forEach((m) => { m.phase = 0; m.p = 0; m.day = 0; m.res = 0; m.dead = 0; m.mic = 0; }); updateCtl(); }
  const grDone = (i) => gm[i].phase === 3;
  const grCount = () => gm.filter((m, i) => m.phase === 3).length;
  function grRect(i) { return PHONE ? { x: 8 + (i % 2) * 236, y: 8 + Math.floor(i / 2) * 316, w: 228, h: 308 } : { x: 14 + i * 194, y: 8, w: 186, h: 540 }; }
  function grUpdate(dt) {
    gm.forEach((m, i) => {
      if (m.phase === 1) { m.p += dt / (RM ? 0.01 : 1.0); if (m.p >= 1) { m.phase = 2; m.p = 0; } }
      else if (m.phase === 2) { m.p += dt / (RM ? 0.01 : 2.4); m.day = clamp(m.p, 0, 1) * 3; if (m.p >= 1) { m.phase = 3; m.p = 1; m.day = 3; if (GR[i].dead) { Sound.fail(); } else Sound.success(); updateCtl(); } }
      m.dead = RM ? (m.phase === 3 && GR[i].dead ? 1 : 0) : approach(m.dead, m.phase === 3 && GR[i].dead ? 1 : 0, dt, 5);
      m.mic = RM ? (m.phase === 3 ? 1 : 0) : approach(m.mic, m.phase === 3 ? 1 : 0, dt, 3);
    });
  }
  const micCells = (() => { const r = mulberry(7), a = []; for (let i = 0; i < 20; i++) { const ang = r() * TAU, d = Math.sqrt(r()) * 0.82; a.push({ x: Math.cos(ang) * d, y: Math.sin(ang) * d, rr: 0.9 + r() * 0.3 }); } return a; })();
  function microscope(cx, cy, R, kind, a, t) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = '#e0f2fe'; ctx.fill();
    ctx.save(); ctx.clip();
    if (kind === 'S') micCells.forEach((c, i) => bacterium(cx + c.x * R, cy + c.y * R + (RM ? 0 : Math.sin(t * 2 + i) * 1.2), 5.2 * c.rr, true));
    else T(cx, cy + 5, '세균 없음', 14, '#64748b', 'center', 800);
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R - 4, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function griffithDraw(dt, t) {
    grUpdate(dt);
    GR.forEach((g, i) => {
      const m = gm[i], R = grRect(i), cx = R.x + R.w / 2;
      panel(R.x, R.y, R.w, R.h, 16, '#fff');
      ctx.strokeStyle = m.phase === 3 ? (g.dead ? '#fca5a5' : '#86efac') : '#e2e8f0'; ctx.lineWidth = m.phase === 3 ? 3 : 1.5; D.roundRect(R.x, R.y, R.w, R.h, 16); ctx.stroke();
      D.label(R.x + 12, R.y + 22, (i + 1) + '번 쥐', { bg: '#475569', size: 12.5, align: 'left' });
      const hh = textBlock(R.x + 12, R.y + 50, R.w - 24, g.name, PHONE ? 13.5 : 14, '#1f2d44', PHONE ? 18 : 20, 800);
      const my = PHONE ? R.y + 132 : R.y + 195, mx = PHONE ? R.x + 66 : cx;
      // 우리
      const cw = PHONE ? 118 : R.w - 24, cx0 = PHONE ? R.x + 8 : R.x + 12, cy0 = PHONE ? R.y + 74 : R.y + 112, chh = PHONE ? 100 : 130;
      D.roundRect(cx0, cy0, cw, chh, 12); ctx.fillStyle = '#fefce8'; ctx.fill(); ctx.strokeStyle = '#d6d3a8'; ctx.lineWidth = 2; ctx.stroke();
      for (let q = 1; q < 6; q++) { ctx.strokeStyle = 'rgba(214,211,168,.6)'; ctx.beginPath(); ctx.moveTo(cx0 + q * cw / 6, cy0); ctx.lineTo(cx0 + q * cw / 6, cy0 + 8); ctx.stroke(); }
      mouseDraw(PHONE ? cx0 + cw / 2 : cx, cy0 + chh * 0.62, PHONE ? 0.95 : 1.15, { dead: m.dead }, t);
      // 주사기
      if (m.phase === 1) {
        const u = ease.inOutCubic(clamp(m.p / 0.5, 0, 1)), pr = clamp((m.p - 0.5) / 0.4, 0, 1), ret = clamp((m.p - 0.9) / 0.1, 0, 1);
        const sx = lerp(cx0 + cw + 40, (PHONE ? cx0 + cw / 2 : cx) + 40, u * (1 - ret * 0.5)), sy = lerp(cy0 - 18, cy0 + chh * 0.48, u);
        syringeDraw(sx + 36, sy, Math.PI - 0.5 * (1 - u * 0.2), g.col, 1 - pr);
      } else if (m.phase === 0) syringeDraw(cx0 + cw - 8 + (PHONE ? 16 : 0), cy0 - 22, Math.PI - 0.15, g.col, 1);
      // 경과 일수
      const by = PHONE ? R.y + 190 : R.y + 262;
      if (m.phase >= 2) {
        T(R.x + 12, by, '경과: ' + Math.floor(m.day + 0.001) + '일 / 3일', 13.5, '#475569', 'left', 800);
        D.roundRect(R.x + 12, by + 8, R.w - 24, 9, 4.5); ctx.fillStyle = '#e2e8f0'; ctx.fill(); D.roundRect(R.x + 12, by + 8, Math.max(9, (R.w - 24) * m.day / 3), 9, 4.5); ctx.fillStyle = '#16a34a'; ctx.fill();
      } else T(R.x + 12, by, m.phase === 1 ? '주사하는 중…' : (PHONE ? '쥐를 눌러 주사해요' : '[주사하기]를 눌러요'), 13.5, '#94a3b8', 'left', 800);
      if (m.phase === 3) {
        D.label(R.x + 12, by + 34, g.dead ? '사망 ✖' : '생존 ✔', { bg: g.dead ? '#dc2626' : '#16a34a', size: 14, align: 'left' });
      }
      // 현미경 (혈액)
      const mr = PHONE ? 40 : 56, mcx = PHONE ? R.x + R.w - 56 : cx, mcy = PHONE ? R.y + 118 : R.y + 372;
      if (m.mic > 0.02) { microscope(mcx, mcy, mr, g.blood, m.mic, t); if (!PHONE) T(mcx, mcy + mr + 20, '🔬 혈액 속 세균', 13, '#64748b', 'center', 700); }
      else { ctx.setLineDash([5, 4]); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mcx, mcy, mr, 0, TAU); ctx.stroke(); ctx.setLineDash([]); T(mcx, mcy + 4, '혈액 관찰', 12.5, '#cbd5e1', 'center', 700); }
      if (m.phase === 3) { const cy2 = PHONE ? R.y + 244 : R.y + 466; textBlock(R.x + 12, cy2, R.w - 24, g.cap, PHONE ? 12.5 : 13.5, g.dead ? '#b91c1c' : '#166534', PHONE ? 17 : 19, 800); }
    });
    // 범례
    if (!PHONE) { /* 범례는 설명 아래에 이미 있어요 */ }
  }
  const grPT = { down(p) { for (let i = 0; i < 4; i++) { const R = grRect(i); if (p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h) { grInject(i); return false; } } return false; }, hover(p) { return GR.some((g, i) => { const R = grRect(i); return gm[i].phase === 0 && p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h; }) ? 'pointer' : 'default'; } };

  /* =========================================================
     ② 에이버리 (1944): 효소 처리와 S형 콜로니 (예시 값)
     ========================================================= */
  const AVT = [{ k: 'none', name: '처리 없음', n: 120, tag: '효소 없음' }, { k: 'prot', name: '단백질 분해 효소', n: 115, tag: '단백질 분해' }, { k: 'rna', name: 'RNA 분해 효소', n: 118, tag: 'RNA 분해' }, { k: 'dna', name: 'DNA 분해 효소', n: 1, tag: 'DNA 분해' }];
  const av = { sel: 'none', run: -1, t: 0, done: [false, false, false, false], disp: [0, 0, 0, 0], prog: [0, 0, 0, 0] };
  const AV_END = 5.2;
  function avRunGo() {
    if (av.run >= 0) return; const i = AVT.findIndex((q) => q.k === av.sel);
    av.run = i; av.t = 0; av.done[i] = false; av.prog[i] = 0; av.disp[i] = 0; Sound.click(); updateCtl();
  }
  function avReset() { av.run = -1; av.done = [false, false, false, false]; av.disp = [0, 0, 0, 0]; av.prog = [0, 0, 0, 0]; av.t = 0; updateCtl(); }
  const colonyPts = (() => { const r = mulberry(21), a = []; for (let i = 0; i < 160; i++) { const ang = r() * TAU, d = Math.sqrt(r()) * 0.88; a.push({ x: Math.cos(ang) * d, y: Math.sin(ang) * d, o: r() }); } return a; })();
  function dishDraw(cx, cy, R, shown, rcol) {
    D.shadow(() => { ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = '#fef3c7'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#d6bf7a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R - 6, 0, TAU); ctx.stroke();
    // R형 콜로니 (작고 거칠고 회색): 모든 접시에 있어요
    for (let i = 0; i < 70; i++) { const c = colonyPts[(i * 7 + 3) % 160], rv = clamp(rcol * 1.2 - c.o * 0.2, 0, 1); if (rv > 0.05) { ctx.fillStyle = 'rgba(120,113,108,' + (0.75 * rv) + ')'; ctx.beginPath(); ctx.arc(cx + c.x * (R - 9), cy + c.y * (R - 9), 1.9, 0, TAU); ctx.fill(); } }
    // S형 콜로니 (크고 매끈하고 반짝임)
    for (let i = 0; i < shown; i++) { const c = colonyPts[i % 160], k = i >= 160 ? 0.55 : 1; D.sphere(cx + c.x * (R - 11) * (i >= 160 ? 0.6 : 1), cy + c.y * (R - 11) * (i >= 160 ? 0.6 : 1), PHONE ? 3 : 3.6, '#fffaf0', { dark: '#d97706', light: '#ffffff', outline: 'rgba(146,64,14,.55)', outlineWidth: 1 }); }
  }
  function molecule(kind, x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    if (kind === 'prot') { D.sphere(0, 0, 9 * s, '#8b5cf6'); D.sphere(10 * s, -6 * s, 6 * s, '#a78bfa', { gloss: false }); }
    else if (kind === 'rna') { ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-14 * s, 0); for (let i = 0; i <= 10; i++) ctx.lineTo(-14 * s + i * 2.8 * s, Math.sin(i * 1.1) * 5 * s); ctx.stroke(); }
    else { ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.5 * s; for (let k = 0; k < 2; k++) { ctx.beginPath(); for (let i = 0; i <= 14; i++) { const yy = -14 * s + i * 2 * s, xx = Math.sin(i * 0.9 + k * Math.PI) * 6 * s; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); } ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1.5 * s; for (let i = 1; i < 14; i += 2) { ctx.beginPath(); ctx.moveTo(-Math.sin(i * 0.9) * 6 * s, -14 * s + i * 2 * s); ctx.lineTo(Math.sin(i * 0.9) * 6 * s, -14 * s + i * 2 * s); ctx.stroke(); } }
    ctx.restore();
  }
  function averyDraw(dt, t) {
    if (av.run >= 0) {
      av.t += dt; const i = av.run;
      av.prog[i] = clamp((av.t - 3.0) / 2.2, 0, 1);
      av.disp[i] = Math.round(AVT[i].n * clamp((av.t - 3.4) / 1.8, 0, 1));
      if (av.t >= AV_END) { av.done[i] = true; av.prog[i] = 1; av.disp[i] = AVT[i].n; av.run = -1; Sound.success(); updateCtl(); }
    }
    const L1 = PHONE ? { x: 8, y: 8, w: 464, h: 200 } : { x: 14, y: 8, w: 772, h: 232 };
    panel(L1.x, L1.y, L1.w, L1.h, 16, '#fff');
    const sc = PHONE ? 0.78 : 1, k = av.run >= 0 ? AVT[av.run].k : av.sel, ru = av.run >= 0, tt = ru ? av.t : 0;
    const sx = L1.x + L1.w * 0.15, mx = L1.x + L1.w * 0.5, kx = L1.x + L1.w * 0.85, cy = L1.y + L1.h * 0.52;
    T(L1.x + 14, L1.y + 24, ru ? '실험 중: S형 추출물 + ' + AVT[av.run].name : '실험 준비: ' + AVT.find((q) => q.k === av.sel).name, PHONE ? 14 : 16, '#1f2d44', 'left', 800);
    // ① 추출물 시험관 + 효소
    const tw = 54 * sc, th = 116 * sc;
    D.roundRect(sx - tw / 2, cy - th / 2, tw, th, 14 * sc); ctx.fillStyle = 'rgba(254,226,226,.7)'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.stroke();
    const target = { prot: 'prot', rna: 'rna', dna: 'dna' }[k], cut = ru ? clamp((tt - 0.6) / 1.4, 0, 1) : 0;
    const mpos = [['prot', -14, -34], ['rna', 12, -16], ['dna', -8, 4], ['prot', 14, 18], ['rna', -12, 26], ['dna', 10, 40]];
    mpos.forEach((q, i) => {
      const hit = q[0] === target, a = hit ? 1 - cut : 1;
      if (hit && cut > 0.05) { // 잘려서 흩어지는 모습
        molecule(q[0], sx + q[1] * sc - cut * 10, cy + q[2] * sc - 14 * sc * 0 + cut * 6, 0.7 * sc, a); molecule(q[0], sx + q[1] * sc + cut * 10, cy + q[2] * sc + cut * 8, 0.7 * sc, a);
      } else molecule(q[0], sx + q[1] * sc, cy + q[2] * sc + 4 * sc, 0.8 * sc, 1);
    });
    if (ru && k !== 'none' && tt < 2.2) { const ex = sx + 70 * sc - clamp(tt / 0.6, 0, 1) * 44 * sc; E('✂️', ex, cy - 20 * sc + Math.sin(tt * 8) * 3, 26 * sc, { rot: -0.4 }); D.label(ex + 26 * sc, cy - 56 * sc, AVT.find((q) => q.k === k).name, { bg: '#7c3aed', size: 12, align: 'left' }); }
    T(sx, cy + th / 2 + 22, 'S형 추출물', 13.5, '#334155', 'center', 800);
    // ② 섞기
    D.arrow(sx + 46 * sc, cy, mx - 56 * sc, cy, { color: '#94a3b8', width: 3 });
    const mixP = ru ? clamp((tt - 2.0) / 0.9, 0, 1) : 0;
    ctx.beginPath(); ctx.arc(mx, cy + 4, 44 * sc, 0, TAU); ctx.fillStyle = 'rgba(224,242,254,.8)'; ctx.fill(); ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 3; ctx.stroke();
    for (let i = 0; i < 9; i++) { const a = i * 2.4, d = 14 + (i % 3) * 9; bacterium(mx + Math.cos(a + (RM ? 0 : t * 0.6)) * d * sc, cy + 4 + Math.sin(a + (RM ? 0 : t * 0.6)) * d * sc * 0.9, 5 * sc, false); }
    if (mixP > 0) { ctx.globalAlpha = mixP * 0.5; ctx.fillStyle = k === 'dna' ? 'rgba(148,163,184,.6)' : 'rgba(37,99,235,.35)'; ctx.beginPath(); ctx.arc(mx, cy + 4, 44 * sc, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    T(mx, cy + 44 * sc + 26, 'R형 세균과 섞기', 13.5, '#334155', 'center', 800);
    D.arrow(mx + 52 * sc, cy, kx - 50 * sc, cy, { color: '#94a3b8', width: 3 });
    // ③ 시계 (12시간)
    const hours = ru ? clamp((tt - 3.0) / 2.2, 0, 1) * 12 : 0;
    ctx.beginPath(); ctx.arc(kx, cy + 4, 40 * sc, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 4; ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(kx + Math.sin(a) * 33 * sc, cy + 4 - Math.cos(a) * 33 * sc); ctx.lineTo(kx + Math.sin(a) * 38 * sc, cy + 4 - Math.cos(a) * 38 * sc); ctx.stroke(); }
    const ha = hours * Math.PI / 6; ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(kx, cy + 4); ctx.lineTo(kx + Math.sin(ha) * 28 * sc, cy + 4 - Math.cos(ha) * 28 * sc); ctx.stroke();
    T(kx, cy + 40 * sc + 28, ru ? Math.round(hours) + '시간 배양' : '12시간 배양', 13.5, '#334155', 'center', 800);
    // 접시 4개
    const slots = PHONE ? [[8, 216], [244, 216], [8, 424], [244, 424]] : [[14, 248], [210, 248], [406, 248], [602, 248]], SW = PHONE ? 228 : 184, SH = PHONE ? 200 : 300;
    AVT.forEach((q, i) => {
      const [x, y] = slots[i]; panel(x, y, SW, SH, 16, '#fff');
      const live = av.run === i, dn = av.done[i];
      ctx.strokeStyle = live ? '#f59e0b' : dn ? '#86efac' : '#e2e8f0'; ctx.lineWidth = live || dn ? 3 : 1.5; D.roundRect(x, y, SW, SH, 16); ctx.stroke();
      TF(x + SW / 2, y + 26, q.name, SW - 20, PHONE ? 14 : 15, 11, '#1f2d44', 'center', 800);
      const R = PHONE ? 54 : 62, cx = x + SW / 2, cyy = y + (PHONE ? 100 : 120);
      if (dn || live) dishDraw(cx, cyy, R, av.disp[i], av.prog[i] || (dn ? 1 : 0));
      else { ctx.setLineDash([6, 5]); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cyy, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]); T(cx, cyy + 5, '아직 안 했어요', 13, '#cbd5e1', 'center', 700); }
      const cnt = live ? av.disp[i] : dn ? q.n : null;
      D.label(cx, y + SH - (PHONE ? 38 : 70), cnt == null ? 'S형 콜로니 —' : 'S형 콜로니 ' + (cnt === q.n && q.n < 5 ? '0~' + (q.n + 1) : '약 ' + cnt) + '개', { bg: cnt == null ? '#94a3b8' : (q.k === 'dna' ? '#dc2626' : '#16a34a'), size: PHONE ? 13 : 14.5 });
      if (!PHONE) { if (dn) textBlock(x + 12, y + SH - 44, SW - 24, q.k === 'dna' ? 'S형으로 바뀐 세균이 거의 없어요!' : 'S형으로 바뀐 세균이 많이 생겼어요.', 13, q.k === 'dna' ? '#b91c1c' : '#166534', 17, 800, 'left'); }
    });
  }


  /* =========================================================
     ③ 허시 · 체이스 (1952): 방사성 표지 파지 실험 (방사선 계수는 예시 값)
     단계 0 표지 · 1 감염 · 2 믹서 · 3 원심 분리 · 4 측정
     ========================================================= */
  const HC_DATA = { S: { sup: 8000, pel: 2000 }, P: { sup: 3000, pel: 7000 } };
  const HC_NAME = { S: '³⁵S 표지 (단백질)', P: '³²P 표지 (DNA)' };
  const hc = { lab: 'S', t: 0, stage: 0, from: 0, to: 0, p: 0, moving: false, auto: false, wait: 0, done: { S: false, P: false }, cnt: { sup: 0, pel: 0 } };
  const HCA = PHONE ? { x: 8, y: 8, w: 464, h: 330 } : { x: 14, y: 8, w: 772, h: 330 };
  const HCR = PHONE ? { x: 8, y: 346, w: 464, h: 286 } : { x: 14, y: 346, w: 772, h: 202 };
  function hcReset() { hc.t = 0; hc.stage = 0; hc.moving = false; hc.auto = false; hc.cnt = { sup: 0, pel: 0 }; hideHint(); }
  function hcLabel(l) { if (hc.lab === l && hc.t === 0) return; hc.lab = l; hcReset(); updateCtl(); }
  function hcGo(s) { hc.from = hc.t; hc.to = s; hc.p = 0; hc.moving = true; }
  function hcRun() { if (hc.moving) return; if (hc.stage >= 4) hcReset(); hc.auto = true; hc.wait = hc.t === 0 ? 0.3 : 0; updateCtl(); }
  function hcStep() { if (hc.moving) return; if (hc.stage >= 4) { hcReset(); updateCtl(); return; } hc.auto = false; hcGo(hc.stage + 1); updateCtl(); }
  function hcArrive(s) {
    hc.stage = s;
    if (s === 4 && !hc.done[hc.lab]) { hc.done[hc.lab] = true; hc.auto = false; Sound.success(); const a = HCA; parts.burst(a.x + a.w * 0.5, a.y + a.h * 0.55, { count: 20, speed: 160, life: 0.9 }); }
    else if (s === 4) hc.auto = false;
    updateCtl();
  }
  function hcUpdate(dt) {
    if (hc.moving) {
      hc.p += dt / (RM ? 0.01 : 2.0); const f = Math.min(1, hc.p);
      hc.t = hc.from + (hc.to - hc.from) * ease.inOutCubic(f);
      if (f >= 1) { hc.moving = false; hc.t = hc.to; hc.wait = RM ? 0.05 : 0.8; hcArrive(hc.to); }
    } else if (hc.auto && hc.stage < 4) { hc.wait -= dt; if (hc.wait <= 0) hcGo(hc.stage + 1); }
    const tg = HC_DATA[hc.lab];
    hc.cnt.sup = hc.t >= 3.7 ? (RM ? tg.sup : approach(hc.cnt.sup, tg.sup, dt, 3)) : 0;
    hc.cnt.pel = hc.t >= 3.7 ? (RM ? tg.pel : approach(hc.cnt.pel, tg.pel, dt, 3)) : 0;
  }
  const hcPct = (l) => HC_DATA[l].pel / (HC_DATA[l].sup + HC_DATA[l].pel) * 100;
  /* 파지: 머리(단백질 껍질) + DNA + 꼬리. ghost = DNA가 빠져나간 빈 껍질 */
  function phage(x, y, s, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(s, s); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(0, 46); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, 52); ctx.lineTo(0, 46); ctx.lineTo(9, 52); ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = Math.cos(a) * 20, py = Math.sin(a) * 20 - 6; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath();
    ctx.fillStyle = o.coat || '#fde68a'; ctx.fill(); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2.5; ctx.stroke();
    if (!o.ghost) { ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 12; i++) { const xx = -10 + i * 1.7, yy = -6 + Math.sin(i * 1.3) * 8; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    ctx.restore();
  }
  function radDots(list, col) { list.forEach((d) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(d.x, d.y, 3.6, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); }); }
  function ecoli(x, y, w, h, a) { ctx.save(); ctx.globalAlpha = a == null ? 1 : a; D.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = '#bbf7d0'; ctx.fill(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore(); }
  function hershDraw(dt, t) {
    hcUpdate(dt);
    const A = HCA, R = HCR, lab = hc.lab, S1 = lab === 'S', mk = S1 ? '#16a34a' : '#dc2626', tt = hc.t, st = clamp(Math.round(tt), 0, 4);
    panel(A.x, A.y, A.w, A.h, 16, '#fff');
    const NAMES = PHONE ? ['① 표지', '② 감염', '③ 믹서', '④ 원심', '⑤ 측정'] : ['① 표지한 파지', '② 대장균 감염', '③ 믹서로 흔들기', '④ 원심 분리', '⑤ 방사선 측정'];
    NAMES.forEach((n, i) => { const w = (A.w - 24) / 5; D.roundRect(A.x + 12 + i * w + 2, A.y + 10, w - 4, 26, 13); ctx.fillStyle = i === st ? '#16a34a' : i < st ? '#bbf7d0' : '#f1f5f9'; ctx.fill(); TF(A.x + 12 + i * w + w / 2, A.y + 28, n, w - 10, 13, 9.5, i === st ? '#fff' : '#475569', 'center', 800); });
    const cap = [
      '황(S)은 단백질에만, 인(P)은 DNA에 많아요. ' + (S1 ? '단백질 껍질' : 'DNA') + '에 방사성 ' + (S1 ? '³⁵S' : '³²P') + '를 붙였어요.',
      '파지가 대장균에 붙어 유전 물질을 넣어요. 껍질은 대장균 밖에 남아요.',
      '믹서로 흔들어 대장균 표면의 파지 껍질을 떼어 내요.',
      '원심 분리하면 가벼운 껍질은 상층액에, 무거운 대장균은 침전물에 모여요.',
      '상층액과 침전물의 방사선 계수를 재요. (예시 값)',
    ];
    TF(A.x + A.w / 2, A.y + 60, cap[st], A.w - 30, PHONE ? 14 : 15.5, 10.5, '#334155', 'center', 800);
    // 장면 구성: 3개의 대장균, 3개의 파지
    const cy = A.y + A.h * 0.62, bx = [A.x + A.w * 0.25, A.x + A.w * 0.5, A.x + A.w * 0.75], sc = PHONE ? 0.8 : 1.1;
    const BW = PHONE ? 104 : 144, BH = PHONE ? 46 : 62, bcy = cy + 14, btop = bcy - BH / 2;
    const f1 = smooth(clamp(tt - 0, 0, 1)), f3 = smooth(clamp(tt - 2, 0, 1));
    if (tt < 2.9) {
      const shake = tt > 1.9 && tt < 2.6 && !RM ? Math.sin(t * 40) * 4 : 0;
      bx.forEach((x0, i) => {
        const ba = smooth(clamp(tt - 0.1, 0, 1)), bxx = x0 + shake * (i % 2 ? 1 : -1);
        if (ba > 0.02) ecoli(bxx, bcy, BW, BH, ba * (1 - clamp(tt - 2.5, 0, 0.4) * 2.5));
        // 파지: 처음에는 위에 떠 있다가 대장균에 붙어요
        const py1 = btop - 50 * sc + 2, py0 = py1 - 36 * sc, px = x0, py = lerp(py0, py1, f1);
        // 껍질은 믹서 단계에서 떨어져 나가 위로 떠올라요 (S 표지에서는 1개가 덜 떨어져요)
        const goUp = f3 * (i === 1 && S1 ? 0.3 : 1);
        const cx2 = px + goUp * (i - 1) * 70 * sc, cy2 = py - goUp * 40 * sc;
        phage(cx2, cy2, sc, { ghost: tt > 1.2, alpha: 1 - clamp(tt - 2.55, 0, 0.45) * 2.2 });
        // DNA는 감염되면 대장균 안으로 들어가요
        if (tt > 0.2) { const d = smooth(clamp((tt - 0.9) / 0.9, 0, 1)), dx = lerp(px, bxx, d), dy = lerp(py - 6 * sc, bcy, d); if (d > 0 && d < 1) { ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; ctx.beginPath(); for (let q = 0; q <= 10; q++) { const xx = dx - 14 + q * 2.8, yy = dy + Math.sin(q * 1.4 + t * 4) * 5; q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); } }
        if (tt >= 1.8) { ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; ctx.beginPath(); for (let q = 0; q <= 14; q++) { const xx = bxx - 30 * (BW / 144) + q * 4.4 * (BW / 144), yy = bcy + Math.sin(q * 1.2) * 7; q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
        // 방사성 표지 점
        if (S1) radDots([{ x: cx2 - 9 * sc, y: cy2 - 12 * sc }, { x: cx2 + 9 * sc, y: cy2 - 4 * sc }, { x: cx2 + 1 * sc, y: cy2 - 20 * sc }], mk);
        else if (tt < 0.9) radDots([{ x: px - 8 * sc, y: py - 8 * sc }, { x: px + 7 * sc, y: py - 2 * sc }], mk);
        else radDots([{ x: bxx - 14, y: bcy + 2 }, { x: bxx + 2, y: bcy - 6 }, { x: bxx + 16, y: bcy + 8 }], mk);
      });
      T(A.x + A.w / 2, A.y + A.h - 14, S1 ? '● 방사성 ³⁵S  (단백질 껍질에 있어요)' : '● 방사성 ³²P  (DNA에 있어요)', 13.5, mk, 'center', 800);
      if (tt > 1.9 && tt < 2.9) { // 믹서 날개
        const bx0 = A.x + A.w - 60, by0 = A.y + 112; ctx.save(); ctx.translate(bx0, by0); ctx.rotate(RM ? 0 : t * 18); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.moveTo(0, -18); ctx.lineTo(0, 18); ctx.stroke(); ctx.restore(); T(bx0, by0 + 38, '믹서', 13, '#64748b', 'center', 800);
      }
    }
    if (tt >= 2.5) { // 시험관 (원심 분리)
      const a = smooth(clamp((tt - 2.5) / 0.5, 0, 1)), sepF = smooth(clamp((tt - 3.0) / 0.9, 0, 1)), tx = A.x + A.w * (PHONE ? 0.32 : 0.36), tw = 96 * sc, top = A.y + 84, h = A.h - 112;
      ctx.save(); ctx.globalAlpha = a;
      D.roundRect(tx - tw / 2, top, tw, h, 28 * sc); ctx.fillStyle = 'rgba(224,242,254,.65)'; ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3.5; ctx.stroke();
      // 침전물 층
      const pelH = 40 * sc + sepF * 14;
      ctx.save(); D.roundRect(tx - tw / 2 + 3, top + 3, tw - 6, h - 6, 26 * sc); ctx.clip(); ctx.fillStyle = 'rgba(134,239,172,' + (0.25 + sepF * 0.55) + ')'; ctx.fillRect(tx - tw / 2, top + h - pelH, tw, pelH); ctx.restore();
      // 대장균 (가라앉아요) / 껍질 (위에 남아요)
      const eb = [[-24, 0], [0, 6], [24, 0], [-12, -14], [12, -14]];
      eb.forEach((q, i) => { const yMix = top + h * (0.35 + 0.3 * ((i * 37) % 10) / 10), yPel = top + h - 20 * sc - (q[1] + 14) * 0.5 * sc - 4; ecoli(tx + q[0] * sc * 0.8, lerp(yMix, yPel, sepF), 24 * sc, 12 * sc, 1); });
      const gh = [[-22, 0.22], [10, 0.3], [26, 0.18], [-8, 0.4]];
      gh.forEach((q, i) => phage(tx + q[0] * sc, lerp(top + h * (0.45 + 0.1 * i), top + 28 * sc + (i % 2) * 30 * sc, sepF), 0.38 * sc, { ghost: true, rot: (i - 2) * 0.4 }));
      // 방사성 표지 점 (상층액 / 침전물에 몇 개인지)
      const data = HC_DATA[lab], ns = Math.round(data.sup / 1000), np = Math.round(data.pel / 1000), rr = mulberry(lab === 'S' ? 5 : 9);
      for (let i = 0; i < ns; i++) { const px = tx + (rr() - 0.5) * (tw - 24), py = lerp(top + h * (0.3 + rr() * 0.4), top + 18 + rr() * (h - pelH - 40), sepF); radDots([{ x: px, y: py }], mk); }
      for (let i = 0; i < np; i++) { const px = tx + (rr() - 0.5) * (tw - 24), py = lerp(top + h * (0.3 + rr() * 0.4), top + h - pelH + 8 + rr() * (pelH - 22), sepF); radDots([{ x: px, y: py }], mk); }
      ctx.restore();
      if (sepF > 0.6) { D.label(tx + tw / 2 + 10, top + 34, '상층액', { bg: '#0284c7', size: 13, align: 'left' }); D.label(tx + tw / 2 + 10, top + h - 24, '침전물', { bg: '#15803d', size: 13, align: 'left' }); }
      // 방사선 계수 막대
      const bxl = A.x + A.w * (PHONE ? 0.62 : 0.6), bw = PHONE ? 30 : 46, base = A.y + A.h - 40, ph = h - 70, mx = 10000;
      if (tt >= 3.7) {
        [['상층액', hc.cnt.sup, '#0284c7', 0], ['침전물', hc.cnt.pel, '#15803d', 1]].forEach(([nm, v, col, k]) => {
          const x = bxl + k * (bw + 30), hh = clamp(v / mx, 0, 1) * ph;
          ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bxl - 20, base); ctx.lineTo(bxl + 2 * bw + 56, base); ctx.stroke();
          D.roundRect(x, base - hh, bw, Math.max(0.1, hh), 5); ctx.fillStyle = col; ctx.fill();
          T(x + bw / 2, base - hh - 8, fmtN(Math.round(v)) + ' cpm', 13.5, '#1f2d44', 'center', 800, { stroke: '#fff', strokeWidth: 3 }); T(x + bw / 2, base + 18, nm, 13.5, '#334155', 'center', 800);
        });
        T(bxl - 16, A.y + 92, '방사선 계수 (cpm)', 13, '#64748b', 'left', 700);
      }
    }
    // 결과 칸
    panel(R.x, R.y, R.w, R.h, 16, '#fff');
    T(R.x + 16, R.y + 28, '📋 기록 (방사선 계수 cpm · 예시 값)', PHONE ? 15 : 17, '#1f2d44', 'left', 800);
    const cols = ['S', 'P'], colW = PHONE ? (R.w - 24) / 2 : 250;
    cols.forEach((l, k) => {
      const x = R.x + 16 + k * (colW + (PHONE ? 8 : 24)), done = hc.done[l], dd = HC_DATA[l];
      D.roundRect(x, R.y + 44, colW, PHONE ? 150 : 148, 12); ctx.fillStyle = done ? '#f0fdf4' : '#f8fafc'; ctx.fill(); ctx.strokeStyle = done ? '#86efac' : '#e2e8f0'; ctx.lineWidth = 2; ctx.stroke();
      TF(x + 12, R.y + 68, HC_NAME[l], colW - 20, 14.5, 11, l === 'S' ? '#15803d' : '#b91c1c', 'left', 800);
      T(x + 12, R.y + 96, '상층액  ' + (done ? fmtN(dd.sup) : '—'), 14.5, '#334155', 'left', 800);
      T(x + 12, R.y + 120, '침전물  ' + (done ? fmtN(dd.pel) : '—'), 14.5, '#334155', 'left', 800);
      T(x + 12, R.y + 146, '침전물 비율  ' + (done ? (hcIn()[l] ? fmtN(Math.round(hcPct(l))) + ' %' : '? %') : '—'), 14.5, hcIn()[l] ? '#15803d' : '#64748b', 'left', 800);
      if (done) T(x + 12, R.y + 170, l === 'S' ? '자손 파지: ³⁵S 거의 없음' : '자손 파지: ³²P 검출', 13, l === 'S' ? '#64748b' : '#b91c1c', 'left', 800);
    });
    if (!PHONE) {
      textBlock(R.x + 16 + 2 * (250 + 24) - 8, R.y + 56, R.w - (2 * (250 + 24)) - 16 + 8, hc.done.S && hc.done.P ? '침전물에서는 ³²P(DNA)가 많고 상층액에서는 ³⁵S(단백질)가 많아요. 대장균 안으로 들어간 것은 DNA예요.' : '두 가지 표지 파지로 실험을 모두 해 보세요. 실험은 모두 가상이에요.', 14, '#475569', 21, 700);
    } else if (hc.done.S && hc.done.P) textBlock(R.x + 16, R.y + 206, R.w - 32, '침전물에서는 ³²P(DNA)가 많고 상층액에서는 ³⁵S(단백질)가 많아요. 대장균 안으로 들어간 것은 DNA예요.', 13.5, '#475569', 20, 700);
  }


  /* =========================================================
     ④ DNA 추출 (딸기 · 바나나 · 브로콜리) — 가상 실험
     ========================================================= */
  const MATS = { straw: { name: '딸기', e: '🍓', liq: '#fda4af', liq2: '#fecdd3' }, banana: { name: '바나나', e: '🍌', liq: '#fde68a', liq2: '#fef3c7' }, broc: { name: '브로콜리', e: '🥦', liq: '#86efac', liq2: '#bbf7d0' } };
  const EX_STEPS = [
    { e: '🔨', t: '비닐백에 넣고 으깨요', role: '조직을 부수어 세포를 드러내요' },
    { e: '💧', t: '추출액(물 + 소금 + 세제)을 넣고 섞어요', role: '세제는 세포막 · 핵막을 녹이고, 소금은 DNA를 뭉치게 해요' },
    { e: '🧻', t: '거즈로 걸러 시험관에 받아요', role: '찌꺼기를 걸러 내요' },
    { e: '🍍', t: '단백질 분해 효소를 넣어요', role: 'DNA에 붙은 단백질을 잘라 내요' },
    { e: '🧊', t: '차가운 에탄올을 벽을 따라 부어요', role: 'DNA는 에탄올에 녹지 않아 경계에서 엉겨요' },
    { e: '👀', t: '두 층의 경계를 관찰해요', role: '흰 실 모양의 DNA가 보여요' },
    { e: '🥢', t: '막대로 실을 감아 올려요', role: '엉긴 DNA를 건져 올려요' },
  ];
  const EX_ORDER = [4, 1, 6, 0, 3, 5, 2];   // 학생에게 보이는 순서 (섞어 놓음)
  const ex = { mat: 'straw', n: 0, run: -1, p: 0, ctl: 0, ctlRun: false, ctlP: 0, msg: '', shake: 0, strand: 0, wind: 0 };
  const strands = (() => { const r = mulberry(33), a = []; for (let i = 0; i < 22; i++) a.push({ x: (r() - 0.5) * 0.8, len: 0.5 + r() * 0.9, ph: r() * 6, w: 1 + r() * 1.2 }); return a; })();
  function exReset() { ex.n = 0; ex.run = -1; ex.p = 0; ex.ctl = 0; ex.ctlRun = false; ex.ctlP = 0; ex.strand = 0; ex.wind = 0; hideHint(); updateCtl(); }
  function exStep(k) {
    if (ex.run >= 0 || ex.ctlRun) return;
    if (ex.n >= 7) return;
    if (k !== ex.n) { ex.shake = 1; showHint('순서가 달라요. 앞 단계에서 만든 것이 다음 단계의 재료가 돼요. 이 단계 앞에 먼저 할 일이 있는지 생각해 보세요.'); Sound.fail(); return; }
    ex.run = k; ex.p = 0; hideHint(); Sound.click(); updateCtl();
  }
  function exCtl() {
    if (ex.n < 7 || ex.ctlRun || ex.run >= 0 || ex.ctl) return;
    ex.ctlRun = true; ex.ctlP = 0; Sound.click(); updateCtl();
  }
  const EX_DUR = [2.4, 3.0, 2.6, 2.2, 3.2, 2.4, 3.0];
  function exUpdate(dt) {
    if (ex.run >= 0) { ex.p += dt / (RM ? 0.02 : EX_DUR[ex.run]); if (ex.p >= 1) { ex.n = ex.run + 1; ex.run = -1; ex.p = 0; Sound.success(); updateCtl(); } }
    if (ex.ctlRun) { ex.ctlP += dt / (RM ? 0.02 : 3.4); if (ex.ctlP >= 1) { ex.ctlRun = false; ex.ctl = 1; ex.ctlP = 1; Sound.success(); updateCtl(); } }
    ex.shake = Math.max(0, ex.shake - dt * 3);
    // DNA 실이 엉기는 정도 (에탄올을 부은 뒤 서서히)
    const tgt = ex.n >= 5 ? 1 : ex.run === 4 ? clamp((ex.p - 0.5) / 0.5, 0, 1) : 0;
    ex.strand = RM ? tgt : approach(ex.strand, tgt, dt, 0.45);
    ex.wind = RM ? (ex.n >= 7 ? 1 : 0) : approach(ex.wind, ex.n >= 7 ? 1 : ex.run === 6 ? ex.p : 0, dt, 2);
  }
  const EXG = PHONE
    ? { tube: { x: 316, top: 96, h: 320, w: 70 }, tubeB: { x: 420, top: 96, h: 320, w: 58 }, left: { x: 8, y: 70, w: 250, h: 400 } }
    : { tube: { x: 520, top: 76, h: 400, w: 96 }, tubeB: { x: 690, top: 76, h: 400, w: 96 }, left: { x: 14, y: 70, w: 410, h: 470 } };
  function testTubeDraw(g, o) {
    // o: {liq, level(0~1 of lower layer), ethL(0~1), strand, hasD, label}
    const x = g.x, top = g.top, h = g.h, w = g.w;
    ctx.save();
    D.roundRect(x - w / 2, top, w, h, w / 2 - 4); ctx.fillStyle = 'rgba(224,242,254,.55)'; ctx.fill();
    ctx.save(); D.roundRect(x - w / 2 + 3, top + 3, w - 6, h - 6, w / 2 - 6); ctx.clip();
    const bot = top + h - 4, yL = bot - o.level * (h - 30), yE = yL - o.eth * (h - 30);
    if (o.level > 0.01) { const gr = ctx.createLinearGradient(0, yL, 0, bot); gr.addColorStop(0, o.liq2); gr.addColorStop(1, o.liq); ctx.fillStyle = gr; ctx.fillRect(x - w / 2, yL, w, bot - yL); }
    if (o.eth > 0.01) { ctx.fillStyle = 'rgba(191,219,254,.55)'; ctx.fillRect(x - w / 2, yE, w, yL - yE); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - w / 2, yL); ctx.lineTo(x + w / 2, yL); ctx.stroke(); }
    // DNA 실
    if (o.strand > 0.02) strands.forEach((s, i) => {
      if (i >= o.nStr) return;
      const L = s.len * o.strand * Math.min(w * 1.1, 70) * (PHONE ? 0.8 : 1);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      let x0 = x + s.x * (w - 24), y0 = yL + 2;
      const path = () => { ctx.beginPath(); ctx.moveTo(x0, y0); for (let q = 1; q <= 14; q++) { const u = q / 14; ctx.lineTo(x0 + Math.sin(u * 5 + s.ph + (RM ? 0 : S.t * 0.5)) * 6 * u, y0 - u * L); } };
      path(); ctx.strokeStyle = 'rgba(100,116,139,' + (0.5 * o.strand) + ')'; ctx.lineWidth = s.w + 2; ctx.stroke();
      path(); ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * o.strand) + ')'; ctx.lineWidth = s.w + 0.4; ctx.stroke();
    });
    ctx.restore();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3.5; D.roundRect(x - w / 2, top, w, h, w / 2 - 4); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x - w / 2 + 8, top + 14, 5, h - 50);
    ctx.restore();
    if (o.label) T(x, top + h + 22, o.label, 14, '#334155', 'center', 800);
    return { yL, yE };
  }
  function extractDraw(dt, t) {
    exUpdate(dt);
    const M = MATS[ex.mat], g = EXG, L = g.left, run = ex.run, p = ex.p, n = ex.n;
    panel(PHONE ? 8 : 14, 8, PHONE ? 464 : 772, PHONE ? 624 : 540, 16, '#fff');
    const st = run >= 0 ? run : Math.min(n, 6);   // 지금 보여 줄 장면
    T((PHONE ? 8 : 14) + 16, 36, ex.ctl && n >= 7 ? '대조 실험까지 마쳤어요' : n >= 7 ? '추출 완료! 대조 시험관도 만들어 보세요' : run >= 0 ? EX_STEPS[run].e + ' ' + EX_STEPS[run].t : n === 0 ? '추출 순서대로 오른쪽 버튼을 눌러요' : '다음 단계를 누르세요 (' + n + ' / 7 완료)', PHONE ? 14 : 17, '#1f2d44', 'left', 800);
    // 왼쪽: 단계 장면
    const cx = L.x + L.w / 2, cy = L.y + L.h * 0.5, sc = PHONE ? 0.72 : 1;
    const vig = run >= 0 ? run : (n >= 7 ? 6 : n);
    const pp = run >= 0 ? p : 1;
    const sh = ex.shake > 0 && !RM ? Math.sin(t * 50) * 4 * ex.shake : 0;
    ctx.save(); ctx.translate(sh, 0);
    if (n === 0 && run < 0) { // 재료
      [-70, 0, 70].forEach((dx, i) => E(M.e, cx + dx * sc, cy + (i === 1 ? -10 : 10) * sc, 52 * sc));
      T(cx, cy + 70 * sc, M.name + ' 한 줌', 15, '#475569', 'center', 800);
    } else {
      // 비닐백 (으깬 재료)
      const bagA = vig <= 1 ? 1 : vig === 2 ? 1 - clamp(pp * 2, 0, 1) * 0.0 : 0.0;
      if (vig <= 2) {
        const bw = 150 * sc, bh = 130 * sc, bx = cx - bw / 2, by = cy - bh / 2 + 10;
        D.roundRect(bx, by, bw, bh, 12); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(bx + 4, by + 12); ctx.lineTo(bx + bw - 4, by + 12); ctx.stroke();
        const mash = vig === 0 ? pp : 1, lq = vig >= 1 ? (vig === 1 ? pp : 1) : 0;
        ctx.save(); D.roundRect(bx + 3, by + 14, bw - 6, bh - 17, 10); ctx.clip();
        const fill = bh * (0.4 + 0.2 * lq); ctx.fillStyle = C.mix(M.liq, '#e0f2fe', lq * 0.5); ctx.fillRect(bx, by + bh - fill, bw, fill);
        for (let i = 0; i < 6; i++) { const rx = bx + 20 * sc + (i % 3) * 44 * sc, ry = by + bh - 24 * sc - Math.floor(i / 3) * 24 * sc; ctx.fillStyle = C.shade(M.liq, -0.15 - 0.05 * i % 3); ctx.beginPath(); ctx.arc(rx, ry, (vig === 0 ? lerp(14, 6, mash) : 6) * sc, 0, TAU); ctx.fill(); }
        ctx.restore();
        if (vig === 0) { const pr = RM ? 0 : Math.abs(Math.sin(pp * 14)); E('✊', cx, by - 18 * sc + pr * 40 * sc, 44 * sc); }
        if (vig === 1) { // 추출액 붓기: 물 · 소금 · 세제
          [['💧 물', -60, '#38bdf8'], ['🧂 소금', 0, '#a3a3a3'], ['🧴 세제', 60, '#a855f7']].forEach(([nm, dx, col], i) => {
            const u = clamp(pp * 3 - i * 0.6, 0, 1), yy = lerp(by - 70 * sc, by + 10 * sc, ease.outQuad(u));
            if (u > 0 && u < 1) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + dx * sc, yy, 6 * sc, 0, TAU); ctx.fill(); }
            D.label(cx + dx * sc, by - 84 * sc, nm, { bg: col, size: 12 });
          });
          // 세제가 세포막을 녹여요 (고리가 터져요)
          for (let i = 0; i < 5; i++) { const q = (pp * 1.4 - i * 0.12), x0 = bx + 30 * sc + i * 26 * sc, y0 = by + bh - 50 * sc; if (q > 0 && q < 1) { ctx.strokeStyle = 'rgba(168,85,247,' + (1 - q) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x0, y0, 7 * sc + q * 12 * sc, 0, TAU); ctx.stroke(); } }
        }
      }
      if (vig === 2) { // 깔때기와 거즈
        const fx = cx, fy = cy - 40 * sc;
        ctx.beginPath(); ctx.moveTo(fx - 70 * sc, fy - 40 * sc); ctx.lineTo(fx + 70 * sc, fy - 40 * sc); ctx.lineTo(fx + 10 * sc, fy + 50 * sc); ctx.lineTo(fx - 10 * sc, fy + 50 * sc); ctx.closePath(); ctx.fillStyle = 'rgba(241,245,249,.9)'; ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(fx + i * 15 * sc, fy - 30 * sc); ctx.lineTo(fx + i * 4 * sc, fy + 20 * sc); ctx.stroke(); }
        ctx.fillStyle = C.rgba(M.liq, 0.85); ctx.beginPath(); ctx.moveTo(fx - 60 * sc, fy - 38 * sc); ctx.lineTo(fx + 60 * sc, fy - 38 * sc); ctx.lineTo(fx + 20 * sc, fy + 10 * sc - pp * 10 * sc); ctx.lineTo(fx - 20 * sc, fy + 10 * sc - pp * 10 * sc); ctx.fill();
        for (let i = 0; i < 4; i++) { const u = (pp * 3 + i * 0.25) % 1, yy = fy + 54 * sc + u * 90 * sc; ctx.fillStyle = M.liq2; ctx.beginPath(); ctx.arc(fx, yy, 4 * sc, 0, TAU); ctx.fill(); }
        T(cx, cy + 150 * sc, '찌꺼기는 거즈에 남아요', 14, '#475569', 'center', 800);
      }
      if (vig === 3) { E('🍍', cx - 20 * sc, cy - 60 * sc, 54 * sc); for (let i = 0; i < 4; i++) { const u = (pp * 2.4 + i * 0.25) % 1; ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(cx - 20 * sc + 30 * sc, cy - 30 * sc + u * 90 * sc, 4 * sc, 0, TAU); ctx.fill(); } D.label(cx, cy + 70 * sc, '효소가 단백질을 잘라요', { bg: '#a16207', size: 13 }); }
      if (vig === 4) { // 에탄올 병
        const ang = -0.6 - 0.2 * Math.sin(pp * Math.PI); ctx.save(); ctx.translate(cx + 30 * sc, cy - 60 * sc); ctx.rotate(ang);
        D.roundRect(-22 * sc, -50 * sc, 44 * sc, 90 * sc, 8); ctx.fillStyle = 'rgba(191,219,254,.8)'; ctx.fill(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#2563eb'; ctx.fillRect(-9 * sc, -60 * sc, 18 * sc, 12 * sc); ctx.restore();
        D.label(cx, cy + 40 * sc, '차가운 에탄올 (냉동실 보관)', { bg: '#2563eb', size: 12.5 }); D.label(cx, cy + 74 * sc, '⚠ 불 근처에서 쓰지 않아요', { bg: '#dc2626', size: 12.5 });
      }
      if (vig === 5) { // 돋보기
        const r = 92 * sc, mx = cx, my = cy - 10 * sc; ctx.beginPath(); ctx.arc(mx, my, r, 0, TAU); ctx.fillStyle = '#f0f9ff'; ctx.fill(); ctx.save(); ctx.clip();
        const yb = my + r * 0.2; ctx.fillStyle = C.rgba(M.liq, 0.7); ctx.fillRect(mx - r, yb, 2 * r, r); ctx.fillStyle = 'rgba(191,219,254,.5)'; ctx.fillRect(mx - r, my - r, 2 * r, yb - (my - r));
        strands.forEach((s, i) => { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = s.w * 2; ctx.beginPath(); ctx.moveTo(mx + s.x * r * 1.5, yb + 2); for (let q = 1; q <= 12; q++) { const u = q / 12; ctx.lineTo(mx + s.x * r * 1.5 + Math.sin(u * 5 + s.ph + (RM ? 0 : t)) * 12 * u, yb - u * s.len * r * 0.8 * clamp(pp * 1.5, 0, 1)); } ctx.stroke(); ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 0.8; ctx.stroke(); });
        ctx.restore(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(mx, my, r, 0, TAU); ctx.stroke(); ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mx + r * 0.7, my + r * 0.7); ctx.lineTo(mx + r * 1.05, my + r * 1.05); ctx.stroke();
        T(mx, my + r + 36, '에탄올에 녹지 않아 흰 실처럼 엉겨요', 14, '#334155', 'center', 800);
      }
      if (vig === 6) { // 막대로 감기
        const sx0 = cx, sy0 = cy - 30 * sc; ctx.save(); ctx.translate(sx0, sy0); ctx.rotate(0.25); ctx.fillStyle = '#b45309'; D.roundRect(-5, -110 * sc, 10, 220 * sc, 5); ctx.fill();
        const blob = (n >= 7 ? 1 : pp) * 26 * sc; for (let i = 0; i < 16; i++) { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 60 * sc, blob * (0.5 + 0.6 * ((i * 7) % 10) / 10) + 6, blob * 0.55 + 4 + ((i * 3) % 5), (RM ? 0 : (t * 2 + i)), 0, TAU * 0.8); ctx.stroke(); }
        ctx.restore(); T(cx, cy + 150 * sc, '막대에 DNA 실이 감겨 올라와요', 14, '#334155', 'center', 800);
      }
    }
    ctx.restore();
    // 오른쪽: 시험관 A (정상), B (세제를 뺀 대조)
    const lvA2 = n >= 3 ? 0.5 : run === 2 ? 0.5 * p : 0;
    const ethA = n >= 5 ? 0.3 : run === 4 ? 0.3 * clamp(p * 1.6, 0, 1) : 0;
    const resA = testTubeDraw(g.tube, { liq: M.liq, liq2: M.liq2, level: lvA2, eth: ethA, strand: ex.strand * (1 - ex.wind * 0.45), nStr: 22, label: ex.ctl || ex.ctlRun ? (PHONE ? 'A (세제 O)' : '시험관 A (세제 O)') : (PHONE ? '시험관 A' : '시험관 A') });
    if (ex.ctl || ex.ctlRun) {
      const cp = ex.ctl ? 1 : ex.ctlP;
      testTubeDraw(g.tubeB, { liq: M.liq, liq2: M.liq2, level: 0.5 * clamp(cp * 3, 0, 1), eth: 0.3 * clamp((cp - 0.35) * 2.5, 0, 1), strand: clamp((cp - 0.75) * 4, 0, 1) * 0.5, nStr: 3, label: PHONE ? 'B (세제 X)' : '시험관 B (세제 X)' });
      if (ex.ctl) { D.label(g.tube.x, g.tube.top - 20, PHONE ? 'DNA 많음' : 'DNA 실이 많아요', { bg: '#16a34a', size: 13 }); D.label(g.tubeB.x + (PHONE ? 14 : 0), g.tubeB.top - 20, PHONE ? '거의 없음' : 'DNA 실이 거의 없어요', { bg: '#dc2626', size: 13 }); }
    }
  }


  /* =========================================================
     ⑤ 증거 종합: 세 실험의 결론과 남은 한계 (논증 틀)
     ========================================================= */
  const ARG_ROWS = [
    { n: '그리피스 (1928)', q: '열처리해 죽인 S형이 쥐를 죽게 할까?', m: '쥐 4마리에 R · S · 열처리 S · (열처리 S + R) 주사', r: '마지막 쥐가 죽고 살아 있는 S형이 나왔어요.' },
    { n: '에이버리 등 (1944)', q: '형질 전환 물질은 무엇일까?', m: 'S형 추출물을 효소로 처리해 R형과 섞어 배양', r: 'DNA 분해 효소 처리에서만 S형 콜로니가 거의 없었어요.' },
    { n: '허시와 체이스 (1952)', q: '파지가 넣어 주는 물질은 무엇일까?', m: '³⁵S · ³²P 표지 파지로 감염 → 믹서 → 원심 분리', r: '³²P는 침전물, ³⁵S는 상층액에 많았어요.' },
  ];
  const ARG_CARDS = [
    { id: 'c1', label: '형질 전환: R형이 죽은 S형의 물질로 S형이 된다', ans: 'c1' },
    { id: 'c2', label: '형질 전환을 일으키는 물질은 DNA다', ans: 'c2' },
    { id: 'c3', label: '파지가 대장균에 넣어 준 유전 물질은 DNA다', ans: 'c3' },
    { id: 'l1', label: '그 물질이 무엇인지는 알아내지 못했다', ans: 'l1' },
    { id: 'l2', label: '추출물에 단백질이 조금 섞여 있을 가능성이 남았다', ans: 'l2' },
    { id: 'l3', label: '껍질이 완전히 떨어지지 않아 ³⁵S가 일부 남았다', ans: 'l3' },
  ];
  const AR = PHONE ? { y: [8, 158, 308], h: 148, bx: [8, 244], bw: 228, bh: 76, byo: 70 } : { y: [8, 134, 260], h: 120, bx: [302, 548], bw: 238, bh: 120, byo: 0 };
  const ARG_BOXES = [];
  ARG_ROWS.forEach((r, i) => ['c', 'l'].forEach((k, j) => ARG_BOXES.push({ id: k + (i + 1), label: j === 0 ? '결론' : '남은 한계', col: j === 0 ? '#16a34a' : '#d97706', x: AR.bx[j], y: AR.y[i] + AR.byo, w: AR.bw, h: AR.bh, cols: 1, hdr: PHONE ? 20 : 26 })));
  const argSorter = selectable({
    cards: ARG_CARDS.map((c) => ({ id: c.id, label: c.label, col: '#64748b' })), boxes: ARG_BOXES, cw: PHONE ? 226 : 250, ch: PHONE ? 46 : 62, kh: PHONE ? 46 : 56,
    tray: (i) => { const o = [3, 4, 1, 2, 5, 0], j = o.indexOf(i); return PHONE ? { x: 8 + (j % 2) * 236, y: 482 + Math.floor(j / 2) * 50 } : { x: 14 + (j % 3) * 262, y: 408 + Math.floor(j / 3) * 70 }; },
    onChange() { updateCtl(); },
  });
  const argWrong = () => argSorter.cards.filter((c) => c.zone && ARG_CARDS.find((q) => q.id === c.id).ans !== c.zone);
  function argDraw(dt, t) {
    argSorter.update(dt); argSorter.drawBoxes();
    ARG_ROWS.forEach((r, i) => {
      const y = AR.y[i];
      if (PHONE) {
        D.label(14, y + 16, (i + 1) + '. ' + r.n, { bg: '#0f766e', size: 12.5, align: 'left' });
        textBlock(14, y + 40, 450, '질문: ' + r.q, 12, '#334155', 15, 700);
        textBlock(14, y + 56, 450, '결과: ' + r.r, 12, '#475569', 15, 700);
      } else {
        panel(14, y, 280, AR.h, 14, '#fff');
        D.label(24, y + 16, (i + 1) + '. ' + r.n, { bg: '#0f766e', size: 12.5, align: 'left' });
        let yy = y + 42;
        [['질문', r.q], ['방법', r.m], ['결과', r.r]].forEach(([k, v]) => { const h = textBlock(24, yy, 262, k + ': ' + v, 12.5, '#334155', 15, 700); yy += h + 3; });
      }
    });
    T(14, PHONE ? 472 : 398, '카드를 알맞은 칸에 끌어 넣어요', PHONE ? 13.5 : 15, '#334155', 'left', 800);
    argSorter.drawCards();
  }
  const argPT = sorterPT(() => argSorter);

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  const PTS = { griffith: grPT, argue: argPT };
  const hcIn = () => ({ S: Math.abs(parseFloat($('#hc35').value) - hcPct('S')) <= 0.5, P: Math.abs(parseFloat($('#hc32').value) - hcPct('P')) <= 0.5 });
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; PT = PTS[m] || null; hideHint(); updateCtl();
  }
  function exPoolBuild() {
    const pool = $('#exPool'); if (pool.children.length) return;
    EX_ORDER.forEach((k) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = k; b.className = 'mc'; b.textContent = EX_STEPS[k].e + ' ' + EX_STEPS[k].t; b.addEventListener('click', () => exStep(k)); pool.appendChild(b); });
  }
  exPoolBuild();
  function updateCtl() {
    const fr0 = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeButtons(S.mode, lvNow, fr0);
    $$('#grSel button').forEach((b) => { const i = +b.dataset.v; b.disabled = gm[i].phase !== 0; b.classList.toggle('seen', gm[i].phase === 3); });
    chipOn($('#avSel'), av.sel); $$('#avSel button').forEach((b) => b.classList.toggle('seen', av.done[AVT.findIndex((q) => q.k === b.dataset.v)]));
    $('#avRun').disabled = av.run >= 0; $$('#avSel button').forEach((b) => { b.disabled = av.run >= 0; });
    chipOn($('#hcSel'), hc.lab); $$('#hcSel button').forEach((b) => { b.classList.toggle('seen', !!hc.done[b.dataset.v]); b.disabled = hc.moving || hc.auto; });
    const busy = hc.moving || hc.auto; $('#hcRun').disabled = busy; $('#hcStep').disabled = busy;
    $('#hcRun').textContent = hc.stage >= 4 ? '↺ 다시 실험' : hc.stage > 0 && !busy ? '▶ 이어서 진행' : '▶ 실험 진행'; $('#hcStep').textContent = hc.stage >= 4 ? '↺ 처음 단계로' : '⏭ 한 단계씩';
    const hi = hcIn(); $('#hc35').classList.toggle('ok', hi.S); $('#hc32').classList.toggle('ok', hi.P);
    chipOn($('#matSel'), ex.mat); $$('#matSel button').forEach((b) => { b.disabled = ex.n > 0 || ex.run >= 0; });
    $$('#exPool button').forEach((b) => { b.disabled = +b.dataset.v < ex.n || ex.run >= 0 || ex.ctlRun; b.classList.toggle('on', +b.dataset.v < ex.n); });
    $('#exCnt').textContent = '(' + ex.n + ' / 7 단계)'; $('#exCtrl').disabled = !(ex.n >= 7 && !ex.ctl && !ex.ctlRun);
  }
  bindModes(setMode);
  $$('#grSel button').forEach((b) => b.addEventListener('click', () => grInject(+b.dataset.v)));
  $('#grReset').addEventListener('click', () => { Sound.click(); grReset(); });
  $$('#avSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); av.sel = b.dataset.v; updateCtl(); }));
  $('#avRun').addEventListener('click', avRunGo); $('#avReset').addEventListener('click', () => { Sound.click(); avReset(); });
  $$('#hcSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); hcLabel(b.dataset.v); }));
  $('#hcRun').addEventListener('click', () => { Sound.click(); hcRun(); }); $('#hcStep').addEventListener('click', () => { Sound.click(); hcStep(); });
  ['hc35', 'hc32'].forEach((id) => $('#' + id).addEventListener('input', () => updateCtl()));
  $$('#matSel button').forEach((b) => b.addEventListener('click', () => { Sound.click(); ex.mat = b.dataset.v; updateCtl(); }));
  $('#exCtrl').addEventListener('click', exCtl); $('#exReset').addEventListener('click', () => { Sound.click(); exReset(); });
  $('#argReset').addEventListener('click', () => { Sound.click(); argSorter.reset(); });


  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '형질 전환 실험', short: '형질 전환', icon: '🐭', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 생물의 형질을 다음 세대로 전하는 물질은 단백질일까, DNA일까? 그 증거는 어떻게 얻었을까?</p><p>🔗 <b>통합과학</b>에서 DNA의 구조와 염기 서열이 유전 정보라는 것을 배웠어요. 하지만 1900년대 초에는 아미노산이 20종인 <b>단백질</b>이 염기가 4종인 DNA보다 정보를 더 많이 담을 수 있어서 유전 물질로 여겨졌어요.</p><p>과학자들은 어떤 <b>실험 증거</b>로 생각을 바꿨을까요? 먼저 <b>그리피스</b>의 쥐 실험과 <b>에이버리</b>의 효소 실험을 가상으로 해 봐요. 모든 실험은 가상이고, 숫자는 예시 값이에요.</p>',
      features: ['griffith', 'avery'],
      setup() { grReset(); avReset(); setMode('griffith'); },
      recap: '그리피스는 열처리한 S형과 살아 있는 R형을 함께 주사한 쥐가 죽고 살아 있는 S형이 나오는 형질 전환을 발견했고, 에이버리는 DNA 분해 효소를 처리했을 때만 형질 전환이 일어나지 않는 것을 보여 형질 전환 물질이 DNA임을 밝혔어요.',
      summary: '<ul><li><b>그리피스(1928)</b>: 폐렴 쌍구균 S형(협막 있음, 병원성)과 R형(협막 없음, 비병원성). 쥐에 R형 → 생존, S형 → 사망, <b>열처리한 S형 → 생존</b>, <b>열처리한 S형 + 살아 있는 R형 → 사망</b>(죽은 쥐에서 살아 있는 S형 분리). R형이 죽은 S형의 어떤 물질로 S형이 되는 <b>형질 전환</b>이에요. (물질이 무엇인지는 몰랐어요)</li><li><b>에이버리 등(1944)</b>: S형 추출물을 단백질 · RNA · DNA 분해 효소로 처리한 뒤 R형과 섞어 배양했더니, <b>DNA 분해 효소를 처리한 것만</b> S형 콜로니가 거의 생기지 않았어요(예시: 약 120 · 115 · 118 · 0~2개). → 형질 전환 물질은 <b>DNA</b>예요.</li></ul>',
      missions: [
        {
          id: 'mice', title: '쥐 4마리에 주사하기',
          goal: '쥐 4마리에 <b>R형 · S형 · 열처리한 S형 · 열처리한 S형 + R형</b>을 차례로 주사하고 결과를 확인하세요.',
          hint: '왼쪽의 주사 버튼(또는 쥐 그림)을 눌러요. 3일 뒤 쥐가 살았는지 죽었는지, 혈액 속 세균은 어떤 모양인지 현미경 그림을 살펴봐요.',
          setup() { grReset(); setMode('griffith'); },
          check: () => grCount() === 4, hold: 0.8,
          status: () => GR.map((g, i) => mark(grDone(i)) + ' ' + (i + 1) + '번').join(' &nbsp; '),
          explain: '<b>열처리한 S형 + 살아 있는 R형</b>을 맞은 쥐만 죽었고, 죽은 쥐의 혈액에서 <b>살아 있는 S형</b>(협막이 있는 세균)이 나왔어요. 열처리한 S형만으로는 쥐가 죽지 않았으므로, 죽은 S형이 되살아난 것이 아니라 <b>R형이 S형으로 바뀐</b> 거예요. 이것을 <b>형질 전환</b>이라고 해요.',
        },
        {
          id: 'enzyme', title: '효소 3종 처리 후 콜로니 세기',
          goal: 'S형 추출물을 <b>처리 없음 · 단백질 · RNA · DNA 분해 효소</b>로 각각 처리하고 R형과 섞어 배양해 S형 콜로니를 세어 보세요.',
          hint: '에이버리 화면에서 방식을 고르고 [처리하고 12시간 배양]을 눌러요. 네 가지를 모두 해서 접시를 비교해 보세요.',
          setup() { avReset(); setMode('avery'); },
          check: () => av.done.every((d) => d), hold: 0.8,
          status: () => AVT.map((q, i) => mark(av.done[i]) + ' ' + q.tag).join(' &nbsp; '),
          explain: '<b>DNA 분해 효소</b>로 처리한 접시에서만 S형 콜로니가 거의 생기지 않았어요(0~2개). 단백질이나 RNA를 분해해도 형질 전환은 그대로(약 115 ~ 120개)였어요. 따라서 R형을 S형으로 바꾼 <b>형질 전환 물질은 DNA</b>예요.',
        },
        {
          type: 'quiz', title: '쥐가 죽은 까닭',
          goal: '열처리한 S형과 살아 있는 R형을 함께 맞은 쥐가 죽었고, 죽은 쥐에서 <b>살아 있는 S형</b>이 나왔어요. 가장 알맞은 설명은?',
          setup() { setMode('griffith'); },
          choices: ['열처리해 죽인 S형 세균이 다시 살아났다', '살아 있는 R형 세균이 죽은 S형 세균의 어떤 물질을 받아 S형으로 바뀌었다', 'R형 세균이 쥐의 면역 기능을 약하게 만들었다', '쥐가 두 종류의 세균에 놀라서 죽었다'],
          answer: 1,
          feedback: ['열처리한 S형만 주사한 쥐는 살았어요. 죽은 세균이 되살아난 것이 아니에요.', '', 'R형만 주사한 쥐는 살았어요. R형 자체는 병을 일으키지 않아요.', '세균 종류 때문이 아니라 살아 있는 S형이 병을 일으켰어요.'],
          explain: '죽은 S형 세균에서 나온 물질이 살아 있는 R형으로 들어가 R형이 <b>S형으로 바뀐</b> 것이에요(형질 전환). 에이버리의 실험에서 <b>DNA 분해 효소 처리 접시에만</b> S형 콜로니가 없는 것은 이 물질이 DNA이기 때문이에요.',
        },
      ],
    },
    {
      title: '허시와 체이스의 실험', short: '허시·체이스', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 형질 전환 물질이 DNA라는 증거를 봤어요. 그런데 \'DNA에 단백질이 조금 섞여 있었던 것 아닐까?\'라는 의문이 남았어요.</div><p><b>허시와 체이스(1952)</b>는 세균에 감염하는 바이러스 <b>박테리오파지 T2</b>(단백질 껍질 + DNA)로 이 의문을 풀었어요. <b>황(S)</b>은 단백질에만, <b>인(P)</b>은 DNA에 많다는 점을 이용해 단백질은 ³⁵S로, DNA는 ³²P로 표지했어요.</p><p>표지한 파지로 대장균을 감염시키고 믹서로 흔든 뒤 원심 분리해서, 방사선이 <b>상층액(껍질)</b>에 있는지 <b>침전물(대장균)</b>에 있는지 재요. 방사선 계수(cpm)는 예시 값이에요.</p>',
      features: ['hershey'],
      setup() { hcReset(); hc.done = { S: false, P: false }; $('#hc35').value = ''; $('#hc32').value = ''; setMode('hershey'); },
      recap: '³⁵S로 표지한 단백질 껍질은 상층액에, ³²P로 표지한 DNA는 침전물(대장균 안)에 많고 자손 파지에서도 ³²P가 검출돼서, 파지가 대장균에 넣어 준 유전 물질은 DNA예요.',
      summary: '<ul><li><b>허시와 체이스(1952)</b>: 박테리오파지 T2는 단백질 껍질 + DNA. 황(S)은 단백질에만, 인(P)은 DNA에 많아서 ³⁵S로 단백질을, ³²P로 DNA를 표지했어요. 대장균 감염 → 믹서로 껍질 떼기 → 원심 분리(상층액: 파지 껍질, 침전물: 대장균).</li><li>방사선 계수(예시): ³⁵S 표지는 상층액 8000 · 침전물 2000(침전물 <b>20 %</b>), ³²P 표지는 상층액 3000 · 침전물 7000(침전물 <b>70 %</b>). 자손 파지에서는 ³²P가 검출되고 ³⁵S는 거의 없었어요.</li><li>침전물이 100 %가 아닌 까닭: 껍질이 완전히 떨어지지 않고 일부 DNA는 상층액에 남아서예요. → 파지가 대장균에 넣어 준 유전 물질은 <b>DNA</b>예요.</li></ul>',
      missions: [
        {
          id: 'hershey', title: '두 표지 파지 실험과 비율 계산',
          goal: '<b>³⁵S 표지 · ³²P 표지</b> 파지 실험을 모두 하고, 두 실험에서 침전물의 방사선 비율(%)을 계산해 입력하세요.',
          hint: '표지를 고르고 [실험 진행]을 눌러요. 끝나면 기록의 상층액과 침전물 값으로 침전물 ÷ (상층액 + 침전물) × 100 을 계산해요. ³⁵S는 2000 ÷ 10000, ³²P는 7000 ÷ 10000이에요.',
          setup() { hcReset(); hc.done = { S: false, P: false }; $('#hc35').value = ''; $('#hc32').value = ''; setMode('hershey'); },
          check: () => hc.done.S && hc.done.P && hcIn().S && hcIn().P, hold: 0.8,
          status: () => mark(hc.done.S) + ' ³⁵S 실험 &nbsp; ' + mark(hc.done.P) + ' ³²P 실험 &nbsp; ' + mark(hcIn().S) + ' ³⁵S 20 % &nbsp; ' + mark(hcIn().P) + ' ³²P 70 %',
          explain: '³⁵S(단백질) 표지는 침전물에 2000 ÷ (8000 + 2000) = <b>20 %</b>, ³²P(DNA) 표지는 7000 ÷ (3000 + 7000) = <b>70 %</b>예요. DNA는 대장균 안으로 들어가 침전물에 남고, 단백질 껍질은 대부분 밖에 남아 상층액으로 갔어요. 또 자손 파지에서 ³²P는 검출되고 ³⁵S는 거의 없었어요.',
        },
        {
          type: 'quiz', title: '믹서와 원심 분리의 까닭',
          goal: '실험에서 대장균과 파지를 <b>믹서로 흔드는 까닭</b>은?',
          setup() { setMode('hershey'); },
          choices: ['대장균을 모두 죽이기 위해서', '대장균 표면에 붙어 있는 파지 껍질을 떼어 내어 껍질과 대장균을 따로 분리하기 위해서', '방사선을 없애기 위해서', 'DNA를 단백질로 바꾸기 위해서'],
          answer: 1,
          feedback: ['대장균이 죽으면 파지가 자손을 만들 수 없고 침전물에 모이지도 않아요.', '', '방사선은 흔든다고 사라지지 않아요.', 'DNA가 단백질로 바뀌지 않아요.'],
          explain: '믹서로 흔들면 대장균 밖에 남은 <b>파지 껍질</b>이 떨어져 나가요. 원심 분리를 하면 가벼운 껍질은 <b>상층액</b>에, 더 무거운 <b>대장균</b>은 <b>침전물</b>에 가라앉아요. 침전물에 남은 방사선은 대장균 안으로 들어간 물질을 뜻해요.',
        },
      ],
    },
    {
      title: 'DNA 추출하기', short: 'DNA 추출', icon: '🍓', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 유전 물질이 DNA라는 증거를 봤어요. 이제 DNA를 직접 <b>눈으로 관찰</b>해 봐요.</div><p>딸기 · 바나나 · 브로콜리 같은 식물이나 과일의 세포에서 <b>DNA를 추출</b>하는 가상 실험이에요. 순서는 <b>으깨기 → 추출액 → 거르기 → 단백질 분해 효소 → 차가운 에탄올 → 관찰 → 감기</b>예요.</p><p>💡 세제(막 녹이기), 소금(DNA 뭉치게 하기), 에탄올(DNA가 녹지 않고 엉김)이 각각 어떤 역할을 하는지 살펴봐요. 에탄올은 불 근처에서 쓰지 않아요.</p>',
      features: ['extract'],
      setup() { exReset(); setMode('extract'); },
      recap: '으깬 재료에 세제와 소금을 넣으면 세제가 세포막과 핵막을 녹이고 소금이 DNA를 뭉치게 해요. 차가운 에탄올을 부으면 DNA는 녹지 않고 두 층의 경계에서 흰 실처럼 엉겨요.',
      summary: '<ul><li><b>DNA 추출 순서</b>: 으깨기(조직 분쇄) → 추출액(물 + 소금 + 주방 세제) → 거르기 → (단백질 분해 효소) → 차가운 에탄올을 벽을 따라 조용히 붓기(추출액 : 에탄올 = 1 : 2) → 경계 관찰 → 막대로 감기.</li><li><b>세제</b>: 세포막과 핵막(지질 이중층)을 녹여요. <b>소금</b>: DNA의 음전하를 가려 뭉치게 해요. <b>에탄올</b>: DNA가 녹지 않아 흰 실처럼 엉겨요. 에탄올이 DNA를 만드는 것이 아니에요.</li><li>세제를 뺀 대조 시험관에서는 DNA가 거의 나오지 않아요 → 세제의 역할을 확인하는 대조 실험이에요.</li><li>에탄올은 불 근처에서 사용하지 않아요.</li></ul>',
      missions: [
        {
          id: 'order', title: '추출 순서대로 실험하기', manual: true,
          goal: '오른쪽 버튼을 <b>알맞은 순서</b>대로 눌러 7단계를 모두 마치세요.',
          hint: '먼저 재료를 부수고(으깨기), 그다음 세포를 녹이는 추출액을 넣어요. 걸러 낸 액체에 효소를 넣고, 마지막에 차가운 에탄올을 부어 DNA를 모아요.',
          setup() { exReset(); setMode('extract'); },
          check() { return ex.n >= 7 ? true : (ex.n === 0 ? '아직 시작하지 않았어요. 첫 단계를 눌러 보세요.' : '아직 ' + ex.n + ' / 7 단계까지 했어요. 나머지 단계를 순서대로 눌러 주세요.'); },
          explain: '으깨기 → 추출액(세제는 세포막 · 핵막을 녹이고 소금은 DNA를 뭉치게 해요) → 거르기 → 단백질 분해 효소(DNA에 붙은 단백질을 잘라요) → <b>차가운 에탄올</b>(DNA가 녹지 않고 엉겨요) → 관찰 → 감기 순서예요. 앞 단계의 결과물이 다음 단계의 재료가 돼요.',
        },
        {
          id: 'control', title: '세제를 뺀 대조 실험',
          goal: '추출을 마친 뒤 <b>세제를 뺀 대조 시험관</b>을 만들어 DNA 실의 양을 비교하세요.',
          hint: '7단계를 모두 마치면 [세제를 뺀 대조 시험관 만들기] 버튼이 켜져요. 눌러서 시험관 A와 B를 비교해 보세요.',
          setup() { setMode('extract'); },
          check: () => ex.ctl === 1 && ex.n >= 7, hold: 0.8,
          status: () => mark(ex.n >= 7) + ' 추출 완료 &nbsp; ' + mark(ex.ctl === 1) + ' 대조 시험관 비교',
          explain: '세제가 없으면 세포막과 핵막이 녹지 않아 DNA가 세포 밖으로 거의 나오지 못해요. 그래서 시험관 B에는 흰 실이 거의 보이지 않아요. 한 가지 조건(세제)만 다르게 한 <b>대조 실험</b>으로 세제의 역할을 확인할 수 있어요.',
        },
        {
          type: 'quiz', title: '흰 실이 DNA라고 할 수 있는 근거',
          goal: '에탄올을 부은 층의 경계에 생긴 흰 실이 DNA라고 할 수 있는 근거로 가장 알맞은 것은?',
          setup() { setMode('extract'); },
          choices: ['에탄올이 DNA를 새로 만들어 내기 때문이다', '추출액에는 녹아 있던 DNA가 에탄올에는 녹지 않아 엉기는 성질이 있고, 염색약 등으로 DNA임을 확인할 수 있기 때문이다', '흰색이면 모두 DNA이기 때문이다', '세제가 DNA로 바뀌었기 때문이다'],
          answer: 1,
          feedback: ['에탄올은 DNA를 만들지 않아요. 이미 녹아 있던 DNA가 엉겨 모이는 것뿐이에요.', '', '색만으로는 DNA인지 알 수 없어요. 성질과 염색 같은 확인이 필요해요.', '세제는 막을 녹일 뿐 DNA로 바뀌지 않아요.'],
          explain: '추출액 속 DNA는 <b>에탄올에 녹지 않아서</b> 두 층의 경계에서 실처럼 엉겨요. 흰 실이 DNA인지는 이런 성질과 염색약 반응 등으로 확인해요. <b>에탄올이 DNA를 만드는 것이 아니에요.</b>',
        },
      ],
    },
    {
      title: '증거 종합하기', short: '증거 종합', icon: '🧩', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 그리피스 · 에이버리 · 허시와 체이스의 실험과 DNA 추출을 해 봤어요.</div><p>이제 세 실험을 \'<b>질문 – 방법 – 결과 – 결론 – 남은 한계</b>\' 논증 틀로 정리해요. 그리피스는 물질이 무엇인지 몰랐고, 에이버리가 물질을 하나씩 분해해서 DNA를 가려냈고, 허시와 체이스가 바이러스에서 다시 확인했어요.</p><p>💡 이 정리는 <b>발표 자료</b>(연표 · 인포그래픽 · 카드뉴스 · 영상 콘티)의 뼈대가 돼요. 다음 차시에서는 DNA의 구조를 규명한 과정을 살펴봐요.</p>',
      features: ['argue'],
      setup() { argSorter.reset(); setMode('argue'); },
      recap: '유전 물질이 DNA라는 증거는 한 번의 실험이 아니라 서로 다른 여러 실험이 차례로 쌓여 얻어졌고, 각 실험의 한계는 다음 실험이 보완했어요. 일부 바이러스는 RNA가 유전 물질이에요.',
      summary: '<ul><li><b>논증 틀</b>: 질문 – 방법 – 결과 – 결론 – 남은 한계. 그리피스(형질 전환 발견, 물질은 모름) → 에이버리(효소로 물질을 가려내 DNA) → 허시와 체이스(바이러스에서 DNA 확인).</li><li><b>유전 물질의 조건</b>: 유전 정보를 저장하고, 정확히 복제되며, 자손에게 전달되고, 드물게 변이가 생겨야 해요.</li><li>증거는 한 번의 실험이 아니라 서로 다른 실험들이 쌓여 만들어져요. 대부분의 생물은 DNA가 유전 물질이지만, 일부 바이러스(예: 담배 모자이크 바이러스)는 RNA가 유전 물질이에요.</li></ul>',
      missions: [
        {
          id: 'argue', title: '결론과 한계 카드 놓기', manual: true,
          goal: '세 실험의 <b>결론</b>과 <b>남은 한계</b> 카드 6장을 알맞은 칸에 넣으세요.',
          hint: '그리피스는 형질 전환 현상을 발견했지만 물질은 몰랐어요. 에이버리는 DNA라고 결론 냈지만 단백질 섞임 의혹이 남았고, 허시와 체이스가 바이러스로 다시 확인했어요.',
          setup() { argSorter.reset(); setMode('argue'); },
          check() {
            const n = argSorter.placed;
            if (n < 6) { argSorter.markBad([]); return '카드를 모두 칸에 넣어 주세요. (' + n + ' / 6)'; }
            const w = argWrong();
            if (!w.length) { argSorter.markBad([]); return true; }
            argSorter.markBad(w.map((c) => c.id));
            return '\'' + w[0].label.slice(0, 14) + '…\' 카드를 다시 생각해 보세요. 어느 실험의 결론(또는 한계)일까요?';
          },
          explain: '<b>그리피스</b>: 형질 전환을 발견했지만 그 물질이 무엇인지는 몰랐어요. <b>에이버리</b>: 효소로 물질을 가려내 DNA가 형질 전환 물질이라고 했지만 단백질이 조금 섞였을 가능성이 남았어요. <b>허시와 체이스</b>: 방사성 표지로 바이러스가 넣어 준 물질이 DNA임을 다시 확인했어요(껍질이 100 % 떨어지지는 않았어요).',
        },
        {
          type: 'quiz', title: '가설 뒤집기',
          goal: '만약 <b>단백질</b>이 유전 물질이었다면 허시와 체이스의 실험에서 어떤 결과가 예상될까요?',
          setup() { setMode('argue'); },
          choices: ['³⁵S가 침전물(대장균 안)에서 많이 검출되고 자손 파지에서도 ³⁵S가 검출된다', '³⁵S가 상층액에만 있고 자손 파지에서는 ³²P만 검출된다', '³²P와 ³⁵S가 모두 상층액에만 있다', '어떤 방사선도 검출되지 않는다'],
          answer: 0,
          feedback: ['', '이것은 실제 실험 결과에 가까워요. 단백질이 유전 물질이라면 반대가 되어야 해요.', '유전 물질이 대장균에 들어가야 자손 파지가 만들어져요.', '표지한 물질은 어디엔가 남아 검출돼요.'],
          explain: '유전 물질이 대장균 안으로 들어가 자손 파지에 전달된다고 가정하면, 단백질이 유전 물질일 때는 <b>³⁵S가 침전물과 자손 파지</b>에서 나와야 해요. 실제로는 ³²P(DNA)가 그렇게 나타났기 때문에 유전 물질이 DNA라는 결론이 나와요.',
        },
        {
          type: 'quiz', title: '증거는 어떻게 쌓일까',
          goal: '유전 물질이 DNA라는 결론에 대한 설명으로 알맞은 것은?',
          setup() { setMode('argue'); },
          choices: ['한 번의 실험으로 모든 의문이 풀려 확정되었다', '서로 다른 여러 실험이 차례로 증거를 쌓고, 앞 실험의 한계를 뒤 실험이 보완했다', '모든 생물과 바이러스의 유전 물질은 반드시 DNA다', '유전 물질은 정보를 저장하기만 하면 되고 복제될 필요는 없다'],
          answer: 1,
          feedback: ['에이버리의 결과에도 단백질 섞임 의혹이 남아서 허시와 체이스의 실험이 필요했어요.', '', '일부 바이러스(예: 담배 모자이크 바이러스)는 RNA가 유전 물질이에요.', '유전 물질은 정보 저장, 정확한 복제, 자손에게 전달, 드문 변이가 모두 필요해요.'],
          explain: '유전 물질은 <b>정보 저장 · 복제 · 전달 · 변이</b>의 조건을 갖춰야 해요. DNA가 유전 물질이라는 결론은 그리피스 → 에이버리 → 허시와 체이스로 이어진 <b>여러 실험의 증거</b>가 쌓여 얻어졌어요. 일부 RNA 바이러스는 RNA가 유전 물질이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-genetic-material', mount: '#game', badge: '유전 물질 탐정', homeHref: '../../index.html#hg',
    featureLabels: { griffith: '🐭 그리피스', avery: '🧫 에이버리', hershey: '🧪 허시 · 체이스', extract: '🍓 DNA 추출', argue: '🧩 증거 종합' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'griffith') {
      const fin = gm.map((q, i) => (q.phase === 3 ? GR[i].dead : null)).filter((v) => v !== null);
      setReads(['주사한 쥐', gm.filter((q) => q.phase > 0).length + ' / 4마리', '사망', fin.filter((v) => v).length + '마리', '생존', fin.filter((v) => !v).length + '마리']);
    } else if (m === 'avery') {
      setReads(['처리한 접시', av.done.filter((d) => d).length + ' / 4', '처리 없음', av.done[0] ? 'S형 약 120개' : '—', 'DNA 분해 효소', av.done[3] ? 'S형 0~2개' : '—']);
    } else if (m === 'hershey') {
      const sh = hc.t >= 3.7;
      setReads(['표지', HC_NAME[hc.lab], '상층액 · 침전물', sh ? fmtN(Math.round(hc.cnt.sup)) + ' · ' + fmtN(Math.round(hc.cnt.pel)) + ' cpm' : '—', '실험 완료', (hc.done.S ? '³⁵S ' : '') + (hc.done.P ? '³²P' : '') || '—']);
    } else if (m === 'extract') {
      setReads(['재료', MATS[ex.mat].name, '진행', ex.n + ' / 7 단계', '세제를 뺀 대조', ex.ctl ? '비교 완료' : ex.ctlRun ? '진행 중' : '아직']);
    } else {
      const z = (pre) => argSorter.cards.filter((c) => c.zone && c.zone[0] === pre).length;
      setReads(['놓은 카드', argSorter.placed + ' / 6', '결론 칸', z('c') + ' / 3', '남은 한계 칸', z('l') + ' / 3']);
    }
  }

  /* ---------- 시작 ---------- */
  setMode('griffith');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    if (S.mode !== 'griffith') grUpdate(dt);
    if (S.mode !== 'hershey') hcUpdate(dt);
    if (S.mode !== 'extract') exUpdate(dt);
    FX.update(dt);
    switch (S.mode) {
      case 'griffith': griffithDraw(dt, t); break;
      case 'avery': averyDraw(dt, t); break;
      case 'hershey': hershDraw(dt, t); break;
      case 'extract': extractDraw(dt, t); break;
      case 'argue': argDraw(dt, t); break;
    }
    FX.draw();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, gm, GR, grInject, grReset, grCount, av, AVT, avRunGo, avReset, hc, HC_DATA, hcRun, hcStep, hcLabel, hcReset, hcIn, hcPct,
    ex, EX_STEPS, EX_ORDER, exStep, exCtl, exReset, argSorter, ARG_CARDS, argWrong, MATS,
  };
})();
