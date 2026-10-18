/* =========================================================
   화학 Ⅲ. 화학 평형 - 반응 지수와 진행 방향 [12화학03-03]
   ① 모형: Q 계산 (현재 농도를 K와 같은 식에 넣고, Q가 K에 다가가는 그래프)
   ② 탐구: Q와 K (저울로 비교해 정반응 · 평형 · 역반응 판정)
   ③ 예측: 방향 예측 (먼저 예측한 뒤 실행해 확인)
   ④ 적용: 판정 적용 (SO₂ 혼합물, 오개념, Q = K 경계)
   평형 농도를 구하는 이차 방정식 풀이와 압력 평형 상수는 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const INK = '#1b2333', MUTED = '#5d6879', VIO = '#7c3aed', AMB = '#d97706', GOOD = '#14a058', BAD = '#e2464b', BLU = '#3867f4', LINE = '#d5d9e6';
  const BGC = '#f4f1fb';
  const CO = SciSim.color;

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BGC });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  const rnd = (a, b) => a + Math.random() * (b - a);
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = [], W = (t) => ctx.measureText(t).width;
    String(str).split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((w) => {
        const t = line ? line + ' ' + w : w;
        if (W(t) <= maxW || !line) line = t; else { out.push(line); line = w; }
        if (W(line) > maxW) { let cur = ''; for (const ch of line) { if (W(cur + ch) > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; } line = cur; }
      });
      out.push(line);
    });
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const tws = [];
  function tw(o, to, opts) { const h = SciSim.tween(o, to, opts); tws.push(h); if (tws.length > 80) tws.splice(0, 40); return h; }
  function cancelTweens() { tws.forEach((h) => h && h.cancel && h.cancel()); tws.length = 0; }
  const smooth01 = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const lerpN = (a, b, t) => a + (b - a) * t;
  const mixc = (a, b, t) => CO.mix(a, b, clamp(t, 0, 1));
  const rgba = (c, a) => CO.rgba(c, a);

  /* ---------- 글자 · 숫자 서식 ---------- */
  const SUBD = '₀₁₂₃₄₅₆₇₈₉', SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const FOR = (k) => k.replace(/\d/g, (d) => SUBD[+d]);
  const supN = (n) => String(n).split('').map((c) => (c === '-' ? '⁻' : SUPD[+c])).join('');
  // 유효숫자 2~3자리로 정확히 표현되는 가장 짧은 소수 표기 (Q · K 표시용)
  function fq(v) {
    if (v === Infinity) return '∞';
    if (!isFinite(v) || isNaN(v)) return '-';
    if (v === 0) return '0';
    const a = Math.abs(v), r = Number(a.toPrecision(3)), e = Math.floor(Math.log10(r) + 1e-12);
    if (r >= 1000) return String(Math.round(r));
    for (const n of [2, 3]) { const dec = Math.max(0, n - 1 - e), s = r.toFixed(dec); if (Math.abs(Number(s) - r) < 1e-9 * r) return (v < 0 ? '-' : '') + s; }
    return (v < 0 ? '-' : '') + r.toFixed(Math.max(0, 2 - e));
  }
  const fc = (v) => (Math.round(v * 1e6) / 1e6 < 0 ? 0 : v).toFixed(3);          // 몰 농도 (mol/L) 소수 셋째 자리
  // 농도 표시: 소수 셋째 자리로 딱 떨어지면 3자리, 아니면 5자리 (표시한 숫자로 다시 계산해도 Q가 K와 맞도록)
  const fcx = (v) => { v = Math.max(0, v); const r = Math.round(v * 1000) / 1000; return Math.abs(v - r) < 5e-7 ? r.toFixed(3) : v.toFixed(5); };
  const parseNum = (s) => { const t = String(s).replace(',', '.').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const sameQK = (q, k) => Math.abs(q - k) <= 0.002 * k;                          // Q = K 판정 (같다고 표시되는 범위)
  const dirOf = (q, k) => (sameQK(q, k) ? 'eq' : q < k ? 'fwd' : 'rev');
  const DIR_TXT = { fwd: '정반응 →', rev: '← 역반응', eq: '평형 (이동 없음)' };
  const DIR_COL = { fwd: GOOD, rev: BAD, eq: BLU };

  /* ---------- 반응 · 평형 계산 ---------- */
  // rx = {sp:[{k:'H2', c:계수, side:0(반응물)|1(생성물)}], K, unit}
  function mkRx(o) { o.nu = o.sp.map((s) => (s.side ? s.c : -s.c)); return o; }
  function qOf(rx, c) {
    let num = 1, den = 1;
    rx.sp.forEach((s, i) => { const v = Math.pow(Math.max(0, c[i]), s.c); if (s.side) num *= v; else den *= v; });
    if (den === 0) return num === 0 ? NaN : Infinity;
    return num / den;
  }
  function extRange(rx, c) {
    let lo = -Infinity, hi = Infinity;
    rx.sp.forEach((s, i) => { if (s.side) lo = Math.max(lo, -c[i] / s.c); else hi = Math.min(hi, c[i] / s.c); });
    return [lo, hi];
  }
  const concAt = (rx, c, x) => rx.sp.map((s, i) => Math.max(0, c[i] + rx.nu[i] * x));
  function solveExt(rx, c, K) {
    let [lo, hi] = extRange(rx, c);
    for (let i = 0; i < 120; i++) { const m = (lo + hi) / 2; const q = qOf(rx, concAt(rx, c, m)); if (q < K) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  /* ---------- 분자 모형 (스프라이트) ---------- */
  const EL = { H: ['#e6ebf5', 4.6], I: ['#8b3fd1', 8.2], N: ['#3867f4', 6.2], O: ['#e2464b', 5.6], S: ['#f2b705', 7.6], C: ['#5b6577', 6.2], F: ['#14a058', 6] };
  const MOL = {
    H2: [['H', -4.8, 0], ['H', 4.8, 0]],
    I2: [['I', -8, 0], ['I', 8, 0]],
    HI: [['H', -9.2, 0], ['I', 4.4, 0]],
    N2: [['N', -6, 0], ['N', 6, 0]],
    O2: [['O', -5.6, 0], ['O', 5.6, 0]],
    NH3: [['N', 0, -2], ['H', -8.5, 6.5], ['H', 8.5, 6.5], ['H', 0, 10.5]],
    N2O4: [['N', -5.6, 0], ['N', 5.6, 0], ['O', -11.5, -8.5], ['O', -11.5, 8.5], ['O', 11.5, -8.5], ['O', 11.5, 8.5]],
    NO2: [['N', 0, -3.5], ['O', -9.8, 5], ['O', 9.8, 5]],
    SO2: [['S', 0, -3.5], ['O', -10.4, 5.2], ['O', 10.4, 5.2]],
    SO3: [['S', 0, 0], ['O', 0, -12.8], ['O', -11.2, 6.6], ['O', 11.2, 6.6]],
    CO2: [['C', 0, 0], ['O', -11.8, 0], ['O', 11.8, 0]],
  };
  const spriteCache = {};
  function sprite(kind, sc) {
    const key = kind + '@' + (sc || 1);
    if (spriteCache[key]) return spriteCache[key];
    const S0 = 64, dpr = 2, cv = document.createElement('canvas');
    cv.width = cv.height = S0 * dpr;
    const c2 = cv.getContext('2d'), d2 = SciSim.draw(c2);
    c2.scale(dpr, dpr); c2.translate(S0 / 2, S0 / 2);
    (MOL[kind] || []).forEach((a) => { const e = EL[a[0]]; d2.sphere(a[1] * (sc || 1), a[2] * (sc || 1), e[1] * (sc || 1), e[0], { outline: 'rgba(30,40,70,.35)', outlineWidth: 0.8 }); });
    spriteCache[key] = { cv, S0 }; return spriteCache[key];
  }
  function drawMol(kind, x, y, ang, sc) {
    const s = sprite(kind, sc);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0); ctx.drawImage(s.cv, -s.S0 / 2, -s.S0 / 2, s.S0, s.S0); ctx.restore();
  }
  // 라벨 옆에 붙이는 작은 분자 아이콘
  const molColor = { H2: '#9aa6bd', I2: '#8b3fd1', HI: '#d97706', N2O4: '#6b7ea8', NO2: '#a65b1e', SO2: '#f2b705', O2: '#e2464b', SO3: '#d97706', N2: '#3867f4', NH3: '#14a058', CO2: '#5b6577' };

  /* ---------- 입자 용기 ---------- */
  // 용기 안쪽 사각형(r)에서 튕기는 분자들. 분자는 용기 밖으로 나가지 않아요.
  class Vessel {
    constructor(r, sc) { this.r = r; this.ps = []; this.fx = []; this.sc = sc || 1; this.pad = 14 * (sc || 1); }
    setRect(r) {
      const o = this.r;
      if (o.x !== r.x || o.y !== r.y || o.w !== r.w || o.h !== r.h) {
        const sx = o.w > 1 ? (r.w - 2 * this.pad) / Math.max(1, o.w - 2 * this.pad) : 1, sy = o.h > 1 ? (r.h - 2 * this.pad) / Math.max(1, o.h - 2 * this.pad) : 1;
        for (const p of this.ps) { p.x = r.x + this.pad + (p.x - o.x - this.pad) * sx; p.y = r.y + this.pad + (p.y - o.y - this.pad) * sy; }
        this.r = { x: r.x, y: r.y, w: r.w, h: r.h };
      }
    }
    count(k) { let n = 0; for (const p of this.ps) if (p.k === k) n++; return n; }
    inner() { return { x0: this.r.x + this.pad, x1: this.r.x + this.r.w - this.pad, y0: this.r.y + this.pad, y1: this.r.y + this.r.h - this.pad }; }
    add(k, n, at) {
      const b = this.inner();
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, sp = rnd(34, 62);
        const x = at ? clamp(at.x + rnd(-8, 8), b.x0, b.x1) : rnd(b.x0, Math.max(b.x0 + 1, b.x1)), y = at ? clamp(at.y + rnd(-8, 8), b.y0, b.y1) : rnd(b.y0, b.y1);
        this.ps.push({ k, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a: Math.random() * TAU, va: rnd(-2, 2) });
      }
    }
    remove(k, n) { for (let i = this.ps.length - 1; i >= 0 && n > 0; i--) if (this.ps[i].k === k) { this.ps.splice(i, 1); n--; } }
    setCount(k, n) { const c = this.count(k); if (n > c) this.add(k, n - c); else if (n < c) this.remove(k, c - n); }
    clear() { this.ps.length = 0; this.fx.length = 0; }
    // rx의 정반응(dir=1) 또는 역반응(dir=-1) 한 번: 반응물 분자를 골라 생성물 분자로 바꿔요 (가능하면 true)
    react(rx, dir) {
      const from = rx.sp.filter((s) => (dir > 0 ? !s.side : s.side)), to = rx.sp.filter((s) => (dir > 0 ? s.side : !s.side));
      const pick = [];
      for (const s of from) {
        const cand = this.ps.filter((p) => p.k === s.k && pick.indexOf(p) < 0);
        if (cand.length < s.c) return false;
        const base = pick.length ? pick[0] : cand[(Math.random() * cand.length) | 0];
        cand.sort((a, b) => Math.hypot(a.x - base.x, a.y - base.y) - Math.hypot(b.x - base.x, b.y - base.y));
        for (let i = 0; i < s.c; i++) pick.push(cand[i]);
      }
      let cx = 0, cy = 0; pick.forEach((p) => { cx += p.x; cy += p.y; }); cx /= pick.length; cy /= pick.length;
      this.ps = this.ps.filter((p) => pick.indexOf(p) < 0);
      to.forEach((s) => this.add(s.k, s.c, { x: cx, y: cy }));
      this.fx.push({ x: cx, y: cy, t: 0, col: dir > 0 ? GOOD : BAD });
      return true;
    }
    step(dt, speed) {
      const b = this.inner(), sp = speed == null ? 1 : speed;
      for (const p of this.ps) {
        p.x += p.vx * dt * sp; p.y += p.vy * dt * sp; p.a += p.va * dt;
        if (p.x < b.x0) { p.x = b.x0; p.vx = Math.abs(p.vx); } else if (p.x > b.x1) { p.x = Math.max(b.x0, b.x1); p.vx = -Math.abs(p.vx); }
        if (p.y < b.y0) { p.y = b.y0; p.vy = Math.abs(p.vy); } else if (p.y > b.y1) { p.y = b.y1; p.vy = -Math.abs(p.vy); }
      }
      for (let i = this.fx.length - 1; i >= 0; i--) { this.fx[i].t += dt; if (this.fx[i].t > 0.5) this.fx.splice(i, 1); }
    }
    drawPs() { for (const p of this.ps) drawMol(p.k, p.x, p.y, p.a, this.sc); }
    glass(tint) {
      const r = this.r;
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = '#f6fbff'; ctx.fill(); }, { blur: 8, y: 3 });
      if (tint) { ctx.save(); D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.clip(); ctx.fillStyle = tint; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.restore(); }
    }
    glassTop() {
      const r = this.r;
      ctx.save(); ctx.strokeStyle = 'rgba(80,110,160,.55)'; ctx.lineWidth = 3; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r.x + 9, r.y + 18); ctx.lineTo(r.x + 9, r.y + Math.min(r.h - 12, 70)); ctx.stroke(); ctx.restore();
    }
    draw(tint) {
      this.glass(tint);
      ctx.save(); D.roundRect(this.r.x, this.r.y, this.r.w, this.r.h, 12); ctx.clip();
      for (const p of this.ps) drawMol(p.k, p.x, p.y, p.a, this.sc);
      for (const f of this.fx) { const k = f.t / 0.5; ctx.strokeStyle = rgba(f.col, 0.8 * (1 - k)); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(f.x, f.y, 6 + k * 18, 0, TAU); ctx.stroke(); }
      ctx.restore();
      this.glassTop();
    }
  }

  /* ---------- 공통 그리기 도구 ---------- */
  function niceMax(v) {
    if (!(v > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
    for (const c of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m <= c + 1e-9) return c * p;
    return 10 * p;
  }
  // 그래프 상자 + 눈금. 반환: X(t), Y(v)
  function axes(rc, xmax, ymax, xl, yl, o) {
    o = o || {};
    const x0 = rc.x + (o.left || 46), x1 = rc.x + rc.w - 14, y0 = rc.y + rc.h - (o.bottom || 34), y1 = rc.y + (o.top || 30);
    const X = (t) => x0 + (t / xmax) * (x1 - x0), Y = (v) => y0 - (v / ymax) * (y0 - y1);
    ctx.save(); ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const v = (ymax * i) / 4, y = Y(v);
      ctx.strokeStyle = i ? '#e6e9f2' : '#9aa3b8'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      T(x0 - 6, y + 4, (o.fy || fq)(v), 12, MUTED, 'right', 700);
    }
    ctx.strokeStyle = '#9aa3b8'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    const nx = o.nx || 6;
    for (let i = 0; i <= nx; i++) { const t = (xmax * i) / nx; T(X(t), y0 + 16, (o.fx || ((v) => String(+v.toFixed(1))))(t), 12, MUTED, 'center', 700); }
    ctx.restore();
    T((x0 + x1) / 2, rc.y + rc.h - 6, xl, 12.5, MUTED, 'center', 800);
    T(x0 + 6, y1 - 8, yl, 12.5, MUTED, 'left', 800);
    return { X, Y, x0, x1, y0, y1 };
  }
  // 로그 눈금 Q·K 게이지: 가로 한 줄 위에 K(고정 표시)와 Q(움직이는 표시)
  function qkGauge(x, y, w, Q, K, lo, hi, o) {
    o = o || {};
    const LX = (v) => x + ((Math.log10(Math.max(v, Math.pow(10, lo))) - lo) / (hi - lo)) * w;
    const d = dirOf(Q, K), col = DIR_COL[d];
    ctx.save();
    const kx = LX(K), qx = LX(Q);
    D.roundRect(x, y - 9, w, 18, 9); ctx.fillStyle = '#e8eaf4'; ctx.fill();
    // K를 기준으로 왼쪽(Q < K, 정반응)과 오른쪽(Q > K, 역반응)
    ctx.save(); D.roundRect(x, y - 9, w, 18, 9); ctx.clip();
    ctx.fillStyle = rgba(GOOD, 0.22); ctx.fillRect(x, y - 9, kx - x, 18); ctx.fillStyle = rgba(BAD, 0.22); ctx.fillRect(kx, y - 9, x + w - kx, 18); ctx.restore();
    for (let e = Math.ceil(lo); e <= hi; e++) {
      const tx = LX(Math.pow(10, e)); ctx.strokeStyle = '#9aa3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx, y + 7); ctx.lineTo(tx, y + 13); ctx.stroke();
      T(tx, y + 28, '10' + supN(e), 12, MUTED, 'center', 700);
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(kx, y - 18); ctx.lineTo(kx, y + 14); ctx.stroke();
    D.label(kx, y - 30, 'K = ' + fq(K), { bg: INK, size: 13 });
    const qpos = Q === 0 ? x : qx;
    D.sphere(clamp(qpos, x, x + w), y, 11, col, { shadow: true });
    D.label(clamp(qpos, x + 36, x + w - 36), y + 48, 'Q = ' + fq(Q), { bg: col, size: 13.5 });
    if (kx - x > 84) T(x + (kx - x) / 2, y + 4, '정반응 →', 11.5, '#0b6b39', 'center', 800);
    if (x + w - kx > 84) T(kx + (x + w - kx) / 2, y + 4, '← 역반응', 11.5, '#a3262b', 'center', 800);
    ctx.restore();
  }
  // 가로 막대 (농도 등): frac 0~1 이내로 막대 안에서만 그려요
  function hbar(x, y, w, h, frac, color, label, value) {
    const f = clamp(frac, 0, 1);
    ctx.save();
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#e8eaf4'; ctx.fill();
    if (f > 0) { ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, CO.shade(color, 0.25)); g.addColorStop(1, color); ctx.fillStyle = g; ctx.fillRect(x, y, w * f, h); ctx.restore(); }
    ctx.restore();
    T(x, y - 5, label, 13.5, INK, 'left', 800); T(x + w, y - 5, value, 13.5, INK, 'right', 800);
  }
  function stamp(cx, cy, text, color, rot, t, sc) {
    const k = clamp(t, 0, 1), s = (1 + (1 - SciSim.ease.outBack(k)) * 0.8) * (sc || 1);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot || -0.2); ctx.scale(s, s); ctx.globalAlpha = k;
    ctx.strokeStyle = color; ctx.lineWidth = 4; D.roundRect(-56, -22, 112, 44, 10); ctx.stroke();
    T(0, 7, text, 22, color, 'center', 800); ctx.restore();
  }
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function setReadouts(a) {
    const key = a.join('|'); if (key === rlast) return; rlast = key;
    l1.textContent = a[0]; v1.innerHTML = a[1]; l2.textContent = a[2]; v2.innerHTML = a[3]; l3.textContent = a[4]; v3.innerHTML = a[5];
  }

  /* ---------- 일반 용기 패널 (분자 용기 + 농도 막대) ---------- */
  // o: { title, vessel, sp:[{k,name,col}], c:[], barMax, unitTxt, tint, pill:{txt,col,blink}, stampAt }
  function vpGeneric(r, o) {
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 14, r.y + 26, o.title, 14.5, INK, 'left', 800);
    if (o.pill) { ctx.save(); ctx.globalAlpha = o.pill.blink ? 0.65 + 0.35 * Math.sin(S_T() * 8) : 1; D.label(r.x + r.w - 12, r.y + 24, o.pill.txt, { bg: o.pill.col, size: 13, align: 'right' }); ctx.restore(); }
    const n = o.sp.length, stacked = r.h > r.w * 1.3;
    let vr, bx, by, bw, step;
    if (!stacked) {
      const vw = clamp(r.w * 0.47, 130, 220);
      vr = { x: r.x + 14, y: r.y + 42, w: vw, h: r.h - 56 };
      bx = vr.x + vw + 18; bw = r.x + r.w - 14 - bx; by = r.y + 78; step = Math.min(58, (r.h - 120) / n);
    } else {
      vr = { x: r.x + 14, y: r.y + 42, w: r.w - 28, h: r.h - 42 - n * 54 - 44 };
      bx = r.x + 40; bw = r.w - 56; by = vr.y + vr.h + 38; step = 54;
    }
    o.vessel.setRect(vr);
    o.vessel.draw(o.tint || null);
    o.sp.forEach((s, i) => {
      const y = by + i * step;
      drawMol(s.k, bx - 12 + (stacked ? -4 : 0), y - 8, 0, 0.8);
      hbar(bx + 14, y, bw - 14, 14, o.c[i] / o.barMax, s.col, '[' + s.name + ']', fcx(o.c[i]));
    });
    textBlock(bx - (stacked ? 28 : 6), by + n * step + 6, (stacked ? r.w - 24 : bw + 8), o.unitTxt, 12, MUTED, 15, 700);
    return vr;
  }
  let S_T = () => performance.now() / 1000;

  /* ---------- 반응 자료 ---------- */
  const RX = {
    hi: mkRx({ id: 'hi', eq: 'H₂(g) + I₂(g) ⇌ 2HI(g)', sp: [{ k: 'H2', c: 1, side: 0 }, { k: 'I2', c: 1, side: 0 }, { k: 'HI', c: 2, side: 1 }], K: 25, unit: 0.01, barMax: 0.5, sc: 1 }),
    n2o4: mkRx({ id: 'n2o4', eq: 'N₂O₄(g) ⇌ 2NO₂(g)', sp: [{ k: 'N2O4', c: 1, side: 0 }, { k: 'NO2', c: 2, side: 1 }], K: 0.006, unit: 0.002, barMax: 0.1, sc: 0.9 }),
    so3: mkRx({ id: 'so3', eq: '2SO₂(g) + O₂(g) ⇌ 2SO₃(g)', sp: [{ k: 'SO2', c: 2, side: 0 }, { k: 'O2', c: 1, side: 0 }, { k: 'SO3', c: 2, side: 1 }], K: 10, unit: 0.02, barMax: 0.5, sc: 0.9 }),
  };
  const MX = {
    a: { rx: 'hi', c: [0.06, 0.06, 0.02], tag: '㉠' },
    b: { rx: 'hi', c: [0.01, 0.01, 0.12], tag: '㉡' },
    c: { rx: 'hi', c: [0.02, 0.02, 0.1], tag: '㉢' },
    d: { rx: 'hi', c: [0.05, 0.02, 0.1], tag: '㉣' },
    e: { rx: 'hi', c: [0.04, 0.01, 0.2], tag: '㉤' },
    f: { rx: 'hi', c: [0.04, 0.04, 0], tag: '㉥ HI 없음' },
    n1: { rx: 'n2o4', c: [0.02, 0.02], tag: 'N₂O₄ 혼합물' },
    n2: { rx: 'n2o4', c: [0.08, 0.01], tag: 'N₂O₄ 혼합물 B' },
    s1: { rx: 'so3', c: [0.2, 0.1, 0.3], tag: '혼합물 ① SO₃ 0.300' },
    s2: { rx: 'so3', c: [0.2, 0.1, 0.1], tag: '혼합물 ② SO₃ 0.100' },
  };
  const QM = {};
  Object.keys(MX).forEach((k) => { const m = MX[k]; const rx = RX[m.rx]; QM[k] = { q: qOf(rx, m.c), xeq: solveExt(rx, m.c, rx.K) }; QM[k].ceq = concAt(rx, m.c, QM[k].xeq); QM[k].d = dirOf(QM[k].q, rx.K); });
  const eqTxt = (id) => { const m = MX[id], rx = RX[m.rx]; return rx.sp.map((s, i) => '[' + FOR(s.k) + '] = ' + fcx(QM[id].ceq[i])).join(', '); };
  const spName = (rx, i) => '[' + FOR(rx.sp[i].k) + ']';

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'model', t: 0, fade: 0, gate: '',
    rx: RX.hi, base: MX.a.c.slice(), c: MX.a.c.slice(),
    beam: new SciSim.Spring(0, { stiffness: 70, damping: 8 }),
    qOk: false, runsDone: 0, seen: {}, dwell: 0, dwellId: '', judged: {}, pred: {}, verdict: null, side: {}, judgeShake: 0, sentShake: 0,
    cardsIn: 0, stampT: 0, lastRunOk: null,
  };
  const RUN = { active: false, done: false, trivial: false, x: 0, xEq: 0, t: 0, ev: 0, hist: [], hacc: 0, gymax: 1 };
  const vessel = new Vessel({ x: 0, y: 0, w: 100, h: 100 }, 1);
  let game = null;
  const qNow = () => qOf(S.rx, S.c);
  const q0 = () => qOf(S.rx, S.base);
  const MODE_LABEL = { model: '🧩 Q 계산', scale: '⚖️ Q와 K', predict: '🎯 방향 예측', apply: '🧪 판정 적용' };
  const MODE_DEF = { model: 'a', scale: 'a', predict: 'd', apply: 's1' };
  const LISTS = { model: ['a', 'b', 'c', 'd', 'e'], scale: ['a', 'b', 'c'], predict: ['d', 'e', 'n1', 'f'], apply: ['s1', 's2'] };

  function matchId() {
    for (const k of Object.keys(MX)) { const m = MX[k]; if (RX[m.rx] === S.rx && m.c.every((v, i) => Math.abs(v - S.base[i]) < 1e-9)) return k; }
    return null;
  }
  function resetVessel() {
    vessel.clear();
    S.rx.sp.forEach((s, i) => vessel.add(s.k, Math.round(S.base[i] / S.rx.unit)));
    vessel.sc = S.rx.sc;
  }
  function cancelRun() {
    RUN.active = false; RUN.done = false; RUN.trivial = false; RUN.hist = []; RUN.x = 0; RUN.t = 0; RUN.ev = 0; S.stampT = 0; S.lastRunOk = null;
    S.c = S.base.slice(); setGY();
  }
  function setGY() {
    const q = q0(), K = S.rx.K;
    if (S.mode === 'predict') { const ce = concAt(S.rx, S.base, solveExt(S.rx, S.base, K)); RUN.gymax = niceMax(1.15 * Math.max.apply(null, S.base.concat(ce))); }
    else RUN.gymax = niceMax(1.15 * Math.max(isFinite(q) ? q : 0, K));
  }
  function loadMix(id) {
    const m = MX[id]; S.rx = RX[m.rx]; S.base = m.c.slice(); cancelRun(); resetVessel(); S.verdict = null; syncSliders(); updateCtl();
  }
  function syncSliders() {
    if (S.rx.id === 'hi') { [['sH', 'oH', 0], ['sI', 'oI', 1], ['sP', 'oP', 2]].forEach(([s, o, i]) => { $('#' + s).value = S.base[i]; $('#' + o).textContent = S.base[i].toFixed(3); }); }
    if (S.rx.id === 'so3') { $('#sS').value = S.base[2]; $('#oS').textContent = S.base[2].toFixed(3); }
  }
  function startRun() {
    if (RUN.active || S.rx == null) return;
    if (S.mode === 'predict' && !S.verdict) { showHint('먼저 아래에서 예측(정반응 · 평형 · 역반응)을 골라요.', 3000); Sound.fail(); return; }
    cancelRun(); resetVessel();
    const xEq = solveExt(S.rx, S.base, S.rx.K);
    RUN.xEq = xEq; RUN.hist = [[0, qNow()].concat(S.c)];
    if (Math.abs(xEq) < 1e-9) {
      RUN.trivial = true; RUN.done = true; S.stampT = 0.001; Sound.success();
      showHint('이미 평형이에요! Q = K라서 농도가 변하지 않아요. (겉으로 변화가 없을 뿐, 정반응과 역반응은 같은 속도로 계속돼요)', 5200);
      if (S.mode === 'predict') evalPred();
      updateCtl(); return;
    }
    RUN.active = true; Sound.click(); updateCtl();
  }
  function stepRun(dt) {
    if (!RUN.active) return;
    RUN.t += dt;
    const fin = RUN.t >= 6;
    RUN.x = fin ? RUN.xEq : RUN.xEq * (1 - Math.exp(-RUN.t / 0.8));
    const rx = S.rx; S.c = concAt(rx, S.base, RUN.x);
    const target = Math.round(RUN.x / rx.unit);
    let guard = 4;
    while (RUN.ev < target && guard-- > 0) { if (vessel.react(rx, 1)) RUN.ev++; else break; }
    while (RUN.ev > target && guard-- > 0) { if (vessel.react(rx, -1)) RUN.ev--; else break; }
    RUN.hacc += dt;
    if (RUN.hacc >= 0.04 || fin) { RUN.hacc = 0; RUN.hist.push([Math.min(RUN.t, 6), qNow()].concat(S.c)); }
    if (fin) {
      RUN.active = false; RUN.done = true; S.c = S.c.map((v) => Math.round(v * 1e6) / 1e6); S.stampT = 0.001;
      RUN.hist[RUN.hist.length - 1] = [6, qNow()].concat(S.c);
      if (!RUN.trivial) S.runsDone++;
      Sound.success(); const R = panelRects().vp; parts.burst(R.x + R.w / 2, R.y + R.h / 2, { count: 18, speed: 150, size: 3.2, colors: ['#8b5cf6', '#14a058', '#ffb400'] });
      if (S.mode === 'predict') evalPred();
      updateCtl();
    }
  }
  function evalPred() {
    const id = matchId(); if (!id) return;
    const ok = S.verdict === QM[id].d; S.lastRunOk = ok;
    if (ok) { S.pred[id] = true; Sound.success(); showHint('예측이 맞았어요! Q = ' + fq(QM[id].q) + ', K = ' + fq(S.rx.K) + ' → ' + DIR_TXT[QM[id].d], 5200); }
    else { Sound.fail(); showHint('예측과 달라요. Q = ' + fq(QM[id].q) + ' ' + (QM[id].q < S.rx.K ? '<' : '>') + ' K = ' + fq(S.rx.K) + '이므로 ' + DIR_TXT[QM[id].d] + '이에요. ↺ 처음 농도로 돌아가 다시 예측해 봐요.', 7000); }
  }

  /* ---------- 장면 · 제어 ---------- */
  function setScene(mode, noLoad) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    const changed = S.mode !== mode; S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    if (changed && !noLoad) loadMix(MODE_DEF[mode]);
    S.dwell = 0; S.dwellId = '';
    buildChips(); updateCtl();
  }
  function buildChipRow(boxId, ids) {
    const box = $('#' + boxId); box.innerHTML = '';
    ids.forEach((id) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.id = id; b.textContent = MX[id].tag; if (MX[id].tag.length === 1) b.style.fontSize = '20px';
      b.addEventListener('click', () => { Sound.click(); loadMix(id); S.dwell = 0; });
      box.appendChild(b);
    });
  }
  function buildChips() { buildChipRow('presetChips', LISTS.model); buildChipRow('scaleChips', LISTS.scale); buildChipRow('predChips', LISTS.predict); buildChipRow('applyChips', LISTS.apply); }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const id = matchId(), busy = RUN.active;
    ['presetChips', 'scaleChips', 'predChips', 'applyChips'].forEach((bid) => $$('#' + bid + ' button').forEach((b) => {
      b.classList.toggle('on', b.dataset.id === id); b.disabled = busy;
      b.classList.toggle('done', (bid === 'predChips' && !!S.pred[b.dataset.id]) || (bid === 'scaleChips' && !!S.seen[b.dataset.id]) || (bid === 'applyChips' && !!S.judged[b.dataset.id]));
    }));
    ['sH', 'sI', 'sP', 'sS'].forEach((s) => { $('#' + s).disabled = busy; });
    $$('#vd button').forEach((b) => { b.classList.toggle('on', b.dataset.v === S.verdict); b.disabled = busy || (S.mode === 'predict' && RUN.done); });
    $('#vdHead').textContent = S.mode === 'predict' ? '🎯 내 예측' : '🧭 내 판정';
    const noRun = S.mode === 'predict' ? (RUN.done || busy || !S.verdict) : (busy || RUN.done);
    $('#bRun').disabled = noRun; $('#bReset').disabled = busy || (!RUN.done && !(RUN.hist.length));
    $('#bJudge').disabled = busy || !S.verdict;
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $('#bRun').addEventListener('click', startRun);
  $('#bReset').addEventListener('click', () => { Sound.click(); const id = matchId(); cancelRun(); resetVessel(); if (S.mode === 'predict') S.verdict = null; updateCtl(); });
  [['sH', 'oH', 0], ['sI', 'oI', 1], ['sP', 'oP', 2], ['sS', 'oS', 2]].forEach(([s, o, i]) => {
    $('#' + s).addEventListener('input', () => {
      const v = Math.round(+$('#' + s).value * 1000) / 1000; $('#' + o).textContent = v.toFixed(3);
      if (RUN.active) return;
      S.base[i] = v; cancelRun(); resetVessel(); updateCtl();
    });
  });
  $$('#vd button').forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; Sound.click(); S.verdict = b.dataset.v; updateCtl(); }));
  $('#bJudge').addEventListener('click', () => {
    const id = matchId(), q = q0(), K = S.rx.K, d = dirOf(q, K);
    if (!S.verdict) return;
    if (S.verdict === d) {
      Sound.success(); S.judgeShake = 0;
      if (id === 's1' || id === 's2') { S.judged[id] = true; showHint('맞아요! Q = ' + fq(q) + (d === 'eq' ? ' = ' : q < K ? ' < ' : ' > ') + 'K = ' + fq(K) + ' → ' + DIR_TXT[d], 4500); }
      else showHint('맞아요! Q = ' + fq(q) + '. 이번에는 미션의 두 예시 혼합물(① ②)도 판정해 봐요.', 4500);
      parts.burst(panelRects().gauge.x + 120, panelRects().gauge.y + 60, { count: 12, speed: 110, size: 3, colors: ['#8b5cf6', '#14a058', '#ffb400'] });
    } else {
      Sound.fail(); S.judgeShake = 0.5;
      showHint('Q = ' + fq(q) + ', K = ' + fq(K) + ' — 둘을 비교해 봐요. Q가 K보다 ' + (q < K ? '작으면 정반응' : '크면 역반응') + '이에요.', 5000);
      S.judgeWrong = (S.judgeWrong || 0) + 1;
    }
    S.verdict = null; updateCtl();
  });
  // Q 입력 (모형 1단계)
  $('#bQ').addEventListener('click', checkQ);
  $('#qIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') checkQ(); });
  $('#qIn').addEventListener('input', () => $('#qIn').classList.remove('bad'));
  function checkQ() {
    const v = parseNum($('#qIn').value), qa = QM.a.q, qi = $('#qIn');
    if (isNaN(v)) { Sound.fail(); showHint('Q를 숫자로 써 주세요.', 2600); return; }
    if (matchId() !== 'a') { Sound.fail(); showHint('먼저 슬라이더나 예시 ㉠으로 [H₂] = [I₂] = 0.060, [HI] = 0.020을 맞춰요.', 4200); return; }
    if (Math.abs(v - qa) <= 0.006) { S.qOk = true; qi.classList.remove('bad'); qi.classList.add('ok'); Sound.success(); showHint('맞아요! Q = ' + fq(qa) + ' (K = 25보다 훨씬 작아요).', 4200); }
    else {
      qi.classList.remove('bad'); void qi.offsetWidth; qi.classList.add('bad'); Sound.fail();
      const ns = 0.02 / 0.06 / 0.06;
      showHint(Math.abs(v - ns) < 0.2 ? '생성물 HI의 농도는 계수 2만큼 제곱해야 해요: [HI]² = 0.020².' : '식은 Q = [HI]² ÷ ([H₂][I₂])예요. 0.020² ÷ (0.060 × 0.060)을 계산해 보세요.', 5200);
    }
  }
  const SENT_OPT = [['', '고르세요'], ['fwd', '정반응 쪽으로 진행'], ['eq', '평형 (이동 없음)'], ['rev', '역반응 쪽으로 진행']];
  ['sn1', 'sn2', 'sn3'].forEach((id) => { $('#' + id).innerHTML = SENT_OPT.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join(''); });

  /* ================= 레이아웃 ================= */
  function panelRects() {
    const m = S.mode;
    if (!PHONE) {
      if (m === 'scale') return { sc: { x: 8, y: 8, w: 470, h: 544 }, vp: { x: 486, y: 8, w: 306, h: 544 } };
      if (m === 'apply') return { formula: { x: 8, y: 8, w: 784, h: 118 }, vp: { x: 8, y: 134, w: 340, h: 418 }, gauge: { x: 356, y: 134, w: 436, h: 146 }, cards: { x: 356, y: 288, w: 436, h: 264 } };
      return { formula: { x: 8, y: 8, w: 784, h: 118 }, vp: { x: 8, y: 134, w: 372, h: 418 }, gr: { x: 388, y: 134, w: 404, h: 418 } };
    }
    if (m === 'scale') return { sc: { x: 8, y: 8, w: 464, h: 350 }, vp: { x: 8, y: 366, w: 464, h: 326 } };
    if (m === 'apply') return { formula: { x: 8, y: 8, w: 464, h: 150 }, vp: { x: 8, y: 166, w: 464, h: 212 }, gauge: { x: 8, y: 386, w: 464, h: 112 }, cards: { x: 8, y: 506, w: 464, h: 186 } };
    return { formula: { x: 8, y: 8, w: 464, h: 150 }, vp: { x: 8, y: 166, w: 464, h: 250 }, gr: { x: 8, y: 424, w: 464, h: 268 } };
  }

  /* ---------- 공식 패널 ---------- */
  const tw0 = (s, size) => { ctx.save(); ctx.font = D.font(size, 800); const w = ctx.measureText(s).width; ctx.restore(); return w; };
  function symParts(rx) {
    const f = (side) => rx.sp.filter((s) => s.side === side).map((s) => '[' + FOR(s.k) + ']' + (s.c > 1 ? supN(s.c) : '')).join('');
    return [f(1), f(0)];
  }
  function numParts(rx, c) {
    const f = (side) => rx.sp.map((s, i) => ({ s, i })).filter((o) => o.s.side === side).map((o) => fcx(c[o.i]) + (o.s.c > 1 ? supN(o.s.c) : '')).join(' × ');
    return [f(1), f(0)];
  }
  // 줄 안에 글자와 분수를 이어 그리기 (가운데 정렬). 분수 기준선 = y
  function drawRow(cx, y, items, size) {
    const W = items.map((it) => (it.f ? Math.max(tw0(it.f[0], size), tw0(it.f[1], size)) + 12 : tw0(it.t, size)));
    let x = cx - W.reduce((a, b) => a + b, 0) / 2;
    items.forEach((it, i) => {
      const col = it.c || INK;
      if (it.f) {
        T(x + W[i] / 2, y - 6, it.f[0], size, col, 'center', 800);
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + W[i] - 2, y); ctx.stroke(); ctx.restore();
        T(x + W[i] / 2, y + size + 2, it.f[1], size, col, 'center', 800);
      } else T(x, y + size * 0.35, it.t, size, col, 'left', 800);
      x += W[i];
    });
  }
  function drawFormula(r, rx, c, o) {
    o = o || {};
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 16, r.y + 28, rx.eq, PHONE ? 17 : 19, INK, 'left', 800);
    D.label(r.x + r.w - 14, r.y + 26, 'K = ' + fq(rx.K), { bg: INK, size: 14, align: 'right' });
    const sym = symParts(rx), num = numParts(rx, c), q = qOf(rx, c), d = dirOf(q, rx.K);
    const res = o.hide ? '?' : fq(q), col = o.hide ? MUTED : DIR_COL[d];
    if (!PHONE) {
      drawRow(r.x + r.w / 2, r.y + 80, [{ t: 'Q  =  ' }, { f: sym }, { t: '   =   ' }, { f: num }, { t: '   =   ' }, { t: res, c: col }], 20);
    } else {
      drawRow(r.x + r.w / 2, r.y + 76, [{ t: 'Q  =  ' }, { f: sym }], 17);
      drawRow(r.x + r.w / 2, r.y + 126, [{ t: '=  ' }, { f: num }, { t: '  =  ' }, { t: res, c: col }], 17);
    }
    if (o.tag) D.label(r.x + 16, r.y + r.h - 12, o.tag, { bg: VIO, size: 12, align: 'left', pad: 7 });
  }

  /* ---------- 용기 + 농도 막대 ---------- */
  function drawVP(r, o) {
    o = o || {};
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 14, r.y + 26, '🧪 반응 용기', 14.5, INK, 'left', 800);
    const q = qNow(), K = S.rx.K, d = dirOf(q, K);
    if (!o.hideDir) {
      const txt = RUN.active ? DIR_TXT[d] : (RUN.done ? '평형' : DIR_TXT[d]);
      const col = RUN.done ? BLU : DIR_COL[d];
      ctx.save(); ctx.globalAlpha = RUN.active ? 0.65 + 0.35 * Math.sin(S.t * 8) : 1; D.label(r.x + r.w - 12, r.y + 24, txt, { bg: col, size: 13, align: 'right' }); ctx.restore();
    }
    const stacked = r.h > r.w * 1.3, n = S.rx.sp.length;
    let vr, bx, by, bw, step;
    if (!stacked) {
      const vw = clamp(r.w * 0.47, 130, 220);
      vr = { x: r.x + 14, y: r.y + 42, w: vw, h: r.h - 56 };
      bx = vr.x + vw + 18; bw = r.x + r.w - 14 - bx; by = r.y + 78; step = Math.min(58, (r.h - 120) / n);
    } else {
      vr = { x: r.x + 14, y: r.y + 42, w: r.w - 28, h: r.h - 42 - n * 54 - 44 };
      bx = r.x + 40; bw = r.w - 56; by = vr.y + vr.h + 38; step = 54;
    }
    vessel.setRect(vr);
    vessel.draw(null);
    S.rx.sp.forEach((s, i) => {
      const y = by + i * step;
      drawMol(s.k, bx - 12 + (stacked ? -4 : 0), y - 8, 0, 0.8);
      hbar(bx + 14, y, bw - 14, 14, S.c[i] / S.rx.barMax, SP_COL[i % 4], '[' + FOR(s.k) + ']', fcx(S.c[i]));
    });
    textBlock(bx - (stacked ? 28 : 6), by + n * step + 6, (stacked ? r.w - 24 : bw + 8), '● 분자 1개 ≈ ' + fc(S.rx.unit) + ' mol/L (모형)', 12, MUTED, 15, 700);
    if (RUN.done && S.stampT > 0) stamp(vr.x + vr.w / 2, vr.y + vr.h / 2, '평형', BLU, -0.2, S.stampT * 2.5);
  }
  const SP_COL = ['#7c8db5', '#8b3fd1', '#d97706', '#14a058'];

  /* ---------- Q-시간 그래프 / 농도-시간 그래프 ---------- */
  function drawQGraph(r) {
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 14, r.y + 26, '📈 Q – 시간 그래프', 14.5, INK, 'left', 800);
    const K = S.rx.K, ax = axes({ x: r.x, y: r.y + 10, w: r.w, h: r.h - 10 }, 6, RUN.gymax, '시간 (모형)', 'Q', { top: 36 });
    ctx.save(); ctx.beginPath(); ctx.rect(ax.x0, ax.y1 - 4, ax.x1 - ax.x0, ax.y0 - ax.y1 + 8); ctx.clip();
    D.dashedLine(ax.x0, ax.Y(K), ax.x1, ax.Y(K), { color: INK, width: 2.2, dash: [8, 6] });
    ctx.restore();
    D.label(ax.x1 - 4, ax.Y(K) - 14, 'K = ' + fq(K), { bg: INK, size: 12.5, align: 'right', pad: 7 });
    const h = RUN.hist;
    if (h.length > 1) {
      ctx.save(); ctx.strokeStyle = VIO; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath();
      h.forEach((p, i) => { const x = ax.X(p[0]), y = ax.Y(clamp(isFinite(p[1]) ? p[1] : RUN.gymax, 0, RUN.gymax)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
    }
    const q = qNow(), tt = h.length ? h[h.length - 1][0] : 0;
    const px = ax.X(tt), py = ax.Y(clamp(isFinite(q) ? q : RUN.gymax, 0, RUN.gymax));
    D.glow(px, py, 16, VIO, 0.4); D.sphere(px, py, 7, VIO, { shadow: true });
    D.label(clamp(px + 10, ax.x0 + 40, ax.x1 - 40), clamp(py - 20, ax.y1 + 8, ax.y0 - 14), 'Q = ' + fq(q), { bg: VIO, size: 12.5, align: 'left', pad: 7 });
    if (!h.length) T((ax.x0 + ax.x1) / 2, (ax.y0 + ax.y1) / 2 + 70, '▶ 반응시키기를 누르면 Q가 변해요', 13.5, MUTED, 'center', 800);
  }
  function drawCGraph(r) {
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 14, r.y + 26, '📈 농도 – 시간 그래프', 14.5, INK, 'left', 800);
    const rx = S.rx, ax = axes({ x: r.x, y: r.y + 10, w: r.w, h: r.h - 10 }, 6, RUN.gymax, '시간 (모형)', '농도 (mol/L)', { top: 64, fy: (v) => fc(v), left: 52 });
    const h = RUN.hist;
    rx.sp.forEach((s, i) => {
      if (h.length > 1) {
        ctx.save(); ctx.strokeStyle = SP_COL[i % 4]; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.beginPath();
        h.forEach((p, j) => { const x = ax.X(p[0]), y = ax.Y(clamp(p[2 + i], 0, RUN.gymax)); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
      }
      const tt = h.length ? h[h.length - 1][0] : 0, px = ax.X(tt), py = ax.Y(clamp(S.c[i], 0, RUN.gymax));
      D.sphere(px, py, 5.5, SP_COL[i % 4], { shadow: true });
      D.label(ax.x1 - 6, ax.y1 + 14 + i * 22, '[' + FOR(s.k) + ']', { bg: SP_COL[i % 4], size: 12, align: 'right', pad: 7 });
    });
    if (!h.length) T((ax.x0 + ax.x1) / 2, (ax.y0 + ax.y1) / 2 + 70, '예측한 뒤 ▶ 실행하기를 눌러요', 13.5, MUTED, 'center', 800);
    const id = matchId();
    if (RUN.done && S.lastRunOk !== null) stamp(r.x + r.w - 74, r.y + 26, S.lastRunOk ? '예측 적중!' : '다시 예측', S.lastRunOk ? GOOD : BAD, -0.1, S.stampT * 2.5, 0.78);
    if (RUN.done && id) T(r.x + 14, r.y + 48, '처음 Q = ' + fq(QM[id].q) + (QM[id].d === 'eq' ? ' = ' : QM[id].q < S.rx.K ? ' < ' : ' > ') + 'K = ' + fq(S.rx.K) + ' → ' + DIR_TXT[QM[id].d], 13.5, INK, 'left', 800);
  }

  /* ---------- 저울 ---------- */
  function drawScale(r) {
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 14, r.y + 26, '⚖️ Q 접시와 K 접시', 14.5, INK, 'left', 800);
    const Q = qNow(), K = S.rx.K, d = dirOf(Q, K), cx = r.x + r.w / 2, py = r.y + (PHONE ? 84 : 120);
    let tg = d === 'eq' ? 0 : clamp(Math.log10(K / Q) * 0.28, -0.32, 0.32);
    if (d !== 'eq') tg = Math.sign(tg) * Math.max(Math.abs(tg), 0.06);
    S.beam.target = tg;
    const th = S.beam.value, L = Math.min(r.w / 2 - 74, 172), SL = PHONE ? 66 : 110;
    const lx = cx - L * Math.cos(th), ly = py - L * Math.sin(th), rx2 = cx + L * Math.cos(th), ry = py + L * Math.sin(th);
    const baseY = py + (PHONE ? 170 : 262);
    // 받침대
    D.shadow(() => { D.roundRect(cx - 70, baseY, 140, 14, 7); ctx.fillStyle = '#7b6aa8'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.fillStyle = '#9a8cc4'; ctx.fillRect(cx - 7, py, 14, baseY - py + 2);
    // 접시 줄 · 접시
    [[lx, ly, 'Q', Q, VIO], [rx2, ry, 'K', K, INK]].forEach(([ex, ey, nm, val, col]) => {
      ctx.strokeStyle = '#8a8fa3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 52, ey + SL); ctx.moveTo(ex, ey); ctx.lineTo(ex + 52, ey + SL); ctx.stroke();
      D.shadow(() => { D.roundRect(ex - 62, ey + SL, 124, 11, 5.5); ctx.fillStyle = '#b8a8e0'; ctx.fill(); }, { blur: 5, y: 2 });
      const bh = 54, bwid = 100;
      D.shadow(() => { D.roundRect(ex - bwid / 2, ey + SL - bh, bwid, bh, 10); const g = ctx.createLinearGradient(0, ey + SL - bh, 0, ey + SL); g.addColorStop(0, CO.shade(col, 0.25)); g.addColorStop(1, col); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
      T(ex, ey + SL - bh + 20, nm === 'Q' ? 'Q (지금)' : 'K (평형)', 12.5, '#fff', 'center', 800);
      T(ex, ey + SL - 9, fq(val), 19, '#fff', 'center', 800);
    });
    // 보
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#6d5aa6'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx2, ry); ctx.stroke();
    ctx.strokeStyle = '#b9a9e8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, ly - 2); ctx.lineTo(rx2, ry - 2); ctx.stroke(); ctx.restore();
    D.sphere(cx, py, 11, '#f2b705', { shadow: true });
    // 방향 안내
    const capY = baseY + (PHONE ? 38 : 44), col = DIR_COL[d], al = 0.7 + 0.3 * Math.sin(S.t * 6);
    T(lx, py - 22 - (PHONE ? 0 : 6), '반응물 쪽', 12.5, MUTED, 'center', 800); T(rx2, py - 22 - (PHONE ? 0 : 6), '생성물 쪽', 12.5, MUTED, 'center', 800);
    ctx.save(); ctx.globalAlpha = d === 'eq' ? 1 : al;
    if (d === 'fwd') D.arrow(cx - 70, capY - 6, cx + 70, capY - 6, { color: col, width: 7, head: 18 });
    else if (d === 'rev') D.arrow(cx + 70, capY - 6, cx - 70, capY - 6, { color: col, width: 7, head: 18 });
    else D.label(cx, capY - 6, '수평 = 평형', { bg: col, size: 15, pad: 12 });
    ctx.restore();
    const cmp = d === 'eq' ? 'Q = K' : Q < K ? 'Q < K' : 'Q > K';
    T(cx, capY + 30, cmp + '  →  ' + DIR_TXT[d], PHONE ? 17 : 19, col, 'center', 800);
    if (RUN.done && S.stampT > 0 && d === 'eq') stamp(cx + (PHONE ? 90 : 130), r.y + 56, '평형', BLU, -0.2, S.stampT * 2.5);
  }

  /* ---------- 적용 장면: 게이지 · 오개념 카드 ---------- */
  function drawGauge(r) {
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 14, r.y + 26, '🧭 Q가 K의 어느 쪽?', 14.5, INK, 'left', 800);
    qkGauge(r.x + 30, r.y + (PHONE ? 56 : 84), r.w - 60, Math.max(qNow(), 1e-6), S.rx.K, -1, 2);
  }
  function drawCards(r) {
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 14, r.y + 26, '⚠️ 틀리기 쉬운 생각', 14.5, INK, 'left', 800);
    const cards = [
      { t: '“농도가 같으면 평형이다”', b: 'N₂O₄ ⇌ 2NO₂에서 [N₂O₄] = [NO₂] = 0.020이어도 Q = ' + fq(QM.n1.q) + ' > K = 0.0060이라 역반응이에요. 평형인 H₂ + I₂ ⇌ 2HI는 [H₂] = [I₂] = 0.020, [HI] = 0.100으로 농도가 서로 달라요.' },
      { t: '“Q가 1보다 작으면 정반응이다”', b: '같은 N₂O₄ 혼합물은 Q = ' + fq(QM.n1.q) + ' < 1이지만 K = 0.0060보다 커서 역반응이에요. 비교 대상은 1이 아니라 K예요.' },
    ];
    const cw = PHONE ? r.w - 24 : (r.w - 36) / 2, ch = PHONE ? (r.h - 56) / 2 : r.h - 50;
    cards.forEach((c, i) => {
      const k = smooth01(S.cardsIn * 1.4 - i * 0.3), x = PHONE ? r.x + 12 : r.x + 12 + i * (cw + 12), y = PHONE ? r.y + 40 + i * (ch + 8) : r.y + 42;
      ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 14);
      D.shadow(() => { D.roundRect(x, y, cw, ch, 12); ctx.fillStyle = '#fff7f7'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = '#f2b6b8'; ctx.lineWidth = 2; D.roundRect(x, y, cw, ch, 12); ctx.stroke();
      const tl = textBlock(x + 10, y + 22, cw - 20, '❌ ' + c.t, PHONE ? 13.5 : 14.5, BAD, PHONE ? 16 : 18, 800);
      textBlock(x + 10, y + 22 + tl + 4, cw - 20, c.b, PHONE ? 12 : 13, INK, PHONE ? 15 : 18, 700);
      ctx.restore();
    });
  }

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    const q = qNow(), K = S.rx.K, d = dirOf(q, K);
    if (S.mode === 'predict' && !RUN.done) { setReadouts(['Q (현재 농도)', '?', 'K', fq(K), '진행 방향', '예측해 봐요']); return; }
    setReadouts(['Q (현재 농도)', fq(q), 'K (평형 농도)', fq(K), 'Q와 K 비교', (d === 'eq' ? 'Q = K' : q < K ? 'Q &lt; K' : 'Q &gt; K') + ' → ' + DIR_TXT[d]]);
  }

  /* ================= 미션 ================= */
  const qa = fq(QM.a.q), qb = fq(QM.b.q), qc = fq(QM.c.q), qd = fq(QM.d.q), qe = fq(QM.e.q);
  const qn1 = fq(QM.n1.q), qn2 = fq(QM.n2.q), qs1 = fq(QM.s1.q), qs2 = fq(QM.s2.q), qf = fq(QM.f.q);
  const levels = [
    {
      title: 'Q 계산: 현재 농도를 식에 넣기', short: 'Q 계산', icon: '🧩', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 지금 섞은 혼합물은 평형일까? 아니라면 어느 쪽으로 반응이 진행할까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 평형 농도를 식에 넣어 평형 상수 K를 구했어요. 이번에는 평형이 아닐 수도 있는 <b>지금의 농도</b>를 같은 식에 넣어 봐요.</div>' +
        '<p>K와 <b>똑같은 모양의 식</b>에 <b>현재 농도</b>를 넣은 값을 <b>반응 지수 Q</b>라고 해요. 평형 농도를 넣으면 Q = K가 돼요. 몰 농도 [A]는 1 L 속 A의 몰수(mol/L)예요.</p>',
      features: ['model'],
      setup() { S.gate = ''; setScene('model'); updateCtl(); },
      recap: 'Q는 K와 같은 식에 현재 농도를 넣은 값이에요. 평형이 아닌 혼합물은 시간이 지나며 농도가 변해 Q가 K에 다가가고, Q = K가 되면 멈춰요.',
      summary: '<ul><li>반응 지수 <b>Q</b> = K와 같은 식에 <b>현재 농도</b>를 넣은 값. H₂ + I₂ ⇌ 2HI에서 Q = [HI]² ÷ ([H₂][I₂])</li><li>예) ㉠ [H₂] = [I₂] = 0.060, [HI] = 0.020 → Q = 0.020² ÷ (0.060 × 0.060) = <b>' + qa + '</b> (K = 25)</li><li>시간이 지나면 농도가 변하며 <b>Q가 K에 다가가고</b>, 평형(Q = K)에서 멈춰요: ㉠의 평형 ' + eqTxt('a') + '</li><li>Q와 K는 식이 같고, 넣는 농도만 달라요(Q: 현재, K: 평형).</li></ul>',
      missions: [
        {
          title: '㉠의 Q 계산하기',
          goal: '[H₂] = [I₂] = <b>0.060</b>, [HI] = <b>0.020</b> (예시 ㉠)일 때 Q를 계산해 입력하고 <b>✔ 확인</b>을 눌러요.',
          hint: 'Q = [HI]² ÷ ([H₂][I₂]) = 0.020² ÷ (0.060 × 0.060) = 0.00040 ÷ 0.0036이에요.',
          setup() { S.gate = 'qin'; S.qOk = false; $('#qIn').value = ''; $('#qIn').classList.remove('ok', 'bad'); setScene('model'); loadMix('a'); updateCtl(); },
          check: () => S.qOk, hold: 0.4,
          status: () => mark(matchId() === 'a') + ' 혼합물 ㉠ &nbsp; ' + mark(S.qOk) + ' Q = ' + qa,
          explain: 'Q = 0.020² ÷ (0.060 × 0.060) = 4.0×10⁻⁴ ÷ 3.6×10⁻³ ≈ <b>' + qa + '</b>이에요. HI는 계수가 2라서 <b>제곱</b>해요. K = 25보다 훨씬 작으니 아직 평형이 아니에요.',
        },
        {
          title: 'Q가 K에 다가가는 모습 관찰',
          goal: '㉠ 혼합물을 <b>▶ 반응시키기</b>로 끝까지 반응시켜 Q – 시간 그래프에서 Q가 K(점선)에 다가가 멈추는 것을 확인해요.',
          hint: '오른쪽 아래의 ▶ 반응시키기를 누르고 약 6초 기다려요. 끝나면 용기에 “평형” 도장이 찍혀요.',
          setup() { S.gate = ''; S.runsDone = 0; setScene('model'); loadMix('a'); updateCtl(); },
          check: () => S.runsDone >= 1 && RUN.done && !RUN.active, hold: 0.8,
          status: () => mark(RUN.active || RUN.done) + ' 반응시키기 &nbsp; ' + mark(RUN.done) + ' Q = K에서 멈춤',
          explain: '㉠은 Q = ' + qa + ' &lt; K = 25라서 정반응(H₂, I₂ 감소, HI 증가)이 진행해요. ' + eqTxt('a') + '이 되면 Q = 25 = K가 되어 농도가 더 이상 변하지 않아요.',
        },
        {
          type: 'quiz', title: 'Q와 K, 무엇이 같고 무엇이 다를까?',
          goal: 'Q와 K에 대한 설명으로 옳은 것은?',
          setup() { S.gate = ''; updateCtl(); },
          choices: ['Q와 K는 식의 모양이 서로 달라요', '식은 같고, Q에는 현재 농도를 K에는 평형 농도를 넣어요', 'Q에는 반응물 농도만, K에는 생성물 농도만 넣어요', 'Q는 언제나 K보다 커요'],
          answer: 1,
          feedback: ['생성물 농도의 곱 ÷ 반응물 농도의 곱(계수는 지수)으로 식의 모양은 같아요.', '', '둘 다 생성물은 분자, 반응물은 분모에 들어가요.', '㉠은 Q < K, ㉡은 Q > K였어요. 현재 농도에 따라 달라요.'],
          explain: 'Q와 K는 <b>같은 식</b>이에요. 다른 점은 넣는 농도뿐이에요. 평형일 때만 현재 농도가 평형 농도와 같아서 Q = K가 돼요.',
        },
      ],
    },
    {
      title: 'Q와 K 비교: 진행 방향 판정', short: 'Q와 K', icon: '⚖️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> Q를 계산하고, 반응이 진행하며 Q가 K에 다가가는 모습을 봤어요. 이번에는 Q와 K를 <b>저울</b>에 올려 어느 쪽으로 진행할지 정하는 규칙을 찾아요.</div>' +
        '<p>왼쪽 접시에는 <b>Q</b>, 오른쪽 접시에는 <b>K</b>를 올려요. 저울이 기우는 쪽이 반응이 진행하는 방향이에요(오른쪽 = 생성물 쪽).</p>',
      features: ['scale'],
      setup() { S.gate = ''; setScene('scale'); updateCtl(); },
      recap: 'Q < K이면 정반응(생성물 증가), Q = K이면 평형, Q > K이면 역반응(생성물 감소)이에요. Q가 K에 다가가는 방향으로 반응이 진행해요.',
      summary: '<ul><li><b>Q &lt; K</b> → 정반응(→): 생성물이 부족하니 생성물이 늘어요</li><li><b>Q = K</b> → 평형: 농도 변화 없음</li><li><b>Q &gt; K</b> → 역반응(←): 생성물이 너무 많으니 생성물이 줄어요</li><li>H₂ + I₂ ⇌ 2HI (K = 25): ㉠ Q = ' + qa + ' → 정반응, ㉡ Q = ' + qb + ' → 역반응, ㉢ Q = ' + qc + ' → 평형</li><li>평형인 ㉢은 [H₂] = 0.020, [HI] = 0.100으로 농도가 서로 달라요.</li></ul>',
      missions: [
        {
          title: '세 혼합물을 저울에 올려 보기',
          goal: '㉠ ㉡ ㉢을 차례로 넣어 보고 저울이 어느 쪽으로 기우는지 확인해요.',
          hint: '조작 패널의 ㉠ ㉡ ㉢ 단추를 하나씩 눌러 저울이 멈출 때까지 잠깐 기다려요.',
          setup() { S.gate = ''; S.seen = {}; setScene('scale'); loadMix('a'); updateCtl(); },
          check: () => S.seen.a && S.seen.b && S.seen.c, hold: 0.4,
          status: () => mark(S.seen.a) + ' ㉠ Q = ' + qa + ' &nbsp; ' + mark(S.seen.b) + ' ㉡ Q = ' + qb + ' &nbsp; ' + mark(S.seen.c) + ' ㉢ Q = ' + qc,
          explain: '㉠은 Q = ' + qa + ' &lt; 25라 오른쪽(정반응)으로, ㉡은 Q = ' + qb + ' &gt; 25라 왼쪽(역반응)으로 기울어요. ㉢은 Q = 25 = K라서 수평 = 평형이에요.',
        },
        {
          title: '방향 문장 완성하기', manual: true,
          goal: '저울에서 알게 된 규칙으로 문장을 완성하고 <b>✔ 확인하기</b>를 눌러요.',
          hint: 'Q가 K보다 작으면 생성물이 부족해서 생성물을 만드는 정반응이 일어나요.',
          setup() { S.gate = 'sent'; setScene('scale'); updateCtl(); },
          check() {
            const v = [$('#sn1').value, $('#sn2').value, $('#sn3').value], want = ['fwd', 'eq', 'rev'];
            if (v.some((x) => !x)) return '세 문장을 모두 골라요.';
            if (v[0] !== 'fwd') return 'Q &lt; K이면 생성물이 아직 부족해요. 어느 쪽으로 진행할까요?';
            if (v[1] !== 'eq') return 'Q = K이면 현재 농도가 평형 농도예요.';
            if (v[2] !== 'rev') return 'Q &gt; K이면 생성물이 너무 많아요. 생성물을 줄이는 쪽으로 진행해요.';
            return true;
          },
          explain: '<b>Q &lt; K → 정반응, Q = K → 평형, Q &gt; K → 역반응</b>이에요. 반응은 언제나 Q가 K에 가까워지는 방향으로 진행해요.',
        },
        {
          type: 'quiz', title: 'Q > K일 때의 방향과 까닭',
          goal: 'Q가 K보다 클 때 반응이 진행하는 방향과 그 까닭으로 옳은 것은?',
          setup() { S.gate = ''; updateCtl(); },
          choices: ['정반응 — 생성물이 부족해서', '역반응 — 평형보다 생성물이 너무 많아서, 생성물이 줄어드는 쪽으로 진행해요', '정반응 — 반응물이 너무 많아서', '진행하지 않아요 — Q가 K보다 크면 이미 평형이에요'],
          answer: 1,
          feedback: ['Q가 크다는 것은 분자(생성물 농도의 곱)가 상대적으로 크다는 뜻이에요. 생성물이 부족한 경우는 Q < K예요.', '', 'Q > K이면 반응물이 많은 것이 아니라 생성물이 많은 거예요.', '평형은 Q = K일 때만이에요. 같지 않으면 Q가 K에 다가가도록 반응이 진행해요.'],
          explain: 'Q &gt; K는 평형보다 생성물이 너무 많다는 뜻이에요(㉡: Q = ' + qb + '). 그래서 생성물이 반응물로 되돌아가는 <b>역반응</b>이 일어나 Q가 줄어 K에 다가가요.',
        },
      ],
    },
    {
      title: '방향 예측: 먼저 예측하고 확인', short: '방향 예측', icon: '🎯', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> Q와 K를 비교하면 방향이 정해진다는 규칙을 찾았어요. 이번에는 농도만 보고 <b>먼저 예측</b>한 다음, 실행해서 맞는지 확인해요.</div>' +
        '<p>Q를 계산해 K와 비교하고 정반응 · 평형 · 역반응 중에서 골라요. 실행하면 농도 변화 곡선이 그려져요.</p>',
      features: ['predict'],
      setup() { S.gate = ''; setScene('predict'); updateCtl(); },
      recap: '혼합물의 농도로 Q를 계산하고 K와 비교하면 실행하기 전에 방향을 예측할 수 있어요. 처음에 생성물이 없으면 Q = 0이라 반드시 정반응이에요.',
      summary: '<ul><li>예측 순서: ① 현재 농도로 Q 계산 → ② K와 비교 → ③ 방향 결정</li><li>㉣ [H₂] = 0.050, [I₂] = 0.020, [HI] = 0.100: Q = ' + qd + ' &lt; 25 → 정반응</li><li>㉤ [H₂] = 0.040, [I₂] = 0.010, [HI] = 0.200: Q = ' + qe + ' &gt; 25 → 역반응</li><li>N₂O₄ ⇌ 2NO₂ (K = 0.0060): [N₂O₄] = [NO₂] = 0.020 → Q = ' + qn1 + ' &gt; K → 역반응</li><li>생성물이 없으면(HI = 0) <b>Q = 0 &lt; K</b> → 반드시 정반응</li></ul>',
      missions: [
        {
          title: '예측 3문제와 실행 결과 비교',
          goal: '㉣, ㉤, N₂O₄ 혼합물의 방향을 <b>먼저 예측</b>하고 <b>▶ 실행하기</b>로 확인해요. 예측이 맞아야 완료돼요.',
          hint: 'Q를 계산해 K와 비교해요. ㉣은 Q = 0.100² ÷ (0.050 × 0.020), N₂O₄는 Q = [NO₂]² ÷ [N₂O₄]이고 K = 0.0060이에요.',
          setup() { S.gate = ''; S.pred = {}; setScene('predict'); loadMix('d'); updateCtl(); },
          check: () => !!(S.pred.d && S.pred.e && S.pred.n1), hold: 0.5,
          status: () => mark(S.pred.d) + ' ㉣ &nbsp; ' + mark(S.pred.e) + ' ㉤ &nbsp; ' + mark(S.pred.n1) + ' N₂O₄ 혼합물',
          explain: '㉣ Q = ' + qd + ' &lt; 25 → 정반응(평형 ' + eqTxt('d') + '), ㉤ Q = ' + qe + ' &gt; 25 → 역반응(평형 ' + eqTxt('e') + '), N₂O₄ 혼합물 Q = ' + qn1 + ' &gt; 0.0060 → 역반응(평형 ' + eqTxt('n1') + ')이에요. 어느 쪽이든 마지막에는 Q = K가 돼요.',
        },
        {
          type: 'quiz', title: 'HI가 없을 때는 왜 정반응뿐일까?',
          goal: '[H₂] = [I₂] = 0.040, [HI] = 0인 혼합물(㉥)에서 정반응만 일어날 수 있는 까닭은?',
          setup() { S.gate = ''; updateCtl(); },
          choices: ['HI가 없으면 반응물이 모두 사라지기 때문이에요', 'HI가 없으면 Q = 0이라 언제나 K보다 작아서, 생성물이 늘어나는 정반응만 가능해요', 'HI가 없으면 K도 0이 되기 때문이에요', '처음에는 항상 역반응이 먼저 일어나기 때문이에요'],
          answer: 1,
          feedback: ['H₂와 I₂는 0.040씩 있어요. 사라지는 것이 아니라 HI가 처음에 없는 거예요.', '', 'K는 온도가 같으면 변하지 않는 값이에요(K = 25).', '역반응은 HI가 있어야 일어날 수 있어요. HI가 없으면 정반응부터예요.'],
          explain: '[HI] = 0이면 Q = 0² ÷ (0.040 × 0.040) = <b>0</b> &lt; K예요. 그래서 정반응이 일어나 HI가 생기고, ' + eqTxt('f') + '에서 Q = K가 돼요.',
        },
      ],
    },
    {
      title: '판정 적용: SO₂ 혼합물과 경계', short: '판정 적용', icon: '🧪', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> Q와 K의 비교로 방향을 예측했어요. 이번에는 계수가 더 복잡한 <b>2SO₂ + O₂ ⇌ 2SO₃ (K = 10)</b>에 적용하고, 방향이 뒤집히는 경계를 찾아요.</div>' +
        '<p>이 반응의 Q는 Q = [SO₃]² ÷ ([SO₂]² [O₂])이에요. SO₂의 계수 2는 <b>2제곱</b>이 돼요. 틀리기 쉬운 생각 두 가지도 함께 점검해요.</p>',
      features: ['apply'],
      setup() { S.gate = ''; setScene('apply'); updateCtl(); },
      recap: '여러 반응에도 같은 규칙을 써요. 비교 대상은 1이 아니라 K이고, 농도가 같다고 평형인 것은 아니에요. Q = K인 지점이 정반응과 역반응의 경계예요.',
      summary: '<ul><li>2SO₂ + O₂ ⇌ 2SO₃ (K = 10): Q = [SO₃]² ÷ ([SO₂]²[O₂])</li><li>[SO₂] = 0.200, [O₂] = 0.100, [SO₃] = 0.300 → Q = ' + qs1 + ' &gt; 10 → 역반응</li><li>[SO₃] = 0.100 → Q = ' + qs2 + ' &lt; 10 → 정반응</li><li>[SO₃] = 0.200이면 Q = 0.040 ÷ 0.0040 = 10 = K → 경계(평형). 이보다 작으면 정반응, 크면 역반응</li><li>오개념: ‘농도가 같으면 평형’(×), ‘Q &lt; 1이면 정반응’(×) → 비교 대상은 <b>K</b></li></ul>',
      missions: [
        {
          title: 'SO₂ 혼합물 2개 판정하기',
          goal: '혼합물 ①(SO₃ 0.300)과 ②(SO₃ 0.100)의 Q를 K = 10과 비교해 방향을 고르고 <b>✔ 판정하기</b>를 눌러요.',
          hint: '① Q = 0.300² ÷ (0.200² × 0.100) = 0.090 ÷ 0.0040, ② Q = 0.100² ÷ 0.0040이에요.',
          setup() { S.gate = ''; S.judged = {}; S.cardsIn = 0; setScene('apply'); loadMix('s1'); updateCtl(); },
          check: () => !!(S.judged.s1 && S.judged.s2), hold: 0.5,
          status: () => mark(S.judged.s1) + ' 혼합물 ① &nbsp; ' + mark(S.judged.s2) + ' 혼합물 ②',
          explain: '① Q = ' + qs1 + ' &gt; 10 → <b>역반응</b>, ② Q = ' + qs2 + ' &lt; 10 → <b>정반응</b>이에요. ▶ 반응시키기로 실제 진행도 볼 수 있어요.',
        },
        {
          title: 'Q = K인 경계 찾기',
          goal: '[SO₂] = 0.200, [O₂] = 0.100에서 [SO₃] 슬라이더를 움직여 정반응 쪽, 역반응 쪽을 확인하고 <b>Q = K = 10</b>인 지점에 맞춰요.',
          hint: '[SO₃]를 0.200보다 작게 하면 정반응, 크게 하면 역반응이에요. 정확히 0.200에서 Q = 10이에요.',
          setup() { S.gate = ''; S.side = {}; setScene('apply'); loadMix('s1'); updateCtl(); },
          check: () => !!(S.side.fwd && S.side.rev) && !RUN.active && dirOf(q0(), S.rx.K) === 'eq' && S.rx.id === 'so3', hold: 0.8,
          status: () => mark(S.side.fwd) + ' 정반응 쪽 확인 &nbsp; ' + mark(S.side.rev) + ' 역반응 쪽 확인 &nbsp; ' + mark(S.rx.id === 'so3' && dirOf(q0(), S.rx.K) === 'eq') + ' Q = K',
          explain: '[SO₃] = 0.200이면 Q = 0.200² ÷ (0.200² × 0.100) = 0.040 ÷ 0.0040 = <b>10 = K</b>이에요. 이보다 작으면 Q &lt; K(정반응), 크면 Q &gt; K(역반응)로 방향이 뒤집혀요.',
        },
        {
          type: 'quiz', title: 'Q가 1보다 작으면 항상 정반응일까?',
          goal: '“Q가 1보다 작으면 항상 정반응이다”라는 말에 대한 판단으로 옳은 것은?',
          setup() { S.gate = ''; updateCtl(); },
          choices: ['맞아요, Q < 1이면 생성물이 부족하니 항상 정반응이에요', '아니에요, 비교 대상은 1이 아니라 K예요. N₂O₄ 혼합물은 Q = ' + qn1 + ' < 1이지만 K = 0.0060보다 커서 역반응이에요', '아니에요, Q < 1이면 항상 역반응이에요', '맞아요, 1보다 작으면 K와 상관없이 정반응이에요'],
          answer: 1,
          feedback: ['방향은 Q와 K의 크기 비교로 정해요. 1은 기준이 아니에요.', '', 'Q < 1이어도 K가 더 작으면 역반응이고 K가 더 크면 정반응이에요. 결국 K와 비교해야 해요.', 'K가 1보다 훨씬 작은 반응에서는 Q < 1이어도 역반응이 가능해요.'],
          explain: '방향을 정하는 기준은 항상 <b>K</b>예요. N₂O₄ ⇌ 2NO₂는 K = 0.0060이라서 Q = ' + qn1 + '(1보다 작음)이어도 Q &gt; K → 역반응이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-reaction-quotient', mount: '#game', badge: '평형 예측가', homeHref: '../../index.html#hc',
    featureLabels: { model: '🧩 Q 계산기 · Q – 시간 그래프', scale: '⚖️ Q와 K 저울', predict: '🎯 예측 후 실행', apply: '🧪 SO₂ 혼합물 · 경계 찾기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  $('#cv').style.touchAction = 'pan-y';
  buildChips(); loadMix('a'); setScene('model', true);
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    stepRun(dt);
    if (RUN.done && S.stampT > 0) S.stampT = Math.min(1, S.stampT + dt);
    // 저울: 같은 혼합물을 잠시 지켜보면 '확인함'
    if (S.mode === 'scale' && !RUN.active) { const id = matchId(); if (id === S.dwellId) { S.dwell += dt; if (S.dwell > 0.9 && id && !S.seen[id]) { S.seen[id] = true; updateCtl(); } } else { S.dwellId = id || ''; S.dwell = 0; } }
    if (S.mode === 'apply') {
      S.cardsIn = Math.min(1, S.cardsIn + dt * 0.8);
      if (!RUN.active && S.rx.id === 'so3') { const d = dirOf(q0(), S.rx.K); if (!S.side[d]) S.side[d] = true; }
      if (S.judgeShake > 0) S.judgeShake -= dt;
    }
    S.beam.update(dt);
    vessel.step(dt, 1);
    view.apply();
    ctx.fillStyle = BGC; ctx.fillRect(0, 0, VW, VH);
    const R = panelRects();
    if (S.mode === 'model') { drawFormula(R.formula, S.rx, S.c, {}); drawVP(R.vp); drawQGraph(R.gr); }
    else if (S.mode === 'scale') { drawScale(R.sc); drawVP(R.vp, { hideDir: true }); }
    else if (S.mode === 'predict') { drawFormula(R.formula, S.rx, S.c, { hide: !RUN.done, tag: matchId() ? MX[matchId()].tag : '' }); drawVP(R.vp, { hideDir: !RUN.done }); drawCGraph(R.gr); }
    else { drawFormula(R.formula, S.rx, S.c, {}); drawVP(R.vp); drawGauge(R.gauge); drawCards(R.cards); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(244,241,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, RUN, RX, MX, QM, VW, VH, vessel, get game() { return game; },
    setScene, loadMix, startRun, matchId, qNow, panelRects, updateCtl,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepRun(0.02); vessel.step(0.02, 1); S.beam.update(0.02); if (RUN.done && S.stampT > 0) S.stampT = Math.min(1, S.stampT + 0.02); } },
  };

})();
