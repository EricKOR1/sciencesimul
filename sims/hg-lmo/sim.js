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
     고등학교 생물의 유전 · Ⅲ. 생명공학기술 - 유전자 변형 생물체 (단원 61, 6차시)
     성취기준 [12유전03-04] 유전자 변형 생물체(LMO)의 특징을 이해하고 인간과 생태계에 미치는 영향을 추론할 수 있다.
     ① 모형: LMO 만들기  ② 분석: 인간 영향  ③ 탐구: 생태계 영향  ④ 종합: 영향 추론
     (저항성 진화 · 꽃가루 교잡률은 단순화한 모의실험 · 예시 식이에요)
     ========================================================= */
  const S = { mode: 'make', fade: 0, t: 0 };
  let game = null, FDT = 0;
  const ctlNodes = $$('#ctrlCard .control');
  const MINUS = '−';

  /* =========================================================
     ① LMO 만들기: 비교 + 5단계 (Bt 옥수수)
     ========================================================= */
  const MK_PAGES = [
    { title: '전통 육종과 LMO 만들기 비교', text: '전통 육종은 같은 종 안에서 교배하고 원하는 개체를 골라요. LMO는 원하는 유전자 하나를 직접 도입하므로 다른 종의 유전자도 쓸 수 있어요.' },
    { title: '① 목적 유전자 확보 (Bt 독소 유전자)', text: '토양 세균 Bt(Bacillus thuringiensis)의 DNA에서 특정 곤충에게 독성을 내는 단백질을 만드는 유전자를 잘라 내요.' },
    { title: '② 벡터에 삽입 (Ti 플라스미드)', text: '목적 유전자와 선택 마커(제초제 저항 유전자)를 벡터인 Ti 플라스미드에 넣어요. 같은 제한 효소로 자르고 연결 효소로 이어요.' },
    { title: '③ 식물 세포에 도입 (유전자총 · 아그로박테리움)', text: '벡터를 입힌 금 입자를 쏘거나(유전자총) 아그로박테리움이 감염시켜 식물 세포에 넣어요. 도입된 세포는 겉으로 구별되지 않아요.' },
    { title: '④ 선택 배지에서 선별', text: '제초제를 넣은 선택 배지에서는 선택 마커를 가진 형질 전환 세포만 살아남아요. 살아남은 세포만 골라 재생시켜요.' },
    { title: '⑤ 조직 배양으로 식물 재생', text: '살아남은 세포를 조직 배양해 식물체로 키워요. 이 Bt 옥수수를 먹은 표적 해충은 죽지만 일반 옥수수의 해충은 자라요.' },
  ];
  const MK = { page: 0, t: 0 }, MKP = {};
  function mkGo(p) { p = clamp(p, 0, 5); if (MK.page !== p) { MK.page = p; MK.t = 0; S.fade = 0.6; Object.keys(MKP).forEach((k) => { delete MKP[k]; }); } Sound.tick(); updateCtl(); }
  /* ---------- 선택 배지 접시 (12개 세포, 형질 전환 4개) ---------- */
  const TR = [1, 4, 6, 10], HIT = [0, 1, 2, 4, 6, 7, 10, 11];
  const DS = { med: false, medT: 0, regen: false, cells: [], msg: '', msgT: 0, hits: [] };
  function dsReset() {
    DS.med = false; DS.medT = 0; DS.regen = false; DS.msg = ''; DS.msgT = 0;
    DS.cells = []; for (let i = 0; i < 12; i++) DS.cells.push({ tr: TR.indexOf(i) >= 0, pick: false, shake: 0 });
    if (MK.page === 5) { MK.page = 4; } MK.t = 0; updateCtl();
  }
  function dsGeom() {
    if (PHONE) return { dish: { x: 14, y: 56, w: 452, h: 440 }, cols: 3, cx: (c) => 14 + 78 + c * 148, cy: (r) => 56 + 66 + r * 104 };
    return { dish: { x: 140, y: 58, w: 520, h: 360 }, cols: 4, cx: (c) => 140 + 78 + c * 122, cy: (r) => 58 + 70 + r * 108 };
  }
  const dsPos = (i) => { const g = dsGeom(); return { x: g.cx(i % g.cols), y: g.cy(Math.floor(i / g.cols)) }; };
  const dsAlive = (i) => DS.cells[i].tr || !DS.med;
  const dsSurv = () => DS.cells.map((c, i) => (c.tr ? i : -1)).filter((i) => i >= 0);
  function dsMsg(m) { DS.msg = m; DS.msgT = 3.5; }
  function dsMedium() { if (DS.med) return; DS.med = true; DS.medT = 0; Sound.click(); updateCtl(); }
  function dsToggle(i) {
    if (DS.regen) return;
    if (!DS.med) { dsMsg('먼저 선택 배지를 넣어 어느 세포가 살아남는지 확인해요.'); DS.cells[i].shake = 1; Sound.fail(); return; }
    if (!DS.cells[i].tr) { dsMsg('시든 세포는 재생할 수 없어요. 살아남은 세포를 골라요.'); DS.cells[i].shake = 1; Sound.fail(); return; }
    DS.cells[i].pick = !DS.cells[i].pick; Sound.click(); updateCtl();
  }
  function dsRegen() {
    if (DS.regen) return;
    if (!DS.med) { dsMsg('먼저 선택 배지를 넣어 주세요.'); Sound.fail(); return; }
    const picked = DS.cells.map((c, i) => (c.pick ? i : -1)).filter((i) => i >= 0);
    if (!picked.length) { dsMsg('살아남은 세포를 눌러 고른 뒤 재생을 시작해요.'); Sound.fail(); return; }
    if (picked.length < dsSurv().length) { dsMsg('살아남은 세포가 더 있어요. 모두 골라 주세요. (' + picked.length + ' / ' + dsSurv().length + ')'); Sound.fail(); return; }
    DS.regen = true; Sound.success(); const p = dsPos(picked[0]); okBurst(p.x, p.y);
    setTimeout(() => { if (DS.regen) mkGo(5); }, RM ? 100 : 900); updateCtl();
  }

  /* ---------- 그림 도구: 식물 세포 · 옥수수 ---------- */
  function plantCell(x, y, r, st) {
    // st: {alive 0~1, pick, shake}
    const a = st.alive, sc = 1 - 0.32 * (1 - a);
    ctx.save(); ctx.translate(x + (st.shake > 0 && !RM ? Math.sin(clock * 55) * 4 * st.shake : 0), y); ctx.scale(sc, sc);
    const wall = C.mix('#9ca3af', '#4d9a3a', a), fill = C.mix('#e5e7eb', '#d9f2c4', a);
    D.shadow(() => { D.roundRect(-r, -r, r * 2, r * 2, r * 0.45); ctx.fillStyle = fill; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = wall; ctx.lineWidth = 4; D.roundRect(-r, -r, r * 2, r * 2, r * 0.45); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(r * 0.28, r * 0.25, r * 0.5, r * 0.34, 0, 0, TAU); ctx.fillStyle = C.mix('#cbd5e1', '#a7d98a', a); ctx.fill();   // 큰 액포
    D.sphere(-r * 0.3, -r * 0.2, r * 0.32, C.mix('#9ca3af', '#7c6ad8', a), { gloss: a > 0.5 });
    if (a < 0.5) { T(0, 8, '✕', 24, '#6b7280', 'center', 800, { alpha: 1 - a * 2 }); }
    ctx.restore();
    if (st.pick) D.ring(x, y, r + 10, clock, { color: '#f59e0b', width: 3.5 });
  }
  /* 옥수수 식물: (x, base) 줄기 아래, h 높이, grow 0~1, bite 0~1 (오른쪽 잎을 갉아 먹은 정도) */
  function cornPlant(x, base, h, grow, bite, col) {
    const g = ease.outCubic(clamp(grow, 0, 1)), H = h * g;
    if (H < 2) return null;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = C.shade(col, -0.25); ctx.lineWidth = 9 * (0.4 + 0.6 * g);
    ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - H); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - H); ctx.stroke();
    const leaves = [[-1, 0.28, 0.7], [1, 0.38, 0.8], [-1, 0.55, 0.62], [1, 0.66, 0.7]];
    const info = {};
    leaves.forEach((lf, k) => {
      const ly = base - H * lf[1], len = h * 0.34 * lf[2] * g, sx = lf[0];
      const x2 = x + sx * len, y2 = ly - len * 0.35;
      ctx.beginPath(); ctx.moveTo(x, ly);
      ctx.quadraticCurveTo(x + sx * len * 0.55, ly - len * 0.55, x2, y2);
      ctx.quadraticCurveTo(x + sx * len * 0.55, ly - len * 0.1, x, ly + 4);
      ctx.closePath();
      ctx.save();
      if (k === 1 && bite > 0) {   // 오른쪽 아래 잎을 갉아 먹은 자국
        ctx.beginPath(); ctx.rect(x - 200, ly - 200, 400, 400);
        for (let b = 0; b < 4; b++) { if (bite > b / 4) { const bb = ease.outCubic(clamp(bite * 4 - b, 0, 1)); ctx.moveTo(x2 - sx * (10 + b * 14) + 12 * bb, y2 + 12 + b * 2); ctx.arc(x2 - sx * (10 + b * 14), y2 + 12 + b * 2, 11 * bb, 0, TAU); } }
        ctx.clip('evenodd');
        ctx.beginPath(); ctx.moveTo(x, ly); ctx.quadraticCurveTo(x + sx * len * 0.55, ly - len * 0.55, x2, y2); ctx.quadraticCurveTo(x + sx * len * 0.55, ly - len * 0.1, x, ly + 4); ctx.closePath();
      }
      ctx.fillStyle = C.mix(col, '#ffffff', 0.12); ctx.fill(); ctx.strokeStyle = C.shade(col, -0.3); ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      if (k === 1) { info.leafX = x2 - 6; info.leafY = y2 + 10; }
    });
    // 이삭
    if (g > 0.8) { ctx.fillStyle = '#facc15'; D.roundRect(x + 6, base - H * 0.5, 14, 30, 7); ctx.fill(); ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.restore();
    return info;
  }
  function geneBar(x, y, w, h, col, label, o) {
    o = o || {};
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = C.mix('#ffffff', col, 0.85); ctx.fill(); ctx.strokeStyle = C.shade(col, -0.25); ctx.lineWidth = 2; ctx.stroke();
    if (label) TF(x + w / 2, y + h / 2 + 5, label, w - 10, o.size || 13, 10.5, '#fff', 'center', 800, { stroke: C.shade(col, -0.3), strokeWidth: 2 });
  }

  /* ---------- 장면 ---------- */
  function makeScene(dt, t) {
    MK.t += dt; const u = MK.t, P = MK_PAGES[MK.page];
    const capY = PHONE ? 508 : 450, capH = PHONE ? 126 : 98;
    T(14, 28, P.title, PHONE ? 14.5 : 16.5, '#334155', 'left', 800);
    DS.msgT = Math.max(0, DS.msgT - dt);
    const pg = MK.page;
    if (pg === 0) mkCompare(u, t);
    else if (pg === 1) mkGene(u, t);
    else if (pg === 2) mkVector(u, t);
    else if (pg === 3) mkIntro(u, t, dt);
    else if (pg === 4) mkDish(u, t, dt);
    else mkRegen(u, t);
    panel(10, capY, VW - 20, capH, 14);
    textFit(24, capY + 10, VW - 48, capH - 18, P.text, PHONE ? 14.5 : 15.5, 12, '#334155', 700);
    FX.draw();
  }
  /* 0: 비교 */
  function mkCompare(u, t) {
    const w = PHONE ? 464 : 384, h = PHONE ? 220 : 380;
    const L0 = { x: PHONE ? 8 : 10, y: 44, w, h }, R0 = PHONE ? { x: 8, y: 44 + h + 8, w, h } : { x: 406, y: 44, w, h };
    const seg = 12, sw = PHONE ? 26 : 24, bx = (r) => r.x + (r.w - seg * sw) / 2;
    // 전통 육종
    panel(L0.x, L0.y, L0.w, L0.h, 14);
    pill(L0.x + 14, L0.y + 20, '전통 육종: 교배 · 선발', { bg: '#d97706', color: '#fff', size: 14, align: 'left' });
    const rnd = mulberry(21 + Math.floor(u / 2.5));
    const rows = PHONE ? [0, 1, 2] : [0, 1, 2];
    const by = L0.y + (PHONE ? 52 : 62);
    for (let i = 0; i < seg; i++) { D.roundRect(bx(L0) + i * sw, by, sw - 2, 16, 3); ctx.fillStyle = '#60a5fa'; ctx.fill(); D.roundRect(bx(L0) + i * sw, by + 22, sw - 2, 16, 3); ctx.fillStyle = '#fb923c'; ctx.fill(); }
    T(bx(L0) - 4, by + 13, 'A', 13, '#1d4ed8', 'right', 800); T(bx(L0) - 4, by + 35, 'B', 13, '#c2410c', 'right', 800);
    const oy = by + 62;
    rows.forEach((r, k) => {
      for (let i = 0; i < seg; i++) { const fromA = rnd() < 0.5; D.roundRect(bx(L0) + i * sw, oy + k * (PHONE ? 24 : 36), sw - 2, 16, 3); ctx.fillStyle = fromA ? '#60a5fa' : '#fb923c'; ctx.fill(); }
      if (k === 1) { E('⭐', bx(L0) + seg * sw + 14, oy + k * (PHONE ? 24 : 36) + 9, 16); }
    });
    T(L0.x + L0.w / 2, oy + (PHONE ? 90 : 128), '같은 종 안에서 유전자가 통째로 섞여요', PHONE ? 13 : 14.5, '#92400e', 'center', 800);
    textBlock(L0.x + 18, oy + (PHONE ? 108 : 150), L0.w - 36, '⭐ 원하는 형질이 든 개체를 골라(선발) 여러 세대 교배를 반복해요.', PHONE ? 13 : 14.5, '#475569', PHONE ? 19 : 22, 700);
    // LMO
    panel(R0.x, R0.y, R0.w, R0.h, 14);
    pill(R0.x + 14, R0.y + 20, 'LMO: 유전자 재조합', { bg: '#16a34a', color: '#fff', size: 14, align: 'left' });
    for (let i = 0; i < seg; i++) { D.roundRect(bx(R0) + i * sw, by, sw - 2, 16, 3); ctx.fillStyle = '#86efac'; ctx.fill(); }
    T(bx(R0) - 4, by + 13, '옥수수', 12.5, '#166534', 'right', 800);
    const gp = smooth((u % 4) / 1.6);   // 도입 장면 반복
    const gx = bx(R0) + 5 * sw, gy0 = by + 70, gy1 = by;
    D.roundRect(bx(R0) + 5 * sw, by + 22, sw * 2 - 2, 16, 3); ctx.fillStyle = '#d1d5db'; ctx.fill(); ctx.setLineDash([3, 3]); ctx.strokeStyle = '#9ca3af'; ctx.stroke(); ctx.setLineDash([]);
    const yy = lerp(gy0, gy1, gp);
    D.roundRect(gx, yy, sw * 2 - 2, 16, 3); ctx.fillStyle = '#ef4444'; ctx.fill();
    TF(bx(R0) + seg * sw / 2, by + 56 + (PHONE ? 0 : 6), 'Bt 독소 유전자 (세균)', 200, 12.5, 11, '#b91c1c', 'center', 800, { alpha: 1 - gp });
    D.arrow(gx + sw, gy0 + 22, gx + sw, gy1 + 24, { color: '#ef4444', width: 3, alpha: 1 - gp * 0.6 });
    const oyR = by + 86;
    for (let i = 0; i < seg; i++) { D.roundRect(bx(R0) + i * sw, oyR, sw - 2, 16, 3); ctx.fillStyle = (i === 5 || i === 6) ? '#ef4444' : '#86efac'; ctx.fill(); }
    T(bx(R0) - 4, oyR + 13, 'LMO', 12.5, '#166534', 'right', 800);
    T(R0.x + R0.w / 2, oyR + (PHONE ? 46 : 52), '나머지 유전자는 그대로, 목적 유전자만 추가돼요', PHONE ? 13 : 14.5, '#166534', 'center', 800);
    textBlock(R0.x + 18, oyR + (PHONE ? 66 : 80), R0.w - 36, '다른 종의 유전자도 도입할 수 있어요. 유전 부호가 거의 모든 생물에서 같기 때문이에요.', PHONE ? 13 : 14.5, '#475569', PHONE ? 19 : 22, 700);
  }
  /* 1: 목적 유전자 확보 */
  function mkGene(u, t) {
    const cx = PHONE ? 170 : 250, cy = PHONE ? 240 : 230, p = smooth((u - 0.4) / 2.2);
    D.shadow(() => { D.roundRect(cx - 130, cy - 90, 260, 180, 80); ctx.fillStyle = '#f2fbe9'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#6aa84f'; ctx.lineWidth = 5; D.roundRect(cx - 130, cy - 90, 260, 180, 80); ctx.stroke();
    T(cx, cy - 104, '토양 세균 Bt', 14, '#3f7f23', 'center', 800);
    // 고리 DNA, 호 하나가 목적 유전자
    const r0 = 58, a0 = -Math.PI / 2 - 0.5, a1 = -Math.PI / 2 + 0.5;
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r0, a1, a0 + TAU); ctx.stroke();
    if (p < 0.02) { ctx.strokeStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cx, cy, r0, a0, a1); ctx.stroke(); }
    // 가위로 자르기
    if (u > 0.2 && p < 1) { const sa = [a0, a1]; sa.forEach((a, i) => E('✂️', cx + Math.cos(a) * (r0 + 22), cy + Math.sin(a) * (r0 + 22), 22, { rot: a + (i ? 0.8 : -0.8) + Math.sin(u * 14) * 0.25 })); }
    // 떨어져 나온 유전자 조각
    const tx = (PHONE ? 360 : 560), ty = (PHONE ? 240 : 200);
    if (p > 0.02) {
      const mx = lerp(cx + Math.cos(-Math.PI / 2) * r0, tx, p), my = lerp(cy - r0, ty, p);
      D.roundRect(mx - 56, my - 14, 112, 28, 14); ctx.fillStyle = '#ef4444'; ctx.fill(); ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 2; ctx.stroke();
      T(mx, my + 5, 'Bt 독소 유전자', 13, '#fff', 'center', 800);
    }
    if (p > 0.95) { T(tx, ty + 44, '목적 유전자 확보!', 15, '#b91c1c', 'center', 800); T(tx, ty + 68, '특정 곤충의 장에서만 작용', 13, '#64748b', 'center', 700); }
    ctx.lineCap = 'butt';
  }
  /* 2: 벡터 삽입 */
  function mkVector(u, t) {
    const cx = VW / 2, cy = PHONE ? 230 : 220, r = PHONE ? 90 : 100;
    const open = 1 - smooth((u - 3.2) / 1.0), gap = 0.55 * open;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#7c6ad8'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2 + gap, -Math.PI / 2 + TAU - gap); ctx.stroke();
    ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2 + gap, -Math.PI / 2 + TAU - gap); ctx.stroke();
    T(cx, cy + 6, 'Ti 플라스미드', PHONE ? 14 : 16, '#5b4bb5', 'center', 800);
    T(cx, cy + 28, '(벡터)', 13, '#5b4bb5', 'center', 700);
    // 삽입되는 조각 두 개
    const p1 = smooth(u / 1.4), p2 = smooth((u - 1.4) / 1.4);
    const topY = cy - r;
    const gx = lerp(PHONE ? 70 : 120, cx - 30, p1), gy = lerp(topY - 90, topY, p1);
    const mx = lerp(VW - (PHONE ? 70 : 120), cx + 30, p2), my = lerp(topY - 90, topY, p2);
    const closed = open < 0.02;
    if (!closed) {
      D.roundRect(gx - 54, gy - 14, 108, 28, 14); ctx.fillStyle = '#ef4444'; ctx.fill(); T(gx, gy + 5, 'Bt 독소 유전자', 12.5, '#fff', 'center', 800);
      D.roundRect(mx - 56, my - 14, 112, 28, 14); ctx.fillStyle = '#f59e0b'; ctx.fill(); T(mx, my + 5, '선택 마커', 13, '#fff', 'center', 800);
    } else {
      [[-40, '#ef4444'], [40, '#f59e0b']].forEach(([dx, col], i) => { ctx.strokeStyle = col; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2 + (i ? 0.04 : -0.42), -Math.PI / 2 + (i ? 0.42 : -0.04)); ctx.stroke(); });
    }
    ctx.lineCap = 'butt';
    if (u > 4.2) { T(cx, cy + r + 40, '재조합 플라스미드 완성: Bt 독소 유전자 + 선택 마커', PHONE ? 13 : 15, '#334155', 'center', 800); }
    callout2(PHONE ? 20 : 60, PHONE ? 370 : 330, '선택 마커 = 제초제를 견디게 하는 유전자 (선별에 써요)', '#b45309');
  }
  function callout2(x, y, text, col) { T(x, y, text, PHONE ? 13 : 14.5, col, 'left', 800); }
  /* 3: 식물 세포에 도입 */
  
  function mkIntro(u, t, dt) {
    const g = dsGeom();
    // 조직(세포 12개)
    D.roundRect(g.dish.x, g.dish.y, g.dish.w, g.dish.h, 18); ctx.fillStyle = 'rgba(190,230,170,.35)'; ctx.fill(); ctx.strokeStyle = '#84cc16'; ctx.lineWidth = 3; ctx.stroke();
    for (let i = 0; i < 12; i++) { const p = dsPos(i); plantCell(p.x, p.y, 34, { alive: 1, pick: false, shake: 0 }); }
    // 유전자총
    const gunX = PHONE ? 10 : 30, gunY = PHONE ? 520 : 232;
    ctx.save(); ctx.translate(gunX, gunY);
    D.shadow(() => { D.roundRect(0, -16, 90, 32, 8); ctx.fillStyle = '#64748b'; ctx.fill(); }, { blur: 4, y: 2 });
    D.roundRect(70, -10, 30, 20, 4); ctx.fillStyle = '#94a3b8'; ctx.fill(); ctx.restore();
    T(gunX + 40, gunY + 38, '유전자총', 13, '#475569', 'center', 800);
    const shotT = 0.8, sp = clamp((u - shotT) / 1.0, 0, 1);
    // 금 입자: 12칸 중 HIT 세포로 날아가 멈춰요
    HIT.forEach((ci, k) => {
      const e = dsPos(ci), sx = gunX + 100, sy = gunY, q = ease.outCubic(clamp((u - shotT - k * 0.04) / 1.0, 0, 1));
      if (u < shotT) return;
      const x = lerp(sx, e.x - 8, q), y = lerp(sy, e.y + 6 + (k % 2) * 6, q);
      D.sphere(x, y, 4.5, '#fbbf24', { gloss: false });
      if (q > 0.98 && !MKP['b' + ci]) { MKP['b' + ci] = 1; if (!RM) parts.burst(e.x, e.y, { count: 6, speed: 60, life: 0.4, size: 2.5 }); }
    });
    if (u > shotT + 1.2) T(g.dish.x + g.dish.w / 2, g.dish.y + g.dish.h + 24, '금 입자가 들어간 세포 중 일부에서만 유전자가 염색체에 끼어 들어가요 (모형)', PHONE ? 12.5 : 14, '#475569', 'center', 800);
  }
  /* 4: 선택 배지 */
  function mkDish(u, t, dt) {
    const g = dsGeom(), d = g.dish;
    if (DS.med) DS.medT = Math.min(1, DS.medT + dt / (RM ? 0.01 : 1.6));
    const mp = smooth(DS.medT);
    D.shadow(() => { D.roundRect(d.x, d.y, d.w, d.h, 22); ctx.fillStyle = C.mix('#fdf6e3', '#fde68a', mp * 0.7); ctx.fill(); }, { blur: 10, y: 4 });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; D.roundRect(d.x, d.y, d.w, d.h, 22); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(d.x + 18, d.y + 16); ctx.lineTo(d.x + d.w - 40, d.y + 16); ctx.stroke();
    DS.hits = [];
    DS.cells.forEach((c, i) => {
      const p = dsPos(i); c.shake = Math.max(0, c.shake - dt * 3);
      const alive = c.tr ? 1 : 1 - mp;
      plantCell(p.x, p.y, 34, { alive, pick: c.pick, shake: c.shake });
      if (DS.regen && c.pick) D.glow(p.x, p.y, 54, '#22c55e', 0.4 + 0.2 * Math.sin(t * 6));
      DS.hits.push({ i, x: p.x - 40, y: p.y - 40, w: 80, h: 80 });
    });
    pill(d.x + 14, d.y + d.h + 18, DS.med ? '선택 배지 (제초제 첨가)' : '일반 배지', { bg: DS.med ? '#d97706' : '#64748b', color: '#fff', size: 13, align: 'left' });
    const surv = DS.cells.filter((c) => c.pick).length;
    T(d.x + d.w - 8, d.y + d.h + 22, DS.med ? '고른 세포 ' + surv + '개' : '모두 같아 보여요', 14, '#334155', 'right', 800);
    if (DS.msgT > 0) TF(VW / 2, d.y - 8, DS.msg, VW - 24, 14.5, 11.5, '#b91c1c', 'center', 800, { stroke: '#fff', strokeWidth: 4 });
  }
  /* 5: 재생 + 해충 */
  function mkRegen(u, t) {
    const ground = PHONE ? 330 : 392, hgt = PHONE ? 190 : 250;
    const xs = PHONE ? [130, 350] : [230, 570];
    ctx.fillStyle = '#d6c3a5'; D.roundRect(20, ground, VW - 40, PHONE ? 70 : 40, 14); ctx.fill();
    const cyc = u < 2.2 ? u : 2.2 + ((u - 2.2) % 9);
    const grow = clamp(u / 2.2, 0, 1);
    // 조직 배양 → 어린 식물
    xs.forEach((x, k) => {
      const isBt = k === 0;
      let bite = 0;
      const crawl = clamp((cyc - 2.2) / 2.6, 0, 1), eat = clamp((cyc - 4.8) / 3.2, 0, 1);
      if (isBt) bite = clamp(eat * 2, 0, 1) * 0.25; else bite = eat;
      const info = cornPlant(x, ground + 4, hgt, grow, bite, isBt ? '#3f9b3f' : '#5aae4a');
      pill(x, ground + (PHONE ? 52 : 26), isBt ? 'Bt 옥수수' : '일반 옥수수', { bg: isBt ? '#16a34a' : '#64748b', color: '#fff', size: 13 });
      if (grow < 1) { D.sphere(x, ground, 12 * (1 - grow) + 5, '#a7d98a', { gloss: false }); if (grow < 0.3) T(x, ground - 24, '캘러스', 12.5, '#475569', 'center', 800); }
      if (info && cyc > 2.2) {
        const lx = info.leafX, ly = info.leafY;
        const lar = { x: lerp(lx + 130, lx + 4, ease.outCubic(crawl)), y: ly + 8 };
        let dead = isBt && eat > 0.75, a = 1;
        ctx.save(); ctx.translate(lar.x, lar.y); if (dead) { ctx.rotate(Math.min(1.2, (eat - 0.75) * 6)); a = 0.55; }
        ctx.globalAlpha = a; const wig = crawl < 1 && !RM ? Math.sin(t * 14) * 2 : 0; E('🐛', 0, wig, 26); ctx.restore();
        if (dead) T(lar.x, lar.y - 22, '✕', 20, '#b91c1c', 'center', 800);
        if (!isBt && eat > 0.4) T(x + 90, ground - hgt * 0.7, '잎이 갉아 먹혀요', 13, '#92400e', 'left', 800, { alpha: clamp((eat - 0.4) * 3, 0, 1) });
        if (isBt && eat > 0.5) T(x + 90, ground - hgt * 0.7, '해충이 죽어요', 13, '#166534', 'left', 800, { alpha: clamp((eat - 0.5) * 3, 0, 1) });
      }
    });
    if (grow >= 1) TF(VW / 2, PHONE ? 28 + 22 : 54, 'Bt 독소는 곤충 장 세포의 수용체에 결합해요. 사람 장에는 이 수용체가 없어요.', VW - 28, 14.5, 11.5, '#166534', 'center', 800);
  }
  function dishPT_down(p) {
    if (S.mode !== 'make' || MK.page !== 4) return false;
    for (const r of DS.hits) if (inRect(p.x, p.y, r)) { dsToggle(r.i); return false; }
    return false;
  }
  const makePT = { down: dishPT_down, hover(p) { return MK.page === 4 && DS.hits.some((r) => inRect(p.x, p.y, r)) ? 'pointer' : 'default'; } };

  /* =========================================================
     ① 순서 맞히기: 5단계 카드 → 1~5번 칸
     ========================================================= */
  const STEPS5 = ['목적 유전자 확보', '벡터에 삽입', '식물 세포에 도입', '선택 배지에서 선별', '조직 배양으로 재생'];
  const OD = { so: null }, EV = { so: null }, EL = { so: null, nut: false, seenNut: false, lm: 0, lmMax: 0 };
  function odBuild() {
    const w = PHONE ? 464 : 384, bh = 58, ch = PHONE ? 44 : 46;
    const boxes = STEPS5.map((s, i) => ({ id: String(i), label: ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째'][i] + ' 단계', col: '#16a34a', x: PHONE ? 8 : 10, y: (PHONE ? 38 : 44) + i * (bh + 5), w, h: bh, cols: 1, hdr: 22, cap: 1, ly: 16, ls: 13 }));
    const cards = shuffled([0, 1, 2, 3, 4], 5).map((i) => ({ id: String(i), label: STEPS5[i], col: '#0ea5e9' }));
    OD.so = selectable({ cards, boxes, cw: w, ch, kh: 30, tray: (i) => PHONE ? { x: 8, y: 372 + i * (ch + 6) } : { x: 406, y: 44 + i * (bh + 5) + 4 }, onChange() { updateCtl(); } });
  }
  const odWrong = () => OD.so.cards.filter((c) => c.zone && c.zone !== c.id);
  function orderScene(dt, t) {
    OD.so.update(dt);
    T(14, 28, 'LMO 만드는 5단계를 순서대로 놓아요', PHONE ? 14.5 : 16.5, '#334155', 'left', 800);
    OD.so.drawBoxes();
    T(PHONE ? 14 : 406, PHONE ? 364 : 36, '단계 카드 (끌어서 놓거나, 카드 → 칸 순서로 눌러요)', PHONE ? 12.5 : 13.5, '#64748b', 'left', 800);
    OD.so.drawCards();
  }
  const orderPT = sorterPT(() => OD.so);

  /* =========================================================
     ② 근거 분류: 이익 / 우려
     ========================================================= */
  const EVC = [
    { id: 'b1', box: 'benefit', label: '비타민 A 전구체(β-카로틴)를 쌀알에 쌓아 영양을 개선할 수 있어요', short: 'β-카로틴으로 영양 개선' },
    { id: 'b2', box: 'benefit', label: '해충이 줄어 살충제를 뿌리는 횟수를 줄일 수 있어요', short: '살충제 사용 감소' },
    { id: 'b3', box: 'benefit', label: '대장균이 사람 인슐린 같은 의약품을 만들어 줘요', short: '의약품 생산' },
    { id: 'c1', box: 'concern', label: '새로 만들어지는 단백질이 알레르기를 일으킬 수 있어요', short: '알레르기 가능성' },
    { id: 'c2', box: 'concern', label: '새 단백질이나 달라진 성분이 독성을 보일 수 있어요', short: '독성 가능성' },
    { id: 'c3', box: 'concern', label: '항생제 내성 유전자가 장내 세균에 옮겨 갈 수 있어요', short: '항생제 내성 유전자 전이' },
  ];
  function evBuild() {
    const cw = PHONE ? 464 : 384, ch = PHONE ? 40 : 48;
    const boxes = PHONE
      ? [{ id: 'benefit', label: '👍 이익 (기대되는 점)', col: '#16a34a', x: 8, y: 36, w: 464, h: 138, cols: 1, hdr: 26 }, { id: 'concern', label: '⚠ 우려 (평가로 확인할 점)', col: '#f59e0b', x: 8, y: 180, w: 464, h: 138, cols: 1, hdr: 26 }]
      : [{ id: 'benefit', label: '👍 이익 (기대되는 점)', col: '#16a34a', x: 10, y: 44, w: 384, h: 232, cols: 1, hdr: 28 }, { id: 'concern', label: '⚠ 우려 (평가로 확인할 점)', col: '#f59e0b', x: 406, y: 44, w: 384, h: 232, cols: 1, hdr: 28 }];
    const cards = shuffled(EVC.map((c) => c.id), 9).map((id) => { const c = EVC.find((x) => x.id === id); return { id, label: c.label, short: c.short, col: '#0ea5e9' }; });
    EV.so = selectable({ cards, boxes, cw, ch, kh: PHONE ? 30 : 40, tray: (i) => PHONE ? { x: 8, y: 346 + i * 46 } : { x: 10 + (i % 2) * 396, y: 318 + Math.floor(i / 2) * 56 }, onChange() { updateCtl(); } });
  }
  const evWrong = () => EV.so.cards.filter((c) => c.zone && c.zone !== EVC.find((x) => x.id === c.id).box);
  function evScene(dt, t) {
    EV.so.update(dt);
    T(14, 28, 'LMO의 이익과 우려를 근거 카드로 나눠요', PHONE ? 14.5 : 16.5, '#334155', 'left', 800);
    EV.so.drawBoxes();
    T(14, PHONE ? 338 : 306, '근거 카드 (끌어서 놓거나, 카드 → 칸 순서로 눌러요)', PHONE ? 12.5 : 13.5, '#64748b', 'left', 800);
    EV.so.drawCards();
  }
  const evPT = sorterPT(() => EV.so);

  /* =========================================================
     ② 안전성 평가 순서 + 브라질넛 사례 + 표시제 3 %
     ========================================================= */
  const EVAL4 = ['새로 만들어진 단백질이 무엇인지 확인', '알레르기를 일으킬 가능성 평가', '독성과 영양 성분을 기존 작물과 비교', '심사를 거쳐 재배 · 수입 승인'];
  function elBuild() {
    const w = PHONE ? 464 : 384, bh = PHONE ? 50 : 52, ch = PHONE ? 42 : 46;
    const boxes = EVAL4.map((s, i) => ({ id: String(i), label: (i + 1) + '번째', col: '#0ea5e9', x: PHONE ? 8 : 10, y: (PHONE ? 36 : 44) + i * (bh + 4), w, h: bh, cols: 1, hdr: 20, cap: 1, ly: 14, ls: 12.5 }));
    const cards = shuffled([0, 1, 2, 3], 3).map((i) => ({ id: String(i), label: EVAL4[i], col: '#16a34a' }));
    EL.so = selectable({ cards, boxes, cw: w, ch, kh: PHONE ? 26 : 30, tray: (i) => PHONE ? { x: 8, y: 266 + i * (ch + 4) } : { x: 406, y: 44 + i * (bh + 4) + 3 }, onChange() { updateCtl(); } });
  }
  const elWrong = () => EL.so.cards.filter((c) => c.zone && c.zone !== c.id);
  function nutRect() { return PHONE ? { x: 14, y: 70, w: 452, h: 330 } : { x: 120, y: 60, w: 560, h: 370 }; }
  function evalScene(dt, t) {
    EL.so.update(dt);
    T(14, 28, '안전성 평가는 어떤 순서로 할까?', PHONE ? 14.5 : 16.5, '#334155', 'left', 800);
    EL.so.drawBoxes();
    T(PHONE ? 14 : 406, PHONE ? 260 : 36, '평가 단계 카드', PHONE ? 12.5 : 13.5, '#64748b', 'left', 800);
    EL.so.drawCards();
    // 표시제: 100 g = 100칸(1 g 씩)
    const py = PHONE ? 462 : 292, ph = PHONE ? 172 : 256, px = PHONE ? 8 : 10, pw = VW - 2 * px;
    panel(px, py, pw, ph, 14);
    T(px + 14, py + 24, '표시제 예: 원료 100 g 중 섞여 들어간 LMO (1칸 = 1 g)', PHONE ? 12.5 : 14.5, '#334155', 'left', 800);
    const cs = PHONE ? 11 : 16, gx = px + 18, gy = py + (PHONE ? 38 : 44);
    for (let i = 0; i < 100; i++) {
      const cx = gx + (i % 10) * (cs + 2), cy = gy + Math.floor(i / 10) * (cs + 2), on = i < EL.lm;
      D.roundRect(cx, cy, cs, cs, 2.5); ctx.fillStyle = on ? '#ef4444' : '#d9f2c4'; ctx.fill();
    }
    const tx = gx + 10 * (cs + 2) + 20, ok = EL.lm <= 3;
    T(tx, gy + 22, 'LMO ' + EL.lm + ' g / 100 g = ' + EL.lm + ' %', PHONE ? 15 : 18, '#334155', 'left', 800);
    pill(tx, gy + (PHONE ? 52 : 60), EL.lm === 0 ? '혼입 없음' : ok ? '비의도적 혼입 3 % 이하: 표시 면제' : '3 %를 넘어요: 표시가 필요해요', { bg: EL.lm === 0 || ok ? '#16a34a' : '#dc2626', color: '#fff', size: PHONE ? 12.5 : 14, align: 'left' });
    textBlock(tx, gy + (PHONE ? 80 : 94), pw - (tx - px) - 14, '우리나라는 비의도적으로 섞여 든 양이 3 % 이하이면 표시를 면제해요. (교육용 요약)', PHONE ? 12.5 : 13.5, '#64748b', PHONE ? 17 : 20, 700);
    if (!PHONE) {
      const bx = px + pw - 190;
      D.roundRect(bx, py + ph - 70, 170, 52, 12); ctx.fillStyle = EL.seenNut ? '#fef3c7' : '#fff7ed'; ctx.fill(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke();
      E('🥜', bx + 26, py + ph - 44, 24); T(bx + 100, py + ph - 38, '브라질넛 사례', 14, '#92400e', 'center', 800);
      EL.nutBtn = { x: bx, y: py + ph - 70, w: 170, h: 52 };
    } else EL.nutBtn = null;
    if (EL.nut) {
      const r = nutRect();
      ctx.fillStyle = 'rgba(15,23,42,.35)'; ctx.fillRect(0, 0, VW, VH);
      panel(r.x, r.y, r.w, r.h, 18, '#fffdf5');
      E('🥜', r.x + 36, r.y + 38, 30);
      T(r.x + 66, r.y + 46, '브라질넛 사례 (평가 제도가 작동한 예)', PHONE ? 15 : 18, '#92400e', 'left', 800);
      const lines = [
        '브라질넛의 단백질 유전자를 콩에 넣어 영양 성분을 높이려는 시험을 했어요.',
        '브라질넛 알레르기가 있는 사람의 혈청이 이 콩의 새 단백질에 반응했어요.',
        '알레르기 가능성이 확인되어 이 콩은 개발이 중단됐어요.',
      ];
      let yy = r.y + 80;
      lines.forEach((ln, i) => { pill(r.x + 22, yy + 4, String(i + 1), { bg: '#f59e0b', color: '#fff', size: 13, pad: 6, align: 'left' }); const h = textBlock(r.x + 56, yy + 10, r.w - 80, ln, PHONE ? 14 : 15.5, '#334155', PHONE ? 20 : 23, 700); yy += h + 14; });
      textBlock(r.x + 22, yy + 8, r.w - 44, '➜ 안전성 평가가 시장에 나오기 전에 위험을 걸러 낸 사례예요. 모든 LMO가 알레르기를 일으킨다는 뜻이 아니에요.', PHONE ? 14 : 15.5, '#166534', PHONE ? 20 : 23, 800);
      T(r.x + r.w - 18, r.y + r.h - 16, '눌러서 닫기', 13, '#64748b', 'right', 800);
    }
  }
  function nutToggle(on) { EL.nut = on == null ? !EL.nut : on; if (EL.nut) EL.seenNut = true; Sound.click(); updateCtl(); }
  const evalSorterPT = sorterPT(() => EL.so);
  const evalPT = {
    down(p, e) {
      if (EL.nut) { nutToggle(false); return false; }
      if (EL.nutBtn && inRect(p.x, p.y, EL.nutBtn)) { nutToggle(true); return false; }
      return evalSorterPT.down(p, e);
    },
    move: (p) => evalSorterPT.move(p), up: (p) => evalSorterPT.up(p),
    hover(p) { if (EL.nutBtn && inRect(p.x, p.y, EL.nutBtn)) return 'pointer'; return evalSorterPT.hover(p); },
  };

  /* =========================================================
     ③ 저항성 진화 모의실험 (은신처 비율)
     ========================================================= */
  const R0 = 0.001, NGEN = 15, FS = [0, 20, 50], FCOL = { 0: '#ef4444', 20: '#f59e0b', 50: '#16a34a' };
  function rfW(f) { const q = f / 100; return { wr: (1 - q) * 1 + q * 0.9, ws: (1 - q) * 0.1 + q * 1.0 }; }
  function rfNext(R, f) { const w = rfW(f); return R * w.wr / (R * w.wr + (1 - R) * w.ws); }
  const RF = { f: 0, hist: { 0: [R0], 20: [R0], 50: [R0] }, cross: { 0: null, 20: null, 50: null }, going: false, acc: 0, perm: shuffled(Array.from({ length: 1000 }, (_, i) => i), 77) };
  function rfSetF(f) { RF.f = f; RF.going = false; Sound.click(); updateCtl(); }
  function rfRun() {
    const f = RF.f;
    if (RF.hist[f].length > 1) { RF.hist[f] = [R0]; RF.cross[f] = null; }
    RF.going = true; RF.acc = 0; Sound.click(); updateCtl();
  }
  function rfReset() { FS.forEach((f) => { RF.hist[f] = [R0]; RF.cross[f] = null; }); RF.going = false; Sound.click(); updateCtl(); }
  function rfStep() {
    const h = RF.hist[RF.f], n = h.length;
    if (n - 1 >= NGEN) { RF.going = false; updateCtl(); return; }
    const r = rfNext(h[n - 1], RF.f); h.push(r);
    if (RF.cross[RF.f] == null && r > 0.5) { RF.cross[RF.f] = n; Sound.success(); }
    if (h.length - 1 >= NGEN) RF.going = false;
    updateCtl();
  }
  function rfGeom() {
    if (PHONE) return { dots: { x: 8, y: 36, w: 464, h: 136 }, graph: { x: 8, y: 180, w: 464, h: 252 }, info: { x: 8, y: 440, w: 464, h: 194 } };
    return { dots: { x: 10, y: 40, w: 400, h: 190 }, graph: { x: 420, y: 40, w: 370, h: 300 }, info: { x: 10, y: 238, w: 400, h: 310 }, note: { x: 420, y: 348, w: 370, h: 200 } };
  }
  function refugeScene(dt, t) {
    const g = rfGeom(), f = RF.f, h = RF.hist[f];
    if (RF.going) { RF.acc += dt; if (RF.acc >= 0.32) { RF.acc -= 0.32; rfStep(); } }
    const R = h[h.length - 1], gen = h.length - 1, nRes = Math.round(R * 1000);
    // 해충 1000마리
    const d = g.dots; panel(d.x, d.y, d.w, d.h, 14);
    T(d.x + 14, d.y + 22, '해충 집단 1000마리 (모형) · ' + gen + '세대', PHONE ? 13 : 14.5, '#334155', 'left', 800);
    const cols = 50, rows = 20, sx = (d.w - 28) / cols, sy = (d.h - 62) / rows, rr = Math.min(sx, sy) * 0.4;
    for (let i = 0; i < 1000; i++) {
      const isRes = RF.perm[i] < nRes, cx = d.x + 14 + (i % cols + 0.5) * sx, cy = d.y + 34 + (Math.floor(i / cols) + 0.5) * sy;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fillStyle = isRes ? '#dc2626' : '#a3c96b'; ctx.fill();
    }
    T(d.x + 14, d.y + d.h - 8, '● 저항성 ' + nRes + '마리  ● 감수성 ' + (1000 - nRes) + '마리   R = ' + R.toFixed(3), PHONE ? 12.5 : 13.5, '#475569', 'left', 800);
    // 그래프
    const q = g.graph; panel(q.x, q.y, q.w, q.h, 14);
    const pl = { x: q.x + 46, y: q.y + 34, w: q.w - 66, h: q.h - 84 };
    T(q.x + 14, q.y + 22, '저항성 개체 비율 R 의 변화', 14, '#334155', 'left', 800);
    const xo = (n) => pl.x + pl.w * n / NGEN, yo = (v) => pl.y + pl.h * (1 - v);
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => { ctx.strokeStyle = v === 0.5 ? '#f87171' : '#e2e8f0'; ctx.lineWidth = v === 0.5 ? 2 : 1; if (v === 0.5) ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(pl.x, yo(v)); ctx.lineTo(pl.x + pl.w, yo(v)); ctx.stroke(); ctx.setLineDash([]); T(pl.x - 6, yo(v) + 4.5, v === 0 ? '0' : v === 1 ? '1' : String(v), 12.5, '#64748b', 'right', 700); });
    [0, 3, 6, 9, 12, 15].forEach((n) => T(xo(n), pl.y + pl.h + 18, String(n), 12.5, '#64748b', 'center', 700));
    T(pl.x + pl.w / 2, pl.y + pl.h + 38, '세대', 13, '#475569', 'center', 800);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pl.x, pl.y); ctx.lineTo(pl.x, pl.y + pl.h); ctx.lineTo(pl.x + pl.w, pl.y + pl.h); ctx.stroke();
    FS.forEach((ff) => {
      const hh = RF.hist[ff]; if (hh.length < 2 && ff !== f) return;
      ctx.strokeStyle = FCOL[ff]; ctx.lineWidth = ff === f ? 4 : 3; ctx.lineCap = 'round'; ctx.globalAlpha = ff === f ? 1 : 0.7; ctx.beginPath();
      hh.forEach((v, n) => { if (n) ctx.lineTo(xo(n), yo(v)); else ctx.moveTo(xo(n), yo(v)); }); ctx.stroke(); ctx.globalAlpha = 1;
      const last = hh.length - 1; D.sphere(xo(last), yo(hh[last]), ff === f ? 6 : 4.5, FCOL[ff], { gloss: false, outline: '#fff', outlineWidth: 1.5 });
      if (RF.cross[ff] != null) { const n = RF.cross[ff]; pill(xo(n), yo(hh[n]) + (ff === 20 ? 22 : ff === 50 ? 0 : -18) + (ff === 50 ? 22 : 0), n + '세대', { bg: FCOL[ff], color: '#fff', size: 12, pad: 5 }); }
    });
    pill(pl.x + 8, pl.y + 10, 'R = 0.5', { bg: '#fee2e2', color: '#b91c1c', size: 12, pad: 5, align: 'left' });
    FS.forEach((ff, i) => { const lx = q.x + 14 + i * 100; ctx.fillStyle = FCOL[ff]; ctx.fillRect(lx, q.y + q.h - 22, 18, 5); T(lx + 24, q.y + q.h - 15, '은신처 ' + ff + ' %', 12.5, '#475569', 'left', 800); });
    // 계산 정보
    const w = rfW(f), inf = g.info; panel(inf.x, inf.y, inf.w, inf.h, 14);
    T(inf.x + 14, inf.y + 24, '은신처 ' + f + ' %: 평균 생존 상대값', 14.5, '#334155', 'left', 800);
    const q1 = 1 - f / 100;
    const rows2 = [
      ['저항성 개체 wR', '(1 ' + MINUS + ' ' + (f / 100) + ') × 1 + ' + (f / 100) + ' × 0.9', w.wr.toFixed(2)],
      ['감수성 개체 wS', '(1 ' + MINUS + ' ' + (f / 100) + ') × 0.1 + ' + (f / 100) + ' × 1.0', w.ws.toFixed(2)],
    ];
    rows2.forEach((r, i) => {
      const y = inf.y + 48 + i * (PHONE ? 38 : 46);
      T(inf.x + 14, y + 4, r[0], PHONE ? 13 : 14, '#475569', 'left', 800);
      TF(inf.x + 14, y + 24, r[1] + ' = ' + r[2], inf.w - 28, PHONE ? 13 : 14.5, 11, i ? '#15803d' : '#b91c1c', 'left', 800);
    });
    const ratio = w.wr / w.ws;
    textBlock(inf.x + 14, inf.y + (PHONE ? 130 : 148), inf.w - 28, '한 세대마다 저항성 대 감수성의 비가 약 ' + ratio.toFixed(1) + '배로 커져요 (wR / wS = ' + w.wr.toFixed(2) + ' / ' + w.ws.toFixed(2) + ').', PHONE ? 13 : 14, '#475569', PHONE ? 18 : 21, 700);
    if (!PHONE) {
      textBlock(inf.x + 14, inf.y + 196, inf.w - 28, '다음 세대 R′ = R·wR / (R·wR + (1 ' + MINUS + ' R)·wS)', 14, '#334155', 21, 800);
      FS.forEach((ff, i) => { const y = inf.y + 238 + i * 24; T(inf.x + 14, y, '은신처 ' + ff + ' %', 14, FCOL[ff], 'left', 800); T(inf.x + 130, y, RF.cross[ff] == null ? 'R > 0.5 가 되는 세대: 아직 몰라요' : 'R > 0.5 가 되는 세대: ' + RF.cross[ff] + '세대', 14, RF.cross[ff] == null ? '#94a3b8' : '#334155', 'left', 800); });
      const n = g.note; panel(n.x, n.y, n.w, n.h, 14);
      T(n.x + 14, n.y + 26, '🔎 읽어 보세요', 15, '#334155', 'left', 800);
      textBlock(n.x + 14, n.y + 52, n.w - 28, 'Bt 구역에서는 저항성 개체가 유리하고(wR = 1, wS = 0.1), 일반 작물 은신처에서는 감수성 개체가 더 잘 살아남아요(wR = 0.9, wS = 1.0). 은신처가 넓을수록 저항성이 퍼지는 속도가 어떻게 달라지는지 비교해 봐요.', 14, '#475569', 21, 700);
    } else {
      FS.forEach((ff, i) => { const y = inf.y + 168 + i * 22; T(inf.x + 14, y, '은신처 ' + ff + ' % → ' + (RF.cross[ff] == null ? '아직' : RF.cross[ff] + '세대'), 13.5, FCOL[ff], 'left', 800); });
    }
  }

  /* =========================================================
     ③ 꽃가루 이동: 교잡률(%) = 5 × e^(−d/20 m)
     ========================================================= */
  const PL = { d: 0, parts: [], acc: 0 };
  const polRate = (d) => 5 * Math.exp(-d / 20);
  const fmtRate = (v) => (v >= 0.1 ? v.toFixed(1) : v.toFixed(2));
  function plGeom() {
    if (PHONE) return { scene: { x: 8, y: 36, w: 464, h: 250 }, graph: { x: 8, y: 294, w: 464, h: 300 } };
    return { scene: { x: 10, y: 40, w: 780, h: 224 }, graph: { x: 10, y: 272, w: 780, h: 276 } };
  }
  function pollenScene(dt, t) {
    const g = plGeom(), s = g.scene; panel(s.x, s.y, s.w, s.h, 14);
    T(s.x + 14, s.y + 24, '🌬️ 바람 → ', 14.5, '#334155', 'left', 800);
    const fx = s.x + 24, fw = 90, nx0 = fx + fw + 24, mpm = (s.w - 24 - fw - 24 - 110) / 120;   // 1 m 당 픽셀
    const nx = nx0 + PL.d * mpm, gy = s.y + s.h - 40;
    ctx.fillStyle = '#e8d8b8'; ctx.fillRect(s.x + 10, gy + 6, s.w - 20, 22);
    // 두 밭
    [[fx, fw, '#16a34a', 'LMO 밭'], [nx, 110, '#84cc16', '이웃 일반 밭']].forEach(([x, w, col, lab], k) => {
      for (let i = 0; i < 5; i++) { const px = x + 10 + i * (w - 20) / 4; ctx.strokeStyle = C.shade(col, -0.3); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px, gy + 6); ctx.lineTo(px, gy - 58 - (i % 2) * 10); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(px + 8, gy - 30, 14, 5, -0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(px - 8, gy - 44, 14, 5, 0.5, 0, TAU); ctx.fill(); }
      pill(x + w / 2, gy + 46 - (PHONE ? 0 : 6), lab, { bg: col, color: '#fff', size: 12.5, pad: 7 });
    });
    // 거리 표시
    D.arrow(fx + fw, gy - 80, nx, gy - 80, { color: '#334155', width: 2.5, head: 9 });
    pill((fx + fw + nx) / 2, gy - 94, '거리 d = ' + PL.d + ' m', { bg: '#334155', color: '#fff', size: 13, pad: 7 });
    // 꽃가루 입자: 거리가 멀수록 옅어져요 (알파 = e^(-x/20m))
    PL.acc += dt; while (PL.acc > 0.06) { PL.acc -= 0.06; if (PL.parts.length < 90) PL.parts.push({ x: fx + 20 + Math.random() * 60, y: gy - 60 + Math.random() * 20, vx: 40 + Math.random() * 40, vy: -8 - Math.random() * 10, life: 0 }); }
    PL.parts = PL.parts.filter((p) => { p.life += dt; p.x += p.vx * dt * (RM ? 0 : 1) * 1.6; p.y += Math.sin(p.life * 5 + p.x) * 0.3 + p.vy * dt * 0.2; const dm = (p.x - (fx + fw)) / mpm; return p.x < s.x + s.w - 14 && dm < 130; });
    PL.parts.forEach((p) => { const dm = Math.max(0, (p.x - (fx + fw)) / mpm); ctx.globalAlpha = clamp(Math.exp(-dm / 20) * 0.95, 0.04, 0.95); D.sphere(p.x, p.y, 3.4, '#f59e0b', { gloss: false }); ctx.globalAlpha = 1; });
    // 그래프
    const q = g.graph; panel(q.x, q.y, q.w, q.h, 14);
    const pl = { x: q.x + 56, y: q.y + 40, w: q.w - (PHONE ? 90 : 250), h: q.h - 92 };
    T(q.x + 14, q.y + 24, '꽃가루 교잡률(%) = 5 × e^(−d / 20 m)', PHONE ? 13 : 14.5, '#334155', 'left', 800);
    const xo = (d) => pl.x + pl.w * d / 120, yo = (v) => pl.y + pl.h * (1 - v / 5);
    [0, 1, 2, 3, 4, 5].forEach((v) => { ctx.strokeStyle = v === 0.5 ? '#f87171' : '#eef2f7'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pl.x, yo(v)); ctx.lineTo(pl.x + pl.w, yo(v)); ctx.stroke(); T(pl.x - 6, yo(v) + 4.5, String(v), 12.5, '#64748b', 'right', 700); });
    ctx.strokeStyle = '#f87171'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(pl.x, yo(0.5)); ctx.lineTo(pl.x + pl.w, yo(0.5)); ctx.stroke(); ctx.setLineDash([]);
    T(pl.x + pl.w - 4, yo(0.5) - 6, '0.5 %', 12.5, '#b91c1c', 'right', 800);
    for (let d = 0; d <= 120; d += 20) T(xo(d), pl.y + pl.h + 18, String(d), 12.5, '#64748b', 'center', 700);
    T(pl.x + pl.w / 2, pl.y + pl.h + 38, '이웃 밭까지의 거리 (m)', 13, '#475569', 'center', 800);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pl.x, pl.y); ctx.lineTo(pl.x, pl.y + pl.h); ctx.lineTo(pl.x + pl.w, pl.y + pl.h); ctx.stroke();
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 4; ctx.beginPath(); for (let d = 0; d <= 120; d += 2) { const x = xo(d), y = yo(polRate(d)); if (d) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    const cx = xo(PL.d), cy = yo(polRate(PL.d));
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, pl.y + pl.h); ctx.lineTo(cx, cy); ctx.lineTo(pl.x, cy); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(cx, cy, 8, '#16a34a', { outline: '#fff', outlineWidth: 2 });
    // 읽는 값
    const rx = PHONE ? q.x + 14 : q.x + q.w - 214, ry = PHONE ? q.y + q.h - 38 : q.y + 56;
    if (PHONE) T(rx, ry, 'd = ' + PL.d + ' m → 교잡률 ' + fmtRate(polRate(PL.d)) + ' %', 15, '#334155', 'left', 800);
    else {
      T(rx, ry, '이웃 밭까지 ' + PL.d + ' m', 15, '#334155', 'left', 800);
      T(rx, ry + 36, fmtRate(polRate(PL.d)) + ' %', 34, polRate(PL.d) < 0.5 ? '#15803d' : '#b45309', 'left', 800);
      T(rx, ry + 60, '꽃가루 교잡률', 13.5, '#64748b', 'left', 800);
      [[0, 5], [20, 1.8], [50, 0.4], [100, 0.03]].forEach((r, i) => T(rx, ry + 92 + i * 22, r[0] + ' m → ' + fmtRate(polRate(r[0])) + ' %', 13.5, PL.d === r[0] ? '#334155' : '#94a3b8', 'left', 800));
    }
  }

  /* =========================================================
     ③ 생태 카드: 뒤집어 읽기
     ========================================================= */
  const ECO = [
    { id: 'e1', icon: '🦋', title: '비표적 곤충', body: 'Bt 독소는 특정 곤충의 장 세포 수용체에 결합해서 작용해요. 해충이 아닌 곤충이 같은 수용체를 가졌는지, 꽃가루나 잎을 통해 노출되는지를 종마다 평가해야 해요.' },
    { id: 'e2', icon: '🐞', title: '천적과 먹이 그물', body: '해충이 줄어들면 해충을 먹고 사는 천적의 먹이도 달라질 수 있어요. 살충제를 덜 쓰는 효과와 먹이 그물의 변화를 함께 살펴봐요.' },
    { id: 'e3', icon: '🌿', title: '제초제 내성 → 내성 잡초', body: '제초제 내성 작물에 같은 제초제를 계속 쓰면, 그 제초제를 견디는 잡초가 살아남아 늘어날 수 있어요. 자연선택으로 내성이 퍼지는 거예요.' },
  ];
  const EC = { flip: ECO.map(() => 0), want: ECO.map(() => 0), seen: ECO.map(() => false), hits: [] };
  function ecRect(i) { return PHONE ? { x: 8, y: 38 + i * 198, w: 464, h: 190 } : { x: 14 + i * 262, y: 60, w: 250, h: 440 }; }
  function ecoScene(dt, t) {
    T(14, 28, '생태계에 미칠 수 있는 영향 카드 (눌러서 뒤집어요)', PHONE ? 14.5 : 16.5, '#334155', 'left', 800);
    EC.hits = [];
    ECO.forEach((c, i) => {
      EC.flip[i] = RM ? EC.want[i] : approach(EC.flip[i], EC.want[i], dt, 9);
      const r = ecRect(i), f = EC.flip[i], sx = Math.max(0.04, Math.abs(Math.cos(f * Math.PI))), back = f > 0.5;
      ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(sx, 1);
      D.shadow(() => { D.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 18); ctx.fillStyle = back ? '#fffdf5' : '#ecfdf5'; ctx.fill(); }, { blur: 9, y: 3 });
      ctx.strokeStyle = back ? '#f59e0b' : '#16a34a'; ctx.lineWidth = 3; D.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 18); ctx.stroke();
      ctx.restore();
      if (sx > 0.35) {
        ctx.save(); ctx.translate(r.x + r.w / 2, 0); ctx.scale(sx, 1); ctx.translate(-(r.x + r.w / 2), 0);
        if (!back) { E(c.icon, r.x + r.w / 2, r.y + (PHONE ? 70 : 170), PHONE ? 64 : 90); T(r.x + r.w / 2, r.y + r.h - (PHONE ? 36 : 70), c.title, PHONE ? 19 : 21, '#166534', 'center', 800); T(r.x + r.w / 2, r.y + r.h - (PHONE ? 12 : 36), '눌러서 읽기', 13, '#64748b', 'center', 700); }
        else { T(r.x + 16, r.y + 30, c.icon + ' ' + c.title, 17, '#92400e', 'left', 800); textFit(r.x + 16, r.y + 46, r.w - 32, r.h - 60, c.body, PHONE ? 14.5 : 16, 12, '#334155', 700); }
        ctx.restore();
      }
      if (EC.seen[i]) D.sphere(r.x + r.w - 20, r.y + 20, 11, '#16a34a', { text: '✓', textScale: 1.1, outline: '#fff', outlineWidth: 2 });
      EC.hits.push(Object.assign({ i }, r));
    });
  }
  const ecoPT = {
    down(p) { for (const r of EC.hits) if (inRect(p.x, p.y, r)) { EC.want[r.i] = EC.want[r.i] ? 0 : 1; if (EC.want[r.i]) EC.seen[r.i] = true; Sound.tick(); updateCtl(); return false; } return false; },
    hover(p) { return EC.hits.some((r) => inRect(p.x, p.y, r)) ? 'pointer' : 'default'; },
  };

  /* =========================================================
     ④ 종합 영향 표: 사례 3 × (이익 · 인간 건강 · 생태계 · 완화 방안) + 추론 문장
     ========================================================= */
  const TROWS = [{ id: 'bt', name: 'Bt 목화', icon: '🌿' }, { id: 'gr', name: '황금쌀', icon: '🍚' }, { id: 'sm', name: '형질 전환 연어', icon: '🐟' }];
  const TCOLS = ['이익', '인간 건강', '생태계', '완화 방안'];
  /* [행][열] = { t: 전체 문장, s: 짧은 말, st: 'fact' | 'unc' | null } */
  const TS = [
    [
      { t: '목화 해충 피해가 줄고, 그 해충용 살충제를 뿌리는 횟수를 줄일 수 있어요.', s: '해충 피해 · 살충제 감소', st: null },
      { t: 'Bt 독소는 곤충 장 세포의 수용체에 결합해 작용하는데, 사람 장에는 이 수용체가 없다고 평가돼요.', s: '사람 장에는 수용체 없음', st: 'fact' },
      { t: 'Bt 작물만 계속 심으면 Bt에 저항성을 가진 해충이 늘 수 있어요. 모의실험에서도 이런 경향을 봤어요.', s: '저항성 해충 증가 가능', st: 'fact' },
      { t: '일반 작물 은신처를 함께 심고, 저항성 해충이 늘어나는지 계속 감시해요.', s: '은신처 + 감시', st: null },
    ],
    [
      { t: '쌀알에 β-카로틴이 쌓여, 비타민 A가 부족한 지역의 영양 개선에 도움을 줄 수 있어요.', s: 'β-카로틴 → 비타민 A', st: null },
      { t: '식단과 섭취량에 따라 실제로 비타민 A 결핍을 얼마나 줄이는지는 아직 불확실해요.', s: '실제 효과의 크기 불확실', st: 'unc' },
      { t: '벼는 가까운 야생 벼와 꽃가루로 교잡할 수 있어서, 재배지 주변의 유전자 이동을 관리해야 해요.', s: '야생 벼와 교잡 가능', st: 'fact' },
      { t: '승인 전에 안전성과 환경 평가를 거치고, 재배지 가까이에서 교잡이 일어나는지 감시해요.', s: '평가 + 격리 · 감시', st: null },
    ],
    [
      { t: '성장 호르몬 유전자를 도입해 더 빨리 자라서, 양식에 드는 시간을 줄일 수 있어요.', s: '빨리 자라 양식 단축', st: null },
      { t: '식품으로서 알레르기 · 영양 성분은 평가하지만, 오랫동안 먹었을 때의 영향 자료는 제한적이에요.', s: '장기 섭취 자료 제한', st: 'unc' },
      { t: '양식장에서 탈출한 연어가 야생 연어와 교잡하면 야생 집단에 영향을 줄 수 있어요. 실제 영향의 크기는 아직 불확실해요.', s: '탈출 · 교잡 영향 불확실', st: 'unc' },
      { t: '불임 암컷만 육상의 격리 시설에서 길러, 탈출하거나 교잡할 가능성을 줄여요.', s: '불임 암컷 · 격리 시설', st: null },
    ],
  ];
  const CONCL = [
    { t: '이익이 있어도 인간 건강과 생태계에 불확실한 부분이 남아 있으므로, 사례마다 근거를 평가하고 계속 감시하는 제도가 필요하다.', s: '사례별 평가 · 감시가 필요' },
    { t: 'LMO는 모두 안전하다고 확인되었으므로 따로 평가하지 않아도 된다.', s: '모두 안전: 평가 불필요' },
    { t: 'LMO는 모두 위험하다고 확인되었으므로 어떤 경우에도 만들어서는 안 된다.', s: '모두 위험: 전면 금지' },
  ];
  const TB = { sel: [0, 0], pick: TROWS.map(() => TCOLS.map(() => -1)), stat: TROWS.map(() => TCOLS.map(() => null)), concl: -1, hits: [], res: null, shake: {} };
  /* 칸 (r, c) 의 보기 세 개: 정답 하나 + 같은 열의 다른 사례 두 개 */
  function tbOptions(r, c) {
    const ans = (r * 4 + c) % 3, others = [(r + 1) % 3, (r + 2) % 3], out = []; let o = 0;
    for (let k = 0; k < 3; k++) out.push(k === ans ? TS[r][c] : TS[others[o++]][c]);
    return { opts: out, ans };
  }
  const tbOK = (r, c) => TB.pick[r][c] === tbOptions(r, c).ans && (TS[r][c].st == null || TB.stat[r][c] === TS[r][c].st);
  const tbFilled = () => { let n = TB.concl >= 0 ? 1 : 0; TB.pick.forEach((row) => row.forEach((p) => { if (p >= 0) n++; })); return n; };
  function tbSelect(r, c) { TB.sel = [r, c]; Sound.tick(); updateCtl(); }
  function tbPick(i) {
    const [r, c] = TB.sel;
    if (r === 3) { TB.concl = i; } else { TB.pick[r][c] = i; if (TS[r][c].st == null) TB.stat[r][c] = null; }
    TB.res = null; Sound.tick(); updateCtl();
  }
  function tbStat(v) { const [r, c] = TB.sel; if (r === 3 || TS[r][c].st == null) return; TB.stat[r][c] = v; TB.res = null; Sound.tick(); updateCtl(); }
  function tbGeom(r, c) {
    if (PHONE) {
      if (r === 3) return { x: 8, y: 580, w: 464, h: 52 };
      return { x: 8 + (c % 2) * 232, y: 36 + r * 181 + 28 + Math.floor(c / 2) * 73, w: 228, h: 69 };
    }
    if (r === 3) return { x: 10, y: 446, w: 780, h: 102 };
    return { x: 118 + c * 170, y: 74 + r * 124, w: 164, h: 118 };
  }
  function tableScene(dt, t) {
    T(14, 26, '사례마다 이익 · 위험 · 완화 방안을 채우고, 근거가 확인된 사실인지 표시해요', PHONE ? 12.5 : 15, '#334155', 'left', 800);
    TB.hits = [];
    if (!PHONE) TCOLS.forEach((nm, c) => { const g = tbGeom(0, c); pill(g.x + g.w / 2, 56, nm, { bg: ['#16a34a', '#0ea5e9', '#14b8a6', '#8b5cf6'][c], color: '#fff', size: 13.5, pad: 9 }); });
    TROWS.forEach((row, r) => {
      if (PHONE) { const y0 = 36 + r * 181; panel(8, y0, 464, 176, 14); T(20, y0 + 20, row.icon + ' ' + row.name, 15, '#334155', 'left', 800); }
      else { const g0 = tbGeom(r, 0); E(row.icon, 40, g0.y + 40, 30); TF(64, g0.y + 78, row.name, 100, 14.5, 11.5, '#334155', 'center', 800, { }); }
      TCOLS.forEach((nm, c) => {
        const g = tbGeom(r, c), sel = TB.sel[0] === r && TB.sel[1] === c, p = TB.pick[r][c], st = TB.stat[r][c], res = TB.res ? TB.res[r][c] : null;
        const col = ['#16a34a', '#0ea5e9', '#14b8a6', '#8b5cf6'][c];
        TB.shake[r + ',' + c] = Math.max(0, (TB.shake[r + ',' + c] || 0) - dt * 3);
        const sh = TB.shake[r + ',' + c] > 0 && !RM ? Math.sin(clock * 60) * 3 * TB.shake[r + ',' + c] : 0;
        ctx.save(); ctx.translate(sh, 0);
        D.shadow(() => { D.roundRect(g.x, g.y, g.w, g.h, 12); ctx.fillStyle = res === 'ok' ? '#effaf1' : res === 'bad' ? '#fdeceb' : sel ? '#fff8dc' : '#fff'; ctx.fill(); }, { blur: sel ? 9 : 4, y: 2 });
        ctx.strokeStyle = res === 'ok' ? '#16a34a' : res === 'bad' ? '#e2464b' : sel ? '#f59e0b' : '#cbd5e1'; ctx.lineWidth = sel || res ? 3 : 2; D.roundRect(g.x, g.y, g.w, g.h, 12); ctx.stroke();
        if (PHONE) T(g.x + 8, g.y + 15, nm, 12, col, 'left', 800);
        if (p < 0) T(g.x + g.w / 2, g.y + g.h / 2 + (PHONE ? 8 : 5), '+ 눌러서 고르기', PHONE ? 12.5 : 13.5, '#94a3b8', 'center', 800);
        else {
          const o = tbOptions(r, c).opts[p];
          textFit(g.x + 8, g.y + (PHONE ? 22 : 10), g.w - 16, g.h - (PHONE ? 46 : 42), o.s, PHONE ? 13.5 : 14.5, 11, '#334155', 800);
          if (TS[r][c].st != null) pill(g.x + 8, g.y + g.h - 15, st === 'fact' ? '✔ 확인된 사실' : st === 'unc' ? '❔ 아직 불확실' : '근거 표시 필요', { bg: st === 'fact' ? '#16a34a' : st === 'unc' ? '#d97706' : '#94a3b8', color: '#fff', size: 12, pad: 6, align: 'left' });
        }
        ctx.restore();
        TB.hits.push({ r, c, x: g.x, y: g.y, w: g.w, h: g.h });
      });
    });
    const g = tbGeom(3, 0), sel = TB.sel[0] === 3;
    D.shadow(() => { D.roundRect(g.x, g.y, g.w, g.h, 14); ctx.fillStyle = TB.res && TB.res[3] === 'ok' ? '#effaf1' : TB.res && TB.res[3] === 'bad' ? '#fdeceb' : sel ? '#fff8dc' : '#fff'; ctx.fill(); }, { blur: sel ? 9 : 4, y: 2 });
    ctx.strokeStyle = sel ? '#f59e0b' : '#cbd5e1'; ctx.lineWidth = sel ? 3 : 2; D.roundRect(g.x, g.y, g.w, g.h, 14); ctx.stroke();
    T(g.x + 14, g.y + 22, '💡 한 문장 추론: “…이므로 …가 필요하다”', PHONE ? 12.5 : 15, '#334155', 'left', 800);
    if (TB.concl < 0) T(g.x + 14, g.y + (PHONE ? 42 : 56), '+ 눌러서 문장 고르기', PHONE ? 12.5 : 14, '#94a3b8', 'left', 800);
    else textFit(g.x + 14, g.y + (PHONE ? 26 : 34), g.w - 28, g.h - (PHONE ? 30 : 40), CONCL[TB.concl].t, PHONE ? 12.5 : 15, 11, '#334155', 700);
    TB.hits.push({ r: 3, c: 0, x: g.x, y: g.y, w: g.w, h: g.h });
  }
  const tablePT = {
    down(p) { for (const r of TB.hits) if (inRect(p.x, p.y, r)) { tbSelect(r.r, r.c); return false; } return false; },
    hover(p) { return TB.hits.some((r) => inRect(p.x, p.y, r)) ? 'pointer' : 'default'; },
  };
  function tbCheckAll() {
    const res = TROWS.map((_, r) => TCOLS.map((__, c) => (TB.pick[r][c] < 0 ? 'empty' : tbOK(r, c) ? 'ok' : 'bad')));
    res.push([]); res[3] = TB.concl < 0 ? 'empty' : TB.concl === 0 ? 'ok' : 'bad';
    return res;
  }

  /* =========================================================
     화면 전환 · 조작 연결
     ========================================================= */
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; hideHint();
    if (m !== 'eval') EL.nut = false;
    PT = m === 'make' ? makePT : m === 'order' ? orderPT : m === 'ev' ? evPT : m === 'eval' ? evalPT : m === 'eco' ? ecoPT : m === 'table' ? tablePT : null;
    updateCtl();
  }
  function tbOptsHTML() {
    const [r, c] = TB.sel;
    if (r === 3) return CONCL.map((o, i) => '<button type="button" class="mc' + (TB.concl === i ? ' on' : '') + '" data-v="' + i + '">' + o.t + '</button>').join('');
    return tbOptions(r, c).opts.map((o, i) => '<button type="button" class="mc' + (TB.pick[r][c] === i ? ' on' : '') + '" data-v="' + i + '">' + o.t + '</button>').join('');
  }
  function updateCtl() {
    const fr0 = game ? game.free : false, lvNow = game ? game.level : 0;
    ctlNodes.forEach((n) => { n.hidden = (n.dataset.modes || '').split(' ').indexOf(S.mode) < 0; });
    modeBtns(S.mode, lvNow, fr0);
    // 만들기
    chipOn($('#mkPages'), MK.page); $('#mkDish').hidden = MK.page !== 4;
    $('#mkPrev').disabled = MK.page === 0; $('#mkNext').disabled = MK.page === 5;
    $('#dsGo').disabled = DS.regen; $('#dsMed').disabled = DS.med;
    $('#mkNote').textContent = MK.page === 4 ? (DS.regen ? '재생을 시작했어요.' : DS.med ? '살아남은 세포를 모두 눌러 고른 뒤 재생을 시작해요. (고른 세포 ' + DS.cells.filter((c) => c.pick).length + '개)' : '세포는 모두 같아 보여요. 선택 배지를 넣어 보세요.') : '◀ ▶ 단추로 단계를 넘기며 장면을 살펴봐요.';
    const odN = OD.so ? OD.so.placed : 0, evN = EV.so ? EV.so.placed : 0, elN = EL.so ? EL.so.placed : 0;
    $('#odMade').innerHTML = '<li class="' + (odN === 5 ? 'on' : '') + '">' + mark(odN === 5) + ' 놓은 카드 ' + odN + ' / 5</li>';
    $('#evMade').innerHTML = '<li class="' + (evN === 6 ? 'on' : '') + '">' + mark(evN === 6) + ' 놓은 카드 ' + evN + ' / 6</li>';
    $('#elMade').innerHTML = '<li class="' + (elN === 4 ? 'on' : '') + '">' + mark(elN === 4) + ' 평가 순서 카드 ' + elN + ' / 4</li><li class="' + (EL.seenNut ? 'on' : '') + '">' + mark(EL.seenNut) + ' 브라질넛 사례 읽기</li><li class="' + (EL.lmMax >= 4 ? 'on' : '') + '">' + mark(EL.lmMax >= 4) + ' 표시제 3 % 경계 확인(4 g 이상까지)</li>';
    $('#oLm').textContent = EL.lm + ' g';
    $('#elNote').textContent = EL.lm <= 3 ? '3 g 이하(3 % 이하)이면 비의도적 혼입으로 보아 표시를 면제해요.' : '3 %를 넘어서 표시가 필요해요.';
    chipOn($('#rfF'), RF.f);
    $('#rfRun').disabled = RF.going;
    $('#rfMade').innerHTML = FS.map((f) => '<li class="' + (RF.cross[f] != null ? 'on' : '') + '">' + mark(RF.cross[f] != null) + ' 은신처 ' + f + ' %: ' + (RF.cross[f] != null ? RF.cross[f] + '세대에 R > 0.5' : '아직') + '</li>').join('');
    $('#oDist').textContent = PL.d + ' m';
    $('#plMade').innerHTML = '<li class="' + (polRate(PL.d) < 0.5 ? 'on' : '') + '">' + mark(polRate(PL.d) < 0.5) + ' ' + PL.d + ' m: 교잡률 ' + fmtRate(polRate(PL.d)) + ' % (0.5 % ' + (polRate(PL.d) < 0.5 ? '미만' : '이상') + ')</li>';
    $('#ecMade').innerHTML = ECO.map((c, i) => '<li class="' + (EC.seen[i] ? 'on' : '') + '">' + mark(EC.seen[i]) + ' ' + c.icon + ' ' + c.title + '</li>').join('');
    // 표
    const [r, c] = TB.sel;
    $('#tbHead').textContent = r === 3 ? '💡 한 문장 추론 고르기' : '📋 ' + TROWS[r].name + ' · ' + TCOLS[c];
    const html = tbOptsHTML(), box = $('#tbOpts');
    if (box.dataset.k !== html) { box.innerHTML = html; box.dataset.k = html; $$('#tbOpts button').forEach((b) => b.addEventListener('click', () => tbPick(+b.dataset.v))); }
    const needSt = r !== 3 && TS[r][c].st != null && TB.pick[r][c] >= 0;
    $('#tbSt').hidden = !needSt; $('#tbStT').hidden = !needSt;
    $('#tbStT').textContent = '이 내용은 근거가 있는 사실인가요, 아직 불확실한가요?';
    chipOn($('#tbSt'), r === 3 ? null : TB.stat[r][c]);
    $('#tbMade').innerHTML = '<li class="' + (tbFilled() === 13 ? 'on' : '') + '">' + mark(tbFilled() === 13) + ' 채운 칸 ' + tbFilled() + ' / 13</li>';
  }
  bindModes(setMode);
  $('#mkPrev').addEventListener('click', () => mkGo(MK.page - 1));
  $('#mkNext').addEventListener('click', () => mkGo(MK.page + 1));
  $$('#mkPages button').forEach((b) => b.addEventListener('click', () => mkGo(+b.dataset.v)));
  $('#dsMed').addEventListener('click', dsMedium);
  $('#dsGo').addEventListener('click', dsRegen);
  $('#dsReset').addEventListener('click', () => { Sound.click(); dsReset(); });
  $('#odReset').addEventListener('click', () => { Sound.click(); OD.so.reset(); });
  $('#evReset').addEventListener('click', () => { Sound.click(); EV.so.reset(); });
  $('#elReset').addEventListener('click', () => { Sound.click(); EL.so.reset(); });
  $('#elNut').addEventListener('click', () => nutToggle(true));
  SciSim.bindRange($('#sLm'), $('#oLm'), (v) => v + ' g', (v) => { EL.lm = v; EL.lmMax = Math.max(EL.lmMax, v); updateCtl(); });
  $$('#rfF button').forEach((b) => b.addEventListener('click', () => rfSetF(+b.dataset.v)));
  $('#rfRun').addEventListener('click', rfRun);
  $('#rfReset').addEventListener('click', rfReset);
  SciSim.bindRange($('#sDist'), $('#oDist'), (v) => v + ' m', (v) => { PL.d = v; updateCtl(); });
  $$('#tbSt button').forEach((b) => b.addEventListener('click', () => tbStat(b.dataset.v)));
  $('#tbReset').addEventListener('click', () => { Sound.click(); TB.pick = TROWS.map(() => TCOLS.map(() => -1)); TB.stat = TROWS.map(() => TCOLS.map(() => null)); TB.concl = -1; TB.res = null; updateCtl(); });
  odBuild(); evBuild(); elBuild(); dsReset();

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: 'LMO 만들기', short: 'LMO 만들기', icon: '🧬', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 다른 생물의 유전자를 넣은 작물은 사람과 생태계에 어떤 이익과 위험을 줄까?</p><p>🔗 <b>앞 차시들</b>에서 재조합 DNA(제한 효소 · 연결 효소 · 벡터)와 <b>유전 부호의 보편성</b>을 배웠어요. 이제 이 기술을 <b>식물</b>에 적용해 봐요.</p><p><b>유전자 변형 생물체(LMO, 살아 있는 유전자 변형 생물체)</b>는 현대 생명공학(유전자 재조합 등)으로 유전 물질을 바꾼 생물 중에서 <b>번식하거나 증식할 수 있는</b> 것을 말해요. 전통 육종과 달리 다른 종의 유전자도 직접 넣을 수 있어요.</p><p>① 토양 세균 Bt의 독소 유전자를 옥수수에 넣는 <b>5단계</b>를 장면으로 따라가고, ② <b>선택 배지</b>에서 형질 전환된 세포만 골라 재생해 봐요.</p>',
      features: ['make', 'order'],
      setup() { mkGo(0); setMode('make'); },
      recap: 'LMO는 목적 유전자 확보 → 벡터에 삽입 → 식물 세포에 도입 → 선택 배지에서 선별 → 조직 배양으로 재생의 5단계로 만들고, 유전 부호가 보편적이라서 다른 종의 유전자도 단백질로 만들어져요.',
      summary: '<ul><li><b>LMO</b>: 현대 생명공학(유전자 재조합 등)으로 유전 물질을 바꾼 생물체 중 번식 · 증식할 수 있는 것. 전통 육종은 같은 종 안에서 교배 · 선발, LMO는 목적 유전자를 직접 도입(다른 종도 가능, 형질 도입이 빠르고 정밀).</li><li><b>5단계</b>: 목적 유전자(Bt 독소 유전자) 확보 → 벡터(Ti 플라스미드)에 삽입 → 식물 세포에 도입(유전자총 · 아그로박테리움) → 선택 배지에서 형질 전환 세포만 선별 → 조직 배양으로 식물 재생.</li><li><b>선택 마커</b>(제초제 저항 유전자 등): 선택 배지에서 형질 전환된 세포만 살아남게 해 골라내는 표지.</li><li><b>Bt 독소</b>: 특정 곤충의 장 세포 수용체에 결합해 해충을 죽이고, 사람 장에는 이 수용체가 없다고 평가돼요.</li><li>다른 종의 유전자도 단백질로 만들어지는 근거는 <b>유전 부호의 보편성</b>이에요.</li></ul>',
      missions: [
        {
          id: 'order', title: '5단계 순서 맞히기', manual: true,
          goal: 'LMO를 만드는 <b>5단계 카드</b>를 순서대로 1~5번 칸에 놓으세요.',
          hint: '먼저 필요한 유전자를 얻고, 운반체에 넣은 다음, 식물 세포에 넣어요. 그 뒤 살아남은 세포를 골라 식물로 키워요. 🧬 LMO 만들기 화면을 다시 보면 도움이 돼요.',
          setup() { setMode('order'); },
          check() {
            const n = OD.so.placed;
            if (n < 5) { OD.so.markBad([]); return '단계 카드를 모두 칸에 놓아 주세요. (' + n + ' / 5)'; }
            const w = odWrong();
            if (w.length) { OD.so.markBad(w.map((c) => c.id)); return '순서가 달라요. \'' + w[0].label + '\' 카드의 자리를 다시 생각해 보세요. (' + w.length + '장)'; }
            OD.so.markBad([]); OD.so.markOk(OD.so.cards.map((c) => c.id));
            return true;
          },
          status: () => mark(OD.so.placed === 5) + ' 카드 ' + OD.so.placed + ' / 5',
          explain: '<b>① 목적 유전자 확보 → ② 벡터에 삽입 → ③ 식물 세포에 도입 → ④ 선택 배지에서 선별 → ⑤ 조직 배양으로 재생</b> 순서예요. 도입된 세포는 겉으로 구별되지 않아서, 선택 마커와 선택 배지로 형질 전환된 세포만 골라낸 뒤 식물체로 키워요.',
        },
        {
          id: 'dish', title: '형질 전환 세포만 골라 재생',
          goal: '<b>🧬 LMO 만들기</b>의 ④ 화면에서 <b>선택 배지</b>를 넣고, 살아남은 세포를 <b>모두</b> 골라 재생을 시작하세요.',
          hint: '선택 배지(제초제 첨가)에서는 선택 마커가 없는 세포가 시들어요. 시들지 않은 세포를 모두 눌러 ring 표시를 만든 뒤 🌱 재생 시작을 눌러요.',
          setup() { dsReset(); mkGo(4); setMode('make'); },
          check: () => DS.regen && DS.cells.every((c) => c.pick === c.tr), hold: 0.5,
          status: () => mark(DS.med) + ' 선택 배지 넣기 &nbsp; ' + mark(DS.cells.filter((c) => c.pick && c.tr).length === dsSurv().length && DS.cells.every((c) => !c.pick || c.tr)) + ' 살아남은 세포 고르기 &nbsp; ' + mark(DS.regen) + ' 재생 시작',
          explain: '선택 배지에는 <b>제초제</b>가 들어 있어요. 선택 마커(제초제 저항 유전자)를 가진 <b>형질 전환 세포만</b> 살아남고 나머지는 시들어요. 살아남은 세포를 조직 배양해 식물로 키우면 Bt 독소 유전자를 가진 옥수수가 돼요. (세포 수와 도입 효율은 단순화한 모형이에요.)',
        },
        {
          type: 'quiz', title: '선택 마커와 유전 부호',
          goal: '<b>선택 마커</b>의 역할과, 세균의 Bt 독소 유전자가 <b>옥수수 세포에서도 단백질로 만들어지는 근거</b>를 바르게 짝지은 것은?',
          setup() { mkGo(4); setMode('make'); },
          choices: ['선택 마커는 도입된 세포만 선택 배지에서 살아남게 해 골라내는 표지이고, 유전 부호가 거의 모든 생물에서 같아서 다른 종의 유전자도 같은 아미노산 서열로 번역된다', '선택 마커는 해충을 죽이는 독소를 만드는 유전자이고, 세균과 식물은 유전 부호가 달라서 코돈을 바꿔야만 단백질이 만들어진다', '선택 마커는 식물을 빨리 자라게 하는 유전자이고, 다른 종의 유전자는 도입해도 번역되지 않는다', '선택 마커는 도입 여부와 관계없이 모든 세포를 살리는 유전자이고, 유전 부호는 종마다 완전히 달라서 단백질이 만들어지지 않는다'],
          answer: 0,
          feedback: ['', '해충을 죽이는 것은 Bt 독소 유전자예요. 선택 마커는 선별용 표지예요. 유전 부호는 거의 모든 생물에서 같아요.', '선택 마커는 선별을 위한 표지예요. 다른 종의 유전자도 같은 유전 부호로 번역돼요.', '선택 배지에서 도입되지 않은 세포는 시들어요. 유전 부호는 보편적이에요.'],
          explain: '<b>선택 마커</b>는 형질 전환된 세포만 선택 배지에서 살아남게 하는 <b>표지</b>예요. 그리고 <b>유전 부호는 거의 모든 생물에서 같아서</b>(보편성) 세균의 유전자도 식물 세포의 리보솜에서 같은 아미노산 서열의 단백질로 만들어져요. 이것이 종이 다른 유전자를 도입해도 쓸 수 있는 근거예요.',
        },
      ],
    },
    {
      title: '인간에 대한 영향', short: '인간 영향', icon: '🛡️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> LMO를 만드는 과정을 봤어요. 이제 LMO를 <b>먹는 사람</b>에게 어떤 이익과 우려가 있고, 이를 어떻게 평가하는지 분석해요.</div><p>① 근거 카드 6장을 <b>이익</b>과 <b>우려</b>로 나눠요. 우려는 이미 일어난 일이 아니라 <b>평가로 확인할 가능성</b>이에요.</p><p>② <b>안전성 평가 순서</b>를 배열하고, <b>브라질넛 사례</b>와 <b>표시제 3 %</b> 예를 살펴봐요. (제도 내용은 교육용 요약이에요.)</p>',
      features: ['ev', 'eval'],
      setup() { setMode('ev'); },
      recap: '인간에 대한 영향은 이익(영양 개선 · 살충제 감소 · 의약품 생산)과 우려(알레르기 · 독성 · 항생제 내성 유전자 전이)를 함께 두고, 새 단백질 확인 → 알레르기 → 독성 · 영양 성분 → 승인 순서로 평가해요.',
      summary: '<ul><li><b>이익</b>: 영양 개선(예: β-카로틴), 살충제 사용 감소, 의약품 생산(예: 대장균의 인슐린).</li><li><b>우려</b>: 알레르기 유발 가능성, 독성이나 성분 변화, 항생제 내성 유전자 전이 — 평가로 확인해야 해요.</li><li><b>안전성 평가 순서</b>: 새로 만들어진 단백질 확인 → 알레르기 가능성 → 독성 · 영양 성분을 기존 작물과 비교 → 승인.</li><li><b>브라질넛 사례</b>: 브라질넛 단백질 유전자를 넣은 콩에서 알레르기 환자의 혈청이 반응해 개발이 중단됐어요. 평가 제도가 작동한 예예요.</li><li><b>표시제</b>(교육용 요약): 우리나라는 비의도적 혼입 3 % 이하(100 g 중 3 g 이하)이면 표시를 면제해요.</li><li>LMO를 먹어도 섭취한 DNA는 소화 과정에서 분해되어 사람의 유전자에 들어가지 않아요.</li></ul>',
      missions: [
        {
          id: 'human', title: '근거 분류와 평가 순서', manual: true,
          goal: '<b>🗂️ 근거 분류</b>에서 근거 카드 6장을 이익 · 우려로 나누고, <b>🛡️ 안전성 평가</b>에서 평가 순서 4단계를 배열한 뒤 브라질넛 사례 카드를 읽고 표시제 슬라이더를 4 g 이상까지 움직여 보세요.',
          hint: '‘~할 수 있어요’ 중 좋은 점은 이익, 평가로 확인해야 할 가능성은 우려예요. 평가는 새 단백질이 무엇인지 아는 것부터 시작하고, 마지막이 승인이에요.',
          setup() { setMode('ev'); },
          check() {
            const a = EV.so.placed, b = EL.so.placed;
            if (a < 6) { EV.so.markBad([]); return '🗂️ 근거 분류에서 카드를 모두 놓아 주세요. (' + a + ' / 6)'; }
            const w = evWrong();
            if (w.length) { EV.so.markBad(w.map((c) => c.id)); return '\'' + w[0].short + '\' 카드를 다시 생각해 보세요. (' + w.length + '장이 달라요)'; }
            EV.so.markBad([]); EV.so.markOk(EV.so.cards.map((c) => c.id));
            if (b < 4) { EL.so.markBad([]); return '🛡️ 안전성 평가에서 순서 카드를 모두 놓아 주세요. (' + b + ' / 4)'; }
            const w2 = elWrong();
            if (w2.length) { EL.so.markBad(w2.map((c) => c.id)); return '평가 순서가 달라요. \'' + w2[0].label + '\' 카드를 다시 생각해 보세요.'; }
            EL.so.markBad([]); EL.so.markOk(EL.so.cards.map((c) => c.id));
            if (!EL.seenNut) return '🥜 브라질넛 사례 카드를 열어 읽어 주세요.';
            if (EL.lmMax < 4) return '표시제 슬라이더를 4 g 이상까지 움직여 3 % 경계를 확인해 주세요.';
            return true;
          },
          status: () => mark(EV.so.placed === 6) + ' 근거 ' + EV.so.placed + ' / 6 &nbsp; ' + mark(EL.so.placed === 4) + ' 순서 ' + EL.so.placed + ' / 4 &nbsp; ' + mark(EL.seenNut) + ' 브라질넛 &nbsp; ' + mark(EL.lmMax >= 4) + ' 표시제',
          explain: '이익은 <b>영양 개선 · 살충제 감소 · 의약품 생산</b>이고, 우려는 <b>알레르기 · 독성 · 항생제 내성 유전자 전이</b>처럼 평가로 확인해야 할 가능성이에요. 안전성 평가는 <b>새 단백질 확인 → 알레르기 가능성 → 독성 · 영양 성분 비교 → 승인</b> 순서로 진행해요. 표시제는 비의도적 혼입 3 % 이하(100 g 중 3 g 이하)이면 면제(교육용 요약)예요.',
        },
        {
          type: 'quiz', title: 'LMO의 DNA를 먹으면?',
          goal: 'LMO 작물을 먹으면 그 안의 DNA가 <b>사람의 유전자 속으로 들어가 사람의 유전자를 바꿀</b>까요?',
          setup() { setMode('eval'); },
          choices: ['아니요. 섭취한 DNA는 다른 음식의 DNA처럼 소화 과정에서 분해되고, 사람의 염색체에 끼어 들어가지 않는다', '예. 먹은 DNA는 그대로 흡수되어 사람의 DNA에 끼어든다', '예. LMO의 DNA만 특별히 분해되지 않고 몸의 유전자를 바꾼다', '아니요. 사람은 DNA를 소화하지 못해서 그대로 배설한다'],
          answer: 0,
          feedback: ['', '모든 음식에는 DNA가 있고, 먹으면 소화 과정에서 분해돼요. 그대로 흡수되어 끼어들지 않아요.', 'LMO의 DNA도 다른 DNA와 똑같이 분해돼요.', '소화 과정에서 DNA는 분해돼요. 문제는 새 단백질의 안전성이에요.'],
          explain: '우리가 먹는 모든 음식에는 DNA가 들어 있고, 소화 과정에서 분해돼요. LMO의 DNA도 마찬가지라서 <b>사람의 유전자를 바꾸지 않아요</b>. 그래서 LMO 평가에서는 DNA가 아니라 새로 만들어진 <b>단백질의 알레르기 · 독성</b>과 <b>항생제 내성 유전자</b>가 옮겨 갈 가능성 같은 것을 살펴봐요.',
        },
        {
          type: 'quiz', title: '브라질넛 콩 사례의 의미',
          goal: '브라질넛 단백질 유전자를 넣은 콩이 개발 중단된 사례가 <b>보여 주는 것</b>으로 가장 알맞은 것은?',
          setup() { setMode('eval'); },
          choices: ['안전성 평가 제도가 시장에 나오기 전에 알레르기 위험을 걸러 낸 예이다', '모든 LMO는 알레르기를 일으킨다는 증거이다', '평가를 해도 위험을 미리 알 수 없다는 증거이다', '이 콩이 이미 시장에서 팔리고 있었다는 뜻이다'],
          answer: 0,
          feedback: ['', '한 사례로 모든 LMO를 판단할 수 없어요. 평가가 위험을 걸러 낸 사례예요.', '오히려 평가를 통해 위험을 미리 알아냈어요.', '시장에 나오기 전에 개발이 중단됐어요.'],
          explain: '알레르기 환자의 혈청이 새 단백질에 반응하는 것이 <b>평가 단계</b>에서 확인되어 개발이 중단됐어요. 즉 평가 제도가 위험을 사전에 걸러 낸 예예요. 이 사례가 모든 LMO가 위험하다는 뜻은 아니고, <b>새 단백질마다 평가가 필요하다</b>는 뜻이에요.',
        },
      ],
    },
    {
      title: '생태계에 대한 영향', short: '생태계 영향', icon: '🐛', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> Bt 작물이 해충에게 작용하고, 사람에 대한 영향은 평가로 확인한다는 것을 봤어요. 이제 <b>생태계</b>에 미치는 영향을 모의실험 증거로 추론해요.</div><p><b>실험 1 (은신처)</b>: 해충 집단에서 Bt에 저항성을 가진 개체의 비율 R은 처음 <b>0.001</b>이에요. Bt 구역에서는 저항성 개체가 유리하고, 일반 작물 <b>은신처</b>에서는 감수성 개체가 더 잘 살아남아요. 은신처 비율 0 · 20 · 50 %에서 R이 <b>0.5를 넘는 세대</b>를 기록해요.</p><p><b>실험 2 (꽃가루)</b>: 이웃 밭까지 거리에 따라 꽃가루 교잡률이 어떻게 달라지는지 읽어요. 또 비표적 곤충 · 천적 · 내성 잡초 카드도 읽어요. (모두 단순화한 모의실험 · 예시 식이에요.)</p>',
      features: ['refuge', 'pollen', 'eco'],
      setup() { setMode('refuge'); },
      recap: '은신처가 없으면 저항성 해충이 3세대 만에 절반을 넘지만, 은신처 20 %이면 6세대, 50 %이면 13세대로 늦춰져요. 꽃가루 교잡률은 거리가 멀수록 급격히 줄어요.',
      summary: '<ul><li><b>저항성 진화(모의)</b>: 처음 R = 0.001. Bt 구역에서 저항성 wR = 1, 감수성 wS = 0.1 / 은신처에서 wR = 0.9, wS = 1.0. 평균 wR = (1 ' + MINUS + ' f) × 1 + f × 0.9, 평균 wS = (1 ' + MINUS + ' f) × 0.1 + f × 1.0이고 다음 세대 R′ = R·wR / (R·wR + (1 ' + MINUS + ' R)·wS)예요.</li><li><b>R이 0.5를 넘는 세대</b>: 은신처 0 % → 3세대, 20 % → 6세대, 50 % → 13세대. 은신처가 저항성 확산을 늦춰요.</li><li><b>유전자 이동(예시 식)</b>: 꽃가루 교잡률(%) = 5 × e<sup>−d/20 m</sup>. 0 m 5 %, 20 m 1.8 %, 50 m 0.4 %, 100 m 0.03 %. 격리 거리가 멀수록 줄어요.</li><li><b>그 밖의 영향</b>: 비표적 곤충 · 천적 · 먹이 그물 변화, 제초제 내성 작물에 같은 제초제를 계속 쓰면 내성 잡초가 늘 수 있어요.</li></ul>',
      missions: [
        {
          id: 'refuge', title: '은신처 비율 실험',
          goal: '<b>🐛 은신처 실험</b>에서 은신처 비율 <b>0 · 20 · 50 %</b>를 각각 실행해, 저항성 개체 비율 R이 <b>0.5를 넘는 세대</b>를 기록하세요.',
          hint: '비율을 고르고 ▶ 실행을 누르면 15세대까지 한 세대씩 진행돼요. 그래프에서 R이 점선 0.5를 처음 넘는 곳을 찾아요. 세 가지를 모두 실행해요.',
          setup() { setMode('refuge'); },
          check: () => FS.every((f) => RF.cross[f] != null), hold: 0.6,
          status: () => FS.map((f) => mark(RF.cross[f] != null) + ' ' + f + ' % ' + (RF.cross[f] != null ? RF.cross[f] + '세대' : '')).join(' &nbsp; '),
          explain: '저항성 대 감수성의 비는 한 세대마다 wR / wS 배로 커져요: 은신처 0 %는 1 / 0.1 = <b>10배</b> → <b>3세대</b>, 20 %는 0.98 / 0.28 = <b>3.5배</b> → <b>6세대</b>, 50 %는 0.95 / 0.55 ≈ <b>1.7배</b> → <b>13세대</b>에 R이 0.5를 넘어요. 은신처가 넓을수록 저항성이 퍼지는 속도가 느려져요.',
        },
        {
          id: 'pollen', title: '격리 거리 읽기',
          goal: '<b>🌬️ 꽃가루 이동</b>에서 이웃 밭의 꽃가루 교잡률이 <b>0.5 % 미만</b>이 되는 <b>가장 가까운 거리</b>(10 m 눈금)를 찾으세요.',
          hint: '슬라이더를 10 m씩 움직이며 오른쪽의 교잡률 값을 읽어요. 40 m에서는 0.5 %를 넘는지 확인해 봐요.',
          setup() { setMode('pollen'); },
          check: () => PL.d === 50, hold: 0.8,
          status: () => mark(PL.d === 50) + ' ' + PL.d + ' m: ' + fmtRate(polRate(PL.d)) + ' % &nbsp; (40 m는 ' + fmtRate(polRate(40)) + ' %)',
          explain: '교잡률 = 5 × e<sup>−d/20</sup> (%) 에서 40 m는 약 <b>0.7 %</b>(0.5 % 이상), 50 m는 약 <b>0.4 %</b>(0.5 % 미만)예요. 따라서 10 m 눈금에서 0.5 % 미만이 되는 가장 가까운 거리는 <b>50 m</b>예요. 거리가 멀수록 교잡률은 지수적으로 줄어요(100 m는 약 0.03 %).',
        },
        {
          type: 'quiz', title: '저항성 해충이 늘어나는 까닭과 은신처의 역할',
          goal: 'Bt 작물만 계속 심으면 <b>저항성 해충이 늘어나는 까닭</b>과 <b>은신처의 역할</b>로 알맞은 것은?',
          setup() { setMode('refuge'); },
          choices: ['Bt 구역에서는 저항성 개체가 훨씬 잘 살아남아 비율이 커지고, 은신처에서는 감수성 개체가 더 잘 살아남아 그 증가를 늦춘다', 'Bt 독소가 해충의 유전자를 저항성으로 바꾸고, 은신처는 Bt 독소를 더 많이 만들게 한다', 'Bt 구역에서는 감수성 개체가 더 잘 살아남아 저항성이 줄고, 은신처는 저항성을 늘린다', '저항성 개체는 처음부터 없어서 해충은 절대 저항성을 갖지 못한다'],
          answer: 0,
          feedback: ['', '독소가 유전자를 바꾸는 것이 아니라, 이미 있던 저항성 개체가 선택되는 거예요.', 'Bt 구역에서는 저항성 개체가 유리해서 비율이 늘어요.', '모의실험에서는 처음에 저항성 개체가 아주 적게(0.001) 있고, 선택으로 늘어나요.'],
          explain: '해충 집단에는 처음부터 저항성 유전자를 가진 개체가 아주 적게 있어요. Bt 구역에서는 이 개체만 잘 살아남아(<b>자연선택</b>) 비율이 커져요. <b>은신처</b>에서는 감수성 개체가 더 잘 살아남아 저항성 개체의 비율 증가를 늦춰요.',
        },
      ],
    },
    {
      title: '영향 추론하기', short: '종합 추론', icon: '📋', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 인간에 대한 영향(평가 · 표시제)과 생태계에 대한 영향(저항성 · 유전자 이동)을 따로 살펴봤어요. 이제 <b>사례 3개</b>를 하나의 표로 종합해 추론해요.</div><p><b>Bt 목화 · 황금쌀 · 형질 전환 연어</b> 각각에 대해 <b>이익 / 인간 건강 / 생태계 / 완화 방안</b> 칸을 채워요. 인간 건강과 생태계 칸은 <b>근거가 확인된 사실</b>인지 <b>아직 불확실</b>한지도 표시해요.</p><p>마지막에는 <b>“…이므로 …가 필요하다”</b> 한 문장으로 추론해요. 사례 설명은 교육용 요약이에요.</p>',
      features: ['table'],
      setup() { setMode('table'); },
      recap: 'LMO의 영향은 사례마다 이익과 위험, 근거의 확실성이 달라서 무조건 안전하다거나 무조건 위험하다고 말할 수 없고, 사례별 평가와 감시, 완화 방안이 필요해요.',
      summary: '<ul><li><b>Bt 목화</b>: 이익 — 해충 피해와 살충제 감소 / 사람 — 수용체가 없다고 평가(사실) / 생태계 — 저항성 해충 증가 가능(사실) / 완화 — 은신처 + 감시.</li><li><b>황금쌀</b>: 이익 — β-카로틴으로 영양 개선 / 사람 — 실제 효과의 크기는 불확실 / 생태계 — 야생 벼와 교잡 가능(사실) / 완화 — 평가 + 격리 · 감시.</li><li><b>형질 전환 연어</b>: 이익 — 빨리 자라 양식 기간 단축 / 사람 — 장기 섭취 자료 제한(불확실) / 생태계 — 탈출 · 교잡 영향 불확실 / 완화 — 불임 암컷 · 격리 시설.</li><li><b>추론</b>: 이익이 있어도 불확실한 부분이 남아 있으므로, 사례별로 근거를 평가하고 감시하는 제도가 필요해요. 사실과 불확실한 것을 구분해서 말해야 해요.</li></ul>',
      missions: [
        {
          id: 'table', title: '영향 표 완성', manual: true,
          goal: '3개 사례의 <b>12칸</b>을 채우고, 인간 건강 · 생태계 칸에는 <b>근거 표시</b>를 한 뒤, <b>한 문장 추론</b>까지 고르세요.',
          hint: '각 칸은 그 사례의 특징(Bt 독소, β-카로틴, 불임 암컷 등)이 들어 있는 설명이 정답이에요. ‘~할 수 있어요 · 불확실해요’처럼 아직 확인되지 않은 것은 불확실로 표시해요.',
          setup() { setMode('table'); },
          check() {
            const n = tbFilled(); const res = tbCheckAll(); TB.res = res;
            if (n < 13) return '아직 비어 있는 칸이 있어요. (' + n + ' / 13)';
            const bad = [];
            TROWS.forEach((_, r) => TCOLS.forEach((__, c) => { if (res[r][c] === 'bad') bad.push([r, c]); }));
            if (res[3] === 'bad') bad.push([3, 0]);
            // 근거 표시가 안 된 칸
            const miss = [];
            TROWS.forEach((_, r) => [1, 2].forEach((c) => { if (TB.stat[r][c] == null) miss.push([r, c]); }));
            if (miss.length && !bad.length) return '인간 건강 · 생태계 칸의 근거 표시(사실 / 불확실)를 모두 해 주세요. (' + miss.length + '칸 남음)';
            if (bad.length) { const [r, c] = bad[0]; if (r === 3) return '한 문장 추론을 다시 생각해 보세요. 사실과 불확실한 부분을 모두 반영했는지 살펴봐요.'; return '\'' + TROWS[r].name + '\'의 \'' + TCOLS[c] + '\' 칸을 다시 확인해 보세요. (' + bad.length + '칸이 달라요)'; }
            return true;
          },
          status: () => mark(tbFilled() === 13) + ' 채운 칸 ' + tbFilled() + ' / 13 &nbsp; ' + mark(TROWS.every((_, r) => [1, 2].every((c) => TB.stat[r][c] != null))) + ' 근거 표시',
          explain: '표를 채우면 <b>Bt 목화</b>는 해충·살충제 이익과 저항성 해충 증가 가능성(은신처 + 감시), <b>황금쌀</b>은 영양 개선과 효과의 불확실성 · 야생 벼 교잡 관리, <b>형질 전환 연어</b>는 양식 단축과 탈출 · 교잡 우려(불임 암컷 · 격리 시설)가 나와요. 사실로 확인된 것과 <b>아직 불확실한 것</b>을 구분해서 말하는 것이 핵심이에요.',
        },
        {
          type: 'quiz', title: '무조건 안전? 무조건 위험?',
          goal: 'LMO를 ‘모두 안전하다’ 또는 ‘모두 위험하다’고 <b>말할 수 없는 까닭</b>으로 알맞은 것은?',
          setup() { setMode('table'); },
          choices: ['도입한 유전자, 생물의 종류, 재배 환경과 관리 방법에 따라 이익과 위험이 달라서 사례별로 근거를 평가해야 하기 때문이다', 'LMO는 모두 똑같은 유전자를 가지고 있어서 평가할 필요가 없기 때문이다', '과학자들이 위험을 평가하는 방법을 아직 하나도 갖고 있지 않기 때문이다', 'LMO의 안전성은 광고 문구로 결정되기 때문이다'],
          answer: 0,
          feedback: ['', 'LMO마다 도입한 유전자와 생물이 달라요. 그래서 사례별 평가가 필요해요.', '알레르기 · 독성 평가, 저항성 관리 등 여러 평가 방법이 있어요.', '안전성은 근거 자료와 평가로 판단해요.'],
          explain: '<b>어떤 유전자</b>를 <b>어떤 생물</b>에 넣고 <b>어떤 환경</b>에서 어떻게 관리하느냐에 따라 이익과 위험이 달라요. 그래서 ‘모두 안전’이나 ‘모두 위험’으로 일반화하지 않고, <b>사례별로 근거를 평가</b>하고 확인된 사실과 불확실한 부분을 구분해요. 어떻게 쓸지 결정하는 문제는 가치 판단도 포함하므로 다음 차시에서 의사 결정을 연습해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hg-lmo', mount: '#game', badge: 'LMO 탐구가', homeHref: '../../index.html#hg',
    featureLabels: { make: '🧬 LMO 만들기', order: '🔢 순서 맞히기', ev: '🗂️ 근거 분류', eval: '🛡️ 안전성 평가', refuge: '🐛 은신처 실험', pollen: '🌬️ 꽃가루 이동', eco: '🃏 생태 카드', table: '📋 영향 표' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const m = S.mode;
    if (m === 'make') setReads(['단계', MK.page === 0 ? '비교' : MK.page + ' / 5', '형질 전환 세포', DS.med ? dsSurv().length + ' / 12' : '아직 몰라요', '재생', DS.regen ? '시작' : '아직']);
    else if (m === 'order') setReads(['놓은 카드', (OD.so ? OD.so.placed : 0) + ' / 5', '단계', '5단계', '재료', 'Bt 옥수수']);
    else if (m === 'ev') setReads(['놓은 카드', (EV.so ? EV.so.placed : 0) + ' / 6', '이익 카드', EV.so ? EV.so.cards.filter((c) => c.zone === 'benefit').length + '장' : '0장', '우려 카드', EV.so ? EV.so.cards.filter((c) => c.zone === 'concern').length + '장' : '0장']);
    else if (m === 'eval') setReads(['평가 순서', (EL.so ? EL.so.placed : 0) + ' / 4', '섞인 LMO', EL.lm + ' g / 100 g', '표시', EL.lm === 0 ? '해당 없음' : EL.lm <= 3 ? '면제' : '필요']);
    else if (m === 'refuge') { const h = RF.hist[RF.f]; setReads(['은신처', RF.f + ' %', '세대', (h.length - 1) + ' / 15', '저항성 비율 R', h[h.length - 1].toFixed(3)]); }
    else if (m === 'pollen') setReads(['거리', PL.d + ' m', '교잡률', fmtRate(polRate(PL.d)) + ' %', '0.5 %', polRate(PL.d) < 0.5 ? '미만' : '이상']);
    else if (m === 'eco') setReads(['읽은 카드', EC.seen.filter(Boolean).length + ' / 3', '주제', '생태계 영향', '예', 'Bt · 내성 잡초']);
    else setReads(['채운 칸', tbFilled() + ' / 13', '사례', '3가지', '선택', TB.sel[0] === 3 ? '추론 문장' : TROWS[TB.sel[0]].name + ' · ' + TCOLS[TB.sel[1]]]);
  }

  /* ---------- 시작 ---------- */
  setMode('make');
  let lastFree = false, lastLv = -1;
  SciSim.loop((dt, t) => {
    clock = t; S.t = t; FDT = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply(); ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    FX.update(dt);
    switch (S.mode) {
      case 'make': makeScene(dt, t); break;
      case 'order': orderScene(dt, t); break;
      case 'ev': evScene(dt, t); break;
      case 'eval': evalScene(dt, t); break;
      case 'refuge': refugeScene(dt, t); break;
      case 'pollen': pollenScene(dt, t); break;
      case 'eco': ecoScene(dt, t); break;
      case 'table': tableScene(dt, t); break;
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, levels, setMode, updateCtl, MK, DS, OD, EV, EL, RF, PL, EC, TB, TS, TROWS, TCOLS, CONCL,
    mkGo, dsMedium, dsToggle, dsRegen, dsReset, nutToggle, rfSetF, rfRun, rfReset, rfNext, polRate, tbOptions, tbPick, tbStat, tbSelect, tbOK, odWrong, evWrong, elWrong,
  };


})();
