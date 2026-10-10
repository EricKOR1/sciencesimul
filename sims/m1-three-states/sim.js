/* =========================================================
   중1 Ⅳ. 물질의 상태 변화 — 물질의 세 가지 상태 [9과04-02]
   ① [관찰] 세 상태: 같은 양의 나무 조각·물·공기를 모양이 다른 그릇에 옮기고 주사기로 눌러 보기 → 모양·부피 표
   ② [탐구] 입자 배열: 🔍 입자 모형으로 얼음·물·수증기의 거리·배열·운동을 비교 → 특징 태그 붙이기
   ③ [모형] 입자 모형 만들기: 입자를 끌어 놓아 고체·액체·기체 모형을 만들면 판정 후 입자가 움직임
   ④ [적용] 물질 분류(모래·밀가루 …)와 오개념 점검
   ※ 정성적 설명: 입자 사이의 상대적 거리, 입자 배열의 불규칙한 정도, 입자의 운동성 (상태 변화·열에너지는 다음 차시)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const RM = !!SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const rgba = SciSim.color.rgba, mix = SciSim.color.mix, shade = SciSim.color.shade;
  const rand = (a, b) => a + Math.random() * (b - a);
  const now = () => performance.now() / 1000;
  const ease = SciSim.ease;
  let gSpare = null;
  function gauss() {
    if (gSpare !== null) { const v = gSpare; gSpare = null; return v; }
    let u, v, s;
    do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const m = Math.sqrt(-2 * Math.log(s) / s);
    gSpare = v * m;
    return u * m;
  }
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  /* ---------- 화면 (태블릿 = 가로형 800×560, 휴대폰 = 세로형 440×620) ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 440 : 800, VH = PHONE ? 620 : 560;
  const BG = '#f6f9fe';
  const sprites = makeSprites();
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG, onResize: (v) => sprites.setScale(v.scale * v.dpr) });
  sprites.setScale(view.scale * view.dpr);
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();          // 물방울, 먼지, 반짝임 같은 장식 효과

  let game = null;
  let F = new Set();
  const on = (f) => (game && game.free) || F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));

  const COL = {
    p: '#5fa8f5',            // 입자 (얼음·물·수증기는 같은 물질이므로 모두 같은 입자)
    hi: '#f59e0b',           // 눈여겨볼 입자
    sub: '#8b5cf6', good: '#14a058', bad: '#e2463b', ink9: '#1b2333', muted: '#5d6879',
    dist: '#3b82f6', order: '#16a34a', move: '#f59e0b',
    solid: '#6366f1', liquid: '#0ea5e9', gas: '#ec4899',
  };
  const ST = {
    solid: { name: '고체', ex: '얼음', icon: '🧊', col: COL.solid, bg: '#eef0ff' },
    liquid: { name: '액체', ex: '물', icon: '💧', col: COL.liquid, bg: '#e8f6fe' },
    gas: { name: '기체', ex: '수증기', icon: '☁️', col: COL.gas, bg: '#fdeef6' },
  };
  const KINDS = ['solid', 'liquid', 'gas'];

  /* ---------- 입자 그림(광택 구) 미리 그려 두기: 매 프레임 그라데이션을 만들지 않도록 ---------- */
  function makeSprites() {
    const cache = new Map();
    let k = 2;
    function sphere(color, r) {
      const pad = Math.ceil(r * 0.7) + 2, size = 2 * (r + pad);
      const cv = document.createElement('canvas');
      cv.width = cv.height = Math.max(4, Math.ceil(size * k));
      const c = cv.getContext('2d');
      c.setTransform(k, 0, 0, k, 0, 0);
      const x = size / 2, y = size / 2;
      c.save();
      c.shadowColor = 'rgba(25,35,70,.28)'; c.shadowBlur = r * 0.5 * k; c.shadowOffsetY = r * 0.2 * k;
      const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      g.addColorStop(0, shade(color, 0.6)); g.addColorStop(0.55, color); g.addColorStop(1, shade(color, -0.32));
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.restore();
      if (r > 3) {
        c.fillStyle = 'rgba(255,255,255,.55)';
        c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.42, r * 0.33, r * 0.19, -0.6, 0, TAU); c.fill();
      }
      return { cv, size };
    }
    function glow(color, r) {
      const size = r * 2;
      const cv = document.createElement('canvas');
      cv.width = cv.height = Math.max(4, Math.ceil(size * k));
      const c = cv.getContext('2d');
      c.setTransform(k, 0, 0, k, 0, 0);
      const g = c.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, rgba(color, 0.45)); g.addColorStop(1, rgba(color, 0));
      c.fillStyle = g; c.fillRect(0, 0, size, size);
      return { cv, size };
    }
    return {
      setScale(s) { const nk = clamp(Math.ceil(s * 2) / 2, 1, 4); if (nk !== k) { k = nk; cache.clear(); } },
      draw(color, x, y, r, base) {
        const R = base || Math.max(2, Math.round(r));
        const key = color + '|' + R;
        let sp = cache.get(key);
        if (!sp) { sp = sphere(color, R); cache.set(key, sp); }
        const s = sp.size * (r / R);
        ctx.drawImage(sp.cv, x - s / 2, y - s / 2, s, s);
      },
      glow(color, x, y, r) {
        const key = 'g' + color + '|' + Math.round(r);
        let sp = cache.get(key);
        if (!sp) { sp = glow(color, Math.round(r)); cache.set(key, sp); }
        ctx.drawImage(sp.cv, x - sp.size / 2, y - sp.size / 2, sp.size, sp.size);
      },
    };
  }

  /* ---------- 그리기 도우미 ---------- */
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function text(x, y, s, o) { D.text(x, y, s, o); }
  function newBadge(x, y) {
    const a = 0.6 + 0.4 * Math.sin(now() * 6);
    ctx.save(); ctx.globalAlpha = a;
    D.label(x, y, 'NEW', { bg: COL.sub, size: 12 });
    ctx.restore();
  }
  /* 두 원의 바깥 공통 접선으로 '확대 원뿔'을 그림 */
  function zoomCone(sx, sy, sr, lx, ly, lr, alpha) {
    const dx = lx - sx, dy = ly - sy, d = Math.hypot(dx, dy);
    if (d <= Math.abs(lr - sr) + 1) return;
    const th = Math.atan2(dy, dx), be = Math.acos(clamp((sr - lr) / d, -1, 1));
    const a1 = th + be, a2 = th - be;
    const p1 = [sx + sr * Math.cos(a1), sy + sr * Math.sin(a1)], q1 = [lx + lr * Math.cos(a1), ly + lr * Math.sin(a1)];
    const p2 = [sx + sr * Math.cos(a2), sy + sr * Math.sin(a2)], q2 = [lx + lr * Math.cos(a2), ly + lr * Math.sin(a2)];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(139,92,246,.09)';
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.lineTo(p2[0], p2[1]); ctx.closePath(); ctx.fill();
    ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(124,58,237,.55)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(q1[0], q1[1]); ctx.moveTo(p2[0], p2[1]); ctx.lineTo(q2[0], q2[1]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(124,58,237,.85)';
    circle(sx, sy, sr); ctx.stroke();
    ctx.restore();
  }
  /* 돋보기(입자 모형 창): inner(cx, cy, r)를 둥근 창 안에 그림 */
  function lens(L, k, src, inner, o) {
    o = o || {};
    if (k <= 0.02) return;
    const r = L.r * clamp(k, 0, 1.2), a = clamp(k * 1.4, 0, 1);
    if (src) zoomCone(src.x, src.y, src.r, L.cx, L.cy, r, a);
    ctx.save();
    ctx.globalAlpha = a;
    D.shadow(() => { ctx.fillStyle = '#fff'; circle(L.cx, L.cy, r + 7); ctx.fill(); }, { blur: 20, y: 6, color: 'rgba(40,30,90,.25)' });
    ctx.save();
    circle(L.cx, L.cy, r); ctx.clip();
    ctx.fillStyle = o.bg || '#eef6ff'; ctx.fillRect(L.cx - r, L.cy - r, r * 2, r * 2);
    inner(L.cx, L.cy, r);
    // 유리 반사
    const gl = ctx.createLinearGradient(L.cx - r, L.cy - r, L.cx + r * 0.2, L.cy + r * 0.2);
    gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(L.cx - r, L.cy - r, r * 2, r * 2);
    ctx.restore();
    // 테두리
    const rg = ctx.createLinearGradient(L.cx - r, L.cy - r, L.cx + r, L.cy + r);
    rg.addColorStop(0, o.rim0 || '#c4b5fd'); rg.addColorStop(0.5, o.rim1 || '#7c3aed'); rg.addColorStop(1, o.rim2 || '#4c1d95');
    ctx.strokeStyle = rg; ctx.lineWidth = Math.max(4, r * 0.05); circle(L.cx, L.cy, r + 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(L.cx, L.cy, Math.max(0.5, r - 4), Math.PI * 1.1, Math.PI * 1.42); ctx.stroke();
    if (o.title) D.label(L.cx, L.cy - r - 6, o.title, { bg: o.titleBg || '#5b21b6', size: PHONE ? 13 : 14 });
    ctx.restore();
  }
  function legendPill(cx, y, items) {
    ctx.save();
    ctx.font = D.font(13, 700);
    const ws = items.map((it) => ctx.measureText(it[1]).width + 26);
    const total = ws.reduce((a, b) => a + b, 0) + (items.length - 1) * 10;
    let x = cx - total / 2;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; D.roundRect(x - 8, y - 13, total + 16, 26, 13); ctx.fill();
    items.forEach((it, i) => {
      sprites.draw(it[0], x + 8, y, 6.5, 7);
      ctx.fillStyle = COL.ink9; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(it[1], x + 19, y + 1);
      x += ws[i] + 10;
    });
    ctx.restore();
  }
  /* 성공 효과 */
  const checks = [];
  function celebrate(x, y) {
    FX.burst(x, y, { count: 22, colors: ['#8b5cf6', '#14a058', '#ffb400', '#3867f4', '#ec4899'], speed: 190 });
    checks.push({ x, y, t0: now() });
  }
  function drawChecks(t) {
    for (let i = checks.length - 1; i >= 0; i--) {
      const c = checks[i], e = t - c.t0;
      if (e > 1.8) { checks.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = e > 1.3 ? 1 - (e - 1.3) / 0.5 : 1;
      const s = 0.75 + 0.25 * ease.outBack(Math.min(1, e / 0.35));
      ctx.translate(c.x, c.y); ctx.scale(s, s);
      D.check(0, 0, 26, Math.min(1, e / 0.5));
      ctx.restore();
    }
  }

  /* =========================================================
     1. 돋보기 속 입자 모형 (정사각형 주기 영역을 둥근 창으로 들여다봄)
        고체: 규칙적으로 배열 · 서로 매우 가까움 · 제자리에서 진동
        액체: 불규칙 · 가까움 · 서로 위치를 바꾸며 이동
        기체: 매우 불규칙 · 매우 멂 · 빠르고 자유롭게 운동
        (세 상태 모두 같은 물질의 입자: 크기와 종류는 같고 거리·배열·운동만 다름)
     ========================================================= */
  const LR = 150, LPR = 16, TRAIL_N = 14;     // 창 반지름, 입자 반지름 (모형 좌표), 자취 길이
  class StateSim {
    constructor(kind) {
      this.kind = kind; this.R = LR; this.r = LPR;
      this.M = LR + 3 * LPR; this.L = 2 * this.M;
      this.time = 0; this.p = []; this.tracers = [];
      this.nc = Math.max(3, Math.floor(this.L / (2 * this.r))); this.cs = this.L / this.nc;
      this.head = new Int32Array(this.nc * this.nc); this.next = new Int32Array(512);
      this.reset();
    }
    mk(x, y, extra) {
      return Object.assign({ x, y, vx: 0, vy: 0, tr: new Float32Array(2 * TRAIL_N), tn: 0, tt: 0 }, extra);
    }
    reset() {
      const { kind, r, M, L } = this, k = r / 12;
      this.p = [];
      if (kind === 'solid') {
        const n = 11, a = L / n; this.a = a;                       // 정사각형 격자 (규칙 배열)
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          const hx = -M + (i + 0.5) * a, hy = -M + (j + 0.5) * a;
          this.p.push(this.mk(hx, hy, {
            hx, hy,
            ax: rand(1.6, 2.3) * k, bx: rand(0.8, 1.4) * k, wx: TAU * rand(2.4, 4), ux: TAU * rand(5, 7.5), fx: rand(0, TAU), gx: rand(0, TAU),
            ay: rand(1.6, 2.3) * k, by: rand(0.8, 1.4) * k, wy: TAU * rand(2.4, 4), uy: TAU * rand(5, 7.5), fy: rand(0, TAU), gy: rand(0, TAU),
          }));
        }
      } else if (kind === 'liquid') {
        const s = r * 2.45, cols = Math.round(L / s), rows = Math.round(L / (s * 0.866)) & ~1;
        const sx = L / cols, sy = L / rows;
        this.T = 3000 * k * k; this.gamma = 2.0;
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          this.p.push(this.mk(-M + (i + 0.25 + (j & 1) * 0.5) * sx + rand(-2, 2), -M + (j + 0.5) * sy + rand(-2, 2), { vx: gauss() * 40, vy: gauss() * 40 }));
        }
        for (let i = 0; i < 160; i++) this.sub(0.02);              // 결정 모양이 풀려 불규칙해질 때까지 미리 돌려 둠
      } else {
        const N = 20; let tries = 0;
        this.speed = 220 * k;
        while (this.p.length < N && tries < 4000) {
          tries++;
          const x = rand(-M, M), y = rand(-M, M);
          if (this.p.some((q) => { let dx = q.x - x, dy = q.y - y; if (dx > M) dx -= L; else if (dx < -M) dx += L; if (dy > M) dy -= L; else if (dy < -M) dy += L; return dx * dx + dy * dy < (4.2 * r) ** 2; })) continue;
          const a = rand(0, TAU), sp = this.speed * (0.55 + Math.random() * 0.9);
          this.p.push(this.mk(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }));
        }
        for (let i = 0; i < 20; i++) this.sub(0.02);
      }
      for (const q of this.p) { q.tn = 0; q.tt = 0; }
      // 눈여겨볼 입자 3개 (창 가운데 근처에서 고름)
      const anchors = [[-0.38, -0.3], [0.34, 0.06], [-0.06, 0.5]];
      this.tracers = [];
      for (const [ax, ay] of anchors) {
        let best = null, bd = 1e9;
        for (const q of this.p) {
          if (this.tracers.includes(q)) continue;
          const d = (q.x - ax * this.R) ** 2 + (q.y - ay * this.R) ** 2;
          if (d < bd) { bd = d; best = q; }
        }
        if (best) this.tracers.push(best);
      }
    }
    step(dt) {
      const n = Math.max(1, Math.ceil(dt / 0.02)), h = dt / n;
      for (let s = 0; s < n; s++) this.sub(h);
      for (const q of this.p) {                                    // 지나간 자취 기록
        q.tt += dt;
        if (q.tt >= 0.04) { q.tt = 0; q.tr.copyWithin(2, 0, 2 * TRAIL_N - 2); q.tr[0] = q.x; q.tr[1] = q.y; if (q.tn < TRAIL_N) q.tn++; }
      }
    }
    sub(h) {
      const P = this.p, M = this.M, L = this.L;
      if (this.kind === 'solid') {
        this.time += h;
        const t = this.time;
        for (const q of P) {
          q.x = q.hx + q.ax * Math.sin(q.wx * t + q.fx) + q.bx * Math.sin(q.ux * t + q.gx);
          q.y = q.hy + q.ay * Math.sin(q.wy * t + q.fy) + q.by * Math.sin(q.uy * t + q.gy);
        }
        return;
      }
      const liquid = this.kind === 'liquid';
      let dec = 1, kick = 0;
      if (liquid) { dec = Math.exp(-this.gamma * h); kick = Math.sqrt(Math.max(0, this.T * (1 - dec * dec))); }
      for (let i = 0; i < P.length; i++) {
        const q = P[i];
        if (liquid) { q.vx = q.vx * dec + kick * gauss(); q.vy = q.vy * dec + kick * gauss(); }
        q.x += q.vx * h; q.y += q.vy * h;
        let w = false;
        if (q.x < -M) { q.x += L; w = true; } else if (q.x >= M) { q.x -= L; w = true; }
        if (q.y < -M) { q.y += L; w = true; } else if (q.y >= M) { q.y -= L; w = true; }
        if (w) q.tn = 0;
      }
      this.collide();
    }
    collide() {
      const P = this.p, n = P.length, nc = this.nc, cs = this.cs, M = this.M, L = this.L, d0 = 2 * this.r, d02 = d0 * d0;
      if (this.next.length < n) this.next = new Int32Array(n * 2);
      const head = this.head, next = this.next;
      head.fill(-1);
      for (let i = 0; i < n; i++) {
        const q = P[i];
        let cx = Math.floor((q.x + M) / cs), cy = Math.floor((q.y + M) / cs);
        cx = ((cx % nc) + nc) % nc; cy = ((cy % nc) + nc) % nc;
        q.cx = cx; q.cy = cy;
        const c = cy * nc + cx;
        next[i] = head[c]; head[c] = i;
      }
      for (let i = 0; i < n; i++) {
        const a = P[i];
        for (let oy = -1; oy <= 1; oy++) {
          const cy = (a.cy + oy + nc) % nc;
          for (let ox = -1; ox <= 1; ox++) {
            const cx = (a.cx + ox + nc) % nc;
            for (let j = head[cy * nc + cx]; j >= 0; j = next[j]) {
              if (j <= i) continue;
              const b = P[j];
              let dx = b.x - a.x, dy = b.y - a.y;
              if (dx > M) dx -= L; else if (dx < -M) dx += L;
              if (dy > M) dy -= L; else if (dy < -M) dy += L;
              const d2 = dx * dx + dy * dy;
              if (d2 >= d02 || d2 < 1e-9) continue;
              const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (d0 - d) * 0.5;
              a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
              const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
              if (rv < 0) { a.vx += rv * nx; a.vy += rv * ny; b.vx -= rv * nx; b.vy -= rv * ny; }
            }
          }
        }
      }
    }
    /* 가장 가까운 이웃 입자 (주기 경계 고려) */
    nearest(a) {
      const M = this.M, L = this.L;
      let best = null, bd = 1e12;
      for (const b of this.p) {
        if (b === a) continue;
        let dx = b.x - a.x, dy = b.y - a.y;
        if (dx > M) dx -= L; else if (dx < -M) dx += L;
        if (dy > M) dy -= L; else if (dy < -M) dy += L;
        const d2 = dx * dx + dy * dy;
        if (d2 < bd) { bd = d2; best = { b, dx, dy, d: 0 }; }
      }
      if (best) best.d = Math.sqrt(bd);
      return best;
    }
    /* o.view: null | 'dist' | 'order' | 'move' */
    draw(cx, cy, rad, o) {
      o = o || {};
      const s = rad / this.R, rr = this.r * s, lim = (this.R + this.r * 1.5) ** 2, view = o.view;
      const inside = (q) => q.x * q.x + q.y * q.y <= lim;
      if (view === 'move' && !RM) this.drawTrails(cx, cy, s, rr, false);
      for (const q of this.p) {
        if (!inside(q)) continue;
        if (view && this.tracers.includes(q)) continue;
        sprites.draw(COL.p, cx + q.x * s, cy + q.y * s, rr, 12);
      }
      if (view === 'order') this.drawBonds(cx, cy, s);
      if (view) {
        for (const q of this.tracers) {
          sprites.glow(COL.hi, cx + q.x * s, cy + q.y * s, rr * 2.4);
          sprites.draw(COL.hi, cx + q.x * s, cy + q.y * s, rr, 12);
        }
      }
      if (view === 'dist') this.drawGaps(cx, cy, s, rr);
      if (view === 'move' && !RM) this.drawTrails(cx, cy, s, rr, true);
    }
    /* 입자가 지나간 길 (새것일수록 진하게) */
    drawTrails(cx, cy, s, rr, tracerOnly) {
      ctx.save();
      ctx.lineCap = tracerOnly ? 'round' : 'butt'; ctx.lineJoin = tracerOnly ? 'round' : 'bevel';
      const lim = (this.R + this.r) ** 2;
      const bands = tracerOnly ? [[0, 4, 0.5], [4, 8, 0.3], [8, TRAIL_N, 0.16]] : [[0, 5, 0.4], [5, 9, 0.2]];     // 모든 입자의 자취는 짧고 간단하게
      for (const [k0, k1, a] of bands) {
        ctx.strokeStyle = tracerOnly ? rgba(COL.hi, Math.min(1, a * 1.7)) : rgba('#2f6fd6', a * 0.8);
        ctx.lineWidth = tracerOnly ? Math.max(3, rr * 0.5) : Math.max(2, rr * 0.4);
        ctx.beginPath();
        const list = tracerOnly ? this.tracers : this.p;
        for (const q of list) {
          if (q.tn <= k0 || q.x * q.x + q.y * q.y > lim) continue;
          const tr = q.tr, kEnd = Math.min(k1, q.tn);
          const px = k0 === 0 ? q.x : tr[2 * (k0 - 1)], py = k0 === 0 ? q.y : tr[2 * (k0 - 1) + 1];
          ctx.moveTo(cx + px * s, cy + py * s);
          for (let k = k0; k < kEnd; k++) ctx.lineTo(cx + tr[2 * k] * s, cy + tr[2 * k + 1] * s);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    /* 이웃한 입자끼리 이은 선: 늘어선 모양(배열)이 드러남 */
    drawBonds(cx, cy, s) {
      const P = this.p, cut = 2 * this.r * 1.3, cut2 = cut * cut, M = this.M, L = this.L, lim = (this.R + this.r * 2) ** 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(30,58,138,.78)'; ctx.lineWidth = Math.max(2, 2.6 * s * 1.3); ctx.lineCap = 'butt';
      ctx.beginPath();
      for (let i = 0; i < P.length; i++) {
        const a = P[i];
        if (a.x * a.x + a.y * a.y > lim) continue;
        for (let j = i + 1; j < P.length; j++) {
          const b = P[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          if (dx > M) dx -= L; else if (dx < -M) dx += L;
          if (dy > M) dy -= L; else if (dy < -M) dy += L;
          if (dx * dx + dy * dy > cut2) continue;
          ctx.moveTo(cx + a.x * s, cy + a.y * s); ctx.lineTo(cx + (a.x + dx) * s, cy + (a.y + dy) * s);
        }
      }
      ctx.stroke();
      ctx.restore();
    }
    /* 눈여겨볼 입자와 가장 가까운 이웃 사이의 거리(틈) 표시 */
    drawGaps(cx, cy, s, rr) {
      ctx.save();
      for (const q of this.tracers) {
        const nb = this.nearest(q);
        if (!nb || nb.d < 1) continue;
        const ux = nb.dx / nb.d, uy = nb.dy / nb.d;
        let gap = nb.d - 2 * this.r;
        const mid = (nb.d) / 2, half = Math.max(gap, 7) / 2;
        const x1 = q.x + ux * (mid - half), y1 = q.y + uy * (mid - half), x2 = q.x + ux * (mid + half), y2 = q.y + uy * (mid + half);
        const X1 = cx + x1 * s, Y1 = cy + y1 * s, X2 = cx + x2 * s, Y2 = cy + y2 * s;
        const len = Math.hypot(X2 - X1, Y2 - Y1);
        ctx.strokeStyle = '#ef4444'; ctx.fillStyle = '#ef4444'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(X1, Y1); ctx.lineTo(X2, Y2); ctx.stroke();
        // 양쪽 끝 막대
        const nx = -uy, ny = ux, cap = 6;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(X1 + nx * cap, Y1 + ny * cap); ctx.lineTo(X1 - nx * cap, Y1 - ny * cap);
        ctx.moveTo(X2 + nx * cap, Y2 + ny * cap); ctx.lineTo(X2 - nx * cap, Y2 - ny * cap);
        ctx.stroke();
        void len;
      }
      ctx.restore();
    }
  }

  /* =========================================================
     2. 내가 만든 입자 모형 (상자 속)
        - 판정(거리·규칙성)에 성공하면 입자가 상태에 맞게 실제로 움직임
        - 고체: 제자리 진동 / 액체: 아래로 모이며 서로 위치를 바꿈 / 기체: 빠르고 자유롭게 날아다님
     ========================================================= */
  const BN = 8;                                   // 상자마다 놓는 입자 수
  class BoxSim {
    constructor(kind, rect, r, pts) {
      this.kind = kind; this.r = r; this.rect = rect; this.time = 0; this.k = 0;   // k: 깨어나는 정도 0~1
      const s = r / 13;
      this.p = pts.map((q) => ({
        x: q.x, y: q.y, hx: q.x, hy: q.y, vx: 0, vy: 0,
        ax: rand(1.5, 2.2) * s, bx: rand(0.8, 1.3) * s, wx: TAU * rand(2.4, 4), ux: TAU * rand(5, 7.5), fx: rand(0, TAU), gx: rand(0, TAU),
        ay: rand(1.5, 2.2) * s, by: rand(0.8, 1.3) * s, wy: TAU * rand(2.4, 4), uy: TAU * rand(5, 7.5), fy: rand(0, TAU), gy: rand(0, TAU),
        tr: new Float32Array(2 * TRAIL_N), tn: 0, tt: 0,
      }));
      this.speed = 250 * s;
      if (kind === 'gas') this.p.forEach((q) => { const a = rand(0, TAU), sp = this.speed * (0.6 + Math.random() * 0.8); q.vx = Math.cos(a) * sp; q.vy = Math.sin(a) * sp; });
      if (kind === 'liquid') this.p.forEach((q) => { q.vx = gauss() * 30; q.vy = gauss() * 30; });
    }
    step(dt) {
      this.k = Math.min(1, this.k + dt / 0.9);
      const n = Math.max(1, Math.ceil(dt / 0.016)), h = dt / n;
      for (let i = 0; i < n; i++) this.sub(h);
      for (const q of this.p) {
        q.tt += dt;
        if (q.tt >= 0.04) { q.tt = 0; q.tr.copyWithin(2, 0, 2 * TRAIL_N - 2); q.tr[0] = q.x; q.tr[1] = q.y; if (q.tn < TRAIL_N) q.tn++; }
      }
    }
    sub(h) {
      const P = this.p, r = this.r, R = this.rect, kk = this.k, s = r / 13;
      const x0 = R.x0 + r, x1 = R.x1 - r, y0 = R.y0 + r, y1 = R.y1 - r;
      this.time += h;
      if (this.kind === 'solid') {
        const t = this.time;
        for (const q of P) {
          q.x = q.hx + kk * (q.ax * Math.sin(q.wx * t + q.fx) + q.bx * Math.sin(q.ux * t + q.gx));
          q.y = q.hy + kk * (q.ay * Math.sin(q.wy * t + q.fy) + q.by * Math.sin(q.uy * t + q.gy));
        }
        return;
      }
      const liquid = this.kind === 'liquid';
      const g = liquid ? 1500 * s : 0, dec = liquid ? Math.exp(-1.6 * h) : 1, kick = liquid ? Math.sqrt(Math.max(0, 3400 * s * s * (1 - dec * dec))) * kk : 0;
      let com = 0;
      if (liquid) { for (const q of P) com += q.x; com /= P.length; }
      for (const q of P) {
        if (liquid) { q.vy += g * h * kk; q.vx += -(q.x - com) * 34 * h * kk; q.vx = q.vx * dec + kick * gauss(); q.vy = q.vy * dec + kick * gauss(); }
        q.x += q.vx * h; q.y += q.vy * h;
        let w = false;
        if (q.x < x0) { q.x = x0; q.vx = Math.abs(q.vx) * (liquid ? 0.3 : 1); w = true; } else if (q.x > x1) { q.x = x1; q.vx = -Math.abs(q.vx) * (liquid ? 0.3 : 1); w = true; }
        if (q.y < y0) { q.y = y0; q.vy = Math.abs(q.vy) * (liquid ? 0.3 : 1); w = true; } else if (q.y > y1) { q.y = y1; q.vy = -Math.abs(q.vy) * (liquid ? 0.3 : 1); w = true; }
        void w;
      }
      const d0 = 2 * r, e = liquid ? 0.25 : 1;
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        const a = P[i], b = P[j];
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 >= d0 * d0 || d2 < 1e-9) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (d0 - d) * 0.5;
        a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) { const j2 = -(1 + e) * rv * 0.5; a.vx -= j2 * nx; a.vy -= j2 * ny; b.vx += j2 * nx; b.vy += j2 * ny; }
      }
      // 충돌 보정으로 벽 밖으로 밀린 입자 되돌리기
      for (const q of P) { q.x = clamp(q.x, x0, x1); q.y = clamp(q.y, y0, y1); }
    }
    draw(alpha) {
      const r = this.r;
      if (!RM && this.kind !== 'solid') {
        ctx.save(); ctx.lineCap = 'round';
        const bands = [[0, 4, 0.34], [4, 8, 0.2], [8, TRAIL_N, 0.1]];
        for (const [k0, k1, a] of bands) {
          ctx.strokeStyle = rgba('#2f6fd6', a * (this.kind === 'gas' ? 1 : 0.6) * alpha); ctx.lineWidth = Math.max(3, r * 0.7);
          ctx.beginPath();
          for (const q of this.p) {
            if (q.tn <= k0) continue;
            const kEnd = Math.min(k1, q.tn);
            const px = k0 === 0 ? q.x : q.tr[2 * (k0 - 1)], py = k0 === 0 ? q.y : q.tr[2 * (k0 - 1) + 1];
            ctx.moveTo(px, py);
            for (let k = k0; k < kEnd; k++) ctx.lineTo(q.tr[2 * k], q.tr[2 * k + 1]);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      for (const q of this.p) sprites.draw(COL.p, q.x, q.y, r, 12);
    }
  }

  /*JUDGE-BEGIN*/
  /* ---------- 판정: 입자 사이의 거리와 배열의 규칙성 ---------- */
  function nnDists(pts) {
    const n = pts.length, nn = new Array(n).fill(1e9);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d < nn[i]) nn[i] = d;
      if (d < nn[j]) nn[j] = d;
    }
    return nn;
  }
  /* 이웃한 입자끼리 이은 선의 방향이 얼마나 가지런한가 (0: 제멋대로 ~ 1: 격자) */
  function orderOf(pts, Dm, knn) {
    const n = pts.length, bonds = [];
    if (knn) {
      for (let i = 0; i < n; i++) {
        const ds = [];
        for (let j = 0; j < n; j++) if (j !== i) ds.push([Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y), j]);
        ds.sort((a, b) => a[0] - b[0]);
        for (let k = 0; k < Math.min(2, ds.length); k++) bonds.push(Math.atan2(pts[ds[k][1]].y - pts[i].y, pts[ds[k][1]].x - pts[i].x));
      }
    } else {
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d <= 1.3 * Dm) bonds.push(Math.atan2(pts[j].y - pts[i].y, pts[j].x - pts[i].x));
      }
    }
    if (bonds.length < 2) return 0;
    let a4 = 0, b4 = 0, a6 = 0, b6 = 0;
    for (const th of bonds) { a4 += Math.cos(4 * th); b4 += Math.sin(4 * th); a6 += Math.cos(6 * th); b6 += Math.sin(6 * th); }
    const m = bonds.length;
    return Math.max(Math.hypot(a4, b4) / m, Math.hypot(a6, b6) / m);
  }
  function judgeModel(kind, pts, Dm) {
    const n = pts.length;
    if (n < BN) return { ok: false, wait: true, msg: '입자를 ' + BN + '개 놓아 보세요. (' + n + ' / ' + BN + ')' };
    const nn = nnDists(pts).map((d) => d / Dm);
    const m = nn.reduce((a, b) => a + b, 0) / n, mn = Math.min(...nn);
    const psi = orderOf(pts, Dm, kind === 'gas');
    const info = { m, mn, psi };
    if (kind === 'solid') {
      if (m > 1.32) return Object.assign({ ok: false, msg: '입자 사이가 너무 멀어요. 고체 입자는 서로 매우 가까이 붙어 있어요.' }, info);
      if (psi < 0.72) return Object.assign({ ok: false, msg: '고체는 입자가 규칙적으로 늘어서 있어요. 줄을 맞춰 가지런히 놓아 보세요.' }, info);
      return Object.assign({ ok: true, msg: '고체 모형 완성! 입자가 제자리에서 떨리고 있어요.' }, info);
    }
    if (kind === 'liquid') {
      if (m > 1.75) return Object.assign({ ok: false, msg: '입자 사이가 너무 멀어요. 액체 입자는 서로 가까이 모여 있어요.' }, info);
      if (psi > 0.82) return Object.assign({ ok: false, msg: '액체는 입자 배열이 불규칙해요. 줄을 맞추지 말고 자유롭게 놓아 보세요.' }, info);
      return Object.assign({ ok: true, msg: '액체 모형 완성! 입자가 서로 위치를 바꾸며 움직여요.' }, info);
    }
    if (m < 2.0 || mn < 1.4) return Object.assign({ ok: false, msg: '입자 사이가 너무 가까워요. 기체 입자는 서로 매우 멀리 떨어져 있어요.' }, info);
    if (psi > 0.82) return Object.assign({ ok: false, msg: '기체는 입자 배열이 매우 불규칙해요. 줄을 맞추지 말고 흩어 놓아 보세요.' }, info);
    return Object.assign({ ok: true, msg: '기체 모형 완성! 입자가 빠르고 자유롭게 날아다녀요.' }, info);
  }
  /* 입자를 놓을 때 (mode: 상자의 상태, inner: 입자 중심이 놓일 수 있는 범위)
     - 고체 상자: 이웃 입자 곁에 놓으면 줄이 맞게 딱 붙는 '격자 자석'
     - 액체 상자: 가까이 놓으면 맞닿게 붙임 (방향은 그대로)
     - 기체 상자: 그대로 놓임 / 겹치면 밀어냄 */
  function snapPlace(pts, x, y, Dm, inner, mode) {
    const cl = () => { x = Math.max(inner.x0, Math.min(inner.x1, x)); y = Math.max(inner.y0, Math.min(inner.y1, y)); };
    const free = (px, py) => pts.every((q) => Math.hypot(q.x - px, q.y - py) >= 1.0 * Dm - 0.5);
    cl();
    let done = false;
    if (mode === 'solid' && pts.length) {          // 격자 자석: 이웃 입자의 위·아래·왼쪽·오른쪽 자리로 딱 붙음
      let best = null, bd = 1e9;
      for (const q of pts) for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const sx = q.x + ux * 1.06 * Dm, sy = q.y + uy * 1.06 * Dm;
        if (sx < inner.x0 - 0.5 || sx > inner.x1 + 0.5 || sy < inner.y0 - 0.5 || sy > inner.y1 + 0.5 || !free(sx, sy)) continue;
        const d = Math.hypot(sx - x, sy - y);
        if (d < bd) { bd = d; best = [sx, sy]; }
      }
      if (best && bd < 1.0 * Dm) { x = best[0]; y = best[1]; done = true; }
    }
    if (!done && mode !== 'gas') {                 // 가까이 놓으면 맞닿게 붙임
      let nb = null, nd = 1e9;
      for (const q of pts) { const d = Math.hypot(q.x - x, q.y - y); if (d < nd) { nd = d; nb = q; } }
      if (nb && nd < 1.45 * Dm) {
        const ang = Math.atan2(y - nb.y, x - nb.x);
        x = nb.x + Math.cos(ang) * 1.06 * Dm; y = nb.y + Math.sin(ang) * 1.06 * Dm;
        cl();
      }
    }
    for (let it = 0; it < 8; it++) {               // 겹치면 밀어냄
      let moved = false;
      for (const q of pts) {
        let dx = x - q.x, dy = y - q.y, d = Math.hypot(dx, dy);
        if (d < 1.0 * Dm - 0.5) {
          if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
          x = q.x + (dx / d) * 1.04 * Dm; y = q.y + (dy / d) * 1.04 * Dm; moved = true; cl();
        }
      }
      if (!moved) break;
    }
    if (!free(x, y)) {                             // 그래도 겹치면 가까운 빈자리를 찾음
      const ox = x, oy = y;
      let found = false;
      for (let rad = 0.3; rad <= 4 && !found; rad += 0.3) {
        for (let k = 0; k < 24 && !found; k++) {
          const a = (k / 24) * Math.PI * 2, cx = Math.max(inner.x0, Math.min(inner.x1, ox + Math.cos(a) * rad * Dm)), cy = Math.max(inner.y0, Math.min(inner.y1, oy + Math.sin(a) * rad * Dm));
          if (free(cx, cy)) { x = cx; y = cy; found = true; }
        }
      }
    }
    return { x, y };
  }
  /*JUDGE-END*/

  /* =========================================================
     3. 거시 그림 도우미 (나무 조각, 물, 공기, 얼음, 유리 그릇)
     ========================================================= */
  const UNIT = 190;                                   // 부피 1 mL를 나타내는 그림 넓이(px²): 그릇·주사기 그림의 비례
  const SAMPLE_ML = 20;                               // 그릇에 옮기는 같은 양
  const GRAIN = Array.from({ length: 7 }, (_, i) => ({ ph: i * 1.9 + 0.7, amp: 1.1 + (i % 3) * 0.6 }));

  /* 나무 조각 (앞면 x,y,w,h + 윗면·옆면): 왼쪽 위에서 빛이 비춤 */
  function drawWood(x, y, w, h, o) {
    o = o || {};
    const d = Math.min(w, h) * 0.2, dx = d * 0.85, dy = d * 0.6;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.shadow !== false) D.shadow(() => { ctx.fillStyle = '#b8803f'; ctx.fillRect(x, y, w, h); }, { blur: 9 + (o.lift || 0) * 10, y: 4 + (o.lift || 0) * 8, color: 'rgba(60,35,10,.3)' });
    ctx.fillStyle = '#9c6230';
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + dx, y - dy); ctx.lineTo(x + w + dx, y + h - dy); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ecc791';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y - dy); ctx.lineTo(x + w + dx, y - dy); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#e2b274'); g.addColorStop(1, '#c08545');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = 'rgba(120,72,28,.34)'; ctx.lineWidth = 1.4;
    GRAIN.forEach((gr, i) => {
      const yy = y + ((i + 0.8) * h) / 7;
      ctx.beginPath();
      for (let xx = 0; xx <= w; xx += 5) { const py = yy + Math.sin(xx * 0.06 + gr.ph) * gr.amp; if (xx === 0) ctx.moveTo(x + xx, py); else ctx.lineTo(x + xx, py); }
      ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(100,58,22,.5)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(x + w * 0.68, y + h * 0.42, w * 0.1, h * 0.06, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + w * 0.68, y + h * 0.42, w * 0.05, h * 0.03, 0, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(90,55,25,.55)'; ctx.lineWidth = 1.6; ctx.strokeRect(x, y, w, h);
    ctx.restore();
    return { dx, dy };
  }
  /* 얼음 조각 (가운데 x,y, 한 변 s) */
  function drawIceCube(x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    D.shadow(() => {
      const g = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(238,250,255,.97)'); g.addColorStop(1, 'rgba(150,203,243,.92)');
      ctx.fillStyle = g; D.roundRect(-s / 2, -s / 2, s, s, s * 0.16); ctx.fill();
    }, { blur: 10, y: 5, color: 'rgba(40,90,150,.3)' });
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.4;
    D.roundRect(-s / 2 + s * 0.12, -s / 2 + s * 0.12, s * 0.76, s * 0.76, s * 0.1); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,175,225,.6)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.38); ctx.lineTo(s * 0.22, -s * 0.05); ctx.moveTo(-s * 0.3, s * 0.1); ctx.lineTo(-s * 0.08, s * 0.3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.ellipse(-s * 0.28, -s * 0.3, s * 0.16, s * 0.07, -0.7, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(100,150,205,.7)'; ctx.lineWidth = 1.6; D.roundRect(-s / 2, -s / 2, s, s, s * 0.16); ctx.stroke();
    ctx.restore();
  }
  /* 유리 그릇 (윗면이 열린 모양) */
  function glassPath(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h - r); ctx.quadraticCurveTo(x, y + h, x + r, y + h);
    ctx.lineTo(x + w - r, y + h); ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - r); ctx.lineTo(x + w, y);
  }
  function glassBack(x, y, w, h, r) {
    ctx.save(); glassPath(x, y, w, h, r); ctx.closePath();
    const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, 'rgba(214,232,252,.55)'); g.addColorStop(0.5, 'rgba(236,246,255,.28)'); g.addColorStop(1, 'rgba(205,224,248,.5)');
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
  }
  function glassFront(x, y, w, h, r) {
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.2; glassPath(x, y, w, h, r); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 9, y + 14); ctx.lineTo(x + 9, y + h - 16); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + w - 8, y + 18); ctx.lineTo(x + w - 8, y + h - 20); ctx.stroke();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 2, y); ctx.moveTo(x + w - 2, y); ctx.lineTo(x + w + 6, y); ctx.stroke();
    ctx.restore();
  }
  /* 물 (x,y,w = 바닥 왼쪽 위 기준 영역의 폭, level = 높이 px, 바닥은 yb) */
  function drawWater(x0, x1, yb, hgt, t, amp, o) {
    o = o || {};
    if (hgt <= 0.5) return;
    const ly = yb - hgt;
    ctx.beginPath(); ctx.moveTo(x0, yb);
    const n = 20;
    for (let i = 0; i <= n; i++) {
      const px = x0 + ((x1 - x0) * i) / n;
      ctx.lineTo(px, ly + Math.sin(t * 2.4 + i * 0.8) * (amp != null ? amp : 1.1) + (o.slosh ? Math.sin(t * 7 + i * 0.5) * o.slosh : 0));
    }
    ctx.lineTo(x1, yb); ctx.closePath();
    const g = ctx.createLinearGradient(0, ly, 0, yb);
    g.addColorStop(0, 'rgba(124,196,255,.72)'); g.addColorStop(1, 'rgba(70,150,235,.9)');
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x0 + 2, ly - 1, x1 - x0 - 4, 2.5);
  }
  /* 컵 (뚜껑이 없는 유리컵): (x,y)=왼쪽 위, level 0~1 */
  function cupPath(x, y, w, h) {
    const tp = w * 0.1, r = 9;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + tp, y + h - r); ctx.quadraticCurveTo(x + tp + 1, y + h, x + tp + r, y + h);
    ctx.lineTo(x + w - tp - r, y + h); ctx.quadraticCurveTo(x + w - tp - 1, y + h, x + w - tp, y + h - r); ctx.lineTo(x + w, y);
  }
  function drawCup(x, y, w, h, level, t, o) {
    o = o || {};
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.save();
    cupPath(x, y, w, h); ctx.closePath(); ctx.fillStyle = 'rgba(225,240,255,.42)'; ctx.fill(); ctx.clip();
    if (level > 0.01) {
      const yb = y + h;
      if (!o.tilt) drawWater(x, x + w, yb, (h - 3) * level, t, 1.0);
      else {                                         // 기울인 컵: 수면은 늘 수평(컵 좌표에서는 기울어 보임)
        const y0 = yb - (h - 3) * level, tn = Math.tan(o.tilt), xc = x + w / 2;
        const g = ctx.createLinearGradient(0, y0 - 40, 0, yb + 10);
        g.addColorStop(0, 'rgba(124,196,255,.72)'); g.addColorStop(1, 'rgba(70,150,235,.9)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x - 12, yb + 12); ctx.lineTo(x - 12, y0 - (x - 12 - xc) * tn); ctx.lineTo(x + w + 12, y0 - (x + w + 12 - xc) * tn); ctx.lineTo(x + w + 12, yb + 12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 12, y0 - (x - 12 - xc) * tn); ctx.lineTo(x + w + 12, y0 - (x + w + 12 - xc) * tn); ctx.stroke();
      }
    }
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.8; ctx.lineJoin = 'round'; cupPath(x, y, w, h); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(x + w * 0.16, y + 10); ctx.lineTo(x + w * 0.22, y + h - 14); ctx.stroke();
    ctx.restore();
  }
  /* 공기: 눈에 보이지 않는 기체를 연한 푸른 안개로 나타냄 (clip된 영역에 그림) */
  function drawHaze(x, y, w, h, a, t, seed) {
    if (a <= 0.01) return;
    for (let i = 0; i < 6; i++) {
      const ph = (seed || 0) + i * 1.7;
      const cx = x + w * (0.5 + 0.38 * Math.sin(t * 0.5 + ph)), cy = y + h * (0.5 + 0.38 * Math.cos(t * 0.43 + ph * 1.3));
      const r = Math.max(w, h) * (0.36 + 0.07 * Math.sin(t * 0.7 + ph));
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(150,190,240,' + (0.34 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(150,190,240,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    }
    ctx.strokeStyle = 'rgba(110,160,225,' + (0.24 * a).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      for (let u = 0; u <= 1.001; u += 0.1) {
        const px = x + w * (0.08 + 0.84 * u), py = y + h * (0.22 + 0.27 * i) + Math.sin(u * 5 + t * 1.1 + i * 2 + (seed || 0)) * h * 0.045;
        if (u === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  /* 공기를 담은 투명한 풍선 주머니 */
  function drawPouch(cx, cy, w, h, fill, t, o) {
    o = o || {};
    const sw = w * (0.62 + 0.38 * fill), sh = h * (0.66 + 0.34 * fill), br = 1 + Math.sin(t * 1.6) * 0.012;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(br, br);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.rot) ctx.rotate(o.rot);
    // 묶은 매듭
    ctx.fillStyle = '#e2594f';
    ctx.beginPath(); ctx.moveTo(-6, sh / 2 - 2); ctx.lineTo(6, sh / 2 - 2); ctx.lineTo(10, sh / 2 + 11); ctx.lineTo(-10, sh / 2 + 11); ctx.closePath(); ctx.fill();
    D.shadow(() => {
      const g = ctx.createRadialGradient(-sw * 0.18, -sh * 0.22, sw * 0.05, 0, 0, Math.max(sw, sh) * 0.62);
      g.addColorStop(0, 'rgba(244,250,255,.9)'); g.addColorStop(0.7, 'rgba(196,220,248,.7)'); g.addColorStop(1, 'rgba(150,185,232,.75)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, sw / 2, sh / 2, 0, 0, TAU); ctx.fill();
    }, { blur: 9, y: 4, color: 'rgba(40,80,140,.22)' });
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, sw / 2 - 2, sh / 2 - 2, 0, 0, TAU); ctx.clip();
    drawHaze(-sw / 2, -sh / 2, sw, sh, 0.9 * fill, t, 3);
    ctx.restore();
    ctx.strokeStyle = 'rgba(110,150,205,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, sw / 2, sh / 2, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-sw * 0.22, -sh * 0.26, sw * 0.12, sh * 0.07, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  /* 받침(선반) */
  function drawShelf(x, y, w) {
    D.shadow(() => { ctx.fillStyle = '#c99a5b'; D.roundRect(x - w / 2, y, w, 12, 5); ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - w / 2 + 6, y + 2, w - 12, 2);
  }
  /* 화살표 모양의 손가락 터치 표시 */
  function fingerDot(x, y, k) {
    ctx.save();
    ctx.globalAlpha = 0.5 * k;
    ctx.fillStyle = COL.sub; circle(x, y, 20); ctx.fill();
    ctx.globalAlpha = 0.9 * k;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; circle(x, y, 20); ctx.stroke();
    ctx.restore();
  }

  /* =========================================================
     장면 모음 · 상태
     ========================================================= */
  const SC = {};                       // 장면: { label, hint, enter(reset), update(dt), draw(t), hover/down/move/up(p) }
  const S = { scene: '', sceneT: 0, zoom: true, view: null, lensK: new SciSim.Spring(0, { stiffness: 210, damping: 19 }) };
  const SAMPLES = {
    solid: { name: '나무 조각', st: '고체', icon: '🪵' },
    liquid: { name: '물', st: '액체', icon: '💧' },
    gas: { name: '공기', st: '기체', icon: '💨' },
  };

  /* =========================================================
     장면 ①-가: 같은 양을 모양이 다른 그릇에 옮기기
     ========================================================= */
  const PO_G = PHONE ? {
    stock: [{ x: 62, y: 72 }, { x: 62, y: 262 }, { x: 62, y: 452 }],
    A: { x: 146, w: 74, h: 256, cap: 100 }, B: { x: 236, w: 192, h: 148, cap: 150 }, floorY: 504, block: 52, tab: { x: 124, w: 312 },
  } : {
    stock: [{ x: 108, y: 68 }, { x: 108, y: 240 }, { x: 108, y: 412 }],
    A: { x: 298, w: 88, h: 216, cap: 100 }, B: { x: 470, w: 206, h: 138, cap: 150 }, floorY: 476, block: 60, tab: { x: 252, w: 520 },
  };
  const NAMEA = '🧪 가늘고 긴 병', NAMEB = '🥣 넓고 낮은 통';
  const PO = {
    seen: new Set(), carriers: [], drag: null, hoverC: null, pop: { solid: 1, liquid: 1, gas: 1 }, touched: false,
    conts: ['A', 'B'].map((id) => ({
      id, content: null, k: 0, prev: null, busy: false,
      lid: new SciSim.Spring(0, { stiffness: 190, damping: 20 }), wob: new SciSim.Spring(0, { stiffness: 70, damping: 4 }),
    })),
  };
  const contGeom = (c) => { const g = PO_G[c.id]; return { x: g.x, y: PO_G.floorY - g.h, w: g.w, h: g.h, cap: g.cap, cx: g.x + g.w / 2 }; };
  const stockPos = (sid) => PO_G.stock[KINDS.indexOf(sid)];
  function poReset() {
    PO.seen.clear(); PO.carriers.length = 0; PO.drag = null; PO.hoverC = null; PO.touched = false;
    PO.pop = { solid: 1, liquid: 1, gas: 1 };
    PO.conts.forEach((c) => { c.content = null; c.k = 0; c.prev = null; c.busy = false; c.lid.value = 0; c.lid.target = 0; c.lid.velocity = 0; c.wob.value = 0; c.wob.velocity = 0; });
  }
  function pourInto(cid, sid) {
    const c = PO.conts.find((x) => x.id === cid);
    if (!c || c.busy) return false;
    if (c.content === sid) return false;
    if (PO.carriers.some((k) => k.sid === sid)) return false;
    PO.touched = true;
    if (c.content) c.prev = { kind: c.content, a: 1 };
    c.content = sid; c.k = 0; c.busy = true;
    PO.carriers.push({ sid, cid, t0: now(), dur: sid === 'solid' ? 1.1 : sid === 'liquid' ? 2.3 : 2.4, landed: false, fx: 0 });
    Sound.tone(sid === 'gas' ? 340 : 520, 0.08, 'triangle', 0.05);
    hideHint();
    return true;
  }
  /* 샘플을 눌렀을 때: 아직 담지 않은 그릇에 자동으로 담기 */
  function autoPour(sid) {
    const cand = PO.conts.filter((c) => c.content !== sid && !c.busy);
    if (!cand.length) { toast('두 그릇에 모두 담아 봤어요. 다른 샘플도 담아 보세요!'); return false; }
    const score = (c) => (c.content ? 1 : 0) + (PO.seen.has(sid + '|' + c.id) ? 2 : 0);   // 빈 그릇, 아직 안 담아 본 그릇 먼저
    cand.sort((a, b) => score(a) - score(b));
    return pourInto(cand[0].id, sid);
  }
  function drawProp(sid, x, y, sc, t, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (sid === 'solid') { const b = PO_G.block; drawWood(-b / 2, -b / 2 + 4, b, b, { lift: o.lift, alpha: o.alpha }); }
    else if (sid === 'liquid') drawCup(-31, -38, 62, 76, o.level != null ? o.level : 0.6, t, { alpha: o.alpha, tilt: o.tilt });
    else drawPouch(0, 0, 78, 84, o.fill != null ? o.fill : 1, t, { alpha: o.alpha });
    ctx.restore();
  }
  function drawContent(c, g, kind, k, alpha, t) {
    const ix = g.x + 4, iw = g.w - 8, yb = g.y + g.h - 3;
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    if (kind === 'solid') {
      if (k > 0) {
        const sz = PO_G.block, rest = yb - sz, start = g.y - 96;
        const y = lerp(start, rest - 1, k >= 1 ? 1 : ease.outBounce(k));
        drawWood(ix + (iw - sz) / 2, y, sz, sz, { lift: 0 });
      }
    } else if (kind === 'liquid') {
      const h = ((SAMPLE_ML * UNIT) / iw) * ease.inOutSine(k);
      ctx.save(); glassPath(g.x, g.y, g.w, g.h, 12); ctx.closePath(); ctx.clip();
      drawWater(ix, ix + iw, yb, h, t, 1.2 + Math.abs(c_wob(g)) * 3);
      ctx.restore();
    } else {
      const a = 0.95 * ease.outQuad(k);
      ctx.save(); ctx.beginPath(); ctx.rect(ix, g.y + 6, iw, g.h - 9); ctx.clip();
      drawHaze(ix, g.y + 6, iw, g.h - 9, a * 1.25, t, g.cap * 0.01);
      ctx.restore();
    }
    ctx.restore();
  }
  const c_wob = (g) => { const c = PO.conts.find((x) => PO_G[x.id].x === g.x); return c ? c.wob.value : 0; };

  SC.pour = {
    label: '🥣 같은 양을 모양이 다른 그릇에 옮기기',
    hint: '🥣 샘플을 끌어 그릇에 담아요 (눌러도 돼요)',
    enter(reset) { if (reset) poReset(); },
    update(dt) {
      const t = now();
      for (let i = PO.carriers.length - 1; i >= 0; i--) {
        const k = PO.carriers[i], c = PO.conts.find((x) => x.id === k.cid), g = contGeom(c), e = t - k.t0;
        if (k.sid === 'solid') c.k = clamp((e - 0.45) / 0.5, 0, 1);
        else if (k.sid === 'liquid') c.k = clamp((e - 0.78) / 0.92, 0, 1);
        else c.k = clamp((e - 0.8) / 0.9, 0, 1);
        if (k.sid === 'solid' && !k.landed && e >= 0.95) {
          k.landed = true; Sound.tone(150, 0.1, 'triangle', 0.08);
          if (!RM) for (let j = 0; j < 8; j++) FX.emit({ x: g.cx + rand(-26, 26), y: g.y + g.h - 6, vx: rand(-60, 60), vy: rand(-70, -20), life: 0.5, size: rand(2, 4), color: 'rgba(190,150,100,.8)', gravity: 260 });
        }
        if (k.sid === 'liquid' && e > 0.85 && e < 1.7 && !RM) {
          k.fx -= dt;
          if (k.fx <= 0) {
            k.fx = 0.045;
            const lx = g.x + g.w * 0.62, sy = g.y + g.h - 3 - ((SAMPLE_ML * UNIT) / (g.w - 8)) * ease.inOutSine(c.k);
            for (let j = 0; j < 2; j++) FX.emit({ x: lx + 3, y: sy, vx: rand(-60, 60), vy: rand(-120, -40), life: 0.4, size: rand(1.4, 2.6), color: '#9fd0ff', gravity: 700 });
            c.wob.target = 0; c.wob.velocity += rand(-1, 1) * 1.5;
          }
        }
        if (k.sid === 'gas' && e > 0.85 && e < 1.7 && !RM) {
          k.fx -= dt;
          if (k.fx <= 0) {
            k.fx = 0.05;
            FX.emit({ x: g.cx + rand(-10, 10), y: g.y - 40, vx: rand(-35, 35), vy: rand(60, 120), life: 0.9, size: rand(7, 12), grow: 14, color: 'rgba(150,190,240,.45)', shape: 'smoke', drag: 1.2 });
          }
        }
        if (e >= k.dur) {
          PO.carriers.splice(i, 1);
          c.k = 1; c.busy = false;
          PO.seen.add(k.sid + '|' + k.cid);
          PO.pop[k.sid] = 0;
          SciSim.tween(PO.pop, { [k.sid]: 1 }, { duration: 0.45, ease: 'outBack' });
        }
      }
      PO.conts.forEach((c) => {
        c.lid.target = c.content === 'gas' && !PO.carriers.some((k) => k.cid === c.id && k.sid === 'gas' && now() - k.t0 < 1.7 && now() - k.t0 > 0.5) ? 1 : 0;
        if (c.content !== 'gas') c.lid.target = 0;
        c.lid.update(dt); c.wob.update(dt);
        if (c.prev) { c.prev.a = SciSim.approach(c.prev.a, 0, dt, 6); if (c.prev.a < 0.02) c.prev = null; }
      });
    },
    draw(t) {
      const gA = contGeom(PO.conts[0]), gB = contGeom(PO.conts[1]), FY = PO_G.floorY;
      // 탁자
      D.shadow(() => {
        const g = ctx.createLinearGradient(0, FY, 0, FY + 18); g.addColorStop(0, '#d8ad72'); g.addColorStop(1, '#bd8d52');
        ctx.fillStyle = g; D.roundRect(PO_G.tab.x, FY, PO_G.tab.w, 18, 8); ctx.fill();
      }, { blur: 10, y: 4, color: 'rgba(80,50,20,.28)' });
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(PO_G.tab.x + 8, FY + 2, PO_G.tab.w - 16, 2);
      // 샘플 선반
      KINDS.forEach((sid, i) => {
        const p = PO_G.stock[i], busy = PO.carriers.some((k) => k.sid === sid) || (PO.drag && PO.drag.sid === sid);
        drawShelf(p.x, p.y + 52, 112);
        if (busy) { ctx.save(); ctx.globalAlpha = 0.28; ctx.setLineDash([6, 5]); ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 2; D.roundRect(p.x - 40, p.y - 46, 80, 96, 14); ctx.stroke(); ctx.restore(); }
        else {
          const lift = PO.hoverStock === sid ? 1 : 0;
          drawProp(sid, p.x, p.y + (lift ? -3 : 0), Math.max(0.01, PO.pop[sid]), t, { lift });
        }
        const sm = SAMPLES[sid];
        D.label(p.x, p.y + 78, sm.st + ' · ' + sm.name, { bg: ST[sid].col, size: 13.5 });
        text(p.x, p.y + 100, SAMPLE_ML + ' mL', { size: 13, weight: 800, color: COL.muted });
      });
      // 그릇
      PO.conts.forEach((c) => {
        const g = contGeom(c), hov = PO.hoverC === c.id;
        D.label(g.cx, g.y - 20, (c.id === 'A' ? NAMEA : NAMEB) + ' · ' + g.cap + ' mL', { bg: '#fff', color: COL.ink9, size: 13.5, border: '#d5dbe6' });
        if (hov) {
          ctx.save(); ctx.fillStyle = 'rgba(139,92,246,.12)'; D.roundRect(g.x - 10, g.y - 8, g.w + 20, g.h + 14, 16); ctx.fill();
          ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(124,58,237,.7)'; ctx.lineWidth = 2.4; D.roundRect(g.x - 10, g.y - 8, g.w + 20, g.h + 14, 16); ctx.stroke(); ctx.restore();
        }
        glassBack(g.x, g.y, g.w, g.h, 12);
        if (c.prev) drawContent(c, g, c.prev.kind, 1, c.prev.a, t);
        if (c.content) drawContent(c, g, c.content, c.k, 1, t);
        glassFront(g.x, g.y, g.w, g.h, 12);
        // 뚜껑 (공기를 담았을 때)
        const lk = c.lid.value;
        if (lk > 0.02 || c.content === 'gas') {
          const lx = g.x - 6 + (1 - clamp(lk, 0, 1)) * (g.w * 0.9), ly = g.y - 8 - (1 - clamp(lk, 0, 1)) * 6;
          ctx.save(); ctx.globalAlpha = 0.55 + 0.4 * clamp(lk, 0, 1);
          ctx.fillStyle = 'rgba(205,225,248,.85)'; D.roundRect(lx, ly, g.w + 12, 8, 4); ctx.fill();
          ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2; D.roundRect(lx, ly, g.w + 12, 8, 4); ctx.stroke();
          ctx.restore();
        }
        // 담긴 양 (부피)
        if (c.content && !c.busy) {
          const vol = c.content === 'gas' ? g.cap : SAMPLE_ML;
          const lbl = c.content === 'gas' ? '부피 ' + vol + ' mL (그릇 전체)' : '부피 ' + vol + ' mL';
          D.label(g.cx, FY + 34, lbl, { bg: ST[c.content].col, size: 13, pad: 9 });
        }
      });
      // 옮기는 중인 샘플
      PO.carriers.forEach((k) => {
        const c = PO.conts.find((x) => x.id === k.cid), g = contGeom(c), sp = stockPos(k.sid), e = now() - k.t0;
        if (k.sid === 'solid') {
          if (e < 0.45) {
            const u = ease.inOutCubic(e / 0.45);
            drawProp('solid', lerp(sp.x, g.cx, u), lerp(sp.y, g.y - 60, u) - Math.sin(u * Math.PI) * 28, 1 + 0.1 * Math.sin(u * Math.PI), t, { lift: 1 });
          }
        } else if (k.sid === 'liquid') {
          const lipX = g.x + g.w * 0.62 + 14, lipY = g.y - 34;
          const fly = ease.inOutCubic(clamp(e / 0.5, 0, 1)), back = ease.inOutCubic(clamp((e - 1.95) / 0.35, 0, 1));
          const tiltIn = ease.inOutCubic(clamp((e - 0.5) / 0.28, 0, 1)), tiltOut = ease.inOutCubic(clamp((e - 1.7) / 0.25, 0, 1));
          const tilt = (tiltIn - tiltOut) * 1.4;
          const level = e < 0.78 ? 0.6 : 0.6 * (1 - ease.inOutSine(clamp((e - 0.78) / 0.92, 0, 1)));
          const w = 62, h = 76;
          // 컵의 처음/끝 위치(가운데)와 입구 위치 → 가운데 기준으로 이동
          const cx0 = lerp(sp.x, lipX - w / 2, fly), cy0 = lerp(sp.y, lipY + h / 2, fly);
          const alpha = 1 - back;
          if (alpha > 0.02) {
            const bx = lerp(cx0, sp.x, back), by = lerp(cy0, sp.y, back);
            ctx.save();
            const px = bx + w / 2, py = by - h / 2;            // 입구(오른쪽 위 모서리)를 축으로 기울임
            ctx.translate(px, py); ctx.rotate(tilt); ctx.translate(-px, -py);
            drawCup(bx - w / 2, by - h / 2, w, h, level, t, { alpha, tilt });
            ctx.restore();
          }
          // 물줄기
          if (e > 0.8 && e < 1.72) {
            const w2 = 5 * Math.min(1, (e - 0.8) / 0.12) * (e > 1.62 ? (1.72 - e) / 0.1 : 1);
            const ix = g.x + 4, iw = g.w - 8;
            const surf = g.y + g.h - 3 - ((SAMPLE_ML * UNIT) / iw) * ease.inOutSine(c.k);
            const sx = lipX + 2 + Math.sin(t * 20) * 0.4, sy = lipY + 4;
            ctx.save();
            const gr = ctx.createLinearGradient(sx, sy, sx, surf); gr.addColorStop(0, 'rgba(140,205,255,.9)'); gr.addColorStop(1, 'rgba(80,160,240,.9)');
            ctx.fillStyle = gr;
            ctx.beginPath(); ctx.moveTo(sx - w2 * 0.5, sy); ctx.quadraticCurveTo(sx + 6, (sy + surf) / 2, sx + 8 - w2 * 0.3, surf); ctx.lineTo(sx + 8 + w2 * 0.3, surf); ctx.quadraticCurveTo(sx + 6 + w2, (sy + surf) / 2, sx + w2 * 0.5, sy); ctx.closePath(); ctx.fill();
            ctx.restore(); void ix;
          }
        } else {
          const topPos = { x: g.cx, y: g.y - 62 };
          const fly = ease.inOutCubic(clamp(e / 0.5, 0, 1)), back = ease.inOutCubic(clamp((e - 2.0) / 0.4, 0, 1));
          const fill = e < 0.8 ? 1 : 1 - 0.65 * ease.outQuad(clamp((e - 0.8) / 0.9, 0, 1));
          const px = lerp(lerp(sp.x, topPos.x, fly), sp.x, back), py = lerp(lerp(sp.y, topPos.y, fly), sp.y, back);
          drawPouch(px, py, 78, 84, fill, t, { alpha: 1 - back * 0.9 });
        }
      });
      // 끌고 있는 샘플
      if (PO.drag) {
        const d = PO.drag;
        drawProp(d.sid, d.x, d.y, 1.1, t, { lift: 1 });
      }
      // 안내
      if (!PO.touched && !PO.drag) {
        const p = PO_G.stock[0];
        D.ring(p.x, p.y, 54, t, { color: COL.sub });
        D.label(p.x + (PHONE ? 112 : 132), p.y + 6, '👆 끌어서 그릇에!', { bg: COL.sub, size: 13 });
      }
    },
    grab(p) { return !!poStockAt(p); },
    hover(p) {
      PO.hoverStock = null;
      const sid = poStockAt(p); if (sid) { PO.hoverStock = sid; return 'grab'; }
      return null;
    },
    down(p) {
      const sid = poStockAt(p);
      if (!sid) return false;
      if (PO.carriers.some((k) => k.sid === sid)) return false;
      PO.drag = { sid, x: stockPos(sid).x, y: stockPos(sid).y, sx: p.x, sy: p.y, moved: false, offX: stockPos(sid).x - p.x, offY: stockPos(sid).y - p.y };
      Sound.click(); hideHint();
      return true;
    },
    move(p) {
      const d = PO.drag; if (!d) return;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true;
      d.x = p.x + d.offX; d.y = p.y + d.offY;
      PO.hoverC = poContAt(p) ? poContAt(p).id : null;
    },
    up(p) {
      const d = PO.drag; if (!d) return;
      PO.drag = null; const hc = poContAt(p); PO.hoverC = null;
      if (!d.moved) { autoPour(d.sid); return; }
      if (hc) { if (!pourInto(hc.id, d.sid)) { if (hc.content === d.sid) toast('이미 같은 것을 담았어요. 다른 샘플이나 다른 그릇에 담아 보세요.'); } }
    },
  };
  function poStockAt(p) {
    for (const sid of KINDS) { const s = stockPos(sid); if (Math.abs(p.x - s.x) < 48 && p.y > s.y - 52 && p.y < s.y + 58 && PO.pop[sid] > 0.5) return sid; }
    return null;
  }
  function poContAt(p) {
    for (const c of PO.conts) { const g = contGeom(c); if (p.x > g.x - 22 && p.x < g.x + g.w + 22 && p.y > g.y - 50 && p.y < g.y + g.h + 20) return c; }
    return null;
  }

  /* =========================================================
     장면 ①-나: 주사기로 눌러 보기 (압축)
        같은 힘으로 눌러도 고체는 꿈쩍 않고, 액체는 거의 줄지 않고, 기체는 크게 줄어듦
     ========================================================= */
  const SY_G = PHONE ? { xs: [76, 220, 364], top: 138, len: 232, mlPx: 4.6, bw: 62, name: 436, vol: 470, bar: 504 }
    : { xs: [180, 400, 620], top: 126, len: 260, mlPx: 5.2, bw: 76, name: 462, vol: 498, bar: 534 };
  const SY_V0 = 30, SY_FMAX = 230;
  const SY = {
    drag: null, touched: false,
    s: KINDS.map((id) => ({ id, F: 0, Ft: 0, maxF: 0, spring: new SciSim.Spring(0, { stiffness: 150, damping: 10 }), vol: SY_V0, shake: 0 })),
  };
  function syVol(id, F) {
    if (id === 'solid') return SY_V0;
    if (id === 'liquid') return SY_V0 - 0.1 * clamp(F / SY_FMAX, 0, 1);
    return SY_V0 / (1 + Math.max(F, -20) / 80);
  }
  function syReset() {
    SY.drag = null; SY.touched = false;
    SY.s.forEach((s) => { s.F = 0; s.Ft = 0; s.maxF = 0; s.spring.value = 0; s.spring.target = 0; s.spring.velocity = 0; s.vol = SY_V0; });
  }
  const syPressed = () => SY.s.filter((s) => s.maxF >= 150).length;
  function syBottom() { return SY_G.top + SY_G.len; }
  SC.syringe = {
    label: '💉 주사기로 눌러 보기',
    hint: '💉 손잡이를 아래로 끌어 눌러 보세요',
    enter(reset) { if (reset) syReset(); },
    update(dt) {
      SY.s.forEach((s, i) => {
        const pressed = SY.drag && SY.drag.i === i;
        s.Ft = pressed ? clamp(SY.drag.py - SY.drag.y0, 0, SY_FMAX) : 0;
        if (s.id === 'gas') { s.spring.target = s.Ft; s.spring.update(dt); s.F = s.spring.value; }
        else { s.F = SciSim.approach(s.F, s.Ft, dt, 22); }
        s.maxF = Math.max(s.maxF, s.Ft);
        s.vol = syVol(s.id, s.F);
        s.shake = s.id === 'solid' && pressed ? clamp((s.F - 40) / 190, 0, 1) : SciSim.approach(s.shake, 0, dt, 12);
      });
    },
    draw(t) {
      const g = SY_G, bot = syBottom();
      KINDS.forEach((id, i) => {
        const s = SY.s[i], x = g.xs[i], bw = g.bw, top = g.top, yp = bot - s.vol * g.mlPx;
        const pressed = SY.drag && SY.drag.i === i;
        const sh = s.shake ? Math.sin(t * 70) * 2.2 * s.shake : 0;
        // 몸통(유리) 경로
        const barrel = () => {
          ctx.beginPath();
          ctx.moveTo(x - bw / 2, top); ctx.lineTo(x - bw / 2, bot); ctx.lineTo(x - 7, bot + 18); ctx.lineTo(x - 7, bot + 44);
          ctx.lineTo(x + 7, bot + 44); ctx.lineTo(x + 7, bot + 18); ctx.lineTo(x + bw / 2, bot); ctx.lineTo(x + bw / 2, top); ctx.closePath();
        };
        D.shadow(() => { barrel(); ctx.fillStyle = 'rgba(226,240,255,.55)'; ctx.fill(); }, { blur: 12, y: 5, color: 'rgba(30,60,110,.18)' });
        // 속에 든 것
        ctx.save(); barrel(); ctx.clip();
        if (id === 'solid') {
          const gg = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0); gg.addColorStop(0, '#e0b072'); gg.addColorStop(0.5, '#caa05f'); gg.addColorStop(1, '#a8742f');
          ctx.fillStyle = gg; ctx.fillRect(x - bw / 2, yp, bw, bot + 50 - yp);
          ctx.strokeStyle = 'rgba(110,66,24,.38)'; ctx.lineWidth = 1.4;
          for (let k = 0; k < 9; k++) { const yy = yp + 10 + k * 18; ctx.beginPath(); for (let xx = 0; xx <= bw; xx += 6) { const py = yy + Math.sin(xx * 0.09 + k) * 1.8; if (xx === 0) ctx.moveTo(x - bw / 2 + xx, py); else ctx.lineTo(x - bw / 2 + xx, py); } ctx.stroke(); }
        } else if (id === 'liquid') {
          const gg = ctx.createLinearGradient(0, yp, 0, bot + 44); gg.addColorStop(0, 'rgba(124,196,255,.78)'); gg.addColorStop(1, 'rgba(70,150,235,.92)');
          ctx.fillStyle = gg; ctx.fillRect(x - bw / 2, yp, bw, bot + 50 - yp);
        } else {
          const dens = SY_V0 / s.vol;                         // 눌릴수록 진해짐
          drawHaze(x - bw / 2, yp, bw, bot + 50 - yp, clamp(0.45 + (dens - 1) * 0.55, 0.3, 1.6), t, 5);
          if (dens > 1.25) { ctx.fillStyle = 'rgba(90,140,215,' + clamp((dens - 1.25) * 0.28, 0, 0.5).toFixed(2) + ')'; ctx.fillRect(x - bw / 2, yp, bw, bot + 50 - yp); }
        }
        ctx.restore();
        // 유리 테두리 · 눈금
        ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; barrel(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - bw / 2 + 8, top + 8); ctx.lineTo(x - bw / 2 + 8, bot - 8); ctx.stroke();
        ctx.fillStyle = '#4b5565'; ctx.font = D.font(13, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.strokeStyle = 'rgba(70,80,100,.75)'; ctx.lineWidth = 1.4;
        for (let ml = 10; ml <= 50; ml += 10) {
          const yy = bot - ml * g.mlPx;
          ctx.beginPath(); ctx.moveTo(x + bw / 2 - 15, yy); ctx.lineTo(x + bw / 2, yy); ctx.stroke();
          if (ml < 50) ctx.fillText(String(ml), x + bw / 2 + 5, yy);
        }
        for (let ml = 5; ml < 50; ml += 10) { const yy = bot - ml * g.mlPx; ctx.beginPath(); ctx.moveTo(x + bw / 2 - 8, yy); ctx.lineTo(x + bw / 2, yy); ctx.stroke(); }
        ctx.textBaseline = 'alphabetic';
        // 끝 마개
        ctx.fillStyle = '#e2594f'; D.roundRect(x - 10, bot + 38, 20, 12, 4); ctx.fill();
        // 위쪽 테두리(손잡이 받침)
        ctx.fillStyle = '#b9c6d8'; D.roundRect(x - bw / 2 - 12, top - 8, bw + 24, 9, 4); ctx.fill();
        ctx.restore();
        // 피스톤(고무 마개) · 막대 · 손잡이
        const rod = 118, hy = yp - 14 - rod;
        ctx.save(); ctx.translate(sh, 0);
        const rg = ctx.createLinearGradient(x - 8, 0, x + 8, 0); rg.addColorStop(0, '#dfe5ee'); rg.addColorStop(0.5, '#f7f9fc'); rg.addColorStop(1, '#aab5c6');
        ctx.fillStyle = rg; ctx.fillRect(x - 7, hy, 14, rod + 6);
        const sg = ctx.createLinearGradient(0, yp - 14, 0, yp + 2); sg.addColorStop(0, '#5a5f6e'); sg.addColorStop(1, '#2f3340');
        ctx.fillStyle = sg; D.roundRect(x - bw / 2 + 2, yp - 14, bw - 4, 16, 5); ctx.fill();
        D.shadow(() => {
          const hg = ctx.createLinearGradient(0, hy - 14, 0, hy); hg.addColorStop(0, '#ff9a5e'); hg.addColorStop(1, '#f26b3a');
          ctx.fillStyle = hg; D.roundRect(x - 36, hy - 14, 72, 15, 7); ctx.fill();
        }, { blur: pressed ? 4 : 9, y: pressed ? 2 : 5, color: 'rgba(120,50,10,.35)' });
        ctx.fillStyle = 'rgba(255,255,255,.45)'; D.roundRect(x - 30, hy - 11, 60, 3, 2); ctx.fill();
        ctx.restore();
        // 누르는 손가락 · 힘 화살표
        if (pressed || s.F > 4) {
          const ay1 = hy - 30 - clamp(s.F, 0, SY_FMAX) * 0.28, ay2 = hy - 20;
          D.arrow(x, Math.max(24, ay1), x, ay2, { color: '#e2464b', width: 5 });
          if (pressed) fingerDot(x, hy - 7, 1);
        }
        // 말풍선
        if (s.F > 110 && id !== 'gas') D.label(x, Math.max(40, hy - 52 - clamp(s.F, 0, SY_FMAX) * 0.28), id === 'solid' ? '꿈쩍 안 해요!' : '거의 안 줄어요', { bg: id === 'solid' ? '#6b7280' : COL.liquid, size: 13 });
        if (id === 'gas' && s.F > 70) D.label(x, Math.max(40, hy - 52 - clamp(s.F, 0, SY_FMAX) * 0.28), '쑥 들어가요!', { bg: COL.gas, size: 13 });
        // 이름 · 부피 · 힘 막대
        const sm = SAMPLES[id];
        D.label(x, g.name, sm.icon + ' ' + sm.name + ' (' + sm.st + ')', { bg: ST[id].col, size: 13.5 });
        const shown = id === 'liquid' ? (s.vol >= SY_V0 - 0.05 ? 30 : Math.round(s.vol * 10) / 10) : Math.round(s.vol * 10) / 10;
        const volTxt = '부피 ' + (shown % 1 === 0 ? shown.toFixed(0) : shown.toFixed(1)) + ' mL';
        text(x, g.vol, volTxt, { size: 17, weight: 800, color: COL.ink9 });
        const bw2 = 96, bx = x - bw2 / 2;
        ctx.fillStyle = '#e6ebf3'; D.roundRect(bx, g.bar, bw2, 10, 5); ctx.fill();
        if (s.F > 1) { ctx.fillStyle = '#e2464b'; D.roundRect(bx, g.bar, Math.max(10, bw2 * clamp(s.F / SY_FMAX, 0, 1)), 10, 5); ctx.fill(); }
        text(x, g.bar + 26, '누르는 힘', { size: 12.5, weight: 700, color: COL.muted });
      });
      if (!SY.touched && !SY.drag) {
        const x = g.xs[2], hy = bot - SY_V0 * g.mlPx - 14 - 118;
        D.ring(x, hy - 6, 36, t, { color: COL.sub });
        D.label(x, hy - 52, '👇 아래로 눌러요', { bg: COL.sub, size: 13 });
      }
    },
    hover(p) { return syAt(p) >= 0 ? 'grab' : null; },
    grab(p) { return syAt(p) >= 0; },
    down(p) {
      const i = syAt(p); if (i < 0) return false;
      SY.drag = { i, y0: p.y, py: p.y }; SY.touched = true; Sound.click(); hideHint();
      return true;
    },
    move(p) { if (SY.drag) SY.drag.py = p.y; },
    up() { SY.drag = null; },
  };
  function syAt(p) {
    const g = SY_G, bot = syBottom();
    for (let i = 0; i < 3; i++) {
      const x = g.xs[i], yp = bot - SY.s[i].vol * g.mlPx, hy = yp - 14 - 118;
      if (Math.abs(p.x - x) < 54 && p.y > hy - 40 && p.y < yp + 10) return i;
    }
    return -1;
  }

  /* =========================================================
     장면 ①-다: 관찰 기록표 (모양·부피가 변하나요?)
     ========================================================= */
  const TB_COLS = [['shape', '모양'], ['vol', '부피']];
  const TB_ANS = { solid: { shape: 'same', vol: 'same' }, liquid: { shape: 'change', vol: 'same' }, gas: { shape: 'change', vol: 'change' } };
  const TB = { ans: { solid: {}, liquid: {}, gas: {} }, wrong: {}, shakeT: -9 };
  const TB_L = PHONE
    ? { x: 8, y: 22, w: 424, h: 564, head: 100, rowY: [140, 280, 420], rowH: 130, labX: 14, labW: 112, colX: [150, 292], colW: 130, pillW: 62, pillH: 42 }
    : { x: 30, y: 18, w: 740, h: 512, head: 100, rowY: [142, 258, 374], rowH: 112, labX: 52, labW: 200, colX: [300, 520], colW: 210, pillW: 96, pillH: 46 };
  function tbPill(sid, col, opt) {
    const L = TB_L, row = KINDS.indexOf(sid), ci = col === 'shape' ? 0 : 1;
    const cx = L.colX[ci] + L.colW / 2, cy = L.rowY[row] + L.rowH / 2;
    const gap = L.pillW / 2 + 6;
    return { x: cx + (opt === 'same' ? -gap : gap), y: cy, w: L.pillW, h: L.pillH };
  }
  const tbAnswered = () => KINDS.reduce((n, sid) => n + TB_COLS.filter(([c]) => TB.ans[sid][c]).length, 0);
  function tbReset() { KINDS.forEach((sid) => { TB.ans[sid] = {}; }); TB.wrong = {}; }
  SC.table = {
    label: '📋 관찰 기록표',
    hint: '📋 본 것을 떠올려 칸을 골라요',
    enter(reset) { if (reset) tbReset(); },
    update() {},
    draw(t) {
      const L = TB_L;
      D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(L.x, L.y, L.w, L.h, 20); ctx.fill(); }, { blur: 14, y: 4 });
      text(L.x + L.w / 2, L.y + 38, '📋 관찰 기록표', { size: PHONE ? 19 : 22, weight: 800, color: COL.ink9 });
      text(L.x + L.w / 2, L.y + 64, PHONE ? '그릇을 바꾸면 어떻게 될까요?' : '같은 양을 모양이 다른 그릇에 옮기면 어떻게 될까요?', { size: 14, weight: 700, color: COL.muted });
      TB_COLS.forEach(([c, nm], ci) => {
        const x = L.colX[ci] + L.colW / 2;
        D.label(x, L.y + L.head - 8 + (PHONE ? 0 : 6), (PHONE ? '' : '그릇을 바꾸면 ') + nm + (c === 'shape' ? '은' : '는'), { bg: '#eef2f8', color: COL.ink9, size: PHONE ? 13 : 14, border: '#d9e0ec' });
      });
      KINDS.forEach((sid, ri) => {
        const y = L.rowY[ri], cy = y + L.rowH / 2;
        ctx.fillStyle = ri % 2 ? '#fbfcfe' : '#f6f8fc'; D.roundRect(L.x + 8, y, L.w - 16, L.rowH - 8, 14); ctx.fill();
        drawProp(sid, L.labX + (PHONE ? 26 : 34), cy + (PHONE ? -16 : 0), PHONE ? 0.62 : 0.8, t, { level: 0.6 });
        if (PHONE) { text(L.labX + 26, cy + 30, ST[sid].name, { size: 14, weight: 800, color: ST[sid].col }); text(L.labX + 26, cy + 47, SAMPLES[sid].name, { size: 12.5, weight: 700, color: COL.muted }); }
        else { text(L.labX + 78, cy - 4, ST[sid].name, { size: 20, weight: 800, color: ST[sid].col, align: 'left' }); text(L.labX + 78, cy + 20, SAMPLES[sid].name, { size: 14, weight: 700, color: COL.muted, align: 'left' }); }
        TB_COLS.forEach(([c]) => {
          ['same', 'change'].forEach((opt) => {
            const pl = tbPill(sid, c, opt), sel = TB.ans[sid][c] === opt, bad = TB.wrong[sid + c] && sel;
            const dx = bad && t - TB.shakeT < 0.5 ? Math.sin((t - TB.shakeT) * 40) * 5 * (1 - (t - TB.shakeT) / 0.5) : 0;
            D.shadow(() => { ctx.fillStyle = sel ? (bad ? '#fee2e2' : '#ede9fe') : '#fff'; D.roundRect(pl.x - pl.w / 2 + dx, pl.y - pl.h / 2, pl.w, pl.h, pl.h / 2); ctx.fill(); }, { blur: sel ? 4 : 6, y: sel ? 1 : 2, color: 'rgba(20,40,80,.16)' });
            ctx.strokeStyle = sel ? (bad ? COL.bad : COL.sub) : '#d5dbe6'; ctx.lineWidth = sel ? 3 : 2; D.roundRect(pl.x - pl.w / 2 + dx, pl.y - pl.h / 2, pl.w, pl.h, pl.h / 2); ctx.stroke();
            text(pl.x + dx, pl.y + 5, opt === 'same' ? (PHONE ? '일정' : '일정해요') : (PHONE ? '변함' : '변해요'), { size: PHONE ? 14 : 16, weight: 800, color: sel ? (bad ? COL.bad : '#5b21b6') : COL.muted });
          });
        });
      });
      D.label(L.x + L.w / 2, L.y + L.h - 22, '✋ 칸을 눌러 고른 뒤 ✔ 확인하기를 눌러요', { bg: 'rgba(27,35,51,.82)', size: 13 });
    },
    hover(p) { return tbHit(p) ? 'pointer' : null; },
    down(p) {
      const h = tbHit(p); if (!h) return false;
      TB.ans[h.sid][h.col] = h.opt; TB.wrong[h.sid + h.col] = false;
      Sound.tone(560 + KINDS.indexOf(h.sid) * 60, 0.05, 'triangle', 0.05); hideHint();
      return false;
    },
  };
  function tbHit(p) {
    for (const sid of KINDS) for (const [c] of TB_COLS) for (const opt of ['same', 'change']) {
      const pl = tbPill(sid, c, opt);
      if (Math.abs(p.x - pl.x) <= pl.w / 2 + 3 && Math.abs(p.y - pl.y) <= pl.h / 2 + 5) return { sid, col: c, opt };
    }
    return null;
  }
  const TB_HINT = {
    'solid:shape': '나무 조각은 어느 그릇에 담아도 모양이 그대로였어요.',
    'solid:vol': '나무 조각의 부피(20 mL)는 그릇이 달라져도 같았어요.',
    'liquid:shape': '물은 그릇에 따라 높이와 모양이 달라졌어요.',
    'liquid:vol': '물의 부피(20 mL)는 두 그릇에서 같았어요.',
    'gas:shape': '공기는 그릇 안을 가득 채워 그릇 모양이 되었어요.',
    'gas:vol': '공기는 그릇 전체로 퍼져서 100 mL, 150 mL로 부피가 달라졌어요.',
  };
  function tableCheck() {
    const left = 6 - tbAnswered();
    if (left > 0) return '아직 고르지 않은 칸이 <b>' + left + '개</b> 있어요.';
    const bad = []; let fresh = false;        // 엔진이 0.3초마다 다시 확인하므로, 새로 틀린 칸만 흔들어 줌
    KINDS.forEach((sid) => TB_COLS.forEach(([c]) => { const ok = TB.ans[sid][c] === TB_ANS[sid][c]; if (!ok && !TB.wrong[sid + c]) fresh = true; TB.wrong[sid + c] = !ok; if (!ok) bad.push(sid + ':' + c); }));
    if (bad.length) { if (fresh) TB.shakeT = now(); return '🔴 ' + bad.length + '칸이 달라요. <b>' + TB_HINT[bad[0]] + '</b>'; }
    return true;
  }

  /* =========================================================
     장면 ②-가: 🔍 입자 모형으로 얼음·물·수증기 비교하기 (거리 · 배열 · 운동)
     ========================================================= */
  const SIMS = { solid: new StateSim('solid'), liquid: new StateSim('liquid'), gas: new StateSim('gas') };
  S.vt = { dist: 0, order: 0, move: 0 };
  const VIEW_SEC = 1.6;
  function resetViews() { S.vt.dist = S.vt.order = S.vt.move = 0; $('#viewNote').textContent = '버튼을 하나씩 눌러 얼음·물·수증기의 입자를 비교해요.'; }
  const CP_G = PHONE
    ? { macro: [0, 1, 2].map((i) => ({ x: 68, y: 112 + 200 * i })), lens: [0, 1, 2].map((i) => ({ cx: 270, cy: 112 + 200 * i, r: 84 })), msc: 0.82 }
    : { macro: [140, 400, 660].map((x) => ({ x, y: 96 })), lens: [140, 400, 660].map((x) => ({ cx: x, cy: 304, r: 102 })), msc: 1 };
  const LENS_BG = { solid: '#eef0ff', liquid: '#eaf6ff', gas: '#fdf0f6' };
  const LENS_NOTE = { dist: '📏 빨간 선: 이웃한 입자 사이의 거리', order: '🧩 파란 선: 이웃한 입자끼리 이은 선', move: '🏃 꼬리: 입자가 지나간 길 (주황색 입자를 따라가요)' };

  /* 수증기 플라스크 (수증기는 눈에 보이지 않으므로 옅은 안개로만 표현) */
  function drawVaporFlask(cx, by, t, sc) {
    ctx.save(); ctx.translate(cx, by); ctx.scale(sc, sc);
    const w = 92, h = 108;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-13, -h); ctx.lineTo(-13, -h + 36); ctx.lineTo(-w / 2, -8); ctx.lineTo(w / 2, -8); ctx.lineTo(13, -h + 36); ctx.lineTo(13, -h); ctx.closePath(); ctx.clip();
    drawHaze(-w / 2, -h, w, h, 0.7, t, 11);
    ctx.restore();
    D.flask(0, 0, w, h, { level: 0, t });
    for (let i = 0; i < 5; i++) {                          // 입구 위로 올라가는 옅은 김
      const ph = (t * 0.26 + i / 5) % 1;
      const x = Math.sin(ph * 6 + i * 1.7) * 11 * (0.4 + ph), y = -h - ph * 62, r = 8 + ph * 16, a = Math.sin(ph * Math.PI) * 0.34;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(150,185,235,' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(150,185,235,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawMacro(kind, x, y, sc, t) {
    ctx.save();
    if (kind === 'solid') { drawIceCube(x - 20 * sc, y + 8 * sc, 64 * sc, -0.12); drawIceCube(x + 26 * sc, y - 6 * sc, 52 * sc, 0.2); }
    else if (kind === 'liquid') { ctx.translate(x, y); ctx.scale(sc, sc); drawCup(-34, -46, 68, 92, 0.66, t); }
    else drawVaporFlask(x, y + 50 * sc, t, sc);
    ctx.restore();
  }
  function drawCompare(t, tagMode) {
    const k = clamp(S.lensK.value, 0, 1);
    KINDS.forEach((kind, i) => {
      const mp = CP_G.macro[i], L = CP_G.lens[i];
      const u = k;                                           // 돋보기가 열리면 물질이 위로 올라가고 작아짐
      const mx = lerp(L.cx, mp.x, u), my = lerp(L.cy - 8, mp.y, u), msc = lerp(1.5, 1, u) * CP_G.msc;
      drawMacro(kind, mx, my, msc, t);
      const spot = { x: mx + (kind === 'solid' ? -20 : 0) * msc, y: my + (kind === 'solid' ? 8 : kind === 'liquid' ? 14 : 22) * msc, r: PHONE ? 11 : 14 };
      const st = ST[kind];
      lens(L, S.lensK.value, spot, (cx, cy, r) => {
        SIMS[kind].draw(cx, cy, r, { view: S.view });
        if (S.view === 'dist') {
          const rr = SIMS[kind].r * (r / SIMS[kind].R), yy = cy + r * 0.8;
          ctx.fillStyle = 'rgba(255,255,255,.88)'; D.roundRect(cx - rr - 36, yy - rr - 4, rr * 2 + 82, rr * 2 + 8, rr + 4); ctx.fill();
          sprites.draw(COL.p, cx - 30, yy, rr, 12);
          text(cx - 30 + rr + 5, yy + 4.5, '입자 1개', { size: 13, weight: 800, color: COL.ink9, align: 'left' });
        }
      }, { title: st.icon + ' ' + st.ex + ' (' + st.name + ')', titleBg: st.col, bg: LENS_BG[kind], rim0: '#c4b5fd', rim1: st.col, rim2: shade(st.col, -0.4) });
      if (S.lensK.value < 0.4) D.label(mx, my + 62 * msc + 8, st.icon + ' ' + st.ex + ' (' + st.name + ')', { bg: st.col, size: 14 });
    });
    if (S.lensK.value > 0.5 && !PHONE) {
      const ny = CP_G.lens[0].cy + CP_G.lens[0].r + 54;
      if (S.view) D.label(VW / 2, ny, LENS_NOTE[S.view], { bg: 'rgba(27,35,51,.84)', size: 14.5 });
      else D.label(VW / 2, ny, '👉 오른쪽의 📏 거리 · 🧩 배열 · 🏃 운동 버튼을 눌러 비교해요', { bg: 'rgba(27,35,51,.84)', size: 14.5 });
    }
    if (S.lensK.value < 0.4 && !PHONE) D.label(VW / 2, 480, '👆 위의 🔍 입자 모형 버튼을 눌러 입자를 들여다봐요', { bg: COL.sub, size: 14.5 });
    if (isNew('zoom') && S.lensK.value > 0.5) newBadge(CP_G.lens[2].cx + CP_G.lens[2].r * 0.74, CP_G.lens[2].cy - CP_G.lens[2].r * 0.9);
    void tagMode;
  }
  let viewSeenFlag = 0;
  SC.compare = {
    label: '🔍 입자 모형으로 비교하기',
    hint: '🔍 📏거리 · 🧩배열 · 🏃운동을 눌러 비교해요',
    enter(reset) { if (reset) { KINDS.forEach((k) => SIMS[k].reset()); viewSeenFlag = 0; } },
    update(dt) {
      KINDS.forEach((k) => SIMS[k].step(dt));
      if (S.view && S.lensK.value > 0.8) {
        S.vt[S.view] += dt;
        let seen = 0;
        ['dist', 'order', 'move'].forEach((v, i) => { if (S.vt[v] >= VIEW_SEC) seen |= 1 << i; });
        if (seen !== viewSeenFlag) { viewSeenFlag = seen; refreshUI(); Sound.tone(700, 0.08, 'triangle', 0.05); }
      }
    },
    draw(t) { drawCompare(t); },
  };

  /* =========================================================
     장면 ②-나: 특징 태그 끌어 붙이기 (거리 · 배열 · 운동)
     ========================================================= */
  const CATS = {
    dist: { name: '입자 사이의 거리', icon: '📏', col: COL.dist, bg: '#e8f0ff' },
    order: { name: '입자의 배열', icon: '🧩', col: COL.order, bg: '#e6f6ec' },
    move: { name: '입자의 운동', icon: '🏃', col: COL.move, bg: '#fff3dc' },
  };
  const CAT_KEYS = ['dist', 'order', 'move'];
  const TAG_DEFS = [
    { id: 'd1', cat: 'dist', text: '매우 가까움', kind: 'solid' }, { id: 'd2', cat: 'dist', text: '가까움', kind: 'liquid' }, { id: 'd3', cat: 'dist', text: '매우 멂', kind: 'gas' },
    { id: 'o1', cat: 'order', text: '규칙적', kind: 'solid' }, { id: 'o2', cat: 'order', text: '불규칙', kind: 'liquid' }, { id: 'o3', cat: 'order', text: '매우 불규칙', kind: 'gas' },
    { id: 'm1', cat: 'move', text: '제자리 진동', kind: 'solid' }, { id: 'm2', cat: 'move', text: '위치를 바꾸며 이동', kind: 'liquid' }, { id: 'm3', cat: 'move', text: '빠르고 자유롭게', kind: 'gas' },
  ];
  const TG = { cards: [], slots: [], drag: null, solved: false, shown: false };
  const TG_G = PHONE
    ? { lens: [0, 1, 2].map((i) => ({ cx: 60, cy: 74 + 130 * i, r: 42 })), nameY: (i) => 128 + 130 * i, slotX: 118, slotW: 310, slotH: 32, slotY: (i, j) => 22 + 130 * i + j * 38, tagW: 134, tagH: 44, tray: (n) => ({ x: 8 + 67 + (n % 3) * 140, y: 438 + Math.floor(n / 3) * 52 }), tagFont: 13 }
    : { lens: [138, 400, 662].map((x) => ({ cx: x, cy: 98, r: 58 })), nameY: () => 186, slotX: (i) => [22, 284, 546][i], slotW: 232, slotH: 36, slotY: (i, j) => 214 + j * 44, tagW: 232, tagH: 44, tray: (n) => ({ x: 138 + (n % 3) * 262, y: 392 + Math.floor(n / 3) * 54 }), tagFont: 15 };
  function tagsReset() {
    const G = TG_G;
    TG.slots = [];
    KINDS.forEach((kind, i) => CAT_KEYS.forEach((cat, j) => {
      const sx = PHONE ? G.slotX : G.slotX(i), w = G.slotW, h = G.slotH, y = G.slotY(i, j);
      TG.slots.push({ kind, cat, x: sx + w / 2, y: y + h / 2, w, h, tag: null });
    }));
    const order = shuffle(TAG_DEFS.map((d, n) => n));
    TG.cards = TAG_DEFS.map((d, n) => {
      const pos = G.tray(order.indexOf(n));
      return Object.assign({}, d, { hx: pos.x, hy: pos.y, x: pos.x, y: pos.y, s: 1, lift: 0, slot: null, wrong: false, shakeT: -9 });
    });
    TG.drag = null; TG.solved = false;
  }
  tagsReset();
  const tagsPlaced = () => TG.cards.filter((c) => c.slot).length;
  function tagsCheck() {
    const left = 9 - tagsPlaced();
    if (left > 0) return '아직 비어 있는 칸이 <b>' + left + '개</b> 있어요.';
    const bad = TG.cards.filter((c) => c.slot.kind !== c.kind);
    TG.cards.forEach((c) => { if (bad.indexOf(c) < 0) c.wrong = false; });
    if (bad.length) {
      bad.forEach((c) => { if (!c.wrong) { c.wrong = true; c.shakeT = now(); } });
      const cats = [...new Set(bad.map((c) => CATS[c.cat].icon + ' ' + CATS[c.cat].name))].join(', ');
      return '빨간 테두리 태그 <b>' + bad.length + '개</b>를 다시 생각해 보세요. (' + cats + ') 🔍 비교 장면에서 본 모습을 떠올려요.';
    }
    return true;
  }
  function tgCardAt(p) {
    for (let i = TG.cards.length - 1; i >= 0; i--) {
      const c = TG.cards[i], w = TG_G.tagW * c.s, h = TG_G.tagH * c.s;
      if (Math.abs(p.x - c.x) < w / 2 + 3 && Math.abs(p.y - c.y) < h / 2 + 3) return c;
    }
    return null;
  }
  function tgSlotAt(p, pad) {
    let best = null, bd = 1e9;
    for (const s of TG.slots) {
      if (Math.abs(p.x - s.x) < s.w / 2 + (pad || 0) && Math.abs(p.y - s.y) < s.h / 2 + (pad || 0)) {
        const d = Math.hypot(p.x - s.x, p.y - s.y);
        if (d < bd) { bd = d; best = s; }
      }
    }
    return best;
  }
  function tgSend(c, x, y, s) { SciSim.tween(c, { x, y, s: s == null ? 1 : s }, { duration: 0.4, ease: 'outBack' }); }
  function tgHome(c) { c.slot = null; tgSend(c, c.hx, c.hy, 1); }
  function tgPlace(c, slot) {
    if (slot.tag && slot.tag !== c) tgHome(slot.tag);
    if (slot.tag !== c) { slot.tag = c; c.slot = slot; }
    tgSend(c, slot.x, slot.y, 0.96);
    Sound.tone(620 + KINDS.indexOf(slot.kind) * 70, 0.07, 'triangle', 0.06);
  }
  SC.tags = {
    label: '🏷️ 특징 태그 붙이기',
    hint: '🏷️ 태그를 같은 색 칸으로 끌어요',
    enter(reset) { if (reset) tagsReset(); },
    update(dt) {
      KINDS.forEach((k) => SIMS[k].step(dt));
      TG.cards.forEach((c) => { if (c !== (TG.drag && TG.drag.card)) c.lift = SciSim.approach(c.lift, 0, dt, 12); });
    },
    draw(t) {
      const G = TG_G;
      KINDS.forEach((kind, i) => {
        const st = ST[kind], L = G.lens[i];
        // 열(상태) 배경
        if (!PHONE) {
          D.shadow(() => { ctx.fillStyle = st.bg; D.roundRect(G.slotX(i) - 10, 10, G.slotW + 20, 334, 18); ctx.fill(); }, { blur: 8, y: 2 });
        } else {
          D.shadow(() => { ctx.fillStyle = st.bg; D.roundRect(6, 12 + 130 * i, 428, 122, 16); ctx.fill(); }, { blur: 8, y: 2 });
        }
        lens(L, 1, null, (cx, cy, r) => { SIMS[kind].draw(cx, cy, r, {}); }, { bg: LENS_BG[kind], rim0: '#c4b5fd', rim1: st.col, rim2: shade(st.col, -0.4) });
        D.label(PHONE ? L.cx : G.slotX(i) + G.slotW / 2, PHONE ? G.nameY(i) : G.nameY(i), st.icon + ' ' + st.ex + ' (' + st.name + ')', { bg: st.col, size: 14 });
      });
      // 칸
      const dragCat = TG.drag ? TG.drag.card.cat : null;
      const hoverSlot = TG.drag ? tgSlotAt({ x: TG.drag.card.x, y: TG.drag.card.y }, 12) : null;
      TG.slots.forEach((s) => {
        const cat = CATS[s.cat], hov = hoverSlot === s, can = dragCat === s.cat;
        ctx.save();
        ctx.fillStyle = s.tag ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.8)';
        D.roundRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 10); ctx.fill();
        ctx.setLineDash([6, 5]); ctx.strokeStyle = rgba(cat.col, hov && can ? 1 : can ? 0.85 : 0.5); ctx.lineWidth = hov && can ? 3 : 2;
        D.roundRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 10); ctx.stroke();
        ctx.restore();
        if (!s.tag) text(s.x, s.y + 5, cat.icon + ' ' + (PHONE ? cat.name.replace('입자 ', '').replace('의 ', ' ').replace('사이 거리', '거리') : cat.name), { size: PHONE ? 12.5 : 13.5, weight: 700, color: rgba(cat.col, 0.85) });
      });
      // 태그
      const list = TG.cards.slice().sort((a, b) => (a === (TG.drag && TG.drag.card)) - (b === (TG.drag && TG.drag.card)));
      list.forEach((c) => tgDrawCard(c, t));
      if (tagsPlaced() === 9 && !TG.drag) {
        const ty = PHONE ? 500 : 440;
        if (TG.solved) D.label(VW / 2, ty, '🎉 세 상태의 입자 특징을 모두 찾았어요!', { bg: COL.good, size: 15 });
        else D.label(VW / 2, ty, '모두 붙였어요! 아래 ✔ 확인하기를 눌러 보세요', { bg: COL.sub, size: 14.5 });
      }
    },
    hover(p) { return !TG.solved && tgCardAt(p) ? 'grab' : null; },
    grab(p) { return !TG.solved && !!tgCardAt(p); },
    down(p) {
      if (TG.solved) return false;
      const c = tgCardAt(p); if (!c) return false;
      if (c.slot) { c.slot.tag = null; c.slot = null; }
      c.wrong = false;
      TG.drag = { card: c, offX: p.x - c.x, offY: p.y - c.y };
      SciSim.tween(c, { lift: 1, s: 1.04 }, { duration: 0.15, ease: 'outQuad' });
      Sound.click(); hideHint();
      return true;
    },
    move(p) { const d = TG.drag; if (!d) return; d.card.x = clamp(p.x - d.offX, 20, VW - 20); d.card.y = clamp(p.y - d.offY, 20, VH - 20); },
    up(p) {
      const d = TG.drag; if (!d) return;
      TG.drag = null;
      const c = d.card, slot = tgSlotAt({ x: c.x, y: c.y }, 12) || tgSlotAt(p, 10);
      if (slot && slot.cat === c.cat) tgPlace(c, slot);
      else { if (slot) { c.shakeT = now(); Sound.fail(); toast('이 칸에는 ' + CATS[slot.cat].icon + ' ' + CATS[slot.cat].name + ' 태그를 놓아요.'); } tgHome(c); }
    },
  };
  function tgDrawCard(c, t) {
    const G = TG_G, w = G.tagW * c.s, h = G.tagH * c.s, cat = CATS[c.cat], lift = c.lift || 0;
    let dx = 0;
    if (t - c.shakeT < 0.5) dx = Math.sin((t - c.shakeT) * 40) * 6 * (1 - (t - c.shakeT) / 0.5);
    ctx.save();
    ctx.translate(c.x + dx, c.y - lift * 4);
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fill(); }, { blur: 5 + lift * 14, y: 2 + lift * 8, color: 'rgba(20,40,80,.24)' });
    ctx.fillStyle = cat.col; D.roundRect(-w / 2, -h / 2, 9 * c.s, h, 5); ctx.fill();
    ctx.strokeStyle = c.wrong ? COL.bad : c.slot && TG.solved ? COL.good : rgba(cat.col, 0.7); ctx.lineWidth = c.wrong || (c.slot && TG.solved) ? 3 : 2;
    D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.stroke();
    ctx.font = D.font(G.tagFont * c.s, 800); ctx.fillStyle = COL.ink9; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.text, 5 * c.s, 1);
    ctx.restore();
  }

  /* =========================================================
     장면 ③: 입자 모형 만들기 (빈 상자에 입자를 끌어 놓기)
        판정(거리 · 규칙성)에 성공하면 입자가 상태에 맞게 살아 움직임
     ========================================================= */
  const BD_G = PHONE
    ? { box: [0, 1, 2].map((i) => ({ x: 14, y: 50 + i * 180, w: 412, h: 98 })), r: 11, bowl: { x: 220, y: 590 }, msgY: (b) => b.y + b.h + 30, dotY: (b) => b.y + b.h + 11, lines: 2, bs: 0.72 }
    : { box: [22, 282, 542].map((x) => ({ x, y: 66, w: 236, h: 268 })), r: 13, bowl: { x: 400, y: 490 }, msgY: (b) => b.y + b.h + 44, dotY: (b) => b.y + b.h + 20, lines: 3, bs: 1 };
  const BD = {
    stage: 1, held: null, hover: null, pulse: 0,
    solid: { kind: 'solid', pts: [], sim: null, alive: false, n: 0, msg: '', ok: false, hl: [], wake: 0 },
    liquid: { kind: 'liquid', pts: [], sim: null, alive: false, n: 0, msg: '', ok: false, hl: [], wake: 0 },
    gas: { kind: 'gas', pts: [], sim: null, alive: false, n: 0, msg: '', ok: false, hl: [], wake: 0 },
  };
  const bdBox = (kind) => BD[kind];
  function buildRect(kind) { const b = BD_G.box[KINDS.indexOf(kind)]; return { x: b.x, y: b.y, w: b.w, h: b.h }; }
  const bdInner = (kind) => { const b = BD_G.box[KINDS.indexOf(kind)], r = BD_G.r, m = r + 6; return { x0: b.x + m, y0: b.y + m, x1: b.x + b.w - m, y1: b.y + b.h - m }; };
  const bdRect = (kind) => { const b = BD_G.box[KINDS.indexOf(kind)]; return { x0: b.x + 4, y0: b.y + 4, x1: b.x + b.w - 4, y1: b.y + b.h - 4 }; };
  const bdActive = (kind) => (game && game.free) || BD.stage >= (kind === 'solid' ? 1 : 2);
  function buildReset() {
    KINDS.forEach((k) => { const b = BD[k]; b.pts = []; b.sim = null; b.alive = false; b.n = 0; b.msg = ''; b.ok = false; b.hl = []; b.wake = 0; });
    BD.held = null; BD.hover = null;
  }
  function bdEvaluate(kind) {
    const b = BD[kind], Dm = 2 * BD_G.r;
    b.n = b.pts.length; b.hl = []; b.early = false;
    const v = judgeModel(kind, b.pts, Dm);
    b.ok = v.ok; b.msg = v.msg; b.verdict = v;
    if (v.wait && b.pts.length >= 2) {                      // 다 놓기 전에도 눈에 띄는 문제는 바로 알려 줌
      const nn = nnDists(b.pts).map((d) => d / Dm);
      if (kind === 'gas') {
        const near = b.pts.map((p, i) => i).filter((i) => nn[i] < 1.4);
        if (near.length) { b.hl = near; b.msg = '입자 사이가 너무 가까워요. 기체 입자는 서로 매우 멀리 떨어져 있어요.'; b.early = true; }
      } else if (kind === 'solid' || kind === 'liquid') {
        const far = b.pts.map((p, i) => i).filter((i) => nn[i] > 1.6);
        if (far.length) { b.hl = far; b.msg = '입자를 서로 닿을 만큼 가까이 놓아요. ' + (kind === 'solid' ? '고체' : '액체') + ' 입자는 가까이 모여 있어요.'; b.early = true; }
      }
    }
    if (!v.ok && !v.wait) {                               // 어떤 입자가 문제인지 빨간 고리로 알려 줌
      const nn = nnDists(b.pts);
      if (kind === 'gas') {
        let bi = -1, bd = 1e9;
        b.pts.forEach((p, i) => { if (nn[i] < bd) { bd = nn[i]; bi = i; } });
        const near = b.pts.map((p, i) => i).filter((i) => nn[i] < 1.4 * Dm);
        b.hl = near.length ? near : bi >= 0 ? [bi] : [];
      } else if (v.m > (kind === 'solid' ? 1.32 : 1.75)) {
        b.hl = b.pts.map((p, i) => i).filter((i) => nn[i] > 1.5 * Dm);
      }
    }
    if (v.ok) bdWake(kind);
  }
  function bdWake(kind) {
    const b = BD[kind];
    b.alive = true; b.wake = now();
    b.sim = new BoxSim(kind, bdRect(kind), BD_G.r, b.pts.map((p) => ({ x: p.x, y: p.y })));
    const r = buildRect(kind);
    Sound.tone(660, 0.09, 'triangle', 0.06); Sound.tone(990, 0.14, 'triangle', 0.06, 0.08);
    FX.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 18, colors: [ST[kind].col, '#ffb400', '#14a058', '#8b5cf6'], speed: 170 });
  }
  function wrapLines(str, maxW, size) {
    ctx.save(); ctx.font = D.font(size, 700);
    const words = str.split(' '), lines = []; let cur = '';
    for (const w of words) {
      const tryS = cur ? cur + ' ' + w : w;
      if (ctx.measureText(tryS).width <= maxW) cur = tryS;
      else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    ctx.restore();
    return lines;
  }
  function drawBowl(x, y, t) {
    const sway = RM ? 0 : Math.sin(t * 1.6) * 1.2, bs = BD_G.bs;
    ctx.save(); ctx.translate(x, y); ctx.scale(bs, bs); ctx.translate(-x, -y);
    D.shadow(() => {
      const g = ctx.createLinearGradient(0, y - 10, 0, y + 34); g.addColorStop(0, '#d9ae74'); g.addColorStop(1, '#b98846');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 76, y); ctx.quadraticCurveTo(x - 66, y + 40, x, y + 42); ctx.quadraticCurveTo(x + 66, y + 40, x + 76, y); ctx.closePath(); ctx.fill();
    }, { blur: 10, y: 5, color: 'rgba(80,50,20,.3)' });
    const r = BD_G.r;
    [[-42, -2], [-14, -6], [14, -2], [42, -6], [-28, -22], [0, -26], [28, -22], [-12, -44], [14, -42]].forEach(([dx, dy], i) => sprites.draw(COL.p, x + dx, y + dy + (i > 3 ? sway : 0), r * 1.02, 12));
    ctx.fillStyle = '#c99a5b'; D.roundRect(x - 82, y - 6, 164, 12, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - 74, y - 4, 148, 2);
    ctx.restore();
  }
  SC.build = {
    label: '🧩 입자 모형 만들기',
    hint: '🧩 입자를 끌어 상자에 놓아요',
    enter(reset) { if (reset) buildReset(); },
    update(dt) {
      KINDS.forEach((k) => { const b = BD[k]; if (b.sim) b.sim.step(dt); });
    },
    draw(t) {
      const r = BD_G.r;
      // 끌어 오는 입자가 놓일 자리 미리 보기
      let preview = null;
      if (BD.held && BD.hover) { const b = BD[BD.hover]; preview = snapPlace(b.pts, BD.held.x, BD.held.y, 2 * r, bdInner(BD.hover), BD.hover); }
      KINDS.forEach((kind, i) => {
        const g = BD_G.box[i], b = BD[kind], st = ST[kind], active = bdActive(kind), hov = BD.hover === kind;
        D.label(g.x + g.w / 2, g.y - 18, st.icon + ' ' + st.name + ' 모형 (' + st.ex + ')', { bg: active ? st.col : '#9aa5b6', size: PHONE ? 13.5 : 14.5 });
        D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(g.x, g.y, g.w, g.h, 18); ctx.fill(); }, { blur: 10, y: 3 });
        ctx.save(); D.roundRect(g.x, g.y, g.w, g.h, 18); ctx.clip();
        const bgG = ctx.createLinearGradient(0, g.y, 0, g.y + g.h); bgG.addColorStop(0, '#fff'); bgG.addColorStop(1, st.bg);
        ctx.fillStyle = bgG; ctx.fillRect(g.x, g.y, g.w, g.h);
        if (b.alive && b.sim) { b.sim.draw(1); }
        else {
          b.pts.forEach((p, j) => {
            const k = p.k == null ? 1 : p.k;
            sprites.draw(COL.p, p.x, p.y, r * (0.4 + 0.6 * k), 12);
            if (b.hl.indexOf(j) >= 0) { ctx.strokeStyle = COL.bad; ctx.lineWidth = 3; circle(p.x, p.y, r + 5 + Math.sin(t * 8) * 1.5); ctx.stroke(); }
          });
        }
        ctx.restore();
        ctx.save(); ctx.setLineDash(b.alive ? [] : [8, 6]); ctx.strokeStyle = b.alive ? rgba(COL.good, 0.9) : rgba(st.col, hov ? 1 : 0.55); ctx.lineWidth = hov || b.alive ? 3.2 : 2.2;
        D.roundRect(g.x + 3, g.y + 3, g.w - 6, g.h - 6, 16); ctx.stroke(); ctx.restore();
        if (hov && preview) {
          ctx.save(); ctx.globalAlpha = 0.55; ctx.setLineDash([5, 4]); ctx.strokeStyle = st.col; ctx.lineWidth = 2.5; circle(preview.x, preview.y, r); ctx.stroke(); ctx.restore();
        }
        // 칸이 비어 있을 때 안내
        if (!b.alive && b.pts.length === 0 && active) {
          const txt = kind === 'solid' ? '여기에 입자 8개를 놓아요' : kind === 'liquid' ? '가깝지만 불규칙하게' : '서로 멀리 흩어지게';
          text(g.x + g.w / 2, g.y + g.h / 2 + 5, txt, { size: 14, weight: 800, color: rgba(st.col, 0.75) });
        }
        // 잠긴 상자
        if (!active) {
          ctx.save(); ctx.fillStyle = 'rgba(246,249,254,.74)'; D.roundRect(g.x, g.y, g.w, g.h, 18); ctx.fill(); ctx.restore();
          text(g.x + g.w / 2, g.y + g.h / 2 - 4, '🔒', { size: 28 });
          text(g.x + g.w / 2, g.y + g.h / 2 + 24, '다음 미션에서 열려요', { size: 14, weight: 800, color: COL.muted });
        }
        // 입자 수 점
        if (active) {
          for (let j = 0; j < BN; j++) {
            const dx = g.x + g.w / 2 + (j - (BN - 1) / 2) * 17, dy = BD_G.dotY(g);
            ctx.fillStyle = j < b.n ? st.col : '#dbe2ee'; circle(dx, dy, 5.4); ctx.fill();
          }
          // 판정 메시지
          const msg = b.msg || (b.n === 0 ? '' : '입자를 ' + BN + '개 놓아 보세요. (' + b.n + ' / ' + BN + ')');
          const lines = wrapLines(msg, g.w - 12, 13.5), y0 = BD_G.msgY(g);
          const col = b.ok || b.alive ? '#0b6b39' : (b.verdict && !b.verdict.wait && b.n >= BN) || b.early ? '#b4232b' : COL.muted;
          lines.slice(0, BD_G.lines).forEach((ln, li) => text(g.x + g.w / 2, y0 + li * (PHONE ? 17 : 19), ln, { size: PHONE ? 13 : 13.5, weight: 800, color: col }));
        }
      });
      // 입자 더미
      drawBowl(BD_G.bowl.x, BD_G.bowl.y, t);
      if (!PHONE) text(BD_G.bowl.x, BD_G.bowl.y + 56, '입자 더미: 입자를 끌어 상자에 놓아요', { size: 13.5, weight: 800, color: COL.muted });
      if (BD.held) {
        const h = BD.held;
        ctx.save(); ctx.fillStyle = 'rgba(30,40,80,.18)'; ctx.beginPath(); ctx.ellipse(h.x + 3, h.y + r + 4, r * 0.9, r * 0.35, 0, 0, TAU); ctx.fill(); ctx.restore();
        sprites.draw(COL.p, h.x, h.y - 3, r * 1.15, 12);
      }
      const total = BD.solid.n + BD.liquid.n + BD.gas.n;
      if (!BD.held && total === 0 && bdActive('solid')) D.ring(BD_G.bowl.x, BD_G.bowl.y - 10 * BD_G.bs, 60 * BD_G.bs, t, { color: COL.sub });
      if (isNew('build')) newBadge(BD_G.bowl.x + 86, BD_G.bowl.y - 36);
    },
    hover(p) { return bdBowlAt(p) || bdPartAt(p) ? 'grab' : null; },
    grab(p) { return !!(bdBowlAt(p) || bdPartAt(p)); },
    down(p) {
      if (bdBowlAt(p)) { BD.held = { x: p.x, y: p.y, kind: null }; Sound.click(); hideHint(); return true; }
      const h = bdPartAt(p);
      if (h) {
        const b = BD[h.kind];
        b.pts.splice(h.idx, 1); BD.held = { x: p.x, y: p.y, kind: h.kind };
        bdEvaluate(h.kind); b.msg = '';
        Sound.click(); return true;
      }
      return false;
    },
    move(p) {
      const h = BD.held; if (!h) return;
      h.x = p.x; h.y = p.y;
      BD.hover = null;
      for (const k of KINDS) { const g = BD_G.box[KINDS.indexOf(k)]; if (bdActive(k) && !BD[k].alive && p.x > g.x && p.x < g.x + g.w && p.y > g.y && p.y < g.y + g.h) BD.hover = k; }
    },
    up(p) {
      const h = BD.held; if (!h) return;
      const k = BD.hover; BD.held = null; BD.hover = null;
      if (k && BD[k].pts.length < BN) {
        const b = BD[k], pos = snapPlace(b.pts, p.x, p.y, 2 * BD_G.r, bdInner(k), k);
        const pt = { x: pos.x, y: pos.y, k: 0 };
        b.pts.push(pt);
        SciSim.tween(pt, { k: 1 }, { duration: 0.35, ease: 'outBack' });
        Sound.tone(520 + b.pts.length * 40, 0.05, 'triangle', 0.05);
        bdEvaluate(k);
      } else if (k) {
        toast('이 상자에는 입자 ' + BN + '개를 모두 놓았어요. 놓은 입자를 끌어서 옮겨 보세요.');
        if (h.kind) { /* 원래 상자에서 꺼낸 입자가 가득 찬 상자에 놓이려는 경우는 없음 */ }
      } else if (h.kind) {                                  // 상자 밖으로 끌어내면 치움
        if (!RM) FX.burst(p.x, p.y, { count: 6, colors: [COL.p], speed: 90, size: 3, life: 0.4 });
        Sound.tone(300, 0.06, 'sine', 0.04);
      }
    },
  };
  function bdBowlAt(p) { const b = BD_G.bowl, s = BD_G.bs; return Math.abs(p.x - b.x) < 84 * s + 6 && p.y > b.y - 54 * s - 4 && p.y < b.y + 44 * s + 4; }
  function bdPartAt(p) {
    for (const k of KINDS) {
      const b = BD[k]; if (!bdActive(k) || b.alive) continue;
      for (let i = b.pts.length - 1; i >= 0; i--) if (Math.hypot(b.pts[i].x - p.x, b.pts[i].y - p.y) < BD_G.r + 6) return { kind: k, idx: i };
    }
    return null;
  }

  /* =========================================================
     장면 ④: 고체·액체·기체 분류하기 (모래·밀가루 같은 고체 알갱이 포함)
     ========================================================= */
  const SORT_DEFS = [
    { id: 'sand', e: '🏖️', n: '모래', c: '줄줄 흘러내려요', k: 'solid' },
    { id: 'flour', e: '🌾', n: '밀가루', c: '가루가 날려요', k: 'solid' },
    { id: 'ice', e: '🧊', n: '얼음', c: '차갑고 단단해요', k: 'solid' },
    { id: 'honey', e: '🍯', n: '꿀', c: '아주 끈적해요', k: 'liquid' },
    { id: 'milk', e: '🥛', n: '우유', c: '컵을 따라 담겨요', k: 'liquid' },
    { id: 'juice', e: '🧃', n: '주스', c: '빨대로 마셔요', k: 'liquid' },
    { id: 'air', e: '💨', n: '공기', c: '눈에 보이지 않아요', k: 'gas' },
    { id: 'steam', e: '☁️', n: '수증기', c: '끓는 물에서 생겨요', k: 'gas' },
    { id: 'helium', e: '🎈', n: '헬륨', c: '풍선을 둥둥 띄워요', k: 'gas' },
  ];
  const SORT_SUB = { solid: '모양과 부피가 일정해요', liquid: '부피는 일정, 모양은 변해요', gas: '모양과 부피가 모두 변해요' };
  const SORT = { cards: [], drag: null, hoverBin: null, solved: false };
  const SL_G = PHONE
    ? { cw: 128, ch: 46, bins: [6, 150, 294].map((x) => ({ x, y: 42, w: 140, h: 336 })), tray: (i) => ({ x: 74 + (i % 3) * 146, y: 418 + Math.floor(i / 3) * 56 }), first: 84, pitch: 52, bs: 1, clue: false }
    : { cw: 152, ch: 52, bins: [14, 278, 542].map((x) => ({ x, y: 46, w: 244, h: 340 })), tray: (i) => (i < 5 ? { x: 82 + i * 158, y: 430 } : { x: 160 + (i - 5) * 158, y: 494 }), first: 92, pitch: 58, bs: 1, clue: true };
  let sortOrderSeq = 1;
  function sortReset() {
    const order = shuffle(SORT_DEFS.slice());
    SORT.cards = order.map((d, i) => { const p = SL_G.tray(i); return Object.assign({}, d, { home: i, x: p.x, y: p.y, s: 1, bin: null, lift: 0, wrong: false, shakeT: -9, order: 0 }); });
    SORT.solved = false; SORT.drag = null; SORT.hoverBin = null;
  }
  sortReset();
  const sortPlaced = () => SORT.cards.filter((c) => c.bin).length;
  function sortSlots(kind) {
    const B = SL_G.bins[KINDS.indexOf(kind)], list = SORT.cards.filter((c) => c.bin === kind).sort((a, b) => a.order - b.order);
    const avail = B.h - SL_G.first - 12 - SL_G.ch;
    const pitch = list.length > 1 ? Math.min(SL_G.pitch, avail / (list.length - 1)) : SL_G.pitch;
    return list.map((c, i) => ({ c, x: B.x + B.w / 2, y: B.y + SL_G.first + SL_G.ch / 2 + i * pitch }));
  }
  function sortLayout(animate) {
    SORT.cards.forEach((c) => {
      if (c === SORT.drag) return;
      let tx, ty;
      if (!c.bin) { const p = SL_G.tray(c.home); tx = p.x; ty = p.y; }
      else { const sl = sortSlots(c.bin).find((s) => s.c === c); tx = sl.x; ty = sl.y; }
      if (animate) SciSim.tween(c, { x: tx, y: ty, s: 1 }, { duration: 0.45, ease: 'outBack' });
      else { c.x = tx; c.y = ty; c.s = 1; }
    });
  }
  function sortCardAt(p) {
    for (let i = SORT.cards.length - 1; i >= 0; i--) {
      const c = SORT.cards[i];
      if (Math.abs(p.x - c.x) < SL_G.cw / 2 + 4 && Math.abs(p.y - c.y) < SL_G.ch / 2 + 4) return c;
    }
    return null;
  }
  function sortBinAt(p) {
    for (let i = 0; i < 3; i++) { const B = SL_G.bins[i]; if (p.x > B.x && p.x < B.x + B.w && p.y > B.y && p.y < B.y + B.h) return KINDS[i]; }
    return null;
  }
  function sortCheck() {
    const left = SORT.cards.filter((c) => !c.bin).length;
    if (left) return '아직 상자에 넣지 않은 카드가 <b>' + left + '장</b> 있어요.';
    const wrong = SORT.cards.filter((c) => c.bin !== c.k);
    SORT.cards.forEach((c) => { if (wrong.indexOf(c) < 0) c.wrong = false; });
    if (wrong.length) {
      wrong.forEach((c) => { if (!c.wrong) { c.wrong = true; c.shakeT = now(); } });
      return '빨간 테두리 카드 <b>' + wrong.length + '장</b>을 다시 생각해 보세요. <b>모양과 부피가 일정한가요?</b> 알갱이 하나하나를 떠올려 보세요.';
    }
    return true;
  }
  function sortDrawCard(c, t) {
    const w = SL_G.cw, h = SL_G.ch, lift = c.lift || 0;
    let dx = 0;
    if (t - c.shakeT < 0.5) dx = Math.sin((t - c.shakeT) * 40) * 6 * (1 - (t - c.shakeT) / 0.5);
    ctx.save();
    ctx.translate(c.x + dx, c.y - lift * 4); ctx.scale(1 + lift * 0.05, 1 + lift * 0.05);
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fill(); }, { blur: 5 + lift * 14, y: 2 + lift * 8, color: 'rgba(20,40,80,.22)' });
    const solved = SORT.solved && c.bin === c.k;
    ctx.strokeStyle = c.wrong ? COL.bad : solved ? COL.good : c.bin ? rgba(ST[c.bin].col, 0.75) : '#dde4ef'; ctx.lineWidth = c.wrong || solved ? 3 : 2;
    D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.stroke();
    ctx.textBaseline = 'middle';
    ctx.font = D.font(PHONE ? 22 : 24, 400); ctx.textAlign = 'center'; ctx.fillStyle = '#000';
    ctx.fillText(c.e, -w / 2 + (PHONE ? 20 : 22), 1);
    ctx.fillStyle = COL.ink9; ctx.textAlign = 'left';
    const tx = -w / 2 + (PHONE ? 40 : 42);
    if (SL_G.clue) {
      ctx.font = D.font(15, 800); ctx.fillText(c.n, tx, -9);
      ctx.font = D.font(12, 700); ctx.fillStyle = COL.muted; ctx.fillText(c.c, tx, 11);
    } else { ctx.font = D.font(15, 800); ctx.fillText(c.n, tx, 1); }
    ctx.restore();
  }
  SC.sort = {
    label: '🗂️ 고체·액체·기체 분류하기',
    hint: '✋ 카드를 알맞은 상자로 끌어요',
    enter(reset) { if (reset) { sortReset(); sortLayout(false); } },
    update() {},
    draw(t) {
      KINDS.forEach((kind, i) => {
        const b = SL_G.bins[i], st = ST[kind], hov = SORT.hoverBin === kind && SORT.drag;
        D.shadow(() => { ctx.fillStyle = hov ? shade(st.bg, -0.03) : st.bg; D.roundRect(b.x, b.y, b.w, b.h, 18); ctx.fill(); }, { blur: hov ? 16 : 8, y: 3 });
        ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = rgba(st.col, hov ? 0.95 : 0.45); ctx.lineWidth = hov ? 3 : 2;
        D.roundRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8, 15); ctx.stroke(); ctx.restore();
        text(b.x + b.w / 2, b.y + (PHONE ? 32 : 38), st.icon + ' ' + st.name, { size: PHONE ? 19 : 22, weight: 800, color: shade(st.col, -0.2) });
        if (PHONE) { text(b.x + b.w / 2, b.y + 52, SORT_SUB[kind].split(', ')[0], { size: 12, weight: 700, color: COL.muted }); if (SORT_SUB[kind].indexOf(', ') > 0) text(b.x + b.w / 2, b.y + 68, SORT_SUB[kind].split(', ')[1], { size: 12, weight: 700, color: COL.muted }); }
        else text(b.x + b.w / 2, b.y + 62, SORT_SUB[kind], { size: 13.5, weight: 700, color: COL.muted });
        const n = SORT.cards.filter((cc) => cc.bin === kind).length;
        for (let j = n; j < 3; j++) {
          const y = b.y + SL_G.first + j * SL_G.pitch;
          ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = rgba(st.col, 0.25); ctx.lineWidth = 1.5;
          D.roundRect(b.x + b.w / 2 - SL_G.cw / 2, y, SL_G.cw, SL_G.ch, 12); ctx.stroke(); ctx.restore();
        }
      });
      if (!SORT.solved && sortPlaced() < 9) text(VW / 2, PHONE ? 404 : 414, PHONE ? '아래 카드를 끌어 상자에 넣어요' : '✋ 아래 카드를 끌어 알맞은 상자에 넣어요', { size: 13.5, weight: 800, color: COL.muted });
      const list = SORT.cards.slice().sort((a, b) => (a === SORT.drag) - (b === SORT.drag));
      list.forEach((c) => sortDrawCard(c, t));
      if (sortPlaced() === 9 && !SORT.drag) {
        const ty = PHONE ? 470 : 462;
        if (SORT.solved) D.label(VW / 2, ty, '🎉 모래·밀가루도 알갱이 하나하나는 고체예요!', { bg: COL.good, size: 15 });
        else D.label(VW / 2, ty, '모두 넣었어요! 아래 ✔ 확인하기를 눌러 보세요', { bg: COL.sub, size: 14.5 });
      }
    },
    hover(p) { return !SORT.solved && sortCardAt(p) ? 'grab' : null; },
    grab(p) { return !SORT.solved && !!sortCardAt(p); },
    down(p) {
      if (SORT.solved) return false;
      const c = sortCardAt(p); if (!c) return false;
      SORT.drag = c; c.offX = p.x - c.x; c.offY = p.y - c.y; c.wrong = false;
      SciSim.tween(c, { lift: 1, s: 1 }, { duration: 0.16, ease: 'outQuad' });
      Sound.click(); hideHint();
      return true;
    },
    move(p) {
      const c = SORT.drag; if (!c) return;
      c.x = clamp(p.x - c.offX, 20, VW - 20); c.y = clamp(p.y - c.offY, 20, VH - 20);
      SORT.hoverBin = sortBinAt(p);
    },
    up(p) {
      const c = SORT.drag; if (!c) return;
      SORT.drag = null;
      const bin = sortBinAt(p);
      if (bin !== c.bin) c.order = sortOrderSeq++;
      c.bin = bin; SORT.hoverBin = null;
      SciSim.tween(c, { lift: 0 }, { duration: 0.25 });
      if (bin) Sound.tone(660, 0.06, 'triangle', 0.05);
      sortLayout(true);
    },
  };

  /* =========================================================
     장면 전환 · UI
     ========================================================= */
  const hintEl = $('#stageHint');
  function showHint(t, ms) { hintEl.textContent = t; hintEl.classList.remove('hide'); clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5000); }
  function hideHint() { hintEl.classList.add('hide'); }
  function sideTop() { const sc = document.querySelector('.side-col'); if (sc) sc.scrollTop = 0; }
  const sceneReady = {};
  function setScene(name, reset) {
    const changed = S.scene !== name;
    if (changed || reset) sideTop();
    S.scene = name;
    if (changed) { S.sceneT = 0; FX.clear(); S.lensK.value = 0; S.lensK.velocity = 0; }
    const sc = SC[name];
    if (changed || reset || !sceneReady[name]) sc.enter(!!reset || !sceneReady[name]);
    sceneReady[name] = true;
    $('#tbLabel').textContent = sc.label;
    if (changed || reset) showHint(sc.hint, 6500);
    refreshUI();
  }
  let lastFree = null;
  function refreshUI() {
    const free = !!(game && game.free);
    const lvl = game && !free ? game.level : -1;
    $$('[data-sc]').forEach((node) => {
      const scs = node.getAttribute('data-sc').split(/\s+/), need = node.getAttribute('data-need');
      node.hidden = !(scs.indexOf(S.scene) >= 0 && (!need || on(need)));
    });
    const card = $('#ctrlCard');
    card.hidden = !card.querySelector('.control:not([hidden])');
    const ro = $('#readouts');
    ro.hidden = !ro.querySelector('.readout:not([hidden])');
    $$('#sceneSeg button').forEach((b) => {
      const sc = b.dataset.scene, lv = +b.dataset.lv;
      let show = free || lv === lvl;
      if (!free && sc === 'table' && !S.tableOpen) show = false;
      if (!free && sc === 'tags' && !S.tagsOpen) show = false;
      b.hidden = !show;
      b.classList.toggle('on', sc === S.scene);
    });
    const vis = $$('#sceneSeg button:not([hidden])').length;
    $('#sceneSeg').hidden = vis < 2;
    $('#tbLabel').hidden = vis >= 2;
    $('#zoomBtn').setAttribute('aria-pressed', S.zoom ? 'true' : 'false');
    $$('.vw').forEach((b) => { b.setAttribute('aria-pressed', S.view === b.dataset.view ? 'true' : 'false'); b.classList.toggle('seen', S.vt[b.dataset.view] >= VIEW_SEC); });
    lastFree = free;
  }
  $('#zoomBtn').addEventListener('click', () => { Sound.click(); S.zoom = !S.zoom; refreshUI(); });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); SC[S.scene].enter(true); showHint(SC[S.scene].hint, 5000); refreshUI(); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  const VIEW_NOTE = {
    dist: '빨간 선은 눈여겨볼 입자와 가장 가까운 이웃 사이의 거리예요. 얼음·물·수증기를 비교해 보세요.',
    order: '이웃한 입자끼리 선으로 이었어요. 선이 만드는 모양(배열)을 비교해 보세요.',
    move: '꼬리는 입자가 지나간 길이에요. 주황색 입자를 따라가며 움직임을 비교해 보세요.',
  };
  $$('.vw').forEach((b) => b.addEventListener('click', () => {
    Sound.click();
    S.view = S.view === b.dataset.view ? null : b.dataset.view;
    $('#viewNote').textContent = S.view ? VIEW_NOTE[S.view] : '버튼을 하나씩 눌러 얼음·물·수증기의 입자를 비교해요.';
    hideHint(); refreshUI();
  }));

  /* ---------- 캔버스 입력: 현재 장면에 맡김 ---------- */
  SciSim.pointer(view, {
    hover(p) { const sc = SC[S.scene]; return sc && sc.hover ? sc.hover(p) : null; },
    down(p) { const sc = SC[S.scene]; return sc && sc.down ? !!sc.down(p) : false; },
    move(p) { const sc = SC[S.scene]; if (sc && sc.move) sc.move(p); },
    up(p) { const sc = SC[S.scene]; if (sc && sc.up) sc.up(p); },
  });
  // 휴대폰: 끌 수 있는 것이 아닌 곳을 끌면 페이지가 스크롤되도록
  view.canvas.style.touchAction = 'pan-y';
  view.canvas.addEventListener('touchstart', (e) => {
    const tc = e.touches[0], sc = SC[S.scene];
    if (tc && sc && sc.grab && sc.grab(view.toLocal(tc))) e.preventDefault();
  }, { passive: false });

  /* ---------- 측정값 표시 ---------- */
  let lastUI = 0;
  const volTxt = (v) => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + '<small>mL</small>';
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    if (lastFree !== !!(game && game.free)) refreshUI();
    $('#zoomBtn').classList.toggle('feature-new', S.scene === 'compare' && isNew('zoom'));
    const vg = document.querySelector('.view-grid'); if (vg) vg.classList.toggle('feature-new', S.scene === 'compare' && isNew('views'));
    if (S.scene === 'pour') {
      PO.conts.forEach((c, i) => {
        const el = $(i ? '#rPB' : '#rPA'), g = contGeom(c);
        el.textContent = !c.content ? '비어 있음' : SAMPLES[c.content].name + ' · ' + (c.content === 'gas' ? g.cap : SAMPLE_ML) + ' mL';
      });
    } else if (S.scene === 'syringe') {
      SY.s.forEach((s, i) => { const v = Math.round(s.vol * 10) / 10; $('#rS' + i).innerHTML = volTxt(s.id === 'liquid' && v >= 29.95 ? 30 : v); });
    } else if (S.scene === 'tags') $('#rTag').innerHTML = tagsPlaced() + '<small>/ 9개</small>';
    else if (S.scene === 'build') KINDS.forEach((k, i) => { $('#rB' + i).innerHTML = BD[k].n + '<small>/ ' + BN + '개</small>'; });
    else if (S.scene === 'sort') $('#rSort').innerHTML = sortPlaced() + '<small>/ 9장</small>';
  }

  /* =========================================================
     미션
     ========================================================= */
  const mark = (b) => (b ? '✅' : '⬜');

  // 퀴즈 그림: 같은 크기의 입자가 촘촘한 고체와 성긴 기체
  const FIG_GAS = (function () {
    function panel(ox, spread, label) {
      let s = '<rect x="' + ox + '" y="24" width="132" height="104" rx="12" fill="#eef4ff" stroke="#bcd0ee"/>';
      const pts = spread
        ? [[24, 44], [74, 38], [112, 62], [40, 82], [92, 100], [22, 112], [66, 70], [118, 112], [104, 36]]
        : [[40, 60], [66, 60], [92, 60], [40, 86], [66, 86], [92, 86], [40, 112], [66, 112], [92, 112]];
      pts.forEach((p) => { s += '<circle cx="' + (ox + p[0]) + '" cy="' + p[1] + '" r="11" fill="#5fa8f5" stroke="#3f84d6" stroke-width="1.5"/>'; });
      s += '<text x="' + (ox + 66) + '" y="16" text-anchor="middle" font-size="13" font-weight="700" fill="#5d6879">' + label + '</text>';
      return s;
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 136" width="320" role="img" aria-label="같은 크기의 입자 9개가 촘촘하게 모여 있는 얼음과 멀리 흩어져 있는 수증기의 입자 모형">' +
      panel(10, false, '얼음 (고체)') + panel(178, true, '수증기 (기체)') +
      '<text x="160" y="80" text-anchor="middle" font-size="22" fill="#8b5cf6">⇄</text></svg>';
  })();

  game = SciSim.game({
    simId: 'm1-three-states',
    mount: '#game',
    badge: '입자 모형 건축가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      pour: '🥣 그릇에 옮기기',
      syringe: '💉 주사기로 누르기',
      table: '📋 관찰 기록표',
      zoom: '🔍 입자 모형 돋보기',
      views: '📏🧩🏃 거리·배열·운동 비교',
      tags: '🏷️ 특징 태그',
      build: '🧩 입자 모형 상자',
      sort: '🗂️ 물질 분류 카드',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onMissionStart(m) {
      sideTop();
      if (m._level === 0 && m._index >= 1) S.tableOpen = true;
      if (m._level === 1 && m._index >= 1) S.tagsOpen = true;
      if (game && game.free) return;
      if (m.scene) setScene(m.scene, false);
      refreshUI();
    },
    onComplete() { refreshUI(); },
    levels: [
      /* ---------------- STEP 1 · 관찰 ---------------- */
      {
        title: '세 가지 상태의 모양과 부피', short: '세 상태', icon: '🧊', phase: '관찰',
        features: ['pour', 'syringe', 'table'],
        intro: '<p class="si-q">❓ 탐구 질문: 얼음, 물, 수증기는 같은 물질인데 왜 성질이 다를까?</p>' +
          '<p>먼저 눈으로 볼 수 있는 성질을 비교해요. <b>나무 조각(고체)</b>, <b>물(액체)</b>, <b>공기(기체)</b>를 같은 양씩 모양이 다른 그릇에 옮겨 보고, <b>주사기</b>로 눌러 보면서 세 가지 상태가 어떻게 다른지 관찰해요.</p>',
        setup() { S.tableOpen = false; syReset(); tbReset(); setScene('pour', true); },
        recap: '고체는 모양과 부피가 일정하고, 액체는 부피는 일정하지만 모양이 변해요. 기체는 모양과 부피가 모두 변하고 쉽게 눌려요.',
        summary: '<ul><li><b>고체</b>(나무 조각): 모양과 부피가 일정하다. 눌러도 부피가 줄어들지 않는다.</li>' +
          '<li><b>액체</b>(물): 부피는 일정하지만 담는 그릇에 따라 모양이 변한다. 거의 눌리지 않는다.</li>' +
          '<li><b>기체</b>(공기): 그릇 전체로 퍼지므로 모양과 부피가 모두 변한다. 쉽게 눌려 부피가 크게 줄어든다.</li></ul>',
        missions: [
          {
            title: '그릇에 옮기고 눌러 보기', scene: 'pour',
            goal: '나무 조각·물·공기를 <b>두 그릇에 모두</b> 담아 보고, <b>💉 주사기</b> 세 개를 차례로 눌러 보세요.',
            hint: '샘플을 끌어서 그릇에 놓거나 샘플을 눌러 보세요. 주사기는 손잡이를 아래로 끌어요. 위쪽 장면 버튼으로 오갈 수 있어요.',
            check: () => PO.seen.size >= 6 && syPressed() >= 3, hold: 0.5,
            status: () => '🥣 그릇에 옮긴 횟수 <b>' + PO.seen.size + ' / 6</b> · 💉 눌러 본 주사기 <b>' + syPressed() + ' / 3</b>',
            explain: '같은 양을 옮겼는데 <b>나무 조각은 모양이 그대로</b>이고, <b>물은 그릇을 따라 모양이 변했고</b>, <b>공기는 그릇 전체로 퍼졌어요</b>. 주사기를 눌렀을 때도 상태마다 달랐어요.',
          },
          {
            title: '관찰 기록표 채우기', scene: 'table', manual: true,
            goal: '그릇을 바꾸었을 때 <b>모양</b>과 <b>부피</b>가 변했는지 칸을 고르고 <b>✔ 확인하기</b>를 누르세요.',
            hint: '🥣 장면에서 본 것을 떠올려요. 공기는 그릇마다 부피(100 mL, 150 mL)가 달랐어요.',
            setup() { S.tableOpen = true; refreshUI(); },
            check: () => tableCheck(),
            onWin() { celebrate(VW / 2, PHONE ? 300 : 270); },
            status: () => '고른 칸 <b>' + tbAnswered() + ' / 6</b>',
            explain: '<b>고체</b>는 모양과 부피가 모두 일정해요. <b>액체</b>는 모양은 변하지만 부피는 일정해요. <b>기체</b>는 그릇 전체로 퍼져 모양과 부피가 모두 변해요.',
          },
          {
            type: 'quiz', title: '쉽게 눌리는 상태', scene: 'syringe',
            goal: '주사기를 눌렀을 때 <b>부피가 가장 많이 줄어든</b> 것은 무엇일까요?',
            choices: ['나무 조각 (고체)', '물 (액체)', '공기 (기체)', '세 가지 모두 비슷하게 줄어들었다'],
            answer: 2,
            feedback: ['나무 조각은 아무리 눌러도 부피가 줄지 않았어요.', '물은 거의 줄어들지 않았어요. 💉 장면에서 부피 숫자를 다시 확인해 보세요.', '', '세 가지는 눌렀을 때 서로 달랐어요. 부피 숫자를 비교해 보세요.'],
            explain: '공기(기체)는 눌렀을 때 부피가 크게 줄고, 물(액체)은 거의 줄지 않으며, 나무 조각(고체)은 전혀 줄지 않아요. 왜 그럴까요? 다음 단계에서 <b>입자 모형</b>으로 알아봐요.',
          },
        ],
      },
      /* ---------------- STEP 2 · 탐구 ---------------- */
      {
        title: '입자 모형으로 비교하기', short: '입자 배열', icon: '🔍', phase: '탐구',
        features: ['zoom', 'views', 'tags'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 고체·액체·기체는 모양과 부피, 눌렸을 때의 변화가 서로 달랐어요.</div>' +
          '<p>이 차이는 눈에 보이지 않는 <b>입자</b>의 모습에서 나와요. 얼음·물·수증기를 <b>🔍 입자 모형</b>으로 들여다보고, <b>입자 사이의 거리</b>, <b>입자의 배열</b>, <b>입자의 운동</b>을 비교해 봐요.</p>',
        setup() { S.tagsOpen = false; S.zoom = true; S.view = null; resetViews(); tagsReset(); setScene('compare', true); },
        recap: '고체는 입자가 규칙적으로 배열되어 매우 가깝고 제자리에서 진동해요. 액체는 불규칙하고 가까우며 위치를 바꾸며 이동해요. 기체는 매우 불규칙하고 매우 멀며 빠르고 자유롭게 움직여요.',
        summary: '<ul><li><b>고체</b>: 입자가 <b>규칙적으로 배열</b>되고, 입자 사이의 거리가 <b>매우 가까우며</b>, 제자리에서 <b>진동</b>한다.</li>' +
          '<li><b>액체</b>: 입자 배열이 <b>불규칙</b>하고, 거리가 <b>가까우며</b>, 서로 <b>위치를 바꾸며 이동</b>한다.</li>' +
          '<li><b>기체</b>: 입자 배열이 <b>매우 불규칙</b>하고, 거리가 <b>매우 멀며</b>, <b>빠르고 자유롭게</b> 운동한다.</li>' +
          '<li>같은 물질이면 상태가 달라도 입자의 종류와 크기는 같다.</li></ul>',
        missions: [
          {
            title: '세 가지 눈으로 비교하기', scene: 'compare',
            goal: '<b>🔍 입자 모형</b>에서 <b>📏 거리, 🧩 배열, 🏃 운동</b>을 하나씩 눌러 얼음·물·수증기를 비교해 보세요.',
            hint: '버튼을 누르고 2초쯤 지켜봐요. 주황색 입자를 따라가면 편해요. 🔍 입자 모형이 꺼져 있다면 켜 주세요.',
            check: () => S.lensK.value > 0.8 && S.vt.dist >= VIEW_SEC && S.vt.order >= VIEW_SEC && S.vt.move >= VIEW_SEC, hold: 0.5,
            status: () => '📏 거리 ' + mark(S.vt.dist >= VIEW_SEC) + ' · 🧩 배열 ' + mark(S.vt.order >= VIEW_SEC) + ' · 🏃 운동 ' + mark(S.vt.move >= VIEW_SEC),
            explain: '얼음·물·수증기는 모두 <b>같은 입자</b>로 이루어져 있어요. 달라진 것은 입자 사이의 <b>거리</b>, 입자가 늘어선 <b>배열</b>, 입자의 <b>운동</b>이에요.',
          },
          {
            title: '특징 태그 붙이기', scene: 'tags', manual: true,
            goal: '각 상태의 <b>거리·배열·운동</b> 칸에 알맞은 태그를 끌어다 놓고 <b>✔ 확인하기</b>를 누르세요.',
            hint: '같은 색 태그가 같은 종류의 칸에 들어가요. 🔍 비교 장면에서 본 모습을 떠올려요.',
            setup() { S.tagsOpen = true; refreshUI(); },
            check: () => tagsCheck(),
            onWin() { TG.solved = true; celebrate(VW / 2, PHONE ? 200 : 210); },
            status: () => '붙인 태그 <b>' + tagsPlaced() + ' / 9</b>',
            explain: '<b>고체</b>: 규칙적 · 매우 가까움 · 제자리 진동 / <b>액체</b>: 불규칙 · 가까움 · 위치를 바꾸며 이동 / <b>기체</b>: 매우 불규칙 · 매우 멂 · 빠르고 자유롭게. 이 세 가지로 상태를 구분할 수 있어요.',
          },
        ],
      },
      /* ---------------- STEP 3 · 모형 ---------------- */
      {
        title: '입자 모형 만들기', short: '입자 모형', icon: '🧩', phase: '모형',
        features: ['build'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세 상태의 입자는 <b>거리·배열·운동</b>이 달랐어요.</div>' +
          '<p>이번에는 직접 <b>입자 모형</b>을 만들어 봐요. 빈 상자에 입자를 끌어다 놓아 모형을 완성하면, 입자가 진짜로 움직이기 시작해요!</p>',
        setup() { BD.stage = 1; buildReset(); setScene('build', true); },
        recap: '입자 사이의 거리와 배열이 달라지면 상태가 달라져요. 입자의 종류·크기·수는 그대로예요.',
        summary: '<ul><li><b>고체 모형</b>: 입자를 서로 닿을 만큼 가깝게, 규칙적으로 놓는다. 입자는 제자리에서 떤다.</li>' +
          '<li><b>액체 모형</b>: 입자를 가깝게, 불규칙하게 놓는다. 입자는 서로 위치를 바꾸며 움직인다.</li>' +
          '<li><b>기체 모형</b>: 입자를 서로 멀리, 매우 불규칙하게 놓는다. 입자는 빠르고 자유롭게 날아다닌다.</li>' +
          '<li>같은 물질의 세 상태에서 입자의 종류·크기·수는 같고 거리·배열·운동이 다르다.</li></ul>',
        missions: [
          {
            title: '고체 모형 만들기', scene: 'build',
            goal: '입자 8개를 끌어다 <b>규칙적으로, 서로 닿을 만큼 가깝게</b> 놓아 <b>🧊 고체</b> 모형을 완성하세요.',
            hint: '입자를 이웃 곁에 가까이 놓으면 줄이 맞게 딱 붙어요. 8개를 모두 놓아 보세요.',
            setup() { BD.stage = 1; refreshUI(); },
            check: () => BD.solid.alive, hold: 0.8,
            onWin() { const r = buildRect('solid'); celebrate(r.x + r.w / 2, r.y + r.h / 2); },
            status: () => '🧊 고체 모형 입자 <b>' + BD.solid.n + ' / ' + BN + '</b> · ' + (BD.solid.alive ? '완성! ✅' : BD.solid.n < BN ? '입자를 더 놓아요' : '배열을 확인해 보세요'),
            explain: '고체는 입자가 <b>규칙적으로 배열</b>하고 서로 <b>매우 가까워요</b>. 입자는 제자리에서 <b>떨리듯 진동</b>할 뿐 자리를 바꾸지는 못해요.',
          },
          {
            title: '액체·기체 모형 만들기', scene: 'build',
            goal: '<b>💧 액체</b>는 가깝지만 불규칙하게, <b>☁️ 기체</b>는 서로 멀리 흩어지게 입자를 8개씩 놓아 보세요.',
            hint: '액체: 줄을 맞추지 말고 오밀조밀 모아요. 기체: 입자끼리 입자 2~3개 크기보다 멀리 떨어뜨려요.',
            setup() { BD.stage = 2; refreshUI(); },
            check: () => BD.liquid.alive && BD.gas.alive, hold: 0.8,
            onWin() { const a = buildRect('liquid'), b = buildRect('gas'); celebrate(a.x + a.w / 2, a.y + a.h / 2); celebrate(b.x + b.w / 2, b.y + b.h / 2); },
            status: () => '💧 액체 모형 <b>' + BD.liquid.n + ' / ' + BN + '</b> ' + mark(BD.liquid.alive) + ' · ☁️ 기체 모형 <b>' + BD.gas.n + ' / ' + BN + '</b> ' + mark(BD.gas.alive),
            explain: '<b>액체</b>는 입자가 가깝지만 배열이 불규칙하고, 서로 <b>위치를 바꾸며</b> 이동해요. <b>기체</b>는 입자 사이가 <b>매우 멀고</b> 배열이 매우 불규칙하며, 빠르고 자유롭게 날아다녀요.',
          },
          {
            type: 'quiz', title: '같은 물질, 다른 성질', scene: 'build',
            goal: '얼음, 물, 수증기는 같은 물질인데 성질이 다른 까닭은 무엇일까요?',
            choices: ['상태에 따라 입자의 종류가 다른 것으로 바뀌기 때문', '상태에 따라 입자 사이의 거리·배열·운동이 다르기 때문', '상태에 따라 입자의 크기가 달라지기 때문', '상태에 따라 입자의 수가 달라지기 때문'],
            answer: 1,
            feedback: ['얼음, 물, 수증기는 모두 같은 물 입자로 되어 있어요. 입자는 다른 것으로 바뀌지 않아요.', '', '내가 만든 모형에서 입자의 크기는 모두 같았어요.', '세 모형 모두 같은 개수(8개)의 입자를 놓았어요.'],
            explain: '세 상태의 입자는 종류도, 크기도, 수도 같아요. 달라지는 것은 입자 사이의 <b>거리</b>, 입자의 <b>배열</b>, 입자의 <b>운동</b>이에요. 그래서 상태에 따라 성질이 달라요.',
          },
        ],
      },
      /* ---------------- STEP 4 · 적용 ---------------- */
      {
        title: '생활 속 물질과 입자 모형', short: '적용', icon: '🏠', phase: '적용',
        features: ['sort'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 입자 모형으로 고체·액체·기체의 특징을 설명했어요.</div>' +
          '<p>이제 주변의 물질을 상태별로 분류하고, 헷갈리기 쉬운 생각을 입자 모형으로 점검해 봐요.</p>',
        setup() { sortReset(); setScene('sort', true); },
        recap: '줄줄 흐르는 모래도 알갱이 하나하나는 고체예요. 기체는 입자가 큰 것이 아니라 입자 사이가 멀고, 고체의 입자도 제자리에서 진동해요.',
        summary: '<ul><li><b>고체</b>: 나무, 얼음, 모래, 밀가루 … (모래·밀가루는 흘러내려도 알갱이 하나하나가 고체)</li>' +
          '<li><b>액체</b>: 물, 꿀, 우유 … <b>기체</b>: 공기, 수증기, 헬륨 …</li>' +
          '<li>기체는 입자가 커서 공간을 많이 차지하는 것이 <b>아니라</b>, 입자 사이의 거리가 매우 멀기 때문이다.</li>' +
          '<li>고체의 입자도 멈춰 있는 것이 <b>아니라</b> 제자리에서 진동한다.</li></ul>',
        missions: [
          {
            title: '고체·액체·기체 분류하기', scene: 'sort', manual: true,
            goal: '카드를 끌어 <b>고체·액체·기체</b> 상자에 나누어 넣고 <b>✔ 확인하기</b>를 누르세요. 🏖️ 모래와 🌾 밀가루도 잘 생각해 보세요.',
            hint: '모래는 줄줄 흘러도 알갱이 하나하나는 모양과 부피가 일정해요. 꿀은 끈적하지만 그릇을 따라 모양이 변해요.',
            check: () => sortCheck(),
            onWin() { SORT.solved = true; celebrate(VW / 2, PHONE ? 250 : 260); },
            status: () => '상자에 넣은 카드 <b>' + sortPlaced() + ' / 9</b>',
            explain: '모래·밀가루·설탕은 줄줄 흐르는 것처럼 보여도 알갱이 하나하나는 모양과 부피가 일정한 <b>고체</b>예요. 꿀은 끈적하지만 그릇을 따라 모양이 변하는 <b>액체</b>이고, 공기·수증기·헬륨은 <b>기체</b>예요.',
          },
          {
            type: 'quiz', title: '기체 입자는 클까?', scene: 'sort',
            goal: '"기체는 공간을 많이 차지하니까 입자가 커요." 이 생각을 입자 모형으로 살펴보면 옳은 설명은 무엇일까요?',
            figure: FIG_GAS,
            choices: ['기체 입자는 고체 입자보다 훨씬 커서 공간을 많이 차지한다', '입자의 크기는 같고, 기체는 입자 사이의 거리가 매우 멀다', '기체 입자는 고체 입자보다 훨씬 작다', '기체 입자는 서로 붙어서 한 덩어리로 움직인다'],
            answer: 1,
            feedback: ['그림에서 두 상태의 입자 크기는 같아요. 달라진 것은 입자 사이의 거리예요.', '', '입자의 크기는 상태가 달라져도 변하지 않아요.', '기체 입자는 서로 멀리 떨어져 제각각 움직여요.'],
            explain: '기체가 공간을 많이 차지하는 까닭은 입자가 커서가 아니라, 입자 사이의 <b>거리가 매우 멀기</b> 때문이에요. 입자의 크기는 고체·액체·기체에서 모두 같아요.',
          },
          {
            type: 'quiz', title: '고체 입자는 가만히 있을까?', scene: 'sort',
            goal: '고체 상태의 입자에 대한 설명으로 옳은 것은 무엇일까요?',
            choices: ['입자가 전혀 움직이지 않고 멈춰 있다', '입자가 제자리에서 진동하고 있다', '입자가 서로 위치를 바꾸며 자유롭게 이동한다', '입자가 액체 입자보다 훨씬 빠르게 움직인다'],
            answer: 1,
            feedback: ['고체 입자도 멈춰 있지 않아요. 🔍 모형에서 입자가 떨리고 있었어요.', '', '고체 입자는 자리를 바꾸지 못하고 제자리에서 움직여요. 위치를 바꾸며 이동하는 것은 액체예요.', '가장 빠른 것은 기체 입자예요. 고체 입자는 제자리에서 진동해요.'],
            explain: '고체의 입자는 정해진 자리에서 <b>진동</b>해요. 멈춰 있는 것이 아니라 제자리에서 떨리고 있어요. 입자가 자리를 바꾸지 못하기 때문에 고체는 모양이 일정해요.',
          },
        ],
      },
    ],
  });

  /* 미션 성공 순간을 감지해 화면 위 축하 효과 */
  let lastPhase = '', lastIdx = -1;
  function watchGame() {
    const ph = game.phase, idx = game.index;
    if (ph === 'success' && (lastPhase !== 'success' || lastIdx !== idx)) {
      const m = game.current();
      if (m && m.onWin) { try { m.onWin(); } catch (e) { console.error(e); } }
    }
    lastPhase = ph; lastIdx = idx;
  }

  /* =========================================================
     시작 · 루프
     ========================================================= */
  if (!S.scene) setScene('pour', true);
  refreshUI();

  function update(dt) {
    dt = clamp(dt, 0, 0.05);                  // 첫 프레임의 시간 차이가 음수가 되면 입자 위치가 NaN이 되어 사라지므로 막아 둠
    S.sceneT += dt;
    S.lensK.target = S.zoom && on('zoom') ? 1 : 0;
    S.lensK.update(dt);
    const sc = SC[S.scene];
    if (sc.update) sc.update(dt);
    FX.update(dt);
  }
  function draw(t) {
    view.clear(BG);
    SC[S.scene].draw(t);
    FX.draw(ctx);
    drawChecks(t);
    if (S.sceneT < 0.4) {                      // 장면 전환: 부드럽게 나타나기
      ctx.save(); ctx.globalAlpha = 1 - ease.outCubic(S.sceneT / 0.4);
      ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH); ctx.restore();
    }
  }
  let loopErr = 0;
  SciSim.loop((dt, t) => {
    try {
      update(dt);
      draw(now());
      updateReadouts(t);
      watchGame();
    } catch (e) {
      view.apply(); ctx.globalAlpha = 1;
      if (loopErr++ < 3) console.error(e);
    }
  });

  /* ---------- 점검용 (자동 테스트) ---------- */
  window.__sim = {
    get scene() { return S.scene; },
    setScene,
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / VW, y: r.top + (y * r.height) / VH }; },
    VW, VH, PHONE,
    geom: { PO_G, SY_G, TB_L },
    state() {
      return {
        scene: S.scene, seen: [...PO.seen], pressed: SY.s.map((s) => Math.round(s.maxF)), vols: SY.s.map((s) => s.vol),
        table: JSON.parse(JSON.stringify(TB.ans)), lensK: S.lensK.value, view: S.view, vt: Object.assign({}, S.vt),
        tags: tagsPlaced(), build: { solid: BD.solid.n, liquid: BD.liquid.n, gas: BD.gas.n, alive: [BD.solid.alive, BD.liquid.alive, BD.gas.alive] }, sorted: sortPlaced(),
      };
    },
    pourAll() { PO.conts.forEach((c) => { c.busy = false; }); PO.carriers.length = 0; KINDS.forEach((k) => ['A', 'B'].forEach((cid) => PO.seen.add(k + '|' + cid))); PO.touched = true; },
    pressAll() { SY.s.forEach((s) => { s.maxF = 200; }); SY.touched = true; },
    fillTable(ok) { KINDS.forEach((sid) => TB_COLS.forEach(([c]) => { TB.ans[sid][c] = ok ? TB_ANS[sid][c] : (TB_ANS[sid][c] === 'same' ? 'change' : 'same'); })); },
    setView(v) { S.view = v; refreshUI(); },
    setVt(sec) { S.vt.dist = S.vt.order = S.vt.move = sec; },
    geom2: { TG_G, BD_G, SL_G },
    nan() { return KINDS.some((k) => SIMS[k].p.some((q) => q.x !== q.x || q.y !== q.y)); },
    tagInfo() { return { cards: TG.cards.map((c) => ({ id: c.id, cat: c.cat, kind: c.kind, x: c.x, y: c.y, placed: !!c.slot })), slots: TG.slots.map((s) => ({ kind: s.kind, cat: s.cat, x: s.x, y: s.y })) }; },
    placeTags(ok) { TG.cards.forEach((c) => { const want = TG.slots.find((s) => s.cat === c.cat && s.kind === (ok ? c.kind : KINDS[(KINDS.indexOf(c.kind) + 1) % 3])); if (c.slot) { c.slot.tag = null; c.slot = null; } if (want.tag) { want.tag.slot = null; } want.tag = c; c.slot = want; c.x = want.x; c.y = want.y; c.s = 0.96; }); },
    sortInfo() { return SORT.cards.map((c) => ({ id: c.id, k: c.k, bin: c.bin, x: c.x, y: c.y })); },
    solveSort() { SORT.cards.forEach((c) => { c.bin = c.k; c.order = sortOrderSeq++; c.wrong = false; }); sortLayout(false); },
    wrongSort() { SORT.cards.forEach((c) => { c.bin = 'solid'; c.order = sortOrderSeq++; }); sortLayout(false); },
    buildAuto(kind) {
      const b = BD[kind], r = BD_G.r, g = BD_G.box[KINDS.indexOf(kind)], inn = bdInner(kind);
      b.pts = []; b.alive = false; b.sim = null;
      const put = (x, y) => { const pos = snapPlace(b.pts, x, y, 2 * r, inn, kind); b.pts.push({ x: pos.x, y: pos.y, k: 1 }); };
      if (kind === 'solid') { for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) put(inn.x0 + 40 + i * 2.12 * r, inn.y1 - 60 - j * 2.12 * r); }
      else if (kind === 'liquid') { for (let i = 0; i < BN; i++) put(g.x + g.w * (0.3 + 0.4 * ((i * 0.37) % 1)), g.y + g.h * (0.62 + 0.25 * ((i * 0.61) % 1))); }
      else { const sx = (inn.x1 - inn.x0), sy = (inn.y1 - inn.y0); [[0.1, 0.1], [0.55, 0.05], [0.95, 0.2], [0.3, 0.45], [0.75, 0.5], [0.08, 0.85], [0.5, 0.95], [0.92, 0.9]].forEach(([u, v]) => put(inn.x0 + sx * u, inn.y0 + sy * v)); }
      bdEvaluate(kind);
      return { n: b.pts.length, ok: b.ok, msg: b.msg, v: b.verdict };
    },
    buildInfo() { return KINDS.map((k) => ({ kind: k, n: BD[k].n, alive: BD[k].alive, msg: BD[k].msg, pts: BD[k].pts.map((p) => ({ x: p.x, y: p.y })), v: BD[k].verdict })); },
    setStage(n) { BD.stage = n; refreshUI(); },
  };
})();
