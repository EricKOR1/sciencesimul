/* =========================================================
   중2 Ⅰ. 물질의 특성 — 녹는점과 끓는점 [9과08-01]
   ① [실험] 녹는점: 팔미트산 5 g · 10 g을 같은 방법으로 가열 → 수평 구간의 온도(약 63 °C)가 같다 (🔍 입자 모형)
   ② [실험] 끓는점: 물(100 °C) · 에탄올(78 °C)을 적은 양 · 많은 양으로 가열 → 양이 달라도 같다
   ③ [탐구] 압력과 끓는점: 압력을 바꾸면 물의 끓는점이 달라진다 (높은 산 0.7기압 ≈ 90 °C, 압력솥 2기압 ≈ 120 °C)
   ④ [적용] 물질 구별: 가열 곡선의 수평 구간 온도와 녹는점 · 끓는점 표를 비교해 미지 시료 X · Y 찾기
   ※ 녹는점·끓는점은 물질의 양과 관계없이 일정한 물질의 특성 (녹는점 = 같은 물질의 어는점)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;

  /* ---------- 화면 (태블릿 = 가로형 800×560, 휴대폰 = 세로형 440×640) ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 440 : 800, VH = PHONE ? 670 : 560;
  const BG = '#f6f9fe';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();          // 거품 · 김 · 반짝임

    /* =========================================================
     공용 도구 — 실험 기구 · 액체 · 패널 · 롤링 숫자판 · 시퀀서
     (물질의 특성 3개 차시가 같은 모양을 쓰도록 같은 코드를 씁니다)
     ========================================================= */
  const TAU = Math.PI * 2;
  const RM = !!SciSim.reduceMotion;
  const rgba = SciSim.color.rgba, mix = SciSim.color.mix, shade = SciSim.color.shade;
  const ease = SciSim.ease;
  const rand = (a, b) => a + Math.random() * (b - a);
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  /* 한글 받침에 따라 '과/와', '은/는', '이/가' 고르기 */
  const hasBat = (w) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
  const wa = (w) => (hasBat(w) ? '과' : '와');
  const dS = (d) => (Number.isInteger(d) ? d.toFixed(1) : String(d));          // 밀도 값 표시 (1 → 1.0)
  const COL = {
    ink: '#1b2333', muted: '#5d6879', good: '#14a058', bad: '#e2464b', warm: '#f26b3a', cold: '#2f7de1',
    sub: '#8b5cf6', subD: '#5b21b6', line: '#dde4ef', glass: '#8fa3bd', water: '#6bb6f5',
  };
  const CLK = { t: 0 };                       // 화면 시계 (update에서 증가 → 빨리 감기·재현 가능)
  const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
  const inRect = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  const text = (x, y, s, o) => D.text(x, y, s, o);
  const pill = (x, y, s, o) => D.label(x, y, s, o);
  /* 상자 너비에 맞게 글자 크기를 줄여서 쓰기 */
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
  /* 16진수 색 → rgba 문자열 (밝게/어둡게 + 투명도) */
  function tint(hex, amt, a) {
    const c = SciSim.color.hexToRgb(hex), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    const f = (v) => Math.round((t - v) * p + v);
    return 'rgba(' + f(c.r) + ',' + f(c.g) + ',' + f(c.b) + ',' + (a == null ? 1 : a) + ')';
  }
  /* 두 16진수 색을 섞어 16진수 색으로 (vessel 의 액체 색처럼 16진수가 필요한 곳에 써요) */
  const hex2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
  function mixHex(a, b, t) {
    const A = SciSim.color.hexToRgb(a), B = SciSim.color.hexToRgb(b);
    return '#' + hex2(A.r + (B.r - A.r) * t) + hex2(A.g + (B.g - A.g) * t) + hex2(A.b + (B.b - A.b) * t);
  }
  function vgrad(c, x, y, w, h, top, bottom) {
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    c.fillStyle = g; c.fillRect(x, y, w, h);
  }

  /* ---------- 부드러운 그림자 (한 번 그려 두고 재사용) ---------- */
  const SHC = new Map();
  let shK = 0;
  function rrPath(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
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
    softShadow(x, y, w, h, r, blur == null ? 12 : blur, dy == null ? 4 : dy, color || 'rgba(30,50,100,.18)');
    ctx.fillStyle = fill || '#fff'; D.roundRect(x, y, w, h, r); ctx.fill();
  }
  function contactShadow(cx, cy, rx, ry, a) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(30,40,70,' + (0.34 * (a == null ? 1 : a)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(30,40,70,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  }

  /* ---------- 축하 효과 · NEW 표시 · 입자 돋보기 틀 ---------- */
  const checks = [];
  function celebrate(x, y) {
    FX.burst(x, y, { count: 26, speed: 190, life: 0.9, size: 4 });
    checks.push({ x, y, t: 0 });
    Sound.success();
  }
  function drawChecks(dt) {
    for (let i = checks.length - 1; i >= 0; i--) {
      const c = checks[i];
      c.t += dt;
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
    D.label(x, y, 'NEW', { bg: rgba(COL.sub, 0.85 + a * 0.15), size: 13, pad: 7 });
  }
  function ringRect(r, rad) {
    const a = 0.5 + 0.5 * Math.sin(CLK.t * 6);
    ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.35 + 0.5 * a); ctx.lineWidth = 4; D.roundRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, (rad || 16) + 4); ctx.stroke(); ctx.restore();
    newBadge(r.x + r.w - 20, r.y - 4);
  }
  /* inner() 는 틀 안쪽(가장자리에서 8 px 이상 떨어진 곳)에만 그려야 해요 — 둥근 모서리 클립 없이 그려서 빨라요 */
  function lensFrame(r, o, inner) {
    ctx.save();
    panel(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 20, '#fff', 18, 6, 'rgba(40,30,90,.25)');
    ctx.beginPath(); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.clip();
    vgrad(ctx, r.x, r.y, r.w, r.h, o.top || '#f9fcff', o.bot || '#e4effd');
    ctx.restore();
    inner();
    ctx.save();
    ctx.beginPath(); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.clip();
    const gl = ctx.createLinearGradient(r.x, r.y, r.x + r.w * 0.5, r.y + r.h * 0.6);
    gl.addColorStop(0, 'rgba(255,255,255,.30)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
    const rg = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    rg.addColorStop(0, '#c4b5fd'); rg.addColorStop(0.5, '#7c3aed'); rg.addColorStop(1, '#4c1d95');
    ctx.strokeStyle = rg; ctx.lineWidth = 5; D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.stroke();
    pill(r.x + 12, r.y + 16, o.title || '🔍 입자 모형', { bg: '#5b21b6', size: 14, align: 'left', pad: 10 });
  }

  /* ---------- 광택 있는 입자 (스프라이트를 한 번 만들어 재사용) ---------- */
  const spriteCache = {};
  function sprite(color, R) {
    const k = clamp(Math.round(view.scale * view.dpr * 1.3), 1, 4), m = 1.55;       // 화면 해상도에 맞춰 만들어요 (너무 크게 만들면 줄여 그리는 데 시간이 걸려요)
    const key = color + '|' + R + '|' + k;
    if (spriteCache[key]) return spriteCache[key];
    const size = Math.ceil(R * 2 * m * k);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.scale(k, k);
    const cx = R * m, cy = R * m;
    const sh = g.createRadialGradient(cx + R * 0.12, cy + R * 0.34, R * 0.3, cx + R * 0.12, cy + R * 0.34, R * 1.4);
    sh.addColorStop(0, 'rgba(20,30,60,.28)'); sh.addColorStop(1, 'rgba(20,30,60,0)');
    g.fillStyle = sh; g.beginPath(); g.arc(cx + R * 0.12, cy + R * 0.34, R * 1.4, 0, TAU); g.fill();
    const gr = g.createRadialGradient(cx - R * 0.35, cy - R * 0.42, R * 0.06, cx, cy, R);
    gr.addColorStop(0, shade(color, 0.62)); gr.addColorStop(0.5, color); gr.addColorStop(1, shade(color, -0.38));
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.62)';
    g.beginPath(); g.ellipse(cx - R * 0.33, cy - R * 0.42, R * 0.34, R * 0.2, -0.6, 0, TAU); g.fill();
    return (spriteCache[key] = { c, half: R * m });
  }
  function drawBall(c, color, x, y, R, alpha) {
    const R2 = Math.max(2, Math.round(R)), sp = sprite(color, R2);
    const s = sp.half * 2 * (R / R2);
    if (alpha != null) c.globalAlpha = alpha;
    c.drawImage(sp.c, x - s / 2, y - s / 2, s, s);
    if (alpha != null) c.globalAlpha = 1;
  }

  /* ---------- 시간 기반 시퀀서: 게임 루프의 dt로 진행하므로 빨리 감기·취소가 쉬워요 ---------- */
  const SQ = { tw: [], tm: [], gen: 0 };
  function run(dur, fn, done, easing) {
    SQ.tw.push({ t: 0, dur: RM ? 0.001 : Math.max(0.001, dur), fn, done, e: typeof easing === 'function' ? easing : (ease[easing] || ease.outCubic), gen: SQ.gen });
  }
  function tw(obj, to, dur, easing, done) {
    const from = {};
    for (const k in to) from[k] = obj[k];
    run(dur, (e) => { for (const k in to) obj[k] = from[k] + (to[k] - from[k]) * e; }, done, easing);
  }
  function after(sec, fn) { SQ.tm.push({ t: RM ? 0 : sec, fn, gen: SQ.gen }); }
  /* seq([ (next) => ..., (next) => ... ]) : 각 단계가 next()를 부르면 다음 단계로 */
  function seq(steps) {
    const g = SQ.gen;
    let i = 0;
    const go = () => { if (g !== SQ.gen) return; const s = steps[i++]; if (s) s(go); };
    go();
  }
  function sqCancel() { SQ.gen++; SQ.tw = []; SQ.tm = []; }
  function sqUpdate(dt) {
    const tws = SQ.tw; SQ.tw = [];
    const keep = [];
    for (const o of tws) {
      if (o.gen !== SQ.gen) continue;
      o.t += dt;
      const p = Math.min(1, o.t / o.dur);
      o.fn(o.e(p));
      if (p >= 1) { if (o.done && o.gen === SQ.gen) o.done(); } else if (o.gen === SQ.gen) keep.push(o);
    }
    SQ.tw = keep.concat(SQ.tw);
    const tms = SQ.tm; SQ.tm = [];
    const k2 = [];
    for (const o of tms) {
      if (o.gen !== SQ.gen) continue;
      o.t -= dt;
      if (o.t <= 0) o.fn(); else k2.push(o);
    }
    SQ.tm = k2.concat(SQ.tm);
  }
  /* 포물선처럼 위로 솟았다가 내려앉는 이동 */
  function arcTo(obj, x, y, dur, done, hgt) {
    const x0 = obj.x, y0 = obj.y, h = hgt != null ? hgt : Math.min(80, 26 + Math.abs(x - x0) * 0.22 + Math.max(0, y - y0) * 0.1);
    run(dur, (e) => { obj.x = x0 + (x - x0) * e; obj.y = y0 + (y - y0) * e - Math.sin(Math.PI * e) * h; }, done, 'inOutCubic');
  }

  /* ---------- 안내 말풍선 (캔버스 위) ---------- */
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint');
    if (!h) return;
    h.textContent = msg; h.classList.remove('hide');
    clearTimeout(hintTimer);
    if (ms) hintTimer = setTimeout(() => h.classList.add('hide'), ms);
  }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }

  /* ---------- 롤링 숫자판 (전자저울 · 계기판) ---------- */
  class Odo {
    constructor(dec, o) {
      o = o || {};
      this.dec = dec || 0;
      this.sp = new SciSim.Spring(0, { stiffness: o.k || 110, damping: o.d || 17 });
    }
    set(v) { this.sp.target = v; }
    jump(v) { this.sp.value = v; this.sp.target = v; this.sp.velocity = 0; }
    update(dt) { this.sp.update(dt); }
    get v() { return this.sp.value; }
    get target() { return this.sp.target; }
    get stable() { return Math.abs(this.sp.value - this.sp.target) < 0.05 * Math.pow(10, 1 - this.dec) && Math.abs(this.sp.velocity) < 0.6; }
  }
  /* 숫자가 한 칸씩 굴러 올라가는 LCD (오도미터 방식) */
  function drawLCD(x, y, w, h, odo, o) {
    o = o || {};
    const c = ctx, dec = odo.dec, nd = o.digits || 5;
    c.save();
    const bg = c.createLinearGradient(0, y, 0, y + h);
    bg.addColorStop(0, '#0b1820'); bg.addColorStop(1, '#173540');
    c.fillStyle = bg; D.roundRect(x, y, w, h, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1.5; D.roundRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, 6.5); c.stroke();
    const unitW = o.unit ? (o.unitW || 22) : 4;
    const area = w - unitW - 16, cw = area / (nd + (dec > 0 ? 0.35 : 0));
    const fs = Math.min(h * 0.78, cw * 1.6), lineH = fs * 1.05, cy = y + h / 2 + 1;
    c.beginPath(); D.roundRect(x + 3, y + 3, w - 6, h - 6, 5); c.clip();
    c.font = '800 ' + fs + 'px ui-monospace,"SF Mono",Menlo,Consolas,monospace';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(124,242,196,.8)'; c.shadowBlur = 7; c.fillStyle = '#7cf2c4';
    const n = Math.max(0, odo.v) * Math.pow(10, dec);
    for (let col = 0; col < nd; col++) {
      const k = nd - 1 - col;
      const xk = n / Math.pow(10, k), ip = Math.floor(xk + 1e-9), fr = Math.max(0, xk - ip);
      if (ip === 0 && k > dec) continue;                       // 앞자리 0은 비움
      const cx = x + 9 + cw * (col + 0.5) + (dec > 0 && k < dec ? cw * 0.35 : 0);
      const roll = RM ? 0 : (k === 0 ? fr : (fr > 0.9 ? (fr - 0.9) / 0.1 : 0));
      c.globalAlpha = 1 - roll * 0.85; c.fillText(String(ip % 10), cx, cy - roll * lineH);
      if (roll > 0.001) { c.globalAlpha = 0.15 + roll * 0.85; c.fillText(String((ip + 1) % 10), cx, cy + (1 - roll) * lineH); }
    }
    c.globalAlpha = 1;
    if (dec > 0) { c.fillText('.', x + 9 + cw * (nd - dec) + cw * 0.17, cy + fs * 0.3); }
    c.shadowBlur = 0;
    if (o.unit) { c.font = D.font(Math.min(15, h * 0.5), 800); c.fillStyle = '#7cf2c4'; c.textAlign = 'right'; c.fillText(o.unit, x + w - 8, cy + 3); }
    // 안정 표시등
    c.fillStyle = odo.stable ? '#7cf2c4' : 'rgba(124,242,196,.25)'; circle(c, x + 8, y + 8, 2.6); c.fill();
    c.restore();
  }

  /* ---------- 유리 용기와 액체 ---------- */
  const tubeClosed = (c, x, y, w, h, r) => {
    c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h - r); c.quadraticCurveTo(x, y + h, x + r, y + h);
    c.lineTo(x + w - r, y + h); c.quadraticCurveTo(x + w, y + h, x + w, y + h - r); c.lineTo(x + w, y); c.closePath();
  };
  const tubeOpen = (c, x, y, w, h, r, lip) => {
    lip = lip == null ? 5 : lip;
    c.beginPath(); c.moveTo(x - lip, y - 4); c.lineTo(x, y); c.lineTo(x, y + h - r); c.quadraticCurveTo(x, y + h, x + r, y + h);
    c.lineTo(x + w - r, y + h); c.quadraticCurveTo(x + w, y + h, x + w, y + h - r); c.lineTo(x + w, y); c.lineTo(x + w + lip, y - 4);
  };
  /* vessel(o): 유리 속 액체(여러 층) 그리기
     o.x0 o.x1 o.yTop o.yBot : 안쪽 범위   o.path(c): 안쪽 닫힌 경로   o.outline(c): 유리 벽 열린 경로
     o.layers: [{y: 윗면 높이, yb?: 아랫면(생략하면 아래 층의 윗면), color, alpha, wob?(x,u)}]  (아래층부터)
     o.amp 윗면 물결 · o.iamp 층 경계 물결 · o.men 메니스커스(px) · o.ripple {x,a} 국소 물결
     o.inside(c): 액체 속 물체 그리기 */
  function vessel(o) {
    const c = ctx, N = 30, x0 = o.x0, x1 = o.x1, W = x1 - x0, t = o.t != null ? o.t : CLK.t;
    const L = o.layers || [];
    const E = L.map((ly, i) => {
      const top = i === L.length - 1, e = new Array(N + 1);
      for (let j = 0; j <= N; j++) {
        const u = j / N, x = x0 + W * u, s = u * 2 - 1;
        let y = ly.y;
        if (top) {
          const a = RM ? 0 : (o.amp || 0);
          y += (Math.sin(t * 2.2 + x * 0.09) + 0.5 * Math.sin(t * 3.4 - x * 0.16)) * a - (o.men || 0) * Math.pow(Math.abs(s), 5);
          if (o.ripple && o.ripple.a > 0.01) y += Math.sin(Math.abs(x - o.ripple.x) * 0.2 - t * 10) * o.ripple.a * Math.exp(-Math.abs(x - o.ripple.x) / 34);
        } else if (!RM) y += Math.sin(t * 1.6 + x * 0.1 + i * 1.7) * (o.iamp || 0);
        if (ly.wob) y += ly.wob(x, u);
        e[j] = y;
      }
      return e;
    });
    const B = L.map((ly, i) => {
      if (ly.yb == null) return null;
      const e = new Array(N + 1);
      for (let j = 0; j <= N; j++) { const u = j / N, x = x0 + W * u; e[j] = ly.yb + (ly.wobB ? ly.wobB(x, u) : 0); }
      return e;
    });
    const bandPath = (i) => {
      c.beginPath();
      for (let j = 0; j <= N; j++) { const x = x0 + W * j / N; j ? c.lineTo(x, E[i][j]) : c.moveTo(x, E[i][j]); }
      for (let j = N; j >= 0; j--) { const x = x0 + W * j / N; c.lineTo(x, B[i] ? B[i][j] : (i === 0 ? o.yBot + 2 : E[i - 1][j])); }
      c.closePath();
    };
    c.save(); o.path(c); c.clip();
    const gb = c.createLinearGradient(x0, 0, x1, 0);
    gb.addColorStop(0, 'rgba(215,228,246,.5)'); gb.addColorStop(0.3, 'rgba(255,255,255,.10)'); gb.addColorStop(0.75, 'rgba(255,255,255,.05)'); gb.addColorStop(1, 'rgba(190,208,232,.42)');
    c.fillStyle = gb; c.fillRect(x0 - 4, o.yTop - 10, W + 8, o.yBot - o.yTop + 16);
    L.forEach((ly, i) => {
      const mn = Math.min.apply(null, E[i]), mx = B[i] ? Math.max.apply(null, B[i]) : (i === 0 ? o.yBot : Math.max.apply(null, E[i - 1]));
      const g = c.createLinearGradient(0, mn, 0, Math.max(mn + 4, mx));
      const a = ly.alpha != null ? ly.alpha : 0.8;
      g.addColorStop(0, tint(ly.color, 0.22, a * 0.94)); g.addColorStop(1, tint(ly.color, -0.14, a));
      c.fillStyle = g; bandPath(i); c.fill();
    });
    // 윗면 반짝임 (층마다 가는 선)
    L.forEach((ly, i) => {
      const top = i === L.length - 1;
      c.beginPath();
      for (let j = 0; j <= N; j++) { const x = x0 + W * j / N; j ? c.lineTo(x, E[i][j]) : c.moveTo(x, E[i][j]); }
      c.strokeStyle = 'rgba(255,255,255,' + (top ? 0.8 : 0.38) + ')'; c.lineWidth = top ? 2 : 1.4; c.stroke();
      if (top) { c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 6; c.stroke(); }
    });
    // 원통형 입체감 (양 끝이 어둡고 왼쪽에 빛)
    const gs = c.createLinearGradient(x0, 0, x1, 0);
    gs.addColorStop(0, 'rgba(10,40,90,.20)'); gs.addColorStop(0.16, 'rgba(255,255,255,.16)'); gs.addColorStop(0.3, 'rgba(255,255,255,0)'); gs.addColorStop(0.8, 'rgba(10,40,90,0)'); gs.addColorStop(1, 'rgba(10,40,90,.24)');
    c.fillStyle = gs; c.fillRect(x0 - 4, o.yTop - 10, W + 8, o.yBot - o.yTop + 16);
    if (o.inside) {
      o.inside(c);
      L.forEach((ly, i) => { c.fillStyle = tint(ly.color, 0, 0.2); bandPath(i); c.fill(); });   // 물체 위에 액체 색을 살짝 덧입힘
    }
    c.restore();
    if (o.outline) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      c.strokeStyle = o.glass || 'rgba(120,150,190,.9)'; c.lineWidth = 3; o.outline(c); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(x0 + 7, o.yTop + 14); c.lineTo(x0 + 7, o.yBot - 16); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x1 - 7, o.yTop + 26); c.lineTo(x1 - 7, o.yBot - 24); c.stroke();
      c.restore();
    }
  }
  /* 눈금 있는 유리관: 아래 받침 + 액체. G {cx, w, yTop, yBot(안쪽 바닥), base(책상 높이)} */
  function glassFoot(G) {
    const c = ctx, cx = G.cx, b = G.base, w = G.w;
    contactShadow(cx, b - 1, w / 2 + 34, 7, 0.9);
    const g = c.createLinearGradient(cx - w, 0, cx + w, 0);
    g.addColorStop(0, '#d5e2f1'); g.addColorStop(0.45, '#f6fafe'); g.addColorStop(1, '#a9bdd4');
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, b - 6, w / 2 + 24, 7.5, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(120,150,190,.8)'; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = g; c.beginPath(); c.moveTo(cx - w / 2 - 2, G.yBot + 2); c.lineTo(cx - w / 2 - 14, b - 8); c.quadraticCurveTo(cx, b - 1, cx + w / 2 + 14, b - 8); c.lineTo(cx + w / 2 + 2, G.yBot + 2); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(120,150,190,.7)'; c.stroke();
  }
  /* 안쪽 높이 → 눈금(mL) 표시: ticks {zero(0 mL의 y), pxPerMl, max, major, minor} */
  function glassTicks(G, tk) {
    const c = ctx;
    c.save(); c.strokeStyle = 'rgba(60,80,110,.75)'; c.fillStyle = 'rgba(60,80,110,.9)'; c.lineWidth = 1.2;
    c.font = D.font(11.5, 700); c.textAlign = 'left'; c.textBaseline = 'middle';
    const x1 = G.cx + G.w / 2;
    for (let v = tk.minor; v <= tk.max + 0.01; v += tk.minor) {
      const y = tk.zero - v * tk.pxPerMl, major = Math.abs(v % tk.major) < 0.01;
      if (y < G.yTop - 1) break;
      c.beginPath(); c.moveTo(x1 - (major ? 15 : 8), y); c.lineTo(x1 - 1, y); c.stroke();
      if (major) c.fillText(String(v), x1 + 5, y);
    }
    c.restore();
  }

  /* ---------- 금속 조각 (막대 · 덩어리) ---------- */
  const METAL = {
    al: { hi: '#f4f7fb', mid: '#c9d2de', lo: '#8d9aad', edge: '#6f7d92' },
    fe: { hi: '#c9ced8', mid: '#7f8898', lo: '#454d5c', edge: '#2f3643' },
    pb: { hi: '#aeb9cb', mid: '#6d7a92', lo: '#39445a', edge: '#27304a' },
    cu: { hi: '#f6c9a1', mid: '#cf7f46', lo: '#8a4a22', edge: '#6b3718' },
    unk: { hi: '#d4d9e2', mid: '#8b94a6', lo: '#4d5668', edge: '#363e4e' },
  };
  /* (x, y) = 아래쪽 가운데. 막대(바): w×h */
  function metalBar(x, y, w, h, kind, label, o) {
    o = o || {};
    const c = ctx, M = METAL[kind] || METAL.al, d = Math.min(9, w * 0.26), x0 = x - w / 2, y0 = y - h;
    c.save();
    if (o.alpha != null) c.globalAlpha = o.alpha;
    const g = c.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, M.hi); g.addColorStop(0.35, M.mid); g.addColorStop(0.7, M.lo); g.addColorStop(1, M.mid);
    c.fillStyle = g; D.roundRect(x0, y0, w, h, 4); c.fill();
    // 윗면
    c.fillStyle = M.hi; c.beginPath(); c.moveTo(x0 + 2, y0 + 1); c.lineTo(x0 + d, y0 - d * 0.55); c.lineTo(x0 + w + d - 2, y0 - d * 0.55); c.lineTo(x0 + w - 2, y0 + 1); c.closePath(); c.fill();
    // 오른쪽 옆면
    c.fillStyle = M.lo; c.beginPath(); c.moveTo(x0 + w - 1, y0 + 2); c.lineTo(x0 + w + d - 2, y0 - d * 0.55 + 2); c.lineTo(x0 + w + d - 2, y0 + h - d * 0.55 - 3); c.lineTo(x0 + w - 1, y0 + h - 3); c.closePath(); c.fill();
    c.strokeStyle = M.edge; c.lineWidth = 1.3; D.roundRect(x0, y0, w, h, 4); c.stroke();
    // 솔질 무늬 + 반짝임
    c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1;
    for (let i = 1; i < 6; i++) { const yy = y0 + (h * i) / 6; c.beginPath(); c.moveTo(x0 + 3, yy); c.lineTo(x0 + w - 3, yy); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.55)'; D.roundRect(x0 + 4, y0 + 4, 4, Math.max(6, h - 14), 2); c.fill();
    if (label) { c.font = D.font(Math.min(18, w * 0.6), 800); c.fillStyle = 'rgba(30,40,60,.62)'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x, y0 + h / 2 + 1); }
    c.restore();
  }
  /* 덩어리(울퉁불퉁한 돌 모양): 반지름 r, seed로 모양 고정 */
  function metalLump(x, y, r, kind, label, seed, o) {
    o = o || {};
    const c = ctx, M = METAL[kind] || METAL.unk, n = 9, cy = y - r;
    const pts = [];
    let s = seed * 9301 + 49297;
    const rn = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const rr = r * (0.86 + rn() * 0.26); pts.push([x + Math.cos(a) * rr * 1.05, cy + Math.sin(a) * rr * 0.92]); }
    c.save();
    if (o.alpha != null) c.globalAlpha = o.alpha;
    const path = () => {
      c.beginPath();
      const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const m0 = mid(pts[n - 1], pts[0]);
      c.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % n]); c.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
      c.closePath();
    };
    const g = c.createRadialGradient(x - r * 0.4, cy - r * 0.45, r * 0.1, x, cy, r * 1.15);
    g.addColorStop(0, M.hi); g.addColorStop(0.5, M.mid); g.addColorStop(1, M.lo);
    c.fillStyle = g; path(); c.fill();
    c.strokeStyle = M.edge; c.lineWidth = 1.4; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x - r * 0.55, cy - r * 0.1); c.lineTo(x - r * 0.15, cy - r * 0.5); c.stroke();
    c.beginPath(); c.moveTo(x + r * 0.1, cy + r * 0.45); c.lineTo(x + r * 0.45, cy + r * 0.12); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(x - r * 0.42, cy - r * 0.5, r * 0.2, r * 0.11, -0.6, 0, TAU); c.fill();
    if (label) { c.font = D.font(Math.min(20, r * 1.05), 800); c.fillStyle = 'rgba(255,255,255,.85)'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x, cy + 1); }
    c.restore();
  }

  /* 범례: 오른쪽 끝에 맞춰 (공 + 글자)를 늘어놓아요. items: [{c: 색, t: 글자}] */
  function legendRow(xRight, y, items) {
    ctx.save(); ctx.font = D.font(PHONE ? 12 : 13, 800);
    let w = 0; const ws = items.map((q) => { const m = ctx.measureText(q.t).width; w += m + 26; return m; });
    let x = xRight - w + 6;
    items.forEach((q, i) => { drawBall(ctx, q.c, x + 6, y, 6.2); ctx.fillStyle = COL.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(q.t, x + 16, y + 1); x += ws[i] + 26; });
    ctx.restore();
  }



  let game = null;
  let F = new Set();
  const on = (f) => (game && game.free) || F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));

  /* ---------- 자료 (단위 °C) ---------- */
  const SUBS = {
    palm: { id: 'palm', name: '팔미트산', mp: 63, bp: null, solid: '#f6efd8', liquid: '#f3e19a', pcol: '#f59e0b' },
    naph: { id: 'naph', name: '나프탈렌', mp: 80, bp: null, solid: '#f7f9fc', liquid: '#e7edf6', pcol: '#a855f7' },
    water: { id: 'water', name: '물', mp: 0, bp: 100, liquid: '#8fd0fa', pcol: '#3b82f6' },
    eth: { id: 'eth', name: '에탄올', mp: -114, bp: 78, liquid: '#bfeedd', pcol: '#10b981' },
  };
  const TABLE = ['water', 'eth', 'palm', 'naph'];
  /* 압력(기압)에 따른 물의 끓는점 (Antoine 식) */
  const bpWater = (P) => 1730.63 / (8.07131 - Math.log10(clamp(P, 0.2, 5) * 760)) - 233.426;
  const tStr = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1)).replace('-', '\u2212');

  /* ---------- 가열 곡선: 구간(segs)으로 만들어요 (온도 · 시간[분]) ---------- */
  function mkCurve(kind, a) {
    if (kind === 'melt') {                                  // a = {m: 질량, mp, T0}
      const m = a.m, T0 = a.T0 || 25, mp = a.mp;
      return { xmax: a.xmax || 20, ymin: 20, ymax: a.ymax || 100, segs: [
        { id: 'sol', t0: 0, t1: 0.8 * m, T0, T1: mp, lab: '고체', sh: '고' },
        { id: 'melt', t0: 0.8 * m, t1: 1.4 * m, T0: mp, T1: mp, lab: '고체+액체 (녹는 중)', sh: '녹는 중', flat: true, name: '녹는점' },
        { id: 'liq', t0: 1.4 * m, t1: 1.85 * m, T0: mp, T1: mp + (a.rise || 22), lab: '액체', sh: '액' },
      ] };
    }
    const bp = a.bp, V = a.V, T0 = a.T0 || 20;               // 끓는점 (물 · 에탄올 · 압력)
    const tr = a.tr != null ? a.tr : (bp - T0) * a.k, tb = a.tb != null ? a.tb : a.kb * V;
    return { xmax: a.xmax || 30, ymin: 0, ymax: a.ymax || 120, segs: [
      { id: 'liq', t0: 0, t1: tr, T0, T1: bp, lab: '액체', sh: '액' },
      { id: 'boil', t0: tr, t1: tr + tb, T0: bp, T1: bp, lab: '액체+기체 (끓는 중)', sh: '끓는 중', flat: true, name: '끓는점' },
    ] };
  }
  function curveAt(cv, t) {
    const sg = cv.segs;
    let i = 0;
    while (i < sg.length - 1 && t >= sg[i].t1) i++;
    const s = sg[i], f = clamp((t - s.t0) / Math.max(1e-6, s.t1 - s.t0), 0, 1);
    return { i, id: s.id, seg: s, f, T: lerp(s.T0, s.T1, f) };
  }
  const endOf = (cv) => cv.segs[cv.segs.length - 1].t1;

  /* ---------- 실험 종류 ---------- */
  const KIND = {
    melt: { layout: 'bath', speed: 1.7, bath: 92, samples: [{ sub: 'palm', amt: 5, unit: 'g' }, { sub: 'palm', amt: 10, unit: 'g' }] },
    water: { layout: 'direct', speed: 2.5, samples: [{ sub: 'water', amt: 50, unit: 'mL' }, { sub: 'water', amt: 100, unit: 'mL' }] },
    eth: { layout: 'bath', speed: 2.2, bath: 90, samples: [{ sub: 'eth', amt: 5, unit: 'mL' }, { sub: 'eth', amt: 10, unit: 'mL' }] },
    press: { layout: 'pot', speed: 1.7, samples: [{ sub: 'water', amt: 100, unit: 'mL' }] },
    unk: { layout: 'bath', speed: 1.6, bath: 92, samples: [{ sub: 'naph', amt: 8, unit: 'g', unk: 'X' }, { sub: 'eth', amt: 8, unit: 'mL', unk: 'Y' }] },
  };
  function curveFor(kind, s, P) {
    if (kind === 'melt') return mkCurve('melt', { m: s.amt, mp: SUBS.palm.mp });
    if (kind === 'water') return mkCurve('boil', { V: s.amt, bp: 100, tr: 0.16 * s.amt, kb: 0.1, xmax: 30, ymax: 120 });
    if (kind === 'eth') return mkCurve('boil', { V: s.amt, bp: 78, k: 0, tr: 0.7 * s.amt, kb: 0.8, xmax: 16, ymax: 100 });
    if (kind === 'press') { const bp = bpWater(P); return mkCurve('boil', { V: 100, bp, tr: 0.1 * (bp - 20), tb: 5, xmax: 16, ymax: 130 }); }
    if (s.unk === 'X') return mkCurve('melt', { m: 8, mp: 80, xmax: 16, ymax: 100, rise: 9 });
    return mkCurve('boil', { V: 8, bp: 78, tr: 5.6, tb: 6.6, xmax: 16, ymax: 100 });
  }

  /* ---------- 배치 ---------- */
  const LAY = PHONE ? {
    lab: { x: 4, y: 4, w: 432, h: 290 },
    top: { x: 4, y: 300, w: 432, h: 200 },
    bot: { x: 4, y: 506, w: 432, h: 156 },
  } : {
    lab: { x: 8, y: 8, w: 372, h: 544 },
    top: { x: 392, y: 8, w: 400, h: 300 },
    bot: { x: 392, y: 316, w: 400, h: 236 },
  };
  /* 실험대 배치: 중탕(bath) · 직접 가열(direct) · 압력 용기(pot) */
  function apGeo(layout) {
    const L = LAY.lab, A = {};
    A.table = L.y + L.h - (PHONE ? 26 : 36);
    const ph = PHONE ? 20 : 26;
    A.plate = { cx: L.x + L.w / 2, y: A.table - ph, w: L.w - (PHONE ? 40 : 56), h: ph };
    const pb = A.plate.y;
    if (layout === 'bath') {
      const w = L.w - (PHONE ? 44 : 68), h = PHONE ? 124 : 206;
      A.bath = { cx: A.plate.cx, w, h, bot: pb, top: pb - h, x0: A.plate.cx - w / 2, x1: A.plate.cx + w / 2, water: 0.78 };
      const tw = PHONE ? 38 : 46, tb = pb - 14, tt = PHONE ? L.y + 78 : L.y + 160;
      const dx = PHONE ? 86 : 72;
      A.units = [-1, 1].map((s) => ({ cx: A.plate.cx + s * (PHONE ? 86 : 74), w: tw, top: tt, bot: tb, h: tb - tt }));
    } else if (layout === 'direct') {
      const hs = PHONE ? [96, 124] : [128, 176], ws = PHONE ? [112, 142] : [122, 156];
      A.units = [0, 1].map((i) => ({ cx: A.plate.cx + (i ? 1 : -1) * (PHONE ? 100 : 88), w: ws[i], top: pb - hs[i], bot: pb - 2, h: hs[i] - 2, water: i ? 0.66 : 0.5 }));
    } else {
      const w = PHONE ? 150 : 190, h = PHONE ? 140 : 200;
      A.units = [{ cx: L.x + (PHONE ? 150 : 150), w, top: pb - h, bot: pb - 2, h: h - 2, water: 0.62 }];
    }
    A.probeY = L.y + (PHONE ? 40 : 84);
    return A;
  }
  const APG = { bath: apGeo('bath'), direct: apGeo('direct'), pot: apGeo('pot') };

  /* =========================================================
     입자 상자 (PBox): 고체 · 액체 · 기체 입자가 상태에 따라 움직여요
       상태 0 고체: 격자 자리에서 진동 · 1 액체: 붙어서 미끄러지며 이동 · 2 기체: 멀리 떨어져 빠르게 이동
     setWant(고체 수, 액체 수, 기체 수)로 목표를 주면 입자가 하나씩 차례로 상태를 바꿔요 (m1-state-change-heat 와 같은 모형)
     ========================================================= */
  class PBox {
    /* o: {N, R, color, box:{x0,y0,x1,y1}, lattice:'hex'|'honey', cols, state, therm, g, kc, vl, vg, gap, liqSp, flashUp, flashDown} */
    constructor(o) {
      this.o = o;
      this.R = o.R || 7;
      this.color = o.color || '#5fa8f5';
      this.box = o.box;
      this.therm = o.therm != null ? o.therm : 0.4;
      this.g = o.g != null ? o.g : 1000;
      this.kc = o.kc != null ? o.kc : 800;
      this.vl = o.vl || 40; this.vg = o.vg || 120;
      this.gap = o.gap || 0.07;
      this.liqSp = o.liqSp || 1;
      this.flashUp = o.flashUp || '#8b5cf6'; this.flashDown = o.flashDown || '#8b5cf6';
      this.t = 0; this.convT = 0; this.want = null;
      this.p = [];
      this.makeSites(o.N);
      for (let i = 0; i < o.N; i++) {
        this.p.push({ x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, st: 0, site: -1, f: 0.8 + Math.random() * 0.4, rr: 0.96 + Math.random() * 0.1,
          ph1: Math.random() * TAU, ph2: Math.random() * TAU, w1: 17 + Math.random() * 9, w2: 17 + Math.random() * 9, flash: 0, fc: '#fff', a: 1 });
      }
      this.reset(o.state || 0);
    }
    makeSites(N) {
      const B = this.box, R = this.R;
      const cx = (B.x0 + B.x1) / 2, floor = B.y1;
      const inside = (x, y) => x >= B.x0 + R - 0.1 && x <= B.x1 - R + 0.1 && y <= B.y1 - R + 0.1 && y >= B.y0 + R - 0.1;
      const sites = [];
      let nd;
      if (this.o.lattice === 'honey') {                  // 육각 고리 격자 (얼음처럼 성긴 배열)
        const a = R * 2, w = a * Math.sqrt(3);
        nd = a * 1.2;
        const cols = this.o.cols || 3;
        const seen = new Set();
        outer:
        for (let j = 0; j < 20; j++) {
          const odd = j % 2 === 1;
          const n = odd ? cols - 1 : cols;
          const order = [];
          for (let i = 0; i < n; i++) order.push(i);
          order.sort((p, q) => Math.abs(p - (n - 1) / 2) - Math.abs(q - (n - 1) / 2));
          for (const i of order) {
            const hx = cx + (i - (n - 1) / 2) * w, hy = floor - R - a - j * 1.5 * a;
            const vs = [];
            for (let k = 0; k < 6; k++) {
              const ang = Math.PI / 2 + k * Math.PI / 3;
              vs.push({ x: hx + Math.cos(ang) * a, y: hy + Math.sin(ang) * a });
            }
            vs.sort((p, q) => q.y - p.y);
            for (const v of vs) {
              const key = Math.round(v.x * 4) + ',' + Math.round(v.y * 4);
              if (seen.has(key) || !inside(v.x, v.y)) continue;
              seen.add(key); sites.push(v);
              if (sites.length >= N) break outer;
            }
          }
        }
      } else {                                           // 촘촘한 육각 배열
        const d = R * 2 * (this.o.spacing || 1.02), rh = d * Math.sqrt(3) / 2;
        nd = d * 1.2;
        const cols = this.o.cols || Math.max(2, Math.round(Math.sqrt(N * 1.2)));
        for (let r = 0; sites.length < N && r < 40; r++) {
          const y = floor - R - r * rh;
          const cnt = r % 2 ? cols - 1 : cols;
          for (let c = 0; c < cnt && sites.length < N; c++) {
            const x = cx + (c - (cnt - 1) / 2) * d;
            if (inside(x, y)) sites.push({ x, y });
          }
        }
      }
      sites.forEach((s, i) => { s.nb = []; s.occ = -1; sites.forEach((q, j) => { if (i !== j && Math.hypot(s.x - q.x, s.y - q.y) < nd) s.nb.push(j); }); });
      this.sites = sites;
    }
    count(st) { let n = 0; for (const q of this.p) if (q.st === st) n++; return n; }
    counts() { return [this.count(0), this.count(1), this.count(2)]; }
    tOf(st) { const v = st === 0 ? this.thermS : st === 1 ? this.thermL : this.thermG; return v != null ? v : this.therm; }
    speed(st) { const T = this.tOf(st); return st === 1 ? this.vl * (1 + 1.6 * T) : st >= 2 ? this.vg * (1 + T) : 0; }
    amp() { return 0.6 + 2.4 * this.tOf(0); }
    /* 모든 입자를 st 상태로 즉시 놓기 */
    reset(st) {
      const B = this.box, R = this.R;
      this.sites.forEach((s) => (s.occ = -1));
      this.want = null;
      this.p.forEach((q, i) => {
        q.st = st; q.site = -1; q.a = 1; q.flash = 0;
        const s = this.sites[i % this.sites.length];
        if (st === 0 && i < this.sites.length) { q.site = i; s.occ = i; q.x = s.x; q.y = s.y; q.vx = q.vy = 0; return; }
        if (st === 2) {
          q.x = B.x0 + R + Math.random() * (B.x1 - B.x0 - 2 * R); q.y = B.y0 + R + Math.random() * (B.y1 - B.y0 - 2 * R);
        } else { q.x = s.x + (Math.random() - 0.5) * 3; q.y = s.y - 3; q.st = 1; }
        const a = Math.random() * TAU, v = this.speed(q.st) * q.f;
        q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v;
      });
      if (st === 1) for (let i = 0; i < 140; i++) this.step(1 / 60, true);
    }
    /* 목표 개수(고체, 액체, 기체)에 맞춰 한 입자씩 상태를 바꿈 */
    setWant(s, l, g) { this.want = { s, l, g }; }
    done() {
      const W = this.want; if (!W) return true;
      const c = this.counts(), ng = c[2] + this.count(3);
      return c[0] === W.s && c[1] === W.l && ng === W.g;
    }
    convertOne() {
      const W = this.want; if (!W) return false;
      const ns = this.count(0), nl = this.count(1), ng = this.count(2) + this.count(3);
      if (ns > W.s && nl < W.l) return this.melt();
      if (nl > W.l && ns < W.s) return this.capture(1);
      if (nl > W.l && ng < W.g) return this.vaporize();
      if (ng > W.g && nl < W.l) return this.condense();
      if (ns > W.s && ng < W.g) return this.sublime();
      if (ng > W.g && ns < W.s) return this.capture(2);
      return false;
    }
    occN(si) { let n = 0; for (const j of this.sites[si].nb) if (this.sites[j].occ >= 0) n++; return n; }
    exposedSolid() {
      let best = -1, bs = 1e9;
      this.p.forEach((q, i) => {
        if (q.st !== 0) return;
        const sc = this.occN(q.site) * 100 + this.sites[q.site].y * 0.6 + Math.random() * 30;
        if (sc < bs) { bs = sc; best = i; }
      });
      return best;
    }
    freeSite() {
      let best = -1, bs = -1e9;
      const fl = this.box.y1;
      this.sites.forEach((s, i) => {
        if (s.occ >= 0) return;
        const sc = (this.occN(i) + (s.y > fl - this.R * 2.4 ? 2 : 0)) * 100 + s.y * 0.6;
        if (sc > bs) { bs = sc; best = i; }
      });
      return best;
    }
    release(i, st, up) {
      const q = this.p[i];
      if (q.site >= 0) { this.sites[q.site].occ = -1; q.site = -1; }
      q.st = st;
      const v = this.speed(st) * q.f * 0.55, a = up ? -Math.PI / 2 + (Math.random() - 0.5) * 1.4 : Math.random() * TAU;
      q.vx = q.vx * 0.5 + Math.cos(a) * v; q.vy = q.vy * 0.5 + Math.sin(a) * v;     // 이전 움직임을 이어받아 점점 빨라짐
      q.flash = 1; q.fc = this.flashUp;
      if (this.onConvert) this.onConvert(q, true);
      return true;
    }
    capture(from) {
      const si = this.freeSite(); if (si < 0) return false;
      const s = this.sites[si];
      let best = -1, bd = 1e18;
      this.p.forEach((q, i) => { if (q.st !== from) return; const d = (q.x - s.x) ** 2 + (q.y - s.y) ** 2; if (d < bd) { bd = d; best = i; } });
      if (best < 0) return false;
      const q = this.p[best];
      q.st = 0; q.site = si; s.occ = best; q.flash = 1; q.fc = this.flashDown;
      if (this.onConvert) this.onConvert(q, false);
      return true;
    }
    melt() { const i = this.exposedSolid(); return i >= 0 && this.release(i, 1, false); }
    sublime() { const i = this.exposedSolid(); return i >= 0 && this.release(i, 2, true); }
    vaporize() {
      let best = -1, by = 1e9;
      this.p.forEach((q, i) => { if (q.st === 1 && q.y < by) { by = q.y; best = i; } });
      return best >= 0 && this.release(best, 2, true);
    }
    condense() {
      let best = -1, by = -1e9;
      this.p.forEach((q, i) => { if (q.st === 2 && q.y > by) { by = q.y; best = i; } });
      if (best < 0) return false;
      const q = this.p[best]; q.st = 1; q.vx *= 0.4; q.vy *= 0.4; q.flash = 1; q.fc = this.flashDown;
      if (this.onConvert) this.onConvert(q, false);
      return true;
    }
    step(dt, quiet) {
      if (!(dt > 0)) return;
      this.t += dt;
      if (!quiet && this.want) {
        this.convT -= dt;
        if (this.convT <= 0 && this.convertOne()) this.convT = this.gap;
      }
      const P = this.p, n = P.length, R = this.R, B = this.box;
      const sub = Math.max(1, Math.ceil(dt / 0.006)), h = dt / sub;
      const kRep = 7000, g = this.g, kc = this.kc, lsp = this.liqSp;
      const vL = this.speed(1), vG = this.speed(2), A = this.amp();
      const ks = 1 - Math.exp(-10 * h);
      for (let s = 0; s < sub; s++) {
        for (let i = 0; i < n; i++) { const q = P[i]; q.ax = 0; q.ay = q.st === 1 ? g : 0; }
        for (let i = 0; i < n; i++) {
          const a = P[i];
          for (let j = i + 1; j < n; j++) {
            const b = P[j]; if (a.st === 0 && b.st === 0) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const Dm = R * (a.rr + b.rr) * (a.st === 1 && b.st === 1 ? lsp : 1), RC = Dm * 1.6;
            const d2 = dx * dx + dy * dy;
            if (d2 >= RC * RC || d2 < 1e-6) continue;
            const d = Math.sqrt(d2);
            let f;
            if (d < Dm) f = kRep * (Dm - d) / d;
            else if (a.st <= 1 && b.st <= 1) f = -kc * Math.sin(Math.PI * (d - Dm) / (RC - Dm)) / d;
            else continue;
            const fx = dx * f, fy = dy * f;
            if (a.st !== 0) { a.ax -= fx; a.ay -= fy; }
            if (b.st !== 0) { b.ax += fx; b.ay += fy; }
          }
        }
        for (let i = 0; i < n; i++) {
          const q = P[i];
          if (q.st === 0) {
            const S = this.sites[q.site];
            const tx = S.x + A * Math.sin(this.t * q.w1 + q.ph1), ty = S.y + A * Math.sin(this.t * q.w2 + q.ph2);
            const nx = q.x + (tx - q.x) * ks, ny = q.y + (ty - q.y) * ks;
            q.vx = (nx - q.x) / h; q.vy = (ny - q.y) / h; q.x = nx; q.y = ny;
            continue;
          }
          const sp = Math.hypot(q.vx, q.vy) || 1e-3;
          const tgt = (q.st === 1 ? vL : vG) * q.f;
          const k = 1 + (tgt / sp - 1) * Math.min(1, h * (q.st === 1 ? 4 : 2.5));
          q.vx *= k; q.vy *= k;
          if (q.st === 1) {
            const ang = (Math.random() - 0.5) * 7 * Math.sqrt(h), c = Math.cos(ang), sn = Math.sin(ang);
            const vx = q.vx * c - q.vy * sn; q.vy = q.vx * sn + q.vy * c; q.vx = vx;
          }
          q.vx += q.ax * h; q.vy += q.ay * h;
          q.x += q.vx * h; q.y += q.vy * h;
          const r = R * q.rr;
          if (q.x < B.x0 + r) { q.x = B.x0 + r; q.vx = Math.abs(q.vx); }
          if (q.x > B.x1 - r) { q.x = B.x1 - r; q.vx = -Math.abs(q.vx); }
          if (q.y > B.y1 - r) { q.y = B.y1 - r; q.vy = -Math.abs(q.vy); }
          if (q.y < B.y0 + r) { q.y = B.y0 + r; q.vy = Math.abs(q.vy); }
        }
      }
      for (const q of P) if (q.flash > 0) q.flash = Math.max(0, q.flash - dt * 1.4);
    }
    /* 빠른 입자에는 꼬리(속도 표시)를 그려 줌 */
    draw(c, alpha) {
      const R = this.R, sp = sprite(this.color, R), al = alpha == null ? 1 : alpha;
      c.lineCap = 'round';
      for (const q of this.p) {
        if (q.st >= 2) {
          c.strokeStyle = rgba(this.color, 0.2 * al); c.lineWidth = R * 0.9;
          c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - q.vx * 0.06, q.y - q.vy * 0.06); c.stroke();
        }
      }
      for (const q of this.p) {
        if (q.flash > 0) {
          c.globalAlpha = q.flash * 0.85 * al;
          c.strokeStyle = q.fc; c.lineWidth = 2.5;
          c.beginPath(); c.arc(q.x, q.y, R + 2 + (1 - q.flash) * 9, 0, TAU); c.stroke();
        }
        c.globalAlpha = al;
        c.drawImage(sp.c, q.x - sp.half, q.y - sp.half, sp.half * 2, sp.half * 2);
      }
      c.globalAlpha = 1;
    }
  }

  /* =========================================================
     가열 실험 상태: 시료 두 개를 함께 가열해요 (시간 t[분], 시료마다 가열 곡선)
     ========================================================= */
  const RUN = {
    kind: 'melt', t: 0, on: false, done: false, end: 1, speed: 1.7, P: 1.0, samples: [], bathT: 25, flame: 0,
    rec: { melt: false, water: false, eth: false, unk: false }, press: [], pointer: 0, boilK: 0, steamAcc: 0, doneFlash: 0,
  };
  const smp = (i) => RUN.samples[i];
  function lensBoxOf(i, n) {
    const r = LAY.bot, pad = 10, mid = r.x + r.w / 2;
    const x0 = n === 1 ? r.x + pad : i === 0 ? r.x + pad : mid + 4, x1 = n === 1 ? r.x + r.w - pad : i === 0 ? mid - 4 : r.x + r.w - pad;
    return { x0, y0: r.y + 44, x1, y1: r.y + r.h - (PHONE ? 10 : 14) };
  }
  function setupRun(kind, opts) {
    opts = opts || {};
    const K = KIND[kind];
    RUN.kind = kind; RUN.t = 0; RUN.on = false; RUN.done = false; RUN.speed = K.speed; RUN.bathT = 25; RUN.flame = 0; RUN.boilK = 0; RUN.doneFlash = 0;
    if (opts.P != null) RUN.P = opts.P;
    RUN.samples = K.samples.map((q, i) => {
      const cv = curveFor(kind, q, RUN.P), S = SUBS[q.sub];
      const N = PHONE ? (q.amt <= 5 || q.amt === 50 ? 10 : 20) : (q.amt <= 5 || q.amt === 50 ? 12 : 24);
      const useLens = kind === 'melt' || kind === 'water' || kind === 'eth';
      const box = useLens ? new PBox({ N, R: PHONE ? 5.4 : 7.2, color: S.pcol, box: lensBoxOf(i, K.samples.length), lattice: 'hex', cols: PHONE ? 5 : 5, state: 0, therm: 0.3, vl: 40, vg: 120, gap: 0.05, flashUp: '#ff8a3d', flashDown: '#4a90ff' }) : null;
      const first = cv.segs[0];
      const o = new Odo(0); o.jump(first.T0);
      const s = { i, q, sub: q.sub, S, cv, st: curveAt(cv, 0), box, N, odo: o, bub: [], bacc: 0, solid: q.sub === 'palm' || q.sub === 'naph', label: q.unk ? q.unk : q.amt + ' ' + q.unit, col: i ? '#e2464b' : '#2f7de1' };
      if (box) { if (s.solid) box.reset(0); else box.reset(1); }
      return s;
    });
    RUN.end = Math.max.apply(null, RUN.samples.map((s) => endOf(s.cv)));
    RUN.samples.forEach((s) => syncBox(s, 0));
    refreshReadouts && refreshReadouts();
  }
  function syncBox(s) {
    const b = s.box; if (!b) return;
    const st = s.st, id = st.id, f = st.f, T = st.T, N = s.N;
    if (s.solid) {
      const mp = s.cv.segs[0].T1, T0 = s.cv.segs[0].T0;
      if (id === 'sol') { b.setWant(N, 0, 0); b.thermS = clamp((T - T0) / (mp - T0), 0.05, 1); }
      else if (id === 'melt') { const nL = Math.round(N * smooth(f)); b.setWant(N - nL, nL, 0); b.thermS = 1; b.thermL = 0; }
      else { b.setWant(0, N, 0); b.thermL = clamp((T - mp) / 22, 0.05, 1); }
    } else {
      const T0 = s.cv.segs[0].T0, bp = s.cv.segs[0].T1;
      if (id === 'liq') { b.setWant(0, N, 0); b.thermL = clamp((T - T0) / (bp - T0), 0.05, 1); }
      else { const nG = Math.round(N * smooth(f) * 0.8); b.setWant(0, N - nG, nG); b.thermL = 1; b.thermG = 0; }
    }
  }
  const passed = (s, id) => { const q = s.cv.segs.find((x) => x.id === id); return !!q && RUN.t >= q.t1 - 1e-6; };
  const sampleDone = (s) => RUN.t >= endOf(s.cv) - 1e-6;

  function startRun() {
    if (RUN.done) { setupRun(RUN.kind); }
    RUN.on = !RUN.on; Sound.click();
    if (RUN.on) hideHint();
    refreshUI();
  }
  function finishRunNow() {                                   // 퀴즈를 위해 곧바로 끝까지 진행한 상태로
    RUN.t = RUN.end; RUN.on = false; RUN.done = true; RUN.flame = 0;
    for (let i = 0; i < 90; i++) updateRun(1 / 30, true);
    onRunDone(true);
  }
  function onRunDone(quiet) {
    const k = RUN.kind;
    if (k === 'press') {
      const bp = SUBS.water.bp != null ? bpWater(RUN.P) : 100;
      const old = RUN.press.findIndex((q) => Math.abs(q.P - RUN.P) < 0.02);
      const pt = { P: Math.round(RUN.P * 100) / 100, bp, pop: quiet ? 0 : 1 };
      if (old >= 0) RUN.press[old] = pt; else RUN.press.push(pt);
    }
    RUN.rec[k] = true;
    if (!quiet) { Sound.success(); RUN.doneFlash = 1; }
    refreshUI(); refreshReadouts();
  }

  function updateRun(dt, quiet) {
    const R = RUN, K = KIND[R.kind];
    if (R.on) {
      R.t = Math.min(R.end, R.t + dt * R.speed);
      if (R.t >= R.end - 1e-6) { R.on = false; R.done = true; onRunDone(false); }
    }
    R.flame = SciSim.approach(R.flame, R.on ? 1 : 0, dt, 5);
    R.doneFlash = Math.max(0, R.doneFlash - dt * 0.8);
    R.bathT = SciSim.approach(R.bathT, R.on ? (K.bath || 100) : (R.done ? 60 : R.bathT), dt, R.on ? 0.5 : 0.15);
    let boilK = 0;
    R.samples.forEach((s) => {
      s.st = curveAt(s.cv, Math.min(R.t, endOf(s.cv)));
      s.odo.set(s.st.T); s.odo.update(dt);
      syncBox(s);
      if (s.box) s.box.step(dt);
      // 끓는 정도 (0~1): 끓는 구간에서 1
      const id = s.st.id, sdone = sampleDone(s);
      const k = id === 'boil' ? (R.t >= endOf(s.cv) - 1e-6 ? 0.55 : 1) : id === 'liq' && !s.solid ? clamp((s.st.T - 60) / 80, 0, 0.35) : 0;
      s.boilK = SciSim.approach(s.boilK || 0, R.on || id === 'boil' ? k : 0, dt, 4);
      boilK = Math.max(boilK, s.boilK);
      updateBubbles(s, dt);
    });
    R.boilK = boilK;
  }
  /* 시료(시험관 · 비커) 모양과 높이 */
  function sampleGeom(s) {
    const layout = KIND[RUN.kind].layout, U = APG[layout].units[s.i];
    let H0;
    if (layout === 'bath') H0 = Math.min(U.h * 0.55, PHONE ? 16 + 4.6 * s.q.amt : 22 + 7.2 * s.q.amt);
    else H0 = U.h * U.water;
    return { U, layout, H0, ib: U.bot - (layout === 'bath' ? 5 : 4) };
  }
  function updateBubbles(s, dt) {
    const g = sampleGeom(s);
    for (let i = s.bub.length - 1; i >= 0; i--) { const b = s.bub[i]; b.h += b.vy * dt; b.x += Math.sin(CLK.t * 5 + b.ph) * 7 * dt; b.r += dt * 1.1; if (b.h > g.H0 - 3) s.bub.splice(i, 1); }
    const k = s.boilK || 0;
    if (k > 0.05) {
      s.bacc += dt * k * (RUN.kind === 'press' ? 30 : g.layout === 'bath' ? 18 : 26);
      while (s.bacc >= 1) { s.bacc -= 1; if (s.bub.length < 46) s.bub.push({ x: (Math.random() - 0.5) * (g.U.w - 24), h: 2, vy: rand(34, 90), r: rand(1.6, 3.6), ph: Math.random() * 6 }); }
    }
    // 김
    if (!RM && k > 0.3 && Math.random() < dt * 10 * k) {
      const top = g.U.top;
      FX.emit({ x: g.U.cx + rand(-g.U.w * 0.2, g.U.w * 0.2), y: top - 4, vx: rand(-8, 8), vy: -rand(18, 38), life: rand(1.0, 1.7), size: rand(5, 10), color: 'rgba(255,255,255,.6)', shape: 'smoke', grow: 9, fade: true });
    }
  }

  /* =========================================================
     실험대 그리기: 가열판 · 중탕 비커 · 시험관(시료) · 비커 · 압력 용기 · 온도 표시기
     ========================================================= */
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const curA = () => APG[KIND[RUN.kind].layout];

  function drawLabBg() {
    const R = LAY.lab, A = APG.bath;
    panel(R.x, R.y, R.w, R.h, 18, '#fff', 14, 4, 'rgba(30,50,100,.16)');
    ctx.save(); ctx.beginPath(); D.roundRect(R.x, R.y, R.w, R.h, 18); ctx.clip();
    vgrad(ctx, R.x, R.y, R.w, A.table - R.y, '#fbfdff', '#e9f0fa');
    const lg = ctx.createLinearGradient(R.x, R.y, R.x + R.w * 0.7, R.y + R.h * 0.8);
    lg.addColorStop(0, 'rgba(255,255,255,.6)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(R.x, R.y); ctx.lineTo(R.x + R.w * 0.6, R.y); ctx.lineTo(R.x + R.w * 0.2, A.table); ctx.lineTo(R.x, A.table); ctx.closePath(); ctx.fill();
    vgrad(ctx, R.x, A.table, R.w, R.y + R.h - A.table, '#e3e9f3', '#c5d0e2');
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(R.x, A.table, R.w, 2);
    ctx.fillStyle = 'rgba(40,60,100,.1)'; ctx.fillRect(R.x, A.table + 2, R.w, 5);
    ctx.restore();
  }

  function drawPlate(A, t) {
    const P = A.plate, x = P.cx - P.w / 2, heat = RUN.flame;
    contactShadow(P.cx, P.y + P.h + 1, P.w / 2 + 10, 6, 0.8);
    softShadow(x, P.y, P.w, P.h, 8, 8, 3, 'rgba(30,50,100,.25)');
    const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); g.addColorStop(0, '#6b7690'); g.addColorStop(0.2, '#4a566e'); g.addColorStop(1, '#2d3548');
    ctx.fillStyle = g; D.roundRect(x, P.y, P.w, P.h, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; D.roundRect(x + 6, P.y + 2, P.w - 12, 3, 2); ctx.fill();
    if (heat > 0.02) {
      ctx.save(); ctx.globalAlpha = heat; D.glow(P.cx, P.y + 3, P.w * 0.46, '#ff7a3d', 0.7); ctx.restore();
      const cg = ctx.createLinearGradient(x, 0, x + P.w, 0); cg.addColorStop(0, 'rgba(255,120,50,0)'); cg.addColorStop(0.5, 'rgba(255,150,70,' + (0.7 + 0.25 * Math.sin(t * 6)) * heat + ')'); cg.addColorStop(1, 'rgba(255,120,50,0)');
      ctx.fillStyle = cg; D.roundRect(x + 10, P.y - 1.5, P.w - 20, 4.5, 2); ctx.fill();
    }
    D.sphere(x + 18, P.y + P.h / 2 + 1, PHONE ? 4.4 : 5.4, heat > 0.2 ? '#ff8a3d' : '#94a3b8', { gloss: true });
    // 손잡이(눈금판)
    D.sphere(x + P.w - 22, P.y + P.h / 2 + 1, PHONE ? 5.6 : 7, '#cbd5e1', { gloss: true });
    text(P.cx, P.y + P.h + (PHONE ? 15 : 19), '가열판', { size: 13, weight: 800, color: COL.muted });
  }

  /* 중탕 비커 (뜨거운 물) */
  function drawBathBeaker(A, t) {
    const B = A.bath, waterTop = B.top + B.h * (1 - B.water), heat = clamp((RUN.bathT - 25) / 70, 0, 1);
    const wc = mixHex('#8fd0fa', '#ffd7b0', heat * 0.2);
    vessel({
      x0: B.x0 + 3, x1: B.x1 - 3, yTop: B.top, yBot: B.bot - 3, t, amp: (RM ? 0 : 0.5) + heat * 1.4, iamp: 0, men: 3.2,
      path: (c) => tubeClosed(c, B.x0 + 3, B.top, B.w - 6, B.h - 3, 14),
      outline: (c) => tubeOpen(c, B.x0, B.top, B.w, B.h, 14, 9),
      layers: [{ y: waterTop, color: wc, alpha: 0.66 }],
      inside: (c) => {
        if (heat > 0.5 && !RM) {                              // 바닥에서 올라오는 작은 기포
          c.beginPath();
          for (let i = 0; i < 14; i++) { const k = (t * (0.5 + 0.2 * hash(i)) + hash(i + 9)) % 1, x = B.x0 + 14 + hash(i + 3) * (B.w - 28), y = B.bot - 8 - k * (B.bot - waterTop - 12), r = 1.4 + hash(i + 5) * 2; c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); }
          c.strokeStyle = 'rgba(255,255,255,' + 0.7 * (heat - 0.4) + ')'; c.lineWidth = 1.2; c.stroke();
        }
      },
    });
    // 눈금
    ctx.save(); ctx.strokeStyle = 'rgba(70,90,125,.6)'; ctx.lineWidth = 1.2;
    for (let i = 1; i <= 4; i++) { const y = B.bot - 8 - (B.h - 14) * i / 5; ctx.beginPath(); ctx.moveTo(B.x0 + 4, y); ctx.lineTo(B.x0 + (i % 2 ? 14 : 24), y); ctx.stroke(); }
    ctx.restore();
    pill(B.cx, B.top - 12, '뜨거운 물 (중탕)', { bg: 'rgba(100,116,139,.88)', size: PHONE ? 12 : 13, pad: 9 });
    ctx.save();                                              // 시험관의 물에 잠긴 부분을 살짝 덮어요
    ctx.beginPath(); ctx.rect(B.x0 + 4, waterTop, B.w - 8, B.bot - waterTop - 3); ctx.clip();
    ctx.fillStyle = tint(wc, 0, 0.16); ctx.fillRect(B.x0, waterTop, B.w, B.h); ctx.restore();
  }

  /* 고체 덩어리 (왁스 · 결정) */
  function drawSolidBlock(cx, y, w, h, col, t) {
    ctx.save();
    const g = ctx.createLinearGradient(cx - w / 2, y, cx + w / 2, y + h);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, col); g.addColorStop(1, shade(col, -0.18));
    ctx.fillStyle = g; D.roundRect(cx - w / 2, y, w, h, Math.min(8, h / 2.2, w / 2.4)); ctx.fill();
    ctx.strokeStyle = 'rgba(140,125,95,.65)'; ctx.lineWidth = 1.3; D.roundRect(cx - w / 2, y, w, h, Math.min(8, h / 2.2, w / 2.4)); ctx.stroke();
    ctx.strokeStyle = 'rgba(160,140,100,.35)'; ctx.lineWidth = 1;
    const n = Math.max(0, Math.floor(h / 11));
    for (let i = 1; i <= n; i++) { ctx.beginPath(); ctx.moveTo(cx - w / 2 + 4, y + i * h / (n + 1)); ctx.lineTo(cx + w / 2 - 4 - hash(i) * 8, y + i * h / (n + 1) + (hash(i + 4) - 0.5) * 3); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.7)'; D.roundRect(cx - w / 2 + 4, y + 3, 4, Math.max(5, h - 8), 2); ctx.fill();
    ctx.restore();
  }

  /* 시험관 시료 (중탕) */
  function drawTubeSample(s, t) {
    const g = sampleGeom(s), U = g.U, S = s.S, st = s.st, x0 = U.cx - U.w / 2;
    const f = s.solid ? (st.id === 'sol' ? 0 : st.id === 'melt' ? st.f : 1) : 1;
    const drop = st.id === 'boil' ? 1 - 0.1 * st.f : 1;
    const Hliq = s.solid ? g.H0 * 0.92 * f : g.H0 * drop, Hs = s.solid ? g.H0 * (1 - f) : 0;
    const surf = g.ib - Hliq;
    vessel({
      x0: x0 + 2, x1: x0 + U.w - 2, yTop: U.top, yBot: U.bot, t, amp: (RM ? 0 : 0.35) + 2.2 * s.boilK, iamp: 0, men: 2.4,
      path: (c) => tubeClosed(c, x0 + 2, U.top, U.w - 4, U.bot - U.top, (U.w - 4) / 2),
      outline: (c) => tubeOpen(c, x0, U.top, U.w, U.bot - U.top, U.w / 2, 4),
      layers: Hliq > 0.6 ? [{ y: surf, color: S.liquid, alpha: s.sub === 'eth' ? 0.55 : s.solid ? 0.78 : 0.7 }] : [],
      inside: (c) => {
        if (Hs > 0.8) { const ws = (U.w - 10) * (1 - 0.32 * f); drawSolidBlock(U.cx + Math.sin(t * 1.6 + s.i) * 0.8 * f, surf - Hs + (f > 0 ? 3 : 0), ws, Hs, S.solid, t); }
        drawBubbleBatch(s, U.cx, g.ib, 1);
      },
    });
  }
  function drawBubbleBatch(s, cx, ib, k) {
    if (!s.bub.length) return;
    ctx.beginPath();
    s.bub.forEach((b) => { const y = ib - b.h; ctx.moveTo(cx + b.x + b.r, y); ctx.arc(cx + b.x, y, b.r, 0, TAU); });
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1; ctx.stroke();
  }

  /* 직접 가열하는 비커 (물) */
  function drawDirectBeaker(s, t) {
    const g = sampleGeom(s), U = g.U, S = s.S, st = s.st, x0 = U.cx - U.w / 2;
    const drop = st.id === 'boil' ? 1 - 0.1 * st.f : 1;
    const surf = g.ib - g.H0 * drop;
    const warm = clamp((st.T - 25) / 75, 0, 1);
    contactShadow(U.cx, U.bot + 2, U.w / 2 + 8, 4, 0.7);
    vessel({
      x0: x0 + 3, x1: x0 + U.w - 3, yTop: U.top, yBot: U.bot, t, amp: (RM ? 0 : 0.5) + 2.8 * s.boilK, iamp: 0, men: 3,
      path: (c) => tubeClosed(c, x0 + 3, U.top, U.w - 6, U.bot - U.top, 12),
      outline: (c) => tubeOpen(c, x0, U.top, U.w, U.bot - U.top, 12, 8),
      layers: [{ y: surf, color: mixHex(S.liquid, '#ffe0c0', warm * 0.12), alpha: 0.68 }],
      inside: () => { drawBubbleBatch(s, U.cx, g.ib, 1); },
    });
    ctx.save(); ctx.strokeStyle = 'rgba(70,90,125,.6)'; ctx.lineWidth = 1.2;
    for (let i = 1; i <= 3; i++) { const y = U.bot - 8 - (U.h - 14) * i / 4; ctx.beginPath(); ctx.moveTo(x0 + 4, y); ctx.lineTo(x0 + (i % 2 ? 12 : 20), y); ctx.stroke(); }
    ctx.restore();
  }

  /* 온도 표시기 + 탐침 (시료 위에 매달아요) */
  function drawProbe(s, t) {
    const g = sampleGeom(s), U = g.U, A = curA(), y = A.probeY, w = PHONE ? 90 : 104, h = PHONE ? 46 : 54, x = U.cx - w / 2;
    // 탐침 선 (시료 속으로)
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(U.cx, y + h); ctx.lineTo(U.cx, g.ib - 10); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(U.cx - 0.8, y + h); ctx.lineTo(U.cx - 0.8, g.ib - 10); ctx.stroke();
    D.sphere(U.cx, g.ib - 9, 4.6, '#ef4444', { gloss: true });
    ctx.restore();
    panel(x, y, w, h, 12, '#fff', 8, 3, 'rgba(30,50,100,.2)');
    ctx.fillStyle = s.col; D.roundRect(x, y, w, 6, 3); ctx.fill();
    const lab = s.q.unk ? '시료 ' + s.q.unk : s.label;
    text(U.cx, y + 21, lab, { size: PHONE ? 12.5 : 14, weight: 800, color: COL.ink });
    drawLCD(x + 8, y + h - (PHONE ? 22 : 26), w - 16, PHONE ? 17 : 20, s.odo, { digits: 3, unit: '°C', unitW: 20 });
  }

  /* 압력 용기 (물을 담은 비커 + 마개 + 압력계) */
  const PD = { v: new SciSim.Spring(1, { stiffness: 80, damping: 12 }) };
  function drawPot(t) {
    const A = APG.pot, U = A.units[0], s = smp(0), st = s.st, g = sampleGeom(s), x0 = U.cx - U.w / 2;
    const drop = st.id === 'boil' ? 1 - 0.08 * st.f : 1, surf = g.ib - g.H0 * drop, warm = clamp((st.T - 25) / 100, 0, 1);
    contactShadow(U.cx, U.bot + 2, U.w / 2 + 8, 5, 0.8);
    vessel({
      x0: x0 + 3, x1: x0 + U.w - 3, yTop: U.top, yBot: U.bot, t, amp: (RM ? 0 : 0.5) + 2.6 * s.boilK, iamp: 0, men: 3,
      path: (c) => tubeClosed(c, x0 + 3, U.top, U.w - 6, U.bot - U.top, 14),
      outline: (c) => tubeOpen(c, x0, U.top, U.w, U.bot - U.top, 14, 0),
      layers: [{ y: surf, color: mixHex('#8fd0fa', '#ffe0c0', warm * 0.12), alpha: 0.68 }],
      inside: () => { drawBubbleBatch(s, U.cx, g.ib, 1); },
    });
    // 마개 + 호스 + 추
    const lid = { x: x0 - 6, y: U.top - 16, w: U.w + 12, h: 18 };
    const lg = ctx.createLinearGradient(0, lid.y, 0, lid.y + lid.h); lg.addColorStop(0, '#9aa7bb'); lg.addColorStop(1, '#5f6c82');
    ctx.fillStyle = lg; D.roundRect(lid.x, lid.y, lid.w, lid.h, 7); ctx.fill(); ctx.strokeStyle = '#47536a'; ctx.lineWidth = 1.5; D.roundRect(lid.x, lid.y, lid.w, lid.h, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; D.roundRect(lid.x + 6, lid.y + 3, lid.w - 12, 3, 2); ctx.fill();
    if (RUN.P > 1.4) { ctx.fillStyle = '#334155'; D.roundRect(U.cx - 9, lid.y - 12, 18, 14, 4); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(U.cx - 6, lid.y - 10, 4, 8); }
    // 호스 → 압력계
    const dl = dialPos();
    ctx.save(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lid.x + lid.w - 8, lid.y + 8); ctx.bezierCurveTo(lid.x + lid.w + 40, lid.y - 24, dl.x - 30, dl.y + dl.r + 30, dl.x, dl.y + dl.r + 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
  }
  function dialPos() { const L = LAY.lab; return PHONE ? { x: L.x + 340, y: L.y + 100, r: 52 } : { x: L.x + 292, y: L.y + 130, r: 54 }; }
  function drawPressureDial(t) {
    const d = dialPos(), P = PD.v.value;
    D.dial(d.x, d.y, d.r, clamp(P, 0, 2.5), 0, 2.5, { ticks: 5, color: '#e2464b' });
    text(d.x, d.y + d.r + (PHONE ? 62 : 70), '압력계', { size: PHONE ? 13 : 14.5, weight: 800, color: COL.ink });
    pill(d.x, d.y + d.r + (PHONE ? 84 : 94), (Math.round(RUN.P * 10) / 10).toFixed(1) + ' 기압', { bg: RUN.P < 0.9 ? '#2563eb' : RUN.P > 1.2 ? '#b91c1c' : '#64748b', size: PHONE ? 13 : 14.5, pad: 10 });
  }
  const PRESETS = [{ p: 0.7, ic: '⛰️', nm: '높은 산' }, { p: 1.0, ic: '🏠', nm: '평지' }, { p: 2.0, ic: '🍲', nm: '압력솥' }];
  const presetNow = () => PRESETS.find((q) => Math.abs(q.p - RUN.P) < 0.06) || null;

  /* ---------- 실험대 전체 ---------- */
  function drawLabM(t) {
    const K = KIND[RUN.kind], layout = K.layout, A = APG[layout], R = LAY.lab;
    drawLabBg();
    if (layout === 'pot') {
      PD.v.target = RUN.P;
      drawPlate(A, t);
      drawPot(t);
      drawProbe(smp(0), t);
      drawPressureDial(t);
      const pr = presetNow();
      pill(R.x + 14, R.y + 26, pr ? pr.ic + ' ' + pr.nm : '🧭 압력 조절 중', { bg: pr ? (pr.p < 1 ? '#2563eb' : pr.p > 1 ? '#b91c1c' : '#64748b') : '#64748b', size: PHONE ? 13 : 14, align: 'left', pad: 9 });
      return;
    }
    drawPlate(A, t);
    if (layout === 'bath') {
      drawBathBeaker(A, t);
      RUN.samples.forEach((s) => drawTubeSample(s, t));
    } else RUN.samples.forEach((s) => drawDirectBeaker(s, t));
    RUN.samples.forEach((s) => drawProbe(s, t));
    // 아래 이름표
    RUN.samples.forEach((s) => {
      const U = A.units[s.i];
      if (layout === 'direct') pill(U.cx, A.table + (PHONE ? 11 : 12), s.S.name + ' ' + s.label, { bg: s.col, size: PHONE ? 12 : 13, pad: 9 });
    });
    // 상태 말풍선 (둘 중 가장 진행된 시료 기준)
    const m = RUN.on || RUN.t > 0 ? (RUN.samples.find((s) => s.st.seg.flat && !sampleDone(s)) || RUN.samples.find((s) => s.st.seg.flat)) : null;
    if (m) pill(R.x + 14, R.y + 26, m.st.seg.flat ? (m.solid ? '🧊→💧 녹는 중: 온도가 일정해요' : '💧→☁️ 끓는 중: 온도가 일정해요') : '', { bg: '#7c3aed', size: PHONE ? 12.5 : 14, align: 'left', pad: 10 });
    else if (RUN.done) pill(R.x + 14, R.y + 26, '✅ 가열이 끝났어요', { bg: COL.good, size: PHONE ? 12.5 : 14, align: 'left', pad: 10 });
  }

  /* =========================================================
     시간–온도 그래프 · 입자 모형 창 · 압력 카드 · 녹는점·끓는점 표
     ========================================================= */
  const PCOL = (P) => (P < 0.85 ? '#2563eb' : P > 1.4 ? '#dc2626' : P > 0.95 && P < 1.05 ? '#64748b' : '#8b5cf6');
  function gGeom(r, cv) {
    const P = { x0: r.x + (PHONE ? 44 : 54), y0: r.y + (PHONE ? 56 : 58), x1: r.x + r.w - 16, y1: r.y + r.h - (PHONE ? 36 : 40) };
    return { P, X: (tt) => P.x0 + (P.x1 - P.x0) * tt / cv.xmax, Y: (T) => P.y1 - (P.y1 - P.y0) * (T - cv.ymin) / (cv.ymax - cv.ymin) };
  }
  /* 변하지 않는 눈금은 한 번만 그려서 재사용해요 */
  const GBASE = {};
  function graphBase(r, cv, key) {
    const k = Math.max(1, Math.round(view.scale * view.dpr * 2) / 2);
    const kk = key + '|' + cv.xmax + '|' + cv.ymax + '|' + cv.ymin;
    let b = GBASE[kk];
    if (b && b.k === k) return b;
    const { P, X, Y } = gGeom(r, cv);
    const cvs = document.createElement('canvas');
    cvs.width = Math.ceil(r.w * k); cvs.height = Math.ceil(r.h * k);
    const c = cvs.getContext('2d'), d = SciSim.draw(c);
    c.scale(k, k); c.translate(-r.x, -r.y);
    c.strokeStyle = 'rgba(120,135,160,.22)'; c.lineWidth = 1;
    const ys = cv.ymax - cv.ymin > 100 ? 20 : 20;
    for (let T = Math.ceil(cv.ymin / ys) * ys; T <= cv.ymax + 0.1; T += ys) { c.beginPath(); c.moveTo(P.x0, Y(T)); c.lineTo(P.x1, Y(T)); c.stroke(); d.text(P.x0 - 7, Y(T) + 4.5, String(T), { size: PHONE ? 12.5 : 13, weight: 700, color: COL.muted, align: 'right' }); }
    const xs = cv.xmax > 20 ? 5 : cv.xmax > 10 ? 4 : 2;
    for (let m = 0; m <= cv.xmax + 0.01; m += xs) { c.beginPath(); c.moveTo(X(m), P.y0); c.lineTo(X(m), P.y1); c.stroke(); d.text(X(m), P.y1 + 16, String(m), { size: PHONE ? 12.5 : 13, weight: 700, color: COL.muted }); }
    c.strokeStyle = '#5d6879'; c.lineWidth = 2; c.beginPath(); c.moveTo(P.x0, P.y0 - 6); c.lineTo(P.x0, P.y1); c.lineTo(P.x1 + 4, P.y1); c.stroke();
    d.text(P.x0 - 6, P.y0 - (PHONE ? 10 : 12), '온도 (°C)', { size: PHONE ? 12.5 : 13, weight: 800, color: COL.muted, align: 'left' });
    d.text(P.x1, P.y1 + (PHONE ? 30 : 31), '가열 시간 (분)', { size: PHONE ? 12.5 : 13, weight: 800, color: COL.muted, align: 'right' });
    b = { cv: cvs, k }; GBASE[kk] = b;
    return b;
  }
  function drawSegCurve(s, tEnd, X, Y, col, w, alpha) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; if (alpha != null) ctx.globalAlpha = alpha;
    s.cv.segs.forEach((g) => {
      if (tEnd <= g.t0) return;
      const t1 = Math.min(g.t1, tEnd);
      ctx.beginPath(); ctx.moveTo(X(g.t0), Y(g.T0)); ctx.lineTo(X(t1), Y(lerp(g.T0, g.T1, (t1 - g.t0) / Math.max(1e-6, g.t1 - g.t0))));
      if (g.flat) { ctx.strokeStyle = rgba('#8b5cf6', 0.28); ctx.lineWidth = w + 7; ctx.stroke(); }
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
    });
    ctx.restore();
  }
  function drawGraph(r) {
    const R = RUN, cvs = R.samples.map((s) => s.cv);
    // 압력 장면: 기록한 곡선도 함께 보여 줘요
    const ref = cvs[0];
    const { P, X, Y } = gGeom(r, ref);
    panel(r.x, r.y, r.w, r.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(r.x + 14, r.y + 26, '📈 가열 곡선 (시간–온도)', { size: PHONE ? 14 : 15, weight: 800, color: COL.ink, align: 'left' });
    ctx.drawImage(graphBase(r, ref, R.kind === 'press' ? 'press' : 'a').cv, r.x, r.y, r.w, r.h);
    // 범례
    if (R.kind !== 'press') legendRow(r.x + r.w - 12, r.y + (PHONE ? 40 : 24), R.samples.map((s) => ({ c: s.col, t: s.q.unk ? '시료 ' + s.q.unk : s.label })));
    // 지난 압력 곡선
    if (R.kind === 'press') {
      R.press.forEach((q) => {
        if (Math.abs(q.P - R.P) < 0.02) return;
        const cv = curveFor('press', null, q.P); drawSegCurve({ cv }, 99, X, Y, rgba(PCOL(q.P), 0.55), 3, 0.7);
        const g = cv.segs[1]; pill(X(g.t1) - 2, Y(g.T0) - 14, q.P.toFixed(1) + '기압', { bg: rgba(PCOL(q.P), 0.8), size: PHONE ? 11.5 : 13, pad: 6, align: 'right' });
      });
    }
    // 평평한 구간의 기준선
    R.samples.forEach((s) => {
      s.cv.segs.filter((g) => g.flat).forEach((g) => {
        if (R.t <= g.t0 + 0.05 || (R.kind === 'press' && !R.on && !R.done && R.t <= 0)) return;
        const y = Y(g.T0); ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = rgba('#8b5cf6', 0.6); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(P.x0, y); ctx.lineTo(X(Math.min(g.t1, R.t)), y); ctx.stroke(); ctx.restore();
      });
    });
    // 곡선
    R.samples.forEach((s) => drawSegCurve(s, R.t, X, Y, R.kind === 'press' ? PCOL(R.P) : s.col, 4.2));
    // 머리 점 + 지금 온도
    const heads = R.samples.map((s) => { const tt = Math.min(R.t, endOf(s.cv)); return { x: X(tt), y: Y(s.st.T) }; });
    R.samples.forEach((s, i) => {
      if (R.t <= 0.001 && !R.on) return;
      const hx = heads[i].x, hy = heads[i].y;
      D.glow(hx, hy, 17, s.col, 0.5); D.sphere(hx, hy, 6.4, s.col, { gloss: true });
      let py = hy - 16;
      if (heads.length > 1 && Math.abs(heads[1].y - heads[0].y) < 26 && Math.abs(heads[1].x - heads[0].x) < 96) {   // 머리가 가까우면 위 · 아래로 나눠요
        const o = heads[1 - i]; if (!(hy < o.y || (hy === o.y && i === 0))) py = hy + 17;
      }
      pill(Math.min(hx + 8, P.x1 - 54), py, tStr(s.st.T) + ' °C', { bg: s.col, size: PHONE ? 12.5 : 13, align: 'left', pad: 7 });
    });
    // 수평 구간 설명 (선 아래)
    R.samples.forEach((s, i) => {
      s.cv.segs.filter((g) => g.flat).forEach((g) => {
        if (R.t <= g.t0 + 0.4) return;
        const k = smooth((R.t - g.t0 - 0.4) / 0.8), shown = Math.min(R.t, g.t1);
        const mx = (X(g.t0) + X(shown)) / 2, my = Y(g.T0) + 22 + i * 24;
        ctx.save(); ctx.globalAlpha = Math.min(1, k);
        const lbl = R.kind === 'press' ? tStr(g.T0) + ' °C에서 끓어요' : (g.name + ' ' + tStr(g.T0) + ' °C') + (R.kind === 'unk' ? '' : ' · ' + tStr(g.t1 - g.t0) + '분');
        pill(clamp(mx, P.x0 + 70, P.x1 - 70), my, (R.samples.length > 1 && R.kind !== 'unk' ? s.label + ': ' : '') + lbl, { bg: R.kind === 'press' ? rgba(PCOL(R.P), 0.92) : s.col, size: PHONE ? 12 : 13, pad: 8 });
        ctx.restore();
      });
    });
  }

  /* ---- 입자 모형 창 (🔍) : 시료마다 한 칸씩 ---- */
  const stateWord = (s) => { const id = s.st.id; return id === 'sol' ? '고체' : id === 'melt' ? '녹는 중' : id === 'liq' ? '액체' : id === 'boil' ? '끓는 중' : ''; };
  const stateNote = (s) => { const id = s.st.id; return id === 'sol' ? '제자리에서 떨어요' : id === 'melt' ? '자리를 벗어나요' : id === 'liq' ? '붙은 채 미끄러져요' : id === 'boil' ? '멀리 날아가요' : ''; };
  function drawLensM() {
    const r = LAY.bot, R = RUN;
    lensFrame(r, { title: '🔍 입자 모형' }, () => {
      R.samples.forEach((s, i) => { if (s.box) s.box.draw(ctx, 1); });
      if (R.samples.length > 1) { ctx.strokeStyle = 'rgba(124,58,237,.25)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(r.x + r.w / 2, r.y + 44); ctx.lineTo(r.x + r.w / 2, r.y + r.h - 12); ctx.stroke(); ctx.setLineDash([]); }
    });
    R.samples.forEach((s) => {
      const b = lensBoxOf(s.i, R.samples.length), cx = (b.x0 + b.x1) / 2;
      if (R.samples.length > 1) pill(cx, b.y0 + (PHONE ? 11 : 13), s.label + ' · 입자 ' + s.N + '개', { bg: s.col, size: PHONE ? 12 : 13, pad: 7 });
      const w = stateWord(s);
      if (w) pill(cx, b.y0 + (PHONE ? 36 : 42), w, { bg: s.st.seg.flat ? '#7c3aed' : '#64748b', size: PHONE ? 12 : 13, pad: 9 });
      const nt = stateNote(s);
      if (nt) text(cx, b.y0 + (PHONE ? 62 : 71), nt, { size: PHONE ? 12 : 13, weight: 700, color: COL.muted });
    });
  }

  /* ---- ③ 압력 카드 (눌러서 압력을 맞춰요) ---- */
  const prCards = () => { const r = LAY.bot, w = (r.w - 16 * 2 - 10 * 2) / 3; return PRESETS.map((q, i) => ({ q, x: r.x + 16 + i * (w + 10), y: r.y + (PHONE ? 38 : 50), w, h: r.h - (PHONE ? 48 : 62) })); };
  function drawPressCards() {
    const r = LAY.bot;
    panel(r.x, r.y, r.w, r.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(r.x + 14, r.y + 26, '🧭 장소마다 달라지는 끓는점', { size: PHONE ? 14 : 15, weight: 800, color: COL.ink, align: 'left' });
    prCards().forEach((cd) => {
      const rec = RUN.press.find((p) => Math.abs(p.P - cd.q.p) < 0.03), cur = Math.abs(RUN.P - cd.q.p) < 0.06;
      ctx.fillStyle = cur ? 'rgba(139,92,246,.12)' : '#f5f8fd'; D.roundRect(cd.x, cd.y, cd.w, cd.h, 14); ctx.fill();
      ctx.strokeStyle = cur ? 'rgba(139,92,246,.7)' : COL.line; ctx.lineWidth = cur ? 2.4 : 1.6; D.roundRect(cd.x, cd.y, cd.w, cd.h, 14); ctx.stroke();
      const cx = cd.x + cd.w / 2;
      text(cx, cd.y + (PHONE ? 30 : 36), cd.q.ic, { size: PHONE ? 26 : 32 });
      text(cx, cd.y + (PHONE ? 54 : 62), cd.q.nm, { size: PHONE ? 13.5 : 14.5, weight: 800, color: COL.ink });
      text(cx, cd.y + (PHONE ? 71 : 82), cd.q.p.toFixed(1) + ' 기압', { size: PHONE ? 12.5 : 13.5, weight: 700, color: COL.muted });
      if (rec) {
        ctx.save(); const s = 1 + 0.2 * rec.pop; ctx.translate(cx, cd.y + cd.h - (PHONE ? 12 : 13)); ctx.scale(s, s);
        if (PHONE) text(0, 0, '끓는점 ' + tStr(rec.bp) + ' °C', { size: 14, weight: 800, color: PCOL(cd.q.p) });
        else { text(0, -19, '잰 끓는점', { size: 13, weight: 700, color: COL.muted }); text(0, 0, tStr(rec.bp) + ' °C', { size: 18, weight: 800, color: PCOL(cd.q.p) }); }
        ctx.restore();
      } else text(cx, cd.y + cd.h - (PHONE ? 12 : 14), '눌러서 압력 맞추기', { size: PHONE ? 12 : 13, weight: 700, color: '#94a3b8' });
    });
  }

  /* ---- ④ 녹는점 · 끓는점 표 ---- */
  const PICK = { X: '', Y: '', flagX: '', flagY: '', shX: 0, shY: 0 };
  function drawPropTable() {
    const r = LAY.bot;
    panel(r.x, r.y, r.w, r.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(r.x + 14, r.y + 26, '📋 녹는점 · 끓는점 표 (°C)', { size: PHONE ? 14 : 15, weight: 800, color: COL.ink, align: 'left' });
    const x0 = r.x + 12, w = r.w - 24, y0 = r.y + (PHONE ? 36 : 44), hh = PHONE ? 24 : 30, rh = PHONE ? 22 : 36, cw = [w * 0.34, w * 0.33, w * 0.33];
    ctx.fillStyle = '#f3f0ff'; D.roundRect(x0, y0, w, hh, 10); ctx.fill();
    ['물질', '녹는점', '끓는점'].forEach((h, i) => text(x0 + cw.slice(0, i).reduce((a, b) => a + b, 0) + cw[i] / 2, y0 + hh / 2 + 5, h, { size: PHONE ? 13 : 14.5, weight: 800, color: COL.subD }));
    TABLE.forEach((id, i) => {
      const S = SUBS[id], y = y0 + hh + 4 + i * rh, tags = ['X', 'Y'].filter((k) => PICK[k] === id), hl = tags.length > 0;
      const sh = Math.max(tags.indexOf('X') >= 0 ? PICK.shX : 0, tags.indexOf('Y') >= 0 ? PICK.shY : 0), bad = sh > 0.02;
      ctx.save(); if (bad) ctx.translate(Math.sin(CLK.t * 50) * 3.2 * sh, 0);
      ctx.fillStyle = hl ? (bad ? 'rgba(226,70,75,.14)' : 'rgba(139,92,246,.12)') : i % 2 ? '#fafbfe' : '#f5f8fd'; D.roundRect(x0, y, w, rh - 3, 9); ctx.fill();
      if (hl) { ctx.strokeStyle = bad ? 'rgba(226,70,75,.85)' : 'rgba(139,92,246,.65)'; ctx.lineWidth = 2; D.roundRect(x0, y, w, rh - 3, 9); ctx.stroke(); }
      drawBall(ctx, S.pcol, x0 + 16, y + rh / 2 - 1.5, PHONE ? 5.5 : 7);
      text(x0 + 30, y + rh / 2 + 4, S.name, { size: PHONE ? 13.5 : 16, weight: 800, color: COL.ink, align: 'left' });
      const v = (c, val, col) => { const cx = x0 + cw.slice(0, c).reduce((a, b) => a + b, 0) + cw[c] / 2; text(cx, y + rh / 2 + 5, val == null ? '–' : tStr(val), { size: PHONE ? 14 : 17, weight: 800, color: val == null ? '#c3ccd9' : col }); };
      v(1, S.mp, '#1d4ed8'); v(2, S.bp, '#b91c1c');
      tags.forEach((k, j) => pill(x0 + w - 14 - j * (PHONE ? 30 : 34), y + rh / 2 - 1, k, { bg: k === 'X' ? '#64748b' : '#7c6bd6', size: PHONE ? 12 : 13, align: 'right', pad: 6 }));
      ctx.restore();
    });
  }

  /* =========================================================
     화면 요소 · 장면 전환 · 입력 · 갱신/그리기 루프
     ========================================================= */
  const SCENES = {
    melt: { label: '🧊 팔미트산의 녹는점 재기', hint: '🔥 단추(또는 가열판)를 눌러 5 g과 10 g을 함께 가열해 보세요.' },
    boil: { label: '♨️ 끓는점 재기', hint: '물질을 고르고 🔥 단추를 눌러 적은 양과 많은 양을 함께 가열해요.' },
    press: { label: '⛰️ 압력에 따른 물의 끓는점', hint: '압력을 맞추고 🔥 단추를 눌러 물이 끓는 온도를 재요.' },
    unk: { label: '🔎 이름표가 없는 시료 X · Y', hint: '🔥 단추를 눌러 가열하고, 수평 구간의 온도를 표와 비교해요.' },
  };
  const S = { scene: 'melt', sub: 'water', sceneT: 0 };
  const ready = {};
  const hintEl = $('#stageHint');
  const selX = $('#selX'), selY = $('#selY'), pressR = $('#pressR'), subBtns = $$('#subSeg button');
  const kindOf = (sc) => (sc === 'boil' ? S.sub : sc);
  const HEAT_NOTE = {
    melt: '팔미트산 5 g과 10 g을 같은 중탕으로 가열해요. 1분이 약 0.6초로 빠르게 지나가요.',
    boil: '적은 양과 많은 양을 함께 가열해요. 1분이 약 0.4초로 빠르게 지나가요.',
    press: '압력을 먼저 맞춘 뒤 가열해요. 압력을 바꾸면 처음부터 다시 시작해요.',
    unk: 'X(고체)와 Y(액체)를 함께 가열해요. 수평 구간의 온도를 읽어 보세요.',
  };

  /* ---------- 읽는 값 ---------- */
  function refreshReadouts() {
    const set = (i, label, val, word) => {
      const l = $('#rl' + i), v = $('#r' + i);
      if (l.textContent !== label) l.textContent = label;
      if (v.innerHTML !== val) v.innerHTML = val;
      v.classList.toggle('word', !!word);
    };
    const R = RUN, a = R.samples[0], b = R.samples[1];
    const T = (s) => tStr(s.st.T) + '<small>°C</small>';
    const flat = (s) => { const g = s.cv.segs.find((q) => q.flat); return g && R.t >= g.t0 + 0.3 ? tStr(g.T0) + '<small>°C</small>' : '–'; };
    if (S.scene === 'melt') {
      set(1, a.label + '의 온도', T(a)); set(2, b.label + '의 온도', T(b));
      set(3, PHONE ? '녹는점' : '녹는점 (수평 구간)', flat(a) === flat(b) ? flat(a) : (flat(a) !== '–' ? flat(a) : flat(b)));
    } else if (S.scene === 'boil') {
      set(1, PHONE ? a.label + ' 온도' : a.S.name + ' ' + a.label + '의 온도', T(a)); set(2, PHONE ? b.label + ' 온도' : b.S.name + ' ' + b.label + '의 온도', T(b));
      set(3, PHONE ? '끓는점' : '끓는점 (수평 구간)', flat(a) === flat(b) ? flat(a) : (flat(a) !== '–' ? flat(a) : flat(b)));
    } else if (S.scene === 'press') {
      set(1, '압력', (Math.round(R.P * 10) / 10).toFixed(1) + '<small>기압</small>');
      set(2, '물의 온도', T(a)); set(3, '끓는점', flat(a));
    } else {
      set(1, '시료 X의 온도', T(a)); set(2, '시료 Y의 온도', T(b));
      set(3, '고른 물질', (PICK.X ? SUBS[PICK.X].name : '–') + ' · ' + (PICK.Y ? SUBS[PICK.Y].name : '–'), true);
    }
  }

  let lastFree = null;
  function refreshUI() {
    const free = !!(game && game.free), sc = S.scene, R = RUN;
    $('#sceneSeg').hidden = !free;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    $('#tbLabel').textContent = sc === 'boil' ? '♨️ ' + SUBS[S.sub].name + '의 끓는점 재기' : SCENES[sc].label;
    $('#tbLabel').hidden = free && window.innerWidth < 1100;
    $('#ctlSub').hidden = sc !== 'boil';
    $('#ctlPress').hidden = sc !== 'press';
    $('#ctlPick').hidden = !(sc === 'unk' && on('unk'));
    subBtns.forEach((b) => { b.setAttribute('aria-pressed', b.dataset.sub === S.sub ? 'true' : 'false'); b.disabled = R.on; });
    pressR.disabled = R.on;
    const hb = $('#heatBtn');
    hb.textContent = R.done ? '↺ 다시 가열하기' : R.on ? '⏸ 멈추기' : R.t > 0 ? '▶ 계속 가열하기' : '🔥 가열하기';
    hb.classList.toggle('btn-primary', !R.on);
    $('#heatNote').textContent = HEAT_NOTE[sc];
    selX.classList.toggle('set', !!PICK.X); selY.classList.toggle('set', !!PICK.Y);
    lastFree = free;
  }
  function showHintMsg(t, ms) { showHint(t, ms || 5200); }

  function resetScene(key) {
    FX.clear(); hideHint();
    if (key === 'unk') { PICK.X = PICK.Y = ''; PICK.flagX = PICK.flagY = ''; PICK.shX = PICK.shY = 0; selX.value = ''; selY.value = ''; }
    setupRun(kindOf(key), key === 'press' ? { P: +pressR.value } : {});
    ready[key] = true; S.sceneT = 0;
    refreshReadouts(); refreshUI();
  }
  /* 새 단계에서 처음 나타나는 조절 상자는 잠깐 깜빡여서 알려 줘요 */
  const CTL_OF = { boil: '#ctlSub', press: '#ctlPress', unk: '#ctlPick' };
  function pulseCtl(sc) {
    const el = CTL_OF[sc] && $(CTL_OF[sc]);
    if (!el || el.hidden || RM) return;
    el.classList.remove('feature-new'); void el.offsetWidth; el.classList.add('feature-new');
    setTimeout(() => el.classList.remove('feature-new'), 4600);
  }
  function setScene(key, reset) {
    const was = S.scene;
    if (key !== was) { FX.clear(); S.sceneT = 0; hideHint(); }
    S.scene = key;
    if (reset || !ready[key] || RUN.kind !== kindOf(key)) resetScene(key); else refreshReadouts();
    if (key !== was || reset) showHintMsg(SCENES[key].hint, 6500);
    refreshUI();
    if (key !== was && !(game && game.free)) pulseCtl(key);
  }
  function setSub(id) {
    if (RUN.on) return;
    S.sub = id; Sound.click();
    if (S.scene === 'boil') resetScene('boil');
    refreshUI();
  }
  function setPressure(v) {
    v = Math.round(clamp(v, 0.5, 2) * 10) / 10;
    pressR.value = v; pressRange.refresh();
    if (S.scene === 'press' && !RUN.on) { RUN.P = v; setupRun('press', { P: v }); hideHint(); }
    refreshReadouts(); refreshUI();
  }
  const pressRange = SciSim.bindRange(pressR, $('#pressO'), (v) => (+v).toFixed(1) + ' 기압', (v) => {
    if (RUN.on) { pressR.value = RUN.P; pressRange.refresh(); return; }
    if (S.scene === 'press') { Sound.tick(); RUN.P = Math.round(v * 10) / 10; setupRun('press', { P: RUN.P }); hideHint(); refreshReadouts(); refreshUI(); }
  });

  /* ---------- 단추 · 선택 상자 ---------- */
  $('#heatBtn').addEventListener('click', startRun);
  $('#resetBtn').addEventListener('click', () => { Sound.click(); resetScene(S.scene); showHintMsg(SCENES[S.scene].hint, 5000); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene, true); }));
  subBtns.forEach((b) => b.addEventListener('click', () => setSub(b.dataset.sub)));
  [[selX, 'X'], [selY, 'Y']].forEach((q) => q[0].addEventListener('change', () => { PICK[q[1]] = q[0].value; PICK['flag' + q[1]] = ''; Sound.click(); refreshUI(); refreshReadouts(); }));

  /* ---------- 캔버스 입력: 가열판 · 압력 카드를 눌러도 돼요 (손가락을 뗄 때 실행: 휴대폰에서 화면을 밀어 내려도 잘못 눌리지 않아요) ---------- */
  const platePad = () => { const P = curA().plate; return { x: P.cx - P.w / 2 - 6, y: P.y - 8, w: P.w + 12, h: P.h + 16 }; };
  if (PHONE) view.canvas.style.touchAction = 'pan-y';
  let tapStart = null;
  SciSim.pointer(view, {
    hover(p) {
      if (S.scene === 'press' && prCards().some((c) => inRect(p, c, 2))) return 'pointer';
      return inRect(p, platePad()) ? 'pointer' : null;
    },
    down(p, e) {
      hideHint();
      let target = null;
      if (S.scene === 'press') { const c = prCards().find((q) => inRect(p, q, 2)); if (c) target = { card: c }; }
      if (!target && inRect(p, platePad())) target = { plate: true };
      if (!target) return false;
      tapStart = { x: e.clientX, y: e.clientY, target };
      return true;
    },
    move() {},
    up(p, e) {
      const st = tapStart; tapStart = null;
      if (!st || e.type !== 'pointerup' || Math.hypot(e.clientX - st.x, e.clientY - st.y) > 14) return;
      if (st.target.card) { if (!RUN.on) { Sound.click(); setPressure(st.target.card.q.p); } return; }
      startRun();
    },
  });

  /* ---------- 갱신 · 그리기 ---------- */
  let lastDt = 1 / 60;
  function update(dt) {
    lastDt = dt;
    CLK.t += dt; S.sceneT += dt;
    sqUpdate(dt);
    FX.update(dt);
    updateRun(dt);
    PD.v.target = RUN.P; PD.v.update(dt);
    PICK.shX = Math.max(0, PICK.shX - dt * 2.6); PICK.shY = Math.max(0, PICK.shY - dt * 2.6);
  }
  function draw() {
    view.clear(BG);
    const t = CLK.t, dt = lastDt, sc = S.scene;
    drawLabM(t);
    drawGraph(LAY.top);
    if (sc === 'press') drawPressCards(); else if (sc === 'unk') drawPropTable(); else drawLensM();
    FX.draw(ctx);
    drawChecks(dt);
    if (RUN.doneFlash > 0.05) { ctx.save(); ctx.globalAlpha = RUN.doneFlash * 0.5; ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 6; D.roundRect(LAY.top.x - 3, LAY.top.y - 3, LAY.top.w + 6, LAY.top.h + 6, 18); ctx.stroke(); ctx.restore(); }
    if (sc === 'melt' && isNew('melt')) ringRect(LAY.bot, 18);
    if (sc === 'boil' && isNew('boil')) ringRect(LAY.bot, 18);
    if (sc === 'press' && isNew('press')) ringRect(LAY.bot, 18);
    if (sc === 'unk' && isNew('unk')) ringRect(LAY.bot, 18);
    if (S.sceneT < 0.35) { ctx.save(); ctx.globalAlpha = 1 - ease.outCubic(S.sceneT / 0.35); ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH); ctx.restore(); }
  }
  let lastUI = 0;
  function pulse(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    if (lastFree !== !!(game && game.free)) refreshUI();
    refreshReadouts();
  }

  /* =========================================================
     미션 (4단계 · 11개)
     ========================================================= */
  const mark = (b) => (b ? '✅' : '⬜');
  const isK = (k) => RUN.kind === k;
  const ensureDone = (sc, k) => { if (!(isK(k) && RUN.done)) { setScene(sc, false); if (!isK(k)) resetScene(sc); finishRunNow(); } };

  /* 퀴즈 그림 (인라인 SVG) */
  const FIG_TWO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 178" width="320" role="img" aria-label="팔미트산 5 g(가)과 10 g(나)의 가열 곡선: 둘 다 약 63 도에서 수평이고 10 g의 수평 구간이 더 길다">' +
    '<rect width="320" height="178" rx="12" fill="#f6f9ff"/>' +
    '<path d="M42 24 V138 H302" fill="none" stroke="#5d6879" stroke-width="2"/>' +
    '<text x="12" y="22" font-size="12" font-weight="700" fill="#5d6879">온도</text><text x="262" y="158" font-size="12" font-weight="700" fill="#5d6879">가열 시간</text>' +
    '<line x1="42" y1="70" x2="300" y2="70" stroke="#8b5cf6" stroke-width="1.6" stroke-dasharray="5 5"/><text x="46" y="64" font-size="12" font-weight="800" fill="#6d28d9">약 63 °C</text>' +
    '<path d="M44 122 L88 70 L128 70 L158 40" fill="none" stroke="#2f7de1" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M44 122 L122 70 L210 70 L258 40" fill="none" stroke="#e2464b" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>' +
    '<g font-size="16" font-weight="800"><text x="165" y="46" fill="#2f7de1">가</text><text x="267" y="46" fill="#e2464b">나</text></g>' +
    '<g font-size="12" font-weight="700" fill="#5d6879"><text x="10" y="172">가: 팔미트산 5 g · 나: 팔미트산 10 g</text></g></svg>';

  game = SciSim.game({
    simId: 'm2-melting-boiling',
    mount: '#game',
    badge: '온도 탐정',
    homeHref: '../../index.html#g2',
    featureLabels: {
      melt: '🧊 팔미트산 가열 곡선과 입자 모형',
      boil: '♨️ 물 · 에탄올 끓는점 재기',
      press: '⛰️ 압력 조절과 끓는점',
      unk: '🔎 미지 시료 X · Y와 녹는점·끓는점 표',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onMissionStart(m) {
      if (game && game.free) return;
      if (m.sub) S.sub = m.sub;
      if (m.scene) setScene(m.scene, false);
      refreshUI();
    },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '녹는점: 양이 달라도 같을까?', short: '녹는점', icon: '🧊', phase: '실험',
        features: ['melt'],
        intro: '<p class="si-q">❓ 탐구 질문: 같은 물질이라면 양이 많아도 녹거나 끓는 온도가 같을까?</p>' +
          '<p>고체 <b>팔미트산</b>을 <b>5 g</b>과 <b>10 g</b>으로 나누어 <b>같은 방법</b>(뜨거운 물에 중탕)으로 가열하면서 온도를 재요. 🔍 <b>입자 모형</b>으로 녹는 모습도 살펴봐요.</p>',
        setup() { setScene('melt', true); },
        recap: '같은 물질은 양이 달라도 <b>녹는점</b>이 같아요. 양이 많으면 <b>수평 구간만 더 길어요</b>. 녹는점은 같은 물질의 <b>어는점</b>과 같아요.',
        summary: '<ul><li><b>녹는점</b>: 고체가 녹아 액체가 될 때의 온도예요. 녹는 동안에는 열을 계속 가해도 온도가 <b>일정</b>해요. (가열 곡선의 수평 구간)</li>' +
          '<li>같은 물질이면 양이 달라도 녹는점이 같아요. (팔미트산 약 63 °C) 양이 많으면 녹는 시간이 길어져 수평 구간이 길어질 뿐이에요.</li>' +
          '<li>같은 물질에서 <b>녹는점 = 어는점</b>이에요. 녹는점은 물질을 구별하는 <b>물질의 특성</b>이에요.</li></ul>',
        missions: [
          {
            title: '팔미트산 5 g · 10 g 가열하기', scene: 'melt',
            goal: '🔥 단추를 눌러 팔미트산 <b>5 g과 10 g</b>이 <b>모두 녹을 때까지</b> 가열하고, 가열 곡선과 🔍 입자 모형을 관찰하세요.',
            hint: '🔥 가열하기를 눌러 시작해요. 온도가 변하지 않는 구간(수평 구간)이 어디인지 보세요. 입자의 모습도 함께 보세요.',
            check: () => isK('melt') && RUN.done,
            hold: 0.8,
            status: () => isK('melt') ? '5 g 녹음 ' + mark(passed(smp(0), 'melt')) + ' · 10 g 녹음 ' + mark(passed(smp(1), 'melt')) + ' · 지금 <b>' + tStr(smp(1).st.T) + ' °C</b>' : '',
            onWin() { celebrate(LAY.top.x + LAY.top.w / 2, LAY.top.y + 80); },
            explain: '두 시료 모두 약 <b>63 °C</b>에서 온도가 일정한 <b>수평 구간</b>이 나타났어요. 10 g은 5 g보다 가열 시간과 수평 구간이 더 길었지만 수평 구간의 <b>온도는 같았어요</b>. 이 온도가 팔미트산의 <b>녹는점</b>이에요.',
          },
          {
            type: 'quiz', title: '두 가열 곡선 비교하기', scene: 'melt',
            setup() { ensureDone('melt', 'melt'); },
            goal: '팔미트산 5 g(가)과 10 g(나)의 가열 곡선이에요. <b>수평 구간</b>을 비교하면 어떨까요?',
            figure: FIG_TWO,
            choices: ['온도는 같고, 10 g의 수평 구간이 더 길다', '10 g의 수평 구간의 온도가 더 높다', '수평 구간의 온도와 길이가 모두 같다', '5 g의 수평 구간의 온도가 더 높다'],
            answer: 0,
            feedback: ['', '양이 많다고 녹는점이 높아지지 않아요. 두 곡선의 수평 구간은 같은 온도(약 63 °C)예요.', '길이는 달랐어요. 10 g은 녹는 데 더 오래 걸려서 수평 구간이 더 길어요.', '5 g도 10 g도 같은 온도에서 수평이에요. 온도를 다시 비교해 보세요.'],
            explain: '녹는점은 물질의 양과 관계없이 일정한 <b>물질의 특성</b>이에요. 양이 많으면 녹는 데 시간이 더 걸려 수평 구간이 길어질 뿐이에요.',
          },
          {
            type: 'quiz', title: '녹는점과 어는점', scene: 'melt',
            goal: '63 °C에서 녹은 액체 팔미트산을 천천히 식히면, 약 몇 °C에서 굳기 시작할까요?',
            choices: ['약 63 °C (녹는점과 같다)', '63 °C보다 훨씬 낮은 온도', '63 °C보다 훨씬 높은 온도', '양에 따라 굳는 온도가 달라진다'],
            answer: 0,
            feedback: ['', '녹는점과 어는점은 같은 온도예요. 63 °C에서 녹았다면 63 °C에서 굳기 시작해요.', '굳는 온도가 녹는 온도보다 훨씬 높지는 않아요. 같은 물질에서는 같아요.', '양이 달라도 어는점은 일정해요. 어는점도 물질의 특성이에요.'],
            explain: '같은 물질에서 <b>녹는점과 어는점은 같아요</b>. 63 °C에서 녹은 팔미트산은 식힐 때도 약 63 °C에서 굳기 시작하고, 굳는 동안에는 온도가 일정해요.',
          },
        ],
      },
      {
        title: '끓는점: 물과 에탄올', short: '끓는점', icon: '♨️', phase: '실험',
        features: ['boil'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 물질이면 양이 달라도 녹는점이 같았어요.</div>' +
          '<p>이번에는 <b>끓는점</b>이에요. 물과 에탄올을 각각 <b>적은 양</b>과 <b>많은 양</b>으로 가열해서 끓는 온도를 재요. 🔍 입자 모형에서 기체가 되는 입자도 살펴봐요. (에탄올은 불이 붙기 쉬워서 뜨거운 물로 안전하게 데워요.)</p>',
        setup() { S.sub = 'water'; setScene('boil', true); },
        recap: '<b>끓는점</b>은 양과 관계없이 일정해요. 물은 약 <b>100 °C</b>, 에탄올은 약 <b>78 °C</b>로, 물질마다 달라요.',
        summary: '<ul><li><b>끓는점</b>: 액체가 끓어 기체가 될 때의 온도예요. 끓는 동안에는 열을 계속 가해도 온도가 <b>일정</b>해요. (수평 구간)</li>' +
          '<li>같은 물질이면 양이 달라도 끓는점이 같아요. 양이 많으면 끓기까지 더 오래 걸릴 뿐이에요.</li>' +
          '<li>물 100 °C · 에탄올 78 °C: 끓는점도 물질마다 달라서 물질을 구별하는 <b>물질의 특성</b>이에요.</li></ul>',
        missions: [
          {
            title: '물의 끓는점 재기', scene: 'boil', sub: 'water',
            goal: '<b>물</b>을 골라 <b>50 mL와 100 mL</b>를 함께 가열하고, 끓는 동안의 온도를 확인하세요.',
            hint: '🔥 가열하기를 눌러요. 물이 끓을 때 거품이 어떻게 생기는지, 온도가 변하는지 보세요.',
            check: () => isK('water') && RUN.done,
            hold: 0.8,
            status: () => isK('water') ? '50 mL 끓음 ' + mark(passed(smp(0), 'boil')) + ' · 100 mL 끓음 ' + mark(passed(smp(1), 'boil')) + ' · 지금 <b>' + tStr(smp(1).st.T) + ' °C</b>' : '위쪽에서 <b>물</b> 단추를 눌러 주세요.',
            onWin() { celebrate(LAY.top.x + LAY.top.w / 2, LAY.top.y + 80); },
            explain: '두 양 모두 <b>100 °C</b>에서 온도가 일정한 수평 구간이 나타났어요. 100 mL는 끓기까지 더 오래 걸리고 수평 구간도 길었지만 <b>끓는점은 같았어요</b>.',
          },
          {
            title: '에탄올의 끓는점 재기', scene: 'boil', sub: 'eth',
            goal: '이번에는 <b>에탄올</b>을 골라 <b>5 mL와 10 mL</b>를 함께 가열하세요. 끓는 온도는 물과 같을까요?',
            hint: '오른쪽 위의 <b>에탄올</b> 단추가 눌려 있는지 확인하고 🔥 가열하기를 눌러요.',
            check: () => isK('eth') && RUN.done,
            hold: 0.8,
            status: () => isK('eth') ? '5 mL 끓음 ' + mark(passed(smp(0), 'boil')) + ' · 10 mL 끓음 ' + mark(passed(smp(1), 'boil')) + ' · 지금 <b>' + tStr(smp(1).st.T) + ' °C</b>' : '위쪽에서 <b>에탄올</b> 단추를 눌러 주세요.',
            onWin() { celebrate(LAY.top.x + LAY.top.w / 2, LAY.top.y + 80); },
            explain: '에탄올은 <b>78 °C</b>에서 끓었어요. 양이 달라도 같았고, 물(100 °C)과는 달랐어요. 끓는점도 물질마다 다른 특성이에요.',
          },
          {
            type: 'quiz', title: '끓는점과 양의 관계', scene: 'boil', sub: 'water',
            setup() { ensureDone('boil', 'water'); },
            goal: '같은 장소에서 라면 물 <b>1컵</b>을 끓일 때와 <b>3컵</b>을 끓일 때, 물이 끓는 온도는 어떨까요?',
            choices: ['3컵을 끓일 때가 더 높다', '1컵을 끓일 때가 더 높다', '같다 (약 100 °C)', '컵 수에 따라 매번 달라진다'],
            answer: 2,
            feedback: ['양이 많으면 끓기까지 시간이 더 걸릴 뿐이에요. 실험에서도 50 mL와 100 mL 모두 100 °C였어요.', '양이 적다고 끓는점이 높아지지 않아요. 둘 다 같아요.', '', '같은 장소(같은 압력)에서는 끓는점이 일정해요. 물질의 특성이기 때문이에요.'],
            explain: '끓는점은 물질의 양과 관계없이 일정해요. 물은 같은 장소에서 양이 달라도 약 <b>100 °C</b>에서 끓고, 끓는 동안에는 온도가 올라가지 않아요.',
          },
        ],
      },
      {
        title: '압력과 끓는점: 높은 산과 압력솥', short: '압력과 끓는점', icon: '⛰️', phase: '탐구',
        features: ['press'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물은 100 °C에서 끓었어요. 그런데 높은 산에서는 다르대요!</div>' +
          '<p>끓는점은 <b>압력</b>(누르는 힘)에 따라 달라져요. 압력 슬라이더로 <b>높은 산</b>(압력이 낮아요)과 <b>압력솥</b>(압력이 높아요)의 압력을 만들어 물의 끓는점을 재 봐요.</p>',
        setup() { setScene('press', true); pressR.value = 1; pressRange.refresh(); },
        recap: '끓는점은 <b>압력</b>에 따라 달라져요. 압력이 낮으면 끓는점이 <b>낮아지고</b>(높은 산 0.7기압 ≈ 90 °C), 압력이 높으면 끓는점이 <b>높아져요</b>(압력솥 2기압 ≈ 120 °C).',
        summary: '<ul><li>끓는점은 <b>외부 압력</b>에 따라 달라져요. 압력이 낮을수록 낮아지고, 높을수록 높아져요.</li>' +
          '<li><b>높은 산</b>(약 0.7기압)에서는 물이 약 90 °C에서 끓어서 밥이 설익기 쉬워요.</li>' +
          '<li><b>압력솥</b>(약 2기압)에서는 물이 약 120 °C에서 끓어서 음식이 빨리 익어요.</li></ul>',
        missions: [
          {
            title: '높은 산에서의 끓는점', scene: 'press',
            goal: '압력을 <b>약 0.7기압</b>(높은 산 꼭대기 부근)으로 맞추고 가열해서, 물이 끓는 온도를 확인하세요.',
            hint: '슬라이더를 왼쪽(낮은 압력)으로 밀거나 ⛰️ 카드를 눌러요. 압력을 맞춘 뒤 🔥 가열하기를 눌러요.',
            check: () => RUN.press.some((q) => Math.abs(q.P - 0.7) < 0.06),
            hold: 0.8,
            status: () => '지금 압력 <b>' + (Math.round(RUN.P * 10) / 10).toFixed(1) + ' 기압</b> · 0.7기압에서 잰 끓는점 ' + (RUN.press.some((q) => Math.abs(q.P - 0.7) < 0.06) ? '✅ <b>' + tStr(RUN.press.find((q) => Math.abs(q.P - 0.7) < 0.06).bp) + ' °C</b>' : '⬜'),
            onWin() { celebrate(LAY.top.x + LAY.top.w / 2, LAY.top.y + 80); },
            explain: '압력이 낮은 높은 산(약 0.7기압)에서는 물이 <b>약 90 °C</b>에서 끓었어요. 평지(1기압)의 100 °C보다 낮아요. 압력이 낮아지면 끓는점이 낮아져요.',
          },
          {
            title: '압력솥에서의 끓는점', scene: 'press',
            goal: '이번에는 압력을 <b>2기압</b>(압력솥)으로 높이고 가열해서, 끓는점이 어떻게 달라지는지 확인하세요.',
            hint: '슬라이더를 오른쪽 끝(2기압)으로 밀거나 🍲 카드를 눌러요. 앞에서 잰 곡선과 비교해 보세요.',
            check: () => RUN.press.some((q) => Math.abs(q.P - 2) < 0.06),
            hold: 0.8,
            status: () => '지금 압력 <b>' + (Math.round(RUN.P * 10) / 10).toFixed(1) + ' 기압</b> · 2기압에서 잰 끓는점 ' + (RUN.press.some((q) => Math.abs(q.P - 2) < 0.06) ? '✅ <b>' + tStr(RUN.press.find((q) => Math.abs(q.P - 2) < 0.06).bp) + ' °C</b>' : '⬜'),
            onWin() { celebrate(LAY.top.x + LAY.top.w / 2, LAY.top.y + 80); },
            explain: '압력솥(약 2기압)에서는 물이 <b>약 120 °C</b>에서 끓었어요. 압력이 높아지면 끓는점이 높아져서, 음식이 더 빨리 익어요.',
          },
          {
            type: 'quiz', title: '산에서 밥이 설익는 까닭', scene: 'press',
            setup() { if (!RUN.press.length) { setScene('press', false); setPressure(0.7); finishRunNow(); } },
            goal: '높은 산에서 밥을 지으면 밥이 설익어요. 그 까닭은 무엇일까요?',
            choices: ['기압이 낮아서 물이 100 °C보다 낮은 온도에서 끓기 때문이다', '기압이 높아서 물이 100 °C보다 높은 온도에서 끓기 때문이다', '산에서는 물의 끓는점이 변하지 않지만 불이 약하기 때문이다', '산에서는 물의 양이 줄어들기 때문이다'],
            answer: 0,
            feedback: ['', '높은 산은 기압이 낮아요. 기압이 높아지면 끓는점이 높아지는데, 이것은 압력솥의 경우예요.', '끓는점은 압력에 따라 달라져요. 높은 산에서는 불의 세기와 상관없이 더 낮은 온도에서 끓어요.', '물의 양과 끓는점은 관계가 없어요. 압력이 낮아서 끓는점이 낮아지는 것이 까닭이에요.'],
            explain: '높은 산은 <b>기압이 낮아서</b> 물이 100 °C보다 낮은 온도(약 90 °C)에서 끓어요. 그래서 쌀이 덜 익어요. 압력솥은 반대로 압력을 높여 끓는점을 높여요.',
          },
        ],
      },
      {
        title: '물질 구별: 이름표 없는 시료 찾기', short: '물질 구별', icon: '🔎', phase: '적용',
        features: ['unk'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 녹는점과 끓는점이 물질마다 일정한 값이라는 것을 알았어요.</div>' +
          '<p>이름표가 떨어진 시료 <b>X, Y</b>가 있어요. 가열해서 <b>수평 구간의 온도</b>를 읽고, <b>녹는점·끓는점 표</b>와 비교해서 어떤 물질인지 찾아봐요.</p>',
        setup() { setScene('unk', true); },
        recap: '녹는점·끓는점은 물질마다 달라서, 가열 곡선의 <b>수평 구간 온도</b>를 표와 비교하면 물질을 구별할 수 있어요.',
        summary: '<ul><li>가열 곡선의 <b>수평 구간 온도</b>를 읽어요. 고체가 녹는 중이면 <b>녹는점</b>, 액체가 끓는 중이면 <b>끓는점</b>이에요.</li>' +
          '<li>표와 비교해서 물질을 찾아요. 시료 X = 나프탈렌(녹는점 80 °C), 시료 Y = 에탄올(끓는점 78 °C)</li>' +
          '<li>실온(약 25 °C)에서의 상태: 녹는점보다 낮으면 고체, 녹는점과 끓는점 사이면 액체, 끓는점보다 높으면 기체예요.</li></ul>',
        missions: [
          {
            title: '미지 시료 X, Y 찾기', scene: 'unk', manual: true,
            goal: 'X, Y를 끝까지 가열하고 <b>수평 구간의 온도</b>를 읽으세요. 표와 비교해서 오른쪽에서 <b>X, Y가 어떤 물질인지</b> 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
            hint: 'X는 <b>녹는</b> 구간, Y는 <b>끓는</b> 구간이에요. 녹는 구간은 표의 <b>녹는점</b> 칸에서, 끓는 구간은 <b>끓는점</b> 칸에서 같은 온도를 찾아요.',
            check() {
              if (!(isK('unk') && RUN.done)) return '먼저 🔥 가열하기로 X, Y를 끝까지 가열하고 수평 구간의 온도를 읽어 보세요.';
              const miss = ['X', 'Y'].filter((k) => !PICK[k]);
              if (miss.length) return miss.join(', ') + '의 물질을 오른쪽에서 골라 주세요.';
              const msg = [];
              if (PICK.X !== 'naph') { msg.push('X는 고체가 <b>녹는</b> 동안 온도가 80 °C로 일정했어요. 표의 <b>녹는점</b> 칸에서 80 °C를 찾아보세요.'); if (PICK.flagX !== PICK.X) { PICK.flagX = PICK.X; PICK.shX = 1; } }
              if (PICK.Y !== 'eth') { msg.push('Y는 액체가 <b>끓는</b> 동안 온도가 78 °C로 일정했어요. 표의 <b>끓는점</b> 칸에서 78 °C를 찾아보세요.'); if (PICK.flagY !== PICK.Y) { PICK.flagY = PICK.Y; PICK.shY = 1; } }
              return msg.length ? msg.join(' ') : true;
            },
            status: () => isK('unk') ? '가열 ' + (RUN.done ? '✅ 끝' : RUN.on ? '▶ 중' : '⬜') + ' · 고른 물질: X ' + (PICK.X ? SUBS[PICK.X].name : '–') + ' · Y ' + (PICK.Y ? SUBS[PICK.Y].name : '–') : '',
            onWin() { celebrate(LAY.bot.x + LAY.bot.w / 2, LAY.bot.y + 70); },
            explain: '시료 X는 녹는점이 <b>80 °C</b>인 <b>나프탈렌</b>, 시료 Y는 끓는점이 <b>78 °C</b>인 <b>에탄올</b>이에요. 두 값이 비슷해 보여도 수평 구간이 <b>녹는</b> 것인지 <b>끓는</b> 것인지 구별해서 표의 알맞은 칸에서 찾아야 해요.',
          },
          {
            type: 'quiz', title: '실온에서의 상태', scene: 'unk',
            setup() { ensureDone('unk', 'unk'); },
            goal: '에탄올의 녹는점은 <b>−114 °C</b>, 끓는점은 <b>78 °C</b>예요. 실온(약 25 °C)에서 에탄올은 어떤 상태일까요?',
            choices: ['고체', '액체', '기체', '고체와 액체가 섞여 있다'],
            answer: 1,
            feedback: ['25 °C는 녹는점(−114 °C)보다 훨씬 높아서 고체가 아니에요.', '', '25 °C는 끓는점(78 °C)보다 낮아서 기체가 아니에요.', '고체와 액체가 섞이는 것은 녹는점(−114 °C)일 때뿐이에요.'],
            explain: '25 °C는 녹는점(−114 °C)보다 높고 끓는점(78 °C)보다 낮아요. 그래서 에탄올은 <b>액체</b>예요. 녹는점과 끓는점으로 상온에서의 상태를 알 수 있어요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  refreshUI(); refreshReadouts();
  SciSim.loop((dt, t) => {
    update(dt);
    draw();
    pulse(t);
  });
  window.__sim = {
    VW, VH, S, RUN, KIND, PD, PICK, APG, LAY, SUBS,
    get game() { return game; },
    update, draw, setScene, resetScene, startRun, finishRunNow, setPressure, setupRun, smp, bpWater,
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / VW, y: r.top + (y * r.height) / VH }; },
    bench(n) { const t0 = performance.now(); let mx = 0; for (let i = 0; i < n; i++) { const a = performance.now(); update(1 / 60); draw(); mx = Math.max(mx, performance.now() - a); } return { avg: (performance.now() - t0) / n, max: mx }; },
  };
})();
