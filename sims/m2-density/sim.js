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
  const COL = {
    ink: '#1b2333', muted: '#5d6879', good: '#14a058', bad: '#e2464b', warm: '#f26b3a', cold: '#2f7de1',
    sub: '#8b5cf6', subD: '#5b21b6', line: '#dde4ef', glass: '#8fa3bd', water: '#6bb6f5',
  };
  const CLK = { t: 0 };                       // 화면 시계 (update에서 증가 → 빨리 감기·재현 가능)
  const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
  const inRect = (p, r, pad) => { pad = pad || 0; return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad; };
  const text = (x, y, s, o) => D.text(x, y, s, o);
  const pill = (x, y, s, o) => D.label(x, y, s, o);
  /* 16진수 색 → rgba 문자열 (밝게/어둡게 + 투명도) */
  function tint(hex, amt, a) {
    const c = SciSim.color.hexToRgb(hex), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    const f = (v) => Math.round((t - v) * p + v);
    return 'rgba(' + f(c.r) + ',' + f(c.g) + ',' + f(c.b) + ',' + (a == null ? 1 : a) + ')';
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
  function lensFrame(r, o, inner) {
    ctx.save();
    panel(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 20, '#fff', 18, 6, 'rgba(40,30,90,.25)');
    ctx.beginPath(); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.clip();
    vgrad(ctx, r.x, r.y, r.w, r.h, o.top || '#f9fcff', o.bot || '#e4effd');
    inner();
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
    const key = color + '|' + R;
    if (spriteCache[key]) return spriteCache[key];
    const k = 4, m = 1.55;
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

  /* =========================================================
     장면 1 · 측정대: 전자저울(질량) + 눈금실린더(부피)
     ========================================================= */
  const GEO = PHONE ? {
    panel: { x: 4, y: 4, w: 432, h: 348 }, base: 338,
    tray: { x0: 14, x1: 176, y: 200 }, scaleCx: 100, cylCx: 362,
  } : {
    panel: { x: 8, y: 8, w: 536, h: 374 }, base: 340,
    tray: { x0: 22, x1: 184, y: 328 }, scaleCx: 282, cylCx: 452,
  };
  GEO.scale = { cx: GEO.scaleCx, x0: GEO.scaleCx - 82, x1: GEO.scaleCx + 82, y0: GEO.base - 44, platY: GEO.base - 48, rest: GEO.base - 47,
    lcd: { x: GEO.scaleCx - 58, y: GEO.base - 38, w: 116, h: 28 } };
  GEO.cyl = { cx: GEO.cylCx, w: 54, base: GEO.base, yBot: GEO.base - 14, ppm: 2.3 };
  GEO.cyl.yTop = GEO.cyl.yBot - 100 * GEO.cyl.ppm;
  GEO.cyl.x0 = GEO.cyl.cx - GEO.cyl.w / 2; GEO.cyl.x1 = GEO.cyl.cx + GEO.cyl.w / 2;
  GEO.cyl.surf0 = GEO.cyl.yBot - 50 * GEO.cyl.ppm;          // 처음 물 50 mL 눈금의 높이
  const LAY = PHONE ? {
    card: { x: 4, y: 358, w: 432, h: 130 },
    table: { x: 4, y: 496, w: 432, h: 118 },
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
    text(G.cx, GEO.base + 28, '전자저울 (질량)', { size: 14, weight: 800, color: COL.muted });
    text(C.cx, GEO.base + 28, '눈금실린더 (부피)', { size: 14, weight: 800, color: COL.muted });
    text((T.x0 + T.x1) / 2, GEO.base + (PHONE ? -118 : 28), BN.set === 1 ? '알루미늄 조각' : '모르는 금속 조각', { size: 14, weight: 800, color: COL.muted });
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
    const P = PHONE ? { x0: R.x + 52, y0: R.y + 40, x1: R.x + R.w - 150, y1: R.y + R.h - 30 } : { x0: R.x + 46, y0: R.y + 54, x1: R.x + R.w - 18, y1: R.y + R.h - 178 };
    const X = (v) => P.x0 + (P.x1 - P.x0) * v / GR.xmax, Y = (m) => P.y1 - (P.y1 - P.y0) * m / GR.ymax;
    ctx.save();
    ctx.strokeStyle = 'rgba(120,135,160,.22)'; ctx.lineWidth = 1;
    for (let m = 0; m <= GR.ymax; m += 40) { ctx.beginPath(); ctx.moveTo(P.x0, Y(m)); ctx.lineTo(P.x1, Y(m)); ctx.stroke(); text(P.x0 - 7, Y(m) + 4.5, String(m), { size: 12.5, weight: 700, color: COL.muted, align: 'right' }); }
    for (let v = 0; v <= GR.xmax; v += 10) { ctx.beginPath(); ctx.moveTo(X(v), P.y0); ctx.lineTo(X(v), P.y1); ctx.stroke(); text(X(v), P.y1 + 16, String(v), { size: 12.5, weight: 700, color: COL.muted }); }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(P.x0, P.y0 - 4); ctx.lineTo(P.x0, P.y1); ctx.lineTo(P.x1 + 4, P.y1); ctx.stroke();
    text(P.x1, P.y1 + 30, '부피 (cm³)', { size: 12.5, weight: 800, color: COL.muted, align: 'right' });
    text(P.x0 - 4, P.y0 - 10, '질량 (g)', { size: 12.5, weight: 800, color: COL.muted, align: 'left' });
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
      q.pop = Math.max(0, q.pop - 0.016 * 1.1);
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
    const sel = { X: $('#selX').value, Y: $('#selY').value };
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
    const ph = PHONE, rh = ph ? 27 : 34, hh = ph ? 28 : 34, fs = ph ? 15 : 19;
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
     공통: 읽는 값 · 입력 · 갱신/그리기 루프
     ========================================================= */
  function refreshReadouts() {
    const set = (i, label, val) => { $('#rl' + i).textContent = label; $('#r' + i).innerHTML = val; };
    if (S.scene === 'bench') {
      const it = itemById(BN.current) || null;
      const m = it && it.meas.m != null ? f1(it.m) + '<small>g</small>' : '–';
      const v = it && it.meas.v != null ? it.V + '<small>cm³</small>' : '–';
      const d = it && it.meas.m != null && it.meas.v != null ? (Math.round(dOf(it) * 10) / 10).toFixed(1) + '<small>g/cm³</small>' : '–';
      set(1, (it ? it.id + ' · ' : '') + '질량 (전자저울)', m);
      set(2, (it ? it.id + ' · ' : '') + '부피 (눈금실린더)', v);
      set(3, (it ? it.id + ' · ' : '') + '질량 ÷ 부피', d);
    }
  }

  function stopAll() { sqCancel(); }
  function resetBench() {
    loadSet(BN.set);
  }
  const SCENES = {
    bench: { label: '⚖️ 알루미늄 조각의 질량과 부피 재기', hint: '알루미늄 조각을 눌러 보세요. 저울로 질량을, 눈금실린더로 부피를 재요.' },
  };
  function setScene(name, reset) {
    S.scene = name; S.sceneT = 0;
    if (name === 'bench' && (reset || !BN.items.length)) loadSet(BN.set);
    refreshReadouts();
  }

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
  SciSim.pointer(view, {
    hover(p) {
      if (S.scene === 'bench' && !BN.busy && benchItemAt(p)) return 'grab';
      return null;
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
      }
      return false;
    },
    move(p) {
      const it = DR.it;
      if (!it) return;
      if (Math.hypot(p.x - DR.sx, p.y - DR.sy) > 8) DR.moved = true;
      if (!DR.moved) return;
      it.x = clamp(p.x - DR.ox, 20, VW - 20); it.y = clamp(p.y - DR.oy, 30, GEO.base);
      BN.hover = it.x > GEO.scale.x0 - 10 && it.x < GEO.scale.x1 + 10 ? 'scale' : it.x > GEO.cyl.x0 - 24 && it.x < GEO.cyl.x1 + 24 ? 'cyl' : null;
    },
    up(p) {
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
    if (!tc || S.scene !== 'bench') return;
    if (benchItemAt(view.toLocal(tc))) e.preventDefault();
  }, { passive: false });

  /* ---------- 갱신 · 그리기 ---------- */
  function update(dt) {
    CLK.t += dt; S.sceneT += dt;
    sqUpdate(dt);
    FX.update(dt);
    if (S.scene === 'bench') updateBench(dt);
  }
  function draw() {
    view.clear(BG);
    const t = CLK.t;
    if (S.scene === 'bench') {
      drawBenchBg(); drawTray(); drawScale(); benchLabels(); drawCylinder(t);
      BN.items.filter((q) => q.where !== 'cyl').forEach((q) => { drawItemShadow(q); });
      BN.items.filter((q) => q.where !== 'cyl' && q.where !== 'scale').forEach(drawItemBody);
      BN.items.filter((q) => q.where === 'scale').forEach(drawItemBody);
      drawVolumeReading();
      if (BN.set === 1) drawMVGraph(); else drawDensityCard();
      drawDataTable();
    }
    FX.draw(ctx);
    drawChecks(1 / 60);
  }
  function loopFn(dt) { update(dt); draw(); }

  /* ---------- 시작 ---------- */
  loadSet(1);
  SciSim.loop((dt) => loopFn(dt));
  window.__sim = {
    VW, VH, S, BN, GEO, LAY, update, draw, loadSet, autoMeasure,
    ff(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); },
  };
})();
