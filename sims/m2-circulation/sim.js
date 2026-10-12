/* =========================================================
   중2 Ⅵ. 동물과 에너지 — 순환계와 혈액 순환 [9과13-02]
   ① [관찰] 심장: 네 개의 방 · 판막 · 박동
   ② [탐구] 혈관(동맥·정맥·모세 혈관)과 혈액(혈장·적혈구·백혈구·혈소판)
   ③ [모형] 혈액의 순환 경로: 폐순환 · 체순환, 동맥혈과 정맥혈
   ④ [적용] 경로 순서 카드로 종합하기
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
    constructor() { this.cards = []; this.targets = []; this.drag = null; this.enabled = false; this.hover = null; }
    setup(cards, targets) {
      this.cards = cards; this.targets = targets; this.drag = null; this.hover = null;
      cards.forEach((c) => { c.slot = null; c.x = c.hx; c.y = c.hy; c.lift = 0; c.shake = 0; c.mark = null; if (c.w == null) c.w = 110; if (c.h == null) c.h = 44; });
    }
    targetOf(c) { return c.slot ? this.targets.find((t) => t.id === c.slot) : null; }
    restPos(c) { const t = this.targetOf(c); return t ? { x: t.x + t.w / 2 - c.w / 2, y: t.y + t.h / 2 - c.h / 2 } : { x: c.hx, y: c.hy }; }
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
  const BLUE = '#3f6fd8', BLUE_L = '#cfdcf8', BLUE_D = '#2447a8';
  const RED = '#e5383b', RED_L = '#fbd0d0', RED_D = '#a61e2a';
  const WALL = '#d9788a', WALL_D = '#a83c52';
  const bloodCol = (side) => (side === 'L' ? RED : BLUE);

  /* =========================================================
     장면 ① 심장: 네 개의 방 · 판막 · 박동
     ========================================================= */
  const HBX = 38;                                    // 심장 그림 가로 이동
  const mxp = (p) => [564 - p[0], p[1]];
  const RA_PTS = [[176, 300], [200, 276], [240, 272], [270, 292], [274, 340], [256, 372], [212, 376], [180, 352]];
  const RV_PTS = [[172, 410], [226, 394], [276, 396], [280, 450], [276, 510], [282, 560], [236, 536], [200, 490], [180, 446]];
  const CHAM = {
    RA: { pts: RA_PTS, side: 'R', atrium: true, name: '우심방', wall: 12 },
    LA: { pts: RA_PTS.map(mxp), side: 'L', atrium: true, name: '좌심방', wall: 12 },
    RV: { pts: RV_PTS, side: 'R', atrium: false, name: '우심실', wall: 16 },
    LV: { pts: RV_PTS.map(mxp), side: 'L', atrium: false, name: '좌심실', wall: 24 },
  };
  Object.keys(CHAM).forEach((k) => {
    const c = CHAM[k];
    c.cx = c.pts.reduce((a, p) => a + p[0], 0) / c.pts.length; c.cy = c.pts.reduce((a, p) => a + p[1], 0) / c.pts.length;
    if (!c.atrium) c.cy -= 10;
    c.k = 0;
  });
  const HR_KEYS = [[222, 150], [222, 240], [224, 300], [226, 350], [226, 386], [232, 430], [226, 478], [196, 458], [168, 432], [152, 404], [150, 350], [150, 240], [138, 190], [96, 168]];
  const HL_KEYS = HR_KEYS.map(mxp);
  const H_AVI = 4, H_SLI = 9;                        // 방실 판막·동맥 판막이 있는 키 번호
  function buildHeartPath(keys) {
    const poly = splineSample(keys, 10);
    // 키 번호에 해당하는 길이 s
    const sOf = (i) => poly[i * 10][2];
    return { poly, L: poly[poly.length - 1][2], gAV: sOf(H_AVI), gSL: sOf(H_SLI) };
  }
  const HP = { R: buildHeartPath(HR_KEYS), L: buildHeartPath(HL_KEYS) };
  const HT = {
    ph: 0.6, rate: 0.8, paused: false, beats: 0, slowBeats: 0, dots: { R: [], L: [] },
    av: { R: new SciSim.Spring(1, { stiffness: 220, damping: 20 }), L: new SciSim.Spring(1, { stiffness: 220, damping: 20 }) },
    sl: { R: new SciSim.Spring(0, { stiffness: 220, damping: 20 }), L: new SciSim.Spring(0, { stiffness: 220, damping: 20 }) },
    cA: 0, cV: 0, pulse: 0, cards: new CardSet(), cardsOn: false, valveTip: null, flag: {}, seenAV: 0,
  };
  function initHeart() {
    ['R', 'L'].forEach((sd) => {
      const P = HP[sd], R = rng(sd === 'R' ? 11 : 29), n = 32;
      HT.dots[sd] = [];
      for (let i = 0; i < n; i++) HT.dots[sd].push({ s: (i / n) * P.L * 0.98, lane: (R() - 0.5) * 2, ph: R() * 6.28 });
    });
    const tg = ['RA', 'RV', 'LA', 'LV'].map((k) => ({ id: k, x: CHAM[k].cx + HBX - 50, y: CHAM[k].cy - 17, w: 100, h: 34, hide: false, r: 17 }));
    const cs = [['LV', '좌심실'], ['RA', '우심방'], ['LA', '좌심방'], ['RV', '우심실']].map((a, i) => ({ id: a[0], label: a[1], hx: 572 + (i % 2) * 108, hy: 386 + Math.floor(i / 2) * 58, w: 98, h: 42, color: CHAM[a[0]].side === 'R' ? BLUE : RED, fs: 16 }));
    HT.cards.setup(cs, tg);
    HT.flag = {};
  }
  const PH_TXT = [
    { k: 'atrial', ic: '①', t: '심방 수축', d: '심방이 줄어들어 혈액을 심실로 밀어 넣어요. 방실 판막이 열려 있어요.' },
    { k: 'vent', ic: '②', t: '심실 수축', d: '심실이 힘껏 줄어들어 혈액을 동맥으로 내보내요. 방실 판막이 닫혀 혈액이 거꾸로 흐르지 않아요.' },
    { k: 'dia', ic: '③', t: '이완', d: '심방과 심실이 쉬어요. 혈액이 정맥에서 심방으로 들어와요. 동맥 판막이 닫혀요.' },
  ];
  function phaseIdx(ph) { return ph < 0.14 ? 0 : ph < 0.48 ? 1 : 2; }
  const bump = (ph, a, b) => (ph > a && ph < b ? Math.sin(Math.PI * (ph - a) / (b - a)) : 0);
  function updateHeart(dt, t) {
    HT.cards.update(dt);
    const going = !HT.paused;
    if (going) {
      const old = HT.ph;
      HT.ph += dt * HT.rate * 1.18;
      if (HT.ph >= 1) {
        HT.ph -= 1;
        if (S.scene === 'heart') { HT.beats++; if (HT.rate <= 0.55) HT.slowBeats++; }
        Sound.tone(150, 0.07, 'sine', 0.06);
      }
    }
    const ph = HT.ph;
    const avOpen = ph >= 0.5 || ph < 0.14, slOpen = ph >= 0.17 && ph < 0.47;
    HT.cA = SciSim.approach(HT.cA, bump(ph, 0, 0.16), dt, 30);
    HT.cV = SciSim.approach(HT.cV, bump(ph, 0.14, 0.5), dt, 30);
    HT.pulse = SciSim.approach(HT.pulse, HT.cV, dt, 20);
    ['R', 'L'].forEach((sd) => {
      HT.av[sd].target = avOpen ? 1 : 0; HT.sl[sd].target = slOpen ? 1 : 0;
      HT.av[sd].update(dt); HT.sl[sd].update(dt);
    });
    ['atria', 'vent'].forEach(() => {});
    CHAM.RA.k = CHAM.LA.k = HT.cA; CHAM.RV.k = CHAM.LV.k = HT.cV;
    // 혈액 입자
    if (going || true) {
      ['R', 'L'].forEach((sd) => {
        const P = HP[sd], list = HT.dots[sd];
        list.sort((a, b) => a.s - b.s);
        const avO = HT.av[sd].value > 0.55, slO = HT.sl[sd].value > 0.55;
        const vent = ph >= 0.14 && ph < 0.5;
        for (let i = list.length - 1; i >= 0; i--) {
          const d = list[i], ahead = i < list.length - 1 ? list[i + 1].s : 1e9;
          let v;
          if (d.s < P.gAV - 70) v = 50 + (ph < 0.18 && d.s > P.gAV - 150 ? 100 : 0);
          else if (d.s < P.gAV) v = avO ? 110 : 8;
          else if (d.s < P.gSL - 36) v = vent ? 150 : 34;
          else if (d.s < P.gSL) v = slO ? 190 : 0;
          else v = vent ? 120 : 50;
          if (!going) v = 0;
          let ns = d.s + v * dt * Math.max(0.5, HT.rate);
          ns = Math.min(ns, ahead - 13);
          if (d.s < P.gAV - 2 && !avO) ns = Math.min(ns, P.gAV - 7);
          if (d.s < P.gSL - 2 && !slO) ns = Math.min(ns, P.gSL - 7);
          if (ns > d.s) d.s = ns;
          if (d.s > P.L - 1) { d.s = 0; d.lane = (Math.random() - 0.5) * 2; }
        }
      });
    }
  }
  function leaflet(x0, y0, x1, y1, w) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8a6a1d'; ctx.lineWidth = w + 2.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = '#f6dc8f'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
  }
  function chamberPath(c, k) {
    ctx.beginPath();
    const s = 1 - 0.1 * k;
    const pts = c.pts.map((p) => [c.cx + (p[0] - c.cx) * s, c.cy + (p[1] - c.cy) * s]);
    smooth(ctx, pts, true);
  }
  function drawChamber(c, t) {
    const k = c.k;
    ctx.save();
    chamberPath(c, k);
    ctx.fillStyle = rgrad(c.cx - 20, c.cy - 30, 6, c.cx, c.cy, 90, c.side === 'L' ? [[0, '#ffe0e0'], [0.6, RED_L], [1, '#f3a6a6']] : [[0, '#e8efff'], [0.6, BLUE_L], [1, '#a8bdf0']]);
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = WALL_D; ctx.lineWidth = c.wall + 3; ctx.stroke();
    ctx.strokeStyle = lgrad(c.cx - 60, c.cy - 70, c.cx + 60, c.cy + 70, [[0, '#f09aab'], [1, WALL]]); ctx.lineWidth = c.wall; ctx.stroke();
    ctx.restore();
  }
  function drawVesselTube(poly, side) {
    ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    strokePoly(poly, 0, poly[poly.length - 1][2]);
    ctx.strokeStyle = side === 'L' ? RED_D : BLUE_D; ctx.lineWidth = 34; ctx.stroke();
    strokePoly(poly, 0, poly[poly.length - 1][2]);
    ctx.strokeStyle = side === 'L' ? '#e9858a' : '#7a9be8'; ctx.lineWidth = 29; ctx.stroke();
    strokePoly(poly, 0, poly[poly.length - 1][2]);
    ctx.strokeStyle = side === 'L' ? RED_L : BLUE_L; ctx.lineWidth = 22; ctx.stroke();
    ctx.restore();
  }
  function drawValves(t) {
    ['R', 'L'].forEach((sd) => {
      const P = HP[sd], o = HT.av[sd].value, so = HT.sl[sd].value;
      const a = atLen(P.poly, P.gAV), b = atLen(P.poly, P.gSL);
      // 방실 판막: 열리면 심실 쪽으로 벌어짐
      const w = 30;
      leaflet(a.x - w, a.y - 2, a.x - w + 6 + o * 4 + (1 - o) * (w - 8), a.y + 4 + o * 24, 5.5);
      leaflet(a.x + w, a.y - 2, a.x + w - 6 - o * 4 - (1 - o) * (w - 8), a.y + 4 + o * 24, 5.5);
      // 동맥 판막
      const ww = 14, dir = b.a;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(dir + Math.PI / 2);
      leaflet(-ww, 0, -ww + (1 - so) * (ww - 2) + so * 2, (1 - so) * 6 - so * 16, 4.5);
      leaflet(ww, 0, ww - (1 - so) * (ww - 2) - so * 2, (1 - so) * 6 - so * 16, 4.5);
      ctx.restore();
    });
  }
  function drawHeartDots(t) {
    ['R', 'L'].forEach((sd) => {
      const P = HP[sd], col = bloodCol(sd);
      HT.dots[sd].forEach((d) => {
        const q = atLen(P.poly, d.s);
        // 방에서는 넓게 퍼짐
        const inAtr = smoothstep(P.gAV - 120, P.gAV - 60, d.s) * (1 - smoothstep(P.gAV - 10, P.gAV + 2, d.s));
        const inVen = smoothstep(P.gAV, P.gAV + 24, d.s) * (1 - smoothstep(P.gSL - 70, P.gSL - 30, d.s));
        const wd = 5 + inAtr * 24 + inVen * 24;
        const nx = -Math.sin(q.a), ny = Math.cos(q.a);
        const wob = RM ? 0 : Math.sin(t * 2.4 + d.ph) * 2;
        const off = d.lane * wd + wob;
        bead(q.x + nx * off, q.y + ny * off, 5.6, col, { noShadow: true });
      });
    });
  }
  function drawHeartLabels(t) {
    const L = [['대정맥', 222, 106, '▼ 온몸에서', BLUE_D], ['폐동맥', 104, 110, '폐로 ▶', BLUE_D], ['폐정맥', 342, 106, '▼ 폐에서', RED_D], ['대동맥', 458, 110, '온몸으로 ▶', RED_D]];
    L.forEach((l) => {
      pill(l[0], l[1], l[2], { size: 14, bg: '#fff', color: l[4], border: l[4], borderW: 2, h: 26, pad: 10, shadow: true });
      txt(l[3], l[1], l[2] + 24, { size: 12.5, weight: 800, color: l[4], align: 'center' });
    });
  }
  function drawHeart(t) {
    ctx.save();
    ctx.translate(HBX, 0);
    const pl = 1 + 0.028 * HT.pulse;
    ctx.translate(282, 440); ctx.scale(pl, pl); ctx.translate(-282, -440);
    // 부드러운 그림자
    ctx.save(); ctx.fillStyle = 'rgba(60,30,40,.10)'; ctx.beginPath(); ctx.ellipse(290, 585, 150, 12, 0, 0, TAU); ctx.fill(); ctx.restore();
    drawVesselTube(HP.R.poly, 'R'); drawVesselTube(HP.L.poly, 'L');
    // 중격(두 심실 사이)
    drawChamber(CHAM.RV, t); drawChamber(CHAM.LV, t); drawChamber(CHAM.RA, t); drawChamber(CHAM.LA, t);
    drawValves(t);
    drawHeartDots(t);
    ctx.restore();
    ctx.save(); ctx.translate(HBX, 0);
    drawHeartLabels(t);
    // 판막 이름표
    if (!HT.cardsOn) {
      ['R', 'L'].forEach((sd) => {
        const P = HP[sd], a = atLen(P.poly, P.gAV), b = atLen(P.poly, P.gSL);
        const side = sd === 'R' ? -1 : 1;
        [[a, 62], [b, 54]].forEach((q, i) => {
          const x1 = q[0].x + side * q[1] * (i ? 0.9 : 1), y1 = q[0].y + (i ? 0 : 0);
          ctx.strokeStyle = 'rgba(100,80,20,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(q[0].x + side * 16, q[0].y); ctx.lineTo(x1 - side * 18, y1); ctx.stroke(); ctx.setLineDash([]);
        });
      });
    }
    ctx.restore();
    ctx.save(); ctx.translate(HBX, 0);
    if (!HT.cardsOn) ['R', 'L'].forEach((sd) => {
      const P = HP[sd], a = atLen(P.poly, P.gAV), b = atLen(P.poly, P.gSL);
      const side = sd === 'R' ? -1 : 1;
      pill('판막', a.x + side * 78, a.y, { size: 13, bg: '#fff3c4', color: '#7a5a00', border: '#d4a72c', borderW: 1.5, h: 24, pad: 9 });
      pill('판막', b.x + side * 66, b.y, { size: 13, bg: '#fff3c4', color: '#7a5a00', border: '#d4a72c', borderW: 1.5, h: 24, pad: 9 });
    });
    // 방 이름 (카드로 붙인 뒤)
    ctx.restore();
    // 마주 보는 모습 안내
    pill('🧍 그림은 마주 본 모습이에요 (몸의 오른쪽 = 그림의 왼쪽)', 276 + HBX, 598, { size: 12.5, bg: 'rgba(255,255,255,.85)', color: '#475569', h: 24, pad: 10 });
    drawHeartPanel(t);
    if (HT.cardsOn) { drawHeartCardsExtra(t); HT.cards.draw(t); }
  }
  function drawHeartPanel(t) {
    const x = 552, y = 40, w = 238, h = 320;
    panel(x, y, w, h, { r: 18 });
    const idx = phaseIdx(HT.ph), P = PH_TXT[idx];
    txt('지금 심장은', x + 16, y + 28, { size: 14, weight: 800, color: '#64748b' });
    // 3단계 표시
    PH_TXT.forEach((q, i) => {
      const cx = x + 40 + i * 79, on = i === idx;
      ctx.save();
      ctx.fillStyle = on ? '#e5484d' : '#e5e9ef';
      ctx.beginPath(); ctx.arc(cx, y + 64, on ? 20 : 17, 0, TAU); ctx.fill();
      txt(q.ic, cx, y + 65, { size: on ? 19 : 16, weight: 800, color: on ? '#fff' : '#94a3b8', align: 'center', base: 'middle' });
      txt(q.t, cx, y + 100, { size: 12.5, weight: 800, color: on ? '#b91c1c' : '#94a3b8', align: 'center' });
      ctx.restore();
    });
    // 설명
    const lines = wrapLines(P.d, w - 32, 14);
    lines.forEach((ln, i) => txt(ln, x + 16, y + 132 + i * 22, { size: 14, weight: 700, color: '#1b2333' }));
    // 범례
    const ly = y + 232;
    ctx.fillStyle = '#f1f5f9'; rr(x + 12, ly - 8, w - 24, 84, 12); ctx.fill();
    bead(x + 30, ly + 14, 8, RED, { noShadow: true }); txt('산소가 많은 혈액', x + 46, ly + 19, { size: 14, weight: 800, color: RED_D });
    bead(x + 30, ly + 46, 8, BLUE, { noShadow: true }); txt('산소가 적은 혈액', x + 46, ly + 51, { size: 14, weight: 800, color: BLUE_D });
    txt('(왼쪽 심장 = 빨강, 오른쪽 심장 = 파랑)', x + 18, ly + 72, { size: 11.5, weight: 700, color: '#64748b' });
  }
  function wrapLines(s, maxW, size) {
    ctx.font = font(size, 700);
    const out = []; let cur = '';
    for (const ch of s) {
      const test = cur + ch;
      if (ctx.measureText(test).width > maxW && cur) { out.push(cur.trim()); cur = ch; } else cur = test;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function drawHeartCardsExtra(t) {
    txt('🏷️ 이름표를 알맞은 방에 놓아요', 568, 380, { size: 14, weight: 800, color: '#15803d' });
    ['RA', 'RV', 'LA', 'LV'].forEach((k) => {
      const c = CHAM[k], tg = HT.cards.targets.find((q) => q.id === k);
      const placed = HT.cards.cards.find((q) => q.slot === k);
      // 방의 위치를 가리키는 점선 원
      ctx.save(); ctx.translate(HBX, 0);
      ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(21,128,61,.55)'; ctx.lineWidth = 2.2;
      if (!placed) { ctx.beginPath(); ctx.arc(c.cx, c.cy + 24, 18 + (RM ? 0 : Math.sin(t * 4 + c.cx) * 2), 0, TAU); ctx.stroke(); }
      ctx.restore();
    });
  }
  const heartHandlers = {
    down(p) { return HT.cards.down(p); },
    move(p) { HT.cards.move(p); },
    up() { HT.cards.up(); },
    hover(p) { return HT.cards.cursor(p); },
  };

  /* =========================================================
     장면 ② 혈관: 동맥 · 정맥 · 모세 혈관
     ========================================================= */
  const VPW = 236, VPH = 372, VPY = 40, VPX = [28, 274, 520];
  const VESSELS = [
    { k: 'artery', name: '동맥', cap: '심장에서 나가는 혈액', callout: ['두껍고 탄력 있는 벽', '힘 있게 나가는 혈액을 견뎌요'], col: RED },
    { k: 'vein', name: '정맥', cap: '심장으로 돌아오는 혈액', callout: ['얇은 벽 + 판막', '혈액이 거꾸로 흐르지 않아요'], col: BLUE },
    { k: 'cap', name: '모세 혈관', cap: '동맥과 정맥을 이어요', callout: ['한 층의 세포로 된 벽', '산소·영양소 ↔ 이산화 탄소·노폐물'], col: '#a855f7' },
  ];
  const VS = { cards: new CardSet(), cardsOn: false, sel: -1, solved: false, flag: {}, rb: [], gas: [], pulseT: 0, glow: [0, 0, 0] };
  function initVessel() {
    const R = rng(7);
    VS.rb = [];
    for (let i = 0; i < 3; i++) { const arr = []; const n = i === 2 ? 5 : 8; for (let j = 0; j < n; j++) arr.push({ x: (j / n) * 210, y: (R() - 0.5) * 2, ph: R() * 6 }); VS.rb.push(arr); }
    VS.gas = [];
    const defs = [
      { id: 'artery', lines: ['벽이 두껍고 탄력이 있어요', '심장에서 나가는 혈액이 흘러요'], color: RED },
      { id: 'vein', lines: ['벽이 얇고 판막이 있어요', '심장으로 돌아오는 혈액이 흘러요'], color: BLUE },
      { id: 'cap', lines: ['벽이 한 층의 세포로 얇아요', '온몸에 그물처럼 퍼져 있어요'], color: '#a855f7' },
    ];
    const order = [2, 0, 1];
    const cards = order.map((di, i) => Object.assign({ hx: VPX[i] + 7, hy: 446, w: 222, h: 84, fs: 13.5 }, defs[di]));
    const tg = defs.map((d, i) => ({ id: d.id, x: VPX[i] + 7, y: VPY + VPH - 92, w: 222, h: 84, r: 12, hit: { x: VPX[i] - 8, y: VPY - 6, w: VPW + 16, h: VPH + 12 },
      draw(tt, st) {
        ctx.save();
        rr(tt.x, tt.y, tt.w, tt.h, 12);
        ctx.fillStyle = st.hover ? 'rgba(34,197,94,.18)' : 'rgba(241,245,249,.9)'; ctx.fill();
        ctx.setLineDash(st.hover ? [] : [7, 6]); ctx.lineWidth = st.hover ? 3 : 2; ctx.strokeStyle = st.hover ? '#16a34a' : 'rgba(71,85,105,.5)'; ctx.stroke(); ctx.setLineDash([]);
        if (!st.filled && VS.cardsOn) txt('설명 카드를 여기에', tt.x + tt.w / 2, tt.y + tt.h / 2 + 1, { size: 13, weight: 800, color: '#94a3b8', align: 'center', base: 'middle' });
        ctx.restore();
      } }));
    VS.cards.setup(cards, tg);
    VS.flag = {}; VS.sel = -1;
  }
  function updateVessel(dt, t) {
    VS.cards.update(dt);
    VS.pulseT += dt;
    const pulse = Math.pow(0.5 + 0.5 * Math.sin(VS.pulseT * 7.5), 2);
    VS.pulse = pulse;
    VS.rb.forEach((arr, i) => {
      arr.forEach((r) => {
        const v = i === 0 ? 55 + 130 * pulse : i === 1 ? 34 : 30;
        r.x += v * dt; if (r.x > 222) { r.x -= 232; r.y = (Math.random() - 0.5) * 2; }
      });
    });
    // 모세 혈관의 기체 교환 입자
    if (S.scene === 'vessel' && !RM && Math.random() < dt * 2.2) {
      const cx = 30 + Math.random() * 150;
      VS.gas.push({ k: 'o2', x: cx, y: 0, vy: (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 10), vx: 8 + Math.random() * 10, life: 0 });
      VS.gas.push({ k: 'co2', x: 200 - Math.random() * 150, y: (Math.random() < 0.5 ? -1 : 1) * 46, vy: 0, vx: 8, life: 0, tgt: true });
    }
    for (let i = VS.gas.length - 1; i >= 0; i--) {
      const g = VS.gas[i]; g.life += dt;
      if (g.k === 'o2') { g.x += g.vx * dt; g.y += g.vy * dt; if (Math.abs(g.y) > 46) VS.gas.splice(i, 1); }
      else { g.x += g.vx * dt; g.y = g.y - Math.sign(g.y) * 20 * dt; if (Math.abs(g.y) < 7) VS.gas.splice(i, 1); }
    }
    VS.glow.forEach((v, i) => { VS.glow[i] = SciSim.approach(v, VS.sel === i ? 1 : 0, dt, 10); });
  }
  function rbcShape(x, y, rx, ry, col, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.fillStyle = rgrad(-rx * 0.3, -ry * 0.4, 1, 0, 0, Math.max(rx, ry), [[0, shade(col, 0.45)], [0.6, col], [1, shade(col, -0.3)]]);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.4, ry * 0.4, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawVesselPanel(i, t) {
    const v = VESSELS[i], px = VPX[i], py = VPY;
    const hot = VS.cards.hover && VS.cards.hover.id === v.k ? 1 : 0;
    panel(px, py, VPW, VPH, { r: 18, border: hot ? '#16a34a' : (VS.glow[i] > 0.5 ? '#16a34a' : null), bw: 3 });
    ctx.save(); ctx.translate(px, py);
    pill(v.name, VPW / 2, 24, { size: 16, bg: v.col, h: 30, pad: 14, shadow: true });
    txt(v.cap, VPW / 2, 56, { size: 13, weight: 700, color: '#64748b', align: 'center' });
    const cy = 118, x0 = 14, x1 = VPW - 14;
    const pulse = VS.pulse;
    ctx.save(); rr(6, 62, VPW - 12, 120, 12); ctx.clip();
    if (i === 0) {          // ----- 동맥
      const sc = 1 + 0.07 * pulse;
      const h1 = 100 * sc, h2 = 72 * sc, h3 = 40 * (1 + 0.1 * pulse);
      ctx.fillStyle = '#e8c9a0'; rr(x0 - 8, cy - h1 / 2, x1 - x0 + 16, h1, 8); ctx.fill();
      ctx.fillStyle = lgrad(0, cy - h2 / 2, 0, cy + h2 / 2, [[0, '#c95a6c'], [0.5, '#e57a8a'], [1, '#c95a6c']]); ctx.fillRect(x0 - 8, cy - h2 / 2, x1 - x0 + 16, h2);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
      for (let k = 0; k < 9; k++) { const xx = x0 + k * 25 - ((t * 20) % 25) * 0; ctx.beginPath(); ctx.moveTo(xx, cy - h2 / 2 + 5); ctx.lineTo(xx + 8, cy - h3 / 2 - 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(xx, cy + h2 / 2 - 5); ctx.lineTo(xx + 8, cy + h3 / 2 + 2); ctx.stroke(); }
      ctx.fillStyle = '#ffe7e7'; ctx.fillRect(x0 - 8, cy - h3 / 2, x1 - x0 + 16, h3);
      VS.rb[0].forEach((r) => rbcShape(x0 + r.x, cy + r.y * h3 * 0.28, 9, 6.2, RED, Math.sin(r.ph + t) * 0.2));
    } else if (i === 1) {   // ----- 정맥
      const h1 = 84, h3 = 70;
      ctx.fillStyle = '#9fb3e8'; rr(x0 - 8, cy - h1 / 2, x1 - x0 + 16, h1, 8); ctx.fill();
      ctx.fillStyle = '#dbe6ff'; ctx.fillRect(x0 - 8, cy - h3 / 2, x1 - x0 + 16, h3);
      [70, 150].forEach((vx) => {
        leaflet(vx - 14, cy - h3 / 2 + 1, vx + 10, cy - 8, 4);
        leaflet(vx - 14, cy + h3 / 2 - 1, vx + 10, cy + 8, 4);
      });
      VS.rb[1].forEach((r) => rbcShape(x0 + r.x, cy + r.y * 22, 9, 6.2, BLUE, Math.sin(r.ph + t * 0.6) * 0.3));
    } else {                // ----- 모세 혈관
      // 조직 세포
      for (let k = 0; k < 4; k++) for (const sgn of [-1, 1]) {
        const xx = 14 + k * 56 + (sgn > 0 ? 24 : 0), yy = cy + sgn * 40;
        ctx.fillStyle = '#fff0c9'; rr(xx - 26, yy - 19, 52, 38, 14); ctx.fill();
        ctx.strokeStyle = '#e6c984'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#e1a5c4'; ctx.beginPath(); ctx.ellipse(xx, yy, 10, 8, 0, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#c8a1e8'; ctx.fillRect(x0 - 8, cy - 15, x1 - x0 + 16, 30);
      ctx.fillStyle = '#f3e8ff'; ctx.fillRect(x0 - 8, cy - 11, x1 - x0 + 16, 22);
      VS.rb[2].forEach((r) => {
        const fx = clamp(r.x / 210, 0, 1);
        rbcShape(x0 + r.x, cy, 14, 7.2, mix(RED, BLUE, smoothstep(0.15, 0.85, fx)), 0);
      });
      VS.gas.forEach((g) => {
        const gx = x0 + g.x, gy = cy + g.y;
        if (g.k === 'o2') { bead(gx, gy, 3.8, '#38bdf8', { noShadow: true }); }
        else { bead(gx, gy, 3.8, '#6b7280', { noShadow: true }); }
      });
    }
    ctx.restore();
    // 흐름 방향 화살표
    ctx.strokeStyle = 'rgba(71,85,105,.5)'; ctx.fillStyle = 'rgba(71,85,105,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, 76); ctx.lineTo(VPW - 30, 76); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(VPW - 20, 76); ctx.lineTo(VPW - 31, 70); ctx.lineTo(VPW - 31, 82); ctx.fill();
    // 단면
    const ccx = VPW / 2, ccy = 216;
    txt('단면', 16, ccy + 4, { size: 12, weight: 800, color: '#94a3b8' });
    if (i === 0) {
      const r0 = 36 * (1 + 0.04 * pulse);
      ctx.fillStyle = '#e8c9a0'; ctx.beginPath(); ctx.arc(ccx, ccy, r0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d9647a'; ctx.beginPath(); ctx.arc(ccx, ccy, r0 - 8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffe7e7'; ctx.beginPath(); ctx.arc(ccx, ccy, 12, 0, TAU); ctx.fill();
    } else if (i === 1) {
      ctx.fillStyle = '#9fb3e8'; ctx.beginPath(); ctx.ellipse(ccx, ccy, 38, 28, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#dbe6ff'; ctx.beginPath(); ctx.ellipse(ccx, ccy, 33, 23, 0, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = '#c8a1e8'; ctx.beginPath(); ctx.arc(ccx, ccy, 18, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f3e8ff'; ctx.beginPath(); ctx.arc(ccx, ccy, 14, 0, TAU); ctx.fill();
      ctx.fillStyle = '#a06bd0'; for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.3; ctx.beginPath(); ctx.arc(ccx + Math.cos(a) * 16.5, ccy + Math.sin(a) * 16.5, 2.6, 0, TAU); ctx.fill(); }
    }
    // 단면 크기 비교 막대: 벽 두께
    // 설명 말풍선 (정답을 맞힌 뒤 누르면 보여 줘요)
    if (VS.glow[i] > 0.02 && VS.solved) {
      ctx.save(); ctx.globalAlpha = VS.glow[i];
      const yy = 262;
      pill(v.callout[0], VPW / 2, yy, { size: 13.5, bg: v.col, h: 26, pad: 10 });
      txt(v.callout[1], VPW / 2, yy + 28, { size: 12, weight: 700, color: '#475569', align: 'center', max: VPW - 20 });
      ctx.restore();
    } else if (VS.solved && !VS.cardsOn) txt('눌러 보세요', VPW / 2, 270, { size: 12, weight: 800, color: '#94a3b8', align: 'center' });
    if (i === 2 && VS.solved) { // 범례
      ctx.save(); ctx.globalAlpha = VS.glow[2] > 0.5 ? 0 : 1; ctx.restore();
    }
    ctx.restore();
  }
  function drawVessel(t) {
    for (let i = 0; i < 3; i++) drawVesselPanel(i, t);
    if (VS.cardsOn) txt('📇 설명 카드를 끌어 알맞은 혈관의 칸에 놓아요', 30, 434, { size: 14.5, weight: 800, color: '#15803d' });
    VS.cards.draw(t);
    if (VS.solved && !VS.cardsOn) {
      pill('○ 산소   ● 이산화 탄소  — 모세 혈관에서 서로 바꿔요', 400, 432, { size: 13, bg: '#f1f5f9', color: '#475569', h: 26, pad: 12 });
    }
  }
  const vesselHandlers = {
    down(p) {
      if (VS.cards.down(p)) return true;
      const i = VPX.findIndex((x) => p.x >= x && p.x <= x + VPW);
      if (i >= 0 && p.y >= VPY && p.y <= VPY + VPH && !VS.cardsOn) { VS.sel = VS.sel === i ? -1 : i; Sound.click(); }
      return false;
    },
    move(p) { VS.cards.move(p); },
    up() { VS.cards.up(); },
    hover(p) { const c = VS.cards.cursor(p); if (c) return c; const i = VPX.findIndex((x) => p.x >= x && p.x <= x + VPW); return i >= 0 && p.y > VPY && p.y < VPY + VPH && VS.solved ? 'pointer' : null; },
  };

  /* =========================================================
     장면 ③ 혈액: 현미경으로 보기
     ========================================================= */
  const BCOMP = [
    { k: 'plasma', name: '혈장', ic: '💧', col: '#d49a16', lines: ['혈액의 약 55 %를 차지하는 액체 성분이에요.', '영양소, 이산화 탄소, 노폐물을 녹여서 운반해요.'] },
    { k: 'rbc', name: '적혈구', ic: '🔴', col: '#d93a49', lines: ['가운데가 오목한 원반 모양이고 핵이 없어요.', '헤모글로빈이 산소와 결합해 산소를 운반해요.'] },
    { k: 'wbc', name: '백혈구', ic: '⚪', col: '#7c5cc4', lines: ['크기가 크고 핵이 있어요.', '세균을 잡아먹는 식균 작용을 해요.'] },
    { k: 'plt', name: '혈소판', ic: '🩹', col: '#c0529f', lines: ['크기가 가장 작은 세포 조각이에요.', '상처가 나면 모여서 혈액을 굳게(응고) 해요.'] },
  ];
  const BL = { cx: 288, cy: 318, r: 236, cells: [], sel: null, dwell: {}, seen: {}, germ: null, germT: 0, popT: -9, woundA: 0, t: 0, parts: [] };
  function initBlood() {
    const R = rng(21);
    BL.cells = [];
    const spawn = (kind, n, mk) => {
      for (let i = 0; i < n; i++) {
        let x, y;
        do { x = BL.cx + (R() * 2 - 1) * BL.r; y = BL.cy + (R() * 2 - 1) * BL.r; } while (Math.hypot(x - BL.cx, y - BL.cy) > BL.r - 12);
        BL.cells.push(Object.assign({ kind, x, y, ph: R() * 6.28, rot: R() * 6.28, rv: (R() - 0.5) * 0.8, sp: 0.8 + R() * 0.5 }, mk(i, R)));
      }
    };
    spawn('rbc', 44, (i, R) => ({ s: 0.9 + R() * 0.25 }));
    spawn('wbc', 4, (i, R) => ({ s: 1, bulge: 0 }));
    spawn('plt', 26, (i, R) => ({ s: 0.8 + R() * 0.4 }));
    BL.cells.sort((a, b) => (a.kind === 'rbc' ? 0 : a.kind === 'wbc' ? 1 : 2) - (b.kind === 'rbc' ? 0 : b.kind === 'wbc' ? 1 : 2));
    BL.sel = null; BL.dwell = {}; BL.seen = {}; BL.germ = null; BL.parts = [];
  }
  function selectBlood(k) { BL.sel = BL.sel === k ? null : k; if (BL.sel) { Sound.click(); BL.germ = null; BL.germT = 0; } }
  function updateBlood(dt, t) {
    BL.t += dt;
    if (BL.sel) { BL.dwell[BL.sel] = (BL.dwell[BL.sel] || 0) + dt; if (BL.dwell[BL.sel] > 1.6) BL.seen[BL.sel] = true; }
    BL.woundA = SciSim.approach(BL.woundA, BL.sel === 'plt' ? 1 : 0, dt, 3);
    const wbcs = BL.cells.filter((c) => c.kind === 'wbc');
    const focus = wbcs[0];
    const wp = BL.sel === 'plt';
    let pi = 0;
    BL.cells.forEach((c) => {
      c.rot += c.rv * dt; c.ph += dt * 1.4;
      const hold = (c.kind === 'wbc' && c === focus && BL.sel === 'wbc');
      if (c.kind === 'plt' && wp) {
        // 상처로 모여들어요
        const i = pi++, gx = BL.cx - 42 + (i % 14) * 6.5, gy = BL.cy + 168 + Math.floor(i / 14) * 11 + Math.sin(i * 2.1) * 4;
        c.x = SciSim.approach(c.x, gx, dt, 1.4); c.y = SciSim.approach(c.y, gy, dt, 1.4);
        return;
      }
      if (hold) { c.x = SciSim.approach(c.x, BL.cx - 20, dt, 1.2); c.y = SciSim.approach(c.y, BL.cy - 20, dt, 1.2); return; }
      const v = 14 * c.sp;
      c.x += v * dt; c.y += Math.sin(c.ph * 0.7) * 4 * dt;
      if (c.x > BL.cx + BL.r + 30) { c.x = BL.cx - BL.r - 30; c.y = BL.cy + (Math.random() * 2 - 1) * (BL.r - 30); }
    });
    // 백혈구의 식균 작용
    if (BL.sel === 'wbc' && focus) {
      if (!BL.germ) {
        BL.germT += dt;
        if (BL.germT > 0.8) { const a = -2.3 + Math.random() * 1.2, d = 150; BL.germ = { x: focus.x + Math.cos(a) * d, y: focus.y + Math.sin(a) * d, st: 'come', k: 1, t: 0, rot: 0 }; BL.germT = 0; }
      } else {
        const g = BL.germ; g.rot += dt * 2; g.t += dt;
        const dx = focus.x - g.x, dy = focus.y - g.y, d = Math.hypot(dx, dy) || 1;
        if (g.st === 'come') {
          g.x += dx / d * 42 * dt; g.y += dy / d * 42 * dt;
          focus.bulge = SciSim.approach(focus.bulge, smoothstep(110, 40, d), dt, 6); focus.bang = Math.atan2(dy, dx);
          if (d < 34) { g.st = 'eat'; g.t = 0; Sound.tone(520, 0.1, 'triangle', 0.07); }
        } else {
          g.x = SciSim.approach(g.x, focus.x, dt, 3.5); g.y = SciSim.approach(g.y, focus.y, dt, 3.5);
          g.k = Math.max(0, 1 - g.t / 0.9);
          if (g.t > 0.9) { burst(focus.x + 6 + 0, focus.y + 20, ['#a78bfa', '#c4b5fd', '#ffffff'], 14, { speed: 90 }); BL.germ = null; BL.popT = BL.t; focus.bulge = 0; BL.germT = -1.4; }
        }
      }
    } else { wbcs.forEach((w) => { w.bulge = SciSim.approach(w.bulge || 0, 0, dt, 5); }); if (BL.sel !== 'wbc') BL.germ = null; }
  }
  function drawBloodField(t) {
    const { cx, cy, r } = BL;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    const pl = BL.sel === 'plasma' ? 0.5 + 0.5 * Math.sin(t * 3) : 0;
    ctx.fillStyle = rgrad(cx - 40, cy - 60, 20, cx, cy, r, [[0, mix('#fff4cf', '#ffe38a', pl * 0.7)], [0.7, mix('#fbe9a8', '#f7d466', pl * 0.7)], [1, '#efd07a']]);
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    // 혈장 속 작은 알갱이
    ctx.fillStyle = 'rgba(190,140,40,.18)';
    for (let i = 0; i < 40; i++) { const a = i * 2.399, d = (i * 37 % 100) / 100 * (r - 10); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2 + (i % 3), 0, TAU); ctx.fill(); }
    // 상처(혈관 벽이 찢어진 곳)
    if (BL.woundA > 0.02) {
      ctx.save(); ctx.globalAlpha = BL.woundA;
      ctx.fillStyle = '#e48a9c'; ctx.fillRect(cx - r, cy + 190, r * 2, 70);
      ctx.fillStyle = '#d9667a'; ctx.fillRect(cx - r, cy + 190, r * 2, 8);
      ctx.fillStyle = '#fff4cf'; ctx.beginPath(); ctx.moveTo(cx - 52, cy + 186); for (let i = 0; i <= 8; i++) ctx.lineTo(cx - 52 + i * 13, cy + 186 + (i % 2 ? 22 : 8)); ctx.lineTo(cx + 52, cy + 262); ctx.lineTo(cx - 52, cy + 262); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // 세포 그리기
    const sel = BL.sel;
    const cells = BL.cells;
    cells.forEach((c) => {
      const dim = sel && sel !== 'plasma' && sel !== c.kind ? 0.38 : 1;
      ctx.save(); ctx.globalAlpha = dim;
      if (c.kind === 'rbc') {
        const sq = 0.5 + 0.5 * Math.abs(Math.cos(c.rot));
        rbcShape(c.x, c.y, 15 * c.s, 15 * c.s * (0.62 + 0.38 * sq), '#d93a49', c.rot * 0.5);
        if (sel === 'rbc') { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(c.x, c.y, 17 * c.s, 17 * c.s * (0.62 + 0.38 * sq), c.rot * 0.5, 0, TAU); ctx.stroke(); }
      } else if (c.kind === 'wbc') drawWBC(c, t);
      else {
        ctx.fillStyle = sel === 'plt' ? '#c0529f' : '#cf7fbd';
        ctx.beginPath(); ctx.ellipse(c.x, c.y, 6.5 * c.s, 4.6 * c.s, c.rot, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(c.x - 1.5, c.y - 1.5, 1.5, 0, TAU); ctx.fill();
        if (sel === 'plt') { ctx.strokeStyle = 'rgba(192,82,159,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(c.x, c.y, 9, 7, c.rot, 0, TAU); ctx.stroke(); }
      }
      ctx.restore();
    });
    // 적혈구 선택: 산소 표시
    if (sel === 'rbc') {
      cells.filter((c) => c.kind === 'rbc').slice(0, 9).forEach((c, i) => {
        const bob = Math.sin(t * 2.6 + i) * 3;
        if (Math.hypot(c.x - cx, c.y - cy) < r - 20) pill('O₂', c.x, c.y - 24 + bob, { size: 12, bg: '#0ea5e9', h: 18, pad: 6 });
      });
    }
    // 세균
    if (BL.germ) {
      const g = BL.germ;
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot); ctx.scale(g.k, g.k);
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) { const a = i * TAU / 10; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); ctx.stroke(); }
      ctx.fillStyle = rgrad(-3, -3, 1, 0, 0, 11, [[0, '#86efac'], [1, '#15803d']]); ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
      ctx.fillStyle = '#052e16'; ctx.beginPath(); ctx.arc(-3, -2, 1.8, 0, TAU); ctx.arc(3, -2, 1.8, 0, TAU); ctx.fill();
      ctx.restore();
      if (g.st === 'come') pill('세균', g.x, g.y - 26, { size: 12, bg: '#15803d', h: 20, pad: 8 });
    }
    // 혈장 선택: 떠다니는 물질 이름표
    if (sel === 'plasma') {
      [['영양소', '#f59e0b', 0], ['CO₂', '#64748b', 2.1], ['노폐물', '#78716c', 4.2]].forEach((q, i) => {
        const a = t * 0.25 + q[2], x = cx + Math.cos(a) * 130, y = cy + Math.sin(a * 1.3) * 100;
        ctx.fillStyle = q[1]; rr(x - 6, y - 6, 12, 12, 3); ctx.fill();
        pill(q[0], x, y - 22, { size: 12.5, bg: q[1], h: 20, pad: 8 });
      });
    }
    // 현미경 비네트
    ctx.fillStyle = rgrad(cx, cy, r * 0.7, cx, cy, r, [[0, 'rgba(60,40,10,0)'], [1, 'rgba(60,40,10,.38)']]);
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r - 3, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke();
    ctx.restore();
    if (BL.sel === 'wbc' && BL.t - BL.popT < 1.6) pill('🍽️ 식균 작용!', cx, cy - 4, { size: 16, bg: '#7c5cc4', h: 32, pad: 14, shadow: true, alpha: clamp((1.6 - (BL.t - BL.popT)) * 2, 0, 1) });
    if (BL.sel === 'plt' && BL.woundA > 0.6) pill('상처에 모여 혈액을 굳혀요', cx, cy + 128, { size: 13.5, bg: '#c0529f', h: 26, pad: 12, alpha: BL.woundA });
  }
  function drawWBC(c, t) {
    ctx.save(); ctx.translate(c.x, c.y);
    const bl = c.bulge || 0;
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12 + c.rot * 0.15;
      let rad = 25 + Math.sin(c.ph + i * 1.7) * 2.2;
      const da = Math.cos(a - (c.bang || 0));
      if (da > 0.3) rad += bl * 22 * da * da;
      pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
    }
    ctx.shadowColor = 'rgba(70,40,120,.25)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.beginPath(); smooth(ctx, pts, true);
    ctx.fillStyle = rgrad(-8, -10, 3, 0, 0, 30, [[0, '#f6f1ff'], [0.7, '#e2d7f6'], [1, '#c7b4ec']]); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#a58bd8'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#7352b8';
    [[-7, -5, 9], [7, -2, 8], [-1, 9, 8]].forEach((q) => { ctx.beginPath(); ctx.arc(q[0], q[1], q[2], 0, TAU); ctx.fill(); });
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-10, -10, 4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawBlood(t) {
    drawBloodField(t);
    const x = 556, w = 234;
    BCOMP.forEach((b, i) => {
      const y = 44 + i * 62, on = BL.sel === b.k;
      ctx.save();
      ctx.shadowColor = 'rgba(30,60,40,.16)'; ctx.shadowBlur = on ? 14 : 8; ctx.shadowOffsetY = 3;
      rr(x, y, w, 54, 14); ctx.fillStyle = on ? b.col : '#fff'; ctx.fill();
      ctx.restore();
      rr(x, y, w, 54, 14); ctx.lineWidth = 2; ctx.strokeStyle = on ? shade(b.col, -0.2) : 'rgba(71,85,105,.3)'; ctx.stroke();
      txt(b.ic, x + 18, y + 29, { size: 22, base: 'middle' });
      txt(b.name, x + 54, y + 29, { size: 18, weight: 800, color: on ? '#fff' : '#1b2333', base: 'middle' });
      if (BL.seen[b.k]) checkMark(x + w - 22, y + 27, 11);
      else if (!BL.sel && !on) { const a = 0.5 + 0.5 * Math.sin(t * 4 + i); ctx.strokeStyle = rgba(b.col, 0.25 + 0.3 * a); ctx.lineWidth = 3; rr(x - 2, y - 2, w + 4, 58, 16); ctx.stroke(); }
    });
    // 설명 카드
    const cy0 = 304;
    panel(x, cy0, w, 258, { r: 16 });
    const b = BCOMP.find((q) => q.k === BL.sel);
    if (!b) {
      txt('🔬 현미경으로 본 혈액이에요', x + 14, cy0 + 34, { size: 15, weight: 800, color: '#1b2333' });
      wrapLines('혈액에는 여러 가지 성분이 있어요. 위의 단추를 눌러 하나씩 살펴보세요.', w - 28, 14).forEach((ln, i) => txt(ln, x + 14, cy0 + 66 + i * 22, { size: 14, weight: 700, color: '#475569' }));
      txt('살펴본 성분: ' + Object.keys(BL.seen).length + ' / 4', x + 14, cy0 + 150, { size: 14, weight: 800, color: '#15803d' });
    } else {
      pill(b.ic + ' ' + b.name, x + 14, cy0 + 28, { size: 17, bg: b.col, h: 32, pad: 14, align: 'left' });
      b.lines.forEach((ln, li) => wrapLines(ln, w - 28, 14.5).forEach((l2, i) => txt(l2, x + 14, cy0 + 78 + li * 54 + i * 22, { size: 14.5, weight: 700, color: '#1b2333' })));
    }
  }
  const bloodHandlers = {
    down(p) {
      const x = 556, w = 234;
      for (let i = 0; i < 4; i++) { const y = 44 + i * 62; if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + 54) { selectBlood(BCOMP[i].k); return false; } }
      // 현미경 속 세포를 직접 눌러도 선택
      let best = null, bd = 28;
      BL.cells.forEach((c) => { const d = Math.hypot(c.x - p.x, c.y - p.y) - (c.kind === 'wbc' ? 14 : c.kind === 'rbc' ? 0 : -4); if (d < bd) { bd = d; best = c; } });
      if (best) selectBlood(best.kind);
      return false;
    },
    hover(p) { const x = 556; if (p.x > x && p.y > 44 && p.y < 44 + 4 * 62) return 'pointer'; return Math.hypot(p.x - BL.cx, p.y - BL.cy) < BL.r ? 'pointer' : null; },
  };

  /* =========================================================
     장면 ④ 순환 경로 지도: 체순환 · 폐순환
     ========================================================= */
  const RT_NAME = { RA: '우심방', RV: '우심실', PA: '폐동맥', LUNG: '폐 모세 혈관', PV: '폐정맥', LA: '좌심방', LV: '좌심실', AO: '대동맥', BODY: '온몸 모세 혈관', VC: '대정맥', END: '우심방' };
  const RT_SEQ = ['RV', 'PA', 'LUNG', 'PV', 'LA', 'LV', 'AO', 'BODY', 'VC', 'END'];
  const RT_MSG = {
    RA: '혈액이 우심방에 있어요. 혈액 방울을 끌어 따라가 봐요!',
    RV: '우심방에서 우심실로 내려왔어요.',
    PA: '우심실에서 폐동맥을 따라 폐로 가요. 아직 산소가 적은 혈액이에요.',
    LUNG: '폐 모세 혈관에서 산소를 받고 이산화 탄소를 내보내요. 혈액이 선홍색으로 변했어요!',
    PV: '폐정맥을 따라 심장으로 돌아와요. 산소가 많은 혈액이에요.',
    LA: '좌심방에 도착! 심장 → 폐 → 심장 길이 폐순환이에요.',
    LV: '좌심방에서 좌심실로 내려왔어요.',
    AO: '좌심실에서 대동맥을 따라 온몸으로 나가요.',
    BODY: '온몸 모세 혈관에서 세포에 산소를 주고 이산화 탄소를 받아요. 혈액이 어두운 색으로 변해요.',
    VC: '대정맥을 따라 심장으로 돌아와요.',
    END: '우심방에 도착! 심장 → 온몸 → 심장 길이 체순환이에요.',
  };
  const rk = [], rtag = {};
  (function () {
    const push = (x, y, tag) => { if (tag) rtag[tag] = rk.length; rk.push([x, y]); };
    push(345, 283, 'RA'); push(346, 318); push(352, 356, 'RV'); push(394, 334); push(401, 292); push(401, 240); push(362, 190); push(322, 152, 'PA'); push(304, 130, 'LS');
    for (let i = 1; i <= 7; i++) push(304 + i * 27.7, 130 + (i % 2 ? -17 : 17), i === 4 ? 'LUNG' : null);
    push(500, 130, 'LE'); push(540, 162); push(546, 226, 'PV'); push(516, 268); push(455, 283, 'LA'); push(452, 318); push(448, 356, 'LV'); push(490, 372); push(540, 420); push(566, 478, 'AO'); push(548, 522, 'BS');
    for (let i = 1; i <= 8; i++) push(548 - i * 35.8, 522 + (i % 2 ? 17 : -17), i === 4 ? 'BODY' : null);
    push(262, 522, 'BE'); push(226, 470); push(222, 380, 'VC'); push(240, 310); push(300, 283); push(345, 283, 'END');
  })();
  const RPER = 8;
  const RPOLY = splineSample(rk, RPER);
  const RL = RPOLY[RPOLY.length - 1][2];
  const RS = {};
  Object.keys(rtag).forEach((k) => { RS[k] = RPOLY[rtag[k] * RPER][2]; });
  const RVESS = {
    PA: { name: '폐동맥', a: RS.RV + 24, b: RS.LS - 4, blue: true },
    PV: { name: '폐정맥', a: RS.LE + 4, b: RS.LA - 26, blue: false },
    AO: { name: '대동맥', a: RS.LV + 24, b: RS.BS - 4, blue: false },
    VC: { name: '대정맥', a: RS.BE + 4, b: RS.END - 50, blue: true },
  };
  const RCHAM = [['RA', 300, 255, 92, 57, 'R', '우심방'], ['LA', 408, 255, 92, 57, 'L', '좌심방'], ['RV', 306, 322, 90, 68, 'R', '우심실'], ['LV', 404, 322, 90, 68, 'L', '좌심실']];
  const R = { s: 0, ts: 0, maxS: 0, vis: {}, auto: false, drag: false, mode: 'run', paint: {}, flagP: {}, msg: RT_MSG.RA, fx: [], dots: [], gasT: -9, gasAt: null, shakeV: {}, pulm: false, sys: false, sparkA: 0 };
  function colorAtS(s) {
    const u1 = smoothstep(RS.LUNG - 46, RS.LUNG + 46, s), u2 = smoothstep(RS.BODY - 46, RS.BODY + 46, s);
    return mix(BLUE, RED, clamp(u1 - u2, 0, 1));
  }
  function initRoute() {
    R.s = R.ts = R.maxS = 0; R.vis = {}; R.auto = false; R.drag = false; R.msg = RT_MSG.RA; R.fx = []; R.pulm = false; R.sys = false;
    R.dots = []; for (let i = 0; i < 34; i++) R.dots.push({ s: (i / 34) * RL, ph: i * 1.7 });
    R.paint = {}; R.flagP = {}; R.shakeV = {};
    syncRouteUI();
  }
  function nextTag() { return RT_SEQ.find((k) => !R.vis[k]) || null; }
  function onTag(k) {
    R.vis[k] = true; R.msg = RT_MSG[k];
    const q = atLen(RPOLY, RS[k]);
    burst(q.x, q.y, [colorAtS(RS[k]), '#ffffff', '#facc15'], 12, { speed: 80 });
    Sound.tone(520 + RT_SEQ.indexOf(k) * 40, 0.1, 'triangle', 0.06);
    if (k === 'LUNG' || k === 'BODY') { R.gasT = now(); R.gasAt = k; }
    if (R.vis.RV && R.vis.PA && R.vis.LUNG && R.vis.PV && R.vis.LA) R.pulm = true;
    if (R.vis.LV && R.vis.AO && R.vis.BODY && R.vis.VC && R.vis.END) R.sys = true;
  }
  function updateRoute(dt, t) {
    if (R.auto && !R.drag) {
      const inCap = Math.abs(R.ts - RS.LUNG) < 60 || Math.abs(R.ts - RS.BODY) < 60;
      R.ts = Math.min(RL, R.ts + (inCap ? 70 : 125) * dt);
      if (R.ts >= RL) { R.auto = false; syncRouteUI(); }
    }
    R.s = SciSim.approach(R.s, R.ts, dt, R.drag ? 16 : 9);
    if (Math.abs(R.s - R.ts) < 0.3) R.s = R.ts;
    R.maxS = Math.max(R.maxS, R.s);
    RT_SEQ.forEach((k) => { if (!R.vis[k] && R.s >= RS[k] - 1.5) onTag(k); });
    R.dots.forEach((d) => { d.s += 62 * dt; if (d.s > RL) d.s -= RL; });
  }
  function syncRouteUI() {
    const b = $('#btnAuto'); if (!b) return;
    b.innerHTML = R.auto ? '⏸ 멈추기' : (R.s >= RL - 1 ? '▶ 다시 흐르게' : '▶ 자동으로 흐르게');
  }
  function drawRouteLungs(t) {
    [[336, 122, -0.12], [464, 122, 0.12]].forEach((l) => {
      ctx.save(); ctx.translate(l[0], l[1]); ctx.rotate(l[2]);
      ctx.fillStyle = lgrad(0, -62, 0, 62, [[0, '#fbd9e0'], [1, '#f4b6c4']]);
      ctx.beginPath(); smooth(ctx, [[-70, -10], [-50, -50], [0, -62], [46, -44], [66, 0], [52, 46], [0, 64], [-52, 44]], true); ctx.fill();
      ctx.strokeStyle = '#e48fa2'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(-42 + (i % 5) * 20, 30 + Math.floor(i / 5) * 14 - (i % 2) * 8, 5 + (i % 3), 0, TAU); ctx.fill(); }
      ctx.restore();
    });
    pill('폐', 400, 60, { size: 15, bg: '#e48fa2', h: 24, pad: 12 });
  }
  function drawRouteBody(t) {
    ctx.save();
    rr(244, 488, 336, 68, 24); ctx.fillStyle = '#fff1cf'; ctx.fill(); ctx.strokeStyle = '#e8c680'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(240,190,200,.55)';
    for (let i = 0; i < 10; i++) for (const row of [0, 1]) { rr(256 + i * 32, 494 + row * 46, 26, 14, 6); ctx.fill(); }
    ctx.restore();
    pill('온몸의 조직(세포)', 412, 574, { size: 14, bg: '#d6a63c', h: 24, pad: 12 });
  }
  function drawRouteHeart(t) {
    const pl = 1 + (RM ? 0 : 0.012 * Math.sin(t * 7));
    ctx.save(); ctx.translate(400, 322); ctx.scale(pl, pl); ctx.translate(-400, -322);
    RCHAM.forEach((c) => {
      rr(c[1], c[2], c[3], c[4], 22);
      ctx.fillStyle = c[5] === 'L' ? '#fde1e1' : '#dfe8fb'; ctx.fill();
      ctx.lineWidth = 6; ctx.strokeStyle = WALL; ctx.stroke();
    });
    ctx.restore();
    RCHAM.forEach((c) => txt(c[6], c[1] + c[3] / 2, c[2] + c[4] - 8, { size: 12.5, weight: 800, color: c[5] === 'L' ? RED_D : BLUE_D, align: 'center' }));
  }
  function revealed(s) { return R.mode === 'all' || (R.mode === 'run' && s <= R.maxS + 1); }
  function drawRouteTubes(t) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokePoly(RPOLY, 0, RL); ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 17; ctx.stroke();
    strokePoly(RPOLY, 0, RL); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 12; ctx.stroke();
    if (R.mode === 'paint') {
      Object.keys(RVESS).forEach((k) => {
        const v = RVESS[k], pc = R.paint[k];
        if (!pc) return;
        const col = pc === 1 ? RED : BLUE;
        strokePoly(RPOLY, v.a, v.b); ctx.strokeStyle = shade(col, -0.2); ctx.lineWidth = 17; ctx.stroke();
        strokePoly(RPOLY, v.a, v.b); ctx.strokeStyle = col; ctx.lineWidth = 12; ctx.stroke();
      });
    } else {
      // 지나간 길을 색으로 칠하기 (구간별 색)
      const upto = R.mode === 'all' ? RL : R.maxS;
      const step = 10;
      for (let s = 0; s < upto; s += step) {
        const e = Math.min(upto, s + step + 1), col = colorAtS(s + step / 2);
        strokePoly(RPOLY, s, e); ctx.strokeStyle = shade(col, -0.25); ctx.lineWidth = 17; ctx.lineCap = 'butt'; ctx.stroke();
      }
      for (let s = 0; s < upto; s += step) {
        const e = Math.min(upto, s + step + 1), col = colorAtS(s + step / 2);
        strokePoly(RPOLY, s, e); ctx.strokeStyle = mix(col, '#ffffff', 0.35); ctx.lineWidth = 12; ctx.stroke();
      }
    }
    ctx.restore();
    // 흐르는 입자
    if (R.mode !== 'paint') {
      R.dots.forEach((d) => {
        if (!revealed(d.s)) return;
        const q = atLen(RPOLY, d.s);
        bead(q.x, q.y, 3.8, colorAtS(d.s), { noShadow: true });
      });
    }
  }
  function drawGasFx(t) {
    const age = now() - R.gasT;
    if (age > 2.6 || !R.gasAt) return;
    const lung = R.gasAt === 'LUNG', q = atLen(RPOLY, RS[R.gasAt]);
    const a = clamp(Math.min(age * 3, (2.6 - age) * 2), 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    for (let i = 0; i < 5; i++) {
      const u = (age * 0.5 + i * 0.2) % 1, x1 = q.x - 50 + i * 25;
      if (lung) { bead(x1, q.y - 6 - u * 44, 4, '#6b7280', { noShadow: true }); bead(x1 + 10, q.y - 48 + u * 42, 4, '#38bdf8', { noShadow: true }); }
      else { bead(x1, q.y + 6 + u * 44, 4, '#38bdf8', { noShadow: true }); bead(x1 + 10, q.y + 50 - u * 44, 4, '#6b7280', { noShadow: true }); }
    }
    ctx.restore();
    const lbl = lung ? [['CO₂ 내보내기', '#4b5563'], ['O₂ 받기', '#0284c7']] : [['O₂ 주기', '#0284c7'], ['CO₂ 받기', '#4b5563']];
    ctx.save(); ctx.globalAlpha = a;
    pill(lbl[0][0], q.x - 56, q.y + (lung ? -66 : 62), { size: 13, bg: lbl[0][1], h: 22, pad: 8 });
    pill(lbl[1][0], q.x + 56, q.y + (lung ? -66 : 62), { size: 13, bg: lbl[1][1], h: 22, pad: 8 });
    ctx.restore();
  }
  function drawRouteLabels(t) {
    // 혈관 이름 (지나간 뒤 또는 색칠 중)
    Object.keys(RVESS).forEach((k) => {
      const v = RVESS[k];
      const shown = R.mode === 'all' || R.mode === 'paint' || R.vis[k];
      if (!shown) return;
      const q = atLen(RPOLY, (v.a + v.b) / 2);
      const off = { PA: [-48, -6], PV: [50, 0], AO: [48, 6], VC: [-44, 0] }[k];
      const sh = R.shakeV[k] ? Math.sin(t * 60) * 5 * R.shakeV[k] : 0;
      let col = '#475569', bg = '#fff';
      if (R.mode === 'paint') { const pc = R.paint[k]; if (pc) { bg = pc === 1 ? RED : BLUE; col = '#fff'; } }
      pill(v.name, q.x + off[0] + sh, q.y + off[1], { size: 13.5, bg, color: col, border: 'rgba(71,85,105,.35)', borderW: 1.5, h: 24, pad: 9, shadow: true });
    });
    // 폐·온몸 모세 혈관 이름
    [['LUNG', -34], ['BODY', 36]].forEach((q) => { if (R.vis[q[0]] || R.mode === 'all') { const p = atLen(RPOLY, RS[q[0]]); pill(RT_NAME[q[0]], p.x, p.y + q[1] + (q[0] === 'LUNG' ? 0 : 0), { size: 13.5, bg: '#fff', color: '#475569', border: 'rgba(71,85,105,.35)', borderW: 1.5, h: 24, pad: 9, shadow: true }); } });
  }
  function drawRoute(t) {
    drawRouteLungs(t); drawRouteBody(t);
    drawRouteHeart(t);
    drawRouteTubes(t);
    drawGasFx(t);
    drawRouteLabels(t);
    // 다음 목표 반짝임
    if (R.mode === 'run') {
      const nk = nextTag();
      if (nk) { const q = atLen(RPOLY, RS[nk]); ring(q.x, q.y, 16, '#16a34a', t); }
      const p = atLen(RPOLY, R.s);
      // 혈액 방울
      const col = colorAtS(R.s), hot = R.drag ? 1 : 0;
      ctx.save();
      ctx.shadowColor = rgba(col, 0.6); ctx.shadowBlur = 14 + hot * 8;
      bead(p.x, p.y, 12 + hot * 2, col);
      ctx.restore();
      if (R.s < 4 && !R.drag && !R.auto) { const a = 0.5 + 0.5 * Math.sin(t * 4); ring(p.x, p.y, 20, '#16a34a', t); pill('👆 끌어 보세요', p.x - 60, p.y - 30 - a * 3, { size: 13, bg: '#16a34a', h: 24, pad: 10 }); }
    }
    drawRoutePanels(t);
  }
  function drawRoutePanels(t) {
    // 오른쪽: 설명
    panel(596, 44, 194, 232, { r: 16 });
    txt(R.mode === 'paint' ? '🎨 혈관 칠하기' : '지금 혈액은', 610, 72, { size: 14.5, weight: 800, color: '#64748b' });
    const msg = R.mode === 'paint' ? '네 혈관을 눌러 혈액의 색을 칠해요. 눌러서 🔴 산소 많음 / 🔵 산소 적음을 골라요.' : R.mode === 'all' && !R.vis.END ? '혈액 방울이나 ‘자동으로 흐르게’로 경로를 다시 따라가 봐요.' : R.msg;
    wrapLines(msg, 168, 14).forEach((ln, i) => txt(ln, 610, 100 + i * 21, { size: 14, weight: 700, color: '#1b2333' }));
    // 왼쪽: 순환 체크
    panel(20, 44, 176, 96, { r: 16 });
    [['폐순환', R.pulm, 'RV→PA→폐→PV→LA'], ['체순환', R.sys, 'LV→AO→온몸→VC→RA']].forEach((q, i) => {
      const y = 70 + i * 36;
      if (q[1]) checkMark(40, y, 11); else { ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(40, y, 10, 0, TAU); ctx.stroke(); }
      txt(q[0], 58, y + 6, { size: 16, weight: 800, color: q[1] ? '#15803d' : '#475569' });
    });
    // 범례
    panel(596, 292, 194, 78, { r: 14 });
    bead(616, 316, 7, RED, { noShadow: true }); txt('산소가 많은 혈액', 630, 321, { size: 13.5, weight: 800, color: RED_D });
    bead(616, 346, 7, BLUE, { noShadow: true }); txt('산소가 적은 혈액', 630, 351, { size: 13.5, weight: 800, color: BLUE_D });
  }
  function paintVesselAt(p) {
    const q = nearestS(RPOLY, p.x, p.y, 0, RL);
    if (q.d > 24) return null;
    return Object.keys(RVESS).find((k) => q.s >= RVESS[k].a && q.s <= RVESS[k].b) || null;
  }
  const routeHandlers = {
    down(p) {
      if (R.mode === 'paint') {
        const k = paintVesselAt(p);
        if (k) { R.paint[k] = R.paint[k] === 1 ? 2 : R.paint[k] === 2 ? 1 : 1; delete R.flagP[k]; Sound.click(); }
        return false;
      }
      if (R.mode === 'run' || R.mode === 'all') {
        const q = atLen(RPOLY, R.s);
        if (Math.hypot(p.x - q.x, p.y - q.y) < 38) { R.drag = true; R.auto = false; syncRouteUI(); Sound.click(); return true; }
      }
      return false;
    },
    move(p) {
      if (!R.drag) return;
      const q = nearestS(RPOLY, p.x, p.y, Math.max(0, R.ts - 40), Math.min(RL, R.ts + RL * 0.1));
      if (q.d < 90) R.ts = q.s;
    },
    up() { R.drag = false; },
    hover(p) {
      if (R.mode === 'paint') return paintVesselAt(p) ? 'pointer' : null;
      const q = atLen(RPOLY, R.s); return Math.hypot(p.x - q.x, p.y - q.y) < 38 ? 'grab' : null;
    },
  };

  /* =========================================================
     장면 ⑤ 종합: 경로 순서 카드
     ========================================================= */
  const ORD_LANES = [
    { id: 'sys', name: '체순환', sub: '좌심실에서 출발해 온몸을 돌아요', col: '#ea580c', items: [['LV', '좌심실', RED], ['AO', '대동맥', RED], ['BODY', '온몸 모세 혈관', '#a855f7'], ['VC', '대정맥', BLUE], ['RA', '우심방', BLUE]] },
    { id: 'pul', name: '폐순환', sub: '우심실에서 출발해 폐를 돌아요', col: '#0d9488', items: [['RV', '우심실', BLUE], ['PA', '폐동맥', BLUE], ['LUNG', '폐 모세 혈관', '#a855f7'], ['PV', '폐정맥', RED], ['LA', '좌심방', RED]] },
  ];
  const OS = { cards: new CardSet(), flag: {}, done: false, t0: -9, nWrong: 0 };
  const OSX = (i) => 47 + i * 146, OSY = [134, 262];
  function initOrder() {
    const R2 = rng(5);
    const cards = [], tg = [];
    ORD_LANES.forEach((ln, li) => ln.items.forEach((it, i) => {
      cards.push({ id: ln.id + i, label: it[1], dot: it[2], w: 120, h: 48, fs: 15, color: ln.col, hx: 0, hy: 0 });
      tg.push({ id: ln.id + i, x: OSX(i), y: OSY[li], w: 124, h: 54, r: 12, num: i + 1, lane: li,
        draw(tt, st) {
          ctx.save();
          rr(tt.x, tt.y, tt.w, tt.h, 12);
          ctx.fillStyle = st.hover ? 'rgba(34,197,94,.20)' : 'rgba(255,255,255,.7)'; ctx.fill();
          ctx.setLineDash(st.hover ? [] : [7, 6]); ctx.lineWidth = st.hover ? 3 : 2; ctx.strokeStyle = st.hover ? '#16a34a' : 'rgba(71,85,105,.5)'; ctx.stroke(); ctx.setLineDash([]);
          if (!st.filled) txt(String(tt.num), tt.x + tt.w / 2, tt.y + tt.h / 2 + 1, { size: 20, weight: 800, color: '#cbd5e1', align: 'center', base: 'middle' });
          ctx.restore();
        } });
    }));
    // 섞어서 아래에 늘어놓기
    const order = cards.map((_, i) => i).sort(() => R2() - 0.5);
    order.forEach((ci, k) => { const c = cards[ci]; c.hx = 49 + (k % 5) * 146 + 2; c.hy = 400 + Math.floor(k / 5) * 66; });
    OS.cards.setup(cards, tg);
    OS.flag = {}; OS.done = false; OS.t0 = -9;
  }
  function updateOrder(dt) { OS.cards.update(dt); }
  function drawOrder(t) {
    ORD_LANES.forEach((ln, li) => {
      const y = OSY[li];
      pill(ln.name, OSX(0), y - 38, { size: 16, bg: ln.col, h: 28, pad: 14, align: 'left', shadow: true });
      txt(ln.sub, OSX(0) + 92, y - 33, { size: 14, weight: 700, color: '#475569' });
      for (let i = 0; i < 4; i++) {
        const ax = OSX(i) + 124 + 11, ay = y + 27;
        ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(ax - 7, ay - 7); ctx.lineTo(ax + 7, ay); ctx.lineTo(ax - 7, ay + 7); ctx.closePath(); ctx.fill();
      }
    });
    ctx.save(); ctx.strokeStyle = 'rgba(71,85,105,.25)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, 372); ctx.lineTo(760, 372); ctx.stroke(); ctx.restore();
    txt('🃏 카드를 끌어 순서대로 놓아요', 47, 394, { size: 14.5, weight: 800, color: '#15803d' });
    OS.cards.draw(t);
    // 발표 애니메이션
    if (OS.done) {
      const age = now() - OS.t0;
      if (age < 7) {
        const u = clamp(age / 6, 0, 1), k = u * 9.999, li = Math.floor(k / 5), i = Math.floor(k % 5), f = k % 1;
        const idx = Math.min(4, i);
        const x0 = OSX(idx) + 62, nx = OSX(Math.min(4, idx + 1)) + 62;
        const x = lerp(x0, nx, idx < 4 ? EASE.inOutCubic ? EASE.inOutCubic(f) : f : 0), y = OSY[li] + 27;
        const q = ORD_LANES[li].items[idx];
        ctx.save(); ctx.shadowColor = rgba(q[2], 0.7); ctx.shadowBlur = 16;
        bead(x, y - 40 - 4 * Math.sin(age * 8), 10, q[2]); ctx.restore();
      }
    }
  }
  function checkOrder() {
    const cs = OS.cards.cards;
    const un = cs.filter((c) => !c.slot);
    if (un.length) return '아직 놓지 않은 카드가 있어요. (' + un.length + '장 남음)';
    const bad = cs.filter((c) => c.slot !== c.id);
    bad.forEach((c) => { if (!OS.flag[c.id + '@' + c.slot]) { OS.flag[c.id + '@' + c.slot] = true; c.shake = 1; c.mark = 'bad'; } });
    if (bad.length) return '순서가 맞지 않은 카드가 ' + bad.length + '장 있어요. 빨간 테두리 카드를 다시 놓아 보세요. 체순환은 좌심실, 폐순환은 우심실에서 출발해요.';
    if (!OS.done) { OS.done = true; OS.t0 = now(); cs.forEach((c) => { c.mark = 'ok'; }); }
    return true;
  }
  const orderHandlers = {
    down(p) { return OS.cards.down(p); },
    move(p) { OS.cards.move(p); },
    up() { OS.cards.up(); },
    hover(p) { return OS.cards.cursor(p); },
  };

  /* =========================================================
     장면 전환 · 입력 · 단계(미션)
     ========================================================= */
  let F = new Set();
  let game = null;
  const SCENE_LABEL = { heart: '❤️ 박동하는 심장', vessel: '🩸 혈관의 구조', blood: '🔬 현미경으로 본 혈액', route: '🗺️ 혈액의 순환 경로', order: '🧩 순환 경로 순서 맞히기' };
  const S = { scene: 'heart' };
  const HANDLERS = { heart: heartHandlers, vessel: vesselHandlers, blood: bloodHandlers, route: routeHandlers, order: orderHandlers };
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
  HT.cards.onPick = (c) => { delete HT.flag[c.id]; };
  VS.cards.onPick = (c) => { delete VS.flag[c.id]; };
  OS.cards.onPick = (c) => { Object.keys(OS.flag).forEach((k) => { if (k.indexOf(c.id + '@') === 0) delete OS.flag[k]; }); };
  initHeart(); initVessel(); initBlood(); initRoute(); initOrder();

  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); setScene(b.dataset.scene);
    if (b.dataset.scene === 'heart' && !gameMissionIs('names')) HT.cardsOn = false;
    if (b.dataset.scene === 'vessel' && !gameMissionIs('match')) VS.cardsOn = VS.cards.cards.some((c) => !c.slot) && VS.cardsOn;
  }));
  $('#btnPause').addEventListener('click', () => { Sound.click(); HT.paused = !HT.paused; syncHeartUI(); });
  function syncHeartUI() { $('#btnPause').innerHTML = HT.paused ? '▶ 다시 뛰게 하기' : '⏸ 멈추고 살펴보기'; }
  const fmtRate = (v) => (v < 0.6 ? '🐢 천천히 보기' : '분당 ' + Math.round(v * 80) + '회');
  SciSim.bindRange($('#sRate'), $('#oRate'), fmtRate, (v) => { HT.rate = v; });
  $('#btnAuto').addEventListener('click', () => {
    Sound.click();
    if (R.mode === 'paint') return;
    if (R.s >= RL - 1) { R.ts = 0; R.s = 0; R.vis = {}; R.maxS = 0; R.pulm = R.sys = false; R.msg = RT_MSG.RA; }
    R.auto = !R.auto; syncRouteUI();
  });
  $('#btnRouteReset').addEventListener('click', () => { Sound.click(); const m = R.mode; initRoute(); R.mode = m; });
  $('#btnOrderReset').addEventListener('click', () => { Sound.click(); initOrder(); });

  /* ---------- 퀴즈 그림 ---------- */
  const FIG_VALVE = '<svg viewBox="0 0 340 140" width="100%" role="img" aria-label="판막이 열렸을 때와 닫혔을 때"><rect width="340" height="140" fill="#fff"/>' +
    '<text x="85" y="20" font-size="14" font-weight="800" fill="#475569" text-anchor="middle">판막 열림</text><text x="255" y="20" font-size="14" font-weight="800" fill="#475569" text-anchor="middle">판막 닫힘</text>' +
    '<rect x="55" y="34" width="60" height="96" fill="#cfdcf8" stroke="#2447a8" stroke-width="3"/><rect x="225" y="34" width="60" height="96" fill="#cfdcf8" stroke="#2447a8" stroke-width="3"/>' +
    '<path d="M60 70 L72 108 M110 70 L98 108" stroke="#d4a72c" stroke-width="6" stroke-linecap="round"/><path d="M230 78 L254 88 M280 78 L256 88" stroke="#d4a72c" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M85 40 V62" stroke="#e5383b" stroke-width="5" marker-end="url(#a)"/><path d="M255 112 V94" stroke="#94a3b8" stroke-width="5" stroke-dasharray="4 4"/>' +
    '<text x="255" y="130" font-size="12" font-weight="800" fill="#64748b" text-anchor="middle">거꾸로는 못 가요 ✖</text>' +
    '<circle cx="85" cy="50" r="6" fill="#3f6fd8"/><circle cx="85" cy="120" r="6" fill="#3f6fd8"/></svg>';
  const gameMissionIs = (id) => { const m = game && game.current && game.current(); return !!(m && m.id === id); };
  const ids = (m, id) => { m.id = id; return m; };

  /* ---------- 단계 ---------- */
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '심장의 구조와 박동', short: '심장', icon: '❤️', phase: '관찰',
      features: ['heart'],
      intro: '<p class="si-q">❓ 탐구 질문: 심장에서 나간 혈액은 어디를 거쳐 다시 돌아올까?</p>' +
        '<p>소화계가 흡수한 <b>영양소</b>와 호흡계가 받아들인 <b>산소</b>는 <b>순환계</b>가 온몸의 세포로 운반해요. 순환계의 중심은 혈액을 뿜어 내는 <b>심장</b>이에요.</p>' +
        '<p>심장은 <b>심방 2개와 심실 2개</b>로 이루어져 있고, 혈액이 거꾸로 흐르지 않도록 <b>판막</b>이 있어요. 먼저 뛰는 심장을 관찰해요.</p>',
      setup() { setScene('heart'); HT.cardsOn = false; },
      recap: '심장은 <b>심방과 심실</b>이 차례로 수축하고, <b>판막</b>이 혈액이 한 방향으로만 흐르게 해요.',
      summary: '<ul><li>심장은 <b>우심방·우심실·좌심방·좌심실</b> 네 개의 방으로 이루어져 있어요.</li>' +
        '<li><b>심방</b>은 혈액이 들어오는 방, <b>심실</b>은 혈액을 내보내는 방이에요.</li>' +
        '<li>심방 수축 → 심실 수축 → 이완이 반복되며 심장이 뛰어요.</li>' +
        '<li><b>판막</b>은 혈액이 거꾸로 흐르지 않게 막아요.</li></ul>',
      missions: [
        ids({
          title: '심장 박동 관찰하기',
          goal: '심장이 <b>5번</b> 뛰는 것을 지켜보세요. 슬라이더를 <b>천천히</b> 놓고 <b>2번</b> 이상 보면 판막의 움직임이 잘 보여요.',
          hint: '“박동 속도” 슬라이더를 왼쪽 끝 쪽으로 밀면 천천히 뛰어요. 방과 판막, 혈액 입자의 움직임을 눈으로 따라가 봐요.',
          setup() { setScene('heart'); HT.cardsOn = false; HT.beats = 0; HT.slowBeats = 0; HT.paused = false; syncHeartUI(); showHint('❤️ 슬라이더를 왼쪽으로 밀어 천천히 관찰해 봐요', 7000); },
          check: () => HT.beats >= 5 && HT.slowBeats >= 2,
          hold: 0.3,
          status: () => '박동 <b>' + Math.min(HT.beats, 5) + ' / 5</b>번 · 천천히 본 박동 <b>' + Math.min(HT.slowBeats, 2) + ' / 2</b>번',
          explain: '먼저 <b>심방이 수축</b>해 혈액을 심실로 보내고, 이어서 <b>심실이 수축</b>해 혈액을 동맥으로 내보내요. 그 사이 <b>판막</b>이 열리고 닫히며 혈액이 한 방향으로만 흐르게 해요.',
        }, 'beat'),
        ids({
          title: '심장의 네 방 이름 붙이기', manual: true,
          goal: '이름표 4개를 알맞은 방에 놓고 <b>✔ 확인하기</b>를 누르세요. 그림은 마주 본 모습이라 <b>몸의 오른쪽이 그림의 왼쪽</b>이에요.',
          hint: '위쪽 방이 심방, 아래쪽 방이 심실이에요. 몸의 오른쪽이 그림의 왼쪽이에요. (파란색 쪽이 우, 빨간색 쪽이 좌)',
          setup() { setScene('heart'); HT.cardsOn = true; HT.flag = {}; HT.cards.setup(HT.cards.cards, HT.cards.targets); showHint('🏷️ 이름표를 끌어 알맞은 방에 놓아요', 6500); },
          status: () => '놓은 이름표: <b>' + HT.cards.cards.filter((c) => c.slot).length + ' / 4</b>',
          check() {
            const cs = HT.cards.cards, un = cs.filter((c) => !c.slot);
            if (un.length) return '아직 놓지 않은 이름표가 있어요. (' + un.length + '개 남음)';
            const bad = cs.filter((c) => c.slot !== c.id);
            bad.forEach((c) => { if (!HT.flag[c.id]) { HT.flag[c.id] = true; c.shake = 1; c.mark = 'bad'; } });
            if (bad.length) return '<b>' + bad.map((c) => c.label).join(', ') + '</b> 이름표의 자리가 맞지 않아요. 위쪽은 심방, 아래쪽은 심실이고, 몸의 오른쪽이 그림의 왼쪽이에요.';
            cs.forEach((c) => { c.mark = 'ok'; });
            return true;
          },
          explain: '<b>우심방·우심실</b>은 몸의 오른쪽, <b>좌심방·좌심실</b>은 몸의 왼쪽에 있어요. 심방은 혈액을 받아들이고 심실은 혈액을 내보내요. 온몸으로 혈액을 보내는 <b>좌심실의 벽이 가장 두꺼워요</b>.',
        }, 'names'),
        {
          type: 'quiz', title: '판막의 역할', figure: FIG_VALVE,
          goal: '심방과 심실 사이, 심실과 동맥 사이에 있는 <b>판막</b>은 무슨 일을 할까요?',
          setup() { setScene('heart'); HT.cardsOn = false; },
          choices: ['혈액이 거꾸로 흐르지 않게 막아요', '혈액에 산소를 넣어 줘요', '혈액을 깨끗하게 걸러요', '심장을 뛰게 하는 힘을 내요'],
          answer: 0,
          feedback: ['', '산소는 폐에서 혈액으로 들어가요. 판막은 혈액이 흐르는 방향을 정하는 문이에요.', '혈액을 걸러 노폐물을 내보내는 일은 콩팥이 해요. 판막은 문처럼 열리고 닫혀요.', '심장은 심장 근육이 수축하면서 뛰어요. 판막은 혈액이 거꾸로 흐르는 것을 막아요.'],
          explain: '판막은 <b>한쪽으로만 열리는 문</b>이에요. 혈액이 앞으로 갈 때는 열리고, 뒤로 흐르려 하면 닫혀서 <b>역류를 막아요</b>.',
        },
      ],
    },
    /* ---------- 2단계 · 탐구 ---------- */
    {
      title: '혈관과 혈액', short: '혈관과 혈액', icon: '🩸', phase: '탐구',
      features: ['vessel', 'blood'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 심장이 혈액을 받아들이고 내보내는 것을 보았어요.</div>' +
        '<p>심장에서 나간 혈액은 <b>혈관</b>을 따라 흘러요. 혈관은 <b>동맥, 정맥, 모세 혈관</b> 세 가지이고, 혈액은 액체인 <b>혈장</b>과 <b>혈구</b>(적혈구, 백혈구, 혈소판)로 이루어져 있어요. 구조가 어떻게 다르고 무슨 일을 하는지 살펴봐요.</p>',
      setup() { setScene('vessel'); VS.cardsOn = false; },
      recap: '<b>동맥</b>은 두껍고 탄력 있고, <b>정맥</b>은 얇고 판막이 있고, <b>모세 혈관</b>은 한 층이라 <b>물질 교환</b>이 일어나요.',
      summary: '<ul><li><b>동맥</b>: 심장에서 나가는 혈액이 흘러요. 벽이 <b>두껍고 탄력</b>이 있어요.</li>' +
        '<li><b>정맥</b>: 심장으로 돌아오는 혈액이 흘러요. 벽이 얇고 <b>판막</b>이 있어요.</li>' +
        '<li><b>모세 혈관</b>: 온몸에 그물처럼 퍼져 있고, 벽이 <b>한 층의 세포</b>라서 <b>물질 교환</b>이 일어나요.</li>' +
        '<li><b>혈장</b>: 영양소·노폐물·이산화 탄소 운반 / <b>적혈구</b>: 헤모글로빈으로 산소 운반 / <b>백혈구</b>: 식균 작용 / <b>혈소판</b>: 혈액 응고</li></ul>',
      missions: [
        ids({
          title: '혈관의 구조와 기능 짝짓기', manual: true,
          goal: '설명 카드 3장을 알맞은 혈관의 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '그림을 잘 보세요. 벽이 두꺼운 혈관, 판막이 보이는 혈관, 벽이 아주 얇은 혈관이 어느 것일까요?',
          setup() { setScene('vessel'); VS.cardsOn = true; VS.flag = {}; VS.cards.setup(VS.cards.cards, VS.cards.targets); VS.sel = -1; showHint('📇 카드를 끌어 알맞은 혈관에 놓아요', 6500); },
          status: () => '놓은 카드: <b>' + VS.cards.cards.filter((c) => c.slot).length + ' / 3</b>',
          check() {
            const cs = VS.cards.cards, un = cs.filter((c) => !c.slot);
            if (un.length) return '아직 놓지 않은 카드가 있어요. (' + un.length + '장 남음)';
            const bad = cs.filter((c) => c.slot !== c.id);
            bad.forEach((c) => { if (!VS.flag[c.id]) { VS.flag[c.id] = true; c.shake = 1; c.mark = 'bad'; } });
            if (bad.length) return '맞지 않는 카드가 있어요. 혈관의 <b>벽의 두께</b>와 <b>판막</b>을 그림에서 찾아봐요.';
            cs.forEach((c) => { c.mark = 'ok'; }); VS.solved = true;
            return true;
          },
          explain: '<b>동맥</b>은 심장에서 나온 센 압력을 견디도록 벽이 두껍고 탄력이 있어요. <b>정맥</b>은 벽이 얇고 <b>판막</b>이 있어 혈액이 거꾸로 흐르지 않아요. <b>모세 혈관</b>은 벽이 한 층의 세포로 되어 있어요.',
        }, 'match'),
        ids({
          title: '혈액의 성분 살펴보기',
          goal: '현미경 화면에서 <b>혈장, 적혈구, 백혈구, 혈소판</b>을 하나씩 눌러 잠시 살펴보세요.',
          hint: '오른쪽 단추나 현미경 속 세포를 눌러요. 선택한 성분이 하는 일을 보여 줘요. 각각 2초쯤 지켜봐요.',
          setup() { setScene('blood'); VS.cardsOn = false; BL.sel = null; BL.seen = {}; BL.dwell = {}; showHint('🔬 성분을 하나씩 눌러 보세요', 6500); },
          check: () => BCOMP.every((b) => BL.seen[b.k]),
          hold: 0.5,
          status: () => BCOMP.map((b) => mark(!!BL.seen[b.k]) + ' ' + b.name).join(' · '),
          explain: '<b>혈장</b>은 영양소와 노폐물을 녹여 운반하고, <b>적혈구</b>는 산소를 운반해요. <b>백혈구</b>는 세균을 잡아먹는 <b>식균 작용</b>을 하고, <b>혈소판</b>은 상처가 났을 때 <b>혈액을 굳게</b> 해요.',
        }, 'cells'),
        {
          type: 'quiz', title: '물질 교환이 일어나는 곳',
          goal: '혈액과 조직 세포 사이에서 <b>산소·영양소</b>와 <b>이산화 탄소·노폐물</b>을 서로 바꾸는 혈관은 무엇일까요?',
          setup() { setScene('vessel'); VS.cardsOn = false; },
          choices: ['동맥', '정맥', '모세 혈관', '판막'],
          answer: 2,
          feedback: ['동맥은 혈액을 심장에서 멀리 보내는 굵은 혈관이에요. 벽이 두꺼워 물질이 드나들기 어려워요.', '정맥은 혈액을 심장으로 되돌려 보내는 혈관이에요. 물질 교환은 정맥에서 일어나지 않아요.', '', '판막은 혈관이 아니라 혈액이 거꾸로 흐르지 않게 막는 문이에요.'],
          explain: '<b>모세 혈관</b>은 벽이 한 층의 세포라서 산소와 영양소는 조직 세포로, 이산화 탄소와 노폐물은 혈액으로 <b>쉽게 이동</b>해요.',
        },
      ],
    },
    /* ---------- 3단계 · 모형 ---------- */
    {
      title: '혈액의 순환 경로', short: '순환 경로', icon: '🗺️', phase: '모형',
      features: ['route'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 혈액이 심장과 동맥·정맥·모세 혈관을 따라 흐른다는 것을 알았어요.</div>' +
        '<p>혈액은 한 바퀴를 돌며 <b>폐</b>와 <b>온몸</b>을 모두 거쳐요. <b>폐순환</b>(심장 → 폐 → 심장)과 <b>체순환</b>(심장 → 온몸 → 심장)을 혈액 방울을 끌어 직접 따라가 보고, 혈액의 <b>색이 바뀌는 곳</b>을 찾아봐요.</p>',
      setup() { setScene('route'); R.mode = 'run'; },
      recap: '<b>폐순환</b>: 우심실 → 폐동맥 → 폐 → 폐정맥 → 좌심방 / <b>체순환</b>: 좌심실 → 대동맥 → 온몸 → 대정맥 → 우심방',
      summary: '<ul><li><b>체순환</b>: 좌심실 → 대동맥 → 온몸의 모세 혈관 → 대정맥 → 우심방</li>' +
        '<li><b>폐순환</b>: 우심실 → 폐동맥 → 폐의 모세 혈관 → 폐정맥 → 좌심방</li>' +
        '<li>폐에서는 산소를 받고 이산화 탄소를 내보내 <b>동맥혈</b>(산소 많음, 선홍색)이 되고, 온몸에서는 산소를 주고 이산화 탄소를 받아 <b>정맥혈</b>(산소 적음, 어두운 색)이 돼요.</li>' +
        '<li>폐동맥에는 정맥혈, 폐정맥에는 동맥혈이 흘러요.</li></ul>',
      missions: [
        ids({
          title: '혈액 방울 따라가기',
          goal: '혈액 방울을 끌어 <b>폐순환</b>과 <b>체순환</b> 두 경로를 한 바퀴 모두 완성하세요.',
          hint: '초록 점선 동그라미가 다음 목표예요. 혈액 방울을 끌어 길을 따라 움직이거나 “자동으로 흐르게” 단추를 눌러도 돼요.',
          setup() { setScene('route'); R.mode = 'run'; initRoute(); showHint('🩸 혈액 방울을 끌어 길을 따라가요', 7000); },
          check: () => R.pulm && R.sys,
          hold: 0.8,
          status: () => mark(R.pulm) + ' 폐순환 · ' + mark(R.sys) + ' 체순환<br>지나온 곳: <b>' + RT_SEQ.filter((k) => R.vis[k]).length + ' / ' + RT_SEQ.length + '</b>',
          explain: '혈액은 <b>우심실 → 폐동맥 → 폐 → 폐정맥 → 좌심방</b>(폐순환)을 돈 뒤, <b>좌심실 → 대동맥 → 온몸 → 대정맥 → 우심방</b>(체순환)을 돌아 다시 심장으로 와요. 폐에서는 산소를 받아 붉어지고 온몸에서는 산소를 주어 어두워져요.',
        }, 'run'),
        ids({
          title: '동맥혈과 정맥혈 구분하기', manual: true,
          goal: '네 혈관 <b>폐동맥, 폐정맥, 대동맥, 대정맥</b>을 눌러 산소가 많은 혈액은 🔴 빨강, 적은 혈액은 🔵 파랑으로 칠하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '폐에서 산소를 받은 뒤의 혈액은 산소가 많아요. 폐로 가는 혈액과 온몸에서 돌아오는 혈액은 산소가 적어요.',
          setup() { setScene('route'); initRoute(); R.mode = 'paint'; R.paint = {}; R.flagP = {}; showHint('🎨 혈관을 눌러 색을 칠해요 (누를 때마다 색이 바뀌어요)', 7000); },
          status: () => '칠한 혈관: <b>' + Object.keys(RVESS).filter((k) => R.paint[k]).length + ' / 4</b>',
          check() {
            const ks = Object.keys(RVESS), un = ks.filter((k) => !R.paint[k]);
            if (un.length) return '아직 칠하지 않은 혈관이 있어요. (' + un.length + '개 남음)';
            const bad = ks.filter((k) => (R.paint[k] === 2) !== RVESS[k].blue);
            bad.forEach((k) => { if (!R.flagP[k]) { R.flagP[k] = true; R.shakeV[k] = 1; } });
            if (bad.length) return '<b>' + bad.map((k) => RVESS[k].name).join(', ') + '</b>의 색이 맞지 않아요. 혈액이 폐나 온몸을 지나기 전인지 후인지 생각해 봐요.';
            R.mode = 'all'; R.maxS = RL;
            return true;
          },
          explain: '<b>폐동맥</b>(폐로 가는 혈액)과 <b>대정맥</b>(온몸에서 돌아온 혈액)은 산소가 적은 <b>정맥혈</b>, <b>폐정맥</b>(폐에서 온 혈액)과 <b>대동맥</b>(온몸으로 나가는 혈액)은 산소가 많은 <b>동맥혈</b>이에요.',
        }, 'paint'),
        {
          type: 'quiz', title: '폐정맥에 흐르는 혈액',
          goal: '<b>폐정맥</b>에 흐르는 혈액은 어떤 혈액일까요?',
          setup() { setScene('route'); if (R.mode === 'paint') R.mode = 'all'; },
          choices: ['산소가 적은 정맥혈', '산소가 많은 동맥혈', '혈액이 흐르지 않아요', '이산화 탄소가 가장 많은 혈액'],
          answer: 1,
          feedback: ['폐정맥은 폐에서 산소를 받은 혈액이 지나가요. 이름은 정맥이지만 산소가 많은 혈액이에요.', '', '폐정맥에도 혈액이 흘러요. 폐에서 심장(좌심방)으로 돌아와요.', '이산화 탄소는 폐에서 내보냈어요. 폐정맥의 혈액은 산소가 많아요.'],
          explain: '<b>폐정맥</b>은 폐에서 산소를 받은 <b>동맥혈</b>을 좌심방으로 보내요. 동맥·정맥은 혈액이 아니라 <b>혈액이 흐르는 방향</b>(심장에서 나가면 동맥, 심장으로 들어오면 정맥)으로 이름 붙여요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '순환 경로 종합하기', short: '종합', icon: '🧩', phase: '적용',
      features: ['order'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 혈액 방울로 폐순환과 체순환을 직접 따라가 보았어요.</div>' +
        '<p>이제 두 순환 경로를 <b>순서대로</b> 정리해 봐요. 카드를 끌어 놓은 뒤 순서를 소리 내어 <b>발표</b>해 보세요. 그리고 몸이 필요로 할 때 순환이 어떻게 달라지는지도 생각해 봐요.</p>',
      setup() { setScene('order'); },
      recap: '두 순환 모두 <b>심장에서 출발해 심장으로 돌아와요</b>. 몸이 더 많은 산소를 필요로 하면 심장이 더 빨리 뛰어요.',
      summary: '<ul><li><b>체순환</b>: 좌심실 → 대동맥 → 온몸 모세 혈관 → 대정맥 → 우심방</li>' +
        '<li><b>폐순환</b>: 우심실 → 폐동맥 → 폐 모세 혈관 → 폐정맥 → 좌심방</li>' +
        '<li>혈액은 영양소와 산소를 세포에 전달하고, 이산화 탄소와 노폐물을 받아 와요.</li>' +
        '<li>운동할 때는 세포가 에너지를 더 많이 쓰므로 심장 박동이 빨라져 혈액 순환이 빨라져요.</li></ul>',
      missions: [
        ids({
          title: '순환 경로 순서 맞히기', manual: true,
          goal: '카드 10장을 <b>체순환</b>과 <b>폐순환</b>의 순서대로 놓고 <b>✔ 확인하기</b>를 누르세요. 다 맞히면 순서를 발표해 봐요!',
          hint: '체순환은 좌심실에서, 폐순환은 우심실에서 출발해요. 카드 앞의 색 점(🔴 산소 많음, 🔵 산소 적음, 🟣 변하는 곳)도 단서예요.',
          setup() { setScene('order'); OS.flag = {}; OS.done = false; initOrder(); showHint('🃏 카드를 순서대로 끌어 놓아요', 6500); },
          status: () => '놓은 카드: <b>' + OS.cards.cards.filter((c) => c.slot).length + ' / 10</b>',
          check: checkOrder,
          explain: '체순환은 <b>좌심실 → 대동맥 → 온몸 모세 혈관 → 대정맥 → 우심방</b>, 폐순환은 <b>우심실 → 폐동맥 → 폐 모세 혈관 → 폐정맥 → 좌심방</b> 순서예요.',
        }, 'order'),
        {
          type: 'quiz', title: '운동할 때 빨라지는 심장',
          goal: '운동을 하면 심장이 <b>더 빨리</b> 뛰어요. 그 까닭은 무엇일까요?',
          setup() { setScene('order'); },
          choices: ['세포가 더 많은 산소와 영양소를 필요로 해서 혈액을 빨리 보내려고', '혈액이 몸 밖으로 빠져나가서', '심장이 피곤해서 불규칙하게 뛰는 것이라서', '폐가 혈액을 더 많이 만들어서'],
          answer: 0,
          feedback: ['', '혈액은 혈관 안에서 계속 순환해요. 운동한다고 몸 밖으로 빠져나가지 않아요.', '심장 박동이 빨라지는 것은 몸이 필요로 하기 때문에 일어나는 정상적인 반응이에요.', '혈액을 만드는 곳은 뼈속(골수)이에요. 폐는 산소를 받아들이는 일을 해요.'],
          explain: '운동하면 근육 세포가 에너지를 더 많이 쓰므로 <b>산소와 영양소</b>가 더 많이 필요해요. 심장이 빨리 뛰면 혈액이 온몸으로 더 빨리 운반돼요.',
        },
      ],
    },
  ];

  /* ---------- 시작 ---------- */
  game = SciSim.game({
    simId: 'm2-circulation',
    mount: '#game',
    badge: '순환계 탐험가',
    homeHref: '../../index.html#g2',
    featureLabels: {
      heart: '❤️ 박동하는 심장 모형',
      vessel: '🩸 혈관 구조 비교',
      blood: '🔬 혈액 현미경',
      route: '🗺️ 순환 경로 지도',
      order: '🧩 경로 순서 카드',
    },
    onFeatures(set) { F = new Set(set); },
    onMissionStart() { hideHint(); },
    onComplete() { HT.cardsOn = false; VS.cardsOn = false; VS.solved = true; R.mode = 'all'; R.maxS = RL; },
    levels,
  });

  window.__sim = {
    S, HT, VS, BL, R, OS, RS, RL, RVESS, setScene, game, bumpBeats(n) { HT.beats += n; HT.slowBeats += n; },
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x / W) * r.width, y: r.top + ((y + YOFF) / H) * r.height }; },
    chamberP(k) { const t = HT.cards.targets.find((q) => q.id === k); return this.toClient(t.x + t.w / 2, t.y + t.h / 2); },
    cardP(set, id) { const c = set.cards.find((q) => q.id === id); return this.toClient(c.x + c.w / 2, c.y + c.h / 2); },
    targetP(set, id) { const t = set.targets.find((q) => q.id === id); return this.toClient(t.x + t.w / 2, t.y + t.h / 2); },
    dropP() { const q = atLen(RPOLY, R.s); return this.toClient(q.x, q.y); },
    routeP(s) { const q = atLen(RPOLY, s); return this.toClient(q.x, q.y); },
    chipP(i) { return this.toClient(556 + 117, 44 + i * 62 + 27); },
    vesselMid(k) { const v = RVESS[k]; const q = atLen(RPOLY, (v.a + v.b) / 2); return this.toClient(q.x, q.y); },
  };

  SciSim.loop((dt, t) => {
    if (S.scene === 'heart') updateHeart(dt, t);
    else if (S.scene === 'vessel') updateVessel(dt, t);
    else if (S.scene === 'blood') updateBlood(dt, t);
    else if (S.scene === 'route') updateRoute(dt, t);
    else updateOrder(dt);
    PFX.update(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(0, YOFF);
    if (S.scene === 'heart') drawHeart(t);
    else if (S.scene === 'vessel') drawVessel(t);
    else if (S.scene === 'blood') drawBlood(t);
    else if (S.scene === 'route') drawRoute(t);
    else drawOrder(t);
    PFX.draw(ctx);
    ctx.restore();
    drawHint();
  });
})();
