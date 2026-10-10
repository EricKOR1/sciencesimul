/* =========================================================
   중1 Ⅳ. 물질의 상태 변화 — 상태 변화와 입자 배열 [9과04-03]
   ① [관찰] 생활 속 상태 변화 6장면 → 어떤 상태에서 어떤 상태로? (화살표에 카드 놓기)
   ② [탐구] 화살표를 눌러 입자 배열이 바뀌는 모습을 보고 6가지 상태 변화의 이름 붙이기
   ③ [실험] 전자저울 위 밀폐 용기: 양초·물·에탄올의 질량과 부피 (🔍 입자 모형)
   ④ [적용] 생활 속 현상 7가지를 상태 변화의 이름으로 분류
   ※ 가열·냉각 곡선과 열에너지의 출입은 다음 차시(상태 변화와 열에너지)에서 다룸
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

  /* ---------- 화면 (태블릿 = 가로형 800×560, 휴대폰 = 세로형 440×700) ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 440 : 800, VH = PHONE ? 700 : 560;
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
    sol: '#5b7fb5', liq: '#2f7de1', gas: '#8b5cf6',
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
      const pad = Math.ceil(blur * 1.5) + 2, OFF = W + pad;      // 모양을 그림 밖(왼쪽)에 그리고 그림자만 안으로 들여옴
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
    speed(st) { const T = this.therm; return st === 1 ? this.vl * (1 + 1.6 * T) : st >= 2 ? this.vg * (1 + T) : 0; }
    amp() { return 0.6 + 2.4 * this.therm; }
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
     ① 관찰 장면 6가지 (가상 좌표 340 × 280). p: 0(처음) → 1(나중), t: 시간(초)
     ========================================================= */
  const SW = 340, SH = 280;
  const VFX = new SciSim.Particles();      // 관찰 창 안의 물방울·김·안개
  const SCN = {};

  function tableTop(c, y, top, bot) {
    vgrad(c, 0, y, SW, SH - y, top, bot);
    c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(0, y, SW, 3);
  }
  function ellipse(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }

  /* 1. 얼음 녹기 : 고체 → 액체 */
  SCN.ice = {
    title: '얼음 녹기', dur: 6,
    draw(c, d, p, t) {
      vgrad(c, 0, 0, SW, SH, '#fff9ef', '#ffe9cb');
      d.glow(304, 22, 150, '#ffd98a', 0.6);
      tableTop(c, 218, '#e8c796', '#d1a56d');
      const pp = smooth(seg(p, 0.04, 0.96));
      // 접시
      c.fillStyle = 'rgba(70,40,10,.22)'; ellipse(c, 172, 246, 134, 14); c.fill();
      let g = c.createLinearGradient(0, 214, 0, 250); g.addColorStop(0, '#fbfcff'); g.addColorStop(1, '#cfd8e6');
      c.fillStyle = g; ellipse(c, 170, 232, 128, 22); c.fill();
      c.fillStyle = '#e8edf6'; ellipse(c, 170, 230, 104, 15); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; ellipse(c, 170, 230, 104, 15); c.stroke();
      // 녹은 물
      const pr = 14 + 96 * pp, pr2 = 3 + 11 * pp;
      g = c.createRadialGradient(150, 226, 4, 170, 230, pr);
      g.addColorStop(0, 'rgba(190,225,255,.85)'); g.addColorStop(1, 'rgba(110,185,250,.55)');
      c.fillStyle = g; ellipse(c, 170, 230, pr, pr2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.6;
      c.beginPath(); c.ellipse(170, 230, pr * 0.82, pr2 * 0.7, 0, Math.PI * 1.05, Math.PI * 1.55); c.stroke();
      const rip = (t * 0.7) % 1;                                    // 물결
      if (pp > 0.08) { c.strokeStyle = 'rgba(255,255,255,' + (0.55 * (1 - rip)) + ')'; c.lineWidth = 1.5; ellipse(c, 170, 230, pr * (0.4 + 0.55 * rip), pr2 * (0.4 + 0.55 * rip)); c.stroke(); }
      // 얼음 조각
      const w = 100 * (1 - 0.82 * Math.pow(pp, 0.85)), h = w * 0.94, base = 228;
      if (w > 4) {
        const x0 = 170 - w / 2, y0 = base - h, dd = w * 0.28, rr = 5 + 16 * pp;
        c.save();
        c.globalAlpha = 1 - 0.12 * pp;
        // 윗면
        c.fillStyle = 'rgba(232,247,255,.96)';
        c.beginPath(); c.moveTo(x0 + rr * 0.6, y0); c.lineTo(x0 + dd + rr * 0.6, y0 - dd * 0.7); c.lineTo(x0 + w + dd - rr * 0.6, y0 - dd * 0.7); c.lineTo(x0 + w - rr * 0.6, y0); c.closePath(); c.fill();
        // 오른쪽 면
        c.fillStyle = 'rgba(150,205,245,.92)';
        c.beginPath(); c.moveTo(x0 + w, y0); c.lineTo(x0 + w + dd - rr * 0.5, y0 - dd * 0.7 + rr * 0.3); c.lineTo(x0 + w + dd - rr * 0.5, base - dd * 0.7 - rr * 0.3); c.lineTo(x0 + w, base); c.closePath(); c.fill();
        // 앞면
        g = c.createLinearGradient(x0, y0, x0 + w, base);
        g.addColorStop(0, 'rgba(210,240,255,.97)'); g.addColorStop(1, 'rgba(140,200,245,.95)');
        c.fillStyle = g; d.roundRect(x0, y0, w, h, rr); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2; d.roundRect(x0, y0, w, h, rr); c.stroke();
        // 반사광 · 기포
        c.fillStyle = 'rgba(255,255,255,.55)';
        c.beginPath(); c.moveTo(x0 + w * 0.14, y0 + h * 0.1); c.lineTo(x0 + w * 0.32, y0 + h * 0.1); c.lineTo(x0 + w * 0.14, y0 + h * 0.42); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,.7)';
        circle(c, x0 + w * 0.66, y0 + h * 0.62, Math.max(1, w * 0.035)); c.fill();
        circle(c, x0 + w * 0.5, y0 + h * 0.34, Math.max(1, w * 0.025)); c.fill();
        circle(c, x0 + w * 0.78, y0 + h * 0.28, Math.max(1, w * 0.02)); c.fill();
        c.restore();
      }
    },
    emit(fx, dt, p, t) {
      if (p > 0.1 && p < 0.92 && Math.random() < dt * 5) {
        const w = 100 * (1 - 0.82 * Math.pow(smooth(seg(p, 0.04, 0.96)), 0.85));
        const side = Math.random() < 0.5 ? -1 : 1;
        fx.emit({ x: 170 + side * w * 0.5, y: 228, vx: side * rand(4, 16), vy: -rand(10, 30), gravity: 260, life: 0.5, size: rand(1.6, 2.6), color: 'rgba(130,200,255,.9)', fade: true });
      }
    },
  };

  /* 2. 촛농 굳기 : 액체 → 고체 */
  SCN.wax = {
    title: '촛농 굳기', dur: 6.5,
    draw(c, d, p, t) {
      vgrad(c, 0, 0, SW, SH, '#2b2447', '#4b3a68');
      d.glow(170, 100, 140, '#ffb14a', 0.5 + Math.sin(t * 9) * 0.04);
      vgrad(c, 0, 238, SW, 42, '#3a2f55', '#291f40');
      c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, 238, SW, 2);
      // 촛대 받침
      let g = c.createLinearGradient(0, 230, 0, 250); g.addColorStop(0, '#f1c566'); g.addColorStop(1, '#a8761f');
      c.fillStyle = g; ellipse(c, 170, 238, 70, 12); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; ellipse(c, 170, 235, 56, 7); c.fill();
      // 양초 몸통
      g = c.createLinearGradient(138, 0, 202, 0);
      g.addColorStop(0, '#f2dfb3'); g.addColorStop(0.35, '#fff7e2'); g.addColorStop(1, '#e3c98f');
      c.fillStyle = g; d.roundRect(140, 108, 60, 128, 5); c.fill();
      // 드립 (흘러내림)
      const drips = [{ x: 148, s: 0.0, len: 82, w: 9 }, { x: 190, s: 0.14, len: 64, w: 8 }, { x: 168, s: 0.26, len: 104, w: 10 }, { x: 156, s: 0.4, len: 48, w: 7 }];
      drips.forEach((dr) => {
        const gr = seg(p, dr.s, dr.s + 0.4), L = dr.len * ease.outQuad(gr);
        if (gr <= 0) return;
        const hard = seg(p, dr.s + 0.3, dr.s + 0.82);
        const top = mix('#ffc94f', '#f7ebc4', clamp(hard * 1.9, 0, 1)), bot = mix('#ffc94f', '#f7ebc4', clamp(hard * 1.9 - 0.9, 0, 1));
        const y0 = 112, y1 = 112 + L;
        const lg = c.createLinearGradient(0, y0, 0, y1 + 8); lg.addColorStop(0, top); lg.addColorStop(1, bot);
        c.strokeStyle = 'rgba(150,100,30,.35)'; c.lineWidth = dr.w + 2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(dr.x, y0); c.lineTo(dr.x, y1); c.stroke();
        c.strokeStyle = lg; c.lineWidth = dr.w;
        c.beginPath(); c.moveTo(dr.x, y0); c.lineTo(dr.x, y1); c.stroke();
        const br = dr.w * (0.62 + 0.14 * (1 - hard));
        c.fillStyle = 'rgba(150,100,30,.35)'; circle(c, dr.x, y1, br + 1); c.fill();
        c.fillStyle = bot; circle(c, dr.x, y1, br); c.fill();
        if (hard < 0.9) { c.fillStyle = 'rgba(255,255,255,' + (0.65 * (1 - hard)) + ')'; c.fillRect(dr.x - dr.w * 0.32, y0 + 2, 2, Math.max(2, L - 8)); circle(c, dr.x - br * 0.3, y1 - br * 0.3, br * 0.28); c.fill(); }
      });
      // 위쪽 녹은 촛농 웅덩이
      g = c.createLinearGradient(0, 100, 0, 116); g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#f6b93b');
      c.fillStyle = g; ellipse(c, 170, 109, 32, 8); c.fill();
      c.fillStyle = 'rgba(255,255,255,.6)'; ellipse(c, 160, 106, 10, 2.4); c.fill();
      // 심지 · 불꽃
      c.strokeStyle = '#3a2a22'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(170, 108); c.lineTo(170, 94); c.stroke();
      d.flame(170, 96, 44, t);
    },
    emit() {},
  };

  /* 3. 끓는 물 · 마르는 빨래 : 액체 → 기체 */
  SCN.boil = {
    title: '물 끓기 · 빨래 마르기', dur: 6.5,
    draw(c, d, p, t) {
      vgrad(c, 0, 0, SW, SH, '#f2f7ff', '#e2ecfa');
      // 왼쪽: 끓는 물
      c.fillStyle = 'rgba(255,255,255,.7)'; d.roundRect(8, 10, 160, 262, 16); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; d.roundRect(176, 10, 156, 262, 16); c.fill();
      d.label(88, 56, '끓는 물', { bg: '#e2464b', size: 13 });
      d.label(254, 56, '마르는 빨래', { bg: '#0ea5e9', size: 13 });
      // 가스레인지
      c.fillStyle = '#4b5565'; d.roundRect(26, 236, 124, 24, 8); c.fill();
      c.fillStyle = '#6b7689'; c.fillRect(34, 232, 108, 6);
      c.fillStyle = '#9aa5b6'; circle(c, 132, 250, 5); c.fill();
      d.flame(88, 232, 30 * (1 - 0.15 * p), t, { glow: '#ff9a3d' });
      // 유리 냄비 (물 높이가 줄어듦)
      const lv = 0.74 - 0.24 * smooth(seg(p, 0.1, 1));
      d.beaker(32, 110, 112, 112, { level: lv, liquid: '#7cc4ff', t, wave: 1.6 + 2.2 * smooth(seg(p, 0, 0.3)), glass: '#8fa3bd' });
      c.fillStyle = '#6b7689'; d.roundRect(26, 106, 124, 7, 3); c.fill();
      // 오른쪽: 빨래
      const dry = smooth(seg(p, 0.08, 0.96));
      c.save(); c.translate(0, 26);
      c.strokeStyle = '#8b6b4a'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(186, 62); c.lineTo(322, 62); c.stroke();
      const shirt = () => {
        c.beginPath();
        c.moveTo(236, 66); c.quadraticCurveTo(254, 78, 272, 66);       // 목
        c.lineTo(302, 80); c.lineTo(318, 118); c.lineTo(296, 128); c.lineTo(284, 108);
        c.lineTo(284, 206); c.lineTo(224, 206); c.lineTo(224, 108);
        c.lineTo(212, 128); c.lineTo(190, 118); c.lineTo(206, 80); c.closePath();
      };
      c.save();
      shirt(); c.fillStyle = mix('#5f93c8', '#e1eefb', dry); c.fill();
      c.clip();
      // 젖은 부분(아래부터 마름)
      const wetTop = lerp(70, 210, smooth(seg(p, 0.12, 0.95)));
      const g = c.createLinearGradient(0, wetTop, 0, wetTop + 24);
      g.addColorStop(0, 'rgba(46,92,150,.0)'); g.addColorStop(1, 'rgba(46,92,150,' + (0.42 * (1 - dry * 0.6)) + ')');
      c.fillStyle = g; c.fillRect(180, wetTop, 150, 220 - wetTop);
      c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(230, 70, 8, 130);
      c.restore();
      shirt(); c.strokeStyle = rgba('#3b6aa0', 0.55); c.lineWidth = 2; c.stroke();
      c.fillStyle = '#e2464b'; d.roundRect(226, 56, 6, 12, 2); c.fill(); d.roundRect(276, 56, 6, 12, 2); c.fill();
      // 물방울(젖었을 때 떨어짐)
      for (let i = 0; i < 3; i++) {
        const a = (1 - dry) * 0.9; if (a < 0.05) break;
        const yy = 208 + ((t * 46 + i * 31) % 46), xx = 238 + i * 20;
        c.fillStyle = 'rgba(95,168,245,' + (a * (1 - (yy - 208) / 46)) + ')'; circle(c, xx, yy, 2.6); c.fill();
      }
      c.restore();
    },
    emit(fx, dt, p, t) {
      // 끓는 물: 거품 + 김
      if (p > 0.05) {
        if (Math.random() < dt * 22) fx.emit({ x: rand(44, 130), y: 214, vx: rand(-6, 6), vy: -rand(70, 110), life: rand(0.55, 0.85), size: rand(2.4, 4.6), color: '#ffffff', shape: 'bubble', fade: true });
        if (Math.random() < dt * 9) fx.emit({ x: rand(52, 124), y: 118, vx: rand(-8, 8), vy: -rand(26, 46), life: rand(1.3, 2.0), size: rand(8, 14), grow: 14, color: 'rgba(235,242,252,.9)', shape: 'smoke', fade: true });
      }
      // 빨래에서 올라가는 수증기
      if (p > 0.15 && Math.random() < dt * 5) fx.emit({ x: rand(200, 300), y: rand(146, 226), vx: rand(-4, 4), vy: -rand(18, 30), life: rand(1.3, 1.9), size: rand(5, 8), grow: 6, color: 'rgba(120,175,230,.5)', shape: 'smoke', fade: true });
    },
  };

  /* 4. 차가운 컵 겉면의 물방울 : 기체 → 액체 */
  const CUP_DROPS = (function () {
    let s = 41; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const a = [];
    for (let i = 0; i < 38; i++) a.push({ x: 0.1 + r() * 0.8, y: 0.06 + r() * 0.86, b: 0.04 + r() * 0.62, r: 2 + r() * 2.8, run: r() < 0.16, sl: 20 + r() * 40 });
    return a;
  })();
  SCN.cup = {
    title: '차가운 컵의 물방울', dur: 6.5,
    draw(c, d, p, t) {
      vgrad(c, 0, 0, SW, SH, '#e9f3ff', '#fbfdff');
      tableTop(c, 232, '#e6cfaa', '#cfae80');
      c.fillStyle = 'rgba(60,40,10,.2)'; ellipse(c, 172, 240, 70, 9); c.fill();
      const gx0 = 126, gx1 = 218, gy0 = 84, gy1 = 236, tw = 78;
      const glass = () => { c.beginPath(); c.moveTo(gx0, gy0); c.lineTo(gx0 + (92 - tw) / 2 + 2, gy1 - 8); c.quadraticCurveTo(gx0 + (92 - tw) / 2 + 3, gy1, gx0 + 16, gy1); c.lineTo(gx1 - 16, gy1); c.quadraticCurveTo(gx1 - 3, gy1, gx1 - 2 - (92 - tw) / 2, gy1 - 8); c.lineTo(gx1, gy0); };
      // 음료
      c.save(); glass(); c.closePath(); c.clip();
      vgrad(c, gx0, 112, 100, 130, 'rgba(255,196,110,.9)', 'rgba(255,150,52,.95)');
      c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(gx0, 112, 100, 3);
      [[150, 130, 26], [188, 142, 24], [166, 168, 26]].forEach((q, i) => {      // 얼음
        const bob = Math.sin(t * 1.6 + i * 2) * 1.6;
        c.fillStyle = 'rgba(235,248,255,.8)'; d.roundRect(q[0] - q[2] / 2, q[1] + bob - q[2] / 2, q[2], q[2], 6); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 1.5; d.roundRect(q[0] - q[2] / 2, q[1] + bob - q[2] / 2, q[2], q[2], 6); c.stroke();
      });
      c.restore();
      // 빨대
      c.strokeStyle = '#e2464b'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(196, 56); c.lineTo(170, 214); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.setLineDash([6, 9]); c.beginPath(); c.moveTo(196, 56); c.lineTo(170, 214); c.stroke(); c.setLineDash([]);
      // 유리 겉
      glass(); c.strokeStyle = 'rgba(120,150,190,.85)'; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke();
      // 서리(뿌옇게)
      c.save(); glass(); c.closePath(); c.clip();
      c.fillStyle = 'rgba(255,255,255,' + (0.34 * smooth(seg(p, 0.05, 0.7))) + ')'; c.fillRect(gx0, gy0, 100, 160);
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(gx0 + 8, gy0 + 12, 7, 120);
      // 물방울
      CUP_DROPS.forEach((q) => {
        const g1 = seg(p, q.b, q.b + 0.18); if (g1 <= 0) return;
        const r = q.r * ease.outBack(g1);
        let x = gx0 + 6 + q.x * 88, y = gy0 + 8 + q.y * 130;
        if (q.run) { const k = seg(p, 0.55, 0.98); y += q.sl * smooth(k); if (k > 0) { c.strokeStyle = 'rgba(150,200,245,.5)'; c.lineWidth = r * 0.9; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y - q.sl * smooth(k)); c.lineTo(x, y); c.stroke(); } }
        c.fillStyle = 'rgba(205,232,255,.82)'; circle(c, x, y, r); c.fill();
        c.strokeStyle = 'rgba(30,90,170,.9)'; c.lineWidth = 1.3; circle(c, x, y, r); c.stroke();
        c.strokeStyle = 'rgba(30,90,170,.55)'; c.lineWidth = 1.1; c.beginPath(); c.arc(x, y, r * 0.62, 0.2, 1.7); c.stroke();
        c.fillStyle = 'rgba(255,255,255,1)'; circle(c, x - r * 0.34, y - r * 0.38, Math.max(0.8, r * 0.34)); c.fill();
      });
      c.restore();
      // 받침 접시에 고인 물
      c.fillStyle = 'rgba(120,180,240,' + (0.55 * seg(p, 0.6, 1)) + ')'; ellipse(c, 172, 238, 20 + 40 * seg(p, 0.6, 1), 4); c.fill();
    },
    emit() {},
  };

  /* 5. 드라이아이스 : 고체 → 기체 */
  SCN.dry = {
    title: '드라이아이스', dur: 7,
    draw(c, d, p, t) {
      vgrad(c, 0, 0, SW, SH, '#22314b', '#3c5273');
      d.glow(170, 150, 170, '#bcd8ff', 0.18);
      tableTop(c, 232, '#58708f', '#44597a');
      // 쟁반
      let g = c.createLinearGradient(0, 214, 0, 252); g.addColorStop(0, '#dfe6ee'); g.addColorStop(1, '#8e9bad');
      c.fillStyle = 'rgba(0,0,0,.25)'; ellipse(c, 172, 248, 130, 14); c.fill();
      c.fillStyle = g; ellipse(c, 170, 236, 126, 20); c.fill();
      c.fillStyle = '#9aa7b8'; ellipse(c, 170, 235, 106, 14); c.fill();
      // 드라이아이스 덩어리 (점점 작아짐)
      const k = 1 - 0.8 * smooth(seg(p, 0.03, 0.98));
      const w = 116 * k, h = 62 * k, dd = 26 * k, x0 = 170 - w / 2 - dd / 2, base = 236;
      if (k > 0.05) {
        const y0 = base - h;
        c.fillStyle = '#f6fafe'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + dd, y0 - dd * 0.7); c.lineTo(x0 + w + dd, y0 - dd * 0.7); c.lineTo(x0 + w, y0); c.closePath(); c.fill();
        c.fillStyle = '#b7c5d6'; c.beginPath(); c.moveTo(x0 + w, y0); c.lineTo(x0 + w + dd, y0 - dd * 0.7); c.lineTo(x0 + w + dd, base - dd * 0.7); c.lineTo(x0 + w, base); c.closePath(); c.fill();
        g = c.createLinearGradient(x0, y0, x0 + w, base); g.addColorStop(0, '#eef3f9'); g.addColorStop(1, '#d1dce8');
        c.fillStyle = g; d.roundRect(x0, y0, w, h, 4); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5; d.roundRect(x0, y0, w, h, 4); c.stroke();
        let s = 91; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
        c.fillStyle = 'rgba(255,255,255,.75)';
        for (let i = 0; i < 16; i++) { circle(c, x0 + 4 + r() * (w - 8), y0 + 4 + r() * (h - 8), 0.8 + r() * 1.6 * k); c.fill(); }
        for (let i = 0; i < 4; i++) { const a = (t * 2.2 + i * 1.7) % 1; c.fillStyle = 'rgba(255,255,255,' + (0.9 * (1 - a)) + ')'; circle(c, x0 + 6 + r() * (w - 12), y0 - 2 - a * 12, 1.6); c.fill(); }
      }
    },
    emit(fx, dt, p, t) {
      const k = 1 - 0.8 * smooth(seg(p, 0.03, 0.98));
      if (k > 0.08 && Math.random() < dt * 46 * Math.max(0.35, k)) {
        const sx = Math.random() < 0.5 ? -1 : 1;
        fx.emit({ x: 170 + rand(-50, 50) * k, y: 236 - 54 * k, vx: sx * rand(10, 34), vy: rand(-6, 22), gravity: 24, drag: 0.7, life: rand(2.4, 3.4), size: rand(13, 24), grow: 9, color: 'rgba(240,248,255,.75)', shape: 'smoke', fade: true });
      }
    },
  };

  /* 6. 겨울 유리창의 성에 : 기체 → 고체 */
  const FROST = (function () {
    let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const segs = [];
    function branch(x, y, ang, len, depth, t0) {
      const dur = len / 120, x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      segs.push({ x1: x, y1: y, x2, y2, t0, t1: t0 + dur, depth });
      if (depth >= 3 || len < 9) return;
      const n = Math.max(1, Math.floor(len / 13));
      for (let i = 1; i <= n; i++) {
        const f = i / (n + 1), bx = x + (x2 - x) * f, by = y + (y2 - y) * f, tt = t0 + dur * f, l2 = len * (0.5 - f * 0.25);
        branch(bx, by, ang + 0.95 + r() * 0.2, l2, depth + 1, tt);
        branch(bx, by, ang - 0.95 - r() * 0.2, l2, depth + 1, tt);
      }
    }
    const X0 = 48, Y0 = 40, X1 = 292, Y1 = 246;
    for (let i = 0; i < 9; i++) branch(X0 + 14 + i * 27 + r() * 8, Y1, -Math.PI / 2 + (r() - 0.5) * 0.7, 70 + r() * 70, 0, r() * 0.25);
    for (let i = 0; i < 6; i++) { branch(X0, Y0 + 24 + i * 34 + r() * 8, (r() - 0.5) * 0.6, 56 + r() * 50, 0, r() * 0.3); branch(X1, Y0 + 24 + i * 34 + r() * 8, Math.PI + (r() - 0.5) * 0.6, 56 + r() * 50, 0, r() * 0.3); }
    for (let i = 0; i < 7; i++) branch(X0 + 22 + i * 34 + r() * 8, Y0, Math.PI / 2 + (r() - 0.5) * 0.7, 40 + r() * 50, 0, 0.1 + r() * 0.3);
    let mx = 0; segs.forEach((q) => { if (q.t1 > mx) mx = q.t1; });
    segs.forEach((q) => { q.t0 /= mx; q.t1 /= mx; });
    return { segs, X0, Y0, X1, Y1 };
  })();
  SCN.frost = {
    title: '겨울 유리창', dur: 7,
    draw(c, d, p, t) {
      const { X0, Y0, X1, Y1 } = FROST;
      vgrad(c, 0, 0, SW, SH, '#46618f', '#7da0cb');
      // 창틀
      c.fillStyle = '#8a5a35'; d.roundRect(24, 16, 292, 252, 10); c.fill();
      c.fillStyle = '#a8764b'; d.roundRect(30, 22, 280, 240, 7); c.fill();
      // 유리 안쪽 (바깥 풍경: 눈 내리는 저녁)
      c.save(); c.beginPath(); c.rect(X0, Y0, X1 - X0, Y1 - Y0); c.clip();
      vgrad(c, X0, Y0, X1 - X0, Y1 - Y0, '#2d4572', '#6f93c2');
      d.glow(236, 80, 90, '#e9f1ff', 0.28);
      for (let i = 0; i < 26; i++) {                                    // 눈송이
        const sx = X0 + ((i * 37.7 + t * (6 + (i % 4) * 3)) % (X1 - X0)), sy = Y0 + ((i * 53.3 + t * (14 + (i % 5) * 5)) % (Y1 - Y0));
        c.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.1 * (i % 4)) + ')'; circle(c, sx, sy, 1 + (i % 3) * 0.6); c.fill();
      }
      // 가장자리부터 뿌옇게
      const hz = 0.55 * smooth(seg(p, 0.05, 0.9));
      [[X0, Y0, 60, Y1 - Y0, 1, 0], [X1 - 60, Y0, 60, Y1 - Y0, -1, 0], [X0, Y1 - 60, X1 - X0, 60, 0, -1], [X0, Y0, X1 - X0, 40, 0, 1]].forEach((q) => {
        const gx = q[4] ? (q[4] > 0 ? q[0] : q[0] + q[2]) : q[0], gy = q[5] ? (q[5] < 0 ? q[1] + q[3] : q[1]) : q[1];
        const g = c.createLinearGradient(gx, gy, gx + (q[4] ? q[4] * q[2] : 0), gy + (q[5] ? q[5] * q[3] * (q[5] < 0 ? 1 : 1) : 0));
        g.addColorStop(0, 'rgba(235,245,255,' + hz + ')'); g.addColorStop(1, 'rgba(235,245,255,0)');
        c.fillStyle = g; c.fillRect(q[0], q[1], q[2], q[3]);
      });
      // 서릿발
      const W = [2.3, 1.7, 1.2, 0.8];
      for (let dpt = 0; dpt <= 3; dpt++) {
        c.strokeStyle = 'rgba(240,248,255,' + (0.95 - dpt * 0.12) + ')'; c.lineWidth = W[dpt]; c.lineCap = 'round';
        c.beginPath();
        for (const q of FROST.segs) {
          if (q.depth !== dpt || p <= q.t0 * 0.92 + 0.02) continue;
          const f = clamp((p - (q.t0 * 0.92 + 0.02)) / Math.max(0.001, (q.t1 - q.t0) * 0.92), 0, 1);
          c.moveTo(q.x1, q.y1); c.lineTo(q.x1 + (q.x2 - q.x1) * f, q.y1 + (q.y2 - q.y1) * f);
        }
        c.stroke();
      }
      c.restore();
      // 창살
      c.fillStyle = '#8a5a35'; c.fillRect(X0 - 2, 140, X1 - X0 + 4, 8); c.fillRect(166, Y0 - 2, 8, Y1 - Y0 + 4);
      c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(X0 - 2, 140, X1 - X0 + 4, 2); c.fillRect(166, Y0 - 2, 2, Y1 - Y0 + 4);
    },
    emit() {},
  };

  /* 관찰 카드 정보 */
  const OBS = [
    { id: 'ice', icon: '🧊', label: '얼음 녹기', slotLabel: '얼음 녹기', ans: 'melt', cap: '따뜻한 곳에 둔 얼음이 작아지고 물이 생겨요.' },
    { id: 'wax', icon: '🕯️', label: '촛농 굳기', slotLabel: '촛농 굳기', ans: 'freeze', cap: '촛불 옆에서 흘러내린 촛농이 점점 단단해져요.' },
    { id: 'boil', icon: '♨️', label: '끓는 물·마르는 빨래', slotLabel: '끓기·마르기', ans: 'vap', cap: '물이 끓어 줄어들고, 젖은 빨래는 마르고 있어요.' },
    { id: 'cup', icon: '🥤', label: '컵 겉면 물방울', slotLabel: '컵 물방울', ans: 'cond', cap: '차가운 음료가 든 컵 겉면에 물방울이 맺혀요.' },
    { id: 'dry', icon: '☁️', label: '드라이아이스', slotLabel: '드라이아이스', ans: 'sub1', cap: '드라이아이스가 점점 작아지고, 하얀 연기가 흘러내려요.' },
    { id: 'frost', icon: '❄️', label: '유리창 성에', slotLabel: '유리창 성에', ans: 'sub2', cap: '추운 겨울 유리창에 하얀 성에가 자라나요.' },
  ];
  const OBS_BY = {}; OBS.forEach((o) => (OBS_BY[o.id] = o));

  /* =========================================================
     상태 사다리: 고체 · 액체 · 기체 세 상자와 상태 변화 화살표 6개
     (태블릿: 세로 사다리 / 휴대폰: 화살표 타일 6개)
     ========================================================= */
  const ARROWS = [
    { id: 'melt',   from: 'sol', to: 'liq', name: '융해', pair: '고체 → 액체', ex: 'ice' },
    { id: 'freeze', from: 'liq', to: 'sol', name: '응고', pair: '액체 → 고체', ex: 'wax' },
    { id: 'vap',    from: 'liq', to: 'gas', name: '기화', pair: '액체 → 기체', ex: 'boil' },
    { id: 'cond',   from: 'gas', to: 'liq', name: '액화', pair: '기체 → 액체', ex: 'cup' },
    { id: 'sub1',   from: 'sol', to: 'gas', name: '승화', pair: '고체 → 기체', ex: 'dry' },
    { id: 'sub2',   from: 'gas', to: 'sol', name: '승화', pair: '기체 → 고체', ex: 'frost' },
  ];
  const AR = {}; ARROWS.forEach((a) => (AR[a.id] = a));
  const STATE = {
    sol: { name: '고체', col: '#5b7fb5', tint: '#e8f0fb', short: '배열 규칙적 · 거리 매우 가까움 · 제자리 진동' },
    liq: { name: '액체', col: '#2f7de1', tint: '#e6f1ff', short: '' },
    gas: { name: '기체', col: '#8b5cf6', tint: '#f1ebff', short: '' },
  };
  /* 세 상태의 입자 모형 특징 (배열 · 거리 · 운동) */
  const FEAT = {
    sol: { arr: '규칙적', dist: '매우 가까움', mov: '제자리 진동' },
    liq: { arr: '불규칙적', dist: '가까움', mov: '자리를 바꿔 이동' },
    gas: { arr: '매우 불규칙', dist: '매우 멂', mov: '빠르게 자유 이동' },
  };

  function makeLayout() {
    const L = {};
    if (!PHONE) {
      L.rx = 448; L.rw = 336;
      L.viewer = { x: 448, y: 22, w: 336, h: 276 };
      L.cap = { x: 448, y: 304, w: 336, h: 40 };
      L.trayCols = 3; L.cardW = 106; L.cardH = 88; L.trayGap = 9; L.trayX = 448; L.trayY = 352; L.trayRowGap = 8;
      L.theater = { x: 448, y: 22, w: 336, h: 214 };
      L.tcap = { x: 448, y: 242, w: 336, h: 104 };
      // 사다리
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
      L.ladderLabel = { x: 22, y: 548 };
      // 사다리 아래 이름표 칸 / 부피·질량 장면 / 분류 장면
      L.s3 = { macro: { x: 16, y: 16, w: 418, h: 378 }, lens: { x: 448, y: 22, w: 336, h: 250 }, info: { x: 448, y: 282, w: 336, h: 262 }, table: { x: 16, y: 402, w: 418, h: 142 } };
      L.s4 = { cardW: 176, cardH: 80, cardsY: 44, binY: 300, binH: 244, binW: 148, binGap: 10, binX: 10 };
    } else {
      L.rx = 20; L.rw = 400;
      L.viewer = { x: 40, y: 6, w: 360, h: 297 };
      L.cap = { x: 20, y: 306, w: 400, h: 40 };
      L.trayCols = 3; L.cardW = 128; L.cardH = 58; L.trayGap = 8; L.trayX = 20; L.trayY = 352; L.trayRowGap = 8;
      L.theater = { x: 20, y: 8, w: 400, h: 214 };
      L.tcap = { x: 20, y: 226, w: 400, h: 104 };
      L.tileY = 486; L.tileW = 196; L.tileH = 62; L.tileGap = 8; L.tileX = 20;
      L.arrows = {};
      const order = ['melt', 'freeze', 'vap', 'cond', 'sub1', 'sub2'];
      order.forEach((id, i) => {
        const col = i % 2, row = (i / 2) | 0;
        const x = L.tileX + col * (L.tileW + L.tileGap), y = L.tileY + row * (L.tileH + 6);
        L.arrows[id] = { tile: { x, y, w: L.tileW, h: L.tileH }, P: [x + 45, y + 31, x + 45, y + 31, x + 64, y + 31, x + 64, y + 31], slot: { cx: x + 148, cy: y + 31, w: 84, h: 50 } };
      });
      L.s3 = { macro: { x: 10, y: 8, w: 420, h: 318 }, lens: { x: 20, y: 332, w: 400, h: 208 }, info: { x: 20, y: 546, w: 400, h: 50 }, table: { x: 20, y: 600, w: 400, h: 92 } };
      L.s4 = { cardW: 192, cardH: 52, cardsY: 12, binY: 262, binH: 200, binW: 128, binGap: 8, binX: 12 };
    }
    return L;
  }
  const LAY = makeLayout();
  ARROWS.forEach((a) => {
    const g = LAY.arrows[a.id];
    a.P = g.P; a.slot = g.slot; a.tile = g.tile || null;
    let len = 0, prev = bezPt(a.P, 0);
    for (let i = 1; i <= 24; i++) { const q = bezPt(a.P, i / 24); len += Math.hypot(q.x - prev.x, q.y - prev.y); prev = q; }
    a.len = len;
    a.sr = { x: a.slot.cx - a.slot.w / 2, y: a.slot.cy - a.slot.h / 2, w: a.slot.w, h: a.slot.h };
  });
  function arrowHit(p) {                      // 화살표(또는 칸)를 눌렀는지
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
  function slotHit(p) {                       // 카드를 놓을 수 있는 칸 (끌어 놓기)
    let best = null, bd = 1e9;
    ARROWS.forEach((a) => {
      const r = a.sr;
      let d;
      if (a.tile) { d = inRect(p, a.tile, 6) ? Math.hypot(p.x - a.slot.cx, p.y - a.slot.cy) : 1e9; }
      else { const c = Math.hypot(p.x - a.slot.cx, p.y - a.slot.cy); d = inRect(p, r, 14) ? c : 1e9; if (d > 1e8) { for (let i = 0; i <= 20; i++) { const q = bezPt(a.P, i / 20); const dd = Math.hypot(q.x - p.x, q.y - p.y); if (dd < 22) d = Math.min(d, 40 + dd); } } }
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
  /* o: {color, width, flow(0~1 시간 위상 or -1), alpha, head} */
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

  /* ---------- 상자(고체·액체·기체) ---------- */
  function drawNodeFrame(r, key, o) {
    o = o || {};
    const st = STATE[key];
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
  /* 그림 아이콘(관찰 단계에서 세 상자에 들어가는 그림) */
  function macroIcon(key, r, t) {
    const cx = r.x + r.w / 2 + 6, cy = r.y + r.h / 2 + 8;
    ctx.save();
    ctx.beginPath(); D.roundRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 14); ctx.clip();
    vgrad(ctx, r.x, r.y, r.w, r.h, '#ffffff', STATE[key].tint);
    if (key === 'sol') {
      [[-26, 14, 40], [20, 18, 36], [-4, -14, 34]].forEach((q, i) => {
        const x = cx + q[0], y = cy + q[1], s = q[2];
        ctx.fillStyle = 'rgba(232,247,255,.98)'; ctx.beginPath(); ctx.moveTo(x - s / 2, y - s / 2); ctx.lineTo(x - s / 2 + 9, y - s / 2 - 8); ctx.lineTo(x + s / 2 + 9, y - s / 2 - 8); ctx.lineTo(x + s / 2, y - s / 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(145,200,245,.95)'; ctx.beginPath(); ctx.moveTo(x + s / 2, y - s / 2); ctx.lineTo(x + s / 2 + 9, y - s / 2 - 8); ctx.lineTo(x + s / 2 + 9, y + s / 2 - 8); ctx.lineTo(x + s / 2, y + s / 2); ctx.closePath(); ctx.fill();
        const g = ctx.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2); g.addColorStop(0, 'rgba(214,242,255,.98)'); g.addColorStop(1, 'rgba(150,205,248,.96)');
        ctx.fillStyle = g; D.roundRect(x - s / 2, y - s / 2, s, s, 5); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; D.roundRect(x - s / 2, y - s / 2, s, s, 5); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x - s / 2 + 5, y - s / 2 + 5, 7, s * 0.4);
      });
    } else if (key === 'liq') {
      D.beaker(cx - 30, cy - 34, 60, 62, { level: 0.64, liquid: '#7cc4ff', t, wave: 1.6 });
    } else {                                            // 수증기: 위로 오르며 퍼지는 물결
      for (let i = 0; i < 4; i++) {
        const x0 = cx - 39 + i * 26, al = 0.4 + 0.35 * Math.sin(t * 1.5 + i * 1.7);
        ctx.strokeStyle = 'rgba(139,92,246,' + al + ')'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let q = 0; q <= 52; q += 4) { const x = x0 + Math.sin(q * 0.18 - t * 2.4 + i) * 6, y = cy + 28 - q; if (q) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.stroke();
      }
      for (let i = 0; i < 3; i++) {
        const a = (t * 0.3 + i / 3) % 1;
        ctx.globalAlpha = Math.sin(a * Math.PI) * 0.8;
        D.glow(cx - 28 + i * 28 + Math.sin(t + i) * 5, cy + 22 - a * 58, 16, '#c4b5fd', 0.9);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /* ---------- 카드 ---------- */
  class Card {
    constructor(o) {
      Object.assign(this, { x: 0, y: 0, w: 106, h: 88, s: 1, lift: 0, hx: 0, hy: 0, slot: null, bin: null, locked: false, bad: 0, ok: 0, sel: 0, order: 0 }, o);
    }
    rect() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
  }
  function trayPos(i, n) {
    const cols = LAY.trayCols, col = i % cols, row = (i / cols) | 0;
    return { x: LAY.trayX + LAY.cardW / 2 + col * (LAY.cardW + LAY.trayGap), y: LAY.trayY + LAY.cardH / 2 + row * (LAY.cardH + LAY.trayRowGap) };
  }
  function goto(c, x, y, s, dur, ez) {
    SciSim.tween(c, { x, y, s: s != null ? s : 1 }, { duration: dur != null ? dur : 0.38, ease: ez || 'outBack' });
  }
  /* 카드 그리기 공통 틀 */
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
  /* 관찰 카드 (그림 + 이름) */
  function drawObsCard(c) {
    const o = OBS_BY[c.id];
    cardBody(c, c.w, c.h);
    if (!PHONE) {
      const th = THUMB[c.id];
      if (th) ctx.drawImage(th, -c.w / 2 + 8, -c.h / 2 + 7, 90, 62);
      text(0, c.h / 2 - 8, o.label.length > 8 ? '끓는 물·빨래' : o.label, { size: 13, weight: 800, color: COL.ink });
    } else {
      const th = THUMB[c.id];
      if (th) ctx.drawImage(th, -c.w / 2 + 6, -c.h / 2 + 6, 62, 46);
      ctx.save(); ctx.font = D.font(13, 800); ctx.fillStyle = COL.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const lab = o.id === 'boil' ? ['끓는 물·', '마르는 빨래'] : o.id === 'cup' ? ['컵 겉면', '물방울'] : o.id === 'dry' ? ['드라이', '아이스'] : o.id === 'frost' ? ['유리창', '성에'] : o.id === 'ice' ? ['얼음', '녹기'] : ['촛농', '굳기'];
      ctx.fillText(lab[0], -c.w / 2 + 72, -8); ctx.fillText(lab[1], -c.w / 2 + 72, 9);
      ctx.restore();
    }
    cardEnd(c, c.w, c.h);
  }
  /* 이름 카드 */
  function drawNameCard(c) {
    cardBody(c, c.w, c.h, { fill: '#f7f2ff' });
    text(0, PHONE ? 7 : 8, c.label, { size: PHONE ? 24 : 28, weight: 800, color: '#5b21b6' });
    if (!PHONE) text(0, 30, c.hint, { size: 13, weight: 700, color: COL.muted });
    cardEnd(c, c.w, c.h);
  }
  /* 칸 안에 놓인 카드: 작은 알약 모양 */
  function drawSlotCard(c, a) {
    const w = a.slot.w - 8, h = a.slot.h - 6;
    cardBody(c, w, h, { r: 12, fill: c.kind === 'name' ? '#f7f2ff' : '#fff' });
    if (c.kind === 'name') text(0, 8, c.label, { size: 22, weight: 800, color: '#5b21b6' });
    else {
      const o = OBS_BY[c.id];
      ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
      ctx.fillText(o.icon, 0, -9);
      text(0, 14, o.slotLabel, { size: 13, weight: 800, color: COL.ink });
    }
    cardEnd(c, w, h);
  }

  /* ---------- 썸네일 (관찰 장면의 한 장면을 작게) ---------- */
  const THUMB = {};
  function buildThumbs() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * 2;
    const tw = 90, th = 62;
    OBS.forEach((o) => {
      const cv = document.createElement('canvas');
      cv.width = Math.round(tw * dpr); cv.height = Math.round(th * dpr);
      const c = cv.getContext('2d');
      c.scale(cv.width / SW, cv.width / SW);
      c.translate(0, -22);
      c.beginPath(); c.rect(0, 22, SW, 234); c.clip();
      SCN[o.id].draw(c, SciSim.draw(c), o.id === 'ice' ? 0.5 : o.id === 'boil' ? 0.5 : o.id === 'frost' ? 0.62 : 0.55, 1.2);
      THUMB[o.id] = cv;
    });
  }

  /* =========================================================
     장면 상태 · ① 관찰 · ② 6가지 이름
     ========================================================= */
  const S = { scene: '', sceneT: 0, zoom: true, hoverArrow: null, nodeK: 0 };
  const KIND = { sol: 0, liq: 1, gas: 2 };
  const DR = { card: null, board: null, offX: 0, offY: 0, sx: 0, sy: 0, moved: false };

  function popIn(cards) {
    cards.forEach((c, i) => { c.s = RM ? 1 : 0.4; if (!RM) SciSim.tween(c, { s: 1 }, { duration: 0.45, delay: 0.05 * i, ease: 'outBack' }); });
  }
  function placeCard(board, c, aid) {
    const other = board.cards.find((o) => o !== c && o.slot === aid);
    if (other) { other.slot = null; other.ok = 0; other.bad = 0; goto(other, other.hx, other.hy, 1); }
    c.slot = aid; c.ok = 0; c.bad = 0;
    const a = AR[aid];
    goto(c, a.slot.cx, a.slot.cy, 1, 0.36);
    Sound.tone(660, 0.07, 'triangle', 0.06);
    FX.burst(a.slot.cx, a.slot.cy, { count: 10, speed: 90, life: 0.5, size: 3, gravity: 60, colors: [COL.sub, '#c4b5fd', '#ffffff'] });
  }
  function returnCard(c) { c.slot = null; c.bin = null; goto(c, c.hx, c.hy, 1, 0.4); }
  function cardAt(cards, p) {
    for (let i = cards.length - 1; i >= 0; i--) { if (inRect(p, cards[i].rect(), 3)) return cards[i]; }
    return null;
  }
  function slotCard(cards, aid) { return cards.find((c) => c.slot === aid) || null; }

  /* ---------- ① 관찰: 장면 카드 ---------- */
  const B1 = { cards: [], sel: 'ice', solved: false };
  const VWR = { id: 'ice', t: 0, watched: {} };
  function initB1() {
    B1.cards = OBS.map((o, i) => {
      const tp = trayPos(i);
      return new Card({ id: o.id, kind: 'obs', label: o.label, w: LAY.cardW, h: LAY.cardH, x: tp.x, y: tp.y, hx: tp.x, hy: tp.y });
    });
    B1.solved = false;
    B1.cards.forEach((c) => { c.sel = c.id === B1.sel ? 1 : 0; });
  }
  function setViewer(id) {
    B1.sel = id;
    B1.cards.forEach((c) => SciSim.tween(c, { sel: c.id === id ? 1 : 0 }, { duration: 0.2 }));
    if (VWR.id !== id) { VWR.id = id; VWR.t = 0; VFX.clear(); }
    else VWR.t = 0;
  }
  function updateViewer(dt) {
    const sc = SCN[VWR.id], cyc = sc.dur + 1.5;
    const T0 = VWR.t % cyc;
    VWR.t += dt;
    const T = VWR.t % cyc;
    if (T < T0) VFX.clear();
    const p = clamp(T / sc.dur, 0, 1);
    if (!RM && sc.emit && T < sc.dur) sc.emit(VFX, dt, p, VWR.t);
    VFX.update(dt);
    if (T >= sc.dur) VWR.watched[VWR.id] = true;
  }
  function drawViewer() {
    const v = LAY.viewer, sc = SCN[VWR.id], cyc = sc.dur + 1.5;
    const T = VWR.t % cyc, p = clamp(T / sc.dur, 0, 1);
    ctx.save();
    panel(v.x, v.y, v.w, v.h, 16, '#fff', 16, 5, 'rgba(30,50,100,.22)');
    ctx.beginPath(); D.roundRect(v.x, v.y, v.w, v.h, 16); ctx.clip();
    ctx.translate(v.x, v.y); ctx.scale(v.w / SW, v.h / SH);
    sc.draw(ctx, D, p, VWR.t);
    VFX.draw(ctx);
    const fa = Math.max(1 - T / 0.3, (T - (cyc - 0.35)) / 0.35, 0);
    if (fa > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, fa) + ')'; ctx.fillRect(0, 0, SW, SH); }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(139,92,246,.35)'; ctx.lineWidth = 2; D.roundRect(v.x, v.y, v.w, v.h, 16); ctx.stroke();
    const o = OBS_BY[VWR.id];
    pill(v.x + 10, v.y + 18, o.icon + ' ' + sc.title, { bg: 'rgba(27,35,51,.82)', size: 13.5, align: 'left', pad: 10 });
    ctx.fillStyle = 'rgba(27,35,51,.16)'; D.roundRect(v.x + 12, v.y + v.h - 12, v.w - 24, 5, 3); ctx.fill();
    ctx.fillStyle = COL.sub; D.roundRect(v.x + 12, v.y + v.h - 12, Math.max(5, (v.w - 24) * p), 5, 3); ctx.fill();
    if (T > sc.dur) { pill(v.x + v.w - 12, v.y + 18, '↻ 눌러서 다시 보기', { bg: 'rgba(139,92,246,.92)', size: 13, align: 'right', pad: 9 }); }
    ctx.restore();
  }

  /* ---------- 상태 사다리 그리기 (① 그림 아이콘 / ② 입자 모형) ---------- */
  const NODEBOX = {};
  function initNodes() {
    if (PHONE) return;
    ['sol', 'liq', 'gas'].forEach((k) => {
      const r = LAY.nodes[k];
      NODEBOX[k] = new PBox({ N: 20, R: 6.4, color: COL.water, box: { x0: r.x + 6, y0: r.y + 6, x1: r.x + r.w - 6, y1: r.y + r.h - 8 }, lattice: 'hex', cols: 5, state: KIND[k], therm: 0.4, vl: 32, vg: 100 });
    });
  }
  function nodeGlowOf(k) {
    if (S.scene !== 'names' || !TH.arrow || TH.phase === 'idle' && false) return 0;
    const a = AR[TH.arrow];
    if (!a) return 0;
    if (TH.phase === 'idle') return 0;
    if (a.from === k) return TH.phase === 'hold' ? 1 : 0.5;
    if (a.to === k) return TH.phase === 'morph' ? 0.5 : TH.phase === 'end' ? 1 : 0;
    return 0;
  }
  function drawNode(k, t) {
    const r = LAY.nodes[k], glow = nodeGlowOf(k);
    drawNodeFrame(r, k, { glow });
    ctx.save();
    ctx.beginPath(); D.roundRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3, 14.5); ctx.clip();
    if (S.nodeK < 0.99) macroIcon(k, r, t);
    if (S.nodeK > 0.01) {
      ctx.globalAlpha = S.nodeK;
      vgrad(ctx, r.x, r.y, r.w, r.h, '#fdfeff', STATE[k].tint);
      ctx.fillStyle = 'rgba(110,130,170,.16)'; ctx.fillRect(r.x, r.y + r.h - 8, r.w, 8);
      ctx.globalAlpha = 1;
      NODEBOX[k].draw(ctx, S.nodeK);
    }
    ctx.restore();
    drawNodeBorder(r, k, { glow });
  }
  function arrowStyle(a, t, cards) {
    let color = '#a9b6c9', width = PHONE ? 5 : 6, flow = -1;
    const c = slotCard(cards, a.id);
    if (S.scene === 'names' && TH.arrow === a.id && TH.phase !== 'idle') { color = COL.sub; flow = (t * 0.8) % 1; width = 7; }
    else if (S.scene === 'names' && TH.watched[a.id]) color = '#8b7bdc';
    if (c && c.ok > 0) color = COL.good;
    else if (S.hoverArrow === a.id && DR.card) { color = COL.sub; width = 8; flow = (t * 0.8) % 1; }
    return { color, width, flow, head: PHONE ? 10 : 15 };
  }
  function drawSlotBox(a, cards, t) {
    const c = slotCard(cards, a.id), hov = S.hoverArrow === a.id && DR.card;
    const w = a.slot.w, h = a.slot.h;
    if (c && !hov) return;
    ctx.save();
    ctx.translate(a.slot.cx, a.slot.cy);
    const k = hov ? 1.07 : 1;
    ctx.scale(k, k);
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    softShadow(-w / 2, -h / 2, w, h, 14, hov ? 12 : 5, 2, hov ? 'rgba(139,92,246,.4)' : 'rgba(30,50,100,.14)'); D.roundRect(-w / 2, -h / 2, w, h, 14); ctx.fill();
    ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 10;
    ctx.strokeStyle = hov ? COL.sub : '#9aa8bd'; ctx.lineWidth = 2.2;
    D.roundRect(-w / 2, -h / 2, w, h, 14); ctx.stroke(); ctx.setLineDash([]);
    if (!c) {
      if (S.scene === 'obs') { text(0, 6, '＋', { size: 22, weight: 800, color: '#b7c1d2' }); }
      else { text(0, 6, '이름?', { size: 15, weight: 800, color: '#b7c1d2' }); }
    }
    ctx.restore();
  }
  function drawTile(a, t) {
    const r = a.tile;
    ctx.save();
    panel(r.x, r.y, r.w, r.h, 14, '#fff', 8, 2, 'rgba(30,50,100,.16)');
    const on2 = S.scene === 'names' && TH.arrow === a.id && TH.phase !== 'idle';
    if (on2) { ctx.strokeStyle = COL.sub; ctx.lineWidth = 3; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke(); }
    const cy = r.y + r.h / 2;
    [[a.from, r.x + 24], [a.to, r.x + 86]].forEach((q) => {
      D.sphere(q[1], cy, 19, STATE[q[0]].col, { gloss: false });
      text(q[1], cy + 5, STATE[q[0]].name, { size: 13, weight: 800, color: '#fff' });
    });
    ctx.restore();
  }
  function drawLadder(t, cards) {
    if (!PHONE) {
      ARROWS.forEach((a) => drawArrow(a, arrowStyle(a, t, cards)));
      ['gas', 'liq', 'sol'].forEach((k) => drawNode(k, t));
    } else {
      ARROWS.forEach((a) => { drawTile(a, t); drawArrow(a, arrowStyle(a, t, cards)); });
    }
    ARROWS.forEach((a) => drawSlotBox(a, cards, t));
  }
  function drawTrayPanel(rows) {
    const x = LAY.trayX - 8, y = LAY.trayY - 8, w = LAY.cols_w || (LAY.trayCols * LAY.cardW + (LAY.trayCols - 1) * LAY.trayGap + 16);
    const h = rows * LAY.cardH + (rows - 1) * LAY.trayRowGap + 16;
    ctx.save();
    ctx.fillStyle = 'rgba(139,92,246,.07)'; D.roundRect(x, y, w, h, 16); ctx.fill();
    ctx.restore();
  }
  function drawCards(cards, painter) {
    const rest = cards.filter((c) => c !== DR.card && !c.slot);
    const placed = cards.filter((c) => c !== DR.card && c.slot);
    rest.forEach((c) => painter(c));
    placed.forEach((c) => { if (c.kind === 'name' || c.kind === 'obs') drawSlotCard(c, AR[c.slot]); });
    if (DR.card && cards.indexOf(DR.card) >= 0) painter(DR.card);
  }

  function drawObs(t) {
    drawLadder(t, B1.cards);
    drawViewer();
    const cp = LAY.cap;
    text(cp.x + cp.w / 2, cp.y + 23, OBS_BY[VWR.id].cap, { size: PHONE ? 13.5 : 14.5, weight: 700, color: COL.ink });
    drawTrayPanel(2);
    drawCards(B1.cards, drawObsCard);
    if (!PHONE) {
      text(20, 36, '화살표는', { size: 13.5, weight: 800, color: COL.muted, align: 'left' });
      text(20, 55, '처음 → 나중', { size: 15, weight: 800, color: COL.sub, align: 'left' });
    }
  }
  /* '확인하기' 버튼을 눌렀을 때만 카드에 결과(초록/빨강)를 표시 (엔진이 확인 함수를 반복 호출하므로) */
  let checkArmed = false;
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.mission-actions .btn-primary')) checkArmed = true; }, true);
  const takeUser = () => { const u = checkArmed; checkArmed = false; return u; };
  function judge(cards, isRight, unplacedMsg, wrongMsg) {
    const user = takeUser();
    const un = cards.filter((c) => !c.slot && !c.bin);
    if (un.length) return unplacedMsg(un.length);
    const wrong = cards.filter((c) => !isRight(c));
    if (user) {
      cards.forEach((c) => { if (isRight(c)) { c.ok = 1; c.locked = true; } });
      wrong.forEach((c) => { c.bad = 1.3; });
    }
    return wrong.length ? wrongMsg(wrong.length) : true;
  }
  function checkB1() {
    return judge(B1.cards, (c) => AR[c.slot].ex === c.id,
      (n) => '아직 놓지 않은 카드가 ' + n + '장 있어요. 여섯 장면을 모두 화살표에 놓아 보세요.',
      (n) => n + '장은 변화 방향이 달라요. 빨간 카드는 곧 되돌아가요. ‘처음 상태 → 나중 상태’를 다시 살펴보세요.');
  }

  /* ---------- ② 6가지 이름: 입자 모형 무대 ---------- */
  const TH = { box: null, arrow: null, phase: 'idle', t: 0, fade: 1, reveal: 0, endT: 0, watched: {}, k2: 1, count: 0 };
  function initTheater() {
    const r = LAY.theater;
    TH.box = new PBox({ N: 40, R: 9, color: COL.water, box: { x0: r.x + 8, y0: r.y + 8, x1: r.x + r.w - 8, y1: r.y + r.h - 12 }, lattice: 'hex', cols: 7, state: 1, therm: 0.45, vl: 46, vg: 140 });
  }
  function playArrow(id) {
    if (!on('lens')) return;
    const a = AR[id];
    Sound.click();
    TH.arrow = id; TH.t = 0; TH.phase = 'hold'; TH.reveal = 0; TH.k2 = KIND[a.to];
    TH.fade = 0; SciSim.tween(TH, { fade: 1 }, { duration: 0.3 });
    TH.box.reset(KIND[a.from]);
    TH.box.onConvert = (q, up) => { if (!RM) FX.burst(q.x, q.y, { count: 3, speed: 36, life: 0.35, size: 2, gravity: 0, colors: ['#c4b5fd'] }); };
  }
  function updateTheater(dt) {
    TH.box.step(dt);
    if (TH.phase === 'idle') return;
    TH.t += dt;
    const N = TH.box.p.length;
    if (TH.phase === 'hold' && TH.t > 1.0) {
      TH.phase = 'morph';
      TH.box.gap = 2.0 / N;
      const k = TH.k2;
      TH.box.setWant(k === 0 ? N : 0, k === 1 ? N : 0, k === 2 ? N : 0);
    } else if (TH.phase === 'morph') {
      const n2 = TH.box.count(TH.k2);
      TH.reveal = n2 / N;
      if (TH.box.done() && TH.t > 1.6) { TH.phase = 'end'; TH.endT = 0; TH.reveal = 1; }
    } else if (TH.phase === 'end') {
      TH.endT += dt;
      if (TH.endT > 0.8) {
        TH.phase = 'idle';
        if (!TH.watched[TH.arrow]) { TH.watched[TH.arrow] = true; Sound.tone(880, 0.08, 'triangle', 0.07); const a = AR[TH.arrow]; FX.burst(a.slot.cx, a.slot.cy, { count: 10, speed: 100, life: 0.6, size: 3, colors: ['#8b5cf6', '#c4b5fd', '#ffffff'] }); }
      }
    }
  }
  /* 둥근 모서리 유리창 (🔍 입자 모형) */
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
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x + r.w - 26, r.y + 26, 12, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    pill(r.x + 12, r.y + 16, o.title || '🔍 입자 모형', { bg: '#5b21b6', size: 14, align: 'left', pad: 10 });
  }
  function drawTheater(t) {
    const r = LAY.theater, a = TH.arrow ? AR[TH.arrow] : null;
    lensFrame(r, {}, () => {
      TH.box.draw(ctx, TH.fade);
    });
    if (!a) {
      panel(r.x + 28, r.y + 52, r.w - 56, 62, 14, 'rgba(255,255,255,.94)', 8, 2, 'rgba(20,40,80,.22)');
      text(r.x + r.w / 2, r.y + 79, PHONE ? '아래 화살표를 눌러 보세요' : '왼쪽 화살표를 눌러 보세요', { size: 17, weight: 800, color: COL.sub });
      text(r.x + r.w / 2, r.y + 102, '상태가 변할 때 입자는 어떻게 달라질까요?', { size: 13.5, weight: 700, color: COL.muted });
    } else {
      const lab = STATE[a.from].name + ' → ' + STATE[a.to].name;
      pill(r.x + r.w - 12, r.y + 16, lab, { bg: TH.phase === 'idle' || TH.phase === 'end' ? COL.sub : '#7c6bd6', size: 14, align: 'right', pad: 10 });
    }
    // 설명 칸
    const c = LAY.tcap;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; D.roundRect(c.x, c.y, c.w, c.h, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(139,92,246,.22)'; ctx.lineWidth = 1.5; D.roundRect(c.x, c.y, c.w, c.h, 14); ctx.stroke();
    ctx.restore();
    if (!a) {
      text(c.x + c.w / 2, c.y + c.h / 2 + 2, '입자의 배열 · 사이 거리 · 움직임을 비교해요', { size: 14.5, weight: 700, color: COL.muted });
      return;
    }
    text(c.x + 14, c.y + 25, STATE[a.from].name + ' → ' + STATE[a.to].name, { size: 19, weight: 800, color: COL.ink, align: 'left' });
    const ex = OBS_BY[a.ex];
    text(c.x + c.w - 14, c.y + 24, '예) ' + ex.slotLabel, { size: 13, weight: 700, color: COL.muted, align: 'right' });
    const rows = [['배열', 'arr'], ['사이 거리', 'dist'], ['운동', 'mov']];
    const rev = smooth(TH.reveal);
    rows.forEach((rw, i) => {
      const y = c.y + 52 + i * 21;
      text(c.x + 14, y, rw[0], { size: 13, weight: 800, color: COL.muted, align: 'left' });
      const fx = FEAT[a.from][rw[1]], tx = FEAT[a.to][rw[1]], same = fx === tx;
      text(c.x + 86, y, fx, { size: 13.5, weight: 700, color: STATE[a.from].col, align: 'left' });
      ctx.save(); ctx.font = D.font(13.5, 700); const w1 = ctx.measureText(fx).width; ctx.restore();
      const ax = c.x + 86 + w1 + 12;
      ctx.globalAlpha = 0.25 + 0.75 * rev;
      text(ax, y, same ? '＝' : '→', { size: 13.5, weight: 800, color: COL.muted, align: 'left' });
      ctx.globalAlpha = rev;
      text(ax + 22, y, tx, { size: 13.5, weight: 800, color: STATE[a.to].col, align: 'left' });
      ctx.globalAlpha = 1;
    });
  }

  /* ---------- ② 이름 카드 ---------- */
  const B2 = { cards: [], sel: null, solved: false };
  const NAME_ORDER = ['기화', '융해', '승화', '액화', '응고', '승화'];
  function initB2() {
    B2.cards = NAME_ORDER.map((n, i) => {
      const tp = trayPos(i);
      return new Card({ id: 'n' + i, kind: 'name', label: n, hint: '', w: LAY.cardW, h: LAY.cardH, x: tp.x, y: tp.y, hx: tp.x, hy: tp.y });
    });
    B2.solved = false; B2.sel = null;
  }
  function drawNames(t) {
    drawLadder(t, B2.cards);
    drawTheater(t);
    drawTrayPanel(2);
    drawCards(B2.cards, drawNameCard);
  }
  function checkB2() {
    return judge(B2.cards, (c) => AR[c.slot].name === c.label,
      (n) => '아직 놓지 않은 이름 카드가 ' + n + '장 있어요. 여섯 화살표에 모두 놓아 보세요.',
      (n) => n + '장은 이름이 달라요. 빨간 카드는 곧 되돌아가요. 화살표를 눌러 입자의 변화를 다시 보고, 변화의 뜻을 떠올려 보세요.');
  }
  const watchedCount = () => ARROWS.filter((a) => TH.watched[a.id]).length;

  /* =========================================================
     ③ 부피와 질량 실험: 전자저울 위의 밀폐 용기 (양초 · 물 · 에탄올)
     ========================================================= */
  const EXPS = {
    wax: {
      key: 'wax', icon: '🕯️', name: '양초', color: COL.wax, mass: 121.0, vA: 44, vB: 40, dur: 4.8, fwdHeat: false,
      aName: '액체', bName: '고체', fwd: '❄ 식혀서 굳히기', back: '🔥 가열해서 다시 녹이기', note: '녹인 양초가 담긴 밀폐 용기예요.',
      dist: '조금 가까워짐', arr: '불규칙 → 규칙적', volTxt: (v) => Math.round(v) + ' mL',
      box: { N: 36, R: 8, lattice: 'hex', cols: 8, liqSp: 1.24, vl: 44, vg: 130 },
    },
    water: {
      key: 'water', icon: '🧊', name: '물', color: COL.water, mass: 100.0, vA: 40, vB: 44, dur: 4.8, fwdHeat: false,
      aName: '액체', bName: '고체', fwd: '❄ 식혀서 얼리기', back: '🔥 가열해서 다시 녹이기', note: '물이 가득 담긴 밀폐 병이에요.',
      dist: '조금 멀어짐', arr: '불규칙 → 규칙적(성긴 배열)', volTxt: (v) => Math.round(v) + ' mL',
      box: { N: 36, R: 8, lattice: 'honey', cols: 4, liqSp: 1.0, vl: 44, vg: 130 },
    },
    eth: {
      key: 'eth', icon: '🧪', name: '에탄올', color: COL.eth, mass: 3.0, vA: 1, vB: 500, dur: 5.2, fwdHeat: true,
      aName: '액체', bName: '기체', fwd: '🔥 가열해서 기체로 만들기', back: '❄ 식혀서 다시 액체로', note: '에탄올 몇 방울이 든 비닐봉지예요.',
      dist: '아주 멀어짐', arr: '불규칙 → 매우 불규칙', volTxt: (v) => (v < 5 ? '1 mL' : '약 ' + Math.round(v / 10) * 10 + ' mL'),
      box: { N: 36, R: 8, lattice: 'hex', cols: 8, liqSp: 1.0, vl: 44, vg: 150 },
    },
  };
  const EXP_KEYS = ['wax', 'water', 'eth'];
  const X = { key: 'wax', f: 0, dir: 0, devK: 0, done: {}, flash: 0, badge: 0, fresh: {}, rec: {}, lensK: 1, snapA: null, snapB: null };
  function snapshot(b) { const B = b.box, w = B.x1 - B.x0, h = B.y1 - B.y0; return b.p.map((q) => ({ x: (q.x - B.x0) / w, y: (q.y - B.y0) / h })); }
  const XB = {};
  function initExp() {
    const r = LAY.s3.lens;
    EXP_KEYS.forEach((k) => {
      const e = EXPS[k], b = e.box;
      XB[k] = new PBox({ N: b.N, R: b.R, color: e.color, box: { x0: r.x + 8, y0: r.y + 8, x1: r.x + r.w - 8, y1: r.y + r.h - 12 }, lattice: b.lattice, cols: b.cols, state: 1, therm: 0.38, vl: b.vl, vg: b.vg, liqSp: b.liqSp, gap: 0.05,
        flashUp: '#ff8a3d', flashDown: '#4a90ff' });
      X.rec[k] = { mB: e.mass, mA: null, vB: e.vA, vA: null };
    });
  }
  function expVol(e, f) {
    if (e.key === 'eth') return 1 + 499 * Math.pow(f, 1.6);
    return e.vA + (e.vB - e.vA) * smooth(seg(f, 0.15, 0.95));
  }
  function selectExp(k, quiet) {
    X.key = k; X.f = 0; X.dir = 0; X.devK = 0; X.badge = 0; X.flash = 0;
    const b = XB[k]; b.reset(1); b.want = null;
    X.rec[k].mA = null; X.rec[k].vA = null; X.rec[k].mB = EXPS[k].mass; X.rec[k].vB = EXPS[k].vA;
    X.snapA = snapshot(b); X.snapB = null;
    X.lensK = 0; SciSim.tween(X, { lensK: 1 }, { duration: 0.35 });
    if (!quiet) Sound.click();
    refreshUI();
  }
  function runExp() {
    if (X.dir !== 0) return;
    X.dir = X.f < 0.5 ? 1 : -1;
    X.badge = 0;
    Sound.click();
    refreshUI();
  }
  function updateExp(dt) {
    const e = EXPS[X.key], b = XB[X.key];
    if (X.dir !== 0) {
      X.f = clamp(X.f + X.dir * dt / e.dur, 0, 1);
      X.devK = SciSim.approach(X.devK, 1, dt, 7);
      if (X.f >= 1 || X.f <= 0) {
        const fwd = X.dir > 0;
        X.dir = 0;
        const rc = X.rec[X.key];
        if (fwd) {
          rc.mA = e.mass; rc.vA = e.vB; X.done[X.key] = true; X.fresh[X.key] = now();
          X.flash = 1; X.badge = 1;
          const g = LAYX().scale;
          celebrate(g.cx - 128, g.py - 70);
        } else { rc.mA = null; rc.vA = null; X.badge = 0; X.snapB = null; }
        refreshUI();
      }
    } else X.devK = SciSim.approach(X.devK, 0, dt, 6);
    X.flash = Math.max(0, X.flash - dt * 0.5);
    // 입자 상자: 진행 정도에 맞춰 입자 수를 맞춤
    const N = b.p.length, to = e.key === 'eth' ? 2 : 0;
    const fp = smooth(seg(X.f, 0.04, 0.96));
    const n2 = Math.round(N * fp);
    if (to === 0) b.setWant(n2, N - n2, 0); else b.setWant(0, N - n2, n2);
    b.step(dt);
    if (X.f >= 1 && X.dir === 0 && !X.snapB && b.done()) X.snapB = snapshot(b);
  }
  /* 장면 안쪽 좌표 */
  function LAYX() {
    const m = LAY.s3.macro;
    if (!PHONE) return { scale: { cx: m.x + m.w / 2 + 6, py: 300 } };
    return { scale: { cx: m.x + m.w / 2 + 4, py: 246 } };
  }

  /* ---- 전자저울 ---- */
  function drawScale(cx, py, mass, flash, t) {
    const w = PHONE ? 270 : 300, bh = 66;
    ctx.save();
    ctx.fillStyle = 'rgba(40,50,80,.18)'; ctx.beginPath(); ctx.ellipse(cx, py + bh + 16, w / 2 + 6, 9, 0, 0, TAU); ctx.fill();
    // 몸체
    const g = ctx.createLinearGradient(0, py + 12, 0, py + 12 + bh);
    g.addColorStop(0, '#f4f6fa'); g.addColorStop(1, '#b9c3d3');
    softShadow(cx - w / 2, py + 12, w, bh, 14, 10, 4, 'rgba(30,40,70,.28)'); ctx.fillStyle = g; D.roundRect(cx - w / 2, py + 12, w, bh, 14); ctx.fill();
    ctx.strokeStyle = '#98a4b8'; ctx.lineWidth = 2; D.roundRect(cx - w / 2, py + 12, w, bh, 14); ctx.stroke();
    // 받침판
    const pg = ctx.createLinearGradient(0, py, 0, py + 12); pg.addColorStop(0, '#e9eef6'); pg.addColorStop(1, '#a5b1c4');
    ctx.fillStyle = pg; D.roundRect(cx - w / 2 + 28, py, w - 56, 13, 4); ctx.fill();
    ctx.strokeStyle = '#8e9bb0'; ctx.lineWidth = 1.5; D.roundRect(cx - w / 2 + 28, py, w - 56, 13, 4); ctx.stroke();
    // 화면 (LCD)
    const lx = cx - 76, ly = py + 26, lw = 152, lh = 40;
    if (flash > 0) { ctx.strokeStyle = 'rgba(20,160,88,' + (0.3 + 0.5 * flash) + ')'; ctx.lineWidth = 8; D.roundRect(lx - 3, ly - 3, lw + 6, lh + 6, 9); ctx.stroke(); }
    ctx.fillStyle = '#243b30'; D.roundRect(lx - 3, ly - 3, lw + 6, lh + 6, 8); ctx.fill();
    const lg = ctx.createLinearGradient(0, ly, 0, ly + lh); lg.addColorStop(0, '#d6e6c4'); lg.addColorStop(1, '#bfd3ab');
    ctx.fillStyle = lg; D.roundRect(lx, ly, lw, lh, 6); ctx.fill();
    ctx.font = '800 29px ui-monospace, "SF Mono", Menlo, Consolas, monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#233a1f';
    ctx.fillText(mass.toFixed(1), lx + lw - 38, ly + lh / 2 + 1);
    ctx.font = '800 17px ui-monospace, Menlo, monospace'; ctx.textAlign = 'left'; ctx.fillText('g', lx + lw - 30, ly + lh / 2 + 5);
    ctx.textBaseline = 'alphabetic';
    // 단추 · 이름
    D.sphere(cx + w / 2 - 34, py + 46, 8, '#5b6a82', { gloss: true });
    D.sphere(cx + w / 2 - 34 - 24, py + 50, 5, '#8795ad', { gloss: false });
    text(cx - w / 2 + 22, py + 74, '전자저울', { size: 13, weight: 800, color: '#6b778c', align: 'left' });
    ctx.restore();
  }

  /* ---- 용기 ---- */
  function jarPath(cx, yb, w, h, r) { D.roundRect(cx - w / 2, yb - h, w, h, r); }
  function drawWaxJar(cx, yb, f, t) {
    const jw = 124, jh = 158, yt = yb - jh;
    const V = expVol(EXPS.wax, f), L = V * 3.0;                // 부피 → 높이
    const fs = smooth(seg(f, 0.12, 0.95));
    const dent = 11 * smooth(seg(f, 0.45, 1));
    ctx.save();
    // 안쪽 (받침 그림자)
    ctx.fillStyle = 'rgba(255,255,255,.55)'; jarPath(cx, yb, jw, jh, 12); ctx.fill();
    ctx.save(); jarPath(cx, yb, jw - 4, jh - 2, 11); ctx.clip();
    const yTop = yb - L, x0 = cx - jw / 2, x1 = cx + jw / 2;
    const surf = (x) => yTop - dent * 0.45 + dent * (1 - Math.pow((x - cx) / (jw / 2 - 6), 2)) * 0.9 + (1 - fs) * Math.sin(t * 2.2 + x * 0.12) * 0.9;
    // 액체 부분
    const lg = ctx.createLinearGradient(0, yTop, 0, yb); lg.addColorStop(0, 'rgba(255,208,96,.95)'); lg.addColorStop(1, 'rgba(240,160,40,.97)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(x0, yb);
    for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, surf(x));
    ctx.lineTo(x1, yb); ctx.closePath(); ctx.fill();
    // 굳은 부분 (위에서부터)
    if (fs > 0.01) {
      const sg = ctx.createLinearGradient(0, yTop, 0, yb); sg.addColorStop(0, '#fbf1d3'); sg.addColorStop(1, '#f1dca8');
      const yEnd = yTop + (yb - yTop) * fs;
      ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x0, yEnd);
      for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, surf(x));
      ctx.lineTo(x1, yEnd); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(190,150,70,.35)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x0, yEnd + 2); ctx.lineTo(x1, yEnd + 2); ctx.stroke();
    }
    // 액체 표면 반짝임
    if (fs < 0.95) { ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - fs)) + ')'; ctx.fillRect(x0 + 10, surf(cx) + 1, jw - 30, 3); }
    ctx.restore();
    // 유리
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; jarPath(cx, yb, jw, jh, 12); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx - jw / 2 + 11, yt + 24); ctx.lineTo(cx - jw / 2 + 11, yb - 20); ctx.stroke();
    // 뚜껑
    const cg = ctx.createLinearGradient(0, yt - 14, 0, yt + 4); cg.addColorStop(0, '#e8edf4'); cg.addColorStop(1, '#8f9db3');
    ctx.fillStyle = cg; D.roundRect(cx - jw / 2 - 3, yt - 14, jw + 6, 18, 5); ctx.fill();
    ctx.strokeStyle = '#7d8aa0'; ctx.lineWidth = 1.5; D.roundRect(cx - jw / 2 - 3, yt - 14, jw + 6, 18, 5); ctx.stroke();
    ctx.restore();
    return { top: yb - L - 4, topX: cx + jw / 2, x1: cx + jw / 2 + 6, y0: yb, y1: yb - L };
  }
  const ICE_CRACKS = [[-30, -8, -6, 14], [-6, 14, 18, 2], [18, 2, 34, 22], [-22, 30, 0, 44], [10, -26, 30, -10], [-34, 8, -24, 30]];
  function drawWaterBottle(cx, yb, f, t) {
    const bw = 104, bh = 150, nw = 38, nh = 24, yt = yb - bh;
    const V = expVol(EXPS.water, f), L = V * 3.0;
    const fs = smooth(seg(f, 0.1, 0.95)), bulge = 5 * smooth(seg(f, 0.45, 1));
    const path = () => {
      const xl = cx - bw / 2, xr = cx + bw / 2, ys = yt + 34;
      ctx.beginPath();
      ctx.moveTo(xl + 12, yb); ctx.lineTo(xr - 12, yb); ctx.quadraticCurveTo(xr, yb, xr, yb - 12);
      ctx.bezierCurveTo(xr + bulge, yb - 60, xr + bulge, ys + 20, xr, ys);
      ctx.bezierCurveTo(xr - 4, ys - 14, cx + nw / 2, yt + 10, cx + nw / 2, yt - nh + 10);
      ctx.lineTo(cx - nw / 2, yt - nh + 10);
      ctx.bezierCurveTo(cx - nw / 2, yt + 10, xl + 4, ys - 14, xl, ys);
      ctx.bezierCurveTo(xl - bulge, ys + 20, xl - bulge, yb - 60, xl, yb - 12);
      ctx.quadraticCurveTo(xl, yb, xl + 12, yb);
      ctx.closePath();
    };
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; path(); ctx.fill();
    ctx.save(); path(); ctx.clip();
    const yTop = yb - L;
    const wy = (x) => yTop + (1 - fs) * Math.sin(t * 2.4 + x * 0.14) * 1.3;
    const wg = ctx.createLinearGradient(0, yTop, 0, yb); wg.addColorStop(0, 'rgba(120,190,255,.85)'); wg.addColorStop(1, 'rgba(70,150,235,.95)');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(cx - bw, yb);
    for (let x = cx - bw; x <= cx + bw; x += 4) ctx.lineTo(x, wy(x));
    ctx.lineTo(cx + bw, yb); ctx.closePath(); ctx.fill();
    if (fs > 0.01) {                                   // 얼음: 위에서부터 얼어 내려옴
      const yEnd = yTop + (yb - yTop) * fs;
      const ig = ctx.createLinearGradient(cx - bw / 2, yTop, cx + bw / 2, yEnd);
      ig.addColorStop(0, '#f4fbff'); ig.addColorStop(1, '#cfe9fb');
      ctx.fillStyle = ig; ctx.fillRect(cx - bw, yTop - 1, bw * 2, yEnd - yTop + 1);
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6;
      ICE_CRACKS.forEach((q) => { const yy = yTop + 24 + (q[1] + 30) * 0.9; if (yy + 20 < yEnd) { ctx.beginPath(); ctx.moveTo(cx + q[0], yy); ctx.lineTo(cx + q[2], yy + (q[3] - q[1]) * 0.9); ctx.stroke(); } });
      ctx.strokeStyle = 'rgba(100,170,230,.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(cx - bw, yEnd + 1); ctx.lineTo(cx + bw, yEnd + 1); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - fs)) + ')'; ctx.fillRect(cx - bw / 2 + 10, yTop + 1, bw - 28, 3);
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; path(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx - bw / 2 + 11, yt + 56); ctx.lineTo(cx - bw / 2 + 11, yb - 22); ctx.stroke();
    const cg = ctx.createLinearGradient(0, yt - nh - 6, 0, yt - nh + 12); cg.addColorStop(0, '#5aa0f0'); cg.addColorStop(1, '#2f6fd0');
    ctx.fillStyle = cg; D.roundRect(cx - nw / 2 - 5, yt - nh - 8, nw + 10, 18, 5); ctx.fill();
    ctx.restore();
    return { y0: yb, y1: yb - L, x1: cx + bw / 2 + bulge + 6 };
  }
  function drawEthBag(cx, yb, f, t) {
    const k = smooth(f), w = 150 + 40 * k, H = 12 + 128 * k;
    const xl = cx - w / 2, xr = cx + w / 2;
    const path = () => { ctx.beginPath(); ctx.moveTo(xl, yb); ctx.bezierCurveTo(xl - 10 * k, yb - H * 1.34, xr + 10 * k, yb - H * 1.34, xr, yb); ctx.closePath(); };
    ctx.save();
    const g = ctx.createLinearGradient(0, yb - H, 0, yb);
    g.addColorStop(0, 'rgba(225,245,240,' + (0.22 + 0.2 * k) + ')'); g.addColorStop(1, 'rgba(180,225,225,' + (0.4 + 0.1 * k) + ')');
    ctx.fillStyle = g; path(); ctx.fill();
    // 안쪽 기체(연한 청록) 흐름
    ctx.save(); path(); ctx.clip();
    if (k > 0.15) for (let i = 0; i < 9; i++) {
      const a = ((t * 0.28 + i * 0.37) % 1), x = xl + 18 + ((i * 53) % (w - 36)), y = yb - 8 - a * H * 0.9;
      ctx.fillStyle = 'rgba(34,179,154,' + (0.16 * k * Math.sin(a * Math.PI)) + ')'; circle(ctx, x + Math.sin(t + i) * 8, y, 9 + (i % 3) * 3); ctx.fill();
    }
    // 바닥에 고인 에탄올
    const lq = 1 - smooth(seg(f, 0.05, 0.7));
    if (lq > 0.02) {
      const lg2 = ctx.createLinearGradient(0, yb - 9, 0, yb); lg2.addColorStop(0, 'rgba(60,200,170,.75)'); lg2.addColorStop(1, 'rgba(24,160,135,.9)');
      ctx.fillStyle = lg2; ctx.beginPath(); ctx.ellipse(cx, yb - 3, 46 * lq, 7 * lq, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(cx - 12 * lq, yb - 6, 12 * lq, 1.8 * lq, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(105,150,190,.95)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; path(); ctx.stroke();
    // 윗부분 지퍼(밀봉) 막대
    const ya = yb - H * 1.005;
    ctx.fillStyle = 'rgba(105,150,190,.8)'; D.roundRect(cx - 34 - 18 * k, ya + 3 + (1 - k) * 2, 68 + 36 * k, 7, 3.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(cx - 28 - 14 * k, ya + 4.5 + (1 - k) * 2, 40, 1.8);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(xl + 14, yb - H * 0.45); ctx.quadraticCurveTo(xl + 20 - 4 * k, yb - H * 0.85, xl + 44, yb - H * 0.97 + (1 - k) * 8); ctx.stroke();
    if (k < 0.5) {                                      // 쭈글쭈글한 주름
      ctx.strokeStyle = 'rgba(105,150,190,' + (0.45 * (1 - 2 * k)) + ')'; ctx.lineWidth = 1.3;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(xl + 22 + i * 24, yb - 2); ctx.lineTo(xl + 30 + i * 24, yb - H * 0.8); ctx.stroke(); }
    }
    ctx.restore();
    return { y0: yb, y1: yb - H * 1.0, x1: xr + 8 };
  }

  /* ---- 가열 · 냉각 장치 ---- */
  function drawDevice(kind, x, y, k, t) {
    if (k < 0.02) return;
    const slide = (1 - ease.outBack(Math.min(1, k))) * -110;
    ctx.save();
    ctx.translate(x + slide, y);
    ctx.globalAlpha = Math.min(1, k * 2);
    const hot = kind === 'heat', c1 = hot ? '#f26b3a' : '#2f7de1';
    // 본체
    const g = ctx.createLinearGradient(0, -24, 0, 24); g.addColorStop(0, hot ? '#ffd9c8' : '#d7ebff'); g.addColorStop(1, hot ? '#e8926d' : '#7db4ee');
    softShadow(0, -24, 66, 48, 14, 8, 3, 'rgba(20,40,80,.22)'); ctx.fillStyle = g; D.roundRect(0, -24, 66, 48, 14); ctx.fill();
    ctx.fillStyle = hot ? '#c25a30' : '#3b78c4'; ctx.beginPath(); ctx.moveTo(66, -16); ctx.lineTo(84, -12); ctx.lineTo(84, 12); ctx.lineTo(66, 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hot ? '#9a3f1c' : '#2a5da0'; D.roundRect(14, 20, 22, 30, 6); ctx.fill();
    text(33, 7, hot ? '♨' : '❄', { size: 24, weight: 800, color: hot ? '#fff' : '#fff' });
    // 바람 (물결 화살표)
    for (let i = 0; i < 3; i++) {
      const yy = -16 + i * 16, ph = t * 3 + i * 1.7;
      ctx.strokeStyle = rgba(c1, 0.75); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
      for (let s = 0; s <= 44; s += 4) { const px = 92 + s, py2 = yy + Math.sin(s * 0.28 - ph) * 3.2; if (s) ctx.lineTo(px, py2); else ctx.moveTo(px, py2); }
      ctx.stroke();
      ctx.fillStyle = rgba(c1, 0.9); ctx.beginPath(); ctx.moveTo(144, yy + Math.sin(44 * 0.28 - ph) * 3.2); ctx.lineTo(134, yy - 6 + Math.sin(44 * 0.28 - ph) * 3.2); ctx.lineTo(134, yy + 6 + Math.sin(44 * 0.28 - ph) * 3.2); ctx.closePath(); ctx.fill();
    }
    pill(40, -42, hot ? '가열 중' : '냉각 중', { bg: c1, size: 13, pad: 9 });
    ctx.restore();
  }

  /* ---- 부피 표시선 ---- */
  function drawVolLine(xr, y0, y1, label, tone, ref) {
    ctx.save();
    ctx.strokeStyle = 'rgba(80,95,125,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xr, y0); ctx.lineTo(xr, y1); ctx.stroke();
    [[y0], [y1]].forEach((q) => { ctx.beginPath(); ctx.moveTo(xr - 6, q[0]); ctx.lineTo(xr + 6, q[0]); ctx.stroke(); });
    if (ref != null) { ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(139,92,246,.85)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(xr - 150, ref); ctx.lineTo(xr + 6, ref); ctx.stroke(); ctx.setLineDash([]); text(xr - 154, ref + 4, '처음', { size: 13, weight: 800, color: COL.sub, align: 'right' }); }
    pill(xr, Math.min(y0, y1) - 18, label, { bg: tone || '#475569', size: 14, pad: 9 });
    ctx.restore();
  }

  function drawExp(t) {
    const m = LAY.s3.macro, g = LAYX().scale, e = EXPS[X.key], rc = X.rec[X.key];
    // 책상
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; D.roundRect(m.x, m.y, m.w, m.h, 18); ctx.fill();
    ctx.restore();
    // 용기
    const f = X.f;
    const yb = g.py - 1;
    let info;
    if (X.key === 'wax') info = drawWaxJar(g.cx, yb, f, t);
    else if (X.key === 'water') info = drawWaterBottle(g.cx, yb, f, t);
    else info = drawEthBag(g.cx, yb, f, t);
    drawScale(g.cx, g.py, e.mass, X.flash, t);
    // 장치
    if (X.devK > 0.02) {
      const heat = (e.fwdHeat === (X.dir >= 0)) ? 'heat' : 'cool';
      if (X.dir !== 0) X.lastDev = heat;
      drawDevice(X.lastDev || 'heat', m.x + 6, g.py - 60, X.devK, t);
    }
    // 부피 표시선
    const V = expVol(e, f);
    const tone = f > 0.98 || f < 0.02 ? '#475569' : COL.sub;
    const refY = (X.key === 'eth') ? null : yb - e.vA * 3.0;
    drawVolLine(info.x1 + 6, info.y0, info.y1, '부피 ' + e.volTxt(V), tone, (X.key !== 'eth' && f > 0.1) ? refY : null);
    // 변화 배지
    if (X.badge > 0 && X.dir === 0 && X.f >= 1) {
      const pop = ease.outBack(Math.min(1, (1 - X.flash) * 5 + 0.0001));
      ctx.save(); ctx.translate(g.cx, g.py + 84); ctx.scale(pop, pop);
      pill(0, 0, '질량 그대로!', { bg: COL.good, size: 15, pad: 12 });
      ctx.restore();
    }
    // 처음 상태 설명
    text(m.x + m.w / 2, m.y + 28, e.icon + ' ' + e.name + ' · ' + (X.f >= 0.5 ? e.bName + ' 상태' : e.aName + ' 상태'), { size: 16, weight: 800, color: COL.ink });
    // 돋보기 → 입자 모형 연결선
    const lr = LAY.s3.lens;
    if (on('exp') && S.zoom) {
      const ky = info.y1 + (info.y0 - info.y1) * 0.5, kx = g.cx;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = 'rgba(124,58,237,.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(kx, ky, 20, 0, TAU); ctx.stroke();
      ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(kx + 14, ky + 14); ctx.lineTo(kx + 26, ky + 26); ctx.stroke();
      ctx.restore();
    }
    // 입자 모형
    if (S.zoom && on('exp')) drawExpLens(t);
    drawExpInfo(t);
    drawExpTable(t);
  }
  function drawExpLens(t) {
    const r = LAY.s3.lens, b = XB[X.key], e = EXPS[X.key];
    lensFrame(r, { title: '🔍 입자 모형' }, () => { b.draw(ctx, X.lensK); });
    const c = b.counts();
    const st = c[2] > b.p.length * 0.6 ? '기체' : c[0] > b.p.length * 0.6 ? '고체' : (c[0] + c[2] > 0 ? '변하는 중' : '액체');
    pill(r.x + r.w - 12, r.y + 16, e.name + ' ' + st, { bg: '#7c6bd6', size: 13.5, align: 'right', pad: 10 });
  }
  function miniSnap(r, snap, col, label, dim) {
    ctx.save();
    ctx.fillStyle = dim ? 'rgba(241,245,251,.9)' : '#f4f9ff'; D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(139,92,246,.35)'; ctx.lineWidth = 1.5; D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.stroke();
    ctx.fillStyle = 'rgba(110,130,170,.18)'; ctx.fillRect(r.x + 3, r.y + r.h - 6, r.w - 6, 4);
    if (snap) snap.forEach((q) => drawBall(ctx, col, r.x + 6 + q.x * (r.w - 12), r.y + 6 + q.y * (r.h - 14), 3.6));
    else text(r.x + r.w / 2, r.y + r.h / 2 + 6, '?', { size: 26, weight: 800, color: '#c3cbda' });
    ctx.restore();
    text(r.x + r.w / 2, r.y + r.h + 17, label, { size: 13, weight: 800, color: COL.muted });
  }
  function drawExpInfo(t) {
    const r = LAY.s3.info, e = EXPS[X.key], N = XB[X.key].p.length;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.92)'; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(139,92,246,.22)'; ctx.lineWidth = 1.5; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
    ctx.restore();
    const after = X.f >= 0.99 && X.snapB;
    const stateA = e.aName, stateB = e.bName;
    if (PHONE) {
      text(r.x + 14, r.y + 31, '입자 수', { size: 14, weight: 800, color: COL.muted, align: 'left' });
      text(r.x + 80, r.y + 31, N + '개  →  ' + (after ? N + '개 (그대로)' : '?'), { size: 14.5, weight: 800, color: after ? COL.good : '#b7c1d2', align: 'left' });
      return;
    }
    text(r.x + 14, r.y + 27, '상태가 변하면 입자는?', { size: 15.5, weight: 800, color: COL.sub, align: 'left' });
    const bw = 124, bh = 80, y0 = r.y + 42;
    const rA = { x: r.x + 14, y: y0, w: bw, h: bh }, rB = { x: r.x + r.w - 14 - bw, y: y0, w: bw, h: bh };
    miniSnap(rA, X.snapA, e.color, '처음 · ' + stateA, false);
    miniSnap(rB, after ? X.snapB : null, e.color, '나중 · ' + stateB, !after);
    ctx.save(); ctx.strokeStyle = COL.sub; ctx.fillStyle = COL.sub; ctx.lineWidth = 4; ctx.lineCap = 'round';
    const ax = r.x + r.w / 2; ctx.beginPath(); ctx.moveTo(ax - 14, y0 + bh / 2); ctx.lineTo(ax + 6, y0 + bh / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax + 14, y0 + bh / 2); ctx.lineTo(ax + 4, y0 + bh / 2 - 7); ctx.lineTo(ax + 4, y0 + bh / 2 + 7); ctx.closePath(); ctx.fill(); ctx.restore();
    const rows = [
      ['입자 수', after ? N + '개 → ' + N + '개  ✔ 그대로' : N + '개 → ?', after ? COL.good : '#b7c1d2'],
      ['입자의 크기·종류', '변하지 않아요', COL.good],
      ['입자 사이 거리', after ? e.dist : '?', after ? '#b45309' : '#b7c1d2'],
      ['입자 배열', after ? e.arr : '?', after ? '#b45309' : '#b7c1d2'],
    ];
    rows.forEach((rw, i) => {
      const y = y0 + bh + 48 + i * 27;
      text(r.x + 14, y, rw[0], { size: 14, weight: 800, color: COL.muted, align: 'left' });
      text(r.x + 146, y, rw[1], { size: 14.5, weight: 800, color: rw[2], align: 'left' });
    });
  }
  function drawExpTable(t) {
    const r = LAY.s3.table;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(139,92,246,.22)'; ctx.lineWidth = 1.5; D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();
    ctx.restore();
    const c0 = r.x + 14, c1 = r.x + r.w * 0.33, c2 = r.x + r.w * 0.66, hy = r.y + 23, rh = (r.h - 34) / 3;
    text(c0, hy, '📋 실험 결과', { size: 13.5, weight: 800, color: COL.sub, align: 'left' });
    text(c1, hy, '질량 (g)  처음 → 나중', { size: 13, weight: 800, color: COL.muted, align: 'left' });
    text(c2, hy, '부피 (mL)  처음 → 나중', { size: 13, weight: 800, color: COL.muted, align: 'left' });
    EXP_KEYS.forEach((k, i) => {
      const e = EXPS[k], rc = X.rec[k], y = r.y + 34 + (i + 0.5) * rh + 5;
      const fr = X.fresh[k] && now() - X.fresh[k] < 2.2;
      if (fr) { ctx.fillStyle = 'rgba(255,244,220,.9)'; D.roundRect(r.x + 6, y - rh / 2 - 1, r.w - 12, rh - 2, 8); ctx.fill(); }
      if (k === X.key) { ctx.strokeStyle = 'rgba(139,92,246,.5)'; ctx.lineWidth = 2; D.roundRect(r.x + 6, y - rh / 2 - 1, r.w - 12, rh - 2, 8); ctx.stroke(); }
      text(c0, y, e.icon + ' ' + e.name, { size: 14.5, weight: 800, color: COL.ink, align: 'left' });
      const done = rc.mA != null;
      text(c1, y, rc.mB.toFixed(1) + ' → ' + (done ? rc.mA.toFixed(1) : '?'), { size: 14.5, weight: 800, color: done ? COL.good : '#b7c1d2', align: 'left' });
      const vt = (v) => (k === 'eth' ? (v < 5 ? '1' : '약 ' + v) : '' + v);
      const up = done && rc.vA > rc.vB;
      text(c2, y, vt(rc.vB) + ' → ' + (done ? vt(rc.vA) + (up ? ' ▲' : ' ▼') : '?'), { size: 14.5, weight: 800, color: done ? (up ? '#c2410c' : '#1d4ed8') : '#b7c1d2', align: 'left' });
    });
  }

  /* =========================================================
     ④ 적용: 생활 속 현상 7가지를 상태 변화의 이름별 상자에 분류
     ========================================================= */
  const LIFE = [
    { id: 'icicle', icon: '🧊', label: '처마 끝 고드름', short: '고드름', ans: 'freeze' },
    { id: 'fog', icon: '🌫️', label: '아침에 낀 안개', short: '안개', ans: 'cond' },
    { id: 'icecream', icon: '🍦', label: '아이스크림이 녹음', short: '아이스크림', ans: 'melt' },
    { id: 'naph', icon: '⚪', label: '나프탈렌이 작아짐', short: '나프탈렌', ans: 'sub' },
    { id: 'dew', icon: '💧', label: '풀잎에 맺힌 이슬', short: '이슬', ans: 'cond' },
    { id: 'frost2', icon: '❄️', label: '겨울 유리창의 성에', short: '성에', ans: 'sub' },
    { id: 'laundry', icon: '👕', label: '젖은 빨래가 마름', short: '젖은 빨래', ans: 'vap' },
  ];
  const BINS = [
    { id: 'melt', name: '융해', pair: '고체 → 액체', col: '#f59e0b' },
    { id: 'freeze', name: '응고', pair: '액체 → 고체', col: '#3b82f6' },
    { id: 'vap', name: '기화', pair: '액체 → 기체', col: '#ef4444' },
    { id: 'cond', name: '액화', pair: '기체 → 액체', col: '#0891b2' },
    { id: 'sub', name: '승화', pair: '고체 ⇄ 기체', col: '#8b5cf6' },
  ];
  const BIN_BY = {}; BINS.forEach((b) => (BIN_BY[b.id] = b));
  const B4 = { cards: [], solved: false, hover: null };
  function binRect(i) {
    const s = LAY.s4;
    if (!PHONE) return { x: s.binX + i * (s.binW + s.binGap), y: s.binY, w: s.binW, h: s.binH };
    const col = i % 3, row = (i / 3) | 0;
    return { x: s.binX + col * (s.binW + s.binGap), y: s.binY + row * (s.binH + 8), w: s.binW, h: s.binH };
  }
  function lifeHome(i) {
    const s = LAY.s4, n = LIFE.length;
    if (!PHONE) {
      const row = i < 4 ? 0 : 1, cols = row === 0 ? 4 : 3, col = row === 0 ? i : i - 4;
      const total = cols * s.cardW + (cols - 1) * 14, x0 = (VW - total) / 2;
      return { x: x0 + s.cardW / 2 + col * (s.cardW + 14), y: s.cardsY + s.cardH / 2 + row * (s.cardH + 14) };
    }
    const col = i % 2, row = (i / 2) | 0;
    const total = 2 * s.cardW + 8, x0 = (VW - total) / 2;
    return { x: x0 + s.cardW / 2 + col * (s.cardW + 8), y: s.cardsY + s.cardH / 2 + row * (s.cardH + 8) };
  }
  function initB4() {
    B4.cards = LIFE.map((o, i) => {
      const h = lifeHome(i);
      return new Card({ id: o.id, kind: 'life', label: o.label, short: o.short, icon: o.icon, ans: o.ans, w: LAY.s4.cardW, h: LAY.s4.cardH, x: h.x, y: h.y, hx: h.x, hy: h.y });
    });
    B4.solved = false;
  }
  function binAt(p) {
    for (let i = 0; i < BINS.length; i++) if (inRect(p, binRect(i), 4)) return BINS[i].id;
    return null;
  }
  /* 상자 속 카드를 쌓아서 배치 */
  function layoutBins(animate) {
    BINS.forEach((b, bi) => {
      const r = binRect(bi), list = B4.cards.filter((c) => c.bin === b.id && c !== DR.card).sort((p, q) => p.order - q.order);
      const top = r.y + 58, bodyH = r.h - 58 - 8;
      const ph = Math.min(PHONE ? 34 : 38, (bodyH - (list.length - 1) * 4) / Math.max(1, list.length));
      list.forEach((c, i) => {
        const x = r.x + r.w / 2, y = top + ph / 2 + i * (ph + 4);
        c.pw = r.w - 14; c.ph = ph;
        if (animate) goto(c, x, y, 1, 0.36); else { c.x = x; c.y = y; }
      });
    });
  }
  function placeLife(c, binId) {
    c.bin = binId; c.ok = 0; c.bad = 0; c.order = ++placeLife.n;
    Sound.tone(660, 0.07, 'triangle', 0.06);
    const r = binRect(BINS.findIndex((b) => b.id === binId));
    FX.burst(r.x + r.w / 2, r.y + 40, { count: 8, speed: 80, life: 0.5, size: 3, gravity: 60, colors: [BIN_BY[binId].col, '#ffffff'] });
    layoutBins(true);
  }
  placeLife.n = 0;
  function drawLifeCard(c) {
    if (c.bin) {
      const w = c.pw || 130, h = c.ph || 34;
      ctx.save();
      ctx.translate(c.x + (c.bad > 0 ? Math.sin(c.bad * 40) * 4 * Math.min(1, c.bad) : 0), c.y - c.lift * 5);
      const sc = c.s * (1 + c.lift * 0.06); ctx.scale(sc, sc);
      softShadow(-w / 2, -h / 2, w, h, 10, 5, 2, 'rgba(30,50,100,.2)');
      if (c.lift > 0.02) { ctx.globalAlpha = c.lift; softShadow(-w / 2, -h / 2, w, h, 10, 16, 8, 'rgba(30,50,100,.3)'); ctx.globalAlpha = 1; }
      ctx.fillStyle = '#fff'; D.roundRect(-w / 2, -h / 2, w, h, 10); ctx.fill();
      const ring = c.ok > 0 ? COL.good : c.bad > 0 ? COL.bad : null;
      if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = 2.5; D.roundRect(-w / 2, -h / 2, w, h, 10); ctx.stroke(); }
      ctx.font = Math.min(20, h - 12) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
      ctx.fillText(c.icon, -w / 2 + 18, 1);
      if (h >= 24) text(-w / 2 + 34, 5, c.short, { size: 13.5, weight: 800, color: COL.ink, align: 'left' });
      if (c.ok > 0) D.check(w / 2 - 12, 0, 8, 1);
      ctx.restore();
      return;
    }
    cardBody(c, c.w, c.h);
    ctx.font = (PHONE ? 26 : 32) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    ctx.fillText(c.icon, -c.w / 2 + (PHONE ? 26 : 30), 2);
    const fs = PHONE ? 13.5 : 15.5, tx = -c.w / 2 + (PHONE ? 50 : 56), maxW = c.w - (PHONE ? 58 : 64);
    if (!c.lines) {
      ctx.font = D.font(fs, 800);
      const words = c.label.split(' '), lines = []; let cur = '';
      words.forEach((w) => { const t2 = cur ? cur + ' ' + w : w; if (!cur || ctx.measureText(t2).width <= maxW) cur = t2; else { lines.push(cur); cur = w; } });
      if (cur) lines.push(cur);
      c.lines = lines;
    }
    const n = c.lines.length;
    c.lines.forEach((ln, i) => text(tx, 5 + (i - (n - 1) / 2) * (fs + 3), ln, { size: fs, weight: 800, color: COL.ink, align: 'left' }));
    cardEnd(c, c.w, c.h);
  }
  function drawSort(t) {
    // 안내
    text(VW / 2, PHONE ? 262 - 6 : 286, '카드를 끌어 알맞은 이름의 상자에 넣어요', { size: 14.5, weight: 800, color: COL.muted });
    BINS.forEach((b, i) => {
      const r = binRect(i), hov = B4.hover === b.id && DR.card;
      ctx.save();
      panel(r.x, r.y, r.w, r.h, 16, '#fff', hov ? 16 : 8, 3, hov ? rgba(b.col, 0.45) : 'rgba(30,50,100,.16)');
      ctx.beginPath(); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.clip();
      vgrad(ctx, r.x, r.y, r.w, 54, rgba(b.col, 0.95), shade(b.col, -0.12));
      ctx.fillStyle = rgba(b.col, hov ? 0.14 : 0.06); ctx.fillRect(r.x, r.y + 54, r.w, r.h - 54);
      ctx.restore();
      ctx.strokeStyle = hov ? b.col : rgba(b.col, 0.5); ctx.lineWidth = hov ? 4 : 2.5; D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.stroke();
      text(r.x + r.w / 2, r.y + 28, b.name, { size: 22, weight: 800, color: '#fff' });
      text(r.x + r.w / 2, r.y + 46, b.pair, { size: 13, weight: 800, color: 'rgba(255,255,255,.92)' });
      const n = B4.cards.filter((c) => c.bin === b.id).length;
      if (!n) text(r.x + r.w / 2, r.y + 58 + (r.h - 66) / 2 + 4, '여기에 넣기', { size: 13.5, weight: 700, color: rgba(b.col, 0.55) });
    });
    const rest = B4.cards.filter((c) => c !== DR.card && !c.bin);
    const placed = B4.cards.filter((c) => c !== DR.card && c.bin);
    rest.forEach(drawLifeCard); placed.forEach(drawLifeCard);
    if (DR.card && B4.cards.indexOf(DR.card) >= 0) drawLifeCard(DR.card);
  }
  function checkB4() {
    return judge(B4.cards, (c) => c.bin === c.ans,
      (n) => '아직 상자에 넣지 않은 카드가 ' + n + '장 있어요. 일곱 장을 모두 넣어 보세요.',
      (n) => n + '장은 다른 상자에 들어가요. 빨간 카드는 곧 돌아가요. 처음 상태와 나중 상태를 생각해 보세요.');
  }

  /* =========================================================
     장면 전환 · 화면 요소 · 입력
     ========================================================= */
  const SCENES = {
    obs: { label: '👀 생활 속 상태 변화', hint: '🃏 카드를 눌러 장면을 보고, 알맞은 화살표에 끌어 놓으세요' },
    names: { label: '🏷️ 상태 변화 6가지', hint: '👆 화살표를 눌러 입자의 변화를 보고, 이름 카드를 놓으세요' },
    exp: { label: '⚖️ 부피와 질량 측정', hint: '🔘 버튼을 눌러 상태를 바꾸고, 저울과 부피를 비교해 보세요' },
    sort: { label: '🏠 생활 속 상태 변화 분류', hint: '✋ 카드를 끌어 알맞은 이름의 상자에 넣어 보세요' },
  };
  const hintEl = $('#stageHint');
  function showHint(t, ms) { hintEl.textContent = t; hintEl.classList.remove('hide'); clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5200); }
  function hideHint() { hintEl.classList.add('hide'); }
  const ready = {};
  function resetScene(name) {
    FX.clear();
    if (name === 'obs') { initB1(); popIn(B1.cards); setViewer('ice'); VWR.watched = {}; }
    else if (name === 'names') { initB2(); popIn(B2.cards); TH.arrow = null; TH.phase = 'idle'; TH.reveal = 0; TH.fade = 1; TH.box.reset(1); }
    else if (name === 'exp') selectExp(X.key, true);
    else if (name === 'sort') { initB4(); popIn(B4.cards); }
    ready[name] = true;
  }
  function resetExpAll() { X.done = {}; X.fresh = {}; EXP_KEYS.forEach((k) => { X.rec[k] = { mB: EXPS[k].mass, mA: null, vB: EXPS[k].vA, vA: null }; }); }
  function setScene(name, reset) {
    const changed = S.scene !== name;
    if (changed) { DR.card = null; S.hoverArrow = null; B4.hover = null; }
    S.scene = name;
    if (changed) { S.sceneT = 0; FX.clear(); }
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
    const free = !!(game && game.free);
    $('#sceneSeg').hidden = !free;
    $('#tbLabel').hidden = free && window.innerWidth < 1000;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    $('#zoomBtn').setAttribute('aria-pressed', S.zoom ? 'true' : 'false');
    // 실험 고르기
    const e = EXPS[X.key];
    $$('#expSeg button').forEach((b) => b.classList.toggle('on', b.dataset.exp === X.key));
    const rb = $('#runBtn');
    rb.textContent = X.dir !== 0 ? '⏳ 변하는 중…' : (X.f < 0.5 ? e.fwd : e.back);
    rb.disabled = X.dir !== 0;
    rb.classList.toggle('btn-primary', X.f < 0.5);
    $('#expNote').textContent = e.note;
    lastFree = free;
  }
  $('#zoomBtn').addEventListener('click', () => { Sound.click(); S.zoom = !S.zoom; refreshUI(); });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); resetScene(S.scene); S.sceneT = 0; showHint(SCENES[S.scene].hint, 5000); refreshUI(); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  $$('#expSeg button').forEach((b) => b.addEventListener('click', () => { if (X.dir !== 0) return; selectExp(b.dataset.exp); }));
  $('#runBtn').addEventListener('click', () => { hideHint(); runExp(); });

  /* ---------- 캔버스 입력 ---------- */
  function boardOf() { return S.scene === 'obs' ? B1 : S.scene === 'names' ? B2 : S.scene === 'sort' ? B4 : null; }
  function snapBack(c) {
    if (S.scene === 'sort') { if (c.bin) layoutBins(true); else goto(c, c.hx, c.hy, 1, 0.34); return; }
    if (c.slot) goto(c, AR[c.slot].slot.cx, AR[c.slot].slot.cy, 1, 0.3); else goto(c, c.hx, c.hy, 1, 0.34);
  }
  function tapArrowObs(a) {
    const c = B1.cards.find((x) => x.id === B1.sel);
    if (c && !c.locked && c.id) {
      const occ = slotCard(B1.cards, a.id);
      if (occ && occ.locked) return;
      placeCard(B1, c, a.id);
    }
  }
  function tapArrowNames(a) {
    const sel = B2.cards.find((x) => x.id === B2.sel);
    if (sel && !sel.locked) {
      const occ = slotCard(B2.cards, a.id);
      if (occ && occ.locked) { playArrow(a.id); return; }
      placeCard(B2, sel, a.id);
      B2.sel = null; B2.cards.forEach((c) => SciSim.tween(c, { sel: 0 }, { duration: 0.15 }));
    } else playArrow(a.id);
  }
  const canGrab = (p) => { const B = boardOf(); if (!B) return null; const c = cardAt(B.cards, p); return c; };
  SciSim.pointer(view, {
    hover(p) {
      if (canGrab(p)) return canGrab(p).locked ? 'pointer' : 'grab';
      if (S.scene === 'obs') return (inRect(p, LAY.viewer) || arrowHit(p)) ? 'pointer' : null;
      if (S.scene === 'names') return arrowHit(p) ? 'pointer' : null;
      return null;
    },
    down(p) {
      hideHint();
      const B = boardOf();
      if (B) {
        const c = cardAt(B.cards, p);
        if (c) {
          if (S.scene === 'obs') setViewer(c.id);
          if (c.locked) { if (S.scene === 'names' && c.slot) playArrow(c.slot); return false; }
          if (c.bad > 0) return false;
          DR.card = c; DR.board = B; DR.offX = p.x - c.x; DR.offY = p.y - c.y; DR.sx = p.x; DR.sy = p.y; DR.moved = false;
          SciSim.tween(c, { lift: 1 }, { duration: 0.15 });
          B.cards.splice(B.cards.indexOf(c), 1); B.cards.push(c);
          Sound.click();
          return true;
        }
      }
      if (S.scene === 'obs') {
        if (inRect(p, LAY.viewer)) { VWR.t = 0; VFX.clear(); Sound.click(); return false; }
        const a = slotHit(p) || arrowHit(p);
        if (a) tapArrowObs(a);
      } else if (S.scene === 'names') {
        const a = arrowHit(p) || slotHit(p);
        if (a) tapArrowNames(a);
        else if (B2.sel) { B2.sel = null; B2.cards.forEach((c) => SciSim.tween(c, { sel: 0 }, { duration: 0.15 })); }
      }
      return false;
    },
    move(p) {
      const c = DR.card;
      if (!c) return;
      if (Math.hypot(p.x - DR.sx, p.y - DR.sy) > 7) DR.moved = true;
      if (!DR.moved) return;
      c.x = clamp(p.x - DR.offX, 20, VW - 20); c.y = clamp(p.y - DR.offY, 20, VH - 20);
      if (S.scene === 'sort') B4.hover = binAt(p);
      else { const a = slotHit(p); S.hoverArrow = a ? a.id : null; }
    },
    up(p) {
      const c = DR.card;
      if (!c) return;
      const B = DR.board;
      DR.card = null; DR.board = null;
      S.hoverArrow = null; B4.hover = null;
      SciSim.tween(c, { lift: 0 }, { duration: 0.2 });
      if (!DR.moved) {                                           // 눌러서 고르기
        if (S.scene === 'obs') setViewer(c.id);
        else if (S.scene === 'names') {
          if (c.slot) playArrow(c.slot);
          else {
            B2.sel = B2.sel === c.id ? null : c.id;
            B2.cards.forEach((x) => SciSim.tween(x, { sel: x.id === B2.sel ? 1 : 0 }, { duration: 0.15 }));
          }
        }
        snapBack(c);
        return;
      }
      if (S.scene === 'sort') {
        const bin = binAt(p);
        if (bin) placeLife(c, bin); else { c.bin = null; layoutBins(true); goto(c, c.hx, c.hy, 1, 0.38); }
        return;
      }
      const a = slotHit(p);
      if (a) {
        const occ = slotCard(B.cards, a.id);
        if (occ && occ.locked) { returnCard(c); return; }
        placeCard(B, c, a.id);
        if (S.scene === 'names') { B2.sel = null; B2.cards.forEach((x) => (x.sel = 0)); }
      } else returnCard(c);
    },
  });
  // 휴대폰: 카드가 아닌 곳을 끌면 페이지가 스크롤되도록
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
  function allCards() { return [].concat(B1.cards, B2.cards, B4.cards); }
  function update(dt) {
    S.sceneT += dt;
    S.nodeK = SciSim.approach(S.nodeK, on('lens') ? 1 : 0, dt, 4);
    FX.update(dt);
    allCards().forEach((c) => {
      if (c.bad > 0) {
        c.bad -= dt;
        if (c.bad <= 0) { c.bad = 0; if (!c.ok) { returnCard(c); if (c.kind === 'life') layoutBins(true); } }
      }
    });
    if (S.scene === 'obs') updateViewer(dt);
    else if (S.scene === 'names') { updateTheater(dt); for (const k in NODEBOX) NODEBOX[k].step(dt); }
    else if (S.scene === 'exp') updateExp(dt);
  }
  function ringRect(r, t, rad) {
    const a = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.35 + 0.5 * a); ctx.lineWidth = 4; D.roundRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, (rad || 16) + 4); ctx.stroke(); ctx.restore();
    newBadge(r.x + r.w - 20, r.y - 4);
  }
  let lastDt = 0.016;
  function draw(t) {
    view.clear(BG);
    if (S.scene === 'obs') drawObs(t);
    else if (S.scene === 'names') drawNames(t);
    else if (S.scene === 'exp') drawExp(t);
    else if (S.scene === 'sort') drawSort(t);
    FX.draw(ctx);
    drawChecks(lastDt);
    if (S.scene === 'obs' && isNew('cards')) ringRect({ x: LAY.trayX - 8, y: LAY.trayY - 8, w: LAY.trayCols * LAY.cardW + (LAY.trayCols - 1) * LAY.trayGap + 16, h: 2 * LAY.cardH + LAY.trayRowGap + 16 }, t);
    if (S.scene === 'names' && isNew('lens')) ringRect(LAY.theater, t);
    if (S.scene === 'exp' && isNew('exp')) ringRect(LAY.s3.macro, t);
    if (S.scene === 'sort' && isNew('sort')) ringRect({ x: 6, y: PHONE ? 258 : 296, w: VW - 12, h: PHONE ? 420 : 252 }, t);
    if (S.sceneT < 0.35) { ctx.save(); ctx.globalAlpha = 1 - ease.outCubic(S.sceneT / 0.35); ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH); ctx.restore(); }
  }
  /* 미션 성공 순간을 감지해 화면 위 축하 효과 */
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

  /* ---------- 시작 준비 ---------- */
  buildThumbs(); initNodes(); initTheater(); initExp(); initB1(); initB2(); initB4();

  /* =========================================================
     미션
     ========================================================= */
  const mark = (b) => (b ? '✅' : '⬜');

  // 퀴즈 그림: 같은 수의 에탄올 입자가 액체일 때와 기체일 때
  const FIG_ETH = (function () {
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    function dot(x, y) {
      return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="8.5" fill="#22b39a"/><circle cx="' + (x - 2.8).toFixed(1) + '" cy="' + (y - 3).toFixed(1) + '" r="2.6" fill="#fff" opacity=".6"/>';
    }
    function panel(ox, gas) {
      let s = '<rect x="' + ox + '" y="26" width="140" height="112" rx="12" fill="#f3fbf8" stroke="#b6dfd6"/>';
      if (!gas) { for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) s += dot(ox + 28 + c * 24 + (r % 2) * 9 + rnd() * 3, 112 - r * 21 + rnd() * 3); }
      else { for (let i = 0; i < 12; i++) s += dot(ox + 20 + (i % 4) * 34 + rnd() * 12, 48 + Math.floor(i / 4) * 34 + rnd() * 12); }
      return s;
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 146" width="320" role="img" aria-label="액체 에탄올과 기체 에탄올의 입자 모형: 입자의 수와 크기는 같고 입자 사이의 거리만 다르다">' +
      '<text x="80" y="17" text-anchor="middle" font-size="13" font-weight="700" fill="#5d6879">액체 에탄올</text>' +
      '<text x="260" y="17" text-anchor="middle" font-size="13" font-weight="700" fill="#5d6879">기체 에탄올</text>' +
      panel(10, false) + panel(190, true) +
      '<path d="M158 82 h18" stroke="#8b5cf6" stroke-width="3"/><path d="M176 75 l9 7 -9 7z" fill="#8b5cf6"/></svg>';
  })();

  const chip = (a) => (TH.watched[a.id] ? '✅' : '⬜') + STATE[a.from].name[0] + '→' + STATE[a.to].name[0];

  game = SciSim.game({
    simId: 'm1-state-change',
    mount: '#game',
    badge: '상태 변화 탐정',
    homeHref: '../../index.html#g1',
    featureLabels: {
      cards: '🃏 관찰 카드와 상태 화살표',
      lens: '🔍 입자 모형 (세 상태와 변하는 과정)',
      names: '🏷️ 이름 카드',
      exp: '⚖️ 전자저울과 밀폐 용기',
      sort: '🗂️ 상태 변화 분류 상자',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onMissionStart(m) {
      if (game && game.free) return;
      if (m.scene) setScene(m.scene, false);
      refreshUI();
    },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '생활 속 상태 변화 관찰', short: '관찰', icon: '👀', phase: '관찰',
        features: ['cards'],
        intro: '<p class="si-q">❓ 탐구 질문: 얼음이 녹아 물이 되면 무게가 달라질까?</p>' +
          '<p>이 질문에 답하기 전에, 먼저 우리 둘레에서 물질의 <b>상태</b>가 변하는 모습을 관찰해요. 여섯 장면 카드를 눌러 보고, <b>어떤 상태에서 어떤 상태로</b> 변하는지 알맞은 화살표에 놓아요.</p>',
        setup() { setScene('obs', true); },
        recap: '물질은 <b>고체 · 액체 · 기체</b> 세 가지 상태로 있어요. 한 상태에서 다른 상태로 변하는 방향은 모두 <b>6가지</b>예요.',
        summary: '<p>물질은 <b>고체 · 액체 · 기체</b> 세 가지 상태로 있고, 한 상태에서 다른 상태로 변할 수 있다.</p>' +
          '<ul><li>고체 → 액체: 얼음이 녹는다</li><li>액체 → 고체: 촛농이 굳는다</li>' +
          '<li>액체 → 기체: 물이 끓는다, 젖은 빨래가 마른다</li><li>기체 → 액체: 차가운 컵 겉면에 물방울이 맺힌다</li>' +
          '<li>고체 → 기체: 드라이아이스가 작아진다</li><li>기체 → 고체: 겨울 유리창에 성에가 낀다</li></ul>',
        missions: [
          {
            title: '여섯 장면 분류하기', scene: 'obs', manual: true,
            goal: '카드를 눌러 장면을 관찰하고, <b>어떤 상태 → 어떤 상태</b>로 변하는지 알맞은 화살표에 놓은 뒤 <b>✔ 확인하기</b>를 누르세요.',
            hint: '화살표는 <b>처음 상태 → 나중 상태</b> 방향이에요. 예를 들어 얼음이 녹으면 <b>고체에서 액체로</b> 변해요.',
            setup() { if (B1.solved) resetScene('obs'); },
            check: () => checkB1(),
            onWin() { B1.solved = true; B1.cards.forEach((c) => { c.ok = 1; c.locked = true; }); ARROWS.forEach((a, i) => setTimeout(() => FX.burst(a.slot.cx, a.slot.cy, { count: 10, speed: 120, life: 0.7, size: 3.5 }), i * 90)); celebrate(PHONE ? VW / 2 : 230, PHONE ? 560 : 282); },
            status: () => '화살표에 놓은 카드 <b>' + B1.cards.filter((c) => c.slot).length + ' / 6</b>',
            explain: '물질이 고체·액체·기체 사이에서 <b>다른 상태로 변하는 것</b>을 <b>상태 변화</b>라고 해요. 화살표는 ‘처음 상태 → 나중 상태’를 나타내고, 방향은 모두 6가지예요.',
          },
          {
            type: 'quiz', title: '컵 겉면의 물방울', scene: 'obs',
            goal: '차가운 음료가 든 컵 겉면에 물방울이 맺혔어요. 이 물은 어디에서 왔을까요?',
            choices: ['컵 속의 음료가 유리를 통과해 스며 나왔다', '공기 속의 수증기(기체)가 차가운 컵 표면에서 액체로 변했다', '컵의 유리가 녹아서 물이 되었다', '컵 겉면에 붙어 있던 먼지가 물방울이 되었다'],
            answer: 1,
            feedback: ['유리에는 물이 지나갈 구멍이 없어요. 빈 컵에 얼음만 넣어도 겉면에 물방울이 맺혀요.', '', '유리는 물로 변하지 않아요. 새로 생긴 물이 어디에서 왔는지 생각해 보세요.', '먼지는 물이 아니에요. 물방울은 물로 이루어져 있어요.'],
            explain: '공기 속에는 눈에 보이지 않는 <b>수증기(기체)</b>가 들어 있어요. 수증기가 차가운 컵 표면에 닿아 <b>액체</b>인 물방울로 변해요. (기체 → 액체)',
          },
        ],
      },
      {
        title: '상태 변화 6가지의 이름', short: '6가지 이름', icon: '🏷️', phase: '탐구',
        features: ['lens', 'names'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 상태가 변하는 방향이 6가지라는 것을 알았어요.</div>' +
          '<p>화살표를 눌러 상태가 변할 때 <b>입자의 배열과 움직임</b>이 어떻게 달라지는지 살펴보고, 여섯 가지 변화에 이름을 붙여요.</p>' +
          '<ul><li><b>융해</b>: 고체가 녹아 액체가 됨 / <b>응고</b>: 액체가 굳어 고체가 됨</li>' +
          '<li><b>기화</b>: 액체가 <u>기체</u>가 됨 (증발·끓음) / <b>액화</b>: 기체가 <u>액체</u>가 됨</li>' +
          '<li><b>승화</b>: 액체를 거치지 않고 고체 ⇄ 기체로 곧바로 변함 (두 방향 모두)</li></ul>',
        setup() { setScene('names', true); },
        recap: '고체 → 액체 <b>융해</b>, 액체 → 고체 <b>응고</b>, 액체 → 기체 <b>기화</b>, 기체 → 액체 <b>액화</b>, 고체 ⇄ 기체 <b>승화</b>예요. 상태가 변하면 입자의 <b>배열</b>이 달라져요.',
        summary: '<ul><li><b>융해</b>: 고체 → 액체 (얼음이 녹는다)</li><li><b>응고</b>: 액체 → 고체 (촛농이 굳는다)</li>' +
          '<li><b>기화</b>: 액체 → 기체 (물이 끓는다, 빨래가 마른다)</li><li><b>액화</b>: 기체 → 액체 (이슬이 맺힌다)</li>' +
          '<li><b>승화</b>: 고체 → 기체, 기체 → 고체 (드라이아이스, 성에)</li></ul>' +
          '<p>상태가 변하면 입자의 <b>배열</b>(규칙적인 정도)과 <b>사이 거리</b>, <b>운동</b>이 달라진다.</p>',
        missions: [
          {
            title: '입자의 변화 지켜보기', scene: 'names',
            goal: '여섯 화살표를 모두 눌러, 상태가 변할 때 입자의 <b>배열과 움직임</b>이 어떻게 달라지는지 끝까지 지켜보세요.',
            hint: '화살표나 그 위의 칸을 눌러요. 변화가 끝나면 ✅ 가 표시돼요.',
            setup() { TH.watched = {}; TH.arrow = null; TH.phase = 'idle'; TH.reveal = 0; },
            check: () => watchedCount() >= 6,
            hold: 0.5,
            status: () => '<b>' + watchedCount() + ' / 6</b> ' + ARROWS.map(chip).join(' '),
            explain: '고체는 입자가 <b>규칙적으로 배열</b>되어 제자리에서 진동하고, 액체는 입자가 <b>불규칙하게</b> 자리를 바꾸며 움직이고, 기체는 입자 사이가 <b>매우 멀고</b> 빠르게 움직여요. 상태가 변하면 입자의 배열이 달라져요.',
          },
          {
            title: '이름 붙이기', scene: 'names', manual: true,
            goal: '이름 카드 6장을 알맞은 화살표에 놓고 <b>✔ 확인하기</b>를 누르세요. (<b>승화</b> 카드는 두 장이에요.)',
            hint: '<b>기화</b>는 기체로, <b>액화</b>는 액체로 되는 변화예요. 액체를 거치지 않고 고체와 기체가 곧바로 바뀌는 두 변화는 모두 <b>승화</b>예요.',
            setup() { if (B2.solved) initB2(), popIn(B2.cards); },
            check: () => checkB2(),
            onWin() { B2.solved = true; B2.cards.forEach((c) => { c.ok = 1; c.locked = true; }); ARROWS.forEach((a, i) => setTimeout(() => FX.burst(a.slot.cx, a.slot.cy, { count: 10, speed: 120, life: 0.7, size: 3.5 }), i * 90)); celebrate(PHONE ? VW / 2 : 230, PHONE ? 560 : 282); },
            status: () => '화살표에 놓은 이름 카드 <b>' + B2.cards.filter((c) => c.slot).length + ' / 6</b>',
            explain: '고체 → 액체 <b>융해</b>, 액체 → 고체 <b>응고</b>, 액체 → 기체 <b>기화</b>, 기체 → 액체 <b>액화</b>예요. 액체를 거치지 않는 고체 → 기체와 기체 → 고체는 모두 <b>승화</b>예요.',
          },
          {
            type: 'quiz', title: '같은 이름, 다른 방향', scene: 'names',
            goal: '드라이아이스가 작아지는 것과 겨울 유리창에 성에가 끼는 것은 각각 무슨 상태 변화일까요?',
            choices: ['드라이아이스는 기화, 성에는 응고', '둘 다 승화', '드라이아이스는 승화, 성에는 액화', '둘 다 액체를 거치므로 융해와 응고'],
            answer: 1,
            feedback: ['두 현상 모두 액체를 거치지 않아요. 기화·응고는 액체가 관련된 변화예요.', '', '성에는 기체가 액체를 거치지 않고 곧바로 고체가 된 거예요. 액화는 기체 → 액체예요.', '드라이아이스가 작아질 때 물이 고이지 않았고, 성에는 물이 얼어 생긴 것이 아니에요. 액체를 거치지 않았어요.'],
            explain: '드라이아이스(고체 → 기체)와 성에(기체 → 고체)는 모두 <b>액체를 거치지 않고</b> 곧바로 변해요. 이런 두 방향의 변화를 모두 <b>승화</b>라고 해요.',
          },
        ],
      },
      {
        title: '상태가 변하면 부피와 질량은?', short: '부피와 질량', icon: '⚖️', phase: '실험',
        features: ['exp'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 상태가 변하면 입자의 <b>배열</b>이 달라지는 것을 봤어요.</div>' +
          '<p>전자저울 위에 <b>밀폐한 용기</b>를 올리고, 상태가 변하기 전과 후의 <b>질량</b>과 <b>부피</b>를 측정해요. 🔍 입자 모형으로 입자의 수와 거리도 살펴봐요.</p>',
        setup() { setScene('exp', true); },
        recap: '상태가 변해도 <b>질량은 변하지 않고</b> <b>부피는 변해요</b>. 입자의 수와 종류는 그대로이고, 입자 사이의 거리와 배열만 달라지기 때문이에요.',
        summary: '<ul><li>상태가 변할 때 <b>질량은 변하지 않는다</b>. 입자의 수와 종류가 그대로이기 때문이다.</li>' +
          '<li>상태가 변할 때 <b>부피는 변한다</b>. 입자 사이의 거리와 배열이 달라지기 때문이다.</li>' +
          '<li>액체 → 기체는 부피가 아주 크게 늘어난다. 양초는 굳으면 부피가 줄고, <b>물은 얼면 부피가 늘어난다</b>.</li>' +
          '<li>상태가 변해도 물질의 성질은 변하지 않는다. (입자의 종류가 같다)</li></ul>' +
          '<p class="note">※ 기체의 질량을 저울로 잴 때는 공기의 부력 때문에 값이 아주 조금 달라질 수 있어요.</p>',
        missions: [
          {
            title: '질량과 부피 재기', scene: 'exp',
            goal: '🕯️ 양초, 🧊 물, 🧪 에탄올 실험을 각각 해 보고, 상태가 변하기 전과 후의 <b>질량과 부피</b>를 비교하세요.',
            hint: '실험을 고르고 버튼을 눌러 상태를 바꿔요. 저울의 숫자와 부피 표시를 잘 보고, 🔍 입자 모형도 살펴보세요.',
            setup() { resetExpAll(); selectExp('wax', true); },
            check: () => EXP_KEYS.every((k) => X.done[k]),
            hold: 0.8,
            status: () => '🕯️ 양초 ' + mark(X.done.wax) + ' · 🧊 물 ' + mark(X.done.water) + ' · 🧪 에탄올 ' + mark(X.done.eth),
            explain: '세 실험 모두 상태가 변해도 저울의 숫자(<b>질량</b>)는 그대로였고 <b>부피</b>는 달라졌어요. 양초는 굳으면서 부피가 줄고, <b>물은 얼면서 부피가 늘고</b>, 에탄올은 기체가 되면서 부피가 크게 늘었어요.<br><small>※ 기체의 질량을 저울로 잴 때는 공기의 부력 때문에 값이 아주 조금 달라질 수 있어요.</small>',
          },
          {
            type: 'quiz', title: '질량은 어떻게 될까?', scene: 'exp',
            goal: '에탄올이 기체로 변해 봉지가 크게 부풀었어요. 상태가 변하는 동안 질량은 어떻게 되었을까요?',
            choices: ['기체는 가벼우므로 질량이 줄어든다', '부피가 커졌으므로 질량도 늘어난다', '질량은 변하지 않는다', '기체는 질량이 없으므로 0이 된다'],
            answer: 2,
            feedback: ['봉지 속에는 에탄올 입자가 모두 그대로 남아 있어요. 입자의 수가 같으면 질량도 같아요.', '부피가 커진 것은 입자 사이가 멀어졌기 때문이에요. 입자의 수는 늘지 않았어요.', '', '기체도 입자로 이루어져 있어서 질량이 있어요. 저울의 숫자도 그대로였어요.'],
            explain: '질량은 물질이 가지고 있는 <b>고유한 양</b>이에요. 상태가 변해도 입자의 <b>수와 종류</b>가 그대로이므로 질량은 변하지 않아요.',
          },
          {
            type: 'quiz', title: '부피가 커진 까닭', scene: 'exp',
            goal: '에탄올이 기체가 되면서 부피가 크게 늘었어요. 입자 모형으로 알맞게 설명한 것은 무엇일까요?',
            figure: FIG_ETH,
            choices: ['입자의 수가 늘어났다', '입자의 크기가 커졌다', '입자의 수와 크기는 그대로이고, 입자 사이의 거리가 멀어졌다', '입자가 다른 물질의 입자로 바뀌었다'],
            answer: 2,
            feedback: ['그림에서 입자는 모두 12개로 같아요. 입자가 새로 생기지 않아요.', '그림에서 입자의 크기는 같아요. 입자는 커지지 않아요.', '', '기체가 되어도 여전히 에탄올이에요. 상태가 변해도 물질의 성질은 변하지 않아요.'],
            explain: '상태가 변할 때 입자의 <b>수와 크기, 종류</b>는 그대로이고 입자 사이의 <b>거리와 배열</b>만 달라져요. 그래서 부피는 변하지만 질량과 물질의 성질은 변하지 않아요.',
          },
        ],
      },
      {
        title: '생활 속 상태 변화 찾기', short: '적용', icon: '🏠', phase: '적용',
        features: ['sort'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 상태 변화 6가지의 이름과, 상태가 변해도 질량은 그대로라는 것을 알았어요.</div>' +
          '<p>생활 속 현상 일곱 가지를 상태 변화의 <b>이름별 상자</b>에 나누고, 배운 내용으로 설명해 봐요.</p>',
        setup() { setScene('sort', true); },
        recap: '생활 속 현상도 상태 변화의 이름으로 나눌 수 있어요. 상태가 변할 때 <b>질량은 그대로</b>이고 부피는 변해요. 물은 얼 때 부피가 늘어나요.',
        summary: '<ul><li><b>융해</b>: 아이스크림이 녹는다</li><li><b>응고</b>: 고드름이 생긴다</li><li><b>기화</b>: 젖은 빨래가 마른다</li>' +
          '<li><b>액화</b>: 안개가 끼고 이슬이 맺힌다</li><li><b>승화</b>: 나프탈렌이 작아진다, 유리창에 성에가 낀다</li></ul>' +
          '<p>물이 얼면 부피가 늘어나서 가득 찬 병이 깨질 수 있다. 질량은 변하지 않는다.</p>',
        missions: [
          {
            title: '생활 속 상태 변화 분류', scene: 'sort', manual: true,
            goal: '생활 속 현상 카드 7장을 알맞은 이름의 상자에 넣고 <b>✔ 확인하기</b>를 누르세요.',
            hint: '처음 상태와 나중 상태를 먼저 떠올려 보세요. 안개와 이슬은 공기 속 수증기가 액체로 변한 거예요.',
            setup() { if (B4.solved) { initB4(); popIn(B4.cards); } },
            check: () => checkB4(),
            onWin() { B4.solved = true; B4.cards.forEach((c) => { c.ok = 1; c.locked = true; }); BINS.forEach((b, i) => { const r = binRect(i); setTimeout(() => FX.burst(r.x + r.w / 2, r.y + 60, { count: 10, speed: 120, life: 0.7, size: 3.5 }), i * 90); }); celebrate(VW / 2, PHONE ? 330 : 240); },
            status: () => '상자에 넣은 카드 <b>' + B4.cards.filter((c) => c.bin).length + ' / 7</b>',
            explain: '고드름은 물이 <b>얼어(응고)</b>, 안개와 이슬은 수증기가 <b>액체로 변해(액화)</b>, 아이스크림은 <b>녹아(융해)</b>, 젖은 빨래는 물이 <b>기체가 되어(기화)</b>, 나프탈렌과 성에는 액체를 거치지 않고 변하는 <b>승화</b>예요.',
          },
          {
            type: 'quiz', title: '꽁꽁 언 유리병', scene: 'sort',
            goal: '물이 가득 든 유리병을 냉동실에 넣었더니 병이 깨졌어요. 까닭을 바르게 설명한 것은 무엇일까요?',
            choices: ['물이 얼면서 질량이 늘어났기 때문이다', '물이 얼면서(응고) 부피가 늘어났기 때문이다', '물 입자의 크기가 커졌기 때문이다', '물이 기체로 변해 병 밖으로 나갔기 때문이다'],
            answer: 1,
            feedback: ['물이 얼어도 질량은 변하지 않아요. 저울로 재면 같아요.', '', '입자의 크기는 변하지 않아요. 입자의 배열이 달라져 부피가 늘어요.', '냉동실에서 물은 얼어요. 기체가 되는 변화가 아니에요.'],
            explain: '물이 얼면(응고) 입자의 <b>배열</b>이 달라져 <b>부피가 늘어나요</b>. 질량과 입자의 크기는 그대로예요. 그래서 가득 찬 병이 깨질 수 있어요.',
          },
          {
            type: 'quiz', title: '작아지는 나프탈렌', scene: 'sort',
            goal: '옷장 속 고체 나프탈렌이 점점 작아지고 냄새가 나요. 나프탈렌은 어디로 갔을까요?',
            choices: ['액체가 되어 옷에 스며들었다', '기체가 되어(승화) 공기 중으로 퍼졌다', '입자가 사라져 없어졌다', '입자의 크기가 작아졌다'],
            answer: 1,
            feedback: ['옷이 젖지 않았어요. 나프탈렌은 액체를 거치지 않고 변해요.', '', '입자는 없어지지 않아요. 눈에 보이지 않는 기체가 되어 퍼졌을 뿐이에요.', '입자의 크기는 변하지 않아요. 고체에서 기체가 되며 입자가 떠나가요.'],
            explain: '나프탈렌은 액체를 거치지 않고 곧바로 기체가 되는 <b>승화</b>를 해요. 입자는 없어지지 않고 기체가 되어 공기 중으로 퍼져 나가요. 그래서 냄새가 나요.',
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
    watchGame();
    if (lastFree !== !!(game && game.free)) refreshUI();
  });

  /* ---------- 점검용 (자동 테스트) ---------- */
  window.__sim = {
    get scene() { return S.scene; },
    setScene,
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / VW, y: r.top + (y * r.height) / VH }; },
    state() {
      return {
        scene: S.scene, viewer: VWR.id, sel: B1.sel, placed1: B1.cards.filter((c) => c.slot).length, placed2: B2.cards.filter((c) => c.slot).length, placed4: B4.cards.filter((c) => c.bin).length,
        th: { arrow: TH.arrow, phase: TH.phase, watched: Object.keys(TH.watched).length, counts: TH.box.counts() }, exp: { key: X.key, f: X.f, dir: X.dir, done: Object.assign({}, X.done) },
        cards1: B1.cards.map((c) => ({ id: c.id, slot: c.slot, ok: c.ok, bad: c.bad, x: Math.round(c.x), y: Math.round(c.y) })),
        cards2: B2.cards.map((c) => ({ id: c.id, label: c.label, slot: c.slot, ok: c.ok, x: Math.round(c.x), y: Math.round(c.y) })),
        cards4: B4.cards.map((c) => ({ id: c.id, bin: c.bin, ok: c.ok, x: Math.round(c.x), y: Math.round(c.y) })),
      };
    },
    solveObs() { B1.cards.forEach((c) => { const a = ARROWS.find((q) => q.ex === c.id); c.slot = a.id; c.x = a.slot.cx; c.y = a.slot.cy; c.s = 1; }); },
    wrongObs() { B1.cards.forEach((c, i) => { const a = ARROWS[(ARROWS.findIndex((q) => q.ex === c.id) + 1) % 6]; c.slot = null; }); const [c0, c1] = B1.cards; c0.slot = 'freeze'; c1.slot = 'melt'; B1.cards.slice(2).forEach((c) => { const a = ARROWS.find((q) => q.ex === c.id); c.slot = a.id; c.x = a.slot.cx; c.y = a.slot.cy; }); },
    seekViewer(id, p) { setScene('obs'); setViewer(id); VFX.clear(); const n = Math.round(p * SCN[id].dur * 60); for (let i = 0; i < n; i++) updateViewer(1 / 60); },
    bench(n) { const t0 = performance.now(); let mx = 0; for (let i = 0; i < n; i++) { const a = performance.now(); update(1 / 60); draw(now()); mx = Math.max(mx, performance.now() - a); } return { avg: (performance.now() - t0) / n, max: mx }; },
    watchAll() { ARROWS.forEach((a) => (TH.watched[a.id] = true)); },
    solveNames() { const used = {}; B2.cards.forEach((c) => { const a = ARROWS.find((q) => q.name === c.label && !used[q.id]); used[a.id] = 1; c.slot = a.id; c.x = a.slot.cx; c.y = a.slot.cy; c.s = 1; }); },
    expDone(key) { selectExp(key, true); X.f = 1; X.dir = 0; X.done[key] = true; X.rec[key].mA = EXPS[key].mass; X.rec[key].vA = EXPS[key].vB; X.badge = 1; X.flash = 1; refreshUI(); },
    solveSort() { B4.cards.forEach((c) => { c.bin = c.ans; c.order = ++placeLife.n; }); layoutBins(false); },
    wrongSort() { B4.cards.forEach((c, i) => { c.bin = i === 0 ? 'melt' : c.ans; c.order = ++placeLife.n; }); layoutBins(false); },
    B1, B2, B4, TH, X, VWR, ARROWS, LAY, PBox, D,
  };
})();
