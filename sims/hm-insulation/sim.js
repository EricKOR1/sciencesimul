/* =========================================================
   역학과 에너지 Ⅱ. 열과 에너지 - 단열과 열팽창 (1차시)
   성취기준 [12역학02-01] 건축을 포함한 다양한 열에너지 관련 기술에 단열, 열팽창 등이 활용된 예를 조사함으로써 과학의 유용성에 대한 가치를 인식할 수 있다.
   ① 관찰: 열의 이동 (유체에서도 전도·대류·복사, 열화상 모드)
   ② 실험: 단열재 비교 (보온·보냉, 단열재 단면)
   ③ 분석: 건축 단열 (벽 P = AΔT/Σ(L/k), 창 P = UAΔT, 공기층 대류 한계)
   ④ 적용: 열팽창과 설계 (ΔL = αLΔT, 레일·다리·바이메탈, 단열 집 설계)
   비교용 간단한 식만 써요. 비정상 열전도 방정식, 복사 슈테판-볼츠만 식, 대류 열전달 계수, 습도·결로 계산은 다루지 않아요.
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
  function lines(x, y, lh, fs, arr) {
    let yy = y;
    arr.forEach((l) => { const n = wrapL(l[0], x, yy, PX + PW - 14 - x, lh, fs, l[1] || '#26324a'); yy += n * lh; });
  }
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


  function axes(rc, o) {
    const ml = PHONE ? 40 : 46, mr = 12, mt = 30, mb = 28;
    const ix = rc.x + ml, iy = rc.y + mt, iw = rc.w - ml - mr, ih = rc.h - mt - mb;
    card(rc.x, rc.y, rc.w, rc.h);
    const gx = (xv) => ix + iw * (xv - o.xmin) / (o.xmax - o.xmin), gy = (yv) => iy + ih - ih * (yv - o.ymin) / (o.ymax - o.ymin);
    for (let yv = o.ymin; yv <= o.ymax + 1e-9; yv += o.ystep) {
      const z = Math.abs(yv - o.ymin) < 1e-9;
      ctx.strokeStyle = z ? '#516079' : 'rgba(120,135,160,.25)'; ctx.lineWidth = z ? 2 : 1; ctx.beginPath(); ctx.moveTo(ix, gy(yv)); ctx.lineTo(ix + iw, gy(yv)); ctx.stroke();
      T(ix - 6, gy(yv) + 5, String(+yv.toFixed(2)), 13, '#3a465c', 'right', 800);
    }
    for (let xv = o.xmin; xv <= o.xmax + 1e-9; xv += o.xstep) {
      ctx.strokeStyle = 'rgba(120,135,160,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(xv), iy); ctx.lineTo(gx(xv), iy + ih); ctx.stroke();
      T(gx(xv), iy + ih + 17, String(+xv.toFixed(2)), 13, '#3a465c', 'center', 800);
    }
    T(rc.x + 10, rc.y + 21, o.title, 13.5, '#26324a', 'left', 800);
    return { gx, gy, ix, iy, iw, ih };
  }
  function vbar(x, y, w, h, val, max, color) {   // y = 맨 위, 아래에서부터 채워요
    D.roundRect(x, y, w, h, Math.min(6, w / 2)); ctx.fillStyle = '#e4eaf5'; ctx.fill();
    const f = clamp(val / max, 0, 1) * h;
    if (f > 0.5) { ctx.save(); D.roundRect(x, y, w, h, Math.min(6, w / 2)); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x, y + h - f, w, f); ctx.restore(); }
  }
  /* 열화상 색 (0 = 차가움 … 1 = 뜨거움) */
  const HEAT = [[0, [43, 83, 230]], [0.25, [40, 190, 230]], [0.5, [60, 200, 90]], [0.75, [250, 210, 40]], [1, [235, 50, 40]]];
  function heatColor(f, a) {
    f = clamp(f, 0, 1); let i = 0; while (i < HEAT.length - 2 && f > HEAT[i + 1][0]) i++;
    const p = HEAT[i], q = HEAT[i + 1], u = (f - p[0]) / (q[0] - p[0]);
    return 'rgba(' + Math.round(p[1][0] + (q[1][0] - p[1][0]) * u) + ',' + Math.round(p[1][1] + (q[1][1] - p[1][1]) * u) + ',' + Math.round(p[1][2] + (q[1][2] - p[1][2]) * u) + ',' + (a == null ? 1 : a) + ')';
  }

  /* ================= 상수·상태 ================= */
  const BLUE = '#2563eb', RED = '#e2464b', GREEN = '#14a058', ORANGE = '#f59e0b', PURPLE = '#7c3aed';
  const f1 = (x) => (x + 1e-9).toFixed(1);
  const KTAB = [['구리', 400], ['철', 80], ['콘크리트', 1.4], ['유리', 1.0], ['물', 0.6], ['나무', 0.15], ['유리솜', 0.04], ['스티로폼', 0.035], ['공기', 0.026]];
  // 단열 실험 자료 (80 °C 물 200 mL, 20분 후 온도 / 얼음 100 g, 30분 후 녹은 질량)
  const MAT = [
    { n: '없음', col: '#64748b', T20: 51, melt: 62 },
    { n: '포일', col: '#94a3b8', T20: 56, melt: 50 },
    { n: '신문지', col: '#c2a15c', T20: 62, melt: 38 },
    { n: '스티로폼', col: '#2563eb', T20: 69, melt: 22 },
    { n: '유리솜', col: '#e0a100', T20: 70, melt: 20 },
    { n: '보온병', col: '#14a058', T20: 77, melt: null },
  ];
  MAT.forEach((m) => { m.tau = 20 / Math.log(60 / (m.T20 - 20)); });          // T(t) = 20 + 60 e^(-t/τ)
  const hotT = (m, t) => 20 + 60 * Math.exp(-t / m.tau);
  const meltM = (m, t) => m.melt * t / 30;
  const R_CONC = 0.2 / 1.4, K_INS = 0.035;                                       // 콘크리트 20 cm: L/k, 스티로폼 k
  const A_WALL = 10, DT = 20;
  const wallP = (cm) => A_WALL * DT / (R_CONC + (cm / 100) / K_INS);
  const WINS = [{ n: '홑유리', U: 5.8 }, { n: '이중 유리', U: 2.8 }, { n: '로이 이중', U: 1.4 }, { n: '삼중 유리', U: 0.8 }];
  const winP = (u) => u * 2 * DT;
  const AL = [{ n: '철·강철', a: 1.2 }, { n: '알루미늄', a: 2.3 }, { n: '구리', a: 1.7 }, { n: '콘크리트', a: 1.0 }, { n: '유리', a: 0.9 }];
  const dL = (a, L, dT) => a * 1e-5 * L * dT;                                    // m

  const S = {
    mode: 'cond', clock: 0, fade: 0, thermal: false,
    sc: { cond: { run: false, t: 0, done: false }, conv: { run: false, t: 0, done: false }, rad: { run: false, t: 0, done: false, sh: 'none' } },
    judged: { cond: false, conv: false, rad: false },
    cn: { mode: 'hot', t: 0, run: false, done: { hot: false, cold: false }, mag: 3, same: 0, steam: 0 },
    ordC: [2, 5, 0, 4, 1, 3], ordBadC: {},
    wl: { t: 0, place: 'out', gap: 1.0 },
    wn: { sel: 1, seenGap: false },
    ex: { mat: 0, app: 'rail', T: -15, seen: {} },
    hs: { ins: 0, win: 0, eave: 0 },
    flags: { rank: false, win: false, ex: false },
    wallOk: { half: false, tenth: false },
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const eff = showCalc;
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const MODES = ['cond', 'conv', 'rad', 'cans', 'wall', 'window', 'expand', 'house'];
  const ALLOWED = [['cond', 'conv', 'rad'], ['cans'], ['wall', 'window'], ['expand', 'house']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode; updateCtl();
  }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };

  /* ================= ① 열의 이동 ================= */
  const RUN_SEC = 8;
  function scRun(k) { const s = S.sc[k]; if (s.run) return; s.run = true; s.t = 0; s.done = false; if (k === 'conv') convInit(); Sound.click(); updateCtl(); }
  function scReset(k) { const s = S.sc[k]; s.run = false; s.t = 0; s.done = false; parts.clear(); updateCtl(); }
  function scStep(dt) {
    ['cond', 'conv', 'rad'].forEach((k) => { const s = S.sc[k]; if (s.run) { s.t += dt; if (s.t >= RUN_SEC) { s.t = RUN_SEC; s.run = false; s.done = true; updateCtl(); } } });
  }
  const ANS = { cond: 0, conv: 1, rad: 2 };
  function judge(k, v) {
    const s = S.sc[k];
    if (!s.done) { showHint('먼저 ▶ 실행으로 장면을 끝까지 보고 골라 주세요.', 2800); return; }
    if (v === ANS[k]) { S.judged[k] = true; Sound.click(); parts.burst(PHONE ? 240 : 300, 150, { count: 18, speed: 120, size: 3, colors: ['#ffd447', '#fff', '#7ee8a4'], gravity: 40, life: 0.8 }); }
    else showHint(k === 'cond' ? '물이 움직이지 않고 이웃한 분자끼리 열을 건네는 방식이에요.' : k === 'conv' ? '물질(물, 공기)이 직접 움직여 열을 날라요.' : '사이에 아무것도 없어도(햇빛처럼) 열이 전달돼요.', 3600);
    updateCtl();
  }
  /* ----- 전도 ----- */
  function drawCond(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), s = S.sc.cond, u = clamp(s.t / RUN_SEC, 0, 1), th = S.thermal;
    const Ttop = 20 + 80 * Math.min(1, u / 0.5), Tbot = 2 + 1.5 * u, boil = Ttop >= 99.9;
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    const bg = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); bg.addColorStop(0, '#f4f7fd'); bg.addColorStop(1, '#e2e9f6'); ctx.fillStyle = bg; ctx.fillRect(c.x, c.y, c.w, c.h);
    const tx = c.x + (PHONE ? 150 : 170), ty = c.y + 44, tw = 46, tl = c.h - 74;
    // 시험관
    ctx.save(); ctx.beginPath(); ctx.moveTo(tx - tw / 2, ty); ctx.lineTo(tx - tw / 2, ty + tl - tw / 2); ctx.arc(tx, ty + tl - tw / 2, tw / 2, Math.PI, 0, true); ctx.lineTo(tx + tw / 2, ty); ctx.closePath(); ctx.clip();
    const wy = ty + 14;
    if (th) {
      const g = ctx.createLinearGradient(0, wy, 0, ty + tl);
      for (let i = 0; i <= 10; i++) { const d = i / 10, T0 = Tbot + (Ttop - Tbot) * Math.exp(-d / 0.16); g.addColorStop(d, heatColor((T0 - 0) / 100)); }
      ctx.fillStyle = g;
    } else { const g = ctx.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0); g.addColorStop(0, 'rgba(120,190,255,.85)'); g.addColorStop(1, 'rgba(70,150,235,.9)'); ctx.fillStyle = g; }
    ctx.fillRect(tx - tw / 2, wy, tw, ty + tl - wy);
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx - tw / 2, ty); ctx.lineTo(tx - tw / 2, ty + tl - tw / 2); ctx.arc(tx, ty + tl - tw / 2, tw / 2, Math.PI, 0, true); ctx.lineTo(tx + tw / 2, ty); ctx.stroke();
    // 얼음 (그물로 눌러 둠)
    D.roundRect(tx - 15, ty + tl - tw / 2 - 28, 30, 26, 6); ctx.fillStyle = 'rgba(230,248,255,.95)'; ctx.fill(); ctx.strokeStyle = '#7cc4ff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(tx - tw / 2 + 2, ty + tl - tw / 2 - 31); ctx.lineTo(tx + tw / 2 - 2, ty + tl - tw / 2 - 31); ctx.stroke(); ctx.setLineDash([]);
    T(tx + tw / 2 + 10, ty + tl - tw / 2 - 12, '얼음', 13.5, '#1d4ed8', 'left', 800);
    // 끓는 거품
    if (boil && !RM) { if (Math.random() < 0.35) parts.emit({ x: tx + (Math.random() - 0.5) * (tw - 14), y: wy + 36 + Math.random() * 26, vx: 0, vy: -30 - Math.random() * 30, life: 0.7, size: 2.5 + Math.random() * 2.2, color: 'rgba(255,255,255,.9)', gravity: 0, shape: 'bubble', fade: true }); }
    // 알코올램프 불꽃 (윗부분을 가열)
    ctx.save(); ctx.translate(tx - 78, ty + 62); ctx.rotate(Math.PI / 2); D.flame(0, 0, 54, S.clock); ctx.restore();
    D.roundRect(tx - 128, ty + 54, 38, 56, 6); ctx.fillStyle = '#6b7a90'; ctx.fill(); T(tx - 109, ty + 130, '램프', 13, '#516079', 'center', 700);
    // 온도계 읽기
    D.label(tx + tw / 2 + 52, ty + 40, '위 ' + Math.round(Ttop) + ' °C', { bg: Ttop > 60 ? RED : '#64748b', size: 13, pad: 8 });
    D.label(tx + tw / 2 + 56, ty + tl - 60, '아래 ' + Math.round(Tbot) + ' °C', { bg: '#2563eb', size: 13, pad: 8 });
    // 열이 내려가는 길 (희미한 화살표)
    D.arrow(tx + tw / 2 + 20, ty + 70, tx + tw / 2 + 20, ty + 70 + 90, { color: 'rgba(226,70,75,.5)', width: 3, head: 9, dash: [5, 4] });
    T(tx + tw / 2 + 30, ty + 125, '전도: 아주 느려요', 13, '#b91c1c', 'left', 800);
    parts.update(dt); parts.draw(ctx);
    // 오른쪽: 열전도율 k 비교 (로그 눈금)
    if (!PHONE) {
      const x0 = c.x + 380, w0 = c.w - 380 - 14;
      T(x0, c.y + 28, '열전도율 k (W/m·K) — 클수록 열을 잘 전도해요', 14, '#26324a', 'left', 800);
      KTAB.forEach((q, i) => {
        const yy = c.y + 46 + i * 31, f = (Math.log10(q[1]) + 2) / 4.7;
        T(x0, yy + 16, q[0], 13.5, q[0] === '물' ? '#b45309' : '#26324a', 'left', 800);
        D.roundRect(x0 + 62, yy + 3, w0 - 120, 17, 8); ctx.fillStyle = '#e4eaf5'; ctx.fill();
        ctx.save(); D.roundRect(x0 + 62, yy + 3, w0 - 120, 17, 8); ctx.clip(); ctx.fillStyle = q[0] === '물' ? ORANGE : (q[1] < 0.1 ? '#14a058' : '#3b82f6'); ctx.fillRect(x0 + 62, yy + 3, (w0 - 120) * clamp(f, 0, 1), 17); ctx.restore();
        T(x0 + w0 - 52, yy + 16, String(q[1]), 13.5, '#26324a', 'left', 800);
      });
      T(x0, c.y + c.h - 12, '(막대는 로그 눈금이에요)', 13, '#5a6679', 'left', 700);
    }
    T(c.x + 12, c.y + 24, '시험관 윗부분만 가열해요', PHONE ? 13 : 14, '#26324a', 'left', 800);
    T(c.x + 12, c.y + 44, s.t > 0 || s.done ? ('경과 ' + Math.round(u * 10) + '분') : '▶ 실행을 눌러요', 13.5, '#c2410c', 'left', 800);
    ctx.restore();
    panelText('cond');
  }
  /* ----- 대류 ----- */
  let convP = [];
  function convInit() {
    convP = [];
    for (let i = 0; i < 70; i++) convP.push({ x: Math.random(), y: Math.random(), k: i % 2 });
  }
  convInit();
  function convVel(x, y) { return { u: Math.sin(Math.PI * x) * Math.cos(Math.PI * y), v: -Math.cos(Math.PI * x) * Math.sin(Math.PI * y) }; }
  function drawConv(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), s = S.sc.conv, th = S.thermal, active = s.run || s.done;
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    const bg = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); bg.addColorStop(0, '#f4f7fd'); bg.addColorStop(1, '#e2e9f6'); ctx.fillStyle = bg; ctx.fillRect(c.x, c.y, c.w, c.h);
    const half = PHONE ? c.w : c.w / 2;
    // 비커 (왼쪽 아래 가열)
    const bw = PHONE ? 150 : 200, bh = PHONE ? 150 : 190, bx = c.x + (PHONE ? 20 : 40), by = c.y + 66, intensity = clamp(s.t / 2.5, 0, 1) * (active ? 1 : 0);
    const roomX = PHONE ? c.x + 200 : c.x + half + 30, roomW = PHONE ? c.w - 210 : half - 60, roomH = bh, roomY = by;
    const drawField = (x, y, w, h, nP, mode) => {
      convP.forEach((p, i) => {
        if (i >= nP) return;
        if (active) {
          const v = convVel(p.x, p.y), sp = 0.5 * (s.run ? 1 : 0.0) * intensity;
          p.x += v.u * sp * dt; p.y += v.v * sp * dt;
          if (p.x < 0.02 || p.x > 0.98 || p.y < 0.02 || p.y > 0.98) { p.x = 0.08 + Math.random() * 0.84; p.y = 0.08 + Math.random() * 0.84; }
        }
        const px = x + p.x * w, py = y + p.y * h;
        const warm = mode === 'beaker' ? clamp(1 - Math.abs(p.x - 0.12) * 2.2 - (1 - p.y) * 0.6 + intensity * 0.3, 0, 1) : clamp(0.75 - p.y * 0.8 + (1 - p.x) * 0.25, 0, 1);
        const wcol = th ? heatColor(0.15 + warm * 0.8, 0.9) : (mode === 'beaker' ? 'rgba(160,50,200,' + (0.35 + 0.55 * (1 - warm)) + ')' : 'rgba(' + Math.round(70 + 170 * warm) + ',' + Math.round(130 - 40 * warm) + ',' + Math.round(220 - 170 * warm) + ',.85)');
        ctx.fillStyle = wcol; ctx.beginPath(); ctx.arc(px, py, mode === 'beaker' ? 3.2 : 2.6, 0, TAU); ctx.fill();
      });
    };
    // 비커
    ctx.save(); D.roundRect(bx, by, bw, bh, 12); ctx.clip();
    ctx.fillStyle = th ? heatColor(0.2 + intensity * 0.15, 0.55) : 'rgba(150,205,255,.55)'; ctx.fillRect(bx, by, bw, bh);
    if (th) { const hg = ctx.createRadialGradient(bx + bw * 0.15, by + bh, 4, bx + bw * 0.15, by + bh, bh * 0.9); hg.addColorStop(0, heatColor(0.95, 0.8 * intensity)); hg.addColorStop(1, heatColor(0.3, 0)); ctx.fillStyle = hg; ctx.fillRect(bx, by, bw, bh); }
    drawField(bx, by, bw, bh, 70, 'beaker');
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; D.roundRect(bx, by, bw, bh, 12); ctx.stroke();
    // 색소 알갱이 + 불꽃
    D.sphere(bx + bw * 0.12, by + bh - 8, 6, '#7c3aed', { gloss: false });
    D.flame(bx + bw * 0.12, by + bh + 38, 40, S.clock, { }); ctx.fillStyle = '#6b7a90'; D.roundRect(bx + bw * 0.12 - 20, by + bh + 38, 40, 14, 4); ctx.fill();
    if (active) { D.arrow(bx + bw * 0.12, by + bh * 0.7, bx + bw * 0.12, by + bh * 0.3, { color: 'rgba(226,70,75,.8)', width: 4, head: 11 }); D.arrow(bx + bw * 0.86, by + bh * 0.3, bx + bw * 0.86, by + bh * 0.7, { color: 'rgba(37,99,235,.8)', width: 4, head: 11 }); }
    T(bx + bw / 2, by - 12, '아랫부분을 가열한 물 (색소)', 13.5, '#26324a', 'center', 800);
    // 방
    ctx.fillStyle = th ? heatColor(0.45, 0.35) : '#fff7e6'; D.roundRect(roomX, roomY, roomW, roomH, 8); ctx.fill();
    if (th) { const wg = ctx.createLinearGradient(0, roomY, 0, roomY + roomH); wg.addColorStop(0, heatColor(0.78, 0.55)); wg.addColorStop(1, heatColor(0.25, 0.55)); ctx.fillStyle = wg; D.roundRect(roomX, roomY, roomW, roomH, 8); ctx.fill(); }
    ctx.save(); D.roundRect(roomX, roomY, roomW, roomH, 8); ctx.clip(); drawField(roomX, roomY, roomW, roomH, 60, 'room'); ctx.restore();
    ctx.strokeStyle = '#7b869a'; ctx.lineWidth = 3; D.roundRect(roomX, roomY, roomW, roomH, 8); ctx.stroke();
    D.roundRect(roomX + 6, roomY + roomH - 20, 36, 16, 3); ctx.fillStyle = '#e2464b'; ctx.fill(); T(roomX + 24, roomY + roomH + 14, '난방기', 13, '#b91c1c', 'center', 800);
    D.roundRect(roomX + roomW - 52, roomY + 6, 46, 14, 3); ctx.fillStyle = '#38bdf8'; ctx.fill(); T(roomX + roomW - 29, roomY - 6, '에어컨', 13, '#0369a1', 'center', 800);
    T(roomX + roomW / 2, roomY - 24, '방 안 공기', 13.5, '#26324a', 'center', 800);
    T(c.x + 12, c.y + 24, '대류: 더운 쪽은 올라가고 찬 쪽은 내려와요', PHONE ? 13 : 14, '#26324a', 'left', 800);
    T(c.x + 12, c.y + 44, active ? '' : '▶ 실행을 눌러요', 13.5, '#c2410c', 'left', 800);
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    panelText('conv');
  }
  /* ----- 복사 ----- */
  const RAD_RATE = { none: 1, glass: 0.82, foil: 0.04 };
  function radT(sh, u) { return 20 + 40 * RAD_RATE[sh] * (1 - Math.exp(-3.2 * u)); }
  function drawRad(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), s = S.sc.rad, th = S.thermal, u = clamp(s.t / RUN_SEC, 0, 1), sh = s.sh;
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    const bg = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); bg.addColorStop(0, '#9fd4ff'); bg.addColorStop(1, '#e3f3ff'); ctx.fillStyle = bg; ctx.fillRect(c.x, c.y, c.w, c.h);
    const sx = c.x + 62, sy = c.y + c.h * 0.4, px = c.x + c.w - (PHONE ? 70 : 150), shx = c.x + c.w * 0.5;
    D.glow(sx, sy, 90, '#fff3b0', 0.8); D.sphere(sx, sy, 30, '#ffd447', { gloss: false, light: '#fff6c2', dark: '#ffa400' }); T(sx, sy + 56, '햇빛', 13.5, '#7c4a00', 'center', 800);
    // 차단판
    if (sh === 'glass') { ctx.fillStyle = 'rgba(120,190,255,.35)'; ctx.fillRect(shx - 6, c.y + 50, 12, c.h - 110); ctx.strokeStyle = '#4b9be8'; ctx.lineWidth = 2; ctx.strokeRect(shx - 6, c.y + 50, 12, c.h - 110); T(shx, c.y + 44, '투명 유리', 13, '#1d4ed8', 'center', 800); }
    if (sh === 'foil') { const g = ctx.createLinearGradient(shx - 6, 0, shx + 6, 0); g.addColorStop(0, '#f4f6fa'); g.addColorStop(0.5, '#aeb7c6'); g.addColorStop(1, '#eef1f6'); ctx.fillStyle = g; ctx.fillRect(shx - 6, c.y + 50, 12, c.h - 110); T(shx, c.y + 44, '은박 판', 13, '#475569', 'center', 800); }
    // 복사선 (파동 화살표)
    const run = s.run || s.done;
    for (let i = 0; i < 5; i++) {
      const y0 = c.y + 62 + i * ((c.h - 150) / 4), ph = (S.clock * 90 + i * 17) % 100;
      ctx.strokeStyle = 'rgba(255,160,40,.85)'; ctx.lineWidth = 2.5; ctx.beginPath();
      const xEnd = sh === 'none' ? px - 28 : (sh === 'glass' ? px - 28 : shx - 8);
      for (let x = sx + 36; x <= xEnd; x += 3) { const yy = y0 + Math.sin((x - sx) / 9 - S.clock * 8) * 5, a = sh === 'glass' && x > shx ? 0.7 : 1; i === 0 && x === sx + 36 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
      if (run || true) ctx.stroke();
      if (sh === 'foil') { ctx.strokeStyle = 'rgba(255,160,40,.5)'; ctx.beginPath(); for (let x = shx - 8; x >= shx - 70; x -= 3) { const yy = y0 + Math.sin((x - shx) / 9 + S.clock * 8) * 5; x === shx - 8 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke(); }
    }
    if (sh === 'foil') T(shx - 40, c.y + c.h - 52, '반사돼요', 13, '#b45309', 'center', 800);
    // 검은 판과 온도계
    const Tn = radT(sh, run ? u : 0);
    const pw = 34, ph2 = c.h - 150, py0 = c.y + 62 - 10;
    ctx.fillStyle = th ? heatColor((Tn - 15) / 50) : '#334155'; D.roundRect(px - pw / 2, py0, pw, ph2, 6); ctx.fill();
    T(px, py0 + ph2 + 20, '검은 판', 13, '#26324a', 'center', 800);
    D.label(px + (PHONE ? -4 : 62), py0 + 24, Math.round(Tn) + ' °C', { bg: Tn > 40 ? RED : '#64748b', size: 13, pad: 8, align: PHONE ? 'right' : 'center' });
    // 사이 공기/진공 알림
    T(c.x + c.w / 2, c.y + c.h - 14, '햇빛은 공기가 없는 우주 공간도 지나 지구까지 와요', PHONE ? 13 : 13.5, '#26324a', 'center', 800);
    T(c.x + 12, c.y + 24, '복사: 사이에 물질이 없어도 열이 전달돼요', PHONE ? 13 : 14, '#26324a', 'left', 800);
    ctx.restore();
    panelText('rad');
  }
  /* ----- 아래 패널 (세 장면 공통: 판정표) ----- */
  function panelText(k) {
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, fs = PHONE ? 13 : 14.5, lh = PHONE ? 23 : 28;
    T(x0, PY + 28, '🧾 열 전달 판정표', 15, '#26324a', 'left', 800);
    const rows = [['cond', '물속 전도', '시험관 윗부분 가열', '전도'], ['conv', '대류', '비커·방 안 공기', '대류'], ['rad', '복사', '햇빛·유리·은박', '복사']];
    rows.forEach((r, i) => {
      const yy = PY + 58 + i * (PHONE ? 30 : 34), ok = S.judged[r[0]], cur = r[0] === k;
      if (cur) { ctx.fillStyle = 'rgba(245,158,11,.14)'; D.roundRect(x0 - 8, yy - 20, PW - 16, 28, 8); ctx.fill(); }
      T(x0, yy, (PHONE ? '' : '장면 ' + (i + 1) + ': ') + r[2], PHONE ? 13 : 14, '#26324a', 'left', 800);
      T(x0 + (PHONE ? 210 : 320), yy, ok ? '✅ ' + r[3] : '⬜ ?', 14, ok ? '#14753f' : '#9aa6bd', 'left', 800);
    });
    const ty = PY + 58 + 3 * (PHONE ? 30 : 34) + 16;
    const notes = {
      cond: [['물은 전도로 열을 거의 전달하지 못해요 (k = 0.6). 윗물이 끓어도 아래 얼음은 그대로예요.', '#26324a'], ['유체에서도 전도는 일어나지만 아주 느려요. 더운 물은 가벼워서 위에 머물러 대류도 못 일어나요.', '#5a6679']],
      conv: [['더워진 물·공기는 팽창해 가벼워져서 올라가고, 식어 무거워진 쪽은 내려와 순환해요.', '#26324a'], ['난방기는 아래에, 에어컨은 위에 두는 까닭이에요. 대류는 액체·기체(유체)에서만 일어나요.', '#5a6679']],
      rad: [['복사는 열이 전자기파로 직접 전달돼요. 햇빛은 진공을 지나 유리를 통과해요.', '#26324a'], ['은박은 복사를 반사해 열을 막아요. 그래서 보온병 안쪽에 은도금을 해요.', '#5a6679']],
    };
    lines(x0, ty, lh - 2, fs - 0.5, notes[k]);
  }

  /* ================= ② 단열재 비교 ================= */
  const CN_T = { hot: 20, cold: 30 };               // 실험 시간(분)
  const CN_SEC = 9;                                // 가속된 실험 시간(초)
  function cnRun() { const c = S.cn; if (c.run) return; c.t = 0; c.run = true; Sound.click(); updateCtl(); }
  function cnReset() { const c = S.cn; c.run = false; c.t = 0; parts.clear(); updateCtl(); }
  function cnStep(dt) {
    const c = S.cn; if (!c.run) return;
    c.t += dt * CN_T[c.mode] / CN_SEC;
    if (c.t >= CN_T[c.mode]) { c.t = CN_T[c.mode]; c.run = false; c.done[c.mode] = true; Sound.click(); updateCtl(); }
  }
  function matsOf() { return S.cn.mode === 'cold' ? MAT.slice(0, 5) : MAT; }
  function drawCan(x, yb, w, h, k, tNow, cold) {
    const ins = [0, 4, 10, 16, 18, 8][k], ow = w + ins * 2, oh = h + ins * 2 - (k === 5 ? 0 : 0);
    ctx.save();
    // 단열재 겉면
    if (k > 0) {
      D.roundRect(x - ow / 2, yb - oh, ow, oh, k === 5 ? 14 : 8);
      if (k === 1) { const g = ctx.createLinearGradient(x - ow / 2, 0, x + ow / 2, 0); g.addColorStop(0, '#eef1f6'); g.addColorStop(0.35, '#b8c0cd'); g.addColorStop(0.7, '#f4f6fa'); g.addColorStop(1, '#a3adbd'); ctx.fillStyle = g; }
      else if (k === 2) ctx.fillStyle = '#e9dfc4';
      else if (k === 3) ctx.fillStyle = '#fdfdfd';
      else if (k === 4) ctx.fillStyle = '#f2d36b';
      else { const g = ctx.createLinearGradient(x - ow / 2, 0, x + ow / 2, 0); g.addColorStop(0, '#5b6b82'); g.addColorStop(0.3, '#cfd8e6'); g.addColorStop(0.6, '#8794ab'); g.addColorStop(1, '#4a5972'); ctx.fillStyle = g; }
      ctx.fill(); ctx.strokeStyle = '#7b869a'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); D.roundRect(x - ow / 2, yb - oh, ow, oh, k === 5 ? 14 : 8); ctx.clip();
      if (k === 2) { ctx.fillStyle = 'rgba(70,60,40,.35)'; for (let i = 0; i < 9; i++) { ctx.fillRect(x - ow / 2 + 3, yb - oh + 8 + i * (oh / 9), ow - 6, 2); } }
      if (k === 3) { ctx.fillStyle = 'rgba(160,180,210,.5)'; for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(x - ow / 2 + 4 + ((i * 37) % (ow - 8)), yb - oh + 6 + ((i * 53) % (oh - 12)), 2.4, 0, TAU); ctx.fill(); } }
      if (k === 4) { ctx.strokeStyle = 'rgba(190,140,20,.5)'; ctx.lineWidth = 1.2; for (let i = 0; i < 18; i++) { const yy = yb - oh + 6 + ((i * 29) % (oh - 12)), xx = x - ow / 2 + ((i * 17) % (ow - 10)); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 10, yy + 6); ctx.stroke(); } }
      ctx.restore();
      if (k === 5) { D.roundRect(x - w / 2 - 1, yb - oh - 10, w + 2, 12, 4); ctx.fillStyle = '#3b4a68'; ctx.fill(); }
    }
    // 캔
    D.roundRect(x - w / 2, yb - h - (k === 5 ? 0 : 0), w, h, 6);
    const frac = cold ? 0.5 : clamp((tNow - 20) / 60, 0, 1);
    const g2 = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g2.addColorStop(0, '#dfe5ee'); g2.addColorStop(1, '#aab5c6'); ctx.fillStyle = g2; ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.stroke();
    if (S.thermal) { ctx.save(); D.roundRect(x - w / 2, yb - h, w, h, 6); ctx.clip(); ctx.fillStyle = heatColor(cold ? 0.05 + (1 - frac) * 0.02 : frac, 0.85); ctx.fillRect(x - w / 2, yb - h, w, h); ctx.restore(); }
    else if (!cold) { ctx.save(); D.roundRect(x - w / 2, yb - h, w, h, 6); ctx.clip(); ctx.fillStyle = 'rgba(255,90,60,' + (0.12 + 0.5 * frac) + ')'; ctx.fillRect(x - w / 2, yb - h, w, h); ctx.restore(); }
    else { ctx.save(); D.roundRect(x - w / 2, yb - h, w, h, 6); ctx.clip(); ctx.fillStyle = 'rgba(200,235,255,.7)'; ctx.fillRect(x - w / 2, yb - h, w, h); ctx.restore(); }
    ctx.restore();
  }
  function drawCans(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), cn = S.cn, cold = cn.mode === 'cold', mats = matsOf(), n = mats.length;
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    const bg = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); bg.addColorStop(0, '#f4f7fd'); bg.addColorStop(1, '#dde5f3'); ctx.fillStyle = bg; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = '#c8d1e0'; ctx.fillRect(c.x, c.y + c.h - 78, c.w, 4);
    const slot = c.w / 6, cw = PHONE ? 34 : 58, ch = PHONE ? 76 : 104, yb = c.y + c.h - 80;
    mats.forEach((m, i) => {
      const x = c.x + slot * (i + 0.5) + (cold ? slot * 0.5 : 0), tNow = cold ? 0 : hotT(m, cn.t);
      drawCan(x, yb, cw, ch, i, tNow, cold);
      // 김 (뜨거울 때)
      if (!cold && tNow > 55 && !RM && Math.random() < 0.12) parts.emit({ x: x + (Math.random() - 0.5) * cw * 0.5, y: yb - ch - 18 + (i === 5 ? 0 : 0), vx: (Math.random() - 0.5) * 8, vy: -22, life: 1.0, size: 6, color: 'rgba(240,240,245,.8)', gravity: 0, shape: 'smoke', fade: true, grow: 7 });
      if (cold) { const mm = cn.run || cn.done.cold ? meltM(m, cn.t) : 0; D.sphere(x - 8, yb - ch - 8, 8, '#cfeeff', { gloss: true }); D.sphere(x + 10, yb - ch - 6, 7, '#cfeeff', { gloss: true }); }
      // 이름과 읽음
      T(x, yb + 20, m.n, PHONE ? 13 : 14, '#26324a', 'center', 800);
      if (!cold) T(x, yb + 40, (cn.run || cn.done.hot || cn.t > 0 ? Math.round(tNow) : 80) + ' °C', PHONE ? 13 : 14.5, m.col === '#64748b' ? '#475569' : '#b91c1c', 'center', 800);
      else T(x, yb + 40, Math.round(cn.run || cn.done.cold ? meltM(m, cn.t) : 0) + ' g', PHONE ? 13 : 14.5, '#1d4ed8', 'center', 800);
    });
    parts.update(dt); parts.draw(ctx);
    T(c.x + 12, c.y + 24, PHONE ? (cold ? '🧊 보냉: 30분 뒤 녹은 질량' : '🔥 보온: 20분 뒤 온도') : (cold ? '🧊 보냉: 얼음 100 g을 넣고 30분 뒤 녹은 질량' : '🔥 보온: 80 °C 물 200 mL를 넣고 20분 뒤 온도'), PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    T(c.x + c.w - 12, c.y + 24, PHONE ? Math.round(cn.t) + ' / ' + CN_T[cn.mode] + ' 분' : '시계 ' + Math.round(cn.t) + ' / ' + CN_T[cn.mode] + ' 분 (빠르게 보기)', 13.5, '#c2410c', 'right', 800);
    if (cold) T(c.x + 12, c.y + c.h - 12, '(보온병은 보냉 실험에서 빼요)', 13, '#5a6679', 'left', 700);
    ctx.restore();
    // 아래: 그래프와 단면
    panel(PX, PY, PW, PH, 16);
    const gr = { x: PX + 8, y: PY + 8, w: PHONE ? PW - 16 : 470, h: PHONE ? 176 : PH - 16 };
    const tmax = CN_T[cn.mode];
    const a = axes(gr, cold ? { xmin: 0, xmax: 30, xstep: 10, ymin: 0, ymax: 80, ystep: 20, title: '녹은 얼음의 질량 (g) — 시간 (분)' } : { xmin: 0, xmax: 20, xstep: 5, ymin: 20, ymax: 80, ystep: 20, title: '물의 온도 (°C) — 시간 (분)' });
    ctx.save(); ctx.beginPath(); ctx.rect(a.ix, a.iy - 4, a.iw, a.ih + 8); ctx.clip();
    mats.forEach((m) => {
      ctx.strokeStyle = m.col; ctx.lineWidth = 3; ctx.beginPath();
      for (let t = 0; t <= cn.t + 1e-6; t += 0.5) { const yv = cold ? meltM(m, t) : hotT(m, t); t === 0 ? ctx.moveTo(a.gx(t), a.gy(yv)) : ctx.lineTo(a.gx(t), a.gy(yv)); }
      ctx.stroke();
      if (cn.t > 0) D.sphere(a.gx(cn.t), a.gy(cold ? meltM(m, cn.t) : hotT(m, cn.t)), 4.5, m.col, { gloss: false, outline: '#fff', outlineWidth: 1 });
    });
    ctx.restore();
    // 범례 (순서대로 이름)
    if (!PHONE) { mats.forEach((m, i) => { const yy = gr.y + 36 + i * 21; ctx.fillStyle = m.col; ctx.fillRect(a.ix + a.iw - 100, yy, 16, 4); T(a.ix + a.iw - 78, yy + 6, m.n, 13, '#26324a', 'left', 800); }); }
    // 단면 확대
    const mg = PHONE ? { x: PX + 16, y: PY + 192, w: 200, h: 160 } : { x: PX + 490, y: PY + 10, w: PW - 500, h: 150 };
    drawSection(mg, cn.mag);
    const tx = PHONE ? PX + 226 : PX + 490, ty = PHONE ? PY + 214 : PY + 190;
    const k = MAT[cn.mag], sec = SEC_TXT[cn.mag];
    if (PHONE) wrapL(sec, tx, ty, PW - 226 - 14 + PX, 21, 13, '#26324a'); else wrapL(sec, tx, ty, PW - 500 - 10, 21, 13.5, '#26324a');
  }
  const SEC_TXT = [
    '금속 캔만 있어요. 열이 전도와 복사로 빠르게 빠져나가요.',
    '얇은 알루미늄 포일은 복사를 반사하지만 두께가 얇아 전도는 거의 못 막아요.',
    '신문지는 섬유 사이에 공기가 조금 갇혀 있어서 맨 캔보다 좋아요.',
    '스티로폼은 작은 공기 방울이 아주 많아요. 공기의 k = 0.026이라 열이 잘 못 지나가요 (스티로폼 k = 0.035).',
    '유리솜은 유리 섬유 사이에 공기가 갇혀 있어요 (k = 0.04). 두껍게 해도 공기가 못 움직여 대류가 거의 없어요.',
    '이중벽 사이가 진공이라 전도·대류가 없고, 은도금이 복사를 반사해요. 세 방식을 모두 막아요.',
  ];
  function drawSection(r, k) {
    card(r.x, r.y, r.w, r.h);
    T(r.x + 10, r.y + 20, '🔍 단면 확대: ' + MAT[k].n, 13.5, '#26324a', 'left', 800);
    const x0 = r.x + 12, w0 = r.w - 24, y0 = r.y + 34, h0 = r.h - 46;
    ctx.save(); D.roundRect(x0, y0, w0, h0, 8); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(x0, y0, w0, h0);
    const cw = 26;
    // 왼쪽: 뜨거운 물, 가운데: 단열재, 오른쪽: 바깥 공기
    ctx.fillStyle = 'rgba(255,120,80,.45)'; ctx.fillRect(x0, y0, cw, h0); ctx.fillStyle = 'rgba(200,215,240,.6)'; ctx.fillRect(x0 + w0 - cw, y0, cw, h0);
    ctx.fillStyle = '#9aa6bd'; ctx.fillRect(x0 + cw, y0, 6, h0);
    const ix = x0 + cw + 6, iw = w0 - cw * 2 - 6;
    if (k === 0) { /* 없음 */ ctx.fillStyle = 'rgba(210,225,245,.5)'; ctx.fillRect(ix, y0, iw, h0); }
    if (k === 1) { ctx.fillStyle = '#c3cbd9'; ctx.fillRect(ix, y0, 5, h0); }
    if (k === 2) { ctx.fillStyle = '#e9dfc4'; ctx.fillRect(ix, y0, iw, h0); ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(ix + 4 + ((i * 41) % (iw - 8)), y0 + 4 + ((i * 29) % (h0 - 8)), 2.2, 0, TAU); ctx.fill(); } }
    if (k === 3) { ctx.fillStyle = '#f4f6fa'; ctx.fillRect(ix, y0, iw, h0); for (let i = 0; i < 70; i++) { const px = ix + 6 + ((i * 47) % (iw - 12)), py = y0 + 6 + ((i * 31) % (h0 - 12)); ctx.fillStyle = 'rgba(170,200,240,.75)'; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#9db0cf'; ctx.lineWidth = 1; ctx.stroke(); } }
    if (k === 4) { ctx.fillStyle = '#f7ecb8'; ctx.fillRect(ix, y0, iw, h0); ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 1.5; for (let i = 0; i < 40; i++) { const px = ix + ((i * 53) % iw), py = y0 + ((i * 37) % h0), a = i * 1.7; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * 16, py + Math.sin(a) * 16); ctx.stroke(); } }
    if (k === 5) { ctx.fillStyle = '#e8edf6'; ctx.fillRect(ix, y0, iw, h0); ctx.fillStyle = '#7b869a'; ctx.fillRect(ix, y0, 5, h0); ctx.fillRect(ix + iw - 5, y0, 5, h0); ctx.fillStyle = 'rgba(80,100,140,.25)'; ctx.fillRect(ix + 5, y0, iw - 10, h0); ctx.fillStyle = '#1e293b'; ctx.font = D.font(13, 800); ctx.textAlign = 'center'; ctx.fillText('진공', ix + iw / 2, y0 + h0 / 2 + 5); }
    ctx.restore();
    ctx.strokeStyle = '#7b869a'; ctx.lineWidth = 1.5; D.roundRect(x0, y0, w0, h0, 8); ctx.stroke();
    T(x0 + cw / 2, y0 + h0 - 6, '물', 13, '#b91c1c', 'center', 800); T(x0 + w0 - cw / 2, y0 + h0 - 6, '밖', 13, '#1d4ed8', 'center', 800);
    D.arrow(x0 + cw + 2, y0 + 16, x0 + w0 - cw - 2, y0 + 16, { color: 'rgba(226,70,75,.85)', width: 3, head: 9 });
  }

  /* ================= ③ 건축 단열: 벽 ================= */
  function drawWall(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), w = S.wl, out = w.place === 'out', P = wallP(w.t), Rins = (w.t / 100) / K_INS, Rtot = R_CONC + Rins;
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    ctx.fillStyle = '#f4f7fd'; ctx.fillRect(c.x, c.y, c.w, c.h);
    const k = PHONE ? 5.2 : 8, wx = c.x + (PHONE ? 110 : 150), wy = c.y + 50, wh = PHONE ? 110 : 128, wc = 20 * k, wi = w.t * k;
    const layers = out ? [['콘크리트 20 cm', wc, '#aeb6c4', R_CONC], ['스티로폼 ' + (w.t % 1 ? w.t.toFixed(1) : w.t) + ' cm', wi, '#fdfdfd', Rins]] : [['스티로폼 ' + (w.t % 1 ? w.t.toFixed(1) : w.t) + ' cm', wi, '#fdfdfd', Rins], ['콘크리트 20 cm', wc, '#aeb6c4', R_CONC]];
    // 실내/실외 배경
    ctx.fillStyle = 'rgba(255,200,140,.35)'; ctx.fillRect(c.x, wy - 20, wx - c.x, wh + 40); ctx.fillStyle = 'rgba(180,215,255,.4)'; ctx.fillRect(wx + wc + wi, wy - 20, c.x + c.w - (wx + wc + wi), wh + 40);
    T(c.x + 10, wy + wh / 2 + 5, '실내', 14, '#b45309', 'left', 800); T(c.x + 10, wy + wh / 2 + 24, '20 °C', 14, '#b45309', 'left', 800);
    T(c.x + c.w - 10, wy + wh / 2 + 5, '실외', 14, '#1d4ed8', 'right', 800); T(c.x + c.w - 10, wy + wh / 2 + 24, '0 °C', 14, '#1d4ed8', 'right', 800);
    let xx = wx; const bnd = [wx];
    layers.forEach((l) => {
      if (l[1] > 0) { ctx.fillStyle = l[2]; ctx.fillRect(xx, wy, l[1], wh); ctx.strokeStyle = '#7b869a'; ctx.lineWidth = 2; ctx.strokeRect(xx, wy, l[1], wh);
        if (l[2] === '#fdfdfd') { ctx.fillStyle = 'rgba(160,185,220,.6)'; for (let i = 0; i < Math.floor(l[1] / 9) * 9; i++) { ctx.beginPath(); ctx.arc(xx + 5 + ((i * 7) % Math.max(6, l[1] - 8)), wy + 6 + ((i * 29) % (wh - 12)), 2.2, 0, TAU); ctx.fill(); } }
        T(xx + l[1] / 2, wy - 8 - (PHONE && l[2] === '#fdfdfd' ? 18 : 0), PHONE ? l[0].replace(' 20 cm', '').replace('스티로폼 ', '단열재 ') : l[0], PHONE ? 13 : 13.5, '#26324a', 'center', 800); }
      xx += l[1]; bnd.push(xx);
    });
    // 열 화살표 (굵기 = 열 손실에 비례, 같은 축척)
    const aw = 22 * P / 1400;
    for (let i = 0; i < 4; i++) { const yy = wy + 18 + i * (wh - 36) / 3; D.arrow(c.x + 70, yy, wx - 4, yy, { color: 'rgba(226,70,75,.9)', width: Math.max(0.8, aw), head: 6 + aw * 0.4 }); D.arrow(wx + wc + wi + 4, yy, wx + wc + wi + 4 + (PHONE ? 56 : 90), yy, { color: 'rgba(226,70,75,.9)', width: Math.max(0.8, aw), head: 6 + aw * 0.4 }); }
    // 온도 분포
    const gy0 = wy + wh + (PHONE ? 62 : 70), gh = PHONE ? 70 : 82;
    T(c.x + 10, wy + wh + 22, '온도 분포 (벽 속의 온도)', 13.5, '#26324a', 'left', 800);
    ctx.strokeStyle = 'rgba(120,135,160,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.x + 62, gy0); ctx.lineTo(c.x + c.w - 14, gy0); ctx.moveTo(c.x + 62, gy0 + gh); ctx.lineTo(c.x + c.w - 14, gy0 + gh); ctx.stroke();
    T(c.x + 56, gy0 + 5, '20', 13, '#b45309', 'right', 800); T(c.x + 56, gy0 + gh + 5, '0', 13, '#1d4ed8', 'right', 800);
    let Tc = 20; const pts = [[c.x + 62, 20], [bnd[0], 20]];
    layers.forEach((l, i) => { Tc -= DT * l[3] / Rtot; pts.push([bnd[i + 1], Tc]); });
    pts.push([c.x + c.w - 14, Tc]);
    ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, i) => { const yy = gy0 + gh * (1 - p[1] / 20); i ? ctx.lineTo(p[0], yy) : ctx.moveTo(p[0], yy); }); ctx.stroke();
    const tIn = out ? pts[2][1] : pts[3][1];       // 콘크리트의 실내 쪽 면 온도 (참고)
    const concT = out ? 20 - DT * 0 : 0;
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    const concMean = out ? 20 - DT * R_CONC / (2 * Rtot) : 20 - DT * (Rins + R_CONC / 2) / Rtot;
    // 아래
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, fs = PHONE ? 13 : 14.5, lh = PHONE ? 23 : 27;
    T(x0, PY + 28, '🧱 벽의 열 손실 P = A·ΔT / Σ(L/k)', 15, '#26324a', 'left', 800);
    lines(x0, PY + 28 + lh, lh, fs, [
      ['콘크리트: L/k = 0.20 / 1.4 = ' + R_CONC.toFixed(3) + '  (m²·K/W)', '#26324a'],
      ['스티로폼: L/k = ' + (w.t / 100).toFixed(3) + ' / 0.035 = ' + Rins.toFixed(3), '#26324a'],
      ['P = 10 × 20 / ' + Rtot.toFixed(3) + ' = ' + Math.round(P) + ' W   (단열재 없을 때 1400 W)', '#c2410c'],
      ['콘크리트의 평균 온도 ≈ ' + concMean.toFixed(1) + ' °C  (' + (out ? '바깥 단열: 콘크리트가 실내처럼 따뜻해요' : '안쪽 단열: 콘크리트가 바깥처럼 차가워져요') + ')', out ? '#14753f' : '#b91c1c'],
    ]);
    hbar(x0, PY + PH - 34, PW - 130, 16, P, 1400, ORANGE); T(x0 + PW - 120, PY + PH - 21, Math.round(P) + ' W', 14.5, '#c2410c', 'left', 800);
  }

  /* ================= ③ 창 ================= */
  function drawWindow(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), calc = showCalc('win'), slot = c.w / 4;
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    ctx.fillStyle = '#f4f7fd'; ctx.fillRect(c.x, c.y, c.w, c.h);
    WINS.forEach((wn, i) => {
      const cx = c.x + slot * (i + 0.5), top = c.y + 62, h = PHONE ? 120 : 150, P = winP(wn.U);
      ctx.fillStyle = 'rgba(255,200,140,.3)'; ctx.fillRect(cx - slot * 0.46, top - 8, slot * 0.46 - 22, h + 16); ctx.fillStyle = 'rgba(180,215,255,.35)'; ctx.fillRect(cx + 22, top - 8, slot * 0.46 - 22, h + 16);
      const panes = [1, 2, 2, 3][i], gapW = PHONE ? 7 : 12, paneW = 5;
      const totalW = panes * paneW + (panes - 1) * gapW; let xx = cx - totalW / 2;
      for (let p = 0; p < panes; p++) { ctx.fillStyle = 'rgba(120,190,255,.6)'; ctx.fillRect(xx, top, paneW, h); ctx.strokeStyle = '#4b9be8'; ctx.lineWidth = 1.5; ctx.strokeRect(xx, top, paneW, h); if (i === 2 && p === 1) { ctx.fillStyle = 'rgba(255,230,90,.9)'; ctx.fillRect(xx - 2, top, 2, h); } xx += paneW + gapW; }
      if (i > 0) { ctx.fillStyle = 'rgba(180,200,230,.25)'; ctx.fillRect(cx - totalW / 2 + paneW, top, totalW - paneW * 2 + (panes === 2 ? 0 : 0), h); }
      if (i === 2) { T(cx, top - 14, '로이 코팅·아르곤', 13, '#92620a', 'center', 800); } else T(cx, top - 14, wn.n, 13.5, '#26324a', 'center', 800);
      const aw = 22 * P / 232;
      for (let k2 = 0; k2 < 3; k2++) { const yy = top + 20 + k2 * (h - 40) / 2; D.arrow(cx - slot * 0.4, yy, cx - totalW / 2 - 3, yy, { color: 'rgba(226,70,75,.9)', width: Math.max(0.8, aw * 0.6), head: 7 }); D.arrow(cx + totalW / 2 + 3, yy, cx + slot * 0.4, yy, { color: 'rgba(226,70,75,.9)', width: Math.max(0.8, aw * 0.6), head: 7 }); }
      T(cx, top + h + 24, 'U = ' + wn.U, 13.5, '#26324a', 'center', 800);
      T(cx, top + h + 46, calc ? '열 손실 ?' : P + ' W', 14.5, calc ? '#b45309' : '#c2410c', 'center', 800);
    });
    T(c.x + 12, c.y + 24, '창 2 m², 실내–실외 온도 차 20 °C — 열 관류율 U (W/m²·K)', PHONE ? 13 : 14, '#26324a', 'left', 800);
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, fs = PHONE ? 13 : 14.5, lh = PHONE ? 23 : 28;
    T(x0, PY + 28, '🪟 창의 열 손실 P = U × A × ΔT', 15, '#26324a', 'left', 800);
    // 공기층 두께 도구
    const d = S.wl.gap, Rg = (Math.min(d, 2) / 100) / 0.026;
    const gw = PHONE ? PW - 32 : 330, gx = x0, gy = PY + 44, gh = PHONE ? 120 : 150;
    ctx.fillStyle = '#fff'; D.roundRect(gx, gy, gw, gh, 8); ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke();
    const ox = gx + 38, oy = gy + 14, ow = gw - 52, oh = gh - 40;
    ctx.strokeStyle = 'rgba(120,135,160,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ox, oy + oh); ctx.lineTo(ox + ow, oy + oh); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy + oh); ctx.stroke();
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3.5; ctx.beginPath();
    for (let dd = 0; dd <= 4.001; dd += 0.1) { const rr = (Math.min(dd, 2) / 100) / 0.026, px = ox + ow * dd / 4, py = oy + oh - oh * rr / 1.0; dd === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke();
    D.dashedLine(ox + ow * 0.5, oy, ox + ow * 0.5, oy + oh, { color: '#e2464b', width: 1.5, dash: [4, 4] });
    D.sphere(ox + ow * d / 4, oy + oh - oh * Rg / 1.0, 6, '#e2552a', { gloss: false, outline: '#fff', outlineWidth: 1.5 });
    T(gx + 8, gy + 16, 'R', 13, '#3a465c', 'left', 800); T(ox + ow, oy + oh + 17, '공기층 d (cm)', 13, '#3a465c', 'right', 800); [0, 2, 4].forEach((v) => T(ox + ow * v / 4, oy + oh + 17, String(v), 13, '#3a465c', 'center', 800));
    T(ox + ow * 0.5 + 4, oy + 16, '2 cm', 13, '#b91c1c', 'left', 800);
    const tx = PHONE ? x0 : PX + 360;
    const yy0 = PHONE ? gy + gh + 22 : PY + 40;
    lines(tx, yy0, PHONE ? 21 : lh - 2, PHONE ? 13 : 14, [
      ['공기층 d = ' + d.toFixed(1) + ' cm → 단열 저항 R = ' + Rg.toFixed(2) + ' m²·K/W', '#1d4ed8'],
      [d <= 2 ? '공기가 갇혀 있어서 d가 클수록 R이 커져요 (R = d/k).' : '공기층이 2 cm보다 두꺼우면 안에서 대류가 생겨 R이 더 늘지 않아요.', d <= 2 ? '#14753f' : '#b91c1c'],
      ['창이 벽보다 열을 잘 빼앗기는 까닭: 유리는 얇고 k가 커서예요.', '#26324a'],
      ['로이(Low-E) 코팅은 복사를 반사하고, 아르곤은 공기보다 열을 덜 전도해요.', '#26324a'],
    ]);
  }

  /* ================= ④ 열팽창 ================= */
  const EX_GAP = { rail: 15, bridge: 50 };                       // 설치할 때 둔 틈 (mm)
  const EX_L = { rail: 25, bridge: 100 };
  function exDL(e) { const a = AL[e.app === 'bridge' ? 3 : e.mat].a; return dL(a, EX_L[e.app], e.T + 15) * 1000; }   // mm (기준: −15 °C)
  function drawExpand(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), e = S.ex, app = e.app;
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    const sk = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); sk.addColorStop(0, e.T > 20 ? '#ffd9a8' : '#cfe6ff'); sk.addColorStop(1, '#f4f7fd'); ctx.fillStyle = sk; ctx.fillRect(c.x, c.y, c.w, c.h);
    const th = clamp((e.T + 15) / 50, 0, 1);
    D.sphere(c.x + c.w - 56, c.y + 52, 24, e.T > 15 ? '#ffd447' : '#e8f1ff', { gloss: false }); T(c.x + c.w - 56, c.y + 96, e.T + ' °C', 14.5, '#26324a', 'center', 800);
    const gy = c.y + c.h * 0.62, cx = c.x + c.w / 2;
    if (app === 'rail' || app === 'bridge') {
      const gap0 = EX_GAP[app], dl = exDL(e), gap = gap0 - dl, scl = app === 'rail' ? 4 : 1.3, gp = Math.max(0, gap) * scl, buck = gap < -0.05;
      const half = (c.w - 200) / 2, rh = app === 'rail' ? 14 : 36, y1 = gy;
      const seg = (xa, xb, side) => {
        if (app === 'rail') {
          ctx.fillStyle = '#7b869a'; ctx.fillRect(xa, y1 - rh, xb - xa, 5); ctx.fillRect(xa + (xb - xa) * 0.4, y1 - rh + 5, (xb - xa) * 0.2, rh - 10); ctx.fillRect(xa, y1 - 5, xb - xa, 5);
          ctx.fillStyle = '#8b6b3e'; for (let x = xa + 14; x < xb; x += 34) ctx.fillRect(x, y1 + 2, 16, 8);
        } else {
          const g = ctx.createLinearGradient(0, y1 - rh, 0, y1); g.addColorStop(0, '#c8cdd8'); g.addColorStop(1, '#9aa2b2'); ctx.fillStyle = g; ctx.fillRect(xa, y1 - rh, xb - xa, rh); ctx.fillStyle = '#6b7488'; ctx.fillRect(xa, y1 - rh, xb - xa, 4);
          ctx.fillStyle = '#7b869a'; ctx.fillRect(side > 0 ? xa + 10 : xb - 40, y1, 30, 40);
        }
      };
      if (!buck) { seg(cx - half - gp / 2, cx - gp / 2, -1); seg(cx + gp / 2, cx + half + gp / 2, 1); }
      else { // 레일이 휘어요
        ctx.save(); ctx.translate(0, 0); const lift = Math.min(40, -gap * 4);
        ctx.strokeStyle = '#7b869a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - half, y1 - 3); ctx.quadraticCurveTo(cx, y1 - 3 - lift * 2.4, cx + half, y1 - 3); ctx.stroke(); ctx.restore();
      }
      if (!buck) { D.dashedLine(cx - gp / 2, y1 - rh - 10, cx - gp / 2, y1 + 8, { color: '#e2464b', width: 1.5, dash: [3, 3] }); D.dashedLine(cx + gp / 2, y1 - rh - 10, cx + gp / 2, y1 + 8, { color: '#e2464b', width: 1.5, dash: [3, 3] }); }
      D.label(cx, y1 - rh - 30, showCalc('ex') ? '틈이 얼마나 줄었을까요?' : buck ? '틈이 없어서 레일이 휘어요!' : '틈 ' + f1(Math.max(0, gap)) + ' mm', { bg: buck ? 'rgba(185,28,28,.92)' : 'rgba(30,41,59,.88)', size: 13, pad: 9 });
      T(c.x + 12, c.y + 24, app === 'rail' ? '레일 25 m의 이음 틈 (틈은 크게 과장해서 그려요)' : '콘크리트 다리 100 m의 신축 이음 (틈은 크게 과장)', PHONE ? 13 : 14, '#26324a', 'left', 800);
      T(c.x + 12, c.y + 46, '처음 틈 ' + gap0 + ' mm는 −15 °C에서 둔 값이에요', 13, '#5a6679', 'left', 700);
      T(cx, y1 + 70, 'ΔL = α·L·ΔT = ' + AL[app === 'bridge' ? 3 : e.mat].a + ' × 10⁻⁵ × ' + EX_L[app] + ' × ' + (e.T + 15) + ' = ' + (showCalc('ex') ? '?' : f1(dl) + ' mm'), PHONE ? 13.5 : 15, '#c2410c', 'center', 800);
    } else {
      // 바이메탈 화재 경보기
      const bx = c.x + c.w * 0.3, by = gy - 20, L = PHONE ? 150 : 220, kap = (e.T + 15) / 50 * 0.012;
      ctx.fillStyle = '#516079'; ctx.fillRect(bx - 26, by - 40, 26, 80);
      let px = bx, py = by, ang = 0; const n = 24, step = L / n; const top = [], bot = [];
      for (let i = 0; i <= n; i++) { top.push([px - Math.sin(ang) * 6, py - Math.cos(ang) * 6]); bot.push([px + Math.sin(ang) * 6, py + Math.cos(ang) * 6]); ang -= kap * step; px += Math.cos(ang) * step; py += Math.sin(ang) * step; }
      ctx.fillStyle = '#9aa6bd'; ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.lineTo(px, py); ctx.lineTo(top[n][0], top[n][1]); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e0a34a'; ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1] + 6); for (let i = 0; i <= n; i++) ctx.lineTo((top[i][0] + bot[i][0]) / 2, (top[i][1] + bot[i][1]) / 2); for (let i = n; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5; ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); bot.slice().reverse().forEach((p) => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.stroke();
      const tipx = (top[n][0] + bot[n][0]) / 2, tipy = (top[n][1] + bot[n][1]) / 2, cxx = bx + L * 0.9, cyy = by - 48;
      ctx.fillStyle = '#475569'; ctx.fillRect(cxx - 14, cyy - 28, 30, 6); ctx.fillRect(cxx + 1, cyy - 28, 3, 28); ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.arc(cxx + 2, cyy + 2, 4.5, 0, TAU); ctx.fill();
      const on = tipy <= cyy + 8; if (on) { D.glow(c.x + c.w * 0.72, by - 70, 50, '#ff5a3c', 0.6); D.sphere(c.x + c.w * 0.72, by - 70, 20, '#ef4444', { gloss: true }); T(c.x + c.w * 0.72, by - 40, '경보 울림!', 14, '#b91c1c', 'center', 800); } else { D.sphere(c.x + c.w * 0.72, by - 70, 20, '#94a3b8', { gloss: true }); T(c.x + c.w * 0.72, by - 40, '꺼짐', 14, '#5a6679', 'center', 800); }
      T(bx + 20, by + 42, '위: 철, 아래: 알루미늄 (α가 더 커요)', 13, '#26324a', 'left', 800);
      T(c.x + 12, c.y + 24, '바이메탈: 두 금속을 붙인 띠 (휘는 정도는 과장)', PHONE ? 13 : 14, '#26324a', 'left', 800);
      T(c.x + 12, c.y + 46, '온도가 오르면 α가 큰 알루미늄이 더 늘어 위로 휘고, 접점에 닿아 경보가 울려요.', 13, '#5a6679', 'left', 700);
    }
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, fs = PHONE ? 13 : 14.5, lh = PHONE ? 23 : 28;
    T(x0, PY + 28, '📏 선팽창: ΔL = α × L × ΔT', 15, '#26324a', 'left', 800);
    const dl = exDL(e);
    if (app === 'bimetal') lines(x0, PY + 28 + lh, lh, fs, [['두 금속의 α(×10⁻⁵ /°C): 알루미늄 2.3, 철 1.2', '#26324a'], ['온도가 오를수록 길이 차이가 커져서 띠가 더 휘어요.', '#26324a'], ['쓰임: 화재 경보기, 전기다리미·토스터의 온도 조절 스위치 (중1에서 배운 바이메탈)', '#5a6679']]);
    else {
      const mm = AL.map((q) => dL(q.a, EX_L[app], 50) * 1000);
      lines(x0, PY + 28 + lh, lh, fs, [['선팽창 계수 α (×10⁻⁵ /°C): ' + AL.map((q) => q.n + ' ' + q.a).join(', '), '#26324a'], ['연교차 50 °C(−15 → 35 °C)에서 ' + EX_L[app] + ' m의 늘어남(mm): ' + AL.map((q, i) => q.n + ' ' + f1(mm[i])).join(', '), '#26324a'], [app === 'rail' ? '철 레일은 15 mm이므로 틈 15 mm가 필요해요. 알루미늄(28.8 mm)이면 틈이 모자라요.' : '콘크리트 다리 100 m는 5.0 cm 늘어나서 신축 이음(틈)을 두어요.', '#1d4ed8'], ['여름에 전깃줄이 처지는 것도 늘어나기 때문이고, 뜨거운 병뚜껑은 금속이 더 늘어나 쉽게 열려요.', '#5a6679']]);
    }
  }

  /* ================= ④ 단열 집 설계 ================= */
  const TAN29 = Math.tan(29 * RAD0()), TAN76 = Math.tan(76 * RAD0());
  function RAD0() { return Math.PI / 180; }
  const HS_COST = [0, 2, 4, 6], HS_LIM = { heat: 500, summer: 400, cost: 18 };
  function houseCalc(h) {
    const e = h.eave / 100, pw = 30 * DT / (R_CONC + (h.ins / 100) / K_INS), pwin = WINS[h.win].U * 6 * DT;
    const sw = clamp((e * TAN29 - 0.3) / 1.5, 0, 1), ss = clamp((e * TAN76 - 0.3) / 1.5, 0, 1);
    const gw = 6 * 40 * (1 - sw), heat = pw + pwin - gw, summer = 6 * 300 * 0.7 * (1 - ss), cost = h.ins + HS_COST[h.win] + h.eave / 10;
    return { pw, pwin, sw, ss, gw, heat, summer, cost, ok: heat <= HS_LIM.heat + 1e-9 && summer <= HS_LIM.summer + 1e-9 && cost <= HS_LIM.cost + 1e-9 };
  }
  function drawHouseSide(x, y, w, h, summer, hs, r) {
    ctx.save(); D.roundRect(x, y, w, h, 12); ctx.clip();
    const sk = ctx.createLinearGradient(0, y, 0, y + h); sk.addColorStop(0, summer ? '#8fd0ff' : '#cfe3f7'); sk.addColorStop(1, summer ? '#e8f6ff' : '#f2f6fb'); ctx.fillStyle = sk; ctx.fillRect(x, y, w, h);
    const sc = PHONE ? 52 : 92, gy = y + h - 22, wallH = 2.4 * sc, wx = x + w * (PHONE ? 0.46 : 0.5), e = hs.eave / 100;
    ctx.fillStyle = summer ? '#8ccf7d' : '#e9eef5'; ctx.fillRect(x, gy, w, y + h - gy);
    // 집
    ctx.fillStyle = '#f1e6d2'; ctx.fillRect(wx - 150, gy - wallH, 150, wallH); ctx.fillStyle = '#b45f3c'; ctx.beginPath(); ctx.moveTo(wx - 162, gy - wallH); ctx.lineTo(wx - 75, gy - wallH - 38); ctx.lineTo(wx + 8, gy - wallH); ctx.closePath(); ctx.fill();
    // 창 (벽의 오른쪽 면)
    const wt = gy - wallH + 0.3 * sc, wh = 1.5 * sc;
    ctx.fillStyle = 'rgba(120,190,255,.55)'; ctx.fillRect(wx - 8, wt, 8, wh); ctx.strokeStyle = '#2f6fb5'; ctx.lineWidth = 2; ctx.strokeRect(wx - 8, wt, 8, wh);
    const shade = summer ? r.ss : r.sw; if (shade > 0) { ctx.fillStyle = 'rgba(30,41,59,.55)'; ctx.fillRect(wx - 8, wt, 8, wh * shade); }
    // 처마
    const eaveY = gy - wallH; if (e > 0) { ctx.fillStyle = '#7a4a2a'; ctx.fillRect(wx - 6, eaveY - 4, e * sc + 6, 7); }
    // 햇빛
    const el = (summer ? 76 : 29) * Math.PI / 180, dx = -Math.cos(el), dy = Math.sin(el);
    for (let hh = 6; hh < wallH + 30; hh += 22) {
      const hit = hh / 1; const blocked = hh < e * sc * Math.tan(el);
      const ex = blocked ? wx + e * sc : wx, ey = blocked ? eaveY : eaveY + hh;
      const L = 150; ctx.strokeStyle = blocked ? 'rgba(255,190,60,.35)' : 'rgba(255,180,40,.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ex - dx * L, ey - dy * L); ctx.lineTo(ex, ey); ctx.stroke();
      if (!blocked && ey > wt && ey < wt + wh) { ctx.strokeStyle = 'rgba(255,200,60,.8)'; ctx.beginPath(); ctx.moveTo(wx, ey); ctx.lineTo(wx + dx * 30, ey + dy * 30); ctx.stroke(); }
    }
    D.sphere(x + w - 36, y + 34, 18, '#ffd447', { gloss: false });
    T(x + 10, y + 22, summer ? '여름 한낮 (태양 높이 76°)' : '겨울 한낮 (태양 높이 29°)', PHONE ? 13 : 14, '#26324a', 'left', 800);
    T(x + 10, y + 42, '창의 ' + Math.round(shade * 100) + ' %가 그늘', 13.5, shade > 0.5 ? '#334155' : '#b45309', 'left', 800);
    ctx.restore();
  }
  function drawHouse(dt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    const c = topCard(), hs = S.hs, r = houseCalc(hs), hw = (c.w - 8) / 2;
    drawHouseSide(c.x, c.y, hw, c.h, true, hs, r); drawHouseSide(c.x + hw + 8, c.y, hw, c.h, false, hs, r);
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 16, fs = PHONE ? 13 : 14.5, lh = PHONE ? 23 : 27;
    T(x0, PY + 28, '🏠 단열 집 설계 점수 (비교용 상대값)', 15, '#26324a', 'left', 800);
    const bw = PHONE ? PW - 150 : 330, bx = x0 + (PHONE ? 4 : 4);
    [['겨울 난방 열 손실', r.heat, 1500, HS_LIM.heat, 'W'], ['여름 햇빛 유입', r.summer, 1500, HS_LIM.summer, 'W'], ['비용 (예산 ' + HS_LIM.cost + '점)', r.cost, 30, HS_LIM.cost, '점']].forEach((q, i) => {
      const yy = PY + 46 + i * 42, ok = q[1] <= q[3] + 1e-9;
      T(bx, yy + 12, q[0], 14, '#26324a', 'left', 800); hbar(bx, yy + 20, bw, 14, Math.max(0, q[1]), q[2], ok ? GREEN : RED);
      const lx = bx + bw * q[3] / q[2]; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(lx, yy + 16); ctx.lineTo(lx, yy + 38); ctx.stroke();
      T(bx + bw + 10, yy + 33, Math.round(Math.max(0, q[1])) + ' ' + q[4], 14, ok ? '#14753f' : '#b91c1c', 'left', 800);
    });
    T(bx, PY + 46 + 3 * 42 + 6, '검은 선 = 목표 (난방 ≤ ' + HS_LIM.heat + ' W, 여름 ≤ ' + HS_LIM.summer + ' W, 비용 ≤ ' + HS_LIM.cost + '점)', 13, '#5a6679', 'left', 800);
    const tx = PHONE ? x0 : PX + 470, ty = PHONE ? PY + 46 + 3 * 42 + 30 : PY + 46;
    lines(tx, ty, PHONE ? 21 : lh - 2, PHONE ? 13 : 14, [
      ['벽 ' + Math.round(r.pw) + ' W + 창 ' + Math.round(r.pwin) + ' W − 겨울 햇빛 ' + Math.round(r.gw) + ' W', '#26324a'],
      ['처마가 짧으면 여름 햇빛이 들어오고, 너무 길면 겨울 햇빛까지 가려요.', '#1d4ed8'],
      [r.ok ? '✅ 목표를 모두 만족해요! 정답은 하나가 아니에요.' : '목표를 맞추도록 단열재·창·처마를 조절해 보세요.', r.ok ? '#14753f' : '#b45309'],
    ]);
  }

  /* ================= 컨트롤 연결 ================= */
  const setSl = (id, v, mn, mx) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); };
  const ORD_C = ['없음 (캔만)', '알루미늄 포일', '신문지', '스티로폼', '유리솜', '진공 보온병'];
  const RULES_C = [[5, 4], [4, 3], [3, 2], [2, 1], [1, 0]];       // 20분 후 따뜻한 순서: 보온병 > 유리솜 > 스티로폼 > 신문지 > 포일 > 없음
  const ordV = (ord, rules) => { const pos = {}; ord.forEach((id, i) => { pos[id] = i; }); return rules.filter(([a, b]) => pos[a] > pos[b]); };
  const ordSigC = { v: '' };
  function renderOrderC() {
    const ord = S.ordC, bad = S.ordBadC, sig = ord.join() + '|' + Object.keys(bad).join();
    if (sig === ordSigC.v) return; ordSigC.v = sig;
    const box = $('#ordC'); box.innerHTML = '';
    ord.forEach((id, pos) => {
      const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:6px;padding:4px 6px;border:2px solid ' + (bad[id] ? 'var(--bad)' : 'var(--line)') + ';border-radius:12px;background:' + (bad[id] ? 'var(--bad-soft)' : '#fff');
      const nm = document.createElement('b'); nm.textContent = String(pos + 1); nm.style.cssText = 'flex:none;width:22px;text-align:center;color:var(--muted)';
      const tx = document.createElement('div'); tx.textContent = ORD_C[id]; tx.style.cssText = 'flex:1;font-size:13.5px;font-weight:700;line-height:1.3';
      const mk = (lab, d) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = lab; b.style.cssText = 'flex:none;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--surface);font-weight:900;cursor:pointer'; b.setAttribute('aria-label', ORD_C[id] + (d < 0 ? ' 위로' : ' 아래로')); b.disabled = (d < 0 && pos === 0) || (d > 0 && pos === ord.length - 1); b.addEventListener('click', () => moveC(pos, d)); return b; };
      row.append(nm, tx, mk('▲', -1), mk('▼', 1)); box.appendChild(row);
    });
  }
  function moveC(pos, d) { const a = S.ordC, j = pos + d; if (j < 0 || j >= a.length) return; const t = a[pos]; a[pos] = a[j]; a[j] = t; S.ordBadC = {}; Sound.click(); updateCtl(); }
  (function build() {
    const mg = $('#cnMag'); MAT.forEach((m, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.mg = i; b.textContent = m.n; mg.appendChild(b); });
    const ew = $('#hsWin'); WINS.forEach((w, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.hw = i; b.textContent = w.n; ew.appendChild(b); });
    const em = $('#exMat'); AL.forEach((a, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.xm = i; b.textContent = a.n; em.appendChild(b); });
  })();
  const SC3 = ['cond', 'conv', 'rad'];
  function updateCtl() {
    const modes = allowedModes();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) { const c = n.getAttribute('data-calc'); if (c && !showCalc(c)) on = false; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    $$('#thSeg button').forEach((x) => x.classList.toggle('on', (x.dataset.th === '1') === S.thermal));
    const k = SC3.indexOf(S.mode) >= 0 ? S.mode : 'cond', sc = S.sc[k];
    $('#bScRun').disabled = sc.run; $('#bScRun').textContent = sc.done ? '▶ 다시 실행' : '▶ 실행';
    $$('#jdSeg button').forEach((x) => { const j = S.judged[k] && +x.dataset.jd === ANS[k]; x.classList.toggle('on', j); });
    $$('#rdSh button').forEach((x) => x.classList.toggle('on', x.dataset.sh === S.sc.rad.sh));
    const cn = S.cn;
    $$('#cnMode button').forEach((x) => x.classList.toggle('on', x.dataset.cm === cn.mode));
    $('#bCnRun').disabled = cn.run; $('#bCnRun').textContent = cn.done[cn.mode] ? '▶ 다시 실험' : '▶ 실험 시작';
    $$('#cnMag button').forEach((x) => x.classList.toggle('on', +x.dataset.mg === cn.mag));
    $$('#cnSame button').forEach((x) => x.classList.toggle('on', +x.dataset.sm === cn.same));
    const w = S.wl; $('#oInsW').textContent = (w.t % 1 ? w.t.toFixed(1) : w.t) + ' cm'; setSl('sInsW', w.t, 0, 15);
    $$('#wlPlace button').forEach((x) => x.classList.toggle('on', x.dataset.pl === w.place));
    $('#oGap').textContent = w.gap.toFixed(1) + ' cm'; setSl('sGap', w.gap, 0.2, 4);
    const e = S.ex;
    $$('#exApp button').forEach((x) => x.classList.toggle('on', x.dataset.ap === e.app));
    $$('#exMat button').forEach((x) => x.classList.toggle('on', +x.dataset.xm === e.mat));
    $('#exMatBox').hidden = !(S.mode === 'expand' && e.app === 'rail');
    $('#oExT').textContent = e.T + ' °C'; setSl('sExT', e.T, -15, 35);
    const h = S.hs; $('#oHi').textContent = h.ins + ' cm'; setSl('sHi', h.ins, 0, 15); $('#oHe').textContent = h.eave + ' cm'; setSl('sHe', h.eave, 0, 100);
    $$('#hsWin button').forEach((x) => x.classList.toggle('on', +x.dataset.hw === h.win));
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#thSeg button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.thermal = x.dataset.th === '1'; updateCtl(); }));
  $('#bScRun').addEventListener('click', () => { const k = SC3.indexOf(S.mode) >= 0 ? S.mode : 'cond'; scRun(k); });
  $('#bScR').addEventListener('click', () => { Sound.click(); const k = SC3.indexOf(S.mode) >= 0 ? S.mode : 'cond'; scReset(k); });
  $$('#jdSeg button').forEach((x) => x.addEventListener('click', () => { Sound.click(); judge(SC3.indexOf(S.mode) >= 0 ? S.mode : 'cond', +x.dataset.jd); }));
  $$('#rdSh button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.sc.rad.sh = x.dataset.sh; scReset('rad'); }));
  $$('#cnMode button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.cn.mode = x.dataset.cm; cnReset(); S.cn.same = 0; updateCtl(); }));
  $('#bCnRun').addEventListener('click', cnRun);
  $('#bCnR').addEventListener('click', () => { Sound.click(); cnReset(); });
  $$('#cnMag button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.cn.mag = +x.dataset.mg; updateCtl(); }));
  $$('#cnSame button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.cn.same = +x.dataset.sm; updateCtl(); }));
  $('#sInsW').addEventListener('input', (e) => { S.wl.t = +e.target.value; if (Math.abs(S.wl.t - 0.5) < 1e-6) S.wallOk.half = true; if (Math.abs(S.wl.t - 4.5) < 1e-6) S.wallOk.tenth = true; updateCtl(); });
  $$('#wlPlace button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.wl.place = x.dataset.pl; updateCtl(); }));
  $('#sGap').addEventListener('input', (e) => { S.wl.gap = +e.target.value; updateCtl(); });
  ['iW0', 'iW1', 'iW2', 'iW3', 'iX1', 'iX2'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));
  $$('#exApp button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.ex.app = x.dataset.ap; updateCtl(); }));
  $$('#exMat button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.ex.mat = +x.dataset.xm; updateCtl(); }));
  $('#sExT').addEventListener('input', (e) => { S.ex.T = +e.target.value; updateCtl(); });
  $('#sHi').addEventListener('input', (e) => { S.hs.ins = +e.target.value; updateCtl(); });
  $('#sHe').addEventListener('input', (e) => { S.hs.eave = +e.target.value; updateCtl(); });
  $$('#hsWin button').forEach((x) => x.addEventListener('click', () => { Sound.click(); S.hs.win = +x.dataset.hw; updateCtl(); }));

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'cond') { const u = clamp(S.sc.cond.t / RUN_SEC, 0, 1); L1 = '윗부분 온도'; a = Math.round(20 + 80 * Math.min(1, u / 0.5)) + ' °C'; L2 = '아랫부분 온도'; b = Math.round(2 + 1.5 * u) + ' °C'; L3 = '물의 열전도율 k'; c = '0.6 W/m·K'; }
    else if (m === 'conv') { L1 = '대류가 일어나는 곳'; a = '액체·기체'; L2 = '더운 물·공기'; b = '위로 올라가요'; L3 = '찬 물·공기'; c = '아래로 내려와요'; }
    else if (m === 'rad') { const s = S.sc.rad, u = clamp(s.t / RUN_SEC, 0, 1); L1 = '가림판'; a = { none: '없음', glass: '투명 유리', foil: '은박 판' }[s.sh]; L2 = '검은 판의 온도'; b = Math.round(radT(s.sh, s.run || s.done ? u : 0)) + ' °C'; L3 = '복사'; c = s.sh === 'foil' ? '반사돼요' : '통과해요'; }
    else if (m === 'cans') { const cn = S.cn; const cold = cn.mode === 'cold'; L1 = cold ? '보냉 실험' : '보온 실험'; a = Math.round(cn.t) + ' / ' + CN_T[cn.mode] + ' 분'; const best = matsOf()[matsOf().length - 1]; L2 = cold ? '유리솜 녹은 양' : '보온병 온도'; b = cold ? Math.round(meltM(MAT[4], cn.t)) + ' g' : Math.round(hotT(MAT[5], cn.t)) + ' °C'; L3 = cold ? '맨 캔 녹은 양' : '맨 캔 온도'; c = cold ? Math.round(meltM(MAT[0], cn.t)) + ' g' : Math.round(hotT(MAT[0], cn.t)) + ' °C'; }
    else if (m === 'wall') { const P = wallP(S.wl.t); L1 = '단열재 두께'; a = (S.wl.t % 1 ? S.wl.t.toFixed(1) : S.wl.t) + ' cm'; L2 = '벽의 열 손실 P'; b = Math.round(P) + ' W'; L3 = '단열재 없을 때와 비교'; c = '1/' + (1400 / P).toFixed(1); }
    else if (m === 'window') { L1 = '공기층 d'; a = S.wl.gap.toFixed(1) + ' cm'; L2 = '공기층 R'; b = ((Math.min(S.wl.gap, 2) / 100) / 0.026).toFixed(2); L3 = '2 cm보다 두꺼우면'; c = '대류로 R 일정'; }
    else if (m === 'expand') { const e = S.ex; L1 = '온도'; a = e.T + ' °C'; L2 = '늘어난 길이 ΔL'; b = e.app === 'bimetal' ? '—' : (e.app === 'bridge' ? f1(exDL(e) / 10) + ' cm' : f1(exDL(e)) + ' mm'); L3 = '기준 온도'; c = '−15 °C'; if (showCalc('ex')) b = '?'; }
    else { const r = houseCalc(S.hs); L1 = '겨울 난방 열 손실'; a = Math.round(r.heat) + ' W'; L2 = '여름 햇빛 유입'; b = Math.round(r.summer) + ' W'; L3 = '비용'; c = Math.round(r.cost) + ' / ' + HS_LIM.cost + '점'; }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const fb = (pairs) => pairs.forEach(([el, ok]) => { if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } else if (!el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } });
  const num = (id) => { const v = $('#' + id).value.trim(); return v === '' || !isFinite(+v) ? null : +v; };
  function clr(...ids) { ids.forEach((id) => { const el = $('#' + id); el.value = ''; el.classList.remove('ok', 'bad'); }); }
  const resetSc = () => { SC3.forEach((k) => { S.sc[k] = Object.assign(S.sc[k], { run: false, t: 0, done: false }); }); S.sc.rad.sh = 'none'; };

  const levels = [
    {
      title: '열의 이동: 전도·대류·복사', short: '열의 이동', icon: '🌡️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 겨울에 따뜻한 집, 여름에 시원한 집은 열이 드나드는 길을 어떻게 막았을까?</p>' +
        '<div class="si-link">🔗 <b>중학교 열 단원에서</b> 고체의 전도, 물·공기의 대류, 햇빛 같은 복사와 보온병의 원리를 배웠어요. 이번에는 <b>물과 공기 같은 유체</b>에서도 열이 어떻게 전달되는지 관찰하고, 건축과 기술에 어떻게 활용되는지 알아봐요.</div>' +
        '<p>세 장면을 ▶ 실행해 보고 <b>어떤 방식의 열 전달인지</b> 골라 판정표를 채워요. <b>🌡️ 열화상</b>으로 바꾸면 온도 분포가 색으로 보여요(파랑 = 차가움, 빨강 = 뜨거움).</p>',
      features: ['cond', 'conv', 'rad'],
      setup() { resetSc(); S.judged = { cond: false, conv: false, rad: false }; S.thermal = false; setScene('cond'); },
      recap: '열은 전도(이웃한 분자끼리 전달), 대류(더운 유체가 직접 이동), 복사(전자기파)로 전달돼요. 물은 전도로 열을 거의 못 전하지만 대류로는 잘 날라요. 진공 보온병은 세 가지를 모두 막아요.',
      summary: '<ul><li><b>전도</b>: 물질이 움직이지 않고 이웃한 입자끼리 열을 전달해요. 고체뿐 아니라 액체·기체에서도 일어나지만 물(k = 0.6)과 공기(k = 0.026)는 아주 느려요. 시험관 윗물이 끓어도 아래 얼음이 녹지 않아요.</li>' +
        '<li><b>대류</b>: 더워진 유체는 가벼워져 올라가고 찬 유체는 내려와 순환하며 열을 날라요. <b>액체·기체(유체)에서만</b> 일어나요. 난방기는 아래, 에어컨은 위에 두는 까닭이에요.</li>' +
        '<li><b>복사</b>: 열이 전자기파로 직접 전달돼요. 진공에서도 일어나고(햇빛), 은박은 복사를 반사해요.</li>' +
        '<li><b>진공 보온병</b>: 이중벽 사이 진공이 전도·대류를, 은도금이 복사를 막아요.</li></ul>',
      missions: [
        {
          title: '세 장면 실행하고 열 전달 방식 판정하기',
          goal: '<b>⚗️ 전도</b>, <b>🌊 대류</b>, <b>☀️ 복사</b> 세 장면을 각각 ▶ 실행한 뒤, 이 장면에서 일어나는 열 전달 방식을 골라 판정표 세 줄을 모두 채우세요.',
          hint: '장면 위쪽 버튼으로 화면을 바꾸고 ▶ 실행(약 8초)을 끝까지 본 뒤 아래 판정 버튼을 눌러요. 물이 움직이는지, 사이에 물질이 있는지를 살펴보세요.',
          setup() { resetSc(); S.judged = { cond: false, conv: false, rad: false }; setScene('cond'); },
          check: () => S.judged.cond && S.judged.conv && S.judged.rad,
          hold: 0.5,
          status: () => mark(S.judged.cond) + ' 시험관 윗부분 가열 &nbsp; ' + mark(S.judged.conv) + ' 비커·방 안 공기 &nbsp; ' + mark(S.judged.rad) + ' 햇빛과 가림판',
          explain: '시험관: 물 분자 사이에서 열이 <b>전도</b>되지만 물은 열을 잘 못 전해 아래 얼음이 그대로예요. 비커·방: 더운 물·공기가 올라가고 찬 것이 내려오는 <b>대류</b>예요. 햇빛: 사이에 물질이 없어도 전해지는 <b>복사</b>이고, 은박이 반사해서 막아요.',
        },
        {
          type: 'quiz', title: '진공 보온병이 막는 열 전달',
          goal: '진공 보온병(이중벽 사이는 진공, 안쪽 벽은 은도금)은 전도·대류·복사 중 무엇을 막을까요?',
          setup() { setScene('rad'); },
          choices: ['전도와 대류만 막고 복사는 못 막아요', '진공이 복사까지 모두 막아요. 은도금은 장식이에요', '진공은 전도와 대류를 막고, 은도금은 복사를 반사해 막아요. 세 가지를 모두 막아요', '진공에서도 대류는 일어나서 막지 못해요 (대류는 고체에서도 일어나요)'],
          answer: 2,
          feedback: ['복사는 진공에서도 전달되므로 막으려면 은도금이 필요해요.', '복사는 진공을 지나가요(햇빛이 우주를 건너오듯). 그래서 은도금으로 반사시켜요.', '', '대류는 액체·기체에서만 일어나요. 고체에서는 일어나지 않고, 진공에는 움직일 물질이 없어요.'],
          explain: '진공에는 전도와 대류를 일으킬 물질이 없어서 이 둘을 막고, 복사는 <b>은도금</b>이 반사해 막아요. 그래서 보온병은 뜨거운 것은 뜨겁게, 찬 것은 차게 오래 지켜 줘요.',
        },
      ],
    },
    {
      title: '단열재 비교: 공기를 가둔 재료', short: '단열재 비교', icon: '🥫', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 열은 전도·대류·복사로 전달되고 공기는 열을 잘 전도하지 못한다는 것을 알았어요. 같은 캔에 서로 다른 단열재를 둘러 보온·보냉 효과를 비교해요.</div>' +
        '<p>같은 캔 여섯 개에 <b>80 °C 물 200 mL</b>를 담고 단열재를 둘러요(없음, 알루미늄 포일, 신문지, 스티로폼, 유리솜, 진공 보온병). 20분을 빠르게 돌려 온도 곡선을 비교하고, 보냉에서도 같은 순위인지 확인해요.</p>',
      features: ['cans'],
      setup() { S.cn.mode = 'hot'; cnReset(); S.cn.done = { hot: false, cold: false }; S.cn.same = 0; S.cn.mag = 3; S.ordC = [2, 5, 0, 4, 1, 3]; S.ordBadC = {}; ordSigC.v = ''; setFlag('rank', false); setFlag('same', false); setScene('cans'); },
      recap: '스티로폼과 유리솜은 열전도율이 낮은 공기를 많이 가둬서 단열이 잘 돼요. 보온 순위와 보냉 순위는 같아요 (진공 보온병 > 유리솜 > 스티로폼 > 신문지 > 포일 > 없음).',
      summary: '<ul><li>80 °C 물 200 mL를 20분 둔 뒤 온도: 없음 51 °C, 포일 56 °C, 신문지 62 °C, 스티로폼 69 °C, 유리솜 70 °C, 진공 보온병 77 °C. 곡선은 지수적으로 식어 실내 온도 20 °C에 가까워져요.</li>' +
        '<li>얼음 100 g의 30분 뒤 녹은 질량: 없음 62 g, 포일 50 g, 신문지 38 g, 스티로폼 22 g, 유리솜 20 g. <b>보온에서 좋은 재료는 보냉에서도 좋아요</b> (열이 드나드는 길을 막는 것은 같아요).</li>' +
        '<li><b>스티로폼·유리솜</b>은 속에 <b>공기를 많이 가둬</b>요(공기 k = 0.026). 공기가 갇혀 움직이지 못해 전도도 대류도 작아요. 두껍고 단단하다고 단열이 잘 되는 것은 아니에요.</li>' +
        '<li>알루미늄 포일은 복사를 일부 반사하지만 얇아서 효과가 작아요. 진공 보온병은 전도·대류·복사를 모두 줄여 가장 좋아요.</li></ul>',
      missions: [
        {
          title: '보온 곡선 기록하고 순위 정하기',
          goal: '<b>🔥 보온</b>에서 <b>▶ 실험 시작</b>으로 20분 곡선을 끝까지 기록한 뒤, 단열재 카드를 <b>20분 뒤 물이 가장 따뜻한 순서</b>(위가 가장 따뜻)로 정렬하세요.',
          hint: '실험이 끝나면 각 캔 아래 온도와 그래프 끝점을 읽어요. 스티로폼(69)과 유리솜(70)처럼 비슷한 것은 숫자를 비교해요.',
          setup() { S.cn.mode = 'hot'; cnReset(); S.cn.done = { hot: false, cold: false }; S.ordC = [2, 5, 0, 4, 1, 3]; S.ordBadC = {}; ordSigC.v = ''; setFlag('same', false); setFlag('rank', true); setScene('cans'); },
          check: () => S.cn.done.hot && ordV(S.ordC, RULES_C).length === 0,
          hold: 0.6,
          status: () => mark(S.cn.done.hot) + ' 보온 실험 완료 &nbsp; ' + (ordV(S.ordC, RULES_C).length ? '맞지 않는 쌍 ' + ordV(S.ordC, RULES_C).length + '개' : '✅ 순위 맞음'),
          explain: '20분 뒤 온도는 <b>진공 보온병 77 °C > 유리솜 70 °C > 스티로폼 69 °C > 신문지 62 °C > 포일 56 °C > 없음 51 °C</b> 순이에요. 곡선이 완만할수록 열이 천천히 빠져나가는 좋은 단열재예요.',
        },
        {
          title: '보냉에서도 같은 순위인지 확인하기',
          goal: '<b>🧊 보냉</b>으로 바꿔 <b>▶ 실험 시작</b>을 끝까지 본 뒤, 녹은 얼음이 적은 순서가 보온 순위와 <b>같은지 달라요</b>를 고르세요.',
          hint: '얼음 100 g을 30분 둔 뒤 녹은 질량이 적을수록 좋은 단열재예요. 유리솜 20 g, 스티로폼 22 g, 신문지 38 g, 포일 50 g, 없음 62 g이에요.',
          setup() { S.cn.mode = 'cold'; cnReset(); S.cn.done.cold = false; S.cn.same = 0; setFlag('rank', false); setFlag('same', true); setScene('cans'); },
          check: () => S.cn.done.cold && S.cn.same === 1,
          hold: 0.6,
          status: () => mark(S.cn.done.cold) + ' 보냉 실험 완료 &nbsp; ' + (S.cn.same === 1 ? '✅ 순위 비교' : S.cn.same === 2 ? '❌ 다시 비교해 보세요' : '⬜ 순위 비교'),
          explain: '녹은 얼음이 적은 순서는 유리솜 20 g > 스티로폼 22 g > 신문지 38 g > 포일 50 g > 없음 62 g으로 <b>보온 순위와 같아요</b>. 열이 안으로 들어오든 밖으로 나가든 막는 재료는 같기 때문이에요.',
        },
        {
          type: 'quiz', title: '스티로폼과 유리솜이 단열을 잘하는 까닭',
          goal: '스티로폼과 유리솜이 열을 잘 막는 까닭으로 알맞은 것은?',
          setup() { setFlag('rank', false); setFlag('same', false); setScene('cans'); },
          choices: ['두껍고 단단해서 열이 뚫고 지나가기 어려워요', '열전도율이 낮은 공기를 많이 가둬서 전도와 대류가 모두 작아요', '차가운 성질이 있어서 열을 식혀요', '표면이 반짝여서 모든 열을 반사해요'],
          answer: 1,
          feedback: ['두껍고 단단한 것이 아니라 속에 갇힌 공기가 핵심이에요. 단단한 콘크리트(k = 1.4)보다 스티로폼(k = 0.035)이 훨씬 잘 막아요.', '', '단열재가 열을 식히는 것이 아니라 열의 이동을 느리게 해요.', '반짝이는 것은 포일이에요. 스티로폼·유리솜은 공기를 가두는 구조로 막아요.'],
          explain: '스티로폼과 유리솜 속에는 <b>작은 공기 방울·섬유 사이 공기</b>가 많아요. 공기의 열전도율(0.026 W/m·K)이 매우 작고, 작은 틈에 갇혀 움직이지 못해 <b>대류도 거의 없어요</b>. 그래서 열이 천천히 지나가요.',
        },
      ],
    },
    {
      title: '건축 단열: 벽과 창', short: '건축 단열', icon: '🧱', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 열전도율이 작은 재료가 단열이 잘 된다는 것을 알았어요. 이제 건물의 <b>벽과 창</b>에서 열이 얼마나 빠져나가는지 비교용 식으로 계산해요. 정확한 설계 계산이 아니라 <b>비교</b>가 목적이에요.</div>' +
        '<p>벽을 지나는 열의 양은 <b>P = A·ΔT / Σ(L/k)</b>예요(면적과 온도 차에 비례, 층마다 L/k를 더해요). 창은 열 관류율 U로 <b>P = U·A·ΔT</b>예요. 벽 10 m², 창 2 m², 실내–실외 온도 차 20 °C로 계산해요.</p>',
      features: ['wall', 'window'],
      setup() { S.wl.t = 0; S.wl.place = 'out'; S.wl.gap = 1.0; S.wallOk = { half: false, tenth: false }; dwell.half = 0; dwell.tenth = 0; setFlag('win', false); setScene('wall'); },
      recap: '벽의 열 손실은 P = AΔT/Σ(L/k)로 단열재를 더하면 크게 줄어요(콘크리트 20 cm만 1400 W → 스티로폼 10 cm 더하면 약 67 W). 창은 U가 작을수록 열을 덜 잃고, 이중창의 공기층은 약 2 cm까지만 효과가 커요.',
      summary: '<ul><li>벽: <b>P = A·ΔT / Σ(L/k)</b>. 콘크리트 20 cm는 L/k = 0.143이라 10 m², 20 °C에서 P = 1400 W예요. 스티로폼(k = 0.035) 10 cm를 더하면 L/k = 0.143 + 2.857 = 3.0이라 P = 67 W(약 1/21)예요. 직렬로 이어진 층은 L/k를 더해요.</li>' +
        '<li>창 2 m², ΔT 20 °C: 홑유리(U = 5.8) 232 W, 이중 유리(2.8) 112 W, 로이 코팅 아르곤 이중 유리(1.4) 56 W, 삼중 유리(0.8) 32 W. 창은 벽보다 열을 훨씬 잘 잃어요.</li>' +
        '<li><b>바깥 단열(외단열)</b>: 단열재를 바깥에 대면 콘크리트가 실내 쪽에 남아 따뜻하게 유지돼 열을 저장하고 벽 속이 차가워지는 것을 줄여요. 같은 두께면 열 손실(P)은 같아요.</li>' +
        '<li>이중창의 <b>공기층</b>은 약 2 cm까지는 두꺼울수록 좋지만, 그보다 두꺼우면 안에서 대류가 생겨 더 나아지지 않아요.</li>' +
        '<li>한옥: 온돌(전도·복사로 바닥을 데움), 대청마루(통풍으로 대류 냉각), 처마(여름 높은 해는 가리고 겨울 낮은 해는 들임).</li></ul>',
      missions: [
        {
          title: '열 손실이 절반, 1/10이 되는 두께 찾기',
          goal: '단열재 두께를 0.5 cm씩 바꿔 열 손실이 처음으로 <b>1/2 이하(700 W)</b>가 되는 두께와 처음으로 <b>1/10 이하(140 W)</b>가 되는 두께에 각각 슬라이더를 맞춰 잠시 멈추세요.',
          hint: 'P = 200 / (0.143 + 두께(m) / 0.035). 두께를 조금씩 올리며 아래 막대와 P를 보세요. 700 W는 매우 얇은 두께에서, 140 W는 몇 cm에서 나와요.',
          setup() { S.wl.t = 3; S.wallOk = { half: false, tenth: false }; dwell.half = 0; dwell.tenth = 0; setFlag('win', false); setScene('wall'); },
          check: () => S.wallOk.half && S.wallOk.tenth,
          hold: 0.4,
          status: () => mark(S.wallOk.half) + ' 1/2 이하가 되는 최소 두께 &nbsp; ' + mark(S.wallOk.tenth) + ' 1/10 이하가 되는 최소 두께',
          explain: '콘크리트만 1400 W인데 스티로폼 <b>0.5 cm</b>만 더해도 L/k = 0.143 + 0.143 = 0.286이라 P = <b>700 W(1/2)</b>예요. <b>4.5 cm</b>이면 L/k = 1.429이라 P = <b>140 W(1/10)</b>이고, 10 cm이면 67 W예요. 처음 몇 cm가 가장 효과가 커요.',
        },
        {
          title: '창 네 종류의 열 손실 계산하기', manual: true,
          goal: '창 2 m², ΔT = 20 °C일 때 U가 5.8, 2.8, 1.4, 0.8인 네 창의 열 손실 <b>P = U × A × ΔT</b>(W)를 계산해 입력하고 ✔ 확인하기를 누르세요.',
          hint: 'P = U × 2 × 20 = 40U (W). 예: U = 3.0이면 120 W예요.',
          setup() { clr('iW0', 'iW1', 'iW2', 'iW3'); setFlag('win', true); setScene('window'); },
          check() {
            const xs = ['iW0', 'iW1', 'iW2', 'iW3'].map(num);
            if (xs.some((x) => x == null)) return '네 칸에 모두 숫자를 입력해 주세요 (W).';
            const ans = WINS.map((w) => winP(w.U)), oks = xs.map((x, i) => Math.abs(x - ans[i]) <= Math.max(2, ans[i] * 0.03));
            fb(oks.map((o, i) => [$('#iW' + i), o]));
            if (oks.every(Boolean)) return true;
            const i = oks.findIndex((o) => !o); if (Math.abs(xs[i] - ans[i] / 2) <= ans[i] * 0.04) return '붉은 칸은 절반이에요. 창 넓이 A = 2 m²를 곱했는지 확인해요.';
            return 'P = U × A × ΔT에 A = 2 m², ΔT = 20 °C를 넣어요. 붉은 칸을 다시 계산해 보세요.';
          },
          status: () => '입력 ' + ['iW0', 'iW1', 'iW2', 'iW3'].filter((id) => $('#' + id).value.trim()).length + ' / 4',
          explain: 'P = U × 2 × 20: 홑유리 5.8 → <b>232 W</b>, 이중 2.8 → <b>112 W</b>, 로이 이중 1.4 → <b>56 W</b>, 삼중 0.8 → <b>32 W</b>예요. 삼중 유리는 홑유리의 약 1/7만 열을 잃어요.',
        },
        {
          type: 'quiz', title: '단열재를 벽 바깥쪽에 대면 좋은 점',
          goal: '같은 두께의 단열재를 벽의 <b>바깥쪽</b>에 대는 것(외단열)이 안쪽에 대는 것보다 좋은 점은? (🧱 건축 단열 화면에서 단열재 위치를 바꿔 온도 분포를 비교해 보세요.)',
          setup() { setFlag('win', false); S.wl.t = 5; setScene('wall'); },
          choices: ['바깥에 대면 열 손실(P)이 더 작아요', '콘크리트가 실내 쪽에 남아 따뜻하게 유지돼 열을 저장하고, 벽 속이 차가워지는 것을 줄여요 (P는 같아요)', '바깥에 대면 햇빛이 더 많이 들어와요', '단열재 위치는 온도 분포에 아무 영향이 없어요'],
          answer: 1,
          feedback: ['같은 두께면 Σ(L/k)가 같아서 열 손실 P는 같아요. 달라지는 것은 벽 속의 온도 분포예요.', '', '햇빛과는 관계없어요. 단열재의 위치가 벽 속 온도 분포를 바꿔요.', '온도 분포 그래프를 보세요. 안쪽 단열이면 콘크리트가 바깥처럼 차갑고, 바깥 단열이면 실내처럼 따뜻해요.'],
          explain: '열 손실 P = AΔT/Σ(L/k)는 층의 순서와 상관없이 같아요. 하지만 <b>바깥 단열</b>이면 콘크리트가 실내 쪽(약 20 °C)에 있어 열을 저장하고, 벽 속이 차가워져 물방울이 맺히는 것도 줄어요. 그래서 현대 건축에서는 외단열을 많이 써요.',
        },
      ],
    },
    {
      title: '열팽창과 설계: 단열 집 짓기', short: '열팽창', icon: '📏', phase: '적용',
      intro: '<div class="si-link">🔗 <b>중학교에서</b> 금속이 가열되면 길이가 늘어나고(열팽창), 바이메탈은 두 금속의 늘어나는 정도가 달라 휜다고 배웠어요. 이번에는 <b>선팽창 ΔL = αLΔT</b>로 얼마나 늘어나는지 계산하고, 마지막으로 단열 집을 직접 설계해요.</div>' +
        '<p>철도 레일과 다리의 이음 틈, 바이메탈 경보기를 보고 팽창을 계산한 뒤, 예산 안에서 벽 단열재·창·처마를 골라 <b>겨울에는 따뜻하고 여름에는 시원한 집</b>을 만들어요. 정답은 하나가 아니에요.</p>',
      features: ['expand', 'house'],
      setup() { S.ex.app = 'rail'; S.ex.mat = 0; S.ex.T = -15; S.hs.ins = 0; S.hs.win = 0; S.hs.eave = 0; clr('iX1', 'iX2'); setFlag('ex', false); setScene('expand'); },
      recap: '고체는 온도가 오르면 길이가 ΔL = αLΔT만큼 늘어나서 레일과 다리에 틈을 두고, 바이메탈은 늘어남의 차이로 휘어요. 집은 단열재·창·처마를 조합해 겨울 열 손실과 여름 햇빛 유입을 함께 줄일 수 있어요.',
      summary: '<ul><li><b>선팽창</b>: ΔL = α·L·ΔT. α(×10⁻⁵ /°C): 철·강철 1.2, 알루미늄 2.3, 구리 1.7, 콘크리트 1.0, 유리 0.9.</li>' +
        '<li>철도 레일 25 m, 서울의 연교차 −15 ~ 35 °C(ΔT = 50 °C): ΔL = 1.2 × 10⁻⁵ × 25 × 50 = 0.015 m = <b>15 mm</b>라 이음 틈을 두어요. 콘크리트 다리 100 m: 1.0 × 10⁻⁵ × 100 × 50 = <b>5.0 cm</b>라 신축 이음을 둬요.</li>' +
        '<li>여름에 전깃줄이 처지는 것도, 뜨거운 병뚜껑이 쉽게 열리는 것도 열팽창 때문이에요. <b>바이메탈</b>은 두 금속의 α가 달라 온도가 오르면 한쪽으로 휘어 경보기·온도 조절 스위치에 써요.</li>' +
        '<li><b>집 설계</b>: 벽 단열재(두꺼울수록 열 손실 감소), 창(U가 작을수록 좋음), 처마(여름의 높은 해는 가리고 겨울의 낮은 해는 들임)를 예산 안에서 조합해요.</li></ul>',
      missions: [
        {
          title: '레일과 다리의 늘어남 계산하기', manual: true,
          goal: '철 레일 25 m의 ΔL(mm)과 콘크리트 다리 100 m의 ΔL(cm)을 연교차 <b>ΔT = 50 °C</b>(−15 → 35 °C)에서 <b>ΔL = α·L·ΔT</b>로 계산해 입력하고 ✔ 확인하기를 누르세요.',
          hint: '철 α = 1.2 × 10⁻⁵ /°C, 콘크리트 α = 1.0 × 10⁻⁵ /°C. 레일: 1.2 × 10⁻⁵ × 25 × 50 (m) → mm로 바꿔요. 다리: 1.0 × 10⁻⁵ × 100 × 50 (m) → cm로 바꿔요.',
          setup() { S.ex.app = 'rail'; S.ex.mat = 0; S.ex.T = 35; clr('iX1', 'iX2'); setFlag('ex', true); setScene('expand'); },
          check() {
            const a = num('iX1'), b = num('iX2');
            if (a == null || b == null) return '두 칸에 모두 숫자를 입력해 주세요.';
            const ok1 = Math.abs(a - 15) <= 1, ok2 = Math.abs(b - 5) <= 0.3; fb([[$('#iX1'), ok1], [$('#iX2'), ok2]]);
            if (ok1 && ok2) return true;
            if (!ok1 && Math.abs(a - 0.015) < 0.002) return '레일은 mm 단위예요. 0.015 m는 15 mm예요.';
            if (!ok2 && Math.abs(b - 0.05) < 0.005) return '다리는 cm 단위예요. 0.05 m는 5.0 cm예요.';
            return 'ΔL = α × L × ΔT에 ΔT = 50 °C를 넣어요 (m로 구한 뒤 단위를 바꿔요).';
          },
          status: () => '입력 ' + ($('#iX1').value.trim() || '—') + ' mm, ' + ($('#iX2').value.trim() || '—') + ' cm',
          explain: '레일: ΔL = 1.2 × 10⁻⁵ × 25 × 50 = 0.015 m = <b>15 mm</b>. 다리: ΔL = 1.0 × 10⁻⁵ × 100 × 50 = 0.050 m = <b>5.0 cm</b>. 그래서 레일 이음에는 약 15 mm의 틈을, 다리에는 신축 이음을 둬요.',
        },
        {
          title: '단열 집 설계하기',
          goal: '단열재 두께, 창 종류, 처마 길이를 골라 <b>겨울 난방 열 손실 500 W 이하</b>, <b>여름 햇빛 유입 400 W 이하</b>, <b>비용 18점 이하</b>를 모두 만족하는 집을 만드세요.',
          hint: '난방 손실은 벽·창을 줄이고, 여름 햇빛은 처마로 막아요(처마가 너무 길면 겨울 햇빛도 가려요). 예: 단열재 6 cm, 이중 유리, 처마 40 cm 근처에서 시작해 보세요. 정답은 하나가 아니에요.',
          setup() { setFlag('ex', false); S.hs.ins = 0; S.hs.win = 0; S.hs.eave = 0; setScene('house'); },
          check: () => houseCalc(S.hs).ok,
          hold: 1.0,
          status: () => { const r = houseCalc(S.hs); return mark(r.heat <= HS_LIM.heat) + ' 난방 ' + Math.round(r.heat) + ' W &nbsp; ' + mark(r.summer <= HS_LIM.summer) + ' 여름 ' + Math.round(r.summer) + ' W &nbsp; ' + mark(r.cost <= HS_LIM.cost) + ' 비용 ' + Math.round(r.cost) + '점'; },
          explain: '단열재(벽의 L/k)와 창(U)을 줄이면 겨울 열 손실이 줄고, <b>처마</b>는 높이 뜬 여름 해(76°)는 막고 낮은 겨울 해(29°)는 들여요(약 40 cm에서 여름 창이 거의 그늘). 예산 안에서 무엇을 더 투자할지 고르는 것이 설계예요. 정답은 하나가 아니에요.',
        },
        {
          type: 'quiz', title: '철도 레일 사이에 틈을 두는 까닭',
          goal: '철도 레일을 이을 때 사이에 작은 틈을 두는 까닭은?',
          setup() { setFlag('ex', false); S.ex.app = 'rail'; S.ex.T = 20; setScene('expand'); },
          choices: ['여름에 햇빛을 받아 레일이 늘어나도 휘지 않게 하려고요', '레일이 겨울에 늘어나서 틈이 필요해서요', '열차 소리를 줄이려고요 (온도와는 관계없어요)', '레일이 길면 무거워서 중간에 끊어야 해서요'],
          answer: 0,
          feedback: ['', '고체는 가열되면 늘어나고 차가워지면 줄어들어요. 틈이 필요한 것은 더운 여름이에요.', '소리가 줄어드는 효과는 부수적이에요. 틈의 목적은 열팽창이에요.', '무게가 아니라 온도에 따른 길이 변화 때문이에요.'],
          explain: '여름에 레일이 열을 받으면 ΔL = αLΔT만큼 늘어나요(25 m, 50 °C 차이에서 15 mm). 틈이 없으면 레일이 서로 밀어 <b>휘어</b> 위험해요. 같은 까닭으로 여름에 전깃줄이 처지고 다리에는 신축 이음을 둬요.',
        },
      ],
    },
  ];
  const dwell = { half: 0, tenth: 0 };

  game = SciSim.game({
    simId: 'hm-insulation', mount: '#game', badge: '단열 박사', homeHref: '../../index.html#hm',
    featureLabels: { cond: '⚗️ 전도 · 물속 열 전달', conv: '🌊 대류 · 비커와 방 안 공기', rad: '☀️ 복사 · 유리와 은박', cans: '🥫 단열재 비교 · 보온과 보냉', wall: '🧱 벽 단면 · 열 손실', window: '🪟 창과 공기층', expand: '📏 선팽창 · 레일·다리·바이메탈', house: '🏠 단열 집 설계' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('cond');
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    scStep(dt); cnStep(dt);
    // 슬라이더가 정해진 값에서 잠시 멈추면 인정
    dwell.half = Math.abs(S.wl.t - 0.5) < 1e-6 ? dwell.half + dt : 0; dwell.tenth = Math.abs(S.wl.t - 4.5) < 1e-6 ? dwell.tenth + dt : 0;
    if (dwell.half > 0.7 && !S.wallOk.half) { S.wallOk.half = true; Sound.click(); } if (dwell.tenth > 0.7 && !S.wallOk.tenth) { S.wallOk.tenth = true; Sound.click(); }
    renderOrderC();
    switch (S.mode) {
      case 'cond': drawCond(dt); break;
      case 'conv': drawConv(dt); break;
      case 'rad': drawRad(dt); break;
      case 'cans': drawCans(dt); break;
      case 'wall': drawWall(dt); break;
      case 'window': drawWindow(dt); break;
      case 'expand': drawExpand(dt); break;
      default: drawHouse(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, scRun, judge, cnRun, houseCalc, wallP, winP, exDL, ordV, RULES_C, HS_LIM, MAT, hotT, meltM,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { scStep(0.02); cnStep(0.02); } },
  };
})();
