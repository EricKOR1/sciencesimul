/* =========================================================
   중1 Ⅰ. 과학과 인류의 지속가능한 삶 — 과학적 탐구 방법 [9과01-01]
   🔬 빨래 탐정의 공정한 실험
   ① [관찰] 문제·가설   : 집 안 빨래 관찰(1시간 타임랩스) → 탐구 문제 → 가설
   ② [탐구] 탐구 설계   : 공정한 실험 장치(변인 통제) → 변인 분류 → 두 조건을 함께 바꾸면?
   ③ [분석] 자료 해석   : 10분마다 측정·기록 → 표·그래프 → 결론 → 탐구 과정 순서도
   ④ [적용] 해결 방안   : 근거 있는 해결 방안 → 나의 탐구 계획서
   장면 = 가로로 이어 붙인 필름 띠: 🏠 집 · 🧪 실험대 · 📝 계획서 (카메라 이동)
   ※ 증발은 '물이 증발해 날아가 질량이 준다'는 현상 수준까지만 다룸(입자 운동 설명은 Ⅳ단원).
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

  /* =========================================================
     무대(캔버스) — 휴대폰(599px 이하)은 세로형 480×820으로 교체
     ========================================================= */
  const BG = '#f6efe4';
  const LAYOUTS = {
    wide: {
      kind: 'wide', W: 800, H: 520,
      home: {
        towel: { w: 116, h: 134 },
        zones: [
          { id: 'win', x: 0, y: 0, w: 440, h: 520, floorY: 404,
            win: { x: 34, y: 42, w: 268, h: 276 }, curtain: { x: 40, w: 86 },
            sun: [[100, 432], [330, 432], [414, 514], [168, 514]],
            thermo: { x: 346, y: 80 }, rack: { x: 204, barY: 176, footY: 474, half: 78 }, tag: { x: 204, y: 498 } },
          { id: 'corner', x: 440, y: 0, w: 360, h: 520, floorY: 404,
            thermo: { x: 296, y: 80 }, rack: { x: 178, barY: 176, footY: 474, half: 78 }, tag: { x: 178, y: 498 },
            corner: 344, clock: { x: 40, y: 92, r: 36 }, fan: { x: 48, y: 470, s: 0.62 } },
        ],
      },
      bench: {
        design: { x: 0, y: 0, s: 1 }, graph: { x: 6, y: 22, s: 0.55 },
        graphCard: { x: 452, y: 12, w: 338, h: 496 }, timer: { x: 10, y: 330, w: 432, h: 178 }, board: null,
      },
      sort: {
        title: { x: 400, y: 24 },
        boxes: { iv: { x: 14, y: 46, w: 248, h: 258 }, cv: { x: 276, y: 46, w: 248, h: 258 }, dv: { x: 538, y: 46, w: 248, h: 258 } },
        cw: 224, ch: 44, cols: { iv: 1, cv: 1, dv: 1 },
        tray: { x: 14, y: 316, w: 772, h: 196 },
        home: [[30, 338], [288, 338], [546, 338], [30, 410], [288, 410], [546, 410]],
      },
      flow: {
        title: { x: 400, y: 24 }, sw: 228, sh: 72,
        slots: [[24, 46], [286, 46], [548, 46], [548, 192], [286, 192], [24, 192]],
        tray: { x: 14, y: 290, w: 772, h: 222 },
        home: [[24, 312], [286, 312], [548, 312], [24, 410], [286, 410], [548, 410]],
        loopLabel: { x: 268, y: 157 },
      },
      plan: {
        tabs: { x: 16, y: 8, w: 146, h: 40, dx: 152 },
        paper: { x: 16, y: 56, w: 458, h: 456 }, headH: 64, rowY: 124, rowH: 54, labX: 30, labW: 96, slotX: 132, slotW: 330, slotH: 46,
        cand: { x: 490, y: 56, w: 300, h: 456 }, cardX: 498, cardW: 284, cardH: 70, cardY: 112, cardDY: 82, stampAt: { x: 330, y: 92 },
      },
    },
    tall: {
      kind: 'tall', W: 480, H: 820,
      home: {
        towel: { w: 112, h: 128 },
        zones: [
          { id: 'win', x: 0, y: 0, w: 480, h: 404, floorY: 302,
            win: { x: 22, y: 24, w: 214, h: 214 }, curtain: { x: 28, w: 70 },
            sun: [[56, 318], [240, 318], [306, 398], [118, 398]],
            thermo: { x: 262, y: 44 }, rack: { x: 368, barY: 104, footY: 380, half: 72 }, tag: { x: 368, y: 394 } },
          { id: 'corner', x: 0, y: 416, w: 480, h: 404, floorY: 302,
            thermo: { x: 186, y: 44 }, rack: { x: 336, barY: 104, footY: 380, half: 72 }, tag: { x: 336, y: 394 },
            corner: 464, clock: { x: 76, y: 84, r: 34 }, fan: { x: 200, y: 376, s: 0.6 } },
        ],
      },
      bench: {
        design: { x: 0, y: 6, s: 0.6 }, graph: { x: 0, y: 6, s: 0.6 },
        graphCard: { x: 10, y: 466, w: 460, h: 346 }, timer: { x: 10, y: 328, w: 460, h: 128 },
        board: { x: 10, y: 330, w: 460, h: 482 },
      },
      sort: {
        title: { x: 240, y: 22 },
        boxes: { iv: { x: 10, y: 42, w: 460, h: 108 }, cv: { x: 10, y: 158, w: 460, h: 160 }, dv: { x: 10, y: 326, w: 460, h: 108 } },
        cw: 214, ch: 44, cols: { iv: 1, cv: 2, dv: 1 },
        tray: { x: 10, y: 446, w: 460, h: 366 },
        home: [[14, 480], [250, 480], [14, 556], [250, 556], [14, 632], [250, 632]],
      },
      flow: {
        title: { x: 240, y: 22 }, sw: 206, sh: 72,
        slots: [[12, 46], [240, 46], [240, 156], [12, 156], [12, 266], [240, 266]],
        tray: { x: 8, y: 392, w: 464, h: 420 },
        home: [[12, 420], [240, 420], [12, 510], [240, 510], [12, 600], [240, 600]],
        loopLabel: { x: 226, y: 364 },
      },
      plan: {
        tabs: { x: 10, y: 6, w: 148, h: 40, dx: 154 },
        paper: { x: 8, y: 52, w: 464, h: 476 }, headH: 62, rowY: 120, rowH: 57, labX: 18, labW: 90, slotX: 112, slotW: 352, slotH: 49,
        cand: { x: 8, y: 540, w: 464, h: 272 }, cardX: 14, cardW: 452, cardH: 52, cardY: 574, cardDY: 59, stampAt: { x: 330, y: 92 },
      },
    },
  };

  const mq = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
  let view = null, ctx = null, D = null, LAY = null;
  let ctxMain = null, Dmain = null;
  const caches = new Map();
  const wrapCache = new Map();
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
    ctx = ctxMain = view.ctx; D = Dmain = SciSim.draw(ctx);
    SciSim.pointer(view, handlers);
    if (kind === 'tall') {
      // 휴대폰: 캔버스 위에서도 페이지를 세로로 밀 수 있게 하고, 카드를 잡았을 때만 스크롤을 막는다
      cv.style.touchAction = 'pan-y';
      cv.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1 || S.cam.moving) return;
        const d = activeDeck();
        if (d && d.hit(view.toLocal(e.touches[0]))) e.preventDefault();
      }, { passive: false });
    }
    wrapCache.clear();
    patterns = null;
    if (S.cam) { S.cam.x = SCENES.indexOf(S.scene) * LAY.W; S.cam.moving = false; }
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
  let patterns = null;
  function getPatterns() {
    if (patterns) return patterns;
    const mk = (size, paint) => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); paint(g); return ctx.createPattern(c, 'repeat'); };
    patterns = {
      weave: mk(6, (g) => { g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 1.5); g.lineTo(6, 1.5); g.moveTo(1.5, 0); g.lineTo(1.5, 6); g.stroke(); }),
      fluff: mk(8, (g) => { g.fillStyle = '#fff'; [[1, 2], [5, 1], [3, 5], [7, 6], [6, 3.5]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 0.9, 0, TAU); g.fill(); }); }),
    };
    return patterns;
  }

  /* =========================================================
     상태
     ========================================================= */
  const SCENES = ['home', 'bench', 'plan'];
  const DRY = { cotton: 20, micro: 30 };
  function newTowel(cloth, water, shape) {
    return { cloth, W0: water, w: water, shape: shape || 'spread', fan: false,
      v: { widthK: shape === 'folded' ? 0.5 : 1, dy: 0, alpha: 1, flap: 0, omega: 0, ang: Math.random() * TAU, wind: 0, pour: null,
        drops: [], nextDrop: 0.6, steam: [], steamAcc: 0, press: 0, lcd: { shown: '', rolls: [] } } };
  }
  const S = {
    scene: 'home', cam: { x: 0, from: 0, to: 0, t0: 0, dur: 0.9, moving: false }, booted: false,
    overlay: null, overlayA: 0, hover: null, press: null, t: 0,
    home: {
      min: 0, lapse: null, hourPassed: false, touched: { win: false, corner: false }, diffs: new Set(),
      towels: { win: newTowel('cotton', 30), corner: newTowel('cotton', 30) },
      cornerFan: null, labels: [], hand: null, sol: null,
    },
    bench: {
      A: newTowel('cotton', 30), B: newTowel('cotton', 30), t: 0, lapse: null,
      series: [], bt: { x: 0, y: 0, s: 1 }, btTo: null, graphA: 0, stamp: { on: false, p: 0 }, fair: false, flash: {},
    },
    sort: { deck: null, placed: { iv: [], cv: [], dv: [] } },
    flow: { deck: null, n: 0, segP: [0, 0, 0, 0, 0, 0], loopP: 0 },
    plan: { scen: 0, filled: [], deck: null, stamp: 0, stampOn: false, pendingTab: -1, pendingT: 0 },
  };
  const H = S.home, B = S.bench;
  let game = null;
  let F = new Set();
  const has = (n) => (game ? game.has(n) : F.has(n));
  const isNew = (n) => !!(game && game.isNew(n));
  const curM = () => (game ? game.current() : null);
  const active = (m) => !!(game && game.isActive(m));
  const level = () => (game ? game.level : 0);
  const freeMode = () => !!(game && game.free);

  /* =========================================================
     빨래 건조 모형 (설계 수치 그대로, dt = 0.05분 고정 단계)
     r = 0.25 g/분 × k바람 × k모양 × k종류 × k햇빛·온도 × min(1, w/(0.25·W0))
     ========================================================= */
  const DT = 0.05;
  function rateOf(T, env) {
    const kw = env.kw || 1, ks = env.ks || 1;
    const kshape = T.shape === 'folded' ? 0.45 : 1, ktype = T.cloth === 'micro' ? 0.8 : 1;
    const slow = T.W0 > 0 ? Math.min(1, T.w / (0.25 * T.W0)) : 0;
    return 0.25 * kw * kshape * ktype * ks * slow;
  }
  function dryStep(T, env) { T.w = Math.max(0, T.w - rateOf(T, env) * DT); }
  const massOf = (T) => DRY[T.cloth] + T.w;
  const homeEnv = (k) => (k === 'win' ? { kw: 2.4, ks: 1.35 } : { kw: H.cornerFan && H.cornerFan.on ? 2.4 : 1, ks: 1 });
  const benchEnv = (T) => ({ kw: T.fan ? 2.4 : 1, ks: 1 });
  // 측정 오차 ±0.1 g (mulberry32 seed 7, 결과가 늘 같음)
  const NOISE = (() => { const r = mulberry32(7); const a = []; for (let i = 0; i < 80; i++) a.push(Math.round(r() * 2 - 1) / 10); return a; })();
  const round1 = (v) => Math.round(v * 10) / 10;

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

  /* =========================================================
     장면 전환 (카메라: easeInOutCubic 900 ms, 이동 중 입력 잠금)
     ========================================================= */
  function goScene(name, instant) {
    const i = SCENES.indexOf(name);
    if (i < 0) return;
    const to = i * LAY.W;
    S.scene = name;
    FX.bubbles = [];
    if (instant || !S.booted || Math.abs(S.cam.x - to) < 1) {
      S.cam.x = to; S.cam.moving = false;
    } else {
      S.cam.from = S.cam.x; S.cam.to = to; S.cam.t0 = nowS(); S.cam.dur = RM ? 0.2 : 0.9; S.cam.moving = true;
    }
    syncDom();
  }
  function stepCam() {
    const c = S.cam;
    if (!c.moving) return;
    const p = clamp((nowS() - c.t0) / c.dur, 0, 1);
    c.x = c.from + (c.to - c.from) * EASE.inOutCubic(p);
    if (p >= 1) { c.x = c.to; c.moving = false; }
  }
  function openOverlay(name) {
    S.overlay = name;
    S.overlayA = 0;
    SciSim.tween(S, { overlayA: 1 }, { duration: 0.35, ease: 'outCubic' });
    syncDom();
  }
  function closeOverlay() { S.overlay = null; S.overlayA = 0; syncDom(); }

  /* =========================================================
     🏠 집 장면
     ========================================================= */
  function resetHome() {
    H.min = 0; H.lapse = null; H.hourPassed = false;
    H.touched = { win: false, corner: false };
    H.towels.win = newTowel('cotton', 30); H.towels.corner = newTowel('cotton', 30);
    H.towels.win.v.wind = 1;
    H.cornerFan = null; H.sol = null; H.hand = null;
    H.labels = H.labels.filter((l) => l.kind === 'diff');
  }
  function zoneOf(id) { return LAY.home.zones.find((z) => z.id === id); }
  function towelRect(zone) {
    const tw = LAY.home.towel;
    return { x: zone.x + zone.rack.x - tw.w / 2, y: zone.y + zone.rack.barY + 6, w: tw.w, h: tw.h };
  }
  function homeHotspots() {
    const zw = zoneOf('win'), zc = zoneOf('corner');
    const tw = LAY.home.towel;
    const rw = towelRect(zw), rc = towelRect(zc);
    const sunB = zw.sun.reduce((b, p) => ({ x0: Math.min(b.x0, p[0]), x1: Math.max(b.x1, p[0]), y0: Math.min(b.y0, p[1]), y1: Math.max(b.y1, p[1]) }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
    const ck = zc.clock;
    const list = [
      { id: 'tagW', kind: 'same', r: { x: rw.x + rw.w - 30, y: rw.y + 4, w: 28, h: 26 }, lab: { x: rw.x + rw.w - 16, y: rw.y - 18 }, text: '🏷️ 같은 점', sub: '둘 다 같은 면 손수건이에요' },
      { id: 'tagC', kind: 'same', r: { x: rc.x + rc.w - 30, y: rc.y + 4, w: 28, h: 26 }, lab: { x: rc.x + rc.w - 16, y: rc.y - 18 }, text: '🏷️ 같은 점', sub: '둘 다 같은 면 손수건이에요' },
      { id: 'towelW', kind: 'touch', key: 'win', r: rw },
      { id: 'towelC', kind: 'touch', key: 'corner', r: rc },
      { id: 'wind', kind: 'diff', r: { x: zw.x + zw.curtain.x - 4, y: zw.y + zw.win.y, w: zw.curtain.w + 10, h: zw.win.h + 14 }, lab: { x: zw.x + zw.curtain.x + zw.curtain.w / 2 + 18, y: zw.y + zw.win.y + zw.win.h * 0.42 }, text: '🌬️ 바람', sub: '열린 창으로 바람이 들어와요' },
      { id: 'sun', kind: 'diff', r: { x: zw.x + sunB.x0 + 20, y: zw.y + sunB.y0 - 4, w: sunB.x1 - sunB.x0 - 40, h: sunB.y1 - sunB.y0 + 4 }, lab: { x: zw.x + (sunB.x0 + sunB.x1) / 2 - 36, y: zw.y + sunB.y0 + 22 }, text: '☀️ 햇빛', sub: '창가 바닥에 햇빛이 들어요' },
      { id: 'tempW', kind: 'diff', diff: 'temp', r: { x: zw.x + zw.thermo.x - 8, y: zw.y + zw.thermo.y - 6, w: 48, h: 150 }, lab: { x: zw.x + zw.thermo.x + 16, y: zw.y + zw.thermo.y + 160 }, text: '🌡️ 온도', sub: '창가 27 °C · 구석 25 °C' },
      { id: 'tempC', kind: 'diff', diff: 'temp', r: { x: zc.x + zc.thermo.x - 8, y: zc.y + zc.thermo.y - 6, w: 48, h: 150 }, lab: { x: zc.x + zc.thermo.x + 16 - (LAY.kind === 'wide' ? 40 : 0), y: zc.y + zc.thermo.y + 160 }, text: '🌡️ 온도', sub: '창가 27 °C · 구석 25 °C' },
      { id: 'clock', kind: 'same', r: { x: zc.x + ck.x - ck.r - 6, y: zc.y + ck.y - ck.r - 6, w: ck.r * 2 + 12, h: ck.r * 2 + 12 }, lab: { x: zc.x + ck.x + (LAY.kind === 'wide' ? 0 : 40), y: zc.y + ck.y + ck.r + 22 }, text: '🕙 같은 점', sub: '둘 다 같은 시각에 널었어요' },
    ];
    return list;
  }
  function homeDown(p) {
    if (H.lapse || H.sol) return false;
    const spots = homeHotspots();
    for (const s of spots) {
      if (!inR(p, s.r, 6)) continue;
      if (s.kind === 'touch') { touchTowel(s); return false; }
      if (s.kind === 'diff') {
        const id = s.diff || s.id;
        const isFirst = !H.diffs.has(id);
        H.diffs.add(id);
        H.labels = H.labels.filter((l) => !(l.kind === 'diff' && (l.diff || l.id) === id));
        H.labels.push({ id: s.id, diff: id, kind: 'diff', x: s.lab.x, y: s.lab.y, text: s.text, sub: s.sub, t0: nowS() });
        if (isFirst) { Sound.tick(); ringFx(s.lab.x, s.lab.y, COL.good, 12); sparkle(s.lab.x, s.lab.y, 8); } else Sound.click();
        S.press = { id: s.id, t0: nowS() };
        return false;
      }
      if (s.kind === 'same') {
        H.labels = H.labels.filter((l) => l.id !== s.id);
        H.labels.push({ id: s.id, kind: 'same', x: s.lab.x, y: s.lab.y, text: s.text, sub: s.sub, t0: nowS(), ttl: 3.2 });
        Sound.click();
        return false;
      }
    }
    return false;
  }
  function touchTowel(s) {
    const T = H.towels[s.key];
    const phi = T.w / T.W0;
    const cx = s.r.x + s.r.w / 2, cy = s.r.y + s.r.h * 0.45;
    H.hand = { x: cx, y: cy, t0: nowS() };
    T.v.press = 1;
    if (H.hourPassed) H.touched[s.key] = true;
    setTimeout(() => {
      if (phi < 0.1) {
        bubble(cx, cy - 20, '보송보송 ✨', { kind: 'good', tag: 'touch' + s.key, dur: 2.5 });
        sparkle(cx, cy, 12, ['#fff6c2', '#ffd84d', '#ffffff']);
        Sound.tone(880, 0.08, 'sine', 0.07); Sound.tone(1320, 0.1, 'sine', 0.05, 0.07);
      } else {
        const msg = !H.hourPassed ? '축축해요 💧' : phi > 0.4 ? '아직 축축해요 💧' : '조금 축축해요 💧';
        bubble(cx, cy - 20, msg, { kind: 'info', tag: 'touch' + s.key, dur: 2.5 });
        for (let i = 0; i < 3; i++) spawnDrop(T, cx + (i - 1) * 12, cy + 18, s.key, true);
        Sound.tone(520, 0.06, 'sine', 0.06); Sound.tone(390, 0.09, 'sine', 0.05, 0.06);
      }
    }, RM ? 0 : 140);
  }
  function startHour() {
    if (H.lapse) return;
    if (!freeMode() && H.min >= 60) { toast('↺ 다시 널기를 누르면 처음부터 다시 관찰할 수 있어요'); return; }
    if (H.min >= 180) { toast('충분히 지났어요. ↺ 다시 널기를 눌러 보세요'); return; }
    H.lapse = { from: H.min, n: 0, total: Math.round(60 / DT), t0: nowS(), dur: RM ? 0.6 : 3 };
    Sound.click();
    hideHint();
    syncDom();
  }
  function stepHome(dt, t) {
    if (H.lapse) {
      const L = H.lapse;
      const p = clamp((nowS() - L.t0) / L.dur, 0, 1);
      const want = Math.floor(L.total * EASE.inOutCubic(p) + 1e-9);
      while (L.n < want) {
        dryStep(H.towels.win, homeEnv('win')); dryStep(H.towels.corner, homeEnv('corner'));
        L.n++;
      }
      H.min = L.from + L.n * DT;
      if (p >= 1) {
        H.min = Math.round(H.min);
        H.lapse = null;
        if (H.min >= 60) H.hourPassed = true;
        if (H.sol && H.sol.stage === 'lapse') finishSolution();
        Sound.tick();
        syncDom();
      }
    }
    // 바람: 창가는 열린 창의 바람, 구석은 거의 없음(4단계 해결 방안: 선풍기)
    H.towels.win.v.wind = 1;
    const cf = H.cornerFan;
    if (cf) { cf.omega += ((cf.on ? 18 : 0) - cf.omega) * Math.min(1, 2.5 * dt); cf.ang += cf.omega * dt; }
    H.towels.corner.v.wind = cf && cf.on ? clamp(cf.omega / 18, 0, 1) * 0.95 : 0.06;
    ['win', 'corner'].forEach((k) => stepTowelFx(H.towels[k], k, dt, homeEnv(k)));
    H.labels = H.labels.filter((l) => !l.ttl || nowS() - l.t0 < l.ttl);
  }
  /* 물방울 · 김(증발) — 집 장면 */
  function spawnDrop(T, x, y, key, squeeze) {
    if (RM && !squeeze) return;
    const zone = zoneOf(key);
    T.v.drops.push({ x, y, r: squeeze ? 1 : 0, vy: squeeze ? 40 + Math.random() * 60 : 0, vx: squeeze ? (Math.random() - 0.5) * 50 : 0, grow: squeeze ? 1 : 0, floor: zone.y + zone.rack.footY - 6, splash: 0 });
  }
  function stepTowelFx(T, key, dt, env) {
    const v = T.v;
    const phi = T.W0 > 0 ? T.w / T.W0 : 0;
    const fast = H.lapse ? 3 : 1;
    // 물방울: φ > 0.55이면 아랫단에서 0.5~1.4 s마다 맺힘
    if (phi > 0.55 && !RM) {
      v.nextDrop -= dt * fast;
      if (v.nextDrop <= 0) {
        v.nextDrop = 0.5 + Math.random() * 0.9;
        const r = towelRect(zoneOf(key));
        const wk = v.widthK;
        spawnDrop(T, r.x + r.w / 2 + (Math.random() - 0.5) * r.w * wk * 0.8, r.y + r.h - 2, key, false);
      }
    }
    v.drops.forEach((d) => {
      if (d.splash > 0) { d.splash += dt; return; }
      if (d.grow < 1) { d.grow = Math.min(1, d.grow + dt / 0.3); d.r = d.grow; return; }
      d.vy += 1600 * dt; d.y += d.vy * dt; d.x += d.vx * dt;
      if (d.y >= d.floor) { d.y = d.floor; d.splash = 0.001; }
    });
    v.drops = v.drops.filter((d) => d.splash < 0.4);
    // 김: 증발 빠르기 > 0.3 g/분이면 피어오름
    const rate = rateOf(T, env);
    if (rate > 0.12 && !RM && phi > 0.03) {
      v.steamAcc += dt * rate * 4.2 * fast;
      while (v.steamAcc >= 1) {
        v.steamAcc -= 1;
        const r = towelRect(zoneOf(key));
        v.steam.push({ x: r.x + r.w / 2 + (Math.random() - 0.5) * r.w * v.widthK * 0.8, y: r.y + 16 + Math.random() * r.h * 0.7, age: 0, life: 1.4 + Math.random() * 0.6, w: 2 + Math.random() * 2, ph: Math.random() * 6 });
      }
    }
    v.steam.forEach((s) => (s.age += dt * (H.lapse ? 1.6 : 1)));
    v.steam = v.steam.filter((s) => s.age < s.life);
    if (v.press > 0) v.press = Math.max(0, v.press - dt * 3);
  }
  function drawDrops(T) {
    T.v.drops.forEach((d) => {
      if (d.splash > 0) {
        const k = d.splash / 0.4;
        ctx.save(); ctx.strokeStyle = 'rgba(120,170,220,' + (0.55 * (1 - k)) + ')'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(d.x, d.y, 4 + 16 * k, 1.5 + 4 * k, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = 'rgba(140,190,235,' + (0.8 * (1 - k)) + ')';
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(d.x + i * (5 + 12 * k), d.y - 10 * k * (1 - k) * 4 - 2, 1.6, 0, TAU); ctx.fill(); }
        ctx.restore();
        return;
      }
      const r = 3.2 * d.r;
      ctx.save(); ctx.translate(d.x, d.y);
      ctx.fillStyle = 'rgba(126,182,236,.9)';
      ctx.beginPath(); ctx.moveTo(0, -r * 1.9); ctx.quadraticCurveTo(r * 1.1, -r * 0.2, 0, r); ctx.quadraticCurveTo(-r * 1.1, -r * 0.2, 0, -r * 1.9); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.2, r * 0.3, 0, TAU); ctx.fill();
      ctx.restore();
    });
  }
  function drawSteam(T, windDir) {
    if (!T.v.steam.length) return;
    ctx.save(); ctx.lineCap = 'round';
    T.v.steam.forEach((s) => {
      const k = s.age / s.life;
      const a = 0.18 * Math.sin(Math.PI * k) * 1.4;
      const rise = 18 + 46 * k;
      const bend = windDir * (8 + 34 * k);
      const x0 = s.x + bend * 0.3, y0 = s.y - rise * 0.3;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(x0 + Math.sin(s.ph + k * 6) * 8 + bend * 0.3, y0 - rise * 0.35, x0 + bend * 0.7 - Math.sin(s.ph + k * 5) * 8, y0 - rise * 0.7, x0 + bend, y0 - rise);
      // 밝은 배경에서도 보이도록 푸른 회색 테두리 + 흰 심지의 두 겹
      ctx.strokeStyle = 'rgba(140,168,200,' + clamp(a * 1.5, 0, 0.34) + ')'; ctx.lineWidth = s.w + 3; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + clamp(a * 3, 0, 0.78) + ')'; ctx.lineWidth = s.w; ctx.stroke();
    });
    ctx.restore();
  }

  /* 천(수건): 12×9 정점 격자, 윗줄 고정, 바람 W에 따라 x 변위 = W·(y/h)^1.5·(6·sin(6t + 0.05y) + 4) */
  const CLOTH = { cotton: { dry: hexA('#f4f6f8'), wet: hexA('#93a9bf') }, micro: { dry: hexA('#a9d6f5'), wet: hexA('#4f7fa8') } };
  const PTS = []; for (let j = 0; j < 9; j++) { PTS.push([]); for (let i = 0; i < 12; i++) PTS[j].push([0, 0]); }
  function drawCloth(T, x, y, w, h, t, o) {
    o = o || {};
    const wind = RM ? 0 : (T.v.wind || 0) * (o.windK != null ? o.windK : 1);
    const wetVis = o.wetVis != null ? o.wetVis : (T.W0 > 0 ? T.w / T.W0 : 0);
    const pal = CLOTH[T.cloth];
    const base = mix3(pal.dry, pal.wet, clamp(wetVis, 0, 1.25) / 1.25 * 1.0);
    const flap = T.v.flap || 0;
    const press = T.v.press || 0;
    for (let j = 0; j < 9; j++) {
      const yy = (j / 8) * h;
      const amp = wind * Math.pow(yy / h, 1.5);
      for (let i = 0; i < 12; i++) {
        const xx = (i / 11) * w;
        let dx = amp * (6 * Math.sin(6 * t + 0.05 * yy + 0.022 * xx) + 4);
        let dy = (j === 0 ? Math.sin((i / 11) * Math.PI) * 2.5 : 0) + amp * 1.4 * Math.sin(5 * t + 0.045 * xx + j * 0.6);
        if (flap > 0) dx += Math.sin(flap * 14 + yy * 0.05) * 7 * flap * (yy / h);
        if (press > 0) { const ddx = xx - w / 2, ddy = yy - h * 0.45; const k = Math.exp(-(ddx * ddx + ddy * ddy) / 900) * press; dy += k * 4; dx -= ddx * k * 0.08; }
        PTS[j][i][0] = x + xx + dx; PTS[j][i][1] = y + yy + dy;
      }
    }
    // 외곽선 경로
    const outline = () => {
      ctx.beginPath();
      ctx.moveTo(PTS[0][0][0], PTS[0][0][1]);
      for (let i = 1; i < 12; i++) ctx.lineTo(PTS[0][i][0], PTS[0][i][1]);
      for (let j = 1; j < 9; j++) ctx.lineTo(PTS[j][11][0], PTS[j][11][1]);
      for (let i = 10; i >= 0; i--) ctx.lineTo(PTS[8][i][0], PTS[8][i][1]);
      for (let j = 7; j > 0; j--) ctx.lineTo(PTS[j][0][0], PTS[j][0][1]);
      ctx.closePath();
    };
    // 수건 전체의 부드러운 그림자(두께감): 배경과 구분되도록 한 번에 깐다
    ctx.save(); ctx.shadowColor = 'rgba(30,50,80,.34)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 3;
    outline(); ctx.fillStyle = rgb(base, 0.93); ctx.fill(); ctx.restore();
    // 띠 사각형으로 채우기 + 정점 기울기로 명암(0.85~1)
    for (let j = 0; j < 8; j++) {
      const a = PTS[j], b = PTS[j + 1];
      const slope = ((b[0][0] - a[0][0]) + (b[11][0] - a[11][0])) / 2 / (h / 8);
      const shade = clamp(1 - Math.abs(slope) * 0.35 - (slope > 0 ? 0.04 : 0), 0.85, 1);
      ctx.fillStyle = rgb(base, shade);
      ctx.beginPath();
      ctx.moveTo(a[0][0], a[0][1]);
      for (let i = 1; i < 12; i++) ctx.lineTo(a[i][0], a[i][1]);
      for (let i = 11; i >= 0; i--) ctx.lineTo(b[i][0], b[i][1]);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgb(base, shade); ctx.lineWidth = 0.8; ctx.stroke();   // 띠 사이 틈 메우기
    }
    const pat = getPatterns();
    ctx.save();
    outline(); ctx.clip();
    ctx.globalAlpha = T.cloth === 'micro' ? 0.22 : 0.035;
    ctx.fillStyle = T.cloth === 'micro' ? pat.fluff : pat.weave;
    ctx.fillRect(x - 30, y - 10, w + 60, h + 20);
    // 젖을수록 짙어지는 광택 띠
    const gl = clamp(wetVis, 0, 1);
    if (gl > 0.02) {
      ctx.globalAlpha = 0.25 * gl;
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0.25, 'rgba(255,255,255,0)'); g.addColorStop(0.42, 'rgba(255,255,255,.95)'); g.addColorStop(0.55, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 30, y - 10, w + 60, h + 20);
    }
    ctx.globalAlpha = 1;
    // 아래 단 그림자(두께)
    const g2 = ctx.createLinearGradient(0, y + h - 14, 0, y + h + 6);
    g2.addColorStop(0, 'rgba(30,50,80,0)'); g2.addColorStop(1, 'rgba(30,50,80,.16)');
    ctx.fillStyle = g2; ctx.fillRect(x - 30, y + h - 14, w + 60, 26);
    ctx.restore();
    outline();
    ctx.strokeStyle = T.cloth === 'micro' ? rgb(base, 0.8) : 'rgba(100,120,142,.62)';
    ctx.lineWidth = T.cloth === 'micro' ? 3 : 1.2; ctx.lineJoin = 'round'; ctx.stroke();
    // 단(헴) 무늬
    if (T.cloth === 'cotton') {
      ctx.strokeStyle = 'rgba(110,130,150,.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); for (let i = 0; i < 12; i++) { const p = PTS[8][i]; i ? ctx.lineTo(p[0], p[1] - 7) : ctx.moveTo(p[0], p[1] - 7); } ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  /* 접힌 수건 = 절반 폭 2겹 (뒤 겹 + 접힌 선 + 그림자) */
  function drawTowelShape(T, cx, y, w, h, t, o) {
    o = o || {};
    const wk = T.v.widthK;
    const ww = w * wk;
    const foldK = clamp((1 - wk) / 0.5, 0, 1);
    if (foldK > 0.02) {
      ctx.save(); ctx.globalAlpha = foldK;
      const back = { v: Object.assign({}, T.v, { wind: (T.v.wind || 0) * 0.7, press: 0, flap: 0 }), cloth: T.cloth, W0: T.W0, w: T.w };
      ctx.translate(5, -2);
      drawCloth(back, cx - ww / 2, y, ww, h - 4, t + 0.3, Object.assign({}, o, { wetVis: (o.wetVis != null ? o.wetVis : T.w / Math.max(1, T.W0)) * 1.15 }));
      ctx.fillStyle = 'rgba(30,50,80,.18)'; ctx.fillRect(cx - ww / 2, y, ww, h - 4);
      ctx.restore();
    }
    drawCloth(T, cx - ww / 2, y, ww, h, t, o);
    if (foldK > 0.02) {
      ctx.save(); ctx.globalAlpha = foldK;
      const g = ctx.createLinearGradient(cx + ww / 2 - 10, 0, cx + ww / 2 + 2, 0);
      g.addColorStop(0, 'rgba(30,50,80,0)'); g.addColorStop(1, 'rgba(30,50,80,.22)');
      ctx.fillStyle = g; ctx.fillRect(cx + ww / 2 - 10, y, 12, h);
      ctx.strokeStyle = 'rgba(80,100,130,.5)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(cx + ww / 2 - 1, y + 2); ctx.lineTo(cx + ww / 2 - 1, y + h - 4); ctx.stroke();
      ctx.restore();
    }
  }
  function drawPin(x, y, color) {
    ctx.save();
    const g = ctx.createLinearGradient(x - 5, 0, x + 5, 0);
    g.addColorStop(0, SciSim.color.shade(color, 0.35)); g.addColorStop(0.6, color); g.addColorStop(1, SciSim.color.shade(color, -0.25));
    ctx.fillStyle = g; rr(x - 5, y - 9, 10, 22, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.65)'; rr(x - 3, y - 7, 2.5, 14, 1.2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x - 5, y + 3, 10, 1.5);
    ctx.restore();
  }
  function tube(x1, y1, x2, y2, w) {
    const horiz = Math.abs(y2 - y1) < Math.abs(x2 - x1);
    const g = horiz ? ctx.createLinearGradient(0, y1 - w / 2, 0, y1 + w / 2) : ctx.createLinearGradient(x1 - w / 2, 0, x1 + w / 2, 0);
    g.addColorStop(0, '#f4f6f9'); g.addColorStop(0.35, '#c9d1dc'); g.addColorStop(1, '#6f7a8a');
    ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function drawRack(cx, barY, footY, half) {
    contactShadow(cx - half, footY + 3, 30, 6, 0.16); contactShadow(cx + half, footY + 3, 30, 6, 0.16);
    tube(cx - half, barY, cx - half, footY, 7); tube(cx + half, barY, cx + half, footY, 7);
    tube(cx - half - 24, footY, cx - half + 24, footY, 7); tube(cx + half - 24, footY, cx + half + 24, footY, 7);
    tube(cx - half - 12, barY, cx + half + 12, barY, 7);
    ctx.fillStyle = '#5b6574';
    [cx - half - 12, cx + half + 12].forEach((x) => { ctx.beginPath(); ctx.arc(x, barY, 4.5, 0, TAU); ctx.fill(); });
  }
  function drawWallThermo(x, y, val, label) {
    // 나무판 + 유리관 + 빨간 기둥 (0~40 °C)
    softShadow(() => {
      const g = ctx.createLinearGradient(x, 0, x + 32, 0);
      g.addColorStop(0, '#e0b27a'); g.addColorStop(1, '#b98450');
      ctx.fillStyle = g; rr(x, y, 32, 132, 10); ctx.fill();
    }, 8, 3);
    ctx.fillStyle = '#fbfaf6'; rr(x + 10, y + 10, 12, 98, 6); ctx.fill();
    const top = y + 14, bot = y + 104, p = clamp(val / 40, 0, 1);
    ctx.strokeStyle = 'rgba(90,60,30,.55)'; ctx.lineWidth = 1;
    for (let v = 0; v <= 40; v += 5) { const ty = bot - (bot - top) * (v / 40); ctx.beginPath(); ctx.moveTo(x + 23, ty); ctx.lineTo(x + (v % 10 === 0 ? 29 : 26), ty); ctx.stroke(); }
    ctx.fillStyle = '#e2464b'; rr(x + 14, bot - (bot - top) * p, 4, (bot - top) * p + 8, 2); ctx.fill();
    D.sphere(x + 16, y + 116, 8, '#e2464b');
    if (label) pill(x + 16, y + 148, label, { bg: '#fff', color: '#b91c1c', size: 14, shadow: true, border: '#f3c9ca' });
  }
  function drawWallClock(x, y, r, minutes) {
    softShadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }, 10, 4);
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, '#9aa5b6'); g.addColorStop(1, '#4b5566');
    ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r - 2, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#3a4456';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU, r1 = r - 7, r2 = r - (i % 3 === 0 ? 13 : 10);
      ctx.lineWidth = i % 3 === 0 ? 2.4 : 1.2;
      ctx.beginPath(); ctx.moveTo(x + Math.sin(a) * r1, y - Math.cos(a) * r1); ctx.lineTo(x + Math.sin(a) * r2, y - Math.cos(a) * r2); ctx.stroke();
    }
    const hr = 10 + minutes / 60;
    const ah = ((hr % 12) / 12) * TAU, am = ((minutes % 60) / 60) * TAU;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(ah) * r * 0.48, y - Math.cos(ah) * r * 0.48); ctx.stroke();
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(x - Math.sin(am) * 6, y + Math.cos(am) * 6); ctx.lineTo(x + Math.sin(am) * r * 0.74, y - Math.cos(am) * r * 0.74); ctx.stroke();
    D.sphere(x, y, 4, '#3a4456', { gloss: false });
  }
  function clockText(minutes) {
    const tot = 10 * 60 + Math.round(minutes);
    const h = Math.floor(tot / 60), m = tot % 60;
    return (h < 12 ? '오전 ' : '오후 ') + (((h + 11) % 12) + 1) + ':' + (m < 10 ? '0' : '') + m;
  }
  /* 집 배경(벽·바닥) — 오프스크린에 한 번 그림 */
  function paintHomeBg() {
    const L = LAY.home;
    L.zones.forEach((z) => {
      ctx.save(); ctx.translate(z.x, z.y);
      ctx.beginPath(); ctx.rect(0, 0, z.w, z.h); ctx.clip();
      const wg = ctx.createLinearGradient(0, 0, 0, z.floorY);
      if (z.id === 'win') { wg.addColorStop(0, '#f8f2e8'); wg.addColorStop(1, '#efe3d0'); }
      else { wg.addColorStop(0, '#efe6d8'); wg.addColorStop(1, '#e3d4bd'); }
      ctx.fillStyle = wg; ctx.fillRect(0, 0, z.w, z.floorY);
      ctx.strokeStyle = 'rgba(160,130,90,.07)'; ctx.lineWidth = 1;
      for (let x = 8; x < z.w; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, z.floorY); ctx.stroke(); }
      // 바닥(마루): 창 쪽이 반사광으로 밝음
      const fy = z.floorY + 10;
      const fg = ctx.createLinearGradient(0, fy, 0, z.h);
      fg.addColorStop(0, '#c99f6e'); fg.addColorStop(1, '#b0814f');
      ctx.fillStyle = fg; ctx.fillRect(0, fy, z.w, z.h - fy);
      ctx.strokeStyle = 'rgba(90,55,25,.18)'; ctx.lineWidth = 1;
      let row = 0;
      for (let yy = fy + 14; yy < z.h; yy += 12 + row * 3, row++) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(z.w, yy); ctx.stroke(); }
      for (let i = 0; i < 18; i++) {
        const yy = fy + 4 + (i % 4) * 22, xx = ((i * 97) % z.w);
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + 12); ctx.stroke();
      }
      if (z.id === 'win') {
        const rg = ctx.createLinearGradient(0, 0, z.w, 0);
        rg.addColorStop(0, 'rgba(255,240,210,.32)'); rg.addColorStop(1, 'rgba(255,240,210,0)');
        ctx.fillStyle = rg; ctx.fillRect(0, fy, z.w, z.h - fy);
      } else {
        const sg = ctx.createLinearGradient(0, 0, z.w, 0);
        sg.addColorStop(0, 'rgba(60,40,20,0)'); sg.addColorStop(1, 'rgba(60,40,20,.14)');
        ctx.fillStyle = sg; ctx.fillRect(0, 0, z.w, z.h);
      }
      // 걸레받이
      const bg = ctx.createLinearGradient(0, z.floorY, 0, fy);
      bg.addColorStop(0, '#f3ece0'); bg.addColorStop(1, '#cdb898');
      ctx.fillStyle = bg; ctx.fillRect(0, z.floorY, z.w, fy - z.floorY);
      // 방 구석 모서리
      if (z.corner) {
        ctx.fillStyle = 'rgba(80,60,40,.10)'; ctx.fillRect(z.corner, 0, z.w - z.corner, z.h);
        ctx.strokeStyle = 'rgba(80,60,40,.25)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(z.corner, 0); ctx.lineTo(z.corner, z.floorY + 10); ctx.lineTo(z.w, z.h); ctx.stroke();
      }
      ctx.restore();
    });
    if (LAY.kind === 'tall') {
      const z2 = LAY.home.zones[1];
      ctx.fillStyle = '#d9cdb9'; ctx.fillRect(0, z2.y - 12, LAY.W, 12);
      ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, z2.y - 2, LAY.W, 2);
    }
  }
  function drawWindow(z, t, off) {
    const w = z.win, x = w.x, y = w.y;
    const half = w.w / 2;
    // 바깥 풍경(흐린 하늘 + 먼 아파트, 패럴랙스 0.3)
    ctx.save();
    rr(x + 8, y + 8, w.w - 16, w.h - 16, 4); ctx.clip();
    const sg = ctx.createLinearGradient(0, y, 0, y + w.h);
    sg.addColorStop(0, '#c7d6e6'); sg.addColorStop(0.7, '#e7eef5'); sg.addColorStop(1, '#f3efe6');
    ctx.fillStyle = sg; ctx.fillRect(x, y, w.w, w.h);
    D.glow(x + w.w * 0.78, y + w.h * 0.2, w.w * 0.5, '#fff5d6', 0.75);
    const px = -(off || 0) * 0.3;
    const drift = RM ? 0 : t * 4;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 4; i++) {
      const cx = x + ((i * 97 + drift + px) % (w.w + 120)) - 40, cy = y + 30 + (i % 2) * 34;
      ctx.beginPath(); ctx.ellipse(cx, cy, 34, 10, 0, 0, TAU); ctx.ellipse(cx + 22, cy - 6, 22, 9, 0, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 7; i++) {
      const bw = 26 + (i % 3) * 8, bh = 70 + ((i * 37) % 60);
      const bx = x + 4 + i * 38 + px * 0.4, by = y + w.h - bh;
      ctx.fillStyle = i % 2 ? '#a7b5c6' : '#b6c3d2'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (let r = by + 8; r < y + w.h - 6; r += 11) for (let c = bx + 4; c < bx + bw - 4; c += 8) ctx.fillRect(c, r, 4, 5);
    }
    ctx.restore();
    // 닫힌 오른쪽 유리 반사 줄
    ctx.save();
    ctx.beginPath(); ctx.rect(x + half, y + 8, half - 8, w.h - 16); ctx.clip();
    ctx.fillStyle = 'rgba(220,235,250,.18)'; ctx.fillRect(x + half, y, half, w.h);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(x + half + 30, y + w.h); ctx.lineTo(x + half + 110, y); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + half + 56, y + w.h); ctx.lineTo(x + half + 136, y); ctx.stroke();
    ctx.restore();
    // 창틀
    ctx.save();
    ctx.strokeStyle = '#fbf8f2'; ctx.lineWidth = 12; ctx.lineJoin = 'round';
    softShadow(() => { rr(x + 2, y + 2, w.w - 4, w.h - 4, 6); ctx.stroke(); }, 6, 2);
    ctx.strokeStyle = '#d9cfbf'; ctx.lineWidth = 1.5; rr(x + 8, y + 8, w.w - 16, w.h - 16, 4); ctx.stroke();
    ctx.fillStyle = '#f6f1e8'; ctx.fillRect(x + half - 4, y + 6, 8, w.h - 12);
    ctx.fillStyle = '#e7dccb'; ctx.fillRect(x + half - 4, y + 6, 2, w.h - 12);
    // 창턱
    const sill = ctx.createLinearGradient(0, y + w.h, 0, y + w.h + 12);
    sill.addColorStop(0, '#fffdf8'); sill.addColorStop(1, '#d7ccbb');
    ctx.fillStyle = sill; rr(x - 10, y + w.h - 2, w.w + 20, 13, 3); ctx.fill();
    ctx.restore();
    pill(x + half / 2 + 6, y + w.h - 24, '열린 창', { bg: 'rgba(255,255,255,.85)', color: '#5d6879', size: 12, h: 22 });
  }
  function drawCurtain(z, t) {
    const w = z.win, c = z.curtain;
    const top = w.y - 6, bot = w.y + w.h + 12;
    const x0 = c.x, x1 = c.x + c.w;
    const amp = (yy) => { const k = (yy - top) / (bot - top); return RM ? 0 : Math.pow(k, 1.6) * (8 + 6 * Math.sin(t * 0.9)); };
    const off = (yy, ph) => Math.sin(2.2 * t + 0.03 * yy + ph) * amp(yy);
    ctx.save();
    // 커튼 봉
    tube(w.x - 12, top, w.x + w.w + 12, top, 6);
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, 'rgba(255,255,255,.78)'); g.addColorStop(0.5, 'rgba(250,250,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,.72)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    for (let yy = top; yy <= bot; yy += 8) ctx.lineTo(x0 + off(yy, 0), yy);
    for (let xx = x0; xx <= x1; xx += 8) { const k = (xx - x0) / (x1 - x0); ctx.lineTo(xx + off(bot, k * 1.2) + Math.sin(k * 9 + t * 2.2) * 2, bot + Math.sin(k * 8 + t * 2) * 2); }
    for (let yy = bot; yy >= top; yy -= 8) ctx.lineTo(x1 + off(yy, 1.2) * 1.1, yy);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(200,190,170,.45)'; ctx.lineWidth = 1.2;
    for (let k = 1; k < 5; k++) {
      const xx = x0 + ((x1 - x0) * k) / 5;
      ctx.beginPath(); ctx.moveTo(xx, top + 2);
      for (let yy = top; yy <= bot; yy += 10) ctx.lineTo(xx + off(yy, k * 0.3), yy);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawSunPatch(z, t) {
    const k = RM ? 1 : 1 + 0.06 * Math.sin((t * TAU) / 4);
    const w = z.win;
    // 창에서 바닥으로 비치는 빛줄기
    ctx.save();
    const s = z.sun;
    const g = ctx.createLinearGradient(w.x, w.y, s[2][0], s[2][1]);
    g.addColorStop(0, 'rgba(255,244,214,.20)'); g.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(w.x + 10, w.y + 20); ctx.lineTo(w.x + w.w * 0.62, w.y + 20); ctx.lineTo(s[2][0], s[2][1]); ctx.lineTo(s[3][0], s[3][1]); ctx.closePath(); ctx.fill();
    ctx.restore();
    const spr = layer('sun|' + LAY.kind, 520, 200, () => {
      ctx.shadowColor = 'rgba(255,238,175,.85)'; ctx.shadowBlur = 16; ctx.shadowOffsetX = 2000;
      ctx.fillStyle = '#000';
      ctx.beginPath(); s.forEach((p, i) => (i ? ctx.lineTo(p[0] - 2000, p[1] - s[0][1] + 30) : ctx.moveTo(p[0] - 2000, p[1] - s[0][1] + 30))); ctx.closePath(); ctx.fill();
    });
    ctx.save(); ctx.globalAlpha = 0.8 * k;
    ctx.drawImage(spr.cv, 0, s[0][1] - 30, spr.w, spr.h);
    ctx.restore();
  }
  /* 작은 바닥 선풍기(4단계 해결 방안) */
  function drawFanBody(x, y, s, ang, omega, faceRight) {
    // (x, y) = 받침 바닥 가운데
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    contactShadow(0, 2, 50, 10, 0.2);
    const bg = ctx.createLinearGradient(-46, 0, 46, 0);
    bg.addColorStop(0, '#eef1f5'); bg.addColorStop(0.5, '#c4ccd8'); bg.addColorStop(1, '#7d8898');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, -6, 46, 12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9aa5b6'; ctx.beginPath(); ctx.ellipse(0, -10, 40, 9, 0, 0, TAU); ctx.fill();
    const pg = ctx.createLinearGradient(-6, 0, 6, 0);
    pg.addColorStop(0, '#f2f4f7'); pg.addColorStop(1, '#7f8a99');
    ctx.fillStyle = pg; ctx.fillRect(-6, -168, 12, 160);
    // 모터
    const mg = ctx.createLinearGradient(0, -214, 0, -180);
    mg.addColorStop(0, '#f4f6f9'); mg.addColorStop(0.5, '#c3cbd6'); mg.addColorStop(1, '#79849a');
    ctx.fillStyle = mg; rr(-34, -214, 40, 34, 12); ctx.fill();
    // 날개 + 철망 (오른쪽을 향해 비스듬히 = 가로 0.5배 타원)
    ctx.save(); ctx.translate(14, -196); ctx.scale(0.5, 1);
    const R = 62;
    ctx.fillStyle = 'rgba(220,232,245,.35)'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    const blur = omega > 9 && !RM;
    const reps = blur ? 4 : 1;
    for (let k = 0; k < reps; k++) {
      ctx.save(); ctx.rotate(ang - k * 0.12); ctx.globalAlpha = blur ? 0.22 : 0.92;
      for (let b = 0; b < 3; b++) {
        ctx.rotate(TAU / 3);
        const g = ctx.createLinearGradient(0, 0, R, 0);
        g.addColorStop(0, '#7fb3e6'); g.addColorStop(1, '#3f7fc4');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(6, -6); ctx.quadraticCurveTo(R * 0.6, -R * 0.42, R * 0.86, -4); ctx.quadraticCurveTo(R * 0.6, R * 0.2, 6, 6); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    ctx.fillStyle = '#d6dde6'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(150,160,175,.9)'; ctx.lineWidth = 1;
    for (let r = 18; r <= R; r += 11) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke(); }
    ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.restore();
  }
  function drawHome(off, t) {
    const L = LAY.home;
    // 먼 배경(벽·바닥·창): 패럴랙스 0.6배
    ctx.save(); ctx.translate(off * 0.6, 0);
    blit(layer('homeBg|' + LAY.kind, LAY.W, LAY.H, paintHomeBg), 0, 0);
    L.zones.forEach((z) => {
      ctx.save(); ctx.translate(z.x, z.y);
      if (z.win) { drawWindow(z, t, off); drawSunPatch(z, t); drawCurtain(z, t); }
      drawWallThermo(z.thermo.x, z.thermo.y, z.id === 'win' ? 27 : 25, z.id === 'win' ? '27 °C' : '25 °C');
      if (z.clock) drawWallClock(z.clock.x, z.clock.y, z.clock.r, H.min);
      ctx.restore();
    });
    ctx.restore();
    // 가까운 물체(건조대·수건): 1배
    ctx.save(); ctx.translate(off, 0);
    L.zones.forEach((z) => {
      const key = z.id;
      const T = H.towels[key];
      ctx.save(); ctx.translate(z.x, z.y);
      const rk = z.rack;
      drawRack(rk.x, rk.barY, rk.footY, rk.half);
      if (key === 'corner' && H.cornerFan) {
        const cf = H.cornerFan;
        drawFanBody(z.fan.x, z.fan.y + cf.dy, z.fan.s, cf.ang, cf.omega, true);
        if (cf.on && cf.dy > -2) drawWindLines(cf.lines, z.fan.x + 30 * z.fan.s, z.fan.y - 196 * z.fan.s, rk.x - L.towel.w / 2 - 6, clamp(cf.omega / 18, 0, 1), 46 * z.fan.s);
      }
      ctx.restore();
      const r = towelRect(z);
      const press = S.press && S.press.id === (key === 'win' ? 'towelW' : 'towelC') ? 1 : 0;
      ctx.save();
      if (S.hover === (key === 'win' ? 'towelW' : 'towelC')) { ctx.translate(r.x + r.w / 2, r.y); ctx.scale(1.03, 1.03); ctx.translate(-(r.x + r.w / 2), -r.y); }
      drawTowelShape(T, r.x + r.w / 2, r.y, r.w, r.h, t + (key === 'win' ? 0 : 1.7));
      ctx.restore();
      // 상표
      const tg = { x: r.x + r.w - 26, y: r.y + 10 };
      ctx.fillStyle = '#fff'; rr(tg.x, tg.y, 18, 14, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(120,140,160,.6)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#e2464b'; ctx.fillRect(tg.x + 3, tg.y + 4, 12, 2); ctx.fillStyle = '#9aa5b6'; ctx.fillRect(tg.x + 3, tg.y + 8, 9, 1.5);
      ctx.save(); ctx.translate(z.x, z.y);
      drawPin(rk.x - 36, rk.barY + 6, '#ff9db5'); drawPin(rk.x + 36, rk.barY + 6, '#8fd3ff');
      pill(z.tag.x, z.tag.y, z.id === 'win' ? '🪟 창가' : '🏠 방 구석', { bg: 'rgba(255,255,255,.88)', color: '#3a4456', size: 13, h: 24 });
      ctx.restore();
      drawSteam(T, 1);
      drawDrops(T);
      void press;
    });
    // 핫스폿 반짝임(1시간이 지난 뒤, 아직 찾지 못한 차이)
    if (H.hourPassed && level() === 0 && !RM) {
      homeHotspots().forEach((s, i) => {
        if (s.kind !== 'diff' || H.diffs.has(s.diff || s.id)) return;
        const ph = (t + i * 1.3) % 4;
        if (ph < 0.9) { const k = Math.sin((ph / 0.9) * Math.PI); D.spark(s.r.x + s.r.w / 2, s.r.y + Math.min(40, s.r.h / 2), 7 + 5 * k, t, '#fff4b0'); }
      });
    }
    // 차이 · 같은 점 라벨
    H.labels.forEach((l) => drawHomeLabel(l));
    // 만지는 손
    if (H.hand) {
      const k = (nowS() - H.hand.t0) / 0.55;
      if (k > 1) H.hand = null;
      else {
        const down = k < 0.36 ? EASE.outCubic(k / 0.36) : k < 0.55 ? 1 : 1 - EASE.inQuad((k - 0.55) / 0.45);
        ctx.save(); ctx.globalAlpha = k < 0.8 ? 1 : (1 - k) / 0.2;
        ctx.font = f(36, 400); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.translate(H.hand.x + 8, H.hand.y - 36 * (1 - down) + 8); ctx.scale(down > 0.95 ? 0.94 : 1, down > 0.95 ? 0.94 : 1);
        ctx.fillText('👆', 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
    // 시계 읽기 (가까운 층 위에)
    const zc = zoneOf('corner');
    ctx.save(); ctx.translate(off * 0.6, 0);
    pill(zc.x + zc.clock.x, zc.y + zc.clock.y + zc.clock.r + 16, clockText(H.min), { bg: '#1b2333', size: 13, h: 24 });
    ctx.restore();
  }
  function drawHomeLabel(l) {
    const age = nowS() - l.t0;
    const sc = RM ? 1 : age < 0.45 ? EASE.outBack(clamp(age / 0.45, 0, 1)) : 1;
    let a = 1;
    if (l.ttl) a = clamp((l.ttl - age) / 0.4, 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(l.x, l.y); ctx.scale(Math.max(0.01, sc), Math.max(0.01, sc));
    const same = l.kind === 'same';
    const r = pill(0, 0, l.text + (same ? '' : '     '), { bg: same ? '#eef1f5' : '#fff', color: same ? '#3a4456' : '#0b6b39', size: 15, h: 30, shadow: true, border: same ? '#cfd6e0' : '#9fdcb8', bw: 2 });
    if (!same) D.check(r.x + r.w - 15, 0, 9, clamp((age - 0.25) / 0.3, 0, 1));
    ctx.font = f(13, 700);
    const sw = ctx.measureText(l.sub).width + 16;
    ctx.fillStyle = same ? 'rgba(238,241,245,.95)' : 'rgba(255,255,255,.92)';
    rr(-sw / 2, 18, sw, 22, 11); ctx.fill();
    txt(l.sub, 0, 29, f(13, 700), same ? '#5d6879' : '#3a4456');
    ctx.restore();
  }
  /* 바람 흐름: 반투명 짧은 선들이 선풍기에서 수건 쪽으로 (18° 원뿔) */
  function makeWindLines(n) { const a = []; for (let i = 0; i < n; i++) a.push({ d: Math.random(), lat: Math.random() * 2 - 1, ph: Math.random() * 6, sp: 0.85 + Math.random() * 0.3 }); return a; }
  function stepWindLines(lines, dt, len, strength) {
    if (strength < 0.03) return;
    lines.forEach((l) => { l.d += (160 * l.sp * dt) / Math.max(40, len); if (l.d > 1) { l.d -= 1; l.lat = Math.random() * 2 - 1; } });
  }
  function drawWindLines(lines, x0, y0, x1, strength, half) {
    if (strength < 0.03 || RM) return;
    const len = x1 - x0 + 70;
    const t = nowS();
    ctx.save(); ctx.lineCap = 'round';
    lines.forEach((l) => {
      const along = l.d * len;
      const spread = half + Math.tan((9 * Math.PI) / 180) * along;
      const x = x0 + along, y = y0 + l.lat * spread + Math.sin(t * 7 + l.ph + along * 0.05) * 3;
      const a = 0.42 * strength * Math.sin(Math.PI * l.d);
      ctx.strokeStyle = 'rgba(120,170,230,' + a.toFixed(3) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 16, y + Math.sin(t * 7 + l.ph + along * 0.05 + 0.8) * 1.5); ctx.stroke();
    });
    ctx.restore();
  }

  /* 4단계 해결 방안: 구석에 선풍기가 톡 떨어져 켜지고, 1시간 타임랩스 */
  function runSolution() {
    if (H.sol) return;
    resetHome(); H.labels = [];
    H.sol = { stage: 'drop' };
    H.cornerFan = { dy: -260, on: false, omega: 0, ang: 0, lines: makeWindLines(26) };
    SciSim.tween(H.cornerFan, { dy: 0 }, { duration: 0.6, ease: 'outBack', delay: 0.15, onDone: () => {
      if (!H.cornerFan || !H.sol) return;
      Sound.tick(); ringFx(...fanScreenPos(), COL.good, 20);
      H.cornerFan.on = true;
      setTimeout(() => { if (!H.sol) return; H.sol.stage = 'lapse'; H.lapse = { from: 0, n: 0, total: Math.round(60 / DT), t0: nowS(), dur: RM ? 0.6 : 3 }; }, RM ? 100 : 900);
    } });
  }
  function fanScreenPos() { const z = zoneOf('corner'); return [z.x + z.fan.x, z.y + z.fan.y - 60]; }
  function finishSolution() {
    H.hourPassed = true;
    H.sol.stage = 'done';
    const r = towelRect(zoneOf('corner'));
    bubble(r.x + r.w / 2, r.y + 30, '구석 수건도 보송보송 ✨', { kind: 'good', dur: 4, tag: 'sol' });
    sparkle(r.x + r.w / 2, r.y + r.h / 2, 16, ['#fff6c2', '#ffd84d', '#ffffff', '#7be0a8']);
    Sound.success();
  }

  /* =========================================================
     🧪 실험대 장면 (실험대 고유 좌표 800×520을 BT로 옮겨 그림)
     ========================================================= */
  const CELL = { A: 0, B: 400 };
  const BN = {
    fan: { x: 64, y: 426, s: 0.92 },     // 받침 바닥 가운데
    towel: { cx: 242, y: 118, w: 116, h: 152 },
    badge: { cx: 242, cy: 250, w: 90, h: 32 },
    scale: { x: 152, y: 380, w: 180, h: 66 },
    lcd: { x: 184, y: 395, w: 116, h: 44 },
    rack: { x0: 174, x1: 310, top: 112, base: 376 },
    cup: { x: 336, y: 352, w: 42, h: 78 },
  };
  function benchMode() { return has('graph') ? 'graph' : 'design'; }
  function benchTarget() { const L = LAY.bench; return benchMode() === 'graph' ? L.graph : L.design; }
  function syncBenchLayout(instant) {
    const to = benchTarget();
    const bt = B.bt;
    if (instant || !S.booted) { bt.x = to.x; bt.y = to.y; bt.s = to.s; B.graphA = benchMode() === 'graph' ? 1 : 0; return; }
    if (bt.x !== to.x || bt.y !== to.y || bt.s !== to.s) SciSim.tween(bt, { x: to.x, y: to.y, s: to.s }, { duration: 0.6, ease: 'inOutCubic' });
    SciSim.tween(B, { graphA: benchMode() === 'graph' ? 1 : 0 }, { duration: 0.6, ease: 'outCubic', delay: benchMode() === 'graph' ? 0.15 : 0 });
  }
  const toBench = (p) => ({ x: (p.x - B.bt.x) / B.bt.s, y: (p.y - B.bt.y) / B.bt.s });
  const fromBench = (x, y) => ({ x: B.bt.x + x * B.bt.s, y: B.bt.y + y * B.bt.s });
  function setBench(a, b) {
    ['A', 'B'].forEach((k, i) => {
      const c = i ? b : a;
      const T = newTowel(c.cloth, c.water, c.shape);
      T.fan = c.fan;
      T.v.omega = c.fan ? 18 : 0; T.v.wind = c.fan ? 1 : 0;
      T.v.lines = makeWindLines(26);
      B[k] = T;
    });
    B.t = 0; B.lapse = null;
    B.fair = isFair();
    B.stamp.on = B.fair; B.stamp.p = B.fair ? 1 : 0;
    renderCond(true);
  }
  const STD_A = { cloth: 'cotton', water: 30, shape: 'spread', fan: true };
  const STD_B = { cloth: 'cotton', water: 30, shape: 'spread', fan: false };
  function setUnfairBench() { setBench({ cloth: 'cotton', water: 30, shape: 'spread', fan: false }, { cloth: 'micro', water: 15, shape: 'folded', fan: false }); }
  function setFairBench() { setBench(STD_A, STD_B); }
  function isFair() {
    const a = B.A, b = B.B;
    return a.cloth === b.cloth && a.W0 === b.W0 && a.shape === b.shape && a.fan !== b.fan;
  }
  const sameCount = () => (B.A.cloth === B.B.cloth) + (B.A.W0 === B.B.W0) + (B.A.shape === B.B.shape);
  function benchEditable() {
    if (S.overlay || B.lapse || S.cam.moving) return false;
    if (freeMode()) return true;
    return level() === 1;
  }
  function benchHit(p) {
    const q = toBench(p);
    for (const k of ['A', 'B']) {
      const x0 = CELL[k];
      const bd = BN.badge, tw = BN.towel, cp = BN.cup;
      if (inR(q, { x: x0 + bd.cx - bd.w / 2, y: bd.cy - bd.h / 2, w: bd.w, h: bd.h }, 8)) return { k, part: 'shape' };
      if (inR(q, { x: x0 + tw.cx - tw.w / 2, y: tw.y - 4, w: tw.w, h: tw.h + 8 }, 4)) return { k, part: 'cloth' };
      if (inR(q, { x: x0 + cp.x - 8, y: cp.y - 14, w: cp.w + 16, h: cp.h + 46 }, 4)) return { k, part: 'water' };
      if (inR(q, { x: x0 + 12, y: 140, w: 120, h: 296 }, 0)) return { k, part: 'fan' };
    }
    return null;
  }
  function benchDown(p) {
    const tb = LAY.bench.board;
    if (tb && benchMode() === 'design') {
      const h = boardHit(p);
      if (h) { if (benchEditable()) applyBenchChange(h.k, h.part); else lockedMsg(); return false; }
    }
    const h = benchHit(p);
    if (!h) return false;
    if (!benchEditable()) { lockedMsg(); return false; }
    S.press = { id: h.k + h.part, t0: nowS() };
    applyBenchChange(h.k, h.part);
    return false;
  }
  function lockedMsg() {
    if (level() === 2 && !freeMode()) toast('🔒 실험 중에는 조건을 바꾸지 않아요 (공정한 실험)', null, 2200);
  }
  function applyBenchChange(k, part) {
    const T = B[k];
    Sound.click();
    if (part === 'fan') {
      T.fan = !T.fan;
    } else if (part === 'shape') {
      T.shape = T.shape === 'spread' ? 'folded' : 'spread';
      SciSim.tween(T.v, { widthK: T.shape === 'folded' ? 0.5 : 1 }, { duration: 0.45, ease: 'outBack' });
      T.v.flap = 1;
    } else if (part === 'cloth') {
      swapTowel(T, () => { T.cloth = T.cloth === 'cotton' ? 'micro' : 'cotton'; });
    } else if (part === 'water') {
      const nxt = T.W0 === 15 ? 30 : T.W0 === 30 ? 45 : 15;
      const from = T.W0;
      if (nxt > from) pourWater(T, k, from, nxt);
      else swapTowel(T, () => { T.W0 = nxt; T.w = nxt; });
      const pos = fromBench(CELL[k] + BN.cup.x + BN.cup.w / 2, BN.cup.y - 24);
      bubble(pos.x, pos.y, '💧 ' + from + ' g → ' + nxt + ' g', { kind: 'info', tag: 'water' + k, dur: 1.6, maxW: 200 });
    }
    B.flash[part] = nowS();
    afterBenchChange();
  }
  function swapTowel(T, change) {
    if (RM) { change(); renderCond(); return; }
    const v = T.v;
    SciSim.tween(v, { dy: -46, alpha: 0 }, { duration: 0.15, ease: 'inQuad', onDone: () => {
      change(); renderCond();
      v.dy = -46;
      SciSim.tween(v, { dy: 0, alpha: 1 }, { duration: 0.2, ease: 'outBack' });
    } });
  }
  function pourWater(T, k, from, to) {
    T.v.pour = { t0: nowS(), from, to, k };
    T.W0 = to;
    T.v.pourFrom = from;
    if (RM) { T.w = to; T.v.pour = null; }
  }
  function stepPour(T) {
    const P = T.v.pour;
    if (!P) return;
    const e = nowS() - P.t0;
    // 0~0.3 s 들어 올림, 0.3~0.7 s 기울여 붓기, 0.7~1.0 s 제자리
    const pk = clamp((e - 0.3) / 0.4, 0, 1);
    T.w = P.from + (P.to - P.from) * pk;
    if (e > 0.32 && e < 0.68 && !RM) {
      T.v.pourAcc = (T.v.pourAcc || 0) + 1;
      if (T.v.pourAcc % 2 === 0) {
        const x0 = CELL[P.k] + BN.cup.x - 6, y0 = BN.towel.y - 20;
        FX.parts.emit({ x: 0, y: 0, bx: x0, by: y0 });
        const p = fromBench(x0 + Math.random() * 4, y0);
        FX.parts.emit({ x: p.x, y: p.y, vx: -60 * B.bt.s - Math.random() * 30 * B.bt.s, vy: 40, gravity: 900 * B.bt.s, life: 0.45, size: 2.2 * Math.max(0.6, B.bt.s), color: '#6fb2ee', fade: true });
      }
    }
    if (e >= 1) { T.w = P.to; T.v.pour = null; }
  }
  function afterBenchChange() {
    const fair = isFair();
    if (fair !== B.fair) {
      B.fair = fair;
      B.stamp.on = fair;
      if (fair) { B.stamp.p = 0; SciSim.tween(B.stamp, { p: 1 }, { duration: 0.55, ease: 'outBack' }); Sound.tone(660, 0.08, 'triangle', 0.08); }
    }
    if (freeMode() && benchMode() === 'graph') resetRun(true);
    renderCond();
  }
  function stepBench(dt, t) {
    ['A', 'B'].forEach((k) => {
      const T = B[k], v = T.v;
      v.omega += ((T.fan ? 18 : 0) - v.omega) * Math.min(1, 2.5 * dt);
      v.ang += v.omega * dt;
      v.wind = clamp(v.omega / 18, 0, 1);
      v.flap = Math.max(0, v.flap - dt * 1.6);
      if (!v.lines) v.lines = makeWindLines(26);
      stepWindLines(v.lines, dt, 200, v.wind);
      stepPour(T);
      // 김(증발): 실험대에서는 증발 빠르기에 따라
      const rate = rateOf(T, benchEnv(T));
      if (rate > 0.12 && !RM && T.w > 0.5) {
        v.steamAcc += dt * rate * 3.6 * (B.lapse ? 3 : 1);
        while (v.steamAcc >= 1) {
          v.steamAcc -= 1;
          v.steam.push({ x: CELL[k] + BN.towel.cx + (Math.random() - 0.5) * BN.towel.w * v.widthK * 0.8, y: BN.towel.y + 20 + Math.random() * BN.towel.h * 0.7, age: 0, life: 1.4 + Math.random() * 0.6, w: 2 + Math.random() * 2, ph: Math.random() * 6 });
        }
      }
      v.steam.forEach((s) => (s.age += dt * (B.lapse ? 1.6 : 1)));
      v.steam = v.steam.filter((s) => s.age < s.life);
    });
    if (B.lapse) {
      const L = B.lapse;
      const p = clamp((nowS() - L.t0) / L.dur, 0, 1);
      const want = Math.floor(L.total * EASE.inOutCubic(p) + 1e-9);
      while (L.n < want) { dryStep(B.A, benchEnv(B.A)); dryStep(B.B, benchEnv(B.B)); L.n++; }
      B.t = L.from + L.n * DT;
      if (p >= 1) { B.t = Math.round(B.t); B.lapse = null; Sound.tick(); syncDom(); }
    }
  }
  /* 측정값: 저울 표시(최소 눈금 0.1 g, 정각에는 측정 오차 ±0.1 g) */
  function noiseFor(k, tMin) {
    const idx = Math.round(tMin / 10);
    if (idx <= 0 || Math.abs(tMin - idx * 10) > 0.01) return 0;
    const ser = seriesFor(k);
    const base = (ser ? ser.seed : 0) + (k === 'A' ? 0 : 20);
    return NOISE[(base + idx) % NOISE.length];
  }
  const reading = (k) => round1(massOf(B[k]) + noiseFor(k, B.t));

  function paintBenchBg() {
    const wg = ctx.createLinearGradient(0, 0, 0, 334);
    wg.addColorStop(0, '#eef3f8'); wg.addColorStop(1, '#dbe3ed');
    ctx.fillStyle = wg; ctx.fillRect(0, 0, 800, 334);
    ctx.strokeStyle = 'rgba(120,140,170,.10)'; ctx.lineWidth = 1;
    for (let y = 30; y < 330; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke(); }
    // 원목 책상: 상판 그라데이션 + 앞면 어두운 띠
    const tg = ctx.createLinearGradient(0, 334, 0, 450);
    tg.addColorStop(0, '#d7b183'); tg.addColorStop(1, '#c49563');
    ctx.fillStyle = tg; ctx.fillRect(0, 334, 800, 116);
    ctx.strokeStyle = 'rgba(120,80,40,.14)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) { const y = 344 + i * 12; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(200, y + 4, 520, y - 5, 800, y + 2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, 334, 800, 3);
    const fg = ctx.createLinearGradient(0, 450, 0, 520);
    fg.addColorStop(0, '#9b6c3e'); fg.addColorStop(1, '#7a5230');
    ctx.fillStyle = fg; ctx.fillRect(0, 450, 800, 70);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(0, 450, 800, 2);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(399, 0, 2, 334);
  }
  function drawBench(off, t) {
    const L = LAY.bench, bt = B.bt;
    const full = bt.s > 0.999 && Math.abs(bt.x) < 0.5 && Math.abs(bt.y) < 0.5 && LAY.kind === 'wide';
    // 바깥 배경
    ctx.save(); ctx.translate(off * 0.6, 0);
    ctx.fillStyle = BG; ctx.fillRect(-2, 0, LAY.W + 4, LAY.H);
    if (full) blit(layer('benchBg', 800, 520, paintBenchBg), 0, 0);
    ctx.restore();
    ctx.save(); ctx.translate(off, 0);
    ctx.save();
    if (!full) {
      const fw = 800 * bt.s, fh = 520 * bt.s;
      softShadow(() => { ctx.fillStyle = '#fff'; rr(bt.x, bt.y, fw, fh, 14); ctx.fill(); }, 14, 5);
      rr(bt.x, bt.y, fw, fh, 14); ctx.clip();
      ctx.translate(bt.x, bt.y); ctx.scale(bt.s, bt.s);
      blit(layer('benchBg', 800, 520, paintBenchBg), 0, 0);
    }
    // 공유 온도계 (방 온도 25 °C)
    drawWallThermo(384, 96, 25, '방 25 °C');
    ['A', 'B'].forEach((k) => drawSetup(k, CELL[k], t));
    // 공정한 실험 도장
    if (B.stamp.p > 0.01 && (B.stamp.on || B.stamp.p < 1)) drawStamp(400, 48, '⚖️ 공정한 실험', B.stamp.on ? B.stamp.p : 0, '#14a058', -0.12, 0.8);
    ctx.restore();
    // 장치 이름표(화면 크기 기준으로 읽기 좋게)
    ['A', 'B'].forEach((k) => {
      const q = fromBench(CELL[k] + 130, 38);
      const r = Math.max(13, 22 * bt.s);
      D.sphere(q.x, q.y, r, k === 'A' ? COL.A : COL.B, { text: k, textScale: 1.05, shadow: true });
      if (benchMode() === 'graph' || freeMode()) {
        const T = B[k];
        pill(q.x + r + 6, q.y, T.fan ? '바람 있음' : '바람 없음', { align: 'left', bg: T.fan ? rgba(COL.A, 0.14) : 'rgba(56,103,244,.12)', color: T.fan ? '#c2410c' : '#1d4ed8', size: 13, h: 24 });
      }
    });
    // 세로형(휴대폰) 2단계: 조건 비교 판
    if (L.board && benchMode() === 'design') drawBoard(L.board, t);
    if (B.graphA > 0.01) {
      ctx.save(); ctx.globalAlpha = B.graphA;
      ctx.translate((1 - B.graphA) * 50, 0);
      drawTimer(L.timer, t);
      drawGraph(L.graphCard, t);
      ctx.restore();
      if (isNew('graph')) newRing(L.graphCard.x, L.graphCard.y, L.graphCard.w, L.graphCard.h);
      if (isNew('clock')) newRing(L.timer.x, L.timer.y, L.timer.w, L.timer.h);
    }
    ctx.restore();
  }
  function drawSetup(k, x0, t) {
    const T = B[k], v = T.v;
    const pr = S.press && nowS() - S.press.t0 < 0.14 ? S.press.id : null;
    const hov = S.hover;
    const pop = (id) => (pr === k + id ? 0.97 : hov === k + id && benchEditable() ? 1.04 : 1);
    // 선풍기
    ctx.save();
    const fs = pop('fan');
    ctx.translate(x0 + BN.fan.x, BN.fan.y); ctx.scale(fs, fs); ctx.translate(-(x0 + BN.fan.x), -BN.fan.y);
    drawFanBody(x0 + BN.fan.x, BN.fan.y, BN.fan.s, v.ang, v.omega, true);
    ctx.restore();
    pill(x0 + BN.fan.x, 318, T.fan ? '선풍기 켬' : '선풍기 끔', { bg: T.fan ? COL.good : '#9aa5b6', size: 13, h: 24 });
    // 저울 + 작은 건조대
    const sc = BN.scale;
    contactShadow(x0 + sc.x + sc.w / 2, sc.y + sc.h + 2, sc.w * 0.6, 9, 0.22);
    const mg = ctx.createLinearGradient(0, sc.y, 0, sc.y + sc.h);
    mg.addColorStop(0, '#eef1f5'); mg.addColorStop(0.45, '#c9d0da'); mg.addColorStop(1, '#8e98a8');
    ctx.fillStyle = mg; rr(x0 + sc.x, sc.y, sc.w, sc.h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) { const yy = sc.y + 4 + i * 4.4; ctx.beginPath(); ctx.moveTo(x0 + sc.x + 6, yy); ctx.lineTo(x0 + sc.x + sc.w - 6, yy); ctx.stroke(); }
    const pg = ctx.createLinearGradient(0, sc.y - 10, 0, sc.y + 2);
    pg.addColorStop(0, '#f7f9fb'); pg.addColorStop(1, '#aab4c2');
    ctx.fillStyle = pg; rr(x0 + sc.x + 8, sc.y - 10, sc.w - 16, 12, 4); ctx.fill();
    const rk = BN.rack;
    tube(x0 + rk.x0, rk.base, x0 + rk.x1, rk.base, 6);
    tube(x0 + rk.x0 + 4, rk.base, x0 + rk.x0 + 4, rk.top, 6); tube(x0 + rk.x1 - 4, rk.base, x0 + rk.x1 - 4, rk.top, 6);
    tube(x0 + rk.x0 - 6, rk.top, x0 + rk.x1 + 6, rk.top, 6);
    drawLcd(k, x0 + BN.lcd.x, BN.lcd.y, BN.lcd.w, BN.lcd.h);
    // 바람 흐름
    drawWindLines(v.lines || [], x0 + BN.fan.x + 30 * BN.fan.s, BN.fan.y - 196 * BN.fan.s, x0 + BN.towel.cx - BN.towel.w * v.widthK / 2, v.wind, 40);
    // 수건
    ctx.save();
    ctx.globalAlpha = v.alpha;
    const ts = pop('cloth');
    const tw = BN.towel;
    ctx.translate(x0 + tw.cx, tw.y); ctx.scale(ts, ts); ctx.translate(-(x0 + tw.cx), -tw.y);
    drawTowelShape(T, x0 + tw.cx, tw.y + v.dy, tw.w, tw.h, t + (k === 'A' ? 0 : 2.1), { wetVis: Math.min(1.25, T.w / 30) });
    ctx.restore();
    drawPin(x0 + tw.cx - 30 * Math.max(0.55, v.widthK), tw.y + 2, '#ffb36b'); drawPin(x0 + tw.cx + 30 * Math.max(0.55, v.widthK), tw.y + 2, '#8fd3ff');
    pill(x0 + tw.cx, tw.y + 24, T.cloth === 'cotton' ? '면 손수건' : '극세사 수건', { bg: 'rgba(255,255,255,.88)', color: '#3a4456', size: 13, h: 22 });
    drawSteam({ v }, 1);
    // 접힘/펼침 배지
    const bd = BN.badge, bs = pop('shape');
    ctx.save(); ctx.translate(x0 + bd.cx, bd.cy); ctx.scale(bs, bs);
    pill(0, 0, T.shape === 'spread' ? '▭ 펼침' : '◫ 접힘', { bg: T.shape === 'spread' ? '#ffffff' : '#fff4dc', color: T.shape === 'spread' ? '#3a4456' : '#9a5b00', size: 15, h: bd.h, border: T.shape === 'spread' ? '#cfd6e0' : '#f5c97a', bw: 2, shadow: true });
    ctx.restore();
    // 물컵
    drawCup(k, x0, T);
  }
  function drawCup(k, x0, T) {
    const cp = BN.cup, P = T.v.pour;
    let dx = 0, dy = 0, rot = 0;
    if (P) {
      const e = nowS() - P.t0;
      const up = e < 0.3 ? EASE.outCubic(e / 0.3) : e < 0.7 ? 1 : 1 - EASE.inOutCubic(clamp((e - 0.7) / 0.3, 0, 1));
      dx = -30 * up; dy = -(cp.y - BN.towel.y + 10) * up;
      rot = e < 0.3 ? 0 : e < 0.7 ? -0.7 * EASE.outCubic(clamp((e - 0.3) / 0.15, 0, 1)) : -0.7 * (1 - EASE.inOutCubic(clamp((e - 0.7) / 0.2, 0, 1)));
    }
    const pr = S.press && nowS() - S.press.t0 < 0.14 && S.press.id === k + 'water' ? 0.97 : S.hover === k + 'water' && benchEditable() ? 1.04 : 1;
    contactShadow(x0 + cp.x + cp.w / 2, cp.y + cp.h + 2, 26, 6, 0.2 * (1 + dy / 300));
    ctx.save();
    ctx.translate(x0 + cp.x + cp.w / 2 + dx, cp.y + cp.h + dy); ctx.rotate(rot); ctx.scale(pr, pr);
    const w = cp.w, h = cp.h;
    // 물(수위 + 메니스커스)
    const lvl = 0.58;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h); ctx.lineTo(-w / 2 + 5, -2); ctx.lineTo(w / 2 - 5, -2); ctx.lineTo(w / 2 - 2, -h); ctx.closePath(); ctx.clip();
    ctx.save(); ctx.rotate(-rot);
    const wg = ctx.createLinearGradient(0, -h * lvl, 0, 0);
    wg.addColorStop(0, 'rgba(120,185,240,.55)'); wg.addColorStop(1, 'rgba(70,140,215,.8)');
    ctx.fillStyle = wg; ctx.fillRect(-w * 1.5, -h * lvl, w * 3, h * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w, -h * lvl); ctx.quadraticCurveTo(0, -h * lvl + 4, w, -h * lvl); ctx.stroke();
    ctx.restore();
    ctx.restore();
    // 유리
    ctx.strokeStyle = 'rgba(120,140,165,.9)'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-w / 2, -h); ctx.lineTo(-w / 2 + 4, 0); ctx.lineTo(w / 2 - 4, 0); ctx.lineTo(w / 2, -h); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 6, -h + 8); ctx.lineTo(-w / 2 + 8, -10); ctx.stroke();
    ctx.restore();
    pill(x0 + cp.x + cp.w / 2, cp.y + cp.h + 22, '💧 ' + T.W0 + ' g', { bg: '#e7f1fd', color: '#1d4ed8', size: 14, h: 26, border: '#bcd5f6' });
  }
  function drawLcd(k, x, y, w, h) {
    // 어두운 LCD + 민트색 디지털 숫자(글로우) · 숫자는 위로 밀리는 롤(160 ms)
    ctx.fillStyle = '#10202a'; rr(x, y, w, h, 6); ctx.fill();
    const ig = ctx.createLinearGradient(0, y, 0, y + 10);
    ig.addColorStop(0, 'rgba(0,0,0,.55)'); ig.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ig; rr(x, y, w, 12, 6); ctx.fill();
    const lcd = B[k].v.lcd;
    const target = reading(k).toFixed(1);
    const str = target.padStart(5, ' ');
    if (lcd.shown.length !== str.length) { lcd.shown = str; lcd.rolls = str.split('').map(() => null); }
    const tn = nowS();
    for (let i = 0; i < str.length; i++) if (str[i] !== lcd.shown[i] && (!lcd.rolls[i] || lcd.rolls[i].to !== str[i])) lcd.rolls[i] = { from: lcd.shown[i], to: str[i], t0: tn };
    lcd.shown = str;
    ctx.save();
    rr(x + 3, y + 3, w - 6, h - 6, 4); ctx.clip();
    ctx.font = fm(28); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(124,242,196,.8)'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#7cf2c4';
    const cw = 17, sx = x + w - 30 - cw * str.length + cw / 2, cy = y + h / 2 + 1;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i], cx = sx + i * cw;
      if (ch === ' ') continue;
      const r = lcd.rolls[i];
      if (r && !RM) {
        const p = clamp((tn - r.t0) / 0.16, 0, 1);
        if (p >= 1) { lcd.rolls[i] = null; ctx.fillText(ch, cx, cy); continue; }
        const e = EASE.outCubic(p);
        if (r.from && r.from !== ' ') { ctx.globalAlpha = 1 - e; ctx.fillText(r.from, cx, cy - e * h * 0.6); }
        ctx.globalAlpha = e; ctx.fillText(ch, cx, cy + (1 - e) * h * 0.6);
        ctx.globalAlpha = 1;
      } else ctx.fillText(ch, cx, cy);
    }
    ctx.shadowBlur = 0;
    ctx.font = f(13, 800); ctx.fillStyle = '#7cf2c4'; ctx.fillText('g', x + w - 14, cy + 4);
    ctx.font = f(9, 800); ctx.fillStyle = 'rgba(124,242,196,.6)'; ctx.textAlign = 'left'; ctx.fillText('TARE', x + 6, y + 9);
    ctx.restore();
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

  /* 세로형(휴대폰) 2단계: 캔버스 속 조건 비교 판(눌러서 바꾸기도 됨) */
  const COND_ROWS = [
    { part: 'fan', name: '🌬️ 바람(선풍기)', val: (T) => (T.fan ? '🌀 켬' : '끔') },
    { part: 'cloth', name: '🧺 수건의 종류', val: (T) => (T.cloth === 'cotton' ? '면' : '극세사') },
    { part: 'water', name: '💧 적신 물의 양', val: (T) => T.W0 + ' g' },
    { part: 'shape', name: '📐 펼친 모양', val: (T) => (T.shape === 'spread' ? '펼침' : '접음') },
    { part: 'temp', name: '🌡️ 방의 온도', val: () => '25 °C' },
  ];
  function judge(part) {
    if (part === 'temp') return { t: '✔ 같음', c: 'same' };
    if (part === 'fan') return B.A.fan !== B.B.fan ? { t: '🎛️ 조작 변인', c: 'iv' } : { t: '✖ 같음', c: 'diff' };
    const a = B.A, b = B.B;
    const same = part === 'cloth' ? a.cloth === b.cloth : part === 'water' ? a.W0 === b.W0 : a.shape === b.shape;
    return same ? { t: '✔ 같음', c: 'same' } : { t: '✖ 다름', c: 'diff' };
  }
  function boardGeom(bd) {
    const rowH = 78, y0 = bd.y + 48;
    return COND_ROWS.map((r, i) => ({ r, y: y0 + i * rowH, h: rowH - 10, a: { x: bd.x + 128, y: y0 + i * rowH + 8, w: 104, h: 46 }, b: { x: bd.x + bd.w - 112, y: y0 + i * rowH + 8, w: 104, h: 46 } }));
  }
  function boardHit(p) {
    const bd = LAY.bench.board;
    if (!bd) return null;
    for (const g of boardGeom(bd)) {
      if (g.r.part === 'temp') continue;
      if (inR(p, g.a, 4)) return { k: 'A', part: g.r.part };
      if (inR(p, g.b, 4)) return { k: 'B', part: g.r.part };
    }
    return null;
  }
  function drawBoard(bd, t) {
    softShadow(() => { ctx.fillStyle = '#fff'; rr(bd.x, bd.y, bd.w, bd.h, 16); ctx.fill(); }, 14, 5);
    txt('📋 조건 비교표', bd.x + 16, bd.y + 24, fj(20), '#3a4456', 'left');
    txt('A', bd.x + 180, bd.y + 24, f(15, 800), COL.A); txt('B', bd.x + bd.w - 60, bd.y + 24, f(15, 800), COL.B);
    const fl = B.flash;
    boardGeom(bd).forEach((g) => {
      const j = judge(g.r.part);
      const rowCol = j.c === 'diff' ? '#fdecec' : j.c === 'iv' ? '#f3eeff' : '#f3faf6';
      ctx.fillStyle = rowCol; rr(bd.x + 8, g.y, bd.w - 16, g.h, 12); ctx.fill();
      drawLines(g.r.name, bd.x + 18, g.y + g.h / 2, 104, 14, '#3a4456', { align: 'left', weight: 800 });
      [['A', g.a], ['B', g.b]].forEach(([k, r]) => {
        const flash = fl[g.r.part] && nowS() - fl[g.r.part] < 0.6;
        const tap = g.r.part !== 'temp';
        ctx.fillStyle = flash ? '#fff1c2' : '#fff'; rr(r.x, r.y, r.w, r.h, 12); ctx.fill();
        ctx.strokeStyle = tap ? (k === 'A' ? rgba(COL.A, 0.5) : rgba(COL.B, 0.5)) : '#dde4ef'; ctx.lineWidth = 2; ctx.stroke();
        txt(g.r.val(B[k]), r.x + r.w / 2, r.y + r.h / 2 + 1, f(16, 800), COL.ink);
      });
      const jc = j.c === 'same' ? ['#e2f6eb', '#0b6b39'] : j.c === 'iv' ? ['#efe8ff', '#6d28d9'] : ['#fde9e9', '#b91c1c'];
      const mx = (g.a.x + g.a.w + g.b.x) / 2;
      ctx.font = f(12.5, 800);
      const lines = j.t.split(' ');
      ctx.fillStyle = jc[0]; rr(mx - 36, g.y + 10, 72, g.h - 20, 10); ctx.fill();
      txt(lines[0], mx, g.y + g.h / 2 - 8, f(14, 800), jc[1]); txt(lines.slice(1).join(' '), mx, g.y + g.h / 2 + 9, f(12, 800), jc[1]);
    });
    txt('A·B 칸을 눌러 조건을 바꿀 수 있어요', bd.x + bd.w / 2, bd.y + bd.h - 18, f(13, 700), COL.muted);
    void t;
  }

  /* =========================================================
     📈 측정·기록 · 그래프 · 타이머
     ========================================================= */
  const TIMES = [0, 10, 20, 30, 40, 50, 60];
  function sigOf(T) { return T.cloth + '|' + T.W0 + '|' + T.shape + '|' + (T.fan ? 1 : 0); }
  function labelOf(T) { return (T.fan ? '바람 있음' : '바람 없음') + (T.cloth === 'micro' ? '·극세사' : '') + (T.W0 !== 30 ? '·물 ' + T.W0 + ' g' : '') + (T.shape === 'folded' ? '·접음' : ''); }
  function seriesFor(k) { const sig = sigOf(B[k]); return B.series.find((s) => s.sig === sig) || null; }
  function ensureSeries(k) {
    let s = seriesFor(k);
    if (s) return s;
    const T = B[k], sig = sigOf(T);
    const std = sig === sigOf({ cloth: 'cotton', W0: 30, shape: 'spread', fan: true }) ? COL.A : sig === sigOf({ cloth: 'cotton', W0: 30, shape: 'spread', fan: false }) ? COL.B : null;
    const used = B.series.filter((x) => !x.std).length;
    s = { sig, std: !!std, color: std || SERIES_COLORS[used % SERIES_COLORS.length], label: labelOf(T), pts: new Map(), seed: std ? 0 : 40 + used * 7 };
    B.series.push(s);
    if (B.series.length > 7) { const i = B.series.findIndex((x) => !x.std && x !== seriesFor('A') && x !== seriesFor('B')); if (i >= 0) B.series.splice(i, 1); }
    return s;
  }
  function resetRun(keepSeries) {
    B.t = 0; B.lapse = null;
    ['A', 'B'].forEach((k) => { const T = B[k]; T.w = T.W0; T.v.pour = null; });
    if (!keepSeries) B.series = [];
    else ['A', 'B'].forEach((k) => { const s = seriesFor(k); if (s) s.pts.clear(); });
    ensureSeries('A'); ensureSeries('B');
    renderTable();
    syncDom();
  }
  const recordedSet = () => { const s = seriesFor('A'); return s ? new Set(s.pts.keys()) : new Set(); };
  const recordedNow = () => recordedSet().has(Math.round(B.t));
  function doRecord() {
    if (B.lapse) return;
    const tm = Math.round(B.t);
    const already = recordedNow();
    Sound.tick();
    ['A', 'B'].forEach((k) => {
      const ser = ensureSeries(k);
      const val = reading(k);
      const lc = fromBench(CELL[k] + BN.lcd.x + BN.lcd.w / 2, BN.lcd.y + BN.lcd.h / 2);
      const gp = graphPoint(tm, val);
      const pt = { v: val, t0: null, shown: false };
      ser.pts.set(tm, pt);
      if (B.graphA > 0.5 && !RM) {
        FX.flyers.push({ x0: lc.x, y0: lc.y, x1: gp.x, y1: gp.y, t: 0, dur: 0.45, text: val.toFixed(1) + ' g', color: ser.color, onDone: () => { pt.shown = true; pt.t0 = nowS(); } });
      } else { pt.shown = true; pt.t0 = nowS(); }
    });
    renderTable(tm);
    if (already) toast('📍 ' + tm + '분 값을 다시 기록했어요');
    syncDom();
  }
  function startTen() {
    if (B.lapse) return;
    if (Math.round(B.t) >= 60) { toast('60분까지 측정했어요. ↺ 다시 실험으로 처음부터 할 수 있어요'); return; }
    if (recordLock()) { toast('📍 먼저 지금 시각(' + Math.round(B.t) + '분)의 질량을 기록해요'); return; }
    B.lapse = { from: Math.round(B.t), n: 0, total: Math.round(10 / DT), t0: nowS(), dur: RM ? 0.3 : 1.2 };
    Sound.click();
    hideHint();
    syncDom();
  }
  const recordLock = () => !!(M3_1 && active(M3_1) && !recordedNow());
  function graphFrame(G) {
    const tall = LAY.kind === 'tall';
    const pad = { l: 50, r: 16, t: tall ? 68 : 76, b: 44 };
    const ymax = Math.max(60, ...B.series.map((s) => Math.max(0, ...[...s.pts.values()].map((p) => p.v))), massOf(B.A), massOf(B.B)) > 60 ? 80 : 60;
    return { x0: G.x + pad.l, x1: G.x + G.w - pad.r, y0: G.y + G.h - pad.b, y1: G.y + pad.t, ymax };
  }
  function graphPoint(tm, val) {
    const fr = graphFrame(LAY.bench.graphCard);
    return { x: fr.x0 + (tm / 60) * (fr.x1 - fr.x0), y: fr.y0 - (val / fr.ymax) * (fr.y0 - fr.y1) };
  }
  function drawGraph(G, t) {
    softShadow(() => { ctx.fillStyle = '#fff'; rr(G.x, G.y, G.w, G.h, 16); ctx.fill(); }, 14, 5);
    const fr = graphFrame(G);
    txt('📈 시간–질량 그래프', G.x + 14, G.y + 22, fj(19), '#3a4456', 'left');
    // 범례
    const sa = seriesFor('A'), sb = seriesFor('B');
    let lx = G.x + 14;
    [[sa, 'A', B.A], [sb, 'B', B.B]].forEach(([s, k, T]) => {
      const lab = k + ' ' + (T.fan ? '바람 있음' : '바람 없음');
      const r = pill(lx, G.y + 48, lab, { align: 'left', bg: rgba(s ? s.color : '#888', 0.14), color: s ? s.color : '#555', size: 13, h: 24 });
      ctx.fillStyle = s ? s.color : '#888'; ctx.beginPath(); ctx.arc(r.x + 2, G.y + 48, 0, 0, TAU); ctx.fill();
      lx = r.x + r.w + 6;
    });
    // 축·격자
    ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1; ctx.font = f(13, 600); ctx.fillStyle = '#5d6879';
    for (let v = 0; v <= 60; v += 10) {
      const x = fr.x0 + (v / 60) * (fr.x1 - fr.x0);
      ctx.beginPath(); ctx.moveTo(x, fr.y0); ctx.lineTo(x, fr.y1); ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(v, x, fr.y0 + 17);
    }
    for (let v = 0; v <= fr.ymax; v += 10) {
      const y = fr.y0 - (v / fr.ymax) * (fr.y0 - fr.y1);
      ctx.beginPath(); ctx.moveTo(fr.x0, y); ctx.lineTo(fr.x1, y); ctx.stroke();
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(v, fr.x0 - 7, y);
    }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(fr.x0, fr.y1 - 4); ctx.lineTo(fr.x0, fr.y0); ctx.lineTo(fr.x1 + 4, fr.y0); ctx.stroke();
    txt('시간 (분)', (fr.x0 + fr.x1) / 2, fr.y0 + 33, f(13, 800), '#5d6879');
    ctx.save(); ctx.translate(G.x + 14, (fr.y0 + fr.y1) / 2); ctx.rotate(-Math.PI / 2); txt('질량 (g)', 0, 0, f(13, 800), '#5d6879'); ctx.restore();
    // 마른 수건 20 g 기준선
    const y20 = fr.y0 - (20 / fr.ymax) * (fr.y0 - fr.y1);
    D.dashedLine(fr.x0, y20, fr.x1, y20, { color: '#9aa5b6', width: 1.5, dash: [5, 5] });
    txt('마른 수건 20 g', fr.x1 - 4, y20 - 9, f(12.5, 700), '#7a8596', 'right');
    // 계열(점 + 선)
    const curA = sa, curB = sb;
    B.series.forEach((s) => {
      const cur = s === curA || s === curB;
      const pts = [...s.pts.entries()].filter((e) => e[1].shown).sort((a, b) => a[0] - b[0]);
      ctx.save(); ctx.globalAlpha = cur ? 1 : 0.45;
      ctx.strokeStyle = s.color; ctx.lineWidth = cur ? 3 : 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) {
        const [t0, p0] = pts[i - 1], [t1, p1] = pts[i];
        const a = graphPt(fr, t0, p0.v), b = graphPt(fr, t1, p1.v);
        const k = RM || !p1.t0 ? 1 : clamp((nowS() - p1.t0) / 0.3, 0, 1);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k); ctx.stroke();
      }
      pts.forEach(([tm, p]) => {
        const q = graphPt(fr, tm, p.v);
        const age = p.t0 ? nowS() - p.t0 : 1;
        const sc = RM ? 1 : age < 0.18 ? 1.25 * EASE.outCubic(age / 0.18) : age < 0.36 ? 1.25 - 0.25 * EASE.outCubic((age - 0.18) / 0.18) : 1;
        D.sphere(q.x, q.y, (cur ? 6.5 : 5) * sc, s.color, { gloss: true });
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q.x, q.y, (cur ? 6.5 : 5) * sc, 0, TAU); ctx.stroke();
      });
      ctx.restore();
    });
    // 지금 시각·질량: 맥박 고리
    [['A', curA], ['B', curB]].forEach(([k, s]) => {
      if (!s) return;
      const q = graphPt(fr, clamp(B.t, 0, 60), massOf(B[k]));
      const pulse = RM ? 8 : 7 + Math.sin(t * 5 + (k === 'A' ? 0 : 1.5)) * 2.2;
      ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, pulse, 0, TAU); ctx.stroke();
    });
    if (!curA || curA.pts.size === 0) txt('📍 기록하기를 누르면 점이 찍혀요', fr.x1 - 4, fr.y1 + 14, f(13, 700), '#8a95a6', 'right');
    // 자유 탐구: 다른 조건의 계열 이름
    const extra = B.series.filter((s) => s !== curA && s !== curB && s.pts.size);
    extra.slice(-3).forEach((s, i) => pill(fr.x1 - 4, fr.y1 + 34 + i * 26, s.label, { align: 'right', bg: rgba(s.color, 0.14), color: s.color, size: 12, h: 22 }));
  }
  const graphPt = (fr, tm, v) => ({ x: fr.x0 + (tm / 60) * (fr.x1 - fr.x0), y: fr.y0 - (clamp(v, 0, fr.ymax) / fr.ymax) * (fr.y0 - fr.y1) });
  function drawTimer(R, t) {
    softShadow(() => { ctx.fillStyle = '#fff'; rr(R.x, R.y, R.w, R.h, 16); ctx.fill(); }, 14, 5);
    const tall = LAY.kind === 'tall';
    const r = tall ? 46 : 58;
    const cx = R.x + r + 18, cy = R.y + R.h / 2;
    // 타이머 시계: 10분마다 분침 60°
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e8edf4');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a4456'; ctx.lineWidth = 3; ctx.stroke();
    const frac = clamp(B.t / 60, 0, 1);
    ctx.fillStyle = 'rgba(20,160,88,.16)';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 4, -Math.PI / 2, -Math.PI / 2 + frac * TAU); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.strokeStyle = '#3a4456'; ctx.lineWidth = i % 2 === 0 ? 2.4 : 1.2;
      ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * (r - 6), cy - Math.cos(a) * (r - 6)); ctx.lineTo(cx + Math.sin(a) * (r - (i % 2 === 0 ? 14 : 10)), cy - Math.cos(a) * (r - (i % 2 === 0 ? 14 : 10))); ctx.stroke();
      if (i % 2 === 0) txt(String(i * 5), cx + Math.sin(a) * (r - 24), cy - Math.cos(a) * (r - 24), f(tall ? 11 : 12.5, 700), '#5d6879');
    }
    const am = frac * TAU;
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(am) * (r - 12), cy - Math.cos(am) * (r - 12)); ctx.stroke();
    D.sphere(cx, cy, 4.5, '#3a4456', { gloss: false });
    // 글자 + 기록 점
    const tx = cx + r + 18;
    txt('⏱ 지금 ' + Math.round(B.t) + '분', tx, R.y + (tall ? 30 : 36), fj(tall ? 21 : 24), '#1b2333', 'left');
    const rs = recordedSet();
    txt('📍 기록한 시각 ' + rs.size + ' / 7', tx, R.y + (tall ? 58 : 70), f(13.5, 800), '#5d6879', 'left');
    const dw = Math.min(40, (R.x + R.w - 14 - tx) / 7);
    TIMES.forEach((tm, i) => {
      const x = tx + dw * i + dw / 2 - 2, y = R.y + (tall ? 92 : 108);
      const done = rs.has(tm), nowT = Math.round(B.t) === tm;
      if (done) D.sphere(x, y, 9, COL.good, { gloss: true });
      else { ctx.fillStyle = '#eef2f7'; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill(); ctx.strokeStyle = '#cfd6e0'; ctx.lineWidth = 1.5; ctx.stroke(); }
      if (nowT && !done) D.ring(x, y, 11, t, { color: COL.good, width: 2 });
      txt(String(tm), x, y + 21, f(12, 700), nowT ? '#0b6b39' : '#7a8596');
    });
    if (!tall && rs.size >= 7) txt('✔ 0분~60분 기록 완료', tx, R.y + R.h - 18, f(13.5, 800), '#0b6b39', 'left');
  }

  /* =========================================================
     🗂️ 변인 분류 오버레이 (2단계 미션 2)
     ========================================================= */
  const VARS = [
    { id: 'wind', t: '바람 (선풍기 켬·끔)', box: 'iv' },
    { id: 'cloth', t: '수건의 종류와 크기', box: 'cv' },
    { id: 'water', t: '적신 물의 양', box: 'cv' },
    { id: 'shape', t: '수건을 펼친 모양', box: 'cv' },
    { id: 'temp', t: '방의 온도', box: 'cv' },
    { id: 'mass', t: '수건의 질량 변화', box: 'dv' },
  ];
  const BOXES = {
    iv: { name: '🎛️ 조작 변인', sub: '일부러 다르게 하는 조건', col: '#7c3aed', soft: '#f3eeff' },
    cv: { name: '🔒 통제 변인', sub: '같게 유지하는 조건', col: '#0f766e', soft: '#e6f6f3' },
    dv: { name: '📏 종속 변인', sub: '측정하는 결과', col: '#c2410c', soft: '#fff1e8' },
  };
  function boxSlot(key, i) {
    const L = LAY.sort, bx = L.boxes[key], cols = L.cols[key];
    const col = i % cols, row = Math.floor(i / cols);
    const gx = cols === 1 ? bx.x + (bx.w - L.cw) / 2 : bx.x + 12 + col * (L.cw + 8);
    return { x: gx, y: bx.y + 56 + row * (L.ch + 6) };
  }
  function resetSort() {
    const L = LAY.sort;
    S.sort.placed = { iv: [], cv: [], dv: [] };
    const deck = makeDeck({
      findTarget: (c, p) => Object.keys(L.boxes).find((k) => inR(p, L.boxes[k], 6)) || null,
      onDrop: (c, p) => {
        const key = Object.keys(L.boxes).find((k) => inR(p, L.boxes[k], 6));
        if (!key) return null;
        if (key === c.box) {
          const i = S.sort.placed[key].length;
          S.sort.placed[key].push(c.id);
          const s = boxSlot(key, i);
          return { ok: true, x: s.x, y: s.y };
        }
        return { msg: sortMsg(c, key) };
      },
      onTap: () => ({ msg: '카드를 끌어서 알맞은 상자에 넣어요' }),
    });
    const order = shuffled([0, 1, 2, 3, 4, 5], 11);
    VARS.forEach((v, i) => {
      const h = L.home[order[i]];
      deck.add({ id: v.id, t: v.t, box: v.box, hx: h[0], hy: h[1], w: L.cw, h: L.ch });
    });
    S.sort.deck = deck;
  }
  function sortMsg(c, key) {
    if (c.box === 'dv') return '질량 변화는 정하는 조건이 아니라 실험해서 측정하는 결과예요.';
    if (c.box === 'iv' && key === 'cv') return '바람은 일부러 다르게 하는 조건이에요.';
    if (c.box === 'cv' && key === 'iv') return '이것까지 다르게 하면 무엇 때문에 결과가 달라졌는지 알 수 없어요.';
    return '우리가 저울로 재는 것은 무엇일까요?';
  }
  const sortCount = () => S.sort.placed.iv.length + S.sort.placed.cv.length + S.sort.placed.dv.length;
  function drawSortOverlay(t) {
    const L = LAY.sort, deck = S.sort.deck;
    if (!deck) return;
    txt('🗂️ 변인 분류하기: 카드를 알맞은 상자에 넣어요', L.title.x, L.title.y, fj(LAY.kind === 'tall' ? 18 : 21), '#1b2333');
    Object.keys(L.boxes).forEach((k) => {
      const bx = L.boxes[k], info = BOXES[k];
      softShadow(() => { ctx.fillStyle = info.soft; rr(bx.x, bx.y, bx.w, bx.h, 16); ctx.fill(); }, 10, 3);
      ctx.strokeStyle = rgba(info.col, 0.45); ctx.lineWidth = 2; ctx.setLineDash([7, 5]); rr(bx.x, bx.y, bx.w, bx.h, 16); ctx.stroke(); ctx.setLineDash([]);
      if (deck.hoverT === k) breathe(bx.x, bx.y, bx.w, bx.h, 16, COL.good);
      txt(info.name, bx.x + 14, bx.y + 20, f(17, 800), info.col, 'left');
      txt(info.sub, bx.x + 14, bx.y + 41, f(13, 700), '#5d6879', 'left');
      txt(S.sort.placed[k].length + '장', bx.x + bx.w - 14, bx.y + 20, f(13, 800), rgba(info.col, 0.8), 'right');
    });
    ctx.fillStyle = 'rgba(100,116,139,.08)'; rr(L.tray.x, L.tray.y, L.tray.w, L.tray.h, 16); ctx.fill();
    if (sortCount() < 6) txt('✋ 카드를 끌어 상자에 넣으세요', L.tray.x + L.tray.w / 2, L.tray.y + L.tray.h - 16, f(13, 700), '#7a8596');
    deck.draw((c, x, y, w, h, shadowPass) => {
      const info = c.placed ? BOXES[c.box] : null;
      ctx.fillStyle = info ? '#fff' : '#fff'; rr(x, y, w, h, 12); ctx.fill();
      if (shadowPass) return;
      ctx.fillStyle = info ? info.col : '#94a3b8'; rr(x, y, 8, h, 4); ctx.fill();
      drawLines(c.t, x + w / 2 + 4, y + h / 2 + 1, w - 26, 15, '#1b2333', { weight: 800 });
      if (c.placed) D.check(x + w - 14, y + 13, 8, 1);
    });
    void t;
  }

  /* =========================================================
     🔁 탐구 과정 순서도 오버레이 (3단계 미션 3)
     ========================================================= */
  const FLOW = [
    { id: 'f1', t: '문제 인식', ex: '창가 빨래가 더 빨리 마른 까닭은?' },
    { id: 'f2', t: '가설 설정', ex: '바람이 불면 더 빨리 마를 것이다' },
    { id: 'f3', t: '탐구 설계', ex: '바람만 다르게, 나머지는 같게' },
    { id: 'f4', t: '탐구 수행', ex: '10분마다 질량 측정' },
    { id: 'f5', t: '자료 해석', ex: 'A의 질량이 더 빨리 줄었다' },
    { id: 'f6', t: '결론 도출', ex: '가설이 옳다' },
  ];
  function flowSlot(i) { const L = LAY.flow; return { x: L.slots[i][0], y: L.slots[i][1], w: L.sw, h: L.sh }; }
  function resetFlow() {
    const L = LAY.flow;
    S.flow.n = 0; S.flow.segP = [0, 0, 0, 0, 0, 0]; S.flow.loopP = 0;
    const deck = makeDeck({
      findTarget: (c, p) => { for (let i = 0; i < 6; i++) if (inR(p, flowSlot(i), 4)) return i; return null; },
      onDrop: (c, p) => {
        let si = -1;
        for (let i = 0; i < 6; i++) if (inR(p, flowSlot(i), 6)) si = i;
        if (si < 0) return null;
        return flowTry(c, si);
      },
      onTap: (c) => flowTry(c, S.flow.n),
    });
    const order = shuffled([0, 1, 2, 3, 4, 5], 5);
    FLOW.forEach((fc, i) => { const h = L.home[order[i]]; deck.add({ id: fc.id, idx: i, t: fc.t, ex: fc.ex, hx: h[0], hy: h[1], w: L.sw, h: L.sh }); });
    S.flow.deck = deck;
  }
  function flowTry(c, si) {
    if (si >= 6) return null;
    if (si !== S.flow.n || c.idx !== S.flow.n) return { msg: '이 단계보다 먼저 해야 할 일이 있어요' };
    const s = flowSlot(si);
    const k = S.flow.n;
    S.flow.n++;
    return { ok: true, x: s.x, y: s.y, done: () => {
      if (k > 0) SciSim.tween(S.flow.segP, { [k]: 1 }, { duration: 0.4, ease: 'outCubic' });
      if (S.flow.n === 6) SciSim.tween(S.flow, { loopP: 1 }, { duration: 0.7, ease: 'inOutCubic', delay: 0.35, onDone: () => { Sound.success(); } });
    } };
  }
  function flowAnchor(i, side) {
    const s = flowSlot(i);
    if (side === 'r') return { x: s.x + s.w, y: s.y + s.h / 2 };
    if (side === 'l') return { x: s.x, y: s.y + s.h / 2 };
    if (side === 't') return { x: s.x + s.w / 2, y: s.y };
    return { x: s.x + s.w / 2, y: s.y + s.h };
  }
  function flowLink(i) {
    // i번째 칸에서 i+1번째 칸으로 가는 화살표의 시작·끝
    const a = flowSlot(i), b = flowSlot(i + 1);
    if (Math.abs(a.y - b.y) < 2) return a.x < b.x ? [flowAnchor(i, 'r'), flowAnchor(i + 1, 'l')] : [flowAnchor(i, 'l'), flowAnchor(i + 1, 'r')];
    return [flowAnchor(i, 'b'), flowAnchor(i + 1, 't')];
  }
  function drawFlowOverlay(t) {
    const L = LAY.flow, deck = S.flow.deck;
    if (!deck) return;
    txt('🔁 과학적 탐구 과정을 순서대로 놓아요', L.title.x, L.title.y, fj(LAY.kind === 'tall' ? 18 : 21), '#1b2333');
    // 칸 사이 화살표(놓을 때마다 빛나며 그려짐)
    for (let i = 0; i < 5; i++) {
      const [a, b] = flowLink(i);
      D.arrow(a.x + (a.x === b.x ? 0 : Math.sign(b.x - a.x) * 4), a.y + (a.x === b.x ? 4 : 0), b.x - (a.x === b.x ? 0 : Math.sign(b.x - a.x) * 4), b.y - (a.x === b.x ? 4 : 0), { color: '#cbd5e1', width: 3, head: 10 });
      const p = S.flow.segP[i + 1];
      if (p > 0.01) {
        const ex = a.x + (b.x - a.x) * p, ey = a.y + (b.y - a.y) * p;
        ctx.save(); ctx.shadowColor = 'rgba(20,160,88,.8)'; ctx.shadowBlur = 10;
        D.arrow(a.x + (a.x === b.x ? 0 : Math.sign(b.x - a.x) * 4), a.y + (a.x === b.x ? 4 : 0), ex - (a.x === b.x ? 0 : Math.sign(b.x - a.x) * 4 * p), ey - (a.x === b.x ? 4 * p : 0), { color: COL.good, width: 4, head: 12 });
        ctx.restore();
      }
    }
    // 칸
    for (let i = 0; i < 6; i++) {
      const s = flowSlot(i);
      const filled = i < S.flow.n;
      ctx.fillStyle = filled ? '#f3faf6' : 'rgba(255,255,255,.75)'; rr(s.x, s.y, s.w, s.h, 14); ctx.fill();
      ctx.strokeStyle = filled ? rgba(COL.good, 0.5) : '#b8c3d3'; ctx.lineWidth = 2; ctx.setLineDash(filled ? [] : [7, 5]); rr(s.x, s.y, s.w, s.h, 14); ctx.stroke(); ctx.setLineDash([]);
      if (!filled) txt(String(i + 1), s.x + s.w / 2, s.y + s.h / 2, fj(26), i === S.flow.n ? rgba(COL.good, 0.6) : '#cbd5e1');
      if (i === S.flow.n && deck.drag) breathe(s.x, s.y, s.w, s.h, 14, COL.good);
      else if (i === S.flow.n) breathe(s.x, s.y, s.w, s.h, 14, '#94a3b8');
    }
    // 되돌이 화살표: 결론 → 가설 설정 (흐르는 점선)
    if (S.flow.loopP > 0.01) drawLoopArrow(t);
    ctx.fillStyle = 'rgba(100,116,139,.08)'; rr(L.tray.x, L.tray.y, L.tray.w, L.tray.h, 16); ctx.fill();
    deck.draw((c, x, y, w, h, shadowPass) => {
      ctx.fillStyle = '#fff'; rr(x, y, w, h, 12); ctx.fill();
      if (shadowPass) return;
      ctx.fillStyle = c.placed ? COL.good : COL.sci; rr(x, y, 8, h, 4); ctx.fill();
      txt(c.t, x + 18, y + 22, fj(19), c.placed ? '#0b6b39' : '#1b2333', 'left');
      drawLines('예) ' + c.ex, x + 18, y + 50, w - 30, 13, '#5d6879', { align: 'left', weight: 700 });
      if (c.placed) txt(String(c.idx + 1), x + w - 16, y + 20, f(13, 800), rgba(COL.good, 0.8));
    });
  }
  function drawLoopArrow(t) {
    const L = LAY.flow, p = S.flow.loopP;
    const tall = LAY.kind === 'tall';
    const pts = [];
    if (tall) {
      const s6 = flowSlot(5), s2 = flowSlot(1);
      const xr = Math.min(LAY.W - 8, s2.x + s2.w + 16);
      pts.push([s6.x + s6.w / 2, s6.y + s6.h], [s6.x + s6.w / 2, s6.y + s6.h + 20], [xr, s6.y + s6.h + 20], [xr, s2.y + s2.h / 2], [s2.x + s2.w + 3, s2.y + s2.h / 2]);
    } else {
      const s6 = flowSlot(5), s2 = flowSlot(1);
      const a = { x: s6.x + s6.w * 0.62, y: s6.y }, b = { x: s2.x + s2.w * 0.32, y: s2.y + s2.h + 3 };
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const c1 = { x: a.x, y: a.y - 40 }, c2 = { x: b.x, y: b.y + 40 };
        const x = Math.pow(1 - u, 3) * a.x + 3 * Math.pow(1 - u, 2) * u * c1.x + 3 * (1 - u) * u * u * c2.x + u * u * u * b.x;
        const y = Math.pow(1 - u, 3) * a.y + 3 * Math.pow(1 - u, 2) * u * c1.y + 3 * (1 - u) * u * u * c2.y + u * u * u * b.y;
        pts.push([x, y]);
      }
    }
    // 진행도만큼 그리기
    let total = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    const lim = total * p;
    ctx.save(); ctx.strokeStyle = COL.purple; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash([9, 7]); ctx.lineDashOffset = RM ? 0 : -t * 30;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    let acc = 0, end = pts[0], prev = pts[0];
    for (let i = 1; i < pts.length; i++) {
      if (acc + seg[i - 1] >= lim) { const k = (lim - acc) / seg[i - 1]; end = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; prev = pts[i - 1]; ctx.lineTo(end[0], end[1]); break; }
      acc += seg[i - 1]; ctx.lineTo(pts[i][0], pts[i][1]); end = pts[i]; prev = pts[i - 1];
    }
    ctx.stroke(); ctx.setLineDash([]);
    if (p > 0.95) {
      const ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
      ctx.fillStyle = COL.purple; ctx.beginPath();
      ctx.moveTo(end[0] + Math.cos(ang) * 4, end[1] + Math.sin(ang) * 4);
      ctx.lineTo(end[0] - Math.cos(ang) * 10 - Math.sin(ang) * 7, end[1] - Math.sin(ang) * 10 + Math.cos(ang) * 7);
      ctx.lineTo(end[0] - Math.cos(ang) * 10 + Math.sin(ang) * 7, end[1] - Math.sin(ang) * 10 - Math.cos(ang) * 7);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    if (p > 0.6) {
      ctx.save(); ctx.globalAlpha = clamp((p - 0.6) / 0.4, 0, 1);
      pill(L.loopLabel.x, L.loopLabel.y, '🔁 가설이 맞지 않으면 가설을 수정해 다시 탐구', { bg: '#f3eeff', color: '#6d28d9', size: 13.5, h: 28, border: '#d9c8fb', shadow: true });
      ctx.restore();
    }
  }

  /* =========================================================
     📝 탐구 계획서 (4단계 미션 2)
     ========================================================= */
  const PLAN_ROWS = [
    { key: 'q', name: '탐구 문제' }, { key: 'h', name: '가설' }, { key: 'iv', name: '조작 변인' },
    { key: 'cv1', name: '통제 변인 ①' }, { key: 'cv2', name: '통제 변인 ②' }, { key: 'dv', name: '종속 변인' }, { key: 'safe', name: '안전·주의' },
  ];
  const SCEN = [
    { tab: '🍞 식빵 곰팡이', short: '🍞 식빵 곰팡이', situation: '장마철에 식빵에 곰팡이가 빨리 생겨요.',
      q: [['빵에 물기가 많으면 곰팡이가 더 빨리 생길까?'], ['곰팡이는 몸에 해로울까?', '중요한 질문이지만 무엇을 바꾸고 측정할지 분명하지 않아요.']],
      h: [['빵에 물기가 많으면 곰팡이가 더 빨리 생길 것이다.'], ['식빵에 곰팡이가 생겼다.', '이것은 관찰 사실이에요. 가설은 실험으로 확인할 예상이에요.']],
      iv: [['빵에 뿌린 물의 양'], ['곰팡이가 덮은 칸 수', '이것은 측정하는 결과(종속 변인)예요.']],
      cv: [['빵의 종류와 크기'], ['보관 장소의 온도'], ['빵을 넣은 봉지의 종류'], ['빵에 뿌린 물의 양', '이 실험에서 일부러 다르게 하는 조건(조작 변인)이에요.']],
      dv: [['매일 같은 시각, 곰팡이가 덮은 모눈 칸 수'], ['빵에 뿌린 물의 양', '이것은 일부러 다르게 하는 조건(조작 변인)이에요.']],
      safe: [['곰팡이가 핀 봉지는 열지 않고 관찰한 뒤 그대로 버린다'], ['곰팡이 냄새를 가까이에서 맡아 본다', '곰팡이 포자를 들이마실 수 있어 위험해요.']] },
    { tab: '🌱 강낭콩', short: '🌱 강낭콩', situation: '교실 창가의 강낭콩은 잘 자라는데, 안쪽 강낭콩은 잘 자라지 않아요.',
      q: [['빛을 받는 시간이 길면 강낭콩이 더 잘 자랄까?'], ['강낭콩은 왜 콩이라고 부를까?', '관찰한 현상(자라는 정도)과 관계없고 실험으로 확인하기 어려워요.']],
      h: [['빛을 받는 시간이 길면 강낭콩이 더 잘 자랄 것이다.'], ['빛을 받는 시간이 길면 강낭콩이 더 잘 자랄까?', '질문 형태예요. 가설은 질문에 대한 잠정적인 답이에요.']],
      iv: [['하루에 빛을 받는 시간'], ['일주일 동안 자란 줄기 길이', '이것은 측정하는 결과(종속 변인)예요.']],
      cv: [['화분 크기와 흙의 양'], ['주는 물의 양'], ['교실 온도'], ['하루에 빛을 받는 시간', '이 실험에서 일부러 다르게 하는 조건(조작 변인)이에요.']],
      dv: [['일주일 동안 자란 줄기의 길이(cm)'], ['주는 물의 양', '이것은 같게 유지하는 조건(통제 변인)이에요.']],
      safe: [['흙을 만진 뒤에는 손을 깨끗이 씻는다'], ['빨리 자라게 하려고 한쪽 화분에만 물을 더 준다', '통제 변인이 달라져요.']] },
    { tab: '📱 휴대폰 배터리', short: '📱 휴대폰 배터리', situation: '휴대폰 배터리가 너무 빨리 닳아요.',
      q: [['화면이 밝을수록 배터리가 더 빨리 닳을까?'], ['어떤 휴대폰이 가장 멋있을까?', '기준이 모호해 실험으로 답할 수 없어요.']],
      h: [['화면이 밝을수록 배터리가 더 빨리 닳을 것이다.'], ['배터리가 빨리 닳았다.', '이것은 관찰 사실이에요. 가설은 실험으로 확인할 예상이에요.']],
      iv: [['화면 밝기'], ['30분 동안 줄어든 배터리 양', '이것은 측정하는 결과(종속 변인)예요.']],
      cv: [['같은 휴대폰과 같은 영상'], ['소리 크기'], ['시작할 때 배터리 양'], ['화면 밝기', '이 실험에서 일부러 다르게 하는 조건(조작 변인)이에요.']],
      dv: [['30분 동안 줄어든 배터리 양(%)'], ['소리 크기', '이것은 같게 유지하는 조건(통제 변인)이에요.']],
      safe: [['충전 중이거나 뜨거워진 휴대폰으로는 실험하지 않는다'], ['배터리가 뜨거워져도 계속 실험한다', '뜨거워진 배터리는 위험할 수 있어요. 바로 실험을 멈춰요.']] },
  ];
  function planOptions(key) {
    const sc = SCEN[S.plan.scen];
    const pool = key === 'cv1' || key === 'cv2' ? sc.cv : sc[key];
    const filled = S.plan.filled;
    return pool
      .map((o, i) => ({ text: o[0], ok: !o[1], fb: o[1] || '', i }))
      .filter((o) => !(o.ok && (key === 'cv1' || key === 'cv2') && (filled[3] === o.text || filled[4] === o.text)));
  }
  const planNext = () => { for (let i = 0; i < 7; i++) if (!S.plan.filled[i]) return i; return -1; };
  function planRowRect(i) {
    const P = LAY.plan;
    return { x: P.paper.x + P.slotX - P.paper.x, y: P.rowY + i * P.rowH, w: P.slotW, h: P.slotH };
  }
  function resetPlan(scen) {
    S.plan.scen = scen || 0;
    S.plan.filled = [null, null, null, null, null, null, null];
    S.plan.stamp = 0; S.plan.stampOn = false;
    rebuildCands();
  }
  function rebuildCands() {
    const P = LAY.plan;
    const ni = planNext();
    const deck = makeDeck({
      findTarget: (c, p) => (ni >= 0 && inR(p, planRowRect(ni), 8) ? ni : null),
      onDrop: (c, p) => (ni >= 0 && inR(p, planRowRect(ni), 10) ? planTry(c, ni) : null),
      onTap: (c) => (ni >= 0 ? planTry(c, ni) : null),
    });
    S.plan.deck = deck;
    if (ni < 0) return;
    const opts = shuffled(planOptions(PLAN_ROWS[ni].key), 3 + ni * 7 + S.plan.scen * 13);
    opts.forEach((o, i) => {
      const c = deck.add({ id: 'p' + i, text: o.text, ok: o.ok, fb: o.fb, hx: P.cardX, hy: P.cardY + i * P.cardDY, w: P.cardW, h: P.cardH });
      if (!RM) { c.alpha = 0; c.x = c.hx + 40; SciSim.tween(c, { alpha: 1, x: c.hx }, { duration: 0.35, ease: 'outCubic', delay: 0.06 * i }); }
    });
  }
  function planTry(c, ni) {
    if (!c.ok) return { msg: c.fb || '이 칸에 알맞지 않아요.' };
    const r = planRowRect(ni);
    return { ok: true, x: r.x, y: r.y, w: r.w, h: r.h, done: () => {
      S.plan.filled[ni] = c.text;
      if (planNext() < 0) { S.plan.stampOn = true; S.plan.stamp = 0; SciSim.tween(S.plan, { stamp: 1 }, { duration: 0.6, ease: 'outBack', delay: 0.15 }); setTimeout(() => Sound.success(), 250); }
      rebuildCands();
    } };
  }
  function planDown(p) {
    const P = LAY.plan;
    for (let i = 0; i < 3; i++) {
      const r = { x: P.tabs.x + i * P.tabs.dx, y: P.tabs.y, w: P.tabs.w, h: P.tabs.h };
      if (inR(p, r, 3)) { pickScenario(i); return false; }
    }
    for (let i = 0; i < 7; i++) {
      if (S.plan.filled[i] && inR(p, planRowRect(i), 2)) {
        S.plan.filled[i] = null; S.plan.stampOn = false; S.plan.stamp = 0;
        Sound.click(); rebuildCands();
        return false;
      }
    }
    return S.plan.deck ? S.plan.deck.down(p) : false;
  }
  function pickScenario(i) {
    if (i === S.plan.scen) return;
    const any = S.plan.filled.some(Boolean);
    if (any && !(S.plan.pendingTab === i && nowS() - S.plan.pendingT < 3)) {
      S.plan.pendingTab = i; S.plan.pendingT = nowS();
      Sound.click();
      toast('한 번 더 누르면 ' + SCEN[i].tab + '(으)로 바꿔요. 지금 쓴 계획서는 지워져요', null, 2800);
      return;
    }
    S.plan.pendingTab = -1;
    resetPlan(i);
    Sound.click();
    toast('📝 ' + SCEN[i].tab + ' 탐구 계획서를 새로 써요', 'good', 1800);
  }
  function paintPlanBg() {
    const g = ctx.createLinearGradient(0, 0, LAY.W, LAY.H);
    g.addColorStop(0, '#d9b287'); g.addColorStop(1, '#bf8f5e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, LAY.W, LAY.H);
    ctx.strokeStyle = 'rgba(110,70,30,.13)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) { const y = i * (LAY.H / 25); ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(LAY.W * 0.3, y + 6, LAY.W * 0.6, y - 7, LAY.W, y + 3); ctx.stroke(); }
  }
  function paintPaper() {
    const P = LAY.plan.paper;
    ctx.fillStyle = '#fffdf6'; ctx.fillRect(0, 0, P.w, P.h);
    const r = mulberry32(99);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = 'rgba(120,100,60,' + (0.02 + r() * 0.05) + ')'; ctx.fillRect(r() * P.w, r() * P.h, 1.2, 1.2); }
    ctx.strokeStyle = 'rgba(56,103,244,.08)'; ctx.lineWidth = 1;
    for (let y = 30; y < P.h; y += 27) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(P.w, y); ctx.stroke(); }
  }
  function drawPlan(off, t) {
    const P = LAY.plan;
    ctx.save(); ctx.translate(off * 0.6, 0);
    blit(layer('planBg|' + LAY.kind, LAY.W, LAY.H, paintPlanBg), 0, 0);
    ctx.restore();
    ctx.save(); ctx.translate(off, 0);
    // 시나리오 탭
    for (let i = 0; i < 3; i++) {
      const x = P.tabs.x + i * P.tabs.dx, on = i === S.plan.scen;
      const pend = S.plan.pendingTab === i && nowS() - S.plan.pendingT < 3;
      softShadow(() => { ctx.fillStyle = on ? '#fff' : pend ? '#fff4dc' : 'rgba(255,255,255,.62)'; rr(x, P.tabs.y, P.tabs.w, P.tabs.h, 20); ctx.fill(); }, on ? 10 : 4, on ? 3 : 1);
      if (on) { ctx.strokeStyle = COL.sci; ctx.lineWidth = 2.5; rr(x, P.tabs.y, P.tabs.w, P.tabs.h, 20); ctx.stroke(); }
      txt(SCEN[i].tab, x + P.tabs.w / 2, P.tabs.y + P.tabs.h / 2 + 1, f(14.5, 800), on ? '#1b2333' : '#5d6879');
    }
    // 종이
    const pp = P.paper;
    softShadow(() => { ctx.fillStyle = '#fffdf6'; ctx.fillRect(pp.x, pp.y, pp.w, pp.h); }, 16, 6, 'rgba(60,40,20,.3)');
    blit(layer('paper|' + LAY.kind, pp.w, pp.h, paintPaper), pp.x, pp.y);
    // 집게
    const cx = pp.x + pp.w / 2;
    const cg = ctx.createLinearGradient(0, pp.y - 12, 0, pp.y + 14);
    cg.addColorStop(0, '#9aa5b6'); cg.addColorStop(0.5, '#e8edf3'); cg.addColorStop(1, '#6b7686');
    ctx.fillStyle = cg; rr(cx - 46, pp.y - 10, 92, 22, 6); ctx.fill();
    ctx.strokeStyle = '#5b6574'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx - 20, pp.y - 12, 8, Math.PI, 0); ctx.arc(cx + 20, pp.y - 12, 8, Math.PI, 0); ctx.stroke();
    const sc = SCEN[S.plan.scen];
    txt('📝 나의 탐구 계획서', pp.x + 16, pp.y + 28, fj(LAY.kind === 'tall' ? 20 : 22), '#1b2333', 'left');
    drawLines('문제 상황: ' + sc.situation, pp.x + 16, pp.y + P.headH - 12, pp.w - 32, 13.5, '#7c4a00', { align: 'left', weight: 700 });
    const ni = planNext();
    const deck = S.plan.deck;
    PLAN_ROWS.forEach((row, i) => {
      const r = planRowRect(i);
      txt(row.name, P.labX, r.y + r.h / 2, f(14, 800), i === ni ? '#0b6b39' : '#3a4456', 'left');
      const text = S.plan.filled[i];
      if (text) {
        ctx.fillStyle = 'rgba(20,160,88,.07)'; rr(r.x, r.y, r.w, r.h, 10); ctx.fill();
        ctx.strokeStyle = rgba(COL.good, 0.35); ctx.lineWidth = 1.5; rr(r.x, r.y, r.w, r.h, 10); ctx.stroke();
        drawLines(text, r.x + 12, r.y + r.h / 2 + 1, r.w - 24, 14, '#1b2333', { align: 'left', weight: 700, lh: 18 });
      } else {
        ctx.strokeStyle = i === ni ? rgba(COL.good, 0.5) : '#c9d2df'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); rr(r.x, r.y, r.w, r.h, 10); ctx.stroke(); ctx.setLineDash([]);
        if (i === ni) { breathe(r.x, r.y, r.w, r.h, 10, COL.good); txt('👉 알맞은 카드를 놓아요', r.x + r.w / 2, r.y + r.h / 2, f(13, 700), rgba(COL.good, 0.75)); }
      }
    });
    if (S.plan.stampOn) drawStamp(P.cand.x + P.cand.w / 2, P.cand.y + (LAY.kind === 'tall' ? 150 : 200), '탐구 계획 완료!', S.plan.stamp, '#e2464b', -0.21, LAY.kind === 'tall' ? 1.0 : 1.15);
    if (isNew('plan')) newRing(pp.x, pp.y, pp.w, pp.h);
    // 후보 카드 영역
    const cd = P.cand;
    ctx.fillStyle = 'rgba(255,255,255,.28)'; rr(cd.x, cd.y, cd.w, cd.h, 16); ctx.fill();
    if (ni >= 0) {
      txt('✋ ' + PLAN_ROWS[ni].name + ' 카드 고르기', cd.x + 12, cd.y + (LAY.kind === 'tall' ? 18 : 24), f(15, 800), '#3a2a12', 'left');
      if (LAY.kind === 'wide') txt('끌어 놓거나 눌러서 넣어요', cd.x + 12, cd.y + 46, f(12.5, 700), '#5c4526', 'left');
    } else {
      drawLines('🎉 모든 칸을 채웠어요! 칸을 누르면 다시 고칠 수 있어요.', cd.x + cd.w / 2, cd.y + 60, cd.w - 30, 15, '#3a2a12', { weight: 800 });
    }
    if (deck) {
      deck.cards.forEach((c) => { if (!c.dragging && !c.ret && !c.placed && !RM) c.y = c.hy + Math.sin(t * 1.6 + c.hx * 0.01 + c.hy * 0.05) * 1; });
      deck.draw((c, x, y, w, h, shadowPass) => {
        ctx.fillStyle = '#fff'; rr(x, y, w, h, 12); ctx.fill();
        if (shadowPass) return;
        ctx.fillStyle = c.placed ? COL.good : COL.sci; rr(x, y, 7, h, 3.5); ctx.fill();
        drawLines(c.text, x + 16, y + h / 2 + 1, w - 28, c.placed ? 14 : 14.5, '#1b2333', { align: 'left', weight: 700, lh: 18 });
      });
    }
    ctx.restore();
  }

  /* =========================================================
     전체 그리기
     ========================================================= */
  function drawScene(name, off, t) {
    if (name === 'home') drawHome(off, t);
    else if (name === 'bench') drawBench(off, t);
    else drawPlan(off, t);
  }
  function draw(t) {
    view.clear(BG);
    const W = LAY.W, cx = S.cam.x;
    const vis = [];
    SCENES.forEach((n, i) => { const off = i * W - cx; if (off > -W && off < W) vis.push({ n, off }); });
    // 도착할 장면을 나중에(배경은 이동 진행만큼 서서히)
    vis.sort((a, b) => (a.n === S.scene) - (b.n === S.scene));
    vis.forEach((v, i) => {
      if (i > 0 && vis.length > 1) {
        ctx.save(); ctx.globalAlpha = clamp(1 - Math.abs(v.off) / W, 0, 1);
        ctx.fillStyle = v.n === 'plan' ? '#cfa274' : BG;
        ctx.fillRect(0, 0, W, LAY.H);
        ctx.restore();
      }
      drawScene(v.n, v.off, t);
    });
    // 오버레이(실험대를 흐리게)
    if (S.overlay && S.scene === 'bench' && !S.cam.moving) {
      ctx.save(); ctx.globalAlpha = S.overlayA;
      ctx.fillStyle = 'rgba(246,248,252,.95)'; ctx.fillRect(0, 0, W, LAY.H);
      ctx.translate(0, (1 - S.overlayA) * 14);
      if (S.overlay === 'sort') drawSortOverlay(t); else drawFlowOverlay(t);
      ctx.restore();
    }
    drawFx();
    // 타임랩스: 비네팅 + ⏩ 배지
    const lapse = (S.scene === 'home' && H.lapse) || (S.scene === 'bench' && B.lapse);
    S.vig = approachV(S.vig || 0, lapse ? 1 : 0, 1 / 60, 6);
    if (S.vig > 0.01) {
      const g = ctx.createRadialGradient(W / 2, LAY.H / 2, Math.min(W, LAY.H) * 0.35, W / 2, LAY.H / 2, Math.max(W, LAY.H) * 0.75);
      g.addColorStop(0, 'rgba(20,30,50,0)'); g.addColorStop(1, 'rgba(20,30,50,' + (0.32 * S.vig) + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, LAY.H);
      ctx.save(); ctx.globalAlpha = S.vig;
      const lab = S.scene === 'home' ? '⏩ 타임랩스 · ' + clockText(H.min) : '⏩ 타임랩스 · ' + Math.round(B.t) + '분';
      pill(W - 12, 24, lab, { align: 'right', bg: 'rgba(27,35,51,.85)', size: 14, h: 30 });
      ctx.restore();
    }
  }
  const approachV = (cur, target, dt, rate) => target + (cur - target) * Math.exp(-rate * dt);

  /* =========================================================
     입력
     ========================================================= */
  const handlers = {
    down(p) {
      if (S.cam.moving) return false;
      if (S.overlay === 'sort' && S.sort.deck) return S.sort.deck.down(p);
      if (S.overlay === 'flow' && S.flow.deck) return S.flow.deck.down(p);
      if (S.scene === 'home' && has('home')) return homeDown(p);
      if (S.scene === 'bench' && has('bench')) return benchDown(p);
      if (S.scene === 'plan' && has('plan')) return planDown(p);
      return false;
    },
    move(p) { const d = activeDeck(); if (d) d.move(p); },
    up(p) { const d = activeDeck(); if (d) d.up(p); },
    hover(p) {
      S.hover = null;
      if (S.cam.moving) return null;
      if (S.overlay) { const d = activeDeck(); return d && d.hit(p) ? 'grab' : null; }
      if (S.scene === 'home') {
        const s = homeHotspots().find((h) => inR(p, h.r, 6));
        if (s) { S.hover = s.id; return 'pointer'; }
      } else if (S.scene === 'bench') {
        const h = boardHit(p) || benchHit(p);
        if (h && benchEditable()) { S.hover = h.k + h.part; return 'pointer'; }
      } else if (S.scene === 'plan') {
        const P = LAY.plan;
        for (let i = 0; i < 3; i++) if (inR(p, { x: P.tabs.x + i * P.tabs.dx, y: P.tabs.y, w: P.tabs.w, h: P.tabs.h })) return 'pointer';
        for (let i = 0; i < 7; i++) if (S.plan.filled[i] && inR(p, planRowRect(i))) return 'pointer';
        if (S.plan.deck && S.plan.deck.hit(p)) return 'grab';
      }
      return null;
    },
  };
  function activeDeck() {
    if (S.overlay === 'sort') return S.sort.deck;
    if (S.overlay === 'flow') return S.flow.deck;
    if (S.scene === 'plan') return S.plan.deck;
    return null;
  }
  function relayout() {
    // 배치가 바뀌면(가로형 ↔ 세로형) 카드 위치를 새로 계산
    if (S.sort.deck) {
      const L = LAY.sort, order = shuffled([0, 1, 2, 3, 4, 5], 11);
      const cnt = { iv: 0, cv: 0, dv: 0 };
      S.sort.placed = { iv: [], cv: [], dv: [] };
      const placedIds = new Set(S.sort.deck.cards.filter((c) => c.placed).map((c) => c.id));
      S.sort.deck.cards.forEach((c) => {
        const i = VARS.findIndex((v) => v.id === c.id);
        const h = L.home[order[i]];
        c.hx = h[0]; c.hy = h[1]; c.w = L.cw; c.h = L.ch;
        if (placedIds.has(c.id)) { const s = boxSlot(c.box, cnt[c.box]++); S.sort.placed[c.box].push(c.id); c.x = s.x; c.y = s.y; }
        else { c.x = c.hx; c.y = c.hy; }
      });
    }
    if (S.flow.deck) {
      const L = LAY.flow, order = shuffled([0, 1, 2, 3, 4, 5], 5);
      S.flow.deck.cards.forEach((c) => {
        const h = L.home[order[c.idx]];
        c.hx = h[0]; c.hy = h[1]; c.w = L.sw; c.h = L.sh;
        if (c.placed) { const s = flowSlot(c.idx); c.x = s.x; c.y = s.y; } else { c.x = c.hx; c.y = c.hy; }
      });
    }
    if (S.plan.deck) rebuildCands();
    syncBenchLayout(true);
  }

  /* =========================================================
     DOM: 조작 버튼 · 조건 비교표 · 실험 결과 표
     ========================================================= */
  const hintEl = $('#stageHint');
  function hint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(hint.t); hint.t = setTimeout(hideHint, ms || 5000);
  }
  function hideHint() { hintEl.classList.add('hide'); }
  const btn = {
    hour: $('#hourBtn'), rehang: $('#rehangBtn'), benchReset: $('#benchResetBtn'),
    ten: $('#tenBtn'), rec: $('#recBtn'), redo: $('#redoBtn'),
  };
  btn.hour.addEventListener('click', startHour);
  btn.rehang.addEventListener('click', () => { Sound.click(); resetHome(); syncDom(); });
  btn.benchReset.addEventListener('click', () => { Sound.click(); setUnfairBench(); syncDom(); });
  btn.ten.addEventListener('click', startTen);
  btn.rec.addEventListener('click', doRecord);
  btn.redo.addEventListener('click', () => { Sound.click(); resetRun(true); });
  const seg = $('#sceneSeg');
  seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    Sound.click();
    closeOverlay();
    goScene(b.dataset.scene);
  }));
  function shown(el, on) { el.hidden = !on; }
  let lastNew = {};
  function syncDom() {
    if (!LAY) return;
    const lv = level(), free = freeMode();
    const sc = S.scene, ov = S.overlay;
    const homeCtl = sc === 'home' && has('skip') && (lv === 0 || free);
    const designCtl = sc === 'bench' && has('bench') && benchMode() === 'design' && !ov;
    const runCtl = sc === 'bench' && has('clock') && benchMode() === 'graph' && !ov;
    shown(btn.hour, homeCtl); shown(btn.rehang, homeCtl);
    shown(btn.benchReset, designCtl);
    shown(btn.ten, runCtl); shown(btn.redo, runCtl);
    shown(btn.rec, runCtl && has('record'));
    const any = homeCtl || designCtl || runCtl;
    shown($('#ctrlCard'), any);
    // 버튼 상태
    btn.hour.disabled = !!H.lapse || !!H.sol || (!free && H.min >= 60);
    const t10 = Math.round(B.t);
    btn.ten.disabled = !!B.lapse || t10 >= 60 || recordLock();
    btn.ten.title = recordLock() ? '먼저 기록해요' : '';
    btn.rec.disabled = !!B.lapse;
    btn.redo.disabled = !!B.lapse;
    btn.rec.classList.toggle('pulse', !!(M3_1 && active(M3_1) && !recordedNow() && !B.lapse));
    const title = $('#ctrlTitle'), note = $('#ctrlNote');
    if (homeCtl) {
      title.textContent = '🏠 집에서 관찰하기';
      note.textContent = H.lapse ? '⏩ 시간이 빠르게 흐르고 있어요…' : H.min >= 60 ? '지금 ' + clockText(H.min) + ' · 수건을 눌러 만져 보세요' : '지금 ' + clockText(H.min) + ' · 두 곳 모두 물 30 g에 적신 수건';
    } else if (designCtl) {
      title.textContent = '🧪 실험 장치 준비';
      note.textContent = '수건 · 배지 · 물컵 · 선풍기를 눌러 조건을 바꿔요';
    } else if (runCtl) {
      title.textContent = '⏱ 측정하기 · 지금 ' + t10 + '분';
      note.textContent = B.lapse ? '⏩ 10분이 흐르는 중…' : recordLock() ? '📍 먼저 ' + t10 + '분의 질량을 기록해요' : t10 >= 60 ? '60분까지 측정했어요' : recordedNow() ? '⏩ 10분 지나기를 눌러요' : '📍 기록하기를 눌러 ' + t10 + '분의 질량을 기록해요';
    }
    // 새 도구 강조(버튼)
    [['skip', [btn.hour]], ['clock', [btn.ten]], ['record', [btn.rec]]].forEach(([fname, els]) => {
      const nw = isNew(fname);
      if (nw && !lastNew[fname]) els.forEach((e) => { e.classList.remove('feature-new'); void e.offsetWidth; e.classList.add('feature-new'); setTimeout(() => e.classList.remove('feature-new'), 4600); });
      lastNew[fname] = nw;
    });
    // 아래 카드
    const condOn = has('table') && sc === 'bench';
    const line = benchMode() === 'graph';
    shown($('#condCard'), condOn && (!line || true) && !(LAY.kind === 'tall' && !line));
    shown($('#condFull'), !line && LAY.kind === 'wide');
    shown($('#condLine'), line);
    $('#condCard').classList.toggle('line', line);
    shown($('#recCard'), has('record') && sc !== 'plan' && !(sc === 'home' && lv === 0 && !free));
    // 장면 이름 · 장면 고르기(자유 탐구)
    const lab = $('#sceneLabel');
    let ltxt = '';
    if (ov === 'sort') ltxt = '🗂️ 변인 분류하기 <small>· 조작 · 통제 · 종속 변인</small>';
    else if (ov === 'flow') ltxt = '🔁 탐구 과정 정리하기';
    else if (sc === 'home') ltxt = lv === 3 && !free ? '🏠 우리 집 <small>· 과학적 해결 방안 찾기</small>' : '🏠 우리 집 <small>· 장마철에 집 안에 넌 빨래</small>';
    else if (sc === 'bench') ltxt = '🧪 실험대 <small>· 💡 가설: 바람이 불면 빨래가 더 빨리 마를 것이다</small>';
    else ltxt = '📝 탐구 계획서 <small>· ' + SCEN[S.plan.scen].tab + '</small>';
    if (lab.innerHTML !== ltxt) lab.innerHTML = ltxt;
    shown(seg, free);
    seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
  }
  /* 조건 비교표(DOM) */
  function renderCond(noFlash) {
    const rowA = $('#condA'), rowB = $('#condB'), rowJ = $('#condJ');
    const prev = renderCond.prev || {};
    const cells = (k) => COND_ROWS.map((r) => r.val(B[k]));
    const a = cells('A'), b = cells('B');
    rowA.innerHTML = '<th>A</th>' + a.map((v, i) => '<td class="' + (!noFlash && prev.a && prev.a[i] !== v ? 'flash' : '') + '">' + v + '</td>').join('');
    rowB.innerHTML = '<th>B</th>' + b.map((v, i) => '<td class="' + (!noFlash && prev.b && prev.b[i] !== v ? 'flash' : '') + '">' + v + '</td>').join('');
    rowJ.innerHTML = '<th>판정</th>' + COND_ROWS.map((r) => { const j = judge(r.part); return '<td><span class="j ' + j.c + '">' + j.t + '</span></td>'; }).join('');
    renderCond.prev = { a, b };
    renderCondLine();
    clearTimeout(renderCond.t);
    renderCond.t = setTimeout(() => document.querySelectorAll('.cond-table td.flash').forEach((td) => td.classList.remove('flash')), 600);
  }
  /* 3단계부터 한 줄로 접힌 조건 요약 (자유 탐구에서 조건을 바꾸면 그대로 따라감) */
  function renderCondLine() {
    const el = $('#condLine');
    if (!el) return;
    const A = B.A, C = B.B;
    const diffs = [];
    if (A.fan !== C.fan) diffs.push('<span class="pill iv">🎛️ 바람</span>');
    if (A.cloth !== C.cloth) diffs.push('<span class="pill bad">✖ 수건 종류</span>');
    if (A.W0 !== C.W0) diffs.push('<span class="pill bad">✖ 물의 양</span>');
    if (A.shape !== C.shape) diffs.push('<span class="pill bad">✖ 펼친 모양</span>');
    const html = isFair()
      ? '⚖️ 공정한 실험: 바람만 다름 <span class="pill iv">🎛️ 바람</span><span class="pill">🔒 ' + (A.cloth === 'cotton' ? '면' : '극세사') + ' · 물 ' + A.W0 + ' g · ' + (A.shape === 'spread' ? '펼침' : '접음') + ' · 25 °C</span>'
      : (diffs.length ? '🔎 A와 B가 다른 조건 ' : '🔎 A와 B의 조건이 모두 같아요') + diffs.join('');
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  /* 실험 결과 표(DOM) */
  function renderTable(fresh) {
    const sa = seriesFor('A'), sb = seriesFor('B');
    const rt = $('#rowT'), ra = $('#rowA'), rb = $('#rowB');
    const tnow = Math.round(B.t);
    rt.innerHTML = '<th>시간 (분)</th>' + TIMES.map((tm) => '<td class="' + (tm === tnow ? 'now' : '') + '">' + tm + '</td>').join('');
    const row = (s) => TIMES.map((tm) => {
      const p = s && s.pts.get(tm);
      return '<td class="' + (p ? (tm === fresh ? 'fresh' : '') : 'empty') + '">' + (p ? p.v.toFixed(1) : '·') + '</td>';
    }).join('');
    ra.innerHTML = '<th>A 질량 (g)</th>' + row(sa);
    rb.innerHTML = '<th>B 질량 (g)</th>' + row(sb);
    $('#dataN').textContent = '기록 ' + (sa ? sa.pts.size : 0) + ' / 7';
    if (fresh != null) { clearTimeout(renderTable.t); renderTable.t = setTimeout(() => renderTable(), 1400); }
  }

  /* =========================================================
     미션
     ========================================================= */
  const mark = (b) => (b ? '✅' : '⬜');
  function needData() {
    const s = seriesFor('A');
    if (!s || s.pts.size < 7) toast('📋 표가 비어 있어요. 먼저 10분마다 질량을 기록한 뒤 답해 보세요.', null, 3500);
  }
  // 새로고침 등으로 3단계 도중에 다시 시작해도 공정한 장치와 기록 표가 갖춰지도록
  function ensureFairRun() { if (!isFair() || !seriesFor('A')) { setFairBench(); resetRun(false); } }
  function fillStandardData() {
    // 4단계 근거 자료: 기록이 없으면 3단계 실험 결과를 그대로 채움
    const s = seriesFor('A');
    if (s && s.pts.size >= 7) return;
    setFairBench(); resetRun(false);
    for (let i = 0; i <= 6; i++) {
      if (i > 0) for (let n = 0; n < 200; n++) { dryStep(B.A, benchEnv(B.A)); dryStep(B.B, benchEnv(B.B)); }
      B.t = i * 10;
      ['A', 'B'].forEach((k) => { ensureSeries(k).pts.set(B.t, { v: reading(k), t0: nowS() - 5, shown: true }); });
    }
    renderTable();
  }

  const M1_1 = {
    title: '두 곳의 빨래 살펴보기',
    goal: '⏩ <b>1시간 지나기</b>를 누른 뒤 두 수건을 눌러 만져 보고, 창가와 방 구석이 <b>어떻게 다른지</b> 2가지 이상 찾아 눌러 보세요.',
    hint: '커튼이 흔들리는 곳, 바닥에 비친 햇빛, 벽에 걸린 온도계를 살펴보세요.',
    setup() { goScene('home'); resetHome(); H.labels = []; H.diffs = new Set(); },
    check: () => H.hourPassed && H.touched.win && H.touched.corner && H.diffs.size >= 2,
    hold: 0,
    status: () => (H.hourPassed
      ? '만져 보기 창가 ' + mark(H.touched.win) + ' · 구석 ' + mark(H.touched.corner) + ' · 찾은 차이 <b>' + Math.min(2, H.diffs.size) + '/2</b>'
      : (H.lapse ? '⏩ 시간이 흐르는 중… ' : '⬜ 먼저 ⏩ <b>1시간 지나기</b>를 눌러요') + ' · 찾은 차이 <b>' + Math.min(2, H.diffs.size) + '/2</b>'),
    explain: '창가의 수건은 거의 말랐지만 구석의 수건은 아직 축축했어요. 두 곳은 <b>바람·햇빛·온도</b>가 달랐어요. 무엇 때문일까요? 이렇게 관찰에서 궁금증을 찾아내는 것이 과학적 탐구의 첫걸음인 <b>문제 인식</b>이에요.',
  };
  const M2_1 = {
    title: '공정한 실험 장치 만들기',
    goal: '동생이 준비한 장치 B는 A와 다른 점이 있어요. 다른 조건을 눌러 <b>같게</b> 고치고, 선풍기는 <b>한쪽만</b> 켜세요.',
    hint: '아래 📋 조건 비교표에서 빨간 ✖ 표시가 있는 조건을 찾아 고쳐 보세요.',
    setup() { goScene('bench'); closeOverlay(); setUnfairBench(); hint('수건 · 접힘/펼침 배지 · 물컵 · 선풍기를 눌러 조건을 바꿔 보세요', 6000); },
    check: () => isFair(),
    hold: 0.6,
    status: () => {
      const n = sameCount();
      const wind = B.A.fan !== B.B.fan;
      return '같게 할 조건 <b>' + n + '/3</b> · 다르게 할 조건(바람) ' + mark(wind) +
        (!wind ? '<br><span style="color:#b91c1c">바람 조건이 같아서 가설을 확인할 수 없어요</span>' : '');
    },
    explain: '알아보려는 조건(바람)만 다르게 하고 나머지는 모두 같게 해야, 결과의 차이가 바람 때문이라고 말할 수 있어요. 이렇게 조건을 조절하는 것을 <b>변인 통제</b>라고 해요.',
  };
  const M2_2 = {
    title: '변인 분류하기',
    goal: '실험의 조건과 결과를 적은 카드 6장을 알맞은 <b>변인</b> 상자로 끌어 놓으세요.',
    hint: '우리가 바꾸는 것은 하나뿐이고, 저울로 재는 것도 하나뿐이에요.',
    setup() { goScene('bench'); setFairBench(); resetSort(); openOverlay('sort'); hideHint(); },
    check: () => sortCount() === 6,
    hold: 0,
    status: () => '분류한 카드 <b>' + sortCount() + '/6</b>',
    explain: '<b>조작 변인</b>은 결과에 영향을 주는지 알아보려고 일부러 다르게 하는 조건, <b>통제 변인</b>은 같게 유지하는 조건, <b>종속 변인</b>은 조작 변인에 따라 달라지는지 측정하는 결과예요.',
  };
  const M3_1 = {
    title: '10분마다 측정하기',
    goal: '📍 <b>기록하기</b>와 ⏩ <b>10분 지나기</b>를 번갈아 눌러, 0분부터 60분까지 <b>7번</b> 기록하세요.',
    hint: '0분일 때 먼저 기록하고, 10분이 지날 때마다 기록해요.',
    setup() { goScene('bench'); closeOverlay(); setFairBench(); resetRun(false); hint('📍 기록하기 → ⏩ 10분 지나기를 번갈아 눌러요', 6000); },
    check: () => TIMES.every((tm) => recordedSet().has(tm)),
    hold: 0,
    status: () => '기록한 시각 <b>' + TIMES.filter((tm) => recordedSet().has(tm)).length + '/7</b> · 지금 <b>' + Math.round(B.t) + '분</b>',
    explain: '같은 시간 간격으로 측정해 표에 정리하고 그래프로 나타내면, 두 수건의 질량이 어떻게 변하는지 한눈에 비교할 수 있어요.',
  };
  const M3_3 = {
    title: '탐구 과정 정리하기',
    goal: '이번 탐구에서 한 일을 적은 카드 6장을 <b>순서대로</b> 칸에 놓아 과학적 탐구 과정을 정리하세요.',
    hint: '궁금증 → 잠정적인 답 → 실험 방법 → 실험 → 결과 분석 → 결론 순서예요.',
    setup() { goScene('bench'); ensureFairRun(); resetFlow(); openOverlay('flow'); hideHint(); },
    check: () => S.flow.n === 6,
    hold: 0,
    status: () => '놓은 카드 <b>' + S.flow.n + '/6</b>',
    explain: '과학적 탐구는 <b>문제 인식 → 가설 설정 → 탐구 설계 → 탐구 수행 → 자료 해석 → 결론 도출</b> 순서로 진행돼요. 결과가 가설과 맞지 않는 것은 실패가 아니라, <b>가설을 수정</b>해 다시 탐구하는 과정이에요. 결론은 다른 사람과 공유해 함께 검토해요.',
  };
  const M4_1 = {
    type: 'quiz',
    title: '과학적 해결 방안 제안하기',
    goal: '장마철에 집 안에서 빨래를 빨리 말리려면? 우리 실험 결과를 <b>근거</b>로 한 해결 방안을 고르세요.',
    setup() { goScene('home'); resetHome(); H.labels = []; fillStandardData(); S.solArm = true; },
    choices: ['섬유유연제를 평소보다 많이 넣는다.', '선풍기나 제습기를 켜서 빨래에 바람이 잘 통하게 한다.', '공간을 아끼려고 빨래를 겹쳐서 촘촘히 넌다.', '창문을 모두 닫아 바람이 들어오지 못하게 한다.'],
    answer: 1,
    feedback: ['우리 실험에서는 섬유유연제를 조사하지 않았어요. 근거가 없는 방법이에요.', '', '겹쳐 널면 바람이 잘 닿지 않아요. 실험 결과와 반대예요.', '바람이 없을 때 더 느리게 말랐어요.'],
    explain: '실험 결과를 근거로 ‘바람이 잘 통하게 한다’는 해결 방안을 제안했어요. 이렇게 탐구로 얻은 근거를 바탕으로 생활 속 문제의 해결 방안을 찾는 것이 <b>과학적 문제 해결</b>이에요.',
  };
  const M4_2 = {
    title: '나의 탐구 계획서 쓰기',
    goal: '위쪽 탭에서 탐구할 문제를 고르고, 빛나는 칸마다 알맞은 카드를 끌어 놓아 <b>탐구 계획서</b>를 완성하세요.',
    hint: '조작 변인은 가설의 ‘~하면’ 부분, 종속 변인은 ‘~할 것이다’에서 측정할 것이에요.',
    setup() { goScene('plan'); resetPlan(0); hint('빛나는 칸에 들어갈 카드를 끌어 놓거나 눌러 보세요', 6000); },
    check: () => planNext() < 0,
    hold: 0,
    status: () => '채운 칸 <b>' + S.plan.filled.filter(Boolean).length + '/7</b> · 문제: <b>' + SCEN[S.plan.scen].tab + '</b>',
    explain: '탐구 계획서에는 탐구 문제, 가설, 변인, 측정 방법, 안전 수칙이 들어가요. 곰팡이나 식물처럼 <b>며칠 동안 꾸준히</b> 관찰해야 하는 탐구도 계획서를 세우면 체계적으로 할 수 있어요. 실제로 실천해 보고 결과를 친구들과 공유해 보세요!',
  };

  /* 무대·표를 먼저 준비한 뒤 게임을 시작해야 단계 소개의 setup()이 장면을 옮길 수 있다 */
  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }
  ensureSeries('A'); ensureSeries('B');
  renderCond(true); renderTable();
  syncBenchLayout(true);
  syncDom();
  setTimeout(() => { S.booted = true; }, 300);

  game = SciSim.game({
    simId: 'm1-inquiry-method',
    mount: '#game',
    badge: '꼼꼼한 탐구가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      home: '🏠 우리 집 빨래 건조대',
      skip: '⏩ 1시간 지나기 · 🖐️ 만져 보기',
      bench: '🧪 실험 장치 A·B와 전자저울',
      table: '📋 조건 비교표',
      clock: '⏩ 10분 지나기',
      record: '📍 기록하기 · 📋 실험 결과 표',
      graph: '📈 시간–질량 그래프',
      plan: '📝 탐구 계획서',
    },
    onFeatures(set) {
      F = new Set(set);
      if (LAY) syncBenchLayout(false);
      syncDom();
    },
    onMissionStart() { FX.bubbles = []; },
    onComplete() { closeOverlay(); syncDom(); },
    levels: [
      {
        title: '문제를 찾고 가설 세우기', short: '문제·가설', icon: '🧺', phase: '관찰',
        features: ['home', 'skip'],
        intro: '<p class="si-q">❓ 탐구 질문: 같은 날 넌 빨래인데, 왜 창가의 빨래는 빨리 마르고 방 구석의 빨래는 덜 마를까?</p>' +
          '<p>비가 잦은 장마철, 집 안에 빨래를 널었어요. 창가와 방 구석의 빨래를 <b>관찰</b>하고, 실험으로 확인할 수 있는 <b>탐구 문제</b>와 <b>가설</b>을 세워 봐요.</p>',
        setup() { closeOverlay(); goScene('home'); resetHome(); hint('⏩ 1시간 지나기를 누르고 수건을 눌러 만져 보세요', 7000); },
        recap: '관찰에서 <b>문제를 인식</b>하고, 실험으로 확인할 수 있는 <b>탐구 문제</b>와 잠정적인 답인 <b>가설</b>을 세웠어요.',
        summary: '<p><b>문제 인식</b>: 관찰한 현상에서 궁금한 점을 찾아 탐구 문제로 정한다. 예) 바람이 불면 빨래가 더 빨리 마를까?</p>' +
          '<p><b>가설 설정</b>: 탐구 문제에 대한 잠정적인 답을 세운다. 예) 바람이 불면 빨래가 더 빨리 마를 것이다.</p>',
        missions: [
          M1_1,
          {
            type: 'quiz',
            title: '탐구 문제 정하기',
            setup() { goScene('home'); },
            goal: '관찰한 차이 중 <b>바람</b>을 골라 탐구해 보기로 했어요. 실험으로 답을 확인할 수 있는 탐구 문제로 가장 알맞은 것은?',
            choices: ['빨래는 왜 매일 해야 할까?', '창가와 방 구석 중 어디가 더 좋은 곳일까?', '바람이 불면 빨래가 더 빨리 마를까?', '어떤 세제의 향기가 가장 좋을까?'],
            answer: 2,
            feedback: ['생활 습관에 대한 질문이라 실험으로 답을 확인하기 어려워요.', '‘더 좋은 곳’은 기준이 모호하고, 창가는 바람·햇빛·온도가 한꺼번에 달라 무엇 때문인지 알 수 없어요.', '', '관찰한 현상(빨래가 마르는 빠르기)과 관계없는 질문이에요.'],
            explain: '좋은 탐구 문제는 관찰한 현상과 관련 있고, 무엇을 바꾸고(바람) 무엇을 확인할지(마르는 빠르기)가 분명해서 실험으로 답할 수 있어요. 햇빛이나 온도도 같은 방법으로 따로 탐구할 수 있어요.',
          },
          {
            type: 'quiz',
            title: '가설 세우기',
            setup() { goScene('home'); },
            goal: '탐구 문제 ‘바람이 불면 빨래가 더 빨리 마를까?’에 대한 <b>가설</b>로 알맞은 것은?',
            choices: ['바람이 불면 빨래가 더 빨리 마를 것이다.', '바람이 불면 빨래가 더 빨리 마를까?', '창가의 수건이 구석의 수건보다 먼저 말랐다.', '빨래는 시간이 지나면 언젠가 마를 것이다.'],
            answer: 0,
            feedback: ['', '이것은 탐구 문제(질문)예요. 가설은 질문에 대한 잠정적인 답이에요.', '이미 관찰한 사실이에요. 가설은 실험으로 확인할 예상이에요.', '무엇과 비교해 확인할지 알 수 없어 실험으로 검증하기 어려워요.'],
            explain: '가설은 탐구 문제에 대한 <b>잠정적인 답</b>이에요. ‘~하면 ~할 것이다’처럼 쓰면 무엇을 바꾸고 무엇이 어떻게 될지 분명해져 실험으로 확인할 수 있어요. 가설은 실험 결과에 따라 맞을 수도, 틀릴 수도 있어요.',
          },
        ],
      },
      {
        title: '공정한 실험 설계하기', short: '탐구 설계', icon: '⚖️', phase: '탐구',
        features: ['bench', 'table'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> ‘바람이 불면 빨래가 더 빨리 마를 것이다’라는 가설을 세웠어요.</div>' +
          '<p>창가에서는 바람·햇빛·온도가 <b>한꺼번에</b> 달랐어요. 바람의 효과만 알아보려면 어떻게 실험해야 할까요? 두 실험 장치를 <b>공정하게</b> 준비해 봐요.</p>',
        setup() { closeOverlay(); goScene('bench'); setUnfairBench(); },
        recap: '알아보려는 조건 하나만 다르게 하고(조작 변인) 나머지는 같게 하는(통제 변인) 공정한 실험을 설계하고, 측정할 결과(종속 변인)를 정했어요.',
        summary: '<p><b>탐구 설계</b>: 가설을 확인할 실험 방법을 정한다.</p><ul>' +
          '<li><b>조작 변인</b>: 일부러 다르게 하는 조건 — 바람(선풍기 켬/끔)</li>' +
          '<li><b>통제 변인</b>: 같게 하는 조건 — 수건의 종류·크기, 물의 양, 펼친 모양, 방의 온도</li>' +
          '<li><b>종속 변인</b>: 측정하는 결과 — 수건의 질량 변화</li></ul>' +
          '<p>한 번에 하나의 조건만 다르게 해야 결과의 원인을 알 수 있다(<b>변인 통제</b>).</p>',
        missions: [
          M2_1,
          M2_2,
          {
            type: 'quiz',
            title: '두 가지를 한꺼번에 바꾸면?',
            setup() { goScene('bench'); closeOverlay(); setFairBench(); },
            goal: '친구는 A에 선풍기를 켜고 햇빛이 드는 창가에 두었고, B는 선풍기 없이 그늘에 두었어요. A가 더 빨리 말랐다면 ‘바람 때문’이라고 결론 내릴 수 있을까요?',
            figure: '<div class="fig-big">🌬️☀️🧺<span class="vs">vs</span>🌥️🧺</div>',
            choices: ['있다. A가 더 빨리 말랐기 때문이다.', '있다. 햇빛은 빨래가 마르는 것과 관계없기 때문이다.', '실험을 여러 번 반복하면 바람 때문이라고 말할 수 있다.', '없다. 바람과 햇빛이 함께 달라서 무엇 때문인지 알 수 없다.'],
            answer: 3,
            feedback: ['A가 빨리 마른 까닭이 바람일 수도, 햇빛일 수도 있어요.', '햇빛이 영향을 주는지는 아직 확인하지 않았어요. 1단계에서 창가에는 햇빛도 들었죠?', '조건이 섞인 실험은 여러 번 반복해도 원인을 구별할 수 없어요.', ''],
            explain: '두 조건을 한꺼번에 바꾸면 결과의 원인을 하나로 정할 수 없어요. 그래서 한 번에 <b>하나의 조건만</b> 다르게 하는 실험을 설계해요.',
          },
        ],
      },
      {
        title: '측정하고 결론 내리기', short: '자료 해석', icon: '📈', phase: '분석',
        features: ['clock', 'record', 'graph'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 바람만 다른 공정한 실험 장치를 준비했어요.</div>' +
          '<p>이제 <b>탐구를 수행</b>해요. 10분마다 두 수건의 질량을 <b>측정·기록</b>하고, 표와 그래프로 <b>자료를 해석</b>해 가설이 맞는지 <b>결론</b>을 내려 봐요.</p>',
        setup() { closeOverlay(); goScene('bench'); setFairBench(); resetRun(false); },
        recap: '10분마다 측정한 자료를 표와 그래프로 해석해 ‘바람이 불면 빨래가 더 빨리 마른다’는 결론을 내리고, 과학적 탐구 과정을 정리했어요.',
        summary: '<p><b>탐구 수행·자료 해석</b>: 같은 시간 간격으로 측정해 표와 그래프로 정리한다. 바람이 있는 수건 A의 질량이 더 빨리 줄었다.</p>' +
          '<p><b>결론 도출</b>: 다른 조건이 같을 때 바람이 불면 빨래가 더 빨리 마른다 → 가설이 옳다.</p>' +
          '<p>🔁 문제 인식 → 가설 설정 → 탐구 설계 → 탐구 수행 → 자료 해석 → 결론 도출 (가설이 맞지 않으면 가설을 수정해 다시 탐구)</p>',
        missions: [
          M3_1,
          {
            type: 'quiz',
            title: '그래프 해석하고 결론 내리기',
            setup() { goScene('bench'); closeOverlay(); ensureFairRun(); needData(); },
            goal: '60분 동안 A(바람 있음)는 약 29 g, B(바람 없음)는 약 15 g 가벼워졌어요. 이 결과로 내릴 수 있는 결론은?',
            choices: ['다른 조건이 같을 때 바람이 불면 빨래가 더 빨리 마른다. 가설이 옳다.', '바람이 불면 빨래가 더 느리게 마른다. 가설이 틀렸다.', '수건 A가 원래 더 잘 마르는 수건이다.', '바람만 있으면 어떤 빨래든, 어떤 날씨든 10분 만에 마른다.'],
            answer: 0,
            feedback: ['', '어느 쪽 그래프가 더 가파르게 내려갔나요?', '두 수건은 같은 종류·크기였어요(통제 변인).', '이 실험은 정한 조건에서 60분 동안만 측정했어요. 측정하지 않은 경우까지 넓혀 결론 내리면 안 돼요.'],
            explain: '줄어든 질량만큼 물이 증발해 날아갔어요. 바람이 있는 A의 그래프가 더 가파르게 내려가므로 가설이 옳다는 <b>결론</b>을 내릴 수 있어요. 결론은 실험한 조건 안에서 말해야 하고, 실험을 반복해 같은 결과가 나오면 더 믿을 수 있어요.',
          },
          M3_3,
        ],
      },
      {
        title: '생활 속 문제 해결하기', short: '해결 방안', icon: '🏠', phase: '적용',
        features: ['plan'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 실험으로 ‘바람이 불면 빨래가 더 빨리 마른다’는 결론을 얻었어요.</div>' +
          '<p>탐구 결과를 근거로 우리 집 빨래 문제의 <b>과학적 해결 방안</b>을 제안하고, 내 주변의 다른 문제를 탐구할 <b>탐구 계획서</b>를 세워 봐요.</p>',
        setup() { closeOverlay(); goScene('home'); resetHome(); H.labels = []; },
        recap: '탐구 결과를 근거로 생활 속 문제의 과학적 해결 방안을 제안하고, 주변 문제를 탐구할 계획서를 세웠어요.',
        summary: '<p><b>과학적 해결 방안</b>: 탐구로 얻은 근거를 바탕으로 제안한다. 예) 선풍기·제습기로 빨래에 바람이 잘 통하게 한다.</p>' +
          '<p><b>탐구 계획서</b>: 탐구 문제 · 가설 · 조작/통제/종속 변인 · 측정 방법 · 안전 수칙을 정해 꾸준히 탐구한다.</p>',
        missions: [M4_1, M4_2],
      },
    ],
  });

  /* =========================================================
     디버그 훅 (자동 점검용): 가상 좌표 → 화면 좌표
     ========================================================= */
  function client(x, y) {
    const r = view.canvas.getBoundingClientRect();
    return { x: r.left + (x * r.width) / LAY.W, y: r.top + (y * r.height) / LAY.H };
  }
  window.__sim = {
    S,
    get kind() { return LAY.kind; },
    client,
    spot(id) { const s = homeHotspots().find((h) => h.id === id); return s ? client(s.r.x + s.r.w / 2, s.r.y + Math.min(s.r.h / 2, 60)) : null; },
    bench(k, part) {
      const x0 = CELL[k];
      const q = part === 'fan' ? { x: x0 + 70, y: 240 } : part === 'shape' ? { x: x0 + BN.badge.cx, y: BN.badge.cy } : part === 'cloth' ? { x: x0 + BN.towel.cx, y: BN.towel.y + 60 } : { x: x0 + BN.cup.x + BN.cup.w / 2, y: BN.cup.y + 40 };
      const p = fromBench(q.x, q.y);
      return client(p.x, p.y);
    },
    boardCell(k, part) { const g = boardGeom(LAY.bench.board).find((x) => x.r.part === part); const r = k === 'A' ? g.a : g.b; return client(r.x + r.w / 2, r.y + r.h / 2); },
    sortCards() { return S.sort.deck.cards.map((c) => ({ id: c.id, box: c.box, placed: c.placed, at: client(c.x + c.w / 2, c.y + c.h / 2) })); },
    sortBox(k) { const b = LAY.sort.boxes[k]; return client(b.x + b.w / 2, b.y + b.h - 30); },
    flowCards() { return S.flow.deck.cards.map((c) => ({ idx: c.idx, placed: c.placed, at: client(c.x + c.w / 2, c.y + c.h / 2) })); },
    flowSlot(i) { const s = flowSlot(i); return client(s.x + s.w / 2, s.y + s.h / 2); },
    planCards() { return S.plan.deck.cards.map((c) => ({ text: c.text, ok: c.ok, at: client(c.x + c.w / 2, c.y + c.h / 2) })); },
    planSlot(i) { const r = planRowRect(i); return client(r.x + r.w / 2, r.y + r.h / 2); },
    planTab(i) { const P = LAY.plan; return client(P.tabs.x + i * P.tabs.dx + P.tabs.w / 2, P.tabs.y + P.tabs.h / 2); },
    table() { const a = seriesFor('A'), b = seriesFor('B'); return { A: TIMES.map((t) => (a && a.pts.get(t) ? a.pts.get(t).v : null)), B: TIMES.map((t) => (b && b.pts.get(t) ? b.pts.get(t).v : null)) }; },
    get busy() { return S.cam.moving || !!H.lapse || !!B.lapse; },
  };

  /* =========================================================
     시작
     ========================================================= */
  let uiT = 0;
  SciSim.loop((dt, t) => {
    S.t = t;
    stepCam();
    if (S.press && nowS() - S.press.t0 > 0.3) S.press = null;
    stepHome(dt, t);
    stepBench(dt, t);
    if (S.sort.deck) S.sort.deck.update(dt);
    if (S.flow.deck) S.flow.deck.update(dt);
    if (S.plan.deck) S.plan.deck.update(dt);
    updateFx(dt);
    // 4단계 정답 연출(퀴즈 성공을 감지)
    if (S.solArm && game && game.phase === 'success' && game.current() === M4_1) { S.solArm = false; runSolution(); }
    draw(t);
    uiT += dt;
    if (uiT > 0.2) { uiT = 0; syncDom(); }
  });
})();
