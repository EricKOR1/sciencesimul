/* =========================================================
   역학과 에너지 Ⅱ. 열과 에너지 - 열기관의 순환 (5차시)
   성취기준 [12역학02-04] 다양한 열기관에서의 순환 과정과 열효율을 설명하고, 열기관의 개발과 활용이 인류 공동체에 미친 영향을 산업발전과 환경 측면에서 평가할 수 있다.
   ① 관찰: 순환 과정 (엔진 한 사이클 A→B→C→D→A, P–V 그래프의 닫힌 경로, 한 번의 팽창과의 비교)
   ② 탐구: 열과 일 (경로로 둘러싸인 넓이 = 알짜 일 W, W = Q_h − Q_c, e = W/Q_h, 시계/반시계 = 열기관/냉장고)
   ③ 분석: 효율 높이기 (열기관의 역사와 효율, 효율 향상 방법)
   ④ 평가: 영향 평가 (산업발전/환경 분류, 발전 방식별 효율과 CO2)
   한 사이클(예시): 이상화한 가솔린 엔진, Q_h = 2000 J, Q_c = 1400 J, W = 600 J (그래프 한 칸 = 1 L x 1 x 10^5 Pa = 100 J), e = 30 %.
   카르노 효율식, 오토/디젤 사이클의 효율식, 압축비에 의한 계산, 제2법칙의 식은 다루지 않아요.
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
  const BG = '#eef2fa';
  const INK = '#26324a', MUTED = '#5a6679';
  const BLUE = '#2563eb', RED = '#e2464b', GREEN = '#14a058', ORANGE = '#f59e0b', PURPLE = '#7c3aed';

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
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3800);
  }
  const approach = (a, b, dt, k) => (RM ? b : SciSim.approach(a, b, dt, k));
  const topCard = () => ({ x: 6, y: 6, w: VW - 12, h: SH - 12 });
  const fN = (v) => { const r = Math.round(v); return (r < 0 ? MINUS : '') + Math.abs(r).toLocaleString('en-US'); };
  const f1 = (x) => { const r = Math.round(x * 10) / 10; return (r < 0 ? MINUS : '') + Math.abs(r).toFixed(1); };
  const fS = (v) => { const r = Math.round(v); return (r > 0 ? '+' : r < 0 ? MINUS : '') + Math.abs(r).toLocaleString('en-US'); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const num = (id) => { const v = $('#' + id).value.trim().replace(/[, ]/g, '').replace(/−/g, '-'); return v === '' || !isFinite(+v) ? null : +v; };
  function cardBegin(c, a, b) {
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    const g = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); g.addColorStop(0, a || '#f4f7fd'); g.addColorStop(1, b || '#dde5f3'); ctx.fillStyle = g; ctx.fillRect(c.x, c.y, c.w, c.h);
  }
  function wrapLines(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    str.split(' ').forEach((wd) => { const t2 = line ? line + ' ' + wd : wd; if (ctx.measureText(t2).width > maxW && line) { out.push(line); line = wd; } else line = t2; });
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function para(x, y, str, maxW, size, color, lh, weight, align) {
    const ls = wrapLines(str, maxW, size, weight);
    ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
    return ls.length * lh;
  }

  /* ================= 자료: 이상화한 가솔린 엔진의 한 사이클 ================= */
  // 그래프 단위: P (x 10^5 Pa), V (L) → 한 칸 = 100 J
  const GAM = 1.4, VA = 6.1, VB = 2.5, PA = 1.0, QH = 2000;
  const PB = PA * Math.pow(VA / VB, GAM);
  const PC = PB + (QH / 100) / (2.5 * VB);
  const PD = PC * Math.pow(VB / VA, GAM);
  const WCD_RAW = (PC * VB - PD * VA) / (GAM - 1) * 100, WAB_RAW = -(PB * VB - PA * VA) / (GAM - 1) * 100;
  const WNET = Math.round((WCD_RAW + WAB_RAW) / 10) * 10;      // 600 J
  const QC = QH - WNET;                                        // 1400 J
  const WCD = Math.round(WCD_RAW), WAB = WNET - WCD;           // +1254, −654
  const EFF = Math.round(WNET / QH * 100);                     // 30 %
  const SEG = [
    { k: 'comp', name: '단열 압축', ab: 'A→B', from: 'A', to: 'B', col: '#2563eb', Q: 0, W: WAB, dU: -WAB, tag: '압축', desc: '피스톤이 올라가 기체를 눌러요. 외부가 기체에 일을 해 줘요 (W < 0).' },
    { k: 'heat', name: '등적 가열', ab: 'B→C', from: 'B', to: 'C', col: '#e2464b', Q: QH, W: 0, dU: QH, tag: '연소', desc: '점화! 연료가 타서 부피 일정한 채 열 Q_h를 흡수해요.' },
    { k: 'exp', name: '단열 팽창', ab: 'C→D', from: 'C', to: 'D', col: '#f59e0b', Q: 0, W: WCD, dU: -WCD, tag: '팽창', desc: '뜨거운 기체가 팽창해 피스톤을 밀어요. 기체가 일을 해요 (W > 0).' },
    { k: 'cool', name: '등적 냉각', ab: 'D→A', from: 'D', to: 'A', col: '#7c3aed', Q: -QC, W: 0, dU: -QC, tag: '배기', desc: '배기: 부피 일정한 채 열 Q_c를 버리고 처음 상태 A로 돌아와요.' },
  ];
  const ez = (f) => (1 - Math.cos(Math.PI * clamp(f, 0, 1))) / 2;
  function pos(s) {
    s = ((s % 4) + 4) % 4; const k = Math.min(3, Math.floor(s)), f = s - k, e = ez(f); let V, P;
    if (k === 0) { V = VA + (VB - VA) * e; P = PA * Math.pow(VA / V, GAM); }
    else if (k === 1) { V = VB; P = PB + (PC - PB) * e; }
    else if (k === 2) { V = VB + (VA - VB) * e; P = PC * Math.pow(VB / V, GAM); }
    else { V = VA; P = PD + (PA - PD) * e; }
    return { V, P, k, f, T: P * V };
  }
  const LOOP = []; for (let k = 0; k < 4; k++) for (let i = 0; i <= 40; i++) { const q = pos(k + i / 40 * 0.9999); LOOP.push({ V: q.V, P: q.P, k }); }
  function inLoop(V, P) {
    let c = false;
    for (let i = 0, j = LOOP.length - 1; i < LOOP.length; j = i++) {
      const a = LOOP[i], b = LOOP[j];
      if ((a.P > P) !== (b.P > P) && V < (b.V - a.V) * (P - a.P) / (b.P - a.P) + a.V) c = !c;
    }
    return c;
  }
  const XMAX = 7, YMAX = 8;
  /* 격자 세기: 칸마다 경로 안쪽에 들어온 부분(0.1칸 단위로 반올림)을 보여 줘요 */
  function cellCover() {
    const cells = []; let area = 0, shown = 0; const NS = 20;
    for (let i = 0; i < XMAX; i++) for (let j = 0; j < YMAX; j++) {
      let cnt = 0;
      for (let a = 0; a < NS; a++) for (let b = 0; b < NS; b++) if (inLoop(i + (a + 0.5) / NS, j + (b + 0.5) / NS)) cnt++;
      const f = cnt / (NS * NS); area += f;
      const r = Math.round(f * 10) / 10;
      if (r > 0) { cells.push({ i, j, f, r }); shown += r; }
    }
    return { cells, area, shown };
  }
  const CELLS = cellCover();

  /* ================= 상태 ================= */
  const HIST = [
    { ic: '🫖', n: '뉴커먼 증기 기관', y: '1712', lo: 1, hi: 1, txt: '1 % 안팎' },
    { ic: '🚂', n: '와트의 증기 기관', y: '1769', lo: 3, hi: 3, txt: '약 3 %' },
    { ic: '🚗', n: '가솔린 기관', y: '1876', lo: 25, hi: 30, txt: '25~30 %' },
    { ic: '🚛', n: '디젤 기관', y: '1897', lo: 35, hi: 40, txt: '35~40 %' },
    { ic: '🛫', n: '가스 터빈', y: '1939', lo: 35, hi: 40, txt: '35~40 %' },
    { ic: '🏭', n: '복합 화력 발전', y: '1949', lo: 55, hi: 60, txt: '55~60 %' },
  ];
  const DISP = [3, 0, 5, 2, 4, 1];        // 화면에 놓이는 순서 (섞어 둠)
  const IMP = [
    { ic: '🏭', n: '산업혁명', d: '공장·철도·증기선으로 생산과 이동이 빨라졌어요', ans: [1] },
    { ic: '✈️', n: '자동차·항공기', d: '사람과 물건의 이동 거리가 크게 늘었어요', ans: [1] },
    { ic: '💡', n: '전기의 대량 공급', d: '발전소가 만든 전기가 생활과 산업을 바꿨어요', ans: [1] },
    { ic: '🛢️', n: '화석 연료 고갈', d: '석탄·석유·가스는 쓸수록 줄어드는 자원이에요', ans: [2, 4] },
    { ic: '🌫️', n: '대기오염', d: '공장과 자동차의 배기가스가 도시 공기를 나쁘게 해요', ans: [4] },
    { ic: '🌡️', n: 'CO₂ 증가·온난화', d: '연료를 태우면 CO₂가 늘어 지구 평균 기온이 올라요', ans: [4] },
    { ic: '🏙️', n: '도시 열섬', d: '기관과 발전소의 폐열이 도시를 더 덥게 해요', ans: [4] },
    { ic: '♻️', n: '열효율 향상', d: '열효율이 높아지면 같은 일에 연료와 CO₂가 줄어요', ans: [1, 3] },
  ];
  const CAT_NAME = ['❓ 눌러서 분류', '🏭 산업발전 👍', '🏭 산업발전 👎', '🌍 환경 👍', '🌍 환경 👎'];
  const CAT_COL = ['#9aa6bd', '#15803d', '#b91c1c', '#15803d', '#b91c1c'];
  const SRC = [
    { id: 'coal', n: '석탄 화력', ic: '🪨', eff: '약 40 %', co2: 0.9, e: 40, key: 'x' },
    { id: 'lng', n: 'LNG 복합', ic: '🔥', eff: '55~60 %', co2: 0.4, e: 57.5, key: 'a' },
    { id: 'ren', n: '풍력·태양광', ic: '🌬️', eff: '열기관이 아니에요', co2: 0, e: 0, key: 'b' },
  ];
  const SEG_OPT = [['', '고르세요'], ['comp', '단열 압축'], ['heat', '등적 가열 (연소)'], ['exp', '단열 팽창 (동력)'], ['cool', '등적 냉각 (배기)']];
  const ZONES = ['① 기관 안의 마찰·열 누설', '② 연소 온도와 배출 온도', '③ 버려지는 배기가스의 열', '④ 브레이크로 사라지는 운동 에너지'];
  const METHODS = [
    { n: '배기열을 다시 이용하기', z: 2 },
    { n: '회생 제동 (하이브리드)', z: 3 },
    { n: '마찰·열 누설 줄이기', z: 0 },
    { n: '연소 온도 높이고 배출 온도 낮추기', z: 1 },
  ];

  const S = {
    mode: 'engine', clock: 0, fade: 0,
    cy: { s: 0, run: false, stepTo: null, acc: 0, cycles: 0, once: false, onceDone: false },
    en: { dir: 'cw', s: 0, grid: false, vis: 0 },
    hi: { placed: [], shake: -1, shakeT: 0, ok: false },
    im: { cat: [0, 0, 0, 0, 0, 0, 0, 0], w: 50, src: '', flip: -1 },
    segSel: ['', '', '', ''], match: ['', '', '', ''],
    flags: { seg: false, dir: false, w: false, e: false, match: false, src: false, wOK: false, eOK: false, impOK: false, ordOK: false },
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const revealed = (k) => (game && game.free) || S.flags[k];
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const MODES = ['engine', 'energy', 'history', 'impact'];
  const ALLOWED = [['engine'], ['energy'], ['history'], ['impact']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; parts.clear(); } S.mode = mode; updateCtl(); }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };

  /* ================= 기체 분자 ================= */
  const R_M = PHONE ? 4.4 : 5;
  let GM = [];
  function gasSync(cnt, W, H) {
    const live = GM.filter((p) => !p.dying);
    for (let i = live.length; i < cnt; i++) { const th = Math.random() * TAU; GM.push({ x: R_M + Math.random() * Math.max(1, W - 2 * R_M), y: R_M + Math.random() * Math.max(1, H - 2 * R_M), ux: Math.cos(th), uy: Math.sin(th), m: 0.82 + Math.random() * 0.36, fade: 0, dying: false }); }
    for (let i = live.length - 1; i >= cnt; i--) live[i].dying = true;
  }
  function gasStep(dt, W, H, rel) {
    const spd = (PHONE ? 70 : 90) * Math.sqrt(Math.max(rel, 0.1));
    for (let i = GM.length - 1; i >= 0; i--) {
      const p = GM[i];
      if (p.dying) { p.fade -= dt * 4; if (p.fade <= 0) { GM.splice(i, 1); continue; } } else if (p.fade < 1) p.fade = Math.min(1, p.fade + dt * 4);
      const v = spd * p.m * dt;
      p.x += p.ux * v; p.y += p.uy * v;
      if (p.x < R_M) { p.x = R_M; p.ux = Math.abs(p.ux); } else if (p.x > W - R_M) { p.x = Math.max(R_M, W - R_M); p.ux = -Math.abs(p.ux); }
      if (p.y < R_M) { p.y = R_M; p.uy = Math.abs(p.uy); }
      if (p.y > H - R_M) { p.y = Math.max(R_M, H - R_M); p.uy = -Math.abs(p.uy); }
    }
  }
  const tempCol = (rel) => SciSim.color.mix('#4aa3ff', '#ff5a4a', clamp(rel, 0, 1));   // rel: 0(차가움)~1(뜨거움)
  const relT = (q) => clamp((q.T - PA * VA) / (PC * VB - PA * VA), 0, 1);

  /* ================= P–V 그래프 틀 ================= */
  function pvFrame(rc) {
    const ml = PHONE ? 38 : 44, mr = 14, mt = 30, mb = 32;
    const ix = rc.x + ml, iy = rc.y + mt, iw = rc.w - ml - mr, ih = rc.h - mt - mb;
    const gx = (V) => ix + iw * V / XMAX, gy = (P) => iy + ih - ih * P / YMAX;
    D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1.5; ctx.stroke();
    for (let i = 0; i <= XMAX; i++) { ctx.strokeStyle = 'rgba(120,135,160,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(i), iy); ctx.lineTo(gx(i), iy + ih); ctx.stroke(); T(gx(i), iy + ih + 17, String(i), 13, '#3a465c', 'center', 800); }
    for (let j = 0; j <= YMAX; j++) { ctx.strokeStyle = 'rgba(120,135,160,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ix, gy(j)); ctx.lineTo(ix + iw, gy(j)); ctx.stroke(); T(ix - 6, gy(j) + 5, String(j), 13, '#3a465c', 'right', 800); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ix, iy - 2); ctx.lineTo(ix, iy + ih); ctx.lineTo(ix + iw + 2, iy + ih); ctx.stroke();
    T(rc.x + 8, rc.y + 20, 'P (× 10⁵ Pa)', 13.5, INK, 'left', 800);
    T(rc.x + rc.w - 8, rc.y + 20, PHONE ? 'V (L) · 한 칸 100 J' : 'V (L)  ·  한 칸 = 100 J', 13.5, MUTED, 'right', 800);
    return { gx, gy, ix, iy, iw, ih };
  }
  const PT = { A: [VA, PA], B: [VB, PB], C: [VB, PC], D: [VA, PD] };
  /* 닫힌 경로 그리기: 구간마다 색, 방향 화살표, 점 A~D */
  function drawLoop(M, o) {
    o = o || {};
    if (o.fill) {
      ctx.save(); ctx.beginPath(); LOOP.forEach((q, i) => { i ? ctx.lineTo(M.gx(q.V), M.gy(q.P)) : ctx.moveTo(M.gx(q.V), M.gy(q.P)); }); ctx.closePath();
      ctx.fillStyle = o.fill; ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.lineWidth = o.w || 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = SciSim.color.rgba(SEG[k].col, o.alpha != null ? o.alpha : 0.95);
      ctx.beginPath(); LOOP.filter((q) => q.k === k).forEach((q, i) => { i ? ctx.lineTo(M.gx(q.V), M.gy(q.P)) : ctx.moveTo(M.gx(q.V), M.gy(q.P)); }); ctx.stroke();
    }
    ctx.restore();
  }
  /* 방향 화살표 (구간 중앙에 작은 삼각형). rev: 거꾸로 */
  function loopArrows(M, rev) {
    for (let k = 0; k < 4; k++) {
      const a = pos(k + 0.45), b = pos(k + 0.55);
      let x1 = M.gx(a.V), y1 = M.gy(a.P), x2 = M.gx(b.V), y2 = M.gy(b.P);
      if (rev) { [x1, x2] = [x2, x1]; [y1, y2] = [y2, y1]; }
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      ctx.fillStyle = SEG[k].col; ctx.beginPath(); ctx.moveTo(mx + ux * 9, my + uy * 9); ctx.lineTo(mx - ux * 5 - uy * 7, my - uy * 5 + ux * 7); ctx.lineTo(mx - ux * 5 + uy * 7, my - uy * 5 - ux * 7); ctx.closePath(); ctx.fill();
    }
  }
  function loopPoints(M, withNames) {
    const lab = { A: [-15, 17], B: [-15, -10], C: [-15, -10], D: [15, -10] };
    ['A', 'B', 'C', 'D'].forEach((n) => {
      const x = M.gx(PT[n][0]), y = M.gy(PT[n][1]);
      D.sphere(x, y, 6.5, '#475569', { gloss: false });
      T(x + lab[n][0], y + lab[n][1], n, 14.5, '#1f2a3d', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3.5 });
    });
    if (withNames && !PHONE) {
      T(M.gx(4.9), M.gy(0.15) - 22, 'A→B 압축', 13, SEG[0].col, 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3.5 });
      T(M.gx(VB) + 8, M.gy(5.0), 'B→C 연소', 13, SEG[1].col, 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3.5 });
      T(M.gx(4.9), M.gy(6.9), 'C→D 팽창', 13, SEG[2].col, 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3.5 });
      T(M.gx(VA) - 8, M.gy(1.6), 'D→A 배기', 13, SEG[3].col, 'right', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3.5 });
    }
  }
  function stateDot(M, q, col) {
    D.glow(M.gx(q.V), M.gy(q.P), 20, col || '#f26b3a', 0.55);
    D.sphere(M.gx(q.V), M.gy(q.P), 8.5, col || '#f26b3a', { gloss: true, shadow: true });
  }

  /* ================= ① 순환 과정: 엔진 ================= */
  const SEGT = 1.7;   // 한 구간에 걸리는 시간 (초)
  function cyStep(dt) {
    const c = S.cy; if (!c.run) return;
    let d = dt / SEGT; const target = c.stepTo; let reached = false;
    if (target != null && c.s + d >= target - 1e-9) { d = Math.max(0, target - c.s); reached = true; }
    c.s += d; c.acc += d;
    if (c.acc >= 4 - 1e-9) { c.acc -= 4; c.cycles++; Sound.success(); updateCtl(); }
    if (c.s >= 4 - 1e-9) c.s -= 4;
    if (reached) {
      c.run = false; c.stepTo = null;
      if (c.once) { c.onceDone = true; showHint('피스톤이 끝까지 내려와 멈췄어요. 또 일을 하려면 처음 상태 A로 되돌아와야 해요!', 5200); }
      updateCtl();
    }
  }
  function cyReset(all) {
    const c = S.cy; c.s = 0; c.run = false; c.stepTo = null; c.acc = 0; c.once = false; c.onceDone = false; if (all) c.cycles = 0;
    parts.clear(); updateCtl();
  }
  function cyToggle() {
    const c = S.cy; Sound.click();
    c.once = false; c.onceDone = false;
    if (c.run && c.stepTo == null) { c.run = false; } else { c.stepTo = null; c.run = true; }
    updateCtl();
  }
  function cyStepOne() {
    const c = S.cy; Sound.click();
    c.once = false; c.onceDone = false;
    c.stepTo = Math.floor(c.s + 1e-6) + 1; c.run = true; updateCtl();
  }
  function cyOnce() {
    const c = S.cy; Sound.click();
    c.s = 2; c.acc = 0; c.once = true; c.onceDone = false; c.stepTo = 3; c.run = true; GM = []; updateCtl();
  }
  function drawEngine(c, dt, q) {
    const W = PHONE ? 80 : 112, ex = c.x + (PHONE ? 32 : 52), ey = c.y + 112, k = PHONE ? 26 : 28;
    const hmax = VA * k, hg = q.V * k, yb = ey + hmax + 26;
    const seg = SEG[q.k], rel = relT(q);
    const x1 = ex + W * 0.27, x2 = ex + W * 0.73, xp = ex + W / 2;
    const open = q.k === 3 ? 1 : 0;
    // 크랭크 케이스
    D.roundRect(ex - 14, yb, W + 28, 22, 6); ctx.fillStyle = '#6b7a90'; ctx.fill();
    // 실린더 + 기체
    ctx.fillStyle = 'rgba(240,246,255,.92)'; ctx.fillRect(ex, ey, W, yb - ey);
    ctx.fillStyle = SciSim.color.rgba(SciSim.color.mix('#cfe0ff', '#ffb59a', rel), 0.7); ctx.fillRect(ex, ey, W, hg);
    if (q.k === 1) { const g = ctx.createRadialGradient(xp, ey + 6, 4, xp, ey + 6, W * 0.9); g.addColorStop(0, 'rgba(255,170,50,' + (0.85 * Math.sin(Math.PI * clamp(q.f * 1.2, 0, 1))) + ')'); g.addColorStop(1, 'rgba(255,170,50,0)'); ctx.fillStyle = g; ctx.fillRect(ex, ey, W, hg); }
    gasSync(PPN, W, hg); gasStep(dt, W, hg, 0.35 + rel * 1.4);
    ctx.save(); ctx.beginPath(); ctx.rect(ex, ey, W, hg); ctx.clip();
    const mc = SciSim.color.mix('#4aa3ff', '#ff5a4a', rel);
    GM.forEach((p) => D.sphere(ex + p.x, ey + p.y, R_M, mc, { gloss: true }));
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex, yb); ctx.moveTo(ex + W, ey); ctx.lineTo(ex + W, yb); ctx.stroke();
    // 머리 부분 + 밸브 + 점화 플러그 + 흡입·배기관
    D.shadow(() => { D.roundRect(ex - 10, ey - 40, W + 20, 40, 6); const g = ctx.createLinearGradient(0, ey - 40, 0, ey); g.addColorStop(0, '#8b99ae'); g.addColorStop(1, '#5e6c84'); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#8b99ae'; ctx.lineWidth = 9; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(x1, ey - 38); ctx.lineTo(x1, ey - 46); ctx.lineTo(ex - 26, ey - 46); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, ey - 38); ctx.lineTo(x2, ey - 46); ctx.lineTo(ex + W + 26, ey - 46); ctx.stroke();
    [[x1, '#3b82f6'], [x2, '#9aa6bd']].forEach(([vx, cc]) => {
      ctx.strokeStyle = '#2c3a52'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(vx, ey - 22 + open * 8); ctx.lineTo(vx, ey + open * 8); ctx.stroke();
      ctx.fillStyle = open ? cc : '#2c3a52'; ctx.fillRect(vx - 8, ey - 2 + open * 8, 16, 3.5);
    });
    ctx.fillStyle = '#d9dee8'; ctx.fillRect(xp - 5, ey - 58, 10, 28); ctx.fillStyle = '#8a95a8'; ctx.fillRect(xp - 2, ey - 30, 4, 30);
    T(ex - 18, ey - 56, '흡입', 13, '#2563eb', 'center', 800); T(ex + W + 18, ey - 56, '배기', 13, '#6b7280', 'center', 800);
    // 점화 불꽃
    if (q.k === 1 && q.f < 0.6) { D.spark(xp, ey - 4, 15, S.clock * 1.4, '#fff3b0'); if (!RM && Math.random() < 0.5) parts.emit({ x: xp + (Math.random() - 0.5) * 14, y: ey + 4, vx: (Math.random() - 0.5) * 120, vy: 30 + Math.random() * 90, life: 0.4, size: 2.6, color: 'rgba(255,200,60,.95)', fade: true }); }
    // 배기(연기)와 흡입(새 공기)
    if (q.k === 3 && !RM) {
      if (Math.random() < 0.35) parts.emit({ x: ex + W + 22, y: ey - 48, vx: 22 + Math.random() * 20, vy: -14 - Math.random() * 20, life: 1.0, size: 7, grow: 12, color: 'rgba(110,100,110,.55)', shape: 'smoke', fade: true });
      if (Math.random() < 0.25) parts.emit({ x: ex - 22, y: ey - 46, vx: 40, vy: 4, life: 0.5, size: 3.2, color: 'rgba(59,130,246,.8)', fade: true });
    }
    // 피스톤과 연결봉
    const py = ey + hg;
    ctx.fillStyle = '#516079'; ctx.fillRect(xp - 4, py, 8, yb - py + 2);
    D.shadow(() => { D.roundRect(ex + 2, py - 2, W - 4, 14, 4); const g = ctx.createLinearGradient(0, py - 2, 0, py + 12); g.addColorStop(0, '#aab6c9'); g.addColorStop(1, '#5e6c84'); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
    // 열·일 표시
    const bx = ex + W + 14;
    if (q.k === 1) D.label(xp, c.y + 46, '🔥 Q_h 흡수', { bg: RED, size: 13 });
    if (q.k === 3) D.label(xp, c.y + 46, 'Q_c 방출', { bg: PURPLE, size: 13 });
    if (q.k === 2) { D.arrow(bx, py + 6, bx, py + 6 + 40, { color: 'rgba(37,99,235,.9)', width: 5, head: 11 }); D.label(bx + 10, py + 26, 'W 나감', { bg: BLUE, size: 13, align: 'left', pad: 6 }); }
    if (q.k === 0) { D.arrow(bx, py + 46, bx, py + 6, { color: 'rgba(124,58,237,.9)', width: 5, head: 11 }); D.label(bx + 10, py + 26, 'W 받음', { bg: '#6d28d9', size: 13, align: 'left', pad: 6 }); }
    // 구간 이름
    D.label(ex + W / 2, c.y + 20, seg.ab + ' ' + (PHONE ? seg.tag : seg.name), { bg: seg.col, size: 13 });
  }
  const PPN = 20;
  function drawEngineScene(dt) {
    const c = topCard(), cy = S.cy, q = pos(cy.s);
    cardBegin(c);
    const ew = PHONE ? 188 : 262;
    drawEngine(c, dt, q);
    const rc = { x: c.x + ew, y: c.y + 4, w: c.w - ew - 4, h: c.h - 8 };
    const M = pvFrame(rc);
    drawLoop(M, { alpha: cy.once ? 0.28 : 0.55, w: 3.5 });
    if (cy.once) { ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = SEG[2].col; ctx.lineCap = 'round'; ctx.beginPath(); LOOP.filter((p) => p.k === 2).forEach((p, i) => { i ? ctx.lineTo(M.gx(p.V), M.gy(p.P)) : ctx.moveTo(M.gx(p.V), M.gy(p.P)); }); ctx.stroke(); ctx.restore(); }
    loopArrows(M, false); loopPoints(M, true);
    stateDot(M, q, SEG[q.k].col);
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    // 아래: 네 구간 안내
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14;
    T(x1, PY + 26, '🔁 한 사이클 = 네 구간을 돌고 처음 상태 A로 돌아와요', PHONE ? 13.5 : 15, INK, 'left', 800);
    const cols = PHONE ? 2 : 4, gw = (PW - 28 - (cols - 1) * 8) / cols, gh = PHONE ? 92 : 96;
    SEG.forEach((sg, i) => {
      const gx0 = x1 + (i % cols) * (gw + 8), gy0 = PY + 40 + Math.floor(i / cols) * (gh + 8), cur = q.k === i && (cy.run || cy.s > 0);
      D.roundRect(gx0, gy0, gw, gh, 12); ctx.fillStyle = cur ? SciSim.color.rgba(sg.col, 0.14) : '#f4f7fd'; ctx.fill(); ctx.strokeStyle = cur ? sg.col : '#dde4f0'; ctx.lineWidth = cur ? 3 : 1.5; ctx.stroke();
      ctx.fillStyle = sg.col; ctx.beginPath(); ctx.arc(gx0 + 17, gy0 + 20, 11, 0, TAU); ctx.fill();
      T(gx0 + 17, gy0 + 25, String(i + 1), 13, '#fff', 'center', 800);
      T(gx0 + 34, gy0 + 25, sg.ab + ' ' + sg.name, PHONE ? 13.5 : 14.5, sg.col, 'left', 800);
      para(gx0 + 10, gy0 + 46, sg.desc, gw - 18, 13, INK, 17, 700);
    });
    const ty = PY + 40 + (PHONE ? 2 : 1) * (gh + 8) + 14;
    T(x1, ty, '돈 바퀴 수: ' + cy.cycles + '바퀴', 14.5, '#c2410c', 'left', 800);
    para(x1, ty + 24, '한 바퀴를 돌면 기체는 처음 상태(같은 P, V, T)로 돌아와요. 그래서 같은 과정을 되풀이하며 계속 일을 할 수 있어요.', PW - 28, 13.5, MUTED, 19, 700);
  }

  /* ================= ② 열과 일: 넓이, 에너지 흐름 ================= */
  function band(x1, y1a, y1b, x2, y2a, y2b, color, alpha) {
    const m = (x1 + x2) / 2;
    ctx.beginPath(); ctx.moveTo(x1, y1a); ctx.bezierCurveTo(m, y1a, m, y2a, x2, y2a); ctx.lineTo(x2, y2b); ctx.bezierCurveTo(m, y2b, m, y1b, x1, y1b); ctx.closePath();
    ctx.fillStyle = SciSim.color.rgba(color, alpha != null ? alpha : 0.85); ctx.fill();
  }
  function headR(x, y, hh, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + 13, y); ctx.lineTo(x, y - Math.max(hh / 2 + 5, 9)); ctx.lineTo(x, y + Math.max(hh / 2 + 5, 9)); ctx.closePath(); ctx.fill(); }
  /* 에너지 흐름도: 열기관은 Q_h → (W + Q_c), 냉장고는 (Q_c + W) → Q_h. off: 띠가 벌어지는 정도, lo: 이름표 거리 */
  function sankey(x, y, w, sc, rev, vis, hidden, off, lo) {
    const hH = QH * sc, hW = WNET * sc, hC = QC * sc;
    const xb = x + w * 0.31, bw = w * 0.34, xr = xb + bw, xe = x + w - 14;
    const top = y - hH / 2;
    const g = ctx.createLinearGradient(0, top - 8, 0, top + hH + 8); g.addColorStop(0, '#6c7a92'); g.addColorStop(1, '#4b5870');
    D.shadow(() => { D.roundRect(xb, top - 8, bw, hH + 16, 12); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 2 });
    T(xb + bw / 2, y - 2, rev ? '냉장고' : '열기관', 14.5, '#fff', 'center', 800);
    T(xb + bw / 2, y + 17, rev ? 'Q_h = Q_c + W' : 'Q_h = W + Q_c', 13, '#e2e8f0', 'center', 800);
    const lab = (txt, lx, ly, col) => D.label(lx, ly, txt, { bg: col, size: 13 });
    const hv = hidden ? 0 : vis, qd = SciSim.color.rgba;
    const dash = (bxx, byy, bww, bhh) => { ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; D.roundRect(bxx, byy, bww, bhh, 8); ctx.stroke(); ctx.restore(); };
    if (!rev) {
      band(x, top, top + hH, xb, top, top + hH, RED, 0.88); headR(xb - 1, y, hH, qd(RED, 0.9));
      lab('Q_h = ' + fN(QH) + ' J', x + (xb - x) / 2, top - lo + off, RED);
      if (hidden) {
        dash(xr + 6, top - off - 18, xe - xr - 8, 34); dash(xr + 6, top + hH + off - 16, xe - xr - 8, 34);
        T((xr + xe) / 2 + 2, top - off - 1, '일 W = ?', 14, ORANGE, 'center', 800); T((xr + xe) / 2 + 2, top + hH + off + 5, 'Q_c = ?', 14, ORANGE, 'center', 800);
      } else {
        const hw = hW * hv, hc = hC * hv;
        band(xr, top, top + hw, xe, top - off, top - off + hw, BLUE, 0.9); headR(xe - 1, top - off + hw / 2, hw, qd(BLUE, 0.95));
        band(xr, top + hH - hc, top + hH, xe, top + hH - hc + off, top + hH + off, PURPLE, 0.88); headR(xe - 1, top + hH + off - hc / 2, hc, qd(PURPLE, 0.95));
        if (hv > 0.7) { lab('W = ' + fN(WNET) + ' J', xr + (xe - xr) / 2, top - lo, BLUE); lab('Q_c = ' + fN(QC) + ' J', xr + (xe - xr) / 2, top + hH + lo, PURPLE); }
      }
    } else {
      if (hidden) {
        dash(x, top - off - 18, xb - x - 8, 34); dash(x, top + hH + off - 16, xb - x - 8, 34);
        T(x + (xb - x) / 2 - 4, top - off - 1, '일 W = ?', 14, ORANGE, 'center', 800); T(x + (xb - x) / 2 - 4, top + hH + off + 5, 'Q_c = ?', 14, ORANGE, 'center', 800);
      } else {
        const hw = hW * hv, hc = hC * hv;
        band(x, top - off, top - off + hw, xb, top, top + hw, BLUE, 0.9); headR(xb - 1, top + hw / 2, hw, qd(BLUE, 0.95));
        band(x, top + hH - hc + off, top + hH + off, xb, top + hH - hc, top + hH, PURPLE, 0.88); headR(xb - 1, top + hH - hc / 2, hc, qd(PURPLE, 0.95));
        if (hv > 0.7) { lab('W = ' + fN(WNET) + ' J (받음)', x + (xb - x) / 2, top - lo, BLUE); lab('Q_c = ' + fN(QC) + ' J (흡수)', x + (xb - x) / 2, top + hH + lo, PURPLE); }
      }
      band(xr, top, top + hH, xe, top, top + hH, RED, 0.88); headR(xe - 1, y, hH, qd(RED, 0.9));
      lab('Q_h = ' + fN(QH) + ' J (방출)', xr + (xe - xr) / 2, top - lo + off, RED);
    }
  }
  function enStep(dt) {
    const e = S.en, dirv = e.dir === 'cw' ? 1 : -1;
    e.s = ((e.s + dirv * dt / 1.9) % 4 + 4) % 4;
    e.vis = approach(e.vis, revealed('wOK') ? 1 : 0, dt, 4);
  }
  function drawEnergyScene(dt) {
    const c = topCard(), e = S.en, rev = e.dir === 'ccw', hidW = !revealed('wOK');
    cardBegin(c);
    const rc = PHONE ? { x: c.x + 4, y: c.y + 4, w: c.w - 8, h: c.h - 8 } : { x: c.x + 4, y: c.y + 4, w: 452, h: c.h - 8 };
    const M = pvFrame(rc);
    ctx.save(); ctx.beginPath(); ctx.rect(M.ix, M.iy, M.iw, M.ih); ctx.clip();
    if (e.grid) {
      CELLS.cells.forEach((q) => {
        ctx.fillStyle = q.r >= 1 ? 'rgba(20,160,88,.38)' : 'rgba(245,158,11,' + (0.2 + 0.3 * q.r) + ')';
        ctx.fillRect(M.gx(q.i) + 1, M.gy(q.j + 1) + 1, M.gx(1) - M.gx(0) - 2, M.gy(0) - M.gy(1) - 2);
      });
    }
    ctx.restore();
    drawLoop(M, { fill: rev ? 'rgba(124,58,237,' + (e.grid ? 0.06 : 0.16) + ')' : 'rgba(37,99,235,' + (e.grid ? 0.06 : 0.16) + ')', alpha: 0.9, w: 3.5 });
    loopArrows(M, rev); loopPoints(M, false);
    if (e.grid) CELLS.cells.forEach((q) => T(M.gx(q.i + 0.74), M.gy(q.j + 0.3), q.r >= 1 ? '1' : q.r.toFixed(1), 13, q.r >= 1 ? '#0f5132' : '#92400e', 'center', 800, { stroke: 'rgba(255,255,255,.92)', strokeWidth: 3.5 }));
    const q = pos(e.s);
    stateDot(M, q, SEG[q.k].col);
    // 둘러싸인 넓이 문구
    const cxm = M.gx(5.4), cym = M.gy(7.2);
    D.label(cxm, cym, rev ? '반시계 방향' : '시계 방향', { bg: rev ? '#6d28d9' : '#1d4ed8', size: 13 });
    if (!PHONE) {
      const rx = c.x + 470, rw = c.w - 470 - 10;
      T(rx + rw / 2, c.y + 26, rev ? '❄️ 냉장고 (일을 받아 열을 퍼냄)' : '⚙️ 열기관 (열을 일로 바꿈)', 14.5, INK, 'center', 800);
      sankey(rx, c.y + 176, rw, 0.0765, rev, e.vis, hidW, 20, 40);
      para(rx + rw / 2, c.y + 318, rev ? '넓이 = 받은 일 W (반대 방향이라 음수)' : '둘러싸인 넓이 = 알짜 일 W', rw, 13.5, '#1d4ed8', 18, 800, 'center');
    }
    ctx.restore();
    // 아래
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14;
    if (PHONE) {
      T(x1, PY + 24, rev ? '❄️ 냉장고 (일을 받아 열을 퍼냄)' : '⚙️ 열기관 (열을 일로 바꿈)', 14, INK, 'left', 800);
      sankey(PX + 4, PY + 122, PW - 8, 0.045, rev, e.vis, hidW, 12, 30);
    }
    const ty = PHONE ? PY + 214 : PY + 24;
    T(x1, ty, '📋 구간별 열 Q · 일 W · 내부 에너지 변화 ΔU (J)', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    const tab = revealed('wOK'), cx = PHONE ? [x1, x1 + 110, x1 + 200, x1 + 290] : [x1, x1 + 130, x1 + 220, x1 + 310];
    ['구간', 'Q', 'W', 'ΔU'].forEach((h, i) => T(cx[i], ty + 24, h, 13.5, MUTED, 'left', 800));
    const rows = SEG.map((sg) => [sg.ab + ' ' + sg.tag, fS(sg.Q).replace('+', ''), fS(sg.W).replace('+', ''), fS(sg.dU).replace('+', '')]);
    rows.push(['한 바퀴 합', fS(QH - QC).replace('+', ''), fS(WNET).replace('+', ''), '0']);
    const rh = PHONE ? 21 : 26;
    rows.forEach((r, i) => {
      const yy = ty + 24 + (i + 1) * rh;
      if (i === 4) { ctx.fillStyle = 'rgba(20,160,88,.12)'; D.roundRect(PX + 6, yy - 18, (PHONE ? 330 : 410), rh, 6); ctx.fill(); }
      T(cx[0], yy, r[0], 13.5, i < 4 ? SEG[i].col : INK, 'left', 800);
      for (let j = 1; j < 4; j++) T(cx[j], yy, tab ? r[j] : '?', 14, tab ? INK : ORANGE, 'left', 800);
    });
    if (!PHONE) {
      const tx = x1 + 440, tw = PW - 440 - 24;
      T(tx, ty, '🧮 열효율', 14.5, INK, 'left', 800);
      T(tx, ty + 30, 'e = W / Q_h', 17, '#1d4ed8', 'left', 800);
      const eRev = revealed('eOK');
      T(tx, ty + 62, hidW ? 'W를 먼저 찾아요' : 'e = ' + fN(WNET) + ' / ' + fN(QH) + (eRev ? ' = ' + EFF + ' %' : ' = ?'), 15, hidW ? MUTED : eRev ? '#14753f' : ORANGE, 'left', 800);
      para(tx, ty + 94, rev ? '반대로 돌리면 일을 받아 열을 퍼내는 냉장고예요. 뒤로 내보내는 열 Q_h가 더 커요.' : '버리는 열 Q_c가 있어서 e는 100 %보다 작아요 (e < 1).', tw, 13.5, MUTED, 19, 700);
    } else {
      const eRev = revealed('eOK');
      T(PX + PW - 14, PY + 24, 'e = W / Q_h' + (hidW ? '' : ' = ' + fN(WNET) + ' / ' + fN(QH) + (eRev ? ' = ' + EFF + ' %' : ' = ?')), 14.5, eRev ? '#14753f' : '#1d4ed8', 'right', 800);
    }
  }

  /* ================= ③ 효율 높이기 ================= */
  function hiTap(p) {
    const c = topCard(), h = S.hi;
    const rowH = PHONE ? 46 : 47, y0 = c.y + (PHONE ? 38 : 40);
    for (let r = 0; r < 6; r++) {
      const ry = y0 + r * rowH;
      if (p.x >= c.x + 8 && p.x <= c.x + c.w - 8 && p.y >= ry && p.y <= ry + rowH - 4) {
        const idx = DISP[r];
        if (h.placed.indexOf(idx) >= 0) return;
        if (idx === h.placed.length) { h.placed.push(idx); Sound.click(); if (h.placed.length === 6) { h.ok = true; Sound.success(); } }
        else { h.shake = idx; h.shakeT = 0; Sound.fail(); showHint(h.placed.length + 1 + '번째로 나온 기관은 이게 아니에요. 연도를 비교해 보세요.', 2600); }
        updateCtl(); return;
      }
    }
  }
  function hiReset() { const h = S.hi; h.placed = []; h.shake = -1; h.ok = false; updateCtl(); }
  function drawHistoryScene(dt) {
    const c = topCard(), h = S.hi;
    cardBegin(c);
    T(c.x + 14, c.y + 24, '기관이 세상에 나온 순서대로 눌러 보세요 (' + h.placed.length + ' / 6)', PHONE ? 13.5 : 15, INK, 'left', 800);
    const rowH = PHONE ? 46 : 47, y0 = c.y + (PHONE ? 38 : 40);
    const bx0 = PHONE ? c.x + 20 : c.x + 400, bw = PHONE ? c.w - 40 - 0 : 300;
    h.shakeT += dt;
    for (let r = 0; r < 6; r++) {
      const idx = DISP[r], d = HIST[idx], ry = y0 + r * rowH, rank = h.placed.indexOf(idx), placed = rank >= 0;
      const sh = h.shake === idx && h.shakeT < 0.4 ? Math.sin(h.shakeT * 50) * 5 * (1 - h.shakeT / 0.4) : 0;
      D.shadow(() => { D.roundRect(c.x + 8 + sh, ry, c.w - 16, rowH - 5, 11); ctx.fillStyle = placed ? '#fff' : '#f8faff'; ctx.fill(); }, { blur: 5, y: 1 });
      if (h.shake === idx && h.shakeT < 0.4) { ctx.strokeStyle = RED; ctx.lineWidth = 2.5; D.roundRect(c.x + 8 + sh, ry, c.w - 16, rowH - 5, 11); ctx.stroke(); }
      const mid = ry + (rowH - 5) / 2, l1y = PHONE ? ry + 18 : mid;
      ctx.fillStyle = placed ? GREEN : '#cbd5e1'; ctx.beginPath(); ctx.arc(c.x + 30 + sh, l1y, 12, 0, TAU); ctx.fill();
      T(c.x + 30 + sh, l1y + 5, placed ? String(rank + 1) : '?', 14, '#fff', 'center', 800);
      T(c.x + 52 + sh, l1y + 8, d.ic, 21, INK, 'left', 700);
      T(c.x + 86 + sh, l1y + 5, d.n, PHONE ? 14 : 15, INK, 'left', 800);
      T(PHONE ? c.x + c.w - 20 + sh : c.x + 330 + sh, l1y + 5, d.y + '년', PHONE ? 14 : 15, '#c2410c', 'right', 800);
      // 효율 막대 (놓은 뒤에 나타남)
      if (placed) {
        const bbw = PHONE ? c.w - 40 - 84 : bw - 70, bxx = PHONE ? c.x + 20 : bx0, by = PHONE ? ry + 27 : mid - 7, bh = PHONE ? 11 : 14;
        D.roundRect(bxx, by, bbw, bh, bh / 2); ctx.fillStyle = '#e6ebf5'; ctx.fill();
        const wl = bbw * d.lo / 100, wh = bbw * d.hi / 100;
        ctx.save(); D.roundRect(bxx, by, bbw, bh, bh / 2); ctx.clip();
        ctx.fillStyle = 'rgba(20,160,88,.35)'; ctx.fillRect(bxx, by, wh, bh);
        ctx.fillStyle = GREEN; ctx.fillRect(bxx, by, wl, bh); ctx.restore();
        T(bxx + bbw + 8, by + bh - 1, d.txt, 13, '#14753f', 'left', 800);
      } else if (!PHONE) T(bx0, mid + 5, '(눌러서 순서대로 놓기)', 13, '#9aa6bd', 'left', 700);
      else T(c.x + 86, ry + 37, '(눌러서 놓기)', 13, '#9aa6bd', 'left', 700);
    }
    if (h.ok && !PHONE) { ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(226,70,75,.7)'; ctx.lineWidth = 2; const xx = bx0 + (bw - 70); ctx.beginPath(); ctx.moveTo(xx, y0 - 4); ctx.lineTo(xx, y0 + 6 * rowH - 8); ctx.stroke(); ctx.restore(); T(xx, y0 - 8, '100 %', 13, RED, 'center', 800); }
    parts.update(dt); parts.draw(ctx);
    ctx.restore();
    // 아래: 연료 에너지의 행방 + 개선 위치
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14, w1 = PW - 28;
    T(x1, PY + 24, '⛽ 자동차 연료 에너지 100 %의 행방 (예시)', PHONE ? 13.5 : 15, INK, 'left', 800);
    const segs = [['일', 30, GREEN], ['배기가스', 35, '#7c3aed'], ['냉각수·방열', 30, '#e2464b'], ['기타', 5, '#94a3b8']];
    let xx = x1; const by = PY + 36, bh = 30;
    segs.forEach(([n, v, col], i) => {
      const w = w1 * v / 100;
      ctx.fillStyle = col; ctx.fillRect(xx, by, w, bh);
      if (w > 80) T(xx + w / 2, by + 20, n + ' ' + v + ' %', 13, '#fff', 'center', 800); else T(xx + w / 2, by + 20, v + '%', 13, '#fff', 'center', 800);
      xx += w;
    });
    D.roundRect(x1, by, w1, bh, 4); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.stroke();
    para(x1, by + bh + 17, '일 30 % 중 바퀴에 전해지는 것은 약 20 % (변속기·마찰·보조 장치에서 약 10 % 손실)', w1, 13, MUTED, 16, 700);
    // 개선할 곳 ①~④
    const dy = PY + 110, dh = PH - 118;
    D.roundRect(x1, dy, w1, dh, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    const zc = (n, zx, zy, on) => { ctx.fillStyle = on ? '#f26b3a' : '#f59e0b'; ctx.beginPath(); ctx.arc(zx, zy, 12, 0, TAU); ctx.fill(); T(zx, zy + 5, String(n), 13.5, '#fff', 'center', 800); };
    if (!PHONE) {
      const ey0 = dy + 20, eh = dh - 40;
      // 연료 → 기관 → 변속기·바퀴
      const bxs = [x1 + 10, x1 + 170, x1 + 400], bws = [130, 190, 150];
      [['⛽ 연료', '#fde68a'], ['⚙️ 기관 (실린더·피스톤)', '#cbd5e1'], ['🛞 바퀴·브레이크', '#bfdbfe']].forEach(([n, col], i) => { D.roundRect(bxs[i], ey0, bws[i], eh, 12); ctx.fillStyle = col; ctx.fill(); T(bxs[i] + bws[i] / 2, ey0 + eh / 2 + 5, n, 14, INK, 'center', 800); });
      D.arrow(bxs[0] + bws[0], ey0 + eh / 2, bxs[1] - 4, ey0 + eh / 2, { color: '#c2410c', width: 4, head: 10 });
      D.arrow(bxs[1] + bws[1], ey0 + eh / 2, bxs[2] - 4, ey0 + eh / 2, { color: GREEN, width: 4, head: 10 });
      D.arrow(bxs[1] + bws[1] / 2, ey0 + eh, bxs[1] + bws[1] / 2, ey0 + eh + 10, { color: '#7c3aed', width: 4, head: 8 });
      zc(1, bxs[1] + 36, ey0 + 14, false); zc(2, bxs[1] + bws[1] - 36, ey0 + 14, false);
      zc(3, bxs[1] + bws[1] / 2 + 22, ey0 + eh + 4, false); zc(4, bxs[2] + bws[2] - 18, ey0 + 14, false);
      ['① 마찰·열 누설', '② 연소·배출 온도', '③ 배기가스', '④ 제동'].forEach((z, i) => T(x1 + 590, ey0 + 22 + i * 24, z, 13, MUTED, 'left', 700));
    } else {
      const ey0 = dy + 14, eh = 52;
      const bxs = [x1 + 8, x1 + 128, x1 + 300], bws = [96, 150, 120];
      [['⛽ 연료', '#fde68a'], ['⚙️ 기관', '#cbd5e1'], ['🛞 바퀴·브레이크', '#bfdbfe']].forEach(([n, col], i) => { D.roundRect(bxs[i], ey0, bws[i], eh, 12); ctx.fillStyle = col; ctx.fill(); T(bxs[i] + bws[i] / 2, ey0 + eh / 2 + 5, n, 13, INK, 'center', 800); });
      D.arrow(bxs[0] + bws[0], ey0 + eh / 2, bxs[1] - 4, ey0 + eh / 2, { color: '#c2410c', width: 3.5, head: 9 });
      D.arrow(bxs[1] + bws[1], ey0 + eh / 2, bxs[2] - 4, ey0 + eh / 2, { color: GREEN, width: 3.5, head: 9 });
      zc(1, bxs[1] + 24, ey0 + 8, false); zc(2, bxs[1] + bws[1] - 24, ey0 + 8, false); zc(3, bxs[1] + bws[1] / 2, ey0 + eh + 12, false); zc(4, bxs[2] + bws[2] - 14, ey0 + 8, false);
      ZONES.forEach((z, i) => T(x1 + 12, ey0 + eh + 50 + i * 24, z, 13.5, MUTED, 'left', 700));
    }
  }

  /* ================= ④ 영향 평가 ================= */
  function impLayout() {
    const c = topCard(), cols = PHONE ? 2 : 4, rows = PHONE ? 4 : 2;
    const gw = (c.w - 16 - (cols - 1) * 8) / cols, gh = PHONE ? 66 : 144, y0 = c.y + (PHONE ? 34 : 38);
    return { cols, gw, gh, y0, x0: c.x + 8 };
  }
  function impOK(i) { return IMP[i].ans.indexOf(S.im.cat[i]) >= 0; }
  function impTap(p) {
    const L = impLayout();
    for (let i = 0; i < 8; i++) {
      const x = L.x0 + (i % L.cols) * (L.gw + 8), y = L.y0 + Math.floor(i / L.cols) * (L.gh + 8);
      if (p.x >= x && p.x <= x + L.gw && p.y >= y && p.y <= y + L.gh) {
        S.im.cat[i] = (S.im.cat[i] + 1) % 5; S.im.flip = i; S.im.flipT = 0; Sound.click(); updateCtl(); return;
      }
    }
  }
  function impScore() {
    let si = 0, se = 0;
    S.im.cat.forEach((cc) => { if (cc === 1) si++; else if (cc === 2) si--; else if (cc === 3) se++; else if (cc === 4) se--; });
    const w = S.im.w;
    return ((100 - w) * si + w * se) / 100;
  }
  function drawImpactScene(dt) {
    const c = topCard(), L = impLayout(), im = S.im;
    cardBegin(c);
    const done = revealed('impOK');
    const n = im.cat.filter((v) => v > 0).length;
    T(c.x + 14, c.y + 24, PHONE ? '카드를 눌러 분류해요 (' + n + ' / 8)' : '카드를 눌러 산업발전/환경, 긍정/부정으로 분류해요 (' + n + ' / 8)', PHONE ? 13.5 : 15, INK, 'left', 800);
    const sc = impScore();
    D.label(c.x + c.w - 14, c.y + 22, '평가 점수 ' + (sc > 0.049 ? '+' : sc < -0.049 ? MINUS : '') + Math.abs(sc).toFixed(1), { bg: sc >= 0 ? '#15803d' : '#b91c1c', size: 13, align: 'right' });
    if (im.flipT != null) im.flipT += dt;
    for (let i = 0; i < 8; i++) {
      const d = IMP[i], x = L.x0 + (i % L.cols) * (L.gw + 8), y = L.y0 + Math.floor(i / L.cols) * (L.gh + 8), cat = im.cat[i];
      const pop = im.flip === i && im.flipT < 0.3 ? 1 + 0.05 * Math.sin(im.flipT / 0.3 * Math.PI) : 1;
      ctx.save(); ctx.translate(x + L.gw / 2, y + L.gh / 2); ctx.scale(pop, pop); ctx.translate(-(x + L.gw / 2), -(y + L.gh / 2));
      D.shadow(() => { D.roundRect(x, y, L.gw, L.gh, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      if (cat > 0) { ctx.strokeStyle = CAT_COL[cat]; ctx.lineWidth = 2.5; D.roundRect(x, y, L.gw, L.gh, 12); ctx.stroke(); }
      if (done && cat > 0) { ctx.strokeStyle = impOK(i) ? 'rgba(20,160,88,.85)' : 'rgba(226,70,75,.85)'; ctx.lineWidth = 4; D.roundRect(x - 1, y - 1, L.gw + 2, L.gh + 2, 13); ctx.stroke(); }
      if (PHONE) {
        T(x + 22, y + 32, d.ic, 24, INK, 'center', 700);
        T(x + 42, y + 26, d.n, 13.5, INK, 'left', 800);
        T(x + 42, y + 52, CAT_NAME[cat], 13, cat ? CAT_COL[cat] : '#9aa6bd', 'left', 800);
      } else {
        T(x + L.gw / 2, y + 38, d.ic, 28, INK, 'center', 700);
        T(x + L.gw / 2, y + 62, d.n, 14.5, INK, 'center', 800);
        para(x + L.gw / 2, y + 80, d.d, L.gw - 14, 13, MUTED, 16, 700, 'center');
        D.roundRect(x + 10, y + L.gh - 32, L.gw - 20, 24, 12); ctx.fillStyle = cat ? SciSim.color.rgba(CAT_COL[cat], 0.12) : '#eef2fa'; ctx.fill();
        T(x + L.gw / 2, y + L.gh - 15, CAT_NAME[cat], 13, cat ? CAT_COL[cat] : '#8794ab', 'center', 800);
      }
      ctx.restore();
    }
    ctx.restore();
    // 아래: CO2 농도 + 발전 방식별 배출
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14;
    const cw = PHONE ? PW - 28 : 380, chh = PHONE ? 142 : PH - 86, cy0 = PY + 40;
    T(x1, PY + 24, '대기 중 CO₂ 농도 (ppm)', 14.5, INK, 'left', 800);
    const gx0 = x1 + 40, gx1 = x1 + cw - 12, gy1 = cy0 + chh - 24, gy0 = cy0 + 4;
    const gxy = (yr) => gx0 + (gx1 - gx0) * (yr - 1750) / (2030 - 1750), gyy = (v) => gy1 - (gy1 - gy0) * (v - 250) / (450 - 250);
    ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1; [250, 300, 350, 400, 450].forEach((v) => { ctx.beginPath(); ctx.moveTo(gx0, gyy(v)); ctx.lineTo(gx1, gyy(v)); ctx.stroke(); T(gx0 - 6, gyy(v) + 5, String(v), 13, MUTED, 'right', 700); });
    [1750, 1850, 1950, 2030].forEach((yr) => T(gxy(yr), gy1 + 17, String(yr), 13, MUTED, 'center', 700));
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx0, gy0 - 2); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    const pts = [[1750, 280], [1960, 317], [2023, 420]];
    ctx.strokeStyle = RED; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([yr, v], i) => { i ? ctx.lineTo(gxy(yr), gyy(v)) : ctx.moveTo(gxy(yr), gyy(v)); }); ctx.stroke();
    pts.forEach(([yr, v], i) => { D.sphere(gxy(yr), gyy(v), 5.5, RED, { gloss: false }); T(gxy(yr) + (i === 2 ? -8 : i === 0 ? 8 : 0), gyy(v) - 10, (i === 0 ? '약 ' : i === 2 ? '2020년대 약 ' : '') + v, 13, '#b91c1c', i === 2 ? 'right' : i === 0 ? 'left' : 'center', 800); });
    const rx = PHONE ? x1 : x1 + cw + 24, rw = PHONE ? PW - 28 : PW - cw - 52, ry = PHONE ? PY + 40 + chh + 22 : PY + 24;
    T(rx, ry, '발전 1 kWh당 CO₂ (kg)', 14.5, INK, 'left', 800);
    SRC.forEach((s, i) => {
      const yy = ry + 12 + i * (PHONE ? 42 : 44), lw = PHONE ? 104 : 108, bw = rw - lw - 40, bxx = rx + lw;
      const sel = im.src === s.id;
      if (sel) { ctx.fillStyle = 'rgba(245,158,11,.16)'; D.roundRect(rx - 6, yy - 4, rw + 6, 40, 8); ctx.fill(); }
      T(rx, yy + 12, s.ic + ' ' + s.n, 13.5, INK, 'left', 800);
      T(rx, yy + 31, '효율 ' + s.eff, 13, MUTED, 'left', 700);
      D.roundRect(bxx + 6, yy + 4, bw, 18, 9); ctx.fillStyle = '#e6ebf5'; ctx.fill();
      if (s.co2 > 0) { ctx.save(); D.roundRect(bxx + 6, yy + 4, bw, 18, 9); ctx.clip(); ctx.fillStyle = s.co2 > 0.5 ? '#6b7280' : '#f59e0b'; ctx.fillRect(bxx + 6, yy + 4, bw * s.co2 / 1.0, 18); ctx.restore(); }
      T(bxx + 6 + (s.co2 > 0 ? bw * s.co2 + 8 : 8), yy + 18, s.co2 > 0 ? '약 ' + s.co2.toFixed(1) : '≈ 0 (연소 없음)', 13, s.co2 > 0 ? INK : '#14753f', 'left', 800);
    });
    if (!PHONE) T(rx, PY + PH - 12, '지구 평균 기온은 산업화 이전보다 약 1.1 ℃ 올랐어요 (IPCC)', 13, MUTED, 'left', 700);
    else T(x1, PY + PH - 12, '지구 평균 기온은 산업화 이전보다 약 1.1 ℃ 올랐어요 (IPCC)', 13, MUTED, 'left', 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= 컨트롤 연결 ================= */
  const setSl = (id, v, mn, mx) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); };
  (function build() {
    const g = $('#segGrid');
    SEG.forEach((sg, i) => {
      const lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = sg.ab; lab.style.color = sg.col;
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.id = 'sS' + i; sel.setAttribute('aria-label', sg.ab + ' 구간의 이름');
      SEG_OPT.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); });
      sel.addEventListener('change', () => { S.segSel[i] = sel.value; sel.classList.remove('ok', 'bad'); });
      g.append(lab, sel);
    });
    const mg = $('#matchGrid');
    METHODS.forEach((m, i) => {
      const w = document.createElement('div'); w.className = 'sel-row';
      const q = document.createElement('div'); q.className = 'q'; q.textContent = m.n;
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.id = 'sM' + i; sel.setAttribute('aria-label', m.n + '의 효과가 나타나는 곳');
      [['', '고르세요']].concat(ZONES.map((z, k) => [String(k), z])).forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); });
      sel.addEventListener('change', () => { S.match[i] = sel.value; sel.classList.remove('ok', 'bad'); });
      w.append(q, sel); mg.appendChild(w);
    });
    const ch = $('#srcChips');
    SRC.forEach((s) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.src = s.id; b.textContent = s.ic + ' ' + s.n; b.addEventListener('click', () => { Sound.click(); S.im.src = s.id; updateCtl(); }); ch.appendChild(b); });
  })();
  function updateCtl() {
    const modes = allowedModes();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) { const c = n.getAttribute('data-calc'); if (c && !showCalc(c)) on = false; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    const cy = S.cy;
    $('#bRun').textContent = cy.run && cy.stepTo == null ? '⏸ 멈추기' : '▶ 계속 돌리기';
    $('#bStep').disabled = cy.run && cy.stepTo != null;
    $('#nCy').textContent = cy.once && cy.onceDone ? '한 번 팽창하면 끝이에요. ▶ 로 계속 돌려 처음 상태로 돌아가 봐요.' : cy.once ? '1번만 팽창시켜요. 어떻게 될까요?' : '엔진을 돌려 피스톤과 P–V 그래프의 점이 함께 움직이는 모습을 보세요.';
    $$('#dirSeg button').forEach((b) => b.classList.toggle('on', b.dataset.d === S.en.dir));
    $('#bGrid').textContent = S.en.grid ? '🔢 칸 세기 끄기' : '🔢 칸 세기 켜기'; $('#bGrid').classList.toggle('btn-primary', S.en.grid);
    $('#nEn').textContent = S.en.grid ? '칸 안의 숫자는 경로 안쪽에 들어온 부분이에요(1 = 한 칸 전부). 모두 더하면 몇 칸일까요? 한 칸 = 100 J' : '경로로 둘러싸인 넓이를 세어 알짜 일을 구해요. 한 칸 = 100 J';
    $('#nHi').textContent = S.hi.ok ? '순서를 모두 맞췄어요! 효율 막대를 비교해 보세요.' : (S.hi.placed.length + ' / 6 놓았어요. 가장 먼저 나온 기관부터 눌러요.');
    $('#oWt').textContent = '산업 ' + (100 - S.im.w) + ' : 환경 ' + S.im.w; setSl('sWt', S.im.w, 0, 100);
    $$('#srcChips button').forEach((b) => b.classList.toggle('on', b.dataset.src === S.im.src));
    $('#nIm').textContent = '카드를 눌러 분류하고, 슬라이더로 우리 모둠이 중요하게 보는 쪽을 정해요.';
    $$('#segGrid select').forEach((s2, i) => { if (s2.value !== S.segSel[i]) s2.value = S.segSel[i]; });
    $$('#matchGrid select').forEach((s2, i) => { if (s2.value !== S.match[i]) s2.value = S.match[i]; });
    if ($('#sRs').value !== (S.im.rs || '')) $('#sRs').value = S.im.rs || '';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $('#bRun').addEventListener('click', cyToggle);
  $('#bStep').addEventListener('click', cyStepOne);
  $('#bOnce').addEventListener('click', cyOnce);
  $('#bCyR').addEventListener('click', () => { Sound.click(); cyReset(false); GM = []; });
  $$('#dirSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.en.dir = b.dataset.d; updateCtl(); }));
  $('#bGrid').addEventListener('click', () => { Sound.click(); S.en.grid = !S.en.grid; updateCtl(); });
  $('#bOrdR').addEventListener('click', () => { Sound.click(); hiReset(); });
  $('#sWt').addEventListener('input', (e) => { S.im.w = +e.target.value; updateCtl(); });
  $('#sRs').addEventListener('change', (e) => { S.im.rs = e.target.value; e.target.classList.remove('ok', 'bad'); });
  ['sDir', 'sKind'].forEach((id) => $('#' + id).addEventListener('change', (e) => e.target.classList.remove('ok', 'bad')));
  ['iW', 'iE'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));
  SciSim.pointer(view, {
    down(p) { if (S.mode === 'history' || S.mode === 'impact') { S.tap = { x: p.x, y: p.y }; return true; } return false; },
    move() {},
    up(p) {
      const t = S.tap; S.tap = null; if (!t || Math.hypot(p.x - t.x, p.y - t.y) > 14) return;
      if (S.mode === 'history') hiTap(p); else if (S.mode === 'impact') impTap(p);
    },
    hover(p) { return S.mode === 'history' || S.mode === 'impact' ? 'pointer' : null; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'engine') { const q = pos(S.cy.s), sg = SEG[q.k]; L1 = '지금 구간'; a = sg.ab + ' ' + sg.tag; L2 = '돈 바퀴 수'; b = S.cy.cycles + '바퀴'; L3 = '한 바퀴 후 ΔU'; c = S.cy.cycles > 0 ? '0 J' : '—'; }
    else if (m === 'energy') { const rev = S.en.dir === 'ccw'; L1 = rev ? 'Q_h (방출)' : 'Q_h (흡수)'; a = fN(QH) + ' J'; L2 = 'W (알짜 일)'; b = revealed('wOK') ? (rev ? MINUS : '') + fN(WNET) + ' J' : '?'; L3 = '열효율 e'; c = rev ? '—' : revealed('eOK') ? EFF + ' %' : '?'; }
    else if (m === 'history') { L1 = '순서를 놓은 기관'; a = S.hi.placed.length + ' / 6'; L2 = '짝지은 방법'; b = S.match.filter((v) => v !== '').length + ' / 4'; L3 = '열효율 100 %'; c = '불가능'; }
    else { const s = SRC.filter((x) => x.id === S.im.src)[0]; L1 = '분류한 카드'; a = S.im.cat.filter((v) => v > 0).length + ' / 8'; L2 = '고른 발전'; b = s ? s.n : '—'; L3 = '그 발전의 CO₂'; c = s ? (s.co2 > 0 ? '약 ' + s.co2.toFixed(1) + ' kg/kWh' : '≈ 0') : '—'; }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const fb = (pairs) => pairs.forEach(([el, ok]) => { if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } else if (!el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } });
  function clr(...ids) { ids.forEach((id) => { const el = $('#' + id); el.value = ''; el.classList.remove('ok', 'bad'); }); }
  function clrSel(sel) { $$(sel).forEach((s2) => { s2.value = ''; s2.classList.remove('ok', 'bad'); }); }
  const resetFlags = () => { Object.keys(S.flags).forEach((k) => { S.flags[k] = false; }); };

  const levels = [
    {
      title: '순환 과정: 왜 되풀이할까?', short: '순환 과정', icon: '⚙️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 엔진은 왜 같은 과정을 빙글빙글 되풀이할까? 연료의 열은 얼마나 일이 되고, 그 대가로 우리는 무엇을 치르고 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학·물리학에서</b> 열기관은 열 Q_h를 받아 일 W를 하고 남은 열 Q_c를 버린다고 배웠어요(Q_h = W + Q_c, e = W/Q_h). <b>앞 차시에서</b>는 ΔU = Q − W와 P–V 그래프의 넓이가 일이라는 것을 배웠어요. 이제 이것을 이어서 열기관이 <b>같은 과정을 되풀이하는 이유</b>를 알아봐요.</div>' +
        '<p>자동차 엔진을 이상화한 모형이에요. 오른쪽 P–V 그래프의 점이 엔진과 함께 <b>닫힌 경로 A→B→C→D→A</b>를 돌아요. 엔진을 한 바퀴 돌려 보고, <b>1️⃣ 한 번만 팽창</b>시키면 어떻게 되는지도 눌러 보세요.</p>',
      features: ['engine'],
      setup() { cyReset(true); GM = []; S.segSel = ['', '', '', '']; setScene('engine'); },
      recap: '열기관은 기체가 팽창해 일을 한 뒤 처음 상태로 돌아와 같은 과정을 되풀이해요(순환 과정). 한 바퀴를 돌면 기체의 상태가 처음과 같아 ΔU = 0이고, 시계 방향으로 도는 순환이 열기관이에요.',
      summary: '<ul><li><b>순환 과정</b>: 기체가 여러 과정을 거쳐 <b>처음 상태로 되돌아오는</b> 과정이에요. 한 번 팽창하면 피스톤이 끝까지 가서 멈추기 때문에, 계속 일을 하려면 되돌아와야 해요.</li>' +
        '<li>이상화한 가솔린 엔진의 한 사이클: <b>A→B</b> 단열 압축(일을 받음) → <b>B→C</b> 등적 가열(연소, 열 Q_h 흡수) → <b>C→D</b> 단열 팽창(일을 함) → <b>D→A</b> 등적 냉각(배기, 열 Q_c 방출).</li>' +
        '<li>한 바퀴 돌면 처음 상태로 돌아오므로 내부 에너지 변화 <b>ΔU = 0</b>이에요. 그래서 제1법칙에서 (순환 한 번에 흡수한 알짜 열) = (알짜 일)이에요.</li>' +
        '<li>P–V 그래프에서 <b>시계 방향</b>으로 도는 순환은 일을 밖으로 내보내는 <b>열기관</b>이에요.</li></ul>',
      missions: [
        {
          title: '한 바퀴 돌리고 구간 이름 붙이기', manual: true,
          goal: '<b>▶ 계속 돌리기</b>로 엔진을 <b>한 바퀴</b> 돌려 본 뒤, 네 구간의 이름을 골라 ✔ 확인하기를 누르세요.',
          hint: 'A→B에서는 피스톤이 올라가 기체를 눌러요(부피 감소). B→C에서는 피스톤이 움직이지 않고(부피 일정) 점화돼요. C→D는 기체가 피스톤을 밀어 내리고, D→A는 부피가 일정한 채 열을 버려요.',
          setup() { cyReset(true); GM = []; S.segSel = ['', '', '', '']; clrSel('#segGrid select'); resetFlags(); setFlag('seg', true); setScene('engine'); },
          check() {
            if (S.cy.cycles < 1) return '먼저 엔진을 한 바퀴(A→B→C→D→A) 돌려 보세요. ▶ 계속 돌리기를 눌러요.';
            if (S.segSel.some((v) => !v)) return '네 구간의 이름을 모두 골라 주세요.';
            const oks = SEG.map((sg, i) => S.segSel[i] === sg.k);
            fb(oks.map((o, i) => [$('#sS' + i), o]));
            if (oks.every(Boolean)) return true;
            const i = oks.findIndex((o) => !o);
            return SEG[i].ab + ' 구간: ' + (i === 0 ? '피스톤이 올라가 부피가 줄어요 (일을 받아요).' : i === 1 ? '부피가 변하지 않고 연료가 타서 열을 받아요.' : i === 2 ? '뜨거운 기체가 팽창하며 피스톤을 밀어요.' : '부피가 일정한 채 열을 버리고 온도가 내려가요.');
          },
          status: () => mark(S.cy.cycles >= 1) + ' 한 바퀴 돌림 &nbsp; ' + mark(S.segSel.every((v) => v)) + ' 이름 ' + S.segSel.filter((v) => v).length + ' / 4',
          explain: '<b>A→B</b> 단열 압축(일을 받음), <b>B→C</b> 등적 가열(점화·연소, 열 Q_h 흡수), <b>C→D</b> 단열 팽창(일을 함), <b>D→A</b> 등적 냉각(배기, 열 Q_c 방출)이에요. 마지막에 처음 상태 A로 돌아와 같은 과정을 되풀이할 수 있어요.',
        },
        {
          title: '순환의 방향 확인하기', manual: true,
          goal: 'P–V 그래프에서 A→B→C→D→A로 도는 방향과, 이 방향으로 도는 순환이 어떤 장치인지 고르고 ✔ 확인하기를 누르세요.',
          hint: '위쪽 경로(C→D)에서 점이 오른쪽(부피 증가)으로 가요. 부피가 늘 때 기체가 일을 하는데, 위쪽 경로에서 늘어난 것이 아래쪽 경로에서 줄어든 것보다 일이 커요.',
          setup() { resetFlags(); setFlag('dir', true); clr(); $('#sDir').value = ''; $('#sKind').value = ''; $('#sDir').classList.remove('ok', 'bad'); $('#sKind').classList.remove('ok', 'bad'); setScene('engine'); },
          check() {
            const d = $('#sDir').value, k = $('#sKind').value;
            if (!d || !k) return '두 가지를 모두 골라 주세요.';
            fb([[$('#sDir'), d === 'cw'], [$('#sKind'), k === 'eng']]);
            if (d === 'cw' && k === 'eng') return true;
            if (d !== 'cw') return '그래프에서 점을 따라가 보세요. 아래쪽 → 왼쪽 → 위쪽 → 오른쪽으로 돌아요. 시계 바늘이 도는 방향이에요.';
            return '시계 방향으로 돌면 위쪽 경로(팽창)의 일이 아래쪽 경로(압축)의 일보다 커서 일을 밖으로 내보내요.';
          },
          status: () => '방향 ' + ($('#sDir').value ? ($('#sDir').value === 'cw' ? '시계' : '반시계') : '—') + ' · 종류 ' + ($('#sKind').value ? ($('#sKind').value === 'eng' ? '열기관' : '냉장고') : '—'),
          explain: '점은 아래 → 왼쪽 → 위 → 오른쪽으로 돌아요. 이것이 <b>시계 방향</b>이에요. 위쪽 경로(팽창, 기체가 일을 함)가 아래쪽 경로(압축, 일을 받음)보다 일이 커서 한 바퀴에 알짜 일을 밖으로 내보내므로 <b>열기관</b>이에요. 거꾸로 도는 반시계 방향은 일을 받는 냉장고 쪽이에요.',
        },
        {
          type: 'quiz', title: '한 바퀴를 돌면 내부 에너지는?',
          goal: '엔진이 한 바퀴를 돌아 처음 상태로 돌아왔을 때, 기체의 내부 에너지 변화가 0인 까닭으로 알맞은 것은?',
          setup() { resetFlags(); setScene('engine'); },
          choices: ['열기관은 한 번의 팽창으로 흡수한 열을 모두 일로 바꾸기 때문이에요', '열을 받은 만큼 일을 하면 에너지가 없어지기 때문이에요', '한 바퀴를 돌면 기체의 압력·부피·온도가 처음과 같아져 내부 에너지도 처음과 같기 때문이에요', '피스톤이 제자리로 돌아오면 열이 저절로 사라지기 때문이에요'],
          answer: 2,
          feedback: ['열기관은 흡수한 열을 모두 일로 바꾸지 못해요. 일부(Q_c)는 버려야 하고, 한 번의 팽창만으로는 계속 일을 할 수도 없어요.', '에너지는 사라지지 않아요. 내부 에너지가 처음과 같은 것은 상태가 처음으로 돌아왔기 때문이에요.', '', '열은 사라지지 않아요. 일부는 일이 되고 나머지 Q_c는 배기로 밖으로 나가요.'],
          explain: '내부 에너지는 상태(온도)로 정해져요. 한 바퀴를 돌면 처음 상태 A로 돌아오므로 <b>ΔU = 0</b>이에요. 그러면 제1법칙에서 한 바퀴에 흡수한 알짜 열(Q_h − Q_c)이 알짜 일 W가 돼요: <b>W = Q_h − Q_c</b>.',
        },
      ],
    },
    {
      title: '열과 일: 넓이가 일이에요', short: '열과 일', icon: '⚖️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 엔진은 닫힌 경로를 한 바퀴 돌아 처음 상태로 돌아오고, 그때 ΔU = 0이라는 것을 알았어요. 앞 차시에서 P–V 그래프의 <b>곡선 아래 넓이가 일</b>이었죠? 한 바퀴의 알짜 일은 그래프에서 <b>경로로 둘러싸인 넓이</b>예요.</div>' +
        '<p>그래프의 한 칸은 1 L × 1 × 10⁵ Pa = <b>100 J</b>이에요. 칸을 세어 <b>알짜 일 W</b>를 찾고, 흡수한 열 Q_h = 2 000 J과 비교해 <b>열효율 e = W / Q_h</b>를 구해요. 순환 방향을 <b>반시계</b>로 바꾸면 어떻게 되는지도 살펴봐요.</p>',
      features: ['energy'],
      setup() { resetFlags(); S.en.dir = 'cw'; S.en.grid = false; setScene('energy'); },
      recap: '시계 방향 순환에서 경로로 둘러싸인 넓이가 알짜 일 W예요. W = Q_h − Q_c이고 열효율 e = W / Q_h는 항상 1보다 작아요. 반시계 방향은 일을 받아 열을 퍼내는 냉장고로, Q_h = Q_c + W예요.',
      summary: '<ul><li>P–V 그래프에서 순환 경로로 <b>둘러싸인 넓이 = 한 바퀴 동안의 알짜 일 W</b>. 시계 방향이면 W &gt; 0(열기관).</li>' +
        '<li>예시: 한 칸 100 J, 6칸이면 W = 600 J. 흡수한 열 Q_h = 2 000 J이면 버리는 열 Q_c = Q_h − W = 1 400 J.</li>' +
        '<li><b>열효율 e = W / Q_h</b> = 600 / 2 000 = <b>30 %</b>. 버리는 열 Q_c가 있으므로 e는 100 %보다 작아요.</li>' +
        '<li>구간별로 보면: 단열 압축 W = ' + MINUS + '654 J, 단열 팽창 W = +1 254 J이고 등적 구간의 W는 0이어서 합이 600 J. 모든 구간의 ΔU를 더하면 0이에요.</li>' +
        '<li><b>반시계 방향</b> 순환은 일 W를 받아 저온에서 열 Q_c를 퍼내 고온으로 Q_h = Q_c + W를 내보내는 <b>냉장고·에어컨</b>이에요.</li></ul>',
      missions: [
        {
          title: '둘러싸인 넓이로 알짜 일 읽기', manual: true,
          goal: '<b>🔃 시계 방향</b>에서 <b>🔢 칸 세기</b>를 켜고, 경로로 둘러싸인 넓이를 세어 알짜 일 <b>W</b>를 J 단위로 입력한 뒤 ✔ 확인하기를 누르세요.',
          hint: '칸 안의 숫자를 모두 더하면 둘러싸인 넓이(칸 수)예요. 한 칸이 100 J이므로 칸 수 × 100 J이 알짜 일이에요.',
          setup() { resetFlags(); S.en.dir = 'cw'; S.en.grid = true; clr('iW', 'iE'); setFlag('w', true); setScene('energy'); },
          check() {
            if (S.en.dir !== 'cw') return '시계 방향 순환(열기관)에서 읽어 주세요.';
            let v = num('iW'); if (v == null) return '알짜 일 W를 숫자로 입력해 주세요 (J).';
            const ok = Math.abs(v - WNET) <= 60; fb([[$('#iW'), ok]]);
            if (ok) { S.flags.wOK = true; return true; }
            if (v > 0 && v < 20) return '단위를 확인해요. 칸 수가 아니라 J 단위로, 한 칸이 100 J이에요 (6칸이면 600 J).';
            if (v < 0) return '시계 방향 순환에서는 기체가 일을 밖으로 내보내요. W는 양수예요.';
            return '칸 안의 숫자를 모두 더한 값(약 6)에 100 J을 곱해 보세요.';
          },
          status: () => '입력 ' + ($('#iW').value.trim() || '—') + ' J',
          explain: '경로로 둘러싸인 넓이는 약 6칸이고 한 칸이 100 J이므로 <b>W ≈ 600 J</b>이에요. 팽창 때 한 일(C→D, +1 254 J)에서 압축 때 받은 일(A→B, ' + MINUS + '654 J)을 뺀 값과 같아요. 제1법칙에서 W = Q_h − Q_c이므로 버리는 열은 Q_c = 2 000 − 600 = 1 400 J이에요.',
        },
        {
          title: '열효율 구하기', manual: true,
          goal: '흡수한 열 <b>Q_h = 2 000 J</b>, 알짜 일 <b>W = 600 J</b>일 때 열효율 <b>e = W / Q_h</b>를 %로 입력하고 ✔ 확인하기를 누르세요.',
          hint: 'e = 600 / 2 000 = 0.3 이에요. 퍼센트로는 0.3 × 100 이에요.',
          setup() { resetFlags(); S.en.dir = 'cw'; S.en.grid = false; S.flags.wOK = true; clr('iW', 'iE'); setFlag('e', true); setScene('energy'); },
          check() {
            const v = num('iE'); if (v == null) return '열효율을 숫자로 입력해 주세요 (%).';
            const ok = Math.abs(v - EFF) <= 1; fb([[$('#iE'), ok]]);
            if (ok) { S.flags.eOK = true; return true; }
            if (Math.abs(v - EFF / 100) < 0.02) return '0.3은 비율이에요. 퍼센트로 바꾸려면 100을 곱해요.';
            if (Math.abs(v - 70) <= 1) return '70 %는 버리는 열의 비율(Q_c / Q_h)이에요. e는 일이 된 비율 W / Q_h예요.';
            return 'e = W / Q_h = 600 / 2 000 을 계산하고 퍼센트로 바꿔 보세요.';
          },
          status: () => '입력 ' + ($('#iE').value.trim() || '—') + ' %',
          explain: '<b>e = W / Q_h = 600 / 2 000 = 0.30 = 30 %</b>예요. 흡수한 열의 30 %만 일이 되고 나머지 70 %(Q_c = 1 400 J)는 배기로 버려져요. 그래서 열효율은 항상 100 %보다 작아요.',
        },
        {
          type: 'quiz', title: '냉장고를 열어 두면?',
          goal: '순환을 <b>반시계 방향</b>으로 돌리면 냉장고예요. 문을 열어 둔 냉장고를 켜 둔 닫힌 방은 시원해질까요, 따뜻해질까요?',
          setup() { resetFlags(); S.flags.wOK = true; S.flags.eOK = true; S.en.dir = 'ccw'; S.en.grid = false; setScene('energy'); },
          choices: ['안쪽에서 열 Q_c를 퍼내므로 방이 점점 시원해져요', '뒤로 내보내는 열 Q_h = Q_c + W가 퍼낸 열 Q_c보다 크므로 방은 오히려 따뜻해져요', '냉장고는 열을 방출하지 않으므로 방의 온도는 변하지 않아요', '에너지는 보존되므로 방의 온도는 절대 변하지 않아요'],
          answer: 1,
          feedback: ['방 안에서 열을 퍼내 같은 방 안으로 내보내는 거예요. 퍼낸 열보다 내보내는 열이 더 커요.', '', '냉장고는 일을 받아 열을 퍼내고, 뒤쪽으로 더 많은 열 Q_h를 방출해요.', '에너지가 보존되기 때문에 방 안의 에너지는 오히려 전기가 한 일 W만큼 늘어요.'],
          explain: '냉장고는 전기로 일 W를 받아 안쪽(저온)에서 Q_c를 퍼내고 뒤쪽(고온)으로 <b>Q_h = Q_c + W</b>를 내보내요. 위의 예에서 방출하는 열 2 000 J이 퍼낸 열 1 400 J보다 600 J 더 커서, 닫힌 방 전체는 따뜻해져요.',
        },
      ],
    },
    {
      title: '효율 높이기: 열기관의 발전', short: '효율 높이기', icon: '📈', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 열효율 e = W / Q_h는 100 %보다 작다는 것을 알았어요. 그렇다면 사람들은 열효율을 높이려고 어떤 노력을 해 왔을까요?</div>' +
        '<p>먼저 열기관이 세상에 나온 <b>순서</b>대로 눌러 보고 효율 막대를 비교해요. 그다음 효율을 높이는 <b>방법</b>이 자동차의 어느 곳에 효과가 있는지 짝지어 봐요. (가솔린·디젤·가스 터빈·복합 화력의 효율은 오늘날 대표 값이에요.)</p>',
      features: ['history'],
      setup() { resetFlags(); hiReset(); setScene('history'); },
      recap: '열기관은 마찰·열 누설을 줄이고, 고온과 저온의 차를 키우고, 버리는 열을 다시 쓰는 방향으로 발전해 왔어요. 그래도 버리는 열 Q_c가 있으므로 열효율이 100 %가 될 수는 없어요.',
      summary: '<ul><li>효율의 변화(대략): 뉴커먼 증기 기관(1712) 1 % 안팎 → 와트(1769) 약 3 % → 가솔린 25~30 % → 디젤 35~40 % → 가스 터빈 → <b>복합 화력 55~60 %</b>.</li>' +
        '<li>효율을 높이는 방법: <b>마찰·열 누설 줄이기</b>, <b>연소 온도를 높이고 배출 온도는 낮추기</b>(고온과 저온의 차 키우기), <b>배기열 다시 쓰기</b>(복합 화력·열병합 발전), <b>회생 제동·하이브리드</b>.</li>' +
        '<li>복합 화력 발전은 가스 터빈의 뜨거운 배기가스로 증기 터빈을 또 돌려 버려지는 열 Q_c를 줄여요. 열병합 발전은 폐열을 난방에 써서 총이용률이 약 80 %예요.</li>' +
        '<li>자동차 연료 에너지 100 % 중 기관이 내는 일은 약 30 %(바퀴까지는 약 20 %), 배기가스로 약 35 %, 냉각수·방열로 약 30 %, 기타 약 5 %예요.</li>' +
        '<li>열효율은 100 %가 될 수 없어요(Q_c를 버려야 하는 까닭은 다음 차시에서 만나요).</li></ul>',
      missions: [
        {
          title: '열기관을 나온 순서대로 놓기', manual: true,
          goal: '여섯 가지 기관 카드를 <b>세상에 나온 순서(연도)</b>대로 눌러 1번부터 6번까지 놓고 ✔ 확인하기를 누르세요.',
          hint: '카드에 연도가 적혀 있어요. 가장 오래된 1712년 카드부터 차례로 눌러요. 틀리면 카드가 흔들려요.',
          setup() { resetFlags(); hiReset(); setScene('history'); },
          check() {
            if (S.hi.placed.length < 6) return '여섯 개를 모두 순서대로 눌러 주세요 (지금 ' + S.hi.placed.length + '개).';
            return true;
          },
          status: () => mark(S.hi.placed.length === 6) + ' 순서 ' + S.hi.placed.length + ' / 6',
          explain: '뉴커먼(1712) → 와트(1769) → 가솔린 기관(1876) → 디젤 기관(1897) → 가스 터빈(1939) → 복합 화력(1949) 순이에요. 시간이 갈수록 효율도 1 % 안팎에서 55~60 %까지 높아졌어요. 그래도 100 %에는 닿을 수 없어요.',
        },
        {
          title: '효율 높이는 방법의 효과 찾기', manual: true,
          goal: '네 가지 방법이 각각 자동차의 <b>어느 곳(①~④)</b>에서 효과가 나타나는지 짝지어 보고 ✔ 확인하기를 누르세요.',
          hint: '그림의 ①은 기관 안, ②는 연소할 때와 배출할 때의 온도, ③은 배기가스, ④는 브레이크예요.',
          setup() { resetFlags(); S.match = ['', '', '', '']; clrSel('#matchGrid select'); setFlag('match', true); setScene('history'); },
          check() {
            if (S.match.some((v) => v === '')) return '네 가지 방법을 모두 골라 주세요.';
            const oks = METHODS.map((m, i) => +S.match[i] === m.z);
            fb(oks.map((o, i) => [$('#sM' + i), o]));
            if (oks.every(Boolean)) return true;
            const i = oks.findIndex((o) => !o);
            return '"' + METHODS[i].n + '": ' + ['마찰과 열 누설은 기관 안에서 일을 줄이는 손실이에요.', '고온 열원과 저온 열원의 온도 차와 관련돼요.', '버려지는 열 Q_c를 다시 쓰는 것이에요.', '제동할 때 열로 사라지는 에너지를 되찾는 것이에요.'][METHODS[i].z];
          },
          status: () => '짝지은 방법 ' + S.match.filter((v) => v !== '').length + ' / 4',
          explain: '<b>마찰·열 누설 줄이기</b>는 ① 기관 안, <b>연소 온도를 높이고 배출 온도를 낮추기</b>는 ② 고온과 저온의 차, <b>배기열 다시 쓰기</b>는 ③ 버려지는 열 Q_c, <b>회생 제동</b>은 ④ 제동할 때 사라지는 운동 에너지를 되찾는 방법이에요.',
        },
        {
          type: 'quiz', title: '복합 화력의 효율이 높은 까닭',
          goal: '가스 터빈 하나보다 <b>복합 화력 발전</b>(가스 터빈 + 증기 터빈)의 열효율이 더 높은 까닭은?',
          setup() { resetFlags(); setScene('history'); },
          choices: ['연료를 두 배로 많이 쓰기 때문이에요', '가스 터빈이 버리던 뜨거운 배기열로 증기 터빈을 또 돌려, 같은 연료로 얻는 일 W가 늘고 버리는 열이 줄기 때문이에요', '열기관이 에너지를 새로 만들어 내기 때문이에요', '낮은 온도의 열을 쓰면 열효율이 100 %에 가까워지기 때문이에요'],
          answer: 1,
          feedback: ['연료를 더 쓰는 것이 아니라 같은 연료로 일을 더 얻는 거예요.', '', '에너지를 새로 만드는 기관은 없어요. 버려지던 열을 다시 쓴 거예요.', '열효율은 어떤 경우에도 100 %가 될 수 없어요. Q_c를 줄일 뿐이에요.'],
          explain: '가스 터빈의 배기가스에는 아직 많은 열이 남아 있어요. 이 열로 증기 터빈을 또 돌리면 같은 연료(Q_h)로 일 W를 더 얻고 버리는 열 Q_c는 줄어요. 그래서 e = W / Q_h가 55~60 %까지 올라가요.',
        },
      ],
    },
    {
      title: '영향 평가: 편리함과 대가', short: '영향 평가', icon: '🌍', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 열기관의 효율을 높이려는 노력을 봤어요. 열기관은 산업과 생활을 크게 바꿨지만, 연료를 태우는 만큼 환경에도 영향을 줘요. 통합과학에서 배운 <b>지구 에너지 출입·온실 효과</b>와 이어서 생각해 봐요.</div>' +
        '<p>열기관의 영향을 <b>산업발전/환경</b>, <b>긍정(👍)/부정(👎)</b>으로 분류하고, 발전 방식을 하나 골라 <b>효율과 CO₂ 배출</b>을 함께 따져 봐요. 슬라이더로 우리 모둠이 중요하게 보는 기준을 바꿔 평가 점수가 어떻게 달라지는지도 보세요. 정해진 답이 하나만 있는 토론은 아니에요.</p>',
      features: ['impact'],
      setup() { resetFlags(); S.im.cat = [0, 0, 0, 0, 0, 0, 0, 0]; S.im.src = ''; S.im.rs = ''; S.im.w = 50; setScene('impact'); },
      recap: '열기관은 산업발전과 편리함을 가져왔지만 CO₂ 증가·온난화·대기오염·열섬 같은 환경 문제도 일으켜요. 효율을 높이면 같은 일에 필요한 연료와 CO₂가 줄고, 어떤 에너지원으로 전기를 만드는지도 중요해요.',
      summary: '<ul><li><b>산업발전</b>: 산업혁명(공장·철도·증기선), 자동차·항공기로 이동 거리 확대, 전기 에너지의 대량 공급.</li>' +
        '<li><b>환경 문제</b>: 대기 중 CO₂ 농도 산업혁명 전 약 280 ppm → 1960년 약 317 ppm → 2020년대 약 420 ppm, 지구 평균 기온 산업화 이전보다 약 1.1 ℃ 상승, 도시 대기오염과 열섬(폐열), 화석 연료 고갈.</li>' +
        '<li>발전 1 kWh당 CO₂: 석탄 약 0.9 kg, LNG 복합 약 0.4 kg, 풍력·태양광은 연소가 없어 거의 0. 열효율이 높으면 같은 전기를 만드는 연료와 CO₂가 줄어요.</li>' +
        '<li>전기 자동차는 달릴 때 배기가스가 없지만, 그 전기를 어떻게 만드는지에 따라 전체 CO₂가 달라져요.</li>' +
        '<li>열기관의 평가는 산업발전과 환경 중 무엇을 더 중요하게 보는지에 따라 달라질 수 있어요. 근거를 들어 판단하는 것이 중요해요.</li></ul>',
      missions: [
        {
          title: '영향 카드 8장 분류하기', manual: true,
          goal: '8장의 카드를 눌러 <b>산업발전 👍/👎</b> 또는 <b>환경 👍/👎</b>로 분류하고 ✔ 확인하기를 누르세요. (누를 때마다 분류가 바뀌어요)',
          hint: '산업혁명·자동차·전기 공급은 산업발전의 긍정 효과예요. CO₂·대기오염·열섬은 환경의 부정 효과이고, 효율이 높아지면 연료와 CO₂가 줄어 환경에 긍정적이에요.',
          setup() { resetFlags(); S.im.cat = [0, 0, 0, 0, 0, 0, 0, 0]; setScene('impact'); },
          check() {
            if (S.im.cat.some((v) => v === 0)) return '8장을 모두 분류해 주세요 (지금 ' + S.im.cat.filter((v) => v > 0).length + '장).';
            const bad = IMP.map((d, i) => i).filter((i) => !impOK(i));
            if (!bad.length) { S.flags.impOK = true; return true; }
            const i = bad[0];
            return '"' + IMP[i].n + '"를 다시 생각해 보세요. ' + IMP[i].d + '.';
          },
          status: () => '분류 ' + S.im.cat.filter((v) => v > 0).length + ' / 8, 맞은 것 ' + IMP.filter((d, i) => impOK(i) && S.im.cat[i] > 0).length + '장',
          explain: '산업혁명·자동차와 항공기·전기 공급은 <b>산업발전 👍</b>, 대기오염·CO₂ 증가와 온난화·열섬은 <b>환경 👎</b>, 화석 연료 고갈은 산업과 환경 모두에 부담(👎)이에요. 열효율 향상은 같은 일에 연료와 CO₂를 줄이는 <b>환경 👍</b>(연료 절약으로 산업에도 도움)이에요.',
        },
        {
          title: '발전 방식을 고르고 이유 대기',
          goal: '석탄 화력, LNG 복합, 풍력·태양광 중 <b>효율과 CO₂ 배출을 함께 고려해</b> 하나를 고르고, 알맞은 이유를 고르세요.',
          hint: '아래 그래프에서 효율(열기관일 때)과 1 kWh당 CO₂를 비교해요. 화력 중에서는 효율이 높은 쪽이 같은 전기에 CO₂가 적어요. 풍력·태양광은 연소가 없어요.',
          setup() { resetFlags(); S.im.src = ''; S.im.rs = ''; setFlag('src', true); setScene('impact'); },
          check: () => (S.im.src === 'lng' && S.im.rs === 'a') || (S.im.src === 'ren' && S.im.rs === 'b'),
          hold: 0.5,
          status() {
            const s = SRC.filter((x) => x.id === S.im.src)[0];
            const msg = !s ? '발전 방식을 골라요' : !S.im.rs ? '이유를 골라요' : s.id === 'coal' ? '석탄은 효율도 낮고 CO₂도 가장 많아요' : (s.key === (S.im.rs) ? '좋은 판단이에요' : '고른 방식과 이유가 맞지 않아요');
            return mark(!!s) + ' 방식 ' + (s ? s.n : '—') + ' &nbsp; ' + mark(!!S.im.rs) + ' 이유 &nbsp; ' + msg;
          },
          explain: '<b>LNG 복합</b>은 효율이 55~60 %로 높아 석탄(약 40 %)보다 같은 전기에 연료와 CO₂(약 0.4 kg/kWh)가 적어요. <b>풍력·태양광</b>은 연소가 없어 발전할 때 CO₂가 거의 나오지 않아요(다만 날씨에 따라 발전량이 달라지는 한계가 있어요). 석탄 화력은 값이 싸고 많이 쓰지만 CO₂ 배출이 가장 많아요.',
        },
        {
          type: 'quiz', title: '전기 자동차는 곧바로 무공해일까?',
          goal: '전기 자동차는 달릴 때 배기가스를 내지 않아요. 그런데도 곧바로 "무공해"라고 하기 어려운 이유는?',
          setup() { resetFlags(); setScene('impact'); },
          choices: ['전기 자동차는 연료를 쓰지 않아서 에너지를 보존하지 못해요', '전기를 만드는 발전소가 화석 연료를 태우면 그 과정에서 CO₂가 나오기 때문이에요', '전기 자동차의 열효율이 100 %를 넘기 때문이에요', '전기는 CO₂와 상관이 전혀 없기 때문에 이유가 없어요'],
          answer: 1,
          feedback: ['에너지는 어떤 경우에도 보존돼요. 문제는 에너지를 어디서 얻느냐예요.', '', '어떤 장치도 효율이 100 %를 넘을 수 없어요.', '전기를 만드는 방식에 따라 CO₂ 배출이 달라져요(석탄 약 0.9, LNG 약 0.4, 풍력·태양광 ≈ 0 kg/kWh).'],
          explain: '전기 자동차 자체는 배기가스가 없지만, 충전하는 전기를 <b>석탄·LNG 화력</b>으로 만들면 발전소에서 CO₂가 나와요. 풍력·태양광 같은 연소 없는 발전의 비중이 높을수록 실제로 CO₂가 줄어요. 그래서 열기관의 영향은 <b>에너지를 어떻게 얻는지</b>까지 함께 평가해야 해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-heat-cycle', mount: '#game', badge: '열기관 박사', homeHref: '../../index.html#hm',
    featureLabels: { engine: '⚙️ 엔진 · 순환 과정', energy: '⚖️ 둘러싸인 넓이 = 일', history: '📈 열기관의 역사와 효율', impact: '🌍 산업·환경 영향 평가' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('engine');
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    cyStep(dt); enStep(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    switch (S.mode) {
      case 'engine': drawEngineScene(dt); break;
      case 'energy': drawEnergyScene(dt); break;
      case 'history': drawHistoryScene(dt); break;
      default: drawImpactScene(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, pos, SEG, HIST, DISP, IMP, SRC, CELLS, WNET, QC, QH, EFF, WAB, WCD, impOK, hiTap, impTap, cyOnce, cyToggle, impLayout,
    stepCy(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) cyStep(0.02); },
  };
})();
