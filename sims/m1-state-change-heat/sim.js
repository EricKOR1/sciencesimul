/* =========================================================
   중1 Ⅳ. 물질의 상태 변화 — 상태 변화와 열에너지 [9과04-04]
   ① [실험] 가열 곡선: 얼음(−20 °C)을 일정하게 가열 → 0 °C·100 °C에서 수평 구간 (🔍 입자 모형, 열 공급 화살표)
   ② [실험] 냉각 곡선: 액체 팔미트산을 식히기 → 응고하는 동안 온도 일정 (열 방출)
   ③ [설명] 열에너지 출입: 6가지 상태 변화를 열 흡수 / 열 방출로 분류
   ④ [적용] 생활 속 열에너지 출입 (이글루, 땀, 아이스박스, 에어컨, 스팀 난방)
   ※ 녹는점·끓는점·어는점의 정확한 개념은 '물질의 특성'에서 배움 → '상태 변화가 일어나는 온도'로만 다룸
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const RM = !!SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const rgba = SciSim.color.rgba, mix = SciSim.color.mix, shade = SciSim.color.shade;
  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = SciSim.ease;
  const now = () => performance.now() / 1000;
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);       // p가 a~b 사이에서 0→1

  /* ---------- 화면 (태블릿 = 가로형 800×560, 휴대폰 = 세로형 440×620) ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 440 : 800, VH = PHONE ? 620 : 560;
  const BG = '#f6f9fe';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();          // 반짝임, 물방울, 연기 등 장식 효과

  let game = null;
  let F = new Set();
  const on = (f) => (game && game.free) || F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));

  const COL = {
    water: '#5fa8f5', wax: '#f0a830', eth: '#22b39a', sub: '#8b5cf6', ink: '#1b2333', muted: '#5d6879',
    good: '#14a058', bad: '#e2464b', warm: '#f26b3a', cold: '#2f7de1', line: '#dde4ef',
    sol: '#5b7fb5', liq: '#2f7de1', gas: '#8b5cf6', hot: '#f26b3a', coolc: '#2f7de1', absorb: '#e2464b', release: '#2f7de1', use1: '#f59e0b', use2: '#8b5cf6',
  };

  /* ---------- 그리기 도우미 ---------- */
  const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
  const inRect = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  function text(x, y, str, o) { D.text(x, y, str, o); }
  function pill(x, y, str, o) { return D.label(x, y, str, o); }
  function bezPt(P, t) {
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return { x: a * P[0] + b * P[2] + c * P[4] + d * P[6], y: a * P[1] + b * P[3] + c * P[5] + d * P[7] };
  }
  function bezTan(P, t) {
    const u = 1 - t;
    const x = 3 * u * u * (P[2] - P[0]) + 6 * u * t * (P[4] - P[2]) + 3 * t * t * (P[6] - P[4]);
    const y = 3 * u * u * (P[3] - P[1]) + 6 * u * t * (P[5] - P[3]) + 3 * t * t * (P[7] - P[5]);
    let l = Math.hypot(x, y);
    if (l < 1e-6) {                                   // 제어점이 끝점과 겹치는 직선: 가까운 두 점으로 방향을 구함
      const a = bezPt(P, Math.max(0, t - 0.02)), b = bezPt(P, Math.min(1, t + 0.02));
      const dx = b.x - a.x, dy = b.y - a.y; l = Math.hypot(dx, dy) || 1;
      return { x: dx / l, y: dy / l };
    }
    return { x: x / l, y: y / l };
  }
  /* 부드러운 색 띠 배경 */
  function vgrad(c, x, y, w, h, top, bottom) {
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    c.fillStyle = g; c.fillRect(x, y, w, h);
  }

  /* 부드러운 그림자: 한 번 그려 두고 재사용 (매 프레임 shadowBlur를 쓰지 않도록) */
  const SHC = new Map();
  let shK = 0;
  function rrPath(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function softShadow(x, y, w, h, r, blur, dy, color) {
    const k = Math.max(1, Math.round(view.scale * view.dpr * 2) / 2);
    if (k !== shK) { SHC.clear(); shK = k; }
    const W = Math.round(w), H = Math.round(h), key = W + '|' + H + '|' + r + '|' + blur + '|' + color;
    let sp = SHC.get(key);
    if (!sp) {
      const pad = Math.ceil(blur * 1.5) + 2, OFF = 3000;
      const cv = document.createElement('canvas');
      cv.width = Math.ceil((W + pad * 2) * k); cv.height = Math.ceil((H + pad * 2) * k);
      const c = cv.getContext('2d');
      c.shadowColor = color; c.shadowBlur = blur * k; c.shadowOffsetX = OFF * k; c.shadowOffsetY = 0;
      c.scale(k, k); c.translate(pad - OFF, pad);
      c.fillStyle = '#000'; rrPath(c, 0, 0, W, H, r); c.fill();
      sp = { cv, pad }; SHC.set(key, sp);
    }
    ctx.drawImage(sp.cv, x - sp.pad, y - sp.pad + dy, sp.cv.width / shK, sp.cv.height / shK);
  }
  /* 그림자가 있는 둥근 상자 */
  function panel(x, y, w, h, r, fill, blur, dy, color) {
    softShadow(x, y, w, h, r, blur, dy, color || 'rgba(30,50,100,.2)');
    ctx.fillStyle = fill; D.roundRect(x, y, w, h, r); ctx.fill();
  }

  /* ---------- 축하 효과 (캔버스 위 체크 + 반짝임) ---------- */
  const checks = [];
  function celebrate(x, y) {
    FX.burst(x, y, { count: 26, speed: 190, life: 0.9, size: 4 });
    checks.push({ x, y, t: 0 });
    Sound.success();
  }
  function drawChecks(dt) {
    for (let i = checks.length - 1; i >= 0; i--) {
      const c = checks[i];
      c.t += dt;
      if (c.t > 1.8) { checks.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = c.t > 1.3 ? 1 - (c.t - 1.3) / 0.5 : 1;
      const s = 0.75 + 0.25 * ease.outBack(Math.min(1, c.t / 0.35));
      ctx.translate(c.x, c.y); ctx.scale(s, s);
      D.check(0, 0, 26, Math.min(1, c.t / 0.5));
      ctx.restore();
    }
  }
  function newBadge(x, y) {
    ctx.save();
    const a = 0.5 + 0.5 * Math.sin(now() * 6);
    D.label(x, y, 'NEW', { bg: rgba(COL.sub, 0.85 + a * 0.15), size: 13, pad: 7 });
    ctx.restore();
  }

  /* =========================================================
     입자 상자 (PBox): 입자 모형 창 속의 입자들
       상태 0 고체: 격자 자리에서 진동 · 1 액체: 붙어서 미끄러지며 이동 · 2 기체: 멀리 떨어져 빠르게 이동
     setWant(고체 수, 액체 수, 기체 수)로 목표를 주면 입자가 하나씩 차례로 상태를 바꿈
       (녹을 때는 바깥쪽·위쪽 입자부터, 얼 때는 이웃이 많은 빈 자리부터 붙음)
     therm(0~1): 온도에 해당 → 진동의 크기와 움직이는 빠르기
     ========================================================= */
  const spriteCache = {};
  function sprite(color, R) {
    const key = color + '|' + R;
    if (spriteCache[key]) return spriteCache[key];
    const k = 4, m = 1.55;
    const size = Math.ceil(R * 2 * m * k);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.scale(k, k);
    const cx = R * m, cy = R * m;
    const sh = g.createRadialGradient(cx + R * 0.12, cy + R * 0.34, R * 0.3, cx + R * 0.12, cy + R * 0.34, R * 1.4);
    sh.addColorStop(0, 'rgba(20,30,60,.30)'); sh.addColorStop(1, 'rgba(20,30,60,0)');
    g.fillStyle = sh; g.beginPath(); g.arc(cx + R * 0.12, cy + R * 0.34, R * 1.4, 0, TAU); g.fill();
    const gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.42, R * 0.06, cx, cy, R);
    gr.addColorStop(0, shade(color, 0.62)); gr.addColorStop(0.5, color); gr.addColorStop(1, shade(color, -0.38));
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.62)';
    g.beginPath(); g.ellipse(cx - R * 0.33, cy - R * 0.42, R * 0.34, R * 0.2, -0.6, 0, TAU); g.fill();
    return (spriteCache[key] = { c, half: R * m });
  }
  /* 광택 있는 입자 하나 그리기 (그림에 쓰는 입자) */
  function drawBall(c, color, x, y, R, alpha) {
    const sp = sprite(color, Math.max(2, Math.round(R)));
    const s = sp.half * 2 * (R / Math.max(2, Math.round(R)));
    if (alpha != null) c.globalAlpha = alpha;
    c.drawImage(sp.c, x - s / 2, y - s / 2, s, s);
    if (alpha != null) c.globalAlpha = 1;
  }

  class PBox {
    /* o: {N, R, color, box:{x0,y0,x1,y1}, lattice:'hex'|'honey', cols, state, therm, g, kc, vl, vg, gap, liqSp, flashUp, flashDown} */
    constructor(o) {
      this.o = o;
      this.R = o.R || 7;
      this.color = o.color || '#5fa8f5';
      this.box = o.box;
      this.therm = o.therm != null ? o.therm : 0.4;
      this.g = o.g != null ? o.g : 1000;
      this.kc = o.kc != null ? o.kc : 800;
      this.vl = o.vl || 40; this.vg = o.vg || 120;
      this.gap = o.gap || 0.07;
      this.liqSp = o.liqSp || 1;
      this.flashUp = o.flashUp || '#8b5cf6'; this.flashDown = o.flashDown || '#8b5cf6';
      this.t = 0; this.convT = 0; this.want = null;
      this.p = [];
      this.makeSites(o.N);
      for (let i = 0; i < o.N; i++) {
        this.p.push({ x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, st: 0, site: -1, f: 0.8 + Math.random() * 0.4, rr: 0.96 + Math.random() * 0.1,
          ph1: Math.random() * TAU, ph2: Math.random() * TAU, w1: 17 + Math.random() * 9, w2: 17 + Math.random() * 9, flash: 0, fc: '#fff', a: 1 });
      }
      this.reset(o.state || 0);
    }
    makeSites(N) {
      const B = this.box, R = this.R;
      const cx = (B.x0 + B.x1) / 2, floor = B.y1;
      const inside = (x, y) => x >= B.x0 + R - 0.1 && x <= B.x1 - R + 0.1 && y <= B.y1 - R + 0.1 && y >= B.y0 + R - 0.1;
      const sites = [];
      let nd;
      if (this.o.lattice === 'honey') {                  // 육각 고리 격자 (얼음처럼 성긴 배열)
        const a = R * 2, w = a * Math.sqrt(3);
        nd = a * 1.2;
        const cols = this.o.cols || 3;
        const seen = new Set();
        outer:
        for (let j = 0; j < 20; j++) {
          const odd = j % 2 === 1;
          const n = odd ? cols - 1 : cols;
          const order = [];
          for (let i = 0; i < n; i++) order.push(i);
          order.sort((p, q) => Math.abs(p - (n - 1) / 2) - Math.abs(q - (n - 1) / 2));
          for (const i of order) {
            const hx = cx + (i - (n - 1) / 2) * w, hy = floor - R - a - j * 1.5 * a;
            const vs = [];
            for (let k = 0; k < 6; k++) {
              const ang = Math.PI / 2 + k * Math.PI / 3;
              vs.push({ x: hx + Math.cos(ang) * a, y: hy + Math.sin(ang) * a });
            }
            vs.sort((p, q) => q.y - p.y);
            for (const v of vs) {
              const key = Math.round(v.x * 4) + ',' + Math.round(v.y * 4);
              if (seen.has(key) || !inside(v.x, v.y)) continue;
              seen.add(key); sites.push(v);
              if (sites.length >= N) break outer;
            }
          }
        }
      } else {                                           // 촘촘한 육각 배열
        const d = R * 2 * (this.o.spacing || 1.02), rh = d * Math.sqrt(3) / 2;
        nd = d * 1.2;
        const cols = this.o.cols || Math.max(2, Math.round(Math.sqrt(N * 1.2)));
        for (let r = 0; sites.length < N && r < 40; r++) {
          const y = floor - R - r * rh;
          const cnt = r % 2 ? cols - 1 : cols;
          for (let c = 0; c < cnt && sites.length < N; c++) {
            const x = cx + (c - (cnt - 1) / 2) * d;
            if (inside(x, y)) sites.push({ x, y });
          }
        }
      }
      sites.forEach((s, i) => { s.nb = []; s.occ = -1; sites.forEach((q, j) => { if (i !== j && Math.hypot(s.x - q.x, s.y - q.y) < nd) s.nb.push(j); }); });
      this.sites = sites;
    }
    count(st) { let n = 0; for (const q of this.p) if (q.st === st) n++; return n; }
    counts() { return [this.count(0), this.count(1), this.count(2)]; }
    tOf(st) { const v = st === 0 ? this.thermS : st === 1 ? this.thermL : this.thermG; return v != null ? v : this.therm; }
    speed(st) { const T = this.tOf(st); return st === 1 ? this.vl * (1 + 1.6 * T) : st >= 2 ? this.vg * (1 + T) : 0; }
    amp() { return 0.6 + 2.4 * this.tOf(0); }
    /* 모든 입자를 st 상태로 즉시 놓기 */
    reset(st) {
      const B = this.box, R = this.R;
      this.sites.forEach((s) => (s.occ = -1));
      this.want = null;
      this.p.forEach((q, i) => {
        q.st = st; q.site = -1; q.a = 1; q.flash = 0;
        const s = this.sites[i % this.sites.length];
        if (st === 0 && i < this.sites.length) { q.site = i; s.occ = i; q.x = s.x; q.y = s.y; q.vx = q.vy = 0; return; }
        if (st === 2) {
          q.x = B.x0 + R + Math.random() * (B.x1 - B.x0 - 2 * R); q.y = B.y0 + R + Math.random() * (B.y1 - B.y0 - 2 * R);
        } else { q.x = s.x + (Math.random() - 0.5) * 3; q.y = s.y - 3; q.st = 1; }
        const a = Math.random() * TAU, v = this.speed(q.st) * q.f;
        q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v;
      });
      if (st === 1) for (let i = 0; i < 140; i++) this.step(1 / 60, true);
    }
    /* 목표 개수(고체, 액체, 기체)에 맞춰 한 입자씩 상태를 바꿈 */
    setWant(s, l, g) { this.want = { s, l, g }; }
    done() {
      const W = this.want; if (!W) return true;
      const c = this.counts(), ng = c[2] + this.count(3);
      return c[0] === W.s && c[1] === W.l && ng === W.g;
    }
    convertOne() {
      const W = this.want; if (!W) return false;
      const ns = this.count(0), nl = this.count(1), ng = this.count(2) + this.count(3);
      if (ns > W.s && nl < W.l) return this.melt();
      if (nl > W.l && ns < W.s) return this.capture(1);
      if (nl > W.l && ng < W.g) return this.vaporize();
      if (ng > W.g && nl < W.l) return this.condense();
      if (ns > W.s && ng < W.g) return this.sublime();
      if (ng > W.g && ns < W.s) return this.capture(2);
      return false;
    }
    occN(si) { let n = 0; for (const j of this.sites[si].nb) if (this.sites[j].occ >= 0) n++; return n; }
    exposedSolid() {
      let best = -1, bs = 1e9;
      this.p.forEach((q, i) => {
        if (q.st !== 0) return;
        const sc = this.occN(q.site) * 100 + this.sites[q.site].y * 0.6 + Math.random() * 30;
        if (sc < bs) { bs = sc; best = i; }
      });
      return best;
    }
    freeSite() {
      let best = -1, bs = -1e9;
      const fl = this.box.y1;
      this.sites.forEach((s, i) => {
        if (s.occ >= 0) return;
        const sc = (this.occN(i) + (s.y > fl - this.R * 2.4 ? 2 : 0)) * 100 + s.y * 0.6;
        if (sc > bs) { bs = sc; best = i; }
      });
      return best;
    }
    release(i, st, up) {
      const q = this.p[i];
      if (q.site >= 0) { this.sites[q.site].occ = -1; q.site = -1; }
      q.st = st;
      const v = this.speed(st) * q.f * 0.55, a = up ? -Math.PI / 2 + (Math.random() - 0.5) * 1.4 : Math.random() * TAU;
      q.vx = q.vx * 0.5 + Math.cos(a) * v; q.vy = q.vy * 0.5 + Math.sin(a) * v;     // 이전 움직임을 이어받아 점점 빨라짐
      q.flash = 1; q.fc = this.flashUp;
      if (this.onConvert) this.onConvert(q, true);
      return true;
    }
    capture(from) {
      const si = this.freeSite(); if (si < 0) return false;
      const s = this.sites[si];
      let best = -1, bd = 1e18;
      this.p.forEach((q, i) => { if (q.st !== from) return; const d = (q.x - s.x) ** 2 + (q.y - s.y) ** 2; if (d < bd) { bd = d; best = i; } });
      if (best < 0) return false;
      const q = this.p[best];
      q.st = 0; q.site = si; s.occ = best; q.flash = 1; q.fc = this.flashDown;
      if (this.onConvert) this.onConvert(q, false);
      return true;
    }
    melt() { const i = this.exposedSolid(); return i >= 0 && this.release(i, 1, false); }
    sublime() { const i = this.exposedSolid(); return i >= 0 && this.release(i, 2, true); }
    vaporize() {
      let best = -1, by = 1e9;
      this.p.forEach((q, i) => { if (q.st === 1 && q.y < by) { by = q.y; best = i; } });
      return best >= 0 && this.release(best, 2, true);
    }
    condense() {
      let best = -1, by = -1e9;
      this.p.forEach((q, i) => { if (q.st === 2 && q.y > by) { by = q.y; best = i; } });
      if (best < 0) return false;
      const q = this.p[best]; q.st = 1; q.vx *= 0.4; q.vy *= 0.4; q.flash = 1; q.fc = this.flashDown;
      if (this.onConvert) this.onConvert(q, false);
      return true;
    }
    step(dt, quiet) {
      if (!(dt > 0)) return;
      this.t += dt;
      if (!quiet && this.want) {
        this.convT -= dt;
        if (this.convT <= 0 && this.convertOne()) this.convT = this.gap;
      }
      const P = this.p, n = P.length, R = this.R, B = this.box;
      const sub = Math.max(1, Math.ceil(dt / 0.006)), h = dt / sub;
      const kRep = 7000, g = this.g, kc = this.kc, lsp = this.liqSp;
      const vL = this.speed(1), vG = this.speed(2), A = this.amp();
      const ks = 1 - Math.exp(-10 * h);
      for (let s = 0; s < sub; s++) {
        for (let i = 0; i < n; i++) { const q = P[i]; q.ax = 0; q.ay = q.st === 1 ? g : 0; }
        for (let i = 0; i < n; i++) {
          const a = P[i];
          for (let j = i + 1; j < n; j++) {
            const b = P[j]; if (a.st === 0 && b.st === 0) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const Dm = R * (a.rr + b.rr) * (a.st === 1 && b.st === 1 ? lsp : 1), RC = Dm * 1.6;
            const d2 = dx * dx + dy * dy;
            if (d2 >= RC * RC || d2 < 1e-6) continue;
            const d = Math.sqrt(d2);
            let f;
            if (d < Dm) f = kRep * (Dm - d) / d;
            else if (a.st <= 1 && b.st <= 1) f = -kc * Math.sin(Math.PI * (d - Dm) / (RC - Dm)) / d;
            else continue;
            const fx = dx * f, fy = dy * f;
            if (a.st !== 0) { a.ax -= fx; a.ay -= fy; }
            if (b.st !== 0) { b.ax += fx; b.ay += fy; }
          }
        }
        for (let i = 0; i < n; i++) {
          const q = P[i];
          if (q.st === 0) {
            const S = this.sites[q.site];
            const tx = S.x + A * Math.sin(this.t * q.w1 + q.ph1), ty = S.y + A * Math.sin(this.t * q.w2 + q.ph2);
            const nx = q.x + (tx - q.x) * ks, ny = q.y + (ty - q.y) * ks;
            q.vx = (nx - q.x) / h; q.vy = (ny - q.y) / h; q.x = nx; q.y = ny;
            continue;
          }
          const sp = Math.hypot(q.vx, q.vy) || 1e-3;
          const tgt = (q.st === 1 ? vL : vG) * q.f;
          const k = 1 + (tgt / sp - 1) * Math.min(1, h * (q.st === 1 ? 4 : 2.5));
          q.vx *= k; q.vy *= k;
          if (q.st === 1) {
            const ang = (Math.random() - 0.5) * 7 * Math.sqrt(h), c = Math.cos(ang), sn = Math.sin(ang);
            const vx = q.vx * c - q.vy * sn; q.vy = q.vx * sn + q.vy * c; q.vx = vx;
          }
          q.vx += q.ax * h; q.vy += q.ay * h;
          q.x += q.vx * h; q.y += q.vy * h;
          const r = R * q.rr;
          if (q.x < B.x0 + r) { q.x = B.x0 + r; q.vx = Math.abs(q.vx); }
          if (q.x > B.x1 - r) { q.x = B.x1 - r; q.vx = -Math.abs(q.vx); }
          if (q.y > B.y1 - r) { q.y = B.y1 - r; q.vy = -Math.abs(q.vy); }
          if (q.y < B.y0 + r) { q.y = B.y0 + r; q.vy = Math.abs(q.vy); }
        }
      }
      for (const q of P) if (q.flash > 0) q.flash = Math.max(0, q.flash - dt * 1.4);
    }
    /* 빠른 입자에는 꼬리(속도 표시)를 그려 줌 */
    draw(c, alpha) {
      const R = this.R, sp = sprite(this.color, R), al = alpha == null ? 1 : alpha;
      c.lineCap = 'round';
      for (const q of this.p) {
        if (q.st >= 2) {
          c.strokeStyle = rgba(this.color, 0.2 * al); c.lineWidth = R * 0.9;
          c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - q.vx * 0.06, q.y - q.vy * 0.06); c.stroke();
        }
      }
      for (const q of this.p) {
        if (q.flash > 0) {
          c.globalAlpha = q.flash * 0.85 * al;
          c.strokeStyle = q.fc; c.lineWidth = 2.5;
          c.beginPath(); c.arc(q.x, q.y, R + 2 + (1 - q.flash) * 9, 0, TAU); c.stroke();
        }
        c.globalAlpha = al;
        c.drawImage(sp.c, q.x - sp.half, q.y - sp.half, sp.half * 2, sp.half * 2);
      }
      c.globalAlpha = 1;
    }
  }

  /* =========================================================
     곡선 모형 · 장치 · 그래프 · 입자 모형 · 열에너지 사용 막대
     ========================================================= */
  function makeLayout() {
    const L = {};
    if (!PHONE) {
      L.app = { x: 16, y: 16, w: 246, h: 528 };
      L.graph = { x: 276, y: 16, w: 508, h: 316 };
      L.lens = { x: 276, y: 342, w: 256, h: 202 };
      L.energy = { x: 542, y: 342, w: 242, h: 202 };
    } else {
      L.app = { x: 6, y: 8, w: 152, h: 330 };
      L.graph = { x: 164, y: 8, w: 270, h: 330 };
      L.lens = { x: 8, y: 346, w: 212, h: 196 };
      L.energy = { x: 226, y: 346, w: 206, h: 196 };
    }
    return L;
  }
  const LAY = makeLayout();

  const CURVES = {
    heat: {
      title: '물의 가열 곡선', xmax: 40, ymin: -30, ymax: 130, xstep: 10, ystep: 20, yfirst: -20, color: '#e2464b', xlab: '가열 시간 (분)', unit: 'min',
      segs: [
        { id: 'ice', t0: 0, t1: 2.4, T0: -20, T1: 0, lab: '고체', sh: '고', kinds: [1, 0, 0] },
        { id: 'melt', t0: 2.4, t1: 9.4, T0: 0, T1: 0, lab: '고체+액체', sh: '고+액', flat: true, name: '융해' },
        { id: 'water', t0: 9.4, t1: 21.4, T0: 0, T1: 100, lab: '액체', sh: '액' },
        { id: 'boil', t0: 21.4, t1: 34.4, T0: 100, T1: 100, lab: '액체+기체', sh: '액+기', flat: true, name: '기화' },
        { id: 'steam', t0: 34.4, t1: 36.8, T0: 100, T1: 120, lab: '기체', sh: '기' },
      ],
    },
    cool: {
      title: '팔미트산의 냉각 곡선', xmax: 20, ymin: 20, ymax: 90, xstep: 5, ystep: 10, yfirst: 20, color: '#2f7de1', xlab: '냉각 시간 (분)', unit: 'min',
      segs: [
        { id: 'liq', t0: 0, t1: 3.4, T0: 80, T1: 63, lab: '액체', sh: '액' },
        { id: 'frz', t0: 3.4, t1: 11.4, T0: 63, T1: 63, lab: '액체+고체', sh: '액+고', flat: true, name: '응고' },
        { id: 'sol', t0: 11.4, t1: 18, T0: 63, T1: 30, lab: '고체', sh: '고' },
      ],
    },
  };
  function curveAt(cv, t) {
    const sg = cv.segs;
    let i = 0;
    while (i < sg.length - 1 && t >= sg[i].t1) i++;
    const s = sg[i], f = clamp((t - s.t0) / (s.t1 - s.t0), 0, 1);
    return { i, id: s.id, seg: s, f, T: lerp(s.T0, s.T1, f) };
  }

  /* 실험 진행 상태 (heat: 가열, cool: 냉각) */
  const RUN = {};
  function makeRun(key) {
    const cv = CURVES[key];
    const r = LAY.lens;
    const heat = key === 'heat';
    const box = new PBox({
      N: 36, R: PHONE ? 7 : 7.6, color: heat ? COL.water : COL.wax, box: { x0: r.x + 8, y0: r.y + 8, x1: r.x + r.w - 8, y1: r.y + r.h - 12 },
      lattice: 'hex', cols: PHONE ? 7 : 7, state: heat ? 0 : 1, therm: 0.4, vl: 42, vg: 120, gap: 0.04, flashUp: '#ff8a3d', flashDown: '#4a90ff',
    });
    return { key, cv, t: 0, on: false, fast: false, done: false, st: curveAt(cv, 0), box, useB: 0, shownMax: 0, tagK: 0 };
  }
  const endOf = (R) => R.cv.segs[R.cv.segs.length - 1].t1;
  const passed = (R, id) => { const s = R.cv.segs.find((q) => q.id === id); return R.t >= s.t1 - 1e-6; };
  function resetRun(R) {
    R.t = 0; R.on = false; R.done = false; R.st = curveAt(R.cv, 0); R.useB = 0;
    R.box.reset(R.key === 'heat' ? 0 : 1); R.box.want = null; syncBox(R, 0);
  }
  /* 입자 상자를 곡선의 현재 상태에 맞춤 */
  function syncBox(R, dt) {
    const b = R.box, N = b.p.length, st = R.st, id = st.id, f = st.f, T = st.T;
    if (R.key === 'heat') {
      if (id === 'ice') { b.setWant(N, 0, 0); b.thermS = (T + 20) / 20; }
      else if (id === 'melt') { const nL = Math.round(N * smooth(f)); b.setWant(N - nL, nL, 0); b.thermS = 1; b.thermL = 0; }
      else if (id === 'water') { b.setWant(0, N, 0); b.thermL = T / 100; }
      else if (id === 'boil') { const nG = Math.round(N * smooth(f)); b.setWant(0, N - nG, nG); b.thermL = 1; b.thermG = 0; }
      else { b.setWant(0, 0, N); b.thermG = (T - 100) / 20; }
    } else {
      if (id === 'liq') { b.setWant(0, N, 0); b.thermL = clamp((T - 55) / 25, 0.05, 1); }
      else if (id === 'frz') { const nS = Math.round(N * smooth(f)); b.setWant(nS, N - nS, 0); b.thermS = 1; b.thermL = 0.3; }
      else { b.setWant(N, 0, 0); b.thermS = clamp((T - 22) / 41, 0.05, 1); }
    }
  }
  function updateRun(R, dt) {
    if (R.on) {
      R.t = Math.min(endOf(R), R.t + dt * (R.fast ? 3.3 : 1.1));
      if (R.t >= endOf(R) - 1e-6) { R.on = false; R.done = true; refreshUI(); }
    }
    R.st = curveAt(R.cv, R.t);
    syncBox(R, dt);
    R.box.step(dt);
    R.useB = SciSim.approach(R.useB, R.st.seg.flat ? 1 : 0, dt, 5);
    R.tagK = SciSim.approach(R.tagK, R.st.seg.flat ? 1 : 0, dt, 6);
  }
  /* 실험을 끝까지 진행한 상태로 만들기 (그래프를 읽는 퀴즈로 바로 이어질 때) */
  function finishRun(R) {
    R.t = endOf(R); R.on = false; R.done = true;
    for (let i = 0; i < 120; i++) updateRun(R, 1 / 30);
  }
  function phaseWord(R) {
    const id = R.st.id;
    if (R.key === 'heat') return { ice: '고체 (얼음)', melt: '융해 중 (고체+액체)', water: '액체 (물)', boil: '기화 중 (액체+기체)', steam: '기체 (수증기)' }[id];
    return { liq: '액체', frz: '응고 중 (액체+고체)', sol: '고체' }[id];
  }

  /* ---------- 유리창(🔍 입자 모형) 틀 ---------- */
  function lensFrame(r, o, inner) {
    ctx.save();
    panel(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 20, '#fff', 18, 6, 'rgba(40,30,90,.25)');
    ctx.beginPath(); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.clip();
    vgrad(ctx, r.x, r.y, r.w, r.h, o.top || '#f9fcff', o.bot || '#e4effd');
    ctx.fillStyle = 'rgba(110,130,170,.16)'; ctx.fillRect(r.x, r.y + r.h - 12, r.w, 12);
    inner();
    const gl = ctx.createLinearGradient(r.x, r.y, r.x + r.w * 0.5, r.y + r.h * 0.6);
    gl.addColorStop(0, 'rgba(255,255,255,.34)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
    const rg = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    rg.addColorStop(0, '#c4b5fd'); rg.addColorStop(0.5, '#7c3aed'); rg.addColorStop(1, '#4c1d95');
    ctx.strokeStyle = rg; ctx.lineWidth = 5; D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.stroke();
    pill(r.x + 12, r.y + 16, o.title || '🔍 입자 모형', { bg: '#5b21b6', size: 14, align: 'left', pad: 10 });
  }
  function ringRect(r, t, rad) {
    const a = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.35 + 0.5 * a); ctx.lineWidth = 4; D.roundRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, (rad || 16) + 4); ctx.stroke(); ctx.restore();
    newBadge(r.x + r.w - 20, r.y - 4);
  }

  /* ---------- 그래프 ---------- */
  /* 변하지 않는 부분(눈금·글자)은 한 번만 그려 두고 재사용 */
  const GBASE = {};
  function graphGeom(R) {
    const cv = R.cv, g = LAY.graph;
    const P = { x0: g.x + (PHONE ? 40 : 54), y0: g.y + 88, x1: g.x + g.w - 14, y1: g.y + g.h - (PHONE ? 34 : 38) };
    return { g, P, X: (tt) => P.x0 + (P.x1 - P.x0) * tt / cv.xmax, Y: (T) => P.y1 - (P.y1 - P.y0) * (T - cv.ymin) / (cv.ymax - cv.ymin) };
  }
  function graphBase(R) {
    const k = Math.max(1, Math.round(view.scale * view.dpr * 2) / 2);
    let b = GBASE[R.key];
    if (b && b.k === k) return b;
    const { g, P, X, Y } = graphGeom(R), cv = R.cv;
    const cvs = document.createElement('canvas');
    cvs.width = Math.ceil(g.w * k); cvs.height = Math.ceil(g.h * k);
    const c = cvs.getContext('2d'), d = SciSim.draw(c);
    c.scale(k, k); c.translate(-g.x, -g.y);
    d.text(g.x + 14, g.y + 26, '📈 ' + (PHONE ? '시간–온도' : '시간–온도 그래프'), { size: PHONE ? 14 : 15, weight: 800, color: COL.ink, align: 'left' });
    c.strokeStyle = 'rgba(120,135,160,.22)'; c.lineWidth = 1;
    for (let T = cv.yfirst; T <= cv.ymax + 0.1; T += cv.ystep) {
      const y = Y(T);
      c.beginPath(); c.moveTo(P.x0, y); c.lineTo(P.x1, y); c.stroke();
      d.text(P.x0 - 8, y + 4.5, String(T), { size: 13, weight: 700, color: COL.muted, align: 'right' });
    }
    for (let m = 0; m <= cv.xmax + 0.1; m += cv.xstep) {
      const x = X(m);
      c.beginPath(); c.moveTo(x, P.y0); c.lineTo(x, P.y1); c.stroke();
      d.text(x, P.y1 + 17, String(m), { size: 13, weight: 700, color: COL.muted });
    }
    c.strokeStyle = '#5d6879'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(P.x0, P.y0 - 4); c.lineTo(P.x0, P.y1); c.lineTo(P.x1 + 4, P.y1); c.stroke();
    d.text(P.x0 - 8, P.y0 - 8, '°C', { size: 13, weight: 800, color: COL.muted, align: 'right' });
    d.text(P.x1, P.y1 + 32, cv.xlab, { size: 13, weight: 800, color: COL.muted, align: 'right' });
    b = { cv: cvs, k };
    GBASE[R.key] = b;
    return b;
  }
  function drawGraph(R, t) {
    const cv = R.cv, st = R.st, heat = R.key === 'heat';
    const { g, P, X, Y } = graphGeom(R);
    panel(g.x, g.y, g.w, g.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    ctx.drawImage(graphBase(R).cv, g.x, g.y, g.w, g.h);
    // 상태 띠
    cv.segs.forEach((s, i) => {
      if (R.t <= s.t0 + 0.001) return;
      const xa = X(s.t0), xb = X(Math.min(s.t1, R.t));
      ctx.fillStyle = s.flat ? rgba(COL.use2, 0.16) : rgba(COL.use1, 0.07);
      ctx.fillRect(xa, P.y0, xb - xa, P.y1 - P.y0);
      if (s.flat) { ctx.fillStyle = rgba(COL.use2, 0.5); ctx.fillRect(xa, P.y0, xb - xa, 3); }
      const wFull = X(s.t1) - xa, short = wFull < 64;
      const lab = short ? s.sh : s.lab, row = i % 2;
      const ready = R.t > s.t0 + Math.min(0.6, (s.t1 - s.t0) * 0.3);
      if (ready) pill((xa + X(s.t1)) / 2, P.y0 - 14 - row * 24, lab, { bg: s.flat ? COL.use2 : '#64748b', size: 13, pad: 7 });
    });
    // 수평 구간의 온도 기준선
    cv.segs.filter((s) => s.flat).forEach((s) => {
      const y = Y(s.T0);
      ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = rgba(COL.use2, 0.55); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(P.x0, y); ctx.lineTo(X(s.t1), y); ctx.stroke(); ctx.restore();
    });
    // 곡선
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    cv.segs.forEach((s) => {
      if (R.t <= s.t0) return;
      const t1 = Math.min(s.t1, R.t);
      ctx.beginPath();
      const n = Math.max(2, Math.ceil((t1 - s.t0) / 0.2));
      for (let k = 0; k <= n; k++) {
        const tt = s.t0 + (t1 - s.t0) * k / n, T = lerp(s.T0, s.T1, (tt - s.t0) / (s.t1 - s.t0));
        if (k) ctx.lineTo(X(tt), Y(T)); else ctx.moveTo(X(tt), Y(T));
      }
      if (s.flat) { ctx.strokeStyle = rgba(COL.use2, 0.35); ctx.lineWidth = 11; ctx.stroke(); ctx.strokeStyle = shade(cv.color, -0.1); ctx.lineWidth = 5.5; ctx.stroke(); }
      else { ctx.strokeStyle = cv.color; ctx.lineWidth = 4; ctx.stroke(); }
    });
    ctx.restore();
    // 머리 점 + 현재 온도
    if (R.t > 0.001 || R.on) {
      const hx = X(R.t), hy = Y(st.T);
      D.glow(hx, hy, 18, cv.color, 0.55);
      D.sphere(hx, hy, 6.5, cv.color, { gloss: true });
      pill(Math.min(hx + 8, P.x1 - 40), hy - 16, Math.round(st.T) + ' °C', { bg: cv.color, size: 13, align: 'left', pad: 8 });
    }
    // 수평 구간 설명 말풍선 (선 아래)
    cv.segs.forEach((s) => {
      if (!s.flat || R.t <= s.t0 + 0.3) return;
      const k = smooth((R.t - s.t0 - 0.3) / 0.8);
      const mx = (X(s.t0) + X(s.t1)) / 2, my = Y(s.T0) + 25;
      ctx.save(); ctx.globalAlpha = Math.min(1, k);
      pill(mx, my, s.name + ' 중 ' + s.T0 + ' °C', { bg: 'rgba(76,29,149,.92)', size: 13, pad: 9 });
      ctx.restore();
    });
  }

  /* ---------- 열에너지가 쓰이는 곳 ---------- */
  function drawEnergy(R, t) {
    const r = LAY.energy, heat = R.key === 'heat', B = R.useB;
    panel(r.x, r.y, r.w, r.h, 16, '#fff', 10, 3, 'rgba(30,50,100,.16)');
    text(r.x + 14, r.y + 26, heat ? '가한 열에너지는 어디에?' : '내보내는 열에너지는?', { size: PHONE ? 14 : 15, weight: 800, color: COL.sub, align: 'left' });
    const bx = r.x + 14, bw = r.w - 28, by = r.y + 42, bh = 26;
    ctx.save();
    ctx.fillStyle = '#eef2f8'; D.roundRect(bx, by, bw, bh, 13); ctx.fill();
    ctx.beginPath(); D.roundRect(bx, by, bw, bh, 13); ctx.clip();
    const wA = bw * (1 - B), wB = bw * B;
    const gA = ctx.createLinearGradient(0, by, 0, by + bh); gA.addColorStop(0, '#fbbf24'); gA.addColorStop(1, '#f59e0b');
    ctx.fillStyle = gA; ctx.fillRect(bx, by, wA, bh);
    const gB = ctx.createLinearGradient(0, by, 0, by + bh); gB.addColorStop(0, '#a78bfa'); gB.addColorStop(1, '#7c3aed');
    ctx.fillStyle = gB; ctx.fillRect(bx + wA, by, wB, bh);
    ctx.restore();
    if (wA > 40) text(bx + wA / 2, by + 18, '운동', { size: 13, weight: 800, color: '#fff' });
    if (wB > 40) text(bx + wA + wB / 2, by + 18, '배열', { size: 13, weight: 800, color: '#fff' });
    const lx = r.x + 14;
    ctx.fillStyle = COL.use1; circle(ctx, lx + 6, r.y + 90, 6); ctx.fill();
    text(lx + 18, r.y + 95, heat ? '입자 운동이 빨라짐 → 온도 ↑' : '입자 운동이 느려짐 → 온도 ↓', { size: 13, weight: 700, color: COL.ink, align: 'left' });
    ctx.fillStyle = COL.use2; circle(ctx, lx + 6, r.y + 114, 6); ctx.fill();
    text(lx + 18, r.y + 119, '입자 배열이 바뀜 → 상태 변화', { size: 13, weight: 700, color: COL.ink, align: 'left' });
    // 설명 상자
    const flat = R.st.seg.flat, running = R.on || R.t > 0;
    const bxx = r.x + 10, byy = r.y + 132, bww = r.w - 20, bhh = r.h - 142;
    ctx.fillStyle = flat ? 'rgba(124,58,237,.1)' : 'rgba(245,158,11,.1)'; D.roundRect(bxx, byy, bww, bhh, 12); ctx.fill();
    ctx.strokeStyle = flat ? 'rgba(124,58,237,.45)' : 'rgba(245,158,11,.5)'; ctx.lineWidth = 1.6; D.roundRect(bxx, byy, bww, bhh, 12); ctx.stroke();
    let l1, l2, l3;
    if (!running) { l1 = heat ? '불을 켜서 얼음을' : '식히기를 시작하면'; l2 = heat ? '가열해 보세요.' : '입자의 변화를 볼 수 있어요.'; l3 = ''; }
    else if (flat) {
      l1 = heat ? '열을 계속 받는데도' : '열을 계속 내보내는데도';
      l2 = '온도는 그대로예요!';
      l3 = heat ? '열이 상태를 바꾸는 데 쓰여요.' : '입자가 배열되며 열을 내놓아요.';
    } else {
      l1 = heat ? '열을 받아 입자가' : '열을 내보내 입자가';
      l2 = heat ? '더 빠르게 움직이고,' : '더 느리게 움직이고,';
      l3 = heat ? '온도가 올라가요.' : '온도가 내려가요.';
    }
    const lh = PHONE ? 19 : 22, y0 = byy + (bhh - lh * (l3 ? 3 : 2)) / 2 + lh * 0.75;
    text(bxx + bww / 2, y0, l1, { size: 13.5, weight: 700, color: COL.ink });
    text(bxx + bww / 2, y0 + lh, l2, { size: 14, weight: 800, color: flat ? '#5b21b6' : '#b45309' });
    if (l3) text(bxx + bww / 2, y0 + lh * 2, l3, { size: 13.5, weight: 700, color: COL.ink });
  }

  /* ---------- 입자 모형 창 ---------- */
  function drawRunLens(R, t) {
    const r = LAY.lens, b = R.box;
    lensFrame(r, {}, () => { b.draw(ctx, 1); });
    const c = b.counts();
    const lab = phaseWord(R).replace(/ \(.*\)/, '');
    pill(r.x + r.w - 12, r.y + 16, lab, { bg: R.st.seg.flat ? COL.use2 : '#7c6bd6', size: 13.5, align: 'right', pad: 10 });
  }

  /* =========================================================
     실험 장치: 가열 장치 (알코올램프 + 삼발이 + 비커) · 냉각 장치 (찬물 수조 + 시험관)
     (가상 좌표 246 × 528 안에서 그린 뒤 화면 크기에 맞춰 줄임)
     ========================================================= */
  const AFX = new SciSim.Particles();           // 거품·김 (화면 좌표)
  function appPt(x, y) { const r = LAY.app, sc = r.w / 246; return { x: r.x + x * sc, y: r.y + y * sc, sc }; }

  function iceBlocks(cx, base, k, alpha, wob) {
    if (k <= 0.02) return;
    const cubes = [[-26, 0, 44], [24, 2, 40], [-2, -38, 40]];
    ctx.save(); ctx.globalAlpha = alpha;
    cubes.forEach((q, i) => {
      const s = q[2] * k, x = cx + q[0] * k, y = base - s / 2 + q[1] * k + Math.sin(wob * 1.6 + i * 2) * 1.2 * (1 - k * 0.5);
      const dd = s * 0.22;
      ctx.fillStyle = 'rgba(236,248,255,.97)'; ctx.beginPath(); ctx.moveTo(x - s / 2, y - s / 2); ctx.lineTo(x - s / 2 + dd, y - s / 2 - dd * 0.8); ctx.lineTo(x + s / 2 + dd, y - s / 2 - dd * 0.8); ctx.lineTo(x + s / 2, y - s / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(150,205,246,.95)'; ctx.beginPath(); ctx.moveTo(x + s / 2, y - s / 2); ctx.lineTo(x + s / 2 + dd, y - s / 2 - dd * 0.8); ctx.lineTo(x + s / 2 + dd, y + s / 2 - dd * 0.8); ctx.lineTo(x + s / 2, y + s / 2); ctx.closePath(); ctx.fill();
      const g = ctx.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2); g.addColorStop(0, 'rgba(216,243,255,.98)'); g.addColorStop(1, 'rgba(150,206,248,.96)');
      ctx.fillStyle = g; D.roundRect(x - s / 2, y - s / 2, s, s, Math.max(3, 6 * k)); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; D.roundRect(x - s / 2, y - s / 2, s, s, Math.max(3, 6 * k)); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.fillRect(x - s / 2 + s * 0.12, y - s / 2 + s * 0.12, s * 0.16, s * 0.4);
    });
    ctx.restore();
  }
  function wavyArrow(x, y0, y1, t, color, dirUp) {
    // y0 → y1 방향으로 물결치는 화살표
    ctx.save();
    const n = 18, dy = (y1 - y0);
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    let lx = x, ly = y0;
    for (let i = 0; i <= n; i++) { const u = i / n, px = x + Math.sin(u * 7 - t * 5) * 5, py = y0 + dy * u; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); lx = px; ly = py; }
    ctx.stroke();
    const s = Math.sign(dy) || 1;
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(lx, ly + s * 11); ctx.lineTo(lx - 9, ly - s * 3); ctx.lineTo(lx + 9, ly - s * 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function arrowSide(x0, x1, y, t, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const dx = x1 - x0, s = Math.sign(dx) || 1;
    ctx.beginPath();
    let lx = x0, ly = y;
    for (let i = 0; i <= 16; i++) { const u = i / 16, px = x0 + dx * u, py = y + Math.sin(u * 7 - t * 5 * s) * 4; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); lx = px; ly = py; }
    ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(lx + s * 11, ly); ctx.lineTo(lx - s * 3, ly - 9); ctx.lineTo(lx - s * 3, ly + 9); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /* 돋보기 표시: 이 부분을 🔍 입자 모형으로 보고 있어요 */
  function magRing(x, y, r, t) {
    ctx.save();
    ctx.globalAlpha = 0.8 + 0.15 * Math.sin(t * 3);
    ctx.strokeStyle = 'rgba(124,58,237,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + r * 0.72, y + r * 0.72); ctx.lineTo(x + r * 1.25, y + r * 1.25); ctx.stroke();
    ctx.restore();
  }
  function tempCard(cx, y, T, col) {
    ctx.save();
    panel(cx - 54, y, 108, 44, 14, '#fff', 8, 2, 'rgba(30,50,100,.2)');
    ctx.strokeStyle = rgba(col, 0.7); ctx.lineWidth = 2.5; D.roundRect(cx - 54, y, 108, 44, 14); ctx.stroke();
    text(cx, y + 31, Math.round(T) + ' °C', { size: 26, weight: 800, color: col });
    ctx.restore();
  }

  /* ---- 가열 장치 ---- */
  function drawHeatApp(R, t) {
    const r = LAY.app, sc = r.w / 246, st = R.st, T = st.T, id = st.id, f = st.f;
    ctx.save(); ctx.translate(r.x, r.y); ctx.scale(sc, sc);
    panel(0, 0, 246, 528, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    vgrad(ctx, 0, 0, 246, 528, 'rgba(255,248,238,.0)', 'rgba(255,236,214,.55)');
    const cx = 123;
    text(cx, PHONE ? 30 : 28, PHONE ? '🔥 가열' : '🔥 가열 장치', { size: PHONE ? 15 / sc : 15, weight: 800, color: COL.ink });
    tempCard(cx, 44, T, T >= 100 ? COL.hot : T <= 0 ? COL.cold : '#c2410c');
    // 책상
    vgrad(ctx, 14, 462, 218, 14, '#e8c796', '#cfa56d');
    // 삼발이
    ctx.strokeStyle = '#6b7689'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    [[cx - 58, 324, cx - 76, 462], [cx + 58, 324, cx + 76, 462]].forEach((q) => { ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.stroke(); });
    ctx.strokeStyle = '#98a3b6'; ctx.beginPath(); ctx.moveTo(cx, 324); ctx.lineTo(cx, 462); ctx.stroke();
    ctx.fillStyle = '#5b6678'; D.roundRect(cx - 70, 316, 140, 8, 3); ctx.fill();
    // 알코올램프
    const lg = ctx.createLinearGradient(cx - 34, 0, cx + 34, 0); lg.addColorStop(0, 'rgba(210,235,250,.95)'); lg.addColorStop(0.5, 'rgba(240,250,255,.95)'); lg.addColorStop(1, 'rgba(170,205,232,.95)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(cx - 14, 410); ctx.lineTo(cx + 14, 410); ctx.bezierCurveTo(cx + 40, 418, cx + 40, 462, cx + 32, 462); ctx.lineTo(cx - 32, 462); ctx.bezierCurveTo(cx - 40, 462, cx - 40, 418, cx - 14, 410); ctx.fill();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,170,60,.45)'; ctx.fillRect(cx - 30, 440, 60, 20);
    ctx.fillStyle = '#9aa5b6'; D.roundRect(cx - 12, 402, 24, 12, 3); ctx.fill();
    ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, 402); ctx.lineTo(cx, 392); ctx.stroke();
    // 비커 + 내용물
    const bx = cx - 60, by = 160, bw = 120, bh = 156;
    const waterLv = id === 'ice' ? 0 : id === 'melt' ? 0.1 + 0.34 * smooth(f) : id === 'water' ? 0.44 : id === 'boil' ? 0.44 * (1 - smooth(f)) : 0;
    D.beaker(bx, by, bw, bh, { level: waterLv, liquid: '#7cc4ff', t, wave: 1.3 + (id === 'boil' ? 2.5 : 0), glass: '#8fa3bd' });
    iceBlocks(cx - 8, by + bh - 4, id === 'ice' ? 1 : id === 'melt' ? 1 - smooth(f) : 0, 1, t);
    // 수증기(기체) 안개
    const gasK = id === 'boil' ? smooth(f) : id === 'steam' ? 1 : id === 'water' ? clamp((T - 80) / 40, 0, 0.35) : 0;
    if (gasK > 0.01) {
      ctx.save(); ctx.beginPath(); D.roundRect(bx + 3, by, bw - 6, bh - 3, 8); ctx.clip();
      const top = by + bh - bh * waterLv;
      const hg = ctx.createLinearGradient(0, by, 0, top); hg.addColorStop(0, 'rgba(255,255,255,' + 0.72 * gasK + ')'); hg.addColorStop(1, 'rgba(235,242,252,' + 0.42 * gasK + ')');
      ctx.fillStyle = hg; ctx.fillRect(bx, by, bw, top - by);
      ctx.strokeStyle = 'rgba(160,185,220,' + 0.5 * gasK + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); for (let q = 0; q <= 40; q += 5) { const x = bx + 18 + i * 28 + Math.sin(q * 0.2 - t * 2.4 + i * 1.3) * 7, y = top - 4 - q * ((top - by - 10) / 40); if (q) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
      ctx.restore();
    }
    // 뚜껑 + 온도계
    ctx.fillStyle = '#8a97ab'; D.roundRect(bx - 5, by - 8, bw + 10, 9, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx, by - 7, bw, 2);
    D.thermometer(cx + 34, 104, 172, T, -30, 130, { ticks: false, color: T >= 100 ? COL.hot : T <= 0 ? '#3b82f6' : '#e2464b' });
    magRing(cx - 18, 262, 22, t);
    // 불꽃 + 열 화살표
    if (R.on) {
      d3flame(cx, 392, 64, t);
      wavyArrow(cx - 52, 384, 330, t, rgba(COL.hot, 0.9), true);
      wavyArrow(cx + 52, 384, 330, t, rgba(COL.hot, 0.9), true);
      pill(cx, 494, PHONE ? '🔥 가열 중' : '🔥 열 공급: 일정한 세기', { bg: COL.hot, size: PHONE ? 13 / sc : 13, pad: 10 });
    } else {
      pill(cx, 494, PHONE ? (R.t > 0 ? '⏸ 멈춤' : '🔥 불을 켜요') : (R.t > 0 ? '⏸ 가열을 멈췄어요' : '🔥 불을 켜 보세요'), { bg: '#64748b', size: PHONE ? 13 / sc : 13, pad: 10 });
    }
    ctx.restore();
    // 거품 · 김 (화면 좌표로 내보냄)
    return null;
  }
  function d3flame(x, y, size, t) { D.flame(x, y, size, t); }
  function emitHeatFX(R, dt) {
    const st = R.st, id = st.id, T = st.T;
    if (!R.on || RM) return;
    const bubR = id === 'boil' ? 26 : id === 'water' ? clamp((T - 55) / 45, 0, 1) * 9 : id === 'melt' ? 1.5 : 0;
    if (bubR > 0 && id !== 'steam' && Math.random() < dt * bubR) {
      const wl = id === 'boil' ? 0.44 * (1 - smooth(st.f)) : id === 'melt' ? 0.1 + 0.34 * smooth(st.f) : 0.44;
      if (wl > 0.03) {
        const p0 = appPt(123 + rand(-44, 44), 306), p1 = appPt(0, 316 - 156 * wl);
        AFX.emit({ x: p0.x, y: p0.y, vx: rand(-4, 4), vy: -(p0.y - p1.y) / 0.55, life: 0.55, size: rand(2, id === 'boil' ? 5.2 : 3.4) * p0.sc, color: '#ffffff', shape: 'bubble', fade: true });
      }
    }
  }

  /* ---- 냉각 장치 ---- */
  function drawCoolApp(R, t) {
    const r = LAY.app, sc = r.w / 246, st = R.st, T = st.T, id = st.id, f = st.f;
    ctx.save(); ctx.translate(r.x, r.y); ctx.scale(sc, sc);
    panel(0, 0, 246, 528, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    vgrad(ctx, 0, 0, 246, 528, 'rgba(238,246,255,.0)', 'rgba(214,232,255,.6)');
    const cx = 123;
    text(cx, PHONE ? 30 : 28, PHONE ? '❄️ 냉각' : '❄️ 냉각 장치', { size: PHONE ? 15 / sc : 15, weight: 800, color: COL.ink });
    tempCard(cx, 44, T, T <= 40 ? COL.cold : T <= 63.5 ? '#7c3aed' : '#c2410c');
    vgrad(ctx, 14, 462, 218, 14, '#e8c796', '#cfa56d');
    // 찬물 수조
    const wx = cx - 86, wy = 214, ww = 172, wh = 244;
    D.beaker(wx, wy, ww, wh, { level: 0.86, liquid: '#8fd0ff', t, wave: 1.6, glass: '#8fa3bd' });
    // 떠 있는 얼음
    iceBlocksFloat(cx, wy + wh * 0.14 + 4, t);
    // 시험관 (팔미트산)
    const tx = cx, ty = 150, tw = 52, th = 300;
    const fs = id === 'frz' ? smooth(f) : id === 'sol' ? 1 : 0;
    const liqCol = mix('#fff0b3', '#f4e7cf', 0);
    D.testTube(tx, ty, tw, th, { level: 0.52, liquid: id === 'liq' ? '#ffe9a0' : '#fff4d0', glass: '#8fa3bd' });
    // 굳는 팔미트산: 하얗고 불투명하게
    if (fs > 0.01) {
      const top = ty + th - th * 0.52, bot = ty + th - tw / 2;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(tx - tw / 2 + 2, top); ctx.lineTo(tx - tw / 2 + 2, bot); ctx.arc(tx, bot, tw / 2 - 2, Math.PI, 0, true); ctx.lineTo(tx + tw / 2 - 2, top); ctx.closePath(); ctx.clip();
      const sg = ctx.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0); sg.addColorStop(0, 'rgba(255,252,242,' + 0.96 * fs + ')'); sg.addColorStop(1, 'rgba(236,224,196,' + 0.96 * fs + ')');
      ctx.fillStyle = sg; ctx.fillRect(tx - tw, top, tw * 2, th);
      ctx.strokeStyle = 'rgba(190,165,110,' + 0.55 * fs + ')'; ctx.lineWidth = 1.4;
      for (let i = 0; i < 14; i++) { const yy = top + 8 + (i * 17) % (bot - top - 10), xx = tx - 16 + ((i * 29) % 32); if (yy < top + (bot - top) * (0.15 + 0.85 * fs)) { ctx.beginPath(); ctx.moveTo(xx - 4, yy + 3); ctx.lineTo(xx + 4, yy - 3); ctx.stroke(); } }
      ctx.restore();
    }
    // 온도계
    D.thermometer(tx, 104, 250, T, 20, 90, { ticks: false, color: id === 'sol' && T < 45 ? '#3b82f6' : '#e2464b' });
    magRing(tx, 392, 30, t);
    // 열 방출 화살표 (시험관 → 수조)
    if (R.on) {
      [340, 392].forEach((yy, i) => { arrowSide(cx - 34, cx - 80, yy, t + i, rgba('#f26b3a', 0.92)); arrowSide(cx + 34, cx + 80, yy, t + i, rgba('#f26b3a', 0.92)); });
      pill(cx, 494, PHONE ? '열 방출 중' : '🔥 열을 내보내는 중', { bg: COL.hot, size: PHONE ? 13 / sc : 13, pad: 10 });
    } else {
      pill(cx, 494, PHONE ? (R.done ? '✅ 끝' : R.t > 0 ? '⏸ 멈춤' : '❄️ 식혀요') : (R.done ? '✅ 식히기 끝' : R.t > 0 ? '⏸ 식히기를 멈췄어요' : '❄️ 식히기를 시작해 보세요'), { bg: '#64748b', size: PHONE ? 13 / sc : 13, pad: 10 });
    }
    ctx.restore();
  }
  function iceBlocksFloat(cx, y, t) {
    [[-62, 0, 26], [58, 6, 28], [-44, 10, 22]].forEach((q, i) => {
      const x = cx + q[0] + Math.sin(t * 0.8 + i * 2) * 2, yy = y + q[1] + Math.sin(t * 1.3 + i) * 1.5, s = q[2];
      ctx.fillStyle = 'rgba(236,248,255,.95)'; D.roundRect(x - s / 2, yy - s / 2, s, s, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6; D.roundRect(x - s / 2, yy - s / 2, s, s, 6); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - s / 2 + 4, yy - s / 2 + 4, 5, s * 0.4);
    });
  }

  /* =========================================================
     상태 사다리 (고체 · 액체 · 기체 + 상태 변화 화살표 6개) · 카드 · 상자
     ========================================================= */
  const ARROWS = [
    { id: 'melt', from: 'sol', to: 'liq', name: '융해', sub: '', pair: '고체 → 액체', cls: 'absorb', ex: '얼음이 녹는다' },
    { id: 'freeze', from: 'liq', to: 'sol', name: '응고', sub: '', pair: '액체 → 고체', cls: 'release', ex: '촛농이 굳는다' },
    { id: 'vap', from: 'liq', to: 'gas', name: '기화', sub: '', pair: '액체 → 기체', cls: 'absorb', ex: '물이 끓는다 · 빨래가 마른다' },
    { id: 'cond', from: 'gas', to: 'liq', name: '액화', sub: '', pair: '기체 → 액체', cls: 'release', ex: '이슬이 맺힌다' },
    { id: 'sub1', from: 'sol', to: 'gas', name: '승화', sub: '고→기', pair: '고체 → 기체', cls: 'absorb', ex: '드라이아이스가 작아진다' },
    { id: 'sub2', from: 'gas', to: 'sol', name: '승화', sub: '기→고', pair: '기체 → 고체', cls: 'release', ex: '유리창에 성에가 낀다' },
  ];
  const AR = {}; ARROWS.forEach((a) => (AR[a.id] = a));
  const STATE = {
    sol: { name: '고체', col: '#5b7fb5', tint: '#e8f0fb', e: 0.14 },
    liq: { name: '액체', col: '#2f7de1', tint: '#e6f1ff', e: 0.5 },
    gas: { name: '기체', col: '#8b5cf6', tint: '#f1ebff', e: 0.86 },
  };
  const KIND = { sol: 0, liq: 1, gas: 2 };
  const CLS = {
    absorb: { name: '열 흡수', col: '#e2464b', tint: '#fff0f0', icon: '🔥', note: '열에너지를 받아요' },
    release: { name: '열 방출', col: '#2f7de1', tint: '#eaf3ff', icon: '❄️', note: '열에너지를 내보내요' },
  };

  Object.assign(LAY, (function () {
    const L = {};
    if (!PHONE) {
      L.th = { x: 490, y: 22, w: 294, h: 190 };
      L.cap = { x: 448, y: 304, w: 336, h: 40 };
      L.viewer = { x: 448, y: 22, w: 336, h: 276 };
      L.trayCols = 3; L.cardW = 106; L.cardH = 66; L.trayGap = 9; L.trayX = 448; L.trayY = 400; L.trayRowGap = 8;
      L.bins3 = [{ id: 'absorb', x: 448, y: 222, w: 164, h: 170 }, { id: 'release', x: 620, y: 222, w: 164, h: 170 }];
      L.bins4 = [{ id: 'absorb', x: 16, y: 22, w: 198, h: 520 }, { id: 'release', x: 226, y: 22, w: 198, h: 520 }];
      L.tray4 = { cols: 3, w: 106, h: 88, gap: 9, x: 448, y: 352, rg: 8 };
      const bw = 150, bh = 100, bx = 152;
      L.nodes = { gas: { x: bx, y: 22, w: bw, h: bh }, liq: { x: bx, y: 232, w: bw, h: bh }, sol: { x: bx, y: 442, w: bw, h: bh } };
      const N = L.nodes, xl = bx + 32, xr = bx + bw - 32;
      const up = (x, a, b) => [x, a, x, a, x, b, x, b];
      L.arrows = {
        melt: { P: up(xr, N.sol.y - 4, N.liq.y + bh + 4), slot: { cx: xr, cy: (N.sol.y + N.liq.y + bh) / 2, w: 84, h: 54 } },
        freeze: { P: up(xl, N.liq.y + bh + 4, N.sol.y - 4), slot: { cx: xl, cy: (N.sol.y + N.liq.y + bh) / 2, w: 84, h: 54 } },
        vap: { P: up(xr, N.liq.y - 4, N.gas.y + bh + 4), slot: { cx: xr, cy: (N.liq.y + N.gas.y + bh) / 2, w: 84, h: 54 } },
        cond: { P: up(xl, N.gas.y + bh + 4, N.liq.y - 4), slot: { cx: xl, cy: (N.liq.y + N.gas.y + bh) / 2, w: 84, h: 54 } },
        sub1: { P: [bx + bw + 4, N.sol.y + 50, bx + bw + 115, N.sol.y + 50, bx + bw + 115, N.gas.y + 50, bx + bw + 4, N.gas.y + 50], slot: { cx: bx + bw + 86, cy: 282, w: 84, h: 54 } },
        sub2: { P: [bx - 4, N.gas.y + 50, bx - 115, N.gas.y + 50, bx - 115, N.sol.y + 50, bx - 4, N.sol.y + 50], slot: { cx: bx - 86, cy: 282, w: 84, h: 54 } },
      };
      L.gauge = { x: 18, y: 40, h: 480 };
    } else {
      L.th = { x: 20, y: 8, w: 400, h: 176 };
      L.cap = { x: 20, y: 262, w: 400, h: 26 };
      L.viewer = { x: 67, y: 6, w: 306, h: 253 };
      L.trayCols = 3; L.cardW = 128; L.cardH = 46; L.trayGap = 8; L.trayX = 20; L.trayY = 340; L.trayRowGap = 7;
      L.bins3 = [{ id: 'absorb', x: 20, y: 192, w: 196, h: 140 }, { id: 'release', x: 224, y: 192, w: 196, h: 140 }];
      L.bins4 = [{ id: 'absorb', x: 14, y: 294, w: 200, h: 156 }, { id: 'release', x: 226, y: 294, w: 200, h: 156 }];
      L.tray4 = { cols: 3, w: 128, h: 58, gap: 8, x: 20, y: 462, rg: 7 };
      L.tileY = 452; L.tileW = 196; L.tileH = 50; L.tileX = 20;
      L.arrows = {};
      ['melt', 'freeze', 'vap', 'cond', 'sub1', 'sub2'].forEach((id, i) => {
        const col = i % 2, row = (i / 2) | 0;
        const x = L.tileX + col * (L.tileW + 8), y = L.tileY + row * (L.tileH + 4);
        L.arrows[id] = { tile: { x, y, w: L.tileW, h: L.tileH }, P: [x + 45, y + 25, x + 45, y + 25, x + 64, y + 25, x + 64, y + 25], slot: { cx: x + 148, cy: y + 25, w: 84, h: 40 } };
      });
    }
    return L;
  })());
  ARROWS.forEach((a) => {
    const g = LAY.arrows[a.id];
    a.P = g.P; a.slot = g.slot; a.tile = g.tile || null;
    let len = 0, prev = bezPt(a.P, 0);
    for (let i = 1; i <= 24; i++) { const q = bezPt(a.P, i / 24); len += Math.hypot(q.x - prev.x, q.y - prev.y); prev = q; }
    a.len = len;
    a.sr = { x: a.slot.cx - a.slot.w / 2, y: a.slot.cy - a.slot.h / 2, w: a.slot.w, h: a.slot.h };
  });
  function arrowHit(p) {
    let best = null, bd = 1e9;
    ARROWS.forEach((a) => {
      let d;
      if (a.tile) d = inRect(p, a.tile, 0) ? 0 : 1e9;
      else if (inRect(p, a.sr, 10)) d = 0;
      else { d = 1e9; for (let i = 0; i <= 20; i++) { const q = bezPt(a.P, i / 20); d = Math.min(d, Math.hypot(q.x - p.x, q.y - p.y)); } if (d > 26) d = 1e9; }
      if (d < bd) { bd = d; best = a; }
    });
    return best;
  }
  /* ---------- 화살표 그리기 ---------- */
  function arrowPoly(a, tEnd) {
    ctx.beginPath();
    const n = 26;
    for (let i = 0; i <= n; i++) { const q = bezPt(a.P, tEnd * i / n); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
  }
  function drawArrow(a, o) {
    const w = o.width || 6, head = o.head || 15;
    const tEnd = clamp(1 - head * 0.55 / a.len, 0.5, 1);
    const tip = bezPt(a.P, 1), tan = bezTan(a.P, 1);
    ctx.save();
    ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = w + 4; arrowPoly(a, tEnd); ctx.stroke();
    ctx.strokeStyle = o.color; ctx.lineWidth = w; arrowPoly(a, tEnd); ctx.stroke();
    if (o.flow != null && o.flow >= 0) {
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(2, w * 0.4); ctx.setLineDash([2, 14]); ctx.lineDashOffset = -o.flow * 64;
      arrowPoly(a, tEnd); ctx.stroke(); ctx.setLineDash([]);
    }
    const bx = tip.x - tan.x * head, by = tip.y - tan.y * head, hw = head * 0.62;
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath(); ctx.moveTo(tip.x + tan.x * 2.5, tip.y + tan.y * 2.5); ctx.lineTo(bx - tan.y * (hw + 2.5), by + tan.x * (hw + 2.5)); ctx.lineTo(bx + tan.y * (hw + 2.5), by - tan.x * (hw + 2.5)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = o.color;
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(bx - tan.y * hw, by + tan.x * hw); ctx.lineTo(bx + tan.y * hw, by - tan.x * hw); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawNodeFrame(r, key, o) {
    o = o || {};
    ctx.save();
    panel(r.x, r.y, r.w, r.h, 16, '#fff', 14, 4, 'rgba(30,50,100,.18)');
    if (o.glow) { ctx.strokeStyle = rgba(COL.sub, 0.35 * o.glow); ctx.lineWidth = 9; D.roundRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 19); ctx.stroke(); }
    ctx.restore();
  }
  function drawNodeBorder(r, key, o) {
    o = o || {};
    const st = STATE[key];
    ctx.save();
    ctx.strokeStyle = o.glow ? COL.sub : rgba(st.col, 0.55); ctx.lineWidth = o.glow ? 3.5 : 2.5;
    D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.stroke();
    ctx.restore();
    pill(r.x + 8, r.y + 14, st.name, { bg: st.col, size: 14, align: 'left', pad: 9 });
  }

  /* ---------- 카드 ---------- */
  class Card {
    constructor(o) {
      Object.assign(this, { x: 0, y: 0, w: 106, h: 58, s: 1, lift: 0, hx: 0, hy: 0, bin: null, locked: false, bad: 0, ok: 0, sel: 0, order: 0 }, o);
    }
    rect() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
  }
  function trayPos(i) {
    const cols = LAY.trayCols, col = i % cols, row = (i / cols) | 0;
    return { x: LAY.trayX + LAY.cardW / 2 + col * (LAY.cardW + LAY.trayGap), y: LAY.trayY + LAY.cardH / 2 + row * (LAY.cardH + LAY.trayRowGap) };
  }
  function goto(c, x, y, s, dur, ez) {
    SciSim.tween(c, { x, y, s: s != null ? s : 1 }, { duration: dur != null ? dur : 0.38, ease: ez || 'outBack' });
  }
  function cardBody(c, w, h, o) {
    o = o || {};
    ctx.save();
    ctx.translate(c.x + (c.bad > 0 ? Math.sin(c.bad * 40) * 4 * Math.min(1, c.bad) : 0), c.y - c.lift * 6);
    const sc = c.s * (1 + c.lift * 0.07);
    ctx.scale(sc, sc);
    softShadow(-w / 2, -h / 2, w, h, o.r || 14, 8, 3, 'rgba(30,50,100,.18)');
    if (c.lift > 0.02) { ctx.globalAlpha = c.lift; softShadow(-w / 2, -h / 2, w, h, o.r || 14, 22, 10, 'rgba(30,50,100,.3)'); ctx.globalAlpha = 1; }
    ctx.fillStyle = o.fill || '#fff'; D.roundRect(-w / 2, -h / 2, w, h, o.r || 14); ctx.fill();
    const ring = c.ok > 0 ? COL.good : c.bad > 0 ? COL.bad : c.sel > 0.5 ? COL.sub : null;
    if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = 3; D.roundRect(-w / 2, -h / 2, w, h, o.r || 14); ctx.stroke(); }
    return sc;
  }
  function cardEnd(c, w, h) {
    if (c.ok > 0) { D.check(w / 2 - 6, -h / 2 + 6, 11, 1); }
    ctx.restore();
  }
  /* 상태 변화 이름 카드 */
  function drawChgCard(c) {
    cardBody(c, c.w, c.h, { fill: '#f7f2ff' });
    if (c.sub) { text(0, -2, c.label, { size: PHONE ? 20 : 24, weight: 800, color: '#5b21b6' }); text(0, PHONE ? 16 : 19, c.sub, { size: 13, weight: 800, color: COL.muted }); }
    else text(0, PHONE ? 8 : 9, c.label, { size: PHONE ? 22 : 26, weight: 800, color: '#5b21b6' });
    cardEnd(c, c.w, c.h);
  }

  /* =========================================================
     장면 상태 · 상자(열 흡수 / 열 방출) 분류 도우미 · ③ 열에너지 출입
     ========================================================= */
  const S = { scene: '', sceneT: 0, zoom: true };
  const DR = { card: null, board: null, offX: 0, offY: 0, sx: 0, sy: 0, moved: false };

  function popIn(cards) {
    cards.forEach((c, i) => { c.s = RM ? 1 : 0.4; if (!RM) SciSim.tween(c, { s: 1 }, { duration: 0.45, delay: 0.05 * i, ease: 'outBack' }); });
  }
  function returnCard(c) { c.bin = null; goto(c, c.hx, c.hy, 1, 0.4); }
  function cardAt(cards, p) {
    for (let i = cards.length - 1; i >= 0; i--) { if (inRect(p, cards[i].rect(), 3)) return cards[i]; }
    return null;
  }
  /* '확인하기' 버튼을 눌렀을 때만 카드에 결과(초록/빨강)를 표시 (엔진이 확인 함수를 반복 호출하므로) */
  let checkArmed = false;
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.mission-actions .btn-primary')) checkArmed = true; }, true);
  const takeUser = () => { const u = checkArmed; checkArmed = false; return u; };
  function judgeBoard(B, isRight, unplacedMsg, wrongMsg) {
    const user = takeUser();
    const un = B.cards.filter((c) => !c.bin);
    if (un.length) return unplacedMsg(un.length);
    const wrong = B.cards.filter((c) => !isRight(c));
    if (user) {
      B.cards.forEach((c) => { if (isRight(c)) { c.ok = 1; c.locked = true; } });
      wrong.forEach((c) => { c.bad = 1.3; });
    }
    return wrong.length ? wrongMsg(wrong.length) : true;
  }
  /* 상자 배치 */
  function binAtP(B, p) { for (const b of B.bins) if (inRect(p, b, 4)) return b.id; return null; }
  function layoutBoard(B, animate) {
    B.bins.forEach((b) => {
      const list = B.cards.filter((c) => c.bin === b.id && c !== DR.card).sort((p, q) => p.order - q.order);
      const n = list.length, hdr = b.hdr || 44, top = b.y + hdr + 8, bodyH = b.h - hdr - 14;
      const cols = B.cols && n > B.cols.after ? B.cols.n : 1;
      const rows = Math.ceil(n / cols), pw = (b.w - 16 - (cols - 1) * 6) / cols;
      const ph = Math.min(B.pillH || 40, (bodyH - (rows - 1) * 5) / Math.max(1, rows));
      list.forEach((c, i) => {
        const col = i % cols, row = (i / cols) | 0;
        const x = b.x + 8 + pw / 2 + col * (pw + 6), y = top + ph / 2 + row * (ph + 5);
        c.pw = pw; c.ph = ph;
        if (animate) goto(c, x, y, 1, 0.36); else { c.x = x; c.y = y; }
      });
    });
  }
  function placeInBin(B, c, binId) {
    c.bin = binId; c.ok = 0; c.bad = 0; c.order = ++placeInBin.n;
    Sound.tone(660, 0.07, 'triangle', 0.06);
    const b = B.bins.find((q) => q.id === binId);
    FX.burst(b.x + b.w / 2, b.y + 30, { count: 8, speed: 80, life: 0.5, size: 3, gravity: 60, colors: [CLS[binId].col, '#ffffff'] });
    layoutBoard(B, true);
  }
  placeInBin.n = 0;
  function drawBins(B, t) {
    B.bins.forEach((b) => {
      const cl = CLS[b.id], hov = B.hover === b.id && DR.card, hdr = b.hdr || 44;
      ctx.save();
      panel(b.x, b.y, b.w, b.h, 16, '#fff', hov ? 16 : 8, 3, hov ? rgba(cl.col, 0.45) : 'rgba(30,50,100,.16)');
      ctx.beginPath(); D.roundRect(b.x, b.y, b.w, b.h, 16); ctx.clip();
      vgrad(ctx, b.x, b.y, b.w, hdr, rgba(cl.col, 0.97), shade(cl.col, -0.14));
      ctx.fillStyle = rgba(cl.col, hov ? 0.16 : 0.07); ctx.fillRect(b.x, b.y + hdr, b.w, b.h - hdr);
      ctx.font = Math.min(64, b.h * 0.3) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.14; ctx.fillStyle = '#000';
      ctx.fillText(cl.icon, b.x + b.w / 2, b.y + hdr + (b.h - hdr) * 0.55);
      ctx.restore();
      ctx.strokeStyle = hov ? cl.col : rgba(cl.col, 0.55); ctx.lineWidth = hov ? 4 : 2.5; D.roundRect(b.x, b.y, b.w, b.h, 16); ctx.stroke();
      text(b.x + b.w / 2, b.y + (hdr > 48 ? 26 : 22), cl.icon + ' ' + cl.name, { size: hdr > 48 ? 22 : 19, weight: 800, color: '#fff' });
      text(b.x + b.w / 2, b.y + (hdr > 48 ? 46 : 39), cl.note, { size: 13, weight: 800, color: 'rgba(255,255,255,.94)' });
      if (!B.cards.some((c) => c.bin === b.id)) text(b.x + b.w / 2, b.y + hdr + (b.h - hdr) / 2 + 4, '여기에 넣기', { size: 13.5, weight: 700, color: rgba(cl.col, 0.6) });
    });
  }
  /* 상자 속 알약 카드 공통 틀 */
  function pillBody(c, o) {
    const w = c.pw || 110, h = c.ph || 36;
    ctx.save();
    ctx.translate(c.x + (c.bad > 0 ? Math.sin(c.bad * 40) * 4 * Math.min(1, c.bad) : 0), c.y - c.lift * 5);
    const sc = c.s * (1 + c.lift * 0.06); ctx.scale(sc, sc);
    softShadow(-w / 2, -h / 2, w, h, 10, 5, 2, 'rgba(30,50,100,.2)');
    if (c.lift > 0.02) { ctx.globalAlpha = c.lift; softShadow(-w / 2, -h / 2, w, h, 10, 16, 8, 'rgba(30,50,100,.3)'); ctx.globalAlpha = 1; }
    ctx.fillStyle = o && o.fill || '#fff'; D.roundRect(-w / 2, -h / 2, w, h, 10); ctx.fill();
    const ring = c.ok > 0 ? COL.good : c.bad > 0 ? COL.bad : null;
    if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = 2.5; D.roundRect(-w / 2, -h / 2, w, h, 10); ctx.stroke(); }
    return { w, h };
  }
  function drawChgPill(c) {
    const { w, h } = pillBody(c, { fill: '#f7f2ff' });
    if (c.sub && h >= 34) { text(0, -1, c.label, { size: 14, weight: 800, color: '#5b21b6' }); text(0, 14, c.sub, { size: 13, weight: 800, color: COL.muted }); }
    else if (c.sub) text(0, 5, c.label + ' ' + c.sub.replace(/ /g, ''), { size: 13, weight: 800, color: '#5b21b6' });
    else text(0, 5, c.label, { size: h >= 34 ? 15 : 14, weight: 800, color: '#5b21b6' });
    if (c.ok > 0) D.check(w / 2 - 9, -h / 2 + 9, 7.5, 1);
    ctx.restore();
  }

  /* ---------- ③ 열에너지 출입: 사다리 + 입자 모형 무대 ---------- */
  const NODEBOX = {};
  function initNodes() {
    if (PHONE) return;
    ['sol', 'liq', 'gas'].forEach((k) => {
      const r = LAY.nodes[k];
      NODEBOX[k] = new PBox({ N: 20, R: 6.4, color: COL.water, box: { x0: r.x + 6, y0: r.y + 6, x1: r.x + r.w - 6, y1: r.y + r.h - 8 }, lattice: 'hex', cols: 5, state: KIND[k], therm: 0.4, vl: 32, vg: 100 });
    });
  }
  const TH = { box: null, arrow: null, phase: 'idle', t: 0, fade: 1, reveal: 0, endT: 0, watched: {}, k2: 1, heatK: 0, lvl: 0.5 };
  function initTheater() {
    const r = LAY.th, gw = PHONE ? 52 : 46;
    TH.box = new PBox({ N: 40, R: PHONE ? 8.5 : 8.5, color: COL.water, box: { x0: r.x + 8, y0: r.y + 8, x1: r.x + r.w - gw - 6, y1: r.y + r.h - 12 }, lattice: 'hex', cols: 6, state: 1, therm: 0.45, vl: 46, vg: 140, flashUp: '#ff8a3d', flashDown: '#4a90ff' });
  }
  function playArrow(id) {
    const a = AR[id];
    Sound.click();
    TH.arrow = id; TH.t = 0; TH.phase = 'hold'; TH.reveal = 0; TH.k2 = KIND[a.to]; TH.lvl = STATE[a.from].e;
    TH.fade = 0; SciSim.tween(TH, { fade: 1 }, { duration: 0.3 });
    TH.box.reset(KIND[a.from]);
  }
  function updateTheater(dt) {
    TH.box.step(dt);
    const heating = TH.phase === 'morph' || TH.phase === 'end';
    TH.heatK = SciSim.approach(TH.heatK, heating ? 1 : 0, dt, heating ? 8 : 4);
    if (TH.phase === 'idle') return;
    TH.t += dt;
    const N = TH.box.p.length, a = AR[TH.arrow];
    if (TH.phase === 'hold' && TH.t > 0.9) {
      TH.phase = 'morph';
      TH.box.gap = 2.2 / N;
      const k = TH.k2;
      TH.box.setWant(k === 0 ? N : 0, k === 1 ? N : 0, k === 2 ? N : 0);
    } else if (TH.phase === 'morph') {
      const n2 = TH.box.count(TH.k2);
      TH.reveal = n2 / N;
      TH.lvl = lerp(STATE[a.from].e, STATE[a.to].e, smooth(TH.reveal));
      if (TH.box.done() && TH.t > 1.6) { TH.phase = 'end'; TH.endT = 0; TH.reveal = 1; }
    } else if (TH.phase === 'end') {
      TH.endT += dt;
      TH.lvl = STATE[a.to].e;
      if (TH.endT > 1.2) {
        TH.phase = 'idle';
        if (!TH.watched[TH.arrow]) { TH.watched[TH.arrow] = true; Sound.tone(880, 0.08, 'triangle', 0.07); }
      }
    }
  }
  /* 가로 물결 화살표 (열의 출입) */
  function heatArrowH(x0, x1, y, t, color, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const dx = x1 - x0, s = Math.sign(dx) || 1;
    ctx.beginPath();
    let lx = x0, ly = y;
    for (let i = 0; i <= 14; i++) { const u = i / 14, px = x0 + dx * u, py = y + Math.sin(u * 6 - t * 5 * s) * 3.6; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); lx = px; ly = py; }
    ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(lx + s * 10, ly); ctx.lineTo(lx - s * 2, ly - 8); ctx.lineTo(lx - s * 2, ly + 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function nodeGlowOf(k) {
    if (S.scene !== 'flow' || !TH.arrow || TH.phase === 'idle') return 0;
    const a = AR[TH.arrow];
    if (a.from === k) return TH.phase === 'hold' ? 1 : 0.5;
    if (a.to === k) return TH.phase === 'morph' ? 0.5 : 1;
    return 0;
  }
  function drawNode(k, t) {
    const r = LAY.nodes[k], glow = nodeGlowOf(k);
    drawNodeFrame(r, k, { glow });
    ctx.save();
    ctx.beginPath(); D.roundRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3, 14.5); ctx.clip();
    vgrad(ctx, r.x, r.y, r.w, r.h, '#fdfeff', STATE[k].tint);
    ctx.fillStyle = 'rgba(110,130,170,.16)'; ctx.fillRect(r.x, r.y + r.h - 8, r.w, 8);
    NODEBOX[k].draw(ctx, 1);
    ctx.restore();
    drawNodeBorder(r, k, { glow });
  }
  function arrowStyle(a, t) {
    let color = '#a9b6c9', width = PHONE ? 5 : 6, flow = -1;
    if (B3.solved || B3.revealed) color = CLS[a.cls].col;
    else if (TH.watched[a.id]) color = '#8b7bdc';
    if (TH.arrow === a.id && TH.phase !== 'idle') { color = CLS[a.cls].col; flow = (t * 0.8) % 1; width = 7.5; }
    return { color, width, flow, head: PHONE ? 10 : 15 };
  }
  function drawNamePill(a, t) {
    const w = a.slot.w, h = a.slot.h, on2 = TH.arrow === a.id && TH.phase !== 'idle';
    ctx.save();
    ctx.translate(a.slot.cx, a.slot.cy);
    const k = on2 ? 1.07 : 1; ctx.scale(k, k);
    softShadow(-w / 2, -h / 2, w, h, 14, on2 ? 12 : 5, 2, on2 ? 'rgba(139,92,246,.4)' : 'rgba(30,50,100,.16)');
    ctx.fillStyle = '#fff'; D.roundRect(-w / 2, -h / 2, w, h, 14); ctx.fill();
    ctx.strokeStyle = on2 ? CLS[a.cls].col : (B3.solved || B3.revealed) ? rgba(CLS[a.cls].col, 0.7) : 'rgba(139,92,246,.35)'; ctx.lineWidth = on2 ? 3 : 2; D.roundRect(-w / 2, -h / 2, w, h, 14); ctx.stroke();
    if (a.sub) { text(0, -1, a.name, { size: PHONE ? 14 : 17, weight: 800, color: '#5b21b6' }); text(0, PHONE ? 13 : 16, a.sub, { size: 13, weight: 800, color: COL.muted }); }
    else text(0, PHONE ? 5 : 6, a.name, { size: PHONE ? 15 : 19, weight: 800, color: '#5b21b6' });
    if ((B3.solved || B3.revealed) && !PHONE) { const c2 = CLS[a.cls]; ctx.fillStyle = c2.col; circle(ctx, w / 2 - 6, -h / 2 + 6, 9); ctx.fill(); text(w / 2 - 6, -h / 2 + 11, a.cls === 'absorb' ? '+' : '−', { size: 15, weight: 800, color: '#fff' }); }
    ctx.restore();
  }
  function drawTile(a, t) {
    const r = a.tile;
    ctx.save();
    panel(r.x, r.y, r.w, r.h, 14, '#fff', 8, 2, 'rgba(30,50,100,.16)');
    const on2 = TH.arrow === a.id && TH.phase !== 'idle';
    if (on2) { ctx.strokeStyle = COL.sub; ctx.lineWidth = 3; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke(); }
    const cy = r.y + r.h / 2;
    [[a.from, r.x + 24], [a.to, r.x + 86]].forEach((q) => {
      D.sphere(q[1], cy, 18, STATE[q[0]].col, { gloss: false });
      text(q[1], cy + 5, STATE[q[0]].name, { size: 13, weight: 800, color: '#fff' });
    });
    ctx.restore();
  }
  function drawLadder(t) {
    if (!PHONE) {
      ARROWS.forEach((a) => drawArrow(a, arrowStyle(a, t)));
      ['gas', 'liq', 'sol'].forEach((k) => drawNode(k, t));
      // 열에너지 막대 (세로축)
      const g = LAY.gauge;
      ctx.save();
      text(g.x + 4, g.y - 12, '열에너지', { size: 13, weight: 800, color: COL.muted, align: 'left' });
      ctx.fillStyle = '#e8edf6'; D.roundRect(g.x, g.y, 14, g.h - 20, 7); ctx.fill();
      const gr = ctx.createLinearGradient(0, g.y, 0, g.y + g.h - 20); gr.addColorStop(0, '#ef4444'); gr.addColorStop(0.5, '#f59e0b'); gr.addColorStop(1, '#93c5fd');
      ctx.fillStyle = gr; D.roundRect(g.x + 3, g.y + 3, 8, g.h - 26, 4); ctx.fill();
      ['gas', 'liq', 'sol'].forEach((k) => { const n = LAY.nodes[k]; const yy = n.y + n.h / 2; ctx.fillStyle = '#5d6879'; ctx.fillRect(g.x + 16, yy - 1, 8, 2); });
      // 표시 구슬
      const mk = TH.arrow ? TH.lvl : -1;
      if (mk >= 0) {
        const yy = LAY.nodes.sol.y + LAY.nodes.sol.h / 2 + (LAY.nodes.gas.y + LAY.nodes.gas.h / 2 - LAY.nodes.sol.y - LAY.nodes.sol.h / 2) * ((mk - STATE.sol.e) / (STATE.gas.e - STATE.sol.e));
        D.glow(g.x + 7, yy, 20, '#f59e0b', 0.6); D.sphere(g.x + 7, yy, 8, '#f59e0b', { gloss: true });
      }
      ctx.restore();
      text(g.x + 4, g.y + g.h - 2, '적음', { size: 13, weight: 700, color: COL.muted, align: 'left' });
    } else ARROWS.forEach((a) => drawTile(a, t));
    ARROWS.forEach((a) => { if (PHONE) drawArrow(a, arrowStyle(a, t)); drawNamePill(a, t); });
  }
  function drawTheater(t) {
    const r = LAY.th, a = TH.arrow ? AR[TH.arrow] : null;
    lensFrame(r, {}, () => {
      TH.box.draw(ctx, TH.fade);
      // 에너지 눈금
      const gx = r.x + r.w - (PHONE ? 40 : 34), gy0 = r.y + 44, gy1 = r.y + r.h - 24;
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(gx - 22, r.y + 36, 44, r.h - 48);
      ctx.fillStyle = '#e8edf6'; D.roundRect(gx - 6, gy0, 12, gy1 - gy0, 6); ctx.fill();
      const ly = gy1 - (gy1 - gy0) * TH.lvl;
      const gg = ctx.createLinearGradient(0, ly, 0, gy1); gg.addColorStop(0, '#f59e0b'); gg.addColorStop(1, '#fcd34d');
      ctx.fillStyle = gg; D.roundRect(gx - 6, ly, 12, gy1 - ly, 6); ctx.fill();
      ['sol', 'liq', 'gas'].forEach((k) => { const yy = gy1 - (gy1 - gy0) * STATE[k].e; ctx.fillStyle = '#5d6879'; ctx.fillRect(gx + 8, yy - 1, 5, 2); text(gx + 15, yy + 4.5, STATE[k].name[0], { size: 13, weight: 800, color: STATE[k].col, align: 'left' }); });
      D.sphere(gx, ly, 8, '#f59e0b', { gloss: true });
    });
    text(r.x + r.w - 8, r.y + 33, '열에너지', { size: 13, weight: 800, color: COL.muted, align: 'right' });
    // 열의 출입 화살표 (장면 왼쪽)
    if (a && TH.heatK > 0.02) {
      const cl = CLS[a.cls], hx = PHONE ? r.x - 2 : r.x - 42;
      if (!PHONE) {
        [r.y + 62, r.y + 104, r.y + 146].forEach((yy, i) => { if (a.cls === 'absorb') heatArrowH(hx, hx + 38, yy, t + i * 0.3, cl.col, TH.heatK); else heatArrowH(hx + 38, hx, yy, t + i * 0.3, cl.col, TH.heatK); });
        ctx.save(); ctx.globalAlpha = TH.heatK; pill(hx + 19, r.y + 178, cl.name, { bg: cl.col, size: 13, pad: 7 }); ctx.restore();
      } else {
        ctx.save(); ctx.globalAlpha = TH.heatK; pill(r.x + r.w / 2, r.y + r.h - 24, cl.icon + ' ' + cl.name + (a.cls === 'absorb' ? ' (열이 들어와요)' : ' (열이 나가요)'), { bg: cl.col, size: 13, pad: 9 }); ctx.restore();
      }
    }
    if (a) {
      const lab = STATE[a.from].name + ' → ' + STATE[a.to].name;
      pill(r.x + r.w - 58 - (PHONE ? 4 : 0), r.y + 16, lab, { bg: TH.phase === 'idle' || TH.phase === 'end' ? COL.sub : '#7c6bd6', size: 13.5, align: 'right', pad: 10 });
    } else {
      panel(r.x + 22, r.y + 52, r.w - 92, 62, 14, 'rgba(255,255,255,.94)', 8, 2, 'rgba(20,40,80,.22)');
      text(r.x + 22 + (r.w - 92) / 2, r.y + 79, PHONE ? '아래 화살표를 눌러 보세요' : '왼쪽 화살표를 눌러 보세요', { size: 15.5, weight: 800, color: COL.sub });
      text(r.x + 22 + (r.w - 92) / 2, r.y + 102, '열의 출입을 살펴봐요', { size: 13.5, weight: 700, color: COL.muted });
    }
  }

  /* ---------- 이름 카드 · 분류 ---------- */
  const B3 = { cards: [], bins: [], solved: false, revealed: false, hover: null, cols: { after: 3, n: 2 }, pillH: 40 };
  const CHG_ORDER = ['sub2', 'melt', 'cond', 'vap', 'sub1', 'freeze'];
  function initB3() {
    B3.bins = LAY.bins3.map((b) => Object.assign({}, b, { hdr: PHONE ? 46 : 44 }));
    B3.cards = CHG_ORDER.map((id, i) => {
      const a = AR[id], tp = trayPos(i);
      return new Card({ id: 'c_' + id, kind: 'chg', arrow: id, label: a.name, sub: a.sub ? a.sub.replace('→', ' → ') : '', ans: a.cls, w: LAY.cardW, h: LAY.cardH, x: tp.x, y: tp.y, hx: tp.x, hy: tp.y });
    });
    B3.solved = false; B3.revealed = false;
  }
  function checkB3() {
    return judgeBoard(B3, (c) => c.bin === c.ans,
      (n) => '아직 상자에 넣지 않은 카드가 ' + n + '장 있어요. 여섯 장을 모두 넣어 보세요.',
      (n) => n + '장은 반대쪽 상자예요. 빨간 카드는 곧 돌아가요. 화살표를 눌러 열에너지가 들어오는지 나가는지 살펴보세요.');
  }
  function drawFlow(t) {
    drawLadder(t);
    drawTheater(t);
    drawBins(B3, t);
    const rest = B3.cards.filter((c) => c !== DR.card && !c.bin), placed = B3.cards.filter((c) => c !== DR.card && c.bin);
    rest.forEach(drawChgCard); placed.forEach(drawChgPill);
    if (DR.card && B3.cards.indexOf(DR.card) >= 0) { if (DR.card.bin) drawChgPill(DR.card); else drawChgCard(DR.card); }
  }
  const watchedCount = () => ARROWS.filter((a) => TH.watched[a.id]).length;

  /* =========================================================
     ④ 생활 속 열에너지 출입: 다섯 장면 (가상 좌표 340 × 280, p: 0 → 1)
     ========================================================= */
  const SW = 340, SH = 280;
  const SCN = {};
  function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }
  function waveArrow(c, x0, y0, x1, y1, t, color, w, alpha) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    c.save(); c.globalAlpha = alpha != null ? alpha : 1; c.strokeStyle = color; c.lineWidth = w || 4.5; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); let lx = x0, ly = y0; const n = Math.max(8, Math.round(L / 6));
    for (let i = 0; i <= n; i++) { const u = i / n, off = Math.sin(u * L / 9 - t * 5) * 3.2, px = x0 + dx * u + nx * off, py = y0 + dy * u + ny * off; if (i) c.lineTo(px, py); else c.moveTo(px, py); lx = px; ly = py; }
    c.stroke();
    c.fillStyle = color; c.beginPath(); c.moveTo(lx + ux * 10, ly + uy * 10); c.lineTo(lx - ux * 2 + nx * 8, ly - uy * 2 + ny * 8); c.lineTo(lx - ux * 2 - nx * 8, ly - uy * 2 - ny * 8); c.closePath(); c.fill(); c.restore();
  }
  /* 작은 입자 모형 창: 입자 14개가 한 배열에서 다른 배열로 바뀜 */
  const MM = (function () {
    let s = 123456789;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 20; i++) r();
    const sol = [], liq = [], gas = [];
    [5, 5, 4].forEach((n, ri) => { for (let i = 0; i < n; i++) sol.push([0.5 + (i - (n - 1) / 2) * 0.15, 0.84 - ri * 0.16]); });
    for (let i = 0; i < 14; i++) {
      const row = i % 2, col = i >> 1;
      liq.push([0.1 + col * 0.8 / 6 + row * 0.06 + (r() - 0.5) * 0.05, 0.76 + row * 0.14 + (r() - 0.5) * 0.04]);
      gas.push([0.08 + r() * 0.84, 0.1 + r() * 0.72]);
    }
    return { sol, liq, gas };
  })();
  function miniMorph(c, x, y, w, h, kFrom, kTo, p, t, col, title) {
    const A = MM[kFrom], B = MM[kTo], e = smooth(seg(p, 0.15, 0.85));
    c.save();
    c.fillStyle = 'rgba(255,255,255,.96)'; rrPath(c, x, y, w, h, 12); c.fill();
    c.strokeStyle = 'rgba(124,58,237,.7)'; c.lineWidth = 2.5; rrPath(c, x, y, w, h, 12); c.stroke();
    c.save(); rrPath(c, x, y, w, h, 12); c.clip();
    c.fillStyle = 'rgba(110,130,170,.14)'; c.fillRect(x, y + h - 6, w, 6);
    const wk = { sol: kFrom === 'sol' ? 1 - e : kTo === 'sol' ? e : 0, gas: kFrom === 'gas' ? 1 - e : kTo === 'gas' ? e : 0 };
    for (let i = 0; i < 14; i++) {
      const px = lerp(A[i][0], B[i][0], e), py = lerp(A[i][1], B[i][1], e);
      const jx = Math.sin(t * (4 + i * 0.7) + i) * (wk.sol * 1.2 + (1 - wk.sol - wk.gas) * 2.2 + wk.gas * 5), jy = Math.cos(t * (3.6 + i * 0.5) + i * 2) * (wk.sol * 1.2 + (1 - wk.sol - wk.gas) * 2.2 + wk.gas * 5);
      drawBall(c, col, x + 8 + px * (w - 16) + jx, y + 8 + py * (h - 16) + jy, 5.4);
    }
    c.restore();
    c.restore();
    d2label(c, x + w / 2, y - 9, title);
  }
  function d2label(c, x, y, str) {
    c.save(); c.font = '800 13px ' + '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
    const tw = c.measureText(str).width + 18;
    c.fillStyle = '#5b21b6'; rrPath(c, x - tw / 2, y - 11, tw, 22, 11); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(str, x, y + 1); c.restore();
  }
  function tag(c, x, y, str, col) {
    c.save(); c.font = '800 13px "Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
    const tw = c.measureText(str).width + 20;
    c.fillStyle = col; rrPath(c, x - tw / 2, y - 12, tw, 24, 12); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(str, x, y + 1); c.restore();
  }

  /* 1. 이글루 안에 물 뿌리기 : 응고 → 열 방출 */
  SCN.igloo = {
    title: '이글루 안에 물 뿌리기', dur: 6.5,
    draw(c, d, p, t) {
      vgrad(c, 0, 0, SW, SH, '#1f2f58', '#4a6a9c');
      for (let i = 0; i < 18; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.3 * Math.sin(t * 2 + i)) + ')'; circle(c, (i * 71) % SW, (i * 37) % 110, 1 + (i % 3) * 0.5); c.fill(); }
      vgrad(c, 0, 238, SW, 42, '#f4faff', '#c6d9ee');
      const cx = 150, cy = 240, R = 126, R2 = 100;
      const warm = smooth(seg(p, 0.3, 1)), ice = smooth(seg(p, 0.2, 0.95));
      // 바깥 얼음 벽돌
      const og = c.createLinearGradient(0, cy - R, 0, cy); og.addColorStop(0, '#f2f9ff'); og.addColorStop(1, '#d4e6f8');
      c.fillStyle = og; c.beginPath(); c.arc(cx, cy, R, Math.PI, 0); c.closePath(); c.fill();
      c.strokeStyle = '#9fbfdd'; c.lineWidth = 2;
      for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(cx, cy, R - k * 6.5, Math.PI, 0); c.stroke(); }
      for (let k = 0; k < 4; k++) { const r0 = R - k * 6.5, r1 = R - (k + 1) * 6.5, n = 9 + k * 2; for (let a = 1; a < n; a++) { const th = Math.PI + (a + (k % 2) * 0.5) * Math.PI / n; c.beginPath(); c.moveTo(cx + Math.cos(th) * r0, cy + Math.sin(th) * r0); c.lineTo(cx + Math.cos(th) * r1, cy + Math.sin(th) * r1); c.stroke(); } }
      // 안쪽 (실내): 차가운 파랑 → 따뜻한 노랑
      const ig = c.createRadialGradient(cx, cy - 30, 10, cx, cy, R2);
      ig.addColorStop(0, mix('#cfe3fa', '#ffe9b8', warm)); ig.addColorStop(1, mix('#9bbde4', '#ffc98a', warm));
      c.fillStyle = ig; c.beginPath(); c.arc(cx, cy, R2, Math.PI, 0); c.closePath(); c.fill();
      d.glow(cx, cy - 36, 80, '#ffd27a', 0.55 * warm);
      c.strokeStyle = '#6f98c4'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, R2, Math.PI, 0); c.stroke();
      // 입구
      c.fillStyle = '#e1eefa'; D2rr(c, 236, 214, 74, 30, 14); c.fill(); c.fillStyle = '#7ea3c8'; D2rr(c, 247, 222, 52, 22, 11); c.fill();
      // 안쪽 벽에 어는 물 (얼음층)
      if (ice > 0.01) {
        c.lineCap = 'round';
        c.strokeStyle = 'rgba(120,200,240,.9)'; c.lineWidth = 4 + 12 * ice; c.beginPath(); c.arc(cx, cy, R2 - 4 - 5 * ice, Math.PI * 1.08, Math.PI * (1.08 + 0.84 * ice)); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2 + 7 * ice; c.beginPath(); c.arc(cx, cy, R2 - 4 - 5 * ice, Math.PI * 1.08, Math.PI * (1.08 + 0.84 * ice)); c.stroke();
      }
      // 분무기 (바닥 왼쪽) + 물방울
      c.fillStyle = '#eef4fb'; D2rr(c, 54, 206, 24, 34, 6); c.fill(); c.fillStyle = '#5fa8f5'; D2rr(c, 56, 218, 20, 20, 4); c.fill();
      c.fillStyle = '#c9d6e6'; D2rr(c, 58, 196, 16, 12, 3); c.fill(); c.fillRect(70, 198, 18, 6);
      if (p < 0.9) for (let i = 0; i < 10; i++) {
        const u = ((t * 0.8 + i / 10) % 1), a = Math.PI * (1.14 + 0.72 * ((i * 0.381) % 1));
        const tx = cx + Math.cos(a) * (R2 - 6), ty = cy + Math.sin(a) * (R2 - 6);
        const x = lerp(90, tx, u), y = lerp(200, ty, u) - Math.sin(u * Math.PI) * 30;
        c.fillStyle = u > 0.85 ? 'rgba(235,246,255,.98)' : 'rgba(80,160,245,.95)'; circle(c, x, y, 3.2); c.fill();
      }
      // 열 방출: 얼음층 → 실내
      const k = smooth(seg(p, 0.25, 0.4));
      [[-46, -62], [0, -78], [46, -62]].forEach((q, i) => waveArrow(c, cx + q[0] * 1.5, cy + q[1] * 1.0 - 20, cx + q[0] * 0.45, cy - 34, t + i * 0.4, '#f26b3a', 5, k));
      tag(c, cx, 50, '🔥 열 방출', '#e2464b');
      c.fillStyle = 'rgba(255,255,255,.94)'; D2rr(c, cx - 48, cy - 30, 96, 26, 13); c.fill();
      c.font = '800 14px ui-monospace, Menlo, monospace'; c.fillStyle = '#9a3412'; c.textAlign = 'center'; c.fillText('실내 ' + lerp(-12, -8, warm).toFixed(0) + ' °C', cx, cy - 12);
      miniMorph(c, 238, 66, 96, 76, 'liq', 'sol', p, t, COL.water, '액체 → 고체');
    },
  };
  function D2rr(c, x, y, w, h, r) { rrPath(c, x, y, w, h, r); }

  /* 2. 운동 후 땀이 마르면 시원해요 : 기화 → 열 흡수 */
  SCN.sweat = {
    title: '땀이 마르면 시원해요', dur: 6.5,
    draw(c, d, p, t) {
      vgrad(c, 0, 0, SW, SH, '#fff4e8', '#ffe2c8');
      d.glow(300, 30, 130, '#ffd27a', 0.5);
      // 팔(피부)
      const sg = c.createLinearGradient(0, 120, 0, 280); sg.addColorStop(0, '#ffd3b0'); sg.addColorStop(1, '#f1ab82');
      c.fillStyle = sg; D2rr(c, -20, 128, 380, 170, 60); c.fill();
      c.strokeStyle = 'rgba(190,110,70,.35)'; c.lineWidth = 2; D2rr(c, -20, 128, 380, 170, 60); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.28)'; ell(c, 120, 150, 100, 8); c.fill();
      // 땀방울: 점점 작아지고 수증기로
      const spots = [[60, 168, 11], [118, 176, 14], [178, 164, 12], [236, 178, 13], [290, 166, 10], [92, 214, 9], [210, 214, 10]];
      spots.forEach((q, i) => {
        const k = 1 - smooth(seg(p, 0.12 + (i % 4) * 0.08, 0.8 + (i % 3) * 0.05));
        if (k > 0.03) {
          c.fillStyle = 'rgba(190,225,255,.9)'; ell(c, q[0], q[1], q[2] * k, q[2] * 0.82 * k); c.fill();
          c.strokeStyle = 'rgba(40,110,190,.85)'; c.lineWidth = 1.6; ell(c, q[0], q[1], q[2] * k, q[2] * 0.82 * k); c.stroke();
          c.fillStyle = 'rgba(255,255,255,.95)'; ell(c, q[0] - q[2] * 0.3 * k, q[1] - q[2] * 0.3 * k, q[2] * 0.28 * k, q[2] * 0.2 * k); c.fill();
        }
        // 수증기
        const vk = seg(p, 0.12 + (i % 4) * 0.08, 0.5);
        if (vk > 0 && k < 0.98) for (let j = 0; j < 2; j++) {
          const u = (t * 0.45 + i * 0.31 + j * 0.5) % 1;
          c.strokeStyle = 'rgba(120,150,200,' + (0.7 * Math.sin(u * Math.PI) * vk) + ')'; c.lineWidth = 3; c.lineCap = 'round';
          c.beginPath(); for (let s = 0; s <= 20; s += 4) { const x = q[0] - 8 + j * 14 + Math.sin(s * 0.4 + t * 3 + i) * 4, y = q[1] - 14 - u * 70 - s * 1.3; if (s) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke();
        }
      });
      // 열 흡수: 몸 → 땀방울
      const ak = smooth(seg(p, 0.15, 0.3));
      [80, 160, 240].forEach((x, i) => waveArrow(c, x, 232, x + 8, 190, t + i * 0.5, '#e2464b', 4.5, ak));
      tag(c, 170, 250, '🔥 열 흡수 (몸에서 열을 가져가요)', '#e2464b');
      // 얼굴
      c.font = '34px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.globalAlpha = 1 - smooth(seg(p, 0.35, 0.7)); c.fillText('😓', 40, 44);
      c.globalAlpha = smooth(seg(p, 0.35, 0.7)); c.fillText('😌', 40, 44); c.globalAlpha = 1; c.textBaseline = 'alphabetic';
      miniMorph(c, 232, 36, 96, 76, 'liq', 'gas', p, t, COL.water, '액체 → 기체');
    },
  };

  /* 3. 아이스박스의 얼음 : 융해 → 열 흡수 */
  SCN.icebox = {
    title: '아이스박스의 얼음', dur: 6.5,
    draw(c, d, p, t) {
      vgrad(c, 0, 0, SW, SH, '#eaf5ff', '#f8fcff');
      vgrad(c, 0, 236, SW, 44, '#e3cfa8', '#c9ab7a');
      // 상자
      const bx = 36, by = 96, bw = 268, bh = 142;
      softShadowC(c, bx, by, bw, bh, 18);
      const g = c.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#5aa7f0'); g.addColorStop(1, '#2f7de1');
      c.fillStyle = g; D2rr(c, bx, by, bw, bh, 18); c.fill();
      c.fillStyle = '#eaf3ff'; D2rr(c, bx + 12, by + 14, bw - 24, bh - 28, 10); c.fill();
      c.fillStyle = '#fff'; D2rr(c, bx - 8, by - 12, bw + 16, 16, 7); c.fill();
      // 안: 음료 캔 + 얼음 (얼음이 녹음)
      const k = 1 - 0.82 * smooth(seg(p, 0.1, 0.95));
      c.fillStyle = 'rgba(120,190,250,' + (0.7 * (1 - k)) + ')'; D2rr(c, bx + 14, by + bh - 30, bw - 28, 16 * (1 - k) + 4, 6); c.fill();
      [[90, '#ef4444'], [250, '#22a06b']].forEach((q, i) => { c.fillStyle = q[1]; D2rr(c, q[0] - 15, by + 36, 30, 62, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(q[0] - 9, by + 42, 6, 48); c.fillStyle = '#c9d2de'; c.fillRect(q[0] - 12, by + 33, 24, 4); });
      [[150, 0, 40], [196, 4, 36], [172, -34, 34]].forEach((q) => {
        const s = q[2] * k; if (s < 3) return; const x = q[0], y = by + bh - 32 - s / 2 + q[1] * k;
        c.fillStyle = 'rgba(226,244,255,.97)'; D2rr(c, x - s / 2, y - s / 2, s, s, Math.max(3, 8 * (1 - k) + 5)); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2; D2rr(c, x - s / 2, y - s / 2, s, s, Math.max(3, 8 * (1 - k) + 5)); c.stroke();
        c.fillStyle = 'rgba(150,205,246,.6)'; c.fillRect(x - s / 2 + s * 0.12, y - s / 2 + s * 0.12, s * 0.14, s * 0.4);
      });
      // 열 흡수 화살표: 음료·공기 → 얼음
      const ak = smooth(seg(p, 0.1, 0.25));
      waveArrow(c, 108, by + 62, 140, by + 82, t, '#e2464b', 4.5, ak);
      waveArrow(c, 232, by + 62, 206, by + 82, t + 0.5, '#e2464b', 4.5, ak);
      waveArrow(c, 170, by - 36, 170, by + 30, t + 0.3, '#e2464b', 4.5, ak);
      tag(c, 170, 40, '🔥 열 흡수', '#e2464b');
      // 음료 온도
      c.fillStyle = 'rgba(255,255,255,.94)'; D2rr(c, 36, 240, 112, 26, 13); c.fill();
      c.font = '800 14px ui-monospace, Menlo, monospace'; c.fillStyle = '#1d4ed8'; c.textAlign = 'center'; c.fillText('음료 ' + lerp(25, 8, smooth(seg(p, 0.1, 0.9))).toFixed(0) + ' °C', 92, 258);
      miniMorph(c, 232, 36, 96, 76, 'sol', 'liq', p, t, COL.water, '고체 → 액체');
    },
  };
  function softShadowC(c, x, y, w, h, r) { c.save(); c.shadowColor = 'rgba(30,50,100,.28)'; c.shadowBlur = 10; c.shadowOffsetY = 5; c.fillStyle = '#fff'; rrPath(c, x, y, w, h, r); c.fill(); c.restore(); }

  /* 4. 에어컨 : 실내기 냉매 기화(열 흡수) · 실외기 냉매 액화(열 방출) */
  const AC_PATH = [[88, 118], [88, 196], [150, 236], [262, 236], [262, 196], [262, 118], [262, 86], [150, 86], [88, 86]];
  SCN.aircon = {
    title: '에어컨의 냉매', dur: 7,
    draw(c, d, p, t) {
      vgrad(c, 0, 0, SW, SH, '#f3f8ff', '#e3eefb');
      c.fillStyle = 'rgba(255,255,255,.7)'; D2rr(c, 8, 8, 160, 264, 14); c.fill();
      c.fillStyle = 'rgba(190,225,255,.5)'; D2rr(c, 172, 8, 160, 264, 14); c.fill();
      tag(c, 52, 112, '🏠 실내', '#64748b'); tag(c, 262, 30, '🌤️ 실외', '#64748b');
      // 실내기 / 실외기
      c.fillStyle = '#fff'; D2rr(c, 22, 44, 132, 46, 12); c.fill(); c.strokeStyle = '#b9c6d8'; c.lineWidth = 2; D2rr(c, 22, 44, 132, 46, 12); c.stroke();
      c.fillStyle = '#e8eef6'; for (let i = 0; i < 6; i++) c.fillRect(34, 76 + 0, 108, 1);
      c.fillStyle = '#dde6f1'; D2rr(c, 36, 76, 104, 8, 4); c.fill();
      c.fillStyle = '#fff'; D2rr(c, 190, 150, 128, 100, 12); c.fill(); c.strokeStyle = '#b9c6d8'; D2rr(c, 190, 150, 128, 100, 12); c.stroke();
      c.strokeStyle = '#c3cfdf'; c.lineWidth = 3; ell(c, 254, 200, 34, 34); c.stroke();
      c.save(); c.translate(254, 200); c.rotate(t * 6); c.fillStyle = '#94a3b8'; for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); c.beginPath(); c.ellipse(14, 0, 14, 6, 0, 0, TAU); c.fill(); } c.restore();
      // 냉매 순환 관
      const pts = AC_PATH.map((q) => [q[0] + (q[0] > 170 ? 0 : 0), q[1]]);
      const segs = []; let L = 0;
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push({ a, b, l, s0: L }); L += l; }
      c.strokeStyle = '#c3cfdf'; c.lineWidth = 12; c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.stroke();
      c.strokeStyle = '#eef3f9'; c.lineWidth = 8; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.stroke();
      // 코일 표시
      c.strokeStyle = '#94a3b8'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(70 + i * 8, 108 - 8 + i * 0); c.lineTo(70 + i * 8, 130); c.stroke(); }
      const posAt = (u) => { let s = u * L; for (const q of segs) { if (s <= q.s0 + q.l) { const f = (s - q.s0) / q.l; return [q.a[0] + (q.b[0] - q.a[0]) * f, q.a[1] + (q.b[1] - q.a[1]) * f]; } } return pts[0]; };
      // 입자 흐름: 실내 코일(왼쪽 위쪽 구간)에서 기화, 실외 코일(오른쪽)에서 액화
      const N = 46;
      for (let i = 0; i < N; i++) {
        const u = (i / N + t * 0.05) % 1, q = posAt(u);
        // u: 0~0.06 실내기 위(88,118→..) 구간은 아래로 내려가며 기화
        let gas;                                           // 0 액체 ... 1 기체
        if (u < 0.2) gas = smooth(u / 0.2);                 // 실내 코일에서 점점 기체로
        else if (u < 0.43) gas = 1;                         // 압축기 → 실외 코일까지 기체
        else if (u < 0.62) gas = 1 - smooth((u - 0.43) / 0.19);   // 실외 코일에서 액체로
        else gas = 0;
        const show = gas < 0.5 || i % 2 === 0 ? 1 : 0.0;
        if (!show) continue;
        const a = gas > 0.5 ? 0.55 + 0.3 * (1 - gas) : 1;
        drawBall(c, gas > 0.5 ? '#a78bfa' : '#3b82f6', q[0], q[1], gas > 0.5 ? 4.6 : 4.6, a);
      }
      // 압축기
      d.sphere(150, 236, 15, '#64748b', { gloss: true }); d.text(150, 262, '압축기', { size: 13, weight: 800, color: COL.muted });
      // 열의 출입
      waveArrow(c, 34, 150, 78, 150, t, '#e2464b', 4.5, 1);
      waveArrow(c, 34, 176, 78, 176, t + 0.4, '#e2464b', 4.5, 1);
      tag(c, 72, 218, '🔥 열 흡수(기화)', '#e2464b');
      waveArrow(c, 276, 172, 318, 172, t, '#2f7de1', 4.5, 1);
      waveArrow(c, 276, 126, 318, 126, t + 0.4, '#2f7de1', 4.5, 1);
      tag(c, 256, 64, '❄️ 열 방출(액화)', '#2f7de1');
    },
  };

  /* 5. 스팀 난방 : 액화 → 열 방출 */
  SCN.steam = {
    title: '스팀 난방', dur: 6.5,
    draw(c, d, p, t) {
      vgrad(c, 0, 0, SW, SH, '#fff7ea', '#ffe9d0');
      vgrad(c, 0, 232, SW, 48, '#c9a06a', '#a97f4a');
      c.fillStyle = 'rgba(255,255,255,.65)'; D2rr(c, 232, 40, 86, 110, 8); c.fill(); c.strokeStyle = '#8a97ab'; c.lineWidth = 3; D2rr(c, 232, 40, 86, 110, 8); c.stroke();
      // 방 온도계
      c.fillStyle = '#fff'; D2rr(c, 278, 62, 28, 74, 12); c.fill();
      const T = lerp(16, 23, smooth(seg(p, 0.2, 1)));
      c.fillStyle = '#e2464b'; D2rr(c, 288, 126 - (T - 14) * 6.2, 8, (T - 14) * 6.2 + 6, 4); c.fill();
      c.font = '800 14px ui-monospace, Menlo, monospace'; c.fillStyle = '#9a3412'; c.textAlign = 'center'; c.fillText(T.toFixed(0) + '°C', 262, 100);
      // 라디에이터
      const rx = 24, ry = 100, rw = 168, rh = 126;
      softShadowC(c, rx, ry, rw, rh, 10);
      for (let i = 0; i < 6; i++) { const g = c.createLinearGradient(0, ry, 0, ry + rh); g.addColorStop(0, '#ff9a7a'); g.addColorStop(1, '#e2603f'); c.fillStyle = g; D2rr(c, rx + 6 + i * 26, ry, 22, rh, 8); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(rx + 10 + i * 26, ry + 8, 4, rh - 18); }
      c.fillStyle = '#7b8798'; D2rr(c, rx - 10, ry + 20, 18, 16, 4); c.fill(); D2rr(c, rx - 10, ry + rh - 36, 18, 16, 4); c.fill();
      c.strokeStyle = '#a3afc0'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(rx - 4, ry + 28); c.lineTo(-10, ry + 28); c.moveTo(rx - 4, ry + rh - 28); c.lineTo(-10, ry + rh - 28); c.stroke();
      // 증기(입자) → 물방울로
      for (let i = 0; i < 16; i++) {
        const u = ((t * 0.18 + i / 16) % 1), x = lerp(0, rw + 10, u), y = ry + 28 + u * (rh - 56) * 0.9 + Math.sin(i * 5 + t * 3) * 6;
        const gas = 1 - smooth(seg(u, 0.25, 0.75));
        drawBall(c, gas > 0.5 ? '#a78bfa' : '#3b82f6', rx + 6 + x * 0.96, y, gas > 0.5 ? 5 : 5.6, gas > 0.5 ? 0.6 : 1);
      }
      // 열 방출 화살표
      const ak = smooth(seg(p, 0.12, 0.25));
      [128, 164, 200].forEach((y, i) => waveArrow(c, rx + rw + 6, y, rx + rw + 52, y - 6, t + i * 0.4, '#f26b3a', 4.5, ak));
      tag(c, 120, 60, '🔥 열 방출', '#e2464b');
      miniMorph(c, 232, 164, 96, 76, 'gas', 'liq', p, t, COL.water, '기체 → 액체');
    },
  };

  const SCN_LIST = [
    { id: 'igloo', icon: '⛺', label: '이글루 안에 물 뿌리기', short: '이글루', ans: 'release', cap: '이글루 안에 뿌린 물이 얼면서 안쪽이 조금 따뜻해져요.' },
    { id: 'sweat', icon: '😓', label: '땀이 마르기', short: '땀이 마름', ans: 'absorb', cap: '땀이 마르면서 몸이 시원해져요.' },
    { id: 'icebox', icon: '🧊', label: '아이스박스의 얼음', short: '아이스박스', ans: 'absorb', cap: '아이스박스의 얼음이 녹으면서 음료가 시원하게 유지돼요.' },
    { id: 'aircon', icon: '❄️', label: '에어컨 실내기의 냉매', short: '에어컨', ans: 'absorb', cap: '에어컨 냉매가 실내에서 기화하고 실외에서 액화하며 순환해요.' },
    { id: 'steam', icon: '♨️', label: '스팀 난방', short: '스팀 난방', ans: 'release', cap: '수증기가 라디에이터에서 물로 변하면서 방이 따뜻해져요.' },
  ];
  const SCN_BY = {}; SCN_LIST.forEach((o) => (SCN_BY[o.id] = o));
  const THUMB = {};
  function buildThumbs() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * 2;
    const tw = 90, th = 62;
    SCN_LIST.forEach((o) => {
      const cv = document.createElement('canvas');
      cv.width = Math.round(tw * dpr); cv.height = Math.round(th * dpr);
      const c = cv.getContext('2d');
      c.scale(cv.width / SW, cv.width / SW);
      c.translate(0, -22);
      c.beginPath(); c.rect(0, 22, SW, 234); c.clip();
      SCN[o.id].draw(c, SciSim.draw(c), 0.55, 1.4);
      THUMB[o.id] = cv;
    });
  }

  /* ---------- 장면 보기 창 + 카드 + 상자 ---------- */
  const B4 = { cards: [], bins: [], solved: false, hover: null, cols: PHONE ? { after: 1, n: 2 } : null, pillH: 44 };
  const VWR = { id: 'igloo', t: 0 };
  function initB4() {
    B4.bins = LAY.bins4.map((b) => Object.assign({}, b, { hdr: PHONE ? 46 : 56 }));
    const T4 = LAY.tray4;
    B4.cards = SCN_LIST.map((o, i) => {
      const col = i % T4.cols, row = (i / T4.cols) | 0;
      const x = T4.x + T4.w / 2 + col * (T4.w + T4.gap), y = T4.y + T4.h / 2 + row * (T4.h + T4.rg);
      return new Card({ id: o.id, kind: 'scn', icon: o.icon, label: o.label, short: o.short, ans: o.ans, w: T4.w, h: T4.h, x, y, hx: x, hy: y });
    });
    B4.solved = false;
    B4.cards.forEach((c) => { c.sel = c.id === VWR.id ? 1 : 0; });
  }
  function setViewer(id) {
    B4.cards.forEach((c) => SciSim.tween(c, { sel: c.id === id ? 1 : 0 }, { duration: 0.2 }));
    VWR.id = id; VWR.t = 0;
  }
  function updateViewer(dt) { VWR.t += dt; }
  function drawViewer() {
    const v = LAY.viewer, sc = SCN[VWR.id], cyc = sc.dur + 1.5;
    const T = VWR.t % cyc, p = clamp(T / sc.dur, 0, 1);
    ctx.save();
    panel(v.x, v.y, v.w, v.h, 16, '#fff', 16, 5, 'rgba(30,50,100,.22)');
    ctx.beginPath(); D.roundRect(v.x, v.y, v.w, v.h, 16); ctx.clip();
    ctx.translate(v.x, v.y); ctx.scale(v.w / SW, v.h / SH);
    sc.draw(ctx, D, p, VWR.t);
    const fa = Math.max(1 - T / 0.3, (T - (cyc - 0.35)) / 0.35, 0);
    if (fa > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, fa) + ')'; ctx.fillRect(0, 0, SW, SH); }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(139,92,246,.35)'; ctx.lineWidth = 2; D.roundRect(v.x, v.y, v.w, v.h, 16); ctx.stroke();
    pill(v.x + 10, v.y + 18, SCN_BY[VWR.id].icon + ' ' + sc.title, { bg: 'rgba(27,35,51,.82)', size: 13.5, align: 'left', pad: 10 });
    ctx.fillStyle = 'rgba(27,35,51,.16)'; D.roundRect(v.x + 12, v.y + v.h - 12, v.w - 24, 5, 3); ctx.fill();
    ctx.fillStyle = COL.sub; D.roundRect(v.x + 12, v.y + v.h - 12, Math.max(5, (v.w - 24) * p), 5, 3); ctx.fill();
    ctx.restore();
  }
  function drawScnCard(c) {
    cardBody(c, c.w, c.h);
    const th = THUMB[c.id];
    if (!PHONE) {
      if (th) ctx.drawImage(th, -c.w / 2 + 8, -c.h / 2 + 7, 90, 62);
      text(0, c.h / 2 - 8, c.short, { size: 13, weight: 800, color: COL.ink });
    } else {
      if (th) ctx.drawImage(th, -c.w / 2 + 6, -c.h / 2 + 6, 62, 46);
      text(-c.w / 2 + 72, 5, c.short, { size: 13.5, weight: 800, color: COL.ink, align: 'left' });
    }
    cardEnd(c, c.w, c.h);
  }
  function drawScnPill(c) {
    const { w, h } = pillBody(c, {});
    ctx.font = Math.min(22, h - 10) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    ctx.fillText(c.icon, -w / 2 + 22, 1);
    text(-w / 2 + 40, 5, c.short, { size: 14, weight: 800, color: COL.ink, align: 'left' });
    if (c.ok > 0) D.check(w / 2 - 13, 0, 8.5, 1);
    ctx.restore();
  }
  function drawLife(t) {
    drawBins(B4, t);
    drawViewer();
    const cp = LAY.cap;
    text(cp.x + cp.w / 2, cp.y + 23, SCN_BY[VWR.id].cap, { size: PHONE ? 13 : 14, weight: 700, color: COL.ink });
    const T4 = LAY.tray4;
    const rows = Math.ceil(SCN_LIST.length / T4.cols);
    ctx.fillStyle = 'rgba(139,92,246,.07)'; D.roundRect(T4.x - 8, T4.y - 8, T4.cols * T4.w + (T4.cols - 1) * T4.gap + 16, rows * T4.h + (rows - 1) * T4.rg + 16, 16); ctx.fill();
    const rest = B4.cards.filter((c) => c !== DR.card && !c.bin), placed = B4.cards.filter((c) => c !== DR.card && c.bin);
    rest.forEach(drawScnCard); placed.forEach(drawScnPill);
    if (DR.card && B4.cards.indexOf(DR.card) >= 0) { if (DR.card.bin) drawScnPill(DR.card); else drawScnCard(DR.card); }
  }
  function checkB4() {
    return judgeBoard(B4, (c) => c.bin === c.ans,
      (n) => '아직 상자에 넣지 않은 카드가 ' + n + '장 있어요. 다섯 장을 모두 넣어 보세요.',
      (n) => n + '장은 반대쪽 상자예요. 빨간 카드는 곧 돌아가요. 장면을 보고 열이 들어오는지 나가는지 생각해 보세요.');
  }

  /* =========================================================
     장면 전환 · 화면 요소 · 입력
     ========================================================= */
  const SCENES = {
    heat: { label: '🔥 가열 곡선 그리기', hint: '🔥 가열하기를 눌러 얼음을 가열해 보세요' },
    cool: { label: '❄️ 냉각 곡선 그리기', hint: '❄️ 식히기를 눌러 뜨거운 액체를 식혀 보세요' },
    flow: { label: '↔️ 열에너지의 출입', hint: '👆 화살표를 눌러 열의 출입을 보고, 카드를 상자에 넣어요' },
    life: { label: '🏠 생활 속 열에너지', hint: '🃏 카드를 눌러 장면을 보고, 알맞은 상자에 넣어요' },
  };
  const hintEl = $('#stageHint');
  function showHint(t, ms) { hintEl.textContent = t; hintEl.classList.remove('hide'); clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5200); }
  function hideHint() { hintEl.classList.add('hide'); }
  const ready = {};
  const runOf = () => (S.scene === 'heat' ? RUN.heat : S.scene === 'cool' ? RUN.cool : null);
  function resetScene(name) {
    FX.clear(); AFX.clear();
    if (name === 'heat') resetRun(RUN.heat);
    else if (name === 'cool') resetRun(RUN.cool);
    else if (name === 'flow') { initB3(); popIn(B3.cards); TH.arrow = null; TH.phase = 'idle'; TH.reveal = 0; TH.fade = 1; TH.lvl = 0.5; TH.box.reset(1); }
    else if (name === 'life') { initB4(); popIn(B4.cards); setViewer(VWR.id || 'igloo'); }
    ready[name] = true;
  }
  function setScene(name, reset) {
    const changed = S.scene !== name;
    if (changed) { DR.card = null; B3.hover = null; B4.hover = null; const R0 = runOf(); if (R0) R0.on = false; }
    S.scene = name;
    if (changed) { S.sceneT = 0; FX.clear(); AFX.clear(); }
    if (reset || !ready[name]) resetScene(name);
    $('#tbLabel').textContent = SCENES[name].label;
    if (changed || reset) showHint(SCENES[name].hint, 6500);
    refreshUI();
  }
  let lastFree = null;
  function refreshUI() {
    $$('[data-sc]').forEach((node) => {
      const scs = node.getAttribute('data-sc').split(/\s+/), need = node.getAttribute('data-need');
      node.hidden = !(scs.indexOf(S.scene) >= 0 && (!need || on(need)));
    });
    const card = $('#ctrlCard');
    card.hidden = !card.querySelector('.control:not([hidden])');
    const ro = $('#readouts');
    ro.hidden = !ro.querySelector('.readout:not([hidden])');
    const free = !!(game && game.free);
    $('#sceneSeg').hidden = !free;
    $('#tbLabel').hidden = free && window.innerWidth < 1000;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    const R = runOf();
    if (R) {
      const heat = R.key === 'heat', rb = $('#runBtn');
      rb.textContent = R.done ? '↺ 처음부터 다시' : R.on ? '⏸ 멈추기' : R.t > 0 ? '▶ 계속하기' : heat ? '🔥 가열하기' : '❄️ 식히기';
      rb.classList.toggle('btn-primary', !R.on);
      $('#fastBtn').setAttribute('aria-pressed', R.fast ? 'true' : 'false');
      $('#runNote').textContent = heat ? '−20 °C의 얼음을 일정한 세기의 불로 가열해요. 1분이 약 1초로 빠르게 재생돼요.' : '80 °C의 액체 팔미트산을 찬물 수조에서 식혀요. 1분이 약 1초로 빠르게 재생돼요.';
    }
    lastFree = free;
  }
  function toggleRun() {
    const R = runOf();
    if (!R) return;
    hideHint();
    if (R.done) { resetRun(R); AFX.clear(); Sound.click(); refreshUI(); return; }
    R.on = !R.on; Sound.click(); refreshUI();
  }
  $('#runBtn').addEventListener('click', toggleRun);
  $('#fastBtn').addEventListener('click', () => { const R = runOf(); if (!R) return; Sound.click(); R.fast = !R.fast; RUN.heat.fast = RUN.cool.fast = R.fast; refreshUI(); });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); resetScene(S.scene); S.sceneT = 0; showHint(SCENES[S.scene].hint, 5000); refreshUI(); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));

  /* ---------- 캔버스 입력 ---------- */
  function boardOf() { return S.scene === 'flow' ? B3 : S.scene === 'life' ? B4 : null; }
  function snapBack(B, c) { if (c.bin) layoutBoard(B, true); else goto(c, c.hx, c.hy, 1, 0.34); }
  SciSim.pointer(view, {
    hover(p) {
      const B = boardOf();
      if (B) { const c = cardAt(B.cards, p); if (c) return c.locked ? 'pointer' : 'grab'; }
      if (S.scene === 'flow') return arrowHit(p) ? 'pointer' : null;
      if (S.scene === 'life') return inRect(p, LAY.viewer) ? 'pointer' : null;
      if (runOf()) return inRect(p, LAY.app) ? 'pointer' : null;
      return null;
    },
    down(p) {
      hideHint();
      const B = boardOf();
      if (B) {
        const c = cardAt(B.cards, p);
        if (c) {
          if (S.scene === 'life') setViewer(c.id);
          if (c.locked || c.bad > 0) return false;
          DR.card = c; DR.board = B; DR.offX = p.x - c.x; DR.offY = p.y - c.y; DR.sx = p.x; DR.sy = p.y; DR.moved = false;
          SciSim.tween(c, { lift: 1 }, { duration: 0.15 });
          B.cards.splice(B.cards.indexOf(c), 1); B.cards.push(c);
          Sound.click();
          return true;
        }
      }
      if (S.scene === 'flow') { const a = arrowHit(p); if (a) playArrow(a.id); }
      else if (S.scene === 'life') { if (inRect(p, LAY.viewer)) { VWR.t = 0; Sound.click(); } }
      else if (runOf() && inRect(p, LAY.app)) toggleRun();
      return false;
    },
    move(p) {
      const c = DR.card;
      if (!c) return;
      if (Math.hypot(p.x - DR.sx, p.y - DR.sy) > 7) DR.moved = true;
      if (!DR.moved) return;
      c.x = clamp(p.x - DR.offX, 20, VW - 20); c.y = clamp(p.y - DR.offY, 20, VH - 20);
      DR.board.hover = binAtP(DR.board, p);
    },
    up(p) {
      const c = DR.card;
      if (!c) return;
      const B = DR.board;
      DR.card = null; DR.board = null; B.hover = null;
      SciSim.tween(c, { lift: 0 }, { duration: 0.2 });
      if (!DR.moved) { if (S.scene === 'life') setViewer(c.id); snapBack(B, c); return; }
      const bin = binAtP(B, p);
      if (bin) placeInBin(B, c, bin); else { c.bin = null; layoutBoard(B, true); goto(c, c.hx, c.hy, 1, 0.38); }
    },
  });
  view.canvas.style.touchAction = 'pan-y';
  view.canvas.addEventListener('touchstart', (e) => {
    const tc = e.touches[0];
    if (!tc) return;
    const p = view.toLocal(tc), B = boardOf();
    if (B && cardAt(B.cards, p)) e.preventDefault();
  }, { passive: false });
  if (!PHONE) view.canvas.style.touchAction = 'none';

  /* =========================================================
     갱신 · 그리기 · 루프
     ========================================================= */
  function allCards() { return [].concat(B3.cards, B4.cards); }
  function update(dt) {
    S.sceneT += dt;
    FX.update(dt); AFX.update(dt);
    allCards().forEach((c) => {
      if (c.bad > 0) {
        c.bad -= dt;
        if (c.bad <= 0) { c.bad = 0; if (!c.ok) { returnCard(c); layoutBoard(c.kind === 'chg' ? B3 : B4, true); } }
      }
    });
    if (S.scene === 'heat' || S.scene === 'cool') { const R = runOf(); updateRun(R, dt); if (R.key === 'heat') emitHeatFX(R, dt); }
    else if (S.scene === 'flow') { updateTheater(dt); for (const k in NODEBOX) NODEBOX[k].step(dt); }
    else if (S.scene === 'life') updateViewer(dt);
  }
  let lastDt = 0.016;
  function draw(t) {
    view.clear(BG);
    if (S.scene === 'heat' || S.scene === 'cool') {
      const R = runOf();
      if (R.key === 'heat') drawHeatApp(R, t); else drawCoolApp(R, t);
      AFX.draw(ctx);
      drawGraph(R, t); drawRunLens(R, t); drawEnergy(R, t);
    } else if (S.scene === 'flow') drawFlow(t);
    else if (S.scene === 'life') drawLife(t);
    FX.draw(ctx);
    drawChecks(lastDt);
    if ((S.scene === 'heat' && isNew('heat')) || (S.scene === 'cool' && isNew('cool'))) ringRect(LAY.graph, t);
    if (S.scene === 'flow' && isNew('flow')) ringRect(PHONE ? LAY.bins3[0] : LAY.th, t);
    if (S.scene === 'life' && isNew('life')) ringRect(LAY.viewer, t);
    if (S.sceneT < 0.35) { ctx.save(); ctx.globalAlpha = 1 - ease.outCubic(S.sceneT / 0.35); ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH); ctx.restore(); }
  }
  let lastPhase = '', lastIdx = -1;
  function watchGame() {
    if (!game) return;
    const ph = game.phase, idx = game.index;
    if (ph === 'success' && (lastPhase !== 'success' || lastIdx !== idx)) {
      const m = game.current();
      if (m && m.onWin) { try { m.onWin(); } catch (e) { console.error(e); } }
    }
    lastPhase = ph; lastIdx = idx;
  }
  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    if (lastFree !== !!(game && game.free)) refreshUI();
    const R = runOf();
    if (!R) return;
    const m = Math.floor(R.t), s = R.t;
    $('#rT').innerHTML = Math.round(R.st.T) + '<small>°C</small>';
    $('#rTime').innerHTML = R.t.toFixed(1) + '<small>분</small>';
    $('#rState').textContent = phaseWord(R);
  }

  /* ---------- 시작 준비 ---------- */
  RUN.heat = makeRun('heat'); RUN.cool = makeRun('cool');
  RUN.heat.box.reset(0); RUN.cool.box.reset(1);
  syncBox(RUN.heat, 0); syncBox(RUN.cool, 0);
  buildThumbs(); initNodes(); initTheater(); initB3(); initB4();

  /* =========================================================
     미션
     ========================================================= */
  const mark = (b) => (b ? '✅' : '⬜');

  // 퀴즈 그림: 팔미트산의 냉각 곡선 (구간 ㉠ ㉡ ㉢)
  const FIG_COOL = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 168" width="320" role="img" aria-label="액체를 식힐 때의 냉각 곡선: 내려가다가(㉠) 수평(㉡) 다시 내려간다(㉢)">' +
    '<rect x="0" y="0" width="320" height="168" rx="12" fill="#f6f9ff"/>' +
    '<path d="M40 24 V132 H300" fill="none" stroke="#5d6879" stroke-width="2"/>' +
    '<text x="12" y="22" font-size="12" font-weight="700" fill="#5d6879">온도</text><text x="272" y="152" font-size="12" font-weight="700" fill="#5d6879">시간</text>' +
    '<rect x="100" y="30" width="100" height="98" fill="#8b5cf6" opacity=".10"/>' +
    '<path d="M44 38 L100 74 L200 74 L292 118" fill="none" stroke="#2f7de1" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<g font-size="20" font-weight="800" text-anchor="middle" fill="#1b2333"><text x="64" y="102">㉠</text><text x="150" y="106">㉡</text><text x="250" y="108">㉢</text></g>' +
    '<g font-size="13" font-weight="700" text-anchor="middle" fill="#5d6879"><text x="64" y="121">내려감</text><text x="150" y="125">일정</text><text x="250" y="127">내려감</text></g></svg>';

  const PH_NAMES = [['ice', '🧊 고체'], ['melt', '🔄 융해'], ['water', '💧 액체'], ['boil', '♨️ 기화'], ['steam', '☁️ 기체']];
  const heatStatus = () => {
    const R = RUN.heat;
    return '지금 <b>' + Math.round(R.st.T) + ' °C</b> · ' + PH_NAMES.map((q) => (passed(R, q[0]) ? '✅' : R.st.id === q[0] && R.t > 0 ? '▶️' : '⬜') + q[1]).join(' → ');
  };
  const coolStatus = () => {
    const R = RUN.cool;
    const P = [['liq', '액체 식히기'], ['frz', '응고(수평)'], ['sol', '고체 식히기']];
    return '지금 <b>' + Math.round(R.st.T) + ' °C</b> · ' + P.map((q) => (passed(R, q[0]) ? '✅' : R.st.id === q[0] && R.t > 0 ? '▶️' : '⬜') + q[1]).join(' → ');
  };

  game = SciSim.game({
    simId: 'm1-state-change-heat',
    mount: '#game',
    badge: '열에너지 탐정',
    homeHref: '../../index.html#g1',
    featureLabels: {
      heat: '🔥 가열 장치와 시간–온도 그래프',
      lens: '🔍 입자 모형',
      cool: '❄️ 냉각 장치와 냉각 곡선',
      flow: '↔️ 열에너지 출입 관찰과 분류 상자',
      life: '🏠 생활 속 장면과 분류 상자',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onMissionStart(m) {
      if (game && game.free) return;
      if (m.scene) setScene(m.scene, false);
      if (m.view && S.scene === 'life') setViewer(m.view);
      refreshUI();
    },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '가열 곡선: 얼음을 계속 가열하면?', short: '가열 곡선', icon: '🔥', phase: '실험',
        features: ['heat', 'lens'],
        intro: '<p class="si-q">❓ 탐구 질문: 얼음을 계속 가열하면 온도는 계속 올라갈까?</p>' +
          '<p>−20 °C의 얼음을 <b>일정한 세기</b>로 가열하면서 시간에 따른 온도를 그래프로 그려 봐요. 온도가 어떻게 변하는지, 입자는 어떻게 달라지는지 🔍 <b>입자 모형</b>으로 살펴봐요.</p>',
        setup() { setScene('heat', true); },
        recap: '얼음을 가열하면 온도가 올라가다가 <b>0 °C</b>(융해)와 <b>100 °C</b>(기화)에서 온도가 일정한 <b>수평 구간</b>이 나타나요. 이때 가한 열은 상태를 바꾸는 데 쓰여요.',
        summary: '<ul><li>얼음을 일정하게 가열하면 온도가 올라가다가, 상태가 변하는 동안(융해·기화)에는 온도가 <b>일정</b>하다. (그래프의 수평 구간)</li>' +
          '<li>수평 구간에서도 열은 계속 공급되고, 이 열은 입자의 <b>배열을 바꾸는</b>(상태를 바꾸는) 데 쓰인다.</li>' +
          '<li>상태 변화가 모두 끝나면 다시 온도가 올라간다.</li></ul>' +
          '<p class="note">※ 여기서는 ‘상태 변화가 일어나는 온도’만 다뤄요. 녹는점·끓는점은 ‘물질의 특성’에서 자세히 배워요.</p>',
        missions: [
          {
            title: '수증기가 될 때까지 가열하기', scene: 'heat',
            goal: '불을 켜고 얼음이 <b>모두 수증기가 될 때까지</b> 가열하세요. 그래프의 모양과 🔍 입자 모형을 관찰해요.',
            hint: '<b>🔥 가열하기</b>를 눌러 시작해요. 오래 걸리면 <b>⏩ 빠르게</b>를 켜 보세요. 온도가 변하지 않는 구간에 주목해요!',
            setup() { resetRun(RUN.heat); AFX.clear(); },
            check: () => passed(RUN.heat, 'boil'),
            hold: 0.6,
            onWin() { celebrate(PHONE ? 296 : 520, PHONE ? 150 : 150); },
            status: heatStatus,
            explain: '얼음이 녹는 동안(0 °C)과 물이 끓는 동안(100 °C)에는 계속 가열해도 온도가 올라가지 않고 <b>수평한 구간</b>이 나타났어요. 🔍 입자 모형에서는 이때 입자의 <b>배열</b>이 바뀌고 있었어요.',
          },
          {
            type: 'quiz', title: '수평 구간에서 일어나는 일', scene: 'heat',
            setup() { if (!RUN.heat.done && !passed(RUN.heat, 'boil')) finishRun(RUN.heat); },
            goal: '그래프에서 온도가 변하지 않는 수평 구간(0 °C, 100 °C)에서, 가한 열은 어디에 쓰일까요?',
            choices: ['불꽃이 약해져서 열이 공급되지 않는다', '공급된 열이 상태를 바꾸는 데 (입자의 배열을 바꾸는 데) 쓰인다', '입자의 운동이 멈춘다', '열이 물질 밖으로 모두 빠져나간다'],
            answer: 1,
            feedback: ['불꽃의 세기와 열을 주는 화살표는 그대로였어요. 열은 계속 공급돼요.', '', '🔍 입자 모형에서 입자는 계속 움직였어요. 입자의 운동이 멈추지는 않아요.', '열은 계속 물질로 들어와요. 밖으로 빠져나가는 것이 아니에요.'],
            explain: '수평 구간에서도 열은 계속 공급돼요. 이 열이 입자 사이의 배열을 바꾸는 <b>상태 변화</b>에 쓰이기 때문에 입자의 운동이 더 빨라지지 않고 <b>온도가 일정</b>해요.',
          },
        ],
      },
      {
        title: '냉각 곡선: 액체를 식히면?', short: '냉각 곡선', icon: '❄️', phase: '실험',
        features: ['cool'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 가열하는 동안 상태가 변할 때 온도가 일정했어요.</div>' +
          '<p>이번에는 80 °C의 액체 <b>팔미트산</b>을 찬물 수조에서 식히며 <b>냉각 곡선</b>을 그려요. 액체가 굳는(응고) 동안 온도는 어떻게 될까요?</p>',
        setup() { setScene('cool', true); },
        recap: '액체를 식히면 온도가 내려가다가 <b>응고</b>하는 동안 온도가 일정해요(수평 구간). 응고할 때 물질은 <b>열에너지를 방출</b>해요.',
        summary: '<ul><li>액체를 식히면 온도가 내려가다가, 응고하는 동안에는 온도가 <b>일정</b>하다. (냉각 곡선의 수평 구간)</li>' +
          '<li>응고할 때 입자가 규칙적으로 배열되면서 <b>열에너지를 방출</b>한다. 이 열 때문에 온도가 내려가지 않는다.</li>' +
          '<li>응고가 모두 끝난 뒤에야 고체의 온도가 다시 내려간다.</li></ul>',
        missions: [
          {
            title: '냉각 곡선 그리기', scene: 'cool',
            goal: '식히기를 시작해서 팔미트산이 <b>모두 굳은 뒤 30 °C</b>가 될 때까지 냉각 곡선을 완성하세요.',
            hint: '<b>❄️ 식히기</b>를 눌러 시작해요. 시험관 속 팔미트산이 하얗게 굳는 모습과 🔍 입자 모형을 함께 보세요.',
            setup() { resetRun(RUN.cool); AFX.clear(); },
            check: () => RUN.cool.done,
            hold: 0.6,
            onWin() { celebrate(PHONE ? 296 : 520, PHONE ? 150 : 150); },
            status: coolStatus,
            explain: '액체의 온도가 내려가다가 응고하는 동안(약 63 °C)에는 온도가 일정한 <b>수평 구간</b>이 나타났어요. 모두 굳은 뒤에야 고체의 온도가 다시 내려갔어요.',
          },
          {
            type: 'quiz', title: '응고하는 동안 온도가 일정한 까닭', scene: 'cool',
            setup() { if (!RUN.cool.done) finishRun(RUN.cool); },
            goal: '액체가 응고하는 동안 계속 식히는데도 온도가 내려가지 않는 까닭은 무엇일까요?',
            choices: ['열이 더 이상 빠져나가지 않기 때문이다', '응고하면서 열에너지를 방출하여 온도가 내려가는 것을 막기 때문이다', '입자가 움직임을 멈추기 때문이다', '찬물이 팔미트산에 열을 주기 때문이다'],
            answer: 1,
            feedback: ['열은 계속 수조의 찬물로 빠져나갔어요. 화살표가 계속 나가고 있었어요.', '', '🔍 입자 모형에서 입자는 계속 움직였어요. 운동이 멈추는 것은 아니에요.', '열은 따뜻한 팔미트산에서 차가운 물로 이동해요. 반대가 아니에요.'],
            explain: '응고할 때 입자가 규칙적으로 배열되면서 <b>열에너지를 방출</b>해요. 방출된 열이 식으면서 잃는 열을 채워 주어서 응고하는 동안 <b>온도가 일정</b>해요.',
          },
          {
            type: 'quiz', title: '냉각 곡선 읽기', scene: 'cool',
            setup() { if (!RUN.cool.done) finishRun(RUN.cool); },
            goal: '다음 냉각 곡선에서 물질이 <b>응고하고 있는 구간</b>은 어느 곳일까요?',
            figure: FIG_COOL,
            choices: ['㉠ (온도가 내려가는 구간)', '㉡ (온도가 일정한 구간)', '㉢ (온도가 내려가는 구간)', '㉠과 ㉢'],
            answer: 1,
            feedback: ['㉠은 아직 모두 액체인 구간이에요. 이때는 식으면서 온도가 내려가요.', '', '㉢은 모두 굳은 뒤 고체의 온도가 내려가는 구간이에요.', '㉠과 ㉢에서는 상태가 변하지 않고 온도만 내려가요.'],
            explain: '냉각 곡선에서 <b>온도가 일정한 수평 구간(㉡)</b>이 응고가 일어나는 구간이에요. ㉠은 액체, ㉢은 고체의 온도가 내려가는 구간이에요.',
          },
        ],
      },
      {
        title: '상태 변화와 열에너지의 출입', short: '열 출입', icon: '↔️', phase: '설명',
        features: ['flow'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 가열할 때는 열이 들어오고, 식힐 때는 열이 나가는 것을 봤어요.</div>' +
          '<p>여섯 가지 상태 변화를 <b>열을 흡수하는 변화</b>와 <b>열을 방출하는 변화</b>로 나눠요. 화살표를 눌러 열에너지가 들어오는지 나가는지 관찰한 뒤 카드를 상자에 넣어요.</p>',
        setup() { setScene('flow', true); },
        recap: '<b>융해 · 기화 · 승화(고체 → 기체)</b>는 열을 <b>흡수</b>하고, <b>응고 · 액화 · 승화(기체 → 고체)</b>는 열을 <b>방출</b>해요.',
        summary: '<ul><li><b>열을 흡수</b>하는 변화: 융해, 기화, 승화(고체 → 기체). 입자 사이가 멀어지는 변화예요.</li>' +
          '<li><b>열을 방출</b>하는 변화: 응고, 액화, 승화(기체 → 고체). 입자 사이가 가까워지는 변화예요.</li>' +
          '<li>상태가 변하는 동안 출입하는 열에너지는 입자의 배열을 바꾸는 데 쓰여서 온도가 일정하다.</li></ul>',
        missions: [
          {
            title: '열 흡수? 열 방출?', scene: 'flow', manual: true,
            goal: '화살표를 눌러 열의 출입을 관찰하고, 상태 변화 카드 6장을 <b>🔥 열 흡수</b>와 <b>❄️ 열 방출</b> 상자에 나누어 넣은 뒤 <b>✔ 확인하기</b>를 누르세요.',
            hint: '입자 사이가 <b>멀어지는</b> 변화(고체 → 액체 → 기체 방향)는 열을 흡수하고, <b>가까워지는</b> 변화는 열을 방출해요.',
            setup() { TH.watched = {}; if (B3.solved) { initB3(); popIn(B3.cards); } },
            check: () => checkB3(),
            onWin() { B3.solved = true; B3.cards.forEach((c) => { c.ok = 1; c.locked = true; }); ARROWS.forEach((a, i) => setTimeout(() => FX.burst(a.slot.cx, a.slot.cy, { count: 10, speed: 120, life: 0.7, size: 3.5, colors: [CLS[a.cls].col, '#ffffff'] }), i * 90)); celebrate(PHONE ? 220 : 230, PHONE ? 520 : 282); },
            status: () => '상자에 넣은 카드 <b>' + B3.cards.filter((c) => c.bin).length + ' / 6</b> · 열의 출입을 본 화살표 <b>' + watchedCount() + ' / 6</b>',
            explain: '융해·기화·승화(고체 → 기체)는 입자 사이가 멀어지므로 열을 <b>흡수</b>하고, 응고·액화·승화(기체 → 고체)는 입자 사이가 가까워지므로 열을 <b>방출</b>해요.',
          },
          {
            type: 'quiz', title: '손바닥 위의 얼음', scene: 'flow',
            goal: '손바닥에 얼음을 올려 두면 얼음이 녹으면서 손이 차가워져요. 열은 어느 쪽으로 이동했을까요?',
            choices: ['얼음에서 손으로', '손에서 얼음으로 (얼음이 융해하며 열을 흡수한다)', '열은 이동하지 않는다', '손과 얼음 사이를 왔다 갔다 한다'],
            answer: 1,
            feedback: ['얼음이 녹는 것은 열을 흡수하는 변화예요. 얼음이 열을 내보내는 게 아니에요.', '', '얼음이 녹으려면 열이 필요해요. 열이 이동해서 얼음이 녹는 거예요.', '열은 따뜻한 손에서 차가운 얼음 쪽으로 이동해요.'],
            explain: '얼음이 녹는 <b>융해</b>는 열을 <b>흡수</b>하는 변화예요. 손의 열이 얼음으로 이동해서 얼음은 녹고, 손은 열을 잃어 차갑게 느껴져요.',
          },
          {
            type: 'quiz', title: '드라이아이스와 주변', scene: 'flow',
            goal: '드라이아이스가 승화(고체 → 기체)하는 동안 주변 공기는 어떻게 될까요?',
            choices: ['열을 방출하므로 주변이 따뜻해진다', '열을 흡수하므로 주변이 차가워진다', '열의 출입이 없어 변화가 없다', '승화는 열과 관계가 없다'],
            answer: 1,
            feedback: ['승화(고체 → 기체)는 입자 사이가 멀어지는 변화예요. 멀어지려면 열이 필요해요.', '', '상태가 변할 때는 언제나 열이 들어오거나 나가요.', '상태 변화는 열에너지의 출입과 관계가 깊어요.'],
            explain: '승화(고체 → 기체)는 열을 <b>흡수</b>해요. 주변 공기의 열을 가져가므로 주변이 차가워져요. 그래서 드라이아이스를 아이스크림 포장에 넣어 차갑게 유지해요.',
          },
        ],
      },
      {
        title: '생활 속 열에너지의 출입', short: '생활 적용', icon: '🏠', phase: '적용',
        features: ['life'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 상태 변화를 열을 흡수하는 변화와 방출하는 변화로 나눴어요.</div>' +
          '<p>생활 속 다섯 장면에서 열이 들어오고 나가는 모습을 살펴보고, 상태 변화와 <b>열에너지의 출입</b>으로 설명해 봐요.</p>',
        setup() { setScene('life', true); },
        recap: '상태 변화로 열을 <b>흡수</b>하면 주변이 시원해지고, 열을 <b>방출</b>하면 주변이 따뜻해져요. 우리는 이것을 생활에 이용해요.',
        summary: '<ul><li><b>이글루</b>: 안에 뿌린 물이 얼 때(응고) 열을 방출해서 안이 조금 따뜻해진다.</li>' +
          '<li><b>땀</b>: 땀이 마를 때(기화) 몸의 열을 흡수해서 시원해진다.</li>' +
          '<li><b>아이스박스</b>: 얼음이 녹을 때(융해) 열을 흡수해서 음식과 음료가 시원하게 유지된다.</li>' +
          '<li><b>에어컨</b>: 냉매가 실내에서 기화하며 열을 흡수하고, 실외에서 액화하며 열을 방출한다.</li>' +
          '<li><b>스팀 난방</b>: 수증기가 액화하며 열을 방출해서 방이 따뜻해진다.</li></ul>',
        missions: [
          {
            title: '열을 흡수할까, 방출할까?', scene: 'life', view: 'igloo', manual: true,
            goal: '장면 카드를 눌러 살펴보고, <b>🔥 열 흡수</b>와 <b>❄️ 열 방출</b> 상자에 알맞게 넣은 뒤 <b>✔ 확인하기</b>를 누르세요.',
            hint: '물질이 <b>열을 받으면</b> 흡수, <b>열을 내보내면</b> 방출이에요. 장면 속 화살표가 물질로 들어가는지 나오는지 보세요.',
            setup() { if (B4.solved) { initB4(); popIn(B4.cards); } },
            check: () => checkB4(),
            onWin() { B4.solved = true; B4.cards.forEach((c) => { c.ok = 1; c.locked = true; }); LAY.bins4.forEach((b, i) => setTimeout(() => FX.burst(b.x + b.w / 2, b.y + 70, { count: 12, speed: 130, life: 0.8, size: 3.5, colors: [CLS[b.id].col, '#ffffff'] }), i * 120)); celebrate(VW / 2, PHONE ? 330 : 250); },
            status: () => '상자에 넣은 카드 <b>' + B4.cards.filter((c) => c.bin).length + ' / 5</b>',
            explain: '이글루 안의 물이 얼 때와 수증기가 액화할 때는 열을 <b>방출</b>해서 주변이 따뜻해져요. 땀이 마를 때, 얼음이 녹을 때, 냉매가 기화할 때는 열을 <b>흡수</b>해서 주변이 시원해져요.',
          },
          {
            type: 'quiz', title: '이글루 안의 물', scene: 'life', view: 'igloo',
            goal: '이글루 안에 물을 뿌려 두면 안이 조금 따뜻해져요. 그 까닭은 무엇일까요?',
            choices: ['물이 얼면서(응고) 열을 방출하기 때문이다', '물이 증발하면서 열을 방출하기 때문이다', '물이 얼면서 열을 흡수하기 때문이다', '물이 얼음 벽을 녹이기 때문이다'],
            answer: 0,
            feedback: ['', '증발(기화)은 열을 흡수하는 변화예요. 물이 증발하면 오히려 시원해져요.', '물이 얼 때(응고)는 열을 내보내요. 열을 받는 변화는 융해예요.', '이글루 안은 영하라서 얼음 벽이 녹지 않아요. 물이 어는 것이 핵심이에요.'],
            explain: '물이 얼 때(응고) 입자가 규칙적으로 배열되면서 <b>열에너지를 방출</b>해요. 그 열이 이글루 안의 공기로 전달되어 안이 조금 따뜻해져요.',
          },
          {
            type: 'quiz', title: '땀이 마를 때', scene: 'life', view: 'sweat',
            goal: '운동 후 땀이 마르면 몸이 시원해져요. 그 까닭은 무엇일까요?',
            choices: ['땀이 기화하면서 몸의 열을 흡수하기 때문이다', '땀이 기화하면서 열을 방출하기 때문이다', '땀이 액화하면서 열을 흡수하기 때문이다', '땀이 얼면서 열을 방출하기 때문이다'],
            answer: 0,
            feedback: ['', '땀이 마르는 것(기화)은 열을 흡수하는 변화예요. 방출하면 오히려 따뜻해져요.', '땀이 마르는 것은 액체 → 기체인 기화예요. 액화는 반대 방향이에요.', '땀이 얼지는 않아요. 액체가 기체로 변하는 기화가 일어나요.'],
            explain: '땀이 마르는 것은 액체가 기체로 변하는 <b>기화</b>예요. 기화할 때 몸에서 <b>열을 흡수</b>하기 때문에 몸이 시원해져요.',
          },
        ],
      },
    ],
  });

  refreshUI();
  SciSim.loop((dt, t) => {
    lastDt = dt;
    update(dt);
    draw(now());
    updateReadouts(t);
    watchGame();
  });

  /* ---------- 점검용 (자동 테스트) ---------- */
  window.__sim = {
    get scene() { return S.scene; },
    setScene,
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / VW, y: r.top + (y * r.height) / VH }; },
    state() {
      const R = runOf();
      return {
        scene: S.scene, run: R ? { key: R.key, t: R.t, on: R.on, done: R.done, T: R.st.T, id: R.st.id, counts: R.box.counts() } : null,
        th: { arrow: TH.arrow, phase: TH.phase, watched: Object.keys(TH.watched).length },
        cards3: B3.cards.map((c) => ({ id: c.id, label: c.label, bin: c.bin, ok: c.ok, x: Math.round(c.x), y: Math.round(c.y) })),
        cards4: B4.cards.map((c) => ({ id: c.id, bin: c.bin, ok: c.ok, x: Math.round(c.x), y: Math.round(c.y) })), viewer: VWR.id,
      };
    },
    seek(key, t) { const R = RUN[key]; setScene(key); R.t = t; R.on = false; updateRun(R, 0.0001); for (let i = 0; i < 160; i++) updateRun(R, 1 / 60); },
    seekViewer(id, p) { setScene('life'); setViewer(id); VWR.t = p * SCN[id].dur; },
    watchAll() { ARROWS.forEach((a) => (TH.watched[a.id] = true)); },
    solveFlow() { B3.cards.forEach((c) => { c.bin = c.ans; c.order = ++placeInBin.n; }); layoutBoard(B3, false); },
    solveLife() { B4.cards.forEach((c) => { c.bin = c.ans; c.order = ++placeInBin.n; }); layoutBoard(B4, false); },
    bench(n) { const t0 = performance.now(); let mx = 0; for (let i = 0; i < n; i++) { const a = performance.now(); update(1 / 60); draw(now()); mx = Math.max(mx, performance.now() - a); } return { avg: (performance.now() - t0) / n, max: mx }; },
    S, B3, B4, TH, RUN, ARROWS, LAY, PBox, D,
  };
})();
