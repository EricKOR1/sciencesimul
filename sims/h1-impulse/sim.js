/* =========================================================
   통합과학1 Ⅲ. 시스템과 상호작용 - 충격량과 운동량 (단원 8차시)
   성취기준 [10통과1-03-04] 상호작용이 없을 때 물체가 가속되지 않음을 알고, 충격량과 운동량의 관계를 충돌 관련 안전장치와
   스포츠에 적용할 수 있다. (충격량과 운동량의 관계, 안전장치 부분)
   ① 관찰: 충격 느끼기 (달걀 낙하, 힘 센서 그래프)
   ② 탐구: 충격량=운동량 (충돌 수레, 힘–시간 그래프의 넓이)
   ③ 분석: 시간과 힘 (Δp 고정, 충돌 시간을 늘리면 평균 힘이 줄어요)
   ④ 적용: 안전장치 설계 (허용 한계 힘 6000 N 이하로 만들기, 스포츠)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 620 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const G = 9.8;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const nf = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

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
  function bgFill(top, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function stepSub(total, hmax, fn) { const n = Math.max(1, Math.ceil(total / hmax)); const h = total / n; for (let i = 0; i < n; i++) fn(h); }

  /* ---------- 상태 ---------- */
  const S = { mode: 'egg', clock: 0, fade: 0, eg: null, ct: null, tm: null, ds: null, showMatch: false, match: {}, matchOK: {} };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { egg: '🥚 충격 느끼기', cart: '⚖️ 충격량 측정', time: '⏱️ 시간과 힘', design: '🛡️ 안전장치 설계' };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-match')) on = S.showMatch;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (S.eg) $$('#floorSeg button').forEach((b) => b.classList.toggle('on', b.dataset.floor === S.eg.floor));
    if (S.ct) { $$('#massSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.m === S.ct.m)); $('#oSpeed').textContent = S.ct.v + ' m/s'; }
    if (S.tm) {
      $('#oDt').textContent = (S.tm.ms / 1000).toFixed(2) + ' s';
      $$('#presetSeg button').forEach((b) => b.classList.toggle('on', Math.round(+b.dataset.p * 1000) === S.tm.ms));
      const sl = $('#sDt'); if (Math.round(+sl.value * 1000) !== S.tm.ms) sl.value = (S.tm.ms / 1000).toFixed(2);
      sl.style.setProperty('--pct', ((S.tm.ms - 10) / 490 * 100) + '%');
      $('#dtMinus').disabled = S.tm.ms <= 10; $('#dtPlus').disabled = S.tm.ms >= 500;
    }
    if (S.ds) { $$('#devChips button').forEach((b) => b.classList.toggle('on', !!S.ds.dev[b.dataset.dev])); $('#oCush').textContent = S.ds.cush + ' cm'; }
    $('#bDrop').disabled = !!(S.eg && S.eg.st !== 'idle');
    $('#bMeasure').disabled = !!(S.ct && S.ct.st !== 'idle' && S.ct.st !== 'done');
    $('#bTimeRun').disabled = !!(S.tm && S.tm.run && S.tm.run.st === 'run');
    $('#bTest').disabled = !!(S.ds && S.ds.run && S.ds.run.st === 'run');
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ================= ① 달걀 낙하 ================= */
  const EM = 0.06, EH = 1.0, EV = Math.sqrt(2 * G * EH), BREAK_N = 30;
  const FLK = ['concrete', 'cushion', 'sponge'];
  const FL = {
    concrete: { name: '콘크리트', dt: 0.004, thick: 0.2, color: '#8e96a5', curve: '#e2464b' },
    cushion: { name: '방석', dt: 0.02, thick: 0.08, color: '#e8728a', curve: '#f59e0b' },
    sponge: { name: '스펀지', dt: 0.05, thick: 0.18, color: '#f4d35e', curve: '#14a058' },
  };
  const fPeak = (k) => Math.PI * EM * EV / (2 * FL[k].dt);
  const EPPM = PHONE ? 125 : 280, EFX = PHONE ? 130 : 190, EFY = PHONE ? 232 : 500;
  const EGX0 = PHONE ? 62 : 446, EGX1 = PHONE ? 458 : 772, EGY0 = PHONE ? 292 : 64, EGY1 = PHONE ? 420 : 300;
  const surfTop = (k) => EFY - FL[k].thick * EPPM;
  function resetEgg(floor) {
    const prev = S.eg;
    S.eg = { floor: floor || (prev ? prev.floor : 'concrete'), st: 'idle', t: 0, h: EH, v: 0, p: 0, broken: false, fmax: 0, rec: prev ? prev.rec : {}, splat: 0 };
    updateCtl();
  }
  function dropEgg() { const e = S.eg; if (e.st !== 'idle') return; e.st = 'fall'; e.t = 0; Sound.click(); updateCtl(); }
  function setEggFloor(f) { if (S.eg.floor === f && S.eg.st === 'idle') return; resetEgg(f); }
  const eggS = (k, p) => (EV * FL[k].dt / 2) * (p + Math.sin(Math.PI * p) / Math.PI);   // 달걀이 눌린 깊이 (m)
  const eggV = (p) => EV / 2 * (1 + Math.cos(Math.PI * p));
  const eggF = (k, p) => fPeak(k) * Math.sin(Math.PI * p);
  function stepEgg(dt) {
    const e = S.eg;
    if (e.st === 'fall') {
      e.t += dt; e.h = EH - 0.5 * G * e.t * e.t; e.v = G * e.t;
      if (e.h <= 0) { e.h = 0; e.v = EV; e.st = 'contact'; e.p = 0; e.fmax = 0; Sound.tick(); }
    } else if (e.st === 'contact') {
      e.p = Math.min(1, e.p + dt / (RM ? 0.3 : 1.5));
      e.v = eggV(e.p);
      const F = eggF(e.floor, e.p); if (F > e.fmax) e.fmax = F;
      if (!e.broken && F > BREAK_N) { e.broken = true; Sound.fail(); const x = EFX, y = surfTop(e.floor) - 14; parts.burst(x, y, { count: 18, speed: 150, size: 3.2, colors: ['#ffd447', '#fff', '#fff3b0'], gravity: 260, life: 0.8, shape: 'circle' }); }
      if (e.p >= 1) {
        e.st = 'done'; e.v = 0;
        e.rec[e.floor] = { dt: FL[e.floor].dt, fp: fPeak(e.floor), broken: e.fmax > BREAK_N };
        if (!e.broken) { Sound.success(); parts.burst(EFX, surfTop(e.floor) - 40, { count: 14, speed: 130, size: 3.4, colors: ['#ffb400', '#3867f4', '#14a058'], gravity: 160 }); }
        updateCtl();
      }
    }
    if (e.broken) e.splat = Math.min(1, e.splat + dt * 4);
  }
  function drawEgg(x, y, w, h, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.scale(o.sx || 1, o.sy || 1);
    D.shadow(() => { ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); ctx.fillStyle = '#fbe9cf'; ctx.fill(); }, { blur: 6, y: 2 });
    const g = ctx.createRadialGradient(-w * 0.18, -h * 0.22, 2, 0, 0, h * 0.6); g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(230,190,140,.55)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(160,110,60,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  function drawSurface(k, dent) {
    const f = FL[k], top = surfTop(k), w = PHONE ? 190 : 250, x0 = EFX - w / 2;
    ctx.fillStyle = '#6f7a8c'; ctx.fillRect(x0 - 30, EFY, w + 60, 16);                // 힘 센서 판
    T(x0 + w + 26, EFY + 12, '힘 센서', 12, '#5a6679', 'right', 800);
    ctx.save();
    if (k === 'concrete') {
      D.roundRect(x0, top, w, f.thick * EPPM, 4); const g = ctx.createLinearGradient(0, top, 0, EFY); g.addColorStop(0, '#aab2c0'); g.addColorStop(1, '#7c8596'); ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = 'rgba(80,90,105,.35)'; for (let i = 0; i < 22; i++) { ctx.beginPath(); ctx.arc(x0 + 10 + (i * 37) % (w - 20), top + 8 + (i * 53) % (f.thick * EPPM - 14), 1.6 + (i % 3) * 0.6, 0, TAU); ctx.fill(); }
    } else {
      const th = f.thick * EPPM, col = f.color;
      ctx.beginPath(); ctx.moveTo(x0, EFY); ctx.lineTo(x0, top + 6);
      ctx.quadraticCurveTo(x0, top, x0 + 12, top);
      const dx = (PHONE ? 18 : 24);
      ctx.lineTo(EFX - dx * 2.2, top); ctx.quadraticCurveTo(EFX - dx, top, EFX, top + dent); ctx.quadraticCurveTo(EFX + dx, top, EFX + dx * 2.2, top);
      ctx.lineTo(x0 + w - 12, top); ctx.quadraticCurveTo(x0 + w, top, x0 + w, top + 6); ctx.lineTo(x0 + w, EFY); ctx.closePath();
      const g = ctx.createLinearGradient(0, top, 0, EFY); g.addColorStop(0, C.shade(col, 0.25)); g.addColorStop(1, C.shade(col, -0.2)); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = C.shade(col, -0.35); ctx.lineWidth = 2; ctx.stroke();
      if (k === 'sponge') { ctx.fillStyle = 'rgba(160,120,0,.35)'; for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.ellipse(x0 + 8 + (i * 41) % (w - 16), top + 8 + (i * 29) % (th - 12), 3.2, 2.2, 0, 0, TAU); ctx.fill(); } }
      if (k === 'cushion') { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x0 + 6, top + th / 2); ctx.lineTo(x0 + w - 6, top + th / 2); ctx.stroke(); ctx.setLineDash([]); }
    }
    ctx.restore();
  }
  function drawEggScene(dt) {
    const e = S.eg, f = FL[e.floor];
    bgFill('#e9f0fb', '#f6f9fe');
    // 눈금: 높이 1.0 m
    const top = surfTop(e.floor), eh = PHONE ? 26 : 38, ew = eh * 0.74;
    const startY = top - EH * EPPM;      // 달걀 바닥의 처음 높이
    ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    const rx = EFX + (PHONE ? 90 : 120); ctx.beginPath(); ctx.moveTo(rx, top); ctx.lineTo(rx, startY); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(rx - 6, top); ctx.lineTo(rx + 6, top); ctx.moveTo(rx - 6, startY); ctx.lineTo(rx + 6, startY); ctx.stroke();
    T(rx - 8, (top + startY) / 2 + 4, '높이 1.0 m', 13, '#3a465c', 'right', 800);
    // 집게(손)
    if (e.st === 'idle') { ctx.fillStyle = '#9aa5b8'; D.roundRect(EFX - 22, startY - eh - 22, 44, 14, 5); ctx.fill(); ctx.fillRect(EFX - 3, startY - eh - 10, 6, 10); }
    // 바닥
    let dent = 0, cy;
    if (e.st === 'idle') cy = startY - eh / 2;
    else if (e.st === 'fall') cy = top - e.h * EPPM - eh / 2;
    else { const s = eggS(e.floor, e.p) * EPPM; cy = top + s - eh / 2; dent = e.floor === 'concrete' ? 0 : s; }
    if (e.floor !== 'concrete') dent = e.st === 'contact' || e.st === 'done' ? eggS(e.floor, e.st === 'done' ? 1 : e.p) * EPPM : 0;
    drawSurface(e.floor, dent);
    // 달걀
    if (e.broken && e.splat > 0.3) {
      const sx = EFX, sy = top - 3 + (e.floor === 'concrete' ? 0 : dent * 0);
      ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.ellipse(sx, sy - 2, 46 * e.splat, 7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffc533'; ctx.beginPath(); ctx.ellipse(sx - 6, sy - 6, 15 * e.splat, 6, 0, 0, TAU); ctx.fill();
      T(sx, sy - 40, '💥 깨졌어요!', 16, '#c0392b', 'center', 800);
    } else {
      const sq = e.st === 'contact' ? 1 - 0.08 * Math.sin(Math.PI * e.p) : 1;
      drawEgg(EFX, cy, ew, eh, { sy: sq, sx: 1 + (1 - sq) * 0.6 });
      if (e.broken) { ctx.strokeStyle = '#7a4a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(EFX - 4, cy - 10); ctx.lineTo(EFX + 1, cy - 2); ctx.lineTo(EFX - 3, cy + 4); ctx.lineTo(EFX + 5, cy + 12); ctx.stroke(); }
    }
    // 속도 화살표 / 힘 화살표
    if (e.st === 'fall' && e.v > 0.1) D.arrow(EFX - 40, cy, EFX - 40, cy + Math.min(70, e.v * 15), { color: '#14a058', width: 4, label: e.v.toFixed(1) + ' m/s', labelOffset: -28 });
    if (e.st === 'contact') {
      const F = eggF(e.floor, e.p), len = clamp(F / 120 * (PHONE ? 70 : 110), 0, PHONE ? 70 : 110);
      if (len > 3) D.arrow(EFX + 30, cy + eh / 2 + 8, EFX + 30, cy + eh / 2 + 8 - len, { color: '#e2464b', width: 5, label: F.toFixed(0) + ' N', labelOffset: 26 });
      D.label(PHONE ? 340 : EFX, PHONE ? 20 : 96, '🐌 충돌 순간 슬로모션', { bg: '#26324a', size: 13 });
      T(EFX, PHONE ? 52 : 70, '속도 ' + e.v.toFixed(1) + ' m/s', 15, '#14a058', 'center', 800);
    }
    T(16, PHONE ? 24 : 30, '🥚 ' + f.name + '에 떨어뜨리기', PHONE ? 15 : 18, '#26324a', 'left', 800);
    if (e.st === 'idle') T(16, PHONE ? 44 : 52, '달걀 60 g · 높이 1.0 m → 충돌 직전 속도 ' + EV.toFixed(1) + ' m/s', PHONE ? 12 : 13.5, '#5a6679', 'left', 700);
    drawForceGraph(e);
    drawEggTable(e);
    parts.update(dt); parts.draw(ctx);
  }
  function drawForceGraph(e) {
    const x0 = EGX0, x1 = EGX1, y0 = EGY0, y1 = EGY1;
    panel(x0 - 50, y0 - 36, x1 - x0 + 66, y1 - y0 + 78, 16);
    const gx = (ms) => x0 + (x1 - x0) * ms / 60, gy = (F) => y1 - (y1 - y0) * F / 120;
    ctx.lineWidth = 1;
    for (let F = 0; F <= 120; F += 20) { ctx.strokeStyle = F === 0 ? '#516079' : 'rgba(120,135,160,.22)'; ctx.lineWidth = F === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(x0, gy(F)); ctx.lineTo(x1, gy(F)); ctx.stroke(); T(x0 - 8, gy(F) + 5, String(F), 12.5, '#3a465c', 'right', 800); }
    for (let ms = 0; ms <= 60; ms += 10) { ctx.strokeStyle = 'rgba(120,135,160,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(ms), y0); ctx.lineTo(gx(ms), y1); ctx.stroke(); T(gx(ms), y1 + 18, String(ms), 12.5, '#3a465c', 'center', 800); }
    T(x1, y1 + 38, '충돌하는 동안의 시간 (ms)', 12.5, '#3a465c', 'right', 800);
    T(x0 - 44, y0 - 14, '힘 센서 (N)', 12.5, '#3a465c', 'left', 800);
    ctx.strokeStyle = '#e2464b'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x0, gy(BREAK_N)); ctx.lineTo(x1, gy(BREAK_N)); ctx.stroke(); ctx.setLineDash([]);
    T(x1 - 4, gy(BREAK_N) - 5, '깨지는 한계 30 N', 12, '#c0392b', 'right', 800);
    const draw = (k, pmax, alpha) => {
      const f = FL[k], dtm = f.dt * 1000, fp = fPeak(k), n = 60;
      ctx.beginPath(); ctx.moveTo(gx(0), gy(0));
      for (let i = 0; i <= n * pmax; i++) { const p = i / n; ctx.lineTo(gx(p * dtm), gy(fp * Math.sin(Math.PI * p))); }
      const pe = pmax; ctx.lineTo(gx(pe * dtm), gy(fp * Math.sin(Math.PI * pe)));
      ctx.strokeStyle = f.curve; ctx.lineWidth = 3.5; ctx.globalAlpha = alpha; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.lineTo(gx(pe * dtm), gy(0)); ctx.closePath(); ctx.fillStyle = C.rgba(f.curve, 0.16); ctx.fill(); ctx.globalAlpha = 1;
    };
    FLK.forEach((k) => { if (e.rec[k] && !(e.floor === k && e.st !== 'idle' && e.st !== 'done')) draw(k, 1, e.floor === k ? 1 : 0.75); });
    if (e.st === 'contact') draw(e.floor, e.p, 1);
    if (e.st === 'contact') { const f = FL[e.floor]; const cx = gx(e.p * f.dt * 1000), cy = gy(eggF(e.floor, e.p)); D.sphere(cx, cy, 5, f.curve, { gloss: false }); }
    // 범례
    FLK.forEach((k, i) => { const lx = x0 + 8 + i * (PHONE ? 100 : 106), ly = y0 + 14; ctx.fillStyle = FL[k].curve; D.roundRect(lx, ly - 8, 16, 6, 3); ctx.fill(); T(lx + 20, ly, FL[k].name, 12.5, '#3a465c', 'left', 800); });
  }
  function drawEggTable(e) {
    const x = PHONE ? 12 : 420, y = PHONE ? 478 : 352, w = PHONE ? VW - 24 : 360, rh = PHONE ? 30 : 36, hh = 28;
    panel(x, y, w, hh + rh * 3 + 8, 14);
    const cols = [x + 14, x + w * 0.30, x + w * 0.52, x + w * 0.77];
    ['바닥', '충돌 시간', '최대 힘', '결과'].forEach((h, i) => T(cols[i], y + 20, h, 12.5, '#5a6679', 'left', 800));
    FLK.forEach((k, i) => {
      const yy = y + hh + 4 + i * rh, r = e.rec[k], cur = e.floor === k;
      if (cur) { D.roundRect(x + 5, yy, w - 10, rh - 2, 8); ctx.fillStyle = 'rgba(242,107,58,.12)'; ctx.fill(); }
      D.roundRect(cols[0], yy + rh / 2 - 7, 8, 14, 2); ctx.fillStyle = FL[k].curve; ctx.fill();
      T(cols[0] + 14, yy + rh / 2 + 5, FL[k].name, PHONE ? 13 : 14.5, '#26324a', 'left', 800);
      T(cols[1], yy + rh / 2 + 5, r ? Math.round(r.dt * 1000) + ' ms' : '?', PHONE ? 13 : 14.5, r ? '#26324a' : '#98a2b3', 'left', 800);
      T(cols[2], yy + rh / 2 + 5, r ? Math.round(r.fp) + ' N' : '?', PHONE ? 13 : 14.5, r ? '#c0392b' : '#98a2b3', 'left', 800);
      T(cols[3], yy + rh / 2 + 5, r ? (r.broken ? '깨짐' : '안 깨짐') : '?', PHONE ? 13 : 14.5, r ? (r.broken ? '#c0392b' : '#0b6b39') : '#98a2b3', 'left', 800);
    });
    if (FLK.every((k) => e.rec[k])) {
      const yy = y + hh + rh * 3 + 14;
      if (!PHONE) { D.roundRect(x, yy, w, 52, 12); ctx.fillStyle = '#fff4d6'; ctx.fill(); textBlock(x + 12, yy + 22, w - 24, '세 바닥 모두 달걀의 속도는 4.4 m/s → 0 m/s로 같지만, 멈추는 시간이 짧을수록 힘이 커요!', 13.5, '#7a4b00', 19, 800); }
    }
  }
  $$('#floorSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); setEggFloor(b.dataset.floor); }));
  $('#bDrop').addEventListener('click', dropEgg);
  $('#bEggReset').addEventListener('click', () => { Sound.click(); parts.clear(); resetEgg(); });

  /* ================= ② 충돌 수레: 충격량 = 운동량 변화 ================= */
  const CDT = 0.05, CD0 = 2.4;
  const CPPM = PHONE ? 120 : 210, CGY = PHONE ? 150 : 190, CWX = PHONE ? VW - 56 : VW - 112, CBUMP = 0.14 * CPPM;
  const CGX0 = PHONE ? 56 : 66, CGX1 = PHONE ? 456 : 470, CGY0 = PHONE ? 250 : 272, CGY1 = PHONE ? 380 : 500;
  const cartP = (m, v) => m * v;
  function resetCart(keepRows) {
    const prev = S.ct;
    S.ct = { m: prev ? prev.m : 1, v: prev ? prev.v : 2, st: 'idle', x: 0, p: 0, rows: keepRows && prev ? prev.rows : [], area: 0, F: 0, k: 0, F0: [0], cum: [0] };
    updateCtl();
  }
  function cartFp(c) { return Math.PI * c.m * c.v / (2 * CDT); }
  function measure() {
    const c = S.ct;
    if (c.st !== 'idle' && c.st !== 'done') return;
    c.area = 0; c.F = 0; c.k = 0; c.cum = [0]; c.p = 0; Sound.click();
    if (c.st === 'done') { c.st = 'back'; c.x = CD0; } else { c.st = 'move'; c.x = 0; }
    updateCtl();
  }
  function stepCart(dt) {
    const c = S.ct;
    if (c.st === 'back') {
      c.x -= CD0 / 0.5 * dt;
      if (c.x <= 0) { c.x = 0; c.st = 'move'; }
    } else if (c.st === 'move') {
      c.x += c.v * dt;
      if (c.x >= CD0) { c.x = CD0; c.st = 'contact'; c.p = 0; Sound.tick(); }
    } else if (c.st === 'contact') {
      c.p = Math.min(1, c.p + dt / (RM ? 0.3 : 1.6));
      const fp = cartFp(c);
      c.F = fp * Math.sin(Math.PI * c.p);
      // 1 ms 간격 측정값 (사다리꼴 넓이)
      const kk = Math.floor(c.p * 50 + 1e-9);
      while (c.k < kk) { c.k++; const f1 = fp * Math.sin(Math.PI * (c.k - 1) / 50), f2 = fp * Math.sin(Math.PI * c.k / 50); c.cum.push(c.cum[c.cum.length - 1] + (f1 + f2) / 2 * 0.001); }
      c.area = c.cum[c.cum.length - 1];
      if (c.p >= 1) {
        c.st = 'done'; c.F = 0;
        const row = { m: c.m, v: c.v, dp: cartP(c.m, c.v), area: c.area };
        c.rows.push(row); if (c.rows.length > 12) c.rows.shift();
        Sound.success(); parts.burst(CWX - CBUMP, CGY - 30, { count: 12, speed: 120, size: 3, colors: ['#ffb400', '#14a058', '#3867f4'], gravity: 160 });
        updateCtl();
      }
    }
  }
  const cartS = (c, p) => (c.v * CDT / 2) * (p + Math.sin(Math.PI * p) / Math.PI);
  function drawCartScene(dt) {
    const c = S.ct;
    bgFill('#e9f0fb', '#f6f9fe');
    // 바닥·벽
    ctx.fillStyle = '#c3ccd8'; ctx.fillRect(0, CGY, VW, 18); ctx.fillStyle = '#97a3b5'; ctx.fillRect(0, CGY, VW, 4);
    D.shadow(() => { ctx.fillStyle = '#7a8599'; ctx.fillRect(CWX, CGY - 118, 34, 136); }, { blur: 6, y: 2 });
    // 힘 센서 표시창
    D.roundRect(CWX + 2, CGY - 112, 30, 58, 6); ctx.fillStyle = '#1f2937'; ctx.fill();
    T(CWX + 17, CGY - 94, '센서', 10.5, '#9ae6b4', 'center', 800); T(CWX + 17, CGY - 74, Math.round(c.F) + '', 13, '#9ae6b4', 'center', 800); T(CWX + 17, CGY - 60, 'N', 10.5, '#9ae6b4', 'center', 800);
    // 점토 범퍼 (수레가 누르는 만큼 줄어듦)
    const sm = c.st === 'contact' ? cartS(c, c.p) : c.st === 'done' ? cartS(c, 1) : 0;
    const press = sm * CPPM;
    D.roundRect(CWX - CBUMP + press, CGY - 54, CBUMP - press + 2, 44, 6); ctx.fillStyle = '#d98f5a'; ctx.fill(); ctx.strokeStyle = '#a8663a'; ctx.lineWidth = 2; ctx.stroke();
    // 수레
    const cw = PHONE ? 62 : 100, chh = PHONE ? 28 : 44;
    const front = CWX - CBUMP + (c.st === 'back' ? 0 : press) - (c.st === 'move' || c.st === 'back' ? (CD0 - c.x) * CPPM : 0) - (c.st === 'idle' ? CD0 * CPPM : 0);
    const cx = front - cw / 2;
    D.shadow(() => { D.roundRect(cx - cw / 2, CGY - 14 - chh, cw, chh, 7); ctx.fillStyle = '#f26b3a'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(cx - cw / 2 + 5, CGY - 14 - chh + 4, cw - 10, 4);
    [cx - cw * 0.3, cx + cw * 0.3].forEach((wx) => { ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.arc(wx, CGY - 8, 8, 0, TAU); ctx.fill(); ctx.fillStyle = '#9aa5b8'; ctx.beginPath(); ctx.arc(wx, CGY - 8, 3, 0, TAU); ctx.fill(); });
    if (c.m >= 1) { D.roundRect(cx - cw * 0.3, CGY - 14 - chh - (PHONE ? 16 : 24), cw * 0.6, PHONE ? 16 : 24, 4); ctx.fillStyle = '#6b7a99'; ctx.fill(); }
    T(cx, CGY - 14 - chh / 2 + 5, c.m.toFixed(1) + ' kg', PHONE ? 11 : 13.5, '#fff', 'center', 800);
    const vNow = c.st === 'idle' || c.st === 'move' ? c.v : c.st === 'contact' ? c.v * (1 + Math.cos(Math.PI * c.p)) / 2 : 0;
    if (vNow > 0.02) D.arrow(cx, CGY - 14 - chh - (c.m >= 1 ? (PHONE ? 26 : 34) : 12), cx + vNow * (PHONE ? 15 : 24), CGY - 14 - chh - (c.m >= 1 ? (PHONE ? 26 : 34) : 12), { color: '#14a058', width: 5, label: vNow.toFixed(1) + ' m/s', labelOffset: -16 });
    if (c.st === 'contact') D.label(VW - (PHONE ? 80 : 100), 24, '🐌 충돌 순간 슬로모션', { bg: '#26324a', size: 12.5 });
    T(16, PHONE ? 24 : 32, '⚖️ ' + c.m.toFixed(1) + ' kg 수레가 ' + c.v + ' m/s로 달려가요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    drawCartGraph(c);
    drawCartTable(c);
    parts.update(dt); parts.draw(ctx);
  }
  function drawCartGraph(c) {
    const x0 = CGX0, x1 = CGX1, y0 = CGY0, y1 = CGY1, FM = 140;
    panel(x0 - 50, y0 - 40, x1 - x0 + 66, y1 - y0 + 84, 16);
    const gx = (ms) => x0 + (x1 - x0) * ms / 100, gy = (F) => y1 - (y1 - y0) * F / FM;
    for (let F = 0; F <= FM; F += 20) { ctx.strokeStyle = F === 0 ? '#516079' : 'rgba(120,135,160,.22)'; ctx.lineWidth = F === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(x0, gy(F)); ctx.lineTo(x1, gy(F)); ctx.stroke(); T(x0 - 8, gy(F) + 5, String(F), 12.5, '#3a465c', 'right', 800); }
    for (let ms = 0; ms <= 100; ms += 10) { ctx.strokeStyle = 'rgba(120,135,160,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(ms), y0); ctx.lineTo(gx(ms), y1); ctx.stroke(); T(gx(ms), y1 + 18, String(ms), 12.5, '#3a465c', 'center', 800); }
    T(x1, y1 + 38, '시간 (ms)', 12.5, '#3a465c', 'right', 800); T(x0 - 44, y0 - 18, '힘 (N)', 12.5, '#3a465c', 'left', 800);
    const fp = cartFp(c), pe = c.st === 'contact' ? c.p : c.st === 'done' ? 1 : 0;
    if (pe > 0) {
      const n = 50, kk = Math.floor(pe * n + 1e-9);
      ctx.beginPath(); ctx.moveTo(gx(0), gy(0));
      for (let i = 0; i <= kk; i++) ctx.lineTo(gx(i / n * CDT * 1000), gy(fp * Math.sin(Math.PI * i / n)));
      ctx.lineTo(gx(pe * CDT * 1000), gy(fp * Math.sin(Math.PI * pe)));
      ctx.lineTo(gx(pe * CDT * 1000), gy(0)); ctx.closePath(); ctx.fillStyle = 'rgba(242,107,58,.28)'; ctx.fill();
      ctx.beginPath(); for (let i = 0; i <= kk; i++) { const X = gx(i / n * CDT * 1000), Y = gy(fp * Math.sin(Math.PI * i / n)); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); } ctx.lineTo(gx(pe * CDT * 1000), gy(fp * Math.sin(Math.PI * pe)));
      ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.stroke();
      if (c.st === 'contact') D.sphere(gx(pe * CDT * 1000), gy(fp * Math.sin(Math.PI * pe)), 5, '#e2552a', { gloss: false });
    }
    // 넓이와 운동량 변화
    const dpNow = c.m * c.v;
    const bx = x0 + 8, by = y0 + 4;
    if (pe > 0) {
      const rx0 = gx(54), rw = x1 - rx0 - 4;
      D.roundRect(rx0, by - 2, rw, 74, 10); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill(); ctx.strokeStyle = '#e8ecf4'; ctx.lineWidth = 1.5; ctx.stroke();
      T(rx0 + 8, by + 16, '넓이 F×Δt', 12.5, '#5a6679', 'left', 800); T(rx0 + 8, by + 34, c.area.toFixed(2) + ' N·s', PHONE ? 14 : 15.5, '#c2410c', 'left', 800);
      T(rx0 + 8, by + 52, 'mΔv = ' + dpNow.toFixed(2) + ' kg·m/s', 12.5, '#26324a', 'left', 800);
      if (c.st === 'done') T(rx0 + rw - 8, by + 34, c.area.toFixed(2) === dpNow.toFixed(2) ? '=' : '≠', 22, '#14a058', 'right', 800);
      else T(rx0 + 8, by + 68, '', 1, '#000');
    } else T(bx + 4, by + 16, '📏 측정하기를 누르면 힘–시간 그래프가 그려져요', PHONE ? 12 : 13.5, '#5a6679', 'left', 700);
  }
  function drawCartTable(c) {
    const x = PHONE ? 12 : 508, y = PHONE ? 432 : 262, w = PHONE ? VW - 24 : 276, rh = PHONE ? 26 : 34, hh = 40;
    const nrows = PHONE ? 4 : 6;
    panel(x, y, w, hh + rh * nrows + 10, 14);
    const cw = w / 4;
    ['질량(kg)', '속력(m/s)', '운동량 변화 mΔv', '넓이 FΔt'].forEach((h, i) => { const hl = wrap(h.replace(' ', '\n'), cw - 4, 11.5, 800); hl.forEach((l, j) => T(x + cw * i + cw / 2, y + 16 + j * 14, l, 11.5, '#5a6679', 'center', 800)); });
    const rows = c.rows.slice(-nrows);
    rows.forEach((r, i) => {
      const yy = y + hh + i * rh + rh / 2 + 5;
      T(x + cw * 0.5, yy, r.m.toFixed(1), 14, '#26324a', 'center', 800); T(x + cw * 1.5, yy, String(r.v), 14, '#26324a', 'center', 800);
      T(x + cw * 2.5, yy, r.dp.toFixed(2), 14, '#26324a', 'center', 800); T(x + cw * 3.5, yy, r.area.toFixed(2), 14, '#c2410c', 'center', 800);
    });
    if (!rows.length) T(x + w / 2, y + hh + 36, '아직 측정한 기록이 없어요', 13.5, '#98a2b3', 'center', 700);
  }
  $$('#massSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ct.m = +b.dataset.m; S.ct.st = 'idle'; S.ct.x = 0; S.ct.p = 0; parts.clear(); updateCtl(); }));
  $('#sSpeed').addEventListener('input', (e) => { S.ct.v = +e.target.value; e.target.style.setProperty('--pct', ((S.ct.v - 1) / 3 * 100) + '%'); S.ct.st = 'idle'; S.ct.x = 0; S.ct.p = 0; parts.clear(); updateCtl(); });
  $('#bMeasure').addEventListener('click', measure);
  $('#bCartClear').addEventListener('click', () => { Sound.click(); parts.clear(); resetCart(false); });

  /* ================= ③ 시간과 힘 ================= */
  const DP = 900, DM = 60, DV = 15;     // 사람 60 kg, 15 m/s → 운동량 변화 900 kg·m/s
  const TSPP = PHONE ? 30 : 60, TGY = PHONE ? 176 : 238, TWX = VW - (PHONE ? 26 : 56);
  const HGX0 = PHONE ? 62 : 74, HGX1 = VW - (PHONE ? 20 : 34), HGY0 = PHONE ? 256 : 318, HGY1 = PHONE ? 500 : 500;
  const FMAXG = 20000;
  const forceOf = (ms) => DP / (ms / 1000);
  function resetTime(ms) {
    const prev = S.tm;
    S.tm = { ms: ms != null ? ms : (prev ? prev.ms : 50), run: null, ran: {} };
    S.tm.run = { st: 'idle', p: 0, t: 0, ms: S.tm.ms };
    updateCtl();
  }
  function setDt(ms) {
    ms = clamp(Math.round(ms), 10, 500);
    if (S.tm.ms === ms) return;
    S.tm.ms = ms; S.tm.run = { st: 'idle', p: 0, t: 0, ms }; parts.clear(); updateCtl();
  }
  function timeRun() {
    const r = S.tm.run; if (r.st === 'run') return;
    S.tm.run = { st: 'run', phase: 'approach', p: 0, t: 0, ms: S.tm.ms }; Sound.click(); updateCtl();
  }
  function stepTime(dt) {
    const r = S.tm.run; if (!r || r.st !== 'run') return;
    if (r.phase === 'approach') { r.t += dt; if (r.t >= (RM ? 0.2 : 0.8)) { r.phase = 'contact'; r.p = 0; Sound.tick(); } }
    else {
      r.p = Math.min(1, r.p + dt / (RM ? 0.3 : 1.8));
      if (r.p >= 1) { r.st = 'done'; S.tm.ran[r.ms] = true; Sound.success(); updateCtl(); }
    }
  }
  function drawSled(x, y, p, ms, o) {
    // x: 인형의 앞쪽 끝(썰매 앞), y: 바닥
    const sw = PHONE ? 54 : 140, sh = PHONE ? 8 : 20;
    D.shadow(() => { D.roundRect(x - sw, y - sh, sw, sh, 4); ctx.fillStyle = '#5b7bd6'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#3b57a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - sw - 4, y - 1); ctx.lineTo(x + 4, y - 1); ctx.stroke();
    const u = PHONE ? 0.5 : 1.45;
    const bx = x - sw * 0.42;
    ctx.strokeStyle = '#3b4a68'; ctx.lineWidth = 11 * u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx - 14 * u, y - sh - 6 * u); ctx.lineTo(bx + 18 * u, y - sh - 6 * u); ctx.lineTo(bx + 20 * u, y - sh + 10 * u); ctx.stroke();
    ctx.strokeStyle = '#f2873a'; ctx.lineWidth = 18 * u; ctx.beginPath(); ctx.moveTo(bx - 14 * u, y - sh - 8 * u); ctx.lineTo(bx - 14 * u + (o && o.lean || 0), y - sh - 50 * u); ctx.stroke();
    ctx.strokeStyle = '#f0c6a0'; ctx.lineWidth = 6 * u; ctx.beginPath(); ctx.moveTo(bx - 14 * u + (o && o.lean || 0), y - sh - 42 * u); ctx.lineTo(bx + 18 * u, y - sh - 28 * u); ctx.stroke();
    D.sphere(bx - 12 * u + (o && o.lean || 0), y - sh - 62 * u, 11 * u, '#f3cfa8', { gloss: false });
    ctx.fillStyle = '#2b2150'; ctx.beginPath(); ctx.arc(bx - 8 * u + (o && o.lean || 0), y - sh - 64 * u, 2.2, 0, TAU); ctx.fill();
  }
  function drawTimeScene(dt) {
    const r = S.tm.run, ms = r.ms, d = 7.5 * ms / 1000;                  // 멈추는 거리 (m) = 평균 속력(7.5 m/s) × 시간
    bgFill('#eaf1fb', '#f7faff');
    ctx.fillStyle = '#c3ccd8'; ctx.fillRect(0, TGY, VW, PHONE ? 14 : 20); ctx.fillStyle = '#97a3b5'; ctx.fillRect(0, TGY, VW, 3);
    // 벽 + 쿠션
    D.shadow(() => { ctx.fillStyle = '#7a8599'; ctx.fillRect(TWX, TGY - (PHONE ? 70 : 130), PHONE ? 20 : 34, PHONE ? 78 : 150); }, { blur: 6, y: 2 });
    const cth = 1.25 * d * TSPP, cf0 = TWX - cth;                       // 쿠션 앞면 처음 위치
    const sNow = r.st === 'idle' ? 0 : r.phase === 'approach' && r.st === 'run' ? 0 : (r.st === 'done' ? d : d * (2 * r.p - r.p * r.p));
    const front = cf0 + sNow * TSPP;
    const apD = (PHONE ? 70 : 150), appr = r.st === 'idle' ? 1 : r.st === 'done' ? 0 : (r.phase === 'approach' ? 1 - SciSim.ease.inOutQuad(clamp(r.t / 0.8, 0, 1)) : 0);
    const frontX = front - apD * appr;
    // 쿠션
    const chh = PHONE ? 54 : 100;
    D.roundRect(front, TGY - chh, TWX - front, chh, 6); const cg = ctx.createLinearGradient(front, 0, TWX, 0); cg.addColorStop(0, '#7cc4ff'); cg.addColorStop(1, '#4a93d8'); ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = '#2f6fb0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5; for (let x = front + 8; x < TWX - 4; x += 12) { ctx.beginPath(); ctx.moveTo(x, TGY - chh + 6); ctx.lineTo(x, TGY - 6); ctx.stroke(); }
    // 인형
    const lean = r.st === 'run' && r.phase === 'contact' ? Math.min(1, r.p * 3) * (PHONE ? 3 : 10) : (r.st === 'done' ? (PHONE ? 3 : 10) : 0);
    drawSled(frontX, TGY, r.p, ms, { lean });
    // 거리 표시 (멈추는 거리)
    if (r.st === 'run' && r.phase === 'contact' || r.st === 'done') {
      const by = PHONE ? TGY - chh - 14 : TGY - 170;
      ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cf0, by); ctx.lineTo(front, by); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cf0, by - 6); ctx.lineTo(cf0, by + 6); ctx.moveTo(front, by - 6); ctx.lineTo(front, by + 6); ctx.stroke();
      ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cf0, by + 6); ctx.lineTo(cf0, TGY - chh); ctx.moveTo(front, by + 6); ctx.lineTo(front, TGY - (PHONE ? 40 : 60)); ctx.stroke(); ctx.setLineDash([]);
      D.label(clamp((cf0 + front) / 2, 90, VW - 90), by - 16, '멈추는 거리 ' + (sNow).toFixed(2) + ' m', { bg: '#7c5cff', size: PHONE ? 11.5 : 13 });
    }
    // 화살표
    const vNow = r.st === 'idle' ? DV : r.st === 'done' ? 0 : r.phase === 'approach' ? DV : DV * (1 - r.p);
    const ay = TGY - (PHONE ? 76 : 150);
    if (vNow > 0.1) D.arrow(frontX - (PHONE ? 50 : 100), ay, frontX - (PHONE ? 50 : 100) + vNow * (PHONE ? 5 : 8), ay, { color: '#14a058', width: 5, label: vNow.toFixed(1) + ' m/s', labelOffset: -16 });
    if (r.st === 'run' && r.phase === 'contact') {
      const F = forceOf(ms), len = clamp(F / FMAXG * (PHONE ? 90 : 160), 10, PHONE ? 90 : 160);
      D.arrow(frontX + (PHONE ? 6 : 14), TGY - (PHONE ? 30 : 56), frontX + (PHONE ? 6 : 14) - len, TGY - (PHONE ? 30 : 56), { color: '#e2464b', width: 6, label: '평균 힘 ' + nf(F) + ' N', labelOffset: -18 });
      D.label(VW - (PHONE ? 80 : 100), 24, '🐌 충돌 순간 슬로모션', { bg: '#26324a', size: 12.5 });
    }
    T(16, PHONE ? 24 : 30, '⏱️ 멈추는 데 ' + (ms / 1000).toFixed(2) + ' s', PHONE ? 15 : 18, '#26324a', 'left', 800);
    T(16, PHONE ? 42 : 52, '60 kg 인형 · 15 m/s → 0 · 운동량 변화 900 kg·m/s', PHONE ? 11.5 : 13.5, '#5a6679', 'left', 700);
    drawHyper(ms);
    parts.update(dt); parts.draw(ctx);
  }
  function drawHyper(ms) {
    const x0 = HGX0, x1 = HGX1, y0 = HGY0, y1 = HGY1;
    panel(x0 - 66, y0 - 38, x1 - x0 + 84, y1 - y0 + 84, 16);
    const gx = (s) => x0 + (x1 - x0) * s / 0.5, gy = (F) => y1 - (y1 - y0) * F / FMAXG;
    for (let F = 0; F <= FMAXG; F += 5000) { ctx.strokeStyle = F === 0 ? '#516079' : 'rgba(120,135,160,.22)'; ctx.lineWidth = F === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(x0, gy(F)); ctx.lineTo(x1, gy(F)); ctx.stroke(); T(x0 - 8, gy(F) + 5, nf(F), 12, '#3a465c', 'right', 800); }
    for (let s = 0; s <= 0.5001; s += 0.1) { ctx.strokeStyle = 'rgba(120,135,160,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(s), y0); ctx.lineTo(gx(s), y1); ctx.stroke(); T(gx(s), y1 + 18, s.toFixed(1), 12.5, '#3a465c', 'center', 800); }
    T(x1, y1 + 38, '충돌 시간 Δt (s)', 12.5, '#3a465c', 'right', 800); T(x0 - 60, y0 - 16, '평균 힘 F (N)', 12.5, '#3a465c', 'left', 800);
    // 반 (처음의 절반) 목표선
    ctx.strokeStyle = '#14a058'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, gy(9000)); ctx.lineTo(x1, gy(9000)); ctx.stroke(); ctx.setLineDash([]);
    T(x1 - 4, gy(9000) - 5, '9 000 N (0.05 s일 때의 절반)', 12, '#0b6b39', 'right', 800);
    // 쌍곡선
    ctx.beginPath(); let first = true;
    for (let s = 0.045; s <= 0.5001; s += 0.002) { const X = gx(s), Y = gy(DP / s); if (first) { ctx.moveTo(X, Y); first = false; } else ctx.lineTo(X, Y); }
    ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.stroke();
    // 충격량 직사각형 (F × Δt = 900 N·s)
    const s = ms / 1000, F = DP / s, Fc = Math.min(F, FMAXG);
    D.roundRect(x0, gy(Fc), gx(s) - x0, gy(0) - gy(Fc), 2); ctx.fillStyle = 'rgba(242,107,58,.22)'; ctx.fill(); ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 2; ctx.stroke();
    const mx = gx(s), my = gy(Fc);
    ctx.strokeStyle = 'rgba(226,85,42,.7)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, gy(0)); ctx.stroke(); ctx.setLineDash([]);
    D.glow(mx, my, 16, '#f26b3a', 0.5); D.sphere(mx, my, 7, '#f26b3a', { gloss: false });
    const lab = F > FMAXG ? '↑ ' + nf(F) + ' N' : nf(F) + ' N';
    D.label(clamp(mx + 8, x0 + 60, x1 - 60), clamp(my - 18, y0 + 12, y1 - 20), lab, { bg: '#e2552a', size: 13 });
    // 같은 넓이
    const bw = gx(s) - x0;
    const rh2 = gy(0) - gy(Fc);
    if (bw > 150 && rh2 > 30) T(x0 + bw / 2, gy(Fc) + rh2 / 2 + 4, '넓이 F×Δt = 900 N·s', PHONE ? 12 : 13.5, '#9a3412', 'center', 800);
    else if (bw > 56 && rh2 > 46) { T(x0 + bw / 2, gy(Fc) + rh2 / 2 - 2, '넓이', 12, '#9a3412', 'center', 800); T(x0 + bw / 2, gy(Fc) + rh2 / 2 + 14, '900 N·s', 12, '#9a3412', 'center', 800); }
    else T(mx + 14, gy(0) - 10, '넓이 900 N·s', 12.5, '#9a3412', 'left', 800);
  }
  $('#sDt').addEventListener('input', (e) => { Sound.tick(); setDt(+e.target.value * 1000); });
  $('#dtMinus').addEventListener('click', () => { Sound.click(); setDt(S.tm.ms - 10); });
  $('#dtPlus').addEventListener('click', () => { Sound.click(); setDt(S.tm.ms + 10); });
  $$('#presetSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setDt(+b.dataset.p * 1000); }));
  $('#bTimeRun').addEventListener('click', timeRun);

  /* ---------- 시간이 길어지는 방법 연결 (3단계) ---------- */
  const MECH = ['벨트가 늘어나서', '차체가 찌그러져서', '완충재가 눌려서', '매트가 푹 꺼져서', '무릎을 굽혀 몸이 내려가서'];
  const MATCH = [['🪢 안전벨트', 0], ['🚗 자동차 범퍼·차체', 1], ['⛑️ 헬멧', 2], ['🤸 낙하 매트', 3], ['🦵 무릎을 굽혀 착지', 4]];
  const matchSel = [];
  MATCH.forEach((m, i) => {
    const row = document.createElement('div'); row.className = 'sel-row';
    row.innerHTML = '<div class="q">' + m[0] + ': 충돌(멈추는) 시간이 길어지는 까닭</div>';
    const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', m[0] + '가 시간을 길게 하는 방법');
    sel.innerHTML = '<option value="">— 고르기 —</option>' + MECH.map((o, j) => '<option value="' + j + '">' + o + '</option>').join('');
    sel.addEventListener('change', () => { S.match[i] = sel.value; sel.classList.remove('ok', 'bad'); delete S.matchOK[i]; Sound.click(); });
    row.appendChild(sel); $('#matchRows').appendChild(row); matchSel.push(sel);
  });
  function resetMatch() { S.match = {}; S.matchOK = {}; matchSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }

  /* ================= ④ 안전장치 설계 ================= */
  const LIMIT_N = 6000, BASE_MS = 30, DEV_MS = { belt: 40, bag: 60, crumple: 80 }, DEV_NAME = { belt: '안전벨트 늘어짐', bag: '에어백', crumple: '크럼플 존' }, DEV_COL = { belt: '#3b82f6', bag: '#f59e0b', crumple: '#14a058' };
  const CUSH_MS = 2;                    // 쿠션 1 cm당 늘어나는 시간 (ms)
  const DPPM = PHONE ? 62 : 100, DGY = PHONE ? 196 : 250, DWX = VW - (PHONE ? 22 : 40);
  function designMs(ds) { return BASE_MS + (ds.dev.belt ? DEV_MS.belt : 0) + (ds.dev.bag ? DEV_MS.bag : 0) + (ds.dev.crumple ? DEV_MS.crumple : 0) + ds.cush * CUSH_MS; }
  const designF = (ms) => 900000 / ms;
  const designKey = (ds) => [ds.dev.belt ? 1 : 0, ds.dev.bag ? 1 : 0, ds.dev.crumple ? 1 : 0, ds.cush].join('');
  function resetDesign() {
    const prev = S.ds;
    S.ds = { dev: prev ? prev.dev : {}, cush: prev ? prev.cush : 0, run: { st: 'idle', p: 0, t: 0 }, tested: null, result: null };
    updateCtl();
  }
  function designChanged() { S.ds.run = { st: 'idle', p: 0, t: 0 }; parts.clear(); updateCtl(); }
  function toggleDev(k) {
    const ds = S.ds, n = Object.keys(ds.dev).filter((x) => ds.dev[x]).length;
    if (!ds.dev[k] && n >= 2) { SciSim.toast('장치는 최대 2가지까지 고를 수 있어요. 하나를 빼고 골라 보세요.', 'bad'); Sound.fail(); return; }
    ds.dev[k] = !ds.dev[k]; if (!ds.dev[k]) delete ds.dev[k]; Sound.click(); designChanged();
  }
  function runDesign() {
    const ds = S.ds; if (ds.run.st === 'run') return;
    const ms = designMs(ds);
    ds.run = { st: 'run', phase: 'approach', p: 0, t: 0, ms, F: designF(ms), key: designKey(ds), dev: Object.assign({}, ds.dev), cush: ds.cush, hit: false };
    Sound.click(); updateCtl();
  }
  function stepDesign(dt) {
    const r = S.ds.run; if (!r || r.st !== 'run') return;
    if (r.phase === 'approach') { r.t += dt; if (r.t >= (RM ? 0.2 : 0.9)) { r.phase = 'contact'; r.p = 0; Sound.tick(); } }
    else {
      r.p = Math.min(1, r.p + dt / (RM ? 0.3 : 2.0));
      if (r.p >= 1) {
        r.st = 'done';
        const pass = r.F <= LIMIT_N; S.ds.tested = r.key; S.ds.result = { pass, ms: r.ms, F: r.F };
        if (pass) { Sound.success(); parts.burst(VW / 2, 120, { count: 26, speed: 200, size: 3.6, colors: ['#ffb400', '#3867f4', '#14a058', '#e2464b'], gravity: 200 }); } else Sound.fail();
        updateCtl();
      }
    }
  }
  function drawCrashCar(ox, comp, rel, r) {
    // ox: 자동차 뒤쪽 끝 위치. 길이 4.2 m, 앞쪽 1.0 m가 크럼플 영역
    const L = 4.2 * DPPM, y = DGY, H = 1.5 * DPPM;
    const crumple = r.dev.crumple, front = ox + L - comp * DPPM;
    // 바퀴
    [ox + 0.9 * DPPM, ox + 3.2 * DPPM - comp * DPPM * 0.8].forEach((wx) => { ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.arc(wx, y - 0.32 * DPPM, 0.32 * DPPM, 0, TAU); ctx.fill(); ctx.fillStyle = '#aeb8c8'; ctx.beginPath(); ctx.arc(wx, y - 0.32 * DPPM, 0.14 * DPPM, 0, TAU); ctx.fill(); });
    // 차체
    const cabinEnd = ox + 2.9 * DPPM;
    ctx.beginPath(); ctx.moveTo(ox, y - 0.3 * DPPM); ctx.lineTo(ox, y - 0.85 * DPPM); ctx.lineTo(ox + 0.5 * DPPM, y - 0.95 * DPPM); ctx.lineTo(ox + 0.9 * DPPM, y - H); ctx.lineTo(ox + 2.1 * DPPM, y - H); ctx.lineTo(cabinEnd, y - 0.95 * DPPM);
    const hoodY = y - 0.9 * DPPM;
    // 후드(크럼플 영역): 지그재그
    ctx.lineTo(cabinEnd, hoodY);
    const zig = Math.max(1, Math.floor((front - cabinEnd) / 10));
    for (let i = 1; i <= zig; i++) { const xx = cabinEnd + (front - cabinEnd) * i / zig; ctx.lineTo(xx, hoodY + (crumple && comp > 0.02 ? (i % 2 ? -1 : 1) * Math.min(7, comp * DPPM * 0.12 + 1) : 0)); }
    ctx.lineTo(front, y - 0.3 * DPPM); ctx.closePath();
    const bg = ctx.createLinearGradient(0, y - H, 0, y); bg.addColorStop(0, '#5b8ae8'); bg.addColorStop(1, '#3a6fd8'); D.shadow(() => { ctx.fillStyle = bg; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#2547a3'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    // 창
    ctx.beginPath(); ctx.moveTo(ox + 0.55 * DPPM, y - 1.0 * DPPM); ctx.lineTo(ox + 0.95 * DPPM, y - 1.42 * DPPM); ctx.lineTo(ox + 2.05 * DPPM, y - 1.42 * DPPM); ctx.lineTo(ox + 2.7 * DPPM, y - 1.0 * DPPM); ctx.closePath(); ctx.fillStyle = 'rgba(214,236,252,.9)'; ctx.fill();
    // 좌석·대시보드
    const hx = ox + 1.15 * DPPM, hy = y - 0.62 * DPPM;
    ctx.fillStyle = '#5b6b8a'; ctx.fillRect(hx - 0.34 * DPPM, hy, 0.62 * DPPM, 0.1 * DPPM); D.roundRect(hx - 0.42 * DPPM, hy - 0.6 * DPPM, 0.14 * DPPM, 0.7 * DPPM, 5); ctx.fill();
    const dashX = ox + 2.15 * DPPM;
    ctx.fillStyle = '#4b5563'; ctx.fillRect(dashX, y - 1.0 * DPPM, 0.55 * DPPM, 0.3 * DPPM);
    if (r.cush > 0) { ctx.fillStyle = '#7cc4ff'; ctx.fillRect(dashX - r.cush, y - 1.0 * DPPM, r.cush, 0.3 * DPPM); ctx.strokeStyle = '#2f6fb0'; ctx.lineWidth = 1.5; ctx.strokeRect(dashX - r.cush, y - 1.0 * DPPM, r.cush, 0.3 * DPPM); }
    // 인형 (상체가 앞으로 이동 rel m)
    const lean = clamp(rel / 0.85, 0, 1) * 0.55;
    const hip = [hx, hy], sh = [hx + Math.sin(lean) * 0.55 * DPPM, hy - Math.cos(lean) * 0.55 * DPPM];
    ctx.strokeStyle = '#3b4a68'; ctx.lineWidth = 0.14 * DPPM; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(hip[0] + 0.5 * DPPM, hip[1]); ctx.lineTo(hip[0] + 0.55 * DPPM, hip[1] + 0.4 * DPPM); ctx.stroke();
    ctx.strokeStyle = '#f2873a'; ctx.lineWidth = 0.22 * DPPM; ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(sh[0], sh[1]); ctx.stroke();
    const hp = [sh[0] + Math.sin(lean) * 0.2 * DPPM, sh[1] - Math.cos(lean) * 0.2 * DPPM];
    ctx.strokeStyle = '#f0c6a0'; ctx.lineWidth = 0.07 * DPPM; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(sh[0] + 0.4 * DPPM, sh[1] + 0.25 * DPPM); ctx.stroke();
    D.sphere(hp[0], hp[1], 0.11 * DPPM, '#f3cfa8', { gloss: false });
    // 안전벨트
    if (r.dev.belt) {
      const st = clamp(rel / 0.85, 0, 1);
      ctx.strokeStyle = C.mix('#1e3a8a', '#60a5fa', st); ctx.lineWidth = 5 - st * 2; ctx.beginPath(); ctx.moveTo(hx - 0.42 * DPPM, y - 1.2 * DPPM); ctx.lineTo(sh[0] * 0.55 + hip[0] * 0.45 + 0.1 * DPPM, sh[1] * 0.55 + hip[1] * 0.45); ctx.lineTo(hx - 0.1 * DPPM, hy); ctx.stroke();
    }
    return { hp, sh, dashX, hip };
  }
  function drawDesignScene(dt) {
    const ds = S.ds, r = ds.run, live = r.st === 'idle';
    const cfg = live ? { dev: ds.dev, cush: ds.cush } : r;
    bgFill('#e9f1fc', '#f6f9fe');
    ctx.fillStyle = '#c3ccd8'; ctx.fillRect(0, DGY, VW, 16); ctx.fillStyle = '#97a3b5'; ctx.fillRect(0, DGY, VW, 3);
    D.shadow(() => { ctx.fillStyle = '#7a8599'; ctx.fillRect(DWX, DGY - 160, 26, 176); }, { blur: 6, y: 2 });
    ctx.fillStyle = '#e2464b'; for (let i = 0; i < 6; i++) ctx.fillRect(DWX, DGY - 160 + i * 28, 26, 12);
    // 진행
    let comp = 0, rel = 0, bagP = 0;
    const L = 4.2 * DPPM;
    const startX = DWX - L - (PHONE ? 80 : 190);
    let ox = startX;
    if (r.st === 'run' || r.st === 'done') {
      const pp = r.st === 'done' ? 1 : r.phase === 'approach' ? 0 : r.p;
      const ap = r.st === 'done' ? 1 : r.phase === 'approach' ? SciSim.ease.inOutQuad(clamp(r.t / 0.9, 0, 1)) : 1;
      const cMax = r.dev.crumple ? 0.7 : 0.08;
      const e = 2 * pp - pp * pp;
      comp = cMax * e;
      ox = startX + (DWX - L - startX) * ap + comp * DPPM;
      const relMax = 0.1 + (r.dev.belt ? 0.28 : 0) + (r.dev.bag ? 0.3 : 0) + r.cush * 0.01;
      rel = relMax * e;
      bagP = r.dev.bag ? (pp < 0.12 ? pp / 0.12 : 1) : 0;
      if (r.st === 'done') { rel = relMax; comp = cMax; ox = DWX - L + comp * DPPM; bagP = 1; }
    }
    const car = drawCrashCar(ox, comp, rel, cfg);
    // 에어백
    if (cfg.dev.bag && bagP > 0) {
      const rad = (PHONE ? 16 : 26) * bagP * (1 - 0.3 * clamp(rel / 0.85, 0, 1)), bx = car.dashX - rad, by = DGY - 0.9 * DPPM;
      D.sphere(bx, by, rad, '#fff7e6', { outline: '#f59e0b', outlineWidth: 2.5, gloss: false });
    }
    if (r.st === 'run' && r.phase === 'contact' || r.st === 'done') {
      if (!RM && r.st === 'run') D.label(VW - (PHONE ? 80 : 100), 24, '🐌 충돌 순간 슬로모션', { bg: '#26324a', size: 12.5 });
      if (r.st === 'run' && !r.hit && r.p > 0.02) { r.hit = true; parts.burst(DWX, DGY - 70, { count: 12, speed: 120, size: 3, colors: ['#ffd76a', '#fff', '#e2464b'], gravity: 120, life: 0.5 }); }
    }
    // 장치 이름표
    const tags = [];
    if (cfg.dev.crumple) tags.push(['크럼플 존', ox + L - (PHONE ? 50 : 90) - comp * DPPM * 0.5, DGY - 1.1 * DPPM, '#14a058']);
    if (cfg.dev.bag) tags.push(['에어백', car.dashX - 4, DGY - 1.75 * DPPM, '#f59e0b']);
    if (cfg.dev.belt) tags.push(['안전벨트', car.hip[0] - 40, DGY - 1.95 * DPPM, '#3b82f6']);
    tags.forEach((t) => D.label(t[1], t[2], t[0], { bg: t[3], size: PHONE ? 11.5 : 13 }));
    T(16, PHONE ? 24 : 32, '🛡️ 충돌 시험: 60 kg 인형, 15 m/s', PHONE ? 14 : 17, '#26324a', 'left', 800);
    T(16, PHONE ? 42 : 54, '장치는 최대 2가지 · 그림의 크기는 개념 모형이에요', PHONE ? 11.5 : 13, '#5a6679', 'left', 700);
    // 결과 패널
    drawDesignPanel(ds, r);
    // 합격 인증서
    if (r.st === 'done' && ds.result && ds.result.pass) {
      const cx = PHONE ? VW / 2 : 190, cy = PHONE ? 84 : 140, w = PHONE ? 250 : 300, h = PHONE ? 58 : 96;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.04); D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fillStyle = '#fffaf0'; ctx.fill(); }, { blur: 14, y: 5 });
      ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 4; D.roundRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 9); ctx.stroke();
      T(0, -h / 2 + (PHONE ? 24 : 30), '🏅 충돌 안전 합격 인증서', PHONE ? 14 : 19, '#8a5a00', 'center', 800);
      T(0, -h / 2 + (PHONE ? 44 : 52), '평균 힘 ' + nf(ds.result.F) + ' N ≤ 한계 ' + nf(LIMIT_N) + ' N', PHONE ? 13 : 15, '#26324a', 'center', 800);
      if (!PHONE) T(0, -h / 2 + 76, '충돌 시간 ' + ds.result.ms + ' ms', 14, '#5a6679', 'center', 700);
      ctx.restore();
    }
    parts.update(dt); parts.draw(ctx);
  }
  function drawDesignPanel(ds, r) {
    const ms = designMs(ds), F = designF(ms), pass = F <= LIMIT_N;
    const x = PHONE ? 10 : 24, y = PHONE ? 296 : 292, w = VW - x * 2, h = PHONE ? 262 : 250;
    panel(x, y, w, h, 16);
    T(x + 16, y + 28, '⏱️ 충돌 시간 = 기본 30 + 장치', PHONE ? 13 : 15.5, '#26324a', 'left', 800);
    // 쌓인 막대
    const bx = x + 16, by = y + 44, bw = w - 32, bh = PHONE ? 26 : 30, MAXMS = 250;
    D.roundRect(bx, by, bw, bh, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
    let acc = 0;
    const seg = (label, v, col) => { if (v <= 0) return; const sx = bx + bw * acc / MAXMS, sw = bw * v / MAXMS; ctx.fillStyle = col; ctx.fillRect(sx, by, sw, bh); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(sx, by, sw, bh); if (sw > 34) T(sx + sw / 2, by + bh / 2 + 5, label, PHONE ? 10.5 : 12, '#fff', 'center', 800); acc += v; };
    seg('기본 30', BASE_MS, '#8a94a8');
    ['belt', 'bag', 'crumple'].forEach((k) => { if (ds.dev[k]) seg(DEV_NAME[k].slice(0, 4) + ' ' + DEV_MS[k], DEV_MS[k], DEV_COL[k]); });
    seg('쿠션 ' + ds.cush * CUSH_MS, ds.cush * CUSH_MS, '#38bdf8');
    const nx = bx + bw * 150 / MAXMS;
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(nx, by - 6); ctx.lineTo(nx, by + bh + 6); ctx.stroke(); ctx.setLineDash([]);
    T(nx, by + bh + 20, '150 ms 이상 필요', PHONE ? 11.5 : 13, '#c0392b', 'center', 800);
    T(bx + bw, y + 28, '합계 ' + ms + ' ms', PHONE ? 13 : 15.5, '#26324a', 'right', 800);
    // 힘 막대
    const fy = by + bh + (PHONE ? 54 : 50), FM = 30000;
    T(x + 16, fy - 8, '💥 평균 힘 F = 900 000 ÷ ' + ms + ' = ' + nf(F) + ' N', PHONE ? 13 : 15.5, '#26324a', 'left', 800);
    D.roundRect(bx, fy, bw, bh, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
    const fw = bw * clamp(F / FM, 0, 1);
    D.roundRect(bx, fy, Math.max(fw, 6), bh, 8); ctx.fillStyle = pass ? '#14a058' : '#e2464b'; ctx.fill();
    const lx = bx + bw * LIMIT_N / FM;
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, fy - 6); ctx.lineTo(lx, fy + bh + 6); ctx.stroke();
    T(lx + 6, fy + bh + 22, '허용 한계 6 000 N', PHONE ? 11.5 : 13, '#1b2333', 'left', 800);
    T(bx + bw, fy + bh + 22, '30 000 N', 12, '#7b8aa3', 'right', 700);
    // 판정
    const ty = fy + bh + (PHONE ? 50 : 44);
    const st = r.st === 'done' && ds.tested === designKey(ds) ? (ds.result.pass ? '✅ 시험 합격! 인증서를 받았어요' : '❌ 시험 불합격: 힘이 한계보다 커요') : (ds.tested === designKey(ds) ? '' : '🧪 시험하기를 눌러 확인해요');
    D.roundRect(bx, ty, bw, PHONE ? 40 : 44, 12); ctx.fillStyle = r.st === 'done' && ds.tested === designKey(ds) ? (ds.result.pass ? '#e7f7ee' : '#fdeceb') : '#f3efff'; ctx.fill();
    T(bx + bw / 2, ty + (PHONE ? 25 : 28), st || '🧪 시험하기를 눌러 확인해요', PHONE ? 13.5 : 15.5, '#26324a', 'center', 800);
  }
  $$('#devChips button').forEach((b) => b.addEventListener('click', () => toggleDev(b.dataset.dev)));
  $('#sCush').addEventListener('input', (e) => { S.ds.cush = +e.target.value; e.target.style.setProperty('--pct', (S.ds.cush * 10) + '%'); Sound.tick(); designChanged(); });
  $('#bTest').addEventListener('click', runDesign);
  $('#bDesignReset').addEventListener('click', () => { Sound.click(); S.ds.dev = {}; S.ds.cush = 0; $('#sCush').value = 0; $('#sCush').style.setProperty('--pct', '0%'); S.ds.tested = null; S.ds.result = null; designChanged(); });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'egg') {
      const e = S.eg; const k = e.floor;
      L1 = '충돌 시간'; a = e.st === 'contact' || e.st === 'done' ? Math.round(FL[k].dt * 1000) + ' ms' : '—';
      L2 = e.st === 'done' ? '최대 힘' : '힘 센서(최대)'; b = e.st === 'done' ? Math.round(fPeak(k)) + ' N' : e.st === 'contact' ? Math.round(e.fmax) + ' N' : '—';
      L3 = '달걀 속도'; c = e.st === 'idle' ? '—' : e.st === 'done' ? EV.toFixed(1) + ' → 0.0 m/s' : e.v.toFixed(1) + ' m/s';
    } else if (S.mode === 'cart') {
      const t = S.ct;
      L1 = '운동량 변화'; a = (t.m * t.v).toFixed(2) + ' kg·m/s'; L2 = '넓이 F×Δt'; b = t.st === 'idle' || t.st === 'move' || t.st === 'back' ? '—' : t.area.toFixed(2) + ' N·s'; L3 = '힘 센서'; c = Math.round(t.F) + ' N';
    } else if (S.mode === 'time') {
      const m = S.tm.ms;
      L1 = '충돌 시간 Δt'; a = (m / 1000).toFixed(2) + ' s'; L2 = '평균 힘 F'; b = nf(forceOf(m)) + ' N'; L3 = '운동량 변화 Δp'; c = '900 kg·m/s';
    } else {
      const ds = S.ds, ms = designMs(ds), F = designF(ms);
      L1 = '충돌 시간'; a = ms + ' ms'; L2 = '평균 힘'; b = nf(F) + ' N'; L3 = '한계 6 000 N'; c = F <= LIMIT_N ? '이하 ✅' : '초과 ❌';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const cartHas = (m, v) => S.ct.rows.some((r) => r.m === m && r.v === v);
  const levels = [
    {
      title: '충격 느끼기: 달걀은 왜 깨질까?', short: '충격 느끼기', icon: '🥚', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 높이에서 떨어뜨린 달걀이 콘크리트에선 깨지고 스펀지에선 안 깨지는 이유는?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 힘이 작용하면 운동 상태가 변하고, 자유 낙하하는 물체의 속력은 일정하게 빨라진다고 배웠어요. 앞 차시 <b>‘관성과 상호작용’</b>에서는 힘이 있어야 속도가 변한다는 것을 확인했죠. 이번에는 속도가 변할 때 작용하는 <b>힘의 크기</b>를 재 봐요.</div>' +
        '<p>달걀(60 g)을 <b>콘크리트 · 방석 · 스펀지</b>에 떨어뜨리고, 바닥의 <b>힘 센서</b>가 충돌하는 동안의 힘을 어떻게 재는지 그래프로 비교해요.</p>',
      features: ['egg'],
      setup() { S.eg = null; resetEgg('concrete'); setScene('egg'); },
      recap: '세 바닥에서 달걀의 속도는 모두 4.4 m/s에서 0으로 변해요. 하지만 멈추는 시간이 짧을수록 달걀이 받는 힘이 커서 깨져요.',
      summary: '<ul><li>달걀은 세 바닥 모두 같은 속도(약 4.4 m/s)에서 0으로 멈춰요.</li><li><b>콘크리트</b>: 멈추는 시간이 짧아(약 4 ms) 힘이 크고 그래프가 <b>높고 좁아요</b> → 깨져요.</li><li><b>스펀지·방석</b>: 멈추는 시간이 길어 힘이 작고 그래프가 <b>낮고 넓어요</b> → 안 깨져요.</li><li>깨지는지는 속도 변화가 아니라 <b>달걀이 받는 힘의 크기</b>가 정해요.</li></ul>',
      missions: [
        {
          title: '세 바닥에 떨어뜨리기',
          goal: '<b>콘크리트 · 방석 · 스펀지</b>에 달걀을 각각 떨어뜨려 힘 센서 그래프와 결과 표를 채우세요.',
          hint: '바닥을 고르고 🥚 떨어뜨리기를 눌러요. 충돌 순간은 슬로모션으로 보여 줘요.',
          setup() { setScene('egg'); },
          check: () => FLK.every((k) => S.eg.rec[k]),
          hold: 0.6,
          status: () => FLK.map((k) => mark(!!S.eg.rec[k]) + FL[k].name).join(' &nbsp; '),
          explain: '세 경우 모두 달걀의 속도는 <b>4.4 m/s → 0</b>으로 똑같이 변해요. 콘크리트에서는 약 <b>4 ms</b> 만에 멈춰 힘이 <b>약 104 N</b>까지 커지고(깨지는 한계 30 N 초과), 방석(약 21 N)과 스펀지(약 8 N)에서는 힘이 한계보다 작아요.',
        },
        {
          type: 'quiz', title: '깨짐을 결정하는 것',
          goal: '콘크리트에서는 깨지고 스펀지에서는 깨지지 않았어요. 달걀이 깨지는지 결정하는 것은?',
          setup() { setScene('egg'); },
          choices: ['달걀의 속도가 0이 되었다는 사실', '충돌하는 동안 달걀이 받은 힘의 크기', '달걀이 떨어지면서 빨라진 정도만', '바닥의 색깔과 모양'],
          answer: 1,
          feedback: ['세 바닥 모두 속도는 4.4 m/s에서 0으로 같게 변했어요. 그래도 결과가 달랐죠.', '', '떨어뜨린 높이와 충돌 직전 속도는 세 경우 모두 같아요.', '바닥의 색은 달걀이 받는 힘과 관계없어요.'],
          explain: '속도 변화는 같아도 <b>멈추는 시간이 짧으면 힘이 커져요</b>. 달걀이 깨지는 것은 충돌하는 동안 받은 <b>힘이 한계를 넘기 때문</b>이에요.',
        },
      ],
    },
    {
      title: '충격량 = 운동량의 변화', short: '충격량=운동량', icon: '⚖️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 멈추는 시간이 짧을수록 힘이 크다는 것을 봤어요. 이제 <b>힘 × 시간</b>이 무엇과 같은지 수레로 측정해 봐요.</div>' +
        '<p><b>운동량 p = mv</b>(질량 × 속도, 단위 kg·m/s), <b>충격량 I = FΔt</b>(힘 × 힘이 작용한 시간, 단위 N·s)예요. 수레가 점토 범퍼에 부딪혀 멈출 때, 힘–시간 그래프의 <b>넓이(FΔt)</b>와 운동량의 변화를 비교해요.</p>',
      features: ['cart'],
      setup() { resetCart(false); setScene('cart'); },
      recap: '충격량(FΔt)은 운동량의 변화(mΔv)와 같아요. 힘–시간 그래프에서 충격량은 그래프 아래의 넓이예요.',
      summary: '<ul><li><b>운동량</b> p = mv (kg·m/s), <b>충격량</b> I = FΔt (N·s)</li><li><b>충격량 = 운동량의 변화량</b>: FΔt = mv′ − mv</li><li>힘–시간 그래프에서 <b>그래프 아래 넓이</b>가 충격량이에요.</li><li>예) 1 kg, 2 m/s 수레가 멈추면 Δp = 2 kg·m/s = 2 N·s. 0.5 kg, 4 m/s도 같은 2 N·s예요.</li><li>단위: 1 N·s = 1 kg·m/s</li></ul>',
      missions: [
        {
          title: '충돌 수레 두 번 측정하기',
          goal: '질량이나 속력을 <b>바꿔서 서로 다른 조건으로 2번</b> 측정하고, 넓이 FΔt와 운동량 변화 mΔv를 비교하세요.',
          hint: '질량과 속력을 고르고 📏 측정하기를 눌러요. 수레가 부딪혀 멈출 때까지 기다려요.',
          setup() { setScene('cart'); },
          check: () => new Set(S.ct.rows.map((r) => r.m + '|' + r.v)).size >= 2,
          hold: 0.6,
          status: () => '서로 다른 측정 ' + Math.min(2, new Set(S.ct.rows.map((r) => r.m + '|' + r.v)).size) + ' / 2',
          explain: '매번 <b>넓이 FΔt</b>와 <b>운동량 변화 mΔv</b>가 같은 값으로 나와요. 예) 1.0 kg, 2 m/s이면 mΔv = 1.0 × 2 = <b>2.00 kg·m/s</b>이고 그래프 넓이도 <b>2.00 N·s</b>예요.',
        },
        {
          title: '충격량 2.0 N·s 만들기',
          goal: '충격량(넓이)이 <b>2.0 N·s</b>가 되는 조합을 <b>두 가지</b> 찾아 측정하세요.',
          hint: 'mΔv = 2.0이 되는 조합을 계산해 보세요. 1.0 kg이면 몇 m/s? 0.5 kg이면 몇 m/s일까요?',
          setup() { setScene('cart'); },
          check: () => cartHas(1, 2) && cartHas(0.5, 4),
          hold: 0.6,
          status: () => mark(cartHas(1, 2)) + ' 1.0 kg · 2 m/s &nbsp; ' + mark(cartHas(0.5, 4)) + ' 0.5 kg · 4 m/s',
          explain: '<b>1.0 kg × 2 m/s = 2.0</b>, <b>0.5 kg × 4 m/s = 2.0</b>이에요. 질량과 속력이 달라도 곱 mv가 같으면 같은 운동량이어서, 멈출 때 받는 충격량도 같아요.',
        },
        {
          type: 'quiz', title: '충격량의 단위',
          goal: '충격량의 단위 <b>N·s</b>와 같은 단위는 어느 것일까요?',
          setup() { setScene('cart'); },
          choices: ['kg·m/s²', 'kg·m/s', 'N/s', 'J (줄)'],
          answer: 1,
          feedback: ['kg·m/s²는 힘의 단위 N이에요. 충격량은 힘 × 시간이라 N·s예요.', '', 'N/s는 힘을 시간으로 나눈 값이에요. 충격량은 힘에 시간을 곱해요.', 'J은 일의 단위(N·m)예요. 충격량은 N·s예요.'],
          explain: '충격량 FΔt의 단위는 N·s이고, 1 N = 1 kg·m/s²이므로 <b>N·s = kg·m/s</b>예요. 그래서 <b>충격량과 운동량은 단위가 같아요</b>.',
        },
      ],
    },
    {
      title: '시간과 힘: 충돌 시간을 늘리면?', short: '시간과 힘', icon: '⏱️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 충격량 FΔt가 운동량의 변화와 같다는 것을 확인했어요. 운동량의 변화가 정해져 있다면 <b>Δt를 늘릴수록 F는 어떻게 될까요?</b></div>' +
        '<p>60 kg 인형이 15 m/s로 달리다 멈춰요. 운동량 변화는 <b>Δp = 60 × 15 = 900 kg·m/s</b>로 고정이에요. 충돌 시간을 바꿔 평균 힘이 어떻게 달라지는지 그래프로 봐요.</p>',
      features: ['time'],
      setup() { resetTime(50); resetMatch(); S.showMatch = false; setScene('time'); },
      recap: '운동량의 변화가 같을 때 충돌 시간을 길게 하면 평균 힘이 줄어요(F = Δp ÷ Δt). 안전장치는 충돌 시간을 길게 해 줘요.',
      summary: '<ul><li>Δp가 고정이면 <b>F = Δp ÷ Δt</b>: 시간이 2배 → 힘은 1/2</li><li>예) Δp = 900 kg·m/s: 0.05 s이면 18 000 N, 0.20 s(에어백)이면 4500 N (1/4)</li><li>안전벨트·범퍼(차체)·헬멧·낙하 매트·무릎 구부리기는 모두 <b>충돌(멈추는) 시간을 길게</b> 해서 힘을 줄여요.</li><li>야구공(0.145 kg, 40 m/s)을 글러브로 받을 때: 딱딱하게 0.01 s → 580 N, 손을 뒤로 빼며 0.05 s → 116 N</li></ul>',
      missions: [
        {
          title: '힘을 절반으로 만들기',
          goal: '처음 충돌 시간은 0.05 s(힘 18 000 N)예요. 충돌 시간을 늘려 평균 힘을 <b>절반인 9000 N</b>으로 만드세요.',
          hint: 'F = 900 ÷ Δt예요. 힘을 절반으로 하려면 Δt를 몇 배로 해야 할까요? 슬라이더나 + 버튼을 써요.',
          setup() { resetTime(50); setScene('time'); },
          check: () => S.tm.ms === 100,
          hold: 0.7,
          status: () => '지금 Δt ' + (S.tm.ms / 1000).toFixed(2) + ' s → 평균 힘 ' + nf(forceOf(S.tm.ms)) + ' N ' + (S.tm.ms === 100 ? '✅' : '⬜'),
          explain: '평균 힘을 절반으로 하려면 충돌 시간을 <b>2배(0.10 s)</b>로 늘려야 해요. F = 900 ÷ 0.10 = <b>9000 N</b>. 힘과 시간의 곱(충격량)이 900 N·s로 일정해서 <b>반비례</b>하기 때문이에요.',
        },
        {
          title: '안전장치는 어떻게 시간을 늘릴까?', manual: true,
          goal: '다섯 가지 안전 사례가 <b>충돌(멈추는) 시간을 길게 하는 방법</b>을 하나씩 골라 연결하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '안전벨트는 늘어나고, 차체는 찌그러지고, 헬멧 안쪽 완충재는 눌려요. 매트는 푹 꺼지고, 무릎은 굽혀져요.',
          setup() { resetMatch(); S.showMatch = true; setScene('time'); updateCtl(); },
          check() {
            const miss = MATCH.filter((m, i) => S.match[i] === undefined || S.match[i] === '');
            if (miss.length) return '아직 고르지 않은 사례가 ' + miss.length + '개 있어요.';
            let bad = 0;
            MATCH.forEach((m, i) => {
              const ok = +S.match[i] === m[1];
              if (!ok) bad++;
              if (!ok && S.matchOK[i] !== false) { matchSel[i].classList.remove('ok', 'bad'); void matchSel[i].offsetWidth; matchSel[i].classList.add('bad'); }
              if (ok) { matchSel[i].classList.remove('bad'); matchSel[i].classList.add('ok'); }
              S.matchOK[i] = ok;
            });
            if (bad) return '빨간 칸을 다시 골라 보세요. 같은 설명을 두 번 고르지 않았나요? 그 장치에서 무엇이 변형되는지 떠올려 보세요.';
            return true;
          },
          status: () => '고른 사례 ' + MATCH.filter((m, i) => S.match[i]).length + ' / 5',
          explain: '<b>안전벨트는 늘어나고, 차체(범퍼)는 찌그러지고, 헬멧의 완충재는 눌리고, 낙하 매트는 푹 꺼지고, 무릎은 굽혀져서</b> 모두 몸이 멈추는 시간을 길게 해요. 같은 운동량 변화를 더 긴 시간에 나누어 받으니 평균 힘이 줄어요.',
        },
        {
          type: 'quiz', title: '충격량이 같은데 힘이 다른 까닭',
          goal: '에어백이 있을 때와 없을 때 사람의 운동량 변화(충격량)는 같은데, 받는 힘은 왜 다를까요?',
          setup() { S.showMatch = false; setScene('time'); updateCtl(); },
          choices: ['에어백이 있으면 사람의 운동량이 더 작아져서', '충격량(FΔt)이 같아도 힘이 작용한 시간이 길면 힘은 작아서', '에어백이 충격량을 없애 주어서', '에어백이 있으면 자동차 속력이 줄어서'],
          answer: 1,
          feedback: ['사람의 운동량은 같은 값(900 kg·m/s)에서 0으로 변해요. 변화량은 에어백과 관계없이 같아요.', '', '충격량은 사라지지 않아요. 같은 충격량을 더 긴 시간 동안 나누어 받는 거예요.', '충돌 직전 자동차의 속력은 똑같아요. 달라지는 것은 멈추는 데 걸리는 시간이에요.'],
          explain: '충격량 FΔt = Δp가 같을 때, <b>Δt가 길수록 F는 작아져요</b>. 에어백은 사람이 멈추는 시간을 늘려 평균 힘을 줄여 줘요(0.05 s → 0.20 s이면 힘이 1/4).',
        },
      ],
    },
    {
      title: '안전장치 설계: 한계 힘 이하로 만들기', short: '안전 설계', icon: '🛡️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 충돌 시간을 늘리면 평균 힘이 줄어든다는 것을 확인했어요. 이제 직접 <b>충돌 보호 장치를 설계</b>해 봐요.</div>' +
        '<p>실험용 인형(60 kg, 15 m/s)이 받는 평균 힘이 <b>6000 N 이하</b>가 되도록 보호 장치(최대 2가지)와 쿠션 두께를 골라 시험하세요. 합격하면 인증서를 받아요.</p>',
      features: ['design'],
      setup() { S.ds = null; resetDesign(); $('#sCush').value = 0; $('#sCush').style.setProperty('--pct', '0%'); setScene('design'); },
      recap: '충돌 시간을 길게 하는 장치를 더하면 같은 충격량을 더 긴 시간에 받아 평균 힘이 작아져요. 스포츠에서도 힘을 키울 때는 짧게, 줄일 때는 길게 해요.',
      summary: '<ul><li>안전 기준: 평균 힘 F = Δp ÷ Δt ≤ 한계. 6000 N 이하이려면 Δt ≥ 900 ÷ 6000 = <b>0.15 s</b>가 필요해요.</li><li>장치마다 충돌 시간을 늘려 줘요: 벨트·에어백·크럼플 존·쿠션</li><li><b>스포츠</b>: 태권도 격파는 짧은 시간에 큰 힘을, 높이뛰기 매트·글러브로 받기는 긴 시간에 작은 힘을 이용해요.</li><li>충격량 FΔt = 운동량의 변화 mΔv는 안전장치와 스포츠를 설명하는 핵심이에요.</li></ul>',
      missions: [
        {
          title: '합격하는 보호 장치 설계', manual: true,
          goal: '인형이 받는 평균 힘이 <b>6000 N 이하</b>가 되도록 장치(최대 2가지)와 쿠션 두께를 골라 <b>🧪 시험하기</b>로 합격한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '충돌 시간이 150 ms(0.15 s) 이상이어야 해요. 기본 30 ms에 장치 시간(벨트 40, 에어백 60, 크럼플 80 ms)과 쿠션(1 cm당 2 ms)을 더해요.',
          setup() { setScene('design'); },
          check() {
            const ds = S.ds;
            if (ds.tested !== designKey(ds)) return '먼저 🧪 시험하기를 눌러 지금 설계를 시험해 보세요.';
            if (!ds.result.pass) return '불합격이에요. 평균 힘이 ' + nf(ds.result.F) + ' N로 한계(6 000 N)보다 커요. 충돌 시간을 150 ms 이상으로 늘려 보세요.';
            return true;
          },
          status: () => { const ds = S.ds, ms = designMs(ds); return '충돌 시간 ' + ms + ' ms → 평균 힘 ' + nf(designF(ms)) + ' N ' + (designF(ms) <= LIMIT_N ? '✅' : '⬜') + (ds.tested === designKey(ds) && ds.result.pass ? ' · 합격!' : ''); },
          explain: '충돌 시간이 <b>150 ms 이상</b>이면 F = 900 000 ÷ 150 = <b>6000 N 이하</b>가 돼요. 예) 에어백(60) + 크럼플 존(80) + 기본(30) = 170 ms → 약 5294 N. 벨트(40) + 크럼플 존(80) + 기본(30) = 150 ms → 6000 N. 장치는 충돌 시간을 길게 해서 힘을 줄여요.',
        },
        {
          type: 'quiz', title: '태권도 격파와 충격량',
          goal: '태권도 선수는 송판을 격파할 때 손이나 발이 송판에 <b>짧은 시간</b> 동안 닿도록 쳐요. 그 까닭은?',
          setup() { setScene('design'); },
          choices: ['같은 충격량이면 힘이 작용하는 시간이 짧을수록 더 큰 힘을 줄 수 있어서', '시간이 짧을수록 충격량이 커져서', '송판이 무거워서 시간이 길면 안 되어서', '손의 운동량이 0이어야 해서'],
          answer: 0,
          feedback: ['', '충격량은 운동량의 변화로 정해져요. 시간을 줄인다고 충격량이 커지는 것은 아니에요. 시간이 짧아지면 힘이 커져요.', '송판의 무게는 격파의 핵심이 아니에요. 큰 힘이 필요한 거예요.', '손은 송판에 닿아 운동량이 크게 변해요. 그 변화를 짧은 시간에 해서 큰 힘을 만들어요.'],
          explain: '충격량 FΔt가 일정할 때 <b>Δt가 짧으면 F가 커져요</b>. 송판을 부러뜨리려면 큰 힘이 필요하므로 손이 송판에 닿는 시간을 짧게 해요. 안전장치는 반대로 시간을 길게 해서 힘을 줄여요.',
        },
        {
          type: 'quiz', title: '높이뛰기 매트의 역할',
          goal: '높이뛰기 선수가 딱딱한 바닥이 아닌 <b>푹신한 매트</b>에 떨어질 때 안전한 까닭은?',
          setup() { setScene('design'); },
          choices: ['매트가 선수의 운동량을 없애 주어서', '선수가 멈추는 시간이 길어져 받는 평균 힘이 작아져서', '매트 위에서는 중력이 작게 작용해서', '선수의 질량이 줄어들어서'],
          answer: 1,
          feedback: ['운동량의 변화(Δp)는 매트가 있든 없든 같아요. 달라지는 것은 변화가 일어나는 시간이에요.', '', '중력은 그대로예요. 매트는 힘이 작용하는 시간을 늘려 줘요.', '선수의 질량은 변하지 않아요.'],
          explain: '선수가 멈추는 운동량 변화는 같지만 푹신한 매트에서는 <b>멈추는 시간이 길어져서</b> 평균 힘 F = Δp ÷ Δt가 작아져요. 그래서 다치지 않아요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-impulse', mount: '#game', badge: '충격량 박사', homeHref: '../../index.html#h1a',
    featureLabels: { egg: '🥚 달걀 낙하 · 힘 센서 그래프', cart: '⚖️ 충돌 수레 · 힘–시간 그래프 넓이', time: '⏱️ 충돌 시간 슬라이더 · 힘–시간 반비례 그래프', design: '🛡️ 보호 장치 · 쿠션 두께 · 시험' },
    onFeatures() { updateCtl(); },
    levels,
  });

  view.canvas.addEventListener('click', () => {
    if (S.mode === 'egg') { if (S.eg.st === 'idle') dropEgg(); }
    else if (S.mode === 'cart') measure();
    else if (S.mode === 'time') { if (S.tm.run.st !== 'run') timeRun(); }
    else runDesign();
  });

  /* ---------- 시작 ---------- */
  resetEgg('concrete'); resetCart(false); resetTime(50); resetDesign(); resetMatch();
  $('#sSpeed').style.setProperty('--pct', ((S.ct.v - 1) / 3 * 100) + '%');
  setScene('egg');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    if (S.mode === 'egg') { stepEgg(dt); drawEggScene(dt); }
    else if (S.mode === 'cart') { stepCart(dt); drawCartScene(dt); }
    else if (S.mode === 'time') { stepTime(dt); drawTimeScene(dt); }
    else { stepDesign(dt); drawDesignScene(dt); }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, resetEgg, setEggFloor, dropEgg, measure, resetCart, setDt, timeRun, toggleDev, runDesign, resetDesign, designMs, designF, fPeak, FL, MATCH, forceOf,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { if (S.mode === 'egg') stepEgg(0.02); else if (S.mode === 'cart') stepCart(0.02); else if (S.mode === 'time') stepTime(0.02); else stepDesign(0.02); } },
  };
})();
