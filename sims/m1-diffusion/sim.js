/* =========================================================
   중1 Ⅳ. 물질의 상태 변화 — 확산과 증발 [9과04-01]
   ① [관찰] 확산: 물에 떨어뜨린 잉크, 교실 한쪽에서 뿌린 향수 (🔍 입자 모형)
   ② [실험] 온도와 확산: 찬물(10 °C)과 뜨거운 물(60 °C)에 동시에 잉크
   ③ [관찰] 증발: 물 표면의 입자가 공기 중으로 날아감 + 빨래 빨리 말리기
   ④ [설명] 입자 운동: 확산·증발 사례 분류 → 입자는 스스로 끊임없이 운동한다
   ※ 정성적 설명에 주안점. 기화·끓음의 구분과 상태 변화는 다음 차시에서 다룸
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, fmt, Sound, toast } = SciSim;
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

  /* ---------- 화면 (태블릿 = 가로형 800×560, 휴대폰 = 세로형 440×620) ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 440 : 800, VH = PHONE ? 620 : 560;
  const BG = '#f6f9fe';
  const sprites = makeSprites();
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG, onResize: (v) => sprites.setScale(v.scale * v.dpr) });
  sprites.setScale(view.scale * view.dpr);
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();          // 반짝임, 물방울, 연기 등 장식 효과

  let game = null;
  let F = new Set();
  const on = (f) => (game && game.free) || F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));

  const COL = {
    ink: '#4c1d95', inkP: '#7c3aed', waterP: '#5fa8f5', water: '#7cc4ff',
    perfume: '#ec4899', air: '#a4b1c4', good: '#14a058', sub: '#8b5cf6', ink9: '#1b2333', muted: '#5d6879',
    cold: '#2563eb', hot: '#e2463b', vapor: '#5fa8f5',
  };

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

  /* =========================================================
     1. 잉크 농도장 (거시 화면): 격자 위의 확산 방정식
     ========================================================= */
  class InkField {
    constructor(gw, gh) {
      this.gw = gw; this.gh = gh; this.N = gw * gh;
      this.c = new Float32Array(this.N); this.t = new Float32Array(this.N);
      this.total = 0; this.u = 0; this.dirty = true;
      this.cv = document.createElement('canvas'); this.cv.width = gw; this.cv.height = gh;
      this.cx = this.cv.getContext('2d'); this.img = this.cx.createImageData(gw, gh);
      this.rgb = SciSim.color.hexToRgb(COL.ink);
      this.gain = 0.42;
    }
    clear() { this.c.fill(0); this.total = 0; this.u = 0; this.dirty = true; }
    add(fx, fy, amount, rad) {
      const { gw, gh, c } = this;
      const cx = fx * (gw - 1), cy = fy * (gh - 1), R = Math.ceil(rad * 2.2);
      const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(gw - 1, Math.ceil(cx + R));
      const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(gh - 1, Math.ceil(cy + R));
      let ws = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ws += Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * rad * rad));
      if (ws <= 0) return;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        c[y * gw + x] += amount * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * rad * rad)) / ws;
      }
      this.total += amount; this.dirty = true;
    }
    step(dt, Dc) {
      let k = Dc * dt;
      if (k <= 0 || this.total <= 0) return;
      const n = Math.max(1, Math.ceil(k / 0.2));
      k /= n;
      const gw = this.gw, gh = this.gh;
      let a = this.c, b = this.t;
      for (let s = 0; s < n; s++) {
        for (let y = 0; y < gh; y++) {
          const row = y * gw, up = y > 0 ? row - gw : row, dn = y < gh - 1 ? row + gw : row;
          for (let x = 0; x < gw; x++) {
            const i = row + x, v = a[i];
            const l = x > 0 ? a[i - 1] : v, r = x < gw - 1 ? a[i + 1] : v;
            b[i] = v + k * (l + r + a[up + x] + a[dn + x] - 4 * v);
          }
        }
        const tmp = a; a = b; b = tmp;
      }
      this.c = a; this.t = b; this.dirty = true;
    }
    uniformity() {
      if (this.total <= 1e-6) return 0;
      const mean = this.total / this.N, c = this.c;
      let mad = 0;
      for (let i = 0; i < this.N; i++) mad += Math.abs(c[i] - mean);
      mad /= this.N;
      return clamp(1 - mad / (2 * mean), 0, 1);
    }
    image() {
      if (this.dirty) {
        const d = this.img.data, { r, g, b } = this.rgb, gain = this.gain, c = this.c;
        for (let i = 0; i < this.N; i++) {
          const a = 1 - Math.exp(-c[i] * gain), j = i * 4;
          d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = Math.min(232, a * 255);
        }
        this.cx.putImageData(this.img, 0, 0);
        this.dirty = false;
      }
      return this.cv;
    }
  }

  /* =========================================================
     2. 액체 입자 모형 (돋보기 속): 서로 밀치며 무작위로 움직이는 입자
        - 주기 경계(창 밖은 이어진 액체)인 정사각형 영역을 둥근 창으로 들여다봄
        - 온도(활발함 act)가 높을수록 입자가 빠르게 움직임
     ========================================================= */
  class LiquidSim {
    constructor(o) {
      this.R = o.R || 150; this.r = o.r || 12; this.M = this.R + 3 * this.r; this.L = 2 * this.M;
      this.act = o.act || 1; this.T0 = o.T0 || 2600; this.gamma = 2.0;
      this.nc = Math.max(3, Math.floor(this.L / (2 * this.r))); this.cs = this.L / this.nc;
      this.head = new Int32Array(this.nc * this.nc); this.next = new Int32Array(512);
      this.reset();
    }
    reset() {
      this.p = [];
      const s = this.r * 2.45;
      const cols = Math.round(this.L / s), rows = Math.round(this.L / (s * 0.866)) & ~1;
      const sx = this.L / cols, sy = this.L / rows;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        this.p.push({ x: -this.M + (i + 0.25 + (j & 1) * 0.5) * sx + rand(-2, 2), y: -this.M + (j + 0.5) * sy + rand(-2, 2), vx: gauss() * 30, vy: gauss() * 30, ink: false, k: 1 });
      }
      this.hasInk = false;
    }
    /* 잉크 방울이 들어옴: 그 자리의 물 입자는 옆으로 밀려 창 밖으로 나가고, 잉크 입자가 모여 들어옴 */
    addInk(n) {
      const cx = rand(-12, 12), cy = -this.R * 0.3;
      const byDist = this.p.filter((q) => !q.ink && !q.out).map((q) => ({ q, d: (q.x - cx) ** 2 + (q.y - cy) ** 2 })).sort((a, b) => a.d - b.d);
      for (let i = 0; i < n && i < byDist.length; i++) {
        const q = byDist[i].q;
        q.out = now();
        this.p.push({ x: q.x, y: q.y, vx: gauss() * 30, vy: gauss() * 30 + 40, ink: true, k: 0.3, born: now() });
      }
      this.hasInk = true;
    }
    step(dt) {
      const P = this.p, M = this.M, L = this.L;
      const T = this.T0 * this.act;
      const dec = Math.exp(-this.gamma * dt), kick = Math.sqrt(T * (1 - dec * dec));
      const t = now();
      for (let i = P.length - 1; i >= 0; i--) {
        const q = P[i];
        if (q.out && t - q.out > 0.35) { P.splice(i, 1); continue; }
        if (q.k < 1) q.k = Math.min(1, q.k + dt * 3);
        q.vx = q.vx * dec + kick * gauss(); q.vy = q.vy * dec + kick * gauss();
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.x < -M) q.x += L; else if (q.x >= M) q.x -= L;
        if (q.y < -M) q.y += L; else if (q.y >= M) q.y -= L;
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
        if (a.out) continue;
        for (let oy = -1; oy <= 1; oy++) {
          const cy = (a.cy + oy + nc) % nc;
          for (let ox = -1; ox <= 1; ox++) {
            const cx = (a.cx + ox + nc) % nc;
            for (let j = head[cy * nc + cx]; j >= 0; j = next[j]) {
              if (j <= i) continue;
              const b = P[j];
              if (b.out) continue;
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
    draw(cx, cy, rad) {
      const s = rad / this.R, rr = this.r * s, lim = (this.R + this.r * 1.5) ** 2, t = now();
      for (let pass = 0; pass < 2; pass++) {
        for (const q of this.p) {
          if (q.ink !== (pass === 1)) continue;
          if (q.x * q.x + q.y * q.y > lim) continue;
          let k = q.k;
          if (q.out) { k = Math.max(0.05, 1 - (t - q.out) / 0.35); ctx.globalAlpha = k; }
          sprites.draw(q.ink ? COL.inkP : COL.waterP, cx + q.x * s, cy + q.y * s, rr * (q.out ? 1 : k), 12);
          if (q.out) ctx.globalAlpha = 1;
        }
      }
    }
  }

  /* 온도 → 입자 운동의 활발함 (모형: 온도가 높을수록 활발) */
  const actOf = (T) => 0.4 + T / 25;            // 10 °C: 0.8, 20 °C: 1.2, 60 °C: 2.8
  const DIFF_K = 22;                              // 거시 확산 빠르기(격자 단위)

  /* ---------- 비커 + 스포이트 + 돋보기 한 벌 ---------- */
  class InkBeaker {
    constructor(T, gw, gh, lensR) {
      this.T = T; this.act = actOf(T);
      this.field = new InkField(gw, gh);
      this.lens = new LiquidSim({ R: 150, r: 12, act: this.act });
      this.lensR = lensR;
      this.reset();
    }
    reset() {
      this.field.clear(); this.lens.reset();
      this.drop = null; this.inject = null; this.drops = 0; this.dropped = false; this.u = 0; this.squeeze = 0;
      this.ripples = []; this.done = false; this.elapsed = 0;
    }
    trigger() {
      if (this.drop || this.inject) return false;
      if (this.drops >= 3) return 'full';
      this.drop = { p: 0, r: 0, y: 0, vy: 0, phase: 'grow' };
      SciSim.tween(this, { squeeze: 1 }, { duration: 0.14, ease: 'outQuad', onDone: () => SciSim.tween(this, { squeeze: 0 }, { duration: 0.35, ease: 'outBack' }) });
      return true;
    }
    step(dt, g) {
      const d = this.drop;
      if (d) {
        if (d.phase === 'grow') {
          d.r = Math.min(7, d.r + dt * 32);
          if (d.r >= 7) { d.phase = 'fall'; d.y = 0; d.vy = 40; }
        } else {
          d.vy += 1600 * dt; d.y += d.vy * dt;
          if (g.tipY + d.y >= g.surfY) {
            this.drop = null; this.drops++; this.dropped = true;
            this.inject = { t: 0, dur: 1.0, x: 0.5 + rand(-0.03, 0.03), lobes: [] };
            for (let i = 0; i < 4; i++) this.inject.lobes.push({ dx: rand(-0.12, 0.12), dy: rand(0.04, 0.22), a: rand(0.4, 1) });
            this.ripples.push({ t: 0 });
            this.lens.addInk(14);
            splash(g.dropX, g.surfY);
          }
        }
      }
      const inj = this.inject;
      if (inj) {
        const p0 = inj.t / inj.dur;
        inj.t += dt;
        const p1 = Math.min(1, inj.t / inj.dur);
        const amt = this.field.N * (p1 - p0);       // 한 방울 = 평균 농도 1만큼
        const depth = 0.03 + 0.26 * ease.outCubic(p1);
        this.field.add(inj.x + Math.sin(inj.t * 9) * 0.015, depth, amt * 0.6, 1.3 + p1 * 1.4);
        inj.lobes.forEach((l) => this.field.add(inj.x + l.dx * p1, 0.05 + l.dy * p1, amt * 0.1 * l.a, 1.2 + p1));
        if (p1 >= 1) this.inject = null;
      }
      this.field.step(dt, DIFF_K * this.act);
      this.u = this.field.uniformity();
      if (this.dropped) this.elapsed += dt;
      this.lens.step(dt);
      for (let i = this.ripples.length - 1; i >= 0; i--) { this.ripples[i].t += dt; if (this.ripples[i].t > 1.2) this.ripples.splice(i, 1); }
    }
  }

  function splash(x, y) {
    Sound.tone(620, 0.06, 'sine', 0.07); Sound.tone(340, 0.12, 'sine', 0.06, 0.04);
    if (RM) return;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + rand(-1.1, 1.1), sp = rand(70, 150);
      FX.emit({ x, y: y - 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.45, size: rand(1.6, 3), color: '#9fd0ff', gravity: 700 });
    }
  }

  /* =========================================================
     3. 교실 속 향수 (기체 입자): 공기 입자와 부딪히며 퍼짐
     ========================================================= */
  class GasRoom {
    constructor() { this.p = []; this.head = null; this.next = new Int32Array(512); }
    reset(b, nAir) {
      this.b = b; this.p = [];
      this.cs = 16; this.ncx = Math.ceil((b.x1 - b.x0) / this.cs); this.ncy = Math.ceil((b.y1 - b.y0) / this.cs);
      this.head = new Int32Array(this.ncx * this.ncy);
      let tries = 0;
      while (this.p.length < nAir && tries < 6000) {
        tries++;
        const x = rand(b.x0 + 6, b.x1 - 6), y = rand(b.y0 + 6, b.y1 - 6);
        if (this.p.some((q) => (q.x - x) ** 2 + (q.y - y) ** 2 < 196)) continue;
        const a = rand(0, TAU), sp = 150 * (0.55 + Math.random() * 0.9);
        this.p.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 5, pf: false });
      }
      this.sprayed = 0; this.arrived = 0;
    }
    spray(x, y, n) {
      for (let i = 0; i < n; i++) {
        const a = rand(-0.5, 0.5), sp = rand(160, 280);
        this.p.push({ x: x + rand(0, 10), y: y + rand(-6, 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 6.5, pf: true, arrived: false, born: now() });
      }
      this.sprayed += n;
    }
    step(dt, zoneX) {
      const b = this.b, P = this.p;
      let vs = 0;
      for (const q of P) {
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.x < b.x0 + q.r) { q.x = b.x0 + q.r; q.vx = Math.abs(q.vx); }
        else if (q.x > b.x1 - q.r) { q.x = b.x1 - q.r; q.vx = -Math.abs(q.vx); }
        if (q.y < b.y0 + q.r) { q.y = b.y0 + q.r; q.vy = Math.abs(q.vy); }
        else if (q.y > b.y1 - q.r) { q.y = b.y1 - q.r; q.vy = -Math.abs(q.vy); }
        if (q.pf && !q.arrived && q.x > zoneX) { q.arrived = true; this.arrived++; sniff(); }
        vs += Math.hypot(q.vx, q.vy);
      }
      // 아주 약한 온도 유지 (수치 오차로 빨라지거나 느려지지 않게)
      const mean = vs / Math.max(1, P.length), f = 1 + 0.4 * dt * (160 / Math.max(1, mean) - 1);
      for (const q of P) { q.vx *= f; q.vy *= f; }
      this.collide();
    }
    collide() {
      const P = this.p, n = P.length, cs = this.cs, ncx = this.ncx, ncy = this.ncy, b = this.b;
      if (this.next.length < n) this.next = new Int32Array(n * 2);
      const head = this.head, next = this.next;
      head.fill(-1);
      for (let i = 0; i < n; i++) {
        const q = P[i];
        const cx = clamp(Math.floor((q.x - b.x0) / cs), 0, ncx - 1), cy = clamp(Math.floor((q.y - b.y0) / cs), 0, ncy - 1);
        q.cx = cx; q.cy = cy;
        next[i] = head[cy * ncx + cx]; head[cy * ncx + cx] = i;
      }
      for (let i = 0; i < n; i++) {
        const a = P[i];
        for (let oy = -1; oy <= 1; oy++) {
          const cy = a.cy + oy;
          if (cy < 0 || cy >= ncy) continue;
          for (let ox = -1; ox <= 1; ox++) {
            const cx = a.cx + ox;
            if (cx < 0 || cx >= ncx) continue;
            for (let j = head[cy * ncx + cx]; j >= 0; j = next[j]) {
              if (j <= i) continue;
              const q = P[j], dx = q.x - a.x, dy = q.y - a.y, rr = a.r + q.r, d2 = dx * dx + dy * dy;
              if (d2 >= rr * rr || d2 < 1e-9) continue;
              const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (rr - d) / 2;
              a.x -= nx * ov; a.y -= ny * ov; q.x += nx * ov; q.y += ny * ov;
              const rv = (q.vx - a.vx) * nx + (q.vy - a.vy) * ny;
              if (rv < 0) { a.vx += rv * nx; a.vy += rv * ny; q.vx -= rv * nx; q.vy -= rv * ny; }
            }
          }
        }
      }
    }
  }
  let lastSniff = 0;
  function sniff() {
    const t = now();
    if (t - lastSniff > 0.25) { lastSniff = t; Sound.tone(980 + Math.random() * 200, 0.05, 'sine', 0.035); }
  }

  /* =========================================================
     4. 증발 모형 (돋보기 속): 젖은 천 위의 물 입자 → 표면의 입자가 공기 중으로
     ========================================================= */
  class EvapSim {
    constructor() {
      this.R = 120; this.r = 9; this.floor = 66; this.M = this.R + 3 * this.r;
      this.Nmax = 34; this.act = 1; this.wind = false; this.humid = true;
      this.reset(1);
    }
    reset(wet) {
      this.liq = []; this.vap = []; this.emitT = 0; this.returns = 0;
      const n = Math.round(this.Nmax * wet), per = Math.floor((2 * this.M) / (this.r * 2.15));
      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / per), col = i % per;
        this.liq.push({ x: -this.M + (col + 0.5 + (row & 1) * 0.5) * (2 * this.M / per), y: this.floor - this.r - row * this.r * 1.8, vx: gauss() * 20, vy: 0 });
      }
      this.seedAmbient(true);
    }
    ambientTarget() { return this.humid ? 7 : 2; }
    seedAmbient(all) {
      const amb = this.vap.filter((v) => v.amb).length;
      for (let i = amb; i < this.ambientTarget(); i++) {
        const a = rand(0, TAU), sp = rand(60, 110) * Math.sqrt(this.act);
        const x = all ? rand(-this.R * 0.8, this.R * 0.8) : (this.wind ? -this.R - 10 : rand(-this.R * 0.7, this.R * 0.7));
        const y = all ? rand(-this.R * 0.8, this.floor - 60) : (this.wind ? rand(-this.R * 0.7, this.floor - 60) : -this.R - 10);
        this.vap.push({ x, y, vx: Math.cos(a) * sp, vy: all ? Math.sin(a) * sp : Math.abs(Math.sin(a) * sp), amb: true, tr: [] });
      }
    }
    surfaceY() {
      let m = this.floor;
      for (const q of this.liq) if (q.y < m) m = q.y;
      return m;
    }
    step(dt, wet, running) {
      const r = this.r, M = this.M, d0 = 2 * r, d02 = d0 * d0, P = this.liq;
      // 액체: 천 위에 고인 물 (무작위로 밀치며 움직임 + 아래로 당김)
      const T = 700 * this.act, dec = Math.exp(-3 * dt), kick = Math.sqrt(T * (1 - dec * dec));
      for (const q of P) {
        q.vx = q.vx * dec + kick * gauss(); q.vy = q.vy * dec + kick * gauss() + 900 * dt;
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.x < -M) q.x += 2 * M; else if (q.x >= M) q.x -= 2 * M;
        if (q.y > this.floor - r) { q.y = this.floor - r; q.vy = -Math.abs(q.vy) * 0.3; }
      }
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        const a = P[i], b = P[j];
        let dx = b.x - a.x; const dy = b.y - a.y;
        if (dx > M) dx -= 2 * M; else if (dx < -M) dx += 2 * M;
        const d2 = dx * dx + dy * dy;
        if (d2 >= d02 || d2 < 1e-9) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (d0 - d) / 2;
        a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) { a.vx += rv * nx; a.vy += rv * ny; b.vx -= rv * nx; b.vy -= rv * ny; }
      }
      // 표면의 입자가 공기 중으로 (거시 화면의 물기와 맞춤)
      const target = Math.round(this.Nmax * wet);
      this.emitT -= dt;
      if (running && P.length > target && this.emitT <= 0) {
        const sorted = P.slice().sort((a, b) => a.y - b.y).slice(0, 5);
        const q = sorted[Math.floor(Math.random() * sorted.length)];
        P.splice(P.indexOf(q), 1);
        const sp = rand(120, 170) * Math.sqrt(this.act);
        this.vap.push({ x: q.x, y: q.y, vx: rand(-35, 35) + (this.wind ? 60 : 0), vy: -sp, amb: false, tr: [], pop: now() });
        this.emitT = 0.16 / (1 + (P.length - target) * 0.6);
      }
      // 공기 중의 물 입자 (기체): 빠르고 자유롭게
      const surf = this.surfaceY(), wv = this.wind ? 170 : 0;
      for (let i = this.vap.length - 1; i >= 0; i--) {
        const v = this.vap[i];
        if (!RM) { v.tr.push(v.x, v.y); if (v.tr.length > 10) v.tr.splice(0, 2); }
        if (this.wind) v.vx += (wv - v.vx) * Math.min(1, dt * 1.6);
        v.x += v.vx * dt; v.y += v.vy * dt;
        if (v.amb) {
          // 바람이 없으면 창 안에서 튕김, 바람이 불면 오른쪽으로 흘러감
          if (!this.wind) {
            if (v.x < -this.R + r) v.vx = Math.abs(v.vx); else if (v.x > this.R - r) v.vx = -Math.abs(v.vx);
            if (v.y < -this.R + r) v.vy = Math.abs(v.vy);
          }
          if (v.y > surf - r && v.vy > 0) {
            if (P.length && this.humid && running && Math.random() < 0.85) {
              P.push({ x: v.x, y: surf - r, vx: v.vx * 0.2, vy: 0 });
              this.vap.splice(i, 1); this.returns++;
              continue;
            }
            v.vy = -Math.abs(v.vy);
          }
          if (v.y > this.floor - r) v.vy = -Math.abs(v.vy);
          if (v.x > this.R + 30 || v.y < -this.R - 30) { this.vap.splice(i, 1); continue; }
        } else if (v.x * v.x + v.y * v.y > (this.R + 30) ** 2) { this.vap.splice(i, 1); continue; }
      }
      if (Math.random() < dt * 3) this.seedAmbient(false);
    }
    draw(cx, cy, rad) {
      const s = rad / this.R, rr = this.r * s, t = now();
      // 천 (젖은 정도와 상관없이 같은 천)
      const fy = cy + this.floor * s;
      ctx.fillStyle = '#c9def5'; ctx.fillRect(cx - rad, fy, rad * 2, rad);
      ctx.fillStyle = 'rgba(120,150,190,.35)';
      for (let row = 0; row < 4; row++) {
        for (let x = -rad - 20; x < rad + 20; x += 18 * s) {
          ctx.beginPath(); ctx.ellipse(cx + x + (row & 1) * 9 * s, fy + 8 * s + row * 12 * s, 8 * s, 4.5 * s, 0, 0, TAU); ctx.fill();
        }
      }
      // 공기 중 입자의 꼬리 (빠르기)
      ctx.lineCap = 'round';
      for (const v of this.vap) {
        if (v.tr.length < 4) continue;
        ctx.strokeStyle = rgba(COL.vapor, 0.25); ctx.lineWidth = rr * 0.9;
        ctx.beginPath(); ctx.moveTo(cx + v.tr[0] * s, cy + v.tr[1] * s); ctx.lineTo(cx + v.x * s, cy + v.y * s); ctx.stroke();
      }
      for (const q of this.liq) sprites.draw(COL.waterP, cx + q.x * s, cy + q.y * s, rr, 9);
      for (const v of this.vap) {
        sprites.draw(COL.waterP, cx + v.x * s, cy + v.y * s, rr, 9);
        if (v.pop && t - v.pop < 0.5) {
          const k = (t - v.pop) / 0.5;
          ctx.strokeStyle = rgba('#f59e0b', 1 - k); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx + v.x * s, cy + v.y * s, rr + 3 + k * 8, 0, TAU); ctx.stroke();
        }
      }
    }
  }

  /* =========================================================
     배치
     ========================================================= */
  const LAY = PHONE ? {
    ink: { beaker: { x: 40, y: 118, w: 230, h: 252, level: 0.84 }, dropX: 155, dropTop: 10, lens: { cx: 306, cy: 484, r: 108 }, bar: { x: 22, y: 414, w: 168 } },
    perfume: { room: { x: 10, y: 46, w: 420, h: 478 }, bottle: { x: 58, y: 486 }, friend: { x: 372, y: 470 }, zoneX: 318 },
    temp: { b: [{ x: 22, y: 112, w: 182, h: 196, level: 0.84 }, { x: 236, y: 112, w: 182, h: 196, level: 0.84 }], lens: [{ cx: 113, cy: 418, r: 78 }, { cx: 327, cy: 418, r: 78 }], dropTop: 6, meter: { x: 22, y: 526, w: 396 } },
    laundry: { lineY: 96, lineX0: 14, lineX1: 300, shirtX: 158, basket: { x: 150, y: 566 }, fan: { x: 40, y: 430 }, lens: { cx: 330, cy: 470, r: 92 }, sun: { x: 386, y: 70 }, card: { x: 12, y: 10 }, clock: { x: 330, y: 180 } },
    sort: {},
  } : {
    ink: { beaker: { x: 60, y: 150, w: 300, h: 320, level: 0.86 }, dropX: 210, dropTop: 22, lens: { cx: 592, cy: 284, r: 162 }, bar: { x: 66, y: 504, w: 288 } },
    perfume: { room: { x: 20, y: 50, w: 760, h: 448 }, bottle: { x: 92, y: 462 }, friend: { x: 706, y: 448 }, zoneX: 630 },
    temp: { b: [{ x: 70, y: 126, w: 240, h: 228, level: 0.85 }, { x: 490, y: 126, w: 240, h: 228, level: 0.85 }], lens: [{ cx: 190, cy: 458, r: 88 }, { cx: 610, cy: 458, r: 88 }], dropTop: 6, meter: { x: 328, y: 132, w: 144, h: 236 } },
    laundry: { lineY: 104, lineX0: 30, lineX1: 500, shirtX: 270, basket: { x: 270, y: 490 }, fan: { x: 66, y: 400 }, lens: { cx: 656, cy: 318, r: 128 }, sun: { x: 560, y: 70 }, card: { x: 14, y: 12 }, clock: { x: 656, y: 128 } },
    sort: {},
  };

  /* =========================================================
     상태
     ========================================================= */
  const S = { scene: '', zoom: true, sceneT: 0, lensK: new SciSim.Spring(0, { stiffness: 210, damping: 19 }) };
  const INK = new InkBeaker(20, PHONE ? 30 : 36, PHONE ? 32 : 34, 12);
  const TP = { cold: new InkBeaker(10, 30, 28, 12), hot: new InkBeaker(60, 30, 28, 12), dropped: false };
  const PF = { room: new GasRoom(), squeeze: 0, smell: 0 };
  const EV = new EvapSim();
  const LD = {
    cond: { temp: false, wind: false, dry: false, spread: false },
    state: 'idle', wet: 1, hours: 0, hang: { k: 0 }, sway: new SciSim.Spring(0, { stiffness: 30, damping: 4 }),
    trials: [], best: null, missionBest: null, missionStart: 0, fan: 0, doneAt: 0,
  };
  const SORT = { cards: [], drag: null, hoverBin: null, solved: false };
  const checks = [];          // 화면 위 성공 표시 (D.check)

  /* =========================================================
     그리기 도우미
     ========================================================= */
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
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
    const th = Math.atan2(dy, dx), be = Math.acos((sr - lr) / d);
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
    rg.addColorStop(0, '#c4b5fd'); rg.addColorStop(0.5, '#7c3aed'); rg.addColorStop(1, '#4c1d95');
    ctx.strokeStyle = rg; ctx.lineWidth = 8; circle(L.cx, L.cy, r + 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(L.cx, L.cy, r - 4, Math.PI * 1.1, Math.PI * 1.42); ctx.stroke();
    D.label(L.cx, L.cy - r - 6, o.title || '🔍 입자 모형', { bg: '#5b21b6', size: PHONE ? 13 : 14 });
    ctx.restore();
  }

  /* 유리 비커 (물 + 잉크 농도장 + 유리) */
  function drawBeaker(B, g, t, o) {
    o = o || {};
    const { x, y, w, h } = g, ly = y + h * (1 - g.level);
    const waterPath = () => {
      ctx.beginPath(); ctx.moveTo(x + 2, y + h);
      for (let i = 0; i <= 24; i++) {
        const px = x + 2 + ((w - 4) * i) / 24;
        let wy = Math.sin(t * 2.2 + i * 0.7) * 1.1;
        B.ripples.forEach((rp) => { const dx = px - g.dropX, rr = rp.t * 140; wy += Math.exp(-((Math.abs(dx) - rr) ** 2) / 120) * 3.2 * (1 - rp.t / 1.2); });
        ctx.lineTo(px, ly + wy);
      }
      ctx.lineTo(x + w - 2, y + h); ctx.closePath();
    };
    ctx.save();
    D.roundRect(x + 3, y, w - 6, h - 3, 12); ctx.clip();
    waterPath();
    const wg = ctx.createLinearGradient(0, ly, 0, y + h);
    wg.addColorStop(0, rgba(o.water || COL.water, 0.32)); wg.addColorStop(1, rgba(o.water || COL.water, 0.55));
    ctx.fillStyle = wg; ctx.fill();
    ctx.clip();
    if (B.field.total > 0) {
      const cw = (w - 6) / B.field.gw, ch = (y + h - ly) / B.field.gh;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(B.field.image(), x + 3 - cw * 0.5, ly - ch * 0.5, w - 6 + cw, y + h - ly + ch);
    }
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x + 4, ly - 1, w - 8, 3);
    ctx.restore();
    // 유리
    ctx.save();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 6, y); ctx.lineTo(x, y + 4); ctx.lineTo(x, y + h - 12);
    ctx.quadraticCurveTo(x, y + h, x + 12, y + h); ctx.lineTo(x + w - 12, y + h);
    ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - 12); ctx.lineTo(x + w, y + 4); ctx.lineTo(x + w + 6, y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 10, y + 16); ctx.lineTo(x + 10, y + h - 16); ctx.stroke();
    ctx.strokeStyle = rgba('#5d6879', 0.55); ctx.lineWidth = 1.2;
    for (let i = 1; i < 6; i++) { const ty = y + h - (h * i) / 6; ctx.beginPath(); ctx.moveTo(x + w - (i % 2 ? 10 : 18), ty); ctx.lineTo(x + w - 3, ty); ctx.stroke(); }
    ctx.restore();
  }

  /* 스포이트 */
  function drawDropper(x, top, B, color) {
    const sq = B.squeeze || 0, bw = 32 * (1 + 0.16 * sq), bh = 42 * (1 - 0.22 * sq), tubeTop = top + 42, tip = top + 112;
    // 유리관
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x - 8, tubeTop); ctx.lineTo(x + 8, tubeTop); ctx.lineTo(x + 3.5, tip - 6); ctx.lineTo(x + 2, tip); ctx.lineTo(x - 2, tip); ctx.lineTo(x - 3.5, tip - 6); ctx.closePath();
    ctx.fillStyle = 'rgba(230,240,252,.85)'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = color || COL.inkP; ctx.fillRect(x - 10, tubeTop + 34 - B.drops * 8, 20, 100);
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, tubeTop + 6); ctx.lineTo(x - 2, tip - 14); ctx.stroke();
    // 고무 꼭지
    const g = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
    g.addColorStop(0, '#3b3050'); g.addColorStop(0.45, '#6b5b8a'); g.addColorStop(1, '#2a2238');
    ctx.fillStyle = g;
    D.roundRect(x - bw / 2, tubeTop - bh, bw, bh + 4, bw / 2); ctx.fill();
    ctx.fillStyle = '#2a2238'; D.roundRect(x - 13, tubeTop - 2, 26, 7, 3); ctx.fill();
    ctx.restore();
    // 방울
    const d = B.drop;
    if (d) {
      const yy = tip + (d.phase === 'grow' ? d.r * 0.8 : d.y);
      sprites.draw(color || COL.inkP, x, yy, d.r, 7);
    }
    return tip;
  }

  function uniformBar(x, y, w, u, label, color) {
    text(x, y - 8, label, { size: 14, weight: 800, color: COL.muted, align: 'left' });
    text(x + w, y - 8, Math.round(u * 100) + '%', { size: 15, weight: 800, color: u >= 0.9 ? COL.good : COL.ink9, align: 'right' });
    ctx.fillStyle = '#e6ebf3'; D.roundRect(x, y, w, 12, 6); ctx.fill();
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, color || '#a78bfa'); g.addColorStop(1, color ? shade(color, -0.2) : '#6d28d9');
    ctx.fillStyle = u >= 0.9 ? COL.good : g; D.roundRect(x, y, Math.max(12, w * u), 12, 6); ctx.fill();
    const gx = x + w * 0.9;
    ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(gx, y - 4); ctx.lineTo(gx, y + 16); ctx.stroke(); ctx.setLineDash([]);
  }

  /* =========================================================
     장면 1: 물에 잉크 한 방울
     ========================================================= */
  function inkGeom() {
    const L = LAY.ink, b = L.beaker;
    return { x: b.x, y: b.y, w: b.w, h: b.h, level: b.level, surfY: b.y + b.h * (1 - b.level), dropX: L.dropX, tipY: L.dropTop + 112 };
  }
  function drawInkScene(t) {
    const L = LAY.ink, g = inkGeom();
    drawBeaker(INK, g, t);
    drawDropper(L.dropX, L.dropTop, INK);
    text(g.x + g.w / 2, g.y + g.h + 28 - (PHONE ? 4 : 0), '물 (20 °C) · 젓지 않음', { size: 14, weight: 800, color: COL.muted });
    if (INK.dropped && INK.u < 0.985) D.label(g.x + 12, g.y - 16, '⏩ 빨리 감기로 보는 중', { bg: 'rgba(27,35,51,.78)', size: 13, align: 'left' });
    uniformBar(L.bar.x, L.bar.y + (PHONE ? 0 : 0), L.bar.w, INK.u, '고르게 퍼진 정도');
    if (!INK.dropped && !INK.drop) {
      D.ring(L.dropX, L.dropTop + 20, 26, t, { color: COL.sub });
      D.label(L.dropX + (PHONE ? 0 : 0), L.dropTop + 136 + (PHONE ? -2 : 0), '👆 눌러서 한 방울', { bg: COL.sub, size: 13 });
    }
    const src = { x: L.dropX, y: g.surfY + (g.y + g.h - g.surfY) * 0.3, r: 18 };
    lens(L.lens, S.lensK.value, src, (cx, cy, r) => INK.lens.draw(cx, cy, r));
    if (S.lensK.value > 0.5) legend(L.lens.cx, L.lens.cy + L.lens.r + 22, [[COL.waterP, '물 입자'], [COL.inkP, '잉크 입자']]);
    if (isNew('zoom') && S.lensK.value > 0.5) { D.ring(L.lens.cx, L.lens.cy, L.lens.r + 12, t, { color: COL.sub }); newBadge(L.lens.cx + L.lens.r * 0.72, L.lens.cy - L.lens.r * 0.78); }
  }
  function legend(cx, y, items) {
    ctx.save();
    ctx.font = D.font(13, 700);
    const ws = items.map((it) => ctx.measureText(it[1]).width + 26);
    const total = ws.reduce((a, b) => a + b, 0) + (items.length - 1) * 10;
    let x = cx - total / 2;
    ctx.fillStyle = 'rgba(255,255,255,.9)'; D.roundRect(x - 8, y - 13, total + 16, 26, 13); ctx.fill();
    items.forEach((it, i) => {
      sprites.draw(it[0], x + 8, y, 6.5, 7);
      ctx.fillStyle = COL.ink9; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(it[1], x + 19, y + 1);
      x += ws[i] + 10;
    });
    ctx.restore();
  }

  /* =========================================================
     장면 2: 교실에 퍼지는 향수
     ========================================================= */
  function roomBounds() {
    const R = LAY.perfume.room;
    return { x0: R.x + 6, y0: R.y + 6, x1: R.x + R.w - 6, y1: R.y + R.h - 34 };
  }
  function resetPerfume() {
    PF.room.reset(roomBounds(), PHONE ? 90 : 130);
    PF.smell = 0; PF.squeeze = 0;
  }
  function doSpray() {
    if (PF.room.sprayed >= 42) { toast('향수를 충분히 뿌렸어요. 잠시 지켜보세요!'); return; }
    const L = LAY.perfume, b = L.bottle;
    Sound.tone(300, 0.18, 'triangle', 0.04); Sound.tone(220, 0.22, 'sine', 0.03, 0.04);
    SciSim.tween(PF, { squeeze: 1 }, { duration: 0.12, onDone: () => SciSim.tween(PF, { squeeze: 0 }, { duration: 0.4, ease: 'outBack' }) });
    PF.room.spray(b.x + 26, b.y - 74, 14);
    if (!RM) for (let i = 0; i < 14; i++) FX.emit({ x: b.x + 28, y: b.y - 74, vx: rand(60, 170), vy: rand(-40, 40), life: rand(0.6, 1.1), size: rand(5, 11), grow: 18, color: 'rgba(244,114,182,.35)', shape: 'smoke', drag: 2.5 });
    hideHint();
  }
  function drawPerfumeScene(t) {
    const L = LAY.perfume, R = L.room, b = roomBounds();
    // 벽과 바닥
    D.shadow(() => {
      const g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
      g.addColorStop(0, '#fffaf2'); g.addColorStop(1, '#f7ecdd');
      ctx.fillStyle = g; D.roundRect(R.x, R.y, R.w, R.h, 18); ctx.fill();
    }, { blur: 10, y: 3 });
    ctx.save(); D.roundRect(R.x, R.y, R.w, R.h, 18); ctx.clip();
    const fg = ctx.createLinearGradient(0, R.y + R.h - 34, 0, R.y + R.h);
    fg.addColorStop(0, '#d9b98c'); fg.addColorStop(1, '#c49a66');
    ctx.fillStyle = fg; ctx.fillRect(R.x, R.y + R.h - 34, R.w, 34);
    ctx.strokeStyle = 'rgba(120,80,40,.25)'; ctx.lineWidth = 1;
    for (let x = R.x + 40; x < R.x + R.w; x += 80) { ctx.beginPath(); ctx.moveTo(x, R.y + R.h - 34); ctx.lineTo(x - 18, R.y + R.h); ctx.stroke(); }
    // 닫힌 창문
    const wx = R.x + R.w / 2 - (PHONE ? 60 : 70), wy = R.y + 26, ww = PHONE ? 120 : 140, wh = PHONE ? 70 : 84;
    ctx.fillStyle = '#e3f1ff'; D.roundRect(wx, wy, ww, wh, 6); ctx.fill();
    ctx.strokeStyle = '#b9a07c'; ctx.lineWidth = 5; ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
    ctx.restore();
    D.label(wx + ww / 2, wy + wh + 16, '🚫 창문 닫힘 · 바람 없음', { bg: 'rgba(255,255,255,.92)', color: '#7c5a2b', size: 13, border: '#e5d3b5' });
    // 친구 쪽 (냄새 맡는 곳)
    const zg = ctx.createLinearGradient(L.zoneX, 0, b.x1, 0);
    zg.addColorStop(0, 'rgba(236,72,153,0)'); zg.addColorStop(1, rgba('#ec4899', 0.08 + 0.1 * PF.smell));
    ctx.fillStyle = zg; ctx.fillRect(L.zoneX, b.y0, b.x1 - L.zoneX, b.y1 - b.y0);
    D.dashedLine(L.zoneX, b.y0 + 4, L.zoneX, b.y1, { color: 'rgba(236,72,153,.35)', dash: [6, 7] });
    // 입자
    const P = PF.room.p;
    for (const q of P) if (!q.pf) sprites.draw(COL.air, q.x, q.y, q.r, 5);
    for (const q of P) if (q.pf) { sprites.glow('#f472b6', q.x, q.y, 15); sprites.draw(COL.perfume, q.x, q.y, q.r, 7); }
    drawBottle(L.bottle.x, L.bottle.y, t);
    drawFriend(L.friend.x, L.friend.y, t);
    text(R.x + 14, R.y + R.h + 22, '🔍 입자 모형으로 본 교실 (공기 입자는 일부만 그렸어요)', { size: 13, weight: 700, color: COL.muted, align: 'left' });
    if (!PF.room.sprayed) {
      D.ring(L.bottle.x, L.bottle.y - 40, 40, t, { color: '#ec4899' });
      D.label(L.bottle.x + (PHONE ? 56 : 40), L.bottle.y - 110, '👆 눌러서 칙!', { bg: '#db2777', size: 13 });
    }
    const leg = [[COL.air, '공기 입자'], [COL.perfume, '향수 입자']];
    legend(R.x + R.w / 2 + (PHONE ? 0 : 120), R.y + R.h - 17, leg);
  }
  function drawBottle(x, y, t) {
    const sq = PF.squeeze;
    // 탁자
    ctx.fillStyle = '#a77b4f'; D.roundRect(x - 46, y - 6, 92, 10, 4); ctx.fill();
    ctx.fillStyle = '#8b6440'; ctx.fillRect(x - 40, y + 4, 8, 24); ctx.fillRect(x + 32, y + 4, 8, 24);
    // 병
    const by = y - 6;
    D.shadow(() => {
      const g = ctx.createLinearGradient(x - 22, 0, x + 22, 0);
      g.addColorStop(0, 'rgba(255,214,234,.95)'); g.addColorStop(0.5, 'rgba(255,240,248,.95)'); g.addColorStop(1, 'rgba(244,170,205,.95)');
      ctx.fillStyle = g; D.roundRect(x - 22, by - 54, 44, 54, 12); ctx.fill();
    }, { blur: 8, y: 3 });
    ctx.fillStyle = 'rgba(236,72,153,.55)'; D.roundRect(x - 18, by - 34, 36, 30, 9); ctx.fill();
    ctx.strokeStyle = 'rgba(190,60,120,.6)'; ctx.lineWidth = 2; D.roundRect(x - 22, by - 54, 44, 54, 12); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; D.roundRect(x - 15, by - 48, 6, 30, 3); ctx.fill();
    // 목과 분사 꼭지
    ctx.fillStyle = '#d4d9e2'; ctx.fillRect(x - 7, by - 64, 14, 10);
    const cy = by - 74 + sq * 5;
    const cg = ctx.createLinearGradient(x - 12, 0, x + 12, 0); cg.addColorStop(0, '#9aa5b6'); cg.addColorStop(0.5, '#eef2f7'); cg.addColorStop(1, '#8a95a6');
    ctx.fillStyle = cg; D.roundRect(x - 12, cy - 10, 24, 14, 5); ctx.fill();
    ctx.fillStyle = '#5d6879'; ctx.fillRect(x + 12, cy - 6, 12, 5);
  }
  function drawFriend(x, y, t) {
    const happy = PF.smell > 0.5, bob = Math.sin(t * 2) * 1.5;
    // 몸
    ctx.fillStyle = '#60a5fa'; D.roundRect(x - 28, y - 52 + bob, 56, 60, 18); ctx.fill();
    // 얼굴
    const hy = y - 80 + bob;
    D.sphere(x, hy, 26, '#f6c7a1', { gloss: false });
    ctx.fillStyle = '#3b2a20'; ctx.beginPath(); ctx.arc(x, hy - 6, 27, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.strokeStyle = '#3b2a20'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    if (happy) {
      ctx.beginPath(); ctx.arc(x - 9, hy + 2, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 9, hy + 2, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, hy + 8, 7, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.fillStyle = 'rgba(244,114,182,.45)'; circle(x - 15, hy + 9, 4.5); ctx.fill(); circle(x + 15, hy + 9, 4.5); ctx.fill();
    } else {
      ctx.fillStyle = '#3b2a20'; circle(x - 9, hy + 2, 2.8); ctx.fill(); circle(x + 9, hy + 2, 2.8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 6, hy + 13); ctx.lineTo(x + 6, hy + 13); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    const msg = happy ? '향기가 나요! 😊' : (PF.room.sprayed ? '아직 몰라요…' : '');
    if (msg) {
      const bx = x - (PHONE ? 62 : 70), byy = hy - 52;
      D.label(bx, byy, msg, { bg: happy ? '#db2777' : 'rgba(255,255,255,.95)', color: happy ? '#fff' : COL.muted, size: 14, border: happy ? null : '#e2c9d6' });
    }
  }

  /* =========================================================
     장면 3: 찬물과 뜨거운 물
     ========================================================= */
  function tempGeom(i) {
    const L = LAY.temp, b = L.b[i];
    return { x: b.x, y: b.y, w: b.w, h: b.h, level: b.level, surfY: b.y + b.h * (1 - b.level), dropX: b.x + b.w / 2, tipY: L.dropTop + 112 };
  }
  function drawTempScene(t) {
    const L = LAY.temp;
    [TP.cold, TP.hot].forEach((B, i) => {
      const g = tempGeom(i), hot = i === 1;
      drawBeaker(B, g, t, { water: hot ? '#8ec9f5' : '#74b4ff' });
      // 온도계 (물속에 꽂음)
      const tx = g.x + g.w - 26;
      D.thermometer(tx, g.y - 22, g.h - 52, B.T, 0, 80, { ticks: false, color: hot ? COL.hot : COL.cold });
      drawDropper(g.dropX, L.dropTop, B);
      D.label(g.x + (PHONE ? 50 : 58), g.y - 14, hot ? '🔥 뜨거운 물 60 °C' : '❄️ 찬물 10 °C', { bg: hot ? COL.hot : COL.cold, size: PHONE ? 13 : 14 });
      if (hot && !RM && Math.random() < 0.18) FX.emit({ x: g.x + rand(20, g.w - 40), y: g.surfY - 4, vx: rand(-6, 6), vy: rand(-26, -14), life: rand(1.4, 2.2), size: rand(6, 10), grow: 10, color: 'rgba(255,255,255,.55)', shape: 'smoke' });
      const src = { x: g.dropX, y: g.surfY + (g.y + g.h - g.surfY) * 0.3, r: 14 };
      lens(L.lens[i], S.lensK.value, src, (cx, cy, r) => B.lens.draw(cx, cy, r), { title: hot ? '🔍 뜨거운 물' : '🔍 찬물', bg: hot ? '#fff3ef' : '#eef5ff' });
    });
    // 퍼진 정도 비교
    const M = L.meter;
    if (PHONE) {
      uniformBar(M.x, M.y + 18, M.w * 0.47, TP.cold.u, '❄️ 찬물', '#60a5fa');
      uniformBar(M.x + M.w * 0.53, M.y + 18, M.w * 0.47, TP.hot.u, '🔥 뜨거운 물', '#f87171');
    } else {
      drawRaceMeter(M, t);
    }
    if (!TP.dropped && !TP.cold.drop && !TP.hot.drop) {
      [0, 1].forEach((i) => D.ring(tempGeom(i).dropX, L.dropTop + 20, 24, t, { color: COL.sub }));
    }
  }
  function drawRaceMeter(M, t) {
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(M.x, M.y, M.w, M.h, 16); ctx.fill(); }, { blur: 10, y: 3 });
    text(M.x + M.w / 2, M.y + 24, '고르게 퍼진 정도', { size: 14, weight: 800, color: COL.ink9 });
    const top = M.y + 46, bot = M.y + M.h - 40, bw = 34;
    [[TP.cold, '#3b82f6', '❄️', M.x + M.w * 0.3], [TP.hot, '#ef4444', '🔥', M.x + M.w * 0.7]].forEach(([B, c, ic, cx]) => {
      ctx.fillStyle = '#eef2f7'; D.roundRect(cx - bw / 2, top, bw, bot - top, 10); ctx.fill();
      const hh = (bot - top) * B.u;
      const g = ctx.createLinearGradient(0, bot - hh, 0, bot); g.addColorStop(0, shade(c, 0.2)); g.addColorStop(1, c);
      ctx.fillStyle = B.u >= 0.9 ? COL.good : g; D.roundRect(cx - bw / 2, bot - hh, bw, hh, 10); ctx.fill();
      text(cx, bot + 22, ic + ' ' + Math.round(B.u * 100) + '%', { size: 15, weight: 800, color: B.u >= 0.9 ? COL.good : COL.ink9 });
    });
    const gy = bot - (bot - top) * 0.9;
    D.dashedLine(M.x + 12, gy, M.x + M.w - 12, gy, { color: COL.good, dash: [4, 4] });
    text(M.x + M.w - 10, gy - 5, '90%', { size: 13, weight: 800, color: COL.good, align: 'right' });
  }

  /* =========================================================
     장면 4: 빨래 말리기 (증발)
     ========================================================= */
  const RATE0 = 1 / 4;                     // 모든 조건이 나쁠 때 4시간에 마름 (물기 비율 / 시간)
  const SEC_PER_HOUR = 7;                  // 화면에서 1시간 = 7초
  const TARGET_MIN = 40;
  function ldRate() {
    const c = LD.cond;
    return RATE0 * (c.temp ? 1.9 : 1) * (c.wind ? 1.7 : 1) * (c.dry ? 1.6 : 1) * (c.spread ? 1.6 : 1);
  }
  const fmtTime = (h) => {
    const m = Math.round(h * 60);
    return m >= 60 ? Math.floor(m / 60) + '시간 ' + (m % 60) + '분' : m + '분';
  };
  function applyCondToSims() {
    EV.act = LD.cond.temp ? 1.6 : 0.85;
    EV.wind = LD.cond.wind;
    EV.humid = !LD.cond.dry;
  }
  function resetLaundry(keepLog) {
    LD.state = 'idle'; LD.wet = 1; LD.hours = 0; LD.hang.k = 0;
    if (!keepLog) { LD.trials = []; LD.best = null; }
    applyCondToSims();
    EV.reset(1);
    renderTrials(); refreshCondUI();
  }
  function hangLaundry() {
    LD.state = 'run'; LD.wet = 1; LD.hours = 0; LD.doneAt = 0;
    applyCondToSims(); EV.reset(1);
    LD.hang.k = 0;
    SciSim.tween(LD.hang, { k: 1 }, { duration: 0.6, ease: 'outBack' });
    Sound.tone(500, 0.08, 'triangle', 0.05);
    hideHint(); refreshCondUI();
  }
  function stepLaundry(dt) {
    applyCondToSims();
    if (LD.state === 'run' && LD.hang.k > 0.95) {
      const r = ldRate();
      LD.hours += dt / SEC_PER_HOUR;
      LD.wet = Math.max(0, 1 - r * LD.hours);
      if (LD.wet <= 0) finishLaundry(1 / r);
    }
    LD.fan += dt * (LD.cond.wind ? 14 : 0);
    LD.sway.target = LD.cond.wind ? 0.07 + Math.sin(now() * 2.3) * 0.03 : 0;
    LD.sway.update(dt);
    const running = LD.state === 'run' || LD.state === 'done';
    EV.step(dt, LD.state === 'idle' ? 1 : LD.wet, running);
  }
  function finishLaundry(hours) {
    LD.state = 'done'; LD.wet = 0; LD.hours = hours; LD.doneAt = now();
    const c = Object.assign({}, LD.cond), ok = hours * 60 <= TARGET_MIN + 1e-6;
    LD.trials.unshift({ h: hours, c, ok });
    if (LD.trials.length > 4) LD.trials.length = 4;
    LD.best = LD.best == null ? hours : Math.min(LD.best, hours);
    LD.missionBest = LD.missionBest == null ? hours : Math.min(LD.missionBest, hours);
    Sound.tone(880, 0.1, 'triangle', 0.06); Sound.tone(1175, 0.14, 'triangle', 0.06, 0.08);
    const L = LAY.laundry;
    celebrate(L.shirtX, L.lineY + 90, ok);
    renderTrials(); refreshCondUI();
  }
  function shirtGeom() {
    const L = LAY.laundry, k = clamp(LD.hang.k, 0, 1.15);
    const spread = LD.cond.spread, sc = PHONE ? 0.78 : 1;
    const w = (spread ? 210 : 112) * sc, h = (spread ? 186 : 170) * sc;
    const hangTop = L.lineY + (PHONE ? 4 : 6), basketTop = L.basket.y - 34;
    const top = lerp(basketTop, hangTop, k), s = lerp(0.45, 1, clamp(k, 0, 1));
    return { cx: L.shirtX, top, w: w * s, h: h * s, spread, s };
  }
  function shirtPath(cx, top, w, h, spread) {
    ctx.beginPath();
    if (spread) {
      const P = [[-0.14, 0], [0, 0.07], [0.14, 0], [0.31, 0.03], [0.5, 0.2], [0.41, 0.35], [0.29, 0.27], [0.29, 1], [-0.29, 1], [-0.29, 0.27], [-0.41, 0.35], [-0.5, 0.2], [-0.31, 0.03]];
      P.forEach((p, i) => { const x = cx + p[0] * w, y = top + p[1] * h; if (i === 0) ctx.moveTo(x, y); else if (i === 1) ctx.quadraticCurveTo(cx, top + 0.1 * h, x + 0.14 * w, top); else ctx.lineTo(x, y); });
    } else {
      ctx.moveTo(cx - 0.5 * w, top); ctx.lineTo(cx + 0.5 * w, top); ctx.lineTo(cx + 0.5 * w, top + h); ctx.lineTo(cx - 0.5 * w, top + h);
    }
    ctx.closePath();
  }
  function drawLaundryScene(t) {
    const L = LAY.laundry, c = LD.cond;
    // 하늘 (온도) + 습도
    const sky = ctx.createLinearGradient(0, 0, 0, VH);
    if (c.temp) { sky.addColorStop(0, '#7cc8ff'); sky.addColorStop(1, '#e8f6ff'); }
    else { sky.addColorStop(0, '#b8c6d8'); sky.addColorStop(1, '#eef2f7'); }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
    if (c.temp) {
      const s = L.sun;
      D.glow(s.x, s.y, 80, '#ffd166', 0.55);
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(RM ? 0 : t * 0.25);
      ctx.strokeStyle = 'rgba(255,190,60,.8)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 36, Math.sin(a) * 36); ctx.lineTo(Math.cos(a) * 48, Math.sin(a) * 48); ctx.stroke(); }
      ctx.restore();
      D.sphere(s.x, s.y, 27, '#ffc233', { gloss: false });
    } else {
      cloud(L.sun.x - 10, L.sun.y, 1, t); cloud(L.sun.x - (PHONE ? 150 : 250), L.sun.y + 18, 0.8, t);
    }
    // 땅
    const gy = PHONE ? 540 : 470;
    D.ground(0, gy, VW, VH - gy, { top: '#9ad48f', mid: '#7cc474', soil: '#c9a776', bottom: '#a8865a' });
    // 빨랫줄
    const lx0 = L.lineX0, lx1 = L.lineX1, ly = L.lineY;
    ctx.fillStyle = '#8b6440';
    ctx.fillRect(lx0 - 4, ly - 14, 8, gy - ly + 14); ctx.fillRect(lx1 - 4, ly - 14, 8, gy - ly + 14);
    ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(lx0, ly - 8); ctx.quadraticCurveTo((lx0 + lx1) / 2, ly + 10, lx1, ly - 8); ctx.stroke();
    // 선풍기 (바람)
    drawFan(L.fan.x, L.fan.y, t);
    if (c.wind && !RM) {
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const yy = (PHONE ? 150 : 150) + i * (PHONE ? 34 : 34), ph = ((t * 0.9 + i * 0.37) % 1);
        const xx = L.fan.x + 40 + ph * (PHONE ? 260 : 460), len = 30 + (i % 3) * 14;
        ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + len / 2, yy - 4, xx + len, yy); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    }
    // 바구니
    drawBasket(L.basket.x, L.basket.y);
    // 빨래
    drawShirt(t);
    // 습도 (뿌연 공기)
    if (!c.dry) {
      ctx.fillStyle = 'rgba(226,232,240,.38)'; ctx.fillRect(0, 0, VW, gy);
      if (!RM) for (let i = 0; i < 6; i++) {
        const x = ((i * 157 + t * 12) % (VW + 200)) - 100, y = 120 + (i * 83) % (gy - 160);
        D.glow(x, y, 90, '#ffffff', 0.35);
      }
    }
    FX.draw(ctx);
    // 조건 카드
    drawWeatherCard(L.card.x, L.card.y);
    // 시계와 목표
    drawClock();
    // 돋보기 (빨래를 널었을 때)
    const sg = shirtGeom();
    const src = { x: sg.cx + sg.w * 0.12, y: sg.top + sg.h * 0.42, r: PHONE ? 14 : 18 };
    const lk = S.lensK.value * (LD.state === 'idle' ? 0 : clamp(LD.hang.k, 0, 1));
    lens(L.lens, lk, src, (cx, cy, r) => {
      const sky2 = ctx.createLinearGradient(0, cy - r, 0, cy + r);
      sky2.addColorStop(0, c.temp ? '#e7f5ff' : '#eef2f7'); sky2.addColorStop(1, '#ffffff');
      ctx.fillStyle = sky2; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      if (c.wind && !RM) {
        ctx.strokeStyle = 'rgba(148,163,184,.4)'; ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) { const ph = (t * 1.2 + i * 0.29) % 1, yy = cy - r * 0.8 + i * r * 0.28; ctx.beginPath(); ctx.moveTo(cx - r + ph * r * 2, yy); ctx.lineTo(cx - r + ph * r * 2 + 26, yy); ctx.stroke(); }
      }
      if (!c.dry) { ctx.fillStyle = 'rgba(203,213,225,.25)'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); }
      EV.draw(cx, cy, r);
      if (LD.state === 'done') D.label(cx, cy - r * 0.35, '✨ 물이 모두 날아갔어요', { bg: COL.good, size: 13 });
    }, { title: '🔍 젖은 빨래의 표면', bg: '#f4f9ff' });
    if (lk > 0.5) legend(L.lens.cx, L.lens.cy + L.lens.r + (PHONE ? 18 : 22), [[COL.waterP, '물 입자']]);
    if (lk > 0.5 && !PHONE) {
      text(L.lens.cx - L.lens.r - 2, L.lens.cy + L.lens.r * 0.62, '천', { size: 13, weight: 800, color: '#5b7aa6', align: 'right' });
      text(L.lens.cx + L.lens.r + 6, L.lens.cy - L.lens.r * 0.4, '공기', { size: 13, weight: 800, color: COL.muted, align: 'left' });
    }
  }
  function cloud(x, y, s, t) {
    const dx = RM ? 0 : Math.sin(t * 0.3) * 6;
    ctx.save(); ctx.translate(x + dx, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    [[-34, 6, 22], [-10, -8, 28], [18, -2, 24], [38, 8, 18], [0, 10, 26]].forEach(([cx, cy, r]) => { circle(cx, cy, r); ctx.fill(); });
    ctx.restore();
  }
  function drawFan(x, y, t) {
    const on = LD.cond.wind;
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(x - 4, y + 30, 8, 46);
    ctx.fillStyle = '#64748b'; D.roundRect(x - 26, y + 72, 52, 10, 5); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.scale(0.55, 1);
    ctx.fillStyle = on ? 'rgba(186,230,253,.55)' : 'rgba(226,232,240,.6)';
    circle(0, 0, 38); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(x, y);
    const a0 = LD.fan;
    ctx.fillStyle = on ? '#38bdf8' : '#94a3b8';
    for (let i = 0; i < 3; i++) {
      const a = a0 + (i / 3) * TAU;
      ctx.beginPath(); ctx.ellipse(0, Math.sin(a) * 16, 9, 15 * Math.abs(Math.cos(a)) + 2, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x, y, 21, 38, 0, 0, TAU); ctx.stroke();
    D.sphere(x, y, 5, '#475569', { gloss: false });
    text(x, y + 98, on ? '🌬️ 켜짐' : '꺼짐', { size: 13, weight: 800, color: on ? '#0369a1' : COL.muted });
  }
  function drawBasket(x, y) {
    ctx.fillStyle = '#c99a5b';
    ctx.beginPath(); ctx.moveTo(x - 62, y - 30); ctx.lineTo(x + 62, y - 30); ctx.lineTo(x + 50, y + 14); ctx.lineTo(x - 50, y + 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,40,.45)'; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 22, y - 30); ctx.lineTo(x + i * 18, y + 14); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x - 58, y - 14); ctx.lineTo(x + 58, y - 14); ctx.stroke();
    ctx.fillStyle = '#b07f45'; D.roundRect(x - 66, y - 36, 132, 9, 4); ctx.fill();
  }
  function drawShirt(t) {
    const g = shirtGeom(), wet = LD.wet;
    const col = mix('#93c5fd', '#1e4fa8', wet * 0.85);
    ctx.save();
    ctx.translate(g.cx, g.top);
    ctx.rotate(LD.state === 'idle' ? 0 : LD.sway.value);
    ctx.translate(-g.cx, -g.top);
    D.shadow(() => { ctx.fillStyle = col; shirtPath(g.cx, g.top, g.w, g.h, g.spread); ctx.fill(); }, { blur: 8, y: 4, color: 'rgba(30,50,90,.25)' });
    // 젖은 광택
    ctx.save(); shirtPath(g.cx, g.top, g.w, g.h, g.spread); ctx.clip();
    const sh = ctx.createLinearGradient(g.cx - g.w / 2, g.top, g.cx + g.w / 2, g.top + g.h);
    sh.addColorStop(0, rgba('#ffffff', 0.08 + 0.22 * wet)); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, rgba('#0b2a66', 0.12 * wet));
    ctx.fillStyle = sh; ctx.fillRect(g.cx - g.w, g.top, g.w * 2, g.h);
    if (!g.spread) {
      ctx.strokeStyle = 'rgba(15,40,90,.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(g.cx, g.top + 4); ctx.lineTo(g.cx, g.top + g.h - 4); ctx.stroke();
      ctx.fillStyle = 'rgba(15,40,90,.12)'; ctx.fillRect(g.cx, g.top, g.w / 2, g.h);
    }
    ctx.restore();
    // 집게
    if (LD.state !== 'idle') {
      const px = g.spread ? g.w * 0.31 : g.w * 0.42;
      [-px, px].forEach((dx) => { ctx.fillStyle = '#f4b860'; D.roundRect(g.cx + dx - 5, g.top - 12, 10, 22, 3); ctx.fill(); });
    }
    ctx.restore();
    // 물방울 · 수증기
    if (LD.state === 'run' && LD.hang.k > 0.95 && !RM) {
      if (wet > 0.55 && Math.random() < (wet - 0.5) * 0.4) FX.emit({ x: g.cx + rand(-g.w * 0.25, g.w * 0.25), y: g.top + g.h, vx: 0, vy: 30, life: 0.7, size: 2.6, color: '#3b82f6', gravity: 900 });
      const rate = ldRate() / (RATE0 * 8.27);
      const n = (0.6 + 4 * rate) * (g.spread ? 1.4 : 0.8);
      if (Math.random() < n * 0.25) {
        FX.emit({ x: g.cx + rand(-g.w * 0.35, g.w * 0.35), y: g.top + rand(g.h * 0.2, g.h * 0.85), vx: LD.cond.wind ? rand(70, 110) : rand(-8, 8), vy: rand(-36, -18), life: rand(1.3, 2.1), size: rand(5, 8), grow: 9, color: 'rgba(191,219,254,.7)', shape: 'smoke' });
      }
    }
    if (LD.state !== 'idle') {
      const bx = g.cx - (PHONE ? 52 : 70), by = g.top + g.h + (PHONE ? 18 : 22), bw = PHONE ? 104 : 140;
      ctx.fillStyle = 'rgba(255,255,255,.85)'; D.roundRect(bx - 8, by - 15, bw + 16, 34, 10); ctx.fill();
      text(bx, by - 2, '물기', { size: 13, weight: 800, color: '#1e4fa8', align: 'left' });
      text(bx + bw, by - 2, Math.round(wet * 100) + '%', { size: 13, weight: 800, color: '#1e4fa8', align: 'right' });
      ctx.fillStyle = '#e2e8f0'; D.roundRect(bx, by + 4, bw, 8, 4); ctx.fill();
      ctx.fillStyle = '#3b82f6'; D.roundRect(bx, by + 4, Math.max(8, bw * wet), 8, 4); ctx.fill();
    } else {
      D.ring(g.cx, g.top + 24, 46, t, { color: '#f59e0b' });
    }
  }
  function drawWeatherCard(x, y) {
    const c = LD.cond, w = PHONE ? 150 : 172, h = PHONE ? 74 : 82;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.94)'; D.roundRect(x, y, w, h, 14); ctx.fill(); }, { blur: 8, y: 2 });
    const fs = PHONE ? 13 : 14, lh = PHONE ? 21 : 24;
    text(x + 12, y + 22, '🌡️ ' + (c.temp ? '30 °C (따뜻함)' : '10 °C (쌀쌀함)'), { size: fs, weight: 800, color: c.temp ? '#c2410c' : '#475569', align: 'left' });
    text(x + 12, y + 22 + lh, '💧 습도 ' + (c.dry ? '30 % (건조)' : '85 % (습함)'), { size: fs, weight: 800, color: c.dry ? '#b45309' : '#475569', align: 'left' });
    text(x + 12, y + 22 + lh * 2, '🌬️ ' + (c.wind ? '바람 있음' : '바람 없음'), { size: fs, weight: 800, color: c.wind ? '#0369a1' : '#475569', align: 'left' });
  }
  function drawClock() {
    const L = LAY.laundry, x = L.clock.x, y = L.clock.y;
    const done = LD.state === 'done', ok = done && LD.hours * 60 <= TARGET_MIN + 1e-6;
    const w = PHONE ? 150 : 200, h = PHONE ? 62 : 66;
    D.shadow(() => { ctx.fillStyle = done ? (ok ? '#e2f6eb' : '#fff4dc') : 'rgba(255,255,255,.94)'; D.roundRect(x - w / 2, y - h / 2, w, h, 14); ctx.fill(); }, { blur: 8, y: 2 });
    const tStr = LD.state === 'idle' ? '대기 중' : fmtTime(LD.hours);
    text(x, y - 4, (done ? (ok ? '✅ ' : '⌛ ') : '⏱ ') + tStr, { size: PHONE ? 17 : 19, weight: 800, color: done ? (ok ? '#0b6b39' : '#9a5b00') : COL.ink9 });
    text(x, y + 20, '🎯 ' + TARGET_MIN + '분 안에 말리기', { size: 13, weight: 800, color: COL.muted });
  }

  /* =========================================================
     장면 5: 확산일까, 증발일까? (카드 분류)
     ========================================================= */
  const CARD_DEFS = [
    { id: 'dog', e: '🐕', t: ['탐지견이 냄새로', '마약을 찾아요'], k: 'diff' },
    { id: 'coil', e: '🦟', t: ['모기향 연기가', '방 안에 퍼져요'], k: 'diff' },
    { id: 'hair', e: '💇', t: ['젖은 머리카락이', '말라요'], k: 'evap' },
    { id: 'salt', e: '🧂', t: ['염전의 바닷물이', '말라 소금이 남아요'], k: 'evap' },
    { id: 'flower', e: '🌸', t: ['꽃향기가', '멀리까지 퍼져요'], k: 'diff' },
    { id: 'mop', e: '🧽', t: ['물걸레로 닦은', '바닥이 말라요'], k: 'evap' },
  ];
  const SL = PHONE
    ? { cw: 196, ch: 58, tray: (i) => ({ x: 117 + (i % 2) * 206, y: 80 + Math.floor(i / 2) * 64 }), bins: { diff: { x: 8, y: 270, w: 208, h: 344 }, evap: { x: 224, y: 270, w: 208, h: 344 } }, binScale: 0.9, first: 78, pitch: 58 }
    : { cw: 172, ch: 60, tray: (i) => ({ x: 400, y: 92 + i * 74 }), bins: { diff: { x: 16, y: 54, w: 290, h: 492 }, evap: { x: 494, y: 54, w: 290, h: 492 } }, binScale: 1, first: 104, pitch: 70 };
  function resetSort() {
    const order = CARD_DEFS.slice().sort(() => Math.random() - 0.5);
    SORT.cards = order.map((d, i) => {
      const p = SL.tray(i);
      return Object.assign({}, d, { home: i, x: p.x, y: p.y, s: 1, bin: null, lift: 0, wrong: false, shakeT: -9, order: 0 });
    });
    SORT.solved = false; SORT.drag = null; SORT.hoverBin = null;
  }
  function binSlots(bin) {
    const B = SL.bins[bin], list = SORT.cards.filter((c) => c.bin === bin).sort((a, b) => a.order - b.order);
    const ch = SL.ch * SL.binScale, avail = B.h - SL.first - 10 - ch;
    const pitch = list.length > 1 ? Math.min(SL.pitch, avail / (list.length - 1)) : SL.pitch;
    return list.map((c, i) => ({ c, x: B.x + B.w / 2, y: B.y + SL.first + ch / 2 + i * pitch }));
  }
  function layoutCards(animate) {
    SORT.cards.forEach((c) => {
      if (c === SORT.drag) return;
      let tx, ty, ts;
      if (!c.bin) { const p = SL.tray(c.home); tx = p.x; ty = p.y; ts = 1; }
      else { const sl = binSlots(c.bin).find((s) => s.c === c); tx = sl.x; ty = sl.y; ts = SL.binScale; }
      if (animate) SciSim.tween(c, { x: tx, y: ty, s: ts }, { duration: 0.45, ease: 'outBack' });
      else { c.x = tx; c.y = ty; c.s = ts; }
    });
  }
  let orderSeq = 1;
  function cardAt(p) {
    for (let i = SORT.cards.length - 1; i >= 0; i--) {
      const c = SORT.cards[i], w = SL.cw * c.s, h = SL.ch * c.s;
      if (Math.abs(p.x - c.x) < w / 2 + 4 && Math.abs(p.y - c.y) < h / 2 + 4) return c;
    }
    return null;
  }
  function binAt(p) {
    for (const k of ['diff', 'evap']) { const B = SL.bins[k]; if (p.x > B.x && p.x < B.x + B.w && p.y > B.y && p.y < B.y + B.h) return k; }
    return null;
  }
  function sortCheck() {
    const left = SORT.cards.filter((c) => !c.bin).length;
    if (left) return '아직 상자에 넣지 않은 카드가 <b>' + left + '장</b> 있어요.';
    const wrong = SORT.cards.filter((c) => c.bin !== c.k);
    if (wrong.length) {
      wrong.forEach((c) => { if (!c.wrong) { c.wrong = true; c.shakeT = now(); } });
      return '빨간 테두리 카드 <b>' + wrong.length + '장</b>을 다시 생각해 보세요. 무언가가 <b>퍼져 나가나요</b>, 액체가 <b>말라 없어지나요</b>?';
    }
    return true;
  }
  function drawSortScene(t) {
    const B = SL.bins;
    text(VW / 2, PHONE ? 30 : 34, PHONE ? '카드를 끌어 알맞은 상자에 넣어요' : '✋ 카드를 끌어 알맞은 상자에 넣어요', { size: PHONE ? 14 : 15, weight: 800, color: COL.muted });
    [['diff', '💨 확산', '입자가 스스로 퍼져 나가요', '#8b5cf6', '#f5f1ff'], ['evap', '💧 증발', '액체 표면의 입자가 날아가요', '#0ea5e9', '#ecf8ff']].forEach(([k, title, sub, c, bg]) => {
      const b = B[k], hov = SORT.hoverBin === k && SORT.drag;
      D.shadow(() => { ctx.fillStyle = hov ? shade(bg, -0.03) : bg; D.roundRect(b.x, b.y, b.w, b.h, 18); ctx.fill(); }, { blur: hov ? 16 : 8, y: 3 });
      ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = rgba(c, hov ? 0.9 : 0.45); ctx.lineWidth = hov ? 3 : 2;
      D.roundRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8, 15); ctx.stroke(); ctx.restore();
      text(b.x + b.w / 2, b.y + (PHONE ? 30 : 38), title, { size: PHONE ? 19 : 22, weight: 800, color: shade(c, -0.25) });
      text(b.x + b.w / 2, b.y + (PHONE ? 52 : 66), sub, { size: 13, weight: 700, color: COL.muted });
      const n = SORT.cards.filter((cc) => cc.bin === k).length;
      for (let i = n; i < 3; i++) {
        const ch = SL.ch * SL.binScale, cw = SL.cw * SL.binScale, y = b.y + SL.first + i * SL.pitch;
        ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = rgba(c, 0.25); ctx.lineWidth = 1.5;
        D.roundRect(b.x + b.w / 2 - cw / 2, y, cw, ch, 12); ctx.stroke(); ctx.restore();
      }
    });
    const list = SORT.cards.slice().sort((a, b) => (a === SORT.drag) - (b === SORT.drag));
    list.forEach((c) => drawCard(c, t));
  }
  function drawCard(c, t) {
    const w = SL.cw * c.s, h = SL.ch * c.s, lift = c.lift || 0;
    let dx = 0;
    if (t - c.shakeT < 0.5) dx = Math.sin((t - c.shakeT) * 40) * 6 * (1 - (t - c.shakeT) / 0.5);
    const x = c.x + dx, y = c.y - lift * 4;
    ctx.save();
    ctx.translate(x, y); ctx.scale(1 + lift * 0.05, 1 + lift * 0.05);
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fill(); }, { blur: 6 + lift * 14, y: 2 + lift * 8, color: 'rgba(20,40,80,.22)' });
    const solved = SORT.solved && c.bin === c.k;
    ctx.strokeStyle = c.wrong ? COL.hot : solved ? COL.good : c.bin ? (c.bin === 'diff' ? '#c4b5fd' : '#7dd3fc') : '#dde4ef';
    ctx.lineWidth = c.wrong || solved ? 3 : 2;
    D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.stroke();
    ctx.font = D.font(24 * c.s, 400); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.e, -w / 2 + 22 * c.s, 1);
    ctx.fillStyle = COL.ink9; ctx.font = D.font((PHONE ? 13.5 : 14) * c.s, 700); ctx.textAlign = 'left';
    const tx = -w / 2 + 42 * c.s;
    ctx.fillText(c.t[0], tx, -9 * c.s); ctx.fillText(c.t[1], tx, 11 * c.s);
    ctx.restore();
  }

  /* =========================================================
     성공 효과 · 장면 전환
     ========================================================= */
  function celebrate(x, y, good) {
    if (good === false) return;
    FX.burst(x, y, { count: 22, colors: ['#8b5cf6', '#14a058', '#ffb400', '#3867f4', '#ec4899'], speed: 190 });
    checks.push({ x, y, t0: now() });
  }
  function drawChecks(t) {
    for (let i = checks.length - 1; i >= 0; i--) {
      const c = checks[i], e = t - c.t0;
      if (e > 1.8) { checks.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = e > 1.3 ? 1 - (e - 1.3) / 0.5 : 1;
      const s = 1 + 0.25 * ease.outBack(Math.min(1, e / 0.35)) - 0.25;
      ctx.translate(c.x, c.y); ctx.scale(s, s);
      D.check(0, 0, 26, Math.min(1, e / 0.5));
      ctx.restore();
    }
  }

  const SCENES = {
    ink: { label: '💧 물에 잉크 한 방울', hint: '💧 스포이트를 눌러 잉크를 한 방울 떨어뜨려 보세요' },
    perfume: { label: '🌸 교실에 퍼지는 향수', hint: '🌸 향수병을 눌러 향수를 뿌려 보세요' },
    temp: { label: '🌡️ 찬물과 뜨거운 물', hint: '💧 두 비커에 동시에 잉크를 떨어뜨려 보세요' },
    laundry: { label: '👕 빨래 말리기', hint: '👕 조건을 고르고 ▶ 젖은 빨래 널기를 눌러 보세요' },
    sort: { label: '🗂️ 확산일까, 증발일까?', hint: '✋ 카드를 끌어 알맞은 상자에 넣어 보세요' },
  };
  function setScene(name, reset) {
    const changed = S.scene !== name;
    S.scene = name;
    if (changed) { S.sceneT = 0; FX.clear(); S.lensK.value = 0; S.lensK.velocity = 0; }
    if (reset || changed && !sceneReady[name]) resetScene(name);
    sceneReady[name] = true;
    $('#tbLabel').textContent = SCENES[name].label;
    if (changed || reset) showHint(SCENES[name].hint, 6000);
    refreshUI();
  }
  const sceneReady = {};
  function resetScene(name) {
    if (name === 'ink') INK.reset();
    else if (name === 'perfume') resetPerfume();
    else if (name === 'temp') { TP.cold.reset(); TP.hot.reset(); TP.dropped = false; }
    else if (name === 'laundry') resetLaundry(true);
    else if (name === 'sort') { resetSort(); layoutCards(false); }
    sceneReady[name] = true;
  }

  /* =========================================================
     UI
     ========================================================= */
  const hintEl = $('#stageHint');
  function showHint(t, ms) { hintEl.textContent = t; hintEl.classList.remove('hide'); clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5000); }
  function hideHint() { hintEl.classList.add('hide'); }

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
    $('#zoomBtn').setAttribute('aria-pressed', S.zoom ? 'true' : 'false');
    lastFree = free;
  }
  function refreshCondUI() {
    $$('.cond').forEach((b) => {
      const k = b.dataset.cond, v = LD.cond[k], cv = b.querySelector('.cv');
      b.setAttribute('aria-pressed', v ? 'true' : 'false');
      cv.textContent = v ? cv.dataset.on : cv.dataset.off;
    });
    const hb = $('#hangBtn');
    hb.innerHTML = LD.state === 'idle' ? '▶ 젖은 빨래 널기' : LD.state === 'run' ? '↺ 처음부터 다시 널기' : '▶ 다시 젖은 빨래 널기';
  }
  function renderTrials() {
    const box = $('#trialLog');
    box.innerHTML = '';
    LD.trials.forEach((tr, i) => {
      const ic = (on, s) => '<span class="ic' + (on ? ' on' : '') + '">' + s + '</span>';
      box.insertAdjacentHTML('beforeend', '<div class="tl' + (tr.ok ? ' ok' : '') + '"><b>' + fmtTime(tr.h) + '</b>' +
        ic(tr.c.temp, '🌡️') + ic(tr.c.wind, '🌬️') + ic(tr.c.dry, '🏜️') + ic(tr.c.spread, '👕') +
        '<span class="k">' + (tr.ok ? '✅ 성공' : (i === 0 ? '최근' : '')) + '</span></div>');
    });
  }

  $('#zoomBtn').addEventListener('click', () => { Sound.click(); S.zoom = !S.zoom; refreshUI(); });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); resetScene(S.scene); showHint(SCENES[S.scene].hint, 5000); refreshUI(); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  function dropInk() {
    const r = INK.trigger();
    if (r === 'full') toast('잉크가 충분해요. ↺ 버튼으로 처음부터 다시 할 수 있어요.');
    else if (r) { Sound.click(); hideHint(); }
  }
  function dropBoth() {
    if (TP.cold.drop || TP.hot.drop || TP.cold.inject || TP.hot.inject) return;
    if (TP.cold.drops >= 3) { toast('잉크가 충분해요. ↺ 버튼으로 처음부터 다시 할 수 있어요.'); return; }
    TP.cold.trigger(); TP.hot.trigger(); TP.dropped = true; Sound.click(); hideHint();
  }
  $('#dropBtn').addEventListener('click', dropInk);
  $('#drop2Btn').addEventListener('click', dropBoth);
  $('#sprayBtn').addEventListener('click', doSpray);
  $$('.cond').forEach((b) => b.addEventListener('click', () => {
    Sound.click();
    const k = b.dataset.cond;
    LD.cond[k] = !LD.cond[k];
    if (LD.state !== 'idle') { resetLaundry(true); toast('조건을 바꿨어요. 젖은 빨래를 다시 널어 보세요.'); }
    applyCondToSims(); refreshCondUI();
  }));
  $('#hangBtn').addEventListener('click', () => { Sound.click(); hangLaundry(); });

  /* ---------- 캔버스 입력 ---------- */
  function hitDropper(p, x, top) { return Math.abs(p.x - x) < 34 && p.y > top - 6 && p.y < top + 120; }
  function hitBottle(p) { const b = LAY.perfume.bottle; return Math.abs(p.x - b.x) < 44 && p.y > b.y - 92 && p.y < b.y + 8; }
  function hitBasket(p) { const b = LAY.laundry.basket; return Math.abs(p.x - b.x) < 70 && p.y > b.y - 70 && p.y < b.y + 20; }
  function draggableAt(p) { return S.scene === 'sort' && !!cardAt(p) && !SORT.solved; }
  SciSim.pointer(view, {
    hover(p) {
      if (S.scene === 'ink') return hitDropper(p, LAY.ink.dropX, LAY.ink.dropTop) ? 'pointer' : null;
      if (S.scene === 'temp') return [0, 1].some((i) => hitDropper(p, tempGeom(i).dropX, LAY.temp.dropTop)) ? 'pointer' : null;
      if (S.scene === 'perfume') return hitBottle(p) ? 'pointer' : null;
      if (S.scene === 'laundry') return LD.state === 'idle' && hitBasket(p) ? 'pointer' : null;
      if (S.scene === 'sort') return draggableAt(p) ? 'grab' : null;
      return null;
    },
    down(p) {
      if (S.scene === 'ink') { if (hitDropper(p, LAY.ink.dropX, LAY.ink.dropTop)) dropInk(); return false; }
      if (S.scene === 'temp') { if ([0, 1].some((i) => hitDropper(p, tempGeom(i).dropX, LAY.temp.dropTop))) dropBoth(); return false; }
      if (S.scene === 'perfume') { if (hitBottle(p)) doSpray(); return false; }
      if (S.scene === 'laundry') { if (LD.state === 'idle' && hitBasket(p)) { Sound.click(); hangLaundry(); } return false; }
      if (S.scene === 'sort') {
        if (SORT.solved) return false;
        const c = cardAt(p);
        if (!c) return false;
        SORT.drag = c; c.offX = p.x - c.x; c.offY = p.y - c.y; c.wrong = false;
        SciSim.tween(c, { lift: 1, s: 1 }, { duration: 0.16, ease: 'outQuad' });
        Sound.click(); hideHint();
        return true;
      }
      return false;
    },
    move(p) {
      const c = SORT.drag;
      if (!c) return;
      c.x = clamp(p.x - c.offX, 20, VW - 20); c.y = clamp(p.y - c.offY, 20, VH - 20);
      SORT.hoverBin = binAt(p);
    },
    up(p) {
      const c = SORT.drag;
      if (!c) return;
      SORT.drag = null;
      const bin = binAt(p);
      if (bin !== c.bin) c.order = orderSeq++;
      c.bin = bin;
      SORT.hoverBin = null;
      SciSim.tween(c, { lift: 0 }, { duration: 0.25 });
      if (bin) Sound.tone(660, 0.06, 'triangle', 0.05);
      layoutCards(true);
    },
  });
  // 휴대폰: 카드가 아닌 곳을 끌면 페이지가 스크롤되도록
  view.canvas.style.touchAction = 'pan-y';
  view.canvas.addEventListener('touchstart', (e) => {
    const tc = e.touches[0];
    if (tc && draggableAt(view.toLocal(tc))) e.preventDefault();
  }, { passive: false });

  /* =========================================================
     측정값 표시
     ========================================================= */
  let lastUI = 0;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    if (lastFree !== !!(game && game.free)) refreshUI();
    const pct = (u) => Math.round(u * 100) + '<small>%</small>';
    if (S.scene === 'ink') { $('#rU').innerHTML = pct(INK.u); }
    else if (S.scene === 'perfume') { $('#rSpray').innerHTML = PF.room.sprayed + '<small>개</small>'; $('#rArrive').innerHTML = PF.room.arrived + '<small>개</small>'; }
    else if (S.scene === 'temp') { $('#rUc').innerHTML = pct(TP.cold.u); $('#rUh').innerHTML = pct(TP.hot.u); }
    else if (S.scene === 'laundry') {
      $('#rWet').innerHTML = pct(LD.wet);
      const m = Math.round(LD.hours * 60);
      $('#rTime').innerHTML = LD.state === 'idle' ? '-' : (m >= 60 ? Math.floor(m / 60) + '<small>시간</small> ' + (m % 60) + '<small>분</small>' : m + '<small>분</small>');
      $('#rBest').innerHTML = LD.best == null ? '-' : fmtTime(LD.best).replace(/(\d+)(시간|분)/g, '$1<small>$2</small>');
    }
  }

  /* =========================================================
     미션
     ========================================================= */
  const mark = (b) => (b ? '✅' : '⬜');
  const pctS = (u) => Math.round(u * 100) + '%';

  // 퀴즈 그림: 퍼지기 전과 후의 잉크 입자 (크기·개수 그대로)
  const FIG_INK = (function () {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    function panel(ox, spread) {
      let s = '<rect x="' + ox + '" y="22" width="132" height="100" rx="12" fill="#eaf4ff" stroke="#bcd3ee"/>';
      const ink = [];
      if (spread) for (let i = 0; i < 6; i++) ink.push([ox + 18 + (i % 3) * 44 + rnd() * 14, 40 + Math.floor(i / 3) * 46 + rnd() * 14]);
      else for (let i = 0; i < 6; i++) ink.push([ox + 54 + (i % 3) * 12 + rnd() * 4, 52 + Math.floor(i / 3) * 12 + rnd() * 4]);
      for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 6; gx++) {
        const x = ox + 12 + gx * 21 + rnd() * 6, y = 32 + gy * 20 + rnd() * 6;
        if (ink.some((p) => (p[0] - x) ** 2 + (p[1] - y) ** 2 < 150)) continue;
        s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6.5" fill="#8cc0f7"/>';
      }
      ink.forEach((p) => { s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="6.5" fill="#7c3aed"/>'; });
      return s;
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 132" width="320" role="img" aria-label="떨어뜨린 직후 모여 있던 잉크 입자 6개가 나중에 물 입자 사이로 고르게 퍼진 모습">' +
      '<text x="76" y="15" text-anchor="middle" font-size="13" font-weight="700" fill="#5d6879">떨어뜨린 직후</text>' +
      '<text x="244" y="15" text-anchor="middle" font-size="13" font-weight="700" fill="#5d6879">한참 뒤</text>' +
      panel(10, false) + panel(178, true) +
      '<path d="M148 72 h18" stroke="#8b5cf6" stroke-width="3"/><path d="M166 66 l8 6 -8 6z" fill="#8b5cf6"/></svg>';
  })();
  // 퀴즈 그림: 물 표면에서 입자가 날아감
  const FIG_EVAP = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 120" width="300" role="img" aria-label="물 표면의 입자가 공기 중으로 날아가는 모습">' +
    '<rect x="0" y="0" width="300" height="120" rx="12" fill="#f3f8ff"/>' +
    '<rect x="0" y="62" width="300" height="58" fill="#cfe5fb"/>' +
    (function () { let s = ''; for (let r = 0; r < 3; r++) for (let i = 0; i < 14; i++) s += '<circle cx="' + (12 + i * 21 + (r % 2) * 10) + '" cy="' + (72 + r * 17) + '" r="7" fill="#5fa8f5"/>'; return s; })() +
    '<circle cx="86" cy="34" r="7" fill="#5fa8f5"/><path d="M86 52 v-8" stroke="#f59e0b" stroke-width="2.5"/><path d="M80 46 l6 -8 6 8" fill="none" stroke="#f59e0b" stroke-width="2.5"/>' +
    '<circle cx="196" cy="22" r="7" fill="#5fa8f5"/><path d="M190 46 l4 -14" stroke="#f59e0b" stroke-width="2.5"/>' +
    '<text x="292" y="56" text-anchor="end" font-size="12" font-weight="700" fill="#5d6879">표면</text></svg>';

  game = SciSim.game({
    simId: 'm1-diffusion',
    mount: '#game',
    badge: '입자 운동 탐정',
    homeHref: '../../index.html#g1',
    featureLabels: {
      ink: '💧 물과 잉크 스포이트',
      zoom: '🔍 입자 모형 돋보기',
      perfume: '🌸 교실과 향수',
      temp: '🌡️ 찬물·뜨거운 물 비커',
      laundry: '👕 빨래 말리기 조건',
      sort: '🗂️ 현상 분류 카드',
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
        title: '확산: 저절로 퍼지는 잉크와 향수', short: '확산', icon: '💧', phase: '관찰',
        features: ['ink', 'zoom', 'perfume'],
        intro: '<p class="si-q">❓ 탐구 질문: 교실 한쪽에서 뿌린 향수 냄새가 어떻게 반대편까지 퍼질까?</p>' +
          '<p>물에 <b>잉크</b>를 한 방울 떨어뜨리고, 교실 한쪽에서 <b>향수</b>를 뿌려 봐요. 아무도 젓거나 부채질하지 않을 때 어떻게 되는지 관찰해요. <b>🔍 입자 모형</b>으로 눈에 보이지 않는 입자도 들여다봐요.</p>',
        setup() { setScene('ink', true); },
        recap: '잉크와 향수는 젓거나 바람이 없어도 저절로 퍼져요. 물질을 이루는 입자가 <b>스스로 운동하여</b> 퍼져 나가는 이 현상을 <b>확산</b>이라고 해요.',
        summary: '<p><b>확산</b>: 물질을 이루는 입자가 <b>스스로 운동하여</b> 퍼져 나가는 현상</p>' +
          '<ul><li>물에 떨어뜨린 잉크는 젓지 않아도 물 전체로 고르게 퍼진다.</li>' +
          '<li>교실 한쪽에서 뿌린 향수는 바람이 없어도 반대편까지 퍼진다.</li>' +
          '<li>확산은 액체 속에서도, 기체 속에서도 일어난다.</li></ul>',
        missions: [
          {
            title: '물에 잉크 한 방울', scene: 'ink',
            goal: '스포이트로 물에 잉크를 한 방울 떨어뜨리고, 잉크가 물 전체에 <b>고르게 퍼질 때까지</b> 지켜보세요.',
            hint: '<b>💧 잉크 한 방울 떨어뜨리기</b>를 누르고 기다려요. 🔍 입자 모형에서 보라색 잉크 입자가 어떻게 움직이는지도 보세요.',
            setup() { if (!(INK.dropped && INK.u < 0.9)) setScene('ink', true); },
            check: () => INK.dropped && INK.u >= 0.9,
            onWin() { const g = inkGeom(); celebrate(g.x + g.w / 2, g.y + g.h * 0.55); },
            status: () => '💧 떨어뜨리기 ' + mark(INK.dropped) + ' · 고르게 퍼진 정도 <b>' + pctS(INK.u) + '</b> / 90%',
            hold: 0,
            explain: '물을 젓지 않았는데도 잉크가 물 전체로 고르게 퍼졌어요. 🔍 입자 모형을 보면 잉크 입자와 물 입자가 <b>스스로 끊임없이 움직이며</b> 서로 섞여요.',
          },
          {
            title: '교실에 퍼지는 향수', scene: 'perfume',
            goal: '교실 한쪽에서 <b>🌸 향수</b>를 뿌리고, 향기가 반대편 친구에게 닿을 때까지 지켜보세요. 교실에 바람은 없어요.',
            hint: '향수병이나 <b>🌸 향수 뿌리기</b> 버튼을 눌러요. 분홍색 향수 입자가 공기 입자와 부딪히며 어떻게 움직이는지 보세요.',
            setup() { setScene('perfume', true); },
            check: () => PF.room.arrived >= 3,
            onWin() { const f = LAY.perfume.friend; celebrate(f.x - 40, f.y - 150); },
            status: () => '🌸 뿌리기 ' + mark(PF.room.sprayed > 0) + ' · 친구에게 도착한 향수 입자 <b>' + Math.min(3, PF.room.arrived) + ' / 3</b>',
            hold: 0,
            explain: '바람이 없는데도 향수 입자가 공기 입자 사이를 지나 교실 반대편까지 퍼졌어요. 향수 입자는 공기 입자와 부딪혀 방향이 바뀌지만, <b>스스로 끊임없이 움직이므로</b> 결국 교실 전체로 퍼져요.',
          },
          {
            type: 'quiz', title: '저절로 퍼진 까닭', scene: 'perfume',
            goal: '물을 젓지 않았고 교실에 바람도 없었는데, 잉크와 향수가 퍼진 까닭은 무엇일까요?',
            choices: ['물과 공기가 흐르면서 잉크와 향수를 실어 날랐기 때문', '잉크와 향수를 이루는 입자가 스스로 끊임없이 움직이기 때문', '잉크와 향수 입자가 점점 커져서 공간을 채웠기 때문', '잉크와 향수 입자가 무거워서 아래로 가라앉았기 때문'],
            answer: 1,
            feedback: ['물을 젓지 않았고 바람도 없었어요. 흐름이 없어도 퍼졌다는 점에 주목해요!', '', '🔍 입자 모형에서 입자의 크기는 그대로였어요.', '향수는 옆으로, 위로도 퍼졌어요. 가라앉는 것과는 달라요.'],
            explain: '물질을 이루는 입자는 <b>스스로 끊임없이 움직여요</b>. 그래서 젓거나 바람이 불지 않아도 입자가 퍼져 나가요. 이 현상을 <b>확산</b>이라고 해요.',
          },
        ],
      },
      {
        title: '온도와 확산 빠르기', short: '온도와 확산', icon: '🌡️', phase: '실험',
        features: ['temp'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 입자가 스스로 움직여 퍼지는 <b>확산</b>을 관찰했어요.</div>' +
          '<p>찬물(10 °C)과 뜨거운 물(60 °C)에 잉크를 <b>동시에</b> 떨어뜨려 어느 쪽에서 더 빨리 퍼지는지 비교해요. 온도 말고는 모든 조건이 같아요.</p>',
        setup() { setScene('temp', true); },
        recap: '온도가 높을수록 입자의 운동이 <b>활발해져</b> 확산이 빨리 일어나요. 찬물에서도 확산은 일어나요.',
        summary: '<ul><li>뜨거운 물(60 °C)에서 잉크가 찬물(10 °C)보다 <b>더 빨리</b> 퍼진다.</li>' +
          '<li>온도가 높을수록 입자가 더 <b>활발하게</b> 움직이기 때문이다.</li>' +
          '<li>찬물에서도 입자는 움직여 확산이 일어난다. 다만 더 느리다.</li></ul>',
        missions: [
          {
            title: '찬물과 뜨거운 물', scene: 'temp',
            goal: '찬물(10 °C)과 뜨거운 물(60 °C)에 잉크를 <b>동시에</b> 떨어뜨리고, 어느 쪽이 먼저 고르게 퍼지는지 비교해 보세요.',
            hint: '<b>💧 두 비커에 동시에 떨어뜨리기</b>를 누르고, 두 🔍 입자 모형 속 입자의 빠르기도 비교해요.',
            setup() { if (!(TP.dropped && TP.hot.u < 0.9)) setScene('temp', true); },
            check: () => TP.dropped && TP.hot.u >= 0.9,
            onWin() { const g = tempGeom(1); celebrate(g.x + g.w / 2, g.y + g.h * 0.55); },
            status: () => '❄️ 찬물 <b>' + pctS(TP.cold.u) + '</b> · 🔥 뜨거운 물 <b>' + pctS(TP.hot.u) + '</b> (먼저 90%가 되는 쪽은?)',
            hold: 0,
            explain: '뜨거운 물에서 잉크가 훨씬 빨리 퍼졌어요. 🔍 입자 모형을 보면 뜨거운 물의 입자가 더 빠르게 움직여요. 찬물에서도 잉크는 퍼지고 있지만 더 느려요.',
          },
          {
            type: 'quiz', title: '더 빨리 퍼진 까닭', scene: 'temp',
            goal: '뜨거운 물에서 잉크가 더 빨리 퍼진 까닭은 무엇일까요?',
            choices: ['온도가 높을수록 입자가 더 활발하게 움직이기 때문', '뜨거운 물에서는 잉크 입자가 커지기 때문', '찬물에서는 입자가 전혀 움직이지 않기 때문', '뜨거운 물에 잉크를 더 많이 떨어뜨렸기 때문'],
            answer: 0,
            feedback: ['', '두 비커의 🔍 입자 모형에서 입자의 크기는 같았어요.', '찬물에서도 잉크는 조금씩 퍼졌어요. 입자는 언제나 움직여요.', '두 비커에 같은 양을 동시에 떨어뜨렸어요. 온도 말고는 조건이 모두 같았어요.'],
            explain: '온도가 높을수록 입자의 운동이 <b>활발해져서</b> 확산이 빨리 일어나요. 찬물에서도 입자는 움직이지만 더 느리게 움직여요.',
          },
        ],
      },
      {
        title: '증발: 빨래가 마르는 까닭', short: '증발', icon: '👕', phase: '관찰',
        features: ['laundry'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 온도가 높을수록 입자가 활발하게 움직여 확산이 빠르다는 것을 알았어요.</div>' +
          '<p>젖은 빨래는 물을 끓이지 않아도 말라요. 🔍 입자 모형으로 젖은 빨래의 물 <b>표면</b>을 들여다보고, 조건을 바꿔 가며 빨래를 빨리 말려 봐요.</p>',
        setup() { setScene('laundry', true); },
        recap: '액체 <b>표면</b>의 입자가 스스로 운동하여 공기 중으로 날아가는 현상이 <b>증발</b>이에요. 온도가 높고, 바람이 불고, 습도가 낮고, 넓게 펼칠수록 증발이 잘 일어나요.',
        summary: '<p><b>증발</b>: 액체 <b>표면</b>에서 입자가 스스로 운동하여 공기 중으로 날아가는 현상</p>' +
          '<ul><li>증발은 물이 끓는 온도보다 낮은 온도에서도 일어난다.</li>' +
          '<li>증발이 잘 일어나는 조건: 온도가 높을수록, 바람이 불수록, 습도가 낮을수록, 표면적이 넓을수록</li></ul>',
        missions: [
          {
            title: '빨래 빨리 말리기', scene: 'laundry',
            goal: '조건을 바꿔 가며 젖은 빨래를 <b>' + TARGET_MIN + '분 안에</b> 말려 보세요. 🔍 입자 모형으로 물 표면도 살펴보세요.',
            hint: '온도, 바람, 습도, 빨래를 넌 모양을 모두 생각해 보세요. 조건을 하나씩 바꿔 보면 무엇이 도움이 되는지 알 수 있어요.',
            setup() { LD.missionBest = null; if (LD.state !== 'run') resetLaundry(true); },
            check: () => LD.missionBest != null && LD.missionBest * 60 <= TARGET_MIN + 1e-6,
            onWin() {},
            status: () => (LD.state === 'idle' ? '조건을 고르고 ▶ 널기를 눌러요' : LD.state === 'run' ? '말리는 중… <b>' + fmtTime(LD.hours) + '</b>' : '이번 기록 <b>' + fmtTime(LD.hours) + '</b>') +
              ' · 가장 빠른 기록 <b>' + (LD.missionBest == null ? '-' : fmtTime(LD.missionBest)) + '</b> / 🎯 ' + TARGET_MIN + '분',
            hold: 0.2,
            explain: '따뜻하고(온도↑), 바람이 불고, 건조하고(습도↓), 넓게 펼치면(표면적↑) 빨래가 가장 빨리 말라요. 🔍 입자 모형에서 물 <b>표면</b>의 입자가 스스로 공기 중으로 날아갔어요. 이 현상이 <b>증발</b>이에요.',
          },
          {
            type: 'quiz', title: '증발은 어디에서?', scene: 'laundry',
            goal: '증발에 대한 설명으로 옳은 것은 무엇일까요?',
            figure: FIG_EVAP,
            choices: ['물이 100 °C가 되어야만 일어난다', '액체 표면에서 입자가 스스로 운동하여 공기 중으로 날아가는 현상이다', '액체 내부에서 기포가 생기며 일어난다', '물 입자가 없어져서 물의 양이 줄어드는 현상이다'],
            answer: 1,
            feedback: ['빨래는 100 °C가 아니어도 말랐어요. 증발은 끓는 온도보다 낮은 온도에서도 일어나요.', '', '액체 내부에서 기포가 생기는 것은 증발이 아니에요. 증발은 액체 <b>표면</b>에서 일어나요.', '입자는 없어지지 않아요. 공기 중으로 흩어져 눈에 보이지 않을 뿐이에요.'],
            explain: '증발은 액체 <b>표면</b>의 입자가 스스로 운동하여 공기 중으로 날아가는 현상이에요. 물이 끓지 않는 낮은 온도에서도 일어나요. 날아간 입자는 없어진 것이 아니라 공기 중에 흩어져 있어요.',
          },
        ],
      },
      {
        title: '입자는 스스로 운동한다', short: '입자 운동', icon: '🔬', phase: '설명',
        features: ['sort'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 액체 표면의 입자가 공기 중으로 날아가는 <b>증발</b>을 관찰했어요.</div>' +
          '<p>생활 속 현상을 <b>확산</b>과 <b>증발</b>로 나누고, 두 현상이 공통으로 알려 주는 사실을 정리해요.</p>',
        setup() { setScene('sort', !SORT.solved); },
        recap: '확산과 증발은 물질을 이루는 입자가 <b>스스로 끊임없이 운동</b>한다는 증거예요. 이때 입자의 크기와 수는 변하지 않아요.',
        summary: '<ul><li><b>확산의 예</b>: 탐지견이 냄새로 마약을 찾는다, 모기향 연기가 퍼진다, 꽃향기가 퍼진다.</li>' +
          '<li><b>증발의 예</b>: 젖은 머리카락이 마른다, 염전에서 소금을 얻는다, 물걸레질한 바닥이 마른다.</li>' +
          '<li>확산과 증발로 물질을 이루는 입자가 <b>스스로 끊임없이 운동</b>한다는 것을 알 수 있다.</li>' +
          '<li>입자가 퍼지거나 날아가도 입자의 <b>크기와 수는 변하지 않는다</b>.</li></ul>',
        missions: [
          {
            title: '확산일까, 증발일까?', scene: 'sort', manual: true,
            goal: '생활 속 현상 카드를 끌어 <b>💨 확산</b> 상자와 <b>💧 증발</b> 상자에 나누어 넣고 <b>✔ 확인하기</b>를 누르세요.',
            hint: '무언가가 <b>퍼져 나가면</b> 확산, 액체가 <b>말라 없어지면</b> 증발이에요.',
            setup() { if (S.scene !== 'sort') setScene('sort'); if (SORT.solved) { resetSort(); layoutCards(false); } },
            check: () => sortCheck(),
            onWin() { SORT.solved = true; const b = SL.bins; celebrate(PHONE ? VW / 2 : 400, PHONE ? b.diff.y + 40 : 300); },
            status: () => '상자에 넣은 카드 <b>' + SORT.cards.filter((c) => c.bin).length + ' / ' + SORT.cards.length + '</b>',
            explain: '냄새·연기·향기가 퍼지는 것은 <b>확산</b>, 젖은 것이 마르거나 바닷물이 말라 소금이 남는 것은 <b>증발</b>이에요. 두 현상 모두 입자가 스스로 운동하기 때문에 일어나요.',
          },
          {
            type: 'quiz', title: '두 현상이 알려 주는 것', scene: 'sort',
            goal: '확산과 증발 현상으로 알 수 있는 사실은 무엇일까요?',
            choices: ['물질을 이루는 입자는 스스로 끊임없이 운동한다', '입자는 바람이 불 때만 움직인다', '입자는 액체 속에서만 움직인다', '입자는 온도가 높을 때만 움직인다'],
            answer: 0,
            feedback: ['', '바람이 없는 교실에서도 향수가 퍼졌어요.', '향수는 공기(기체) 속에서도 퍼졌고, 빨래의 물 입자는 공기 중으로 날아갔어요.', '찬물(10 °C)에서도 잉크는 퍼졌어요. 다만 느렸을 뿐이에요.'],
            explain: '확산과 증발은 모두 물질을 이루는 입자가 <b>스스로 끊임없이 운동</b>하기 때문에 일어나요. 입자는 온도가 낮을 때에도 움직여요. 온도가 높을수록 더 활발할 뿐이에요.',
          },
          {
            type: 'quiz', title: '퍼진 잉크 입자의 크기', scene: 'ink',
            goal: '잉크가 물 전체로 퍼지면서 색이 옅어졌어요. 이때 잉크 입자에 대한 설명으로 옳은 것은?',
            figure: FIG_INK,
            choices: ['잉크 입자가 점점 작아졌다', '잉크 입자의 크기와 수는 그대로이고, 물 입자 사이사이로 고르게 퍼졌다', '잉크 입자가 물에 녹아 없어졌다', '잉크 입자가 커져서 물 전체를 채웠다'],
            answer: 1,
            feedback: ['🔍 입자 모형에서 잉크 입자의 크기는 처음과 같았어요.', '', '입자는 없어지지 않아요. 물 전체에 고르게 퍼져서 색이 옅어 보일 뿐이에요.', '입자의 크기는 변하지 않아요. 입자 사이사이로 퍼져 나간 거예요.'],
            explain: '잉크 입자의 <b>크기와 수는 변하지 않아요</b>. 같은 수의 잉크 입자가 물 전체로 고르게 퍼져서, 같은 부피 속 잉크 입자 수가 줄어들어 색이 옅어 보여요.',
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
  const LEVEL_SCENE = ['ink', 'ink', 'temp', 'laundry', 'sort'];
  if (!S.scene) {
    const m = game.current();
    setScene((m && m.scene) || LEVEL_SCENE[game.level + 1] || 'ink', true);
  }
  refreshCondUI(); renderTrials(); refreshUI();

  function update(dt) {
    S.sceneT += dt;
    const lensOn = S.zoom && on('zoom');
    S.lensK.target = lensOn ? 1 : 0;
    S.lensK.update(dt);
    if (S.scene === 'ink') INK.step(dt, inkGeom());
    else if (S.scene === 'perfume') {
      PF.room.step(dt, LAY.perfume.zoneX);
      PF.smell = SciSim.approach(PF.smell, PF.room.arrived >= 3 ? 1 : 0, dt, 4);
    } else if (S.scene === 'temp') { TP.cold.step(dt, tempGeom(0)); TP.hot.step(dt, tempGeom(1)); }
    else if (S.scene === 'laundry') stepLaundry(dt);
    FX.update(dt);
  }
  function draw(t) {
    view.clear(BG);
    if (S.scene === 'ink') drawInkScene(t);
    else if (S.scene === 'perfume') drawPerfumeScene(t);
    else if (S.scene === 'temp') drawTempScene(t);
    else if (S.scene === 'laundry') drawLaundryScene(t);
    else if (S.scene === 'sort') drawSortScene(t);
    if (S.scene !== 'laundry') FX.draw(ctx);
    drawChecks(t);
    // 장면 전환: 부드럽게 나타나기
    if (S.sceneT < 0.4) {
      ctx.save(); ctx.globalAlpha = 1 - ease.outCubic(S.sceneT / 0.4);
      ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH); ctx.restore();
    }
  }
  SciSim.loop((dt, t) => {
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
    state() {
      return {
        scene: S.scene, inkU: INK.u, inkDropped: INK.dropped, cold: TP.cold.u, hot: TP.hot.u, tpDropped: TP.dropped,
        sprayed: PF.room.sprayed, arrived: PF.room.arrived, ld: { state: LD.state, wet: LD.wet, hours: LD.hours, best: LD.missionBest, cond: Object.assign({}, LD.cond) },
        sort: SORT.cards.map((c) => ({ id: c.id, bin: c.bin, k: c.k, x: c.x, y: c.y })), lensK: S.lensK.value,
        evap: { liq: EV.liq.length, vap: EV.vap.length },
      };
    },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / VW, y: r.top + (y * r.height) / VH }; },
    solveSort() { SORT.cards.forEach((c) => { c.bin = c.k; c.order = orderSeq++; c.wrong = false; }); layoutCards(false); },
    wrongSort() { SORT.cards.forEach((c) => { c.bin = 'diff'; c.order = orderSeq++; }); layoutCards(false); },
    setCond(o) { Object.assign(LD.cond, o); applyCondToSims(); refreshCondUI(); },
    perf() { return { liq: INK.lens.p.length, gas: PF.room.p.length }; },
  };
})();
