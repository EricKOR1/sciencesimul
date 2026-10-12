/* =========================================================
   중2 Ⅵ. 동물과 에너지 — 소화와 소화 효소 [9과13-01]
   ① [관찰] 영양소 검출: 아이오딘·베네딕트·뷰렛·수단 Ⅲ 반응
   ② [실험] 침의 소화 작용: 녹말 + 증류수(A) / 침(B), 37 ℃ 물중탕
   ③ [설명] 소화 기관과 소화 효소: 아밀레이스·펩신·트립신·라이페이스
   ④ [적용] 소장 융털: 포도당·아미노산 → 모세 혈관, 지방산·모노글리세리드 → 암죽관
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

  /* =========================================================
     분자 모형: 사슬이 효소에 의해 끊어지는 그림
     spec = { n, bonds:[끊어지는 단계(1|2)…], thr:[0~1 …], shape, colors }
     prog(0~2): 소화가 얼마나 진행됐는지 (1이면 1단계 분해 끝, 2면 최종 분해 끝)
     ========================================================= */
  const GLU = '#f5a524';
  const AMINO = ['#a855f7', '#ec4899', '#14b8a6', '#6366f1', '#f43f5e', '#8b5cf6'];
  function bondOpen(spec, j, prog) {
    const st = spec.bonds[j];
    return smoothstep(spec.thr[j] * 0.75, spec.thr[j] * 0.75 + 0.25, prog - (st - 1));
  }
  // 지금 끊고 있는(또는 다음에 끊을) 결합 번호
  function activeBond(spec, prog) {
    const cur = prog <= 1.0001 ? 1 : 2;
    let best = -1, bt = 9;
    for (let j = 0; j < spec.bonds.length; j++) {
      if (spec.bonds[j] !== cur) continue;
      if (bondOpen(spec, j, prog) < 0.999 && spec.thr[j] < bt) { bt = spec.thr[j]; best = j; }
    }
    return best;
  }
  const BEAD_D = 20, BEAD_R = 9, BEAD_GAP = 10;
  // 사슬 하나 그리기. 반환: 결합 j의 화면 좌표 배열 (효소 위치용)
  function drawChain(cx, cy, ang, spec, prog, t, o) {
    o = o || {};
    const n = spec.n;
    const open = spec.bonds.map((b, j) => bondOpen(spec, j, prog));
    const pos = [];
    let acc = 0, drift = 0;
    const total = (n - 1) * BEAD_D + open.reduce((a, b) => a + b, 0) * BEAD_GAP;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const sc = o.scale || 1;
    for (let k = 0; k < n; k++) {
      if (k > 0) { acc += BEAD_D + open[k - 1] * BEAD_GAP; drift += open[k - 1] * (k % 2 ? 1 : -1) * 6; }
      const lx = (acc - total / 2) * sc;
      const wob = RM ? 0 : Math.sin(t * 1.7 + k * 0.8 + (o.ph || 0)) * 2.3;
      const ly = (drift + wob) * sc;
      pos.push([cx + lx * ca - ly * sa, cy + lx * sa + ly * ca]);
    }
    // 결합선
    ctx.save();
    ctx.lineCap = 'round';
    for (let j = 0; j < n - 1; j++) {
      const a = 1 - open[j];
      if (a < 0.02) continue;
      ctx.strokeStyle = 'rgba(120,80,30,' + (0.75 * a).toFixed(2) + ')'; ctx.lineWidth = 3.2 * sc;
      ctx.beginPath(); ctx.moveTo(pos[j][0], pos[j][1]); ctx.lineTo(pos[j + 1][0], pos[j + 1][1]); ctx.stroke();
    }
    ctx.restore();
    for (let k = 0; k < n; k++) {
      const col = spec.colors ? spec.colors[k % spec.colors.length] : GLU;
      const r = BEAD_R * sc;
      if (spec.shape === 'sq') {
        ctx.save(); ctx.translate(pos[k][0], pos[k][1]); ctx.rotate(ang + (RM ? 0 : Math.sin(t * 1.3 + k) * 0.15));
        ctx.shadowColor = 'rgba(20,30,40,.25)'; ctx.shadowBlur = r * 0.5; ctx.shadowOffsetY = r * 0.2;
        rr(-r, -r, r * 2, r * 2, r * 0.45);
        ctx.fillStyle = lgrad(-r, -r, r, r, [[0, shade(col, 0.5)], [0.5, col], [1, shade(col, -0.3)]]); ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(pos[k][0] - r * 0.35, pos[k][1] - r * 0.4, r * 0.22, 0, TAU); ctx.fill();
      } else bead(pos[k][0], pos[k][1], r, col, { noShadow: o.flat });
    }
    // 결합 위치(효소가 앉을 곳)
    return pos.slice(0, n - 1).map((p, j) => [(p[0] + pos[j + 1][0]) / 2, (p[1] + pos[j + 1][1]) / 2]);
  }
  // 효소: 입을 벌렸다 닫으며 결합을 끊는 귀여운 모양
  function drawEnzyme(x, y, r, color, t, chomp, face) {
    const open = 0.15 + 0.5 * (RM ? 0.3 : (0.5 + 0.5 * Math.sin(chomp)));
    ctx.save();
    ctx.translate(x, y);
    if (face < 0) ctx.scale(-1, 1);
    ctx.shadowColor = 'rgba(20,30,40,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = rgrad(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r, [[0, shade(color, 0.55)], [0.6, color], [1, shade(color, -0.3)]]);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, open, TAU - open); ctx.closePath(); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.5, r * 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b2333'; ctx.beginPath(); ctx.arc(-r * 0.08, -r * 0.5, r * 0.1, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // 지방(트리글리세리드): 글리세롤(막대) + 지방산 꼬리 3개. tails[i]: 0 붙어 있음 ~ 1 떨어져 나감
  function drawFat(cx, cy, tails, t, sc) {
    sc = sc || 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    const wob = RM ? 0 : Math.sin(t * 1.5 + cx) * 1.5;
    // 글리세롤
    ctx.fillStyle = lgrad(-5, 0, 5, 0, [[0, '#86efac'], [1, '#15803d']]);
    rr(-5, -24 + wob, 10, 48, 5); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const y0 = -16 + i * 16 + wob, k = tails[i];
      const dx = 8 + k * 22, dy = k * (i - 1) * 16;
      ctx.save();
      ctx.globalAlpha = 1 - 0.0 * k;
      ctx.strokeStyle = '#f2b705'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(5 + k * 14, y0 + dy);
      for (let s = 1; s <= 5; s++) ctx.lineTo(5 + k * 14 + s * 6 + (RM ? 0 : 0), y0 + dy + (s % 2 ? -3 : 3));
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  /* =========================================================
     데이터: 영양소 · 검출 용액 · 시료
     ========================================================= */
  const NUT_NAME = { starch: '녹말', sugar: '당', protein: '단백질', fat: '지방' };
  const RG = {
    iodine:   { name: '아이오딘', nut: 'starch',  color: '#d99a32', pos: '청람색' },
    benedict: { name: '베네딕트', nut: 'sugar',   color: '#3f86dd', pos: '황적색', heat: true },
    biuret:   { name: '뷰렛',     nut: 'protein', color: '#7aaeea', pos: '보라색' },
    sudan:    { name: '수단 Ⅲ',   nut: 'fat',     color: '#e0452d', pos: '선홍색' },
  };
  const RG_KEYS = ['iodine', 'benedict', 'biuret', 'sudan'];
  const FOODS = [
    { key: 'rice',    name: '밥물',       icon: '🍚', nut: 'starch',  liquid: '#efe7d3', cont: { starch: 1, sugar: 0, protein: 0, fat: 0 } },
    { key: 'glucose', name: '포도당 용액', icon: '🍇', nut: 'sugar',   liquid: '#f1ecc8', cont: { starch: 0, sugar: 1, protein: 0, fat: 0 } },
    { key: 'egg',     name: '달걀 흰자',   icon: '🥚', nut: 'protein', liquid: '#f6f3e4', cont: { starch: 0, sugar: 0, protein: 1, fat: 0 } },
    { key: 'oil',     name: '식용유',     icon: '🌻', nut: 'fat',     liquid: '#f1d36a', cont: { starch: 0, sugar: 0, protein: 0, fat: 1 } },
  ];
  function stops(list, x) {
    x = clamp(x, 0, 1);
    for (let i = 0; i < list.length - 1; i++) {
      if (x <= list[i + 1][0]) return mix(list[i][1], list[i + 1][1], (x - list[i][0]) / (list[i + 1][0] - list[i][0] || 1));
    }
    return list[list.length - 1][1];
  }
  function reactColor(rg, c, base) {
    if (rg === 'iodine') return stops([[0, '#dcae52'], [0.25, '#7d86b5'], [0.6, '#444c9c'], [1, '#1e2670']], c.starch);
    if (rg === 'benedict') return stops([[0, '#3f86dd'], [0.3, '#58a86a'], [0.6, '#e0b01d'], [1, '#d9531a']], c.sugar);
    if (rg === 'biuret') return stops([[0, '#9cc3f2'], [1, '#8a4cd1']], c.protein);
    return stops([[0, mix(base, '#f0b8a6', 0.35)], [1, '#ff2d55']], c.fat);
  }
  function reactLabel(rg, c) {
    if (rg === 'iodine') return c.starch > 0.7 ? '청람색' : c.starch > 0.08 ? '연한 청람색' : '황갈색(변화 없음)';
    if (rg === 'benedict') return c.sugar > 0.6 ? '황적색' : c.sugar > 0.12 ? '연한 황록색' : '파란색(변화 없음)';
    if (rg === 'biuret') return c.protein > 0.5 ? '보라색' : '연한 파란색(변화 없음)';
    return c.fat > 0.5 ? '선홍색' : '변화 없음';
  }
  const amountOf = (rg, c) => c[RG[rg].nut];

  /* =========================================================
     시험관 · 점적병(스포이트)
     ========================================================= */
  class Tube {
    constructor(o) {
      Object.assign(this, { x: 0, top: 230, w: 46, h: 190, lvl: 0.58, base: '#efe7d3', cFrom: '#efe7d3', cTo: '#efe7d3', mixT: 1, shake: 0, heat: 0, ripple: 0, bub: [], label: '', cont: {}, note: null, busy: false, alpha: 1, tag: '' }, o);
      this.cFrom = this.cTo = this.base;
    }
    get color() { return mix(this.cFrom, this.cTo, this.mixT); }
    surfaceY() { return this.top + this.h * (1 - this.lvl); }
    hit() { return { x: this.x - 36, y: this.top - 24, w: 72, h: this.h + 30 }; }
    update(dt, t) {
      this.shake = SciSim.approach(this.shake, 0, dt, 5);
      this.ripple = SciSim.approach(this.ripple, 0, dt, 4);
      if (this.heat > 0.15 && !RM && Math.random() < dt * 22 * this.heat) this.bub.push({ x: (Math.random() - 0.5) * (this.w - 16), y: this.h * 0.3 + Math.random() * this.h * 0.4, r: 1.5 + Math.random() * 2.2, v: 40 + Math.random() * 50 });
      for (let i = this.bub.length - 1; i >= 0; i--) {
        const b = this.bub[i]; b.y -= b.v * dt; b.x += Math.sin(b.y * 0.2) * 0.25;
        if (this.surfaceY() - this.top > 0 && this.top + b.y < this.surfaceY()) this.bub.splice(i, 1);
      }
    }
    draw(t) {
      const cx = this.x + shk(this.shake, t), top = this.top, bot = top + this.h, r = this.w / 2;
      ctx.save();
      ctx.globalAlpha = this.alpha;
      // 그림자
      ctx.fillStyle = 'rgba(40,60,50,.16)';
      ctx.beginPath(); ctx.ellipse(cx + 6, bot + 4, r + 4, 6, 0, 0, TAU); ctx.fill();
      const path = () => { ctx.beginPath(); ctx.moveTo(cx - r, top); ctx.lineTo(cx - r, bot - r); ctx.arc(cx, bot - r, r, Math.PI, 0, true); ctx.lineTo(cx + r, top); };
      // 유리 뒷면
      path(); ctx.fillStyle = 'rgba(225,240,248,.55)'; ctx.fill();
      // 액체
      ctx.save();
      path(); ctx.clip();
      const ys = this.surfaceY(), col = this.color;
      ctx.fillStyle = lgrad(cx - r, 0, cx + r, 0, [[0, shade(col, -0.18)], [0.35, shade(col, 0.12)], [1, shade(col, -0.22)]]);
      ctx.fillRect(cx - r, ys, this.w, bot - ys + 2);
      if (this.mixT < 1 && !RM) {
        ctx.globalAlpha = this.alpha * 0.35 * Math.sin(this.mixT * Math.PI);
        ctx.strokeStyle = shade(this.cTo, 0.3); ctx.lineWidth = 4;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          for (let s = 0; s <= 8; s++) { const yy = ys + 8 + s * ((bot - ys - 12) / 8); ctx.lineTo(cx + Math.sin(t * 6 + s * 0.9 + k * 2.1) * (r - 8) * 0.7, yy); }
          ctx.stroke();
        }
        ctx.globalAlpha = this.alpha;
      }
      // 기포
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      this.bub.forEach((b) => { ctx.beginPath(); ctx.arc(cx + b.x, top + b.y, b.r, 0, TAU); ctx.fill(); });
      // 액면
      const rp = this.ripple * 2.2;
      ctx.fillStyle = shade(col, 0.28);
      ctx.beginPath(); ctx.ellipse(cx, ys, r - 1, 3.4 + rp, 0, 0, TAU); ctx.fill();
      ctx.restore();
      // 유리 테두리 · 반사
      path(); ctx.strokeStyle = 'rgba(95,125,145,.95)'; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(cx - r + 5, top + 8, 5, this.h - r - 18, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(95,125,145,.95)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.ellipse(cx, top, r + 3, 4.5, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    drawNote(t) {
      const n = this.note;
      if (!n) return;
      const age = now() - n.t0;
      if (age > 5) { this.note = null; return; }
      const a = Math.min(clamp(age / 0.25, 0, 1), clamp((5 - age) / 0.5, 0, 1));
      pill(n.text, clamp(this.x, 90, W - 90), this.top - 22 - (1 - a) * 8, { size: 13.5, bg: n.bg || '#1b2333', alpha: a, h: 26, pad: 10, shadow: true });
    }
  }

  const DROPS = [];
  function makeDropper(key, color, label, bx, drop) {
    return { key, color, label, bx, hx: bx, hy: 138, x: bx, y: 138, tx: bx, ty: 138, state: 'rest', armed: false, sq: 0, job: null, drop: drop || color, glow: 0 };
  }
  function dropperShape(x, y, color, sq) {
    ctx.save();
    const tubePath = () => { ctx.beginPath(); ctx.moveTo(x - 4.5, y - 80); ctx.lineTo(x + 4.5, y - 80); ctx.lineTo(x + 4.5, y - 16); ctx.lineTo(x + 1.6, y); ctx.lineTo(x - 1.6, y); ctx.lineTo(x - 4.5, y - 16); ctx.closePath(); };
    tubePath(); ctx.fillStyle = 'rgba(238,247,252,.9)'; ctx.fill();
    ctx.save(); tubePath(); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x - 6, y - 46, 12, 48); ctx.restore();
    tubePath(); ctx.strokeStyle = '#7f95a8'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#4b5563'; rr(x - 9, y - 91, 18, 12, 3); ctx.fill();
    const bw = 12.5 * (1 + 0.2 * sq), bh = 17 * (1 - 0.3 * sq), cy = y - 90 - bh + 3;
    ctx.fillStyle = rgrad(x - bw * 0.35, cy - bh * 0.35, 2, x, cy, bh * 1.1, [[0, '#ff9a9a'], [0.5, '#e5484d'], [1, '#a61e2a']]);
    ctx.beginPath(); ctx.ellipse(x, cy, bw, bh, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawBottle(dp) {
    const bx = dp.bx, t = now();
    if (dp.state === 'rest' && !dp.armed) dropperShape(bx, dp.hy, dp.color, 0);
    ctx.save();
    if (dp.armed) { ctx.shadowColor = '#16a34a'; ctx.shadowBlur = 16; }
    // 병 몸통
    ctx.fillStyle = 'rgba(205,232,243,.62)'; rr(bx - 38, 76, 76, 76, 15); ctx.fill();
    ctx.restore();
    ctx.save(); rr(bx - 38, 76, 76, 76, 15); ctx.clip();
    ctx.fillStyle = lgrad(bx - 38, 0, bx + 38, 0, [[0, shade(dp.color, -0.12)], [0.4, shade(dp.color, 0.18)], [1, shade(dp.color, -0.2)]]);
    ctx.globalAlpha = 0.9; ctx.fillRect(bx - 38, 96, 76, 60); ctx.globalAlpha = 1;
    ctx.restore();
    ctx.strokeStyle = 'rgba(95,125,145,.95)'; ctx.lineWidth = 2.2; rr(bx - 38, 76, 76, 76, 15); ctx.stroke();
    ctx.fillStyle = '#4b5563'; rr(bx - 14, 66, 28, 12, 4); ctx.fill();
    // 상표
    ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(bx - 33, 107, 66, 30, 7); ctx.fill();
    txt(dp.label, bx, 123, { size: 14.5, weight: 800, color: '#1b2333', align: 'center', base: 'middle', max: 62 });
    ctx.fillStyle = 'rgba(255,255,255,.5)'; rr(bx - 31, 82, 6, 60, 3); ctx.fill();
    if (dp.armed) ring(bx, 114, 52, '#16a34a', t);
  }
  function dpUpdate(dp, dt) {
    dp.sq = SciSim.approach(dp.sq, 0, dt, 9);
    const j = dp.job;
    if (j) {
      j.t += dt;
      const tube = j.tubes[j.i];
      if (j.stage === 'move') {
        const tx = tube.x, ty = tube.top - 40;
        dp.x = SciSim.approach(dp.x, tx, dt, 11); dp.y = SciSim.approach(dp.y, ty, dt, 11);
        if ((Math.hypot(dp.x - tx, dp.y - ty) < 5 && j.t > 0.15) || j.t > 0.9) { j.stage = 'drip'; j.t = 0; j.n = 0; }
      } else if (j.stage === 'drip') {
        dp.x = SciSim.approach(dp.x, tube.x, dt, 14); dp.y = SciSim.approach(dp.y, tube.top - 40, dt, 14);
        if (j.n < 3 && j.t >= 0.12 + j.n * 0.36) {
          DROPS.push({ x: dp.x, y: dp.y + 2, vy: 30, color: dp.drop, tube }); dp.sq = 1; j.n++;
          if (j.n === 1) Sound.tick();
        }
        if (j.n >= 3 && j.t > 0.12 + 2 * 0.36 + 0.42) {
          j.onPoured && j.onPoured(tube, dp);
          j.i++;
          if (j.i < j.tubes.length) { j.stage = 'move'; j.t = 0; } else { j.stage = 'return'; j.t = 0; }
        }
      } else {
        dp.x = SciSim.approach(dp.x, dp.hx, dt, 9); dp.y = SciSim.approach(dp.y, dp.hy, dt, 9);
        if (Math.hypot(dp.x - dp.hx, dp.y - dp.hy) < 2.5 || j.t > 1.2) { dp.x = dp.hx; dp.y = dp.hy; dp.job = null; dp.state = 'rest'; j.onDone && j.onDone(); }
      }
    } else if (dp.state === 'drag') {
      dp.x = SciSim.approach(dp.x, dp.tx, dt, 20); dp.y = SciSim.approach(dp.y, dp.ty, dt, 20);
    } else if (dp.state === 'back') {
      dp.x = SciSim.approach(dp.x, dp.hx, dt, 10); dp.y = SciSim.approach(dp.y, dp.hy, dt, 10);
      if (Math.hypot(dp.x - dp.hx, dp.y - dp.hy) < 2) { dp.x = dp.hx; dp.y = dp.hy; dp.state = 'rest'; }
    } else {
      dp.x = SciSim.approach(dp.x, dp.hx, dt, 12); dp.y = SciSim.approach(dp.y, dp.hy - (dp.armed ? 26 : 0), dt, 12);
    }
  }
  function dropperActive(dp) { return dp.state !== 'rest' || dp.armed; }
  function drawDropperTop(dp) {
    if (!dropperActive(dp)) return;
    const lifted = dp.state === 'drag' ? 1 : 0;
    ctx.save();
    if (lifted) { ctx.shadowColor = 'rgba(20,30,40,.3)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 8; }
    dropperShape(dp.x, dp.y, dp.color, dp.sq);
    ctx.restore();
  }
  function updateDrops(dt) {
    for (let i = DROPS.length - 1; i >= 0; i--) {
      const d = DROPS[i];
      d.vy += 1300 * dt; d.y += d.vy * dt;
      if (d.y >= d.tube.surfaceY()) {
        DROPS.splice(i, 1);
        d.tube.ripple = 1;
        for (let k = 0; k < 4; k++) PFX.emit({ x: d.tube.x + (Math.random() - 0.5) * 10, y: d.tube.surfaceY(), vx: (Math.random() - 0.5) * 70, vy: -60 - Math.random() * 60, life: 0.35, size: 2.2, color: d.color, gravity: 500 });
      }
    }
  }
  function drawDrops() {
    DROPS.forEach((d) => {
      ctx.fillStyle = d.color; ctx.beginPath(); ctx.ellipse(d.x, d.y, 3.4, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(d.x - 1, d.y - 1.6, 1.1, 0, TAU); ctx.fill();
    });
  }
  function tubeUnder(tubes, dp) {
    let best = null, bd = 1e9;
    tubes.forEach((tb) => {
      if (Math.abs(dp.x - tb.x) < 42 && dp.y > tb.top - 140 && dp.y < tb.top + tb.h * 0.55) {
        const d = Math.abs(dp.x - tb.x); if (d < bd) { bd = d; best = tb; }
      }
    });
    return best;
  }
  // 증기 · 뜨거운 물 컵 (베네딕트 가열)
  function drawHotBath(tb, t) {
    if (tb.heat < 0.02) return;
    const a = tb.heat, cx = tb.x, y0 = tb.top + tb.h - 112 + (1 - a) * 40, w = 92;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(120,190,235,.55)'; rr(cx - w / 2, y0, w, 124, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(cx - w / 2 + 6, y0 + 8, 6, 100, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(80,130,170,.9)'; ctx.lineWidth = 2.2; rr(cx - w / 2, y0, w, 124, 12); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const sx = cx - 22 + k * 22, ph = RM ? 0 : (t * 1.2 + k * 0.37) % 1;
      ctx.globalAlpha = a * (1 - ph) * 0.8;
      ctx.beginPath(); ctx.moveTo(sx, y0 - 4 - ph * 22);
      ctx.bezierCurveTo(sx - 7, y0 - 14 - ph * 22, sx + 7, y0 - 22 - ph * 22, sx, y0 - 32 - ph * 22); ctx.stroke();
    }
    ctx.restore();
    pill('🔥 가열 중', cx, tb.top - 24, { size: 13, bg: '#ea580c', alpha: a, h: 24, pad: 9 });
  }
  /* 시험관에 검출 용액이 반응하는 연출 */
  function startReaction(tb, rg, done) {
    const R = RG[rg];
    const finalC = reactColor(rg, tb.cont, tb.base);
    tb.busy = true;
    tb.cFrom = tb.color; tb.cTo = finalC; tb.mixT = 0;
    const dur = R.heat ? 2.6 : 1.5;
    if (R.heat) SciSim.tween(tb, { heat: 1 }, { duration: 0.5, ease: 'outCubic' });
    SciSim.tween(tb, { mixT: 1 }, {
      duration: dur, ease: 'inOutSine', delay: R.heat ? 0.4 : 0.05,
      onDone() {
        if (R.heat) SciSim.tween(tb, { heat: 0 }, { duration: 0.6 });
        tb.busy = false;
        const amt = amountOf(rg, tb.cont);
        done && done(amt, reactLabel(rg, tb.cont), finalC);
      },
    });
  }
  /* 시험관 안 액체가 새 시료로 바뀌는 효과 */
  function refreshTube(tb) {
    if (tb.mixT >= 1 && tb.cTo === tb.base && tb.cFrom === tb.base) return;
    tb.cFrom = tb.cTo = tb.base; tb.mixT = 1; tb.note = null;
    for (let k = 0; k < 6; k++) PFX.emit({ x: tb.x + (Math.random() - 0.5) * 20, y: tb.top + tb.h * 0.5, vx: (Math.random() - 0.5) * 80, vy: -50 - Math.random() * 50, life: 0.5, size: 3, color: 'rgba(255,255,255,.9)', shape: 'bubble', gravity: -20 });
  }
  function startPour(dp, tubes, onPoured, onDone) {
    dp.armed = false;
    dp.state = 'job';
    dp.job = { tubes, i: 0, stage: 'move', t: 0, n: 0, onPoured, onDone };
  }

  /* =========================================================
     장면 ① 영양소 검출
     ========================================================= */
  const COLX = (i) => 120 + i * 187;
  const T = { tubes: [], dp: {}, rec: {}, found: {}, tests: 0, armed: null };
  function initTests() {
    FOODS.forEach((f, i) => {
      T.tubes.push(new Tube({ x: COLX(i), top: 228, h: 188, base: f.liquid, cont: f.cont, food: f }));
      T.rec[f.key] = {};
    });
    RG_KEYS.forEach((k, i) => { T.dp[k] = makeDropper(k, RG[k].color, RG[k].name, COLX(i), RG[k].color); });
  }
  function resetTests(clearFound) {
    T.tubes.forEach((tb) => { tb.busy = false; refreshTube(tb); tb.heat = 0; });
    FOODS.forEach((f) => { T.rec[f.key] = {}; });
    if (clearFound) { T.found = {}; T.tests = 0; }
    RG_KEYS.forEach((k) => { const dp = T.dp[k]; dp.armed = false; });
    T.armed = null;
  }
  const testsBusy = () => RG_KEYS.some((k) => T.dp[k].job);
  function doTest(rg, tb) {
    const dp = T.dp[rg];
    if (testsBusy() || tb.busy) return;
    hideHint();
    refreshTube(tb);
    startPour(dp, [tb], (tube) => {
      startReaction(tube, rg, (amt, label, col) => {
        const pos = amt > 0.5;
        T.rec[tube.food.key][rg] = { pos, label, col };
        T.tests++;
        if (pos) {
          if (!T.found[RG[rg].nut]) Sound.tone(784, 0.14, 'triangle', 0.08);
          T.found[RG[rg].nut] = true;
          tube.note = { text: RG[rg].name + ' → ' + label + ': ' + NUT_NAME[RG[rg].nut] + ' 있음!', bg: '#15803d', t0: now() };
          burst(tube.x, tube.top + 70, [col, '#facc15', '#ffffff'], 16);
        } else {
          tube.note = { text: RG[rg].name + ' → ' + label, bg: '#475569', t0: now() };
        }
      });
    });
  }
  function updateTests(dt, t) {
    T.tubes.forEach((tb) => tb.update(dt, t));
    RG_KEYS.forEach((k) => dpUpdate(T.dp[k], dt));
    updateDrops(dt);
    if (T.drag && T.drag.moved) T.hover = tubeUnder(T.tubes, T.drag.dp); else T.hover = null;
  }
  function drawBench() {
    ctx.fillStyle = lgrad(0, 0, 0, H, [[0, '#f3f8f3'], [0.7, '#e4eee6'], [1, '#e4eee6']]);
    ctx.fillRect(0, -30, W, H + 60);
    ctx.fillStyle = lgrad(0, 425, 0, H, [[0, '#e3cfa6'], [1, '#d3bb8d']]);
    ctx.fillRect(0, 425, W, H - 400);
    ctx.fillStyle = 'rgba(120,90,40,.12)'; ctx.fillRect(0, 425, W, 3);
    ctx.strokeStyle = 'rgba(120,90,40,.08)'; ctx.lineWidth = 1;
    for (let y = 470; y < H + 30; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  function drawRack(tubes, y, pad) {
    if (!tubes.length) return;
    const x0 = Math.min.apply(null, tubes.map((q) => q.x)) - 56, x1 = Math.max.apply(null, tubes.map((q) => q.x)) + 56;
    ctx.fillStyle = lgrad(0, y, 0, y + 20, [[0, '#c98f4a'], [1, '#a86f33']]);
    rr(x0, y, x1 - x0, 20, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,180,.45)'; rr(x0 + 6, y + 3, x1 - x0 - 12, 3, 2); ctx.fill();
    tubes.forEach((q) => { ctx.fillStyle = 'rgba(70,40,10,.38)'; ctx.beginPath(); ctx.ellipse(q.x, y + 10, q.w / 2 + 2, 5, 0, 0, TAU); ctx.fill(); });
  }
  function drawTests(t) {
    drawBench();
    // 시험관 · 받침대
    T.tubes.forEach((tb) => tb.draw(t));
    drawRack(T.tubes, 292);
    T.tubes.forEach((tb) => drawHotBath(tb, t));
    // 시험관 이름
    T.tubes.forEach((tb, i) => {
      pill(tb.food.icon + ' ' + tb.food.name, tb.x, 456, { size: 15, bg: '#fff', color: '#1b2333', border: 'rgba(0,0,0,.12)', borderW: 1.5, h: 30, pad: 12, shadow: true });
    });
    // 검출 기록
    T.tubes.forEach((tb) => {
      RG_KEYS.forEach((k, ri) => {
        const cx = tb.x + (ri % 2 ? 44 : -44), cy = 498 + Math.floor(ri / 2) * 33;
        const rec = T.rec[tb.food.key][k];
        ctx.save();
        rr(cx - 41, cy - 13, 82, 26, 13);
        ctx.fillStyle = rec ? '#fff' : 'rgba(255,255,255,.45)'; ctx.fill();
        ctx.strokeStyle = rec ? (rec.pos ? '#16a34a' : '#94a3b8') : 'rgba(80,60,30,.25)'; ctx.lineWidth = rec && rec.pos ? 2.5 : 1.5; ctx.stroke();
        ctx.restore();
        if (rec) {
          ctx.fillStyle = rec.col; ctx.beginPath(); ctx.arc(cx - 29, cy, 8, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.stroke();
          txt(RG[k].name, cx - 17, cy + 1, { size: 13, weight: 800, color: rec.pos ? '#15803d' : '#475569', base: 'middle', max: 56 });
          if (rec.pos) checkMark(cx + 36, cy - 10, 8);
        } else txt(RG[k].name, cx, cy + 1, { size: 13, weight: 700, color: 'rgba(60,45,20,.5)', align: 'center', base: 'middle', max: 70 });
      });
    });
    // 점적병
    RG_KEYS.forEach((k) => drawBottle(T.dp[k]));
    // 대상 표시
    if (T.armed || (T.drag && T.drag.moved)) {
      T.tubes.forEach((tb) => {
        const hot = T.hover === tb;
        ctx.save();
        ctx.strokeStyle = hot ? '#16a34a' : 'rgba(22,163,74,.45)'; ctx.lineWidth = hot ? 4 : 2.5; ctx.setLineDash(hot ? [] : [7, 6]);
        rr(tb.x - 38, tb.top - 22, 76, tb.h + 32, 16); ctx.stroke();
        ctx.restore();
      });
    }
    RG_KEYS.forEach((k) => drawDropperTop(T.dp[k]));
    drawDrops();
    T.tubes.forEach((tb) => tb.drawNote(t));
  }
  const testsHandlers = {
    down(p) {
      if (testsBusy()) return false;
      for (const k of RG_KEYS) {
        const dp = T.dp[k];
        const onBottle = Math.abs(p.x - dp.bx) < 44 && p.y > 10 && p.y < 160;
        const onDrop = dropperActive(dp) && Math.abs(p.x - dp.x) < 30 && p.y > dp.y - 125 && p.y < dp.y + 10;
        if (onBottle || onDrop) {
          T.drag = { dp, sx: p.x, sy: p.y, moved: false, wasArmed: dp.armed };
          return true;
        }
      }
      if (T.armed) {
        const tb = T.tubes.find((q) => inR(p, q.hit()));
        if (tb) { const key = T.armed.key; T.armed.armed = false; T.armed = null; doTest(key, tb); }
      }
      return false;
    },
    move(p) {
      const d = T.drag; if (!d) return;
      if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 9) {
        d.moved = true; d.dp.state = 'drag'; d.dp.armed = false; if (T.armed === d.dp) T.armed = null; Sound.click();
      }
      if (d.moved) { d.dp.tx = clamp(p.x, 20, W - 20); d.dp.ty = clamp(p.y + 100, 60, H - 40); }
    },
    up(p) {
      const d = T.drag; T.drag = null; if (!d) return;
      const dp = d.dp;
      if (!d.moved) {   // 탭: 선택/해제
        const was = d.wasArmed;
        RG_KEYS.forEach((k) => { T.dp[k].armed = false; });
        T.armed = null;
        if (!was) { dp.armed = true; T.armed = dp; showHint('🧪 이제 검사할 시험관을 눌러요', 4500); Sound.click(); }
        return;
      }
      const tb = tubeUnder(T.tubes, dp);
      if (tb && !tb.busy) { doTest(dp.key, tb); } else { dp.state = 'back'; }
    },
    hover(p) {
      for (const k of RG_KEYS) { const dp = T.dp[k]; if (Math.abs(p.x - dp.bx) < 44 && p.y > 10 && p.y < 160) return 'grab'; }
      if (T.armed && T.tubes.some((q) => inR(p, q.hit()))) return 'pointer';
      return null;
    },
  };

  /* =========================================================
     장면 ② 침의 소화 작용 탐구
     ========================================================= */
  const STARCH_MILK = '#f0e9d8';
  const SAL = { phase: 'prep', tubes: [], A: null, B: null, split: [], time: 0, hold: false, dp: {}, poured: { A: false, B: false }, done: { iodine: false, benedict: false }, res: { A: {}, B: {} }, insetA: 0, tableA: 0, bubbles: [], armed: null, hover: null, drag: null };
  const SAL_BATH = { x0: 480, x1: 770, y0: 318, y1: 500, water: 346 };
  function insetChains(seed) {
    const R = rng(seed);
    const spots = [[-38, -52, 0.1], [36, -14, -0.28], [-36, 24, 0.24], [32, 62, -0.08]];
    return spots.map((s, i) => ({
      dx: s[0], dy: s[1], a: s[2], last: [0, 0, 0, 0, 0], bp: [],
      spec: { n: 6, bonds: [2, 1, 2, 1, 2], thr: [0.15 + R() * 0.75, 0.05 + R() * 0.8, 0.15 + R() * 0.75, 0.05 + R() * 0.85, 0.15 + R() * 0.7], colors: [GLU] },
      ph: R() * 6,
    }));
  }
  const INSET = { A: insetChains(11), B: insetChains(23) };
  const ENZ = [{ x: 0, y: 0, c: 0 }, { x: 0, y: 0, c: 2 }, { x: 0, y: 0, c: 3 }];
  function initSaliva() {
    SAL.phase = 'prep'; SAL.time = 0; SAL.hold = false; SAL.poured = { A: false, B: false }; SAL.done = { iodine: false, benedict: false }; SAL.res = { A: {}, B: {} };
    SAL.split = []; SAL.insetA = 0; SAL.tableA = 0; SAL.armed = null; SAL.drag = null;
    SAL.A = new Tube({ x: 140, top: 232, h: 190, base: STARCH_MILK, lvl: 0.5, cont: { starch: 1, sugar: 0, protein: 0, fat: 0 }, tag: 'A' });
    SAL.B = new Tube({ x: 300, top: 232, h: 190, base: STARCH_MILK, lvl: 0.5, cont: { starch: 1, sugar: 0, protein: 0, fat: 0 }, tag: 'B' });
    SAL.dp = {
      water: makeDropper('water', '#9fdcf5', '증류수', 520, '#7cc7ec'),
      saliva: makeDropper('saliva', '#f5ecb0', '침', 660, '#efd96a'),
      iodine: makeDropper('iodine', RG.iodine.color, '아이오딘', 162, RG.iodine.color),
      benedict: makeDropper('benedict', RG.benedict.color, '베네딕트', 417, RG.benedict.color),
    };
    INSET.A.forEach((c) => { c.last = [0, 0, 0, 0, 0]; }); INSET.B.forEach((c) => { c.last = [0, 0, 0, 0, 0]; });
    syncSalUI();
  }
  const salTubes = () => (SAL.phase === 'test' ? SAL.split : [SAL.A, SAL.B]);
  const salDps = () => (SAL.phase === 'prep' ? [SAL.dp.water, SAL.dp.saliva] : SAL.phase === 'test' ? [SAL.dp.iodine, SAL.dp.benedict] : []);
  const salBusy = () => Object.keys(SAL.dp).some((k) => SAL.dp[k].job);
  const dig = () => clamp(SAL.time / 10, 0, 1);
  function salPour(dp, tube) {
    if (salBusy()) return;
    if (SAL.phase === 'prep') {
      const ok = (dp.key === 'water' && tube === SAL.A) || (dp.key === 'saliva' && tube === SAL.B);
      if (!ok) {
        tube.shake = 1; Sound.fail(); dp.state = 'back'; dp.armed = false; SAL.armed = null;
        toast(dp.key === 'water' ? '증류수는 비교를 위한 <b>A 시험관</b>에 넣어요.' : '침은 <b>B 시험관</b>에 넣어요.', 'warn');
        return;
      }
      if (SAL.poured[tube.tag]) { dp.state = 'back'; dp.armed = false; SAL.armed = null; toast('이미 넣었어요.'); return; }
      startPour(dp, [tube], (tb) => {
        SAL.poured[tb.tag] = true; SciSim.tween(tb, { lvl: tb.lvl + 0.1 }, { duration: 0.5, ease: 'outCubic' });
        tb.note = { text: tb.tag === 'A' ? '녹말 + 증류수' : '녹말 + 침', bg: '#0f766e', t0: now() };
        burst(tb.x, tb.top + 90, ['#bae6fd', '#fde68a', '#fff'], 10);
        syncSalUI();
      });
      SAL.armed = null;
      return;
    }
    if (SAL.phase === 'test') {
      const pair = dp.key === 'iodine' ? SAL.split.filter((q) => q.group === 1) : SAL.split.filter((q) => q.group === 2);
      if (pair.some((q) => q.busy || SAL.res[q.tag][dp.key])) { dp.state = 'back'; dp.armed = false; SAL.armed = null; toast('이 검사는 이미 했어요.'); return; }
      pair.forEach((q) => refreshTube(q));
      startPour(dp, pair, (tb) => {
        startReaction(tb, dp.key, (amt, label, col) => {
          SAL.res[tb.tag][dp.key] = { label, col };
          const isI = dp.key === 'iodine';
          const txtN = isI ? (tb.tag === 'A' ? '청람색: 녹말이 그대로 있어요' : '연한 청람색: 녹말이 줄었어요!') : (tb.tag === 'A' ? '파란색: 당이 없어요' : '황적색: 당(엿당)이 생겼어요!');
          tb.note = { text: txtN, bg: tb.tag === 'B' ? '#15803d' : '#475569', t0: now() };
          if (tb.tag === 'B') burst(tb.x, tb.top + 70, [col, '#facc15', '#fff'], 16);
          if (SAL.res.A[dp.key] && SAL.res.B[dp.key]) SAL.done[dp.key] = true;
          syncSalUI();
        });
      });
      SAL.armed = null;
    }
  }
  function startBath() {
    if (SAL.phase !== 'prep' || !(SAL.poured.A && SAL.poured.B)) return;
    SAL.phase = 'bath'; SAL.time = 0;
    SciSim.tween(SAL.A, { x: 575, top: 262 }, { duration: 0.9, ease: 'outCubic' });
    SciSim.tween(SAL.B, { x: 695, top: 262 }, { duration: 0.9, ease: 'outCubic', delay: 0.08 });
    Sound.click(); syncSalUI();
  }
  function startSplit() {
    if (SAL.phase !== 'bath' || SAL.time < 9.95) return;
    SAL.phase = 'test'; Sound.click();
    const d = dig();
    const mk = (src, group, x) => {
      const tb = new Tube({ x: src.x, top: src.top, h: 170, base: STARCH_MILK, lvl: 0.5, tag: src.tag, group, cont: src.tag === 'A' ? { starch: 1, sugar: 0, protein: 0, fat: 0 } : { starch: 1 - 0.8 * d, sugar: 0.9 * d, protein: 0, fat: 0 } });
      tb.cFrom = tb.cTo = STARCH_MILK;
      SciSim.tween(tb, { x, top: 252 }, { duration: 0.9, ease: 'outCubic', delay: group === 2 ? 0.1 : 0 });
      return tb;
    };
    SAL.split = [mk(SAL.A, 1, 110), mk(SAL.B, 1, 215), mk(SAL.A, 2, 365), mk(SAL.B, 2, 470)];
    SAL.A.alpha = 0; SAL.B.alpha = 0;
    syncSalUI();
  }
  function syncSalUI() {
    const b = $('#btnAct'), tc = $('#timeCtl');
    if (!b) return;
    const ph = SAL.phase;
    tc.hidden = !(ph === 'bath');
    if (ph === 'prep') { b.disabled = !(SAL.poured.A && SAL.poured.B); b.innerHTML = b.disabled ? '💧 먼저 A·B 시험관에 넣어요' : '🌡️ 37 ℃ 물중탕에 넣기'; }
    else if (ph === 'bath') { const ready = SAL.time >= 9.95; b.disabled = !ready; b.innerHTML = ready ? '🧪 시료를 나누어 검사하기' : '⏳ 10분이 지나는 중…'; }
    else { b.disabled = true; b.innerHTML = SAL.done.iodine && SAL.done.benedict ? '✅ 검사를 모두 마쳤어요' : '🧪 검출 용액을 떨어뜨려요'; }
  }
  function updateSaliva(dt, t) {
    [SAL.A, SAL.B].forEach((tb) => tb.update(dt, t));
    SAL.split.forEach((tb) => tb.update(dt, t));
    Object.keys(SAL.dp).forEach((k) => dpUpdate(SAL.dp[k], dt));
    updateDrops(dt);
    SAL.hover = SAL.drag && SAL.drag.moved ? tubeUnder(salTubes(), SAL.drag.dp) : null;
    if (SAL.phase === 'bath' && SAL.time < 10 && !SAL.hold) {
      SAL.time = Math.min(10, SAL.time + dt * 1.25);
      const sl = $('#sTime'); if (sl) { sl.value = SAL.time; sl.style.setProperty('--pct', (SAL.time * 10) + '%'); }
      if (SAL.time >= 9.95) { SAL.time = 10; syncSalUI(); }
    }
    const o = $('#oTime'); if (o) { const tx = (Math.round(SAL.time * 10) / 10).toFixed(1).replace('.0', '') + '분'; if (o.textContent !== tx) o.textContent = tx; }
    SAL.insetA = SciSim.approach(SAL.insetA, SAL.phase === 'bath' ? 1 : 0, dt, 5);
    SAL.tableA = SciSim.approach(SAL.tableA, SAL.phase === 'test' ? 1 : 0, dt, 5);
    // 물중탕 기포
    if (SAL.phase !== 'prep' && !RM && Math.random() < dt * 4) SAL.bubbles.push({ x: SAL_BATH.x0 + 20 + Math.random() * 250, y: SAL_BATH.y1 - 8, v: 22 + Math.random() * 20, r: 2 + Math.random() * 2.5 });
    for (let i = SAL.bubbles.length - 1; i >= 0; i--) { const b = SAL.bubbles[i]; b.y -= b.v * dt; if (b.y < SAL_BATH.water) SAL.bubbles.splice(i, 1); }
    // 분자 모형: 효소의 움직임, 결합이 끊어지는 순간의 불꽃
    if (SAL.phase === 'bath' || SAL.phase === 'test') {
      const cx = 335, cy = 345, pr = dig();
      ENZ.forEach((e, i) => {
        const c = INSET.B[e.c], ab = activeBond(c.spec, pr);
        let tx, ty;
        if (ab >= 0 && c.bp[ab] && pr > 0.001 && pr < 0.999) { tx = c.bp[ab][0] + 2; ty = c.bp[ab][1] - 17; }
        else { tx = cx + Math.cos(t * 0.8 + i * 2.2) * 62; ty = cy + Math.sin(t * 0.6 + i * 1.7) * 62; }
        if (!e.init) { e.x = cx; e.y = cy - 90; e.init = true; }
        e.x = SciSim.approach(e.x, tx, dt, 5); e.y = SciSim.approach(e.y, ty, dt, 5);
      });
      INSET.B.forEach((c) => {
        for (let j = 0; j < 5; j++) {
          const o2 = bondOpen(c.spec, j, dig());
          if (c.last[j] < 0.5 && o2 >= 0.5 && c.bp[j]) { PFX.burst(c.bp[j][0], c.bp[j][1], { count: 7, colors: ['#fde68a', '#fb923c', '#fff'], speed: 90, gravity: 0, size: 2.4, life: 0.45 }); Sound.tick(); }
          c.last[j] = o2;
        }
      });
    }
  }
  /* ---- 그리기 ---- */
  function drawBathBack() {
    const b = SAL_BATH;
    ctx.save();
    ctx.fillStyle = 'rgba(205,232,243,.5)'; rr(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, 16); ctx.fill();
    ctx.restore();
  }
  function drawBathFront(t) {
    const b = SAL_BATH;
    ctx.save();
    rr(b.x0 + 2, b.y0 + 2, b.x1 - b.x0 - 4, b.y1 - b.y0 - 4, 14); ctx.clip();
    const wy = b.water + (RM ? 0 : Math.sin(t * 2) * 1.2);
    ctx.fillStyle = lgrad(0, wy, 0, b.y1, [[0, 'rgba(150,215,245,.55)'], [1, 'rgba(90,170,225,.7)']]);
    ctx.fillRect(b.x0, wy, b.x1 - b.x0, b.y1 - wy);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let x = b.x0; x <= b.x1; x += 8) ctx.lineTo(x, wy + Math.sin(x * 0.07 + (RM ? 0 : t * 2.2)) * 1.6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.4;
    SAL.bubbles.forEach((q) => { ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.stroke(); });
    ctx.restore();
    ctx.strokeStyle = 'rgba(95,125,145,.95)'; ctx.lineWidth = 2.6; rr(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, 16); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; rr(b.x0 + 8, b.y0 + 14, 6, 130, 3); ctx.fill();
    // 온도계
    const tx = 512, ty0 = 300, ty1 = 478;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(tx - 7, ty0, 14, ty1 - ty0, 7); ctx.fill();
    ctx.strokeStyle = '#7f95a8'; ctx.lineWidth = 1.6; rr(tx - 7, ty0, 14, ty1 - ty0, 7); ctx.stroke();
    ctx.fillStyle = '#ef4444'; rr(tx - 3, ty1 - 100, 6, 100, 3); ctx.fill();
    ctx.beginPath(); ctx.arc(tx, ty1 + 2, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(tx - 3, ty1 - 1, 3, 0, TAU); ctx.fill();
    pill('37 ℃', tx + 2, 292, { size: 14, bg: '#dc2626', h: 24, pad: 8 });
    pill('37 ℃ 물중탕', (b.x0 + b.x1) / 2, b.y1 + 28, { size: 14, bg: '#fff', color: '#0f172a', border: 'rgba(0,0,0,.12)', borderW: 1.5, h: 28, pad: 12 });
  }
  function drawInset(cx, cy, r, chains, prog, enz, t, title, sub) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = rgrad(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r, [[0, '#fffef6'], [1, '#fdf0cf']]);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, TAU); ctx.clip();
    const actives = [];
    chains.forEach((c) => { c.bp = drawChain(cx + c.dx, cy + c.dy, c.a, c.spec, prog, t, { ph: c.ph }); });
    if (enz) ENZ.forEach((e, i) => { if (e.init) drawEnzyme(e.x, e.y, 13, '#ea7a1a', t, t * 9 + i, 1); });
    ctx.restore();
    ctx.strokeStyle = '#b7791f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    pill('🔍 ' + title, cx, cy - r - 18, { size: 14, bg: '#92400e', h: 28, pad: 12 });
    pill(sub, cx, cy + r + 20, { size: 14, bg: '#fff', color: '#1b2333', border: 'rgba(0,0,0,.12)', borderW: 1.5, h: 28, pad: 12, shadow: true });
  }
  function drawSaliva(t) {
    drawBench();
    const ph = SAL.phase;
    const inBath = ph === 'bath';
    if (ph !== 'test') drawBathBack();
    // 시험관
    if (ph === 'prep') drawRack([SAL.A, SAL.B], 292);
    if (ph !== 'test') { SAL.A.draw(t); SAL.B.draw(t); }
    SAL.split.forEach((q) => q.draw(t));
    if (ph === 'test') { drawRack(SAL.split.filter((q) => q.group === 1), 292); drawRack(SAL.split.filter((q) => q.group === 2), 292); }
    SAL.split.forEach((q) => drawHotBath(q, t));
    if (ph !== 'test') drawBathFront(t);
    // 이름표
    if (ph !== 'test') {
      [SAL.A, SAL.B].forEach((q) => {
        const inWater = q.top > 250;
        pill(q.tag + (q.tag === 'A' ? ' · 증류수' : ' · 침'), q.x, inWater ? 232 : 456, { size: 14.5, bg: q.tag === 'A' ? '#0369a1' : '#b45309', h: 28, pad: 12, shadow: true, alpha: SAL.poured[q.tag] ? 1 : 0.5 });
      });
    } else {
      SAL.split.forEach((q) => pill(q.tag + (q.tag === 'A' ? ' (물)' : ' (침)'), q.x, 456, { size: 14.5, bg: q.tag === 'A' ? '#0369a1' : '#b45309', h: 28, pad: 12, shadow: true }));
      pill('① 녹말 검사', 162, 222, { size: 14.5, bg: '#fff', color: '#1b2333', border: 'rgba(0,0,0,.12)', borderW: 1.5, h: 28, pad: 12 });
      pill('② 당 검사 (가열)', 417, 222, { size: 14.5, bg: '#fff', color: '#1b2333', border: 'rgba(0,0,0,.12)', borderW: 1.5, h: 28, pad: 12 });
    }
    // 시계와 진행 막대
    if (ph === 'bath') {
      panel(490, 28, 280, 96, { r: 16 });
      txt('⏱️ ' + (Math.round(SAL.time * 10) / 10).toFixed(1).replace('.0', '') + '분', 506, 70, { size: 32, weight: 800, color: '#0f766e', base: 'middle' });
      txt('/ 10분', 700, 74, { size: 16, weight: 800, color: '#64748b', align: 'right', base: 'middle' });
      ctx.fillStyle = '#e2e8f0'; rr(506, 94, 248, 12, 6); ctx.fill();
      ctx.fillStyle = '#14b8a6'; rr(506, 94, Math.max(12, 248 * dig()), 12, 6); ctx.fill();
    }
    // 분자 모형 확대
    if (SAL.insetA > 0.02) {
      ctx.save(); ctx.globalAlpha = SAL.insetA;
      const d = dig();
      drawInset(125, 345, 100, INSET.A, 0, false, t, 'A 속 입자', '녹말 그대로');
      drawInset(335, 345, 100, INSET.B, d, true, t, 'B 속 입자', d < 0.08 ? '녹말 + 아밀레이스' : d > 0.97 ? '엿당으로 분해!' : '녹말 → 엿당');
      ctx.restore();
    }
    // 점적병
    salDps().forEach(drawBottle);
    if (SAL.armed || (SAL.drag && SAL.drag.moved)) {
      salTubes().forEach((tb) => {
        const hot = SAL.hover === tb;
        ctx.save(); ctx.strokeStyle = hot ? '#16a34a' : 'rgba(22,163,74,.45)'; ctx.lineWidth = hot ? 4 : 2.5; ctx.setLineDash(hot ? [] : [7, 6]);
        rr(tb.x - 38, tb.top - 22, 76, tb.h + 32, 16); ctx.stroke(); ctx.restore();
      });
    }
    salDps().forEach(drawDropperTop);
    drawDrops();
    [SAL.A, SAL.B].forEach((q) => q.drawNote(t)); SAL.split.forEach((q) => q.drawNote(t));
    // 결과표
    if (SAL.tableA > 0.02) {
      ctx.save(); ctx.globalAlpha = SAL.tableA;
      panel(585, 150, 205, 226, { r: 16 });
      txt('📋 검사 결과', 687, 178, { size: 16, weight: 800, color: '#0f766e', align: 'center', base: 'middle' });
      [['iodine', '아이오딘', 224], ['benedict', '베네딕트', 300]].forEach(([k, nm, y]) => {
        txt(nm, 598, y - 22, { size: 13.5, weight: 800, color: '#475569', base: 'middle' });
        ['A', 'B'].forEach((tg, i) => {
          const r = SAL.res[tg][k], yy = y + i * 28 - 2;
          pill(tg, 612, yy, { size: 13, bg: tg === 'A' ? '#0369a1' : '#b45309', h: 22, pad: 7 });
          if (r) { ctx.fillStyle = r.col; ctx.beginPath(); ctx.arc(644, yy, 8, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.stroke(); txt(r.label, 658, yy + 1, { size: 13, weight: 800, color: '#1b2333', base: 'middle', max: 124 }); }
          else txt('?', 650, yy + 1, { size: 15, weight: 800, color: '#94a3b8', base: 'middle' });
        });
      });
      txt('B에서 청람색이 약해지고 황적색이 나타나요', 687, 360, { size: 12.5, weight: 700, color: '#64748b', align: 'center', max: 190 });
      ctx.restore();
    }
  }
  const salHandlers = {
    down(p) {
      if (salBusy()) return false;
      for (const dp of salDps()) {
        const onBottle = Math.abs(p.x - dp.bx) < 44 && p.y > 10 && p.y < 160;
        const onDrop = dropperActive(dp) && Math.abs(p.x - dp.x) < 30 && p.y > dp.y - 125 && p.y < dp.y + 10;
        if (onBottle || onDrop) { SAL.drag = { dp, sx: p.x, sy: p.y, moved: false, wasArmed: dp.armed }; return true; }
      }
      if (SAL.armed) {
        const tb = salTubes().find((q) => inR(p, q.hit()));
        if (tb) { const dp = SAL.armed; dp.armed = false; salPour(dp, tb); }
      }
      return false;
    },
    move(p) {
      const d = SAL.drag; if (!d) return;
      if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 9) { d.moved = true; d.dp.state = 'drag'; d.dp.armed = false; SAL.armed = null; Sound.click(); }
      if (d.moved) { d.dp.tx = clamp(p.x, 20, W - 20); d.dp.ty = clamp(p.y + 100, 60, H - 40); }
    },
    up() {
      const d = SAL.drag; SAL.drag = null; if (!d) return;
      const dp = d.dp;
      if (!d.moved) {
        const was = d.wasArmed;
        Object.keys(SAL.dp).forEach((k) => { SAL.dp[k].armed = false; });
        SAL.armed = null;
        if (!was) {
          dp.armed = true; SAL.armed = dp; Sound.click();
          // 탭 한 번으로도 진행: 대상이 하나로 정해진 경우
          if (SAL.phase === 'prep') { const tb = dp.key === 'water' ? SAL.A : SAL.B; dp.armed = false; SAL.armed = null; salPour(dp, tb); }
          else if (SAL.phase === 'test') { dp.armed = false; SAL.armed = null; salPour(dp, SAL.split.find((q) => q.group === (dp.key === 'iodine' ? 1 : 2))); }
        }
        return;
      }
      const tb = tubeUnder(salTubes(), dp);
      if (tb) salPour(dp, tb); else dp.state = 'back';
    },
    hover(p) {
      for (const dp of salDps()) if (Math.abs(p.x - dp.bx) < 44 && p.y > 10 && p.y < 160) return 'grab';
      return null;
    },
  };

  /* =========================================================
     장면 ③ 소화 기관과 소화 효소
     ========================================================= */
  const BX = 10;   // 몸 그림의 가로 이동
  const KEYS = [
    [165, 80], [165, 112], [165, 150], [168, 190], [178, 218],               // 0 입 · 1 목 · 2~3 식도 · 4 들문
    [196, 238], [213, 262], [216, 288], [204, 308], [190, 316],              // 5~8 위 · 9 날문
    [168, 327], [146, 335], [128, 350],                                     // 10~12 십이지장
    [130, 366], [204, 366], [214, 380], [204, 394], [130, 394], [118, 408], [130, 422], [204, 422], [214, 436], [204, 450], [130, 450], [112, 462], // 13~24 소장
    [100, 472], [98, 430], [98, 380], [108, 352], [134, 345], [200, 345], [232, 352], [240, 380], [240, 430], [236, 480], [214, 504], [182, 512], [175, 530], [175, 556], // 25~ 대장
  ];
  const KEY_EDGES = { mouthEnd: 1, esoEnd: 4, stomEnd: 9, smallEnd: 24 };
  const PATH = [];      // 촘촘한 점 [x, y, 누적길이]
  const KEY_AT = [];    // 각 KEY가 PATH의 몇 번째 점인지
  (function buildPath() {
    const n = KEYS.length;
    let L = 0;
    for (let i = 0; i < n - 1; i++) {
      const p0 = KEYS[Math.max(0, i - 1)], p1 = KEYS[i], p2 = KEYS[i + 1], p3 = KEYS[Math.min(n - 1, i + 2)];
      KEY_AT.push(PATH.length);
      for (let s = 0; s < 14; s++) {
        const u = s / 14, u2 = u * u, u3 = u2 * u;
        const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3);
        const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3);
        if (PATH.length) { const q = PATH[PATH.length - 1]; L += Math.hypot(x - q[0], y - q[1]); }
        PATH.push([x, y, L]);
      }
    }
    KEY_AT.push(PATH.length);
    const last = KEYS[n - 1], q = PATH[PATH.length - 1];
    L += Math.hypot(last[0] - q[0], last[1] - q[1]);
    PATH.push([last[0], last[1], L]);
  })();
  const PATH_LEN = PATH[PATH.length - 1][2];
  const SITE_ORDER = ['mouth', 'eso', 'stomach', 'small', 'large'];
  const SITE_S = [0, PATH[KEY_AT[KEY_EDGES.mouthEnd]][2], PATH[KEY_AT[KEY_EDGES.esoEnd]][2], PATH[KEY_AT[KEY_EDGES.stomEnd]][2], PATH[KEY_AT[KEY_EDGES.smallEnd]][2], PATH_LEN];
  const SITE_P = [0, 0.1, 0.22, 0.4, 0.78, 1];     // 슬라이더 위치 ↔ 길이 구간
  function sFromP(p) {
    p = clamp(p, 0, 1);
    for (let i = 0; i < 5; i++) if (p <= SITE_P[i + 1] + 1e-9) return lerp(SITE_S[i], SITE_S[i + 1], (p - SITE_P[i]) / (SITE_P[i + 1] - SITE_P[i]));
    return PATH_LEN;
  }
  function pFromS(s) {
    s = clamp(s, 0, PATH_LEN);
    for (let i = 0; i < 5; i++) if (s <= SITE_S[i + 1] + 1e-9) return lerp(SITE_P[i], SITE_P[i + 1], (s - SITE_S[i]) / (SITE_S[i + 1] - SITE_S[i]));
    return 1;
  }
  function pathAt(s) {
    let lo = 0, hi = PATH.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (PATH[m][2] <= s) lo = m; else hi = m; }
    const a = PATH[lo], b = PATH[hi], u = (s - a[2]) / ((b[2] - a[2]) || 1);
    return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  function siteOfP(p) { for (let i = 0; i < 5; i++) if (p < SITE_P[i + 1] - 1e-9) return SITE_ORDER[i]; return 'large'; }
  const SITE_INFO = {
    mouth:   { name: '입', icon: '👄', fluid: '침(아밀레이스)', info: '입: 이로 잘게 부수고, 침 속 <b>아밀레이스</b>가 <b>녹말</b>을 <b>엿당</b>으로 분해해요.' },
    eso:     { name: '식도', icon: '🌀', fluid: '', info: '식도: 소화액이 없어요. 연동 운동으로 음식물을 위까지 밀어 내려요.' },
    stomach: { name: '위', icon: '🫙', fluid: '위액(펩신·염산)', info: '위: 위액 속 <b>펩신</b>이 <b>단백질</b>을 분해해요. 위벽이 꿈틀거리며 음식물을 섞어요.' },
    small:   { name: '소장', icon: '🌀', fluid: '이자액 · 쓸개즙 · 소장 효소', info: '소장: 이자액의 <b>아밀레이스·트립신·라이페이스</b>와 소장의 효소가 일해요. 쓸개즙은 효소가 아니지만 지방 소화를 도와요.' },
    large:   { name: '대장', icon: '🌀', fluid: '', info: '대장: 소화 효소가 없어요. 소화되지 않은 찌꺼기에서 물을 흡수해요.' },
  };
  // 사이트별 각 영양소의 소화 단계 [시작, 끝, 효소 이름]
  const SITE_ROWS = {
    mouth:   { starch: [0, 1, '아밀레이스'], protein: [0, 0], fat: [0, 0] },
    eso:     { starch: [1, 1], protein: [0, 0], fat: [0, 0] },
    stomach: { starch: [1, 1], protein: [0, 1, '펩신'], fat: [0, 0] },
    small:   { starch: [1, 2, '소장의 효소'], protein: [1, 2, '트립신'], fat: [0, 1, '라이페이스'] },
    large:   { starch: [2, 2], protein: [2, 2], fat: [1, 1] },
  };
  const ENZ_COLOR = { '아밀레이스': '#ea7a1a', '펩신': '#ec4899', '트립신': '#0d9488', '라이페이스': '#d4a017', '소장의 효소': '#ea7a1a' };
  const ROW_DEF = [
    { key: 'starch', name: '녹말', icon: '🍚', stages: ['녹말', '엿당', '포도당'] },
    { key: 'protein', name: '단백질', icon: '🥩', stages: ['단백질', '폴리펩타이드', '아미노산'] },
    { key: 'fat', name: '지방', icon: '🧈', stages: ['지방', '지방산+모노글리세리드'] },
  ];
  const ROW_X = 356, ROW_W = 432, ROW_H = 126, ROW_Y0 = 76, ROW_DY = 134;
  function makeRowChains(key, seed) {
    const R = rng(seed);
    const pl = [[85, 54, 0.04], [245, 56, -0.05], [165, 86, 0.02]];
    return pl.map((q, i) => {
      if (key === 'fat') return { dx: [70, 170, 270][i], dy: 62, a: 0, tails: [0, 0, 0], last: [0, 0], bp: [], thr: [0.1 + R() * 0.5, 0.2 + R() * 0.5], ph: R() * 6 };
      const spec = key === 'starch'
        ? { n: 6, bonds: [2, 1, 2, 1, 2], thr: [0.1 + R() * 0.8, 0.05 + R() * 0.8, 0.1 + R() * 0.8, 0.05 + R() * 0.85, 0.1 + R() * 0.75], colors: [GLU] }
        : { n: 6, bonds: [2, 2, 1, 2, 2], thr: [0.1 + R() * 0.8, 0.1 + R() * 0.8, 0.3 + R() * 0.4, 0.1 + R() * 0.8, 0.1 + R() * 0.8], shape: 'sq', colors: AMINO.slice(i * 2).concat(AMINO.slice(0, i * 2)) };
      return { dx: q[0], dy: q[1] - 8, a: q[2], spec, last: [0, 0, 0, 0, 0], bp: [], ph: R() * 6 };
    });
  }
  const TR = {
    p: 0, pt: 0, drag: false, auto: null, site: 'mouth', siteT: 0, seen: {}, cardsOn: false, cards: [], dragCard: null, flag: {},
    rows: ROW_DEF.map((d, i) => ({ def: d, chains: makeRowChains(d.key, 100 + i * 17), prog: 0, target: 0, enz: { x: ROW_X + 80, y: ROW_Y0 + i * ROW_DY + 50, init: false } })),
    sec: [], crumbs: [],
  };
  const CARD_DEF = [
    { name: '아밀레이스', ok: ['mouth', 'small'] },
    { name: '펩신', ok: ['stomach'] },
    { name: '트립신', ok: ['small'] },
    { name: '라이페이스', ok: ['small'] },
  ];
  const HOT = {
    mouth: { x: 185, y: 82, r: 30, chip: [262, 44] },
    stomach: { x: 232, y: 270, r: 36, chip: [286, 226] },
    small: { x: 185, y: 410, r: 56, chip: [288, 344] },
  };
  function trayPos(i) { return { x: 364 + i * 108, y: 508 }; }
  function initTract() {
    TR.cards = CARD_DEF.map((d, i) => ({ name: d.name, ok: d.ok, site: null, x: trayPos(i).x, y: trayPos(i).y, w: 100, h: 46, lift: 0, shake: 0, idx: i }));
    TR.p = 0; TR.pt = 0; TR.auto = null; TR.seen = {}; TR.flag = {};
    enterSite('mouth', true);
  }
  function enterSite(site, force) {
    if (TR.site === site && !force) return;
    TR.site = site; TR.siteT = now();
    TR.rows.forEach((r) => {
      const cfg = SITE_ROWS[site][r.def.key];
      r.prog = cfg[0]; r.target = cfg[1];
      r.enzName = cfg[2] || null;
      r.chains.forEach((c) => { if (c.last) c.last = c.last.map(() => 0); if (c.tails) c.last = [0, 0]; });
    });
  }
  const rowDone = (r) => Math.abs(r.prog - r.target) < 0.02;
  function updateTract(dt, t) {
    // 음식 위치
    const dragRate = TR.drag ? 16 : 5;
    if (TR.auto) {
      const a = TR.auto, wp = a.wps[a.i];
      TR.pt = wp;
      const dp = TR.pt - TR.p;
      let v = clamp(dp * 2.2, -0.14, 0.14);
      if (Math.abs(v) < 0.012) v = Math.sign(dp) * 0.012;
      TR.p += Math.sign(dp) * Math.min(Math.abs(dp), Math.abs(v) * dt);
      if (Math.abs(TR.pt - TR.p) < 0.003) {
        if (!a.arrive) a.arrive = now();
        const ok = TR.rows.every(rowDone);
        if (ok && now() - a.arrive > 0.9) { a.i++; a.arrive = 0; if (a.i >= a.wps.length) TR.auto = null; }
      } else a.arrive = 0;
    } else {
      TR.p = SciSim.approach(TR.p, TR.pt, dt, dragRate);
      if (Math.abs(TR.p - TR.pt) < 0.0004) TR.p = TR.pt;
    }
    enterSite(siteOfP(TR.p));
    const slider = $('#sPos');
    if (slider && !TR.sliderDown && Math.abs(+slider.value - TR.p) > 0.002) { slider.value = TR.p; slider.style.setProperty('--pct', (TR.p * 100) + '%'); }
    const oPos = $('#oPos'); if (oPos && oPos.textContent !== SITE_INFO[TR.site].name) oPos.textContent = SITE_INFO[TR.site].name;
    // 소화 진행
    TR.rows.forEach((r, ri) => {
      const was = r.prog;
      if (r.prog < r.target) r.prog = Math.min(r.target, r.prog + dt * (RM ? 5 : 0.33));
      const bolusIn = true;
      // 분해 불꽃
      r.chains.forEach((c) => {
        if (c.spec) {
          for (let j = 0; j < 5; j++) {
            const o = bondOpen(c.spec, j, r.prog);
            if (c.last[j] < 0.5 && o >= 0.5 && c.bp[j] && was !== r.prog) { PFX.burst(c.bp[j][0], c.bp[j][1], { count: 6, colors: ['#fde68a', '#fb923c', '#fff'], speed: 80, gravity: 0, size: 2.2, life: 0.4 }); }
            c.last[j] = o;
          }
        } else if (c.tails) {
          const o = smoothstep(c.thr[0], c.thr[0] + 0.3, r.prog);
          if (c.last[0] < 0.5 && o >= 0.5 && was !== r.prog) PFX.burst(ROW_X + c.dx + 14, ROW_Y0 + ri * ROW_DY + 50, { count: 6, colors: ['#fde68a', '#fb923c', '#fff'], speed: 80, gravity: 0, size: 2.2, life: 0.4 });
          c.last[0] = o;
        }
      });
      // 효소 움직임
      const e = r.enz, base = ROW_Y0 + ri * ROW_DY;
      let tx = ROW_X + 330 + Math.cos(t * 0.7 + ri) * 20, ty = base + 56 + Math.sin(t * 0.9 + ri * 2) * 20;
      if (r.enzName && r.prog < r.target - 0.005) {
        const c = r.chains[0];
        if (c.spec) { const ab = activeBond(c.spec, r.prog); if (ab >= 0 && c.bp[ab]) { tx = c.bp[ab][0] + 3; ty = c.bp[ab][1] - 19; } }
        else { tx = ROW_X + c.dx + 40; ty = base + 40; }
      }
      if (!e.init) { e.x = tx; e.y = ty; e.init = true; }
      e.x = SciSim.approach(e.x, tx, dt, 6); e.y = SciSim.approach(e.y, ty, dt, 6);
    });
    // 관찰 완료 표시
    const siteCfg = SITE_ROWS[TR.site];
    const acting = TR.rows.some((r) => r.enzName);
    if (acting && TR.rows.every(rowDone) && !TR.drag) TR.seen[TR.site] = true;
    // 분비 · 부스러기 입자
    const pos = pathAt(sFromP(TR.p));
    if (!RM) {
      if (TR.site === 'mouth' && Math.random() < dt * 9) TR.sec.push({ x: 128 + Math.random() * 6, y: 94, tx: 160 + Math.random() * 10, ty: 84, u: 0, c: '#bae6fd' });
      if (TR.site === 'stomach' && Math.random() < dt * 10) { const q = PATH[KEY_AT[5] + Math.floor(Math.random() * (KEY_AT[9] - KEY_AT[5]))]; TR.sec.push({ x: q[0] + (Math.random() - 0.5) * 50, y: q[1] + (Math.random() - 0.5) * 30, tx: pos.x + 0, ty: pos.y, u: 0, c: '#fde047' }); }
      if (TR.site === 'small' && Math.random() < dt * 6) { TR.sec.push({ x: 150, y: 292, tx: 128, ty: 352, u: 0, c: '#22c55e', duct: 'bile' }); TR.sec.push({ x: 190, y: 332, tx: 150, ty: 336, u: 0, c: '#facc15', duct: 'pan' }); }
      if (Math.abs(TR.pt - TR.p) > 0.002 && Math.random() < dt * 22) TR.crumbs.push({ x: pos.x, y: pos.y, vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14, age: 0, c: ['#e0b060', '#c58a4a', '#d9c08a'][Math.floor(Math.random() * 3)] });
    }
    for (let i = TR.sec.length - 1; i >= 0; i--) { const q = TR.sec[i]; q.u += dt * 1.1; if (q.u >= 1) TR.sec.splice(i, 1); }
    for (let i = TR.crumbs.length - 1; i >= 0; i--) { const q = TR.crumbs[i]; q.age += dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.age > 0.8) TR.crumbs.splice(i, 1); }
    TR.cards.forEach((c) => { c.lift = SciSim.approach(c.lift, TR.dragCard === c ? 1 : 0, dt, 14); c.shake = SciSim.approach(c.shake, 0, dt, 5); });
  }
  /* ---- 그리기 ---- */
  function strokePath(pts, w, color, cap) {
    ctx.beginPath(); smooth(ctx, pts, false);
    ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = cap || 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }
  const segKeys = (a, b) => KEYS.slice(a, b + 1);
  function drawBodyBase(t) {
    // 머리
    ctx.save();
    ctx.fillStyle = '#5b4636'; ctx.beginPath(); ctx.arc(165, 52, 38, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    ctx.fillStyle = lgrad(0, 20, 0, 96, [[0, '#ffe2c8'], [1, '#f7c9a4']]);
    ctx.beginPath(); ctx.ellipse(165, 62, 34, 38, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5b4636'; ctx.beginPath(); ctx.ellipse(165, 36, 36, 18, 0, Math.PI, TAU); ctx.fill();
    // 눈 · 볼
    ctx.fillStyle = '#2b2b3a';
    const blink = !RM && (t % 4.2) > 4.05 ? 0.2 : 1;
    ctx.beginPath(); ctx.ellipse(152, 56, 3.2, 4 * blink, 0, 0, TAU); ctx.ellipse(178, 56, 3.2, 4 * blink, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,120,.35)'; ctx.beginPath(); ctx.ellipse(144, 68, 6, 4, 0, 0, TAU); ctx.ellipse(186, 68, 6, 4, 0, 0, TAU); ctx.fill();
    // 입
    const mouthOpen = TR.site === 'mouth' ? 1 : 0.35;
    ctx.fillStyle = '#9b2c3a'; ctx.beginPath(); ctx.ellipse(165, 80, 11, 3 + 6 * mouthOpen, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f08a96'; ctx.beginPath(); ctx.ellipse(165, 83 + 2 * mouthOpen, 7, 2 + 3 * mouthOpen, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; rr(157, 74.5, 16, 3.5, 1.5); ctx.fill();
    ctx.restore();
    // 몸통
    const torso = new Path2D();
    smooth(torso, [[148, 98], [146, 126], [100, 140], [66, 160], [54, 230], [56, 330], [62, 430], [76, 520], [110, 575], [165, 590], [220, 575], [254, 520], [268, 430], [274, 330], [276, 230], [264, 160], [230, 140], [184, 126], [182, 98]], true);
    ctx.save();
    ctx.shadowColor = 'rgba(60,80,70,.22)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
    ctx.fillStyle = lgrad(0, 100, 0, 590, [[0, '#fbe9d8'], [1, '#f6dcc4']]); ctx.fill(torso);
    ctx.restore();
    ctx.strokeStyle = 'rgba(190,140,100,.7)'; ctx.lineWidth = 2.5; ctx.stroke(torso);
    ctx.save(); ctx.clip(torso);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(110, 300, 22, 190, 0.05, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawOrgans(t) {
    const cur = TR.site;
    // 침샘
    [[128, 98, -1], [202, 98, 1]].forEach((g) => {
      ctx.save(); ctx.translate(g[0], g[1]);
      ctx.fillStyle = lgrad(0, -8, 0, 8, [[0, '#f3d27a'], [1, '#d9a93c']]);
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, g[2] * 0.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(150,100,20,.6)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    });
    // 간
    const liver = new Path2D(); smooth(liver, [[68, 238], [78, 216], [118, 204], [166, 212], [188, 232], [172, 256], [130, 270], [92, 268]], true);
    ctx.save(); ctx.shadowColor = 'rgba(80,20,10,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    ctx.fillStyle = lgrad(0, 204, 0, 270, [[0, '#d0694a'], [1, '#9a3d27']]); ctx.fill(liver); ctx.restore();
    ctx.strokeStyle = '#7f2d1c'; ctx.lineWidth = 2; ctx.stroke(liver);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(104, 222, 22, 6, -0.2, 0, TAU); ctx.fill();
    // 쓸개
    ctx.save(); ctx.translate(150, 280);
    ctx.fillStyle = lgrad(0, -14, 0, 14, [[0, '#6fcf76'], [1, '#2f8f3f']]);
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 15, 0.25, 0, TAU); ctx.fill(); ctx.strokeStyle = '#1f6b2e'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.restore();
    // 이자
    const pan = new Path2D(); smooth(pan, [[124, 328], [150, 320], [190, 322], [238, 314], [242, 328], [192, 342], [142, 344], [120, 338]], true);
    ctx.fillStyle = lgrad(0, 316, 0, 344, [[0, '#f6d27c'], [1, '#e0a93e']]); ctx.fill(pan);
    ctx.strokeStyle = '#b9822a'; ctx.lineWidth = 1.8; ctx.stroke(pan);
    // 대장
    const li = KEYS.slice(24);
    strokePath(li, 27, '#b97e47'); strokePath(li, 21, '#e0a76b');
    ctx.save(); ctx.setLineDash([2, 12]); strokePath(li, 21, 'rgba(120,70,30,.55)', 'butt'); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 3;
    // 식도
    const eso = segKeys(1, 5);
    strokePath(eso, 17, '#c9566a'); strokePath(eso, 12, '#ec8a98');
    // 위
    const sq = TR.site === 'stomach' && !RM ? Math.sin(t * 5) * 2.5 : 0;
    const stomach = segKeys(4, 9);
    ctx.save(); ctx.shadowColor = 'rgba(120,30,50,.3)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 3;
    strokePath(stomach, 52 + sq, '#c9566a'); ctx.restore();
    strokePath(stomach, 46 + sq, '#f09aa8');
    strokePath(stomach, 24, 'rgba(255,200,205,.55)');
    ctx.strokeStyle = 'rgba(190,70,95,.45)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) { const q = PATH[KEY_AT[5] + k * 11]; const nq = PATH[KEY_AT[5] + k * 11 + 3]; const a = Math.atan2(nq[1] - q[1], nq[0] - q[0]) + Math.PI / 2; ctx.beginPath(); ctx.moveTo(q[0] + Math.cos(a) * 14, q[1] + Math.sin(a) * 14); ctx.lineTo(q[0] - Math.cos(a) * 14, q[1] - Math.sin(a) * 14); ctx.stroke(); }
    // 소장
    const sm = KEYS.slice(9, 25);
    strokePath(sm, 20, '#d1646f'); strokePath(sm, 15, '#f5a3a8');
    strokePath(sm, 4, 'rgba(255,255,255,.45)');
    // 이자관 · 쓸개관 (소장 소화 때 흐르는 소화액)
    if (cur === 'small') {
      ctx.save(); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.setLineDash([2, 7]); ctx.lineDashOffset = -(RM ? 0 : t * 22);
      ctx.strokeStyle = '#16a34a'; ctx.beginPath(); ctx.moveTo(150, 292); ctx.quadraticCurveTo(138, 322, 128, 352); ctx.stroke();
      ctx.strokeStyle = '#d4a017'; ctx.beginPath(); ctx.moveTo(190, 332); ctx.quadraticCurveTo(165, 338, 136, 346); ctx.stroke();
      ctx.restore();
    } else {
      ctx.save(); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(40,120,60,.45)'; ctx.beginPath(); ctx.moveTo(150, 292); ctx.quadraticCurveTo(138, 322, 128, 352); ctx.stroke();
      ctx.strokeStyle = 'rgba(180,130,20,.45)'; ctx.beginPath(); ctx.moveTo(190, 332); ctx.quadraticCurveTo(165, 338, 136, 346); ctx.stroke(); ctx.restore();
    }
    // 분비물 입자
    TR.sec.forEach((q) => {
      const u = q.u, x = lerp(q.x, q.tx, u), y = lerp(q.y, q.ty, u) - Math.sin(u * Math.PI) * 6;
      ctx.globalAlpha = 1 - Math.abs(u - 0.5) * 1.2;
      ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    });
  }
  function bolusColor() {
    const s = TR.site;
    return s === 'mouth' || s === 'eso' ? '#e4b46a' : s === 'stomach' ? '#d9ae80' : s === 'small' ? '#ecd08e' : '#b88c58';
  }
  function drawBolus(t) {
    const pos = pathAt(sFromP(TR.p));
    TR.crumbs.forEach((q) => { ctx.globalAlpha = 1 - q.age / 0.8; ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, 2.4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; });
    const r = TR.site === 'large' ? 11 : 12;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.shadowColor = 'rgba(70,40,10,.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    const sq = RM ? 0 : Math.sin(t * 6) * 0.06;
    ctx.scale(1 + sq, 1 - sq);
    ctx.fillStyle = rgrad(-r * 0.35, -r * 0.4, 1, 0, 0, r * 1.1, [[0, shade(bolusColor(), 0.55)], [0.6, bolusColor()], [1, shade(bolusColor(), -0.3)]]);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.shadowColor = 'transparent';
    if (TR.site === 'mouth' || TR.site === 'eso') {   // 밥 · 고기 · 기름 알갱이
      [['#fff7dd', -4, -3], ['#8b3a62', 4, -1], ['#f2c23a', 0, 5]].forEach((d) => { ctx.fillStyle = d[0]; ctx.beginPath(); ctx.arc(d[1], d[2], 3.2, 0, TAU); ctx.fill(); });
    }
    ctx.restore();
    if (TR.dragHint) ring(pos.x, pos.y, 20, '#16a34a', t);
  }
  const ORGAN_LABELS = [
    { site: 'mouth', text: '입', x: 100, y: 62, ax: 148, ay: 76 },
    { site: 'eso', text: '식도', x: 112, y: 160, ax: 160, ay: 160 },
    { site: 'stomach', text: '위', x: 296, y: 262, ax: 245, ay: 268 },
    { name: 'liver', text: '간', x: 40, y: 236, ax: 78, ay: 238 },
    { name: 'gall', text: '쓸개', x: 112, y: 290, ax: 140, ay: 284 },
    { name: 'pan', text: '이자', x: 300, y: 308, ax: 238, ay: 320 },
    { site: 'small', text: '소장', x: 268, y: 424, ax: 210, ay: 410 },
    { site: 'large', text: '대장', x: 40, y: 410, ax: 92, ay: 412 },
  ];
  function drawLabels() {
    ORGAN_LABELS.forEach((o) => {
      const on = o.site && o.site === TR.site;
      ctx.strokeStyle = 'rgba(60,70,90,.45)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(o.x + (o.x < o.ax ? 16 : -16), o.y); ctx.lineTo(o.ax, o.ay); ctx.stroke();
      pill(o.text, o.x, o.y, { size: 14, bg: on ? '#16a34a' : '#fff', color: on ? '#fff' : '#1b2333', border: on ? '#15803d' : 'rgba(0,0,0,.18)', borderW: 1.5, h: 26, pad: 9, shadow: true });
    });
  }
  function drawBodyScene(t) {
    ctx.save(); ctx.translate(BX, 0);
    drawBodyBase(t);
    drawOrgans(t);
    drawBolus(t);
    drawLabels();
    // 카드 놓는 곳
    if (TR.cardsOn) {
      Object.keys(HOT).forEach((k) => {
        const h = HOT[k], hot = TR.dragCard && Math.hypot(TR.dragCard.x + TR.dragCard.w / 2 - BX - h.x, TR.dragCard.y + TR.dragCard.h / 2 - h.y) < h.r + 40;
        ctx.save();
        ctx.strokeStyle = hot ? '#16a34a' : 'rgba(22,163,74,.55)'; ctx.lineWidth = hot ? 4 : 2.5; ctx.setLineDash(hot ? [] : [6, 6]);
        ctx.fillStyle = hot ? 'rgba(34,197,94,.18)' : 'rgba(34,197,94,.08)';
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r + (RM ? 0 : Math.sin(t * 5) * 2), 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
      });
    }
    ctx.restore();
  }
  function stageChip(x, y, label, on, done) {
    ctx.font = font(13, 800);
    const w = ctx.measureText(label).width + 18;
    rr(x, y - 11, w, 22, 11);
    ctx.fillStyle = on ? '#16a34a' : done ? '#dcfce7' : '#f1f5f9'; ctx.fill();
    ctx.strokeStyle = on ? '#15803d' : '#cbd5e1'; ctx.lineWidth = 1.5; ctx.stroke();
    txt(label, x + w / 2, y + 1, { size: 13, weight: 800, color: on ? '#fff' : '#64748b', align: 'center', base: 'middle' });
    return w;
  }
  function drawRows(t) {
    TR.rows.forEach((r, ri) => {
      const y0 = ROW_Y0 + ri * ROW_DY;
      const cfg = SITE_ROWS[TR.site][r.def.key];
      const active = !!cfg[2];
      ctx.save();
      panel(ROW_X, y0, ROW_W, ROW_H, { r: 16, bg: '#fff', border: active ? '#16a34a' : 'rgba(0,0,0,.06)', bw: active ? 2.5 : 1 });
      // 이름
      txt(r.def.icon, ROW_X + 30, y0 + 52, { size: 28, align: 'center', base: 'middle' });
      txt(r.def.name, ROW_X + 30, y0 + 84, { size: 15, weight: 800, align: 'center', color: '#1b2333', base: 'middle' });
      // 효소 · 안내
      if (active) {
        const col = ENZ_COLOR[cfg[2]];
        pill(cfg[2] + (cfg[2] === '소장의 효소' ? '(엿당 분해)' : '') + '가 일해요', ROW_X + 64, y0 + 18, { size: 13.5, bg: col, align: 'left', h: 24, pad: 10 });
      } else {
        txt('여기서는 이 영양소를 분해하는 소화 효소가 없어요', ROW_X + 64, y0 + 19, { size: 13, weight: 700, color: '#94a3b8', base: 'middle', max: ROW_W - 76 });
      }
      // 분자
      ctx.beginPath(); rr(ROW_X + 62, y0 + 30, ROW_W - 74, 72, 10); ctx.clip();
      ctx.fillStyle = '#fffaf0'; ctx.fillRect(ROW_X + 62, y0 + 30, ROW_W - 74, 72);
      r.chains.forEach((c, ci) => {
        if (c.spec) c.bp = drawChain(ROW_X + c.dx + 30, y0 + c.dy + 4, c.a, c.spec, r.prog, t, { ph: c.ph, scale: 0.92 });
        else {
          const o = smoothstep(c.thr[0], c.thr[0] + 0.3, r.prog), o2 = smoothstep(c.thr[1], c.thr[1] + 0.3, r.prog);
          drawFat(ROW_X + c.dx + 20, y0 + c.dy - 8, [o, 0, o2], t, 0.95);
        }
      });
      if (r.enzName || r.enz.init) {
        if (active && r.enz.init) drawEnzyme(r.enz.x, r.enz.y, 13, ENZ_COLOR[cfg[2]], t, t * 9 + ri, 1);
      }
      ctx.restore();
      // 단계 칩
      let x = ROW_X + 66;
      const stages = r.def.stages;
      const stageNow = stages.length === 2 ? (r.prog > 0.5 ? 1 : 0) : Math.min(2, Math.round(r.prog));
      stages.forEach((s, si) => {
        const w = stageChip(x, y0 + ROW_H - 12, s, si === stageNow, si < stageNow);
        x += w;
        if (si < stages.length - 1) { txt('→', x + 7, y0 + ROW_H - 11, { size: 14, weight: 800, color: '#94a3b8', align: 'center', base: 'middle' }); x += 14; }
      });
    });
  }
  function drawCards(t) {
    TR.cards.forEach((c) => {
      const col = ENZ_COLOR[c.name], lift = c.lift, compact = !!c.site;
      const sx = shk(c.shake, t);
      ctx.save();
      ctx.translate(c.x + c.w / 2 + sx, c.y + c.h / 2 - lift * 6); ctx.scale(1 + lift * 0.06, 1 + lift * 0.06);
      ctx.shadowColor = 'rgba(30,40,60,' + (0.18 + lift * 0.18).toFixed(2) + ')'; ctx.shadowBlur = 8 + lift * 12; ctx.shadowOffsetY = 3 + lift * 6;
      rr(-c.w / 2, -c.h / 2, c.w, c.h, compact ? 13 : 12);
      ctx.fillStyle = TR.flag[c.name] ? '#fecaca' : compact ? col : '#fff'; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = TR.flag[c.name] ? '#ef4444' : col; ctx.lineWidth = 3; ctx.stroke();
      if (!compact) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-c.w / 2 + 17, 0); ctx.arc(-c.w / 2 + 17, 0, 9, 0.5, TAU - 0.5); ctx.closePath(); ctx.fill(); }
      txt(c.name, compact ? 0 : -c.w / 2 + 31, 1, { size: compact ? 14 : 15, weight: 800, color: compact && !TR.flag[c.name] ? '#fff' : '#1b2333', align: compact ? 'center' : 'left', base: 'middle', max: c.w - (compact ? 10 : 38) });
      ctx.restore();
    });
  }
  function drawTract(t) {
    ctx.fillStyle = '#eef4ef'; ctx.fillRect(0, -30, W, H + 60);
    drawBodyScene(t);
    // 오른쪽: 입자 모형
    const si = SITE_INFO[TR.site];
    txt('🔍 입자 모형으로 보기', ROW_X + 4, 36, { size: 16, weight: 800, color: '#475569', base: 'middle' });
    pill(si.name + (si.fluid ? ' · ' + si.fluid : ''), ROW_X + ROW_W, 36, { size: 15, bg: '#16a34a', align: 'right', h: 30, pad: 13 });
    drawRows(t);
    if (TR.cardsOn) {
      txt('🃏 효소 카드를 일하는 곳(입·위·소장)에 끌어다 놓아요', ROW_X + 4, 494, { size: 14.5, weight: 800, color: '#475569', base: 'middle' });
      for (let i = 0; i < 4; i++) { const p = trayPos(i); ctx.fillStyle = 'rgba(100,116,139,.12)'; rr(p.x, p.y, 100, 46, 12); ctx.fill(); }
      drawCards(t);
    } else {
      panel(ROW_X, 482, ROW_W, 100, { r: 16, bg: '#fffbea', border: '#fde68a' });
      const lines = wrapLines(si.info.replace(/<\/?b>/g, ''), ROW_W - 36, 15.5);
      lines.slice(0, 3).forEach((ln, i) => txt(ln, ROW_X + 18, 508 + i * 25, { size: 15.5, weight: 700, color: '#44403c', base: 'middle' }));
    }
  }
  const wrapCache = new Map();
  function wrapLines(s, maxW, size) {
    const key = s + '|' + maxW + '|' + size;
    if (wrapCache.has(key)) return wrapCache.get(key);
    ctx.save(); ctx.font = font(size, 700);
    const out = []; let cur = '';
    s.split(' ').forEach((w) => {
      const tryS = cur ? cur + ' ' + w : w;
      if (ctx.measureText(tryS).width <= maxW) cur = tryS; else { if (cur) out.push(cur); cur = w; }
    });
    if (cur) out.push(cur);
    ctx.restore(); wrapCache.set(key, out);
    return out;
  }
  function cardRest(c) { const p = trayPos(c.idx); return { x: p.x, y: p.y }; }
  function cardSnap(c, animate) {
    let tx, ty, tw, th;
    if (c.site) {
      const h = HOT[c.site], n = TR.cards.filter((q) => q.site === c.site && q.idx < c.idx).length;
      tx = BX + h.chip[0] - 46; ty = h.chip[1] + n * 30 - 13; tw = 92; th = 26;
    } else { const p = cardRest(c); tx = p.x; ty = p.y; tw = 100; th = 46; }
    if (animate) SciSim.tween(c, { x: tx, y: ty, w: tw, h: th }, { duration: 0.45, ease: 'outBack' }); else { c.x = tx; c.y = ty; c.w = tw; c.h = th; }
  }
  const trHandlers = {
    down(p) {
      if (TR.cardsOn) {
        for (let i = TR.cards.length - 1; i >= 0; i--) {
          const c = TR.cards[i];
          if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) {
            TR.dragCard = c; c.ox = p.x - c.x; c.oy = p.y - c.y; c.site = null; delete TR.flag[c.name]; Sound.click();
            TR.cards.splice(i, 1); TR.cards.push(c);
            return true;
          }
        }
      }
      // 음식을 직접 끌기
      const pos = pathAt(sFromP(TR.p));
      if (Math.hypot(p.x - BX - pos.x, p.y - pos.y) < 30) { TR.drag = true; TR.auto = null; TR.sliderDown = false; return true; }
      // 기관 이름/몸을 눌러 이동
      const q = { x: p.x - BX, y: p.y };
      if (q.x > 40 && q.x < 300 && q.y > 40 && q.y < 590) {
        let best = -1, bd = 1e9;
        for (let i = 0; i < PATH.length; i++) { const d = Math.hypot(PATH[i][0] - q.x, PATH[i][1] - q.y); if (d < bd) { bd = d; best = i; } }
        if (bd < 26) { TR.auto = null; TR.pt = pFromS(PATH[best][2]); TR.drag = true; return true; }
      }
      return false;
    },
    move(p) {
      if (TR.dragCard) { const c = TR.dragCard; c.x = clamp(p.x - c.ox, 0, W - c.w); c.y = clamp(p.y - c.oy, 0, H - c.h); return; }
      if (TR.drag) {
        const q = { x: p.x - BX, y: p.y };
        let best = 0, bd = 1e9;
        for (let i = 0; i < PATH.length; i++) { const d = Math.hypot(PATH[i][0] - q.x, PATH[i][1] - q.y); if (d < bd) { bd = d; best = i; } }
        TR.pt = pFromS(PATH[best][2]);
      }
    },
    up() {
      if (TR.dragCard) {
        const c = TR.dragCard; TR.dragCard = null;
        let hit = null, bd = 1e9;
        Object.keys(HOT).forEach((k) => { const h = HOT[k], d = Math.hypot(c.x + c.w / 2 - BX - h.x, c.y + c.h / 2 - h.y); if (d < h.r + 40 && d < bd) { bd = d; hit = k; } });
        c.site = hit; cardSnap(c, true);
        if (hit) { burst(c.x + c.w / 2, c.y + c.h / 2, ['#22c55e', '#facc15'], 8); Sound.tick(); }
        return;
      }
      TR.drag = false;
    },
    hover(p) {
      if (TR.cardsOn && TR.cards.some((c) => p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h)) return 'grab';
      const pos = pathAt(sFromP(TR.p));
      if (Math.hypot(p.x - BX - pos.x, p.y - pos.y) < 30) return 'grab';
      return null;
    },
  };
  function startEat() {
    TR.auto = { wps: [0.05, 0.16, 0.31, 0.59, 0.89, 1], i: 0, arrive: 0 };
    TR.p = 0; TR.pt = 0; enterSite('mouth', true); Sound.click();
  }

  /* =========================================================
     장면 ④ 소장 융털과 영양소 흡수
     ========================================================= */
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
    return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u) };
  }
  // 융털 하나 (확대한 그림, z=1 좌표)
  const VX = 470, V_TOP = 72, V_BASE = 525;
  const CAP_KEYS = [[508, 530], [508, 330], [508, 200], [494, 140], [470, 118], [446, 140], [432, 200], [432, 330], [432, 530]];
  const CAP = splineSample(CAP_KEYS, 10);
  const LAC = [[VX, 150, 0], [VX, 530, 380]];
  const VIL_KEYS = [[388, 528], [392, 420], [396, 300], [402, 200], [418, 124], [446, 84], [470, V_TOP], [494, 84], [522, 124], [538, 200], [544, 300], [548, 420], [552, 528]];
  // 작은창자 벽 (z=0 좌표)
  const AX0 = 70, ADX = 55, AN = 13, A_BASE = 330, A_H = 110, A_TARGET = 6;
  const A_OUT = (function () {
    const pts = [[20, A_BASE]];
    for (let i = 0; i < AN; i++) {
      const x = AX0 + ADX * i;
      pts.push([x - 15, A_BASE], [x - 15, A_BASE - A_H + 16]);
      for (let k = 1; k <= 6; k++) { const a = Math.PI + (k / 6) * Math.PI; pts.push([x + Math.cos(a) * 15, A_BASE - A_H + 16 + Math.sin(a) * 15 + 0]); }
      pts.push([x + 15, A_BASE - A_H + 16], [x + 15, A_BASE]);
    }
    pts.push([AX0 + ADX * (AN - 1) + 40, A_BASE]);
    const out = []; let L = 0;
    pts.forEach((p, i) => { if (i) L += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); out.push([p[0], p[1], L]); });
    return out;
  })();
  const NUTR = [
    { key: 'glucose', name: '포도당', dest: 'cap', hint: '포도당은 물에 잘 녹는 영양소예요. 물에 녹는 영양소는 혈액으로 가요.' },
    { key: 'amino', name: '아미노산', dest: 'cap', hint: '아미노산도 물에 잘 녹아요. 물에 녹는 영양소는 혈액이 지나는 관으로 가요.' },
    { key: 'mineral', name: '무기염류', dest: 'cap', hint: '무기염류(수용성)는 혈액이 지나는 관으로 흡수돼요.' },
    { key: 'fa', name: '지방산', dest: 'lac', hint: '지방이 분해된 영양소는 기름에 잘 녹아요. 림프가 지나는 관으로 가요.' },
    { key: 'mg', name: '모노글리세리드', dest: 'lac', hint: '지방이 분해된 영양소는 기름에 잘 녹아요. 림프가 지나는 관으로 가요.' },
    { key: 'vit', name: '지용성 비타민', dest: 'lac', hint: '지용성 비타민은 기름에 잘 녹아요. 림프가 지나는 관으로 가요.' },
  ];
  const V = { z: 0, target: 0, reached: false, items: [], got: {}, lists: { cap: [], lac: [] }, flow: [], cells: [], drag: null, race: 0, respawn: [], hoverZone: null, sliderDown: false };
  function itemSpawn(key, i) {
    const spots = [[110, 150], [250, 130], [150, 290], [300, 270], [110, 430], [260, 430]];
    const s = spots[i % 6];
    return { key, home: i, x: s[0], y: s[1], vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, ph: Math.random() * 6, lift: 0, shake: 0, state: 'free', fade: 1 };
  }
  function initVilli() {
    V.items = NUTR.map((n, i) => itemSpawn(n.key, i));
    V.got = {}; V.lists = { cap: [], lac: [] }; V.flow = []; V.respawn = [];
    V.cells = []; for (let i = 0; i < 16; i++) V.cells.push({ s: Math.random() * CAP[CAP.length - 1][2] });
  }
  const nutrDef = (key) => NUTR.find((n) => n.key === key);
  function zoneAt(p) {
    if (p.x < 388 || p.x > 552 || p.y < V_TOP || p.y > 535) return null;
    return Math.abs(p.x - VX) < 22 && p.y > 140 ? 'lac' : 'cap';
  }
  function updateVilli(dt, t) {
    V.z = SciSim.approach(V.z, V.target, dt, V.sliderDown ? 18 : 3.2);
    if (Math.abs(V.z - V.target) < 0.002) V.z = V.target;
    if (V.z > 0.985) V.reached = true;
    const sl = $('#sZoom'); if (sl && !V.sliderDown && Math.abs(+sl.value - V.z) > 0.004) { sl.value = V.z; sl.style.setProperty('--pct', (V.z * 100) + '%'); }
    const oz = $('#oZoom'); if (oz) { const tx = V.z > 0.85 ? '융털 하나' : V.z > 0.25 ? '확대하는 중' : '작은창자 벽'; if (oz.textContent !== tx) oz.textContent = tx; }
    V.race = (V.race + dt / 7) % 1;
    // 영양소 떠다니기
    V.items.forEach((it) => {
      it.lift = SciSim.approach(it.lift, V.drag && V.drag.it === it ? 1 : 0, dt, 14);
      it.shake = SciSim.approach(it.shake, 0, dt, 5);
      if (it.state === 'free' && !(V.drag && V.drag.it === it)) {
        it.ph += dt;
        if (!RM) { it.vx += (Math.random() - 0.5) * 90 * dt; it.vy += (Math.random() - 0.5) * 90 * dt; }
        const sp = Math.hypot(it.vx, it.vy); if (sp > 26) { it.vx *= 26 / sp; it.vy *= 26 / sp; }
        it.x += it.vx * dt; it.y += it.vy * dt;
        if (it.x < 60) it.vx = Math.abs(it.vx) + 4; if (it.x > 340) it.vx = -Math.abs(it.vx) - 4;
        if (it.y < 90) it.vy = Math.abs(it.vy) + 4; if (it.y > 470) it.vy = -Math.abs(it.vy) - 4;
      } else if (it.state === 'flow') {
        it.s += dt * 70;
        const poly = it.zone === 'cap' ? CAP : LAC;
        const L = poly[poly.length - 1][2];
        const q = atLen(poly, it.s);
        it.x = q.x; it.y = q.y;
        if (it.s > L - 30) it.fade = clamp((L - it.s) / 30, 0, 1);
        if (it.s >= L) { it.state = 'gone'; V.respawn.push({ key: it.key, t: now() + 1.2, home: it.home }); }
      }
    });
    V.items = V.items.filter((it) => it.state !== 'gone');
    V.respawn = V.respawn.filter((r) => {
      if (now() < r.t) return true;
      if (!V.items.some((it) => it.key === r.key)) { const it = itemSpawn(r.key, r.home); it.fade = 0; V.items.push(it); SciSim.tween(it, { fade: 1 }, { duration: 0.6 }); }
      return false;
    });
    V.cells.forEach((c) => { c.s = (c.s + dt * 55) % CAP[CAP.length - 1][2]; });
    V.hoverZone = V.drag && V.drag.moved ? zoneAt(V.drag.it) : null;
  }
  /* ---- 영양소 그림 ---- */
  function drawNutr(key, x, y, r, t, ph) {
    ctx.save(); ctx.translate(x, y);
    if (key === 'glucose') { bead(0, 0, r, GLU); }
    else if (key === 'amino') {
      ctx.rotate(RM ? 0.2 : Math.sin(t * 1.3 + ph) * 0.25);
      ctx.shadowColor = 'rgba(20,30,40,.25)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
      rr(-r, -r, r * 2, r * 2, r * 0.45); ctx.fillStyle = lgrad(-r, -r, r, r, [[0, '#d8b4fe'], [0.5, '#a855f7'], [1, '#7e22ce']]); ctx.fill();
    } else if (key === 'mineral') {
      bead(0, 0, r * 0.85, '#64748b'); txt('+', 0, 1, { size: r * 1.4, weight: 800, color: '#fff', align: 'center', base: 'middle' });
    } else if (key === 'fa') {
      ctx.rotate(-0.3);
      ctx.strokeStyle = '#f2b705'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 1.2, 0); for (let s = 1; s <= 5; s++) ctx.lineTo(-r * 1.2 + s * r * 0.5, s % 2 ? -4 : 4); ctx.stroke();
    } else if (key === 'mg') {
      ctx.rotate(-0.2);
      ctx.fillStyle = lgrad(-4, 0, 4, 0, [[0, '#86efac'], [1, '#15803d']]); rr(-r * 1.1 - 4, -r, 8, r * 2, 4); ctx.fill();
      ctx.strokeStyle = '#f2b705'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 1.1 + 4, 0); for (let s = 1; s <= 4; s++) ctx.lineTo(-r * 1.1 + 4 + s * r * 0.5, s % 2 ? -4 : 4); ctx.stroke();
    } else if (key === 'vit') {
      ctx.rotate(RM ? 0 : t * 0.6 + ph);
      ctx.shadowColor = 'rgba(180,80,0,.35)'; ctx.shadowBlur = 6;
      ctx.fillStyle = lgrad(-r, -r, r, r, [[0, '#fde68a'], [1, '#f97316']]);
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rad = i % 2 ? r * 0.5 : r * 1.15; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawItem(it, t, small) {
    const def = nutrDef(it.key);
    const sx = shk(it.shake, t);
    ctx.save();
    ctx.globalAlpha = it.fade;
    if (small) { drawNutr(it.key, it.x, it.y, 6.5, t, it.ph); ctx.restore(); return; }
    ctx.translate(it.x + sx, it.y - it.lift * 6);
    const sc = 1 + it.lift * 0.14; ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(30,60,50,' + (0.16 + it.lift * 0.14).toFixed(2) + ')'; ctx.shadowBlur = 10 + it.lift * 10; ctx.shadowOffsetY = 3 + it.lift * 6;
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(0, 0, 25, 0, TAU); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(0,0,0,.1)'; ctx.lineWidth = 1.5; ctx.stroke();
    drawNutr(it.key, 0, 0, 10, t, it.ph);
    pill(def.name, 0, 36, { size: 13.5, bg: '#fff', color: '#1b2333', border: 'rgba(0,0,0,.14)', borderW: 1.5, h: 24, pad: 8 });
    ctx.restore();
  }
  /* ---- 그림: 작은창자 벽 (낮은 배율) ---- */
  function drawWall(t) {
    // 근육층
    ctx.fillStyle = '#ee9fb0'; ctx.fillRect(-1600, A_BASE, 4000, 60);
    ctx.fillStyle = '#d97a93'; ctx.fillRect(-1600, A_BASE + 60, 4000, 70);
    ctx.strokeStyle = 'rgba(160,50,80,.25)'; ctx.lineWidth = 3;
    for (let x = -10; x < W; x += 34) { ctx.beginPath(); ctx.moveTo(x, A_BASE + 70); ctx.lineTo(x + 20, A_BASE + 125); ctx.stroke(); }
    ctx.fillStyle = '#c9607b'; ctx.fillRect(-1600, A_BASE + 130, 4000, 900);
    // 융털
    for (let i = 0; i < AN; i++) {
      const x = AX0 + ADX * i, top = A_BASE - A_H;
      const sway = RM ? 0 : Math.sin(t * 1.4 + i * 0.7) * 2.5;
      ctx.save(); ctx.translate(sway, 0);
      const path = new Path2D();
      path.moveTo(x - 15, A_BASE + 4); path.lineTo(x - 15, top + 16); path.arc(x, top + 16, 15, Math.PI, 0); path.lineTo(x + 15, A_BASE + 4); path.closePath();
      ctx.fillStyle = lgrad(x - 15, 0, x + 15, 0, [[0, '#f8b8c6'], [0.5, '#fcd5de'], [1, '#f3a4b6']]); ctx.fill(path);
      ctx.strokeStyle = '#e0728f'; ctx.lineWidth = 3; ctx.stroke(path);
      // 모세 혈관 · 암죽관
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#e24a4a'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(x - 6, A_BASE); ctx.lineTo(x - 6, top + 28); ctx.quadraticCurveTo(x, top + 12, x + 6, top + 28); ctx.lineTo(x + 6, A_BASE); ctx.stroke();
      ctx.strokeStyle = '#d4d92f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, A_BASE); ctx.lineTo(x, top + 34); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, A_BASE - 3, 0, 0);
    // 표면 길이 비교 달리기
    const y = 168, x0 = 40, x1 = W - 40;
    ctx.save();
    ctx.setLineDash([8, 7]); ctx.strokeStyle = 'rgba(71,85,105,.7)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    const u = V.race, flat = clamp(u / 0.4, 0, 1);
    const L = A_OUT[A_OUT.length - 1][2], pos = atLen(A_OUT, u * 1800);
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(lerp(x0, x1, flat), y, 8, 0, TAU); ctx.fill();
    if (flat >= 1) checkMark(x1 + 0, y - 24, 11, clamp((u - 0.4) * 6, 0, 1));
    const gl = ctx.createRadialGradient(pos.x, pos.y, 1, pos.x, pos.y, 12);
    gl.addColorStop(0, '#fff'); gl.addColorStop(1, '#16a34a');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(pos.x, pos.y, 8, 0, TAU); ctx.fill();
    pill('평평한 벽이라면 이만큼이에요', 160, y - 20, { size: 13.5, bg: '#475569', h: 26, pad: 11 });
    pill('융털 표면을 따라가면 훨씬 길어요', 600, 112, { size: 13.5, bg: '#16a34a', h: 26, pad: 11 });
  }
  /* ---- 그림: 융털 하나 (높은 배율) ---- */
  function villusPath() { const p = new Path2D(); smooth(p, VIL_KEYS, false); p.lineTo(VIL_KEYS[0][0], VIL_KEYS[0][1]); p.closePath(); return p; }
  const VIL_PATH = villusPath();
  function drawVillus(t) {
    // 근육층 (아래)
    ctx.fillStyle = '#ee9fb0'; ctx.fillRect(-1600, 528, 4000, 60);
    ctx.fillStyle = '#d97a93'; ctx.fillRect(-1600, 588, 4000, 70);
    ctx.fillStyle = '#c9607b'; ctx.fillRect(-1600, 658, 4000, 600);
    // 융털 몸
    ctx.save();
    ctx.shadowColor = 'rgba(150,50,80,.3)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
    ctx.fillStyle = lgrad(388, 0, 552, 0, [[0, '#fbc5d1'], [0.5, '#fde1e7'], [1, '#f8b6c6']]); ctx.fill(VIL_PATH);
    ctx.restore();
    ctx.save(); ctx.clip(VIL_PATH);
    // 모세 혈관 그물
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(226,74,74,.5)'; ctx.lineWidth = 3.5;
    [190, 250, 310, 370, 430, 490].forEach((yy, i) => {
      const w = 36 - Math.max(0, (260 - yy)) * 0.06;
      ctx.beginPath(); ctx.moveTo(432, yy); ctx.bezierCurveTo(446, yy - 14, 456, yy + 14, 470 - 10, yy + 4); ctx.moveTo(508, yy + 20); ctx.bezierCurveTo(494, yy + 6, 484, yy + 34, 470 + 10, yy + 24); ctx.stroke();
    });
    // 암죽관
    ctx.fillStyle = lgrad(VX - 13, 0, VX + 13, 0, [[0, '#e8ec7a'], [0.5, '#f8fbb0'], [1, '#d6db5c']]);
    rr(VX - 13, 150, 26, 400, 13); ctx.fill();
    ctx.strokeStyle = '#a0a51e'; ctx.lineWidth = 2.4; rr(VX - 13, 150, 26, 400, 13); ctx.stroke();
    // 모세 혈관 (고리)
    ctx.beginPath(); CAP.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.strokeStyle = '#a82424'; ctx.lineWidth = 17; ctx.stroke();
    ctx.strokeStyle = '#ef6a6a'; ctx.lineWidth = 12; ctx.stroke();
    ctx.restore();
    // 혈구 흐름
    V.cells.forEach((c) => {
      const q = atLen(CAP, c.s);
      ctx.fillStyle = 'rgba(190,24,24,.9)'; ctx.beginPath(); ctx.ellipse(q.x, q.y, 4.5, 3.4, c.s * 0.05, 0, TAU); ctx.fill();
    });
    // 상피 세포 (한 층)
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.beginPath(); smooth(ctx, VIL_KEYS, false);
    ctx.setLineDash([17, 3]); ctx.strokeStyle = '#ee86a1'; ctx.lineWidth = 20; ctx.lineCap = 'butt'; ctx.stroke();
    ctx.strokeStyle = '#d4527a'; ctx.lineWidth = 7; ctx.lineDashOffset = -8; ctx.stroke();
    ctx.restore();
    // 흡수된 영양소 (혈관 · 암죽관 속)
    V.items.forEach((it) => { if (it.state === 'flow' || it.state === 'enter') drawItem(it, t, true); });
  }
  function drawVilliLabels(t) {
    // 설명 표시
    const L = [
      ['상피 세포(한 층)', 'epi', 548, 230, 604, 150, '#be185d'],
      ['모세 혈관', 'cap', 508, 300, 604, 232, '#b91c1c'],
      ['암죽관', 'lac', 484, 360, 604, 314, '#8a8f0b'],
    ];
    L.forEach((l) => {
      ctx.strokeStyle = 'rgba(40,50,70,.5)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(l[2], l[3]); ctx.lineTo(l[4] - 6, l[5]); ctx.stroke();
      ctx.fillStyle = l[6]; ctx.beginPath(); ctx.arc(l[2], l[3], 4, 0, TAU); ctx.fill();
      pill(l[0], l[4], l[5], { size: 14, bg: '#fff', color: l[6], border: l[6], borderW: 2, h: 28, pad: 10, align: 'left', shadow: true });
    });
    // 흡수된 영양소 목록
    const bx = 604;
    const flow = (list, x0, y0, pw, bg, color) => {
      let cx = x0, cy = y0;
      list.forEach((k) => {
        const nm = nutrDef(k).name; ctx.font = font(13, 800);
        const w = ctx.measureText(nm).width + 16;
        if (cx + w > x0 + pw && cx > x0) { cx = x0; cy += 26; }
        pill(nm, cx, cy, { size: 13, bg, color, align: 'left', h: 23, pad: 8 });
        cx += w + 6;
      });
    };
    panel(bx, 336, 188, 112, { r: 14, bg: '#fff', border: '#fca5a5', bw: 2 });
    txt('모세 혈관 → 혈액', bx + 12, 356, { size: 14, weight: 800, color: '#b91c1c', base: 'middle' });
    flow(V.lists.cap, bx + 12, 384, 166, '#fee2e2', '#7f1d1d');
    panel(bx, 458, 188, 112, { r: 14, bg: '#fff', border: '#d9de5a', bw: 2 });
    txt('암죽관 → 림프', bx + 12, 478, { size: 14, weight: 800, color: '#7c800a', base: 'middle' });
    flow(V.lists.lac, bx + 12, 506, 166, '#fafcc8', '#5a5d06');
    // 흡수 대상 영역
    if (V.drag && V.drag.moved) {
      const zs = [['cap', 'rgba(239,68,68,', 432], ['lac', 'rgba(214,219,92,', VX]];
      pill('모세 혈관', 420, 62, { size: 14, bg: V.hoverZone === 'cap' ? '#dc2626' : '#f87171', h: 28, pad: 11, shadow: true });
      pill('암죽관', 520, 62, { size: 14, bg: V.hoverZone === 'lac' ? '#a3a80e' : '#c9ce3e', color: '#2f3202', h: 28, pad: 11, shadow: true });
      if (V.hoverZone) {
        ctx.save(); ctx.strokeStyle = V.hoverZone === 'cap' ? '#dc2626' : '#a3a80e'; ctx.lineWidth = 4;
        if (V.hoverZone === 'lac') rr(VX - 22, 140, 44, 400, 20); else rr(396, 90, 148, 440, 40);
        ctx.setLineDash([8, 6]); ctx.stroke(); ctx.restore();
      }
    }
  }
  function drawVilli(t) {
    const z = V.z;
    const tx = lerp(400, VX, z), ty = lerp(A_BASE, V_BASE, z);
    const aA = 1 - smoothstep(0.3, 0.75, z), aB = smoothstep(0.35, 0.85, z);
    ctx.fillStyle = '#fff0dc'; ctx.fillRect(0, -40, W, H + 80);
    if (aA > 0.01) {
      ctx.save(); ctx.globalAlpha = aA;
      ctx.translate(tx, ty); const s = lerp(1, 4.1, z); ctx.scale(s, s); ctx.translate(-400, -A_BASE);
      drawWall(t);
      ctx.restore();
    }
    if (aB > 0.01) {
      ctx.save(); ctx.globalAlpha = aB;
      ctx.translate(tx, ty); const s = lerp(0.24, 1, z); ctx.scale(s, s); ctx.translate(-VX, -V_BASE);
      drawVillus(t);
      if (z > 0.9) {
        V.items.forEach((it) => { if (it.state === 'free' && !(V.drag && V.drag.it === it)) drawItem(it, t, false); });
      }
      ctx.restore();
    }
    // 제목
    const title = z < 0.5 ? '작은창자(소장) 안쪽 벽' : '융털 하나를 확대한 그림';
    pill('🔬 ' + title, 20, 28, { size: 15, bg: '#be185d', align: 'left', h: 32, pad: 13 });
    if (z < 0.5) {
      // 가운데 융털 안내
      const ax = 400, ay = A_BASE - A_H / 2;
      ring(ax, ay, 44, '#16a34a', t);
      pill('누르면 확대돼요', ax, A_BASE - A_H - 36, { size: 14, bg: '#16a34a', h: 28, pad: 11, shadow: true });
    }
    if (z > 0.9) { ctx.save(); ctx.globalAlpha = smoothstep(0.9, 1, z); drawVilliLabels(t); ctx.restore(); }
    // 끌고 있는 영양소는 맨 위에
    if (V.drag && V.drag.moved && z > 0.9) drawItem(V.drag.it, t, false);
  }
  const villiHandlers = {
    down(p) {
      if (V.z < 0.6) {
        if (Math.abs(p.x - 400) < 60 && p.y > 150 && p.y < 360) { V.target = 1; Sound.click(); }
        return false;
      }
      if (V.z < 0.95) return false;
      for (let i = V.items.length - 1; i >= 0; i--) {
        const it = V.items[i];
        if (it.state === 'free' && Math.hypot(p.x - it.x, p.y - it.y) < 32) {
          V.drag = { it, sx: p.x, sy: p.y, moved: false, ox: p.x - it.x, oy: p.y - it.y };
          V.items.splice(i, 1); V.items.push(it);
          return true;
        }
      }
      return false;
    },
    move(p) {
      const d = V.drag; if (!d) return;
      if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 6) { d.moved = true; Sound.click(); }
      d.it.x = clamp(p.x - d.ox, 20, W - 20); d.it.y = clamp(p.y - d.oy, 20, H - 20);
    },
    up(p) {
      const d = V.drag; V.drag = null; if (!d) return;
      const it = d.it, zone = zoneAt(it), def = nutrDef(it.key);
      if (!d.moved) return;
      if (!zone) { SciSim.tween(it, { y: it.y }, { duration: 0.1 }); return; }
      if (zone === def.dest) {
        // 흡수: 상피 세포를 지나 관 속으로
        const poly = zone === 'cap' ? CAP : LAC;
        let bi = 0, bd = 1e9;
        for (let i = 0; i < poly.length; i++) { const dd = Math.hypot(poly[i][0] - it.x, poly[i][1] - it.y); if (dd < bd) { bd = dd; bi = i; } }
        const q = poly[bi];
        it.state = 'enter';
        SciSim.tween(it, { x: q[0], y: q[1] }, { duration: 0.55, ease: 'outCubic', onDone() { it.state = 'flow'; it.zone = zone; it.s = q[2]; } });
        V.got[it.key] = true; V.lists[zone].push(it.key);
        burst(q[0], q[1], zone === 'cap' ? ['#f87171', '#fecaca', '#fff'] : ['#e5e86a', '#fafcc8', '#fff'], 14);
        Sound.tone(660, 0.12, 'triangle', 0.08);
      } else {
        it.shake = 1; Sound.fail();
        toast('<b>' + def.name + '</b>은(는) 그쪽이 아니에요. ' + def.hint, 'warn', 3600);
        SciSim.tween(it, { x: 120 + Math.random() * 200, y: 130 + Math.random() * 300 }, { duration: 0.6, ease: 'outBack' });
      }
    },
    hover(p) {
      if (V.z < 0.6) return Math.abs(p.x - 400) < 60 && p.y > 150 && p.y < 360 ? 'pointer' : null;
      return V.items.some((it) => it.state === 'free' && Math.hypot(p.x - it.x, p.y - it.y) < 32) ? 'grab' : null;
    },
  };

  /* =========================================================
     장면 전환 · 입력 · 단계(미션)
     ========================================================= */
  let F = new Set();
  let game = null;
  const SCENE_LABEL = { tests: '🧪 영양소 검출하기', saliva: '🥛 침의 소화 작용 탐구', tract: '🍙 음식물이 지나가는 길', villi: '🔬 영양소의 흡수' };
  const S = { scene: 'tests' };
  function setScene(name) {
    S.scene = name;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === name));
    $$('#ctrlCard .cgrp').forEach((g) => { g.hidden = g.dataset.scene !== name; });
    $('#sceneLabel').textContent = SCENE_LABEL[name];
    if (name === 'saliva') syncSalUI();
    hideHint();
  }
  const SCENE_H = { tests: testsHandlers, saliva: salHandlers, tract: trHandlers, villi: villiHandlers };
  const sh = (p) => ({ x: p.x, y: p.y - YOFF });
  const handlers = {
    down: (p) => SCENE_H[S.scene].down(sh(p)),
    move: (p) => SCENE_H[S.scene].move && SCENE_H[S.scene].move(sh(p)),
    up: (p) => SCENE_H[S.scene].up && SCENE_H[S.scene].up(sh(p)),
    hover: (p) => (SCENE_H[S.scene].hover ? SCENE_H[S.scene].hover(sh(p)) : null),
  };
  function buildStage() {
    const cv = $('#cv');
    view = SciSim.stage(cv, { width: W, height: H, background: BG });
    ctx = view.ctx; D = SciSim.draw(ctx);
    SciSim.pointer(view, handlers);
  }
  buildStage();
  initTests(); initSaliva(); initTract(); initVilli();

  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); if (b.dataset.scene === 'tract' && !(game && game.current && gameMissionIs('cards'))) TR.cardsOn = false; }));
  $('#btnResetTests').addEventListener('click', () => { Sound.click(); resetTests(false); });
  $('#btnAct').addEventListener('click', () => { if (SAL.phase === 'prep') startBath(); else if (SAL.phase === 'bath') startSplit(); });
  $('#btnResetSaliva').addEventListener('click', () => { Sound.click(); initSaliva(); });
  $('#btnEat').addEventListener('click', startEat);
  const rTime = SciSim.bindRange($('#sTime'), null, null, (v) => { if (SAL.phase === 'bath') { SAL.time = v; syncSalUI(); } });
  ['pointerdown'].forEach((e) => $('#sTime').addEventListener(e, () => { SAL.hold = true; }));
  ['pointerup', 'pointercancel', 'change', 'blur'].forEach((e) => $('#sTime').addEventListener(e, () => { SAL.hold = false; }));
  SciSim.bindRange($('#sPos'), null, null, (v) => { TR.auto = null; TR.pt = v; });
  $('#sPos').addEventListener('pointerdown', () => { TR.sliderDown = true; });
  ['pointerup', 'pointercancel', 'change'].forEach((e) => $('#sPos').addEventListener(e, () => { TR.sliderDown = false; }));
  SciSim.bindRange($('#sZoom'), null, null, (v) => { V.target = v; });
  $('#sZoom').addEventListener('pointerdown', () => { V.sliderDown = true; });
  ['pointerup', 'pointercancel', 'change'].forEach((e) => $('#sZoom').addEventListener(e, () => { V.sliderDown = false; }));

  /* ---------- 퀴즈 그림 ---------- */
  const SW = (x, y, c, lab) => '<circle cx="' + x + '" cy="' + y + '" r="11" fill="' + c + '" stroke="rgba(0,0,0,.25)"/><text x="' + (x + 18) + '" y="' + (y + 5) + '" font-size="14" font-weight="800" fill="#1b2333">' + lab + '</text>';
  const FIG_SALIVA = '<svg viewBox="0 0 340 150" width="100%" role="img" aria-label="검사 결과 표"><rect width="340" height="150" fill="#fff"/>' +
    '<text x="140" y="24" font-size="14" font-weight="800" fill="#475569" text-anchor="middle">아이오딘</text><text x="262" y="24" font-size="14" font-weight="800" fill="#475569" text-anchor="middle">베네딕트</text>' +
    '<text x="12" y="63" font-size="15" font-weight="800" fill="#0369a1">A(물)</text><text x="12" y="113" font-size="15" font-weight="800" fill="#b45309">B(침)</text>' +
    SW(82, 58, '#1e2670', '청람색') + SW(204, 58, '#3f86dd', '파란색') + SW(82, 108, '#7d86b5', '연한 청람색') + SW(204, 108, '#d9531a', '황적색') + '</svg>';
  const FIG_WALL = '<svg viewBox="0 0 320 130" width="100%" role="img" aria-label="평평한 벽과 융털이 있는 벽 비교"><rect width="320" height="130" fill="#fff0dc"/>' +
    '<rect x="0" y="92" width="320" height="38" fill="#ee9fb0"/><text x="160" y="22" font-size="13" font-weight="800" fill="#475569" text-anchor="middle">왼쪽: 평평한 벽 / 오른쪽: 융털이 있는 벽</text>' +
    '<line x1="14" y1="92" x2="146" y2="92" stroke="#e0728f" stroke-width="4"/><line x1="174" y1="92" x2="174" y2="92" stroke="#e0728f"/>' +
    '<path d="M174 92 V56 a8 8 0 0 1 16 0 V92 M198 92 V56 a8 8 0 0 1 16 0 V92 M222 92 V56 a8 8 0 0 1 16 0 V92 M246 92 V56 a8 8 0 0 1 16 0 V92 M270 92 V56 a8 8 0 0 1 16 0 V92" fill="#fcd5de" stroke="#e0728f" stroke-width="3"/>' +
    '<line x1="160" y1="30" x2="160" y2="125" stroke="#94a3b8" stroke-dasharray="4 4"/></svg>';

  const gameMissionIs = (id) => { const m = game && game.current(); return !!(m && m.id === id); };
  const ids = (m, id) => { m.id = id; return m; };

  /* ---------- 단계 ---------- */
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '음식 속 영양소 찾기', short: '영양소', icon: '🧪', phase: '관찰',
      features: ['tests'],
      intro: '<p class="si-q">❓ 탐구 질문: 밥은 어떻게 우리 몸의 에너지가 될까?</p>' +
        '<p>밥, 달걀, 기름 같은 음식에는 <b>녹말, 당, 단백질, 지방</b>이 들어 있어요. 영양소마다 <b>검출 용액</b>이 달라서, 용액을 떨어뜨리고 <b>색깔이 변하는 것</b>을 보면 어떤 영양소가 있는지 알 수 있어요.</p>' +
        '<p>먼저 이 영양소들을 직접 찾아봐요. 소화는 이 영양소들을 작게 쪼개는 일이에요.</p>',
      setup() { setScene('tests'); },
      recap: '검출 용액의 <b>색깔 변화</b>로 음식 속 영양소를 알 수 있어요.',
      summary: '<ul><li><b>녹말</b>: 아이오딘 반응 → <b>청람색</b></li><li><b>당</b>(포도당·엿당): 베네딕트 반응(가열) → <b>황적색</b></li>' +
        '<li><b>단백질</b>: 뷰렛 반응 → <b>보라색</b></li><li><b>지방</b>: 수단 Ⅲ 반응 → <b>선홍색</b></li>' +
        '<li>소화는 큰 영양소를 작게 분해해 몸이 흡수할 수 있게 하는 과정이에요.</li></ul>',
      missions: [
        ids({
          title: '영양소 검출하기',
          goal: '시료 4가지에 검출 용액을 떨어뜨려 보세요. 색깔이 변하는 반응으로 영양소를 <b>3가지 이상</b> 찾아요.',
          hint: '병을 눌러 고른 뒤 시험관을 눌러요(끌어다 놓아도 돼요). 밥물엔 아이오딘, 포도당 용액엔 베네딕트, 달걀 흰자엔 뷰렛, 식용유엔 수단 Ⅲ가 반응해요.',
          setup() { setScene('tests'); resetTests(true); showHint('🧪 검출 용액 병을 눌러 고른 뒤, 시험관을 눌러요', 7000); },
          check: () => Object.keys(T.found).length >= 3,
          hold: 0.8,
          status: () => ['starch', 'sugar', 'protein', 'fat'].map((k) => mark(!!T.found[k]) + ' ' + NUT_NAME[k]).join(' · ') + '<br>찾은 영양소: <b>' + Object.keys(T.found).length + ' / 3</b>',
          explain: '<b>아이오딘 용액</b>은 녹말과 만나면 <b>청람색</b>, <b>베네딕트 용액</b>은 당과 만나 가열하면 <b>황적색</b>, <b>뷰렛 용액</b>은 단백질과 만나면 <b>보라색</b>, <b>수단 Ⅲ 용액</b>은 지방과 만나면 <b>선홍색</b>이 돼요.',
        }, 'detect'),
        {
          type: 'quiz', title: '청람색의 정체',
          goal: '밥물에 아이오딘 용액을 떨어뜨렸더니 <b>청람색</b>으로 변했어요. 밥물에 들어 있는 영양소는 무엇일까요?',
          setup() { setScene('tests'); },
          choices: ['포도당', '녹말', '단백질', '지방'],
          answer: 1,
          feedback: ['당은 베네딕트 용액으로 검출해요. 가열하면 황적색이 돼요.', '', '단백질은 뷰렛 용액을 넣으면 보라색이 돼요.', '지방은 수단 Ⅲ 용액을 넣으면 선홍색이 돼요.'],
          explain: '아이오딘 용액이 <b>청람색</b>으로 변하면 <b>녹말</b>이 있다는 뜻이에요. 밥의 주성분이 녹말이에요.',
        },
      ],
    },
    /* ---------- 2단계 · 실험 ---------- */
    {
      title: '침이 녹말을 분해할까?', short: '침의 소화', icon: '🥛', phase: '실험',
      features: ['saliva'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 아이오딘 용액으로 <b>녹말</b>을, 베네딕트 용액으로 <b>당</b>을 찾는 방법을 알았어요.</div>' +
        '<p>밥을 오래 씹으면 달콤해지는 까닭은 무엇일까요? <b>침</b>이 녹말에 어떤 일을 하는지 실험으로 알아봐요. 녹말 용액에 <b>증류수(A)</b>와 <b>침(B)</b>을 넣고 <b>37 ℃ 물중탕</b>에 둔 뒤, 두 가지 검출 용액으로 비교해요.</p>',
      setup() { setScene('saliva'); },
      recap: '침 속 <b>아밀레이스</b>가 <b>녹말</b>을 <b>엿당</b>으로 분해해요.',
      summary: '<ul><li>실험: 녹말 용액 + 증류수(A) / 녹말 용액 + 침(B)을 <b>37 ℃ 물중탕</b>에 둠.</li>' +
        '<li>아이오딘 반응: A는 <b>청람색 그대로</b>, B는 청람색이 <b>약해짐</b> → B에서 녹말이 줄었다.</li>' +
        '<li>베네딕트 반응: A는 변화 없음, B는 <b>황적색</b> → B에서 당(엿당)이 생겼다.</li>' +
        '<li>침 속 <b>아밀레이스</b>(소화 효소)가 녹말을 엿당으로 분해한다. 비교하려고 만든 A를 <b>대조군</b>이라고 해요.</li></ul>',
      missions: [
        ids({
          title: '침의 소화 작용 실험',
          goal: 'A에는 증류수, B에는 침을 넣고 물중탕에서 10분을 기다린 뒤, 두 시험관에 <b>아이오딘</b>과 <b>베네딕트</b>를 떨어뜨리세요.',
          hint: '① 병을 눌러 증류수는 A, 침은 B에 넣어요. ② 물중탕에 넣기 ③ 10분이 지나면 검사하기 ④ 아이오딘, 베네딕트 병을 차례로 눌러요.',
          setup() { setScene('saliva'); initSaliva(); showHint('💧 증류수는 A, 침은 B 시험관에 넣어요', 7000); },
          check: () => SAL.done.iodine && SAL.done.benedict,
          hold: 0.8,
          status: () => mark(SAL.poured.A && SAL.poured.B) + ' 시료 넣기 · ' + mark(SAL.phase === 'test') + ' 물중탕 10분<br>' + mark(SAL.done.iodine) + ' 아이오딘 검사 · ' + mark(SAL.done.benedict) + ' 베네딕트 검사',
          explain: 'B(침)에서는 아이오딘의 <b>청람색이 약해지고</b>, 베네딕트에서 <b>황적색</b>이 나타났어요. 침이 <b>녹말</b>을 줄이고 <b>당</b>을 만든 거예요.',
        }, 'saliva'),
        {
          type: 'quiz', title: '결과 해석하기', figure: FIG_SALIVA,
          goal: '표를 보면 B 시험관에서만 <b>청람색이 약해지고 황적색이 나타났어요</b>. 그 까닭은?',
          setup() { setScene('saliva'); },
          choices: ['침 속 아밀레이스가 녹말을 엿당으로 분해했다', '증류수가 녹말을 당으로 바꿨다', '침이 베네딕트 용액과 직접 반응했다', '녹말이 저절로 사라졌다'],
          answer: 0,
          feedback: ['', 'A 시험관에는 증류수를 넣었는데 변화가 없었어요. 증류수는 녹말을 분해하지 못해요.', '침만으로는 색이 변하지 않아요. 녹말이 줄어드는 것과 당이 생기는 것을 함께 설명해야 해요.', 'A 시험관에서는 녹말이 그대로였어요. B에서만 줄어든 까닭은 침 때문이에요.'],
          explain: '침에는 소화 효소인 <b>아밀레이스</b>가 있어서 <b>녹말을 엿당으로 분해</b>해요. 그래서 B에서 녹말(청람색)은 줄고 당(황적색)이 생겼어요.',
        },
        {
          type: 'quiz', title: '비교하려고 만든 시험관',
          goal: '침을 넣지 않고 <b>증류수</b>를 넣은 A 시험관을 함께 실험한 까닭은?',
          setup() { setScene('saliva'); },
          choices: ['A에서도 녹말이 분해되게 하려고', '침을 넣은 것과 비교해 침의 효과를 확인하려고', '녹말을 더 많이 만들려고', '시험관을 시원하게 하려고'],
          answer: 1,
          feedback: ['A에서는 녹말이 그대로 있어야 해요. 그래야 B의 변화가 침 때문이라고 말할 수 있어요.', '', '실험으로 녹말이 만들어지지는 않아요.', '온도는 두 시험관 모두 37 ℃로 똑같이 맞췄어요.'],
          explain: '침만 다르고 나머지 조건(녹말 양, 온도, 시간)은 같게 한 <b>대조 실험</b>이에요. 그래서 B의 변화가 <b>침(아밀레이스)</b> 때문이라고 결론 내릴 수 있어요.',
        },
      ],
    },
    /* ---------- 3단계 · 설명 ---------- */
    {
      title: '소화 기관과 소화 효소', short: '소화 효소', icon: '🍙', phase: '설명',
      features: ['tract'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 침 속 <b>아밀레이스</b>가 녹말을 엿당으로 분해한다는 것을 알았어요.</div>' +
        '<p>소화 효소는 입에만 있을까요? 음식물이 <b>입 → 식도 → 위 → 소장 → 대장</b>으로 지나가는 동안, 어느 곳에서 어떤 효소가 어떤 영양소를 분해하는지 따라가 봐요.</p>',
      setup() { setScene('tract'); TR.cardsOn = false; },
      recap: '<b>아밀레이스</b>(입·소장), <b>펩신</b>(위), <b>트립신</b>·<b>라이페이스</b>(소장)가 영양소를 작게 분해해요.',
      summary: '<ul><li>소화 기관: 입 → 식도 → 위 → 소장 → 대장 (간·쓸개·이자는 소화액을 만들거나 보내 줌)</li>' +
        '<li><b>아밀레이스</b>(침, 이자액): 녹말 → 엿당 (엿당은 소장에서 포도당으로)</li>' +
        '<li><b>펩신</b>(위액): 단백질 분해 / <b>트립신</b>(이자액): 단백질 → 아미노산</li>' +
        '<li><b>라이페이스</b>(이자액): 지방 → 지방산 + 모노글리세리드</li>' +
        '<li><b>쓸개즙</b>은 소화 효소가 아니지만 지방 소화를 도와요.</li></ul>',
      missions: [
        ids({
          title: '음식물을 따라가며 관찰하기',
          goal: '음식물을 입에서 대장까지 따라가며 <b>입, 위, 소장</b>에서 일어나는 분해를 끝까지 지켜보세요.',
          hint: '“음식 먹기” 단추를 누르거나 슬라이더를 밀어요. 한 곳에서 분자가 모두 쪼개질 때까지 잠시 기다려 보세요.',
          setup() { setScene('tract'); TR.cardsOn = false; TR.seen = {}; TR.auto = null; TR.p = 0; TR.pt = 0; enterSite('mouth', true); showHint('🍽️ “음식 먹기”를 누르거나 슬라이더를 밀어요', 7000); },
          check: () => TR.seen.mouth && TR.seen.stomach && TR.seen.small,
          hold: 0.5,
          status: () => mark(!!TR.seen.mouth) + ' 입 · ' + mark(!!TR.seen.stomach) + ' 위 · ' + mark(!!TR.seen.small) + ' 소장',
          explain: '<b>입</b>에서는 아밀레이스가 녹말을, <b>위</b>에서는 펩신이 단백질을, <b>소장</b>에서는 이자액의 효소와 소장의 효소가 녹말·단백질·지방을 최종 소화해요.',
        }, 'follow'),
        ids({
          title: '효소 카드 놓기', manual: true,
          goal: '효소 카드 4장을 그 효소가 <b>일하는 곳</b>(입·위·소장)에 끌어다 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '아밀레이스는 침과 이자액에 있어요. 펩신은 위액, 트립신과 라이페이스는 이자액에 들어 있어요. 이자액은 소장으로 나와요.',
          setup() {
            setScene('tract'); TR.cardsOn = true; TR.flag = {}; TR.auto = null;
            TR.cards.forEach((c) => { c.site = null; cardSnap(c, false); });
            showHint('🃏 카드를 끌어 알맞은 곳에 놓아요', 6500);
          },
          status: () => '놓은 카드: <b>' + TR.cards.filter((c) => c.site).length + ' / 4</b>',
          check() {
            const un = TR.cards.filter((c) => !c.site);
            if (un.length) return '아직 놓지 않은 카드가 있어요. (' + un.length + '장 남음)';
            const bad = TR.cards.filter((c) => c.ok.indexOf(c.site) < 0);
            bad.forEach((c) => { if (!TR.flag[c.name]) { TR.flag[c.name] = true; c.shake = 1; } });
            if (bad.length) return '<b>' + bad.map((c) => c.name).join(', ') + '</b> 카드의 자리가 맞지 않아요. 그 효소가 들어 있는 소화액이 어디서 나오는지 떠올려 봐요.';
            return true;
          },
          explain: '<b>아밀레이스</b>는 입(침)과 소장(이자액)에서 녹말을, <b>펩신</b>은 위에서 단백질을, <b>트립신</b>은 소장에서 단백질을 아미노산까지, <b>라이페이스</b>는 소장에서 지방을 지방산과 모노글리세리드로 분해해요.',
        }, 'cards'),
        {
          type: 'quiz', title: '소화 효소가 아닌 것',
          goal: '다음 중 <b>소화 효소가 아닌</b> 것은?',
          setup() { setScene('tract'); TR.cardsOn = false; },
          choices: ['아밀레이스', '펩신', '쓸개즙', '라이페이스'],
          answer: 2,
          feedback: ['아밀레이스는 녹말을 분해하는 소화 효소예요.', '펩신은 위액에 들어 있는, 단백질을 분해하는 소화 효소예요.', '', '라이페이스는 지방을 분해하는 소화 효소예요.'],
          explain: '<b>쓸개즙</b>은 간에서 만들어 쓸개에 저장했다가 소장으로 보내요. 효소는 없지만 지방을 작은 알갱이로 만들어 <b>라이페이스가 일하기 쉽게</b> 도와요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '소장에서 영양소 흡수하기', short: '흡수', icon: '🔬', phase: '적용',
      features: ['villi'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소장에서 녹말은 <b>포도당</b>, 단백질은 <b>아미노산</b>, 지방은 <b>지방산과 모노글리세리드</b>까지 분해되는 것을 보았어요.</div>' +
        '<p>이렇게 작아진 영양소는 어떻게 몸속으로 들어갈까요? 소장 안쪽 벽의 <b>융털</b>을 확대해서, 영양소가 어디로 흡수되는지 알아봐요.</p>',
      setup() { setScene('villi'); },
      recap: '융털은 표면적이 넓어 영양소를 잘 흡수해요. 포도당·아미노산은 <b>모세 혈관</b>으로, 지방산·모노글리세리드는 <b>암죽관</b>으로 들어가요.',
      summary: '<ul><li>소장 안쪽 벽에는 <b>융털</b>이 많아 표면적이 넓어요. 그래서 영양소를 효율적으로 <b>흡수</b>해요.</li>' +
        '<li><b>수용성</b> 영양소(포도당, 아미노산, 무기염류 등) → <b>모세 혈관</b></li>' +
        '<li><b>지용성</b> 영양소(지방산, 모노글리세리드, 지용성 비타민) → <b>암죽관</b></li>' +
        '<li>흡수된 영양소는 순환계를 통해 온몸의 세포로 운반돼요.</li></ul>',
      missions: [
        ids({
          title: '융털 확대하기',
          goal: '소장 안쪽 벽을 <b>융털 하나</b>가 크게 보일 때까지 확대하세요.',
          hint: '“확대 정도” 슬라이더를 오른쪽 끝까지 밀거나, 가운데 융털을 눌러요.',
          setup() { setScene('villi'); V.target = 0; V.reached = false; showHint('🔍 슬라이더를 밀거나 가운데 융털을 눌러요', 6500); },
          check: () => V.reached,
          hold: 0.6,
          status: () => mark(V.reached) + ' 융털 하나 확대',
          explain: '소장 안쪽 벽에는 손가락 모양의 <b>융털</b>이 빽빽해요. 융털 속에는 <b>모세 혈관</b>과 <b>암죽관</b>이 있어요. 융털 덕분에 흡수하는 면이 훨씬 넓어져요.',
        }, 'zoom'),
        ids({
          title: '영양소를 알맞은 관으로',
          goal: '떠다니는 영양소 6가지를 끌어서 <b>모세 혈관</b> 또는 <b>암죽관</b>에 알맞게 흡수시키세요.',
          hint: '물에 잘 녹는 영양소(포도당, 아미노산, 무기염류)는 모세 혈관, 기름에 잘 녹는 영양소(지방산, 모노글리세리드, 지용성 비타민)는 암죽관이에요.',
          setup() { setScene('villi'); V.target = 1; V.reached = true; initVilli(); showHint('🖐️ 영양소를 끌어 융털 속 관에 놓아요', 7000); },
          check: () => NUTR.every((n) => V.got[n.key]),
          hold: 0.8,
          status: () => NUTR.map((n) => mark(!!V.got[n.key]) + ' ' + n.name).join(' · ') + '<br>흡수한 영양소: <b>' + Object.keys(V.got).length + ' / 6</b>',
          explain: '<b>포도당 · 아미노산 · 무기염류</b>는 물에 잘 녹아서 <b>모세 혈관</b>으로, <b>지방산 · 모노글리세리드 · 지용성 비타민</b>은 <b>암죽관</b>으로 흡수돼요. 암죽관은 나중에 혈관과 만나요.',
        }, 'absorb'),
        {
          type: 'quiz', title: '융털이 많은 까닭', figure: FIG_WALL,
          goal: '소장 안쪽 벽에 <b>융털</b>이 많은 까닭은 무엇일까요?',
          setup() { setScene('villi'); V.target = 0; },
          choices: ['소화 효소를 더 많이 만들기 위해', '표면적이 넓어져 영양소를 효율적으로 흡수하기 위해', '음식물이 빨리 지나가게 하기 위해', '음식물을 더 잘게 부수기 위해'],
          answer: 1,
          feedback: ['소화 효소는 이자나 소장 벽의 다른 세포에서 만들어져요. 융털은 흡수를 도와요.', '', '오히려 융털 때문에 음식물이 지나는 길이 좁아져요. 융털의 역할은 흡수예요.', '음식물을 부수는 일은 이와 위벽의 움직임이 해요. 융털은 흡수 담당이에요.'],
          explain: '융털이 있으면 같은 길이의 소장이라도 <b>표면적이 훨씬 넓어져서</b> 영양소를 <b>많이, 빠르게 흡수</b>할 수 있어요.',
        },
      ],
    },
  ];

  /* ---------- 시작 ---------- */
  game = SciSim.game({
    simId: 'm2-digestion',
    mount: '#game',
    badge: '소화 탐험가',
    homeHref: '../../index.html#g2',
    featureLabels: {
      tests: '🧪 영양소 검출 실험대',
      saliva: '🥛 침의 소화 실험',
      tract: '🍙 소화 기관 지도 · 효소 카드',
      villi: '🔬 소장 융털 확대',
    },
    onFeatures(set) { F = new Set(set); },
    onMissionStart() { hideHint(); },
    onComplete() { TR.cardsOn = false; },
    levels,
  });

  // 테스트·점검용
  window.__sim = {
    S, T, SAL, TR, V, NUTR, game, setScene, RG, FOODS, INSET,
    toClient(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x / W) * r.width, y: r.top + ((y + YOFF) / H) * r.height }; },
    bottle(rg) { return this.toClient(T.dp[rg].bx, 114); },
    tubeP(i) { const tb = T.tubes[i]; return this.toClient(tb.x, tb.top + tb.h * 0.6); },
    salBottle(k) { return this.toClient(SAL.dp[k].bx, 114); },
    salTube(k) { const tb = k === 'A' || k === 'B' ? SAL[k] : SAL.split[k]; return this.toClient(tb.x, tb.top + tb.h * 0.6); },
    bolus() { const q = pathAt(sFromP(TR.p)); return this.toClient(q.x + BX, q.y); },
    cardP(i) { const c = TR.cards[TR.cards.findIndex((q) => q.idx === i)]; return this.toClient(c.x + c.w / 2, c.y + c.h / 2); },
    hotP(k) { const h = HOT[k]; return this.toClient(h.x + BX, h.y); },
    itemP(key) { const it = V.items.find((q) => q.key === key); return this.toClient(it.x, it.y); },
    zoneP(z) { return this.toClient(z === 'lac' ? VX : 432, 330); },
    cardsOn: () => TR.cardsOn,
  };

  SciSim.loop((dt, t) => {
    updateTests(dt, t); updateSaliva(dt, t); updateTract(dt, t); updateVilli(dt, t);
    PFX.update(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(0, YOFF);
    if (S.scene === 'tests') drawTests(t);
    else if (S.scene === 'saliva') drawSaliva(t);
    else if (S.scene === 'tract') drawTract(t);
    else drawVilli(t);
    PFX.draw(ctx);
    ctx.restore();
    drawHint();
  });
})();
