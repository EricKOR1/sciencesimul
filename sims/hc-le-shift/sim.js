/* =========================================================
   화학 Ⅲ. 화학 평형 - 평형의 이동 [12화학03-04] (앞부분: 농도 · 압력 · 온도)
   ① 실험: 농도 변화 (Fe³⁺ + SCN⁻ ⇌ FeSCN²⁺ 시험관 4개, Q와 K)
   ② 실험: 압력 변화 (주사기 속 N₂O₄ ⇌ 2NO₂, H₂ + I₂ ⇌ 2HI)
   ③ 실험: 온도 변화 (물 중탕 속 N₂O₄ ⇌ 2NO₂, K가 변함)
   ④ 설명: Q로 설명 (변화 종류별 표, 촉매 · 비활성 기체)
   흡열 · 발열은 정성적으로만, 압력 평형 상수와 엔탈피 계산은 다루지 않아요.
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

  /* ---------- 자료 ---------- */
  const LAB = { Fe: 'Fe³⁺', SCN: 'SCN⁻', FeSCN: 'FeSCN²⁺' };
  const lab = (k) => LAB[k] || FOR(k);
  EL.F = ['#d9941a', 7.6];
  MOL.Fe = [['F', 0, 0]];
  MOL.SCN = [['S', -9.5, 0], ['C', 0.5, 0], ['N', 9.5, 0]];
  MOL.FeSCN = [['F', -15, 0], ['S', 0, 0], ['C', 10, 0], ['N', 19, 0]];
  const RXF = mkRx({ id: 'fe', sp: [{ k: 'Fe', c: 1, side: 0 }, { k: 'SCN', c: 1, side: 0 }, { k: 'FeSCN', c: 1, side: 1 }], K: 100, unit: 0.0025 });
  const RXN = mkRx({ id: 'n2o4', sp: [{ k: 'N2O4', c: 1, side: 0 }, { k: 'NO2', c: 2, side: 1 }], K: 0.006, unit: 0.002, n0: [12, 6], eq: 'N₂O₄(g) ⇌ 2NO₂(g)' });
  const RXH = mkRx({ id: 'hi', sp: [{ k: 'H2', c: 1, side: 0 }, { k: 'I2', c: 1, side: 0 }, { k: 'HI', c: 2, side: 1 }], K: 25, unit: 0.01, n0: [2, 2, 10], eq: 'H₂(g) + I₂(g) ⇌ 2HI(g)' });
  const SPC = { Fe: '#d9941a', SCN: '#3867f4', FeSCN: '#c81e3a', N2O4: '#7c8db5', NO2: '#a65b1e', H2: '#7c8db5', I2: '#8b3fd1', HI: '#d97706' };
  // 온도에 따른 K (예시 값: 25 °C 0.0060, 100 °C 0.50)
  const T1 = 298.15, T2 = 373.15, BB = Math.log(0.5 / 0.006) / (1 / T1 - 1 / T2);
  const Kt = (C) => 0.006 * Math.exp(BB * (1 / T1 - 1 / (C + 273.15)));
  const K0C = Kt(0);

  const S = {
    mode: 'conc', t: 0, fade: 0, gate: '',
    sel: 0, drop: null, dragging: false,
    flags: {}, tab: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], row: 0, reveal: {},
    demoT0: 0,
  };
  let game = null;

  /* ================= 농도 변화: 시험관 ================= */
  const ACTS = [
    { id: 'fe', chip: 'Fe³⁺ 더하기', name: 'Fe³⁺ 더하기', base: [0.02, 0.01, 0.01], col: '#e8a21b', lv: 0.42, note: '[Fe³⁺] 0.010 → 0.020' },
    { id: 'scn', chip: 'SCN⁻ 더하기', name: 'SCN⁻ 더하기', base: [0.01, 0.02, 0.01], col: '#9fc3ee', lv: 0.42, note: '[SCN⁻] 0.010 → 0.020' },
    { id: 'ag', chip: 'Ag⁺ 넣기 (SCN⁻ 제거)', name: 'Ag⁺ 넣기', base: [0.01, 0.005, 0.01], col: '#cbd5e1', lv: 0.42, note: '[SCN⁻] 0.010 → 0.005' },
    { id: 'water', chip: '물 더하기 (부피 2배)', name: '물 더하기', base: [0.005, 0.005, 0.005], col: '#8fd0ff', lv: 0.84, note: '모든 농도 ½' },
  ];
  function mkTube(i) { return { i, c: [0.01, 0.01, 0.01], vc: [0.01, 0.01, 0.01], base: [0.01, 0.01, 0.01], x: 0, xEq: 0, t: 0, active: false, applied: false, lv: 0.42, lvv: 0.42, dir: null, qj: 100, done: false }; }
  let tubes = [0, 1, 2, 3, 4].map(mkTube);
  const ionBox = new Vessel({ x: 0, y: 0, w: 100, h: 100 }, 0.85);
  let ionEv = 0, ionSel = -1;
  function rebuildIons() {
    ionBox.clear(); const tb = tubes[S.sel];
    RXF.sp.forEach((s, i) => ionBox.add(s.k, Math.round(tb.c[i] / RXF.unit)));
    ionEv = Math.round(tb.x / RXF.unit); ionSel = S.sel;
  }
  function resetTubes() {
    cancelTweens(); tubes = [0, 1, 2, 3, 4].map(mkTube); S.drop = null; S.sel = 0; rebuildIons(); S.flags.conc = {}; updateCtl();
  }
  function doAct(ai) {
    if (S.drop) return;
    const tb = tubes[ai + 1]; if (tb.applied) { showHint('이 시험관은 이미 시험했어요. ↺ 시험관 새로 준비로 다시 해 볼 수 있어요.', 3500); return; }
    S.drop = { i: ai + 1, t: 0 }; S.sel = ai + 1; Sound.click(); updateCtl();
  }
  function applyDrop(i) {
    const tb = tubes[i], a = ACTS[i - 1];
    tb.base = a.base.slice(); tb.c = tb.base.slice(); tb.x = 0; tb.t = 0; tb.xEq = solveExt(RXF, tb.base, RXF.K);
    tb.qj = qOf(RXF, tb.base); tb.dir = dirOf(tb.qj, RXF.K); tb.applied = true; tb.active = true; tb.done = false; tb.lv = a.lv;
    if (S.sel === i) { RXF.sp.forEach((s, k) => ionBox.setCount(s.k, Math.round(tb.c[k] / RXF.unit))); ionEv = 0; }
    Sound.success(); updateCtl();
  }
  function stepTubes(dt) {
    tubes.forEach((tb) => {
      if (tb.active) {
        tb.t += dt; const fin = tb.t >= 5;
        tb.x = fin ? tb.xEq : tb.xEq * (1 - Math.exp(-tb.t / 1.0));
        tb.c = concAt(RXF, tb.base, tb.x);
        if (fin) { tb.active = false; tb.done = true; tb.c = tb.c.map((v) => Math.round(v * 1e6) / 1e6); updateCtl(); }
      }
      for (let k = 0; k < 3; k++) tb.vc[k] = SciSim.approach(tb.vc[k], tb.c[k], dt, 5);
    });
    if (S.drop) {
      S.drop.t += dt; if (S.drop.t >= 0.95) { const i = S.drop.i; S.drop = null; applyDrop(i); }
    }
    if (ionSel !== S.sel) rebuildIons();
    const tb = tubes[S.sel], ext = Math.round(tb.x / RXF.unit); let g = 4;
    while (ionEv < ext && g-- > 0) { if (ionBox.react(RXF, 1)) ionEv++; else break; }
    while (ionEv > ext && g-- > 0) { if (ionBox.react(RXF, -1)) ionEv--; else break; }
    ionBox.step(dt, 1);
  }
  function tubeColor(c) {
    const yel = mixc('#fdf3d3', '#f0c33c', clamp(c[0] / 0.03, 0, 1) * 0.6);
    return mixc(yel, '#b3122e', clamp(c[2] / 0.016, 0, 1));
  }
  function tubeGeom(i) {
    const A = LAYC().A, w = PHONE ? 46 : 60, h = PHONE ? 156 : 190;
    return { cx: A.x + A.w * (i + 0.5) / 5, top: A.y + (PHONE ? 46 : 58), w, h };
  }
  function tubePath(g) {
    const r = g.w / 2; ctx.beginPath(); ctx.moveTo(g.cx - r, g.top); ctx.lineTo(g.cx - r, g.top + g.h - r); ctx.arc(g.cx, g.top + g.h - r, r, Math.PI, 0, true); ctx.lineTo(g.cx + r, g.top); 
  }
  function LAYC() {
    if (!PHONE) return { A: { x: 8, y: 8, w: 784, h: 322 }, G: { x: 8, y: 338, w: 420, h: 214 }, I: { x: 436, y: 338, w: 356, h: 214 } };
    return { A: { x: 8, y: 8, w: 464, h: 290 }, G: { x: 8, y: 306, w: 464, h: 170 }, I: { x: 8, y: 484, w: 464, h: 208 } };
  }
  function drawDropper(cx, y, col, k) {
    // 스포이트: 끝(y)이 시험관 입구 위, 방울이 떨어져요
    ctx.save();
    D.roundRect(cx - 5, y - 52, 10, 50, 3); ctx.fillStyle = 'rgba(190,210,235,.9)'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 5, y - 2); ctx.lineTo(cx, y + 8); ctx.lineTo(cx + 5, y - 2); ctx.closePath(); ctx.fillStyle = 'rgba(190,210,235,.9)'; ctx.fill(); ctx.stroke();
    D.sphere(cx, y - 66, 13, '#4b5563', { shadow: true });
    ctx.fillStyle = col; D.roundRect(cx - 3, y - 44, 6, 36, 3); ctx.fill();
    ctx.restore();
  }
  function drawConc() {
    const Ly = LAYC(), A = Ly.A;
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 26, PHONE ? '🧪 FeSCN²⁺ 시험관 5개 (K = 100)' : '🧪 FeSCN²⁺ 용액 시험관 5개 (처음엔 모두 평형, K = 100)', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    if (!PHONE) T(A.x + A.w - 14, A.y + 26, 'Fe³⁺(노란색) + SCN⁻(무색) ⇌ FeSCN²⁺(붉은색)', 13, MUTED, 'right', 700);
    // 지금 선택한 시험관 강조
    tubes.forEach((tb, i) => {
      const g = tubeGeom(i), on = S.sel === i;
      if (on) { ctx.save(); ctx.fillStyle = rgba(VIO, 0.1); D.roundRect(g.cx - g.w / 2 - 12, g.top - 10, g.w + 24, g.h + 82, 14); ctx.fill(); ctx.strokeStyle = VIO; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore(); }
      // 액체
      ctx.save(); tubePath(g); ctx.closePath(); ctx.clip();
      const ly = g.top + g.h - g.h * tb.lvv;
      ctx.fillStyle = tubeColor(tb.vc); ctx.fillRect(g.cx - g.w / 2, ly, g.w, g.top + g.h - ly + 2);
      const gr = ctx.createLinearGradient(g.cx - g.w / 2, 0, g.cx + g.w / 2, 0); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(0.3, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.12)');
      ctx.fillStyle = gr; ctx.fillRect(g.cx - g.w / 2, ly, g.w, g.top + g.h - ly + 2);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(g.cx - g.w / 2, ly, g.w, 3);
      ctx.restore();
      ctx.save(); ctx.strokeStyle = 'rgba(80,110,160,.7)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; tubePath(g); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.cx - g.w / 2 + 7, g.top + 12); ctx.lineTo(g.cx - g.w / 2 + 7, g.top + g.h - 22); ctx.stroke(); ctx.restore();
      // 이름 · Q
      const nm = i === 0 ? '기준' : ACTS[i - 1].name;
      T(g.cx, g.top + g.h + 22, nm, PHONE ? 12.5 : 14, INK, 'center', 800);
      if (i > 0 && tb.applied) {
        const q = qOf(RXF, tb.c), d = tb.active ? dirOf(tb.qj, RXF.K) : 'eq';
        T(g.cx, g.top + g.h + 42, 'Q = ' + fq(q), PHONE ? 12 : 13.5, tb.active ? DIR_COL[tb.dir] : BLU, 'center', 800);
        T(g.cx, g.top + g.h + 60, tb.active ? DIR_TXT[tb.dir].replace(' (이동 없음)', '') : '새 평형', PHONE ? 11 : 12.5, tb.active ? DIR_COL[tb.dir] : BLU, 'center', 800);
      } else if (i === 0) { T(g.cx, g.top + g.h + 42, 'Q = ' + fq(qOf(RXF, tb.c)), PHONE ? 12 : 13.5, BLU, 'center', 800); T(g.cx, g.top + g.h + 60, '평형', PHONE ? 11 : 12.5, BLU, 'center', 800); }
      else T(g.cx, g.top + g.h + 44, '아직 안 넣었어요', PHONE ? 11 : 12, MUTED, 'center', 700);
    });
    // 스포이트
    if (S.drop) {
      const d = S.drop, g = tubeGeom(d.i), a = ACTS[d.i - 1], k = d.t / 0.95;
      const dy = g.top - 12 - (1 - Math.min(1, k * 3)) * 40;
      drawDropper(g.cx, dy, a.col, k);
      for (let j = 0; j < 4; j++) { const kk = (k * 1.4 - j * 0.14); if (kk > 0 && kk < 1) { const yy = dy + 10 + kk * (g.top + g.h * (1 - tubes[d.i].lvv) - dy - 6); ctx.fillStyle = a.col; ctx.beginPath(); ctx.ellipse(g.cx, yy, 3.2, 4.6, 0, 0, TAU); ctx.fill(); } }
    }
    // 아래 왼쪽: 선택한 시험관의 Q 와 K
    const tb = tubes[S.sel], G = Ly.G, q = qOf(RXF, tb.c), d = dirOf(q, RXF.K);
    panel(G.x, G.y, G.w, G.h, 14);
    T(G.x + 14, G.y + 26, '🧭 ' + (S.sel === 0 ? '기준 시험관' : ACTS[S.sel - 1].name + ' 시험관') + '의 Q와 K', 14.5, INK, 'left', 800);
    qkGauge(G.x + 34, G.y + (PHONE ? 66 : 92), G.w - 68, Math.max(q, 1e-6), RXF.K, 1, 3);
    const msg = !tb.applied ? '아직 아무것도 넣지 않았어요: Q = K → 평형' : tb.active ? 'Q = ' + fq(tb.qj) + (tb.qj < RXF.K ? ' < ' : ' > ') + 'K = 100 → ' + DIR_TXT[tb.dir] + ' 쪽으로 이동 중' : '새 평형에 도달! (' + DIR_TXT[tb.dir].replace(' (이동 없음)', '') + '으로 이동한 뒤 Q = K)';
    textBlock(G.x + 14, G.y + G.h - (PHONE ? 36 : 50), G.w - 28, msg, PHONE ? 12.5 : 13.5, tb.applied ? DIR_COL[tb.dir] : MUTED, PHONE ? 16 : 18, 800);
    // 아래 오른쪽: 입자 모형
    vpGeneric(Ly.I, { title: '🔍 입자 모형으로 보기', vessel: ionBox, sp: RXF.sp.map((s) => ({ k: s.k, name: lab(s.k), col: SPC[s.k] })), c: tb.c, barMax: 0.03, unitTxt: '● 입자 1개 ≈ ' + RXF.unit + ' mol/L (모형)', tint: rgba('#c81e3a', clamp(tb.vc[2] / 0.016, 0, 1) * 0.2), pill: null });
  }
  function concHit(p) {
    for (let i = 0; i < 5; i++) { const g = tubeGeom(i); if (p.x >= g.cx - g.w / 2 - 12 && p.x <= g.cx + g.w / 2 + 12 && p.y >= g.top - 10 && p.y <= g.top + g.h + 70) return i; }
    return -1;
  }
  const allTubes = () => tubes.slice(1).every((t) => t.applied && t.done);
  const tubesDone = () => tubes.slice(1).filter((t) => t.applied && t.done).length;

  /* ================= 압력 변화: 주사기 ================= */
  const PS = { rx: RXN, V: 1, Vt: 1, xi: 0, ev: 0, vessel: new Vessel({ x: 0, y: 0, w: 100, h: 100 }, 0.95), hist: [], hacc: 0, ht: 0, drag: false, calm: 0, lastV: 1 };
  function pressReset(rx) {
    PS.rx = rx; PS.V = 1; PS.Vt = 1; PS.xi = 0; PS.ev = 0; PS.hist = []; PS.hacc = 0; PS.ht = 0; PS.calm = 0; PS.vessel.clear(); PS.vessel.sc = rx === RXN ? 0.95 : 1;
    rx.sp.forEach((s, i) => PS.vessel.add(s.k, rx.n0[i])); updateCtl();
  }
  const pC = () => PS.rx.sp.map((s, i) => Math.max(0, (PS.rx.n0[i] + PS.rx.nu[i] * PS.xi)) * PS.rx.unit / PS.V);
  const pEq = () => solveExt(PS.rx, PS.rx.n0.map((n) => n * PS.rx.unit / PS.V), PS.rx.K) * PS.V / PS.rx.unit;
  function stepPress(dt) {
    PS.V = SciSim.approach(PS.V, PS.Vt, dt, PS.drag ? 18 : 6); if (Math.abs(PS.V - PS.Vt) < 1e-4) PS.V = PS.Vt;
    const eq = pEq(); PS.xi += (eq - PS.xi) * (1 - Math.exp(-dt / 0.9));
    if (Math.abs(eq - PS.xi) < 0.003) PS.xi = eq;
    const target = Math.round(PS.xi); let g = 4;
    while (PS.ev < target && g-- > 0) { if (PS.vessel.react(PS.rx, 1)) PS.ev++; else break; }
    while (PS.ev > target && g-- > 0) { if (PS.vessel.react(PS.rx, -1)) PS.ev--; else break; }
    PS.vessel.step(dt, 1);
    PS.ht += dt; PS.hacc += dt;
    if (PS.hacc >= 0.1) { PS.hacc = 0; const c = pC(); PS.hist.push([PS.ht, PS.rx === RXN ? c[1] : c[1]]); if (PS.hist.length > 160) PS.hist.shift(); }
    // 시험 기록: 부피가 멈추고 평형이 자리 잡으면
    const moving = Math.abs(PS.V - PS.lastV) > 1e-3; PS.lastV = PS.V;
    if (moving || Math.abs(eq - PS.xi) > 0.15) PS.calm = 0; else PS.calm += dt;
    if (PS.calm > 0.5) {
      const k = PS.rx.id, f = S.flags.press || (S.flags.press = {});
      if (PS.V <= 0.55 && !f[k + 'C']) { f[k + 'C'] = true; updateCtl(); }
      if (PS.V >= 1.9 && !f[k + 'E']) { f[k + 'E'] = true; updateCtl(); }
    }
  }
  function pressGeom() {
    if (!PHONE) return { P: { x: 8, y: 8, w: 484, h: 544 }, x0: 44, y: 140, h: 190, per: 170, G: { x: 500, y: 8, w: 292, h: 236 }, TB: { x: 500, y: 252, w: 292, h: 300 } };
    return { P: { x: 8, y: 8, w: 464, h: 326 }, x0: 30, y: 82, h: 100, per: 150, G: { x: 8, y: 342, w: 464, h: 164 }, TB: { x: 8, y: 514, w: 464, h: 178 } };
  }
  function drawPress() {
    const G = pressGeom(), P = G.P, rx = PS.rx, c = pC();
    panel(P.x, P.y, P.w, P.h, 14);
    T(P.x + 14, P.y + 26, '💉 주사기 속 기체 (밀봉 모의 · 일정한 온도)', 14.5, INK, 'left', 800);
    T(P.x + 14, P.y + 50, rx.eq + (rx === RXN ? '   K = ' + fq(rx.K) : '   K = ' + fq(rx.K)), PHONE ? 15 : 17, VIO, 'left', 800);
    const x0 = P.x + G.x0 - 8, px = x0 + G.per * PS.V, yb = G.y + (PHONE ? 0 : 0);
    // 눈금 · 바깥 통
    ctx.save(); D.roundRect(x0 - 2, yb - 8, G.per * 2 + 8, G.h + 16, 12); ctx.fillStyle = 'rgba(190,205,230,.22)'; ctx.fill(); ctx.strokeStyle = 'rgba(120,140,180,.45)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    [0.5, 1, 1.5, 2].forEach((v) => { const tx = x0 + G.per * v; ctx.strokeStyle = '#9aa3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx, yb + G.h + 8); ctx.lineTo(tx, yb + G.h + 18); ctx.stroke(); T(tx, yb + G.h + 34, v.toFixed(1) + ' L', 12, MUTED, 'center', 700); });
    // 노즐
    ctx.fillStyle = '#9aa3b8'; ctx.fillRect(x0 - 20, yb + G.h / 2 - 6, 20, 12);
    // 기체 칸
    const tint = rx === RXN ? rgba('#a65b1e', clamp(c[1] / 0.045, 0, 1) * 0.72) : rgba('#8b3fd1', clamp(c[1] / 0.045, 0, 1) * 0.6);
    PS.vessel.setRect({ x: x0, y: yb, w: Math.max(40, px - x0), h: G.h });
    PS.vessel.draw(tint);
    // 피스톤 · 막대 · 손잡이
    const hx = px + 78;
    D.shadow(() => { D.roundRect(px, yb + 2, 16, G.h - 4, 4); ctx.fillStyle = '#4b5563'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.fillStyle = '#7c8696'; ctx.fillRect(px + 16, yb + G.h / 2 - 5, hx - px - 16, 10);
    const hh = G.h * 0.62;
    D.shadow(() => { D.roundRect(hx, yb + G.h / 2 - hh / 2, 18, hh, 7); ctx.fillStyle = PS.drag ? '#6d28d9' : VIO; ctx.fill(); }, { blur: 6, y: 3 });
    T(hx + 9, yb + G.h / 2 + 5, '◀▶', 11, '#fff', 'center', 800);
    PS.handle = { x: hx - 8, y: yb + G.h / 2 - hh / 2 - 6, w: 34, h: hh + 12, px };
    // 설명 글 (피스톤을 끌어 보세요)
    T(P.x + P.w / 2, yb + G.h + (PHONE ? 60 : 62), '손잡이를 끌거나 버튼으로 부피를 바꿔요  ·  부피 V = ' + PS.V.toFixed(2) + ' L', PHONE ? 12.5 : 14, MUTED, 'center', 800);
    const q = qOf(rx, c), d = dirOf(q, rx.K);
    // 입자 수 / 농도 줄
    const rows = rx.sp.map((s, i) => '[' + lab(s.k) + '] ' + fcx(c[i]));
    const by0 = yb + G.h + (PHONE ? 90 : 94);
    rx.sp.forEach((s, i) => { hbar(P.x + 20 + (PHONE ? 0 : 0), by0 + i * (PHONE ? 36 : 46), P.w - 40, 14, c[i] / (rx === RXN ? 0.08 : 0.12), SPC[s.k], '[' + lab(s.k) + ']', fcx(c[i])); });
    // 그래프 패널
    const Gp = G.G; panel(Gp.x, Gp.y, Gp.w, Gp.h, 14);
    const cs = rx === RXN ? 'NO₂' : 'I₂';
    T(Gp.x + 14, Gp.y + 26, '📈 [' + cs + '] – 시간 (색의 진하기)', 14, INK, 'left', 800);
    const ymax = 0.12, ax = axes({ x: Gp.x, y: Gp.y + 6, w: Gp.w, h: Gp.h - 6 }, 16, ymax, '지난 16초', '[' + cs + ']', { top: PHONE ? 38 : 44, left: 56, fy: (v) => fc(v), nx: 4, fx: (v) => String(Math.round(v - 16)) + '초' });
    const tNow = PS.ht;
    if (PS.hist.length > 1) {
      ctx.save(); ctx.beginPath(); ctx.rect(ax.x0, ax.y1 - 4, ax.x1 - ax.x0, ax.y0 - ax.y1 + 8); ctx.clip(); ctx.strokeStyle = rx === RXN ? '#a65b1e' : '#8b3fd1'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.beginPath();
      PS.hist.forEach((p, i) => { const xx = ax.X(clamp(p[0] - tNow + 16, 0, 16)), yy = ax.Y(clamp(p[1], 0, ymax)); if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }); ctx.stroke(); ctx.restore();
    }
    const lc = c[1]; D.sphere(ax.x1, ax.Y(clamp(lc, 0, ymax)), 5.5, rx === RXN ? '#a65b1e' : '#8b3fd1', { shadow: true });
    // 몰 수 비교 표
    const TB = G.TB; panel(TB.x, TB.y, TB.w, TB.h, 14);
    T(TB.x + 14, TB.y + 26, '📊 기체 몰 수 비교', 14.5, INK, 'left', 800);
    const rowsT = [
      { eq: 'N₂O₄ ⇌ 2NO₂', a: 1, b: 2, ans: '← 역반응', col: BAD, key: 'n2o4' },
      { eq: 'H₂ + I₂ ⇌ 2HI', a: 2, b: 2, ans: '이동 없음', col: BLU, key: 'hi' },
      { eq: 'N₂ + 3H₂ ⇌ 2NH₃', a: 4, b: 2, ans: '정반응 →', col: GOOD, key: 'nh3' },
    ];
    const rh = PHONE ? 40 : 78;
    rowsT.forEach((r, i) => {
      const y = TB.y + 40 + i * (rh + 4), cur = r.key === rx.id;
      ctx.save(); D.roundRect(TB.x + 10, y, TB.w - 20, rh, 10); ctx.fillStyle = cur ? '#f3efff' : '#fafaff'; ctx.fill(); ctx.strokeStyle = cur ? VIO : LINE; ctx.lineWidth = cur ? 2.5 : 1.5; ctx.stroke(); ctx.restore();
      T(TB.x + 20, y + (PHONE ? 16 : 24), r.eq, PHONE ? 13 : 14.5, INK, 'left', 800);
      if (PHONE) {
        T(TB.x + 20, y + 33, '몰 수 ' + r.a + ' → ' + r.b, 12, MUTED, 'left', 800);
        T(TB.x + TB.w - 20, y + 26, S.reveal.press ? '압력↑ ' + r.ans : '압력↑ ?', 13.5, S.reveal.press ? r.col : MUTED, 'right', 800);
      } else {
        T(TB.x + 20, y + 48, '반응물 ' + r.a + '몰 → 생성물 ' + r.b + '몰', 13, MUTED, 'left', 800);
        T(TB.x + 20, y + 68, S.reveal.press ? '압력↑ → ' + r.ans : '압력↑ → ?', 14, S.reveal.press ? r.col : MUTED, 'left', 800);
      }
    });
  }
  function pressHit(p) { const h = PS.handle; return h && p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h; }

  /* ================= 온도 변화: 물 중탕 ================= */
  const TS = { bath: 25, T: 25, xi: 0, ev: 0, vessel: new Vessel({ x: 0, y: 0, w: 100, h: 100 }, 0.95), calm: 0, bubbles: [] };
  const tC = () => RXN.sp.map((s, i) => Math.max(0, RXN.n0[i] + RXN.nu[i] * TS.xi) * RXN.unit);
  const tEq = () => solveExt(RXN, RXN.n0.map((n) => n * RXN.unit), Kt(TS.T)) / RXN.unit;
  function tempReset() { TS.bath = 25; TS.T = 25; TS.xi = 0; TS.ev = 0; TS.vessel.clear(); RXN.sp.forEach((s, i) => TS.vessel.add(s.k, RXN.n0[i])); TS.bubbles = []; }
  function stepTemp(dt) {
    TS.T = SciSim.approach(TS.T, TS.bath, dt, 1.8); if (Math.abs(TS.T - TS.bath) < 0.05) TS.T = TS.bath;
    const eq = tEq(); TS.xi += (eq - TS.xi) * (1 - Math.exp(-dt / 0.7)); if (Math.abs(eq - TS.xi) < 0.003) TS.xi = eq;
    const target = Math.round(TS.xi); let g = 4;
    while (TS.ev < target && g-- > 0) { if (TS.vessel.react(RXN, 1)) TS.ev++; else break; }
    while (TS.ev > target && g-- > 0) { if (TS.vessel.react(RXN, -1)) TS.ev--; else break; }
    TS.vessel.step(dt, Math.sqrt((TS.T + 273.15) / 298.15));
    const moving = Math.abs(TS.T - TS.bath) > 1.5 || Math.abs(eq - TS.xi) > 0.35; TS.calm = moving ? 0 : TS.calm + dt;
    if (TS.calm > 0.5) { const f = S.flags.temp || (S.flags.temp = {}); if (TS.bath >= 99 && !f.hot) { f.hot = true; updateCtl(); } if (TS.bath <= 1 && !f.cold) { f.cold = true; updateCtl(); } }
    if (TS.bath >= 99 && Math.random() < dt * 10) TS.bubbles.push({ x: (Math.random() < 0.5 ? -1 : 1) * rnd((PHONE ? 70 : 82), (PHONE ? 112 : 125)), y: 0, v: rnd(40, 80), life: rnd(0.8, 1.4), age: 0 });
    TS.bubbles.forEach((b) => { b.age += dt; b.y -= b.v * dt; }); TS.bubbles = TS.bubbles.filter((b) => b.age < b.life);
  }
  function tempGeom() {
    if (!PHONE) return { P: { x: 8, y: 8, w: 440, h: 544 }, GA: { x: 456, y: 8, w: 336, h: 160 }, BA: { x: 456, y: 176, w: 336, h: 120 }, CA: { x: 456, y: 304, w: 336, h: 248 } };
    return { P: { x: 8, y: 8, w: 464, h: 330 }, GA: { x: 8, y: 346, w: 464, h: 130 }, BA: { x: 8, y: 484, w: 464, h: 80 }, CA: { x: 8, y: 572, w: 464, h: 120 } };
  }
  function drawTemp() {
    const G = tempGeom(), P = G.P, Tn = TS.T, c = tC(), K = Kt(Tn);
    panel(P.x, P.y, P.w, P.h, 14);
    T(P.x + 14, P.y + 26, '🌡️ 물 중탕 속 밀봉 플라스크 (모의)', 14.5, INK, 'left', 800);
    const bw = PHONE ? 250 : 270, bh = PHONE ? 196 : 330, bx = P.x + (PHONE ? 90 : 60), by = P.y + (PHONE ? 70 : 100);
    const water = Tn >= 60 ? '#ffb199' : Tn <= 10 ? '#a8e0ff' : '#9fd4ff';
    const wcol = mixc('#8fd0ff', '#ff9d7a', clamp((Tn - 25) / 75, 0, 1)), cc = mixc(wcol, '#7fdcff', clamp((25 - Tn) / 25, 0, 1));
    D.beaker(bx, by, bw, bh, { level: 0.82, liquid: cc, t: S.t, wave: 1.6 });
    // 플라스크 (물에 잠김)
    const fw = PHONE ? 120 : 140, fh = PHONE ? 140 : 190, fx = bx + (bw - fw) / 2, fy = by + bh - fh - 16;
    TS.vessel.setRect({ x: fx, y: fy, w: fw, h: fh });
    const gas = rgba('#a65b1e', clamp(c[1] / 0.06, 0, 1) * 0.78);
    TS.vessel.draw(gas);
    const wy = by + bh - bh * 0.82;
    ctx.save(); D.roundRect(fx, fy, fw, fh, 12); ctx.clip(); ctx.fillStyle = rgba(cc, 0.22); ctx.fillRect(fx, Math.max(fy, wy), fw, fh); ctx.restore();
    // 마개 · 관
    ctx.fillStyle = '#6b7280'; D.roundRect(fx + fw / 2 - 12, fy - 14, 24, 16, 4); ctx.fill();
    // 얼음 · 거품
    if (Tn < 12) for (let i = 0; i < 4; i++) { const ix = bx + 20 + i * (bw - 70) / 3 + Math.sin(S.t + i) * 2, iy = wy + 10 + (i % 2) * 18; D.shadow(() => { D.roundRect(ix, iy, 30, 26, 6); ctx.fillStyle = 'rgba(235,248,255,.9)'; ctx.fill(); }, { blur: 4, y: 1 }); }
    TS.bubbles.forEach((b) => { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx + bw / 2 + b.x, by + bh - 20 + b.y, 3 + (b.age / b.life) * 3, 0, TAU); ctx.stroke(); });
    if (Tn > 70) for (let i = 0; i < 3; i++) { const k = ((S.t * 0.6 + i / 3) % 1); ctx.save(); ctx.globalAlpha = 0.5 * (1 - k); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx + 50 + i * 80 + Math.sin(S.t * 2 + i) * 6, wy - 10 - k * 40, 10 + k * 8, 0, TAU); ctx.fill(); ctx.restore(); }
    // 온도계
    const thx = P.x + P.w - (PHONE ? 50 : 56);
    D.thermometer(thx, by - 10, bh - 40, Tn, 0, 100, { color: mixc('#3b82f6', '#e2464b', clamp(Tn / 100, 0, 1)), step: 25, unit: '°' });
    D.label(thx, by + bh - 6, Tn.toFixed(0) + ' °C', { bg: mixc('#3b82f6', '#e2464b', clamp(Tn / 100, 0, 1)), size: 14 });
    T(bx + bw / 2, by + bh + 32, TS.bath >= 99 ? '뜨거운 물 (100 °C)' : TS.bath <= 1 ? '얼음물 (0 °C)' : '실온의 물 (25 °C)', 14, INK, 'center', 800);
    // 오른쪽 위: Q와 K
    const q = qOf(RXN, c), d = dirOf(q, K);
    panel(G.GA.x, G.GA.y, G.GA.w, G.GA.h, 14);
    T(G.GA.x + 14, G.GA.y + 26, '🧭 Q와 K (온도에 따라 K가 변해요)', 14, INK, 'left', 800);
    qkGauge(G.GA.x + 34, G.GA.y + (PHONE ? 70 : 84), G.GA.w - 68, Math.max(q, 1e-6), K, -4, 0);
    // 막대
    panel(G.BA.x, G.BA.y, G.BA.w, G.BA.h, 14);
    RXN.sp.forEach((s, i) => { const y = G.BA.y + (PHONE ? 30 : 38) + i * (PHONE ? 34 : 40); hbar(G.BA.x + 16, y, G.BA.w - 32, PHONE ? 11 : 13, c[i] / 0.06, SPC[s.k], '[' + lab(s.k) + ']', fcx(c[i])); });
    // 카드
    const CA = G.CA; panel(CA.x, CA.y, CA.w, CA.h, 14);
    T(CA.x + 14, CA.y + 26, '🃏 흡열 · 발열 반응 카드', 14, INK, 'left', 800);
    const cards = [
      { t: 'N₂O₄ + 열 ⇌ 2NO₂', s: '흡열 반응', col: '#ea580c', ans: '온도↑ → 정반응 → (K 증가)', k: 'tdir1' },
      { t: 'N₂ + 3H₂ ⇌ 2NH₃ + 열', s: '발열 반응', col: '#2563eb', ans: '온도↑ → ← 역반응 (K 감소)', k: 'tdir2' },
    ];
    const ch = PHONE ? 38 : 88;
    cards.forEach((cd, i) => {
      const y = CA.y + 38 + i * (ch + 8);
      D.roundRect(CA.x + 10, y, CA.w - 20, ch, 10); ctx.fillStyle = '#fafaff'; ctx.fill(); ctx.strokeStyle = cd.col; ctx.lineWidth = 2; ctx.stroke();
      if (PHONE) { T(CA.x + 20, y + 16, cd.t + ' · ' + cd.s, 12.5, INK, 'left', 800); T(CA.x + 20, y + 32, S.reveal.temp ? cd.ans : '온도를 높이면? 예측해 봐요', 12, S.reveal.temp ? cd.col : MUTED, 'left', 800); }
      else { T(CA.x + 20, y + 26, cd.t, 15, INK, 'left', 800); D.label(CA.x + CA.w - 20, y + 22, cd.s, { bg: cd.col, size: 12, align: 'right', pad: 7 }); T(CA.x + 20, y + 58, S.reveal.temp ? cd.ans : '온도를 높이면? 예측해 봐요', 13.5, S.reveal.temp ? cd.col : MUTED, 'left', 800); }
    });
  }

  /* ================= Q로 설명: 표 + 데모 ================= */
  const ROWS = [
    { n: '농도 변화', s: 'Fe³⁺ 더하기', ans: [1, 2, 1], demo: 'conc' },
    { n: '압력 변화', s: '부피 ½, 몰 수 다름', ans: [1, 2, 1], demo: 'press' },
    { n: '온도 변화', s: '가열', ans: [2, 1, 1], demo: 'temp' },
    { n: '촉매', s: '넣기', ans: [2, 2, 2], demo: 'cat' },
    { n: '비활성 기체', s: '부피 일정', ans: [2, 2, 2], demo: 'inert' },
  ];
  const OPT = [['?', '?'], ['변한다', '변한다'], ['그대로', '그대로']];
  const OPT3 = [['?'], ['이동한다'], ['이동 없음']];
  const tbOpt = (c, v) => (c === 2 ? OPT3[v][0] : OPT[v][0]);
  function tabGeom() {
    if (!PHONE) return { P: { x: 8, y: 8, w: 520, h: 544 }, D: { x: 536, y: 8, w: 256, h: 544 }, lx: 16, lw: 170, cw: 108, hy: 58, ry: 100, rh: 64, bannerY: 440 };
    return { P: { x: 8, y: 8, w: 464, h: 420 }, D: { x: 8, y: 436, w: 464, h: 256 }, lx: 14, lw: 150, cw: 98, hy: 50, ry: 84, rh: 56, bannerY: 372 };
  }
  function cellRect(r, c) { const G = tabGeom(); return { x: G.P.x + G.lx + G.lw + c * G.cw + 4, y: G.P.y + G.ry + r * G.rh + 4, w: G.cw - 8, h: G.rh - 8 }; }
  function labelRect(r) { const G = tabGeom(); return { x: G.P.x + 8, y: G.P.y + G.ry + r * G.rh + 4, w: G.lw + G.lx - 8, h: G.rh - 8 }; }
  function tableHit(p) {
    for (let r = 0; r < 5; r++) {
      if (inRect(p, labelRect(r))) { S.row = r; S.demoT0 = S.t; Sound.click(); return true; }
      for (let c = 0; c < 3; c++) if (inRect(p, cellRect(r, c))) { S.tab[r][c] = (S.tab[r][c] + 1) % 3; S.row = r; S.demoT0 = S.t; Sound.click(); return true; }
    }
    return false;
  }
  function tabWrong() {
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (S.tab[r][c] !== ROWS[r].ans[c]) return [r, c];
    return null;
  }
  function drawExplain() {
    const G = tabGeom(), P = G.P;
    panel(P.x, P.y, P.w, P.h, 14);
    T(P.x + 14, P.y + 26, '📋 변화 종류별 정리 (칸을 눌러 답을 골라요)', 14.5, INK, 'left', 800);
    const heads = ['바뀐 직후의 Q', 'K', '평형 이동'];
    T(P.x + G.lx + 40, P.y + G.hy + 14, '변화', 13.5, MUTED, 'center', 800);
    heads.forEach((h, c) => { const r0 = cellRect(0, c); T(r0.x + r0.w / 2, P.y + G.hy + 14, h, PHONE ? 12.5 : 13.5, MUTED, 'center', 800); });
    const bad = tabWrong();
    for (let r = 0; r < 5; r++) {
      const lr = labelRect(r), on = S.row === r;
      ctx.save(); D.roundRect(lr.x, lr.y, lr.w, lr.h, 10); ctx.fillStyle = on ? '#f3efff' : '#fafaff'; ctx.fill(); ctx.strokeStyle = on ? VIO : LINE; ctx.lineWidth = on ? 2.5 : 1.5; ctx.stroke(); ctx.restore();
      T(lr.x + 10, lr.y + lr.h / 2 - 2, ROWS[r].n, PHONE ? 14 : 15, INK, 'left', 800); T(lr.x + 10, lr.y + lr.h / 2 + 16, ROWS[r].s, PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
      for (let c = 0; c < 3; c++) {
        const cr = cellRect(r, c), v = S.tab[r][c], filled = v > 0, good = S.tabShow && v === ROWS[r].ans[c];
        ctx.save(); D.roundRect(cr.x, cr.y, cr.w, cr.h, 10); ctx.fillStyle = filled ? (v === 1 ? '#eaf0ff' : '#f1f5f9') : '#fff'; ctx.fill();
        ctx.strokeStyle = S.tabShow && filled && v !== ROWS[r].ans[c] ? BAD : filled ? (c === 2 ? (v === 1 ? GOOD : MUTED) : BLU) : '#c9cfdd'; ctx.lineWidth = filled ? 2.5 : 1.8; if (!filled) ctx.setLineDash([5, 4]); ctx.stroke(); ctx.restore();
        T(cr.x + cr.w / 2, cr.y + cr.h / 2 + 5, tbOpt(c, v), PHONE ? 13.5 : 15, filled ? INK : '#9aa3b8', 'center', 800);
      }
    }
    // 르샤틀리에 원리
    const by = P.y + G.bannerY;
    ctx.save(); D.roundRect(P.x + 10, by, P.w - 20, PHONE ? 40 : 90, 12); ctx.fillStyle = '#fff8e6'; ctx.fill(); ctx.strokeStyle = '#f2b705'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    textBlock(P.x + 22, by + (PHONE ? 16 : 28), P.w - 44, '💡 르샤틀리에 원리: 평형 상태에서 조건을 바꾸면, 그 변화를 줄이는 방향으로 평형이 이동해요.', PHONE ? 11.5 : 14, '#8a5a00', PHONE ? 15 : 21, 800);
    // 데모 패널
    const Dp = G.D; panel(Dp.x, Dp.y, Dp.w, Dp.h, 14);
    const row = ROWS[S.row], tl = ((S.t - S.demoT0) % 6);
    T(Dp.x + 14, Dp.y + 26, '▶ ' + row.n + ': ' + row.s, 14, INK, 'left', 800);
    const st = demoState(row.demo, tl);
    qkGauge(Dp.x + 34, Dp.y + (PHONE ? 78 : 118), Dp.w - 68, st.q, st.k, st.lo, st.hi);
    textBlock(Dp.x + 14, Dp.y + (PHONE ? 160 : 196), Dp.w - 28, st.msg, PHONE ? 12.5 : 13.5, st.col || INK, PHONE ? 16 : 19, 800);
    const ay = Dp.y + Dp.h - (PHONE ? 40 : 78), ac = DIR_COL[st.dir || 'eq'], cxx = Dp.x + Dp.w / 2;
    if (st.dir === 'fwd') D.arrow(cxx - 60, ay, cxx + 60, ay, { color: ac, width: 7, head: 18 }); else if (st.dir === 'rev') D.arrow(cxx + 60, ay, cxx - 60, ay, { color: ac, width: 7, head: 18 }); else D.label(cxx, ay, '이동 없음', { bg: ac, size: 14, pad: 12 });
    if (row.demo === 'cat') {
      const yy = Dp.y + (PHONE ? 196 : 330);
      const a = smooth01(tl / 4);
      hbar(Dp.x + 16, yy, Dp.w - 32, 12, 1 * a, '#94a3b8', '촉매 없음: 평형 도달 시간', '길어요');
      hbar(Dp.x + 16, yy + 40, Dp.w - 32, 12, 0.3 * a, '#14a058', '촉매 있음: 평형 도달 시간', '짧아요');
    }
  }
  function demoState(kind, tl) {
    const j = smooth01((tl - 0.8) / 0.5), back = smooth01((tl - 2.4) / 2.2);
    if (kind === 'conc') { const q = lerpN(100, 50, j) + (100 - 50) * back * (j > 0 ? 1 : 0) * 1; const qq = 100 - 50 * j + 50 * back; return { q: qq, k: 100, lo: 1, hi: 3, msg: tl < 0.8 ? '평형: Q = K = 100' : back < 0.98 ? (j < 1 || back < 0.05 ? 'Fe³⁺를 더하면 [Fe³⁺]가 커져 Q가 작아져요 (Q < K)' : 'Q < K → 정반응으로 이동해 Q가 K에 다가가요') : '새 평형: 다시 Q = K', col: tl < 0.8 || back >= 0.98 ? BLU : GOOD, dir: tl < 0.8 || back >= 0.98 ? 'eq' : 'fwd' }; }
    if (kind === 'press') { const qq = 0.006 * (1 + j - back * j); return { q: qq, k: 0.006, lo: -3, hi: -1, msg: tl < 0.8 ? '평형: Q = K = 0.0060' : back < 0.98 ? (back < 0.05 ? '부피 ½ → 농도 2배 → Q = ' + fq(0.012) + ' = 2K (Q > K)' : 'Q > K → 역반응 (기체 몰 수가 적은 쪽)으로 이동해 Q가 K에 다가가요') : '새 평형: 다시 Q = K', col: tl < 0.8 || back >= 0.98 ? BLU : BAD, dir: tl < 0.8 || back >= 0.98 ? 'eq' : 'rev' }; }
    if (kind === 'temp') { const kk = Math.exp(Math.log(0.006) + (Math.log(0.5) - Math.log(0.006)) * j), qq = 0.006 * Math.pow(0.5 / 0.006, back); return { q: qq, k: kk, lo: -3, hi: 0, msg: tl < 0.8 ? '평형: Q = K = 0.0060' : j < 1 ? '가열하면 K 자체가 바뀌어요 (0.0060 → 0.50). 농도는 그대로라 Q = 0.0060' : back < 0.98 ? 'Q < K → 정반응으로 이동해 Q가 새 K에 다가가요' : '새 평형: Q = K = 0.50', col: tl < 0.8 || back >= 0.98 ? BLU : GOOD, dir: tl < 0.8 || back >= 0.98 ? 'eq' : 'fwd' }; }
    if (kind === 'cat') return { q: 0.006, k: 0.006, lo: -3, hi: -1, msg: '촉매는 정반응과 역반응 속도를 모두 높여요. Q와 K는 그대로이고 평형 도달 시간만 짧아져요.', col: INK, dir: 'eq' };
    return { q: 0.006, k: 0.006, lo: -3, hi: -1, msg: '부피가 일정한 용기에 비활성 기체를 넣어도 각 기체의 농도가 그대로예요. Q = K 그대로 → 이동 없음.', col: INK, dir: 'eq' };
  }

  /* ================= 제어 · 장면 ================= */
  const MODE_LABEL = { conc: '🧪 농도 변화', press: '💉 압력 변화', temp: '🌡️ 온도 변화', explain: '📋 Q로 설명' };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode];
    buildChips(); updateCtl();
  }
  function buildChips() {
    const a = $('#actChips'); if (!a.childElementCount) ACTS.forEach((x, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = x.chip; b.dataset.i = i; b.addEventListener('click', () => doAct(i)); a.appendChild(b); });
    const p = $('#pressChips'); if (!p.childElementCount) [['n2o4', 'N₂O₄ ⇌ 2NO₂ (갈색)'], ['hi', 'H₂ + I₂ ⇌ 2HI (보라색)']].forEach(([id, t]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.dataset.id = id; b.addEventListener('click', () => { Sound.click(); pressReset(id === 'n2o4' ? RXN : RXH); }); p.appendChild(b); });
    const t = $('#bathChips'); if (!t.childElementCount) [[0, '🧊 얼음물 0 °C'], [25, '🏠 실온 25 °C'], [100, '🔥 뜨거운 물 100 °C']].forEach(([v, s]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = s; b.dataset.v = v; b.addEventListener('click', () => { Sound.click(); TS.bath = v; updateCtl(); }); t.appendChild(b); });
  }
  const SEL_DIR = [['', '고르세요'], ['fwd', '정반응 →'], ['rev', '← 역반응'], ['none', '이동 없음']];
  ['rc1', 'rc2', 'rc3', 'rc4', 'pd1', 'pd2', 'pd3', 'td1', 'td2'].forEach((id) => { $('#' + id).innerHTML = SEL_DIR.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join(''); });
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#actChips button').forEach((b) => { const tb = tubes[+b.dataset.i + 1]; b.classList.toggle('on', S.sel === +b.dataset.i + 1); b.classList.toggle('done', tb.applied && tb.done); b.disabled = !!S.drop || tb.applied; });
    $$('#pressChips button').forEach((b) => b.classList.toggle('on', b.dataset.id === PS.rx.id));
    $$('#bathChips button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === TS.bath); const f = S.flags.temp || {}; b.classList.toggle('done', (+b.dataset.v === 100 && !!f.hot) || (+b.dataset.v === 0 && !!f.cold)); });
    $('#bComp').disabled = PS.Vt <= 0.5; $('#bExp').disabled = PS.Vt >= 2;
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $('#bResetTubes').addEventListener('click', () => { Sound.click(); resetTubes(); });
  $('#bComp').addEventListener('click', () => { Sound.click(); PS.Vt = PS.Vt > 1.2 ? 1 : 0.5; updateCtl(); });
  $('#bExp').addEventListener('click', () => { Sound.click(); PS.Vt = PS.Vt < 0.7 ? 1 : 2; updateCtl(); });
  $('#bV1').addEventListener('click', () => { Sound.click(); PS.Vt = 1; updateCtl(); });
  $('#bClearTable').addEventListener('click', () => { Sound.click(); S.tab = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]; S.tabShow = false; });

  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'conc') { const i = concHit(p); if (i >= 0) { S.sel = i; Sound.click(); updateCtl(); } return false; }
      if (S.mode === 'press' && pressHit(p)) { PS.drag = true; return true; }
      if (S.mode === 'explain') { tableHit(p); return false; }
      return false;
    },
    move(p) { if (PS.drag) { const G = pressGeom(), x0 = G.P.x + G.x0 - 8; PS.Vt = clamp((p.x - 78 - 8 - x0) / G.per, 0.5, 2); } },
    up() { if (PS.drag) { PS.drag = false; const v = PS.Vt; PS.Vt = Math.abs(v - 1) < 0.07 ? 1 : Math.abs(v - 0.5) < 0.07 ? 0.5 : Math.abs(v - 2) < 0.07 ? 2 : v; updateCtl(); } },
    hover(p) { if (S.mode === 'press') return pressHit(p) ? 'ew-resize' : 'default'; if (S.mode === 'conc') return concHit(p) >= 0 ? 'pointer' : 'default'; if (S.mode === 'explain') { for (let r = 0; r < 5; r++) { if (inRect(p, labelRect(r))) return 'pointer'; for (let c = 0; c < 3; c++) if (inRect(p, cellRect(r, c))) return 'pointer'; } } return 'default'; },
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'conc') {
      const tb = tubes[S.sel], q = qOf(RXF, tb.c), d = dirOf(q, RXF.K);
      setReadouts(['선택한 시험관', S.sel === 0 ? '기준' : ACTS[S.sel - 1].name, 'Q (K = 100)', fq(q), '이동 방향', !tb.applied ? '평형 (이동 없음)' : tb.active ? DIR_TXT[tb.dir] + ' 이동 중' : '새 평형 (' + DIR_TXT[tb.dir].replace(' (이동 없음)', '') + ')']);
    } else if (S.mode === 'press') {
      const c = pC(), q = qOf(PS.rx, c), d = dirOf(q, PS.rx.K), moving = Math.abs(pEq() - PS.xi) > 0.15;
      setReadouts(['부피 V (압력 ∝ 1/V)', PS.V.toFixed(2) + ' L', 'Q (K = ' + fq(PS.rx.K) + ')', fq(q), '이동 방향', moving ? DIR_TXT[d] + ' 이동 중' : 'Q = K → 평형']);
    } else if (S.mode === 'temp') {
      const c = tC(), K = Kt(TS.T), q = qOf(RXN, c), d = dirOf(q, K);
      setReadouts(['온도', TS.T.toFixed(0) + ' °C', 'K  /  Q', fq(K) + '  /  ' + fq(q), '이동 방향', d === 'eq' ? 'Q = K → 평형' : DIR_TXT[d] + ' 이동 중']);
    } else {
      const r = ROWS[S.row]; setReadouts(['고른 변화', r.n + ' (' + r.s + ')', '정리', 'Q · K · 이동', '오른쪽', '움직임 보기']);
    }
  }

  /* ================= 미션 ================= */
  const wrongSel = (id, want) => $('#' + id).value !== want;
  const qFe = fq(qOf(RXF, ACTS[0].base)), qAg = fq(qOf(RXF, ACTS[2].base)), qW = fq(qOf(RXF, ACTS[3].base));
  const eqq = (a) => { const x = solveExt(RXF, a.base, RXF.K), c = concAt(RXF, a.base, x); return c; };
  const cFe = eqq(ACTS[0]), cAg = eqq(ACTS[2]), cW = eqq(ACTS[3]);
  const nCompEq = (() => { const c0 = RXN.n0.map((n) => n * RXN.unit / 0.5), x = solveExt(RXN, c0, RXN.K); return concAt(RXN, c0, x); })();
  const hotEq = (() => { const c0 = RXN.n0.map((n) => n * RXN.unit), x = solveExt(RXN, c0, 0.5); return concAt(RXN, c0, x); })();
  const coldEq = (() => { const c0 = RXN.n0.map((n) => n * RXN.unit), x = solveExt(RXN, c0, K0C); return concAt(RXN, c0, x); })();
  const levels = [
    {
      title: '농도 변화: 붉은색이 변해요', short: '농도 변화', icon: '🧪', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 평형에 있는 계에 변화를 주면 어느 쪽으로 반응이 진행할까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 반응 지수 Q를 평형 상수 K와 비교하면 반응의 진행 방향을 알 수 있었어요. 이번에는 평형 상태에 <b>직접 변화를 주고</b> 어느 쪽으로 이동하는지 시험관 실험(모의)으로 확인해요.</div>' +
        '<p>Fe³⁺(노란색) + SCN⁻(무색) ⇌ FeSCN²⁺(붉은색), K = 100(예시)이에요. 처음에는 모든 시험관이 평형 [Fe³⁺] = [SCN⁻] = [FeSCN²⁺] = 0.010이고 Q = K예요. <b>🥽 실제 실험은 보안경을 쓰고, 남은 용액은 폐액 처리 기준에 따라 처리해요.</b></p>',
      features: ['conc'],
      setup() { S.gate = ''; setScene('conc'); updateCtl(); },
      recap: '반응물을 더하면 Q가 작아져(Q < K) 정반응으로, 반응물을 줄이거나 물을 더해 묽히면 Q가 커져(Q > K) 역반응으로 이동해요. 농도 변화는 Q를 바꾸고 K는 그대로예요.',
      summary: '<ul><li>Fe³⁺ + SCN⁻ ⇌ FeSCN²⁺ (K = 100): 평형 [ ] = 0.010, Q = ' + fq(qOf(RXF, [0.01, 0.01, 0.01])) + ' = K</li><li>Fe³⁺ 더하기: Q = ' + qFe + ' &lt; 100 → <b>정반응</b> (붉은색 진해짐, 새 평형 [FeSCN²⁺] ≈ ' + fcx(cFe[2]) + ')</li><li>Ag⁺로 SCN⁻ 제거: Q = ' + qAg + ' &gt; 100 → <b>역반응</b> (붉은색 옅어짐, 새 평형 [FeSCN²⁺] ≈ ' + fcx(cAg[2]) + ')</li><li>물 더하기(부피 2배): Q = ' + qW + ' &gt; 100 → <b>역반응</b> (기체가 아니라도 몰 수가 많은 쪽 · 새 평형 [FeSCN²⁺] ≈ ' + fcx(cW[2]) + ')</li><li>농도를 바꾸면 <b>Q만 변하고 K는 그대로</b></li></ul>',
      missions: [
        {
          title: '시험관 4개 모두 시험하기',
          goal: '조작 패널에서 Fe³⁺ · SCN⁻ · Ag⁺ · 물을 시험관에 하나씩 넣고, 새 평형에 도달할 때까지 붉은색 변화를 기준 시험관과 비교해요.',
          hint: '네 가지 단추를 차례로 눌러요. 한 번에 하나씩 방울이 떨어지고, 약 5초 뒤 새 평형에 도달해요.',
          setup() { S.gate = ''; setScene('conc'); resetTubes(); },
          check: () => allTubes(), hold: 0.6,
          status: () => ACTS.map((a, i) => mark(tubes[i + 1].applied && tubes[i + 1].done) + ' ' + a.name).join(' &nbsp; '),
          explain: 'Fe³⁺를 더하면 Q = ' + qFe + ' &lt; K = 100이라 정반응 → 붉은색이 진해져요(새 평형 [FeSCN²⁺] ≈ ' + fcx(cFe[2]) + '). SCN⁻를 제거하면 Q = ' + qAg + ' &gt; K → 역반응 → 옅어져요(≈ ' + fcx(cAg[2]) + '). 물을 더해 부피를 2배로 하면 모든 농도가 절반이 되어 Q = ' + qW + ' &gt; K → 역반응이에요(≈ ' + fcx(cW[2]) + ').',
        },
        {
          title: '색 변화를 이동 방향으로 기록하기', manual: true,
          goal: '네 시험관의 붉은색 변화를 보고 평형이 이동한 방향을 골라 <b>✔ 확인하기</b>를 눌러요.',
          hint: '붉은색(FeSCN²⁺)이 진해지면 생성물이 늘어난 정반응, 옅어지면 역반응이에요.',
          setup() { S.gate = 'rec'; setScene('conc'); updateCtl(); },
          check() {
            if (!allTubes()) return '먼저 시험관 4개를 모두 시험해서 새 평형에 도달하게 해요.';
            const w = ['fwd', 'fwd', 'rev', 'rev'], nm = ['Fe³⁺ 더하기', 'SCN⁻ 더하기', 'Ag⁺ 넣기', '물 더하기'];
            for (let i = 0; i < 4; i++) { const v = $('#rc' + (i + 1)).value; if (!v) return nm[i] + '의 방향도 골라요.'; if (v !== w[i]) return nm[i] + ' 시험관의 붉은색이 ' + (w[i] === 'fwd' ? '진해졌' : '옅어졌') + '는지 다시 보세요.'; }
            return true;
          },
          explain: '붉은색이 진해진 <b>Fe³⁺ 더하기, SCN⁻ 더하기는 정반응</b>, 옅어진 <b>Ag⁺ 넣기, 물 더하기는 역반응</b>으로 이동했어요. 이동한 뒤에는 모두 Q = K = 100으로 돌아와요.',
        },
        {
          type: 'quiz', title: '반응물을 더하면 어느 쪽으로?',
          goal: '평형에서 반응물(Fe³⁺)을 더하면 평형이 이동하는 방향과 그 까닭은?',
          setup() { S.gate = ''; updateCtl(); },
          choices: ['역반응 — 더한 물질이 다시 줄어들어야 하니까요', '정반응 — Q가 K보다 작아져서, 더한 반응물을 소비하는 쪽으로 이동해요', '이동하지 않아요 — K가 그대로이니까요', '정반응 — K가 커지기 때문이에요'],
          answer: 1,
          feedback: ['더한 물질을 줄이는 쪽으로 이동하는 것은 맞지만 역반응이 아니라 정반응(반응물을 소비)이에요.', '', 'K는 그대로지만 Q가 달라져서 Q ≠ K가 되므로 이동해요.', '농도를 바꿔도 K는 변하지 않아요. K를 바꾸는 것은 온도예요.'],
          explain: 'Fe³⁺를 더하면 Q = ' + qFe + ' &lt; K = 100이 돼요. Q가 K보다 작으니 Q가 커지도록 <b>정반응</b>이 일어나 더한 Fe³⁺가 소비되고 FeSCN²⁺가 늘어나요.',
        },
      ],
    },
    {
      title: '압력 변화: 기체의 몰 수가 열쇠', short: '압력 변화', icon: '💉', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 농도를 바꾸면 Q가 변해 평형이 이동하는 것을 봤어요. 기체의 압력은 <b>부피</b>를 바꿔서 조절하고, 부피가 줄면 모든 기체의 농도가 커져요.</div>' +
        '<p>밀봉한 주사기(모의) 속 N₂O₄(무색) ⇌ 2NO₂(갈색)의 피스톤을 밀고 당겨 색을 관찰해요. 같은 조작을 H₂ + I₂ ⇌ 2HI(보라색)에도 해서 비교해요. 압력 평형 상수는 다루지 않고, 모든 농도(mol/L)로 설명해요.</p>',
      features: ['press'],
      setup() { S.gate = ''; setScene('press'); pressReset(RXN); },
      recap: '압력을 높이면(부피 감소) 기체 몰 수가 적은 쪽으로, 낮추면 많은 쪽으로 이동해요. 몰 수가 같은 반응은 이동하지 않아요. 부피 변화도 Q만 바꾸고 K는 그대로예요.',
      summary: '<ul><li>N₂O₄ ⇌ 2NO₂ (K = 0.0060): 평형 [N₂O₄] = 0.024, [NO₂] = 0.012. 부피 ½ → 농도 2배 → Q = ' + fq(0.024 * 0.024 / 0.048) + ' = 2K &gt; K → <b>역반응</b> (몰 수가 적은 쪽, 갈색이 순간 진해졌다가 서서히 옅어짐, 새 평형 [NO₂] ≈ ' + fcx(nCompEq[1]) + ')</li><li>부피를 2배로 늘리면 Q = K/2 &lt; K → <b>정반응</b></li><li>H₂ + I₂ ⇌ 2HI (기체 몰 수 2 → 2): 부피를 바꿔도 Q = K → <b>이동 없음</b> (색만 순간적으로 달라져요)</li><li>N₂ + 3H₂ ⇌ 2NH₃ (4몰 → 2몰): 압력을 높이면 <b>정반응</b></li></ul>',
      missions: [
        {
          title: '압축 · 팽창 시험하기',
          goal: 'N₂O₄ ⇌ 2NO₂에서 압축(부피 ½)과 팽창(부피 ×2)을, H₂ + I₂ ⇌ 2HI에서 압축을 해 보고 각각 색이 자리 잡을 때까지 2~3초 기다려요.',
          hint: '버튼이나 피스톤 손잡이로 부피를 0.5 L 또는 2.0 L까지 바꾸고 2~3초 기다려요. 반응을 바꾸려면 위의 단추를 눌러요.',
          setup() { S.gate = ''; S.flags.press = {}; setScene('press'); pressReset(RXN); },
          check: () => { const f = S.flags.press || {}; return !!(f.n2o4C && f.n2o4E && f.hiC); }, hold: 0.5,
          status: () => { const f = S.flags.press || {}; return mark(f.n2o4C) + ' N₂O₄ 압축 &nbsp; ' + mark(f.n2o4E) + ' N₂O₄ 팽창 &nbsp; ' + mark(f.hiC) + ' HI 압축'; },
          explain: '압축하면 N₂O₄ ⇌ 2NO₂는 농도가 2배가 되어 Q = ' + fq(0.012) + ' &gt; K = 0.0060 → 역반응으로 갈색이 진해졌다가 옅어져요(새 평형 [NO₂] ≈ ' + fcx(nCompEq[1]) + '). 팽창하면 Q = K/2 &lt; K → 정반응이에요. H₂ + I₂ ⇌ 2HI는 부피를 줄여도 [HI]²/([H₂][I₂]) = 25 그대로라 이동하지 않아요.',
        },
        {
          title: '압력을 높일 때 이동 방향 판단하기', manual: true,
          goal: '세 반응에서 압력을 높일 때 평형이 이동하는 방향을 골라 <b>✔ 확인하기</b>를 눌러요.',
          hint: '압력을 높이면 기체 분자 수(몰 수)가 줄어드는 쪽으로 이동해요. 몰 수가 같으면 이동하지 않아요.',
          setup() { S.gate = 'pdir'; setScene('press'); updateCtl(); },
          check() {
            const v = [$('#pd1').value, $('#pd2').value, $('#pd3').value], w = ['rev', 'none', 'fwd'];
            if (v.some((x) => !x)) return '세 반응의 방향을 모두 골라요.';
            if (v[0] !== w[0]) return 'N₂O₄ ⇌ 2NO₂는 반응물 1몰, 생성물 2몰이에요. 압력을 높이면 몰 수가 적은 쪽으로 가요.';
            if (v[1] !== w[1]) return 'H₂ + I₂ ⇌ 2HI는 2몰 → 2몰로 몰 수가 같아요.';
            if (v[2] !== w[2]) return 'N₂ + 3H₂ ⇌ 2NH₃는 4몰 → 2몰이에요. 몰 수가 적은 쪽은 어디일까요?';
            S.reveal.press = true; return true;
          },
          explain: '압력을 높이면 <b>기체의 몰 수가 줄어드는 쪽</b>으로 평형이 이동해요. N₂O₄ ⇌ 2NO₂는 역반응(1몰 쪽), H₂ + I₂ ⇌ 2HI는 이동 없음(2몰 = 2몰), N₂ + 3H₂ ⇌ 2NH₃는 정반응(4몰 → 2몰)이에요.',
        },
        {
          type: 'quiz', title: 'H₂ + I₂ ⇌ 2HI는 왜 이동하지 않을까?',
          goal: 'H₂ + I₂ ⇌ 2HI에서 압력을 높여도(부피를 줄여도) 평형이 이동하지 않는 까닭은?',
          setup() { S.gate = ''; updateCtl(); },
          choices: ['보라색이 진해지지 않기 때문이에요', '부피를 ½로 줄이면 모든 농도가 2배가 되는데, 분자와 분모에 같은 2배가 곱해져 Q가 그대로 K이기 때문이에요', 'HI는 기체가 아니기 때문이에요', 'H₂ + I₂ ⇌ 2HI는 K가 너무 커서 이동할 수 없기 때문이에요'],
          answer: 1,
          feedback: ['색은 순간적으로 진해져요(농도가 커지니까요). 그래도 평형은 이동하지 않아요.', '', '세 물질 모두 기체예요.', 'K의 크기와 이동 여부는 별개예요. 몰 수 비교로 판단해요.'],
          explain: '부피를 ½로 줄이면 [H₂], [I₂], [HI]가 모두 2배가 돼요. Q = (2[HI])² ÷ (2[H₂] × 2[I₂]) = [HI]² ÷ ([H₂][I₂]) = 25 = K라서 <b>Q가 변하지 않아</b> 이동하지 않아요. 농도는 커져 색만 순간 진해져요.',
        },
      ],
    },
    {
      title: '온도 변화: K 자체가 바뀌어요', short: '온도 변화', icon: '🌡️', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 농도와 압력은 Q만 바꾸고 K는 그대로였어요. 평형 상수 K를 바꾸는 것은 <b>온도</b>뿐이에요.</div>' +
        '<p>밀봉한 N₂O₄ ⇌ 2NO₂ 플라스크(모의)를 뜨거운 물과 얼음물에 담가 봐요. 이 반응은 열을 흡수하는 <b>흡열 반응</b>이에요(N₂O₄ + 열 ⇌ 2NO₂). K(25 °C) = 0.0060, K(100 °C) ≈ 0.50(예시 값)이에요. 흡열 · 발열은 열의 출입을 정성적으로만 다뤄요.</p>',
      features: ['temp'],
      setup() { S.gate = ''; setScene('temp'); tempReset(); updateCtl(); },
      recap: '온도를 바꾸면 K 자체가 변해요. 흡열 반응은 온도를 높이면 K가 커져 정반응으로, 발열 반응은 온도를 높이면 K가 작아져 역반응으로 이동해요.',
      summary: '<ul><li>N₂O₄ ⇌ 2NO₂는 <b>흡열 반응</b>: K(25 °C) = 0.0060, K(100 °C) ≈ 0.50 (예시), 얼음물(0 °C)에서는 K ≈ ' + fq(K0C) + ' (예시)</li><li>100 °C로 가열: 농도가 그대로(Q = 0.0060)인데 K = 0.50이 되어 Q &lt; K → <b>정반응</b> (갈색 진해짐, 새 평형 [NO₂] ≈ ' + fcx(hotEq[1]) + ')</li><li>얼음물: K가 작아져 Q &gt; K → <b>역반응</b> (갈색 옅어짐, 새 평형 [NO₂] ≈ ' + fcx(coldEq[1]) + ')</li><li>발열 반응 N₂ + 3H₂ ⇌ 2NH₃: 온도를 높이면 K 감소 → <b>역반응</b></li><li>농도 · 압력 변화는 Q만, <b>온도 변화는 K 자체</b>를 바꿔요.</li></ul>',
      missions: [
        {
          title: '가열 · 냉각 실행하기',
          goal: '플라스크를 뜨거운 물(100 °C)과 얼음물(0 °C)에 각각 담그고, 색과 K 값이 자리 잡을 때까지 기다려요.',
          hint: '조작 패널에서 100 °C 단추를 누르고 3~4초 기다린 뒤, 0 °C 단추를 눌러 또 기다려요.',
          setup() { S.gate = ''; S.flags.temp = {}; setScene('temp'); tempReset(); updateCtl(); },
          check: () => { const f = S.flags.temp || {}; return !!(f.hot && f.cold); }, hold: 0.5,
          status: () => { const f = S.flags.temp || {}; return mark(f.hot) + ' 100 °C (K = ' + fq(0.5) + ') &nbsp; ' + mark(f.cold) + ' 0 °C (K = ' + fq(K0C) + ')'; },
          explain: '100 °C에서는 K가 0.0060에서 0.50으로 커져요. 가열 직후 농도는 그대로라 Q = 0.0060 &lt; K → 정반응(갈색 진해짐, [NO₂] ≈ ' + fcx(hotEq[1]) + '). 얼음물에서는 K ≈ ' + fq(K0C) + '로 작아져 Q &gt; K → 역반응(옅어짐, [NO₂] ≈ ' + fcx(coldEq[1]) + ')이에요.',
        },
        {
          title: '온도를 높일 때 이동 방향 예측하기', manual: true,
          goal: '흡열 반응과 발열 반응 카드에서 온도를 높일 때 평형이 이동하는 방향을 골라 <b>✔ 확인하기</b>를 눌러요.',
          hint: '흡열 반응은 열을 흡수하는 쪽(정반응)이 유리해져요. 발열 반응은 온도를 높이면 열을 내놓는 정반응이 불리해져요.',
          setup() { S.gate = 'tdir'; setScene('temp'); updateCtl(); },
          check() {
            const a = $('#td1').value, b = $('#td2').value;
            if (!a || !b) return '두 반응의 방향을 모두 골라요.';
            if (a !== 'fwd') return 'N₂O₄ ⇌ 2NO₂는 흡열 반응이에요. 온도를 높이면 K가 어떻게 되었는지 떠올려 보세요(0.0060 → 0.50).';
            if (b !== 'rev') return 'N₂ + 3H₂ ⇌ 2NH₃는 발열 반응이에요. 온도를 높이면 K가 작아져요.';
            S.reveal.temp = true; return true;
          },
          explain: '<b>흡열 반응은 온도를 높이면 K가 커져 정반응</b>으로, <b>발열 반응은 온도를 높이면 K가 작아져 역반응</b>으로 이동해요. 온도를 낮추면 반대예요.',
        },
        {
          type: 'quiz', title: '온도 변화는 농도 변화와 무엇이 다를까?',
          goal: '온도를 바꾸는 것과 농도를 바꾸는 것의 차이로 옳은 것은?',
          setup() { S.gate = ''; updateCtl(); },
          choices: ['둘 다 K는 그대로이고 Q만 변해요', '농도 변화는 Q를 바꾸지만, 온도 변화는 K 자체를 바꿔요', '온도 변화는 Q만 바꾸고 K는 그대로예요', '온도를 바꾸면 평형은 항상 정반응으로 이동해요'],
          answer: 1,
          feedback: ['온도를 바꾸면 K 값이 달라져요(0.0060 → 0.50).', '', 'K를 바꾸는 조건이 바로 온도예요.', '흡열 반응은 정반응, 발열 반응은 역반응으로 이동할 수 있어요. 온도를 낮추면 반대예요.'],
          explain: '농도와 압력(부피)을 바꾸면 <b>Q</b>가 달라지고 K는 그대로예요. 온도를 바꾸면 <b>K 자체</b>가 달라져서(바뀐 직후 농도는 그대로라 Q는 처음 값) Q와 새 K가 같지 않게 되어 평형이 이동해요.',
        },
      ],
    },
    {
      title: 'Q로 설명하기', short: 'Q로 설명', icon: '📋', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 농도 · 압력 · 온도를 바꿔 보며 평형이 이동하는 방향을 확인했어요. 이제 모든 경우를 <b>Q와 K</b>로 한 번에 정리해요.</div>' +
        '<p>변화마다 바뀐 직후의 <b>Q</b>와 <b>K</b>가 어떻게 되는지, 평형이 이동하는지 표를 채워 봐요. 촉매와 비활성 기체도 함께 다뤄요.</p>',
      features: ['explain'],
      setup() { S.gate = ''; S.tabShow = false; setScene('explain'); S.demoT0 = S.t; updateCtl(); },
      recap: '농도 · 압력(부피)은 Q를 바꾸고, 온도는 K를 바꿔서 Q ≠ K가 되면 평형이 이동해요. 촉매와 부피가 일정한 용기의 비활성 기체는 Q도 K도 바꾸지 않아 이동하지 않아요. 르샤틀리에 원리: 변화를 줄이는 방향으로 이동해요.',
      summary: '<table style="width:100%;border-collapse:collapse;font-size:13.5px"><tr><th>변화</th><th>바뀐 직후 Q</th><th>K</th><th>평형 이동</th></tr><tr><td>농도 변화</td><td>변한다</td><td>그대로</td><td>이동한다</td></tr><tr><td>압력(부피) 변화</td><td>변한다</td><td>그대로</td><td>이동한다</td></tr><tr><td>온도 변화</td><td>그대로</td><td>변한다</td><td>이동한다</td></tr><tr><td>촉매</td><td>그대로</td><td>그대로</td><td>이동 없음 (도달 시간만 단축)</td></tr><tr><td>비활성 기체(부피 일정)</td><td>그대로</td><td>그대로</td><td>이동 없음</td></tr></table><p><b>르샤틀리에 원리</b>: 평형 상태에서 조건이 바뀌면 그 변화를 줄이는 방향으로 평형이 이동해요.</p>',
      missions: [
        {
          title: '변화별 Q · K · 이동 표 완성하기', manual: true,
          goal: '표의 칸을 눌러 답을 고르고 <b>✔ 확인하기</b>를 눌러요. 행의 이름을 누르면 Q와 K의 움직임을 다시 볼 수 있어요.',
          hint: '농도 · 압력은 Q가 변하고, 온도는 K가 변해요. 촉매와 비활성 기체(부피 일정)는 둘 다 그대로예요.',
          setup() { S.gate = ''; S.tabShow = false; setScene('explain'); updateCtl(); },
          check() {
            const w = tabWrong(), blank = S.tab.some((r) => r.some((v) => v === 0));
            if (blank) { S.tabShow = false; return '빈 칸이 남아 있어요. 15칸을 모두 채워요.'; }
            S.tabShow = !!w;
            if (w) { const r = w[0], c = w[1]; return ROWS[r].n + '의 ' + ['Q', 'K', '평형 이동'][c] + ' 칸을 다시 생각해 보세요. (빨간 테두리)'; }
            return true;
          },
          explain: '<b>농도 · 압력</b>은 Q를 바꾸고 K는 그대로예요. <b>온도</b>는 K를 바꿔요(바뀐 직후 Q는 그대로). 어느 쪽이든 Q ≠ K가 되어 평형이 이동해요. <b>촉매</b>는 정반응 · 역반응 속도를 모두 높일 뿐 Q도 K도 바꾸지 않고, <b>부피가 일정한 용기의 비활성 기체</b>는 농도를 바꾸지 않아서 이동하지 않아요.',
        },
        {
          type: 'quiz', title: '촉매를 넣으면 생성물이 늘어날까?',
          goal: '“평형에 있는 반응에 촉매를 넣으면 생성물이 더 많아진다”는 말에 대한 판단으로 옳은 것은?',
          setup() { S.gate = ''; updateCtl(); },
          choices: ['맞아요, 촉매는 정반응을 더 빠르게 하니까요', '아니에요, 촉매는 정반응과 역반응 속도를 모두 높여 평형에 도달하는 시간만 줄이고 K와 평형 조성은 그대로예요', '아니에요, 촉매는 K를 작게 만들어요', '맞아요, 촉매를 넣으면 Q가 작아지기 때문이에요'],
          answer: 1,
          feedback: ['정반응만이 아니라 역반응도 같은 정도로 빨라져요.', '', '촉매는 K를 바꾸지 않아요(K는 온도만 바꿔요).', '촉매는 Q도 바꾸지 않아요.'],
          explain: '촉매는 정반응과 역반응의 속도를 <b>모두</b> 높여서 평형에 빨리 도달하게 할 뿐이에요. Q와 K가 그대로이므로 평형의 위치(생성물의 양)는 달라지지 않아요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-le-shift', mount: '#game', badge: '평형 이동 박사', homeHref: '../../index.html#hc',
    featureLabels: { conc: '🧪 FeSCN²⁺ 시험관 · Q와 K 게이지', press: '💉 밀봉 주사기 · 몰 수 비교 표', temp: '🌡️ 물 중탕 플라스크 · 온도계', explain: '📋 Q · K · 이동 정리 표' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  rebuildIons(); pressReset(RXN); tempReset(); buildChips(); setScene('conc');
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    stepTubes(dt);
    stepPress(dt); stepTemp(dt);
    tubes.forEach((tb) => { tb.lvv = SciSim.approach(tb.lvv, tb.lv, dt, 4); });
    view.apply();
    ctx.fillStyle = BGC; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'conc') drawConc(); else if (S.mode === 'press') drawPress(); else if (S.mode === 'temp') drawTemp(); else drawExplain();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(244,241,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, PS, TS, ACTS, RXF, RXN, RXH, VW, VH, Kt, get tubes() { return tubes; }, get game() { return game; },
    setScene, doAct, pressReset, tempReset, resetTubes, updateCtl, tableHit, tabGeom, cellRect, labelRect, ROWS, pressGeom, tubeGeom, concHit,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepTubes(0.02); stepPress(0.02); stepTemp(0.02); } },
  };

})();
