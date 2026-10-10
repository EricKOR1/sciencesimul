/* =========================================================
   중1 Ⅰ. 과학과 인류의 지속가능한 삶 — 지속가능한 삶과 과학기술 [9과01-03]
   🌏 탄소 중립 마을 만들기
   ① [관찰] 문제 인식   : 지금처럼 쓴다면? 화석 연료 탱크 · 이산화 탄소 · 쓰레기 → 지속가능한 발전
   ② [실험] 과학기술    : 마을에 태양광 · 풍력 · 에너지 저장 장치를 설치하고 하루를 돌려 전기 흐름 관찰
   ③ [설명] 함께 실천   : 개인 vs 사회 실천 분류 → 흐린 날 비교 실험(개인만 / 사회만 / 함께) → 쟁점에 과학적 의견
   ④ [적용] 실천 계획   : 일주일 실천 계획표(언제·무엇을·얼마나) → 지구 위에 나무가 자란다
   ※ 온실효과 원리·전력량 계산은 다루지 않음(‘이산화 탄소가 늘면 기후변화가 심해진다’까지, kWh는 ‘전기량’ 라벨로만).
   ========================================================= */
(function () {
  'use strict';
  const { $, clamp, lerp, Sound, toast } = SciSim;
  const EASE = SciSim.ease;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const nowS = () => performance.now() / 1000;

  /* =========================================================
     글꼴 · 색 · 작은 도우미
     ========================================================= */
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const JUA = '"Jua",' + FONT;
  const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';
  const f = (s, w) => (w || 700) + ' ' + s + 'px ' + FONT;
  const fj = (s) => '400 ' + s + 'px ' + JUA;
  const fm = (s) => '800 ' + s + 'px ' + MONO;
  const COL = { A: '#f26b3a', B: '#3867f4', good: '#14a058', bad: '#e2464b', purple: '#8b5cf6', ink: '#1b2333', muted: '#5d6879', sci: '#64748b' };
  const SERIES_COLORS = ['#8b5cf6', '#0d9488', '#db2777', '#ca8a04', '#475569'];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffled(arr, seed) {
    const r = mulberry32(seed), a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  const hexA = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgb = (a, k, al) => { k = k == null ? 1 : k; const r = Math.min(255, a[0] * k) | 0, g = Math.min(255, a[1] * k) | 0, b = Math.min(255, a[2] * k) | 0; return al == null ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + al + ')'; };
  const rgba = (h, a) => SciSim.color.rgba(h, a);
  const inR = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  const ease01 = (name, p) => (RM ? (p > 0 ? 1 : 0) : EASE[name](clamp(p, 0, 1)));
  const SKY = '#0a0f26';


  /* =========================================================
     무대(캔버스) — 휴대폰(599px 이하)은 세로형 480×820으로 교체
     ========================================================= */
  const LAYOUTS = {
    wide: { kind: 'wide', W: 800, H: 600 },
    tall: { kind: 'tall', W: 480, H: 820 },
  };
  const mq = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
  let view = null, ctx = null, D = null, LAY = null;
  const caches = new Map();
  const wrapCache = new Map();
  const BG = '#e8f0f8';                       // 캔버스 바깥 여백과 같은 색(패널 카드가 떠 있는 느낌)
  function buildStage() {
    const kind = mq && mq.matches ? 'tall' : 'wide';
    if (LAY && LAY.kind === kind) return;
    let cv = $('#cv');
    if (view) {
      const fresh = document.createElement('canvas');
      fresh.id = 'cv';
      fresh.setAttribute('aria-label', cv.getAttribute('aria-label') || '');
      cv.replaceWith(fresh);
      cv = fresh;
    }
    LAY = LAYOUTS[kind];
    caches.clear();
    view = SciSim.stage(cv, { width: LAY.W, height: LAY.H, background: BG, onResize: () => caches.clear() });
    ctx = view.ctx; D = SciSim.draw(ctx);
    SciSim.pointer(view, handlers);
    wrapCache.clear();
    if (kind === 'tall') {
      // 휴대폰: 캔버스 위에서도 페이지를 세로로 밀 수 있게 하고, 카드를 잡았을 때만 스크롤을 막는다
      cv.style.touchAction = 'pan-y';
      cv.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        if (grabbableAt(view.toLocal(e.touches[0]))) e.preventDefault();
      }, { passive: false });
    }
    relayout();
    syncDom();
  }
  /* 정적 그림 캐시(오프스크린 캔버스) */
  function layer(key, w, h, paint) {
    const s = view.scale * view.dpr;
    let c = caches.get(key);
    if (c && c.s === s) return c;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w * s)); cv.height = Math.max(1, Math.ceil(h * s));
    const g = cv.getContext('2d');
    g.setTransform(s, 0, 0, s, 0, 0);
    const sc = ctx, sd = D;
    ctx = g; D = SciSim.draw(g);
    try { paint(); } finally { ctx = sc; D = sd; }
    c = { cv, w, h, s };
    caches.set(key, c);
    return c;
  }
  function blit(c, x, y) { ctx.drawImage(c.cv, x, y, c.w, c.h); }

  /* 그리기 도우미 */
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function txt(s, x, y, font, color, align, base) {
    ctx.font = font; ctx.fillStyle = color || COL.ink; ctx.textAlign = align || 'center'; ctx.textBaseline = base || 'middle';
    ctx.fillText(s, x, y);
  }
  function wrapLines(s, maxW, font) {
    const key = font + '|' + maxW + '|' + s;
    let v = wrapCache.get(key);
    if (v) return v;
    ctx.save(); ctx.font = font;
    const lines = [];
    String(s).split('\n').forEach((para) => {
      const words = para.split(' ');
      let cur = '';
      words.forEach((w) => {
        const t = cur ? cur + ' ' + w : w;
        if (ctx.measureText(t).width <= maxW) { cur = t; return; }
        if (cur) lines.push(cur);
        cur = w;
        while (ctx.measureText(cur).width > maxW && cur.length > 1) {   // 낱말이 너무 길면 글자 단위로
          let k = cur.length - 1;
          while (k > 1 && ctx.measureText(cur.slice(0, k)).width > maxW) k--;
          lines.push(cur.slice(0, k)); cur = cur.slice(k);
        }
      });
      lines.push(cur);
    });
    const widths = lines.map((l) => ctx.measureText(l).width);
    ctx.restore();
    v = { lines, w: Math.max(0, ...widths) };
    wrapCache.set(key, v);
    return v;
  }
  function drawLines(s, x, y, maxW, size, color, o) {
    o = o || {};
    const font = f(size, o.weight || 700), lh = o.lh || Math.round(size * 1.32);
    const wl = wrapLines(s, maxW, font);
    const n = wl.lines.length;
    let y0 = o.valign === 'top' ? y + lh / 2 : y - ((n - 1) * lh) / 2;
    ctx.font = font; ctx.fillStyle = color || COL.ink; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
    wl.lines.forEach((l, i) => ctx.fillText(l, x, y0 + i * lh));
    return n * lh;
  }
  function pill(x, y, s, o) {
    o = o || {};
    const size = o.size || 14, h = o.h || size + 12, pad = o.pad != null ? o.pad : 10;
    ctx.font = f(size, o.weight || 800);
    const w = ctx.measureText(s).width + pad * 2;
    const x0 = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
    if (o.shadow) { ctx.save(); ctx.shadowColor = 'rgba(20,40,80,.22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; }
    ctx.fillStyle = o.bg || COL.ink; rr(x0, y - h / 2, w, h, h / 2); ctx.fill();
    if (o.shadow) ctx.restore();
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = o.bw || 1.5; ctx.stroke(); }
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s, x0 + w / 2, y + 1);
    return { x: x0, y: y - h / 2, w, h };
  }
  function softShadow(fn, blur, oy, color) {
    ctx.save(); ctx.shadowColor = color || 'rgba(20,40,80,.18)'; ctx.shadowBlur = blur; ctx.shadowOffsetY = oy; fn(); ctx.restore();
  }
  function contactShadow(x, y, rx, ry, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, 'rgba(20,40,80,' + (a != null ? a : 0.18) + ')'); g.addColorStop(1, 'rgba(20,40,80,0)');
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx, 0, TAU); ctx.fill(); ctx.restore();
  }
  function newRing(x, y, w, h) {
    const a = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    ctx.save(); ctx.strokeStyle = 'rgba(139,92,246,' + (0.35 + a * 0.5) + ')'; ctx.lineWidth = 4;
    rr(x - 6, y - 6, w + 12, h + 12, 16); ctx.stroke();
    ctx.fillStyle = COL.purple; rr(x + w - 40, y - 16, 50, 22, 11); ctx.fill();
    txt('NEW', x + w - 15, y - 5, f(12, 800), '#fff');
    ctx.restore();
  }
  function breathe(x, y, w, h, r, color) {
    const k = RM ? 0.6 : 0.5 + 0.5 * Math.sin(nowS() * 4.2);
    ctx.save(); ctx.strokeStyle = rgba(color || COL.good, 0.45 + 0.5 * k); ctx.lineWidth = 2.5 + 1.5 * k;
    rr(x, y, w, h, r); ctx.stroke(); ctx.restore();
  }

  /* =========================================================
     효과: 반짝이 · 퍼지는 고리 · 말풍선 · 날아가는 데이터 칩
     ========================================================= */
  const FX = { parts: new SciSim.Particles(), rings: [], bubbles: [], flyers: [] };
  function ringFx(x, y, color, r0) { if (!RM) FX.rings.push({ x, y, t: 0, color: color || COL.good, r0: r0 || 14 }); }
  function sparkle(x, y, n, colors) {
    FX.parts.burst(x, y, { count: n || 10, colors: colors || ['#ffd84d', '#fff3b0', '#14a058', '#7be0a8'], speed: 150, gravity: 140, life: 0.75, size: 3.4, shape: 'star' });
  }
  function bubble(x, y, text, o) {
    o = o || {};
    FX.bubbles = FX.bubbles.filter((b) => !(o.tag && b.tag === o.tag));
    FX.bubbles.push({ x, y, text, t: 0, dur: o.dur || 2.5, kind: o.kind || 'info', tag: o.tag || null, maxW: o.maxW || 250 });
  }
  function softFail() { Sound.tone(330, 0.09, 'triangle', 0.07); Sound.tone(250, 0.12, 'triangle', 0.06, 0.08); }
  function updateFx(dt) {
    FX.parts.update(dt);
    FX.rings.forEach((r) => (r.t += dt)); FX.rings = FX.rings.filter((r) => r.t < 0.6);
    FX.bubbles.forEach((b) => (b.t += dt)); FX.bubbles = FX.bubbles.filter((b) => b.t < b.dur);
    FX.flyers.forEach((q) => {
      q.t += dt;
      if (!q.done && q.t >= q.dur) { q.done = true; q.onDone && q.onDone(); }
    });
    FX.flyers = FX.flyers.filter((q) => !q.done);
  }
  function drawFx() {
    FX.rings.forEach((r) => {
      const k = r.t / 0.6;
      ctx.save(); ctx.strokeStyle = rgba(r.color, 0.8 * (1 - k)); ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + k * 46, 0, TAU); ctx.stroke(); ctx.restore();
    });
    FX.parts.draw(ctx);
    FX.flyers.forEach((q) => {
      const p = ease01('inOutCubic', q.t / q.dur);
      const cx = (q.x0 + q.x1) / 2, cy = Math.min(q.y0, q.y1) - 70;
      const x = (1 - p) * (1 - p) * q.x0 + 2 * (1 - p) * p * cx + p * p * q.x1;
      const y = (1 - p) * (1 - p) * q.y0 + 2 * (1 - p) * p * cy + p * p * q.y1;
      const sc = 1 - 0.35 * p;
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
      pill(0, 0, q.text, { bg: q.color, size: 14, shadow: true });
      ctx.restore();
    });
    FX.bubbles.forEach(drawBubble);
  }
  function drawBubble(b) {
    const a = b.t < 0.15 ? b.t / 0.15 : b.t > b.dur - 0.35 ? (b.dur - b.t) / 0.35 : 1;
    const sc = RM ? 1 : b.t < 0.3 ? 0.6 + 0.4 * EASE.outBack(b.t / 0.3) : 1;
    const font = f(14, 700), wl = wrapLines(b.text, b.maxW, font);
    const w = wl.w + 24, h = wl.lines.length * 19 + 14;
    let bx = clamp(b.x - w / 2, 6, LAY.W - w - 6);
    let by = b.y - h - 14, tailUp = false;
    if (by < 6) { by = b.y + 14; tailUp = true; }
    const colors = { info: ['#1b2333', '#fff'], bad: ['#fff', '#a3262b'], good: ['#e8f8ef', '#0b6b39'], same: ['#eef1f5', '#3a4456'] };
    const [bg, fg] = colors[b.kind] || colors.info;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(b.x, b.y); ctx.scale(sc, sc); ctx.translate(-b.x, -b.y);
    softShadow(() => {
      ctx.fillStyle = bg; rr(bx, by, w, h, 12); ctx.fill();
      const tx = clamp(b.x, bx + 14, bx + w - 14);
      ctx.beginPath();
      if (tailUp) { ctx.moveTo(tx - 8, by + 1); ctx.lineTo(tx, by - 9); ctx.lineTo(tx + 8, by + 1); }
      else { ctx.moveTo(tx - 8, by + h - 1); ctx.lineTo(tx, by + h + 9); ctx.lineTo(tx + 8, by + h - 1); }
      ctx.fill();
    }, 12, 4);
    if (b.kind === 'bad') { ctx.strokeStyle = '#f3b6b8'; ctx.lineWidth = 1.5; rr(bx, by, w, h, 12); ctx.stroke(); }
    ctx.font = font; ctx.fillStyle = fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    wl.lines.forEach((l, i) => ctx.fillText(l, bx + 12, by + 7 + 9.5 + i * 19));
    ctx.restore();
  }


  /* =========================================================
     카드 끌어 놓기 도우미 (분류 · 순서도 · 계획서)
     - 들면: 그림자 커짐 + 1.04배 + 가로 속도에 따라 ±6° 기울기
     - 맞으면: easeOutBack 280 ms 착 붙기 + 초록 고리 + 반짝이 10개 + tick
     - 틀리면: ±6 px 300 ms 흔들림 → 스프링 복귀 + 빨간 테두리 + 말풍선 2.5 s
     ========================================================= */
  function makeDeck(opts) {
    const deck = { cards: [], drag: null, hoverT: null, opts };
    deck.add = (c) => {
      Object.assign(c, { x: c.hx, y: c.hy, tilt: 0, lift: 0, shake: 0, flash: 0, vx: 0, placed: false, ret: false, alpha: 1, sc: 1 });
      deck.cards.push(c);
      return c;
    };
    deck.clear = () => { deck.cards.length = 0; deck.drag = null; deck.hoverT = null; };
    deck.hit = (p) => {
      for (let i = deck.cards.length - 1; i >= 0; i--) {
        const c = deck.cards[i];
        if (!c.placed && !c.hidden && c.alpha > 0.5 && inR(p, c, 4)) return c;
      }
      return null;
    };
    deck.down = (p) => {
      const c = deck.hit(p);
      if (!c) return false;
      deck.drag = { c, ox: p.x - c.x, oy: p.y - c.y, sx: p.x, sy: p.y, moved: 0 };
      c.tx = c.x; c.ty = c.y; c.dragging = true; c.ret = false; c.shake = 0;
      deck.cards.splice(deck.cards.indexOf(c), 1); deck.cards.push(c);
      Sound.click();
      return true;
    };
    deck.move = (p) => {
      const d = deck.drag;
      if (!d) return;
      d.moved = Math.max(d.moved, Math.hypot(p.x - d.sx, p.y - d.sy));
      d.c.tx = clamp(p.x - d.ox, -d.c.w * 0.3, LAY.W - d.c.w * 0.7);
      d.c.ty = clamp(p.y - d.oy, -d.c.h * 0.3, LAY.H - d.c.h * 0.7);
      deck.hoverT = opts.findTarget ? opts.findTarget(d.c, { x: d.c.tx + d.c.w / 2, y: d.c.ty + d.c.h / 2 }, p) : null;
    };
    deck.up = (p) => {
      const d = deck.drag;
      if (!d) return;
      deck.drag = null; deck.hoverT = null;
      const c = d.c;
      c.dragging = false;
      if (d.moved < 10) { c.x = c.tx = c.x; deck.resolve(c, opts.onTap ? opts.onTap(c) : null); return; }
      c.x = c.tx; c.y = c.ty;
      deck.resolve(c, opts.onDrop(c, { x: c.x + c.w / 2, y: c.y + c.h / 2 }, p));
    };
    deck.resolve = (c, res) => {
      if (res && res.ok) {
        c.placed = res.lock !== false;
        const to = { x: res.x, y: res.y };
        if (res.w) { to.w = res.w; to.h = res.h; }
        SciSim.tween(c, to, { duration: 0.28, ease: 'outBack', onDone: () => res.done && res.done(c) });
        const cx = res.x + (res.w || c.w) / 2, cy = res.y + (res.h || c.h) / 2;
        if (!res.quiet) { ringFx(cx, cy, COL.good, 18); sparkle(cx, cy, 10); Sound.tick(); }
      } else if (res && res.msg) {
        c.shake = 0.3; c.flash = 0.9; c.ret = true;
        bubble(res.bx != null ? res.bx : c.x + c.w / 2, res.by != null ? res.by : c.y, res.msg, { kind: 'bad', tag: 'deck' });
        softFail();
        res.after && res.after(c);
      } else {
        c.ret = true;
      }
    };
    deck.update = (dt) => {
      const k = 1 - Math.exp(-18 * dt);
      deck.cards.forEach((c) => {
        const px = c.x;
        if (c.dragging) {
          c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k;
          c.lift = Math.min(1, c.lift + dt * 7);
        } else {
          c.lift = Math.max(0, c.lift - dt * 6);
          if (c.ret && c.shake <= 0) {
            const k2 = 1 - Math.exp(-12 * dt);
            c.x += (c.hx - c.x) * k2; c.y += (c.hy - c.y) * k2;
            if (Math.abs(c.x - c.hx) < 0.5 && Math.abs(c.y - c.hy) < 0.5) { c.x = c.hx; c.y = c.hy; c.ret = false; }
          }
        }
        if (dt > 0) c.vx = c.vx * 0.7 + ((c.x - px) / dt) * 0.3;
        const tiltT = c.dragging && !RM ? clamp(c.vx / 700, -1, 1) * 0.105 : 0;
        c.tilt += (tiltT - c.tilt) * Math.min(1, dt * 12);
        c.shake = Math.max(0, c.shake - dt);
        c.flash = Math.max(0, c.flash - dt);
      });
    };
    deck.draw = (paint) => {
      const list = deck.cards.filter((c) => !c.hidden);
      list.forEach((c) => {
        if (c.alpha <= 0.01) return;
        const sx = c.shake > 0 && !RM ? Math.sin(c.shake * 60) * 6 * (c.shake / 0.3) : 0;
        const cx = c.x + c.w / 2 + sx, cy = c.y + c.h / 2;
        const s = (1 + 0.04 * c.lift) * c.sc;
        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.translate(cx, cy); ctx.rotate(c.tilt); ctx.scale(s, s);
        ctx.shadowColor = 'rgba(20,40,80,' + (0.18 + 0.1 * c.lift) + ')';
        ctx.shadowBlur = c.placed ? 4 : 14 + 8 * c.lift; ctx.shadowOffsetY = c.placed ? 1 : 5 + 5 * c.lift;
        paint(c, -c.w / 2, -c.h / 2, c.w, c.h, true);
        ctx.shadowColor = 'transparent';
        paint(c, -c.w / 2, -c.h / 2, c.w, c.h, false);
        if (c.flash > 0) {
          const on = Math.floor(c.flash * 8) % 2 === 0;
          if (on) { ctx.strokeStyle = COL.bad; ctx.lineWidth = 3; rr(-c.w / 2, -c.h / 2, c.w, c.h, 12); ctx.stroke(); }
        }
        ctx.restore();
      });
    };
    return deck;
  }
  /* 기본 카드 모양: 흰 카드 + 색 띠 */
  function cardBase(x, y, w, h, o) {
    o = o || {};
    ctx.fillStyle = o.bg || '#fff'; rr(x, y, w, h, 12); ctx.fill();
  }

  function drawStamp(x, y, text, p, color, rot, scale) {
    if (p <= 0) return;
    const sc = (RM ? 1 : 1.8 - 0.8 * p) * (scale || 1);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
    ctx.globalAlpha = clamp(p * 1.4, 0, 1);
    // 잉크 번짐 원
    if (!RM && p > 0.5) { const k = clamp((p - 0.5) * 2, 0, 1); ctx.fillStyle = rgba(color, 0.12 * (1 - k * 0.6)); ctx.beginPath(); ctx.arc(0, 0, 40 + 40 * k, 0, TAU); ctx.fill(); }
    ctx.font = fj(24);
    const w = ctx.measureText(text).width + 30, h = 46;
    ctx.strokeStyle = color; ctx.lineWidth = 3.5; rr(-w / 2, -h / 2, w, h, 10); ctx.stroke();
    ctx.lineWidth = 1.5; rr(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 7); ctx.stroke();
    ctx.fillStyle = rgba(color, 0.08); rr(-w / 2, -h / 2, w, h, 10); ctx.fill();
    txt(text, 0, 2, fj(24), color);
    ctx.restore();
  }


  /* =========================================================
     ⚡ 마을 에너지 모형 (순수 함수) — 그래프·판정·애니메이션이 모두 같은 결과를 쓴다
     집 6채 · 태양광(지붕 1곳 = 3 kW) · 소형 풍력 1대 · 에너지 저장 장치 40 kWh · 부족분은 석탄 발전
     시간: 08시 → 다음 날 08시, 1시간을 5분 단위 12단계로 나눠 계산한다.
     kWh는 ‘전기량’ 라벨로만 쓰고 계산 문제는 내지 않는다(중2 [9과14-03]).
     ========================================================= */
  const HOUSES_N = 6, ESS_CAP = 40, ESS_MAX = 10, CO2_PER_KWH = 0.9, STEPS = 12, DAY_STEPS = 24 * STEPS;
  const demandHouse = (hod) => (hod <= 6 ? 0.25 : hod <= 8 ? 0.5 : hod <= 17 ? 0.3 : hod <= 22 ? 0.8 : 0.4);
  const solarRoof = (h, cloudy) => (h < 6 || h > 19 ? 0 : 1.8 * Math.sin(Math.PI * (h - 6) / 13) * (cloudy ? 0.25 : 1));
  const windFactor = (t) => 1 + 0.18 * Math.sin(TAU * 3 * t / 24) + 0.08 * Math.sin(TAU * 7 * t / 24 + 2.0) + 0.04 * Math.sin(TAU * 13 * t / 24 + 4.0);
  const windKW = (t, cloudy) => (cloudy ? 1.0 : 0.6) * windFactor(t);       // 하루 평균은 맑은 날 0.6 kW · 흐린 날 1.0 kW, 출렁임 ±30 %
  /* 실천 카드: 개인(👤)은 전기 사용 6 %↓ × 2장, 사회(🏛️)는 태양광 25 %↑ · 전기 사용 8 %↓ */
  const CARD_FX = {
    plug: { who: 'indiv', d: 0.94 }, ac: { who: 'indiv', d: 0.94 },
    sub: { who: 'social', s: 1.25 }, eff: { who: 'social', d: 0.92 },
  };
  function simulateDay(cfg) {
    cfg = cfg || {};
    const solar = cfg.solar || 0, wind = cfg.wind ? 1 : 0, ess = !!cfg.ess, cloudy = !!cfg.cloudy, cards = cfg.cards || {};
    let dmul = 1, smul = 1;
    for (const k in CARD_FX) if (cards[k]) { if (CARD_FX[k].d) dmul *= CARD_FX[k].d; if (CARD_FX[k].s) smul *= CARD_FX[k].s; }
    const n = DAY_STEPS, dt = 1 / STEPS;
    const R = { n, dt, dem: new Float32Array(n), sol: new Float32Array(n), win: new Float32Array(n), dis: new Float32Array(n), chg: new Float32Array(n), coal: new Float32Array(n), soc: new Float32Array(n), curt: new Float32Array(n), cfg: { solar, wind, ess, cloudy, cards: Object.assign({}, cards) } };
    const T = { coal: 0, solar: 0, wind: 0, demand: 0, dis: 0, chg: 0, curt: 0 };
    let soc = 0;
    for (let i = 0; i < n; i++) {
      const t = i * dt, hAbs = 8 + t, hod = Math.floor(hAbs) % 24, hMid = (hAbs + dt / 2) % 24;
      const dem = HOUSES_N * demandHouse(hod) * dmul;
      const sol = solar * solarRoof(hMid, cloudy) * smul;
      const win = wind * windKW(t + dt / 2, cloudy);
      const net = sol + win - dem;
      let dis = 0, chg = 0, coal = 0, curt = 0;
      if (net >= 0) {
        if (ess) { chg = Math.min(net, ESS_MAX, (ESS_CAP - soc) / dt); soc += chg * dt; }
        curt = net - chg;
      } else {
        let need = -net;
        if (ess) { dis = Math.min(need, ESS_MAX, soc / dt); soc -= dis * dt; need -= dis; }
        coal = need;
      }
      R.dem[i] = dem; R.sol[i] = sol; R.win[i] = win; R.dis[i] = dis; R.chg[i] = chg; R.coal[i] = coal; R.soc[i] = soc; R.curt[i] = curt;
      T.coal += coal * dt; T.solar += sol * dt; T.wind += win * dt; T.demand += dem * dt; T.dis += dis * dt; T.chg += chg * dt; T.curt += curt * dt;
    }
    T.co2 = T.coal * CO2_PER_KWH;
    R.total = T;
    return R;
  }
  /* 켜 둔 카드 개수(개인 / 사회) */
  const cardCount = (cards) => { let a = 0, b = 0; for (const k in CARD_FX) if (cards && cards[k]) { if (CARD_FX[k].who === 'indiv') a++; else b++; } return { indiv: a, social: b }; };

  /* =========================================================
     상태 · 패널(장면 배치)
     같은 마을을 단계마다 다르게 배치한다: 패널의 위치·크기를 easeInOutCubic 700 ms로 보간
     ========================================================= */
  const S = {
    view: 'meters', sortOn: false, t: 0, dt: 0.016, booted: false,
    // ① 문제 인식
    year: 2025, yr: 2025, tapped: {}, tankFlash: { oil: 0, gas: 0, coal: 0 }, tankLevel: { oil: 1, gas: 1, coal: 1 }, tankEmptyAt: { oil: -1, gas: -1, coal: -1 },
    bags: [], bagBorn: 0, co2: 425, haze: 0.05,
    // ② 과학기술
    build: { solar: [false, false, false, false, false, false], wind: false, ess: false },
    weather: 'clear', cards: { plug: false, ac: false, sub: false, eff: false },
    run: null, lastRun: null, runs: [], runAfterInstall: false, runSpeed: 2, chipT: -99,
    sa: [0, 1, 2, 3, 4, 5].map(() => ({ dy: -60, al: 0 })), ta: { rise: 0, blade: 0, ang: 0 }, ea: { y: -90, a: 0, soc: 0 },
    shakeT: -9, schoolA: { dy: -40, al: 0 }, sw: { plug: 0, ac: 0, sub: 0, eff: 0 },
    // 효과
    smoke: [], puffs: [], dots: [], dotAcc: {}, carT: 0,
    bars: [0, 0, 0], barTarget: [0, 0, 0],
  };
  let game = null;
  let F = new Set();
  const has = (n) => (game ? game.has(n) : F.has(n));
  const isNew = (n) => !!(game && game.isNew(n));
  const level = () => (game ? game.level : 0);
  const freeMode = () => !!(game && game.free);

  const PAN = {
    vil: { x: 0, y: 0, w: 800, h: 384, a: 1 }, dash: { x: 8, y: 392, w: 784, h: 200, a: 1 }, graph: { x: 8, y: 392, w: 784, h: 200, a: 0 },
    cards: { x: 820, y: 8, w: 220, h: 376, a: 0 }, hist: { x: 810, y: 392, w: 236, h: 200, a: 0 }, plan: { a: 0 }, sort: { a: 0 },
  };
  const TARGETS = {
    wide: {
      meters: { vil: { x: 0, y: 0, w: 800, h: 384, a: 1 }, dash: { x: 8, y: 392, w: 784, h: 200, a: 1 }, graph: { x: 8, y: 392, w: 784, h: 200, a: 0 }, cards: { x: 820, y: 8, w: 220, h: 376, a: 0 }, hist: { x: 810, y: 392, w: 236, h: 200, a: 0 }, plan: { a: 0 } },
      power: { vil: { x: 0, y: 0, w: 800, h: 384, a: 1 }, dash: { x: 8, y: 392, w: 784, h: 200, a: 0 }, graph: { x: 8, y: 392, w: 784, h: 200, a: 1 }, cards: { x: 820, y: 8, w: 220, h: 376, a: 0 }, hist: { x: 810, y: 392, w: 236, h: 200, a: 0 }, plan: { a: 0 } },
      cards: { vil: { x: 0, y: 0, w: 560, h: 384, a: 1 }, dash: { x: 8, y: 392, w: 784, h: 200, a: 0 }, graph: { x: 8, y: 392, w: 540, h: 200, a: 1 }, cards: { x: 572, y: 8, w: 220, h: 376, a: 1 }, hist: { x: 556, y: 392, w: 236, h: 200, a: 1 }, plan: { a: 0 } },
      plan: { vil: { x: 0, y: 0, w: 800, h: 384, a: 0 }, dash: { x: 8, y: 392, w: 784, h: 200, a: 0 }, graph: { x: 8, y: 392, w: 784, h: 200, a: 0 }, cards: { x: 820, y: 8, w: 220, h: 376, a: 0 }, hist: { x: 810, y: 392, w: 236, h: 200, a: 0 }, plan: { a: 1 } },
    },
    tall: {
      meters: { vil: { x: 0, y: 0, w: 480, h: 450, a: 1 }, dash: { x: 6, y: 458, w: 468, h: 356, a: 1 }, graph: { x: 6, y: 458, w: 468, h: 356, a: 0 }, cards: { x: 500, y: 6, w: 180, h: 264, a: 0 }, hist: { x: 6, y: 830, w: 468, h: 228, a: 0 }, plan: { a: 0 } },
      power: { vil: { x: 0, y: 0, w: 480, h: 450, a: 1 }, dash: { x: 6, y: 458, w: 468, h: 356, a: 0 }, graph: { x: 6, y: 458, w: 468, h: 356, a: 1 }, cards: { x: 500, y: 6, w: 180, h: 264, a: 0 }, hist: { x: 6, y: 830, w: 468, h: 228, a: 0 }, plan: { a: 0 } },
      cards: { vil: { x: 0, y: 0, w: 288, h: 270, a: 1 }, dash: { x: 6, y: 458, w: 468, h: 356, a: 0 }, graph: { x: 6, y: 278, w: 468, h: 300, a: 1 }, cards: { x: 294, y: 6, w: 180, h: 264, a: 1 }, hist: { x: 6, y: 586, w: 468, h: 228, a: 1 }, plan: { a: 0 } },
      plan: { vil: { x: 0, y: 0, w: 480, h: 450, a: 0 }, dash: { x: 6, y: 458, w: 468, h: 356, a: 0 }, graph: { x: 6, y: 458, w: 468, h: 356, a: 0 }, cards: { x: 500, y: 6, w: 180, h: 264, a: 0 }, hist: { x: 6, y: 830, w: 468, h: 228, a: 0 }, plan: { a: 1 } },
    },
  };
  /* 장면(view) 전환: 'meters' 지구 계기판 · 'power' 마을 전기 · 'cards' 마을 + 실천 카드 · 'plan' 실천 계획 */
  function goView(name, instant) {
    if (!TARGETS[LAY.kind][name]) return;
    if (S.run && name !== S.view) { S.run = null; S.dots.length = 0; }
    S.view = name;
    const T = TARGETS[LAY.kind][name];
    for (const k in T) {
      if (instant || !S.booted) Object.assign(PAN[k], T[k]);
      else SciSim.tween(PAN[k], T[k], { duration: 0.7, ease: 'inOutCubic' });
    }
    syncDom();
  }
  function setSort(on) {
    S.sortOn = !!on;
    if (!S.booted) PAN.sort.a = on ? 1 : 0; else SciSim.tween(PAN.sort, { a: on ? 1 : 0 }, { duration: 0.45, ease: 'outCubic' });
    syncDom();
  }
  const inPanel = (p, P, pad) => inR(p, P, pad || 0);


  /* =========================================================
     🏘️ 마을: 세계 좌표 · 정적 그림(캐시) · 하늘 · 집 · 전선
     ========================================================= */
  const PALETTE = [
    { wall: '#ffe3c2', roof: '#c7573b' }, { wall: '#d6ecff', roof: '#3e6fb5' }, { wall: '#ffd6d9', roof: '#8a5a9e' },
    { wall: '#e3f5d3', roof: '#2f9e72' }, { wall: '#fff0b8', roof: '#d9822b' }, { wall: '#e6dcff', roof: '#4a5568' },
  ];
  const GEOM = {};
  function villageGeom(kind) {
    if (GEOM[kind]) return GEOM[kind];
    let V;
    if (kind === 'wide') {
      const houses = [];
      for (let i = 0; i < 6; i++) houses.push({ i, x: 130 + 92 * i, y: 278, w: 68, wh: 36, rh: 30 });
      V = {
        kind, W: 800, H: 384, hor: 240, houses,
        hill: { x: 52, y: 276, w: 210, h: 78 }, turbine: { x: 54, y: 200, tower: 68, blade: 32 },
        plant: { x: 722, y: 278, w: 76, h: 46, chx: 782, chw: 12, chtop: 116, st2x: 754, st2top: 208 },
        ess: { cx: 674, y: 280, w: 76 }, school: { x: 30, y: 376, w: 104 }, landfill: { x: 618, y: 380, w: 170 },
        road: { y0: 290, y1: 316 }, line: { y: 184, x0: 54, x1: 748, poles: [54, 176, 360, 544, 748], sag: 8 },
        trees: [[100, 296, 0.9], [210, 300, 0.7], [320, 298, 0.8], [412, 296, 0.75], [504, 298, 0.8], [596, 298, 0.7], [160, 338, 1], [262, 346, 0.85], [372, 342, 0.95], [470, 348, 0.8], [560, 344, 0.9]],
        carLane: [299, 311],
      };
    } else {
      const houses = [];
      const cols = [84, 192, 300];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) houses.push({ i: r * 3 + c, x: cols[c], y: r ? 366 : 270, w: 76, wh: 38, rh: 30, row: r, col: c });
      V = {
        kind, W: 480, H: 450, hor: 208, houses,
        hill: { x: 50, y: 214, w: 150, h: 62 }, turbine: { x: 52, y: 156, tower: 62, blade: 30 },
        plant: { x: 402, y: 198, w: 74, h: 44, chx: 458, chw: 12, chtop: 54, st2x: 428, st2top: 140 },
        ess: { cx: 384, y: 370, w: 76 }, school: { x: 22, y: 442, w: 100 }, landfill: { x: 318, y: 448, w: 152 },
        road: { y0: 380, y1: 404 }, line: { y: 146, x0: 52, x1: 452, poles: [52, 246, 452], sag: 6 },
        trees: [[28, 262, 0.8], [140, 268, 0.6], [248, 270, 0.7], [352, 264, 0.8], [30, 358, 0.8], [140, 362, 0.65], [250, 364, 0.7], [440, 300, 0.8], [440, 340, 0.7], [180, 430, 0.9], [280, 436, 0.8]],
        carLane: [389, 399],
      };
    }
    // 전선 곡선: 기둥 사이로 처진다
    V.lineY = (x) => {
      const P = V.line.poles; let k = 0;
      while (k < P.length - 2 && x > P[k + 1]) k++;
      const a = P[k], b = P[k + 1], u = clamp((x - a) / (b - a), 0, 1);
      return V.line.y + V.line.sag * 4 * u * (1 - u) * clamp((b - a) / 180, 0.5, 1.1);
    };
    V.linePts = [];
    for (let x = V.line.x0; x <= V.line.x1 + 0.1; x += 6) V.linePts.push({ x, y: V.lineY(x) });
    // 집마다 전선(내려오는 선 · 올라가는 선)
    V.houses.forEach((h) => {
      const eave = h.y - h.wh;
      if (kind === 'wide' || h.row === 0) {
        h.dropPts = [{ x: h.x - 22, y: V.lineY(h.x - 22) }, { x: h.x - 22, y: eave - 6 }];
        h.feedPts = [{ x: h.x + 14, y: eave - h.rh + 2 }, { x: h.x + 14, y: V.lineY(h.x + 14) }];
      } else {
        const gx = h.x + 54;
        h.dropPts = [{ x: gx - 4, y: V.lineY(gx - 4) }, { x: gx - 4, y: eave - 8 }, { x: h.x + h.w / 2 + 2, y: eave - 8 }];
        h.feedPts = [{ x: h.x + 16, y: eave - h.rh + 2 }, { x: gx + 4, y: eave - 14 }, { x: gx + 4, y: V.lineY(gx + 4) }];
      }
      h.winL = { x: h.x - 25, y: h.y - h.wh + 8, w: 15, h: 15 };
      h.winR = { x: h.x + 10, y: h.y - h.wh + 8, w: 15, h: 15 };
    });
    V.turbine.hubY = V.turbine.y - V.turbine.tower;
    V.plant.top = V.plant.y - V.plant.h;
    V.entry = { wind: { x: V.turbine.x, y: V.lineY(V.turbine.x) }, coal: { x: V.line.x1, y: V.lineY(V.line.x1) }, ess: { x: V.ess.cx, y: V.lineY(V.ess.cx) } };
    V.feeds = {
      coal: [{ x: V.line.x1, y: V.plant.top + 2 }, V.entry.coal],
      ess: [{ x: V.ess.cx, y: V.ess.y - 30 }, V.entry.ess],
    };
    V.xc = (V.houses[0].x + V.houses[V.houses.length === 6 ? (kind === 'wide' ? 5 : 2) : 0].x) / 2 + (kind === 'wide' ? 0 : 20);
    GEOM[kind] = V;
    return V;
  }
  /* 월드 좌표 ↔ 캔버스 좌표 (패널 사각형에 맞춰 같은 비율로 줄이고 아래쪽에 붙인다) */
  function villageCam(R, V) {
    const s = Math.min(R.w / V.W, R.h / V.H);
    return { s, ox: R.x + (R.w - V.W * s) / 2, oy: R.y + R.h - V.H * s };
  }
  const toWorld = (p, cam) => ({ x: (p.x - cam.ox) / cam.s, y: (p.y - cam.oy) / cam.s });

  /* ---- 정적 그림: 먼 산 · 풀밭 · 길 · 집 몸체 · 발전소 · 기둥 ---- */
  function paintTree(x, y, s, shadeK) {
    contactShadow(x + 3, y + 2, 15 * s, 4 * s, 0.2);
    ctx.fillStyle = '#7a5a3c'; ctx.fillRect(x - 2.2 * s, y - 16 * s, 4.4 * s, 16 * s);
    const g = ctx.createRadialGradient(x - 5 * s, y - 32 * s, 2, x, y - 26 * s, 20 * s);
    g.addColorStop(0, '#8fdc7a'); g.addColorStop(1, shadeK ? '#3f9a52' : '#4cae5a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 27 * s, 13 * s, 0, TAU); ctx.arc(x - 9 * s, y - 20 * s, 9 * s, 0, TAU); ctx.arc(x + 9 * s, y - 20 * s, 9 * s, 0, TAU); ctx.fill();
  }
  function paintHouseBody(h, pal) {
    const x = h.x, y = h.y, w = h.w, wh = h.wh, rh = h.rh;
    contactShadow(x + 8, y + 3, w * 0.66, 6, 0.24);
    // 벽 + 오른쪽 옆면(입체감)
    const wg = ctx.createLinearGradient(0, y - wh, 0, y); wg.addColorStop(0, SciSim.color.shade(pal.wall, 0.12)); wg.addColorStop(1, pal.wall);
    ctx.fillStyle = wg; rr(x - w / 2, y - wh, w, wh, 2.5); ctx.fill();
    ctx.fillStyle = SciSim.color.shade(pal.wall, -0.16); ctx.beginPath(); ctx.moveTo(x + w / 2, y - wh); ctx.lineTo(x + w / 2 + 8, y - wh - 5); ctx.lineTo(x + w / 2 + 8, y - 5); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill();
    // 굴뚝
    ctx.fillStyle = '#9a6a55'; ctx.fillRect(x - w / 2 + 10, y - wh - rh - 8, 9, rh + 8); ctx.fillStyle = '#7d5242'; ctx.fillRect(x - w / 2 + 8, y - wh - rh - 10, 13, 4);
    // 지붕(앞면 + 옆면)
    const rg = ctx.createLinearGradient(0, y - wh - rh, 0, y - wh); rg.addColorStop(0, SciSim.color.shade(pal.roof, 0.18)); rg.addColorStop(1, pal.roof);
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x - w / 2 - 5, y - wh); ctx.lineTo(x + w / 2 + 5, y - wh); ctx.lineTo(x + w / 2 - 9, y - wh - rh); ctx.lineTo(x - w / 2 + 9, y - wh - rh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SciSim.color.shade(pal.roof, -0.28); ctx.beginPath(); ctx.moveTo(x + w / 2 + 5, y - wh); ctx.lineTo(x + w / 2 + 13, y - wh - 5); ctx.lineTo(x + w / 2 - 1, y - wh - rh - 5); ctx.lineTo(x + w / 2 - 9, y - wh - rh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(x - w / 2 - 5, y - wh, w + 10, 3);
    // 문
    ctx.fillStyle = '#8a5a3c'; rr(x - 7, y - 22, 14, 22, 2); ctx.fill(); ctx.fillStyle = '#ffd84d'; ctx.beginPath(); ctx.arc(x + 3.5, y - 11, 1.3, 0, TAU); ctx.fill();
    // 창틀
    [h.winL, h.winR].forEach((wd) => { ctx.fillStyle = '#fff'; rr(wd.x - 2, wd.y - 2, wd.w + 4, wd.h + 4, 2); ctx.fill(); });
  }
  function paintPlant(V) {
    const P = V.plant;
    contactShadow(P.x + P.w / 2, P.y + 3, P.w * 0.7, 6, 0.25);
    // 굴뚝(붉은 흰 줄무늬)
    const stripe = (cx, w, top, base) => {
      for (let yy = top; yy < base; yy += 14) { ctx.fillStyle = ((yy - top) / 14) % 2 < 1 ? '#d9dde4' : '#d2503f'; ctx.fillRect(cx - w / 2, yy, w, Math.min(14, base - yy)); }
      ctx.fillStyle = '#2d3440'; ctx.fillRect(cx - w / 2 - 1.5, top - 3, w + 3, 4);
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(cx - w / 2 + 1.5, top, 2.2, base - top);
    };
    stripe(P.chx, P.chw, P.chtop, P.y - 4); stripe(P.st2x, 9, P.st2top, P.y - 4);
    // 건물
    const bg = ctx.createLinearGradient(0, P.top, 0, P.y); bg.addColorStop(0, '#d0705a'); bg.addColorStop(1, '#a8503d');
    ctx.fillStyle = bg; ctx.fillRect(P.x, P.top, P.w, P.h);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let yy = P.top + 6; yy < P.y; yy += 7) ctx.fillRect(P.x, yy, P.w, 1);
    ctx.fillStyle = '#5a6272'; ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(P.x + k * (P.w / 4), P.top); ctx.lineTo(P.x + k * (P.w / 4) + P.w / 8, P.top - 11); ctx.lineTo(P.x + (k + 1) * (P.w / 4), P.top); } ctx.fill();
    ctx.fillStyle = '#2d3440'; ctx.fillRect(P.x + 8, P.y - 20, 18, 20);
    ctx.fillStyle = '#ffe9a8'; for (let k = 0; k < 3; k++) ctx.fillRect(P.x + 32 + k * 14, P.top + 10, 9, 10);
    // 변압기 상자
    ctx.fillStyle = '#7d8794'; ctx.fillRect(P.x - 16, P.y - 14, 14, 14); ctx.fillStyle = '#3a4150'; ctx.fillRect(P.x - 14, P.y - 11, 10, 3);
  }
  function paintVillageStatic() {
    const V = villageGeom(LAY.kind), W = V.W, H = V.H;
    // 먼 산 3겹
    const hill = (col, base, amp, f, ph) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, base); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, base - amp * (0.55 + 0.45 * Math.sin(x * f + ph)) - amp * 0.25 * Math.sin(x * f * 2.3 + ph * 2)); ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); };
    hill('#cfe1ee', V.hor - 18, 44, 0.0085, 0.4); hill('#bcd9cf', V.hor - 4, 34, 0.011, 2.0); hill('#a9d3a0', V.hor + 8, 24, 0.014, 4.1);
    // 풀밭(뒤) · 길 · 풀밭(앞)
    const mg = ctx.createLinearGradient(0, V.hor, 0, V.road.y0); mg.addColorStop(0, '#9bd68c'); mg.addColorStop(1, '#86c97a');
    ctx.fillStyle = mg; ctx.fillRect(0, V.hor, W, V.road.y0 - V.hor + 1);
    const fg = ctx.createLinearGradient(0, V.road.y1, 0, H); fg.addColorStop(0, '#85c879'); fg.addColorStop(1, '#6db667');
    ctx.fillStyle = fg; ctx.fillRect(0, V.road.y1, W, H - V.road.y1);
    // 바람 언덕
    const Hl = V.hill, hg = ctx.createLinearGradient(0, Hl.y - Hl.h, 0, Hl.y); hg.addColorStop(0, '#a7dd95'); hg.addColorStop(1, '#8cc97d');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(Hl.x - Hl.w / 2, Hl.y); ctx.quadraticCurveTo(Hl.x - Hl.w * 0.18, Hl.y - Hl.h * 1.25, Hl.x + Hl.w * 0.12, Hl.y - Hl.h); ctx.quadraticCurveTo(Hl.x + Hl.w * 0.4, Hl.y - Hl.h * 0.7, Hl.x + Hl.w / 2, Hl.y); ctx.closePath(); ctx.fill();
    // 길
    const rg = ctx.createLinearGradient(0, V.road.y0, 0, V.road.y1); rg.addColorStop(0, '#6b7385'); rg.addColorStop(1, '#575f70');
    ctx.fillStyle = rg; ctx.fillRect(0, V.road.y0, W, V.road.y1 - V.road.y0);
    ctx.fillStyle = '#d9dde4'; ctx.fillRect(0, V.road.y0, W, 2); ctx.fillRect(0, V.road.y1 - 2, W, 2);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; const cy = (V.road.y0 + V.road.y1) / 2; for (let x = 8; x < W; x += 42) ctx.fillRect(x, cy - 1, 22, 2);
    // 나무(뒤쪽)
    V.trees.filter((t) => t[1] < V.road.y0).forEach((t) => paintTree(t[0], t[1], t[2], false));
    // 전선 기둥(가운데 기둥만: 양끝은 풍력·발전소)
    V.line.poles.slice(1, -1).forEach((px) => {
      ctx.fillStyle = '#6b5a46'; ctx.fillRect(px - 2.5, V.line.y - 6, 5, V.road.y0 - V.line.y - 14);
      ctx.fillStyle = '#7d6a54'; ctx.fillRect(px - 14, V.line.y - 4, 28, 3.5);
      ctx.fillStyle = '#cdd6e3'; [-11, 11].forEach((d) => ctx.fillRect(px + d - 1.5, V.line.y - 8, 3, 5));
    });
    // 집 몸체(뒤 줄 먼저)
    V.houses.slice().sort((a, b) => a.y - b.y).forEach((h) => paintHouseBody(h, PALETTE[h.i % 6]));
    paintPlant(V);
    // 창고 부지(저장 장치 자리): 콘크리트 판
    const E = V.ess, eg = ctx.createLinearGradient(0, E.y - 10, 0, E.y + 6); eg.addColorStop(0, '#c9cfd8'); eg.addColorStop(1, '#a9b1be');
    ctx.fillStyle = eg; rr(E.cx - E.w / 2, E.y - 8, E.w, 14, 3); ctx.fill();
    // 학교
    const Sc = V.school;
    contactShadow(Sc.x + Sc.w / 2 + 6, Sc.y + 2, Sc.w * 0.6, 5, 0.22);
    ctx.fillStyle = '#f6d58b'; rr(Sc.x, Sc.y - 30, Sc.w, 30, 2); ctx.fill();
    ctx.fillStyle = '#c9524a'; ctx.beginPath(); ctx.moveTo(Sc.x - 6, Sc.y - 30); ctx.lineTo(Sc.x + Sc.w + 6, Sc.y - 30); ctx.lineTo(Sc.x + Sc.w - 8, Sc.y - 48); ctx.lineTo(Sc.x + 8, Sc.y - 48); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; for (let k = 0; k < 4; k++) ctx.fillRect(Sc.x + 10 + k * 22, Sc.y - 24, 12, 11);
    ctx.fillStyle = '#7a5a3c'; ctx.fillRect(Sc.x + Sc.w / 2 - 6, Sc.y - 16, 12, 16);
    ctx.fillStyle = '#6b5a46'; ctx.fillRect(Sc.x + Sc.w + 14, Sc.y - 40, 2.5, 40); ctx.fillStyle = '#3867f4'; ctx.fillRect(Sc.x + Sc.w + 16.5, Sc.y - 40, 14, 9);
    // 앞쪽 나무
    V.trees.filter((t) => t[1] >= V.road.y1).forEach((t) => paintTree(t[0], t[1], t[2], true));
  }

  /* ---- 시간 · 하늘 ---- */
  const SKY_KEYS = [[8, '#bfe6ff'], [12, '#8fd3ff'], [18, '#ffb38a'], [20, '#3b3f8f'], [24, '#0b1530'], [29, '#2a2f5a'], [30, '#fdd9b5'], [32, '#bfe6ff']];
  function skyAt(tod) {
    tod = clamp(tod, 8, 32);
    for (let i = 0; i < SKY_KEYS.length - 1; i++) if (tod <= SKY_KEYS[i + 1][0]) return SciSim.color.mix(SKY_KEYS[i][1], SKY_KEYS[i + 1][1], (tod - SKY_KEYS[i][0]) / (SKY_KEYS[i + 1][0] - SKY_KEYS[i][0]));
    return SKY_KEYS[SKY_KEYS.length - 1][1];
  }
  const rgbToHex = (s) => { const m = /(\d+)\D+(\d+)\D+(\d+)/.exec(s); return '#' + [1, 2, 3].map((i) => (+m[i]).toString(16).padStart(2, '0')).join(''); };
  const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  const nightness = (tod) => (tod < 18 ? 0 : tod < 21 ? smooth(18, 21, tod) : tod < 28.5 ? 1 : 1 - smooth(28.5, 31, tod));
  const STARS = (() => { const r = mulberry32(99), a = []; for (let i = 0; i < 70; i++) a.push({ x: r(), y: r(), r: 0.6 + r() * 1.4, w: 1 + r() * 2.5, ph: r() * 6.28 }); return a; })();
  const CLOUDS = [[40, 70, 1.0, 6], [260, 40, 0.8, 9], [480, 92, 1.1, 5], [650, 56, 0.9, 7], [150, 120, 0.7, 8], [560, 130, 0.8, 6]];
  let SKYCUR = { tod: 10.5, nt: 0, cloudy: 0, hz: 0 };
  function drawSkyIn(R, V, cam, t) {
    const sk = SKYCUR, tod = sk.tod, nt = sk.nt, cl = sk.cloudy;
    let base = skyAt(tod);
    base = SciSim.color.mix(rgbToHex(base), '#aab5c2', cl * 0.55 * (1 - nt * 0.5));
    base = SciSim.color.mix(rgbToHex(base), '#cdb79c', clamp(sk.hz * 1.3, 0, 0.5));
    const top = SciSim.color.shade(rgbToHex(base), -0.2), hor = SciSim.color.mix(rgbToHex(base), '#fff4e0', 0.3 * (1 - nt));
    const g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h); g.addColorStop(0, top); g.addColorStop(1, hor);
    ctx.fillStyle = g; ctx.fillRect(R.x, R.y, R.w, R.h);
    // 월드 좌표로 그리는 하늘 장식
    ctx.save(); ctx.translate(cam.ox, cam.oy); ctx.scale(cam.s, cam.s);
    const yTop = Math.max(-cam.oy / cam.s + R.y / cam.s, 0) + 30, W = V.W;
    // 별
    if (nt > 0.05) STARS.forEach((s) => { const a = nt * (0.35 + 0.65 * (RM ? 0.8 : 0.5 + 0.5 * Math.sin(t * s.w + s.ph))) * (1 - cl * 0.7); ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x * W, yTop - 20 + s.y * (V.hor - yTop - 10), s.r, 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
    // 해
    const h24 = tod % 24, sunU = h24 >= 6 && h24 <= 19 ? (h24 - 6) / 13 : -1;
    if (sunU >= 0) {
      const sx = W * 0.5 - W * 0.42 * Math.cos(Math.PI * sunU), sy = V.hor - 10 - (V.hor - 10 - yTop) * Math.sin(Math.PI * sunU), dim = 1 - cl * 0.62;
      const warm = tod > 17 ? smooth(17, 19.5, tod) : tod < 31 && tod > 29.5 ? 1 - smooth(29.5, 31.5, tod) : 0;
      const col = SciSim.color.mix('#fff2a8', '#ff9a4a', warm);
      ctx.save(); ctx.globalAlpha = dim; halo(sx, sy, 78, rgbToHex(col), 0.42);
      if (!RM) { ctx.strokeStyle = 'rgba(255,240,170,.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + t * 0.25; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 30, sy + Math.sin(a) * 30); ctx.lineTo(sx + Math.cos(a) * (38 + 4 * Math.sin(t * 2 + k)), sy + Math.sin(a) * (38 + 4 * Math.sin(t * 2 + k))); ctx.stroke(); } }
      D.sphere(sx, sy, 24, rgbToHex(col), { gloss: false, light: '#fffbe0', dark: '#ffc94a' });
      ctx.restore();
    }
    // 달
    const mh = h24 >= 18.5 ? h24 - 18.5 : h24 <= 6.5 ? h24 + 5.5 : -1;
    if (mh >= 0) {
      const mu = clamp(mh / 12.5, 0, 1), mx = W * 0.5 - W * 0.4 * Math.cos(Math.PI * mu), my = V.hor - 10 - (V.hor - 10 - yTop) * Math.sin(Math.PI * mu);
      ctx.save(); ctx.globalAlpha = (0.2 + 0.8 * nt) * (1 - cl * 0.6); halo(mx, my, 56, '#cfe0ff', 0.3);
      ctx.fillStyle = '#fdf5d6'; ctx.beginPath(); ctx.arc(mx, my, 17, 0, TAU); ctx.fill();
      ctx.fillStyle = skyAt(clamp(tod, 22, 26)); ctx.beginPath(); ctx.arc(mx + 8, my - 4, 15, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // 구름
    const nC = cl > 0.05 ? CLOUDS.length : 2;
    for (let i = 0; i < nC; i++) {
      const c = CLOUDS[i], x = ((c[0] + t * c[3] * (RM ? 0 : 1)) % (W + 240)) - 120, y = Math.max(c[1], yTop - 16 + c[1] * 0.5), a = i < 2 ? 0.55 + 0.45 * cl : cl;
      if (a <= 0.02) continue;
      const lum = SciSim.color.mix('#ffffff', '#6f7a8f', clamp(nt * 0.8 + cl * 0.35, 0, 1));
      ctx.save(); ctx.globalAlpha = clamp(a * 0.92, 0, 1); ctx.translate(x, y); ctx.scale(c[2], c[2]);
      ctx.fillStyle = lum; ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.arc(22, -7, 23, 0, TAU); ctx.arc(48, 0, 17, 0, TAU); ctx.arc(24, 8, 19, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /* =========================================================
     🏘️ 마을: 움직이는 것들 (창문 · 태양광 판 · 풍력 · 저장 장치 · 전선 · 에너지 점 · 연기 · 자동차 · 쓰레기)
     ========================================================= */
  const SRC_COL = { solar: '#fbbf24', wind: '#14b8a6', ess: '#8b5cf6', coal: '#6b7280' };
  function add(fn) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); }
  function halo(x, y, r, color, a) {
    if (r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(0.45, rgba(color, a * 0.4)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  const approachV = (cur, target, dt, rate) => target + (cur - target) * Math.exp(-rate * dt);
  function strokePts(pts, col, w) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
  }

  /* ---- 길(polyline) 위를 달리는 에너지 점 ---- */
  function mkPath(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    return { pts, cum, len: cum[cum.length - 1] };
  }
  function pathAt(P, d) {
    const c = P.cum; let i = 1;
    while (i < c.length - 1 && c[i] < d) i++;
    const u = clamp((d - c[i - 1]) / Math.max(1e-6, c[i] - c[i - 1]), 0, 1), a = P.pts[i - 1], b = P.pts[i];
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  }
  const sliceLine = (V, xa, xb) => { // 주 전선의 xa → xb 구간(방향 포함)
    const out = V.linePts.filter((p) => p.x >= Math.min(xa, xb) - 0.01 && p.x <= Math.max(xa, xb) + 0.01).map((p) => ({ x: p.x, y: p.y }));
    if (xb < xa) out.reverse();
    return out;
  };
  const PATHS = {};
  function villagePaths(V) {
    if (PATHS[V.kind]) return PATHS[V.kind];
    const P = { coal: mkPath(V.feeds.coal.concat(sliceLine(V, V.entry.coal.x, V.xc))), wind: mkPath(sliceLine(V, V.entry.wind.x, V.xc)), essOut: mkPath(V.feeds.ess.concat(sliceLine(V, V.entry.ess.x, V.xc))), essIn: mkPath(sliceLine(V, V.xc, V.entry.ess.x).concat(V.feeds.ess.slice().reverse())), solar: [], drop: [] };
    V.houses.forEach((h) => { P.solar.push(mkPath(h.feedPts)); P.drop.push(mkPath(h.dropPts)); });
    PATHS[V.kind] = P;
    return P;
  }
  function emitDot(key, path, kw, col, dir) {
    if (S.dots.length > 220) return;
    S.dots.push({ P: path, d: 0, v: 44 + 22 * kw, col, key });
  }
  function emitFlows(V, dt, fl) {
    // fl: { sol(kW 지붕 1곳), win, dis, chg, coal, dem(집 1채), mix: [태양광, 풍력, 방전, 석탄] 비율, chgMix }
    const P = villagePaths(V), acc = S.dotAcc;
    const go = (key, rate, path, kw, colFn) => { acc[key] = (acc[key] || 0) + rate * dt; while (acc[key] >= 1) { acc[key] -= 1; emitDot(key, path, kw, typeof colFn === 'function' ? colFn() : colFn); } };
    const rate = (kw) => (kw < 0.02 ? 0 : clamp(1.1 + kw * 2.6, 0, 14));
    const pick = (w) => { let r = Math.random() * (w[0] + w[1] + w[2] + w[3] || 1), k = 0; while (k < 3 && r > w[k]) { r -= w[k]; k++; } return [SRC_COL.solar, SRC_COL.wind, SRC_COL.ess, SRC_COL.coal][k]; };
    V.houses.forEach((h, i) => {
      if (S.build.solar[i] && fl.sol > 0.02) go('s' + i, rate(fl.sol), P.solar[i], fl.sol, SRC_COL.solar);
      if (fl.dem > 0.02) go('d' + i, rate(fl.dem) * 0.9, P.drop[i], fl.dem, () => pick(fl.mix));
    });
    if (fl.win > 0.02 && S.build.wind) go('w', rate(fl.win), P.wind, fl.win, SRC_COL.wind);
    if (fl.coal > 0.02) go('c', rate(fl.coal), P.coal, fl.coal, SRC_COL.coal);
    if (fl.dis > 0.02 && S.build.ess) go('eo', rate(fl.dis), P.essOut, fl.dis, SRC_COL.ess);
    if (fl.chg > 0.02 && S.build.ess) go('ei', rate(fl.chg), P.essIn, fl.chg, () => (Math.random() < (fl.chgMix || 0.7) ? SRC_COL.solar : SRC_COL.wind));
  }
  function updateDots(dt) {
    for (let i = S.dots.length - 1; i >= 0; i--) { const q = S.dots[i]; q.d += q.v * dt; if (q.d >= q.P.len) S.dots.splice(i, 1); }
  }
  function drawDots() {
    ctx.lineWidth = 1.3;
    S.dots.forEach((q) => {
      const p = pathAt(q.P, q.d);
      ctx.fillStyle = q.col; ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.1, 0, TAU); ctx.fill(); ctx.stroke();
    });
  }

  /* ---- 태양광 판 · 풍력 · 저장 장치 ---- */
  const lerp2 = (a, b, u) => ({ x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u });
  function drawRoofPanel(h, a, bright, sweep, shadeA) {
    const x = h.x, eave = h.y - h.wh;
    const BL = [x - h.w / 2 + 3, eave - 4], BR = [x + h.w / 2 - 3, eave - 4], TL = [x - h.w / 2 + 13, eave - h.rh + 5], TR = [x + h.w / 2 - 13, eave - h.rh + 5];
    const P = (u, v) => { const l = lerp2(TL, BL, v), r = lerp2(TR, BR, v); return { x: l.x + (r.x - l.x) * u, y: l.y + (r.y - l.y) * u }; };
    ctx.save(); ctx.globalAlpha = clamp(a.al, 0, 1); ctx.translate(0, a.dy);
    // 틀
    ctx.fillStyle = '#d3d9e3'; ctx.beginPath(); [[-2, -2], [2, -2], [2, 2], [-2, 2]].forEach(([dx, dy], i) => { const q = [TL, TR, BR, BL][i]; i ? ctx.lineTo(q[0] + dx, q[1] + dy) : ctx.moveTo(q[0] + dx, q[1] + dy); }); ctx.closePath(); ctx.fill();
    // 판(짙은 파랑) + 칸
    const g = ctx.createLinearGradient(0, TL[1], 0, BL[1]); g.addColorStop(0, SciSim.color.shade('#2d4f9a', bright - 1 + 0.1)); g.addColorStop(1, SciSim.color.shade('#1b2f66', bright - 1));
    ctx.fillStyle = g; ctx.beginPath(); [TL, TR, BR, BL].forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(190,215,255,.55)'; ctx.lineWidth = 0.9;
    for (let c = 1; c < 4; c++) { const a1 = P(c / 4, 0), a2 = P(c / 4, 1); ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.stroke(); }
    { const a1 = P(0, 0.5), a2 = P(1, 0.5); ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.stroke(); }
    // 정오 무렵 반사광 줄이 판 위를 쓸고 지나간다
    if (sweep >= 0 && sweep <= 1 && !RM) {
      const c0 = P(sweep, 0), c1 = P(sweep, 1), c2 = P(Math.min(1, sweep + 0.22), 1), c3 = P(Math.min(1, sweep + 0.22), 0);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); [c0, c1, c2, c3].forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); ctx.fill();
    }
    if (shadeA > 0.01) { ctx.fillStyle = 'rgba(8,14,40,' + (0.34 * shadeA).toFixed(3) + ')'; ctx.beginPath(); [TL, TR, BR, BL].forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function drawRoofSpot(h, t, hot) {
    const x = h.x, eave = h.y - h.wh;
    const k = RM ? 0.6 : 0.5 + 0.5 * Math.sin(t * 3.4 + h.i);
    ctx.save();
    ctx.strokeStyle = rgba(hot ? '#14a058' : '#ffffff', 0.55 + 0.4 * k); ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(x - h.w / 2 + 3, eave - 4); ctx.lineTo(x + h.w / 2 - 3, eave - 4); ctx.lineTo(x + h.w / 2 - 13, eave - h.rh + 5); ctx.lineTo(x - h.w / 2 + 13, eave - h.rh + 5); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = rgba('#fbbf24', 0.2 + 0.25 * k); ctx.fill();
    const cy = eave - h.rh / 2 - 2; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, cy, 8 + k * 1.2, 0, TAU); ctx.fill(); ctx.strokeStyle = '#e08a00'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#e08a00'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 4, cy); ctx.lineTo(x + 4, cy); ctx.moveTo(x, cy - 4); ctx.lineTo(x, cy + 4); ctx.stroke();
    ctx.restore();
  }
  function drawTurbine(V, installed, wKW, t, dt, showSpot) {
    const T = V.turbine, ta = S.ta;
    const rise = installed ? ta.rise : 0;
    if (!installed && ta.rise < 0.02) {          // 설치 전: 점선 자리 표시
      if (!showSpot) return;
      const k = RM ? 0.6 : 0.5 + 0.5 * Math.sin(t * 3.2);
      ctx.save(); ctx.strokeStyle = rgba('#ffffff', 0.6 + 0.35 * k); ctx.lineWidth = 2.2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(T.x - 3, T.y); ctx.lineTo(T.x - 1.4, T.hubY); ctx.moveTo(T.x + 3, T.y); ctx.lineTo(T.x + 1.4, T.hubY); ctx.stroke();
      ctx.beginPath(); ctx.arc(T.x, T.hubY, T.blade, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = rgba('#14b8a6', 0.14 + 0.16 * k); ctx.beginPath(); ctx.arc(T.x, T.hubY, T.blade, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(T.x, T.hubY, 9 + k, 0, TAU); ctx.fill(); ctx.strokeStyle = '#0d9488'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#0d9488'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(T.x - 4, T.hubY); ctx.lineTo(T.x + 4, T.hubY); ctx.moveTo(T.x, T.hubY - 4); ctx.lineTo(T.x, T.hubY + 4); ctx.stroke();
      ctx.restore();
      return;
    }
    const topY = T.y - T.tower * rise;
    // 기둥(위로 갈수록 가늘다)
    const tg = ctx.createLinearGradient(T.x - 4, 0, T.x + 4, 0); tg.addColorStop(0, '#f4f7fb'); tg.addColorStop(1, '#bcc6d4');
    ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(T.x - 4, T.y); ctx.lineTo(T.x - 1.8, topY); ctx.lineTo(T.x + 1.8, topY); ctx.lineTo(T.x + 4, T.y); ctx.closePath(); ctx.fill();
    contactShadow(T.x + 4, T.y + 2, 14, 4, 0.2);
    if (rise < 0.98) return;
    const u = clamp(ta.blade, 0, 1), L = T.blade * u;
    // 날개 회전: 속도 ∝ 출력, 빠르면 잔상
    const om = 0.35 + 3.4 * wKW;
    ta.ang += om * dt;
    const hx = T.x, hy = T.hubY;
    if (om > 2.2 && !RM) for (let k = 1; k <= 3; k++) { ctx.globalAlpha = 0.16 / k; drawBlades(hx, hy, ta.ang - k * 0.2 * om * 0.45, L, '#e8eef5'); }
    ctx.globalAlpha = 1; drawBlades(hx, hy, ta.ang, L, '#f7f9fc');
    ctx.fillStyle = '#d3dae5'; rr(hx - 5, hy - 5, 13, 10, 3); ctx.fill();
    D.sphere(hx, hy, 4.6, '#e8edf4', { gloss: false });
  }
  function drawBlades(hx, hy, ang, L, col) {
    if (L < 1) return;
    ctx.fillStyle = col; ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 0.8;
    for (let k = 0; k < 3; k++) {
      const a = ang + k * TAU / 3, ca = Math.cos(a), sa = Math.sin(a);
      ctx.beginPath(); ctx.moveTo(hx, hy);
      ctx.lineTo(hx + ca * L * 0.28 - sa * 3.6, hy + sa * L * 0.28 + ca * 3.6);
      ctx.lineTo(hx + ca * L, hy + sa * L);
      ctx.lineTo(hx + ca * L * 0.28 + sa * 1.6, hy + sa * L * 0.28 - ca * 1.6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  function drawEss(V, installed, soc, flow, t, showSpot) {
    const E = V.ess, ea = S.ea, w = 56, h = 30, x = E.cx - w / 2;
    if (!installed && ea.a < 0.02) {
      if (!showSpot) return;
      const k = RM ? 0.6 : 0.5 + 0.5 * Math.sin(t * 3.2);
      ctx.save(); ctx.strokeStyle = rgba('#ffffff', 0.65 + 0.3 * k); ctx.lineWidth = 2.2; ctx.setLineDash([5, 4]); rr(x, E.y - 36, w, h + 4, 5); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = rgba('#8b5cf6', 0.16 + 0.16 * k); rr(x, E.y - 36, w, h + 4, 5); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(E.cx, E.y - 21, 9 + k, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(E.cx - 4, E.y - 21); ctx.lineTo(E.cx + 4, E.y - 21); ctx.moveTo(E.cx, E.y - 25); ctx.lineTo(E.cx, E.y - 17); ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.save(); ctx.globalAlpha = clamp(ea.a, 0, 1); ctx.translate(0, ea.y);
    contactShadow(E.cx + 5, E.y + 1, 38, 5, 0.28);
    // 컨테이너 몸통 + 지붕 + 옆면
    const g = ctx.createLinearGradient(0, E.y - 36, 0, E.y - 4); g.addColorStop(0, '#a78bfa'); g.addColorStop(1, '#7c3aed');
    ctx.fillStyle = g; rr(x, E.y - 36, w, 32, 4); ctx.fill();
    ctx.fillStyle = '#d9d2f7'; rr(x - 2, E.y - 40, w + 4, 6, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; for (let k = 1; k < 5; k++) ctx.fillRect(x + k * 11 - 1, E.y - 33, 1.6, 26);
    ctx.fillStyle = '#5b21b6'; ctx.fillRect(x + w - 5, E.y - 34, 3, 28);
    // 충전 막대(물결이 있는 액면)
    const bx = x + 7, by = E.y - 31, bw = 16, bh = 22;
    ctx.fillStyle = 'rgba(20,10,60,.55)'; rr(bx, by, bw, bh, 3); ctx.fill();
    const lv = clamp(soc / ESS_CAP, 0, 1), hh = (bh - 4) * lv;
    ctx.save(); rr(bx + 2, by + 2, bw - 4, bh - 4, 2); ctx.clip();
    ctx.fillStyle = flow > 0.05 ? '#7be0a8' : flow < -0.05 ? '#ffd84d' : '#c4b5fd';
    ctx.beginPath(); ctx.moveTo(bx, by + bh); for (let k = 0; k <= 8; k++) ctx.lineTo(bx + 2 + (k / 8) * (bw - 4), by + bh - 2 - hh + Math.sin(t * 4 + k) * 1.1); ctx.lineTo(bx + bw, by + bh); ctx.closePath(); ctx.fill();
    ctx.restore();
    txt('🔋', x + 38, E.y - 22, f(15, 400), '#fff');
    // 충전 중 ▲ / 방전 중 ▼ 표시
    if (Math.abs(flow) > 0.05) { ctx.fillStyle = flow > 0 ? '#7be0a8' : '#ffd84d'; ctx.beginPath(); const ay = E.y - 46 + (RM ? 0 : Math.sin(t * 5) * 2); if (flow > 0) { ctx.moveTo(E.cx - 5, ay - 3); ctx.lineTo(E.cx + 5, ay - 3); ctx.lineTo(E.cx, ay + 4); } else { ctx.moveTo(E.cx - 5, ay + 4); ctx.lineTo(E.cx + 5, ay + 4); ctx.lineTo(E.cx, ay - 3); } ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }

  /* ---- 자동차 · 연기 ---- */
  function drawCar(x, y, dir, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    contactShadow(0, 6, 20, 3.5, 0.28);
    ctx.fillStyle = col; rr(-17, -9, 34, 9, 3); ctx.fill(); rr(-9, -16, 19, 9, 3.5); ctx.fill();
    ctx.fillStyle = '#dff1ff'; ctx.fillRect(-6, -14, 7, 6); ctx.fillRect(2.5, -14, 6, 6);
    ctx.fillStyle = '#22262f'; [-9, 9].forEach((cx) => { ctx.beginPath(); ctx.arc(cx, 0, 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#9aa3b2'; ctx.beginPath(); ctx.arc(cx, 0, 1.6, 0, TAU); ctx.fill(); ctx.fillStyle = '#22262f'; });
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(15, -7, 3, 3);
    ctx.restore();
  }
  function updateSmoke(V, dt, coalKW, idleRate) {
    const rate = coalKW != null ? (coalKW > 0.03 ? 2.2 + 2.4 * coalKW : 0) : idleRate;
    S.smokeAcc = (S.smokeAcc || 0) + rate * dt;
    while (S.smokeAcc >= 1 && S.smoke.length < 70) { S.smokeAcc -= 1; S.smoke.push({ x: V.plant.chx + (Math.random() - 0.5) * 3, y: V.plant.chtop - 4, vx: 6 + Math.random() * 8, vy: -(20 + Math.random() * 8), age: 0, life: 2.6 + Math.random() * 1.2, r0: 4 + Math.random() * 2 }); }
    if (S.smokeAcc > 3) S.smokeAcc = 0;
    for (let i = S.smoke.length - 1; i >= 0; i--) { const p = S.smoke[i]; p.age += dt; if (p.age >= p.life) { S.smoke.splice(i, 1); continue; } p.x += (p.vx + Math.sin(S.t * 0.7 + p.age) * 4) * dt; p.y += p.vy * dt; p.vy *= 0.995; }
    for (let i = S.puffs.length - 1; i >= 0; i--) { const p = S.puffs[i]; p.age += dt; if (p.age >= p.life) { S.puffs.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; }
  }
  function drawSmoke() {
    S.smoke.forEach((p) => {
      const u = p.age / p.life, r = p.r0 + 20 * u, a = 0.5 * (1 - u) * Math.min(1, u * 8 + 0.3);
      ctx.fillStyle = 'rgba(' + (112 + 30 * u | 0) + ',' + (118 + 30 * u | 0) + ',' + (130 + 30 * u | 0) + ',' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    });
    S.puffs.forEach((p) => { const u = p.age / p.life; ctx.fillStyle = 'rgba(120,126,138,' + (0.4 * (1 - u)).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 2 + 5 * u, 0, TAU); ctx.fill(); });
  }

  /* ---- 쓰레기 매립지 ---- */
  const BAG_COL = ['#2c3a33', '#33423b', '#26332d', '#3b4a42', '#1f2a26'];
  function bagSlot(i, V) {
    const L = V.landfill, row = i < 10 ? 0 : i < 19 ? 1 : i < 26 ? 2 : 3, base = [0, 10, 19, 26][row], cols = [10, 9, 7, 5][row], k = i - base;
    const span = (cols - 1) * 15, x0 = L.x + L.w / 2 - span / 2;
    return { x: x0 + k * 15 + (row % 2 ? 2 : -2) + ((i * 7) % 5 - 2), y: L.y - 6 - row * 11 - ((i * 3) % 3) };
  }
  function drawLandfill(V, t) {
    const L = V.landfill;
    // 흙 언덕
    const g = ctx.createLinearGradient(0, L.y - 40, 0, L.y); g.addColorStop(0, '#a9855d'); g.addColorStop(1, '#7d6244');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.quadraticCurveTo(L.x + L.w * 0.15, L.y - 32, L.x + L.w * 0.5, L.y - 36); ctx.quadraticCurveTo(L.x + L.w * 0.88, L.y - 30, L.x + L.w, L.y); ctx.closePath(); ctx.fill();
    // 봉투(시간이 지나면 늘어난다)
    const n = S.bags.length;
    for (let i = 0; i < n; i++) {
      const b = S.bags[i], pos = bagSlot(i, V), age = nowS() - b.born, u = RM ? 1 : EASE.outBack(clamp(age / 0.45, 0, 1)), dy = RM ? 0 : (1 - clamp(age / 0.45, 0, 1)) * -40;
      ctx.save(); ctx.translate(pos.x, pos.y + dy); ctx.scale(u, u);
      ctx.fillStyle = BAG_COL[i % 5]; ctx.beginPath(); ctx.ellipse(0, 0, 8.2, 6.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(-2.6, -2.6, 2.6, 1.6, -0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = BAG_COL[i % 5]; ctx.beginPath(); ctx.moveTo(-2.2, -5.2); ctx.lineTo(0, -9.4); ctx.lineTo(2.2, -5.2); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // 갈매기
    if (n > 12 && !RM) for (let k = 0; k < 3; k++) { const a = t * (0.6 + k * 0.12) + k * 2.1, gx = L.x + L.w / 2 + Math.cos(a) * (50 + k * 12), gy = L.y - 70 - k * 8 + Math.sin(a * 1.7) * 7, fl = Math.sin(t * 9 + k) * 3; ctx.strokeStyle = '#f5f7fa'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx - 6, gy + fl); ctx.quadraticCurveTo(gx - 3, gy - 3, gx, gy); ctx.quadraticCurveTo(gx + 3, gy - 3, gx + 6, gy + fl); ctx.stroke(); }
  }

  /* =========================================================
     마을 그리기(합성) · 전기 흐름 상태 · 하루 돌려 보기 엔진
     ========================================================= */
  const curCfg = () => ({ solar: S.build.solar.filter(Boolean).length, wind: S.build.wind ? 1 : 0, ess: S.build.ess, cloudy: S.weather === 'cloudy', cards: Object.assign({}, S.cards) });
  const cfgKey = (c) => [c.solar, c.wind, c.ess ? 1 : 0, c.cloudy ? 1 : 0, c.cards.plug ? 1 : 0, c.cards.ac ? 1 : 0, c.cards.sub ? 1 : 0, c.cards.eff ? 1 : 0].join('');
  let PREVIEW = { key: '', res: null };
  function preview() {
    const c = curCfg(), k = cfgKey(c);
    if (PREVIEW.key !== k) PREVIEW = { key: k, res: simulateDay(c) };
    return PREVIEW.res;
  }
  /* 설치·카드·날씨가 바뀌면 지난 결과 그래프는 사라지고 미리보기로 돌아간다 */
  function configChanged() {
    S.runAfterInstall = false;
    if (S.gr) S.gr = null;
    S.chipT = -99;
    syncDom();
  }
  const todNow = () => (S.run ? 8 + S.run.t : S.view === 'meters' ? 10.5 : S.gr ? 32 : 10.5);
  function instant(res, i) { // 한 시점의 전기 흐름
    const dem = res.dem[i], sol = res.sol[i], win = res.win[i], dis = res.dis[i], coal = res.coal[i], chg = res.chg[i];
    const n = Math.max(1, res.cfg.solar), sSol = Math.min(sol, dem), sWin = Math.min(win, Math.max(0, dem - sSol));
    const tot = Math.max(0.001, dem);
    return { sol: sol / n, win, dis, chg, coal, dem: dem / HOUSES_N, mix: [sSol / tot, sWin / tot, dis / tot, coal / tot], chgMix: sol + win > 0 ? sol / (sol + win) : 0.5, soc: res.soc[i] };
  }
  function curFlows() {
    if (S.run) return instant(S.run.res, clamp(Math.floor(S.run.t * STEPS), 0, DAY_STEPS - 1));
    if (S.view === 'meters') return { sol: 0, win: 0, dis: 0, chg: 0, coal: 2.7, dem: 0.45, mix: [0, 0, 0, 1], chgMix: 0.5, soc: 0 };
    return { sol: 0, win: 0, dis: 0, chg: 0, coal: 0, dem: 0, mix: [0, 0, 0, 0], chgMix: 0.5, soc: 0 };
  }
  /* 하루 돌려 보기 */
  function startRun() {
    if (S.run) return false;
    const cfg = curCfg();
    S.run = { t: 0, res: simulateDay(cfg), cfg };
    S.gr = null; S.chipT = -99; S.dots.length = 0; FX.bubbles = [];
    Sound.click();
    syncDom();
    return true;
  }
  function finishRun() {
    const r = S.run;
    const cc = cardCount(r.cfg.cards);
    const rec = { cfg: r.cfg, res: r.res, coal: r.res.total.coal, co2: r.res.total.co2, indiv: cc.indiv, social: cc.social, cloudy: r.cfg.cloudy, key: cfgKey(r.cfg) };
    S.lastRun = rec; S.runs.push(rec); S.gr = { res: r.res, rec };
    S.runAfterInstall = true; S.chipT = nowS();
    S.run = null;
    const last3 = S.runs.slice(-3);
    S.barTarget = [0, 1, 2].map((k) => (last3[k] ? last3[k].coal : -1));
    S.barBorn = nowS();
    Sound.success();
    syncDom();
  }
  function stepRun(dt) {
    const r = S.run;
    if (!r) return;
    r.t += dt * S.runSpeed;
    if (r.t >= 24) { r.t = 24; finishRun(); }
  }
  /* 설치(눌러서 설치/철거) */
  function toggleBuild(kind, i) {
    if (S.run) { msgTop('하루를 돌리는 동안에는 바꿀 수 없어요'); return false; }
    if (kind === 'solar') {
      const on = !S.build.solar[i]; S.build.solar[i] = on;
      const a = S.sa[i];
      if (on) { a.dy = -70; a.al = 0; SciSim.tween(a, { dy: 0, al: 1 }, { duration: 0.55, ease: 'outBack' }); Sound.tick(); }
      else SciSim.tween(a, { dy: -26, al: 0 }, { duration: 0.28, ease: 'inCubic' });
      const V = villageGeom(LAY.kind), h = V.houses[i];
      S.fxQ.push({ k: 'roof', i, t: nowS() });
    } else if (kind === 'wind') {
      const on = !S.build.wind; S.build.wind = on;
      if (on) { S.ta.rise = 0; S.ta.blade = 0; SciSim.tween(S.ta, { rise: 1 }, { duration: 0.7, ease: 'outCubic' }); SciSim.tween(S.ta, { blade: 1 }, { duration: 0.55, delay: 0.65, ease: 'outBack' }); Sound.tick(); }
      else { SciSim.tween(S.ta, { blade: 0 }, { duration: 0.2 }); SciSim.tween(S.ta, { rise: 0 }, { duration: 0.3, delay: 0.15, ease: 'inCubic' }); }
      S.fxQ.push({ k: 'wind', t: nowS() });
    } else if (kind === 'ess') {
      const on = !S.build.ess; S.build.ess = on;
      if (on) { S.ea.y = -96; S.ea.a = 0; SciSim.tween(S.ea, { y: 0, a: 1 }, { duration: 0.62, ease: 'outBounce', onDone: () => { S.shakeT = nowS(); S.fxQ.push({ k: 'dust', t: nowS() }); Sound.tone(110, 0.18, 'sine', 0.2); } }); Sound.tick(); }
      else SciSim.tween(S.ea, { a: 0, y: -20 }, { duration: 0.3 });
    }
    configChanged();
    return true;
  }
  function setCard(key, on) {
    if (S.run) { msgTop('하루를 돌리는 동안에는 바꿀 수 없어요'); return false; }
    if (!!S.cards[key] === !!on) return true;
    S.cards[key] = !!on;
    SciSim.tween(S.sw, { [key]: on ? 1 : 0 }, { duration: 0.32, ease: 'outBack' });
    if (key === 'sub') { const a = S.schoolA; if (on) { a.dy = -44; a.al = 0; SciSim.tween(a, { dy: 0, al: 1 }, { duration: 0.6, ease: 'outBack' }); } else SciSim.tween(a, { dy: -20, al: 0 }, { duration: 0.3 }); }
    Sound.tick();
    configChanged();
    return true;
  }
  function setWeather(w) {
    if (S.run) return;
    S.weather = w; Sound.click(); configChanged();
  }
  S.fxQ = [];

  /* ---- 창문 불: 저녁에 하나씩 켜진다 ---- */
  const hash1 = (a, b) => { const x = Math.sin(a * 91.7 + b * 37.3 + 12.9) * 43758.5453; return x - Math.floor(x); };
  function winLit(i, k, tod) {
    const del = 0.1 + hash1(i, k) * 1.4, h = hash1(i * 3 + 1, k + 7);
    if (tod < 18.2 || tod > 30.6) return 0;
    if (tod < 23) return smooth(18.2 + del, 18.2 + del + 0.35, tod);
    if (tod < 29.5) return h > (tod - 23) / 6.6 ? 1 : 0;
    return h > 0.6 ? 1 - smooth(29.5, 30.6, tod) : 0;
  }

  /* ---- 마을 한 장면 그리기 ---- */
  function drawVillage(R, t, dt) {
    if (R.a < 0.01 || R.w < 40) return;
    const V = villageGeom(LAY.kind), cam = villageCam(R, V), W = V.W;
    const tod = todNow(), nt = nightness(tod), fl = curFlows(), cloudy = S.weather === 'cloudy';
    SKYCUR.tod = tod; SKYCUR.nt = nt; SKYCUR.cloudy = approachV(SKYCUR.cloudy, cloudy ? 1 : 0, dt, 3); SKYCUR.hz = S.haze;
    ctx.save(); ctx.globalAlpha = R.a;
    softShadow(() => { ctx.fillStyle = '#fff'; rr(R.x, R.y, R.w, R.h, 16); ctx.fill(); }, 14, 4);
    ctx.save(); rr(R.x, R.y, R.w, R.h, 16); ctx.clip();
    drawSkyIn(R, V, cam, t);
    // 저장 장치가 쿵 떨어질 때 살짝 흔들린다
    let shx = 0, shy = 0; const sk = nowS() - S.shakeT;
    if (sk >= 0 && sk < 0.28 && !RM) { const m = 1 - sk / 0.28; shx = Math.sin(sk * 90) * 2 * m; shy = Math.cos(sk * 70) * 2 * m; }
    ctx.save(); ctx.translate(cam.ox + shx, cam.oy + shy); ctx.scale(cam.s, cam.s);
    blit(layer('vil-' + LAY.kind, V.W, V.H, paintVillageStatic), 0, 0);
    // 전선
    strokePts(V.linePts, '#3a4252', 2);
    V.houses.forEach((h) => { strokePts(h.dropPts, '#4a5366', 1.5); if (S.sa[h.i].al > 0.02) strokePts(h.feedPts, '#4a5366', 1.5); });
    strokePts(V.feeds.coal, '#4a5366', 1.8);
    if (S.ea.a > 0.02) strokePts(V.feeds.ess, '#4a5366', 1.6);
    // 집: 창문 + 태양광 판 (또는 설치 자리 표시)
    const buildMode = has('build') && S.view !== 'meters' && !S.sortOn && !(level() >= 2 && !freeMode());
    V.houses.forEach((h) => {
      [h.winL, h.winR].forEach((wd, k) => {
        const lit = winLit(h.i, k, tod);
        ctx.fillStyle = SciSim.color.mix(SciSim.color.mix('#bfe0f5', '#16213d', nt), '#ffd77a', lit); rr(wd.x, wd.y, wd.w, wd.h, 1.5); ctx.fill();
        if (!lit) { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.moveTo(wd.x + 2, wd.y + wd.h - 2); ctx.lineTo(wd.x + 8, wd.y + 2); ctx.lineTo(wd.x + 11, wd.y + 2); ctx.lineTo(wd.x + 5, wd.y + wd.h - 2); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(wd.x + wd.w / 2 - 0.6, wd.y, 1.2, wd.h); ctx.fillRect(wd.x, wd.y + wd.h / 2 - 0.6, wd.w, 1.2);
      });
      const a = S.sa[h.i];
      if (a.al > 0.02) {
        const noon = !cloudy && tod >= 10.5 && tod <= 14.5 ? (tod - 10.5) / 4 : -1;
        const csx = ((t * 30) % (W + 260)) - 130, csh = SKYCUR.cloudy * Math.exp(-Math.pow((h.x - csx) / 90, 2));   // 구름 그림자가 판 위를 지나간다
        drawRoofPanel(h, a, 1 - 0.25 * SKYCUR.cloudy - 0.4 * nt, noon, RM ? 0 : csh);
        if (!cloudy && noon >= 0 && !RM) { /* 반사광은 판 위에서만 */ }
      } else if (buildMode && !S.run) drawRoofSpot(h, t, S.hoverSpot === 'roof' + h.i);
    });
    // 학교 지붕(지원 제도 카드): 태양광 판 2개가 내려앉는다
    if (S.schoolA.al > 0.02) {
      const Sc = V.school, a = S.schoolA;
      ctx.save(); ctx.globalAlpha = clamp(a.al, 0, 1); ctx.translate(0, a.dy);
      [0, 1].forEach((k) => {
        const x0 = Sc.x + 12 + k * 40;
        ctx.fillStyle = '#d3d9e3'; ctx.beginPath(); ctx.moveTo(x0 - 1.5, Sc.y - 30.5); ctx.lineTo(x0 + 34.5, Sc.y - 30.5); ctx.lineTo(x0 + 29.5, Sc.y - 46.5); ctx.lineTo(x0 + 3.5, Sc.y - 46.5); ctx.closePath(); ctx.fill();
        const g = ctx.createLinearGradient(0, Sc.y - 46, 0, Sc.y - 31); g.addColorStop(0, '#2d4f9a'); g.addColorStop(1, '#1b2f66'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, Sc.y - 32); ctx.lineTo(x0 + 33, Sc.y - 32); ctx.lineTo(x0 + 28.5, Sc.y - 45); ctx.lineTo(x0 + 4.5, Sc.y - 45); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(190,215,255,.55)'; ctx.lineWidth = 0.8; for (let c = 1; c < 4; c++) { ctx.beginPath(); ctx.moveTo(x0 + 4.5 + c * 6, Sc.y - 45); ctx.lineTo(x0 + c * 8.25, Sc.y - 32); ctx.stroke(); }
      });
      ctx.restore();
    }
    // 풍력 · 저장 장치
    const win = fl.win > 0 ? fl.win : (S.run ? fl.win : (cloudy ? 1.0 : 0.6));
    drawTurbine(V, S.build.wind, S.build.wind ? win : 0.4, t, dt, buildMode && !S.run);
    drawEss(V, S.build.ess, S.run ? fl.soc : (S.gr ? S.gr.res.soc[DAY_STEPS - 1] : 0), (fl.chg > 0.05 ? 1 : fl.dis > 0.05 ? -1 : 0), t, buildMode && !S.run);
    // 자동차 · 연기
    S.carT += dt;
    const c0 = { x: ((S.carT * 34 + 60) % (W + 160)) - 80, y: V.carLane[1], dir: 1, col: '#e2464b' }, c1 = { x: W + 80 - ((S.carT * 26 + 230) % (W + 160)), y: V.carLane[0], dir: -1, col: '#3867f4' };
    S.exAcc = (S.exAcc || 0) + dt * (S.view === 'meters' ? 5 : 2.4);
    while (S.exAcc >= 1) { S.exAcc -= 1; [c0, c1].forEach((c) => { if (c.x > -10 && c.x < W + 10) S.puffs.push({ x: c.x - c.dir * 19, y: c.y - 3, vx: -c.dir * (8 + Math.random() * 8), vy: -(6 + Math.random() * 6), age: 0, life: 0.9 + Math.random() * 0.5 }); }); }
    drawCar(c0.x, c0.y, c0.dir, c0.col); drawCar(c1.x, c1.y, c1.dir, c1.col);
    drawSmoke();
    drawLandfill(V, t);
    // 발전소 쉬는 중
    const coalKW = S.run ? fl.coal : null;
    if (S.view !== 'meters' && (S.run ? fl.coal < 0.03 : preview().total.coal < 0.05)) {
      const bob = RM ? 0 : Math.sin(t * 2.4) * 2;
      pill(V.plant.chx - 46, V.plant.chtop - 12 + bob, '쉬는 중 💤', { bg: 'rgba(27,35,51,.88)', size: 12.5, h: 24, shadow: true });
    }
    // 연무(대기 오염): 지평선 근처가 누렇게 흐려진다
    if (S.haze > 0.01) {
      const hg = ctx.createLinearGradient(0, V.hor - 120, 0, V.H); hg.addColorStop(0, 'rgba(205,172,128,0)'); hg.addColorStop(0.45, 'rgba(205,172,128,' + (S.haze * 0.85).toFixed(3) + ')'); hg.addColorStop(1, 'rgba(205,172,128,' + (S.haze * 0.45).toFixed(3) + ')');
      ctx.fillStyle = hg; ctx.fillRect(0, V.hor - 120, W, V.H - V.hor + 120);
    }
    // 밤 색조(땅 위만): 불 켜진 창은 그 위에 다시 빛난다
    if (nt > 0.02) {
      const ng = ctx.createLinearGradient(0, V.hor - 70, 0, V.hor - 10); ng.addColorStop(0, 'rgba(8,16,50,0)'); ng.addColorStop(1, 'rgba(8,16,50,' + (0.55 * nt).toFixed(3) + ')');
      ctx.fillStyle = ng; ctx.fillRect(-20, V.hor - 70, W + 40, 60); ctx.fillStyle = 'rgba(8,16,50,' + (0.55 * nt).toFixed(3) + ')'; ctx.fillRect(-20, V.hor - 10, W + 40, V.H - V.hor + 30);
      add(() => V.houses.forEach((h) => [h.winL, h.winR].forEach((wd, k) => { const lit = winLit(h.i, k, tod); if (lit > 0.02) { halo(wd.x + wd.w / 2, wd.y + wd.h / 2, 26, '#ffc861', 0.5 * lit); pool(wd.x + wd.w / 2, h.y + 6, 30, 7, '#ffc861', 0.25 * lit); } })));
      add(() => halo(V.plant.x + 38, V.plant.top + 14, 30, '#ffc861', 0.3 * nt));
    }
    drawDots();
    // 설치 연출: 먼지
    S.fxQ = S.fxQ.filter((q) => {
      if (q.k === 'dust') { for (let k = 0; k < 10; k++) S.puffs.push({ x: V.ess.cx + (Math.random() - 0.5) * 50, y: V.ess.y - 2, vx: (Math.random() - 0.5) * 60, vy: -(6 + Math.random() * 14), age: 0, life: 0.7 }); return false; }
      if (q.k === 'roof') { const h = V.houses[q.i], c = { x: h.x, y: h.y - h.wh - h.rh / 2 }; const wp = { x: cam.ox + c.x * cam.s, y: cam.oy + c.y * cam.s }; ringFx(wp.x, wp.y, '#fbbf24', 14); sparkle(wp.x, wp.y, 10, ['#ffd84d', '#fff6c2', '#ffffff']); return false; }
      if (q.k === 'wind') { if (nowS() - q.t > 1.2) { const T = V.turbine, wp = { x: cam.ox + T.x * cam.s, y: cam.oy + T.hubY * cam.s }; ringFx(wp.x, wp.y, '#14b8a6', 16); sparkle(wp.x, wp.y, 10, ['#5ce1e6', '#c9fbff', '#ffffff']); return false; } return true; }
      return false;
    });
    ctx.restore();   // 월드
    ctx.restore();   // 클립
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; rr(R.x, R.y, R.w, R.h, 16); ctx.stroke();
    if (isNew('build') && S.view === 'power') newRing(R.x - 2, R.y - 2, R.w + 4, R.h + 4);
    ctx.restore();
    return { V, cam };
  }
  function pool(x, y, rx, ry, color, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(0.6, rgba(color, a * 0.35)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  }
  /* 마을 안의 눌러 볼 곳: 지붕 · 풍력 · 저장 장치 (월드 좌표 판정, 화면에서 최소 44 px) */
  function villageHit(p) {
    const R = PAN.vil, V = villageGeom(LAY.kind), cam = villageCam(R, V);
    if (!inR(p, R, 0)) return null;
    const w = toWorld(p, cam), pad = Math.max(0, 22 / cam.s - 10);
    for (const h of V.houses) {
      if (w.x >= h.x - h.w / 2 - 8 - pad && w.x <= h.x + h.w / 2 + 8 + pad && w.y >= h.y - h.wh - h.rh - 8 - pad && w.y <= h.y - h.wh + 12 + pad) return { kind: 'solar', i: h.i };
    }
    const T = V.turbine;
    if (Math.hypot(w.x - T.x, w.y - T.hubY) < T.blade + 8 + pad || (Math.abs(w.x - T.x) < 14 + pad && w.y > T.hubY && w.y < T.y + 8)) return { kind: 'wind' };
    const E = V.ess;
    if (w.x >= E.cx - E.w / 2 - pad && w.x <= E.cx + E.w / 2 + pad && w.y >= E.y - 48 - pad && w.y <= E.y + 8 + pad) return { kind: 'ess' };
    return null;
  }
  const worldToCanvas = (wx, wy) => { const V = villageGeom(LAY.kind), cam = villageCam(PAN.vil, V); return { x: cam.ox + wx * cam.s, y: cam.oy + wy * cam.s }; };

  /* =========================================================
     📊 지구 계기판 (1단계): 화석 연료 탱크 3개 · 대기 중 이산화 탄소 · 쓰레기
     지금처럼 쓴다면 — 2025 → 2075, 버튼 한 번에 10년
     ========================================================= */
  const TANKS = [
    { id: 'oil', icon: '🛢️', name: '석유', yrs: 50, top: '#8a5a2b', bot: '#2a1a0c', info: '지금처럼 쓰면 약 50년 쓸 양(가채 연수)이에요.' },
    { id: 'gas', icon: '🔥', name: '천연가스', yrs: 50, top: '#a8dcff', bot: '#4f9fe0', info: '지금처럼 쓰면 약 50년 쓸 양(가채 연수)이에요.' },
    { id: 'coal', icon: '⛏️', name: '석탄', yrs: 130, top: '#59616f', bot: '#1f242d', info: '지금처럼 쓰면 약 130년 쓸 양(가채 연수)이에요.' },
  ];
  const CO2_HIST = [[1850, 285], [1900, 296], [1950, 311], [1970, 326], [2000, 370], [2010, 390], [2020, 414], [2025, 425]];
  const co2At = (y) => {
    if (y >= 2025) return 425 + 2.5 * (y - 2025);
    for (let i = 0; i < CO2_HIST.length - 1; i++) if (y <= CO2_HIST[i + 1][0]) return lerp(CO2_HIST[i][1], CO2_HIST[i + 1][1], (y - CO2_HIST[i][0]) / (CO2_HIST[i + 1][0] - CO2_HIST[i][0]));
    return 425;
  };
  const tankLevel = (id, yr) => Math.max(0, 1 - (yr - 2025) / (id === 'coal' ? 130 : 50));
  const bagsFor = (year) => 6 + Math.round(((year - 2025) / 10) * 4);
  function dashLayout(D) {
    if (LAY.kind === 'wide') {
      const tanks = [0, 1, 2].map((i) => ({ cx: D.x + 58 + i * 98, top: D.y + 40, w: 58, h: 106 }));
      return { head: { x: D.x + 16, y: D.y + 18 }, tanks, co2: { x: D.x + 318, y: D.y + 12, w: 300, h: D.h - 24 }, trash: { x: D.x + 630, y: D.y + 12, w: D.w - 630 - 12, h: D.h - 24 } };
    }
    const tanks = [0, 1, 2].map((i) => ({ cx: D.x + 78 + i * 156, top: D.y + 42, w: 62, h: 118 }));
    return { head: { x: D.x + 14, y: D.y + 20 }, tanks, co2: { x: D.x + 8, y: D.y + 214, w: 292, h: D.h - 222 }, trash: { x: D.x + 308, y: D.y + 214, w: D.w - 316, h: D.h - 222 } };
  }
  function drawTank(T, tk, level, t) {
    const x = T.cx - T.w / 2, y = T.top, w = T.w, h = T.h;
    const fl = S.tankFlash[tk.id] > 0 ? nowS() - S.tankFlash[tk.id] : 99;
    const shake = fl < 1.6 && !RM ? Math.sin(fl * 46) * 3 * (1 - fl / 1.6) : 0;
    ctx.save(); ctx.translate(shake, 0);
    contactShadow(T.cx, y + h + 6, w * 0.85, 5, 0.22);
    // 안쪽(비어 있는 유리)
    ctx.fillStyle = 'rgba(230,240,250,.55)'; rr(x, y, w, h, 16); ctx.fill();
    // 액체(또는 석탄 더미)
    const inner = { x: x + 3, y: y + 3, w: w - 6, h: h - 6 };
    ctx.save(); rr(inner.x, inner.y, inner.w, inner.h, 13); ctx.clip();
    const ly = inner.y + inner.h - inner.h * level;
    if (level > 0.003) {
      const g = ctx.createLinearGradient(0, ly, 0, inner.y + inner.h); g.addColorStop(0, tk.top); g.addColorStop(1, tk.bot);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(inner.x, inner.y + inner.h);
      for (let k = 0; k <= 14; k++) { const px = inner.x + (inner.w * k) / 14; ctx.lineTo(px, tk.id === 'coal' ? ly : ly + Math.sin(t * 2.6 + k * 0.8 + T.cx) * 1.6); }
      ctx.lineTo(inner.x + inner.w, inner.y + inner.h); ctx.closePath(); ctx.fill();
      if (tk.id === 'coal') { ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let k = 0; k < 16; k++) { const rx = inner.x + 6 + ((k * 37) % (inner.w - 12)), ry = ly + 6 + ((k * 23) % Math.max(4, inner.h * level - 10)); if (ry < inner.y + inner.h - 3) { ctx.beginPath(); ctx.arc(rx, ry, 2.4, 0, TAU); ctx.fill(); } } }
      else { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(inner.x, ly - 0.5, inner.w, 2.4); }
      // 거품
      if (!RM && tk.id !== 'coal') for (let k = 0; k < 4; k++) { const u = ((t * 0.45 + k * 0.27 + T.cx * 0.01) % 1), by = inner.y + inner.h - u * inner.h * level; if (by > ly + 2) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(inner.x + 8 + ((k * 13) % (inner.w - 16)), by, 1.8 + (k % 2), 0, TAU); ctx.stroke(); } }
    }
    ctx.restore();
    // 빨갛게 깜빡이는 경고
    if (fl < 1.6 && !RM) { const on = Math.floor(fl * 7) % 2 === 0; if (on) { ctx.fillStyle = 'rgba(226,70,75,.28)'; rr(x, y, w, h, 16); ctx.fill(); } }
    // 유리 테두리 · 눈금 · 반사광
    ctx.strokeStyle = fl < 1.6 ? COL.bad : '#9fb2c8'; ctx.lineWidth = 3; rr(x, y, w, h, 16); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,140,170,.55)'; ctx.lineWidth = 1.3;
    [0.25, 0.5, 0.75].forEach((q) => { const ty = y + h - 6 - (h - 12) * q; ctx.beginPath(); ctx.moveTo(x + w - 11, ty); ctx.lineTo(x + w - 4, ty); ctx.stroke(); });
    ctx.fillStyle = 'rgba(255,255,255,.65)'; rr(x + 7, y + 10, 5, h - 30, 2.5); ctx.fill();
    // 바닥! 배지
    if (level <= 0.003) {
      const k = RM ? 1 : 0.5 + 0.5 * Math.sin(t * 6);
      ctx.fillStyle = COL.bad; rr(T.cx - 24, y + h / 2 - 14, 48, 28, 14); ctx.fill();
      txt('바닥!', T.cx, y + h / 2 + 1, f(14, 800), '#fff');
      ctx.strokeStyle = rgba(COL.bad, 0.35 + 0.4 * k); ctx.lineWidth = 3; rr(T.cx - 28, y + h / 2 - 18, 56, 36, 18); ctx.stroke();
    }
    ctx.restore();
  }
  function drawCo2Card(C, t) {
    softShadow(() => { ctx.fillStyle = '#f6f9fd'; rr(C.x, C.y, C.w, C.h, 14); ctx.fill(); }, 6, 2);
    txt('🌫️ 대기 중 이산화 탄소', C.x + 12, C.y + 16, f(13.5, 800), COL.ink, 'left');
    const v = co2At(S.yr);
    txt(Math.round(v) + ' ppm', C.x + C.w - 12, C.y + 17, fm(LAY.kind === 'tall' ? 19 : 17), v > 440 ? '#c2410c' : '#475569', 'right');
    const P = { x: C.x + 36, y: C.y + 36, w: C.w - 50, h: C.h - 72 };
    const X = (yr) => P.x + ((yr - 1850) / 225) * P.w, Y = (ppm) => P.y + P.h - ((ppm - 250) / 310) * P.h;
    // 눈금
    ctx.strokeStyle = 'rgba(100,116,139,.18)'; ctx.lineWidth = 1; ctx.fillStyle = COL.muted; ctx.font = f(10.5, 700); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    [300, 400, 500].forEach((p) => { ctx.beginPath(); ctx.moveTo(P.x, Y(p)); ctx.lineTo(P.x + P.w, Y(p)); ctx.stroke(); ctx.fillText(String(p), P.x - 5, Y(p)); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    [1850, 1900, 1950, 2000, 2050].forEach((y) => ctx.fillText(String(y), X(y), P.y + P.h + 14));
    // 산업화 이전 약 280 ppm
    D.dashedLine(P.x, Y(280), P.x + P.w, Y(280), { color: 'rgba(20,160,88,.7)', width: 1.6, dash: [5, 4] });
    txt('산업화 이전 약 280', P.x + P.w - 2, Y(280) - 7, f(10.5, 700), '#0b7a41', 'right');
    // 실측 실선
    const grad = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); grad.addColorStop(0, 'rgba(226,70,75,.28)'); grad.addColorStop(1, 'rgba(226,70,75,.02)');
    ctx.beginPath(); ctx.moveTo(X(1850), P.y + P.h); for (let y = 1850; y <= 2025; y += 5) ctx.lineTo(X(y), Y(co2At(y))); ctx.lineTo(X(2025), P.y + P.h); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = '#d14b3d'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); for (let y = 1850; y <= 2025; y += 2.5) { y === 1850 ? ctx.moveTo(X(y), Y(co2At(y))) : ctx.lineTo(X(y), Y(co2At(y))); } ctx.stroke();
    // 지금 추세가 이어진다면(점선)
    if (S.yr > 2025.5) {
      ctx.strokeStyle = '#d14b3d'; ctx.lineWidth = 3; ctx.setLineDash([2, 6]); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X(2025), Y(425)); ctx.lineTo(X(S.yr), Y(co2At(S.yr))); ctx.stroke(); ctx.setLineDash([]);
    }
    const hy = Math.max(S.yr, 2025);
    D.sphere(X(hy), Y(co2At(hy)), 5.2, '#e2464b', { gloss: false });
    halo(X(hy), Y(co2At(hy)), 14, '#e2464b', 0.3);
    txt('공기 입자 100만 개 중 약 ' + Math.round(v) + '개', C.x + C.w / 2, C.y + C.h - 11, f(12, 700), COL.muted);
    if (S.yr > 2025.5) txt('지금 추세가 이어진다면', X(2050) - 40, Y(520) - 2, f(10.5, 800), '#c2410c', 'center');
  }
  function drawTrashCard(Tr, t) {
    softShadow(() => { ctx.fillStyle = '#f6f9fd'; rr(Tr.x, Tr.y, Tr.w, Tr.h, 14); ctx.fill(); }, 6, 2);
    txt('🗑️ 쓰레기', Tr.x + 12, Tr.y + 16, f(13.5, 800), COL.ink, 'left');
    const n = S.bags.length, cols = LAY.kind === 'tall' ? 8 : 7, cw = Math.max(4, (Tr.w - 20) / cols);
    for (let i = 0; i < 26; i++) {
      const c = i % cols, r = Math.floor(i / cols), cx = Tr.x + 10 + cw * (c + 0.5), cy = Tr.y + Tr.h - 24 - r * (cw * 0.9);
      if (i < n) {
        const b = S.bags[i], age = nowS() - b.born, u = RM ? 1 : EASE.outBack(clamp(age / 0.4, 0, 1));
        if (age < 0) continue;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(u, u);
        ctx.fillStyle = BAG_COL[i % 5]; ctx.beginPath(); ctx.ellipse(0, 0, cw * 0.38, cw * 0.32, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-2, -cw * 0.26); ctx.lineTo(0, -cw * 0.5); ctx.lineTo(2, -cw * 0.26); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.ellipse(-cw * 0.12, -cw * 0.1, cw * 0.1, cw * 0.06, -0.5, 0, TAU); ctx.fill();
        ctx.restore();
      } else { ctx.fillStyle = 'rgba(100,116,139,.13)'; ctx.beginPath(); ctx.ellipse(cx, cy, cw * 0.3, cw * 0.25, 0, 0, TAU); ctx.fill(); }
    }
    txt('쓰레기 봉투가 쌓여요', Tr.x + Tr.w / 2, Tr.y + 33, f(11.5, 700), COL.muted);
  }
  function drawDashboard(D0, t) {
    if (D0.a < 0.01) return;
    const L = dashLayout(D0);
    ctx.save(); ctx.globalAlpha = D0.a;
    softShadow(() => { ctx.fillStyle = '#fff'; rr(D0.x, D0.y, D0.w, D0.h, 16); ctx.fill(); }, 12, 3);
    txt('📊 지구 계기판', L.head.x, L.head.y, f(14.5, 800), COL.ink, 'left');
    pill(L.head.x + (LAY.kind === 'tall' ? 118 : 120), L.head.y, '지금처럼 쓴다면', { bg: '#fff4e0', color: '#b45309', size: 12, h: 22, align: 'left', border: '#f5c98a' });
    TANKS.forEach((tk, i) => {
      const T = L.tanks[i], lv = tankLevel(tk.id, S.yr);
      // 바닥나는 순간 알림
      if (S.tankLevel[tk.id] > 0.003 && lv <= 0.003) { S.tankFlash[tk.id] = nowS(); Sound.fail(); }
      S.tankLevel[tk.id] = lv;
      drawTank(T, tk, lv, t);
      txt(tk.icon + ' ' + tk.name, T.cx, T.top + T.h + 18, f(13.5, 800), COL.ink);
      txt(Math.round(lv * 100) + '%', T.cx, T.top + T.h + (LAY.kind === 'tall' ? 38 : 36), fm(15), lv <= 0.003 ? COL.bad : '#334155');
      if (S.hoverSpot === 'tank' + tk.id) { ctx.strokeStyle = rgba('#3867f4', 0.5); ctx.lineWidth = 2.5; rr(T.cx - T.w / 2 - 8, T.top - 6, T.w + 16, T.h + 48, 14); ctx.stroke(); }
    });
    drawCo2Card(L.co2, t);
    drawTrashCard(L.trash, t);
    // 처음 눌러 볼 때 안내 고리
    if (isNew('meters')) newRing(D0.x - 2, D0.y - 2, D0.w + 4, D0.h + 4);
    ctx.restore();
  }
  function tankAt(p) {
    if (PAN.dash.a < 0.5 || S.view !== 'meters') return null;
    const L = dashLayout(PAN.dash);
    for (let i = 0; i < 3; i++) { const T = L.tanks[i]; if (p.x >= T.cx - T.w / 2 - 14 && p.x <= T.cx + T.w / 2 + 14 && p.y >= T.top - 8 && p.y <= T.top + T.h + 44) return TANKS[i]; }
    return null;
  }
  function tapTank(tk) {
    const L = dashLayout(PAN.dash), T = L.tanks[TANKS.indexOf(tk)], lv = tankLevel(tk.id, S.yr), empty = lv <= 0.003;
    S.tapped[tk.id] = true;
    if (empty && (tk.id === 'oil' || tk.id === 'gas')) S.tappedEmpty = true;
    bubble(T.cx, T.top - 4, tk.icon + ' ' + tk.name + (empty ? ' · 바닥났어요!' : ' · 남은 양 ' + Math.round(lv * 100) + '%') + '\n' + tk.info + '\n가채 연수: 확인된 매장량을 해마다 쓰는 양으로 나눈 값', { kind: empty ? 'bad' : 'info', tag: 'tank', dur: 4.2, maxW: 260 });
    ringFx(T.cx, T.top + T.h / 2, empty ? COL.bad : '#3867f4', 18);
    Sound.click();
    syncDom();
  }
  /* 10년 뒤로 / 2025년으로 */
  function yearStep() {
    if (S.year >= 2075) return;
    S.year += 10;
    SciSim.tween(S, { yr: S.year }, { duration: RM ? 0.01 : 0.9, ease: 'inOutCubic' });
    const want = bagsFor(S.year);
    while (S.bags.length < want) S.bags.push({ born: nowS() + (S.bags.length % 4) * 0.12 + 0.15 });
    Sound.tick();
    syncDom();
  }
  function yearReset() {
    S.year = 2025; S.tappedEmpty = false;
    SciSim.tween(S, { yr: 2025 }, { duration: RM ? 0.01 : 0.7, ease: 'inOutCubic' });
    S.bags.length = Math.min(S.bags.length, bagsFor(2025));
    S.tankFlash = { oil: 0, gas: 0, coal: 0 };
    Sound.click();
    syncDom();
  }

  /* =========================================================
     📈 하루 전력 그래프 (2·3단계)
     x: 08시 → 다음 날 08시 · y: 시간당 전기량(kWh) · 누적 면적(태양광·풍력·저장 장치·석탄) + 수요선 + 플레이헤드
     ========================================================= */
  const GR_COL = { sol: '#fbbf24', win: '#14b8a6', dis: '#8b5cf6', coal: '#6b7280' };
  function graphLayout(G) {
    const tall = LAY.kind === 'tall';
    const l = tall ? 38 : 44, r = tall ? 10 : 14, tp = tall ? 62 : 50, b = tall ? 30 : 26;
    return { plot: { x: G.x + l, y: G.y + tp, w: G.w - l - r, h: G.h - tp - b }, kwh: { x: G.x + 8, y: G.y + tp - 20, w: 120, h: 18 } };
  }
  const clockStr = (h) => { const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60 / 5) * 5; return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
  function drawBands(P, res, upto, alpha) {
    const n = Math.min(DAY_STEPS, Math.max(1, Math.floor(upto)));
    const X = (i) => P.x + (i / DAY_STEPS) * P.w, Y = (v) => P.y + P.h - (v / 12) * P.h;
    const cum = (i, k) => (k === 0 ? 0 : k === 1 ? res.sol[i] : k === 2 ? res.sol[i] + res.win[i] : k === 3 ? res.sol[i] + res.win[i] + res.dis[i] : res.sol[i] + res.win[i] + res.dis[i] + res.coal[i]);
    const cols = [GR_COL.sol, GR_COL.win, GR_COL.dis, GR_COL.coal];
    ctx.save(); ctx.globalAlpha *= alpha;
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = cols[k]; ctx.beginPath();
      for (let i = 0; i <= n; i++) { const ii = Math.min(i, DAY_STEPS - 1); ctx.lineTo(X(i), Y(cum(ii, k + 1))); }
      for (let i = n; i >= 0; i--) { const ii = Math.min(i, DAY_STEPS - 1); ctx.lineTo(X(i), Y(cum(ii, k))); }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // 남는 전기(수요선 위로 넘치는 부분): 빗금. 저장 장치가 있으면 보라색(충전), 없으면 회색(버려짐)
    ctx.save(); ctx.beginPath(); let any = false;
    for (let i = 0; i < n; i++) {
      const top = res.sol[i] + res.win[i], dem = res.dem[i];
      if (top > dem + 0.02) { any = true; const x0 = X(i), x1 = X(i + 1) + 0.4; ctx.moveTo(x0, Y(dem)); ctx.lineTo(x1, Y(dem)); ctx.lineTo(x1, Y(top)); ctx.lineTo(x0, Y(top)); ctx.closePath(); }
    }
    if (any) {
      ctx.clip();
      ctx.fillStyle = res.cfg.ess ? 'rgba(139,92,246,.2)' : 'rgba(255,255,255,.35)'; ctx.fillRect(P.x, P.y, P.w, P.h);
      ctx.strokeStyle = res.cfg.ess ? 'rgba(124,58,237,.9)' : 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.7;
      for (let x = P.x - P.h; x < P.x + P.w; x += 8) { ctx.beginPath(); ctx.moveTo(x, P.y + P.h); ctx.lineTo(x + P.h, P.y); ctx.stroke(); }
    }
    ctx.restore();
  }
  function drawGraph(G, t, dt) {
    if (G.a < 0.01 || G.w < 60) return;
    const Lg = graphLayout(G), P = Lg.plot, tall = LAY.kind === 'tall';
    const X = (i) => P.x + (i / DAY_STEPS) * P.w, Y = (v) => P.y + P.h - (v / 12) * P.h;
    ctx.save(); ctx.globalAlpha = G.a;
    softShadow(() => { ctx.fillStyle = '#fff'; rr(G.x, G.y, G.w, G.h, 16); ctx.fill(); }, 12, 3);
    txt('📈 하루 전력 그래프', G.x + 14, G.y + 17, f(14, 800), COL.ink, 'left');
    // 범례
    const items = [['태양광', GR_COL.sol, '☀️'], ['풍력', GR_COL.win, '🌬️'], ['저장 장치', GR_COL.dis, '🔋'], ['석탄', GR_COL.coal, '🏭']];
    let lx = G.x + (tall ? 14 : G.w - 14), ly = G.y + (tall ? 35 : 17);
    if (!tall) { let total = 62; ctx.font = f(12, 700); items.forEach((it) => { total += ctx.measureText(it[0]).width + 28; }); lx = G.x + G.w - 14 - total; ly = G.y + 17; }
    ctx.font = f(12, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    items.forEach((it) => { ctx.fillStyle = it[1]; rr(lx, ly - 6, 12, 12, 3); ctx.fill(); ctx.fillStyle = '#334155'; ctx.fillText(it[0], lx + 17, ly + 1); lx += ctx.measureText(it[0]).width + 30; });
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 14, ly); ctx.stroke(); ctx.fillStyle = '#334155'; ctx.fillText('수요', lx + 19, ly + 1);
    // 축
    txt('시간당 전기량(kWh) ⓘ', G.x + 14, G.y + (tall ? 53 : 36), f(11.5, 800), S.hoverSpot === 'kwh' ? '#3867f4' : COL.muted, 'left');
    ctx.strokeStyle = 'rgba(100,116,139,.2)'; ctx.lineWidth = 1; ctx.fillStyle = COL.muted; ctx.font = f(11, 700); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    [0, 3, 6, 9, 12].forEach((v) => { ctx.beginPath(); ctx.moveTo(P.x, Y(v)); ctx.lineTo(P.x + P.w, Y(v)); ctx.stroke(); ctx.fillText(String(v), P.x - 6, Y(v)); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (let h = 0; h <= 24; h += 4) { const x = X(h * STEPS); ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.beginPath(); ctx.moveTo(x, P.y + P.h); ctx.lineTo(x, P.y + P.h + 4); ctx.stroke(); ctx.fillText(String((8 + h) % 24).padStart(2, '0') + '시', x, P.y + P.h + 17); }
    // 밤 시간대 음영
    const n0 = X((19.5 - 8) * STEPS), n1 = X((29.5 - 8) * STEPS);
    ctx.fillStyle = 'rgba(60,70,140,.07)'; ctx.fillRect(n0, P.y, n1 - n0, P.h);
    txt('🌙 밤', (n0 + n1) / 2, P.y + 11, f(11.5, 800), '#7a86b8');
    txt('☀️ 낮', (X(0) + n0) / 2, P.y + 11, f(11.5, 800), '#c08a00');
    // 데이터
    const res = S.run ? S.run.res : S.gr ? S.gr.res : null;
    if (res) {
      const upto = S.run ? S.run.t * STEPS : DAY_STEPS;
      drawBands(P, res, upto, 0.95);
      // 수요선
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath();
      const n = Math.min(DAY_STEPS, Math.max(1, Math.floor(upto)));
      for (let i = 0; i < n; i++) { const y = Y(res.dem[i]); i ? ctx.lineTo(X(i), y) : ctx.moveTo(X(i), y); ctx.lineTo(X(i + 1), y); }
      ctx.stroke();
    } else {
      const pv = preview();
      drawBands(P, pv, DAY_STEPS, 0.2);
      ctx.strokeStyle = 'rgba(27,35,51,.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath();
      for (let i = 0; i < DAY_STEPS; i++) { const y = Y(pv.dem[i]); i ? ctx.lineTo(X(i), y) : ctx.moveTo(X(i), y); ctx.lineTo(X(i + 1), y); }
      ctx.stroke();
      ctx.beginPath(); for (let i = 0; i < DAY_STEPS; i++) { const y = Y(pv.sol[i] + pv.win[i] + pv.dis[i]); i ? ctx.lineTo(X(i), y) : ctx.moveTo(X(i), y); } ctx.strokeStyle = 'rgba(100,116,139,.75)'; ctx.stroke(); ctx.setLineDash([]);
      const a = 0.55 + 0.25 * (RM ? 0 : Math.sin(t * 2.2));
      pill(P.x + P.w / 2, P.y + P.h * 0.5, '예상 그래프 · ' + (has('power') ? '▶ 하루 돌려 보기를 눌러요' : ''), { bg: 'rgba(255,255,255,.9)', color: '#475569', size: 12.5, h: 26, border: '#cfd8e6' });
      void a;
    }
    // 플레이헤드
    if (S.run) {
      const x = X(S.run.t * STEPS);
      ctx.strokeStyle = 'rgba(27,35,51,.7)'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x, P.y - 2); ctx.lineTo(x, P.y + P.h); ctx.stroke(); ctx.setLineDash([]);
      pill(clamp(x, P.x + 28, P.x + P.w - 28), P.y - 8, '🕗 ' + clockStr(8 + S.run.t), { bg: COL.ink, size: 11.5, h: 20, pad: 7 });
    }
    // 결과 칩: 하루가 끝나면 튀어나온다
    if (S.chipT > 0 && S.gr) {
      const age = nowS() - S.chipT, u = RM ? 1 : EASE.outBack(clamp(age / 0.5, 0, 1));
      const rec = S.gr.rec, s = '석탄 발전 ' + rec.coal.toFixed(1) + ' kWh · 이산화 탄소 약 ' + Math.round(rec.co2) + ' kg';
      ctx.save(); ctx.translate(P.x + P.w - 10, P.y + 22); ctx.scale(u, u);
      pill(0, 0, s, { bg: rec.coal <= 0.05 ? '#14a058' : '#1b2333', size: tall ? 11.5 : 13, h: 28, align: 'right', shadow: true });
      ctx.restore();
      if (rec.coal <= 0.05 && age < 2.2 && !RM) { ctx.save(); ctx.globalAlpha = clamp(1 - age / 2.2, 0, 1); txt('🌱 석탄 발전 0!', P.x + P.w - 70, P.y + 54, f(14, 800), '#0b7a41'); ctx.restore(); }
    }
    if (isNew('power')) newRing(G.x - 2, G.y - 2, G.w + 4, G.h + 4);
    ctx.restore();
  }
  const kwhHit = (p) => { if (PAN.graph.a < 0.5) return false; const tall = LAY.kind === 'tall'; return inR(p, { x: PAN.graph.x + 8, y: PAN.graph.y + (tall ? 43 : 26), w: 130, h: 20 }, 4); };

  /* =========================================================
     🃏 실천 카드 스위치 (3단계 흐린 날 도전) · 🧪 실행 기록
     개인(👤)은 내가 바로 하는 일, 사회(🏛️)는 법·제도·시설
     ========================================================= */
  const SW_CARDS = [
    { id: 'plug', who: 'indiv', icon: '🔌', t: '플러그 뽑기 · 전등 끄기', fx: '전기 사용 6 %↓' },
    { id: 'ac', who: 'indiv', icon: '❄️', t: '여름 냉방 온도 26 °C 지키기', fx: '전기 사용 6 %↓' },
    { id: 'sub', who: 'social', icon: '☀️', t: '재생 에너지 지원 제도', fx: '태양광 발전 25 %↑' },
    { id: 'eff', who: 'social', icon: '🏷️', t: '고효율 가전 보급 제도', fx: '전기 사용 8 %↓' },
  ];
  const WHO = { indiv: { name: '👤 개인', col: '#3867f4', soft: '#e8eefe' }, social: { name: '🏛️ 사회', col: '#e0661f', soft: '#fff0e6' } };
  function swLayout(C) {
    const tall = LAY.kind === 'tall', top = C.y + (tall ? 24 : 32), gap = tall ? 4 : 7, h = (C.h - (top - C.y) - 8 - gap * 3) / 4;
    return SW_CARDS.map((c, i) => ({ id: c.id, x: C.x + 6, y: top + i * (h + gap), w: C.w - 12, h }));
  }
  function drawSwitchCards(C, t) {
    if (C.a < 0.01) return;
    const tall = LAY.kind === 'tall', L = swLayout(C);
    ctx.save(); ctx.globalAlpha = C.a;
    softShadow(() => { ctx.fillStyle = '#f4f7fc'; rr(C.x, C.y, C.w, C.h, 16); ctx.fill(); }, 12, 3);
    txt('🃏 실천 카드 · 눌러서 켜고 꺼요', C.x + 12, C.y + (tall ? 14 : 18), f(tall ? 11.5 : 13, 800), COL.ink, 'left');
    SW_CARDS.forEach((c, i) => {
      const R = L[i], sw = S.sw[c.id], who = WHO[c.who], on = !!S.cards[c.id], hot = S.hoverSpot === 'sw' + c.id;
      ctx.save();
      if (hot) { ctx.translate(R.x + R.w / 2, R.y + R.h / 2); ctx.scale(1.02, 1.02); ctx.translate(-R.x - R.w / 2, -R.y - R.h / 2); }
      softShadow(() => { ctx.fillStyle = '#fff'; rr(R.x, R.y, R.w, R.h, 12); ctx.fill(); }, on ? 12 : 7, on ? 4 : 2, on ? rgba(who.col, 0.3) : 'rgba(20,40,80,.14)');
      ctx.fillStyle = who.col; rr(R.x, R.y, 7, R.h, 3.5); ctx.fill();
      if (on) { ctx.strokeStyle = rgba(who.col, 0.65); ctx.lineWidth = 2.4; rr(R.x, R.y, R.w, R.h, 12); ctx.stroke(); }
      const ix = R.x + (tall ? 24 : 30), iy = R.y + R.h / 2;
      ctx.fillStyle = rgba(who.col, 0.12); ctx.beginPath(); ctx.arc(ix, iy - (tall ? 4 : 6), tall ? 14 : 18, 0, TAU); ctx.fill();
      txt(c.icon, ix, iy - (tall ? 3 : 5), f(tall ? 17 : 22, 400), COL.ink);
      pill(ix, R.y + R.h - (tall ? 10 : 13), who.name, { bg: who.soft, color: who.col, size: tall ? 10 : 11, h: tall ? 14 : 17, pad: tall ? 4 : 6 });
      const tx = R.x + (tall ? 46 : 58), tw = R.w - (tall ? 46 : 58) - (tall ? 8 : 62);
      const wl = wrapLines(c.t, tw, f(tall ? 11.5 : 13, 800));
      const fs = wl.lines.length > 2 ? (tall ? 10.5 : 12) : (tall ? 11.5 : 13);
      drawLines(c.t, tx, R.y + R.h * 0.34, tw, fs, COL.ink, { weight: 800, align: 'left', lh: fs + 2 });
      txt(c.fx, tx, R.y + R.h - (tall ? 10 : 14), f(tall ? 10.5 : 12, 800), on ? '#0b7a41' : '#64748b', 'left');
      // 스위치: 손잡이가 easeOutBack으로 움직인다
      const sw_w = tall ? 36 : 46, sw_h = tall ? 20 : 26, sx = R.x + R.w - sw_w - (tall ? 8 : 10), sy = R.y + R.h / 2 - sw_h / 2;
      ctx.fillStyle = SciSim.color.mix('#cbd5e1', '#14a058', clamp(sw, 0, 1)); rr(sx, sy, sw_w, sw_h, sw_h / 2); ctx.fill();
      const kx = sx + sw_h / 2 + (sw_w - sw_h) * sw;
      softShadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(kx, sy + sw_h / 2, sw_h / 2 - 2.4, 0, TAU); ctx.fill(); }, 4, 1.5);
      txt(on ? 'ON' : 'OFF', sx + sw_w / 2 + (on ? -5 : 5), sy + sw_h + (tall ? 8 : 10), f(tall ? 9 : 10, 800), on ? '#0b7a41' : '#94a3b8');
      ctx.restore();
    });
    ctx.restore();
  }
  function swAt(p) {
    if (PAN.cards.a < 0.5 || !(S.view === 'cards')) return null;
    const L = swLayout(PAN.cards);
    for (const R of L) if (inR(p, R, 2)) return R.id;
    return null;
  }
  /* 마을 안의 실천 카드 효과: 플러그(대기 전력) · 냉방 표시창 · 1등급 배지 */
  function drawCardFx(h, t) {
    const sp = S.sw.plug, sa = S.sw.ac, se = S.sw.eff;
    // 플러그: 꽂혀 있으면 대기 전력 빨간 점이 깜빡이고, 쏙 빠지면 사라진다
    const px = h.x - h.w / 2 + 8, py = h.y - 7;
    ctx.fillStyle = '#e8ecf2'; rr(px - 4, py - 4, 9, 9, 2); ctx.fill();
    const off = sp * 9;
    ctx.save(); ctx.translate(-off * 1.2, -off * 0.8 * 0); ctx.globalAlpha = 1 - 0.0 * sp;
    ctx.fillStyle = '#3a4252'; rr(px - 3 - 6 * sp, py - 2.5 - 5 * sp, 7, 5, 1.2); ctx.fill();
    ctx.restore();
    if (sp < 0.9) { const blink = RM ? 1 : (Math.sin(t * 6 + h.i) > 0 ? 1 : 0.25); ctx.fillStyle = 'rgba(255,60,60,' + (blink * (1 - sp)).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(px + 1, py + 7, 1.8, 0, TAU); ctx.fill(); }
    // 냉방 표시창
    const ax = h.x - 11, ay = h.y - h.wh + 3;
    ctx.fillStyle = '#f4f6fa'; rr(ax, ay, 22, 9, 2.5); ctx.fill(); ctx.strokeStyle = '#b8c1cf'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.font = f(7.5, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = sa > 0.5 ? '#0b7a41' : '#c2410c'; ctx.fillText(sa > 0.5 ? '26°' : '20°', ax + 11, ay + 4.8);
    // 1등급 배지
    if (se > 0.02) {
      const bx = h.x + h.w / 2 - 1, by = h.y - h.wh + 20, sc = 0.6 + 0.4 * se;
      ctx.save(); ctx.globalAlpha = clamp(se, 0, 1); ctx.translate(bx, by); ctx.scale(sc, sc);
      ctx.fillStyle = '#f5b301'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.stroke();
      txt('1', 0, 0.5, f(9, 800), '#fff');
      if (!RM) { const tw = (t * 1.3 + h.i * 0.4) % 2; if (tw < 0.35) D.spark(5, -6, 4.5 * Math.sin((tw / 0.35) * Math.PI), t, '#fff6c2'); }
      ctx.restore();
    }
  }

  /* ---- 🧪 실행 기록: 최근 3회 막대(석탄 발전 kWh) ---- */
  const CARD_ICON = { plug: '🔌', ac: '❄️', sub: '☀️', eff: '🏷️' };
  function drawHistory(H, t, dt) {
    if (H.a < 0.01) return;
    const tall = LAY.kind === 'tall';
    ctx.save(); ctx.globalAlpha = H.a;
    softShadow(() => { ctx.fillStyle = '#fff'; rr(H.x, H.y, H.w, H.h, 16); ctx.fill(); }, 12, 3);
    txt('🧪 실행 기록 · 석탄 발전(kWh)', H.x + 12, H.y + 16, f(tall ? 13 : 12.5, 800), COL.ink, 'left');
    const P = { x: H.x + 14, y: H.y + 34, w: H.w - 28, h: H.h - 34 - (tall ? 56 : 50) }, MAXV = 14;
    const Y = (v) => P.y + P.h - (v / MAXV) * P.h;
    ctx.strokeStyle = 'rgba(100,116,139,.2)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.x, P.y + P.h); ctx.lineTo(P.x + P.w, P.y + P.h); ctx.stroke();
    // 목표선: 1 kWh
    D.dashedLine(P.x, Y(1), P.x + P.w, Y(1), { color: '#14a058', width: 2, dash: [6, 4] });
    const last3 = S.runs.slice(-3), bw = Math.min(54, P.w / 4.2), gap = (P.w - bw * 3) / 4, base = S.runs.length - last3.length;
    for (let k = 0; k < 3; k++) {
      const bx = P.x + gap * (k + 1) + bw * k, rec = last3[k];
      S.bars[k] = approachV(S.bars[k], rec ? rec.coal : 0, dt, 5);
      if (!rec) { ctx.strokeStyle = 'rgba(148,163,184,.6)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.6; rr(bx, P.y + P.h - 26, bw, 26, 6); ctx.stroke(); ctx.setLineDash([]); txt('—', bx + bw / 2, P.y + P.h - 13, f(13, 800), '#94a3b8'); continue; }
      const over = S.bars[k] > MAXV, hh = Math.max(3, Math.min(1, S.bars[k] / MAXV) * P.h), good = rec.coal <= 1.0;
      const g = ctx.createLinearGradient(0, P.y + P.h - hh, 0, P.y + P.h); g.addColorStop(0, good ? '#34d399' : '#8a93a3'); g.addColorStop(1, good ? '#14a058' : '#5b6474');
      softShadow(() => { ctx.fillStyle = g; rr(bx, P.y + P.h - hh, bw, hh, 7); ctx.fill(); }, 6, 2);
      ctx.fillStyle = 'rgba(255,255,255,.28)'; rr(bx + 5, P.y + P.h - hh + 4, 6, Math.max(2, hh - 8), 3); ctx.fill();
      if (over) { ctx.fillStyle = '#fff'; ctx.beginPath(); const by = P.y + P.h - hh * 0.55; ctx.moveTo(bx - 2, by); for (let z = 0; z <= 6; z++) ctx.lineTo(bx - 2 + (bw + 4) * z / 6, by + (z % 2 ? 5 : -1)); ctx.lineTo(bx + bw + 2, by + 9); for (let z = 6; z >= 0; z--) ctx.lineTo(bx - 2 + (bw + 4) * z / 6, by + 9 + (z % 2 ? 5 : -1)); ctx.closePath(); ctx.fill(); }
      const vy = Math.max(P.y + 8, Math.min(P.y + P.h - hh - 9, Y(1) - 10)), vin = vy > P.y + P.h - hh - 4;   // 막대 안쪽에 걸리면 흰 글씨
      if (vin) { ctx.font = fm(12.5); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(30,41,59,.85)'; ctx.strokeText(S.bars[k].toFixed(1), bx + bw / 2, vy); }
      txt(S.bars[k].toFixed(1), bx + bw / 2, vy, fm(12.5), vin ? '#fff' : good ? '#0b7a41' : '#334155');
      txt((base + k + 1) + '번째', bx + bw / 2, P.y + P.h + 14, f(11.5, 800), COL.muted);
      const icons = '👤'.repeat(rec.indiv) + '🏛️'.repeat(rec.social);
      txt(icons || '카드 없음', bx + bw / 2, P.y + P.h + (tall ? 34 : 32), f(rec.indiv + rec.social ? 12 : 10.5, 700), icons ? COL.ink : '#94a3b8');
    }
    // 목표선 이름표: 제목 아래 오른쪽(막대와 겹치지 않게)
    ctx.font = f(10.5, 800); const gw = ctx.measureText('목표 1 kWh 이하').width;
    D.dashedLine(H.x + H.w - 14 - gw - 24, H.y + 29, H.x + H.w - 14 - gw - 6, H.y + 29, { color: '#14a058', width: 2, dash: [5, 3] });
    txt('목표 1 kWh 이하', H.x + H.w - 14, H.y + 29, f(10.5, 800), '#0b7a41', 'right');
    ctx.restore();
  }

  /* =========================================================
     📦 실천 방안 나누기 (3단계 미션 1): 카드 8장 → 👤 개인 차원 / 🏛️ 사회 차원 상자
     ========================================================= */
  const SORT_CARDS = [
    { id: 'plug', who: 'indiv', icon: '🔌', t: '쓰지 않는 플러그 뽑기' },
    { id: 'bike', who: 'indiv', icon: '🚲', t: '가까운 곳은 걷거나 자전거 타기' },
    { id: 'cup', who: 'indiv', icon: '🥤', t: '일회용 컵 대신 텀블러 쓰기' },
    { id: 'recycle', who: 'indiv', icon: '♻️', t: '깨끗이 헹궈 분리배출하기' },
    { id: 'subsidy', who: 'social', icon: '☀️', t: '재생 에너지 발전 시설 설치 지원 제도' },
    { id: 'transit', who: 'social', icon: '🚌', t: '대중교통과 자전거 도로 늘리기' },
    { id: 'grade', who: 'social', icon: '🏷️', t: '에너지 효율 등급 표시 제도' },
    { id: 'paris', who: 'social', icon: '🌐', t: '탄소 중립을 위한 국제 협약(2015년 파리 협정)' },
  ];
  const SORT_ORDER = shuffled([0, 1, 2, 3, 4, 5, 6, 7], 33);
  const SORT_FB = {
    transit: '버스 노선과 자전거 도로를 만드는 것은 정부·지방 자치 단체가 하는 일이에요. 버스를 ‘타는’ 것은 개인 실천이에요.',
    grade: '등급을 표시하도록 정하는 것은 나라의 제도예요. 1등급 제품을 ‘고르는’ 것은 개인 실천이에요.',
  };
  function sortLayout() {
    if (LAY.kind === 'wide') {
      return {
        ov: { x: 8, y: 8, w: 784, h: 584 }, title: { x: 400, y: 34 },
        box: { indiv: { x: 24, y: 58, w: 372, h: 268 }, social: { x: 404, y: 58, w: 372, h: 268 } },
        slot: (who, i) => { const b = sortLayout().box[who]; return { x: b.x + 12, y: b.y + 58 + i * 52, w: b.w - 24, h: 46 }; },
        card: { w: 184, h: 70 }, home: (i) => ({ x: 24 + (i % 4) * 194, y: 372 + Math.floor(i / 4) * 82 }), tray: { x: 16, y: 342, w: 768, h: 242 }, trayLabel: { x: 30, y: 358 },
      };
    }
    return {
      ov: { x: 6, y: 6, w: 468, h: 808 }, title: { x: 240, y: 30 },
      box: { indiv: { x: 14, y: 52, w: 452, h: 216 }, social: { x: 14, y: 278, w: 452, h: 216 } },
      slot: (who, i) => { const b = sortLayout().box[who]; return { x: b.x + 10 + (i % 2) * 220, y: b.y + 56 + Math.floor(i / 2) * 76, w: 212, h: 68 }; },
      card: { w: 220, h: 58 }, home: (i) => ({ x: 14 + (i % 2) * 232, y: 548 + Math.floor(i / 2) * 66 }), tray: { x: 10, y: 504, w: 460, h: 300 }, trayLabel: { x: 24, y: 522 },
    };
  }
  function buildSort() {
    const SS = { deck: null, placed: { indiv: [], social: [] }, squish: { indiv: 0, social: 0 }, sel: null, doneT: 0 };
    const L = sortLayout();
    const boxAt = (p) => (inR(p, L.box.indiv, 6) ? 'indiv' : inR(p, L.box.social, 6) ? 'social' : null);
    SS.deck = makeDeck({
      findTarget: (c, ctr, ptr) => boxAt(ptr || ctr),
      onDrop: (c, ctr, ptr) => sortTry(c, boxAt(ptr) || boxAt(ctr)),
      onTap: (c) => { SS.sel = SS.sel === c.id ? null : c.id; if (SS.sel) bubble(c.x + c.w / 2, c.y, '이제 알맞은 상자를 눌러요', { kind: 'info', tag: 'deck', dur: 2 }); return null; },
    });
    SORT_ORDER.forEach((oi, i) => {
      const cd = SORT_CARDS[oi], h = L.home(i);
      SS.deck.add({ id: cd.id, who: cd.who, icon: cd.icon, t: cd.t, hx: h.x, hy: h.y, w: L.card.w, h: L.card.h });
    });
    return SS;
  }
  function sortTry(c, box) {
    const SS = S.sortS, L = sortLayout();
    if (!box) return null;
    if (box !== c.who) {
      const msg = box === 'indiv' ? (SORT_FB[c.id] || '이것은 법·제도·시설·국제 협력처럼 사회가 함께 하는 일이에요.') : '내가 생활 속에서 바로 할 수 있는 일이에요.';
      SS.squish[box] = -1;
      return { msg, bx: c.x + c.w / 2, by: c.y - 6 };
    }
    const i = SS.placed[box].length, s = L.slot(box, i);
    SS.placed[box].push(c.id); SS.sel = null;
    return { ok: true, x: s.x, y: s.y, w: s.w, h: s.h, done: () => { SS.squish[box] = 1; if (sortCount() === 8) SS.doneT = nowS(); syncDom(); } };
  }
  const sortCount = () => (S.sortS ? S.sortS.placed.indiv.length + S.sortS.placed.social.length : 0);
  function resetSort() { S.sortS = buildSort(); }
  /* 되돌아와도 같은 장면: 8장 모두 알맞은 상자에 들어 있는 상태 */
  function ensureSort() {
    if (!S.sortS) resetSort();
    const SS = S.sortS;
    if (sortCount() === 8) return;
    const L = sortLayout();
    SS.placed = { indiv: [], social: [] };
    SS.deck.cards.forEach((c) => { const s = L.slot(c.who, SS.placed[c.who].length); SS.placed[c.who].push(c.id); c.placed = true; c.x = c.tx = s.x; c.y = c.ty = s.y; c.w = s.w; c.h = s.h; c.ret = false; });
    SS.doneT = nowS() - 5;
  }
  function relayoutSort() {
    if (!S.sortS) { resetSort(); return; }
    const SS = S.sortS, L = sortLayout(), cnt = { indiv: 0, social: 0 };
    SS.deck.cards.forEach((c) => {
      const idx = SORT_CARDS.findIndex((x) => x.id === c.id), order = SORT_ORDER.indexOf(idx), h = L.home(order);
      c.hx = h.x; c.hy = h.y;
      if (c.placed) { const s = L.slot(c.who, cnt[c.who]++); c.x = c.tx = s.x; c.y = c.ty = s.y; c.w = s.w; c.h = s.h; }
      else { c.w = L.card.w; c.h = L.card.h; c.x = c.hx; c.y = c.hy; }
    });
  }
  function paintSortCard(c, x, y, w, h, shadow) {
    ctx.fillStyle = '#fff'; rr(x, y, w, h, 12); ctx.fill();
    if (shadow) return;
    const who = c.placed ? WHO[c.who] : null, small = h < 56;
    ctx.fillStyle = who ? who.col : '#94a3b8'; rr(x, y, 7, h, 3.5); ctx.fill();
    ctx.fillStyle = rgba(who ? who.col : '#64748b', 0.12); ctx.beginPath(); ctx.arc(x + 28, y + h / 2, small ? 14 : 18, 0, TAU); ctx.fill();
    txt(c.icon, x + 28, y + h / 2 + 1, f(small ? 17 : 22, 400), COL.ink);
    const tw = w - 54 - (c.placed ? 26 : 10);
    let fs = small ? 13 : 14, wl = wrapLines(c.t, tw, f(fs, 800));
    if (wl.lines.length > 2) { fs = small ? 12 : 12.5; wl = wrapLines(c.t, tw, f(fs, 800)); }
    drawLines(c.t, x + 50 + tw / 2, y + h / 2 + 1, tw, fs, COL.ink, { weight: 800, align: 'center', lh: fs + 2.4 });
    if (c.placed) D.check(x + w - 15, y + h / 2, 8.5, 1);
    if (S.sortS && S.sortS.sel === c.id) { ctx.strokeStyle = COL.good; ctx.lineWidth = 3; rr(x, y, w, h, 12); ctx.stroke(); }
  }
  function drawSortOverlay(t, dt) {
    const a = PAN.sort.a;
    if (a < 0.01 || !S.sortS) return;
    const SS = S.sortS, L = sortLayout(), ov = L.ov, tall = LAY.kind === 'tall';
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 26);
    softShadow(() => { ctx.fillStyle = '#f4f8fd'; rr(ov.x, ov.y, ov.w, ov.h, 18); ctx.fill(); }, 18, 5, 'rgba(20,40,80,.28)');
    txt('실천 카드를 👤 개인 차원과 🏛️ 사회 차원으로 나누어 봐요', L.title.x, L.title.y, f(tall ? 15 : 18, 800), COL.ink);
    ['indiv', 'social'].forEach((who) => {
      const B = L.box[who], W2 = WHO[who];
      SS.squish[who] += (0 - SS.squish[who]) * (1 - Math.exp(-9 * dt));
      const sq = SS.squish[who], hot = SS.deck.hoverT === who;
      ctx.save(); ctx.translate(B.x + B.w / 2, B.y + B.h); ctx.scale(1 + 0.012 * Math.abs(sq), 1 - 0.035 * Math.max(0, sq)); ctx.translate(-(B.x + B.w / 2), -(B.y + B.h));
      softShadow(() => { ctx.fillStyle = W2.soft; rr(B.x, B.y, B.w, B.h, 16); ctx.fill(); }, 10, 3);
      ctx.strokeStyle = rgba(W2.col, 0.55); ctx.lineWidth = 2.5; ctx.setLineDash([8, 5]); rr(B.x, B.y, B.w, B.h, 16); ctx.stroke(); ctx.setLineDash([]);
      // 상자 앞면 띠(열린 상자 느낌)
      ctx.fillStyle = rgba(W2.col, 0.16); rr(B.x, B.y, B.w, 40, 16); ctx.fill();
      txt(W2.name + ' 차원', B.x + 14, B.y + 17, f(tall ? 15 : 17, 800), W2.col, 'left');
      txt(who === 'indiv' ? '내가 생활 속에서 바로 할 수 있는 실천' : '법 · 제도 · 시설 · 국제 협력처럼 사회가 함께 하는 활동', B.x + 14, B.y + 34, f(tall ? 11 : 12, 700), COL.muted, 'left');
      txt(SS.placed[who].length + '/4', B.x + B.w - 14, B.y + 18, fm(15), W2.col, 'right');
      if (hot) { breathe(B.x, B.y, B.w, B.h, 16, COL.good); ctx.fillStyle = 'rgba(20,160,88,.08)'; rr(B.x, B.y, B.w, B.h, 16); ctx.fill(); }
      ctx.restore();
    });
    // 보관함(카드 8장)
    const T = L.tray;
    if (sortCount() < 8) { ctx.fillStyle = 'rgba(100,116,139,.09)'; rr(T.x, T.y, T.w, T.h, 16); ctx.fill(); txt('📦 카드를 끌어 알맞은 상자에 넣어요 (카드를 누르고 상자를 눌러도 돼요)', L.trayLabel.x, L.trayLabel.y, f(12.5, 800), '#64748b', 'left'); }
    else {
      const k = clamp((nowS() - SS.doneT - 0.2) / 0.6, 0, 1);
      if (k > 0) { ctx.save(); ctx.globalAlpha = k; softShadow(() => { ctx.fillStyle = '#fff'; rr(T.x + 20, T.y + 30, T.w - 40, tall ? 150 : 120, 16); ctx.fill(); }, 10, 3);
        txt('🤝', T.x + 58, T.y + (tall ? 105 : 90), f(36, 400), COL.ink);
        drawLines('개인의 실천과 사회의 제도가 함께 필요해요.\n흐린 날 실험에서 확인해 봐요!', T.x + 90 + (T.w - 130) / 2, T.y + (tall ? 105 : 90), T.w - 150, tall ? 15 : 17, COL.ink, { weight: 800, align: 'center', lh: tall ? 22 : 26 });
        ctx.restore(); }
    }
    SS.deck.draw((c, x, y, w, h, shadowPass) => paintSortCard(c, x, y, w, h, shadowPass));
    ctx.restore();
  }
  function sortDown(p) {
    const SS = S.sortS; if (!SS || PAN.sort.a < 0.6) return false;
    const L = sortLayout();
    if (SS.sel) {                       // 탭 → 탭
      const box = inR(p, L.box.indiv, 6) ? 'indiv' : inR(p, L.box.social, 6) ? 'social' : null;
      if (box) { const c = SS.deck.cards.find((x) => x.id === SS.sel); SS.sel = null; if (c && !c.placed) SS.deck.resolve(c, sortTry(c, box)); return false; }
    }
    return SS.deck.down(p);
  }

  /* =========================================================
     📝 나의 일주일 실천 계획 (4단계) + 🌳 지구 위의 나무
     칸이 맞게 채워질 때마다 나무가 자란다 · 모두 채우면 꽃이 피고 나비가 난다
     ========================================================= */
  const PLAN_ROWS = [
    { id: 'energy', icon: '⚡', name: '에너지', col: '#e0a000', cards: [
      { id: 'e1', t: '잠자기 전 멀티탭 스위치 끄기', ok: true }, { id: 'e2', t: '방을 나갈 때 전등 끄기', ok: true }, { id: 'e3', t: '에너지를 아끼자', ok: false }] },
    { id: 'resource', icon: '♻️', name: '자원', col: '#14a058', cards: [
      { id: 'r1', t: '학교에 텀블러 가져가기', ok: true }, { id: 'r2', t: '우유 팩을 헹궈 따로 모으기', ok: true }, { id: 'r3', t: '지구를 사랑하자', ok: false }] },
    { id: 'move', icon: '🚌', name: '이동·먹거리', col: '#3867f4', cards: [
      { id: 'm1', t: '학원은 버스나 자전거로 가기', ok: true }, { id: 'm2', t: '급식을 남기지 않기', ok: true }, { id: 'm3', t: '환경을 생각하자', ok: false }] },
  ];
  const FREQS = [{ id: 'daily', t: '매일' }, { id: 'w3', t: '주 3회' }, { id: 'w1', t: '주 1회' }];
  const SLOGAN_FB = '좋은 다짐이지만, 언제 무엇을 할지 알 수 없어 실천했는지 확인하기 어려워요. 구체적인 행동 카드를 골라 보세요.';
  function planLayout() {
    const P = PAN_PLAN_RECT();
    if (LAY.kind === 'wide') {
      const sh = { x: 14, y: 14, w: 470, h: 572 };
      return {
        sheet: sh, tree: { x: 494, y: 14, w: 292, h: 572 }, head: { y: sh.y + 34 },
        row: (i) => { const y = 94 + i * 122; return { x: sh.x + 12, y, w: sh.w - 24, label: { x: sh.x + 24, y: y + 12 }, slot: { x: sh.x + 24, y: y + 28, w: sh.w - 48, h: 48 }, ask: { x: sh.x + 26, y: y + 96 }, chips: [0, 1, 2].map((k) => ({ x: sh.x + 84 + k * 126, y: y + 82, w: 118, h: 28 })) }; },
        tray: { x: 22, y: 466, w: 454, h: 114 }, card: { w: 142, h: 86 }, home: (k) => ({ x: 30 + k * 148, y: 490 }),
      };
    }
    const sh = { x: 6, y: 6, w: 468, h: 518 };
    return {
      sheet: sh, tree: { x: 6, y: 530, w: 468, h: 284 }, head: { y: sh.y + 28 },
      row: (i) => { const y = 70 + i * 100; return { x: sh.x + 8, y, w: sh.w - 16, label: { x: sh.x + 18, y: y + 10 }, slot: { x: sh.x + 18, y: y + 24, w: sh.w - 36, h: 44 }, ask: { x: sh.x + 20, y: y + 82 }, chips: [0, 1, 2].map((k) => ({ x: sh.x + 74 + k * 130, y: y + 70, w: 122, h: 24 })) }; },
      tray: { x: 12, y: 372, w: 456, h: 144 }, card: { w: 144, h: 100 }, home: (k) => ({ x: 20 + k * 150, y: 406 }),
    };
  }
  const PAN_PLAN_RECT = () => ({ x: 0, y: 0, w: LAY.W, h: LAY.H });
  function buildPlan() {
    const PL = { slots: [null, null, null], freq: [null, null, null], deck: null, g: 1, gT: 1, leaf: 0, doneT: 0, done: false, cur: 0, hoverSlot: null, sel: null, lastRow: -1 };
    const L = planLayout();
    PL.deck = makeDeck({
      findTarget: (c, ctr, ptr) => (inR(ptr || ctr, L.row(PL.cur).slot, 12) ? 'slot' : null),
      onDrop: (c, ctr, ptr) => planTry(c, ptr || ctr),
      onTap: (c) => { PL.sel = PL.sel === c.id ? null : c.id; if (PL.sel) bubble(c.x + c.w / 2, c.y, '빛나는 칸을 눌러 놓아요', { kind: 'info', tag: 'deck', dur: 2 }); return null; },
    });
    PLAN_ROWS.forEach((row, ri) => row.cards.forEach((cd, k) => {
      const order = shuffled([0, 1, 2], 5 + ri)[k], h = L.home(order);
      const c = PL.deck.add({ id: cd.id, row: ri, ok: cd.ok, t: cd.t, hx: h.x, hy: h.y, w: L.card.w, h: L.card.h, order });
      c.hidden = ri !== 0; c.alpha = ri !== 0 ? 0 : 1;
    }));
    return PL;
  }
  function planTry(c, pt) {
    const PL = S.plan, L = planLayout();
    if (c.row !== PL.cur) return null;
    const R = L.row(PL.cur);
    if (!inR(pt, R.slot, 14)) {
      for (let i = 0; i < 3; i++) if (i !== PL.cur && inR(pt, L.row(i).slot, 6)) return { msg: '빛나는 칸부터 채워요', bx: pt.x, by: pt.y - 10 };
      return null;
    }
    if (!c.ok) return { msg: SLOGAN_FB, bx: R.slot.x + R.slot.w / 2, by: R.slot.y - 4 };
    PL.slots[PL.cur] = c.id; PL.sel = null;
    const row = PL.cur;
    return { ok: true, x: R.slot.x, y: R.slot.y, w: R.slot.w, h: R.slot.h, done: () => planSlotFilled(row) };
  }
  function planSlotFilled(row) {
    const PL = S.plan;
    // 다음 칸: 그 칸의 후보 카드 3장만 보인다(톡 하고 나타남)
    PL.cur = PL.slots.findIndex((s) => s == null); if (PL.cur < 0) PL.cur = 3;
    PL.deck.cards.forEach((c) => {
      if (c.row === row) { if (!c.placed) { c.hidden = true; c.alpha = 0; } }
      else if (c.row === PL.cur && c.hidden) { c.hidden = false; c.alpha = 0; c.sc = 0.7; SciSim.tween(c, { alpha: 1, sc: 1 }, { duration: 0.45, ease: 'outBack', delay: 0.1 + 0.08 * c.order }); }
    });
    growTree();
    const L = planLayout(), R = L.row(row);
    ringFx(R.slot.x + R.slot.w / 2, R.slot.y + R.slot.h / 2, COL.good, 26); sparkle(R.slot.x + 40, R.slot.y + R.slot.h / 2, 12);
    Sound.success();
    checkPlanDone();
    syncDom();
  }
  function planFreq(row, k) {
    const PL = S.plan;
    if (PL.slots[row] == null) { const L = planLayout(), R = L.row(row); bubble(R.chips[k].x + 46, R.chips[k].y, '먼저 행동 카드를 놓아요', { kind: 'bad', tag: 'deck', dur: 1.8 }); return; }
    PL.freq[row] = PL.freq[row] === k ? null : k;
    const L = planLayout(), ch = L.row(row).chips[k];
    if (PL.freq[row] != null) { ringFx(ch.x + ch.w / 2, ch.y + ch.h / 2, COL.good, 14); Sound.tick(); }
    growTree();
    checkPlanDone();
    syncDom();
  }
  function growTree() {
    const PL = S.plan, filled = PL.slots.filter((s) => s != null).length, fq = PL.freq.filter((q) => q != null).length;
    PL.gT = 1 + filled + 0.34 * fq;
    SciSim.tween(PL, { g: PL.gT }, { duration: RM ? 0.01 : 0.9, ease: 'outCubic' });
  }
  const planFilled = () => (S.plan ? S.plan.slots.filter((s) => s != null).length : 0);
  const planFreqs = () => (S.plan ? S.plan.freq.filter((q) => q != null).length : 0);
  function checkPlanDone() {
    const PL = S.plan;
    if (!PL.done && planFilled() === 3 && planFreqs() === 3) { PL.done = true; PL.doneT = nowS() + 0.5; setTimeout(() => { Sound.level(); const T = planLayout().tree; sparkle(T.x + T.w / 2, T.y + T.h * 0.4, 26, ['#ff9ec7', '#ffd84d', '#7be0a8', '#fff']); }, 600); }
  }
  function resetPlan() { S.plan = buildPlan(); S.plan.g = 1; S.plan.gT = 1; }
  /* 되돌아와도 같은 장면: 세 칸 + 횟수가 모두 채워진 상태 */
  function ensurePlan() {
    if (!S.plan) resetPlan();
    const PL = S.plan;
    if (PL.done) return;
    const L = planLayout();
    PLAN_ROWS.forEach((row, ri) => {
      const cd = row.cards.find((x) => x.ok), c = PL.deck.cards.find((x) => x.id === cd.id), R = L.row(ri);
      PL.slots[ri] = cd.id; PL.freq[ri] = PL.freq[ri] != null ? PL.freq[ri] : ri % 3;
      c.hidden = false; c.alpha = 1; c.sc = 1; c.placed = true; c.x = c.tx = R.slot.x; c.y = c.ty = R.slot.y; c.w = R.slot.w; c.h = R.slot.h; c.ret = false;
      PL.deck.cards.forEach((o) => { if (o.row === ri && o !== c) { o.hidden = true; o.alpha = 0; } });
    });
    PL.cur = 3; PL.done = true; PL.doneT = nowS() - 6; PL.gT = 5; PL.g = 5;
  }
  function relayoutPlan() {
    if (!S.plan) { resetPlan(); return; }
    const PL = S.plan, L = planLayout();
    PL.deck.cards.forEach((c) => {
      const h = L.home(c.order); c.hx = h.x; c.hy = h.y;
      const ri = c.row;
      if (c.placed) { const R = L.row(ri); c.x = c.tx = R.slot.x; c.y = c.ty = R.slot.y; c.w = R.slot.w; c.h = R.slot.h; }
      else { c.w = L.card.w; c.h = L.card.h; c.x = c.hx; c.y = c.hy; }
    });
  }

  /* ---- 나무: 재귀 가지 ---- */
  function drawTree(cx, baseY, trunk, g, t, done, doneK) {
    const tips = [];
    const branch = (x, y, ang, len, d, wid) => {
      const p = RM ? (g > d ? 1 : 0) : EASE.outCubic(clamp(g - d, 0, 1));
      if (p <= 0.001) return;
      const sway = RM ? 0 : Math.sin(t * 1.1 + d * 0.9 + x * 0.02) * 0.035 * (d + 1) * 0.6;
      const a = ang + sway, ex = x + Math.cos(a) * len * p, ey = y + Math.sin(a) * len * p;
      ctx.strokeStyle = d === 0 ? '#7a5638' : d < 2 ? '#8a6240' : '#9a7048'; ctx.lineWidth = Math.max(1.8, wid); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
      if (d >= 4 || len < 18) { tips.push({ x: ex, y: ey, d, p }); return; }
      if (p < 0.999) return;
      const spread = 0.5 + d * 0.06;
      branch(ex, ey, a - spread, len * 0.74, d + 1, wid * 0.7);
      branch(ex, ey, a + spread * 0.9, len * 0.7, d + 1, wid * 0.68);
      if (d === 1 || d === 3) branch(ex, ey, a + 0.05, len * 0.62, d + 1, wid * 0.6);
    };
    branch(cx, baseY, -Math.PI / 2, trunk, 0, 9);
    // 잎: 가지 끝에 easeOutBack으로 톡톡 돋고 사인으로 흔들린다
    tips.forEach((tp, i) => {
      const grow = RM ? 1 : EASE.outBack(clamp((g - tp.d - 0.15) * 1.6 + 0.0, 0, 1));
      if (grow <= 0.01) return;
      for (let k = 0; k < 4; k++) {
        const ph = i * 1.7 + k * 2.1, sw = RM ? 0 : Math.sin(t * 1.6 + ph) * 0.35, a = (k / 4) * TAU + ph * 0.3 + sw;
        const lx = tp.x + Math.cos(a) * 9 * grow, ly = tp.y + Math.sin(a) * 8 * grow - 3;
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(a); ctx.scale(grow, grow);
        ctx.fillStyle = ['#4cae5a', '#6cc46a', '#3f9a52', '#82d17a'][(i + k) % 4]; ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 4.4, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
        ctx.restore();
      }
      // 꽃: 세 칸과 횟수를 모두 채우면 피어난다
      if (done && doneK > 0 && i % 2 === 0) {
        const fk = EASE.outBack(clamp(doneK * 1.8 - (i % 5) * 0.12, 0, 1));
        ctx.save(); ctx.translate(tp.x + 3, tp.y - 6); ctx.scale(fk, fk); ctx.rotate(t * 0.3 + i);
        for (let q = 0; q < 5; q++) { ctx.rotate(TAU / 5); ctx.fillStyle = i % 4 === 0 ? '#ff9ec7' : '#ffd1e3'; ctx.beginPath(); ctx.ellipse(0, -5, 3.2, 5, 0, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#ffd84d'; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.fill(); ctx.restore();
      }
    });
    return tips;
  }
  const EARTH_LAND = (() => { const r = mulberry32(8), a = []; for (let i = 0; i < 9; i++) a.push({ x: r(), y: r() * 0.9, w: 0.12 + r() * 0.2, h: 0.08 + r() * 0.12 }); return a; })();
  function drawEarth(cx, cy, R, t) {
    // 대기 빛
    const ag = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.16); ag.addColorStop(0, 'rgba(140,200,255,.45)'); ag.addColorStop(1, 'rgba(140,200,255,0)');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, R * 1.16, 0, TAU); ctx.fill();
    const og = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.45, R * 0.1, cx, cy, R); og.addColorStop(0, '#6cc6ff'); og.addColorStop(0.6, '#2f86d8'); og.addColorStop(1, '#1b4f9a');
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    const off = RM ? 0 : (t * 5) % (R * 2.4);
    for (let rep = -1; rep <= 1; rep++) EARTH_LAND.forEach((l, i) => {
      const lx = cx - R + ((l.x * R * 2.4 + off + rep * R * 2.4) % (R * 2.4 * 2)) - R * 0.2, ly = cy - R + l.y * R * 1.7 + R * 0.1;
      const lg = ctx.createLinearGradient(0, ly, 0, ly + l.h * R * 2); lg.addColorStop(0, '#74c765'); lg.addColorStop(1, '#3f9a52');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(lx, ly, l.w * R * 1.2, l.h * R * 1.1, 0.3 * (i % 3 - 1), 0, TAU); ctx.fill();
    });
    const sh = ctx.createRadialGradient(cx - R * 0.5, cy - R * 0.5, R * 0.2, cx + R * 0.2, cy + R * 0.3, R * 1.3); sh.addColorStop(0, 'rgba(255,255,255,.22)'); sh.addColorStop(1, 'rgba(10,30,80,.45)');
    ctx.fillStyle = sh; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
  }
  function drawTreePanel(T, t, dt) {
    const PL = S.plan, tall = LAY.kind === 'tall';
    ctx.save();
    softShadow(() => { ctx.fillStyle = '#fff'; rr(T.x, T.y, T.w, T.h, 16); ctx.fill(); }, 12, 3);
    ctx.save(); rr(T.x, T.y, T.w, T.h, 16); ctx.clip();
    const sg = ctx.createLinearGradient(0, T.y, 0, T.y + T.h); sg.addColorStop(0, '#cfeeff'); sg.addColorStop(0.65, '#eaf7ff'); sg.addColorStop(1, '#fdf6e3');
    ctx.fillStyle = sg; ctx.fillRect(T.x, T.y, T.w, T.h);
    add(() => halo(T.x + T.w * 0.78, T.y + 50, 90, '#fff2b8', 0.55));
    // 구름
    [[0.18, 0.12, 1], [0.62, 0.2, 0.8]].forEach((c, i) => { const x = T.x + ((c[0] * T.w + (RM ? 0 : t * 4 * (i + 1))) % (T.w + 100)) - 40, y = T.y + c[1] * T.h; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x, y, 12 * c[2], 0, TAU); ctx.arc(x + 14 * c[2], y - 5 * c[2], 15 * c[2], 0, TAU); ctx.arc(x + 30 * c[2], y, 11 * c[2], 0, TAU); ctx.fill(); });
    const R = tall ? 124 : 168, ecx = T.x + T.w / 2, ecy = T.y + T.h + (tall ? 14 : 6) + R * 0.0 - (tall ? 0 : 0) + (tall ? 0 : 20) - (tall ? 0 : 0);
    const cy = T.y + T.h + R * 0.42;
    drawEarth(ecx, cy, R, t);
    const trunk = tall ? 62 : 86, baseY = cy - R + 8;
    const doneK = PL.done ? clamp((nowS() - PL.doneT) / 1.2, 0, 1) : 0;
    contactShadow(ecx, baseY + 4, 34, 6, 0.3);
    drawTree(ecx, baseY, trunk, PL.g, t, PL.done, doneK);
    // 나비 2마리: 8자 궤적
    if (PL.done && doneK > 0.2) for (let b = 0; b < 2; b++) {
      const w = t * (0.9 + b * 0.15) + b * 2.4, den = 1 + Math.pow(Math.cos(w), 2), bx = ecx + (tall ? 70 : 92) * Math.sin(w) / den * (b ? -1 : 1), by = baseY - trunk * 1.6 + (tall ? 36 : 52) * Math.sin(w) * Math.cos(w) / den;
      const fl = RM ? 0.6 : Math.abs(Math.sin(t * 14 + b)) ;
      ctx.save(); ctx.translate(bx, by); ctx.globalAlpha = clamp((doneK - 0.2) * 3, 0, 1);
      ctx.fillStyle = b ? '#ffb347' : '#9b8cff'; [[-1, 1], [1, 1]].forEach(([sx]) => { ctx.save(); ctx.scale(sx * (0.35 + 0.65 * fl), 1); ctx.beginPath(); ctx.ellipse(6, -3, 7, 5, -0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(5, 4, 5, 3.4, 0.4, 0, TAU); ctx.fill(); ctx.restore(); });
      ctx.fillStyle = '#3a2f2a'; rr(-1.2, -5, 2.4, 11, 1.2); ctx.fill(); ctx.restore();
    }
    ctx.restore();
    // 배너
    if (PL.done) {
      const k = clamp((nowS() - PL.doneT - 0.2) / 0.5, 0, 1);
      if (k > 0) { ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - EASE.outCubic(k)) * -14); pill(T.x + T.w / 2, T.y + 26, '🌱 작은 실천이 모이면 지속가능한 미래!', { bg: '#1b2333', size: tall ? 13 : 13.5, h: 32, shadow: true }); ctx.restore(); }
    } else txt('🌍 실천할수록 나무가 자라요', T.x + T.w / 2, T.y + 22, f(13.5, 800), '#3a6b4e');
    if (isNew('tree')) newRing(T.x - 2, T.y - 2, T.w + 4, T.h + 4);
    ctx.restore();
  }

  /* ---- 계획표 종이 ---- */
  function paintPlanCard(c, x, y, w, h, shadow) {
    ctx.fillStyle = '#fff'; rr(x, y, w, h, 12); ctx.fill();
    if (shadow) return;
    const placed = !!c.placed, row = PLAN_ROWS[c.row];
    ctx.fillStyle = placed ? '#14a058' : '#94a3b8'; rr(x, y, 7, h, 3.5); ctx.fill();
    if (placed) {
      txt(row.icon, x + 28, y + h / 2, f(20, 400), COL.ink);
      drawLines(c.t, x + 46 + (w - 46 - 34) / 2, y + h / 2 + 1, w - 46 - 34, h < 56 ? 14 : 15, COL.ink, { weight: 800, align: 'center', lh: 18 });
      D.check(x + w - 20, y + h / 2, 10, 1);
    } else {
      const tw = w - 24; let fs = 13.5, wl = wrapLines(c.t, tw, f(fs, 800));
      if (wl.lines.length > 3) { fs = 12.5; wl = wrapLines(c.t, tw, f(fs, 800)); }
      drawLines(c.t, x + 6 + (w - 6) / 2, y + h / 2 + 1, tw - 6, fs, COL.ink, { weight: 800, align: 'center', lh: fs + 3 });
    }
    if (S.plan && S.plan.sel === c.id) { ctx.strokeStyle = COL.good; ctx.lineWidth = 3; rr(x, y, w, h, 12); ctx.stroke(); }
  }
  function drawPlanSheet(t) {
    const PL = S.plan, L = planLayout(), sh = L.sheet, tall = LAY.kind === 'tall';
    ctx.save();
    softShadow(() => { ctx.fillStyle = '#fff8e4'; rr(sh.x, sh.y, sh.w, sh.h, 16); ctx.fill(); }, 14, 4, 'rgba(90,60,10,.25)');
    ctx.save(); rr(sh.x, sh.y, sh.w, sh.h, 16); ctx.clip();
    ctx.strokeStyle = 'rgba(180,150,90,.14)'; ctx.lineWidth = 1; for (let y = sh.y + 26; y < sh.y + sh.h; y += 22) { ctx.beginPath(); ctx.moveTo(sh.x, y); ctx.lineTo(sh.x + sh.w, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(226,70,75,.18)'; ctx.fillRect(sh.x + 8, sh.y, 2, sh.h);
    ctx.restore();
    // 테이프
    ctx.save(); ctx.fillStyle = 'rgba(255,214,102,.8)'; ctx.translate(sh.x + 40, sh.y + 2); ctx.rotate(-0.25); ctx.fillRect(-26, -7, 52, 15); ctx.restore();
    ctx.save(); ctx.fillStyle = 'rgba(255,214,102,.8)'; ctx.translate(sh.x + sh.w - 40, sh.y + 2); ctx.rotate(0.25); ctx.fillRect(-26, -7, 52, 15); ctx.restore();
    txt('📝 나의 일주일 실천 계획', sh.x + sh.w / 2, L.head.y, fj(tall ? 20 : 25), COL.ink);
    pill(sh.x + sh.w / 2 - (tall ? 118 : 138), L.head.y + (tall ? 22 : 28), '언제', { bg: '#3867f4', size: 12.5, h: 22, pad: 9 });
    pill(sh.x + sh.w / 2 - (tall ? 62 : 72), L.head.y + (tall ? 22 : 28), '무엇을', { bg: '#14a058', size: 12.5, h: 22, pad: 9 });
    pill(sh.x + sh.w / 2 - (tall ? 4 : 2), L.head.y + (tall ? 22 : 28), '얼마나', { bg: '#e0661f', size: 12.5, h: 22, pad: 9 });
    txt('정해 볼까요?', sh.x + sh.w / 2 + (tall ? 70 : 80), L.head.y + (tall ? 22 : 28), f(13, 800), COL.muted);
    // 세 칸
    for (let ri = 0; ri < 3; ri++) {
      const R = L.row(ri), row = PLAN_ROWS[ri], filled = PL.slots[ri] != null, cur = PL.cur === ri;
      pill(R.label.x, R.label.y, row.icon + ' ' + row.name, { bg: row.col, size: 13, h: 22, align: 'left', pad: 9 });
      // 칸
      const S0 = R.slot;
      if (!filled) {
        ctx.fillStyle = cur ? 'rgba(20,160,88,.07)' : 'rgba(255,255,255,.55)'; rr(S0.x, S0.y, S0.w, S0.h, 12); ctx.fill();
        ctx.strokeStyle = cur ? COL.good : 'rgba(100,116,139,.45)'; ctx.lineWidth = cur ? 2.6 : 1.8; ctx.setLineDash([7, 5]); rr(S0.x, S0.y, S0.w, S0.h, 12); ctx.stroke(); ctx.setLineDash([]);
        if (cur) { breathe(S0.x, S0.y, S0.w, S0.h, 12, COL.good); if (PL.deck.hoverT === 'slot') { ctx.fillStyle = 'rgba(20,160,88,.12)'; rr(S0.x, S0.y, S0.w, S0.h, 12); ctx.fill(); } }
        txt(cur ? '👇 구체적인 행동 카드를 여기에 놓아요' : '앞 칸을 먼저 채워요', S0.x + S0.w / 2, S0.y + S0.h / 2 + 1, f(tall ? 12.5 : 14, 800), cur ? '#0b7a41' : '#94a3b8');
      }
      // 횟수 칩
      txt('얼마나?', R.ask.x, R.ask.y, f(tall ? 12 : 13, 800), '#c2410c', 'left');
      R.chips.forEach((ch, k) => {
        const sel = PL.freq[ri] === k, can = filled, hot = S.hoverSpot === 'fq' + ri + k;
        ctx.save(); if (sel) { ctx.translate(ch.x + ch.w / 2, ch.y + ch.h / 2); ctx.scale(1.05, 1.05); ctx.translate(-ch.x - ch.w / 2, -ch.y - ch.h / 2); }
        ctx.globalAlpha = can ? 1 : 0.45;
        softShadow(() => { ctx.fillStyle = sel ? '#14a058' : '#fff'; rr(ch.x, ch.y, ch.w, ch.h, ch.h / 2); ctx.fill(); }, sel ? 8 : 4, 2);
        ctx.strokeStyle = sel ? '#0b7a41' : hot && can ? '#14a058' : '#cfd8e6'; ctx.lineWidth = 2; rr(ch.x, ch.y, ch.w, ch.h, ch.h / 2); ctx.stroke();
        txt((sel ? '✔ ' : '') + FREQS[k].t, ch.x + ch.w / 2, ch.y + ch.h / 2 + 1, f(tall ? 12 : 13.5, 800), sel ? '#fff' : COL.ink);
        ctx.restore();
        if (can && !sel && PL.freq[ri] == null && !RM) { ctx.save(); ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 4 + k); ctx.strokeStyle = COL.good; ctx.lineWidth = 2; rr(ch.x - 2, ch.y - 2, ch.w + 4, ch.h + 4, ch.h / 2 + 2); ctx.stroke(); ctx.restore(); }
      });
    }
    // 후보 카드 보관함
    if (PL.cur < 3) {
      const Tr = L.tray; ctx.fillStyle = 'rgba(100,116,139,.09)'; rr(Tr.x, Tr.y, Tr.w, Tr.h, 14); ctx.fill();
      txt('🗂️ ' + PLAN_ROWS[PL.cur].icon + ' ' + PLAN_ROWS[PL.cur].name + ' 후보 카드 3장 · 하나를 골라 끌어 놓아요', Tr.x + 12, Tr.y + 12, f(12, 800), '#64748b', 'left');
    } else {
      const Tr = L.tray, k = clamp((nowS() - PL.doneT + 0.3) / 0.6, 0, 1) * (PL.done ? 1 : 0.0);
      void k;
      txt(PL.done ? '✨ 계획표 완성! 일주일 동안 실천하고 기록해 보세요' : '이제 얼마나 자주 할지 골라요', Tr.x + Tr.w / 2, Tr.y + Tr.h / 2, f(tall ? 13 : 15, 800), PL.done ? '#0b7a41' : COL.muted);
    }
    PL.deck.draw((c, x, y, w, h, shadowPass) => paintPlanCard(c, x, y, w, h, shadowPass));
    if (isNew('plan')) newRing(sh.x - 2, sh.y - 2, sh.w + 4, sh.h + 4);
    ctx.restore();
  }
  function drawPlanScene(a, t, dt) {
    if (a < 0.01 || !S.plan) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 24);
    const L = planLayout();
    drawTreePanel(L.tree, t, dt);
    drawPlanSheet(t);
    ctx.restore();
  }
  function planDown(p) {
    const PL = S.plan; if (!PL || PAN.plan.a < 0.6) return false;
    const L = planLayout();
    // 횟수 칩
    for (let ri = 0; ri < 3; ri++) { const R = L.row(ri); for (let k = 0; k < 3; k++) if (inR(p, R.chips[k], 4)) { planFreq(ri, k); return false; } }
    // 탭 → 탭
    if (PL.sel && PL.cur < 3 && inR(p, L.row(PL.cur).slot, 10)) { const c = PL.deck.cards.find((x) => x.id === PL.sel); PL.sel = null; if (c && !c.placed) PL.deck.resolve(c, planTry(c, { x: p.x, y: p.y })); return false; }
    return PL.deck.down(p);
  }
  /* 계획표 저장: 일주일 기록표를 그림 파일로 */
  function savePlanPng() {
    const PL = S.plan; if (!PL || !PL.done) return;
    const cv = document.createElement('canvas'); cv.width = 900; cv.height = 640;
    const g = cv.getContext('2d'), sc = ctx, sd = D, sk = LAY, sv = view;
    ctx = g; D = SciSim.draw(g); LAY = { kind: 'wide', W: 900, H: 640 };
    try {
      ctx.fillStyle = '#fff8e4'; ctx.fillRect(0, 0, 900, 640);
      ctx.strokeStyle = 'rgba(180,150,90,.16)'; ctx.lineWidth = 1; for (let y = 24; y < 640; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(900, y); ctx.stroke(); }
      ctx.fillStyle = '#14a058'; ctx.fillRect(0, 0, 900, 78);
      txt('🌱 나의 일주일 실천 계획', 36, 40, fj(34), '#fff', 'left');
      const d = new Date(); txt('이름 : ____________   ' + d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일부터', 36, 108, f(18, 800), COL.ink, 'left');
      const days = ['월', '화', '수', '목', '금', '토', '일'];
      PLAN_ROWS.forEach((row, ri) => {
        const y = 140 + ri * 150, cd = row.cards.find((x) => x.id === PL.slots[ri]);
        ctx.fillStyle = '#fff'; rr(28, y, 844, 134, 16); ctx.fill(); ctx.strokeStyle = row.col; ctx.lineWidth = 3; rr(28, y, 844, 134, 16); ctx.stroke();
        pill(44, y + 24, row.icon + ' ' + row.name, { bg: row.col, size: 16, h: 28, align: 'left', pad: 12 });
        txt(cd ? cd.t : '', 214, y + 24, f(22, 800), COL.ink, 'left');
        const fq = FREQS[PL.freq[ri]];
        pill(836, y + 24, '얼마나: ' + (fq ? fq.t : ''), { bg: '#fff0e6', color: '#c2410c', size: 16, h: 28, align: 'right', border: '#f5c98a' });
        txt('실천했으면 ✔ 표시를 해요', 44, y + 58, f(14, 700), COL.muted, 'left');
        days.forEach((dn, k) => { const bx = 44 + k * 118; txt(dn, bx + 40, y + 82, f(15, 800), COL.ink); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; rr(bx + 14, y + 92, 52, 32, 8); ctx.stroke(); });
      });
      txt('줄이기 → 다시 쓰기 → 재활용하기 · 작은 실천이 모이면 지속가능한 미래!', 450, 612, f(17, 800), '#0b7a41');
    } finally { ctx = sc; D = sd; LAY = sk; void sv; }
    cv.toBlob((b) => {
      if (!b) return;
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = '나의-실천-계획.png'; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    }, 'image/png');
    toast('📥 계획표 그림 파일을 저장했어요');
  }

  /* =========================================================
     DOM: 조작 카드 · 장면 이름 · 장면 설정 도우미
     ========================================================= */
  const E = {
    yrRow: $('#yrRow'), yrNext: $('#yrNext'), yrReset: $('#yrReset'), runRow: $('#runRow'), runBtn: $('#runBtn'), clearBtn: $('#clearBtn'),
    wxRow: $('#wxRow'), wxBtn: $('#wxBtn'), saveRow: $('#saveRow'), saveBtn: $('#saveBtn'), note: $('#ctrlNote'), card: $('#ctrlCard'), title: $('#ctrlTitle'), seg: $('#viewSeg'), label: $('#sceneLabel'),
  };
  const setNow = (obj, props) => { SciSim.tween(obj, props, { duration: 0.0001 }); Object.assign(obj, props); };
  function setBuild(o, instant) {
    for (let i = 0; i < 6; i++) { const on = i < (o.solar || 0); S.build.solar[i] = on; setNow(S.sa[i], { dy: on ? 0 : -60, al: on ? 1 : 0 }); }
    S.build.wind = !!o.wind; setNow(S.ta, { rise: o.wind ? 1 : 0, blade: o.wind ? 1 : 0 });
    S.build.ess = !!o.ess; setNow(S.ea, { y: 0, a: o.ess ? 1 : 0 });
    PREVIEW.key = '';
    void instant;
  }
  function setCards(o) {
    ['plug', 'ac', 'sub', 'eff'].forEach((k) => { S.cards[k] = !!(o && o[k]); setNow(S.sw, { [k]: S.cards[k] ? 1 : 0 }); });
    setNow(S.schoolA, { dy: S.cards.sub ? 0 : -40, al: S.cards.sub ? 1 : 0 });
    PREVIEW.key = '';
  }
  function resetRuns() { S.run = null; S.lastRun = null; S.runs = []; S.gr = null; S.chipT = -99; S.runAfterInstall = false; S.barTarget = [-1, -1, -1]; S.dots.length = 0; }
  function resetYear() {
    S.year = 2025; S.tappedEmpty = false; S.tapped = {};
    setNow(S, { yr: 2025 });
    S.bags.length = 0; for (let i = 0; i < bagsFor(2025); i++) S.bags.push({ born: -99 });
    S.tankFlash = { oil: 0, gas: 0, coal: 0 }; S.tankLevel = { oil: 1, gas: 1, coal: 1 };
    FX.bubbles = [];
  }
  const tag = (b) => (b ? '✔' : '—');
  const mark = (b) => (b ? '✅' : '⬜');
  const kwh = (x) => x.toFixed(1);
  function msgTop(text, kind) { bubble(PAN.vil.x + PAN.vil.w / 2, PAN.vil.y + 70, text, { kind: kind || 'bad', tag: 'lock', dur: 2.2 }); }

  const VIEW_LABEL = {
    meters: '🌏 우리 마을의 미래 <small>· 지금처럼 쓴다면</small>',
    power: '🏘️ 우리 마을 <small>· 하루 전기 실험</small>',
    cards: '🏘️ 우리 마을 <small>· 실천 카드 비교 실험</small>',
    plan: '📝 나의 실천 계획 <small>· 일주일 계획표</small>',
    sort: '📦 실천 방안 나누기 <small>· 개인 차원과 사회 차원</small>',
  };
  function syncDom() {
    if (!LAY) return;
    const free = freeMode(), v = S.view, running = !!S.run;
    const yrOn = v === 'meters' && has('years') && !S.sortOn;
    const runOn = (v === 'power' || v === 'cards') && has('power') && !S.sortOn;
    const wxOn = runOn && free;
    const saveOn = v === 'plan' && has('plan') && !!(S.plan && S.plan.done);
    E.yrRow.hidden = !yrOn; E.runRow.hidden = !runOn; E.wxRow.hidden = !wxOn; E.saveRow.hidden = !saveOn;
    E.card.hidden = !(yrOn || runOn || saveOn);
    E.yrNext.disabled = S.year >= 2075;
    E.yrNext.textContent = S.year >= 2075 ? '⏩ 2075년이에요' : '⏩ 10년 뒤로';
    E.runBtn.disabled = running;
    E.runBtn.textContent = running ? '⏳ 하루 도는 중…' : (S.weather === 'cloudy' ? '▶ 흐린 날 하루 돌려 보기' : '▶ 하루 돌려 보기');
    E.clearBtn.textContent = v === 'cards' ? '↺ 카드 모두 끄기' : '↺ 처음 상태';
    E.clearBtn.disabled = running;
    E.wxBtn.textContent = S.weather === 'cloudy' ? '☁️ 흐린 날 · 눌러서 맑게' : '☀️ 맑은 날 · 눌러서 흐리게';
    E.wxBtn.disabled = running;
    E.title.textContent = yrOn ? '⏩ 시간을 앞으로 보내 봐요' : runOn ? '🔬 하루 전기 실험' : saveOn ? '📝 계획표 완성!' : '';
    let note = '';
    if (yrOn) note = S.year >= 2075 ? '바닥난 탱크를 눌러 확인해 봐요' : '지금 ' + S.year + '년 · 버튼을 누를 때마다 10년이 지나요';
    else if (runOn) note = running ? '태양이 뜨고 지는 하루가 지나가고 있어요' : v === 'cards' ? '카드를 켜고 꺼 보며 하루를 돌려 비교해요' : (has('build') && !(level() >= 2 && !free)) ? '지붕·언덕·창고 부지를 눌러 설치해요 (다시 누르면 철거)' : '설치한 기술로 하루를 돌려 볼 수 있어요';
    else if (saveOn) note = '그림 파일로 저장해 일주일 동안 실천하고 기록해 보세요';
    E.note.textContent = note; E.note.hidden = !note;
    const lab = S.sortOn ? VIEW_LABEL.sort : VIEW_LABEL[v === 'power' && has('actions') && freeMode() ? 'cards' : v];
    if (E.label.innerHTML !== lab) E.label.innerHTML = lab;
    E.seg.hidden = !free;
    E.seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.view === (v === 'cards' ? 'power' : v)));
  }
  E.yrNext.addEventListener('click', () => yearStep());
  E.yrReset.addEventListener('click', () => yearReset());
  E.runBtn.addEventListener('click', () => { if (startRun()) { /* 하루 시작 */ } });
  E.clearBtn.addEventListener('click', () => {
    if (S.run) return;
    Sound.click();
    if (S.view === 'cards') { setCards({}); configChanged(); } else { setBuild({ solar: 0 }); setCards({}); S.weather = 'clear'; resetRuns(); configChanged(); }
  });
  E.wxBtn.addEventListener('click', () => setWeather(S.weather === 'cloudy' ? 'clear' : 'cloudy'));
  E.saveBtn.addEventListener('click', () => { Sound.click(); savePlanPng(); });
  E.seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); setSort(false);
    const v = b.dataset.view;
    if (v === 'power') goView('cards'); else goView(v);
    if (v === 'plan') ensurePlan();
  }));

  /* =========================================================
     입력
     ========================================================= */
  function grabbableAt(p) {
    if (S.sortOn) return !!(S.sortS && S.sortS.deck.hit(p));
    if (S.view === 'plan') return !!(S.plan && S.plan.deck.hit(p));
    return false;
  }
  const activeDeck = () => (S.sortOn ? S.sortS && S.sortS.deck : S.view === 'plan' ? S.plan && S.plan.deck : null);
  const handlers = {
    down(p) {
      if (S.sortOn) return sortDown(p);
      if (S.view === 'plan') return planDown(p);
      const tk = tankAt(p);
      if (tk) { tapTank(tk); return false; }
      if ((S.view === 'power' || S.view === 'cards') && kwhHit(p)) { bubble(p.x, p.y - 8, 'kWh는 전기 요금 고지서에 나오는 단위예요.\n자세한 뜻은 2학년에서 배워요.', { kind: 'info', tag: 'kwh', dur: 3.2, maxW: 250 }); Sound.click(); return false; }
      const sw = swAt(p);
      if (sw) { setCard(sw, !S.cards[sw]); return false; }
      if ((S.view === 'power' || S.view === 'cards') && has('build')) {
        const h = villageHit(p);
        if (h) {
          if (level() >= 2 && !freeMode()) { bubble(p.x, p.y - 10, '기술은 2단계에서 모두 설치했어요. 이번에는 아래 카드로 실험해요', { kind: 'info', tag: 'lock', dur: 2.6, maxW: 240 }); Sound.click(); return false; }
          toggleBuild(h.kind, h.i); return false;
        }
      }
      return false;
    },
    move(p) { const d = activeDeck(); if (d) d.move(p); },
    up(p) { const d = activeDeck(); if (d) d.up(p); },
    hover(p) {
      S.hoverSpot = null;
      const d = activeDeck();
      if (d) {
        if (d.hit(p)) return 'grab';
        if (S.view === 'plan' && S.plan) { const L = planLayout(); for (let ri = 0; ri < 3; ri++) for (let k = 0; k < 3; k++) if (inR(p, L.row(ri).chips[k], 4)) { S.hoverSpot = 'fq' + ri + k; return 'pointer'; } }
        return null;
      }
      const tk = tankAt(p); if (tk) { S.hoverSpot = 'tank' + tk.id; return 'pointer'; }
      if ((S.view === 'power' || S.view === 'cards') && kwhHit(p)) { S.hoverSpot = 'kwh'; return 'pointer'; }
      const sw = swAt(p); if (sw) { S.hoverSpot = 'sw' + sw; return 'pointer'; }
      if ((S.view === 'power' || S.view === 'cards') && has('build') && !S.run && !(level() >= 2 && !freeMode())) { const h = villageHit(p); if (h) { S.hoverSpot = h.kind === 'solar' ? 'roof' + h.i : h.kind; return 'pointer'; } }
      return null;
    },
  };
  function relayout() {
    goView(S.view, true);
    PAN.sort.a = S.sortOn ? 1 : 0;
    relayoutSort(); relayoutPlan();
    syncDom();
  }

  /* =========================================================
     미션 (4 STEP · 11개)
     ========================================================= */
  const M1_1 = {
    title: '50년 뒤의 우리 마을',
    goal: '⏩ <b>10년 뒤로</b>를 눌러 2075년까지 가 보세요. 그다음 계기판에서 <b>바닥난 연료</b> 탱크를 눌러 확인하세요.',
    hint: '석유와 천연가스 탱크를 지켜보세요.',
    setup() { setSort(false); goView('meters'); resetYear(); resetRuns(); },
    check: () => S.year === 2075 && S.tappedEmpty,
    hold: 0,
    status: () => '지금 연도 <b>' + S.year + '</b> · 바닥난 연료 확인 <b>' + tag(S.tappedEmpty) + '</b>',
    explain: '석유·천연가스·석탄 같은 화석 연료는 양이 정해진 <b>유한한 자원</b>이에요. 지금처럼 쓰면 확인된 매장량으로 석유와 천연가스는 약 50년, 석탄은 약 130년을 쓸 수 있다고 해요(새로운 발견이나 사용량에 따라 달라져요). 또 화석 연료를 태우면 이산화 탄소가 나와 대기 중 농도가 계속 높아져요.',
  };
  const M1_2 = {
    type: 'quiz', title: '무엇이 문제일까?',
    setup() { setSort(false); goView('meters'); },
    goal: '지금처럼 화석 연료를 계속 쓸 때의 문제로 옳은 것은?',
    choices: ['화석 연료는 땅속에서 금방 다시 만들어지므로 걱정할 필요가 없다', '이산화 탄소가 늘어나도 기후와는 관계가 없다', '화석 연료는 언젠가 바닥나고, 태울 때 나오는 이산화 탄소가 늘어 기후변화가 심해진다', '다 쓴 화석 연료도 재활용하면 무한히 쓸 수 있다'],
    answer: 2,
    feedback: ['화석 연료는 수백만 년 이상에 걸쳐 만들어져 사람이 쓰는 속도를 따라갈 수 없어요.', '이산화 탄소가 늘면 기후변화가 심해져요. 자세한 원리는 3학년에서 배워요.', '', '태워서 쓴 화석 연료는 다시 쓸 수 없어요. 재활용이 자원을 무한하게 만들지는 않아요.'],
    explain: '에너지 자원의 고갈과 기후변화는 지금 세대뿐 아니라 <b>미래 세대</b>의 삶도 위협하는 문제예요.',
  };
  const M1_3 = {
    type: 'quiz', title: '지속가능한 발전이란?',
    setup() { setSort(false); goView('meters'); },
    goal: '‘지속가능한 발전’의 뜻으로 가장 알맞은 것은?',
    choices: ['지금 세대가 원하는 만큼 자원을 마음껏 개발하는 것', '미래 세대가 필요한 것을 얻을 수 있는 능력을 해치지 않으면서 지금 세대의 필요를 채우는 발전', '환경을 지키기 위해 모든 개발을 멈추는 것', '경제만 계속 성장하면 되는 발전'],
    answer: 1,
    feedback: ['그러면 미래 세대가 쓸 자원이 남지 않아요.', '', '개발을 멈추면 지금 세대의 필요를 채울 수 없어요. 균형이 중요해요.', '경제뿐 아니라 환경과 사회도 함께 생각해야 해요.'],
    explain: '<b>지속가능한 발전</b>은 환경·경제·사회의 균형을 이루며 지금 세대와 미래 세대가 함께 잘 살 수 있게 하는 발전이에요(1987년 국제 연합 보고서). 2015년 국제 연합은 17개의 지속가능발전목표(SDGs)를 정했어요.',
  };
  const coalNow = () => (S.gr ? S.gr.rec.coal : preview().total.coal);
  const M2_1 = {
    title: '지붕에 태양광 설치하기',
    goal: '집 지붕을 눌러 태양광 발전기를 <b>6곳 모두</b> 설치하고, ▶ <b>하루 돌려 보기</b>로 하루 동안의 전기를 관찰하세요.',
    hint: '그래프에서 노란색(태양광)이 0이 되는 시간을 찾아보세요.',
    setup() { setSort(false); goView('power'); setBuild({ solar: 0 }); setCards({}); S.weather = 'clear'; resetRuns(); configChanged(); },
    check: () => S.build.solar.every(Boolean) && S.runAfterInstall,
    hold: 0,
    status: () => '태양광 <b>' + S.build.solar.filter(Boolean).length + '/6</b> · 하루 관찰 <b>' + tag(S.runAfterInstall) + '</b> · 석탄 발전 <b>' + kwh(coalNow()) + ' kWh</b>' + (S.gr ? '' : ' (예상)'),
    explain: '맑은 날 태양광 6곳은 하루 약 89 kWh를 만들어 마을이 쓰는 약 59 kWh보다 많아요. 하지만 해가 지면 발전량이 0이 되어 밤에는 여전히 석탄 발전(약 35 kWh)이 필요해요. 재생 에너지는 날씨와 시간에 따라 발전량이 달라져요.',
  };
  const M2_2 = {
    title: '석탄 발전소 쉬게 하기',
    goal: '낮에 남는 전기를 저장했다가 밤에 쓸 수 있도록 🔋 <b>에너지 저장 장치</b>를 설치하고, 하루 동안 석탄 발전을 <b>0</b>으로 만들어 보세요.',
    hint: '창고 부지를 눌러 저장 장치를 설치해요. 언덕에 풍력 발전기를 더해도 좋아요.',
    setup() { setSort(false); goView('power'); setBuild({ solar: 6, wind: S.build.wind, ess: false }); setCards({}); S.weather = 'clear'; S.lastRun = null; S.gr = null; S.runs = []; S.runAfterInstall = false; configChanged(); },
    check: () => !!(S.lastRun && S.lastRun.cfg.ess && S.lastRun.coal <= 0.05),
    hold: 0,
    status: () => '저장 장치 <b>' + tag(S.build.ess) + '</b> · 석탄 발전 <b>' + kwh(coalNow()) + ' kWh</b>' + (S.gr ? '' : ' (예상)'),
    explain: '에너지 저장 장치는 낮에 남은 태양광 전기를 모아 두었다가 밤에 내보내요. 이처럼 재생 에너지와 저장 기술 같은 <b>과학기술</b>은 화석 연료를 덜 쓰게 해 지속가능한 삶에 중요한 역할을 해요.',
  };
  const M2_3 = {
    type: 'quiz', title: '흐린 날이 이어진다면?',
    setup() { setSort(false); goView('power'); },
    goal: '장마철처럼 흐린 날이 이어지면 태양광 발전량이 맑은 날의 1/4 정도로 줄어요. 가장 알맞은 생각은?',
    choices: ['태양광을 설치했으니 이제 전기를 마음껏 써도 된다', '과학기술은 중요하지만 한계도 있으므로, 에너지를 아끼는 실천과 사회 제도가 함께 필요하다', '흐린 날이 있으니 재생 에너지는 쓸모가 없다', '석탄 발전을 다시 마음껏 늘리면 된다'],
    answer: 1,
    feedback: ['과학기술이 모든 문제를 해결해 주지는 않아요. 흐린 날에는 전기가 부족해져요.', '', '맑은 날에는 석탄 발전을 0으로 만들었어요. 한계가 있다고 쓸모없는 것은 아니에요.', '그러면 다시 화석 연료 고갈과 기후변화 문제가 커져요.'],
    explain: '과학기술은 지속가능한 삶에 꼭 필요하지만 <b>모든 문제를 해결할 수는 없어요</b>. 다음 단계에서 개인과 사회가 함께할 수 있는 일을 찾아봐요.',
  };
  const M3_1 = {
    title: '실천 방안 나누기',
    goal: '실천 카드 8장을 👤 <b>개인 차원</b>과 🏛️ <b>사회 차원</b> 상자로 나누어 끌어 놓으세요.',
    hint: '내가 생활 속에서 바로 할 수 있는 일은 개인, 법·제도·시설·국제 협력은 사회예요.',
    setup() { goView('power'); resetSort(); setSort(true); },
    check: () => sortCount() === 8,
    hold: 0,
    status: () => '나눈 카드 <b>' + sortCount() + '/8</b>',
    explain: '<b>개인 차원</b>은 내가 생활 속에서 바로 할 수 있는 실천이고, <b>사회 차원</b>은 법·제도·시설·국제 협력처럼 사회가 함께 하는 활동이에요.',
  };
  const m2Stat = () => {
    const r = S.runs.filter((x) => x.cloudy);
    const iOnly = r.filter((x) => x.indiv >= 1 && x.social === 0), sOnly = r.filter((x) => x.social >= 1 && x.indiv === 0), goal = r.filter((x) => x.coal <= 1.0);
    return { iOnly, sOnly, goal, iMin: iOnly.length ? Math.min(...iOnly.map((x) => x.coal)) : null, sMin: sOnly.length ? Math.min(...sOnly.map((x) => x.coal)) : null };
  };
  const M3_2 = {
    title: '흐린 날 도전: 무엇이 필요할까?',
    goal: '흐린 날, ① <b>개인 카드만</b> 켜고 한 번, ② <b>사회 카드만</b> 켜고 한 번 하루를 돌려 비교한 뒤, ③ 석탄 발전을 <b>1 kWh 이하</b>로 줄여 보세요.',
    hint: '개인 카드만, 사회 카드만으로는 부족했나요? 두 종류를 함께 켜 보세요.',
    setup() { setSort(false); setBuild({ solar: 6, wind: true, ess: true }); setCards({}); S.weather = 'cloudy'; resetRuns(); goView('cards'); configChanged(); },
    check: () => { const s = m2Stat(); return s.iOnly.length > 0 && s.sOnly.length > 0 && s.goal.length > 0; },
    hold: 0,
    status: () => { const s = m2Stat(); return '개인만 <b>' + tag(s.iOnly.length > 0) + '</b>' + (s.iMin != null ? '(' + kwh(s.iMin) + ' kWh)' : '') + ' · 사회만 <b>' + tag(s.sOnly.length > 0) + '</b>' + (s.sMin != null ? '(' + kwh(s.sMin) + ' kWh)' : '') + ' · 석탄 1 kWh 이하 <b>' + tag(s.goal.length > 0) + '</b>'; },
    explain: '흐린 날에는 개인의 실천만으로도, 사회의 제도만으로도 석탄 발전을 없앨 수 없었어요. <b>과학기술 + 개인의 실천 + 사회의 제도</b>가 함께할 때 지속가능한 마을이 될 수 있어요.',
  };
  const M3_3 = {
    type: 'quiz', title: '과학 관련 쟁점에 의견 내기',
    setup() { setSort(false); goView('power'); },
    goal: '마을 뒷산 숲을 베고 큰 태양광 발전소를 짓자는 의견이 나왔어요. 가장 과학적으로 의견을 말한 친구는?',
    choices: ['🧑 지수: 태양광은 무조건 좋은 거니까 빨리 지어야 해요.', '👦 도윤: 그냥 보기 싫어서 반대예요.', '🧒 서준: 재생 에너지는 쓸모없으니 석탄 발전을 늘려요.', '👧 하린: 숲은 이산화 탄소를 흡수하고 산사태를 막아 줘요. 숲을 베는 대신 건물 지붕이나 주차장에 태양광을 설치하자고 제안해요.'],
    answer: 3,
    feedback: ['좋은 점만 보고 숲이 사라지는 문제는 따지지 않았어요. 근거가 부족해요.', '느낌만으로는 다른 사람을 설득하기 어려워요. 과학적 근거가 필요해요.', '2단계에서 재생 에너지와 저장 장치로 석탄 발전을 0으로 만들었어요. 사실과 다른 주장이에요.', ''],
    explain: '과학 관련 쟁점에 의견을 낼 때는 <b>과학적 근거</b>를 들고, 좋은 점과 문제점을 함께 따져 <b>대안</b>을 제시해요.',
  };
  const M4_1 = {
    title: '일주일 실천 계획 세우기',
    goal: '⚡ 에너지 · ♻️ 자원 · 🚌 이동·먹거리 칸에 <b>구체적인 행동</b> 카드를 하나씩 끌어 놓고, 얼마나 자주 할지 횟수를 정하세요.',
    hint: '‘언제, 무엇을’이 분명한 카드를 골라요.',
    setup() { setSort(false); goView('plan'); resetPlan(); },
    check: () => planFilled() === 3 && planFreqs() === 3,
    hold: 0,
    status: () => '채운 칸 <b>' + planFilled() + '/3</b> · 횟수 <b>' + planFreqs() + '/3</b>',
    explain: '‘언제, 무엇을, 얼마나’ 할지 정한 구체적인 계획은 실천하기 쉽고, 잘 지켰는지 스스로 확인할 수 있어요. 계획표를 저장해 일주일 동안 실천하고 기록해 보세요.',
  };
  const M4_2 = {
    type: 'quiz', title: '재활용하면 괜찮을까?',
    setup() { setSort(false); goView('plan'); ensurePlan(); },
    goal: '‘분리배출을 잘하면 자원을 계속 다시 쓸 수 있으니, 물건을 마음껏 사고 버려도 된다.’ 이 생각에 대한 설명으로 옳은 것은?',
    choices: ['옳다. 재활용하면 자원은 줄어들지 않는다', '옳지 않다. 분리배출은 아무 효과가 없으니 하지 않아도 된다', '옳다. 자원 문제는 과학자들이 모두 해결해 줄 것이다', '옳지 않다. 재활용에도 에너지가 들고 모든 것을 다시 쓸 수는 없어 자원은 유한하므로, 먼저 덜 쓰고 다시 쓰는 것이 중요하다'],
    answer: 3,
    feedback: ['재활용 과정에서도 에너지가 들고, 버려지는 부분도 있어요.', '분리배출은 자원을 아끼는 중요한 실천이에요. 다만 그것만으로는 부족해요.', '과학기술만으로 모든 문제를 해결할 수는 없어요. 개인과 사회의 실천이 함께 필요해요.', ''],
    explain: '자원은 유한해요. 재활용도 중요하지만 <b>줄이기 → 다시 쓰기 → 재활용하기</b> 순서로 실천하면 더 효과적이에요. 작은 실천이 모이면 지속가능한 사회를 만들 수 있어요! 🌱',
  };

  /* 무대·표를 먼저 준비한 뒤 게임을 시작해야 단계 소개의 setup()이 장면을 옮길 수 있다 */
  function initState() {
    resetYear(); resetRuns();
    S.bags.forEach((b) => { b.born = -99; });
    S.hoverSpot = null;
  }
  initState();
  buildStage();
  if (mq) { if (mq.addEventListener) mq.addEventListener('change', buildStage); else if (mq.addListener) mq.addListener(buildStage); }
  syncDom();
  setTimeout(() => { S.booted = true; }, 300);

  game = SciSim.game({
    simId: 'm1-sustainable-life',
    mount: '#game',
    badge: '지구 지킴이',
    homeHref: '../../index.html#g1',
    featureLabels: {
      meters: '📊 지구 계기판', years: '⏩ 10년 뒤로', build: '🏗️ 기술 설치(태양광 · 풍력 · 저장 장치)', power: '📈 하루 전력 그래프 · ▶ 하루 돌려 보기',
      actions: '👤 개인 · 🏛️ 사회 실천 카드', plan: '📝 일주일 실천 계획표', tree: '🌳 지구 나무',
    },
    onFeatures(set) { F = new Set(set); syncDom(); },
    onMissionStart() { FX.bubbles = []; },
    onComplete() { syncDom(); },
    levels: [
      {
        title: '지금처럼 계속 쓴다면?', short: '문제 인식', icon: '🌏', phase: '관찰',
        features: ['meters', 'years'],
        intro: '<p class="si-q">❓ 탐구 질문: 지금처럼 화석 연료를 태우고 자원을 쓰고 버리면, 미래 세대도 우리처럼 살 수 있을까?</p>' +
          '<p>우리 마을의 <b>지구 계기판</b>을 보며 시간을 앞으로 보내 봐요. 에너지와 자원, 환경에 어떤 일이 생기는지 <b>관찰</b>해요.</p>',
        setup() { setSort(false); goView('meters'); },
        recap: '화석 연료는 유한하고, 화석 연료 사용으로 이산화 탄소가 늘어 기후변화가 심해지므로, 미래 세대를 생각하는 지속가능한 발전이 필요해요.',
        summary: '<ul><li>화석 연료는 유한하다: 지금처럼 쓰면 석유·천연가스 약 50년, 석탄 약 130년(가채 연수)</li><li>대기 중 이산화 탄소: 산업화 이전 약 280 ppm → 오늘날 약 420 ppm</li></ul><p><b>지속가능한 발전</b>: 미래 세대의 필요를 해치지 않으면서 현재 세대의 필요를 충족하는 발전</p>',
        missions: [M1_1, M1_2, M1_3],
      },
      {
        title: '과학기술로 바꾸는 우리 마을', short: '과학기술', icon: '☀️', phase: '실험',
        features: ['build', 'power'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화석 연료가 바닥나고 기후변화가 심해지는 문제를 확인했어요.</div>' +
          '<p>과학기술은 이 문제를 어떻게 해결할 수 있을까요? 마을에 <b>재생 에너지</b>와 <b>에너지 저장 장치</b>를 설치하고, 하루 동안 전기가 어떻게 만들어지고 쓰이는지 실험해 봐요.</p>',
        setup() { setSort(false); goView('power'); setBuild({ solar: 0 }); setCards({}); S.weather = 'clear'; resetRuns(); },
        recap: '재생 에너지와 에너지 저장 장치 같은 과학기술로 화석 연료 사용을 줄일 수 있지만, 날씨에 따른 한계도 있어요.',
        summary: '<ul><li>재생 에너지(태양광·풍력 등)는 고갈되지 않고 발전할 때 이산화 탄소를 거의 내지 않지만, 날씨와 시간에 따라 발전량이 달라진다.</li><li>에너지 저장 장치는 남는 전기를 저장했다가 필요할 때 쓰게 한다.</li><li>과학기술은 지속가능한 삶에 중요한 역할을 하지만 한계도 있다.</li></ul>',
        missions: [M2_1, M2_2, M2_3],
      },
      {
        title: '개인과 사회가 함께하는 실천', short: '함께 실천', icon: '🤝', phase: '설명',
        features: ['actions'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 과학기술만으로는 흐린 날 전기가 부족할 수 있다는 것을 알았어요.</div>' +
          '<p>지속가능한 삶을 위해 <b>나(개인)</b>와 <b>우리 사회</b>는 무엇을 할 수 있을까요? 실천 방안을 나누어 보고, 흐린 날에도 석탄 발전소를 쉬게 하는 데 도전해 봐요.</p>',
        setup() { setBuild({ solar: 6, wind: true, ess: true }); setCards({}); S.weather = 'clear'; resetRuns(); setSort(false); goView('power'); },
        recap: '지속가능한 삶을 위해 개인의 실천과 사회 차원의 제도·시설이 함께 필요하며, 쟁점에는 과학적 근거로 의견을 제시해요.',
        summary: '<ul><li><b>개인 차원</b>: 플러그 뽑기, 걷기·자전거, 텀블러 쓰기, 분리배출 등</li><li><b>사회 차원</b>: 재생 에너지 지원 제도, 대중교통 확충, 에너지 효율 등급 제도, 국제 협약(파리 협정) 등</li><li>흐린 날 실험: 개인 실천만, 사회 제도만으로는 부족했고 함께했을 때 석탄 발전을 거의 0으로 줄였다.</li><li>쟁점에는 과학적 근거와 대안을 들어 의견을 말한다.</li></ul>',
        missions: [M3_1, M3_2, M3_3],
      },
      {
        title: '나의 실천 계획 세우기', short: '실천 계획', icon: '📝', phase: '적용',
        features: ['plan', 'tree'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 개인과 사회가 함께 실천해야 한다는 것을 확인했어요.</div>' +
          '<p>이제 내가 실제로 실천할 <b>일주일 계획</b>을 세워 봐요. ‘언제, 무엇을, 얼마나’ 할지 정한 구체적인 계획일수록 실천하기 쉬워요!</p>',
        setup() { setSort(false); goView('plan'); },
        recap: '언제, 무엇을, 얼마나 할지 정한 구체적인 실천 계획을 세우고, 자원을 덜 쓰고 다시 쓰는 생활을 다짐했어요.',
        summary: '<p><b>나의 실천 계획</b>: 에너지·자원·이동/먹거리 분야에서 구체적인 행동을 정해 꾸준히 실천하고 기록한다.</p><p>재활용으로 자원이 무한해지지는 않는다 → 줄이기 · 다시 쓰기 · 재활용하기</p>',
        missions: [M4_1, M4_2],
      },
    ],
  });

  /* =========================================================
     시작 · 상태 갱신 · 그리기 합성 · 디버그 훅 · 루프
     ========================================================= */
  function drawVillageBadge(R, t) {
    if (R.a < 0.05 || R.w < 200) return;
    ctx.save(); ctx.globalAlpha = R.a;
    if (S.view === 'meters') {
      const s = '📅 ' + Math.round(S.yr) + '년';
      ctx.font = fj(30); const w = ctx.measureText(s).width + 32;
      softShadow(() => { ctx.fillStyle = 'rgba(255,255,255,.93)'; rr(R.x + 12, R.y + 12, w, 46, 23); ctx.fill(); }, 10, 3);
      txt(s, R.x + 28, R.y + 36, fj(30), '#1b2333', 'left');
      pill(R.x + 12 + w + 8, R.y + 35, '지금처럼 쓴다면', { bg: '#fff4e0', color: '#b45309', size: 13, h: 26, align: 'left', border: '#f5c98a' });
    } else if (S.view === 'power' || S.view === 'cards') {
      const cl = S.weather === 'cloudy', tt = S.run ? '🕗 ' + clockStr(8 + S.run.t) : (cl ? '☁️ 흐린 날' : '☀️ 맑은 날');
      ctx.font = f(15, 800); const w = ctx.measureText(tt).width + 28;
      softShadow(() => { ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(R.x + 10, R.y + 10, w + (S.run ? 74 : 0), 32, 16); ctx.fill(); }, 8, 2);
      txt(tt, R.x + 24, R.y + 27, f(15, 800), '#1b2333', 'left');
      if (S.run) txt(S.weather === 'cloudy' ? '☁️ 흐림' : '☀️ 맑음', R.x + 24 + w - 6, R.y + 27, f(13, 800), COL.muted, 'left');
    }
    ctx.restore();
  }
  function stepState(dt) {
    let hz;
    if (S.view === 'meters') hz = 0.05 + 0.27 * clamp((S.yr - 2025) / 50, 0, 1);
    else hz = 0.04 + 0.025 * (S.run ? curFlows().coal : preview().total.coal / 24);
    S.haze = approachV(S.haze, hz, dt, 2.5);
  }
  function draw(t, dt) {
    view.clear(BG);
    drawVillage(PAN.vil, t, dt);
    drawVillageBadge(PAN.vil, t);
    drawDashboard(PAN.dash, t);
    drawGraph(PAN.graph, t, dt);
    drawSwitchCards(PAN.cards, t);
    drawHistory(PAN.hist, t, dt);
    drawPlanScene(PAN.plan.a, t, dt);
    drawSortOverlay(t, dt);
    drawFx();
  }
  function client(x, y) {
    const r = view.canvas.getBoundingClientRect();
    return { x: r.left + (x * r.width) / LAY.W, y: r.top + (y * r.height) / LAY.H };
  }
  const cc = (p) => client(p.x, p.y);
  window.__sim = {
    S, PAN, simulateDay, curCfg, client, cardCount,
    get kind() { return LAY.kind; },
    get busy() { return !!S.run; },
    setSpeed(v) { S.runSpeed = v; },
    go(v) { setSort(false); goView(v); if (v === 'plan') ensurePlan(); },
    spot(name) {
      const V = villageGeom(LAY.kind);
      let m;
      if ((m = /^roof(\d)$/.exec(name))) { const h = V.houses[+m[1]]; const c = worldToCanvas(h.x, h.y - h.wh - h.rh / 2); return cc(c); }
      if (name === 'wind') { const c = worldToCanvas(V.turbine.x, V.turbine.hubY); return cc(c); }
      if (name === 'ess') { const c = worldToCanvas(V.ess.cx, V.ess.y - 22); return cc(c); }
      if ((m = /^tank:(\w+)$/.exec(name))) { const T = dashLayout(PAN.dash).tanks[TANKS.findIndex((x) => x.id === m[1])]; return client(T.cx, T.top + T.h / 2); }
      if ((m = /^sw:(\w+)$/.exec(name))) { const R = swLayout(PAN.cards)[SW_CARDS.findIndex((x) => x.id === m[1])]; return client(R.x + R.w / 2, R.y + R.h / 2); }
      if ((m = /^fq:(\d):(\d)$/.exec(name))) { const ch = planLayout().row(+m[1]).chips[+m[2]]; return client(ch.x + ch.w / 2, ch.y + ch.h / 2); }
      if (name === 'plan:slot') { const R = planLayout().row(Math.min(2, S.plan.cur)).slot; return client(R.x + R.w / 2, R.y + R.h / 2); }
      if (name === 'kwh') { const G = PAN.graph; return client(G.x + 50, G.y + (LAY.kind === 'tall' ? 53 : 36)); }
      return null;
    },
    sortCards() { return S.sortS.deck.cards.filter((c) => !c.placed).map((c) => ({ id: c.id, who: c.who, at: client(c.x + c.w / 2, c.y + c.h / 2) })); },
    sortBox(who) { const b = sortLayout().box[who]; return client(b.x + b.w / 2, b.y + b.h / 2); },
    planCards() { return S.plan.deck.cards.filter((c) => !c.hidden && !c.placed && c.alpha > 0.9).map((c) => ({ id: c.id, ok: c.ok, row: c.row, at: client(c.x + c.w / 2, c.y + c.h / 2) })); },
    get plan() { return S.plan; },
  };

  let uiT = 0;
  SciSim.loop((dt, t) => {
    S.t = t; S.dt = dt;
    stepState(dt); stepRun(dt);
    const V = villageGeom(LAY.kind), fl = curFlows();
    emitFlows(V, dt, fl); updateDots(dt);
    updateSmoke(V, dt, S.run ? fl.coal : S.view === 'meters' ? 2.7 : preview().total.coal / 24);
    [S.sortS, S.plan].forEach((o) => { if (o && o.deck) o.deck.update(dt); });
    updateFx(dt);
    draw(t, dt);
    uiT += dt;
    if (uiT > 0.25) { uiT = 0; syncDom(); }
  });
})();
