/* =========================================================
   중2 Ⅵ. 동물과 에너지 — 호흡계와 호흡 운동 [9과13-03]
   ① [관찰] 호흡 기관: 코 → 기관 → 기관지 → 폐(폐포)
   ② [모형] 호흡 운동 모형: 페트병 + 고무풍선 + 고무막
   ③ [설명] 들숨과 날숨: 갈비뼈·가로막 → 흉강 부피·압력 변화
   ④ [적용] 폐포의 기체 교환(확산)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const TAU = Math.PI * 2;
  const RM = !!SciSim.reduceMotion;
  const EASE = SciSim.ease;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const now = () => performance.now() / 1000;
  const rgba = SciSim.color.rgba, shade = SciSim.color.shade, mix = SciSim.color.mix;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const W = 800, H = 640, YOFF = 20, BG = '#eef4ef';
  let view = null, ctx = null, D = null;

  // 고정 시드 난수 (그림이 매번 같도록)
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- 그리기 도우미 ---------- */
  const font = (size, weight) => (weight || 700) + ' ' + size + 'px ' + FONT;
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function txt(s, x, y, o) {
    o = o || {};
    let size = o.size || 14;
    ctx.font = font(size, o.weight);
    if (o.max) {
      while (size > (o.min || 11) && ctx.measureText(s).width > o.max) { size -= 0.5; ctx.font = font(size, o.weight); }
    }
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    if (o.halo) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.halo; ctx.lineWidth = o.haloW || 4; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.color || '#1b2333';
    ctx.fillText(s, x, y);
    ctx.textBaseline = 'alphabetic';
  }
  function pill(s, x, y, o) {
    o = o || {};
    const size = o.size || 14, pad = o.pad != null ? o.pad : 10, h = o.h || size + 12;
    ctx.font = font(size, o.weight || 800);
    const w = ctx.measureText(s).width + pad * 2;
    let lx = x - w / 2;
    if (o.align === 'left') lx = x; else if (o.align === 'right') lx = x - w;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.shadow) { ctx.shadowColor = 'rgba(20,40,30,.22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
    rr(lx, y - h / 2, w, h, h / 2);
    ctx.fillStyle = o.bg || '#1b2333'; ctx.fill();
    ctx.restore();
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.border) { rr(lx, y - h / 2, w, h, h / 2); ctx.strokeStyle = o.border; ctx.lineWidth = o.borderW || 2; ctx.stroke(); }
    txt(s, lx + w / 2, y + 1, { size, weight: o.weight || 800, color: o.color || '#fff', align: 'center', base: 'middle' });
    ctx.restore();
    return { x: lx, y: y - h / 2, w, h };
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    ctx.save();
    ctx.shadowColor = 'rgba(30,60,40,.14)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    rr(x, y, w, h, o.r != null ? o.r : 16); ctx.fillStyle = o.bg || '#fff'; ctx.fill();
    ctx.restore();
    if (o.border) { rr(x, y, w, h, o.r != null ? o.r : 16); ctx.strokeStyle = o.border; ctx.lineWidth = o.bw || 1.5; ctx.stroke(); }
  }
  function lgrad(x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  function rgrad(x0, y0, r0, x1, y1, r1, stops) { const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; }
  /* 부드러운 곡선 (Catmull-Rom → 베지어). c는 ctx 또는 Path2D */
  function smooth(c, pts, closed) {
    const n = pts.length;
    c.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % n];
      const p0 = closed || i > 0 ? pts[(i - 1 + n) % n] : p1;
      const p3 = closed || i < n - 2 ? pts[(i + 2) % n] : p2;
      c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    if (closed) c.closePath();
  }
  // 반짝이는 구슬 (분자·혈구 등)
  function bead(x, y, r, color, o) {
    o = o || {};
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.shadowColor = 'rgba(20,30,40,.25)'; ctx.shadowBlur = o.noShadow ? 0 : r * 0.6; ctx.shadowOffsetY = o.noShadow ? 0 : r * 0.2;
    ctx.fillStyle = rgrad(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r, [[0, shade(color, 0.6)], [0.55, color], [1, shade(color, -0.28)]]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function ring(x, y, r, color, t) {
    const a = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save(); ctx.strokeStyle = rgba(color || '#16a34a', 0.35 + a * 0.5); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r + a * 3, 0, TAU); ctx.stroke(); ctx.restore();
  }
  function checkMark(x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - s * 0.45, y); ctx.lineTo(x - s * 0.1, y + s * 0.38); ctx.lineTo(x + s * 0.5, y - s * 0.35); ctx.stroke();
    ctx.restore();
  }
  function newBadge(x, y, t) {
    const a = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save(); ctx.fillStyle = '#16a34a'; rr(x, y, 50, 22, 11); ctx.fill();
    ctx.restore();
    txt('NEW', x + 25, y + 12, { size: 13, weight: 800, color: '#fff', align: 'center', base: 'middle' });
    return a;
  }
  const PFX = new SciSim.Particles();
  function burst(x, y, colors, n, o) { PFX.burst(x, y, Object.assign({ count: n || 18, colors: colors || ['#22c55e', '#facc15', '#38bdf8', '#f472b6'], speed: 150, gravity: 120, size: 4 }, o || {})); }
  const inR = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  const inC = (p, c, pad) => Math.hypot(p.x - c.x, p.y - c.y) <= c.r + (pad || 0);
  const shk = (v, t) => (v > 0.01 && !RM ? Math.sin(t * 60) * 7 * v : 0);   // 흔들림 (오답)

  /* 화면 안내 말풍선 */
  const HINT = { msg: '', t0: 0, tEnd: 0 };
  function showHint(msg, ms) { HINT.msg = msg; HINT.t0 = now(); HINT.tEnd = now() + (ms || 6000) / 1000; }
  function hideHint() { if (HINT.msg && HINT.tEnd > now()) HINT.tEnd = now(); }
  function drawHint() {
    if (!HINT.msg) return;
    const t = now();
    const a = Math.min(clamp((t - HINT.t0) / 0.35, 0, 1), clamp(1 - (t - HINT.tEnd) / 0.4, 0, 1));
    if (a <= 0.01) { if (t > HINT.tEnd + 0.5) HINT.msg = ''; return; }
    pill(HINT.msg, W / 2, H - 26 + (1 - a) * 12, { size: 15, bg: 'rgba(27,35,51,.92)', alpha: a, h: 32, pad: 14, shadow: true });
  }
  const mark = (ok) => (ok ? '✅' : '⬜');

  /* 줄 바꿈(띄어쓰기 기준) */
  function wrapLines(s, maxW, size) {
    ctx.font = font(size, 700);
    const out = []; let cur = '';
    const w = (q) => ctx.measureText(q).width;
    s.split(' ').forEach((tok) => {
      const test = cur ? cur + ' ' + tok : tok;
      if (w(test) <= maxW) { cur = test; return; }
      if (cur) { out.push(cur); cur = ''; }
      if (w(tok) <= maxW) { cur = tok; return; }
      for (const ch of tok) { if (w(cur + ch) > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; }
    });
    if (cur) out.push(cur);
    return out;
  }

  /* ---------- 경로(스플라인) 도우미 ---------- */
  function splineSample(keys, per) {
    const n = keys.length, out = []; let L = 0;
    for (let i = 0; i < n - 1; i++) {
      const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(n - 1, i + 2)];
      for (let s = 0; s < per; s++) {
        const u = s / per, u2 = u * u, u3 = u2 * u;
        const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3);
        const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3);
        if (out.length) { const q = out[out.length - 1]; L += Math.hypot(x - q[0], y - q[1]); }
        out.push([x, y, L]);
      }
    }
    const last = keys[n - 1], q = out[out.length - 1];
    L += Math.hypot(last[0] - q[0], last[1] - q[1]); out.push([last[0], last[1], L]);
    return out;
  }
  function atLen(poly, s) {
    const L = poly[poly.length - 1][2]; s = clamp(s, 0, L);
    let lo = 0, hi = poly.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (poly[m][2] <= s) lo = m; else hi = m; }
    const a = poly[lo], b = poly[hi], u = (s - a[2]) / ((b[2] - a[2]) || 1);
    return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  // 점 (x, y)에서 가장 가까운 경로 위의 길이 s (구간 [s0, s1] 안에서만 찾음)
  function nearestS(poly, x, y, s0, s1) {
    let best = s0, bd = 1e12;
    for (let i = 0; i < poly.length; i++) {
      const s = poly[i][2];
      if (s < s0 || s > s1) continue;
      const d = (poly[i][0] - x) * (poly[i][0] - x) + (poly[i][1] - y) * (poly[i][1] - y);
      if (d < bd) { bd = d; best = s; }
    }
    return { s: best, d: Math.sqrt(bd) };
  }
  function strokePoly(poly, from, to) {
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < poly.length; i++) {
      const s = poly[i][2];
      if (s < from || s > to) continue;
      if (!started) { const q = atLen(poly, from); ctx.moveTo(q.x, q.y); started = true; }
      ctx.lineTo(poly[i][0], poly[i][1]);
    }
    if (!started) return;
    const e = atLen(poly, to); ctx.lineTo(e.x, e.y);
  }

  /* ---------- 끌어다 놓는 카드 ---------- */
  class CardSet {
    constructor() { this.cards = []; this.targets = []; this.drag = null; this.enabled = true; this.hover = null; }
    setup(cards, targets) {
      this.cards = cards; this.targets = targets; this.drag = null; this.hover = null;
      cards.forEach((c) => { c.slot = null; c.x = c.hx; c.y = c.hy; c.lift = 0; c.shake = 0; c.mark = null; if (c.w == null) c.w = 110; if (c.h == null) c.h = 44; });
    }
    targetOf(c) { return c.slot ? this.targets.find((t) => t.id === c.slot) : null; }
    restPos(c) { const t = this.targetOf(c); return t ? { x: t.x + t.w / 2 - c.w / 2, y: t.y + t.h / 2 - c.h / 2 + (t.dy || 0) } : { x: c.hx, y: c.hy }; }
    snap(c, animate) {
      const r = this.restPos(c);
      if (animate) SciSim.tween(c, { x: r.x, y: r.y }, { duration: 0.45, ease: 'outBack' }); else { c.x = r.x; c.y = r.y; }
    }
    nearest(c) {
      let best = null, bd = 1e9; const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      this.targets.forEach((t) => {
        const r = t.hit || { x: t.x - 20, y: t.y - 20, w: t.w + 40, h: t.h + 40 };
        if (cx < r.x || cx > r.x + r.w || cy < r.y || cy > r.y + r.h) return;
        const d = Math.hypot(cx - (r.x + r.w / 2), cy - (r.y + r.h / 2));
        if (d < bd) { bd = d; best = t; }
      });
      return best;
    }
    at(p) {
      for (let i = this.cards.length - 1; i >= 0; i--) { const c = this.cards[i]; if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return c; }
      return null;
    }
    down(p) {
      if (!this.enabled) return false;
      const c = this.at(p); if (!c) return false;
      if (c.fixed) return false;
      this.drag = { c, ox: p.x - c.x, oy: p.y - c.y };
      if (c.tw) { c.tw.cancel && c.tw.cancel(); }
      c.slot = null; c.mark = null; if (this.onPick) this.onPick(c);
      const i = this.cards.indexOf(c); this.cards.splice(i, 1); this.cards.push(c);
      Sound.click(); return true;
    }
    move(p) {
      if (!this.drag) return;
      const d = this.drag, c = d.c;
      c.x = clamp(p.x - d.ox, 0, W - c.w); c.y = clamp(p.y - d.oy, 0, H - YOFF - c.h);
      this.hover = this.nearest(c);
    }
    up() {
      if (!this.drag) return null;
      const c = this.drag.c; this.drag = null;
      const t = this.nearest(c); this.hover = null;
      if (t) {
        const occ = this.cards.find((q) => q !== c && q.slot === t.id);
        if (occ) { occ.slot = null; this.snap(occ, true); }
        c.slot = t.id; Sound.tick();
        burst(t.x + t.w / 2, t.y + t.h / 2, ['#22c55e', '#facc15', '#ffffff'], 8, { speed: 90 });
      }
      this.snap(c, true);
      return t;
    }
    update(dt) {
      this.cards.forEach((c) => {
        c.lift = SciSim.approach(c.lift, this.drag && this.drag.c === c ? 1 : 0, dt, 14);
        c.shake = SciSim.approach(c.shake, 0, dt, 5);
      });
    }
    cursor(p) { return this.enabled && this.at(p) ? 'grab' : null; }
    draw(t, o) {
      o = o || {};
      if (o.targets !== false) {
        this.targets.forEach((tg) => {
          if (tg.hide) return;
          const filled = this.cards.some((c) => c.slot === tg.id);
          const hov = this.hover === tg;
          if (tg.draw) { tg.draw(tg, { hover: hov, filled, t }); return; }
          ctx.save();
          ctx.globalAlpha = filled && !hov ? 0.55 : 1;
          rr(tg.x, tg.y, tg.w, tg.h, tg.r != null ? tg.r : 12);
          ctx.fillStyle = hov ? 'rgba(34,197,94,.20)' : 'rgba(255,255,255,.55)'; ctx.fill();
          ctx.setLineDash(hov ? [] : [7, 6]); ctx.lineWidth = hov ? 3 : 2; ctx.strokeStyle = hov ? '#16a34a' : 'rgba(71,85,105,.55)'; ctx.stroke(); ctx.setLineDash([]);
          if (tg.label && !filled) txt(tg.label, tg.x + tg.w / 2, tg.y + tg.h / 2 + 1, { size: tg.size || 13, weight: 800, color: '#64748b', align: 'center', base: 'middle', max: tg.w - 12 });
          ctx.restore();
        });
      }
      this.cards.forEach((c) => this.drawCard(c, t));
    }
    drawCard(c, t) {
      const lift = c.lift, sc = 1 + 0.07 * lift, cx = c.x + c.w / 2 + shk(c.shake, t), cy = c.y + c.h / 2 - lift * 5;
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(sc, sc);
      ctx.shadowColor = 'rgba(20,40,30,' + (0.18 + 0.2 * lift).toFixed(2) + ')'; ctx.shadowBlur = 6 + lift * 14; ctx.shadowOffsetY = 2 + lift * 8;
      rr(-c.w / 2, -c.h / 2, c.w, c.h, 11); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.save(); rr(-c.w / 2, -c.h / 2, c.w, c.h, 11); ctx.clip();
      ctx.fillStyle = c.color || '#16a34a'; ctx.fillRect(-c.w / 2, -c.h / 2, 7, c.h);
      ctx.restore();
      rr(-c.w / 2, -c.h / 2, c.w, c.h, 11);
      ctx.lineWidth = c.mark ? 3.5 : 2; ctx.strokeStyle = c.mark === 'bad' ? '#ef4444' : c.mark === 'ok' ? '#16a34a' : 'rgba(71,85,105,.45)'; ctx.stroke();
      const hasSub = !!c.sub;
      if (c.dot) { ctx.fillStyle = c.dot; ctx.beginPath(); ctx.arc(-c.w / 2 + 19, hasSub ? -c.h / 2 + 15 : 0, 6, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; ctx.stroke(); }
      const tx0 = c.dot ? 8 : 4;
      if (c.lines) {
        c.lines.forEach((ln, i) => txt(ln, tx0 + 3, (i - (c.lines.length - 1) / 2) * (c.fs || 14) * 1.25 + 1, { size: c.fs || 14, weight: 700, color: '#1b2333', align: 'center', base: 'middle', max: c.w - 26 }));
      } else {
        txt(c.label, tx0 + 3, hasSub ? -5 : 1, { size: c.fs || 15, weight: 800, color: '#1b2333', align: 'center', base: 'middle', max: c.w - 26 - (c.dot ? 10 : 0) });
        if (hasSub) txt(c.sub, tx0 + 3, 12, { size: 11.5, weight: 700, color: '#64748b', align: 'center', base: 'middle', max: c.w - 26 });
      }
      ctx.restore();
    }
  }

  /* =========================================================
     색 · 공통 상수
     ========================================================= */
  const AIR = '#7dd3fc', AIR_D = '#0ea5e9', OUTAIR = '#f5c27a';
  const LUNG = '#f6a9bb', LUNG_D = '#d9748f', LUNG_L = '#fbd3dc';
  const SKIN = '#ffe0c4', SKIN_D = '#e7b896';
  const O2C = '#38bdf8', CO2C = '#6b7280';
  const BLUE = '#3f6fd8', RED = '#e5383b';
  // 호흡 한 번의 리듬 (0 → 1 들숨, 1 → 0 날숨)
  function breathCurve(t, inT, exT, restT) {
    const cyc = inT + exT + restT;
    const u = ((t % cyc) + cyc) % cyc;
    if (u < inT) return { b: EASE.inOutCubic(u / inT), dir: 1, u, n: Math.floor(t / cyc) };
    if (u < inT + exT) return { b: 1 - EASE.inOutCubic((u - inT) / exT), dir: -1, u, n: Math.floor(t / cyc) };
    return { b: 0, dir: 0, u, n: Math.floor(t / cyc) };
  }

  /* =========================================================
     장면 ① 호흡 기관: 코 → 기관 → 기관지 → 폐(폐포)
     ========================================================= */
  const AX = 240;                                       // 몸 그림 가운데 x
  const mxa = (p) => [2 * AX - p[0], p[1]];
  const TRUNK = [[196, 150], [236, 134], [240, 112], [252, 140], [242, 176], [240, 215], [240, 296]];
  const BR_L = [[240, 296], [220, 318], [198, 340]];
  const BRANCH_L = [
    [[198, 340], [172, 366], [146, 398]],
    [[198, 340], [206, 386], [196, 438]],
    [[198, 340], [166, 336], [126, 346]],
  ];
  const AW_PATHS = [];
  BRANCH_L.forEach((b) => { AW_PATHS.push(splineSample(TRUNK.concat(BR_L.slice(1), b.slice(1)), 8)); AW_PATHS.push(splineSample(TRUNK.concat(BR_L.slice(1).map(mxa), b.slice(1).map(mxa)), 8)); });
  const AW_ENDS = AW_PATHS.map((p) => p[p.length - 1]);
  const SEG_S = (function () {             // 경로 안에서 각 기관이 끝나는 길이 (코/기관/기관지)
    const p = AW_PATHS[0];
    const sAt = (pt) => { let b = 0, bd = 1e9; p.forEach((q) => { const d = Math.hypot(q[0] - pt[0], q[1] - pt[1]); if (d < bd) { bd = d; b = q[2]; } }); return b; };
    return { nose: sAt(TRUNK[4]), trachea: sAt(TRUNK[6]), bronchi: sAt(BRANCH_L[0][0]) };
  })();
  const AW = {
    on: false, t: 0, breaths: 0, lastN: -1, reached: 0, b: 0, dir: 0, dots: [], frontS: 0, front: { nose: 0, trachea: 0, bronchi: 0, alveoli: 0 },
    alv: AW_ENDS.map(() => 0), cards: new CardSet(), cardsOn: false, flag: {}, spawn: 0, rest: 0,
  };
  function initAirway() {
    AW.dots = []; AW.reached = 0; AW.breaths = 0; AW.t = 0; AW.on = false; AW.front = { nose: 0, trachea: 0, bronchi: 0, alveoli: 0 };
    const cs = [['trachea', '기관'], ['lung', '폐'], ['nose', '코'], ['bronchi', '기관지']].map((a, i) => ({ id: a[0], label: a[1], hx: 562 + (i % 2) * 112, hy: 150 + Math.floor(i / 2) * 58, w: 102, h: 44, color: '#0ea5e9', fs: 17 }));
    const T = { nose: [434, 126], trachea: [434, 226], bronchi: [434, 322], lung: [434, 422] };
    const tg = Object.keys(T).map((k) => ({ id: k, x: T[k][0], y: T[k][1] - 20, w: 104, h: 40, r: 14 }));
    AW.cards.setup(cs, tg);
    AW.flag = {};
    syncAirwayUI();
  }
  function syncAirwayUI() { const b = $('#btnBreath'); if (b) b.innerHTML = AW.on ? '⏸ 숨 쉬기 멈추기' : '💨 숨 쉬기 시작'; }
  const AW_T = { inT: 2.0, exT: 2.4, restT: 0.5 };
  function updateAirway(dt, t) {
    AW.cards.update(dt);
    if (AW.on) AW.t += dt;
    const c = breathCurve(AW.t, AW_T.inT, AW_T.exT, AW_T.restT);
    AW.b = SciSim.approach(AW.b, AW.on ? c.b : 0, dt, 18);
    AW.dir = AW.on ? c.dir : 0;
    if (AW.on && c.n !== AW.lastN) {
      AW.lastN = c.n; AW.reached = 0;
    }
    // 공기 입자: 들숨은 코 → 폐포, 날숨은 폐포 → 코
    if (AW.on && AW.dir !== 0) {
      AW.spawn += dt * 11;
      while (AW.spawn >= 1) {
        AW.spawn -= 1;
        const pi = Math.floor(Math.random() * AW_PATHS.length), L = AW_PATHS[pi][AW_PATHS[pi].length - 1][2];
        AW.dots.push({ p: pi, s: AW.dir > 0 ? 0 : L, dir: AW.dir, off: (Math.random() - 0.5) * 2, v: 280 + Math.random() * 60 });
      }
    }
    const fr = AW.front;
    for (let i = AW.dots.length - 1; i >= 0; i--) {
      const d = AW.dots[i], L = AW_PATHS[d.p][AW_PATHS[d.p].length - 1][2];
      d.s += d.dir * d.v * dt;
      if (d.dir > 0) {
        if (d.s > SEG_S.nose) fr.nose = now(); if (d.s > SEG_S.trachea) fr.trachea = now(); if (d.s > SEG_S.bronchi) fr.bronchi = now();
        if (d.s >= L) { AW.alv[d.p] = 1; AW.reached++; if (AW.reached === 3) { AW.breaths++; Sound.tone(440, 0.08, 'sine', 0.05); } fr.alveoli = now(); AW.dots.splice(i, 1); continue; }
      } else if (d.s <= 0) { AW.dots.splice(i, 1); continue; }
    }
    for (let i = 0; i < AW.alv.length; i++) AW.alv[i] = SciSim.approach(AW.alv[i], 0, dt, 2.2);
  }
  function lungShape(sc, left) {
    // 폐 한 쪽 (왼쪽 그림 기준, 안쪽이 x=AX)
    const pts = left
      ? [[216, 262], [182, 270], [140, 300], [118, 360], [120, 430], [150, 470], [206, 478], [232, 462], [234, 400], [226, 320]]
      : [[264, 262], [298, 270], [340, 300], [362, 360], [360, 430], [330, 470], [276, 478], [254, 470], [254, 410], [254, 320]];
    return pts.map((p) => [AX + (p[0] - AX) * sc, 372 + (p[1] - 372) * (0.6 + 0.4 * sc)]);
  }
  function drawBodyAir(t) {
    const sc = 1 + 0.11 * AW.b;
    // 몸통
    ctx.save();
    ctx.shadowColor = 'rgba(30,60,40,.12)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = lgrad(0, 190, 0, 550, [[0, '#d7efe6'], [1, '#bfe0d4']]);
    ctx.beginPath(); smooth(ctx, [[160, 208], [110, 224], [78, 270], [74, 380], [92, 500], [130, 548], [AX, 556], [350, 548], [388, 500], [406, 380], [402, 270], [370, 224], [320, 208], [AX, 196]], true); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#8fb8a8'; ctx.lineWidth = 3; ctx.beginPath(); smooth(ctx, [[160, 208], [110, 224], [78, 270], [74, 380], [92, 500], [130, 548], [AX, 556], [350, 548], [388, 500], [406, 380], [402, 270], [370, 224], [320, 208], [AX, 196]], true); ctx.stroke();
    // 목
    ctx.fillStyle = SKIN; rr(AX - 26, 156, 52, 62, 10); ctx.fill(); ctx.strokeStyle = SKIN_D; ctx.lineWidth = 2.5; ctx.stroke();
    // 머리
    ctx.save();
    ctx.shadowColor = 'rgba(80,50,30,.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillStyle = rgrad(AX - 16, 78, 8, AX, 100, 70, [[0, '#fff0de'], [1, SKIN]]);
    ctx.beginPath(); ctx.ellipse(AX, 100, 60, 68, 0, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = SKIN_D; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(AX, 100, 60, 68, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#5b3a29'; ctx.beginPath(); ctx.ellipse(AX, 62, 62, 34, 0, Math.PI, TAU); ctx.fill();
    // 얼굴
    ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.ellipse(AX - 22, 78, 4.5, 6, 0, 0, TAU); ctx.ellipse(AX + 22, 78, 4.5, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,120,.28)'; ctx.beginPath(); ctx.ellipse(AX - 36, 100, 9, 6, 0, 0, TAU); ctx.ellipse(AX + 36, 100, 9, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c0713f'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(AX, 128, 16, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
    // 코 안쪽 공기길 (투시)
    ctx.save(); ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(190,230,250,.85)'; ctx.strokeStyle = 'rgba(14,165,233,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); smooth(ctx, [[AX - 12, 130], [AX - 16, 108], [AX - 8, 92], [AX + 6, 94], [AX + 14, 112], [AX + 18, 140], [AX + 6, 168], [AX - 8, 170]], true); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#c0713f'; ctx.beginPath(); ctx.ellipse(AX - 8, 133, 3.2, 2.2, 0, 0, TAU); ctx.ellipse(AX + 8, 133, 3.2, 2.2, 0, 0, TAU); ctx.fill();
    // 기관 (연골 고리)
    ctx.save();
    ctx.lineCap = 'round';
    strokePoly(AW_PATHS[0], SEG_S.nose, SEG_S.trachea);
    ctx.strokeStyle = '#7aa7c4'; ctx.lineWidth = 24; ctx.stroke();
    strokePoly(AW_PATHS[0], SEG_S.nose, SEG_S.trachea);
    ctx.strokeStyle = '#d6efff'; ctx.lineWidth = 17; ctx.stroke();
    for (let y = 186; y < 296; y += 11) { ctx.strokeStyle = 'rgba(90,130,160,.65)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(AX - 10, y); ctx.lineTo(AX + 10, y); ctx.stroke(); }
    ctx.restore();
    // 폐
    [true, false].forEach((left) => {
      const pts = lungShape(sc, left);
      ctx.save();
      ctx.shadowColor = 'rgba(150,50,80,.2)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
      ctx.fillStyle = rgrad(left ? 170 : 310, 340, 10, left ? 170 : 310, 380, 130, [[0, LUNG_L], [0.7, LUNG], [1, LUNG_D]]);
      ctx.beginPath(); smooth(ctx, pts, true); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = LUNG_D; ctx.lineWidth = 2.5; ctx.beginPath(); smooth(ctx, pts, true); ctx.stroke();
    });
    // 기관지 가지
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    AW_PATHS.forEach((p, i) => {
      strokePoly(p, SEG_S.trachea - 4, p[p.length - 1][2] - 8);
      ctx.strokeStyle = '#7aa7c4'; ctx.lineWidth = i < 2 ? 15 : 9; ctx.stroke();
    });
    AW_PATHS.forEach((p, i) => {
      strokePoly(p, SEG_S.trachea - 4, p[p.length - 1][2] - 8);
      ctx.strokeStyle = '#d6efff'; ctx.lineWidth = i < 2 ? 10 : 5; ctx.stroke();
    });
    ctx.restore();
    // 폐포 송이
    AW_ENDS.forEach((e, i) => {
      const a = AW.alv[i], r = 7 + a * 3.5;
      const ang = Math.atan2(e[1] - 360, e[0] - AX);
      for (let k = 0; k < 6; k++) {
        const aa = ang + (k - 2.5) * 0.55, rr2 = 12 + (k % 2) * 4;
        const x = e[0] + Math.cos(aa) * rr2 * 0.9, y = e[1] + Math.sin(aa) * rr2 * 0.9;
        ctx.fillStyle = mix('#ffd6e0', AIR, a * 0.8); ctx.beginPath(); ctx.arc(x, y, r * (0.8 + 0.2 * (k % 3) / 2), 0, TAU); ctx.fill();
        ctx.strokeStyle = LUNG_D; ctx.lineWidth = 1.6; ctx.stroke();
      }
    });
    // 공기 입자
    AW.dots.forEach((d) => {
      const q = atLen(AW_PATHS[d.p], d.s);
      const nx = -Math.sin(q.a), ny = Math.cos(q.a);
      const w = d.s > SEG_S.trachea ? 2 : 4;
      bead(q.x + nx * d.off * w, q.y + ny * d.off * w, 3.6, d.dir > 0 ? AIR : OUTAIR, { noShadow: true });
    });
    // 숨 방향 화살표 (코 앞)
    if (AW.dir !== 0) {
      const a = 0.6 + 0.4 * Math.sin(t * 8);
      ctx.save(); ctx.globalAlpha = a;
      D.arrow(AW.dir > 0 ? 150 : 205, AW.dir > 0 ? 175 : 150, AW.dir > 0 ? 200 : 150, AW.dir > 0 ? 142 : 172, { color: AW.dir > 0 ? AIR_D : '#d97706', width: 5 });
      ctx.restore();
      pill(AW.dir > 0 ? '들숨' : '날숨', 128, 160, { size: 15, bg: AW.dir > 0 ? AIR_D : '#d97706', h: 28, pad: 12 });
    }
  }
  const AW_STEPS = [['코', 'nose'], ['기관', 'trachea'], ['기관지', 'bronchi'], ['폐(폐포)', 'alveoli']];
  function drawAirwayPanel(t) {
    const x = 520, y = 40, w = 270, h = 340;
    if (AW.cardsOn) {
      txt('🏷️ 이름표를 알맞은 곳에 놓아요', 562, 134, { size: 14, weight: 800, color: '#15803d' });
      // 연결선과 대상 칸
      const anchor = { nose: [AX + 10, 134], trachea: [AX + 14, 240], bronchi: [AX + 70, 326], lung: [AX + 100, 420] };
      AW.cards.targets.forEach((tg) => {
        const a = anchor[tg.id];
        ctx.save(); ctx.strokeStyle = 'rgba(21,128,61,.55)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(tg.x, tg.y + tg.h / 2); ctx.lineTo(a[0], a[1]); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(a[0], a[1], 5, 0, TAU); ctx.fill();
        ctx.restore();
      });
      return;
    }
    panel(x, y, w, h, { r: 18 });
    txt('공기가 지나가는 길', x + 16, y + 30, { size: 15, weight: 800, color: '#64748b' });
    AW_STEPS.forEach((s, i) => {
      const yy = y + 70 + i * 62, lit = now() - AW.front[s[1]] < 1.1;
      const act = lit ? 1 : 0;
      ctx.save();
      rr(x + 16, yy - 22, w - 32, 46, 14);
      ctx.fillStyle = act ? '#e0f2fe' : '#f1f5f9'; ctx.fill();
      ctx.lineWidth = act ? 3 : 1.5; ctx.strokeStyle = act ? AIR_D : '#cbd5e1'; ctx.stroke();
      ctx.restore();
      txt(String(i + 1), x + 40, yy + 1, { size: 19, weight: 800, color: act ? AIR_D : '#94a3b8', align: 'center', base: 'middle' });
      txt(s[0], x + 66, yy + 1, { size: 19, weight: 800, color: act ? '#0369a1' : '#475569', base: 'middle' });
      if (i < 3) { ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(x + w / 2 - 6, yy + 28); ctx.lineTo(x + w / 2 + 6, yy + 28); ctx.lineTo(x + w / 2, yy + 36); ctx.closePath(); ctx.fill(); }
    });
    txt('들이쉰 공기는 이 길을 지나 폐포까지 가요.', x + 16, y + 328, { size: 12.5, weight: 700, color: '#64748b', max: w - 24 });
  }
  function drawAirway(t) {
    drawBodyAir(t);
    drawAirwayPanel(t);
    if (AW.cardsOn) AW.cards.draw(t);
    if (!AW.on && AW.breaths === 0 && !AW.cardsOn) pill('👆 “숨 쉬기 시작”을 눌러요', 240, 590, { size: 14, bg: '#16a34a', h: 28, pad: 12 });
  }
  const airwayHandlers = {
    down(p) { return AW.cardsOn && AW.cards.down(p); },
    move(p) { AW.cards.move(p); },
    up() { AW.cards.up(); },
    hover(p) { return AW.cardsOn ? AW.cards.cursor(p) : null; },
  };

  /* =========================================================
     장면 ② 호흡 운동 모형: 페트병 + 고무풍선 + 고무막
     ========================================================= */
  const MX = 262, MY0 = 430;                          // 모형 가운데 x, 고무막 기본 높이
  const MD = {
    d: 0, spr: new SciSim.Spring(0, { stiffness: 140, damping: 8.5 }), drag: false, lock: false, b: 0, P: 1, db: 0,
    dots: [], stage: 0, maxPull: 0, hintShown: false, cards: new CardSet(), cardsOn: false, flag: {}, pulledOnce: false,
  };
  const sheetY = (x, d) => { const u = clamp((x - (MX - 100)) / 200, 0, 1); return MY0 + 248 * d * u * (1 - u); };
  // 병 어깨(곡선 유리벽)의 실제 높이 — 기체 입자가 유리 밖으로 나가지 않도록 같은 곡선을 써요
  const SHOULDER = (function () {
    const P = [[18, 150], [18, 172], [100, 168], [100, 205]], out = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      out.push([a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]]);
    }
    return out;
  })();
  const botTop = (x) => {
    const dx = clamp(Math.abs(x - MX), 18, 100);
    for (let i = 1; i < SHOULDER.length; i++) {
      if (SHOULDER[i][0] >= dx) { const a = SHOULDER[i - 1], b = SHOULDER[i], u = (dx - a[0]) / ((b[0] - a[0]) || 1); return lerp(a[1], b[1], clamp(u, 0, 1)); }
    }
    return 205;
  };
  function initModel() {
    const R = rng(33);
    MD.dots = [];
    for (let i = 0; i < 34; i++) { const a = R() * TAU, sp = 30 + R() * 30; MD.dots.push({ x: MX - 80 + R() * 160, y: 250 + R() * 150, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }); }
    MD.d = 0; MD.spr.value = 0; MD.spr.target = 0; MD.spr.velocity = 0; MD.b = 0; MD.lock = false; MD.drag = false; MD.stage = 0; MD.maxPull = 0; MD.pulledOnce = false;
    const cs = [['sheet', '가로막'], ['bottle', '흉강'], ['tube', '기관·기관지'], ['balloon', '폐']].map((a, i) => ({ id: a[0], label: a[1], hx: 20 + i * 128, hy: 560, w: 114, h: 40, color: '#16a34a', fs: 15.5 }));
    const tg = [['tube', '고무막', 0, 0]].length ? [
      { id: 'tube', name: 'Y자 관', x: 12, y: 58, leader: [MX - 12, 98] },
      { id: 'balloon', name: '고무풍선', x: 12, y: 226, leader: [MX - 40, 250] },
      { id: 'bottle', name: '페트병', x: 398, y: 230, leader: [MX + 100, 300] },
      { id: 'sheet', name: '고무막', x: 398, y: 420, leader: [MX + 60, 448] },
    ].map((q) => ({ id: q.id, nm: q.name, leader: q.leader, x: q.x, y: q.y, w: 128, h: 72, dy: 12, r: 14,
      draw(tt, st) {
        ctx.save();
        rr(tt.x, tt.y, tt.w, tt.h, 14);
        ctx.fillStyle = st.hover ? 'rgba(34,197,94,.20)' : 'rgba(255,255,255,.75)'; ctx.fill();
        ctx.setLineDash(st.hover ? [] : [7, 6]); ctx.lineWidth = st.hover ? 3 : 2; ctx.strokeStyle = st.hover ? '#16a34a' : 'rgba(71,85,105,.55)'; ctx.stroke(); ctx.setLineDash([]);
        txt('모형: ' + tt.nm, tt.x + tt.w / 2, tt.y + 17, { size: 14, weight: 800, color: '#0f766e', align: 'center', base: 'middle' });
        ctx.strokeStyle = 'rgba(21,128,61,.5)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(tt.x + (tt.x < 200 ? tt.w : 0), tt.y + tt.h / 2); ctx.lineTo(tt.leader[0], tt.leader[1]); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(tt.leader[0], tt.leader[1], 4.5, 0, TAU); ctx.fill();
        ctx.restore();
      } })) : [];
    MD.cards.setup(cs, tg);
    MD.flag = {};
    syncModelUI();
  }
  function syncModelUI() { const b = $('#btnPull'); if (b) b.innerHTML = MD.lock ? '✋ 고무막 놓기' : '👇 고무막 당기기'; }
  const gapV = () => 1 + 0.6 * MD.d - 0.6 * MD.b;
  function updateModel(dt, t) {
    MD.cards.update(dt);
    if (!MD.drag) { MD.spr.target = MD.lock ? 1 : 0; MD.spr.update(dt); MD.d = MD.spr.value; }
    else { MD.spr.value = MD.d; MD.spr.velocity = 0; }
    // 병 속 압력과 풍선 부피
    const P = 1 / Math.max(0.35, gapV());
    const old = MD.b;
    MD.b = clamp(MD.b + 3.2 * (1 - P) * dt, 0, 1);
    MD.P = 1 / Math.max(0.35, gapV());
    if (MD.P < 0.95) MD.lowT = now();
    MD.db = SciSim.approach(MD.db, (MD.b - old) / Math.max(dt, 1e-3), dt, 12);
    MD.maxPull = Math.max(MD.maxPull, MD.b);
    if (MD.stage === 0 && MD.b >= 0.85) MD.stage = 1;
    else if (MD.stage === 1 && MD.b <= 0.2) { MD.stage = 2; Sound.tone(560, 0.1, 'triangle', 0.07); }
    if (MD.d > 0.3) MD.pulledOnce = true;
    // 기체 입자
    const rb = 17 + 25 * MD.b, bcy = 208 + rb * 1.12, bxs = [MX - 44, MX + 44];
    MD.dots.forEach((q) => {
      q.x += q.vx * dt; q.y += q.vy * dt;
      const sy = sheetY(q.x, MD.d) - 6, ty = botTop(q.x) + 6;
      if (q.x < MX - 94) { q.x = MX - 94; q.vx = Math.abs(q.vx); } else if (q.x > MX + 94) { q.x = MX + 94; q.vx = -Math.abs(q.vx); }
      if (q.y > sy) { q.y = sy; q.vy = -Math.abs(q.vy); } else if (q.y < ty) { q.y = ty; q.vy = Math.abs(q.vy); }
      bxs.forEach((bx) => {
        const dx = q.x - bx, dy = (q.y - bcy) / 1.12, dd = Math.hypot(dx, dy);
        if (dd < rb + 5) { const nx = dx / (dd || 1), ny = dy / (dd || 1); q.x = bx + nx * (rb + 5); q.y = bcy + ny * (rb + 5) * 1.12; const dot = q.vx * nx + q.vy * ny; if (dot < 0) { q.vx -= 2 * dot * nx; q.vy -= 2 * dot * ny; } }
      });
      if (q.y > sy - 0.5 || q.y < ty + 0.5) { /* 반사 이후 */ }
    });
  }
  function bottlePath() {
    ctx.beginPath();
    ctx.moveTo(MX - 18, 124); ctx.lineTo(MX - 18, 150);
    ctx.bezierCurveTo(MX - 18, 172, MX - 100, 168, MX - 100, 205);
    ctx.lineTo(MX - 100, MY0); ctx.lineTo(MX + 100, MY0); ctx.lineTo(MX + 100, 205);
    ctx.bezierCurveTo(MX + 100, 168, MX + 18, 172, MX + 18, 150); ctx.lineTo(MX + 18, 124);
  }
  function drawBalloon(cx, cy, r, t) {
    ctx.save();
    ctx.shadowColor = 'rgba(190,60,100,.25)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = rgrad(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.15, [[0, '#ffe3ea'], [0.5, '#f6a3b8'], [1, '#d9708c']]);
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.92, r * 1.12, 0, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy - r * 0.45, r * 0.16, r * 0.26, -0.5, 0, TAU); ctx.fill();
  }
  function drawModel(t) {
    const d = MD.d, rb = 17 + 25 * MD.b, bcy = 208 + rb * 1.12;
    // 그림자
    ctx.fillStyle = 'rgba(40,60,50,.12)'; ctx.beginPath(); ctx.ellipse(MX, 548, 130, 10, 0, 0, TAU); ctx.fill();
    // 병 뒤쪽 유리
    ctx.save(); bottlePath(); ctx.lineTo(MX + 18, 124); ctx.fillStyle = 'rgba(215,238,248,.55)'; ctx.fill(); ctx.restore();
    // 병 속 기체 입자 (압력 표현)
    MD.dots.forEach((q) => { ctx.fillStyle = 'rgba(100,116,139,.8)'; ctx.beginPath(); ctx.arc(q.x, q.y, 3.4, 0, TAU); ctx.fill(); });
    // Y자 관
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const tube = (w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(MX, 74); ctx.lineTo(MX, 160); ctx.moveTo(MX, 160); ctx.lineTo(MX - 44, 208); ctx.moveTo(MX, 160); ctx.lineTo(MX + 44, 208); ctx.stroke(); };
    tube(12, '#6b8fa8'); tube(7, '#dff1fb');
    ctx.restore();
    // 풍선
    [MX - 44, MX + 44].forEach((bx) => drawBalloon(bx, bcy, rb, t));
    // 마개
    ctx.fillStyle = lgrad(MX - 24, 0, MX + 24, 0, [[0, '#6b7280'], [0.5, '#9ca3af'], [1, '#4b5563']]); rr(MX - 24, 112, 48, 26, 5); ctx.fill();
    // 병 앞쪽 테두리와 반사
    ctx.save();
    bottlePath(); ctx.strokeStyle = 'rgba(80,120,145,.95)'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; rr(MX - 90, 215, 8, 190, 4); ctx.fill();
    ctx.restore();
    // 병 입구 (뚜껑 위 공기)
    // 고무막
    ctx.save();
    const yc = MY0 + 124 * d;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(MX - 100, MY0); ctx.quadraticCurveTo(MX, yc, MX + 100, MY0);
    ctx.strokeStyle = '#8a4b2a'; ctx.lineWidth = 11; ctx.stroke();
    ctx.strokeStyle = lgrad(MX - 100, 0, MX + 100, 0, [[0, '#e0a070'], [0.5, '#f1c298'], [1, '#d6925f']]); ctx.lineWidth = 7; ctx.stroke();
    // 병 가장자리 테이프
    ctx.fillStyle = '#475569'; rr(MX - 108, MY0 - 6, 16, 12, 4); ctx.fill(); rr(MX + 92, MY0 - 6, 16, 12, 4); ctx.fill();
    ctx.restore();
    // 손잡이(손가락으로 당기는 곳)
    const ky = MY0 + 62 * d + 4;
    ctx.save();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(MX, ky - 4); ctx.lineTo(MX, ky + 22); ctx.stroke();
    ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = MD.drag ? 14 : 6; ctx.shadowOffsetY = MD.drag ? 6 : 3;
    ctx.fillStyle = rgrad(MX - 5, ky + 18, 2, MX, ky + 26, 18, [[0, '#fde68a'], [1, '#f59e0b']]); ctx.beginPath(); ctx.arc(MX, ky + 28, MD.drag ? 17 : 15, 0, TAU); ctx.fill();
    ctx.restore();
    if (!MD.drag && MD.d < 0.05 && !MD.lock && !MD.cardsOn) { const a = Math.sin(t * 4) * 5; D.arrow(MX, ky + 54, MX, ky + 86 + a, { color: '#16a34a', width: 5 }); pill('아래로 당겨요', MX + 78, ky + 72, { size: 13.5, bg: '#16a34a', h: 26, pad: 10 }); }
    // 공기 흐름 화살표 (Y자 관 위)
    const flow = MD.db;
    if (Math.abs(flow) > 0.04 && !MD.cardsOn) {
      const a = clamp(Math.abs(flow) * 3, 0.25, 1), down = flow > 0;
      ctx.save(); ctx.globalAlpha = a;
      D.arrow(MX, down ? 30 : 76, MX, down ? 72 : 32, { color: down ? AIR_D : '#d97706', width: 6 });
      ctx.restore();
      pill(down ? '공기가 들어와요 (들숨)' : '공기가 나가요 (날숨)', MX, 20, { size: 14, bg: down ? AIR_D : '#d97706', h: 26, pad: 11 });
    }
    // 이름 붙이기 모드: 연결선
    if (MD.cardsOn) { MD.cards.draw(t); }
    drawModelGauges(t);
  }
  function drawModelGauges(t) {
    const x = 552, y = 44, w = 238;
    panel(x, y, w, MD.cardsOn ? 190 : 326, { r: 18 });
    txt('📏 병 속 상태', x + 14, y + 28, { size: 15, weight: 800, color: '#64748b' });
    // 부피
    const V = (1 + 0.6 * MD.d) / 1.6;
    txt('병 속 공간의 부피', x + 14, y + 58, { size: 13.5, weight: 800, color: '#1b2333' });
    ctx.fillStyle = '#e5e9ef'; rr(x + 14, y + 66, w - 28, 16, 8); ctx.fill();
    ctx.fillStyle = '#0ea5e9'; rr(x + 14, y + 66, Math.max(14, (w - 28) * clamp(V, 0, 1)), 16, 8); ctx.fill();
    if (MD.d > 0.08) txt('늘어나요 ↑', x + w - 14, y + 58, { size: 13, weight: 800, color: '#0369a1', align: 'right' });
    // 압력
    txt('병 속 압력', x + 14, y + 112, { size: 13.5, weight: 800, color: '#1b2333' });
    const px0 = x + 14, pw = w - 28, mid = px0 + pw * (1 - 0.6) / (1.6 - 0.6) * 0 + pw * 0.4;
    ctx.fillStyle = '#e5e9ef'; rr(px0, y + 120, pw, 16, 8); ctx.fill();
    const Pn = clamp((MD.P - 0.6) / 1.0, 0, 1);
    ctx.fillStyle = MD.P < 0.97 ? '#6366f1' : MD.P > 1.03 ? '#ef4444' : '#16a34a';
    const mx = px0 + pw * 0.4, cx2 = px0 + pw * Pn;
    rr(Math.min(mx, cx2) - 0, y + 120, Math.max(8, Math.abs(cx2 - mx)), 16, 6); ctx.fill();
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mx, y + 114); ctx.lineTo(mx, y + 142); ctx.stroke();
    txt('대기압', mx, y + 158, { size: 12, weight: 800, color: '#475569', align: 'center' });
    if (MD.P < 0.97) txt('낮아져요 ↓', x + w - 14, y + 112, { size: 13, weight: 800, color: '#4f46e5', align: 'right' });
    else if (MD.P > 1.03) txt('높아져요 ↑', x + w - 14, y + 112, { size: 13, weight: 800, color: '#dc2626', align: 'right' });
    if (MD.cardsOn) return;
    // 설명 (한 줄 인과)
    const steps = [['고무막을 아래로', MD.d > 0.3], ['병 속 부피 증가', MD.d > 0.3], ['병 속 압력 감소', MD.P < 0.97 || now() - (MD.lowT || -9) < 1.6], ['풍선이 부풀어요', MD.db > 0.05 || MD.b > 0.5]];
    txt('원인 → 결과', x + 14, y + 190, { size: 13.5, weight: 800, color: '#64748b' });
    steps.forEach((s, i) => {
      const yy = y + 214 + i * 26;
      ctx.fillStyle = s[1] ? '#dcfce7' : '#f1f5f9'; rr(x + 14, yy - 11, w - 28, 22, 8); ctx.fill();
      txt((i + 1) + '. ' + s[0], x + 24, yy + 1, { size: 13.5, weight: 800, color: s[1] ? '#166534' : '#94a3b8', base: 'middle' });
      if (s[1]) checkMark(x + w - 28, yy, 8);
    });
  }
  const modelHandlers = {
    down(p) {
      if (MD.cardsOn && MD.cards.down(p)) return true;
      const ky = MY0 + 62 * MD.d + 4 + 28;
      if (!MD.cardsOn && Math.hypot(p.x - MX, p.y - ky) < 38) { MD.drag = true; MD.lock = false; syncModelUI(); Sound.click(); return true; }
      return false;
    },
    move(p) {
      if (MD.cards.drag) { MD.cards.move(p); return; }
      if (MD.drag) MD.d = clamp((p.y - 28 - 4 - MY0) / 62, -0.05, 1.1);
    },
    up() { if (MD.cards.drag) { MD.cards.up(); return; } if (MD.drag) { MD.drag = false; MD.spr.value = MD.d; MD.spr.velocity = 0; } },
    hover(p) {
      if (MD.cardsOn) return MD.cards.cursor(p);
      const ky = MY0 + 62 * MD.d + 4 + 28; return Math.hypot(p.x - MX, p.y - ky) < 38 ? 'grab' : null;
    },
  };

  /* =========================================================
     장면 ③ 들숨과 날숨: 갈비뼈와 가로막
     ========================================================= */
  const CX = 250;
  const CH = {
    rib: 0, dia: 0, L: 0, auto: false, t: 0, drag: null, flow: 0, dots: [], spawn: 0, maxRib: 0, hintT: 0, sawIn: false, sawEx: false, touched: false,
    ribS: new SciSim.Spring(0, { stiffness: 120, damping: 14 }), diaS: new SciSim.Spring(0, { stiffness: 120, damping: 14 }), 
  };
  const diaY = (x, dia) => 505 - 40 * (1 - dia) * Math.max(0, 1 - Math.pow((x - CX) / 165, 2));
  const ribGeo = (i, rib) => {
    const y0 = 192 + i * 24 - 12 * rib, dx = (118 + i * 7) * (1 + 0.1 * rib);
    return { y0, dx, ey: y0 + 66 - i * 3 - 24 * rib };
  };
  function initChest() {
    CH.rib = CH.dia = CH.L = 0; CH.ribS.value = CH.diaS.value = 0; CH.ribS.target = CH.diaS.target = 0; CH.auto = false; CH.dots = []; CH.flow = 0; CH.t = 0; CH.touched = false;
    syncChestUI();
  }
  function syncChestUI() { const b = $('#btnAutoBreath'); if (b) b.innerHTML = CH.auto ? '⏸ 자동 숨쉬기 멈추기' : '🔁 자동으로 숨 쉬기'; }
  const CHEST_T = { inT: 2.2, exT: 2.6, restT: 0.5 };
  function updateChest(dt, t) {
    if (CH.auto) {
      CH.t += dt;
      const c = breathCurve(CH.t, CHEST_T.inT, CHEST_T.exT, CHEST_T.restT);
      CH.rib = SciSim.approach(CH.rib, c.b, dt, 12); CH.dia = SciSim.approach(CH.dia, c.b, dt, 12);
    }
    CH.maxRib = Math.max(CH.maxRib, CH.rib);
    const Vc = 0.5 * CH.rib + 0.5 * CH.dia;
    const oldL = CH.L;
    CH.L = SciSim.approach(CH.L, Vc, dt, 4.2);
    CH.flow = SciSim.approach(CH.flow, (CH.L - oldL) / Math.max(dt, 1e-3), dt, 14);
    // 기관 속 공기 흐름
    const fl = CH.flow;
    if (Math.abs(fl) > 0.03) {
      CH.spawn += dt * Math.min(26, Math.abs(fl) * 40);
      while (CH.spawn >= 1) { CH.spawn -= 1; const side = Math.random() < 0.5 ? -1 : 1; CH.dots.push({ s: fl > 0 ? 0 : 1, dir: fl > 0 ? 1 : -1, side, off: (Math.random() - 0.5) * 2, v: 0.7 + Math.random() * 0.3 }); }
    }
    for (let i = CH.dots.length - 1; i >= 0; i--) { const d = CH.dots[i]; d.s += d.dir * d.v * dt * 1.1; if (d.s < 0 || d.s > 1) CH.dots.splice(i, 1); }
    if (Vc > 0.8 && CH.L > 0.7) CH.sawIn = true;
    if (Vc < 0.25 && CH.L < 0.3 && CH.sawIn) CH.sawEx = true;
  }
  function trachPt(s, side, off) {   // s: 0 코 → 1 폐 속 (기관 → 기관지)
    if (s < 0.55) return { x: CX + off * 3, y: 96 + s / 0.55 * 112 };
    const u = (s - 0.55) / 0.45;
    return { x: CX + side * (u * 44) + off * 3, y: 208 + u * 52 };
  }
  function chestLungPts(left) {
    const sx = 1 + 0.17 * CH.L;
    const yb = (x) => diaY(x, CH.dia) - 3;
    const base = left
      ? [[238, 216], [196, 200], [150, 224], [118, 292], [112, 380], [120, yb(120)], [170, yb(170)], [222, yb(222)], [240, yb(240) - 4], [242, 330]]
      : [[262, 216], [304, 200], [350, 224], [382, 292], [388, 380], [380, yb(380)], [330, yb(330)], [278, yb(278)], [260, yb(260) - 4], [258, 330]];
    return base.map((p) => [CX + (p[0] - CX) * sx, p[1] > 390 && p[1] < 520 && p[1] === yb(p[0]) ? p[1] : p[1]]);
  }
  function drawChestBody(t) {
    const rib = CH.rib, dia = CH.dia;
    // 머리 · 목
    ctx.fillStyle = SKIN; rr(CX - 20, 88, 40, 90, 10); ctx.fill();
    ctx.save(); ctx.shadowColor = 'rgba(80,50,30,.18)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = rgrad(CX - 12, 50, 6, CX, 64, 44, [[0, '#fff0de'], [1, SKIN]]); ctx.beginPath(); ctx.ellipse(CX, 62, 38, 44, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#5b3a29'; ctx.beginPath(); ctx.ellipse(CX, 40, 39, 22, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.ellipse(CX - 14, 56, 3.2, 4.4, 0, 0, TAU); ctx.ellipse(CX + 14, 56, 3.2, 4.4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c0713f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(CX, 74, 9, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
    // 몸통 (투시 창)
    const body = [[150, 164], [100, 192], [84, 300], [92, 440], [124, 526], [CX, 548], [376, 526], [408, 440], [416, 300], [400, 192], [350, 164], [CX, 154]];
    ctx.save();
    ctx.shadowColor = 'rgba(30,60,40,.12)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = lgrad(0, 160, 0, 550, [[0, '#d7efe6'], [1, '#c3e3d7']]); ctx.beginPath(); smooth(ctx, body, true); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#8fb8a8'; ctx.lineWidth = 3; ctx.beginPath(); smooth(ctx, body, true); ctx.stroke();
    // 배 (가로막 아래)
    ctx.save(); ctx.beginPath(); smooth(ctx, body, true); ctx.clip();
    ctx.fillStyle = '#ffe9c9'; ctx.beginPath(); ctx.moveTo(60, 560);
    for (let x = 60; x <= 440; x += 10) ctx.lineTo(x, Math.min(diaY(x, dia) + 4, 520));
    ctx.lineTo(440, 560); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(224,160,140,.45)'; ctx.beginPath(); ctx.ellipse(CX - 70, 535, 54, 20, -0.2, 0, TAU); ctx.fill();
    ctx.restore();
    // 폐
    [true, false].forEach((left) => {
      const pts = chestLungPts(left);
      ctx.save();
      ctx.shadowColor = 'rgba(150,50,80,.2)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
      ctx.fillStyle = rgrad(left ? 170 : 330, 340, 10, left ? 170 : 330, 380, 140, [[0, mix(LUNG_L, '#fff2f5', CH.L * 0.5)], [0.7, mix(LUNG, '#f9b9c8', CH.L * 0.5)], [1, LUNG_D]]);
      ctx.beginPath(); smooth(ctx, pts, true); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = LUNG_D; ctx.lineWidth = 2.5; ctx.beginPath(); smooth(ctx, pts, true); ctx.stroke();
    });
    // (기관은 갈비뼈 위에 그려요)
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const tr = (w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(CX, 96); ctx.lineTo(CX, 208); ctx.moveTo(CX, 208); ctx.lineTo(CX - 44, 260); ctx.moveTo(CX, 208); ctx.lineTo(CX + 44, 260); ctx.moveTo(CX - 44, 260); ctx.lineTo(CX - 74, 300); ctx.moveTo(CX + 44, 260); ctx.lineTo(CX + 74, 300); ctx.stroke(); };
    // 갈비뼈
    ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = 0.88;
    for (let i = 0; i < 6; i++) {
      const g = ribGeo(i, rib);
      [-1, 1].forEach((sd) => {
        const ex = CX + sd * g.dx, ey = g.ey;
        ctx.beginPath(); ctx.moveTo(CX + sd * 6, g.y0 + 2); ctx.quadraticCurveTo(CX + sd * g.dx * 0.78, g.y0 - 10, ex, ey);
        ctx.strokeStyle = '#a89868'; ctx.lineWidth = 10.5; ctx.stroke();
        ctx.strokeStyle = '#f6edd0'; ctx.lineWidth = 7.5; ctx.stroke();
      });
    }
    // 복장뼈
    ctx.fillStyle = '#f6edd0'; ctx.strokeStyle = '#a89868'; ctx.lineWidth = 2.5; rr(CX - 7, 178 - 12 * rib, 14, 130, 6); ctx.fill(); ctx.stroke();
    ctx.restore();
    tr(18, '#7aa7c4'); tr(12, '#d6efff');
    ctx.restore();
    // 가로막 (근육)
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); for (let x = 96; x <= 404; x += 8) { const y = diaY(x, dia); if (x === 96) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.strokeStyle = '#8f2f3c'; ctx.lineWidth = 13; ctx.stroke(); ctx.strokeStyle = '#d9606e'; ctx.lineWidth = 8.5; ctx.stroke();
    ctx.restore();
    // 기관 속 공기 입자
    CH.dots.forEach((d) => {
      const q = trachPt(d.s, d.side, d.off);
      bead(q.x, q.y, 3.4, d.dir > 0 ? AIR : OUTAIR, { noShadow: true });
    });
    // 코 앞 화살표
    const fl = CH.flow;
    if (Math.abs(fl) > 0.05) {
      const inh = fl > 0;
      D.arrow(inh ? CX - 82 : CX - 40, inh ? 86 : 78, inh ? CX - 40 : CX - 82, inh ? 78 : 86, { color: inh ? AIR_D : '#d97706', width: 5 });
      pill(inh ? '들숨' : '날숨', CX - 112, 90, { size: 14, bg: inh ? AIR_D : '#d97706', h: 26, pad: 10 });
    }
    // 손잡이
    drawChestHandles(t);
  }
  function chestHandleRib() { const g = ribGeo(3, CH.rib); return { x: CX + g.dx + 6, y: g.ey + 6 }; }
  function chestHandleDia() { return { x: CX, y: diaY(CX, CH.dia) + 32 }; }
  function grip(x, y, col, active, t) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = active ? 14 : 7; ctx.shadowOffsetY = active ? 6 : 3;
    ctx.fillStyle = rgrad(x - 5, y - 6, 2, x, y, 20, [[0, shade(col, 0.5)], [1, col]]); ctx.beginPath(); ctx.arc(x, y, active ? 20 : 18, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 9); ctx.moveTo(x - 5, y - 4); ctx.lineTo(x, y - 9); ctx.lineTo(x + 5, y - 4); ctx.moveTo(x - 5, y + 4); ctx.lineTo(x, y + 9); ctx.lineTo(x + 5, y + 4); ctx.stroke();
  }
  function drawChestHandles(t) {
    const hr = chestHandleRib(), hd = chestHandleDia();
    const act = CH.drag && CH.drag.k;
    if (!CH.touched && !CH.auto) { ring(hr.x, hr.y, 28, '#16a34a', t); ring(hd.x, hd.y, 28, '#16a34a', t + 1); }
    grip(hr.x, hr.y, '#d4a72c', act === 'rib', t);
    grip(hd.x, hd.y, '#c9475a', act === 'dia', t);
    pill('갈비뼈', hr.x + 52, hr.y, { size: 14, bg: '#8a6d1a', h: 26, pad: 10 });
    pill('가로막', hd.x + 58, hd.y, { size: 14, bg: '#9f2f43', h: 26, pad: 10 });
    if (!CH.touched && !CH.auto) pill('👆 끌어서 움직여 봐요', 250, 584, { size: 14, bg: '#16a34a', h: 28, pad: 12 });
  }
  function drawChestPanel(t) {
    const x = 548, y = 44, w = 244;
    panel(x, y, w, 540, { r: 18 });
    txt('📏 가슴(흉강)의 변화', x + 14, y + 30, { size: 15, weight: 800, color: '#64748b' });
    const Vc = 0.5 * CH.rib + 0.5 * CH.dia;
    txt('흉강의 부피', x + 14, y + 64, { size: 13.5, weight: 800, color: '#1b2333' });
    ctx.fillStyle = '#e5e9ef'; rr(x + 14, y + 72, w - 28, 18, 9); ctx.fill();
    ctx.fillStyle = '#0ea5e9'; rr(x + 14, y + 72, Math.max(16, (w - 28) * Vc), 18, 9); ctx.fill();
    const fl = CH.flow, st = fl > 0.06 ? 1 : fl < -0.06 ? -1 : 0;
    txt('흉강 안의 압력', x + 14, y + 124, { size: 13.5, weight: 800, color: '#1b2333' });
    const px0 = x + 14, pw = w - 28, mid = px0 + pw / 2;
    ctx.fillStyle = '#e5e9ef'; rr(px0, y + 132, pw, 18, 9); ctx.fill();
    const dev = clamp(-fl * 0.35, -1, 1);
    const ex = mid + dev * (pw / 2 - 6);
    ctx.fillStyle = dev < -0.05 ? '#6366f1' : dev > 0.05 ? '#ef4444' : '#16a34a';
    rr(Math.min(mid, ex), y + 132, Math.max(8, Math.abs(ex - mid)), 18, 7); ctx.fill();
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mid, y + 126); ctx.lineTo(mid, y + 156); ctx.stroke();
    txt('대기압', mid, y + 172, { size: 12, weight: 800, color: '#475569', align: 'center' });
    txt(st > 0 ? '대기압보다 낮아요' : st < 0 ? '대기압보다 높아요' : '대기압과 같아요', x + w - 14, y + 124, { size: 12.5, weight: 800, color: st > 0 ? '#4f46e5' : st < 0 ? '#dc2626' : '#15803d', align: 'right' });
    // 공기 이동
    const big = st > 0 ? ['들숨', AIR_D, '공기가 들어와요'] : st < 0 ? ['날숨', '#d97706', '공기가 나가요'] : ['멈춤', '#64748b', '공기 이동 없음'];
    rr(x + 14, y + 190, w - 28, 62, 14); ctx.fillStyle = rgba(big[1], 0.12); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = big[1]; ctx.stroke();
    txt(big[0], x + 32, y + 228, { size: 26, weight: 800, color: big[1] });
    txt(big[2], x + w - 26, y + 227, { size: 14.5, weight: 800, color: big[1], align: 'right' });
    // 원인 → 결과
    txt('몸의 움직임', x + 14, y + 284, { size: 13.5, weight: 800, color: '#64748b' });
    const rows = [
      ['갈비뼈', CH.rib > 0.6 ? '위로 올라가요 ↑' : CH.rib < 0.35 ? '아래로 내려가요 ↓' : '가운데', CH.rib > 0.6 || CH.rib < 0.35],
      ['가로막', CH.dia > 0.6 ? '아래로 내려가요 ↓' : CH.dia < 0.35 ? '위로 올라가요 ↑' : '가운데', CH.dia > 0.6 || CH.dia < 0.35],
      ['흉강 부피', Vc > 0.6 ? '커져요' : Vc < 0.35 ? '작아져요' : '가운데', Vc > 0.6 || Vc < 0.35],
      ['폐', CH.L > 0.6 ? '부풀어요' : CH.L < 0.35 ? '쪼그라들어요' : '가운데', CH.L > 0.6 || CH.L < 0.35],
    ];
    rows.forEach((r, i) => {
      const yy = y + 312 + i * 34;
      ctx.fillStyle = r[2] ? '#e0f2fe' : '#f1f5f9'; rr(x + 14, yy - 14, w - 28, 28, 9); ctx.fill();
      txt(r[0], x + 24, yy + 1, { size: 13.5, weight: 800, color: '#475569', base: 'middle' });
      txt(r[1], x + w - 22, yy + 1, { size: 13.5, weight: 800, color: r[2] ? '#0369a1' : '#94a3b8', align: 'right', base: 'middle' });
    });
    wrapLines('폐는 근육이 없어서 스스로 움직이지 못해요. 갈비뼈와 가로막이 움직여 흉강의 부피가 바뀌면 공기가 드나들어요.', w - 28, 12.5).forEach((ln, i) => txt(ln, x + 14, y + 466 + i * 17, { size: 12.5, weight: 700, color: '#64748b' }));
  }
  function drawChest(t) { drawChestBody(t); drawChestPanel(t); }
  const chestHandlers = {
    down(p) {
      if (CH.auto) return false;
      const hr = chestHandleRib(), hd = chestHandleDia();
      if (Math.hypot(p.x - hr.x, p.y - hr.y) < 36) { CH.drag = { k: 'rib', y0: p.y, v0: CH.rib }; CH.touched = true; Sound.click(); return true; }
      if (Math.hypot(p.x - hd.x, p.y - hd.y) < 36) { CH.drag = { k: 'dia', y0: p.y, v0: CH.dia }; CH.touched = true; Sound.click(); return true; }
      return false;
    },
    move(p) {
      const d = CH.drag; if (!d) return;
      if (d.k === 'rib') CH.rib = clamp(d.v0 - (p.y - d.y0) / 36, 0, 1)   // 손잡이가 36 px 움직이는 만큼 — 손잡이가 손가락을 따라가요;
      else CH.dia = clamp(d.v0 + (p.y - d.y0) / 40, 0, 1);
    },
    up() { CH.drag = null; },
    hover(p) { if (CH.auto) return null; const hr = chestHandleRib(), hd = chestHandleDia(); return Math.hypot(p.x - hr.x, p.y - hr.y) < 36 || Math.hypot(p.x - hd.x, p.y - hd.y) < 36 ? 'grab' : null; },
  };

  /* =========================================================
     장면 ④ 폐포에서의 기체 교환 (확산)
     ========================================================= */
  function rbcShape(x, y, rx, ry, col, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.fillStyle = rgrad(-rx * 0.3, -ry * 0.4, 1, 0, 0, Math.max(rx, ry), [[0, shade(col, 0.45)], [0.6, col], [1, shade(col, -0.3)]]);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.4, ry * 0.4, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  const ACX = 246, ACY = 322, AR = 120, ARC_R = 154;
  const CAP_KEYS = (function () {
    const k = [[392, 96], [336, 128]];
    [-72, -56, -40, -24, -8, 8, 24, 40, 56, 72].forEach((d) => { const a = d * Math.PI / 180; k.push([ACX + ARC_R * Math.cos(a), ACY + ARC_R * Math.sin(a)]); });
    k.push([336, 516], [392, 548]);
    return k;
  })();
  const CAPP = splineSample(CAP_KEYS, 10);
  const CAPL = CAPP[CAPP.length - 1][2];
  const Z0 = CAPL * 0.2, Z1 = CAPL * 0.8;
  const AL = {
    ex: 0, exv: 0, t: 0, air: [], blood: [], cross: [], rbc: [], b: 0, dir: 0, o2n: 0, co2n: 0, restO2: 0, restCO2: 0, exO2: 0, exCO2: 0, spO2: 0, spCO2: 0, spAir: 0, glow: 0, ready: false,
    barA: { o2a: 0.9, o2b: 0.15, co2a: 0.1, co2b: 0.8 },
  };
  function initAlveoli() {
    const R = rng(77);
    AL.air = []; AL.blood = []; AL.cross = []; AL.rbc = [];
    for (let i = 0; i < 26; i++) { const a = R() * TAU, r = Math.sqrt(R()) * (AR - 14); AL.air.push({ k: 'o2', x: ACX + Math.cos(a) * r, y: ACY + Math.sin(a) * r, vx: (R() - 0.5) * 60, vy: (R() - 0.5) * 60 }); }
    for (let i = 0; i < 3; i++) { const a = R() * TAU, r = Math.sqrt(R()) * (AR - 14); AL.air.push({ k: 'co2', x: ACX + Math.cos(a) * r, y: ACY + Math.sin(a) * r, vx: (R() - 0.5) * 60, vy: (R() - 0.5) * 60 }); }
    for (let i = 0; i < 6; i++) AL.rbc.push({ s: (i / 6) * CAPL, o2: 0.15 + 0.5 * (i / 6) });
    AL.t = 0; AL.o2n = AL.co2n = AL.restO2 = AL.restCO2 = AL.exO2 = AL.exCO2 = 0;
    AL.ex = 0; AL.exv = 0;
    const s = $('#sEx'); if (s) { s.value = 0; s.style.setProperty('--pct', '0%'); }
    const o = $('#oEx'); if (o) o.textContent = exLabel(0);
  }
  const exLabel = (v) => (v < 0.25 ? '😌 쉬는 중' : v < 0.7 ? '🚶 걷는 중' : '🏃 달리는 중');
  function bloodSpeed() { return 38 + 62 * AL.exv; }
  function updateAlveoli(dt, t) {
    AL.exv = SciSim.approach(AL.exv, AL.ex, dt, 3);
    AL.t += dt;
    const inT = lerp(1.7, 0.85, AL.exv), exT = lerp(2.1, 1.0, AL.exv), restT = lerp(0.6, 0.15, AL.exv);
    const c = breathCurve(AL.t, inT, exT, restT);
    AL.b = SciSim.approach(AL.b, c.b, dt, 14); AL.dir = c.dir;
    // 폐포 속 공기: 들숨에 O2가 들어오고, 날숨에 CO2가 나가요
    const nO2 = AL.air.filter((q) => q.k === 'o2').length;
    if (AL.dir > 0 && nO2 < 30) {
      AL.spAir += dt * (9 + 12 * AL.exv);
      while (AL.spAir >= 1 && nO2 < 30) { AL.spAir -= 1; AL.air.push({ k: 'o2', x: 52, y: ACY + (Math.random() - 0.5) * 22, vx: 90, vy: (Math.random() - 0.5) * 30, fresh: 1 }); }
    } else if (AL.dir <= 0) AL.spAir = 0;
    for (let i = AL.air.length - 1; i >= 0; i--) {
      const q = AL.air[i];
      q.vx += (Math.random() - 0.5) * 240 * dt; q.vy += (Math.random() - 0.5) * 240 * dt;
      const sp = Math.hypot(q.vx, q.vy), mx = 62; if (sp > mx) { q.vx *= mx / sp; q.vy *= mx / sp; }
      if (q.k === 'co2' && AL.dir < 0) { q.vx -= 150 * dt * (1 + AL.exv); q.vy += (ACY - q.y) * 1.3 * dt; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      const inDuct = q.x < ACX - AR + 12 && Math.abs(q.y - ACY) < 22;
      if (q.x < 40) { AL.air.splice(i, 1); continue; }
      if (!inDuct) {
        const dx = q.x - ACX, dy = q.y - ACY, dd = Math.hypot(dx, dy), lim = AR - 8;
        if (dd > lim) { const nx = dx / dd, ny = dy / dd; q.x = ACX + nx * lim; q.y = ACY + ny * lim; const dot = q.vx * nx + q.vy * ny; if (dot > 0) { q.vx -= 2 * dot * nx; q.vy -= 2 * dot * ny; } }
      } else { q.y = clamp(q.y, ACY - 20, ACY + 20); }
    }
    // 혈액의 흐름
    const v = bloodSpeed();
    AL.rbc.forEach((r) => { r.s += v * dt; if (r.s > CAPL) { r.s -= CAPL + 0; r.o2 = 0.22 - 0.14 * AL.exv; } });
    AL.spCO2 += dt * (1.3 + 4.2 * AL.exv);
    while (AL.spCO2 >= 1) { AL.spCO2 -= 1; AL.blood.push({ s: 0, off: (Math.random() - 0.5) * 20, ph: Math.random() * 6 }); }
    const nCO2alv = AL.air.filter((q) => q.k === 'co2').length;
    for (let i = AL.blood.length - 1; i >= 0; i--) {
      const q = AL.blood[i];
      q.s += v * dt * (0.9 + 0.2 * Math.sin(q.ph + t));
      if (q.s > CAPL) { AL.blood.splice(i, 1); continue; }
      if (q.s > Z0 && q.s < Z1 && nCO2alv < 14 && Math.random() < dt * 0.75) {
        // 폐포로 확산
        const p = atLen(CAPP, q.s), a = Math.atan2(p.y - ACY, p.x - ACX);
        const tx = ACX + Math.cos(a + (Math.random() - 0.5) * 0.4) * (AR - 24), ty = ACY + Math.sin(a + (Math.random() - 0.5) * 0.4) * (AR - 24);
        AL.cross.push({ k: 'co2', x: p.x + Math.cos(Math.atan2(0, 1)) * 0 + (q.off) * 0, y: p.y, tx, ty, t: 0, dur: 0.7, sx: p.x + Math.cos(a) * 0, sy: p.y, to: 'alv' });
        AL.blood.splice(i, 1); AL.co2n++;
        if (AL.ex < 0.25) AL.restCO2++; if (AL.ex >= 0.7) AL.exCO2++;
        AL.glow = 1;
      }
    }
    // 산소 확산: 폐포 → 적혈구
    AL.rbc.forEach((r) => {
      if (r.s > Z0 && r.s < Z1 && r.o2 < 0.97 && Math.random() < dt * 1.9 * (1 - r.o2) * (1 + 0.6 * AL.exv)) {
        const rp = atLen(CAPP, r.s);
        let best = null, bd = 1e9;
        AL.air.forEach((q) => { if (q.k !== 'o2') return; const d = Math.hypot(q.x - rp.x, q.y - rp.y); if (d < bd) { bd = d; best = q; } });
        if (best && bd < 190) {
          AL.air.splice(AL.air.indexOf(best), 1);
          AL.cross.push({ k: 'o2', x: best.x, y: best.y, tx: rp.x, ty: rp.y, t: 0, dur: 0.6, rbc: r, to: 'rbc' });
        }
      }
    });
    for (let i = AL.cross.length - 1; i >= 0; i--) {
      const q = AL.cross[i];
      q.t += dt;
      const u = clamp(q.t / q.dur, 0, 1);
      if (q.to === 'rbc') { const rp = atLen(CAPP, q.rbc.s); q.tx = rp.x; q.ty = rp.y; }
      q.cx = lerp(q.x, q.tx, EASE.inOutCubic(u)); q.cy = lerp(q.y, q.ty, EASE.inOutCubic(u));
      if (u >= 1) {
        if (q.to === 'rbc') {
          q.rbc.o2 = Math.min(1, q.rbc.o2 + 0.1); AL.o2n++;
          if (AL.ex < 0.25) AL.restO2++; if (AL.ex >= 0.7) AL.exO2++;
          burst(q.tx, q.ty, ['#38bdf8', '#e5383b', '#ffffff'], 5, { speed: 50 }); AL.glow = 1;
        } else AL.air.push({ k: 'co2', x: q.tx, y: q.ty, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40 });
        AL.cross.splice(i, 1);
      }
    }
    AL.glow = SciSim.approach(AL.glow, 0, dt, 3);
    // 농도 막대
    const o2a = AL.air.filter((q) => q.k === 'o2').length / 30, co2a = AL.air.filter((q) => q.k === 'co2').length / 10;
    const o2b = AL.rbc.reduce((a, r) => a + (r.s > 0 && r.s < CAPL ? r.o2 : 0), 0) / AL.rbc.length;
    const co2b = clamp(AL.blood.length / 12, 0, 1);
    const B = AL.barA;
    B.o2a = SciSim.approach(B.o2a, clamp(o2a, 0, 1), dt, 5); B.o2b = SciSim.approach(B.o2b, o2b, dt, 5); B.co2a = SciSim.approach(B.co2a, clamp(co2a, 0, 1), dt, 5); B.co2b = SciSim.approach(B.co2b, co2b, dt, 5);
  }
  function drawAlveoli(t) {
    // 모세 혈관
    ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    strokePoly(CAPP, 0, CAPL); ctx.strokeStyle = '#c28fd8'; ctx.lineWidth = 46; ctx.stroke();
    strokePoly(CAPP, 0, CAPL); ctx.strokeStyle = '#f6eafd'; ctx.lineWidth = 38; ctx.stroke();
    ctx.restore();
    // 폐포 (공기 주머니)
    const pulse = 1 + 0.035 * AL.b;
    ctx.save(); ctx.translate(ACX, ACY); ctx.scale(pulse, pulse); ctx.translate(-ACX, -ACY);
    // 기관지(공기 통로)
    ctx.fillStyle = '#7aa7c4'; rr(36, ACY - 30, 110, 60, 12); ctx.fill();
    ctx.fillStyle = '#e6f6ff'; rr(36, ACY - 22, 110, 44, 8); ctx.fill();
    ctx.beginPath(); ctx.arc(ACX, ACY, AR + 8, 0, TAU);
    ctx.fillStyle = '#f2a7b8'; ctx.fill();
    ctx.beginPath(); ctx.arc(ACX, ACY, AR, 0, TAU);
    ctx.fillStyle = rgrad(ACX - 30, ACY - 40, 10, ACX, ACY, AR, [[0, '#f4fbff'], [1, '#d6eefb']]); ctx.fill();
    // 입구 열기
    ctx.fillStyle = '#e6f6ff'; ctx.fillRect(ACX - AR - 4, ACY - 22, 30, 44);
    // 벽의 세포 핵
    ctx.fillStyle = '#d9748f'; for (let k = 0; k < 14; k++) { const a = -1.15 + k * 0.17; ctx.beginPath(); ctx.ellipse(ACX + Math.cos(a) * (AR + 4), ACY + Math.sin(a) * (AR + 4), 4, 2.4, a + Math.PI / 2, 0, TAU); ctx.fill(); }
    ctx.restore();
    // 교환 화살표
    const a = 0.45 + 0.35 * Math.sin(t * 3);
    ctx.save(); ctx.globalAlpha = a + AL.glow * 0.2;
    D.arrow(ACX + 70, ACY - 20, ACX + 170, ACY - 20, { color: O2C, width: 7 }); pill('O₂', ACX + 120, ACY - 40, { size: 15, bg: O2C, h: 24, pad: 9 });
    D.arrow(ACX + 170, ACY + 30, ACX + 70, ACY + 30, { color: CO2C, width: 7 }); pill('CO₂', ACX + 120, ACY + 52, { size: 15, bg: CO2C, h: 24, pad: 9 });
    ctx.restore();
    // 적혈구
    AL.rbc.forEach((r) => {
      if (r.s < 0 || r.s > CAPL) return;
      const p = atLen(CAPP, r.s);
      rbcShape(p.x, p.y, 14, 8.5, mix('#7d2a45', '#e5383b', r.o2), p.a);
    });
    // 혈액 속 이산화 탄소
    AL.blood.forEach((q) => {
      const p = atLen(CAPP, q.s); const nx = -Math.sin(p.a), ny = Math.cos(p.a);
      bead(p.x + nx * q.off * 0.8, p.y + ny * q.off * 0.8, 4.4, CO2C, { noShadow: true });
    });
    // 폐포 속 입자
    AL.air.forEach((q) => { bead(q.x, q.y, q.k === 'o2' ? 5 : 5.2, q.k === 'o2' ? O2C : CO2C, { noShadow: true }); });
    AL.cross.forEach((q) => bead(q.cx, q.cy, 5, q.k === 'o2' ? O2C : CO2C, { noShadow: true }));
    // 이름표
    pill('폐포 (공기가 들어 있는 주머니)', ACX - 4, ACY - AR - 26, { size: 13.5, bg: '#fff', color: '#be185d', border: '#f2a7b8', borderW: 2, h: 26, pad: 11, shadow: true });
    pill('모세 혈관', 420, 322, { size: 13.5, bg: '#fff', color: '#7e22ce', border: '#c28fd8', borderW: 2, h: 26, pad: 10, shadow: true });
    pill('폐동맥에서 ▼', 392, 78, { size: 12.5, bg: BLUE, h: 22, pad: 8 });
    pill('폐정맥으로 ▼', 392, 574, { size: 12.5, bg: RED, h: 22, pad: 8 });
    // 숨 방향 표시
    if (AL.dir !== 0) pill(AL.dir > 0 ? '들숨: 공기가 들어와요' : '날숨: 공기가 나가요', 92, ACY - 46, { size: 13, bg: AL.dir > 0 ? AIR_D : '#d97706', h: 24, pad: 9 });
    drawAlveoliPanel(t);
  }
  function concBar(x, y, w, label, v, col) {
    txt(label, x, y + 12, { size: 13, weight: 800, color: '#475569' });
    ctx.fillStyle = '#e5e9ef'; rr(x + 44, y, w - 44, 16, 8); ctx.fill();
    ctx.fillStyle = col; rr(x + 44, y, Math.max(8, (w - 44) * clamp(v, 0, 1)), 16, 8); ctx.fill();
  }
  function drawAlveoliPanel(t) {
    const x = 540, y = 44, w = 252;
    panel(x, y, w, 440, { r: 18 });
    txt('📏 농도 비교', x + 14, y + 28, { size: 15, weight: 800, color: '#64748b' });
    const B = AL.barA;
    pill('O₂ 산소', x + 14, y + 60, { size: 13.5, bg: O2C, h: 24, pad: 9, align: 'left' });
    concBar(x + 14, y + 78, w - 28, '폐포', B.o2a, O2C);
    concBar(x + 14, y + 102, w - 28, '혈액', B.o2b, '#e5383b');
    txt('농도가 높은 쪽(폐포) → 낮은 쪽(혈액)', x + 14, y + 142, { size: 12.5, weight: 800, color: '#0369a1' });
    pill('CO₂ 이산화 탄소', x + 14, y + 178, { size: 13.5, bg: CO2C, h: 24, pad: 9, align: 'left' });
    concBar(x + 14, y + 196, w - 28, '폐포', B.co2a, '#9ca3af');
    concBar(x + 14, y + 220, w - 28, '혈액', B.co2b, '#4b5563');
    txt('농도가 높은 쪽(혈액) → 낮은 쪽(폐포)', x + 14, y + 260, { size: 12.5, weight: 800, color: '#4b5563' });
    ctx.fillStyle = '#f1f5f9'; rr(x + 14, y + 272, w - 28, 76, 12); ctx.fill();
    txt('지금까지 교환한 기체', x + 24, y + 294, { size: 13, weight: 800, color: '#64748b' });
    txt('O₂ ' + AL.o2n + '개 → 혈액으로', x + 24, y + 320, { size: 14, weight: 800, color: '#0369a1' });
    txt('CO₂ ' + AL.co2n + '개 → 폐포로', x + 24, y + 338, { size: 14, weight: 800, color: '#4b5563' });
    wrapLines('기체는 농도가 높은 곳에서 낮은 곳으로 저절로 이동해요. 이것을 확산이라고 해요.', w - 8, 12.5).forEach((ln, i) => txt(ln, x + 6, y + 392 + i * 17, { size: 12.5, weight: 700, color: '#64748b' }));
    // 범례
    pill('O₂', 28, 590, { size: 12.5, bg: O2C, h: 20, pad: 7 }); pill('CO₂', 74, 590, { size: 12.5, bg: CO2C, h: 20, pad: 7 }); txt('= 기체 입자', 100, 595, { size: 12.5, weight: 700, color: '#64748b' });
  }
  const alveoliHandlers = { down() { return false; } };

  /* =========================================================
     장면 전환 · 입력 · 단계(미션)
     ========================================================= */
  let F = new Set();
  let game = null;
  const SCENE_LABEL = { airway: '🫁 호흡 기관: 공기가 지나가는 길', model: '🧪 호흡 운동 모형', chest: '💨 갈비뼈와 가로막의 움직임', alveoli: '🔬 폐포에서의 기체 교환' };
  const S = { scene: 'airway' };
  const HANDLERS = { airway: airwayHandlers, model: modelHandlers, chest: chestHandlers, alveoli: alveoliHandlers };
  function setScene(name) {
    S.scene = name;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === name));
    $$('#ctrlCard .cgrp').forEach((g) => { g.hidden = g.dataset.scene !== name; });
    $('#sceneLabel').textContent = SCENE_LABEL[name];
    hideHint();
  }
  const sh = (p) => ({ x: p.x, y: p.y - YOFF });
  const handlers = {
    down: (p) => HANDLERS[S.scene].down(sh(p)),
    move: (p) => HANDLERS[S.scene].move && HANDLERS[S.scene].move(sh(p)),
    up: (p) => HANDLERS[S.scene].up && HANDLERS[S.scene].up(sh(p)),
    hover: (p) => (HANDLERS[S.scene].hover ? HANDLERS[S.scene].hover(sh(p)) : null),
  };
  view = SciSim.stage($('#cv'), { width: W, height: H, background: BG });
  ctx = view.ctx; D = SciSim.draw(ctx);
  SciSim.pointer(view, handlers);
  AW.cards.onPick = (c) => { delete AW.flag[c.id]; };
  MD.cards.onPick = (c) => { delete MD.flag[c.id]; };
  initAirway(); initModel(); initChest(); initAlveoli();

  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); setScene(b.dataset.scene);
    if (b.dataset.scene === 'airway' && !gameMissionIs('names')) AW.cardsOn = false;
    if (b.dataset.scene === 'model' && !gameMissionIs('match')) MD.cardsOn = MD.cardsOn && MD.cards.cards.some((c) => !c.slot);
  }));
  $('#btnBreath').addEventListener('click', () => { Sound.click(); AW.on = !AW.on; if (AW.on && AW.t === 0) AW.t = 0; syncAirwayUI(); });
  $('#btnPull').addEventListener('click', () => { Sound.click(); MD.lock = !MD.lock; MD.drag = false; syncModelUI(); });
  $('#btnAutoBreath').addEventListener('click', () => { Sound.click(); CH.auto = !CH.auto; if (CH.auto) { CH.t = 0; CH.touched = true; } syncChestUI(); });
  SciSim.bindRange($('#sEx'), $('#oEx'), exLabel, (v) => { AL.ex = v; });

  /* ---------- 퀴즈 그림 ---------- */
  const FIG_ALV = '<svg viewBox="0 0 340 150" width="100%" role="img" aria-label="큰 주머니 하나와 작은 주머니 여러 개 비교"><rect width="340" height="150" fill="#fff"/>' +
    '<text x="85" y="20" font-size="13" font-weight="800" fill="#475569" text-anchor="middle">큰 주머니 1개</text><text x="255" y="20" font-size="13" font-weight="800" fill="#475569" text-anchor="middle">작은 주머니 여러 개</text>' +
    '<circle cx="85" cy="85" r="52" fill="#fde1e7" stroke="#d9748f" stroke-width="4"/>' +
    '<g fill="#fde1e7" stroke="#d9748f" stroke-width="3"><circle cx="220" cy="60" r="22"/><circle cx="262" cy="60" r="22"/><circle cx="304" cy="60" r="22"/><circle cx="241" cy="104" r="22"/><circle cx="283" cy="104" r="22"/><circle cx="220" cy="136" r="0"/></g>' +
    '<text x="85" y="147" font-size="12" font-weight="700" fill="#64748b" text-anchor="middle">공기와 닿는 면이 좁아요</text><text x="262" y="147" font-size="12" font-weight="700" fill="#64748b" text-anchor="middle">공기와 닿는 면이 넓어요</text></svg>';
  const gameMissionIs = (id) => { const m = game && game.current && game.current(); return !!(m && m.id === id); };
  const ids = (m, id) => { m.id = id; return m; };

  /* ---------- 단계 ---------- */
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '호흡 기관의 구조', short: '호흡 기관', icon: '🫁', phase: '관찰',
      features: ['airway'],
      intro: '<p class="si-q">❓ 탐구 질문: 근육이 없는 폐는 어떻게 부풀었다 줄어들까?</p>' +
        '<p>세포가 에너지를 얻으려면 영양소와 함께 <b>산소</b>가 필요해요. 산소는 <b>호흡계</b>가 몸 밖에서 받아들여요. 숨을 들이쉬면 공기는 어떤 길을 지나 폐까지 갈까요? 먼저 공기가 지나가는 <b>호흡 기관</b>의 이름과 순서를 알아봐요.</p>',
      setup() { setScene('airway'); AW.cardsOn = false; syncAirwayUI(); },
      recap: '공기는 <b>코 → 기관 → 기관지 → 폐(폐포)</b> 순서로 지나가요.',
      summary: '<ul><li>호흡 기관: <b>코 → 기관 → 기관지 → 폐</b></li>' +
        '<li>폐는 <b>폐포</b>라는 작은 공기주머니가 모여 이루어져 있어요.</li>' +
        '<li>들숨은 몸 밖의 공기를 폐로 들이쉬는 것, 날숨은 폐 속 공기를 내보내는 것이에요.</li></ul>',
      missions: [
        ids({
          title: '숨 따라가기',
          goal: '“숨 쉬기 시작”을 누르고, 들이쉰 공기가 <b>폐포</b>까지 가는 것을 <b>2번</b> 지켜보세요.',
          hint: '오른쪽 위 단추로 숨 쉬기를 시작해요. 파란 공기 입자가 어디를 지나는지 따라가 봐요. 숨을 내쉴 때는 주황색으로 나와요.',
          setup() { setScene('airway'); AW.cardsOn = false; AW.breaths = 0; AW.reached = 0; showHint('💨 “숨 쉬기 시작”을 눌러요', 7000); },
          check: () => AW.breaths >= 2,
          hold: 0.5,
          status: () => '폐포까지 간 숨: <b>' + Math.min(AW.breaths, 2) + ' / 2</b>번',
          explain: '들이쉰 공기는 <b>코 → 기관 → 기관지 → 폐(폐포)</b> 순서로 이동해요. 내쉴 때는 같은 길을 거꾸로 지나 몸 밖으로 나가요.',
        }, 'air'),
        ids({
          title: '호흡 기관 이름 붙이기', manual: true,
          goal: '이름표 4개를 알맞은 곳에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '공기는 코로 들어와서 목을 지나는 <b>기관</b>을 따라 내려가요. 기관이 두 갈래로 나뉜 것이 <b>기관지</b>이고, 그 끝에 <b>폐</b>가 있어요.',
          setup() { setScene('airway'); AW.cardsOn = true; AW.flag = {}; AW.cards.setup(AW.cards.cards, AW.cards.targets); showHint('🏷️ 이름표를 끌어 알맞은 칸에 놓아요', 6500); },
          status: () => '놓은 이름표: <b>' + AW.cards.cards.filter((c) => c.slot).length + ' / 4</b>',
          check() {
            const cs = AW.cards.cards, un = cs.filter((c) => !c.slot);
            if (un.length) return '아직 놓지 않은 이름표가 있어요. (' + un.length + '개 남음)';
            const bad = cs.filter((c) => c.slot !== c.id);
            bad.forEach((c) => { if (!AW.flag[c.id]) { AW.flag[c.id] = true; c.shake = 1; c.mark = 'bad'; } });
            if (bad.length) return '<b>' + bad.map((c) => c.label).join(', ') + '</b> 이름표의 자리가 맞지 않아요. 공기가 지나가는 순서를 떠올려 봐요.';
            cs.forEach((c) => { c.mark = 'ok'; });
            return true;
          },
          explain: '<b>코</b>로 들어온 공기는 <b>기관</b>을 지나 <b>기관지</b>를 따라 좌우 <b>폐</b>로 가요. 폐 속에는 공기주머니인 <b>폐포</b>가 아주 많아요.',
        }, 'names'),
      ],
    },
    /* ---------- 2단계 · 모형 ---------- */
    {
      title: '호흡 운동 모형 만들기', short: '호흡 모형', icon: '🧪', phase: '모형',
      features: ['model'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 공기가 코 → 기관 → 기관지 → 폐포로 가는 길을 따라가 보았어요.</div>' +
        '<p>그런데 폐에는 <b>근육이 없어서</b> 스스로 부풀거나 줄어들 수 없어요. 그럼 폐는 어떻게 공기를 들이쉴까요? <b>페트병, 고무풍선, 고무막</b>으로 만든 <b>호흡 운동 모형</b>으로 원리를 알아봐요.</p>',
      setup() { setScene('model'); MD.cardsOn = false; },
      recap: '고무막을 당기면 병 속 <b>부피가 커지고 압력이 낮아져</b> 공기가 풍선 속으로 들어와요.',
      summary: '<ul><li>모형: <b>페트병 = 흉강</b>, <b>고무풍선 = 폐</b>, <b>고무막 = 가로막</b>, <b>Y자 관 = 기관·기관지</b></li>' +
        '<li>고무막을 아래로 당기면 병 속 부피 <b>증가</b> → 압력 <b>감소</b> → 공기가 들어와 풍선이 <b>부풀어요</b>.</li>' +
        '<li>고무막을 놓으면 부피 <b>감소</b> → 압력 <b>증가</b> → 공기가 나가 풍선이 <b>줄어들어요</b>.</li></ul>',
      missions: [
        ids({
          title: '고무막을 당겨 풍선 부풀리기',
          goal: '고무막의 손잡이를 아래로 당겨 풍선을 <b>크게 부풀린 뒤</b>, 놓아서 <b>다시 줄어들게</b> 하세요.',
          hint: '노란 손잡이를 손가락으로 끌어 내려요. 오른쪽 위의 “고무막 당기기” 단추를 눌러도 돼요. 부피와 압력 막대를 함께 봐요.',
          setup() { setScene('model'); MD.cardsOn = false; MD.stage = 0; MD.maxPull = 0; MD.lock = false; syncModelUI(); showHint('🧪 노란 손잡이를 아래로 당겨요', 7000); },
          check: () => MD.stage >= 2,
          hold: 0.4,
          status: () => mark(MD.stage >= 1) + ' 당겨서 풍선 부풀리기 · ' + mark(MD.stage >= 2) + ' 놓아서 풍선 줄이기',
          explain: '고무막을 아래로 당기면 병 속 공간의 <b>부피가 커지고 압력이 낮아져요</b>. 그러면 바깥 공기가 Y자 관을 통해 풍선 속으로 들어와 풍선이 부풀어요. 고무막을 놓으면 반대로 일어나요.',
        }, 'pull'),
        ids({
          title: '모형과 몸의 부분 짝짓기', manual: true,
          goal: '모형의 각 부분이 나타내는 <b>몸의 부분</b> 카드를 알맞은 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '고무풍선은 공기가 들어가고 나가는 곳이에요. 고무막은 위아래로 움직이는 근육이고, 페트병은 폐가 들어 있는 가슴 속 공간이에요.',
          setup() { setScene('model'); MD.cardsOn = true; MD.flag = {}; MD.lock = false; MD.cards.setup(MD.cards.cards, MD.cards.targets); syncModelUI(); showHint('📇 몸의 부분 카드를 끌어 모형 칸에 놓아요', 6500); },
          status: () => '놓은 카드: <b>' + MD.cards.cards.filter((c) => c.slot).length + ' / 4</b>',
          check() {
            const cs = MD.cards.cards, un = cs.filter((c) => !c.slot);
            if (un.length) return '아직 놓지 않은 카드가 있어요. (' + un.length + '장 남음)';
            const bad = cs.filter((c) => c.slot !== c.id);
            bad.forEach((c) => { if (!MD.flag[c.id]) { MD.flag[c.id] = true; c.shake = 1; c.mark = 'bad'; } });
            if (bad.length) return '<b>' + bad.map((c) => c.label).join(', ') + '</b> 카드의 자리가 맞지 않아요. 모형에서 풍선, 고무막, 병이 몸의 어느 부분과 같은 일을 하는지 생각해 봐요.';
            cs.forEach((c) => { c.mark = 'ok'; });
            return true;
          },
          explain: '<b>페트병</b>은 폐가 들어 있는 <b>흉강</b>, <b>고무풍선</b>은 <b>폐</b>, <b>고무막</b>은 <b>가로막</b>, <b>Y자 관</b>은 <b>기관과 기관지</b>를 나타내요.',
        }, 'match'),
        {
          type: 'quiz', title: '고무막을 당기면?',
          goal: '고무막을 아래로 당기면 병 속 공간의 <b>부피</b>와 <b>압력</b>은 어떻게 될까요?',
          setup() { setScene('model'); MD.cardsOn = false; },
          choices: ['부피는 커지고, 압력은 낮아져요', '부피는 커지고, 압력도 높아져요', '부피는 작아지고, 압력은 높아져요', '부피는 작아지고, 압력도 낮아져요'],
          answer: 0,
          feedback: ['', '부피가 커지면 같은 양의 기체가 더 넓게 퍼져서 압력이 낮아져요. 막대의 변화를 다시 봐요.', '이것은 고무막을 놓았을 때(날숨)에 가까워요. 아래로 당기면 병 속 공간이 커져요.', '부피가 작아지면 기체가 좁은 곳에 모여 압력이 높아져요.'],
          explain: '고무막을 당기면 병 속 <b>부피가 커지고 압력이 낮아져요</b>. 바깥 공기의 압력이 더 높으므로 공기가 풍선 속으로 밀려 들어가요.',
        },
      ],
    },
    /* ---------- 3단계 · 설명 ---------- */
    {
      title: '들숨과 날숨', short: '들숨과 날숨', icon: '💨', phase: '설명',
      features: ['chest'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 고무막을 당기면 병 속 부피가 커지고 압력이 낮아져 풍선이 부푸는 것을 모형으로 확인했어요.</div>' +
        '<p>우리 몸에서는 <b>갈비뼈</b>와 <b>가로막</b>이 모형의 고무막처럼 움직여서 가슴 속 공간(<b>흉강</b>)의 부피를 바꿔요. 갈비뼈와 가로막을 직접 끌어 움직여서 <b>들숨</b>과 <b>날숨</b>이 어떻게 만들어지는지 알아봐요.</p>',
      setup() { setScene('chest'); },
      recap: '<b>들숨</b>: 갈비뼈 올라가고 가로막 내려가요 → 흉강 부피↑, 압력↓ → 공기 들어와요. <b>날숨</b>은 반대예요.',
      summary: '<ul><li><b>들숨</b>: 갈비뼈 <b>올라가고</b> 가로막 <b>내려감</b> → 흉강 부피 <b>증가</b>, 압력 <b>감소</b> → 공기가 <b>들어옴</b></li>' +
        '<li><b>날숨</b>: 갈비뼈 <b>내려가고</b> 가로막 <b>올라감</b> → 흉강 부피 <b>감소</b>, 압력 <b>증가</b> → 공기가 <b>나감</b></li>' +
        '<li>폐는 근육이 없어서 스스로 움직이지 못하고, 흉강의 부피 변화에 따라 부풀거나 줄어들어요.</li></ul>',
      missions: [
        ids({
          title: '들숨 만들기',
          goal: '<b>갈비뼈를 위로</b> 올리고 <b>가로막을 아래로</b> 내려서 폐를 가득 부풀리세요.',
          hint: '노란색 손잡이(갈비뼈)는 위로, 빨간색 손잡이(가로막)는 아래로 끌어요. 두 가지를 모두 해야 흉강 부피가 가장 커져요.',
          setup() { setScene('chest'); CH.auto = false; syncChestUI(); showHint('🫁 두 손잡이를 끌어 숨을 들이쉬어 봐요', 7000); },
          check: () => CH.rib >= 0.8 && CH.dia >= 0.8 && CH.L >= 0.75,
          hold: 0.6,
          status: () => mark(CH.rib >= 0.8) + ' 갈비뼈 올리기 · ' + mark(CH.dia >= 0.8) + ' 가로막 내리기 · ' + mark(CH.L >= 0.75) + ' 폐가 부풀기',
          explain: '갈비뼈가 <b>올라가고</b> 가로막이 <b>내려가면</b> 흉강의 <b>부피가 커지고 압력이 낮아져요</b>. 그러면 바깥 공기가 기관을 지나 폐로 들어와요. 이것이 <b>들숨</b>이에요.',
        }, 'inhale'),
        ids({
          title: '날숨 만들기',
          goal: '이번에는 반대로 <b>갈비뼈를 아래로</b> 내리고 <b>가로막을 위로</b> 올려서 폐 속 공기를 내보내세요.',
          hint: '노란색 손잡이는 아래로, 빨간색 손잡이는 위로 끌어요. 폐가 쪼그라들면서 공기가 나가요.',
          setup() { setScene('chest'); CH.auto = false; syncChestUI(); CH.touched = true; SciSim.tween(CH, { rib: 1, dia: 1 }, { duration: 0.9, ease: 'outCubic' }); showHint('💨 이제 반대로 움직여 숨을 내쉬어 봐요', 7000); },
          check: () => CH.sawIn && CH.rib <= 0.25 && CH.dia <= 0.25 && CH.L <= 0.3,
          hold: 0.6,
          status: () => mark(CH.rib <= 0.25) + ' 갈비뼈 내리기 · ' + mark(CH.dia <= 0.25) + ' 가로막 올리기 · ' + mark(CH.L <= 0.3) + ' 폐가 줄어들기',
          explain: '갈비뼈가 <b>내려가고</b> 가로막이 <b>올라가면</b> 흉강의 <b>부피가 줄고 압력이 높아져요</b>. 그러면 폐 속 공기가 밖으로 나가요. 이것이 <b>날숨</b>이에요.',
        }, 'exhale'),
        {
          type: 'quiz', title: '들숨일 때 몸의 움직임',
          goal: '숨을 <b>들이쉴 때</b> 갈비뼈와 가로막은 어떻게 움직일까요?',
          setup() { setScene('chest'); },
          choices: ['갈비뼈는 올라가고, 가로막은 내려가요', '갈비뼈는 내려가고, 가로막은 올라가요', '갈비뼈와 가로막이 모두 올라가요', '갈비뼈와 가로막이 모두 내려가요'],
          answer: 0,
          feedback: ['', '이것은 날숨일 때의 움직임이에요. 들숨에서는 흉강의 부피가 커져야 해요.', '가로막이 올라가면 흉강 부피가 작아져요. 들숨에서 가로막은 내려가요.', '갈비뼈가 내려가면 흉강 부피가 작아져요. 들숨에서 갈비뼈는 올라가요.'],
          explain: '들숨에서는 갈비뼈가 <b>올라가고</b> 가로막이 <b>내려가</b> 흉강의 부피가 커져요. 부피가 커지면 압력이 낮아져 공기가 들어와요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '폐포에서의 기체 교환', short: '기체 교환', icon: '🔬', phase: '적용',
      features: ['alveoli'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 갈비뼈와 가로막의 움직임으로 공기가 폐 속까지 들어오는 것을 알았어요.</div>' +
        '<p>폐 속에는 공기주머니 <b>폐포</b>가 아주 많고, 폐포는 <b>모세 혈관</b>으로 둘러싸여 있어요. 폐포 하나를 확대해서 <b>산소</b>와 <b>이산화 탄소</b>가 어떻게 교환되는지 살펴봐요. 기체는 농도가 높은 곳에서 낮은 곳으로 저절로 이동해요. 이것을 <b>확산</b>이라고 해요.</p>',
      setup() { setScene('alveoli'); },
      recap: '<b>산소</b>는 폐포 → 혈액, <b>이산화 탄소</b>는 혈액 → 폐포로 <b>확산</b>해요. 폐포가 많아 표면적이 넓어요.',
      summary: '<ul><li>폐포와 모세 혈관 사이에서 <b>기체 교환</b>이 일어나요.</li>' +
        '<li><b>산소</b>: 농도가 높은 폐포 → 낮은 혈액 / <b>이산화 탄소</b>: 농도가 높은 혈액 → 낮은 폐포 (<b>확산</b>)</li>' +
        '<li>폐포는 아주 많아서 공기와 닿는 <b>표면적이 넓고</b>, 벽이 얇아 기체 교환이 잘 일어나요.</li>' +
        '<li>운동할 때는 이산화 탄소가 더 많이 생겨서 호흡이 빨라져요.</li></ul>',
      missions: [
        ids({
          title: '쉴 때의 기체 교환 관찰',
          goal: '운동 강도를 <b>쉬는 중</b>으로 두고, 산소(O₂) <b>5개</b>와 이산화 탄소(CO₂) <b>5개</b>가 이동하는 것을 지켜보세요.',
          hint: '파란 입자(O₂)는 폐포에서 혈액으로, 회색 입자(CO₂)는 혈액에서 폐포로 이동해요. 적혈구가 점점 선홍색이 되는 것도 봐요.',
          setup() { setScene('alveoli'); AL.ex = 0; const s = $('#sEx'); s.value = 0; s.dispatchEvent(new Event('input')); AL.restO2 = AL.restCO2 = AL.exO2 = AL.exCO2 = 0; showHint('🔬 입자가 이동하는 모습을 지켜봐요', 6500); },
          check: () => AL.restO2 >= 5 && AL.restCO2 >= 5,
          hold: 0.5,
          status: () => 'O₂ 이동 <b>' + Math.min(AL.restO2, 5) + ' / 5</b> · CO₂ 이동 <b>' + Math.min(AL.restCO2, 5) + ' / 5</b>',
          explain: '폐포 속은 산소 농도가 <b>높고</b> 혈액은 <b>낮아서</b> 산소가 폐포에서 혈액으로 <b>확산</b>해요. 이산화 탄소는 혈액의 농도가 <b>높아서</b> 혈액에서 폐포로 확산해요.',
        }, 'rest'),
        ids({
          title: '운동할 때의 기체 교환',
          goal: '운동 강도를 <b>달리는 중</b>(0.7 이상)으로 올리고, O₂ <b>8개</b>와 CO₂ <b>10개</b>가 이동하는 것을 지켜보세요.',
          hint: '“운동 강도” 슬라이더를 오른쪽 끝 쪽으로 밀어요. 혈액이 빨리 흐르고 숨도 빨라져요. 쉴 때보다 훨씬 많이 이동할까요?',
          setup() { setScene('alveoli'); AL.exO2 = AL.exCO2 = 0; showHint('🏃 운동 강도를 오른쪽으로 밀어 봐요', 6500); },
          check: () => AL.ex >= 0.7 && AL.exO2 >= 8 && AL.exCO2 >= 10,
          hold: 0.5,
          status: () => mark(AL.ex >= 0.7) + ' 운동 강도 0.7 이상<br>O₂ 이동 <b>' + Math.min(AL.exO2, 8) + ' / 8</b> · CO₂ 이동 <b>' + Math.min(AL.exCO2, 10) + ' / 10</b>',
          explain: '운동하면 세포가 에너지를 더 많이 쓰므로 산소가 더 필요하고 <b>이산화 탄소가 더 많이 생겨요</b>. 혈액의 이산화 탄소 농도가 더 높아져 확산이 더 활발해지고, 호흡도 빨라져요.',
        }, 'ex'),
        {
          type: 'quiz', title: '폐포가 많은 까닭', figure: FIG_ALV,
          goal: '폐 속에 작은 <b>폐포</b>가 아주 많은 까닭은 무엇일까요?',
          setup() { setScene('alveoli'); },
          choices: ['공기와 닿는 표면적이 넓어져 기체 교환이 잘 일어나기 때문이에요', '공기를 폐 속에 오래 가둬 두기 위해서예요', '폐가 스스로 근육처럼 움직이게 하려고요', '폐에서 혈액을 만들기 위해서예요'],
          answer: 0,
          feedback: ['', '공기는 호흡 운동으로 드나들어요. 폐포가 많은 까닭은 기체 교환 면적을 넓히는 거예요.', '폐에는 근육이 없어요. 폐포는 움직이는 일이 아니라 기체 교환을 해요.', '혈액은 뼈속(골수)에서 만들어져요. 폐포는 기체 교환 장소예요.'],
          explain: '폐포가 많으면 공기와 혈액이 맞닿는 <b>표면적이 매우 넓어져서</b> 산소와 이산화 탄소를 한꺼번에 많이 교환할 수 있어요.',
        },
      ],
    },
  ];

  /* ---------- 시작 ---------- */
  game = SciSim.game({
    simId: 'm2-breathing',
    mount: '#game',
    badge: '호흡 탐험가',
    homeHref: '../../index.html#g2',
    featureLabels: {
      airway: '🫁 호흡 기관 그림',
      model: '🧪 호흡 운동 모형',
      chest: '💨 갈비뼈·가로막 움직이기',
      alveoli: '🔬 폐포 확대(기체 교환)',
    },
    onFeatures(set) { F = new Set(set); },
    onMissionStart() { hideHint(); },
    onComplete() { AW.cardsOn = false; MD.cardsOn = false; },
    levels,
  });

  window.__sim = {
    S, AW, MD, CH, AL, setScene, game,
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x / W) * r.width, y: r.top + ((y + YOFF) / H) * r.height }; },
    cardP(set, id) { const c = set.cards.find((q) => q.id === id); return this.toClient(c.x + c.w / 2, c.y + c.h / 2); },
    targetP(set, id) { const t = set.targets.find((q) => q.id === id); return this.toClient(t.x + t.w / 2, t.y + t.h / 2 + 10); },
    knobP() { return this.toClient(MX, MY0 + 62 * MD.d + 32); },
    pullTo(d) { return this.toClient(MX, MY0 + 32 + 62 * d); },
    ribP() { const p = chestHandleRib(); return this.toClient(p.x, p.y); },
    diaP() { const p = chestHandleDia(); return this.toClient(p.x, p.y); },
    pt(x, y) { return this.toClient(x, y); },
  };

  SciSim.loop((dt, t) => {
    if (S.scene === 'airway') updateAirway(dt, t);
    else if (S.scene === 'model') updateModel(dt, t);
    else if (S.scene === 'chest') updateChest(dt, t);
    else updateAlveoli(dt, t);
    PFX.update(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(0, YOFF);
    if (S.scene === 'airway') drawAirway(t);
    else if (S.scene === 'model') drawModel(t);
    else if (S.scene === 'chest') drawChest(t);
    else drawAlveoli(t);
    PFX.draw(ctx);
    ctx.restore();
    drawHint();
  });
})();
