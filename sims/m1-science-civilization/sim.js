/* =========================================================
   중1 Ⅰ. 과학과 인류의 지속가능한 삶 — 과학과 인류 문명 [9과01-02 앞부분]
   🏛️ 시간 여행과 발견의 사슬
   ① [관찰] 시간 여행   : 1800~2025년 우리 동네의 밤을 연도 손잡이로 여행 → 무엇이 생활을 바꾸었나?
   ② [탐구] 발견 사슬   : 과학 원리 → 기술·기기 → 생활의 변화 사슬 잇기 → 과학과 기술의 관계
   ③ [분석] 영향 분석   : 자동차의 두 얼굴(좋은 점·문제점) → 과학과 다른 분야 잇기(미술·음악·공학·수학)
   ④ [적용] 스마트폰    : 스마트폰을 분해해 수백 년의 발견 찾기 → 과학 지식은 쌓인다
   장면 = 🌃 밤거리 · 🔗 발견의 사슬 판 · 🪙 두 얼굴 보드 · 🎨 분야 잇기 · 📱 스마트폰 분해도 (책장을 넘기듯 슬라이드)
   ※ 각 원리(전자기 유도·굴절·미생물)는 이름·현상 수준만, 연도는 연표 위치와 카드 설명에만 쓰고 퀴즈로 묻지 않음.
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
    wide: { kind: 'wide', W: 800, H: 520 },
    tall: { kind: 'tall', W: 480, H: 820 },
  };
  const mq = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
  let view = null, ctx = null, D = null, LAY = null;
  const caches = new Map();
  const wrapCache = new Map();
  const SCENE_BG = { night: SKY, chain: '#e8eef6', twoface: '#f4efe6', fields: '#edf3ef', phone: '#e7edf6' };
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
    view = SciSim.stage(cv, { width: LAY.W, height: LAY.H, background: SCENE_BG[S.scene] || SKY, onResize: () => caches.clear() });
    ctx = view.ctx; D = SciSim.draw(ctx);
    SciSim.pointer(view, handlers);
    wrapCache.clear();
    if (kind === 'tall') {
      // 휴대폰: 캔버스 위에서도 페이지를 세로로 밀 수 있게 하고, 카드·손잡이를 잡았을 때만 스크롤을 막는다
      cv.style.touchAction = 'pan-y';
      cv.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1 || S.trans) return;
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
      deck.hoverT = opts.findTarget ? opts.findTarget(d.c, { x: d.c.tx + d.c.w / 2, y: d.c.ty + d.c.h / 2 }) : null;
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
        ringFx(cx, cy, COL.good, 18); sparkle(cx, cy, 10);
        Sound.tick();
      } else if (res && res.msg) {
        c.shake = 0.3; c.flash = 0.9; c.ret = true;
        bubble(c.x + c.w / 2, c.y, res.msg, { kind: 'bad', tag: 'deck' });
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
     🌃 시간 여행 — 시대 자료
     ========================================================= */
  const ERAS = [
    { year: 1800, name: '조선 후기', label: '1800', pop: 10, popTxt: '약 10억 명', life: 29, stars: 150, glow: 0, sky: ['#050918', '#16204a'], glowCol: '#ffb35c',
      hot: [
        { id: 'lamp', icon: '🪔', name: '호롱불', text: '식물 기름을 태워 불을 밝혔어요. 방 하나를 겨우 밝혔어요.' },
        { id: 'cart', icon: '🐂', name: '소달구지', text: '사람이나 소·말의 힘으로 짐을 날랐어요.' }] },
    { year: 1900, name: '대한제국', label: '1900', pop: 16, popTxt: '약 16억 명', life: 32, stars: 120, glow: 0.12, sky: ['#080d2a', '#222c5c'], glowCol: '#ffd27a',
      hot: [
        { id: 'tram', icon: '🚋', name: '전차', text: '1899년 서울에 처음 다닌 전차예요. 전기로 움직여요.' },
        { id: 'lamp', icon: '💡', name: '가로등', text: '1900년 4월 10일 서울 종로에 처음 켜진 민간 가로등이에요(이날이 ‘전기의 날’).' }] },
    { year: 1970, name: '', label: '1970', pop: 37, popTxt: '약 37억 명', life: 57, stars: 60, glow: 0.32, sky: ['#0c1230', '#3a3454'], glowCol: '#ffb35c',
      hot: [
        { id: 'tv', icon: '📺', name: '흑백 텔레비전', text: '전파로 영상과 소리를 집까지 전했어요.' },
        { id: 'bus', icon: '🚌', name: '버스', text: '석유로 움직이는 버스로 먼 곳까지 다녔어요.' }] },
    { year: 2000, name: '', label: '2000', pop: 61, popTxt: '약 61억 명', life: 67, stars: 25, glow: 0.55, sky: ['#110e2a', '#5b3a4c'], glowCol: '#ff9d4a',
      hot: [
        { id: 'pc', icon: '💻', name: '컴퓨터·인터넷', text: '전 세계와 정보를 주고받기 시작했어요.' },
        { id: 'phone', icon: '📞', name: '휴대 전화', text: '들고 다니며 어디서나 통화했어요.' }] },
    { year: 2025, name: '오늘', label: '2025', pop: 82, popTxt: '약 82억 명', life: 73, stars: 8, glow: 0.85, sky: ['#14122b', '#4a3b5c'], glowCol: '#c9a8ff',
      hot: [
        { id: 'smart', icon: '📱', name: '스마트폰', text: '손안의 컴퓨터로 사진·지도·정보를 바로 써요.' },
        { id: 'led', icon: '🔆', name: 'LED 가로등', text: '적은 전기로 밝은 빛을 내요.' }] },
  ];
  const ERA_YEARS = ERAS.map((e) => e.year);
  function yearToF(y) {
    y = clamp(y, ERA_YEARS[0], ERA_YEARS[4]);
    for (let i = 0; i < 4; i++) if (y <= ERA_YEARS[i + 1]) return i + (y - ERA_YEARS[i]) / (ERA_YEARS[i + 1] - ERA_YEARS[i]);
    return 4;
  }
  function fToYear(f) {
    f = clamp(f, 0, 4);
    const i = Math.min(3, Math.floor(f));
    return ERA_YEARS[i] + (f - i) * (ERA_YEARS[i + 1] - ERA_YEARS[i]);
  }
  const nearestEra = (y) => Math.round(yearToF(y) + 1e-9);
  const eraMix = (f, key) => { const i = Math.min(3, Math.floor(f)), p = f - i; return lerp(ERAS[i][key], ERAS[i + 1][key], p); };
  const eraMixCol = (f, getter) => { const i = Math.min(3, Math.floor(f)), p = f - i; return SciSim.color.mix(getter(ERAS[i]), getter(ERAS[i + 1]), p); };
  const h01 = (i) => { let x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  /* 세계(밤거리) 좌표: 가로 800 고정, 바닥선 gy. 세로형은 0.75배로 가운데를 잘라 보여 준다 */
  let WG = null;
  function worldGeom() {
    const N = LAY.night, s = N.s, H = N.sc.h / s;
    WG = { rect: N.sc, s, ox: N.ox, H, gy: H - 64 };
  }
  const worldToCanvas = (wx, wy) => ({ x: WG.rect.x + (wx - WG.ox) * WG.s, y: WG.rect.y + wy * WG.s });

  /* 별(밝은 별부터): 시대마다 앞쪽 N개만 보인다 */
  const STARS = (() => {
    const r = mulberry32(2025), a = [];
    for (let i = 0; i < 150; i++) a.push({ x: r() * 800, fy: r(), r: 0.55 + r() * 1.5, ph: r() * 6.28, w: 0.9 + r() * 2.4 });
    a.sort((p, q) => q.r - p.r);
    return a;
  })();
  const MILKY = (() => {
    const r = mulberry32(77), pts = [];
    const curve = [[0, 0.88], [130, 0.62], [300, 0.4], [480, 0.25], [650, 0.12], [800, 0.02]];
    const at = (u) => { const k = u * (curve.length - 1), i = Math.min(curve.length - 2, Math.floor(k)), p = k - i; return [lerp(curve[i][0], curve[i + 1][0], p), lerp(curve[i][1], curve[i + 1][1], p)]; };
    for (let i = 0; i < 70; i++) { const u = r(), c = at(u); pts.push({ x: c[0] + (r() - 0.5) * 60, fy: c[1] + (r() - 0.5) * 0.14, rad: 30 + r() * 46, a: 0.02 + r() * 0.03 }); }
    const dust = [];
    for (let i = 0; i < 190; i++) { const u = r(), c = at(u); dust.push({ x: c[0] + (r() - 0.5) * 110, fy: c[1] + (r() - 0.5) * 0.2, r: 0.35 + r() * 0.5, a: 0.3 + r() * 0.5 }); }
    return { pts, dust };
  })();
  /* 먼 풍경 실루엣(패럴랙스 0.3): 시대마다 */
  const FAR = ERAS.map((e, ei) => {
    const r = mulberry32(300 + ei), a = [];
    if (ei === 0) { for (let i = 0; i < 9; i++) a.push({ x: i * 110 - 40, w: 190, h: 40 + r() * 52, hill: true }); return a; }
    let x = -20;
    while (x < 840) {
      const w = ei === 1 ? 46 + r() * 40 : ei === 2 ? 40 + r() * 46 : ei === 3 ? 38 + r() * 40 : 34 + r() * 42;
      const h = ei === 1 ? 24 + r() * 18 : ei === 2 ? 34 + r() * 40 : ei === 3 ? 60 + r() * 80 : 70 + r() * 150;
      a.push({ x, w, h, win: r() });
      x += w + 2 + r() * 6;
    }
    return a;
  });

  /* ---------------- 공통 그리기 도구 ---------------- */
  function add(fn) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); }
  function halo(x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(0.45, rgba(color, a * 0.4)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  function pool(x, y, rx, ry, color, a) {   // 바닥에 깔리는 빛 웅덩이
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(0.6, rgba(color, a * 0.35)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  }
  const flick = (t, seed, amp) => 1 + (amp || 0.12) * (Math.sin(t * 9.3 + seed * 7.1) * 0.5 + Math.sin(t * 5.1 + seed * 3.3) * 0.3 + Math.sin(t * 13.7 + seed) * 0.2);
  function item(k, i, fn) {      // 건물 하나: 서서히 나타나며 땅에서 솟아오른다(시대 이동 중) / 가라앉으며 사라진다
    const ai = clamp(k.a * 1.7 - i * 0.14, 0, 1);
    if (ai <= 0.005) return;
    const e = RM ? ai : EASE.outBack(ai);
    ctx.save();
    ctx.globalAlpha *= ai;
    ctx.translate(0, (1 - e) * k.rise);
    fn(ai);
    ctx.restore();
  }
  const isLit = (k, delay) => k.settle >= delay;
  function windowBox(x, y, w, h, litOn, color, o) {
    o = o || {};
    ctx.fillStyle = o.frame || '#10142a'; ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
    ctx.fillStyle = litOn ? color : (o.off || '#1b2240'); ctx.fillRect(x, y, w, h);
    if (litOn && o.bars !== false) { ctx.fillStyle = 'rgba(40,24,10,.5)'; ctx.fillRect(x + w / 2 - 0.8, y, 1.6, h); ctx.fillRect(x, y + h / 2 - 0.8, w, 1.6); }
  }
  /* 사람 실루엣: (x, y)=발 위치, h=키. phone=손에 든 화면 빛 */
  function person(x, y, t, o) {
    o = o || {};
    const h = o.h || 46, dir = o.dir || 1, col = o.col || '#0c1022';
    const sw = o.walk ? Math.sin(t * 5 + (o.ph || 0)) : 0;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
    ctx.lineWidth = h * 0.085;
    ctx.beginPath(); ctx.moveTo(-h * 0.05, -h * 0.42); ctx.lineTo(-h * 0.06 + sw * h * 0.11, 0); ctx.moveTo(h * 0.05, -h * 0.42); ctx.lineTo(h * 0.06 - sw * h * 0.11, 0); ctx.stroke();
    rr(-h * 0.13, -h * 0.74, h * 0.26, h * 0.36, h * 0.09); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -h * 0.84, h * 0.095, 0, TAU); ctx.fill();
    if (o.hat) { ctx.beginPath(); ctx.ellipse(0, -h * 0.9, h * 0.2, h * 0.04, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, -h * 0.92, h * 0.08, Math.PI, 0); ctx.fill(); }
    if (o.phone) {   // 팔 + 손에 든 화면(빛)
      ctx.lineWidth = h * 0.06; ctx.beginPath(); ctx.moveTo(dir * h * 0.08, -h * 0.66); ctx.lineTo(dir * h * 0.24, -h * 0.6); ctx.stroke();
      const px = dir * h * 0.27, py = -h * 0.63;
      ctx.fillStyle = o.phone; ctx.fillRect(px - 2.2, py - 3.6, 4.4, 7.2);
      add(() => halo(px, py, 15, o.phone, 0.5 * (o.pa == null ? 1 : o.pa)));
    }
    ctx.restore();
  }

  /* ---------------- 하늘 · 별 · 달 · 먼 풍경 ---------------- */
  function paintSky(f, t, g, wide) {
    const top = eraMixCol(f, (e) => e.sky[0]), bot = eraMixCol(f, (e) => e.sky[1]);
    const sg = ctx.createLinearGradient(0, 0, 0, g.gy);
    sg.addColorStop(0, top); sg.addColorStop(1, bot);
    ctx.fillStyle = sg; ctx.fillRect(0, 0, 800, g.H);
    // 은하수(1800)
    const mk = clamp(1 - f / 0.55, 0, 1);
    if (mk > 0.01) {
      const sk = g.gy - 40;
      ctx.save(); ctx.globalAlpha = mk * 0.9;
      MILKY.pts.forEach((p) => { const gr = ctx.createRadialGradient(p.x, p.fy * sk, 0, p.x, p.fy * sk, p.rad); gr.addColorStop(0, 'rgba(170,190,255,' + p.a + ')'); gr.addColorStop(1, 'rgba(170,190,255,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.fy * sk, p.rad, 0, TAU); ctx.fill(); });
      ctx.fillStyle = '#dfe8ff';
      MILKY.dust.forEach((p) => { ctx.globalAlpha = mk * p.a; ctx.beginPath(); ctx.arc(p.x, p.fy * sk, p.r, 0, TAU); ctx.fill(); });
      ctx.restore();
    }
    // 별: 시대마다 앞쪽 N개
    const n = eraMix(f, 'stars'), gl = eraMix(f, 'glow'), sk = g.gy - 70;
    ctx.save();
    for (let i = 0; i < STARS.length; i++) {
      const s = STARS[i], v = clamp(n - i, 0, 1);
      if (v <= 0) break;
      const y = s.fy * sk;
      const tw = RM ? 0.8 : 0.5 + 0.5 * Math.sin(s.w * t + s.ph);
      const low = 1 - 0.6 * Math.pow(y / sk, 2);
      ctx.globalAlpha = clamp(v * (0.35 + 0.65 * tw) * low * (1 - 0.45 * gl), 0, 1);
      ctx.fillStyle = s.r > 1.4 ? '#fff6dd' : '#d8e4ff';
      ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, TAU); ctx.fill();
      if (s.r > 1.5 && ctx.globalAlpha > 0.3) { ctx.globalAlpha *= 0.25; ctx.beginPath(); ctx.arc(s.x, y, s.r * 2.6, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
    // 달
    const mx = 664, my = Math.min(78, g.gy * 0.17), ma = clamp(1 - 0.62 * gl, 0.3, 1);
    ctx.save(); ctx.globalAlpha = ma;
    add(() => halo(mx, my, 62, '#cfe0ff', 0.28));
    ctx.fillStyle = '#fdf5d6'; ctx.beginPath(); ctx.arc(mx, my, 20, 0, TAU); ctx.fill();
    ctx.fillStyle = SciSim.color.mix('#16204a', '#4a3b5c', clamp(f / 4, 0, 1)); ctx.beginPath(); ctx.arc(mx + 9, my - 5, 18, 0, TAU); ctx.fill();   // 초승달
    ctx.restore();
    // 지평선의 빛 번짐(빛 공해)
    if (gl > 0.01) {
      const col = eraMixCol(f, (e) => e.glowCol);
      const hg = ctx.createLinearGradient(0, g.gy - 230, 0, g.gy + 6);
      hg.addColorStop(0, rgba('#000000', 0)); hg.addColorStop(1, col.replace('rgb(', 'rgba(').replace(')', ',' + (gl * 0.62).toFixed(3) + ')'));
      ctx.fillStyle = hg; ctx.fillRect(0, g.gy - 230, 800, 236);
    }
  }
  function paintFar(ei, k, g) {
    const arr = FAR[ei], base = SciSim.color.mix(ERAS[ei].sky[1], '#04050c', 0.62);
    const px = -k.f * 11;
    ctx.save(); ctx.globalAlpha *= clamp(k.a, 0, 1);
    ctx.translate(px, 0);
    ctx.fillStyle = base;
    if (ei === 0) {
      ctx.beginPath(); ctx.moveTo(-100, g.gy);
      arr.forEach((m) => { ctx.lineTo(m.x, g.gy - m.h * 0.45); ctx.quadraticCurveTo(m.x + m.w * 0.5, g.gy - m.h * 1.25, m.x + m.w, g.gy - m.h * 0.45); });
      ctx.lineTo(1000, g.gy); ctx.closePath(); ctx.fill();
    } else {
      arr.forEach((b) => ctx.fillRect(b.x, g.gy - b.h, b.w, b.h + 2));
      if (ei >= 3) {
        const warm = ei === 3 ? '#ffd9a0' : '#e6f0ff';
        ctx.fillStyle = warm; ctx.globalAlpha *= 0.55;
        arr.forEach((b, i) => { for (let yy = g.gy - b.h + 8; yy < g.gy - 6; yy += 11) for (let xx = b.x + 5; xx < b.x + b.w - 6; xx += 8) if (h01(i * 131 + yy + xx) < 0.38) ctx.fillRect(xx, yy, 3, 4); });
      }
    }
    ctx.restore();
  }
  function paintRoad(ei, g) {
    const rg = ctx.createLinearGradient(0, g.gy, 0, g.H);
    const cols = [['#2b2824', '#201d1a'], ['#262628', '#1b1b1f'], ['#26262c', '#1a1a20'], ['#232329', '#18181d'], ['#1f2128', '#15171d']][ei];
    rg.addColorStop(0, cols[0]); rg.addColorStop(1, cols[1]);
    ctx.fillStyle = rg; ctx.fillRect(0, g.gy, 800, g.H - g.gy + 2);
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(0, g.gy, 800, 2);       // 연석 윤곽
    if (ei >= 2) { ctx.fillStyle = 'rgba(255,255,255,.22)'; for (let x = -((performance.now() / 40) % 80) * 0; x < 800; x += 80) ctx.fillRect(x + 14, g.gy + 44, 38, 3); }
    if (ei === 0) { ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 40; i++) ctx.fillRect(h01(i) * 800, g.gy + 8 + h01(i + 40) * 50, 3 + h01(i + 9) * 6, 2); }
  }

  /* ---------------- 시대별 물체 ---------------- */
  /* 1800 조선 후기 */
  function thatchHouse(x, w, k, i, lampLit) {
    const g = WG, gy = g.gy;
    item(k, i, () => {
      // 벽
      const wg = ctx.createLinearGradient(0, gy - 62, 0, gy);
      wg.addColorStop(0, '#4a3c30'); wg.addColorStop(1, '#2c231c');
      ctx.fillStyle = wg; ctx.fillRect(x + 8, gy - 60, w - 16, 60);
      ctx.fillStyle = '#1c1612'; ctx.fillRect(x + 8, gy - 8, w - 16, 8);
      // 초가지붕(짚): 둥글게 부푼 지붕 + 짚 결
      const rg = ctx.createLinearGradient(0, gy - 124, 0, gy - 50);
      rg.addColorStop(0, '#a58d58'); rg.addColorStop(1, '#6b5a36');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.moveTo(x - 10, gy - 50);
      ctx.bezierCurveTo(x - 4, gy - 92, x + w * 0.25, gy - 124, x + w / 2, gy - 124);
      ctx.bezierCurveTo(x + w * 0.75, gy - 124, x + w + 4, gy - 92, x + w + 10, gy - 50);
      ctx.quadraticCurveTo(x + w / 2, gy - 42, x - 10, gy - 50); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,190,.2)'; ctx.lineWidth = 1;
      for (let s = 0; s < 16; s++) { const u = s / 15; ctx.beginPath(); ctx.moveTo(x + w * u, gy - 120 + Math.abs(u - 0.5) * 38); ctx.lineTo(x + w * u + (u - 0.5) * 14, gy - 52); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x - 6, gy - 54, w + 12, 5);
      // 창호지 창 + 문
      const wx = x + w * 0.16, wy = gy - 46, lit = isLit(k, 0.1 + h01(x) * 0.5);
      windowBox(wx, wy, 32, 26, lit, 'rgba(255,214,150,' + (0.78 * flick(k.t, x, 0.1)).toFixed(3) + ')', { frame: '#2a1d14', off: '#2e2a38' });
      const dx = x + w * 0.58;
      ctx.fillStyle = '#2a1d14'; ctx.fillRect(dx - 1.5, gy - 50, 34, 50);
      ctx.fillStyle = lit ? 'rgba(240,200,140,.55)' : '#2e2a38'; ctx.fillRect(dx, gy - 48.5, 31, 47.5);
      ctx.fillStyle = 'rgba(42,29,20,.9)'; ctx.fillRect(dx + 15, gy - 48, 1.5, 48);
      for (let r = 1; r < 5; r++) ctx.fillRect(dx, gy - 48 + r * 9.5, 31, 1.2);
      if (lit) {
        add(() => { halo(wx + 16, wy + 13, 56, '#ffb35c', 0.32 * flick(k.t, x)); pool(wx + 18, gy + 8, 70, 13, '#ffb35c', 0.22 * flick(k.t, x + 3)); });
        if (lampLit) {     // 창 안의 호롱불(작은 등잔)
          ctx.fillStyle = '#17110b'; ctx.fillRect(wx + 12, wy + 17, 8, 7); ctx.fillRect(wx + 15, wy + 22, 2, 4);
          D.flame(wx + 16, wy + 17, 8, k.t * 1.3, { glow: '#ffb35c' });
        }
      }
    });
  }
  function lanternPerson(k, i) {
    const gy = WG.gy, x = ((90 + k.t * 16) % 960) - 80, y = gy + 12;
    item(k, i, () => {
      const sway = RM ? 0 : Math.sin(k.t * 2.4) * 1;
      person(x, y, k.t, { h: 50, walk: true, col: '#12162a', hat: true });
      // 청사초롱: 긴 막대 끝에 매단 붉고 푸른 등
      const hx = x + 11, top = y - 86 + sway;
      ctx.strokeStyle = '#3b2c20'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(hx, y - 32); ctx.lineTo(hx + sway * 0.6, top); ctx.stroke();
      const lx = hx + sway * 0.6, ly = top - 2, fl = flick(k.t, 4, 0.14);
      add(() => { halo(lx, ly + 10, 78 * fl, '#ff8a4a', 0.5); pool(x + 6, gy + 18, 96 * fl, 17, '#ff9a55', 0.3); });
      const g1 = ctx.createLinearGradient(lx - 10, 0, lx + 10, 0); g1.addColorStop(0, '#e8483a'); g1.addColorStop(1, '#a8231c');
      ctx.fillStyle = g1; ctx.beginPath(); ctx.ellipse(lx, ly + 4, 10, 8, 0, Math.PI, 0); ctx.fill();
      const g2 = ctx.createLinearGradient(lx - 10, 0, lx + 10, 0); g2.addColorStop(0, '#4a73d8'); g2.addColorStop(1, '#24408f');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(lx, ly + 4, 10, 8, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#e9c46a'; ctx.fillRect(lx - 6, ly - 6, 12, 3); ctx.fillRect(lx - 5, ly + 13, 10, 3);
      add(() => halo(lx, ly + 5, 20, '#fff0c0', 0.65 * fl));
    });
    return { x: x + 8, y: y - 62 };
  }
  function oxCart(k, i) {
    const gy = WG.gy, x = ((k.t * -9 + 540) % 1000 + 1000) % 1000 - 120, y = gy + 40;
    item(k, i, () => {
      const col = '#171310';
      // 소
      ctx.fillStyle = '#2a211a';
      ctx.beginPath(); ctx.ellipse(x - 52, y - 40, 30, 16, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x - 80, y - 46, 9, 8, -0.3, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2a211a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      const lg = RM ? 0 : Math.sin(k.t * 3) * 4;
      [[-68, lg], [-60, -lg], [-42, -lg], [-34, lg]].forEach(([dx, s]) => { ctx.beginPath(); ctx.moveTo(x + dx, y - 30); ctx.lineTo(x + dx + s, y - 2); ctx.stroke(); });
      ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 86, y - 52); ctx.quadraticCurveTo(x - 92, y - 62, x - 86, y - 66); ctx.moveTo(x - 76, y - 53); ctx.quadraticCurveTo(x - 72, y - 62, x - 76, y - 66); ctx.stroke();
      // 달구지 몸체 + 바퀴
      ctx.fillStyle = '#3a2c1f'; ctx.fillRect(x - 24, y - 44, 76, 7);
      ctx.fillStyle = '#4b3826'; ctx.fillRect(x - 20, y - 66, 3, 22); ctx.fillRect(x + 46, y - 66, 3, 22); ctx.fillRect(x - 20, y - 66, 69, 3);
      ctx.fillStyle = '#6b5a36'; ctx.beginPath(); ctx.ellipse(x + 14, y - 49, 30, 8, 0, Math.PI, 0); ctx.fill();   // 짚단 짐
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 24, y - 40); ctx.lineTo(x - 36, y - 38); ctx.stroke();
      const rot = RM ? 0 : (k.t * 9) % TAU;
      ctx.save(); ctx.translate(x + 14, y - 16); ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.stroke(); ctx.lineWidth = 2;
      for (let s = 0; s < 8; s++) { const a = rot + (s / 8) * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); ctx.stroke(); }
      ctx.fillStyle = '#2b2118'; ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, TAU); ctx.fill(); ctx.restore();
    });
    return { x: x - 10, y: y - 44 };
  }
  function pine(x, s, k, i) {
    const gy = WG.gy;
    item(k, i, () => {
      ctx.fillStyle = '#1a1511'; ctx.fillRect(x - 3 * s, gy - 52 * s, 6 * s, 54 * s);
      ctx.fillStyle = '#0d1a16';
      [[0, -86, 40], [-6, -68, 34], [6, -64, 30]].forEach(([dx, dy, w]) => { ctx.beginPath(); ctx.ellipse(x + dx * s, gy + dy * s, w * s * 0.9, 13 * s, 0, 0, TAU); ctx.fill(); });
    });
  }
  function paintEra0(k) {
    const g = WG; pine(250, 1, k, 0); pine(540, 0.85, k, 1);
    thatchHouse(60, 150, k, 0, false); thatchHouse(330, 172, k, 2, false); thatchHouse(610, 150, k, 4, true);
    const lp = lanternPerson(k, 5), cp = oxCart(k, 6);
    const lampPos = { x: 610 + 150 * 0.16 + 16, y: g.gy - 32 };
    return { lamp: lampPos, cart: cp, person: lp };
  }

  /* 1900 대한제국 */
  function tileHouse(x, w, floorH, k, i, o) {
    const gy = WG.gy; o = o || {};
    item(k, i, () => {
      const top = gy - floorH;
      const wg = ctx.createLinearGradient(0, top, 0, gy);
      wg.addColorStop(0, '#43403f'); wg.addColorStop(1, '#2a2827');
      ctx.fillStyle = wg; ctx.fillRect(x + 6, top, w - 12, floorH);
      // 기와지붕: 처마 끝이 위로 들린 곡선 + 기와 줄무늬
      ctx.fillStyle = '#23262f';
      ctx.beginPath(); ctx.moveTo(x - 12, top + 4); ctx.quadraticCurveTo(x + 6, top - 4, x + 18, top - 14);
      ctx.lineTo(x + w - 18, top - 14); ctx.quadraticCurveTo(x + w - 6, top - 4, x + w + 12, top + 4);
      ctx.lineTo(x + w + 4, top + 12); ctx.lineTo(x - 4, top + 12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
      for (let s = 0; s <= 14; s++) { const u = s / 14; ctx.beginPath(); ctx.moveTo(x + 18 + (w - 36) * u, top - 13); ctx.lineTo(x + (w + 20) * u - 10, top + 10); ctx.stroke(); }
      ctx.fillStyle = '#5a5047'; ctx.fillRect(x - 4, top + 11, w + 8, 3);
      // 격자 문(창호): 은은한 불빛
      const n = Math.max(2, Math.floor((w - 24) / 38));
      for (let s = 0; s < n; s++) {
        const wx = x + 14 + s * ((w - 28) / n), ww = (w - 28) / n - 8, lit = isLit(k, 0.1 + h01(x + s * 7) * 0.55) && (s + (x | 0)) % 3 !== 0;
        windowBox(wx, top + 22, ww, floorH - 32, lit, 'rgba(255,224,160,' + (0.5 * flick(k.t, x + s, 0.05)).toFixed(3) + ')', { frame: '#201a14', off: '#2a2c36' });
      }
      if (o.sign) {   // 세로 간판(붉은 천)
        ctx.fillStyle = '#6b1f1f'; ctx.fillRect(x + w - 26, top + 20, 14, 46);
        ctx.fillStyle = '#e9c46a'; for (let s = 0; s < 4; s++) ctx.fillRect(x + w - 23, top + 26 + s * 10, 8, 4);
      }
    });
  }
  function utilPole(x, k, i, h, arms) {
    const gy = WG.gy;
    item(k, i, () => {
      ctx.fillStyle = '#251d16'; ctx.fillRect(x - 3, gy - h, 6, h + 6);
      ctx.fillStyle = '#31271d'; for (let a = 0; a < arms; a++) { ctx.fillRect(x - 24 + (arms > 2 ? 0 : 4), gy - h + 8 + a * 16, 48 - (arms > 2 ? 0 : 8), 3.5); }
      ctx.fillStyle = '#7a8aa0';
      for (let a = 0; a < arms; a++) [-20, 0, 20].forEach((d) => { if (d === 0 && arms < 3) return; ctx.fillRect(x + d - 1.5, gy - h + 4 + a * 16, 3, 5); });
    });
  }
  function wires(xs, k, i, h, n, sag) {
    const gy = WG.gy;
    item(k, i, () => {
      ctx.strokeStyle = 'rgba(10,12,22,.85)'; ctx.lineWidth = 1.2;
      for (let a = 0; a < n; a++) {
        const y0 = gy - h + 8 + a * (n > 3 ? 12 : 16);
        for (let s = 0; s < xs.length - 1; s++) { ctx.beginPath(); ctx.moveTo(xs[s] + (a % 3 - 1) * 20, y0); ctx.quadraticCurveTo((xs[s] + xs[s + 1]) / 2, y0 + sag, xs[s + 1] + (a % 3 - 1) * 20, y0); ctx.stroke(); }
      }
    });
  }
  function oldLamp(x, k, i, lampLit, big) {
    const gy = WG.gy;
    item(k, i, () => {
      ctx.fillStyle = '#16181f'; ctx.fillRect(x - 2.5, gy - 96, 5, 100); ctx.fillRect(x - 7, gy - 8, 14, 10);
      ctx.fillStyle = '#20232c'; ctx.beginPath(); ctx.moveTo(x - 11, gy - 100); ctx.lineTo(x + 11, gy - 100); ctx.lineTo(x + 6, gy - 108); ctx.lineTo(x - 6, gy - 108); ctx.closePath(); ctx.fill();
      const lit = isLit(k, 0.2 + h01(x) * 0.5), fl = flick(k.t, x, 0.06);
      ctx.fillStyle = lit ? '#fff0b8' : '#3a3d4a'; ctx.fillRect(x - 7, gy - 100, 14, 22);
      ctx.strokeStyle = '#16181f'; ctx.lineWidth = 1.2; ctx.strokeRect(x - 7, gy - 100, 14, 22);
      if (lit) add(() => { halo(x, gy - 89, (big ? 74 : 56) * fl, '#ffd27a', big ? 0.55 : 0.42); pool(x, gy + 14, (big ? 96 : 70) * fl, 14, '#ffd27a', big ? 0.34 : 0.22); });
    });
    return { x, y: gy - 89 };
  }
  function tramBody(x, y, k) {
    // (x, y) = 전차 왼쪽 아래
    const w = 150, h = 60, top = y - h;
    ctx.fillStyle = '#4a2a22'; rr(x, top, w, h, 8); ctx.fill();
    ctx.fillStyle = '#d8c9a8'; ctx.fillRect(x + 2, top + 40, w - 4, 12);
    ctx.fillStyle = '#2d1913'; ctx.fillRect(x - 2, top - 5, w + 4, 8);
    for (let s = 0; s < 5; s++) {
      const wx = x + 14 + s * 26, lit = isLit(k, 0.1 + s * 0.07) || k.settle < 0 ? isLit(k, 0.1 + s * 0.07) : true;
      ctx.fillStyle = lit ? 'rgba(255,226,166,.9)' : '#2a2c3a'; ctx.fillRect(wx, top + 12, 18, 20);
    }
    ctx.fillStyle = '#1a1a22'; [x + 26, x + w - 30].forEach((cx) => { ctx.beginPath(); ctx.arc(cx, y + 3, 7, 0, TAU); ctx.fill(); });
    return { x: x + w / 2, y: top + 20 };
  }
  function paintEra1(k) {
    const g = WG, gy = g.gy;
    tileHouse(20, 170, 70, k, 0, {}); tileHouse(200, 130, 84, k, 1, { sign: true }); tileHouse(480, 170, 74, k, 3, { sign: true }); tileHouse(670, 130, 66, k, 4, {});
    utilPole(340, k, 2, 150, 2); utilPole(610, k, 3, 150, 2);
    wires([-60, 340, 610, 860], k, 2, 150, 2, 14);
    const l1 = oldLamp(160, k, 5, true, false), l2 = oldLamp(420, k, 6, true, false), l3 = oldLamp(700, k, 7, true, false);
    // 전차선(가공선) + 전차
    const wy = gy - 132;
    item(k, 8, () => { ctx.strokeStyle = '#0d0f16'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-10, wy); ctx.lineTo(810, wy); ctx.stroke();
      ctx.fillStyle = '#1a1d26'; [60, 330, 600].forEach((px) => { ctx.fillRect(px - 2, wy - 6, 4, gy - wy + 10); ctx.fillRect(px - 2, wy - 6, 18, 3); }); });
    const tx = ((k.t * 38 + 130) % 1100) - 190, ty = gy + 50;
    let tp = { x: tx + 75, y: ty - 40 };
    item(k, 9, () => {
      ctx.fillStyle = 'rgba(160,150,140,.35)'; ctx.fillRect(0, ty - 4, 800, 2); ctx.fillStyle = 'rgba(120,115,110,.5)'; for (let s = 0; s < 40; s++) ctx.fillRect(s * 22, ty - 2, 8, 2.5);
      tp = tramBody(tx, ty, k);
      // 집전 장치(막대) + 가끔 튀는 불꽃
      ctx.strokeStyle = '#15171d'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(tx + 108, ty - 66); ctx.lineTo(tx + 122, wy + 1); ctx.stroke();
      const ph = (k.t * 0.9 + 0.3) % 1;
      if (!RM && ph < 0.12) add(() => { const q = ph / 0.12; halo(tx + 122, wy, 16 * (1 - q * 0.4), '#fff2b0', 0.9 * (1 - q)); for (let s = 0; s < 4; s++) { ctx.fillStyle = 'rgba(255,230,150,' + (1 - q) + ')'; ctx.fillRect(tx + 122 + (s - 1.5) * 7 * q, wy + 3 + 12 * q * (s % 2 + 1), 1.8, 1.8); } });
      add(() => { halo(tx + 150, ty - 30, 36, '#ffe9a8', 0.5); pool(tx + 75, gy + 56, 100, 8, '#ffd27a', 0.16); });
    });
    return { tram: tp, lamp: l2, lamps: [l1, l2, l3] };
  }

  /* 1970년대 */
  function shopFront(x, w, k, i, o) {
    const gy = WG.gy; o = o || {};
    item(k, i, () => {
      const h = o.h || 150, top = gy - h;
      const wg = ctx.createLinearGradient(0, top, 0, gy);
      wg.addColorStop(0, o.wall || '#2f3144'); wg.addColorStop(1, '#202233');
      ctx.fillStyle = wg; ctx.fillRect(x, top, w, h);
      ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(x, top, w, 4);
      ctx.fillStyle = '#12141f'; ctx.fillRect(x - 3, top - 5, w + 6, 8);
      // 2층 창
      const n = Math.max(2, Math.floor(w / 44));
      for (let s = 0; s < n; s++) {
        const wx = x + 10 + s * ((w - 20) / n), ww = (w - 20) / n - 10, idx = (x | 0) + s * 13;
        const tv = o.tv === s;
        const lit = isLit(k, 0.1 + h01(idx) * 0.55) && (tv || h01(idx + 3) < 0.7);
        windowBox(wx, top + 18, ww, 34, lit, tv ? 'rgba(180,200,235,.95)' : '#ffd27a', { off: '#1d2136' });
        if (lit && !tv) add(() => halo(wx + ww / 2, top + 35, 38, '#ffd27a', 0.2));
        if (tv && lit) {
          const fl = RM ? 0.7 : 0.55 + 0.45 * Math.sin(k.t * 23) * Math.sin(k.t * 7.3 + 1);
          ctx.fillStyle = 'rgba(150,175,230,' + (0.55 + 0.3 * fl) + ')'; ctx.fillRect(wx, top + 18, ww, 34);
          add(() => { halo(wx + ww / 2, top + 36, 70, '#9bb7ff', 0.4 * (0.6 + 0.4 * fl)); pool(wx + ww / 2, gy + 14, 70, 11, '#9bb7ff', 0.12); });
        }
      }
      // 1층 가게 + 간판
      ctx.fillStyle = '#171927'; ctx.fillRect(x + 6, top + 74, w - 12, h - 74);
      const sc = o.sign || '#e2464b';
      ctx.fillStyle = sc; ctx.fillRect(x + 8, top + 60, w - 16, 16);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let s = 0; s < Math.floor((w - 24) / 12); s++) ctx.fillRect(x + 14 + s * 12, top + 65, 8, 6);
      const lit2 = isLit(k, 0.2 + h01(x) * 0.4);
      ctx.fillStyle = lit2 ? 'rgba(255,214,140,.92)' : '#222538'; ctx.fillRect(x + 12, top + 84, w - 24, h - 94);
      if (lit2) add(() => { halo(x + w / 2, top + 108, w * 0.6, '#ffd27a', 0.2); pool(x + w / 2, gy + 10, w * 0.62, 11, '#ffd27a', 0.2); });
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 12 + (w - 24) * 0.5 - 1, top + 84, 2, h - 94);
    });
    return { x: x + 10 + ((w - 20) / Math.max(2, Math.floor(w / 44))) * ((o.tv || 0) + 0.5), y: gy - (o.h || 150) + 35 };
  }
  function busBody(x, y, k) {
    const w = 168, h = 62, top = y - h;
    const g = ctx.createLinearGradient(0, top, 0, y); g.addColorStop(0, '#e0a24a'); g.addColorStop(1, '#a8651f');
    ctx.fillStyle = g; rr(x, top, w, h, 7); ctx.fill();
    ctx.fillStyle = '#f2e6c8'; ctx.fillRect(x + 2, top + 32, w - 4, 6);
    for (let s = 0; s < 6; s++) { ctx.fillStyle = isLit(k, 0.1 + s * 0.05) ? 'rgba(255,238,190,.92)' : '#2a2c3a'; ctx.fillRect(x + 10 + s * 24, top + 8, 19, 20); }
    ctx.fillStyle = '#121218'; [x + 36, x + w - 36].forEach((cx) => { ctx.beginPath(); ctx.arc(cx, y + 2, 10, 0, TAU); ctx.fill(); ctx.fillStyle = '#4a4f5c'; ctx.beginPath(); ctx.arc(cx, y + 2, 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#121218'; });
    return { x: x + w / 2, y: top + 20 };
  }
  function paintEra2(k) {
    const g = WG, gy = g.gy;
    const tvp = shopFront(10, 200, k, 0, { h: 150, sign: '#2a6ad0', tv: -1 });
    shopFront(222, 150, k, 1, { h: 132, sign: '#e2464b', wall: '#2c3548' });
    const tv = shopFront(386, 190, k, 2, { h: 158, sign: '#14a058', tv: 2, wall: '#352d3d' });
    shopFront(590, 210, k, 4, { h: 140, sign: '#d98a1f' });
    utilPole(210, k, 3, 170, 4); utilPole(560, k, 4, 170, 4);
    wires([-80, 210, 560, 880], k, 3, 170, 4, 18);
    // 버스(석유로 달림): 오른쪽으로, 전조등 불빛이 길을 쓴다
    const bx = ((k.t * 54 + 40) % 1150) - 230, by = gy + 50;
    let bp = { x: bx + 84, y: by - 40 };
    item(k, 5, () => {
      bp = busBody(bx, by, k);
      add(() => {
        const hx = bx + 168, hy = by - 18, sw = RM ? 0 : Math.sin(k.t * 0.8) * 0.06;
        const cg = ctx.createLinearGradient(hx, 0, hx + 190, 0); cg.addColorStop(0, 'rgba(255,240,190,.55)'); cg.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(hx, hy - 3); ctx.lineTo(hx + 190, hy - 34 + sw * 120); ctx.lineTo(hx + 190, hy + 40 + sw * 120); ctx.lineTo(hx, hy + 4); ctx.closePath(); ctx.fill();
        halo(hx, hy, 24, '#fff0c0', 0.8);
        halo(bx + 2, by - 18, 14, '#ff4a3a', 0.6);
      });
    });
    return { tv: { x: tv.x, y: tv.y }, bus: bp };
  }

  /* 2000년 */
  function aptSlab(x, w, h, k, i) {
    const gy = WG.gy;
    item(k, i, () => {
      const top = gy - h;
      const wg = ctx.createLinearGradient(0, top, 0, gy); wg.addColorStop(0, '#272a3d'); wg.addColorStop(1, '#1b1d2d');
      ctx.fillStyle = wg; ctx.fillRect(x, top, w, h);
      ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x, top, w, 3);
      const cols = Math.floor((w - 12) / 24), rows = Math.floor((h - 26) / 26);
      const dark = [], warm = [], white = [], pcs = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const idx = i * 1000 + r * 37 + c, wx = x + 8 + c * 24, wy = top + 12 + r * 26, hh = h01(idx);
        if (i === 0 && r === 3 && c === 5) { if (isLit(k, 0.3)) pcs.push([wx, wy, idx]); else dark.push([wx, wy]); continue; }   // 컴퓨터 화면이 있는 창(핫스폿)
        if (hh > 0.62) dark.push([wx, wy]);
        else if (hh > 0.42 && isLit(k, 0.05 + h01(idx + 5) * 0.6)) white.push([wx, wy]);
        else if (hh > 0.12 && isLit(k, 0.05 + h01(idx + 5) * 0.6)) { if (hh < 0.2) pcs.push([wx, wy, idx]); else warm.push([wx, wy]); }
        else dark.push([wx, wy]);
      }
      ctx.fillStyle = '#12152a'; dark.forEach(([a, b]) => ctx.fillRect(a, b, 14, 17));
      ctx.fillStyle = '#ffd9a0'; warm.forEach(([a, b]) => ctx.fillRect(a, b, 14, 17));
      ctx.fillStyle = '#fff3d6'; white.forEach(([a, b]) => ctx.fillRect(a, b, 14, 17));
      pcs.forEach(([a, b, idx]) => { const fl = RM ? 0.8 : 0.65 + 0.35 * Math.sin(k.t * (6 + h01(idx) * 8) + idx); ctx.fillStyle = 'rgba(160,200,255,' + fl + ')'; ctx.fillRect(a, b, 14, 17); });
      add(() => pcs.forEach(([a, b]) => halo(a + 7, b + 9, 24, '#8ab6ff', 0.2)));
      // 발코니 줄
      ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let r = 0; r < rows; r++) ctx.fillRect(x, top + 12 + r * 26 + 19, w, 2);
      k.pcs = k.pcs || {}; if (!k.pcs[i]) k.pcs[i] = pcs.slice(0, 2).map(([a, b]) => ({ x: a + 7, y: b + 9 }));
    });
  }
  function sodiumLamp(x, k, i, dir) {
    const gy = WG.gy;
    item(k, i, () => {
      ctx.fillStyle = '#15171f'; ctx.fillRect(x - 2.5, gy - 110, 5, 114);
      ctx.strokeStyle = '#15171f'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, gy - 108); ctx.quadraticCurveTo(x + dir * 6, gy - 124, x + dir * 24, gy - 118); ctx.stroke();
      ctx.fillStyle = '#21232c'; rr(x + dir * 24 - 11, gy - 121, 22, 8, 4); ctx.fill();
      const lit = isLit(k, 0.2 + h01(x) * 0.5), fl = flick(k.t, x, 0.03);
      if (lit) {
        ctx.fillStyle = '#ffc77a'; rr(x + dir * 24 - 9, gy - 114, 18, 4, 2); ctx.fill();
        add(() => { halo(x + dir * 24, gy - 112, 64 * fl, '#ffa23d', 0.55); pool(x + dir * 24, gy + 18, 110 * fl, 15, '#ffa23d', 0.38); });
      }
    });
  }
  function paintEra3(k) {
    const g = WG, gy = g.gy;
    aptSlab(0, 258, 300, k, 0); aptSlab(274, 220, 250, k, 1); aptSlab(512, 288, 268, k, 2);
    // 지하철 입구(일반 표지)
    item(k, 3, () => {
      const x = 560, w = 120;
      ctx.fillStyle = '#1d3a3a'; ctx.fillRect(x, gy - 52, w, 52);
      ctx.fillStyle = '#12141d'; ctx.fillRect(x + 22, gy - 40, w - 44, 40);
      ctx.fillStyle = '#26333a'; ctx.beginPath(); ctx.moveTo(x - 8, gy - 52); ctx.lineTo(x + w + 8, gy - 52); ctx.lineTo(x + w, gy - 62); ctx.lineTo(x, gy - 62); ctx.closePath(); ctx.fill();
      const lit = isLit(k, 0.3);
      ctx.fillStyle = lit ? '#1fbf75' : '#26333a'; rr(x + 18, gy - 92, w - 36, 26, 6); ctx.fill();
      if (lit) { txt('지하철', x + w / 2, gy - 79, f(14, 800), '#fff'); add(() => { halo(x + w / 2, gy - 79, 70, '#1fbf75', 0.4); pool(x + w / 2, gy + 14, 80, 12, '#1fbf75', 0.18); }); }
      ctx.fillStyle = lit ? '#bfeede' : '#26333a'; ctx.fillRect(x + 34, gy - 38, w - 68, 38);
    });
    [60, 300, 520, 744].forEach((x, s) => sodiumLamp(x, k, 4 + s, s % 2 ? -1 : 1));
    // 사람들(휴대 전화 화면 빛)
    const px = 400 + Math.sin(k.t * 0.25) * 18;
    let phonePos = { x: px + 11, y: gy + 12 - 30 };
    item(k, 9, () => { person(px, gy + 12, k.t, { h: 50, phone: '#d8f1ff', walk: false, dir: 1 }); person(px - 34, gy + 14, k.t, { h: 46, walk: false, col: '#0c1022' }); });
    item(k, 10, () => { person(130, gy + 14, k.t, { h: 48, walk: true, ph: 1.4 }); });
    // 자동차(붉은 후미등)
    const cx = ((k.t * 46 + 300) % 1000) - 160;
    item(k, 11, () => {
      const cy = gy + 52;
      ctx.fillStyle = '#10121b'; rr(cx, cy - 24, 84, 18, 6); ctx.fill(); rr(cx + 16, cy - 38, 46, 18, 8); ctx.fill();
      ctx.fillStyle = '#1b1d2a'; ctx.fillRect(cx + 22, cy - 35, 14, 10); ctx.fillRect(cx + 40, cy - 35, 14, 10);
      ctx.fillStyle = '#0a0b10'; [cx + 18, cx + 66].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, cy - 5, 8, 0, TAU); ctx.fill(); });
      add(() => { halo(cx + 1, cy - 16, 18, '#ff3b30', 0.7); halo(cx + 84, cy - 15, 16, '#fff3c4', 0.45); });
    });
    return { pc: { x: 135, y: gy - 201 }, phone: phonePos };
  }

  /* 2025 오늘 */
  function tower(x, w, h, k, i, o) {
    const gy = WG.gy; o = o || {};
    item(k, i, () => {
      const top = gy - h;
      const wg = ctx.createLinearGradient(x, 0, x + w, 0); wg.addColorStop(0, '#222845'); wg.addColorStop(0.5, '#2c3355'); wg.addColorStop(1, '#1b2038');
      ctx.fillStyle = wg; ctx.fillRect(x, top, w, h);
      ctx.fillStyle = 'rgba(190,210,255,.14)'; ctx.fillRect(x, top, 5, h);
      const cols = Math.floor((w - 10) / 14), rows = Math.floor((h - 20) / 17);
      const lit = [], mid = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const idx = i * 997 + r * 41 + c, hh = h01(idx);
        if (hh < 0.42 && isLit(k, 0.05 + h01(idx + 9) * 0.6)) lit.push([x + 6 + c * 14, top + 10 + r * 17]);
        else if (hh < 0.52 && isLit(k, 0.05 + h01(idx + 9) * 0.6)) mid.push([x + 6 + c * 14, top + 10 + r * 17]);
      }
      ctx.fillStyle = '#e8f1ff'; lit.forEach(([a, b]) => ctx.fillRect(a, b, 9, 11));
      ctx.fillStyle = '#9fb6e8'; mid.forEach(([a, b]) => ctx.fillRect(a, b, 9, 11));
      ctx.fillStyle = 'rgba(8,10,24,.42)';
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const hh = h01(i * 997 + r * 41 + c); if (hh >= 0.52) ctx.fillRect(x + 6 + c * 14, top + 10 + r * 17, 9, 11); }
      if (o.led) {   // 전광판: 흘러가는 색 띠
        const by = top + 30, bh = 34;
        ctx.save(); ctx.beginPath(); ctx.rect(x + 6, by, w - 12, bh); ctx.clip();
        for (let s = 0; s < 8; s++) { const sx = x + 6 + ((s * 30 + (RM ? 0 : k.t * 40)) % (w + 30)) - 30; const gr = ctx.createLinearGradient(sx, 0, sx + 40, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, ['#5ce1e6', '#ff7ac8', '#ffd84d', '#8affc1'][s % 4]); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fillRect(sx, by, 40, bh); }
        ctx.restore();
        add(() => halo(x + w / 2, by + bh / 2, w * 0.8, '#9fd8ff', 0.18));
      }
      const bl = RM ? 1 : (Math.sin(k.t * 3 + i) > 0.55 ? 1 : 0.2);
      ctx.fillStyle = '#ff4a3a'; ctx.globalAlpha *= bl; ctx.beginPath(); ctx.arc(x + w / 2, top - 4, 2.6, 0, TAU); ctx.fill();
      add(() => halo(x + w / 2, top - 4, 12, '#ff4a3a', 0.6));
    });
  }
  function ledLamp(x, k, i) {
    const gy = WG.gy;
    item(k, i, () => {
      ctx.fillStyle = '#d7dde8'; ctx.fillRect(x - 2, gy - 112, 4, 116); ctx.fillStyle = '#2b303d'; ctx.fillRect(x - 6, gy - 6, 12, 8);
      ctx.fillStyle = '#e6ebf5'; rr(x - 16, gy - 118, 32, 7, 3.5); ctx.fill();
      const lit = isLit(k, 0.2 + h01(x) * 0.5);
      if (lit) {
        ctx.fillStyle = '#ffffff'; rr(x - 13, gy - 112, 26, 3, 1.5); ctx.fill();
        add(() => { halo(x, gy - 108, 60, '#dfeaff', 0.5); pool(x, gy + 18, 118, 15, '#dfeaff', 0.34);
          const cg = ctx.createLinearGradient(0, gy - 110, 0, gy + 8); cg.addColorStop(0, 'rgba(223,234,255,.2)'); cg.addColorStop(1, 'rgba(223,234,255,0)');
          ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(x - 10, gy - 110); ctx.lineTo(x + 10, gy - 110); ctx.lineTo(x + 58, gy + 12); ctx.lineTo(x - 58, gy + 12); ctx.closePath(); ctx.fill(); });
      }
    });
    return { x, y: gy - 108 };
  }
  function paintEra4(k) {
    const g = WG, gy = g.gy;
    tower(10, 150, 330, k, 0); tower(176, 120, 260, k, 1, { led: true }); tower(312, 160, 340, k, 2); tower(490, 130, 290, k, 3); tower(636, 154, 250, k, 4, { led: false });
    const l1 = ledLamp(150, k, 5), l2 = ledLamp(420, k, 6), l3 = ledLamp(700, k, 7);
    // 전기차: 조용히 미끄러진다
    const cx = ((k.t * 34 + 200) % 1050) - 200, cy = gy + 52;
    let carP = { x: cx + 50, y: cy - 22 };
    item(k, 8, () => {
      const cg = ctx.createLinearGradient(0, cy - 38, 0, cy); cg.addColorStop(0, '#e8eef8'); cg.addColorStop(1, '#9aa7bd');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.quadraticCurveTo(cx - 2, cy - 22, cx + 14, cy - 24); ctx.quadraticCurveTo(cx + 30, cy - 42, cx + 62, cy - 40); ctx.quadraticCurveTo(cx + 84, cy - 36, cx + 92, cy - 22); ctx.quadraticCurveTo(cx + 100, cy - 20, cx + 100, cy - 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1f2a44'; ctx.beginPath(); ctx.moveTo(cx + 26, cy - 24); ctx.quadraticCurveTo(cx + 36, cy - 36, cx + 60, cy - 36); ctx.quadraticCurveTo(cx + 76, cy - 34, cx + 82, cy - 24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0d1020'; [cx + 24, cx + 78].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, cy - 7, 9, 0, TAU); ctx.fill(); ctx.fillStyle = '#c9d2e3'; ctx.beginPath(); ctx.arc(wx, cy - 7, 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#0d1020'; });
      add(() => { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(cx + 94, cy - 20, 8, 2.5); halo(cx + 102, cy - 19, 22, '#ffffff', 0.6); ctx.fillStyle = 'rgba(255,60,50,.9)'; ctx.fillRect(cx - 2, cy - 17, 7, 2.5); halo(cx - 1, cy - 16, 12, '#ff3b30', 0.5);
        const lc = ctx.createLinearGradient(cx + 100, 0, cx + 240, 0); lc.addColorStop(0, 'rgba(235,245,255,.32)'); lc.addColorStop(1, 'rgba(235,245,255,0)');
        ctx.fillStyle = lc; ctx.beginPath(); ctx.moveTo(cx + 100, cy - 21); ctx.lineTo(cx + 240, cy - 40); ctx.lineTo(cx + 240, cy + 6); ctx.lineTo(cx + 100, cy - 17); ctx.closePath(); ctx.fill(); });
      carP = { x: cx + 50, y: cy - 22 };
    });
    // 스마트폰을 든 사람들
    const px = 300 + Math.sin(k.t * 0.3) * 14, pPos = { x: px + 11, y: gy + 12 - 31 };
    item(k, 9, () => { person(px, gy + 12, k.t, { h: 52, phone: '#e9f6ff', dir: 1 }); person(px + 40, gy + 14, k.t, { h: 46, phone: '#dff0ff', dir: -1, pa: 0.9 }); person(590, gy + 13, k.t, { h: 50, walk: true, phone: '#e9f6ff', ph: 2.1 }); });
    return { smart: pPos, led: l2, car: carP, lamps: [l1, l2, l3] };
  }
  const PAINT_ERA = [paintEra0, paintEra1, paintEra2, paintEra3, paintEra4];

  /* =========================================================
     🌃 밤거리 장면: 합성 · 통계 패널 · 타임라인 · 핫스폿
     ========================================================= */
  const SCENES = ['night', 'chain', 'twoface', 'fields', 'phone'];
  const S = {
    scene: 'night', t: 0, booted: false, hover: null, press: null, trans: null,
    year: 1800, target: 1800, drag: false, sliderDrag: false,
    sp: new SciSim.Spring(1800, { stiffness: 170, damping: 12 }),
    arrived: -1, lit: [-1, -1, -1, -1, -1], hot: [{}, {}, {}, {}, {}], pin: {}, hotTap: {},
    visited: new Set(), erasTapped: new Set(),
    stat: { pop: 10, life: 29 }, icons: [1, 0, 0, 0, 0, 0, 0, 0, 0], iconT: new Array(9).fill(0),
    sc: { chain: null, tf: null, fl: null, ph: null },
  };
  let game = null;
  let F = new Set();
  const has = (n) => (game ? game.has(n) : F.has(n));
  const isNew = (n) => !!(game && game.isNew(n));
  const active = (m) => !!(game && game.isActive(m));
  const level = () => (game ? game.level : 0);
  const freeMode = () => !!(game && game.free);

  Object.assign(LAYOUTS.wide, {
    night: { sc: { x: 0, y: 0, w: 800, h: 456 }, s: 1, ox: 0, bar: { x: 0, y: 456, w: 800, h: 64 }, track: { x0: 60, x1: 740, y: 490, names: 467, years: 511 }, stats: { x: 12, y: 12, w: 224, h: 152, wide: false }, label: { x: 420, y: 26 } },
  });
  Object.assign(LAYOUTS.tall, {
    night: { sc: { x: 0, y: 0, w: 480, h: 560 }, s: 0.75, ox: 80, bar: { x: 0, y: 704, w: 480, h: 116 }, track: { x0: 38, x1: 442, y: 762, names: 730, years: 800 }, stats: { x: 10, y: 574, w: 460, h: 118, wide: true }, label: { x: 240, y: 22 } },
  });

  const yearX = (y) => { const T = LAY.night.track; return T.x0 + ((clamp(y, 1800, 2025) - 1800) / 225) * (T.x1 - T.x0); };
  const xToYear = (x) => { const T = LAY.night.track; return clamp(1800 + ((x - T.x0) / (T.x1 - T.x0)) * 225, 1800, 2025); };
  const eraAlpha = (f, e) => clamp(1.3 - 1.6 * Math.abs(f - e), 0, 1);

  function arriveEra(e) {
    S.arrived = e;
    if (S.lit[e] < 0) S.lit[e] = 0;
    S.visited.add(e);
    Sound.tick();
    const T = LAY.night.track;
    ringFx(yearX(ERA_YEARS[e]), T.y, COL.good, 12);
    syncDom();
  }
  function releaseYear() {
    S.drag = false;
    if (!freeMode()) S.target = ERA_YEARS[nearestEra(S.target)];
    S.sp.stiffness = 170; S.sp.damping = 11;
    syncDom();
  }
  function setYearTarget(y, instant) {
    S.target = clamp(y, 1800, 2025);
    if (instant) { S.year = S.target; S.sp.value = S.target; S.sp.velocity = 0; }
  }
  function stepNight(dt) {
    S.sp.stiffness = S.drag ? 320 : S.sp.stiffness; S.sp.damping = S.drag ? 34 : S.sp.damping;
    S.sp.target = S.target;
    S.year = S.sp.update(dt);
    const fr = yearToF(S.year), e = nearestEra(S.year), d = Math.abs(S.year - ERA_YEARS[e]);
    if (!S.drag && d < 1.2 && Math.abs(S.sp.velocity) < 14 && Math.abs(S.target - S.year) < 1.5) { if (S.arrived !== e) arriveEra(e); }
    else if (d > 4 && S.arrived >= 0) { S.arrived = -1; syncDom(); }
    for (let i = 0; i < 5; i++) {
      const a = eraAlpha(fr, i);
      if (S.arrived === i) S.lit[i] += dt;
      else if (a < 0.02) S.lit[i] = -1;
    }
    // 통계 값: 시대 사이를 매끄럽게 따라간다
    S.stat.pop = approachV(S.stat.pop, eraMix(fr, 'pop'), dt, 7);
    S.stat.life = approachV(S.stat.life, eraMix(fr, 'life'), dt, 7);
    for (let i = 0; i < 9; i++) {
      const want = clamp(S.stat.pop / 10 - i, 0, 1);
      const was = S.icons[i];
      S.icons[i] = want > 0.02 || was > 0.02 ? approachV(was, want > 0.02 ? 1 : 0, dt, 14) : 0;
      if (was < 0.05 && S.icons[i] >= 0.05) S.iconT[i] = nowS();   // 톡! 하고 나타남
    }
    const slider = $('#sYear');
    if (slider && !S.sliderDrag) { const v = Math.round(S.year); if (+slider.value !== v) { slider.value = v; slider.style.setProperty('--pct', ((v - 1800) / 225 * 100) + '%'); } }
  }
  const nightTop = () => eraMixCol(yearToF(S.year), (e) => e.sky[0]);
  function drawNightWorld(t) {
    const g = WG, fr = yearToF(S.year), R = g.rect;
    ctx.save();
    ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    ctx.translate(R.x - g.ox * g.s, R.y); ctx.scale(g.s, g.s);
    // 가로로 잘리는 바깥도 칠한다(세로형)
    ctx.fillStyle = SKY; ctx.fillRect(-200, 0, 1200, g.H);
    paintSky(fr, t, g);
    const near = nearestEra(S.year);
    for (let e = 0; e < 5; e++) { const a = eraAlpha(fr, e); if (a > 0.005) paintFar(e, { a, f: fr }, g); }
    // 길: 가까운 시대의 길을 깔고, 이웃 시대의 길은 그 위에 서서히
    paintRoad(near, g);
    for (let e = 0; e < 5; e++) { if (e === near) continue; const a = eraAlpha(fr, e); if (a > 0.01) { ctx.save(); ctx.globalAlpha = a; paintRoad(e, g); ctx.restore(); } }
    for (let e = 0; e < 5; e++) {
      const a = eraAlpha(fr, e);
      if (a <= 0.005) { S.hot[e] = {}; continue; }
      const k = { a, f: fr, t, settle: S.lit[e], rise: fr < e ? 40 : 12 };
      ctx.save();
      S.hot[e] = PAINT_ERA[e](k) || {};
      ctx.restore();
    }
    ctx.restore();
  }
  const approachV = (cur, target, dt, rate) => target + (cur - target) * Math.exp(-rate * dt);

  function drawPin(cx, cy, e, h, t, done, a) {
    const bob = RM ? 0 : Math.sin(t * 2.4 + e) * 2.2;
    const tapK = S.hotTap[e + h.id] ? clamp((nowS() - S.hotTap[e + h.id]) / 0.35, 0, 1) : 1;
    const sc = (done && tapK < 1 && !RM ? 1 + 0.15 * Math.sin(tapK * Math.PI) : 1) * (S.hover === 'hot' + e + h.id ? 1.08 : 1);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy - 34 + bob); ctx.scale(sc, sc);
    softShadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(-6, 13); ctx.lineTo(0, 22); ctx.lineTo(6, 13); ctx.fill(); }, 8, 3, 'rgba(0,0,0,.4)');
    ctx.strokeStyle = done ? '#14a058' : '#cfd6e0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.stroke();
    ctx.font = f(18, 400); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1b2333'; ctx.fillText(h.icon, 0, 1);
    if (done) D.check(11, -12, 7, 1);
    ctx.restore();
    // 4초마다 반짝
    if (!done && !RM) { const ph = (t + e * 0.9 + h.id.length) % 4; if (ph < 0.9) D.spark(cx + 14, cy - 56 + bob, 6 + 5 * Math.sin((ph / 0.9) * Math.PI), t, '#fff6c2'); }
  }
  function nightHotspots() {   // 지금 도착한 시대의 핫스폿(화면 좌표)
    const e = S.arrived;
    if (e < 0 || S.drag) return [];
    const pos = S.hot[e] || {};
    return ERAS[e].hot.map((h) => {
      const p = pos[h.id];
      if (!p) return null;
      const c = worldToCanvas(p.x, p.y);
      return { e, h, x: c.x, y: c.y, r: 34 * Math.max(0.8, WG.s), key: e + h.id };
    }).filter(Boolean);
  }
  function drawStats(P, t) {
    softShadow(() => { ctx.fillStyle = 'rgba(255,255,255,.93)'; rr(P.x, P.y, P.w, P.h, 14); ctx.fill(); }, 12, 4, 'rgba(0,0,0,.35)');
    const wide = P.wide, ix = P.x + 14;
    // 세계 인구: 사람 아이콘 1개 = 10억 명
    const popR = wide ? P.x + P.w / 2 - 14 : P.x + P.w - 12;
    txt('🌍 세계 인구', ix, P.y + 21, f(14, 800), '#1b2333', 'left');
    txt('1칸 = 10억 명', popR, P.y + 21, f(12.5, 700), COL.muted, 'right');
    const iw = wide ? 22 : 21, iy = P.y + 54;
    for (let i = 0; i < 9; i++) {
      const cx = ix + 8 + i * iw, v = S.icons[i];
      ctx.fillStyle = '#e6ebf3'; ctx.beginPath(); ctx.arc(cx, iy - 6, 4.6, 0, TAU); ctx.fill(); rr(cx - 6, iy - 0.5, 12, 14, 5); ctx.fill();
      if (v > 0.02) {
        const born = RM ? 1 : clamp((nowS() - S.iconT[i]) / 0.32, 0, 1), sc = (RM ? 1 : EASE.outBack(born)) * (0.55 + 0.45 * v);
        const frac = clamp(S.stat.pop / 10 - i, 0, 1);
        ctx.save(); ctx.translate(cx, iy + 6); ctx.scale(sc, sc); ctx.translate(-cx, -(iy + 6));
        ctx.beginPath(); ctx.rect(cx - 10, iy - 14, 20 * Math.max(0.3, frac), 34); ctx.clip();
        ctx.fillStyle = '#3867f4';
        ctx.beginPath(); ctx.arc(cx, iy - 6, 4.6, 0, TAU); ctx.fill(); rr(cx - 6, iy - 0.5, 12, 14, 5); ctx.fill();
        ctx.restore();
      }
    }
    txt('약 ' + Math.round(S.stat.pop) + '억 명', wide ? popR : ix, wide ? P.y + 92 : P.y + 92, fm(wide ? 18 : 17), '#1d4ed8', wide ? 'right' : 'left');
    // 평균 기대 수명: 0~80세 막대
    const lx = wide ? P.x + P.w / 2 + 14 : ix, lw = wide ? P.w / 2 - 28 : P.w - 28, ly = wide ? P.y + 52 : P.y + 122;
    txt('❤️ 평균 기대 수명', lx, wide ? P.y + 21 : P.y + 111, f(14, 800), '#1b2333', 'left');
    const life = S.stat.life;
    txt('약 ' + Math.round(life) + '세', lx + lw, wide ? P.y + 21 : P.y + 111, fm(15), '#b91c1c', 'right');
    ctx.fillStyle = '#e6ebf3'; rr(lx, ly, lw, 12, 6); ctx.fill();
    const fg = ctx.createLinearGradient(lx, 0, lx + lw, 0); fg.addColorStop(0, '#7be0a8'); fg.addColorStop(1, '#14a058');
    ctx.fillStyle = fg; rr(lx, ly, Math.max(12, lw * clamp(life / 80, 0, 1)), 12, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(30,40,60,.35)'; ctx.lineWidth = 1;
    [0, 20, 40, 60, 80].forEach((v) => { const x = lx + lw * (v / 80); ctx.beginPath(); ctx.moveTo(x, ly + 12); ctx.lineTo(x, ly + 16); ctx.stroke(); });
    txt('0', lx, ly + 24, f(11.5, 700), COL.muted, 'left'); txt('80세', lx + lw, ly + 24, f(11.5, 700), COL.muted, 'right');
    void t;
  }
  function drawTimeline(t) {
    const N = LAY.night, B = N.bar, T = N.track;
    ctx.fillStyle = nightTop(); ctx.fillRect(B.x, B.y, B.w, B.h + 2);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(B.x, B.y, B.w, B.h + 2);
    ctx.fillStyle = 'rgba(160,180,230,.18)'; ctx.fillRect(B.x, B.y, B.w, 1.5);
    const hx = yearX(S.year), cur = S.arrived;
    // 트랙
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#27315a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(T.x0, T.y); ctx.lineTo(T.x1, T.y); ctx.stroke();
    const pg = ctx.createLinearGradient(T.x0, 0, T.x1, 0); pg.addColorStop(0, '#6f8cff'); pg.addColorStop(1, '#9fd0ff');
    ctx.strokeStyle = pg; ctx.beginPath(); ctx.moveTo(T.x0, T.y); ctx.lineTo(hx, T.y); ctx.stroke();
    // 시대 눈금
    ERAS.forEach((E, i) => {
      const x = yearX(E.year), seen = S.visited.has(i), now = cur === i;
      if (E.name) txt(E.name, x, T.names, f(12.5, 800), now ? '#ffffff' : '#93a4cc');
      if (seen) { ctx.fillStyle = '#14a058'; ctx.beginPath(); ctx.arc(x, T.y, 8, 0, TAU); ctx.fill(); D.check(x, T.y, 7.5, 1); }
      else { ctx.fillStyle = '#0b1030'; ctx.strokeStyle = '#7f93c7'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, T.y, 7, 0, TAU); ctx.fill(); ctx.stroke(); }
      txt(E.label, x, T.years, f(13, 700), now ? '#ffffff' : '#7f93c7');
    });
    // 아직 안 가 본 시대: 손잡이를 끌라는 안내(첫 시대 도착 직후)
    if (level() === 0 && game && game.phase === 'active' && S.visited.size < 5 && !S.drag && !RM) {
      const nxt = [0, 1, 2, 3, 4].find((i) => !S.visited.has(i));
      if (nxt != null) D.ring(yearX(ERA_YEARS[nxt]), T.y, 13, t, { color: '#9fd0ff', width: 2 });
    }
    // 손잡이: 알약
    const lift = S.drag ? 1 : 0;
    ctx.save(); ctx.translate(hx, T.y); const sc = S.drag ? 1.08 : (S.hover === 'handle' ? 1.04 : 1); ctx.scale(sc, sc);
    softShadow(() => { ctx.fillStyle = '#ffffff'; rr(-32, -15, 64, 30, 15); ctx.fill(); }, 8 + lift * 8, 3 + lift * 4, 'rgba(0,0,0,.5)');
    ctx.strokeStyle = '#6f8cff'; ctx.lineWidth = 3; rr(-32, -15, 64, 30, 15); ctx.stroke();
    txt(Math.round(S.year) + '년', 0, 1, f(15, 800), '#1b2333');
    ctx.restore();
    if (isNew('timeline')) newRing(B.x + 40, B.y + 10, B.w - 80, B.h - 14);
  }
  function drawNightUI(t) {
    const N = LAY.night, fe = yearToF(S.year);
    if (has('stats')) { ctx.save(); drawStats(N.stats, t); ctx.restore(); if (isNew('stats')) newRing(N.stats.x, N.stats.y, N.stats.w, N.stats.h); }
    // 시대 이름표
    const e = nearestEra(S.year), E = ERAS[e];
    const near = Math.abs(fe - e) < 0.35;
    ctx.save(); ctx.globalAlpha = near ? 1 : 0.55;
    pill(N.label.x, N.label.y, Math.round(S.year) + '년' + (E.name ? ' · ' + E.name : ''), { bg: 'rgba(8,12,34,.78)', size: 16, h: 32, border: 'rgba(160,180,230,.35)', bw: 1.5 });
    ctx.restore();
    // 핫스폿 핀
    if (!S.trans) nightHotspots().forEach((s) => { drawPin(s.x, s.y, s.e, s.h, t, S.erasTapped.has(s.e) && S.hotTap[s.key] != null, near ? 1 : 0.4); });
    drawTimeline(t);
  }
  function nightDown(p) {
    const N = LAY.night, B = N.bar;
    if (p.y >= B.y - 10 && has('timeline')) {
      S.drag = true; S.sp.stiffness = 320; S.sp.damping = 34;
      setYearTarget(xToYear(p.x));
      Sound.click();
      return true;
    }
    for (const s of nightHotspots()) {
      if (Math.hypot(p.x - s.x, p.y - 8 - s.y + 34) < s.r + 8 || Math.hypot(p.x - s.x, p.y - s.y) < s.r) {
        const first = !S.hotTap[s.key];
        S.hotTap[s.key] = nowS();
        S.erasTapped.add(s.e);
        bubble(s.x, s.y - 52, s.h.icon + ' ' + s.h.name + '\n' + s.h.text, { kind: 'info', tag: 'hot', dur: 3, maxW: 270 });
        ringFx(s.x, s.y - 34, COL.good, 16); if (first) sparkle(s.x, s.y - 34, 10);
        Sound.tick();
        syncDom();
        return false;
      }
    }
    return false;
  }
  function nightMove(p) { if (S.drag) setYearTarget(xToYear(p.x)); }
  function nightUp() { if (S.drag) releaseYear(); }
  function nightHover(p) {
    S.hover = null;
    const B = LAY.night.bar;
    if (p.y >= B.y - 10 && has('timeline')) { S.hover = 'handle'; return 'ew-resize'; }
    for (const s of nightHotspots()) if (Math.hypot(p.x - s.x, p.y - s.y + 34) < s.r + 8) { S.hover = 'hot' + s.key; return 'pointer'; }
    return null;
  }

  /* ---- (임시) 아직 만들지 않은 장면 ---- */
  function drawChain() { ctx.fillStyle = '#e8eef6'; ctx.fillRect(0, 0, LAY.W, LAY.H); }
  function drawTwoface() { ctx.fillStyle = '#f4efe6'; ctx.fillRect(0, 0, LAY.W, LAY.H); }
  function drawFields() { ctx.fillStyle = '#edf3ef'; ctx.fillRect(0, 0, LAY.W, LAY.H); }
  function drawPhone() { ctx.fillStyle = '#e7edf6'; ctx.fillRect(0, 0, LAY.W, LAY.H); }
  const chainDown = () => false, tfDown = () => false, fieldsDown = () => false, phoneDown = () => false;
  const fieldsMove = () => {}, fieldsUp = () => {}, fieldsHover = () => null, phoneHover = () => null, fieldsGrabbable = () => false;
  const relayoutChain = () => {}, relayoutTf = () => {}, relayoutFields = () => {}, relayoutPhone = () => {};
  const chainRowDone = () => false, chainSlot = () => false, resetChain = () => {}, ensureChain = () => {}, resetTf = () => {}, ensureTf = () => {}, tfCount = () => 0;
  const resetFields = () => {}, fieldsLinked = () => 0, resetPhone = () => {}, ensurePhone = () => {}, phoneFound = () => 0, togglePhone = () => {};
  function resetScene() {}

  /* =========================================================
     장면 전환 · 그리기 · 입력 · DOM
     ========================================================= */
  const SCENE_NAME = { night: '🌃 시간 여행 <small>· 우리 동네의 밤</small>', chain: '🔗 발견의 사슬 <small>· 원리 → 기술·기기 → 생활의 변화</small>', twoface: '🪙 과학기술의 두 얼굴 <small>· 자동차</small>', fields: '🎨 과학과 다른 분야 <small>· 미술 · 음악 · 공학 · 수학</small>', phone: '📱 스마트폰 속 과학의 역사 <small>· 분해도와 발견 연표</small>' };
  function goScene(name, instant) {
    if (!SCENES.includes(name)) return;
    if (S.scene === name && !S.trans) { syncDom(); return; }
    const from = S.scene;
    FX.bubbles = [];
    if (instant || !S.booted || RM) { S.scene = name; S.trans = null; }
    else { S.trans = { from, to: name, t0: nowS(), dur: 0.8 }; S.scene = name; }
    syncDom();
  }
  /* 캔버스 위·아래 여백 색: 밤거리에서는 하늘 맨 위 색을 따라가고, 장면이 바뀌면 부드럽게 바뀐다 */
  function stageBg() {
    if (!view || !view.wrap) return;
    const w = view.wrap;
    const live = S.scene === 'night' && !S.trans;
    const want = S.scene === 'night' ? nightTop() : SCENE_BG[S.scene];
    const tr = live || !S.booted ? 'none' : 'background-color .8s ease';
    if (w._tr !== tr) { w.style.transition = tr; w._tr = tr; }
    if (w._bg !== want) { w.style.backgroundColor = want; w._bg = want; }
  }
  function stepTrans() {
    const T = S.trans;
    if (T && (nowS() - T.t0) / T.dur >= 1) { S.trans = null; syncDom(); }
  }
  const SCENE_DRAW = { night: (t) => drawNight(t), chain: (t) => drawChain(t), twoface: (t) => drawTwoface(t), fields: (t) => drawFields(t), phone: (t) => drawPhone(t) };
  function draw(t) {
    view.clear(SCENE_BG[S.scene] || SKY);
    const W = LAY.W, H = LAY.H;
    if (S.trans) {
      const p = EASE.inOutCubic(clamp((nowS() - S.trans.t0) / S.trans.dur, 0, 1));
      // 이전 장면: 왼쪽으로 조금 밀려나며 어두워진다
      ctx.save(); ctx.translate(-p * W * 0.3, 0); SCENE_DRAW[S.trans.from](t);
      ctx.fillStyle = 'rgba(10,15,40,' + (0.35 * p) + ')'; ctx.fillRect(0, 0, W, H); ctx.restore();
      // 새 장면: 오른쪽에서 책장을 넘기듯 들어오며 0.96→1배
      ctx.save();
      const sc = 0.96 + 0.04 * p, ox = (1 - p) * W;
      softShadow(() => { ctx.fillStyle = '#000'; ctx.fillRect(ox - 4, 0, 4, H); }, 24, 0, 'rgba(0,0,0,.45)');
      ctx.beginPath(); ctx.rect(ox, 0, W, H); ctx.clip();
      ctx.translate(ox + W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
      SCENE_DRAW[S.trans.to](t);
      ctx.restore();
    } else SCENE_DRAW[S.scene](t);
    drawFx();
  }
  function drawNight(t) {
    ctx.fillStyle = SKY; ctx.fillRect(0, 0, LAY.W, LAY.H);
    drawNightWorld(t);
    drawNightUI(t);
  }

  /* ---- 입력 ---- */
  function activeDeck() {
    if (S.scene === 'chain') return S.sc.chain && S.sc.chain.deck;
    if (S.scene === 'twoface') return S.sc.tf && S.sc.tf.deck;
    if (S.scene === 'phone') return S.sc.ph && S.sc.ph.deck;
    return null;
  }
  function grabbableAt(p) {
    if (S.scene === 'night') return p.y >= LAY.night.bar.y - 10 && has('timeline');
    if (S.scene === 'fields') return fieldsGrabbable(p);
    const d = activeDeck();
    return !!(d && d.hit(p));
  }
  const handlers = {
    down(p) {
      if (S.trans) return false;
      if (S.scene === 'night') return nightDown(p);
      if (S.scene === 'chain') return chainDown(p);
      if (S.scene === 'twoface') return tfDown(p);
      if (S.scene === 'fields') return fieldsDown(p);
      if (S.scene === 'phone') return phoneDown(p);
      return false;
    },
    move(p) {
      if (S.scene === 'night') nightMove(p);
      else if (S.scene === 'fields') fieldsMove(p);
      else { const d = activeDeck(); if (d) d.move(p); }
    },
    up(p) {
      if (S.scene === 'night') nightUp(p);
      else if (S.scene === 'fields') fieldsUp(p);
      else { const d = activeDeck(); if (d) d.up(p); }
    },
    hover(p) {
      S.hover = null;
      if (S.trans) return null;
      if (S.scene === 'night') return nightHover(p);
      if (S.scene === 'fields') return fieldsHover(p);
      const d = activeDeck();
      if (d && d.hit(p)) return 'grab';
      if (S.scene === 'phone') return phoneHover(p);
      return null;
    },
  };
  function relayout() {
    worldGeom();
    relayoutChain(); relayoutTf(); relayoutFields(); relayoutPhone();
  }

  /* ---- DOM: 조작 카드 · 장면 이름 ---- */
  const hintEl = $('#stageHint');
  function hint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(hint.t); hint.t = setTimeout(hideHint, ms || 5000);
  }
  function hideHint() { hintEl.classList.add('hide'); }
  const sYear = $('#sYear'), oYear = $('#oYear'), yearNote = $('#yearNote');
  const btnPhone = $('#phoneBtn'), btnReset = $('#resetBtn'), ctrlNote = $('#ctrlNote');
  const seg = $('#sceneSeg');
  sYear.addEventListener('pointerdown', () => { S.sliderDrag = true; });
  const endSlide = () => { if (S.sliderDrag) { S.sliderDrag = false; releaseYear(); } };
  sYear.addEventListener('pointerup', endSlide); sYear.addEventListener('pointercancel', endSlide);
  sYear.addEventListener('change', () => { S.sliderDrag = false; releaseYear(); });
  sYear.addEventListener('input', () => {
    if (S.trans) return;
    S.drag = true; S.sp.stiffness = 320; S.sp.damping = 34;
    setYearTarget(+sYear.value);
    sYear.style.setProperty('--pct', ((+sYear.value - 1800) / 225 * 100) + '%');
    if (!S.sliderDrag) { clearTimeout(sYear._t); sYear._t = setTimeout(releaseYear, 350); }   // 키보드 조작
  });
  btnPhone.addEventListener('click', () => { Sound.click(); togglePhone(); });
  btnReset.addEventListener('click', () => { Sound.click(); resetScene(S.scene); });
  seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { Sound.click(); goScene(b.dataset.scene); }));
  const mark = (b) => (b ? '✅' : '⬜');
  function syncDom() {
    if (!LAY) return;
    const free = freeMode(), sc = S.scene;
    const yearOn = sc === 'night' && has('timeline');
    const phoneOn = sc === 'phone' && has('phone');
    const resetOn = free && sc !== 'night';
    $('#yearCtl').hidden = !yearOn;
    btnPhone.hidden = !phoneOn;
    btnReset.hidden = !resetOn;
    $('#ctrlCard').hidden = !(yearOn || phoneOn || resetOn);
    const phs = S.sc.ph;
    btnPhone.textContent = phs && phs.exploded ? '📦 조립하기' : '📱 분해하기';
    btnPhone.classList.toggle('btn-primary', !(phs && phs.exploded));
    oYear.textContent = Math.round(S.year) + '년';
    const e = nearestEra(S.year);
    yearNote.textContent = S.arrived >= 0 ? ERAS[S.arrived].name + ' · 반짝이는 물건을 눌러 보세요' : '손잡이를 놓으면 가장 가까운 시대에 딱 붙어요';
    ctrlNote.textContent = phoneOn ? (phs && phs.exploded ? '아래 연표의 발견 카드를 부품 위에 끌어 놓아요' : '먼저 📱 분해하기를 눌러요') : '';
    void e;
    const lab = $('#sceneLabel');
    const ltxt = SCENE_NAME[sc];
    if (lab.innerHTML !== ltxt) lab.innerHTML = ltxt;
    seg.hidden = !free;
    seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
  }

  /* =========================================================
     미션 (4 STEP · 10개)
     ========================================================= */
  const M1_1 = {
    title: '다섯 시대 여행하기',
    goal: '연도 손잡이를 끌어 다섯 시대(1800 · 1900 · 1970 · 2000 · 2025년)에 모두 들르고, 시대마다 반짝이는 물건을 하나 이상 눌러 보세요.',
    hint: '손잡이를 놓으면 가장 가까운 시대에 딱 붙어요. 반짝이는 물건을 눌러 보세요.',
    setup() { goScene('night'); resetNight(); hint('🕰️ 아래 연도 손잡이를 끌어 1800년부터 오늘까지 여행해요', 6500); },
    check: () => S.visited.size === 5 && S.erasTapped.size === 5,
    hold: 0,
    status: () => '들른 시대 <b>' + S.visited.size + '/5</b> · 물건을 살펴본 시대 <b>' + S.erasTapped.size + '/5</b>',
    explain: '200여 년 사이에 밤을 밝히는 빛(호롱불 → 전등 → LED), 이동 수단(소달구지 → 전차·버스 → 전기차), 소식을 전하는 방법(편지 → 텔레비전·전화 → 스마트폰)이 크게 달라졌어요. 세계 인구는 약 10억 명에서 80억 명 넘게, 평균 기대 수명은 약 29세에서 73세로 늘었어요. 그런데 밤하늘의 별은 점점 보이지 않게 되었어요. 왜 그런지 3단계에서 생각해 봐요.',
  };
  const M1_2 = {
    type: 'quiz',
    title: '무엇이 생활을 바꾸었을까?',
    setup() { goScene('night'); },
    goal: '200여 년 동안 생활이 이렇게 크게 달라진 가장 중요한 까닭은?',
    choices: ['사람의 몸과 두뇌가 크게 진화했기 때문', '자연환경이 저절로 살기 편하게 바뀌었기 때문', '과학 원리가 발견되고, 이를 이용한 기술이 발달하고 새로운 기기가 발명되었기 때문', '옛날 사람들은 궁금해하거나 탐구하지 않았기 때문'],
    answer: 2,
    feedback: ['200여 년은 생물이 크게 진화하기에는 아주 짧은 시간이에요.', '자연이 아니라 사람이 만든 기술과 기기가 달라졌어요.', '', '옛날 사람들도 끊임없이 탐구했어요. 그 지식이 쌓여 오늘의 기술이 되었어요.'],
    explain: '과학자들이 탐구로 발견한 <b>과학 원리</b>가 <b>기술의 발달</b>과 <b>기기의 발명</b>으로 이어져 인류의 생활, 곧 <b>문명</b>을 바꾸었어요.',
  };
  const M2_1 = {
    title: '첫 번째 사슬 잇기',
    goal: '♨️ 증기의 원리에서 시작하는 첫 줄을 완성하세요. 보관함에서 알맞은 <b>기술·기기</b> 카드와 <b>생활의 변화</b> 카드를 끌어 놓으세요.',
    hint: '증기의 힘으로 움직이는 기계는? 그 기계 덕분에 생긴 공장과 기차를 찾아보세요.',
    setup() { goScene('chain'); resetChain([0]); hint('보관함의 카드를 끌어 빈칸에 놓아요', 5000); },
    check: () => chainRowDone(0),
    hold: 0,
    status: () => '기술·기기 카드 ' + mark(chainSlot(0, 1)) + ' · 생활의 변화 카드 ' + mark(chainSlot(0, 2)),
    explain: '수증기가 물체를 밀어내는 원리를 이용한 증기 기관이 쓰이면서 공장과 기차가 생겨 생활이 크게 바뀌었어요. 이것을 <b>산업 혁명</b>이라고 해요(18세기 후반부터).',
  };
  const M2_2 = {
    title: '나머지 사슬 잇기',
    goal: '남은 세 줄도 원리 → 기술·기기 → 생활의 변화 순서로 완성하세요.',
    hint: '원리 카드의 그림(🦠 🧲 🔍)과 연결되는 기기를 먼저 찾아보세요.',
    setup() { goScene('chain'); ensureChain([0], [0, 1, 2, 3]); hideHint(); },
    check: () => [1, 2, 3].every(chainRowDone),
    hold: 0,
    status: () => '완성한 사슬 <b>' + [0, 1, 2, 3].filter(chainRowDone).length + '/4</b>',
    explain: '과학 원리의 발견이 기술과 기기를 낳고, 그 기술이 생활과 문화를 바꾸었어요. 특히 망원경과 현미경은 사람들이 우주와 생명을 바라보는 생각까지 바꾸었어요.',
  };
  const M2_3 = {
    type: 'quiz',
    title: '과학과 기술의 관계',
    setup() { goScene('chain'); ensureChain([0, 1, 2, 3], [0, 1, 2, 3]); },
    goal: '망원경이 발명된 뒤 천체를 자세히 관측하게 되어 천문학이 크게 발전했어요. 이 사례에서 알 수 있는 과학과 기술의 관계는?',
    figure: '<div class="fig-big">🔍 → 🔭 → 🌌 → 🔬</div>',
    choices: ['과학과 기술은 서로 관계가 없다', '기술은 과학이 모두 끝난 뒤에만 만들어진다', '과학은 도구 없이도 언제나 혼자 발전한다', '과학 지식이 기술을 발달시키고, 발달한 기술은 다시 새로운 과학 발견을 돕는다'],
    answer: 3,
    feedback: ['렌즈의 원리(과학)로 망원경(기술)을 만들었어요. 관계가 깊어요.', '망원경으로 새 발견을 하며 과학이 계속 발전했어요.', '망원경과 현미경 같은 도구 없이는 볼 수 없는 것이 많아요.', ''],
    explain: '과학과 기술은 서로 <b>영향을 주고받으며</b> 함께 발전해요. 현미경으로 세포와 미생물을 발견했고, 이 지식이 다시 백신과 항생제 같은 의료 기술로 이어졌어요.',
  };
  const M3_1 = {
    title: '자동차의 두 얼굴',
    goal: '자동차가 가져온 변화 카드 4장을 😊 편리해진 점과 😟 새로 생긴 문제로 나누어 놓으세요.',
    hint: '“이것 덕분에 생활이 편해졌나?”, “이것 때문에 사람과 환경이 피해를 입나?”를 생각해 보세요.',
    setup() { goScene('twoface'); resetTf(); hint('카드를 끌어 알맞은 상자에 넣어요', 5000); },
    check: () => tfCount() === 4,
    hold: 0,
    status: () => '나눈 카드 <b>' + tfCount() + '/4</b>',
    explain: '자동차는 이동을 편리하게 했지만 공기 오염과 교통사고 같은 문제도 만들었어요. 과학기술의 영향에는 <b>좋은 점과 문제점이 함께</b> 있어요. 1단계에서 밤하늘의 별이 사라진 것(빛 공해)도 밝은 밤의 또 다른 얼굴이에요.',
  };
  const M3_2 = {
    type: 'quiz',
    title: '새로 생긴 문제와 과학',
    setup() { goScene('twoface'); ensureTf(); },
    goal: '플라스틱은 가볍고 값싸 생활을 편리하게 했지만, 잘 썩지 않아 쓰레기 문제가 생겼어요. 가장 알맞은 생각은?',
    figure: '<div class="fig-big">🧴 ↔ 🗑️</div>',
    choices: ['과학기술에는 좋은 점만 있으니 걱정할 필요가 없다', '과학기술은 문제만 만들므로 모든 과학기술을 없애야 한다', '문제점을 줄이는 기술(재활용, 썩는 플라스틱)을 개발하고 올바르게 이용하는 방법을 함께 찾아야 한다', '플라스틱 쓰레기 문제는 과학과 관계가 없다'],
    answer: 2,
    feedback: ['플라스틱 쓰레기처럼 새로운 문제가 생겼어요.', '생명을 지킨 의료 기술처럼 과학기술 덕분에 얻은 것도 많아요. 한쪽만 보면 안 돼요.', '', '문제를 정확히 알고 해결하는 데에도 과학이 필요해요.'],
    explain: '과학기술이 만든 문제를 해결하는 데에도 과학이 쓰여요. 과학기술을 어떻게 이용할지 함께 판단하는 것이 중요해요.',
  };
  const M3_3 = {
    title: '과학과 다른 분야 잇기',
    goal: '왼쪽 과학 원리 카드의 고리를 끌어 알맞은 분야 사례 카드에 이으세요. (카드를 차례로 눌러도 이어져요)',
    hint: '미술은 ‘보이는 크기’, 음악은 ‘소리’, 건축은 ‘무거운 돌’, 수학은 ‘기록과 비교’를 떠올려 보세요.',
    setup() { goScene('fields'); resetFields(); hint('왼쪽 카드의 ⭕ 고리를 오른쪽 카드로 끌어요', 5500); },
    check: () => fieldsLinked() === 4,
    hold: 0,
    status: () => '이은 짝 <b>' + fieldsLinked() + '/4</b>',
    explain: '과학의 원리는 미술, 음악, 공학, 수학 등 여러 분야와 연결되어 문화와 문명을 발전시켰어요. 우리 선조들도 측우기와 거중기처럼 과학 원리를 생활에 활용했어요.',
  };
  const M4_1 = {
    title: '스마트폰 속 발견 찾기',
    goal: '[📱 분해하기]를 누른 뒤, 아래 연표의 발견 카드를 스마트폰의 알맞은 부품으로 끌어 놓으세요(4개).',
    hint: '사진을 찍는 부분에는 빛을 모으는 렌즈가, 전기를 저장하는 부분에는 전지가 들어 있어요.',
    setup() { goScene('phone'); resetPhone(); hint('먼저 📱 분해하기를 눌러 스마트폰 속을 들여다봐요', 6000); },
    check: () => phoneFound() === 4,
    hold: 0,
    status: () => (S.sc.ph && S.sc.ph.exploded ? '' : '⬜ 먼저 <b>📱 분해하기</b>를 눌러요 · ') + '찾은 발견 <b>' + phoneFound() + '/4</b>',
    explain: '스마트폰 한 대에도 17세기 렌즈, 1800년 전지, 1888년 전파, 1947년 트랜지스터 등 수백 년 동안의 발견이 함께 들어 있어요.',
  };
  const M4_2 = {
    type: 'quiz',
    title: '과학 지식은 쌓인다',
    setup() { goScene('phone'); ensurePhone(); },
    goal: '스마트폰 같은 오늘날의 기기는 어떻게 만들어졌을까요?',
    choices: ['한 명의 천재 발명가가 혼자서 한 번에 만들었다', '수백 년 동안 많은 과학자와 기술자가 탐구로 쌓아 온 지식과 기술이 합쳐져 만들어졌다', '최근 몇 년 동안 알게 된 지식만으로 만들었다', '과학과 관계없이 모양만 새롭게 디자인해 만들었다'],
    answer: 1,
    feedback: ['스마트폰에는 여러 시대, 여러 사람의 발견이 들어 있어요.', '', '연표를 보세요. 17세기의 렌즈부터 쓰이고 있어요.', '렌즈, 전지, 반도체 모두 과학 원리를 이용한 부품이에요.'],
    explain: '과학 지식과 탐구 방법은 오랜 시간 <b>쌓이고 이어지며</b> 새로운 기술을 낳아요. 오늘날의 첨단 과학기술도 이렇게 만들어졌어요. 다음 차시에서는 첨단 과학기술이 바꿀 미래 사회를 조사해 봐요.',
  };

  /* 무대·표를 먼저 준비한 뒤 게임을 시작해야 단계 소개의 setup()이 장면을 옮길 수 있다 */
  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }
  syncDom();
  setTimeout(() => { S.booted = true; }, 300);

  game = SciSim.game({
    simId: 'm1-science-civilization',
    mount: '#game',
    badge: '문명 탐험가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      timeline: '🕰️ 연도 손잡이 (1800~2025년)',
      stats: '📊 세계 인구 · 평균 기대 수명',
      chains: '🔗 발견의 사슬 판',
      twoface: '🪙 과학기술의 두 얼굴 보드',
      fields: '🎨 과학과 다른 분야 잇기',
      phone: '📱 스마트폰 분해도 · 발견 연표',
    },
    onFeatures(set) {
      F = new Set(set);
      syncDom();
    },
    onMissionStart() { FX.bubbles = []; },
    onComplete() { syncDom(); },
    levels: [
      {
        title: '시간 여행: 우리 동네의 밤', short: '시간 여행', icon: '🕰️', phase: '관찰',
        features: ['timeline', 'stats'],
        intro: '<p class="si-q">❓ 탐구 질문: 200여 년 전 사람들의 밤은 어땠을까? 무엇이 우리의 생활을 이렇게 바꾸었을까?</p>' +
          '<p>🕰️ 연도 손잡이를 움직여 1800년부터 오늘까지 같은 동네의 밤거리를 여행하며, 무엇이 달라졌는지 <b>관찰</b>해 봐요.</p>',
        setup() { goScene('night'); },
        recap: '과학 원리의 발견과 기술 발달, 기기 발명으로 빛·이동·통신·건강 등 인류의 생활이 크게 달라졌어요.',
        summary: '<p>200여 년 동안 밤을 밝히는 빛, 이동 수단, 통신 방법이 크게 달라졌고 세계 인구(약 10억 → 80억 명 이상)와 평균 기대 수명(약 29세 → 73세)이 늘었다.</p>' +
          '<p>이 변화는 <b>과학 원리의 발견 → 기술 발달·기기 발명</b>으로 이루어졌다.</p>',
        missions: [M1_1, M1_2],
      },
      {
        title: '발견의 사슬 잇기', short: '발견 사슬', icon: '🔗', phase: '탐구',
        features: ['chains'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 과학의 발전으로 생활이 크게 달라진 것을 관찰했어요.</div>' +
          '<p>과학 원리의 발견이 어떤 기술과 기기로 이어져 생활을 바꾸었는지 <b>원리 → 기술·기기 → 생활의 변화</b> 사슬로 이어 봐요.</p>',
        setup() { goScene('chain'); },
        recap: '과학 원리의 발견 → 기술 발달·기기 발명 → 생활(문명)의 변화가 사슬처럼 이어지며, 과학과 기술은 서로 도우며 발전해요.',
        summary: '<ul><li>수증기의 힘 → 증기 기관 → 산업 혁명(공장, 기차)</li><li>미생물이 병을 일으킴 → 백신·항생제 → 평균 수명 증가</li><li>자석과 코일로 전기 생산 → 발전기·전구 → 밝은 밤, 전기 제품</li><li>렌즈(빛의 굴절) → 망원경·현미경 → 우주관 변화, 세포 발견</li></ul>' +
          '<p>과학과 기술은 서로 영향을 주고받으며 발전한다.</p>',
        missions: [M2_1, M2_2, M2_3],
      },
      {
        title: '과학이 사회에 미친 영향', short: '영향 분석', icon: '⚖️', phase: '분석',
        features: ['twoface', 'fields'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 과학의 발견이 기술을 거쳐 생활을 바꾼 사슬을 이었어요.</div>' +
          '<p>과학기술이 가져온 변화는 모두 좋기만 했을까요? 과학이 사회에 미친 영향을 <b>좋은 점과 문제점</b>으로 나누어 보고, 과학이 <b>다른 분야</b>와 어떻게 연결되는지 알아봐요.</p>',
        setup() { goScene('twoface'); },
        recap: '과학기술은 생활을 편리하게 했지만 새로운 문제도 만들었고, 과학의 원리는 기술·공학·예술·수학 등 다양한 분야와 연결되어 있어요.',
        summary: '<ul><li>과학기술의 영향에는 <b>좋은 점과 문제점</b>이 함께 있다. 예) 자동차: 빠른 이동 ↔ 공기 오염·교통사고</li><li>과학기술이 만든 문제를 해결하는 데에도 과학이 쓰인다. 예) 재활용 기술, 썩는 플라스틱</li><li>과학 원리는 미술(원근법), 음악(현악기), 공학(거중기), 수학(측우기 기록) 등 다른 분야와 연결된다.</li></ul>',
        missions: [M3_1, M3_2, M3_3],
      },
      {
        title: '스마트폰 속 과학의 역사', short: '스마트폰', icon: '📱', phase: '적용',
        features: ['phone'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 과학이 사회와 여러 분야에 미친 영향을 살펴보았어요.</div>' +
          '<p>우리가 매일 쓰는 스마트폰에는 어떤 과학의 발견이 들어 있을까요? 스마트폰을 분해해 그 속에 숨은 <b>과학의 역사</b>를 찾아봐요.</p>',
        setup() { goScene('phone'); },
        recap: '스마트폰 속에는 수백 년 동안 쌓인 과학의 발견과 기술이 함께 들어 있어요.',
        summary: '<p>스마트폰 = 렌즈(17세기) + 전지(1800년) + 전파(1888년) + 트랜지스터(1947년) … 수백 년 동안의 과학 지식과 기술이 쌓여 만들어진 기기</p>' +
          '<p>과학 지식과 탐구 방법은 이어지고 쌓이며 인류 문명을 발전시킨다.</p>',
        missions: [M4_1, M4_2],
      },
    ],
  });

  /* =========================================================
     시작 · 상태 초기화 · 디버그 훅 · 루프
     ========================================================= */
  function resetNight() {
    S.visited = new Set(); S.erasTapped = new Set(); S.hotTap = {};
    S.drag = false; S.arrived = -1; S.lit = [-1, -1, -1, -1, -1];
    setYearTarget(1800);
    S.sp.stiffness = 170; S.sp.damping = 12;
    FX.bubbles = [];
  }
  function client(x, y) {
    const r = view.canvas.getBoundingClientRect();
    return { x: r.left + (x * r.width) / LAY.W, y: r.top + (y * r.height) / LAY.H };
  }
  window.__sim = {
    S, client,
    get kind() { return LAY.kind; },
    handle() { return client(yearX(S.year), LAY.night.track.y); },
    eraPoint(i) { return client(yearX(ERA_YEARS[i]), LAY.night.track.y); },
    hot(i, id) { const p = S.hot[i] && S.hot[i][id]; if (!p) return null; const c = worldToCanvas(p.x, p.y); return client(c.x, c.y - 34); },
    get busy() { return !!S.trans; },
  };

  let uiT = 0;
  SciSim.loop((dt, t) => {
    S.t = t;
    stepTrans();
    if (S.scene === 'night' || S.trans) stepNight(dt);
    updateFx(dt);
    stageBg();
    draw(t);
    uiT += dt;
    if (uiT > 0.2) { uiT = 0; syncDom(); }
  });
})();
