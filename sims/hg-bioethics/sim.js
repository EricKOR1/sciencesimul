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
  const ease = SciSim.ease;
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
  /* 상자 안에 글을 꽉 채워 쓰기: 줄 수가 넘치면 글자를 줄여요 */
  function textFit(x, y, w, h, str, maxS, minS, color, weight, align) {
    let s = maxS, ls;
    for (; s >= minS; s -= 0.5) { ls = wrap(str, w, s, weight || 700); if (ls.length * s * 1.42 <= h) break; }
    ls = wrap(str, w, s, weight || 700);
    const lh = s * 1.42;
    ls.forEach((l, i) => T(align === 'center' ? x + w / 2 : x, y + s + i * lh, l, s, color, align || 'left', weight || 700));
    return s;
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
      else if (e.kind === 'flash') { ctx.save(); ctx.globalAlpha = (1 - p) * (e.alpha || 0.6); D.glow(e.x, e.y, (e.r || 40) * (0.6 + p), e.color || '#ef4444', 1); ctx.restore(); }
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
    D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, r); ctx.fillStyle = c.bad ? '#fdeceb' : (c.ok ? '#effaf1' : (c.sel ? '#fff8dc' : (c.fill || '#fff'))); ctx.fill(); }, { blur: 5 + c.lift * 10, y: 2 + c.lift * 4 });
    ctx.strokeStyle = c.bad ? '#e2464b' : c.ok ? '#16a34a' : c.sel ? '#f59e0b' : C.shade(c.col || '#16a34a', 0.15); ctx.lineWidth = c.bad || c.sel || c.ok ? 3 : 2; D.roundRect(-w / 2, -h / 2, w, h, r); ctx.stroke();
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
     o.cards: [{id, label, short, icon, col, sub}]   o.boxes: [{id, label, col, x, y, w, h, cols, hdr, cap}]
     o.tray(i) -> {x, y}   o.cw, o.ch: 카드 크기   o.kh: 상자 속 칩 높이   o.onTap(card)   o.onChange() */
  class Sorter {
    constructor(o) {
      this.o = o; this.boxes = o.boxes; this.seq = 0; this.drag = null; this.hot = null;
      this.cards = o.cards.map((d, i) => { const p = o.tray(i); return Object.assign({}, d, { x: p.x, y: p.y, w: o.cw, h: o.ch, zone: null, lift: 0, bad: false, ok: false, shake: 0, home: p, seq: 0, sel: false }); });
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
      const was = c.zone; c.zone = zoneId || null; c.bad = false; c.ok = false; if (zoneId) c.seq = ++this.seq; c.lift = 0;
      const box = zoneId ? this.boxes.find((b) => b.id === zoneId) : null;
      if (box && box.cap) {
        const mem = this.cards.filter((k) => k.zone === zoneId && k !== c).sort((a, b) => a.seq - b.seq);
        while (mem.length >= box.cap) { const o = mem.shift(); o.zone = null; o.bad = false; o.ok = false; }
      }
      this.layout(); if (was !== c.zone) { Sound.click(); this.o.onChange && this.o.onChange(); }
    }
    reset() { this.cards.forEach((c) => { c.zone = null; c.bad = false; c.ok = false; c.sel = false; }); this.drag = null; this.selected = null; this.layout(true); this.o.onChange && this.o.onChange(); }
    get placed() { return this.cards.filter((c) => c.zone).length; }
    markBad(ids) {
      this.cards.forEach((c) => { const bad = ids.indexOf(c.id) >= 0; if (bad && !c.bad) c.shake = 1; c.bad = bad; });
    }
    markOk(ids) { this.cards.forEach((c) => { c.ok = ids.indexOf(c.id) >= 0 && !c.bad; }); }
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
        if (b.label) TF(b.x + b.w / 2, b.y + (b.ly || 19), b.label, b.w - 16, b.ls || 14.5, 11.5, C.shade(b.col, -0.35), 'center', 800);
        if (b.draw) b.draw(b);
      });
    }
    drawCards() { this.cards.forEach((c) => { c.sel = !!(this.o.isSel && this.o.isSel(c)); drawCard(c); }); }
    draw() { this.drawBoxes(); this.drawCards(); }
  }
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

  /* 읽음 칸 (캔버스 아래 3칸) */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function setReads(a) {
    const k = a.join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = a[0]; v1.textContent = a[1]; l2.textContent = a[2]; v2.textContent = a[3]; l3.textContent = a[4]; v3.textContent = a[5];
  }
  function fmtN(n, d) { return Number(n).toLocaleString('ko-KR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  const fmtG = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));
  function chipOn(root, val) { $$('button', root).forEach((b) => b.classList.toggle('on', String(b.dataset.v) === String(val))); }
  /* 모드 단추: 현재 단계(data-lv, 공백으로 여러 단계 가능)에 속한 것만 보여 줘요 */
  function modeBtns(cur, lvNow, free) {
    $$('#modeSeg button').forEach((b) => {
      const lvs = String(b.dataset.lv).split(' ').map(Number);
      b.classList.toggle('on', b.dataset.mode === cur);
      b.classList.toggle('lv-off', !free && lvs.indexOf(lvNow) < 0);
    });
  }
  function bindModes(setModeFn) { $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setModeFn(b.dataset.mode); })); }
  const wait = (fn, ms) => setTimeout(fn, ms);
  function okBurst(x, y) { parts.burst(x, y, { count: 14, speed: 120, life: 0.7, size: 3.5 }); }
  function pill(x, y, text, o) { return D.label(x, y, text, o); }
  function dot(x, y, r, col, o) { D.sphere(x, y, r, col, o || {}); }
  function curveArrow(x1, y1, cx1, cy1, cx2, cy2, x2, y2, o) {
    o = o || {};
    ctx.save(); ctx.strokeStyle = ctx.fillStyle = o.color || '#334155'; ctx.lineWidth = o.width || 4; ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2); ctx.stroke(); ctx.setLineDash([]);
    const a = Math.atan2(y2 - cy2, x2 - cx2), h = o.head || 11;
    ctx.beginPath(); ctx.moveTo(x2 + Math.cos(a) * 2, y2 + Math.sin(a) * 2);
    ctx.lineTo(x2 - Math.cos(a) * h + Math.sin(a) * h * 0.55, y2 - Math.sin(a) * h - Math.cos(a) * h * 0.55);
    ctx.lineTo(x2 - Math.cos(a) * h - Math.sin(a) * h * 0.55, y2 - Math.sin(a) * h + Math.cos(a) * h * 0.55); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /* 작은 안전 저장 (실패해도 괜찮아요) */
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 무시 */ } }
  /* 눌러서 한 번에 한 칸씩 채우는 순서 도우미: 같은 배열을 섞어요 */
  function shuffled(arr, seed) { const r = mulberry(seed || 7), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* =========================================================
     고등학교 생물의 유전 · Ⅲ. 생명공학기술 - 생명윤리와 의사 결정 (단원 61, 7차시)
     성취기준 [12유전03-05] 생명공학기술의 활용 과정에서 나타나는 문제점과 이에 대한 사회적 책임을 인식하고 생명윤리 쟁점에 대해 의사 결정할 수 있다.
     ① 관찰: 쟁점 찾기  ② 탐구: 이해관계  ③ 적용: 의사 결정  ④ 소통: 제도와 책임
     (모든 사례는 가상이고 점수는 교육용이에요. 정답이 있는 질문이 아니라, 근거와 가치를 드러내는 연습이에요)
     ========================================================= */
  const S = { mode: 'issues', fade: 0, t: 0 };
  let game = null, FDT = 0;
  const ctlNodes = $$('#ctrlCard .control');
  const MINUS = '−';

  /* ---------- 저장 (새로고침해도 앞 단계에서 만든 것이 남아요) ---------- */
  const KEY = 'sciencesimul.hg-bioethics.v1';
  const BX = Object.assign({
    tags: [[], [], [], [], [], []], val: [-1, -1, -1, -1, -1, -1], stance: [null, null, null, null, null], pval: [null, null, null, null, null],
    w: [3, 3, 2, 2], sd: { dec: '', fact: -1, val: -1, reb: -1, rev: -1 }, sc: { a: -1, b: -1, c: -1 },
  }, lsGet(KEY) || {});
  function bxSave() { lsSet(KEY, BX); }

  /* =========================================================
     ① 쟁점 카드 6장 (가상 사례)
     ========================================================= */
  const CATS = [['eco', '생태적', '#16a34a', '🌿'], ['eth', '윤리적', '#8b5cf6', '🧠'], ['ins', '제도적', '#0ea5e9', '📜'], ['soc', '사회적', '#f59e0b', '👥']];
  const CAT = (id) => CATS.find((c) => c[0] === id);
  const ISSUES = [
    { icon: '🧬', title: '유전자 검사와 차별', situ: '가상의 보험사가 가입자의 유전자 검사 결과를 요구해서 보험료와 취업 결정에 쓰려고 해요.', fq: '유전자 검사 결과만으로 질병 발생을 정확히 예측할 수 있을까?', vq: '유전 정보를 보험과 취업 결정에 써도 될까?', must: ['soc'], allow: ['soc', 'ins', 'eth'] },
    { icon: '👶', title: '생식세포 · 배아 유전자 편집', situ: '한 가상의 연구팀이 심각한 유전 질환을 막으려고 배아의 유전자를 편집하려고 해요. 편집 결과는 후손에게 유전돼요.', fq: '편집이 의도하지 않은 위치를 바꾸는 오프타깃을 얼마나 줄일 수 있을까?', vq: '질병 예방을 위한 배아 편집을 허용해야 할까?', must: ['eth'], allow: ['eth', 'soc', 'ins'] },
    { icon: '🌱', title: '배아줄기세포 연구', situ: '난임 시술 뒤 남은 배아를 기증받아 줄기세포를 연구하려는 가상의 연구 계획이 있어요.', fq: '배아줄기세포는 어떤 세포로 분화할 수 있을까?', vq: '배아를 연구에 사용하는 것을 허용해도 될까?', must: ['eth'], allow: ['eth', 'ins'] },
    { icon: '🌽', title: 'LMO 재배와 표시제', situ: '가상의 지역에서 LMO 작물 재배를 승인하려고 하는데, 소비자들은 표시를 요구해요.', fq: '이 작물의 꽃가루가 이웃 밭으로 얼마나 퍼질까?', vq: '소비자의 선택권을 위해 표시를 의무로 해야 할까?', must: ['eco', 'ins'], allow: ['eco', 'ins', 'soc'] },
    { icon: '🐖', title: '동물 복제와 이종 장기 이식', situ: '사람에게 이식할 수 있도록 유전자를 바꾼 돼지의 장기를 연구하려는 가상의 계획이 있어요.', fq: '이식한 장기에 대한 면역 거부를 줄일 수 있을까?', vq: '사람을 위해 동물을 이렇게 이용해도 될까?', must: ['eth'], allow: ['eth', 'ins', 'eco', 'soc'] },
    { icon: '🗄️', title: '대규모 유전체 정보 보관', situ: '가상의 여러 병원이 연구를 위해 많은 사람의 유전체 정보를 하나의 데이터 은행에 모으려고 해요.', fq: '이름을 지워도 유전 정보만으로 개인을 다시 알아낼 수 있을까?', vq: '연구의 이익을 위해 개인 정보의 위험을 어디까지 받아들여야 할까?', must: ['ins', 'soc'], allow: ['ins', 'soc', 'eth'] },
  ];
  /* 두 질문의 표시 순서 (0 = 사실 질문 먼저, 1 = 가치 질문 먼저) → 가치 질문이 있는 쪽 번호 */
  const VFIRST = [1, 0, 0, 1, 1, 0];
  const valSide = (i) => (VFIRST[i] ? 0 : 1);
  const IS = { sel: 0, open: ISSUES.map(() => false), flip: ISSUES.map(() => 0), stamp: {}, hits: [] };
  function isTagOK(i) { const t = BX.tags[i], I = ISSUES[i]; return I.must.every((m) => t.indexOf(m) >= 0) && t.every((x) => I.allow.indexOf(x) >= 0); }
  const isValOK = (i) => BX.val[i] === valSide(i);
  const isDone = (i) => isTagOK(i) && isValOK(i);
  function isSelect(i) { IS.sel = i; if (!IS.open[i]) { IS.open[i] = true; Sound.click(); } else Sound.tick(); updateCtl(); }
  function isToggleTag(c) {
    const i = IS.sel, t = BX.tags[i], k = t.indexOf(c);
    if (k >= 0) t.splice(k, 1); else { t.push(c); IS.stamp[i + c] = 0; }
    bxSave(); Sound.tick(); updateCtl();
  }
  function isSetVal(v) { BX.val[IS.sel] = v; bxSave(); Sound.tick(); updateCtl(); }
  function isGeom(i) {
    if (PHONE) return { x: 8 + (i % 2) * 236, y: 36 + Math.floor(i / 2) * 94, w: 228, h: 88 };
    return { x: 10 + (i % 3) * 262, y: 44 + Math.floor(i / 3) * 150, w: 252, h: 140 };
  }
  function issuesScene(dt, t) {
    T(14, 28, '쟁점 카드를 눌러 열고, 문제점의 범주를 붙여요 (가상 사례)', PHONE ? 13.5 : 16.5, '#334155', 'left', 800);
    IS.hits = [];
    ISSUES.forEach((I, i) => {
      IS.flip[i] = RM ? (IS.open[i] ? 1 : 0) : approach(IS.flip[i], IS.open[i] ? 1 : 0, dt, 9);
      const g = isGeom(i), f = IS.flip[i], sx = Math.max(0.05, Math.abs(Math.cos(f * Math.PI))), face = f > 0.5, sel = IS.sel === i;
      ctx.save(); ctx.translate(g.x + g.w / 2, g.y + g.h / 2); ctx.scale(sx, 1);
      D.shadow(() => { D.roundRect(-g.w / 2, -g.h / 2, g.w, g.h, 14); ctx.fillStyle = face ? '#fff' : '#e0e7ff'; ctx.fill(); }, { blur: sel ? 11 : 5, y: 3 });
      ctx.strokeStyle = sel ? '#f59e0b' : face ? (isDone(i) ? '#16a34a' : '#cbd5e1') : '#818cf8'; ctx.lineWidth = sel || (face && isDone(i)) ? 3.5 : 2; D.roundRect(-g.w / 2, -g.h / 2, g.w, g.h, 14); ctx.stroke();
      ctx.restore();
      if (sx > 0.3) {
        ctx.save(); ctx.translate(g.x + g.w / 2, 0); ctx.scale(sx, 1); ctx.translate(-(g.x + g.w / 2), 0);
        if (!face) { T(g.x + g.w / 2, g.y + g.h / 2 + (PHONE ? 4 : 2), '쟁점 ' + (i + 1), PHONE ? 20 : 26, '#6366f1', 'center', 800); T(g.x + g.w / 2, g.y + g.h - (PHONE ? 12 : 18), '눌러서 열기', 13, '#818cf8', 'center', 700); }
        else {
          E(I.icon, g.x + (PHONE ? 22 : 30), g.y + (PHONE ? 28 : 36), PHONE ? 24 : 34);
          TF(g.x + (PHONE ? 42 : 56), g.y + (PHONE ? 22 : 28), I.title, g.w - (PHONE ? 50 : 66), PHONE ? 14 : 16, 11, '#1f2d44', 'left', 800);
          if (!PHONE) T(g.x + 56, g.y + 50, '쟁점 ' + (i + 1) + ' · 가상 사례', 12.5, '#94a3b8', 'left', 700);
          // 범주 도장
          const tg = BX.tags[i], ty = g.y + g.h - (PHONE ? 22 : 30);
          tg.forEach((cid, k) => {
            const c = CAT(cid), key = i + cid; IS.stamp[key] = RM ? 1 : Math.min(1, (IS.stamp[key] == null ? 1 : IS.stamp[key]) + dt * 4);
            const s = IS.stamp[key], sc = 1 + (1 - ease.outCubic(s)) * 0.9, cx = g.x + (PHONE ? 6 : 10) + k * (PHONE ? 54 : 60) + (PHONE ? 25 : 28);
            ctx.save(); ctx.translate(cx, ty); ctx.rotate((k % 2 ? 0.05 : -0.05)); ctx.scale(sc, sc); ctx.globalAlpha = 0.35 + 0.65 * s;
            D.roundRect(-(PHONE ? 25 : 28), -11, PHONE ? 50 : 56, 22, 6); ctx.fillStyle = C.rgba(c[2], 0.18); ctx.fill(); ctx.strokeStyle = c[2]; ctx.lineWidth = 2; ctx.stroke();
            T(0, 5, c[1], 12.5, C.shade(c[2], -0.3), 'center', 800); ctx.restore();
          });
          if (!tg.length) T(g.x + 12, ty + 5, '범주를 붙여 보세요', 12.5, '#94a3b8', 'left', 700);
          if (isDone(i)) D.sphere(g.x + g.w - 16, g.y + 16, 11, '#16a34a', { text: '✓', textScale: 1.1, outline: '#fff', outlineWidth: 2 });
        }
        ctx.restore();
      }
      IS.hits.push({ i, x: g.x, y: g.y, w: g.w, h: g.h });
    });
    // 선택한 쟁점 자세히
    const py = PHONE ? 326 : 352, ph = PHONE ? 308 : 196, I = ISSUES[IS.sel];
    panel(10, py, VW - 20, ph, 16);
    if (!IS.open[IS.sel]) { T(VW / 2, py + ph / 2, '카드를 눌러 열면 상황과 질문이 나와요', 15, '#94a3b8', 'center', 800); return; }
    E(I.icon, 40, py + 32, 28); T(64, py + 38, '쟁점 ' + (IS.sel + 1) + '. ' + I.title, PHONE ? 15 : 17, '#1f2d44', 'left', 800);
    let yy = py + 62;
    yy += textBlock(24, yy, VW - 48, I.situ, PHONE ? 14 : 15.5, '#334155', PHONE ? 20 : 23, 700) + 10;
    const qs = VFIRST[IS.sel] ? [I.vq, I.fq] : [I.fq, I.vq];
    ['㉮', '㉯'].forEach((mk, k) => {
      const picked = BX.val[IS.sel] === k;
      pill(24, yy + 12, mk, { bg: picked ? '#8b5cf6' : '#94a3b8', color: '#fff', size: 14, pad: 7, align: 'left' });
      const h = textBlock(60, yy + 17, VW - 90, qs[k], PHONE ? 14 : 15.5, picked ? '#5b21b6' : '#475569', PHONE ? 20 : 23, picked ? 800 : 700);
      yy += Math.max(32, h + 10);
    });
    T(24, py + ph - 14, '※ 범주는 여러 개 붙일 수 있어요.  ㉮ ㉯ 중 어느 쪽이 가치 질문인지 정해요.', PHONE ? 12 : 13, '#94a3b8', 'left', 700);
  }
  const issuesPT = {
    down(p) { for (const r of IS.hits) if (inRect(p.x, p.y, r)) { isSelect(r.i); return false; } return false; },
    hover(p) { return IS.hits.some((r) => inRect(p.x, p.y, r)) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     ② 이해관계자 (쟁점 ②: 질병 예방 목적의 생식세포 편집 · 가상)
     ========================================================= */
  const STANCE = { allow: '허용', cond: '조건부 허용', ban: '유예 · 금지' };
  const PRIN = { auto: '자율성 존중', nonm: '악행 금지', bene: '선행', just: '정의' };
  const PRIN_DEF = { auto: '충분한 설명에 근거한 동의와 스스로 결정할 권리', nonm: '해를 주지 않는 것', bene: '이익을 늘리고 해를 막는 것', just: '이익과 부담을 공정하게 나누는 것' };
  const STK = [
    { icon: '👨‍👩‍👧', name: '질환 가족', text: '우리 아이는 이 병으로 많이 아팠어요. 예방할 수 있다면 다음 세대는 같은 고통을 겪지 않도록 허용해 주세요.', stance: 'allow', val: ['bene'] },
    { icon: '🔬', name: '연구자', text: '충분히 설명하고 동의를 받은 뒤, 엄격한 심의와 장기 추적을 조건으로 신중하게 진행해야 해요.', stance: 'cond', val: ['auto', 'bene'] },
    { icon: '♿', name: '장애 인권 활동가', text: '‘예방’의 기준이 장애를 가진 사람의 삶이 덜 소중하다는 차별로 이어질 수 있어요. 더 논의할 때까지 미뤄야 해요.', stance: 'ban', val: ['just'] },
    { icon: '🧑‍🤝‍🧑', name: '미래 세대를 대변하는 시민', text: '후손은 동의할 수 없고 변화가 대대로 이어져요. 안전이 확인될 때까지 하지 않아야 해요.', stance: 'ban', val: ['nonm', 'auto'] },
    { icon: '🏛️', name: '규제 기관', text: '안전성 자료가 충분하지 않아요. 확인될 때까지 연구 목적의 제한된 실험만 허가할 수 있어요.', stance: 'cond', val: ['nonm'] },
  ];
  const SK = { sel: 0, pop: STK.map(() => 0), hits: [], t0: 0 };
  const skOK = (i) => BX.stance[i] === STK[i].stance && STK[i].val.indexOf(BX.pval[i]) >= 0;
  function skSelect(i) { SK.sel = i; Sound.tick(); updateCtl(); }
  function skSetStance(v) { BX.stance[SK.sel] = v; bxSave(); Sound.tick(); updateCtl(); }
  function skSetVal(v) { BX.pval[SK.sel] = v; bxSave(); Sound.tick(); updateCtl(); }
  function skGeom(i) {
    if (PHONE) return { x: 8, y: 34 + i * 120, w: 464, h: 114 };
    return { x: 8 + i * 158, y: 54, w: 152, h: 300 };
  }
  function stakeScene(dt, t) {
    T(14, 26, '쟁점 ② 질병 예방 목적의 생식세포 편집 — 다섯 사람의 말 (가상)', PHONE ? 13 : 16, '#334155', 'left', 800);
    SK.hits = [];
    STK.forEach((s, i) => {
      SK.pop[i] = RM ? 1 : approach(SK.pop[i], 1, Math.max(0, dt) * (t - SK.t0 > i * 0.18 ? 1 : 0), 8);
      const g = skGeom(i), sel = SK.sel === i, k = ease.outBack(clamp(SK.pop[i], 0, 1));
      ctx.save(); ctx.translate(g.x + g.w / 2, g.y + g.h / 2); ctx.scale(Math.max(0.01, k), Math.max(0.01, k)); ctx.translate(-(g.x + g.w / 2), -(g.y + g.h / 2));
      D.shadow(() => { D.roundRect(g.x, g.y, g.w, g.h, 16); ctx.fillStyle = sel ? '#fff8dc' : '#fff'; ctx.fill(); }, { blur: sel ? 11 : 5, y: 3 });
      ctx.strokeStyle = sel ? '#f59e0b' : skOK(i) ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = sel || skOK(i) ? 3.5 : 2; D.roundRect(g.x, g.y, g.w, g.h, 16); ctx.stroke();
      const cs = BX.stance[i], cv = BX.pval[i];
      if (PHONE) {
        E(s.icon, g.x + 30, g.y + 30, 30); TF(g.x + 56, g.y + 24, s.name, 170, 14.5, 11.5, '#1f2d44', 'left', 800);
        textFit(g.x + 56, g.y + 30, g.w - 66, 52, s.text, 13, 11, '#475569', 700);
        [[cs ? STANCE[cs] : '입장 고르기', !!cs, g.x + 8, 114 - 30], [cv ? PRIN[cv] : '원칙 고르기', !!cv, g.x + 8 + 232, 114 - 30]].forEach(([txt, has, x, yy]) => {
          D.roundRect(x, g.y + yy, 216, 24, 8); ctx.fillStyle = has ? C.rgba('#8b5cf6', 0.13) : '#f8fafc'; ctx.fill(); ctx.setLineDash(has ? [] : [4, 3]); ctx.strokeStyle = has ? '#8b5cf6' : '#94a3b8'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.setLineDash([]);
          TF(x + 108, g.y + yy + 17, txt, 204, 13, 10.5, has ? '#5b21b6' : '#94a3b8', 'center', 800);
        });
      } else {
        E(s.icon, g.x + g.w / 2, g.y + 32, 36); TF(g.x + g.w / 2, g.y + 66, s.name, g.w - 14, 14.5, 11, '#1f2d44', 'center', 800);
        textFit(g.x + 10, g.y + 76, g.w - 20, 140, s.text, 13.5, 11, '#475569', 700);
        [[cs ? STANCE[cs] : '입장 고르기', !!cs, g.y + g.h - 64], [cv ? PRIN[cv] : '원칙 고르기', !!cv, g.y + g.h - 32]].forEach(([txt, has, yy]) => {
          D.roundRect(g.x + 8, yy, g.w - 16, 26, 9); ctx.fillStyle = has ? C.rgba('#8b5cf6', 0.13) : '#f8fafc'; ctx.fill(); ctx.setLineDash(has ? [] : [4, 3]); ctx.strokeStyle = has ? '#8b5cf6' : '#94a3b8'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.setLineDash([]);
          TF(g.x + g.w / 2, yy + 18, txt, g.w - 26, 13, 10.5, has ? '#5b21b6' : '#94a3b8', 'center', 800);
        });
      }
      ctx.restore();
      SK.hits.push({ i, x: g.x, y: g.y, w: g.w, h: g.h });
    });
    if (!PHONE) {
      panel(8, 366, 784, 182, 14);
      T(22, 392, '🔎 읽는 방법', 15, '#334155', 'left', 800);
      textBlock(22, 414, 756, '각 사람의 말에서 ① 주장(어떤 입장인가), ② 근거(왜 그렇게 말하는가), ③ 우선하는 가치(어떤 윤리 원칙을 가장 중시하는가)를 찾아 정리해요. 같은 사실을 보고도 우선하는 가치가 다르면 입장이 갈릴 수 있어요.', 14, '#475569', 21, 700);
      T(22, 486, '미래 세대는 지금 결정에 동의할 수 없다는 점도 함께 생각해 봐요.', 14, '#7c3aed', 'left', 800);
      T(22, 512, '※ 모두 가상의 인물이고, 누구의 입장이 정답인지 정해 주는 활동이 아니에요.', 13, '#94a3b8', 'left', 700);
    }
  }
  const stakePT = {
    down(p) { for (const r of SK.hits) if (inRect(p.x, p.y, r)) { skSelect(r.i); return false; } return false; },
    hover(p) { return SK.hits.some((r) => inRect(p.x, p.y, r)) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     ② 예방 · 향상 나누기
     ========================================================= */
  const PURP = [
    { id: 'p1', box: 'prevent', label: '심한 유전성 근육병이 생기지 않게 하는 편집', short: '유전성 근육병 예방' },
    { id: 'p2', box: 'prevent', label: '낫 모양 적혈구 병의 원인이 되는 변이를 고치는 편집', short: '낫 모양 적혈구 병 교정' },
    { id: 'p3', box: 'prevent', label: '치명적인 유전성 대사 질환을 막기 위한 편집', short: '유전성 대사 질환 예방' },
    { id: 'e1', box: 'enhance', label: '키를 평균보다 더 크게 만드는 편집', short: '키를 더 크게' },
    { id: 'e2', box: 'enhance', label: '운동 능력을 평균 이상으로 높이는 편집', short: '운동 능력 향상' },
    { id: 'e3', box: 'enhance', label: '기억력을 평균 이상으로 높이는 편집', short: '기억력 향상' },
  ];
  const PU = { so: null };
  function puBuild() {
    const cw = PHONE ? 464 : 384, ch = PHONE ? 40 : 48;
    const boxes = PHONE
      ? [{ id: 'prevent', label: '💊 질병 예방(치료) 목적', col: '#16a34a', x: 8, y: 36, w: 464, h: 138, cols: 1, hdr: 26 }, { id: 'enhance', label: '🚀 능력 향상 목적', col: '#f59e0b', x: 8, y: 180, w: 464, h: 138, cols: 1, hdr: 26 }]
      : [{ id: 'prevent', label: '💊 질병 예방(치료) 목적', col: '#16a34a', x: 10, y: 44, w: 384, h: 232, cols: 1, hdr: 28 }, { id: 'enhance', label: '🚀 능력 향상 목적', col: '#f59e0b', x: 406, y: 44, w: 384, h: 232, cols: 1, hdr: 28 }];
    const cards = shuffled(PURP.map((c) => c.id), 4).map((id) => { const c = PURP.find((x) => x.id === id); return { id, label: c.label, short: c.short, col: '#0ea5e9' }; });
    PU.so = selectable({ cards, boxes, cw, ch, kh: PHONE ? 30 : 40, tray: (i) => PHONE ? { x: 8, y: 346 + i * 46 } : { x: 10 + (i % 2) * 396, y: 318 + Math.floor(i / 2) * 56 }, onChange() { updateCtl(); } });
  }
  const puWrong = () => PU.so.cards.filter((c) => c.zone && c.zone !== PURP.find((x) => x.id === c.id).box);
  function purposeScene(dt, t) {
    PU.so.update(dt);
    T(14, 28, '편집 목적을 ‘예방(치료)’과 ‘향상’으로 나눠요', PHONE ? 14 : 16.5, '#334155', 'left', 800);
    PU.so.drawBoxes();
    T(14, PHONE ? 338 : 306, '편집 목적 카드 (끌어서 놓거나, 카드 → 칸 순서로 눌러요)', PHONE ? 12.5 : 13.5, '#64748b', 'left', 800);
    PU.so.drawCards();
  }
  const purposePT = sorterPT(() => PU.so);

  /* =========================================================
     ③ 의사 결정: 대안 3개 × 항목 4개 (가상 점수) + 가치 가중치 (합 10)
     ========================================================= */
  const CRIT = ['환자 이익', '안전성 불확실성', '공정성', '미래 세대 권리'];
  const ALTS = [
    { id: 'allow', name: '허용', col: '#0ea5e9', s: [3, -2, -2, -3] },
    { id: 'cond', name: '조건부 허용', sub: '엄격한 심의 · 장기 추적', col: '#16a34a', s: [2, -1, 0, -1] },
    { id: 'ban', name: '유예 · 금지', col: '#8b5cf6', s: [-2, 3, 1, 2] },
  ];
  const PRESETS = [[3, 3, 2, 2], [6, 1, 1, 2], [8, 0, 0, 2]];
  const DEC = { pos: [0, 1, 2], tot: [0, 0, 0], won: { allow: false, cond: false, ban: false }, init: false };
  const wSum = () => BX.w.reduce((a, b) => a + b, 0);
  const totals = () => ALTS.map((a) => a.s.reduce((sum, v, i) => sum + v * BX.w[i], 0));
  const topIds = () => { const t = totals(), m = Math.max(...t); return ALTS.filter((a, i) => t[i] === m).map((a) => a.id); };
  function recWon() { const tp = topIds(); if (tp.length === 1) DEC.won[tp[0]] = true; }
  function setW(i, d) {
    const nv = BX.w[i] + d;
    if (nv < 0) return;
    if (d > 0 && wSum() >= 10) { Sound.fail(); return; }
    BX.w[i] = nv; bxSave(); recWon(); Sound.tick(); updateCtl();
  }
  function setPreset(k) { BX.w = PRESETS[k].slice(); bxSave(); recWon(); Sound.click(); updateCtl(); }
  const rankOf = (tot, i) => 1 + tot.filter((v) => v > tot[i]).length;
  function decideGeom() {
    if (PHONE) return { tb: { x: 8, y: 34, w: 464 }, nameW: 104, colW: 90, bars: { x: 8, y: 280, w: 464, h: 182 }, calc: { x: 8, y: 466, w: 464, h: 168 } };
    return { tb: { x: 10, y: 40, w: 476 }, nameW: 116, colW: 90, bars: { x: 496, y: 40, w: 294, h: 318 }, calc: { x: 10, y: 368, w: 780, h: 180 } };
  }
  function decideScene(dt, t) {
    const g = decideGeom(), tot = totals(), tops = topIds();
    T(14, 26, '가치 가중치에 따라 대안의 총점 순위가 어떻게 바뀔까?', PHONE ? 13.5 : 16.5, '#334155', 'left', 800);
    if (!DEC.init) { DEC.tot = tot.slice(); DEC.pos = ALTS.map((a, i) => rankOf(tot, i) - 1); DEC.init = true; }
    // 표
    const tb = g.tb, hy = tb.y + (PHONE ? 6 : 6);
    panel(tb.x, tb.y, tb.w, PHONE ? 240 : 318, 14);
    CRIT.forEach((c, k) => { const x = tb.x + g.nameW + k * g.colW; TF(x + g.colW / 2, hy + 24, c, g.colW - 6, 13.5, 10.5, '#334155', 'center', 800); });
    T(tb.x + 12, hy + 24, '대안', 13, '#64748b', 'left', 800);
    const wy = hy + 42;
    D.roundRect(tb.x + 8, wy, tb.w - 16, PHONE ? 34 : 44, 10); ctx.fillStyle = '#f5f3ff'; ctx.fill();
    T(tb.x + 14, wy + (PHONE ? 22 : 28), '가중치', 14, '#6d28d9', 'left', 800);
    BX.w.forEach((w, k) => { const x = tb.x + g.nameW + k * g.colW + g.colW / 2; T(x, wy + (PHONE ? 24 : 31), String(w), PHONE ? 19 : 24, '#6d28d9', 'center', 800); });
    const ry0 = wy + (PHONE ? 44 : 56), rh = PHONE ? 42 : 62;
    ALTS.forEach((a, i) => {
      const y = ry0 + i * rh;
      D.roundRect(tb.x + 8, y, 8, rh - 6, 3); ctx.fillStyle = a.col; ctx.fill();
      TF(tb.x + 24, y + (a.sub && !PHONE ? 20 : (rh - 6) / 2 + 5), a.name, g.nameW - 26, 14.5, 11, '#1f2d44', 'left', 800);
      if (a.sub && !PHONE) TF(tb.x + 24, y + 40, a.sub, g.nameW - 20, 11.5, 9.5, '#64748b', 'left', 700);
      a.s.forEach((v, k) => {
        const x = tb.x + g.nameW + k * g.colW + 4;
        D.roundRect(x, y, g.colW - 8, rh - 6, 9); ctx.fillStyle = v > 0 ? C.rgba('#16a34a', 0.12 + 0.07 * v) : v < 0 ? C.rgba('#ef4444', 0.12 + 0.07 * -v) : '#f1f5f9'; ctx.fill();
        T(x + (g.colW - 8) / 2, y + (rh - 6) / 2 + 6, (v > 0 ? '+' : v < 0 ? MINUS : '') + Math.abs(v), PHONE ? 17 : 20, v > 0 ? '#15803d' : v < 0 ? '#b91c1c' : '#64748b', 'center', 800);
      });
    });
    T(tb.x + 14, ry0 + 3 * rh + 10, '점수: +3(매우 유리) ~ ' + MINUS + '3(매우 불리) · 가상의 교육용 값이에요', 12.5, '#94a3b8', 'left', 700);
    // 막대 (총점 순위 재정렬)
    const b = g.bars; panel(b.x, b.y, b.w, b.h, 14);
    T(b.x + 14, b.y + 24, '총점 = 가중치 × 점수의 합', 14, '#334155', 'left', 800);
    const lx = b.x + 14, rw = b.w - 28, zx = lx + rw / 2, bh = PHONE ? 38 : 56, by0 = b.y + (PHONE ? 38 : 44);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(zx, by0 - 6); ctx.lineTo(zx, by0 + 3 * (bh + 8)); ctx.stroke();
    [-30, 0, 30].forEach((v) => T(zx + v / 30 * rw / 2, b.y + b.h - 6, v > 0 ? '+30' : v < 0 ? MINUS + '30' : '0', 12, '#94a3b8', 'center', 700));
    ALTS.forEach((a, i) => {
      DEC.tot[i] = RM ? tot[i] : approach(DEC.tot[i], tot[i], dt, 8);
      const slot = tot.filter((v, j) => v > tot[i] || (v === tot[i] && j < i)).length; DEC.pos[i] = RM ? slot : approach(DEC.pos[i], slot, dt, 9);
      const y = by0 + DEC.pos[i] * (bh + 8), v = clamp(DEC.tot[i], -30, 30), x1 = zx + v / 30 * rw / 2;
      D.shadow(() => { D.roundRect(Math.min(zx, x1), y + 18, Math.max(2, Math.abs(x1 - zx)), bh - 22, 7); ctx.fillStyle = a.col; ctx.fill(); }, { blur: 4, y: 2 });
      TF(lx, y + 12, a.name, rw * 0.6, 13.5, 10.5, C.shade(a.col, -0.3), 'left', 800);
      const rv = Math.round(DEC.tot[i]);
      T(rv >= 0 ? Math.min(b.x + b.w - 40, x1 + 8) : Math.max(b.x + 40, x1 - 8), y + bh - 6 - (bh > 40 ? 6 : 4), (rv > 0 ? '+' : rv < 0 ? MINUS : '') + Math.abs(rv), 15, '#1f2d44', rv >= 0 ? 'left' : 'right', 800);
      const rk = rankOf(tot, i);
      pill(b.x + b.w - 30, y + 12, rk + '위', { bg: rk === 1 ? '#f59e0b' : '#94a3b8', color: '#fff', size: 12.5, pad: 6 });
    });
    // 계산 과정
    const c = g.calc; panel(c.x, c.y, c.w, c.h, 14);
    T(c.x + 14, c.y + 24, '계산: 가중치 (' + BX.w.join(', ') + ')', 14.5, '#334155', 'left', 800);
    ALTS.forEach((a, i) => {
      const terms = a.s.map((v, k) => BX.w[k] + '×' + (v < 0 ? '(' + MINUS + Math.abs(v) + ')' : v)).join(' + ');
      const rv = tot[i];
      TF(c.x + 14, c.y + 50 + i * (PHONE ? 27 : 34), a.name + ': ' + terms + ' = ' + (rv > 0 ? '+' : rv < 0 ? MINUS : '') + Math.abs(rv), c.w - 28, PHONE ? 13 : 14.5, 10.5, C.shade(a.col, -0.3), 'left', 800);
    });
    textBlock(c.x + 14, c.y + (PHONE ? 132 : 160), c.w - 28, tops.length === 1 ? '이 가치 우선순위에서는 ‘' + ALTS.find((a) => a.id === tops[0]).name + '’이 1위예요. 가중치가 달라지면 순위도 달라져요.' : '공동 1위가 있어요. 가중치를 조금 바꿔 순위를 가려 봐요.', PHONE ? 13 : 14.5, '#7c3aed', 20, 800);
  }
  /* ---------- 가중치 단추 만들기 (ctrl) ---------- */
  function buildWRows() {
    $('#wRows').innerHTML = CRIT.map((c, i) => '<div class="w-row"><span class="w-n">' + c + '</span><button type="button" class="btn btn-sm w-b" data-i="' + i + '" data-d="-1" aria-label="' + c + ' 줄이기">' + MINUS + '</button><output class="w-v" id="wv' + i + '">3</output><button type="button" class="btn btn-sm w-b" data-i="' + i + '" data-d="1" aria-label="' + c + ' 늘리기">+</button></div>').join('');
    $$('#wRows .w-b').forEach((b) => b.addEventListener('click', () => setW(+b.dataset.i, +b.dataset.d)));
  }

  /* =========================================================
     ③ 결정 문장 만들기
     ========================================================= */
  const SD_DEC = [['', '— 결정 고르기 —'], ['allow', '허용'], ['cond', '조건부 허용'], ['ban', '유예 · 금지']];
  const SD_FACT = shuffled([
    { t: '편집이 의도하지 않은 위치를 바꾸는 오프타깃 가능성을 아직 완전히 배제하지 못해요.', ok: true },
    { t: '생식세포 편집의 결과는 후손에게 유전돼요.', ok: true },
    { t: '체세포 편집은 환자 한 사람에게만 적용되고 자손에게 유전되지 않아요.', ok: true },
    { t: '여러 세대에 걸쳐 안전성을 확인한 자료는 아직 없어요.', ok: true },
    { t: '이 기술을 허용하는 것이 도덕적으로 옳아요.', ok: false, why: '‘옳아요’는 사실이 아니라 가치 판단이에요.' },
  ], 12);
  const SD_VAL = shuffled([
    { t: '고통받는 가족을 도울 수 있는 이익이 가장 중요하다고 생각해요.', ok: true },
    { t: '동의할 수 없는 미래 세대의 권리를 우선해야 한다고 생각해요.', ok: true },
    { t: '치료를 받을 수 있는 사람이 일부에 그치면 불공정이 커진다고 생각해요.', ok: true },
    { t: '부모가 충분히 설명을 듣고 스스로 선택할 권리가 중요하다고 생각해요.', ok: true },
    { t: '전문가 대부분이 안전하다고 말하고 있어요.', ok: false, why: '‘안전하다고 말한다’는 확인해야 할 사실 주장이에요. 어떤 가치를 중시하는지가 아니에요.' },
  ], 13);
  const SD_REB = shuffled([
    { t: '반대 입장의 가장 강한 우려를 인정하고, 그 우려를 줄일 조건이나 장치를 함께 제안해요.', ok: true },
    { t: '반대 입장은 모두 틀렸다고 말해요.', ok: false, why: '반론에 대응한다는 것은 상대의 근거를 살펴 보완한다는 뜻이에요.' },
    { t: '반대 의견은 듣지 않고 다수결로 바로 정해요.', ok: false, why: '반론을 듣고 근거로 대응하는 과정이 빠졌어요.' },
  ], 14);
  const SD_REV = shuffled([
    { t: '새로운 안전성 자료가 나오면 결정을 다시 검토해요.', ok: true },
    { t: '사회적 합의(공론화)의 결과가 달라지면 결정을 다시 검토해요.', ok: true },
    { t: '한 번 정하면 어떤 경우에도 바꾸지 않아요.', ok: false, why: '새 증거가 나오면 결정을 고칠 수 있어야 해요.' },
  ], 15);
  const SDK = [['dec', '나의 결정', '#8b5cf6'], ['fact', '사실 근거', '#0ea5e9'], ['val', '가치 근거', '#f59e0b'], ['reb', '반론 대응', '#16a34a'], ['rev', '재검토 조건', '#ec4899']];
  const SDLIST = { fact: SD_FACT, val: SD_VAL, reb: SD_REB, rev: SD_REV };
  const decName = (id) => (SD_DEC.find((d) => d[0] === id) || [])[1] || '';
  const sdOK = (k) => { const s = BX.sd; if (k === 'dec') return !!s.dec && topIds().indexOf(s.dec) >= 0; const i = s[k]; return i >= 0 && !!SDLIST[k][i].ok; };
  const sdText = (k) => { const s = BX.sd; if (k === 'dec') return s.dec ? decName(s.dec) : ''; return s[k] >= 0 ? SDLIST[k][s[k]].t : ''; };
  const SDA = { slide: { dec: 0, fact: 0, val: 0, reb: 0, rev: 0 } };
  function sentenceScene(dt, t) {
    T(14, 26, '근거와 가치를 드러내며 결정 문장을 만들어요', PHONE ? 14 : 16.5, '#334155', 'left', 800);
    const tops = topIds();
    panel(10, 38, VW - 20, PHONE ? 50 : 44, 12);
    TF(24, PHONE ? 60 : 66, '내 가중치 ' + BX.w.join(' · ') + ' (' + CRIT.join(' · ') + ')  →  1위: ' + tops.map((id) => ALTS.find((a) => a.id === id).name).join(', '), VW - 48, PHONE ? 12.5 : 14.5, 10.5, '#6d28d9', 'left', 800);
    const rh = PHONE ? 102 : 84, y0 = PHONE ? 96 : 92;
    SDK.forEach((r, i) => {
      const y = y0 + i * (rh + (PHONE ? 4 : 2)), txt = sdText(r[0]);
      SDA.slide[r[0]] = RM ? (txt ? 1 : 0) : approach(SDA.slide[r[0]], txt ? 1 : 0, dt, 8);
      const sl = SDA.slide[r[0]];
      D.shadow(() => { D.roundRect(10, y, VW - 20, rh - 4, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = txt ? (sdOK(r[0]) ? '#16a34a' : '#e2464b') : '#cbd5e1'; ctx.lineWidth = txt ? 3 : 2; D.roundRect(10, y, VW - 20, rh - 4, 12); ctx.stroke();
      pill(22, y + 20, (i + 1) + ' ' + r[1], { bg: r[2], color: '#fff', size: 13, align: 'left', pad: 8 });
      if (!txt) T(22, y + rh / 2 + 14, '← 오른쪽 목록에서 골라요', 14, '#94a3b8', 'left', 800);
      else { ctx.save(); ctx.globalAlpha = sl; textFit(22 + (1 - sl) * 24, y + 34, VW - 64, rh - 40, txt, PHONE ? 14 : 15.5, 11.5, '#1f2d44', 800); ctx.restore(); }
    });
  }

  /* =========================================================
     ④ 제도와 책임: 규제 장치 → 책임 주체
     ========================================================= */
  const ACTORS = [['res', '🔬 연구자', '#16a34a'], ['cor', '🏢 기업', '#0ea5e9'], ['gov', '🏛️ 정부', '#8b5cf6'], ['cit', '🧑‍🤝‍🧑 시민', '#f59e0b']];
  const DEVICES = [
    { id: 'd1', actor: 'res', label: '연구 윤리 심의 위원회의 사전 승인', short: '연구 윤리 심의' },
    { id: 'd2', actor: 'gov', label: '생명윤리 관련 법과 국제 협약', short: '법과 국제 협약' },
    { id: 'd3', actor: 'cor', label: '제품의 표시제와 정보 공개', short: '표시제 · 정보 공개' },
    { id: 'd4', actor: 'cit', label: '시민 참여 공론화', short: '시민 참여 공론화' },
  ];
  const SY = { so: null };
  function syBuild() {
    const w = PHONE ? 464 : 384, bh = PHONE ? 52 : 76, ch = PHONE ? 44 : 60;
    const boxes = ACTORS.map((a, i) => ({ id: a[0], label: a[1], col: a[2], x: PHONE ? 8 : 10, y: (PHONE ? 38 : 44) + i * (bh + (PHONE ? 4 : 8)), w, h: bh, cols: 1, hdr: PHONE ? 20 : 26, cap: 1, ly: PHONE ? 14 : 18, ls: PHONE ? 12.5 : 14 }));
    const cards = shuffled(DEVICES.map((d) => d.id), 17).map((id) => { const d = DEVICES.find((x) => x.id === id); return { id, label: d.label, short: d.short, col: '#0ea5e9' }; });
    SY.so = selectable({ cards, boxes, cw: w, ch, kh: PHONE ? 26 : 38, tray: (i) => PHONE ? { x: 8, y: 290 + i * (ch + 6) } : { x: 406, y: 44 + i * 84 + 8 }, onChange() { updateCtl(); } });
  }
  const syWrong = () => SY.so.cards.filter((c) => c.zone && c.zone !== DEVICES.find((x) => x.id === c.id).actor);
  function systemScene(dt, t) {
    SY.so.update(dt);
    T(14, 28, '규제 장치마다 책임을 맡는 주체를 연결해요', PHONE ? 14 : 16.5, '#334155', 'left', 800);
    SY.so.drawBoxes();
    T(PHONE ? 14 : 406, PHONE ? 282 : 36, '규제 장치 카드', PHONE ? 12.5 : 13.5, '#64748b', 'left', 800);
    SY.so.drawCards();
    if (!PHONE) { panel(406, 392, 384, 156, 14); T(420, 418, '💡 책임은 한 주체만의 몫이 아니에요', 14.5, '#334155', 'left', 800); textBlock(420, 440, 356, '연구자는 정직하게 연구하고, 기업은 안전을 책임지고, 정부는 규제와 감독을 하고, 시민은 정보를 바탕으로 참여해요. 장치마다 중심이 되는 주체를 찾아봐요.', 13.5, '#475569', 20, 700); }
  }
  const systemPT = sorterPT(() => SY.so);

  /* =========================================================
     ④ 10년 뒤 시나리오 + 발표 카드
     ========================================================= */
  const SC_A = ['질병 예방 목적의 배아 편집이 허용되면', '대규모 유전체 정보 은행이 운영되면', '이종 장기 이식이 가능해지면'];
  const SC_AI = [1, 5, 4];     // 시나리오 → ISSUES 번호
  const SC_B = ['편집 결과가 후손에게 유전될 수 있으므로', '이름을 지워도 개인이 다시 식별될 위험이 생길 수 있으므로', '동물에서 사람으로 새로운 감염병이 옮을 위험을 관리해야 하므로'];
  const SC_C = ['연구 전 엄격한 심의와 장기 추적 제도가', '정보 보호 규정과 접근 권한 관리, 정보 공개가', '연구 윤리 심의와 감염 감시 · 보고 제도가'];
  const SC_ORDER_B = [2, 0, 1], SC_ORDER_C = [1, 2, 0];
  const scOK = () => BX.sc.a >= 0 && BX.sc.a === BX.sc.b && BX.sc.a === BX.sc.c;
  const scText = () => (BX.sc.a >= 0 ? SC_A[BX.sc.a] : '만약 ( … )') + ', ' + (BX.sc.b >= 0 ? SC_B[BX.sc.b] : '( … 할 수 있으므로 )') + ' ' + (BX.sc.c >= 0 ? SC_C[BX.sc.c] : '( … )가') + ' 필요해요.';
  function cardItems() {
    const ai = BX.sc.a >= 0 ? SC_AI[BX.sc.a] : -1;
    return [
      { k: '범주 표시', ok: ai >= 0 && isTagOK(ai), txt: ai >= 0 ? ISSUES[ai].icon + ' ' + ISSUES[ai].title + ' — ' + (BX.tags[ai].length ? BX.tags[ai].map((c) => CAT(c)[1]).join(' · ') : '범주를 붙이지 않았어요') : '시나리오를 먼저 골라요' },
      { k: '근거 2개', ok: sdOK('fact') && sdOK('val'), txt: (sdText('fact') ? '사실: ' + sdText('fact') : '사실 근거가 비어 있어요') + '\n' + (sdText('val') ? '가치: ' + sdText('val') : '가치 근거가 비어 있어요') },
      { k: '반론 대응', ok: sdOK('reb'), txt: sdText('reb') || '반론 대응이 비어 있어요' },
      { k: '제도 제안', ok: scOK(), txt: BX.sc.c >= 0 ? SC_C[BX.sc.c].replace(/가$/, '') + '를 제안해요' : '제도 제안이 비어 있어요' },
      { k: '재검토 조건', ok: sdOK('rev'), txt: sdText('rev') || '재검토 조건이 비어 있어요' },
    ];
  }
  function presentScene(dt, t) {
    T(14, 26, '발표 카드: 앞에서 만든 내용을 한 장으로 모아요', PHONE ? 14 : 16.5, '#334155', 'left', 800);
    panel(10, 36, VW - 20, PHONE ? 92 : 78, 14);
    pill(24, 56, '🔮 10년 뒤 시나리오', { bg: '#8b5cf6', color: '#fff', size: 13, align: 'left' });
    textFit(24, 70, VW - 48, PHONE ? 52 : 40, scText(), PHONE ? 14 : 16, 11.5, scOK() ? '#1f2d44' : '#64748b', 800);
    const items = cardItems(), y0 = PHONE ? 136 : 126, rh = PHONE ? 98 : 78;
    items.forEach((it, i) => {
      const y = y0 + i * (rh + 2);
      D.shadow(() => { D.roundRect(10, y, VW - 20, rh - 4, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = it.ok ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = it.ok ? 3 : 2; D.roundRect(10, y, VW - 20, rh - 4, 12); ctx.stroke();
      T(24, y + 26, (it.ok ? '✅ ' : '⬜ ') + (i + 1) + '. ' + it.k, PHONE ? 14 : 15, it.ok ? '#15803d' : '#64748b', 'left', 800);
      const lines = it.txt.split('\n');
      if (lines.length > 1) { lines.forEach((ln, k) => { textFit(24, y + 34 + k * (PHONE ? 30 : 20), VW - 48, PHONE ? 30 : 20, ln, PHONE ? 12.5 : 13.5, 10.5, it.ok ? '#334155' : '#94a3b8', 700); }); }
      else textFit(24, y + 34, VW - 48, rh - 44, it.txt, PHONE ? 13.5 : 14.5, 11, it.ok ? '#334155' : '#94a3b8', 700);
    });
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; hideHint();
    if (m === 'stake') { SK.pop = STK.map(() => 0); SK.t0 = S.t; }
    PT = m === 'issues' ? issuesPT : m === 'stake' ? stakePT : m === 'purpose' ? purposePT : m === 'system' ? systemPT : null;
    updateCtl();
  }
  function fillSelect(id, opts, placeholder, cur) {
    const el = $('#' + id);
    if (!el.dataset.built) { el.innerHTML = '<option value="-1">' + placeholder + '</option>' + opts.map((o, i) => '<option value="' + i + '">' + o + '</option>').join(''); el.dataset.built = '1'; }
    el.value = String(cur);
  }
  function updateCtl() {
    const fr0 = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeBtns(S.mode, lvNow, fr0);
    // 쟁점
    const I = ISSUES[IS.sel];
    $('#isHead').textContent = I.icon + ' 쟁점 ' + (IS.sel + 1) + '. ' + I.title;
    $$('#isTags button').forEach((b) => b.classList.toggle('on', BX.tags[IS.sel].indexOf(b.dataset.v) >= 0));
    $$('#isVal button').forEach((b) => b.classList.toggle('on', BX.val[IS.sel] === +b.dataset.v));
    $$('#isTags button, #isVal button').forEach((b) => { b.disabled = !IS.open[IS.sel]; });
    $('#isMade').innerHTML = ISSUES.map((x, i) => '<li class="' + (isDone(i) ? 'on' : '') + '">' + mark(BX.tags[i].length > 0 && BX.val[i] >= 0) + ' ' + (i + 1) + ' ' + x.icon + ' ' + x.title + '</li>').join('');
    // 이해관계자
    $('#skHead').textContent = STK[SK.sel].icon + ' ' + STK[SK.sel].name;
    chipOn($('#skStance'), BX.stance[SK.sel]); chipOn($('#skVal'), BX.pval[SK.sel]);
    $('#skMade').innerHTML = STK.map((s, i) => '<li class="' + (BX.stance[i] && BX.pval[i] ? 'on' : '') + '">' + mark(BX.stance[i] && BX.pval[i]) + ' ' + s.name + '</li>').join('') + '<li class="ctrl-note" style="display:block;margin-top:6px">' + Object.keys(PRIN).map((k) => '<b>' + PRIN[k] + '</b>: ' + PRIN_DEF[k]).join('<br>') + '</li>';
    const puN = PU.so ? PU.so.placed : 0;
    $('#puMade').innerHTML = '<li class="' + (puN === 6 ? 'on' : '') + '">' + mark(puN === 6) + ' 놓은 카드 ' + puN + ' / 6</li>';
    // 대안 비교
    const sum = wSum();
    BX.w.forEach((w, i) => { const o = $('#wv' + i); if (o) o.textContent = w; });
    $$('#wRows .w-b').forEach((b) => { b.disabled = +b.dataset.d > 0 ? sum >= 10 : BX.w[+b.dataset.i] <= 0; });
    $('#wNote').innerHTML = sum === 10 ? '가중치 합 <b>10</b> · 남은 점수 0' : '가중치 합 <b>' + sum + '</b> · 남은 점수 <b>' + (10 - sum) + '</b> (합이 10이 되도록 더해요)';
    $$('#wPre button').forEach((b) => b.classList.toggle('on', PRESETS[+b.dataset.v].join() === BX.w.join()));
    $('#wMade').innerHTML = ALTS.map((a) => '<li class="' + (DEC.won[a.id] ? 'on' : '') + '">' + mark(DEC.won[a.id]) + ' ‘' + a.name + '’을 1위로 만들어 봤어요</li>').join('');
    // 결정 문장
    $('#sdDec').innerHTML = SD_DEC.map((d, i) => '<option value="' + d[0] + '">' + d[1] + '</option>').join(''); $('#sdDec').value = BX.sd.dec;
    fillSelect('sdFact', SD_FACT.map((o) => o.t), '— 사실 근거 고르기 —', BX.sd.fact);
    fillSelect('sdVal', SD_VAL.map((o) => o.t), '— 가치 근거 고르기 —', BX.sd.val);
    fillSelect('sdReb', SD_REB.map((o) => o.t), '— 반론 대응 고르기 —', BX.sd.reb);
    fillSelect('sdRev', SD_REV.map((o) => o.t), '— 재검토 조건 고르기 —', BX.sd.rev);
    // 제도
    const syN = SY.so ? SY.so.placed : 0;
    $('#syMade').innerHTML = '<li class="' + (syN === 4 ? 'on' : '') + '">' + mark(syN === 4) + ' 놓은 카드 ' + syN + ' / 4</li>';
    fillSelect('scA', SC_A, '— 조건 고르기 —', BX.sc.a);
    fillSelect('scB', SC_ORDER_B.map((i) => SC_B[i]), '— 결과 고르기 —', BX.sc.b < 0 ? -1 : SC_ORDER_B.indexOf(BX.sc.b));
    fillSelect('scC', SC_ORDER_C.map((i) => SC_C[i]), '— 필요한 제도 고르기 —', BX.sc.c < 0 ? -1 : SC_ORDER_C.indexOf(BX.sc.c));
    $('#prMade').innerHTML = cardItems().map((it) => '<li class="' + (it.ok ? 'on' : '') + '">' + mark(it.ok) + ' ' + it.k + '</li>').join('');
  }
  bindModes(setMode);
  $$('#isTags button').forEach((b) => b.addEventListener('click', () => isToggleTag(b.dataset.v)));
  $$('#isVal button').forEach((b) => b.addEventListener('click', () => isSetVal(+b.dataset.v)));
  $$('#skStance button').forEach((b) => b.addEventListener('click', () => skSetStance(b.dataset.v)));
  $$('#skVal button').forEach((b) => b.addEventListener('click', () => skSetVal(b.dataset.v)));
  $('#puReset').addEventListener('click', () => { Sound.click(); PU.so.reset(); });
  $('#syReset').addEventListener('click', () => { Sound.click(); SY.so.reset(); });
  $$('#wPre button').forEach((b) => b.addEventListener('click', () => setPreset(+b.dataset.v)));
  $('#sdDec').addEventListener('change', (e) => { BX.sd.dec = e.target.value; bxSave(); Sound.tick(); updateCtl(); });
  [['sdFact', 'fact'], ['sdVal', 'val'], ['sdReb', 'reb'], ['sdRev', 'rev']].forEach(([id, k]) => $('#' + id).addEventListener('change', (e) => { BX.sd[k] = +e.target.value; bxSave(); Sound.tick(); updateCtl(); }));
  $('#scA').addEventListener('change', (e) => { BX.sc.a = +e.target.value; bxSave(); Sound.tick(); updateCtl(); });
  $('#scB').addEventListener('change', (e) => { const v = +e.target.value; BX.sc.b = v < 0 ? -1 : SC_ORDER_B[v]; bxSave(); Sound.tick(); updateCtl(); });
  $('#scC').addEventListener('change', (e) => { const v = +e.target.value; BX.sc.c = v < 0 ? -1 : SC_ORDER_C[v]; bxSave(); Sound.tick(); updateCtl(); });
  buildWRows(); puBuild(); syBuild();

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '쟁점 찾기', short: '쟁점 찾기', icon: '🃏', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 할 수 있는 기술이 생겼을 때, 해도 되는지는 누가 어떻게 정할까?</p><p>🔗 <b>통합과학2의 ‘과학 쟁점과 윤리’</b>에서 <b>사실 판단</b>과 <b>가치 판단</b>을 구분하는 방법을 배웠어요. 이번에는 유전 · 생명공학 사례로 이어 가요. 앞 차시들에서 본 기술(유전자 검사 · 줄기세포 · 유전자 편집 · LMO)은 현실에서 어떤 문제를 낳을 수 있을까요?</p><p>① 가상 쟁점 카드 <b>6장</b>을 열어 상황을 읽고, 문제점을 <b>생태적 · 윤리적 · 제도적 · 사회적</b> 범주로 붙여요(여러 개 가능). ② 각 쟁점의 두 질문 중 <b>가치 질문</b>을 찾아요.</p><p>이 차시에는 정해진 ‘정답 의견’이 없어요. <b>사실과 가치를 구분하고, 근거를 들어 판단하는 과정</b>을 연습해요. (모든 사례는 가상이에요.)</p>',
      features: ['issues'],
      setup() { setMode('issues'); },
      recap: '생명공학의 문제점은 생태적 · 윤리적 · 제도적 · 사회적 범주로 나눌 수 있고 한 쟁점이 여러 범주에 걸치며, 질문은 조사로 답하는 사실 질문과 어떻게 해야 하는지를 묻는 가치 질문으로 나눌 수 있어요.',
      summary: '<ul><li><b>문제점의 4범주</b>: 생태적(유전자 이동, 생물다양성), 윤리적(생명의 지위, 자율성, 존엄), 제도적(규제 공백, 심의 제도), 사회적(차별, 비용 격차, 접근성).</li><li><b>쟁점 6가지(가상 사례)</b>: 유전자 검사와 차별 · 생식세포 · 배아 편집 · 배아줄기세포 연구 · LMO 재배와 표시제 · 동물 복제와 이종 장기 이식 · 대규모 유전체 정보 보관.</li><li><b>사실 질문</b>은 조사 · 측정으로 답할 수 있고(예: 안전한가?), <b>가치 질문</b>은 무엇을 중시해 어떻게 해야 하는지를 물어요(예: 허용해야 하는가?).</li><li>한 기술이 생태계 · 생명의 가치 · 제도 · 사회 관계에 동시에 영향을 주기 때문에 한 쟁점이 여러 범주에 걸쳐요.</li></ul>',
      missions: [
        {
          id: 'issues', title: '쟁점 6장에 범주와 질문 붙이기', manual: true,
          goal: '쟁점 카드 <b>6장</b>을 모두 열어 문제점의 <b>범주</b>(여러 개 가능)를 붙이고, ㉮ ㉯ 중 <b>가치 질문</b>을 고르세요.',
          hint: '카드를 눌러 열고, 오른쪽에서 범주와 가치 질문을 골라요. 생태계(유전자 이동), 생명의 가치나 자율성(윤리), 규제나 심의(제도), 차별이나 비용(사회)을 떠올려 봐요. 가치 질문은 ‘~해야 할까?’처럼 판단을 묻는 쪽이에요.',
          setup() { setMode('issues'); },
          check() {
            const closed = IS.open.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);
            if (closed.length) return '아직 열지 않은 카드가 있어요. (' + closed.length + '장) 모두 눌러서 읽어 주세요.';
            const noTag = ISSUES.map((_, i) => (BX.tags[i].length ? -1 : i)).filter((i) => i >= 0);
            if (noTag.length) return '쟁점 ' + (noTag[0] + 1) + ' 등 ' + noTag.length + '장에 범주를 아직 붙이지 않았어요.';
            const badTag = ISSUES.map((_, i) => (isTagOK(i) ? -1 : i)).filter((i) => i >= 0);
            if (badTag.length) return '쟁점 ' + (badTag[0] + 1) + '의 범주를 다시 생각해 보세요. 빠진 범주나 어울리지 않는 범주가 있어요. (' + badTag.length + '장)';
            const noVal = ISSUES.map((_, i) => (BX.val[i] >= 0 ? -1 : i)).filter((i) => i >= 0);
            if (noVal.length) return '쟁점 ' + (noVal[0] + 1) + ' 등 ' + noVal.length + '장의 가치 질문을 아직 고르지 않았어요.';
            const badVal = ISSUES.map((_, i) => (isValOK(i) ? -1 : i)).filter((i) => i >= 0);
            if (badVal.length) return '쟁점 ' + (badVal[0] + 1) + '에서 사실 질문과 가치 질문을 다시 구분해 보세요. 사실 질문은 조사나 측정으로 답할 수 있어요. (' + badVal.length + '장)';
            return true;
          },
          status: () => mark(IS.open.every(Boolean)) + ' 연 카드 ' + IS.open.filter(Boolean).length + ' / 6 &nbsp; ' + mark(ISSUES.every((_, i) => BX.tags[i].length > 0)) + ' 범주 ' + ISSUES.filter((_, i) => BX.tags[i].length > 0).length + ' / 6 &nbsp; ' + mark(BX.val.every((v) => v >= 0)) + ' 질문 ' + BX.val.filter((v) => v >= 0).length + ' / 6',
          explain: '쟁점마다 걸치는 문제점이 달라요. 예를 들어 <b>LMO 재배와 표시제</b>는 유전자 이동(생태적)과 승인 · 표시 제도(제도적)에 걸치고, <b>배아 편집</b>은 후손에게 유전되는 문제(윤리적)가 중심이에요. 질문은 <b>사실 질문</b>(오프타깃 비율, 꽃가루가 퍼지는 거리, 식별 가능성)과 <b>가치 질문</b>(허용해야 하는가, 표시를 의무로 해야 하는가)으로 나뉘어요.',
        },
        {
          type: 'quiz', title: '가치 질문 찾기',
          goal: '다음 중 <b>가치 질문</b>은 어느 것일까요?',
          setup() { setMode('issues'); },
          choices: ['질병 예방을 위한 배아 편집을 허용해야 할까?', '이 편집이 의도하지 않은 위치를 바꾸는 비율은 얼마일까?', '이 작물의 꽃가루는 몇 m까지 퍼질까?', '배아줄기세포는 어떤 세포로 분화할 수 있을까?'],
          answer: 0,
          feedback: ['', '비율은 실험과 조사로 측정할 수 있는 사실 질문이에요.', '퍼지는 거리는 관찰과 측정으로 알아낼 수 있는 사실 질문이에요.', '분화 능력은 연구로 확인하는 사실 질문이에요.'],
          explain: '<b>가치 질문</b>은 측정으로 답이 정해지지 않고, 어떤 가치를 더 중시하느냐에 따라 답이 달라지는 질문이에요(‘허용해야 할까?’). 사실 질문은 자료와 증거로 답해요. 의사 결정에서는 두 가지를 구분해서 말해야 해요.',
        },
        {
          type: 'quiz', title: '한 쟁점이 여러 범주에 걸치는 까닭',
          goal: '하나의 쟁점이 <b>여러 범주</b>(생태적 · 윤리적 · 제도적 · 사회적)에 걸치는 까닭으로 알맞은 것은?',
          setup() { setMode('issues'); },
          choices: ['하나의 기술이 생태계, 생명의 가치, 제도, 사회 관계에 동시에 영향을 줄 수 있기 때문이다', '범주 사이에는 차이가 없어서 아무렇게나 붙여도 되기 때문이다', '한 쟁점은 반드시 한 범주에만 속하는데 분류가 잘못되었기 때문이다', '사회적 문제는 과학과 관계가 없어서 따로 떼어 놓아야 하기 때문이다'],
          answer: 0,
          feedback: ['', '범주는 서로 다른 관점이에요. 무엇이 문제인지 구분해서 살펴보기 위한 거예요.', '실제 쟁점은 여러 면을 함께 가져서 한 범주로 딱 나뉘지 않는 경우가 많아요.', '과학 기술은 사회와 밀접하게 연결되어 있어서 함께 살펴봐야 해요.'],
          explain: '예를 들어 LMO 재배는 <b>생태적</b>(유전자 이동), <b>제도적</b>(승인 · 표시 제도), <b>사회적</b>(소비자 선택권)이 함께 걸려요. 여러 범주로 나누어 보면 놓치기 쉬운 문제와 필요한 해결 방법(연구, 제도, 사회적 합의)을 구분해서 생각할 수 있어요.',
        },
      ],
    },
    {
      title: '이해관계 분석', short: '이해관계', icon: '💬', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 쟁점을 범주와 질문(사실 · 가치)으로 나눴어요. 이제 가치 질문이 걸린 쟁점 ②를 깊이 살펴요.</div><p><b>쟁점 ②: 질병 예방 목적의 생식세포 편집(가상)</b>에 대해 <b>다섯 사람</b>이 말해요. 각 사람의 말에서 <b>주장(입장)</b>과 <b>우선하는 윤리 원칙</b>을 찾아 정리해요. 원칙은 <b>자율성 존중 · 악행 금지 · 선행 · 정의</b> 네 가지예요.</p><p>또 ‘질병을 예방하려는 편집’과 ‘능력을 높이려는 편집’을 <b>구분</b>해 보고, <b>미래 세대는 지금의 결정에 동의할 수 없다</b>는 점도 생각해 봐요. 이 활동은 누구의 입장이 맞는지 가리는 것이 아니에요.</p>',
      features: ['stake', 'purpose'],
      setup() { setMode('stake'); },
      recap: '같은 사실을 보고도 우선하는 가치(자율성 · 악행 금지 · 선행 · 정의)가 다르면 입장이 갈려요. 치료(예방) 목적과 능력 향상 목적은 구분해서 논의하고, 미래 세대는 동의할 수 없다는 점도 고려해야 해요.',
      summary: '<ul><li><b>윤리 원칙 4가지</b>: 자율성 존중(충분한 설명에 근거한 동의), 악행 금지(해를 주지 않음), 선행(이익 증진), 정의(이익과 부담의 공정한 분배).</li><li><b>이해관계자(가상)</b>: 질환 가족 · 연구자 · 장애 인권 활동가 · 미래 세대를 대변하는 시민 · 규제 기관. 각자 입장(허용 / 조건부 허용 / 유예 · 금지)과 우선하는 가치가 달라요.</li><li><b>치료(예방) vs 향상</b>: 목적에 따라 이익과 위험, 공정성 논의가 달라서 구분해서 논의해요. 경계가 모호한 경우도 있어요.</li><li>미래 세대는 지금의 결정에 <b>동의할 수 없다</b>는 점이 쟁점이 돼요.</li></ul>',
      missions: [
        {
          id: 'stake', title: '입장과 우선 가치 정리', manual: true,
          goal: '<b>💬 이해관계자</b> 5명의 <b>입장</b>과 <b>우선하는 윤리 원칙</b>을 고르고, <b>🧭 예방 · 향상</b> 카드 6장을 알맞은 칸에 놓으세요.',
          hint: '사람의 말에서 “허용해 주세요”, “조건으로”, “미뤄야 해요” 같은 표현으로 입장을 찾고, 무엇을 가장 걱정하거나 바라는지로 원칙을 골라요. 같은 사람에게 어울리는 원칙이 둘일 수 있어요.',
          setup() { setMode('stake'); },
          check() {
            const n = STK.filter((s, i) => BX.stance[i] && BX.pval[i]).length;
            if (n < 5) return '입장과 우선 가치를 모두 고르지 않은 사람이 있어요. (' + n + ' / 5)';
            const bad = STK.map((s, i) => (skOK(i) ? -1 : i)).filter((i) => i >= 0);
            if (bad.length) { const i = bad[0]; return STK[i].name + '의 말을 다시 읽어 보세요. ' + (BX.stance[i] !== STK[i].stance ? '(입장이 달라요)' : '(우선하는 가치를 다시 생각해 보세요)') + ' ' + bad.length + '명'; }
            const k = PU.so.placed;
            if (k < 6) { PU.so.markBad([]); return '🧭 예방 · 향상 카드를 모두 놓아 주세요. (' + k + ' / 6)'; }
            const w = puWrong();
            if (w.length) { PU.so.markBad(w.map((c) => c.id)); return '\'' + w[0].short + '\' 카드를 다시 생각해 보세요. (' + w.length + '장)'; }
            PU.so.markBad([]); PU.so.markOk(PU.so.cards.map((c) => c.id));
            return true;
          },
          status: () => mark(STK.every((s, i) => BX.stance[i] && BX.pval[i])) + ' 이해관계자 ' + STK.filter((s, i) => BX.stance[i] && BX.pval[i]).length + ' / 5 &nbsp; ' + mark(PU.so.placed === 6) + ' 목적 카드 ' + PU.so.placed + ' / 6',
          explain: '<b>질환 가족</b>은 허용(선행: 고통을 막는 이익), <b>연구자</b>는 조건부 허용(자율성 존중 · 선행: 동의와 심의), <b>장애 인권 활동가</b>는 유예(정의: 차별 우려), <b>미래 세대 시민</b>은 유예(악행 금지 · 자율성: 동의할 수 없는 후손), <b>규제 기관</b>은 조건부(악행 금지: 안전 확인)로 읽을 수 있어요. 어떤 입장이 맞는지가 아니라 <b>어떤 가치를 근거로 삼았는지</b>를 읽어 내는 연습이에요.',
        },
        {
          type: 'quiz', title: '치료와 향상을 구분하는 까닭',
          goal: '‘질병을 예방하려는 편집’과 ‘능력을 높이려는 편집’을 <b>구분해서 논의해야 하는 까닭</b>으로 알맞은 것은?',
          setup() { setMode('purpose'); },
          choices: ['목적에 따라 기대하는 이익, 위험을 감수할 이유, 공정성과 차별의 논란이 달라서 같은 기준으로 판단하기 어렵기 때문이다', '두 가지는 기술이 같으므로 구분할 필요가 전혀 없기 때문이다', '능력 향상 목적은 언제나 허용되어야 하기 때문이다', '질병 예방 목적은 언제나 금지되어야 하기 때문이다'],
          answer: 0,
          feedback: ['', '기술이 같아도 목적에 따라 사회적 논의의 내용이 달라져요.', '모든 경우를 한꺼번에 허용 또는 금지로 정해 버리는 것은 근거가 없어요.', '모든 경우를 한꺼번에 허용 또는 금지로 정해 버리는 것은 근거가 없어요.'],
          explain: '같은 기술이어도 <b>목적</b>에 따라 얻는 이익과 감수할 위험이 다르고, 향상 목적은 <b>공정성</b>(능력 격차, 차별)을 더 크게 논란으로 만들어요. 그래서 목적을 구분해서 각각 근거를 따져야 해요. 경계가 모호한 경우도 있어서 그 자체가 논의 대상이에요.',
        },
        {
          type: 'quiz', title: '같은 사실, 다른 입장',
          goal: '같은 과학적 사실을 보고도 사람들의 <b>입장이 갈리는 까닭</b>으로 가장 알맞은 것은?',
          setup() { setMode('stake'); },
          choices: ['사람마다 우선하는 가치(이익, 안전, 공정성, 자율성 등)가 달라서 같은 사실도 다르게 평가하기 때문이다', '한쪽은 과학적 사실을 전혀 모르기 때문이다', '과학적 사실이 사람마다 다르게 정해지기 때문이다', '가치는 모든 사람이 똑같기 때문에 생각이 같을 수밖에 없다'],
          answer: 0,
          feedback: ['', '같은 사실을 알아도 입장이 갈릴 수 있어요. 가치의 차이 때문이에요.', '사실은 증거로 확인하는 것이에요. 입장이 갈리는 것은 가치 판단 때문이에요.', '우선하는 가치는 사람마다 달라요.'],
          explain: '사실이 같아도 <b>무엇을 더 중시하느냐</b>(환자의 이익, 안전, 공정성, 미래 세대의 권리)에 따라 결론이 달라져요. 그래서 의사 결정에서는 사실과 함께 <b>자신이 중시하는 가치</b>를 드러내고 서로의 가치를 이해해야 해요.',
        },
      ],
    },
    {
      title: '의사 결정하기', short: '의사 결정', icon: '⚖️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 이해관계자마다 우선하는 가치가 달라 입장이 갈린다는 것을 봤어요. 이제 <b>5단계 틀</b>로 직접 결정해 봐요.</div><p><b>① 사실 확인 → ② 이해관계자 · 가치 → ③ 대안 → ④ 평가 → ⑤ 결정과 재검토</b></p><p>쟁점 ②에 대한 대안 3개(<b>허용 / 조건부 허용 / 유예 · 금지</b>)가 네 항목(환자 이익 · 안전성 불확실성 · 공정성 · 미래 세대 권리)에서 받은 <b>가상의 점수표</b>가 있어요. 내가 중시하는 가치에 따라 <b>가중치(합 10)</b>를 나누면 총점 순위가 어떻게 바뀌는지 확인하고, <b>나의 가치를 밝힌 결정 문장</b>을 만들어요.</p><p>점수표는 정답이 아니라 <b>가치가 결론에 미치는 영향을 보는 도구</b>예요.</p>',
      features: ['decide', 'sentence'],
      setup() { setMode('decide'); },
      recap: '같은 점수표도 가치의 가중치에 따라 1위가 달라지므로 과학적 사실만으로 결론이 정해지지 않아요. 결정은 사실 근거와 가치 근거를 구분해 밝히고, 반론에 대응하며, 재검토 조건을 두는 문장으로 표현해요.',
      summary: '<ul><li><b>5단계 틀</b>: 사실 확인 → 이해관계자 · 가치 → 대안 → 평가 → 결정과 재검토.</li><li><b>대안 비교(가상 점수)</b>: 가중치 (3, 3, 2, 2)이면 허용 ' + MINUS + '7, 조건부 1, 유예 · 금지 9 / (6, 1, 1, 2)이면 허용 8, 조건부 9, 유예 · 금지 ' + MINUS + '4 / (8, 0, 0, 2)이면 허용 18, 조건부 14, 유예 · 금지 ' + MINUS + '12. 가치(가중치)에 따라 순위가 달라져요.</li><li><b>결정 문장</b>의 요소: 결정, 사실 근거, 가치 근거, 반론에 대한 대응, 재검토 조건. 사실 근거와 가치 근거를 구분해서 써요.</li><li><b>평가 기준</b>: 사실과 가치의 구분, 근거 제시, 이해관계자 고려, 반론 대응, 재검토 가능성. (어떤 결정이 정답인지가 아니에요.)</li></ul>',
      missions: [
        {
          id: 'decide', title: '가중치를 바꿔 순위 변화 확인',
          goal: '<b>⚖️ 대안 비교</b>에서 가중치(합 10)를 바꿔, <b>세 가지 대안이 각각 1위</b>가 되는 경우를 모두 만들어 보세요.',
          hint: '‘가치 우선순위 예시’ 단추를 눌러도 되고, − / + 단추로 직접 나눠도 돼요. 환자 이익에 큰 가중치를 주면 어떤 대안이 앞서는지, 안전성 · 공정성 · 미래 세대에 가중치를 주면 어떻게 되는지 비교해 봐요.',
          setup() { DEC.won = { allow: false, cond: false, ban: false }; setMode('decide'); },
          check: () => ALTS.every((a) => DEC.won[a.id]) && wSum() === 10, hold: 0.5,
          status: () => ALTS.map((a) => mark(DEC.won[a.id]) + ' ' + a.name).join(' &nbsp; ') + ' &nbsp; (합 ' + wSum() + ')',
          explain: '가중치 (3, 3, 2, 2)에서는 <b>유예 · 금지 9</b>가 1위, (6, 1, 1, 2)에서는 <b>조건부 9</b>가 1위(허용 8), (8, 0, 0, 2)에서는 <b>허용 18</b>이 1위예요. 같은 사실(점수표)인데도 어떤 가치를 더 중시하느냐에 따라 결론이 달라져요. 점수는 가상의 교육용 값이고 정답이 아니에요.',
        },
        {
          id: 'sentence', title: '결정 문장과 재검토 조건', manual: true,
          goal: '<b>📝 결정 문장</b>에서 나의 <b>결정</b>, <b>사실 근거</b>, <b>가치 근거</b>, <b>반론 대응</b>, <b>재검토 조건</b>을 고르세요. 결정은 내 가중치에서 1위인 대안과 맞아야 해요.',
          hint: '사실 근거에는 확인할 수 있는 사실을, 가치 근거에는 내가 중시하는 가치를 넣어요. ‘옳아요’나 ‘안전하다고 말해요’는 어느 쪽에도 알맞지 않을 수 있어요. 반론은 인정하고 보완하는 것이 좋고, 재검토 조건은 새 증거나 사회적 합의의 변화를 넣어요.',
          setup() { setMode('sentence'); },
          check() {
            const s = BX.sd;
            if (!s.dec) return '먼저 ① 나의 결정을 골라 주세요.';
            if (topIds().indexOf(s.dec) < 0) return '지금 내 가중치(' + BX.w.join(', ') + ')에서 1위는 ‘' + topIds().map((id) => ALTS.find((a) => a.id === id).name).join(', ') + '’이에요. 결정을 가중치에 맞추거나, ⚖️ 대안 비교에서 가중치를 다시 정해 보세요.';
            if (s.fact < 0) return '② 사실 근거를 골라 주세요.';
            if (!SD_FACT[s.fact].ok) return '사실 근거 칸에는 확인할 수 있는 사실을 넣어요. ' + SD_FACT[s.fact].why;
            if (s.val < 0) return '③ 가치 근거를 골라 주세요.';
            if (!SD_VAL[s.val].ok) return '가치 근거 칸에는 내가 어떤 가치를 중시하는지를 넣어요. ' + SD_VAL[s.val].why;
            if (s.reb < 0) return '④ 반론에 대한 대응을 골라 주세요.';
            if (!SD_REB[s.reb].ok) return SD_REB[s.reb].why;
            if (s.rev < 0) return '⑤ 재검토 조건을 골라 주세요.';
            if (!SD_REV[s.rev].ok) return SD_REV[s.rev].why;
            return true;
          },
          status: () => SDK.map((r) => mark(sdText(r[0]) !== '') + ' ' + r[1]).join(' &nbsp; '),
          explain: '좋은 결정 문장은 <b>사실 근거</b>(확인할 수 있는 것)와 <b>가치 근거</b>(내가 중시하는 것)를 구분해서 쓰고, <b>반론</b>의 가장 강한 우려를 인정하며 보완책을 제시하고, 새로운 증거나 사회적 합의의 변화가 있으면 <b>다시 검토</b>하겠다고 밝혀요. 어떤 결정을 골랐는지가 아니라 <b>이 과정이 얼마나 충실한지</b>를 살펴요.',
        },
        {
          type: 'quiz', title: '가중치에 따라 결과가 달라진다는 것',
          goal: '가중치에 따라 <b>1위 대안이 달라진다</b>는 사실이 의미하는 바로 가장 알맞은 것은?',
          setup() { setMode('decide'); },
          choices: ['과학적 사실만으로 결론이 정해지지 않고 어떤 가치를 더 중시하는지가 결과에 영향을 주므로, 가치와 가중치를 드러내고 논의해야 한다', '가중치를 바꾸면 과학적 사실도 함께 바뀌므로 사실은 믿을 수 없다', '점수표가 잘못되었으므로 어떤 결정도 내릴 수 없다', '항상 처음에 정한 가중치가 정답이므로 바꿀 필요가 없다'],
          answer: 0,
          feedback: ['', '사실(점수표)은 그대로이고, 가치에 따른 가중치가 달라진 거예요.', '점수표는 가정에 따른 도구예요. 어떤 결정도 못 내린다는 뜻이 아니라, 가치를 드러내야 한다는 뜻이에요.', '가치는 사람마다 달라서 정답 가중치가 하나로 정해져 있지 않아요.'],
          explain: '점수표(사실에 해당하는 부분)가 같아도 <b>가중치(가치)</b>가 달라지면 순위가 바뀌어요. 그래서 의사 결정에서는 과학적 사실뿐 아니라 <b>자신이 중시하는 가치</b>를 분명히 밝히고, 다른 가치를 가진 사람과 논의하는 과정이 필요해요.',
        },
      ],
    },
    {
      title: '제도와 책임', short: '제도와 책임', icon: '🏛️', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 가치에 따라 결론이 달라질 수 있어서 개인의 결정만으로는 부족하다는 것을 봤어요. 그래서 사회에는 <b>제도</b>와 <b>책임</b>이 필요해요.</div><p>① <b>규제 장치</b>(연구 윤리 심의 · 생명윤리 법과 국제 협약 · 표시제와 정보 공개 · 시민 참여 공론화)를 <b>책임 주체</b>(연구자 · 기업 · 정부 · 시민)에 연결해요.</p><p>② <b>10년 뒤 시나리오</b> 한 문장(“만약 …가 허용되면 …할 수 있으므로 …가 필요하다”)을 만들고, ③ 앞에서 만든 내용을 모아 <b>발표 카드</b>의 체크리스트(범주 표시 · 근거 2개 · 반론 대응 · 제도 제안 · 재검토 조건)를 채워요.</p>',
      features: ['system', 'present'],
      setup() { setMode('system'); },
      recap: '생명공학의 책임은 연구자(정직한 연구와 사전 심의), 기업(안전 책임과 정보 공개), 정부(규제와 감독), 시민(정보에 기반한 참여)이 함께 나눠요. 기술이 발전해도 심의 제도와 시민 참여가 필요해요.',
      summary: '<ul><li><b>규제 장치</b>: 연구 윤리 심의 위원회(연구 전 승인), 생명윤리 관련 법과 국제 협약, 표시제와 정보 공개, 시민 참여 공론화.</li><li><b>사회적 책임</b>: 연구자의 정직 · 기업의 안전 책임 · 정부의 규제와 감독 · 시민의 정보에 기반한 참여. 실제로는 여러 주체가 함께 책임져요.</li><li><b>시나리오 문장</b>: “만약 …가 허용되면 …할 수 있으므로 …가 필요하다.” 기술이 가져올 결과를 예측해 필요한 제도를 제안해요.</li><li><b>발표 카드 체크리스트</b>: 범주 표시, 근거 2개(사실 · 가치), 반론 대응, 제도 제안, 재검토 조건.</li></ul>',
      missions: [
        {
          id: 'system', title: '장치–주체 연결과 발표 카드', manual: true,
          goal: '<b>🏛️ 제도와 책임</b>에서 규제 장치 4장을 책임 주체에 연결하고, <b>🎤 발표 카드</b>에서 시나리오를 고른 뒤 <b>체크리스트 5개</b>를 모두 채우세요.',
          hint: '심의는 연구를 시작하기 전에 받는 것, 법과 협약은 나라와 국제 사회의 규칙, 표시와 정보 공개는 제품을 내놓는 쪽의 책임, 공론화는 사회 구성원이 참여하는 논의예요. 시나리오는 조건 → 결과 → 필요한 제도가 이어지게 골라요.',
          setup() { setMode('system'); },
          check() {
            const n = SY.so.placed;
            if (n < 4) { SY.so.markBad([]); return '규제 장치 카드를 모두 놓아 주세요. (' + n + ' / 4)'; }
            const w = syWrong();
            if (w.length) { SY.so.markBad(w.map((c) => c.id)); return '\'' + w[0].short + '\' 카드의 중심 주체를 다시 생각해 보세요. (' + w.length + '장)'; }
            SY.so.markBad([]); SY.so.markOk(SY.so.cards.map((c) => c.id));
            if (BX.sc.a < 0 || BX.sc.b < 0 || BX.sc.c < 0) return '🎤 발표 카드 화면에서 10년 뒤 시나리오의 세 칸을 모두 골라 주세요.';
            if (!scOK()) return '시나리오가 서로 이어지지 않아요. 조건에서 예상되는 결과와, 그 결과에 알맞은 제도를 골라 보세요.';
            const miss = cardItems().filter((it) => !it.ok);
            if (miss.length) return '발표 카드의 \'' + miss[0].k + '\' 항목이 비어 있거나 알맞지 않아요. 앞 단계 화면(🃏 쟁점 카드 · 📝 결정 문장)에서 보완할 수 있어요. (' + miss.length + '개)';
            return true;
          },
          status: () => mark(SY.so.placed === 4) + ' 장치 ' + SY.so.placed + ' / 4 &nbsp; ' + mark(scOK()) + ' 시나리오 &nbsp; ' + mark(cardItems().every((it) => it.ok)) + ' 카드 ' + cardItems().filter((it) => it.ok).length + ' / 5',
          explain: '<b>연구 윤리 심의</b>는 연구를 시작하기 전에 받는 승인이라 <b>연구자</b>의 책임, <b>생명윤리 법과 국제 협약</b>은 <b>정부</b>의 규제와 감독, <b>표시제 · 정보 공개</b>는 제품을 내놓는 <b>기업</b>의 안전 책임, <b>공론화</b>는 정보에 기반해 참여하는 <b>시민</b>이 중심이에요. 실제로는 여러 주체가 함께 책임져요. 시나리오에서 예측한 결과가 어떤 제도를 필요로 하는지 이어서 생각하면 제안이 설득력을 가져요.',
        },
        {
          type: 'quiz', title: '심의 제도와 시민 참여가 필요한 까닭',
          goal: '기술이 아무리 발전해도 <b>심의 제도</b>와 <b>시민 참여</b>가 필요한 까닭으로 알맞은 것은?',
          setup() { setMode('present'); },
          choices: ['기술의 이익과 위험을 사회가 함께 점검해야 하고, 무엇을 허용할지는 가치 판단이 포함되어 모든 구성원과 관련되기 때문이다', '기술이 발전하면 모든 위험이 자동으로 사라지므로 제도는 없어도 되기 때문이다', '연구자 한 사람이 혼자 정하는 것이 가장 빠르고 정확하기 때문이다', '시민은 과학을 모르므로 의견을 들을 필요가 전혀 없기 때문이다'],
          answer: 0,
          feedback: ['', '기술이 발전해도 새로운 위험과 쟁점이 생겨요. 점검이 계속 필요해요.', '한 사람의 판단에는 놓치는 부분이 있고, 가치 판단은 사회 구성원 모두와 관련돼요.', '무엇을 허용할지는 가치 판단이라서 시민의 의견도 중요해요.'],
          explain: '기술의 안전성은 전문가가 평가하지만 <b>어디까지 허용할지</b>는 가치 판단이 포함된 사회적 결정이에요. 그래서 연구 전 <b>심의</b>로 위험과 이익을 점검하고, <b>시민 참여</b>(공론화)로 다양한 가치를 반영해야 해요. 새 기술은 새로운 쟁점을 계속 만들기 때문에 제도도 재검토되어야 해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-bioethics', mount: '#game', badge: '생명윤리 의사 결정자', homeHref: '../../index.html#hg',
    featureLabels: { issues: '🃏 쟁점 카드', stake: '💬 이해관계자', purpose: '🧭 예방 · 향상', decide: '⚖️ 대안 비교', sentence: '📝 결정 문장', system: '🏛️ 제도와 책임', present: '🎤 발표 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'issues') setReads(['연 카드', IS.open.filter(Boolean).length + ' / 6', '범주를 붙인 카드', ISSUES.filter((_, i) => BX.tags[i].length).length + ' / 6', '선택한 쟁점', '쟁점 ' + (IS.sel + 1)]);
    else if (m === 'stake') setReads(['정리한 사람', STK.filter((s, i) => BX.stance[i] && BX.pval[i]).length + ' / 5', '선택', STK[SK.sel].name, '원칙', '4가지']);
    else if (m === 'purpose') setReads(['놓은 카드', (PU.so ? PU.so.placed : 0) + ' / 6', '목적', '예방 · 향상', '주제', '생식세포 편집']);
    else if (m === 'decide') { const t = totals(), tp = topIds(); setReads(['가중치 합', wSum() + ' / 10', '1위', tp.length === 1 ? ALTS.find((a) => a.id === tp[0]).name : '공동 1위', '총점 (허용 · 조건부 · 유예)', t.map((v) => (v < 0 ? MINUS : '') + Math.abs(v)).join(' · ')]); }
    else if (m === 'sentence') setReads(['채운 항목', SDK.filter((r) => sdText(r[0])).length + ' / 5', '결정', BX.sd.dec ? decName(BX.sd.dec) : '—', '내 가중치', BX.w.join(' · ')]);
    else if (m === 'system') setReads(['놓은 카드', (SY.so ? SY.so.placed : 0) + ' / 4', '책임 주체', '4곳', '핵심', '함께 책임져요']);
    else setReads(['카드 항목', cardItems().filter((it) => it.ok).length + ' / 5', '시나리오', scOK() ? '이어짐' : '미완성', '쟁점', BX.sc.a >= 0 ? ISSUES[SC_AI[BX.sc.a]].title : '—']);
  }

  /* ---------- 시작 ---------- */
  setMode('issues');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.t = t; FDT = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    FX.update(dt);
    switch (S.mode) {
      case 'issues': issuesScene(dt, t); break;
      case 'stake': stakeScene(dt, t); break;
      case 'purpose': purposeScene(dt, t); break;
      case 'decide': decideScene(dt, t); break;
      case 'sentence': sentenceScene(dt, t); break;
      case 'system': systemScene(dt, t); break;
      case 'present': presentScene(dt, t); break;
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, BX, IS, SK, DEC, PU, SY, ISSUES, STK, ALTS, SD_FACT, SD_VAL, SD_REB, SD_REV, SC_A,
    isSelect, isToggleTag, isSetVal, skSelect, skSetStance, skSetVal, setW, setPreset, totals, topIds, wSum, isTagOK, isValOK, valSide, skOK, puWrong, syWrong, scOK, sdOK, cardItems, KEY,
  };


})();
