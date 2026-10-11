/* =========================================================
   중2 Ⅰ. 물질의 특성 — 용해도 [9과08-01]
   ① [관찰] 포화: 20 °C 물 100 g에 소금을 한 숟가락(5 g)씩 → 어느 순간 바닥에 남는다 (🔍 입자 모형)
   ② [실험] 용해도 곡선: 온도를 바꿔 질산 칼륨·염화 나트륨이 최대로 녹는 양을 재고 그래프에 점을 찍는다
   ③ [설명] 석출: 80 °C 포화 용액(169 g)을 20 °C로 식히면 169 − 31.6 = 137.4 g이 결정으로 나온다
   ④ [적용] 기체 용해도: 탄산음료 — 온도가 높을수록, 압력이 낮을수록 기체가 덜 녹는다
   ※ 용해도 = 일정한 온도에서 용매(물) 100 g에 최대로 녹을 수 있는 용질의 g 수 (물질의 특성)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;

  /* ---------- 화면 (태블릿 = 가로형 800×560, 휴대폰 = 세로형 440×620) ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 440 : 800, VH = PHONE ? 640 : 560;
  const BG = '#f6f9fe';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();          // 물방울 · 거품 · 반짝임

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


  let game = null;
  let F = new Set();
  const on = (f) => (game && game.free) || F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));

  /* ---------- 자료: 용해도 (g / 물 100 g) ---------- */
  const SOL = {
    KNO3: { id: 'KNO3', name: '질산 칼륨', sym: 'KNO₃', color: '#e2464b', pcol: '#ef5a5a', data: [[0, 13.3], [20, 31.6], [40, 63.9], [60, 110], [80, 169]] },
    NaCl: { id: 'NaCl', name: '염화 나트륨', sym: 'NaCl', color: '#2f7de1', pcol: '#f59e0b', data: [[0, 35.7], [20, 35.9], [40, 36.4], [60, 37.1], [80, 38.0]] },
  };
  const TEMPS = [0, 20, 40, 60, 80];
  /* 단조 3차 보간 (자료점 사이를 부드럽게 이어요) */
  function monoCubic(pts) {
    const n = pts.length, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return (x) => {
      if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]);
      if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
      let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }
  Object.values(SOL).forEach((s) => { s.f = monoCubic(s.data); });
  const solubility = (id, T) => SOL[id].f(T);                 // 연속 온도에서의 용해도
  const solAt = (id, T) => { const q = SOL[id].data.find((p) => p[0] === T); return q ? q[1] : solubility(id, T); };
  const gStr = (g) => (Math.abs(g - Math.round(g)) < 1e-9 ? String(Math.round(g)) : (Math.round(g * 10) / 10).toFixed(1));

  /* ---------- 배치 ---------- */
  const LAY = PHONE ? {
    lab: { x: 4, y: 4, w: 432, h: 290 },
    top: { x: 4, y: 300, w: 432, h: 190 },
    bot: { x: 4, y: 496, w: 432, h: 140 },
  } : {
    lab: { x: 8, y: 8, w: 372, h: 544 },
    top: { x: 392, y: 8, w: 400, h: 300 },
    bot: { x: 392, y: 316, w: 400, h: 236 },
  };
  /* 실험대 (비커 · 가열판 · 병 · 온도계) */
  const LB = PHONE ? (function () {
    const L = LAY.lab, table = L.y + L.h - 30, plateH = 22, w = 126, h = 164;
    const bot = table - plateH, cx = L.x + 262;
    return { table, plate: { cx, y: bot, w: 168, h: plateH }, beaker: { cx, bot, w, h, top: bot - h, x0: cx - w / 2, x1: cx + w / 2 }, jar: { cx: L.x + 58, bot: table, w: 62, h: 84 }, therm: { x: cx + 42, top: bot - h - 34, tube: 160 }, water: 0.6 };
  })() : (function () {
    const L = LAY.lab, table = L.y + L.h - 40, plateH = 26, w = 188, h = 282;
    const bot = table - plateH, cx = L.x + 226;
    return { table, plate: { cx, y: bot, w: 204, h: plateH }, beaker: { cx, bot, w, h, top: bot - h, x0: cx - w / 2, x1: cx + w / 2 }, jar: { cx: L.x + 60, bot: table, w: 74, h: 98 }, therm: { x: cx + 56, top: bot - h - 40, tube: 230 }, water: 0.6 };
  })();
  LB.water0 = LB.beaker.bot - LB.beaker.h * LB.water;               // 물의 윗면 y (안쪽)
  LB.inner = { x0: LB.beaker.x0 + 3, x1: LB.beaker.x1 - 3, yTop: LB.beaker.top, yBot: LB.beaker.bot - 4 };

  /* =========================================================
     입자 모형 상자: 물 입자 + 용질 입자 (녹아서 퍼지기 · 바닥에 쌓인 결정 · 결정에 달라붙기)
     ========================================================= */
  class SolnBox {
    /* o: {box:{x0,y0,x1,y1}, nWater, Rw, Rs, wcol, scol, gPer} */
    constructor(o) {
      this.box = o.box; this.Rw = o.Rw || 6.5; this.Rs = o.Rs || 8.5; this.wcol = o.wcol || '#84c7ff'; this.scol = o.scol || '#f59e0b';
      this.gap = 0; this.t = 0; this.want = 0; this.flashes = []; this.gas = !!o.gas;
      this.water = [];
      for (let i = 0; i < o.nWater; i++) this.water.push({ x: 0, y: 0, vx: 0, vy: 0, a: Math.random() * TAU, f: 0.8 + Math.random() * 0.4 });
      this.sol = [];
      this.sites = [];
      this.layout();
      this.scatterWater();
    }
    layout() {
      const B = this.box, R = this.Rs, d = R * 2.08, rh = d * 0.88;
      const cx = (B.x0 + B.x1) / 2, base = Math.max(4, Math.min(9, Math.floor((B.x1 - B.x0) / d) - 2));
      this.sites = [];
      for (let r = 0; r < 12; r++) {
        const cnt = Math.max(3, base - r), y = B.y1 - R - r * rh;
        for (let c = 0; c < cnt; c++) this.sites.push({ x: cx + (c - (cnt - 1) / 2) * d, y, occ: -1, row: r });
      }
      // 아래 줄부터, 가운데에서 바깥쪽 순서로 채워요
      this.sites.sort((a, b) => b.y - a.y || Math.abs(a.x - cx) - Math.abs(b.x - cx));
    }
    scatterWater() {
      const B = this.box, R = this.Rw;
      this.water.forEach((w) => {
        w.x = B.x0 + R + Math.random() * (B.x1 - B.x0 - 2 * R); w.y = B.y0 + R + Math.random() * (B.y1 - B.y0 - 2 * R - 20);
        const a = Math.random() * TAU; w.vx = Math.cos(a) * 26; w.vy = Math.sin(a) * 26;
      });
    }
    get nFree() { let n = 0; for (const q of this.sol) if (q.st === 'free') n++; return n; }
    get nCrystal() { let n = 0; for (const q of this.sol) if (q.st === 'crystal' || q.st === 'attach' || q.st === 'drop') n++; return n; }
    get nGone() { let n = 0; for (const q of this.sol) if (q.st === 'escape') n++; return n; }
    get total() { return this.sol.length; }
    clearSolute() { this.sol.length = 0; this.sites.forEach((s) => (s.occ = -1)); this.want = 0; }
    /* 위에서 n개의 용질 알갱이를 떨어뜨림 */
    drop(n) {
      const B = this.box, cx = (B.x0 + B.x1) / 2;
      for (let i = 0; i < n; i++) {
        this.sol.push({ x: cx + (Math.random() - 0.5) * 70, y: B.y0 + 2, vx: 0, vy: 40 + Math.random() * 30, st: 'drop', site: -1, f: 0.8 + Math.random() * 0.4, a: Math.random() * TAU, fl: 0, wait: i * 0.16 });
      }
    }
    /* 이미 결정으로 놓인 용질 n개 (장면을 불러올 때) */
    seedCrystal(n) {
      for (let i = 0; i < n; i++) {
        const si = this.freeSite(); if (si < 0) break;
        const s = this.sites[si];
        const q = { x: s.x, y: s.y, vx: 0, vy: 0, st: 'crystal', site: si, f: 1, a: 0, fl: 0 };
        s.occ = this.sol.length; this.sol.push(q);
      }
    }
    seedFree(n) {
      const B = this.box;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        this.sol.push({ x: B.x0 + 20 + Math.random() * (B.x1 - B.x0 - 40), y: B.y0 + 20 + Math.random() * (B.y1 - B.y0 - 70), vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, st: 'free', site: -1, f: 0.8 + Math.random() * 0.4, a: 0, fl: 0 });
      }
    }
    freeSite() { for (let i = 0; i < this.sites.length; i++) if (this.sites[i].occ < 0) return i; return -1; }
    topCrystal() {
      let best = -1, by = 1e9;
      this.sol.forEach((q, i) => { if (q.st === 'crystal' && q.y < by + Math.random() * 6) { by = q.y; best = i; } });
      return best;
    }
    release(i) {
      const q = this.sol[i];
      if (q.site >= 0) { this.sites[q.site].occ = -1; q.site = -1; }
      q.st = 'free';
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 50 + Math.random() * 40;
      q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v; q.fl = 1;
      this.flashes.push({ x: q.x, y: q.y, t: 0, c: this.scol });
    }
    capture(i) {
      const si = this.freeSite(); if (si < 0) return false;
      const q = this.sol[i], s = this.sites[si];
      q.st = 'attach'; q.site = si; s.occ = i; q.fl = 1;
      return true;
    }
    nearestFreeToBed() {
      let best = -1, bd = 1e12;
      const si = this.freeSite(); if (si < 0) return -1;
      const s = this.sites[si];
      this.sol.forEach((q, i) => { if (q.st !== 'free') return; const d = (q.x - s.x) ** 2 + (q.y - s.y) ** 2; if (d < bd) { bd = d; best = i; } });
      return best;
    }
    step(dt) {
      if (!(dt > 0)) return;
      this.t += dt; this.gap -= dt;
      const B = this.box, Rw = this.Rw, Rs = this.Rs;
      // 기체 모드: 용질 입자가 액체에서 빠져나가요 (기포) / 다시 녹아 들어와요
      if (this.gas) {
        if (this.gap <= 0) {
          const nf = this.nFree;
          if (nf > this.want) {
            const cand = this.sol.filter((q) => q.st === 'free');
            const q = cand[Math.floor(Math.random() * cand.length)];
            if (q) { q.st = 'escape'; q.vy = -40; q.vx = (Math.random() - 0.5) * 30; q.al = 1; q.fl = 0.6; this.gap = 0.05; }
          } else if (nf < this.want) {
            this.seedFree(1); const q = this.sol[this.sol.length - 1]; q.y = B.y0 + 14 + Math.random() * 30; q.fl = 1; this.gap = 0.12;
          }
        }
      } else
      // 목표: 자유 입자 수 = want
      if (this.gap <= 0) {
        let nf = 0, settledCrystals = 0;
        for (const q of this.sol) { if (q.st === 'free') nf++; else if (q.st === 'crystal') settledCrystals++; }
        if (nf < this.want && settledCrystals > 0) { const i = this.topCrystal(); if (i >= 0) { this.release(i); this.gap = 0.1; } }
        else if (nf > this.want) { const i = this.nearestFreeToBed(); if (i >= 0 && this.capture(i)) this.gap = 0.12; }
      }
      const sub = Math.max(1, Math.ceil(dt / 0.012)), h = dt / sub;
      for (let s = 0; s < sub; s++) {
        // 물 입자: 부딪히며 돌아다녀요
        for (const w of this.water) {
          w.a += (Math.random() - 0.5) * 6 * Math.sqrt(h);
          const sp = Math.hypot(w.vx, w.vy) || 1, tg = 30 * w.f, k = 1 + (tg / sp - 1) * Math.min(1, h * 3);
          w.vx = w.vx * k + Math.cos(w.a) * 40 * h; w.vy = w.vy * k + Math.sin(w.a) * 40 * h;
          w.x += w.vx * h; w.y += w.vy * h;
          if (w.x < B.x0 + Rw) { w.x = B.x0 + Rw; w.vx = Math.abs(w.vx); } if (w.x > B.x1 - Rw) { w.x = B.x1 - Rw; w.vx = -Math.abs(w.vx); }
          if (w.y < B.y0 + Rw) { w.y = B.y0 + Rw; w.vy = Math.abs(w.vy); } if (w.y > B.y1 - Rw) { w.y = B.y1 - Rw; w.vy = -Math.abs(w.vy); }
        }
        // 용질 입자
        for (const q of this.sol) {
          if (q.st === 'drop') {
            if (q.wait > 0) { q.wait -= h; continue; }
            q.vy += 420 * h; q.y += q.vy * h; q.x += q.vx * h;
            // 바닥의 결정 더미에 닿으면 결정이 돼요
            const si = this.freeSite();
            const tgt = si >= 0 ? this.sites[si] : { x: q.x, y: B.y1 - Rs, occ: -1 };
            if (q.y >= tgt.y - 6 || q.y >= B.y1 - Rs) { if (si >= 0) { q.st = 'attach'; q.site = si; tgt.occ = this.sol.indexOf(q); q.rate = 14; } else { q.st = 'free'; q.vx = (Math.random() - 0.5) * 40; } q.vy = 0; }
          } else if (q.st === 'crystal') {
            const S = this.sites[q.site];
            q.x += (S.x + Math.sin(this.t * 14 + q.site) * 0.9 - q.x) * Math.min(1, h * 12);
            q.y += (S.y + Math.cos(this.t * 12 + q.site * 1.7) * 0.9 - q.y) * Math.min(1, h * 12);
          } else if (q.st === 'escape') {
            q.vy -= 90 * h; q.x += q.vx * h + Math.sin(this.t * 6 + q.f * 9) * 10 * h; q.y += q.vy * h; q.al -= h * 0.35;
            if (q.y < B.y0 - 6 || q.al <= 0) q.dead = true;
          } else if (q.st === 'attach') {
            const S = this.sites[q.site];
            const rt = q.rate || 5;
            q.x += (S.x - q.x) * Math.min(1, h * rt); q.y += (S.y - q.y) * Math.min(1, h * rt);
            if (Math.hypot(S.x - q.x, S.y - q.y) < 1.2) { q.st = 'crystal'; if (rt < 10) this.flashes.push({ x: q.x, y: q.y, t: 0, c: '#ffffff' }); }
          } else {                                                     // 녹아서 자유롭게
            const sp = Math.hypot(q.vx, q.vy) || 1, tg = 34 * q.f, k = 1 + (tg / sp - 1) * Math.min(1, h * 3);
            const ang = (Math.random() - 0.5) * 6 * Math.sqrt(h), c = Math.cos(ang), sn = Math.sin(ang), vx = q.vx * c - q.vy * sn;
            q.vy = q.vx * sn + q.vy * c; q.vx = vx;
            q.vx *= k; q.vy *= k; q.x += q.vx * h; q.y += q.vy * h;
            if (q.x < B.x0 + Rs) { q.x = B.x0 + Rs; q.vx = Math.abs(q.vx); } if (q.x > B.x1 - Rs) { q.x = B.x1 - Rs; q.vx = -Math.abs(q.vx); }
            if (q.y < B.y0 + Rs) { q.y = B.y0 + Rs; q.vy = Math.abs(q.vy); } if (q.y > B.y1 - Rs) { q.y = B.y1 - Rs; q.vy = -Math.abs(q.vy); }
          }
        }
        // 부드러운 밀어내기 (겹치지 않게)
        const all = this.water, n = all.length, ns = this.sol.length;
        for (let i = 0; i < n; i++) {
          const a = all[i];
          for (let j = i + 1; j < n; j++) { const b = all[j]; const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, m = Rw * 1.95; if (d2 < m * m && d2 > 1e-6) { const d = Math.sqrt(d2), f = (m - d) * 14 * h / d; a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f; } }
          for (let j = 0; j < ns; j++) {
            const b = this.sol[j]; if (b.st === 'crystal' || b.st === 'attach' || b.st === 'drop') { const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, m = (Rw + Rs) * 1.02; if (d2 < m * m && d2 > 1e-6) { const d = Math.sqrt(d2), f = (m - d) * 30 * h / d; a.vx -= dx * f; a.vy -= dy * f; } continue; }
            const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, m = (Rw + Rs) * 0.98;
            if (d2 < m * m && d2 > 1e-6) { const d = Math.sqrt(d2), f = (m - d) * 14 * h / d; a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f; }
          }
        }
        for (let i = 0; i < ns; i++) {
          const a = this.sol[i]; if (a.st !== 'free') continue;
          for (let j = i + 1; j < ns; j++) { const b = this.sol[j]; if (b.st !== 'free') continue; const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, m = Rs * 2.0; if (d2 < m * m && d2 > 1e-6) { const d = Math.sqrt(d2), f = (m - d) * 14 * h / d; a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f; } }
        }
      }
      for (const q of this.sol) if (q.fl > 0) q.fl = Math.max(0, q.fl - dt * 1.5);
      if (this.sol.some((q) => q.dead)) this.sol = this.sol.filter((q) => !q.dead);
      for (let i = this.flashes.length - 1; i >= 0; i--) { this.flashes[i].t += dt; if (this.flashes[i].t > 0.6) this.flashes.splice(i, 1); }
    }
    draw(c) {
      const wsp = sprite(this.wcol, this.Rw), ssp = sprite(this.scol, this.Rs);
      for (const w of this.water) c.drawImage(wsp.c, w.x - wsp.half, w.y - wsp.half, wsp.half * 2, wsp.half * 2);
      for (const q of this.sol) {
        if (q.wait > 0) continue;
        if (q.fl > 0) { c.globalAlpha = q.fl * 0.9; c.strokeStyle = this.scol; c.lineWidth = 2.5; c.beginPath(); c.arc(q.x, q.y, this.Rs + 2 + (1 - q.fl) * 9, 0, TAU); c.stroke(); c.globalAlpha = 1; }
        if (q.st === 'escape') c.globalAlpha = clamp(q.al, 0, 1);
        c.drawImage(ssp.c, q.x - ssp.half, q.y - ssp.half, ssp.half * 2, ssp.half * 2);
        if (q.st === 'escape') { c.globalAlpha = 1; c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; c.beginPath(); c.arc(q.x, q.y, this.Rs + 3, 0, TAU); c.stroke(); }
      }
      for (const f of this.flashes) { c.globalAlpha = (1 - f.t / 0.6) * 0.7; c.strokeStyle = f.c; c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, this.Rs + f.t * 22, 0, TAU); c.stroke(); }
      c.globalAlpha = 1;
    }
  }

  /* =========================================================
     입자 모형 창 (🔍) — 장면마다 크기가 달라서 따로 만들어 둬요
     ========================================================= */
  const lensBoxOf = (r) => ({ x0: r.x + 10, y0: r.y + 46, x1: r.x + r.w - 10, y1: r.y + r.h - 14 });
  const LENS = {
    dissolve: new SolnBox({ box: lensBoxOf(LAY.top), nWater: PHONE ? 22 : 54, Rw: PHONE ? 5.8 : 7, Rs: PHONE ? 7.6 : 9.2, wcol: '#84c7ff', scol: SOL.NaCl.pcol }),
    cool: new SolnBox({ box: lensBoxOf(LAY.bot), nWater: PHONE ? 16 : 30, Rw: PHONE ? 5.6 : 6.6, Rs: PHONE ? 7.2 : 8.6, wcol: '#84c7ff', scol: SOL.KNO3.pcol }),
  };
  const G_PER = { dissolve: 5 / 3, cool: 5 };               // 입자 1개가 나타내는 g 수

  /* =========================================================
     실험대 상태: 물 100 g이 든 비커에 용질을 넣어요
     ========================================================= */
  const LABS = {
    sub: 'NaCl', T: 20, Tset: 20, added: 0, diss: 0, rate: 3.2,
    busy: null, mode: 'dissolve',
    spoon: { x: 0, y: 0, rot: 0.8, load: 0 },
    rod: { on: false, k: 0, t: 0 },
    grains: [], ripple: { x: LB.beaker.cx, a: 0 },
    result: null, pts: [], resultPop: 0,
    cmass: 0, cshow: 0, ctarget: 0, crystals: [], satFlash: 0, odo: new Odo(0), stir: 0, ptsLine: 0,
    waitT: false, coolFrom: 80, dissolvedStep: 0, fresh: 0,
  };
  LABS.odo.jump(20);
  const satNow = () => solubility(LABS.sub, LABS.T);
  const solidLeft = () => Math.max(0, LABS.added - LABS.diss);
  const isSaturated = () => LABS.mode === 'dissolve' && LABS.added - satNow() > 0.4 && Math.abs(LABS.diss - Math.min(LABS.added, satNow())) < 0.3;
  const homePose = () => { const J = LB.jar; return { x: J.cx + 12, y: J.bot - J.h - 4, rot: 0.8 }; };

  function labFresh(T, sub) {                              // 새 물 100 g으로 바꿔요
    const L = LABS;
    L.added = 0; L.diss = 0; L.result = null; L.grains.length = 0; L.cmass = 0; L.cshow = 0; L.ctarget = 0; L.crystals.length = 0; L.satFlash = 0; L.fresh = 1;
    if (T != null) { L.Tset = T; }
    if (sub) L.sub = sub;
    const P = homePose(); Object.assign(L.spoon, { x: P.x, y: P.y, rot: P.rot, load: 0 });
    LENS.dissolve.clearSolute(); LENS.cool.clearSolute();
    LENS.dissolve.scol = LENS.cool.scol = SOL[L.sub].pcol;
  }
  /* ③ 석출 실험의 시작 상태: 80 °C 물 100 g에 질산 칼륨 169 g이 모두 녹아 있어요 */
  function labCoolSetup() {
    const L = LABS;
    sqCancel(); L.busy = null; L.mode = 'cool'; L.sub = 'KNO3';
    labFresh(80, 'KNO3');
    L.T = 80; L.Tset = 80; L.added = 169; L.diss = 169; L.coolFrom = 80; L.odo.jump(80);
    LENS.cool.scol = SOL.KNO3.pcol; LENS.cool.clearSolute(); LENS.cool.seedFree(Math.round(169 / G_PER.cool)); LENS.cool.want = Math.round(169 / G_PER.cool);
    const s = $('#coolR'); if (s) { s.value = 80; s.dispatchEvent(new Event('input')); }
  }
  function labDissolveSetup() {
    const L = LABS;
    sqCancel(); L.busy = null; L.mode = 'dissolve'; L.sub = 'NaCl'; satCelebrated = false;
    labFresh(20, 'NaCl'); L.T = 20; L.odo.jump(20);
  }
  function labMeasureSetup(sub) {
    const L = LABS;
    sqCancel(); L.busy = null; L.mode = 'measure';
    const t0 = +$('#tempR').value;
    labFresh(TEMPS.indexOf(t0) >= 0 ? t0 : 20, sub || L.sub);
    L.T = L.Tset; L.odo.jump(L.T);
  }

  /* 퀴즈 그림용: 20 °C 물 100 g에 소금 g만큼 모두 녹은 상태 */
  function setDissolveState(g) {
    const L = LABS;
    sqCancel(); L.busy = null; L.mode = 'dissolve'; L.sub = 'NaCl';
    labFresh(20, 'NaCl'); L.T = 20; L.odo.jump(20); L.added = g; L.diss = g; L.fresh = 0;
    LENS.dissolve.seedFree(Math.round(g / G_PER.dissolve)); LENS.dissolve.want = Math.round(g / G_PER.dissolve);
    refreshReadouts(); refreshUI();
  }

  /* ---------- 숟가락으로 퍼서 비커에 붓기 ---------- */
  function pourGrains(n, from) {
    const B = LB.beaker;
    for (let i = 0; i < n; i++) {
      LABS.grains.push({ x: from.x + (Math.random() - 0.5) * 8, y: from.y + Math.random() * 4, vx: (Math.random() - 0.3) * 18, vy: 30 + Math.random() * 50, r: 1.3 + Math.random() * 1.7, a: 1, st: 'air', rot: Math.random() * 6 });
    }
  }
  function scoop(grams, done, fast) {
    const L = LABS, sp = L.spoon, J = LB.jar, B = LB.beaker, h0 = homePose(), k = fast ? 0.7 : 1;
    const dip = { x: J.cx + 4, y: J.bot - J.h + 16, rot: 0.22 };
    const above = { x: B.cx + 16, y: B.top - (PHONE ? 20 : 34), rot: 0.1 };
    let poured = false;
    seq([
      (n) => { tw(sp, { x: dip.x, y: dip.y, rot: dip.rot }, 0.3 * k, 'inOutCubic', n); },
      (n) => { Sound.tick(); tw(sp, { load: 1 }, 0.2 * k, 'outCubic'); after(0.22 * k, n); },
      (n) => { arcTo(sp, above.x, above.y, 0.5 * k, null, 54); tw(sp, { rot: above.rot }, 0.5 * k, 'inOutCubic'); after(0.52 * k, n); },
      (n) => {
        L.rod.on = true;
        const dur = 0.62 * k;
        run(dur, (e) => {
          sp.rot = lerp(above.rot, 1.12, smooth(seg(e, 0, 0.55)));
          sp.load = 1 - smooth(seg(e, 0.2, 1));
          if (e > 0.2 && e < 0.95 && !RM) pourGrains(Math.max(1, Math.round(5 * (fast ? 1.4 : 1))), { x: sp.x + Math.cos(sp.rot) * 22, y: sp.y + Math.sin(sp.rot) * 22 });
          if (!poured && e > 0.45) { poured = true; L.added += grams; L.ripple.x = sp.x + 20; L.ripple.a = 4; Sound.click(); if (L.mode === 'dissolve') LENS.dissolve.drop(Math.max(1, Math.round(grams / G_PER.dissolve))); }
        }, n, 'linear');
      },
      (n) => { tw(sp, { rot: h0.rot }, 0.4 * k, 'inOutCubic'); arcTo(sp, h0.x, h0.y, 0.5 * k, null, 40); after(0.5 * k, n); },
      () => { sp.load = 0; if (done) done(); },
    ]);
  }
  /* ① 한 숟가락(5 g)을 넣고 저어요 */
  function addSpoon() {
    const L = LABS;
    if (L.busy || L.mode !== 'dissolve') return false;
    if (L.added >= 60) { showHint('소금이 너무 많이 쌓였어요. ↺를 눌러 새 물로 다시 해 봐요.', 2800); return false; }
    L.busy = 'add'; hideHint();
    scoop(5, () => {
      L.rod.on = true;
      after(1.8, () => { L.rod.on = false; L.busy = null; refreshReadouts(); refreshUI(); if (isSaturatedSoon()) satCelebrate(); });
    });
    return true;
  }
  const isSaturatedSoon = () => LABS.added - satNow() > 0.4;
  let satCelebrated = false;
  function satCelebrate() {
    if (satCelebrated) return;
    satCelebrated = true;
    LABS.satFlash = 1; Sound.success();
    const B = LB.beaker; celebrate(B.cx, B.top + 60);
  }

  /* ② 용해도 재기: 새 물 → 온도 맞추기 → 녹을 때까지 넣기 → 최대로 녹은 양 읽기 */
  function startMeasure() {
    const L = LABS;
    if (L.busy || L.mode !== 'measure') return false;
    const sub = L.sub, T = clamp(+$('#tempR').value, 0, 80);
    L.busy = 'measure'; hideHint();
    labFresh(T, sub);
    const S = solAt(sub, T), extra = Math.max(5, S * 0.12), total = S + extra, N = 5, per = total / N;
    seq([
      (n) => { const chk = () => { if (Math.abs(L.T - T) < 0.8) n(); else after(0.1, chk); }; L.rate = 60; chk(); },
      (n) => { after(0.25, n); },
      (n) => { let i = 0; const go = () => { if (i++ < N) scoop(per, go, true); else n(); }; go(); },
      (n) => { L.rod.on = true; const chk = () => { if (Math.abs(L.diss - Math.min(L.added, S)) < 0.25) n(); else after(0.1, chk); }; chk(); },
      (n) => { after(0.9, () => { L.rod.on = false; n(); }); },
      (n) => {
        L.result = { sub, T, g: S }; L.resultPop = 1; L.satFlash = 1;
        const old = L.pts.findIndex((q) => q.sub === sub && q.T === T);
        const pt = { sub, T, g: S, pop: 1 };
        if (old >= 0) L.pts[old] = pt; else L.pts.push(pt);
        L.ptsLine = 0;
        Sound.success(); refreshReadouts(); n();
      },
      () => { L.busy = null; L.rate = 3.2; refreshUI(); },
    ]);
    refreshUI();
    return true;
  }

  /* ③ 식히기: 온도를 20 °C까지 천천히 내려요 */
  function startCool() {
    const L = LABS;
    if (L.busy || L.mode !== 'cool') return false;
    const from = L.Tset;
    if (from <= 20.05) { L.Tset = 80; L.T = 80; L.diss = 169; L.cmass = 0; L.cshow = 0; L.crystals.length = 0; LENS.cool.clearSolute(); LENS.cool.seedFree(34); }
    const T0 = L.Tset;
    L.busy = 'cool'; hideHint(); refreshUI();
    run(Math.max(1.2, (T0 - 20) / 9), (e) => { L.Tset = lerp(T0, 20, e); const s = $('#coolR'); if (s) { s.value = L.Tset; s.dispatchEvent(new Event('input')); } }, () => { L.Tset = 20; L.busy = null; refreshUI(); refreshReadouts(); }, 'inOutSine');
    return true;
  }

  /* ---------- 갱신 ---------- */
  function updateLab(dt) {
    const L = LABS;
    const rateT = L.mode === 'cool' ? 9 : 2.4;
    L.T = SciSim.approach(L.T, L.Tset, dt, rateT);
    if (Math.abs(L.T - L.Tset) < 0.04) L.T = L.Tset;
    L.odo.set(L.T); L.odo.update(dt);
    L.ripple.a *= Math.exp(-2.6 * dt);
    L.fresh = Math.max(0, L.fresh - dt * 2.2);
    L.satFlash = Math.max(0, L.satFlash - dt * 0.7);
    L.resultPop = Math.max(0, L.resultPop - dt * 1.2);
    L.ptsLine = Math.min(1, L.ptsLine + dt * 0.9);
    L.pts.forEach((q) => { q.pop = Math.max(0, q.pop - dt * 1.2); });
    L.rod.k = SciSim.approach(L.rod.k, L.rod.on ? 1 : 0, dt, 7);
    if (L.rod.k > 0.02) L.rod.t += dt * (3.4 + 1.5 * L.rod.k);
    L.stir = L.rod.k;
    // 녹는 양
    if (L.mode === 'cool') {
      const S = Math.min(169, satNow());
      L.diss = S; L.added = 169;
      const target = Math.max(0, 169 - S);
      L.cmass = target;                                           // 숫자는 곡선에서 읽는 값 그대로
      const was = L.cshow;
      L.cshow = SciSim.approach(L.cshow, target, dt, 2.6);       // 바닥의 결정 더미는 조금 늦게 쌓여요
      if (Math.abs(L.cshow - target) < 0.05) L.cshow = target;
      const gain = L.cshow - was;
      if (gain > 0) {
        L._cs = (L._cs || 0) + gain;
        while (L._cs > 3.4) { L._cs -= 3.4; spawnCrystal(); }
      }
      LENS.cool.want = Math.round(S / G_PER.cool);
    } else {
      const S = satNow(), tgt = Math.min(L.added, S);
      if (L.diss < tgt) L.diss = Math.min(tgt, L.diss + L.rate * (0.45 + 0.55 * L.rod.k) * dt);
      else if (L.diss > tgt) L.diss = Math.max(tgt, L.diss - 12 * dt);
      if (L.mode === 'dissolve') LENS.dissolve.want = Math.round(L.diss / G_PER.dissolve);
    }
    updateGrains(dt);
    // 김 · 얼음 반짝임
    if (!RM && L.T > 55 && Math.random() < dt * (L.T - 50) * 0.35) {
      const B = LB.beaker;
      FX.emit({ x: B.cx + (Math.random() - 0.5) * B.w * 0.6, y: LB.water0 - 4, vx: (Math.random() - 0.5) * 8, vy: -rand(16, 30), life: rand(1.1, 1.8), size: rand(6, 11), color: 'rgba(255,255,255,.55)', shape: 'smoke', grow: 9, fade: true });
    }
    LENS.dissolve.step(dt); LENS.cool.step(dt);
  }
  function spawnCrystal() {
    const B = LB.beaker, L = LABS;
    L.crystals.push({ x: B.cx + (Math.random() - 0.5) * (B.w - 50), y: LB.water0 + 18 + Math.random() * (B.bot - LB.water0 - 60), s: 0, sT: rand(5, 9), vy: rand(10, 22), rot: rand(-0.8, 0.8), vr: rand(-0.4, 0.4), life: 0 });
  }
  function updateGrains(dt) {
    const L = LABS, W = LB.water0, bot = LB.beaker.bot - 6;
    for (let i = L.grains.length - 1; i >= 0; i--) {
      const g = L.grains[i];
      if (g.st === 'air') {
        g.vy += 480 * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.rot += dt * 5;
        if (g.y >= W) { g.st = 'water'; g.vx *= 0.3; g.vy *= 0.35; if (!RM && Math.random() < 0.3) FX.emit({ x: g.x, y: W, vx: rand(-20, 20), vy: -rand(20, 60), life: 0.35, size: 1.6, color: '#dff1ff', gravity: 500, fade: true }); }
      } else {
        g.vy *= Math.exp(-3 * dt); g.vy += 22 * dt; g.y += g.vy * dt; g.x += Math.sin(g.y * 0.2 + i) * 6 * dt;
        g.a -= dt * (L.mode === 'dissolve' ? 1.1 : 1.8);
        if (g.y > bot) g.a -= dt * 3;
      }
      if (g.a <= 0) L.grains.splice(i, 1);
    }
    for (let i = L.crystals.length - 1; i >= 0; i--) {
      const c = L.crystals[i];
      c.life += dt; c.s = SciSim.approach(c.s, c.sT, dt, 2.6);
      c.y += c.vy * dt; c.rot += c.vr * dt;
      const heapTop = LB.beaker.bot - 8 - heapHeight(L.cshow) * 0.92;
      if (c.y > heapTop - 3 || c.life > 6) L.crystals.splice(i, 1);
    }
  }

  /* =========================================================
     실험대 그리기: 소금병 · 숟가락 · 비커 · 저음막대 · 가열판 · 온도계
     ========================================================= */
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const heapWidth = (m) => Math.min(LB.beaker.w - 26, 30 + 12.5 * Math.sqrt(Math.max(0, m)));
  const heapHeight = (m) => (m < 0.05 ? 0 : heapWidth(m) * 0.3);

  /* 바닥에 쌓인 용질 (녹지 않은 알갱이 / 석출된 결정) */
  function drawHeap(cx, bot, mass, kind, t, a) {
    if (mass < 0.05) return;
    const W = heapWidth(mass), H = heapHeight(mass), n = Math.round(clamp(mass * 0.9 + 8, 8, 150));
    ctx.save();
    if (a != null) ctx.globalAlpha = a;
    // 더미의 윤곽 (가운데가 높은 언덕)
    const g = ctx.createLinearGradient(0, bot - H, 0, bot);
    g.addColorStop(0, kind === 'KNO3' ? 'rgba(250,252,255,.97)' : 'rgba(247,249,252,.98)'); g.addColorStop(1, 'rgba(200,212,228,.98)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(cx - W / 2, bot);
    ctx.bezierCurveTo(cx - W * 0.36, bot - H * 0.12, cx - W * 0.2, bot - H, cx, bot - H);
    ctx.bezierCurveTo(cx + W * 0.2, bot - H, cx + W * 0.36, bot - H * 0.12, cx + W / 2, bot);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(140,160,190,.55)'; ctx.lineWidth = 1.2; ctx.stroke();
    // 알갱이 · 결정 (한 번에 그려요)
    const shape = kind === 'KNO3' ? [[-1.6, 0], [-1.1, -0.55], [1.1, -0.55], [1.6, 0], [1.1, 0.55], [-1.1, 0.55]] : [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]];
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const u = hash(i + 1), v = hash(i * 3 + 7), hh = Math.pow(v, 0.8) * 0.86;
      const x = cx + (u - 0.5) * W * (1 - hh * 0.95) * 0.96, y = bot - 3 - hh * H;
      const sz = 2.2 + hash(i * 5 + 2) * 2.4, rot = hash(i * 11 + 4) * 3.1416, co = Math.cos(rot) * sz, si = Math.sin(rot) * sz;
      for (let j = 0; j < shape.length; j++) { const p = shape[j], px = x + p[0] * co - p[1] * si, py = y + p[0] * si + p[1] * co; if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.closePath();
    }
    ctx.fillStyle = 'rgba(255,255,255,.98)'; ctx.fill();
    ctx.strokeStyle = 'rgba(120,145,185,.7)'; ctx.lineWidth = 1; ctx.stroke();
    // 반짝임
    if (!RM) for (let i = 0; i < 3; i++) { const k = (t * 1.3 + i * 0.37) % 1, x = cx + (hash(i * 9 + 1) - 0.5) * W * 0.7, y = bot - 4 - hash(i * 13 + 5) * H * 0.7; if (k < 0.5) D.spark(x, y, 4 + 3 * Math.sin(k * 6.28), t * 2 + i, '#fff'); }
    ctx.restore();
  }

  /* 물 속을 떠다니며 자라는 결정 (석출) */
  function drawCrystalShape(x, y, s, rot, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(-s, 0, s, 0);
    g.addColorStop(0, 'rgba(255,255,255,.98)'); g.addColorStop(0.5, 'rgba(226,240,255,.92)'); g.addColorStop(1, 'rgba(190,212,240,.95)');
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(100,130,175,.8)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(-s * 1.5, 0); ctx.lineTo(-s * 1.05, -s * 0.5); ctx.lineTo(s * 1.05, -s * 0.5); ctx.lineTo(s * 1.5, 0); ctx.lineTo(s * 1.05, s * 0.5); ctx.lineTo(-s * 1.05, s * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(-s * 0.9, -s * 0.2); ctx.lineTo(s * 0.7, -s * 0.2); ctx.stroke();
    ctx.restore();
  }

  function drawBeakerInside(t) {
    const L = LABS, B = LB.beaker;
    // 물이 소용돌이치는 모습
    if (L.stir > 0.03) {
      ctx.save(); ctx.globalAlpha = 0.35 * L.stir; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const rr = 20 + i * 14, a0 = L.rod.t * 1.4 + i * 2.1;
        ctx.beginPath(); ctx.ellipse(B.cx, LB.water0 + 38 + i * 30, rr, 7 + i * 1.5, 0, a0, a0 + 2.2); ctx.stroke();
      }
      ctx.restore();
    }
    // 바닥에 남은 것
    if (L.mode === 'cool') drawHeap(B.cx, B.bot - 4, L.cshow * 0.96, 'KNO3', t);
    else drawHeap(B.cx, B.bot - 4, solidLeft(), L.sub, t);
    // 떠다니는 결정
    L.crystals.forEach((c) => drawCrystalShape(c.x, c.y, c.s * (PHONE ? 0.75 : 1), c.rot, clamp(c.life * 2, 0, 1)));
    // 물에 들어간 알갱이
    L.grains.forEach((g) => { if (g.st === 'water') { ctx.globalAlpha = clamp(g.a, 0, 1); ctx.fillStyle = '#fff'; ctx.fillRect(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2); } });
    ctx.globalAlpha = 1;
  }

  function drawBeaker(t) {
    const L = LABS, B = LB.beaker;
    const warm = clamp((L.T - 25) / 55, 0, 1), cold = clamp((12 - L.T) / 12, 0, 1);
    let wc = mixHex('#8fd0fa', '#ffd7b0', warm * 0.2); wc = mixHex(wc, '#d4f0ff', cold * 0.6);
    const amp = (RM ? 0 : 0.5) + 1.5 * L.stir;
    vessel({
      x0: B.x0 + 3, x1: B.x1 - 3, yTop: B.top, yBot: B.bot - 3, t, amp, iamp: 0, men: 3.4, ripple: L.ripple,
      path: (c) => tubeClosed(c, B.x0 + 3, B.top, B.w - 6, B.h - 3, 14),
      outline: (c) => tubeOpen(c, B.x0, B.top, B.w, B.h, 14, 9),
      layers: [{ y: LB.water0, color: wc, alpha: 0.68 }],
      inside: () => { drawBeakerInside(t); },
    });
    // 눈금 (50 · 100 mL)
    ctx.save(); ctx.strokeStyle = 'rgba(70,90,125,.7)'; ctx.fillStyle = 'rgba(70,90,125,.9)'; ctx.lineWidth = 1.3; ctx.font = D.font(11, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const ys = [0.2, 0.4, 0.6, 0.8].map((k) => B.bot - 8 - (B.h - 14) * k);
    ys.forEach((y, i) => { ctx.beginPath(); ctx.moveTo(B.x0 + 4, y); ctx.lineTo(B.x0 + (i % 2 ? 14 : 24), y); ctx.stroke(); });
    ctx.restore();
  }

  function drawJar(t) {
    const J = LB.jar, L = LABS, x = J.cx - J.w / 2, y = J.bot - J.h;
    contactShadow(J.cx, J.bot + 1, J.w / 2 + 12, 5, 0.8);
    // 병 속 가루
    ctx.save(); ctx.beginPath(); D.roundRect(x + 2, y + 14, J.w - 4, J.h - 16, 12); ctx.clip();
    const sg = ctx.createLinearGradient(0, y + J.h * 0.35, 0, J.bot); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#dbe4f0');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x, y + J.h * 0.42); ctx.quadraticCurveTo(J.cx - J.w * 0.2, y + J.h * 0.34, J.cx, y + J.h * 0.38); ctx.quadraticCurveTo(J.cx + J.w * 0.25, y + J.h * 0.44, x + J.w, y + J.h * 0.4); ctx.lineTo(x + J.w, J.bot); ctx.lineTo(x, J.bot); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 36; i++) { const u = hash(i + 40), v = hash(i * 3 + 11); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(x + 4 + u * (J.w - 8), y + J.h * 0.44 + v * (J.h * 0.5), 2.6, 2.6); }
    ctx.restore();
    // 유리
    const gg = ctx.createLinearGradient(x, 0, x + J.w, 0); gg.addColorStop(0, 'rgba(210,225,245,.55)'); gg.addColorStop(0.35, 'rgba(255,255,255,.25)'); gg.addColorStop(1, 'rgba(180,200,228,.55)');
    ctx.fillStyle = gg; D.roundRect(x, y + 12, J.w, J.h - 12, 14); ctx.fill();
    ctx.fillStyle = gg; D.roundRect(x + 6, y, J.w - 12, 16, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(110,140,185,.95)'; ctx.lineWidth = 2.4; D.roundRect(x, y + 12, J.w, J.h - 12, 14); ctx.stroke(); D.roundRect(x + 6, y, J.w - 12, 16, 5); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 8, y + 26); ctx.lineTo(x + 8, J.bot - 18); ctx.stroke();
    // 이름표
    const sub = SOL[L.sub];
    ctx.fillStyle = 'rgba(255,255,255,.96)'; D.roundRect(x + 5, y + J.h * 0.5, J.w - 10, 34, 6); ctx.fill(); ctx.strokeStyle = 'rgba(120,145,185,.6)'; ctx.lineWidth = 1.2; ctx.stroke();
    text(J.cx, y + J.h * 0.5 + 14, L.sub === 'NaCl' ? '소금' : '질산 칼륨', { size: PHONE ? 11.5 : 13, weight: 800, color: COL.ink });
    text(J.cx, y + J.h * 0.5 + 28, sub.sym, { size: PHONE ? 10.5 : 12, weight: 800, color: sub.color });
  }

  function drawSpoon() {
    const sp = LABS.spoon;
    ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(sp.rot);
    // 손잡이 (왼쪽 위로 길게)
    const hl = PHONE ? 58 : 70;
    const hg = ctx.createLinearGradient(0, -3, 0, 4); hg.addColorStop(0, '#f3f6fb'); hg.addColorStop(1, '#8e9bb0');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(-hl, -2.5); ctx.lineTo(-8, -3.6); ctx.lineTo(-8, 3.6); ctx.lineTo(-hl, 2.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7c8aa2'; ctx.lineWidth = 1; ctx.stroke();
    D.roundRect(-hl - 8, -5, 14, 10, 5); ctx.fillStyle = '#8b5cf6'; ctx.fill();
    // 숟가락 머리 (오목한 타원)
    const bg = ctx.createLinearGradient(0, -8, 0, 12); bg.addColorStop(0, '#fbfdff'); bg.addColorStop(0.5, '#cdd6e4'); bg.addColorStop(1, '#8895ab');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(10, 2, 24, 11, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7c8aa2'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(2, -2, 12, 3.4, -0.1, 0, TAU); ctx.fill();
    // 가루 더미
    if (sp.load > 0.02) {
      const k = sp.load;
      ctx.save(); ctx.translate(10, -1.5);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(140,160,190,.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-19 * k, 3); ctx.quadraticCurveTo(-8 * k, -15 * k, 0, -13 * k); ctx.quadraticCurveTo(10 * k, -14 * k, 19 * k, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(205,218,235,.9)'; ctx.fillRect((hash(i + 3) - 0.5) * 28 * k, -2 - hash(i * 3 + 1) * 10 * k, 2.4, 2.4); }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawRod() {
    const L = LABS, B = LB.beaker, k = L.rod.k;
    if (k < 0.14) return;
    const topX = B.cx + 6, topY = B.top - (PHONE ? 30 : 48);
    const ox = Math.cos(L.rod.t) * 22 * k, oy = Math.sin(L.rod.t) * 4 * k;
    const botX = B.cx + ox, botY = B.bot - 18 + oy;
    const dip = (1 - k) * 80;
    ctx.save(); ctx.globalAlpha = Math.min(1, (k - 0.14) * 2.4); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(120,150,190,.95)'; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(topX, topY - dip); ctx.lineTo(botX, botY - dip); ctx.stroke();
    ctx.strokeStyle = 'rgba(226,240,255,.95)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(topX, topY - dip); ctx.lineTo(botX, botY - dip); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(topX - 1.4, topY - dip); ctx.lineTo(botX - 1.4, botY - dip); ctx.stroke();
    ctx.restore();
  }

  function drawPlate(t) {
    const P = LB.plate, L = LABS, x = P.cx - P.w / 2, heat = clamp((L.T - 24) / 56, 0, 1), cold = clamp((14 - L.T) / 14, 0, 1);
    contactShadow(P.cx, P.y + P.h + 1, P.w / 2 + 12, 6, 0.8);
    softShadow(x, P.y, P.w, P.h, 8, 8, 3, 'rgba(30,50,100,.25)');
    const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); g.addColorStop(0, '#6b7690'); g.addColorStop(0.18, '#4a566e'); g.addColorStop(1, '#2d3548');
    ctx.fillStyle = g; D.roundRect(x, P.y, P.w, P.h, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; D.roundRect(x + 6, P.y + 2, P.w - 12, 3, 2); ctx.fill();
    // 열(붉음) · 냉각(푸름) 빛
    if (heat > 0.02 || cold > 0.02) {
      const col = heat > 0.02 ? '#ff7a3d' : '#5db7ff', a = Math.max(heat, cold);
      ctx.save(); ctx.globalAlpha = 0.35 + 0.35 * a; D.glow(P.cx, P.y + 2, P.w * 0.42, col, 0.8); ctx.restore();
      ctx.fillStyle = rgba(col, 0.55 + 0.4 * a); D.roundRect(x + 14, P.y - 1.5, P.w - 28, 4, 2); ctx.fill();
    }
    // 온도 표시
    const lw = PHONE ? 64 : 76, lh = PHONE ? 15 : 17;
    drawLCD(P.cx + P.w / 2 - lw - 14, P.y + (P.h - lh) / 2 + 2, lw, lh, L.odo, { digits: 3, unit: '°C', unitW: 20 });
    D.sphere(x + 18, P.y + P.h / 2 + 2, 5.2, heat > 0.02 ? '#ff8a3d' : cold > 0.02 ? '#5db7ff' : '#94a3b8', { gloss: true });
    text(P.cx, P.y + P.h + (PHONE ? 15 : 18), '온도 조절판', { size: 12, weight: 800, color: COL.muted });
  }

  function drawThermo(t) {
    const L = LABS, T = LB.therm;
    ctx.save();
    const col = L.T > 45 ? COL.warm : L.T < 8 ? '#3b82f6' : '#e2464b';
    D.thermometer(T.x, T.top, T.tube, clamp(L.T, 0, 100), 0, 100, { ticks: false, color: col });
    ctx.restore();
  }

  function drawGrainsAir() {
    LABS.grains.forEach((g) => { if (g.st === 'air') { ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot); ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(130,150,185,.8)'; ctx.lineWidth = 0.8; ctx.fillRect(-g.r, -g.r, g.r * 2, g.r * 2); ctx.strokeRect(-g.r, -g.r, g.r * 2, g.r * 2); ctx.restore(); } });
  }

  function drawLabBg() {
    const R = LAY.lab;
    panel(R.x, R.y, R.w, R.h, 18, '#fff', 14, 4, 'rgba(30,50,100,.16)');
    ctx.save(); ctx.beginPath(); D.roundRect(R.x, R.y, R.w, R.h, 18); ctx.clip();
    vgrad(ctx, R.x, R.y, R.w, LB.table - R.y, '#fbfdff', '#e9f0fa');
    const lg = ctx.createLinearGradient(R.x, R.y, R.x + R.w * 0.7, R.y + R.h * 0.8);
    lg.addColorStop(0, 'rgba(255,255,255,.6)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(R.x, R.y); ctx.lineTo(R.x + R.w * 0.6, R.y); ctx.lineTo(R.x + R.w * 0.2, LB.table); ctx.lineTo(R.x, LB.table); ctx.closePath(); ctx.fill();
    vgrad(ctx, R.x, LB.table, R.w, R.y + R.h - LB.table, '#e3e9f3', '#c5d0e2');
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(R.x, LB.table, R.w, 2);
    ctx.fillStyle = 'rgba(40,60,100,.1)'; ctx.fillRect(R.x, LB.table + 2, R.w, 5);
    ctx.restore();
  }

  /* 실험대 전체 */
  function drawLab(t) {
    const L = LABS, B = LB.beaker, R = LAY.lab;
    drawLabBg();
    drawJar(t);
    drawPlate(t);
    contactShadow(B.cx, B.bot + 1, B.w / 2 + 6, 4, 0.7);
    drawBeaker(t);
    drawThermo(t);
    drawGrainsAir();
    drawRod();
    drawSpoon();
    // 이름표들
    const sub = SOL[L.sub];
    const lx = R.x + 14, ly = R.y + 26;
    pill(lx, ly, '💧 물 100 g', { bg: '#1e3a8a', size: PHONE ? 13 : 14, align: 'left', pad: 9 });
    pill(lx + (PHONE ? 100 : 106), ly, '🌡️ ' + Math.round(L.T) + ' °C', { bg: L.T > 45 ? COL.warm : L.T < 8 ? '#2563eb' : '#64748b', size: PHONE ? 13 : 14, align: 'left', pad: 9 });
    // 상태 말풍선
    let msg = null, col = '#64748b';
    if (L.mode === 'dissolve') {
      if (L.added > 0.01 && !L.busy) { if (L.added - satNow() > 0.4) { msg = '포화 용액: 더 이상 녹지 않아요'; col = '#6d28d9'; } else { msg = '불포화 용액: 더 녹을 수 있어요'; col = COL.good; } }
    } else if (L.mode === 'measure') {
      if (L.result && !L.busy) { msg = sub.name + ' ' + gStr(L.result.g) + ' g까지 녹았어요 (' + L.result.T + ' °C)'; col = '#6d28d9'; }
      else if (L.busy === 'measure') { msg = L.added > 0 ? '넣은 양 ' + gStr(Math.round(L.added * 10) / 10) + ' g' : '온도를 맞추는 중…'; col = '#64748b'; }
    } else if (L.mode === 'cool') {
      if (L.cmass > 0.6) { msg = '결정 ' + gStr(Math.round(L.cmass * 10) / 10) + ' g이 나왔어요'; col = '#6d28d9'; }
      else if (Math.abs(L.Tset - 80) < 0.5) { msg = '80 °C 포화 용액 (169 g 용해)'; col = '#64748b'; }
    }
    if (msg) pill(lx, ly + 34, msg, { bg: col, size: PHONE ? 12.5 : 13.5, align: 'left', pad: 9 });
    if (L.satFlash > 0.02 && L.mode === 'dissolve') { ctx.save(); ctx.globalAlpha = L.satFlash * 0.5; ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 6; D.roundRect(B.x0 - 6, B.top - 6, B.w + 12, B.h + 12, 18); ctx.stroke(); ctx.restore(); }
  }

  /* =========================================================
     입자 모형 창 · 녹은 양 막대 · 용해도 그래프 · 기록표
     ========================================================= */
  function legendRow(xRight, y, items) {
    // items: [{c: 색, t: 글자}] — 오른쪽 끝에 맞춰 그려요
    ctx.save(); ctx.font = D.font(PHONE ? 12 : 13, 800);
    let w = 0; const ws = items.map((q) => { const m = ctx.measureText(q.t).width; w += m + 26; return m; });
    let x = xRight - w + 6;
    items.forEach((q, i) => { drawBall(ctx, q.c, x + 6, y, 6.2); ctx.fillStyle = COL.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(q.t, x + 16, y + 1); x += ws[i] + 26; });
    ctx.restore();
  }
  function drawLens(key, r, soluteName, extra) {
    const b = LENS[key];
    lensFrame(r, { title: '🔍 입자 모형' }, () => { b.draw(ctx); });
    legendRow(r.x + r.w - 12, r.y + 16, [{ c: b.wcol, t: '물 입자' }, { c: b.scol, t: soluteName + ' 입자' }]);
    // 용질 입자 개수 표시
    const nf = b.nFree, nc = b.nCrystal;
    if (b.total > 0 || extra) {
      const msg = extra || ('녹은 입자 ' + nf + '개' + (nc > 0 ? ' · 덩어리 ' + nc + '개' : ''));
      pill(r.x + r.w - 12, r.y + r.h - 22, msg, { bg: nc > 0 ? '#7c6bd6' : '#5b21b6', size: PHONE ? 12.5 : 13.5, align: 'right', pad: 9 });
    }
  }

  /* ---- ① 녹은 양 막대 ---- */
  function drawAmountCard(r) {
    const L = LABS;
    panel(r.x, r.y, r.w, r.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(r.x + 14, r.y + 26, '⚖️ 넣은 소금은 어디에?', { size: PHONE ? 14 : 15, weight: 800, color: COL.ink, align: 'left' });
    const bx = r.x + 16, bw = r.w - 32, by = r.y + (PHONE ? 44 : 62), bh = PHONE ? 26 : 34, MAX = 50;
    const X = (g) => bx + bw * clamp(g / MAX, 0, 1);
    // 눈금 바탕
    ctx.fillStyle = '#eef2f8'; D.roundRect(bx, by, bw, bh, bh / 2); ctx.fill();
    ctx.save(); ctx.beginPath(); D.roundRect(bx, by, bw, bh, bh / 2); ctx.clip();
    const d = L.diss, u = solidLeft();
    const gA = ctx.createLinearGradient(0, by, 0, by + bh); gA.addColorStop(0, '#7cc4ff'); gA.addColorStop(1, '#3f9df3');
    ctx.fillStyle = gA; ctx.fillRect(bx, by, X(d) - bx, bh);
    const gB = ctx.createLinearGradient(0, by, 0, by + bh); gB.addColorStop(0, '#e8edf4'); gB.addColorStop(1, '#b8c4d6');
    ctx.fillStyle = gB; ctx.fillRect(X(d), by, X(d + u) - X(d), bh);
    ctx.strokeStyle = 'rgba(120,140,170,.6)'; ctx.lineWidth = 1.2; ctx.strokeRect(X(d), by, X(d + u) - X(d), bh);
    ctx.restore();
    // 눈금
    ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 1.2; ctx.fillStyle = COL.muted; ctx.font = D.font(12, 700); ctx.textAlign = 'center';
    for (let g = 0; g <= MAX; g += 10) { ctx.beginPath(); ctx.moveTo(X(g), by + bh + 2); ctx.lineTo(X(g), by + bh + 8); ctx.stroke(); ctx.fillText(String(g), X(g), by + bh + 22); }
    
    // 용해도 눈금선 (포화가 된 뒤에 나타나요)
    const S = satNow(), show = L.added - S > 0.4;
    if (show) {
      const xs = X(S);
      ctx.save(); ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 2.4; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(xs, by - 12); ctx.lineTo(xs, by + bh + 4); ctx.stroke(); ctx.restore();
      pill(xs, by - 20, '용해도 ' + gStr(S) + ' g', { bg: '#6d28d9', size: 13, pad: 8 });
    }
    // 숫자 (롤링 대신 부드러운 값)
    const ty = by + bh + (PHONE ? 44 : 58);
    const col = (x, c, label, v) => { drawBall(ctx, c, x, ty - 4, 7); text(x + 12, ty, label, { size: PHONE ? 13 : 14, weight: 700, color: COL.ink, align: 'left' }); text(x + 12 + (PHONE ? 58 : 66), ty, f1(v) + ' g', { size: PHONE ? 14 : 16, weight: 800, color: COL.subD, align: 'left' }); };
    col(r.x + 16, '#3f9df3', '녹은 양', d);
    col(r.x + (PHONE ? 160 : 190), '#c3cddc', '남은 양', u);
    // 숟가락 개수
    if (!PHONE) {
      const sy = r.y + r.h - 62;
      text(r.x + 16, sy + 5, '넣은 숟가락', { size: 13.5, weight: 700, color: COL.muted, align: 'left' });
      const n = Math.round(L.added / 5);
      for (let i = 0; i < 10; i++) { const on_ = i < n, x = r.x + 118 + i * 26; ctx.fillStyle = on_ ? '#fff' : '#eef2f8'; ctx.strokeStyle = on_ ? '#8b5cf6' : '#cdd6e4'; ctx.lineWidth = 2; D.roundRect(x, sy - 9, 21, 20, 6); ctx.fill(); ctx.stroke(); if (on_) text(x + 10.5, sy + 6, '5', { size: 12, weight: 800, color: '#6d28d9' }); }
    }
    // 용해도의 뜻 (포화가 된 뒤에 나타나요)
    if (show && !PHONE) pill(r.x + r.w / 2, r.y + r.h - 18, '물 100 g에 최대로 녹는 양 = 용해도', { bg: '#6d28d9', size: 13.5, pad: 11 });
  }

  /* ---- ②③ 용해도 그래프 ---- */
  const GR = { cache: {}, curveP: { KNO3: 0, NaCl: 0 } };
  function graphGeom(r) {
    const P = { x0: r.x + (PHONE ? 46 : 58), y0: r.y + (PHONE ? 54 : 52), x1: r.x + r.w - 16, y1: r.y + r.h - (PHONE ? 30 : 40) };
    return { P, X: (T) => P.x0 + (P.x1 - P.x0) * T / 90, Y: (g) => P.y1 - (P.y1 - P.y0) * clamp(g, 0, 190) / 190 };
  }
  function curvePath(f, T0, T1, X, Y, n) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const T = T0 + (T1 - T0) * i / n; i ? ctx.lineTo(X(T), Y(f(T))) : ctx.moveTo(X(T), Y(f(T))); }
  }
  function ptsFn(sub) {
    const pts = LABS.pts.filter((q) => q.sub === sub).sort((a, b) => a.T - b.T);
    const key = pts.map((q) => q.T + ':' + q.g).join('|');
    const c = GR.cache[sub];
    if (c && c.key === key) return c;
    const f = pts.length >= 3 ? monoCubic(pts.map((q) => [q.T, q.g])) : null;
    return (GR.cache[sub] = { key, pts, f });
  }
  function drawGraph(r, mode) {
    const L = LABS, { P, X, Y } = graphGeom(r);
    panel(r.x, r.y, r.w, r.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(r.x + 14, r.y + 26, PHONE ? '📈 용해도 곡선 (g/물 100 g)' : '📈 용해도 곡선', { size: PHONE ? 13.5 : 15, weight: 800, color: COL.ink, align: 'left' });
    legendRow(r.x + r.w - 12, r.y + (PHONE ? 40 : 24), mode === 'cool' ? [{ c: SOL.KNO3.color, t: '질산 칼륨' }] : [{ c: SOL.KNO3.color, t: '질산 칼륨' }, { c: SOL.NaCl.color, t: '염화 나트륨' }]);
    ctx.save();
    ctx.strokeStyle = 'rgba(120,135,160,.22)'; ctx.lineWidth = 1; ctx.fillStyle = COL.muted; ctx.font = D.font(12.5, 700);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let g = 0; g <= 180; g += 20) { if (PHONE && g % 40) continue; ctx.beginPath(); ctx.moveTo(P.x0, Y(g)); ctx.lineTo(P.x1, Y(g)); ctx.stroke(); ctx.fillText(String(g), P.x0 - 7, Y(g)); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (let T = 0; T <= 80; T += 20) { ctx.beginPath(); ctx.moveTo(X(T), P.y0); ctx.lineTo(X(T), P.y1); ctx.stroke(); ctx.fillText(String(T), X(T), P.y1 + 17); }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.x0, P.y0 - 6); ctx.lineTo(P.x0, P.y1); ctx.lineTo(P.x1 + 4, P.y1); ctx.stroke();
    ctx.restore();
    text(P.x1, P.y1 + 33, '온도 (°C)', { size: 12.5, weight: 800, color: COL.muted, align: 'right' });
    if (!PHONE) text(P.x0 - 4, P.y0 - 12, '용해도 (g/물 100 g)', { size: 12.5, weight: 800, color: COL.muted, align: 'left' });

    if (mode === 'measure') {
      ['NaCl', 'KNO3'].forEach((sub) => {
        const c = ptsFn(sub), col = SOL[sub].color;
        if (c.pts.length >= 2) {
          const k = ease.outCubic(L.ptsLine);
          ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          const T0 = c.pts[0].T, T1 = c.pts[c.pts.length - 1].T, Te = T0 + (T1 - T0) * k;
          const draw = () => { if (c.f) curvePath(c.f, T0, Te, X, Y, 60); else { ctx.beginPath(); c.pts.forEach((q, i) => { const px = X(Math.min(q.T, Te)), py = Y(q.g); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); } };
          ctx.strokeStyle = rgba(col, 0.28); ctx.lineWidth = 11; draw(); ctx.stroke();
          ctx.strokeStyle = col; ctx.lineWidth = 3.6; draw(); ctx.stroke();
          ctx.restore();
        }
      });
      LABS.pts.forEach((q) => {
        const col = SOL[q.sub].color, drop = q.pop > 0 ? -44 * ease.outCubic(q.pop) * q.pop : 0;
        D.sphere(X(q.T), Y(q.g) + drop, 7.5, col, { gloss: true, shadow: true });
        const low = q.sub === 'KNO3' && q.T === 20, first = q.sub === 'KNO3' && q.T === 0, side = q.sub === 'KNO3' && q.T >= 40;
        const lx = X(q.T) + (side ? -11 : first ? 13 : 0), ly = Y(q.g) + drop + (low ? 21 : first ? -9 : -12);
        text(lx, ly, gStr(q.g), { size: 12.5, weight: 800, color: col, align: side ? 'right' : first ? 'left' : 'center', stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
      });
      // 지금 고른 온도 표시
      const Tn = LABS.Tset;
      ctx.save(); ctx.strokeStyle = 'rgba(139,92,246,.45)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(X(Tn), P.y0); ctx.lineTo(X(Tn), P.y1); ctx.stroke(); ctx.restore();
    } else {
      // 질산 칼륨 곡선 (자료)와 식히는 동안의 표시
      const col = SOL.KNO3.color;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      curvePath(SOL.KNO3.f, 0, 80, X, Y, 70); ctx.strokeStyle = rgba(col, 0.28); ctx.lineWidth = 11; ctx.stroke();
      curvePath(SOL.KNO3.f, 0, 80, X, Y, 70); ctx.strokeStyle = col; ctx.lineWidth = 3.6; ctx.stroke();
      ctx.restore();
      const T = LABS.T, S = Math.min(169, solubility('KNO3', T));
      // 처음 녹인 양 (169 g) 기준선
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(P.x0, Y(169)); ctx.lineTo(X(80), Y(169)); ctx.stroke();
      ctx.strokeStyle = 'rgba(47,125,225,.7)'; ctx.beginPath(); ctx.moveTo(P.x0, Y(S)); ctx.lineTo(X(T), Y(S)); ctx.stroke(); ctx.restore();
      text(P.x0 + 8, Y(169) - (PHONE ? 5 : 8), PHONE ? '169 g' : '처음 녹인 양 169 g', { size: PHONE ? 12 : 12.5, weight: 800, color: '#6d28d9', align: 'left' });
      // 석출량 막대
      const gap = 169 - S;
      if (gap > 0.5) {
        ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(139,92,246,.3)'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(X(T), Y(169)); ctx.lineTo(X(T), Y(S)); ctx.stroke();
        ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
      }
      D.sphere(X(80), Y(169), 7, col, { gloss: true });
      D.sphere(X(T), Y(S), 8, '#2f7de1', { gloss: true, shadow: true });
      const lx = clamp(X(T) + 14, P.x0 + 40, P.x1 - 60);
      const ly2 = Y(S) + 22 < P.y1 - 8 ? Y(S) + 22 : Y(S) - 24;
      pill(Math.min(lx + 24, P.x1 - 62), ly2, '녹아 있는 양 ' + f1(S) + ' g', { bg: '#2f7de1', size: 12.5, pad: 8, align: 'center' });
      if (gap > 0.5) pill(clamp(X(T) - 8, P.x0 + 78, P.x1 - 78), (Y(169) + Y(S)) / 2 - (PHONE ? 0 : 0), '석출 ' + f1(gap) + ' g', { bg: '#7c3aed', size: 13.5, pad: 9 });
      // 지금의 온도
      ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X(T), Y(S)); ctx.lineTo(X(T), P.y1); ctx.stroke(); ctx.restore();
    }
  }

  /* ---- ② 측정 기록표 ---- */
  function drawTable(r) {
    const L = LABS;
    panel(r.x, r.y, r.w, r.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(r.x + 14, r.y + 26, '📋 측정 기록표 (g / 물 100 g)', { size: PHONE ? 14 : 15, weight: 800, color: COL.ink, align: 'left' });
    const val = (sub, T) => { const q = L.pts.find((p) => p.sub === sub && p.T === T); return q || null; };
    ctx.save();
    if (!PHONE) {
      const x0 = r.x + 12, w = r.w - 24, y0 = r.y + 40, rh = 30, cw = [w * 0.26, w * 0.37, w * 0.37];
      ctx.fillStyle = '#f3f0ff'; D.roundRect(x0, y0, w, 30, 10); ctx.fill();
      const hs = ['온도', '질산 칼륨', '염화 나트륨'], hc = [COL.subD, SOL.KNO3.color, SOL.NaCl.color];
      let cx = x0; hs.forEach((h, i) => { text(cx + cw[i] / 2, y0 + 20, h, { size: 14, weight: 800, color: hc[i] }); cx += cw[i]; });
      TEMPS.forEach((T, j) => {
        const y = y0 + 34 + j * rh, cur = LABS.Tset === T && L.mode === 'measure';
        if (cur) { ctx.fillStyle = 'rgba(139,92,246,.1)'; D.roundRect(x0, y, w, rh - 2, 8); ctx.fill(); ctx.strokeStyle = 'rgba(139,92,246,.5)'; ctx.lineWidth = 1.6; D.roundRect(x0, y, w, rh - 2, 8); ctx.stroke(); }
        text(x0 + cw[0] / 2, y + 20, T + ' °C', { size: 15, weight: 800, color: COL.ink });
        ['KNO3', 'NaCl'].forEach((sub, i) => {
          const q = val(sub, T), cx2 = x0 + cw[0] + (i ? cw[1] : 0) + cw[i + 1] / 2;
          if (q && q.pop > 0) { ctx.fillStyle = 'rgba(255,200,60,' + 0.55 * q.pop + ')'; D.roundRect(cx2 - cw[i + 1] / 2 + 6, y + 1, cw[i + 1] - 12, rh - 4, 8); ctx.fill(); }
          if (q) { ctx.save(); ctx.translate(cx2, y + 14); const s = 1 + 0.3 * q.pop; ctx.scale(s, s); text(0, 6, gStr(q.g), { size: 16, weight: 800, color: SOL[sub].color }); ctx.restore(); }
          else text(cx2, y + 20, '–', { size: 15, weight: 700, color: '#c3ccd9' });
        });
      });
    } else {
      const x0 = r.x + 10, w = r.w - 20, y0 = r.y + 38, cw0 = 64, cw = (w - cw0) / 5;
      ctx.fillStyle = '#f3f0ff'; D.roundRect(x0, y0, w, 26, 9); ctx.fill();
      text(x0 + cw0 / 2, y0 + 18, '온도', { size: 13, weight: 800, color: COL.subD });
      TEMPS.forEach((T, j) => { const cur = L.Tset === T && L.mode === 'measure'; if (cur) { ctx.fillStyle = 'rgba(139,92,246,.14)'; D.roundRect(x0 + cw0 + j * cw + 1, y0 + 26, cw - 2, 66, 6); ctx.fill(); } text(x0 + cw0 + j * cw + cw / 2, y0 + 18, T + '°', { size: 13.5, weight: 800, color: COL.ink }); });
      ['KNO3', 'NaCl'].forEach((sub, i) => {
        const y = y0 + 30 + i * 32;
        text(x0 + cw0 / 2, y + 20, SOL[sub].sym, { size: 13, weight: 800, color: SOL[sub].color });
        TEMPS.forEach((T, j) => {
          const q = val(sub, T), cx2 = x0 + cw0 + j * cw + cw / 2;
          if (q) { ctx.save(); ctx.translate(cx2, y + 14); const s = 1 + 0.3 * q.pop; ctx.scale(s, s); text(0, 6, gStr(q.g), { size: 14.5, weight: 800, color: SOL[sub].color }); ctx.restore(); } else text(cx2, y + 20, '–', { size: 14, weight: 700, color: '#c3ccd9' });
        });
      });
    }
    ctx.restore();
  }

  /* =========================================================
     ④ 기체의 용해도: 탄산음료 (온도 ↑ · 뚜껑 열기(압력 ↓) → 기포)
     ========================================================= */
  LENS.gas = new SolnBox({ box: lensBoxOf(LAY.top), nWater: PHONE ? 20 : 38, Rw: PHONE ? 5.6 : 6.8, Rs: PHONE ? 7.2 : 8.4, wcol: '#84c7ff', scol: '#64748b', gas: true });
  const GG = PHONE
    ? { k: 0.52, bx: LAY.lab.x + 112, bot: LAY.lab.y + LAY.lab.h - 38, dial: { x: LAY.lab.x + 330, y: LAY.lab.y + 96, r: 44 } }
    : { k: 1, bx: LAY.lab.x + 158, bot: LAY.lab.y + LAY.lab.h - 56, dial: { x: LAY.lab.x + 304, y: LAY.lab.y + 150, r: 52 } };
  const cOfT = (T) => 1 - 0.0171 * (T - 5);                    // 온도 T에서 기체가 녹는 정도 (5 °C = 1, 40 °C = 0.4)
  const GAS = {
    T: 5, Tset: 5, open: false, d: 3, busy: null, cap: new SciSim.Spring(0, { stiffness: 90, damping: 11 }),
    bub: [], foam: 0, hiss: 0, warmed: false, opened: false, Pg: new SciSim.Spring(3, { stiffness: 60, damping: 9 }), over: 0, tmax: 5,
  };
  const dissolvedPct = () => GAS.d / 3;
  function gasSetup() {
    const g = GAS;
    sqCancel(); g.busy = null;
    g.T = 5; g.Tset = 5; g.open = false; g.d = 3; g.bub.length = 0; g.foam = 0; g.hiss = 0; g.warmed = false; g.opened = false; g.tmax = 5;
    g.cap.value = g.cap.target = 0; g.cap.velocity = 0; g.Pg.value = g.Pg.target = 3; g.Pg.velocity = 0;
    const s = $('#gasR'); if (s) { s.value = 5; s.dispatchEvent(new Event('input')); }
    const b = LENS.gas; b.clearSolute(); b.seedFree(30); b.want = 30;
  }
  function toggleCap() {
    const g = GAS;
    if (S.scene !== 'gas') return;
    hideHint(); g.open = !g.open;
    g.cap.target = g.open ? 1 : 0;
    if (g.open) {
      g.opened = true; g.hiss = 1; g.over = 0; Sound.click();
      const gl = gasGeo(); const n = 18;
      if (!RM) for (let i = 0; i < n; i++) FX.emit({ x: gl.neckX + (Math.random() - 0.5) * 20, y: gl.neckY - 6, vx: (Math.random() - 0.5) * 70, vy: -rand(40, 130), life: rand(0.5, 1.0), size: rand(5, 11), color: 'rgba(255,255,255,.7)', shape: 'smoke', grow: 14, fade: true });
    } else { Sound.click(); }
    refreshUI(); refreshReadouts();
  }
  function gasGeo() {
    const k = GG.k;
    return { neckX: GG.bx, neckY: GG.bot - 316 * k, liqY: GG.bot - 284 * k };
  }
  function gasHit(p) {
    const g = gasGeo(), k = GG.k;
    return p.x > GG.bx - 40 * k && p.x < GG.bx + 40 * k && p.y > GG.bot - 346 * k && p.y < GG.bot - 290 * k;
  }

  function updateGas(dt) {
    const g = GAS;
    g.T = SciSim.approach(g.T, g.Tset, dt, 2.2);
    if (Math.abs(g.T - g.Tset) < 0.03) g.T = g.Tset;
    g.tmax = Math.max(g.tmax, g.T);
    if (g.T >= 30) g.warmed = true;
    g.cap.update(dt); g.Pg.update(dt);
    g.hiss = Math.max(0, g.hiss - dt * 0.8);
    g.foam = Math.max(0, g.foam - dt * (g.open ? 0.35 : 1.4));
    // 용해도: 압력이 높을수록, 온도가 낮을수록 커요
    const cap = cOfT(g.T) * (g.open ? 1 : 3);
    const was = g.d;
    if (g.d > cap + 0.001) {
      const rate = (g.open ? 1.15 : 0.9) * (1 + 0.8 * (g.T - 5) / 35);
      g.d -= (g.d - cap) * (1 - Math.exp(-rate * dt));
      const lost = was - g.d;
      g._bs = (g._bs || 0) + lost * (PHONE ? 38 : 64);
      while (g._bs >= 1) { g._bs -= 1; spawnBubble(); }
      g.foam = Math.min(1.6, g.foam + lost * (g.open ? 0.9 : 0.25));
    } else if (!g.open && g.d < cap - 0.001) {
      g.d += (cap - g.d) * (1 - Math.exp(-0.14 * dt));
    }
    g.Pg.target = g.open ? 1 : 3 + (3 - g.d) * 1.0 + (g.T - 5) * 0.01;
    // 기포
    for (let i = g.bub.length - 1; i >= 0; i--) {
      const b = g.bub[i];
      b.y -= b.vy * dt; b.x += Math.sin(CLK.t * 4 + b.ph) * 9 * dt; b.r += dt * 0.5;
      if (b.y < -284 + 6) g.bub.splice(i, 1);
    }
    if (g.bub.length > 220) g.bub.splice(0, g.bub.length - 220);
    // 넘치는 거품
    if (g.open && g.foam > 1.05 && !RM && Math.random() < dt * 30) { const gl = gasGeo(); FX.emit({ x: gl.neckX + (Math.random() - 0.5) * 24, y: gl.neckY + 8, vx: (Math.random() - 0.5) * 60, vy: -rand(30, 90), life: rand(0.5, 0.9), size: rand(2.5, 5), color: '#fff', gravity: 420, fade: true }); }
    LENS.gas.want = Math.round(g.d * 10);
    LENS.gas.step(dt);
  }
  function spawnBubble() {
    const g = GAS, wob = 30 + Math.random() * 18;
    g.bub.push({ x: (Math.random() - 0.5) * 2 * wob, y: -rand(10, 200), r: rand(1.6, 3.8), vy: rand(36, 90), ph: rand(0, 6) });
  }

  /* ---- 그리기 ---- */
  function bottleOutline(c, open) {
    // 지역 좌표 (아래 가운데가 0,0, 위쪽이 −y)
    c.beginPath();
    c.moveTo(-19, -330 + 18);
    c.lineTo(-19, -292);
    c.bezierCurveTo(-19, -272, -52, -270, -52, -226);
    c.lineTo(-52, -16); c.quadraticCurveTo(-52, 0, -36, 0);
    c.lineTo(36, 0); c.quadraticCurveTo(52, 0, 52, -16);
    c.lineTo(52, -226);
    c.bezierCurveTo(52, -270, 19, -272, 19, -292);
    c.lineTo(19, -330 + 18);
    if (!open) c.closePath();
  }
  function drawSoda(t) {
    const g = GAS, k = GG.k, warm = clamp((g.T - 5) / 35, 0, 1);
    ctx.save(); ctx.translate(GG.bx, GG.bot); ctx.scale(k, k);
    // 수조 (물 + 온도계)
    const tubW = 236, tubH = 118, tx = -tubW / 2 - 4, ty = -tubH + 8;
    contactShadow(0, 6, tubW / 2 + 16, 8, 0.9);
    ctx.fillStyle = 'rgba(230,240,252,.55)'; D.roundRect(tx, ty, tubW, tubH, 16); ctx.fill();
    const wcol = mixHex('#8fd0fa', '#ffbf8a', warm * 0.7);
    const wy = ty + 24;
    ctx.save(); ctx.beginPath(); D.roundRect(tx + 3, ty + 3, tubW - 6, tubH - 6, 14); ctx.clip();
    const wg = ctx.createLinearGradient(0, wy, 0, ty + tubH); wg.addColorStop(0, tint(wcol, 0.2, 0.8)); wg.addColorStop(1, tint(wcol, -0.1, 0.92));
    ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(tx, ty + tubH);
    for (let i = 0; i <= 24; i++) ctx.lineTo(tx + tubW * i / 24, wy + Math.sin(t * 1.6 + i * 0.7) * 1.2);
    ctx.lineTo(tx + tubW, ty + tubH); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(tx + 4, wy - 1, tubW - 8, 3);
    // 얼음 (차가울 때)
    const ice = clamp((14 - g.T) / 10, 0, 1);
    if (ice > 0.02) { ctx.globalAlpha = ice; [[-88, 6, 24], [80, 10, 22], [-66, 20, 18], [92, 28, 18]].forEach((q, i) => { const x = q[0] + Math.sin(t * 0.9 + i * 2) * 2, y = wy + q[1] + Math.sin(t * 1.3 + i) * 1.4, s = q[2]; ctx.fillStyle = 'rgba(236,248,255,.92)'; D.roundRect(x - s / 2, y - s / 2, s, s, 5); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.4; D.roundRect(x - s / 2, y - s / 2, s, s, 5); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - s / 2 + 3, y - s / 2 + 3, 4, s * 0.4); }); ctx.globalAlpha = 1; }
    ctx.restore();
    ctx.strokeStyle = 'rgba(120,150,190,.9)'; ctx.lineWidth = 3; D.roundRect(tx, ty, tubW, tubH, 16); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx + 10, ty + 14); ctx.lineTo(tx + 10, ty + tubH - 18); ctx.stroke();
    // 병
    const liqY = -284 + (g.open ? 0 : 0);
    vessel({
      x0: -52, x1: 52, yTop: -330, yBot: -2, t, amp: 0.9 + (g.open ? 1.4 * g.foam : 0.4 * g.foam), iamp: 0, men: 2.6,
      path: (c) => bottleOutline(c, false),
      outline: (c) => bottleOutline(c, true),
      layers: [{ y: liqY, color: '#6a3b17', alpha: 0.88 }],
      inside: (c) => {
        // 기포
        c.beginPath();
        g.bub.forEach((b) => { c.moveTo(b.x + b.r, b.y); c.arc(b.x, b.y, b.r, 0, TAU); });
        c.fillStyle = 'rgba(255,255,255,.6)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 0.9; c.stroke();
        // 가만히 녹아 있는 작은 알갱이 (많이 녹아 있을수록 진해요)
        const dis = clamp(g.d / 3, 0, 1);
        for (let i = 0; i < 46; i++) { const u = hash(i + 7), v = hash(i * 3 + 1); if (u > dis + 0.05) continue; c.fillStyle = 'rgba(255,255,255,' + (0.18 + 0.2 * dis) + ')'; c.fillRect(-46 + u * 92, -240 + v * 224 + Math.sin(t * 1.5 + i) * 1.4, 1.8, 1.8); }
        // 거품 층
        const fh = Math.min(46, g.foam * 28);
        if (fh > 1) { for (let i = 0; i < 26; i++) { const u = hash(i + 21), v = hash(i * 5 + 3); c.fillStyle = 'rgba(255,248,236,' + (0.5 + 0.4 * v) + ')'; c.beginPath(); c.arc((u - 0.5) * 36, liqY - 2 - v * fh, 3 + hash(i) * 3.4, 0, TAU); c.fill(); } }
      },
    });
    // 라벨
    ctx.save(); ctx.beginPath(); ctx.rect(-52, -190, 104, 74); ctx.clip();
    const lb = ctx.createLinearGradient(-52, 0, 52, 0); lb.addColorStop(0, '#d63a3a'); lb.addColorStop(0.5, '#f25a5a'); lb.addColorStop(1, '#b52c2c');
    ctx.fillStyle = lb; ctx.fillRect(-54, -190, 108, 74); ctx.restore();
    text(0, -148, '탄산음료', { size: 17, weight: 800, color: '#fff' }); text(0, -128, 'CO₂ + 물', { size: 12, weight: 700, color: 'rgba(255,255,255,.85)' });
    // 뚜껑
    const c = g.cap.value, ccx = c * 56, ccy = -330 - c * 38 - Math.sin(Math.min(1, c) * Math.PI) * 18, rot = c * 0.7;
    ctx.save(); ctx.translate(ccx, ccy); ctx.rotate(rot);
    const cg = ctx.createLinearGradient(-26, 0, 26, 0); cg.addColorStop(0, '#2563eb'); cg.addColorStop(0.45, '#60a5fa'); cg.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = cg; D.roundRect(-24, -2, 48, 22, 6); ctx.fill(); ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 1.6; D.roundRect(-24, -2, 48, 22, 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.4; for (let i = -18; i <= 18; i += 6) { ctx.beginPath(); ctx.moveTo(i, 2); ctx.lineTo(i, 16); ctx.stroke(); }
    ctx.restore();
    // 온도계 (수조 속)
    ctx.restore();
    const thx = GG.bx + 92 * k, tht = GG.bot - 120 * k;
    D.thermometer(thx, tht, 84 * k + 6, clamp(g.T, 0, 50), 0, 50, { ticks: false, color: g.T > 28 ? COL.warm : '#e2464b' });
    const lw = PHONE ? 54 : 70, lh = PHONE ? 15 : 18;
    if (!g._odo) { g._odo = new Odo(0); g._odo.jump(5); }
    g._odo.set(g.T); g._odo.update(lastDt);
    drawLCD(GG.bx - lw / 2, GG.bot + 4 * k + (PHONE ? 2 : 8), lw, lh, g._odo, { digits: 3, unit: '°C', unitW: 20 });
    if (!PHONE) text(GG.bx - lw / 2 - 8, GG.bot + 24, '수조 온도', { size: 12.5, weight: 800, color: COL.muted, align: 'right' });
    // 쉬익 소리 글자 + 뚜껑 안내
    const gl = gasGeo();
    if (g.hiss > 0.05) { ctx.save(); ctx.globalAlpha = Math.min(1, g.hiss * 1.6); pill(gl.neckX - 36 * k, gl.neckY - 26 * k, '쉬이익~', { bg: '#475569', size: PHONE ? 13 : 15, pad: 10, align: 'right' }); ctx.restore(); }
    else if (!g.open) pill(gl.neckX - 36 * k, gl.neckY - 4 * k, '뚜껑 닫힘', { bg: '#64748b', size: PHONE ? 12.5 : 13.5, pad: 9, align: 'right' });
  }
  function drawGasScene(t) {
    const R = LAY.lab, g = GAS;
    drawLabBg();
    // 압력계
    const D0 = GG.dial;
    D.dial(D0.x, D0.y, D0.r, clamp(g.Pg.value, 0, 6), 0, 6, { ticks: 3, color: '#e2464b' });
    text(D0.x, D0.y + D0.r + 22, '병 속 압력', { size: PHONE ? 13 : 14.5, weight: 800, color: COL.ink });
    pill(D0.x, D0.y + D0.r + 46, g.open ? '1 기압 (낮음)' : '높음', { bg: g.open ? '#2563eb' : '#b91c1c', size: PHONE ? 12.5 : 13.5, pad: 9 });
    drawSoda(t);
    const lx = R.x + 14, ly = R.y + 26;
    pill(lx, ly, '🥤 탄산음료', { bg: '#1e3a8a', size: PHONE ? 13 : 14, align: 'left', pad: 9 });
    pill(lx + (PHONE ? 100 : 108), ly, '🌡️ ' + Math.round(g.T) + ' °C', { bg: g.T > 28 ? COL.warm : g.T < 10 ? '#2563eb' : '#64748b', size: PHONE ? 13 : 14, align: 'left', pad: 9 });
    // 오른쪽 위 렌즈, 아래 카드
    drawLens('gas', LAY.top, 'CO₂', '녹아 있는 입자 ' + LENS.gas.nFree + '개');
    drawGasCard(LAY.bot);
  }
  function drawGasCard(r) {
    const g = GAS;
    panel(r.x, r.y, r.w, r.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(r.x + 14, r.y + 26, '🫧 녹아 있는 이산화 탄소', { size: PHONE ? 14 : 15, weight: 800, color: COL.ink, align: 'left' });
    const bx = r.x + 16, bw = r.w - 32, by = r.y + (PHONE ? 40 : 50), bh = PHONE ? 22 : 28;
    ctx.fillStyle = '#eef2f8'; D.roundRect(bx, by, bw, bh, bh / 2); ctx.fill();
    ctx.save(); ctx.beginPath(); D.roundRect(bx, by, bw, bh, bh / 2); ctx.clip();
    const gg = ctx.createLinearGradient(bx, 0, bx + bw, 0); gg.addColorStop(0, '#94a3b8'); gg.addColorStop(1, '#475569');
    ctx.fillStyle = gg; ctx.fillRect(bx, by, bw * clamp(g.d / 3, 0, 1), bh); ctx.restore();
    text(bx + bw, by - 6, '처음(차갑고 닫힘) 100 %', { size: 12.5, weight: 700, color: COL.muted, align: 'right' });
    text(bx + bw * clamp(g.d / 3, 0, 1) - 6, by + bh / 2 + 5, Math.round(g.d / 3 * 100) + ' %', { size: 14, weight: 800, color: '#fff', align: 'right' });
    // 원인 두 가지
    const y2 = by + bh + (PHONE ? 22 : 36);
    const warm = g.T > 12, low = g.open;
    const row = (x, on_, icon, label, sub) => {
      ctx.fillStyle = on_ ? 'rgba(139,92,246,.12)' : '#f5f8fd'; D.roundRect(x, y2, (r.w - 40) / 2, PHONE ? 38 : 58, 12); ctx.fill();
      ctx.strokeStyle = on_ ? 'rgba(139,92,246,.55)' : COL.line; ctx.lineWidth = 1.8; D.roundRect(x, y2, (r.w - 40) / 2, PHONE ? 38 : 58, 12); ctx.stroke();
      text(x + 12, y2 + (PHONE ? 24 : 26), icon + ' ' + label, { size: PHONE ? 13 : 14.5, weight: 800, color: on_ ? COL.subD : COL.ink, align: 'left' });
      if (!PHONE) text(x + 12, y2 + 46, sub, { size: 13, weight: 700, color: on_ ? COL.subD : COL.muted, align: 'left' });
    };
    row(r.x + 14, warm, '🌡️', warm ? '온도가 높아요' : '온도가 낮아요', warm ? '→ 기체가 덜 녹아요' : '→ 기체가 잘 녹아요');
    row(r.x + 26 + (r.w - 40) / 2, low, g.open ? '🔓' : '🔒', low ? '압력이 낮아요' : '압력이 높아요', low ? '→ 기체가 덜 녹아요' : '→ 기체가 잘 녹아요');
  }

  /* =========================================================
     화면 요소 · 장면 전환 · 입력 · 갱신/그리기 루프
     ========================================================= */
  const SCENES = {
    dissolve: { label: '🧂 20 °C 물 100 g에 소금 녹이기', hint: '🥄 단추를 눌러 소금을 한 숟가락씩 넣어 보세요. (병이나 숟가락을 눌러도 돼요)' },
    measure: { label: '📈 온도에 따른 용해도 재기', hint: '물질과 온도를 고르고 🧪 단추를 눌러 최대로 녹는 양을 재요.' },
    cool: { label: '❄️ 포화 용액을 식혀 결정 얻기', hint: '온도 슬라이더를 끌거나 ❄️ 단추를 눌러 식혀 보세요.' },
    gas: { label: '🥤 탄산음료 속 기체의 용해도', hint: '온도를 바꾸고 뚜껑을 열어 거품을 살펴봐요.' },
  };
  const S = { scene: 'dissolve', sceneT: 0, cm: 'cool' };       // cm: ③ 단계에서 보일 조작 (predict | cool)
  const PRED = { v: '' };
  const hintEl = $('#stageHint');
  const ready = {};
  const subSegBtns = $$('#subSeg button');
  const tempR = $('#tempR'), coolR = $('#coolR'), gasR = $('#gasR'), predSel = $('#predSel');
  const bind = (inp, out, fmt, cb) => SciSim.bindRange(inp, out, fmt, cb);

  function setSub(id) {
    if (LABS.busy) return;
    LABS.sub = id; labFresh(+tempR.value, id);
    subSegBtns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.sub === id ? 'true' : 'false'));
    refreshReadouts(); refreshUI();
  }
  const tRange = bind(tempR, $('#tempO'), (v) => v + ' °C', (v) => {
    if (LABS.busy || S.scene !== 'measure') { tempR.value = LABS.Tset; tRange.refresh(); return; }
    labFresh(v, LABS.sub); Sound.tick(); refreshReadouts(); refreshUI();
  });
  const cRange = bind(coolR, $('#coolO'), (v) => Math.round(v) + ' °C', (v) => {
    if (LABS.busy === 'cool') return;
    if (S.scene === 'cool') { LABS.Tset = v; hideHint(); refreshUI(); }
  });
  const gRange = bind(gasR, $('#gasO'), (v) => v + ' °C', (v) => { GAS.Tset = v; hideHint(); });

  /* ---------- 읽는 값 ---------- */
  function refreshReadouts() {
    const set = (i, label, val, word) => {
      const l = $('#rl' + i), v = $('#r' + i);
      if (l.textContent !== label) l.textContent = label;
      if (v.innerHTML !== val) v.innerHTML = val;
      v.classList.toggle('word', !!word);
    };
    const L = LABS;
    if (S.scene === 'dissolve') {
      set(1, '넣은 소금', f1(L.added) + '<small>g</small>');
      set(2, '녹은 소금', f1(L.diss) + '<small>g</small>');
      set(3, '바닥에 남은 소금', f1(solidLeft()) + '<small>g</small>');
    } else if (S.scene === 'measure') {
      set(1, '용질', SOL[L.sub].name, true);
      set(2, '물의 온도', Math.round(L.T) + '<small>°C</small>');
      set(3, PHONE ? '용해도' : '용해도 (g/물 100 g)', L.result ? gStr(L.result.g) + '<small>g</small>' : '–');
    } else if (S.scene === 'cool') {
      set(1, '용액의 온도', Math.round(L.T) + '<small>°C</small>');
      set(2, PHONE ? '녹아 있는 양' : '녹아 있는 질산 칼륨', f1(L.diss) + '<small>g</small>');
      set(3, '석출된 결정', f1(L.cmass) + '<small>g</small>');
    } else {
      const g = GAS;
      set(1, '음료의 온도', Math.round(g.T) + '<small>°C</small>');
      set(2, '뚜껑 · 압력', g.open ? '열림 · 1 기압' : '닫힘 · 높음', true);
      set(3, PHONE ? '녹은 기체' : '녹아 있는 이산화 탄소', (g.d / 3 * 100).toFixed(0) + '<small>%</small>');
    }
  }
  const sceneLabel = () => SCENES[S.scene].label;

  let lastFree = null;
  function refreshUI() {
    const free = !!(game && game.free), sc = S.scene, L = LABS;
    $('#sceneSeg').hidden = !free;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    $('#tbLabel').textContent = sceneLabel();
    $('#tbLabel').hidden = free && window.innerWidth < 1100;
    const showPred = sc === 'cool' && S.cm === 'predict' && !free;
    const vis = { ctlAdd: sc === 'dissolve', ctlMeasure: sc === 'measure', ctlPredict: showPred, ctlCool: sc === 'cool' && !showPred, ctlGas: sc === 'gas' };
    Object.keys(vis).forEach((k) => { $('#' + k).hidden = !vis[k]; });
    $('#ctrlCard').hidden = !Object.values(vis).some(Boolean);
    $('#addBtn').disabled = !!L.busy;
    $('#measureBtn').disabled = !!L.busy; tempR.disabled = !!L.busy; subSegBtns.forEach((b) => (b.disabled = !!L.busy));
    $('#coolBtn').disabled = !!L.busy; $('#coolBtn').textContent = L.mode === 'cool' && L.Tset <= 20.1 ? '↺ 다시 80 °C부터 식히기' : '❄️ 20 °C까지 식히기';
    const cap = $('#capBtn'); cap.textContent = GAS.open ? '🔒 뚜껑 닫기' : '🔓 뚜껑 열기'; cap.disabled = !!GAS.busy;
    predSel.classList.toggle('set', !!predSel.value);
    lastFree = free;
  }
  function showHintMsg(t, ms) { showHint(t, ms || 5200); }

  function resetScene(key) {
    sqCancel(); FX.clear(); hideHint();
    LABS.busy = null; GAS.busy = null; LABS.rate = 3.2;
    if (key === 'dissolve') labDissolveSetup();
    else if (key === 'measure') { LABS.pts.length = 0; GR.cache = {}; labMeasureSetup('KNO3'); subSegBtns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.sub === 'KNO3' ? 'true' : 'false')); }
    else if (key === 'cool') { labCoolSetup(); predSel.value = ''; PRED.v = ''; }
    else if (key === 'gas') gasSetup();
    ready[key] = true; S.sceneT = 0;
    refreshReadouts(); refreshUI();
  }
  function setScene(key, reset) {
    const was = S.scene;
    const need = reset || !ready[key];
    if (key !== was) { FX.clear(); S.sceneT = 0; hideHint(); }
    S.scene = key;
    if (need) resetScene(key); else refreshReadouts();
    if (key !== was || reset) showHintMsg(SCENES[key].hint, 6500);
    refreshUI();
  }

  /* ---------- 단추 · 슬라이더 ---------- */
  $('#addBtn').addEventListener('click', () => { Sound.click(); addSpoon(); refreshUI(); });
  $('#measureBtn').addEventListener('click', () => { Sound.click(); startMeasure(); });
  $('#coolBtn').addEventListener('click', () => { Sound.click(); startCool(); });
  $('#capBtn').addEventListener('click', () => { Sound.click(); toggleCap(); });
  subSegBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub(b.dataset.sub); }));
  predSel.addEventListener('change', () => { PRED.v = predSel.value; predSel.classList.toggle('set', !!predSel.value); Sound.click(); });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); resetScene(S.scene); showHintMsg(SCENES[S.scene].hint, 5000); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene, true); }));

  /* ---------- 캔버스 입력: 병 · 숟가락 · 뚜껑을 눌러도 돼요 ---------- */
  function hitJar(p) {
    const J = LB.jar, sp = LABS.spoon;
    return (p.x > J.cx - J.w / 2 - 10 && p.x < J.cx + J.w / 2 + 10 && p.y > J.bot - J.h - 12 && p.y < J.bot + 4) || (Math.hypot(p.x - sp.x, p.y - sp.y) < 34);
  }
  SciSim.pointer(view, {
    hover(p) {
      if (S.scene === 'dissolve' && !LABS.busy && hitJar(p)) return 'pointer';
      if (S.scene === 'measure' && !LABS.busy && hitJar(p)) return 'pointer';
      if (S.scene === 'gas' && gasHit(p)) return 'pointer';
      return null;
    },
    down(p) {
      hideHint();
      if (S.scene === 'dissolve' && hitJar(p)) { if (!LABS.busy) { Sound.click(); addSpoon(); refreshUI(); } return false; }
      if (S.scene === 'measure' && hitJar(p)) { if (!LABS.busy) { Sound.click(); startMeasure(); } return false; }
      if (S.scene === 'gas' && gasHit(p)) { toggleCap(); return false; }
      return false;
    },
  });

  /* ---------- 갱신 · 그리기 ---------- */
  let lastDt = 1 / 60;
  function update(dt) {
    lastDt = dt;
    CLK.t += dt; S.sceneT += dt;
    sqUpdate(dt);
    FX.update(dt);
    updateLab(dt);
    updateGas(dt);
  }
  function draw() {
    view.clear(BG);
    const t = CLK.t, dt = lastDt, sc = S.scene;
    if (sc === 'gas') drawGasScene(t);
    else drawLab(t);
    if (sc === 'dissolve') { drawLens('dissolve', LAY.top, '소금'); drawAmountCard(LAY.bot); }
    else if (sc === 'measure') { drawGraph(LAY.top, 'measure'); drawTable(LAY.bot); }
    else if (sc === 'cool') { drawGraph(LAY.top, 'cool'); drawLens('cool', LAY.bot, '질산 칼륨'); }
    FX.draw(ctx);
    drawChecks(dt);
    if (sc === 'dissolve' && isNew('lens')) ringRect(LAY.top, 18);
    if (sc === 'measure' && isNew('graph')) ringRect(LAY.top, 18);
    if (sc === 'cool' && isNew('cool')) ringRect(LAY.top, 18);
    if (sc === 'gas' && isNew('gas')) ringRect(LAY.lab, 18);
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
  /* 새로 고침 뒤 이어서 하는 미션을 위해 앞 미션의 결과를 한 번에 채워 두는 도우미 */
  function fillPoints() {
    ['KNO3', 'NaCl'].forEach((sub) => TEMPS.forEach((T) => {
      if (!LABS.pts.some((q) => q.sub === sub && q.T === T)) LABS.pts.push({ sub, T, g: solAt(sub, T), pop: 0 });
    }));
    LABS.ptsLine = 1;
  }
  const kPts = () => LABS.pts.filter((q) => q.sub === 'KNO3');
  const nPts = () => LABS.pts.filter((q) => q.sub === 'NaCl');

  game = SciSim.game({
    simId: 'm2-solubility',
    mount: '#game',
    badge: '용해도 박사',
    homeHref: '../../index.html#g2',
    featureLabels: {
      lens: '🔍 입자 모형 · 녹은 양 막대',
      graph: '📈 용해도 곡선과 측정 기록표',
      cool: '❄️ 식히기 · 결정의 석출',
      gas: '🥤 탄산음료 속 기체 실험',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onMissionStart(m) {
      if (game && game.free) return;
      if (m.cm) S.cm = m.cm;
      if (m.scene) setScene(m.scene, false);
      refreshUI();
    },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '포화: 소금은 끝없이 녹을까?', short: '포화', icon: '🧂', phase: '관찰',
        features: ['lens'],
        intro: '<p class="si-q">❓ 탐구 질문: 물에 설탕을 계속 넣으면 끝없이 녹을까?</p>' +
          '<p>설탕처럼 <b>소금</b>(염화 나트륨)도 알아봐요. <b>20 °C 물 100 g</b>에 소금을 <b>한 숟가락(5 g)</b>씩 넣고 저어 보세요. 🔍 <b>입자 모형</b>으로 소금 입자가 물속에서 어떻게 되는지도 살펴봐요.</p>',
        setup() { setScene('dissolve', true); },
        recap: '일정한 온도에서 물 100 g에 소금이 <b>더 이상 녹지 못할 때</b>를 <b>포화 용액</b>이라 하고, 이때 녹은 양이 <b>용해도</b>예요. (20 °C 소금: 35.9 g)',
        summary: '<ul><li>소금을 물에 넣으면 소금 입자가 물 입자 사이로 <b>고르게 퍼져서</b> 녹아요.</li>' +
          '<li>일정한 온도에서 물 100 g에 녹을 수 있는 양에는 <b>한계</b>가 있어요. 한계까지 녹은 용액이 <b>포화 용액</b>, 아직 더 녹을 수 있는 용액이 <b>불포화 용액</b>이에요.</li>' +
          '<li><b>용해도</b> = 일정한 온도에서 용매(물) 100 g에 <b>최대로 녹을 수 있는 용질의 g 수</b>. (20 °C 염화 나트륨 35.9 g)</li></ul>',
        missions: [
          {
            title: '포화 상태 만들기', scene: 'dissolve',
            goal: '소금을 한 숟가락씩 넣어서 <b>더 이상 녹지 않고 바닥에 남을 때까지</b> 넣어 보세요.',
            hint: '🥄 단추(또는 소금병)를 계속 눌러요. 어느 순간부터 바닥에 소금이 남아요. 🔍 입자 모형도 함께 보세요.',
            setup() { if (S.scene === 'dissolve' && LABS.mode !== 'dissolve') labDissolveSetup(); },
            check: () => LABS.mode === 'dissolve' && !LABS.busy && LABS.added - satNow() > 0.4 && solidLeft() > 0.3 && Math.abs(LABS.diss - Math.min(LABS.added, satNow())) < 0.2,
            hold: 0.9,
            status: () => '넣은 소금 <b>' + f1(LABS.added) + ' g</b> · ' + (LABS.added - satNow() > 0.4 ? '✅ 바닥에 소금이 남았어요' : '⬜ 아직 모두 녹아요'),
            explain: '20 °C 물 100 g에는 소금이 <b>35.9 g</b>까지만 녹아요. 그보다 많이 넣으면 녹지 못한 소금이 바닥에 남아요. 🔍 입자 모형에서도 일부 소금 입자는 덩어리로 남았지요. 이렇게 더 이상 녹지 못하는 용액을 <b>포화 용액</b>이라 해요.',
          },
          {
            type: 'quiz', title: '포화일까, 불포화일까?', scene: 'dissolve',
            setup() { setDissolveState(20); },
            goal: '20 °C 물 100 g에 소금 <b>20 g</b>을 넣었더니 <b>모두 녹았어요</b>. 소금의 용해도는 35.9 g이에요. 이 용액은 어떤 용액일까요?',
            choices: ['포화 용액이다. 더 이상 녹지 못한다', '불포화 용액이다. 소금을 더 녹일 수 있다', '포화 용액이다. 소금이 모두 녹았기 때문이다', '용해도가 20 g인 용액이다'],
            answer: 1,
            feedback: ['포화는 더 이상 녹지 못할 때예요. 20 g은 35.9 g보다 적어서 15.9 g이나 더 녹을 수 있어요.', '', '소금이 모두 녹았다고 해서 포화는 아니에요. 한계(35.9 g)까지 녹아야 포화예요.', '용해도는 물질과 온도가 정해지면 정해지는 값이에요. 20 g은 넣은 양일 뿐이에요.'],
            explain: '20 g은 용해도(35.9 g)보다 적으므로 소금을 <b>더 녹일 수 있는 불포화 용액</b>이에요. 용해도만큼 녹아서 더 녹지 못하면 포화 용액이에요.',
          },
        ],
      },
      {
        title: '용해도 곡선: 온도에 따라 달라져요', short: '용해도 곡선', icon: '📈', phase: '실험',
        features: ['graph'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 20 °C 물 100 g에 소금은 35.9 g까지 녹았어요. 이 값이 <b>용해도</b>예요.</div>' +
          '<p>온도를 바꾸면 용해도도 변할까요? <b>질산 칼륨</b>이 최대로 녹는 양을 여러 온도에서 재어 점을 찍고 <b>용해도 곡선</b>을 그려 봐요. 소금과도 비교해요.</p>',
        setup() { setScene('measure', true); },
        recap: '고체의 용해도는 대부분 <b>온도가 높을수록 커요</b>. 질산 칼륨은 온도에 따라 크게 변하고 염화 나트륨은 거의 변하지 않아요. 용해도는 물질마다 달라서 <b>물질의 특성</b>이에요.',
        summary: '<ul><li><b>용해도 곡선</b>: 온도에 따른 용해도를 나타낸 그래프예요.</li>' +
          '<li>질산 칼륨(g/물 100 g): 0 °C 13.3 · 20 °C 31.6 · 40 °C 63.9 · 60 °C 110 · 80 °C 169 → 온도가 높을수록 <b>크게 늘어요</b>.</li>' +
          '<li>염화 나트륨: 35.7 ~ 38.0 g으로 온도에 따라 <b>거의 변하지 않아요</b>.</li>' +
          '<li>같은 온도에서도 물질마다 용해도가 달라서, 용해도는 물질을 구별하는 <b>물질의 특성</b>이에요. 대부분의 고체는 온도가 높을수록 용해도가 커요.</li></ul>',
        missions: [
          {
            title: '질산 칼륨의 용해도 곡선 그리기', scene: 'measure',
            goal: '<b>질산 칼륨</b>을 고르고 온도를 바꿔 가며 <b>4가지 이상의 온도</b>에서 용해도(최대로 녹는 양)를 재 보세요.',
            hint: '온도 슬라이더로 온도를 고르고 🧪 단추를 눌러요. 재는 데 몇 초 걸려요. 점이 4개 이상 찍히면 곡선이 이어져요.',
            setup() { if (S.scene === 'measure' && LABS.mode !== 'measure') labMeasureSetup('KNO3'); },
            check: () => kPts().length >= 4,
            hold: 1.0,
            status: () => '잰 온도 <b>' + Math.min(4, kPts().length) + ' / 4</b> · ' + TEMPS.map((T) => T + '° ' + mark(kPts().some((q) => q.T === T))).join(' &nbsp;'),
            explain: '온도가 높아질수록 질산 칼륨의 용해도가 빠르게 커져서 곡선이 <b>오른쪽 위로 가파르게</b> 올라가요. (20 °C 31.6 g → 80 °C 169 g)',
          },
          {
            title: '소금과 비교하기', scene: 'measure',
            goal: '이번에는 <b>염화 나트륨(소금)</b>을 골라 <b>0 °C와 80 °C</b>에서 용해도를 재고, 질산 칼륨과 비교해 보세요.',
            hint: '오른쪽에서 염화 나트륨을 누르고, 온도를 0 °C와 80 °C로 바꿔 가며 🧪 단추를 눌러요.',
            setup() { if (kPts().length < 4) fillPointsK(); },
            check: () => nPts().some((q) => q.T === 0) && nPts().some((q) => q.T === 80),
            hold: 1.0,
            status: () => '염화 나트륨 · 0 °C ' + mark(nPts().some((q) => q.T === 0)) + ' &nbsp;80 °C ' + mark(nPts().some((q) => q.T === 80)),
            explain: '염화 나트륨의 용해도는 0 °C에서 35.7 g, 80 °C에서 38.0 g으로 <b>거의 같아요</b>. 곡선이 거의 <b>수평</b>이에요. 온도에 따라 용해도가 변하는 정도는 물질마다 달라요.',
          },
          {
            type: 'quiz', title: '온도의 영향이 큰 물질은?', scene: 'measure',
            setup() { if (LABS.pts.length < 10) fillPoints(); },
            goal: '온도가 올라갈 때 용해도가 <b>크게 늘어나는</b> 물질은 무엇일까요?',
            choices: ['질산 칼륨', '염화 나트륨', '두 물질 모두 똑같이 늘어난다', '두 물질 모두 거의 변하지 않는다'],
            answer: 0,
            feedback: ['', '염화 나트륨은 0 °C 35.7 g, 80 °C 38.0 g으로 거의 변하지 않았어요.', '곡선의 기울기가 달랐어요. 질산 칼륨은 가파르게, 염화 나트륨은 거의 수평으로 이어졌어요.', '질산 칼륨은 13.3 g에서 169 g으로 크게 늘었어요.'],
            explain: '<b>질산 칼륨</b>은 온도가 높아질수록 용해도가 크게 늘어나서 곡선이 가파르고, 염화 나트륨은 거의 변하지 않아서 곡선이 수평에 가까워요.',
          },
        ],
      },
      {
        title: '석출: 식히면 결정이 나와요', short: '석출', icon: '❄️', phase: '설명',
        features: ['cool'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 질산 칼륨은 온도가 낮아질수록 용해도가 크게 줄어든다는 것을 알았어요.</div>' +
          '<p>80 °C 물 100 g에 질산 칼륨 <b>169 g</b>을 녹인 <b>포화 용액</b>을 식히면 어떻게 될까요? 용해도 곡선을 읽어 <b>결정이 얼마나 나올지</b> 예측하고, 직접 식혀서 확인해요.</p>',
        setup() { S.cm = 'predict'; setScene('cool', true); },
        recap: '용액을 식히면 용해도가 줄어서 <b>녹지 못한 만큼 결정</b>이 나와요(석출). <b>석출량 = 처음 녹인 양 − 그 온도의 용해도</b> (169 − 31.6 = 137.4 g)',
        summary: '<ul><li><b>석출</b>: 포화 용액의 온도를 낮추면 용해도가 줄어서 녹지 못한 용질이 <b>결정</b>으로 나오는 것이에요.</li>' +
          '<li>80 °C 질산 칼륨 포화 용액(169 g 용해)을 20 °C로 식히면 <b>169 − 31.6 = 137.4 g</b>이 석출돼요.</li>' +
          '<li>용해도가 온도에 따라 크게 변하는 물질일수록 많이 석출돼요. 염화 나트륨은 거의 석출되지 않아요.</li></ul>',
        missions: [
          {
            title: '석출량 예측하기', scene: 'cool', cm: 'predict', manual: true,
            goal: '곡선에서 20 °C의 용해도를 읽고, 80 °C 포화 용액(169 g)을 <b>20 °C로 식힐 때 나오는 결정의 양</b>을 오른쪽에서 골라 <b>✔ 확인하기</b>를 누르세요.',
            hint: '20 °C에서는 질산 칼륨이 31.6 g만 녹을 수 있어요. 녹지 못하고 남는 양이 결정으로 나와요.',
            setup() { predSel.value = ''; PRED.v = ''; refreshUI(); },
            check() {
              if (!PRED.v) return '식힐 때 나오는 결정의 양을 예측해서 골라 주세요.';
              if (PRED.v === '137.4') return true;
              if (PRED.v === '31.6') return '31.6 g은 20 °C에서 <b>녹아 있을 수 있는 양</b>(용해도)이에요. 결정으로 나오는 양은 169 g에서 이 값을 뺀 값이에요.';
              if (PRED.v === '105.1') return '105.1 g은 40 °C까지만 식혔을 때의 석출량(169 − 63.9)이에요. 20 °C까지 식히면 용해도가 더 줄어요.';
              return '169 g은 처음 녹인 양 전체예요. 20 °C에서도 31.6 g은 녹아 있을 수 있어요.';
            },
            explain: '20 °C에서 물 100 g에는 질산 칼륨이 <b>31.6 g</b>까지만 녹을 수 있어요. 처음 녹아 있던 169 g 중 녹지 못하는 <b>169 − 31.6 = 137.4 g</b>이 결정으로 나와요.',
          },
          {
            title: '식혀서 결정 얻기', scene: 'cool', cm: 'cool',
            goal: '온도 슬라이더를 끌거나 <b>❄️ 20 °C까지 식히기</b>를 눌러 용액을 <b>20 °C</b>까지 식히세요. 결정이 자라는 모습과 석출량을 확인해요.',
            hint: '식히는 동안 🔍 입자 모형에서 녹아 있던 입자가 덩어리(결정)에 달라붙는 모습도 보세요.',
            setup() { if (LABS.mode !== 'cool') labCoolSetup(); },
            check: () => LABS.mode === 'cool' && LABS.T <= 20.6 && Math.abs(LABS.cmass - 137.4) < 1.2 && !LABS.busy,
            hold: 1.2,
            status: () => '용액 <b>' + Math.round(LABS.T) + ' °C</b> · 석출된 결정 <b>' + f1(LABS.cmass) + ' g</b> (예측 137.4 g)',
            explain: '식힐수록 질산 칼륨의 용해도가 줄어서 녹아 있지 못하는 만큼 <b>결정</b>이 생겼어요. 20 °C에서 나온 결정은 <b>137.4 g</b>으로 예측과 같았어요.',
          },
          {
            type: 'quiz', title: '소금 용액을 식히면?', scene: 'cool', cm: 'cool',
            goal: '80 °C 염화 나트륨(소금) 포화 용액을 20 °C로 식혀도 결정이 <b>거의 나오지 않아요</b>. 그 까닭은 무엇일까요?',
            choices: ['소금은 물에 잘 녹지 않기 때문이다', '소금은 온도가 변해도 용해도가 거의 변하지 않기 때문이다', '소금은 식히면 용해도가 오히려 커지기 때문이다', '소금 용액은 식혀도 온도가 내려가지 않기 때문이다'],
            answer: 1,
            feedback: ['소금도 물 100 g에 35 g 넘게 녹는 물질이에요. 문제는 온도에 따른 변화예요.', '', '용해도가 커지면 결정이 나오지 않지만, 소금은 거의 변하지 않아요(38.0 g → 35.9 g).', '식히면 용액의 온도는 내려가요. 용해도가 별로 달라지지 않는 것이 까닭이에요.'],
            explain: '염화 나트륨은 80 °C에서 38.0 g, 20 °C에서 35.9 g으로 용해도가 거의 같아서 석출량이 <b>38.0 − 35.9 = 2.1 g</b>밖에 되지 않아요. 용해도 변화가 큰 질산 칼륨과 달라요.',
          },
        ],
      },
      {
        title: '기체의 용해도: 탄산음료의 거품', short: '기체 용해도', icon: '🥤', phase: '적용',
        features: ['gas'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 고체의 용해도는 온도가 높을수록 커졌어요.</div>' +
          '<p>탄산음료에는 <b>이산화 탄소</b> 기체가 녹아 있어요. <b>기체</b>의 용해도는 온도와 압력에 따라 어떻게 달라질까요? 온도를 올리고 뚜껑을 열어 거품이 생기는 까닭을 알아봐요.</p>',
        setup() { setScene('gas', true); },
        recap: '기체의 용해도는 <b>온도가 높을수록 작아지고</b>, <b>압력이 높을수록 커져요</b>. (고체와 달리 온도가 높을수록 작아져요.)',
        summary: '<ul><li>탄산음료는 <b>높은 압력</b>(뚜껑이 닫힘)과 <b>낮은 온도</b>에서 이산화 탄소가 많이 녹아 있어요.</li>' +
          '<li>뚜껑을 열면 <b>압력이 낮아져</b> 기체의 용해도가 줄고, 녹아 있던 기체가 거품으로 빠져나와요. 따뜻한 음료는 더 많이 넘쳐요.</li>' +
          '<li>기체의 용해도: <b>온도가 높을수록 작아지고, 압력이 높을수록 커져요</b>.</li>' +
          '<li>여름에는 물의 온도가 높아져 물속에 녹아 있는 산소가 줄어서, 물고기가 수면 가까이에서 입을 뻐끔거려요.</li></ul>',
        missions: [
          {
            title: '온도 올리고 뚜껑 열기', scene: 'gas',
            goal: '온도 슬라이더로 음료를 <b>30 °C 이상</b>으로 데운 뒤 <b>뚜껑을 열어</b> 거품이 어떻게 생기는지 관찰하세요.',
            hint: '온도를 올리면 뚜껑을 닫은 채로도 작은 기포가 생겨요. 뚜껑을 열면 압력이 낮아져 거품이 쏟아져요.',
            setup() { if (!GAS.opened && !GAS.warmed) gasSetup(); },
            check: () => GAS.warmed && GAS.opened && GAS.hiss < 0.2,
            hold: 1.2,
            status: () => '온도 30 °C 이상 ' + mark(GAS.warmed) + ' &nbsp;뚜껑 열기 ' + mark(GAS.opened) + '<br>녹아 있는 기체 <b>' + Math.round(GAS.d / 3 * 100) + ' %</b>',
            onWin() { celebrate(LAY.lab.x + LAY.lab.w / 2, LAY.lab.y + 120); },
            explain: '온도가 높아지자 기체가 덜 녹아 <b>기포</b>가 생겼고, 뚜껑을 열어 <b>압력이 낮아지자</b> 더 많은 기체가 빠져나와 거품이 쏟아졌어요. 기체의 용해도는 온도가 높을수록, 압력이 낮을수록 작아져요.',
          },
          {
            type: 'quiz', title: '기체의 용해도', scene: 'gas',
            goal: '기체의 용해도에 대한 설명으로 옳은 것은 무엇일까요?',
            choices: ['온도가 높을수록, 압력이 높을수록 커진다', '온도가 낮을수록, 압력이 높을수록 커진다', '온도가 높을수록, 압력이 낮을수록 커진다', '온도와 압력에 관계없이 일정하다'],
            answer: 1,
            feedback: ['온도가 높으면 기체가 덜 녹아요. 따뜻한 탄산음료는 김이 빨리 빠져요.', '', '압력이 낮으면 기체가 덜 녹아요. 뚜껑을 열면 압력이 낮아져 거품이 생겼어요.', '실험에서 온도와 뚜껑(압력)에 따라 녹아 있는 기체의 양이 달라졌어요.'],
            explain: '기체의 용해도는 <b>온도가 낮을수록</b>, <b>압력이 높을수록</b> 커요. 그래서 차갑고 뚜껑이 닫힌 탄산음료에 이산화 탄소가 가장 많이 녹아 있어요.',
          },
          {
            type: 'quiz', title: '여름철 물고기는 왜 뻐끔거릴까?', scene: 'gas',
            goal: '여름철 더운 날에 연못의 물고기들이 수면 가까이에서 입을 뻐끔거려요. 그 까닭은 무엇일까요?',
            choices: ['물의 온도가 높아져 물에 녹아 있는 산소가 줄어들기 때문이다', '물의 온도가 낮아져 물에 녹아 있는 산소가 늘어나기 때문이다', '물의 압력이 높아져 산소가 더 많이 녹기 때문이다', '물속에 소금이 많이 녹아 있기 때문이다'],
            answer: 0,
            feedback: ['', '여름에는 물의 온도가 높아져요. 온도가 낮아지면 산소가 더 잘 녹아서 숨쉬기 편해요.', '압력이 높아지면 기체가 더 잘 녹지만, 여름에 물의 압력이 달라지는 것은 아니에요.', '소금과는 관계가 없어요. 온도에 따른 기체의 용해도 변화로 설명해요.'],
            explain: '물의 온도가 높아지면 물에 녹는 <b>산소의 양(기체의 용해도)이 줄어요</b>. 산소가 부족해진 물고기가 산소가 더 많은 수면 가까이에서 입을 뻐끔거려요.',
          },
        ],
      },
    ],
  });

  function fillPointsK() {
    TEMPS.forEach((T) => { if (!LABS.pts.some((q) => q.sub === 'KNO3' && q.T === T)) LABS.pts.push({ sub: 'KNO3', T, g: solAt('KNO3', T), pop: 0 }); });
    LABS.ptsLine = 1;
  }

  /* ---------- 시작 ---------- */
  refreshUI(); refreshReadouts();
  SciSim.loop((dt, t) => {
    update(dt);
    draw();
    pulse(t);
  });
  window.__sim = {
    VW, VH, S, LABS, GAS, LB, LAY, LENS, PRED, SOL, GG,
    get game() { return game; },
    update, draw, setScene, resetScene, addSpoon, startMeasure, startCool, toggleCap, setSub, fillPoints, labCoolSetup, gasSetup,
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / VW, y: r.top + (y * r.height) / VH }; },
    bench(n) { const t0 = performance.now(); let mx = 0; for (let i = 0; i < n; i++) { const a = performance.now(); update(1 / 60); draw(); mx = Math.max(mx, performance.now() - a); } return { avg: (performance.now() - t0) / n, max: mx }; },
  };
})();
