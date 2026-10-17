/* =========================================================
   통합과학1 Ⅰ. 과학의 기초 - 신호와 정보 (단원 5차시)
   성취기준 [10통과1-01-04] 자연에서 일어나는 다양한 변화를 측정·분석하여 정보를 산출함을 알고, 이러한 정보를
   디지털로 변환하는 기술을 정보 통신에 활용하여 현대 문명에 미친 영향을 인식한다. (신호와 정보 부분)
   ① 관찰: 자연의 신호 (변화 → 신호 → 센서(블랙박스) → 전압 파형)
   ② 실험: 센서 측정 (온도·빛 센서로 하루 기록, 전압 ↔ 기온)
   ③ 분석: 정보 만들기 (신호를 분석해 최고 기온·심박수·진동수·진원 거리)
   ④ 적용: 센서와 생활 (스마트 기기 속 센서)
   센서의 작동 원리는 다루지 않고 입력(변화) → 출력(전압)만 보여 주는 블랙박스로 표현한다.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 840 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash = (i) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
  let SPEED = 1;

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f3f6fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FS = PHONE ? 1.2 : 1;
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const mixc = SciSim.color.mix;
  let game = null;

  function wrapText(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    const push = () => { if (line) out.push(line); line = ''; };
    str.split(' ').forEach((tok) => {
      const cand = line ? line + ' ' + tok : tok;
      if (ctx.measureText(cand).width <= maxW) { line = cand; return; }
      if (line) push();
      if (ctx.measureText(tok).width <= maxW) { line = tok; return; }
      tok.split('').forEach((ch) => { if (ctx.measureText(line + ch).width > maxW) push(); line += ch; });
    });
    push(); ctx.restore(); return out;
  }
  function paraText(x, y, str, maxW, size, o) {
    o = o || {};
    const lines = wrapText(str, maxW, size, o.weight || 700), lh = Math.round(size * (o.lh || 1.35) * FS);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, color: o.color || '#1b2333', weight: o.weight || 700, align: o.align || 'left' }));
    return lines.length * lh;
  }

  /* ======================================================
     신호 만들기: 자연의 변화 → 전압 (0 ~ 3.3 V)
     ====================================================== */
  /* 단조 3차 보간 (기온이 최고·최저점에서 튀지 않게) */
  function monoInterp(xs, ys) {
    const n = xs.length, d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return (x) => {
      let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }
  const KEY = [[-3, 15.6], [0, 11], [3, 10.3], [4, 10], [5, 10.7], [6, 12], [10, 20], [14, 26], [18, 21], [21, 15.6], [24, 11], [27, 10.3]];
  const tempFn = monoInterp(KEY.map((k) => k[0]), KEY.map((k) => k[1]));
  const tempC = (h) => tempFn(clamp(h, 0, 24));
  const T2V = (T) => (T + 10) / 50 * 3.3, V2T = (V) => V / 3.3 * 50 - 10;
  const Vtemp = (h) => T2V(tempC(h));
  const dayLight = (h) => Math.max(0, Math.sin(Math.PI * (h - 6) / 12));
  const Vlight = (h) => 0.08 + 3.0 * Math.pow(dayLight(h), 0.65);
  const Vsound = (ms) => 1.65 + 1.2 * Math.sin(TAU * 440 * ms / 1000);
  function Vquake(s) {
    let v = 1.65 + 0.035 * hash(Math.floor(s * 14));
    if (s > 12) v += 0.55 * Math.exp(-(s - 12) / 12) * Math.sin(TAU * 0.9 * (s - 12)) * Math.min(1, (s - 12) / 1.2);
    if (s > 22) v += 1.25 * Math.exp(-(s - 22) / 16) * Math.sin(TAU * 0.45 * (s - 22)) * Math.min(1, (s - 22) / 1.5);
    return clamp(v, 0.15, 3.2);
  }
  const HB = 0.86, RPH = 0.32;
  function Vecg(s) {
    const ph = ((s % HB) + HB) % HB / HB, g = (c, a, w) => a * Math.exp(-0.5 * ((ph - c) / w) * ((ph - c) / w));
    const sh = g(0.16, 0.12, 0.035) + g(0.292, -0.16, 0.011) + g(RPH, 1.0, 0.013) + g(0.348, -0.28, 0.012) + g(0.58, 0.3, 0.055);
    return 0.9 + 2.0 * sh;
  }
  const HEART_PEAKS = [0, 1, 2, 3].map((k) => RPH * HB + HB * k);
  const SOUND_PEAKS = [0, 1, 2, 3, 4].map((k) => (0.25 + k) / 440 * 1000);
  const SG = {
    light: { n: '빛', sensor: '빛 센서', ico: '☀️', col: '#f59e0b', win: 24, xt: 6, tf: (x) => Math.round(x) + '시', f: Vlight, cap: '해가 뜨고 지면서 밝기가 변해요', scale: '24시간' },
    temp: { n: '기온', sensor: '온도 센서', ico: '🌡️', col: '#e2464b', win: 24, xt: 6, tf: (x) => Math.round(x) + '시', f: Vtemp, cap: '하루 동안 기온이 오르내려요', scale: '24시간' },
    sound: { n: '소리', sensor: '마이크', ico: '🔊', col: '#8b5cf6', win: 10, xt: 2, tf: (x) => Math.round(x) + ' ms', f: Vsound, cap: '공기가 진동하며 소리가 전달돼요', scale: '10 ms를 확대' },
    quake: { n: '땅의 흔들림', sensor: '지진계', ico: '🌍', col: '#0d9488', win: 60, xt: 10, tf: (x) => Math.round(x) + '초', f: Vquake, cap: '땅이 흔들리는 파동이 퍼져 나와요', scale: '60초' },
    heart: { n: '심장 박동', sensor: '심전도 센서', ico: '💓', col: '#ec4899', win: 3, xt: 0.5, tf: (x) => (Math.round(x * 10) / 10) + '초', f: Vecg, cap: '심장이 뛸 때 몸에 전기 변화가 생겨요', scale: '3초' },
  };
  const SC_ORDER = ['light', 'temp', 'sound', 'quake', 'heart'];

  /* ---------- 배치 ---------- */
  const LY = PHONE ? {
    scene: { x: 16, y: 16, w: 568, h: 236 },
    box: { x: 238, y: 263, w: 112, h: 118 }, pk: { x0: 50, x1: 236, y: 322 }, wire: { x0: 350, x1: 392, y: 322 },
    dial: { x: 392, y: 262, w: 192, h: 120 },
    graph: { x: 16, y: 396, w: 568, h: 428 },
  } : {
    scene: { x: 16, y: 16, w: 330, h: 250 },
    pk: { x0: 346, x1: 424, y: 141 }, box: { x: 424, y: 87, w: 100, h: 108 }, wire: { x0: 524, x1: 560, y: 141 },
    dial: { x: 560, y: 16, w: 224, h: 250 },
    graph: { x: 16, y: 282, w: 768, h: 262 },
  };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'scene', clock: 0, fade: 0, drag: null,
    sc: { id: 'light', u: 0, hold: 0, seen: new Set(), tri: 0 },
    rec: { h: 0, run: false, T: [], L: [], done: false, cur: 12 },
    an: { id: 'temp', wDisp: 1, raw: [], marks: {}, ok: { temp: false, heart: false, sound: false, quake: false }, info: 0, drag: null },
    ap: { rows: [], chips: [], ok: false, okA: 0 },
  };
  const has = (n) => !!(game && game.has(n));

  /* ======================================================
     공통 그림
     ====================================================== */
  /* 큰 카드는 그림자 대신 아래쪽 옅은 띠로 입체감(프레임 시간 절약) */
  function panel(x, y, w, h, fill) { ctx.fillStyle = 'rgba(30,45,80,.10)'; rr(x, y + 3, w, h, 16).fill(); ctx.fillStyle = fill || '#fff'; rr(x, y, w, h, 16).fill(); }
  const clipTo = (r, fn, rad) => { ctx.save(); rr(r.x, r.y, r.w, r.h, rad == null ? 16 : rad).clip(); fn(); ctx.restore(); };
  const STARS = (() => { const a = []; for (let i = 0; i < 40; i++) a.push({ x: (hash(i * 3 + 1) + 1) / 2, y: (hash(i * 5 + 2) + 1) / 2 * 0.7, s: 0.6 + (hash(i * 7 + 3) + 1) * 0.6 }); return a; })();
  function skyScene(r, hr, t, o) {
    o = o || {};
    const sunA = Math.sin(Math.PI * (hr - 6) / 12), b = clamp(sunA * 1.6 + 0.25, 0, 1);
    const yh = r.y + r.h * 0.76;
    let top = mixc('#0a1030', '#4fb0ff', b), bot = mixc('#1b2556', '#d9efff', b);
    const edge = Math.max(0, 1 - Math.abs(sunA) / 0.3);
    bot = mixc(bot, '#ff9a4d', edge * 0.6);
    const g = ctx.createLinearGradient(0, r.y, 0, yh); g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    if (b < 0.55) { ctx.fillStyle = '#fff'; STARS.forEach((s, i) => { ctx.globalAlpha = (0.55 - b) * 1.6 * (0.6 + 0.4 * Math.sin(t * 2 + i)); ctx.beginPath(); ctx.arc(r.x + s.x * r.w, r.y + s.y * r.h, s.s, 0, 6.3); ctx.fill(); }); ctx.globalAlpha = 1; }
    // 해 / 달
    const pos = (frac) => ({ x: r.x + r.w * (0.1 + 0.8 * frac), y: yh - Math.sin(Math.PI * frac) * r.h * 0.6 - 6 });
    const fs = (hr - 6) / 12;
    if (fs > -0.06 && fs < 1.06) { const p = pos(clamp(fs, 0, 1)); const fadeS = smooth(fs, -0.06, 0.04) * (1 - smooth(fs, 0.96, 1.06)); ctx.globalAlpha = fadeS; D.glow(p.x, p.y, 54, '#ffd54a', 0.7); D.sphere(p.x, p.y, 17, '#ffb300', { light: '#fff3b0', dark: '#f59e0b' }); ctx.globalAlpha = 1; }
    let hm = hr < 6 ? hr + 6 : hr - 18; const fm = hm / 12;
    if (b < 0.7 && fm >= 0 && fm <= 1) { const p = pos(fm); ctx.globalAlpha = 1 - b / 0.7; D.sphere(p.x, p.y, 13, '#e2e8f0', { light: '#fff', dark: '#94a3b8' }); ctx.fillStyle = mixc(top, '#000', 0.0); ctx.globalAlpha = 1; }
    // 땅
    const gg = ctx.createLinearGradient(0, yh, 0, r.y + r.h); gg.addColorStop(0, mixc('#2f5d3a', '#7ccf6e', b)); gg.addColorStop(1, mixc('#16301d', '#4aa05a', b));
    ctx.fillStyle = gg; ctx.fillRect(r.x, yh, r.w, r.y + r.h - yh);
    if (!o.noHouse) {
      const hx = r.x + r.w * 0.2, hy = yh;
      ctx.fillStyle = mixc('#2a2540', '#e8d8b8', b); ctx.fillRect(hx - 22, hy - 28, 44, 30);
      ctx.fillStyle = mixc('#3b1d1d', '#c2553f', b); ctx.beginPath(); ctx.moveTo(hx - 28, hy - 28); ctx.lineTo(hx, hy - 50); ctx.lineTo(hx + 28, hy - 28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = b < 0.5 ? '#ffd54a' : mixc('#8bb8e8', '#bfe0ff', b); ctx.fillRect(hx - 6, hy - 20, 12, 12);
      const tx = r.x + r.w * 0.86; ctx.fillStyle = mixc('#2b1b10', '#8a5a2c', b); ctx.fillRect(tx - 3, hy - 22, 6, 24); ctx.fillStyle = mixc('#12301a', '#3e9a4e', b); ctx.beginPath(); ctx.arc(tx, hy - 34, 17, 0, 6.3); ctx.fill();
    }
    return { yh, b };
  }
  function sensorBox(r, sg, t, on) {
    D.shadow(() => { const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, '#334155'); g.addColorStop(1, '#0f172a'); ctx.fillStyle = g; rr(r.x, r.y, r.w, r.h, 16).fill(); }, { blur: 12, y: 5, color: 'rgba(15,23,42,.4)' });
    ctx.strokeStyle = sg.col; ctx.lineWidth = 3; rr(r.x, r.y, r.w, r.h, 16).stroke();
    D.text(r.x + r.w / 2, r.y + 34, '센서', { size: 22, weight: 800, color: '#fff' });
    D.text(r.x + r.w / 2, r.y + 56, sg.sensor, { size: 13, weight: 800, color: sg.col });
    D.text(r.x + r.w / 2, r.y + 78, '변화 → 전압', { size: 12.5, weight: 700, color: '#cbd5e1' });
    const blink = on ? 0.5 + 0.5 * Math.sin(t * 8) : 0.2;
    D.sphere(r.x + r.w - 16, r.y + 16, 5, mixc('#14532d', '#4ade80', blink), { gloss: false });
    D.text(r.x + r.w / 2, r.y + r.h - 12, '(블랙박스)', { size: 12, weight: 700, color: '#94a3b8' });
  }
  function packets(x0, x1, y, col, t, on) {
    ctx.save();
    ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 18; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.setLineDash([]);
    if (on) for (let k = 0; k < 3; k++) {
      const p = ((t * 0.55 + k / 3) % 1), cx = x0 + (x1 - x0) * p, a = Math.sin(Math.PI * p);
      ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = -12; i <= 12; i += 2) { const px = cx + i, py = y + Math.sin(i * 0.8 + t * 10) * 9 * (1 - Math.abs(i) / 14); i === -12 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.stroke();
    }
    ctx.restore();
  }
  function wireFlow(x0, x1, y, col, t, on) {
    ctx.save(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    if (on) for (let k = 0; k < 3; k++) { const p = (t * 0.9 + k / 3) % 1; D.sphere(x0 + (x1 - x0) * p, y, 4, col, { gloss: false }); }
    ctx.restore();
  }

  /* ---------- 장면 그림 5가지 ---------- */
  function sceneLight(r, u, t) {
    const hr = u * 24; skyScene(r, hr, t);
    D.label(r.x + 12, r.y + 22, ('0' + Math.floor(hr)).slice(-2) + ':' + ('0' + Math.floor((hr % 1) * 60)).slice(-2), { bg: 'rgba(15,23,42,.7)', size: 15, align: 'left' });
    // 햇빛 화살
    const b = clamp(dayLight(hr) * 1.2, 0, 1);
    if (b > 0.05) { ctx.save(); ctx.globalAlpha = b * 0.7; ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.moveTo(r.x + r.w * 0.55, r.y + 14); ctx.lineTo(r.x + r.w * 0.82, r.y + r.h * 0.7); ctx.stroke(); ctx.restore(); }
  }
  function sceneTemp(r, u, t) {
    const hr = u * 24; skyScene(r, hr, t, { noHouse: true });
    const T = tempC(hr);
    D.label(r.x + 12, r.y + 22, ('0' + Math.floor(hr)).slice(-2) + ':' + ('0' + Math.floor((hr % 1) * 60)).slice(-2), { bg: 'rgba(15,23,42,.7)', size: 15, align: 'left' });
    const px = r.x + r.w * 0.5, ph = r.h * 0.56;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(px - 62, r.y + 28, 124, r.h * 0.76, 18).fill(); }, { blur: 10, y: 4 });
    D.thermometer(px - 18, r.y + 44, ph - 24, T, -10, 40, { step: 10, unit: '°', color: T > 20 ? '#e2464b' : '#3b82f6' });
    D.text(px, r.y + r.h * 0.76 + 14, T.toFixed(1) + ' °C', { size: 17, weight: 800, color: '#1b2333' });
    // 열 아지랑이
    if (T > 18) { ctx.save(); ctx.strokeStyle = 'rgba(255,120,60,' + clamp((T - 18) / 20, 0, 0.6) + ')'; ctx.lineWidth = 2.5; for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let i = 0; i <= 20; i++) { const yy = r.y + r.h * 0.74 - i * 5, xx = r.x + r.w * (0.14 + 0.1 * k) + Math.sin(i * 0.6 + t * 4 + k) * 5; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); } ctx.restore(); }
  }
  function sceneSound(r, u, t) {
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, '#1e1b4b'); g.addColorStop(1, '#312e81'); ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    const cx = r.x + 62, cy = r.y + r.h * 0.5, vib = Math.sin(t * 38) * 3;
    D.shadow(() => { ctx.fillStyle = '#1f2937'; rr(cx - 40, cy - 66, 80, 132, 12).fill(); }, { blur: 10, y: 4 });
    D.sphere(cx, cy + 20, 26 + vib * 0.4, '#475569', { gloss: false }); D.sphere(cx, cy + 20, 12 + vib * 0.3, '#0f172a', { gloss: false }); D.sphere(cx, cy - 38, 11, '#475569', { gloss: false });
    // 공기 진동(압축·팽창)
    const L = r.w - 120, x0 = cx + 52;
    for (let k = 0; k < 5; k++) { const ph = ((t * 0.9 - k * 0.2) % 1 + 1) % 1, rad = 10 + ph * (L - 10); ctx.strokeStyle = 'rgba(196,181,253,' + (1 - ph) * 0.9 + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx + 6, cy + 20, rad + 30, -0.9, 0.9); ctx.stroke(); }
    for (let i = 0; i < 40; i++) { const bx = x0 + ((i * 29) % L), by = cy + 20 + (((i * 53) % 90) - 45), dx = Math.sin(t * 9 - bx * 0.12) * 6; D.sphere(bx + dx, by, 2.8, '#c4b5fd', { gloss: false }); }
    D.label(r.x + r.w - 10, r.y + 24, '440 Hz · "라"', { bg: 'rgba(15,23,42,.65)', size: 14, align: 'right' });
  }
  function sceneQuake(r, u, t) {
    const tau = u * 60, yh = r.y + r.h * 0.36;
    ctx.fillStyle = '#bde3ff'; ctx.fillRect(r.x, r.y, r.w, yh - r.y);
    ['#8d6e4a', '#7a5c3a', '#6a4d30', '#5a4028'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(r.x, yh + i * (r.y + r.h - yh) / 4, r.w, (r.y + r.h - yh) / 4 + 1); });
    const fx = r.x + 44, fy = r.y + r.h * 0.8, sx = r.x + r.w - 48, sy = yh, dist = Math.hypot(sx - fx, sy - fy);
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, yh, r.w, r.y + r.h - yh); ctx.clip();
    [[dist / 12, '#38bdf8'], [dist / 22, '#fb923c']].forEach(([v, col], i) => {
      const rad = v * tau; if (rad < 2) return;
      ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.globalAlpha = clamp(1 - (rad - dist) / 90, 0.15, 0.95); ctx.beginPath(); ctx.arc(fx, fy, rad, -Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(fx, fy, rad, 0, Math.PI); ctx.stroke(); ctx.globalAlpha = 1;
    });
    ctx.restore();
    D.glow(fx, fy, 30, '#fde047', 0.6); D.sphere(fx, fy, 8, '#ef4444');
    D.text(fx, fy + 24, '진원', { size: 13, weight: 800, color: '#fff' });
    // 관측소
    const shake = (tau > 22 ? 1 : tau > 12 ? 0.35 : 0) * Math.sin(t * 45) * 2.2;
    ctx.save(); ctx.translate(shake, 0);
    ctx.fillStyle = '#f1f5f9'; rr(sx - 20, sy - 36, 40, 36, 4).fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; rr(sx - 20, sy - 36, 40, 36, 4).stroke();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(sx - 24, sy - 36); ctx.lineTo(sx, sy - 54); ctx.lineTo(sx + 24, sy - 36); ctx.closePath(); ctx.fill();
    ctx.restore();
    D.text(sx, sy - 62, '관측소', { size: 13, weight: 800, color: '#334155' });
    D.label(r.x + 10, r.y + 22, 'P파', { bg: '#38bdf8', size: 13, align: 'left' }); D.label(r.x + 60, r.y + 22, 'S파', { bg: '#fb923c', size: 13, align: 'left' });
    D.label(r.x + 108, r.y + 22, tau.toFixed(0) + '초', { bg: 'rgba(15,23,42,.7)', size: 14, align: 'left' });
  }
  function sceneHeart(r, u, t) {
    ctx.fillStyle = '#fdf2f8'; ctx.fillRect(r.x, r.y, r.w, r.h);
    const tau = u * 3, cx = r.x + r.w * 0.5, cy = r.y + r.h * 0.56;
    // 사람(상체)
    D.shadow(() => { ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.moveTo(cx - 98, r.y + r.h); ctx.quadraticCurveTo(cx - 100, cy - 52, cx - 40, cy - 62); ctx.lineTo(cx + 40, cy - 62); ctx.quadraticCurveTo(cx + 100, cy - 52, cx + 98, r.y + r.h); ctx.closePath(); ctx.fill(); }, { blur: 8, y: 3 });
    D.sphere(cx, r.y + 44, 24, '#fcd9b6');
    // 심장
    const ph = ((tau % HB) + HB) % HB, beat = Math.exp(-Math.pow((ph - RPH * HB) / 0.07, 2)), k = 1 + 0.2 * beat;
    ctx.save(); ctx.translate(cx - 18, cy - 4); ctx.scale(k, k);
    D.shadow(() => { ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(0, 22); ctx.bezierCurveTo(-44, -4, -22, -34, 0, -12); ctx.bezierCurveTo(22, -34, 44, -4, 0, 22); ctx.fill(); }, { blur: 8, y: 2 });
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(-12, -12, 8, 4, -0.6, 0, 6.3); ctx.fill(); ctx.restore();
    // 전극
    [[cx - 68, cy - 36], [cx + 52, cy - 36], [cx + 28, cy + 36]].forEach(([ex, ey], i) => { D.sphere(ex, ey, 9, '#fde047', { gloss: false }); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex, ey + 9); ctx.quadraticCurveTo(ex + (i === 1 ? 24 : -20), r.y + r.h - 6, r.x + r.w * (0.2 + i * 0.3), r.y + r.h); ctx.stroke(); });
    if (beat > 0.05) D.ring(cx - 18, cy - 4, 50 + (1 - beat) * 20, t * 2, { color: '#e2464b', speed: 0, width: 2 });
    D.label(r.x + r.w - 10, r.y + 22, Math.round(60 / HB) + '회/분', { bg: 'rgba(190,24,93,.8)', size: 14, align: 'right' });
  }
  const SCENE_FN = { light: sceneLight, temp: sceneTemp, sound: sceneSound, quake: sceneQuake, heart: sceneHeart };

  /* ---------- 그래프 틀 ---------- */
  function graphFrame(r, title, win, xt, tf, o) {
    o = o || {};
    const gx = r.x + 50, gy = r.y + (o.top || 34), gw = r.w - 50 - 18, gh = r.h - (o.top || 34) - 40;
    panel(r.x, r.y, r.w, r.h);
    D.text(r.x + 16, r.y + 24, title, { size: 14.5, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(gx, gy, gw, gh);
    const Yv = (v) => gy + gh - (v / 3.3) * gh, X = (x) => gx + x / win * gw;
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#e2e8f0';
    [0, 1, 2, 3].forEach((v) => { ctx.beginPath(); ctx.moveTo(gx, Yv(v)); ctx.lineTo(gx + gw, Yv(v)); ctx.stroke(); D.text(gx - 8, Yv(v) + 4, v + '', { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    for (let k = 0; k <= win + 1e-6; k += xt) { const x = X(k); ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke(); D.text(x, gy + gh + 18, tf(k), { size: 12.5, weight: 700, color: '#64748b' }); }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    D.text(gx - 8, gy - 8, 'V', { size: 12.5, weight: 800, color: '#64748b', align: 'right' });
    return { gx, gy, gw, gh, X, Yv };
  }
  function trace(G, f, win, upto, col, lw) {
    const n = Math.max(2, Math.floor(G.gw)), end = Math.min(win, upto);
    ctx.save(); ctx.beginPath(); ctx.rect(G.gx, G.gy - 4, G.gw, G.gh + 8); ctx.clip();
    ctx.strokeStyle = col; ctx.lineWidth = lw || 3; ctx.lineJoin = 'round'; ctx.beginPath();
    let last = null;
    for (let i = 0; i <= n; i++) { const x = win * i / n; if (x > end) break; const px = G.X(x), py = G.Yv(f(x)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); last = [px, py]; }
    ctx.stroke(); ctx.restore();
    return last;
  }

  /* ======================================================
     화면 1: 자연의 신호
     ====================================================== */
  const SC_DUR = 7;
  function scStart(id) { const s = S.sc; s.id = id; s.u = 0; s.hold = 0; Sound.click(); updateScBtns(); }
  function stepScene(dt) {
    const s = S.sc;
    if (s.hold > 0) { s.hold -= dt; if (s.hold <= 0) { s.u = 0; } return; }
    s.u += dt * SPEED / (RM ? 1.5 : SC_DUR);
    if (s.u >= 0.7 && !s.seen.has(s.id)) { s.seen.add(s.id); Sound.success(); updateScBtns(); const L = LY.graph; parts.burst(L.x + L.w - 60, L.y + 60, { count: 10, speed: 130, size: 3, life: 0.7, colors: [SG[s.id].col, '#fff'] }); }
    if (s.u >= 1) { s.u = 1; s.hold = 1.4; }
  }
  function drawDial(r, sg, v, label) {
    panel(r.x, r.y, r.w, r.h);
    D.text(r.x + r.w / 2, r.y + 24, '전압계 (센서의 출력)', { size: 14, weight: 800, color: '#334155' });
    if (PHONE) {
      D.text(r.x + r.w / 2, r.y + 66, v.toFixed(2) + ' V', { size: 28, weight: 800, color: '#1b2333' });
      const bx = r.x + 18, bw = r.w - 36, by = r.y + 84;
      ctx.fillStyle = '#e8edf4'; rr(bx, by, bw, 14, 7).fill();
      ctx.fillStyle = sg.col; rr(bx, by, Math.max(14, bw * clamp(v / 3.3, 0, 1)), 14, 7).fill();
      D.text(bx, by + 32, '0', { size: 12.5, weight: 700, color: '#64748b', align: 'left' }); D.text(bx + bw, by + 32, '3.3 V', { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
    }
    else { D.dial(r.x + r.w / 2, r.y + 112, 66, v, 0, 3.3, { ticks: 3, color: sg.col }); D.text(r.x + r.w / 2, r.y + 212, v.toFixed(2) + ' V', { size: 28, weight: 800, color: '#1b2333' }); D.text(r.x + r.w / 2, r.y + 236, label || '', { size: 13, weight: 700, color: '#64748b' }); }
  }
  function drawScene(t) {
    const s = S.sc, sg = SG[s.id], L = LY;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    // 장면
    ctx.save(); const sc = { x: L.scene.x, y: L.scene.y, w: L.scene.w, h: L.scene.h };
    panel(sc.x, sc.y, sc.w, sc.h);
    clipTo(sc, () => SCENE_FN[s.id](sc, s.u, t));
    ctx.restore();
    D.label(sc.x + sc.w / 2, sc.y + sc.h + (PHONE ? -14 : -14), sg.ico + ' ' + sg.cap, { bg: 'rgba(15,23,42,.72)', size: PHONE ? 12.5 : 13, align: 'center' });
    // 신호 → 센서 → 전압계
    const on = s.hold <= 0;
    const mid = L.pk.y;
    packets(L.pk.x0, L.pk.x1, mid, sg.col, t, on);
    D.text((L.pk.x0 + L.pk.x1) / 2, mid - 24, '신호', { size: 14, weight: 800, color: sg.col });
    D.text((L.pk.x0 + L.pk.x1) / 2, mid + 30, '변화 전달', { size: 12, weight: 700, color: '#64748b' });
    sensorBox(L.box, sg, t, on);
    wireFlow(L.wire.x0, L.wire.x1, L.wire.y, sg.col, t, on);
    const x = s.u * sg.win, v = sg.f(Math.min(x, sg.win));
    drawDial(L.dial, sg, v, sg.sensor + ' · 전기 신호');
    // 그래프
    const G = graphFrame(L.graph, sg.n + ' 센서의 출력: 시간 → 전압 그래프 (' + sg.scale + ')', sg.win, sg.xt, sg.tf);
    ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = sg.col; const last0 = G.X(Math.min(x, sg.win));
    ctx.beginPath(); ctx.moveTo(G.gx, G.gy + G.gh); const nn = Math.floor(G.gw); for (let i = 0; i <= nn; i++) { const xx = sg.win * i / nn; if (xx > x) break; ctx.lineTo(G.X(xx), G.Yv(sg.f(xx))); } ctx.lineTo(last0, G.gy + G.gh); ctx.closePath(); ctx.fill(); ctx.restore();
    const tip = trace(G, sg.f, sg.win, x, sg.col, 3.2);
    if (tip) { D.glow(tip[0], tip[1], 18, sg.col, 0.6); D.sphere(tip[0], tip[1], 5.5, sg.col, { gloss: false }); }
    if (s.u >= 0.7) D.label(G.gx + G.gw - 8, G.gy + 18, '✔ 측정 완료', { bg: '#14a058', size: 13, align: 'right' });
    D.text(G.gx + G.gw, G.gy + G.gh + 34, '시간 →', { size: 12.5, weight: 700, color: '#94a3b8', align: 'right' });
  }

  /* ======================================================
     화면 2: 센서 측정 (하루 기록)
     ====================================================== */
  const RL = () => PHONE ? { scene: { x: 16, y: 16, w: 568, h: 200 }, graph: { x: 16, y: 230, w: 568, h: 330 }, tab: { x: 16, y: 574, w: 568, h: 250 } }
    : { scene: { x: 16, y: 16, w: 768, h: 172 }, graph: { x: 16, y: 200, w: 540, h: 344 }, tab: { x: 570, y: 200, w: 214, h: 344 } };
  function recSample(i) { return { T: Vtemp(i * 0.1) + 0.022 * hash(i * 2 + 1), L: Vlight(i * 0.1) + 0.03 * hash(i * 2 + 7) }; }
  function stepRec(dt) {
    const R = S.rec; if (!R.run) return;
    R.h = Math.min(24, R.h + dt * SPEED * (RM ? 12 : 2));
    const idx = Math.floor(R.h * 10 + 1e-6);
    while (R.T.length <= idx && R.T.length <= 240) { const sm = recSample(R.T.length); R.T.push(sm.T); R.L.push(sm.L); }
    if (R.h >= 24) { R.run = false; R.done = true; Sound.success(); updateRecCtl(); const g = RL().graph; parts.burst(g.x + g.w - 40, g.y + 40, { count: 14, speed: 140, size: 3.5, life: 0.8 }); }
  }
  function recFinish() { const R = S.rec; R.T = []; R.L = []; for (let i = 0; i <= 240; i++) { const sm = recSample(i); R.T.push(sm.T); R.L.push(sm.L); } R.h = 24; R.run = false; R.done = true; updateRecCtl(); }
  function recReset() { const R = S.rec; R.h = 0; R.run = false; R.T = []; R.L = []; R.done = false; updateRecCtl(); }
  const CUR_AT = (arr, h) => { const i = clamp(Math.round(h * 10), 0, 240); return i < arr.length ? arr[i] : null; };
  function drawRecord(t) {
    const R = S.rec, L = RL(), sc = L.scene;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    panel(sc.x, sc.y, sc.w, sc.h);
    const hr = R.run || R.done || R.h > 0 ? R.h : 12;
    let yh;
    clipTo(sc, () => {
      const q = skyScene(sc, hr % 24 === 0 && R.done ? 23.99 : hr, t, { noHouse: true }); yh = q.yh;
      // 기둥과 센서 두 개
      const px = sc.x + sc.w * 0.5;
      ctx.fillStyle = '#8a5a2c'; ctx.fillRect(px - 4, yh - 62, 8, 66);
      [[-1, '온도 센서', '#e2464b'], [1, '빛 센서', '#f59e0b']].forEach(([sgn, nm, col]) => {
        const bx = px + sgn * 56;
        ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, yh - 44); ctx.lineTo(bx, yh - 44); ctx.stroke();
        D.shadow(() => { ctx.fillStyle = '#1f2937'; rr(bx - 34, yh - 78, 68, 36, 9).fill(); }, { blur: 6, y: 2 });
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; rr(bx - 34, yh - 78, 68, 36, 9).stroke();
        D.text(bx, yh - 55, nm, { size: 12.5, weight: 800, color: '#fff' });
        const on = R.run; D.sphere(bx + 26, yh - 72, 3.5, on ? '#4ade80' : '#14532d', { gloss: false });
      });
    });
    const hh = Math.floor(hr % 24), mm = Math.floor((hr % 1) * 60);
    D.label(sc.x + 14, sc.y + 24, ('0' + hh).slice(-2) + ':' + ('0' + mm).slice(-2), { bg: 'rgba(15,23,42,.75)', size: 17, align: 'left' });
    D.label(sc.x + sc.w - 14, sc.y + 24, R.done ? '✔ 하루 기록 완료' : R.run ? '⏱ 측정 중… (24시간 → 12초)' : R.h > 0 ? '⏸ 멈춤' : '▶ 측정 시작을 눌러요', { bg: R.done ? '#14a058' : 'rgba(15,23,42,.75)', size: 14, align: 'right' });
    // 그래프
    const g = L.graph, G = graphFrame(g, '하루 동안 센서 출력 (시간 → 전압)', 24, 6, (k) => Math.round(k) + '시');
    const traceArr = (arr, col) => {
      if (!arr.length) return;
      ctx.save(); ctx.beginPath(); ctx.rect(G.gx, G.gy - 4, G.gw, G.gh + 8); ctx.clip(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      arr.forEach((v, i) => { const px = G.X(i * 0.1), py = G.Yv(v); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); ctx.restore();
      if (R.run) { const i = arr.length - 1; D.glow(G.X(i * 0.1), G.Yv(arr[i]), 14, col, 0.6); D.sphere(G.X(i * 0.1), G.Yv(arr[i]), 4.5, col, { gloss: false }); }
    };
    traceArr(R.L, '#f59e0b'); traceArr(R.T, '#e2464b');
    D.label(G.gx + 10, G.gy + 16, '● 온도 센서', { bg: '#e2464b', size: 12.5, align: 'left' }); D.label(G.gx + 112, G.gy + 16, '● 빛 센서', { bg: '#f59e0b', size: 12.5, align: 'left' });
    if (!R.T.length) D.text(G.gx + G.gw / 2, G.gy + G.gh / 2, '측정을 시작하면 그래프가 그려져요', { size: 15, weight: 700, color: '#cbd5e1' });
    // 읽기 커서
    const cx = G.X(R.cur);
    ctx.save(); ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx, G.gy); ctx.lineTo(cx, G.gy + G.gh); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    ctx.fillStyle = '#3867f4'; ctx.beginPath(); ctx.moveTo(cx, G.gy + G.gh + 2); ctx.lineTo(cx - 7, G.gy + G.gh + 14); ctx.lineTo(cx + 7, G.gy + G.gh + 14); ctx.closePath(); ctx.fill();
    const vT = CUR_AT(R.T, R.cur), vL = CUR_AT(R.L, R.cur);
    if (vT != null) { D.sphere(cx, G.Yv(vT), 6, '#e2464b', { outline: '#fff' }); D.label(cx + (cx > G.gx + G.gw - 120 ? -10 : 10), G.Yv(vT) - 18, R.cur.toFixed(1) + '시 · ' + vT.toFixed(2) + ' V', { bg: '#e2464b', size: 13, align: cx > G.gx + G.gw - 120 ? 'right' : 'left' }); }
    if (vL != null) D.sphere(cx, G.Yv(vL), 5, '#f59e0b', { outline: '#fff' });
    // 변환표
    const tb = L.tab;
    panel(tb.x, tb.y, tb.w, tb.h);
    D.text(tb.x + tb.w / 2, tb.y + 24, '전압 ↔ 기온 변환표', { size: 14, weight: 800, color: '#334155' });
    const rows = [0, 1, 2, 3, 4, 5].map((k) => ({ V: k * 0.66, T: -10 + k * 10 }));
    const rh = Math.min(38, (tb.h - 100) / 6), ry0 = tb.y + 56;
    const Tcur = vT != null ? V2T(vT) : null;
    D.text(tb.x + tb.w * 0.27, ry0 - 6, '전압 (V)', { size: 12.5, weight: 800, color: '#64748b' }); D.text(tb.x + tb.w * 0.74, ry0 - 6, '기온 (°C)', { size: 12.5, weight: 800, color: '#64748b' });
    rows.forEach((r, i) => {
      const y = ry0 + i * rh, hit = vT != null && vT >= r.V - 0.331 && vT < r.V + 0.331 && false;
      ctx.fillStyle = i % 2 ? '#f8fafc' : '#fff'; ctx.fillRect(tb.x + 12, y, tb.w - 24, rh);
      D.text(tb.x + tb.w * 0.27, y + rh / 2 + 5, r.V.toFixed(2), { size: 15, weight: 800, color: '#1b2333' });
      D.text(tb.x + tb.w * 0.5, y + rh / 2 + 5, '→', { size: 14, weight: 800, color: '#94a3b8' });
      D.text(tb.x + tb.w * 0.74, y + rh / 2 + 5, String(r.T).replace('-', '−'), { size: 15, weight: 800, color: '#e2464b' });
    });
    D.text(tb.x + tb.w / 2, ry0 + 6 * rh + 22, '0.66 V 오를 때마다 10 °C', { size: 12.5, weight: 800, color: '#3867f4' });
    D.text(tb.x + tb.w / 2, ry0 + 6 * rh + 42, '(0 V = −10 °C, 3.3 V = 40 °C)', { size: 12, weight: 700, color: '#64748b' });
    // 현재 전압 위치 표시
    if (vT != null) {
      const yv = ry0 + clamp(vT / 0.66, 0, 5) * rh + rh / 2; ctx.fillStyle = '#3867f4'; ctx.beginPath(); ctx.moveTo(tb.x + 10, yv); ctx.lineTo(tb.x + 2, yv - 6); ctx.lineTo(tb.x + 2, yv + 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(56,103,244,.5)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(tb.x + 10, yv); ctx.lineTo(tb.x + tb.w - 12, yv); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  /* ======================================================
     화면 3: 정보 만들기 (신호 분석)
     ====================================================== */
  const AN_LAY = () => PHONE ? { graph: { x: 16, y: 120, w: 568, h: 420 }, head: { x: 16, y: 16 }, info: { x: 16, y: 556, w: 568, h: 268 } }
    : { graph: { x: 16, y: 74, w: 768, h: 370 }, head: { x: 16, y: 16 }, info: { x: 16, y: 456, w: 768, h: 90 } };
  const AN_N = 241;
  function buildRaw() { const a = []; for (let i = 0; i < AN_N; i++) a.push(Vtemp(i * 0.1) + 0.2 * hash(i * 1.7 + 3)); S.an.raw = a; }
  const smoothAt = (i, n) => { const raw = S.an.raw, hf = Math.floor(n / 2); let sm = 0, c = 0; for (let j = i - hf; j <= i + hf; j++) { if (j < 0 || j >= AN_N) continue; sm += raw[j]; c++; } return sm / c; };
  const SM_EL = $('#sSm');
  const ANDEF = {
    temp: { name: '기온', win: 24, xt: 6, tf: (x) => Math.round(x) + '시', title: '하루 기온 센서 출력 (잡음이 섞여 있어요)', ask: '〰️ 이동 평균으로 다듬고, ▲최고·▼최저 깃발을 꼭대기와 바닥에 놓아요', col: '#e2464b' },
    heart: { name: '심전도', win: 3, xt: 0.5, tf: (x) => (Math.round(x * 10) / 10) + '초', title: '심전도 센서 출력', ask: '연이은 두 R봉우리(가장 높은 뾰족한 곳)에 깃발을 놓아요', col: '#ec4899' },
    sound: { name: '소리', win: 10, xt: 2, tf: (x) => Math.round(x) + ' ms', title: '마이크 출력 (10 ms 확대)', ask: '연이은 두 파동의 마루(맨 위)에 깃발을 놓아 한 번 진동하는 시간을 재요', col: '#8b5cf6' },
    quake: { name: '지진계', win: 60, xt: 10, tf: (x) => Math.round(x) + '초', title: '지진계 출력', ask: 'P파(작은 떨림)와 S파(큰 흔들림)가 처음 도착한 곳에 깃발을 놓아요', col: '#0d9488' },
  };
  function initMarks() {
    S.an.marks = {
      temp: [{ id: 'max', x: 8, col: '#e2464b', lab: '▲ 최고' }, { id: 'min', x: 20, col: '#3867f4', lab: '▼ 최저' }],
      heart: [{ id: 'r1', x: 0.55, col: '#ec4899', lab: 'R①', snap: HEART_PEAKS }, { id: 'r2', x: 1.65, col: '#8b5cf6', lab: 'R②', snap: HEART_PEAKS }],
      sound: [{ id: 'p1', x: 1.5, col: '#8b5cf6', lab: '마루①', snap: SOUND_PEAKS }, { id: 'p2', x: 7.0, col: '#f59e0b', lab: '마루②', snap: SOUND_PEAKS }],
      quake: [{ id: 'P', x: 5, col: '#38bdf8', lab: 'P파' }, { id: 'S', x: 40, col: '#fb923c', lab: 'S파' }],
    };
  }
  function tempReading(m) { const i = clamp(Math.round(m.x * 10), 0, AN_N - 1); return V2T(smoothAt(i, Math.round(S.an.wDisp))); }
  function evalAn(id) {
    const M = S.an.marks[id];
    if (id === 'temp') { const a = tempReading(M[0]), b = tempReading(M[1]); return { ok: Math.abs(a - 26) <= 1 && Math.abs(b - 10) <= 1, a, b }; }
    if (id === 'heart' || id === 'sound') {
      const pk = id === 'heart' ? HEART_PEAKS : SOUND_PEAKS, tol = id === 'heart' ? 0.03 : 0.12;
      const i1 = pk.findIndex((p) => Math.abs(p - M[0].x) < tol), i2 = pk.findIndex((p) => Math.abs(p - M[1].x) < tol);
      const dt = Math.abs(M[1].x - M[0].x);
      return { ok: i1 >= 0 && i2 >= 0 && Math.abs(i1 - i2) === 1, dt, i1, i2 };
    }
    const P = M[0].x, Sx = M[1].x;
    return { ok: Math.abs(P - 12) <= 1.5 && Math.abs(Sx - 22) <= 1.5 && P < Sx, P, S: Sx, dt: Sx - P };
  }
  function infoText(id, e) {
    if (id === 'temp') return e.ok ? ['📌 최고 기온 ' + Math.round(e.a) + ' °C (14시) · 최저 기온 ' + Math.round(e.b) + ' °C (4시)', '→ 일교차 = ' + Math.round(e.a) + ' − ' + Math.round(e.b) + ' = ' + (Math.round(e.a) - Math.round(e.b)) + ' °C'] : ['깃발이 가리키는 기온: 최고 ' + e.a.toFixed(1) + ' °C · 최저 ' + e.b.toFixed(1) + ' °C', '값이 흔들리면 이동 평균으로 다듬고, 꼭대기·바닥에 깃발을 놓아요.'];
    if (id === 'heart') return e.ok ? ['📌 R봉우리 간격 ' + e.dt.toFixed(2) + ' s', '→ 심박수 = 60 ÷ ' + e.dt.toFixed(2) + ' ≈ 70회/분'] : ['두 깃발을 이웃한 R봉우리 위에 놓으면', '봉우리 사이 시간으로 심박수를 구할 수 있어요.'];
    if (id === 'sound') return e.ok ? ['📌 한 번 진동하는 시간(주기) ' + e.dt.toFixed(2) + ' ms', '→ 진동수 = 1 ÷ 0.00227 s ≈ 440 Hz (음높이 "라")'] : ['두 깃발을 이웃한 마루(맨 위) 위에 놓으면', '한 번 진동하는 시간(주기)을 구할 수 있어요.'];
    return e.ok ? ['📌 P파 ' + Math.round(e.P) + ' s, S파 ' + Math.round(e.S) + ' s 도착 → 시간차 ' + Math.round(e.dt) + ' s', '→ 진원까지의 거리 ≈ 8 × ' + Math.round(e.dt) + ' = 약 ' + Math.round(e.dt) * 8 + ' km'] : ['P파: ' + e.P.toFixed(0) + ' s · S파: ' + e.S.toFixed(0) + ' s (시간차 ' + Math.max(0, e.dt).toFixed(0) + ' s)', '두 파가 처음 도착한 곳에 깃발을 놓아 보세요.'];
  }
  function anFn(id) {
    if (id === 'heart') return Vecg; if (id === 'sound') return Vsound; if (id === 'quake') return Vquake; return null;
  }
  function stepAn(dt) {
    const a = S.an, tgt = +SM_EL.value || 1;
    a.wDisp = RM ? tgt : SciSim.approach(a.wDisp, tgt, dt, 7); if (Math.abs(a.wDisp - tgt) < 0.05) a.wDisp = tgt;
    a.info = Object.keys(a.ok).filter((k) => a.ok[k]).length;
    ['temp', 'heart', 'sound', 'quake'].forEach((id) => {
      if (!S.an.marks[id]) return;
      const e = evalAn(id);
      if (e.ok && !a.ok[id] && !(a.drag)) {
        a.ok[id] = true; Sound.success(); updateAnBtns();
        const G = AN_LAY().graph; parts.burst(G.x + G.w / 2, G.y + G.h / 2, { count: 22, speed: 180, size: 4, life: 0.9 });
      }
    });
  }
  function drawAnalyze(t) {
    const A = S.an, L = AN_LAY(), def = ANDEF[A.id], M = A.marks[A.id];
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    D.text(L.head.x, L.head.y + 18, '🔎 ' + def.name + ' 신호 → 정보', { size: 17, weight: 800, color: '#1b2333', align: 'left' });
    paraText(L.head.x, L.head.y + 42, def.ask, VW - 32, PHONE ? 13 : 14, { color: '#5d6879' });
    const G = graphFrame(L.graph, def.title, def.win, def.xt, def.tf);
    const col = def.col;
    if (A.id === 'temp') {
      // 원자료(점) + 이동 평균 곡선
      ctx.save(); ctx.beginPath(); ctx.rect(G.gx, G.gy - 4, G.gw, G.gh + 8); ctx.clip();
      ctx.fillStyle = 'rgba(226,70,75,.35)'; A.raw.forEach((v, i) => { ctx.beginPath(); ctx.arc(G.X(i * 0.1), G.Yv(v), 2.2, 0, 6.3); ctx.fill(); });
      const n = Math.round(A.wDisp);
      if (n > 1) { ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); for (let i = 0; i < AN_N; i++) { const px = G.X(i * 0.1), py = G.Yv(smoothAt(i, n)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
      ctx.restore();
      // 보조 눈금: 기온
      ctx.fillStyle = '#e2464b'; [-10, 0, 10, 20, 30, 40].forEach((T) => { D.text(G.gx + G.gw + 14, G.Yv(T2V(T)) + 4, T + '°', { size: 11.5, weight: 700, color: '#e2464b', align: 'right' }); });
    } else trace(G, anFn(A.id), def.win, def.win, col, A.id === 'quake' ? 2.2 : 3);
    // 깃발
    M.forEach((m, k) => {
      const x = G.X(m.x), active = A.drag === m;
      const f = A.id === 'temp' ? (A.id === 'temp' ? (k === 0 ? Vtemp : Vtemp) : null) : anFn(A.id);
      let vy;
      if (A.id === 'temp') vy = G.Yv(smoothAt(clamp(Math.round(m.x * 10), 0, AN_N - 1), Math.round(A.wDisp))); else vy = G.Yv(f(m.x));
      ctx.save(); ctx.strokeStyle = m.col; ctx.lineWidth = active ? 3.5 : 2.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x, G.gy); ctx.lineTo(x, G.gy + G.gh); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      const lb = D.label(x, G.gy + 16 + (k % 2) * 0, m.lab, { bg: m.col, size: 13.5 });
      ctx.fillStyle = m.col; ctx.beginPath(); ctx.moveTo(x, G.gy + 30); ctx.lineTo(x - 6, G.gy + 24); ctx.lineTo(x + 6, G.gy + 24); ctx.closePath(); ctx.fill();
      D.sphere(x, vy, active ? 8 : 6.5, m.col, { outline: '#fff', outlineWidth: 2 });
      if (m.snap) { const near = m.snap.find((p) => Math.abs(p - m.x) < (A.id === 'heart' ? 0.03 : 0.12)); if (near != null) D.ring(x, vy, 15, t, { color: m.col, speed: 1.4, width: 2.5 }); }
      // 읽은 값
      let rd = '';
      if (A.id === 'temp') rd = tempReading(m).toFixed(1) + ' °C'; else if (A.id === 'quake') rd = m.x.toFixed(0) + '초'; else rd = m.x.toFixed(A.id === 'sound' ? 2 : 2) + (A.id === 'sound' ? ' ms' : ' 초');
      D.label(x, G.gy + G.gh - 14 - k * 0, rd, { bg: 'rgba(15,23,42,.8)', size: 12.5 });
    });
    // 두 깃발 사이 간격
    if (A.id !== 'temp') {
      const x1 = G.X(M[0].x), x2 = G.X(M[1].x), y = G.gy + G.gh * 0.28;
      ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.moveTo(x1, y - 5); ctx.lineTo(x1, y + 5); ctx.moveTo(x2, y - 5); ctx.lineTo(x2, y + 5); ctx.stroke();
      const dt = Math.abs(M[1].x - M[0].x); D.label((x1 + x2) / 2, y - 16, '간격 ' + dt.toFixed(A.id === 'quake' ? 0 : 2) + (A.id === 'sound' ? ' ms' : ' 초'), { bg: '#1b2333', size: 13 });
    }
    // 정보 카드
    const e = evalAn(A.id), tx = infoText(A.id, e), ik = L.info;
    if (!PHONE) {
      panel(ik.x, ik.y, ik.w, ik.h, e.ok ? '#ecfdf3' : '#fff');
      ctx.strokeStyle = e.ok ? '#14a058' : '#cbd5e1'; ctx.lineWidth = 2.5; rr(ik.x, ik.y, ik.w, ik.h, 16).stroke();
      D.text(ik.x + 18, ik.y + 26, e.ok ? '✅ 신호를 분석해 만든 정보' : '🔍 분석 중…', { size: 14, weight: 800, color: e.ok ? '#0b6b39' : '#64748b', align: 'left' });
      D.text(ik.x + 18, ik.y + 52, tx[0], { size: 15.5, weight: 800, color: '#1b2333', align: 'left' });
      D.text(ik.x + 18, ik.y + 76, tx[1], { size: 14.5, weight: 800, color: e.ok ? '#14a058' : '#5d6879', align: 'left' });
    } else {
      panel(ik.x, ik.y, ik.w, 150, e.ok ? '#ecfdf3' : '#fff');
      ctx.strokeStyle = e.ok ? '#14a058' : '#cbd5e1'; ctx.lineWidth = 2.5; rr(ik.x, ik.y, ik.w, 150, 16).stroke();
      D.text(ik.x + 16, ik.y + 28, e.ok ? '✅ 신호를 분석해 만든 정보' : '🔍 분석 중…', { size: 14, weight: 800, color: e.ok ? '#0b6b39' : '#64748b', align: 'left' });
      const h1 = paraText(ik.x + 16, ik.y + 56, tx[0], ik.w - 32, 15, { weight: 800 });
      paraText(ik.x + 16, ik.y + 56 + h1 + 6, tx[1], ik.w - 32, 14, { weight: 800, color: e.ok ? '#14a058' : '#5d6879' });
    }
  }

  /* ======================================================
     화면 4: 센서와 생활 (카드 짝짓기)
     ====================================================== */
  const AP = [
    { sensor: '가속도 센서', ico: 'accel', change: '몸의 움직임(흔들림)', info: '걸음 수', col: '#3867f4' },
    { sensor: '마이크', ico: 'mic', change: '소리(공기의 진동)', info: '음성 인식 결과(글자)', col: '#8b5cf6' },
    { sensor: '빛 센서', ico: 'light', change: '주변의 밝기', info: '화면 밝기 자동 조절', col: '#f59e0b' },
    { sensor: '위치(GPS) 센서', ico: 'gps', change: '위성 신호로 알아낸 위치', info: '길 안내 지도', col: '#0d9488' },
  ];
  const AL = PHONE ? { rowY: 20, rowH: 118, sw: 252, sh: 50, trayY: 530, cw: 268, ch: 54 } : { rowY: 18, rowH: 82, sw: 232, sh: 54, trayY: 372, cw: 176, ch: 52 };
  function initAp() {
    const ap = S.ap;
    ap.rows = AP.map((r, i) => {
      const y = AL.rowY + i * AL.rowH;
      if (PHONE) return { i, r, y, a: { x: 16 + 12 + AL.sw / 2, y: y + 84, w: AL.sw, h: AL.sh, chip: null }, b: { x: VW - 16 - 12 - AL.sw / 2, y: y + 84, w: AL.sw, h: AL.sh, chip: null } };
      return { i, r, y, a: { x: 360 - 20 + 8 - 70 + AL.sw / 2 - 60, y: y + 42, w: AL.sw, h: AL.sh, chip: null }, b: { x: 560 + AL.sw / 2 - 108 + 108 - 0, y: y + 42, w: AL.sw, h: AL.sh, chip: null } };
    });
    if (!PHONE) { ap.rows.forEach((row) => { row.a.x = 290 + AL.sw / 2 - 56; row.b.x = 790 - 16 - AL.sw / 2; }); }
    const order = [5, 2, 7, 0, 4, 1, 6, 3];
    const all = []; AP.forEach((r, i) => { all.push({ kind: 'change', row: i, text: r.change }); all.push({ kind: 'info', row: i, text: r.info }); });
    ap.chips = order.map((k, n) => {
      const c = all[k], h = chipHome(n);
      return Object.assign({ x: h.x, y: h.y, tx: h.x, ty: h.y, hx: h.x, hy: h.y, w: AL.cw, h: AL.ch, lift: 0, shake: 0, free: false, slot: null, bad: false }, c);
    });
    ap.ok = false; ap.okA = 0;
  }
  function chipHome(n) {
    if (PHONE) return { x: VW / 2 - (AL.cw + 8) / 2 + (n % 2) * (AL.cw + 8) + 0, y: AL.trayY + 40 + Math.floor(n / 2) * (AL.ch + 10) };
    return { x: 16 + AL.cw / 2 + (n % 4) * (AL.cw + 10) + 2, y: AL.trayY + 46 + Math.floor(n / 4) * (AL.ch + 12) };
  }
  const apSlots = () => { const out = []; S.ap.rows.forEach((r) => { out.push(r.a, r.b); r.a.kind = 'change'; r.b.kind = 'info'; r.a.row = r.i; r.b.row = r.i; }); return out; };
  const slotAtAp = (c) => apSlots().find((s) => Math.abs(c.x - s.x) <= s.w / 2 + 6 && Math.abs(c.y - s.y) <= s.h / 2 + 8);
  function apDrop(c) {
    S.drag = null;
    const s = slotAtAp(c), leave = () => { if (c.slot) { c.slot.chip = null; c.slot = null; } };
    if (s) {
      if (s.kind !== c.kind) { c.shake = 0.5; Sound.fail(); leave(); c.w = AL.cw; c.h = AL.ch; flyTo(c, c.hx, c.hy); toast(s.kind === 'change' ? '이 칸에는 "어떤 변화를 재나요?" 카드를 놓아요.' : '이 칸에는 "어떤 정보가 되나요?" 카드를 놓아요.', 'bad', 1700); return; }
      const other = s.chip && s.chip !== c ? s.chip : null; leave();
      if (other) { other.slot = null; other.w = AL.cw; other.h = AL.ch; flyTo(other, other.hx, other.hy); other.bad = false; }
      s.chip = c; c.slot = s; c.bad = false; c.w = s.w - 10; c.h = s.h - 8; Sound.tick(); flyTo(c, s.x, s.y);
      parts.burst(s.x, s.y, { count: 5, speed: 60, size: 2.5, life: 0.4, gravity: 0, colors: ['#93c5fd', '#fff'] });
    } else { leave(); c.w = AL.cw; c.h = AL.ch; c.bad = false; flyTo(c, c.hx, c.hy); }
    S.ap.ok = false;
  }
  function apIcon(kind, x, y, t, col, s) {
    s = s || 1; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (kind === 'accel') { const sh = Math.sin(t * 14) * 2.5; D.shadow(() => { ctx.fillStyle = '#1f2937'; rr(-11 + sh, -20, 22, 40, 5).fill(); }, { blur: 5, y: 2 }); ctx.fillStyle = '#93c5fd'; rr(-8 + sh, -15, 16, 28, 2).fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, -5); ctx.lineTo(-15, -5); ctx.moveTo(-20, 5); ctx.lineTo(-15, 5); ctx.moveTo(15, -5); ctx.lineTo(20, -5); ctx.moveTo(15, 5); ctx.lineTo(20, 5); ctx.stroke(); }
    else if (kind === 'mic') { D.shadow(() => { ctx.fillStyle = '#475569'; rr(-7, -18, 14, 24, 7).fill(); }, { blur: 4, y: 2 }); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 12, 0.1 * Math.PI, 0.9 * Math.PI); ctx.moveTo(0, 12); ctx.lineTo(0, 20); ctx.stroke(); for (let k = 0; k < 2; k++) { const ph = (t * 1.2 + k * 0.5) % 1; ctx.strokeStyle = col; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(-6, -6, 14 + ph * 12, 2.4, 3.9); ctx.stroke(); ctx.globalAlpha = 1; } }
    else if (kind === 'light') { const b = 0.7 + 0.3 * Math.sin(t * 3); D.glow(0, 0, 26, '#ffd54a', 0.5 * b); D.sphere(0, 0, 9, '#ffb300', { light: '#fff3b0' }); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + t * 0.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); ctx.stroke(); } }
    else { D.sphere(0, 8, 8, '#0d9488'); ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.save(); ctx.translate(-10, -14 + Math.sin(t * 2) * 2); ctx.rotate(0.5); ctx.fillRect(-9, -3, 18, 6); ctx.strokeRect(-9, -3, 18, 6); ctx.restore(); for (let k = 0; k < 2; k++) { const ph = (t * 0.9 + k * 0.5) % 1; ctx.strokeStyle = col; ctx.globalAlpha = 1 - ph; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-8 + ph * 8, -8 + ph * 16); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; } }
    ctx.restore();
  }
  function drawApply(t) {
    const ap = S.ap;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    ap.rows.forEach((row) => {
      const y = row.y, r = row.r, okRow = ap.ok;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(10, y, VW - 20, AL.rowH - 8, 16).fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = okRow ? '#14a058' : '#e2e8f0'; ctx.lineWidth = okRow ? 2.5 : 2; rr(10, y, VW - 20, AL.rowH - 8, 16).stroke();
      if (PHONE) { apIcon(r.ico, 44, y + 30, t, r.col, 1); D.text(76, y + 36, r.sensor, { size: 16, weight: 800, color: r.col, align: 'left' }); D.text(VW - 26, y + 36, '변화 → 센서 → 정보', { size: 12.5, weight: 700, color: '#94a3b8', align: 'right' }); }
      else { apIcon(r.ico, 54, y + 41, t, r.col, 1.1); D.text(92, y + 34, r.sensor, { size: 16, weight: 800, color: r.col, align: 'left' }); D.text(92, y + 54, '스마트폰 속 센서', { size: 12.5, weight: 700, color: '#94a3b8', align: 'left' }); }
      // 화살표와 라벨
      [[row.a, '어떤 변화를 재나요?'], [row.b, '어떤 정보가 되나요?']].forEach(([s, lab]) => {
        const hit = S.drag && S.drag.c.kind === (s === row.a ? 'change' : 'info') && slotAtAp(S.drag.c) === s;
        ctx.save(); ctx.setLineDash(s.chip ? [] : [6, 5]); ctx.fillStyle = hit ? '#e0e9ff' : '#f8fafc'; ctx.strokeStyle = hit ? '#3867f4' : ap.ok ? '#14a058' : '#94a3b8'; ctx.lineWidth = hit ? 3 : 2;
        rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).fill(); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).stroke(); ctx.setLineDash([]); ctx.restore();
        if (!s.chip) D.text(s.x, s.y + 5, lab, { size: 13, weight: 800, color: '#94a3b8' });
      });
      const ax1 = row.a.x + row.a.w / 2 + 4, ax2 = row.b.x - row.b.w / 2 - 4, ay = row.a.y;
      if (!PHONE) { D.arrow(ax1, ay, ax2, ay, { color: '#94a3b8', width: 3, head: 11 }); D.text((ax1 + ax2) / 2, ay - 12, '센서', { size: 12.5, weight: 800, color: '#64748b' }); }
      if (ap.ok && ap.okA > 0.01) { ctx.save(); ctx.globalAlpha = ap.okA; ctx.strokeStyle = row.r.col; ctx.lineWidth = 3; const wx0 = row.a.x + row.a.w / 2 + 6, wx1 = row.b.x - row.b.w / 2 - 6; if (!PHONE) D.wave(wx0, wx1, ay + 14, { amp: 4, wavelength: 26, phase: -t * 8, color: row.r.col, width: 2.5 }); ctx.restore(); }
    });
    ctx.fillStyle = 'rgba(100,116,139,.08)'; rr(6, AL.trayY - 4, VW - 12, VH - AL.trayY - 2 - (PHONE ? 20 : 0), 14).fill();
    D.text(20, AL.trayY + 18, '🃏 카드 (왼쪽 칸 = 재는 변화 · 오른쪽 칸 = 얻는 정보)', { size: 13, weight: 800, color: '#64748b', align: 'left' });
    ap.chips.forEach((c) => {
      const info = c.kind === 'info';
      const end = cardBox(c, { stroke: c.bad ? '#e2464b' : ap.ok && c.slot ? '#14a058' : c.slot ? '#3867f4' : '#cbd5e1', fill: c.slot ? '#f5f8ff' : info ? '#fff7ed' : '#fff', sw: c.slot ? 2.5 : 2 });
      D.text(0, 5, c.text, { size: c.slot ? 13.5 : 14.5, weight: 800, color: '#1b2333' });
      end();
    });
  }
  function cardBox(c, o) {
    o = o || {};
    const lift = c.lift || 0, sc = 1 + lift * 0.07, sh = c.shake > 0 ? Math.sin(c.shake * 40) * 5 * Math.min(1, c.shake * 3) : 0;
    ctx.save(); ctx.translate(c.x + sh, c.y); ctx.scale(sc, sc);
    D.shadow(() => { ctx.fillStyle = o.fill || '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 12).fill(); }, { blur: 5 + lift * 14, y: 2 + lift * 7, color: 'rgba(30,45,80,' + (0.16 + lift * 0.12) + ')' });
    ctx.strokeStyle = o.stroke || '#cbd5e1'; ctx.lineWidth = o.sw || 2; rr(-c.w / 2, -c.h / 2, c.w, c.h, 12).stroke();
    return () => ctx.restore();
  }
  function pickItem(p, list) { for (let i = list.length - 1; i >= 0; i--) { const c = list[i]; if (Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return c; } return null; }
  function dragStart(c, p, list) {
    S.drag = { c, ox: p.x - c.x, oy: p.y - c.y };
    const i = list.indexOf(c); if (i >= 0) { list.splice(i, 1); list.push(c); }
    SciSim.tween(c, { lift: 1 }, { duration: 0.12 }); Sound.click(); c.free = true;
  }
  function flyTo(c, x, y) { c.free = false; c.tx = x; c.ty = y; SciSim.tween(c, { lift: 0 }, { duration: 0.25 }); }
  function stepItems(list, dt) {
    list.forEach((c) => {
      if (c.free) return;
      if (RM) { c.x = c.tx; c.y = c.ty; } else { c.x = SciSim.approach(c.x, c.tx, dt, 14); c.y = SciSim.approach(c.y, c.ty, dt, 14); }
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
    });
  }
  function checkAp() {
    const un = S.ap.rows.reduce((n, r) => n + (r.a.chip ? 0 : 1) + (r.b.chip ? 0 : 1), 0);
    if (un) return '아직 빈칸이 <b>' + un + '칸</b> 남았어요.';
    const bad = [];
    S.ap.rows.forEach((r) => { [r.a, r.b].forEach((s) => { if (s.chip.row !== r.i) { bad.push(r.r.sensor); if (!s.chip.bad) { s.chip.bad = true; s.chip.shake = 0.5; } } }); });
    if (bad.length) return '<b>' + Array.from(new Set(bad)).join(', ') + '</b> 줄에 어긋난 카드가 있어요. 빨간 테두리 카드를 다시 생각해 보세요.';
    S.ap.chips.forEach((c) => { c.bad = false; });
    if (!S.ap.ok) { S.ap.ok = true; SciSim.tween(S.ap, { okA: 1 }, { duration: 0.8 }); S.ap.chips.forEach((c) => parts.burst(c.x, c.y, { count: 5, speed: 80, size: 3, life: 0.6 })); }
    return true;
  }

  /* ---------- 입력 ---------- */
  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000); }
  function anHit(p) {
    const L = AN_LAY(), M = S.an.marks[S.an.id]; if (!M) return null;
    const def = ANDEF[S.an.id], gx = L.graph.x + 50, gw = L.graph.w - 50 - 18, gy = L.graph.y + 34, gh = L.graph.h - 34 - 40;
    if (p.y < gy - 4 || p.y > gy + gh + 4) return null;
    let best = null, bd = 1e9; M.forEach((m) => { const d = Math.abs(gx + m.x / def.win * gw - p.x); if (d < bd) { bd = d; best = m; } });
    return bd <= 26 ? best : null;
  }
  function anMove(m, p) {
    const L = AN_LAY(), def = ANDEF[S.an.id], gx = L.graph.x + 50, gw = L.graph.w - 50 - 18;
    let x = clamp((p.x - gx) / gw * def.win, 0, def.win);
    if (m.snap) { const near = m.snap.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a)); if (Math.abs(near - x) < def.win * 0.05) x = near; }
    m.x = x;
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'analyze') { const m = anHit(p); if (m) { S.an.drag = m; anMove(m, p); Sound.click(); return true; } return false; }
      if (S.mode === 'apply') { const c = pickItem(p, S.ap.chips); if (!c) return false; if (c.slot) { c.slot.chip = null; c.slot = null; c.w = AL.cw; c.h = AL.ch; } dragStart(c, p, S.ap.chips); return true; }
      if (S.mode === 'record') { const g = RL().graph, gx = g.x + 50, gw = g.w - 50 - 18; if (p.x >= gx - 10 && p.x <= gx + gw + 10 && p.y >= g.y && p.y <= g.y + g.h) { setCur((p.x - gx) / gw * 24); S.recDrag = true; return true; } }
      return false;
    },
    move(p) {
      if (S.mode === 'analyze' && S.an.drag) { anMove(S.an.drag, p); return; }
      if (S.mode === 'apply' && S.drag) { S.drag.c.x = p.x - S.drag.ox; S.drag.c.y = p.y - S.drag.oy; return; }
      if (S.mode === 'record' && S.recDrag) { const g = RL().graph, gx = g.x + 50, gw = g.w - 50 - 18; setCur((p.x - gx) / gw * 24); }
    },
    up(p) {
      if (S.mode === 'analyze' && S.an.drag) { anMove(S.an.drag, p); S.an.drag = null; Sound.tick(); return; }
      if (S.mode === 'apply' && S.drag) { const c = S.drag.c; c.x = p.x - S.drag.ox; c.y = p.y - S.drag.oy; apDrop(c); return; }
      S.recDrag = false;
    },
    hover(p) { if (S.mode === 'analyze') return anHit(p) ? 'ew-resize' : 'default'; if (S.mode === 'apply') return pickItem(p, S.ap.chips) ? 'grab' : 'default'; return S.mode === 'record' ? 'col-resize' : 'default'; },
  });

  /* ---------- 컨트롤 ---------- */
  const MODE_LABEL = { scene: '📡 자연의 신호 → 센서 → 전압', record: '🌡️ 센서 측정 · 하루 기록', analyze: '🔎 정보 만들기 · 신호 분석', apply: '📱 센서와 생활 · 짝짓기' };
  const modeSeg = $('#modeSeg');
  let recSub = ['run', 'cur'];
  function setMode(m) { if (S.mode !== m) S.fade = 1; S.mode = m; S.drag = null; S.an.drag = null; updateCtl(); const hh = $('#stageHint'); if (hh) hh.classList.add('hide'); }
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.mode); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    modeSeg.hidden = !(game && game.free);
    if (S.mode === 'record') { const free = game && game.free; $$('#ctrlCard [data-modes="record"]').forEach((c) => { c.hidden = !(free ? ['run', 'cur'].indexOf(c.dataset.sub) >= 0 : recSub.indexOf(c.dataset.sub) >= 0); }); }
    if (S.mode === 'analyze') { const sm = $('[data-sub="smooth"]'); if (sm) sm.hidden = S.an.id !== 'temp'; }
    updateScBtns(); updateAnBtns(); updateRecCtl();
  }
  function updateScBtns() { $$('#scBtns button').forEach((b) => { b.classList.toggle('who-on', b.dataset.sc === S.sc.id); b.classList.toggle('who-done', S.sc.seen.has(b.dataset.sc)); }); }
  function updateAnBtns() { $$('#anBtns button').forEach((b) => { b.classList.toggle('who-on', b.dataset.an === S.an.id); b.classList.toggle('who-done', !!S.an.ok[b.dataset.an]); }); const sm = $('[data-sub="smooth"]'); if (sm && S.mode === 'analyze') sm.hidden = S.an.id !== 'temp'; $('#anNote').innerHTML = '그래프의 <b>깃발</b>을 끌어 알맞은 곳에 놓아요.'; }
  function updateRecCtl() { const R = S.rec; $('#bRec').textContent = R.done ? '✅ 하루 기록 완료' : R.run ? '⏸ 일시정지' : R.h > 0 ? '▶ 이어서 측정' : '▶ 하루 측정 시작'; $('#bRec').disabled = R.done; }
  function setCur(h) { h = clamp(Math.round(h * 10) / 10, 0, 24); S.rec.cur = h; const s = $('#sCur'); s.value = h; sCurB.refresh(); }
  $$('#scBtns button').forEach((b) => b.addEventListener('click', () => scStart(b.dataset.sc)));
  $$('#anBtns button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.an.id = b.dataset.an; updateCtl(); }));
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#bRec').addEventListener('click', () => { Sound.click(); if (S.rec.done) return; S.rec.run = !S.rec.run; updateRecCtl(); });
  $('#bRecReset').addEventListener('click', () => { Sound.click(); recReset(); });
  const sCurB = SciSim.bindRange($('#sCur'), $('#oCur'), (v) => (Math.round(v * 10) / 10) + '시', (v) => { S.rec.cur = +v; });
  SciSim.bindRange($('#sSm'), $('#oSm'), (v) => v + '개', () => {});
  $('#bApReset').addEventListener('click', () => { Sound.click(); initAp(); });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'scene') {
      const sg = SG[S.sc.id], x = S.sc.u * sg.win;
      L1 = '센서'; a = sg.sensor; L2 = '지금 전압'; b = sg.f(Math.min(x, sg.win)).toFixed(2) + ' V'; L3 = '측정해 본 장면'; c = S.sc.seen.size + ' / 5';
    } else if (S.mode === 'record') {
      const R = S.rec, vT = CUR_AT(R.T, R.cur), vL = CUR_AT(R.L, R.cur);
      L1 = '읽는 시각'; a = R.cur.toFixed(1) + '시'; L2 = '온도 센서 전압'; b = vT != null ? vT.toFixed(2) + ' V' : '—'; L3 = '빛 센서 전압'; c = vL != null ? vL.toFixed(2) + ' V' : '—';
    } else if (S.mode === 'analyze') {
      const e = evalAn(S.an.id), id = S.an.id;
      L1 = '분석하는 신호'; a = ANDEF[id].name; L2 = '읽은 값'; b = id === 'temp' ? '최고 ' + e.a.toFixed(1) + ' · 최저 ' + e.b.toFixed(1) + ' °C' : id === 'quake' ? '시간차 ' + Math.max(0, e.dt).toFixed(0) + ' s' : '간격 ' + e.dt.toFixed(2) + (id === 'sound' ? ' ms' : ' s'); L3 = '뽑은 정보'; c = S.an.info + ' / 4';
    } else {
      const n = S.ap.chips.filter((x) => x.slot).length;
      L1 = '놓은 카드'; a = n + ' / 8'; L2 = '센서가 하는 일'; b = '변화 → 전압'; L3 = '분석하면'; c = '정보';
    }
    const key = L1 + a + L2 + b + L3 + c;
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ---------- 단계 · 미션 ---------- */
  function enterLevel(li) {
    if (li === 0) { S.sc = { id: 'light', u: 0, hold: 0, seen: new Set(), tri: 0 }; setMode('scene'); }
    else if (li === 1) { recReset(); recSub = ['run', 'cur']; setCur(12); $('#inTemp').value = ''; setMode('record'); }
    else if (li === 2) { initMarks(); S.an = Object.assign(S.an, { id: 'temp', wDisp: 1, drag: null, ok: { temp: false, heart: false, sound: false, quake: false }, info: 0 }); $('#sSm').value = 1; $('#sSm').dispatchEvent(new Event('input')); setMode('analyze'); }
    else { initAp(); setMode('apply'); }
  }
  function ensure(m) { if (S.mode !== m) setMode(m); }
  const levels = [
    {
      title: '자연의 신호: 변화가 전달돼요', short: '자연의 신호', icon: '📡', phase: '관찰',
      features: ['scene'],
      intro: '<p class="si-q">❓ 탐구 질문: 하루 종일 변하는 기온은 어떻게 숫자로 기록될까? 신호와 정보는 무엇이 다를까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 중3 \'감각 기관과 자극의 전달\'에서 자극이 신호로 전달되는 것을 배웠어요. 자연에서도 빛·소리·흔들림 같은 <b>변화</b>가 신호로 전달돼요.</div>' +
        '<p>변화가 전달되는 것을 <b>신호</b>라고 해요. <b>센서</b>(블랙박스)는 신호를 받아 <b>전압</b>이라는 전기 신호로 바꿔 줘요. 장면을 골라 센서가 그리는 그래프를 살펴봐요.</p>',
      setup() { enterLevel(0); showHint('☀️ 장면을 눌러 전압 그래프를 그려 봐요', 6000); },
      recap: '자연의 변화가 전달되는 것이 신호이고, 센서는 그 신호를 전기 신호(전압)로 바꿔 줘요.',
      summary: '<ul><li><b>신호</b>: 자연의 변화(빛·온도·소리·땅의 흔들림·심장 박동…)가 전달되는 것이에요.</li><li><b>센서</b>: 변화를 받아 <b>전기 신호(전압)</b>로 바꿔 주는 장치예요. 이 수업에서는 안에서 어떻게 일어나는지는 다루지 않고, 입력(변화) → 출력(전압)만 봐요.</li><li>센서의 출력은 시간에 따라 이어지는 <b>연속적인(아날로그) 전압 파형</b>이에요.</li></ul>',
      missions: [
        {
          title: '여러 가지 변화를 측정해 보기',
          goal: '서로 다른 장면 <b>3가지 이상</b>에서 센서가 변화를 측정하도록 해 보세요. (그래프가 끝까지 그려지면 측정 완료)',
          hint: '오른쪽에서 장면을 하나 골라 그래프가 그려지는 것을 지켜봐요. 다른 장면도 차례로 눌러 봐요.',
          setup() { ensure('scene'); },
          check: () => S.sc.seen.size >= 3, hold: 0.4,
          status: () => '측정한 장면 <b>' + S.sc.seen.size + ' / 3</b> ' + SC_ORDER.map((k) => (S.sc.seen.has(k) ? SG[k].ico : '▫️')).join(' '),
          explain: '빛·기온·소리·땅의 흔들림·심장 박동은 모두 시간에 따라 변해요. 센서는 이 변화를 <b>전압의 변화</b>로 바꿔서 그래프로 나타내 줘요. 파형의 모양이 장면마다 달라요.',
        },
        {
          type: 'quiz', title: '신호는 무엇일까?',
          goal: '다음 중 <b>신호</b>를 가장 알맞게 설명한 것은?',
          setup() { ensure('scene'); },
          choices: ['분석해서 얻은 쓸모 있는 의미', '자연의 변화를 전달하는 것', '신호를 전기 신호로 바꿔 주는 장치', '그래프에 적힌 숫자의 단위'],
          answer: 1,
          feedback: ['분석해서 얻은 의미는 <b>정보</b>예요.', '', '신호를 전기 신호로 바꿔 주는 장치는 <b>센서</b>예요.', '전압의 단위는 V(볼트)이지만, 신호의 뜻은 아니에요.'],
          explain: '<b>신호</b>는 변화를 전달하는 것이에요. 센서가 그 신호를 <b>전기 신호</b>로 바꾸고, 그것을 분석해야 비로소 <b>정보</b>가 돼요. 신호 → (센서) → 전기 신호 → (분석) → 정보 순서예요.',
        },
      ],
    },
    {
      title: '센서 측정: 하루를 기록해요', short: '센서 측정', icon: '🌡️', phase: '실험',
      features: ['record'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 센서가 변화를 전압으로 바꿔 준다는 것을 봤어요. 이번에는 <b>온도 센서와 빛 센서</b>를 바깥에 두고 하루 동안 측정해 기록해요.</div>' +
        '<p>실제 24시간은 너무 길어서 <b>24시간을 12초</b>로 빠르게 돌려요. 기록된 전압을 <b>변환표</b>로 기온으로 바꿔 읽어 봐요.</p>',
      setup() { enterLevel(1); recSub = ['run']; updateCtl(); showHint('▶ 측정 시작을 눌러요', 5000); },
      recap: '센서는 하루의 변화를 전압 그래프로 기록해 줘요. 변환표를 쓰면 전압을 기온 같은 값으로 읽을 수 있어요.',
      summary: '<ul><li>온도 센서·빛 센서의 출력: 시간 → 전압 그래프. 기온은 낮에 오르고 새벽에 내려가요.</li><li>이 센서는 <b>0 V = −10 °C, 3.3 V = 40 °C</b>로 맞춰 두었어요. → 0.66 V마다 10 °C.</li><li>예: 14시 전압 약 2.4 V → 변환표에서 2.64 V(30 °C)와 1.98 V(20 °C) 사이 → 약 <b>26 °C</b></li><li>센서가 하는 일: 자연의 변화를 <b>전기 신호(전압)</b>로 바꾸는 것</li></ul>',
      missions: [
        {
          title: '하루 변화를 기록하기',
          goal: '<b>▶ 하루 측정 시작</b>을 눌러 24시간(12초) 동안의 온도 센서와 빛 센서 전압을 기록하세요.',
          hint: '끝까지 기다리면 하루(0시~24시) 기록이 완성돼요. 일시정지 후 이어서 해도 돼요.',
          setup() { ensure('record'); recSub = ['run']; updateCtl(); },
          check: () => S.rec.done, hold: 0.5,
          status: () => '기록 진행 <b>' + Math.floor(S.rec.h) + ' / 24시</b> ' + (S.rec.run ? '⏱' : S.rec.done ? '✅' : '⏸'),
          explain: '해가 뜨면 빛 센서의 전압이 커지고, 낮 동안 온도 센서의 전압도 서서히 올라가요. 기온은 해가 가장 높은 12시보다 조금 늦은 <b>14시쯤 가장 높고</b>, 해가 뜨기 전 <b>4시쯤 가장 낮아요</b>.',
        },
        {
          title: '전압을 기온으로 바꿔 읽기',
          goal: '읽을 시각을 <b>14시</b>에 맞추고, 온도 센서의 전압을 <b>변환표</b>로 기온(°C)으로 바꿔 적으세요.',
          hint: '14시의 전압은 약 2.4 V예요. 변환표에서 1.98 V = 20 °C, 2.64 V = 30 °C이니 그 사이를 어림해 봐요.',
          manual: true,
          setup() { ensure('record'); recSub = ['cur', 'tin']; updateCtl(); if (!S.rec.done) recFinish(); showHint('🔍 읽을 시각을 14시에 맞춰요', 5000); },
          check() {
            if (!S.rec.done) return '먼저 하루 기록을 마쳐 주세요.';
            if (Math.abs(S.rec.cur - 14) > 0.35) return '읽을 시각을 <b>14시</b>에 맞춰 주세요. (지금 ' + S.rec.cur.toFixed(1) + '시)';
            const raw = $('#inTemp').value.trim(); if (!raw) return '변환표로 구한 기온을 입력칸에 적어 주세요. (단위: °C)';
            const v = parseFloat(raw.replace(',', '.')); if (!isFinite(v)) return '숫자로 적어 주세요.';
            if (v >= 25 && v <= 27) return true;
            if (v > 2 && v < 3.3) return '전압 값을 그대로 적은 것 같아요. <b>변환표</b>로 <b>°C</b>로 바꿔 적어 주세요.';
            if (v >= 20 && v <= 30) return '조금 더 어림해 보세요. 2.4 V는 2.64 V(30 °C)보다 낮고 1.98 V(20 °C)보다 높아요. 어느 쪽에 더 가까운가요?';
            return '14시 전압(약 2.4 V)이 변환표의 어디쯤인지 다시 살펴봐요.';
          },
          explain: '14시 전압은 약 2.4 V예요. 1.98 V(20 °C)에서 0.42 V 올랐고, 0.66 V가 10 °C이므로 0.42 ÷ 0.66 × 10 ≈ 6 °C 올라 약 <b>26 °C</b>예요. 센서의 전압은 변환표(눈금)를 거쳐야 기온이라는 값이 돼요.',
        },
        {
          type: 'quiz', title: '센서가 하는 일',
          goal: '센서가 하는 일을 가장 알맞게 말한 것은?',
          setup() { ensure('record'); },
          choices: ['자연의 변화를 전기 신호로 바꾼다', '전기 신호를 분석해 정보를 만든다', '자연의 변화를 만들어 낸다', '데이터를 인터넷으로 보낸다'],
          answer: 0,
          feedback: ['', '분석해 정보를 만드는 것은 사람이나 컴퓨터의 일이에요. 센서는 신호를 얻는 데까지만 해요.', '센서는 변화를 만들지 않고 이미 일어난 변화를 재요.', '통신은 센서의 일이 아니에요.'],
          explain: '센서는 빛·온도·소리·흔들림 같은 <b>자연의 변화를 전기 신호(전압)</b>로 바꾸는 장치예요. 이렇게 얻은 전기 신호를 분석하면 정보가 돼요.',
        },
      ],
    },
    {
      title: '정보 만들기: 신호를 분석해요', short: '정보 만들기', icon: '🔎', phase: '분석',
      features: ['analyze'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 센서의 전압 그래프(신호)를 기록했어요. 그래프만 있으면 아직 의미를 몰라요.</div>' +
        '<p>신호를 <b>분석</b>하면 쓸모 있는 <b>정보</b>가 돼요. 기온 그래프에서는 최고 기온과 일교차를, 심전도에서는 심박수를, 소리에서는 음높이를, 지진계에서는 진원까지의 거리를 알아낼 수 있어요.</p>',
      setup() { enterLevel(2); showHint('🚩 깃발을 끌어 알맞은 곳에 놓아요', 6000); },
      recap: '신호를 측정해 분석하면 정보가 만들어져요. 같은 센서 신호라도 분석 방법에 따라 얻는 정보가 달라요.',
      summary: '<ul><li><b>정보</b>: 신호를 측정·분석해서 얻은 쓸모 있는 의미예요.</li><li>기온: 최고 26 °C(14시), 최저 10 °C(4시) → 일교차 <b>16 °C</b>. 잡음은 <b>이동 평균</b>으로 다듬어요.</li><li>심전도: R봉우리 간격 0.86 s → <b>심박수 70회/분</b> (60 ÷ 0.86)</li><li>소리: 한 번 진동하는 시간(주기) 약 2.3 ms → <b>440 Hz</b>(음높이 "라")</li><li>지진계: P파와 S파의 도착 시간차(10 s)로 <b>진원까지의 거리</b>(약 80 km)를 구해요.</li></ul>',
      missions: [
        {
          title: '신호에서 정보 뽑기',
          goal: '네 가지 신호 중 <b>3가지</b>에서 정보를 뽑아 보세요. (깃발을 알맞게 놓으면 정보 카드가 초록색이 돼요)',
          hint: '기온: 이동 평균으로 다듬은 뒤 꼭대기·바닥에 깃발. 심전도·소리: 이웃한 두 봉우리(마루). 지진계: P파·S파가 처음 나타난 곳.',
          setup() { ensure('analyze'); },
          check: () => S.an.info >= 3, hold: 0.5,
          status: () => '뽑은 정보 <b>' + S.an.info + ' / 3</b> ' + ['temp', 'heart', 'sound', 'quake'].map((k) => mark(S.an.ok[k]) + ANDEF[k].name).join(' · '),
          explain: '그래프는 같은 신호지만 <b>어디를 어떻게 읽느냐</b>에 따라 정보가 달라져요. 기온 → 일교차 16 °C, 심전도 → 심박수 70회/분, 소리 → 440 Hz, 지진계 → 진원까지 약 80 km. 이렇게 신호를 분석해 얻은 의미가 <b>정보</b>예요.',
        },
        {
          type: 'quiz', title: '신호와 정보의 차이',
          goal: '심전도 파형(신호)만 있을 때 <b>"심박수 70회/분"</b>이라는 정보를 얻으려면 어떻게 해야 할까요?',
          setup() { ensure('analyze'); },
          choices: ['R봉우리 사이의 시간을 재어 분석한다', '센서를 더 크게 만든다', '파형을 그대로 저장만 해 둔다', '전압을 더 높여서 측정한다'],
          answer: 0,
          feedback: ['', '센서 크기는 정보를 만들어 주지 않아요.', '저장만 해서는 의미를 알 수 없어요. 분석이 필요해요.', '전압을 높인다고 의미가 생기지는 않아요.'],
          explain: '신호만으로는 의미를 알 수 없고, <b>분석</b>을 해야 정보가 돼요. R봉우리 간격 0.86 s를 재면 60 ÷ 0.86 ≈ 70회/분이라는 정보를 얻어요.',
        },
      ],
    },
    {
      title: '센서와 생활: 스마트폰 속 센서', short: '적용', icon: '📱', phase: '적용',
      features: ['apply'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 신호를 분석해 정보를 만드는 과정을 해 봤어요. 스마트폰 안에도 센서가 가득해요.</div>' +
        '<p>스마트 기기의 <b>가속도·마이크·빛·위치 센서</b>가 각각 어떤 변화를 재고, 분석하면 어떤 정보가 되는지 카드로 짝지어 봐요.</p>',
      setup() { enterLevel(3); showHint('🃏 카드를 끌어 알맞은 칸에 놓아요', 6000); },
      recap: '스마트 기기의 센서는 자연의 변화를 신호로 받고, 분석해서 걸음 수·음성 인식·밝기 조절·길 안내 같은 정보를 만들어요.',
      summary: '<ul><li><b>가속도 센서</b>: 몸의 움직임(흔들림) → <b>걸음 수</b></li><li><b>마이크</b>: 소리(공기의 진동) → <b>음성 인식</b> 결과</li><li><b>빛 센서</b>: 주변의 밝기 → 화면 밝기 <b>자동 조절</b></li><li><b>위치(GPS) 센서</b>: 위성 신호로 알아낸 위치 → <b>길 안내</b> 지도</li><li>같은 신호도 분석 방법에 따라 다른 정보가 돼요. (가속도 신호 → 걸음 수, 넘어짐 감지 …)</li></ul>',
      missions: [
        {
          title: '센서와 정보 짝짓기',
          goal: '네 가지 센서마다 <b>재는 변화</b>와 <b>얻는 정보</b> 카드를 알맞은 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '걸음 수는 몸의 흔들림에서, 음성 인식은 소리에서 얻어요. 화면 밝기 자동 조절은 주변의 밝기를 재는 센서가 필요해요.',
          manual: true,
          setup() { ensure('apply'); },
          check: () => checkAp(),
          explain: '센서는 <b>변화를 신호로 받아 전기 신호로 바꾸고</b>, 그 신호를 분석하면 정보가 돼요. 가속도 → 걸음 수, 마이크 → 음성 인식, 빛 → 밝기 조절, 위치 → 길 안내처럼 우리 생활에서 쓰여요.',
        },
        {
          type: 'quiz', title: '신호일까, 정보일까?',
          goal: '다음 중 <b>정보</b>에 해당하는 것은 어느 것일까요?',
          setup() { ensure('apply'); },
          choices: ['센서에서 나온 전압 파형 그 자체', '파형을 분석해 얻은 "오늘 걸음 수 8,000보"', '마이크에 들어온 소리의 진동', '햇빛이 땅에 닿는 것'],
          answer: 1,
          feedback: ['파형 그 자체는 아직 분석 전의 <b>신호</b>예요.', '', '소리의 진동은 변화를 전달하는 <b>신호</b>예요.', '햇빛이 닿는 것은 자연에서 일어나는 <b>변화(신호)</b>예요.'],
          explain: '파형·진동·햇빛은 모두 분석 전의 <b>신호</b>이고, 분석해서 얻은 "걸음 수 8,000보" 같은 의미 있는 결과가 <b>정보</b>예요.',
        },
        {
          type: 'quiz', title: '같은 신호, 다른 정보',
          goal: '스마트폰 <b>가속도 센서의 신호</b>를 분석해서 알아낼 수 <b>없는</b> 것은?',
          setup() { ensure('apply'); },
          choices: ['걸음 수', '넘어졌는지 여부', '달리는 속도의 변화', '주변에서 나는 소리의 높낮이'],
          answer: 3,
          feedback: ['걸음마다 생기는 흔들림을 세면 걸음 수를 알 수 있어요.', '갑자기 큰 가속도 변화가 생기면 넘어짐을 알아낼 수 있어요.', '가속도의 변화를 쌓아 가면 속도 변화를 어림할 수 있어요.', ''],
          explain: '소리의 높낮이는 공기의 진동을 재는 <b>마이크</b>의 신호로 분석해요. 같은 가속도 신호라도 분석 방법에 따라 걸음 수, 넘어짐, 속도 변화처럼 <b>다른 정보</b>를 얻을 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-signal-info', mount: '#game', badge: '신호 분석가', homeHref: '../../index.html#h1a',
    featureLabels: { scene: '📡 장면 · 센서(블랙박스) · 전압 그래프', record: '🌡️ 하루 기록 · 전압↔기온 변환표', analyze: '🚩 분석 깃발 · 이동 평균', apply: '📱 센서·정보 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  buildRaw(); initMarks(); initAp(); updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode === 'scene') stepScene(dt);
    stepRec(dt); stepAn(dt); stepItems(S.ap.chips, dt);
    if (S.ap.ok) S.ap.okA = Math.max(S.ap.okA, 0);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'scene') drawScene(t); else if (S.mode === 'record') drawRecord(t); else if (S.mode === 'analyze') drawAnalyze(t); else drawApply(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SG, ANDEF, get game() { return game; }, setMode, enterLevel, setSpeed(n) { SPEED = n; }, scStart, recFinish, setCur, evalAn, checkAp, apDrop, initAp, tempReading,
    seeScene(id, u) { S.sc.id = id; S.sc.u = u; S.sc.hold = 0; updateScBtns(); },
    setAn(id) { S.an.id = id; updateCtl(); },
    setMark(id, k, x) { S.an.marks[id][k].x = x; },
    setSmooth(n) { const s = $('#sSm'); s.value = n; s.dispatchEvent(new Event('input')); S.an.wDisp = n; },
    fillAp(right) { S.ap.rows.forEach((r) => { [['a', 'change'], ['b', 'info']].forEach(([k, kind]) => { const row = right === false ? S.ap.rows[(r.i + 1) % 4] : r; const c = S.ap.chips.find((x) => x.kind === kind && x.row === row.i); const s = r[k]; if (s.chip) s.chip.slot = null; if (c.slot) c.slot.chip = null; s.chip = c; c.slot = s; c.x = c.tx = s.x; c.y = c.ty = s.y; c.w = s.w - 10; c.h = s.h - 8; }); }); S.ap.ok = false; },
  };
})();
