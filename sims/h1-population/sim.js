/* =========================================================
   통합과학2 Ⅱ. 환경과 에너지 - 생태계 평형과 개체군 변동 (단원 3차시)
   성취기준 [10통과2-02-02] 먹이 관계와 생태 피라미드를 중심으로 생태계 평형이 유지되는 과정을 이해하고,
   환경의 변화가 생태계에 미칠 수 있는 영향에 대해 협력적으로 소통할 수 있다. (뒷부분: 평형 유지와 환경 변화)
   ① 관찰: 평형 상태 (안정된 초원 5년)
   ② 실험: 개체군 변동 (토끼·여우 40년 모의실험, 되먹임)
   ③ 분석: 환경 변화 (여우 제거·가뭄·외래 경쟁 종·서식지 감소, 회복과 붕괴)
   ④ 적용: 함께 토의 (저수지 외래종, 사실과 가치 판단, 합의안)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
  const SC = 0.6;                       // 휴대폰에서 그림 장면(800x560)을 줄이는 비율
  const SH = Math.round(560 * SC);      // 줄인 장면의 높이(336)
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eaf6ff' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FONT_EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function E(ch, x, y, size, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
    if (o.sx || o.sy) ctx.scale(o.sx == null ? 1 : o.sx, o.sy == null ? 1 : o.sy);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = size + 'px ' + FONT_EMO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3; }
    ctx.fillStyle = '#000'; ctx.fillText(ch, 0, 0); ctx.restore();
  }
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch.trim() === '' ? '' : ch; } else line = t;
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700);
    ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
    return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function tag(x, y, text, color, scale, size) {
    ctx.save(); ctx.font = D.font(size || 13, 800);
    const w = ctx.measureText(text).width + 18;
    ctx.restore();
    const cx = clamp(x, w / 2 + 4, VW - w / 2 - 4);
    ctx.save(); ctx.translate(cx, y); ctx.scale(scale == null ? 1 : scale, scale == null ? 1 : scale);
    D.label(0, 0, text, { bg: color, size: size || 13 });
    ctx.restore();
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const jong = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 ? c % 28 : -1; };
  const josa = (w, pair) => { const [a, b] = pair.split('/'); return w + (jong(w) > 0 ? a : b); };

  /* =========================================================
     개체군 변동 모델 (단순화한 예시, 한 세대 = 1년)
     토끼 R, 여우 F, 풀 상태 G(0~1): 토끼는 풀의 양(수용력 K)에 따라 늘고 여우에게 잡아먹혀요.
     여우는 토끼를 먹어야 번식해요. 토끼가 많으면 풀이 줄고, 풀은 다시 자라요.
     ========================================================= */
  const MP = { r: 0.374368, c: 2.41346, h: 745.535, e: 0.622123, d: 0.50571, rho: 0.117078, g: 0.161853 };
  const K0 = 1000, R_INIT = 400, F_INIT = 40, M0 = 1;       // 풀의 양(수용력), 처음 토끼·여우, 포식 강도
  const SIM_YEARS = 40, ENV_YEARS = 50, EVENT_YEAR = 10;     // 모의실험 기간, 환경 변화 실험 기간, 변화가 일어나는 해
  const BAND = 0.25;                                          // 평형 범위: 평형 값의 ±25 %
  const RAX = 1000, FAX = 300;                                // 그래프 눈금(왼쪽 토끼, 오른쪽 여우)
  const RB_UNIT = 40, FX_UNIT = 10;                           // 장면에서 그림 한 칸이 나타내는 마리 수
  function stepModel(s, K, m) {
    const Kt = Math.max(K * s.G, 1);
    const growth = MP.r * s.R * (1 - s.R / Kt);
    const eaten = Math.min(s.R, m * MP.c * s.F * s.R / (s.R + MP.h));
    let R2 = Math.max(0, s.R + growth - eaten), F2 = s.F * (1 - MP.d) + MP.e * eaten;
    const G2 = clamp(s.G + MP.rho * (1 - s.G) - MP.g * (s.R / K) * s.G, 0.02, 1);
    if (R2 < 1) R2 = 0; if (F2 < 1) F2 = 0;
    return { R: R2, F: F2, G: G2 };
  }
  function simulate(R, F, K, m, years, G) {
    const d = { R: [R], F: [F], G: [G == null ? 1 : G], N: years };
    let s = { R, F, G: G == null ? 1 : G };
    for (let t = 0; t < years; t++) { s = stepModel(s, K, m); d.R.push(s.R); d.F.push(s.F); d.G.push(s.G); }
    return d;
  }
  const EQ = (() => { let s = { R: R_INIT, F: F_INIT, G: 1 }; for (let i = 0; i < 800; i++) s = stepModel(s, K0, M0); return s; })();
  const BASE = simulate(R_INIT, F_INIT, K0, M0, SIM_YEARS, 1);
  const argmax = (a, hi) => { let b = 0; for (let i = 0; i <= (hi == null ? a.length - 1 : hi); i++) if (a[i] > a[b]) b = i; return b; };
  const BASE_RT = argmax(BASE.R), BASE_FT = argmax(BASE.F);
  const ap = (v) => (v >= 100 ? Math.round(v / 10) * 10 : Math.round(v));   // '약' 값
  // 안정된 초원의 5년 (평형 상태에서 해마다 조금씩 오르내림: 날씨 같은 작은 변화)
  const EQ_RM = [0.98, 1.03, 0.96, 1.02, 1.0], EQ_FM = [1.01, 1.05, 0.97, 1.03, 0.99];
  const EQ_R = EQ_RM.map((m) => Math.round(EQ.R * m)), EQ_F = EQ_FM.map((m) => Math.round(EQ.F * m));
  // 환경 변화 4가지 × 작은/큰 변화
  const PAR = { fox: { s: 5, l: 0 }, drought: { s: 0.8, l: 0.3 }, alien: { s: 0.95, l: 0.6 }, habitat: { s: 0.9, l: 0.5 } };
  const pctDown = (x) => Math.round((1 - x) * 100);
  const ENV = {
    fox: { name: '여우 제거', ic: '🦊', s: { label: '여우 ' + PAR.fox.s + '마리 감소', f: (st, K) => { st.F = Math.max(0, st.F - PAR.fox.s); return K; } }, l: { label: '여우를 모두 없앰', f: (st, K) => { st.F = 0; return K; } } },
    drought: { name: '가뭄(풀 감소)', ic: '☀️', s: { label: '풀이 ' + pctDown(PAR.drought.s) + ' % 줄어듦', f: (st, K) => { st.G *= PAR.drought.s; return K; } }, l: { label: '풀이 ' + pctDown(PAR.drought.l) + ' % 줄어듦', f: (st, K) => { st.G *= PAR.drought.l; return K; } } },
    alien: { name: '외래 경쟁 종', ic: '🐐', s: { label: '외래 종이 풀의 ' + pctDown(PAR.alien.s) + ' %를 먹음', f: (st, K) => K * PAR.alien.s }, l: { label: '외래 종이 풀의 ' + pctDown(PAR.alien.l) + ' %를 먹음', f: (st, K) => K * PAR.alien.l } },
    habitat: { name: '서식지 감소', ic: '🚧', s: { label: '서식지 면적 ' + pctDown(PAR.habitat.s) + ' % 감소', f: (st, K) => { st.R *= PAR.habitat.s; st.F *= PAR.habitat.s; return K * PAR.habitat.s; } }, l: { label: '서식지 면적 ' + pctDown(PAR.habitat.l) + ' % 감소', f: (st, K) => { st.R *= PAR.habitat.l; st.F *= PAR.habitat.l; return K * PAR.habitat.l; } } },
  };
  function envData(type, size) {
    const st = { R: EQ.R, F: EQ.F, G: EQ.G }; let K = K0;
    const d = { R: [], F: [], G: [], K: [], N: ENV_YEARS, type, size };
    for (let t = 0; t < EVENT_YEAR; t++) { d.R.push(st.R); d.F.push(st.F); d.G.push(st.G); d.K.push(K); }
    K = ENV[type][size].f(st, K);
    d.R.push(st.R); d.F.push(st.F); d.G.push(st.G); d.K.push(K);
    let s = st;
    for (let t = EVENT_YEAR; t < ENV_YEARS; t++) { s = stepModel(s, K, M0); d.R.push(s.R); d.F.push(s.F); d.G.push(s.G); d.K.push(K); }
    return d;
  }
  const inBand = (R, F) => Math.abs(R - EQ.R) <= BAND * EQ.R && Math.abs(F - EQ.F) <= BAND * EQ.F;
  function envOutcome(d) {
    const e = d.N, R = d.R[e], F = d.F[e];
    if (F < 1) return { ok: false, why: '여우가 모두 사라졌어요' };
    if (R < 1) return { ok: false, why: '토끼가 모두 사라졌어요' };
    if (inBand(R, F)) {
      let last = EVENT_YEAR - 1; for (let t = EVENT_YEAR; t <= e; t++) if (!inBand(d.R[t], d.F[t])) last = t;
      return { ok: true, yrs: last + 1 - EVENT_YEAR, why: last < EVENT_YEAR ? '거의 흔들리지 않았어요' : (last + 1 - EVENT_YEAR) + '년 만에 평형 범위로 돌아왔어요' };
    }
    if (F < 0.25 * EQ.F) return { ok: false, why: '여우가 거의 사라졌어요' };
    return { ok: false, why: '평형이 다른 수준으로 바뀌었어요' };
  }
  const OUT = {}; Object.keys(ENV).forEach((t) => { OUT[t] = { s: envOutcome(envData(t, 's')), l: envOutcome(envData(t, 'l')) }; });

  /* ---------- 상태 ---------- */
  const S = { mode: 'eq', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { eq: '⚖️ 안정된 초원 (평형 상태)', sim: '📈 개체군 변동 모의실험', env: '🌪️ 환경 변화의 영향', talk: '🗣️ 저수지 외래종 토의' };
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); const h = $('#stageHint'); if (h) h.classList.add('hide'); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-classify')) on = !!S.showClassify;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (S.sim) {
      const q = S.sim;
      $('#sFox').value = q.fox; $('#oFox').textContent = q.fox + '마리'; $('#sFox').style.setProperty('--pct', ((q.fox - 5) / 95 * 100) + '%');
      $('#sGrass').value = q.grass; $('#oGrass').textContent = String(q.grass); $('#sGrass').style.setProperty('--pct', ((q.grass - 600) / 800 * 100) + '%');
      $('#sPred').value = q.pred; $('#oPred').textContent = q.pred + ' %'; $('#sPred').style.setProperty('--pct', ((q.pred - 70) / 60 * 100) + '%');
      $('#bSimRun').disabled = !!q.run; $('#bSimRun').textContent = q.run ? '⏳ 모의실험 중…' : q.done ? '▶ 다시 모의실험' : '▶ ' + SIM_YEARS + '년 모의실험';
    }
    if (S.env) {
      const e = S.env;
      $$('#envType button').forEach((b) => b.classList.toggle('on', b.dataset.t === e.type));
      $$('#envSize button').forEach((b) => b.classList.toggle('on', b.dataset.s === e.size));
      $('#envNote').textContent = ENV[e.type].name + ' · ' + ENV[e.type][e.size].label + ' (' + EVENT_YEAR + '년째에 일어나요)';
      $('#bEnvRun').disabled = !!e.run && e.run.playing;
    }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  /* ---------- 장면: 초원의 토끼와 여우 (그림 한 칸 = RB_UNIT / FX_UNIT 마리) ---------- */
  const NRB = 20, NFX = 24, NAL = 6;
  const IC = { rab: [], fox: [], al: [] };
  for (let i = 0; i < NRB; i++) IC.rab.push(new SciSim.Spring(0, { stiffness: 190, damping: 13 }));
  for (let i = 0; i < NFX; i++) IC.fox.push(new SciSim.Spring(0, { stiffness: 190, damping: 13 }));
  for (let i = 0; i < NAL; i++) IC.al.push(new SciSim.Spring(0, { stiffness: 190, damping: 13 }));
  const MEAD = PHONE ? { x: 6, y: 6, w: 468, h: 122 } : { x: 10, y: 8, w: 780, h: 150 };
  function drawMeadow(R, F, G, o) {
    o = o || {};
    const r = MEAD, t = S.clock, dt = o.dt || 0.016;
    const cover = o.cover || 0, usable = (r.w - 40) * (1 - cover);
    const nR = Math.min(NRB, Math.round(R / RB_UNIT)), nF = Math.min(NFX, Math.round(F / FX_UNIT)), nA = o.alien ? NAL : 0;
    IC.rab.forEach((s, i) => { s.target = i < nR ? 1 : 0; s.update(dt); }); IC.fox.forEach((s, i) => { s.target = i < nF ? 1 : 0; s.update(dt); }); IC.al.forEach((s, i) => { s.target = i < nA ? 1 : 0; s.update(dt); });
    ctx.save(); D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.clip();
    D.sky(r.x, r.y, r.w, r.h, o.dry ? '#ffd9a0' : '#bfe3ff', o.dry ? '#fff0d6' : '#eef8ff');
    if (!RM) { const cx = ((t * 6) % (r.w + 160)) - 80 + r.x; ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = '#fff'; [[0, 0, 14], [16, -5, 17], [34, 0, 14]].forEach((c) => { ctx.beginPath(); ctx.arc(cx + c[0], r.y + 26 + c[1], c[2], 0, TAU); ctx.fill(); }); ctx.restore(); }
    const gy = r.y + r.h * 0.42, gcol = SciSim.color.mix('#c9b27a', '#78c46f', clamp((G - 0.15) / 0.85, 0, 1));
    ctx.fillStyle = gcol; ctx.fillRect(r.x, gy, r.w, r.h - (gy - r.y));
    ctx.fillStyle = SciSim.color.shade(gcol, -0.12); ctx.beginPath(); ctx.moveTo(r.x, gy + 4); ctx.quadraticCurveTo(r.x + r.w * 0.3, gy - 14, r.x + r.w * 0.6, gy + 2); ctx.quadraticCurveTo(r.x + r.w * 0.85, gy - 8, r.x + r.w, gy + 4); ctx.lineTo(r.x + r.w, gy + 20); ctx.lineTo(r.x, gy + 20); ctx.fill();
    // 풀: 풀 상태 G에 비례해 많이
    const nBl = Math.round(G * 60);
    ctx.strokeStyle = '#3f9d4a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < nBl; i++) { const bx = r.x + 14 + ((i * 0.6180339 * 977) % 1) * (r.w - 28), by = gy + 8 + ((i * 0.7548776 * 613) % 1) * (r.h * 0.46); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 3, by - 8); ctx.moveTo(bx, by); ctx.lineTo(bx + 3, by - 9); ctx.stroke(); }
    const sx = (i, n) => r.x + 20 + (i + 0.5) / n * usable;
    IC.rab.forEach((s, i) => { if (s.value > 0.03) E('🐇', sx(i, NRB), gy + r.h * 0.22 - Math.abs(Math.sin(t * 2 + i)) * 3 * s.value, 27 * Math.max(0, s.value), { flip: i % 2 === 0 }); });
    IC.fox.forEach((s, i) => { if (s.value > 0.03) E('🦊', sx(i, NFX), gy + r.h * 0.42, 25 * Math.max(0, s.value), { flip: i % 3 === 0 }); });
    IC.al.forEach((s, i) => { if (s.value > 0.03) E('🐐', r.x + r.w - 30 - i * 30, gy + r.h * 0.16, 26 * Math.max(0, s.value), {}); });
    if (cover > 0.01) {
      const cx = r.x + 20 + usable + 10;
      ctx.fillStyle = 'rgba(80,80,90,.55)'; ctx.fillRect(cx, r.y, r.x + r.w - cx, r.h);
      ctx.save(); ctx.beginPath(); ctx.rect(cx, r.y, r.x + r.w - cx, r.h); ctx.clip(); ctx.strokeStyle = 'rgba(255,200,0,.65)'; ctx.lineWidth = 8;
      for (let k = -r.h; k < r.w; k += 24) { ctx.beginPath(); ctx.moveTo(cx + k, r.y + r.h); ctx.lineTo(cx + k + r.h, r.y); ctx.stroke(); } ctx.restore();
      E('🚧', cx + (r.x + r.w - cx) / 2, r.y + r.h * 0.45, 30);
    }
    if (o.dry) { ctx.fillStyle = 'rgba(255,140,40,' + (0.16 * o.dry) + ')'; ctx.fillRect(r.x, r.y, r.w, r.h); E('☀️', r.x + r.w - 40, r.y + 34, 40 + 10 * o.dry, { rot: t * 0.2 }); }
    if (o.flash > 0.02) { ctx.fillStyle = 'rgba(255,255,255,' + clamp(o.flash, 0, 0.9) + ')'; ctx.fillRect(r.x, r.y, r.w, r.h); }
    ctx.restore();
    // 범례
    D.roundRect(r.x + 8, r.y + 8, PHONE ? 290 : 324, 22, 11); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
    T(r.x + 18, r.y + 24, '🐇 한 칸 = ' + RB_UNIT + '마리 · 🦊 한 칸 = ' + FX_UNIT + '마리', PHONE ? 12 : 13, '#26324a', 'left', 800);
    if (o.flash > 0.3 && o.bolt) { ctx.save(); ctx.strokeStyle = '#fde047'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath(); const bx = r.x + r.w * 0.5; ctx.moveTo(bx, r.y); ctx.lineTo(bx - 14, r.y + r.h * 0.35); ctx.lineTo(bx + 6, r.y + r.h * 0.38); ctx.lineTo(bx - 10, r.y + r.h * 0.72); ctx.stroke(); ctx.restore(); }
  }

  /* ---------- 그래프 (왼쪽 눈금: 토끼, 오른쪽 눈금: 여우) ---------- */
  const GR = PHONE ? { x: 6, y: 134, w: 468, h: 420 } : { x: 10, y: 166, w: 780, h: 384 };
  const PB = { x: GR.x + (PHONE ? 46 : 62), y: GR.y + 40, w: GR.w - (PHONE ? 92 : 124), h: GR.h - 92 };
  const GX = (yr, N) => PB.x + yr / N * PB.w;
  const GYR = (v) => PB.y + PB.h - clamp(v / RAX, 0, 1) * PB.h;
  const GYF = (v) => PB.y + PB.h - clamp(v / FAX, 0, 1) * PB.h;
  const C_R = '#16a34a', C_F = '#ea580c';
  function drawGraphFrame(N, o) {
    o = o || {};
    panel(GR.x, GR.y, GR.w, GR.h, 18);
    ctx.fillStyle = '#fbfdff'; ctx.fillRect(PB.x, PB.y, PB.w, PB.h);
    ctx.strokeStyle = '#e3eaf3'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PB.y + PB.h - i / 4 * PB.h; ctx.beginPath(); ctx.moveTo(PB.x, y); ctx.lineTo(PB.x + PB.w, y); ctx.stroke();
      T(PB.x - 7, y + 4.5, String(RAX / 4 * i), 12.5, C_R, 'right', 800); T(PB.x + PB.w + 7, y + 4.5, String(FAX / 4 * i), 12.5, C_F, 'left', 800);
    }
    for (let yr = 0; yr <= N; yr += 10) { const x = GX(yr, N); ctx.beginPath(); ctx.moveTo(x, PB.y); ctx.lineTo(x, PB.y + PB.h); ctx.stroke(); T(x, PB.y + PB.h + 17, String(yr), 12.5, '#5d6879', 'center', 700); }
    ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PB.x, PB.y); ctx.lineTo(PB.x, PB.y + PB.h); ctx.lineTo(PB.x + PB.w, PB.y + PB.h); ctx.lineTo(PB.x + PB.w, PB.y); ctx.stroke();
    T(PB.x + PB.w / 2, PB.y + PB.h + 36, '시간 (년)', 13, '#34445c', 'center', 800);
    ctx.save(); ctx.translate(GR.x + 14, PB.y + PB.h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, '🐇 토끼 수 (마리)', 13, C_R, 'center', 800); ctx.restore();
    ctx.save(); ctx.translate(GR.x + GR.w - 12, PB.y + PB.h / 2); ctx.rotate(Math.PI / 2); T(0, 0, '🦊 여우 수 (마리)', 13, C_F, 'center', 800); ctx.restore();
  }
  function drawCurve(arr, N, p, yfn, col, w) {
    const last = Math.min(N, Math.floor(p));
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 3.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= last; i++) { const x = GX(i, N), y = yfn(arr[i]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    let hx = GX(last, N), hy = yfn(arr[last]);
    if (last < N && p > last) { const f = p - last, v = arr[last] + (arr[last + 1] - arr[last]) * f; hx = GX(p, N); hy = yfn(v); ctx.lineTo(hx, hy); }
    ctx.stroke(); ctx.restore();
    if (p > 0 && p < N + 0.001) D.sphere(hx, hy, 6, col, { gloss: false, outline: '#fff', outlineWidth: 2 });
  }
  const valAt = (arr, p) => { const i = Math.min(arr.length - 1, Math.floor(p)), j = Math.min(arr.length - 1, i + 1); return arr[i] + (arr[j] - arr[i]) * (p - i); };

  /* =========================================================
     ① 평형 상태: 안정된 초원의 5년
     ========================================================= */
  const EQ_YEARS = 5;
  function resetEq() { S.eq = { p: 0, play: true, read: {}, pop: {}, bars: { r: [0, 0, 0, 0, 0], f: [0, 0, 0, 0, 0] } }; }
  const eqReadN = () => Object.keys(S.eq.read).length;
  function eqLayout() {
    if (!PHONE) return [{ k: 'r', x: 10, y: 170, w: 386, h: 380, ax: 400, col: C_R, name: '🐇 토끼', v: EQ_R }, { k: 'f', x: 404, y: 170, w: 386, h: 380, ax: 100, col: C_F, name: '🦊 여우', v: EQ_F }];
    return [{ k: 'r', x: 6, y: 134, w: 468, h: 242, ax: 400, col: C_R, name: '🐇 토끼', v: EQ_R }, { k: 'f', x: 6, y: 384, w: 468, h: 242, ax: 100, col: C_F, name: '🦊 여우', v: EQ_F }];
  }
  const EL = eqLayout();
  const eqPlot = (c) => ({ x: c.x + 54, y: c.y + 46, w: c.w - 72, h: c.h - 100 });
  function eqBarRect(c, i) { const pb = eqPlot(c), slot = pb.w / EQ_YEARS, bw = Math.min(46, slot * 0.6); const val = c.v[i]; const h = clamp(val / c.ax, 0, 1) * pb.h; return { x: pb.x + slot * (i + 0.5) - bw / 2, y: pb.y + pb.h - h, w: bw, h, pb }; }
  function eqDown(p) {
    for (const c of EL) for (let i = 0; i < EQ_YEARS; i++) {
      if (S.eq.p < i + 1 - 0.02 && S.eq.play) continue;
      const b = eqBarRect(c, i);
      if (p.x >= b.x - 6 && p.x <= b.x + b.w + 6 && p.y >= b.pb.y && p.y <= b.pb.y + b.pb.h) {
        const k = c.k + i;
        if (!S.eq.read[k]) { S.eq.read[k] = true; S.eq.pop[k] = 0; SciSim.tween(S.eq.pop, { [k]: 1 }, { duration: 0.45, ease: 'outBack' }); Sound.success(); parts.burst(b.x + b.w / 2, b.y, { count: 8, colors: [c.col, '#fff', '#ffd24d'], speed: 90, size: 3, life: 0.6, gravity: 80 }); }
        else Sound.tick();
        S.eq.sel = k; return false;
      }
    }
    return false;
  }
  function stepEq(dt) { const E_ = S.eq; if (E_.play) { E_.p = Math.min(EQ_YEARS, E_.p + dt / 1.6); if (E_.p >= EQ_YEARS) E_.play = false; } }
  function drawEq(dt, t) {
    const E_ = S.eq, yr = Math.min(EQ_YEARS - 1, Math.floor(E_.p - 0.001 < 0 ? 0 : E_.p - 0.001));
    ctx.fillStyle = '#eef7ff'; ctx.fillRect(0, 0, VW, VH);
    drawMeadow(EQ_R[yr], EQ_F[yr], EQ.G, { dt });
    D.label(MEAD.x + MEAD.w - 70, MEAD.y + 22, E_.play ? yr + 1 + '년째' : '5년 관찰 끝', { bg: '#0f766e', size: PHONE ? 13 : 14.5 });
    EL.forEach((c) => {
      panel(c.x, c.y, c.w, c.h, 18);
      const pb = eqPlot(c);
      T(c.x + 16, c.y + 26, c.name + ' 수 (마리)', PHONE ? 14 : 16, c.col, 'left', 800);
      ctx.fillStyle = '#fbfdff'; ctx.fillRect(pb.x, pb.y, pb.w, pb.h);
      ctx.strokeStyle = '#e3eaf3'; ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) { const y = pb.y + pb.h - i / 4 * pb.h; ctx.beginPath(); ctx.moveTo(pb.x, y); ctx.lineTo(pb.x + pb.w, y); ctx.stroke(); T(pb.x - 7, y + 4.5, String(c.ax / 4 * i), 12.5, '#5d6879', 'right', 700); }
      ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pb.x, pb.y); ctx.lineTo(pb.x, pb.y + pb.h); ctx.lineTo(pb.x + pb.w, pb.y + pb.h); ctx.stroke();
      // 평형 범위 (모든 막대를 읽은 뒤)
      const allRead = eqReadN() === EQ_YEARS * 2;
      if (allRead) {
        const lo = Math.min.apply(null, c.v), hi = Math.max.apply(null, c.v), yl = pb.y + pb.h - hi / c.ax * pb.h, yh = pb.y + pb.h - lo / c.ax * pb.h;
        ctx.fillStyle = 'rgba(34,197,94,.18)'; ctx.fillRect(pb.x, yl, pb.w, yh - yl); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#15803d'; ctx.lineWidth = 1.5; ctx.strokeRect(pb.x, yl, pb.w, yh - yl); ctx.setLineDash([]);
        D.label(pb.x + pb.w - 4, yl - 13, '평형 범위 ' + lo + '~' + hi, { bg: '#15803d', size: 12.5, align: 'right' });
      }
      for (let i = 0; i < EQ_YEARS; i++) {
        const key2 = c.k + i, tgt = (E_.play ? i + 1 <= E_.p + 0.0001 : true) ? 1 : 0;
        E_.bars[c.k][i] = SciSim.approach(E_.bars[c.k][i], tgt, dt, 7);
        const b = eqBarRect(c, i), h = b.h * E_.bars[c.k][i];
        T(b.x + b.w / 2, pb.y + pb.h + 18, (i + 1) + '년', 13, '#5d6879', 'center', 700);
        if (h < 0.5) continue;
        const sel = E_.sel === key2;
        D.shadow(() => { D.roundRect(b.x, pb.y + pb.h - h, b.w, h, 8); const g = ctx.createLinearGradient(0, pb.y + pb.h - h, 0, pb.y + pb.h); g.addColorStop(0, SciSim.color.shade(c.col, 0.3)); g.addColorStop(1, c.col); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
        if (sel) { D.roundRect(b.x - 2, pb.y + pb.h - h - 2, b.w + 4, h + 2, 9); ctx.strokeStyle = '#1f2d44'; ctx.lineWidth = 2.5; ctx.stroke(); }
        if (E_.read[key2]) { const pp = clamp(E_.pop[key2], 0, 1.2); T(b.x + b.w / 2, pb.y + pb.h - h - 8, String(c.v[i]), PHONE ? 14 : 16, c.col, 'center', 800, { alpha: clamp(pp, 0, 1) }); }
        else T(b.x + b.w / 2, pb.y + pb.h - h - 8 + Math.sin(t * 4 + i) * 1.5, '👆', 16, '#5d6879', 'center', 700);
      }
    });
    parts.update(dt); parts.draw(ctx);
  }
  /* =========================================================
     ② 개체군 변동 모의실험 (40년)
     ========================================================= */
  function resetSim() { S.sim = { fox: F_INIT, grass: K0, pred: Math.round(M0 * 100), data: null, p: 0, run: false, done: false, cur: null, mk: { r: 2, f: 38 }, touched: { r: false, f: false }, drag: null }; }
  function simClear() { const q = S.sim; q.data = null; q.p = 0; q.run = false; q.done = false; q.cur = null; }
  function simRun() {
    const q = S.sim; if (q.run) return;
    q.data = simulate(R_INIT, q.fox, q.grass, q.pred / 100, SIM_YEARS, 1); q.p = 0; q.run = true; q.done = false; q.cur = null; Sound.click(); updateCtl();
  }
  function stepSim(dt) {
    const q = S.sim; if (!q.run) return;
    q.p = Math.min(SIM_YEARS, q.p + dt * 6);
    if (q.p >= SIM_YEARS) { q.run = false; q.done = true; Sound.success(); updateCtl(); }
  }
  const simPeaks = () => { const d = S.sim.data; return d ? { rt: argmax(d.R), ft: argmax(d.F) } : null; };
  const markerOk = () => { const q = S.sim, pk = simPeaks(); return !!(q.done && pk && q.touched.r && q.touched.f && Math.abs(q.mk.r - pk.rt) <= 1 && Math.abs(q.mk.f - pk.ft) <= 1); };
  const MKY = { r: 18, f: 48 };
  function drawMarkers(N) {
    const q = S.sim;
    [['r', '🐇', C_R, MKY.r], ['f', '🦊', C_F, MKY.f]].forEach(([k, em, col, dy]) => {
      const x = GX(q.mk[k], N), y = PB.y + dy;
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.lineTo(x, PB.y + PB.h); ctx.stroke(); ctx.restore();
      const lift = q.drag && q.drag.k === k ? 1 : 0;
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 16 + lift * 2, 0, TAU); ctx.fill(); }, { blur: 6 + lift * 6, y: 2 });
      ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(x, y, 16 + lift * 2, 0, TAU); ctx.stroke();
      E(em, x, y + 1, 20);
      D.label(x + (x > PB.x + PB.w - 90 ? -44 : 44), y, q.mk[k] + '년', { bg: col, size: 12.5 });
    });
  }
  function drawSim(dt, t) {
    const q = S.sim, d = q.data, p = q.p;
    ctx.fillStyle = '#eef7ff'; ctx.fillRect(0, 0, VW, VH);
    drawMeadow(d ? valAt(d.R, p) : R_INIT, d ? valAt(d.F, p) : q.fox, d ? valAt(d.G, p) : 1, { dt });
    D.label(MEAD.x + MEAD.w - 56, MEAD.y + 22, d ? Math.floor(p) + '년째' : '시작 전', { bg: '#0f766e', size: PHONE ? 13 : 14.5 });
    drawGraphFrame(SIM_YEARS);
    if (d) { drawCurve(d.R, SIM_YEARS, p, GYR, C_R); drawCurve(d.F, SIM_YEARS, p, GYF, C_F); }
    else T(PB.x + PB.w / 2, PB.y + PB.h / 2, '▶ ' + SIM_YEARS + '년 모의실험을 누르면 그래프가 그려져요', PHONE ? 14 : 17, '#8ea0b6', 'center', 800);
    // 눌러서 읽기
    if (d && q.cur != null && q.cur <= p) {
      const x = GX(q.cur, SIM_YEARS); ctx.save(); ctx.strokeStyle = 'rgba(31,45,68,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, PB.y); ctx.lineTo(x, PB.y + PB.h); ctx.stroke(); ctx.restore();
      D.sphere(x, GYR(d.R[q.cur]), 5, C_R, { gloss: false }); D.sphere(x, GYF(d.F[q.cur]), 5, C_F, { gloss: false });
      const tx = clamp(x, PB.x + 110, PB.x + PB.w - 110), ty = PB.y + PB.h - 14;
      D.label(tx, ty, q.cur + '년 · 🐇 ' + Math.round(d.R[q.cur]) + '마리 · 🦊 ' + Math.round(d.F[q.cur]) + '마리', { bg: '#1f2d44', size: PHONE ? 12.5 : 13.5 });
    }
    drawMarkers(SIM_YEARS);
    if (PHONE) textBlock(10, GR.y + GR.h + 24, 456, '🐇·🦊 표시를 끌어 가장 많은 해에 놓아요. 그래프를 눌러 그 해의 수도 읽어요.', 13, '#34445c', 19, 700);
    parts.update(dt); parts.draw(ctx);
  }
  const simPlotHit = (p) => p.x >= PB.x - 4 && p.x <= PB.x + PB.w + 4 && p.y >= PB.y && p.y <= PB.y + PB.h;
  const yearAt = (x, N) => clamp(Math.round((x - PB.x) / PB.w * N), 0, N);
  function simDown(p) {
    const q = S.sim;
    for (const k of ['r', 'f']) { const x = GX(q.mk[k], SIM_YEARS), y = PB.y + MKY[k]; if (Math.hypot(p.x - x, p.y - y) <= 24) { q.drag = { k, kind: 'mk' }; Sound.click(); return true; } }
    if (q.data && simPlotHit(p)) { q.drag = { kind: 'cur' }; q.cur = Math.min(Math.floor(q.p), yearAt(p.x, SIM_YEARS)); return true; }
    return false;
  }
  function simMove(p) {
    const q = S.sim, d = q.drag; if (!d) return;
    const yr = yearAt(p.x, SIM_YEARS);
    if (d.kind === 'mk') { if (q.mk[d.k] !== yr) { q.mk[d.k] = yr; q.touched[d.k] = true; Sound.tick(); } }
    else q.cur = Math.min(Math.floor(q.p), yr);
  }
  function simUp() { const q = S.sim; if (q.drag && q.drag.kind === 'mk') { const k = q.drag.k; q.touched[k] = true; const x = GX(q.mk[k], SIM_YEARS); parts.burst(x, PB.y + MKY[k], { count: 6, colors: [k === 'r' ? C_R : C_F, '#fff'], speed: 60, size: 2.6, life: 0.4, gravity: 0 }); } q.drag = null; }

  /* =========================================================
     ③ 환경 변화
     ========================================================= */
  function resetEnv() { S.env = { type: 'fox', size: 's', run: null, tried: {}, fx: { flash: 0, dry: 0, cover: 0, alien: false, bolt: false } }; S.cls = [null, null]; S.showClassify = false; clsSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }
  function envClear() { S.env.run = null; S.env.fx = { flash: 0, dry: 0, cover: 0, alien: false, bolt: false }; updateCtl(); }
  function envApply() {
    const e = S.env; if (e.run && e.run.playing) return;
    e.run = { d: envData(e.type, e.size), p: 0, playing: true, fired: false, out: OUT[e.type][e.size], t: 0 };
    e.fx = { flash: 0, dry: 0, cover: 0, alien: false, bolt: false };
    e.tried[e.type + ':' + e.size] = true; Sound.click(); updateCtl();
  }
  function stepEnv(dt) {
    const e = S.env, r = e.run, fx = e.fx;
    fx.flash = Math.max(0, fx.flash - dt * 1.6);
    if (!r) return;
    r.t += dt;
    if (r.playing) {
      r.p = Math.min(ENV_YEARS, r.p + dt * 6);
      if (!r.fired && r.p >= EVENT_YEAR) {
        r.fired = true;
        if (e.type === 'fox') { fx.flash = 1; fx.bolt = true; Sound.fail(); setTimeout(() => { if (S.env === e) fx.bolt = false; }, 600); }
        if (e.type === 'drought') fx.dryT = 1;
        if (e.type === 'alien') fx.alien = true;
        if (e.type === 'habitat') { fx.coverT = 1 - PAR.habitat[e.size]; fx.flash = 0.5; }
        const x = MEAD.x + MEAD.w / 2; parts.burst(x, MEAD.y + MEAD.h * 0.6, { count: 18, colors: ['#fde047', '#fb923c', '#fff'], speed: 160, size: 4, life: 0.8, gravity: 120 });
      }
      if (r.p >= ENV_YEARS) { r.playing = false; Sound.success(); updateCtl(); showHint(r.out.ok ? '✅ 평형이 회복됐어요! ' + r.out.why : '⚠️ 평형이 깨졌어요: ' + r.out.why, 5200); }
    }
    // 가뭄: 변화 직후 몇 년 동안 햇볕이 강해 보임
    if (e.type === 'drought') fx.dry = SciSim.approach(fx.dry, r.fired && r.p < EVENT_YEAR + 6 ? 1 : 0, dt, 3);
    if (e.type === 'habitat') fx.cover = SciSim.approach(fx.cover, r.fired ? fx.coverT || 0 : 0, dt, 4);
  }
  function drawEnv(dt, t) {
    const e = S.env, r = e.run, fx = e.fx, N = ENV_YEARS;
    ctx.fillStyle = '#eef7ff'; ctx.fillRect(0, 0, VW, VH);
    const d = r ? r.d : null, p = r ? r.p : 0;
    const st = d ? { R: valAt(d.R, p), F: valAt(d.F, p), G: valAt(d.G, p) } : EQ;
    drawMeadow(st.R, st.F, st.G, { dt, flash: fx.flash, bolt: fx.bolt, dry: fx.dry, cover: fx.cover, alien: fx.alien });
    D.label(MEAD.x + MEAD.w - 56, MEAD.y + 22, d ? Math.floor(p) + '년째' : '평형 상태', { bg: '#0f766e', size: PHONE ? 13 : 14.5 });
    drawGraphFrame(N);
    // 평형 범위 띠
    const bR1 = GYR(EQ.R * (1 + BAND)), bR2 = GYR(EQ.R * (1 - BAND)), bF1 = GYF(EQ.F * (1 + BAND)), bF2 = GYF(EQ.F * (1 - BAND));
    ctx.fillStyle = 'rgba(22,163,74,.16)'; ctx.fillRect(PB.x, bR1, PB.w, bR2 - bR1);
    ctx.fillStyle = 'rgba(234,88,12,.16)'; ctx.fillRect(PB.x, bF1, PB.w, bF2 - bF1);
    T(PB.x + 6, bR1 - 4, '🐇 평형 범위', 12, C_R, 'left', 800); T(PB.x + 6, bF1 - 4, '🦊 평형 범위', 12, C_F, 'left', 800);
    // 변화가 일어나는 해
    const ex = GX(EVENT_YEAR, N); ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex, PB.y); ctx.lineTo(ex, PB.y + PB.h); ctx.stroke(); ctx.restore();
    D.label(ex, PB.y + 12, EVENT_YEAR + '년: ' + ENV[e.type].name, { bg: '#7c3aed', size: PHONE ? 11.5 : 12.5 });
    if (d) {
      drawCurve(d.R, N, p, GYR, C_R); drawCurve(d.F, N, p, GYF, C_F);
      if (!r.playing) {
        const o = r.out; D.label(PB.x + PB.w / 2, PB.y + PB.h * 0.55, (o.ok ? '✅ 평형 회복 · ' : '⚠️ 평형이 깨졌어요 · ') + o.why, { bg: o.ok ? '#15803d' : '#b91c1c', size: PHONE ? 13 : 16 });
      }
    } else {
      // 변화 전 평형 (일정 범위)
      ctx.save(); ctx.strokeStyle = C_R; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(PB.x, GYR(EQ.R)); ctx.lineTo(GX(EVENT_YEAR, N), GYR(EQ.R)); ctx.stroke(); ctx.strokeStyle = C_F; ctx.beginPath(); ctx.moveTo(PB.x, GYF(EQ.F)); ctx.lineTo(GX(EVENT_YEAR, N), GYF(EQ.F)); ctx.stroke(); ctx.restore();
      T(PB.x + PB.w * 0.62, PB.y + PB.h * 0.55, '환경 변화를 고르고 ▶ 변화 적용을 눌러요', PHONE ? 13.5 : 16, '#8ea0b6', 'center', 800);
    }
    if (PHONE) textBlock(10, GR.y + GR.h + 24, 456, ENV[e.type].name + ' · ' + ENV[e.type][e.size].label + ' (' + EVENT_YEAR + '년째)', 13.5, '#34445c', 19, 800);
    parts.update(dt); parts.draw(ctx);
  }
  const clsSel = [];
  function buildClsRows() {
    const box = $('#clsRows');
    [['fox', 's'], ['fox', 'l']].forEach(([t, s], i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + (i + 1) + '. ' + ENV[t].ic + ' ' + ENV[t][s].label + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', ENV[t][s].label + ' 결과');
      sel.innerHTML = '<option value="">— 고르기 —</option><option value="ok">평형이 회복돼요</option><option value="bad">평형이 깨져요</option>';
      sel.addEventListener('change', () => { S.cls[i] = sel.value || null; sel.classList.remove('ok', 'bad'); Sound.click(); });
      row.appendChild(sel); box.appendChild(row); clsSel.push(sel);
    });
  }
  /* =========================================================
     ④ 함께 토의: 저수지 외래종
     ========================================================= */
  const CIRC = ['①', '②', '③', '④', '⑤', '⑥'];
  const EVID = [
    { t: '큰입배스는 육식성 어종이라 토종 어류와 그 알·치어를 잡아먹는다.', k: 'fact' },
    { t: '큰입배스가 늘어난 뒤 이 저수지의 토종 어류 수가 해마다 줄었다는 조사 결과가 있다.', k: 'fact' },
    { t: '큰입배스 낚시는 정말 재미있으니 앞으로도 마음껏 즐길 수 있어야 한다.', k: 'value' },
    { t: '저수지 물을 모두 빼면 물속의 다른 생물도 한꺼번에 피해를 입는다.', k: 'fact' },
    { t: '토종 물고기가 사라지면 우리 마을이 볼품없어질 것이다.', k: 'value' },
    { t: '한 번 퍼진 외래종은 사람이 다시 풀어 주면 또 늘어나기 쉽다.', k: 'fact' },
  ];
  const ROLES = [
    { n: '농부', e: '👨‍🌾', claim: '저수지 물을 모두 빼서 큰입배스를 한 번에 없애요.', ev: [3], good: false, badge: '근거 부족' },
    { n: '환경 과학자', e: '🧑‍🔬', claim: '조사 결과에 따라 큰입배스를 계획적으로 줄이고, 토종 어류의 서식지를 지켜요.', ev: [0, 1, 5], good: true, badge: '과학적 근거 충분' },
    { n: '지역 주민', e: '🧓', claim: '큰입배스 낚시가 재미있으니 그대로 두면 좋겠어요.', ev: [2], good: false, badge: '가치 판단' },
    { n: '지방 정부 담당자', e: '🧑‍💼', claim: '조사 결과를 바탕으로 단계별 계획을 세워 예산 안에서 추진해요.', ev: [1], good: true, badge: '근거 있음' },
  ];
  const PACT = [
    { q: '① 퇴치 계획', opts: ['저수지 물을 모두 빼서 한 번에 없애요', '조사 결과를 보며 정해진 기간에 큰입배스를 계획적으로 잡아요', '그대로 두고 지켜봐요'], ans: 1 },
    { q: '② 서식지 보호', opts: ['수초를 모두 걷어 내서 저수지를 깔끔하게 만들어요', '낚시터를 더 넓게 만들어요', '토종 어류가 알을 낳는 수초 지대를 보호하고 가꿔요'], ans: 2 },
    { q: '③ 재발 방지', opts: ['외래종을 함부로 방생하지 않도록 안내하고 알려요', '잡은 큰입배스를 다시 놓아주는 것을 허용해요', '외래종을 규칙 없이 자유롭게 키워요'], ans: 0 },
  ];
  const pactSel = [];
  function buildPactRows() {
    const box = $('#pactRows');
    PACT.forEach((it, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + it.q + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', it.q);
      sel.innerHTML = '<option value="">— 의견 고르기 —</option>' + it.opts.map((o, k) => '<option value="' + k + '">' + o + '</option>').join('');
      sel.addEventListener('change', () => { S.talk.pick[i] = sel.value === '' ? null : +sel.value; sel.classList.remove('ok', 'bad'); Sound.click(); });
      row.appendChild(sel); box.appendChild(row); pactSel.push(sel);
    });
  }
  function resetTalk() { S.talk = { cls: EVID.map(() => null), bad: {}, pick: [null, null, null], ok: false, pop: EVID.map(() => 0), shakeT: -9 }; pactSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }
  function talkLayout() {
    const roles = [], ev = [];
    if (!PHONE) {
      for (let i = 0; i < 4; i++) roles.push({ x: 10 + i * 196, y: 80, w: 188, h: 176 });
      for (let i = 0; i < 6; i++) ev.push({ x: 10 + (i % 3) * 263, y: 282 + Math.floor(i / 3) * 134, w: 254, h: 124 });
    } else {
      for (let i = 0; i < 4; i++) roles.push({ x: 6 + (i % 2) * 238, y: 6 + Math.floor(i / 2) * 152, w: 230, h: 144 });
      for (let i = 0; i < 6; i++) ev.push({ x: 6 + (i % 2) * 238, y: 316 + Math.floor(i / 2) * 106, w: 230, h: 98 });
    }
    return { roles, ev };
  }
  const TL = talkLayout();
  function talkDown(p) {
    for (let i = 0; i < EVID.length; i++) {
      const c = TL.ev[i];
      if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) {
        if (S.talk.ok) return false;
        const T_ = S.talk, order = [null, 'fact', 'value']; T_.cls[i] = order[(order.indexOf(T_.cls[i]) + 1) % 3]; delete T_.bad[i];
        T_.pop[i] = 0; SciSim.tween(T_.pop, { [i]: 1 }, { duration: 0.35, ease: 'outBack' }); Sound.click(); return false;
      }
    }
    return false;
  }
  const talkClsN = () => S.talk.cls.filter(Boolean).length;
  const talkPickN = () => S.talk.pick.filter((v) => v != null).length;
  function drawTalk(dt, t) {
    const Tk = S.talk;
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#e8f5ff'); g.addColorStop(1, '#f3fbef'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    if (!PHONE) {
      // 저수지: 큰입배스가 늘고 토종 어류가 줄어요
      ctx.save(); D.roundRect(10, 8, 780, 64, 16); ctx.clip();
      const wg = ctx.createLinearGradient(0, 8, 0, 72); wg.addColorStop(0, '#8fd0f5'); wg.addColorStop(1, '#3f93d2'); ctx.fillStyle = wg; ctx.fillRect(10, 8, 780, 64);
      D.wave(10, 790, 18, { color: 'rgba(255,255,255,.7)', amp: 3, phase: t * 1.5, wavelength: 90 });
      for (let i = 0; i < 3; i++) E('🐟', 60 + i * 70 + Math.sin(t + i) * 10, 46 + Math.sin(t * 1.3 + i) * 5, 26, { alpha: 0.45 });
      for (let i = 0; i < 6; i++) E('🐠', 340 + i * 60 + Math.sin(t * 1.1 + i) * 12, 40 + Math.sin(t * 1.7 + i * 2) * 8, 32, { flip: i % 2 === 0 });
      ctx.restore();
      D.label(120, 20, '🐟 토종 어류 (줄어들어요)', { bg: 'rgba(15,60,100,.75)', size: 12.5 }); D.label(640, 20, '🐠 큰입배스 (외래종, 늘어나요)', { bg: 'rgba(120,30,20,.78)', size: 12.5 });
    }
    TL.roles.forEach((c, i) => {
      const R = ROLES[i], ok = Tk.ok, col = ok ? (R.good ? '#16a34a' : '#d97706') : '#c7d6e6';
      panel(c.x, c.y, c.w, c.h, 16);
      D.roundRect(c.x, c.y, c.w, c.h, 16); ctx.lineWidth = ok ? 3.5 : 2; ctx.strokeStyle = col; ctx.stroke();
      E(R.e, c.x + 28, c.y + 30, PHONE ? 30 : 36); T(c.x + 56, c.y + 36, R.n, PHONE ? 14 : 16, '#26324a', 'left', 800);
      textBlock(c.x + 12, c.y + 62, c.w - 24, '“' + R.claim + '”', PHONE ? 12 : 12.5, '#34445c', PHONE ? 16 : 17, 700);
      const by = c.y + c.h - 16;
      if (ok) D.label(c.x + c.w / 2, by, (R.good ? '✓ ' : '') + R.badge, { bg: R.good ? '#16a34a' : '#d97706', size: PHONE ? 12 : 12.5 });
      else T(c.x + 12, by + 4, '관련 카드 ' + R.ev.map((k) => CIRC[k]).join(' '), PHONE ? 12 : 12.5, '#5d6879', 'left', 800);
    });
    EVID.forEach((ev, i) => {
      const c = TL.ev[i], st = Tk.cls[i], bad = Tk.bad[i];
      const shake = bad ? Math.sin(t * 40) * 2 * Math.max(0, 1 - (t - Tk.shakeT) * 2.5) : 0;
      ctx.save(); ctx.translate(shake, 0);
      const pop = clamp(Tk.pop[i], 0, 1.2), sc = 1 + (1 - Math.min(1, pop)) * 0.0;
      panel(c.x, c.y, c.w, c.h, 14, st === 'fact' ? '#eaf4ff' : st === 'value' ? '#fff3e0' : '#ffffff');
      D.roundRect(c.x, c.y, c.w, c.h, 14); ctx.lineWidth = bad ? 3.5 : 2.5; ctx.strokeStyle = bad ? '#dc2626' : st === 'fact' ? '#2563eb' : st === 'value' ? '#ea8a1a' : '#c7d6e6'; ctx.setLineDash(st ? [] : [6, 4]); ctx.stroke(); ctx.setLineDash([]);
      D.sphere(c.x + 18, c.y + 20, 12, '#475569', { gloss: false }); T(c.x + 18, c.y + 25, String(i + 1), 13, '#fff', 'center', 800);
      textBlock(c.x + 38, c.y + 24, c.w - 50, ev.t, PHONE ? 12 : 13, '#26324a', PHONE ? 15.5 : 17.5, 700);
      const by = c.y + c.h - 14;
      if (st) D.label(c.x + c.w - 62, by, st === 'fact' ? '🔬 과학적 사실' : '💭 가치 판단', { bg: st === 'fact' ? '#2563eb' : '#ea8a1a', size: PHONE ? 12 : 12.5 });
      else T(c.x + c.w - 12, by + 4, '눌러서 분류 ▸', PHONE ? 12 : 12.5, '#8695aa', 'right', 800);
      ctx.restore();
    });
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     읽음 칸
     ========================================================= */
  let rlast = '';
  const rng = (a) => Math.min.apply(null, a) + '~' + Math.max.apply(null, a);
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'eq') { L1 = '🐇 토끼 범위'; a = rng(EQ_R) + '마리'; L2 = '🦊 여우 범위'; b = rng(EQ_F) + '마리'; L3 = '읽은 막대'; c = eqReadN() + ' / ' + EQ_YEARS * 2; }
    else if (m === 'sim') {
      const q = S.sim, d = q.data, y = d ? (q.cur != null && q.cur <= q.p ? q.cur : Math.floor(q.p)) : 0;
      L1 = '시간'; a = d ? y + '년째' : '시작 전'; L2 = '🐇 토끼'; b = d ? Math.round(d.R[y]) + '마리' : R_INIT + '마리'; L3 = '🦊 여우'; c = d ? Math.round(d.F[y]) + '마리' : q.fox + '마리';
    } else if (m === 'env') {
      const e = S.env, r = e.run; L1 = '고른 변화'; a = ENV[e.type].name + ' · ' + (e.size === 's' ? '작게' : '크게');
      L2 = '결과'; b = r && !r.playing ? (r.out.ok ? '평형 회복' : '평형 깨짐') : r ? '진행 중…' : '—';
      L3 = '끝(' + ENV_YEARS + '년)의 토끼·여우'; c = r && !r.playing ? Math.round(r.d.R[ENV_YEARS]) + ' · ' + Math.round(r.d.F[ENV_YEARS]) : '—';
    } else { L1 = '분류한 카드'; a = talkClsN() + ' / ' + EVID.length; L2 = '정한 합의안 항목'; b = talkPickN() + ' / ' + PACT.length; L3 = '근거로 쓸 수 있는 것'; c = '과학적 사실'; }
    const keyS = [L1, a, L2, b, L3, c].join('|');
    if (keyS === rlast) return; rlast = keyS;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ---------- 컨트롤 연결 ---------- */
  $('#bEqReplay').addEventListener('click', () => { Sound.click(); S.eq.p = 0; S.eq.play = true; S.eq.bars = { r: [0, 0, 0, 0, 0], f: [0, 0, 0, 0, 0] }; });
  ['sFox', 'sGrass', 'sPred'].forEach((id) => $('#' + id).addEventListener('input', (e) => { const q = S.sim; q[{ sFox: 'fox', sGrass: 'grass', sPred: 'pred' }[id]] = +e.target.value; if (q.run) q.run = false; simClear(); updateCtl(); Sound.tick(); }));
  $('#bSimRun').addEventListener('click', simRun);
  $('#bSimReset').addEventListener('click', () => { Sound.click(); const mk = S.sim.mk, tc = S.sim.touched; resetSim(); S.sim.mk = mk; S.sim.touched = tc; updateCtl(); });
  $$('#envType button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (S.env.run && S.env.run.playing) return; S.env.type = b.dataset.t; envClear(); }));
  $$('#envSize button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (S.env.run && S.env.run.playing) return; S.env.size = b.dataset.s; envClear(); }));
  $('#bEnvRun').addEventListener('click', envApply);
  $('#bEnvReset').addEventListener('click', () => { Sound.click(); envClear(); });
  buildClsRows(); buildPactRows();

  SciSim.pointer(view, {
    down(p) { if (S.mode === 'eq') return eqDown(p); if (S.mode === 'sim') return simDown(p); if (S.mode === 'talk') return talkDown(p); return false; },
    move(p) { if (S.mode === 'sim') simMove(p); },
    up(p) { if (S.mode === 'sim') simUp(p); },
    hover(p) {
      if (S.mode === 'sim') { const q = S.sim; for (const k of ['r', 'f']) if (Math.hypot(p.x - GX(q.mk[k], SIM_YEARS), p.y - (PB.y + MKY[k])) <= 24) return 'grab'; return q.data && simPlotHit(p) ? 'crosshair' : 'default'; }
      if (S.mode === 'talk') return TL.ev.some((c) => p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) ? 'pointer' : 'default';
      return 'default';
    },
  });

  /* =========================================================
     미션
     ========================================================= */
  const lvl = (yr, v) => yr + '년째 약 ' + ap(v) + '마리';
  const levels = [
    {
      title: '평형 상태: 변하지만 균형을 유지해요', short: '평형 상태', icon: '⚖️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 포식자가 사라지거나 외래종이 들어오면 생태계의 균형은 어떻게 될까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 먹이 그물과 생태 피라미드로 에너지가 한 방향으로 흐른다는 것을 배웠어요. 이번에는 토끼와 여우의 <b>개체 수</b>가 어떻게 유지되는지 살펴봐요.</div>' +
        '<p>안정된 초원에서 <b>5년</b> 동안 토끼와 여우의 수를 지켜보고, 막대를 눌러 값을 읽어요.</p>',
      features: ['eq'],
      setup() { resetEq(); setMode('eq'); },
      recap: '생태계 평형은 개체 수가 변하지 않는 것이 아니라, 해마다 조금씩 오르내리면서도 일정한 범위에서 유지되는 상태예요.',
      summary: '<ul><li><b>생태계 평형</b>: 생물 군집의 구성, 개체 수, 에너지 흐름과 물질 순환이 오랫동안 안정하게 유지되는 상태</li><li>평형 상태에서도 개체 수는 해마다 조금씩 오르내려요. 하지만 <b>일정한 범위</b>를 벗어나지 않아요. (이 초원: 토끼 약 ' + rng(EQ_R) + '마리, 여우 약 ' + rng(EQ_F) + '마리)</li></ul>',
      missions: [
        {
          id: 'eq', title: '평형 상태의 토끼와 여우 수 기록',
          goal: '막대를 눌러 5년 동안의 <b>토끼와 여우 수</b>를 모두 읽으세요. (막대 ' + EQ_YEARS * 2 + '개)',
          hint: '막대 위의 👆 표시를 눌러요. 5년이 모두 지나가면 막대가 다 나타나요. 놓쳤다면 ▶ 5년 다시 보기를 눌러요.',
          setup() { setMode('eq'); },
          check: () => eqReadN() === EQ_YEARS * 2,
          hold: 0.5,
          status: () => '읽은 막대 ' + eqReadN() + ' / ' + EQ_YEARS * 2 + ' &nbsp; 🐇 ' + EQ_R.filter((v, i) => S.eq.read['r' + i]).length + ' · 🦊 ' + EQ_F.filter((v, i) => S.eq.read['f' + i]).length,
          explain: '5년 동안 토끼는 <b>' + rng(EQ_R) + '마리</b>, 여우는 <b>' + rng(EQ_F) + '마리</b> 사이에서 오르내렸어요. 개체 수가 매년 조금씩 달라져도 <b>일정한 범위</b>에서 유지되면 평형 상태예요.',
        },
        {
          type: 'quiz', title: '평형 상태란?',
          goal: '다음 중 <b>생태계 평형</b>을 가장 잘 설명한 것은?',
          setup() { setMode('eq'); },
          choices: ['개체 수가 전혀 변하지 않고 늘 똑같은 상태', '개체 수가 해마다 달라지지만 일정한 범위에서 유지되는 상태', '포식자가 모두 사라져서 피식자만 늘어나는 상태', '생물의 종류가 해마다 크게 바뀌는 상태'],
          answer: 1,
          feedback: ['5년 동안 막대 높이가 해마다 조금씩 달랐어요. 평형은 변화가 없다는 뜻이 아니에요.', '', '포식자가 사라지면 피식자의 수가 조절되지 않아 평형이 깨져요.', '평형에서는 군집의 구성이 오랫동안 안정하게 유지돼요.'],
          explain: '생태계 평형은 <b>변화가 전혀 없는 상태가 아니라</b>, 개체 수가 오르내리면서도 <b>일정한 범위에서 유지되는 상태</b>예요.',
        },
      ],
    },
    {
      title: '개체군 변동: 오르내리는 개체 수', short: '개체군 변동', icon: '📈', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 평형 상태의 개체 수가 일정한 범위에서 오르내리는 것을 확인했어요. 그 오르내림은 왜 생길까요?</div>' +
        '<p>처음 토끼 <b>' + R_INIT + '마리</b>와 여우 <b>' + F_INIT + '마리</b>로 시작해 <b>' + SIM_YEARS + '년</b> 동안 모의실험해요. 토끼는 풀의 양만큼 늘고 여우에게 잡아먹혀요. 여우는 토끼를 먹어야 번식해요.</p>',
      features: ['sim'],
      setup() { resetSim(); setMode('sim'); },
      recap: '피식자(토끼)가 늘면 포식자(여우)가 늘고, 포식자가 늘면 피식자가 줄고, 피식자가 줄면 포식자도 줄어요. 이런 되먹임 때문에 개체 수가 오르내리다가 평형 부근에서 안정돼요.',
      summary: '<ul><li>모의실험(처음 토끼 ' + R_INIT + '마리, 여우 ' + F_INIT + '마리, 풀의 양 ' + K0 + '): 토끼는 <b>' + lvl(BASE_RT, BASE.R[BASE_RT]) + '</b>까지 늘고, 여우는 <b>' + lvl(BASE_FT, BASE.F[BASE_FT]) + '</b>까지 늘어요. 여우의 최대는 토끼의 최대보다 <b>늦게</b> 나타나요.</li><li><b>되먹임</b>: 피식자 증가 → 포식자 증가 → 피식자 감소 → 포식자 감소 → 피식자 증가 …</li><li>오르내림이 점점 작아져 ' + SIM_YEARS + '년쯤 뒤에는 <b>평형</b> 값(토끼 약 ' + ap(EQ.R) + '마리, 여우 약 ' + ap(EQ.F) + '마리) 부근에 가까워져요.</li></ul>',
      missions: [
        {
          id: 'peak', title: '토끼와 여우가 가장 많은 때 찾기',
          goal: '<b>▶ ' + SIM_YEARS + '년 모의실험</b>을 한 뒤 🐇 표시를 토끼가 가장 많은 해에, 🦊 표시를 여우가 가장 많은 해에 놓으세요. (±1년)',
          hint: '그래프에서 초록 곡선(토끼)과 주황 곡선(여우)의 가장 높은 곳을 찾아요. 그래프를 눌러 그 해의 수를 읽어도 돼요. 슬라이더를 바꾸면 그래프가 지워져요.',
          setup() { setMode('sim'); },
          check: () => markerOk(),
          hold: 0.6,
          status: () => (S.sim.done ? '✅' : '⬜') + ' 모의실험 &nbsp; 🐇 표시 ' + S.sim.mk.r + '년 &nbsp; 🦊 표시 ' + S.sim.mk.f + '년',
          explain: '이 모의실험에서 토끼는 <b>' + lvl(BASE_RT, BASE.R[BASE_RT]) + '</b>로 가장 많고, 여우는 <b>' + lvl(BASE_FT, BASE.F[BASE_FT]) + '</b>로 가장 많아요. 여우의 최대가 토끼보다 약 <b>' + (BASE_FT - BASE_RT) + '년</b> 늦어요. (처음 값을 바꾸면 시기와 크기가 달라질 수 있어요.)',
        },
        {
          type: 'quiz', title: '여우가 더 늦게 최대가 되는 까닭',
          goal: '여우 수가 <b>토끼 수보다 늦게</b> 최대가 되는 까닭은?',
          setup() { setMode('sim'); },
          choices: ['여우는 토끼보다 항상 느리게 움직이기 때문이다', '토끼가 먼저 늘어난 뒤에야 먹이가 충분해져 여우가 번식하고 늘어나기 때문이다', '여우가 늘어나면 토끼도 같은 시기에 반드시 늘어나기 때문이다', '풀의 양이 여우의 수를 직접 결정하기 때문이다'],
          answer: 1,
          feedback: ['움직이는 속도가 아니라 먹이 관계 때문이에요. 여우는 토끼를 먹어야 번식해요.', '', '여우가 늘면 토끼는 더 많이 잡아먹혀 줄어들어요. 그래프에서 여우가 최대일 때 토끼는 줄고 있어요.', '풀은 토끼의 수에 직접 영향을 주고, 여우는 토끼를 먹어서 늘어요.'],
          explain: '토끼가 늘어야 여우가 먹이를 충분히 얻어 번식해요. 그래서 여우의 증가는 토끼의 증가보다 <b>늦게</b> 나타나요. 여우가 많아지면 토끼가 줄고, 토끼가 줄면 여우도 줄어요. 이런 <b>되먹임</b>이 개체 수를 평형 부근에 머물게 해요.',
        },
      ],
    },
    {
      title: '환경 변화: 평형이 깨질 때', short: '환경 변화', icon: '🌪️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 먹이 관계의 되먹임으로 개체 수가 평형 부근에 머무는 것을 봤어요. 환경이 변하면 평형은 어떻게 될까요?</div>' +
        '<p>평형 상태의 초원에 <b>환경 변화 4가지</b>(여우 제거, 가뭄, 외래 경쟁 종, 서식지 감소)를 <b>작게 또는 크게</b> 적용하고 평형이 회복되는지 비교해요. 평형 범위는 평형 값의 ±' + Math.round(BAND * 100) + ' %예요.</p>',
      features: ['env'],
      setup() { resetEnv(); setMode('env'); },
      recap: '작은 변화는 되먹임으로 평형이 회복되지만, 포식자 제거·서식지 파괴·외래종처럼 큰 변화는 평형이 깨져 회복하기 어려워요.',
      summary: '<ul><li>평형 상태에서 환경이 조금 변해도(여우 ' + PAR.fox.s + '마리 감소) 되먹임으로 평형이 <b>회복</b>돼요.</li><li><b>큰 변화</b>(포식자 제거, 서식지 파괴, 외래종 유입, 오염)는 평형이 <b>깨져</b> 회복이 어려워요. 일시적인 변화(가뭄)는 시간이 지나면 회복할 수 있어요.</li><li>옐로스톤 국립공원: 늑대를 없앤 뒤 엘크가 늘고 식물이 줄었어요. 1995년 늑대를 다시 들여온 뒤 영양 단계를 따라 변화가 퍼졌어요.</li></ul>',
      missions: [
        {
          id: 'env', title: '회복되는 변화와 깨지는 변화', manual: true,
          goal: '<b>여우 제거</b>를 <b>작게</b>와 <b>크게</b> 모두 적용해 보고, 다른 변화도 하나 이상 적용한 뒤 <b>평형이 회복되는지</b> 골라 ✔ 확인하기를 누르세요.',
          hint: '고른 변화는 ' + EVENT_YEAR + '년째에 일어나요. 그래프의 초록·주황 띠(평형 범위) 안으로 곡선이 돌아오는지 보세요.',
          setup() { setMode('env'); S.showClassify = true; updateCtl(); },
          check() {
            const e = S.env, tr = e.tried;
            if (!tr['fox:s'] || !tr['fox:l']) return '여우 제거를 작은 변화와 큰 변화로 모두 적용해 보세요. (▶ 변화 적용)';
            if (Object.keys(tr).length < 3) return '다른 환경 변화도 하나 이상 적용해 비교해 보세요.';
            if (S.cls[0] == null || S.cls[1] == null) return '아래에서 두 경우의 결과를 모두 골라요.';
            const want = [OUT.fox.s.ok ? 'ok' : 'bad', OUT.fox.l.ok ? 'ok' : 'bad'];
            const bad = [];
            S.cls.forEach((v, i) => { const ok = v === want[i]; if (!ok) bad.push(i); clsSel[i].classList.toggle('ok', ok); if (!ok && !clsSel[i].classList.contains('bad')) clsSel[i].classList.add('bad'); if (ok) clsSel[i].classList.remove('bad'); });
            if (bad.length) return '빨간 칸(' + bad.map((i) => (i + 1) + '번').join(', ') + ')을 다시 보세요. 그래프의 곡선이 평형 범위(띠)로 돌아오는지, 여우가 남아 있는지 확인해요.';
            return true;
          },
          status: () => '여우 ' + PAR.fox.s + '마리 감소 ' + mark(!!S.env.tried['fox:s']) + ' &nbsp; 여우 모두 제거 ' + mark(!!S.env.tried['fox:l']) + ' &nbsp; 시도한 변화 ' + Object.keys(S.env.tried).length + ' (3개 이상)',
          explain: '여우를 <b>' + PAR.fox.s + '마리</b> 줄여도 되먹임으로 곧 평형 범위 안에서 안정돼요(<b>평형 회복</b>). 여우를 <b>모두 없애면</b> 토끼 수를 조절하던 여우가 사라져 토끼가 평형 범위 위로 늘어나 약 ' + ap(envData("fox", "l").R[ENV_YEARS]) + '마리 부근에 머물고, 풀이 줄어요(<b>평형이 깨져요</b>). 작은 변화는 되먹임으로 회복되지만 포식자가 사라지는 큰 변화는 회복하기 어려워요.',
        },
        {
          type: 'quiz', title: '옐로스톤의 늑대',
          goal: '미국 옐로스톤 국립공원에서 <b>늑대를 없앤</b> 뒤에 일어난 일로 알맞은 것은?',
          setup() { setMode('env'); S.showClassify = false; updateCtl(); },
          choices: ['엘크가 줄고 식물이 늘어났다', '엘크가 늘어 식물이 줄었다', '아무 변화도 일어나지 않았다', '모든 동물의 수가 함께 줄었다'],
          answer: 1,
          feedback: ['포식자인 늑대가 사라지면 피식자인 엘크는 줄지 않고 늘어요.', '', '포식자가 사라지면 먹이 관계가 바뀌어 다른 생물에도 영향이 퍼져요.', '늑대가 사라지면 엘크는 오히려 늘어났어요.'],
          explain: '늑대가 사라지자 <b>엘크가 늘고</b> 엘크가 식물을 많이 먹어 <b>식물이 줄었어요</b>. 1995년 늑대를 다시 들여온 뒤에는 영양 단계를 따라 변화가 퍼졌어요. 포식자 제거가 모의실험에서 평형이 깨지는 것과 같은 원리예요.',
        },
      ],
    },
    {
      title: '함께 토의: 저수지의 외래종', short: '함께 토의', icon: '🗣️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 외래종·포식자 제거 같은 큰 변화가 평형을 깨뜨릴 수 있다는 것을 확인했어요. 실제 문제를 함께 토의해 봐요.</div>' +
        '<p><b>저수지에 외래종 큰입배스가 늘어 토종 어류가 줄었어요.</b> 네 사람의 주장과 근거 카드를 읽고, <b>과학적 사실</b>과 <b>가치 판단</b>을 구분해 팀의 합의안을 만들어요.</p>',
      features: ['talk'],
      setup() { resetTalk(); setMode('talk'); },
      recap: '토의에서는 측정·관찰로 확인할 수 있는 과학적 사실을 근거로 삼고, 가치 판단은 의견으로 존중하며 합의안을 만들어요. 외래종을 함부로 풀어 주지 않는 작은 실천이 생태계 평형을 지켜요.',
      summary: '<ul><li><b>과학적 사실</b>: 조사·관찰·실험으로 확인할 수 있는 내용. <b>가치 판단</b>: 좋다·나쁘다처럼 개인의 생각이나 느낌.</li><li>근거가 되는 것은 과학적 사실이에요. 가치 판단은 의견으로 존중하되 근거로 삼지는 않아요.</li><li>합의안 예: ① 조사 결과를 보며 큰입배스를 계획적으로 잡기 ② 토종 어류의 서식지(수초 지대) 보호 ③ 외래종을 함부로 방생하지 않도록 안내하기</li><li>내가 할 수 있는 일: 키우던 외래 생물을 자연에 함부로 놓아주지 않기</li></ul>',
      missions: [
        {
          id: 'talk', title: '근거 카드 분류와 팀 합의안', manual: true,
          goal: '아래 카드 6장을 눌러 <b>🔬 과학적 사실</b>과 <b>💭 가치 판단</b>으로 나누고, 오른쪽에서 <b>합의안 3개 항목</b>을 고른 뒤 ✔ 확인하기를 누르세요.',
          hint: '“조사 결과가 있다·잡아먹는다”처럼 확인할 수 있는 것은 사실, “재미있다·볼품없다”처럼 생각이나 느낌은 가치 판단이에요. 합의안은 사실에 맞는 의견을 골라요.',
          setup() { setMode('talk'); },
          check() {
            const T_ = S.talk;
            if (T_.ok) return true;
            const miss = T_.cls.filter((v) => !v).length;
            if (miss) return '아직 분류하지 않은 카드가 ' + miss + '장 있어요. 카드를 눌러 바꿔요.';
            const badC = []; EVID.forEach((ev, i) => { if (T_.cls[i] !== ev.k) { badC.push(i); if (!T_.bad[i]) { T_.bad[i] = true; T_.shakeT = S.clock; } } else delete T_.bad[i]; });
            if (badC.length) return '빨간 카드(' + badC.map((i) => CIRC[i]).join(', ') + ')를 다시 생각해 보세요. 측정이나 조사로 확인할 수 있는지가 기준이에요.';
            if (talkPickN() < PACT.length) return '합의안 항목을 모두 골라요. (' + talkPickN() + ' / ' + PACT.length + ')';
            const badP = []; PACT.forEach((it, i) => { const ok = T_.pick[i] === it.ans; if (!ok) badP.push(i); pactSel[i].classList.toggle('ok', ok); if (!ok) pactSel[i].classList.add('bad'); else pactSel[i].classList.remove('bad'); });
            if (badP.length) return '빨간 항목(' + badP.map((i) => PACT[i].q.slice(0, 1)).join(', ') + '번)을 다시 골라요. 과학적 사실에 맞고 다른 생물에게 피해가 적은 의견이 좋아요.';
            return true;
          },
          status: () => '분류한 카드 ' + talkClsN() + ' / ' + EVID.length + ' &nbsp; 합의안 ' + talkPickN() + ' / ' + PACT.length,
          explain: '<b>과학적 사실</b>은 ' + EVID.map((e, i) => e.k === 'fact' ? CIRC[i] : '').join('') + ', <b>가치 판단</b>은 ' + EVID.map((e, i) => e.k === 'value' ? CIRC[i] : '').join('') + '이에요. 환경 과학자의 주장은 사실 ①②⑥이 뒷받침해 근거가 충분하고, 정부 담당자의 계획은 조사 결과(②)에 기대어요. 농부의 주장은 사실 ④와 어긋나 근거가 부족하고, 주민의 주장은 가치 판단(③)이에요. 합의안은 <b>계획적으로 잡기, 수초 지대 보호, 방생 금지 안내</b>예요.',
        },
        {
          type: 'quiz', title: '토의의 근거 고르기',
          goal: '합의안의 <b>과학적 근거</b>로 쓸 수 있는 것은?',
          setup() { setMode('talk'); },
          choices: ['큰입배스 낚시는 정말 재미있다.', '토종 물고기가 사라지면 마을이 볼품없어질 것이다.', '큰입배스가 늘어난 뒤 토종 어류가 해마다 줄었다는 조사 결과가 있다.', '큰입배스는 모두 없애는 것이 옳다.'],
          answer: 2,
          feedback: ['재미있다는 것은 개인의 느낌(가치 판단)이에요. 확인할 수 있는 자료가 근거예요.', '볼품없어진다는 것은 개인의 생각(가치 판단)이에요.', '', '무엇이 옳다는 것은 가치 판단이에요. 조사나 측정 결과가 과학적 근거예요.'],
          explain: '과학적 근거는 <b>조사·관찰·측정으로 확인할 수 있는 사실</b>이에요. “재미있다”, “볼품없다”, “옳다”는 가치 판단이라 의견으로는 존중하지만 근거로 삼지는 않아요.',
        },
        {
          type: 'quiz', title: '내가 할 수 있는 일',
          goal: '외래종이 생태계를 해치지 않도록 <b>내가 할 수 있는 일</b>로 가장 알맞은 것은?',
          setup() { setMode('talk'); },
          choices: ['키우던 외래 물고기가 싫증나면 가까운 저수지에 놓아줘요.', '외래종을 많이 퍼뜨려 낚시터를 만들어요.', '외래 생물을 함부로 풀어 주지 않고, 키우기 어려우면 전문 기관에 문의해요.', '외래종이 있어도 아무 일도 하지 않고 그냥 둬요.'],
          answer: 2,
          feedback: ['놓아준 외래종이 토종 생물을 잡아먹거나 먹이를 빼앗아 평형을 깨뜨릴 수 있어요.', '외래종이 퍼지면 토종 생물이 줄고 평형이 깨져요.', '', '그냥 두면 외래종이 계속 늘어날 수 있어요. 작은 실천이 필요해요.'],
          explain: '외래종은 천적이 없는 곳에서 빠르게 늘어 토종 생물을 줄일 수 있어요. 키우던 생물을 <b>함부로 방생하지 않는 것</b>이 우리가 할 수 있는 가장 쉬운 실천이고, 세계시민으로서 생태계를 지키는 책임이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-population', mount: '#game', badge: '생태계 평형 지킴이', homeHref: '../../index.html#h1b',
    featureLabels: { eq: '⚖️ 안정된 초원 5년 · 막대 읽기', sim: '📈 ' + SIM_YEARS + '년 모의실험 · 슬라이더 3개', env: '🌪️ 환경 변화 4가지 · 평형 범위', talk: '🗣️ 근거 카드 · 팀 합의안' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetEq(); resetSim(); resetEnv(); resetTalk();
  setMode('eq');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepEq(dt); stepSim(dt); stepEnv(dt);
    switch (S.mode) {
      case 'eq': drawEq(dt, t); break;
      case 'sim': drawSim(dt, t); break;
      case 'env': drawEnv(dt, t); break;
      default: drawTalk(dt, t);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(234,246,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    const cm = game && game.current();
    if (game && game.phase === 'success' && cm && cm.id === 'talk' && !S.talk.ok) { S.talk.ok = true; TL.roles.forEach((c) => parts.burst(c.x + c.w / 2, c.y + c.h / 2, { count: 10, colors: ['#16a34a', '#fbbf24', '#fff'], speed: 120, size: 3.5, life: 0.8 })); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, EQ, BASE, BASE_RT, BASE_FT, EQ_R, EQ_F, OUT, ENV, envData, envOutcome, simRun, simPeaks, markerOk, envApply, eqDown, EL, eqBarRect, EVID, PACT, ROLES, TL, GX, PB, MKY, GR, levels, simulate, ap, clsSel, pactSel, resetTalk,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepEq(0.02); stepSim(0.02); stepEnv(0.02); } },
  };
})();
