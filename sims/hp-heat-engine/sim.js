/* =========================================================
   물리학 Ⅰ. 힘과 에너지 - 열기관과 영구기관 (단원 7차시)
   성취기준 [12물리01-06] 열이 역학적 에너지로 전환되는 과정의 효율을 정성적으로 이해하고, 영구기관이 불가능함을 사례를 통해 논증할 수 있다.
   ① 관찰: 열이 하는 일 (피스톤, 스털링 엔진, 증기 터빈)
   ② 분석: 열 흐름 (Q_h = W + Q_c, 효율 e = W/Q_h, 기관 5종 비교)
   ③ 탐구: 영구기관은 왜 안 될까 (자석 바퀴·물레방아–펌프·불균형 바퀴, 에너지 장부)
   ④ 적용: 발명 심사 (가능/불가능, 1종/2종)
   ※ 열역학 법칙의 이름·식, P–V 사이클, 카르노 효율은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  const f2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
  const eJ = (v) => { const r = Math.round(v * 100) / 100; return (r === 0 ? 0 : r).toString().replace('-', '−'); };   // 소수 둘째 자리까지, 끝의 0은 생략
  const sg = (n, d) => { const k = Math.pow(10, d == null ? 1 : d), s = Math.round(n * k) / k; return (s > 0 ? '+' : s < 0 ? '−' : '') + Math.abs(s).toFixed(d == null ? 1 : d); };
  const num = (s) => parseFloat(String(s).replace(/−/g, '-').replace(/,/g, '.').trim());
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 600, MH = PHONE ? 300 : 290;

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef2fa' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
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
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, 'left', weight || 700)); return ls.length * lh;
  }
  function bgMain(top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, MH); g.addColorStop(0, top || '#e6eefb'); g.addColorStop(1, bottom || '#f7faff'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, MH); }
  function beginMain() { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, MH); ctx.clip(); }
  function endMain() { ctx.restore(); }
  function bgData() { ctx.fillStyle = '#f1f5fb'; ctx.fillRect(0, MH, VW, VH - MH); ctx.fillStyle = '#d3dcea'; ctx.fillRect(0, MH, VW, 2); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function tagPill(x, y, text, color) { D.label(x, y, text, { bg: color, size: PHONE ? 12 : 13 }); }

  /* ---------- 데이터 영역 배치 ---------- */
  const RL = PHONE ? { x: 10, y: MH + 8, w: VW - 20, h: 170 } : { x: 12, y: MH + 10, w: 372, h: VH - MH - 20 };
  const RR = PHONE ? { x: 10, y: MH + 186, w: VW - 20, h: VH - MH - 196 } : { x: 394, y: MH + 10, w: VW - 406, h: VH - MH - 20 };

  /* 가로 막대: items [{label, color, val, ghost}] / lo~hi 범위, 0 기준선 */
  function drawEBars(r, title, items, lo, hi, unit, o) {
    o = o || {};
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 12, r.y + 22, title, PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    if (unit) T(r.x + r.w - 12, r.y + 22, unit, 12, '#5a6679', 'right', 800);
    const labW = o.labW || 64, x0 = r.x + labW + 14, x1 = r.x + r.w - 16, W = x1 - x0;
    const top = r.y + 36, rh = Math.min(PHONE ? 38 : 52, (r.h - 46 - 8) / items.length);
    const zx = x0 + (-lo) / (hi - lo) * W, k = W / (hi - lo);
    ctx.strokeStyle = '#8b97ab'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(zx, top - 4); ctx.lineTo(zx, top + rh * items.length + 2); ctx.stroke();
    items.forEach((it, i) => {
      const y = top + i * rh, hn = Math.round(rh * 0.5), by = y + (rh - hn) / 2;
      const lines = wrap(it.label, labW + 8, 12.5, 800);
      lines.forEach((l, j) => T(r.x + 10, y + rh / 2 + 4 - (lines.length - 1) * 7 + j * 14, l, 12.5, it.color, 'left', 800));
      const v = clamp(it.val, lo, hi), w = v * k;
      if (it.ghost != null) { const gw = clamp(it.ghost, lo, hi) * k; D.roundRect(Math.min(zx, zx + gw), by - 4, Math.abs(gw), 4, 2); ctx.fillStyle = C.rgba(it.color, 0.35); ctx.fill(); }
      if (Math.abs(w) >= 0.6) { D.roundRect(Math.min(zx, zx + w), by, Math.abs(w), hn, 4); ctx.fillStyle = C.rgba(it.color, 0.9); ctx.fill(); }
      const txt = eJ(it.val) + (o.unit ? ' ' + o.unit : '');
      const ty = by + hn / 2 + 5;
      if (Math.abs(w) > W * 0.55) T(zx + w - Math.sign(w) * 6, ty, txt, 12.5, '#fff', w >= 0 ? 'right' : 'left', 800);
      else if (w >= 0) T(zx + w + 5, ty, txt, 12.5, '#26324a', 'left', 800); else T(zx + w - 5, ty, txt, 12.5, '#26324a', 'right', 800);
    });
  }

  /* 표: cols [{h, w(비율), get(row), color?}] */
  function drawTable(r, title, cols, rows, nmax, emptyMsg) {
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 12, r.y + 22, title, PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    const tw = r.w - 16, hy = r.y + 34, rh = Math.min(30, (r.h - 66) / nmax);
    const tot = cols.reduce((s, c) => s + c.w, 0);
    let xx = r.x + 8; const cxs = [];
    cols.forEach((c) => { const cw = tw * c.w / tot; cxs.push([xx, cw]); xx += cw; });
    cols.forEach((c, i) => { const ls = wrap(c.h, cxs[i][1] - 2, 11.5, 800); ls.forEach((l, j) => T(cxs[i][0] + cxs[i][1] / 2, hy + 10 + j * 13, l, 11.5, '#5a6679', 'center', 800)); });
    const shown = rows.slice(-nmax);
    const y0 = hy + 32;
    shown.forEach((row, i) => {
      const yy = y0 + i * rh;
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(56,103,244,.05)'; ctx.fillRect(r.x + 8, yy, tw, rh); }
      cols.forEach((c, j) => T(cxs[j][0] + cxs[j][1] / 2, yy + rh / 2 + 5, String(c.get(row)), PHONE ? 12.5 : 13.5, c.color || '#26324a', 'center', 800));
    });
    if (!shown.length) T(r.x + r.w / 2, y0 + 30, emptyMsg || '아직 기록이 없어요', 13.5, '#98a2b3', 'center', 700);
  }
  /* 직교 그래프 틀: 반환 {gx(v), gy(v)} */
  function drawAxes(r, o) {
    // r: 그래프 영역(축이 그려질 사각형), o: {x0,x1,y0,y1,xt,yt,xl,yl,xfmt,yfmt}
    const gx = (v) => r.x + (v - o.x0) / (o.x1 - o.x0) * r.w, gy = (v) => r.y + r.h - (v - o.y0) / (o.y1 - o.y0) * r.h;
    ctx.lineWidth = 1;
    for (let v = o.y0; v <= o.y1 + 1e-9; v += o.yt) { ctx.strokeStyle = v === o.y0 ? '#516079' : 'rgba(120,135,160,.22)'; ctx.lineWidth = v === o.y0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(r.x, gy(v)); ctx.lineTo(r.x + r.w, gy(v)); ctx.stroke(); T(r.x - 6, gy(v) + 4.5, (o.yfmt || String)(v), 12, '#3a465c', 'right', 800); }
    for (let v = o.x0; v <= o.x1 + 1e-9; v += o.xt) { ctx.strokeStyle = v === o.x0 ? '#516079' : 'rgba(120,135,160,.22)'; ctx.lineWidth = v === o.x0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(gx(v), r.y); ctx.lineTo(gx(v), r.y + r.h); ctx.stroke(); T(gx(v), r.y + r.h + 16, (o.xfmt || String)(v), 12, '#3a465c', 'center', 800); }
    if (o.xl) T(r.x + r.w + 8, r.y + r.h + 16, o.xl, 12, '#3a465c', 'left', 800);
    if (o.yl) T(r.x - 6, r.y - 8, o.yl, 12, '#3a465c', 'right', 800);
    return { gx, gy };
  }

  /* ---------- 장면 상수 (글자로 보이는 숫자는 모두 여기서 만들어요) ---------- */
  const G = 10;                                   // 중력 가속도 (m/s²)
  const PISTON = { h0: 0.15, T0: 20, Tmax: 100, rate: 12, m: 2.0, lift: 0.03 };   // 처음 공기 기둥 높이(m), 처음/최고 온도(°C), 가열 속도(°C/s), 추 질량(kg), 목표 상승 높이(m)
  const STIR = { room: 20, rpmPerK: 1.5, temps: [20, 40, 60, 80] };               // 윗면(실온), 온도 차 1 °C당 회전수(rpm), 컵 속 물의 온도 선택지(°C)
  const ENG = { Qh: 1000, W0: 300, Wmax: 900, step: 50 };                          // 고온에서 받는 열(J), 예시 일(J), 슬라이더 최댓값, 간격
  const ENGINES = [
    { name: '증기 기관차', icon: '🚂', lo: 10, hi: 10 },
    { name: '가솔린 엔진', icon: '🚗', lo: 25, hi: 30 },
    { name: '디젤 엔진', icon: '🚛', lo: 35, hi: 35 },
    { name: '석탄 화력 발전', icon: '🏭', lo: 40, hi: 40 },
    { name: '복합 화력 발전', icon: '⚡', lo: 55, hi: 60 },
  ];
  const effTxt = (e) => (e.lo === e.hi ? '약 ' + e.lo + ' %' : '약 ' + e.lo + '~' + e.hi + ' %');
  const PERP = { E0: 12, w0: 6, magnet: { T: 8.0, name: '자석 영구 바퀴' }, mill: { T: 6.0, name: '물레방아–펌프' }, wheel: { T: 5.0, name: '불균형 바퀴' } };
  const PERPK = ['magnet', 'mill', 'wheel'];
  const LEDG = [   // 에너지 장부의 4가지 주장 (입력, 일 출력, 열 출력)
    { who: '자석 바퀴', inn: 0, work: 80, heat: 0 },
    { who: '모형 열기관', inn: 100, work: 60, heat: 40 },
    { who: '물레방아–펌프', inn: 100, work: 130, heat: 0 },
    { who: '불균형 바퀴', inn: 100, work: 100, heat: 20 },
  ];
  LEDG.forEach((r) => { r.ok = Math.abs(r.inn - (r.work + r.heat)) < 1e-9; });   // 입력 = 출력 합일 때만 가능
  const JUDGE = [
    { icon: '🧲', name: '자석 영구 바퀴', note: '자석의 힘으로 바퀴가 영원히 돈대요.', ans: 1 },
    { icon: '💧', name: '물레방아–펌프 순환', note: '떨어진 물을 펌프로 올려 물레방아를 다시 돌려요.', ans: 1 },
    { icon: '🚢', name: '바닷물 열로 가는 배', note: '바닷물의 열을 빼앗아 전부 일로 바꿔요.', ans: 2 },
    { icon: '☀️', name: '태양열 터빈 발전', note: '태양열(고온)과 냉각수·대기(저온)를 써요.', ans: 0 },
    { icon: '🌋', name: '지열 발전', note: '땅속의 뜨거운 열과 지표의 차가운 물·공기를 써요.', ans: 0 },
    { icon: '⚙️', name: '효율 100 % 엔진', note: '연료의 열을 전부 일로 바꾸고 버리는 열이 없어요.', ans: 2 },
    { icon: '🔋', name: '플라이휠 에너지 저장', note: '돌려서 에너지를 저장하지만 마찰로 서서히 줄어요.', ans: 0 },
  ];
  const JOPT = ['가능', '불가능 · 1종 (에너지 보존 위반)', '불가능 · 2종 (열을 전부 일로 바꿈)'];
  const JCOL = ['#14a058', '#e2464b', '#c2410c'];
  const pistonH = (T) => PISTON.h0 * (273 + T) / (273 + PISTON.T0);

  /* ---------- 상태 ---------- */
  const S = { mode: 'engine', clock: 0, fade: 0, en: null, fl: null, pp: null, jd: null, showEIn: false };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { engine: '🔥 열이 하는 일', flow: '📊 열 흐름', perp: '♾️ 영구기관', judge: '📝 발명 심사' };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }

  /* =====================================================
     ① 열이 하는 일: 피스톤, 스털링 엔진, 증기 터빈
     ===================================================== */
  function resetEn(keepSub) {
    const p = S.en;
    S.en = { sub: keepSub && p ? p.sub : 'piston', pT: PISTON.T0, pMode: 'hold', pMax: 0, sTh: 80, sOmega: 0, sAng: 0, sStopped: false, tCond: true, tV: 1, tAng: 0, tHold: 0, seen: {} };
    updateCtl();
  }
  const pLift = () => pistonH(S.en.pT) - PISTON.h0;
  const sRpm = () => S.en.sOmega * 60 / TAU;
  function stepEn(dt) {
    const e = S.en;
    if (e.sub === 'piston') {
      if (e.pMode === 'heat') e.pT = Math.min(PISTON.Tmax, e.pT + PISTON.rate * dt);
      else if (e.pMode === 'cool') e.pT = Math.max(PISTON.T0, e.pT - PISTON.rate * dt);
      if (e.pMode !== 'hold' && (e.pT >= PISTON.Tmax || e.pT <= PISTON.T0)) { e.pMode = 'hold'; updateCtl(); }
      e.pMax = Math.max(e.pMax, pLift());
    } else if (e.sub === 'stirling') {
      const target = Math.max(0, e.sTh - STIR.room) * STIR.rpmPerK * TAU / 60;
      e.sOmega = SciSim.approach(e.sOmega, target, dt, 1.6); if (target === 0 && e.sOmega < 0.02) e.sOmega = 0;
      e.sAng += e.sOmega * dt;
    } else {
      const target = e.tCond ? 1 : 0;
      e.tV = SciSim.approach(e.tV, target, dt, e.tCond ? 1.4 : 0.9); if (!e.tCond && e.tV < 0.01) e.tV = 0;
      e.tAng += e.tV * 9 * dt;
    }
  }
  const GX = PHONE ? 230 : 340, GY = MH - 40;
  function drawPiston(dt) {
    const e = S.en, h = pistonH(e.pT), sc = PHONE ? 5.4 : 6.4, cw = PHONE ? 100 : 130, cx = GX;
    const topIn = GY - 20 - 21 * sc;                    // 실린더 안쪽 위
    const baseY = GY - 20, pistonY = baseY - h * 100 * sc;
    T(16, PHONE ? 24 : 30, '🔥 닫힌 실린더 속 공기를 가열·냉각해요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    // 화로/얼음
    ctx.fillStyle = '#7b889e'; D.roundRect(cx - cw / 2 - 18, GY, cw + 36, 14, 4); ctx.fill();
    if (e.pMode === 'heat') { D.flame(cx - 20, GY - 2, 36, S.clock); D.flame(cx + 22, GY - 2, 30, S.clock + 1); if (!RM) parts.emit({ x: cx + (Math.random() - 0.5) * cw * 0.7, y: GY - 6, vx: 0, vy: -50 - Math.random() * 30, life: 0.7, size: 2.4, color: '#ff8a3d', gravity: -20, shape: 'circle' }); }
    else if (e.pMode === 'cool') { for (let i = 0; i < 4; i++) { D.roundRect(cx - cw * 0.4 + i * cw * 0.2, GY - 12 - (i % 2) * 5, 18, 16, 3); ctx.fillStyle = 'rgba(160,215,255,.9)'; ctx.fill(); ctx.strokeStyle = '#6aa9d6'; ctx.lineWidth = 1.5; ctx.stroke(); } }
    // 실린더 (공기)
    const heat = clamp((e.pT - PISTON.T0) / (PISTON.Tmax - PISTON.T0), 0, 1);
    ctx.fillStyle = C.mix('#dff0ff', '#ffc9a8', heat); ctx.fillRect(cx - cw / 2, pistonY, cw, baseY - pistonY);
    for (let i = 0; i < 16; i++) { const px = cx - cw / 2 + 10 + (i * 37) % (cw - 20), py = pistonY + 10 + (i * 53) % Math.max(10, baseY - pistonY - 14); const sp = 1 + heat * 2; D.sphere(px + Math.sin(S.clock * sp + i) * 4, py + Math.cos(S.clock * sp * 1.3 + i) * 4, 3.2, '#8b5cf6', { gloss: false }); }
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - cw / 2, topIn - 8); ctx.lineTo(cx - cw / 2, baseY); ctx.lineTo(cx + cw / 2, baseY); ctx.lineTo(cx + cw / 2, topIn - 8); ctx.stroke();
    // 피스톤과 추
    D.shadow(() => { D.roundRect(cx - cw / 2 + 2, pistonY - 12, cw - 4, 14, 3); ctx.fillStyle = '#6b778c'; ctx.fill(); }, { blur: 4, y: 2 });
    ctx.fillStyle = '#9aa5b8'; ctx.fillRect(cx - 4, pistonY - 34, 8, 24);
    D.shadow(() => { D.roundRect(cx - 30, pistonY - 68, 60, 34, 6); ctx.fillStyle = '#4b5a78'; ctx.fill(); }, { blur: 5, y: 2 }); T(cx, pistonY - 46, f1(PISTON.m) + ' kg', 14, '#fff', 'center', 800);
    // 상승 눈금 (처음 높이 기준)
    const y0 = baseY - PISTON.h0 * 100 * sc, rx = cx + cw / 2 + 36;
    ctx.fillStyle = '#7b889e'; ctx.fillRect(rx, y0 - 5 * sc, 2.5, 5 * sc + 6);
    for (let c = 0; c <= 5; c++) { const y = y0 - c * sc; ctx.fillRect(rx - 6, y - 0.75, c % 2 ? 8 : 12, 1.5); if (c % 2 === 0) T(rx + 10, y + 4, String(c), 12, '#5a6679', 'left', 800); }
    T(rx + 4, y0 + 22, '상승(cm)', 11.5, '#5a6679', 'center', 800);
    D.dashedLine(cx - cw / 2 - 20, y0, rx - 4, y0, { color: '#14a058', width: 2 });
    T(cx - cw / 2 - 24, y0 + 4, '처음 높이', 12, '#0b6b39', 'right', 800);
    const lift = (pistonH(e.pT) - PISTON.h0) * 100;
    D.label(rx + 70, y0 - lift * sc, '+' + lift.toFixed(1) + ' cm', { bg: '#14a058', size: 12.5 });
    // 온도계
    D.label(cx, baseY + 34, '공기 온도 ' + f1(e.pT) + ' °C', { bg: e.pT > 40 ? '#c0392b' : '#3867f4', size: PHONE ? 12.5 : 13.5 });
    if (e.pMode === 'heat' || e.pMode === 'cool') D.arrow(cx - cw / 2 - 44, e.pMode === 'heat' ? GY - 6 : GY - 40, cx - cw / 2 - 44, e.pMode === 'heat' ? GY - 50 : GY - 4, { color: e.pMode === 'heat' ? '#e2464b' : '#3867f4', width: 6, label: e.pMode === 'heat' ? '열을 줘요' : '열을 빼앗아요', labelOffset: 54, labelSize: 12.5 });
    if (e.pMode === 'hold' && e.pT === PISTON.T0 && e.pMax === 0) T(VW / 2 + 70, PHONE ? 62 : 72, '🔥 가열을 눌러 보세요', 14.5, '#5a6679', 'center', 800);
  }
  const SBX = PHONE ? 140 : 210, SBY = MH - 54;
  function drawStirling(dt) {
    const e = S.en, om = e.sOmega, th = e.sTh, dK = Math.max(0, th - STIR.room), rpm = sRpm();
    T(16, PHONE ? 24 : 30, '☕ 스털링 엔진: 컵 위에서 돌아가요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    // 컵과 뜨거운 물
    const cw = PHONE ? 130 : 170, ch = PHONE ? 54 : 70, cx = SBX, topY = SBY - ch;
    D.shadow(() => { D.roundRect(cx - cw / 2, topY, cw, ch, 10); ctx.fillStyle = '#f4f6fb'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = C.mix('#8fc7ff', '#ff7a4a', clamp(dK / 60, 0, 1)); D.roundRect(cx - cw / 2 + 5, topY + 8, cw - 10, ch - 14, 7); ctx.fill();
    T(cx, topY + ch / 2 + 6, '물 ' + th + ' °C', 14, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.25)', strokeWidth: 3 });
    if (dK > 0 && !RM) { for (let i = 0; i < 3; i++) { const sx = cx - 30 + i * 30, sy = topY - 4 - ((S.clock * 20 + i * 14) % 22); ctx.strokeStyle = 'rgba(255,255,255,' + clamp(dK / 70, 0.2, 0.7) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy + 8); ctx.quadraticCurveTo(sx + 5, sy, sx, sy - 8); ctx.stroke(); } }
    // 엔진 몸체 (아래판: 뜨거움, 윗판: 실온)
    const ex = cx, ey = topY - 70, ew = PHONE ? 90 : 120;
    D.shadow(() => { D.roundRect(ex - ew / 2, ey + 40, ew, 16, 4); ctx.fillStyle = C.mix('#9aa5b8', '#ff6a3a', clamp(dK / 60, 0, 1)); ctx.fill(); }, { blur: 4, y: 2 });
    D.roundRect(ex - ew / 2, ey - 20, ew, 60, 8); ctx.fillStyle = 'rgba(214,236,252,.7)'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
    D.roundRect(ex - ew / 2 - 4, ey - 28, ew + 8, 12, 4); ctx.fillStyle = '#7cc4ff'; ctx.fill();
    for (let i = 0; i < 4; i++) { ctx.fillStyle = '#9fd0ff'; ctx.fillRect(ex - ew / 2 + 8 + i * (ew - 16) / 3, ey - 44, 5, 16); }
    T(ex + ew / 2 + 12, ey - 30, '윗면 ' + STIR.room + ' °C', 12.5, '#1d4ed8', 'left', 800); T(ex + ew / 2 + 12, ey + 54, '아랫면 ' + th + ' °C', 12.5, '#c0392b', 'left', 800);
    // 열 흐름 (아래 → 위)
    if (dK > 0) { D.arrow(ex - 14, ey + 38, ex - 14, ey - 14, { color: '#e2464b', width: 3 + dK / 12, alpha: 0.75 }); D.arrow(ex + 18, ey + 38, ex + 18, ey - 14, { color: '#e2464b', width: 3 + dK / 12, alpha: 0.75 }); }
    // 변위 피스톤 (크랭크와 연결)
    const fx = ex + (PHONE ? 130 : 190), fy = ey + 14, fr = PHONE ? 38 : 52;
    const crank = e.sAng;
    ctx.strokeStyle = '#6b778c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ex, ey + 20 + Math.sin(crank) * 12); ctx.lineTo(fx + Math.cos(crank) * fr * 0.55, fy + Math.sin(crank) * fr * 0.55); ctx.stroke();
    D.roundRect(ex - ew * 0.28, ey + 6 + Math.sin(crank) * 12, ew * 0.56, 12, 3); ctx.fillStyle = '#4b5a78'; ctx.fill();
    // 플라이휠
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(crank);
    D.shadow(() => { ctx.beginPath(); ctx.arc(0, 0, fr, 0, TAU); ctx.fillStyle = '#c9d3e3'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#6b778c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, fr, 0, TAU); ctx.stroke();
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * Math.PI / 2) * fr, Math.sin(i * Math.PI / 2) * fr); ctx.stroke(); }
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.arc(fr * 0.55, 0, 6, 0, TAU); ctx.fill(); ctx.restore();
    D.sphere(fx, fy, 6, '#3a4456', { gloss: false });
    D.label(fx, fy + fr + 24, '회전 ' + Math.round(rpm) + ' rpm', { bg: rpm > 0.5 ? '#14a058' : '#8b97ab', size: PHONE ? 12.5 : 13.5 });
    T(VW - 16, PHONE ? 44 : 52, '온도 차 ' + dK + ' °C → ' + (dK === 0 ? '멈춰요' : '돌아요'), PHONE ? 12.5 : 14, dK === 0 ? '#a3262b' : '#0b6b39', 'right', 800);
  }
  const TBX = PHONE ? 76 : 120;
  function polyAt(pts, u) {
    let tot = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
    let s = u * tot;
    for (let i = 0; i < seg.length; i++) { if (s <= seg[i]) { const k = seg[i] ? s / seg[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } s -= seg[i]; }
    return pts[pts.length - 1];
  }
  function drawTurbine(dt) {
    const e = S.en, v = e.tV, cond = e.tCond;
    T(16, PHONE ? 24 : 30, '🏭 증기 터빈: 끓인 물의 증기로 터빈을 돌려요', PHONE ? 13 : 17, '#26324a', 'left', 800);
    const by = MH - 62, bx = TBX, tx = VW / 2 - 10, tyc = 112, cxr = VW - (PHONE ? 80 : 130), tr = PHONE ? 44 : 52;
    const path = [[bx, by - 80], [bx, tyc], [tx - tr, tyc], [tx + tr, tyc], [cxr, tyc], [cxr, by - 100]];
    // 보일러(고온)
    D.shadow(() => { D.roundRect(bx - 46, by - 80, 92, 80, 12); ctx.fillStyle = '#c0392b'; ctx.fill(); }, { blur: 6, y: 3 }); T(bx, by - 36, '보일러', 13.5, '#fff', 'center', 800); T(bx, by - 18, '고온', 12, '#ffd9d0', 'center', 800);
    D.flame(bx, by + 4, 34, S.clock);
    // 관
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#9aa5b8'; ctx.lineWidth = 12; ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    ctx.strokeStyle = '#dfe6f1'; ctx.lineWidth = 6; ctx.beginPath(); path.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    // 터빈
    D.sphere(tx, tyc, tr, '#eef2f8', { gloss: false, outline: '#8fa3bd', outlineWidth: 4 });
    ctx.save(); ctx.translate(tx, tyc); ctx.rotate(e.tAng);
    for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.fillStyle = '#6b778c'; D.roundRect(-5, -(tr - 6), 10, tr - 6, 3); ctx.fill(); }
    ctx.restore(); D.sphere(tx, tyc, 9, '#3a4456', { gloss: false });
    D.label(tx, tyc + tr + 26, '터빈 ' + Math.round(v * 100) + ' %', { bg: v > 0.05 ? '#14a058' : '#8b97ab', size: PHONE ? 12 : 13.5 });
    // 응축기(저온)
    D.shadow(() => { D.roundRect(cxr - 46, by - 100, 92, 100, 12); ctx.fillStyle = cond ? '#3867f4' : '#8b97ab'; ctx.fill(); }, { blur: 6, y: 3 }); T(cxr, by - 56, '응축기', 13.5, '#fff', 'center', 800); T(cxr, by - 38, cond ? '냉각수 ON' : '냉각수 OFF', 12, '#d7e4ff', 'center', 800);
    if (cond) { for (let i = 0; i < 3; i++) { const wx = cxr - 28 + i * 28; ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 2.5; ctx.beginPath(); for (let k = 0; k <= 8; k++) { const px = wx + Math.sin(S.clock * 3 + k) * 3, py = by - 24 + k * 2.4; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); } }
    // 복귀 관 (식은 물을 보일러로)
    ctx.strokeStyle = '#7cc4ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cxr, by); ctx.lineTo(cxr, by + 22); ctx.lineTo(bx, by + 22); ctx.lineTo(bx, by); ctx.stroke();
    // 증기 흐름 (흐름의 빠르기 = 터빈 회전)
    e.tFlow = ((e.tFlow || 0) + v * 0.35 * dt) % 1;
    for (let i = 0; i < 9; i++) { const u = (e.tFlow + i / 9) % 1, p = polyAt(path, u); if (v > 0.03) D.sphere(p[0], p[1], 4.5, '#fff', { gloss: false, outline: 'rgba(143,163,189,.8)', outlineWidth: 1 }); }
    if (!cond && v < 0.2) T(cxr - 60, tyc - 24, '증기가 식을 곳이 없어 터빈이 멈춰요', 13, '#a3262b', 'right', 800);
  }
  function drawEn(dt) {
    bgData(); beginMain(); bgMain();
    const e = S.en;
    if (e.sub === 'piston') drawPiston(dt); else if (e.sub === 'stirling') drawStirling(dt); else drawTurbine(dt);
    parts.update(dt); parts.draw(ctx); endMain();
    // 데이터
    panel(RL.x, RL.y, RL.w, RL.h, 14);
    T(RL.x + 12, RL.y + 22, e.sub === 'piston' ? '열 → 위치 에너지' : e.sub === 'stirling' ? '온도 차와 회전' : '열이 흐르는 길', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let y = RL.y + 46; const bw = RL.w - 28;
    if (e.sub === 'piston') {
      const lift = pLift(), W = PISTON.m * G * lift;
      y += textBlock(RL.x + 14, y, bw, '공기 온도 ' + f1(e.pT) + ' °C → 기둥 높이 ' + f1(pistonH(e.pT) * 100) + ' cm', 13.5, '#26324a', 19, 800) + 2;
      y += textBlock(RL.x + 14, y, bw, '추가 올라간 높이 ' + f1(lift * 100) + ' cm', 13.5, '#0b6b39', 19, 800) + 2;
      y += textBlock(RL.x + 14, y, bw, '추의 위치 에너지 증가 mgΔh = ' + f1(PISTON.m) + ' × ' + G + ' × ' + lift.toFixed(3) + ' = ' + f2(W) + ' J', 13.5, '#c2410c', 19, 800) + 6;
      textBlock(RL.x + 14, y, bw, '열을 받은 공기가 팽창해 추를 밀어 올려요. 열이 역학적 에너지로 바뀐 거예요. 식히면 공기가 줄어들며 추가 내려와요.', 12.5, '#5a6679', 17, 700);
    } else if (e.sub === 'stirling') {
      const dK = Math.max(0, e.sTh - STIR.room);
      y += textBlock(RL.x + 14, y, bw, '컵 속 물 ' + e.sTh + ' °C − 윗면 ' + STIR.room + ' °C = 온도 차 ' + dK + ' °C', 13.5, '#26324a', 19, 800) + 2;
      y += textBlock(RL.x + 14, y, bw, '회전 속도 = ' + dK + ' × ' + STIR.rpmPerK + ' = ' + f1(dK * STIR.rpmPerK) + ' rpm (지금 ' + Math.round(sRpm()) + ' rpm)', 13.5, '#0b6b39', 19, 800) + 6;
      textBlock(RL.x + 14, y, bw, '아랫면은 뜨겁고 윗면은 차가워야 열이 흐르며 엔진이 돌아요. 온도 차가 0이 되면 열이 흐르지 않아 멈춰요.', 12.5, '#5a6679', 17, 700);
    } else {
      y += textBlock(RL.x + 14, y, bw, '고온(보일러) → 터빈 → 저온(응축기)', 13.5, '#26324a', 19, 800) + 2;
      y += textBlock(RL.x + 14, y, bw, e.tCond ? '냉각수가 증기의 열을 가져가서 증기가 계속 흘러요.' : '냉각수가 없으면 증기가 식지 않아 흐름이 막혀요.', 13.5, e.tCond ? '#0b6b39' : '#a3262b', 19, 800) + 6;
      textBlock(RL.x + 14, y, bw, '열기관은 열을 받는 고온부 외에, 남은 열을 버리는 저온부가 있어야 계속 일해요.', 12.5, '#5a6679', 17, 700);
    }
    panel(RR.x, RR.y, RR.w, RR.h, 14);
    T(RR.x + 12, RR.y + 22, '열기관이란?', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    const lines = ['열을 받아 역학적 에너지(일)로 바꾸는 장치예요.', '① 고온에서 열을 받고', '② 일부를 일로 바꾸고', '③ 나머지는 저온으로 버려요.', e.sub === 'piston' ? '(피스톤: 열 → 공기 팽창 → 추를 올리는 일)' : e.sub === 'stirling' ? '(스털링 엔진: 뜨거운 아랫면과 찬 윗면의 온도 차)' : '(터빈: 증기가 고온 → 저온으로 흐르며 날개를 돌려요)'];
    let yy = RR.y + 46; lines.forEach((l, i) => { yy += textBlock(RR.x + 14, yy, RR.w - 28, l, i === 0 ? 13.5 : 13, i === 0 ? '#26324a' : '#5a6679', 18, i === 0 ? 800 : 700) + 4; });
  }

  /* =====================================================
     ② 열 흐름: 고온 → 열기관 → 일 + 저온으로 버린 열
     ===================================================== */
  const SHUF = [4, 0, 2, 1, 3];       // 비교 화면에 나오는 기관의 순서 (ENGINES 인덱스, 일부러 섞어 놓음)
  function resetFl(keepSub) {
    const p = S.fl;
    S.fl = { sub: keepSub && p ? p.sub : 'flow', W: ENG.W0, rank: {}, rankOK: {}, flowT: 0 };
    updateCtl();
  }
  const FLW = { hx: PHONE ? 8 : 36, hw: PHONE ? 78 : 128, ex: PHONE ? 176 : 300, ew: PHONE ? 112 : 150, ox: PHONE ? 396 : 650 };
  function thickArrow(x1, y1, x2, y2, th, col, label) {
    const hd = Math.min(26, th * 0.8 + 10), len = x2 - x1;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x1, y1 - th / 2); ctx.lineTo(x2 - hd, y1 - th / 2); ctx.lineTo(x2 - hd, y1 - th / 2 - 8); ctx.lineTo(x2, y2); ctx.lineTo(x2 - hd, y1 + th / 2 + 8); ctx.lineTo(x2 - hd, y1 + th / 2); ctx.lineTo(x1, y1 + th / 2); ctx.closePath(); ctx.fill();
    if (label) T((x1 + x2 - hd) / 2, y1 + 5, label, PHONE ? 12.5 : 14, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.25)', strokeWidth: 3 });
  }
  function drawFlow(dt) {
    const f = S.fl, W = f.W, Qc = ENG.Qh - W, k = (PHONE ? 52 : 74) / ENG.Qh;
    T(16, PHONE ? 24 : 30, '📊 열기관의 에너지 흐름 (고온에서 받은 열 Q_h = ' + ENG.Qh + ' J)', PHONE ? 13 : 17, '#26324a', 'left', 800);
    const cy = 150, F = FLW;
    // 고온 열원
    D.shadow(() => { D.roundRect(F.hx, cy - 62, F.hw, 124, 14); const g = ctx.createLinearGradient(0, cy - 62, 0, cy + 62); g.addColorStop(0, '#ff8a5a'); g.addColorStop(1, '#d9402b'); ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 3 });
    T(F.hx + F.hw / 2, cy - 12, '고온 열원', PHONE ? 13 : 15, '#fff', 'center', 800); T(F.hx + F.hw / 2, cy + 10, '🔥', 24, '#fff', 'center', 800); T(F.hx + F.hw / 2, cy + 40, 'Q_h ' + ENG.Qh + ' J', PHONE ? 12 : 13.5, '#ffe3d6', 'center', 800);
    // 열기관
    D.shadow(() => { D.roundRect(F.ex, cy - 70, F.ew, 140, 16); ctx.fillStyle = '#eef2f8'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; D.roundRect(F.ex, cy - 70, F.ew, 140, 16); ctx.stroke();
    f.gear = (f.gear || 0) + dt * (0.8 + W / 300);
    ctx.save(); ctx.translate(F.ex + F.ew / 2, cy - 4); ctx.rotate(f.gear); ctx.strokeStyle = '#6b778c'; ctx.lineWidth = 8; for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, PHONE ? 24 : 32); ctx.stroke(); } ctx.restore();
    D.sphere(F.ex + F.ew / 2, cy - 4, PHONE ? 14 : 18, '#9aa5b8', { gloss: true });
    T(F.ex + F.ew / 2, cy + 56, '열기관', 13.5, '#26324a', 'center', 800);
    // 화살표 (폭 = 에너지)
    thickArrow(F.hx + F.hw, cy, F.ex, cy, ENG.Qh * k, '#e2552a', ENG.Qh + ' J');
    const wy = 92, qy = 212;
    if (W > 0) thickArrow(F.ex + F.ew, wy, F.ox, wy, W * k, '#14a058', W + ' J');
    thickArrow(F.ex + F.ew, qy, F.ox, qy, Qc * k, '#3867f4', Qc + ' J');
    // 흐르는 점
    f.flowT = (f.flowT + dt * 0.5) % 1;
    for (let i = 0; i < 4; i++) { const u = (f.flowT + i / 4) % 1; D.sphere(F.hx + F.hw + (F.ex - F.hx - F.hw) * u, cy - ENG.Qh * k / 2 + 6, 3.5, '#fff', { gloss: false }); if (W > 0) D.sphere(F.ex + F.ew + (F.ox - F.ex - F.ew) * u, wy - W * k / 2 + 6, 3.5, '#fff', { gloss: false }); D.sphere(F.ex + F.ew + (F.ox - F.ex - F.ew) * u, qy - Qc * k / 2 + 6, 3.5, '#fff', { gloss: false }); }
    // 출력 상자
    D.shadow(() => { D.roundRect(F.ox + 2, wy - 30, PHONE ? 70 : 120, 60, 12); ctx.fillStyle = '#14a058'; ctx.fill(); }, { blur: 6, y: 2 }); T(F.ox + 2 + (PHONE ? 35 : 60), wy - 4, '일 W', 14, '#fff', 'center', 800); T(F.ox + 2 + (PHONE ? 35 : 60), wy + 17, W + ' J', 13, '#d8f5e4', 'center', 800);
    D.shadow(() => { D.roundRect(F.ox + 2, qy - 36, PHONE ? 70 : 120, 72, 12); ctx.fillStyle = '#3867f4'; ctx.fill(); }, { blur: 6, y: 2 }); T(F.ox + 2 + (PHONE ? 35 : 60), qy - 8, '저온부', 14, '#fff', 'center', 800); T(F.ox + 2 + (PHONE ? 35 : 60), qy + 12, 'Q_c ' + Qc + ' J', 13, '#d7e4ff', 'center', 800); T(F.ox + 2 + (PHONE ? 35 : 60), qy + 28, '버리는 열', 11.5, '#d7e4ff', 'center', 700);
    parts.update(dt); parts.draw(ctx); endMain();
    // 효율 미터
    panel(RL.x, RL.y, RL.w, RL.h, 14);
    T(RL.x + 12, RL.y + 22, '효율 e = W ÷ Q_h', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    const e = W / ENG.Qh * 100;
    let y = RL.y + 46; const bw = RL.w - 28;
    y += textBlock(RL.x + 14, y, bw, 'Q_h = W + Q_c → ' + ENG.Qh + ' = ' + W + ' + ' + Qc + ' (J)', 13.5, '#26324a', 19, 800) + 2;
    y += textBlock(RL.x + 14, y, bw, 'e = ' + W + ' ÷ ' + ENG.Qh + ' = ' + eJ(e) + ' %', 15, '#0b6b39', 21, 800) + 6;
    // 막대
    const mx = RL.x + 16, mw = RL.w - 32, my = y + 6;
    D.roundRect(mx, my, mw, 22, 11); ctx.fillStyle = '#e8ecf4'; ctx.fill();
    if (e > 0) { D.roundRect(mx, my, Math.max(14, mw * e / 100), 22, 11); ctx.fillStyle = '#14a058'; ctx.fill(); }
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx + mw, my - 6); ctx.lineTo(mx + mw, my + 28); ctx.stroke();
    T(mx + mw, my + 44, '100 % (불가능)', 12.5, '#c0392b', 'right', 800); T(mx, my + 44, '0 %', 12.5, '#5a6679', 'left', 800);
    T(mx + mw * Math.min(e, 100) / 100, my - 10, eJ(e) + ' %', 12.5, '#0b6b39', e > 85 ? 'right' : 'center', 800);
    const noQ = 'W를 늘려도 Q_c = 0(W = ' + ENG.Qh + ' J)은 만들 수 없어요. 슬라이더는 ' + ENG.Wmax + ' J까지예요.';
    if (!PHONE) textBlock(RL.x + 14, my + 62, bw, noQ, 12.5, '#5a6679', 17, 700);
    panel(RR.x, RR.y, RR.w, RR.h, 14);
    T(RR.x + 12, RR.y + 22, '효율을 높이는 방법', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let yy = RR.y + 46;
    ['① 마찰을 줄여요.', '② 고온 열원을 더 뜨겁게 해요.', '③ 저온부를 더 차갑게 해요.'].forEach((l) => { yy += textBlock(RR.x + 14, yy, RR.w - 28, l, 13.5, '#26324a', 19, 800) + 2; });
    yy += textBlock(RR.x + 14, yy + 6, RR.w - 28, '그래도 이상적으로도 효율 100 %는 불가능해요. 열기관은 늘 일부 열을 저온부로 버려요.', 13, '#5a6679', 18, 700) + 6;
    if (PHONE) textBlock(RR.x + 14, yy + 6, RR.w - 28, noQ, 12.5, '#c2410c', 17, 700);
  }
  function drawCompare(dt) {
    T(16, PHONE ? 24 : 30, '🏭 열기관 5종의 효율 (열 → 일로 바뀐 비율)', PHONE ? 14 : 17, '#26324a', 'left', 800);
    const x0 = PHONE ? 130 : 210, x1 = VW - 40, top = PHONE ? 50 : 58, rh = (MH - top - 22) / 5;
    for (let p = 0; p <= 100; p += 20) { const xx = x0 + (x1 - x0) * p / 100; ctx.strokeStyle = 'rgba(120,135,160,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx, top - 4); ctx.lineTo(xx, top + rh * 5); ctx.stroke(); T(xx, top + rh * 5 + 14, p + ' %', 11.5, '#5a6679', 'center', 800); }
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, top - 8); ctx.lineTo(x1, top + rh * 5); ctx.stroke(); T(x1, top - 12, '100 % (불가능)', 11.5, '#c0392b', 'right', 800);
    SHUF.forEach((ei, i) => {
      const e = ENGINES[ei], y = top + i * rh, bh = rh * 0.52, by = y + (rh - bh) / 2, hi = e.hi / 100;
      T(8, by + bh / 2 + 5, e.icon + ' ' + e.name, PHONE ? 11.5 : 14, '#26324a', 'left', 800);
      D.roundRect(x0, by, (x1 - x0) * hi, bh, 6); ctx.fillStyle = '#14a058'; ctx.fill();
      if (e.lo !== e.hi) { D.roundRect(x0, by, (x1 - x0) * e.lo / 100, bh, 6); ctx.fillStyle = '#0b8a47'; ctx.fill(); }
      T(x0 + (x1 - x0) * hi + 8, by + bh / 2 + 5, effTxt(e), 13, '#26324a', 'left', 800);
      if (S.fl.rank[ei]) { D.sphere(x1 + 12 - (PHONE ? 4 : 0), by + bh / 2, 11, S.fl.rankOK[ei] === true ? '#14a058' : '#3867f4', { gloss: false }); T(x1 + 12 - (PHONE ? 4 : 0), by + bh / 2 + 5, S.fl.rank[ei], 13, '#fff', 'center', 800); }
    });
    parts.update(dt); parts.draw(ctx); endMain();
    panel(RL.x, RL.y, RL.w, RL.h, 14);
    T(RL.x + 12, RL.y + 22, '순서 정하기', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let y = RL.y + 46; const bw = RL.w - 28;
    y += textBlock(RL.x + 14, y, bw, '효율이 낮은 기관부터 높은 기관까지 1~5번 순서를 오른쪽 장치에서 골라요.', 13.5, '#26324a', 19, 800) + 6;
    textBlock(RL.x + 14, y, bw, '막대 길이와 오른쪽의 숫자를 비교해 보세요. 모두 100 %보다 훨씬 작아요.', 13, '#5a6679', 18, 700);
    panel(RR.x, RR.y, RR.w, RR.h, 14);
    T(RR.x + 12, RR.y + 22, '가장 효율이 높은 기관도', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    textBlock(RR.x + 14, RR.y + 48, RR.w - 28, '복합 화력 발전도 ' + effTxt(ENGINES[4]) + '예요. 나머지 에너지는 버리는 열이 돼요.', 13.5, '#c2410c', 19, 800);
  }
  const rkSel = [];
  (function buildRk() {
    const box = $('#rkRows');
    SHUF.forEach((ei) => {
      const e = ENGINES[ei], row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + e.icon + ' ' + e.name + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', e.name + '의 효율 순서');
      sel.innerHTML = '<option value="">순서 고르기</option>' + [1, 2, 3, 4, 5].map((n) => '<option value="' + n + '">' + n + '번째' + (n === 1 ? ' (가장 낮음)' : n === 5 ? ' (가장 높음)' : '') + '</option>').join('');
      sel.addEventListener('change', () => { S.fl.rank[ei] = sel.value ? +sel.value : undefined; S.fl.rankOK = {}; sel.classList.remove('ok', 'bad'); Sound.click(); });
      row.appendChild(sel); box.appendChild(row); rkSel.push([ei, sel]);
    });
  })();
  function resetRkUI() { rkSel.forEach(([ei, s]) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }
  function drawFl(dt) {
    bgData(); beginMain(); bgMain();
    if (S.fl.sub === 'flow') drawFlow(dt); else drawCompare(dt);
  }

  /* =====================================================
     ③ 영구기관은 왜 안 될까?
     ===================================================== */
  function resetPp(keepSub) {
    const p = S.pp;
    S.pp = { sub: keepSub && p ? p.sub : 'magnet', run: { magnet: { st: 'ready', t: 0, ang: 0 }, mill: { st: 'ready', t: 0, ang: 0 }, wheel: { st: 'ready', t: 0, ang: 0 } }, rows: p ? p.rows : [], pick: {}, pickOK: {} };
    updateCtl();
  }
  function ppGo() {
    const p = S.pp; if (PERPK.indexOf(p.sub) < 0) return false;
    const r = p.run[p.sub]; if (r.st === 'go') return false;
    if (r.st === 'done') { r.st = 'ready'; r.t = 0; r.ang = 0; updateCtl(); return false; }
    r.st = 'go'; r.t = 0; Sound.click(); updateCtl(); return true;
  }
  const ppOmega = (k, t) => Math.max(0, PERP.w0 * (1 - t / PERP[k].T));
  function stepPp(dt) {
    const p = S.pp; if (PERPK.indexOf(p.sub) < 0) return;
    const r = p.run[p.sub]; if (r.st !== 'go') return;
    r.t += dt; r.ang += ppOmega(p.sub, Math.min(r.t, PERP[p.sub].T)) * dt;
    if (r.t >= PERP[p.sub].T) { r.t = PERP[p.sub].T; r.st = 'done'; if (!p.rows.some((x) => x.k === p.sub)) p.rows.push({ k: p.sub, T: PERP[p.sub].T }); Sound.fail(); parts.burst(PCX, PCY, { count: 10, speed: 90, size: 3, colors: ['#e2464b', '#ffb400'], gravity: 100 }); updateCtl(); }
  }
  const PCX = PHONE ? 190 : 330, PCY = 150, PR = PHONE ? 62 : 82;
  function drawWheelBase(ang, spokes) {
    ctx.save(); ctx.translate(PCX, PCY); ctx.rotate(ang);
    ctx.strokeStyle = '#6b778c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, PR, 0, TAU); ctx.stroke();
    for (let i = 0; i < spokes; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * TAU / spokes) * PR, Math.sin(i * TAU / spokes) * PR); ctx.stroke(); }
    ctx.restore();
  }
  function drawPerp(dt) {
    const p = S.pp, k = p.sub, r = p.run[k], om = r.st === 'ready' ? 0 : ppOmega(k, Math.min(r.t, PERP[k].T)), run = r.st === 'go', frac = om / PERP.w0;
    T(16, PHONE ? 24 : 30, '♾️ ' + PERP[k].name + ' · 발명가의 주장: “한 번 돌려 주면 영원히 돌며 일을 해요!”', PHONE ? 11.5 : 15.5, '#26324a', 'left', 800);
    if (k === 'magnet') {
      drawWheelBase(r.ang, 8);
      for (let i = 0; i < 8; i++) { const a = r.ang + i * TAU / 8; ctx.save(); ctx.translate(PCX + Math.cos(a) * PR, PCY + Math.sin(a) * PR); ctx.rotate(a + Math.PI / 2); D.roundRect(-6, -14, 12, 28, 3); ctx.fillStyle = '#e2464b'; ctx.fill(); ctx.fillStyle = '#3867f4'; ctx.fillRect(-6, 0, 12, 14); ctx.restore(); }
      D.shadow(() => { D.roundRect(PCX + PR + 26, PCY - 80, 50, 36, 6); ctx.fillStyle = '#6b778c'; ctx.fill(); }, { blur: 4, y: 2 }); T(PCX + PR + 51, PCY - 57, 'N S', 14, '#fff', 'center', 800);
      ctx.strokeStyle = 'rgba(56,103,244,.45)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(PCX + PR + 26, PCY - 62, 26 + i * 14, Math.PI * 0.65, Math.PI * 1.25); ctx.stroke(); } ctx.setLineDash([]);
    } else if (k === 'mill') {
      drawWheelBase(r.ang, 8);
      ctx.save(); ctx.translate(PCX, PCY); ctx.rotate(r.ang); for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.fillStyle = '#9aa5b8'; D.roundRect(PR - 4, -9, 20, 18, 3); ctx.fill(); } ctx.restore();
      D.shadow(() => { D.roundRect(PCX - PR - 120, 60, 90, 56, 8); ctx.fillStyle = '#e8f3ff'; ctx.fill(); }, { blur: 4, y: 2 }); ctx.fillStyle = '#7cc4ff'; ctx.fillRect(PCX - PR - 116, 76, 82, 36); T(PCX - PR - 75, 54, '물통', 12.5, '#26324a', 'center', 800);
      if (run && frac > 0.02 && !RM && Math.random() < 90 * frac * dt) parts.emit({ x: PCX - PR - 34 + Math.random() * 4, y: 100, vx: 70 + Math.random() * 20, vy: 0, life: 0.55, size: 3.2, color: '#5aa8e8', gravity: 520, shape: 'circle' });
      D.shadow(() => { D.roundRect(PCX + PR + 40, PCY + 34, 70, 48, 8); ctx.fillStyle = '#c9d3e3'; ctx.fill(); }, { blur: 4, y: 2 }); T(PCX + PR + 75, PCY + 62, '펌프', 13.5, '#26324a', 'center', 800);
      ctx.strokeStyle = '#4d5a78'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(PCX + PR - 4, PCY); ctx.lineTo(PCX + PR + 40, PCY + 58); ctx.stroke();
      ctx.strokeStyle = '#7cc4ff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(PCX + PR + 75, PCY + 34); ctx.lineTo(PCX + PR + 75, 40); ctx.lineTo(PCX - PR - 75, 40); ctx.lineTo(PCX - PR - 75, 60); ctx.stroke();
      for (let i = 0; i < 5; i++) { const u = ((S.clock * frac * 0.5) + i / 5) % 1; if (run || r.st === 'done') { /* 흐름 점 */ } if (frac > 0.02) { const px = PCX + PR + 75 - u * (PCX + PR + 75 - (PCX - PR - 75)); D.sphere(px, 40, 3.5, '#bfe3ff', { gloss: false }); } }
    } else {
      drawWheelBase(r.ang, 6);
      for (let i = 0; i < 6; i++) { const a = r.ang + i * TAU / 6, out = Math.cos(a - r.ang * 0) > 0, rr = out ? PR * 1.0 : PR * 0.55; const wx = PCX + Math.cos(a) * rr, wy = PCY + Math.sin(a) * rr; ctx.strokeStyle = '#4d5a78'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(PCX + Math.cos(a) * PR * 0.3, PCY + Math.sin(a) * PR * 0.3); ctx.lineTo(wx, wy); ctx.stroke(); D.sphere(wx, wy, 11, '#e2552a', { shadow: true }); }
      T(PCX + PR + 60, PCY - 6, '오른쪽 추가 더 멀리!', 12.5, '#c2410c', 'left', 800);
    }
    D.sphere(PCX, PCY, 8, '#3a4456', { gloss: false });
    // 전구 (일 출력)
    const lx = PHONE ? 60 : 90, ly = 220;
    D.glow(lx, ly, 34 * (0.4 + frac), '#ffd447', frac * 0.9); D.sphere(lx, ly, 16, frac > 0.05 ? '#ffe680' : '#d9dde6', { gloss: true }); T(lx, ly + 36, '전구(일 출력)', 12.5, '#26324a', 'center', 800);
    // 상태 표시
    D.label(PCX, PCY + PR + 36, '회전 ' + Math.round(om * 60 / TAU) + ' rpm', { bg: om > 0.05 ? '#14a058' : '#8b97ab', size: PHONE ? 12.5 : 13.5 });
    if (r.st === 'done') { ctx.save(); ctx.translate(PCX + (PHONE ? 60 : 120), PCY + (PHONE ? 80 : 90)); ctx.rotate(-0.2); const ss = 1 + Math.max(0, 0.6 - (S.clock % 100) * 0) * 0; D.roundRect(-52, -22, 104, 44, 8); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 4; ctx.stroke(); T(0, 8, '불가능!', 22, '#e2464b', 'center', 800); ctx.restore(); }
    if (r.st === 'ready') T(16, MH - 12, '✋ 한 번 돌려 주기를 눌러 보세요', 14.5, '#5a6679', 'left', 800);
    parts.update(dt); parts.draw(ctx); endMain();
    // 데이터
    const tt = Math.min(r.t, PERP[k].T), show = r.st !== 'ready', Ek = show ? PERP.E0 * frac * frac : 0, Q = show ? PERP.E0 - Ek : 0;
    drawEBars(RL, '에너지 장부 (J)', [
      { label: '새로 공급한 에너지', color: '#8b97ab', val: 0 },
      { label: '처음 밀어 준 에너지', color: '#a78bfa', val: PERP.E0 },
      { label: '운동 에너지', color: '#3867f4', val: Ek },
      { label: '마찰열(흩어짐)', color: '#e2464b', val: Q },
      { label: '합', color: '#14a058', val: Ek + Q, ghost: PERP.E0 },
    ], 0, PERP.E0 * 1.2, 'J', { labW: 74 });
    drawTable(RR, '영구기관 가동 기록', [
      { h: '기관', w: 1.6, get: (x) => PERP[x.k].name }, { h: '멈출 때까지 걸린 시간', w: 1.4, get: (x) => f1(x.T) + ' s', color: '#c0392b' },
    ], p.rows, 3, '가동하면 정지 시간이 기록돼요');
    T(RR.x + 12, RR.y + RR.h - 12, show ? 't = ' + f1(tt) + ' s · 마찰·공기 저항으로 점점 느려져요' : '발명가의 예상: 영원히 돈다', PHONE ? 12 : 12.5, '#5a6679', 'left', 800);
  }
  const lgSel = [];
  (function buildLg() {
    const box = $('#lgRows');
    LEDG.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + (i + 1) + '. ' + r.who + ': 입력 ' + r.inn + ' J → 일 ' + r.work + ' J + 열 ' + r.heat + ' J</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', r.who + ' 장부 판정');
      sel.innerHTML = '<option value="">판정하기</option><option value="ok">가능 (장부가 맞아요)</option><option value="bad">불가능 (보존 위반)</option>';
      sel.addEventListener('change', () => { S.pp.pick[i] = sel.value || undefined; S.pp.pickOK = {}; sel.classList.remove('ok', 'bad'); Sound.click(); });
      row.appendChild(sel); box.appendChild(row); lgSel.push(sel);
    });
  })();
  function resetLgUI() { lgSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }
  function drawLedgerTable(dt) {
    const p = S.pp;
    T(16, PHONE ? 24 : 30, '📒 에너지 장부에서 모순 찾기', PHONE ? 14 : 17, '#26324a', 'left', 800);
    T(16, PHONE ? 46 : 54, '입력(공급한 에너지)과 출력(일 + 열)의 합은 같아야 해요.', PHONE ? 12 : 13.5, '#5a6679', 'left', 700);
    const top = PHONE ? 62 : 72, rh = (MH - top - 12) / 5, x0 = 14, w = VW - 28;
    const cols = [0, 0.22, 0.4, 0.58, 0.76];
    ['기관', '입력', '일 출력', '열 출력', '출력 합'].forEach((h, i) => T(x0 + w * cols[i] + 8, top + rh / 2 + 4, h, PHONE ? 12 : 13.5, '#5a6679', 'left', 800));
    LEDG.forEach((r, i) => {
      const y = top + (i + 1) * rh;
      D.roundRect(x0, y + 2, w, rh - 4, 8); ctx.fillStyle = p.pickOK[i] === true ? '#e5f7ec' : p.pickOK[i] === false ? '#fdecec' : '#fff'; ctx.fill();
      const tot = r.work + r.heat;
      [r.who, r.inn + ' J', r.work + ' J', r.heat + ' J', tot + ' J'].forEach((s, c) => T(x0 + w * cols[c] + 8, y + rh / 2 + 5, s, PHONE ? 12.5 : 14.5, '#26324a', 'left', 800));
      const pk = p.pick[i];
      if (pk) { const okSel = (pk === 'ok') === r.ok; D.label(x0 + w - (PHONE ? 52 : 70), y + rh / 2, pk === 'ok' ? '가능' : '불가능', { bg: pk === 'ok' ? '#14a058' : '#e2464b', size: 12 }); }
    });
    parts.update(dt); parts.draw(ctx); endMain();
    panel(RL.x, RL.y, RL.w, RL.h, 14);
    T(RL.x + 12, RL.y + 22, '에너지 보존 점검 방법', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let y = RL.y + 46; const bw = RL.w - 28;
    y += textBlock(RL.x + 14, y, bw, '① 출력(일 + 열)이 입력보다 크면 에너지가 새로 생긴 거예요 → 보존 위반', 13.5, '#26324a', 19, 800) + 4;
    y += textBlock(RL.x + 14, y, bw, '② 입력이 0인데 출력이 있으면 → 보존 위반 (1종 영구기관)', 13.5, '#26324a', 19, 800) + 4;
    textBlock(RL.x + 14, y, bw, '③ 입력 = 출력 합이면 가능해요. (버리는 열도 출력에 넣어요.)', 13.5, '#0b6b39', 19, 800);
    panel(RR.x, RR.y, RR.w, RR.h, 14);
    T(RR.x + 12, RR.y + 22, '1종과 2종 영구기관', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let yy = RR.y + 46;
    yy += textBlock(RR.x + 14, yy, RR.w - 28, '제1종: 에너지를 공급받지 않고 계속 일하는 기관 → 에너지 보존 위반', 13.5, '#a3262b', 19, 800) + 4;
    textBlock(RR.x + 14, yy, RR.w - 28, '제2종: 열을 전부 일로 바꾸는(버리는 열이 없는) 기관 → 현실에서는 불가능', 13.5, '#c2410c', 19, 800);
  }
  function drawPp(dt) {
    bgData(); beginMain(); bgMain();
    if (S.pp.sub === 'ledger') drawLedgerTable(dt); else drawPerp(dt);
  }

  /* =====================================================
     ④ 발명 심사
     ===================================================== */
  function resetJd() { S.jd = { pick: {}, ok: {}, sel: 0, stampAt: {} }; updateCtl(); }
  function jRect(i) {
    const cols = PHONE ? 2 : 4, rows = PHONE ? 4 : 2, m = 10, gap = 8, top = PHONE ? 38 : 46;
    const w = (VW - m * 2 - gap * (cols - 1)) / cols, h = (MH - top - m - gap * (rows - 1)) / rows;
    return { x: m + (i % cols) * (w + gap), y: top + Math.floor(i / cols) * (h + gap), w, h };
  }
  function drawJudge(dt) {
    bgData(); beginMain(); bgMain();
    const j = S.jd;
    T(16, PHONE ? 22 : 28, '📝 특허청 심사관이 되어 발명품을 판정해요', PHONE ? 13.5 : 17, '#26324a', 'left', 800);
    JUDGE.forEach((c, i) => {
      const r = jRect(i), pk = j.pick[i], sel = j.sel === i;
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: sel ? 10 : 5, y: 2 });
      if (sel) { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.font = (PHONE ? 24 : 34) + 'px serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(c.icon, r.x + 8, r.y + (PHONE ? 20 : 28)); ctx.textBaseline = 'alphabetic';
      const nl = wrap(c.name, r.w - (PHONE ? 50 : 62), PHONE ? 12 : 13, 800).slice(0, 2);
      nl.forEach((l, k) => T(r.x + (PHONE ? 40 : 52), r.y + (PHONE ? 16 : 24) + k * (PHONE ? 14 : 16), l, PHONE ? 12 : 13, '#26324a', 'left', 800));
      const ln = wrap(c.note, r.w - 16, PHONE ? 11 : 12, 700).slice(0, 3);
      ln.forEach((l, k) => T(r.x + 8, r.y + (PHONE ? 50 : 58) + k * (PHONE ? 13 : 15), l, PHONE ? 11 : 12, '#5a6679', 'left', 700));
      if (pk != null) {
        const age = Math.min(1, (S.clock - (j.stampAt[i] || 0)) / 0.35), sc = 1 + (1 - SciSim.ease.outBack(age)) * 0.9;
        ctx.save(); ctx.translate(r.x + r.w - (PHONE ? 50 : 58), r.y + r.h - (PHONE ? 18 : 20)); ctx.rotate(-0.22); ctx.scale(sc, sc); ctx.globalAlpha = age;
        D.roundRect(-(PHONE ? 40 : 52), -14, PHONE ? 80 : 104, 28, 6); ctx.strokeStyle = JCOL[pk]; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
        T(0, 6, pk === 0 ? '가능' : pk === 1 ? '불가능 1종' : '불가능 2종', PHONE ? 12 : 14, JCOL[pk], 'center', 800); ctx.restore();
      }
      if (j.ok[i] === true) D.check(r.x + r.w - 14, r.y + 14, 9, 1);
    });
    parts.update(dt); parts.draw(ctx); endMain();
    const c = JUDGE[j.sel], pk = j.pick[j.sel];
    panel(RL.x, RL.y, RL.w, RL.h, 14);
    T(RL.x + 12, RL.y + 22, '판정 기준', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let y = RL.y + 44; const bw = RL.w - 28;
    [['가능', '#14a058', '고온과 저온 사이에서 열을 일로 바꾸고, 버리는 열이 있어요.'], ['불가능 · 1종', '#e2464b', '에너지를 공급받지 않고 일해요(에너지 보존 위반).'], ['불가능 · 2종', '#c2410c', '열을 전부 일로 바꿔요(버리는 열이 없어요).']].forEach((q) => { D.label(RL.x + 14, y + 4, q[0], { bg: q[1], size: 12, align: 'left' }); y += PHONE ? 22 : 30; y += textBlock(RL.x + 14, y, bw, q[2], PHONE ? 12 : 13, '#26324a', PHONE ? 15 : 17, 700) + (PHONE ? 2 : 4); });
    panel(RR.x, RR.y, RR.w, RR.h, 14);
    T(RR.x + 12, RR.y + 22, (j.sel + 1) + '번 ' + c.icon + ' ' + c.name, PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let yy = RR.y + 46; yy += textBlock(RR.x + 14, yy, RR.w - 28, c.note, 13.5, '#5a6679', 19, 700) + 6;
    if (j.ok[j.sel] === true) textBlock(RR.x + 14, yy, RR.w - 28, '✅ ' + JOPT[c.ans] + ' — ' + judgeWhy(j.sel), 13.5, '#0b6b39', 19, 800);
    else if (pk != null) textBlock(RR.x + 14, yy, RR.w - 28, '지금 판정: ' + JOPT[pk] + ' (✔ 확인하기로 맞는지 봐요)', 13.5, JCOL[pk], 19, 800);
    else textBlock(RR.x + 14, yy, RR.w - 28, '오른쪽 장치에서 가능 / 불가능(1종·2종)을 골라 도장을 찍어요.', 13, '#5a6679', 18, 700);
  }
  function judgeWhy(i) {
    return ['입력 없이 일을 계속하는 기관이라 에너지 보존에 어긋나요.', '물을 올리는 데 드는 에너지가 물레방아가 내는 일보다 크거나 같아서 계속 일을 더할 수 없어요(에너지 보존 위반).', '바닷물에서 열을 빼앗아 전부 일로 바꾸려면 더 차가운 곳으로 버릴 열이 없어요.', '태양열(고온)과 냉각수·대기(저온)로 열을 흘려 일부를 일로 바꿔요.', '땅속의 뜨거운 열과 지표의 차가운 물·공기 사이에서 열이 흘러요.', '버리는 열이 0이면 열을 전부 일로 바꾸는 것이라 불가능해요.', '영구기관이 아니에요. 마찰로 에너지가 서서히 줄어요.'][i];
  }
  const jdSel = [];
  (function buildJd() {
    const box = $('#jdRows');
    JUDGE.forEach((c, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + (i + 1) + '. ' + c.icon + ' ' + c.name + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', c.name + ' 판정');
      sel.innerHTML = '<option value="">판정하기</option>' + JOPT.map((t, k) => '<option value="' + k + '">' + t + '</option>').join('');
      sel.addEventListener('change', () => { S.jd.pick[i] = sel.value === '' ? undefined : +sel.value; S.jd.ok[i] = undefined; S.jd.sel = i; if (sel.value !== '') S.jd.stampAt[i] = S.clock; sel.classList.remove('ok', 'bad'); Sound.click(); });
      sel.addEventListener('focus', () => { S.jd.sel = i; });
      row.appendChild(sel); box.appendChild(row); jdSel.push(sel);
    });
  })();
  function resetJdUI() { jdSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }

  /* ---------- 컨트롤 연결 ---------- */
  const curSub = () => (S.mode === 'engine' ? (S.en ? S.en.sub : '') : S.mode === 'flow' ? (S.fl ? S.fl.sub : '') : S.mode === 'perp' ? (S.pp ? S.pp.sub : '') : '');
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-sub')) on = n.getAttribute('data-sub').split(' ').indexOf(curSub()) >= 0;
      if (on && n.hasAttribute('data-ein')) on = S.showEIn;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const e = S.en;
    if (e) {
      $$('#enSub button').forEach((b) => b.classList.toggle('on', b.dataset.s === e.sub));
      $$('#heatSeg button').forEach((b) => b.classList.toggle('on', b.dataset.m === e.pMode));
      $$('#stSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.t === e.sTh));
      $$('#condSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.c === '1') === e.tCond));
    }
    const f = S.fl;
    if (f) {
      $$('#flSub button').forEach((b) => b.classList.toggle('on', b.dataset.s === f.sub));
      $('#sW').value = f.W; $('#oW').textContent = f.W + ' J'; $('#sW').style.setProperty('--pct', (f.W / ENG.Wmax * 100) + '%');
    }
    const p = S.pp;
    if (p) {
      $$('#ppSub button').forEach((b) => b.classList.toggle('on', b.dataset.s === p.sub));
      const r = p.run[p.sub], busy = r && r.st === 'go';
      $('#bPp').disabled = !!busy; $('#bPp').textContent = r && r.st === 'done' ? '↺ 다시' : '✋ 한 번 돌려 주기';
      $$('#ppSub button').forEach((b) => (b.disabled = PERPK.some((k) => p.run[k].st === 'go')));
    }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  /* ① */
  $$('#enSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); S.en.sub = b.dataset.s; S.en.pMode = 'hold'; updateCtl(); }));
  $$('#heatSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const e = S.en; if (b.dataset.m === 'heat' && e.pT >= PISTON.Tmax) { showHint('온도가 더 올라가지 않는 한계(' + PISTON.Tmax + ' °C)예요. 식혀 볼까요?'); return; } if (b.dataset.m === 'cool' && e.pT <= PISTON.T0) { showHint('처음 온도(' + PISTON.T0 + ' °C)까지 식었어요.'); return; } e.pMode = b.dataset.m; updateCtl(); }));
  $$('#stSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.en.sTh = +b.dataset.t; updateCtl(); }));
  $$('#condSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.en.tCond = b.dataset.c === '1'; updateCtl(); }));
  /* ② */
  $$('#flSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); S.fl.sub = b.dataset.s; updateCtl(); }));
  $('#sW').addEventListener('input', (e) => { S.fl.W = +e.target.value; updateCtl(); });
  /* ③ */
  $$('#ppSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); S.pp.sub = b.dataset.s; updateCtl(); }));
  $('#bPp').addEventListener('click', () => { parts.clear(); ppGo(); });

  /* ---------- 판독값 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'engine') {
      const e = S.en;
      if (e.sub === 'piston') { L1 = '공기 온도'; a = f1(e.pT) + ' °C'; L2 = '추가 올라간 높이'; b = f1(pLift() * 100) + ' cm'; L3 = '추의 위치 에너지 증가'; c = f2(PISTON.m * G * pLift()) + ' J'; }
      else if (e.sub === 'stirling') { const dK = Math.max(0, e.sTh - STIR.room); L1 = '온도 차'; a = dK + ' °C'; L2 = '회전 속도'; b = Math.round(sRpm()) + ' rpm'; L3 = '아랫면 / 윗면'; c = e.sTh + ' / ' + STIR.room + ' °C'; }
      else { L1 = '냉각수'; a = e.tCond ? 'ON' : 'OFF'; L2 = '터빈 회전'; b = Math.round(e.tV * 100) + ' %'; L3 = '상태'; c = e.tV > 0.5 ? '계속 돌아요' : e.tV < 0.05 ? '멈췄어요' : '느려져요'; }
    } else if (S.mode === 'flow') {
      const f = S.fl;
      if (f.sub === 'flow') { L1 = '일 W'; a = f.W + ' J'; L2 = '버리는 열 Q_c'; b = (ENG.Qh - f.W) + ' J'; L3 = '효율 e'; c = eJ(f.W / ENG.Qh * 100) + ' %'; }
      else { const n = Object.keys(f.rank).filter((k) => f.rank[k]).length; L1 = '순서를 정한 기관'; a = n + ' / ' + ENGINES.length; L2 = '가장 높은 효율'; b = effTxt(ENGINES[4]); L3 = '100 %?'; c = '불가능'; }
    } else if (S.mode === 'perp') {
      const p = S.pp;
      if (p.sub === 'ledger') { const n = Object.keys(p.pick).filter((k) => p.pick[k]).length; L1 = '판정한 장부'; a = n + ' / ' + LEDG.length; L2 = '남은 장부'; b = (LEDG.length - n) + '개'; L3 = '기준'; c = '입력 = 일 + 열'; }
      else { const r = p.run[p.sub], om = r.st === 'ready' ? 0 : ppOmega(p.sub, Math.min(r.t, PERP[p.sub].T)); L1 = '회전 속도'; a = Math.round(om * 60 / TAU) + ' rpm'; L2 = '가동 시간'; b = f1(Math.min(r.t, PERP[p.sub].T)) + ' s'; L3 = '상태'; c = r.st === 'ready' ? '대기' : r.st === 'go' ? '돌아요' : '멈춤'; }
    } else {
      const j = S.jd, n = Object.keys(j.pick).filter((k) => j.pick[k] != null).length, ok = Object.keys(j.ok).filter((k) => j.ok[k] === true).length;
      L1 = '판정한 발명품'; a = n + ' / ' + JUDGE.length; L2 = '맞은 판정'; b = ok + ' / ' + JUDGE.length; L3 = '지금 보는 카드'; c = (j.sel + 1) + '번';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const FIG_FLOW = '<svg viewBox="0 0 320 130" role="img" aria-label="고온 열원에서 열 Q_h를 받은 열기관이 일 W를 내고 나머지 열 Q_c를 저온부로 버리는 그림"><rect x="6" y="40" width="70" height="50" rx="8" fill="#e2552a"/><text x="41" y="62" font-size="12" font-weight="800" fill="#fff" text-anchor="middle">고온</text><text x="41" y="80" font-size="11" fill="#ffe3d6" text-anchor="middle">Q_h</text><path d="M78 65 H112" stroke="#e2552a" stroke-width="12"/><rect x="114" y="30" width="80" height="70" rx="10" fill="#eef2f8" stroke="#8fa3bd" stroke-width="3"/><text x="154" y="70" font-size="13" font-weight="800" fill="#26324a" text-anchor="middle">열기관</text><path d="M196 48 H250" stroke="#14a058" stroke-width="10"/><text x="285" y="52" font-size="13" font-weight="800" fill="#0b6b39" text-anchor="middle">일 W</text><path d="M196 88 H250" stroke="#3867f4" stroke-width="10"/><rect x="252" y="76" width="62" height="24" rx="6" fill="#3867f4"/><text x="283" y="92" font-size="12" font-weight="800" fill="#fff" text-anchor="middle">저온 Q_c</text><text x="160" y="122" font-size="11.5" fill="#a3262b" text-anchor="middle">효율 100 % ⇒ Q_c = 0 ?</text></svg>';
  const levels = [
    {
      title: '열이 하는 일: 열기관의 원리', short: '열이 하는 일', icon: '🔥', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 연료를 한 번만 넣으면 영원히 가는 기계를 만들 수는 없을까? 연료의 열을 100 % 일로 바꾸는 엔진은?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 역학적 에너지가 열로 바뀌는 것을 배웠어요. 이번에는 반대 방향, 즉 <b>열이 역학적 에너지(일)로 바뀌는</b> 과정을 살펴봐요. 통합과학에서 배운 효율(유용한 에너지 ÷ 공급한 에너지)도 다시 써요.</div>' +
        '<p><b>피스톤</b>, <b>스털링 엔진</b>, <b>증기 터빈</b>을 가동해 열이 어떻게 일을 하는지, 그리고 계속 일하려면 무엇이 더 필요한지 알아봐요.</p>',
      features: ['engine'],
      setup() { S.showEIn = false; resetEn(false); setScene('engine'); },
      recap: '열은 역학적 에너지(일)로 바뀔 수 있어요. 열기관이 계속 일하려면 열을 받는 고온부와 열을 버리는 저온부 사이의 온도 차가 필요해요.',
      summary: '<ul><li><b>열기관</b>: 열을 받아 일(역학적 에너지)을 하는 장치. 피스톤은 가열되면 공기가 팽창해 추를 들어 올려요.</li><li><b>스털링 엔진</b>은 아랫면과 윗면의 <b>온도 차</b>로 돌아요. 온도 차가 0이 되면 열이 흐르지 않아 멈춰요. (회전 속도 = 온도 차 × ' + STIR.rpmPerK + ' rpm, 이 모형에서)</li><li><b>증기 터빈</b>은 증기가 고온(보일러) → 저온(응축기)으로 흐르며 터빈을 돌려요. 증기를 식혀 줄 저온부가 없으면 흐름이 막혀 멈춰요.</li><li>그래서 열기관이 계속 일하려면 고온부 외에 <b>열을 버릴 저온부</b>가 꼭 필요해요.</li></ul>',
      missions: [
        {
          title: '가열해서 추 들어 올리기',
          goal: '피스톤 장면에서 공기를 <b>가열</b>해 ' + f1(PISTON.m) + ' kg 추를 처음보다 <b>' + f1(PISTON.lift * 100) + ' cm 이상</b> 들어 올리세요.',
          hint: '🔥 가열을 누르고 공기 온도가 올라가는 것을 기다려요. 피스톤이 ' + f1(PISTON.lift * 100) + ' cm 올라가는 데는 공기 온도가 약 ' + Math.ceil(((PISTON.lift / PISTON.h0 + 1) * (273 + PISTON.T0) - 273)) + ' °C 이상이어야 해요.',
          setup() { S.en.sub = 'piston'; S.en.pMode = 'hold'; setScene('engine'); },
          check: () => S.en.sub === 'piston' && pLift() >= PISTON.lift - 1e-9,
          hold: 0.6,
          status: () => '지금 ' + f1(pLift() * 100) + ' cm 올라갔어요 ' + mark(pLift() >= PISTON.lift - 1e-9) + ' (목표 ' + f1(PISTON.lift * 100) + ' cm)',
          explain: '열을 받은 공기는 팽창해서 피스톤과 추를 밀어 올려요. 열이 <b>추의 위치 에너지(역학적 에너지)</b>로 바뀐 거예요. 식히면 공기가 줄어들어 추가 내려와요. 추가 ' + f1(PISTON.lift * 100) + ' cm 올라가면 위치 에너지는 ' + f1(PISTON.m) + ' × ' + G + ' × ' + PISTON.lift + ' = ' + f2(PISTON.m * G * PISTON.lift) + ' J 늘어요.',
        },
        {
          title: '온도 차를 없애 엔진 멈추기',
          goal: '스털링 엔진이 돌고 있어요. 컵 속 물의 온도를 바꿔 <b>온도 차를 0</b>으로 만들고 엔진이 <b>멈추게</b> 하세요.',
          hint: '윗면의 온도는 ' + STIR.room + ' °C예요. 컵 속 물을 ' + STIR.room + ' °C로 고르면 온도 차가 0이 돼요. 엔진이 완전히 멈출 때까지 잠깐 기다려요.',
          setup() { S.en.sub = 'stirling'; S.en.sTh = 80; S.en.sOmega = (80 - STIR.room) * STIR.rpmPerK * TAU / 60; setScene('engine'); },
          check: () => S.en.sub === 'stirling' && S.en.sTh === STIR.room && sRpm() < 0.5,
          hold: 0.6,
          status: () => '온도 차 ' + Math.max(0, S.en.sTh - STIR.room) + ' °C · 회전 ' + Math.round(sRpm()) + ' rpm ' + mark(S.en.sTh === STIR.room && sRpm() < 0.5),
          explain: '스털링 엔진은 <b>뜨거운 면에서 찬 면으로 열이 흐르는 동안</b> 일을 해요. 온도 차가 0이면 열이 흐르지 않아서 일을 못 하고 멈춰요. 이 모형에서는 온도 차가 클수록 더 빨리 돌아요(온도 차 1 °C당 ' + STIR.rpmPerK + ' rpm).',
        },
        {
          type: 'quiz', title: '열기관이 계속 일하려면?',
          goal: '열기관이 한 번만이 아니라 <b>계속</b> 일하려면 열을 받는 고온부 외에 반드시 필요한 것은?',
          setup() { S.en.sub = 'turbine'; setScene('engine'); },
          choices: ['열을 버릴 더 낮은 온도의 저온부', '더 높은 온도의 두 번째 열원', '끝없이 공급되는 연료', '열이 전혀 새 나가지 않는 완전 단열 용기'],
          answer: 0,
          feedback: ['', '열원이 하나 더 있어도 열을 버릴 곳이 없으면 같은 문제가 생겨요.', '연료가 있어도 증기를 식힐 곳(응축기)이 없으면 터빈이 멈췄어요.', '열이 새 나가지 않으면 오히려 일하고 남은 열이 쌓여서 계속 일할 수 없어요.'],
          explain: '증기 터빈에서 <b>응축기(저온부)</b>를 끄자 터빈이 멈췄어요. 열기관은 고온에서 받은 열 중 일부를 일로 바꾸고, <b>나머지는 저온부로 버려야</b> 계속 순환할 수 있어요.',
        },
      ],
    },
    {
      title: '열 흐름: 일과 버려지는 열', short: '열 흐름', icon: '📊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 열기관은 고온에서 열을 받아 일을 하고 나머지는 저온으로 버린다는 것을 확인했어요. 이제 <b>얼마나</b> 일이 되고 얼마나 버려지는지 수로 따져 봐요. 통합과학의 효율 = 유용한 에너지 ÷ 공급한 에너지예요.</div>' +
        '<p>고온에서 받은 열 <b>Q_h = ' + ENG.Qh + ' J</b>이 일 W와 버리는 열 Q_c로 나뉘어요(Q_h = W + Q_c). <b>효율 e = W ÷ Q_h</b>를 계산하고, 실제 열기관 5종의 효율을 비교해요.</p>',
      features: ['flow'],
      setup() { S.showEIn = false; resetFl(false); resetRkUI(); setScene('flow'); },
      recap: '열기관의 효율 e = W ÷ Q_h는 언제나 100 %보다 작아요. 고온에서 받은 열 중 일부는 늘 저온부로 버려져요.',
      summary: '<ul><li><b>열기관</b>: 고온에서 열 Q_h를 받아 일 W를 하고, 나머지 Q_c를 저온으로 버려요. <b>Q_h = W + Q_c</b></li><li><b>효율</b> e = W ÷ Q_h. 예) Q_h = ' + ENG.Qh + ' J, W = ' + ENG.W0 + ' J, Q_c = ' + (ENG.Qh - ENG.W0) + ' J → e = ' + (ENG.W0 / ENG.Qh * 100) + ' %</li><li>효율은 언제나 <b>100 %보다 작아요</b>(Q_c = 0이 될 수 없어요).</li><li>실제 기관: ' + ENGINES.map((x) => x.name + ' ' + effTxt(x)).join(', ') + '</li><li>효율을 높이는 방법: 마찰 줄이기, 고온 열원을 더 뜨겁게, 저온부를 더 차갑게 (정성적으로). 그래도 100 %는 불가능해요.</li></ul>',
      missions: [
        {
          title: '효율 계산하기', manual: true,
          goal: '일 <b>W를 ' + ENG.W0 + ' J</b>로 맞추고, 열기관의 <b>효율 e(%)</b>를 계산해 입력하세요.',
          hint: '효율 e = W ÷ Q_h = ' + ENG.W0 + ' ÷ ' + ENG.Qh + '이에요. 퍼센트(%)로 나타내려면 100을 곱해요.',
          setup() { S.fl.sub = 'flow'; S.fl.W = 0; S.showEIn = true; $('#eInput').value = ''; $('#eInput').classList.remove('bad'); S.lastE = null; updateCtl(); setScene('flow'); },
          check() {
            if (S.fl.W !== ENG.W0) return '먼저 일 W 슬라이더를 ' + ENG.W0 + ' J로 맞춰요. (지금 ' + S.fl.W + ' J)';
            const v = num($('#eInput').value);
            if (!isFinite(v)) return '효율을 숫자(%)로 입력해요.';
            const want = S.fl.W / ENG.Qh * 100;
            if (Math.abs(v - want) > 0.5) {
              if (S.lastE !== v) { S.lastE = v; $('#eInput').classList.remove('bad'); void $('#eInput').offsetWidth; $('#eInput').classList.add('bad'); }
              return Math.abs(v - want / 100) < 0.005 ? '0.3은 소수예요. 퍼센트로 바꾸려면 100을 곱해요.' : '다시 계산해 보세요. 효율 e = W ÷ Q_h = ' + ENG.W0 + ' ÷ ' + ENG.Qh + ' 이에요.';
            }
            $('#eInput').classList.remove('bad'); return true;
          },
          status: () => mark(S.fl.W === ENG.W0) + ' W = ' + ENG.W0 + ' J (지금 ' + S.fl.W + ' J → Q_c ' + (ENG.Qh - S.fl.W) + ' J)',
          explain: 'Q_h = ' + ENG.Qh + ' J, W = ' + ENG.W0 + ' J이면 Q_c = ' + ENG.Qh + ' − ' + ENG.W0 + ' = ' + (ENG.Qh - ENG.W0) + ' J이고, 효율 e = ' + ENG.W0 + ' ÷ ' + ENG.Qh + ' = 0.30 → <b>' + (ENG.W0 / ENG.Qh * 100) + ' %</b>예요. 받은 열의 70 %는 버려져요.',
        },
        {
          title: '열기관 5종의 효율 순서', manual: true,
          goal: '<b>5가지 열기관</b>을 효율이 <b>낮은 것부터 높은 것까지</b> 1~5번째로 순서를 매기고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '막대가 짧을수록 효율이 낮아요. 증기 기관차 < 가솔린 < 디젤 < 석탄 화력 < 복합 화력 순이에요.',
          setup() { S.fl.sub = 'compare'; S.fl.rank = {}; S.fl.rankOK = {}; resetRkUI(); updateCtl(); setScene('flow'); },
          check() {
            const miss = ENGINES.filter((e, i) => !S.fl.rank[i]);
            if (miss.length) return '아직 순서를 고르지 않은 기관이 ' + miss.length + '개 있어요.';
            const used = new Set(Object.values(S.fl.rank));
            if (used.size < ENGINES.length) return '같은 순서를 두 번 골랐어요. 1~5번째를 한 번씩만 써요.';
            let bad = 0;
            rkSel.forEach(([ei, sel]) => { const ok = S.fl.rank[ei] === ei + 1; if (!ok) bad++; if (!ok && S.fl.rankOK[ei] !== false) { sel.classList.remove('ok', 'bad'); void sel.offsetWidth; sel.classList.add('bad'); } if (ok) { sel.classList.remove('bad'); sel.classList.add('ok'); } S.fl.rankOK[ei] = ok; });
            if (bad) return '빨간 칸을 다시 확인해요. 막대 길이와 오른쪽 숫자를 비교해 보세요.';
            return true;
          },
          status: () => '순서를 정한 기관 ' + Object.keys(S.fl.rank).filter((k) => S.fl.rank[k]).length + ' / ' + ENGINES.length,
          explain: '효율 순서는 ' + ENGINES.map((e) => e.name + '(' + effTxt(e) + ')').join(' < ') + '이에요. 가장 좋은 복합 화력도 40 % 이상을 버리는 열로 내보내요.',
        },
        {
          type: 'quiz', title: '왜 효율 100 %는 안 될까?',
          goal: '효율이 100 %가 되려면 버리는 열 <b>Q_c = 0</b>이어야 해요. 그런데 열기관에서 이것이 불가능한 까닭은?',
          figure: FIG_FLOW,
          setup() { S.showEIn = false; S.fl.sub = 'flow'; updateCtl(); setScene('flow'); },
          choices: ['일을 많이 하면 Q_h가 저절로 줄어들기 때문에', '열은 더 뜨거운 곳에서 더 차가운 곳으로 흘러야 일을 할 수 있어서, 열을 받으면 일부는 저온부로 버려야 하기 때문에', '저온부가 없으면 오히려 효율이 200 %가 되기 때문에', '마찰이 없는 기관은 만들 수 있지만 너무 비싸기 때문에'],
          answer: 1,
          feedback: ['Q_h는 열원에서 받은 열이에요. 일을 많이 한다고 저절로 줄어들지 않아요.', '', '효율은 100 %를 넘을 수 없어요(그러면 에너지가 새로 생겨요).', '마찰을 완전히 없애도 저온부로 버려야 하는 열은 남아요. 비용 문제가 아니에요.'],
          explain: '열기관은 열이 <b>고온 → 저온으로 흐르는 동안</b> 그중 일부를 일로 바꿔요. 열을 받으려면 더 차가운 곳으로 흘려보내야 해서 <b>Q_c는 0이 될 수 없고</b>, 효율은 언제나 100 %보다 작아요.',
        },
      ],
    },
    {
      title: '영구기관은 왜 안 될까?', short: '영구기관', icon: '♾️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 열기관은 늘 열을 버리고 효율은 100 %보다 작다는 것을 확인했어요. 그렇다면 연료를 한 번만 넣거나 <b>한 번 돌려 주면 영원히 도는 기계(영구기관)</b>는 가능할까요? 발명가들의 주장을 에너지 장부로 따져 봐요.</div>' +
        '<p>자석 바퀴, 물레방아–펌프, 불균형 바퀴를 가동해 보고, 에너지 장부에서 <b>입력이 0인데 출력이 있는</b> 모순을 찾아요. 예상(영원히 돈다)과 실제 측정이 다른 까닭도 생각해 봐요.</p>',
      features: ['perp'],
      setup() { resetPp(false); resetLgUI(); setScene('perp'); },
      recap: '영구기관은 마찰로 에너지가 열이 되어 흩어져 멈추고, 에너지가 새로 생길 수도 없어요. 입력 없이 계속 일하는 기관은 에너지 보존에 어긋나요.',
      summary: '<ul><li><b>제1종 영구기관</b>: 에너지를 공급받지 않고 계속 일하는 기관 → 에너지가 새로 생기므로 불가능(에너지 보존 위반)</li><li>실제로 가동하면 마찰·공기 저항으로 운동 에너지가 열로 바뀌어 속력이 줄다가 멈춰요. (자석 바퀴 ' + f1(PERP.magnet.T) + ' s, 물레방아–펌프 ' + f1(PERP.mill.T) + ' s, 불균형 바퀴 ' + f1(PERP.wheel.T) + ' s 후 정지)</li><li><b>에너지 장부</b>: 입력 = 일 + 열. 입력이 0인데 출력이 있거나, 출력 합이 입력보다 크면 불가능해요.</li><li>이유 두 가지: ① 에너지는 새로 생기지 않는다 ② 마찰로 열이 되어 흩어진다</li></ul>',
      missions: [
        {
          title: '세 영구기관 가동하고 정지 시간 기록하기',
          goal: '<b>자석 바퀴 · 물레방아–펌프 · 불균형 바퀴</b>를 각각 ✋ 한 번 돌려 주고, 멈출 때까지 지켜보며 <b>정지 시간</b>을 기록하세요. 영원히 돌 거라는 예상과 달라요!',
          hint: '위의 기관 버튼을 고르고 ✋ 한 번 돌려 주기를 눌러요. 기관마다 멈추는 데 걸리는 시간이 달라요.',
          setup() { S.pp.sub = 'magnet'; updateCtl(); setScene('perp'); },
          check: () => PERPK.every((k) => S.pp.rows.some((r) => r.k === k)),
          hold: 0.6,
          status: () => PERPK.map((k) => mark(S.pp.rows.some((r) => r.k === k)) + PERP[k].name).join(' &nbsp; '),
          explain: '세 기관 모두 <b>예상(영원히 돈다)과 달리 멈췄어요</b>: ' + PERPK.map((k) => PERP[k].name + ' ' + f1(PERP[k].T) + ' s').join(', ') + '. 마찰과 공기 저항 때문에 운동 에너지가 열로 바뀌어 흩어졌고, 새로 공급되는 에너지는 없었기 때문이에요. 처음 밀어 준 ' + PERP.E0 + ' J이 모두 열이 되면 멈춰요.',
        },
        {
          title: '에너지 장부에서 모순 찾기', manual: true,
          goal: '네 가지 장부 중 <b>에너지 보존에 어긋나는 것(불가능)</b>과 <b>가능한 것</b>을 판정하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '입력 = 일 + 열이면 가능해요. 입력이 0인데 출력이 있거나 출력 합이 입력보다 크면 불가능해요.',
          setup() { S.pp.sub = 'ledger'; S.pp.pick = {}; S.pp.pickOK = {}; resetLgUI(); updateCtl(); setScene('perp'); },
          check() {
            const miss = LEDG.filter((r, i) => !S.pp.pick[i]);
            if (miss.length) return '아직 판정하지 않은 장부가 ' + miss.length + '개 있어요.';
            let bad = 0;
            LEDG.forEach((r, i) => { const ok = (S.pp.pick[i] === 'ok') === r.ok; if (!ok) bad++; if (!ok && S.pp.pickOK[i] !== false) { lgSel[i].classList.remove('ok', 'bad'); void lgSel[i].offsetWidth; lgSel[i].classList.add('bad'); } if (ok) { lgSel[i].classList.remove('bad'); lgSel[i].classList.add('ok'); } S.pp.pickOK[i] = ok; });
            if (bad) return '빨간 칸을 다시 확인해요. 입력과 (일 + 열)을 비교해 보세요.';
            return true;
          },
          status: () => '판정한 장부 ' + LEDG.filter((r, i) => S.pp.pick[i]).length + ' / ' + LEDG.length,
          explain: LEDG.map((r) => r.who + ': 입력 ' + r.inn + ' J, 출력 ' + (r.work + r.heat) + ' J → ' + (r.ok ? '<b>가능</b>' : '<b>불가능</b>')).join(' / ') + '. 입력이 0인데 일을 하는 자석 바퀴(제1종)와 입력보다 출력이 큰 경우는 에너지가 새로 생긴 것이라 불가능해요.',
        },
        {
          type: 'quiz', title: '영구기관이 불가능한 이유',
          goal: '영구기관이 <b>불가능한 이유</b>로 가장 알맞은 설명은?',
          setup() { S.pp.sub = 'ledger'; updateCtl(); setScene('perp'); },
          choices: ['에너지는 새로 생기지 않고, 마찰로 일부가 열이 되어 흩어지기 때문에', '아직 좋은 재료와 정밀한 기술이 없기 때문에', '자석이나 물의 힘이 너무 약하기 때문에', '일은 에너지가 아니기 때문에'],
          answer: 0,
          feedback: ['', '재료와 기술이 좋아져도 에너지가 새로 생기지는 않아요. 원리상의 문제예요.', '힘이 아무리 세도 입력 없이 에너지를 계속 내놓을 수는 없어요.', '일은 에너지가 이동·전환되는 양이에요. 일을 하면 에너지가 줄어요.'],
          explain: '두 가지 이유예요. <b>① 에너지는 새로 생기지 않아요</b>(입력 없이 출력만 있는 기관은 에너지 보존 위반). <b>② 마찰이 있으면 에너지가 열이 되어 흩어져</b> 결국 멈춰요. 마찰을 아무리 줄여도 일을 꺼내 쓰는 만큼 에너지가 줄어들어요.',
        },
      ],
    },
    {
      title: '발명 심사: 가능할까, 불가능할까?', short: '발명 심사', icon: '📝', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 영구기관이 불가능한 두 가지 이유(에너지 보존 위반, 열을 전부 일로 바꿀 수 없음)를 알아봤어요. 이제 <b>특허청 심사관</b>이 되어 발명품 7개를 판정해 봐요.</div>' +
        '<p>각 카드에 <b>가능 / 불가능 · 1종 / 불가능 · 2종</b> 중 알맞은 것을 골라 도장을 찍어요. 1종은 에너지를 공급받지 않고 일하는 기관, 2종은 열을 전부 일로 바꾸는(버리는 열이 없는) 기관이에요.</p>',
      features: ['judge'],
      setup() { resetJd(); resetJdUI(); setScene('judge'); },
      recap: '고온과 저온 사이에서 열 일부를 일로 바꾸는 장치는 가능하고, 입력 없이 일하는 기관(1종)이나 열을 전부 일로 바꾸는 기관(2종)은 불가능해요.',
      summary: '<ul><li>불가능: 자석 영구 바퀴·물레방아–펌프(<b>1종</b>, 에너지 보존 위반), 바닷물 열 배·효율 100 % 엔진(<b>2종</b>, 열을 전부 일로)</li><li>가능: 태양열 터빈, 지열 발전 (고온 열원과 저온부 사이에서 열을 흘려 일부를 일로 바꿔요)</li><li>플라이휠 저장은 영구기관이 아니에요. 마찰로 에너지가 서서히 줄어요.</li><li>전기 자동차 회생 제동도 운동 에너지의 일부만 되찾아요. 나머지는 열로 흩어져요.</li></ul>',
      missions: [
        {
          title: '발명품 7개 판정하기', manual: true,
          goal: '발명품 카드 <b>7개</b>를 <b>가능 / 불가능 · 1종 / 불가능 · 2종</b>으로 판정하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '입력 없이 일을 하면 1종, 버리는 열이 없이 열을 전부 일로 바꾸면 2종이에요. 고온과 저온 사이에서 열이 흐르며 일부만 일이 되면 가능해요.',
          setup() { setScene('judge'); updateCtl(); },
          check() {
            const miss = JUDGE.filter((c, i) => S.jd.pick[i] == null);
            if (miss.length) return '아직 판정하지 않은 발명품이 ' + miss.length + '개 있어요.';
            let bad = 0;
            JUDGE.forEach((c, i) => { const ok = S.jd.pick[i] === c.ans; if (!ok) bad++; if (!ok && S.jd.ok[i] !== false) { jdSel[i].classList.remove('ok', 'bad'); void jdSel[i].offsetWidth; jdSel[i].classList.add('bad'); } if (ok) { jdSel[i].classList.remove('bad'); jdSel[i].classList.add('ok'); } S.jd.ok[i] = ok; });
            if (bad) return '빨간 칸을 다시 생각해 보세요. 에너지를 공급받나요? 버리는 열이 있나요?';
            return true;
          },
          status: () => '판정한 발명품 ' + JUDGE.filter((c, i) => S.jd.pick[i] != null).length + ' / ' + JUDGE.length,
          explain: JUDGE.map((c, i) => c.icon + ' ' + c.name + ': <b>' + JOPT[c.ans].split(' (')[0] + '</b>').join(' / ') + '. 1종은 에너지 보존에, 2종은 “열을 전부 일로 바꿀 수 없다”는 사실에 어긋나요.',
        },
        {
          type: 'quiz', title: '회생 제동은 영구기관일까?',
          goal: '전기 자동차는 브레이크를 밟을 때 운동 에너지의 일부를 전기로 되찾아 배터리에 저장해요(회생 제동). 이것은 <b>영구기관</b>일까요?',
          setup() { setScene('judge'); },
          choices: ['영구기관이다. 에너지를 되찾아 계속 달릴 수 있기 때문에', '영구기관이 아니다. 운동 에너지의 일부만 되찾고 나머지는 열 등으로 흩어져서, 계속 달리려면 에너지를 다시 공급해야 하기 때문에', '영구기관이 아니다. 전기는 에너지가 아니기 때문에', '영구기관이다. 마찰이 전혀 없기 때문에'],
          answer: 1,
          feedback: ['되찾는 양은 쓴 에너지의 일부일 뿐이에요. 나머지가 열로 흩어져서 결국 멈춰요.', '', '전기도 에너지예요. 되찾은 양이 처음보다 작다는 점이 핵심이에요.', '현실의 장치에는 늘 마찰과 열 손실이 있어요.'],
          explain: '회생 제동은 에너지를 <b>일부만 되찾아</b> 효율을 높이는 장치예요. 되찾은 에너지는 처음 운동 에너지보다 작고, 나머지는 열이 되어 흩어지므로 영구기관이 아니에요. 열효율을 높이는 현실적인 방법은 마찰을 줄이고, 고온 열원을 더 뜨겁게, 저온부를 더 차갑게 하는 것이에요(그래도 100 %는 불가능해요).',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-heat-engine', mount: '#game', badge: '특허 심사관', homeHref: '../../index.html#hp',
    featureLabels: { engine: '🔥 피스톤 · 스털링 엔진 · 증기 터빈', flow: '📊 에너지 흐름도 · 효율 · 기관 5종', perp: '♾️ 영구기관 3종 · 에너지 장부', judge: '📝 발명품 심사 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  view.canvas.addEventListener('click', (ev) => {
    if (S.mode === 'perp') { const r = S.pp.run[S.pp.sub]; if (r && r.st === 'ready') ppGo(); }
    else if (S.mode === 'judge') { const p = view.toLocal(ev); for (let i = 0; i < JUDGE.length; i++) { const r = jRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { S.jd.sel = i; jdSel[i].focus({ preventScroll: true }); Sound.click(); } } }
  });

  /* ---------- 시작 ---------- */
  resetEn(false); resetFl(false); resetPp(false); resetJd();
  setScene('engine');
  let lastFree = false, lastKey = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    const key = [S.mode, S.en.sub, S.en.pMode, S.pp.sub, PERPK.map((k) => S.pp.run[k].st).join(','), S.fl.sub].join('|');
    if (key !== lastKey) { lastKey = key; updateCtl(); }
    view.apply();
    if (S.mode === 'engine') { stepEn(dt); drawEn(dt); }
    else if (S.mode === 'flow') { drawFl(dt); }
    else if (S.mode === 'perp') { stepPp(dt); drawPp(dt); }
    else { drawJudge(dt); }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, resetEn, resetFl, resetPp, resetJd, ppGo, updateCtl, LEDG, JUDGE, ENGINES, pLift, sRpm, stepEn, stepPp,
    stepAll(sec) {
      const n = Math.ceil(sec / 0.02);
      for (let i = 0; i < n; i++) { if (S.mode === 'engine') stepEn(0.02); else if (S.mode === 'perp') stepPp(0.02); }
      updateCtl();
    },
  };
})();
