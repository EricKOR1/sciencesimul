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
  function celebrate(x, y) {
    FX.burst(x, y, { count: 26, speed: 190, life: 0.9, size: 4 });
    checks.push({ x, y, t: 0 });
    Sound.success();
  }
  function drawChecks(dt) {
    for (let i = checks.length - 1; i >= 0; i--) {
      const c = checks[i];
      c.t += dt || 1 / 60; // 호출부가 0을 넘겨도 체크 표시가 진행되도록
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
     중2 Ⅴ. 식물과 에너지 — 광합성과 환경 요인 [9과12-01]
     ① [관찰] 광합성: 잎 → 세포 → 엽록체로 확대하고, 재료(이산화 탄소·물)와 산물(포도당·산소)을 확인 (검정말 기포 = 산소)
     ② [실험] 빛의 세기: 전등 거리를 바꾸며 1분 동안의 기포 수를 재고 그래프를 그린다 (증가하다가 일정)
     ③ [탐구] 실험 설계: 바꿀 변인 1개 + 같게 할 변인 → 이산화 탄소 농도 / 온도의 영향 (온도는 적정 온도에서 최대)
     ④ [적용] 비닐하우스: 빛·이산화 탄소·온도를 조절해 수확(광합성)을 높이고 한계 요인 찾기
     ========================================================= */

  /* ---------- 모델: 1분 동안 나오는 기포 수 ---------- */
  const smin = (a, b, k) => { k = k || 5; return Math.pow(Math.pow(Math.max(a, 1e-3), -k) + Math.pow(Math.max(b, 1e-3), -k), -1 / k); };
  const fLd = (d) => 1 - Math.exp(-1.9 * 400 / (d * d));                    // 전등 거리 → 빛의 세기 효과 (가까울수록 크고, 어느 정도부터 포화)
  const fCo = (c) => 0.13 + 0.87 * (1 - Math.exp(-c / 0.7));                // 탄산수소 나트륨 농도(%) → 이산화 탄소 효과
  const fTe = (T) => (T < 32.5 ? Math.exp(-Math.pow((T - 32.5) / 14, 2)) : Math.exp(-Math.pow((T - 32.5) / 8.5, 2)));   // 온도 → 적정 온도(약 33 °C)에서 최대
  const bubbleRate = (d, c, T) => 36 * smin(fLd(d), fCo(c)) * fTe(T);

  /* 비닐하우스 모델: 수확 지수(0~100)와 한계 요인 */
  const fL2 = (L) => 1 - Math.exp(-L / 25);
  const fC2 = (C) => 1 - Math.exp(-C / 25);
  const fT2 = (T) => (T < 32 ? Math.exp(-Math.pow((T - 32) / 14, 2)) : Math.exp(-Math.pow((T - 32) / 8, 2)));
  function farmEval(L, C, T) {
    const a = fL2(L), b = fC2(C), c = fT2(T);
    const y = 100 * smin(smin(a, b, 14), Math.max(c, 0.02), 14);
    const lim = a <= b && a <= c ? 'light' : b <= c ? 'co2' : 'temp';
    return { y: Math.min(100, y / 0.99), lim, cost: L * 0.3 + C * 0.25 + Math.abs(T - 20) * 0.8 };
  }
  const LIMNAME = { light: '빛의 세기', co2: '이산화 탄소', temp: '온도' };

  /* ---------- 장면 상태 ---------- */
  let game = null;
  let F = new Set();
  let scene = 'leaf';
  const SCENE_LABEL = { leaf: '🍃 잎 속 들여다보기', tank: '🧪 검정말 기포 실험', eq: '📝 광합성 반응식 완성하기', farm: '🏡 비닐하우스 농부' };

  const LEAF = { zf: 0, zt: 0, light: true, day: 1, gluc: 0, o2n: 0, merges: 0, sOpen: 1, s: [new Streams(90), new Streams(90), new Streams(110)], tm: [0, 0, 0, 0, 0, 0], flash: 0, seen2: 0, ringT: 0 };
  const TANK = {
    d: 20, dV: 20, co2: 2, coV: 2, T: 30, TV: 30, mode: 'idle', mt: 0, ts: 12, count: 0, acc: 0, vacc: 0, rateShown: 0,
    bubbles: [], ripples: [], hist: [], histT: 0, lightPts: [], co2Pts: [], tPts: [], run: null, callouts: true, gk: 'light', lastPt: null,
  };
  const FARM = { L: 50, C: 30, T: 20, Ls: 50, Cs: 30, Ts: 20, y: 0, ys: 0, night: false, mol: new Streams(60), tm: 0, bub: [] };
  const DZ = { rows: ['light', 'co2', 'temp', 'amount'], v: { light: null, co2: null, temp: null, amount: null }, target: 'co2' };
  const DZ_NAME = { light: ['💡 빛의 세기', '전등 거리'], co2: ['☁️ 이산화 탄소 농도', '탄산수소 나트륨 용액'], temp: ['🌡️ 물의 온도', ''], amount: ['🌱 검정말의 양', '크기·가지 수'] };

  /* ---------- 장면 1: 잎 속 (잎 → 세포 → 엽록체) ---------- */
  const ZOOM = 5.5;
  const LEAFA = { x: 126, y: 330, len: 318, wid: 104, ang: -0.52 };
  function leafLocal(u, v) {
    const c = Math.cos(LEAFA.ang), s = Math.sin(LEAFA.ang);
    return { x: LEAFA.x + c * u - s * v, y: LEAFA.y + s * u + c * v };
  }
  const F0 = leafLocal(190, -14);
  /* 세포 단면의 엽록체 위치 (고정) */
  const PAL = [], SPG = [], SPGC = [];
  { let s = 4242; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 6; i++) {
      const cx = 20 + i * 80 + 6;
      for (let k = 0; k < 5; k++) PAL.push({ x: cx + 34 + (k % 2 ? 15 : -15) + (r() - 0.5) * 6, y: 100 + k * 22 + (r() - 0.5) * 4, rot: (r() - 0.5) * 0.8 });
    }
    const pos = [[60, 232, 30], [140, 244, 32], [218, 228, 30], [330, 238, 28], [420, 230, 31], [480, 256, 24], [96, 296, 30], [180, 306, 30], [262, 318, 26], [372, 312, 30], [456, 306, 26], [30, 280, 20], [230, 270, 22]];
    pos.forEach((q) => { SPGC.push({ x: q[0], y: q[1], r: q[2] }); for (let k = 0; k < 3; k++) { const a = r() * TAU, rr = q[2] * 0.5 * Math.sqrt(r()); SPG.push({ x: q[0] + Math.cos(a) * rr, y: q[1] + Math.sin(a) * rr, rot: r() * 3 }); } });
  }
  const F1 = { x: PAL[13].x, y: PAL[13].y };
  const FOC = [F0, F1];
  const STOMA = [130, 388];
  const VEIN = { x: 305, y: 268, r: 27 };
  const allCh = () => PAL.concat(SPG);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function leafSpawn(dt) {
    const L = LEAF, tm = L.tm;
    const near = (k) => Math.abs(L.zf - k) < 0.95;
    // 단계 0: 잎 겉모습 — 이산화 탄소가 들어가고 산소가 나가요
    if (near(0)) {
      tm[0] -= dt;
      if (tm[0] <= 0) {
        tm[0] = L.light ? 0.5 : 1.4;
        const t = rand(0.15, 0.85), pt = leafLocal(LEAFA.len * t, rand(-0.5, 0.5) * LEAFA.wid * Math.sin(t * 3.0) * 0.9);
        L.s[0].add(new Path([[pt.x + rand(60, 140), pt.y + rand(30, 110)], [pt.x, pt.y]]), 'co2', 46, { u: 6, fade: 14 });
        if (L.light) {
          const t2 = rand(0.2, 0.8), p2 = leafLocal(LEAFA.len * t2, rand(-0.4, 0.4) * LEAFA.wid * 0.6);
          L.s[0].add(new Path([[p2.x, p2.y], [p2.x + rand(30, 70), p2.y - rand(90, 150)]]), 'o2', 42, { u: 6, fade: 14 });
        }
      }
      tm[1] -= dt;
      if (tm[1] <= 0) {            // 물: 뿌리 → 줄기 → 잎
        tm[1] = 0.55;
        const m = leafLocal(LEAFA.len * 0.55, 0);
        L.s[0].add(new Path([[78, 478], [84, 430], [104, 372], [LEAFA.x, LEAFA.y], [m.x, m.y]]), 'h2o', 78, { u: 5, jig: 0, fade: 10 });
      }
    }
    // 단계 1: 세포 단면 — 기공으로 이산화 탄소가 들어가고 산소가 나가요
    if (near(1)) {
      tm[2] -= dt;
      const open = L.sOpen;
      if (tm[2] <= 0 && open > 0.5) {
        tm[2] = L.light ? 0.4 : 1.2;
        const sx = pick(STOMA), c = pick(allCh());
        L.s[1].add(new Path([[sx + rand(-40, 40), 478], [sx, 396], [sx, 356], [sx + rand(-10, 10), 320], [c.x, c.y]]), 'co2', 78, { u: 5.6 });
        if (L.light) {
          const sx2 = pick(STOMA), c2 = pick(allCh());
          L.s[1].add(new Path([[c2.x, c2.y], [sx2 + rand(-10, 10), 320], [sx2, 356], [sx2, 396], [sx2 + rand(-40, 40), 478]]), 'o2', 78, { u: 5.6 });
        }
      }
      tm[3] -= dt;
      if (tm[3] <= 0) {
        tm[3] = L.light ? 0.5 : 1.6;
        const c = pick(allCh());
        L.s[1].add(new Path([[VEIN.x, VEIN.y], [(VEIN.x + c.x) / 2 + rand(-20, 20), (VEIN.y + c.y) / 2], [c.x, c.y]]), 'h2o', 70, { u: 5 });
      }
    }
    // 단계 2: 엽록체 — 재료가 들어가 반응하고 산물이 나가요
    if (near(2)) {
      tm[4] -= dt;
      if (tm[4] <= 0) {
        tm[4] = L.light ? 0.42 : 1.3;
        const R = { x: 264, y: 238 };
        const y1 = rand(150, 190), y2 = rand(290, 335);
        L.s[2].add(new Path([[-24, y1], [120, y1 + 20], [R.x, R.y]]), 'co2', 120, { u: 6, onEnd: leafMerge, fade: 22 });
        L.s[2].add(new Path([[-24, y2], [120, y2 - 20], [R.x, R.y]]), 'h2o', 120, { u: 6, onEnd: leafMerge, fade: 22 });
      }
    }
  }
  function leafMerge(p) {
    const L = LEAF, R = { x: 264, y: 238 };
    L.flash = 1;
    if (!L.light) { FX.emit({ x: R.x, y: R.y, size: 10, life: 0.5, color: '#9aa7b5', shape: 'smoke', grow: 20 }); return; }
    // 이산화 탄소 6개 + 물 6개(들어온 분자 12개) → 포도당 1개 + 산소 6개: 분자 2개가 들어올 때마다 산소 1개가 나가요
    L.merges++;
    if (L.zf > 1.2) FX.burst(R.x, R.y, { count: 5, speed: 60, life: 0.5, size: 3, colors: ['#ffe27a', '#fff'], gravity: 0 });
    if (L.merges % 2 === 0) { L.o2n++; L.s[2].add(new Path([[R.x, R.y], [380, 215 + rand(-20, 20)], [SW + 24, 150 + rand(-30, 40)]]), 'o2', 120, { u: 6, fade: 22 }); }
    if (L.merges % 12 === 0) {
      L.gluc++;
      L.s[2].add(new Path([[R.x, R.y], [360, 300], [SW + 30, 380]]), 'glucose', 70, { u: 7.5, fade: 24 });
      if (L.zf > 1.2) { FX.burst(R.x, R.y, { count: 12, speed: 120, life: 0.7, size: 3.4, colors: ['#ffd34d', '#ffb400', '#fff3b0'], gravity: 0 }); Sound.click(); }
    }
  }

  function updateLeaf(dt) {
    const L = LEAF;
    L.zf = SciSim.approach(L.zf, L.zt, dt, RM ? 60 : 3.2);
    if (Math.abs(L.zf - L.zt) < 0.002) L.zf = L.zt;
    L.day = SciSim.approach(L.day, L.light ? 1 : 0.18, dt, 3);
    L.sOpen = SciSim.approach(L.sOpen, L.light ? 1 : 0, dt, 3);
    L.flash = Math.max(0, L.flash - dt * 4);
    L.ringT += dt;
    if (scene === 'leaf' || Math.abs(L.zf - L.zt) > 0.01) {
      leafSpawn(dt);
      L.s.forEach((s, k) => { if (Math.abs(L.zf - k) < 1.05) s.update(dt); else s.clear(); });
    }
  }

  /* --- 단계 0: 잎의 겉모습 --- */
  function drawLvl0() {
    const L = LEAF, day = L.day;
    skyRect(0, 0, SW, SH, day);
    // 햇빛 줄기
    drawSun(78, 74, 30, 0.25 + 0.75 * day);
    drawMoon(78, 74, 24, 1 - day > 0.5 ? (1 - day - 0.5) * 2 : 0);
    if (day > 0.4) {
      ctx.save(); ctx.globalAlpha = (day - 0.4) * 0.3;
      ctx.fillStyle = '#fff6c0';
      ctx.beginPath(); ctx.moveTo(78, 74); ctx.lineTo(250, 200); ctx.lineTo(380, 280); ctx.lineTo(120, 140); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,230,120,' + (0.55 * day) + ')'; ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const ph = ((CLK.t * 0.35 + i * 0.2) % 1);
        const a0 = 0.3 + i * 0.07, sx = 78 + Math.cos(a0 + 0.12) * 50, sy = 74 + Math.sin(a0 + 0.12) * 50;
        const ex = F0.x - 20 + i * 18, ey = F0.y - 40 + i * 6;
        const px = sx + (ex - sx) * ph, py = sy + (ey - sy) * ph;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (ex - sx) * 0.07, py + (ey - sy) * 0.07); ctx.stroke();
      }
      ctx.restore();
    }
    cloud(330, 70, 0.8, 0.85 * day); cloud(430, 120, 0.55, 0.7 * day);
    // 풀밭
    ctx.fillStyle = lgrad(0, 430, 0, SH, [[0, '#7fcf78'], [1, '#4aa35a']]);
    ctx.beginPath(); ctx.moveTo(0, 452); ctx.quadraticCurveTo(130, 424, 260, 446); ctx.quadraticCurveTo(400, 468, SW, 436); ctx.lineTo(SW, SH); ctx.lineTo(0, SH); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,' + (0.38 * (1 - day)) + ')'; ctx.fillRect(0, 0, SW, SH);
    // 줄기와 잎
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#2f8f46'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(74, 490); ctx.bezierCurveTo(78, 430, 100, 380, LEAFA.x, LEAFA.y); ctx.stroke();
    ctx.restore();
    drawLeaf(100, 392, 210, 62, -2.25, { c1: '#6dcb6a', c2: '#37a145', c3: '#26803a' });
    drawLeaf(LEAFA.x, LEAFA.y, LEAFA.len, LEAFA.wid, LEAFA.ang);
    L.s[0].draw();
    // 이름표
    const pOut = leafLocal(LEAFA.len * 0.62, -LEAFA.wid * 0.55);
    D.label(448, 250, '↗ 산소 (나옴)', { bg: rgba('#ef4444', 0.92), size: 14, align: 'center' });
    D.label(372, 412, '이산화 탄소 (들어감)', { bg: rgba('#475569', 0.92), size: 14, align: 'center' });
    D.label(56, 452, '↑ 물 (뿌리에서)', { bg: rgba('#2563eb', 0.92), size: 14, align: 'left' });
    // 확대 표시
    if (LEAF.zt === 0) focusRing(F0.x, F0.y, 30);
  }
  function focusRing(x, y, r) {
    const a = 0.5 + 0.5 * Math.sin(CLK.t * 4);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 4; circle(ctx, x, y, r); ctx.stroke();
    ctx.strokeStyle = rgba('#16a34a', 0.5 + 0.4 * a); ctx.lineWidth = 3; circle(ctx, x, y, r + 5 + a * 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + r * 0.72, y + r * 0.72); ctx.lineTo(x + r * 1.5, y + r * 1.5); ctx.stroke();
    ctx.restore();
    D.label(x + r * 1.5, y + r * 2.1, '누르면 확대!', { bg: rgba('#16a34a', 0.95), size: 13.5 });
  }

  /* --- 단계 1: 잎 단면 (세포) --- */
  function drawLvl1() {
    const L = LEAF, lit = L.light;
    ctx.fillStyle = lgrad(0, 0, 0, SH, [[0, lit ? '#fffbe6' : '#dfe8ef'], [0.08, '#f4fbe9'], [1, '#eaf6fb']]);
    ctx.fillRect(0, 0, SW, SH);
    // 아래쪽 공기
    ctx.fillStyle = '#eef8ff'; ctx.fillRect(0, 376, SW, SH - 376);
    // 햇빛
    if (lit) {
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const x0 = 40 + i * 105;
        ctx.fillStyle = 'rgba(255,238,140,' + (0.12 + 0.05 * Math.sin(CLK.t * 2 + i)) + ')';
        ctx.beginPath(); ctx.moveTo(x0 - 20, 0); ctx.lineTo(x0 + 28, 0); ctx.lineTo(x0 + 46, 200); ctx.lineTo(x0 + 10, 200); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // 큐티클 · 위 표피
    ctx.fillStyle = '#e8d896'; ctx.fillRect(14, 30, SW - 28, 8);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#f6fbe3'; ctx.strokeStyle = '#b7d28f'; ctx.lineWidth = 1.5; D.roundRect(20 + i * 80 + 2, 40, 76, 42, 9); ctx.fill(); ctx.stroke(); }
    // 울타리 조직
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#d9f0b6'; ctx.strokeStyle = '#8fc05f'; ctx.lineWidth = 2; D.roundRect(26 + i * 80, 86, 68, 116, 14); ctx.fill(); ctx.stroke(); }
    // 갯솜 조직 (공기 사이 틈)
    ctx.fillStyle = '#e3f3fb'; ctx.fillRect(14, 204, SW - 28, 140);
    SPGC.forEach((c) => {
      ctx.fillStyle = '#e3f3c7'; ctx.strokeStyle = '#97c566'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r, c.r * 0.88, 0, 0, TAU); ctx.fill(); ctx.stroke();
    });
    // 아래 표피 + 기공
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#f6fbe3'; ctx.strokeStyle = '#b7d28f'; ctx.lineWidth = 1.5; D.roundRect(20 + i * 80 + 2, 340, 76, 34, 9); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#e8d896'; ctx.fillRect(14, 374, SW - 28, 6);
    STOMA.forEach((sx) => {
      const g = 3 + 11 * L.sOpen;
      ctx.fillStyle = '#eef8ff'; ctx.fillRect(sx - g, 338, g * 2, 44);
      [-1, 1].forEach((sd) => {
        ctx.save(); ctx.translate(sx + sd * (g + 8), 359);
        const gg = ctx.createRadialGradient(-3 * sd, -4, 2, 0, 0, 22); gg.addColorStop(0, '#a8e68f'); gg.addColorStop(1, '#4fae4b');
        ctx.fillStyle = gg; ctx.strokeStyle = '#2f8a3c'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, 0, 11, 24, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1e7a3a'; circle(ctx, 0, -6, 2.5); ctx.fill(); circle(ctx, 0, 8, 2.5); ctx.fill();
        ctx.restore();
      });
    });
    // 잎맥 (물관)
    const V = VEIN;
    ctx.fillStyle = '#c9e6a5'; ctx.strokeStyle = '#6fa843'; ctx.lineWidth = 3; circle(ctx, V.x, V.y, V.r + 8); ctx.fill(); ctx.stroke();
    [[-10, -6, 9], [8, -9, 8], [0, 8, 9]].forEach((c) => { ctx.fillStyle = '#5aaef0'; ctx.strokeStyle = '#2b78c8'; ctx.lineWidth = 2; circle(ctx, V.x + c[0], V.y + c[1], c[2]); ctx.fill(); ctx.stroke(); });
    ctx.fillStyle = '#ffb35c'; circle(ctx, V.x + 17, V.y + 8, 5); ctx.fill();
    // 엽록체
    allCh().forEach((c) => drawChloroplast(c.x, c.y, 10, 6.2, c.rot, {}));
    if (lit) { const p = 0.5 + 0.5 * Math.sin(CLK.t * 3); PAL.forEach((c, i) => { if (i % 3 === 0) D.glow(c.x, c.y, 17, '#fff3a0', 0.18 + 0.22 * p); }); }
    L.s[1].draw();
    // 이름표
    D.label(STOMA[0], 428, '기공 (기체가 드나드는 구멍)', { bg: rgba('#334155', 0.92), size: 13.5 });
    D.label(STOMA[1] + 4, 452, '↑ 이산화 탄소 · ↓ 산소', { bg: rgba('#ffffff', 0.92), color: '#334155', size: 13.5 });
    D.label(V.x, V.y + 56, '물관 (물이 올라와요)', { bg: rgba('#2563eb', 0.92), size: 13.5 });
    D.label(120, 20, '햇빛', { bg: rgba('#d97706', 0.92), size: 13.5 });
    D.label(352, 66, '엽록체 (초록색 알갱이)', { bg: rgba('#15803d', 0.95), size: 14 });
    D.arrow(330, 78, F1.x + 12, F1.y - 8, { color: '#15803d', width: 2.5, head: 9 });
    if (!lit) D.label(SW / 2, 64, '🌙 빛이 없으면 기공이 닫혀요', { bg: rgba('#1e293b', 0.9), size: 14.5 });
    if (LEAF.zt === 1) focusRing(F1.x, F1.y, 22);
  }

  /* --- 단계 2: 엽록체 안 --- */
  function drawLvl2() {
    const L = LEAF, lit = L.light;
    ctx.fillStyle = lgrad(0, 0, 0, SH, [[0, lit ? '#e9f7d9' : '#d7e3d0'], [1, lit ? '#d2edb6' : '#c3d4ba']]);
    ctx.fillRect(0, 0, SW, SH);
    // 세포질 무늬
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    [[60, 80, 26], [440, 90, 20], [90, 420, 30], [460, 430, 24]].forEach((c) => { circle(ctx, c[0], c[1], c[2]); ctx.fill(); });
    // 빛 (왼쪽 위에서)
    if (lit) {
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const k = i * 40;
        ctx.fillStyle = 'rgba(255,240,150,' + (0.14 + 0.05 * Math.sin(CLK.t * 2.4 + i)) + ')';
        ctx.beginPath(); ctx.moveTo(60 + k, -10); ctx.lineTo(110 + k, -10); ctx.lineTo(250 + k * 0.5, 190); ctx.lineTo(205 + k * 0.5, 190); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#fff6b0';
      for (let i = 0; i < 9; i++) {
        const ph = (CLK.t * 0.5 + i / 9) % 1, k = (i % 4) * 40;
        const x = (85 + k) + (230 + k * 0.5 - 85 - k) * ph, y = -10 + 200 * ph;
        ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.95; D.spark(x, y, 7, CLK.t + i, '#ffe45e');
      }
      ctx.restore();
    }
    drawChloroplast(268, 240, 205, 128, -0.06, { light: lit });
    if (!lit) { ctx.fillStyle = 'rgba(30,40,60,.28)'; ctx.beginPath(); ctx.ellipse(268, 240, 205, 128, -0.06, 0, TAU); ctx.fill(); }
    if (L.flash > 0) D.glow(264, 238, 46, '#fff3a0', 0.9 * L.flash);
    L.s[2].draw();
    // 이름표
    D.label(268, 60, lit ? '☀️ 빛에너지' : '🌙 빛이 없어요', { bg: lit ? rgba('#d97706', 0.95) : rgba('#334155', 0.95), size: 15 });
    D.label(268, 412, '엽록체 (광합성이 일어나는 곳)', { bg: rgba('#15803d', 0.95), size: 15 });
    D.label(70, 128, '재료 ①', { bg: rgba('#475569', 0.95), size: 13.5 });
    D.label(70, 352, '재료 ②', { bg: rgba('#2563eb', 0.95), size: 13.5 });
    D.label(446, 86, '산물: 산소', { bg: rgba('#dc2626', 0.95), size: 13.5 });
    D.label(446, 424, '산물: 포도당', { bg: rgba('#d97706', 0.95), size: 13.5 });
    // 범례
    legendItem(26, 24, 'co2', '이산화 탄소', { u: 3.6, size: 13 });
    legendItem(26, 50, 'h2o', '물', { u: 3.6, size: 13 });
    legendItem(SW - 140, 24, 'o2', '산소', { u: 3.6, size: 13 });
    legendItem(SW - 140, 50, 'glucose', '포도당', { u: 3.2, size: 13 });
    // 만들어진 양
    D.label(268, 454, '만들어진 포도당 ' + LEAF.gluc + '개 · 산소 ' + LEAF.o2n + '개', { bg: rgba('#ffffff', 0.92), color: '#1b2333', size: 14 });
    if (!lit) D.label(268, 100, '빛이 없으면 광합성이 일어나지 않아요', { bg: rgba('#1e293b', 0.92), size: 14.5 });
  }

  function drawLeafScene() {
    const L = LEAF, zf = L.zf, C = { x: SW / 2, y: SH / 2 };
    const lv = [drawLvl0, drawLvl1, drawLvl2];
    const lerpP = (a, b, p) => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p });
    for (let k = 0; k < 3; k++) {
      const t = zf - k;
      if (t >= 1 - 0.0001 || t < -1) continue;
      const alpha = k === 0 ? 1 : smooth((zf - (k - 0.8)) / 0.5);
      if (alpha <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (t >= 0) {
        if (k >= 2) { lv[k](); ctx.restore(); continue; }
        const p = smooth(clamp(t, 0, 1)), pos = lerpP(FOC[k], C, p), sc = Math.pow(ZOOM, t);
        ctx.translate(pos.x, pos.y); ctx.scale(sc, sc); ctx.translate(-FOC[k].x, -FOC[k].y);
      } else {
        const p = smooth(clamp(1 + t, 0, 1)), pos = lerpP(FOC[k - 1], C, p), sc = Math.pow(ZOOM, t);
        ctx.translate(pos.x, pos.y); ctx.scale(sc, sc); ctx.translate(-C.x, -C.y);
        rrPath(ctx, 0, 0, SW, SH, 24 / sc); ctx.clip();
      }
      lv[k]();
      ctx.restore();
    }
    // 렌즈 느낌: 확대 중 가장자리가 살짝 어두워짐
    const fr = zf - Math.floor(zf);
    if (fr > 0.02 && fr < 0.98) {
      const a = Math.sin(fr * Math.PI) * 0.32;
      const g = ctx.createRadialGradient(C.x, C.y, SH * 0.25, C.x, C.y, SH * 0.78);
      g.addColorStop(0, 'rgba(10,40,20,0)'); g.addColorStop(1, 'rgba(10,40,20,' + a + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
    }
    // 배율 표시
    const lvl = ['잎 (눈으로 보기)', '세포 (현미경)', '엽록체 (더 확대)'][Math.round(clamp(zf, 0, 2))];
    D.label(SW - 12, SH - 18, '🔍 ' + lvl, { bg: rgba('#0f172a', 0.78), size: 13.5, align: 'right' });
  }

  /* ---------- 장면 2: 검정말 기포 실험 ---------- */
  const BK = { x: 256, y: 118, w: 190, h: 274 };
  const WATER_Y = BK.y + BK.h * 0.14;
  const TIPS = [[368, 236], [386, 222], [404, 240]];
  const PLANT_X = 386, PLANT_Y = 388;
  const mouthX = (d) => 256 - d * 3.9;
  const Ivis = (d) => clamp(400 / (d * d) / 2.2, 0.06, 1);
  const CDOTS = [];
  for (let i = 0; i < 16; i++) CDOTS.push({ x: rand(BK.x + 20, BK.x + BK.w - 14), y: rand(WATER_Y + 30, BK.y + BK.h - 30), a: rand(0, TAU), r: rand(0, 1) });

  function spawnBubble() {
    const T = TANK;
    if (T.bubbles.length > 130) return;
    const tip = pick(TIPS);
    T.bubbles.push({ x: tip[0] + rand(-4, 4), y: tip[1] + rand(-2, 4), vy: rand(46, 74), r: rand(2.6, 4.6), ph: rand(0, TAU), grow: rand(0.6, 1.4) });
  }
  function tankSettled() {
    const T = TANK;
    return Math.abs(T.dV - T.d) < 0.3 && Math.abs(T.coV - T.co2) < 0.03 && Math.abs(T.TV - T.T) < 0.4;
  }
  function stepMeasure(dt, rate, ts) {
    const T = TANK;
    T.mt += dt * ts; T.acc += (rate / 60) * dt * ts;
    while (T.acc >= 1) { T.acc -= 1; T.count++; spawnBubble(); }
    return T.mt >= 60;
  }
  function addPoint(arr, x, n) {
    const q = arr.find((p) => Math.abs(p.x - x) < 1e-6);
    if (q) { q.n = n; q.pop = 0; } else arr.push({ x, n, pop: 0 });
    arr.sort((a, b) => a.x - b.x);
    TANK.lastPt = { x, n, t: 0 };
  }
  function startMeasure() {
    const T = TANK;
    if (T.mode !== 'idle') return;
    T.mode = 'measure'; T.mt = 0; T.acc = 0; T.count = 0; T.ts = 12; T.gk = 'light'; T.measD = T.d;
    syncTankUI();
  }
  function startRun(kind) {
    const T = TANK;
    if (T.mode !== 'idle') return;
    const levels = kind === 'co2' ? [0, 0.5, 1, 2, 3] : [10, 20, 30, 35, 40, 50];
    T.run = { kind, levels, i: 0, phase: 'set', w: 0, done: false };
    T.mode = 'run'; T.gk = kind;
    (kind === 'co2' ? T.co2Pts : T.tPts).length = 0;
    T.d = 20; T.dV = 20;
    if (kind === 'co2') { T.T = 30; T.TV = 30; T.co2 = 0; T.coV = Math.max(T.coV, 0.01); }
    else { T.co2 = 1; T.coV = 1; T.T = 10; }
    syncTankUI();
  }
  function updateTank(dt) {
    const T = TANK, ap = SciSim.approach;
    T.dV = ap(T.dV, T.d, dt, RM ? 60 : 9); T.coV = ap(T.coV, T.co2, dt, RM ? 60 : 4); T.TV = ap(T.TV, T.T, dt, RM ? 60 : 3);
    const rate = bubbleRate(T.dV, T.coV, T.TV);
    T.rateShown = ap(T.rateShown, rate, dt, 5);
    T.histT += dt;
    if (T.histT >= 0.2) { T.histT = 0; T.hist.push(T.rateShown); if (T.hist.length > 100) T.hist.shift(); }
    if (T.mode === 'measure') {
      if (tankSettled() && stepMeasure(dt, rate, T.ts)) {
        addPoint(T.lightPts, T.measD, T.count);
        T.mode = 'idle'; syncTankUI(); Sound.success();
        FX.burst(BK.x + BK.w / 2, WATER_Y, { count: 10, speed: 90, life: 0.7, size: 3, colors: ['#bfe6ff', '#fff'], gravity: 160 });
      }
    } else if (T.mode === 'run') {
      const R = T.run;
      if (R.phase === 'set') {
        if (R.kind === 'co2') T.co2 = R.levels[R.i]; else T.T = R.levels[R.i];
        R.phase = 'settle'; R.w = 0;
      } else if (R.phase === 'settle') {
        R.w += dt;
        if (tankSettled() && R.w > 0.7) { R.phase = 'meas'; T.mt = 0; T.acc = 0; T.count = 0; T.ts = 36; }
      } else if (R.phase === 'meas') {
        if (stepMeasure(dt, rate, T.ts)) {
          addPoint(R.kind === 'co2' ? T.co2Pts : T.tPts, R.levels[R.i], T.count);
          R.i++;
          if (R.i >= R.levels.length) { R.done = true; T.mode = 'idle'; syncTankUI(); Sound.success(); hint('실험 끝! 그래프를 살펴보세요.', 4000); }
          else R.phase = 'set';
        }
      }
    } else {
      T.vacc += (rate / 60) * 2.4 * dt;
      while (T.vacc >= 1) { T.vacc -= 1; spawnBubble(); }
    }
    // 기포 움직임
    for (let i = T.bubbles.length - 1; i >= 0; i--) {
      const b = T.bubbles[i];
      b.y -= b.vy * dt; b.x += Math.sin(b.ph + CLK.t * 5) * 9 * dt; b.r += b.grow * dt * 0.5;
      if (b.y <= WATER_Y + 2) {
        T.bubbles.splice(i, 1);
        T.ripples.push({ x: b.x, t: 0 });
        if (!RM) for (let k = 0; k < 3; k++) FX.emit({ x: b.x, y: WATER_Y, vx: rand(-30, 30), vy: -rand(30, 70), gravity: 260, life: 0.45, size: 1.6, color: 'rgba(210,235,255,.95)' });
      }
    }
    for (let i = T.ripples.length - 1; i >= 0; i--) { T.ripples[i].t += dt; if (T.ripples[i].t > 0.7) T.ripples.splice(i, 1); }
    CDOTS.forEach((c) => { c.a += dt * 0.7; c.x = clamp(c.x + Math.cos(c.a * 1.3 + c.r * 6) * 9 * dt, BK.x + 16, BK.x + BK.w - 16); c.y = clamp(c.y + Math.sin(c.a + c.r * 5) * 8 * dt, WATER_Y + 24, BK.y + BK.h - 26); });
    T.gPop = (T.gPop || 0);
    [T.lightPts, T.co2Pts, T.tPts].forEach((arr) => arr.forEach((p) => { p.pop = Math.min(1, p.pop + dt * 2.5); }));
    if (T.lastPt) T.lastPt.t += dt;
  }

  function drawTank() {
    const T = TANK, t = CLK.t;
    // 벽 · 실험대
    ctx.fillStyle = lgrad(0, 0, 0, SH, [[0, '#f5faf2'], [1, '#e2efdc']]); ctx.fillRect(0, 0, SW, SH);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 5; i++) ctx.fillRect(18 + i * 104, 0, 2, 392);
    ctx.fillStyle = lgrad(0, 392, 0, SH, [[0, '#dcc7a2'], [0.14, '#cdb48a'], [1, '#b99b6d']]); ctx.fillRect(0, 392, SW, SH - 392);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(0, 392, SW, 3);
    // 눈금자 (비커 벽이 0 cm)
    ctx.fillStyle = '#f5e9b0'; ctx.strokeStyle = '#c9b66c'; ctx.lineWidth = 1.5; D.roundRect(34, 410, 232, 30, 5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#8a7a35'; ctx.lineWidth = 1.2;
    for (let c = 0; c <= 55; c += 5) {
      const x = 256 - c * 3.9; if (x < 38) continue;
      ctx.beginPath(); ctx.moveTo(x, 410); ctx.lineTo(x, 410 + (c % 10 === 0 ? 12 : 7)); ctx.stroke();
      if (c % 10 === 0) text(x, 435, String(c), { size: 12, weight: 700, color: '#6b5d1f' });
    }
    text(38, 435, 'cm', { size: 12, weight: 800, color: '#6b5d1f', align: 'left' });
    contactShadow(BK.x + BK.w / 2, 394, BK.w * 0.62, 12, 0.9);

    const m = mouthX(T.dV), iv = Ivis(T.dV), ivp = Math.pow(iv, 0.7);
    // 전등
    contactShadow(m - 46, 395, 36, 7, 0.8);
    ctx.save();
    ctx.fillStyle = lgrad(0, 380, 0, 394, [[0, '#4b6b57'], [1, '#2f4a3a']]); ctx.beginPath(); ctx.ellipse(m - 46, 388, 30, 8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3b5a47'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(m - 46, 386); ctx.lineTo(m - 46, 330); ctx.quadraticCurveTo(m - 46, 276, m - 36, 266); ctx.stroke();
    ctx.restore();
    // 빛줄기 (거리가 가까울수록 밝고, 멀수록 흐려져요)
    const wallX = BK.x, spread = 22 + (wallX - m) * 0.32;
    ctx.save();
    const cg = ctx.createLinearGradient(m, 0, wallX, 0);
    cg.addColorStop(0, 'rgba(255,238,140,' + (0.62 * ivp) + ')'); cg.addColorStop(1, 'rgba(255,238,140,' + (0.62 * ivp * (0.4 + 0.6 * iv)) + ')');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(m - 4, 263 - 22); ctx.lineTo(wallX, 263 - spread); ctx.lineTo(wallX, 263 + spread); ctx.lineTo(m - 4, 263 + 22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,248,190,' + (0.8 * ivp) + ')'; ctx.lineWidth = 2; ctx.setLineDash([10, 12]); ctx.lineDashOffset = -t * 36;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(m, 263 + k * 8); ctx.lineTo(wallX, 263 + k * spread * 0.4); ctx.stroke(); }
    ctx.setLineDash([]); ctx.restore();
    // 전등 머리
    ctx.save();
    D.shadow(() => {
      ctx.fillStyle = lgrad(0, 232, 0, 296, [[0, '#6f9a7c'], [0.5, '#3f6b50'], [1, '#2d4f3b']]);
      ctx.beginPath(); ctx.moveTo(m - 54, 249); ctx.quadraticCurveTo(m - 30, 228, m - 6, 233); ctx.lineTo(m - 6, 293); ctx.quadraticCurveTo(m - 30, 298, m - 54, 277); ctx.closePath(); ctx.fill();
    }, { blur: 8, y: 3 });
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(m - 30, 242, 20, 4, -0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f7e9a0'; ctx.beginPath(); ctx.ellipse(m - 6, 263, 8, 30, 0, 0, TAU); ctx.fill();
    ctx.restore();
    D.glow(m - 6, 263, 30 + 42 * ivp, '#fff0a0', 0.4 + 0.5 * ivp);

    // 물 (비커 안)
    const wy = WATER_Y, bx = BK.x + 3, bw = BK.w - 6, by2 = BK.y + BK.h - 3;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(bx, wy);
    for (let i = 0; i <= 20; i++) ctx.lineTo(bx + (bw * i) / 20, wy + Math.sin(t * 2.2 + i * 0.8) * 1.4);
    ctx.lineTo(bx + bw, by2 - 10); ctx.quadraticCurveTo(bx + bw, by2, bx + bw - 12, by2); ctx.lineTo(bx + 12, by2); ctx.quadraticCurveTo(bx, by2, bx, by2 - 10); ctx.closePath();
    ctx.fillStyle = lgrad(0, wy, 0, by2, [[0, 'rgba(190,232,252,.78)'], [1, 'rgba(110,190,236,.86)']]); ctx.fill();
    ctx.clip();
    // 빛이 닿은 물이 밝아져요
    const lg = ctx.createRadialGradient(bx, 263, 0, bx, 263, 240);
    lg.addColorStop(0, 'rgba(255,248,200,' + (0.5 * ivp) + ')'); lg.addColorStop(1, 'rgba(255,248,200,0)');
    ctx.fillStyle = lg; ctx.fillRect(bx, wy, bw, by2 - wy);
    const hot = clamp((T.TV - 36) / 14, 0, 1), cold = clamp((22 - T.TV) / 14, 0, 1);
    if (hot > 0) { ctx.fillStyle = 'rgba(255,140,60,' + (0.22 * hot) + ')'; ctx.fillRect(bx, wy, bw, by2 - wy); }
    if (cold > 0) { ctx.fillStyle = 'rgba(70,120,255,' + (0.2 * cold) + ')'; ctx.fillRect(bx, wy, bw, by2 - wy); }
    // 녹아 있는 이산화 탄소 (농도에 따라 많아져요)
    const nco = Math.round(T.coV * 5.2);
    for (let i = 0; i < nco && i < CDOTS.length; i++) drawMol('co2', Math.max(CDOTS[i].x, BK.x + 62), CDOTS[i].y, 3.3, CDOTS[i].a, 0.8);
    // 검정말
    for (let i = 0; i < 3; i++) {
      const tip = TIPS[i], x0 = PLANT_X + (i - 1) * 18, h0 = PLANT_Y - tip[1];
      ctx.strokeStyle = '#2f7d3a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      const pts = [];
      for (let k = 0; k <= 16; k++) {
        const s = k / 16, sw = Math.sin(t * 1.3 + s * 3 + i) * 5 * s * s;
        pts.push([x0 + (tip[0] - x0) * s + sw, PLANT_Y - h0 * s]);
        ctx[k ? 'lineTo' : 'moveTo'](pts[k][0], pts[k][1]);
      }
      ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = i === 1 ? '#3fa14f' : '#34914a';
      for (let k = 1; k <= 16; k++) {
        const p = pts[k], n = 5;
        for (let q = 0; q < n; q++) {
          const a = (q / n) * TAU + k * 0.9 + i;
          ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + Math.cos(a) * 13, p[1] + Math.sin(a) * 6 - 3); ctx.stroke();
        }
      }
    }
    // 빛이 켜져 있으면 잎 끝이 반짝여요
    ctx.restore();
    // 기포
    T.bubbles.forEach((b) => {
      ctx.save(); ctx.translate(b.x, b.y);
      ctx.fillStyle = 'rgba(255,255,255,.38)'; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.4;
      circle(ctx, 0, 0, b.r); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.95)'; circle(ctx, -b.r * 0.35, -b.r * 0.35, b.r * 0.3); ctx.fill();
      ctx.restore();
    });
    // 수면 물결
    T.ripples.forEach((r) => { ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - r.t / 0.7)) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(r.x, WATER_Y, 4 + r.t * 22, 1.5 + r.t * 3, 0, 0, TAU); ctx.stroke(); });
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(BK.x + 4, WATER_Y - 1, BK.w - 8, 2.5);
    // 유리 비커
    D.beaker(BK.x, BK.y, BK.w, BK.h, { level: 0, ticks: 0 });
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(BK.x + BK.w - 18, BK.y + 8, 5, BK.h - 40);
    // 온도계
    D.thermometer(BK.x + 30, 190, 140, T.TV, 0, 60, { ticks: false });
    D.label(BK.x + 30, 166, Math.round(T.TV) + ' °C', { bg: rgba('#475569', 0.92), size: 13 });
    // 눈금자 위 표시
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(m, 409); ctx.lineTo(m - 7, 396); ctx.lineTo(m + 7, 396); ctx.closePath(); ctx.fill();
    D.label(m, 384, Math.round(T.dV) + ' cm', { bg: rgba('#e2464b', 0.95), size: 13.5 });
    // 이름표
    if (T.callouts) {
      D.label(112, 190, '💡 전등 (빛)', { bg: rgba('#d97706', 0.95), size: 14 });
      D.arrow(130, 204, m - 34, 240, { color: '#d97706', width: 2.5, head: 9 });
      D.label(330, 40, '탄산수소 나트륨 용액 (이산화 탄소를 공급)', { bg: rgba('#2563eb', 0.95), size: 14 });
      D.arrow(400, 56, 418, 190, { color: '#2563eb', width: 2.5, head: 9 });
      D.label(380, 134, '❓ 기포는 무슨 기체?', { bg: rgba('#15803d', 0.95), size: 14 });
      D.label(340, 372, '검정말', { bg: rgba('#15803d', 0.95), size: 13.5 });
    } else {
      D.label(BK.x + BK.w / 2, BK.y - 18, '탄산수소 나트륨 용액 ' + (Math.round(T.coV * 10) / 10) + ' %', { bg: rgba('#2563eb', 0.92), size: 13.5 });
    }
    // 스톱워치 · 기포 수
    const busy = T.mode !== 'idle';
    panel(12, 12, 168, 70, 14, 'rgba(255,255,255,.94)');
    if (busy) {
      const sec = Math.min(60, T.mt);
      text(24, 36, '⏱ ' + String(Math.floor(sec)).padStart(2, '0') + ' / 60 초', { size: 15, weight: 800, align: 'left', color: COL.ink });
      text(24, 68, '기포 ' + T.count + '개', { size: 22, weight: 800, align: 'left', color: '#15803d' });
      ctx.fillStyle = '#e4eaf2'; D.roundRect(104, 24, 66, 8, 4); ctx.fill();
      ctx.fillStyle = '#16a34a'; D.roundRect(104, 24, 66 * clamp(T.mt / 60, 0, 1), 8, 4); ctx.fill();
    } else {
      text(24, 36, '지금 기포 속도', { size: 13.5, weight: 800, align: 'left', color: COL.muted });
      text(24, 68, Math.round(T.rateShown) + ' 개/분', { size: 22, weight: 800, align: 'left', color: '#15803d' });
    }
    if (T.lastPt && T.lastPt.t < 3 && !busy) {
      const k = ease.outBack(Math.min(1, T.lastPt.t / 0.4));
      ctx.save(); ctx.translate(BK.x + BK.w / 2, 110 - T.lastPt.t * 6); ctx.scale(k, k);
      ctx.globalAlpha = T.lastPt.t > 2.4 ? 1 - (T.lastPt.t - 2.4) / 0.6 : 1;
      D.label(0, 0, '1분에 기포 ' + T.lastPt.n + '개!', { bg: rgba('#16a34a', 0.97), size: 17, pad: 12 });
      ctx.restore();
    }
  }

  /* ---------- 그래프 패널 ---------- */
  function panelRects() {
    const p = LAY.pn;
    if (PHONE) { const w = (p.w - 8) / 2; return [{ x: p.x, y: p.y, w, h: p.h }, { x: p.x + w + 8, y: p.y, w, h: p.h }]; }
    return [{ x: p.x, y: p.y, w: p.w, h: 168 }, { x: p.x, y: p.y + 180, w: p.w, h: p.h - 180 }];
  }
  function drawTankPanel() {
    const T = TANK, [ra, rb] = panelRects();
    // (1) 실시간 기포 속도
    const f = plotFrame(ra, { title: '실시간 기포 속도', xmin: 0, xmax: 100, ymin: 0, ymax: 40, yt: [0, 10, 20, 30, 40], xt: [], xlabel: '지난 20초 동안', ml: 34 });
    const hs = T.hist, n = hs.length;
    if (n > 1) {
      const x0 = f.px + f.pw - ((n - 1) / 99) * f.pw;
      ctx.save();
      ctx.beginPath(); ctx.rect(f.px, f.py - 4, f.pw, f.ph + 4); ctx.clip();
      ctx.beginPath(); ctx.moveTo(x0, f.py + f.ph);
      hs.forEach((v, i) => ctx.lineTo(x0 + (i / 99) * f.pw, f.Y(v)));
      ctx.lineTo(f.px + f.pw, f.py + f.ph); ctx.closePath();
      ctx.fillStyle = lgrad(0, f.py, 0, f.py + f.ph, [[0, 'rgba(22,163,74,.35)'], [1, 'rgba(22,163,74,.04)']]); ctx.fill();
      ctx.beginPath(); hs.forEach((v, i) => { const x = x0 + (i / 99) * f.pw, y = f.Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.restore();
      const lx = f.px + f.pw, ly = f.Y(hs[n - 1]);
      D.glow(lx, ly, 12, '#16a34a', 0.5); D.sphere(lx, ly, 5, '#16a34a', { gloss: false });
      D.label(f.px + 6, f.py + 12, Math.round(T.rateShown) + ' 개/분', { bg: rgba('#16a34a', 0.92), size: 13, align: 'left' });
    }
    // (2) 측정 결과 그래프 (아직 실험 도구가 열리기 전에는 관찰 안내)
    if (!has('light')) {
      panel(rb.x, rb.y, rb.w, rb.h, 12);
      text(rb.x + 14, rb.y + 26, '👀 관찰해 봐요', { size: 15, weight: 800, align: 'left', color: '#14532d' });
      const L2 = ['검정말 줄기 끝에서 기포가 올라와요.', '전등(빛)을 켜 둔 상태예요.', '물에는 탄산수소 나트륨이 녹아 있어요.', '기포 속 기체는 무엇일까요?'];
      L2.forEach((t2, i) => { wrapText(rb.x + 34, rb.y + 62 + i * (PHONE ? 42 : 64), t2, rb.w - 50, { size: 14, weight: 700, align: 'left', color: COL.ink, lh: 17 }); D.sphere(rb.x + 20, rb.y + 62 + i * (PHONE ? 42 : 64), 8, i === 3 ? '#e2464b' : '#16a34a', { gloss: false, text: String(i + 1), textScale: 1.0 }); });
      return;
    }
    const kind = T.gk;
    const cfg = {
      light: { title: '빛의 세기와 기포 수', xlabel: '전등 거리 (cm)', xmin: 50, xmax: 10, xt: [50, 40, 30, 20, 10], arr: T.lightPts, fx: (v) => v },
      co2: { title: '이산화 탄소 농도와 기포 수', xlabel: '탄산수소 나트륨 (%)', xmin: 0, xmax: 3, xt: [0, 1, 2, 3], arr: T.co2Pts, fx: (v) => v },
      temp: { title: '온도와 기포 수', xlabel: '물의 온도 (°C)', xmin: 10, xmax: 50, xt: [10, 20, 30, 40, 50], arr: T.tPts, fx: (v) => v },
    }[kind];
    const g = plotFrame(rb, { title: PHONE ? ' ' : cfg.title, xmin: cfg.xmin, xmax: cfg.xmax, ymin: 0, ymax: 40, yt: [0, 10, 20, 30, 40], xt: cfg.xt, xlabel: cfg.xlabel, ylabel: '1분 기포 수 (개)', ml: 44 });
    if (PHONE) text(rb.x + 10, rb.y + 20, cfg.title, { size: 12.5, weight: 800, align: 'left' });
    if (kind === 'light') {
      const cx = g.X(T.dV);
      D.dashedLine(cx, g.py, cx, g.py + g.ph, { color: '#e2464b', width: 2, dash: [5, 5], offset: CLK.t * 16 });
      D.label(g.px + g.pw - 4, g.py + 12, '빛이 강해져요 ▶', { bg: rgba('#d97706', 0.9), size: 12.5, align: 'right', pad: 6 });
    }
    const arr = cfg.arr;
    if (arr.length > 1) {
      ctx.save(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); arr.forEach((p, i) => { const x = g.X(p.x), y = g.Y(p.n * ease.outCubic(p.pop)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      ctx.restore();
    }
    arr.forEach((p) => {
      const x = g.X(p.x), y = g.Y(p.n), k = ease.outBack(Math.min(1, p.pop));
      D.sphere(x, y, 6.5 * k, '#16a34a', { shadow: true });
      if (p.pop > 0.5) text(x, y - 11, String(p.n), { size: 12.5, weight: 800, color: '#0f5a2c', stroke: '#fff', strokeWidth: 3 });
    });
    if (!arr.length) wrapText(g.px + g.pw / 2, g.py + g.ph / 2, kind === 'light' ? '거리를 정하고 “1분 동안 기포 세기”를 눌러요' : '실험을 실행하면 점이 찍혀요', g.pw - 24, { size: 13.5, color: COL.muted, weight: 700 });
  }

  /* ---------- 장면 3: 반응식 카드 맞추기 (캔버스 전체 사용) ---------- */
  const EQ = new CardBoard();
  const EQG = {};
  const KCOL = { co2: '#64748b', h2o: '#3b82f6', glucose: '#f59e0b', o2: '#ef4444', light: '#eab308', chloro: '#16a34a' };
  function buildEq() {
    EQ.slots.length = 0; EQ.chips.length = 0; EQ.drag = null; EQ.sel = null;
    const sl = (id, x, y, w, h, accept, ph, group) => EQ.addSlot({ id, x, y, w, h, accept, ph, group });
    let hs;
    if (!PHONE) {
      Object.assign(EQG, { plus: [[183, 170], [641, 170]], arrow: [337, 170, 487, 170], head: [[183, 108, '재료'], [641, 108, '산물']], title: [400, 34], tray: { x: 30, y: 286, w: 740, h: 214 }, cap: [50, 312] });
      sl('A', 41, 136, 128, 68, ['co2', 'h2o'], '재료', 'in'); sl('B', 197, 136, 128, 68, ['co2', 'h2o'], '재료', 'in');
      sl('E', 342, 92, 140, 40, ['light'], '에너지', null); sl('F', 342, 208, 140, 40, ['chloro'], '장소', null);
      sl('C', 499, 136, 128, 68, ['glucose', 'o2'], '산물', 'out'); sl('D', 655, 136, 128, 68, ['glucose', 'o2'], '산물', 'out');
      hs = [[170, 362], [400, 362], [630, 362], [170, 436], [400, 436], [630, 436]];
    } else {
      Object.assign(EQG, { plus: [[220, 120], [220, 332]], arrow: [220, 164, 220, 262], head: [[109, 72, '재료'], [109, 286, '산물']], title: [220, 30], tray: { x: 12, y: 384, w: 416, h: 296 }, cap: [26, 410] });
      sl('A', 34, 88, 150, 64, ['co2', 'h2o'], '재료', 'in'); sl('B', 256, 88, 150, 64, ['co2', 'h2o'], '재료', 'in');
      sl('E', 34, 190, 150, 40, ['light'], '에너지', null); sl('F', 256, 190, 150, 40, ['chloro'], '장소', null);
      sl('C', 34, 300, 150, 64, ['glucose', 'o2'], '산물', 'out'); sl('D', 256, 300, 150, 64, ['glucose', 'o2'], '산물', 'out');
      hs = [[112, 470], [328, 470], [112, 536], [328, 536], [112, 602], [328, 602]];
    }
    const defs = [['co2', '이산화 탄소'], ['h2o', '물'], ['glucose', '포도당'], ['o2', '산소'], ['light', '빛에너지'], ['chloro', '엽록체']];
    // 카드 순서를 섞어 놓아요 (고정된 섞임)
    const order = [3, 0, 4, 2, 5, 1];
    order.forEach((di, i) => {
      const d = defs[di];
      EQ.addChip({ id: d[0], kind: d[0], label: d[1], hx: hs[i][0], hy: hs[i][1], w: PHONE ? 176 : 170, h: 50, color: KCOL[d[0]], size: 16, tc: d[0] === 'light' ? '#3a2a00' : '#fff' });
    });
  }
  buildEq();
  function drawEq() {
    // 배경 (캔버스 전체)
    ctx.fillStyle = '#eaf5e6'; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.globalAlpha = 0.08;
    drawLeaf(VW - 60, VH - 40, 200, 64, -2.4, { shadow: false }); drawLeaf(40, VH * 0.45, 160, 50, -0.5, { shadow: false });
    ctx.restore();
    text(EQG.title[0], EQG.title[1], '광합성 반응식을 완성해요', { size: 22, weight: 800, color: '#14532d' });
    if (!PHONE) text(EQG.title[0], EQG.title[1] + 24, '재료 두 가지와 산물 두 가지, 그리고 필요한 에너지와 장소를 놓아요', { size: 14, weight: 700, color: COL.muted });
    EQG.head.forEach((h) => D.label(h[0], h[1], h[2], { bg: rgba('#15803d', 0.95), size: 15, pad: 12 }));
    EQG.plus.forEach((p) => text(p[0], p[1] + 11, '+', { size: 34, weight: 800, color: '#14532d' }));
    const a = EQG.arrow;
    D.arrow(a[0], a[1], a[2], a[3], { color: '#14532d', width: 6, head: 22 });
    const tr = EQG.tray;
    panel(tr.x, tr.y, tr.w, tr.h, 18, 'rgba(255,255,255,.7)');
    text(EQG.cap[0], EQG.cap[1], '🃏 카드 (끌어서 칸에 놓아요)', { size: 14.5, weight: 800, color: COL.muted, align: 'left' });
    EQ.draw();
  }

  /* ---------- 장면 4: 비닐하우스 ---------- */
  const FPLANTS = [130, 260, 390];
  const FLEAF = [];
  FPLANTS.forEach((px, i) => { for (let k = 0; k < 5; k++) FLEAF.push({ x: px, y: 378 - k * 24, side: k % 2 ? 1 : -1, ph: i + k }); });
  function farmEffL() { return FARM.night ? 0 : FARM.Ls; }
  function farmCalc() { return farmEval(FARM.night ? 0 : FARM.L, FARM.C, FARM.T); }
  function updateFarm(dt) {
    const F_ = FARM, ap = SciSim.approach;
    F_.Ls = ap(F_.Ls, F_.L, dt, 8); F_.Cs = ap(F_.Cs, F_.C, dt, 8); F_.Ts = ap(F_.Ts, F_.T, dt, 8);
    const ev = farmEval(F_.night ? 0 : F_.Ls, F_.Cs, F_.Ts);
    F_.ys = ap(F_.ys, ev.y, dt, 4);
    F_.tm -= dt;
    if (F_.tm <= 0) {
      F_.tm = 0.28;
      // 이산화 탄소가 관을 따라 들어와요
      if (F_.Cs > 6 && Math.random() < F_.Cs / 100 + 0.2) {
        const px = pick(FPLANTS);
        F_.mol.add(new Path([[56, 388], [96, 388], [px + rand(-20, 20), 330 - rand(0, 90)]]), 'co2', 66, { u: 3.8, fade: 12 });
      }
      if (F_.ys > 8 && Math.random() < F_.ys / 70) {
        const px = pick(FPLANTS) + rand(-26, 26), py = 320 - rand(0, 90);
        F_.mol.add(new Path([[px, py], [px + rand(-20, 20), py - rand(60, 120)], [px + rand(-30, 30), 150]]), 'o2', 40, { u: 3.6, fade: 14 });
      }
    }
    F_.mol.update(dt);
  }
  function drawFarm() {
    const F_ = FARM, night = F_.night, day = night ? 0.05 : 1;
    skyRect(0, 0, SW, 340, day);
    if (!night) { drawSun(70, 62, 26, 1); cloud(330, 64, 0.8, 0.85); cloud(440, 112, 0.5, 0.7); } else drawMoon(70, 62, 22, 1);
    // 풀밭
    ctx.fillStyle = lgrad(0, 330, 0, SH, [[0, night ? '#2f5a45' : '#86d27c'], [1, night ? '#1f3d30' : '#4fa65a']]);
    ctx.beginPath(); ctx.moveTo(0, 352); ctx.quadraticCurveTo(140, 330, 280, 348); ctx.quadraticCurveTo(420, 366, SW, 340); ctx.lineTo(SW, SH); ctx.lineTo(0, SH); ctx.closePath(); ctx.fill();
    // 하우스 뒤판
    const hx0 = 44, hx1 = 476, base = 404, wallTop = 262, peak = 128;
    const body = () => { ctx.beginPath(); ctx.moveTo(hx0, base); ctx.lineTo(hx0, wallTop); ctx.quadraticCurveTo(hx0, peak + 4, (hx0 + hx1) / 2, peak); ctx.quadraticCurveTo(hx1, peak + 4, hx1, wallTop); ctx.lineTo(hx1, base); ctx.closePath(); };
    contactShadow(260, 410, 230, 16, 0.9);
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = lgrad(0, peak, 0, base, [[0, night ? '#2b4a5e' : '#e6f6ff'], [1, night ? '#27473a' : '#dff1d4']]); ctx.fillRect(hx0, peak, hx1 - hx0, base - peak);
    // 안쪽 열기 · 냉기
    const warm = clamp((F_.Ts - 28) / 17, 0, 1), cool = clamp((20 - F_.Ts) / 10, 0, 1);
    if (warm > 0) { ctx.fillStyle = 'rgba(255,140,60,' + (0.22 * warm) + ')'; ctx.fillRect(hx0, peak, hx1 - hx0, base - peak); }
    if (cool > 0) { ctx.fillStyle = 'rgba(80,130,255,' + (0.2 * cool) + ')'; ctx.fillRect(hx0, peak, hx1 - hx0, base - peak); }
    // 조명 불빛
    const Le = farmEffL() / 100;
    FPLANTS.forEach((px) => {
      if (!night) {
        const g = ctx.createLinearGradient(0, 178, 0, 396);
        g.addColorStop(0, 'rgba(255,240,150,' + (0.5 * Le) + ')'); g.addColorStop(1, 'rgba(255,240,150,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(px - 12, 178); ctx.lineTo(px + 12, 178); ctx.lineTo(px + 70, 396); ctx.lineTo(px - 70, 396); ctx.closePath(); ctx.fill();
      }
    });
    // 흙
    ctx.fillStyle = '#8b6a45'; ctx.fillRect(hx0, 392, hx1 - hx0, 14);
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(hx0, 392, hx1 - hx0, 3);
    // 토마토 식물
    const yN = F_.ys / 100, t = CLK.t;
    FPLANTS.forEach((px, i) => {
      ctx.strokeStyle = '#2f8f46'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px, 394); ctx.quadraticCurveTo(px + Math.sin(t + i) * 3, 330, px, 262); ctx.stroke();
    });
    FLEAF.forEach((l, i) => {
      const k = 0.55 + 0.45 * Math.min(1, 0.3 + yN);
      const sway = Math.sin(t * 1.1 + l.ph) * 0.06;
      drawLeaf(l.x, l.y, 54 * k, 18 * k, (l.side < 0 ? Math.PI + 0.35 : -0.35) * 1 + sway * l.side, { shadow: false, c1: mix('#8bd673', '#c9d96a', 1 - yN), c2: mix('#3fae4b', '#a9b84a', 1 - yN), c3: mix('#2b8a3e', '#7f8c3a', 1 - yN) });
    });
    // 토마토 열매 (수확 지수에 따라 커지고 빨개져요)
    FPLANTS.forEach((px, i) => {
      [[-24, 340], [22, 318], [-8, 292]].forEach((q, k) => {
        const r = 4 + 12 * smooth(yN * 1.15 - k * 0.12);
        const col = mix('#7ac143', '#e23d3d', smooth(yN * 1.2 - k * 0.1));
        D.sphere(px + q[0], q[1] + r * 0.4, r, col, { shadow: true });
      });
    });
    // 기체 입자
    F_.mol.draw();
    ctx.restore();
    // 비닐 · 뼈대
    ctx.save(); body();
    ctx.fillStyle = 'rgba(255,255,255,' + (night ? 0.07 : 0.2) + ')'; ctx.fill();
    ctx.strokeStyle = night ? 'rgba(200,220,240,.7)' : 'rgba(120,140,160,.85)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = night ? 'rgba(200,220,240,.35)' : 'rgba(120,140,160,.5)';
    for (let k = 1; k < 5; k++) { const x = hx0 + ((hx1 - hx0) * k) / 5; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, peak + 22 - Math.abs(k - 2.5) * 6 + 12); ctx.stroke(); }
    ctx.restore();
    // 전등 (지붕에 매달림)
    FPLANTS.forEach((px) => {
      const on = !night && F_.Ls > 3;
      ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, peak + 12); ctx.lineTo(px, 168); ctx.stroke();
      ctx.fillStyle = '#7a8799'; ctx.beginPath(); ctx.moveTo(px - 20, 184); ctx.lineTo(px - 8, 166); ctx.lineTo(px + 8, 166); ctx.lineTo(px + 20, 184); ctx.closePath(); ctx.fill();
      if (on) { D.glow(px, 190, 22 + 36 * Le, '#fff0a0', 0.5 + 0.5 * Le); D.sphere(px, 188, 7, '#fff7c0', { gloss: false }); }
      else { ctx.fillStyle = '#c3ccd8'; circle(ctx, px, 188, 7); ctx.fill(); }
    });
    // 이산화 탄소 통 + 관
    const cs = F_.Cs / 100;
    ctx.fillStyle = lgrad(10, 0, 40, 0, [[0, '#9aa7b8'], [0.4, '#e3e9f1'], [1, '#7c8a9e']]); D.roundRect(10, 330, 30, 72, 9); ctx.fill();
    ctx.fillStyle = '#475569'; ctx.fillRect(18, 322, 14, 10);
    text(25, 372, 'CO₂', { size: 13, weight: 800, color: '#1e293b' });
    ctx.fillStyle = '#7c8a9e'; ctx.fillRect(38, 384, 24, 6);
    ctx.fillStyle = cs > 0.05 ? mix('#cbd5e1', '#22c55e', cs) : '#cbd5e1'; circle(ctx, 25, 346, 5); ctx.fill();
    // 온도계 + 값
    D.thermometer(458, 196, 118, F_.Ts, 10, 45, { ticks: false });
    D.label(458, 346, Math.round(F_.Ts) + ' °C', { bg: rgba('#475569', 0.92), size: 13 });
    if (night) {
      D.label(SW / 2, 300, '🌙 밤: 빛이 없어요', { bg: rgba('#0f172a', 0.82), size: 15 });
    }
    // 수확 상자
    if (F_.ys > 4) D.label(260, 440, '🍅 수확 지수 ' + Math.round(F_.ys), { bg: rgba('#dc2626', 0.92), size: 15, pad: 12 });
    else D.label(260, 440, '아직 수확할 게 없어요', { bg: rgba('#64748b', 0.92), size: 14 });
  }
  function bar(x, y, w, h, v, col, label, val, flag) {
    text(x, y - 7, label, { size: 13.5, weight: 800, align: 'left', color: COL.ink });
    if (val != null) text(x + w, y - 7, val, { size: 13.5, weight: 800, align: 'right', color: COL.muted });
    ctx.fillStyle = '#e8eef5'; D.roundRect(x, y, w, h, h / 2); ctx.fill();
    if (v > 0.01) { ctx.fillStyle = col; D.roundRect(x, y, Math.max(4, w * clamp(v, 0, 1)), h, h / 2); ctx.fill(); }
    if (flag) { const a = 0.5 + 0.5 * Math.sin(CLK.t * 6); ctx.strokeStyle = rgba('#e2464b', 0.5 + 0.5 * a); ctx.lineWidth = 3; D.roundRect(x - 3, y - 3, w + 6, h + 6, h / 2 + 3); ctx.stroke(); }
  }
  function drawFarmPanel() {
    const p = LAY.pn, F_ = FARM;
    panel(p.x, p.y, p.w, p.h, 14);
    const ev = farmEval(F_.night ? 0 : F_.Ls, F_.Cs, F_.Ts);
    const lv = fL2(F_.night ? 0 : F_.Ls), cv = fC2(F_.Cs), tv = fT2(F_.Ts);
    let dx, dy, r, bx, by, bw, cy2;
    if (!PHONE) { dx = p.x + p.w / 2; dy = p.y + 100; r = 72; bx = p.x + 22; by = p.y + 252; bw = p.w - 44; cy2 = p.y + 402; }
    else { dx = p.x + 100; dy = p.y + 118; r = 82; bx = p.x + 214; by = p.y + 46; bw = p.w - 214 - 16; cy2 = p.y + 196; }
    D.dial(dx, dy, r, F_.ys, 0, 100, { label: '수확 지수', color: '#16a34a', target: [88, 100], ticks: 5 });
    text(dx, dy + r + 22, '초록 구간(88 이상)이 목표', { size: 12.5, weight: 700, color: COL.muted });
    const lowest = Math.min(lv, cv, tv);
    text(bx, by - 26, '조건별 충족도', { size: 14, weight: 800, align: 'left', color: '#14532d' });
    bar(bx, by, bw, 16, lv, '#f5b301', '💡 빛', Math.round(lv * 100) + '%', lv === lowest && lowest < 0.93);
    bar(bx, by + 46, bw, 16, cv, '#64748b', '☁️ 이산화 탄소', Math.round(cv * 100) + '%', cv === lowest && lowest < 0.93);
    bar(bx, by + 92, bw, 16, tv, '#ef6c3a', '🌡️ 온도', Math.round(tv * 100) + '%', tv === lowest && lowest < 0.93);
    const cost = ev.cost;
    bar(bx, cy2, bw, 16, cost / 100, cost <= 50 ? '#0ea5e9' : '#e2464b', '💰 비용', Math.round(cost), false);
    const mx = bx + bw * 0.5;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(mx, cy2 - 4); ctx.lineTo(mx, cy2 + 20); ctx.stroke(); ctx.setLineDash([]);
    text(mx, cy2 + 36, '예산 50', { size: 12.5, weight: 800, color: '#334155' });
    if (!PHONE) D.label(p.x + p.w / 2, p.y + p.h - 28, lowest < 0.93 ? '가장 부족한 조건: ' + LIMNAME[ev.lim] : '모든 조건이 충분해요!', { bg: lowest < 0.93 ? rgba('#e2464b', 0.95) : rgba('#16a34a', 0.95), size: 14, pad: 12 });
    else D.label(dx, p.y + p.h - 18, lowest < 0.93 ? '가장 부족한 조건: ' + LIMNAME[ev.lim] : '모든 조건이 충분해요!', { bg: lowest < 0.93 ? rgba('#e2464b', 0.95) : rgba('#16a34a', 0.95), size: 13, pad: 10 });
  }

  /* ---------- 잎 장면 오른쪽 정리 패널 ---------- */
  function drawLeafPanel() {
    const p = LAY.pn;
    panel(p.x, p.y, p.w, p.h, 14);
    const L = LEAF;
    const box = (x, y, w, h, title, items, col) => {
      ctx.fillStyle = rgba(col, 0.1); D.roundRect(x, y, w, h, 12); ctx.fill();
      ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 2; D.roundRect(x, y, w, h, 12); ctx.stroke();
      D.label(x + w / 2, y, title, { bg: col, size: 14, pad: 12 });
      items.forEach((it, i) => {
        const iy = y + 34 + i * 40;
        drawMol(it[0], x + 36, iy + 6, 6.4, 0, 1);
        text(x + 66, iy + 11, it[1], { size: 16, weight: 800, align: 'left', color: COL.ink });
      });
    };
    if (!PHONE) {
      text(p.x + p.w / 2, p.y + 32, '광합성', { size: 22, weight: 800, color: '#14532d' });
      box(p.x + 14, p.y + 58, p.w - 28, 108, '재료 (들어가요)', [['co2', '이산화 탄소'], ['h2o', '물']], '#475569');
      const cx = p.x + p.w / 2;
      D.arrow(cx, p.y + 176, cx, p.y + 238, { color: '#14532d', width: 6, head: 20 });
      text(cx + 14, p.y + 202, '빛에너지', { size: 14, weight: 800, align: 'left', color: '#b45309' });
      text(cx + 14, p.y + 222, '엽록체', { size: 14, weight: 800, align: 'left', color: '#15803d' });
      box(p.x + 14, p.y + 252, p.w - 28, 108, '산물 (만들어져요)', [['glucose', '포도당'], ['o2', '산소']], '#d97706');
      text(cx, p.y + 394, '엽록체에서 만든 포도당', { size: 13.5, weight: 700, color: COL.muted });
      text(cx, p.y + 428, L.gluc + '개', { size: 30, weight: 800, color: '#d97706' });
      text(cx, p.y + 460, '확대(🍃→🔬→🟢)해서 관찰해요', { size: 13, weight: 700, color: COL.muted });
    } else {
      const w = (p.w - 56) / 2;
      box(p.x + 10, p.y + 26, w, 112, '재료', [['co2', '이산화 탄소'], ['h2o', '물']], '#475569');
      box(p.x + p.w - 10 - w, p.y + 26, w, 112, '산물', [['glucose', '포도당'], ['o2', '산소']], '#d97706');
      const cy = p.y + 82;
      D.arrow(p.x + 10 + w + 6, cy, p.x + p.w - 10 - w - 6, cy, { color: '#14532d', width: 5, head: 16 });
      text(p.x + p.w / 2, cy - 12, '빛에너지', { size: 12.5, weight: 800, color: '#b45309' });
      text(p.x + p.w / 2, cy + 24, '엽록체', { size: 12.5, weight: 800, color: '#15803d' });
      text(p.x + p.w / 2, p.y + 190, '엽록체에서 만든 포도당 ' + L.gluc + '개', { size: 15, weight: 800, color: '#d97706' });
      text(p.x + p.w / 2, p.y + 226, '확대(🍃→🔬→🟢)해서 관찰해요', { size: 13, weight: 700, color: COL.muted });
    }
  }

  /* ---------- 전체 그리기 ---------- */
  function sceneCard(fn) {
    softShadow(SSR.x, SSR.y, SSR.w, SSR.h, 20 * LAY.s, 16, 6, 'rgba(20,70,40,.24)');
    inScene(() => {
      rrPath(ctx, 0, 0, SW, SH, 20); ctx.clip();
      fn();
      FX.draw(ctx);
      drawChecks(0);
    });
  }
  function draw() {
    view.apply();
    ctx.fillStyle = '#eaf5e6'; ctx.fillRect(0, 0, VW, VH);
    if (scene === 'eq') { drawEq(); FX.draw(ctx); drawChecks(0); return; }
    if (scene === 'leaf') { sceneCard(drawLeafScene); drawLeafPanel(); }
    else if (scene === 'tank') { sceneCard(drawTank); drawTankPanel(); }
    else if (scene === 'farm') { sceneCard(drawFarm); drawFarmPanel(); }
  }

  /* ---------- 갱신 ---------- */
  let roTimer = 0;
  function update(dt) {
    CLK.t += dt;
    if (scene === 'leaf') updateLeaf(dt);
    else if (scene === 'tank') updateTank(dt);
    else if (scene === 'eq') EQ.update(dt);
    else if (scene === 'farm') updateFarm(dt);
    FX.update(dt);
    roTimer -= dt;
    if (roTimer <= 0) { roTimer = 0.2; refreshReadouts(); }
  }

  /* ---------- 화면 요소 ---------- */
  const el = {
    seg: $('#sceneSeg'), tb: $('#tbLabel'),
    ctlZoom: $('#ctlZoom'), ctlTankNote: $('#ctlTankNote'), ctlTank: $('#ctlTank'), ctlEq: $('#ctlEq'), ctlDesign: $('#ctlDesign'), ctlFarm: $('#ctlFarm'),
    zoomSeg: $('#zoomSeg'), lightTgl: $('#lightTgl'), distR: $('#distR'), distO: $('#distO'), measureBtn: $('#measureBtn'),
    eqReset: $('#eqReset'), dzRows: $('#dzRows'), runBtn: $('#runBtn'), dzNote: $('#dzNote'), dzHead: $('#dzHead'),
    fLight: $('#fLight'), fCo2: $('#fCo2'), fTemp: $('#fTemp'),
    r: [1, 2, 3].map((i) => ({ l: $('#rl' + i), v: $('#r' + i) })),
  };
  const has = (n) => (game && game.free) || F.has(n);
  const lvlNow = () => (game ? game.level : 0);
  const isFree = () => !!(game && game.free);
  function show(node, on) { if (node) node.hidden = !on; }

  function setScene(s, byMission) {
    if (!s || s === scene) return;
    scene = s;
    FX.clear(); checks.length = 0;
    TANK.callouts = lvlNow() === 0 && !isFree();
    hideHint();
    if (s === 'eq') EQ.sel = null;
    refreshUI();
    if (s === 'tank' && has('light') && lvlNow() === 1) hint('전등을 끌어 옮기거나 슬라이더로 거리를 바꿔 보세요.', 4500);
    if (s === 'leaf') hint('🔍 표시를 누르거나 단계 버튼으로 확대해 보세요.', 4000);
  }
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene, false); }));

  function setZoom(z) { LEAF.zt = clamp(z, 0, 2); refreshUI(); }
  $$('#zoomSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setZoom(+b.dataset.z); }));
  bindClick(el.lightTgl, () => { LEAF.light = !LEAF.light; refreshUI(); });

  SciSim.bindRange(el.distR, el.distO, (v) => v + ' cm', (v) => { if (TANK.mode === 'idle') { TANK.d = v; } else { el.distR.value = TANK.d; } });
  bindClick(el.measureBtn, startMeasure);
  bindClick(el.eqReset, () => { EQ.reset(); refreshUI(); });
  bindClick($('#resetBtn'), () => {
    if (scene === 'tank') { if (TANK.mode === 'idle') { TANK.lightPts.length = 0; TANK.co2Pts.length = 0; TANK.tPts.length = 0; TANK.lastPt = null; hint('측정 기록을 지웠어요.', 2500); } }
    else if (scene === 'eq') EQ.reset();
    else if (scene === 'leaf') { LEAF.zt = 0; LEAF.light = true; LEAF.gluc = 0; LEAF.o2n = 0; LEAF.merges = 0; }
    else if (scene === 'farm') { setFarm(50, 30, 20); }
    refreshUI();
  });

  function syncTankUI() {
    el.distR.disabled = TANK.mode !== 'idle';
    el.measureBtn.disabled = TANK.mode !== 'idle';
    el.measureBtn.textContent = TANK.mode === 'measure' ? '⏱ 세는 중…' : '⏱ 1분 동안 기포 세기';
    el.distR.value = TANK.d; el.distR.dispatchEvent(new Event('input'));
    refreshDesign();
  }

  /* 실험 설계표 */
  const DZ_ORDER = ['light', 'co2', 'temp', 'amount'];
  DZ_ORDER.forEach((f) => {
    const nm = document.createElement('div'); nm.className = 'dz-name'; nm.innerHTML = DZ_NAME[f][0] + (DZ_NAME[f][1] ? '<small>' + DZ_NAME[f][1] + '</small>' : '');
    const pr = document.createElement('div'); pr.className = 'dz-pair'; pr.dataset.f = f;
    [['diff', '다르게'], ['same', '같게']].forEach((o) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.v = o[0]; b.textContent = o[1]; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => { Sound.click(); if (TANK.mode !== 'idle') return; DZ.v[f] = DZ.v[f] === o[0] ? null : o[0]; refreshDesign(); });
      pr.appendChild(b);
    });
    el.dzRows.append(nm, pr);
  });
  function dzSet(kind) { DZ_ORDER.forEach((f) => { DZ.v[f] = f === kind ? 'diff' : 'same'; }); refreshDesign(); }
  function dzClear() { DZ_ORDER.forEach((f) => { DZ.v[f] = null; }); refreshDesign(); }
  function dzJudge(target) {
    const d = DZ_ORDER.filter((f) => DZ.v[f] === 'diff'), un = DZ_ORDER.filter((f) => !DZ.v[f]);
    if (un.length) return { ok: false, msg: '아직 정하지 않은 조건이 있어요. 모든 줄에서 “다르게” 또는 “같게”를 골라요.' };
    if (d.length === 0) return { ok: false, msg: '다르게 할 조건이 하나도 없어요. 알아보려는 조건을 “다르게”로 정해요.' };
    if (d.length > 1) return { ok: false, msg: '다르게 하는 조건이 ' + d.length + '개예요. 여러 개를 한꺼번에 바꾸면 무엇 때문에 달라졌는지 알 수 없어요. 알아보려는 조건 <b>1개</b>만 다르게!' };
    const kind = d[0];
    if (kind === 'amount') return { ok: false, msg: '검정말의 양은 실험 결과에 영향을 주지 않도록 같게 해야 해요.' };
    if (target && kind !== target) return { ok: false, msg: '이번에는 <b>' + (target === 'co2' ? '이산화 탄소 농도' : '온도') + '</b>의 영향을 알아봐요. 다르게 할 조건을 다시 골라요.' };
    if (!target && kind === 'light') return { ok: false, msg: '빛의 세기는 앞에서 알아봤어요. 이산화 탄소 농도나 온도를 골라 봐요.' };
    return { ok: true, kind };
  }
  function refreshDesign() {
    $$('.dz-pair button', el.dzRows).forEach((b) => b.setAttribute('aria-pressed', String(DZ.v[b.parentNode.dataset.f] === b.dataset.v)));
    const j = dzJudge(isFree() ? null : DZ.target);
    el.runBtn.disabled = !(j.ok && TANK.mode === 'idle');
    el.runBtn.textContent = TANK.mode === 'run' ? '⏱ 실험 중…' : '▶ 실험 실행';
    el.dzNote.innerHTML = j.ok ? '✅ 설계가 알맞아요! <b>실험 실행</b>을 눌러요.' : (DZ_ORDER.every((f) => !DZ.v[f]) ? '알아보려는 조건만 <b>다르게</b>, 나머지는 모두 <b>같게</b> 정해요.' : j.msg);
  }
  bindClick(el.runBtn, () => {
    const j = dzJudge(isFree() ? null : DZ.target);
    if (j.ok) { startRun(j.kind); hideHint(); }
  });

  /* 비닐하우스 슬라이더 */
  function setFarm(L, C, T) {
    FARM.L = L; FARM.C = C; FARM.T = T;
    el.fLight.value = L; el.fCo2.value = C; el.fTemp.value = T;
    [el.fLight, el.fCo2, el.fTemp].forEach((r) => r.dispatchEvent(new Event('input')));
  }
  SciSim.bindRange(el.fLight, $('#fLightO'), (v) => v + ' %', (v) => { FARM.L = v; });
  SciSim.bindRange(el.fCo2, $('#fCo2O'), (v) => v + ' %', (v) => { FARM.C = v; });
  SciSim.bindRange(el.fTemp, $('#fTempO'), (v) => v + ' °C', (v) => { FARM.T = v; });

  const ZNAME = ['잎 (눈으로 보기)', '세포 (현미경)', '엽록체 (더 확대)'];
  function refreshUI() {
    const lvl = lvlNow(), fr = isFree();
    show(el.ctlZoom, scene === 'leaf');
    show(el.ctlTankNote, scene === 'tank' && !has('light'));
    show(el.ctlTank, scene === 'tank' && has('light') && (fr || lvl <= 1));
    show(el.ctlEq, scene === 'eq');
    show(el.ctlDesign, scene === 'tank' && has('design') && (fr || lvl === 2));
    show(el.ctlFarm, scene === 'farm' && has('farm'));
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === scene));
    el.tb.textContent = SCENE_LABEL[scene];
    $$('#zoomSeg button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.z === LEAF.zt)));
    el.lightTgl.setAttribute('aria-pressed', String(LEAF.light));
    el.lightTgl.textContent = LEAF.light ? '💡 빛 켜짐 (눌러서 끄기)' : '🌙 빛 꺼짐 (눌러서 켜기)';
    el.fLight.disabled = FARM.night;
    syncTankUI();
    refreshReadouts();
  }
  function setRO(i, label, val) {
    const r = el.r[i];
    if (r.l.textContent !== label) r.l.textContent = label;
    if (r.v.textContent !== val) r.v.textContent = val;
  }
  function refreshReadouts() {
    if (scene === 'leaf') {
      setRO(0, '관찰 위치', ZNAME[Math.round(clamp(LEAF.zf, 0, 2))].split(' ')[0]);
      setRO(1, '들어가는 것 (재료)', '이산화 탄소 + 물');
      setRO(2, '나오는 것 (산물)', '포도당 + 산소');
    } else if (scene === 'tank') {
      setRO(0, '전등 거리', Math.round(TANK.dV) + ' cm');
      setRO(1, '지금 기포 속도', Math.round(TANK.rateShown) + ' 개/분');
      const n = TANK.gk === 'light' ? TANK.lightPts.length : TANK.gk === 'co2' ? TANK.co2Pts.length : TANK.tPts.length;
      setRO(2, '측정한 점', n + '개');
    } else if (scene === 'eq') {
      const f = (ids) => EQ.slots.filter((s) => ids.indexOf(s.id) >= 0 && s.chip).length;
      setRO(0, '놓은 카드', EQ.filledCount() + ' / 6장');
      setRO(1, '재료 칸', f(['A', 'B']) + ' / 2');
      setRO(2, '산물 칸', f(['C', 'D']) + ' / 2');
    } else if (scene === 'farm') {
      const ev = farmCalc();
      setRO(0, '수확 지수', Math.round(FARM.ys) + ' / 100');
      setRO(1, '가장 부족한 조건', Math.min(fL2(FARM.night ? 0 : FARM.L), fC2(FARM.C), fT2(FARM.T)) > 0.93 ? '없음' : LIMNAME[ev.lim]);
      setRO(2, '비용 (예산 50)', String(Math.round(ev.cost)));
    }
  }

  /* ---------- 입력 ---------- */
  let leafTap = false, lampDrag = false;
  SciSim.pointer(view, {
    down(p) {
      if (scene === 'eq') return EQ.down(p);
      const q = toSS(p);
      if (scene === 'leaf') {
        const k = Math.round(LEAF.zf);
        if (LEAF.zt === k && k < 2 && Math.hypot(q.x - FOC[k].x, q.y - FOC[k].y) < 44) { leafTap = true; return true; }
      } else if (scene === 'tank' && has('light') && TANK.mode === 'idle' && (isFree() || lvlNow() <= 1)) {
        const m = mouthX(TANK.dV);
        if (q.x > m - 80 && q.x < m + 12 && q.y > 220 && q.y < 310) { lampDrag = true; return true; }
      }
      return false;
    },
    move(p) {
      if (lampDrag) {
        const q = toSS(p), d = clamp(Math.round((BK.x - (q.x + 6)) / 3.9 / 5) * 5, 10, 50);
        if (d !== TANK.d) { TANK.d = d; syncTankUI(); }
      } else if (scene === 'eq') EQ.move(p);
    },
    up(p) {
      if (leafTap) { leafTap = false; setZoom(Math.round(LEAF.zf) + 1); Sound.click(); return; }
      if (lampDrag) { lampDrag = false; return; }
      if (scene === 'eq') EQ.up(p);
    },
  });
  EQ.onChange = () => refreshReadouts();

  /* 새로 고침 뒤 이어서 하는 미션을 위해 앞 미션의 결과를 채워 두는 도우미 */
  function fillLight() {
    [10, 20, 30, 40, 50].forEach((d) => { if (!TANK.lightPts.some((p) => p.x === d)) TANK.lightPts.push({ x: d, n: Math.floor(bubbleRate(d, 2, 30)), pop: 1 }); });
    TANK.lightPts.sort((a, b) => a.x - b.x);
  }
  function fillRun(kind) {
    if (kind === 'co2') { TANK.co2Pts.length = 0; [0, 0.5, 1, 2, 3].forEach((c) => TANK.co2Pts.push({ x: c, n: Math.floor(bubbleRate(20, c, 30)), pop: 1 })); }
    else { TANK.tPts.length = 0; [10, 20, 30, 35, 40, 50].forEach((T_) => TANK.tPts.push({ x: T_, n: Math.floor(bubbleRate(20, 1, T_)), pop: 1 })); }
  }

  /* =========================================================
     미션 (게임 엔진)
     ========================================================= */
  const ptsN = (arr) => arr.length;
  function eqFeedback() {
    if (EQ.filledCount() < 6) return '아직 빈 칸이 있어요. 카드 6장을 모두 놓아 보세요.';
    const w = EQ.wrongSlots();
    if (!w.length) return true;
    EQ.flagWrong(w);
    const ids = w.map((s) => s.id).join('');
    if (/[AB]/.test(ids)) return '재료 칸에는 광합성에 <b>들어가는</b>(쓰이는) 물질을 놓아요. 빨간 테두리 카드를 확인해 봐요.';
    if (/[CD]/.test(ids)) return '산물 칸에는 광합성으로 <b>만들어지는</b> 물질을 놓아요. 빨간 테두리 카드를 확인해 봐요.';
    return '화살표 위에는 광합성에 필요한 <b>에너지</b>, 아래에는 광합성이 일어나는 <b>장소</b>를 놓아요.';
  }
  const lightN = () => TANK.lightPts.length;

  game = SciSim.game({
    simId: 'm2-photosynthesis',
    mount: '#game',
    badge: '광합성 박사',
    homeHref: '../../index.html#g2',
    featureLabels: {
      basic: '🔍 잎 → 세포 → 엽록체 확대 · 🧪 검정말 · 📝 반응식 카드',
      light: '💡 전등 거리 · ⏱ 기포 세기 · 📈 그래프',
      design: '🧪 실험 설계표 · ▶ 실험 실행',
      farm: '🏡 비닐하우스 (빛·이산화 탄소·온도)',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onMissionStart(m) {
      if (game && game.free) return;
      if (m.scene) setScene(m.scene, true);
      refreshUI();
    },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '광합성: 잎 속에서 일어나는 일', short: '광합성', icon: '🌿', phase: '관찰',
        features: ['basic'],
        intro: '<p class="si-q">❓ 탐구 질문: 식물은 어떤 조건에서 광합성을 더 활발하게 할까?</p>' +
          '<p>그 전에 <b>광합성</b>이 무엇이고 잎 속 어디에서 일어나는지부터 알아봐요. 🍃 잎을 세포, 엽록체까지 <b>확대</b>해서 어떤 물질이 들어가고 나오는지 관찰해요.</p>',
        setup() { setScene('leaf', true); },
        recap: '광합성은 <b>엽록체</b>에서 <b>빛에너지</b>를 이용해 <b>이산화 탄소</b>와 <b>물</b>로 <b>포도당</b>(양분)과 <b>산소</b>를 만드는 과정이에요.',
        summary: '<ul><li><b>광합성</b>: 식물이 빛에너지를 이용해 양분(포도당)을 만드는 과정이에요. 잎의 세포 속 <b>엽록체</b>에서 일어나요.</li>' +
          '<li><b>이산화 탄소 + 물 → (빛에너지, 엽록체) → 포도당 + 산소</b></li>' +
          '<li>이산화 탄소는 <b>기공</b>으로 들어오고, 물은 뿌리에서 <b>물관</b>을 따라 올라와요. 산소는 기공으로 나가요.</li>' +
          '<li>검정말에 빛을 비출 때 생기는 기포는 <b>산소</b>예요. (탄산수소 나트륨 용액은 이산화 탄소를 공급해요)</li></ul>',
        missions: [
          {
            title: '엽록체까지 들어가 보기', scene: 'leaf',
            goal: '잎을 <b>엽록체</b>까지 확대한 뒤, <b>포도당이 2개</b> 만들어지는 것을 지켜봐요.',
            hint: '단계 버튼(🍃 → 🔬 → 🟢)이나 잎 위의 🔍 표시를 눌러요. 💡 빛이 켜져 있어야 해요.',
            setup() { LEAF.gluc = 0; LEAF.o2n = 0; LEAF.merges = 0; LEAF.light = true; if (LEAF.zt > 0) LEAF.zt = 0; refreshUI(); },
            check: () => LEAF.zf > 1.9 && LEAF.light && LEAF.gluc >= 2,
            hold: 0.6,
            status: () => mark(LEAF.zf > 1.9) + ' 엽록체까지 확대 · ' + mark(LEAF.light) + ' 빛 켜짐 · ' + mark(LEAF.gluc >= 2) + ' 포도당 ' + Math.min(LEAF.gluc, 2) + ' / 2개',
            explain: '광합성은 잎 세포 속 <b>엽록체</b>에서 일어나요. 기공으로 들어온 <b>이산화 탄소</b>와 뿌리에서 올라온 <b>물</b>이 재료가 되고, <b>빛에너지</b>로 <b>포도당</b>과 <b>산소</b>가 만들어져요. 빛이 없으면 반응이 일어나지 않았지요.',
          },
          {
            title: '광합성 반응식 완성하기', scene: 'eq', manual: true,
            setup() { EQ.reset(); refreshUI(); },
            goal: '재료·산물 카드와 에너지·장소 카드를 알맞은 칸에 놓은 뒤 <b>✔ 확인하기</b>를 눌러요.',
            hint: '화살표 앞은 재료, 뒤는 산물이에요. 화살표 위·아래에는 빛에너지와 엽록체가 들어가요.',
            check: eqFeedback,
            explain: '<b>이산화 탄소 + 물 →(빛에너지, 엽록체)→ 포도당 + 산소</b>. 재료(이산화 탄소, 물)는 광합성에 쓰이고, 산물(포도당, 산소)은 광합성으로 만들어져요.',
          },
          {
            type: 'quiz', title: '검정말에서 올라오는 기포', scene: 'tank',
            setup() { TANK.d = 20; TANK.dV = 20; TANK.co2 = 2; TANK.coV = 2; TANK.T = 30; TANK.TV = 30; TANK.callouts = true; refreshUI(); },
            goal: '빛을 받는 검정말에서 기포가 올라와요. 이 기포는 무엇이고, 물에 <b>탄산수소 나트륨</b>을 녹인 까닭은 무엇일까요?',
            choices: ['기포는 이산화 탄소이고, 탄산수소 나트륨은 산소를 공급한다', '기포는 산소이고, 탄산수소 나트륨은 이산화 탄소를 공급한다', '기포는 수증기이고, 탄산수소 나트륨은 물을 공급한다', '기포는 포도당이고, 탄산수소 나트륨은 빛을 공급한다'],
            answer: 1,
            feedback: ['이산화 탄소는 광합성의 재료라서 검정말이 <b>흡수</b>해요. 기포로 나오는 기체는 산물인 산소예요.', '', '기포는 수증기가 아니에요. 광합성의 산물 중 기체인 산소가 기포로 나와요.', '포도당은 기체가 아니고 잎 속에 남아요. 빛은 전등이 공급해요.'],
            explain: '광합성의 산물 중 기체인 <b>산소</b>가 기포로 나와요. 탄산수소 나트륨은 물속에 <b>이산화 탄소</b>를 공급해서, 광합성의 재료가 부족하지 않게 해 줘요. 그래서 <b>기포 수가 많을수록 광합성이 활발</b>하다고 볼 수 있어요.',
          },
        ],
      },
      {
        title: '빛의 세기: 밝을수록 광합성이 활발할까?', short: '빛의 세기', icon: '💡', phase: '실험',
        features: ['light'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 광합성의 재료와 산물을 알았고, 검정말의 기포가 <b>산소</b>라는 것도 알았어요.</div>' +
          '<p>기포가 나오는 빠르기는 <b>광합성이 활발한 정도</b>를 보여 줘요. 전등을 가까이·멀리 옮기며 <b>1분 동안 나오는 기포 수</b>를 재고, 빛의 세기와 광합성의 관계를 그래프로 알아봐요. (전등이 가까울수록 빛이 세요)</p>',
        setup() { setScene('tank', true); TANK.callouts = false; TANK.gk = 'light'; },
        recap: '빛이 셀수록 광합성이 활발해져요. 하지만 빛이 어느 정도 이상으로 세지면 기포 수가 <b>더 늘지 않고 일정</b>해져요.',
        summary: '<ul><li>기포 수가 많을수록 <b>광합성이 활발</b>해요. (산소가 많이 만들어져요)</li>' +
          '<li>전등이 가까울수록(빛이 셀수록) 기포 수가 <b>늘어나요</b>.</li>' +
          '<li>빛이 어느 정도 이상 세지면 기포 수가 <b>더 늘지 않고 일정</b>해져요. 이때는 이산화 탄소 농도나 온도 같은 <b>다른 조건</b>이 부족한 거예요.</li></ul>',
        missions: [
          {
            title: '여러 거리에서 기포 세기', scene: 'tank',
            setup() { TANK.lightPts.length = 0; TANK.gk = 'light'; TANK.callouts = false; refreshUI(); },
            goal: '전등 거리를 바꿔 가며 <b>서로 다른 4곳</b>에서 1분 동안의 기포 수를 재요.',
            hint: '슬라이더나 전등을 끌어 거리를 바꾸고 ⏱ 버튼을 눌러요. 가까운 곳과 먼 곳을 섞어서 재면 좋아요.',
            check: () => lightN() >= 4 && TANK.mode === 'idle',
            hold: 0.5,
            status: () => '측정한 거리 <b>' + Math.min(lightN(), 4) + ' / 4곳</b> ' + TANK.lightPts.map((p) => p.x + 'cm').join(' · '),
            explain: '전등이 가까울수록 빛이 세져서 기포가 많이 나왔어요. 즉 <b>빛이 셀수록 광합성이 활발</b>해요. 그래프는 처음에는 올라가다가 점점 평평해지는 모양이에요.',
          },
          {
            type: 'quiz', title: '그래프가 평평해지는 까닭', scene: 'tank',
            setup() { fillLight(); TANK.gk = 'light'; refreshUI(); },
            goal: '전등을 10 cm에서 15 cm로 멀리했는데도 기포 수가 거의 같아요. 빛이 셀수록 더 늘지 않는 까닭은?',
            choices: ['전등이 너무 가까우면 식물이 광합성을 멈추기 때문이다', '빛 말고 이산화 탄소 농도나 온도 같은 다른 조건이 부족해서 더 늘지 못한다', '빛의 세기는 광합성과 아무 관계가 없기 때문이다', '기포가 물에 다시 녹아 버리기 때문이다'],
            answer: 1,
            feedback: ['광합성이 멈춘 것이 아니에요. 기포는 계속 나오고 있어요. 더 늘지 않을 뿐이에요.', '', '관계가 있어요. 멀리서는 빛이 셀수록 기포가 늘었지요.', '기포가 녹는 것이 아니라 광합성의 속도가 일정해진 거예요.'],
            explain: '빛이 충분히 세지면 광합성 속도를 제한하는 것은 빛이 아니라 <b>이산화 탄소 농도나 온도</b> 같은 다른 조건이 돼요. 그래서 기포 수가 <b>일정</b>해져요.',
          },
        ],
      },
      {
        title: '실험 설계: 한 번에 하나만 바꿔요', short: '실험 설계', icon: '🧪', phase: '탐구',
        features: ['design'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 빛이 너무 세면 다른 조건이 한계가 된다는 것을 알았어요.</div>' +
          '<p>광합성에는 <b>이산화 탄소 농도</b>와 <b>온도</b>도 영향을 줘요. 어떤 조건의 영향을 알아보려면 <b>그 조건만 다르게</b> 하고 나머지는 <b>모두 같게</b> 해야 해요. (변인 통제) 실험 설계표를 완성하고 실행해 보세요.</p>',
        setup() { setScene('tank', true); TANK.callouts = false; TANK.d = 20; syncTankUI(); },
        recap: '이산화 탄소 농도가 높을수록 광합성이 활발해지다가 일정해져요. 온도는 <b>적정 온도(약 30~35 °C)</b>에서 가장 활발하고, 더 높아지면 오히려 줄어요.',
        summary: '<ul><li><b>변인 통제</b>: 알아보려는 조건(다르게 할 조건) <b>1가지</b>만 바꾸고, 나머지는 <b>모두 같게</b> 해요.</li>' +
          '<li>이산화 탄소 농도가 높을수록 광합성이 활발해지다가, 어느 정도부터는 <b>일정</b>해져요.</li>' +
          '<li>온도: <b>적정 온도(약 30~35 °C)</b>에서 광합성이 가장 활발하고, 그보다 낮거나 너무 높으면 줄어요.</li>' +
          '<li>광합성에 영향을 주는 환경 요인: <b>빛의 세기, 이산화 탄소 농도, 온도</b></li></ul>',
        missions: [
          {
            title: '이산화 탄소의 영향, 어떻게 알아볼까?', scene: 'tank', manual: true,
            setup() { DZ.target = 'co2'; dzClear(); TANK.gk = 'co2'; refreshUI(); },
            goal: '<b>이산화 탄소 농도</b>의 영향을 알아보는 실험을 설계해요. 설계표에서 <b>다르게</b> 할 조건과 <b>같게</b> 할 조건을 정하고 ✔ 확인하기를 눌러요.',
            hint: '이산화 탄소 농도(탄산수소 나트륨 용액)만 “다르게”, 나머지 3가지는 “같게”로 해요.',
            check: () => { const j = dzJudge('co2'); return j.ok ? true : j.msg; },
            explain: '이산화 탄소 농도의 영향을 알아보려면 <b>이산화 탄소 농도만 다르게</b> 하고, 빛의 세기·온도·검정말의 양은 <b>같게</b> 해야 해요. 그래야 기포 수의 차이가 이산화 탄소 때문이라고 말할 수 있어요.',
          },
          {
            title: '이산화 탄소 실험 실행', scene: 'tank',
            setup() { dzSet('co2'); DZ.target = 'co2'; TANK.gk = 'co2'; refreshUI(); },
            goal: '설계한 실험을 <b>실행</b>하고, 이산화 탄소 농도에 따른 기포 수 그래프를 완성해요.',
            hint: '설계표 아래의 ▶ 실험 실행 버튼을 눌러요. 농도를 바꾸며 5번 측정해요.',
            check: () => TANK.co2Pts.length >= 5 && TANK.mode === 'idle',
            hold: 0.6,
            status: () => '측정 ' + Math.min(5, TANK.co2Pts.length) + ' / 5 · ' + (TANK.mode === 'run' ? '실험 중…' : '▶ 실험 실행을 눌러요'),
            explain: '탄산수소 나트륨 농도(이산화 탄소)가 높아질수록 기포 수가 <b>늘다가 일정</b>해졌어요. 이산화 탄소가 충분해지면 빛이나 온도 같은 다른 조건이 한계가 되기 때문이에요.',
          },
          {
            title: '이번에는 온도의 영향', scene: 'tank',
            setup() { DZ.target = 'temp'; dzClear(); TANK.gk = 'temp'; refreshUI(); },
            goal: '<b>온도</b>의 영향을 알아보는 실험을 직접 설계해서 실행해요. 기포 수가 가장 많은 온도를 찾아요.',
            hint: '온도만 “다르게”, 나머지는 “같게”로 정한 뒤 ▶ 실험 실행을 눌러요.',
            check: () => TANK.tPts.length >= 6 && TANK.mode === 'idle',
            hold: 0.6,
            status: () => {
              const j = dzJudge('temp');
              return mark(j.ok) + ' 설계 ' + mark(TANK.tPts.length >= 6) + ' 측정 ' + Math.min(6, TANK.tPts.length) + ' / 6';
            },
            explain: '온도가 올라가면 기포가 늘다가 <b>약 30~35 °C(적정 온도)</b>에서 가장 많고, 그보다 더 높아지면 <b>오히려 줄어요</b>. 너무 높은 온도에서는 광합성에 관여하는 물질(효소)의 작용이 약해지기 때문이에요. 빛·이산화 탄소와 달리 온도는 “일정”이 아니라 “꼭대기가 있는” 그래프예요.',
          },
        ],
      },
      {
        title: '비닐하우스 농부: 조건을 맞춰요', short: '적용', icon: '🏡', phase: '적용',
        features: ['farm'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 광합성에는 <b>빛의 세기·이산화 탄소 농도·온도</b>가 영향을 준다는 것을 실험으로 알았어요.</div>' +
          '<p>비닐하우스에서는 이 조건을 사람이 조절해서 토마토를 잘 키워요. 조건을 설정해 <b>수확 지수</b>를 높이되, 비용도 생각해야 해요!</p>',
        setup() { setScene('farm', true); FARM.night = false; refreshUI(); },
        recap: '광합성을 가장 크게 제한하는 <b>한계 요인</b>을 찾아 그 조건을 개선하면 수확이 늘어요. 빛이 없는 밤에는 이산화 탄소를 더 줘도 광합성은 일어나지 않아요.',
        summary: '<ul><li>비닐하우스에서는 <b>빛(조명), 이산화 탄소, 온도</b>를 조절해 광합성을 활발하게 해요.</li>' +
          '<li>가장 부족한 조건이 광합성의 빠르기를 정해요. 이미 충분한 조건을 더 늘려도 소용없어요.</li>' +
          '<li>빛이 없으면 이산화 탄소를 더 공급해도 광합성이 일어나지 않아요.</li></ul>',
        missions: [
          {
            title: '한계 요인을 찾아라', scene: 'farm',
            setup() { FARM.night = false; setFarm(90, 10, 32); refreshUI(); },
            goal: '빛도 충분하고 온도도 알맞은데 수확이 적어요. <b>딱 한 가지</b> 조건만 바꿔서 수확 지수를 <b>80 이상</b>으로 올려요.',
            hint: '오른쪽 “조건별 충족도”에서 가장 낮은 막대를 찾아봐요.',
            check: () => { const ev = farmCalc(); return ev.y >= 80 && FARM.C >= 40 && Math.abs(FARM.L - 90) <= 10 && Math.abs(FARM.T - 32) <= 3; },
            hold: 1,
            status: () => { const ev = farmCalc(); return '수확 지수 <b>' + Math.round(ev.y) + '</b> · 가장 부족한 조건: <b>' + LIMNAME[ev.lim] + '</b>'; },
            explain: '이산화 탄소가 부족해서 빛과 온도가 아무리 좋아도 광합성이 늘지 못했어요. 이렇게 광합성을 가장 크게 제한하는 조건을 <b>한계 요인</b>이라고 해요. 한계 요인(이산화 탄소)을 개선하자 수확이 크게 늘었어요.',
          },
          {
            title: '수확은 높게, 비용은 낮게', scene: 'farm',
            setup() { FARM.night = false; setFarm(30, 30, 20); refreshUI(); },
            goal: '수확 지수 <b>88 이상</b>, 비용 <b>50 이하</b>가 되도록 세 가지 조건을 모두 알맞게 설정해요.',
            hint: '모든 조건을 최대로 올리면 비용이 너무 커요. 충족도가 90%쯤 되면 충분해요. 온도는 30~35 °C가 좋아요.',
            check: () => { const ev = farmCalc(); return ev.y >= 88 && ev.cost <= 50; },
            hold: 1,
            status: () => { const ev = farmCalc(); return mark(ev.y >= 88) + ' 수확 ' + Math.round(ev.y) + ' / 88 이상 · ' + mark(ev.cost <= 50) + ' 비용 ' + Math.round(ev.cost) + ' / 50 이하'; },
            explain: '세 조건 중 하나라도 부족하면 수확이 줄어요. 하지만 조건을 필요 이상으로 높이면 비용만 늘어요. 광합성은 빛과 이산화 탄소는 <b>충분해지면 일정</b>, 온도는 <b>적정 온도</b>에서 최대라서 알맞게 맞추는 것이 중요해요.',
          },
          {
            type: 'quiz', title: '밤에 이산화 탄소를 주면?', scene: 'farm',
            setup() { FARM.night = true; setFarm(FARM.L, 80, 28); refreshUI(); },
            goal: '밤의 비닐하우스에 이산화 탄소를 가득 채워도 수확이 늘지 않아요. 그 까닭은 무엇일까요?',
            choices: ['밤에는 식물이 호흡을 하지 않기 때문이다', '밤에는 빛이 없어서 광합성이 일어나지 않기 때문이다', '이산화 탄소는 광합성에 필요하지 않기 때문이다', '밤에는 물이 부족하기 때문이다'],
            answer: 1,
            feedback: ['식물은 밤에도 호흡을 해요. 다만 호흡은 이산화 탄소를 내보내는 과정이라서 수확을 늘리지 못해요.', '', '이산화 탄소는 광합성의 재료예요. 하지만 재료가 있어도 빛이 없으면 반응이 일어나지 않아요.', '물이 부족한 것과는 상관이 없어요. 빛이 없어서 광합성이 멈춘 거예요.'],
            explain: '광합성에는 <b>빛에너지</b>가 꼭 필요해요. 밤에는 빛이 없어서 이산화 탄소가 아무리 많아도 광합성이 일어나지 않아요. 그래서 이산화 탄소 공급은 <b>빛이 있는 낮</b>에 해야 효과가 있어요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  refreshUI();
  SciSim.loop((dt) => {
    update(dt);
    draw();
  });
  window.__sim = {
    VW, VH, LAY, LEAF, TANK, FARM, EQ, DZ, FX,
    get game() { return game; },
    get scene() { return scene; },
    setScene, setZoom, startMeasure, startRun, setFarm, dzSet, dzClear, dzJudge, fillLight, fillRun, update, draw, bubbleRate, farmEval,
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    solveEq() {
      const want = { A: 'co2', B: 'h2o', E: 'light', F: 'chloro', C: 'glucose', D: 'o2' };
      EQ.reset();
      Object.keys(want).forEach((id) => { const s = EQ.slots.find((q) => q.id === id), c = EQ.chips.find((q) => q.kind === want[id]); EQ.place(c, s); });
    },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / VW, y: r.top + (y * r.height) / VH }; },
    bench(n) { const t0 = performance.now(); let mx = 0; for (let i = 0; i < n; i++) { const a = performance.now(); update(1 / 60); draw(); mx = Math.max(mx, performance.now() - a); } return { avg: (performance.now() - t0) / n, max: mx }; },
  };
})();
