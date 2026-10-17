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
     중2 Ⅴ. 식물과 에너지 — 광합성과 호흡 [9과12-02]
     ① [실험] BTB 실험: A(검정말+빛) 파랗게, B(검정말+어둠) 노랗게, C(식물 없음) 변화 없음 = 대조군
     ② [탐구] 낮과 밤: 빛의 세기에 따라 광합성량과 호흡량을 비교 → 기체 출입이 바뀌는 빛 세기 찾기
     ③ [설명] 비교: 광합성 vs 호흡 표(장소·때·재료·산물·에너지) 채우기
     ④ [적용] 침실의 화분(호흡으로 나오는 이산화 탄소는 아주 적어요), 낮에도 식물은 호흡한다
     ========================================================= */
  let game = null;
  let F = new Set();
  let scene = 'btb';
  const SCENE_LABEL = { btb: '🧪 BTB 용액으로 기체 출입 알아보기', day: '🍃 낮과 밤의 기체 출입', table: '📋 광합성과 호흡 비교하기', room: '🛏️ 밤의 침실과 화분' };

  /* ---------- BTB 실험 ---------- */
  const BC = { blue: '#2f6fe0', green: '#3cb371', yellow: '#f4d23c' };
  const btbCol = (c) => (c < 0 ? mix(BC.green, BC.blue, Math.min(1, -c)) : mix(BC.green, BC.yellow, Math.min(1, c)));
  const TB = { TY: 176, TH: 196, TW: 60, XS: [160, 290, 420], LIQ: 0.8 };
  const BTB = { time: 0, run: false, tubes: [], tap: true, seen: false, flipN: 0 };
  function resetBtb(keepCover) {
    const cov = BTB.tubes.map((t) => t.cover);
    BTB.tubes = [
      { id: 'A', plant: true, cover: false, c: 0, cs: 0, cp: 0, fx: new Streams(40), tm: 0, dots: [] },
      { id: 'B', plant: true, cover: true, c: 0, cs: 0, cp: 1, fx: new Streams(40), tm: 0, dots: [] },
      { id: 'C', plant: false, cover: false, c: 0, cs: 0, cp: 0, fx: new Streams(40), tm: 0, dots: [] },
    ];
    if (keepCover && cov.length) BTB.tubes.forEach((t, i) => { t.cover = cov[i]; t.cp = cov[i] ? 1 : 0; });
    BTB.tubes.forEach((t) => { for (let k = 0; k < 24; k++) t.dots.push({ x: rand(-TB.TW / 2 + 12, TB.TW / 2 - 12), y: rand(TB.TH * 0.28, TB.TH - 24), a: rand(0, TAU), r: rand(0, 1) }); });
    BTB.time = 0; BTB.run = false;
  }
  resetBtb(false);

  function toggleTube(i) {
    if (!BTB.tubes[i].plant) { hint('C는 식물이 없는 비교 시험관이라 그대로 두어요.', 3200); Sound.click(); return; }
    if (BTB.time > 0) { resetBtb(true); hint('조건을 바꿨어요. 실험을 처음부터 다시 해요.', 2600); }
    const t = BTB.tubes[i];
    t.cover = !t.cover; BTB.tap = false; BTB.flipN++;
    Sound.click();
    t.fx.clear();
    syncBtbUI();
  }
  function setBtbRun(on) {
    if (BTB.time >= 3 && on) { const cov = BTB.tubes.map((t) => t.cover); resetBtb(true); cov.forEach((c, i) => { BTB.tubes[i].cover = c; BTB.tubes[i].cp = c ? 1 : 0; }); }
    BTB.run = on;
    syncBtbUI();
  }
  function updateBtb(dt) {
    const B = BTB, ap = SciSim.approach, hrs = dt * 0.34;
    if (B.run) {
      B.time = Math.min(3, B.time + hrs);
      if (B.time >= 3) { B.run = false; Sound.success(); syncBtbUI(); }
    }
    B.tubes.forEach((tb, i) => {
      tb.cp = ap(tb.cp, tb.cover ? 1 : 0, dt, RM ? 60 : 6);
      const lit = tb.cp < 0.5;
      if (B.run && tb.plant) tb.c = clamp(tb.c + (lit ? -0.3 : 0.3) * hrs, -1, 1);
      tb.cs = ap(tb.cs, tb.c, dt, 8);
      // 입자 효과: 빛이 있으면 이산화 탄소 흡수 + 산소 기포, 어두우면 이산화 탄소 방출
      if (B.run && tb.plant && !RM) {
        tb.tm -= dt;
        if (tb.tm <= 0) {
          tb.tm = 0.32;
          const sx = rand(-8, 8), sy = TB.TH - 26 - rand(0, 80);
          if (lit) {
            tb.fx.add(new Path([[sx, sy], [sx + rand(-6, 6), TB.TH * 0.24]]), 'o2', 34, { u: 2.7, fade: 8, jig: 1.5 });
            tb.fx.add(new Path([[rand(-22, 22), rand(TB.TH * 0.3, TB.TH - 30)], [sx, sy]]), 'co2', 30, { u: 2.6, fade: 8, jig: 1 });
          } else {
            tb.fx.add(new Path([[sx, sy], [rand(-22, 22), rand(TB.TH * 0.3, TB.TH - 30)]]), 'co2', 30, { u: 2.6, fade: 8, jig: 1 });
          }
        }
      }
      tb.fx.update(dt);
      tb.dots.forEach((d) => { d.a += dt * 0.8; d.x = clamp(d.x + Math.cos(d.a * 1.3 + d.r * 6) * 7 * dt, -TB.TW / 2 + 12, TB.TW / 2 - 12); d.y = clamp(d.y + Math.sin(d.a + d.r * 5) * 7 * dt, TB.TH * 0.28, TB.TH - 22); });
    });
  }
  function tubePath(c, x, y, w, h) {
    c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y + h - w / 2); c.arc(x, y + h - w / 2, w / 2, Math.PI, 0, true); c.lineTo(x + w / 2, y);
  }
  function drawSprig(x, y, t, seed) {
    for (let i = 0; i < 2; i++) {
      const x0 = x + (i ? 9 : -9), tip = [x0 + (i ? 6 : -6), y - 98 + i * 12];
      ctx.strokeStyle = '#2f7d3a'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      const pts = [];
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) {
        const s = k / 12, sw = Math.sin(t * 1.3 + s * 3 + i + seed) * 3.4 * s * s;
        pts.push([x0 + (tip[0] - x0) * s + sw, y - (y - tip[1]) * s]);
        ctx[k ? 'lineTo' : 'moveTo'](pts[k][0], pts[k][1]);
      }
      ctx.stroke();
      ctx.lineWidth = 1.8; ctx.strokeStyle = i ? '#3fa14f' : '#34914a';
      for (let k = 1; k <= 12; k++) {
        const p = pts[k];
        for (let q = 0; q < 4; q++) { const a = (q / 4) * TAU + k * 0.9 + i; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + Math.cos(a) * 10, p[1] + Math.sin(a) * 5 - 2); ctx.stroke(); }
      }
    }
  }
  function drawTube(tb, i) {
    const x = TB.XS[i], y = TB.TY, w = TB.TW, h = TB.TH, t = CLK.t, lit = tb.cp < 0.5;
    const liqY = y + h * (1 - TB.LIQ);
    // 시험관 그림자
    contactShadow(x, y + h + 8, 40, 8, 0.8);
    ctx.save();
    tubePath(ctx, x, y, w, h); ctx.closePath(); ctx.clip();
    const col = btbCol(tb.cs);
    ctx.fillStyle = lgrad(0, liqY, 0, y + h, [[0, shade(col, 0.18)], [1, col]]);
    ctx.fillRect(x - w, liqY, w * 2, h);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x - w / 2, liqY - 1, w, 3);
    if (tb.plant) drawSprig(x, y + h - 14, t, i);
    // 용액 속 이산화 탄소 (많을수록 노랗고 적을수록 파래져요)
    const n = clamp(11 + 10.5 * tb.cs, 0.5, 22), nf = Math.floor(n), fr = n - nf;
    ctx.save(); ctx.translate(x, y);
    for (let k = 0; k < nf + 1 && k < tb.dots.length; k++) { const d = tb.dots[k]; drawMol('co2', d.x, d.y, 2.7, d.a, k === nf ? fr : 0.95); }
    ctx.save(); ctx.translate(0, 0);
    tb.fx.draw();
    ctx.restore();
    ctx.restore();
    // 빛이 닿은 쪽이 밝아요
    if (lit) { ctx.fillStyle = 'rgba(255,250,200,.16)'; ctx.fillRect(x - w / 2, liqY, w, h); }
    ctx.restore();
    // 유리
    ctx.save(); tubePath(ctx, x, y, w, h); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, y + 14); ctx.lineTo(x - w / 2 + 6, y + h - 26); ctx.stroke();
    ctx.restore();
    // 고무마개
    ctx.fillStyle = lgrad(0, y - 22, 0, y + 6, [[0, '#d98a4b'], [1, '#a9622c']]);
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 4, y - 22); ctx.lineTo(x + w / 2 + 4, y - 22); ctx.lineTo(x + w / 2 - 3, y + 8); ctx.lineTo(x - w / 2 + 3, y + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x - w / 2, y - 20, w * 0.35, 3);
    // 알루미늄 포일
    if (tb.cp > 0.01) {
      const top = y - 34, hh = (h + 44) * ease.outCubic(tb.cp);
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.12 * (1 - tb.cp);
      D.shadow(() => {
        ctx.fillStyle = lgrad(x - w / 2 - 8, 0, x + w / 2 + 8, 0, [[0, '#9aa7b8'], [0.3, '#e9eef5'], [0.55, '#aeb9c8'], [1, '#7f8ca0']]);
        D.roundRect(x - w / 2 - 8, top, w + 16, hh, 10); ctx.fill();
      }, { blur: 8, y: 3 });
      ctx.fillStyle = 'rgba(25,32,50,.34)'; D.roundRect(x - w / 2 - 8, top, w + 16, hh, 10); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - 18 + k * 18, top + 8); ctx.lineTo(x - 22 + k * 18, top + hh - 8); ctx.stroke(); }
      if (tb.cp > 0.9) { text(x, top + hh / 2 - 2, '🌙', { size: 22, weight: 400 }); text(x, top + hh / 2 + 20, '어둠', { size: 13, weight: 800, color: '#fff', stroke: 'rgba(0,0,0,.4)', strokeWidth: 3 }); }
      ctx.restore();
    }
    // 이산화 탄소 눈금
    const mx = x + 46, my = y + 24, mh = 118, p = (tb.cs + 1) / 2;
    text(mx, my - 8, 'CO₂', { size: 12.5, weight: 800, color: COL.muted });
    ctx.fillStyle = '#e8eef5'; D.roundRect(mx - 6, my, 12, mh, 6); ctx.fill();
    ctx.fillStyle = btbCol(tb.cs); const fh = Math.max(8, mh * p); D.roundRect(mx - 6, my + mh - fh, 12, fh, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; ctx.strokeRect(mx - 6, my + mh / 2, 12, 0);
    text(mx + 12, my + 12, '많음', { size: 11.5, weight: 700, color: COL.muted, align: 'left' });
    text(mx + 12, my + mh, '적음', { size: 11.5, weight: 700, color: COL.muted, align: 'left' });
  }

  function drawBtb() {
    const B = BTB, t = CLK.t;
    ctx.fillStyle = lgrad(0, 0, 0, SH, [[0, '#f4f9f1'], [1, '#e1efdb']]); ctx.fillRect(0, 0, SW, SH);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 5; i++) ctx.fillRect(18 + i * 104, 0, 2, SH);
    // 전등
    const lampOn = true;
    D.glow(290, 56, 260, '#fff3b0', 0.22);
    ctx.save();
    D.shadow(() => { ctx.fillStyle = lgrad(0, 22, 0, 52, [[0, '#7a8aa0'], [1, '#4a586b']]); D.roundRect(108, 22, 364, 30, 15); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.fillStyle = '#fff6c4'; D.roundRect(124, 44, 332, 10, 5); ctx.fill();
    ctx.restore();
    text(58, 40, '☀️ 전등', { size: 13.5, weight: 800, color: '#8a5a00' });
    // 빛줄기 (포일을 씌운 시험관에는 닿지 않아요)
    B.tubes.forEach((tb, i) => {
      const x = TB.XS[i], endY = TB.TY - 36 + (tb.cp > 0.5 ? 0 : 130 + tb.cp * 0);
      const blocked = tb.cp > 0.5;
      const bottom = blocked ? TB.TY - 36 : TB.TY + 120;
      ctx.save();
      ctx.fillStyle = 'rgba(255,240,150,' + (blocked ? 0.16 : 0.2) + ')';
      ctx.beginPath(); ctx.moveTo(x - 46, 54); ctx.lineTo(x + 46, 54); ctx.lineTo(x + 34, bottom); ctx.lineTo(x - 34, bottom); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,110,.75)'; ctx.lineWidth = 2; ctx.setLineDash([9, 10]); ctx.lineDashOffset = -t * 40;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * 28, 58); ctx.lineTo(x + k * 22, bottom); ctx.stroke(); }
      ctx.setLineDash([]); ctx.restore();
    });
    // 시험관 받침대
    ctx.fillStyle = lgrad(0, 372, 0, 408, [[0, '#d9bd8e'], [1, '#b99668']]); D.roundRect(70, 372, 380, 36, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(76, 374, 368, 3);
    B.tubes.forEach((tb, i) => drawTube(tb, i));
    // 이름표
    B.tubes.forEach((tb, i) => {
      const x = TB.XS[i], lit = !tb.cover;
      D.sphere(x - 54, 430, 15, tb.plant ? '#16a34a' : '#64748b', { text: tb.id, textScale: 1.0, gloss: false });
      text(x - 34, 427, tb.plant ? '검정말' : '식물 없음', { size: 13.5, weight: 800, align: 'left', color: COL.ink });
      text(x - 34, 445, lit ? '☀️ 빛 있음' : '🌙 어둠 (포일)', { size: 13, weight: 700, align: 'left', color: lit ? '#b45309' : '#475569' });
    });
    // 시간
    panel(12, 66, 104, 60, 14, 'rgba(255,255,255,.95)');
    text(64, 88, '⏱ 경과 시간', { size: 12.5, weight: 800, color: COL.muted });
    text(64, 114, f1(B.time) + ' 시간', { size: 20, weight: 800, color: '#14532d' });
    ctx.fillStyle = '#e4eaf2'; D.roundRect(20, 118, 88, 5, 3); ctx.fill();
    ctx.fillStyle = '#16a34a'; D.roundRect(20, 118, 88 * (B.time / 3), 5, 3); ctx.fill();
    // BTB 색 안내
    const ly = 472;
    [[BC.blue, '파랑: 이산화 탄소 적음'], [BC.green, '초록: 보통'], [BC.yellow, '노랑: 이산화 탄소 많음']].forEach((o, k) => {
      const lx = 22 + k * 168;
      D.sphere(lx, ly, 8, o[0], { gloss: false });
      text(lx + 14, ly + 5, o[1], { size: 12.5, weight: 800, align: 'left', color: COL.ink });
    });
    if (B.tap && B.time === 0) D.label(290, 144, '👆 시험관을 누르면 포일을 씌우고 벗길 수 있어요', { bg: rgba('#16a34a', 0.95), size: 13.5 });
    if (B.time >= 3) D.label(290, 144, '3시간 뒤의 모습이에요', { bg: rgba('#0f172a', 0.82), size: 14 });
    if (B.run) D.label(290, 144, '⏩ 시간이 빠르게 흘러요', { bg: rgba('#0f172a', 0.78), size: 14 });
  }

  /* ---------- 낮과 밤: 광합성량 vs 호흡량 ---------- */
  const DAY = { L: 80, Ls: 80, fl: [new Streams(80), new Streams(80)], acc: [0, 0, 0, 0], visited: { night: false, noon: false }, st: 'out', seen: false };
  const CP = { x: 168, y: 236, rx: 64, ry: 40 }, MP = { x: 350, y: 258 }, STO = { x: 262, y: 338 };
  const R_RESP = 30;
  const Pof = (L) => 0.9 * L;
  const dayState = (L) => { const net = Pof(L) - R_RESP; return net > 2.5 ? 'out' : net < -2.5 ? 'in' : 'eq'; };

  function dayPath(kind, dir) {
    const sx = STO.x + rand(-6, 6), ex = STO.x + rand(-44, 44);
    if (kind === 'o2') {
      if (dir === 'out') return new Path([[CP.x + 20, CP.y + 30], [236, 292], [sx, 330], [sx + rand(-4, 4), 372], [ex, 462]]);
      return new Path([[ex, 462], [sx + rand(-4, 4), 372], [sx, 330], [292, 296], [MP.x - 14, MP.y + 24]]);
    }
    if (dir === 'in') return new Path([[ex, 462], [sx + rand(-4, 4), 372], [sx, 330], [234, 290], [CP.x + 10, CP.y + 34]]);
    return new Path([[MP.x - 14, MP.y + 24], [292, 296], [sx, 330], [sx + rand(-4, 4), 372], [ex, 462]]);
  }
  function updateDay(dt) {
    const D_ = DAY, ap = SciSim.approach;
    D_.Ls = ap(D_.Ls, D_.L, dt, RM ? 60 : 7);
    const P = Pof(D_.Ls), R = R_RESP, net = P - R;
    D_.st = dayState(D_.Ls);
    // 안쪽에서 서로 주고받는 기체 (광합성의 산소 → 호흡 / 호흡의 이산화 탄소 → 광합성)
    const inner = Math.min(P, R) / 100 * 4.2, outer = Math.abs(net) / 100 * 5.2;
    D_.acc[0] += inner * dt; D_.acc[1] += outer * dt;
    while (D_.acc[0] >= 1) {
      D_.acc[0] -= 1;
      D_.fl[0].add(new Path([[CP.x + 52, CP.y - 10], [240, 196 + rand(-6, 6)], [MP.x - 44, MP.y - 12]]), 'o2', 70, { u: 4.4, fade: 12 });
      D_.fl[0].add(new Path([[MP.x - 44, MP.y + 10], [262, 304 + rand(-6, 6)], [CP.x + 48, CP.y + 22]]), 'co2', 70, { u: 4.4, fade: 12 });
    }
    while (D_.acc[1] >= 1) {
      D_.acc[1] -= 1;
      if (net > 0) { D_.fl[1].add(dayPath('o2', 'out'), 'o2', 92, { u: 5, fade: 14 }); D_.fl[1].add(dayPath('co2', 'in'), 'co2', 92, { u: 5, fade: 14 }); }
      else { D_.fl[1].add(dayPath('o2', 'in'), 'o2', 92, { u: 5, fade: 14 }); D_.fl[1].add(dayPath('co2', 'out'), 'co2', 92, { u: 5, fade: 14 }); }
    }
    D_.fl.forEach((s) => s.update(dt));
    if (D_.L <= 3) D_.visited.night = true;
    if (D_.L >= 80) D_.visited.noon = true;
  }
  function mitochondrion(x, y, rx, ry, glow) {
    ctx.save(); ctx.translate(x, y);
    if (glow > 0.02) D.glow(0, 0, rx * 1.9, '#ffb36b', 0.15 + 0.55 * glow);
    ctx.fillStyle = lgrad(0, -ry, 0, ry, [[0, '#ffc6a3'], [1, '#f08a5d']]);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c65a2e'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = '#d4693a'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    for (let k = -3; k <= 3; k++) {
      const px = (k / 3.5) * rx * 0.78;
      ctx.beginPath(); ctx.moveTo(px, -ry * 0.78 * Math.sqrt(1 - Math.pow(px / rx, 2)));
      ctx.quadraticCurveTo(px + rx * 0.1, -ry * 0.2, px, ry * 0.1 * (k % 2 ? 1 : -1));
      ctx.quadraticCurveTo(px - rx * 0.1, ry * 0.4, px, ry * 0.78 * Math.sqrt(1 - Math.pow(px / rx, 2)));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(-rx * 0.4, -ry * 0.55, rx * 0.25, ry * 0.13, -0.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawDay() {
    const D_ = DAY, L = D_.Ls, dayV = smooth(L / 55), t = CLK.t;
    skyRect(0, 0, SW, SH, dayV);
    drawSun(64, 62, 24, clamp(L / 30, 0, 1));
    drawMoon(64, 62, 21, clamp(1 - L / 22, 0, 1));
    cloud(262, 60, 0.8, 0.85 * dayV); cloud(342, 106, 0.5, 0.7 * dayV);
    ctx.fillStyle = lgrad(0, 454, 0, SH, [[0, mix('#1e3d34', '#86d27c', dayV)], [1, mix('#14291f', '#4fa65a', dayV)]]); ctx.fillRect(0, 456, SW, SH - 456);
    // 햇빛이 엽록체로
    if (L > 6) {
      ctx.save(); ctx.globalAlpha = clamp(L / 100, 0, 1) * 0.5;
      ctx.fillStyle = '#fff3a8'; ctx.beginPath(); ctx.moveTo(52, 56); ctx.lineTo(76, 72); ctx.lineTo(CP.x + 28, CP.y - 28); ctx.lineTo(CP.x - 40, CP.y - 38); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // 잎 단면
    ctx.save();
    D.shadow(() => { ctx.fillStyle = mix('#5fa958', '#2c5b45', (1 - dayV) * 0.7); D.roundRect(24, 142, 472, 208, 30); ctx.fill(); }, { blur: 14, y: 6 });
    ctx.fillStyle = lgrad(0, 142, 0, 350, [[0, mix('#5fa958', '#2c5b45', (1 - dayV) * 0.7)], [1, mix('#4a9a4b', '#244d3a', (1 - dayV) * 0.7)]]); D.roundRect(24, 142, 472, 208, 30); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 9; i++) { D.roundRect(34 + i * 52, 148, 46, 18, 7); ctx.fill(); D.roundRect(34 + i * 52, 328, 46, 18, 7); ctx.fill(); }
    // 세포 (확대 그림)
    ctx.fillStyle = lgrad(0, 172, 0, 322, [[0, mix('#f3fbe4', '#bcd0b6', (1 - dayV) * 0.6)], [1, mix('#e1f3c8', '#a9c0a2', (1 - dayV) * 0.6)]]);
    ctx.strokeStyle = '#6fa843'; ctx.lineWidth = 5; D.roundRect(56, 170, 408, 152, 30); ctx.fill(); ctx.stroke();
    ctx.restore();
    // 기공
    const gg = 7;
    ctx.fillStyle = lgrad(0, 300, 0, 360, [[0, mix('#e9f8ff', '#27406e', 1 - dayV)], [1, mix('#e9f8ff', '#27406e', 1 - dayV)]]); ctx.fillRect(STO.x - gg, 316, gg * 2, 40);
    [-1, 1].forEach((sd) => {
      ctx.save(); ctx.translate(STO.x + sd * (gg + 9), 338);
      const g2 = ctx.createRadialGradient(-3 * sd, -4, 2, 0, 0, 22); g2.addColorStop(0, '#a8e68f'); g2.addColorStop(1, '#4fae4b');
      ctx.fillStyle = g2; ctx.strokeStyle = '#2f8a3c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 11, 22, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    });
    // 엽록체와 미토콘드리아
    const Pn = Pof(L) / 100, Rn = R_RESP / 100;
    drawChloroplast(CP.x, CP.y, CP.rx, CP.ry, -0.1, { light: L > 20 });
    if (Pn < 0.05) { ctx.fillStyle = 'rgba(30,40,60,.22)'; ctx.beginPath(); ctx.ellipse(CP.x, CP.y, CP.rx, CP.ry, -0.1, 0, TAU); ctx.fill(); }
    else D.glow(CP.x, CP.y, CP.rx * 1.4, '#fff3a0', 0.45 * Pn);
    mitochondrion(MP.x, MP.y, 52, 28, 1);
    D_.fl[0].draw(); D_.fl[1].draw();
    // 이름표
    D.label(CP.x, 188 - 4, '엽록체 (광합성)', { bg: rgba('#15803d', 0.95), size: 14 });
    D.label(MP.x, 214, '미토콘드리아 (호흡)', { bg: rgba('#c2410c', 0.95), size: 14 });
    D.label(STO.x + 78, 368, '기공', { bg: rgba('#334155', 0.92), size: 13.5 });
    // 결과 말풍선
    const st = D_.st;
    const msg = st === 'out' ? '광합성량 > 호흡량 → 산소 방출 · 이산화 탄소 흡수' : st === 'in' ? '광합성량 < 호흡량 → 산소 흡수 · 이산화 탄소 방출' : '광합성량 = 호흡량 → 겉으로 보이는 기체 출입이 없어요';
    D.label(SW / 2, 428, msg, { bg: rgba(st === 'out' ? '#15803d' : st === 'in' ? '#c2410c' : '#475569', 0.95), size: 14.5, pad: 12 });
    // 기체 방향 화살표 (기공 아래)
    if (st !== 'eq') {
      const up = st === 'out';
      D.label(STO.x - 104, 392, up ? 'O₂ ↓ 나가요' : 'O₂ ↑ 들어와요', { bg: rgba('#ef4444', 0.92), size: 13.5 });
      D.label(STO.x + 118, 392, up ? 'CO₂ ↑ 들어와요' : 'CO₂ ↓ 나가요', { bg: rgba('#475569', 0.92), size: 13.5 });
    } else {
      D.label(STO.x, 392, '안에서 서로 주고받아요', { bg: rgba('#475569', 0.92), size: 13.5 });
    }
    // 범례
    legendItem(398, 24, 'co2', '이산화 탄소', { u: 3.2, size: 12.5 });
    legendItem(398, 50, 'o2', '산소', { u: 3.2, size: 12.5 });
  }
  function drawDayPanel() {
    const p = LAY.pn, L = DAY.Ls, P = Pof(L), R = R_RESP, st = DAY.st;
    panel(p.x, p.y, p.w, p.h, 14);
    const bar = (cx, base, hMax, v, col, name) => {
      const h = hMax * clamp(v / 100, 0, 1);
      ctx.fillStyle = '#e8eef5'; D.roundRect(cx - 28, base - hMax, 56, hMax, 10); ctx.fill();
      const g = lgrad(0, base - h, 0, base, [[0, shade(col, 0.25)], [1, col]]);
      if (v > 0.5) { ctx.fillStyle = g; D.roundRect(cx - 28, base - Math.max(h, 6), 56, Math.max(h, 6), 10); ctx.fill(); }
      text(cx, base - h - 8, Math.round(v) + '', { size: 17, weight: 800, color: col });
      text(cx, base + 20, name, { size: 14, weight: 800, color: COL.ink });
    };
    let bx1, bx2, base, hMax, cy;
    if (!PHONE) { bx1 = p.x + 62; bx2 = p.x + p.w - 62; base = p.y + 232; hMax = 150; text(p.x + p.w / 2, p.y + 26, '광합성량과 호흡량', { size: 17, weight: 800, color: '#14532d' }); }
    else { bx1 = p.x + 50; bx2 = p.x + 168; base = p.y + 196; hMax = 120; text(p.x + 110, p.y + 24, '광합성량과 호흡량', { size: 15, weight: 800, color: '#14532d' }); }
    bar(bx1, base, hMax, P, '#16a34a', '광합성량');
    bar(bx2, base, hMax, R, '#ea7a2f', '호흡량');
    const sym = st === 'out' ? '>' : st === 'in' ? '<' : '=';
    text((bx1 + bx2) / 2, base - hMax / 2 + 14, sym, { size: 38, weight: 800, color: st === 'eq' ? '#475569' : st === 'out' ? '#16a34a' : '#ea7a2f' });
    // 겉으로 보이는 기체 출입
    const rows = [['o2', '산소', st === 'out' ? '방출' : st === 'in' ? '흡수' : '출입 없음', st === 'out' ? 1 : st === 'in' ? -1 : 0], ['co2', '이산화 탄소', st === 'out' ? '흡수' : st === 'in' ? '방출' : '출입 없음', st === 'out' ? -1 : st === 'in' ? 1 : 0]];
    let ry0, rx0, rw;
    if (!PHONE) { ry0 = p.y + 290; rx0 = p.x + 12; rw = p.w - 24; text(p.x + p.w / 2, ry0 - 12, '겉으로 드러나는 기체 출입', { size: 14, weight: 800, color: COL.muted }); }
    else { ry0 = p.y + 62; rx0 = p.x + 232; rw = p.w - 232 - 8; text(rx0 + rw / 2, ry0 - 18, '기체 출입', { size: 14, weight: 800, color: COL.muted }); }
    rows.forEach((r, i) => {
      const y = ry0 + i * (PHONE ? 84 : 70);
      ctx.fillStyle = r[3] === 0 ? '#eef2f7' : r[3] > 0 === (r[0] === 'o2') ? 'rgba(22,163,74,.10)' : 'rgba(234,122,47,.10)';
      D.roundRect(rx0, y, rw, PHONE ? 74 : 60, 12); ctx.fill();
      drawMol(r[0], rx0 + 30, y + (PHONE ? 22 : 30), 5, 0, 1);
      text(rx0 + (PHONE ? 8 : 62), y + (PHONE ? 52 : 26), r[1], { size: PHONE ? 13 : 14.5, weight: 800, align: 'left', color: COL.ink });
      const lab = r[2];
      D.label(rx0 + (PHONE ? rw - 8 : rw - 10), y + (PHONE ? 22 : 46), (r[3] > 0 ? (r[0] === 'o2' ? '↗ ' : '↗ ') : r[3] < 0 ? '↙ ' : '') + lab, { bg: r[3] === 0 ? rgba('#64748b', 0.95) : r[0] === 'o2' ? rgba('#ef4444', 0.95) : rgba('#475569', 0.95), size: 13.5, align: 'right', pad: 8 });
      if (r[3] !== 0 && !PHONE) text(rx0 + 62, y + 46, r[3] > 0 ? '식물 밖으로' : '식물 안으로', { size: 12.5, weight: 700, align: 'left', color: COL.muted });
    });
    if (!PHONE) {
      const s2 = st === 'eq' ? '두 양이 같을 때는 안에서 서로 이용해요.' : st === 'out' ? '광합성으로 만든 산소가 호흡에 쓰이고도 남아요.' : '호흡에 필요한 산소가 광합성으로 모자라요.';
      wrapText(p.x + p.w / 2, p.y + 452, s2, p.w - 28, { size: 13, weight: 700, color: COL.muted, lh: 16 });
    }
  }

  /* ---------- 침실: 밤의 화분 ---------- */
  const ROOM = { pots: 1, ps: 1, fl: new Streams(70), accP: 0, accH: 0, zz: 0 };
  function potXY(i) { const row = i < 5 ? 0 : 1, k = i % 5; return { x: 318 + k * 44, y: row ? 322 : 246 }; }
  function updateRoom(dt) {
    const R = ROOM;
    R.ps = SciSim.approach(R.ps, R.pots, dt, 8);
    R.accH += dt * 3.0; R.accP += dt * 0.034 * R.pots;
    while (R.accH >= 1) { R.accH -= 1; const x0 = 92 + rand(-4, 4); R.fl.add(new Path([[x0, 262], [x0 + 40, 220 + rand(-10, 10)], [x0 + 110 + rand(-20, 20), 130], [x0 + 200 + rand(-30, 30), 60]]), 'co2', 46, { u: 4.6, fade: 20, jig: 4 }); }
    while (R.accP >= 1) { R.accP -= 1; const q = potXY(Math.floor(rand(0, R.pots))); R.fl.add(new Path([[q.x, q.y - 26], [q.x + 20, q.y - 70], [q.x + 40, q.y - 130]]), 'co2', 34, { u: 4.6, fade: 20, jig: 3 }); }
    R.fl.update(dt);
    R.zz += dt;
  }
  function drawRoom() {
    const R = ROOM, t = CLK.t;
    ctx.fillStyle = lgrad(0, 0, 0, SH, [[0, '#1f2f55'], [1, '#2b3d6b']]); ctx.fillRect(0, 0, SW, SH);
    // 창문
    ctx.fillStyle = '#0c1a3a'; D.roundRect(34, 34, 150, 130, 8); ctx.fill();
    STARS.slice(0, 14).forEach((s) => { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 1.6 + s.p); ctx.fillStyle = '#fff'; circle(ctx, 40 + s.x * 138, 42 + s.y * 110, s.r); ctx.fill(); }); ctx.globalAlpha = 1;
    drawMoon(130, 78, 20, 1);
    ctx.strokeStyle = '#c9a97a'; ctx.lineWidth = 6; D.roundRect(34, 34, 150, 130, 8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(109, 34); ctx.lineTo(109, 164); ctx.moveTo(34, 99); ctx.lineTo(184, 99); ctx.stroke();
    // 바닥
    ctx.fillStyle = lgrad(0, 380, 0, SH, [[0, '#6b4f3a'], [1, '#4a3526']]); ctx.fillRect(0, 384, SW, SH - 384);
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, 384, SW, 3);
    // 침대
    contactShadow(150, 398, 140, 12, 0.9);
    ctx.fillStyle = '#8a5a34'; D.roundRect(22, 318, 240, 70, 10); ctx.fill();
    ctx.fillStyle = '#f2efe9'; D.roundRect(34, 292, 216, 40, 14); ctx.fill();
    ctx.fillStyle = '#fff'; D.roundRect(40, 272, 70, 30, 14); ctx.fill();                       // 베개
    ctx.fillStyle = '#f2c9a0'; circle(ctx, 76, 282, 15); ctx.fill();                              // 얼굴
    ctx.fillStyle = '#3b2a1f'; ctx.beginPath(); ctx.arc(76, 278, 15, Math.PI, 0); ctx.fill();   // 머리카락
    ctx.fillStyle = lgrad(0, 290, 0, 330, [[0, '#7c8de0'], [1, '#5a6bc4']]); D.roundRect(70, 286, 180, 46, 16); ctx.fill();  // 이불
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(72, 283, 3, 0.2, Math.PI - 0.2); ctx.stroke();
    const zz = 0.5 + 0.5 * Math.sin(R.zz * 2);
    text(110, 258 - zz * 6, 'Z', { size: 20, weight: 800, color: rgba('#cfe0ff', 0.9) }); text(126, 240 - zz * 8, 'z', { size: 15, weight: 800, color: rgba('#cfe0ff', 0.7) });
    D.label(76, 408, '🧑 사람 1명 (잠자는 중)', { bg: rgba('#334155', 0.9), size: 13.5 });
    // 선반 + 화분
    [[246, '#9a6b3d'], [322, '#9a6b3d']].forEach((s) => { ctx.fillStyle = s[1]; D.roundRect(296, s[0] + 2, 228, 9, 4); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(300, s[0] + 11, 220, 3); });
    for (let i = 0; i < 10; i++) {
      const a = clamp(R.ps - i, 0, 1);
      if (a <= 0.01) continue;
      const q = potXY(i), s = ease.outBack(a);
      ctx.save(); ctx.translate(q.x, q.y + 1); ctx.scale(s, s);
      ctx.fillStyle = lgrad(0, -22, 0, 0, [[0, '#d08a55'], [1, '#a65f34']]);
      ctx.beginPath(); ctx.moveTo(-14, -20); ctx.lineTo(14, -20); ctx.lineTo(10, 0); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill();
      drawLeaf(0, -20, 26, 9, -1.1 + Math.sin(t + i) * 0.04, { shadow: false }); drawLeaf(0, -20, 24, 8, -2.05 + Math.sin(t + i + 1) * 0.04, { shadow: false }); drawLeaf(0, -20, 22, 8, -1.57, { shadow: false });
      ctx.restore();
    }
    R.fl.draw();
    D.label(410, 408, '🪴 화분 ' + R.pots + '개', { bg: rgba('#15803d', 0.92), size: 13.5 });
    D.label(260, 46, '🌙 밤: 사람도 식물도 호흡을 해요', { bg: rgba('#0f172a', 0.7), size: 14.5, pad: 12 });
    legendItem(236, 100, 'co2', '이산화 탄소', { u: 3.4, size: 12.5, bg: 'rgba(255,255,255,.9)' });
  }
  function drawRoomPanel() {
    const p = LAY.pn, R = ROOM;
    panel(p.x, p.y, p.w, p.h, 14);
    const potVal = R.ps * 1;                         // 화분 1개 ≈ 사람 1명의 약 1/100
    const bar = (x, y, w, v, col, label, val) => {
      text(x, y - 8, label, { size: 14, weight: 800, align: 'left', color: COL.ink });
      text(x + w, y - 8, val, { size: 13.5, weight: 800, align: 'right', color: col });
      ctx.fillStyle = '#e8eef5'; D.roundRect(x, y, w, 22, 11); ctx.fill();
      ctx.fillStyle = col; D.roundRect(x, y, Math.max(3, w * clamp(v / 100, 0, 1)), 22, 11); ctx.fill();
    };
    if (!PHONE) {
      text(p.x + p.w / 2, p.y + 28, '밤에 내놓는 이산화 탄소', { size: 16, weight: 800, color: '#14532d' });
      text(p.x + p.w / 2, p.y + 48, '(대략적인 비교)', { size: 12.5, weight: 700, color: COL.muted });
      bar(p.x + 16, p.y + 98, p.w - 32, 100, '#475569', '🧑 사람 1명', '100');
      bar(p.x + 16, p.y + 168, p.w - 32, potVal, '#16a34a', '🪴 화분 ' + R.pots + '개', f1(potVal));
      D.label(p.x + p.w / 2, p.y + 236, '화분 ' + R.pots + '개 ≈ 사람의 약 ' + R.pots + ' %', { bg: rgba('#16a34a', 0.95), size: 14.5, pad: 12 });
      wrapText(p.x + p.w / 2, p.y + 312, '식물도 밤에 호흡해서 이산화 탄소를 내보내요.', p.w - 28, { size: 14, weight: 700, color: COL.ink, lh: 18 });
      wrapText(p.x + p.w / 2, p.y + 372, '하지만 그 양은 사람이 내쉬는 양에 비해 아주 적어서 방 안 공기에는 거의 영향이 없어요.', p.w - 28, { size: 14, weight: 700, color: COL.muted, lh: 18 });
    } else {
      text(p.x + p.w / 2, p.y + 22, '밤에 내놓는 이산화 탄소 (대략적인 비교)', { size: 14, weight: 800, color: '#14532d' });
      bar(p.x + 14, p.y + 62, p.w - 28, 100, '#475569', '🧑 사람 1명', '100');
      bar(p.x + 14, p.y + 112, p.w - 28, potVal, '#16a34a', '🪴 화분 ' + R.pots + '개', f1(potVal));
      D.label(p.x + p.w / 2, p.y + 168, '화분 ' + R.pots + '개 ≈ 사람의 약 ' + R.pots + ' %', { bg: rgba('#16a34a', 0.95), size: 13.5, pad: 10 });
      wrapText(p.x + p.w / 2, p.y + 214, '식물도 밤에 호흡하지만 내놓는 양은 사람에 비해 아주 적어요.', p.w - 28, { size: 13.5, weight: 700, color: COL.muted, lh: 17 });
    }
  }

  /* ---------- 비교표 (카드 끌어 놓기, 캔버스 전체 사용) ---------- */
  const TBL = new CardBoard();
  const TBG = {};
  const ROWS = [['place', '장소'], ['time', '일어나는 때'], ['in', '재료'], ['out', '산물'], ['energy', '에너지']];
  const TCOL = { place: '#0d9488', time: '#4f46e5', cw: '#d97706', go: '#d97706', energy: '#e11d48' };
  function buildTable() {
    TBL.slots.length = 0; TBL.chips.length = 0; TBL.drag = null; TBL.sel = null;
    const ans = { place: ['chloro', 'mito'], time: ['light', 'always'], in: ['CW', 'GO'], out: ['GO', 'CW'], energy: ['store', 'release'] };
    let sw, sh, cx1, cx2, rowY, trayR, hs;
    if (!PHONE) {
      sw = 136; sh = 46; cx1 = 312; cx2 = 616; rowY = (i) => 92 + i * 52;
      Object.assign(TBG, { panel: { x: 16, y: 8, w: 768, h: 322 }, head: [[cx1, 34], [cx2, 34]], rowLabel: (i) => ({ x: 34, y: rowY(i) + 5, align: 'left' }), tray: { x: 16, y: 338, w: 768, h: 166 }, cap: [34, 360] });
      hs = [];
      for (let k = 0; k < 10; k++) hs.push([104 + (k % 5) * 148 + 0, k < 5 ? 404 : 458]);
    } else {
      sw = 190; sh = 44; cx1 = 119; cx2 = 321; rowY = (i) => 92 + i * 64;
      Object.assign(TBG, { panel: { x: 8, y: 6, w: 424, h: 376 }, head: [[cx1, 30], [cx2, 30]], rowLabel: (i) => ({ x: 24, y: rowY(i) - 28, align: 'left' }), tray: { x: 8, y: 390, w: 424, h: 292 }, cap: [24, 412] });
      hs = [];
      for (let k = 0; k < 10; k++) hs.push([k % 2 ? 321 : 119, 450 + Math.floor(k / 2) * 52]);
    }
    ROWS.forEach((r, i) => {
      [0, 1].forEach((c) => {
        TBL.addSlot({ id: r[0] + '-' + c, row: r[0], x: (c ? cx2 : cx1) - sw / 2, y: rowY(i) - sh / 2, w: sw, h: sh, accept: [ans[r[0]][c]], ph: '', fill: 'rgba(255,255,255,.9)' });
      });
    });
    const chips = [['chloro', '엽록체', 'place'], ['mito', '미토콘드리아', 'place'], ['light', '빛이 있을 때', 'time'], ['always', '항상 (낮과 밤)', 'time'], ['CW', '이산화 탄소 + 물', 'cw'], ['GO', '포도당 + 산소', 'go'], ['store', '빛에너지를 양분에 저장', 'energy'], ['release', '양분의 에너지를 방출', 'energy'], ['CW', '이산화 탄소 + 물', 'cw'], ['GO', '포도당 + 산소', 'go']];
    const order = [5, 8, 1, 6, 3, 0, 9, 7, 2, 4];
    order.forEach((ci, i) => {
      const c = chips[ci];
      TBL.addChip({ id: c[0] + '-' + i, kind: c[0], label: c[1], hx: hs[i][0], hy: hs[i][1], w: sw, h: sh, color: TCOL[c[2]], size: PHONE ? 14.5 : 13.5 });
    });
  }
  buildTable();
  function drawTable() {
    ctx.fillStyle = '#eaf5e6'; ctx.fillRect(0, 0, VW, VH);
    const pr = TBG.panel;
    panel(pr.x, pr.y, pr.w, pr.h, 18, '#fff');
    // 줄무늬
    ROWS.forEach((r, i) => {
      const s = TBL.slots.find((q) => q.row === r[0]);
      const y = s.y + s.h / 2;
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(22,163,74,.06)'; ctx.fillRect(pr.x + 6, y - (PHONE ? 40 : 26), pr.w - 12, PHONE ? 66 : 52); }
      const l = TBG.rowLabel(i);
      text(l.x, l.y, r[1], { size: PHONE ? 14 : 16, weight: 800, align: 'left', color: '#14532d' });
    });
    D.label(TBG.head[0][0], TBG.head[0][1], '🌿 광합성', { bg: '#16a34a', size: 16, pad: 14 });
    D.label(TBG.head[1][0], TBG.head[1][1], '🔥 호흡', { bg: '#ea7a2f', size: 16, pad: 14 });
    const tr = TBG.tray;
    panel(tr.x, tr.y, tr.w, tr.h, 18, 'rgba(255,255,255,.7)');
    text(TBG.cap[0], TBG.cap[1], '🃏 카드 (끌어서 칸에 놓아요)', { size: 14.5, weight: 800, align: 'left', color: COL.muted });
    TBL.draw();
  }
  function tableFeedback() {
    if (TBL.filledCount() < 10) return '아직 빈 칸이 있어요. 카드 10장을 모두 놓아 보세요.';
    const w = TBL.wrongSlots();
    if (!w.length) return true;
    TBL.flagWrong(w);
    const rows = [];
    w.forEach((s) => { const nm = ROWS.find((r) => r[0] === s.row)[1]; if (rows.indexOf(nm) < 0) rows.push(nm); });
    const swapped = w.some((s) => s.row === 'in' || s.row === 'out');
    return '‘' + rows.join('’, ‘') + '’ 줄이 맞지 않아요.' + (swapped ? ' 광합성과 호흡은 재료와 산물이 서로 <b>반대</b>예요.' : ' 빨간 테두리 카드를 확인해 봐요.');
  }

  /* ---------- 갱신 · 그리기 ---------- */
  function sceneCard(fn) {
    softShadow(SSR.x, SSR.y, SSR.w, SSR.h, 20 * LAY.s, 16, 6, 'rgba(20,70,40,.24)');
    inScene(() => { rrPath(ctx, 0, 0, SW, SH, 20); ctx.clip(); fn(); FX.draw(ctx); drawChecks(0); });
  }
  function draw() {
    view.apply();
    ctx.fillStyle = '#eaf5e6'; ctx.fillRect(0, 0, VW, VH);
    if (scene === 'table') { drawTable(); FX.draw(ctx); drawChecks(0); return; }
    if (scene === 'btb') { sceneCard(drawBtb); drawBtbPanel(); }
    else if (scene === 'day') { sceneCard(drawDay); drawDayPanel(); }
    else if (scene === 'room') { sceneCard(drawRoom); drawRoomPanel(); }
  }
  /* BTB 오른쪽 패널: 색 변화 기록표 */
  function colName(c) { return c < -0.35 ? '파랑' : c > 0.35 ? '노랑' : '초록'; }
  function drawBtbPanel() {
    const p = LAY.pn, B = BTB;
    panel(p.x, p.y, p.w, p.h, 14);
    text(p.x + p.w / 2, p.y + 28, 'BTB 용액의 색', { size: 17, weight: 800, color: '#14532d' });
    const rows = B.tubes.map((tb) => ({ tb, name: tb.id + (tb.plant ? ' · 검정말' : ' · 식물 없음'), cond: tb.plant ? (tb.cover ? '어둠' : '빛') : '빛' }));
    const rh = PHONE ? 54 : 84, y0 = p.y + (PHONE ? 46 : 52);
    rows.forEach((r, i) => {
      const y = y0 + i * (rh + 10), c = r.tb.cs;
      ctx.fillStyle = '#f4f7fa'; D.roundRect(p.x + 12, y, p.w - 24, rh, 14); ctx.fill();
      D.sphere(p.x + 40, y + rh / 2, PHONE ? 16 : 22, btbCol(c), { shadow: true });
      text(p.x + (PHONE ? 66 : 74), y + (PHONE ? 22 : 30), r.name, { size: PHONE ? 13.5 : 14.5, weight: 800, align: 'left', color: COL.ink });
      text(p.x + (PHONE ? 66 : 74), y + (PHONE ? 42 : 54), (r.cond === '빛' ? '☀️ 빛 있음' : '🌙 어둠') + ' → ' + colName(c), { size: PHONE ? 13 : 14, weight: 800, align: 'left', color: c < -0.35 ? '#1d4ed8' : c > 0.35 ? '#a16207' : '#15803d' });
      if (!PHONE) {
        const m = (c + 1) / 2;
        text(p.x + 74, y + 74, 'CO₂ ' + (c < -0.35 ? '줄었어요' : c > 0.35 ? '늘었어요' : '그대로예요'), { size: 12.5, weight: 700, align: 'left', color: COL.muted });
      }
    });
    if (!PHONE) {
      const yy = y0 + 3 * (rh + 10) + 6;
      wrapText(p.x + p.w / 2, yy + 34, B.time >= 3 ? '색깔이 변한 시험관은 식물이 이산화 탄소를 흡수하거나 내보냈다는 뜻이에요.' : '시간이 흐르는 동안 색 변화를 지켜봐요.', p.w - 28, { size: 13.5, weight: 700, color: COL.muted, lh: 17 });
    }
  }
  let roTimer = 0;
  function update(dt) {
    CLK.t += dt; FRAME_DT = dt;
    if (scene === 'btb') updateBtb(dt);
    else if (scene === 'day') updateDay(dt);
    else if (scene === 'table') TBL.update(dt);
    else if (scene === 'room') updateRoom(dt);
    FX.update(dt);
    roTimer -= dt;
    if (roTimer <= 0) { roTimer = 0.2; refreshReadouts(); }
  }

  /* ---------- 화면 요소 ---------- */
  const el = {
    tb: $('#tbLabel'), ctlBtb: $('#ctlBtb'), ctlDay: $('#ctlDay'), ctlTable: $('#ctlTable'), ctlRoom: $('#ctlRoom'),
    playBtn: $('#playBtn'), btbNote: $('#btbNote'), lightR: $('#lightR'), lightO: $('#lightO'), btnNight: $('#btnNight'), btnNoon: $('#btnNoon'),
    tableReset: $('#tableReset'), potR: $('#potR'), potO: $('#potO'),
    r: [1, 2, 3].map((i) => ({ l: $('#rl' + i), v: $('#r' + i) })),
  };
  const has = (n) => (game && game.free) || F.has(n);
  const lvlNow = () => (game ? game.level : 0);
  function show(node, on) { if (node) node.hidden = !on; }

  function setScene(s) {
    if (!s || s === scene) return;
    scene = s;
    FX.clear(); checks.length = 0; hideHint();
    if (s === 'table') TBL.sel = null;
    refreshUI();
    if (s === 'btb' && BTB.tap && BTB.time === 0) hint('시험관을 눌러 포일을 씌우거나 벗겨 보세요.', 4200);
    if (s === 'day') hint('빛의 세기 슬라이더를 움직여 보세요.', 3800);
  }
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));

  bindClick(el.playBtn, () => { if (BTB.time >= 3) { setBtbRun(true); } else setBtbRun(!BTB.run); });
  function syncBtbUI() {
    const B = BTB;
    el.playBtn.textContent = B.run ? '⏸ 잠깐 멈춤' : B.time >= 3 ? '🔁 다시 하기 (처음부터)' : B.time > 0 ? '▶ 이어서 진행' : '▶ 실험 시작 (3시간 지나기)';
    el.btbNote.textContent = B.time >= 3 ? '3시간이 지났어요. 시험관을 눌러 포일을 바꾸고 다시 해 볼 수도 있어요.' : '시험관을 눌러 포일로 가리거나 벗길 수 있어요. 시간이 흐르면 BTB 용액의 색이 달라져요.';
  }
  SciSim.bindRange(el.lightR, el.lightO, (v) => v + ' %', (v) => { DAY.L = v; });
  function setLight(v) { DAY.L = v; el.lightR.value = v; el.lightR.dispatchEvent(new Event('input')); }
  bindClick(el.btnNight, () => setLight(0));
  bindClick(el.btnNoon, () => setLight(90));
  bindClick(el.tableReset, () => { TBL.reset(); refreshUI(); });
  SciSim.bindRange(el.potR, el.potO, (v) => v + ' 개', (v) => { ROOM.pots = v; });
  function setPots(v) { ROOM.pots = v; el.potR.value = v; el.potR.dispatchEvent(new Event('input')); }
  bindClick($('#resetBtn'), () => {
    if (scene === 'btb') { resetBtb(false); BTB.tap = true; syncBtbUI(); hint('실험을 처음 상태로 되돌렸어요.', 2500); }
    else if (scene === 'day') setLight(80);
    else if (scene === 'table') TBL.reset();
    else if (scene === 'room') setPots(1);
    refreshUI();
  });

  function refreshUI() {
    show(el.ctlBtb, scene === 'btb');
    show(el.ctlDay, scene === 'day' && has('day'));
    show(el.ctlTable, scene === 'table' && has('table'));
    show(el.ctlRoom, scene === 'room' && has('room'));
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === scene));
    el.tb.textContent = SCENE_LABEL[scene];
    syncBtbUI();
    refreshReadouts();
  }
  function setRO(i, label, val) {
    const r = el.r[i];
    if (r.l.textContent !== label) r.l.textContent = label;
    if (r.v.textContent !== val) r.v.textContent = val;
  }
  function refreshReadouts() {
    if (scene === 'btb') {
      BTB.tubes.forEach((tb, i) => setRO(i, tb.id + (tb.plant ? ' (검정말 · ' + (tb.cover ? '어둠' : '빛') + ')' : ' (식물 없음 · 빛)'), colName(tb.cs)));
    } else if (scene === 'day') {
      const P = Pof(DAY.Ls), st = DAY.st;
      setRO(0, '광합성량', Math.round(P) + '');
      setRO(1, '호흡량', R_RESP + '');
      setRO(2, '겉으로 보이는 기체 출입', st === 'out' ? '산소 방출 · CO₂ 흡수' : st === 'in' ? '산소 흡수 · CO₂ 방출' : '출입 없음');
    } else if (scene === 'table') {
      const f = (c) => TBL.slots.filter((s) => s.id.endsWith('-' + c) && s.chip).length;
      setRO(0, '놓은 카드', TBL.filledCount() + ' / 10장');
      setRO(1, '🌿 광합성 줄', f(0) + ' / 5');
      setRO(2, '🔥 호흡 줄', f(1) + ' / 5');
    } else if (scene === 'room') {
      setRO(0, '화분 수', ROOM.pots + '개');
      setRO(1, '화분이 내놓는 CO₂', '사람의 약 ' + ROOM.pots + ' %');
      setRO(2, '사람 1명 (기준)', '100');
    }
  }

  /* ---------- 입력 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (scene === 'table') return TBL.down(p);
      if (scene === 'btb') {
        const q = toSS(p);
        for (let i = 0; i < 3; i++) if (Math.abs(q.x - TB.XS[i]) < 42 && q.y > TB.TY - 44 && q.y < TB.TY + TB.TH + 12) { toggleTube(i); return true; }
      }
      return false;
    },
    move(p) { if (scene === 'table') TBL.move(p); },
    up(p) { if (scene === 'table') TBL.up(p); },
  });
  TBL.onChange = () => refreshReadouts();


  /* =========================================================
     미션 (게임 엔진)
     ========================================================= */
  const btbDefault = () => { resetBtb(false); BTB.tap = true; syncBtbUI(); };
  const tubeInfo = () => BTB.tubes.map((tb) => tb.id + ': ' + colName(tb.cs)).join(' · ');
  const defaultCfg = () => { const [a, b, c] = BTB.tubes; return !a.cover && b.cover && !c.cover; };

  game = SciSim.game({
    simId: 'm2-plant-respiration',
    mount: '#game',
    badge: '호흡 박사',
    homeHref: '../../index.html#g2',
    featureLabels: {
      btb: '🧪 BTB 용액 시험관 A·B·C · ⏱ 시간 흐르기',
      day: '🍃 낮과 밤 · ☀️ 빛의 세기 · 엽록체와 미토콘드리아',
      table: '📋 광합성과 호흡 비교표',
      room: '🛏️ 밤의 침실과 화분',
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
        title: 'BTB 실험: 식물은 밤에도 숨을 쉴까?', short: 'BTB 실험', icon: '🧪', phase: '실험',
        features: ['btb'],
        intro: '<p class="si-q">❓ 탐구 질문: 식물은 밤에도 숨을 쉴까?</p>' +
          '<p><b>BTB 용액</b>은 이산화 탄소의 양에 따라 색이 변해요. <b>파랑</b>(이산화 탄소 적음) – <b>초록</b>(보통) – <b>노랑</b>(이산화 탄소 많음). 초록색 BTB 용액을 넣은 시험관 A·B·C로 식물의 기체 출입을 알아봐요.</p>' +
          '<p>A: 검정말 + 빛 · B: 검정말 + 어둠(포일) · C: 식물 없음 + 빛</p>',
        setup() { setScene('btb'); },
        recap: '빛이 있을 때(A)는 이산화 탄소가 줄어 파랗게, 어둠 속(B)에서는 이산화 탄소가 늘어 노랗게 변해요. 식물은 어둠 속에서도 <b>호흡</b>을 해요.',
        summary: '<ul><li><b>BTB 용액</b>: 이산화 탄소가 적으면 <b>파란색</b>, 보통이면 <b>초록색</b>, 많으면 <b>노란색</b>이에요.</li>' +
          '<li>빛을 받는 식물(A): 광합성으로 이산화 탄소를 흡수 → 용액이 <b>파랗게</b> 변해요.</li>' +
          '<li>어둠 속의 식물(B): 광합성은 못 하고 호흡으로 이산화 탄소를 내보냄 → 용액이 <b>노랗게</b> 변해요.</li>' +
          '<li>식물이 없는 시험관(C)은 색이 변하지 않아요. 색 변화가 <b>식물 때문</b>임을 확인하는 비교 시험관이에요.</li></ul>',
        missions: [
          {
            title: '3시간 뒤, 색은 어떻게 될까?', scene: 'btb',
            setup() { btbDefault(); refreshUI(); },
            goal: '<b>▶ 실험 시작</b>을 눌러 3시간이 지나게 하고, 시험관 A·B·C의 색 변화를 살펴봐요.',
            hint: 'A는 빛을 받고, B는 포일로 가려져 있어요. 색과 함께 CO₂ 눈금도 살펴봐요.',
            check: () => BTB.time >= 2.99 && defaultCfg(),
            hold: 0.8,
            status: () => '⏱ ' + f1(BTB.time) + ' / 3시간 · ' + tubeInfo(),
            explain: 'A는 빛이 있어서 <b>광합성량이 호흡량보다 많아</b> 이산화 탄소가 줄어 파랗게 변했어요. B는 빛이 없어서 광합성은 못 하고 <b>호흡</b>만 일어나 이산화 탄소가 늘어 노랗게 변했어요. 식물이 없는 C는 변하지 않았지요.',
          },
          {
            title: 'A도 어둡게 하면?', scene: 'btb',
            setup() { btbDefault(); refreshUI(); },
            goal: '시험관 <b>A를 눌러 포일을 씌우고</b> 실험을 다시 해요. A의 색은 어떻게 변할까요?',
            hint: '시험관 A를 누르면 포일이 내려와요. 그다음 ▶ 실험 시작!',
            check: () => BTB.tubes[0].cover && BTB.tubes[0].c > 0.55,
            hold: 0.6,
            status: () => mark(BTB.tubes[0].cover) + ' A에 포일 씌우기 · ' + mark(BTB.tubes[0].c > 0.55) + ' A가 노랗게 변함 (' + colName(BTB.tubes[0].cs) + ')',
            explain: '빛이 없으면 검정말도 <b>광합성을 하지 못해요</b>. 그래도 살아 있는 세포는 <b>호흡</b>을 계속해서 이산화 탄소가 늘어나고, BTB 용액이 노랗게 변해요. 그러니까 식물은 밤에도 숨을 쉬어요.',
          },
          {
            type: 'quiz', title: '시험관 C는 왜 필요할까?', scene: 'btb',
            setup() { btbDefault(); BTB.time = 3; BTB.tubes[0].c = BTB.tubes[0].cs = -0.9; BTB.tubes[1].c = BTB.tubes[1].cs = 0.9; refreshUI(); },
            goal: '식물이 없는 시험관 <b>C</b>도 함께 실험했어요. C는 어떤 역할을 할까요?',
            choices: ['식물 없이도 이산화 탄소가 만들어지는지 알아보려고', 'A와 B의 색 변화가 식물 때문이라는 것을 확인하려고 (비교하는 시험관)', '빛이 없을 때 식물이 어떻게 되는지 보려고', '시험관이 하나 더 필요해서'],
            answer: 1,
            feedback: ['C에는 식물이 없어서 이산화 탄소를 만들거나 없앨 수 없어요. 식물이 없으면 색이 변하지 않는다는 것을 보여 주는 시험관이에요.', '', '빛이 없는 시험관은 B예요. C는 빛은 있지만 식물이 없어요.', '실험 결과를 해석하려면 비교할 시험관이 꼭 필요해요. 이런 시험관을 대조군이라고 해요.'],
            explain: 'C는 식물만 빼고 나머지 조건이 같은 <b>비교(대조) 시험관</b>이에요. C의 색이 변하지 않았으니 A와 B의 색 변화는 <b>식물</b>(광합성과 호흡) 때문이라고 말할 수 있어요.',
          },
        ],
      },
      {
        title: '낮과 밤: 광합성량과 호흡량 비교', short: '낮과 밤', icon: '🌗', phase: '탐구',
        features: ['day'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 빛이 있으면 이산화 탄소가 줄고, 어둠 속에서는 늘어나는 것을 BTB 용액으로 확인했어요.</div>' +
          '<p>식물은 낮에도 호흡을 해요! 빛의 세기를 바꾸며 잎 세포 속 <b>엽록체</b>(광합성)와 <b>미토콘드리아</b>(호흡)에서 일어나는 일, 그리고 <b>기공</b>으로 드나드는 기체를 살펴봐요.</p>',
        setup() { setScene('day'); },
        recap: '호흡은 낮과 밤에 항상 일어나요. 광합성량이 호흡량보다 많으면 산소 방출·이산화 탄소 흡수, 적으면 산소 흡수·이산화 탄소 방출로 보여요.',
        summary: '<ul><li><b>광합성</b>은 빛이 있을 때만, <b>호흡</b>은 낮과 밤 <b>항상</b> 일어나요.</li>' +
          '<li>광합성량 &gt; 호흡량 (밝은 낮): <b>산소 방출, 이산화 탄소 흡수</b>로 보여요.</li>' +
          '<li>광합성량 = 호흡량: 서로의 산물을 이용해서 <b>겉으로 보이는 기체 출입이 없어요</b>.</li>' +
          '<li>광합성량 &lt; 호흡량 (밤·어두울 때): <b>산소 흡수, 이산화 탄소 방출</b>로 보여요.</li></ul>',
        missions: [
          {
            title: '기체 출입이 바뀌는 빛의 세기', scene: 'day',
            setup() { setLight(80); refreshUI(); },
            goal: '빛의 세기를 바꿔서 <b>광합성량과 호흡량이 같아지는 곳</b>을 찾아요. 겉으로 보이는 기체 출입이 없어져요.',
            hint: '빛이 세면 산소가 나가고, 약하면 산소가 들어와요. 둘이 바뀌는 사이를 찾아봐요.',
            check: () => DAY.st === 'eq',
            hold: 1.2,
            status: () => '광합성량 <b>' + Math.round(Pof(DAY.Ls)) + '</b> · 호흡량 <b>' + R_RESP + '</b> · ' + mark(DAY.st === 'eq') + ' 같아요',
            explain: '광합성량과 호흡량이 같으면 광합성으로 만든 <b>산소를 호흡이 쓰고</b>, 호흡으로 나온 <b>이산화 탄소를 광합성이 써요</b>. 그래서 겉으로 보이는 기체 출입이 없어요. 빛이 이보다 세면 산소가 나가고, 약하면 산소가 들어와요.',
          },
          {
            title: '밤과 한낮 모두 살펴보기', scene: 'day',
            setup() { DAY.visited.night = false; DAY.visited.noon = false; setLight(40); refreshUI(); },
            goal: '<b>🌙 밤</b>(빛 0 %)과 <b>☀️ 한낮</b>(빛 80 % 이상)의 기체 출입을 모두 살펴봐요.',
            hint: '“🌙 밤”과 “☀️ 한낮” 버튼을 눌러도 돼요.',
            check: () => DAY.visited.night && DAY.visited.noon && DAY.L >= 80,
            hold: 0.8,
            status: () => mark(DAY.visited.night) + ' 밤 · ' + mark(DAY.visited.noon) + ' 한낮 · ' + (DAY.L >= 80 ? '지금 한낮이에요' : DAY.L <= 3 ? '지금 밤이에요' : '지금 빛 ' + DAY.L + ' %'),
            explain: '한낮에는 광합성량이 호흡량보다 많아 <b>산소를 내보내고 이산화 탄소를 흡수</b>해요. 밤에는 광합성이 멈추고 <b>호흡만</b> 일어나서 산소를 흡수하고 이산화 탄소를 내보내요. 호흡은 낮에도 밤에도 계속돼요.',
          },
          {
            type: 'quiz', title: '낮에도 호흡을 할까?', scene: 'day',
            setup() { setLight(90); refreshUI(); },
            goal: '한낮에 식물은 산소를 내보내요. 이때 식물의 호흡에 대한 설명으로 옳은 것은?',
            choices: ['낮에는 호흡을 하지 않고 광합성만 한다', '호흡은 밤에만 일어나는 과정이다', '낮에도 호흡이 일어나지만 광합성량이 더 많아서 겉으로는 산소 방출·이산화 탄소 흡수로 보인다', '낮에는 호흡이 광합성으로 바뀌어서 산소가 나온다'],
            answer: 2,
            feedback: ['낮에도 호흡은 멈추지 않아요. 미토콘드리아에서 계속 일어나요. 단지 광합성이 더 많이 일어날 뿐이에요.', '호흡은 살아 있는 모든 세포에서 낮과 밤 내내 일어나요.', '', '호흡과 광합성은 서로 바뀌는 것이 아니라, 동시에 일어나는 서로 다른 과정이에요.'],
            explain: '호흡은 <b>살아 있는 세포에서 항상</b> 일어나요. 낮에는 광합성량이 호흡량보다 많아서 광합성의 결과(산소 방출·이산화 탄소 흡수)만 겉으로 드러나는 거예요.',
          },
        ],
      },
      {
        title: '비교: 광합성과 호흡', short: '비교', icon: '⚖️', phase: '설명',
        features: ['table'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 광합성은 빛이 있을 때 엽록체에서, 호흡은 낮과 밤에 미토콘드리아에서 일어나는 것을 보았어요.</div>' +
          '<p>이제 두 과정을 나란히 비교해서 정리해요. <b>장소·때·재료·산물·에너지</b> 5가지를 표에 맞게 놓아요. 광합성과 호흡은 재료와 산물이 서로 <b>반대</b>예요!</p>',
        setup() { setScene('table'); },
        recap: '광합성은 빛에너지를 양분(포도당)에 <b>저장</b>하고, 호흡은 양분의 에너지를 <b>방출</b>해서 생명 활동에 써요. 두 과정은 재료와 산물이 반대예요.',
        summary: '<table class="note-table"><tr><th></th><th>광합성</th><th>호흡</th></tr>' +
          '<tr><td>장소</td><td>엽록체</td><td>미토콘드리아</td></tr><tr><td>때</td><td>빛이 있을 때</td><td>항상 (낮과 밤)</td></tr>' +
          '<tr><td>재료</td><td>이산화 탄소 + 물</td><td>포도당 + 산소</td></tr><tr><td>산물</td><td>포도당 + 산소</td><td>이산화 탄소 + 물</td></tr>' +
          '<tr><td>에너지</td><td>빛에너지를 양분(화학 에너지)에 저장</td><td>양분의 에너지를 방출 (생명 활동에 이용)</td></tr></table>' +
          '<ul><li>호흡: 포도당 + 산소 → 이산화 탄소 + 물 + <b>에너지</b></li></ul>',
        missions: [
          {
            title: '광합성 vs 호흡 표 완성하기', scene: 'table', manual: true,
            setup() { TBL.reset(); refreshUI(); },
            goal: '카드 10장을 알맞은 칸에 놓은 뒤 <b>✔ 확인하기</b>를 눌러요.',
            hint: '광합성의 재료는 호흡의 산물이고, 광합성의 산물은 호흡의 재료예요.',
            check: tableFeedback,
            explain: '<b>광합성</b>: 이산화 탄소 + 물 → 포도당 + 산소 (엽록체, 빛이 있을 때, 빛에너지를 양분에 저장). <b>호흡</b>: 포도당 + 산소 → 이산화 탄소 + 물 + 에너지 (미토콘드리아, 항상, 양분의 에너지를 방출).',
          },
          {
            type: 'quiz', title: '호흡으로 나오는 에너지', scene: 'table',
            goal: '식물이 호흡으로 얻는 에너지는 어디에서 온 것일까요?',
            choices: ['햇빛의 빛에너지가 곧바로 쓰인다', '광합성으로 만든 양분(포도당)에 저장되어 있던 에너지다', '산소가 가지고 있던 에너지다', '이산화 탄소가 가지고 있던 에너지다'],
            answer: 1,
            feedback: ['빛에너지는 광합성에서 양분에 저장돼요. 호흡은 그 양분을 분해해서 에너지를 꺼내 써요.', '', '산소는 양분을 분해하는 데 쓰이는 재료일 뿐, 에너지원은 양분이에요.', '이산화 탄소는 호흡의 산물이에요. 에너지는 양분(포도당)에서 나와요.'],
            explain: '광합성으로 <b>빛에너지가 양분(포도당)의 화학 에너지로 저장</b>돼요. 호흡은 이 양분을 산소로 분해하면서 <b>에너지를 방출</b>해서 식물이 생명 활동에 써요.',
          },
        ],
      },
      {
        title: '적용: 침실의 화분과 식물의 호흡', short: '적용', icon: '🛏️', phase: '적용',
        features: ['room'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 호흡은 낮과 밤 항상 일어나고, 광합성과 재료·산물이 반대라는 것을 정리했어요.</div>' +
          '<p>배운 내용을 생활에 적용해 봐요. <b>밤에 침실에 화분을 두면</b> 어떻게 될까요? 식물의 호흡으로 나오는 이산화 탄소를 사람과 비교해 보세요.</p>',
        setup() { setScene('room'); },
        recap: '식물도 밤에 호흡해서 이산화 탄소를 내보내지만, 그 양은 사람보다 훨씬 적어서 침실의 화분은 걱정하지 않아도 돼요.',
        summary: '<ul><li>식물은 <b>밤에도 호흡</b>을 해서 산소를 쓰고 이산화 탄소를 내보내요.</li>' +
          '<li>하지만 화분이 내놓는 이산화 탄소의 양은 사람에 비해 <b>매우 적어서</b> 침실의 공기에 주는 영향은 아주 작아요.</li>' +
          '<li>식물이 호흡하는 까닭은 양분의 에너지를 꺼내어 <b>생명 활동</b>에 쓰기 위해서예요.</li></ul>',
        missions: [
          {
            title: '화분 10개의 호흡량', scene: 'room',
            setup() { setPots(1); refreshUI(); },
            goal: '화분 수를 <b>10개</b>까지 늘려 보고, 사람 1명과 이산화 탄소의 양을 비교해요.',
            hint: '오른쪽 슬라이더(🪴 화분 수)를 끝까지 올려요.',
            check: () => ROOM.pots >= 10,
            hold: 1,
            status: () => '화분 <b>' + ROOM.pots + '개</b> · 사람의 약 ' + ROOM.pots + ' % ' + mark(ROOM.pots >= 10),
            explain: '식물도 밤에 호흡해서 이산화 탄소를 내보내지만, 화분 한 개가 내놓는 양은 사람 한 명에 비해 아주 적어요. 화분 10개를 모두 합쳐도 사람의 약 1/10 정도예요. (대략적인 비교)',
          },
          {
            type: 'quiz', title: '침실에 화분을 두어도 될까?', scene: 'room',
            goal: '“밤에 침실에 화분을 두면 해롭다”는 말이 있어요. 과학적으로 가장 알맞은 설명은?',
            choices: ['식물은 밤에 광합성을 해서 산소가 늘어난다', '식물은 밤에 호흡을 하지 않으므로 아무 영향이 없다', '식물이 밤에 산소를 모두 써 버려서 위험하다', '밤에 호흡으로 이산화 탄소가 조금 늘지만, 그 양이 아주 적어 실제 영향은 매우 작다'],
            answer: 3,
            feedback: ['밤에는 빛이 없어서 광합성이 일어나지 않아요.', '식물도 밤에 호흡을 해요. 다만 그 양이 적을 뿐이에요.', '식물이 쓰는 산소의 양은 사람이 쓰는 양에 비해 매우 적어서 산소를 모두 쓰는 일은 없어요.', ''],
            explain: '식물도 밤에 호흡하므로 이산화 탄소가 <b>조금</b> 늘어나요. 하지만 그 양이 사람의 호흡에 비해 매우 적어서, 침실에 화분을 두는 것이 건강에 주는 영향은 거의 없어요.',
          },
          {
            type: 'quiz', title: '식물은 왜 호흡을 할까?', scene: 'room',
            goal: '식물이 낮이나 밤이나 호흡을 하는 까닭은 무엇일까요?',
            choices: ['밤에는 광합성을 할 수 없어서 대신 하는 것이다', '체온을 낮추기 위해서이다', '양분을 분해해 생명 활동에 필요한 에너지를 얻기 위해서이다', '이산화 탄소를 만들어 광합성에 쓰기 위해서이다'],
            answer: 2,
            feedback: ['호흡은 광합성을 대신하는 것이 아니에요. 낮에도 광합성과 함께 일어나요.', '식물의 호흡은 체온 조절이 아니라 에너지를 얻는 과정이에요.', '', '이산화 탄소는 호흡의 결과로 생기지만, 호흡하는 까닭은 에너지를 얻기 위해서예요.'],
            explain: '식물도 동물처럼 살아 있는 세포에서 <b>양분을 분해하며 에너지를 꺼내 써요</b>. 이렇게 얻은 에너지로 자라고, 물질을 옮기는 등 <b>생명 활동</b>을 해요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  refreshUI();
  SciSim.loop((dt) => { update(dt); draw(); });
  window.__sim = {
    VW, VH, LAY, BTB, DAY, ROOM, TBL, FX, TB,
    get game() { return game; },
    get scene() { return scene; },
    setScene, setLight, setPots, setBtbRun, toggleTube, resetBtb, update, draw, dayState, Pof,
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    solveTable() {
      TBL.reset();
      TBL.slots.forEach((s) => { const c = TBL.chips.find((q) => !q.slot && s.accept.indexOf(q.kind) >= 0); TBL.place(c, s); });
    },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / VW, y: r.top + (y * r.height) / VH }; },
    bench(n) { const t0 = performance.now(); let mx = 0; for (let i = 0; i < n; i++) { const a = performance.now(); update(1 / 60); draw(); mx = Math.max(mx, performance.now() - a); } return { avg: (performance.now() - t0) / n, max: mx }; },
  };
})();
