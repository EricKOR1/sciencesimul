/* =========================================================
   물리학 Ⅰ. 힘과 에너지 - 일과 역학적 에너지 (단원 5차시)
   성취기준 [12물리01-04] 일과 운동 에너지의 관계를 이해하고, 위치 에너지와 역학적 에너지 보존 법칙을 설명할 수 있다.
   ① 분석: 일과 운동 에너지 (상자 밀기, F–s 그래프 넓이, 속력 센서)
   ② 탐구: 위치 에너지 (중력 기준면, 용수철 ½kx²)
   ③ 확인: 역학적 에너지 보존 (낙하·비탈, 용수철 발사)
   ④ 적용: 속력 예측 게임 (선반 올리기, 루프 통과)
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
      ctx.save(); ctx.font = D.font(12.5, 800); const tw = ctx.measureText(txt).width; ctx.restore();
      const outside = w >= 0 ? zx + w + 5 + tw <= x1 + 14 : zx + w - 5 - tw >= x0 - 8;   // 글자가 막대 밖(라벨 칸 쪽 포함)으로 넘치면 막대 안에 써요
      if ((Math.abs(w) > W * 0.55 || !outside) && Math.abs(w) > tw + 12) T(zx + w - Math.sign(w) * 6, ty, txt, 12.5, '#fff', w >= 0 ? 'right' : 'left', 800);
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
  const BOX = { m: 2.0, fr: 3, FMAX: 8, SMAX: 10 };   // 상자 질량(kg), 마찰력(N), 힘·거리 슬라이더 최댓값
  const TBL = 0.8;                                // 탁자 높이 (m)
  const KS = 200;                                 // 용수철 상수 (N/m) - 탄성 에너지 탐구
  const LK = { k: 50, m: 0.5, ang: 30 };          // 발사 용수철 상수(N/m), 공 질량(kg), 비탈 각도(°)
  const SIN_L = Math.sin(LK.ang * Math.PI / 180), COS_L = Math.cos(LK.ang * Math.PI / 180);
  const H0 = 0.8;                                 // 낙하 시작 높이 (m)
  const SHELF = 0.45;                             // 선반 높이 (m)
  const LOOP_R = 0.25;                            // 루프 반지름 (m)
  const LOOP_FLAT = 0.4;                          // 비탈 끝에서 루프까지 평평한 구간 (m)
  const MU = 0.2;                                 // 비탈 마찰 계수 (마찰을 켰을 때)
  const PATHS = {
    drop: { name: '수직 낙하', ang: 90 },
    gentle: { name: '완만한 비탈 20°', ang: 20 },
    steep: { name: '가파른 비탈 40°', ang: 40 },
  };

  /* ---------- 상태 ---------- */
  const S = { mode: 'work', clock: 0, fade: 0, w: null, pt: null, cv: null, ap: null, showHIn: false };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { work: '⚙️ 일과 운동 에너지', potential: '⬆️ 위치 에너지', conserve: '🔁 역학적 에너지 보존', apply: '🎯 속력 예측' };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }

  /* =====================================================
     ① 일과 운동 에너지: 상자 밀기
     ===================================================== */
  const WPPM = (VW - 70) / 11, WX0 = 35, WGY = MH - 66, WBW = 0.9, FSC = PHONE ? 5 : 8;
  function resetWork(keep, fresh) {   // fresh: 힘·거리·마찰도 처음 값(2 N, 5 m, 마찰 없음)으로 — 미션의 답이 미리 맞춰져 있지 않게
    const p = fresh ? null : S.w;
    S.w = { F: p ? p.F : 2, s: p ? p.s : 5, fr: p ? p.fr : false, st: 'ready', x: 0, v: 0, t: 0, a: 0, kap: 1, rows: keep && p ? p.rows : [] };
    updateCtl();
  }
  function workGo() {
    const w = S.w; if (w.st !== 'ready') return false;
    const f = w.fr ? BOX.fr : 0, net = w.F - f;
    if (w.F <= 0) { showHint('힘 F가 0이라서 상자가 움직이지 않아요.'); Sound.fail(); return false; }
    if (w.s <= 0) { showHint('미는 거리 s가 0이라서 일을 하지 않아요.'); Sound.fail(); return false; }
    if (net <= 0) { showHint('힘 F가 마찰력 ' + BOX.fr + ' N 이하라서 상자가 움직이지 않아요. 알짜힘이 0이에요.'); Sound.fail(); return false; }
    w.a = net / BOX.m; const tt = Math.sqrt(2 * w.s / w.a); w.kap = Math.max(1, tt / 3.2);
    w.st = 'go'; w.t = 0; w.x = 0; w.v = 0; Sound.click(); updateCtl(); return true;
  }
  function workReset() { const w = S.w; w.st = 'ready'; w.x = 0; w.v = 0; w.t = 0; parts.clear(); updateCtl(); }
  function stepWork(dt) {
    const w = S.w; if (w.st !== 'go') return;
    w.t += dt * w.kap;
    const x = 0.5 * w.a * w.t * w.t;
    if (x >= w.s) {
      w.x = w.s; w.v = Math.sqrt(2 * w.a * w.s); w.st = 'done';
      const f = w.fr ? BOX.fr : 0;
      w.rows.push({ F: w.F, s: w.s, f, WF: w.F * w.s, Wf: -f * w.s, Wn: (w.F - f) * w.s, v: w.v, Ek: 0.5 * BOX.m * w.v * w.v });
      if (w.rows.length > 12) w.rows.shift();
      Sound.success(); parts.burst(WX0 + (w.s + WBW) * WPPM, WGY - 36, { count: 14, speed: 130, size: 3, colors: ['#ffb400', '#3867f4', '#14a058'], gravity: 160 });
      updateCtl();
    } else { w.x = x; w.v = w.a * w.t; }
  }
  const workW = (w) => { const f = w.fr ? BOX.fr : 0; return { WF: w.F * w.x, Wf: -f * w.x, Wn: (w.F - f) * w.x, Ek: 0.5 * BOX.m * w.v * w.v, f }; };
  function drawFloorRuler(x0, ppm, len, gy, step) {
    ctx.fillStyle = '#b6c2d4'; ctx.fillRect(x0 - 10, gy, len * ppm + 20, 12); ctx.fillStyle = '#8a98ae'; ctx.fillRect(x0 - 10, gy, len * ppm + 20, 3);
    for (let m = 0; m <= len + 1e-9; m += step) { const x = x0 + m * ppm; ctx.fillStyle = '#6b778c'; ctx.fillRect(x - 0.75, gy + 12, 1.5, 6); if (m % (step * 2) === 0) T(x, gy + 33, String(m), 11.5, '#5a6679', 'center', 700); }
  }
  function drawCrate(px, gy, wpx, hpx, label) {
    D.shadow(() => { D.roundRect(px, gy - hpx, wpx, hpx, 5); const g = ctx.createLinearGradient(0, gy - hpx, 0, gy); g.addColorStop(0, '#d9a867'); g.addColorStop(1, '#b57f3f'); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#8a5a26'; ctx.lineWidth = 2; ctx.strokeRect(px + 3, gy - hpx + 3, wpx - 6, hpx - 6);
    ctx.beginPath(); ctx.moveTo(px + 3, gy - hpx + 3); ctx.lineTo(px + wpx - 3, gy - 3); ctx.moveTo(px + wpx - 3, gy - hpx + 3); ctx.lineTo(px + 3, gy - 3); ctx.stroke();
    D.roundRect(px + wpx / 2 - 22, gy - hpx / 2 - 10, 44, 20, 5); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
    T(px + wpx / 2, gy - hpx / 2 + 5, label, 13, '#6b4a1f', 'center', 800);
  }
  function drawWork(dt) {
    const w = S.w, f = w.fr ? BOX.fr : 0;
    bgData(); beginMain(); bgMain();
    drawFloorRuler(WX0, WPPM, 11, WGY, 1);
    T(WX0 + 11 * WPPM, WGY + 46, '미터(m)', 11.5, '#5a6679', 'right', 700);
    if (f > 0) { ctx.fillStyle = 'rgba(120,90,60,.22)'; ctx.fillRect(WX0, WGY, 11 * WPPM, 4); for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(100,70,40,.45)'; ctx.fillRect(WX0 + (i * 29) % (11 * WPPM), WGY + 1 + (i % 2) * 2, 5, 2); } }
    T(16, PHONE ? 24 : 30, '⚙️ 마찰 없는 바닥에서 힘 F로 s만큼 밀어요' .replace('마찰 없는 바닥', f > 0 ? '마찰 ' + BOX.fr + ' N인 바닥' : '마찰 없는 바닥'), PHONE ? 14 : 17, '#26324a', 'left', 800);
    // 출발선과 속력 센서(도착선)
    const sx = WX0 + w.s * WPPM;
    D.dashedLine(WX0, WGY - 74, WX0, WGY + 8, { color: '#8b97ab', width: 2 }); T(WX0, WGY + 58, '출발선', 12, '#5a6679', 'left', 800);
    ctx.fillStyle = '#26324a'; ctx.fillRect(sx - 1.5, WGY - 130, 3, 138);
    D.roundRect(sx + 1.5, WGY - 130, 70, 20, 4); ctx.fillStyle = '#14a058'; ctx.fill(); T(sx + 36, WGY - 116, '속력 센서', 12, '#fff', 'center', 800);
    D.dashedLine(WX0, WGY + 44, sx, WGY + 44, { color: '#3867f4', width: 2.5, dash: [2, 0] });
    T((WX0 + sx) / 2, WGY + 58, 's = ' + w.s + ' m', 13, '#3867f4', 'center', 800);
    // 상자
    const px = WX0 + w.x * WPPM, bw = WBW * WPPM, bh = PHONE ? 38 : 56;
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(px + bw / 2, WGY + 1, bw * 0.55, 4, 0, 0, TAU); ctx.fill();
    drawCrate(px, WGY, bw, bh, f1(BOX.m) + ' kg');
    // 힘 화살표 (위)
    D.arrow(px, WGY - bh - 14, px + w.F * FSC, WGY - bh - 14, { color: '#f2873a', width: 6, label: 'F = ' + w.F + ' N', labelOffset: -17, labelSize: PHONE ? 12 : 13 });
    if (f > 0) { D.arrow(px + bw, WGY + 6, px + bw - f * FSC, WGY + 6, { color: '#e2464b', width: 5, head: 10 }); D.label(px + bw + 40, WGY + 5, '마찰 ' + f + ' N', { bg: '#e2464b', size: PHONE ? 12 : 13 }); }
    if (w.st === 'go') D.label(px + bw / 2, WGY - bh - 62, 'v = ' + f2(w.v) + ' m/s', { bg: '#14a058', size: PHONE ? 12 : 13.5 });
    if (w.st === 'done') D.label(sx + 36, WGY - 146, '측정 v = ' + f2(w.v) + ' m/s', { bg: '#26324a', size: 12.5 });
    if (w.st === 'ready') T(VW / 2, PHONE ? 62 : 70, '▶ 밀기를 눌러 보세요', PHONE ? 14 : 15, '#5a6679', 'center', 800);
    if (w.kap > 1.01 && w.st === 'go') D.label(VW - (PHONE ? 70 : 90), PHONE ? 52 : 58, '⏩ ' + w.kap.toFixed(1) + '배 빠르게', { bg: '#26324a', size: 12.5 });
    parts.update(dt); parts.draw(ctx); endMain();
    // ----- 데이터: F–s 그래프 -----
    panel(RL.x, RL.y, RL.w, RL.h, 14);
    T(RL.x + 12, RL.y + 22, '힘–이동 거리 그래프 (넓이 = 일)', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    const gr = { x: RL.x + 46, y: RL.y + 48, w: RL.w - 70, h: RL.h - 48 - (PHONE ? 46 : 54) };
    const ax = drawAxes(gr, { x0: 0, x1: BOX.SMAX, y0: 0, y1: BOX.FMAX, xt: 2, yt: 2, xl: 'm', yl: 'N' });
    const xx = w.st === 'ready' ? 0 : w.x;
    if (w.st === 'ready') { ctx.setLineDash([6, 4]); ctx.strokeStyle = '#f2873a'; ctx.lineWidth = 2; ctx.strokeRect(ax.gx(0), ax.gy(w.F), ax.gx(w.s) - ax.gx(0), ax.gy(0) - ax.gy(w.F)); ctx.setLineDash([]); }
    if (xx > 0) {
      if (f > 0) { ctx.fillStyle = 'rgba(226,70,75,.35)'; ctx.fillRect(ax.gx(0), ax.gy(f), ax.gx(xx) - ax.gx(0), ax.gy(0) - ax.gy(f)); ctx.fillStyle = 'rgba(20,160,88,.38)'; ctx.fillRect(ax.gx(0), ax.gy(w.F), ax.gx(xx) - ax.gx(0), ax.gy(f) - ax.gy(w.F)); }
      else { ctx.fillStyle = 'rgba(242,135,58,.4)'; ctx.fillRect(ax.gx(0), ax.gy(w.F), ax.gx(xx) - ax.gx(0), ax.gy(0) - ax.gy(w.F)); }
    }
    ctx.strokeStyle = '#f2873a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax.gx(0), ax.gy(w.F)); ctx.lineTo(ax.gx(Math.max(xx, 0.0001)), ax.gy(w.F)); ctx.stroke();
    if (f > 0) { ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(ax.gx(0), ax.gy(f)); ctx.lineTo(ax.gx(BOX.SMAX), ax.gy(f)); ctx.stroke(); ctx.setLineDash([]); T(ax.gx(BOX.SMAX) - 4, ax.gy(f) - 5, '마찰력 ' + f + ' N', 12, '#c0392b', 'right', 800); }
    const wv = workW(w);
    const lab = w.st === 'ready' ? (f > 0 ? '알짜 일 = (F − 마찰) × s = ' + eJ((w.F - f) * w.s) + ' J' : '일 W = F × s = ' + eJ(w.F * w.s) + ' J') : (f > 0 ? '알짜 일 ' + eJ(wv.Wn) + ' J = 힘이 한 일 ' + eJ(wv.WF) + ' J + 마찰이 한 일 ' + eJ(wv.Wf) + ' J' : '일 W = F × s = ' + eJ(wv.WF) + ' J');
    T(RL.x + 12, RL.y + RL.h - 10, lab, PHONE ? 12.5 : 13.5, f > 0 ? '#0b6b39' : '#c2410c', 'left', 800);
    // ----- 데이터: 에너지 막대 + 표 -----
    const rB = PHONE ? RR : { x: RR.x, y: RR.y, w: RR.w, h: 152 };
    const wvv = w.st === 'ready' ? { WF: 0, Wf: 0, Wn: 0, Ek: 0 } : wv;
    drawEBars(rB, '일과 운동 에너지 (J)', [
      { label: '힘이 한 일', color: '#f2873a', val: wvv.WF },
      { label: '마찰이 한 일', color: '#e2464b', val: wvv.Wf },
      { label: '알짜 일', color: '#14a058', val: wvv.Wn },
      { label: '운동 에너지', color: '#3867f4', val: wvv.Ek },
    ], f > 0 ? -32 : 0, BOX.FMAX * BOX.SMAX, 'J', { labW: 70 });
    if (!PHONE) {
      drawTable({ x: RR.x, y: RR.y + 160, w: RR.w, h: RR.h - 160 }, '측정 기록', [
        { h: 'F(N)', w: 0.7, get: (x) => x.F }, { h: 's(m)', w: 0.7, get: (x) => x.s }, { h: '마찰(N)', w: 0.8, get: (x) => x.f },
        { h: '알짜 일(J)', w: 1, get: (x) => eJ(x.Wn), color: '#0b6b39' }, { h: 'v(m/s)', w: 0.9, get: (x) => f2(x.v) }, { h: '½mv²(J)', w: 1, get: (x) => eJ(x.Ek), color: '#1d4ed8' },
      ], w.rows, 3, '밀어서 측정해 보세요');
    }
  }

  /* =====================================================
     ② 위치 에너지: 중력(기준면)과 탄성(용수철)
     ===================================================== */
  const GP = (MH - 92) / 2.1, GFLOOR = MH - 38, GBALLX = PHONE ? 340 : 560, GRUL = PHONE ? 52 : 64;
  const yH = (h) => GFLOOR - h * GP;
  function resetPot(keepSub) {
    const p = S.pt;
    S.pt = { sub: keepSub && p ? p.sub : 'grav', m: 0.5, H: 1.1, ref: 0, xs: 0.1, seen: {}, rows: [], drag: false };
    updateCtl();
  }
  const ballR = (m) => 12 + 8 * Math.sqrt(m);
  const epOf = (p) => ({ now: p.m * G * (p.H - p.ref), tbl: p.m * G * (TBL - p.ref), dE: p.m * G * (p.H - TBL) });
  function trackSeen() { const p = S.pt; if (p.sub === 'grav' && p.m === 0.5 && Math.abs(p.H - 1.1) < 1e-9) p.seen[Math.round(p.ref * 10)] = true; }
  function drawPotGrav(dt) {
    const p = S.pt, e = epOf(p);
    const tblX = PHONE ? 100 : 150, tblW = PHONE ? 130 : 200;
    // 바닥, 눈금자
    ctx.fillStyle = '#b6c2d4'; ctx.fillRect(GRUL - 14, GFLOOR, VW - GRUL - 16, 12); ctx.fillStyle = '#8a98ae'; ctx.fillRect(GRUL - 14, GFLOOR, VW - GRUL - 16, 3);
    ctx.fillStyle = '#7b889e'; ctx.fillRect(GRUL - 1, yH(2.0), 2.5, 2.0 * GP);
    for (let h = 0; h <= 2.0 + 1e-9; h += 0.5) { const y = yH(h); ctx.fillRect(GRUL - 7, y - 0.75, 14, 1.5); T(GRUL - 12, y + 4, h.toFixed(1), 12, '#5a6679', 'right', 800); }
    T(GRUL - 2, GFLOOR + 28, '높이(m)', 11.5, '#5a6679', 'center', 800);
    // 탁자
    D.shadow(() => { D.roundRect(tblX, yH(TBL), tblW, 10, 3); ctx.fillStyle = '#c28b4b'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.fillStyle = '#a06f35'; ctx.fillRect(tblX + 10, yH(TBL) + 10, 9, GFLOOR - yH(TBL) - 10); ctx.fillRect(tblX + tblW - 19, yH(TBL) + 10, 9, GFLOOR - yH(TBL) - 10);
    T(tblX + tblW / 2, yH(TBL) + 32, '탁자 ' + TBL + ' m', 13, '#fff', 'center', 800, { stroke: '#a06f35', strokeWidth: 3 });
    // 기준면 선
    const ry = yH(p.ref);
    ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 5]); ctx.beginPath(); ctx.moveTo(GRUL + 4, ry); ctx.lineTo(VW - 62, ry); ctx.stroke(); ctx.setLineDash([]);
    D.roundRect(VW - 60, ry - 14, 50, 28, 14); ctx.fillStyle = '#14a058'; ctx.fill(); T(VW - 35, ry + 5, '↕ 0점', 12.5, '#fff', 'center', 800);
    T(GRUL + 12, ry - 8, '기준면 (E_p = 0, 기준 높이 ' + f1(p.ref) + ' m)', PHONE ? 12 : 13, '#0b6b39', 'left', 800);
    // 탁자 높이의 유령 공 + 공
    const r = ballR(p.m), bx = GBALLX;
    ctx.strokeStyle = 'rgba(80,90,110,.5)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(bx, yH(TBL), r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#7b889e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx, 46); ctx.lineTo(bx, yH(p.H) - r); ctx.stroke();
    ctx.fillStyle = '#5a6679'; D.roundRect(bx - 16, 40, 32, 10, 4); ctx.fill();
    D.sphere(bx, yH(p.H), r, '#e2464b', { shadow: true });
    // 높이 표시
    const hRel = p.H - p.ref;
    D.arrow(bx + r + 30, ry, bx + r + 30, yH(p.H), { color: '#14a058', width: 3.5, head: 9, label: '기준면에서 ' + f1(hRel).replace('-', '−') + ' m', labelOffset: PHONE ? 56 : 66, labelSize: PHONE ? 11.5 : 12.5 });
    if (Math.abs(p.H - TBL) > 0.04) D.arrow(bx - r - 28, yH(p.H), bx - r - 28, yH(TBL), { color: '#f2873a', width: 3.5, head: 9, label: '탁자 높이와의 차 ' + f1(p.H - TBL).replace('-', '−') + ' m', labelOffset: PHONE ? 58 : 70, labelSize: PHONE ? 11.5 : 12.5 });
    T(16, PHONE ? 24 : 30, '⬆️ 공(' + f1(p.m) + ' kg)의 위치 에너지 E_p = mgh', PHONE ? 14 : 17, '#26324a', 'left', 800);
    T(VW - 16, GFLOOR + 28, '초록 점선(기준면)을 위아래로 끌어 보세요', 12.5, '#5a6679', 'right', 700);
    parts.update(dt); parts.draw(ctx); endMain();
    const m = p.m;
    drawEBars(RL, '위치 에너지 (J)', [
      { label: 'E_p 지금', color: '#e2552a', val: e.now },
      { label: 'E_p 탁자 높이에서', color: '#8b5cf6', val: e.tbl },
      { label: 'ΔE_p 감소량', color: '#14a058', val: e.dE },
    ], -20 * m, 20 * m, 'J', { labW: 72 });
    panel(RR.x, RR.y, RR.w, RR.h, 14);
    T(RR.x + 12, RR.y + 22, '계산', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let y = RR.y + 46; const bw = RR.w - 28;
    const hn = p.H - p.ref, ht = TBL - p.ref;
    y += textBlock(RR.x + 14, y, bw, 'E_p(지금) = mgh = ' + f1(m) + ' × ' + G + ' × ' + f1(hn) + ' = ' + eJ(e.now) + ' J', 13.5, '#c2410c', 19, 800) + 6;
    y += textBlock(RR.x + 14, y, bw, 'E_p(탁자 높이) = ' + f1(m) + ' × ' + G + ' × ' + f1(ht) + ' = ' + eJ(e.tbl) + ' J', 13.5, '#6d28d9', 19, 800) + 6;
    y += textBlock(RR.x + 14, y, bw, 'ΔE_p = ' + eJ(e.now) + ' − ' + eJ(e.tbl) + ' = ' + eJ(e.dE) + ' J (' + f1(p.H - TBL) + ' m 높이 변화)', 13.5, '#0b6b39', 19, 800) + 8;
    textBlock(RR.x + 14, y, bw, '기준면을 바꾸면 E_p의 값은 달라져도 ΔE_p는 변하지 않아요.', 13, '#5a6679', 18, 700);
  }

  const SPX = PHONE ? 205 : 330, SWALL = 34, SL0 = PHONE ? 130 : 210, SGY = MH - 70;
  function drawPotSpring(dt) {
    const p = S.pt, x = p.xs, F = KS * x, E = 0.5 * KS * x * x;
    ctx.fillStyle = '#b6c2d4'; ctx.fillRect(SWALL - 6, SGY, VW - SWALL - 20, 12); ctx.fillStyle = '#8a98ae'; ctx.fillRect(SWALL - 6, SGY, VW - SWALL - 20, 3);
    ctx.fillStyle = '#5a6679'; ctx.fillRect(SWALL - 18, SGY - 80, 14, 92);
    for (let i = 0; i < 6; i++) { ctx.strokeStyle = '#8b97ab'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(SWALL - 18, SGY - 76 + i * 16); ctx.lineTo(SWALL - 30, SGY - 64 + i * 16); ctx.stroke(); }
    const bx0 = SWALL + SL0, bx = bx0 + x * SPX, bw = 56, bh = 44;
    // 눈금 (자연 길이 기준 0)
    ctx.fillStyle = '#6b778c'; ctx.fillRect(bx0 + bw - 0.75, SGY + 12, 1.5, 8); T(bx0 + bw, SGY + 34, '0', 11.5, '#5a6679', 'center', 700);
    for (let i = 1; i <= 6; i++) { const xx = bx0 + bw + i * 0.05 * SPX; ctx.fillRect(xx - 0.75, SGY + 12, 1.5, i % 2 ? 5 : 8); if (i % 2 === 0) T(xx, SGY + 34, f1(i * 0.05), 11.5, '#5a6679', 'center', 700); }
    T(bx0 + bw + 0.3 * SPX + 36, SGY + 34, 'm', 11.5, '#5a6679', 'left', 700);
    // 용수철
    const sx1 = SWALL - 4, sx2 = bx, n = 14, hh = 13;
    ctx.strokeStyle = '#7a8aa6'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(sx1, SGY - bh / 2);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; ctx.lineTo(sx1 + (sx2 - sx1) * t, SGY - bh / 2 + (i % 2 ? hh : -hh)); }
    ctx.lineTo(sx2, SGY - bh / 2); ctx.stroke();
    // 블록과 손잡이
    D.shadow(() => { D.roundRect(bx, SGY - bh, bw, bh, 6); ctx.fillStyle = '#3867f4'; ctx.fill(); }, { blur: 5, y: 2 });
    T(bx + bw / 2, SGY - bh / 2 + 5, '블록', 13, '#fff', 'center', 800);
    ctx.fillStyle = '#d9b48a'; D.roundRect(bx + bw + 8, SGY - bh / 2 - 9, 22, 18, 8); ctx.fill();
    if (x > 0) D.arrow(bx + bw + 30, SGY - bh - 18, bx + bw + 30 + F * (PHONE ? 1.0 : 1.5), SGY - bh - 18, { color: '#f2873a', width: 6, label: '당기는 힘 F = ' + eJ(F) + ' N', labelOffset: -18, labelSize: PHONE ? 12 : 13 });
    D.arrow(bx0 + bw, SGY - bh - 52, bx + bw, SGY - bh - 52, { color: '#14a058', width: 4, label: 'x = ' + x.toFixed(2) + ' m', labelOffset: -16, labelSize: PHONE ? 12 : 13 }); 
    T(16, PHONE ? 24 : 30, '⬆️ 용수철 (k = ' + KS + ' N/m)을 x만큼 늘려요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    parts.update(dt); parts.draw(ctx); endMain();
    // F–x 그래프
    panel(RL.x, RL.y, RL.w, RL.h, 14);
    T(RL.x + 12, RL.y + 22, '힘–늘어난 길이 그래프 (넓이 = 에너지)', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    const gr = { x: RL.x + 48, y: RL.y + 48, w: RL.w - 74, h: RL.h - 48 - (PHONE ? 46 : 54) };
    const ax = drawAxes(gr, { x0: 0, x1: 0.3, y0: 0, y1: 60, xt: 0.1, yt: 20, xfmt: (v) => v.toFixed(1), xl: 'm', yl: 'N' });
    ctx.strokeStyle = '#8b97ab'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(ax.gx(0), ax.gy(0)); ctx.lineTo(ax.gx(0.3), ax.gy(KS * 0.3)); ctx.stroke(); ctx.setLineDash([]);
    if (x > 0) {
      ctx.fillStyle = 'rgba(242,135,58,.4)'; ctx.beginPath(); ctx.moveTo(ax.gx(0), ax.gy(0)); ctx.lineTo(ax.gx(x), ax.gy(F)); ctx.lineTo(ax.gx(x), ax.gy(0)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(ax.gx(0), ax.gy(0)); ctx.lineTo(ax.gx(x), ax.gy(F)); ctx.stroke();
      D.sphere(ax.gx(x), ax.gy(F), 5, '#e2552a', { gloss: false });
    }
    T(RL.x + 12, RL.y + RL.h - 10, '넓이 ½ × ' + eJ(F) + ' N × ' + x.toFixed(2) + ' m = ' + eJ(E) + ' J  (= ½kx²)', PHONE ? 12.5 : 13.5, '#c2410c', 'left', 800);
    // 기록 표
    const rr = p.rows;
    drawTable(RR, '측정 기록 (k = ' + KS + ' N/m)', [
      { h: 'x (m)', w: 1, get: (r2) => r2.x.toFixed(2) }, { h: '힘 F = kx (N)', w: 1.4, get: (r2) => eJ(r2.F) }, { h: '에너지 ½kx² (J)', w: 1.5, get: (r2) => eJ(r2.E), color: '#c2410c' },
    ], rr, PHONE ? 4 : 5, '📏 측정 기록을 눌러 쌓아요');
    const r1 = rr.find((q) => Math.abs(q.x - 0.1) < 1e-9), r2 = rr.find((q) => Math.abs(q.x - 0.2) < 1e-9);
    if (r1 && r2) T(RR.x + RR.w / 2, RR.y + RR.h - 14, 'x가 2배(' + r1.x.toFixed(1) + ' → ' + r2.x.toFixed(1) + ' m)면 에너지는 ' + eJ(r2.E / r1.E) + '배 (' + eJ(r1.E) + ' → ' + eJ(r2.E) + ' J)', PHONE ? 12 : 13, '#0b6b39', 'center', 800);
  }
  function potRecord() {
    const p = S.pt, x = p.xs; if (x <= 0) { showHint('x가 0이면 에너지도 0이에요. 용수철을 늘려 보세요.'); return; }
    if (p.rows.some((r) => Math.abs(r.x - x) < 1e-9)) { showHint('이미 기록한 길이예요. 다른 길이로 해 보세요.'); return; }
    p.rows.push({ x, F: KS * x, E: 0.5 * KS * x * x }); if (p.rows.length > 8) p.rows.shift();
    Sound.success(); parts.burst(SWALL + SL0 + 56 + x * SPX, SGY - 60, { count: 10, speed: 100, size: 3, colors: ['#ffb400', '#3867f4'], gravity: 160 }); updateCtl();
  }
  function drawPot(dt) {
    bgData(); beginMain(); bgMain();
    if (S.pt.sub === 'grav') drawPotGrav(dt); else drawPotSpring(dt);
  }

  /* =====================================================
     ③ 역학적 에너지 보존: 낙하·비탈, 용수철 발사
     ===================================================== */
  const TS_FALL = 0.6, TS_LAUNCH = 0.8;
  function fallParams(c) {
    const P = PATHS[c.path], th = P.ang * Math.PI / 180, mu = c.fric && c.path !== 'drop' ? MU : 0;
    const a = G * Math.sin(th) - mu * G * Math.cos(th), Lr = H0 / Math.sin(th), t1 = Math.sqrt(2 * Lr / a);
    return { th, mu, a, Lr, t1, v1: a * t1 };
  }
  function newFall() { const c = S.cv; c.f = { st: 'ready', t: 0, rec: false }; updateCtl(); }
  function resetCv(keepSub) {
    const p = S.cv;
    S.cv = { sub: keepSub && p ? p.sub : 'fall', m: 0.5, path: 'drop', fric: false, x: 0.2, rows: [], lrows: [], f: null, l: null };
    newFall(); newLaunchCv();
  }
  function fallGo() { const f = S.cv.f; if (f.st !== 'ready') return false; f.st = 'go'; f.t = 0; Sound.click(); updateCtl(); return true; }
  function fallEval(c) {
    const P = fallParams(c), f = c.f, t = f.t;
    if (t < P.t1) { const s = 0.5 * P.a * t * t; return { phase: 'ramp', s, v: P.a * t, h: H0 - s * Math.sin(P.th), x2: 0, P }; }
    const t2 = t - P.t1;
    if (c.path === 'drop') return { phase: 'floor', s: P.Lr, v: 0, h: 0, x2: 0, P };
    const vv = Math.max(0, P.v1 - P.mu * G * t2), tt = P.mu > 0 ? Math.min(t2, P.v1 / (P.mu * G)) : t2;
    return { phase: 'floor', s: P.Lr, v: vv, h: 0, x2: P.v1 * tt - 0.5 * P.mu * G * tt * tt, P };
  }
  function stepFall(dt) {
    const c = S.cv, f = c.f; if (f.st !== 'go') return;
    const P = fallParams(c); f.t += dt * TS_FALL;
    if (!f.rec && f.t >= P.t1) {
      f.rec = true; const ek = 0.5 * c.m * P.v1 * P.v1;
      c.rows.push({ m: c.m, path: c.path, fric: P.mu > 0, v: P.v1, E: ek }); if (c.rows.length > 10) c.rows.shift();
      Sound.tick(); parts.burst(FALLX0 + FALLSPAN[c.path] * 1 + 6, FALLFY - 8, { count: 10, speed: 90, size: 2.6, colors: ['#ffb400', '#fff'], gravity: 120 }); updateCtl();
    }
    if (f.t >= P.t1 + 0.55) { f.st = 'done'; Sound.success(); updateCtl(); }
  }
  const FPPM = PHONE ? 100 : 135, FALLFY = MH - 64, FALLX0 = PHONE ? 70 : 110;
  const FALLSPAN = { get drop() { return 0; }, get gentle() { return H0 / Math.tan(20 * Math.PI / 180) * FPPM; }, get steep() { return H0 / Math.tan(40 * Math.PI / 180) * FPPM; } };
  function drawFall(dt) {
    const c = S.cv, f = c.f, ev = fallEval(c), P = ev.P, r = 8 + 5 * Math.sqrt(c.m);
    const topY = FALLFY - H0 * FPPM, x0 = FALLX0;
    ctx.fillStyle = '#b6c2d4'; ctx.fillRect(24, FALLFY, VW - 48, 12); ctx.fillStyle = '#8a98ae'; ctx.fillRect(24, FALLFY, VW - 48, 3);
    // 높이 눈금: 0.8 m
    ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(28, topY); ctx.lineTo(x0 + (PHONE ? 80 : 120), topY); ctx.stroke(); ctx.setLineDash([]);
    D.arrow(40, FALLFY - 2, 40, topY + 2, { color: '#5a6679', width: 3, head: 9 });
    D.label(40, (FALLFY + topY) / 2, '0.8 m', { bg: '#fff', color: '#26324a', size: 12.5, border: '#c3ccd9' });
    let bx, by, endX = x0;
    if (c.path === 'drop') {
      ctx.fillStyle = '#9aa5b8'; ctx.fillRect(x0 - 2, topY - 8, 4, FALLFY - topY + 8);
      ctx.fillStyle = '#7b889e'; D.roundRect(x0 - 18, topY - 14, 36, 8, 3); ctx.fill();
      endX = x0;
      if (ev.phase === 'ramp') { bx = x0; by = topY + ev.s * FPPM - r; if (f.st === 'ready') by = topY - r; } else { bx = x0; by = FALLFY - r; }
      if (f.st === 'ready') by = topY - r;
    } else {
      const th = P.th, run = H0 / Math.tan(th) * FPPM;
      ctx.beginPath(); ctx.moveTo(x0, topY); ctx.lineTo(x0 + run, FALLFY); ctx.lineTo(x0, FALLFY); ctx.closePath();
      const g = ctx.createLinearGradient(0, topY, 0, FALLFY); g.addColorStop(0, c.fric ? '#d6b98f' : '#c9d3e3'); g.addColorStop(1, c.fric ? '#a98657' : '#9aa8c0'); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = c.fric ? '#7a5a2e' : '#6f7d97'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, topY); ctx.lineTo(x0 + run, FALLFY); ctx.stroke();
      if (c.fric) { ctx.strokeStyle = 'rgba(90,60,25,.55)'; ctx.lineWidth = 2; for (let i = 1; i < 12; i++) { const t = i / 12, px = x0 + run * t, py = topY + (FALLFY - topY) * t; ctx.beginPath(); ctx.moveTo(px - 3, py + 3); ctx.lineTo(px + 3, py - 3); ctx.stroke(); } }
      endX = x0 + run;
      const nx = Math.sin(th), ny = -Math.cos(th);
      if (f.st === 'ready' || ev.phase === 'ramp') { const s = f.st === 'ready' ? 0 : ev.s; bx = x0 + s * Math.cos(th) * FPPM + nx * r; by = topY + s * Math.sin(th) * FPPM + ny * r; }
      else { bx = endX + ev.x2 * FPPM; by = FALLFY - r; }
    }
    // 공
    const rc = c.m >= 1 ? '#8b5cf6' : '#e2464b';
    D.sphere(bx, by, r, rc, { shadow: true }); T(bx, by + 4, f1(c.m), 11, '#fff', 'center', 800);
    // 속도 표시
    if (f.st !== 'ready') D.label(clamp(bx, 90, VW - 90), Math.max(by - r - 20, 78), 'v = ' + f2(ev.v) + ' m/s', { bg: '#14a058', size: PHONE ? 12 : 13.5 });
    T(16, PHONE ? 24 : 30, '🔁 ' + f1(c.m) + ' kg 공을 ' + PATHS[c.path].name + '으로 내려 보내요' + (c.fric && c.path !== 'drop' ? ' (마찰 켜짐)' : ''), PHONE ? 13.5 : 17, '#26324a', 'left', 800);
    if (f.st === 'ready') T(VW / 2 + 40, PHONE ? 62 : 70, '▶ 놓기를 눌러 보세요', 14.5, '#5a6679', 'center', 800);
    if (f.st !== 'ready') D.label(VW - (PHONE ? 66 : 84), PHONE ? 52 : 58, '🐌 ' + TS_FALL + '배속', { bg: '#26324a', size: 12.5 });
    if (f.rec) { const row = c.rows[c.rows.length - 1]; D.label(clamp(endX + (c.path === 'drop' ? 70 : 40), 100, VW - 120), FALLFY + 34, '바닥 속력 ' + f2(row.v) + ' m/s', { bg: '#26324a', size: 12.5 }); }
    parts.update(dt); parts.draw(ctx); endMain();
    // 에너지 막대
    const ek = 0.5 * c.m * ev.v * ev.v, ep = c.m * G * ev.h;
    const hi = Math.max(1, c.m * G * H0 * 1.12);
    drawEBars(RL, '에너지 막대 (J)', [
      { label: '운동 에너지', color: '#3867f4', val: f.st === 'ready' ? 0 : ek },
      { label: '중력 위치 E', color: '#e2552a', val: f.st === 'ready' ? c.m * G * H0 : ep },
      { label: '탄성 위치 E', color: '#8b5cf6', val: 0 },
      { label: '역학적 에너지 합', color: '#14a058', val: f.st === 'ready' ? c.m * G * H0 : ek + ep, ghost: c.m * G * H0 },
    ], 0, hi, 'J', { labW: 70 });
    if (!PHONE) {
      const rr = { x: RR.x, y: RR.y, w: RR.w, h: RR.h };
      drawTable(rr, '바닥에서의 속력 (높이 0.8 m에서 출발)', [
        { h: '질량', w: 0.8, get: (x) => f1(x.m) + ' kg' }, { h: '경로', w: 1.5, get: (x) => PATHS[x.path].name }, { h: '마찰', w: 0.7, get: (x) => (x.fric ? '켜짐' : '없음') },
        { h: '바닥 속력', w: 1.1, get: (x) => f2(x.v) + ' m/s', color: '#0b6b39' }, { h: '바닥 E합', w: 1, get: (x) => eJ(x.E) + ' J', color: '#1d4ed8' },
      ], c.rows, 4, '놓기를 눌러 측정해요');
      if (c.fric) textBlock(RR.x + 14, RR.y + RR.h - 38, RR.w - 28, '마찰이 있으면 합이 줄어요. 줄어든 에너지는 어디로 갔을까요? (다음 차시에서 알아봐요)', 12.5, '#a3262b', 17, 800);
    } else {
      drawTable(RR, '바닥에서의 속력', [
        { h: '질량', w: 0.8, get: (x) => f1(x.m) + ' kg' }, { h: '경로', w: 1.5, get: (x) => PATHS[x.path].name }, { h: '마찰', w: 0.7, get: (x) => (x.fric ? '켜짐' : '없음') }, { h: '바닥 속력', w: 1.1, get: (x) => f2(x.v) + ' m/s', color: '#0b6b39' },
      ], c.rows, 3, '놓기를 눌러 측정해요');
    }
  }

  /* ---- 용수철 발사 엔진 (③ 용수철, ④ 선반) ---- */
  const LPPM = PHONE ? 165 : 300, LFY = MH - 46, LWALL = 36, LNAT = 0.55, LGAP = 0.12, LW = Math.sqrt(LK.k / LK.m);
  function launchInit(x0, shelf) {
    const L = { x0, shelf, st: 'ready', t: 0 };
    const v0 = x0 * LW, gs = G * SIN_L, Ls = shelf != null ? shelf / SIN_L : 1.0, sp = v0 * v0 / (2 * gs);
    L.v0 = v0; L.gs = gs; L.Ls = Ls; L.sp = sp; L.ts = Math.PI / (2 * LW); L.tf = LGAP / v0;
    L.reach = shelf != null && sp >= Ls - 1e-9;
    L.ti = L.reach ? (v0 - Math.sqrt(Math.max(0, v0 * v0 - 2 * gs * Ls))) / gs : v0 / gs;
    L.send = L.reach ? Ls : sp; L.hend = L.send * SIN_L; L.T = L.ts + L.tf + L.ti;
    return L;
  }
  function launchEval(L) {
    const t = Math.min(L.t, L.T);
    if (t < L.ts) return { phase: 'spring', pos: -L.x0 * Math.cos(LW * t), s: 0, v: L.x0 * LW * Math.sin(LW * t) };
    if (t < L.ts + L.tf) return { phase: 'flat', pos: (t - L.ts) * L.v0, s: 0, v: L.v0 };
    const tt = t - L.ts - L.tf;
    return { phase: 'incline', pos: LGAP, s: Math.min(L.send, L.v0 * tt - 0.5 * L.gs * tt * tt), v: Math.max(0, L.v0 - L.gs * tt) };
  }
  const launchE = (L) => { const e = launchEval(L), comp = Math.max(0, -e.pos), h = e.s * SIN_L; return { e, ek: 0.5 * LK.m * e.v * e.v, epg: LK.m * G * h, epe: 0.5 * LK.k * comp * comp, h }; };
  function stepLaunch(L, dt, onDone) {
    if (!L || L.st !== 'go') return;
    L.t += dt * TS_LAUNCH;
    if (L.t >= L.T) { L.t = L.T; L.st = 'done'; onDone && onDone(L); }
  }
  function newLaunchCv() { const c = S.cv; c.l = launchInit(c.x, null); updateCtl(); }
  function launchGoCv() {
    const c = S.cv; if (c.l.st === 'done') { newLaunchCv(); return false; } if (c.l.st !== 'ready') return false;
    c.l.st = 'go'; Sound.click(); updateCtl(); return true;
  }
  function launchDoneCv(L) {
    const c = S.cv; c.lrows.push({ x: L.x0, E: 0.5 * LK.k * L.x0 * L.x0, h: L.hend }); if (c.lrows.length > 8) c.lrows.shift(); Sound.success();
    parts.burst(LWALL + (LNAT + LGAP) * LPPM + L.send * COS_L * LPPM + 20, LFY - L.send * SIN_L * LPPM - 20, { count: 12, speed: 100, size: 3, colors: ['#ffb400', '#14a058'], gravity: 140 }); updateCtl();
  }
  /* 용수철 발사 장면 그리기 (shelf: null 또는 선반 높이) */
  function drawLaunchScene(L, opt) {
    opt = opt || {};
    const xn = LWALL + LNAT * LPPM, xi = xn + LGAP * LPPM, lend = L.Ls;
    const E = launchE(L), e = E.e, rb = 11;
    // 바닥과 벽
    ctx.fillStyle = '#b6c2d4'; ctx.fillRect(LWALL - 8, LFY, VW - LWALL - 12, 12); ctx.fillStyle = '#8a98ae'; ctx.fillRect(LWALL - 8, LFY, VW - LWALL - 12, 3);
    ctx.fillStyle = '#5a6679'; ctx.fillRect(LWALL - 20, LFY - 70, 14, 82);
    // 비탈
    const tx = xi + lend * COS_L * LPPM, ty = LFY - lend * SIN_L * LPPM;
    ctx.beginPath(); ctx.moveTo(xi, LFY); ctx.lineTo(tx, ty); ctx.lineTo(tx, LFY); ctx.closePath();
    const g = ctx.createLinearGradient(0, ty, 0, LFY); g.addColorStop(0, '#cfd8e8'); g.addColorStop(1, '#9aa8c0'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#6f7d97'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xi, LFY); ctx.lineTo(tx, ty); ctx.stroke();
    if (L.shelf != null) {
      const sw = PHONE ? 70 : 150;
      D.shadow(() => { ctx.fillStyle = '#c2a073'; ctx.fillRect(tx, ty, sw, LFY - ty); }, { blur: 5, y: 2 });
      ctx.fillStyle = '#8f6b3d'; ctx.fillRect(tx, ty - 3, sw, 6);
      T(tx + sw / 2, ty + 28, '선반 ' + eJ(L.shelf) + ' m', PHONE ? 12 : 14, '#fff', 'center', 800, { stroke: '#8f6b3d', strokeWidth: 3 });
      ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(xi - 10, ty); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
    }
    // 높이 눈금자
    const rx = (L.shelf != null ? tx + (PHONE ? 80 : 160) : tx + 26);
    ctx.fillStyle = '#7b889e'; ctx.fillRect(rx - 1, LFY - 0.5 * LPPM, 2.5, 0.5 * LPPM);
    for (let h = 0; h <= 0.5 + 1e-9; h += 0.1) { const y = LFY - h * LPPM; ctx.fillRect(rx - 6, y - 0.75, 12, 1.5); T(rx + 10, y + 4, h.toFixed(1), 11.5, '#5a6679', 'left', 800); }
    T(rx + 2, LFY - 0.5 * LPPM - 12, '높이(m)', 11.5, '#5a6679', 'center', 800);
    // 공 위치
    let cx, cy;
    if (e.phase === 'incline') { cx = xi + e.s * COS_L * LPPM - SIN_L * rb; cy = LFY - e.s * SIN_L * LPPM - COS_L * rb; }
    else { cx = xn + e.pos * LPPM; cy = LFY - rb; }
    // 용수철
    const sx1 = LWALL - 6, sx2 = Math.min(xn + e.pos * LPPM - rb, xn), n = 12, hh = 9;
    ctx.strokeStyle = '#7a8aa6'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(sx1, LFY - rb);
    const sxe = e.phase === 'spring' || L.st === 'ready' ? xn + (L.st === 'ready' ? -L.x0 : e.pos) * LPPM - rb : xn - rb;
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; ctx.lineTo(sx1 + (sxe - sx1) * t, LFY - rb + (i % 2 ? hh : -hh)); }
    ctx.lineTo(sxe, LFY - rb); ctx.stroke();
    // 압축 표시 (자연 길이 위치)
    ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(xn, LFY - 56); ctx.lineTo(xn, LFY + 6); ctx.stroke(); ctx.setLineDash([]);
    T(xn, LFY + 34, '자연 길이', 11.5, '#0b6b39', 'center', 800);
    if (L.st === 'ready' || e.phase === 'spring') { const cp = Math.max(0, -e.pos); if (cp > 0.005) D.label(xn + 4 - cp * LPPM / 2, LFY - 70, 'x = ' + (Math.round(cp * 100) / 100).toFixed(2) + ' m', { bg: '#14a058', size: 12 }); }
    D.sphere(cx, cy, rb, '#e2464b', { shadow: true });
    if (L.st !== 'ready') D.label(clamp(cx, 80, VW - 90), Math.max(cy - 34, 76), 'v = ' + f2(e.v) + ' m/s', { bg: '#14a058', size: PHONE ? 12 : 13 });
    // 최고 높이 표시
    if (L.st === 'done') {
      const hy = LFY - L.hend * LPPM;
      ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(xi - 6, hy); ctx.lineTo(rx - 4, hy); ctx.stroke(); ctx.setLineDash([]);
      D.label(xi + 40, hy - 14, (L.shelf != null && L.reach ? '선반에 도착! ' : '최고 높이 ') + eJ(L.hend) + ' m', { bg: L.shelf != null && !L.reach ? '#c0392b' : '#e2552a', size: PHONE ? 12 : 13 });
    }
    return E;
  }
  function drawLaunchBars(L, E, rr) {
    const E0 = 0.5 * LK.k * L.x0 * L.x0, hi = Math.max(1, E0 * 1.15);
    const ek = L.st === 'ready' ? 0 : E.ek, epg = L.st === 'ready' ? 0 : E.epg, epe = L.st === 'ready' ? E0 : E.epe;
    drawEBars(rr, '에너지 막대 (J)', [
      { label: '운동 에너지', color: '#3867f4', val: ek },
      { label: '중력 위치 E', color: '#e2552a', val: epg },
      { label: '탄성 위치 E', color: '#8b5cf6', val: epe },
      { label: '역학적 에너지 합', color: '#14a058', val: ek + epg + epe, ghost: E0 },
    ], 0, hi, 'J', { labW: 70 });
  }
  function drawLaunchCv(dt) {
    const c = S.cv, L = c.l;
    T(16, PHONE ? 24 : 30, '🔁 용수철 k = ' + LK.k + ' N/m로 ' + LK.m + ' kg 공을 쏘아요 (마찰 없음)', PHONE ? 13 : 17, '#26324a', 'left', 800);
    const E = drawLaunchScene(L);
    if (L.st === 'ready') T(VW / 2 + 60, PHONE ? 62 : 70, '▶ 발사를 눌러 보세요', 14.5, '#5a6679', 'center', 800);
    if (L.st !== 'ready') D.label(VW - (PHONE ? 66 : 84), PHONE ? 52 : 58, '🐌 ' + TS_LAUNCH + '배속', { bg: '#26324a', size: 12.5 });
    parts.update(dt); parts.draw(ctx); endMain();
    drawLaunchBars(L, E, RL);
    drawTable(RR, '용수철로 쏜 기록', [
      { h: '압축 x (m)', w: 1, get: (r2) => r2.x.toFixed(2) }, { h: '처음 탄성 E (J)', w: 1.3, get: (r2) => eJ(r2.E) }, { h: '최고 높이 (m)', w: 1.2, get: (r2) => eJ(r2.h), color: '#c2410c' },
    ], c.lrows, PHONE ? 4 : 5, '발사하면 기록이 쌓여요');
  }
  function drawCv(dt) {
    bgData(); beginMain(); bgMain();
    if (S.cv.sub === 'fall') drawFall(dt); else drawLaunchCv(dt);
  }

  /* =====================================================
     ④ 속력 예측: 선반 올리기(용수철), 루프 통과
     ===================================================== */
  const LOOP_SIN = Math.SQRT1_2, LOOPPM = PHONE ? 105 : 190, LOOPFY = MH - 40, LOOPX = PHONE ? 300 : 520, LRB = PHONE ? 5 : 7, TS_LOOP = 0.7;
  function resetAp(keepSub) {
    const p = S.ap;
    S.ap = { sub: keepSub && p ? p.sub : 'shelf', sx: 0.25, lh: 0.5, srows: [], lrows: [], sl: null, lp: null };
    newShelf(); newLoop();
  }
  function newShelf() { const a = S.ap; a.sl = launchInit(a.sx, SHELF); updateCtl(); }
  function shelfGo() {
    const a = S.ap; if (a.sl.st === 'done') { newShelf(); return false; } if (a.sl.st !== 'ready') return false;
    a.sl.st = 'go'; Sound.click(); updateCtl(); return true;
  }
  function shelfDone(L) {
    const a = S.ap; a.srows.push({ x: L.x0, E: 0.5 * LK.k * L.x0 * L.x0, reach: L.reach, h: L.reach ? SHELF : L.hend }); if (a.srows.length > 8) a.srows.shift();
    if (L.reach) { Sound.success(); } else Sound.fail();
    parts.burst(LWALL + (LNAT + LGAP) * LPPM + L.send * COS_L * LPPM + 20, LFY - L.send * SIN_L * LPPM - 20, { count: L.reach ? 18 : 6, speed: 110, size: 3, colors: L.reach ? ['#ffb400', '#14a058', '#3867f4'] : ['#e2464b'], gravity: 140 }); updateCtl();
  }
  /* ---- 루프 엔진 (에너지 보존으로 속력을 구하고, 꼭대기에서 속력이 부족하면 레일에서 떨어져요) ---- */
  function loopInit(h) {
    const hv = Math.round(h * 100) / 100;
    return { h: hv, st: 'ready', phase: 'ramp', t: 0, s: 0, v: 0, fl: 0, phi: 0, x: 0, y: 0, vx: 0, vy: 0, res: null, tex: 0, Lr: hv / LOOP_SIN, vb: Math.sqrt(2 * G * hv), a: G * LOOP_SIN, exitX: 0 };
  }
  function newLoop() { const a = S.ap; a.lp = loopInit(a.lh); updateCtl(); }
  function loopGo() {
    const a = S.ap; if (a.lp.st === 'done') { newLoop(); return false; } if (a.lp.st !== 'ready') return false;
    a.lp.st = 'go'; Sound.click(); updateCtl(); return true;
  }
  const loopTopV2 = (h) => Math.max(0, 2 * G * (h - 2 * LOOP_R));
  const loopPasses = (h) => 2 * G * h / LOOP_R - 2 * G + 3 * G * Math.cos(Math.PI) >= -1e-9 && h >= 2.5 * LOOP_R - 1e-9;
  function stepLoop(dt) {
    const L = S.ap.lp; if (!L || L.st !== 'go') return;
    let left = dt * TS_LOOP;
    while (left > 1e-9 && L.st === 'go') {
      const h = Math.min(left, 0.002); left -= h;
      if (L.phase === 'ramp') {
        L.t += h; L.s = 0.5 * L.a * L.t * L.t; L.v = L.a * L.t;
        if (L.s >= L.Lr) { L.s = L.Lr; L.v = L.vb; L.phase = 'flat'; L.fl = 0; }
      } else if (L.phase === 'flat') {
        L.fl += L.vb * h; L.v = L.vb;
        if (L.fl >= LOOP_FLAT) { L.fl = LOOP_FLAT; L.phase = 'loop'; L.phi = 0; }
      } else if (L.phase === 'loop') {
        const v2 = 2 * G * (L.h - LOOP_R * (1 - Math.cos(L.phi)));
        if (v2 < 1e-4) { L.res = 'back'; L.st = 'done'; L.v = 0; Sound.fail(); finishLoop(L); break; }
        const N = v2 / LOOP_R + G * Math.cos(L.phi);
        if (N < -1e-9 && L.phi > Math.PI / 2) {
          const sp = Math.sqrt(v2); L.phase = 'fly'; L.x = LOOP_R * Math.sin(L.phi); L.y = LOOP_R * (1 - Math.cos(L.phi)); L.vx = sp * Math.cos(L.phi); L.vy = sp * Math.sin(L.phi); L.v = sp; continue;
        }
        L.v = Math.sqrt(v2); L.phi += L.v / LOOP_R * h; L.x = LOOP_R * Math.sin(L.phi); L.y = LOOP_R * (1 - Math.cos(L.phi));
        if (L.phi >= TAU) { L.phase = 'exit'; L.exitX = 0; L.x = 0; L.y = 0; L.res = 'pass'; Sound.success(); }
      } else if (L.phase === 'fly') {
        L.x += L.vx * h; L.y += L.vy * h; L.vy -= G * h; L.v = Math.hypot(L.vx, L.vy);
        if (Math.hypot(L.x, L.y - LOOP_R) >= LOOP_R || L.y <= 0) { L.res = 'fall'; L.st = 'done'; Sound.fail(); finishLoop(L); }
      } else if (L.phase === 'exit') {
        L.exitX += L.vb * h; L.t += h; L.v = L.vb;
        const lim = (VW - 30 - LOOPX) / LOOPPM;
        if (L.exitX >= lim) { L.exitX = lim; L.st = 'done'; finishLoop(L); }
        else if (L.t > 99) L.st = 'done';
      }
    }
  }
  function finishLoop(L) {
    const a = S.ap; const pass = L.res === 'pass';
    a.lrows.push({ h: L.h, pass, res: L.res }); if (a.lrows.length > 8) a.lrows.shift();
    const px = LOOPX + L.x * LOOPPM, py = LOOPFY - LRB - L.y * LOOPPM;
    parts.burst(pass ? Math.min(LOOPX + L.exitX * LOOPPM, VW - 20) : px, pass ? LOOPFY - 20 : py, { count: pass ? 18 : 8, speed: 110, size: 3, colors: pass ? ['#ffb400', '#14a058', '#3867f4'] : ['#e2464b', '#ffb400'], gravity: 140 }); updateCtl();
  }
  function loopBall(L) {
    const th = Math.PI / 4;
    const ex = LOOPX - LOOP_FLAT * LOOPPM;
    if (L.phase === 'flat') return { x: ex + L.fl * LOOPPM, y: LOOPFY - LRB, h: 0 };
    if (L.phase === 'ramp') {
      const sx = ex - L.h * LOOPPM, sy = LOOPFY - L.h * LOOPPM;
      return { x: sx + L.s * LOOPPM * Math.cos(th) - LRB * Math.sin(th), y: sy + L.s * LOOPPM * Math.sin(th) - LRB * Math.cos(th), h: L.h - L.s * LOOP_SIN };
    }
    if (L.phase === 'exit') return { x: LOOPX + L.exitX * LOOPPM, y: LOOPFY - LRB, h: 0 };
    return { x: LOOPX + L.x * LOOPPM, y: LOOPFY - LRB - L.y * LOOPPM, h: L.y };
  }
  function drawLoopScene(dt) {
    const a = S.ap, L = a.lp;
    T(16, PHONE ? 24 : 30, '🎢 루프(반지름 ' + LOOP_R + ' m) 꼭대기를 통과해요 (마찰 없음)', PHONE ? 13 : 17, '#26324a', 'left', 800);
    const ex = LOOPX - LOOP_FLAT * LOOPPM, sx = ex - L.h * LOOPPM, sy = LOOPFY - L.h * LOOPPM;
    // 바닥
    ctx.fillStyle = '#b6c2d4'; ctx.fillRect(Math.max(14, sx - 40), LOOPFY, VW - Math.max(14, sx - 40) - 14, 12); ctx.fillStyle = '#8a98ae'; ctx.fillRect(Math.max(14, sx - 40), LOOPFY, VW - Math.max(14, sx - 40) - 14, 3);
    // 비탈 (45°)
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, LOOPFY); ctx.lineTo(sx, LOOPFY); ctx.closePath();
    const g = ctx.createLinearGradient(0, sy, 0, LOOPFY); g.addColorStop(0, '#cfd8e8'); g.addColorStop(1, '#9aa8c0'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#6f7d97'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, LOOPFY); ctx.stroke();
    // 루프 레일
    const cy0 = LOOPFY - LRB - LOOP_R * LOOPPM, rr = LOOP_R * LOOPPM + LRB + 2;   // 레일 안쪽 면이 공(반지름 LRB+2)에 닿도록
    ctx.strokeStyle = '#7a8aa6'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(LOOPX, cy0, rr + 3, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(LOOPX, cy0, rr, 0, TAU); ctx.stroke();
    // 꼭대기 높이 표시와 출발 높이
    const topH = 2 * LOOP_R, ty = LOOPFY - LRB - topH * LOOPPM;   // 공 중심이 꼭대기에 있을 때의 높이
    ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(Math.max(20, sx - 30), ty); ctx.lineTo(LOOPX + rr + 10, ty); ctx.stroke(); ctx.setLineDash([]);
    T(LOOPX + rr + 14, ty + 4, '꼭대기 높이 ' + f1(topH) + ' m', 12, '#8a6b00', 'left', 800);
    D.arrow(sx - 14, LOOPFY - 2, sx - 14, sy + 2, { color: '#3867f4', width: 3.5, head: 9 });
    D.label(Math.max(sx - 14, 44), (LOOPFY + sy) / 2, 'h = ' + f1(L.h) + ' m', { bg: '#3867f4', size: PHONE ? 12 : 13 });
    // 공
    const b = loopBall(L);
    if (L.phase === 'fly' || (L.res === 'fall')) { ctx.strokeStyle = 'rgba(226,70,75,.5)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, 14, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    D.sphere(b.x, b.y, LRB + 2, '#e2464b', { shadow: true });
    if (L.st !== 'ready') D.label(clamp(b.x + 54, 70, VW - 70), clamp(b.y - 16, 60, MH - 80), 'v = ' + f2(L.v) + ' m/s', { bg: '#14a058', size: PHONE ? 12 : 13 });
    if (L.st === 'ready') T(VW / 2 + (PHONE ? 20 : 60), PHONE ? 62 : 70, '▶ 굴리기를 눌러 보세요', 14.5, '#5a6679', 'center', 800);
    if (L.st === 'done') D.label(VW / 2 + (PHONE ? 10 : 40), PHONE ? 62 : 72, L.res === 'pass' ? '✅ 꼭대기를 통과했어요!' : L.res === 'fall' ? '❌ 꼭대기 근처에서 레일을 벗어나 떨어졌어요' : '❌ 꼭대기까지 올라가지 못하고 되돌아와요', { bg: L.res === 'pass' ? '#14a058' : '#c0392b', size: 13 });
    parts.update(dt); parts.draw(ctx); endMain();
    // 데이터
    const hh = b.h, ek = 0.5 * 1 * L.v * L.v, ep = 1 * G * hh;   // 공 1 kg 기준(질량 무관: 단위 질량당 에너지)
    const E0 = G * L.h;
    drawEBars(RL, '에너지 막대 (공 1 kg 기준, J)', [
      { label: '운동 에너지', color: '#3867f4', val: L.st === 'ready' ? 0 : ek },
      { label: '중력 위치 E', color: '#e2552a', val: L.st === 'ready' ? E0 : ep },
      { label: '역학적 에너지 합', color: '#14a058', val: L.st === 'ready' ? E0 : ek + ep, ghost: E0 },
    ], 0, 11, 'J', { labW: 70 });
    panel(RR.x, RR.y, RR.w, RR.h, 14);
    T(RR.x + 12, RR.y + 22, '꼭대기에서의 속력', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let y = RR.y + 46; const bw = RR.w - 28;
    y += textBlock(RR.x + 14, y, bw, '꼭대기 높이 2R = ' + f1(topH) + ' m, 출발 높이 h = ' + f1(L.h) + ' m', 13.5, '#26324a', 19, 800) + 4;
    const v2 = loopTopV2(L.h);
    y += textBlock(RR.x + 14, y, bw, L.h <= topH + 1e-9 ? '출발 높이가 꼭대기보다 높지 않아서 꼭대기에 닿지 못해요.' : '꼭대기 속력(에너지 보존) = √(2 × ' + G + ' × (' + f1(L.h) + ' − ' + f1(topH) + ')) = ' + f2(Math.sqrt(v2)) + ' m/s', 13.5, '#0b6b39', 19, 800) + 4;
    textBlock(RR.x + 14, y, bw, '꼭대기에서 속력이 0이면 안 돼요. 속력이 충분하지 않으면 레일에서 떨어져요.', 13, '#5a6679', 18, 700);
    if (!PHONE || true) {
      const rows = a.lrows.slice(-3);
      rows.forEach((r2, i) => T(RR.x + 14, RR.y + RR.h - 12 - (rows.length - 1 - i) * 18, '시도 h = ' + f1(r2.h) + ' m → ' + (r2.pass ? '통과 ✅' : '실패 ❌'), 13, r2.pass ? '#0b6b39' : '#a3262b', 'left', 800));
    }
  }
  function drawShelfScene(dt) {
    const a = S.ap, L = a.sl;
    T(16, PHONE ? 24 : 30, '🎯 용수철(k = ' + LK.k + ' N/m)로 ' + LK.m + ' kg 공을 선반 ' + eJ(SHELF) + ' m에 올려요', PHONE ? 12.5 : 17, '#26324a', 'left', 800);
    const E = drawLaunchScene(L);
    if (L.st === 'ready') T(VW / 2 + 40, PHONE ? 62 : 70, '▶ 발사를 눌러 보세요', 14.5, '#5a6679', 'center', 800);
    if (L.st === 'done') D.label(VW / 2 + (PHONE ? 10 : 70), PHONE ? 62 : 72, L.reach ? '✅ 선반에 올라갔어요!' : '❌ 선반까지 못 올라가요 (최고 ' + eJ(L.hend) + ' m)', { bg: L.reach ? '#14a058' : '#c0392b', size: 13 });
    parts.update(dt); parts.draw(ctx); endMain();
    drawLaunchBars(L, E, RL);
    panel(RR.x, RR.y, RR.w, RR.h, 14);
    T(RR.x + 12, RR.y + 22, '예측해 보기', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let y = RR.y + 46; const bw = RR.w - 28, E0 = 0.5 * LK.k * L.x0 * L.x0, need = LK.m * G * SHELF;
    y += textBlock(RR.x + 14, y, bw, '탄성 에너지 ½kx² = ½ × ' + LK.k + ' × ' + L.x0.toFixed(2) + '² = ' + eJ(E0) + ' J', 13.5, '#6d28d9', 19, 800) + 4;
    y += textBlock(RR.x + 14, y, bw, '선반까지 필요한 중력 에너지 mgh = ' + LK.m + ' × ' + G + ' × ' + eJ(SHELF) + ' = ' + eJ(need) + ' J', 13.5, '#c2410c', 19, 800) + 4;
    y += textBlock(RR.x + 14, y, bw, E0 >= need - 1e-9 ? '에너지가 충분해요. 선반에 도착해요.' : '에너지가 ' + eJ(need - E0) + ' J 부족해요. 최고 높이 = ' + eJ(E0 / (LK.m * G)) + ' m', 13.5, E0 >= need - 1e-9 ? '#0b6b39' : '#a3262b', 19, 800) + 6;
    a.srows.slice(-3).forEach((r2, i, arr) => T(RR.x + 14, RR.y + RR.h - 12 - (arr.length - 1 - i) * 18, '시도 x = ' + r2.x.toFixed(2) + ' m → ' + (r2.reach ? '선반 도착 ✅' : '최고 ' + eJ(r2.h) + ' m ❌'), 13, r2.reach ? '#0b6b39' : '#a3262b', 'left', 800));
  }
  function drawAp(dt) {
    bgData(); beginMain(); bgMain();
    if (S.ap.sub === 'shelf') drawShelfScene(dt); else drawLoopScene(dt);
  }

  /* ---------- 컨트롤 연결 ---------- */
  const curSub = () => (S.mode === 'potential' ? S.pt.sub : S.mode === 'conserve' ? S.cv.sub : S.mode === 'apply' ? S.ap.sub : '');
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-sub')) on = n.getAttribute('data-sub').split(' ').indexOf(curSub()) >= 0;
      if (on && n.hasAttribute('data-hin')) on = S.showHIn;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const w = S.w;
    if (w) {
      const busy = w.st === 'go';
      $('#sF').value = w.F; $('#oF').textContent = w.F + ' N'; $('#sF').style.setProperty('--pct', (w.F / BOX.FMAX * 100) + '%');
      $('#sS').value = w.s; $('#oS').textContent = w.s + ' m'; $('#sS').style.setProperty('--pct', (w.s / BOX.SMAX * 100) + '%');
      $$('#frSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.f === '1') === w.fr));
      $$('#sF, #sS, #frSeg button').forEach((b) => (b.disabled = busy));
      $('#bWork').disabled = busy; $('#bWork').textContent = w.st === 'done' ? '↺ 다시' : '▶ 밀기';
    }
    const p = S.pt;
    if (p) {
      $$('#potSub button').forEach((b) => b.classList.toggle('on', b.dataset.s === p.sub));
      $$('#pmSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === p.m));
      $('#sH').value = p.H; $('#oH').textContent = f1(p.H) + ' m'; $('#sH').style.setProperty('--pct', (p.H / 2 * 100) + '%');
      $$('#refSeg button').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.v - p.ref) < 1e-9));
      $('#sX').value = p.xs; $('#oX').textContent = p.xs.toFixed(2) + ' m'; $('#sX').style.setProperty('--pct', (p.xs / 0.3 * 100) + '%');
    }
    const c = S.cv;
    if (c) {
      $$('#cvSub button').forEach((b) => b.classList.toggle('on', b.dataset.s === c.sub));
      $$('#cmSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === c.m));
      $$('#cpSeg button').forEach((b) => b.classList.toggle('on', b.dataset.p === c.path));
      $$('#cfSeg button').forEach((b) => { b.classList.toggle('on', (b.dataset.f === '1') === c.fric); });
      $$('#cfSeg button').forEach((b) => { b.disabled = c.path === 'drop' || (c.f && c.f.st === 'go'); });
      $('#sCX').value = c.x; $('#oCX').textContent = c.x.toFixed(2) + ' m'; $('#sCX').style.setProperty('--pct', ((c.x - 0.1) / 0.2 * 100) + '%');
      const busyF = c.f && c.f.st === 'go', busyL = c.l && c.l.st === 'go';
      $$('#cmSeg button, #cpSeg button').forEach((b) => (b.disabled = !!busyF));
      $('#sCX').disabled = !!busyL;
      const isFall = c.sub === 'fall';
      const st = isFall ? c.f.st : c.l.st;
      $('#bCvRun').disabled = isFall ? !!busyF : !!busyL;
      $('#bCvRun').textContent = st === 'done' ? '↺ 다시' : isFall ? '▶ 놓기' : '🚀 발사';
    }
    const a = S.ap;
    if (a) {
      $$('#apSub button').forEach((b) => b.classList.toggle('on', b.dataset.s === a.sub));
      $('#sSX').value = a.sx; $('#oSX').textContent = a.sx.toFixed(2) + ' m'; $('#sSX').style.setProperty('--pct', ((a.sx - 0.05) / 0.35 * 100) + '%');
      $('#sLH').value = a.lh; $('#oLH').textContent = f1(a.lh) + ' m'; $('#sLH').style.setProperty('--pct', ((a.lh - 0.2) / 0.8 * 100) + '%');
      const sh = a.sub === 'shelf', st = sh ? a.sl.st : a.lp.st, busy = st === 'go';
      $('#sSX').disabled = busy; $('#sLH').disabled = busy;
      $('#bApRun').disabled = busy; $('#bApRun').textContent = st === 'done' ? '↺ 다시' : sh ? '🚀 발사' : '🎢 굴리기';
    }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  /* ① */
  function setWork(k, v) { const w = S.w; if (w.st === 'go') return; w[k] = v; w.st = 'ready'; w.x = 0; w.v = 0; w.t = 0; parts.clear(); updateCtl(); }
  $('#sF').addEventListener('input', (e) => setWork('F', +e.target.value));
  $('#sS').addEventListener('input', (e) => setWork('s', +e.target.value));
  $$('#frSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setWork('fr', b.dataset.f === '1'); }));
  $('#bWork').addEventListener('click', () => { if (S.w.st === 'done') workReset(); else workGo(); });
  /* ② */
  const setPot = (k, v) => { S.pt[k] = v; trackSeen(); updateCtl(); };
  $$('#potSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); setPot('sub', b.dataset.s); }));
  $$('#pmSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setPot('m', +b.dataset.v); }));
  $('#sH').addEventListener('input', (e) => setPot('H', Math.round(+e.target.value * 10) / 10));
  $$('#refSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setPot('ref', +b.dataset.v); }));
  $('#sX').addEventListener('input', (e) => setPot('xs', Math.round(+e.target.value * 100) / 100));
  $('#bRec').addEventListener('click', potRecord);
  $('#bRecClear').addEventListener('click', () => { Sound.click(); S.pt.rows = []; updateCtl(); });
  /* ③ */
  $$('#cvSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); S.cv.sub = b.dataset.s; updateCtl(); }));
  $$('#cmSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cv.m = +b.dataset.v; parts.clear(); newFall(); }));
  $$('#cpSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cv.path = b.dataset.p; if (S.cv.path === 'drop') S.cv.fric = false; parts.clear(); newFall(); }));
  $$('#cfSeg button').forEach((b) => b.addEventListener('click', () => { if (S.cv.path === 'drop') return; Sound.click(); S.cv.fric = b.dataset.f === '1'; parts.clear(); newFall(); }));
  $('#sCX').addEventListener('input', (e) => { S.cv.x = Math.round(+e.target.value * 100) / 100; parts.clear(); newLaunchCv(); });
  $('#bCvRun').addEventListener('click', () => { const c = S.cv; if (c.sub === 'fall') { if (c.f.st === 'done') { parts.clear(); newFall(); } else fallGo(); } else launchGoCv(); });
  /* ④ */
  $$('#apSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); S.ap.sub = b.dataset.s; updateCtl(); }));
  $('#sSX').addEventListener('input', (e) => { S.ap.sx = Math.round(+e.target.value * 100) / 100; parts.clear(); newShelf(); });
  $('#sLH').addEventListener('input', (e) => { S.ap.lh = Math.round(+e.target.value * 10) / 10; parts.clear(); newLoop(); });
  $('#bApRun').addEventListener('click', () => { const a = S.ap; if (a.sub === 'shelf') { if (a.sl.st === 'done') { parts.clear(); newShelf(); } else shelfGo(); } else { if (a.lp.st === 'done') { parts.clear(); newLoop(); } else loopGo(); } });
  /* 기준면 끌기 */
  let dragRef = false;
  SciSim.pointer(view, {
    down(p) { if (S.mode === 'potential' && S.pt.sub === 'grav' && Math.abs(p.y - yH(S.pt.ref)) < 18) { dragRef = true; return true; } return false; },
    move(p) { if (!dragRef) return; const r = clamp(Math.round((GFLOOR - p.y) / GP * 10) / 10, 0, 2.0); if (r !== S.pt.ref) { S.pt.ref = r; trackSeen(); updateCtl(); } },
    up() { dragRef = false; },
    hover(p) { return S.mode === 'potential' && S.pt.sub === 'grav' && Math.abs(p.y - yH(S.pt.ref)) < 18 ? 'ns-resize' : ''; },
  });

  /* ---------- 판독값 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'work') {
      const w = S.w, wv = workW(w), f = w.fr ? BOX.fr : 0;
      L1 = f > 0 ? '알짜 일' : '일 W = F × s'; a = (w.st === 'ready' ? eJ((w.F - f) * w.s) + ' J (예정)' : eJ(f > 0 ? wv.Wn : wv.WF) + ' J');
      L2 = '속력 v'; b = f2(w.v) + ' m/s';
      L3 = '운동 에너지 ½mv²'; c = eJ(wv.Ek) + ' J';
    } else if (S.mode === 'potential') {
      const p = S.pt;
      if (p.sub === 'grav') { const e = epOf(p); L1 = 'E_p (지금)'; a = eJ(e.now) + ' J'; L2 = 'E_p (탁자 높이)'; b = eJ(e.tbl) + ' J'; L3 = 'ΔE_p (감소량)'; c = eJ(e.dE) + ' J'; }
      else { const x = p.xs; L1 = '늘어난 길이 x'; a = x.toFixed(2) + ' m'; L2 = '힘 F = kx'; b = eJ(KS * x) + ' N'; L3 = '에너지 ½kx²'; c = eJ(0.5 * KS * x * x) + ' J'; }
    } else if (S.mode === 'conserve') {
      const cc = S.cv;
      if (cc.sub === 'fall') { const ev = fallEval(cc), E = cc.f.st === 'ready' ? cc.m * G * H0 : 0.5 * cc.m * ev.v * ev.v + cc.m * G * ev.h; L1 = '속력 v'; a = cc.f.st === 'ready' ? '0.00 m/s' : f2(ev.v) + ' m/s'; L2 = '역학적 에너지 합'; b = eJ(E) + ' J'; L3 = '처음 E (mgh)'; c = eJ(cc.m * G * H0) + ' J'; }
      else { const E0 = 0.5 * LK.k * cc.x * cc.x, E = launchE(cc.l); L1 = '처음 탄성 에너지'; a = eJ(E0) + ' J'; L2 = '속력 v'; b = (cc.l.st === 'ready' ? '0.00' : f2(E.e.v)) + ' m/s'; L3 = '최고 높이'; c = cc.l.st === 'done' ? eJ(cc.l.hend) + ' m' : '—'; }
    } else {
      const aa = S.ap;
      if (aa.sub === 'shelf') { const L = aa.sl; L1 = '탄성 에너지 ½kx²'; a = eJ(0.5 * LK.k * L.x0 * L.x0) + ' J'; L2 = '필요한 mgh (선반)'; b = eJ(LK.m * G * SHELF) + ' J'; L3 = '결과'; c = L.st === 'done' ? (L.reach ? '선반 도착 ✅' : '못 올라감 ❌') : '—'; }
      else { const L = aa.lp; L1 = '출발 높이 h'; a = f1(L.h) + ' m'; L2 = '꼭대기 속력(계산)'; b = L.h > 2 * LOOP_R + 1e-9 ? f2(Math.sqrt(loopTopV2(L.h))) + ' m/s' : '닿지 못함'; L3 = '결과'; c = L.st === 'done' ? (L.res === 'pass' ? '통과 ✅' : '실패 ❌') : '—'; }
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const LOOP_HMIN = 2.5 * LOOP_R;                       // 이론상 통과 한계 (m)
  const LOOP_HPASS = Math.ceil(LOOP_HMIN * 10 - 1e-9) / 10;   // 슬라이더(0.1 m 간격)에서 통과하는 가장 낮은 높이
  const LOOP_TOP = 2 * LOOP_R;                           // 꼭대기 높이
  const loopTopV = (h) => Math.sqrt(Math.max(0, 2 * G * (h - LOOP_TOP)));
  const workRowsNoFr = () => S.w.rows.filter((r) => r.f === 0);
  const seen = (k) => !!S.pt.seen[Math.round(k * 10)];
  const spRow = (x) => S.pt.rows.some((r) => Math.abs(r.x - x) < 1e-9);
  const fallRow = (m) => S.cv.rows.some((r) => r.m === m && !r.fric);
  const levels = [
    {
      title: '일과 운동 에너지: 힘 × 거리', short: '일과 운동E', icon: '⚙️', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 손을 놓은 용수철 장난감은 어디까지 날아갈까? 속력을 미리 계산해서 맞힐 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 일 = 힘 × 거리, 운동 에너지 ½mv²을 배웠어요. 이번에는 이 둘을 <b>식으로 이어서</b> 일을 하면 운동 에너지가 얼마나 늘어나는지 속력 센서로 확인해요.</div>' +
        '<p>마찰 없는 바닥의 <b>2.0 kg</b> 상자를 힘 F로 s만큼 밀어요. F–s 그래프의 <b>넓이</b>로 일 W를 읽고, 속력 센서로 구한 <b>운동 에너지 ½mv²</b>과 비교해요.</p>',
      features: ['work'],
      setup() { S.showHIn = false; resetWork(false, true); setScene('work'); },
      recap: '알짜힘이 한 일은 물체의 운동 에너지 변화와 같아요(W = ΔE_k). 마찰이 한 일은 음수여서 알짜 일만 운동 에너지로 바뀌어요.',
      summary: '<ul><li><b>일</b> W = Fs (힘의 방향으로 이동한 거리, 단위 J = N·m). F–s 그래프에서는 <b>그래프 아래 넓이</b>가 일이에요.</li><li><b>일–운동 에너지 정리</b>: 알짜힘이 한 일 W = ΔE_k = ½mv² − ½mv₀²</li><li>예) 2.0 kg 상자를 4 N으로 9 m 밀면 W = 36 J → ½ × 2.0 × v² = 36 → v = 6.0 m/s</li><li>마찰력 3 N이 함께 작용하면 마찰이 한 일은 −27 J(운동과 반대 방향이라 음수) → 알짜 일 9 J → v = 3.0 m/s</li><li>힘이 크다고 운동 에너지가 항상 큰 것은 아니에요. <b>알짜 일</b>이 운동 에너지의 변화를 정해요.</li></ul>',
      missions: [
        {
          title: '일 36 J 하고 속력 재기',
          goal: '마찰 없는 바닥에서 힘 F와 거리 s를 정해 <b>일 36 J</b>(F × s = 36)을 하고 속력을 측정하세요.',
          hint: 'F × s = 36이 되는 짝을 찾아요. 예) 4 N × 9 m, 6 N × 6 m. 슬라이더로 정하고 ▶ 밀기를 눌러요.',
          setup() { setScene('work'); },
          check: () => workRowsNoFr().some((r) => r.WF === 36),
          hold: 0.6,
          status: () => '지금 W = F × s = ' + (S.w.F * S.w.s) + ' J ' + mark(S.w.F * S.w.s === 36) + ' &nbsp; 측정 ' + mark(workRowsNoFr().some((r) => r.WF === 36)),
          explain: '일 W = Fs = <b>36 J</b>이고, 일–운동 에너지 정리에 따라 ΔE_k = 36 J이에요. ½ × 2.0 × v² = 36 → <b>v = 6.0 m/s</b>. 4 N × 9 m이든 6 N × 6 m이든 일이 36 J로 같으면 같은 속력이 나와요.',
        },
        {
          title: '마찰이 있을 때의 알짜 일',
          goal: '<b>마찰 3 N</b>을 켜고 <b>F = 4 N</b>으로 <b>s = 9 m</b>를 밀어 측정하세요. 힘이 한 일 36 J이 모두 운동 에너지가 될까요?',
          hint: '마찰 3 N 버튼을 누르고, 힘 슬라이더를 4 N, 거리 슬라이더를 9 m로 맞춘 뒤 ▶ 밀기를 눌러요.',
          setup() { resetWork(false, true); setScene('work'); },
          check: () => S.w.rows.some((r) => r.f === BOX.fr && r.F === 4 && r.s === 9),
          hold: 0.6,
          status: () => mark(S.w.fr) + ' 마찰 ' + BOX.fr + ' N &nbsp; ' + mark(S.w.F === 4) + ' F = 4 N &nbsp; ' + mark(S.w.s === 9) + ' s = 9 m',
          explain: '힘이 한 일은 +36 J, 마찰이 한 일은 −3 × 9 = <b>−27 J</b>이에요. <b>알짜 일 = 36 − 27 = 9 J</b>이 운동 에너지로 바뀌어 ½ × 2.0 × v² = 9 → <b>v = 3.0 m/s</b>. 표에서 알짜 일과 ½mv²이 같은 값인지 확인해요.',
        },
        {
          type: 'quiz', title: '마찰이 한 일의 부호',
          goal: '마찰력 3 N이 작용하는 바닥에서 상자를 9 m 미는 동안 <b>마찰력이 한 일</b>은?',
          setup() { setScene('work'); },
          choices: ['+27 J', '−27 J', '0 J (마찰력은 일을 하지 않아요)', '−9 J'],
          answer: 1,
          feedback: ['마찰력의 방향은 상자의 이동 방향과 반대예요. 일의 부호도 반대(−)가 돼요.', '', '마찰력도 상자가 움직이는 동안 힘을 작용하므로 일을 해요. 다만 이동 방향과 반대라서 음수예요.', '−9 J은 알짜 일(+9 J)과 헷갈린 값이에요. 마찰력이 한 일은 −(3 × 9)예요.'],
          explain: '마찰력은 이동 방향과 반대 방향이므로 일이 <b>음수</b>예요. W = −fs = −3 × 9 = <b>−27 J</b>. 그래서 힘이 한 일 36 J 중 27 J이 마찰에 빼앗기고, 알짜 일 9 J만 운동 에너지가 돼요.',
        },
      ],
    },
    {
      title: '위치 에너지: 기준면과 용수철', short: '위치 에너지', icon: '⬆️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 알짜 일이 운동 에너지로 바뀌는 것을 확인했어요. 물체를 들어 올리거나 용수철을 늘리는 일은 <b>위치 에너지</b>로 저장돼요. 중학교의 mgh를 <b>기준면</b>과 <b>용수철</b>까지 넓혀 봐요.</div>' +
        '<p>(1) <b>중력</b>: 공의 높이와 질량, <b>기준면(E_p = 0인 높이)</b>을 바꾸며 E_p와 그 변화량 ΔE_p를 비교해요. (2) <b>탄성</b>: 용수철을 늘리는 힘–길이 그래프의 넓이로 에너지를 구해요.</p>',
      features: ['potential'],
      setup() { resetPot(false); S.pt.ref = 1.1; setScene('potential'); },
      recap: '중력 위치 에너지 E_p = mgh는 기준면에 따라 값이 달라지지만 변화량은 같아요. 용수철의 탄성 에너지는 ½kx²이고 x가 2배면 에너지는 4배예요.',
      summary: '<ul><li><b>중력 위치 에너지</b> E_p = mgh (h는 기준면에서 잰 높이). 기준면은 정하기 나름이에요.</li><li>예) 0.5 kg 공이 탁자(0.8 m) 위 0.3 m(바닥에서 1.1 m)에 있을 때: 탁자 기준 1.5 J, 바닥 기준 5.5 J. 하지만 <b>탁자 높이까지 떨어질 때의 감소량은 두 기준 모두 1.5 J</b>이에요.</li><li><b>탄성 위치 에너지</b>: 훅의 법칙 F = kx, 힘–길이 그래프의 넓이 = ½kx²</li><li>예) k = 200 N/m: x = 0.10 m → 1.0 J, x = 0.20 m → 4.0 J (x가 2배면 에너지는 4배)</li><li>위치 에너지는 물체 하나가 아니라 <b>물체–지구(또는 물체–용수철) 계</b>의 에너지예요.</li></ul>',
      missions: [
        {
          title: '기준면을 바꿔 E_p 비교하기',
          goal: '0.5 kg 공을 높이 <b>1.1 m</b>(탁자 위 0.3 m)에 두고, 기준면을 <b>탁자(0.8 m)</b>와 <b>바닥(0 m)</b>으로 각각 바꾸어 E_p를 확인하세요.',
          hint: '질량 0.5 kg, 높이 1.1 m인지 확인하고 기준면 버튼 [탁자]와 [바닥]을 눌러요. 초록 점선을 끌어도 돼요.',
          setup() { S.pt.sub = 'grav'; S.pt.seen = {}; updateCtl(); setScene('potential'); },
          check: () => seen(TBL) && seen(0),
          hold: 0.6,
          status: () => mark(seen(TBL)) + ' 탁자 기준 ' + eJ(0.5 * G * (1.1 - TBL)) + ' J &nbsp; ' + mark(seen(0)) + ' 바닥 기준 ' + eJ(0.5 * G * 1.1) + ' J &nbsp; (지금 ' + eJ(epOf(S.pt).now) + ' J)',
          explain: '탁자 기준이면 h = 0.3 m → E_p = 0.5 × 10 × 0.3 = <b>1.5 J</b>, 바닥 기준이면 h = 1.1 m → E_p = 0.5 × 10 × 1.1 = <b>5.5 J</b>예요. 값은 달라도, 탁자 높이까지 내려올 때 줄어드는 양 ΔE_p = 1.5 J은 두 기준에서 똑같아요.',
        },
        {
          title: '용수철을 늘려 에너지 측정하기',
          goal: '용수철(k = 200 N/m)을 <b>x = 0.10 m</b>와 <b>x = 0.20 m</b>만큼 늘리고, 각각 <b>📏 측정 기록</b>을 눌러 에너지를 구하세요.',
          hint: '탄성 장면으로 바꾸고 슬라이더로 길이를 정해 📏 측정 기록을 눌러요. 그래프 삼각형의 넓이가 에너지예요.',
          setup() { S.pt.sub = 'spring'; S.pt.rows = []; updateCtl(); setScene('potential'); },
          check: () => spRow(0.1) && spRow(0.2),
          hold: 0.6,
          status: () => mark(spRow(0.1)) + ' x = 0.10 m &nbsp; ' + mark(spRow(0.2)) + ' x = 0.20 m',
          explain: 'F = kx이므로 그래프는 직선이고 넓이(삼각형) = ½ × F × x = ½kx²예요. x = 0.10 m → ½ × 20 × 0.10 = <b>1.0 J</b>, x = 0.20 m → ½ × 40 × 0.20 = <b>4.0 J</b>. 길이가 2배가 되면 에너지는 <b>4배</b>가 돼요.',
        },
        {
          type: 'quiz', title: '위치 에너지와 기준면',
          goal: '0.5 kg 공이 탁자 위 0.3 m에 있어요. 기준면을 탁자에서 바닥으로 바꾸면 E_p가 1.5 J에서 5.5 J로 달라져요. 그래도 <b>바뀌지 않는 것</b>은?',
          setup() { setScene('potential'); },
          choices: ['공의 위치 에너지의 값', '공이 탁자 높이까지 내려올 때 줄어드는 위치 에너지(1.5 J)', '기준면보다 아래에 있을 때의 위치 에너지(항상 0)', '위치 에너지는 공만 가진 에너지라서 지구와 관계없이 정해지는 것'],
          answer: 1,
          feedback: ['위치 에너지의 값은 기준면을 어디로 정하느냐에 따라 달라졌어요(1.5 J → 5.5 J).', '', '기준면보다 아래에서는 E_p가 0이 아니라 음수가 돼요. 기준면은 E_p = 0으로 약속한 높이예요.', '위치 에너지는 공과 지구가 서로 작용하는 계가 가진 에너지예요. 공만의 에너지가 아니에요.'],
          explain: '위치 에너지의 <b>변화량 ΔE_p는 기준면과 상관없이 같아요</b>. 위치 에너지는 물체 하나가 아니라 <b>물체와 지구 사이의 상호작용(계)</b>이 가진 에너지이고, 문제에서 필요한 것은 대개 이 변화량이에요.',
        },
      ],
    },
    {
      title: '역학적 에너지 보존: 속력 예측', short: '에너지 보존', icon: '🔁', phase: '확인',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 운동 에너지, 중력 위치 에너지, 탄성 위치 에너지를 각각 식으로 구했어요. 이 셋을 더한 <b>역학적 에너지</b> E = E_k + E_p가 일정하다면 속력을 미리 계산할 수 있어요.</div>' +
        '<p>(1) 같은 높이에서 공을 놓고 <b>질량·경로</b>가 달라도 바닥 속력이 같은지 확인하고, (2) <b>용수철로 발사한 공</b>이 비탈에서 올라가는 최고 높이를 예측해요. 막대그래프에서 합이 그대로인지 보세요.</p>',
      features: ['conserve'],
      setup() { S.showHIn = false; resetCv(false); setScene('conserve'); },
      recap: '중력과 탄성력만 일을 하면 역학적 에너지 E_k + E_p는 일정해요. 그래서 mgh = ½mv²에서 v = √(2gh)로 질량과 상관없이 속력을 예측할 수 있어요.',
      summary: '<ul><li><b>역학적 에너지</b> E = E_k + E_p(중력) + E_p(탄성). <b>중력과 탄성력만 일을 하면</b> E가 보존돼요.</li><li>높이 0.8 m에서 공을 놓으면 mgh = ½mv² → v = √(2gh) = √(2 × 10 × 0.8) = <b>4.0 m/s</b>. 0.5 kg이든 2.0 kg이든, 수직 낙하든 비탈이든 <b>같아요</b>.</li><li>용수철(k = 50 N/m)을 0.2 m 압축하면 ½kx² = 1.0 J → 0.5 kg 공의 속력 2.0 m/s → 마찰 없는 비탈에서 h = 1.0 ÷ (0.5 × 10) = <b>0.2 m</b>까지 올라가요.</li><li>마찰이 있으면 E_k + E_p의 합이 줄어요. 줄어든 에너지가 어디로 갔는지는 다음 차시에서 알아봐요.</li></ul>',
      missions: [
        {
          title: '질량이 달라도 속력은 같을까?',
          goal: '높이 0.8 m에서 <b>0.5 kg</b>과 <b>2.0 kg</b> 공을 각각 <b>마찰 없이</b> 놓아 바닥에서의 속력을 비교하세요. (경로는 마음대로 골라요)',
          hint: '낙하·비탈 장면에서 질량 버튼을 0.5 kg, 2.0 kg으로 바꾸고 ▶ 놓기를 눌러요. 표의 바닥 속력을 비교해요.',
          setup() { S.cv.sub = 'fall'; S.cv.fric = false; newFall(); setScene('conserve'); },
          check: () => fallRow(0.5) && fallRow(2),
          hold: 0.6,
          status: () => mark(fallRow(0.5)) + ' 0.5 kg &nbsp; ' + mark(fallRow(2)) + ' 2.0 kg &nbsp; (마찰 없는 기록만 세요)',
          explain: '두 공 모두 mgh = ½mv²에서 m이 양쪽에서 약분돼요. v = √(2gh) = √(2 × 10 × 0.8) = <b>4.0 m/s</b>로 <b>질량과 상관없이 같아요</b>. 수직 낙하든 완만한 비탈이든 가파른 비탈이든 같은 높이를 내려오면 바닥 속력이 같아요.',
        },
        {
          title: '용수철 발사 후 최고 높이 예측', manual: true,
          goal: '용수철(k = 50 N/m)을 <b>0.20 m</b> 압축해 <b>0.5 kg</b> 공을 쏘면 마찰 없는 비탈에서 몇 <b>m</b>까지 올라갈까요? 예측값을 입력하고, 발사해서 확인하세요.',
          hint: '탄성 에너지 ½kx²이 모두 중력 위치 에너지 mgh로 바뀌어요. h = ½kx² ÷ (mg)를 계산해요.',
          setup() { S.cv.sub = 'launch'; S.cv.x = 0.2; newLaunchCv(); S.showHIn = true; $('#hInput').value = ''; $('#hInput').classList.remove('bad'); S.lastH = null; setScene('conserve'); updateCtl(); },
          check() {
            if (!S.cv.lrows.some((r) => Math.abs(r.x - 0.2) < 1e-9)) return '먼저 압축 길이를 0.20 m로 맞추고 🚀 발사해서 최고 높이를 측정해요.';
            const v = num($('#hInput').value);
            if (!isFinite(v)) return '예측한 최고 높이를 숫자(m)로 입력해요.';
            if (Math.abs(v - 0.2) > 0.01) {
              if (S.lastH !== v) { S.lastH = v; $('#hInput').classList.remove('bad'); void $('#hInput').offsetWidth; $('#hInput').classList.add('bad'); }
              return Math.abs(v - 1) < 0.01 ? '1.0은 탄성 에너지(J)예요. 높이를 구하려면 mg = 0.5 × 10으로 나눠야 해요.' : '다시 계산해 보세요. ½kx² = ½ × 50 × 0.20²이 mgh = 0.5 × 10 × h와 같아요.';
            }
            $('#hInput').classList.remove('bad'); return true;
          },
          status: () => mark(S.cv.lrows.some((r) => Math.abs(r.x - 0.2) < 1e-9)) + ' x = 0.20 m 발사 &nbsp; 측정한 최고 높이: ' + (S.cv.l.st === 'done' && Math.abs(S.cv.l.x0 - 0.2) < 1e-9 ? eJ(S.cv.l.hend) + ' m' : '—'),
          explain: '탄성 에너지 ½ × 50 × 0.20² = <b>1.0 J</b>이 모두 중력 위치 에너지로 바뀌면 mgh = 0.5 × 10 × h = 1.0 → <b>h = 0.2 m</b>예요. 발사 직후 공의 속력은 √(2 × 1.0 ÷ 0.5) = 2.0 m/s이고, 비탈을 오르며 운동 에너지가 위치 에너지로 바뀌어요.',
        },
        {
          type: 'quiz', title: '예상보다 낮게 올라간 까닭',
          goal: '실제 실험에서 용수철로 쏜 공이 계산한 0.20 m보다 <b>조금 낮은 높이</b>까지만 올라갔어요. 가장 알맞은 설명은?',
          setup() { S.showHIn = false; setScene('conserve'); updateCtl(); },
          choices: ['에너지 보존 법칙이 깨졌기 때문에', '비탈의 마찰과 공기 저항이 일을 해서 역학적 에너지의 일부가 줄었기 때문에', '용수철 상수 k가 쏘는 순간 갑자기 커졌기 때문에', '공의 질량이 올라가면서 줄어들었기 때문에'],
          answer: 1,
          feedback: ['에너지 총량은 보존돼요. 줄어든 것은 공의 역학적 에너지예요(다음 차시에서 어디로 갔는지 알아봐요).', '', '용수철 상수는 쏘는 동안 변하지 않아요.', '질량은 변하지 않아요.'],
          explain: '역학적 에너지는 <b>중력과 탄성력만 일을 할 때</b> 보존돼요. 실제 실험에는 마찰과 공기 저항이 일을 해서 역학적 에너지가 조금 줄고, 높이 측정에도 오차가 있어서 예측보다 낮게 나와요. 이 시뮬레이션에서 마찰을 켜면 막대그래프의 합이 줄어드는 것과 같아요.',
        },
      ],
    },
    {
      title: '속력 예측 게임: 선반과 루프', short: '적용', icon: '🎯', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 에너지가 보존된다는 규칙으로 속력과 높이를 계산했어요. 이제 이 규칙으로 <b>원하는 결과가 나오도록 값을 정해</b> 봐요.</div>' +
        '<p>(1) 용수철 발사대로 0.5 kg 공을 <b>선반 0.45 m</b>에 올릴 수 있는 압축 길이를 찾고, (2) 비탈에서 굴러 내려온 공이 <b>루프 꼭대기</b>를 지나는 가장 낮은 출발 높이를 찾아요.</p>',
      features: ['apply'],
      setup() { resetAp(false); setScene('apply'); },
      recap: '필요한 에너지를 먼저 계산하면 값을 찾을 수 있어요. 선반에 올리려면 ½kx² ≥ mgh이고, 루프를 통과하려면 꼭대기에서도 속력이 남아 있도록 꼭대기 높이보다 충분히 높은 곳에서 출발해야 해요.',
      summary: '<ul><li><b>선반</b>: 0.5 kg 공을 0.45 m 선반에 올리려면 mgh = 0.5 × 10 × 0.45 = 2.25 J이 필요해요. ½ × 50 × x² = 2.25 → <b>x = 0.30 m</b></li><li><b>루프</b>: 출발 높이가 꼭대기 높이(' + f1(LOOP_TOP) + ' m)와 같으면 꼭대기 속력이 0이라 올라가지 못해요. 꼭대기에서도 속력이 충분히 남아야 레일을 벗어나지 않아요. 이 장치는 <b>h = ' + f1(LOOP_HPASS) + ' m</b>부터 통과해요.</li><li>속력은 질량과 상관없이 높이 차로 정해져요: v = √(2g × 높이 차)</li></ul>',
      missions: [
        {
          title: '선반에 올리는 가장 작은 압축 길이',
          goal: '높이 <b>0.45 m</b> 선반에 공을 올릴 수 있는 <b>가장 작은 압축 길이</b>를 찾아 성공시키세요. (슬라이더는 0.05 m 간격)',
          hint: '선반까지 필요한 에너지는 mgh = 0.5 × 10 × 0.45 = 2.25 J이에요. ½ × 50 × x² = 2.25가 되는 x를 구해 보세요.',
          setup() { S.ap.sub = 'shelf'; newShelf(); setScene('apply'); },
          check: () => S.ap.srows.some((r) => Math.abs(r.x - 0.3) < 1e-9 && r.reach),
          hold: 0.6,
          status: () => mark(S.ap.srows.some((r) => Math.abs(r.x - 0.3) < 1e-9 && r.reach)) + ' 가장 작은 압축 길이로 선반 도착 &nbsp; (지금 x = ' + S.ap.sx.toFixed(2) + ' m)',
          explain: '필요한 중력 위치 에너지 mgh = 0.5 × 10 × 0.45 = <b>2.25 J</b>이에요. 탄성 에너지 ½kx² = ½ × 50 × x² = 2.25 → x² = 0.09 → <b>x = 0.30 m</b>. 0.25 m이면 1.56 J이라 최고 높이가 0.31 m밖에 안 돼요.',
        },
        {
          title: '루프를 통과하는 가장 낮은 출발 높이',
          goal: '루프(꼭대기 높이 ' + f1(LOOP_TOP) + ' m)를 통과하는 <b>가장 낮은 출발 높이</b>를 찾으세요. 통과하는 높이(' + f1(LOOP_HPASS) + ' m)와 <b>통과하지 못하는 높이(' + f1(LOOP_HPASS - 0.1) + ' m)</b>를 모두 굴려 보세요.',
          hint: '꼭대기에서 속력이 0이면 안 돼요. 꼭대기 높이 ' + f1(LOOP_TOP) + ' m보다 높은 곳에서 시작해 슬라이더(0.1 m 간격)로 높이를 바꿔 가며 굴려 봐요.',
          setup() { S.ap.sub = 'loop'; newLoop(); setScene('apply'); },
          check: () => S.ap.lrows.some((r) => Math.abs(r.h - LOOP_HPASS) < 1e-9 && r.pass) && S.ap.lrows.some((r) => Math.abs(r.h - (LOOP_HPASS - 0.1)) < 1e-9 && !r.pass),
          hold: 0.6,
          status: () => mark(S.ap.lrows.some((r) => Math.abs(r.h - (LOOP_HPASS - 0.1)) < 1e-9 && !r.pass)) + ' h = ' + f1(LOOP_HPASS - 0.1) + ' m 실패 확인 &nbsp; ' + mark(S.ap.lrows.some((r) => Math.abs(r.h - LOOP_HPASS) < 1e-9 && r.pass)) + ' h = ' + f1(LOOP_HPASS) + ' m 통과',
          explain: '출발 높이 h에서 꼭대기(높이 ' + f1(LOOP_TOP) + ' m)까지 올라가면 운동 에너지 ½mv² = mg(h − ' + f1(LOOP_TOP) + ')가 남아요. h = ' + f1(LOOP_HPASS - 0.1) + ' m이면 꼭대기 속력이 ' + f2(loopTopV(LOOP_HPASS - 0.1)) + ' m/s로 너무 작아서 꼭대기 근처에서 레일을 벗어나 떨어져요. h = ' + f1(LOOP_HPASS) + ' m이면 꼭대기 속력이 ' + f2(loopTopV(LOOP_HPASS)) + ' m/s로 충분해서 레일을 따라 끝까지 통과해요. 꼭대기 높이보다 낮거나 같으면 꼭대기에 닿을 수조차 없어요.',
        },
      ],
    },
  ];

  /* 이어 하기(새로고침)로 중간 미션에서 열려도 미션 setup()이 만든 장면을 덮어쓰지 않도록, 장면 상태를 게임보다 먼저 만들어요 */
  resetWork(false); resetPot(false); S.pt.ref = 1.1; resetCv(false); resetAp(false);
  setScene('work');
  game = SciSim.game({
    simId: 'hp-mech-energy', mount: '#game', badge: '에너지 예측왕', homeHref: '../../index.html#hp',
    featureLabels: { work: '⚙️ 상자 밀기 · F–s 그래프 · 속력 센서', potential: '⬆️ 기준면 · 용수철 F–x 그래프', conserve: '🔁 에너지 막대그래프 · 낙하·비탈 · 용수철 발사', apply: '🎯 선반 올리기 · 루프 통과' },
    onFeatures() { updateCtl(); },
    levels,
  });

  view.canvas.addEventListener('click', () => {
    if (S.mode === 'work') { if (S.w.st === 'ready') workGo(); else if (S.w.st === 'done') workReset(); }
    else if (S.mode === 'conserve') { const c = S.cv; if (c.sub === 'fall') { if (c.f.st === 'ready') fallGo(); } else if (c.l.st === 'ready') launchGoCv(); }
    else if (S.mode === 'apply') { const a = S.ap; if (a.sub === 'shelf') { if (a.sl.st === 'ready') shelfGo(); } else if (a.lp.st === 'ready') loopGo(); }
  });

  /* ---------- 시작 ---------- */
  let lastFree = false, lastKey = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    const key = [S.mode, S.w.st, S.cv.f.st, S.cv.l.st, S.ap.sl.st, S.ap.lp.st].join('|');
    if (key !== lastKey) { lastKey = key; updateCtl(); }
    view.apply();
    if (S.mode === 'work') { stepWork(dt); drawWork(dt); }
    else if (S.mode === 'potential') { drawPot(dt); }
    else if (S.mode === 'conserve') { if (S.cv.sub === 'fall') stepFall(dt); else stepLaunch(S.cv.l, dt, launchDoneCv); drawCv(dt); }
    else { if (S.ap.sub === 'shelf') stepLaunch(S.ap.sl, dt, shelfDone); else stepLoop(dt); drawAp(dt); }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, resetWork, setWork, workGo, resetPot, setPot, potRecord, resetCv, fallGo, launchGoCv, newFall, newLaunchCv, resetAp, shelfGo, loopGo, newShelf, newLoop, updateCtl, epOf, fallParams, loopInit, loopPasses,
    stepAll(sec) {
      const n = Math.ceil(sec / 0.02);
      for (let i = 0; i < n; i++) {
        if (S.mode === 'work') stepWork(0.02);
        else if (S.mode === 'conserve') { if (S.cv.sub === 'fall') stepFall(0.02); else stepLaunch(S.cv.l, 0.02, launchDoneCv); }
        else if (S.mode === 'apply') { if (S.ap.sub === 'shelf') stepLaunch(S.ap.sl, 0.02, shelfDone); else stepLoop(0.02); }
      }
      updateCtl();
    },
  };
})();
