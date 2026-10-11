/* =========================================================
   중학 과학 시뮬레이션 - 애니메이션 · 그리기 도구 (SciSim.anim / SciSim.draw)
   common.js 다음에 불러옵니다.
     <script src="../../assets/js/common.js"></script>
     <script src="../../assets/js/anim.js"></script>

   ▣ 움직임
     SciSim.ease.outCubic(t) …           이징 함수 (t: 0~1)
     SciSim.tween(obj, {x: 100}, {duration: .6, ease: 'outBack', delay, onUpdate, onDone})
     SciSim.approach(cur, target, dt, rate)   부드럽게 따라가기 (지수 감쇠)
     new SciSim.Spring(value, {stiffness, damping}) → .target = v; .update(dt); .value
     new SciSim.Particles() → .emit({...}), .burst(x, y, opts), .update(dt), .draw(ctx)
     SciSim.time()                       현재 시각(초)
   ▣ 그리기:  const D = SciSim.draw(ctx)
     D.roundRect, D.shadow, D.sphere, D.glow, D.arrow, D.label, D.text,
     D.beaker, D.flask, D.testTube, D.flame, D.thermometer, D.dial,
     D.sky, D.space, D.ground, D.wave, D.dashedLine, D.ring, D.check, D.spark
   모든 좌표는 SciSim.stage가 만든 가상 좌표계를 그대로 씁니다.
   ========================================================= */
