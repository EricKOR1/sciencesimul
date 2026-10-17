(function () {
  'use strict';
  /* =========================================================
     공용 도구 (식물과 에너지 3개 차시가 같은 모양을 쓰도록 같은 코드를 씁니다)
     화면: 태블릿 = 가로형 800×560 / 휴대폰 = 세로형 440×720
     장면 공간(SS) 520×480 + 오른쪽(또는 아래) 그래프 패널
     ========================================================= */
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const TAU = Math.PI * 2;
  const RM = !!SciSim.reduceMotion;
  const rgba = SciSim.color.rgba, mix = SciSim.color.mix, shade = SciSim.color.shade;
  const ease = SciSim.ease;
  const rand = (a, b) => a + Math.random() * (b - a);
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const mark = (b) => (b ? '✅' : '⬜');
  const CLK = { t: 0 };
  const COL = {
    ink: '#1b2333', muted: '#5d6879', good: '#14a058', bad: '#e2464b', line: '#dde4ef',
    leaf: '#3fae4b', leafD: '#1f7a35', leafL: '#8fe08a', sun: '#ffb400', water: '#3b9bea', co2: '#5b6575', o2: '#ef4444',
    sugar: '#f59e0b', starch: '#a78bfa', bio: '#16a34a', bioD: '#0f6b32',
  };

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 440 : 800, VH = PHONE ? 689 : 512;
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eaf5e6' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();

  /* 장면 공간(SS) 520×480 을 캔버스에 놓는 위치, 그리고 그래프 패널 */
  const SW = 520, SH = 480;
  const LAY = PHONE
    ? { x: 3, y: 6, s: 0.84, pn: { x: 8, y: 417, w: 424, h: 264 } }
    : { x: 10, y: 16, s: 1, pn: { x: 552, y: 16, w: 238, h: 480 } };
  const SSR = { x: LAY.x, y: LAY.y, w: SW * LAY.s, h: SH * LAY.s };           // 캔버스 좌표로 본 장면 영역
  function inScene(fn) { ctx.save(); ctx.translate(LAY.x, LAY.y); ctx.scale(LAY.s, LAY.s); fn(); ctx.restore(); }
  const toSS = (p) => ({ x: (p.x - LAY.x) / LAY.s, y: (p.y - LAY.y) / LAY.s });
  const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
  const inR = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  const text = (x, y, s, o) => D.text(x, y, s, o);

  function rrPath(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function lgrad(x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((s) => g.addColorStop(s[0], s[1]));
    return g;
  }

  /* ---------- 부드러운 그림자 (한 번 그려 두고 재사용) ---------- */
  const SHC = new Map();
  let shK = 0;
  function softShadow(x, y, w, h, r, blur, dy, color) {
    const k = Math.max(1, Math.round(view.scale * view.dpr * 2) / 2);
    if (k !== shK) { SHC.clear(); shK = k; }
    const W = Math.round(w), H = Math.round(h), key = W + '|' + H + '|' + r + '|' + blur + '|' + color;
    let sp = SHC.get(key);
    if (!sp) {
      const pad = Math.ceil(blur * 1.5) + 2, OFF = W + pad;
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
  function panel(x, y, w, h, r, fill, blur, dy, color) {
    softShadow(x, y, w, h, r, blur == null ? 12 : blur, dy == null ? 4 : dy, color || 'rgba(20,60,40,.16)');
    ctx.fillStyle = fill || '#fff'; D.roundRect(x, y, w, h, r); ctx.fill();
  }
  function contactShadow(cx, cy, rx, ry, a) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(30,40,70,' + (0.3 * (a == null ? 1 : a)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(30,40,70,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  }

  /* ---------- 글자: 줄바꿈 · 폭에 맞추기 ---------- */
  const WRAPC = new Map();
  function wrapLines(s, maxW, size, weight) {
    const key = s + '|' + maxW + '|' + size + '|' + weight;
    let r = WRAPC.get(key);
    if (r) return r;
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const words = String(s).split(' '), lines = [];
    let cur = '';
    words.forEach((w) => {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    ctx.restore();
    WRAPC.set(key, lines);
    return lines;
  }
  function wrapText(x, y, s, maxW, o) {
    o = o || {};
    const size = o.size || 14, lh = o.lh || size * 1.25;
    const lines = wrapLines(s, maxW, size, o.weight || 700);
    const y0 = y - ((lines.length - 1) * lh) / 2;
    lines.forEach((ln, i) => D.text(x, y0 + i * lh, ln, Object.assign({}, o, { baseline: 'middle' })));
    return lines.length;
  }
  const FITC = new Map();
  function fitText(x, y, s, maxW, o) {
    o = Object.assign({}, o);
    const key = s + '|' + (o.size || 14) + '|' + (o.weight || 700) + '|' + maxW;
    let size = FITC.get(key);
    if (size == null) {
      size = o.size || 14;
      ctx.save();
      for (ctx.font = D.font(size, o.weight || 700); size > 10 && ctx.measureText(s).width > maxW; ctx.font = D.font(size, o.weight || 700)) size -= 0.5;
      ctx.restore();
      FITC.set(key, size);
    }
    o.size = size; D.text(x, y, s, o);
  }
  function tag(x, y, s, o) { return D.label(x, y, s, o); }

  /* ---------- 축하 효과 · NEW 표시 ---------- */
  const checks = [];
  let FRAME_DT = 0.016;
  function celebrate(x, y) {
    FX.burst(x, y, { count: 26, speed: 190, life: 0.9, size: 4 });
    checks.push({ x, y, t: 0 });
    Sound.success();
  }
  function drawChecks(dt) {
    for (let i = checks.length - 1; i >= 0; i--) {
      const c = checks[i];
      c.t += dt || FRAME_DT;
      if (c.t > 1.8) { checks.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = c.t > 1.3 ? 1 - (c.t - 1.3) / 0.5 : 1;
      const s = 0.75 + 0.25 * ease.outBack(Math.min(1, c.t / 0.35));
      ctx.translate(c.x, c.y); ctx.scale(s, s);
      D.check(0, 0, 26, Math.min(1, c.t / 0.5));
      ctx.restore();
    }
  }
  function newBadge(x, y) {
    const a = 0.5 + 0.5 * Math.sin(CLK.t * 6);
    D.label(x, y, 'NEW', { bg: rgba('#16a34a', 0.85 + a * 0.15), size: 13, pad: 7 });
  }
  function ringRect(r, rad) {
    const a = 0.5 + 0.5 * Math.sin(CLK.t * 6);
    ctx.save(); ctx.strokeStyle = rgba('#16a34a', 0.35 + 0.5 * a); ctx.lineWidth = 4; D.roundRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, (rad || 16) + 4); ctx.stroke(); ctx.restore();
  }
  let hintTimer = 0;
  function hint(msg, ms) {
    const h = $('#stageHint');
    if (!h) return;
    h.textContent = msg; h.classList.remove('hide');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); }

  /* ---------- 하늘 · 해 · 달 (day 0=밤 ~ 1=낮) ---------- */
  const STARS = []; { let s = 777; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 46; i++) STARS.push({ x: r(), y: r() * 0.7, r: 0.7 + r() * 1.5, p: r() * 6 }); }
  function skyRect(x, y, w, h, day) {
    const top = mix('#0c1a3a', '#6fc3ff', day), bot = mix('#27406e', '#dff3ff', day);
    ctx.fillStyle = lgrad(0, y, 0, y + h, [[0, top], [1, bot]]);
    ctx.fillRect(x, y, w, h);
    if (day < 0.85) {
      const a = (1 - day) * 0.9;
      STARS.forEach((s) => {
        ctx.globalAlpha = a * (0.5 + 0.5 * Math.sin(CLK.t * 1.6 + s.p));
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + s.x * w, y + s.y * h, s.r, 0, TAU); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
  }
  function drawSun(x, y, r, a) {
    if (a <= 0.02) return;
    ctx.save(); ctx.globalAlpha = a;
    D.glow(x, y, r * 3.2, '#ffd34d', 0.55);
    ctx.strokeStyle = 'rgba(255,200,60,.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const an = (i / 12) * TAU + CLK.t * 0.25;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r * 1.35, y + Math.sin(an) * r * 1.35); ctx.lineTo(x + Math.cos(an) * r * (1.65 + 0.12 * Math.sin(CLK.t * 3 + i)), y + Math.sin(an) * r * (1.65 + 0.12 * Math.sin(CLK.t * 3 + i))); ctx.stroke();
    }
    D.sphere(x, y, r, '#ffc61a', { light: '#fff3a8', dark: '#ff9d00', gloss: false });
    ctx.restore();
  }
  function drawMoon(x, y, r, a) {
    if (a <= 0.02) return;
    ctx.save(); ctx.globalAlpha = a;
    D.glow(x, y, r * 2.6, '#cfe0ff', 0.35);
    D.sphere(x, y, r, '#eef2ff', { light: '#ffffff', dark: '#b7c4e6', gloss: false });
    ctx.fillStyle = 'rgba(150,165,205,.5)';
    [[-.3, -.2, .22], [.25, .1, .17], [-.05, .4, .14]].forEach((c) => { circle(ctx, x + c[0] * r, y + c[1] * r, c[2] * r); ctx.fill(); });
    ctx.restore();
  }
  function cloud(x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 0.9 : a; ctx.fillStyle = '#fff';
    [[0, 0, 22], [24, -8, 26], [52, 0, 20], [28, 8, 22]].forEach((c) => { circle(ctx, x + c[0] * s, y + c[1] * s, c[2] * s); ctx.fill(); });
    ctx.restore();
  }

  /* ---------- 분자 모형 (CPK: 탄소=회색, 산소=빨강, 수소=흰색) ---------- */
  const MOLC = new Map();
  const ATOM = { C: ['#6b7280', '#d1d5db', '#2b303a'], O: ['#ef4444', '#fecaca', '#991b1b'], H: ['#f3f4f6', '#ffffff', '#9ca3af'] };
  function atomAt(c, x, y, r, el) {
    const a = ATOM[el];
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, a[1]); g.addColorStop(0.55, a[0]); g.addColorStop(1, a[2]);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  const MOLS = {
    co2: { halo: null, atoms: [['O', -1.9, 0, 1.05], ['C', 0, 0, 0.9], ['O', 1.9, 0, 1.05]], R: 3.2 },
    o2: { halo: null, atoms: [['O', -0.95, 0, 1.05], ['O', 0.95, 0, 1.05]], R: 2.3 },
    h2o: { halo: null, atoms: [['H', -1.2, 0.85, 0.66], ['H', 1.2, 0.85, 0.66], ['O', 0, -0.25, 1.1]], R: 2.3 },
  };
  function ringMol(c, u, cx, cy, n, rad, oIdx) {
    c.strokeStyle = '#7c4a03'; c.lineWidth = u * 0.4; c.lineJoin = 'round';
    c.beginPath();
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU - Math.PI / 2; c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
    c.closePath(); c.stroke();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU - Math.PI / 2;
      const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
      if (i !== oIdx) { c.strokeStyle = '#7c4a03'; c.lineWidth = u * 0.28; c.beginPath(); c.moveTo(px, py); c.lineTo(cx + Math.cos(a) * (rad + u * 1.0), cy + Math.sin(a) * (rad + u * 1.0)); c.stroke(); atomAt(c, cx + Math.cos(a) * (rad + u * 1.15), cy + Math.sin(a) * (rad + u * 1.15), u * 0.5, 'O'); }
    }
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU - Math.PI / 2;
      atomAt(c, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, u * (i === oIdx ? 0.78 : 0.7), i === oIdx ? 'O' : 'C');
    }
  }
  function molSprite(kind, u) {
    const key = kind + '|' + u;
    let sp = MOLC.get(key);
    if (sp) return sp;
    const K = 2.5, S = Math.ceil(u * 9 * K), cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const c = cv.getContext('2d');
    c.scale(K, K); c.translate(S / K / 2, S / K / 2);
    if (MOLS[kind]) {
      const m = MOLS[kind];
      m.atoms.forEach((a) => atomAt(c, a[1] * u, a[2] * u, a[3] * u, a[0]));
    } else if (kind === 'glucose') {
      const g = c.createRadialGradient(0, 0, 0, 0, 0, u * 4.2); g.addColorStop(0, 'rgba(255,200,80,.55)'); g.addColorStop(1, 'rgba(255,200,80,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, u * 4.2, 0, TAU); c.fill();
      ringMol(c, u * 0.9, 0, 0, 6, u * 1.9, 5);
    } else if (kind === 'sucrose') {
      const g = c.createRadialGradient(0, 0, 0, 0, 0, u * 5.2); g.addColorStop(0, 'rgba(255,150,90,.6)'); g.addColorStop(1, 'rgba(255,150,90,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, u * 5.2, 0, TAU); c.fill();
      ringMol(c, u * 0.8, -u * 1.9, 0, 6, u * 1.6, 5);
      ringMol(c, u * 0.8, u * 2.0, 0, 5, u * 1.4, 4);
      c.strokeStyle = '#7c4a03'; c.lineWidth = u * 0.3; c.beginPath(); c.moveTo(-u * 0.5, 0); c.lineTo(u * 0.8, 0); c.stroke();
    } else if (kind === 'starch') {
      const r = u * 2.6;
      const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r); g.addColorStop(0, '#f5f0ff'); g.addColorStop(0.6, '#cdbdf5'); g.addColorStop(1, '#8e77d6');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(110,85,190,.45)'; c.lineWidth = 1;
      [0.35, 0.62, 0.86].forEach((k) => { c.beginPath(); c.arc(-r * 0.08, -r * 0.05, r * k, 0, TAU); c.stroke(); });
      c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-r * 0.4, -r * 0.5, r * 0.26, r * 0.14, -0.6, 0, TAU); c.fill();
    }
    sp = { cv, S: S / K };
    MOLC.set(key, sp);
    return sp;
  }
  function drawMol(kind, x, y, u, rot, alpha) {
    const sp = molSprite(kind, Math.round(u * 2) / 2);
    ctx.save();
    if (alpha != null && alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.drawImage(sp.cv, -sp.S / 2, -sp.S / 2, sp.S, sp.S);
    ctx.restore();
  }
  const MNAME = { co2: '이산화 탄소', o2: '산소', h2o: '물', glucose: '포도당', sucrose: '설탕', starch: '녹말' };
  /* 범례 한 줄: 분자 모양 + 이름 */
  function legendItem(x, y, kind, label, o) {
    o = o || {};
    drawMol(kind, x, y, o.u || 5, 0, 1);
    const w = D.label(x + (o.gap || 24), y, label, { bg: o.bg || 'rgba(255,255,255,.9)', color: o.color || COL.ink, size: o.size || 13, align: 'left' });
    return w.w + (o.gap || 24) + 10;
  }

  /* ---------- 경로를 따라 흐르는 입자 ---------- */
  class Path {
    constructor(pts) {
      this.p = pts; this.l = [0];
      for (let i = 1; i < pts.length; i++) this.l[i] = this.l[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      this.len = this.l[pts.length - 1];
    }
    at(d) {
      d = clamp(d, 0, this.len);
      let i = 1;
      while (i < this.p.length - 1 && this.l[i] < d) i++;
      const a = this.p[i - 1], b = this.p[i], sl = this.l[i] - this.l[i - 1] || 1, t = (d - this.l[i - 1]) / sl;
      return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
    /* 점에서 가장 가까운 경로 위 거리(d)와 점까지의 거리 */
    nearest(x, y) {
      let best = { d: 0, dist: 1e9 };
      for (let i = 1; i < this.p.length; i++) {
        const a = this.p[i - 1], b = this.p[i], vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy || 1;
        const t = clamp(((x - a[0]) * vx + (y - a[1]) * vy) / L2, 0, 1);
        const qx = a[0] + vx * t, qy = a[1] + vy * t, dist = Math.hypot(x - qx, y - qy);
        if (dist < best.dist) best = { d: this.l[i - 1] + Math.sqrt(L2) * t, dist, x: qx, y: qy };
      }
      return best;
    }
  }
  class Streams {
    constructor(max) { this.list = []; this.max = max || 160; }
    add(path, kind, speed, o) {
      if (this.list.length >= this.max) return null;
      const p = Object.assign({ path, kind, d: 0, speed, u: 4.6, rot: rand(0, TAU), vr: rand(-1.5, 1.5), wob: rand(0, TAU), jig: 3, alpha: 1, fade: 18 }, o);
      this.list.push(p);
      return p;
    }
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const p = this.list[i];
        p.d += p.speed * dt; p.rot += p.vr * dt;
        if (p.hold) { p.hold -= dt; p.d -= p.speed * dt; }
        if (p.d >= p.path.len) { this.list.splice(i, 1); if (p.onEnd) p.onEnd(p); }
      }
    }
    draw() {
      this.list.forEach((p) => {
        const q = p.path.at(p.d), nx = -Math.sin(q.a), ny = Math.cos(q.a), w = Math.sin(p.wob + p.d * 0.06) * p.jig;
        const a = p.alpha * Math.min(1, p.d / p.fade, (p.path.len - p.d) / p.fade);
        drawMol(p.kind, q.x + nx * w, q.y + ny * w, p.u, p.rot, a);
      });
    }
    clear() { this.list.length = 0; }
  }

  /* ---------- 잎 · 세포 · 엽록체 그리기 ---------- */
  function leafPath(c, len, wid) {
    c.beginPath(); c.moveTo(0, 0);
    c.bezierCurveTo(len * 0.18, -wid * 1.05, len * 0.72, -wid * 0.95, len, 0);
    c.bezierCurveTo(len * 0.72, wid * 0.95, len * 0.18, wid * 1.05, 0, 0);
    c.closePath();
  }
  function drawLeaf(x, y, len, wid, ang, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (o.shadow !== false) { ctx.shadowColor = 'rgba(10,50,20,.25)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5; }
    leafPath(ctx, len, wid);
    ctx.fillStyle = lgrad(0, -wid, 0, wid, [[0, o.c1 || '#7edb73'], [0.5, o.c2 || '#3fae4b'], [1, o.c3 || '#2b8a3e']]);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.save(); leafPath(ctx, len, wid); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(2, wid * 0.045);
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(len * 0.96, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth = Math.max(1, wid * 0.022);
    for (let i = 1; i <= 6; i++) {
      const bx = len * (0.1 + i * 0.13);
      ctx.beginPath(); ctx.moveTo(bx, 0); ctx.quadraticCurveTo(bx + len * 0.1, -wid * 0.45, bx + len * 0.2, -wid * 0.95); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, 0); ctx.quadraticCurveTo(bx + len * 0.1, wid * 0.45, bx + len * 0.2, wid * 0.95); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.ellipse(len * 0.4, -wid * 0.45, len * 0.28, wid * 0.16, -0.12, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  /* 엽록체: (x, y) 중심, 가로 반지름 rx, 세로 반지름 ry */
  function drawChloroplast(x, y, rx, ry, rot, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    // 바깥 막
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.fillStyle = lgrad(0, -ry, 0, ry, [[0, '#9be68d'], [0.5, '#5fc457'], [1, '#3a9a43']]);
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, rx * 0.04); ctx.strokeStyle = '#2c7d36'; ctx.stroke();
    if (rx > 14) {
      ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.93, ry * 0.9, 0, 0, TAU); ctx.lineWidth = Math.max(0.8, rx * 0.015); ctx.strokeStyle = 'rgba(30,110,50,.45)'; ctx.stroke();
    }
    // 그라나(납작한 주머니를 쌓은 것) + 연결 막
    const gr = [[-0.52, -0.18], [-0.2, 0.2], [0.12, -0.2], [0.44, 0.15], [-0.05, -0.02], [0.62, -0.1]];
    if (rx > 10) {
      ctx.strokeStyle = 'rgba(30,100,50,.55)'; ctx.lineWidth = Math.max(1, rx * 0.02);
      ctx.beginPath(); for (let i = 0; i < gr.length; i++) ctx.lineTo(gr[i][0] * rx, gr[i][1] * ry); ctx.stroke();
      const sx = rx * 0.1, sh = Math.max(1.4, ry * 0.075);
      gr.forEach((g, gi) => {
        const n = 5, gx = g[0] * rx, gy = g[1] * ry - (n * sh) / 2;
        for (let k = 0; k < n; k++) {
          ctx.fillStyle = k % 2 ? '#1e7a3a' : '#2a9446';
          D.roundRect(gx - sx * 1.5, gy + k * sh * 1.05, sx * 3, sh, sh / 2); ctx.fill();
        }
        if (o.light) { ctx.fillStyle = 'rgba(255,240,150,' + (0.25 + 0.2 * Math.sin(CLK.t * 4 + gi)) + ')'; ctx.fillRect(gx - sx * 1.5, gy, sx * 3, n * sh); }
      });
    }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-rx * 0.35, -ry * 0.55, rx * 0.3, ry * 0.12, -0.3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------- 그래프 틀 ---------- */
  function plotFrame(r, o) {
    panel(r.x, r.y, r.w, r.h, 12);
    const m = { l: o.ml || 40, r: 14, t: o.title ? 34 : 14, b: o.xlabel ? 42 : 28 };
    const px = r.x + m.l, py = r.y + m.t, pw = r.w - m.l - m.r, ph = r.h - m.t - m.b;
    if (o.title) text(r.x + 12, r.y + 22, o.title, { size: 14, weight: 800, align: 'left', color: COL.ink });
    ctx.save();
    ctx.strokeStyle = '#e4eaf2'; ctx.lineWidth = 1;
    (o.yt || []).forEach((v) => { const y = py + ph - ((v - o.ymin) / (o.ymax - o.ymin)) * ph; ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + pw, y); ctx.stroke(); text(px - 6, y + 4, o.fy ? o.fy(v) : String(v), { size: 12, align: 'right', color: COL.muted, weight: 600 }); });
    (o.xt || []).forEach((v) => { const x = px + ((v - o.xmin) / (o.xmax - o.xmin)) * pw; ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x, py + ph); ctx.stroke(); text(x, py + ph + 16, o.fx ? o.fx(v) : String(v), { size: 12, align: 'center', color: COL.muted, weight: 600 }); });
    ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
    ctx.restore();
    if (o.xlabel) text(px + pw / 2, r.y + r.h - 8, o.xlabel, { size: 12.5, weight: 700, color: COL.muted });
    if (o.ylabel) { ctx.save(); ctx.translate(r.x + 12, py + ph / 2); ctx.rotate(-Math.PI / 2); text(0, 0, o.ylabel, { size: 12.5, weight: 700, color: COL.muted }); ctx.restore(); }
    return { px, py, pw, ph, X: (v) => px + ((v - o.xmin) / (o.xmax - o.xmin)) * pw, Y: (v) => py + ph - ((v - o.ymin) / (o.ymax - o.ymin)) * ph };
  }

  /* ---------- 끌어서 놓는 카드판 (칩 → 칸) ---------- */
  class CardBoard {
    constructor() { this.slots = []; this.chips = []; this.drag = null; this.sel = null; this.moved = 0; this.onChange = null; }
    addSlot(s) { s.chip = null; s.glow = 0; this.slots.push(s); return s; }
    addChip(c) {
      c.sx = new SciSim.Spring(c.hx, { stiffness: 240, damping: 21 }); c.sy = new SciSim.Spring(c.hy, { stiffness: 240, damping: 21 });
      c.x = c.hx; c.y = c.hy; c.cw = c.w; c.ch = c.h; c.slot = null; c.lift = 0; c.shake = 0; c.flag = null; c.color = c.color || '#16a34a';
      c.appear = 0;
      this.chips.push(c); return c;
    }
    reset() { this.drag = null; this.sel = null; this.slots.forEach((s) => { s.chip = null; }); this.chips.forEach((c) => { c.slot = null; c.flag = null; c.sx.value = c.sx.target = c.hx; c.sy.value = c.sy.target = c.hy; c.x = c.hx; c.y = c.hy; c.cw = c.w; c.ch = c.h; }); }
    slotCenter(s) { return { x: s.x + s.w / 2, y: s.y + s.h / 2 }; }
    hitChip(p) {
      for (let i = this.chips.length - 1; i >= 0; i--) {
        const c = this.chips[i];
        if (Math.abs(p.x - c.x) <= c.cw / 2 + 4 && Math.abs(p.y - c.y) <= c.ch / 2 + 4) return c;
      }
      return null;
    }
    hitSlot(p, pad) { return this.slots.find((s) => inR(p, s, pad || 0)) || null; }
    nearestSlot(c) {
      let best = null, bd = 1e9;
      this.slots.forEach((s) => { const q = this.slotCenter(s), d = Math.hypot(q.x - c.x, q.y - c.y); if (d < bd) { bd = d; best = s; } });
      return best && bd < Math.max(best.w, best.h) * 0.85 + 20 ? best : null;
    }
    place(c, s) {
      if (s.chip && s.chip !== c) this.unplace(s.chip);
      if (c.slot) c.slot.chip = null;
      c.slot = s; s.chip = c; c.flag = null;
      const q = this.slotCenter(s);
      c.sx.target = q.x; c.sy.target = q.y; s.glow = 1;
      this.chips.splice(this.chips.indexOf(c), 1); this.chips.push(c);
      Sound.click();
      this.onChange && this.onChange();
    }
    unplace(c) {
      if (c.slot) { c.slot.chip = null; c.slot = null; }
      c.sx.target = c.hx; c.sy.target = c.hy; c.flag = null;
    }
    down(p) {
      this.moved = 0;
      if (this.sel) {
        const s = this.hitSlot(p, 6);
        if (s) { const c = this.sel; this.sel = null; this.place(c, s); return true; }
      }
      const c = this.hitChip(p);
      if (!c) { this.sel = null; return false; }
      this.drag = { c, dx: c.x - p.x, dy: c.y - p.y, x0: p.x, y0: p.y, from: c.slot };
      if (c.slot) { c.slot.chip = null; c.slot = null; }
      c.sx.value = c.x; c.sy.value = c.y; c.sx.velocity = c.sy.velocity = 0;
      this.chips.splice(this.chips.indexOf(c), 1); this.chips.push(c);
      c.flag = null;
      return true;
    }
    move(p) {
      const d = this.drag; if (!d) return;
      this.moved = Math.max(this.moved, Math.hypot(p.x - d.x0, p.y - d.y0));
      d.c.x = p.x + d.dx; d.c.y = p.y + d.dy; d.c.sx.value = d.c.sx.target = d.c.x; d.c.sy.value = d.c.sy.target = d.c.y;
    }
    up(p) {
      const d = this.drag; if (!d) return;
      this.drag = null;
      const c = d.c;
      if (this.moved < 7) {                       // 눌렀다 뗌 = 선택 (그다음 칸을 누르면 놓임)
        if (d.from) { d.from.chip = c; c.slot = d.from; const q = this.slotCenter(d.from); c.sx.target = q.x; c.sy.target = q.y; this.sel = null; this.unplace(c); this.sel = c; }
        else { c.sx.target = c.hx; c.sy.target = c.hy; this.sel = this.sel === c ? null : c; }
        this.onChange && this.onChange();
        return;
      }
      this.sel = null;
      const s = this.nearestSlot(c);
      if (s) this.place(c, s);
      else { c.sx.target = c.hx; c.sy.target = c.hy; this.onChange && this.onChange(); }
    }
    update(dt) {
      this.chips.forEach((c) => {
        const dragging = this.drag && this.drag.c === c;
        if (!dragging) { c.x = c.sx.update(dt); c.y = c.sy.update(dt); }
        c.lift = SciSim.approach(c.lift, dragging ? 1 : this.sel === c ? 0.6 : 0, dt, 16);
        const tw = c.slot ? c.slot.w : c.w, th = c.slot ? c.slot.h : c.h;
        c.cw = SciSim.approach(c.cw, tw, dt, 16); c.ch = SciSim.approach(c.ch, th, dt, 16);
        if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
        c.appear = Math.min(1, c.appear + dt * 3);
      });
      this.slots.forEach((s) => { s.glow = Math.max(0, s.glow - dt * 2.5); });
    }
    isOK(s) { return !!(s.chip && s.accept.indexOf(s.chip.kind) >= 0 && (!s.group || !this.slots.some((o) => o !== s && o.group === s.group && o.chip && o.chip.kind === s.chip.kind))); }
    filledCount() { return this.slots.filter((s) => s.chip).length; }
    wrongSlots() { return this.slots.filter((s) => s.chip && !this.isOK(s)); }
    emptySlots() { return this.slots.filter((s) => !s.chip); }
    flagWrong(list) {
      list.forEach((s) => { const c = s.chip; if (c && c.flag !== s) { c.flag = s; c.shake = 0.45; } });
    }
    draw(o) {
      o = o || {};
      const t = CLK.t;
      // 칸
      this.slots.forEach((s) => {
        ctx.save();
        const targetable = this.drag || this.sel;
        const pulse = targetable ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
        ctx.fillStyle = s.chip ? 'rgba(255,255,255,0)' : s.fill || 'rgba(255,255,255,.7)';
        D.roundRect(s.x, s.y, s.w, s.h, 12); ctx.fill();
        ctx.setLineDash(s.chip ? [] : [7, 5]); ctx.lineWidth = 2.5;
        ctx.strokeStyle = s.chip ? 'rgba(0,0,0,0)' : targetable ? rgba('#16a34a', 0.45 + 0.45 * pulse) : '#9fb3a6';
        D.roundRect(s.x, s.y, s.w, s.h, 12); ctx.stroke();
        ctx.setLineDash([]);
        if (!s.chip && s.ph) wrapText(s.x + s.w / 2, s.y + s.h / 2, s.ph, s.w - 12, { size: s.phSize || 13, color: '#8aa092', weight: 700, lh: 15 });
        if (s.glow > 0) { ctx.strokeStyle = rgba('#16a34a', s.glow); ctx.lineWidth = 6 * s.glow; D.roundRect(s.x - 3, s.y - 3, s.w + 6, s.h + 6, 14); ctx.stroke(); }
        ctx.restore();
      });
      // 칩
      this.chips.forEach((c) => {
        const dragging = this.drag && this.drag.c === c;
        const sc = (1 + 0.07 * c.lift) * (0.85 + 0.15 * ease.outBack(c.appear));
        const shk = c.shake > 0 ? Math.sin(c.shake * 60) * 5 * (c.shake / 0.45) : 0;
        ctx.save(); ctx.translate(c.x + shk, c.y - c.lift * 4); ctx.scale(sc, sc);
        ctx.globalAlpha = Math.min(1, c.appear * 1.5);
        if (!c.slot || dragging) softShadow(-c.cw / 2, -c.ch / 2, c.cw, c.ch, 11, 8 + 10 * c.lift, 3 + 7 * c.lift, 'rgba(20,50,30,.35)');
        else softShadow(-c.cw / 2, -c.ch / 2, c.cw, c.ch, 11, 5, 2, 'rgba(20,50,30,.25)');
        const base = c.color;
        ctx.fillStyle = lgrad(0, -c.ch / 2, 0, c.ch / 2, [[0, shade(base, 0.22)], [1, base]]);
        D.roundRect(-c.cw / 2, -c.ch / 2, c.cw, c.ch, 11); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.22)'; D.roundRect(-c.cw / 2 + 3, -c.ch / 2 + 2, c.cw - 6, c.ch * 0.38, 8); ctx.fill();
        if (c.flag) { ctx.strokeStyle = COL.bad; ctx.lineWidth = 4; D.roundRect(-c.cw / 2, -c.ch / 2, c.cw, c.ch, 11); ctx.stroke(); }
        else if (this.sel === c) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; D.roundRect(-c.cw / 2, -c.ch / 2, c.cw, c.ch, 11); ctx.stroke(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; D.roundRect(-c.cw / 2 - 2, -c.ch / 2 - 2, c.cw + 4, c.ch + 4, 12); ctx.stroke(); }
        if (c.icon) { text(-c.cw / 2 + 20, 1, c.icon, { size: 20, baseline: 'middle', weight: 400 }); wrapText(10, 0, c.label, c.cw - 46, { size: c.size || 14, color: c.tc || '#fff', weight: 800, lh: (c.size || 14) * 1.2 }); }
        else wrapText(0, 0, c.label, c.cw - 14, { size: c.size || 14, color: c.tc || '#fff', weight: 800, lh: (c.size || 14) * 1.2 });
        ctx.restore();
      });
    }
  }

  /* ---------- 사용자 입력 도우미 ---------- */
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n); }
  const bindClick = (el, fn) => { if (el) el.addEventListener('click', () => { Sound.click(); fn(); }); };

  /* =========================================================
     중2 Ⅴ. 식물과 에너지 — 광합성 산물의 이동과 저장 [9과12-03]
     ① [실험] 녹말 확인: 빛을 받은 잎과 은박지로 가린 잎 → 탈색 → 아이오딘 반응 (청람색 = 녹말)
     ② [모형] 이동: 낮에 잎에 녹말이 쌓이고, 밤에 설탕이 되어 체관을 따라 뿌리·열매로 이동 (물관과 구별)
     ③ [탐구] 저장: 아이오딘·베네딕트 검출 + 저장 기관 짝짓기 (녹말·포도당·설탕·단백질·지방)
     ④ [적용] 이용: 호흡(에너지)·생장·식량 에너지의 근원 정보 그림 완성
     ========================================================= */
  let game = null;
  let F = new Set();
  let scene = 'leaf';
  const SCENE_LABEL = {
    leaf: '🧪 잎에 녹말이 만들어졌을까?', plant: '🌱 식물 속 양분의 이동 모형', test: '🔬 저장 물질 검출하기',
    cards: '🃏 저장 기관과 저장 물질', use: '🍽️ 광합성 산물의 이용 정보 그림',
  };
  const STC = '#8b6fe0', IOD = '#c98a2b', BLK = '#1d2266', SUCR = '#f59e0b';
  const has = (n) => (game && game.free) || F.has(n);
  const isFree = () => !!(game && game.free);
  const lvlNow = () => (game ? game.level : 0);
  const approach = SciSim.approach;

  /* =========================================================
     장면 1: 녹말 확인 실험 (빛 쬐기 → 탈색 → 아이오딘 반응)
     ========================================================= */
  const PALE = ['#f6f1d4', '#efe8be', '#e4dcae'];
  const LF = { x: 60, y: 272, len: 400, wid: 92 };
  const ZX = [[60, 193], [193, 327], [327, 460]];
  const ZC = ZX.map((z) => (z[0] + z[1]) / 2);
  const LDUR = { light: 5.2, decol: 5.6, iodine: 4.8 };
  const LX = {
    stage: 0, act: null, t: 0, sunS: 0.5, dec: 0, view: 'sun', fade: 0, tap: true, drops: [], dx: ZC[0], dropped: [false, false, false],
    inb: 0, burner: 0, bubT: 0, doneFx: false,
    zones: [0, 1, 2].map((i) => ({ foil: i === 1, fp: i === 1 ? 1 : 0, sv: 0, ii: 0 })),
  };
  const lit = () => LX.zones.filter((z) => !z.foil).length;
  const covered = () => LX.zones.filter((z) => z.foil).length;

  function setFoil(i, on) {
    const L = LX;
    if (L.stage !== 0 || L.act) return false;
    L.zones[i].foil = on == null ? !L.zones[i].foil : on;
    L.tap = false; Sound.click();
    refreshReadouts(); syncLeafUI();
    return true;
  }
  function resetLeaf(keep) {
    const L = LX;
    L.stage = 0; L.act = null; L.t = 0; L.dec = 0; L.inb = 0; L.drops.length = 0; L.doneFx = false; L.tap = true;
    L.zones.forEach((z, i) => { z.sv = 0; z.ii = 0; if (!keep) { z.foil = i === 1; } });
    syncLeafUI();
  }
  function leafNext() {
    const L = LX;
    if (L.act) return;
    if (L.stage >= 3) { resetLeaf(true); return; }
    L.act = ['light', 'decol', 'iodine'][L.stage]; L.t = 0; L.dropped = [false, false, false]; L.tap = false; L.doneFx = false;
    Sound.click();
    syncLeafUI(); refreshReadouts();
  }
  function updateLeaf(dt) {
    const L = LX;
    L.zones.forEach((z) => { z.fp = approach(z.fp, z.foil ? 1 : 0, dt, RM ? 60 : 9); });
    if (L.act) L.t = Math.min(1, L.t + dt / LDUR[L.act]);
    const lightP = L.stage >= 1 ? 1 : L.act === 'light' ? smooth(seg(L.t, 0.12, 0.88)) : 0;
    L.zones.forEach((z) => { z.sv = z.foil ? 0 : lightP; });
    L.dec = L.stage >= 2 ? 1 : L.act === 'decol' ? smooth(seg(L.t, 0.28, 0.92)) : 0;
    L.zones.forEach((z, i) => {
      z.ii = L.stage >= 3 ? 1 : L.act === 'iodine' ? smooth(seg(L.t, 0.13 + i * 0.26, 0.5 + i * 0.26)) : 0;
    });
    L.sunS = approach(L.sunS, L.act === 'light' ? lerp(0.1, 0.9, L.t) : L.stage >= 1 ? 0.9 : 0.5, dt, 3.5);
    L.burner = approach(L.burner, L.act === 'decol' ? 1 : 0, dt, 5);
    L.inb = approach(L.inb, L.act === 'decol' ? smooth(seg(L.t, 0.02, 0.26)) : L.stage >= 2 ? 1 : 0, dt, 12);
    // 아이오딘 방울
    if (L.act === 'iodine') {
      let zi = L.dropped.indexOf(false); if (zi < 0) zi = 2;
      L.dx = approach(L.dx, ZC[zi], dt, 7);
      for (let i = 0; i < 3; i++) if (!L.dropped[i] && L.t >= 0.08 + i * 0.26) {
        L.dropped[i] = true;
        for (let k = 0; k < 3; k++) L.drops.push({ x: ZC[i] + (k - 1) * 9, y: 150, vy: 40, delay: k * 0.09 });
      }
    } else L.dx = approach(L.dx, ZC[0], dt, 4);
    for (let i = L.drops.length - 1; i >= 0; i--) {
      const d = L.drops[i];
      if (d.delay > 0) { d.delay -= dt; continue; }
      d.vy += 760 * dt; d.y += d.vy * dt;
      if (d.y >= LF.y - 10) { FX.burst(d.x, LF.y - 10, { count: 6, colors: [IOD, '#e0a64a'], speed: 55, life: 0.45, size: 2.4, gravity: 220, shape: 'circle' }); L.drops.splice(i, 1); }
    }
    // 중탕 거품
    if (L.act === 'decol' && !RM) {
      L.bubT -= dt;
      if (L.bubT <= 0) { L.bubT = 0.11; FX.emit({ x: rand(168, 352), y: rand(340, 360), vx: rand(-6, 6), vy: -rand(36, 60), life: rand(0.8, 1.4), size: rand(2.2, 4.2), color: 'rgba(255,255,255,.95)', shape: 'bubble' }); }
    }
    if (L.act && L.t >= 1) {
      const a = L.act; L.act = null; L.stage++; L.t = 0;
      if (a === 'iodine' && !L.doneFx) { L.doneFx = true; celebrate(SW / 2, 130); }
      else Sound.success();
      syncLeafUI(); refreshReadouts();
    }
  }

  /* ----- 그리기 도구: 잎 한 장과 구역 ----- */
  function leafColors(d) { return { c1: mix('#7edb73', PALE[0], d), c2: mix('#3fae4b', PALE[1], d), c3: mix('#2b8a3e', PALE[2], d) }; }
  function inLeafZone(i, fn) {
    ctx.save();
    ctx.translate(LF.x, LF.y); leafPath(ctx, LF.len, LF.wid); ctx.clip(); ctx.translate(-LF.x, -LF.y);
    ctx.beginPath(); ctx.rect(ZX[i][0], 0, ZX[i][1] - ZX[i][0], SH); ctx.clip();
    fn(); ctx.restore();
  }
  function drawFoil(i, fp) {
    if (fp < 0.02) return;
    const x0 = ZX[i][0] + 3, w = ZX[i][1] - ZX[i][0] - 6, top = LF.y - LF.wid - 24, h = LF.wid * 2 + 48;
    ctx.save();
    ctx.globalAlpha = Math.min(1, fp * 1.6);
    ctx.translate(0, -(1 - Math.min(1, fp)) * 80);
    D.shadow(() => {
      ctx.fillStyle = lgrad(x0, 0, x0 + w, 0, [[0, '#9aa7b8'], [0.28, '#eef2f7'], [0.55, '#b3bfce'], [0.8, '#e6ebf2'], [1, '#8b98ab']]);
      D.roundRect(x0, top, w, h, 8); ctx.fill();
    }, { blur: 10, y: 4 });
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.6;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0 + 18 + k * 30, top + 8); ctx.lineTo(x0 + 10 + k * 30 + (k % 2 ? 8 : -2), top + h - 8); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(70,85,105,.35)'; ctx.lineWidth = 1.2; D.roundRect(x0, top, w, h, 8); ctx.stroke();
    text(x0 + w / 2, top + h / 2 + 5, '은박지', { size: 14, weight: 800, color: '#475569' });
    ctx.restore();
  }
  function ironDropper(x, y, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    D.shadow(() => {
      ctx.fillStyle = lgrad(-14, 0, 14, 0, [[0, '#3b4558'], [0.4, '#6b778c'], [1, '#2c3444']]);
      ctx.beginPath(); ctx.ellipse(0, -8, 14, 17, 0, 0, TAU); ctx.fill();
    }, { blur: 6, y: 3 });
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(-5, -14, 4, 7, -0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(210,230,250,.85)'; ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-7, 6); ctx.lineTo(7, 6); ctx.lineTo(7, 46); ctx.lineTo(2.5, 66); ctx.lineTo(-2.5, 66); ctx.lineTo(-7, 46); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rgba(o.col || IOD, 0.9); ctx.beginPath(); ctx.moveTo(-5.5, 24); ctx.lineTo(5.5, 24); ctx.lineTo(5.5, 46); ctx.lineTo(2, 62); ctx.lineTo(-2, 62); ctx.lineTo(-5.5, 46); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* ----- 장면: 햇빛 아래 (은박지로 가린 잎) ----- */
  function drawLeafSun() {
    const L = LX, t = CLK.t;
    const sp = L.sunS, dayV = clamp(Math.sin(Math.PI * sp) * 1.5, 0, 1);
    skyRect(0, 0, SW, SH, dayV);
    const sx = lerp(56, 464, sp), sy = 150 - Math.sin(Math.PI * sp) * 96;
    drawSun(sx, sy, 24, clamp(dayV * 1.6, 0, 1));
    drawMoon(sx, sy, 20, clamp(1 - dayV * 2.2, 0, 1));
    cloud(330, 52, 0.7, 0.8 * dayV); cloud(150, 96, 0.45, 0.6 * dayV);
    // 언덕
    ctx.fillStyle = lgrad(0, 400, 0, SH, [[0, mix('#1d3b2f', '#7fcf78', dayV)], [1, mix('#13271e', '#4aa356', dayV)]]);
    ctx.beginPath(); ctx.moveTo(0, 430); ctx.quadraticCurveTo(260, 380, SW, 424); ctx.lineTo(SW, SH); ctx.lineTo(0, SH); ctx.closePath(); ctx.fill();
    // 가지
    ctx.strokeStyle = '#7a5a36'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, 430); ctx.bezierCurveTo(20, 380, 30, 310, LF.x + 4, LF.y); ctx.stroke();
    ctx.strokeStyle = '#9a7a52'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-6, 428); ctx.bezierCurveTo(24, 380, 34, 312, LF.x + 2, LF.y - 3); ctx.stroke();
    // 빛줄기
    ctx.save();
    ctx.lineWidth = 2.2; ctx.setLineDash([9, 11]); ctx.lineDashOffset = -t * 46;
    L.zones.forEach((z, i) => {
      const blocked = z.fp > 0.5, endY = blocked ? LF.y - LF.wid - 26 : LF.y - 30;
      for (let k = -1; k <= 1; k++) {
        ctx.strokeStyle = rgba('#ffe27a', (blocked ? 0.4 : 0.8) * dayV);
        ctx.beginPath(); ctx.moveTo(sx + k * 10, sy + 26); ctx.lineTo(ZC[i] + k * 34, endY); ctx.stroke();
      }
    });
    ctx.setLineDash([]); ctx.restore();
    // 잎
    drawLeaf(LF.x, LF.y, LF.len, LF.wid, 0, leafColors(0));
    // 쌓이는 녹말 (잎 위에 반짝이는 보라 점)
    L.zones.forEach((z, i) => {
      if (z.sv <= 0.02) return;
      for (let k = 0; k < 9; k++) {
        const gx = ZX[i][0] + 18 + ((k * 37) % 100), gy = LF.y - 36 + ((k * 53) % 72) - 4;
        const a = clamp(z.sv * 9 - k, 0, 1); if (a <= 0) continue;
        ctx.globalAlpha = a * 0.9; D.sphere(gx, gy, 4.2 * (0.6 + 0.4 * ease.outBack(a)), STC, { gloss: false }); ctx.globalAlpha = 1;
      }
    });
    L.zones.forEach((z, i) => drawFoil(i, z.fp));
    // 구역 이름표
    L.zones.forEach((z, i) => {
      const f = z.foil;
      D.label(ZC[i], LF.y + LF.wid + 36, f ? '🔦 은박지로 가림' : '☀️ 빛을 받음', { bg: f ? rgba('#64748b', 0.92) : rgba('#d97706', 0.92), size: 13 });
    });
    // 하루 진행 표시
    panel(12, 12, 150, 52, 14, 'rgba(255,255,255,.95)');
    text(87, 31, L.act === 'light' ? '⏳ 하루 동안…' : L.stage >= 1 ? '✅ 하루가 지났어요' : '☀️ 하루 전부터 빛 쬐기', { size: 12.5, weight: 800, color: COL.muted });
    const pr = L.stage >= 1 ? 1 : L.act === 'light' ? L.t : 0;
    ctx.fillStyle = '#e4eaf2'; D.roundRect(24, 42, 126, 8, 4); ctx.fill();
    if (pr > 0.01) { ctx.fillStyle = '#f59e0b'; D.roundRect(24, 42, Math.max(8, 126 * pr), 8, 4); ctx.fill(); }
    if (L.tap && !L.act) newBadge(SW - 40, 24);
    if (L.tap && !L.act) D.label(SW / 2, 448, '👆 잎의 부분을 누르면 은박지를 씌우거나 벗겨요', { bg: rgba('#16a34a', 0.95), size: 13.5, pad: 11 });
  }

  /* ----- 장면: 에탄올 중탕으로 탈색 ----- */
  function drawLeafBath() {
    const L = LX, t = CLK.t;
    ctx.fillStyle = lgrad(0, 0, 0, SH, [[0, '#f4f8f2'], [1, '#e3eee0']]); ctx.fillRect(0, 0, SW, SH);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 5; i++) ctx.fillRect(18 + i * 104, 0, 2, 380);
    ctx.fillStyle = lgrad(0, 436, 0, SH, [[0, '#d9bd8e'], [1, '#b99668']]); ctx.fillRect(0, 436, SW, SH - 436);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(0, 438, SW, 3);
    // 알코올램프
    contactShadow(260, 440, 56, 9, 0.8);
    ctx.save();
    ctx.fillStyle = lgrad(0, 410, 0, 440, [[0, '#cfe3f5'], [1, '#9cb8d2']]); D.roundRect(222, 414, 76, 28, 10); ctx.fill();
    ctx.fillStyle = '#e7a85c'; ctx.fillRect(222, 428, 76, 8);
    ctx.fillStyle = '#6b778c'; D.roundRect(252, 404, 16, 12, 3); ctx.fill();
    ctx.restore();
    D.flame(260, 404, 34 * L.burner, t);
    // 큰 비커 (뜨거운 물)
    D.beaker(150, 176, 220, 210, { level: 0.74, liquid: '#8ecbff', t, ticks: 5 });
    // 작은 비커 (에탄올 + 잎)
    const eth = mix('#fff6cc', '#5fb85a', clamp(L.dec * 0.85, 0, 1));
    D.beaker(206, 226, 108, 150, { level: 0.62, liquid: eth, t: t * 0.8, wave: 0.8 });
    // 잎: 비커 위에서 천천히 내려와 에탄올 속으로
    const lx = 262, hy = 118, iy = 322, y = lerp(hy, iy, ease.inOutSine ? ease.inOutSine(L.inb) : L.inb);
    const ang = lerp(-0.35, -1.25, L.inb), ln = lerp(130, 92, L.inb), wd = lerp(50, 34, L.inb);
    ctx.save();
    if (L.inb > 0.55) { ctx.beginPath(); ctx.rect(206, 226, 108, 150); ctx.clip(); }
    drawLeaf(lx - Math.cos(ang) * ln / 2, y - Math.sin(ang) * ln / 2, ln, wd, ang, Object.assign(leafColors(L.dec), { shadow: L.inb < 0.5 }));
    ctx.restore();
    // 이름표
    D.label(150, 160, '뜨거운 물 (중탕)', { bg: rgba('#2563eb', 0.92), size: 13.5, align: 'left' });
    D.label(318, 214, '에탄올', { bg: rgba('#6d5a1e', 0.92), size: 13.5, align: 'left' });
    if (L.stage === 1 && !L.act) D.label(SW / 2, 62, '🧪 잎을 에탄올에 넣어 초록색(엽록소)을 빼요', { bg: rgba('#16a34a', 0.95), size: 14, pad: 12 });
    else if (L.act === 'decol') D.label(SW / 2, 62, L.dec > 0.6 ? '잎의 초록색이 빠져서 연해졌어요' : '에탄올이 엽록소를 녹여 내요…', { bg: rgba('#0f172a', 0.8), size: 14, pad: 12 });
    D.label(SW / 2, 468, '불꽃이 에탄올에 닿지 않게 뜨거운 물로 데워요 (중탕)', { bg: rgba('#334155', 0.85), size: 12.5, pad: 10 });
  }

  /* ----- 장면: 페트리 접시에서 아이오딘 반응 ----- */
  function drawLeafDish() {
    const L = LX, t = CLK.t;
    ctx.fillStyle = lgrad(0, 0, 0, SH, [[0, '#f4f8f2'], [1, '#e3eee0']]); ctx.fillRect(0, 0, SW, SH);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 5; i++) ctx.fillRect(18 + i * 104, 0, 2, SH);
    // 페트리 접시
    const cx = 260, cy = 276;
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#f7fbff'; ctx.beginPath(); ctx.ellipse(cx, cy, 242, 132, 0, 0, TAU); ctx.fill(); }, { blur: 16, y: 8 });
    ctx.fillStyle = lgrad(0, cy - 132, 0, cy + 132, [[0, '#ffffff'], [1, '#e6eef7']]); ctx.beginPath(); ctx.ellipse(cx, cy, 242, 132, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#b6c6da'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, cy, 242, 132, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, 228, 120, 0, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
    ctx.restore();
    // 탈색된 잎
    drawLeaf(LF.x, LF.y, LF.len, LF.wid, 0, Object.assign(leafColors(1), { shadow: true }));
    // 아이오딘 번짐 (구역별)
    L.zones.forEach((z, i) => {
      if (z.ii <= 0.003) return;
      const starch = z.sv > 0.5;
      inLeafZone(i, () => {
        const r = z.ii * 150, mx = ZC[i], my = LF.y;
        let g = ctx.createRadialGradient(mx, my, 0, mx, my, Math.max(1, r));
        g.addColorStop(0, rgba(IOD, 0.95)); g.addColorStop(0.82, rgba(IOD, 0.9)); g.addColorStop(1, rgba(IOD, 0));
        ctx.fillStyle = g; ctx.fillRect(ZX[i][0], 0, ZX[i][1] - ZX[i][0], SH);
        if (starch) {
          const r2 = Math.max(1, r * 0.94), a = clamp((z.ii - 0.1) * 1.8, 0, 1);
          g = ctx.createRadialGradient(mx - 6, my - 6, 0, mx, my, r2);
          g.addColorStop(0, rgba('#2d3a96', a)); g.addColorStop(0.55, rgba(BLK, a)); g.addColorStop(0.9, rgba('#2a2f7a', a * 0.92)); g.addColorStop(1, rgba(BLK, 0));
          ctx.fillStyle = g; ctx.fillRect(ZX[i][0], 0, ZX[i][1] - ZX[i][0], SH);
        }
      });
    });
    // 은박지로 가렸던 부분 표시
    L.zones.forEach((z, i) => {
      if (!z.foil) return;
      ctx.save(); ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(71,85,105,.75)'; ctx.lineWidth = 2.2;
      D.roundRect(ZX[i][0] + 4, LF.y - LF.wid - 14, ZX[i][1] - ZX[i][0] - 8, LF.wid * 2 + 28, 8); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    });
    // 스포이트
    const showDr = L.stage === 2 || L.act === 'iodine';
    if (showDr) {
      const bob = Math.sin(t * 3) * (L.act ? 0 : 3);
      ironDropper(L.dx, 82 + bob);
      if (L.stage === 2 && !L.act) D.label(SW / 2, 40, '💧 아이오딘 용액을 잎에 떨어뜨려요', { bg: rgba('#16a34a', 0.95), size: 14, pad: 12 });
    }
    L.drops.forEach((d) => { if (d.delay > 0) return; ctx.fillStyle = rgba(IOD, 0.95); ctx.beginPath(); ctx.ellipse(d.x, d.y, 3.4, 5, 0, 0, TAU); ctx.fill(); });
    // 결과 이름표
    if (L.stage >= 3 || (L.act === 'iodine')) {
      L.zones.forEach((z, i) => {
        if (z.ii < 0.85) return;
        const s = z.sv > 0.5;
        D.label(ZC[i], LF.y + LF.wid + 36, s ? '청람색 · 녹말 있음' : '황갈색 · 녹말 없음', { bg: s ? rgba(BLK, 0.95) : rgba('#a8691a', 0.95), size: 13 });
      });
    } else {
      L.zones.forEach((z, i) => D.label(ZC[i], LF.y + LF.wid + 36, z.foil ? '가렸던 곳' : '빛 받은 곳', { bg: rgba('#64748b', 0.82), size: 12.5 }));
    }
  }

  function drawLeafScene() {
    const L = LX;
    const view = L.stage === 0 || L.act === 'light' ? 'sun' : (L.stage === 1 || L.act === 'decol') ? 'bath' : 'dish';
    if (view !== L.view) { L.view = view; L.fade = 1; }
    if (view === 'sun') drawLeafSun(); else if (view === 'bath') drawLeafBath(); else drawLeafDish();
    if (L.fade > 0.01) { ctx.fillStyle = 'rgba(255,255,255,' + (L.fade * 0.95).toFixed(3) + ')'; ctx.fillRect(0, 0, SW, SH); }
  }

  /* ----- 오른쪽 패널: 잎 세포 속 들여다보기 ----- */
  const CELLC = [[0.24, 0.34, 0.22], [0.66, 0.3, -0.2], [0.42, 0.7, 0.1], [0.78, 0.72, 0.3]];
  const GRN = [[0.1, 0.5], [0.34, 0.18], [0.55, 0.52], [0.86, 0.5], [0.58, 0.88], [0.2, 0.86], [0.9, 0.2], [0.44, 0.44], [0.72, 0.5], [0.28, 0.6]];
  function drawCell(x, y, w, h, z, titleTxt, titleCol) {
    const L = LX;
    ctx.save();
    const iiTint = z ? z.ii : 0;
    ctx.fillStyle = mix('#f1faea', '#ead9a8', iiTint * 0.8); D.roundRect(x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = '#7fb36a'; ctx.lineWidth = 3.5; D.roundRect(x, y, w, h, 14); ctx.stroke();
    D.label(x + 10, y + 16, titleTxt, { bg: titleCol, size: 12.5, align: 'left', pad: 8 });
    if (!z) { text(x + w / 2, y + h / 2 + 8, '이런 부분이 없어요', { size: 13, weight: 700, color: COL.muted }); ctx.restore(); return; }
    const cw = w - 20, ch = h - 44, ox = x + 10, oy = y + 34;
    CELLC.forEach((c) => {
      ctx.save(); ctx.globalAlpha = 1 - L.dec * 0.78;
      drawChloroplast(ox + c[0] * cw, oy + c[1] * ch, Math.min(22, cw * 0.1), Math.min(13, ch * 0.09), c[2], { light: false });
      ctx.restore();
    });
    const n = Math.round(GRN.length * z.sv);
    for (let k = 0; k < GRN.length; k++) {
      const a = clamp(z.sv * GRN.length - k, 0, 1); if (a <= 0) continue;
      const gx = ox + GRN[k][0] * cw, gy = oy + GRN[k][1] * ch, r = Math.min(7.2, cw * 0.034) * (0.55 + 0.45 * ease.outBack(a));
      ctx.globalAlpha = a; D.sphere(gx, gy, r, mix(STC, BLK, clamp(z.ii * 1.3, 0, 1)), { gloss: z.ii < 0.5 }); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function drawLeafPanel() {
    const p = LAY.pn, L = LX;
    panel(p.x, p.y, p.w, p.h, 14);
    const zl = L.zones.find((z) => !z.foil) || null, zf = L.zones.find((z) => z.foil) || null;
    const cap = L.stage === 0 && !L.act ? '빛을 받는 부분에서만 광합성이 일어나요. 가린 부분은 빛을 받지 못해요.'
      : L.act === 'light' ? '빛을 받은 세포의 엽록체에서 포도당이 만들어지고, 쓰고 남은 것은 녹말로 바뀌어 쌓여요.'
        : L.stage === 1 && !L.act ? '하루가 지났어요. 빛을 받은 부분에는 녹말 알갱이가 쌓였어요.'
          : L.act === 'decol' ? '에탄올이 엽록소를 녹여 내 잎이 탈색돼요.' : L.stage === 2 && !L.act ? '탈색했어요. 이제 아이오딘 용액으로 녹말이 있는지 확인해요.'
            : '녹말이 있는 곳은 아이오딘 용액과 만나 청람색으로 변해요.';
    if (!PHONE) {
      text(p.x + p.w / 2, p.y + 28, '🔍 잎 세포 속', { size: 17, weight: 800, color: '#14532d' });
      drawCell(p.x + 12, p.y + 46, p.w - 24, 150, zl, '빛을 받은 부분', rgba('#d97706', 0.95));
      drawCell(p.x + 12, p.y + 206, p.w - 24, 150, zf, '가린 부분', rgba('#64748b', 0.95));
      wrapText(p.x + p.w / 2, p.y + 410, cap, p.w - 28, { size: 13.5, weight: 700, color: COL.ink, lh: 17.5 });
    } else {
      text(p.x + p.w / 2, p.y + 22, '🔍 잎 세포 속', { size: 15, weight: 800, color: '#14532d' });
      drawCell(p.x + 8, p.y + 36, 202, 150, zl, '빛을 받은 부분', rgba('#d97706', 0.95));
      drawCell(p.x + 214, p.y + 36, 202, 150, zf, '가린 부분', rgba('#64748b', 0.95));
      wrapText(p.x + p.w / 2, p.y + 220, cap, p.w - 28, { size: 13.5, weight: 700, color: COL.ink, lh: 17.5 });
    }
  }
  const leafResultName = (z) => (LX.stage >= 3 ? (z.sv > 0.5 ? '청람색' : '황갈색') : '-');

  /* =========================================================
     장면 2: 식물 속 양분의 이동 모형 (낮: 잎에 녹말 / 밤: 설탕이 체관을 따라 이동)
     ========================================================= */
  const GY = 300;                                  // 땅 높이
  const XLX = 233, PHX = 269;                      // 물관·체관의 x
  const LVS = [
    { x: 251, y: 182, ang: -2.55, len: 124, wid: 40 },
    { x: 251, y: 152, ang: -0.55, len: 134, wid: 42 },
    { x: 251, y: 124, ang: -1.45, len: 74, wid: 28 },
  ];
  const FRUIT = { x: 368, y: 270, r: 27 };
  const leafPt = (i, f, off) => { const l = LVS[i], c = Math.cos(l.ang), s = Math.sin(l.ang); return [l.x + c * l.len * f - s * (off || 0), l.y + s * l.len * f + c * (off || 0)]; };
  const PH_ROOT = [[PHX, 192], [PHX, 300], [PHX, 372], [PHX - 4, 440]];
  const PH_FRUIT = [[PHX, 192], [PHX, 236], [292, 250], [326, 257], [FRUIT.x - FRUIT.r + 2, FRUIT.y - 4]];
  const XYL = new Path([[XLX - 4, 440], [XLX, 372], [XLX, 300], [XLX, 196], [XLX, 150]]);
  const PH_ROOT_P = new Path(PH_ROOT), PH_FRUIT_P = new Path(PH_FRUIT);
  const GRAINS = [];
  [[0, 0.3, -6], [0, 0.45, 8], [0, 0.6, -8], [0, 0.75, 4], [1, 0.3, 8], [1, 0.45, -8], [1, 0.6, 7], [1, 0.75, -6], [1, 0.88, 3], [2, 0.5, 4], [2, 0.7, -4], [0, 0.88, -2], [1, 0.2, -3], [0, 0.2, 4], [2, 0.3, -3], [2, 0.85, 2]]
    .forEach((g) => GRAINS.push(g));
  const ROOT_G = [[246, 330], [262, 352], [244, 376], [264, 398], [250, 420], [268, 330], [240, 346], [258, 384]];
  const PL = {
    day: 1, dv: 1, ls: 0.12, fruit: 0, root: 0, rootS: 0, fruitS: 0,
    sent: { root: 0, fruit: 0 }, nWater: new Streams(60), nSug: new Streams(70), nGlu: new Streams(40),
    accW: 0, accS: 0, accG: 0, alt: 0, seen: false, hintT: 0, nightSeen: false, daySeen: true,
    pk: { x: PHX, y: 192, sx: new SciSim.Spring(PHX, { stiffness: 260, damping: 20 }), sy: new SciSim.Spring(192, { stiffness: 260, damping: 20 }), drag: false, shake: 0, lift: 0, route: null, d: 0, msg: '', msgT: 0, pop: 0 },
  };
  function setDay(on) {
    if ((PL.day === 1) === !!on) return;
    PL.day = on ? 1 : 0; PL.nightSeen = PL.nightSeen || !on; Sound.click();
    if (PL.pk.drag) { PL.pk.drag = false; }
    PL.nSug.clear();
    syncPlantUI(); refreshReadouts();
  }
  function plantReset() {
    PL.ls = 0.1; PL.fruit = 0; PL.root = 0; PL.sent.root = PL.sent.fruit = 0; PL.nSug.clear(); PL.nWater.clear(); PL.nGlu.clear();
    PL.day = 1; PL.pk.drag = false; syncPlantUI();
  }
  function routeFor(leafI, dest) {
    const f = leafI === 0 ? 0.62 : 0.55, a = leafPt(leafI, f, 0), b = leafPt(leafI, f * 0.4, 0);
    const pre = leafI === 0 ? [a, [236, 176], [262, 188]] : [a, b, [279, 168], [PHX + 2, 186]];
    const post = dest === 'root' ? PH_ROOT.slice(1) : PH_FRUIT.slice(1);
    return new Path(pre.concat(post));
  }
  function arrive(dest, byUser) {
    if (dest === 'root') { PL.root = Math.min(1, PL.root + (byUser ? 0.1 : 0.04)); FX.burst(PHX - 4, 430, { count: 5, colors: ['#f59e0b', '#fbbf24'], speed: 60, life: 0.5, size: 3, gravity: 60 }); }
    else { PL.fruit = Math.min(1, PL.fruit + (byUser ? 0.1 : 0.04)); FX.burst(FRUIT.x - 10, FRUIT.y, { count: 5, colors: ['#f59e0b', '#fbbf24'], speed: 60, life: 0.5, size: 3, gravity: 60 }); }
  }
  function updatePlant(dt) {
    const P = PL;
    P.dv = approach(P.dv, P.day, dt, RM ? 60 : 2.6);
    const dayV = P.dv;
    // 낮: 광합성 → 잎에 녹말이 쌓여요
    if (P.day === 1) {
      const prev = P.ls; P.ls = Math.min(1, P.ls + dt * 0.14);
      P.accG += dt * 2.2;
      while (P.accG >= 1 && !RM) { P.accG -= 1; const k = GRAINS[Math.floor(rand(0, GRAINS.length))], q = leafPt(k[0], k[1], k[2]); P.nGlu.add(new Path([[q[0], q[1]], [q[0] + rand(-8, 8), q[1] - 26]]), 'glucose', 24, { u: 2.1, fade: 6, jig: 1 }); }
      if (Math.floor(prev * 16) < Math.floor(P.ls * 16)) { const k = GRAINS[Math.min(15, Math.floor(P.ls * 16))], q = leafPt(k[0], k[1], k[2]); FX.burst(q[0], q[1], { count: 4, colors: ['#c4b5fd', '#a78bfa'], speed: 30, life: 0.4, size: 2.2, gravity: 0 }); }
    } else {
      // 밤: 잎의 녹말 → 설탕 → 체관
      P.accS += dt * (P.ls > 0.02 ? 1.5 : 0);
      while (P.accS >= 1) {
        P.accS -= 1; P.ls = Math.max(0, P.ls - 0.022);
        P.alt++;
        const dest = P.alt % 9 < 5 ? 'root' : 'fruit', li = P.alt % 2;
        const p = P.nSug.add(routeFor(li, dest), 'sucrose', 74, { u: 3.5, fade: 12, jig: 1.2 });
        if (p) p.onEnd = () => arrive(dest, false);
      }
    }
    P.nGlu.update(dt); P.nSug.update(dt);
    // 물관: 물이 뿌리에서 잎으로 (밤에는 느려요)
    P.accW += dt * (P.day === 1 ? 2.6 : 1.0);
    while (P.accW >= 1) {
      P.accW -= 1;
      const li = Math.random() < 0.55 ? 0 : 1, tip = leafPt(li, 0.5, 0);
      const pth = new Path([[XLX - 4 + rand(-2, 2), 440], [XLX, 372], [XLX, 300], [XLX, 200], li ? [250, 168] : [236, 176], [tip[0], tip[1]]]);
      P.nWater.add(pth, 'h2o', 58, { u: 3.0, fade: 12, jig: 0.6 });
    }
    P.nWater.update(dt);
    P.rootS = approach(P.rootS, P.root, dt, 5); P.fruitS = approach(P.fruitS, P.fruit, dt, 5);
    // 끌어 옮기는 설탕 꾸러미
    const k = P.pk;
    k.sx.update(dt); k.sy.update(dt);
    k.lift = approach(k.lift, k.drag ? 1 : 0, dt, 14);
    k.shake = Math.max(0, k.shake - dt); k.msgT = Math.max(0, k.msgT - dt); k.pop = Math.min(1, k.pop + dt * 3);
    if (!k.drag) { k.sx.target = PHX; k.sy.target = 192; }
  }
  function pkPos() { const k = PL.pk; return k.drag ? { x: k.x, y: k.y } : { x: k.sx.value, y: k.sy.value }; }
  function pkMsg(m) { PL.pk.msg = m; PL.pk.msgT = 1.8; }
  function pkDown(q) {
    const k = PL.pk;
    if (PL.day === 1 || PL.dv > 0.35) { if (Math.hypot(q.x - PHX, q.y - 192) < 40 && PL.day === 1) hint('설탕은 밤에 이동해요. 🌙 밤으로 바꿔 보세요.', 2800); return false; }
    const p = pkPos();
    if (Math.hypot(q.x - p.x, q.y - p.y) > 40) return false;
    k.drag = true; k.route = null; k.d = 0; k.x = p.x; k.y = p.y; k.sx.value = p.x; k.sy.value = p.y; k.sx.velocity = k.sy.velocity = 0;
    return true;
  }
  function pkMove(q) {
    const k = PL.pk; if (!k.drag) return;
    const nr = PH_ROOT_P.nearest(q.x, q.y), nf = PH_FRUIT_P.nearest(q.x, q.y);
    const best = nr.dist <= nf.dist ? nr : nf, route = nr.dist <= nf.dist ? 'root' : 'fruit';
    const xd = XYL.nearest(q.x, q.y).dist;
    if (best.dist > 78) { k.drag = false; k.shake = 0.45; pkMsg('체관을 따라 끌어 주세요'); return; }   // 너무 벗어나면 놓쳐요
    if (xd < best.dist && xd < 26 && q.y > 196) { if (k.msgT <= 0) { pkMsg('여긴 물관이에요! 물이 올라가는 길이에요'); k.shake = 0.4; } return; }
    if (best.dist <= 30) { k.x = best.x; k.y = best.y; k.route = route; k.d = best.d; }
  }
  function pkUp() {
    const k = PL.pk; if (!k.drag) return;
    k.drag = false;
    const done = k.route && k.d >= (k.route === 'root' ? PH_ROOT_P.len : PH_FRUIT_P.len) - 22;
    if (done) {
      const dest = k.route;
      PL.sent[dest]++; arrive(dest, true);
      celebrate(dest === 'root' ? PHX - 4 : FRUIT.x - 12, dest === 'root' ? 430 : FRUIT.y - 6);
      pkMsg(dest === 'root' ? '뿌리에 도착! 뿌리에 저장돼요' : '열매에 도착! 열매에 저장돼요');
      k.sx.value = PHX; k.sy.value = 192; k.sx.target = PHX; k.sy.target = 192; k.pop = 0;
      refreshReadouts();
    } else {
      k.sx.value = k.x; k.sy.value = k.y; k.sx.target = PHX; k.sy.target = 192; k.shake = k.d > 30 ? 0.3 : 0;
      if (k.d > 30) pkMsg('끝까지 끌어서 뿌리나 열매에 놓아 주세요');
    }
  }

  /* ----- 그리기 ----- */
  function pipePath(c, pts, w) { c.beginPath(); pts.forEach((q, i) => c[i ? 'lineTo' : 'moveTo'](q[0], q[1])); c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; }
  function drawPlantScene() {
    const P = PL, t = CLK.t, dayV = smooth(P.dv);
    skyRect(0, 0, SW, GY, dayV);
    drawSun(64, 62, 24, clamp(P.dv * 1.1, 0, 1));
    drawMoon(64, 62, 21, clamp(1 - P.dv * 1.5, 0, 1));
    cloud(370, 56, 0.8, 0.85 * dayV); cloud(450, 98, 0.5, 0.7 * dayV);
    // 땅
    ctx.fillStyle = lgrad(0, GY, 0, SH, [[0, mix('#3a2a1c', '#a97c52', dayV * 0.9 + 0.1)], [1, mix('#241a12', '#7a5636', dayV * 0.9 + 0.1)]]); ctx.fillRect(0, GY, SW, SH - GY);
    ctx.fillStyle = mix('#14291f', '#5cb35a', dayV); ctx.fillRect(0, GY - 4, SW, 12);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 26; i++) { circle(ctx, (i * 71) % SW, GY + 22 + ((i * 53) % 150), 2 + (i % 3)); ctx.fill(); }
    // 곁뿌리
    ctx.strokeStyle = mix('#7a5a3a', '#e3c79c', 0.5 + dayV * 0.2); ctx.lineWidth = 9; ctx.lineCap = 'round';
    [[[245, 340], [190, 360], [150, 400]], [[245, 380], [200, 400], [172, 446]], [[262, 350], [320, 366], [356, 410]], [[258, 400], [300, 420], [330, 460]]].forEach((s) => { ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); ctx.quadraticCurveTo(s[1][0], s[1][1], s[2][0], s[2][1]); ctx.stroke(); });
    // 원뿌리 (저장되면 통통해져요)
    const rw = 62 + 18 * P.rootS;
    ctx.save();
    D.shadow(() => { ctx.fillStyle = lgrad(251 - rw / 2, 0, 251 + rw / 2, 0, [[0, '#d9b887'], [0.5, '#f0d9b0'], [1, '#cfa971']]); ctx.beginPath(); ctx.moveTo(251 - 36, GY); ctx.lineTo(251 + 36, GY); ctx.lineTo(251 + rw / 2, 380); ctx.quadraticCurveTo(251 + rw / 2 - 2, 452, 251, 458); ctx.quadraticCurveTo(251 - rw / 2 + 2, 452, 251 - rw / 2, 380); ctx.closePath(); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.restore();
    for (let k = 0; k < ROOT_G.length; k++) { const a = clamp(P.rootS * ROOT_G.length - k, 0, 1); if (a <= 0) continue; ctx.globalAlpha = a; D.sphere(ROOT_G[k][0] + (k % 2 ? 8 : -8), ROOT_G[k][1] + 4, 4.4, STC, { gloss: false }); ctx.globalAlpha = 1; }
    // 줄기 (속이 보이는 단면)
    ctx.save();
    D.shadow(() => { ctx.fillStyle = lgrad(215, 0, 287, 0, [[0, '#76bd68'], [0.5, '#a9dd8f'], [1, '#6cb35f']]); D.roundRect(215, 108, 72, GY - 108 + 6, 14); ctx.fill(); }, { blur: 10, y: 4 });
    ctx.fillStyle = 'rgba(255,255,255,.18)'; D.roundRect(222, 116, 58, GY - 120, 10); ctx.fill();
    ctx.restore();
    // 열매 가지 (체관이 가지로 이어져요)
    ctx.save();
    ctx.strokeStyle = '#6fb460'; pipePath(ctx, PH_FRUIT.slice(1), 22); ctx.stroke();
    ctx.restore();
    // 물관(파랑) · 체관(주황)
    const pipe = (pts, col, w, glowA) => {
      ctx.save();
      pipePath(ctx, pts, w + 4); ctx.strokeStyle = rgba(col, 0.55); ctx.stroke();
      pipePath(ctx, pts, w); ctx.strokeStyle = rgba(mix('#ffffff', col, 0.5), 0.95); ctx.stroke();
      if (glowA > 0) { pipePath(ctx, pts, w * 0.5); ctx.strokeStyle = rgba('#ffffff', glowA); ctx.stroke(); }
      ctx.restore();
    };
    pipe([[XLX - 4, 440], [XLX, 372], [XLX, 300], [XLX, 130]], '#3b9bea', 12, 0.35);
    pipe([[PHX - 4, 440], [PHX, 372], [PHX, 300], [PHX, 160]], '#f59e0b', 12, 0.35);
    pipe(PH_FRUIT.slice(1), '#f59e0b', 7, 0.3);
    // 열매 (토마토)
    ctx.save();
    ctx.translate(FRUIT.x, FRUIT.y); const fs = 1 + 0.14 * P.fruitS; ctx.scale(fs, fs);
    D.sphere(0, 0, FRUIT.r, '#e5483d', { shadow: true, light: '#ffb4a8', dark: '#9d1c14' });
    ctx.fillStyle = '#3f9c4a'; for (let i = 0; i < 5; i++) { const a = -1.57 + (i - 2) * 0.55; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 8, -FRUIT.r + 3 + Math.sin(a) * 4 + 4, 9, 3.4, a, 0, TAU); ctx.fill(); }
    ctx.restore();
    for (let k = 0; k < 8; k++) { const a = clamp(P.fruitS * 8 - k, 0, 1); if (a <= 0) continue; ctx.globalAlpha = a; D.sphere(FRUIT.x + Math.cos(k * 2.4) * 11, FRUIT.y + Math.sin(k * 2.4) * 11 + 2, 3.4, SUCR, { gloss: false }); ctx.globalAlpha = 1; }
    // 잎
    const lc = leafColors(0);
    LVS.forEach((l, i) => {
      drawLeaf(l.x, l.y, l.len, l.wid, l.ang + Math.sin(t * 0.8 + i) * 0.015, { c1: mix('#7edb73', '#2c6a4a', (1 - dayV) * 0.5), c2: mix('#3fae4b', '#1d5a3c', (1 - dayV) * 0.5), c3: mix('#2b8a3e', '#154530', (1 - dayV) * 0.5) });
    });
    // 잎 속 녹말 알갱이
    const n = P.ls * GRAINS.length;
    for (let k = 0; k < GRAINS.length; k++) {
      const a = clamp(n - k, 0, 1); if (a <= 0) continue;
      const g = GRAINS[k], q = leafPt(g[0], g[1], g[2]);
      ctx.globalAlpha = Math.min(1, a * 1.2); D.sphere(q[0], q[1], 4.6 * (0.55 + 0.45 * ease.outBack(a)), STC, { shadow: false }); ctx.globalAlpha = 1;
    }
    P.nGlu.draw(); P.nWater.draw(); P.nSug.draw();
    // 설탕 꾸러미
    const kk = P.pk, ka = clamp(1 - P.dv * 1.6, 0, 1);
    if (ka > 0.02) {
      const pp = pkPos(), shk = kk.shake > 0 ? Math.sin(kk.shake * 70) * 4 * (kk.shake / 0.4) : 0;
      ctx.save(); ctx.globalAlpha = ka; ctx.translate(pp.x + shk, pp.y - kk.lift * 3);
      const sc = (1 + 0.18 * kk.lift) * (0.7 + 0.3 * ease.outBack(Math.min(1, kk.pop))) * (1 + 0.04 * Math.sin(t * 5));
      ctx.scale(sc, sc);
      D.glow(0, 0, 36, '#ffc247', 0.55);
      D.sphere(0, 0, 17, '#ffd37a', { shadow: true, light: '#fff3d0', dark: '#e08a00' });
      ctx.restore();
      drawMol('sucrose', pp.x + shk, pp.y - kk.lift * 3, 2.7 * sc, 0, ka);
      if (!kk.drag && P.day === 0 && P.dv < 0.2 && P.sent.root + P.sent.fruit === 0) D.label(PHX + 66, 190, '👆 설탕을 체관으로 끌어요', { bg: rgba('#16a34a', 0.95), size: 12.5, pad: 9 });
    }
    // 목적지 표시 (끄는 중에만)
    if (kk.drag) {
      D.ring(PHX - 4, 440, 22, t, { color: '#16a34a' });
      D.ring(FRUIT.x - 12, FRUIT.y, 24, t, { color: '#16a34a' });
    }
    // 이름표
    D.label(XLX - 62, 360, '물관 (물 ↑)', { bg: rgba('#2b7fd0', 0.95), size: 13.5 });
    D.label(PHX + 66, 360, '체관 (양분)', { bg: rgba('#d97706', 0.95), size: 13.5 });
    D.label(116, 114, '잎', { bg: rgba('#15803d', 0.92), size: 13 });
    D.label(FRUIT.x + 6, FRUIT.y + 46, '열매', { bg: rgba('#c2362e', 0.92), size: 13 });
    D.label(96, 424, '뿌리', { bg: rgba('#8a5a2b', 0.92), size: 13 });
    // 상황 말풍선
    const day = P.day === 1;
    D.label(SW / 2 + 30, 26, day ? '☀️ 낮: 광합성 → 잎에 녹말이 쌓여요' : '🌙 밤: 녹말 → 설탕 → 체관으로 이동', { bg: rgba(day ? '#15803d' : '#4338ca', 0.95), size: 14, pad: 12 });
    if (kk.msgT > 0) D.label(SW / 2, 466, kk.msg, { bg: rgba(kk.msg.indexOf('물관') >= 0 || kk.msg.indexOf('주세요') >= 0 ? '#c2410c' : '#15803d', 0.96), size: 14, pad: 12 });
    // 범례
    legendItem(430, 404, 'glucose', '포도당', { u: 2.8, size: 12, gap: 20 });
    legendItem(430, 428, 'starch', '녹말', { u: 2.8, size: 12, gap: 20 });
    legendItem(430, 452, 'sucrose', '설탕', { u: 2.6, size: 12, gap: 20 });
  }
  function drawPlantPanel() {
    const p = LAY.pn, P = PL;
    panel(p.x, p.y, p.w, p.h, 14);
    const bars = [['🍃 잎의 녹말', P.ls, STC], ['🍅 열매의 저장량', P.fruit, '#e5483d'], ['🌱 뿌리의 저장량', P.root, '#b98450']];
    const bar = (x, y, w, v, col, label, val) => {
      text(x, y - 8, label, { size: 14, weight: 800, align: 'left', color: COL.ink });
      text(x + w, y - 8, val, { size: 13.5, weight: 800, align: 'right', color: col });
      ctx.fillStyle = '#e8eef5'; D.roundRect(x, y, w, 20, 10); ctx.fill();
      if (v > 0.004) { ctx.fillStyle = col; D.roundRect(x, y, Math.max(4, w * clamp(v, 0, 1)), 20, 10); ctx.fill(); }
    };
    if (!PHONE) {
      text(p.x + p.w / 2, p.y + 28, '양분이 쌓인 정도 (대략)', { size: 16, weight: 800, color: '#14532d' });
      bars.forEach((b, i) => bar(p.x + 16, p.y + 78 + i * 58, p.w - 32, b[1], b[2], b[0], Math.round(b[1] * 100) + ' %'));
      const day = P.day === 1;
      D.label(p.x + p.w / 2, p.y + 266, day ? '☀️ 낮' : '🌙 밤', { bg: rgba(day ? '#d97706' : '#4338ca', 0.95), size: 15, pad: 14 });
      const lines = day ? ['잎에서 광합성으로 포도당이 만들어지고, 쓰고 남은 것은 녹말로 바뀌어 잎에 쌓여요.', '물관은 물을 위로 올려 보내요.'] : ['잎의 녹말이 물에 잘 녹는 설탕으로 바뀌어 체관을 따라 뿌리와 열매로 이동해요.', '체관은 양분이 이동하는 통로예요.'];
      wrapText(p.x + p.w / 2, p.y + 330, lines[0], p.w - 28, { size: 13.5, weight: 700, color: COL.ink, lh: 17.5 });
      wrapText(p.x + p.w / 2, p.y + 416, lines[1], p.w - 28, { size: 13.5, weight: 700, color: COL.muted, lh: 17.5 });
    } else {
      text(p.x + p.w / 2, p.y + 22, '양분이 쌓인 정도 (대략)', { size: 15, weight: 800, color: '#14532d' });
      bars.forEach((b, i) => bar(p.x + 14, p.y + 62 + i * 44, p.w - 28, b[1], b[2], b[0], Math.round(b[1] * 100) + ' %'));
      const day = P.day === 1;
      wrapText(p.x + p.w / 2, p.y + 218, day ? '낮: 광합성으로 만든 포도당이 녹말로 바뀌어 잎에 쌓여요.' : '밤: 녹말이 설탕으로 바뀌어 체관을 따라 뿌리·열매로 이동해요.', p.w - 28, { size: 13.5, weight: 700, color: COL.ink, lh: 17.5 });
    }
  }

  /* =========================================================
     장면 3: 저장 물질 검출 (아이오딘 반응 · 베네딕트 반응)
     ========================================================= */
  const SAMP = [
    { id: 'potato', emoji: '🥔', name: '감자', organ: '줄기', juice: '#efe8d2', iod: true, ben: false, what: '녹말' },
    { id: 'grape', emoji: '🍇', name: '포도', organ: '열매', juice: '#e6ecae', iod: false, ben: true, what: '포도당' },
    { id: 'rice', emoji: '🍚', name: '쌀', organ: '씨', juice: '#f3f0e4', iod: true, ben: false, what: '녹말' },
    { id: 'bean', emoji: '🫘', name: '콩', organ: '씨', juice: '#efe3b8', iod: false, ben: false, what: '단백질·지방' },
  ];
  const BLUE = '#3d86dc', AMB = '#d2972f';
  const LDU = { iod: 3.6, ben: 7.4 };
  const LAB = {
    sel: 0, act: null, t: 0, jPrev: SAMP[0].juice, swap: 1, show: { kind: null, pos: false, p: 0, a: 0 }, bath: 0, burner: 0, drops: [], dropped: 0, dyA: 0,
    res: {}, bubT: 0, tap: true, prec: [], shake: 0,
  };
  SAMP.forEach((s) => { LAB.res[s.id] = { iod: null, ben: null }; });
  const labTested = (id, k) => LAB.res[id][k] != null;
  function labReset() { SAMP.forEach((s) => { LAB.res[s.id] = { iod: null, ben: null }; }); LAB.act = null; LAB.show = { kind: null, pos: false, p: 0, a: 0 }; LAB.drops.length = 0; LAB.tap = true; syncTestUI(); }
  function labSelect(i) {
    if (LAB.act || i === LAB.sel) return;
    LAB.jPrev = SAMP[LAB.sel].juice; LAB.swap = 0; LAB.sel = i; LAB.show = { kind: null, pos: false, p: 0, a: 0 };
    Sound.click(); syncTestUI(); refreshReadouts();
  }
  function labTest(kind) {
    if (LAB.act) return false;
    const s = SAMP[LAB.sel];
    LAB.act = kind; LAB.t = 0; LAB.dropped = 0; LAB.drops.length = 0; LAB.tap = false; LAB.prec.length = 0;
    LAB.show = { kind, pos: kind === 'iod' ? s.iod : s.ben, p: 0, a: 0 };
    Sound.click(); syncTestUI(); refreshReadouts();
    return true;
  }
  const TUBE = { x: 260, y: 168, w: 70, h: 236 };
  const liqTop = () => TUBE.y + TUBE.h * (1 - 0.6);
  function updateLab(dt) {
    const L = LAB, s = SAMP[L.sel];
    L.swap = Math.min(1, L.swap + dt * 3.2);
    L.shake = Math.max(0, L.shake - dt);
    if (L.act) {
      L.t = Math.min(1, L.t + dt / LDU[L.act]);
      const sh = L.show, t = L.t;
      if (L.act === 'iod') {
        sh.p = smooth(seg(t, 0.28, 0.92));
        L.dyA = approach(L.dyA, t < 0.45 ? 1 : 0, dt, 9);
        const due = Math.floor(seg(t, 0.14, 0.4) * 4.0 + 0.0001);
        while (L.dropped < Math.min(due, 4)) { L.dropped++; L.drops.push({ x: TUBE.x + rand(-4, 4), y: 136, vy: 50, delay: 0, col: IOD }); }
      } else {
        sh.a = smooth(seg(t, 0.06, 0.26));
        sh.p = smooth(seg(t, 0.42, 0.9));
        L.dyA = approach(L.dyA, t < 0.3 ? 1 : 0, dt, 9);
        const due = Math.floor(seg(t, 0.04, 0.22) * 4.0 + 0.0001);
        while (L.dropped < Math.min(due, 4)) { L.dropped++; L.drops.push({ x: TUBE.x + rand(-4, 4), y: 136, vy: 50, delay: 0, col: BLUE }); }
        L.bath = approach(L.bath, t > 0.28 && t < 0.94 ? 1 : 0, dt, 7);
        L.burner = approach(L.burner, t > 0.32 && t < 0.92 ? 1 : 0, dt, 6);
        if (sh.pos && sh.p > 0.55 && !RM && Math.random() < dt * 14) L.prec.push({ x: TUBE.x + rand(-22, 22), y: TUBE.y + TUBE.h - 18 - rand(0, 6), a: 0, r: rand(1.6, 2.8) });
        L.bubT -= dt;
        if (L.bubT <= 0 && !RM) { L.bubT = 0.09; FX.emit({ x: TUBE.x + rand(-60, 60), y: rand(360, 392), vx: rand(-5, 5), vy: -rand(36, 60), life: rand(0.8, 1.3), size: rand(2.2, 4), color: 'rgba(255,255,255,.95)', shape: 'bubble' }); }
      }
      if (L.t >= 1) {
        const k = L.act, pos = sh.pos; L.act = null; L.res[s.id][k] = pos;
        sh.p = 1; sh.a = 1;
        FX.burst(TUBE.x, 150, { count: 14, speed: 120, life: 0.8, size: 3.4 });
        Sound.success(); syncTestUI(); refreshReadouts();
      }
    } else {
      L.dyA = approach(L.dyA, 0, dt, 9);
      L.bath = approach(L.bath, 0, dt, 7); L.burner = approach(L.burner, 0, dt, 6);
    }
    for (let i = L.drops.length - 1; i >= 0; i--) {
      const d = L.drops[i];
      d.vy += 700 * dt; d.y += d.vy * dt;
      if (d.y >= liqTop()) { FX.burst(d.x, liqTop(), { count: 5, colors: [d.col], speed: 50, life: 0.4, size: 2.2, gravity: 200 }); L.drops.splice(i, 1); }
    }
    L.prec.forEach((q) => { q.a = Math.min(1, q.a + dt * 2); });
  }
  const IODC = (j, p, pos) => { const c1 = mix(j, AMB, clamp(p * 2.2, 0, 1)); return pos ? mix(c1, '#1a2064', clamp(p * 2 - 0.5, 0, 1)) : c1; };
  function benC(j, p, pos, a) {
    const c0 = mix(j, BLUE, clamp(a, 0, 1));
    if (a < 1 && p <= 0) return c0;
    if (!pos) return mix(c0, '#4b9be6', p * 0.35);
    if (p < 0.33) return mix(c0, '#46a84b', p / 0.33);
    if (p < 0.66) return mix('#46a84b', '#eaa42a', (p - 0.33) / 0.33);
    return mix('#eaa42a', '#c6431b', (p - 0.66) / 0.34);
  }
  function labColors() {
    const L = LAB, s = SAMP[L.sel], sh = L.show;
    const j = mix(L.jPrev, s.juice, L.swap);
    if (!sh.kind) return { top: j, bot: j, p: 1 };
    if (sh.kind === 'iod') return { top: IODC(j, sh.p, sh.pos), bot: IODC(j, 0, sh.pos), p: sh.p };
    const c = benC(j, sh.p, sh.pos, sh.a);
    return { top: c, bot: c, p: 1 };
  }
  function bottleDraw(x, y, w, h, col, name, active, glassCol) {
    const t = CLK.t;
    ctx.save(); ctx.translate(x, y);
    const pulse = active ? 1 + 0.03 * Math.sin(t * 6) : 1; ctx.scale(pulse, pulse);
    contactShadow(0, h + 3, w * 0.62, 7, 0.8);
    ctx.beginPath(); ctx.moveTo(-w / 2 + 6, h); ctx.lineTo(-w / 2, h - 8); ctx.lineTo(-w / 2, 30); ctx.quadraticCurveTo(-w / 2, 16, -w * 0.18, 10); ctx.lineTo(-w * 0.18, 0); ctx.lineTo(w * 0.18, 0); ctx.lineTo(w * 0.18, 10); ctx.quadraticCurveTo(w / 2, 16, w / 2, 30); ctx.lineTo(w / 2, h - 8); ctx.lineTo(w / 2 - 6, h); ctx.closePath();
    ctx.fillStyle = lgrad(-w / 2, 0, w / 2, 0, [[0, shade(col, 0.15)], [0.35, col], [1, shade(col, -0.35)]]); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = glassCol || 'rgba(255,255,255,.55)'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-w / 2 + 8, 34, 5, h - 54);
    ctx.fillStyle = '#2b3446'; D.roundRect(-w * 0.2, -10, w * 0.4, 14, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.92)'; D.roundRect(-w / 2 + 4, h * 0.46, w - 8, h * 0.32, 6); ctx.fill();
    ctx.restore();
    text(x, y + h * 0.46 + h * 0.32 / 2 + 5, name, { size: 12, weight: 800, color: '#1b2333' });
  }
  function drawLabTube() {
    const L = LAB, T = TUBE, t = CLK.t, cc = labColors();
    const x = T.x, y = T.y, w = T.w, h = T.h, top = liqTop();
    // 시험관 받침
    const rackA = 1 - L.bath;
    if (rackA > 0.02) {
      ctx.save(); ctx.globalAlpha = rackA;
      ctx.fillStyle = lgrad(0, 394, 0, 430, [[0, '#c9a572'], [1, '#a98456']]); D.roundRect(x - 62, 394, 124, 34, 8); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x - 56, 396, 112, 3);
      ctx.restore();
    }
    contactShadow(x, 432, 66, 8, 0.7);
    ctx.save();
    ctx.translate(x, y); if (L.shake > 0) ctx.translate(Math.sin(L.shake * 60) * 3, 0); ctx.translate(-x, -y);
    ctx.save();
    tubePath(ctx, x, y, w, h); ctx.closePath(); ctx.clip();
    const b = clamp(cc.p, 0.02, 1), g = lgrad(0, top, 0, y + h, [[0, cc.top], [Math.min(0.98, b * 1.1), cc.top], [Math.min(1, b * 1.1 + 0.2), cc.bot], [1, cc.bot]]);
    ctx.fillStyle = g; ctx.fillRect(x - w, top, w * 2, h);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x - w / 2, top - 1, w, 3);
    // 소용돌이
    if (L.act === 'iod' && L.show.p > 0.02 && L.show.p < 0.98) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + Math.sin(t * 3 + k * 2) * 10, top + 20 + k * 36 + L.show.p * 70, 6 + k, 0, TAU); ctx.stroke(); } }
    // 침전 (양성 베네딕트: 황적색 앙금)
    L.prec.forEach((q) => { ctx.globalAlpha = q.a * 0.9; ctx.fillStyle = '#b53b17'; circle(ctx, q.x, q.y, q.r); ctx.fill(); }); ctx.globalAlpha = 1;
    if (L.show.kind === 'ben' && L.show.pos && L.show.p >= 1 && !L.act) { ctx.fillStyle = 'rgba(181,59,23,.55)'; ctx.fillRect(x - w / 2, y + h - 16, w, 16); }
    ctx.restore();
    ctx.save(); tubePath(ctx, x, y, w, h); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, y + 16); ctx.lineTo(x - w / 2 + 6, y + h - 30); ctx.stroke();
    ctx.restore();
    ctx.restore();
    // 중탕 비커 (물이 시험관 아래쪽을 감싸요)
    if (L.bath > 0.02) {
      ctx.save(); ctx.globalAlpha = L.bath;
      const bx = x - 82, by = 250, bw = 164, bh = 156;
      ctx.fillStyle = lgrad(0, by + 20, 0, by + bh, [[0, 'rgba(142,203,255,.16)'], [1, 'rgba(110,180,240,.3)']]); D.roundRect(bx + 3, by + 22, bw - 6, bh - 24, 10); ctx.fill();
      D.beaker(bx, by, bw, bh, { level: 0, t });
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx + 8, by + 22, bw - 16, 3);
      ctx.restore();
      ctx.fillStyle = lgrad(0, 410, 0, 440, [[0, '#cfe3f5'], [1, '#9cb8d2']]); D.roundRect(x - 38, 416, 76, 26, 10); ctx.fill();
      ctx.fillStyle = '#6b778c'; D.roundRect(x - 8, 408, 16, 10, 3); ctx.fill();
      D.flame(x, 408, 30 * L.burner, t);
      D.label(x + 118, 296, '뜨거운 물', { bg: rgba('#2563eb', 0.92), size: 12.5 });
    }
  }
  function drawLabScene() {
    const L = LAB, t = CLK.t, s = SAMP[L.sel];
    ctx.fillStyle = lgrad(0, 0, 0, SH, [[0, '#f4f8f2'], [1, '#e3eee0']]); ctx.fillRect(0, 0, SW, SH);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 5; i++) ctx.fillRect(18 + i * 104, 0, 2, 420);
    ctx.fillStyle = lgrad(0, 440, 0, SH, [[0, '#d9bd8e'], [1, '#b99668']]); ctx.fillRect(0, 440, SW, SH - 440);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(0, 442, SW, 3);
    // 시약병
    bottleDraw(88, 340, 74, 100, '#b96d12', '아이오딘', !L.act && L.tap, '#e4b16a');
    bottleDraw(432, 340, 74, 100, '#2f6fc9', '베네딕트', !L.act && L.tap, '#9cc4f2');
    text(88, 466, '아이오딘 용액', { size: 12.5, weight: 800, color: '#7a4a0c' });
    text(432, 466, '베네딕트 용액', { size: 12.5, weight: 800, color: '#1d4e96' });
    drawLabTube();
    // 시료 카드
    panel(16, 16, 138, 104, 16, 'rgba(255,255,255,.95)');
    text(85, 36, '검사할 시료', { size: 12.5, weight: 800, color: COL.muted });
    const pop = 1 + 0.18 * Math.max(0, 1 - L.swap * 1.4);
    ctx.save(); ctx.translate(85, 72); ctx.scale(pop, pop); text(0, 12, s.emoji, { size: 40, weight: 400 }); ctx.restore();
    text(85, 108, s.name + ' (' + s.organ + ')', { size: 14, weight: 800, color: COL.ink });
    // 스포이트
    if (L.dyA > 0.02) {
      ctx.save(); ctx.globalAlpha = Math.min(1, L.dyA * 1.4);
      dropperAt(TUBE.x, 62 - (1 - L.dyA) * 30, { col: L.act === 'ben' ? BLUE : IOD });
      ctx.restore();
    }
    L.drops.forEach((d) => { ctx.fillStyle = rgba(d.col, 0.95); ctx.beginPath(); ctx.ellipse(d.x, d.y, 3.4, 5, 0, 0, TAU); ctx.fill(); });
    // 결과 말풍선
    if (!L.act && L.show.kind) {
      const k = L.show.kind, pos = L.show.pos;
      const msg = k === 'iod' ? (pos ? '청람색 → 녹말이 있어요' : '황갈색(변화 없음) → 녹말이 없어요') : (pos ? '황적색 → 포도당(당)이 있어요' : '푸른색(변화 없음) → 당이 없어요');
      const bg = k === 'iod' ? (pos ? BLK : '#a8691a') : (pos ? '#b53b17' : '#2f6fc9');
      D.label(TUBE.x, 138, msg, { bg: rgba(bg, 0.96), size: 14, pad: 12 });
    } else if (L.act === 'iod') D.label(TUBE.x, 24, '아이오딘 용액을 떨어뜨려요', { bg: rgba('#0f172a', 0.78), size: 13.5, pad: 11 });
    else if (L.act === 'ben') D.label(TUBE.x, 24, L.t < 0.3 ? '베네딕트 용액을 넣어요' : '뜨거운 물에서 가열해요', { bg: rgba('#0f172a', 0.78), size: 13.5, pad: 11 });
    else if (L.tap) D.label(TUBE.x, 24, '👆 시약병을 누르거나 오른쪽 버튼을 눌러요', { bg: rgba('#16a34a', 0.95), size: 13.5, pad: 11 });
  }
  function dropperAt(x, y, o) { ironDropper(x, y, o); }
  function tubePath(c, x, y, w, h) { c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y + h - w / 2); c.arc(x, y + h - w / 2, w / 2, Math.PI, 0, true); c.lineTo(x + w / 2, y); }

  /* ----- 오른쪽 패널: 검출 결과 기록표 ----- */
  function labCell(x, y, w, h, kind, id) {
    const r = LAB.res[id][kind], sp = SAMP.find((q) => q.id === id);
    ctx.fillStyle = r == null ? '#f1f4f8' : '#fff'; D.roundRect(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = r == null ? '#dde4ef' : '#cbd5e1'; ctx.lineWidth = 1.5; D.roundRect(x, y, w, h, 10); ctx.stroke();
    if (r == null) { text(x + w / 2, y + h / 2 + 6, '?', { size: 18, weight: 800, color: '#b3bdcc' }); return; }
    const col = kind === 'iod' ? (r ? '#1a2064' : AMB) : (r ? '#c6431b' : '#3d86dc');
    const nm = kind === 'iod' ? (r ? '청람색' : '황갈색') : (r ? '황적색' : '푸른색');
    D.sphere(x + 15, y + h / 2, 8, col, { gloss: true });
    text(x + 29, y + h / 2 + 5, nm, { size: 12.5, weight: 800, align: 'left', color: COL.ink });
  }
  function drawTestPanel() {
    const p = LAY.pn;
    panel(p.x, p.y, p.w, p.h, 14);
    const rh = PHONE ? 38 : 56, y0 = p.y + (PHONE ? 50 : 76), cw = PHONE ? 126 : 70, nw = PHONE ? 130 : 66;
    text(p.x + p.w / 2, p.y + (PHONE ? 22 : 28), '검출 결과 기록표', { size: PHONE ? 15 : 17, weight: 800, color: '#14532d' });
    const x1 = p.x + 8 + nw, x2 = x1 + cw + 4;
    text(x1 + cw / 2, y0 - 8, '아이오딘', { size: 12.5, weight: 800, color: '#7a4a0c' });
    text(x2 + cw / 2, y0 - 8, '베네딕트', { size: 12.5, weight: 800, color: '#1d4e96' });
    SAMP.forEach((s, i) => {
      const y = y0 + i * (rh + 6), on = i === LAB.sel;
      if (on) { ctx.fillStyle = 'rgba(22,163,74,.09)'; D.roundRect(p.x + 4, y - 3, p.w - 8, rh + 6, 10); ctx.fill(); }
      text(p.x + 10, y + rh / 2 + 7, s.emoji, { size: PHONE ? 20 : 20, weight: 400, align: 'left' });
      text(p.x + (PHONE ? 44 : 36), y + rh / 2 + 5, s.name, { size: 14, weight: 800, align: 'left', color: COL.ink });
      labCell(x1, y + 2, cw, rh - 4, 'iod', s.id); labCell(x2, y + 2, cw, rh - 4, 'ben', s.id);
    });
    const s = SAMP[LAB.sel], r = LAB.res[s.id];
    let msg = '시료를 고르고 시약을 떨어뜨려 색 변화를 확인해요.';
    if (r.iod != null && r.ben != null) msg = r.iod ? s.emoji + ' ' + s.name + ': 아이오딘 반응 → 녹말을 저장해요.' : r.ben ? s.emoji + ' ' + s.name + ': 베네딕트 반응 → 포도당을 저장해요.' : s.emoji + ' ' + s.name + ': 두 시약 모두 변화 없음 → 녹말·포도당이 아닌 다른 물질(단백질, 지방 등)을 저장해요.';
    else if (r.iod != null || r.ben != null) msg = '다른 시약으로도 검사해 보세요.';
    const my = y0 + 4 * (rh + 6) + (PHONE ? 22 : 34);
    wrapText(p.x + p.w / 2, my, msg, p.w - 28, { size: 13, weight: 700, color: COL.ink, lh: 17 });
    if (!PHONE) wrapText(p.x + p.w / 2, p.y + p.h - 34, '아이오딘 반응: 녹말 → 청람색 / 베네딕트 반응(가열): 포도당 → 황적색', p.w - 24, { size: 12, weight: 700, color: COL.muted, lh: 15 });
  }

  /* =========================================================
     장면 4: 저장 기관 짝짓기 (캔버스 전체)
     ========================================================= */
  const CARDS = new CardBoard();
  const CG = {};
  const STORE = [
    ['potato', '🥔', '감자', '줄기', 'starch'], ['sweet', '🍠', '고구마', '뿌리', 'starch'], ['rice', '🌾', '벼', '씨', 'starch'], ['grape', '🍇', '포도', '열매', 'glucose'],
    ['cane', '🎋', '사탕수수', '줄기', 'sucrose'], ['soy', '🫘', '콩', '씨', 'protein'], ['pnut', '🥜', '땅콩·깨', '씨', 'fat'],
  ];
  const SCOL = { starch: '#7c5cd6', glucose: '#d97706', sucrose: '#db2777', protein: '#0d9488', fat: '#b8860b' };
  const SNAME = { starch: '녹말', glucose: '포도당', sucrose: '설탕', protein: '단백질', fat: '지방' };
  function buildCards() {
    CARDS.slots.length = 0; CARDS.chips.length = 0; CARDS.drag = null; CARDS.sel = null;
    let sw, sh, slotXY, hs;
    if (!PHONE) {
      sw = 150; sh = 46;
      slotXY = (i) => ({ x: i < 4 ? 222 : 612, y: 70 + (i % 4) * 62 - sh / 2 + 16 });
      Object.assign(CG, { panel: { x: 16, y: 8, w: 768, h: 322 }, tray: { x: 16, y: 338, w: 768, h: 166 }, cap: [34, 360], title: [400, 34] });
      hs = []; for (let k = 0; k < 7; k++) hs.push([130 + (k % 4) * 180 + (k >= 4 ? 90 : 0), k < 4 ? 408 : 462]);
    } else {
      sw = 188; sh = 44;
      slotXY = (i) => ({ x: 232, y: 54 + i * 52 - sh / 2 + 4 });
      Object.assign(CG, { panel: { x: 8, y: 6, w: 424, h: 420 }, tray: { x: 8, y: 434, w: 424, h: 248 }, cap: [24, 456], title: [220, 26] });
      hs = []; for (let k = 0; k < 7; k++) hs.push([k % 2 ? 326 : 114, 496 + Math.floor(k / 2) * 52]);
    }
    STORE.forEach((r, i) => {
      const q = slotXY(i);
      CARDS.addSlot({ id: r[0], row: r[0], x: q.x, y: q.y, w: sw, h: sh, accept: [r[4]], ph: '', fill: 'rgba(255,255,255,.9)', info: r });
    });
    const order = ['fat', 'starch', 'sucrose', 'starch', 'protein', 'glucose', 'starch'];
    order.forEach((kd, i) => CARDS.addChip({ id: kd + '-' + i, kind: kd, label: SNAME[kd], hx: hs[i][0], hy: hs[i][1], w: PHONE ? 188 : 150, h: 44, color: SCOL[kd], size: 16 }));
  }
  buildCards();
  function drawCards() {
    ctx.fillStyle = '#eaf5e6'; ctx.fillRect(0, 0, VW, VH);
    const pr = CG.panel;
    panel(pr.x, pr.y, pr.w, pr.h, 18, '#fff');
    text(CG.title[0], CG.title[1], '저장 기관에는 어떤 물질이 저장될까요?', { size: PHONE ? 15 : 16, weight: 800, color: '#14532d' });
    CARDS.slots.forEach((s, i) => {
      const r = s.info;
      const lx = PHONE ? 20 : (i < 4 ? 36 : 426);
      text(lx, s.y + s.h / 2 + 9, r[1], { size: 26, weight: 400, align: 'left' });
      text(lx + 38, s.y + s.h / 2 + 1, r[2], { size: PHONE ? 15 : 17, weight: 800, align: 'left', color: COL.ink });
      text(lx + 38, s.y + s.h / 2 + 18, '(' + r[3] + ')', { size: 12.5, weight: 700, align: 'left', color: COL.muted });
    });
    const tr = CG.tray;
    panel(tr.x, tr.y, tr.w, tr.h, 18, 'rgba(255,255,255,.7)');
    text(CG.cap[0], CG.cap[1], '🃏 저장 물질 카드 (끌어서 알맞은 칸에 놓아요)', { size: 14.5, weight: 800, align: 'left', color: COL.muted });
    CARDS.draw();
  }
  function cardsFeedback() {
    if (CARDS.filledCount() < 7) return '아직 빈 칸이 있어요. 카드 7장을 모두 놓아 보세요.';
    const w = CARDS.wrongSlots();
    if (!w.length) return true;
    CARDS.flagWrong(w);
    const names = w.map((s) => s.info[2]);
    return '‘' + names.join('’, ‘') + '’ 카드가 맞지 않아요. 검출 실험 결과를 떠올려 봐요. (녹말: 아이오딘 청람색, 포도당: 베네딕트 황적색)';
  }

  /* =========================================================
     장면 5: 광합성 산물의 이용 — 정보 그림 완성
     ========================================================= */
  const USE = new CardBoard();
  const UG = { flow: [], t: 0 };
  const UCHIPS = {
    light: ['빛에너지', '#d97706'], sugar: ['양분 (포도당 등)', '#16a34a'], resp: ['호흡 — 에너지를 꺼내 생명 활동에 이용', '#e11d48'],
    grow: ['생장 — 몸을 이루는 물질로 이용', '#7c3aed'], eat: ['먹이 — 먹어서 에너지를 얻어요', '#0d9488'], water: ['물 — 에너지를 만들어 줘요', '#64748b'], oxy: ['산소 — 에너지원이에요', '#64748b'],
  };
  function buildUse() {
    USE.slots.length = 0; USE.chips.length = 0; USE.drag = null; USE.sel = null;
    let S, hs, cw, chh, sz;
    if (!PHONE) {
      S = {
        A: { x: 38, y: 148, w: 164, h: 48, ph: '에너지의 근원', accept: ['light'] },
        B: { x: 262, y: 148, w: 164, h: 48, ph: '광합성으로 만든 것', accept: ['sugar'] },
        C1: { x: 520, y: 76, w: 246, h: 54, ph: '식물 자신이 쓰는 곳 ①', accept: ['resp', 'grow'], group: 'plant' },
        C2: { x: 520, y: 148, w: 246, h: 54, ph: '식물 자신이 쓰는 곳 ②', accept: ['resp', 'grow'], group: 'plant' },
        D: { x: 520, y: 228, w: 246, h: 54, ph: '사람·동물이 얻는 방법', accept: ['eat'] },
      };
      Object.assign(UG, { panel: { x: 16, y: 8, w: 768, h: 322 }, tray: { x: 16, y: 338, w: 768, h: 166 }, cap: [34, 360], flow: [[[204, 172], [260, 172]], [[430, 172], [476, 104]], [[430, 172], [476, 175]], [[430, 172], [476, 254]]], nodes: [[120, 96, 'sun'], [344, 96, 'plant']], heads: [[120, 38, '에너지의 근원은?'], [344, 38, '광합성으로 만든 것은?'], [631, 38, '그 양분은 어디에 쓰일까?']] });
      cw = 176; chh = 54; sz = 12.5;
      hs = [[112, 404], [300, 404], [488, 404], [676, 404], [112, 462], [300, 462], [488, 462]];
    } else {
      S = {
        A: { x: 128, y: 40, w: 288, h: 46, ph: '에너지의 근원', accept: ['light'] },
        B: { x: 128, y: 108, w: 288, h: 46, ph: '광합성으로 만든 것', accept: ['sugar'] },
        C1: { x: 128, y: 190, w: 288, h: 52, ph: '식물 자신이 쓰는 곳 ①', accept: ['resp', 'grow'], group: 'plant' },
        C2: { x: 128, y: 252, w: 288, h: 52, ph: '식물 자신이 쓰는 곳 ②', accept: ['resp', 'grow'], group: 'plant' },
        D: { x: 128, y: 330, w: 288, h: 52, ph: '사람·동물이 얻는 방법', accept: ['eat'] },
      };
      Object.assign(UG, { panel: { x: 8, y: 6, w: 424, h: 420 }, tray: { x: 8, y: 434, w: 424, h: 248 }, cap: [24, 456], flow: [[[62, 76], [62, 102]], [[62, 160], [62, 192]], [[62, 304], [62, 336]]], nodes: [[62, 62, 'sun'], [62, 128, 'plant'], [62, 216, 'self'], [62, 278, 'self'], [62, 354, 'human']], heads: [] });
      cw = 200; chh = 46; sz = 12.5;
      hs = [0, 1, 2, 3, 4, 5, 6].map((k) => [k % 2 ? 326 : 114, 492 + Math.floor(k / 2) * 52]);
    }
    Object.keys(S).forEach((id) => USE.addSlot(Object.assign({ id, fill: 'rgba(255,255,255,.92)', phSize: 13 }, S[id])));
    const order = ['water', 'resp', 'light', 'eat', 'oxy', 'sugar', 'grow'];
    order.forEach((kd, i) => USE.addChip({ id: kd, kind: kd, label: UCHIPS[kd][0], hx: hs[i][0], hy: hs[i][1], w: cw, h: chh, color: UCHIPS[kd][1], size: sz }));
  }
  buildUse();
  function drawSunIcon(x, y, r) { drawSun(x, y, r, 1); }
  function drawPlantIcon(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#4c9a49'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 38); ctx.lineTo(0, -8); ctx.stroke();
    drawLeaf(0, 22, 40, 14, -2.5, { shadow: false }); drawLeaf(0, 8, 46, 16, -0.6, { shadow: false }); drawLeaf(0, -6, 30, 11, -1.57, { shadow: false });
    ctx.restore();
  }
  function flowArrows(done) {
    const t = CLK.t;
    UG.flow.forEach((f, i) => {
      const a = f[0], b = f[1], col = i === 0 ? '#f59e0b' : '#16a34a';
      ctx.save();
      ctx.strokeStyle = rgba(col, done ? 0.95 : 0.55); ctx.lineWidth = done ? 4 : 3; ctx.lineCap = 'round';
      ctx.setLineDash([9, 9]); ctx.lineDashOffset = -t * 36;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      ctx.fillStyle = rgba(col, done ? 0.95 : 0.6); ctx.translate(b[0], b[1]); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-11, -6.5); ctx.lineTo(-11, 6.5); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (done && !RM) { const k = (t * 0.7 + i * 0.3) % 1; D.glow(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 12, col, 0.7); }
    });
  }
  function useDone() { return USE.filledCount() === 5 && USE.wrongSlots().length === 0; }
  function drawUse() {
    ctx.fillStyle = '#eaf5e6'; ctx.fillRect(0, 0, VW, VH);
    const pr = UG.panel;
    panel(pr.x, pr.y, pr.w, pr.h, 18, '#fff');
    const done = useDone();
    if (!PHONE) {
      UG.heads.forEach((h) => text(h[0], h[1], h[2], { size: 14.5, weight: 800, color: '#14532d' }));
      drawSunIcon(120, 96, 22); drawPlantIcon(344, 108, 0.95);
      ctx.fillStyle = 'rgba(22,163,74,.07)'; D.roundRect(470, 50, 306, 250, 16); ctx.fill();
      text(486, 111, '🌱', { size: 20, weight: 400, align: 'left' }); text(486, 183, '🌱', { size: 20, weight: 400, align: 'left' }); text(486, 263, '🧑', { size: 20, weight: 400, align: 'left' });
    } else {
      text(220, 24, '정보 그림을 완성해 봐요', { size: 15, weight: 800, color: '#14532d' });
      drawSunIcon(62, 56, 16); drawPlantIcon(62, 130, 0.62);
      text(62, 226, '🌱', { size: 26, weight: 400 }); text(62, 286, '🌱', { size: 26, weight: 400 }); text(62, 362, '🧑', { size: 26, weight: 400 });
    }
    flowArrows(done);
    const tr = UG.tray;
    panel(tr.x, tr.y, tr.w, tr.h, 18, 'rgba(255,255,255,.7)');
    text(UG.cap[0], UG.cap[1], '🃏 카드 (끌어서 알맞은 칸에 놓아요)', { size: 14.5, weight: 800, align: 'left', color: COL.muted });
    USE.draw();
    if (done) D.label(PHONE ? 220 : 400, PHONE ? 404 : 316, '광합성 산물은 생명 활동에 필요한 에너지원이에요!', { bg: rgba('#16a34a', 0.96), size: PHONE ? 13 : 14.5, pad: 12 });
  }
  function useFeedback() {
    if (USE.filledCount() < 5) return '아직 빈 칸이 있어요. 필요한 카드 5장만 골라 놓아 보세요. (카드는 7장이라 2장은 남아요)';
    const w = USE.wrongSlots();
    if (!w.length) return true;
    USE.flagWrong(w);
    const bad = w.some((s) => ['water', 'oxy'].indexOf(s.chip.kind) >= 0);
    return bad ? '물과 산소는 에너지의 근원이 아니에요. 에너지는 광합성으로 만든 <b>양분</b>에서 나와요. 빨간 테두리 카드를 바꿔 봐요.' : '빨간 테두리 카드의 자리가 맞지 않아요. 햇빛 → 양분 → (식물 자신 · 사람과 동물) 흐름을 떠올려 봐요.';
  }

  /* =========================================================
     갱신 · 그리기
     ========================================================= */
  function sceneCard(fn) {
    softShadow(SSR.x, SSR.y, SSR.w, SSR.h, 20 * LAY.s, 16, 6, 'rgba(20,70,40,.24)');
    inScene(() => { rrPath(ctx, 0, 0, SW, SH, 20); ctx.clip(); fn(); FX.draw(ctx); drawChecks(0); });
  }
  function draw() {
    view.apply();
    ctx.fillStyle = '#eaf5e6'; ctx.fillRect(0, 0, VW, VH);
    if (scene === 'cards') { drawCards(); FX.draw(ctx); return; }
    if (scene === 'use') { drawUse(); FX.draw(ctx); return; }
    if (scene === 'leaf') { sceneCard(drawLeafScene); drawLeafPanel(); }
    else if (scene === 'plant') { sceneCard(drawPlantScene); drawPlantPanel(); }
    else if (scene === 'test') { sceneCard(drawLabScene); drawTestPanel(); }
  }
  let roTimer = 0;
  function update(dt) {
    CLK.t += dt; FRAME_DT = dt;
    LX.fade = Math.max(0, LX.fade - dt * 3.2);
    if (scene === 'leaf') updateLeaf(dt);
    else if (scene === 'plant') updatePlant(dt);
    else if (scene === 'test') updateLab(dt);
    else if (scene === 'cards') CARDS.update(dt);
    else if (scene === 'use') USE.update(dt);
    FX.update(dt);
    roTimer -= dt;
    if (roTimer <= 0) { roTimer = 0.2; refreshReadouts(); }
  }

  /* =========================================================
     화면 요소
     ========================================================= */
  const el = {
    tb: $('#tbLabel'), ctlLeaf: $('#ctlLeaf'), ctlPlant: $('#ctlPlant'), ctlTest: $('#ctlTest'), ctlCards: $('#ctlCards'), ctlUse: $('#ctlUse'),
    leafBtn: $('#leafBtn'), leafNote: $('#leafNote'), btnDay: $('#btnDay'), btnNight: $('#btnNight'), plNote: $('#plNote'),
    btnIod: $('#btnIod'), btnBen: $('#btnBen'), cardsReset: $('#cardsReset'), useReset: $('#useReset'), testNote: $('#testNote'),
    r: [1, 2, 3].map((i) => ({ l: $('#rl' + i), v: $('#r' + i) })),
  };
  function show(node, on) { if (node) node.hidden = !on; }

  function setScene(s) {
    if (!s || s === scene) return;
    scene = s;
    FX.clear(); checks.length = 0; hideHint();
    if (s === 'cards') CARDS.sel = null;
    if (s === 'use') USE.sel = null;
    refreshUI();
    if (s === 'plant' && has('plant')) hint(PL.day === 1 ? '🌙 밤 버튼을 눌러 시간이 지나게 해 보세요.' : '설탕 꾸러미를 체관을 따라 끌어 보세요.', 3800);
    if (s === 'test') hint('시료를 고르고 시약병을 눌러 색 변화를 관찰해요.', 3800);
  }
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));

  bindClick(el.leafBtn, leafNext);
  bindClick(el.btnDay, () => setDay(true));
  bindClick(el.btnNight, () => setDay(false));
  $$('#sampSeg button').forEach((b) => b.addEventListener('click', () => labSelect(+b.dataset.i)));
  bindClick(el.btnIod, () => labTest('iod'));
  bindClick(el.btnBen, () => labTest('ben'));
  bindClick(el.cardsReset, () => { CARDS.reset(); refreshUI(); });
  bindClick(el.useReset, () => { USE.reset(); refreshUI(); });
  bindClick($('#resetBtn'), () => {
    if (scene === 'leaf') { resetLeaf(false); hint('실험을 처음 상태로 되돌렸어요.', 2400); }
    else if (scene === 'plant') { plantReset(); hint('처음 상태로 되돌렸어요.', 2400); }
    else if (scene === 'test') labReset();
    else if (scene === 'cards') CARDS.reset();
    else if (scene === 'use') USE.reset();
    refreshUI();
  });

  function syncLeafUI() {
    const L = LX, b = el.leafBtn;
    if (!b) return;
    const labels = ['☀️ 하루 동안 빛 쬐기', '🧪 에탄올에 넣어 탈색하기', '💧 아이오딘 용액 떨어뜨리기', '🔁 처음부터 다시 하기'];
    b.textContent = L.act ? '⏳ 진행 중…' : labels[Math.min(3, L.stage)];
    b.disabled = !!L.act;
    const notes = ['잎의 부분을 눌러 은박지를 씌우거나 벗겨요. 그다음 하루 동안 빛을 쬐어요.', '하루가 지났어요. 잎을 따서 에탄올에 넣어 초록색(엽록소)을 빼요.', '잎이 탈색됐어요. 아이오딘 용액을 떨어뜨려 색 변화를 관찰해요.', '청람색으로 변한 곳에는 녹말이 있어요. 은박지 위치를 바꿔 다시 해 볼 수 있어요.'];
    if (el.leafNote) el.leafNote.textContent = L.act === 'light' ? '하루 동안 빛을 받아요…' : L.act === 'decol' ? '뜨거운 물로 에탄올을 데워요…' : L.act === 'iodine' ? '아이오딘 용액이 번져요…' : notes[Math.min(3, L.stage)];
  }
  function syncPlantUI() {
    if (el.btnDay) el.btnDay.setAttribute('aria-pressed', PL.day === 1 ? 'true' : 'false');
    if (el.btnNight) el.btnNight.setAttribute('aria-pressed', PL.day === 1 ? 'false' : 'true');
    if (el.plNote) el.plNote.textContent = PL.day === 1 ? '낮에는 광합성으로 잎에 녹말이 쌓여요. 🌙 밤으로 바꿔 보세요.' : '밤에는 설탕이 체관으로 이동해요. 설탕 꾸러미를 끌어서 뿌리와 열매로 보내 보세요.';
  }
  function syncTestUI() {
    $$('#sampSeg button').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.i === LAB.sel ? 'true' : 'false'));
    [el.btnIod, el.btnBen].forEach((b) => { if (b) b.disabled = !!LAB.act; });
    $$('#sampSeg button').forEach((b) => { b.disabled = !!LAB.act; });
  }
  function refreshUI() {
    show(el.ctlLeaf, scene === 'leaf');
    show(el.ctlPlant, scene === 'plant' && has('plant'));
    show(el.ctlTest, scene === 'test' && has('store'));
    show(el.ctlCards, scene === 'cards' && has('store'));
    show(el.ctlUse, scene === 'use' && has('use'));
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === scene));
    el.tb.textContent = SCENE_LABEL[scene];
    syncLeafUI(); syncPlantUI(); syncTestUI();
    refreshReadouts();
  }
  function setRO(i, label, val) {
    const r = el.r[i];
    if (r.l.textContent !== label) r.l.textContent = label;
    if (r.v.textContent !== val) r.v.textContent = val;
  }
  const IODTXT = (v) => (v == null ? '-' : v ? '청람색 (녹말 있음)' : '황갈색 (변화 없음)');
  const BENTXT = (v) => (v == null ? '-' : v ? '황적색 (포도당 있음)' : '푸른색 (변화 없음)');
  function refreshReadouts() {
    if (scene === 'leaf') {
      const L = LX;
      const st = L.act ? '진행 중…' : ['준비 (은박지 씌우기)', '하루 지남', '탈색 끝', '아이오딘 반응 끝'][Math.min(3, L.stage)];
      setRO(0, '실험 진행', st);
      setRO(1, '빛을 받은 부분 (' + lit() + '곳)', L.stage >= 3 ? (lit() ? '청람색 (녹말 있음)' : '-') : '-');
      setRO(2, '은박지로 가린 부분 (' + covered() + '곳)', L.stage >= 3 ? (covered() ? '황갈색 (녹말 없음)' : '-') : '-');
    } else if (scene === 'plant') {
      setRO(0, '시각', PL.day === 1 ? '☀️ 낮' : '🌙 밤');
      setRO(1, '잎의 녹말', Math.round(PL.ls * 100) + ' %');
      setRO(2, '체관으로 보낸 설탕', (PL.sent.root + PL.sent.fruit) + '번 (뿌리 ' + PL.sent.root + ' · 열매 ' + PL.sent.fruit + ')');
    } else if (scene === 'test') {
      const s = SAMP[LAB.sel], r = LAB.res[s.id];
      setRO(0, '시료', s.emoji + ' ' + s.name + ' (' + s.organ + ')');
      setRO(1, '아이오딘 반응', LAB.act === 'iod' ? '반응 중…' : IODTXT(r.iod));
      setRO(2, '베네딕트 반응', LAB.act === 'ben' ? '가열 중…' : BENTXT(r.ben));
    } else if (scene === 'cards') {
      setRO(0, '놓은 카드', CARDS.filledCount() + ' / 7장');
      setRO(1, '선택한 카드', CARDS.sel ? SNAME[CARDS.sel.kind] : '-');
      setRO(2, '남은 카드', (7 - CARDS.filledCount()) + '장');
    } else if (scene === 'use') {
      setRO(0, '놓은 카드', USE.filledCount() + ' / 5장');
      setRO(1, '선택한 카드', USE.sel ? UCHIPS[USE.sel.kind][0].split(' — ')[0] : '-');
      setRO(2, '남은 카드', (7 - USE.filledCount()) + '장');
    }
  }

  /* ---------- 입력 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (scene === 'cards') return CARDS.down(p);
      if (scene === 'use') return USE.down(p);
      const q = toSS(p);
      if (scene === 'leaf') {
        if (LX.stage === 0 && !LX.act && q.y > 120 && q.y < 420) {
          const i = ZX.findIndex((z) => q.x >= z[0] && q.x < z[1]);
          if (i >= 0) { setFoil(i); return false; }
        }
      } else if (scene === 'plant') return pkDown(q);
      else if (scene === 'test' && !LAB.act && has('store')) {
        if (Math.abs(q.x - 88) < 46 && q.y > 320 && q.y < 450) { labTest('iod'); return false; }
        if (Math.abs(q.x - 432) < 46 && q.y > 320 && q.y < 450) { labTest('ben'); return false; }
      }
      return false;
    },
    move(p) {
      if (scene === 'cards') CARDS.move(p);
      else if (scene === 'use') USE.move(p);
      else if (scene === 'plant') pkMove(toSS(p));
    },
    up(p) {
      if (scene === 'cards') CARDS.up(p);
      else if (scene === 'use') USE.up(p);
      else if (scene === 'plant') pkUp();
    },
  });
  CARDS.onChange = () => refreshReadouts();
  USE.onChange = () => refreshReadouts();

  /* 미션 시작 때 장면 상태를 맞춰 주는 도우미 */
  function leafSet(stage) {
    resetLeaf(false); LX.stage = stage; LX.tap = false;
    LX.zones.forEach((z) => { z.fp = z.foil ? 1 : 0; });
    syncLeafUI(); refreshReadouts();
  }
  function labFill(id, iod, ben) {
    const s = SAMP.findIndex((q) => q.id === id);
    LAB.res[id].iod = iod; LAB.res[id].ben = ben;
    LAB.jPrev = SAMP[s].juice; LAB.swap = 1; LAB.sel = s; LAB.act = null;
    LAB.show = { kind: 'iod', pos: SAMP[s].iod, p: 1, a: 1 }; LAB.prec.length = 0; LAB.tap = false;
    syncTestUI(); refreshReadouts();
  }

  /* =========================================================
     미션 (게임 엔진)
     ========================================================= */
  game = SciSim.game({
    simId: 'm2-plant-products',
    mount: '#game',
    badge: '양분 박사',
    homeHref: '../../index.html#g2',
    featureLabels: {
      leaf: '🧪 잎의 녹말 확인 실험 (은박지 · 탈색 · 아이오딘 반응)',
      plant: '🌱 식물 전체 모형 · ☀️ 낮 / 🌙 밤 · 물관과 체관',
      store: '🔬 아이오딘·베네딕트 검출 · 🃏 저장 기관 짝짓기',
      use: '🍽️ 광합성 산물의 이용 정보 그림',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onMissionStart(m) {
      if (game && game.free) return;
      if (m.scene) setScene(m.scene);
      refreshUI();
    },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '녹말 확인: 잎에 양분이 저장될까?', short: '녹말 확인', icon: '🧪', phase: '실험',
        features: ['leaf'],
        intro: '<p class="si-q">❓ 탐구 질문: 잎에서 만든 양분은 어디로 가서 어떻게 쓰일까?</p>' +
          '<p>광합성으로 만든 <b>포도당</b>은 쓰고 남으면 <b>녹말</b>로 바뀌어 잎에 저장돼요. 녹말은 <b>아이오딘 용액</b>과 만나면 <b>청람색</b>으로 변해요. 빛을 받은 잎과 <b>은박지로 가린</b> 잎을 비교하는 실험으로 녹말이 정말 만들어졌는지 확인해 봐요.</p>',
        setup() { setScene('leaf'); },
        recap: '광합성으로 만든 포도당은 쓰고 남으면 <b>녹말</b>로 바뀌어 잎에 저장돼요. 녹말은 아이오딘 용액과 만나 <b>청람색</b>이 돼요.',
        summary: '<ul><li><b>녹말 확인 실험</b>: 빛 쬐기(은박지로 일부를 가림) → 에탄올 중탕으로 <b>탈색</b> → <b>아이오딘 용액</b> 떨어뜨리기</li>' +
          '<li><b>아이오딘 반응</b>: 녹말이 있으면 <b>청람색</b>, 없으면 아이오딘 용액의 색(황갈색) 그대로예요.</li>' +
          '<li>빛을 받은 부분만 청람색 → 광합성으로 만든 양분이 <b>녹말</b>로 저장된다는 증거예요.</li>' +
          '<li>탈색하는 까닭: 잎의 초록색(엽록소)을 빼야 색 변화를 잘 볼 수 있어요.</li></ul>',
        missions: [
          {
            title: '은박지로 가린 곳에도 녹말이 있을까?', scene: 'leaf',
            setup() { resetLeaf(false); refreshUI(); },
            goal: '잎에 <b>은박지를 씌운 곳</b>과 <b>빛을 받는 곳</b>을 모두 둔 채로, 3단계 실험(빛 쬐기 → 탈색 → 아이오딘)을 끝까지 해요.',
            hint: '오른쪽 큰 버튼을 차례로 눌러요. 잎의 부분을 눌러 은박지를 옮길 수도 있어요.',
            check: () => LX.stage >= 3 && !LX.act && lit() >= 1 && covered() >= 1,
            hold: 0.8,
            status: () => mark(lit() >= 1 && covered() >= 1) + ' 빛 받는 곳·가린 곳 · ' + mark(LX.stage >= 1) + ' 빛 쬐기 · ' + mark(LX.stage >= 2) + ' 탈색 · ' + mark(LX.stage >= 3) + ' 아이오딘',
            explain: '빛을 받은 부분은 광합성으로 만든 포도당이 <b>녹말</b>로 바뀌어 저장되어 있어서 아이오딘 용액에서 <b>청람색</b>이 되었어요. 은박지로 가린 부분은 빛을 받지 못해 광합성을 하지 못했으므로 녹말이 없고, 아이오딘 용액의 색(황갈색) 그대로예요.',
          },
          {
            type: 'quiz', title: '가린 곳은 왜 청람색이 안 될까?', scene: 'leaf',
            setup() { leafSet(3); },
            goal: '은박지로 가렸던 부분은 아이오딘 용액을 떨어뜨려도 청람색이 되지 않았어요. 그 까닭은?',
            choices: ['은박지가 아이오딘 용액을 막았기 때문이다', '빛을 받지 못해 광합성을 하지 못했고, 그래서 녹말이 만들어지지 않았기 때문이다', '가린 부분은 호흡을 하지 못했기 때문이다', '가린 부분의 엽록체가 없어졌기 때문이다'],
            answer: 1,
            feedback: ['아이오딘 용액은 은박지를 벗기고 탈색한 뒤에 떨어뜨렸어요. 가린 부분에는 녹말이 없어서 변하지 않은 거예요.', '', '호흡은 빛과 관계없이 일어나요. 녹말은 광합성의 결과로 만들어져요.', '엽록체는 그대로 있어요. 빛이 없어서 광합성이 일어나지 않았을 뿐이에요.'],
            explain: '녹말은 <b>광합성</b>으로 만든 포도당이 바뀐 것이에요. 빛이 없으면 광합성이 일어나지 않아 녹말이 만들어지지 않고, 그래서 청람색이 나타나지 않아요.',
          },
          {
            type: 'quiz', title: '왜 에탄올에 넣어 탈색할까?', scene: 'leaf',
            setup() { leafSet(1); },
            goal: '아이오딘 용액을 떨어뜨리기 전에 잎을 에탄올에 넣고 중탕해요. 그 까닭은 무엇일까요?',
            choices: ['잎 속의 녹말을 녹여 없애려고', '잎의 초록색(엽록소)을 빼서 청람색 색 변화를 잘 보려고', '아이오딘 용액이 더 진해지게 하려고', '에탄올이 광합성을 일으키게 하려고'],
            answer: 1,
            feedback: ['녹말은 에탄올에 녹지 않아 그대로 남아 있어요. 에탄올이 녹이는 것은 엽록소예요.', '', '탈색은 아이오딘 용액과 관계가 없어요. 잎의 색을 빼서 색 변화를 잘 보려는 거예요.', '에탄올은 광합성과 관계가 없어요. 엽록소를 녹여 내는 용매예요.'],
            explain: '잎이 초록색이면 청람색이 나타나도 구별하기 어려워요. 그래서 <b>에탄올</b>(불꽃에 직접 닿지 않게 <b>중탕</b>)로 엽록소를 빼서 잎을 연하게 만든 뒤 아이오딘 용액을 떨어뜨려요.',
          },
        ],
      },
      {
        title: '이동: 밤에 체관을 따라 이동해요', short: '이동', icon: '🌱', phase: '모형',
        features: ['plant'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 잎에서 만든 양분이 <b>녹말</b>로 저장된다는 것을 아이오딘 반응으로 확인했어요.</div>' +
          '<p>하지만 식물은 잎에서만 양분이 필요한 것이 아니에요. 뿌리·줄기·열매도 양분이 있어야 해요. 식물 전체 <b>모형</b>에서 <b>낮</b>과 <b>밤</b>에 양분이 어떻게 되는지 살펴봐요. 양분이 지나가는 길은 물이 올라가는 길(<b>물관</b>)과 달라요!</p>',
        setup() { setScene('plant'); },
        recap: '낮에 잎에 쌓인 녹말은 주로 밤에 물에 잘 녹는 <b>설탕</b>으로 바뀌어 <b>체관</b>을 통해 뿌리·줄기·열매로 이동해요.',
        summary: '<ul><li><b>낮</b>: 광합성으로 만든 포도당 → <b>녹말</b>로 바뀌어 잎에 일시적으로 저장돼요.</li>' +
          '<li><b>밤</b>(주로): 녹말 → 물에 잘 녹는 <b>설탕</b>으로 바뀌어 <b>체관</b>을 따라 이동해요. (잎 → 줄기 → 뿌리·열매)</li>' +
          '<li><b>체관</b>은 양분이 이동하는 통로, <b>물관</b>은 뿌리에서 흡수한 물이 올라가는 통로예요.</li></ul>',
        missions: [
          {
            title: '낮: 잎에 녹말이 쌓여요', scene: 'plant',
            setup() { PL.ls = 0.1; PL.nSug.clear(); setDay(true); PL.dv = 1; syncPlantUI(); refreshUI(); },
            goal: '☀️ <b>낮</b>에 광합성이 계속되면 잎에 녹말이 쌓여요. 잎의 녹말이 <b>90 % 이상</b>이 될 때까지 지켜봐요.',
            hint: '낮 상태로 기다리면 잎 속에 보라색 녹말 알갱이가 하나씩 늘어나요.',
            check: () => PL.day === 1 && PL.ls >= 0.9,
            hold: 0.5,
            status: () => (PL.day === 1 ? '☀️ 낮' : '🌙 밤 (☀️ 낮으로 바꿔요)') + ' · 잎의 녹말 <b>' + Math.round(PL.ls * 100) + ' %</b>',
            explain: '낮에는 광합성으로 포도당이 계속 만들어져요. 쓰고 남은 포도당은 <b>녹말</b>로 바뀌어 잎에 쌓여요. 이것이 앞에서 아이오딘 반응으로 확인한 녹말이에요.',
          },
          {
            title: '밤: 설탕을 체관으로 보내요', scene: 'plant',
            setup() { PL.ls = 1; PL.sent.root = 0; PL.sent.fruit = 0; PL.root = 0; PL.fruit = 0; PL.nSug.clear(); setDay(false); PL.pk.pop = 0; syncPlantUI(); refreshUI(); },
            goal: '🌙 <b>밤</b>이 되면 잎의 녹말이 <b>설탕</b>으로 바뀌어요. 설탕 꾸러미를 <b>체관</b>을 따라 끌어서 <b>뿌리</b>와 <b>열매</b>에 한 번씩 놓아요.',
            hint: '주황색 관이 체관, 파란색 관은 물관이에요. 꾸러미를 체관 위에서 끝까지 끌어요.',
            check: () => PL.sent.root >= 1 && PL.sent.fruit >= 1,
            hold: 0.4,
            status: () => mark(PL.sent.root >= 1) + ' 뿌리 ' + Math.min(1, PL.sent.root) + ' / 1 · ' + mark(PL.sent.fruit >= 1) + ' 열매 ' + Math.min(1, PL.sent.fruit) + ' / 1',
            explain: '잎의 녹말은 물에 잘 녹는 <b>설탕</b>으로 바뀐 뒤, <b>체관</b>을 따라 뿌리와 열매로 이동했어요. 파란색 <b>물관</b>은 뿌리에서 잎으로 물을 올려 보내는 길이라서 양분이 지나가지 않아요.',
          },
          {
            type: 'quiz', title: '양분이 이동하는 길은?', scene: 'plant',
            setup() { PL.ls = 0.5; setDay(false); refreshUI(); },
            goal: '잎에서 만든 양분(설탕)이 뿌리와 열매로 이동하는 통로는 무엇일까요?',
            choices: ['물관 — 물과 함께 위로 올라가요', '체관 — 설탕이 되어 잎에서 뿌리·열매로 이동해요', '기공 — 공기와 함께 나가요', '표피 — 식물의 표면을 덮고 있어요'],
            answer: 1,
            feedback: ['물관은 뿌리에서 흡수한 물을 위로 올려 보내는 통로예요. 양분은 물관이 아니라 체관으로 이동해요.', '', '기공은 기체(산소, 이산화 탄소, 수증기)가 드나드는 구멍이에요.', '표피는 식물을 보호하는 조직이에요. 양분이 이동하는 통로는 아니에요.'],
            explain: '양분은 <b>체관</b>을 통해 이동해요. (물과 무기양분은 <b>물관</b>) 그림에서 체관의 설탕은 아래로, 물관의 물은 위로 움직였지요.',
          },
        ],
      },
      {
        title: '저장: 기관마다 다른 물질로 저장돼요', short: '저장', icon: '🥔', phase: '탐구',
        features: ['store'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 설탕이 체관을 따라 뿌리와 열매로 이동하는 것을 보았어요.</div>' +
          '<p>도착한 양분은 기관에서 여러 물질로 바뀌어 <b>저장</b>돼요. 감자·포도·콩 같은 저장 기관을 <b>아이오딘 용액</b>(녹말)과 <b>베네딕트 용액</b>(포도당 같은 당)으로 검사해 보고, 어떤 기관에 어떤 물질이 저장되는지 정리해요.</p>',
        setup() { setScene('test'); },
        recap: '광합성 산물은 기관에 따라 <b>녹말·포도당·설탕·단백질·지방</b> 등 여러 물질로 바뀌어 저장돼요.',
        summary: '<ul><li><b>아이오딘 반응</b>: 녹말 → 청람색 / <b>베네딕트 반응</b>(가열): 포도당 같은 당 → 황적색</li>' +
          '<li>녹말 저장: 감자(줄기)·고구마(뿌리)·벼(씨) / 포도당: 포도(열매) / 설탕: 사탕수수(줄기)</li>' +
          '<li>단백질: 콩(씨) / 지방: 땅콩·깨(씨)</li>' +
          '<li>양분은 저장되었다가 필요할 때 쓰여요.</li></ul>',
        missions: [
          {
            title: '저장 물질 검출하기', scene: 'test',
            setup() { labReset(); LAB.sel = 0; LAB.jPrev = SAMP[0].juice; LAB.swap = 1; syncTestUI(); refreshUI(); },
            goal: '🥔 감자는 <b>아이오딘</b>으로, 🍇 포도는 <b>베네딕트</b>로 검사하고, 🫘 콩도 시약 한 가지로 검사해 색 변화를 관찰해요.',
            hint: '시료를 고른 뒤 시약병이나 시약 버튼을 눌러요. 베네딕트 반응은 가열 때문에 시간이 조금 걸려요.',
            check: () => LAB.res.potato.iod === true && LAB.res.grape.ben === true && (LAB.res.bean.iod != null || LAB.res.bean.ben != null),
            hold: 0.6,
            status: () => mark(LAB.res.potato.iod === true) + ' 감자+아이오딘 · ' + mark(LAB.res.grape.ben === true) + ' 포도+베네딕트 · ' + mark(LAB.res.bean.iod != null || LAB.res.bean.ben != null) + ' 콩 검사',
            explain: '감자는 아이오딘 용액에서 <b>청람색</b> → 녹말이 있어요. 포도는 베네딕트 용액을 넣고 가열하면 <b>황적색</b> → 포도당이 있어요. 콩은 두 시약 모두 뚜렷한 변화가 없어요. 녹말이나 포도당이 아닌 다른 물질이 저장되어 있다는 뜻이에요.',
          },
          {
            title: '저장 기관 짝짓기', scene: 'cards', manual: true,
            setup() { CARDS.reset(); refreshUI(); },
            goal: '식물의 저장 기관마다 저장되는 물질 카드를 알맞은 칸에 놓은 뒤 <b>✔ 확인하기</b>를 눌러요.',
            hint: '녹말 카드는 3장이에요. 콩(씨)과 땅콩·깨(씨)는 녹말이 아니에요.',
            check: cardsFeedback,
            explain: '<b>녹말</b>: 감자(줄기)·고구마(뿌리)·벼(씨), <b>포도당</b>: 포도(열매), <b>설탕</b>: 사탕수수(줄기), <b>단백질</b>: 콩(씨), <b>지방</b>: 땅콩·깨(씨). 같은 광합성 산물도 기관에 따라 서로 다른 물질로 저장돼요.',
          },
          {
            type: 'quiz', title: '콩에는 무엇이 저장될까?', scene: 'test',
            setup() { labFill('bean', false, false); },
            goal: '콩을 아이오딘 용액과 베네딕트 용액으로 검사했더니 두 시약 모두 색이 변하지 않았어요. 콩에는 어떤 물질이 저장되어 있을까요?',
            choices: ['아무 물질도 저장되어 있지 않다', '녹말이나 포도당이 아닌 단백질·지방 같은 다른 물질이 저장되어 있다', '녹말이 아주 많이 저장되어 있다', '포도당이 아주 많이 저장되어 있다'],
            answer: 1,
            feedback: ['콩의 씨에는 싹이 틀 때 쓸 양분이 많이 저장되어 있어요.', '', '녹말이 많다면 아이오딘 용액이 청람색으로 변했을 거예요.', '포도당이 많다면 베네딕트 용액이 가열할 때 황적색으로 변했을 거예요.'],
            explain: '두 시약에 모두 반응하지 않았으므로 녹말과 포도당이 아니라는 뜻이에요. 콩은 <b>단백질</b>, 땅콩·깨는 <b>지방</b>으로 저장해요. 광합성 산물은 이렇게 기관에 따라 여러 물질로 바뀌어 저장돼요.',
          },
        ],
      },
      {
        title: '이용: 에너지원으로 쓰여요', short: '이용', icon: '🍽️', phase: '적용',
        features: ['use'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 광합성 산물이 녹말·포도당·설탕·단백질·지방 등으로 저장된다는 것을 알았어요.</div>' +
          '<p>저장된 양분은 어디에 쓰일까요? 식물은 양분으로 <b>호흡</b>(에너지)을 하고 <b>생장</b>해요. 사람과 동물은 그 식물을 먹고 에너지를 얻어요. 광합성 산물은 생명 활동에 필요한 <b>에너지원</b>이에요. 정보 그림을 완성해 봐요.</p>',
        setup() { setScene('use'); },
        recap: '광합성으로 <b>빛에너지</b>가 양분에 저장되고, 식물은 이 양분으로 <b>호흡</b>과 <b>생장</b>을 해요. 사람과 동물도 식물을 먹고 에너지를 얻어요.',
        summary: '<ul><li>광합성 산물은 <b>생명 활동에 필요한 에너지원</b>이에요.</li>' +
          '<li>식물 자신: 양분을 <b>호흡</b>으로 분해해 에너지를 얻고, 양분으로 몸을 이루는 물질을 만들어 <b>생장</b>해요.</li>' +
          '<li>사람과 동물: 식물을 <b>먹어서</b> 에너지를 얻어요. 식량의 에너지는 처음에 <b>햇빛</b>에서 왔어요.</li></ul>',
        missions: [
          {
            title: '정보 그림 완성하기', scene: 'use', manual: true,
            setup() { USE.reset(); refreshUI(); },
            goal: '필요한 카드 <b>5장</b>을 알맞은 칸에 놓은 뒤 <b>✔ 확인하기</b>를 눌러요. (카드 7장 중 2장은 쓰지 않아요)',
            hint: '햇빛 → 광합성 산물(양분) → 식물 자신(호흡·생장) · 사람과 동물(먹이) 순서를 떠올려요.',
            check: useFeedback,
            explain: '<b>빛에너지</b> → 광합성 → <b>양분</b>. 식물은 양분으로 <b>호흡</b>(에너지)과 <b>생장</b>(몸을 이루는 물질)을 하고, 사람과 동물은 식물을 <b>먹어서</b> 에너지를 얻어요. 물과 산소는 에너지의 근원이 아니에요.',
          },
          {
            type: 'quiz', title: '식량의 에너지는 어디에서 왔을까?', scene: 'use',
            goal: '우리가 먹는 쌀·감자·콩 속의 에너지는 처음에 어디에서 온 것일까요?',
            choices: ['땅속의 물이 가지고 있던 에너지', '식물이 광합성으로 빛에너지를 양분에 저장해 둔 것', '흙 속 거름이 가지고 있던 에너지', '공기 중 산소가 가지고 있던 에너지'],
            answer: 1,
            feedback: ['물은 광합성의 재료이지만 에너지를 가지고 있어서 쓰이는 것이 아니에요.', '', '거름(무기양분)은 식물이 자라는 데 필요하지만 에너지원은 아니에요. 에너지는 광합성으로 만든 양분에 들어 있어요.', '산소는 양분을 분해하는 호흡에 쓰이지만 에너지원은 아니에요.'],
            explain: '식물은 광합성으로 <b>빛에너지</b>를 양분(화학 에너지)에 저장해요. 우리가 먹는 식량의 에너지는 처음에 <b>햇빛</b>에서 온 거예요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  refreshUI();
  SciSim.loop((dt) => { update(dt); draw(); });
  window.__sim = {
    VW, VH, LAY, LX, PL, LAB, CARDS, USE, FX, ZX, PH_ROOT_P, PH_FRUIT_P, XYL, TUBE, SAMP,
    get game() { return game; },
    get scene() { return scene; },
    setScene, setDay, setFoil, leafNext, leafSet, labTest, labSelect, labFill, labReset, resetLeaf, plantReset, pkDown, pkMove, pkUp, update, draw,
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    runLeaf() { const n = 3; for (let k = 0; k < n; k++) { LX.act || leafNext(); const m = Math.round((LDUR.decol + 1) * 60); for (let i = 0; i < m && LX.act; i++) update(1 / 60); } },
    solveCards() { CARDS.reset(); CARDS.slots.forEach((s) => { const c = CARDS.chips.find((q) => !q.slot && s.accept.indexOf(q.kind) >= 0); CARDS.place(c, s); }); },
    solveUse() { USE.reset(); const want = { A: 'light', B: 'sugar', C1: 'resp', C2: 'grow', D: 'eat' }; Object.keys(want).forEach((id) => { const s = USE.slots.find((q) => q.id === id), c = USE.chips.find((q) => q.kind === want[id]); USE.place(c, s); }); },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / VW, y: r.top + (y * r.height) / VH }; },
    ss2s(x, y) { return this.v2s(LAY.x + x * LAY.s, LAY.y + y * LAY.s); },
    bench(n) { const t0 = performance.now(); let mx = 0; for (let i = 0; i < n; i++) { const a = performance.now(); update(1 / 60); draw(); mx = Math.max(mx, performance.now() - a); } return { avg: (performance.now() - t0) / n, max: mx }; },
  };
})();
