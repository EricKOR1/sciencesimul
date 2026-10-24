/* =========================================================
   역학과 에너지 Ⅰ. 시공간과 운동 - 등가 원리와 블랙홀 (8차시)
   성취기준 [12역학01-06] 등가 원리와 시공간의 휘어짐으로 인해 블랙홀과 중력 시간 지연이 나타남을 이해하고, 일반 상대론에 흥미를 느낄 수 있다.
   ① 모형: 등가 원리 (지표의 방 = 위로 가속하는 로켓 방, 자유 낙하 = 무중량)
   ② 모형: 시공간 (가속하는 방에서 빛이 휘어 보임 → 중력장에서도 휘어야 해요, 고무막 모형, 1919년 일식)
   ③ 설명: 블랙홀 (탈출 속도 = c → R = 2GM/c², 사건의 지평선)
   ④ 적용: 시간 지연 (중력이 강한 곳의 시계가 느려요, GPS +45.7 − 7.2 = +38.5 μs/일)
   정성적·사례 중심이에요. 아인슈타인 방정식·텐서·측지선·슈바르츠실트 해의 유도·중력파·우주론은 다루지 않아요.
   G = 6.67 × 10⁻¹¹, c = 3.0 × 10⁸ m/s.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 720 : 620;
  const SH = PHONE ? 340 : 350;
  const PX = 10, PY = SH + 6, PW = VW - 20, PH = VH - SH - 16;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const MINUS = '−';
  const fx = (v, d) => { const s = Math.abs(v).toFixed(d); return (v < 0 && +s !== 0 ? MINUS : '') + s; };
  const BG = '#eef2fa';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  if (PHONE) view.canvas.style.touchAction = 'pan-y';
  const D = SciSim.draw(ctx);
  const _dtext = D.text, _dlabel = D.label;
  D.text = (x, y, str, o) => _dtext(x, y, str, Object.assign({}, o, { size: Math.max(13, (o && o.size) || 14) }));
  D.label = (x, y, str, o) => _dlabel(x, y, str, Object.assign({}, o, { size: Math.max(13, (o && o.size) || 13) }));
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function card(x, y, w, h) { D.roundRect(x, y, w, h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke(); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3600);
  }
  const approach = (a, b, dt, k) => (RM ? b : SciSim.approach(a, b, dt, k));
  function wrapL(str, x, y, maxW, lh, size, color) {
    ctx.save(); ctx.font = D.font(size, 800); const words = str.split(' '); let line = ''; const out = [];
    words.forEach((wd) => { const t2 = line ? line + ' ' + wd : wd; if (ctx.measureText(t2).width > maxW && line) { out.push(line); line = wd; } else line = t2; });
    out.push(line); ctx.restore();
    out.forEach((l, i) => T(x, y + i * lh, l, size, color, 'left', 800)); return out.length;
  }
  function lines(x, y, lh, fs, arr) { arr.forEach((l, i) => T(x, y + i * lh, l[0], fs, l[1] || '#26324a', 'left', 800)); }
  const topCard = () => ({ x: 6, y: 6, w: PHONE ? 468 : 788, h: SH - 12 });
  const sup = (s) => String(s).replace(/[-0-9]/g, (c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c]));
  function sci(x, d) { if (x === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(x))); let m = x / Math.pow(10, e); if (+m.toFixed(d) >= 10) { m /= 10; return m.toFixed(d) + ' × 10' + sup(e + 1); } return m.toFixed(d) + ' × 10' + sup(e); }
  /* 가로 막대 (값 0..max, 칸 안에서만 그려요) */
  function hbar(x, y, w, h, val, max, color) {
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#e4eaf5'; ctx.fill();
    const f = clamp(val / max, 0, 1) * w;
    if (f > 0.5) { ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x, y, f, h); ctx.restore(); }
  }
  /* 0을 가운데 두는 막대 (lo..hi 범위) */
  function dbar(x, y, w, h, val, lo, hi, color) {
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#e4eaf5'; ctx.fill();
    const z = x + w * (-lo) / (hi - lo), v = clamp(val, lo, hi), e = x + w * (v - lo) / (hi - lo);
    ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(Math.min(z, e), y, Math.abs(e - z), h); ctx.restore();
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(z, y - 3); ctx.lineTo(z, y + h + 3); ctx.stroke();
  }


  /* ================= 상수·상태 ================= */
  const BLUE = '#2563eb', RED = '#e2464b', GREEN = '#14a058', ORANGE = '#f59e0b', PURPLE = '#7c3aed';
  const GN = 6.67e-11, CL = 3.0e8, G9 = 9.8;
  const M_EARTH = 6.0e24, M_SUN = 2.0e30;              // 지구 6.0 × 10²⁴ kg, 태양 2.0 × 10³⁰ kg (반올림한 값)
  const AU = 1.496e11;
  const RS = (M) => 2 * GN * M / (CL * CL);             // 사건의 지평선 반지름 2GM/c²
  const GPS_G = 45.7, GPS_V = 7.2, GPS_NET = GPS_G - GPS_V;      // μs/일 (일반 상대론 +, 특수 상대론 −)
  const GPS_ERR1 = CL * GPS_NET * 1e-6 / 1000;                    // 하루 거리 오차 (km) ≈ 11.6
  const H_REL = 2.4, T_FALL = Math.sqrt(2 * H_REL / G9), T_RUN = 0.85;   // 방 안 공의 높이(m), 낙하 시간(s)
  const M_PERSON = 70, W_PERSON = M_PERSON * G9;                   // 686 N
  const fmtLen = (m) => (m < 0.1 ? (m * 1000).toFixed(1) + ' mm' : m < 1000 ? (m < 10 ? m.toFixed(1) : m.toFixed(0)) + ' m' : m < 1e8 ? (m / 1000).toFixed(m < 1e5 ? 1 : 0) + ' km' : sci(m, 1) + ' m');
  const sub = (v, d) => (v < 0 && +Math.abs(v).toFixed(d) !== 0 ? MINUS : '') + Math.abs(v).toFixed(d);

  const S = {
    mode: 'equiv', clock: 0, fade: 0,
    eq: { sit: 'normal', view: 'in', st: 'ready', t: 0, did: { normal: false, free: false } },
    lz: { a: 2, p: 1, firing: false, seen: false, matched: false, tried: false },
    sh: { M: 0, mar: null, lt: null, seenFlat: false, seenBent: false, seenLight: false, lastDefl: 0 },
    ec: { sky: 'day', cmp: 0, seenTotal: false, seenCmp: false },
    cp: { i: 1, s: 0, done: [false, false, false], t: 0 },
    dl: { t: 60, far: 0, near: 0, clk: 0 },
    gp: { day: 1, seen: {}, t: 0 },
    flags: { tbl: false, match: false, gin: false },
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const eff = showCalc;
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const MODES = ['equiv', 'laser', 'sheet', 'eclipse', 'collapse', 'dilate', 'gps'];
  const ALLOWED = [['equiv'], ['laser', 'sheet', 'eclipse'], ['collapse'], ['dilate', 'gps']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode; updateCtl();
  }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };
  function person(x, yFeet, h, color, helmet) {
    const w = h * 0.34;
    ctx.save(); ctx.translate(x, yFeet);
    ctx.fillStyle = '#3b4a68'; D.roundRect(-w * 0.45, -h * 0.42, w * 0.34, h * 0.42, 2); ctx.fill(); D.roundRect(w * 0.1, -h * 0.42, w * 0.34, h * 0.42, 2); ctx.fill();
    ctx.fillStyle = color; D.roundRect(-w * 0.55, -h * 0.82, w * 1.1, h * 0.46, w * 0.3); ctx.fill();
    D.sphere(0, -h * 0.9, h * 0.11, helmet ? '#e8f1ff' : '#ffd9b3', { gloss: !!helmet, outline: '#9db0cf', outlineWidth: 1.2 });
    ctx.restore();
  }

  /* ================= ① 등가 원리 ================= */
  const SC1 = PHONE ? 44 : 60;      // 방 안 그림: 1 m = SC1 px
  const SC2 = PHONE ? 25 : 34;      // 방 밖 그림
  function eqReset() { const e = S.eq; e.st = 'ready'; e.t = 0; updateCtl(); }
  function eqRelease() { const e = S.eq; if (e.st === 'run') return; e.st = 'run'; e.t = 0; Sound.click(); updateCtl(); }
  function eqStep(dt) {
    const e = S.eq; if (e.st !== 'run') return;
    e.t += dt * 0.5;
    if (e.t >= T_RUN) { e.t = T_RUN; e.st = 'done'; e.did[e.sit] = true; updateCtl(); }
  }
  /* 방 안에서의 공 높이(바닥 기준 m): 보통이면 a = 9.8 m/s²로 바닥이 다가오고, 자유 낙하면 제자리 */
  function eqBallRel(t, sit) { return sit === 'normal' ? Math.max(0, H_REL - 0.5 * G9 * t * t) : H_REL; }
  function roomInside(x, y, w, h, kind, e) {
    // x, y, w, h: 방 안 그림 영역. 바닥은 y + h - 30
    const fy = y + h - 30, rx = x + 10, rw = w - 20, ry = fy - 3.2 * SC1, free = e.sit === 'free';
    const wg = ctx.createLinearGradient(0, ry, 0, fy); wg.addColorStop(0, '#dfe6f3'); wg.addColorStop(1, '#eef2fa');
    ctx.fillStyle = wg; ctx.fillRect(rx, ry, rw, fy - ry);
    ctx.strokeStyle = '#7b869a'; ctx.lineWidth = 4; ctx.strokeRect(rx, ry, rw, fy - ry);
    ctx.fillStyle = '#9aa6bd'; ctx.fillRect(rx, fy, rw, 8);
    // 눈금 벽 (높이 1 m 간격)
    ctx.strokeStyle = 'rgba(100,115,140,.4)'; ctx.lineWidth = 1.5; ctx.fillStyle = '#5a6679';
    for (let m = 1; m <= 3; m++) { const yy = fy - m * SC1; ctx.beginPath(); ctx.moveTo(rx + rw - 22, yy); ctx.lineTo(rx + rw, yy); ctx.stroke(); T(rx + rw - 26, yy + 4, m + ' m', 13, '#5a6679', 'right', 700); }
    // 저울과 사람
    const sx = rx + (PHONE ? 38 : 58), N = free ? 0 : W_PERSON;
    D.roundRect(sx - 30, fy - 8, 60, 8, 3); ctx.fillStyle = '#3b4a68'; ctx.fill();
    const bob = free && !RM ? Math.sin(S.clock * 2.2) * 3 : 0;
    person(sx, fy - 8 - (free ? 6 : 0) + bob, PHONE ? 74 : 100, kind === 'A' ? '#3867f4' : '#14a058', false);
    D.roundRect(sx - 30, fy + 10, 60, 18, 5); ctx.fillStyle = '#1e293b'; ctx.fill(); T(sx, fy + 24, Math.round(N) + ' N', 13, '#7ee8a4', 'center', 800);
    // 공 두 개 (가벼운 공 1 kg, 무거운 공 8 kg) — 자석 막대에 매달려 있다가 놓아요
    const rel = e.st === 'ready' ? H_REL : eqBallRel(e.t, e.sit);
    const bxL = rx + rw * 0.52, bxH = rx + rw * 0.72, by = fy - rel * SC1;
    if (e.st === 'ready') { ctx.fillStyle = '#516079'; ctx.fillRect(bxL - 22, fy - (H_REL + 0.55) * SC1, bxH - bxL + 44, 8); ctx.fillRect(bxL - 1, fy - (H_REL + 0.55) * SC1, 2, 0.55 * SC1 - 8); ctx.fillRect(bxH - 1, fy - (H_REL + 0.55) * SC1, 2, 0.55 * SC1 - 8); }
    D.sphere(bxL, by - 10, 10, '#ffd447', { gloss: true });
    D.sphere(bxH, by - 15, 15, '#475569', { gloss: true });
    T(bxL, by - 26, '1 kg', 13, '#26324a', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 }); T(bxH, by - 36, '8 kg', 13, '#26324a', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    if (e.sit === 'normal' && e.t >= T_FALL - 0.001 && e.st !== 'ready') { D.label((bxL + bxH) / 2, fy - 3.0 * SC1, '동시에 도착! ' + T_FALL.toFixed(2) + ' s', { bg: 'rgba(20,160,88,.92)', size: 13, pad: 7 }); }
    if (free) D.label(rx + rw * 0.62, fy - 1.2 * SC1, '🪂 모두 둥둥 떠 있어요 (무중량)', { bg: 'rgba(30,41,59,.88)', size: 13, pad: 7 });
  }
  function roomOutside(x, y, w, h, kind, e) {
    const free = e.sit === 'free', t = e.st === 'ready' ? 0 : e.t;
    const rw = Math.min(w - 24, 5.6 * SC2), rhh = 3.2 * SC2, rx = x + (w - rw) / 2;
    if (kind === 'A') {
      const gy = y + h - 18, sky = ctx.createLinearGradient(0, y, 0, gy); sky.addColorStop(0, '#9fd4ff'); sky.addColorStop(1, '#e3f3ff'); ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#6cbf6a'; ctx.fillRect(x, gy, w, y + h - gy);
      const yf = 4.0 - (free ? 0.5 * G9 * t * t : 0), fy = gy - yf * SC2;
      // 크레인 (줄이 끊기면 줄 끝이 위에 남아요)
      ctx.fillStyle = '#516079'; ctx.fillRect(x + w - 26, y + 6, 8, gy - y - 6); ctx.fillRect(x + w * 0.45, y + 6, w * 0.55 - 18, 7);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + w * 0.5, y + 13);
      if (!free) ctx.lineTo(x + w * 0.5, fy - rhh); else ctx.lineTo(x + w * 0.5, y + 13 + 34); ctx.stroke();
      // 방
      ctx.fillStyle = 'rgba(223,230,243,.95)'; ctx.fillRect(rx, fy - rhh, rw, rhh); ctx.strokeStyle = '#7b869a'; ctx.lineWidth = 3; ctx.strokeRect(rx, fy - rhh, rw, rhh);
      const rel = eqBallRel(t, e.sit), by = fy - rel * SC2, lx = rx + rw * 0.45, hx = rx + rw * 0.7;
      D.sphere(lx, by - 4, 5, '#ffd447', { gloss: false }); D.sphere(hx, by - 7, 7.5, '#475569', { gloss: false });
      D.dashedLine(rx - 8, gy - 4 * SC2, rx + rw + 8, gy - 4 * SC2, { color: 'rgba(30,41,59,.4)', width: 1.5, dash: [5, 5] });
      T(rx - 10, gy - 4 * SC2 - 4, '처음 높이', 13, '#334155', 'right', 700);
    } else {
      D.space(x, y, w, h, S.clock, { stars: 40 });
      const gy = y + h - 58, yf = free ? 0 : 0.5 * G9 * t * t, fy = gy - yf * SC2;
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.strokeRect(rx, gy - rhh, rw, rhh); ctx.setLineDash([]);
      T(rx - 4, gy - rhh - 6, '처음 위치', 13, '#cfe0ff', 'left', 700);
      if (!free && e.st !== 'ready') { const fl = 16 + Math.sin(S.clock * 40) * 3; D.glow(rx + rw / 2, fy + fl / 2 + 6, 28, '#ffa733', 0.45); ctx.fillStyle = '#ffa733'; ctx.beginPath(); ctx.moveTo(rx + rw / 2 - 12, fy); ctx.quadraticCurveTo(rx + rw / 2, fy + fl * 2, rx + rw / 2 + 12, fy); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = 'rgba(223,230,243,.95)'; ctx.fillRect(rx, fy - rhh, rw, rhh); ctx.strokeStyle = '#7b869a'; ctx.lineWidth = 3; ctx.strokeRect(rx, fy - rhh, rw, rhh);
      let byy = gy - H_REL * SC2; if (!free && yf >= H_REL) byy = fy;
      const lx = rx + rw * 0.45, hx = rx + rw * 0.7;
      D.sphere(lx, byy - 4, 5, '#ffd447', { gloss: false }); D.sphere(hx, byy - 7, 7.5, '#475569', { gloss: false });
      D.dashedLine(rx - 8, gy - H_REL * SC2, rx + rw + 8, gy - H_REL * SC2, { color: 'rgba(255,255,255,.5)', width: 1.5, dash: [4, 5] });
    }
  }
  function drawEquiv(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), e = S.eq, gap = 10, pw = (c.w - gap) / 2, tbl = showCalc('tbl');
    [['A', c.x], ['B', c.x + pw + gap]].forEach(([k, px]) => {
      ctx.save(); D.roundRect(px, c.y, pw, c.h, 12); ctx.clip();
      const tit = k === 'A' ? (PHONE ? 'A. 지표의 방' : 'A. 지표에 고정된 방') : (PHONE ? 'B. 가속하는 방' : 'B. 우주에서 위로 가속하는 방');
      if (e.view === 'in') { ctx.fillStyle = k === 'A' ? '#f6efe0' : '#e6edfb'; ctx.fillRect(px, c.y, pw, c.h); roomInside(px, c.y + 30, pw, c.h - 30, k, e); }
      else roomOutside(px, c.y + 30, pw, c.h - 30, k, e);
      ctx.fillStyle = 'rgba(30,41,59,.9)'; ctx.fillRect(px, c.y, pw, 30); T(px + 10, c.y + 21, tit, PHONE ? 13 : 14.5, '#fff', 'left', 800);
      if (e.view === 'out') T(px + pw - 8, c.y + 21, k === 'A' ? '밖에서 본 모습' : '밖(관성계)에서 본 모습', 13, '#ffe58a', 'right', 800);
      else T(px + pw - 8, c.y + 21, '창문 없는 방 안', 13, '#ffe58a', 'right', 800);
      ctx.restore();
    });
    parts.update(dt); parts.draw(ctx);
    // 아래
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, fs = PHONE ? 13 : 14.5, lh = PHONE ? 23 : 28;
    T(x0, PY + 28, '🧪 관찰 결과 표', 15, '#26324a', 'left', 800);
    const cw = PHONE ? [150, 144, 144] : [250, 230, 230];
    let xx = x0; ['', 'A 지표의 방', 'B 가속하는 방'].forEach((s, i) => { T(xx, PY + 54, s, 13.5, '#5a6679', 'left', 800); xx += cw[i]; });
    const dn = e.did.normal, df = e.did.free;
    const rows = [
      ['보통 · 저울 눈금', dn ? Math.round(W_PERSON) + ' N' : '—', dn ? Math.round(W_PERSON) + ' N' : '—'],
      ['보통 · 공이 닿는 시간 (1 kg / 8 kg)', dn ? T_FALL.toFixed(2) + ' s / ' + T_FALL.toFixed(2) + ' s' : '—', dn ? T_FALL.toFixed(2) + ' s / ' + T_FALL.toFixed(2) + ' s' : '—'],
      ['자유 낙하 · 저울 눈금', df ? '0 N' : '—', df ? '0 N' : '—'],
      ['자유 낙하 · 공', df ? '떠 있어요' : '—', df ? '떠 있어요' : '—'],
    ];
    rows.forEach((r, i) => { xx = x0; r.forEach((s, k) => { T(xx, PY + 78 + i * (PHONE ? 25 : 24), PHONE && k === 0 ? s.replace(' (1 kg / 8 kg)', '') : s, PHONE ? 13 : 14, k === 0 ? '#26324a' : (s === '—' ? '#9aa6bd' : '#1d4ed8'), 'left', 800); xx += cw[k]; }); });
    const yl = PY + 78 + 4 * (PHONE ? 25 : 24) + 12;
    lines(x0, yl, PHONE ? lh - 2 : 25, fs - 0.5, [
      ['방 안에서 본 결과가 A와 B에서 똑같아서 안에서는 구별할 수 없어요 (국소적).', dn ? '#14753f' : '#5a6679'],
      ['무거운 공과 가벼운 공도 같은 가속도로 떨어져요: 중력 질량 = 관성 질량.', '#26324a'],
    ].concat(PHONE ? [] : [['자유 낙하하는 방에서는 중력이 사라진 것처럼 무중량이 돼요 (중력이 0이 된 것은 아니에요).', '#5a6679']]));
  }

  /* ================= ② 가속하는 방에서 휘는 빛 ================= */
  const KBEND = 26;       // 1 g에서 오른쪽 벽에서 빛이 내려간 정도(px): 과장해서 그려요
  function lzFire() { const l = S.lz; l.p = 0; l.firing = true; l.tried = true; Sound.click(); }
  function lzStep(dt) {
    const l = S.lz; if (!l.firing) return;
    l.p = Math.min(1, l.p + dt / 1.4);
    if (l.p >= 1) { l.firing = false; if (Math.abs(l.a - 1) < 0.01) l.matched = true; if (l.a >= 2) l.seen = true; updateCtl(); }
  }
  function roomLaser(x, y, w, h, a, kind, p) {
    const rx = x + 12, rw = w - 24, ry = y + 34, rh = h - 52, fy = ry + rh;
    const wg = ctx.createLinearGradient(0, ry, 0, fy); wg.addColorStop(0, '#dfe6f3'); wg.addColorStop(1, '#eef2fa'); ctx.fillStyle = wg; ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = '#7b869a'; ctx.lineWidth = 4; ctx.strokeRect(rx, ry, rw, rh);
    const y0 = ry + rh * 0.3, lx = rx + 10, rxx = rx + rw - 14;
    // 레이저 발사기와 과녁
    D.roundRect(rx, y0 - 9, 20, 18, 4); ctx.fillStyle = '#334155'; ctx.fill();
    ctx.fillStyle = '#516079'; ctx.fillRect(rxx, ry + 6, 8, rh - 12);
    D.dashedLine(lx + 14, y0, rxx, y0, { color: 'rgba(30,41,59,.45)', width: 1.5, dash: [5, 5] });
    T(rxx - 4, y0 - 7, '곧게 갔다면', 13, '#334155', 'right', 700);
    // 휜 빛
    const drop = KBEND * a, n = 40, X = lx + 14, Wd = rxx - X;
    ctx.save(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3.5; ctx.shadowColor = 'rgba(239,68,68,.7)'; ctx.shadowBlur = 8; ctx.beginPath();
    for (let i = 0; i <= n * p; i++) { const u = i / n; const px = X + Wd * u, py = y0 + drop * u * u; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); ctx.restore();
    if (p >= 1) { D.sphere(rxx - 1, y0 + drop, 5, '#ef4444', { gloss: false }); if (drop > 3) { D.arrow(rxx - 22, y0 + 4, rxx - 22, y0 + drop - 4, { color: '#b91c1c', width: 2.5, head: 8 }); } }
    // 방의 바닥 느낌 (A: 지표, B: 엔진)
    const fy2 = y + h - 8;
    if (kind === 'B') { const fl = 10 + Math.sin(S.clock * 40) * 2 + a * 5; ctx.fillStyle = 'rgba(255,167,51,.9)'; ctx.beginPath(); ctx.moveTo(rx + rw / 2 - 14, fy); ctx.quadraticCurveTo(rx + rw / 2, fy + fl * 1.3, rx + rw / 2 + 14, fy); ctx.closePath(); ctx.fill(); }
    else { ctx.fillStyle = '#6cbf6a'; ctx.fillRect(rx - 6, fy + 2, rw + 12, 10); }
  }
  function drawLaser(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), l = S.lz, gap = 10, pw = (c.w - gap) / 2, same = Math.abs(l.a - 1) < 0.01;
    [['B', c.x, l.a], ['A', c.x + pw + gap, 1]].forEach(([k, px, a]) => {
      ctx.save(); D.roundRect(px, c.y, pw, c.h, 12); ctx.clip();
      ctx.fillStyle = k === 'B' ? '#0b1230' : '#f6efe0'; ctx.fillRect(px, c.y, pw, c.h);
      if (k === 'B') D.space(px, c.y, pw, c.h, S.clock, { stars: 40 });
      roomLaser(px, c.y, pw, c.h, a, k, l.p);
      ctx.fillStyle = 'rgba(30,41,59,.92)'; ctx.fillRect(px, c.y, pw, 30);
      T(px + 10, c.y + 21, k === 'B' ? (PHONE ? 'B. 위로 ' + l.a.toFixed(2).replace(/0$/, '') + ' g 가속' : 'B. 우주에서 위로 ' + l.a.toFixed(2).replace(/0$/, '') + ' g로 가속') : (PHONE ? 'A. 지표 (1 g)' : 'A. 지표의 방 (중력 1 g)'), PHONE ? 13 : 14.5, '#fff', 'left', 800);
      ctx.restore();
    });
    if (l.p >= 1 && same) D.label(c.x + c.w / 2, c.y + c.h - 18, '똑같이 휘어요 ✅ 가속과 중력은 구별되지 않아요', { bg: 'rgba(20,160,88,.95)', size: 13, pad: 9 });
    else if (l.p >= 1) D.label(c.x + c.w / 2, c.y + c.h - 18, l.a < 1 ? '가속도가 작아 덜 휘어요' : '가속도가 커서 더 휘어요', { bg: 'rgba(30,41,59,.9)', size: 13, pad: 9 });
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, fs = PHONE ? 13 : 14.5, lh = PHONE ? 24 : 29;
    T(x0, PY + 28, '🔦 가속하는 방에서 빛이 휘어 보여요', 15, '#26324a', 'left', 800);
    const t = 10 / CL, dr = 0.5 * G9 * t * t;
    lines(x0, PY + 28 + lh, lh, fs, [
      ['밖(관성계)에서 보면 빛은 곧게 가요. 그런데 빛이 가는 동안 방이 위로 가속해서,', '#26324a'],
      ['방 안에서는 빛이 아래로 휘어 보여요 (방이 위로 가속 → 빛이 아래로 휨).', '#26324a'],
      ['등가 원리: 가속하는 방 = 중력이 있는 방. 그러니 중력장에서도 빛이 휘어야 해요!', '#1d4ed8'],
    ].concat(PHONE ? [] : [['실제 휘어짐은 매우 작아요: 길이 10 m 방에서 약 ' + sci(dr, 0) + ' m(원자핵 크기)라 크게 과장했어요.', '#5a6679']]));
  }

  /* ================= ② 고무막 시공간 모형 ================= */
  const SHX = PHONE ? 215 : 300, SHZ = PHONE ? 62 : 92;
  const hOf = (r, M) => M * 5 * (1 / Math.sqrt(r * r + 0.06) - 1 / Math.sqrt(2.25 + 0.06)) * 1.0;      // 막이 패인 깊이(px) — 가운데가 가장 깊어요
  function projSh(x, z, M, c) {
    const r = Math.hypot(x, z), h = Math.max(0, hOf(Math.min(r, 1.5), M));
    return { x: c.cx + x * SHX, y: c.cy + z * SHZ + h * (PHONE ? 1.0 : 1.35) };
  }
  function shLaunch(kind) {
    const s = S.sh; const v = kind === 'light' ? 3.0 : 0.85;
    const o = { x: 1.15, z: 0.38, vx: -v, vz: 0, trail: [], st: 'run', kind, M: s.M, t: 0, v0: v, ang0: Math.PI };
    if (kind === 'light') s.lt = o; else s.mar = o;
    Sound.click();
  }
  function shStep(dt) {
    const s = S.sh;
    [s.mar, s.lt].forEach((o) => {
      if (!o || o.st !== 'run') return;
      const n = 40, h = dt / n, M = o.M, k = 0.06 * M;
      for (let i = 0; i < n; i++) {
        let r2 = o.x * o.x + o.z * o.z, d = Math.pow(r2 + 0.04, 1.5);
        o.vx += -k * o.x / d * h * 0.5; o.vz += -k * o.z / d * h * 0.5;
        o.x += o.vx * h; o.z += o.vz * h;
        r2 = o.x * o.x + o.z * o.z; d = Math.pow(r2 + 0.04, 1.5);
        o.vx += -k * o.x / d * h * 0.5; o.vz += -k * o.z / d * h * 0.5;
      }
      o.t += dt; o.tr = (o.tr || 0) - dt; if (o.tr <= 0) { o.tr = 0.02; o.trail.push([o.x, o.z]); if (o.trail.length > 500) o.trail.shift(); }
      const r = Math.hypot(o.x, o.z);
      if (M > 0 && r < 0.1 + M * 0.012) { o.st = 'hit'; o.msg = '가운데 천체에 부딪혔어요'; }
      else if (Math.abs(o.x) > 1.6 || Math.abs(o.z) > 1.2 || o.t > 9) {
        o.st = 'out'; const ang = Math.atan2(o.vz, o.vx), defl = Math.abs(((ang - o.ang0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 180 / Math.PI;
        o.defl = Math.abs(Math.atan2(Math.sin(ang - o.ang0), Math.cos(ang - o.ang0))) * 180 / Math.PI; s.lastDefl = o.defl;
        if (o.kind === 'marble') { if (M === 0 && o.defl < 2) s.seenFlat = true; if (M >= 2 && o.defl >= 20) s.seenBent = true; }
        else if (M >= 4 && o.defl >= 3) s.seenLight = true;
      }
      if (o.st === 'hit' && o.kind === 'marble' && M >= 2) s.seenBent = true;
    });
  }
  function drawSheet(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), s = S.sh, M = s.M, sg = { cx: c.x + c.w / 2, cy: c.y + c.h * 0.42 };
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    const bg = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); bg.addColorStop(0, '#13213f'); bg.addColorStop(1, '#0b1020'); ctx.fillStyle = bg; ctx.fillRect(c.x, c.y, c.w, c.h);
    // 격자 (고무막)
    ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    const col = (m) => 'rgba(' + Math.round(110 + 22 * m) + ',' + Math.round(200 - 14 * m) + ',255,.75)';
    for (let zi = -9; zi <= 9; zi++) { const z = zi * 0.1; ctx.strokeStyle = col(M * 0.5); ctx.beginPath(); for (let i = 0; i <= 60; i++) { const x = -1.35 + 2.7 * i / 60, p = projSh(x, z, M, sg); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke(); }
    for (let xi = -13; xi <= 13; xi++) { const x = xi * 0.1; ctx.strokeStyle = col(M * 0.5); ctx.beginPath(); for (let i = 0; i <= 36; i++) { const z = -0.95 + 1.9 * i / 36, p = projSh(x, z, M, sg); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke(); }
    // 가운데 천체
    if (M > 0) { const p = projSh(0, 0, M, sg), rr = 7 + M * 2.6; D.glow(p.x, p.y - rr * 0.4, rr * 2.6, '#ffd447', 0.35); D.sphere(p.x, p.y - rr * 0.8, rr, '#ffb703', { gloss: true, light: '#fff3b0', dark: '#e07b00' }); }
    // 구슬과 빛
    [[s.mar, '#ffffff', '#7cc4ff', 7], [s.lt, '#ff5a5a', '#ff8a8a', 5]].forEach(([o, c1, c2, rr]) => {
      if (!o) return;
      if (o.trail.length > 1) { ctx.strokeStyle = c2; ctx.lineWidth = o.kind === 'light' ? 3 : 3.2; ctx.beginPath(); o.trail.forEach((q, i) => { const p = projSh(q[0], q[1], o.M, sg); i ? ctx.lineTo(p.x, p.y - rr) : ctx.moveTo(p.x, p.y - rr); }); ctx.stroke(); }
      if (o.st === 'run' || o.st === 'out' || o.st === 'hit') {
        const x = clamp(o.x, -1.5, 1.5), z = clamp(o.z, -1.1, 1.1), p = projSh(x, z, o.M, sg);
        if (o.st !== 'out') { if (o.kind === 'light') { D.glow(p.x, p.y - rr, 14, '#ff7a7a', 0.7); D.sphere(p.x, p.y - rr, rr, c1, { gloss: false }); } else D.sphere(p.x, p.y - rr, rr, c1, { gloss: true }); }
      }
    });
    T(c.x + 12, c.y + 24, '시공간을 2차원 고무막으로 나타낸 모형 (비스듬히 본 모습)', PHONE ? 13 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 });
    const lm = s.mar, ll = s.lt;
    if (lm && lm.st === 'hit') D.label(c.x + c.w / 2, c.y + c.h - 20, lm.msg, { bg: 'rgba(185,28,28,.9)', size: 13, pad: 8 });
    else if (lm && lm.st === 'out') D.label(c.x + c.w / 2, c.y + c.h - 20, '구슬이 꺾인 각도 ' + lm.defl.toFixed(0) + '°', { bg: 'rgba(30,41,59,.9)', size: 13, pad: 8 });
    if (ll && ll.st === 'out') D.label(c.x + c.w / 2, c.y + c.h - 52, '빛이 꺾인 각도 ' + ll.defl.toFixed(1) + '°', { bg: 'rgba(185,28,28,.9)', size: 13, pad: 8 });
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, fs = PHONE ? 13 : 14.5, lh = PHONE ? 24 : 29;
    T(x0, PY + 28, '🕸️ 질량이 시공간을 휘어요', 15, '#26324a', 'left', 800);
    lines(x0, PY + 28 + lh, lh, fs, [
      ['질량이 없으면 막이 평평해서 구슬이 곧게 가요.', '#26324a'],
      ['질량이 크면 막이 깊게 패이고, 구슬은 패인 곳을 따라 휘어 가요.', '#26324a'],
      ['힘이 당겨서가 아니라 휘어진 시공간의 모양을 따라 가장 곧은 경로로 가는 거예요.', '#1d4ed8'],
    ].concat(PHONE ? [] : [['빛도 같은 시공간을 따라가서 질량 곁에서 휘어요 (구슬보다 빨라서 덜 휘어요).', '#5a6679']]));
    const yy = PY + 28 + 4.6 * lh;
    T(x0, yy + (PHONE ? 6 : 0), 'M = ' + M + ' (상대값)  ·  구슬 ' + (lm ? (lm.st === 'run' ? '굴러가는 중' : lm.defl != null ? '꺾인 각도 ' + lm.defl.toFixed(0) + '°' : '부딪힘') : '아직 안 굴렸어요') + '  ·  빛 ' + (ll ? (ll.st === 'run' ? '가는 중' : ll.defl != null ? '꺾인 각도 ' + ll.defl.toFixed(1) + '°' : '부딪힘') : '아직 안 쏘았어요'), PHONE ? 13 : 14, '#c2410c', 'left', 800);
  }

  /* ================= ② 1919년 일식 ================= */
  const STARS_EC = (function () { const arr = []; const rs = [78, 96, 118, 150, 190, 235, 100, 165]; rs.forEach((r, i) => { const a = i * 2.399 + 0.5; arr.push({ r, a, m: 1.2 + (i % 3) * 0.5 }); }); return arr; })();
  const EC_K = 24;      // 태양 가장자리(r = 반지름)에서의 휨(px): 과장
  function drawEclipse(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), e = S.ec, tot = e.sky === 'total';
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    const cx = c.x + c.w * (PHONE ? 0.5 : 0.5), cy = c.y + c.h * 0.54, Rs = PHONE ? 38 : 46;
    const sk = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
    if (tot) { sk.addColorStop(0, '#0a1130'); sk.addColorStop(1, '#111c45'); } else { sk.addColorStop(0, '#6bb7ff'); sk.addColorStop(1, '#bfe3ff'); }
    ctx.fillStyle = sk; ctx.fillRect(c.x, c.y, c.w, c.h);
    // 코로나와 태양
    if (tot) { D.glow(cx, cy, Rs * 3.2, '#fff3b0', 0.55); D.glow(cx, cy, Rs * 1.8, '#ffffff', 0.5); } else { D.glow(cx, cy, Rs * 3.5, '#fffbe0', 0.85); }
    D.sphere(cx, cy, Rs, tot ? '#1a1a1a' : '#ffd447', { gloss: false, light: tot ? '#2a2a2a' : '#fff6c2', dark: tot ? '#050505' : '#ffa400' });
    if (tot) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, Rs + 1, 0, TAU); ctx.stroke(); }
    // 별
    const px = (r, a) => ({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.9 });
    if (tot) {
      STARS_EC.forEach((st) => {
        const sh = EC_K * Rs / st.r * (Rs / 46);               // 휨은 거리에 반비례 (과장)
        const t0 = px(st.r, st.a), t1 = px(st.r + sh, st.a);
        if (e.cmp) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(t0.x, t0.y, 7, 0, TAU); ctx.stroke(); ctx.setLineDash([]); D.arrow(t0.x, t0.y, t1.x, t1.y, { color: '#ffb36b', width: 2, head: 6 }); }
        D.glow(t1.x, t1.y, 12 * st.m, '#cfe0ff', 0.6); D.spark(t1.x, t1.y, 4.5 * st.m, S.clock + st.a, '#ffffff');
      });
      T(c.x + 12, c.y + 24, '개기 일식: 태양빛이 가려져 별이 보여요', PHONE ? 13 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
      if (e.cmp) { T(c.x + 12, c.y + c.h - 36, '○ 원래 위치 → 보이는 위치 (태양에서 멀어지는 쪽, 크게 과장)', 13, '#ffe58a', 'left', 800, { stroke: 'rgba(0,0,0,.55)', strokeWidth: 3 }); T(c.x + 12, c.y + c.h - 14, '태양에 가까운 별일수록 더 많이 휘어요', 13, '#ffe58a', 'left', 800, { stroke: 'rgba(0,0,0,.55)', strokeWidth: 3 }); }
    } else {
      T(c.x + 12, c.y + 24, '평소 낮: 태양이 너무 밝아 별이 보이지 않아요', PHONE ? 13 : 14, '#0f2a52', 'left', 800, { stroke: 'rgba(255,255,255,.7)', strokeWidth: 3 });
      T(c.x + 12, c.y + c.h - 14, '(별은 하늘에 있지만 보이지 않아요)', 13, '#0f2a52', 'left', 700, { stroke: 'rgba(255,255,255,.7)', strokeWidth: 3 });
    }
    if (tot) { /* 달이 태양을 가림 */ }
    ctx.restore();
    // 아래: 측면도
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, fs = PHONE ? 13 : 14.5, lh = PHONE ? 24 : 28;
    T(x0, PY + 28, '🔭 옆에서 본 별빛의 경로 (축척 아님)', 15, '#26324a', 'left', 800);
    const dw = PHONE ? PW - 32 : 440, dy = PY + 130, ex = x0 + 24, sx = x0 + dw * 0.5, tx = x0 + dw - 20;
    // 지구, 태양, 별
    D.sphere(ex, dy, 12, '#3b82f6', { gloss: true }); T(ex, dy + 30, '지구', 13, '#26324a', 'center', 800);
    D.glow(sx, dy, 34, '#ffd447', 0.5); D.sphere(sx, dy, 16, '#ffb703', { gloss: true, light: '#fff3b0', dark: '#e07b00' }); T(sx, dy + 34, '태양', 13, '#26324a', 'center', 800);
    const star0 = { x: tx, y: dy - 44 };      // 별의 원래 위치 (태양 위쪽으로 살짝 벗어나 있어요)
    D.sphere(star0.x, star0.y, 6, '#94a3b8', { gloss: false }); T(star0.x + 12, star0.y + 18, '별(실제 위치)', 13, '#475569', 'right', 800);
    // 휜 경로: 별 → 태양 가장자리 근처(아래로 꺾임) → 지구
    const bend = { x: sx + 4, y: dy - 30 };
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(star0.x - 6, star0.y + 3); ctx.quadraticCurveTo(bend.x + 20, bend.y - 6, bend.x, bend.y); ctx.lineTo(ex + 11, dy - 4); ctx.stroke();
    // 보이는 방향 (지구에서 직선으로 연장)
    const ang = Math.atan2(bend.y - (dy - 4), bend.x - (ex + 11)); const L = tx - ex;
    D.dashedLine(ex + 11, dy - 4, ex + 11 + Math.cos(ang) * L * 1.02, dy - 4 + Math.sin(ang) * L * 1.02, { color: '#2563eb', width: 2, dash: [6, 5] });
    const app = { x: ex + 11 + Math.cos(ang) * L * 1.0, y: dy - 4 + Math.sin(ang) * L * 1.0 };
    D.sphere(app.x, app.y, 6, '#ffffff', { gloss: false, outline: '#2563eb', outlineWidth: 2 }); T(app.x - 4, app.y - 12, '보이는 위치', 13, '#1d4ed8', 'right', 800);
    T(x0 + 4, PY + 56, '빨간 선: 실제 빛의 경로 (태양 곁에서 휘어요)', 13, '#b91c1c', 'left', 800);
    T(x0 + 4, PY + 78, '파란 점선: 우리 눈에는 이 방향에서 온 것처럼 보여요', 13, '#1d4ed8', 'left', 800);
    if (!PHONE) {
      const tx2 = PX + 500;
      lines(tx2, PY + 40, lh, 14, [
        ['1919년 에딩턴이 개기 일식 때', '#26324a'], ['태양 가장자리를 지나는 별빛이', '#26324a'], ['약 1.75″ 휘는 것을 관측했어요', '#c2410c'], ['(1″ = 1/3600°).', '#5a6679'], ['일반 상대론의 예측과 일치!', '#14753f'],
      ]);
    } else lines(x0, PY + 188, lh - 2, 13, [['1919년 개기 일식에서 별빛이 약 1.75″ 휘는 것을 관측했어요.', '#c2410c'], ['평소 낮에는 태양이 너무 밝아 태양 곁의 별을 못 봐요.', '#26324a'], ['일반 상대론의 예측과 일치했어요.', '#14753f']]);
  }

  /* ================= ③ 블랙홀 ================= */
  const CPB = [
    { n: '지구', M: M_EARTH, R0: 6.37e6, col: '#3b82f6' },
    { n: '태양', M: M_SUN, R0: 6.96e8, col: '#ffb703' },
    { n: '태양의 10배인 별', M: 10 * M_SUN, R0: 3.5e9, col: '#ff8a3d' },
  ];
  const cpR = (b, s) => b.R0 * Math.pow(0.4 * RS(b.M) / b.R0, s / 100);
  const cpVesc = (b, R) => Math.sqrt(2 * GN * b.M / R);
  const f1 = (x) => (x + 1e-9).toFixed(1);
  function cpCheck() { const b = CPB[S.cp.i], R = cpR(b, S.cp.s); if (R <= RS(b.M) * (1 + 1e-9)) { if (!S.cp.done[S.cp.i]) { S.cp.done[S.cp.i] = true; parts.burst(PHONE ? 160 : 170, 170, { count: 26, speed: 130, size: 3.2, colors: ['#fff', '#ffd447', '#7cc4ff'], gravity: 0, life: 1.0 }); Sound.click(); } } }
  function gaugeLog(x, y, w, v, label) {      // v: m/s, 눈금: 10 km/s … c (로그)
    const lo = 4, hi = Math.log10(CL), f = clamp((Math.log10(Math.max(v, 1e4)) - lo) / (hi - lo), 0, 1);
    D.roundRect(x, y, w, 16, 8); ctx.fillStyle = '#e4eaf5'; ctx.fill();
    ctx.save(); D.roundRect(x, y, w, 16, 8); ctx.clip(); const gg = ctx.createLinearGradient(x, 0, x + w, 0); gg.addColorStop(0, '#38bdf8'); gg.addColorStop(0.75, '#f59e0b'); gg.addColorStop(1, '#ef4444'); ctx.fillStyle = gg; ctx.fillRect(x, y, f * w, 16); ctx.restore();
    [[4, '10 km/s'], [5, '100'], [6, '1000'], [7, '10⁴'], [8, '10⁵']].forEach(([e, t], i) => { const xx = x + w * (e - lo) / (hi - lo); ctx.strokeStyle = '#516079'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xx, y + 16); ctx.lineTo(xx, y + 22); ctx.stroke(); if (!PHONE || i % 2 === 0) T(xx, y + 36, t, 12.5, '#516079', i === 0 ? 'left' : 'center', 700); });
    ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + w, y - 4); ctx.lineTo(x + w, y + 22); ctx.stroke(); T(x + w, y - 8, 'c', 14, '#b91c1c', 'center', 800);
    return f;
  }
  function drawCollapse(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), cp = S.cp, b = CPB[cp.i], Rs = RS(b.M), R = cpR(b, cp.s), isBH = R <= Rs * (1 + 1e-9), v = cpVesc(b, R);
    cpCheck(); const rh = 30;
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    D.space(c.x, c.y, c.w, c.h, S.clock, { stars: 70 });
    const lw = PHONE ? c.w : 360, cx = c.x + lw / 2, cy = c.y + c.h / 2 + 6;
    const lr = Math.log10(R / Rs), l0 = Math.log10(b.R0 / Rs), rp = isBH ? 0 : rh + (Math.min(PHONE ? 100 : 118, c.h / 2 - 28) - rh) * clamp(lr / l0, 0, 1);
    // 빛줄기
    const rays = 14;
    for (let i = 0; i < rays; i++) {
      const a = i * TAU / rays + 0.2;
      if (!isBH) { const r1 = rp + 4, r2 = r1 + 38; ctx.strokeStyle = 'rgba(255,229,138,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke(); }
      else { const ph = (S.clock * 0.8 + i * 0.37) % 1; ctx.strokeStyle = 'rgba(255,229,138,' + (0.85 * (1 - ph)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k <= 12; k++) { const u = k / 12, r = rh * (1.0 - 0.6 * u) , aa = a + u * 1.2; k ? ctx.lineTo(cx + Math.cos(aa) * r, cy + Math.sin(aa) * r) : ctx.moveTo(cx + Math.cos(a) * rh, cy + Math.sin(a) * rh); } ctx.stroke(); }
    }
    if (!isBH) { D.glow(cx, cy, rp * 1.5, b.col, 0.4); D.sphere(cx, cy, rp, b.col, { gloss: true }); }
    else {
      // 강착 원반과 검은 구멍
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.3); const dg = ctx.createRadialGradient(0, 0, rh, 0, 0, rh * 3.2); dg.addColorStop(0, 'rgba(255,220,120,.95)'); dg.addColorStop(0.5, 'rgba(255,130,40,.6)'); dg.addColorStop(1, 'rgba(255,80,0,0)'); ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, rh * 3.2, 0, TAU); ctx.fill(); ctx.restore();
      D.glow(cx, cy, rh * 1.5, '#ffd447', 0.35);
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, rh, 0, TAU); ctx.fill();
    }
    // 사건의 지평선 기준 고리
    ctx.strokeStyle = isBH ? '#fff' : 'rgba(255,255,255,.7)'; ctx.lineWidth = isBH ? 3 : 2; ctx.setLineDash(isBH ? [] : [5, 5]); ctx.beginPath(); ctx.arc(cx, cy, rh, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    D.label(cx, c.y + c.h - 22, isBH ? '사건의 지평선 R_s = ' + fmtLen(Rs) : '점선 = 지평선이 생길 크기 R_s = ' + fmtLen(Rs), { bg: isBH ? 'rgba(185,28,28,.92)' : 'rgba(30,41,59,.88)', size: 13, pad: 8 });
    T(c.x + 12, c.y + 24, b.n + (isBH ? ' → 블랙홀' : '을 눌러 작게 줄여요 (질량은 그대로)'), PHONE ? 13 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 });
    parts.update(dt); parts.draw(ctx);
    // 오른쪽 숫자 패널 (태블릿)
    if (!PHONE) {
      const x0 = c.x + lw + 14, w0 = c.w - lw - 28;
      ctx.fillStyle = 'rgba(247,249,253,.96)'; ctx.fillRect(x0 - 14, c.y, c.x + c.w - x0 + 14, c.h);
      T(x0, c.y + 26, '🧮 탈출 속도 계산기', 14.5, '#26324a', 'left', 800);
      lines(x0, c.y + 54, 26, 13.5, [['M = ' + sci(b.M, 1) + ' kg', '#26324a'], ['R = ' + fmtLen(R), '#1d4ed8'], [v >= CL ? 'v탈출 = √(2GM / R) ≥ c' : 'v탈출 = √(2GM / R) = ' + sci(v, 1) + ' m/s', v >= CL ? '#b91c1c' : '#c2410c'], ['c = 3.0 × 10⁸ m/s', '#5a6679']]);
      T(x0, c.y + 176, '탈출 속도의 눈금 (로그)', 13, '#26324a', 'left', 800);
      gaugeLog(x0 + 4, c.y + 204, w0 - 24, v);
      T(x0, c.y + 268, isBH ? 'v탈출 ≥ c → 빛도 탈출 못 해요' : 'v탈출 = ' + sci(v / CL, 1) + ' c', 14, isBH ? '#b91c1c' : '#26324a', 'left', 800);
      T(x0, c.y + 292, '경계: v탈출 = c → R = 2GM / c²', 13.5, '#1d4ed8', 'left', 800);
    }
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, fs = PHONE ? 13 : 14.5, lh = PHONE ? 24 : 29;
    T(x0, PY + 28, '⚫ 블랙홀 = 탈출 속도가 빛의 속력인 천체', 15, '#26324a', 'left', 800);
    if (PHONE) {
      lines(x0, PY + 28 + lh, lh - 2, 13.5, [['M = ' + sci(b.M, 1) + ' kg,  R = ' + fmtLen(R), '#26324a'], ['v탈출 = ' + (v >= CL ? '≥ c (빛도 못 나와요)' : sci(v, 1) + ' m/s'), v >= CL ? '#b91c1c' : '#c2410c']]);
      gaugeLog(x0 + 4, PY + 28 + lh * 3 - 10, PW - 44, v);
    }
    const y1 = PHONE ? PY + 28 + lh * 3 + 54 : PY + 28 + lh;
    lines(x0, y1, lh - 2, fs - 0.5, [
      ['½mc² = GMm/R  →  R = 2GM / c²  (탈출 속도 = 빛의 속력)', '#1d4ed8'],
      ['지구 약 9 mm, 태양 약 3.0 km, 태양의 10배인 별 약 30 km', '#26324a'],
      ['사건의 지평선 안에서는 빛도 나오지 못해 검게 보여요.', '#26324a'],
    ].concat(PHONE ? [] : [['블랙홀은 청소기가 아니에요: 멀리서는 같은 질량의 별과 중력이 같아요.', '#14753f'], ['뉴턴식 설명은 엄밀하지 않지만, 일반 상대론도 같은 R_s를 줘요.', '#5a6679']]));
  }

  /* ================= ④ 중력 시간 지연 ================= */
  const dlR = (t) => Math.exp(Math.log(1.05) + (Math.log(20) - Math.log(1.05)) * t / 100);
  const dlRate = (r) => Math.sqrt(Math.max(0, 1 - 1 / r));        // 정지한 시계의 빠르기 (먼 곳 = 1)
  function clockFace(x, y, r, tsec, col, label, big) {
    D.sphere(x, y, r, '#f6f8fc', { gloss: false, outline: col, outlineWidth: 4, light: '#ffffff', dark: '#dfe5f1' });
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12; ctx.strokeStyle = '#516079'; ctx.lineWidth = k % 3 ? 1.5 : 2.5; ctx.beginPath(); ctx.moveTo(x + Math.sin(a) * (r - 5), y - Math.cos(a) * (r - 5)); ctx.lineTo(x + Math.sin(a) * (r - (k % 3 ? 8 : 11)), y - Math.cos(a) * (r - (k % 3 ? 8 : 11))); ctx.stroke(); }
    const a1 = (tsec % 8) / 8 * TAU, a2 = (tsec % 96) / 96 * TAU;
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(a2) * r * 0.5, y - Math.cos(a2) * r * 0.5); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(a1) * r * 0.82, y - Math.cos(a1) * r * 0.82); ctx.stroke(); ctx.lineCap = 'butt';
    D.sphere(x, y, 3.5, '#1e293b', { gloss: false });
    T(x, y + r + 20, label, 13.5, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.55)', strokeWidth: 3 });
  }
  function dlStep(dt) {
    const d = S.dl; if (S.mode !== 'dilate') return;
    const r = dlR(d.t); d.far += dt; d.near += dt * dlRate(r);
    if (d.far > 96) { d.far -= 96; d.near = 0; }
  }
  function drawDilate(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), d = S.dl, r = dlR(d.t), rate = dlRate(r);
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    D.space(c.x, c.y, c.w, c.h, S.clock, { stars: 60 });
    const bx = c.x + (PHONE ? 90 : 170), by = c.y + c.h + 26, R1 = PHONE ? 52 : 74;
    // 블랙홀
    ctx.save(); ctx.translate(bx, by); ctx.scale(1, 0.34); const dg = ctx.createRadialGradient(0, 0, R1, 0, 0, R1 * 2.6); dg.addColorStop(0, 'rgba(255,220,120,.9)'); dg.addColorStop(0.5, 'rgba(255,130,40,.5)'); dg.addColorStop(1, 'rgba(255,80,0,0)'); ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, R1 * 2.6, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(bx, by, R1, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(bx, by, R1, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // 거리 눈금 (r)
    const rr = PHONE ? 26 : 34, ypx = (rv) => by - R1 * rv - 0 * 1, dpx = R1 + (Math.log(r) / Math.log(20)) * (c.h - R1 * 0.2 - rr * 2 - 40);
    const ny = by - dpx;
    D.dashedLine(bx, by - R1, bx, ny + rr, { color: 'rgba(255,255,255,.5)', width: 1.5, dash: [4, 5] });
    T(bx + rr + 10, ny + 5, 'r = ' + (r < 10 ? r.toFixed(1) : r.toFixed(0)) + ' R_s', 13, '#ffe58a', 'left', 800, { stroke: 'rgba(0,0,0,.55)', strokeWidth: 3 });
    clockFace(bx, ny, rr, d.near, '#ef4444', '아래 시계', false);
    const fx = c.x + (PHONE ? 300 : 440), fy = c.y + 90;
    clockFace(fx, fy, PHONE ? 38 : 44, d.far, '#38bdf8', '먼 곳의 시계(기준)', true);
    T(bx + 4, c.y + 24, '질량에 가까운 시계가 더 느려요 (과장된 곳에서)', PHONE ? 13 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.55)', strokeWidth: 3 });
    // 속도 비교 막대
    const x0 = PHONE ? c.x + 200 : c.x + 540, w0 = PHONE ? 110 : c.x + c.w - x0 - 16;
    const by1 = c.y + (PHONE ? 190 : 150);
    T(x0, by1, '시계가 가는 빠르기', 13.5, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.55)', strokeWidth: 3 });
    hbar(x0, by1 + 12, w0, 14, 1, 1, '#38bdf8'); T(x0, by1 + 46, '먼 시계 1.00', 13.5, '#cfe9ff', 'left', 800, { stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 });
    hbar(x0, by1 + 60, w0, 14, rate, 1, '#ef4444'); T(x0, by1 + 94, '아래 시계 ' + rate.toFixed(2), 13.5, '#ffd0d0', 'left', 800, { stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 });
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16, fs = PHONE ? 13 : 14.5, lh = PHONE ? 24 : 29;
    T(x1, PY + 28, '⏱️ 중력이 강한 곳에서는 시계가 느리게 가요', 15, '#26324a', 'left', 800);
    lines(x1, PY + 28 + lh, lh, fs, [
      ['먼 시계가 ' + d.far.toFixed(1) + ' 초 갈 때 아래 시계는 ' + d.near.toFixed(1) + ' 초 가요.', '#1d4ed8'],
      ['r = ' + (r < 10 ? r.toFixed(1) : r.toFixed(0)) + ' R_s에서 아래 시계의 빠르기 = ' + rate.toFixed(2) + '배', '#c2410c'],
      ['중력이 강한 곳(질량에 가까운 곳)일수록 더 느려요. 지표의 시계도 높은 곳의 시계보다 아주 조금 느려요.', '#26324a'],
    ].slice(0, PHONE ? 3 : 3));
    if (!PHONE) { const n = wrapL('지구에서는 차이가 너무 작아서(약 10⁻¹⁰ 배) 정밀한 원자시계로만 잴 수 있어요. 여기서는 크게 보이도록 블랙홀 곁에 시계를 놓았어요.', x1, PY + 28 + lh * 4, PW - 40, 22, 13.5, '#5a6679'); T(x1, PY + 28 + lh * 4 + n * 22 + 4, '영화 〈인터스텔라〉: 블랙홀 가까운 행성의 1시간이 지구의 7년 (영화 설정)', 13.5, '#5a6679', 'left', 800); }
  }

  /* ================= ④ GPS 시간 보정 ================= */
  function gpStep(dt) { S.gp.t = (S.gp.t + dt) % 6; }
  function drawGps(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), g = S.gp, calc = showCalc('gin'), frac = g.t / 6;
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    D.space(c.x, c.y, c.w, c.h, S.clock, { stars: 60 });
    const ecx = c.x + (PHONE ? 90 : 150), ecy = c.y + c.h / 2 + 10, Re = PHONE ? 44 : 60, Ro = PHONE ? 86 : 118;
    ctx.strokeStyle = 'rgba(255,229,138,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.arc(ecx, ecy, Ro, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    D.glow(ecx, ecy, Re * 1.4, '#7cc4ff', 0.3); D.sphere(ecx, ecy, Re, '#3b82f6', { gloss: false });
    ctx.save(); ctx.beginPath(); ctx.arc(ecx, ecy, Re, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(70,170,100,.85)'; [[0.4, 0.5, 0.3], [2.3, 0.45, 0.28], [4.1, 0.5, 0.3]].forEach((q) => { const a = q[0] + S.clock * 0.1; ctx.beginPath(); ctx.arc(ecx + Math.cos(a) * Re * q[1], ecy - Math.sin(a) * Re * q[1], Re * q[2], 0, TAU); ctx.fill(); }); ctx.restore();
    const ga = -S.clock * 0.7 + 0.9, sx = ecx + Math.cos(ga) * Ro, sy = ecy + Math.sin(ga) * Ro;
    // 지상 시계 (지표 한 점)
    const gx = ecx - Re * 0.7, gy = ecy - Re * 0.7;
    D.sphere(gx, gy, 5, '#ffd447', { gloss: false, outline: '#fff', outlineWidth: 1.2 });
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(ga + Math.PI / 2); ctx.fillStyle = '#e8edf6'; D.roundRect(-5, -4, 10, 8, 2); ctx.fill(); ctx.fillStyle = '#3867f4'; ctx.fillRect(-14, -3, 8, 6); ctx.fillRect(6, -3, 8, 6); ctx.restore();
    D.label(clamp(sx, c.x + 54, c.x + (PHONE ? 180 : 300)), sy + (sy > ecy ? 22 : -20), 'GPS 위성 (시계)', { bg: 'rgba(255,255,255,.22)', color: '#fff', size: 13, pad: 6 });
    D.label(c.x + 62, gy - 14, '지상 시계', { bg: 'rgba(255,229,138,.3)', color: '#fff', size: 13, pad: 6 });
    T(c.x + 12, c.y + 24, 'GPS 위성 (고도 약 2.0 × 10⁴ km, 속력 3.9 km/s) — 축척 아님', PHONE ? 13 : 14, '#fff', 'left', 800, { stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 });
    // 막대 (하루 동안 위성 시계가 앞서는 양)
    const x0 = c.x + (PHONE ? 196 : 330), w0 = c.x + c.w - x0 - (PHONE ? 70 : 150), sc = w0 / 50;
    ctx.fillStyle = 'rgba(247,249,253,.96)'; ctx.fillRect(x0 - 12, c.y + 34, c.x + c.w - x0 + 12 - 0, c.h - 34);
    T(x0, c.y + 58, '위성 시계가 하루에 앞서는 양', 13.5, '#26324a', 'left', 800);
    const rows = [['일반 상대론 (중력이 약해서 빨라짐)', GPS_G, '#14a058'], ['특수 상대론 (빨리 움직여서 느려짐)', -GPS_V, '#e2464b'], ['합', GPS_NET, '#2563eb']];
    rows.forEach((q, i) => {
      const yy = c.y + 84 + i * (PHONE ? 62 : 70), isSum = i === 2, hid = isSum && calc;
      T(x0, yy, PHONE ? ['중력 (일반)', '속도 (특수)', '합'][i] : q[0], 13, '#5a6679', 'left', 800);
      const y2 = yy + 10, zx = x0 + (q[1] < 0 ? GPS_V * sc : 0);
      D.roundRect(x0, y2, w0 + GPS_V * sc, 16, 8); ctx.fillStyle = '#e4eaf5'; ctx.fill();
      if (!hid) { ctx.save(); D.roundRect(x0, y2, w0 + GPS_V * sc, 16, 8); ctx.clip(); ctx.fillStyle = q[2]; const bw = Math.abs(q[1]) * sc * (isSum ? 1 : 1), z0 = x0 + GPS_V * sc; if (q[1] >= 0) ctx.fillRect(z0, y2, bw, 16); else ctx.fillRect(z0 - bw, y2, bw, 16); ctx.restore(); }
      ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + GPS_V * sc, y2 - 3); ctx.lineTo(x0 + GPS_V * sc, y2 + 19); ctx.stroke();
      T(x0 + w0 + GPS_V * sc + 8, y2 + 14, hid ? '?' : (q[1] > 0 ? '+' : MINUS) + Math.abs(q[1]).toFixed(1) + ' μs', 13.5, hid ? '#b45309' : '#26324a', 'left', 800);
    });
    T(x0, c.y + c.h - 14, '하루(24시간)마다 어긋나는 시간', 13, '#5a6679', 'left', 700);
    ctx.restore();
    // 아래: 지도
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16, fs = PHONE ? 13 : 14.5, lh = PHONE ? 23 : 28;
    if (calc) {
      T(x1, PY + 28, '📝 보정량 계산 칸', 15, '#26324a', 'left', 800);
      lines(x1, PY + 28 + lh, lh, fs, [
        ['① 위성 시계의 합 = (+45.7) + (' + MINUS + '7.2) = ?  μs/일', '#26324a'],
        ['② 거리 오차 = c × (어긋난 시간) = 3.0 × 10⁸ m/s × ? s', '#26324a'],
        ['   위성 신호는 빛의 속력으로 오므로 시간 오차가 곧 거리 오차예요.', '#5a6679'],
      ]);
      return;
    }
    const day = g.day, err = day * GPS_ERR1;
    T(x1, PY + 28, '🗺️ 보정하지 않으면 ' + (day === 1 ? '하루' : day === 2 ? '이틀' : '일주일') + ' 뒤 위치 오차: ' + f1(err) + ' km', 15, '#b91c1c', 'left', 800);
    const mw = PHONE ? PW - 32 : 470, mh = PHONE ? 150 : 170, mx = x1, my = PY + 44;
    const mg = ctx.createLinearGradient(0, my, 0, my + mh); mg.addColorStop(0, '#e7f1df'); mg.addColorStop(1, '#d6e7cf'); ctx.fillStyle = mg; D.roundRect(mx, my, mw, mh, 10); ctx.fill();
    ctx.save(); D.roundRect(mx, my, mw, mh, 10); ctx.clip();
    const kmw = 90, kx = (km) => mx + 12 + (mw - 24) * km / kmw;      // 가로 0 ~ 90 km
    ctx.strokeStyle = 'rgba(100,130,100,.35)'; ctx.lineWidth = 1; for (let k = 0; k <= 90; k += 10) { ctx.beginPath(); ctx.moveTo(kx(k), my); ctx.lineTo(kx(k), my + mh); ctx.stroke(); }
    ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(mx, my + mh * 0.62); ctx.bezierCurveTo(mx + mw * 0.3, my + mh * 0.5, mx + mw * 0.55, my + mh * 0.78, mx + mw, my + mh * 0.55); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    const py2 = my + mh * 0.55, a0 = kx(2), a1 = kx(2 + err);
    D.dashedLine(a0, py2, Math.min(a1, mx + mw - 6), py2, { color: '#b91c1c', width: 2.5, dash: [6, 4] });
    D.sphere(a0, py2, 8, '#14a058', { gloss: false, outline: '#fff', outlineWidth: 2 }); D.sphere(Math.min(a1, mx + mw - 8), py2 - 0, 8, '#e2464b', { gloss: false, outline: '#fff', outlineWidth: 2 });
    ctx.restore();
    for (let k = 0; k <= 90; k += 30) T(kx(k), my + mh + 17, k + ' km', 13, '#3a465c', 'center', 800);
    D.label(a0 + 4, py2 - 22, '실제 위치', { bg: '#14a058', size: 13, pad: 7, align: 'left' });
    D.label(Math.min(a1, mx + mw - 8) + (a1 > mx + mw - 120 ? -6 : 6), py2 + 24, 'GPS가 알려 주는 위치', { bg: '#e2464b', size: 13, pad: 7, align: a1 > mx + mw - 120 ? 'right' : 'left' });
    const tx = PHONE ? x1 : PX + 510;
    const yy = PHONE ? my + mh + 40 : PY + 52;
    lines(tx, yy, PHONE ? 22 : lh, PHONE ? 13 : 14, [
      ['어긋남 = ' + GPS_NET.toFixed(1) + ' μs/일 × ' + day + '일', '#26324a'],
      ['오차 = c × ' + f1(GPS_NET * day) + ' μs = ' + f1(err) + ' km', '#c2410c'],
      ['그래서 위성 시계의 진동수를', '#14753f'],
      ['미리 약 4.5 × 10⁻¹⁰ 배 낮춰요.', '#14753f'],
    ].concat(PHONE ? [] : [['보정 덕분에 길 안내가 맞아요.', '#5a6679']]));
  }

  /* ================= 컨트롤 연결 ================= */
  const setSl = (id, v, mn, mx) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); };
  function updateCtl() {
    const modes = allowedModes();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) { const c = n.getAttribute('data-calc'); if (c && !showCalc(c)) on = false; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    const e = S.eq;
    $$('#eqSit button').forEach((x) => x.classList.toggle('on', x.dataset.sit === e.sit));
    $$('#eqView button').forEach((x) => x.classList.toggle('on', x.dataset.view === e.view));
    $('#bEq').disabled = e.st === 'run';
    $('#oLa').textContent = S.lz.a.toFixed(2).replace(/0$/, '') + ' g'; setSl('sLa', S.lz.a, 0, 3); $('#bLz').disabled = S.lz.firing;
    $('#oSm').textContent = S.sh.M; setSl('sSm', S.sh.M, 0, 5);
    $$('#ecSeg button').forEach((x) => x.classList.toggle('on', x.dataset.ec === S.ec.sky));
    $$('#ecCmp button').forEach((x) => x.classList.toggle('on', +x.dataset.cmp === S.ec.cmp));
    $$('#cpM button').forEach((x) => x.classList.toggle('on', +x.dataset.cm === S.cp.i));
    const b = CPB[S.cp.i]; $('#oCr').textContent = fmtLen(cpR(b, S.cp.s)); setSl('sCr', S.cp.s, 0, 100);
    const r = dlR(S.dl.t); $('#oDr').textContent = (r < 10 ? r.toFixed(1) : r.toFixed(0)) + ' R_s'; setSl('sDr', S.dl.t, 0, 100);
    $$('#gpD button').forEach((x) => x.classList.toggle('on', +x.dataset.gd === S.gp.day));
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#eqSit button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.eq.sit = x.dataset.sit; eqReset(); }));
  $$('#eqView button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.eq.view = x.dataset.view; updateCtl(); }));
  $('#bEq').addEventListener('click', eqRelease);
  $('#bEqR').addEventListener('click', () => { Sound.click(); eqReset(); });
  ['tA', 'tB', 'tC'].forEach((id) => $('#' + id).addEventListener('change', (e) => e.target.classList.remove('ok', 'bad')));
  $('#sLa').addEventListener('input', (e) => { S.lz.a = +e.target.value; S.lz.p = 0; S.lz.firing = false; updateCtl(); });
  $('#bLz').addEventListener('click', lzFire);
  $('#sSm').addEventListener('input', (e) => { S.sh.M = +e.target.value; S.sh.mar = null; S.sh.lt = null; updateCtl(); });
  $('#bSm').addEventListener('click', () => shLaunch('marble'));
  $('#bSl').addEventListener('click', () => shLaunch('light'));
  $('#bSR').addEventListener('click', () => { Sound.click(); S.sh.mar = null; S.sh.lt = null; });
  $$('#ecSeg button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.ec.sky = x.dataset.ec; if (S.ec.sky === 'total') S.ec.seenTotal = true; if (S.ec.sky === 'total' && S.ec.cmp) S.ec.seenCmp = true; updateCtl(); }));
  $$('#ecCmp button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.ec.cmp = +x.dataset.cmp; if (S.ec.sky === 'total' && S.ec.cmp) S.ec.seenCmp = true; updateCtl(); }));
  $$('#cpM button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.cp.i = +x.dataset.cm; S.cp.s = 0; updateCtl(); }));
  $('#sCr').addEventListener('input', (e) => { S.cp.s = +e.target.value; updateCtl(); });
  [0, 1, 2, 3].forEach((i) => $('#mS' + i).addEventListener('change', (e) => e.target.classList.remove('ok', 'bad')));
  $('#sDr').addEventListener('input', (e) => { S.dl.t = +e.target.value; S.dl.far = 0; S.dl.near = 0; updateCtl(); });
  $('#bDr').addEventListener('click', () => { Sound.click(); S.dl.far = 0; S.dl.near = 0; });
  $$('#gpD button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.gp.day = +x.dataset.gd; S.gp.seen[S.gp.day] = true; updateCtl(); }));
  ['iG1', 'iG2'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'equiv') {
      const free = S.eq.sit === 'free';
      L1 = '저울 눈금 (A, B 같음)'; a = free ? '0 N (무중량)' : Math.round(W_PERSON) + ' N'; L2 = '공이 닿는 시간'; b = free ? '떠 있어요' : T_FALL.toFixed(2) + ' s (1 kg, 8 kg 같음)'; L3 = 'A와 B'; c = '방 안에서는 구별 안 돼요';
    } else if (S.mode === 'laser') {
      const l = S.lz; L1 = 'B 방의 가속도'; a = l.a.toFixed(2).replace(/0$/, '') + ' g'; L2 = 'A 지표의 방'; b = '1 g'; L3 = '빛이 휜 모양'; c = Math.abs(l.a - 1) < 0.01 ? '똑같아요' : (l.a < 1 ? 'B가 덜 휘어요' : 'B가 더 휘어요');
    } else if (S.mode === 'sheet') {
      const s = S.sh; L1 = '가운데 질량 (상대)'; a = String(s.M); L2 = '구슬'; b = s.mar ? (s.mar.st === 'run' ? '굴러가는 중' : s.mar.defl != null ? '꺾인 각도 ' + s.mar.defl.toFixed(0) + '°' : '부딪힘') : '—'; L3 = '빛'; c = s.lt ? (s.lt.st === 'run' ? '가는 중' : s.lt.defl != null ? '꺾인 각도 ' + s.lt.defl.toFixed(1) + '°' : '부딪힘') : '—';
    } else if (S.mode === 'eclipse') {
      L1 = '하늘'; a = S.ec.sky === 'total' ? '개기 일식' : '평소 낮'; L2 = '별빛의 휨 (태양 가장자리)'; b = '약 1.75″'; L3 = '관측'; c = '1919년 에딩턴';
    } else if (S.mode === 'collapse') {
      const bd = CPB[S.cp.i], R = cpR(bd, S.cp.s), Rs = RS(bd.M), v = cpVesc(bd, R);
      L1 = '반지름 R'; a = fmtLen(R); L2 = '지평선 반지름 R_s'; b = fmtLen(Rs); L3 = '탈출 속도'; c = v >= CL ? 'c 이상 (블랙홀)' : sci(v, 1) + ' m/s';
    } else if (S.mode === 'dilate') {
      const r = dlR(S.dl.t); L1 = '아래 시계의 빠르기'; a = dlRate(r).toFixed(2) + '배'; L2 = '거리 r'; b = (r < 10 ? r.toFixed(1) : r.toFixed(0)) + ' R_s'; L3 = '먼 시계에 대해'; c = '더 느려요';
    } else {
      const calc = showCalc('gin'), d = S.gp.day;
      L1 = '하루 어긋남'; a = calc ? '?' : '+' + GPS_NET.toFixed(1) + ' μs'; L2 = '하루 거리 오차'; b = calc ? '?' : f1(GPS_ERR1) + ' km'; L3 = '보정 없이 ' + (d === 1 ? '하루' : d === 2 ? '이틀' : '일주일'); c = calc ? '?' : f1(d * GPS_ERR1) + ' km';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const fb = (pairs) => pairs.forEach(([el, ok]) => { if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } else if (!el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } });
  const num = (id) => { const v = $('#' + id).value.trim(); return v === '' || !isFinite(+v) ? null : +v; };
  function clr(...ids) { ids.forEach((id) => { const el = $('#' + id); if (el.tagName === 'SELECT') el.value = '0'; else el.value = ''; el.classList.remove('ok', 'bad'); }); }
  const selv = (id) => +$('#' + id).value;

  const levels = [
    {
      title: '등가 원리: 방 안에서는 구별할 수 없어요', short: '등가 원리', icon: '🛗', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 중력이 힘이 아니라 시공간의 휘어짐이라면, 어떤 현상으로 알아볼 수 있을까? 스마트폰 길 안내가 맞는 건 일반 상대론 덕분일까?</p>' +
        '<div class="si-link">🔗 <b>물리학·통합과학에서</b> 광속 불변에서 시간 팽창이 나온다는 특수 상대론을 맛봤고, 위성 안의 우주인이 떠 있는 것은 중력이 없어서가 아니라 <b>자유 낙하</b> 때문이라고 배웠어요. 이번에는 중력 자체를 새로운 눈으로 봐요.</div>' +
        '<p>창문이 없는 두 방이 있어요. <b>A</b>는 지표에 매달려 있고, <b>B</b>는 우주에서 위로 <b>9.8 m/s²(= 1 g)</b>로 가속하는 로켓이에요. 저울과 공 두 개(1 kg, 8 kg)로 실험해 두 방을 구별할 수 있는지 확인해요.</p>',
      features: ['equiv'],
      setup() { const e = S.eq; e.sit = 'normal'; e.view = 'in'; e.did = { normal: false, free: false }; eqReset(); clr('tA', 'tB', 'tC'); setFlag('tbl', false); setScene('equiv'); },
      recap: '지표의 방과 위로 가속하는 방은 방 안의 실험으로 구별할 수 없어요(등가 원리). 모든 물체가 같은 가속도로 떨어지는 것은 중력 질량 = 관성 질량이기 때문이고, 자유 낙하하는 방은 무중량이에요.',
      summary: '<ul><li><b>등가 원리</b>: 창문 없는 방 안에서는 지표의 중력(g = 9.8 m/s²)과 우주에서 위로 g로 가속하는 것을 <b>구별할 수 없어요</b>(국소적). 저울의 눈금도, 공이 떨어지는 모습도 같아요.</li>' +
        '<li>무거운 공과 가벼운 공이 <b>같은 가속도</b>로 떨어져요. 무게(중력 질량)와 가속에 저항하는 정도(관성 질량)가 같기 때문이에요. 아폴로 15호(1971)의 달 위 망치와 깃털이 동시에 떨어졌어요.</li>' +
        '<li><b>자유 낙하</b>하는 방(줄이 끊긴 승강기, 엔진을 끈 우주선)에서는 저울이 0이고 모두 떠 있어요(무중량). 중력이 사라진 것이 아니라 함께 떨어지는 중이에요.</li></ul>',
      missions: [
        {
          title: '두 방에서 실험하고 결과 비교하기', manual: true,
          goal: '<b>🏀 공 놓기</b>를 <b>🧱 보통</b>과 <b>🪂 자유 낙하</b> 두 상황에서 모두 실행한 뒤, 아래 관찰 결과 세 칸을 골라 ✔ 확인하기를 누르세요. (보는 위치를 방 밖으로 바꿔 볼 수도 있어요.)',
          hint: '상황을 바꿀 때마다 공 놓기를 눌러요. 방 안에서는 A와 B의 저울과 공이 똑같이 움직여요. 방 밖에서 보면 A는 공이 떨어지고 B는 바닥이 올라와요.',
          setup() { const e = S.eq; e.did = { normal: false, free: false }; eqReset(); clr('tA', 'tB', 'tC'); setFlag('tbl', true); setScene('equiv'); },
          check() {
            const e = S.eq; if (!e.did.normal || !e.did.free) return '🏀 공 놓기를 보통 상황과 자유 낙하 상황에서 각각 한 번씩 끝까지 실행해 보세요.';
            const a = selv('tA'), b = selv('tB'), c = selv('tC');
            if (!a || !b || !c) return '세 칸을 모두 골라 주세요.';
            const oks = [a === 1, b === 1, c === 2]; fb([[$('#tA'), oks[0]], [$('#tB'), oks[1]], [$('#tC'), oks[2]]]);
            if (oks.every(Boolean)) return true;
            if (!oks[0]) return '표를 다시 봐요. A와 B의 저울 눈금은 686 N으로 같아요.';
            if (!oks[1]) return '공기 저항이 없으면 무거운 공도 가벼운 공도 같은 가속도로 떨어져 동시에 닿아요.';
            return 'A와 B에서 같은 결과가 나왔어요. 창문 없는 방 안의 실험으로는 두 방을 구별할 수 없어요.';
          },
          status: () => mark(S.eq.did.normal) + ' 보통 실험 &nbsp; ' + mark(S.eq.did.free) + ' 자유 낙하 실험',
          explain: '두 방에서 저울은 <b>686 N</b>(70 kg × 9.8 m/s²)이고 공은 <b>0.70 s</b> 만에 동시에 닿아요. 안에서는 A와 B를 구별할 수 없어요(<b>등가 원리</b>). 밖에서 보면 A에서는 공이 떨어지고, B에서는 공은 제자리이고 바닥이 올라오지만 방 안의 관찰자에게는 같은 일이에요. 자유 낙하에서는 저울이 0이고 공이 떠 있어요.',
        },
        {
          type: 'quiz', title: '무거운 공과 가벼운 공이 같이 떨어지는 까닭',
          goal: '무거운 공(8 kg)과 가벼운 공(1 kg)이 같은 시간에 바닥에 닿는 까닭으로 알맞은 것은?',
          setup() { setFlag('tbl', false); setScene('equiv'); },
          choices: ['이 방에는 중력이 없어서 모든 물체가 같이 떨어져요', '무거운 공이 공기 저항을 더 받아 느려지기 때문이에요', '무게(중력)와 가속에 저항하는 정도(관성)가 모두 질량에 비례해서 가속도가 같아져요 (중력 질량 = 관성 질량)', '가벼운 공이 더 큰 중력을 받아 무거운 공을 따라잡기 때문이에요'],
          answer: 2,
          feedback: ['우주선 안 우주인이 떠 있는 것은 중력이 없어서가 아니라 자유 낙하 때문이에요. 이 방(A)은 중력이 있는 지표의 방이에요.', '이 실험에는 공기가 없다고 봐요. 공기 저항이 없어도 둘은 같이 닿아요.', '', '무거운 공이 더 큰 중력을 받지만 그만큼 가속하기도 더 어려워요. 둘이 상쇄돼요.'],
          explain: '무거운 공은 중력(무게)이 큰 만큼 가속에 저항하는 정도(관성)도 커요. 둘이 모두 질량에 비례하는 <b>중력 질량 = 관성 질량</b>이라 가속도 a = g가 같아요. 이 사실이 등가 원리의 출발점이에요.',
        },
      ],
    },
    {
      title: '시공간: 빛도 휘어요', short: '시공간', icon: '🕸️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 중력이 있는 방과 가속하는 방은 구별할 수 없다는 <b>등가 원리</b>를 알았어요. 그렇다면 가속하는 방에서 일어나는 일은 중력장에서도 일어나야 해요. 빛은 어떨까요?</div>' +
        '<p>가속하는 방에서 레이저를 쏘면 빛이 휘어 보여요. 그러면 중력이 센 곳에서도 빛이 휘어야 해요. <b>고무막 모형</b>으로 질량이 시공간을 휘게 하는 모습을 보고, 1919년 <b>일식</b> 관측으로 확인해요. 계산은 하지 않고 모양과 원리를 봐요.</p>',
      features: ['laser', 'sheet', 'eclipse'],
      setup() { S.lz.a = 2; S.lz.p = 1; S.lz.firing = false; S.lz.seen = false; S.lz.matched = false; S.sh.M = 0; S.sh.mar = null; S.sh.lt = null; S.sh.seenFlat = false; S.sh.seenBent = false; S.sh.seenLight = false; S.ec.sky = 'day'; S.ec.cmp = 0; S.ec.seenTotal = false; S.ec.seenCmp = false; setScene('laser'); },
      recap: '가속하는 방에서 빛이 휘어 보이니 등가 원리에 따라 중력장에서도 빛이 휘어요. 질량은 시공간을 휘게 하고, 물체와 빛은 휜 시공간을 따라 가장 곧은 경로로 가요. 1919년 일식 관측이 이를 확인했어요.',
      summary: '<ul><li>위로 가속하는 방에서 수평으로 쏜 레이저는 <b>아래로 휘어 보여요</b>. 등가 원리에 따라 <b>중력장에서도 빛이 휘어야</b> 해요.</li>' +
        '<li><b>고무막 모형</b>: 질량이 있는 곳에서 막(시공간)이 움푹 패이고, 구슬(물체)과 빛은 패인 막을 따라 가장 곧은 경로로 움직여요. 힘이 끌어당기는 대신 시공간의 모양이 경로를 정해요.</li>' +
        '<li><b>1919년 에딩턴의 개기 일식 관측</b>: 태양 가장자리를 지나는 별빛이 약 <b>1.75″</b> 휘어 별의 위치가 어긋나 보였어요. 평소 낮에는 태양이 너무 밝아 태양 곁의 별을 볼 수 없어요. 태양에 가까울수록 더 많이 휘어요.</li>' +
        '<li><b>중력 렌즈</b>: 은하단처럼 질량이 큰 천체가 뒤쪽 천체의 빛을 휘게 해서 고리나 여러 개의 상이 보여요.</li></ul>',
      missions: [
        {
          title: '가속하는 방과 고무막에서 휨 관찰하기',
          goal: '<b>🔦 빛의 휨</b>에서 가속도를 2 g 이상으로 쏘고 <b>1 g</b>로도 쏘아 보세요. <b>🕸️ 고무막 모형</b>에서는 질량 0일 때와 질량 2 이상일 때 구슬을 굴려 보세요.',
          hint: '빛의 휨: 슬라이더 2 → 🔦, 1 → 🔦 (1 g일 때 두 방이 똑같아져요). 고무막: 질량 0에서 ⚪ 구슬 굴리기, 질량을 3으로 올려 다시 굴려요(구슬이 가운데 천체에 부딪히면 그것도 휜 경로로 쳐요).',
          setup() { S.lz.a = 2; S.lz.p = 0; S.lz.firing = false; S.lz.seen = false; S.lz.matched = false; S.sh.M = 0; S.sh.mar = null; S.sh.lt = null; S.sh.seenFlat = false; S.sh.seenBent = false; setScene('laser'); },
          check: () => S.lz.seen && S.lz.matched && S.sh.seenFlat && S.sh.seenBent,
          hold: 0.5,
          status: () => mark(S.lz.seen) + ' 2 g 이상으로 쏘기 &nbsp; ' + mark(S.lz.matched) + ' 1 g로 쏘기 &nbsp; ' + mark(S.sh.seenFlat) + ' 질량 0 구슬 &nbsp; ' + mark(S.sh.seenBent) + ' 질량 2 이상 구슬',
          explain: '가속도가 클수록 빛이 더 많이 휘어 보이고, <b>1 g</b>에서는 지표의 방(A)과 똑같아요. 그래서 중력이 있는 곳에서도 빛은 휘어요. 고무막에서는 질량이 0이면 막이 평평해 구슬이 곧게 가고, 질량이 커지면 막이 깊게 패여 구슬 경로가 크게 꺾여요. 빛도 같은 막을 따라가지만 빨라서 덜 꺾여요.',
        },
        {
          title: '개기 일식에서 별빛의 휨 확인하기',
          goal: '<b>🌑 1919 일식</b>에서 <b>개기 일식</b>으로 바꾸고 <b>원래 위치와 비교</b>를 눌러, 별의 보이는 위치가 원래 위치와 어떻게 다른지 확인하세요.',
          hint: '하늘을 개기 일식으로 바꾸고, 별의 위치를 "원래 위치와 비교"로 눌러요. 태양에 가까운 별일수록 화살표가 길어요.',
          setup() { S.ec.sky = 'day'; S.ec.cmp = 0; S.ec.seenTotal = false; S.ec.seenCmp = false; setScene('eclipse'); },
          check: () => S.ec.seenTotal && S.ec.seenCmp,
          hold: 0.5,
          status: () => mark(S.ec.seenTotal) + ' 개기 일식 보기 &nbsp; ' + mark(S.ec.seenCmp) + ' 원래 위치와 비교',
          explain: '평소 낮에는 태양빛이 너무 밝아서 태양 곁의 별이 보이지 않아요. <b>개기 일식</b> 때 달이 태양을 가리면 하늘이 어두워져 별이 보이고, 별빛이 태양 곁을 지나며 휘어서 별이 원래 위치보다 <b>태양에서 멀어진 곳</b>에 보여요. 태양에 가까운 별일수록 더 많이 어긋나요.',
        },
        {
          type: 'quiz', title: '질량이 있는 곳에서 빛이 휘는 까닭',
          goal: '태양처럼 질량이 큰 천체 곁에서 별빛이 휘는 까닭으로 가장 알맞은 것은?',
          setup() { setScene('sheet'); },
          choices: ['빛도 질량이 있는 입자라서 태양의 인력에 끌려가기 때문이에요', '질량이 시공간을 휘게 하고, 빛은 휜 시공간을 따라 가장 곧은 경로로 가기 때문이에요', '태양 둘레의 뜨거운 공기가 빛을 꺾기 때문이에요', '태양 곁에서 빛이 느려져서 멈칫하기 때문이에요'],
          answer: 1,
          feedback: ['"끌린다"는 뉴턴식 설명은 관측된 휨의 절반 정도밖에 설명하지 못해요. 일반 상대론은 시공간의 휘어짐으로 설명하고 1919년 관측과 맞았어요.', '', '대기 굴절과는 달라요. 우주 공간(진공)에서도 빛이 휘어요.', '빛의 속력은 어디서나 같아요. 달라지는 것은 시공간의 모양이에요.'],
          explain: '일반 상대론에서 <b>질량은 시공간을 휘게</b> 하고, 빛과 물체는 휜 시공간에서 <b>가장 곧은 경로</b>를 따라가요. 그래서 질량 곁에서 경로가 꺾여 보여요. 1919년 개기 일식 관측(약 1.75″)이 이 예측을 확인했어요.',
        },
      ],
    },
    {
      title: '블랙홀: 탈출 속도가 빛의 속력', short: '블랙홀', icon: '⚫', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 차시에서</b> 탈출 속도 √(2GM/R)를 배웠어요(지구 11.2 km/s). 천체를 작게 눌러 R을 줄이면 탈출 속도는 커져요. 어디까지 줄이면 탈출 속도가 <b>빛의 속력 c = 3.0 × 10⁸ m/s</b>에 이를까요?</div>' +
        '<p>탈출 속도 = c가 되는 R이 사건의 지평선 반지름 <b>R_s = 2GM/c²</b>이에요. 이 설명은 기초적인 풀이예요. 뉴턴식 계산이 엄밀하지는 않지만, 일반 상대론에서도 같은 값이 나와요. 지구와 태양을 직접 눌러 블랙홀로 만들어 봐요.</p>',
      features: ['collapse'],
      setup() { S.cp.i = 0; S.cp.s = 0; S.cp.done = [false, false, false]; clr('mS0', 'mS1', 'mS2', 'mS3'); setFlag('match', false); setScene('collapse'); },
      recap: '탈출 속도 = c가 되는 반지름이 R_s = 2GM/c²이에요 (지구 약 9 mm, 태양 약 3.0 km). 그 안(사건의 지평선)에서는 빛도 나오지 못해요.',
      summary: '<ul><li>탈출 속도 √(2GM/R)가 빛의 속력 c가 되는 R = <b>2GM/c²</b>(슈바르츠실트 반지름, R_s)보다 작게 줄어든 천체가 <b>블랙홀</b>이에요. R_s는 질량에 비례해요.</li>' +
        '<li>R_s: 지구 약 <b>9 mm</b>, 태양 약 <b>3.0 km</b>, 태양의 10배인 별 약 <b>30 km</b>, 우리은하 중심 블랙홀(태양의 약 4.3 × 10⁶배) 약 <b>1.3 × 10¹⁰ m</b>, M87 블랙홀(태양의 약 6.5 × 10⁹배) 약 <b>1.9 × 10¹³ m</b>.</li>' +
        '<li>그 경계가 <b>사건의 지평선</b>이에요. 안쪽에서는 빛도 탈출하지 못해 검게 보이고, 주위의 뜨거운 강착 원반과 휘어진 빛으로 존재를 알아요. 2019년 사건 지평선 망원경이 M87 블랙홀의 그림자를 촬영했어요.</li>' +
        '<li>블랙홀은 <b>청소기가 아니에요</b>. 멀리서 보면 같은 질량의 별과 중력이 같아요(태양이 블랙홀이 되어도 지구는 계속 같은 궤도를 돌아요).</li></ul>',
      missions: [
        {
          title: '지구와 태양을 블랙홀로 만들기',
          goal: '<b>지구</b>와 <b>태양</b>을 골라 슬라이더로 반지름을 줄여, 각각 <b>사건의 지평선 반지름 R_s</b> 이하로 만드세요.',
          hint: '슬라이더를 오른쪽 끝 가까이(약 96 % 이상) 밀어요. 점선 원이 지평선이 생길 크기예요. 지구는 약 9 mm, 태양은 약 3.0 km까지 줄여야 해요.',
          setup() { S.cp.i = 0; S.cp.s = 0; S.cp.done = [false, false, false]; setFlag('match', false); setScene('collapse'); },
          check: () => S.cp.done[0] && S.cp.done[1],
          hold: 0.4,
          status: () => mark(S.cp.done[0]) + ' 지구 블랙홀 (R_s 약 9 mm) &nbsp; ' + mark(S.cp.done[1]) + ' 태양 블랙홀 (R_s 약 3.0 km)',
          explain: '지구는 질량이 6.0 × 10²⁴ kg이라 R_s = 2GM/c² ≈ <b>9 mm</b>, 태양은 2.0 × 10³⁰ kg이라 약 <b>3.0 km</b>까지 눌러야 해요. 둘 다 원래 크기에 비해 엄청나게 작아서 실제로는 일어나기 어려워요. R_s는 질량에 비례해요.',
        },
        {
          title: '질량과 지평선 반지름 짝짓기', manual: true,
          goal: '네 천체의 질량에 맞는 사건의 지평선 반지름 <b>R_s</b>를 고르고 ✔ 확인하기를 누르세요. (R_s는 질량에 비례해요: 태양 3.0 km 기준)',
          hint: '태양(3.0 km)보다 4.3 × 10⁶배 무거우면 R_s도 4.3 × 10⁶배 커요: 3.0 × 10³ m × 4.3 × 10⁶ ≈ 1.3 × 10¹⁰ m. M87은 태양의 6.5 × 10⁹배예요.',
          setup() { S.cp.i = 1; S.cp.s = 0; clr('mS0', 'mS1', 'mS2', 'mS3'); setFlag('match', true); setScene('collapse'); },
          check() {
            const ans = [1, 2, 4, 5], vals = [0, 1, 2, 3].map((i) => selv('mS' + i));
            if (vals.some((v) => !v)) return '네 칸을 모두 골라 주세요.';
            const oks = vals.map((v, i) => v === ans[i]); fb(oks.map((o, i) => [$('#mS' + i), o]));
            if (oks.every(Boolean)) return true;
            return '붉은 칸을 다시 보세요. 질량이 클수록 R_s가 커요: 지구 &lt; 태양 &lt; 은하 중심 블랙홀 &lt; M87 순이에요.';
          },
          status: () => '고른 칸 ' + [0, 1, 2, 3].filter((i) => selv('mS' + i)).length + ' / 4',
          explain: 'R_s = 2GM/c²는 질량 M에 비례해요. 지구 <b>약 9 mm</b>, 태양 <b>약 3.0 km</b>, 우리은하 중심 블랙홀(태양의 4.3 × 10⁶배) <b>약 1.3 × 10¹⁰ m</b>(0.09 AU), M87 블랙홀(태양의 6.5 × 10⁹배) <b>약 1.9 × 10¹³ m</b>(약 130 AU)예요.',
        },
        {
          type: 'quiz', title: '블랙홀은 모든 것을 빨아들일까',
          goal: '"블랙홀은 주변의 모든 것을 빨아들이는 우주 청소기다"라는 말에 대해 알맞은 설명은?',
          setup() { setFlag('match', false); S.cp.i = 1; S.cp.s = 100; setScene('collapse'); },
          choices: ['맞아요. 블랙홀의 중력은 같은 질량의 별보다 훨씬 멀리까지 작용해요', '멀리서 보면 같은 질량의 별과 중력이 같아요. 지평선 가까이 다가가야 빠져나오지 못해요', '블랙홀은 중력이 없고 빛만 흡수하는 천체예요', '블랙홀은 질량이 없어서 아무것도 끌어당기지 않아요'],
          answer: 1,
          feedback: ['중력은 질량과 거리로 정해져요. 같은 질량이면 먼 곳에서의 중력은 같아요.', '', '블랙홀은 질량이 매우 커서 중력이 매우 강해요.', '블랙홀은 별이 압축된 것이라 질량이 그대로 있어요.'],
          explain: '블랙홀이 특별한 것은 <b>지평선 가까이</b>에서 탈출 속도가 c를 넘기 때문이에요. 멀리서는 같은 질량의 별과 중력이 똑같아요. 태양이 같은 질량의 블랙홀로 바뀌어도 지구는 지금처럼 태양 둘레를 돌아요.',
        },
      ],
    },
    {
      title: '시간 지연: GPS는 상대론으로 맞아요', short: '시간 지연', icon: '⏱️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>물리학에서</b> 빠르게 움직이는 시계가 느리게 간다는 시간 팽창(특수 상대론)을 배웠어요. 일반 상대론은 <b>중력이 강한 곳의 시계도 느리게 간다</b>고 말해요. 앞 단계의 블랙홀 곁에서 가장 크게 나타나요.</div>' +
        '<p>시계 두 개로 중력 시간 지연을 비교하고, <b>GPS 위성</b>의 시계 보정을 계산해요. 스마트폰 길 안내가 맞는 것은 상대론 덕분이에요! 계산은 주어진 값의 덧셈·곱셈 정도예요.</p>',
      features: ['dilate', 'gps'],
      setup() { S.dl.t = 36; S.dl.far = 0; S.dl.near = 0; S.gp.day = 1; S.gp.seen = {}; clr('iG1', 'iG2'); setFlag('gin', false); setScene('dilate'); },
      recap: '중력이 강한 곳의 시계는 느리게 가요. GPS 위성 시계는 중력 효과로 하루 +45.7 μs, 속도 효과로 −7.2 μs, 합쳐 약 +38 μs 빨라져서 보정하지 않으면 하루에 약 11 km씩 오차가 쌓여요.',
      summary: '<ul><li><b>중력 시간 지연</b>: 중력이 강한 곳(질량에 가까운 곳)에서 시계가 더 느리게 가요. 지표의 시계는 높은 곳의 시계보다 느려요.</li>' +
        '<li><b>GPS 위성</b>(고도 약 2.0 × 10⁴ km, 속력 3.9 km/s): 중력이 약한 곳이라 시계가 하루 <b>+45.7 μs</b> 빨라지고(일반 상대론), 빨리 움직여서 <b>−7.2 μs</b> 느려져요(특수 상대론). 합 <b>+38.5 μs/일</b>.</li>' +
        '<li>신호는 빛의 속력으로 오므로 보정하지 않으면 거리 오차 = c × 38.5 μs ≈ <b>11.6 km</b>가 하루에 쌓여요(이틀 약 23 km, 일주일 약 81 km). 그래서 위성 시계의 진동수를 약 4.5 × 10⁻¹⁰ 배 낮춰 올려 보내요.</li>' +
        '<li>실생활 사례: 내비게이션·스마트폰 위치, 원자시계의 정밀 측정(높이 차이에 따른 시간 차), 영화 〈인터스텔라〉의 블랙홀 곁 시간 지연(영화 설정).</li></ul>',
      missions: [
        {
          title: 'GPS 시계 보정량 계산하기', manual: true,
          goal: '위성 시계는 하루에 일반 상대론 효과로 <b>+45.7 μs</b>, 특수 상대론 효과로 <b>−7.2 μs</b> 어긋나요. 합(μs/일)과, 보정하지 않을 때 <b>하루</b>에 쌓이는 거리 오차(km, c = 3.0 × 10⁸ m/s)를 입력하세요.',
          hint: '합 = 45.7 − 7.2. 거리 오차 = c × (합 μs). 1 μs = 10⁻⁶ s이므로 3.0 × 10⁸ × 38.5 × 10⁻⁶ = 11550 m이고 km로 바꿔요.',
          setup() { clr('iG1', 'iG2'); setFlag('gin', true); S.gp.day = 1; setScene('gps'); },
          check() {
            const a = num('iG1'), b = num('iG2');
            if (a == null || b == null) return '두 칸에 모두 숫자를 입력해 주세요.';
            const ok1 = Math.abs(a - GPS_NET) <= 0.6, ok2 = Math.abs(b - 11.55) <= 0.6; fb([[$('#iG1'), ok1], [$('#iG2'), ok2]]);
            if (ok1 && ok2) return true;
            if (!ok1) { if (Math.abs(a - (GPS_G + GPS_V)) < 0.6) return '속도 효과(특수 상대론)는 시계를 느리게 해서 −7.2예요. 45.7 − 7.2를 계산해요.'; return '합 = (+45.7) + (−7.2)를 계산해요.'; }
            if (Math.abs(b - 11550) < 600) return '단위가 km예요. 11550 m는 약 11.6 km예요.';
            return '거리 오차 = c × 시간: 3.0 × 10⁸ m/s × (합 μs × 10⁻⁶ s)를 m로 구하고 km로 바꿔요.';
          },
          status: () => '입력 ' + ($('#iG1').value.trim() || '—') + ' μs, ' + ($('#iG2').value.trim() || '—') + ' km',
          explain: '합 = 45.7 + (−7.2) = <b>+38.5 μs/일(약 38 μs)</b>. 거리 오차 = c × 38.5 μs = 3.0 × 10⁸ × 3.85 × 10⁻⁵ ≈ <b>1.2 × 10⁴ m, 약 11.6 km</b>(하루). 보정 없이는 위치가 하루에 약 11 km씩 어긋나요.',
        },
        {
          title: '보정하지 않으면 지도에서 얼마나 어긋날까',
          goal: '<b>🛰️ GPS 보정</b>에서 보정하지 않았을 때 <b>하루·이틀·일주일</b> 뒤의 위치 오차를 지도에서 모두 확인하세요.',
          hint: '하루, 이틀, 일주일 버튼을 차례로 눌러 보세요. 오차는 날짜에 비례해 쌓여요.',
          setup() { setFlag('gin', false); S.gp.day = 1; S.gp.seen = {}; setScene('gps'); },
          check: () => !!(S.gp.seen[1] && S.gp.seen[2] && S.gp.seen[7]),
          hold: 0.4,
          status: () => mark(S.gp.seen[1]) + ' 하루 &nbsp; ' + mark(S.gp.seen[2]) + ' 이틀 &nbsp; ' + mark(S.gp.seen[7]) + ' 일주일',
          explain: '오차는 날짜에 비례해요: 하루 약 <b>11.6 km</b>, 이틀 약 <b>23.1 km</b>, 일주일 약 <b>80.9 km</b>. 그래서 GPS 위성의 시계는 일반 상대론과 특수 상대론 효과를 미리 고려해 맞춰 올려요.',
        },
        {
          type: 'quiz', title: 'GPS 위성 시계는 왜 앞서 갈까',
          goal: '지상보다 하루에 약 38 μs 앞서 가는 GPS 위성 시계에 대해 알맞은 설명은?',
          setup() { setFlag('gin', false); setScene('gps'); },
          choices: ['중력이 약한 높은 곳이라 빨라지고(+), 빠른 속력 때문에 느려지는(−) 효과가 있는데 중력 효과가 더 커서 합쳐서 빨라져요', '빠른 속력 때문에 빨라지고(+), 중력 때문에 느려지는(−) 효과가 있어서 합쳐서 빨라져요', '위성에는 공기가 없어서 시계가 빨리 가요', '중력 효과와 속력 효과가 모두 시계를 빠르게 해요'],
          answer: 0,
          feedback: ['', '방향이 반대예요. 속력이 빠르면 시계가 느려지고(특수 상대론), 중력이 약하면 빨라져요(일반 상대론).', '시계의 빠르기는 공기와 관계없어요.', '속력 효과는 느려지는 쪽(−7.2 μs/일)이에요.'],
          explain: '위성은 중력이 약한 곳에 있어 시계가 하루 <b>+45.7 μs</b> 빨라지고(일반 상대론), 빠르게 움직여 <b>−7.2 μs</b> 느려져요(특수 상대론). 합쳐서 <b>+38.5 μs</b>가 빨라요. 이 보정 덕분에 길 안내가 정확해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-general-relativity', mount: '#game', badge: '상대론 박사', homeHref: '../../index.html#hm',
    featureLabels: { equiv: '🛗 지표의 방과 가속하는 방 · 등가 원리', laser: '🔦 가속하는 방에서 휘는 빛', sheet: '🕸️ 고무막 시공간 모형', eclipse: '🌑 1919년 일식과 별빛의 휨', collapse: '⚫ 압축과 사건의 지평선', dilate: '⏱️ 중력 시간 지연 시계', gps: '🛰️ GPS 시간 보정' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  S.lz.p = 1;
  setScene('equiv');
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    eqStep(dt); lzStep(dt); shStep(dt); dlStep(dt); gpStep(dt);
    if (S.mode === 'gps' && !showCalc('gin')) S.gp.seen[S.gp.day] = true;
    switch (S.mode) {
      case 'equiv': drawEquiv(dt); break;
      case 'laser': drawLaser(dt); break;
      case 'sheet': drawSheet(dt); break;
      case 'eclipse': drawEclipse(dt); break;
      case 'collapse': drawCollapse(dt); break;
      case 'dilate': drawDilate(dt); break;
      default: drawGps(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, eqRelease, lzFire, shLaunch, cpR, CPB, RS, dlR, dlRate, GPS_ERR1,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { eqStep(0.02); lzStep(0.02); shStep(0.02); dlStep(0.02); gpStep(0.02); } },
  };
})();
