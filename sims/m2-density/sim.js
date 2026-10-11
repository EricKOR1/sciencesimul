/* =========================================================
   중2 Ⅰ. 물질의 특성 — 물질의 특성과 밀도 [9과08-01]
   ① [관찰] 물질의 특성: 크기가 다른 알루미늄 조각 3개의 질량·부피를 재면 질량 ÷ 부피는 같다
   ② [실험] 밀도 측정: 모르는 금속 조각 X·Y의 밀도를 구해 밀도표에서 물질 찾기
   ③ [실험] 뜨고 가라앉기: 물엿·물·식용유로 액체 층을 쌓고 물체를 띄워 보기
   ④ [적용] 생활 속 밀도 (구명조끼 · 열기구 · 기름 유출 · 볍씨 고르기 · 헬륨 풍선)
   ※ 밀도 = 질량 ÷ 부피 (g/cm³): 계산과 비교까지만 다룸. 물질의 특성 = 양과 관계없이 일정한 값
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;

  /* ---------- 화면 (태블릿 = 가로형 800×560, 휴대폰 = 세로형 440×620) ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 440 : 800, VH = PHONE ? 620 : 560;
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

  /* ---------- 자료 ---------- */
  const DENS = [                                            // 밀도표 (g/cm³)
    { id: 'al', name: '알루미늄', d: 2.7, kind: 'al' },
    { id: 'fe', name: '철', d: 7.9, kind: 'fe' },
    { id: 'cu', name: '구리', d: 8.9, kind: 'cu' },
    { id: 'pb', name: '납', d: 11.3, kind: 'pb' },
    { id: 'au', name: '금', d: 19.3, kind: 'au' },
  ];
  METAL.au = { hi: '#fff3b0', mid: '#e6b92e', lo: '#a47a10', edge: '#7a5a0a' };
  const S = { scene: 'bench', sceneT: 0, step: 0 };
  const PICK = { X: '', Y: '' };                            // 오른쪽 상자에서 고른 물질 (X, Y)

  /* =========================================================
     장면 1 · 측정대: 전자저울(질량) + 눈금실린더(부피)
     ========================================================= */
  const GEO = PHONE ? {
    panel: { x: 4, y: 4, w: 432, h: 366 }, base: 332,
    tray: { x0: 14, x1: 176, y: 200 }, scaleCx: 100, cylCx: 362,
  } : {
    panel: { x: 8, y: 8, w: 536, h: 374 }, base: 340,
    tray: { x0: 18, x1: 140, y: 328 }, scaleCx: 238, cylCx: 408,
  };
  GEO.scale = { cx: GEO.scaleCx, x0: GEO.scaleCx - 82, x1: GEO.scaleCx + 82, y0: GEO.base - 44, platY: GEO.base - 48, rest: GEO.base - 47,
    lcd: { x: GEO.scaleCx - 58, y: GEO.base - 38, w: 116, h: 28 } };
  GEO.cyl = { cx: GEO.cylCx, w: 54, base: GEO.base, yBot: GEO.base - 14, ppm: 2.3 };
  GEO.cyl.yTop = GEO.cyl.yBot - 100 * GEO.cyl.ppm;
  GEO.cyl.x0 = GEO.cyl.cx - GEO.cyl.w / 2; GEO.cyl.x1 = GEO.cyl.cx + GEO.cyl.w / 2;
  GEO.cyl.surf0 = GEO.cyl.yBot - 50 * GEO.cyl.ppm;          // 처음 물 50 mL 눈금의 높이
  const LAY = PHONE ? {
    card: { x: 4, y: 376, w: 432, h: 120 },
    table: { x: 4, y: 502, w: 432, h: 114 },
  } : {
    card: { x: 556, y: 8, w: 228, h: 374 },
    table: { x: 8, y: 392, w: 776, h: 156 },
  };

  /* 측정 도구 상태 */
  const BN = {
    items: [], busy: null, drag: null, set: 1,
    odo: new Odo(1), level: new SciSim.Spring(50, { stiffness: 130, damping: 11 }),
    ripple: { x: GEO.cyl.cx, a: 0 }, readA: 0, dip: 0, platDip: 0,
    cells: {}, graph: [], graphLine: 0, flash: 0,
    current: null, hover: null,
  };
  const SETS = {
    1: [
      { id: 'A', kind: 'al', V: 10, m: 27.0, w: 30, h: 23, name: '알루미늄 조각 A' },
      { id: 'B', kind: 'al', V: 20, m: 54.0, w: 30, h: 46, name: '알루미늄 조각 B' },
      { id: 'C', kind: 'al', V: 30, m: 81.0, w: 30, h: 69, name: '알루미늄 조각 C' },
    ],
    2: [
      { id: 'X', kind: 'unk', real: 'fe', V: 10, m: 79.0, lump: true, r: 19, seed: 3, name: '금속 조각 X' },
      { id: 'Y', kind: 'unk', real: 'pb', V: 7, m: 79.1, lump: true, r: 17, seed: 11, name: '금속 조각 Y' },
    ],
  };
  const dOf = (it) => it.m / it.V;
  const itemH = (it) => (it.lump ? it.r * 1.9 : it.h);

  function slotX(i, n) {
    const T = GEO.tray, w = T.x1 - T.x0;
    return T.x0 + w * (i + 0.5) / n;
  }
  function loadSet(k) {
    sqCancel();
    BN.set = k; BN.busy = null; BN.drag = null; BN.cells = {}; BN.graph = []; BN.graphLine = 0; BN.current = null;
    BN.odo.jump(0); BN.level.value = 50; BN.level.target = 50; BN.level.velocity = 0; BN.readA = 0; BN.dip = 0;
    const list = SETS[k];
    BN.items = list.map((d, i) => {
      const it = Object.assign({}, d, { x: slotX(i, list.length), y: GEO.tray.y, lift: 0, sq: 0, shake: 0, where: 'tray', meas: { m: null, v: null }, appear: 0 });
      it.hx = it.x; it.hy = it.y;
      BN.cells[it.id] = { m: { pop: 0 }, v: { pop: 0 }, r: { pop: 0 } };
      tw(it, { appear: 1 }, 0.5, 'outBack');
      return it;
    });
    refreshReadouts();
  }
  const itemById = (id) => BN.items.find((q) => q.id === id);
  const allMeasured = () => BN.items.length > 0 && BN.items.every((q) => q.meas.m != null && q.meas.v != null);
  const countMeasured = () => BN.items.filter((q) => q.meas.m != null && q.meas.v != null).length;

  /* ---- 측정 동작 (시퀀스) ---- */
  function markCell(it, k) {
    const cell = BN.cells[it.id];
    cell[k].pop = 1; BN.flash = 1;
    if (it.meas.m != null && it.meas.v != null && cell.r.pop === 0 && !cell.r.done) {
      cell.r.done = true;
      after(0.5, () => {
        cell.r.pop = 1; Sound.success();
        BN.graph.push({ id: it.id, v: it.V, m: it.m, pop: 1, y: 0 });
        BN.graphLine = 0;
        if (allMeasured() && BN.set === 1) {
          const c = GEO.panel; celebrate(PHONE ? 220 : 650, PHONE ? 420 : 200);
        }
      });
    }
    BN.current = it.id;
    refreshReadouts();
  }
  function goHome(it, done) {
    BN.odo.set(0);
    it.where = 'tray';
    seq([
      (n) => { tw(it, { lift: 1 }, 0.1, 'outCubic'); arcTo(it, it.hx, it.hy, 0.6, n); },
      (n) => { tw(it, { lift: 0 }, 0.12, 'outCubic'); it.sq = 1; tw(it, { sq: 0 }, 0.45, 'outElastic', n); },
      () => { BN.busy = null; if (done) done(); },
    ]);
  }
  function stationScale(it, done) {
    BN.busy = it; it.where = 'scale';
    const G = GEO.scale;
    seq([
      (n) => { tw(it, { lift: 1 }, 0.08, 'outCubic'); arcTo(it, G.cx + (it.lump ? 0 : 0), G.rest, 0.5, n); },
      (n) => {
        tw(it, { lift: 0 }, 0.1, 'outCubic'); it.sq = 1; tw(it, { sq: 0 }, 0.5, 'outElastic');
        BN.platDip = 1; Sound.click(); BN.odo.set(it.m); after(1.5, n);
      },
      (n) => { it.meas.m = it.m; markCell(it, 'm'); Sound.tick(); after(0.5, n); },
      () => done && done(),
    ]);
  }
  function stationCyl(it, done) {
    BN.busy = it; it.where = 'cyl';
    const C = GEO.cyl, h = itemH(it);
    const rest = C.yBot - 1;
    seq([
      (n) => { tw(it, { lift: 1 }, 0.08, 'outCubic'); arcTo(it, C.cx, C.yTop - 26, 0.55, n); },
      (n) => { run(0.42, (e) => { it.y = lerp(C.yTop - 26, C.surf0 + 4, e); }, n, 'inQuad'); },
      (n) => { tw(it, { y: rest }, 0.85, 'outCubic', n); },
      (n) => { it.lift = 0; BN.readA = 0; tw(BN, { readA: 1 }, 0.5, 'outCubic'); after(1.5, n); },
      (n) => { it.meas.v = it.V; markCell(it, 'v'); Sound.tick(); after(0.55, n); },
      (n) => { tw(BN, { readA: 0 }, 0.25, 'outCubic'); run(0.9, (e) => { it.y = lerp(rest, C.yTop - 30, e); if (Math.random() < 0.35) dripFrom(it); }, n, 'inOutCubic'); },
      () => done && done(),
    ]);
  }
  /* 탭하면: 아직 안 잰 것부터 자동으로 (저울 → 실린더 → 제자리) */
  function autoMeasure(it) {
    if (BN.busy) return;
    const needM = it.meas.m == null, needV = it.meas.v == null;
    const fin = () => goHome(it);
    if (needM && needV) stationScale(it, () => { BN.odo.set(0); stationCyl(it, fin); });
    else if (needM) stationScale(it, fin);
    else if (needV) stationCyl(it, fin);
    else stationScale(it, fin);                      // 이미 잰 조각: 저울에서 다시 확인
  }
  function dripFrom(it) {
    if (RM) return;
    FX.emit({ x: it.x + rand(-9, 9), y: it.y - 4, vx: rand(-10, 10), vy: rand(10, 40), life: 0.7, size: rand(1.6, 2.8), color: '#7cc4ff', gravity: 620, fade: true });
  }
  function splashAt(x, y, k) {
    if (RM) return;
    for (let i = 0; i < 10; i++) FX.emit({ x: x + rand(-10, 10), y, vx: rand(-60, 60) * k, vy: -rand(80, 190) * k, life: 0.6, size: rand(1.6, 3.2), color: '#a9d8ff', gravity: 700, fade: true });
    for (let i = 0; i < 6; i++) FX.emit({ x: x + rand(-14, 14), y: y + rand(4, 26), vx: rand(-8, 8), vy: -rand(30, 70), life: rand(0.7, 1.3), size: rand(1.8, 4), color: '#ffffff', shape: 'bubble', gravity: -20, fade: true });
    BN.ripple.a = 5 * k; BN.ripple.x = GEO.cyl.cx;
  }

  /* ---- 갱신 ---- */
  let prevCylY = 0;
  function updateBench(dt) {
    BN.odo.update(dt);
    BN.level.update(dt);
    BN.ripple.a *= Math.exp(-2.2 * dt);
    BN.flash = Math.max(0, BN.flash - dt * 1.5);
    BN.platDip = Math.max(0, BN.platDip - dt * 2);
    BN.graphLine = Math.min(1, BN.graphLine + dt * 1.2);
    BN.graph.forEach((q) => { q.pop = Math.max(0, q.pop - dt * 1.1); });
    let inCyl = null;
    for (const it of BN.items) {
      if (it.where === 'cyl' && BN.busy === it) inCyl = it;
      it.shake = Math.max(0, it.shake - dt * 3);
      const c = BN.cells[it.id];
      ['m', 'v', 'r'].forEach((k) => { if (c[k].pop > 0) c[k].pop = Math.max(0, c[k].pop - dt * 1.6); });
    }
    const C = GEO.cyl;
    if (inCyl) {
      const h = itemH(inCyl), sub = clamp((inCyl.y - C.surf0) / h, 0, 1);
      BN.level.target = 50 + inCyl.V * sub;
      if (prevCylY <= C.surf0 && inCyl.y > C.surf0) splashAt(inCyl.x, C.surf0, 1);
      if (prevCylY > C.surf0 && inCyl.y <= C.surf0 + h * 0.5 && inCyl.y < prevCylY && BN.readA < 0.5) splashAt(inCyl.x, C.surf0, 0.45);
      prevCylY = inCyl.y;
    } else { BN.level.target = 50; prevCylY = 0; }
  }

  /* ---- 그리기: 배경 · 저울 · 눈금실린더 ---- */
  function drawBenchBg() {
    const P = GEO.panel;
    panel(P.x, P.y, P.w, P.h, 18, '#fff', 14, 4, 'rgba(30,50,100,.16)');
    ctx.save();
    ctx.beginPath(); D.roundRect(P.x, P.y, P.w, P.h, 18); ctx.clip();
    vgrad(ctx, P.x, P.y, P.w, GEO.base - P.y, '#fbfdff', '#e9f0fa');
    // 창문 빛
    const lg = ctx.createLinearGradient(P.x, P.y, P.x + P.w * 0.7, P.y + P.h * 0.8);
    lg.addColorStop(0, 'rgba(255,255,255,.55)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x + P.w * 0.55, P.y); ctx.lineTo(P.x + P.w * 0.2, GEO.base); ctx.lineTo(P.x, GEO.base); ctx.closePath(); ctx.fill();
    // 실험대
    vgrad(ctx, P.x, GEO.base, P.w, P.y + P.h - GEO.base, '#e3e9f3', '#c5d0e2');
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(P.x, GEO.base, P.w, 2);
    ctx.fillStyle = 'rgba(40,60,100,.1)'; ctx.fillRect(P.x, GEO.base + 2, P.w, 5);
    ctx.restore();
  }
  function drawTray() {
    const T = GEO.tray, w = T.x1 - T.x0;
    ctx.save();
    if (PHONE) {                                   // 벽 선반
      softShadow(T.x0 - 4, T.y, w + 8, 14, 5, 8, 4, 'rgba(30,50,100,.25)');
      const g = ctx.createLinearGradient(0, T.y, 0, T.y + 14); g.addColorStop(0, '#f3f6fb'); g.addColorStop(1, '#bcc8da');
      ctx.fillStyle = g; D.roundRect(T.x0 - 4, T.y, w + 8, 13, 4); ctx.fill();
      ctx.strokeStyle = '#8a9ab2'; ctx.lineWidth = 1.2; D.roundRect(T.x0 - 4, T.y, w + 8, 13, 4); ctx.stroke();
      ctx.strokeStyle = '#9aa8be'; ctx.lineWidth = 3;
      [T.x0 + 12, T.x1 - 12].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, T.y + 13); ctx.lineTo(x, T.y + 34); ctx.stroke(); });
    } else {                                       // 스테인리스 쟁반
      contactShadow((T.x0 + T.x1) / 2, GEO.base + 1, w / 2 + 6, 6, 0.9);
      const g = ctx.createLinearGradient(0, T.y, 0, GEO.base); g.addColorStop(0, '#f1f4f9'); g.addColorStop(0.5, '#c5cfdd'); g.addColorStop(1, '#8b99ae');
      ctx.fillStyle = g; D.roundRect(T.x0 - 6, T.y, w + 12, GEO.base - T.y, 6); ctx.fill();
      ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 1.4; D.roundRect(T.x0 - 6, T.y, w + 12, GEO.base - T.y, 6); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(T.x0 + 2, T.y + 2, w - 4, 2);
    }
    ctx.restore();
  }
  function drawScale() {
    const G = GEO.scale, c = ctx, dip = BN.platDip * 1.6;
    contactShadow(G.cx, GEO.base + 1, 100, 8, 1);
    // 몸체
    softShadow(G.x0, G.y0, G.x1 - G.x0, 44, 12, 10, 3, 'rgba(30,50,100,.22)');
    const g = c.createLinearGradient(0, G.y0, 0, GEO.base);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.15, '#eef2f8'); g.addColorStop(1, '#b9c5d7');
    c.fillStyle = g; D.roundRect(G.x0, G.y0, G.x1 - G.x0, 44, 12); c.fill();
    c.strokeStyle = '#91a1b8'; c.lineWidth = 1.6; D.roundRect(G.x0, G.y0, G.x1 - G.x0, 44, 12); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.85)'; D.roundRect(G.x0 + 8, G.y0 + 3, G.x1 - G.x0 - 16, 3, 2); c.fill();
    // 단추
    [G.x0 + 16, G.x1 - 16].forEach((x, i) => { D.sphere(x, G.y0 + 24, 6.5, i ? '#8b5cf6' : '#94a3b8', { gloss: true }); });
    // 접시 (스테인리스)
    const py = G.platY + dip;
    c.fillStyle = '#7d8aa0'; c.beginPath(); c.ellipse(G.cx, py + 5, 68, 12, 0, 0, TAU); c.fill();
    const pg = c.createLinearGradient(G.cx - 66, 0, G.cx + 66, 0);
    pg.addColorStop(0, '#cfd7e4'); pg.addColorStop(0.35, '#f8fafd'); pg.addColorStop(0.7, '#b8c3d3'); pg.addColorStop(1, '#8d9bb0');
    c.fillStyle = pg; c.beginPath(); c.ellipse(G.cx, py, 66, 11.5, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(G.cx, py, 61, 8.5, 0, Math.PI * 1.05, Math.PI * 1.7); c.stroke();
    c.strokeStyle = '#8393ab'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(G.cx, py, 66, 11.5, 0, 0, TAU); c.stroke();
    drawLCD(G.lcd.x, G.lcd.y, G.lcd.w, G.lcd.h, BN.odo, { digits: 5, unit: 'g', unitW: 24 });
  }
  function benchLabels() {
    // 도구 이름표
    const G = GEO.scale, C = GEO.cyl, T = GEO.tray;
    text(G.cx, GEO.base + (PHONE ? 22 : 28), '전자저울 (질량)', { size: 14, weight: 800, color: COL.muted });
    text(C.cx, GEO.base + (PHONE ? 22 : 28), '눈금실린더 (부피)', { size: 14, weight: 800, color: COL.muted });
    text((T.x0 + T.x1) / 2, GEO.base + (PHONE ? -98 : 28), BN.set === 1 ? '알루미늄 조각' : '모르는 금속 조각', { size: 14, weight: 800, color: COL.muted });
  }
  function drawCylinder(t) {
    const C = GEO.cyl, x0 = C.x0, x1 = C.x1;
    glassFoot({ cx: C.cx, w: C.w, yBot: C.yBot, base: C.base });
    const lvl = BN.level.value, ySurf = C.yBot - lvl * C.ppm;
    const insideItem = BN.items.filter((q) => q.where === 'cyl');
    vessel({
      x0, x1, yTop: C.yTop, yBot: C.yBot, t, amp: 0.5, men: 3.4, ripple: BN.ripple,
      path: (c) => tubeClosed(c, x0, C.yTop, C.w, C.yBot - C.yTop, 9),
      outline: (c) => tubeOpen(c, x0, C.yTop, C.w, C.yBot - C.yTop, 9, 5),
      layers: [{ y: ySurf, color: '#58aef5', alpha: 0.78 }],
      inside: (c) => { insideItem.forEach(drawItemBody); },
    });
    glassTicks({ cx: C.cx, w: C.w, yTop: C.yTop }, { zero: C.yBot, ppm: C.ppm, pxPerMl: C.ppm, max: 100, major: 10, minor: 2 });
    // 입구 위쪽 부분의 물체 (유리 밖으로 나온 부분)
    if (insideItem.length) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, C.yTop); ctx.clip();
      insideItem.forEach(drawItemBody); ctx.restore();
    }
    // 입구 테두리(앞쪽)
    ctx.strokeStyle = 'rgba(120,150,190,.9)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(C.cx, C.yTop - 1, C.w / 2 + 4, 3.4, 0, 0, Math.PI); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(C.cx, C.yTop - 2, C.w / 2 + 2, 2.6, 0, Math.PI * 1.1, Math.PI * 1.85); ctx.stroke();
  }
  /* 부피 읽기 표시 (처음 눈금선 · 현재 눈금 · +mL 괄호) */
  function drawVolumeReading() {
    const C = GEO.cyl, a = BN.readA;
    if (a < 0.02) return;
    const it = BN.items.find((q) => q.where === 'cyl');
    if (!it) return;
    const lvl = BN.level.value, yNow = C.yBot - lvl * C.ppm, y0 = C.surf0;
    ctx.save(); ctx.globalAlpha = a;
    D.dashedLine(C.x0 - 14, y0, C.x1 + 6, y0, { color: 'rgba(80,110,160,.8)', width: 1.6, dash: [5, 4] });
    text(C.x0 - 18, y0 + 4.5, '50', { size: 13, weight: 800, color: '#4b6a9b', align: 'right' });
    // 괄호
    const bx = C.x0 - 30;
    ctx.strokeStyle = COL.cold; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx + 5, y0); ctx.lineTo(bx, y0); ctx.lineTo(bx, yNow); ctx.lineTo(bx + 5, yNow); ctx.stroke();
    const mid = (y0 + yNow) / 2;
    pill(bx - 6, mid, '+' + Math.round(lvl - 50) + ' mL', { bg: COL.cold, size: 13.5, align: 'right', pad: 7 });
    // 현재 눈금 화살표
    const px = C.x1 + 30;
    pill(px, yNow, Math.round(lvl) + ' mL', { bg: '#1e3a8a', size: 14, align: 'left', pad: 8 });
    ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.moveTo(C.x1 + 24, yNow); ctx.lineTo(C.x1 + 33, yNow - 5); ctx.lineTo(C.x1 + 33, yNow + 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawItemBody(it) {
    const h = itemH(it), sx = 1 + it.sq * 0.12, sy = 1 - it.sq * 0.14;
    const lift = it.lift * 8, sc = 1 + it.lift * 0.05;
    ctx.save();
    ctx.translate(it.x + (it.shake ? Math.sin(CLK.t * 50) * 3 * it.shake : 0), it.y - lift);
    ctx.scale(sx * sc * it.appear, sy * sc * it.appear);
    if (it.lump) metalLump(0, 0, it.r, 'unk', it.id, it.seed);
    else metalBar(0, 0, it.w, it.h, it.kind, it.id);
    ctx.restore();
  }
  function groundBelow(it) {
    const T = GEO.tray, G = GEO.scale;
    if (it.x >= T.x0 - 8 && it.x <= T.x1 + 8 && it.y <= T.y + 2) return T.y + 1;
    if (Math.abs(it.x - G.cx) < 74 && it.y <= G.rest + 2) return G.rest + 2;
    return GEO.base + 1;
  }
  function drawItemShadow(it) {
    const gy = groundBelow(it), hgt = Math.max(0, gy - it.y), a = clamp(1 - hgt / 160, 0.2, 1) * it.appear;
    const r = (it.lump ? it.r * 1.1 : it.w * 0.62) * (1 + hgt / 300);
    contactShadow(it.x + 2, gy, r, r * 0.26, a * 0.9);
  }

  /* ---- 오른쪽 · 아래 카드: 질량-부피 그래프, 밀도표, 측정 기록표 ---- */
  const GR = { xmax: 40, ymax: 120 };
  function drawMVGraph() {
    const R = LAY.card;
    panel(R.x, R.y, R.w, R.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(R.x + 14, R.y + 26, '📈 질량–부피 그래프', { size: 15, weight: 800, color: COL.ink, align: 'left' });
    const P = PHONE ? { x0: R.x + 52, y0: R.y + 46, x1: R.x + R.w - 150, y1: R.y + R.h - 28 } : { x0: R.x + 46, y0: R.y + 54, x1: R.x + R.w - 18, y1: R.y + R.h - 178 };
    const X = (v) => P.x0 + (P.x1 - P.x0) * v / GR.xmax, Y = (m) => P.y1 - (P.y1 - P.y0) * m / GR.ymax;
    ctx.save();
    ctx.strokeStyle = 'rgba(120,135,160,.22)'; ctx.lineWidth = 1;
    for (let m = 0; m <= GR.ymax; m += 40) { ctx.beginPath(); ctx.moveTo(P.x0, Y(m)); ctx.lineTo(P.x1, Y(m)); ctx.stroke(); text(P.x0 - 7, Y(m) + 4.5, String(m), { size: 12.5, weight: 700, color: COL.muted, align: 'right' }); }
    for (let v = 0; v <= GR.xmax; v += 10) { ctx.beginPath(); ctx.moveTo(X(v), P.y0); ctx.lineTo(X(v), P.y1); ctx.stroke(); text(X(v), P.y1 + 16, String(v), { size: 12.5, weight: 700, color: COL.muted }); }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(P.x0, P.y0 - 4); ctx.lineTo(P.x0, P.y1); ctx.lineTo(P.x1 + 4, P.y1); ctx.stroke();
    text(P.x1, P.y1 + 30, '부피 (cm³)', { size: 12.5, weight: 800, color: COL.muted, align: 'right' });
    text(P.x0 + 6, P.y0 - 7, '질량 (g)', { size: 12.5, weight: 800, color: COL.muted, align: 'left' });
    // 점들을 지나는 직선
    const pts = BN.graph;
    if (pts.length >= 2) {
      const k = ease.outCubic(BN.graphLine);
      ctx.strokeStyle = rgba(COL.sub, 0.35); ctx.lineWidth = 9; ctx.lineCap = 'round';
      const mx = Math.max.apply(null, pts.map((q) => q.v)) + 6;
      const x2 = X(mx * k), y2 = Y(2.7 * mx * k);
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = COL.sub; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(x2, y2); ctx.stroke();
    }
    pts.forEach((q) => {
      const dropY = (1 - ease.outBounce(clamp(1 - q.pop, 0, 1))) * -40;
      D.sphere(X(q.v), Y(q.m) + dropY * q.pop, 7.5, '#e2464b', { gloss: true, shadow: true });
      text(X(q.v) + 11, Y(q.m) + 18, q.id, { size: 13, weight: 800, color: '#a3262b', align: 'left' });
    });
    ctx.restore();
    if (!PHONE) {
      const by = R.y + R.h - 138;
      ctx.fillStyle = pts.length >= 3 ? 'rgba(139,92,246,.1)' : '#f5f8fd'; D.roundRect(R.x + 10, by, R.w - 20, 128, 12); ctx.fill();
      ctx.strokeStyle = pts.length >= 3 ? 'rgba(139,92,246,.5)' : COL.line; ctx.lineWidth = 1.6; D.roundRect(R.x + 10, by, R.w - 20, 128, 12); ctx.stroke();
      const l = pts.length >= 3
        ? ['점이 한 직선 위에!', '크기(부피)가 달라도', '질량 ÷ 부피는 같아요.']
        : pts.length ? ['점이 하나씩 늘어나요.', '조각을 더 재 보세요.', ''] : ['측정한 조각이 점으로', '찍혀요. 조각을 눌러', '재 보세요.'];
      text(R.x + R.w / 2, by + 36, l[0], { size: 15.5, weight: 800, color: pts.length >= 3 ? COL.subD : COL.ink });
      text(R.x + R.w / 2, by + 66, l[1], { size: 14.5, weight: 700, color: COL.ink });
      text(R.x + R.w / 2, by + 94, l[2], { size: 14.5, weight: 700, color: COL.ink });
    } else {
      const lx = R.x + R.w - 142;
      const l = pts.length >= 3 ? ['점이 한 직선 위에!', '부피가 달라도', '질량 ÷ 부피는', '같아요.'] : ['측정한 조각이', '점으로 찍혀요.', '', ''];
      l.forEach((s, i) => text(lx, R.y + 62 + i * 22, s, { size: 14.5, weight: i === 0 ? 800 : 700, color: pts.length >= 3 && i === 0 ? COL.subD : COL.ink, align: 'left' }));
    }
  }
  function drawDensityCard() {
    const R = LAY.card;
    panel(R.x, R.y, R.w, R.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(R.x + 14, R.y + 26, '📋 밀도표 (g/cm³)', { size: 15, weight: 800, color: COL.ink, align: 'left' });
    const sel = PICK;
    if (!PHONE) {
      const y0 = R.y + 42, rh = 50;
      DENS.forEach((q, i) => {
        const y = y0 + i * rh, M = METAL[q.kind];
        const hl = sel.X === q.id ? 'X' : sel.Y === q.id ? 'Y' : '';
        ctx.fillStyle = hl ? 'rgba(139,92,246,.12)' : '#f5f8fd'; D.roundRect(R.x + 10, y, R.w - 20, rh - 6, 12); ctx.fill();
        if (hl) { ctx.strokeStyle = 'rgba(139,92,246,.6)'; ctx.lineWidth = 2; D.roundRect(R.x + 10, y, R.w - 20, rh - 6, 12); ctx.stroke(); }
        const g = ctx.createLinearGradient(0, y, 0, y + rh - 6); g.addColorStop(0, M.hi); g.addColorStop(1, M.lo);
        ctx.fillStyle = g; D.roundRect(R.x + 20, y + 8, 30, rh - 22, 8); ctx.fill();
        text(R.x + 62, y + 28, q.name, { size: 17, weight: 800, color: COL.ink, align: 'left' });
        text(R.x + R.w - 24, y + 29, String(q.d), { size: 20, weight: 800, color: '#1d4ed8', align: 'right' });
        if (hl) pill(R.x + R.w - 78, y + 14, hl, { bg: hl === 'X' ? '#64748b' : '#7c6bd6', size: 13, pad: 7 });
      });
      text(R.x + R.w / 2, y0 + 5 * rh + 14, '같은 물질은 밀도가 같아요', { size: 13.5, weight: 700, color: COL.muted });
    } else {
      const cw = (R.w - 20) / 5;
      DENS.forEach((q, i) => {
        const x = R.x + 10 + i * cw, M = METAL[q.kind], hl = sel.X === q.id ? 'X' : sel.Y === q.id ? 'Y' : '';
        ctx.fillStyle = hl ? 'rgba(139,92,246,.14)' : '#f5f8fd'; D.roundRect(x + 2, R.y + 40, cw - 4, R.h - 52, 10); ctx.fill();
        if (hl) { ctx.strokeStyle = 'rgba(139,92,246,.6)'; ctx.lineWidth = 2; D.roundRect(x + 2, R.y + 40, cw - 4, R.h - 52, 10); ctx.stroke(); }
        const g = ctx.createLinearGradient(0, R.y + 48, 0, R.y + 76); g.addColorStop(0, M.hi); g.addColorStop(1, M.lo);
        ctx.fillStyle = g; D.roundRect(x + cw / 2 - 14, R.y + 48, 28, 24, 6); ctx.fill();
        text(x + cw / 2, R.y + 92, q.name, { size: 14, weight: 800, color: COL.ink });
        text(x + cw / 2, R.y + 114, String(q.d), { size: 17, weight: 800, color: '#1d4ed8' });
        if (hl) pill(x + cw - 12, R.y + 50, hl, { bg: hl === 'X' ? '#64748b' : '#7c6bd6', size: 12, pad: 6 });
      });
    }
  }
  function drawDataTable() {
    const R = LAY.table, items = BN.items;
    panel(R.x, R.y, R.w, R.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    const ph = PHONE, rh = ph ? 25 : 34, hh = ph ? 26 : 34, fs = ph ? 15 : 19;
    const cols = ph ? [{ x: 12, w: 76 }, { x: 92, w: 96 }, { x: 190, w: 100 }, { x: 292, w: 136 }] : [{ x: 16, w: 130 }, { x: 150, w: 190 }, { x: 344, w: 190 }, { x: 538, w: 222 }];
    const heads = ph ? ['조각', '질량 (g)', '부피 (cm³)', '질량 ÷ 부피'] : ['조각', '질량 (g)', '부피 (cm³)', '질량 ÷ 부피 (g/cm³)'];
    const y0 = R.y + 8;
    ctx.fillStyle = '#f3f0ff'; D.roundRect(R.x + 8, y0, R.w - 16, hh, 10); ctx.fill();
    heads.forEach((h, i) => text(R.x + cols[i].x + cols[i].w / 2, y0 + hh / 2 + 5, h, { size: ph ? 13 : 15, weight: 800, color: COL.subD }));
    const ratios = items.map((q) => (q.meas.m != null && q.meas.v != null ? dOf(q) : null)).filter((v) => v != null);
    const allSame = BN.set === 1 && ratios.length >= 3 && ratios.every((v) => Math.abs(v - ratios[0]) < 1e-6);
    items.forEach((it, i) => {
      const y = y0 + hh + 4 + i * rh, cell = BN.cells[it.id];
      if (i % 2) { ctx.fillStyle = '#fafbfe'; D.roundRect(R.x + 8, y, R.w - 16, rh - 2, 8); ctx.fill(); }
      // 이름표
      const M = METAL[it.kind];
      const g = ctx.createLinearGradient(0, y, 0, y + rh); g.addColorStop(0, M.hi); g.addColorStop(1, M.lo);
      ctx.fillStyle = g; D.roundRect(R.x + cols[0].x + 6, y + 3, ph ? 24 : 30, rh - 8, 7); ctx.fill();
      text(R.x + cols[0].x + (ph ? 18 : 21), y + rh / 2 + 5, it.id, { size: ph ? 14 : 17, weight: 800, color: 'rgba(30,40,60,.75)' });
      const cur = BN.current === it.id;
      if (cur) { ctx.strokeStyle = 'rgba(139,92,246,.55)'; ctx.lineWidth = 2; D.roundRect(R.x + 8, y, R.w - 16, rh - 2, 8); ctx.stroke(); }
      const vals = [it.meas.m != null ? f1(it.m) : null, it.meas.v != null ? String(it.V) : null, it.meas.m != null && it.meas.v != null ? (Math.round(dOf(it) * 10) / 10).toFixed(1) : null];
      ['m', 'v', 'r'].forEach((k, j) => {
        const cc = cols[j + 1], v = vals[j], pop = cell[k].pop;
        const cx = R.x + cc.x + cc.w / 2, cy = y + rh / 2 + 6;
        if (pop > 0) { ctx.fillStyle = 'rgba(255,200,60,' + (0.5 * pop) + ')'; D.roundRect(R.x + cc.x + 6, y + 2, cc.w - 12, rh - 4, 8); ctx.fill(); }
        if (v == null) { text(cx, cy, '–', { size: fs, weight: 700, color: '#c3ccd9' }); return; }
        ctx.save(); ctx.translate(cx, cy - 6); const s = 1 + 0.35 * ease.outBack(pop) * pop; ctx.scale(s, s);
        text(0, 6, v, { size: fs + (k === 'r' ? 2 : 0), weight: 800, color: k === 'r' ? '#6d28d9' : COL.ink });
        ctx.restore();
      });
    });
    if (allSame) {
      const x = R.x + cols[3].x, w = cols[3].w, yy = y0 + hh + 4;
      ctx.strokeStyle = 'rgba(139,92,246,' + (0.55 + 0.35 * Math.sin(CLK.t * 4)) + ')'; ctx.lineWidth = 3;
      D.roundRect(R.x + x - R.x + 4, yy - 2, w - 8, rh * items.length + 2, 10); ctx.stroke();
      if (!PHONE) pill(R.x + R.w - 14, R.y + R.h - 18, '✨ 모두 같은 값!', { bg: COL.sub, size: 13.5, align: 'right', pad: 9 });
    }
  }

  /* =========================================================
     장면 2 · 액체 층 쌓기 (물엿 · 물 · 식용유) + 물체 띄우기
     ========================================================= */
  const LIQ = {
    syrup: { id: 'syrup', name: '물엿', d: 1.4, color: '#dc8a1f', mu: 14, flow: 9.5 },
    water: { id: 'water', name: '물', d: 1.0, color: '#3f9df3', mu: 1.2, flow: 6 },
    oil: { id: 'oil', name: '식용유', d: 0.92, color: '#f3d23c', mu: 2.4, flow: 7 },
  };
  const POUR_ML = 50, CAP_ML = 200;
  const BS = PHONE ? 0.72 : 1;                                 // 병 크기
  const BOT = [
    { id: 'syrup', bw: 64, bh: 74, nh: 16, nw: 28 },
    { id: 'water', bw: 46, bh: 104, nh: 22, nw: 22 },
    { id: 'oil', bw: 54, bh: 92, nh: 20, nw: 26 },
  ];
  const OBJS = [
    { id: 'wood', name: '나무', rho: 0.6, w: 38, h: 22, tip: '나무' },
    { id: 'plastic', name: '플라스틱', rho: 0.95, w: 25, h: 25, tip: '플라스틱 구슬' },
    { id: 'grape', name: '포도알', rho: 1.1, w: 28, h: 28, tip: '포도알' },
    { id: 'iron', name: '쇠구슬', rho: 7.9, w: 22, h: 22, tip: '쇠구슬' },
  ];
  const TG = PHONE ? {
    panel: { x: 4, y: 4, w: 432, h: 612 }, base: 456, shelf: 126,
    cyl: { cx: 220, w: 84, yBot: 442, ppm: 1.5 }, slots: [74, 220, 366],
    cards: [0, 1, 2, 3].map((i) => ({ x: 8 + i * 108, y: 490, w: 100, h: 120 })),
    info: null,
  } : {
    panel: { x: 8, y: 8, w: 776, h: 540 }, base: 500, shelf: 500,
    cyl: { cx: 400, w: 92, yBot: 486, ppm: 1.85 }, slots: [66, 142, 218],
    cards: [0, 1, 2, 3].map((i) => ({ x: 578 + (i % 2) * 102, y: 22 + Math.floor(i / 2) * 140, w: 96, h: 130 })),
    info: { x: 578, y: 308, w: 198, h: 178 },
  };
  TG.cyl.x0 = TG.cyl.cx - TG.cyl.w / 2; TG.cyl.x1 = TG.cyl.cx + TG.cyl.w / 2;
  TG.cyl.yTop = TG.cyl.yBot - CAP_ML * TG.cyl.ppm;
  TG.cyl.base = TG.cyl.yBot + 14;

  const TW = {
    stack: [], busy: null, pour: null, settle: null, ripple: { x: TG.cyl.cx, a: 0 }, bottles: [], objs: [],
    last: null, hintT: 0, stream: 0, tested: new Set(), dragging: null,
  };
  function shapeOf(d) {
    const s = BS, nw = d.nw * s / 2, nh = d.nh * s, bw = d.bw * s / 2, H = (d.nh + d.bh) * s, r = 11 * s, sh = 15 * s;
    const P = [[-nw, 0], [nw, 0], [nw, nh]];
    for (let i = 1; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; P.push([nw + (bw - nw) * Math.sin(a), nh + sh * (1 - Math.cos(a))]); }
    for (let i = 0; i <= 5; i++) { const a = (i / 5) * Math.PI / 2; P.push([bw - r + r * Math.cos(a), H - r + r * Math.sin(a)]); }
    for (let i = 0; i <= 5; i++) { const a = Math.PI / 2 + (i / 5) * Math.PI / 2; P.push([-bw + r + r * Math.cos(a), H - r + r * Math.sin(a)]); }
    for (let i = 6; i >= 1; i--) { const a = (i / 6) * Math.PI / 2; P.push([-(nw + (bw - nw) * Math.sin(a)), nh + sh * (1 - Math.cos(a))]); }
    P.push([-nw, nh]);
    return { P, nw, nh, bw, H };
  }
  function clipHalf(poly, gx, gy, h) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = a[0] * gx + a[1] * gy - h, db = b[0] * gx + b[1] * gy - h;
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  function polyArea(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
  function fillH(b, th) {                                   // 병이 th만큼 기울었을 때 액체 윗면의 위치 h (p·g ≥ h 가 액체)
    const gx = Math.sin(th), gy = Math.cos(th), target = b.level * b.A0;
    let lo = -400, hi = 400;
    for (let i = 0; i < 16; i++) { const mid = (lo + hi) / 2; if (polyArea(clipHalf(b.sh.P, gx, gy, mid)) > target) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  function pourAngle(b) {                                   // 액체가 입구 모서리에 닿기 시작하는 기울기
    let lo = 0.2, hi = 3.0;
    for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (fillH(b, mid) <= b.sh.nw * Math.sin(mid) + 0.5) hi = mid; else lo = mid; }
    return hi;
  }

  function initTower() {
    sqCancel();
    TW.stack = []; TW.busy = null; TW.pour = null; TW.settle = null; TW.last = null; TW.ripple.a = 0; TW.stream = 0; TW.tested = new Set(); TW.dragging = null;
    TW.bottles = BOT.map((d, i) => {
      const sh = shapeOf(d), A0 = polyArea(sh.P);
      const x = TG.slots[i], y = TG.shelf - sh.H;
      return { id: d.id, d, sh, A0, x, y, hx: x, hy: y, rot: 0, lift: 0, level: 0.8, used: false, appear: 0 };
    });
    TW.bottles.forEach((b, i) => { tw(b, { appear: 1 }, 0.5 + i * 0.12, 'outBack'); });
    TW.objs = OBJS.map((d, i) => Object.assign({}, d, {
      st: 'card', x: TG.cards[i].x + TG.cards[i].w / 2, y: TG.cards[i].y + 76, vy: 0, dx: [-12, 10, -4, 12][i], rot: 0, settled: false, lift: 0, appear: 0,
      cx: TG.cards[i].x + TG.cards[i].w / 2, cy: TG.cards[i].y + 76, still: 0, shake: 0,
    }));
    TW.objs.forEach((o, i) => { after(0.25 + i * 0.1, () => tw(o, { appear: 1 }, 0.45, 'outBack')); });
    refreshReadouts();
  }
  const stackH = () => TW.stack.reduce((s, l) => s + l.vol, 0);
  const layersDone = () => TW.stack.length === 3 && TW.stack.every((l) => l.vol >= POUR_ML - 0.01) && !TW.pour && !TW.settle;
  const sortedOK = () => TW.stack.every((l, i) => i === 0 || LIQ[TW.stack[i - 1].id].d >= LIQ[l.id].d);
  /* 현재 층의 띠 (위 · 아래 y). 쌓는 순서가 바뀌는 중이면 움직이는 값 */
  function bands() {
    const C = TG.cyl, out = [];
    const pos = (list) => { let y = C.yBot; return list.map((l) => { const h = l.vol * C.ppm, o = { id: l.id, y1: y, y0: y - h }; y -= h; return o; }); };
    const cur = pos(TW.stack);
    if (!TW.settle) return cur.map((b) => Object.assign(b, { rho: LIQ[b.id].d, mu: LIQ[b.id].mu }));
    const e = ease.inOutCubic(TW.settle.p);
    return cur.map((b, i) => {
      const to = TW.settle.to[b.id];
      return { id: b.id, y0: lerp(b.y0, to.y0, e), y1: lerp(b.y1, to.y1, e), rho: LIQ[b.id].d, mu: LIQ[b.id].mu };
    });
  }
  function startSettle() {
    const C = TG.cyl;
    const sorted = TW.stack.slice().sort((a, b) => LIQ[b.id].d - LIQ[a.id].d);
    let y = C.yBot; const to = {};
    sorted.forEach((l) => { const h = l.vol * C.ppm; to[l.id] = { y1: y, y0: y - h }; y -= h; });
    TW.settle = { p: 0, to, order: sorted, dur: 2.8 };
    showHint('밀도가 큰 액체가 아래로 가라앉아요!', 3600);
  }

  /* ---- 병 따르기 ---- */
  function pourBottle(b) {
    if (TW.busy || b.used) { if (b.used) b.shake = 1; return; }
    if (TW.settle) return;
    hideHint();
    const C = TG.cyl, L = LIQ[b.id], liquidTop = () => C.yBot - stackH() * C.ppm;
    TW.busy = b; b.used = true;
    TW.stack.push({ id: b.id, vol: 0 });
    const layer = TW.stack[TW.stack.length - 1];
    const tipY = C.yTop - 40 * BS - 8, dur = 2.1 + (b.id === 'syrup' ? 0.7 : 0);
    const th0 = pourAngle(b);
    const pose = { x: b.x, y: b.y };
    seq([
      (n) => { Sound.click(); tw(b, { lift: 1 }, 0.15, 'outCubic'); arcTo(b, C.cx - 20 - b.sh.nw, tipY - 8, 0.75, n, 70); run(0.75, (e) => { b.rot = th0 * 0.28 * e; }, null, 'inOutCubic'); },
      (n) => { run(0.6, (e) => { b.rot = lerp(th0 * 0.28, th0 + 0.04, e); }, n, 'inOutCubic'); },
      (n) => {
        TW.pour = { b, L, layer, t: 0, dur, th0 };
        const p0 = b.level;
        run(dur, (e) => {
          layer.vol = POUR_ML * e;
          b.level = p0 - 0.5 * e;
          b.rot = pourAngle(b) + 0.05;
          TW.stream = Math.min(1, e * 9) * (e > 0.94 ? (1 - e) / 0.06 : 1);
        }, n, 'linear');
      },
      (n) => { TW.pour = null; TW.stream = 0; layer.vol = POUR_ML; tw(b, { rot: 0.2 }, 0.5, 'inOutCubic'); after(0.35, n); },
      (n) => { if (!sortedOK()) startSettle(); n(); },
      (n) => { arcTo(b, b.hx, b.hy, 0.8, n, 60); run(0.8, (e) => { b.rot = lerp(0.2, 0, e); }, null, 'inOutCubic'); },
      (n) => { tw(b, { lift: 0 }, 0.12, 'outCubic'); b.sq = 1; tw(b, { sq: 0 }, 0.4, 'outElastic'); TW.busy = null; refreshReadouts(); n(); },
    ]);
  }
  /* 줄기가 떨어지는 길 (병 입구 → 액체 윗면) */
  function streamPath(b, y_s) {
    const th = b.rot, nw = b.sh.nw;
    const ox = b.x + Math.cos(th) * nw, oy = b.y + Math.sin(th) * nw;               // 아래쪽 입구 모서리
    const dirx = Math.sin(th), diry = -Math.cos(th);
    const sp = 70 + 30 * TW.stream;
    const vx = dirx * sp * 0.55, vy = Math.max(10, diry * sp);
    const g = 900;
    const dy = y_s - oy;
    const tl = dy <= 0 ? 0.05 : (-vy + Math.sqrt(vy * vy + 2 * g * dy)) / g;
    const pts = [];
    const n = 14;
    for (let i = 0; i <= n; i++) { const s = (tl * i) / n; pts.push([ox + vx * s, oy + vy * s + 0.5 * g * s * s, s]); }
    return { pts, tl, ox, oy, vx, xl: ox + vx * tl };
  }
  function drawStream() {
    const P = TW.pour;
    if (!P || TW.stream < 0.02) return;
    const C = TG.cyl, b = P.b, L = P.L;
    const ys = C.yBot - stackH() * C.ppm;
    const sp = streamPath(b, ys);
    const w0 = L.flow * TW.stream * (PHONE ? 0.85 : 1);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pts = sp.pts;
    const wob = (s) => (b.id === 'syrup' ? Math.sin(s * 22 - CLK.t * 7) * 1.6 : Math.sin(s * 40 - CLK.t * 20) * 0.5);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], c = pts[i];
        const w = (pass ? w0 * 0.3 : w0) * (1 - 0.4 * (c[2] / Math.max(0.05, sp.tl))) + (pass ? 0 : Math.abs(wob(c[2])));
        ctx.strokeStyle = pass ? 'rgba(255,255,255,.55)' : tint(L.color, 0.05, 0.92);
        ctx.lineWidth = Math.max(1.4, w);
        ctx.beginPath(); ctx.moveTo(a[0] + (pass ? -w0 * 0.18 : 0), a[1]); ctx.lineTo(c[0] + (pass ? -w0 * 0.18 : 0), c[1]); ctx.stroke();
      }
    }
    ctx.restore();
    // 떨어지는 곳: 물결 + 방울
    if (Math.random() < 0.5 && !RM) {
      const k = b.id === 'syrup' ? 0.4 : 1;
      FX.emit({ x: sp.xl + rand(-6, 6), y: ys - 1, vx: rand(-40, 40) * k, vy: -rand(40, 130) * k, life: 0.35, size: rand(1.4, 2.6), color: tint(L.color, 0.3, 1).replace('rgba', 'rgba'), gravity: 700, fade: true });
    }
    TW.ripple.x = sp.xl; TW.ripple.a = Math.max(TW.ripple.a, 2.6 * TW.stream);
  }

  /* ---- 물체 떨어뜨리기 · 꺼내기 · 떠오르는 움직임 ----
     o.x = 가운데 x, o.y = 아랫면 y.  st: card(카드) → drag(끄는 중) / fly(날아가는 중) → phys(액체 속) → out(꺼내는 중) */
  function dropObj(o) {                                    // 카드를 누르기만 해도 열린 입구로 날아가 들어가요
    if (TW.busy || o.st !== 'card') return;
    if (!layersDone()) { toast('먼저 액체를 3층으로 쌓아요.', '', 1800); o.shake = 1; return; }
    hideHint();
    const C = TG.cyl;
    TW.busy = o; o.st = 'fly'; o.settled = false; o.vy = 0; o.still = 0; o.x = o.cx; o.y = o.cy;
    seq([
      (n) => { Sound.click(); tw(o, { lift: 1 }, 0.1, 'outCubic'); arcTo(o, C.cx + o.dx, C.yTop - 24, 0.7, n, 70); },
      (n) => { o.st = 'phys'; o.lift = 0; o.vy = 0; TW.busy = null; refreshReadouts(); n(); },
    ]);
  }
  function releaseObj(o) {                                  // 끌던 물체를 입구 위에서 놓음 → 떨어져요
    const C = TG.cyl, lim = C.w / 2 - o.w / 2 - 5;
    o.dx = clamp(o.x - C.cx, -lim, lim);
    tw(o, { x: C.cx + o.dx, lift: 0 }, 0.12, 'outCubic');
    o.st = 'phys'; o.settled = false; o.vy = 0; o.still = 0;
    Sound.click(); refreshReadouts();
  }
  function takeOut(o) {
    if (TW.busy || (o.st !== 'phys' && o.st !== 'fly')) return;
    const C = TG.cyl;
    TW.busy = o; o.st = 'out'; o.settled = false; o.rot = 0; o.vy = 0;
    seq([
      (n) => { Sound.click(); tw(o, { lift: 1 }, 0.1, 'outCubic'); tw(o, { y: C.yTop - 24, x: C.cx + o.dx }, 0.7, 'inOutCubic', n); },
      (n) => { arcTo(o, o.cx, o.cy, 0.7, n, 50); },
      () => { o.st = 'card'; o.lift = 0; o.x = o.cx; o.y = o.cy; TW.busy = null; if (TW.last === o.id) TW.last = null; refreshReadouts(); },
    ]);
  }
  function returnObj(o) {                                   // 입구에 못 놓았으면 카드로 돌아가요
    o.st = 'out'; o.vy = 0;
    arcTo(o, o.cx, o.cy, 0.5, () => { o.st = 'card'; o.lift = 0; o.x = o.cx; o.y = o.cy; refreshReadouts(); }, 40);
    tw(o, { lift: 0 }, 0.4, 'outCubic');
  }
  /* 물체(아랫면 y, 높이 hh)가 받는 평균 액체 밀도: 액체에 잠긴 부분의 밀도를 높이로 평균 */
  function rfAt(y, hh, bs) {
    let r = 0;
    for (const b of bs) r += b.rho * Math.max(0, Math.min(y, b.y1) - Math.max(y - hh, b.y0));
    return r / hh;
  }
  /* 물체가 멈출 위치: 물체의 밀도 = 잠긴 곳의 평균 액체 밀도 (밀도가 더 큰 곳 → 가라앉고, 작은 곳 → 떠올라요) */
  function eqY(o, bs) {
    const C = TG.cyl, bottom = C.yBot - 1;
    if (!bs.length) return bottom;
    if (rfAt(bottom, o.h, bs) <= o.rho) return bottom;
    let lo = Math.min.apply(null, bs.map((b) => b.y0)) - o.h, hi = bottom;
    for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (rfAt(mid, o.h, bs) < o.rho) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  function stepObj(o, dt) {
    const C = TG.cyl, bs = bands(), bottom = C.yBot - 1, sub = 4, h = dt / sub;
    const surf = bs.length ? Math.min.apply(null, bs.map((b) => b.y0)) : C.yBot;
    const eq = eqY(o, bs);
    for (let s = 0; s < sub; s++) {
      if (o.y < surf) {                                     // 공기 중: 떨어져요
        o.vy += 1100 * h; o.y += o.vy * h;
        if (o.y >= surf) { o.y = surf; splashObj(o, o.vy); }
        continue;
      }
      let mu = 1.2; const mid = o.y - o.h / 2;
      for (const b of bs) if (mid >= b.y0 && mid <= b.y1) mu = b.mu;
      const vmax = (105 + 40 * Math.min(o.rho, 8)) / (1 + 0.1 * (mu - 1.2));
      o.vy += (46 * (eq - o.y) - 7.2 * o.vy) * h;           // 멈출 위치로 끌려가며 살짝 출렁여요
      o.vy = clamp(o.vy, -vmax, vmax);
      o.y += o.vy * h;
      if (o.y > bottom) { o.y = bottom; o.vy = o.vy > 60 ? -o.vy * 0.18 : 0; if (o.vy < 0) Sound.tick(); }
    }
    o.rot = clamp(o.vy * 0.0016, -0.2, 0.2) + (RM ? 0 : Math.sin(CLK.t * 1.3 + o.dx) * 0.03);
    if (Math.abs(o.vy) < 6 && Math.abs(eq - o.y) < 4) o.still += dt; else o.still = 0;
    const was = o.settled;
    o.settled = o.still > 0.6;
    if (o.settled && !was) { TW.last = o.id; TW.tested.add(o.id); refreshReadouts(); }
  }

  /* 물체가 어느 층에 떠 있는지 말로 */
  function placeText(o) {
    const bs = bands();
    if (!bs.length) return '';
    if (o.y > TG.cyl.yBot - 3) return '맨 아래(바닥)';
    const mid = o.y - o.h / 2, surf = bs[bs.length - 1].y0, nm = (i) => LIQ[bs[i].id].name;
    if (mid < surf + 1) return nm(bs.length - 1) + ' 위';
    for (let i = bs.length - 1; i > 0; i--) { if (Math.abs(mid - bs[i].y1) < o.h * 0.75) return nm(i) + wa(nm(i)) + ' ' + nm(i - 1) + ' 사이'; }
    for (let i = bs.length - 1; i >= 0; i--) { if (mid >= bs[i].y0 && mid <= bs[i].y1) return nm(i) + ' 층'; }
    return '';
  }

  function updateTower(dt) {
    TW.ripple.a *= Math.exp(-2.4 * dt);
    TW.bottles.forEach((b) => { b.shake = Math.max(0, (b.shake || 0) - dt * 3); });
    if (TW.settle) {
      const S2 = TW.settle;
      S2.p = Math.min(1, S2.p + dt / S2.dur);
      if (!RM && Math.random() < dt * 14) {                  // 가라앉는 방울
        const bs = bands(), pick = bs[Math.floor(Math.random() * bs.length)], C = TG.cyl;
        FX.emit({ x: C.cx + rand(-C.w * 0.35, C.w * 0.35), y: (pick.y0 + pick.y1) / 2, vx: rand(-6, 6), vy: rand(30, 90), life: 0.7, size: rand(1.8, 3.4), color: LIQ[pick.id].color, gravity: 40, fade: true, alpha: 0.8 });
      }
      if (S2.p >= 1) { TW.stack = S2.order; TW.settle = null; refreshReadouts(); }
    }
    TW.objs.forEach((o) => {
      o.shake = Math.max(0, (o.shake || 0) - dt * 3);
      if (o.st === 'phys') stepObj(o, dt);
    });
  }
  function splashObj(o, speed) {
    if (RM) return;
    const C = TG.cyl, surf = C.yBot - stackH() * C.ppm, bs = bands(), top = bs.length ? bs[bs.length - 1] : null;
    const col = top ? LIQ[top.id].color : '#8cc8ff', k = clamp(speed / 500, 0.35, 1.2);
    for (let i = 0; i < 9; i++) FX.emit({ x: o.x + rand(-8, 8), y: surf, vx: rand(-45, 45) * k, vy: -rand(60, 170) * k, life: 0.55, size: rand(1.5, 3), color: col, gravity: 700, fade: true });
    TW.ripple.x = o.x; TW.ripple.a = Math.max(TW.ripple.a, 4.4 * k);
    Sound.tick();
  }

  /* ---- 그리기 ---- */
  function drawObjShape(o, x, y, sc, rot) {                // (x, y) = 물체의 가운데
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(sc, sc);
    if (o.id === 'wood') {
      const w = o.w, h = o.h, g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, '#d7a46c'); g.addColorStop(1, '#a8723a');
      ctx.fillStyle = g; D.roundRect(-w / 2, -h / 2, w, h, 4); ctx.fill();
      ctx.strokeStyle = '#7a4d22'; ctx.lineWidth = 1.3; D.roundRect(-w / 2, -h / 2, w, h, 4); ctx.stroke();
      ctx.strokeStyle = 'rgba(100,60,20,.45)'; ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 4, i * 5); ctx.quadraticCurveTo(0, i * 5 + 2.5, w / 2 - 4, i * 5 - 1); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-w / 2 + 4, -h / 2 + 3, w - 8, 2);
    } else if (o.id === 'plastic') {
      D.sphere(0, 0, o.w / 2, '#f0508a', { gloss: true, outline: 'rgba(120,20,60,.5)', outlineWidth: 1.2 });
    } else if (o.id === 'grape') {
      D.sphere(0, 1, o.w / 2, '#7c3aed', { gloss: true, outline: 'rgba(50,10,100,.5)', outlineWidth: 1.2 });
      ctx.strokeStyle = '#3f6212'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -o.w / 2 + 1); ctx.lineTo(2, -o.w / 2 - 5); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(0, 4, o.w * 0.3, o.w * 0.18, 0, 0, TAU); ctx.fill();
    } else {
      D.sphere(0, 0, o.w / 2, '#6b7280', { gloss: true, light: '#e5e7eb', dark: '#1f2937', outline: 'rgba(20,25,40,.6)', outlineWidth: 1.2 });
    }
    ctx.restore();
  }
  function drawBottle(b) {
    const d = b.d, L = LIQ[b.id], sh = b.sh, th = b.rot;
    const sq = b.sq || 0, lift = b.lift;
    ctx.save();
    ctx.translate(b.x + (b.shake ? Math.sin(CLK.t * 50) * 3 * b.shake : 0), b.y - lift * 6);
    ctx.scale(b.appear * (1 + sq * 0.05), b.appear * (1 - sq * 0.06));
    ctx.rotate(th);
    const path = () => { ctx.beginPath(); sh.P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
    // 유리병 몸체
    const gx0 = -sh.bw, gx1 = sh.bw;
    const gg = ctx.createLinearGradient(gx0, 0, gx1, 0);
    gg.addColorStop(0, 'rgba(210,225,245,.65)'); gg.addColorStop(0.35, 'rgba(255,255,255,.35)'); gg.addColorStop(1, 'rgba(190,208,232,.6)');
    ctx.fillStyle = gg; path(); ctx.fill();
    // 액체
    const gxv = Math.sin(th), gyv = Math.cos(th);
    const h = fillH(b, th);
    const poly = clipHalf(sh.P, gxv, gyv, h);
    if (poly.length > 2 && b.level > 0.01) {
      ctx.save(); path(); ctx.clip();
      const lg = ctx.createLinearGradient(gx0, 0, gx1, 0);
      lg.addColorStop(0, tint(L.color, 0.18, 0.92)); lg.addColorStop(0.45, tint(L.color, 0.3, 0.9)); lg.addColorStop(1, tint(L.color, -0.18, 0.95));
      ctx.fillStyle = lg; ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
      // 액체 윗면의 반짝임
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
      const sx = -gyv, sy = gxv;                                   // 윗면 방향
      const cx0 = gxv * h, cy0 = gyv * h;
      ctx.beginPath(); ctx.moveTo(cx0 - sx * sh.bw, cy0 - sy * sh.bw); ctx.lineTo(cx0 + sx * sh.bw, cy0 + sy * sh.bw); ctx.stroke();
      ctx.restore();
    }
    // 유리 윤곽 + 빛
    ctx.strokeStyle = 'rgba(110,140,185,.95)'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; path(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-sh.bw + 6 * BS, sh.nh + 22 * BS); ctx.lineTo(-sh.bw + 6 * BS, sh.H - 20 * BS); ctx.stroke();
    // 병 입구 테두리
    ctx.fillStyle = 'rgba(120,150,190,.9)'; D.roundRect(-sh.nw - 2.5, -3, sh.nw * 2 + 5, 5, 2); ctx.fill();
    // 이름표 (기울면 흐려져요)
    const la = clamp(1 - th / 0.9, 0, 1);
    if (la > 0.02) {
      ctx.globalAlpha = la;
      ctx.fillStyle = 'rgba(255,255,255,.92)'; D.roundRect(-sh.bw + 4 * BS, sh.nh + 36 * BS, sh.bw * 2 - 8 * BS, 24 * BS, 5 * BS); ctx.fill();
      ctx.font = D.font(Math.max(12, 14 * BS), 800); ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(L.name, 0, sh.nh + 48.5 * BS);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function drawTowerBg() {
    const P = TG.panel;
    panel(P.x, P.y, P.w, P.h, 18, '#fff', 14, 4, 'rgba(30,50,100,.16)');
    ctx.save();
    ctx.beginPath(); D.roundRect(P.x, P.y, P.w, P.h, 18); ctx.clip();
    vgrad(ctx, P.x, P.y, P.w, TG.base - P.y, '#fbfdff', '#e9f0fa');
    const lg = ctx.createLinearGradient(P.x, P.y, P.x + P.w * 0.6, P.y + P.h * 0.8);
    lg.addColorStop(0, 'rgba(255,255,255,.55)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x + P.w * 0.5, P.y); ctx.lineTo(P.x + P.w * 0.15, TG.base); ctx.lineTo(P.x, TG.base); ctx.closePath(); ctx.fill();
    vgrad(ctx, P.x, TG.base, P.w, P.y + P.h - TG.base, '#e3e9f3', '#c5d0e2');
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(P.x, TG.base, P.w, 2);
    ctx.fillStyle = 'rgba(40,60,100,.1)'; ctx.fillRect(P.x, TG.base + 2, P.w, 5);
    if (PHONE) {                                           // 병 선반
      const g = ctx.createLinearGradient(0, TG.shelf, 0, TG.shelf + 14); g.addColorStop(0, '#f3f6fb'); g.addColorStop(1, '#b5c2d6');
      ctx.fillStyle = g; D.roundRect(P.x + 10, TG.shelf, P.w - 20, 13, 5); ctx.fill();
      ctx.strokeStyle = '#8a9ab2'; ctx.lineWidth = 1.2; D.roundRect(P.x + 10, TG.shelf, P.w - 20, 13, 5); ctx.stroke();
    }
    ctx.restore();
  }
  function drawTowerCylinder(t) {
    const C = TG.cyl, bs = bands();
    glassFoot({ cx: C.cx, w: C.w, yBot: C.yBot, base: C.base });
    const layers = bs.map((b, i) => {
      const L = LIQ[b.id], inTrans = !!TW.settle, p = inTrans ? Math.sin(Math.PI * TW.settle.p) : 0;
      return {
        y: b.y0, yb: inTrans ? b.y1 : null, color: L.color, alpha: 0.86,
        wob: inTrans ? (x) => Math.sin(x * 0.17 + i * 2.1 + CLK.t * 4) * 5 * p : null,
        wobB: inTrans ? (x) => Math.sin(x * 0.17 + i * 2.1 + 1 + CLK.t * 4) * 5 * p : null,
      };
    });
    const objs = TW.objs.filter(inTube);
    vessel({
      x0: C.x0, x1: C.x1, yTop: C.yTop, yBot: C.yBot, t, amp: 0.7, iamp: 0.5, men: 3, ripple: TW.ripple,
      path: (c) => tubeClosed(c, C.x0, C.yTop, C.w, C.yBot - C.yTop, 12),
      outline: (c) => tubeOpen(c, C.x0, C.yTop, C.w, C.yBot - C.yTop, 12, 6),
      layers,
      inside: (c) => { objs.forEach((o) => drawObjShape(o, o.x, o.y - o.h / 2 - o.lift * 4, 1, o.rot)); },
    });
    glassTicks({ cx: C.cx, w: C.w, yTop: C.yTop }, { zero: C.yBot, ppm: C.ppm, pxPerMl: C.ppm, max: CAP_ML, major: 50, minor: 10 });
    ctx.strokeStyle = 'rgba(120,150,190,.9)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(C.cx, C.yTop - 1, C.w / 2 + 5, 4, 0, 0, Math.PI); ctx.stroke();
    // 층 이름표 (오른쪽)
    bs.forEach((b) => {
      const L = LIQ[b.id], my = (b.y0 + b.y1) / 2;
      const lx = C.x1 + 24;
      ctx.fillStyle = L.color; circle(ctx, lx - 9, my, 5.5); ctx.fill();
      ctx.strokeStyle = tint(L.color, -0.3, 0.5); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(C.x1 + 2, my); ctx.lineTo(lx - 14, my); ctx.stroke();
      pill(lx, my, L.name + ' ' + dS(L.d), { bg: '#fff', color: COL.ink, size: 14, align: 'left', pad: 8, border: tint(L.color, -0.1, 0.9) });
    });
  }
  function drawObjCards() {
    TW.objs.forEach((o, i) => {
      const c = TG.cards[i], inCyl = o.st === 'phys';
      const away = o.st !== 'card';
      const locked = !layersDone() && o.st === 'card';
      ctx.save();
      ctx.globalAlpha = (locked ? 0.55 : away && !inCyl ? 0.7 : 1) * o.appear;
      const sh = o.shake ? Math.sin(CLK.t * 50) * 3 * o.shake : 0;
      ctx.translate(sh, 0);
      panel(c.x, c.y, c.w, c.h, 14, inCyl ? '#f1edff' : '#fff', 8, 3, 'rgba(30,50,100,.16)');
      ctx.strokeStyle = inCyl ? 'rgba(139,92,246,.5)' : COL.line; ctx.lineWidth = 1.6; D.roundRect(c.x, c.y, c.w, c.h, 14); ctx.stroke();
      text(c.x + c.w / 2, c.y + 22, o.name, { size: PHONE ? 13 : 14.5, weight: 800, color: COL.ink });
      if (!away) drawObjShape(o, o.cx, o.cy - 4, 1.0, 0);
      else if (inCyl) text(c.x + c.w / 2, c.y + 76, '↩ 꺼내기', { size: 13, weight: 800, color: COL.subD });
      else { ctx.strokeStyle = 'rgba(139,92,246,.35)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; circle(ctx, o.cx, o.cy - 4, 20); ctx.stroke(); ctx.setLineDash([]); }
      text(c.x + c.w / 2, c.y + c.h - 12, dS(o.rho) + ' g/cm³', { size: PHONE ? 13 : 14.5, weight: 800, color: '#1d4ed8' });
      if (locked) text(c.x + c.w - 14, c.y + 20, '🔒', { size: 13 });
      ctx.restore();
    });
  }
  const inTube = (o) => o.st === 'phys' || ((o.st === 'fly' || o.st === 'out' || o.st === 'drag') && Math.abs(o.x - TG.cyl.cx) < TG.cyl.w / 2 + 2 && o.y > TG.cyl.yTop);
  function drawFlyingObjs() {
    const C = TG.cyl;
    // 유리 밖으로 나온 부분(입구 위)과 날아가는 물체
    TW.objs.forEach((o) => {
      if (o.st === 'card') return;
      const tube = o.st === 'phys' || Math.abs(o.x - C.cx) < C.w / 2 + 2;
      if (tube && o.y - o.h > C.yTop) return;                // 완전히 유리 속
      ctx.save();
      if (tube) { ctx.beginPath(); ctx.rect(0, 0, VW, C.yTop); ctx.clip(); }
      else if (o.st !== 'phys') contactShadow(o.x, TG.base, 16 + o.lift * 4, 4, 0.5 - o.lift * 0.15);
      drawObjShape(o, o.x, o.y - o.h / 2 - o.lift * 6, 1 + o.lift * 0.1, o.rot);
      ctx.restore();
    });
    // 끌고 있을 때: 놓을 곳 표시
    if (TW.dragging || TD.o && TD.moved) {
      const a = 0.5 + 0.5 * Math.sin(CLK.t * 6);
      ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.5 + 0.4 * a); ctx.lineWidth = 3; ctx.setLineDash([7, 6]);
      ctx.beginPath(); ctx.ellipse(C.cx, C.yTop - 4, C.w / 2 + 16, 11, 0, 0, TAU); ctx.stroke(); ctx.restore();
      pill(C.cx, C.yTop - 32, '여기에 놓아요', { bg: COL.subD, size: 13, pad: 9 });
    }
  }
  function drawShelfLabels() {
    TW.bottles.forEach((b, i) => {
      const L = LIQ[b.id], x = TG.slots[i], y = TG.base + (PHONE ? 0 : 26);
      if (PHONE) return;
      pill(x, y, L.name + ' ' + dS(L.d), { bg: '#fff', color: COL.ink, size: 13.5, pad: 8, border: tint(L.color, -0.1, 0.9) });
    });
  }
  function drawInfoCard() {
    const R = TG.info;
    if (!R) return;
    panel(R.x, R.y, R.w, R.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(R.x + 14, R.y + 26, '💡 뜨고 가라앉는 까닭', { size: 15, weight: 800, color: COL.ink, align: 'left' });
    const o = TW.objs.find((q) => q.id === TW.last && q.st === 'phys');
    const lines = [];
    if (!layersDone()) lines.push('물엿 → 물 → 식용유 순서로', '부어 3층을 쌓아요.', '', '밀도가 큰 액체가 아래!');
    else if (!o) lines.push('물체 카드를 끌어서', '눈금실린더에 넣어 보세요.', '', '넣은 물체는 눌러서 꺼내요.');
    else {
      const bs = bands(), bottom = o.y > TG.cyl.yBot - 3;
      lines.push(o.name + ' (' + dS(o.rho) + ')', placeText(o) + (bottom ? '에 있어요.' : '에 멈췄어요.'));
      if (bottom) lines.push('모든 액체보다 밀도가 커서', '바닥까지 가라앉아요.');
      else {
        const top = bs[bs.length - 1];                          // 윗면에 닿은 액체 (식용유)
        if (o.rho < LIQ[top.id].d) lines.push('밀도가 ' + LIQ[top.id].name + '(' + dS(LIQ[top.id].d) + ')보다', '작아서 맨 위에 떠요.');
        else {
          let above = null, below = null;
          bs.slice().reverse().forEach((b) => { if (LIQ[b.id].d < o.rho) above = b; else if (!below) below = b; });
          lines.push(above ? '밀도가 ' + LIQ[above.id].name + '(' + dS(LIQ[above.id].d) + ')보다 크고' : '', below ? LIQ[below.id].name + '(' + dS(LIQ[below.id].d) + ')보다 작아요.' : '');
        }
      }
    }
    lines.slice(0, 5).forEach((s, i) => text(R.x + R.w / 2, R.y + 58 + i * 25, s, { size: 14.5, weight: i === 0 && o ? 800 : 700, color: i === 0 && o ? COL.subD : COL.ink }));
  }
  function drawTower(t) {
    drawTowerBg();
    // 병
    drawShelfLabels();
    TW.bottles.forEach((b) => { if (b !== TW.busy) { contactShadow(b.hx, TG.shelf + 1, b.sh.bw + 4, 5, 0.9 * b.appear); drawBottle(b); } });
    drawTowerCylinder(t);
    drawFlyingObjs();
    if (TW.busy && TW.busy.sh) { drawBottle(TW.busy); }
    drawStream();
    drawObjCards();
    if (!PHONE) drawInfoCard();
    // 층/물체 안내 말풍선
    if (TW.settle) {
      const C = TG.cyl;
      pill(C.cx, C.yTop - 14, '⬇ 밀도가 큰 것이 아래로', { bg: COL.subD, size: 14, pad: 10 });
    }
  }
  /* ---- 입력: 병은 누르면 따라요 · 물체 카드는 끌어서(또는 눌러서) 넣고, 넣은 물체는 눌러서 꺼내요 ---- */
  const TD = { o: null, moved: false, sx: 0, sy: 0 };
  function towerObjAt(p) {
    for (let i = TW.objs.length - 1; i >= 0; i--) {
      const o = TW.objs[i], c = TG.cards[i];
      if (o.st === 'card' && inRect(p, c, 4)) return o;
      if (o.st === 'phys' && (inRect(p, c, 4) || (Math.abs(p.x - o.x) < TG.cyl.w / 2 + 14 && p.y > o.y - o.h - 8 && p.y < o.y + 6))) return o;
    }
    return null;
  }
  function towerBottleAt(p) {
    for (const b of TW.bottles) {
      if (b.used || TW.busy === b) continue;
      if (p.x > b.hx - b.sh.bw - 8 && p.x < b.hx + b.sh.bw + 8 && p.y > b.hy - 6 && p.y < TG.shelf + 8) return b;
    }
    return null;
  }
  function towerHover(p) {
    if (towerBottleAt(p)) return 'pointer';
    const o = towerObjAt(p);
    return o ? (o.st === 'card' ? 'grab' : 'pointer') : null;
  }
  function towerDown(p) {
    const b = towerBottleAt(p);
    if (b) { pourBottle(b); return false; }
    const o = towerObjAt(p);
    if (o) {
      if (o.st === 'card') {
        if (TW.busy) { o.shake = 1; return false; }
        if (!layersDone()) { dropObj(o); return false; }            // 안내 말풍선만 보여 줘요
        TD.o = o; TD.moved = false; TD.sx = p.x; TD.sy = p.y;
        Sound.click();
        return true;
      }
      takeOut(o);
      return false;
    }
    // 이미 사용한 병을 누르면 살짝 흔들기
    for (const bb of TW.bottles) if (bb.used && p.x > bb.hx - bb.sh.bw && p.x < bb.hx + bb.sh.bw && p.y > bb.hy && p.y < TG.shelf + 8) { bb.shake = 1; showHint('이 병은 이미 부었어요. ↺를 누르면 다시 시작해요.', 2600); return false; }
    return false;
  }
  function towerMove(p) {
    const o = TD.o;
    if (!o) return;
    if (!TD.moved && Math.hypot(p.x - TD.sx, p.y - TD.sy) > 8) {
      TD.moved = true; o.st = 'drag'; o.x = o.cx; o.y = o.cy + o.h / 2;
      tw(o, { lift: 1 }, 0.12, 'outCubic');
    }
    if (TD.moved) { o.x = clamp(p.x, 24, VW - 24); o.y = clamp(p.y + o.h / 2 + 4, 40, TG.base); o.vy = 0; }
  }
  function towerUp(p) {
    const o = TD.o;
    if (!o) return;
    TD.o = null;
    if (!TD.moved) { dropObj(o); return; }
    const C = TG.cyl;
    if (Math.abs(o.x - C.cx) < C.w / 2 + 34 && o.y < C.yBot - 20) releaseObj(o);
    else returnObj(o);
  }

  /* =========================================================
     장면 3 · 생활 속 밀도: 구명조끼 · 열기구 · 기름 유출 · 볍씨 고르기 · 헬륨 풍선
     ========================================================= */
  const LR = PHONE ? { x: 4, y: 4, w: 432, h: 340 } : { x: 8, y: 8, w: 776, h: 346 };
  const LC = PHONE ? { x: 4, y: 352, w: 432, h: 262 } : { x: 8, y: 366, w: 776, h: 182 };
  const LIFE_IDS = ['vest', 'balloon', 'oil', 'seeds', 'helium'];
  const LIFE_NAMES = { vest: '구명조끼', balloon: '열기구', oil: '기름 유출', seeds: '볍씨 고르기', helium: '헬륨 풍선' };
  const LF = {
    id: 'vest', t: 0, done: {}, btn: null, press: 0,
    beam: new SciSim.Spring(0, { stiffness: 70, damping: 8 }),
    cmp: { o: '', od: 0, e: '', ed: 0, unit: 'g/cm³', verdict: '', note: '' },
    vest: { on: false, y: new SciSim.Spring(1, { stiffness: 60, damping: 7 }), sw: 0, bub: 0 },
    balloon: { heat: 0, on: false, alt: new SciSim.Spring(0, { stiffness: 20, damping: 5 }), pts: [], cloud: 0 },
    oil: { len: 0, boom: 0, deployed: false, drops: [], leak: 1 },
    seeds: { salt: 0, rho: 1.0, list: [], shaker: 0, specks: [] },
    helium: { released: false, rise: new SciSim.Spring(0, { stiffness: 14, damping: 3.2 }), fall: new SciSim.Spring(0, { stiffness: 30, damping: 5 }), t: 0, sway: 0 },
  };
  const DENS_GAS = 'g/L';

  function lifeReset(id) {
    const v = LF[id];
    if (id === 'vest') { v.on = false; v.y.value = v.y.target = 1; v.y.velocity = 0; v.sw = 0; }
    if (id === 'balloon') { v.heat = 0; v.on = false; v.alt.value = v.alt.target = 0; v.alt.velocity = 0; }
    if (id === 'oil') { v.len = 0; v.boom = 0; v.deployed = false; v.drops.length = 0; }
    if (id === 'seeds') {
      v.salt = 0; v.rho = 1.0; v.specks.length = 0;
      const rs = [1.02, 1.05, 1.07, 1.09, 1.03, 1.08, 1.145, 1.16, 1.19, 1.22, 1.15, 1.18, 1.21, 1.17];   // 앞의 6개: 쭉정이, 나머지: 좋은 볍씨
      v.list = rs.map((r, i) => ({ r, good: r > 1.12, x: 0, y: 0, a: rand(-0.6, 0.6), px: rand(0, 1), py: rand(0, 1), up: 0, delay: 0 }));
    }
    if (id === 'helium') { v.released = false; v.rise.value = v.rise.target = 0; v.rise.velocity = 0; v.fall.value = v.fall.target = 0; v.fall.velocity = 0; v.t = 0; }
    LF.done[id] = LF.done[id] || false;
  }
  LIFE_IDS.forEach(lifeReset);
  function setLife(id) {
    if (LF.id === id) return;
    LF.id = id; LF.t = 0; LF.btn = null;
    FX.clear();
    refreshReadouts(); refreshUI();
  }
  const lifeDoneCount = () => LIFE_IDS.filter((k) => LF.done[k]).length;

  /* ---- 공통 그리기 ---- */
  function skyBg(W, H, top, bot, t) {
    vgrad(ctx, 0, 0, W, H, top, bot);
    // 구름
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.85)';
    [[0.15, 52, 1], [0.58, 34, 0.8], [0.86, 70, 0.9]].forEach((q, i) => {
      const x = ((q[0] * W + t * (6 + i * 3)) % (W + 160)) - 80, y = q[1];
      [[0, 0, 26], [26, -8, 22], [-24, 4, 18], [48, 4, 17]].forEach((c) => { ctx.beginPath(); ctx.arc(x + c[0] * q[2], y + c[1] * q[2], c[2] * q[2], 0, TAU); ctx.fill(); });
    });
    ctx.restore();
  }
  function canvasBtn(x, y, w, h, label, o) {
    o = o || {};
    const lift = LF.press > 0 ? 2 : 0;
    ctx.save();
    ctx.shadowColor = 'rgba(30,20,80,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3 - lift;
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, o.top || '#a78bfa'); g.addColorStop(1, o.bot || '#7c3aed');
    ctx.fillStyle = g; D.roundRect(x, y + lift, w, h, h / 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; D.roundRect(x + 6, y + lift + 3, w - 12, h * 0.34, h / 2); ctx.fill();
    ctx.font = D.font(o.size || 16, 800); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1 + lift);
    ctx.textBaseline = 'alphabetic';
    return { x: x + LR.x, y: y + LR.y, w, h };
  }
  function waterSurface(W, y, t, amp, fn) {
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.03 + t * 1.6) * amp + Math.sin(x * 0.07 - t * 2.1) * amp * 0.5);
    fn && fn();
  }

  /* ---- 1) 구명조끼 ---- */
  function drawVest(W, H, t) {
    const v = LF.vest, wy = 168;
    skyBg(W, H, '#cfe9ff', '#f1f8ff', t);
    // 수영장 타일 벽 (왼쪽)
    ctx.fillStyle = '#e8f1fa'; ctx.fillRect(0, wy - 18, 90, H);
    ctx.strokeStyle = 'rgba(120,160,200,.35)'; ctx.lineWidth = 1;
    for (let x = 0; x < 90; x += 22) { ctx.beginPath(); ctx.moveTo(x, wy - 18); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = wy - 18; y < H; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(90, y); ctx.stroke(); }
    const px = W / 2 + 10;
    const sink = v.y.value;                                          // 0 = 조끼 입음(높이 뜸), 1 = 가라앉기 쉬움
    const headY = lerp(wy - 70, wy - 14, sink) + (RM ? 0 : Math.sin(t * 1.8) * 2.2);
    // 사람 (몸)
    ctx.save();
    ctx.translate(px, headY);
    // 몸통
    const bg = ctx.createLinearGradient(-26, 0, 26, 0); bg.addColorStop(0, '#5ba6ea'); bg.addColorStop(1, '#2f74c4');
    ctx.fillStyle = bg; D.roundRect(-24, 26, 48, 82, 18); ctx.fill();
    // 팔
    ctx.strokeStyle = '#f2c29a'; ctx.lineWidth = 11; ctx.lineCap = 'round';
    const sw = Math.sin(t * 2.2) * (0.35 + 0.65 * sink);
    ctx.beginPath(); ctx.moveTo(-22, 40); ctx.lineTo(-44, 62 - sw * 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(22, 40); ctx.lineTo(44, 62 + sw * 22); ctx.stroke();
    // 조끼
    const vk = ease.outBack(clamp(v.sw, 0, 1));
    if (vk > 0.01) {
      ctx.save(); ctx.globalAlpha = Math.min(1, vk * 1.4); ctx.translate(0, (1 - vk) * -24);
      const og = ctx.createLinearGradient(-30, 0, 30, 0); og.addColorStop(0, '#ff9a3c'); og.addColorStop(1, '#f06a10');
      ctx.fillStyle = og; D.roundRect(-30, 24, 60, 52, 15); ctx.fill();
      ctx.strokeStyle = '#b84b08'; ctx.lineWidth = 2; D.roundRect(-30, 24, 60, 52, 15); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(-30, 40, 60, 6); ctx.fillRect(-30, 56, 60, 6);
      ctx.fillStyle = '#ff9a3c'; D.roundRect(-20, 22, 40, 12, 6); ctx.fill();
      ctx.restore();
    }
    // 머리
    D.sphere(0, 0, 21, '#f6cfa8', { gloss: false });
    ctx.fillStyle = '#4a3220'; ctx.beginPath(); ctx.arc(0, -4, 21, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillStyle = '#1b2333'; circle(ctx, -7, 2, 2.2); ctx.fill(); circle(ctx, 7, 2, 2.2); ctx.fill();
    ctx.strokeStyle = '#8a3b2a'; ctx.lineWidth = 2; ctx.beginPath();
    if (sink > 0.5) ctx.arc(0, 14, 5, Math.PI * 1.1, Math.PI * 1.9); else ctx.arc(0, 8, 6, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();
    // 물 (사람 위에 반투명하게 덮어서 잠긴 느낌)
    ctx.save();
    waterSurface(W, wy, t, 2.2, () => { ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); });
    const wg = ctx.createLinearGradient(0, wy, 0, H); wg.addColorStop(0, 'rgba(96,190,245,.62)'); wg.addColorStop(1, 'rgba(32,120,206,.8)');
    ctx.fillStyle = wg; ctx.fill();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 6;
    for (let i = 0; i < 5; i++) { const x = ((i * 190 + t * 18) % (W + 100)) - 50; ctx.beginPath(); ctx.moveTo(x, wy + 20); ctx.quadraticCurveTo(x + 40, wy + 60 + i * 8, x + 90, wy + 130); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.2; waterSurface(W, wy, t, 2.2); ctx.stroke(); ctx.restore();
    // 숨이 차서 올라오는 방울
    v.bub += 1 / 60;
    if (sink > 0.5 && !RM && Math.random() < 0.08) FX.emit({ x: LR.x + px + rand(-14, 14), y: LR.y + headY + 40, vx: rand(-8, 8), vy: -rand(30, 60), life: 1.1, size: rand(2, 4.5), color: '#ffffff', shape: 'bubble', gravity: -10, fade: true });
    LF.btn = canvasBtn(W / 2 - 92, H - 62, 184, 46, v.on ? '구명조끼 벗기' : '🛟 구명조끼 입기', { top: v.on ? '#94a3b8' : '#ffa24a', bot: v.on ? '#64748b' : '#f06a10' });
    if (sink > 0.5) pill(px, wy + 52, '가라앉기 쉬워요!', { bg: 'rgba(30,64,175,.85)', size: 14, pad: 9 });
    else pill(px, wy - 108, '물 위에 떠요!', { bg: COL.good, size: 14, pad: 9 });
  }
  function vestToggle() {
    const v = LF.vest;
    v.on = !v.on; v.y.target = v.on ? 0 : 1;
    tw(v, { sw: v.on ? 1 : 0 }, 0.5, 'outCubic');
    if (v.on) LF.done.vest = true;
    Sound.click();
    splashLife(LR.x + LR.w / 2 + 10, LR.y + 168, 0.8);
  }
  function splashLife(x, y, k) {
    if (RM) return;
    for (let i = 0; i < 12; i++) FX.emit({ x: x + rand(-24, 24), y, vx: rand(-50, 50) * k, vy: -rand(60, 160) * k, life: 0.6, size: rand(1.8, 3.4), color: '#bfe3ff', gravity: 700, fade: true });
  }

  /* ---- 2) 열기구 ---- */
  function drawBalloon(W, H, t, dt) {
    const b = LF.balloon, gy = H - 44;
    skyBg(W, H, '#a9d8ff', '#e9f6ff', t);
    // 먼 산
    ctx.fillStyle = '#b9dca8'; ctx.beginPath(); ctx.moveTo(0, gy); ctx.quadraticCurveTo(W * 0.2, gy - 70, W * 0.4, gy - 20); ctx.quadraticCurveTo(W * 0.62, gy - 90, W * 0.82, gy - 24); ctx.quadraticCurveTo(W * 0.92, gy - 44, W, gy - 10); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#7ec26f'; ctx.fillRect(0, gy, W, H - gy);
    ctx.fillStyle = '#6fb361'; for (let x = 6; x < W; x += 22) ctx.fillRect(x, gy + 10 + ((x * 7) % 13), 10, 3);
    const cx = W / 2, rise = b.alt.value * 96;
    const by = gy - 6 - rise;                                       // 바구니 바닥
    // 그림자
    contactShadow(cx, gy + 14, 40 * (1 - b.alt.value * 0.4), 7, 0.7 * (1 - b.alt.value * 0.7));
    // 줄
    const ey = by - 62, er = 66, etop = ey - 112;                   // 풍선 아랫부분 y = ey
    ctx.strokeStyle = '#6b5a45'; ctx.lineWidth = 2;
    [[-28, -14], [28, 14]].forEach((q) => { ctx.beginPath(); ctx.moveTo(cx + q[0], by - 30); ctx.lineTo(cx + q[1] * 1.4, ey - 4); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(cx - 8, by - 30); ctx.lineTo(cx - 8, ey); ctx.moveTo(cx + 8, by - 30); ctx.lineTo(cx + 8, ey); ctx.stroke();
    // 바구니
    const bk = ctx.createLinearGradient(0, by - 30, 0, by); bk.addColorStop(0, '#d9a066'); bk.addColorStop(1, '#a8703a');
    ctx.fillStyle = bk; D.roundRect(cx - 32, by - 30, 64, 30, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,20,.5)'; ctx.lineWidth = 1.2; for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx - 32 + i * 12.8, by - 30); ctx.lineTo(cx - 32 + i * 12.8, by); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(cx - 32, by - 15); ctx.lineTo(cx + 32, by - 15); ctx.stroke();
    // 풍선(천)
    const envPath = () => {
      ctx.beginPath(); ctx.moveTo(cx - 14, ey);
      ctx.bezierCurveTo(cx - 74, ey - 26, cx - er - 14, etop + 62, cx - 52, etop + 22);
      ctx.bezierCurveTo(cx - 36, etop - 4, cx + 36, etop - 4, cx + 52, etop + 22);
      ctx.bezierCurveTo(cx + er + 14, etop + 62, cx + 74, ey - 26, cx + 14, ey);
      ctx.closePath();
    };
    softShadowPath(envPath);
    const warm = clamp(b.heat, 0, 1);
    const eg = ctx.createRadialGradient(cx - 24, etop + 40, 8, cx, etop + 70, 100);
    eg.addColorStop(0, mix('#ff6a5a', '#ffb347', warm * 0.5)); eg.addColorStop(1, '#c0352b');
    ctx.fillStyle = eg; envPath(); ctx.fill();
    ctx.save(); envPath(); ctx.clip();
    // 세로 줄무늬
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 11;
    [-0.5, 0.5].forEach((k) => { ctx.beginPath(); ctx.moveTo(cx + k * 14, ey); ctx.quadraticCurveTo(cx + k * 140, etop + 80, cx + k * 22, etop); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(255,214,90,.9)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(cx, ey); ctx.lineTo(cx, etop); ctx.stroke();
    // 속 공기 입자
    const n = Math.round(lerp(26, 12, warm)), sp = lerp(26, 92, warm);
    while (b.pts.length < 26) b.pts.push({ x: cx + rand(-44, 44), y: etop + rand(34, 100), a: rand(0, TAU), v: rand(0.7, 1.3) });
    b.pts.forEach((p, i) => {
      p.a += (Math.random() - 0.5) * 6 * dt; p.x += Math.cos(p.a) * sp * p.v * dt; p.y += Math.sin(p.a) * sp * p.v * dt;
      const L = cx - 50 + (p.y - etop - 50) * 0.0, R = cx + 50;
      if (p.x < cx - 54) { p.x = cx - 54; p.a = Math.PI - p.a; } if (p.x > cx + 54) { p.x = cx + 54; p.a = Math.PI - p.a; }
      if (p.y < etop + 28) { p.y = etop + 28; p.a = -p.a; } if (p.y > ey - 18) { p.y = ey - 18; p.a = -p.a; }
      const vis = i < n ? 1 : 0; p.al = (p.al == null ? vis : p.al) + (vis - (p.al == null ? vis : p.al)) * Math.min(1, dt * 4);
      if (p.al > 0.02) drawBall(ctx, mix('#ffffff', '#ffe08a', warm), p.x, p.y, 5.4, p.al * 0.95);
    });
    ctx.restore();
    ctx.strokeStyle = 'rgba(120,30,20,.6)'; ctx.lineWidth = 2; envPath(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(cx - 34, etop + 44, 10, 26, 0.5, 0, TAU); ctx.fill();
    // 버너 + 불꽃
    ctx.fillStyle = '#58606f'; D.roundRect(cx - 9, ey + 6, 18, 14, 3); ctx.fill();
    if (b.on) { D.flame(cx, ey + 6, 34, t); if (!RM && Math.random() < 0.3) FX.emit({ x: LR.x + cx + rand(-6, 6), y: LR.y + ey, vx: rand(-8, 8), vy: -rand(40, 80), life: 0.6, size: rand(2, 4), color: '#ffcf6b', gravity: -60, fade: true }); }
    // 라벨: 공기 입자 수
    const plx = PHONE ? 92 : cx + 150, ply = PHONE ? H - 100 : etop + 40;
    pill(plx, ply, '속 공기 입자 ' + n + '개', { bg: 'rgba(255,255,255,.92)', color: COL.ink, size: 14, pad: 9, border: '#fcd34d' });
    pill(plx, ply + 30, '같은 부피(풍선 속)', { bg: 'rgba(255,255,255,.0)', color: COL.muted, size: 12.5, pad: 2 });
    LF.btn = canvasBtn(W / 2 - 96, H - 44 - 3 - 0, 192, 40, b.on ? '🔥 버너 끄기' : '🔥 버너 켜기', { top: b.on ? '#94a3b8' : '#ff9b4a', bot: b.on ? '#64748b' : '#e8590c', size: 15 });
    if (b.alt.value > 0.8) pill(cx - 170 * (PHONE ? 0.55 : 1), etop + 56, '둥실 떠올랐어요!', { bg: COL.good, size: 14, pad: 9 });
  }
  function softShadowPath(fn) {
    ctx.save(); ctx.shadowColor = 'rgba(30,50,100,.22)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; ctx.fillStyle = '#c0352b'; fn(); ctx.fill(); ctx.restore();
  }
  function balloonToggle() {
    const b = LF.balloon;
    b.on = !b.on; Sound.click();
  }

  /* ---- 3) 기름 유출 ---- */
  const oilLx = () => LR.w * (PHONE ? 0.3 : 0.27) - 85 + 6;
  function updateOil(dt) {
    const o = LF.oil, wy = 176, lx = oilLx(), ly = wy + 24, t = CLK.t;
    if (o.leak > 0 && (!o.deployed || o.len < 330) && Math.random() < dt * (RM ? 5 : 9)) o.drops.push({ x: lx + rand(-4, 4), y: ly, vy: -rand(30, 55), r: rand(2.6, 6.5), ph: rand(0, 6) });
    for (let i = o.drops.length - 1; i >= 0; i--) {
      const d = o.drops[i];
      d.y += d.vy * dt; d.x += Math.sin(t * 5 + d.ph) * 14 * dt - 6 * dt;
      if (d.y <= wy + 2) {
        o.len = Math.min(o.deployed ? 330 : 640, o.len + d.r * 1.15 * (o.deployed ? 0.55 : 1)); o.drops.splice(i, 1);
        if (!RM && Math.random() < 0.3) FX.emit({ x: LR.x + d.x, y: LR.y + wy, vx: rand(-20, 20), vy: -rand(20, 60), life: 0.3, size: 1.6, color: '#3b2a1b', gravity: 500, fade: true });
      }
    }
    if (o.deployed && o.len > 330) o.len = SciSim.approach(o.len, 330, dt, 0.9);      // 오일펜스가 기름을 모아 가둬요
  }
  function drawOil(W, H, t, dt) {
    const o = LF.oil, wy = 176;
    skyBg(W, H, '#bfdcf5', '#eef6fc', t);
    // 바다
    ctx.save();
    waterSurface(W, wy, t, 2.4, () => { ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); });
    const wg = ctx.createLinearGradient(0, wy, 0, H); wg.addColorStop(0, '#5cb8ee'); wg.addColorStop(1, '#1b6fb8');
    ctx.fillStyle = wg; ctx.fill(); ctx.restore();
    const sx = W * (PHONE ? 0.3 : 0.27), sw = 170;
    // 유조선
    const hx0 = sx - sw / 2, hx1 = sx + sw / 2;
    ctx.save();
    const bob = Math.sin(t * 1.2) * 2;
    ctx.translate(0, bob);
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(hx0 - 6, wy - 36); ctx.lineTo(hx1 + 14, wy - 36); ctx.lineTo(hx1 - 6, wy + 34); ctx.lineTo(hx0 + 14, wy + 34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#233a5a'; ctx.beginPath(); ctx.moveTo(hx0 - 6, wy - 36); ctx.lineTo(hx1 + 14, wy - 36); ctx.lineTo(hx1 + 11, wy - 22); ctx.lineTo(hx0 - 3, wy - 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f1f5f9'; D.roundRect(hx1 - 44, wy - 78, 40, 44, 4); ctx.fill();
    ctx.fillStyle = '#7fb8e8'; for (let i = 0; i < 3; i++) ctx.fillRect(hx1 - 40 + i * 12, wy - 70, 8, 9);
    ctx.fillStyle = '#6b7280'; ctx.fillRect(hx0 + 14, wy - 54, 70, 18);
    ctx.fillStyle = '#4b5563'; for (let i = 0; i < 3; i++) ctx.fillRect(hx0 + 22 + i * 22, wy - 60, 10, 8);
    ctx.restore();
    // 샌 기름 방울 (선체 아래 → 수면)
    const lx = oilLx(), ly = wy + 24;
    ctx.fillStyle = '#2a1d12'; circle(ctx, lx, ly, 3.4); ctx.fill();
    for (const d of o.drops) {
      const g = ctx.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 0.5, d.x, d.y, d.r);
      g.addColorStop(0, '#6b4a2b'); g.addColorStop(1, '#241811');
      ctx.fillStyle = g; circle(ctx, d.x, d.y, d.r); ctx.fill();
    }
    // 수면에 퍼진 기름띠
    if (o.len > 1) {
      const x0 = lx - 6, x1 = Math.min(W - 10, x0 + o.len), thick = o.deployed ? 8 : 4.5;
      const ox0 = x0, w = x1 - x0;
      ctx.save();
      const og = ctx.createLinearGradient(ox0, 0, x1, 0);
      og.addColorStop(0, 'rgba(36,24,17,.95)'); og.addColorStop(0.7, 'rgba(60,42,28,.9)'); og.addColorStop(1, 'rgba(70,50,36,.55)');
      ctx.fillStyle = og; ctx.beginPath(); ctx.moveTo(ox0, wy - 1);
      for (let x = ox0; x <= x1; x += 6) { const e = (x - ox0) / w; ctx.lineTo(x, wy - thick * Math.sin(Math.PI * Math.min(1, e * 1.05)) * (0.8 + 0.2 * Math.sin(x * 0.2 + t * 2)) - 1 + Math.sin(x * 0.03 + t * 1.6) * 2.4); }
      ctx.lineTo(x1, wy + 1); for (let x = x1; x >= ox0; x -= 6) ctx.lineTo(x, wy + 2.5 + Math.sin(x * 0.03 + t * 1.6) * 2.4); ctx.closePath(); ctx.fill();
      // 무지갯빛 번들거림
      const rg = ctx.createLinearGradient(ox0, 0, x1, 0);
      ['rgba(255,80,120,.0)', 'rgba(255,200,60,.35)', 'rgba(80,220,160,.35)', 'rgba(90,140,255,.35)', 'rgba(200,100,255,.0)'].forEach((c, i) => rg.addColorStop(i / 4, c));
      ctx.fillStyle = rg; ctx.fillRect(ox0, wy - thick - 2, w, thick + 3);
      ctx.restore();
    }
    // 오일펜스
    const bx = lx + 330;
    const bk = ease.outCubic(o.boom);
    if (bk > 0.01) {
      const sk = bk * 26;
      ctx.save(); ctx.globalAlpha = bk;
      ctx.fillStyle = 'rgba(255,140,0,.28)'; ctx.fillRect(bx - 4, wy, 8, sk * 1.6);
      ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 2; ctx.strokeRect(bx - 4, wy, 8, sk * 1.6);
      for (let i = -1; i <= 1; i++) {
        const yy = wy - 7 + Math.sin(t * 2 + i) * 1.6 - (1 - bk) * 30;
        D.sphere(bx + i * 0, yy + i * 0, 0.001, '#000'); // placeholder no-op
      }
      const yy = wy - 9 + Math.sin(t * 2) * 1.8 - (1 - bk) * 30;
      const bg2 = ctx.createLinearGradient(0, yy - 8, 0, yy + 8); bg2.addColorStop(0, '#ffb25c'); bg2.addColorStop(1, '#e8590c');
      ctx.fillStyle = bg2; D.roundRect(bx - 11, yy - 8, 22, 18, 8); ctx.fill();
      ctx.strokeStyle = '#9a3a06'; ctx.lineWidth = 1.5; D.roundRect(bx - 11, yy - 8, 22, 18, 8); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(bx - 7, yy - 5, 4, 8);
      ctx.restore();
      pill(bx, wy - 46, '오일펜스', { bg: '#ea580c', size: 13, pad: 8 });
    }
    // 이름표
    if (o.len > 150) pill(lx + (PHONE ? 150 : 262), wy + 32, '물 위에 뜬 기름', { bg: 'rgba(36,24,17,.9)', size: 13.5, pad: 9 });
    LF.btn = canvasBtn(W / 2 - 96, H - 56, 192, 42, o.deployed ? '펜스 설치됨 ✔' : '🛟 오일펜스 설치', { top: o.deployed ? '#94a3b8' : '#ff9b4a', bot: o.deployed ? '#64748b' : '#e8590c', size: 15 });
  }
  function oilToggle() {
    const o = LF.oil;
    if (o.deployed) return;
    o.deployed = true; Sound.click();
    tw(o, { boom: 1 }, 0.9, 'outBack');
    after(1.2, () => { LF.done.oil = true; });
  }

  /* ---- 4) 볍씨 고르기 ---- */
  const SEEDG = () => (PHONE ? { bx: 150, bw: 170, by0: 56, bh: 176, gh: 118 } : { bx: LR.w / 2 - 40, bw: 220, by0: 74, bh: 214, gh: 150 });
  function drawSeeds(W, H, t, dt) {
    const s = LF.seeds;
    vgrad(ctx, 0, 0, W, H, '#fff8e8', '#f6ecd4');
    const G0 = SEEDG(), bx = G0.bx, bw = G0.bw, by0 = G0.by0, bh = G0.bh;
    // 비커
    const sal = clamp((s.rho - 1) / 0.17, 0, 1);
    const wc = mix('#8cd0f7', '#5bb0ec', sal);
    const wTop = by0 + 44;
    // 책상
    vgrad(ctx, 0, by0 + bh + 6, W, H - (by0 + bh + 6), '#e6c698', '#c9a06a');
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(0, by0 + bh + 6, W, 2);
    contactShadow(bx, by0 + bh + 7, bw / 2 + 20, 8, 0.9);
    const x0 = bx - bw / 2, x1 = bx + bw / 2, yb = by0 + bh;
    vessel({
      x0, x1, yTop: by0, yBot: yb, t, amp: 1.0, men: 2.6,
      path: (c) => tubeClosed(c, x0, by0, bw, bh, 14), outline: (c) => tubeOpen(c, x0, by0, bw, bh, 14, 8),
      layers: [{ y: wTop, color: '#4aa5ec', alpha: 0.5 + sal * 0.28 }],
      inside: (c) => { s.list.forEach((q) => drawSeed(q, sal)); },
    });
    // 소금 가루 떨어짐
    s.specks.forEach((p) => { p.y += p.vy * dt; p.vy += 60 * dt; if (p.y > wTop) { p.a -= dt * 2.4; } if (p.a > 0) { ctx.globalAlpha = Math.max(0, p.a); ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 1.6, p.y - 1.6, 3.2, 3.2); ctx.globalAlpha = 1; } });
    s.specks = s.specks.filter((p) => p.a > 0 && p.y < yb);
    // 소금통
    s.shaker = Math.max(0, s.shaker - dt * 2.2);
    const shx = x1 + (PHONE ? 88 : 90), shy = by0 - 24 + 0;
    ctx.save(); ctx.translate(shx, shy + 18); ctx.rotate(-0.25 - s.shaker * 1.5);
    const sg = ctx.createLinearGradient(-22, 0, 22, 0); sg.addColorStop(0, '#d6e4f3'); sg.addColorStop(0.5, '#fff'); sg.addColorStop(1, '#b9cbe0');
    ctx.fillStyle = sg; D.roundRect(-22, -2, 44, 70, 12); ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2; D.roundRect(-22, -2, 44, 70, 12); ctx.stroke();
    ctx.fillStyle = '#e2464b'; D.roundRect(-18, -14, 36, 16, 6); ctx.fill();
    ctx.fillStyle = '#fff'; for (let i = -1; i <= 1; i++) circle(ctx, i * 9, -6, 2), ctx.fill();
    ctx.fillStyle = '#1b2333'; ctx.font = D.font(13, 800); ctx.textAlign = 'center'; ctx.fillText('소금', 0, 38);
    ctx.restore();
    // 밀도 눈금
    const gx = x1 + 14, gy0 = by0 + 20, gh = G0.gh;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; D.roundRect(gx - 4, gy0 - 36, 52, gh + 56, 10); ctx.fill();
    text(gx + 22, gy0 - 17, '밀도', { size: 12.5, weight: 800, color: COL.muted });
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gx + 12, gy0); ctx.lineTo(gx + 12, gy0 + gh); ctx.stroke();
    const yy = gy0 + gh - (gh * (s.rho - 1.0)) / 0.2;
    ctx.strokeStyle = '#3b82f6'; ctx.beginPath(); ctx.moveTo(gx + 12, gy0 + gh); ctx.lineTo(gx + 12, yy); ctx.stroke();
    [1.0, 1.1, 1.2].forEach((v) => { const y = gy0 + gh - (gh * (v - 1.0)) / 0.2; ctx.fillStyle = '#64748b'; ctx.fillRect(gx + 20, y - 1, 8, 2); text(gx + 30, y + 4, String(v), { size: 11.5, weight: 700, color: COL.muted, align: 'left' }); });
    D.sphere(gx + 12, yy, 7.5, '#3b82f6', { gloss: true });
    ctx.restore();
    pill(gx + 22, yy - 18 < gy0 - 2 ? gy0 - 2 : yy - 18, (Math.round(s.rho * 100) / 100).toFixed(2), { bg: '#1e3a8a', size: 13, pad: 7 });
    // 안내
    const nF = s.list.filter((q) => q.up > 0.9).length, nS = s.list.length - nF;
    pill(x0 + 62, by0 - 18, '뜬 씨 ' + nF + '개', { bg: '#a16207', size: 13.5, pad: 9 });
    pill(x0 + 62, yb + (PHONE ? 22 : 26), '가라앉은 씨 ' + nS + '개', { bg: '#15803d', size: 13.5, pad: 9 });
    LF.btn = canvasBtn(PHONE ? W / 2 - 84 : 22, H - (PHONE ? 52 : 60), 168, 44, s.salt >= 4 ? '소금 다 넣었어요' : '🧂 소금 넣기 (' + s.salt + '/4)', { top: '#f59e0b', bot: '#c2410c', size: 15 });
  }
  function seedPos(q, i, s, bx, bw, yb, wTop) {
    // 가라앉은 씨: 바닥에 쌓임, 뜬 씨: 수면에 모임
    const k = i % 7, row = Math.floor(i / 7);
    const sinkX = bx - bw / 2 + 30 + k * ((bw - 60) / 6) + (row % 2 ? 8 : 0), sinkY = yb - 16 - row * 16 - (k % 2) * 4;
    const j = i < 6 ? i : i - 6;
    const floatX = bx - bw / 2 + 36 + (i % 6) * ((bw - 72) / 5), floatY = wTop + 9 + (Math.floor(i / 6) % 2) * 4;
    return { sinkX, sinkY, floatX, floatY };
  }
  function drawSeed(q, sal) {
    const g = q.good;
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a + Math.sin(CLK.t * 1.6 + q.px * 6) * 0.08 * (1 - q.up * 0.4));
    const gg = ctx.createLinearGradient(-9, 0, 9, 0);
    if (g) { gg.addColorStop(0, '#f2cf62'); gg.addColorStop(1, '#c49420'); } else { gg.addColorStop(0, '#ece3b0'); gg.addColorStop(1, '#bfb27a'); }
    ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(0, 0, 9.5, 5.2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = g ? '#8a6410' : '#8d8454'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-2.5, -1.8, 4, 1.4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = g ? '#a47c16' : '#9d9362'; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(13, -0.6); ctx.stroke();
    ctx.restore();
  }
  function updateSeeds(dt) {
    const s = LF.seeds;
    const G0 = SEEDG(), bx = G0.bx, bw = G0.bw, yb = G0.by0 + G0.bh, wTop = G0.by0 + 44;
    s.rho = SciSim.approach(s.rho, 1.0 + 0.04 * s.salt, dt, 3);
    s.list.forEach((q, i) => {
      const P = seedPos(q, i, s, bx, bw, yb, wTop);
      const want = q.r < s.rho - 0.002 ? 1 : 0;
      if (q.delay > 0) { q.delay -= dt; }
      else q.up = SciSim.approach(q.up, want, dt, want ? 1.7 : 2.6);
      const ep = ease.inOutCubic(clamp(q.up, 0, 1));
      q.x = lerp(P.sinkX, P.floatX, ep); q.y = lerp(P.sinkY, P.floatY, ep) + Math.sin(CLK.t * 2 + i) * 1.2 * ep;
    });
  }
  function seedsAdd() {
    const s = LF.seeds;
    if (s.salt >= 4) { showHint('소금물이 충분히 진해졌어요. ↺로 다시 해 볼 수 있어요.', 2600); return; }
    s.salt++; s.shaker = 1; Sound.click();
    const G0 = SEEDG(), bx = G0.bx, bw = G0.bw;
    for (let i = 0; i < 26; i++) s.specks.push({ x: bx + rand(-bw * 0.4, bw * 0.4), y: G0.by0 - 30 + rand(-6, 20), vy: rand(60, 120), a: 1 });
    s.list.forEach((q) => { q.delay = 0.5 + Math.random() * 0.6; });
    if (s.salt >= 3) after(1.8, () => { LF.done.seeds = true; });
  }

  /* ---- 5) 헬륨 풍선 ---- */
  function drawHelium(W, H, t, dt) {
    const h = LF.helium;
    vgrad(ctx, 0, 0, W, H, '#fdf0f7', '#fbe5ef');
    ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(60 + i * (W / 5.2), 80 + (i % 2) * 70, 26, 0, TAU); ctx.fill(); }
    vgrad(ctx, 0, H - 64, W, 64, '#e8c9a0', '#cba578');
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(0, H - 64, W, 2);
    vgrad(ctx, 0, 0, W, 16, '#e9dce6', '#fbe5ef');
    h.t += dt;
    const hx = W / 2, handY = H - 78;
    const sepX = PHONE ? 78 : 112;
    const risen = h.rise.value, fell = h.fall.value;
    const hy = lerp(handY - 82, 52, risen) + (risen > 0.9 ? Math.sin(h.t * 1.7) * 3 : 0), hxx = hx - sepX + Math.sin(h.t * 1.3) * 4 * risen;
    const ay = lerp(handY - 82, H - 64 - 30, clamp(fell, 0, 1.1)) , axx = hx + sepX + Math.sin(h.t * 0.9) * 10 * Math.min(1, fell);
    // 손 (놓기 전)
    if (!h.released) {
      ctx.fillStyle = '#f2c29a'; D.roundRect(hx - 15, handY - 6, 30, 26, 10); ctx.fill();
      ctx.strokeStyle = '#d99a6c'; ctx.lineWidth = 1.4; D.roundRect(hx - 15, handY - 6, 30, 26, 10); ctx.stroke();
    }
    const kx = h.released ? null : hx, ky = handY - 4;
    const drawBalloonShape = (x, y, col, label, sway, stringFrom) => {
      // 줄
      ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1.4; ctx.beginPath();
      const sx = stringFrom ? stringFrom.x : x, sy = stringFrom ? stringFrom.y : y + 62;
      ctx.moveTo(x, y + 52); ctx.quadraticCurveTo(x + sway, (y + 52 + sy) / 2, sx, sy); ctx.stroke();
      // 풍선
      ctx.save(); ctx.translate(x, y); ctx.rotate(sway * 0.01);
      const bg = ctx.createRadialGradient(-12, -16, 4, 0, 0, 52); bg.addColorStop(0, shade(col, 0.5)); bg.addColorStop(0.5, col); bg.addColorStop(1, shade(col, -0.3));
      ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, 36, 46, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = shade(col, -0.2); ctx.beginPath(); ctx.moveTo(0, 46); ctx.lineTo(-5, 55); ctx.lineTo(5, 55); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-14, -20, 8, 14, 0.5, 0, TAU); ctx.fill();
      ctx.font = D.font(14, 800); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 4);
      ctx.restore();
    };
    const sw1 = Math.sin(h.t * 1.9) * 7 * (h.released ? 1 : 0.3), sw2 = Math.sin(h.t * 1.5 + 1) * 7 * (h.released ? Math.min(1, fell * 3) : 0.3);
    drawBalloonShape(hxx, hy, '#ef4444', 'He', sw1, h.released ? { x: hxx - 6 + Math.sin(h.t * 2) * 5, y: hy + 118 } : { x: hx - 3, y: handY - 4 });
    drawBalloonShape(axx, ay, '#3b82f6', '공기', sw2, h.released ? { x: axx + 6, y: ay + 100 } : { x: hx + 3, y: handY - 4 });
    const lbx = PHONE ? 62 : 84;
    pill(hxx - lbx, hy - 6, '헬륨 0.17 ' + DENS_GAS, { bg: '#b91c1c', size: 13.5, pad: 9 });
    pill(axx + lbx, ay - 6, '공기 1.2 ' + DENS_GAS, { bg: '#1d4ed8', size: 13.5, pad: 9 });
    if (h.released && h.rise.value > 0.95) pill(hxx + lbx + (PHONE ? 4 : 10), hy + 28, '천장에 닿았어요', { bg: COL.good, size: 13, pad: 8 });
    LF.btn = canvasBtn(hx - 78, H - 52, 156, 42, h.released ? '↺ 다시 잡기' : '✋ 손 놓기', { top: h.released ? '#94a3b8' : '#f472b6', bot: h.released ? '#64748b' : '#db2777', size: 16 });
    if (!RM && h.released && risen < 0.98 && Math.random() < 0.1) FX.emit({ x: LR.x + hxx, y: LR.y + hy + 60, vx: rand(-10, 10), vy: 30, life: 0.5, size: 2, color: '#fff', gravity: 0, fade: true });
  }
  function heliumToggle() {
    const h = LF.helium;
    if (!h.released) {
      h.released = true; h.rise.target = 1; h.fall.target = 1; Sound.click();
      after(2.4, () => { LF.done.helium = true; });
    } else { lifeReset('helium'); Sound.click(); }
  }

  /* ---- 비교 저울 + 설명 ---- */
  function lifeCompare(t) {
    const c = LF.id, v = LF.vest, b = LF.balloon, s = LF.seeds, C = LF.cmp;
    if (c === 'vest') {
      C.o = v.on ? '사람 + 구명조끼' : '사람'; C.od = v.on ? 0.9 : 1.0; C.e = '물'; C.ed = 1.0; C.unit = 'g/cm³';
      C.verdict = v.on ? '뜬다' : '가라앉기 쉽다'; C.vc = v.on ? 'good' : 'warn';
      C.note = v.on ? '구명조끼의 가벼운 소재 때문에 전체 평균 밀도가 물보다 작아져서 물 위에 떠요.' : '사람의 밀도는 물과 비슷해서, 힘을 빼면 몸이 물속으로 잠기기 쉬워요.';
    } else if (c === 'balloon') {
      const d = 1.2 - 0.25 * clamp(b.heat, 0, 1);
      C.o = '풍선 속 공기'; C.od = Math.round(d * 100) / 100; C.e = '바깥 공기'; C.ed = 1.2; C.unit = 'g/L';
      C.verdict = d <= 1.0 ? '뜬다' : d < 1.18 ? '아직 부족해요' : '그대로 있다'; C.vc = d <= 1.0 ? 'good' : 'info';
      C.note = d <= 1.0 ? '공기를 데우면 풍선 속 공기 입자가 줄어 밀도가 작아져요. 바깥 공기보다 가벼워진 열기구는 떠올라요.' : '버너로 풍선 속 공기를 데우면 같은 부피 안의 공기 입자가 줄어 밀도가 작아져요.';
    } else if (c === 'oil') {
      C.o = '기름'; C.od = 0.9; C.e = '바닷물'; C.ed = 1.03; C.unit = 'g/cm³';
      C.verdict = '물 위에 뜬다'; C.vc = 'good';
      C.note = LF.oil.deployed ? '오일펜스로 뜬 기름을 가둔 뒤 걷어내요. 기름이 물보다 가벼워서 가둘 수 있어요.' : '기름은 물보다 밀도가 작아서 물에 섞이지 않고 위로 떠올라 넓게 퍼져요.';
    } else if (c === 'seeds') {
      const up = s.list.filter((q) => q.up > 0.5), goodUp = up.filter((q) => q.good).length;
      C.o = '알찬 볍씨'; C.od = 1.17; C.e = '소금물'; C.ed = Math.round(s.rho * 100) / 100; C.unit = 'g/cm³';
      const badUp = up.length - goodUp;
      C.verdict = up.length === 0 ? '모두 가라앉는다' : goodUp ? '알찬 씨도 뜬다' : badUp < 6 ? '쭉정이가 뜨기 시작해요' : '쭉정이만 뜬다'; C.vc = goodUp ? 'warn' : badUp >= 6 ? 'good' : 'info';
      C.note = up.length === 0 ? '맹물에서는 모든 씨가 가라앉아요. 소금을 넣어 물의 밀도를 높여 봐요.' : goodUp ? '너무 진하면 알찬 씨도 떠 버려요. 알맞은 밀도가 중요해요!' : '소금물의 밀도가 쭉정이(약 1.05)보다 크고 알찬 씨(약 1.17)보다 작으면 쭉정이만 떠요.';
    } else {
      C.o = '헬륨'; C.od = 0.17; C.e = '공기'; C.ed = 1.2; C.unit = 'g/L';
      C.verdict = '헬륨 풍선은 뜬다'; C.vc = 'good';
      C.note = '헬륨은 공기보다 밀도가 작아서 헬륨 풍선은 떠오르고, 공기를 넣은 풍선은 아래로 가라앉아요.';
    }
    // 저울: 밀도가 큰 쪽이 아래로 내려가요
    const denom = Math.max(C.od, C.ed, 1e-6);
    const r = (C.ed - C.od) / denom;
    LF.beam.target = Math.sign(r) * 0.24 * Math.sqrt(Math.min(1, Math.abs(r)));
  }
  function drawCompare(t, dt) {
    const R = LC, C = LF.cmp;
    LF.beam.update(dt);
    panel(R.x, R.y, R.w, R.h, 16, '#fff', 12, 4, 'rgba(30,50,100,.16)');
    text(PHONE ? R.x + 14 : R.x + 470, R.y + 25, '⚖️ 밀도 비교', { size: 15, weight: 800, color: COL.ink, align: 'left' });
    const bx = PHONE ? R.x + R.w / 2 : R.x + 236, by = R.y + (PHONE ? 88 : 66), L = PHONE ? 112 : 150, a = LF.beam.value, stH = PHONE ? 72 : 92;
    ctx.save();
    // 받침대
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(bx, by - 4); ctx.lineTo(bx - 18, by + stH); ctx.lineTo(bx + 18, by + stH); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#64748b'; D.roundRect(bx - 36, by + stH - 2, 72, 8, 4); ctx.fill();
    // 들보
    ctx.translate(bx, by); ctx.rotate(a);
    const bg = ctx.createLinearGradient(0, -5, 0, 5); bg.addColorStop(0, '#cbd5e1'); bg.addColorStop(1, '#64748b');
    ctx.fillStyle = bg; D.roundRect(-L, -5, L * 2, 10, 5); ctx.fill();
    ctx.restore();
    D.sphere(bx, by, 7, '#8b5cf6', { gloss: true });
    // 접시(카드)
    const pans = [{ s: -1, label: C.o, d: C.od, col: '#e2464b' }, { s: 1, label: C.e, d: C.ed, col: '#2f7de1' }];
    pans.forEach((p) => {
      const ex = bx + p.s * Math.cos(a) * L, ey = by + p.s * Math.sin(a) * L;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
      const cw = PHONE ? 112 : 136, ch = 48;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - cw / 2 + 12, ey + 26); ctx.moveTo(ex, ey); ctx.lineTo(ex + cw / 2 - 12, ey + 26); ctx.stroke();
      panel(ex - cw / 2, ey + 24, cw, ch, 12, '#fff', 8, 3, 'rgba(30,50,100,.22)');
      ctx.strokeStyle = p.col; ctx.lineWidth = 2.4; D.roundRect(ex - cw / 2, ey + 24, cw, ch, 12); ctx.stroke();
      text(ex, ey + 43, p.label, { size: PHONE ? 12.5 : 13.5, weight: 700, color: COL.muted });
      text(ex, ey + 65, dS(p.d) + ' ' + C.unit, { size: PHONE ? 15 : 17, weight: 800, color: p.col });
    });
    // 판정
    const vcol = C.vc === 'good' ? COL.good : C.vc === 'warn' ? '#b45309' : COL.subD;
    pill(bx, R.y + (PHONE ? 24 : 24), C.verdict, { bg: vcol, size: PHONE ? 14 : 15, pad: 11 });
    // 설명
    const tx = PHONE ? R.x + 14 : R.x + 470, tw0 = PHONE ? R.w - 28 : 292, ty = PHONE ? R.y + 202 : R.y + 58;
    wrapText(C.note, tx, ty, tw0, PHONE ? 20 : 25, { size: PHONE ? 14 : 15, weight: 700, color: COL.ink });
    ctx.restore();
  }
  function wrapText(str, x, y, w, lh, o) {
    ctx.save(); ctx.font = D.font(o.size, o.weight); ctx.fillStyle = o.color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    let line = '', yy = y;
    const words = str.split(' ');
    words.forEach((wd) => {
      const test = line ? line + ' ' + wd : wd;
      if (ctx.measureText(test).width > w && line) { ctx.fillText(line, x, yy); line = wd; yy += lh; } else line = test;
    });
    if (line) ctx.fillText(line, x, yy);
    ctx.restore();
  }

  function updateLife(dt) {
    LF.t += dt; LF.press = Math.max(0, LF.press - dt * 6);
    const v = LF.vest, b = LF.balloon, h = LF.helium;
    v.y.update(dt);
    b.heat = clamp(b.heat + (b.on ? 0.32 : -0.1) * dt, 0, 1);
    b.alt.target = clamp((b.heat - 0.78) / 0.17, 0, 1);
    b.alt.update(dt);
    if (b.heat > 0.93 && b.alt.value > 0.85) LF.done.balloon = true;
    if (LF.id === 'seeds') updateSeeds(dt);
    if (LF.id === 'oil') updateOil(dt);
    h.rise.update(dt); h.fall.update(dt);
    if (LF.id === 'helium' && h.released && h.rise.value > 0.9) { /* 다 올라감 */ }
  }
  function drawLife(t, dt) {
    lifeCompare(t);
    panel(LR.x - 2, LR.y - 2, LR.w + 4, LR.h + 4, 20, '#fff', 14, 4, 'rgba(30,50,100,.16)');
    ctx.save();
    ctx.beginPath(); D.roundRect(LR.x, LR.y, LR.w, LR.h, 18); ctx.clip();
    ctx.translate(LR.x, LR.y);
    const W = LR.w, H = LR.h;
    if (LF.id === 'vest') drawVest(W, H, t);
    else if (LF.id === 'balloon') drawBalloon(W, H, t, dt);
    else if (LF.id === 'oil') drawOil(W, H, t, dt);
    else if (LF.id === 'seeds') drawSeeds(W, H, t, dt);
    else drawHelium(W, H, t, dt);
    // 장면 전환 번쩍임
    if (LF.t < 0.3) { ctx.fillStyle = 'rgba(246,249,254,' + (1 - LF.t / 0.3) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    drawCompare(t, dt);
    // 진행 표시 (살펴본 장면)
    const px = LR.x + LR.w - 14, py = LR.y + 18;
    LIFE_IDS.forEach((k, i) => { ctx.fillStyle = LF.done[k] ? COL.good : 'rgba(100,116,139,.35)'; circle(ctx, px - (4 - i) * 16, py, 5.5); ctx.fill(); });
  }
  function lifeTap(p) {
    const B = LF.btn;
    if (B && inRect(p, B, 4)) {
      LF.press = 1;
      const id = LF.id;
      if (id === 'vest') vestToggle(); else if (id === 'balloon') balloonToggle(); else if (id === 'oil') oilToggle(); else if (id === 'seeds') seedsAdd(); else heliumToggle();
      return true;
    }
    return false;
  }

  /* =========================================================
     화면 요소 · 장면 전환 · 입력 · 갱신/그리기 루프
     ========================================================= */
  const SCENES = {
    bench1: { label: '⚖️ 알루미늄 조각의 질량과 부피 재기', hint: '조각을 눌러 보세요. 전자저울로 질량을, 눈금실린더로 부피를 재요.' },
    bench2: { label: '🔎 모르는 금속 X · Y의 밀도 재기', hint: '조각을 눌러 질량과 부피를 재고, 밀도표와 비교해 보세요.' },
    tower: { label: '🧪 액체 층 쌓기 · 물체 띄우기', hint: '병을 눌러 액체를 부어 보세요. 어떤 순서로 부어도 돼요.' },
    life: { label: '🏠 생활 속 밀도', hint: '장면 안의 단추를 눌러 체험해 보세요.' },
  };
  const sceneKey = () => (S.scene === 'bench' ? 'bench' + BN.set : S.scene);
  const ready = {};
  const hintEl = $('#stageHint');
  const selX = $('#selX'), selY = $('#selY');

  function refreshReadouts() {
    const set = (i, label, val, word) => {
      const l = $('#rl' + i), v = $('#r' + i);
      l.textContent = label; v.innerHTML = val; v.classList.toggle('word', !!word);
    };
    if (S.scene === 'bench') {
      const it = itemById(BN.current) || null, pre = it ? it.id + ' · ' : '';
      const m = it && it.meas.m != null ? f1(it.m) + '<small>g</small>' : '–';
      const v = it && it.meas.v != null ? it.V + '<small>cm³</small>' : '–';
      const d = it && it.meas.m != null && it.meas.v != null ? (Math.round(dOf(it) * 10) / 10).toFixed(1) + '<small>g/cm³</small>' : '–';
      set(1, pre + (PHONE ? '질량' : '질량 (전자저울)'), m); set(2, pre + (PHONE ? '부피' : '부피 (눈금실린더)'), v); set(3, pre + (PHONE ? '질량 ÷ 부피' : '질량 ÷ 부피 = 밀도'), d);
    } else if (S.scene === 'tower') {
      const o = TW.objs.find((q) => q.id === TW.last && q.st === 'phys');
      set(1, '부은 액체', TW.stack.length + '<small>/ 3가지</small>');
      set(2, o ? o.name + '의 밀도' : '물체의 밀도', o ? o.rho + '<small>g/cm³</small>' : '–');
      set(3, PHONE ? '멈춘 곳' : '떠 있는 곳', o && layersDone() ? placeText(o) : '–', true);
    }
    const ro = $('#readouts');
    if (ro) ro.hidden = S.scene === 'life';
  }

  let lastFree = null;
  function refreshUI() {
    const free = !!(game && game.free), key = sceneKey();
    $('#sceneSeg').hidden = !free;
    $('#lifeSeg').hidden = !(S.scene === 'life' && on('life'));
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === key));
    $$('#lifeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === LF.id));
    $('#tbLabel').textContent = S.scene === 'life' ? '🏠 ' + LIFE_NAMES[LF.id] : SCENES[key].label;
    $('#tbLabel').hidden = free;
    const pickOn = S.scene === 'bench' && BN.set === 2 && on('pick');
    $('#pickCtl').hidden = !pickOn;
    $('#ctrlCard').hidden = !pickOn;
    selX.classList.toggle('set', !!PICK.X); selY.classList.toggle('set', !!PICK.Y);
    lastFree = free;
  }
  function showHintMsg(t, ms) { showHint(t, ms || 5200); }
  function resetScene(key) {
    sqCancel(); FX.clear(); hideHint();
    TD.o = null; DR.it = null;
    // 취소된 동작이 남기고 간 상태 정리
    if (BN.busy && key.indexOf('bench') !== 0) loadSet(BN.set);
    if ((TW.busy || TW.pour || TW.settle) && key !== 'tower') initTower();
    if (key === 'bench1') loadSet(1);
    else if (key === 'bench2') { PICK.X = PICK.Y = ''; selX.value = ''; selY.value = ''; loadSet(2); }
    else if (key === 'tower') initTower();
    else if (key === 'life') lifeReset(LF.id);
    ready[key] = true;
    S.sceneT = 0;
    refreshReadouts(); refreshUI();
  }
  function setScene(key, reset) {
    const name = key === 'bench1' || key === 'bench2' ? 'bench' : key;
    const was = sceneKey();
    const need = reset || !ready[key] || (name === 'bench' && BN.set !== (key === 'bench2' ? 2 : 1));
    if (key !== was) { FX.clear(); S.sceneT = 0; hideHint(); TD.o = null; DR.it = null; }
    S.scene = name;
    if (need) resetScene(key); else { refreshReadouts(); }
    if (key !== was || reset) showHintMsg(SCENES[key].hint, 6500);
    refreshUI();
  }

  /* ---- 새로 고침 · 단계 이동 뒤에도 이어서 할 수 있게, 앞 미션의 결과를 한 번에 채워 두는 도우미 ---- */
  function fillBench() {
    BN.items.forEach((it) => {
      it.meas.m = it.m; it.meas.v = it.V;
      const c = BN.cells[it.id];
      if (!c.r.done) { c.r.done = true; BN.graph.push({ id: it.id, v: it.V, m: it.m, pop: 0, y: 0 }); }
    });
    BN.graphLine = 1; BN.current = BN.items.length ? BN.items[BN.items.length - 1].id : null;
    refreshReadouts();
  }
  function fillTower() {
    sqCancel(); initTower();
    TW.stack = [{ id: 'syrup', vol: POUR_ML }, { id: 'water', vol: POUR_ML }, { id: 'oil', vol: POUR_ML }];
    TW.bottles.forEach((b) => { b.used = true; b.level = 0.3; });
    refreshReadouts();
  }

  /* ---------- 단추 · 선택 상자 ---------- */
  $('#resetBtn').addEventListener('click', () => { Sound.click(); resetScene(sceneKey()); showHintMsg(SCENES[sceneKey()].hint, 5000); });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene, true); }));
  $$('#lifeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setLife(b.dataset.v); }));
  [[selX, 'X'], [selY, 'Y']].forEach((q) => q[0].addEventListener('change', () => { PICK[q[1]] = q[0].value; Sound.click(); refreshUI(); }));

  /* ---------- 캔버스 입력 ---------- */
  function benchItemAt(p) {
    let best = null, bd = 1e9;
    BN.items.forEach((it) => {
      const h = itemH(it), w = it.lump ? it.r * 1.1 : it.w * 0.7 + 8;
      if (Math.abs(p.x - it.x) < w + 8 && p.y > it.y - h - 12 && p.y < it.y + 10) {
        const d = Math.abs(p.x - it.x);
        if (d < bd) { bd = d; best = it; }
      }
    });
    return best;
  }
  const DR = { it: null };
  const lifeHover = (p) => (LF.btn && inRect(p, LF.btn, 4) ? 'pointer' : null);
  SciSim.pointer(view, {
    hover(p) {
      if (S.scene === 'bench') return !BN.busy && benchItemAt(p) ? 'grab' : null;
      if (S.scene === 'tower') return towerHover(p);
      return lifeHover(p);
    },
    down(p) {
      hideHint();
      if (S.scene === 'bench') {
        const it = benchItemAt(p);
        if (it) {
          if (BN.busy) { it.shake = 1; return false; }
          DR.it = it; DR.ox = p.x - it.x; DR.oy = p.y - it.y; DR.sx = p.x; DR.sy = p.y; DR.moved = false;
          tw(it, { lift: 1 }, 0.12, 'outCubic');
          Sound.click();
          return true;
        }
        return false;
      }
      if (S.scene === 'tower') return towerDown(p);
      lifeTap(p);
      return false;
    },
    move(p) {
      if (S.scene === 'tower') { towerMove(p); return; }
      const it = DR.it;
      if (!it) return;
      if (Math.hypot(p.x - DR.sx, p.y - DR.sy) > 8) DR.moved = true;
      if (!DR.moved) return;
      it.x = clamp(p.x - DR.ox, 20, VW - 20); it.y = clamp(p.y - DR.oy, 30, GEO.base);
      BN.hover = it.x > GEO.scale.x0 - 10 && it.x < GEO.scale.x1 + 10 ? 'scale' : it.x > GEO.cyl.x0 - 24 && it.x < GEO.cyl.x1 + 24 ? 'cyl' : null;
    },
    up(p) {
      if (S.scene === 'tower') { towerUp(p); return; }
      const it = DR.it;
      if (!it) return;
      DR.it = null; BN.hover = null;
      if (!DR.moved) { tw(it, { lift: 0 }, 0.1, 'outCubic', () => autoMeasure(it)); return; }
      const nearScale = it.x > GEO.scale.x0 - 10 && it.x < GEO.scale.x1 + 10;
      const nearCyl = it.x > GEO.cyl.x0 - 24 && it.x < GEO.cyl.x1 + 24;
      if (nearScale) stationScale(it, () => goHome(it));
      else if (nearCyl) stationCyl(it, () => goHome(it));
      else { BN.busy = it; tw(it, { lift: 0 }, 0.15, 'outCubic'); arcTo(it, it.hx, it.hy, 0.45, () => { it.where = 'tray'; BN.busy = null; }); }
    },
  });
  view.canvas.style.touchAction = PHONE ? 'pan-y' : 'none';
  view.canvas.addEventListener('touchstart', (e) => {
    const tc = e.touches[0];
    if (!tc) return;
    const p = view.toLocal(tc);
    if ((S.scene === 'bench' && benchItemAt(p)) || (S.scene === 'tower' && (towerObjAt(p) || towerBottleAt(p)))) e.preventDefault();
  }, { passive: false });

  /* ---------- 갱신 · 그리기 ---------- */
  let lastDt = 1 / 60;
  function update(dt) {
    lastDt = dt;
    CLK.t += dt; S.sceneT += dt;
    sqUpdate(dt);
    FX.update(dt);
    updateTower(dt);
    updateLife(dt);
    updateBench(dt);
  }
  function draw() {
    view.clear(BG);
    const t = CLK.t, dt = lastDt;
    if (S.scene === 'bench') {
      drawBenchBg(); drawTray(); drawScale(); benchLabels(); drawCylinder(t);
      BN.items.filter((q) => q.where !== 'cyl').forEach((q) => { drawItemShadow(q); });
      BN.items.filter((q) => q.where !== 'cyl' && q.where !== 'scale').forEach(drawItemBody);
      BN.items.filter((q) => q.where === 'scale').forEach(drawItemBody);
      drawVolumeReading();
      if (BN.set === 1) drawMVGraph(); else drawDensityCard();
      drawDataTable();
      if (isNew('pick') && BN.set === 2) ringRect(LAY.card, 18);
    } else if (S.scene === 'tower') {
      drawTower(t);
      if (isNew('tower')) ringRect({ x: TG.slots[0] - 52, y: TG.shelf - 130, w: TG.slots[2] - TG.slots[0] + 104, h: 150 }, 16);
    } else {
      drawLife(t, dt);
      if (isNew('life')) ringRect(LC, 18);
    }
    FX.draw(ctx);
    drawChecks(dt);
    if (S.sceneT < 0.35) { ctx.save(); ctx.globalAlpha = 1 - ease.outCubic(S.sceneT / 0.35); ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH); ctx.restore(); }
  }
  let lastUI = 0;
  function pulse(t) {
    if (t - lastUI < 0.12) return;
    lastUI = t;
    if (lastFree !== !!(game && game.free)) refreshUI();
    if (S.scene === 'tower') refreshReadouts();
  }

  /* =========================================================
     미션 (4단계 · 11개)
     ========================================================= */
  const mark = (b) => (b ? '✅' : '⬜');
  const pickName = (id) => (DENS.find((q) => q.id === id) || {}).name || '';
  const chip = (s) => '<b>' + s + '</b>';

  /* 퀴즈 그림 (인라인 SVG) */
  const FIG_HALF = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 150" width="320" role="img" aria-label="알루미늄 조각 B(54 g, 20 cm³)를 반으로 자르면 한 조각은 27 g, 10 cm³">' +
    '<defs><linearGradient id="fgAl" x1="0" x2="1"><stop offset="0" stop-color="#f4f7fb"/><stop offset=".55" stop-color="#c9d2de"/><stop offset="1" stop-color="#8d9aad"/></linearGradient></defs>' +
    '<rect width="320" height="150" rx="12" fill="#f6f9ff"/>' +
    '<text x="52" y="24" text-anchor="middle" font-size="12.5" font-weight="700" fill="#5d6879">자르기 전</text>' +
    '<rect x="28" y="34" width="48" height="76" rx="5" fill="url(#fgAl)" stroke="#6f7d92" stroke-width="2"/>' +
    '<text x="52" y="80" text-anchor="middle" font-size="22" font-weight="800" fill="#4b5668">B</text>' +
    '<text x="52" y="130" text-anchor="middle" font-size="13" font-weight="800" fill="#1b2333">54 g · 20 cm³</text>' +
    '<path d="M100 72 H134" stroke="#8b5cf6" stroke-width="4" stroke-linecap="round"/><path d="M134 72 l-8 -7 v14 z" fill="#8b5cf6"/>' +
    '<text x="117" y="58" text-anchor="middle" font-size="20">✂️</text>' +
    '<text x="236" y="24" text-anchor="middle" font-size="12.5" font-weight="700" fill="#5d6879">반으로 자른 뒤</text>' +
    '<rect x="160" y="52" width="48" height="38" rx="5" fill="url(#fgAl)" stroke="#6f7d92" stroke-width="2"/>' +
    '<rect x="222" y="52" width="48" height="38" rx="5" fill="url(#fgAl)" stroke="#6f7d92" stroke-width="2"/>' +
    '<text x="184" y="77" text-anchor="middle" font-size="16" font-weight="800" fill="#4b5668">B₁</text><text x="246" y="77" text-anchor="middle" font-size="16" font-weight="800" fill="#4b5668">B₂</text>' +
    '<text x="236" y="112" text-anchor="middle" font-size="13" font-weight="800" fill="#1b2333">각각 27 g · 10 cm³</text>' +
    '<text x="236" y="132" text-anchor="middle" font-size="14" font-weight="800" fill="#6d28d9">질량 ÷ 부피 = ?</text></svg>';
  const FIG_LAYERS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 196" width="320" role="img" aria-label="식용유 0.92, 물 1.0, 물엿 1.4의 3층 액체와 밀도 1.2인 구슬">' +
    '<rect width="320" height="196" rx="12" fill="#f6f9ff"/>' +
    '<rect x="96" y="40" width="64" height="142" rx="8" fill="#fff" stroke="#8fa3bd" stroke-width="3"/>' +
    '<rect x="99" y="76" width="58" height="34" fill="#f3d23c" opacity=".85"/><rect x="99" y="110" width="58" height="34" fill="#3f9df3" opacity=".85"/><rect x="99" y="144" width="58" height="35" rx="5" fill="#dc8a1f" opacity=".9"/>' +
    '<g font-size="14" font-weight="800" fill="#1b2333"><text x="172" y="98">식용유 0.92</text><text x="172" y="132">물 1.0</text><text x="172" y="167">물엿 1.4</text></g>' +
    '<circle cx="128" cy="22" r="14" fill="#8b5cf6" stroke="#5b21b6" stroke-width="2"/><text x="128" y="27" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">1.2</text>' +
    '<path d="M128 40 V60" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 6"/>' +
    '<text x="40" y="26" text-anchor="middle" font-size="13" font-weight="800" fill="#6d28d9">구슬</text><text x="40" y="43" text-anchor="middle" font-size="12" font-weight="700" fill="#5d6879">(g/cm³)</text></svg>';
  const FIG_LOG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160" width="320" role="img" aria-label="물 위에 100 kg 통나무와 10 g 쇠못을 넣는 그림">' +
    '<rect width="320" height="160" rx="12" fill="#f6f9ff"/>' +
    '<rect x="0" y="86" width="320" height="74" rx="0" fill="#7cc4ff" opacity=".6"/><rect x="0" y="84" width="320" height="4" fill="#fff" opacity=".8"/>' +
    '<rect x="40" y="22" width="108" height="38" rx="19" fill="#b9854a" stroke="#7a4d22" stroke-width="2"/><ellipse cx="46" cy="41" rx="9" ry="17" fill="#d7a46c" stroke="#7a4d22" stroke-width="1.6"/>' +
    '<text x="94" y="46" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">통나무</text>' +
    '<text x="94" y="80" text-anchor="middle" font-size="13" font-weight="800" fill="#1b2333">100 kg</text>' +
    '<rect x="226" y="38" width="6" height="30" rx="2" fill="#6b7280" stroke="#374151" stroke-width="1.4"/><rect x="220" y="34" width="18" height="6" rx="2" fill="#6b7280" stroke="#374151" stroke-width="1.4"/>' +
    '<text x="229" y="22" text-anchor="middle" font-size="13" font-weight="800" fill="#1b2333">쇠못</text><text x="229" y="80" text-anchor="middle" font-size="13" font-weight="800" fill="#1b2333">10 g</text>' +
    '<text x="94" y="124" text-anchor="middle" font-size="22" font-weight="800" fill="#6d28d9">?</text><text x="229" y="124" text-anchor="middle" font-size="22" font-weight="800" fill="#6d28d9">?</text></svg>';

  /* 상태 표시줄 도우미 */
  const benchStatus = () => '잰 조각 <b>' + countMeasured() + ' / ' + BN.items.length + '</b> · ' + BN.items.map((q) => q.id + ' ' + mark(q.meas.m != null && q.meas.v != null)).join(' &nbsp;');
  const pourStatus = () => '부은 액체 <b>' + TW.stack.length + ' / 3</b> · ' + ['syrup', 'water', 'oil'].map((k) => LIQ[k].name + ' ' + mark(TW.stack.some((l) => l.id === k && l.vol >= POUR_ML - 0.01))).join(' &nbsp;');
  const testedStatus = () => !layersDone() ? '먼저 병을 눌러 액체 3층을 쌓아요. (부은 액체 <b>' + TW.stack.length + ' / 3</b>)' : '위치를 확인한 물체 <b>' + Math.min(3, TW.tested.size) + ' / 3</b> · ' + TW.objs.map((o) => o.name.replace(' 조각', '').replace('플라스틱 ', '') + ' ' + mark(TW.tested.has(o.id))).join(' &nbsp;');
  const lifeStatus = () => '체험한 장면 <b>' + lifeDoneCount() + ' / 5</b><br>' + LIFE_IDS.map((k) => LIFE_NAMES[k] + ' ' + mark(LF.done[k])).join(' &nbsp;');

  game = SciSim.game({
    simId: 'm2-density',
    mount: '#game',
    badge: '밀도 탐정',
    homeHref: '../../index.html#g2',
    featureLabels: {
      bench: '⚖️ 전자저울 · 눈금실린더 · 질량–부피 그래프',
      pick: '📋 밀도표와 물질 고르기',
      tower: '🧪 액체 층 쌓기와 물체 띄우기',
      life: '🏠 생활 속 밀도 장면',
    },
    onFeatures(set) { F = set; refreshUI(); },
    onMissionStart(m) {
      if (game && game.free) return;
      if (m.scene) setScene(m.scene, false);
      refreshUI();
    },
    onComplete() { refreshUI(); },
    levels: [
      {
        title: '물질의 특성: 크기가 달라도 같은 값', short: '물질의 특성', icon: '⚖️', phase: '관찰',
        features: ['bench'],
        intro: '<p class="si-q">❓ 탐구 질문: 크기가 다른 두 금속 조각이 같은 물질인지 어떻게 알 수 있을까?</p>' +
          '<p>크기가 다른 <b>알루미늄 조각</b> A·B·C의 <b>질량</b>(전자저울)과 <b>부피</b>(눈금실린더)를 재 보고, <b>양이 달라도 변하지 않는 값</b>이 있는지 찾아봐요.</p>',
        setup() { setScene('bench1', true); },
        recap: '조각의 질량과 부피는 달라도 <b>질량 ÷ 부피</b>는 같아요. 이렇게 양에 관계없이 물질마다 일정한 값을 <b>물질의 특성</b>이라 하고, 그중 하나가 <b>밀도</b>예요.',
        summary: '<ul><li><b>물질의 특성</b>: 특정한 조건에서 항상 일정한 값을 가지며, 물질의 <b>양에 따라 달라지지 않아서</b> 물질을 구별하는 중요한 정보가 돼요.</li>' +
          '<li>질량과 부피는 물질의 양에 따라 달라지므로 물질의 특성이 아니에요.</li>' +
          '<li><b>밀도 = 질량 ÷ 부피</b> (단위 g/cm³). 같은 물질이면 크기가 달라도 밀도가 같아요. (알루미늄 2.7 g/cm³)</li></ul>' +
          '<p class="note">※ 물질의 특성에는 밀도 말고도 용해도, 녹는점, 끓는점 등이 있어요.</p>',
        missions: [
          {
            title: '질량과 부피 재기', scene: 'bench1',
            goal: '알루미늄 조각 A, B, C를 눌러서 <b>질량</b>과 <b>부피</b>를 모두 재세요.',
            hint: '조각을 한 번 누르면 전자저울 → 눈금실린더 순서로 재 줘요. 조각을 저울이나 눈금실린더 쪽으로 끌어도 돼요.',
            setup() { if (BN.set !== 1) setScene('bench1', true); },
            check: () => BN.set === 1 && allMeasured(),
            hold: 0.9,
            status: benchStatus,
            explain: '조각마다 질량(27 g · 54 g · 81 g)과 부피(10 · 20 · 30 cm³)는 모두 달랐지만, <b>질량 ÷ 부피</b>는 모두 <b>2.7 g/cm³</b>로 같았어요. 그래프의 점도 한 직선 위에 놓였지요. 이 값은 알루미늄이라는 <b>물질</b>의 특성이에요.',
          },
          {
            type: 'quiz', title: '조각을 반으로 자르면?', scene: 'bench1',
            setup() { if (BN.set !== 1) setScene('bench1', true); if (!allMeasured()) fillBench(); },
            goal: '알루미늄 조각 B(질량 54 g, 부피 20 cm³)를 <b>반으로 자르면</b> 한 조각의 질량 ÷ 부피는 어떻게 될까요?',
            figure: FIG_HALF,
            choices: ['절반인 1.35 g/cm³가 된다', '그대로 2.7 g/cm³이다', '2배인 5.4 g/cm³가 된다', '자른 모양에 따라 달라진다'],
            answer: 1,
            feedback: ['질량도 절반(27 g), 부피도 절반(10 cm³)이 돼요. 27 ÷ 10을 계산해 보세요.', '', '질량과 부피가 함께 절반이 되므로 나눈 값은 커지지 않아요.', '모양이 달라져도 같은 물질이면 질량 ÷ 부피는 같아요.'],
            explain: '질량도 부피도 절반으로 줄지만 <b>질량 ÷ 부피 = 27 ÷ 10 = 2.7 g/cm³</b>로 그대로예요. 물질의 양이 달라져도 같은 물질이면 밀도는 변하지 않아요.',
          },
          {
            type: 'quiz', title: '물질의 특성 찾기', scene: 'bench1',
            goal: '다음 중 <b>물질의 특성</b>(양에 관계없이 물질마다 일정한 값)인 것은 무엇일까요?',
            choices: ['질량', '부피', '밀도', '온도'],
            answer: 2,
            feedback: ['질량은 물질의 양이 많을수록 커져요. 양에 따라 달라지므로 물질의 특성이 아니에요.', '부피도 양이 많을수록 커져요. 같은 물질이어도 크기에 따라 값이 달라요.', '', '온도는 데우거나 식히면 변해요. 같은 물질이어도 값이 달라서 물질을 구별하는 기준이 못 돼요.'],
            explain: '<b>밀도</b>(질량 ÷ 부피)는 같은 물질이면 양이 달라도 같은 값이라서 물질을 구별하는 <b>특성</b>이에요. 질량과 부피는 양에 따라 달라져요.',
          },
        ],
      },
      {
        title: '밀도 측정: 이 금속은 무엇일까?', short: '밀도 측정', icon: '🔎', phase: '실험',
        features: ['pick'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 물질이면 <b>질량 ÷ 부피</b>가 일정하다는 것(밀도)을 알았어요.</div>' +
          '<p>겉모습으로는 알 수 없는 <b>금속 조각 X, Y</b>가 있어요. 질량과 부피를 재어 <b>밀도 = 질량 ÷ 부피</b>를 구하고, <b>밀도표</b>에서 같은 값을 찾아 어떤 물질인지 알아내요.</p>',
        setup() { setScene('bench2', true); },
        recap: '<b>밀도 = 질량 ÷ 부피</b>를 구해 밀도표와 비교하면 모르는 물질이 무엇인지 알 수 있어요. 질량이 비슷해도 밀도는 다를 수 있어요.',
        summary: '<ul><li><b>밀도 = 질량 ÷ 부피</b> (g/cm³). 물질마다 값이 달라요.</li>' +
          '<li>밀도표: 알루미늄 2.7 · 철 7.9 · 구리 8.9 · 납 11.3 · 금 19.3 (g/cm³)</li>' +
          '<li>모르는 물질의 밀도를 구해 밀도표와 비교하면 <b>물질을 구별</b>할 수 있어요. 질량이 같아도 부피가 다르면 밀도가 달라요.</li></ul>',
        missions: [
          {
            title: '밀도로 물질 찾기', scene: 'bench2', manual: true,
            goal: 'X와 Y를 눌러 질량과 부피를 재고, 구한 <b>밀도</b>와 같은 값을 밀도표에서 찾아 오른쪽 상자에서 <b>X, Y가 어떤 물질인지</b> 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
            hint: '밀도 = 질량 ÷ 부피예요. X의 밀도와 똑같은 값을 가진 물질을 밀도표에서 찾아보세요. Y도 마찬가지예요.',
            setup() { if (BN.set !== 2) setScene('bench2', true); },
            check() {
              const its = BN.items;
              if (BN.set !== 2 || its.length < 2) return '장면을 다시 불러 오세요. (↺)';
              const un = its.filter((q) => q.meas.m == null || q.meas.v == null).map((q) => q.id);
              if (un.length) return un.join(', ') + ' 조각의 질량과 부피를 먼저 재세요.';
              const miss = ['X', 'Y'].filter((k) => !PICK[k]);
              if (miss.length) return miss.join(', ') + '의 물질을 오른쪽 상자에서 골라 주세요.';
              const bad = its.filter((q) => PICK[q.id] !== q.real);
              if (bad.length) return bad.map((q) => q.id + '의 밀도는 ' + (Math.round(dOf(q) * 10) / 10).toFixed(1) + ' g/cm³예요. 밀도표에서 같은 값을 다시 찾아보세요.').join(' ');
              return true;
            },
            status: () => benchStatus() + '<br>고른 물질: X ' + (pickName(PICK.X) || '–') + ' · Y ' + (pickName(PICK.Y) || '–'),
            onWin() { celebrate(PHONE ? 220 : 660, PHONE ? 440 : 180); },
            explain: 'X의 밀도 <b>7.9 g/cm³</b>는 <b>철</b>, Y의 밀도 <b>11.3 g/cm³</b>는 <b>납</b>과 같아요. 두 조각의 질량은 거의 같았지만(약 79 g) 부피가 달라서 밀도가 달랐어요. 이처럼 <b>밀도</b>로 물질을 구별할 수 있어요.',
          },
          {
            type: 'quiz', title: '밀도 계산하기', scene: 'bench2',
            goal: '어떤 금속 조각의 질량이 <b>89.0 g</b>, 부피가 <b>10 cm³</b>예요. 이 금속의 밀도와 물질은 무엇일까요? (밀도표를 참고해요)',
            choices: ['0.11 g/cm³ · 밀도표에 없다', '8.9 g/cm³ · 구리', '79 g/cm³ · 밀도표에 없다', '11.3 g/cm³ · 납'],
            answer: 1,
            feedback: ['부피 ÷ 질량으로 거꾸로 계산했어요. 밀도는 <b>질량 ÷ 부피</b>예요.', '', '질량에서 부피를 빼면 안 돼요. 질량 ÷ 부피를 계산해 보세요.', '89.0 ÷ 10 = 8.9예요. 납의 밀도는 11.3 g/cm³예요.'],
            explain: '밀도 = 질량 ÷ 부피 = 89.0 g ÷ 10 cm³ = <b>8.9 g/cm³</b>. 밀도표에서 같은 값을 가진 물질은 <b>구리</b>예요.',
          },
        ],
      },
      {
        title: '뜨고 가라앉기와 밀도', short: '뜨고 가라앉기', icon: '🧪', phase: '실험',
        features: ['tower'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물질마다 밀도가 다르다는 것을 알았어요.</div>' +
          '<p>액체도 물질이라서 <b>밀도</b>가 있어요. <b>물엿(1.4) · 물(1.0) · 식용유(0.92)</b>를 부어 층을 만들고, 물체를 넣어 어디에 뜨는지 살펴봐요. 밀도와 뜨고 가라앉는 것 사이에는 어떤 관계가 있을까요?</p>',
        setup() { setScene('tower', true); },
        recap: '물체의 밀도가 액체의 밀도보다 <b>작으면 뜨고</b>, <b>크면 가라앉아요</b>. 액체도 <b>밀도가 큰 것이 아래</b>에 층을 이뤄요.',
        summary: '<ul><li>밀도가 다른 액체를 부으면 <b>밀도가 큰 액체가 아래</b>, 작은 액체가 위에 층을 이뤄요. 물엿(1.4) &gt; 물(1.0) &gt; 식용유(0.92)</li>' +
          '<li>물체의 밀도가 액체보다 <b>작으면 뜨고</b>, <b>크면 가라앉아요</b>.</li>' +
          '<li>나무(0.6)는 식용유 위에, 플라스틱 구슬(0.95)은 식용유와 물 사이에, 포도알(1.1)은 물과 물엿 사이에 멈추고, 쇠구슬(7.9)은 바닥까지 가라앉아요.</li></ul>',
        missions: [
          {
            title: '액체 층 쌓기', scene: 'tower',
            goal: '병을 눌러 <b>물엿 · 물 · 식용유</b>를 모두 부어서 3개의 층을 만드세요.',
            hint: '병을 하나씩 눌러 보세요. 어떤 순서로 부어도 밀도가 큰 액체가 아래로 가라앉아요.',
            check: () => layersDone(),
            hold: 0.9,
            onWin() { celebrate(TG.cyl.cx, TG.cyl.yTop + 30); },
            status: pourStatus,
            explain: '세 액체는 <b>밀도가 큰 것이 아래</b>로 가라앉아 층을 이뤘어요. 아래부터 물엿(1.4), 물(1.0), 식용유(0.92) 순서예요.',
          },
          {
            title: '물체 띄워 보기', scene: 'tower',
            goal: '물체 카드를 끌어서(눌러도 돼요) 눈금실린더에 넣어 보세요. <b>3가지 이상</b> 넣고 어디에 멈추는지 관찰해요.',
            hint: '넣기 전에 어디에 멈출지 먼저 예상해 보세요. 물체의 밀도와 각 액체의 밀도를 비교하면 알 수 있어요.',
            setup() { if (!layersDone()) fillTower(); },
            check: () => layersDone() && TW.tested.size >= 3,
            hold: 0.9,
            onWin() { celebrate(TG.cyl.cx, TG.cyl.yTop + 30); },
            status: testedStatus,
            explain: '<b>나무(0.6)</b>는 식용유(0.92)보다 밀도가 작아서 맨 위에 떴어요. <b>플라스틱 구슬(0.95)</b>은 식용유보다 크고 물(1.0)보다 작아서 식용유와 물 사이에, <b>포도알(1.1)</b>은 물보다 크고 물엿(1.4)보다 작아서 물과 물엿 사이에 멈췄어요. <b>쇠구슬(7.9)</b>은 모든 액체보다 커서 바닥까지 가라앉았어요.',
          },
          {
            type: 'quiz', title: '어디에 멈출까? 예측하기', scene: 'tower',
            setup() { if (!layersDone()) fillTower(); },
            goal: '밀도가 <b>1.2 g/cm³</b>인 구슬을 이 3층 액체에 넣으면 어디에 멈출까요?',
            figure: FIG_LAYERS,
            choices: ['식용유 위에 뜬다', '식용유와 물 사이에 멈춘다', '물과 물엿 사이에 멈춘다', '맨 아래까지 가라앉는다'],
            answer: 2,
            feedback: ['구슬(1.2)은 식용유(0.92)보다 밀도가 커서 식용유 위에 뜰 수 없어요.', '구슬(1.2)은 물(1.0)보다도 밀도가 커요. 물보다 밀도가 큰 물체는 물 위에 뜰 수 없어요.', '', '구슬(1.2)은 물엿(1.4)보다 밀도가 작아요. 그래서 물엿 위에 떠요.'],
            explain: '물체의 밀도가 액체보다 <b>작으면 뜨고, 크면 가라앉아요</b>. 구슬(1.2)은 물(1.0)보다 크고 물엿(1.4)보다 작아서 <b>물과 물엿 사이</b>에 멈춰요.',
          },
        ],
      },
      {
        title: '생활 속 밀도', short: '적용', icon: '🏠', phase: '적용',
        features: ['life'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물체와 액체의 밀도를 비교하면 뜨는지 가라앉는지 알 수 있었어요.</div>' +
          '<p>구명조끼, 열기구, 기름 유출, 볍씨 고르기, 헬륨 풍선에도 밀도가 쓰여요. 장면마다 단추를 눌러 <b>밀도를 비교</b>해 보고 생활 속 현상을 설명해 봐요.</p>',
        setup() { setScene('life', true); },
        recap: '구명조끼 · 열기구 · 기름 · 볍씨 고르기 · 헬륨 풍선 모두 <b>밀도를 비교</b>해서 설명할 수 있어요. 무겁다고 해서 항상 가라앉는 것은 아니에요.',
        summary: '<ul><li><b>구명조끼</b>: 가벼운 소재 덕분에 사람의 평균 밀도가 물보다 작아져서 물 위에 떠요.</li>' +
          '<li><b>열기구</b>: 풍선 속 공기를 데우면 같은 부피 안의 공기 입자가 줄어 밀도가 작아져 떠올라요.</li>' +
          '<li><b>기름 유출</b>: 기름은 물보다 밀도가 작아서 바다 위에 뜨고 퍼져요. 오일펜스로 가둬요.</li>' +
          '<li><b>볍씨 고르기</b>: 소금물의 밀도를 높이면 밀도가 작은 쭉정이는 뜨고 알찬 씨는 가라앉아요.</li>' +
          '<li><b>헬륨 풍선</b>: 헬륨은 공기보다 밀도가 작아서 풍선이 떠올라요.</li>' +
          '<li>뜨고 가라앉는 것은 <b>질량이 아니라 밀도</b>(물체와 액체의 밀도 비교)로 정해져요.</li></ul>',
        missions: [
          {
            title: '생활 속 장면 체험하기', scene: 'life',
            goal: '위쪽 단추로 장면을 고르고, 장면 안의 단추를 눌러 <b>5가지 장면을 모두</b> 체험해 보세요.',
            hint: '🛟 구명조끼 입기 → 🔥 버너 켜기 → 🛢️ 오일펜스 설치 → 🌾 소금 3번 넣기 → 🎈 손 놓기 순서로 해 보세요.',
            check: () => lifeDoneCount() >= 5,
            hold: 0.9,
            onWin() { celebrate(PHONE ? 220 : 400, PHONE ? 180 : 170); },
            status: lifeStatus,
            explain: '구명조끼는 사람의 평균 밀도를 물보다 작게 만들고, 열기구는 데운 공기의 밀도를 바깥 공기보다 작게 만들어요. 기름은 물보다 밀도가 작아서 물 위에 뜨고, 쭉정이는 소금물보다, 헬륨은 공기보다 밀도가 작아서 떠올라요.',
          },
          {
            type: 'quiz', title: '볍씨 고르기', scene: 'life',
            setup() { setLife('seeds'); },
            goal: '볍씨를 소금물에 담그면 속이 빈 <b>쭉정이는 뜨고</b> 알찬 씨는 가라앉아요. 그 까닭은 무엇일까요?',
            choices: ['쭉정이는 질량이 커서', '쭉정이의 밀도가 소금물보다 작아서', '알찬 씨의 밀도가 소금물보다 작아서', '소금물의 밀도가 맹물보다 작아서'],
            answer: 1,
            feedback: ['쭉정이는 속이 비어 있어서 오히려 가벼워요. 질량이 아니라 밀도를 소금물과 비교해야 해요.', '', '밀도가 소금물보다 작으면 뜨는 것이에요. 알찬 씨는 가라앉았으니 소금물보다 밀도가 커요.', '소금을 녹이면 물의 밀도는 커져요. 그래서 밀도가 작은 쭉정이도 뜰 수 있어요.'],
            explain: '소금을 녹이면 용액의 밀도가 커져요. 쭉정이의 밀도는 소금물보다 작아서 <b>뜨고</b>, 알찬 씨는 소금물보다 밀도가 커서 <b>가라앉아요</b>.',
          },
          {
            type: 'quiz', title: '무거운 물체는 항상 가라앉을까?', scene: 'life',
            goal: '물에 <b>100 kg 통나무</b>와 <b>10 g 쇠못</b>을 넣으면 어떻게 될까요? (통나무의 밀도는 약 0.6 g/cm³, 쇠못은 7.9 g/cm³예요.)',
            figure: FIG_LOG,
            choices: ['통나무는 무거우니까 가라앉고, 쇠못은 가벼우니까 뜬다', '둘 다 무거우니까 가라앉는다', '통나무는 뜨고, 쇠못은 가라앉는다', '질량이 같을 때만 뜨고 가라앉는지 알 수 있다'],
            answer: 2,
            feedback: ['무겁다고 가라앉는 것은 아니에요. 물체의 밀도를 물의 밀도(1.0)와 비교해야 해요.', '통나무의 밀도(0.6)는 물(1.0)보다 작아서 아무리 커도 떠요.', '', '질량이 같지 않아도 밀도를 물과 비교하면 뜨고 가라앉는지 알 수 있어요.'],
            explain: '뜨고 가라앉는 것은 질량이 아니라 <b>밀도</b>로 정해져요. 통나무의 밀도(약 0.6)는 물(1.0)보다 작아서 100 kg이어도 <b>뜨고</b>, 쇠못(7.9)은 물보다 커서 10 g이어도 <b>가라앉아요</b>.',
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
    VW, VH, S, BN, TW, LF, GEO, LAY, TG, PICK, LIQ, CLK,
    get game() { return game; },
    update, draw, loadSet, autoMeasure, setScene, resetScene, fillBench, fillTower, pourBottle, dropObj, takeOut, setLife, lifeTap,
    sceneKey, layersDone, allMeasured,
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
    v2s(x, y) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + (x * r.width) / VW, y: r.top + (y * r.height) / VH }; },
    bench(n) { const t0 = performance.now(); let mx = 0; for (let i = 0; i < n; i++) { const a = performance.now(); update(1 / 60); draw(); mx = Math.max(mx, performance.now() - a); } return { avg: (performance.now() - t0) / n, max: mx }; },
  };
})();
