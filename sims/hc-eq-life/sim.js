/* =========================================================
   화학 Ⅲ. 화학 평형 - 일상과 산업의 화학 평형 [12화학03-04] (뒷부분: 적용)
   ① 관찰: 탄산음료 (CO₂(g) ⇌ CO₂(aq), 뚜껑 열기와 온도)
   ② 분석: 산소 운반 (Hb + O₂ ⇌ HbO₂, 폐와 조직)
   ③ 탐구: 암모니아 (하버-보슈, 온도 · 압력 · 촉매 · 액화 분리)
   ④ 적용: 사례 조사 (반응식 → 바꾼 조건 → 이동 방향 → 활용, 진로)
   정량은 간단한 표 읽기까지, 압력 평형 상수는 다루지 않아요.
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

  const S = { mode: 'soda', t: 0, fade: 0, gate: '', sel: 0, cards: {}, flags: {} };
  let game = null;
  const MODE_LABEL = { soda: '🍾 탄산음료', blood: '🩸 산소 운반', haber: '🏭 암모니아', cases: '🃏 사례 조사' };

  /* ================= ① 탄산음료: CO₂(g) ⇌ CO₂(aq) ================= */
  const SOL = { 5: 1.6, 25: 1.0, 35: 0.75 };            // 기체 용해도 비 (온도가 낮을수록 커요, 예시 값)
  const KD = 0.6, KE0 = 0.2, KOUT = 3, TOT = 80, U = 2;  // 용해 · 방출 · 새어 나감 (가상 단위), 입자 1개 = 2단위
  const TCOL = { 5: '#3b82f6', 25: '#a16207', 35: '#e2464b' }, TNAME = { 5: '냉장고 5 °C', 25: '실온 25 °C', 35: '뜨거운 곳 35 °C' };
  const SD = { T: 25, open: false, a: 60, g: 20, openT: 0, rec: {}, curves: {}, cur: [], hacc: 0, cap: new SciSim.Spring(0, { stiffness: 80, damping: 11 }), liq: new Vessel({ x: 0, y: 0, w: 100, h: 100 }, 0.78), gas: new Vessel({ x: 0, y: 0, w: 100, h: 100 }, 0.78), swap: 0, bub: 0, esc: 0, opened: {} };
  const sdKe = () => KE0 / SOL[SD.T];
  const sdPct = () => ((SD.a + SD.g) / TOT) * 100;
  function sodaFresh() {
    const s = SOL[SD.T]; SD.a = TOT * 3 * s / (1 + 3 * s); SD.g = TOT / (1 + 3 * s); SD.open = false; SD.openT = 0; SD.cur = []; SD.hacc = 0; SD.cap.target = 0;
    SD.liq.clear(); SD.gas.clear(); SD.liq.add('CO2', Math.round(SD.a / U)); SD.gas.add('CO2', Math.round(SD.g / U)); updateCtl();
  }
  function sodaGeom() {
    const r = PHONE ? { x: 8, y: 8, w: 464, h: 330 } : { x: 8, y: 8, w: 420, h: 544 };
    const cx = r.x + (PHONE ? 134 : r.w / 2), bw = PHONE ? 150 : 176, top = r.y + (PHONE ? 118 : 196), bot = r.y + r.h - (PHONE ? 22 : 40), nw = PHONE ? 40 : 52;
    const ly = top + (bot - top) * 0.36;
    return { r, cx, x0: cx - bw / 2, x1: cx + bw / 2, top, bot, nx0: cx - nw / 2, nx1: cx + nw / 2, ntop: top - (PHONE ? 60 : 80), ly };
  }
  function bottlePath(g) {
    const sh = 26, rb = 22; ctx.beginPath();
    ctx.moveTo(g.nx0, g.ntop); ctx.lineTo(g.nx0, g.top - sh); ctx.quadraticCurveTo(g.nx0, g.top - 6, g.x0 + 2, g.top);
    ctx.lineTo(g.x0, g.bot - rb); ctx.quadraticCurveTo(g.x0, g.bot, g.x0 + rb, g.bot); ctx.lineTo(g.x1 - rb, g.bot); ctx.quadraticCurveTo(g.x1, g.bot, g.x1, g.bot - rb);
    ctx.lineTo(g.x1 - 2, g.top); ctx.quadraticCurveTo(g.nx1, g.top - 6, g.nx1, g.top - sh); ctx.lineTo(g.nx1, g.ntop); ctx.closePath();
  }
  function stepSoda(dt) {
    const k = sdKe(), dis = KD * SD.g, rel = k * SD.a, out = SD.open ? KOUT * SD.g : 0;
    const da = (dis - rel) * dt; SD.a = Math.max(0, SD.a + da); SD.g = Math.max(0, SD.g - da - out * dt);
    if (SD.open) {
      SD.openT += dt; SD.hacc += dt;
      if (SD.hacc >= 0.2) { SD.hacc = 0; SD.cur.push([SD.openT, sdPct()]); SD.curves[SD.T] = SD.cur; }
      if (SD.openT >= 4 && !SD.recDone) { SD.recDone = true; if (!SD.openInvalid) { SD.rec[SD.openTemp] = Math.round(sdPct()); updateCtl(); } }
    }
    SD.cap.update(dt);
    // 분자 수 맞추기: 용해된 쪽 · 기체 쪽 입자 수가 a, g를 따라가요
    const nA = Math.round(SD.a / U), nG = Math.round(SD.g / U), g = sodaGeom();
    let guard = 3;
    while (SD.liq.count('CO2') > nA && guard-- > 0) {
      SD.liq.remove('CO2', 1);
      if (SD.gas.count('CO2') < nG) SD.gas.add('CO2', 1, { x: g.cx + rnd(-30, 30), y: SD.gas.r.y + SD.gas.r.h - 8 });
      const bx = g.cx + rnd(-g.x1 + g.cx + 20, g.x1 - g.cx - 20); parts.emit({ x: bx, y: g.ly + rnd(10, 60), vx: rnd(-6, 6), vy: -rnd(50, 80), life: 0.6, size: rnd(3, 5), color: '#ffffff', shape: 'bubble', gravity: -10, drag: 0.5 });
    }
    while (SD.liq.count('CO2') < nA && guard-- > 0) { if (SD.gas.count('CO2') > nG) SD.gas.remove('CO2', 1); SD.liq.add('CO2', 1, { x: g.cx + rnd(-30, 30), y: SD.liq.r.y + 14 }); }
    while (SD.gas.count('CO2') > nG && guard-- > 0) { SD.gas.remove('CO2', 1); if (SD.open) for (let j = 0; j < 3; j++) parts.emit({ x: g.cx + rnd(-8, 8), y: g.ntop + 6, vx: rnd(-25, 25), vy: -rnd(60, 110), life: 0.9, size: rnd(2.5, 4), color: 'rgba(120,150,200,.75)', shape: 'circle', gravity: -20, drag: 0.8 }); }
    while (SD.gas.count('CO2') < nG && guard-- > 0) SD.gas.add('CO2', 1, { x: g.cx + rnd(-30, 30), y: SD.gas.r.y + SD.gas.r.h - 6 });
    // 닫힌 병에서도 정반응 · 역반응이 같은 속도로 계속돼요: 가끔 입자 한 쌍이 서로 자리를 바꿔요
    if (!SD.open) {
      SD.swap += dt * (dis / U) * 0.5;
      if (SD.swap >= 1 && SD.gas.ps.length && SD.liq.ps.length) {
        SD.swap = 0;
        const gp = SD.gas.ps.splice((Math.random() * SD.gas.ps.length) | 0, 1)[0], lp = SD.liq.ps.splice((Math.random() * SD.liq.ps.length) | 0, 1)[0];
        gp.y = SD.liq.r.y + 16; gp.x = clamp(gp.x, SD.liq.r.x + 14, SD.liq.r.x + SD.liq.r.w - 14); lp.y = SD.gas.r.y + SD.gas.r.h - 10; lp.x = clamp(lp.x, SD.gas.r.x + 14, SD.gas.r.x + SD.gas.r.w - 14);
        SD.liq.ps.push(gp); SD.gas.ps.push(lp);
        parts.emit({ x: lp.x, y: g.ly - 4, vx: rnd(-8, 8), vy: -30, life: 0.5, size: 3, color: '#ffffff', shape: 'bubble', gravity: 0 });
      }
    }
    // 거품: 방출이 용해보다 빠르면 기포가 올라와요
    const net = (rel - dis) / U;
    if (net > 0.15) { SD.bub += dt * net * 2.2; while (SD.bub >= 1) { SD.bub -= 1; const bx = g.x0 + 18 + Math.random() * (g.x1 - g.x0 - 36); parts.emit({ x: bx, y: g.bot - rnd(20, 80), vx: rnd(-8, 8), vy: -rnd(70, 120), life: Math.min(1.4, (g.bot - g.ly) / 90), size: rnd(2.5, 5), color: '#ffffff', shape: 'bubble', gravity: 0, drag: 0.2 }); } }
    SD.liq.step(dt, 0.45); SD.gas.step(dt, 1.2);
  }
  function drawSoda() {
    const g = sodaGeom(), r = g.r, Tc = SD.T;
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 14, r.y + 26, '🍾 탄산음료 병 (단면 모형)', 14.5, INK, 'left', 800);
    // 병 몸통
    ctx.save();
    D.shadow(() => { bottlePath(g); ctx.fillStyle = '#eef6fb'; ctx.fill(); }, { blur: 10, y: 4 });
    bottlePath(g); ctx.clip();
    const liqCol = Tc === 5 ? '#6b4a2a' : Tc === 35 ? '#a8501c' : '#7a4a22';
    const gr = ctx.createLinearGradient(0, g.ly, 0, g.bot); gr.addColorStop(0, rgba(liqCol, 0.78)); gr.addColorStop(1, rgba(liqCol, 0.95));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(g.x0 - 4, g.bot + 4); ctx.lineTo(g.x0 - 4, g.ly);
    for (let i = 0; i <= 20; i++) ctx.lineTo(g.x0 + (g.x1 - g.x0) * i / 20, g.ly + Math.sin(S.t * 3 + i * 0.8) * 1.8); ctx.lineTo(g.x1 + 4, g.bot + 4); ctx.fill();
    if (Tc === 5) { ctx.fillStyle = 'rgba(180,225,255,.18)'; ctx.fillRect(g.x0, g.top - 30, g.x1 - g.x0, g.bot - g.top + 40); }
    if (Tc === 35) { ctx.fillStyle = 'rgba(255,140,80,.10)'; ctx.fillRect(g.x0, g.top - 30, g.x1 - g.x0, g.bot - g.top + 40); }
    // 입자: 기체 칸 · 용해된 칸 (물 속)
    SD.gas.setRect({ x: g.x0 + 4, y: g.top + 4, w: g.x1 - g.x0 - 8, h: g.ly - g.top - 6 });
    SD.liq.setRect({ x: g.x0 + 4, y: g.ly + 6, w: g.x1 - g.x0 - 8, h: g.bot - g.ly - 12 });
    SD.gas.drawPs(); SD.liq.drawPs();
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(80,110,160,.7)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; bottlePath(g); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(g.x0 + 14, g.top + 20); ctx.lineTo(g.x0 + 14, g.bot - 40); ctx.stroke(); ctx.restore();
    // 라벨
    T(g.x1 + 8, g.top + (g.ly - g.top) / 2 + 4, '기체 CO₂', 12.5, MUTED, 'left', 800); T(g.x1 + 8, g.ly + 30, '음료 속에', 12.5, MUTED, 'left', 800); T(g.x1 + 8, g.ly + 46, '녹은 CO₂', 12.5, MUTED, 'left', 800);
    // 뚜껑
    const cp = SD.cap.value, cy = g.ntop - 14 - cp * (PHONE ? 26 : 52), cxx = g.cx + cp * (PHONE ? 80 : 70), ang = cp * 0.7;
    ctx.save(); ctx.translate(cxx, cy + 7); ctx.rotate(ang); D.shadow(() => { D.roundRect(-(g.nx1 - g.nx0) / 2 - 5, -9, g.nx1 - g.nx0 + 10, 18, 5); ctx.fillStyle = '#e2464b'; ctx.fill(); }, { blur: 5, y: 2 }); ctx.restore();
    if (SD.open && cp > 0.5) T(g.cx - (PHONE ? 50 : 0), g.ntop - (PHONE ? 40 : 82), '칙~', 17, '#64748b', 'center', 800, { alpha: 0.6 + 0.4 * Math.sin(S.t * 9) });
    // 온도 표시
    D.label(r.x + r.w - 14, r.y + 26, TNAME[Tc], { bg: TCOL[Tc], size: 13, align: 'right' });
    D.label(r.x + 14 + (PHONE ? 0 : 0), r.y + r.h - 18, SD.open ? '🔓 열림 (바깥 압력 1기압)' : '🔒 닫힘 (병 속 압력이 높아요)', { bg: SD.open ? AMB : INK, size: 12.5, align: 'left' });
  }
  function drawSodaRight() {
    const R = PHONE ? { x: 8, y: 346, w: 464, h: 346 } : { x: 436, y: 8, w: 356, h: 544 };
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 26, '⚖️ CO₂(g) ⇌ CO₂(aq)', 15, VIO, 'left', 800);
    const dis = KD * SD.g / U, rel = sdKe() * SD.a / U;
    const ax1 = R.x + 30, ax2 = R.x + R.w - 30, ay = R.y + (PHONE ? 54 : 62), f = PHONE ? 0.8 : 1.5;
    D.arrow(ax1, ay, ax2, ay, { color: BLU, width: 2.5 + dis * f, head: 11 + dis * (PHONE ? 0.6 : 1) });
    T(R.x + R.w / 2, ay - 8 - dis * f / 2, '정반응 (녹아 들어감) ' + dis.toFixed(1) + '개/초', 13, BLU, 'center', 800);
    D.arrow(ax2, ay + (PHONE ? 26 : 32), ax1, ay + (PHONE ? 26 : 32), { color: BAD, width: 2.5 + rel * f, head: 11 + rel * (PHONE ? 0.6 : 1) });
    T(R.x + R.w / 2, ay + (PHONE ? 28 : 34) + 14 + rel * f / 2, '역반응 (기체로 나옴) ' + rel.toFixed(1) + '개/초', 13, BAD, 'center', 800);
    // 그래프
    const gy = R.y + (PHONE ? 112 : 138), gh = PHONE ? 134 : 270;
    T(R.x + 14, gy + 4, '📈 병 속 CO₂ (처음의 %) – 뚜껑을 연 뒤 시간', 13, INK, 'left', 800);
    const ax = axes({ x: R.x, y: gy + 6, w: R.w, h: gh }, 10, 100, '열린 뒤 시간 (초)', '%', { top: 24, left: 42, fy: (v) => String(Math.round(v)), nx: 5, fx: (v) => String(Math.round(v)) });
    D.dashedLine(ax.X(4), ax.y0, ax.X(4), ax.y1, { color: '#9aa3b8', width: 1.5 });
    [5, 25, 35].forEach((tt) => {
      const c = SD.curves[tt]; if (!c || c.length < 2) return;
      ctx.save(); ctx.strokeStyle = TCOL[tt]; ctx.lineWidth = SD.T === tt ? 3.4 : 2.2; ctx.globalAlpha = SD.T === tt ? 1 : 0.7; ctx.beginPath();
      c.forEach((p, i) => { const x = ax.X(clamp(p[0], 0, 10)), y = ax.Y(clamp(p[1], 0, 100)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
    });
    if (!Object.keys(SD.curves).length) T((ax.x0 + ax.x1) / 2, (ax.y0 + ax.y1) / 2, '뚜껑을 열면 곡선이 그려져요', 13, MUTED, 'center', 800);
    // 기록
    const ty = gy + gh + (PHONE ? 24 : 36);
    T(R.x + 14, ty, '4초 뒤 남은 CO₂ (처음 = 100 %)', 13, INK, 'left', 800);
    [5, 25, 35].forEach((tt, i) => {
      const y = ty + 12 + i * (PHONE ? 21 : 26), v = SD.rec[tt];
      D.label(R.x + 14, y + 8, TNAME[tt], { bg: TCOL[tt], size: 11.5, align: 'left', pad: 7 });
      T(R.x + R.w - 14, y + 13, v == null ? '아직 안 열었어요' : v + ' %', 14, v == null ? MUTED : INK, 'right', 800);
    });
  }
  /* ================= ② 산소 운반: Hb + O₂ ⇌ HbO₂ ================= */
  const BN = Math.log(49 / 3) / Math.log(2.5), BP50 = 40 / Math.pow(3, 1 / BN);
  const sat = (P) => 1 / (1 + Math.pow(BP50 / P, BN));                 // 폐 100 mmHg → 98 %, 조직 40 mmHg → 75 % (예시 곡선)
  const satN = (P) => Math.round(100 * sat(P));
  const BL = { P: 100, shown: 98, order: [], cells: [], acc: 0, ft: 0, dir: 0, dirT: 0, mk: new SciSim.Spring(100, { stiffness: 140, damping: 18 }), seen: {}, calm: 0 };
  (function () { const a = []; for (let i = 0; i < 100; i++) a.push(i); for (let i = 99; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } BL.order = a; for (let i = 0; i < 100; i++) BL.cells.push({ b: false, t: 9 }); })();
  function bloodSyncHard() { BL.cells.forEach((c) => { c.b = false; c.t = 9; }); const n = satN(BL.P); for (let i = 0; i < n; i++) BL.cells[BL.order[i]].b = true; BL.shown = n; BL.mk.value = BL.mk.target = BL.P; }
  function setP(P, hard) {
    P = clamp(Math.round(P / 5) * 5, 10, 120); BL.P = P; $('#pRange').value = P; $('#oP2').textContent = P + ' mmHg'; BL.mk.target = P;
    if (hard) bloodSyncHard(); updateCtl();
  }
  function stepBlood(dt) {
    BL.mk.update(dt);
    const N = satN(BL.P); BL.acc += dt; BL.dirT = Math.max(0, BL.dirT - dt);
    while (BL.acc >= 0.022 && BL.shown !== N) {
      BL.acc -= 0.022;
      if (BL.shown < N) { const c = BL.cells[BL.order[BL.shown]]; c.b = true; c.t = 0; BL.shown++; BL.dir = 1; BL.dirT = 0.5; }
      else { BL.shown--; const c = BL.cells[BL.order[BL.shown]]; c.b = false; c.t = 0; BL.dir = -1; BL.dirT = 0.5; }
    }
    if (BL.shown === N) BL.acc = Math.min(BL.acc, 0.05);
    BL.cells.forEach((c) => { if (c.t < 1) c.t += dt * 3; });
    // 방문 기록: 분압이 그 값에서 멈추고 그림이 자리 잡으면
    if (BL.shown === N && Math.abs(BL.mk.value - BL.P) < 0.5) { BL.calm += dt; if (BL.calm > 0.4) { [[100, 'lung'], [40, 'tissue'], [60, 'high']].forEach(([p, k]) => { if (BL.P === p && !BL.seen[k]) { BL.seen[k] = true; updateCtl(); } }); } } else BL.calm = 0;
  }
  function bloodGeom() {
    if (!PHONE) return { A: { x: 8, y: 8, w: 500, h: 544 }, B: { x: 516, y: 8, w: 276, h: 544 }, cell: 33, gx: 8 + 80, gy: 150 };
    return { A: { x: 8, y: 8, w: 464, h: 420 }, B: { x: 8, y: 436, w: 464, h: 256 }, cell: 27, gx: 8 + 82, gy: 100 };
  }
  function drawBlood() {
    const G = bloodGeom(), A = G.A, N = satN(BL.P);
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 26, '🩸 헤모글로빈(Hb) 100개 모형', 14.5, INK, 'left', 800);
    const place = BL.P >= 95 ? '🫁 폐포 (산소가 많아요)' : BL.P >= 55 && BL.P <= 65 ? '⛰️ 높은 산 위의 폐포' : BL.P <= 45 ? '💪 조직 (산소가 적어요)' : '혈액';
    D.label(A.x + A.w - 14, A.y + 24, place, { bg: BL.P >= 95 ? '#0ea5e9' : BL.P <= 45 ? '#dc2626' : '#64748b', size: 13, align: 'right' });
    // 반응식 + 화살표 (이동 중인 방향이 굵어져요)
    const ey = A.y + 62, ex = A.x + A.w / 2;
    T(ex, ey, 'Hb + O₂  ⇌  HbO₂', PHONE ? 19 : 22, VIO, 'center', 800);
    const fw = BL.dirT > 0 && BL.dir > 0 ? 7 : 3, rw = BL.dirT > 0 && BL.dir < 0 ? 7 : 3;
    D.arrow(ex - 70, ey + 14, ex + 70, ey + 14, { color: GOOD, width: fw, head: 10 + fw });
    D.arrow(ex + 70, ey + 30, ex - 70, ey + 30, { color: BAD, width: rw, head: 10 + rw });
    T(ex + 92, ey + 19, '정반응: O₂와 결합', 12, GOOD, 'left', 800); T(ex + 92, ey + 35, '역반응: O₂ 방출', 12, BAD, 'left', 800);
    // 격자
    const cs = G.cell, gx = A.x + (A.w - cs * 10) / 2, gy = A.y + G.gy;
    for (let i = 0; i < 100; i++) {
      const c = BL.cells[i], r = (i / 10) | 0, k = i % 10, x = gx + k * cs + cs / 2, y = gy + r * cs + cs / 2, pop = c.t < 1 ? 1 + 0.45 * Math.sin(c.t * Math.PI) : 1;
      D.sphere(x, y, cs * 0.38 * pop, c.b ? '#d62839' : '#4a5fa8', { gloss: true });
      if (c.b) { D.sphere(x + cs * 0.2, y - cs * 0.2, cs * 0.12, '#ffffff', { gloss: false }); }
    }
    ctx.save(); ctx.strokeStyle = '#c9cfdd'; ctx.lineWidth = 2; D.roundRect(gx - 6, gy - 6, cs * 10 + 12, cs * 10 + 12, 12); ctx.stroke(); ctx.restore();
    const ly = gy + cs * 10 + (PHONE ? 22 : 30);
    D.sphere(A.x + 24, ly - 4, 9, '#d62839', { gloss: true }); D.sphere(A.x + 29, ly - 9, 3, '#fff', { gloss: false }); T(A.x + 40, ly, 'O₂와 결합한 Hb', 13, INK, 'left', 800);
    D.sphere(A.x + A.w / 2 + 8, ly - 4, 9, '#4a5fa8', { gloss: true }); T(A.x + A.w / 2 + 22, ly, 'O₂가 없는 Hb', 13, INK, 'left', 800);
    T(A.x + A.w / 2, ly + (PHONE ? 22 : 30), 'P(O₂) = ' + BL.P + ' mmHg  →  결합한 Hb ' + BL.shown + '개 / 100개 = ' + N + ' %', PHONE ? 14 : 16, INK, 'center', 800);
    // 곡선
    const B = G.B; panel(B.x, B.y, B.w, B.h, 14);
    T(B.x + 14, B.y + 26, '📈 O₂ 분압과 결합 비율', 14, INK, 'left', 800);
    const ax = axes({ x: B.x, y: B.y + 6, w: B.w, h: B.h - 6 }, 120, 100, 'O₂ 분압 P(O₂) (mmHg)', '결합한 Hb (%)', { top: 54, left: 42, fy: (v) => String(Math.round(v)), nx: 4, fx: (v) => String(Math.round(v)) });
    ctx.save(); ctx.strokeStyle = VIO; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let P = 10; P <= 120; P += 2) { const x = ax.X(P), y = ax.Y(100 * sat(P)); if (P > 10) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); ctx.restore();
    [[100, '폐', '#0ea5e9'], [60, '높은 산', '#d97706'], [40, '조직', '#dc2626']].forEach(([p, nm, col]) => {
      const x = ax.X(p), y = ax.Y(satN(p)); D.dashedLine(x, ax.y0, x, y, { color: col, width: 1.5 }); D.dashedLine(ax.x0, y, x, y, { color: col, width: 1.5 });
      D.sphere(x, y, 5, col, { gloss: false }); T(x + (p > 90 ? -6 : 7), y + (p > 90 ? 18 : p < 50 ? 18 : 16), nm + ' ' + satN(p) + ' %', 12, col, p > 90 ? 'right' : 'left', 800);
    });
    const mx = ax.X(BL.mk.value), my = ax.Y(100 * sat(BL.mk.value)); D.glow(mx, my, 16, '#14a058', 0.5); D.sphere(mx, my, 7.5, '#14a058', { shadow: true });
  }

  /* ================= ③ 암모니아: 하버-보슈 ================= */
  // 평형에서 암모니아 부피 % (N₂ : H₂ = 1 : 3, 대략 값). 200 °C의 200 · 300기압, 300 °C의 300기압은 교과서 자료 기반 대략 값
  const NH3 = { 200: { 100: 82, 200: 90, 300: 93 }, 300: { 100: 52, 200: 71, 300: 80 }, 400: { 100: 25, 200: 39, 300: 47 }, 500: { 100: 11, 200: 18, 300: 26 } };
  const xiOf = (x) => (2 * x) / (1 + x);                               // N₂ 1몰, H₂ 3몰로 시작해 NH₃ 부피 분율이 x일 때 N₂의 전환율
  const rateOf = (Tc) => Math.pow(2, (Tc - 200) / 50);                 // 상대 속도 (가상 단위): 200 °C = 1
  const HB = { T: 400, P: 200, sep: false, n: 0, cum: 0, cumD: 0, ph: 0, tank: 0, calm: 0, flags: {}, toks: [], cyc: 2.4 };
  const hbX = () => NH3[HB.T][HB.P];
  const hbXi = () => xiOf(hbX() / 100);
  function hbReset() { HB.n = 0; HB.cum = 0; HB.ph = 0; HB.toks = []; updateCtl(); }
  function stepHaber(dt) {
    const prev = HB.ph; HB.ph += dt / HB.cyc;
    if (prev < 0.78 && HB.ph >= 0.78) { HB.n++; HB.cum = HB.sep ? 1 - Math.pow(1 - hbXi(), HB.n) : hbXi(); }
    if (HB.ph >= 1) HB.ph -= 1;
    HB.cumD = SciSim.approach(HB.cumD, HB.cum, dt, 3);
    const f = HB.flags;
    if (HB.T === 200 && HB.P === 300) { HB.calm += dt; if (HB.calm > 0.5 && !f.max) { f.max = true; updateCtl(); } } else HB.calm = 0;
    if (HB.sep && HB.T >= 400 && HB.P >= 200 && HB.cumD * 100 >= 90 && !f.sep) { f.sep = true; updateCtl(); }
  }
  function haberGeom() {
    if (!PHONE) return { A: { x: 8, y: 8, w: 784, h: 330 }, TB: { x: 8, y: 346, w: 380, h: 206 }, BR: { x: 396, y: 346, w: 396, h: 206 } };
    return { A: { x: 8, y: 8, w: 464, h: 270 }, TB: { x: 8, y: 286, w: 464, h: 190 }, BR: { x: 8, y: 484, w: 464, h: 208 } };
  }
  // 공장 배치: 상대 좌표(0~1)를 패널 안의 위치로
  function plant(A) {
    const sx = A.w / 784, sy = A.h / (PHONE ? 270 : 330), fx = (v) => A.x + v * sx, fy = (v) => A.y + v * sy;
    if (!PHONE) return { R: { x: fx(170), y: fy(110), w: 150 * sx, h: 130 * sy }, C: { x: fx(430), y: fy(110), w: 130 * sx, h: 130 * sy }, Tk: { x: fx(437), y: fy(262), w: 116 * sx, h: 56 * sy }, fy175: fy(175), fy60: fy(62), fxExit: fx(770), f: (x, y) => ({ x: fx(x), y: fy(y) }), W: 1 };
    return { R: { x: A.x + 112, y: A.y + 90, w: 110, h: 100 }, C: { x: A.x + 290, y: A.y + 90, w: 100, h: 100 }, Tk: { x: A.x + 292, y: A.y + 208, w: 96, h: 46 }, fy175: A.y + 140, fy60: A.y + 56, fxExit: A.x + 456, f: null, W: 0 };
  }
  function hbPos(P, lt, i, tk) {
    // 토큰의 위치: lt 0~1 한 번의 순환
    const R = P.R, C = P.C, cy = R.y + R.h / 2, jit = (k) => Math.sin(S.t * 3 + i * 1.7 + k) * 0.5;
    const fxS = R.x - (PHONE ? 76 : 120);
    if (lt < 0.2) return { x: fxS + (R.x + 8 - fxS) * (lt / 0.2), y: P.fy175 + (i % 3 - 1) * 7 };
    if (lt < 0.45) return { x: R.x + R.w * (0.18 + 0.64 * ((i * 0.37) % 1)) + jit(1) * 8, y: R.y + R.h * (0.2 + 0.6 * ((i * 0.61) % 1)) + jit(2) * 8 };
    if (lt < 0.62) { const u = (lt - 0.45) / 0.17; return { x: R.x + R.w - 6 + (C.x + 6 - (R.x + R.w - 6)) * u, y: P.fy175 + (i % 3 - 1) * 7 }; }
    if (lt < 0.72) return { x: C.x + C.w * (0.2 + 0.6 * ((i * 0.53) % 1)) + jit(3) * 6, y: C.y + C.h * (0.25 + 0.55 * ((i * 0.29) % 1)) + jit(4) * 6 };
    const u = (lt - 0.72) / 0.28;
    if (tk.nh3 && HB.sep) return { x: P.Tk.x + P.Tk.w * (0.2 + 0.6 * ((i * 0.43) % 1)), y: C.y + C.h + u * (P.Tk.y + 14 - C.y - C.h) };
    if (HB.sep) {                                                  // 재순환: 응축기 위 → 왼쪽으로 → 반응기 위
      const x0 = C.x + C.w / 2, y0 = C.y, x1 = R.x + R.w / 2, y1 = R.y;
      if (u < 0.3) return { x: x0, y: y0 - (y0 - P.fy60) * (u / 0.3) };
      if (u < 0.75) return { x: x0 + (x1 - x0) * ((u - 0.3) / 0.45), y: P.fy60 };
      return { x: x1, y: P.fy60 + (y1 + 6 - P.fy60) * ((u - 0.75) / 0.25) };
    }
    return { x: C.x + C.w - 4 + (P.fxExit - C.x - C.w + 4) * u, y: P.fy175 + (i % 3 - 1) * 7 };    // 장치를 끄면 혼합 기체가 그대로 빠져나가요
  }
  const HT_N = 16;
  function drawHaber() {
    const G = haberGeom(), A = G.A, P = plant(A);
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 26, '🏭 암모니아 공장 모형 (하버–보슈)', 14.5, INK, 'left', 800);
    D.label(A.x + A.w - 14, A.y + 24, 'N₂ + 3H₂ ⇌ 2NH₃  (발열)', { bg: VIO, size: 13, align: 'right' });
    // 배관
    ctx.save(); ctx.strokeStyle = '#cfd5e6'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const R = P.R, C = P.C, Tk = P.Tk, fxS = R.x - (PHONE ? 76 : 120);
    ctx.beginPath(); ctx.moveTo(fxS, P.fy175); ctx.lineTo(R.x, P.fy175); ctx.moveTo(R.x + R.w, P.fy175); ctx.lineTo(C.x, P.fy175); ctx.moveTo(C.x + C.w / 2, C.y + C.h); ctx.lineTo(C.x + C.w / 2, Tk.y);
    if (HB.sep) { ctx.moveTo(C.x + C.w / 2, C.y); ctx.lineTo(C.x + C.w / 2, P.fy60); ctx.lineTo(R.x + R.w / 2, P.fy60); ctx.lineTo(R.x + R.w / 2, R.y); } else { ctx.moveTo(C.x + C.w, P.fy175); ctx.lineTo(P.fxExit, P.fy175); }
    ctx.stroke(); ctx.restore();
    T(fxS, P.fy175 - 14, '원료', 12.5, MUTED, 'left', 800); T(fxS, P.fy175 + 22, 'N₂ : H₂ = 1 : 3', 12, MUTED, 'left', 800);
    if (HB.sep) T((C.x + R.x + R.w) / 2 + 10, P.fy60 - 8, '재순환: 남은 N₂ · H₂', 12.5, GOOD, 'center', 800); else T(P.fxExit - 6, P.fy175 - 14, '그대로 배출', 12.5, MUTED, 'right', 800);
    // 반응기
    const hot = clamp((HB.T - 200) / 300, 0, 1);
    D.shadow(() => { D.roundRect(R.x, R.y, R.w, R.h, 14); ctx.fillStyle = mixc('#fde8d8', '#fca5a5', hot); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 3; D.roundRect(R.x, R.y, R.w, R.h, 14); ctx.stroke();
    ctx.save(); D.roundRect(R.x, R.y, R.w, R.h, 14); ctx.clip(); ctx.fillStyle = 'rgba(120,113,108,.35)'; for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.arc(R.x + 14 + (i % 6) * (R.w - 28) / 5, R.y + R.h - 22 + (i % 2) * 8 - ((i / 6) | 0) * 14, 4, 0, TAU); ctx.fill(); } ctx.restore();
    T(R.x + R.w / 2, R.y - 8, '반응기 · 철 촉매', 12.5, INK, 'center', 800); T(R.x + R.w / 2, R.y + R.h + 16, HB.T + ' °C · ' + HB.P + '기압', 12.5, '#a16207', 'center', 800);
    // 응축기
    D.shadow(() => { D.roundRect(C.x, C.y, C.w, C.h, 14); ctx.fillStyle = HB.sep ? '#dff1ff' : '#eef0f5'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = HB.sep ? '#3b82f6' : '#9aa3b8'; ctx.lineWidth = 3; D.roundRect(C.x, C.y, C.w, C.h, 14); ctx.stroke();
    ctx.save(); ctx.strokeStyle = HB.sep ? '#60a5fa' : '#b8bfce'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 5; i++) { const yy = C.y + 18 + i * (C.h - 36) / 4; ctx.moveTo(C.x + 14, yy); ctx.lineTo(C.x + C.w - 14, yy + (i % 2 ? 6 : -6)); } ctx.stroke(); ctx.restore();
    T(C.x + C.w / 2, C.y - 8, HB.sep ? '❄️ 응축기 (NH₃ 액화)' : '응축기 꺼짐', 12.5, HB.sep ? '#2563eb' : MUTED, 'center', 800);
    // 탱크: 누적 전환율에 비례해 액체 NH₃가 차올라요
    D.shadow(() => { D.roundRect(Tk.x, Tk.y, Tk.w, Tk.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.save(); D.roundRect(Tk.x, Tk.y, Tk.w, Tk.h, 10); ctx.clip(); const lv = clamp(HB.cumD, 0, 1) * (Tk.h - 4); ctx.fillStyle = 'rgba(20,160,88,.75)'; ctx.fillRect(Tk.x, Tk.y + Tk.h - lv, Tk.w, lv + 2); ctx.restore();
    ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2.5; D.roundRect(Tk.x, Tk.y, Tk.w, Tk.h, 10); ctx.stroke();
    T(Tk.x + Tk.w + 10, Tk.y + Tk.h / 2 + 4, HB.sep ? '액체 NH₃ ' + Math.round(HB.cumD * 100) + ' %' : '(분리 안 함)', 12.5, HB.sep ? '#0b6b39' : MUTED, 'left', 800);
    // 토큰 (분자 모형)
    const xr = hbX() / 100, nNH3 = Math.round(HT_N * xr);
    for (let i = 0; i < HT_N; i++) {
      const lt = (HB.ph + 1 - i * (0.46 / HT_N)) % 1;                // 한 번에 줄지어 들어가요
      const tk = { nh3: i < nNH3 };
      const post = lt >= 0.45;                                         // 반응기를 지난 뒤에는 NH₃ 몫만큼 NH₃
      const kind = post && tk.nh3 ? 'NH3' : i % 4 === 0 ? 'N2' : 'H2';
      const p = hbPos(P, lt, i, tk);
      ctx.save(); ctx.globalAlpha = clamp(Math.min(lt / 0.06, (1 - lt) / 0.06), 0, 1); drawMol(kind, p.x, p.y, S.t * 0.5 + i, 0.8); ctx.restore();
    }
    // 표
    drawNH3Table(G.TB); drawHaberBars(G.BR);
  }
  function drawNH3Table(r) {
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 14, r.y + 26, '📊 평형에서 NH₃ 부피 % (표 읽기)', 14, INK, 'left', 800);
    const Ts = [200, 300, 400, 500], Ps = [100, 200, 300], x0 = r.x + 82, cw = (r.w - 96) / 3, y0 = r.y + 50, rh = Math.min(34, (r.h - 70) / 5);
    Ps.forEach((p, j) => T(x0 + j * cw + cw / 2, y0 + 12, p + '기압', 13, MUTED, 'center', 800));
    Ts.forEach((t, i) => {
      T(r.x + 16, y0 + rh * (i + 1) + rh / 2 + 5, t + ' °C', 13, MUTED, 'left', 800);
      Ps.forEach((p, j) => {
        const cur = t === HB.T && p === HB.P, v = NH3[t][p], x = x0 + j * cw + 3, y = y0 + rh * (i + 1) + 2;
        ctx.save(); D.roundRect(x, y, cw - 6, rh - 4, 8); ctx.fillStyle = cur ? '#e4f6ec' : rgba('#14a058', v / 140); ctx.fill(); ctx.strokeStyle = cur ? GOOD : LINE; ctx.lineWidth = cur ? 3 : 1; ctx.stroke(); ctx.restore();
        T(x + (cw - 6) / 2, y + rh / 2 + 3, String(v), 14, cur ? '#0b6b39' : INK, 'center', 800);
      });
    });
    if (!PHONE) T(r.x + r.w - 14, r.y + r.h - 10, '대략 값 · N₂ : H₂ = 1 : 3', 11.5, MUTED, 'right', 700);
  }
  function drawHaberBars(r) {
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 14, r.y + 26, '📈 수득률과 속도', 14, INK, 'left', 800);
    const x = hbX(), xi = hbXi() * 100, rate = rateOf(HB.T), bw = r.w - 40, bx = r.x + 20, ph = PHONE;
    hbar(bx, r.y + 58, bw, 15, x / 100, '#14a058', '① 평형 혼합 기체 속 NH₃ (부피 %)', x + ' %');
    hbar(bx, r.y + 104, bw, 15, HB.cumD, '#0ea5e9', '② 처음 N₂ 중 NH₃가 된 비율 (' + (HB.sep ? '분리·재순환 ' + HB.n + '회째' : '한 번 통과') + ')', Math.round(HB.cumD * 100) + ' %');
    hbar(bx, r.y + 150, bw, 15, rate / 64, '#d97706', '③ 반응 속도 (상대, 가상 단위)', '×' + rate);
    if (!ph) textBlock(bx, r.y + 184, bw, '①과 ②는 다른 양이에요. ①은 기체 혼합물의 부피 비율, ②는 처음 넣은 N₂ 중 NH₃가 된 비율이에요.', 11.5, MUTED, 14, 700);
  }
  /* ================= ④ 사례 조사 ================= */
  const DIRS = [['', '고르세요'], ['fwd', '정반응 →'], ['rev', '← 역반응']];
  const CASES = [
    { id: 'su', icon: '🧪', title: '접촉법 황산 제조', eq: '2SO₂ + O₂ ⇌ 2SO₃ (발열)', ok: 1, dir: 'fwd', conds: ['압력을 수백 기압으로 크게 높임', '온도를 너무 높이지 않고 약 450 °C로 유지 (고온은 발열 반응의 정반응에 불리)', '촉매로 SO₃의 평형 수득률 자체를 높임'], use: '약 450 °C와 V₂O₅ 촉매로 속도와 수득률을 맞추고, 상압에서도 전환율이 높아 고압은 필요 없어요. 황산을 대량 생산해요.', career: '화학 공학 기술자' },
    { id: 'st', icon: '🏞️', title: '석회 동굴의 종유석', eq: 'CaCO₃ + CO₂ + H₂O ⇌ Ca²⁺ + 2HCO₃⁻', ok: 0, dir: 'rev', conds: ['동굴 공기 중으로 CO₂가 빠져나가 CO₂ 농도가 줄어듦', '지하수에 CO₂가 더 많이 녹아 들어옴', '촉매를 넣음'], use: '물속 CO₂가 줄면 역반응으로 CaCO₃가 다시 석출되어 종유석 · 석순이 자라요. (지하수에 CO₂가 많으면 정반응으로 석회암이 녹아요.)', career: '환경 공학 · 지질 연구' },
    { id: 'pk', icon: '🥤', title: '탄산음료 포장', eq: 'CO₂(g) ⇌ CO₂(aq)', ok: 2, dir: 'fwd', conds: ['뚜껑을 열어 압력을 낮춤', '따뜻한 곳에 보관해 온도를 높임', 'CO₂를 높은 압력으로 채워 밀봉하고 차갑게 보관'], use: '압력을 높이고 온도를 낮추면 정반응으로 CO₂가 많이 녹아 있어서 청량감이 오래 유지돼요.', career: '식품 연구 · 포장 공학' },
    { id: 'hb', icon: '🏭', title: '하버–보슈 암모니아', eq: 'N₂ + 3H₂ ⇌ 2NH₃ (발열)', ok: 1, dir: 'fwd', conds: ['생성된 NH₃를 반응기에 다시 넣음', '생성된 NH₃를 액화해 계속 빼냄 (NH₃ 농도 감소)', '온도를 아주 높임'], use: 'NH₃를 빼내고 남은 N₂, H₂를 재순환시켜 수득률을 높여요. 질소 비료의 원료예요.', career: '화학 공학 기술자 · 농업 연구' },
    { id: 'hg', icon: '🩸', title: '헤모글로빈의 산소 방출', eq: 'Hb + O₂ ⇌ HbO₂', ok: 2, dir: 'rev', conds: ['폐포에서 O₂ 분압이 높아짐', '혈액의 온도를 낮춤', '조직에서 O₂ 분압이 낮아짐 (약 40 mmHg)'], use: '산소가 적은 조직에서는 역반응으로 HbO₂가 O₂를 내놓아 세포에 산소를 공급해요.', career: '의학 · 약학' },
    { id: 'ox', icon: '🫁', title: '산소 캔과 고지대', eq: 'Hb + O₂ ⇌ HbO₂', ok: 0, dir: 'fwd', conds: ['산소 캔으로 호흡해 O₂ 농도(분압)를 높임', '숨을 참아 O₂ 분압을 낮춤', 'Hb에 촉매를 넣음'], use: '산소가 적은 높은 산에서는 Hb 포화도가 낮아져요. O₂ 분압을 높이면 정반응으로 결합 비율이 올라가요.', career: '응급 구조 · 스포츠 의학' },
  ];
  const casesDone = () => CASES.filter((c) => S.cards[c.id]).length;
  function casesGeom() {
    if (!PHONE) return { A: { x: 8, y: 8, w: 784, h: 360 }, D: { x: 8, y: 376, w: 784, h: 176 }, cw: 248, ch: 148, gap: 12, cols: 3 };
    return { A: { x: 8, y: 8, w: 464, h: 354 }, D: { x: 8, y: 370, w: 464, h: 322 }, cw: 218, ch: 96, gap: 8, cols: 2 };
  }
  function cardRect(i) { const G = casesGeom(), r = (i / G.cols) | 0, c = i % G.cols; return { x: G.A.x + 8 + c * (G.cw + G.gap), y: G.A.y + 42 + r * (G.ch + G.gap), w: G.cw, h: G.ch }; }
  function drawCases() {
    const G = casesGeom(), A = G.A, D0 = G.D;
    panel(A.x, A.y, A.w, A.h, 14);
    T(A.x + 14, A.y + 26, '🃏 사례 카드 6장 중 2장을 골라 정리해요', 14.5, INK, 'left', 800);
    T(A.x + A.w - 14, A.y + 26, '정리한 카드 ' + casesDone() + ' / 6', 13.5, casesDone() >= 2 ? GOOD : MUTED, 'right', 800);
    CASES.forEach((c, i) => {
      const r = cardRect(i), on = S.sel === i, done = !!S.cards[c.id];
      ctx.save(); D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = done ? '#eefbf3' : on ? '#f3efff' : '#fff'; ctx.fill(); }, { blur: on ? 10 : 5, y: on ? 4 : 2 });
      ctx.strokeStyle = done ? GOOD : on ? VIO : LINE; ctx.lineWidth = on ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke(); ctx.restore();
      T(r.x + 12, r.y + (PHONE ? 30 : 38), c.icon, PHONE ? 24 : 30, INK, 'left', 800);
      textBlock(r.x + (PHONE ? 46 : 52), r.y + (PHONE ? 22 : 28), r.w - (PHONE ? 54 : 62), c.title, PHONE ? 13.5 : 15, INK, PHONE ? 16 : 19, 800);
      textBlock(r.x + 12, r.y + (PHONE ? 52 : 80), r.w - 24, c.eq, PHONE ? 11 : 13, VIO, PHONE ? 13 : 17, 800);
      T(r.x + 12, r.y + r.h - 12, done ? '🎓 ' + c.career : '눌러서 정리하기', PHONE ? 11.5 : 12.5, done ? '#0b6b39' : MUTED, 'left', 800);
      if (done) D.check(r.x + r.w - 18, r.y + r.h - 20, 11, 1);
    });
    // 선택한 카드의 정리
    const c = CASES[S.sel], done = !!S.cards[c.id];
    panel(D0.x, D0.y, D0.w, D0.h, 14);
    T(D0.x + 14, D0.y + 28, c.icon + ' ' + c.title, 15, INK, 'left', 800);
    T(D0.x + D0.w - 14, D0.y + 28, c.eq, PHONE ? 12 : 14, VIO, 'right', 800);
    const bx = D0.x + 16, bw = D0.w - 32, lh = PHONE ? 17 : 19, fs = PHONE ? 13 : 14;
    let y = D0.y + 56;
    const row = (lab, txt, col) => { D.label(bx, y - 4, lab, { bg: col, size: 12, align: 'left', pad: 7 }); const h = textBlock(bx + (PHONE ? 92 : 100), y, bw - (PHONE ? 92 : 100), txt, fs, txt.charAt(0) === '?' ? MUTED : INK, lh, 800); y += Math.max(h, lh) + (PHONE ? 10 : 8); };
    row('① 반응식', c.eq, '#8b5cf6');
    row('② 바꾼 조건', done ? c.conds[c.ok] : '? (조작 패널에서 골라요)', '#3867f4');
    row('③ 이동 방향', done ? (c.dir === 'fwd' ? '정반응 → (생성물 쪽으로 이동)' : '← 역반응 (반응물 쪽으로 이동)') : '? (조작 패널에서 골라요)', '#e2464b');
    row('④ 활용', done ? c.use : '? 정리하면 보여 줘요', '#14a058');
    if (done) row('🎓 진로', c.career, '#d97706');
  }
  const CS = { cond: -1, dir: '' };
  function fillCaseCtl() {
    const c = CASES[S.sel], done = !!S.cards[c.id];
    CS.cond = done ? c.ok : -1; CS.dir = done ? c.dir : '';
    $('#cHead').textContent = c.icon + ' ' + c.title;
    const cl = $('#cCond'); cl.innerHTML = '';
    c.conds.forEach((t, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.disabled = done; b.addEventListener('click', () => { Sound.click(); CS.cond = i; paintCase(); }); cl.appendChild(b); });
    const dl = $('#cDir'); dl.innerHTML = '';
    DIRS.slice(1).forEach(([v, t]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.dataset.v = v; b.disabled = done; b.classList.add(v === 'fwd' ? 'vd-fwd' : 'vd-rev'); b.addEventListener('click', () => { Sound.click(); CS.dir = v; paintCase(); }); dl.appendChild(b); });
    $('#bCard').disabled = done;
    $('#cNote').textContent = done ? '이 카드는 정리를 마쳤어요. 다른 카드를 눌러 보세요.' : '반응식 → 바꾼 조건 → 이동 방향을 골라요.';
    paintCase();
  }
  function paintCase() {
    $$('#cCond button').forEach((b, i) => b.classList.toggle('on', i === CS.cond));
    $$('#cDir button').forEach((b) => b.classList.toggle('on', b.dataset.v === CS.dir));
  }
  $('#bCard').addEventListener('click', () => {
    const c = CASES[S.sel]; if (S.cards[c.id]) return;
    const a = CS.cond, d = CS.dir;
    if (a < 0 || !d) { Sound.fail(); showHint('바꾼 조건과 이동 방향을 모두 골라요.', 3000); return; }
    if (a !== c.ok) { Sound.fail(); showHint('그 조건은 이 사례에서 바꾼 조건이 아니에요. 반응식과 활용을 떠올려 다시 골라요.', 4200); return; }
    if (d !== c.dir) { Sound.fail(); showHint('조건은 맞아요! 그 변화를 줄이는 방향으로 평형이 이동해요. Q와 K를 비교해 방향을 다시 골라요.', 4800); return; }
    S.cards[c.id] = true; Sound.success(); const r = cardRect(S.sel); parts.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 18, speed: 150, size: 3.4, colors: ['#8b5cf6', '#14a058', '#ffb400'] });
    showHint('정리 완료! ' + c.title + ' → ' + (c.dir === 'fwd' ? '정반응' : '역반응') + ' 쪽으로 이동해요.', 4200); fillCaseCtl(); updateCtl();
  });
  SciSim.pointer(view, {
    down(p) { if (S.mode === 'cases') { for (let i = 0; i < CASES.length; i++) if (inRect(p, cardRect(i))) { S.sel = i; Sound.click(); fillCaseCtl(); return false; } } return false; },
    hover(p) { if (S.mode === 'cases') for (let i = 0; i < CASES.length; i++) if (inRect(p, cardRect(i))) return 'pointer'; return 'default'; },
  });

  /* ---------- 제어 ---------- */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; if (mode === 'cases') fillCaseCtl(); updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0; if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate'); n.hidden = !on; });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#tChips button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === SD.T); b.classList.toggle('done', SD.rec[+b.dataset.v] != null); });
    $('#bCap').textContent = SD.open ? '🔒 뚜껑 닫기' : '🔓 뚜껑 열기';
    $$('#pChips button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === BL.P); b.classList.toggle('done', !!BL.seen[b.dataset.k]); });
    $('#pMinus').disabled = BL.P <= 10; $('#pPlus').disabled = BL.P >= 120;
    $('#bSep').textContent = HB.sep ? '❄️ 액화 분리 장치 끄기' : '❄️ 액화 분리 장치 켜기'; $('#bSep').classList.toggle('btn-primary', !HB.sep);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  [[5, '🧊 냉장고 5 °C'], [25, '🏠 실온 25 °C'], [35, '☀️ 뜨거운 곳 35 °C']].forEach(([v, s]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = s; b.dataset.v = v; b.addEventListener('click', () => { Sound.click(); SD.T = v; sodaFresh(); showHint(TNAME[v] + '에 보관한 새 병이에요. 닫힌 병은 평형 상태예요.', 3200); }); $('#tChips').appendChild(b); });
  $('#bCap').addEventListener('click', () => {
    Sound.click(); SD.open = !SD.open;
    if (SD.open) { SD.openT = 0; SD.cur = []; SD.hacc = 0; SD.recDone = false; SD.openInvalid = false; SD.openTemp = SD.T; SD.curves[SD.T] = SD.cur; SD.cap.target = 1; for (let i = 0; i < 14; i++) parts.emit({ x: sodaGeom().cx + rnd(-10, 10), y: sodaGeom().ntop, vx: rnd(-40, 40), vy: -rnd(60, 150), life: 0.8, size: rnd(2.5, 4.5), color: 'rgba(150,170,210,.8)', gravity: -10, drag: 1 }); }
    else SD.cap.target = 0;
    updateCtl();
  });
  $('#bNew').addEventListener('click', () => { Sound.click(); sodaFresh(); });
  [[100, '🫁 폐 100', 'lung'], [60, '⛰️ 높은 산 60', 'high'], [40, '💪 조직 40', 'tissue']].forEach(([v, s, k]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = s; b.dataset.v = v; b.dataset.k = k; b.addEventListener('click', () => { Sound.click(); setP(v); }); $('#pChips').appendChild(b); });
  $('#pRange').addEventListener('input', () => setP(+$('#pRange').value));
  $('#pMinus').addEventListener('click', () => { Sound.click(); setP(BL.P - 5); });
  $('#pPlus').addEventListener('click', () => { Sound.click(); setP(BL.P + 5); });
  $('#hT').addEventListener('input', () => { HB.T = +$('#hT').value; $('#oHT').textContent = HB.T + ' °C'; hbReset(); });
  $('#hP').addEventListener('input', () => { HB.P = +$('#hP').value; $('#oHP').textContent = HB.P + '기압'; hbReset(); });
  $('#bSep').addEventListener('click', () => { Sound.click(); HB.sep = !HB.sep; hbReset(); });
  $('#bHReset').addEventListener('click', () => { Sound.click(); hbReset(); });
  const SELD = [['', '고르세요'], ['fwd', '정반응 → (녹아 들어감)'], ['rev', '← 역반응 (기체로 나옴)']];
  ['sd1', 'sd2'].forEach((id) => { $('#' + id).innerHTML = SELD.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join(''); });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'soda') setReadouts(['보관 온도 · 뚜껑', SD.T + ' °C · ' + (SD.open ? '열림' : '닫힘'), '병 속 CO₂ (처음의 %)', Math.round(sdPct()) + ' %', '용해 / 방출 (개/초)', (KD * SD.g / U).toFixed(1) + ' / ' + (sdKe() * SD.a / U).toFixed(1)]);
    else if (S.mode === 'blood') setReadouts(['O₂ 분압', BL.P + ' mmHg', '결합한 Hb', satN(BL.P) + ' %', '이동 방향', BL.shown === satN(BL.P) ? '평형 (이동 끝)' : BL.dir > 0 ? '정반응 → (O₂ 결합)' : '← 역반응 (O₂ 방출)']);
    else if (S.mode === 'haber') setReadouts(['평형 NH₃ (부피 %)', hbX() + ' %', '처음 N₂ → NH₃', Math.round(HB.cumD * 100) + ' %', '속도 (상대)', '×' + rateOf(HB.T)]);
    else setReadouts(['고른 사례', CASES[S.sel].title, '정리한 카드', casesDone() + ' / 6', '관련 진로', S.cards[CASES[S.sel].id] ? CASES[S.sel].career : '정리하면 보여 줘요']);
  }
  /* ================= 미션 ================= */
  function remainAfter(Tc, sec) {                                // 같은 모형으로 계산한 '열고 sec초 뒤 남은 CO₂ (%)'
    const s = SOL[Tc], ke = KE0 / s; let a = TOT * 3 * s / (1 + 3 * s), g = TOT / (1 + 3 * s); const dt = 0.002;
    for (let t = 0; t < sec; t += dt) { const da = (KD * g - ke * a) * dt; a += da; g += -da - KOUT * g * dt; }
    return ((a + g) / TOT) * 100;
  }
  const rem = { 5: remainAfter(5, 4), 25: remainAfter(25, 4), 35: remainAfter(35, 4) };
  const r5 = (v) => Math.round(v / 5) * 5;
  const xi4 = hbXiFor(400, 200), xi3 = hbXiFor(400, 300);
  function hbXiFor(t, p) { return xiOf(NH3[t][p] / 100); }
  const cumN = (xi, n) => Math.round(100 * (1 - Math.pow(1 - xi, n)));
  const levels = [
    {
      title: '탄산음료: 뚜껑을 열면', short: '탄산음료', icon: '🍾', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 탄산음료가 따뜻하면 왜 더 많이 넘칠까? 공장은 어떻게 같은 원료로 더 많은 제품을 얻을까?</p>' +
        '<div class="si-link">🔗 <b>중학교 · 통합과학에서</b> 기체의 용해도는 온도가 낮을수록 크다고 배웠어요. 이번 차시에서는 앞에서 배운 <b>평형의 이동</b>으로 일상과 산업의 현상을 설명해요.</div>' +
        '<p>밀폐된 병 속에서는 CO₂(g) ⇌ CO₂(aq)가 평형이에요. 겉으로는 변화가 없어도 정반응(녹아 들어감)과 역반응(기체로 나옴)이 같은 속도로 계속 일어나요. 뚜껑을 열면 어떻게 될까요?</p>',
      features: ['soda'],
      setup() { S.gate = ''; setScene('soda'); sodaFresh(); },
      recap: '닫힌 병은 CO₂(g) ⇌ CO₂(aq)의 동적 평형이에요. 뚜껑을 열면 압력이 낮아져 기체 쪽(역반응)으로 이동해 기포가 나오고, 온도가 높을수록 기체의 용해도가 작아져 더 많이 빠져나와요.',
      summary: '<ul><li>CO₂(g) ⇌ CO₂(aq): 닫힌 병에서는 정반응과 역반응이 같은 속도로 일어나는 <b>동적 평형</b></li><li>뚜껑을 열면 압력↓ → 평형이 <b>기체 쪽(역반응)</b>으로 이동 → 기포 발생</li><li>온도가 높을수록 기체의 용해도가 작아서 같은 시간에 더 많은 CO₂가 빠져나가요 (이 모형에서 열고 4초 뒤 남은 CO₂: 5 °C 약 ' + r5(rem[5]) + ' %, 25 °C 약 ' + r5(rem[25]) + ' %, 35 °C 약 ' + r5(rem[35]) + ' %)</li><li>그래서 음료는 차갑게 보관하고 뚜껑은 열기 전에 흔들지 않아요.</li></ul>',
      missions: [
        {
          title: '뚜껑 열기와 온도 바꾸기',
          goal: '냉장고(5 °C)와 뜨거운 곳(35 °C)에서 각각 새 병의 뚜껑을 열고, 열린 뒤 4초 동안 CO₂가 얼마나 빠지는지 비교해요.',
          hint: '온도 단추를 누르면 그 온도의 새 병이 준비돼요. 🔓 뚜껑 열기를 누르고 4초 기다리면 오른쪽 표에 기록돼요. 다른 온도도 같은 방법으로 해요.',
          setup() { S.gate = ''; SD.rec = {}; SD.curves = {}; SD.T = 25; setScene('soda'); sodaFresh(); },
          check: () => SD.rec[5] != null && SD.rec[35] != null, hold: 0.5,
          status: () => mark(SD.rec[5] != null) + ' 5 °C ' + (SD.rec[5] != null ? SD.rec[5] + ' %' : '') + ' &nbsp; ' + mark(SD.rec[35] != null) + ' 35 °C ' + (SD.rec[35] != null ? SD.rec[35] + ' %' : ''),
          explain: '열고 4초 뒤 남은 CO₂는 5 °C에서 약 <b>' + r5(rem[5]) + ' %</b>, 35 °C에서 약 <b>' + r5(rem[35]) + ' %</b>예요(오른쪽 표의 값). 온도가 높을수록 기체의 용해도가 작아서 평형이 기체 쪽으로 더 치우쳐 기포가 빨리 많이 빠져나가요.',
        },
        {
          title: '평형 이동 방향 표시하기', manual: true,
          goal: 'CO₂(g) ⇌ CO₂(aq)에서 정반응은 녹아 들어가는 것, 역반응은 기체로 나오는 것이에요. 두 경우의 이동 방향을 골라 <b>✔ 확인하기</b>를 눌러요.',
          hint: '뚜껑을 열면 기포가 올라와요. 기포는 기체 CO₂이니 어느 쪽 반응일까요? 온도가 높을수록 기체의 용해도는 작아져요.',
          setup() { S.gate = 'sdir'; setScene('soda'); updateCtl(); },
          check() {
            const a = $('#sd1').value, b = $('#sd2').value;
            if (!a || !b) return '두 경우의 방향을 모두 골라요.';
            if (a !== 'rev') return '뚜껑을 열면 병 속 압력이 낮아져요. 압력이 낮아지면 기체 분자가 많아지는 쪽으로 이동해요. 기포는 기체 CO₂예요.';
            if (b !== 'rev') return '온도가 높을수록 CO₂가 덜 녹아 있어요. 기체로 나오는 쪽은 정반응일까요, 역반응일까요?';
            return true;
          },
          explain: '뚜껑을 열면 압력이 낮아져 <b>기체 쪽(역반응)</b>으로 이동하고, 온도를 높이면 기체의 용해도가 작아져 역시 <b>역반응</b>으로 이동해요. 그래서 따뜻한 음료에서 더 많은 거품이 나와요.',
        },
        {
          type: 'quiz', title: '차가운 음료는 왜 김이 덜 빠질까?',
          goal: '같은 시간 동안 차가운 탄산음료가 따뜻한 음료보다 CO₂가 덜 빠지는 까닭은?',
          setup() { S.gate = ''; updateCtl(); },
          choices: ['차가우면 기체가 더 빨리 날아가서 거품이 많이 생겨요', '온도가 낮을수록 CO₂의 용해도가 커서 더 많이 녹아 있고, 같은 시간에 덜 빠져나와요', '차가운 음료는 병 속 압력이 낮아서 CO₂가 안 빠져요', '온도는 CO₂의 용해와 관계가 없어요'],
          answer: 1,
          feedback: ['오히려 반대예요. 따뜻할수록 기체의 용해도가 작아져 거품이 많이 생겨요.', '', '병 속 압력은 따뜻할수록 커져요(기체 쪽 평형). 차가운 음료는 녹은 양이 많은 거예요.', '기체의 용해도는 온도에 크게 영향을 받아요. 모의 실험의 곡선을 비교해 보세요.'],
          explain: '기체의 용해도는 온도가 낮을수록 커요. 그래서 차가운 음료에는 CO₂가 더 많이 녹아 있고 평형이 용해된 쪽에 가까워서, 뚜껑을 열어도 같은 시간에 <b>덜 빠져나가요</b>(모형: 열고 4초 뒤 5 °C 약 ' + r5(rem[5]) + ' %, 35 °C 약 ' + r5(rem[35]) + ' % 남음).',
        },
      ],
    },
    {
      title: '산소 운반: 폐에서 조직으로', short: '산소 운반', icon: '🩸', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 압력(농도)이 달라지면 평형이 이동하는 것을 봤어요. 우리 몸에서도 같은 일이 일어나요: 혈액 속 <b>헤모글로빈(Hb)</b>이 산소를 운반해요.</div>' +
        '<p>Hb + O₂ ⇌ HbO₂예요. 폐포(산소 분압 약 100 mmHg)와 조직(약 40 mmHg)에서 O₂ 분압(산소의 농도에 해당)을 바꿔 가며 Hb 100개 중 산소와 결합한 비율을 읽어 봐요. 그림은 예시 곡선이에요.</p>',
      features: ['blood'],
      setup() { S.gate = ''; setScene('blood'); BL.seen = {}; bloodSyncHard(); setP(100, true); },
      recap: '산소가 많은 폐에서는 정반응으로 Hb의 약 98 %가 O₂와 결합하고, 산소가 적은 조직에서는 역반응으로 약 75 %만 남아 O₂를 내놓아요. 산소가 적은 높은 산에서는 결합 비율이 더 낮아져요.',
      summary: '<ul><li>Hb + O₂ ⇌ HbO₂: 산소 분압(농도)에 따라 평형이 이동해요</li><li><b>폐</b> P(O₂) ≈ 100 mmHg → 결합 비율 약 ' + satN(100) + ' % (정반응)</li><li><b>조직</b> P(O₂) ≈ 40 mmHg → 약 ' + satN(40) + ' % (역반응으로 O₂ 방출: ' + (satN(100) - satN(40)) + '개/100개가 내놓아요)</li><li><b>높은 산 위의 폐</b> P(O₂) ≈ 60 mmHg → 약 ' + satN(60) + ' %로 낮아져 몸이 적혈구를 늘려 적응해요</li></ul>',
      missions: [
        {
          title: '폐 · 높은 산 · 조직에서 결합 비율 읽기',
          goal: '산소 분압을 폐(100), 높은 산 위(60), 조직(40)에 맞추고 Hb 100개 중 O₂와 결합한 개수를 읽어요. 그림이 자리 잡을 때까지 기다려요.',
          hint: '장소 단추를 누르거나 슬라이더를 100, 60, 40 mmHg에 맞춰요. 격자의 빨간 공이 O₂와 결합한 Hb예요.',
          setup() { S.gate = ''; setScene('blood'); BL.seen = {}; setP(BL.P, false); updateCtl(); },
          check: () => !!(BL.seen.lung && BL.seen.tissue && BL.seen.high), hold: 0.5,
          status: () => mark(BL.seen.lung) + ' 폐 100 → ' + satN(100) + ' % &nbsp; ' + mark(BL.seen.high) + ' 높은 산 60 → ' + satN(60) + ' % &nbsp; ' + mark(BL.seen.tissue) + ' 조직 40 → ' + satN(40) + ' %',
          explain: '폐(100 mmHg)에서는 Hb 100개 중 <b>' + satN(100) + '개</b>, 높은 산 위(60 mmHg)에서는 <b>' + satN(60) + '개</b>, 조직(40 mmHg)에서는 <b>' + satN(40) + '개</b>가 결합해 있어요. 폐에서 조직으로 가면 ' + (satN(100) - satN(40)) + '개가 O₂를 내놓아요.',
        },
        {
          type: 'quiz', title: '조직에서 산소가 방출되는 까닭',
          goal: '혈액이 조직에 도착하면 HbO₂에서 O₂가 떨어져 나가는 까닭은?',
          setup() { S.gate = ''; updateCtl(); },
          choices: ['조직의 온도가 낮아서 O₂가 얼어붙기 때문이에요', '조직은 O₂ 분압(농도)이 낮아 Q가 K보다 커지고, 역반응이 일어나 HbO₂에서 O₂가 떨어져 나와요', 'Hb는 O₂를 영원히 붙잡고 있고, 조직이 알아서 가져가요', '조직에서는 정반응이 일어나기 때문이에요'],
          answer: 1,
          feedback: ['온도가 아니라 O₂ 분압(농도)이 달라서예요.', '', 'Hb + O₂ ⇌ HbO₂는 가역 반응이라 조건에 따라 O₂를 붙였다 내놓았다 해요.', '정반응이면 O₂가 더 결합해요. 조직에서는 O₂가 방출되니 역반응이에요.'],
          explain: 'Q = [HbO₂] ÷ ([Hb][O₂])에서 조직은 [O₂](분압)가 작아 Q &gt; K가 돼요. 그래서 <b>역반응</b>이 일어나 HbO₂ → Hb + O₂로 산소를 내놓아요(' + satN(100) + ' % → ' + satN(40) + ' %).',
        },
      ],
    },
    {
      title: '암모니아: 수득률을 높이는 공장', short: '암모니아', icon: '🏭', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 농도가 달라지면 평형이 이동하는 것을 확인했어요. 하버–보슈 공정은 N₂ + 3H₂ ⇌ 2NH₃(발열, 기체 4몰 → 2몰)의 평형 이동을 이용해 비료의 원료인 암모니아를 만들어요.</div>' +
        '<p>온도(200~500 °C)와 압력(100~300기압)을 바꾸며 평형에서의 NH₃ 부피 %를 표에서 읽고, 속도와의 균형을 생각해요. 마지막으로 액화 분리 장치를 켜서 생성된 NH₃를 계속 빼내 봐요.</p>',
      features: ['haber'],
      setup() { S.gate = ''; setScene('haber'); updateCtl(); },
      recap: '낮은 온도 · 높은 압력이 평형상 유리하지만, 낮은 온도는 너무 느려서 철 촉매와 약 400~500 °C, 200~300기압을 써요. 생성된 NH₃를 액화해 계속 빼내면 정반응이 계속 일어나 수득률이 올라가요.',
      summary: '<ul><li>N₂ + 3H₂ ⇌ 2NH₃ (발열, 기체 4몰 → 2몰): <b>낮은 온도 · 높은 압력</b>이 평형 수득률에 유리</li><li>평형 NH₃ 부피 %: 200 °C 300기압 ' + NH3[200][300] + ' %, 400 °C 200기압 ' + NH3[400][200] + ' %, 500 °C 100기압 ' + NH3[500][100] + ' % (대략 값)</li><li>낮은 온도는 반응이 너무 느려 <b>철 촉매 + 약 400~500 °C, 200~300기압</b>을 써요. 촉매는 속도만 높이고 수득률은 그대로예요.</li><li>생성된 NH₃를 <b>액화해 분리</b>하면(농도 감소 → Q &lt; K) 정반응이 계속되고, 남은 N₂ · H₂를 재순환해요 (400 °C · 200기압: 한 번 통과 N₂의 ' + cumN(xi4, 1) + ' % → 3번 순환 ' + cumN(xi4, 3) + ' %)</li></ul>',
      missions: [
        {
          title: '수득률 최대 조건과 분리 장치의 효과',
          goal: '① 표에서 평형 NH₃가 가장 많은 조건(온도 · 압력)을 찾고, ② 액화 분리 장치를 켜서 400 °C 이상 · 200기압 이상에서 ②번 막대(처음 N₂ 중 NH₃가 된 비율)를 <b>90 %</b> 이상 올려요.',
          hint: '① 슬라이더를 가장 낮은 온도, 가장 높은 압력에 맞춰요. ② 400 °C, 200기압에서 ❄️ 분리 장치를 켜고 순환이 3번쯤 돌 때까지 기다려요.',
          setup() { S.gate = ''; HB.flags = {}; HB.sep = false; HB.T = 400; HB.P = 200; $('#hT').value = 400; $('#hP').value = 200; $('#oHT').textContent = '400 °C'; $('#oHP').textContent = '200기압'; setScene('haber'); hbReset(); },
          check: () => !!(HB.flags.max && HB.flags.sep), hold: 0.4,
          status: () => mark(HB.flags.max) + ' 평형 NH₃ 최대 조건 (' + NH3[200][300] + ' %) &nbsp; ' + mark(HB.flags.sep) + ' 분리 장치로 90 % 이상 (지금 ' + Math.round(HB.cumD * 100) + ' %)',
          explain: '평형 NH₃가 가장 많은 조건은 <b>200 °C, 300기압(' + NH3[200][300] + ' %)</b>이에요(발열 반응은 온도가 낮을수록, 몰 수가 줄어드는 반응은 압력이 높을수록 정반응에 유리). 그러나 낮은 온도는 너무 느려서 실제로는 더 높은 온도를 써요. 액화 분리 장치로 NH₃를 계속 빼내면 400 °C · 200기압에서도 순환 3번 만에 N₂의 ' + cumN(xi4, 3) + ' %가 NH₃가 돼요(한 번 통과는 ' + cumN(xi4, 1) + ' %).',
        },
        {
          title: '실제 공장 조건을 택하는 이유 고르기', manual: true,
          goal: '평형상 유리한 조건(낮은 온도 · 높은 압력)과 달리 실제 공장이 약 400~500 °C, 200~300기압을 쓰는 이유를 <b>모두</b> 골라 ✔ 확인하기를 눌러요.',
          hint: '온도를 200 °C에서 500 °C로 바꾸면 속도 막대(③)가 어떻게 변하는지 보세요. 압력을 더 높이면 수득률은 올라가지만 …',
          setup() { S.gate = 'why'; ['w1', 'w2', 'w3', 'w4'].forEach((id) => { $('#' + id).checked = false; }); setScene('haber'); updateCtl(); },
          check() {
            const v = ['w1', 'w2', 'w3', 'w4'].map((id) => $('#' + id).checked);
            if (!v.some(Boolean)) return '맞다고 생각하는 이유를 골라요. (여러 개)';
            if (v[2]) return '온도가 높을수록 평형 수득률은 오히려 낮아져요(표에서 200 °C와 500 °C를 비교해 보세요).';
            if (v[3]) return '촉매는 평형에 빨리 도달하게 할 뿐, 평형 수득률은 바꾸지 못해요.';
            if (!v[0] || !v[1]) return '맞는 이유가 더 있어요. 속도와 설비(압력)를 생각해 보세요.';
            return true;
          },
          explain: '낮은 온도는 평형 수득률이 높지만 <b>반응이 너무 느려서</b>(상대 속도 200 °C ×1, 400 °C ×16) 철 촉매와 약 400~500 °C를 써요. 압력은 높을수록 수득률이 오르지만 <b>설비 비용과 안전 부담</b>이 커서 200~300기압을 써요. 촉매는 속도만 높일 뿐 평형 수득률은 바꾸지 않아요.',
        },
        {
          type: 'quiz', title: '생성된 NH₃를 계속 빼내는 까닭',
          goal: '액화 분리 장치로 생성된 NH₃를 계속 빼내면 수득률이 오르는 까닭은?',
          setup() { S.gate = ''; updateCtl(); },
          choices: ['NH₃가 줄면 K가 커지기 때문이에요', 'NH₃ 농도가 줄어 Q가 K보다 작아지므로, 줄어든 NH₃를 보충하는 정반응이 계속 일어나기 때문이에요', '촉매가 더 잘 작동하기 때문이에요', 'NH₃를 빼내면 역반응이 일어나기 때문이에요'],
          answer: 1,
          feedback: ['농도를 바꿔도 K는 변하지 않아요. K를 바꾸는 것은 온도예요.', '', '촉매는 속도만 바꿔요. 이동 방향은 Q와 K의 비교로 정해져요.', 'NH₃(생성물)가 줄면 Q가 작아져요. Q < K이면 정반응이에요.'],
          explain: 'Q = [NH₃]² ÷ ([N₂][H₂]³)에서 [NH₃]를 줄이면 Q &lt; K가 돼요. 그래서 <b>정반응</b>이 계속 일어나 NH₃가 새로 만들어지고, 남은 N₂ · H₂를 재순환하면 수득률이 계속 올라가요.',
        },
      ],
    },
    {
      title: '사례 조사와 진로', short: '사례 조사', icon: '🃏', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 음료, 혈액, 공장에서 평형 이동이 쓰이는 것을 봤어요. 이제 사례 카드 6장 중 2장을 골라 <b>반응식 → 바꾼 조건 → 이동 방향 → 활용</b>으로 정리하고 관련 진로를 알아봐요.</div>' +
        '<p>카드를 누르고 조작 패널에서 바꾼 조건과 이동 방향을 고른 뒤 ✔ 카드 정리하기를 눌러요. 정리하면 활용과 관련 진로가 나타나요.</p>',
      features: ['cases'],
      setup() { S.gate = ''; setScene('cases'); fillCaseCtl(); },
      recap: '평형 이동은 음료 포장, 몸속 산소 운반, 비료 공장, 동굴의 종유석까지 우리 주변 곳곳에 쓰여요. 바꾼 조건이 Q와 K를 어떻게 바꾸는지로 이동 방향을 설명해요.',
      summary: '<ul><li>접촉법 황산: 2SO₂ + O₂ ⇌ 2SO₃ (발열) — 약 450 °C, V₂O₅ 촉매, 상압</li><li>종유석: CaCO₃ + CO₂ + H₂O ⇌ Ca²⁺ + 2HCO₃⁻ — CO₂가 빠져나가면 역반응으로 CaCO₃ 석출</li><li>탄산음료: CO₂(g) ⇌ CO₂(aq) — 압력↑ · 온도↓로 많이 녹여 포장</li><li>하버–보슈: NH₃를 액화해 빼내 정반응 유지 · 헤모글로빈: 산소 분압에 따라 O₂ 결합과 방출 · 산소 캔: O₂ 분압↑ → 정반응</li><li>관련 진로: 화학 공학 기술자, 약학, 의학, 식품 연구, 환경 공학</li><li>촉매의 목적은 <b>수득률이 아니라 속도</b>(평형 도달 시간 단축)</li></ul>',
      missions: [
        {
          title: '사례 카드 2장 정리하기',
          goal: '카드 2장을 골라 <b>바꾼 조건</b>과 <b>이동 방향</b>을 맞게 고르고 ✔ 카드 정리하기를 눌러요.',
          hint: '반응식을 보고 어떤 물질의 농도(분압)나 온도가 바뀌었는지 생각해요. 줄어든 물질을 보충하는 쪽(Q < K이면 정반응, Q > K이면 역반응)으로 이동해요.',
          setup() { S.gate = ''; S.cards = {}; setScene('cases'); fillCaseCtl(); },
          check: () => casesDone() >= 2, hold: 0.5,
          status: () => mark(casesDone() >= 1) + ' 첫 번째 카드 &nbsp; ' + mark(casesDone() >= 2) + ' 두 번째 카드 (' + casesDone() + ' / 2)',
          explain: '정리한 카드마다 <b>바꾼 조건이 Q를 어떻게 바꾸는지</b>가 이동 방향을 정해요. 예) 조직에서 O₂ 분압↓ → Q &gt; K → 역반응, NH₃를 빼냄 → Q &lt; K → 정반응.',
        },
        {
          title: '이동 방향 설명 쓰기', manual: true,
          goal: '정리한 카드 중 하나를 골라 <b>바꾼 조건 → 이동 방향 → 까닭</b>을 한두 문장으로 쓰고 ✔ 확인하기를 눌러요. (이동 방향 낱말 정반응 또는 역반응을 넣어요)',
          hint: '예) 조직에서는 산소 분압이 낮아 Q가 K보다 커지므로 역반응이 일어나 HbO₂가 O₂를 내놓는다.',
          setup() { S.gate = 'write'; setScene('cases'); updateCtl(); },
          check() {
            const t = $('#wText').value.trim();
            if (t.length < 14) return '조금 더 자세히 써 봐요. (14글자 이상)';
            if (!/정반응|역반응/.test(t)) return '이동 방향을 나타내는 낱말(정반응 또는 역반응)을 넣어요.';
            return true;
          },
          explain: '좋은 설명은 <b>바꾼 조건 → Q 또는 K의 변화 → 이동 방향</b>의 순서로 이어져요. 이동 방향은 “변화를 줄이는 쪽”(르샤틀리에 원리)이에요.',
        },
        {
          type: 'quiz', title: '촉매를 쓰는 목적은?',
          goal: '하버–보슈 공정이나 접촉법 황산 제조에서 촉매를 쓰는 목적으로 옳은 것은?',
          setup() { S.gate = ''; updateCtl(); },
          choices: ['평형에서 생성물의 양(수득률)을 높이기 위해서예요', '정반응과 역반응 속도를 모두 높여 평형에 빨리 도달하게 하기 위해서예요', '평형 상수 K를 크게 하기 위해서예요', '반응열을 없애기 위해서예요'],
          answer: 1,
          feedback: ['촉매는 평형의 위치를 바꾸지 못해요. 수득률은 온도 · 압력 · 농도로 조절해요.', '', 'K는 온도만 바꿔요. 촉매는 K도 바꾸지 않아요.', '촉매는 열의 출입과 관계가 없어요.'],
          explain: '촉매는 정반응과 역반응의 속도를 <b>모두</b> 높여 평형에 빨리 도달하게 해요. 평형 상수 K와 평형 조성(수득률)은 그대로예요. 낮은 온도에서 느린 반응을 현실적인 시간 안에 끝내려고 쓰는 거예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-eq-life', mount: '#game', badge: '평형 응용가', homeHref: '../../index.html#hc',
    featureLabels: { soda: '🍾 탄산음료 병 · 용해/방출 속도', blood: '🩸 헤모글로빈 100개 · 분압 슬라이더', haber: '🏭 암모니아 공장 · 수득률 표', cases: '🃏 사례 카드 · 진로' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  $('#cv').style.touchAction = 'pan-y';
  sodaFresh(); bloodSyncHard(); setScene('soda');
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    if (S.mode === 'soda') stepSoda(dt); else if (S.mode === 'blood') stepBlood(dt); else if (S.mode === 'haber') stepHaber(dt);
    view.apply();
    ctx.fillStyle = BGC; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'soda') { drawSoda(); drawSodaRight(); } else if (S.mode === 'blood') drawBlood(); else if (S.mode === 'haber') drawHaber(); else drawCases();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(244,241,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, SD, BL, HB, CASES, NH3, VW, VH, sat, satN, rem, get game() { return game; },
    setScene, setP, sodaFresh, hbReset, fillCaseCtl, updateCtl, cardRect, remainAfter,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; if (S.mode === 'soda') stepSoda(0.02); else if (S.mode === 'blood') stepBlood(0.02); else if (S.mode === 'haber') stepHaber(0.02); parts.update(0.02); } },
  };

})();