(function (global) {
  'use strict';
  const S = global.SciSim;
  if (!S) { console.error('anim.js: common.js를 먼저 불러오세요.'); return; }

  const reduceMotion = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const now = () => performance.now() / 1000;

  /* ---------------- 이징 ---------------- */
  const ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => t * (2 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
    outBounce: (t) => {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
  };

  /* ---------------- 트윈 (자동 갱신) ---------------- */
  const tweens = [];
  let ticking = false;
  function tick() {
    const t = now();
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      if (tw.cancelled) { tweens.splice(i, 1); continue; }
      const local = (t - tw.start) / tw.duration;
      if (local < 0) continue;
      const p = Math.min(1, local);
      const e = tw.ease(p);
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      tw.onUpdate && tw.onUpdate(tw.obj, p);
      if (p >= 1) { tweens.splice(i, 1); tw.onDone && tw.onDone(tw.obj); }
    }
    if (tweens.length) requestAnimationFrame(tick); else ticking = false;
  }
  /* tween(obj, {prop: target}, {duration: 초, ease: '이름'|함수, delay: 초, onUpdate, onDone}) */
  function tween(obj, to, opts) {
    opts = opts || {};
    const tw = {
      obj, to: {}, from: {},
      duration: Math.max(0.0001, reduceMotion ? 0.0001 : (opts.duration != null ? opts.duration : 0.5)),
      ease: typeof opts.ease === 'function' ? opts.ease : (ease[opts.ease] || ease.outCubic),
      start: now() + (opts.delay || 0),
      onUpdate: opts.onUpdate, onDone: opts.onDone, cancelled: false,
    };
    for (const k in to) { tw.to[k] = to[k]; tw.from[k] = +obj[k] || 0; }
    // 같은 객체·같은 속성의 이전 트윈은 취소
    tweens.forEach((o) => { if (o.obj === obj && Object.keys(to).some((k) => k in o.to)) o.cancelled = true; });
    tweens.push(tw);
    if (!ticking) { ticking = true; requestAnimationFrame(tick); }
    return { cancel() { tw.cancelled = true; }, get done() { return !tweens.includes(tw); } };
  }

  /* 지수 감쇠로 목표값에 부드럽게 다가가기 (프레임 속도와 무관) */
  function approach(cur, target, dt, rate) {
    return target + (cur - target) * Math.exp(-(rate || 8) * dt);
  }

  /* 스프링: 살짝 튕기며 목표로 이동 */
  class Spring {
    constructor(value, opts) {
      opts = opts || {};
      this.value = value; this.target = value; this.velocity = 0;
      this.stiffness = opts.stiffness || 170; this.damping = opts.damping || 18;
    }
    update(dt) {
      if (reduceMotion) { this.value = this.target; this.velocity = 0; return this.value; }
      const steps = Math.ceil(dt / 0.008);
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        const f = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
        this.velocity += f * h; this.value += this.velocity * h;
      }
      return this.value;
    }
    get settled() { return Math.abs(this.value - this.target) < 1e-3 && Math.abs(this.velocity) < 1e-3; }
  }

  /* ---------------- 입자 효과 (거품·불꽃·연기·반짝임) ---------------- */
  class Particles {
    constructor() { this.list = []; }
    /* emit({x, y, vx, vy, life, size, color, gravity, drag, shape: 'circle'|'square'|'star'|'bubble', fade: true, grow}) */
    emit(p) {
      this.list.push(Object.assign({ vx: 0, vy: 0, life: 1, age: 0, size: 4, color: '#fff', gravity: 0, drag: 0, shape: 'circle', fade: true, grow: 0, rot: 0, vr: 0 }, p));
    }
    /* 한 점에서 사방으로 터지는 효과 */
    burst(x, y, opts) {
      opts = opts || {};
      const n = reduceMotion ? 0 : (opts.count || 18);
      const colors = opts.colors || ['#ffb400', '#3867f4', '#14a058', '#e2464b', '#8b5cf6'];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
        const sp = (opts.speed || 160) * (0.5 + Math.random() * 0.7);
        this.emit({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: opts.life || 0.8, size: opts.size || 4,
          color: colors[i % colors.length], gravity: opts.gravity != null ? opts.gravity : 260, drag: 1.5,
          shape: opts.shape || (i % 3 === 0 ? 'star' : 'circle'), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10 });
      }
    }
    update(dt) {
      const L = this.list;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i];
        p.age += dt;
        if (p.age >= p.life) { L.splice(i, 1); continue; }
        p.vy += p.gravity * dt;
        if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        p.size += p.grow * dt;
      }
    }
    draw(ctx) {
      this.list.forEach((p) => {
        const a = p.fade ? Math.max(0, 1 - p.age / p.life) : 1;
        ctx.save();
        ctx.globalAlpha = a * (p.alpha != null ? p.alpha : 1);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        const s = Math.max(0.1, p.size);
        if (p.shape === 'bubble') {
          ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, s * 0.18);
          ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-s * 0.35, -s * 0.35, s * 0.25, 0, Math.PI * 2); ctx.fill();
        } else if (p.shape === 'square') {
          ctx.fillStyle = p.color; ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
        } else if (p.shape === 'star') {
          ctx.fillStyle = p.color; starPath(ctx, 0, 0, s * 1.4, s * 0.6, 5); ctx.fill();
        } else if (p.shape === 'smoke') {
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
          g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      });
    }
    clear() { this.list.length = 0; }
    get count() { return this.list.length; }
  }

  function starPath(ctx, x, y, R, r, n) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const rad = i % 2 ? r : R, a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
  }

  /* ---------------- 색 도우미 ---------------- */
  function hexToRgb(hex) {
    // '#rgb', '#rrggbb' 외에 shade()·mix()가 돌려주는 'rgb(…)'·'rgba(…)' 문자열도 받음
    const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(String(hex).trim());
    if (m) return { r: Math.round(+m[1]), g: Math.round(+m[2]), b: Math.round(+m[3]) };
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgba(hex, a) { const c = hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${a})`; }
  function shade(hex, amt) { // amt: -1(검게) ~ +1(밝게)
    const c = hexToRgb(hex), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    const f = (v) => Math.round((t - v) * p + v);
    return `rgb(${f(c.r)},${f(c.g)},${f(c.b)})`;
  }
  function mix(hexA, hexB, t) {
    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    const f = (x, y) => Math.round(x + (y - x) * t);
    return `rgb(${f(a.r, b.r)},${f(a.g, b.g)},${f(a.b, b.b)})`;
  }

  /* ---------------- 그리기 도구 ---------------- */
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  function draw(ctx) {
    const D = {
      font(size, weight) { return (weight || 600) + ' ' + size + 'px ' + FONT; },

      roundRect(x, y, w, h, r) {
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
        return D;
      },

      /* 부드러운 그림자를 깔고 그리기: D.shadow(() => {...}, {blur: 12, y: 4, color}) */
      shadow(fn, o) {
        o = o || {};
        ctx.save();
        ctx.shadowColor = o.color || 'rgba(20,40,80,.22)';
        ctx.shadowBlur = o.blur != null ? o.blur : 12;
        ctx.shadowOffsetX = o.x || 0; ctx.shadowOffsetY = o.y != null ? o.y : 4;
        fn(); ctx.restore();
        return D;
      },

      /* 입체감 있는 공 (원자, 입자, 행성 등) */
      sphere(x, y, r, color, o) {
        o = o || {};
        const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
        g.addColorStop(0, o.light || shade(color, 0.55));
        g.addColorStop(0.55, color);
        g.addColorStop(1, o.dark || shade(color, -0.35));
        if (o.shadow) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = r * 0.6; ctx.shadowOffsetY = r * 0.25; }
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        if (o.shadow) ctx.restore();
        if (o.outline) { ctx.strokeStyle = o.outline; ctx.lineWidth = o.outlineWidth || 1.5; ctx.stroke(); }
        if (r > 5 && o.gloss !== false) {
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.45, r * 0.32, r * 0.18, -0.6, 0, Math.PI * 2); ctx.fill();
        }
        if (o.text) {
          ctx.fillStyle = o.textColor || '#fff'; ctx.font = D.font(Math.max(9, r * (o.textScale || 1.1)), 800);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.text, x, y + r * 0.05);
          ctx.textBaseline = 'alphabetic';
        }
        return D;
      },

      /* 빛나는 후광 */
      glow(x, y, r, color, alpha) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(color, alpha != null ? alpha : 0.6));
        g.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        return D;
      },

      /* 화살표 (힘, 운동 방향, 흐름): {color, width, head, dash, label, labelColor, alpha} */
      arrow(x1, y1, x2, y2, o) {
        o = o || {};
        const w = o.width || 4, head = o.head || Math.max(10, w * 3);
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
        if (len < 1) return D;
        const ux = dx / len, uy = dy / len;
        const bx = x2 - ux * head, by = y2 - uy * head;
        ctx.save();
        if (o.alpha != null) ctx.globalAlpha = o.alpha;
        ctx.strokeStyle = ctx.fillStyle = o.color || '#e2464b';
        ctx.lineWidth = w; ctx.lineCap = 'round';
        if (o.dash) ctx.setLineDash(o.dash);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(bx, by); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(bx - uy * head * 0.55, by + ux * head * 0.55);
        ctx.lineTo(bx + uy * head * 0.55, by - ux * head * 0.55);
        ctx.closePath(); ctx.fill();
        if (o.label) {
          const lx = (x1 + x2) / 2 + (o.labelOffset != null ? -uy * o.labelOffset : -uy * 16);
          const ly = (y1 + y2) / 2 + (o.labelOffset != null ? ux * o.labelOffset : ux * 16);
          D.label(lx, ly, o.label, { bg: o.labelBg || 'rgba(255,255,255,.92)', color: o.labelColor || o.color || '#1b2333', size: o.labelSize || 13 });
        }
        ctx.restore();
        return D;
      },

      /* 둥근 알약 모양 라벨: {bg, color, size, weight, pad, align: 'center'|'left'|'right', border} */
      label(x, y, text, o) {
        o = o || {};
        const size = o.size || 13;
        ctx.save();
        ctx.font = D.font(size, o.weight || 800);
        const tw = ctx.measureText(text).width, pad = o.pad != null ? o.pad : 8, h = size + 10;
        let lx = x - tw / 2 - pad;
        if (o.align === 'left') lx = x; else if (o.align === 'right') lx = x - tw - pad * 2;
        D.roundRect(lx, y - h / 2, tw + pad * 2, h, h / 2);
        ctx.fillStyle = o.bg || '#1b2333'; ctx.fill();
        if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.fillStyle = o.color || '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(text, lx + pad, y + 1);
        ctx.restore();
        return { x: lx, y: y - h / 2, w: tw + pad * 2, h };
      },

      /* 글자: {size, weight, color, align, baseline, stroke(테두리색), alpha} */
      text(x, y, str, o) {
        o = o || {};
        ctx.save();
        if (o.alpha != null) ctx.globalAlpha = o.alpha;
        ctx.font = D.font(o.size || 14, o.weight || 700);
        ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.baseline || 'alphabetic';
        if (o.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeWidth || 4; ctx.strokeText(str, x, y); }
        ctx.fillStyle = o.color || '#1b2333'; ctx.fillText(str, x, y);
        ctx.restore();
        return D;
      },

      /* 유리 비커: (x, y)=왼쪽 위, level 0~1, liquid 색, t=시간(물결), ticks 눈금 개수 */
      beaker(x, y, w, h, o) {
        o = o || {};
        const level = o.level != null ? o.level : 0.5, t = o.t || 0, lip = 6;
        // 액체
        if (level > 0) {
          const ly = y + h - h * level;
          ctx.save();
          D.roundRect(x + 3, y, w - 6, h - 3, 8); ctx.clip();
          const g = ctx.createLinearGradient(x, ly, x, y + h);
          const c = o.liquid || '#7cc4ff';
          g.addColorStop(0, rgba(c, 0.55)); g.addColorStop(1, rgba(c, 0.85));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(x, y + h);
          for (let i = 0; i <= 24; i++) {
            const px = x + (w * i) / 24;
            ctx.lineTo(px, ly + Math.sin(t * 2.4 + i * 0.7) * (o.wave != null ? o.wave : 1.5));
          }
          ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
          ctx.fillStyle = rgba('#ffffff', 0.35); ctx.fillRect(x + 4, ly - 1, w - 8, 3); // 수면 반사
          ctx.restore();
        }
        // 유리
        ctx.save();
        ctx.strokeStyle = o.glass || '#8fa3bd'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x - lip, y); ctx.lineTo(x, y + 4); ctx.lineTo(x, y + h - 10);
        ctx.quadraticCurveTo(x, y + h, x + 10, y + h); ctx.lineTo(x + w - 10, y + h);
        ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - 10); ctx.lineTo(x + w, y);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x + 8, y + 12); ctx.lineTo(x + 8, y + h - 14); ctx.stroke();
        if (o.ticks) {
          ctx.strokeStyle = rgba('#5d6879', 0.6); ctx.lineWidth = 1.2;
          for (let i = 1; i < o.ticks; i++) {
            const ty = y + h - (h * i) / o.ticks;
            ctx.beginPath(); ctx.moveTo(x + w - (i % 2 ? 10 : 18), ty); ctx.lineTo(x + w - 3, ty); ctx.stroke();
          }
        }
        ctx.restore();
        return D;
      },

      /* 삼각 플라스크: (cx, bottomY) 기준 */
      flask(cx, by, w, h, o) {
        o = o || {};
        const neckW = w * 0.28, neckH = h * 0.32, level = o.level != null ? o.level : 0.35;
        const path = () => {
          ctx.beginPath();
          ctx.moveTo(cx - neckW / 2, by - h);
          ctx.lineTo(cx - neckW / 2, by - h + neckH);
          ctx.lineTo(cx - w / 2, by - 8); ctx.quadraticCurveTo(cx - w / 2, by, cx - w / 2 + 10, by);
          ctx.lineTo(cx + w / 2 - 10, by); ctx.quadraticCurveTo(cx + w / 2, by, cx + w / 2, by - 8);
          ctx.lineTo(cx + neckW / 2, by - h + neckH); ctx.lineTo(cx + neckW / 2, by - h);
        };
        if (level > 0) {
          ctx.save(); path(); ctx.closePath(); ctx.clip();
          const ly = by - (h - neckH) * level;
          const c = o.liquid || '#7cc4ff';
          const g = ctx.createLinearGradient(0, ly, 0, by); g.addColorStop(0, rgba(c, 0.55)); g.addColorStop(1, rgba(c, 0.85));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(cx - w, by);
          for (let i = 0; i <= 20; i++) { const px = cx - w + (2 * w * i) / 20; ctx.lineTo(px, ly + Math.sin((o.t || 0) * 2.4 + i) * 1.2); }
          ctx.lineTo(cx + w, by); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        ctx.save(); path();
        ctx.strokeStyle = o.glass || '#8fa3bd'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - neckW / 2 + 5, by - h + neckH + 6); ctx.lineTo(cx - w / 2 + 12, by - 12); ctx.stroke();
        ctx.restore();
        return D;
      },

      /* 시험관: (x, y)=입구 가운데, 세로 길이 h */
      testTube(x, y, w, h, o) {
        o = o || {};
        const level = o.level != null ? o.level : 0.4;
        const path = () => { ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y + h - w / 2); ctx.arc(x, y + h - w / 2, w / 2, Math.PI, 0, true); ctx.lineTo(x + w / 2, y); };
        if (level > 0) {
          ctx.save(); path(); ctx.closePath(); ctx.clip();
          ctx.fillStyle = rgba(o.liquid || '#7cc4ff', 0.8);
          ctx.fillRect(x - w, y + h - h * level, w * 2, h * level + 2);
          ctx.restore();
        }
        ctx.save(); path(); ctx.strokeStyle = o.glass || '#8fa3bd'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x - w / 2 + 4, y + 6); ctx.lineTo(x - w / 2 + 4, y + h - w); ctx.stroke();
        ctx.restore();
        return D;
      },

      /* 알코올램프/가스레인지 불꽃: (x, y)=불꽃 바닥, size=높이, t=시간 */
      flame(x, y, size, t, o) {
        o = o || {};
        if (size <= 0) return D;
        const flick = 1 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7.3) * 0.05;
        const hh = size * flick, ww = size * 0.3, tip = x + Math.sin(t * 5.2) * ww * 0.35;
        D.glow(x, y - hh * 0.4, size * 1.1, o.glow || '#ffa733', 0.32);
        const drop = (w, h, tx) => {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.bezierCurveTo(x - w * 1.25, y - h * 0.05, x - w * 0.8, y - h * 0.62, tx, y - h);
          ctx.bezierCurveTo(x + w * 0.8, y - h * 0.62, x + w * 1.25, y - h * 0.05, x, y);
          ctx.closePath();
        };
        const g = ctx.createLinearGradient(0, y, 0, y - hh);
        g.addColorStop(0, o.base || 'rgba(255,170,60,.95)'); g.addColorStop(0.45, '#ff8a3d'); g.addColorStop(1, 'rgba(255,80,30,0.05)');
        ctx.fillStyle = g; drop(ww, hh, tip); ctx.fill();
        const g2 = ctx.createLinearGradient(0, y, 0, y - hh * 0.6);
        g2.addColorStop(0, o.core || 'rgba(80,140,255,.9)'); g2.addColorStop(0.5, 'rgba(255,240,200,.95)'); g2.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = g2; drop(ww * 0.5, hh * 0.6, x + (tip - x) * 0.4); ctx.fill();
        return D;
      },

      /* 온도계: (x, y)=관 위쪽 가운데, h=관 길이, value/min/max */
      thermometer(x, y, h, value, min, max, o) {
        o = o || {};
        const p = Math.max(0, Math.min(1, (value - min) / (max - min)));
        ctx.save();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c3ccd9'; ctx.lineWidth = 2.5;
        D.roundRect(x - 9, y, 18, h, 9); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y + h + 10, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        const col = o.color || '#e2464b';
        D.sphere(x, y + h + 10, 11, col, { gloss: true });
        const lh = (h - 10) * p;
        ctx.fillStyle = col; D.roundRect(x - 4, y + h - lh, 8, lh + 8, 4); ctx.fill();
        if (o.ticks !== false) {
          ctx.fillStyle = '#5d6879'; ctx.font = D.font(12, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          const step = o.step || (max - min) / 5;
          for (let v = min; v <= max + 1e-6; v += step) {
            const ty = y + h - (h - 10) * ((v - min) / (max - min));
            ctx.fillRect(x + 10, ty, 6, 1.5);
            ctx.fillText(Math.round(v) + (o.unit || '°'), x + 19, ty);
          }
          ctx.textBaseline = 'alphabetic';
        }
        ctx.restore();
        return D;
      },

      /* 원형 계기판: value를 min~max 범위로, {label, unit, color, target:[a,b]} */
      dial(cx, cy, r, value, min, max, o) {
        o = o || {};
        const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
        const ang = (v) => a0 + (a1 - a0) * Math.max(0, Math.min(1, (v - min) / (max - min)));
        ctx.save();
        D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }, { blur: 10, y: 3 });
        ctx.strokeStyle = '#c9d2df'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        if (o.target) {
          ctx.strokeStyle = 'rgba(20,160,88,.85)'; ctx.lineWidth = 10;
          ctx.beginPath(); ctx.arc(cx, cy, r - 14, ang(o.target[0]), ang(o.target[1])); ctx.stroke();
        }
        const n = o.ticks || 5;
        ctx.fillStyle = '#3a4456'; ctx.font = D.font(12, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= n * 2; i++) {
          const v = min + ((max - min) * i) / (n * 2), a = ang(v), major = i % 2 === 0;
          ctx.strokeStyle = '#3a4456'; ctx.lineWidth = major ? 2.2 : 1.1;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * (r - 7), cy + Math.sin(a) * (r - 7));
          ctx.lineTo(cx + Math.cos(a) * (r - (major ? 17 : 12)), cy + Math.sin(a) * (r - (major ? 17 : 12)));
          ctx.stroke();
          if (major) ctx.fillText(+v.toFixed(2), cx + Math.cos(a) * (r - 29), cy + Math.sin(a) * (r - 29));
        }
        if (o.label) { ctx.fillStyle = '#5d6879'; ctx.font = D.font(12, 700); ctx.fillText(o.label, cx, cy + r * 0.5); }
        const a = ang(value);
        ctx.strokeStyle = o.color || '#e2464b'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 9, cy - Math.sin(a) * 9); ctx.lineTo(cx + Math.cos(a) * (r - 16), cy + Math.sin(a) * (r - 16)); ctx.stroke();
        D.sphere(cx, cy, 6, '#3a4456', { gloss: false });
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
        return D;
      },

      /* 배경: 하늘 그라데이션 */
      sky(x, y, w, h, top, bottom) {
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, top || '#bfe3ff'); g.addColorStop(1, bottom || '#eef7ff');
        ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        return D;
      },
      /* 배경: 우주 (반짝이는 별, seed 고정) */
      space(x, y, w, h, t, o) {
        o = o || {};
        const g = ctx.createRadialGradient(x + w * 0.7, y + h * 0.3, 10, x + w / 2, y + h / 2, Math.max(w, h));
        g.addColorStop(0, o.top || '#1d2b55'); g.addColorStop(1, o.bottom || '#070b1a');
        ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        const n = o.stars || 90;
        let s = 12345;
        const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
        for (let i = 0; i < n; i++) {
          const sx = x + rnd() * w, sy = y + rnd() * h, sr = rnd() * 1.4 + 0.3, ph = rnd() * 6;
          ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((t || 0) * 1.5 + ph));
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        return D;
      },
      /* 배경: 땅 (풀/흙) */
      ground(x, y, w, h, o) {
        o = o || {};
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, o.top || '#8fd18a'); g.addColorStop(0.12, o.mid || '#6cbf6a'); g.addColorStop(0.13, o.soil || '#c9a776'); g.addColorStop(1, o.bottom || '#a8865a');
        ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        return D;
      },

      /* 파동(사인 곡선): {amp, wavelength, phase, color, width} */
      wave(x1, x2, y, o) {
        o = o || {};
        const A = o.amp || 20, L = o.wavelength || 120, ph = o.phase || 0;
        ctx.save(); ctx.strokeStyle = o.color || '#3867f4'; ctx.lineWidth = o.width || 3; ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let px = x1; px <= x2; px += 3) {
          const py = y + A * Math.sin(((px - x1) / L) * Math.PI * 2 - ph);
          px === x1 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke(); ctx.restore();
        return D;
      },

      dashedLine(x1, y1, x2, y2, o) {
        o = o || {};
        ctx.save(); ctx.strokeStyle = o.color || '#8a95a6'; ctx.lineWidth = o.width || 2; ctx.setLineDash(o.dash || [6, 6]);
        ctx.lineDashOffset = -(o.offset || 0);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
        return D;
      },

      /* 목표 지점 표시: 맥박 치는 고리 */
      ring(x, y, r, t, o) {
        o = o || {};
        const color = o.color || '#14a058';
        const k = (t * (o.speed || 1.2)) % 1;
        ctx.save();
        ctx.strokeStyle = rgba(color, 0.9); ctx.lineWidth = o.width || 3;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = rgba(color, 0.6 * (1 - k)); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, r + k * r * 0.8, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        return D;
      },

      /* 성공 체크 표시 (p: 0~1 그려지는 정도) */
      check(x, y, size, p, o) {
        o = o || {};
        p = p == null ? 1 : p;
        ctx.save();
        D.sphere(x, y, size, o.color || '#14a058', { gloss: false });
        ctx.strokeStyle = '#fff'; ctx.lineWidth = size * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const pts = [[-0.45, 0.02], [-0.12, 0.33], [0.48, -0.32]];
        ctx.beginPath(); ctx.moveTo(x + pts[0][0] * size, y + pts[0][1] * size);
        const seg1 = Math.min(1, p * 2), seg2 = Math.max(0, p * 2 - 1);
        ctx.lineTo(x + (pts[0][0] + (pts[1][0] - pts[0][0]) * seg1) * size, y + (pts[0][1] + (pts[1][1] - pts[0][1]) * seg1) * size);
        if (seg2 > 0) ctx.lineTo(x + (pts[1][0] + (pts[2][0] - pts[1][0]) * seg2) * size, y + (pts[1][1] + (pts[2][1] - pts[1][1]) * seg2) * size);
        ctx.stroke(); ctx.restore();
        return D;
      },

      /* 반짝임 */
      spark(x, y, r, t, color) {
        const s = 0.6 + 0.4 * Math.sin(t * 8);
        ctx.save(); ctx.fillStyle = color || '#fff6c2'; ctx.globalAlpha = 0.9;
        starPath(ctx, x, y, r * s, r * s * 0.3, 4); ctx.fill(); ctx.restore();
        return D;
      },
    };
    return D;
  }

  Object.assign(S, {
    ease, tween, approach, Spring, Particles, draw, time: now,
    color: { rgba, shade, mix, hexToRgb },
    reduceMotion,
  });
})(window);
