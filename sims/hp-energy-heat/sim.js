/* =========================================================
   물리학 Ⅰ. 힘과 에너지 - 역학적 에너지의 열 전환 (단원 6차시)
   성취기준 [12물리01-05] 역학적 에너지가 열의 형태로 전환될 때 에너지 총량이 변하지 않음을 설명할 수 있다.
   ① 관찰: 멈추는 이유 (마찰 장면 3가지, 열화상 카메라)
   ② 실험: 에너지 장부 (마찰 비탈, 비탄성 충돌, 줄의 실험)
   ③ 분석: 열이 나타나는 현상 (중학교 열 개념과 연결)
   ④ 적용: 총량 논증 (사라진 에너지 찾기)
   ※ 열역학 법칙·열역학 과정은 다루지 않고, 열의 양은 Q = cmΔT 정도만 계산에 써요.
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
  const G = 10;                        // 중력 가속도 (m/s²)
  const ROOM = 20;                     // 실내 온도 (°C)
  const BOXS = { m: 2.0, v0: 4.0, f: 8, C: 8 };       // 미끄러지는 상자: 질량, 처음 속력, 마찰력(N), 가열되는 부분의 열용량(J/°C)
  BOXS.a = BOXS.f / BOXS.m; BOXS.ts = BOXS.v0 / BOXS.a; BOXS.d = BOXS.v0 * BOXS.v0 / (2 * BOXS.a); BOXS.Q = BOXS.f * BOXS.d;
  const HANDS = { f: 20, v: 0.5, T: 3, C: 15 };       // 손바닥: 마찰력, 문지르는 속력, 시간, 열용량
  HANDS.d = HANDS.v * HANDS.T; HANDS.Q = HANDS.f * HANDS.d;
  const NAIL = { m: 0.25, v: 4.0, n: 5, C: 10, hold: 0.1, drop: 0.6, up: 0.35 };   // 망치 질량, 내리치는 속력, 횟수, 못의 열용량
  NAIL.ts = NAIL.drop / NAIL.v; NAIL.cyc = NAIL.hold + NAIL.ts + NAIL.up; NAIL.tHit = NAIL.hold + NAIL.ts;   // 한 번 두드리는 데 걸리는 시간, 못에 닿는 시각
  NAIL.Qh = 0.5 * NAIL.m * NAIL.v * NAIL.v; NAIL.Q = NAIL.Qh * NAIL.n;
  const SLOPE = { m: 2.0, h: 5, L: 10, f: 6.4 };      // 마찰 비탈: 질량, 높이, 길이, 마찰력
  SLOPE.E0 = SLOPE.m * G * SLOPE.h; SLOPE.Q = SLOPE.f * SLOPE.L; SLOPE.Ek = SLOPE.E0 - SLOPE.Q;
  SLOPE.v = Math.sqrt(2 * SLOPE.Ek / SLOPE.m); SLOPE.a = G * SLOPE.h / SLOPE.L - SLOPE.f / SLOPE.m;
  const CRASH = { mA: 2.0, vA: 3.0, mB: 1.0 };         // 합체 충돌
  CRASH.v2 = CRASH.mA * CRASH.vA / (CRASH.mA + CRASH.mB); CRASH.E0 = 0.5 * CRASH.mA * CRASH.vA * CRASH.vA;
  CRASH.Ek = 0.5 * (CRASH.mA + CRASH.mB) * CRASH.v2 * CRASH.v2; CRASH.Q = CRASH.E0 - CRASH.Ek;
  const JOULE = { M: 10, h: 2.0, mw: 1.0, c: 4200 };   // 추 질량, 낙하 높이, 물 질량, 물의 비열
  JOULE.E1 = JOULE.M * G * JOULE.h; JOULE.dT1 = JOULE.E1 / (JOULE.c * JOULE.mw);
  const BALLS = { m: 0.5, v: 4.0, d: 5.0 };            // 굴러가는 공: 질량, 속력, 멈출 때까지 거리
  BALLS.E0 = 0.5 * BALLS.m * BALLS.v * BALLS.v; BALLS.f = BALLS.E0 / BALLS.d; BALLS.a = BALLS.f / BALLS.m;
  const CLAY = { m: 0.5, h: 1.6 };                     // 낙하 점토
  CLAY.E0 = CLAY.m * G * CLAY.h; CLAY.v = Math.sqrt(2 * G * CLAY.h);
  const CAR = { m: 1000, v: 20, a: 5, mdisc: 10, cdisc: 500 };   // 급제동 자동차
  CAR.E0 = 0.5 * CAR.m * CAR.v * CAR.v; CAR.d = CAR.v * CAR.v / (2 * CAR.a); CAR.dT = CAR.E0 / (CAR.mdisc * CAR.cdisc);
  const FALLS = { h: 50, c: 4200 }; FALLS.dT = G * FALLS.h / FALLS.c;   // 폭포
  const tC = (x) => (Math.round(x * 100) / 100).toFixed(2);
  const t3 = (x) => (Math.round(x * 1000) / 1000).toFixed(3);

  /* ---------- 상태 ---------- */
  const S = { mode: 'stop', clock: 0, fade: 0, sp: null, lg: null, ph: null, ar: null, showQ: false, showT: false };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { stop: '🧱 멈추는 이유', ledger: '📒 에너지 장부', phenom: '🌡️ 열 현상', argue: '⚖️ 총량 논증' };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  /* 열 색: ΔT(°C) → 열화상 색 (파랑 → 보라 → 빨강 → 주황 → 노랑) */
  function heatColor(dT, max) {
    const k = clamp(dT / (max || 2), 0, 1);
    const stops = [[30, 40, 140], [120, 40, 160], [220, 50, 80], [255, 140, 30], [255, 240, 120]];
    const p = k * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(p)), f = p - i;
    const c = stops[i].map((v, j) => Math.round(v + (stops[i + 1][j] - v) * f));
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }
  function heatBlob(x, y, rx, ry, dT, max) {
    if (dT <= 0.001) return;
    const col = heatColor(dT, max);
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, rx);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(120,40,160,0)');
    ctx.fillStyle = g; ctx.globalAlpha = clamp(0.35 + dT / (max || 2) * 0.65, 0, 1); ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
  }

  /* =====================================================
     ① 멈추는 이유: 세 가지 마찰 장면 + 열화상 카메라
     ===================================================== */
  const SCN = {
    box: { name: '🧱 미끄러지는 상자', T: BOXS.ts, ts: 0.5, C: BOXS.C, Q: BOXS.Q, vmax: BOXS.v0, dmax: 2.0 },
    hands: { name: '🖐️ 손바닥 비비기', T: HANDS.T, ts: 1, C: HANDS.C, Q: HANDS.Q, vmax: 1.0, dmax: 2.0 },
    nail: { name: '🔨 못 두드리기', T: NAIL.n * NAIL.cyc, ts: 1, C: NAIL.C, Q: NAIL.Q, vmax: NAIL.v, dmax: 1.0 },
  };
  function resetStop(sc) {
    const p = S.sp;
    S.sp = { scene: sc || (p ? p.scene : 'box'), cam: p ? p.cam : false, st: 'ready', t: 0, smp: [], rows: p ? p.rows : [], hits: 0, dTs: 0 };
    updateCtl();
  }
  /* 시각 t에서의 값: 속력 v, 지금까지 생긴 열 Q */
  function stopEval(sc, t) {
    if (sc === 'box') {
      const tt = Math.min(t, BOXS.ts), v = BOXS.v0 - BOXS.a * tt, s = BOXS.v0 * tt - 0.5 * BOXS.a * tt * tt;
      return { v: t >= BOXS.ts ? 0 : v, s, Q: BOXS.f * s };
    }
    if (sc === 'hands') {
      const tt = Math.min(t, HANDS.T);
      return { v: t >= HANDS.T ? 0 : HANDS.v, s: HANDS.v * tt, Q: HANDS.f * HANDS.v * tt };
    }
    if (t >= NAIL.n * NAIL.cyc) return { v: 0, s: 0, hits: NAIL.n, Q: NAIL.Q, hy: NAIL.drop };
    const k = Math.floor(t / NAIL.cyc), ph = t - k * NAIL.cyc;
    const hits = t < NAIL.tHit ? 0 : Math.min(NAIL.n, Math.floor((t - NAIL.tHit) / NAIL.cyc) + 1);
    let v, hy;
    if (ph < NAIL.hold) { v = 0; hy = NAIL.drop; }
    else if (ph < NAIL.tHit) { v = NAIL.v; hy = NAIL.drop - NAIL.v * (ph - NAIL.hold); }
    else { v = NAIL.drop / NAIL.up; hy = NAIL.drop * (ph - NAIL.tHit) / NAIL.up; }
    return { v, s: 0, hits, Q: hits * NAIL.Qh, hy };
  }
  function stopGo() {
    const p = S.sp; if (p.st === 'go') return false;
    if (p.st === 'done') resetStop();
    const q = S.sp; q.st = 'go'; q.t = 0; q.smp = []; q.hits = 0; Sound.click(); updateCtl(); return true;
  }
  function stepStop(dt) {
    const p = S.sp; if (p.st !== 'go') return;
    const sc = SCN[p.scene];
    p.t += dt * sc.ts;
    const tt = Math.min(p.t, sc.T), e = stopEval(p.scene, tt);
    if (p.smp.length === 0 || tt - p.smp[p.smp.length - 1].t > sc.T / 120) p.smp.push({ t: tt, v: e.v, dT: e.Q / sc.C });
    if (p.scene === 'nail') { const h = stopEval('nail', tt).hits; if (h > p.hits) { p.hits = h; Sound.tick(); parts.burst(nailX(), nailY() - 30, { count: 6, speed: 90, size: 2.4, colors: ['#ffd447', '#ff8a3d'], gravity: 100 }); } }
    if (p.t >= sc.T) {
      p.t = sc.T; p.st = 'done'; p.smp.push({ t: sc.T, v: 0, dT: sc.Q / sc.C });
      p.rows.push({ scene: p.scene, Q: sc.Q, C: sc.C, dT: sc.Q / sc.C }); if (p.rows.length > 9) p.rows.shift();
      Sound.success(); updateCtl();
    }
  }
  const STX0 = 70, SGY = MH - 74;
  const boxPPM = PHONE ? 60 : 100;
  function nailX() { return PHONE ? 240 : 400; }
  function nailY() { return SGY - 36; }
  function drawStopScene(dt) {
    const p = S.sp, sc = SCN[p.scene], thermal = p.cam;
    const tt = p.st === 'ready' ? 0 : Math.min(p.t, sc.T), e = stopEval(p.scene, tt), dT = e.Q / sc.C;
    // 배경
    if (thermal) { const g = ctx.createLinearGradient(0, 0, 0, MH); g.addColorStop(0, '#120c33'); g.addColorStop(1, '#241548'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, MH); }
    const dark = thermal;
    T(16, PHONE ? 24 : 30, sc.name + (thermal ? ' · 🌡️ 열화상 카메라' : ''), PHONE ? 14 : 17, dark ? '#fff' : '#26324a', 'left', 800);
    if (p.scene === 'box') {
      const x0 = STX0, bw = 1.0 * boxPPM, bh = PHONE ? 34 : 52, x = x0 + e.s * boxPPM;
      // 바닥(거친 면)
      ctx.fillStyle = dark ? '#33265c' : '#b79b72'; ctx.fillRect(24, SGY, VW - 48, 12);
      if (!dark) { ctx.fillStyle = 'rgba(80,50,20,.5)'; for (let i = 0; i < 70; i++) ctx.fillRect(26 + (i * 37) % (VW - 56), SGY + 1 + (i % 3) * 3, 4, 2); }
      // 지나온 자리: 열 번짐
      if (thermal) { const trailW = e.s * boxPPM; if (trailW > 1) { const g = ctx.createLinearGradient(x0, 0, x0 + trailW + bw, 0); g.addColorStop(0, heatColor(dT * 0.55)); g.addColorStop(1, heatColor(dT)); ctx.fillStyle = g; ctx.globalAlpha = 0.95; ctx.fillRect(x0, SGY - 3, trailW + bw * 0.9, 15); ctx.globalAlpha = 1; heatBlob(x0 + trailW + bw * 0.5, SGY - 6, bw * 0.9, 24, dT, 2); } }
      else if (dT > 0.02) { ctx.fillStyle = 'rgba(226,70,75,' + clamp(dT / 4, 0, 0.5) + ')'; ctx.fillRect(x0, SGY - 1, e.s * boxPPM + bw * 0.9, 4); }
      // 출발선과 거리 표시
      D.dashedLine(x0, SGY - 80, x0, SGY + 14, { color: dark ? '#9aa5d6' : '#8b97ab', width: 2 }); T(x0 + 4, SGY - 84, '출발', 12, dark ? '#c9d2ff' : '#5a6679', 'left', 800);
      // 상자
      if (dark) { D.roundRect(x, SGY - bh, bw, bh, 6); ctx.strokeStyle = '#7f8bd9'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = 'rgba(70,60,140,.55)'; ctx.fill(); heatBlob(x + bw / 2, SGY - 4, bw * 0.55, 10, dT * 0.9, 2); }
      else { D.shadow(() => { D.roundRect(x, SGY - bh, bw, bh, 6); const g = ctx.createLinearGradient(0, SGY - bh, 0, SGY); g.addColorStop(0, '#d9a867'); g.addColorStop(1, '#b57f3f'); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#8a5a26'; ctx.lineWidth = 2; ctx.strokeRect(x + 3, SGY - bh + 3, bw - 6, bh - 6); T(x + bw / 2, SGY - bh / 2 + 5, f1(BOXS.m) + ' kg', 13, '#6b4a1f', 'center', 800); }
      if (p.st !== 'ready') D.label(x + bw / 2, SGY - bh - 26, '속력 ' + f2(e.v) + ' m/s', { bg: '#14a058', size: PHONE ? 12 : 13.5 });
      if (e.v > 0.05) D.arrow(x + bw + 6, SGY - bh / 2, x + bw + 6 + e.v * (PHONE ? 8 : 14), SGY - bh / 2, { color: '#14a058', width: 5 });
      if (e.v > 0.05 || p.st === 'done') D.arrow(x + bw, SGY + 20, x + bw - BOXS.f * (PHONE ? 4 : 6), SGY + 20, { color: '#e2464b', width: 4, head: 9 });
      if (p.st !== 'ready') D.label(clamp(x + bw + 56, 90, VW - 70), SGY + 20, '마찰 ' + BOXS.f + ' N', { bg: '#e2464b', size: 12 });
      D.label(VW - (PHONE ? 66 : 82), PHONE ? 52 : 58, '🐌 0.5배속', { bg: '#26324a', size: 12.5 });
      if (thermal && p.st !== 'ready') D.label(x0 + (e.s * boxPPM + bw) / 2 + 20, SGY + 52, '접촉면 ' + tC(ROOM + dT) + ' °C', { bg: '#7c2d92', size: 12.5 });
    } else if (p.scene === 'hands') {
      const cx = VW / 2, cy = MH / 2 - 8, A = 0.12, ppmH = PHONE ? 130 : 200;
      const tri = (tm) => { const per = 4 * A / HANDS.v, ph = (tm % per) / per; return (ph < 0.25 ? ph * 4 : ph < 0.75 ? 2 - ph * 4 : ph * 4 - 4) * A; };
      const off = p.st === 'ready' ? 0 : (tt >= HANDS.T ? 0 : tri(tt)) * ppmH;
      const w = PHONE ? 120 : 180, h = PHONE ? 46 : 64;
      const palm = (xx, yy, col, flip) => {
        if (dark) { D.roundRect(xx - w / 2, yy - h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(70,60,140,.55)'; ctx.fill(); ctx.strokeStyle = '#7f8bd9'; ctx.lineWidth = 2; ctx.stroke(); return; }
        D.shadow(() => { D.roundRect(xx - w / 2, yy - h / 2, w, h, h / 2); const g = ctx.createLinearGradient(0, yy - h / 2, 0, yy + h / 2); g.addColorStop(0, C.shade(col, 0.2)); g.addColorStop(1, C.shade(col, -0.12)); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
      };
      palm(cx - off, cy - h / 2 + 2, '#f0c6a0'); palm(cx + off, cy + h / 2 - 2, '#e8b88e');
      if (thermal) heatBlob(cx, cy, w * 0.6, h * 0.6, dT, 2);
      else if (dT > 0.02) { for (let i = 0; i < 5; i++) { const wx = cx - w * 0.3 + i * w * 0.15, wy = cy - h - 8 - Math.sin(S.clock * 4 + i) * 4; ctx.strokeStyle = 'rgba(226,70,75,' + clamp(dT / 3, 0, 0.8) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(wx, wy + 14); ctx.bezierCurveTo(wx - 6, wy + 6, wx + 6, wy - 2, wx, wy - 12); ctx.stroke(); } }
      D.arrow(cx - w / 2 - 20, cy - h / 2 + 2, cx - w / 2 - 20 + (p.st === 'go' && tt < HANDS.T ? 36 : 0), cy - h / 2 + 2, { color: '#14a058', width: 4 });
      if (p.st !== 'ready') D.label(cx, cy - h - 36, '손의 속력 ' + f2(e.v) + ' m/s', { bg: '#14a058', size: PHONE ? 12 : 13.5 });
      T(cx, cy + h + 34, '문지르는 힘 ' + HANDS.f + ' N · 문지른 거리 ' + f1(e.s) + ' m', 13.5, dark ? '#c9d2ff' : '#5a6679', 'center', 800);
      if (thermal && p.st !== 'ready') D.label(cx, cy + h + 62, '손바닥 사이 ' + tC(ROOM + dT) + ' °C', { bg: '#7c2d92', size: 12.5 });
    } else {
      const nx = nailX(), ny = nailY(), blockW = PHONE ? 160 : 230, ppmN = PHONE ? 80 : 100, nh = 40 - e.hits * 3;
      ctx.fillStyle = dark ? '#33265c' : '#c28b4b'; D.roundRect(nx - blockW / 2, SGY - 10, blockW, 26, 4); ctx.fill();
      if (!dark) { ctx.strokeStyle = 'rgba(100,60,20,.4)'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(nx - blockW / 2 + 10, SGY - 4 + i * 5); ctx.lineTo(nx + blockW / 2 - 10, SGY - 4 + i * 5); ctx.stroke(); } }
      const nailTop = ny - nh + 6;
      ctx.fillStyle = dark ? 'rgba(160,170,230,.8)' : '#9aa5b8'; ctx.fillRect(nx - 3, nailTop, 6, nh); ctx.fillRect(nx - 12, nailTop - 4, 24, 5);
      if (thermal) { heatBlob(nx, nailTop + 8, 26, 22, dT, 1); heatBlob(nx, ny + 4, 30, 14, dT * 0.8, 1); }
      const hy = p.st === 'ready' ? NAIL.drop : e.hy, headY = nailTop - 4 - hy * ppmN, hh = 26;
      ctx.strokeStyle = dark ? '#7f8bd9' : '#8a5a26'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(nx + 6, headY - hh / 2); ctx.lineTo(nx + 70, headY - 70); ctx.stroke();
      D.shadow(() => { D.roundRect(nx - 28, headY - hh, 56, hh, 5); ctx.fillStyle = dark ? 'rgba(70,60,140,.8)' : '#6b778c'; ctx.fill(); }, { blur: 5, y: 2 });
      if (p.st === 'go' && Math.abs(e.v - NAIL.v) < 1e-9) D.arrow(nx - 44, headY - hh / 2 - 6, nx - 44, headY - hh / 2 + 24, { color: '#14a058', width: 5 });
      if (p.st !== 'ready') D.label(nx + 120, Math.max(headY - 50, 70), '망치 속력 ' + f2(e.v) + ' m/s', { bg: '#14a058', size: PHONE ? 12 : 13.5 });
      T(nx, SGY + 52, '망치 ' + NAIL.m + ' kg · 내리치는 속력 ' + NAIL.v + ' m/s · ' + e.hits + ' / ' + NAIL.n + '번', 13.5, dark ? '#c9d2ff' : '#5a6679', 'center', 800);
      if (thermal && p.st !== 'ready') D.label(nx, SGY + 78, '못 ' + tC(ROOM + dT) + ' °C', { bg: '#7c2d92', size: 12.5 });
    }
    if (p.st === 'ready') T(VW / 2, PHONE ? 58 : 66, '▶ 시작 버튼을 눌러 보세요', 14.5, dark ? '#c9d2ff' : '#5a6679', 'center', 800);
    if (thermal) { // 색 막대
      const bx = VW - (PHONE ? 22 : 30), by = 70, bh2 = PHONE ? 110 : 140;
      const dm = p.scene === 'nail' ? 1 : 2;
      for (let i = 0; i < bh2; i++) { ctx.fillStyle = heatColor((1 - i / bh2) * dm, dm); ctx.fillRect(bx, by + i, 10, 1.5); }
      T(bx - 4, by + 8, (ROOM + dm) + ' °C', 11.5, '#c9d2ff', 'right', 800); T(bx - 4, by + bh2, ROOM + ' °C', 11.5, '#c9d2ff', 'right', 800);
    }
    parts.update(dt); parts.draw(ctx); endMain();
    // ----- 데이터: 속력과 온도 그래프 -----
    panel(RL.x, RL.y, RL.w, RL.h, 14);
    T(RL.x + 12, RL.y + 22, '움직임(속력)과 온도 변화', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    const gr = { x: RL.x + 40, y: RL.y + 64, w: RL.w - 88, h: RL.h - 64 - (PHONE ? 40 : 52) };
    const vmax = sc.vmax, dmax = p.scene === 'nail' ? 1.0 : 2.0, tmax = sc.T;
    const gx = (t) => gr.x + t / tmax * gr.w, gyv = (v) => gr.y + gr.h - v / vmax * gr.h, gyt = (d) => gr.y + gr.h - d / dmax * gr.h;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const yy = gr.y + gr.h - i / 4 * gr.h; ctx.strokeStyle = i === 0 ? '#516079' : 'rgba(120,135,160,.22)'; ctx.lineWidth = i === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(gr.x, yy); ctx.lineTo(gr.x + gr.w, yy); ctx.stroke(); T(gr.x - 6, yy + 4, f1(vmax * i / 4), 11.5, '#1d4ed8', 'right', 800); T(gr.x + gr.w + 6, yy + 4, f1(dmax * i / 4), 11.5, '#c0392b', 'left', 800); }
    for (let i = 0; i <= 3; i++) { const tv = tmax * i / 3; T(gx(tv), gr.y + gr.h + 15, f1(tv), 11.5, '#3a465c', 'center', 800); }
    T(gr.x + gr.w / 2, gr.y + gr.h + 31, '시간 (s)', 11.5, '#3a465c', 'center', 800);
    T(gr.x - 30, gr.y - 12, '속력(m/s)', 11.5, '#1d4ed8', 'left', 800); T(gr.x + gr.w + 30, gr.y - 12, 'ΔT(°C)', 11.5, '#c0392b', 'right', 800);
    const line = (key, fy, col) => { if (p.smp.length < 2) return; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); p.smp.forEach((s2, i) => { const X = gx(s2.t), Y = fy(s2[key]); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke(); };
    if (p.scene === 'nail') { /* 못: 계단 모양이 되도록 그대로 그려요 */ }
    line('v', gyv, '#3867f4'); line('dT', gyt, '#e2464b');
    if (p.st === 'ready') T(gr.x + gr.w / 2, gr.y + gr.h / 2, '시작하면 그래프가 그려져요', 13, '#98a2b3', 'center', 700);
    const lastS = p.smp.length ? p.smp[p.smp.length - 1] : null;
    T(RL.x + 12, RL.y + 40, '파랑: 속력 · 빨강: 온도 상승', 12, '#5a6679', 'left', 700);
    // ----- 데이터: 기록 표 -----
    const name = (s) => SCN[s].name.replace(/^[^ ]+ /, '');
    drawTable(RR, '세 장면의 열 측정 (실내 ' + ROOM + ' °C)', [
      { h: '장면', w: 1.5, get: (x) => name(x.scene) }, { h: '생긴 열 Q (J)', w: 1.2, get: (x) => eJ(x.Q), color: '#c2410c' },
      { h: '열용량 (J/°C)', w: 1.1, get: (x) => x.C }, { h: '온도 상승 ΔT', w: 1.2, get: (x) => tC(x.dT) + ' °C', color: '#c0392b' },
    ], p.rows, PHONE ? 4 : 5, '장면을 실행하면 기록이 쌓여요');
    T(RR.x + 12, RR.y + RR.h - 12, 'ΔT = Q / 열용량 (Q = c m ΔT)', 12.5, '#5a6679', 'left', 800);
  }
  function drawStop(dt) {
    const th = S.sp.cam;
    bgData(); beginMain(); if (!th) bgMain();
    drawStopScene(dt);
  }

  /* =====================================================
     ② 에너지 장부: 마찰 비탈, 비탄성 충돌, 줄의 실험
     ===================================================== */
  const TS_SLOPE = 0.7, TS_CRASH = 0.6;
  function resetLedger(keepSub) {
    const p = S.lg;
    S.lg = { sub: keepSub && p ? p.sub : 'slope', sl: { st: 'ready', t: 0 }, cr: { st: 'ready', t: 0 }, jo: { n: 0, st: 'idle', q: 0, ph: 'fall', t: 0, dur: 1.5, fast: false, e: 0, wind: 0 }, led: { slope: { ran: false, q: null }, crash: { ran: false, q: null } }, lastQ: null };
    updateCtl();
  }
  const slopeEval = (t) => { const tt = Math.min(t, Math.sqrt(2 * SLOPE.L / SLOPE.a)), s = 0.5 * SLOPE.a * tt * tt; return { s, v: SLOPE.a * tt, Ep: SLOPE.m * G * SLOPE.h * (1 - s / SLOPE.L), Ek: 0.5 * SLOPE.m * SLOPE.a * SLOPE.a * tt * tt }; };
  const slopeT = () => Math.sqrt(2 * SLOPE.L / SLOPE.a);
  const crashGeom = { x0: 1.0, xB: 6.0, w: 1.0 };
  const crashTc = () => (crashGeom.xB - crashGeom.w - crashGeom.x0) / CRASH.vA;     // 충돌까지 걸리는 시간
  function crashEval(t) {
    const tc = crashTc();
    if (t < tc) return { xA: crashGeom.x0 + CRASH.vA * t, xB: crashGeom.xB, vA: CRASH.vA, vB: 0, hit: false };
    const d = CRASH.v2 * (t - tc);
    return { xA: crashGeom.x0 + CRASH.vA * tc + d, xB: crashGeom.xB + d, vA: CRASH.v2, vB: CRASH.v2, hit: true };
  }
  const crashEnd = () => crashTc() + 1.4;
  function lgRun() {
    const p = S.lg;
    if (p.sub === 'slope') { const o = p.sl; if (o.st === 'go') return false; if (o.st === 'done') { o.st = 'ready'; o.t = 0; updateCtl(); return false; } o.st = 'go'; o.t = 0; Sound.click(); updateCtl(); return true; }
    if (p.sub === 'crash') { const o = p.cr; if (o.st === 'go') return false; if (o.st === 'done') { o.st = 'ready'; o.t = 0; updateCtl(); return false; } o.st = 'go'; o.t = 0; o.sparked = false; Sound.click(); updateCtl(); return true; }
    return false;
  }
  function jouleDrop(k) {
    const j = S.lg.jo; if (j.st !== 'idle' || j.n >= 60) return false;
    j.fast = k > 1; j.queue = Math.min(k, 60 - j.n); j.st = 'run'; j.ph = 'fall'; j.t = 0; j.dur = j.fast ? 0.22 : 1.5; Sound.click(); updateCtl(); return true;
  }
  function stepLedger(dt) {
    const p = S.lg;
    if (p.sub === 'slope' && p.sl.st === 'go') {
      const o = p.sl; o.t += dt * TS_SLOPE;
      if (o.t >= slopeT()) { o.t = slopeT(); o.st = 'done'; p.led.slope.ran = true; Sound.tick(); updateCtl(); }
    } else if (p.sub === 'crash' && p.cr.st === 'go') {
      const o = p.cr; o.t += dt * TS_CRASH;
      if (!o.sparked && o.t >= crashTc()) { o.sparked = true; Sound.tick(); parts.burst(CRX(crashGeom.xB - crashGeom.w / 2), SLGY - 40, { count: 16, speed: 150, size: 3, colors: ['#ffb400', '#fff', '#ff8a3d'], gravity: 200 }); }
      if (o.t >= crashEnd()) { o.t = crashEnd(); o.st = 'done'; p.led.crash.ran = true; updateCtl(); }
    } else if (p.sub === 'joule') {
      const j = p.jo; if (j.st !== 'run') return;
      j.t += dt;
      if (j.ph === 'fall') {
        j.e = j.n * JOULE.E1 + JOULE.E1 * Math.min(1, j.t / j.dur);
        if (j.t >= j.dur) { j.n++; j.e = j.n * JOULE.E1; j.ph = 'wind'; j.t = 0; j.queue--; if (!j.fast) Sound.tick(); }
      } else if (j.ph === 'wind') {
        const wd = j.fast ? 0.04 : 0.3;
        if (j.t >= wd) { if (j.queue > 0 && j.n < 60) { j.ph = 'fall'; j.t = 0; } else { j.st = 'idle'; j.ph = 'fall'; j.t = 0; Sound.success(); updateCtl(); } }
      }
    }
  }
  const SLPPM = PHONE ? 20 : 26, SLX0 = PHONE ? 30 : 70, SLGY = MH - 60;
  const CRPPM = PHONE ? 50 : 100, CRX0 = 40;
  const CRX = (m) => CRX0 + m * CRPPM;
  function ledgerBars(rr, items, hi, title) { drawEBars(rr, title, items, 0, hi, 'J', { labW: 100 }); }
  function drawSlopeScene(dt) {
    const o = S.lg.sl, e = slopeEval(o.st === 'ready' ? 0 : o.t);
    T(16, PHONE ? 24 : 30, '🏔️ 마찰 있는 비탈: ' + f1(SLOPE.m) + ' kg 상자가 ' + SLOPE.h + ' m 높이에서 미끄러져요', PHONE ? 12.5 : 17, '#26324a', 'left', 800);
    const hpx = SLOPE.h * SLPPM, run = Math.sqrt(SLOPE.L * SLOPE.L - SLOPE.h * SLOPE.h) * SLPPM, x0 = SLX0, topY = SLGY - hpx;
    ctx.fillStyle = '#b6c2d4'; ctx.fillRect(24, SLGY, VW - 48, 12); ctx.fillStyle = '#8a98ae'; ctx.fillRect(24, SLGY, VW - 48, 3);
    ctx.beginPath(); ctx.moveTo(x0, topY); ctx.lineTo(x0 + run, SLGY); ctx.lineTo(x0, SLGY); ctx.closePath();
    const g = ctx.createLinearGradient(0, topY, 0, SLGY); g.addColorStop(0, '#d6b98f'); g.addColorStop(1, '#a98657'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#7a5a2e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, topY); ctx.lineTo(x0 + run, SLGY); ctx.stroke();
    ctx.strokeStyle = 'rgba(90,60,25,.55)'; ctx.lineWidth = 2; for (let i = 1; i < 14; i++) { const t = i / 14, px = x0 + run * t, py = topY + hpx * t; ctx.beginPath(); ctx.moveTo(px - 3, py + 3); ctx.lineTo(px + 3, py - 3); ctx.stroke(); }
    D.arrow(x0 - 16, SLGY - 2, x0 - 16, topY + 2, { color: '#5a6679', width: 3, head: 9 }); D.label(x0 - 16, (SLGY + topY) / 2, SLOPE.h + ' m', { bg: '#fff', color: '#26324a', size: 12.5, border: '#c3ccd9' });
    const th = Math.atan2(hpx, run), bw = PHONE ? 30 : 40, bh = PHONE ? 20 : 28;
    const sx = x0 + e.s / SLOPE.L * run, sy = topY + e.s / SLOPE.L * hpx;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(th); D.shadow(() => { D.roundRect(-bw / 2, -bh, bw, bh, 4); ctx.fillStyle = '#c9a15d'; ctx.fill(); }, { blur: 4, y: 2 }); ctx.strokeStyle = '#8a5a26'; ctx.lineWidth = 2; ctx.strokeRect(-bw / 2 + 2, -bh + 2, bw - 4, bh - 4); ctx.restore();
    if (o.st !== 'ready') { D.label(clamp(sx + 70, 110, VW - 80), Math.max(sy - 46, 80), '속력 ' + f2(e.v) + ' m/s', { bg: '#14a058', size: PHONE ? 12 : 13.5 }); }
    if (o.st !== 'ready') D.label(VW - (PHONE ? 66 : 82), PHONE ? 52 : 58, '🐌 ' + TS_SLOPE + '배속', { bg: '#26324a', size: 12.5 });
    D.label(VW - (PHONE ? 118 : 150), PHONE ? 84 : 92, '마찰력 ' + SLOPE.f + ' N · 비탈 길이 ' + SLOPE.L + ' m', { bg: '#a98657', size: PHONE ? 11.5 : 13 });
    if (o.st === 'ready') T(VW / 2 + 60, PHONE ? 62 : 72, '▶ 내려 보내기를 눌러 보세요', 14.5, '#5a6679', 'center', 800);
    parts.update(dt); parts.draw(ctx); endMain();
    // 장부
    const q = S.lg.led.slope.q, qv = q == null ? 0 : q;
    const show = o.st !== 'ready';
    ledgerBars(RL, [
      { label: '처음 에너지', color: '#8b97ab', val: SLOPE.E0 },
      { label: '운동 에너지', color: '#3867f4', val: show ? e.Ek : 0 },
      { label: '위치 에너지', color: '#e2552a', val: show ? e.Ep : SLOPE.E0 },
      { label: '장부의 열 Q', color: '#e2464b', val: qv },
      { label: '합 (E_k+E_p+Q)', color: '#14a058', val: (show ? e.Ek + e.Ep : SLOPE.E0) + qv, ghost: SLOPE.E0 },
    ], SLOPE.E0 * 1.15, '에너지 장부 (J)');
    ledgerText(RR, 'slope', o.st === 'done', SLOPE.E0, SLOPE.Ek, SLOPE.Q);
  }
  /* 장부 설명 패널 */
  function ledgerText(rr, key, done, E0, Eend, Qtrue) {
    panel(rr.x, rr.y, rr.w, rr.h, 14);
    T(rr.x + 12, rr.y + 22, '장부 쓰기', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let y = rr.y + 46; const bw = rr.w - 28, led = S.lg.led[key];
    y += textBlock(rr.x + 14, y, bw, '처음 에너지 ' + eJ(E0) + ' J', 13.5, '#26324a', 19, 800) + 2;
    if (!done) { textBlock(rr.x + 14, y + 4, bw, '움직임이 끝나면 나중 운동 에너지를 읽고, 사라진 에너지를 열 Q로 장부에 적어요.', 13, '#5a6679', 18, 700); return; }
    y += textBlock(rr.x + 14, y, bw, '나중 역학적 에너지 ' + eJ(Eend) + ' J → 줄어든 양 ' + eJ(E0 - Eend) + ' J', 13.5, '#3867f4', 19, 800) + 2;
    if (led.q == null) { textBlock(rr.x + 14, y + 4, bw, '줄어든 에너지는 사라진 걸까요? 열 Q를 입력해 합을 맞춰 봐요.', 13, '#5a6679', 18, 700); return; }
    const sum = Eend + led.q, ok = Math.abs(sum - E0) < 0.5;
    y += textBlock(rr.x + 14, y, bw, eJ(Eend) + ' + ' + eJ(led.q) + ' = ' + eJ(sum) + ' J ' + (ok ? '✅' : '❌'), 14.5, ok ? '#0b6b39' : '#a3262b', 20, 800) + 4;
    textBlock(rr.x + 14, y, bw, ok ? '합이 처음 에너지와 같아요. 줄어든 역학적 에너지는 열로 바뀌었어요!' : '합이 ' + eJ(E0) + ' J이 아니에요. 열 Q를 다시 생각해 봐요.', 13, ok ? '#0b6b39' : '#a3262b', 18, 800);
  }
  function drawCrashScene(dt) {
    const o = S.lg.cr, e = crashEval(o.st === 'ready' ? 0 : o.t);
    T(16, PHONE ? 24 : 30, '💥 비탄성(합체) 충돌: A ' + f1(CRASH.mA) + ' kg(' + f1(CRASH.vA) + ' m/s) + B ' + f1(CRASH.mB) + ' kg', PHONE ? 12.5 : 17, '#26324a', 'left', 800);
    ctx.fillStyle = '#b6c2d4'; ctx.fillRect(24, SLGY, VW - 48, 12); ctx.fillStyle = '#8a98ae'; ctx.fillRect(24, SLGY, VW - 48, 3);
    const w = crashGeom.w * CRPPM;
    drawBlock(CRX(e.xA), SLGY, w, '#3867f4', 'A', CRASH.mA); drawBlock(CRX(e.xB), SLGY, w, '#f2873a', 'B', CRASH.mB);
    const jx = CRX((e.xA + e.xB) / 2);
    if (e.hit) { for (let i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(226,70,75,' + (0.6 - i * 0.18) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(jx, SLGY - 40, 18 + i * 14 + (o.t - crashTc()) * 20 % 14, -0.9, 0.9); ctx.stroke(); } T(jx, SLGY - 112, '소리 · 변형 · 열', 13, '#c0392b', 'center', 800); }
    D.arrow(CRX(e.xA), SLGY - 100, CRX(e.xA) + e.vA * (PHONE ? 16 : 28), SLGY - 100, { color: '#14a058', width: 5, label: f1(e.vA) + ' m/s', labelOffset: -15, labelSize: PHONE ? 12 : 13 });
    if (!e.hit) T(CRX(e.xB), SLGY - 100, 'B 0.0 m/s', 12.5, '#5a6679', 'center', 800);
    if (o.st !== 'ready') D.label(VW - (PHONE ? 66 : 82), PHONE ? 52 : 58, '🐌 ' + TS_CRASH + '배속', { bg: '#26324a', size: 12.5 });
    if (o.st === 'ready') T(VW / 2, PHONE ? 62 : 72, '▶ 충돌을 눌러 보세요', 14.5, '#5a6679', 'center', 800);
    parts.update(dt); parts.draw(ctx); endMain();
    const q = S.lg.led.crash.q, qv = q == null ? 0 : q, show = o.st !== 'ready';
    const ek = 0.5 * CRASH.mA * e.vA * e.vA + 0.5 * CRASH.mB * e.vB * e.vB;
    ledgerBars(RL, [
      { label: '처음 에너지', color: '#8b97ab', val: CRASH.E0 },
      { label: '지금 운동 에너지', color: '#3867f4', val: show ? ek : CRASH.E0 },
      { label: '장부의 열 Q', color: '#e2464b', val: qv },
      { label: '합 (E_k+Q)', color: '#14a058', val: (show ? ek : CRASH.E0) + qv, ghost: CRASH.E0 },
    ], CRASH.E0 * 1.15, '에너지 장부 (J)');
    ledgerText(RR, 'crash', o.st === 'done', CRASH.E0, CRASH.Ek, CRASH.Q);
  }
  function drawBlock(cx, gy, w, col, name, m) {
    const h = PHONE ? 30 : 46;
    D.shadow(() => { D.roundRect(cx - w / 2, gy - h, w, h, 5); const g = ctx.createLinearGradient(0, gy - h, 0, gy); g.addColorStop(0, C.shade(col, 0.2)); g.addColorStop(1, C.shade(col, -0.15)); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
    T(cx, gy - h / 2 + 5, name + ' ' + f1(m) + ' kg', PHONE ? 11 : 13.5, '#fff', 'center', 800);
  }
  /* 줄의 실험 */
  function drawJoule(dt) {
    const j = S.lg.jo, topY = 74, hpx = PHONE ? 84 : 118, px = PHONE ? 90 : 160, pulleyY = 56;
    T(16, PHONE ? 24 : 30, '🌀 줄의 실험: 추가 내려가며 날개를 돌려 물을 휘저어요', PHONE ? 12.5 : 17, '#26324a', 'left', 800);
    const frac = j.st === 'run' ? (j.ph === 'fall' ? Math.min(1, j.t / j.dur) : 1 - Math.min(1, j.t / (j.fast ? 0.04 : 0.3))) : 0;
    const wy = topY + 10 + frac * hpx;
    // 기둥과 도르래
    ctx.fillStyle = '#7b889e'; ctx.fillRect(px - 5, pulleyY, 10, hpx + 92); ctx.fillRect(px - 50, topY + hpx + 60, 100, 10);
    D.sphere(px, pulleyY, 14, '#9aa5b8', { gloss: true }); ctx.strokeStyle = '#4d5a78'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px + 14, pulleyY); ctx.lineTo(px + 120, pulleyY); ctx.stroke();
    // 추
    ctx.strokeStyle = '#4d5a78'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 14, pulleyY); ctx.lineTo(px - 14, wy); ctx.stroke();
    D.shadow(() => { D.roundRect(px - 34, wy, 40, 34, 6); ctx.fillStyle = '#4b5a78'; ctx.fill(); }, { blur: 5, y: 2 }); T(px - 14, wy + 22, JOULE.M + ' kg', 13, '#fff', 'center', 800);
    D.dashedLine(px - 70, topY + 10 + hpx + 34, px + 20, topY + 10 + hpx + 34, { color: '#8b97ab', width: 2 });
    D.arrow(px - 62, topY + 10, px - 62, topY + 10 + hpx, { color: '#5a6679', width: 3, head: 9 }); D.label(px - 62, topY + 10 + hpx / 2, f1(JOULE.h) + ' m', { bg: '#fff', color: '#26324a', size: 12, border: '#c3ccd9' });
    // 열량계 (물 + 날개)
    const bx = PHONE ? 260 : 440, by = topY + 24, bwid = PHONE ? 130 : 170, bhei = PHONE ? 100 : 130;
    ctx.strokeStyle = '#4d5a78'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px + 120, pulleyY); ctx.lineTo(bx + bwid / 2, pulleyY); ctx.lineTo(bx + bwid / 2, by - 6); ctx.stroke();
    const dT = j.e / (JOULE.c * JOULE.mw), tint = clamp(dT / 3, 0, 1);
    D.beaker(bx, by, bwid, bhei, { level: 0.7, liquid: C.mix('#7cc4ff', '#ff9d66', tint), t: S.clock, wave: 3, ticks: 5 });
    const ang = j.n * 3 + (j.st === 'run' && j.ph === 'fall' ? frac * 3 : 0), cxp = bx + bwid / 2, cyp = by + bhei * 0.55;
    ctx.save(); ctx.strokeStyle = '#4d5a78'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cxp, by - 4); ctx.lineTo(cxp, cyp); ctx.stroke();
    for (let i = 0; i < 4; i++) { const a = ang * 2 + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(cxp + Math.cos(a) * bwid * 0.32, cyp + Math.sin(a) * 6); ctx.stroke(); } ctx.restore();
    T(bx + bwid / 2, by + bhei + 22, '물 ' + f1(JOULE.mw) + ' kg', 13, '#26324a', 'center', 800);
    // 온도계 표시
    D.label(bx + bwid + (PHONE ? 4 : 30), by + 20, '물 ' + t3(ROOM + dT) + ' °C', { bg: '#c0392b', size: PHONE ? 12 : 13.5, align: 'left' });
    D.label(bx + bwid + (PHONE ? 4 : 30), by + 52, '추 ' + j.n + '번 낙하', { bg: '#26324a', size: PHONE ? 12 : 13.5, align: 'left' });
    if (j.st === 'idle' && j.n === 0) T(VW / 2 + 40, PHONE ? 62 : 72, '⬇️ 추 떨어뜨리기를 눌러 보세요', 14.5, '#5a6679', 'center', 800);
    parts.update(dt); parts.draw(ctx); endMain();
    const lost = j.e, qw = JOULE.c * JOULE.mw * dT;
    ledgerBars(RL, [
      { label: '추의 위치 에너지 감소', color: '#e2552a', val: lost },
      { label: '물이 얻은 열 Q', color: '#e2464b', val: qw },
      { label: '합이 맞는지', color: '#14a058', val: qw, ghost: lost },
    ], Math.max(400, JOULE.E1 * Math.max(2, j.n) * 1.1), '줄의 실험 (J)');
    panel(RR.x, RR.y, RR.w, RR.h, 14);
    T(RR.x + 12, RR.y + 22, '열량 계산 (Q = c m ΔT)', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let y = RR.y + 46; const bw = RR.w - 28;
    y += textBlock(RR.x + 14, y, bw, '추 1번: mgh = ' + JOULE.M + ' × ' + G + ' × ' + f1(JOULE.h) + ' = ' + JOULE.E1 + ' J', 13.5, '#c2410c', 19, 800) + 2;
    y += textBlock(RR.x + 14, y, bw, '물의 온도 상승(1번) = ' + JOULE.E1 + ' / (' + JOULE.c + ' × ' + f1(JOULE.mw) + ') = ' + t3(JOULE.dT1) + ' °C', 13.5, '#26324a', 19, 800) + 2;
    y += textBlock(RR.x + 14, y, bw, j.n + '번 낙하 → 열 ' + eJ(lost) + ' J → 온도 ' + t3(dT) + ' °C 상승', 13.5, '#c0392b', 19, 800) + 4;
    textBlock(RR.x + 14, y, bw, '추가 잃은 위치 에너지가 모두 물의 열이 돼요. (비열 ' + JOULE.c + ' J/kg·°C)', 13, '#5a6679', 18, 700);
  }
  function drawLedger(dt) {
    bgData(); beginMain(); bgMain();
    const s = S.lg.sub;
    if (s === 'slope') drawSlopeScene(dt); else if (s === 'crash') drawCrashScene(dt); else drawJoule(dt);
  }

  /* =====================================================
     ③ 열 현상: 열이 된 에너지가 일으키는 현상 (중학교 개념과 연결)
     ===================================================== */
  const CONC = { A: { t: '열의 이동', s: '전도·대류·복사', color: '#3867f4' }, B: { t: '비열과 온도 변화', s: 'Q = cmΔT', color: '#e2552a' }, C: { t: '상태 변화와 열', s: '온도가 일정한 구간', color: '#14a058' }, D: { t: '기상 현상', s: '열 → 바람', color: '#8b5cf6' } };
  const CARDS = [
    { icon: '🖐️', title: '문지른 손바닥의 열이 책상과 공기로 퍼져요', became: '손바닥 마찰로 생긴 열', fact: '시간이 지나면 열이 주변으로 흩어져 다시 모으기 어려워요.', ans: 'A' },
    { icon: '🚗', title: '브레이크 디스크가 뜨거워져요', became: '자동차의 운동 에너지', fact: 'E_k ' + eJ(CAR.E0 / 1000) + ' kJ / (' + CAR.mdisc + ' kg × ' + CAR.cdisc + ' J/kg·°C) = ' + eJ(CAR.dT) + ' °C 상승', ans: 'B' },
    { icon: '🧊', title: '마찰열로 얼음 조각이 녹아요', became: '미끄러진 얼음의 운동 에너지', fact: '얼음이 녹는 동안 열을 받아도 온도는 0 °C로 일정해요.', ans: 'C' },
    { icon: '🌊', title: '폭포 아래 물의 온도가 올라가요', became: '떨어진 물의 위치 에너지', fact: '낙차 ' + FALLS.h + ' m → ΔT = gh / c = ' + G + ' × ' + FALLS.h + ' / ' + FALLS.c + ' = ' + tC(FALLS.dT) + ' °C', ans: 'B' },
    { icon: '☄️', title: '유성이 대기와 마찰해 밝게 빛나요', became: '유성의 운동 에너지', fact: '열과 빛으로 에너지가 사방으로 퍼져 나가요(복사).', ans: 'A' },
    { icon: '🌀', title: '태풍이 강한 바람을 만들어요', became: '바다의 열에너지(수증기의 응결열)', fact: '수증기가 물방울로 변하며 내놓는 열이 공기를 움직이는 에너지가 돼요.', ans: 'D' },
  ];
  function resetPh() { S.ph = { sel: 0, ans: {}, ok: {} }; updateCtl(); }
  function cardRect(i) {
    const cols = PHONE ? 2 : 3, rows = PHONE ? 3 : 2, m = 12, gap = 10, top = PHONE ? 44 : 50;
    const w = (VW - m * 2 - gap * (cols - 1)) / cols, h = (MH - top - m - gap * (rows - 1)) / rows;
    return { x: m + (i % cols) * (w + gap), y: top + Math.floor(i / cols) * (h + gap), w, h };
  }
  function drawPh(dt) {
    bgData(); beginMain(); bgMain();
    const p = S.ph;
    T(16, PHONE ? 24 : 30, '🌡️ 에너지가 열로 바뀌면 어떤 현상이 나타날까요?', PHONE ? 14 : 17, '#26324a', 'left', 800);
    CARDS.forEach((c, i) => {
      const r = cardRect(i), sel = p.sel === i, a = p.ans[i], col = a ? CONC[a].color : '#8b97ab';
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: sel ? 12 : 6, y: 2 });
      if (sel) { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 3; ctx.stroke(); }
      // 열 번짐 효과
      const pul = 0.5 + 0.5 * Math.sin(S.clock * 2.4 + i);
      D.glow(r.x + (PHONE ? 30 : 42), r.y + r.h / 2, (PHONE ? 30 : 44) + pul * 6, i === 2 ? '#7cc4ff' : '#ff8a3d', 0.35 + pul * 0.15);
      ctx.font = (PHONE ? 30 : 44) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
      ctx.fillText(c.icon, r.x + (PHONE ? 30 : 42), r.y + r.h / 2 + 2); ctx.textBaseline = 'alphabetic';
      const tx = r.x + (PHONE ? 56 : 82), tw = r.w - (PHONE ? 56 : 82) - 40;
      const ls = wrap(c.title, tw, PHONE ? 12 : 13.5, 800).slice(0, 4);
      ls.forEach((l, k) => T(tx, r.y + (PHONE ? 20 : 26) + k * (PHONE ? 14 : 17), l, PHONE ? 12 : 13.5, '#26324a', 'left', 800));
      D.roundRect(r.x + r.w - 34, r.y + 6, 28, 28, 14); ctx.fillStyle = a ? col : '#e8ecf4'; ctx.fill();
      T(r.x + r.w - 20, r.y + 26, a || '?', 14, a ? '#fff' : '#98a2b3', 'center', 800);
      if (p.ok[i] === true) D.check(r.x + 14, r.y + 14, 9, 1);
    });
    parts.update(dt); parts.draw(ctx); endMain();
    // 범례
    panel(RL.x, RL.y, RL.w, RL.h, 14);
    T(RL.x + 12, RL.y + 22, '중학교에서 배운 개념', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let y = RL.y + 44;
    Object.keys(CONC).forEach((k) => {
      D.roundRect(RL.x + 12, y - 15, 26, 26, 13); ctx.fillStyle = CONC[k].color; ctx.fill(); T(RL.x + 25, y + 5, k, 14, '#fff', 'center', 800);
      if (PHONE) { T(RL.x + 48, y + 5, CONC[k].t + ' (' + CONC[k].s + ')', 12.5, '#26324a', 'left', 800); y += 34; }
      else { T(RL.x + 48, y + 1, CONC[k].t, 14, '#26324a', 'left', 800); T(RL.x + 48, y + 18, CONC[k].s, 12.5, '#5a6679', 'left', 700); y += 48; }
    });
    // 선택한 카드 설명
    const c = CARDS[p.sel];
    panel(RR.x, RR.y, RR.w, RR.h, 14);
    T(RR.x + 12, RR.y + 22, (p.sel + 1) + '번 카드 ' + c.icon, PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let yy = RR.y + 46; const bw = RR.w - 28;
    yy += textBlock(RR.x + 14, yy, bw, '열이 된 에너지: ' + c.became, 13.5, '#c2410c', 19, 800) + 4;
    yy += textBlock(RR.x + 14, yy, bw, c.fact, 13.5, '#26324a', 19, 800) + 6;
    if (p.ok[p.sel] === true) textBlock(RR.x + 14, yy, bw, '✅ ' + CONC[c.ans].t + ' (' + CONC[c.ans].s + ')와 연결돼요.', 13.5, '#0b6b39', 19, 800);
    else textBlock(RR.x + 14, yy, bw, '이 현상은 어떤 개념으로 설명할 수 있을까요? 오른쪽 장치에서 A~D 중 하나를 골라요.', 13, '#5a6679', 18, 700);
  }
  const phSel = [];
  (function buildPh() {
    const box = $('#phRows');
    CARDS.forEach((c, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + (i + 1) + '. ' + c.icon + ' ' + c.title + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', (i + 1) + '번 카드와 연결할 개념');
      sel.innerHTML = '<option value="">연결할 개념 고르기</option>' + Object.keys(CONC).map((k) => '<option value="' + k + '">' + k + ' ' + CONC[k].t + ' (' + CONC[k].s + ')</option>').join('');
      sel.addEventListener('change', () => { S.ph.ans[i] = sel.value || undefined; S.ph.ok[i] = undefined; S.ph.sel = i; sel.classList.remove('ok', 'bad'); Sound.click(); });
      sel.addEventListener('focus', () => { S.ph.sel = i; });
      row.appendChild(sel); box.appendChild(row); phSel.push(sel);
    });
  })();
  function resetPhUI() { phSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }

  /* =====================================================
     ④ 총량 논증: 사라진 에너지 찾기
     ===================================================== */
  const ARG = {
    ball: { name: '⚽ 굴러가다 멈춘 공', E0: BALLS.E0, unit: 'J', k: 1, T: BALLS.v / BALLS.a, ts: 0.8, text: BALLS.m + ' kg 공이 ' + BALLS.v + ' m/s로 굴러가다 ' + BALLS.d + ' m를 가서 멈춰요.' },
    clay: { name: '🟤 떨어져 부딪힌 점토', E0: CLAY.E0, unit: 'J', k: 1, T: Math.sqrt(2 * CLAY.h / G) + 0.7, ts: 0.5, text: CLAY.m + ' kg 점토를 ' + f1(CLAY.h) + ' m 높이에서 떨어뜨렸더니 바닥에 붙어 멈췄어요. (바닥을 높이 0으로 정해요)' },
    car: { name: '🚗 급제동하는 자동차', E0: CAR.E0, unit: 'kJ', k: 1000, T: CAR.v / CAR.a, ts: 1, text: CAR.m + ' kg 자동차가 ' + CAR.v + ' m/s로 달리다 급제동해 ' + CAR.d + ' m를 가서 멈춰요.' },
  };
  const ARK = ['ball', 'clay', 'car'];
  function resetAr() {
    const p = S.ar;
    S.ar = { sel: p ? p.sel : 'ball', st: { ball: 'ready', clay: 'ready', car: 'ready' }, t: { ball: 0, clay: 0, car: 0 }, ran: p ? p.ran : {}, inp: p ? p.inp : { ball: {}, clay: {}, car: {} }, ok: {} };
    updateCtl();
  }
  function arGo() {
    const a = S.ar, k = a.sel; if (a.st[k] === 'go') return false;
    a.st[k] = 'go'; a.t[k] = 0; a.ran[k] = true; Sound.click(); updateCtl(); return true;
  }
  function stepAr(dt) {
    const a = S.ar, k = a.sel; if (a.st[k] !== 'go') return;
    a.t[k] += dt * ARG[k].ts;
    if (a.t[k] >= ARG[k].T) { a.t[k] = ARG[k].T; a.st[k] = 'done'; Sound.tick(); updateCtl(); }
  }
  /* 시각 t에서 역학적 에너지(J) */
  function arEval(k, t) {
    if (k === 'ball') { const tt = Math.min(t, BALLS.v / BALLS.a), v = BALLS.v - BALLS.a * tt, s = BALLS.v * tt - 0.5 * BALLS.a * tt * tt; return { v, s, Em: 0.5 * BALLS.m * v * v }; }
    if (k === 'car') { const tt = Math.min(t, CAR.v / CAR.a), v = CAR.v - CAR.a * tt, s = CAR.v * tt - 0.5 * CAR.a * tt * tt; return { v, s, Em: 0.5 * CAR.m * v * v }; }
    const tf = Math.sqrt(2 * CLAY.h / G);
    if (t < tf) { const h = CLAY.h - 0.5 * G * t * t, v = G * t; return { v, h, Em: CLAY.m * G * h + 0.5 * CLAY.m * v * v }; }
    return { v: 0, h: 0, Em: 0 };
  }
  const arVal = (id) => { const v = num($(id).value); return isFinite(v) ? v : null; };
  function arCheckOne(k) {
    const inp = S.ar.inp[k], A = ARG[k], tol = (x) => Math.max(0.02 * A.k * 0, Math.abs(x) * 0.01 + 0.005);
    if (inp.a == null || inp.b == null || inp.c == null) return null;
    const E0 = A.E0 / A.k;
    return Math.abs(inp.a - E0) <= tol(E0) && Math.abs(inp.b - 0) <= 0.005 && Math.abs(inp.c - E0) <= tol(E0);
  }
  function drawArgue(dt) {
    bgData(); beginMain(); bgMain();
    const a = S.ar, k = a.sel, A = ARG[k], st = a.st[k], t = st === 'ready' ? 0 : a.t[k], e = arEval(k, t);
    T(16, PHONE ? 24 : 30, A.name, PHONE ? 15 : 18, '#26324a', 'left', 800);
    if (!PHONE) T(16, 52, A.text, 13.5, '#5a6679', 'left', 700); else textBlock(16, 44, VW - 32, A.text, 11.5, '#5a6679', 14, 700);
    if (k === 'ball') {
      const gy = MH - 66, ppm = (VW - 100) / 6.5, x0 = 50;
      ctx.fillStyle = '#9fc9a0'; ctx.fillRect(24, gy, VW - 48, 12); ctx.fillStyle = '#7fb083'; ctx.fillRect(24, gy, VW - 48, 3);
      const x = x0 + (0.5 + e.s) * ppm, r = PHONE ? 11 : 16;
      ctx.save(); ctx.translate(x, gy - r); ctx.rotate(e.s / (r / ppm)); D.sphere(0, 0, r, '#f2f4f8', { shadow: true, light: '#fff', dark: '#9aa5b8' }); ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0.2, 2.2); ctx.stroke(); ctx.restore();
      D.dashedLine(x0 + 0.5 * ppm, gy - 56, x0 + 0.5 * ppm, gy + 8, { color: '#8b97ab', width: 2 }); D.dashedLine(x0 + (0.5 + BALLS.d) * ppm, gy - 56, x0 + (0.5 + BALLS.d) * ppm, gy + 8, { color: '#8b97ab', width: 2 });
      T(x0 + (0.5 + BALLS.d / 2) * ppm, gy + 34, BALLS.d + ' m', 12.5, '#5a6679', 'center', 800);
      if (st !== 'ready' && e.v > 0.05) D.arrow(x + r + 6, gy - r, x + r + 6 + e.v * (PHONE ? 8 : 14), gy - r, { color: '#14a058', width: 5 });
      if (st !== 'ready') D.label(clamp(x, 90, VW - 90), gy - 56, '속력 ' + f2(e.v) + ' m/s', { bg: '#14a058', size: PHONE ? 12 : 13.5 });
      if (st !== 'ready') D.label(VW - (PHONE ? 66 : 82), PHONE ? 90 : 100, '🐌 ' + A.ts + '배속', { bg: '#26324a', size: 12.5 });
      if (e.s > 0.1) { ctx.fillStyle = 'rgba(226,70,75,' + clamp(e.s / BALLS.d * 0.45, 0, 0.5) + ')'; ctx.fillRect(x0 + 0.5 * ppm, gy, e.s * ppm, 4); }
    } else if (k === 'clay') {
      const gy = MH - 54, ppm = PHONE ? 80 : 100, cx = VW / 2 - 60, topY = gy - CLAY.h * ppm;
      ctx.fillStyle = '#b6c2d4'; ctx.fillRect(24, gy, VW - 48, 12); ctx.fillStyle = '#8a98ae'; ctx.fillRect(24, gy, VW - 48, 3);
      ctx.fillStyle = '#8b97ab'; ctx.fillRect(cx - 24, topY - 14, 48, 6);
      D.arrow(cx - 70, gy - 2, cx - 70, topY - 6, { color: '#5a6679', width: 3, head: 9 }); D.label(cx - 70, (gy + topY) / 2, f1(CLAY.h) + ' m', { bg: '#fff', color: '#26324a', size: 12.5, border: '#c3ccd9' });
      const tf = Math.sqrt(2 * CLAY.h / G), fallen = t >= tf, since = Math.max(0, t - tf);
      const r = PHONE ? 13 : 18, cy = st === 'ready' ? topY - r - 6 : fallen ? gy - 4 : gy - (CLAY.h - e.h) * 0 - e.h * ppm - r;
      if (fallen) { ctx.fillStyle = '#8b5a2b'; ctx.beginPath(); ctx.ellipse(cx, gy - 5, r * (1.6 + Math.min(1, since * 6) * 0.4), 6, 0, 0, TAU); ctx.fill(); if (since < 0.15 && !a.clayBurst) { a.clayBurst = true; parts.burst(cx, gy - 8, { count: 14, speed: 140, size: 3, colors: ['#ffb400', '#fff', '#ff8a3d'], gravity: 200 }); } T(cx, gy - 40, '소리 · 변형 · 열', 13, '#c0392b', 'center', 800, { alpha: clamp(since * 3, 0, 1) }); }
      else { D.sphere(cx, cy, r, '#a0693a', { shadow: true }); a.clayBurst = false; }
      if (st !== 'ready' && !fallen) D.label(cx + 80, clamp(cy, 80, MH - 90), '속력 ' + f2(e.v) + ' m/s', { bg: '#14a058', size: PHONE ? 12 : 13.5 });
      if (st !== 'ready') D.label(VW - (PHONE ? 66 : 82), PHONE ? 90 : 100, '🐌 ' + A.ts + '배속', { bg: '#26324a', size: 12.5 });
    } else {
      const gy = MH - 62, ppm = (VW - 150) / 45, x0 = 40;
      ctx.fillStyle = '#6b7384'; ctx.fillRect(24, gy - 2, VW - 48, 40); ctx.fillStyle = '#f5d142'; for (let i = 0; i < 10; i++) ctx.fillRect(34 + i * ((VW - 68) / 10), gy + 16, (VW - 68) / 22, 4);
      const w = (PHONE ? 62 : 90), x = x0 + e.s * ppm;
      D.shadow(() => { D.roundRect(x, gy - (PHONE ? 26 : 38), w, PHONE ? 26 : 38, 7); const g = ctx.createLinearGradient(0, gy - 38, 0, gy); g.addColorStop(0, '#5b8ae8'); g.addColorStop(1, '#3867f4'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
      ctx.fillStyle = 'rgba(214,236,252,.9)'; ctx.fillRect(x + w * 0.28, gy - (PHONE ? 22 : 33), w * 0.42, PHONE ? 10 : 15);
      [0.22, 0.78].forEach((q) => D.sphere(x + w * q, gy - 2, PHONE ? 6 : 8, '#2b3140', { gloss: false }));
      const heat = (CAR.E0 - e.Em) / (CAR.mdisc * CAR.cdisc);
      if (st !== 'ready') {
        const dx = x + w * 0.78, dy = gy - 2, hc = heat > 0.5 ? C.mix('#7a8aa6', '#ff5a2a', clamp(heat / CAR.dT, 0, 1)) : '#7a8aa6';
        D.glow(dx, dy, 22 + heat * 0.4, '#ff6a2a', clamp(heat / CAR.dT, 0, 1) * 0.7); D.sphere(dx, dy, PHONE ? 6 : 8, hc, { gloss: false });
        if (e.v > 0.5 && !RM) for (let i = 0; i < 2; i++) parts.emit({ x: dx, y: dy, vx: -40 - Math.random() * 60, vy: -Math.random() * 60, life: 0.4, size: 2, color: '#ffb400', gravity: 200, shape: 'circle' });
      }
      D.dashedLine(x0, gy - 60, x0, gy + 30, { color: '#fff', width: 2 }); D.dashedLine(x0 + CAR.d * ppm + w * 0.5, gy - 60, x0 + CAR.d * ppm + w * 0.5, gy + 30, { color: '#fff', width: 2 });
      T(x0 + CAR.d * ppm / 2 + w * 0.25, gy + 56, CAR.d + ' m', 12.5, '#5a6679', 'center', 800);
      if (st !== 'ready') { D.label(clamp(x + w / 2, 100, VW - 100), gy - 66, '속력 ' + f2(e.v) + ' m/s', { bg: '#14a058', size: PHONE ? 12 : 13.5 }); D.label(VW - (PHONE ? 100 : 130), PHONE ? 90 : 100, '디스크 +' + tC(heat) + ' °C', { bg: '#c0392b', size: 12.5 }); }
    }
    if (st === 'ready') T(VW / 2, PHONE ? 90 : 100, '▶ 실행을 눌러 보세요', 14.5, '#5a6679', 'center', 800);
    parts.update(dt); parts.draw(ctx); endMain();
    // 장부
    const inp = a.inp[k], q = inp.c, E0u = A.E0 / A.k;
    const qOK = arCheckOne(k) === true, show = st !== 'ready';
    drawEBars(RL, '에너지 장부 (' + A.unit + ')', [
      { label: '처음 역학적 에너지', color: '#8b97ab', val: E0u },
      { label: '지금 역학적 에너지', color: '#3867f4', val: (show ? e.Em : A.E0) / A.k },
      { label: '장부의 열 Q (내가 입력)', color: '#e2464b', val: q != null && isFinite(q) ? clamp(q, 0, E0u * 1.2) : 0 },
      { label: '합', color: '#14a058', val: (show ? e.Em : A.E0) / A.k + (q != null && isFinite(q) ? clamp(q, 0, E0u * 1.2) : 0), ghost: E0u },
    ], 0, E0u * 1.25, A.unit, { labW: 108 });
    panel(RR.x, RR.y, RR.w, RR.h, 14);
    T(RR.x + 12, RR.y + 22, '장부 맞추기', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let y = RR.y + 46; const bw = RR.w - 28;
    y += textBlock(RR.x + 14, y, bw, '① 움직임이 시작될 때 역학적 에너지는? ② 멈춘 뒤 역학적 에너지는? ③ 그 사이 줄어든 만큼은 어떤 형태로 바뀌었을까요?', 13, '#5a6679', 18, 700) + 4;
    if (inp.a != null && inp.b != null && inp.c != null) {
      const sum = inp.b + inp.c;
      y += textBlock(RR.x + 14, y, bw, '나중 ' + eJ(inp.b) + ' + 열 ' + eJ(inp.c) + ' = ' + eJ(sum) + ' ' + A.unit + ' (처음 입력 ' + eJ(inp.a) + ' ' + A.unit + ')', 13.5, qOK ? '#0b6b39' : '#a3262b', 19, 800) + 4;
      textBlock(RR.x + 14, y, bw, qOK ? '✅ 맞아요! 역학적 에너지는 줄었지만 열을 더하면 처음과 같아요.' : '❌ 값이 맞지 않아요. 처음 에너지와 열의 합이 같은지 확인해요.', 13, qOK ? '#0b6b39' : '#a3262b', 18, 800);
    }
  }

  /* ---------- 컨트롤 연결 ---------- */
  const curSub = () => (S.mode === 'ledger' ? S.lg.sub : S.mode === 'argue' ? S.ar.sel : S.mode === 'stop' ? S.sp.scene : '');
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-sub')) on = n.getAttribute('data-sub').split(' ').indexOf(curSub()) >= 0;
      if (on && n.hasAttribute('data-tin')) on = S.showT;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const p = S.sp;
    if (p) {
      $$('#spSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === p.scene));
      $$('#camSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.c === '1') === p.cam));
      const busy = p.st === 'go';
      $$('#spSeg button').forEach((b) => (b.disabled = busy));
      $('#bStop').disabled = busy;
      $('#bStop').textContent = p.st === 'done' ? '↺ 다시' : p.scene === 'box' ? '▶ 밀어 보내기' : p.scene === 'hands' ? '🖐️ 비비기' : '🔨 5번 두드리기';
    }
    const l = S.lg;
    if (l) {
      $$('#lgSub button').forEach((b) => b.classList.toggle('on', b.dataset.s === l.sub));
      const o = l.sub === 'slope' ? l.sl : l.cr, j = l.jo;
      const busy = l.sub === 'joule' ? j.st === 'run' : o.st === 'go';
      $('#bLgRun').disabled = busy;
      $('#bLgRun').textContent = o.st === 'done' ? '↺ 다시' : l.sub === 'slope' ? '▶ 내려 보내기' : '▶ 충돌';
      $('#bQWrite').disabled = !(o.st === 'done');
      $('#bJ1').disabled = j.st === 'run' || j.n >= 60; $('#bJ20').disabled = j.st === 'run' || j.n + 20 > 60;
      $('#oJn').textContent = j.n + '번';
    }
    const a = S.ar;
    if (a) {
      $$('#arSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === a.sel));
      const st = a.st[a.sel];
      $('#bArRun').disabled = st === 'go'; $('#bArRun').textContent = st === 'done' ? '↺ 다시' : '▶ 실행';
      const u = ARG[a.sel].unit; $('#arU1').textContent = u; $('#arU2').textContent = u; $('#arU3').textContent = u;
      $$('#arSeg button').forEach((b) => (b.disabled = st === 'go'));
    }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  /* ① */
  $$('#spSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); resetStop(b.dataset.s); }));
  $$('#camSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sp.cam = b.dataset.c === '1'; updateCtl(); }));
  $('#bStop').addEventListener('click', () => { if (S.sp.st === 'done') { parts.clear(); resetStop(); } else stopGo(); });
  /* ② */
  $$('#lgSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); S.lg.sub = b.dataset.s; updateCtl(); }));
  $('#bLgRun').addEventListener('click', () => { parts.clear(); lgRun(); });
  $('#bQWrite').addEventListener('click', () => {
    const l = S.lg, v = num($('#qInput').value);
    if (!isFinite(v) || v < 0) { showHint('열 Q를 0 이상의 숫자(J)로 입력해요.'); Sound.fail(); return; }
    l.led[l.sub].q = v; Sound.click(); updateCtl();
  });
  $('#bJ1').addEventListener('click', () => jouleDrop(1));
  $('#bJ20').addEventListener('click', () => jouleDrop(20));
  $('#bJReset').addEventListener('click', () => { Sound.click(); const j = S.lg.jo; if (j.st === 'run') return; S.lg.jo = { n: 0, st: 'idle', q: 0, ph: 'fall', t: 0, dur: 1.5, fast: false, e: 0, wind: 0 }; updateCtl(); });
  /* ③ */
  /* ④ */
  $$('#arSeg button').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); parts.clear(); S.ar.sel = b.dataset.s;
    const inp = S.ar.inp[S.ar.sel]; $('#eaInput').value = inp.a != null ? inp.a : ''; $('#ebInput').value = inp.b != null ? inp.b : ''; $('#ecInput').value = inp.c != null ? inp.c : ''; updateCtl();
  }));
  const arIn = (id, key) => $(id).addEventListener('input', () => { const v = num($(id).value); S.ar.inp[S.ar.sel][key] = isFinite(v) ? v : null; S.ar.ok = {}; $(id).classList.remove('bad'); });
  arIn('#eaInput', 'a'); arIn('#ebInput', 'b'); arIn('#ecInput', 'c');
  $('#bArRun').addEventListener('click', () => { const a = S.ar; if (a.st[a.sel] === 'done') { a.st[a.sel] = 'ready'; a.t[a.sel] = 0; parts.clear(); updateCtl(); } else arGo(); });

  /* ---------- 판독값 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'stop') {
      const p = S.sp, sc = SCN[p.scene], tt = p.st === 'ready' ? 0 : Math.min(p.t, sc.T), e = stopEval(p.scene, tt);
      L1 = '속력'; a = f2(e.v) + ' m/s'; L2 = '생긴 열 Q'; b = eJ(e.Q) + ' J'; L3 = '온도 상승 ΔT'; c = tC(e.Q / sc.C) + ' °C';
    } else if (S.mode === 'ledger') {
      const l = S.lg;
      if (l.sub === 'slope') { const o = l.sl, e = slopeEval(o.st === 'ready' ? 0 : o.t); L1 = '처음 에너지'; a = eJ(SLOPE.E0) + ' J'; L2 = '지금 E_k + E_p'; b = eJ(e.Ek + e.Ep) + ' J'; L3 = '장부의 열 Q'; c = l.led.slope.q == null ? '—' : eJ(l.led.slope.q) + ' J'; }
      else if (l.sub === 'crash') { const o = l.cr, e = crashEval(o.st === 'ready' ? 0 : o.t), ek = 0.5 * CRASH.mA * e.vA * e.vA + 0.5 * CRASH.mB * e.vB * e.vB; L1 = '처음 에너지'; a = eJ(CRASH.E0) + ' J'; L2 = '지금 운동 에너지'; b = eJ(ek) + ' J'; L3 = '장부의 열 Q'; c = l.led.crash.q == null ? '—' : eJ(l.led.crash.q) + ' J'; }
      else { const j = l.jo; L1 = '추 낙하 횟수'; a = j.n + '번'; L2 = '물이 얻은 열 Q'; b = eJ(j.e) + ' J'; L3 = '물의 온도 상승'; c = t3(j.e / (JOULE.c * JOULE.mw)) + ' °C'; }
    } else if (S.mode === 'phenom') {
      const p = S.ph, n = Object.keys(p.ans).filter((k) => p.ans[k]).length, ok = Object.keys(p.ok).filter((k) => p.ok[k] === true).length;
      L1 = '고른 카드'; a = n + ' / ' + CARDS.length; L2 = '맞은 카드'; b = ok + ' / ' + CARDS.length; L3 = '지금 보는 카드'; c = (p.sel + 1) + '번';
    } else {
      const a0 = S.ar, k = a0.sel, A = ARG[k], st = a0.st[k], e = arEval(k, st === 'ready' ? 0 : a0.t[k]);
      L1 = '처음 역학적 E'; a = eJ(A.E0 / A.k) + ' ' + A.unit; L2 = '지금 역학적 E'; b = eJ((st === 'ready' ? A.E0 : e.Em) / A.k) + ' ' + A.unit; L3 = '내가 쓴 열 Q'; c = a0.inp[k].c != null ? eJ(a0.inp[k].c) + ' ' + A.unit : '—';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const spDone = (k) => S.sp.rows.some((r) => r.scene === k);
  const jouleAns = JOULE.E1 * 20 / (JOULE.c * JOULE.mw);   // 20번 낙하 후 온도 상승 (약 0.95 °C)
  const levels = [
    {
      title: '멈추는 이유: 에너지는 사라진 걸까?', short: '멈추는 이유', icon: '🧱', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 굴러가던 공이 멈추면 공의 에너지는 사라진 걸까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 에너지가 전환될 때 일부가 열로 흩어진다고 배웠고, 앞 차시에서는 마찰이 없을 때 역학적 에너지가 보존된다는 것을 확인했어요. 이번에는 <b>마찰이 있을 때</b> 역학적 에너지가 어디로 가는지 찾아봐요.</div>' +
        '<p><b>미끄러지는 상자</b>, <b>손바닥 비비기</b>, <b>못 두드리기</b>를 실행하고, <b>열화상 카메라</b>로 온도가 올라가는 곳을 찾아보세요. 속력 그래프는 줄고 온도 그래프는 늘어나요.</p>',
      features: ['stop'],
      setup() { resetStop('box'); S.sp.rows = []; setScene('stop'); },
      recap: '마찰이 있으면 물체는 멈추고, 마찰이 생긴 곳의 온도가 올라가요. 줄어든 역학적 에너지는 열로 바뀌어요.',
      summary: '<ul><li>마찰이 있으면 움직이던 물체의 <b>속력이 줄어 멈추고</b>, 마찰이 생긴 곳의 <b>온도는 올라가요</b>.</li><li>열의 양은 Q = cmΔT, 즉 <b>ΔT = Q ÷ (열용량 cm)</b>로 계산해요.</li><li>예) ' + BOXS.m + ' kg 상자(' + BOXS.v0 + ' m/s)가 멈추면 ' + eJ(BOXS.Q) + ' J의 운동 에너지가 마찰열이 돼요. 열용량 ' + BOXS.C + ' J/°C인 접촉면은 ' + tC(BOXS.Q / BOXS.C) + ' °C 올라가요.</li><li>손바닥을 비빌 때와 못을 두드릴 때도 마찰·충돌로 역학적 에너지가 열로 바뀌어 온도가 올라가요.</li></ul>',
      missions: [
        {
          title: '세 가지 마찰 장면의 온도 측정',
          goal: '<b>상자 · 손바닥 · 못</b> 세 장면을 각각 실행해 온도가 얼마나 올라가는지 측정하세요. 열화상 카메라도 켜 보세요.',
          hint: '장면 버튼을 고르고 시작 버튼을 눌러요. 끝나면 오른쪽 표에 온도 상승이 기록돼요. 🌡️ 열화상을 누르면 뜨거운 곳이 색으로 보여요.',
          setup() { setScene('stop'); },
          check: () => spDone('box') && spDone('hands') && spDone('nail'),
          hold: 0.6,
          status: () => mark(spDone('box')) + ' 상자 &nbsp; ' + mark(spDone('hands')) + ' 손바닥 &nbsp; ' + mark(spDone('nail')) + ' 못',
          explain: '세 경우 모두 움직임(속력)이 줄거나 힘이 마찰로 쓰이면서 <b>온도가 올라갔어요</b>. 상자는 ' + eJ(BOXS.Q) + ' J → ' + tC(BOXS.Q / BOXS.C) + ' °C, 손바닥은 ' + eJ(HANDS.Q) + ' J → ' + tC(HANDS.Q / HANDS.C) + ' °C, 못은 ' + eJ(NAIL.Q) + ' J → ' + tC(NAIL.Q / NAIL.C) + ' °C 올라가요. ΔT = Q ÷ (열용량)으로 계산한 값이에요.',
        },
        {
          type: 'quiz', title: '역학적 에너지가 줄면 늘어나는 것',
          goal: '미끄러지던 상자가 멈추면서 <b>역학적 에너지가 줄어들었어요</b>. 그 대신 늘어난 것은?',
          setup() { setScene('stop'); },
          choices: ['아무것도 늘지 않아요. 에너지가 사라졌어요.', '마찰이 생긴 곳의 열(온도가 올라간 만큼의 에너지)', '상자의 질량', '상자의 위치 에너지'],
          answer: 1,
          feedback: ['에너지는 사라지지 않아요. 열화상 화면에서 마찰면의 온도가 올라간 것을 떠올려 보세요.', '', '질량은 속력이 변해도 달라지지 않아요.', '수평 바닥에서는 높이가 변하지 않으므로 위치 에너지는 그대로예요.'],
          explain: '상자의 운동 에너지가 줄어든 만큼 <b>마찰면과 주변의 열</b>이 늘어났어요. 그래서 마찰면의 온도가 올라간 거예요. 에너지가 사라진 것이 아니라 열로 바뀐 거예요.',
        },
      ],
    },
    {
      title: '에너지 장부: 줄어든 만큼 열이 늘어요', short: '에너지 장부', icon: '📒', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 마찰이 있으면 역학적 에너지가 줄고 온도가 올라가는 것을 확인했어요. 이제 <b>에너지 장부</b>를 써서 줄어든 만큼이 정확히 열이 되는지 따져 봐요.</div>' +
        '<p><b>마찰 비탈</b>, <b>비탄성 충돌</b>, <b>줄의 실험</b>의 에너지를 막대로 비교해요. 사라진 에너지를 <b>열 Q</b>로 장부에 적고 <b>합이 처음과 같은지</b> 확인해요.</p>',
      features: ['ledger'],
      setup() { S.showT = false; resetLedger(false); setScene('ledger'); },
      recap: '마찰이나 충돌로 줄어든 역학적 에너지만큼 열이 생겨서, 역학적 에너지와 열을 더한 총량은 처음과 같아요.',
      summary: '<ul><li><b>에너지 장부</b>: (처음 에너지) = (나중 역학적 에너지) + (생긴 열 Q)</li><li>마찰 비탈: ' + SLOPE.m + ' kg 상자가 ' + SLOPE.h + ' m 높이에서 내려오면 처음 E_p = ' + SLOPE.E0 + ' J. 바닥에서 E_k = ' + eJ(SLOPE.Ek) + ' J이므로 열 Q = ' + eJ(SLOPE.Q) + ' J (마찰력 ' + SLOPE.f + ' N × ' + SLOPE.L + ' m)</li><li>비탄성 충돌: ' + eJ(CRASH.E0) + ' J → ' + eJ(CRASH.Ek) + ' J, 줄어든 ' + eJ(CRASH.Q) + ' J은 소리·변형·열이 돼요.</li><li>줄의 실험: ' + JOULE.M + ' kg 추가 ' + f1(JOULE.h) + ' m 내려갈 때마다 ' + JOULE.E1 + ' J이 물의 열이 돼요. 물 ' + f1(JOULE.mw) + ' kg(c = ' + JOULE.c + ' J/kg·°C)의 온도는 한 번에 ' + t3(JOULE.dT1) + ' °C, 20번이면 약 ' + tC(jouleAns) + ' °C 올라요.</li></ul>',
      missions: [
        {
          title: '마찰 비탈의 열량 구하기', manual: true,
          goal: '<b>마찰 비탈</b>에서 상자를 내려 보내고, 바닥에서 읽은 에너지로 <b>열 Q(J)</b>를 구해 장부에 적으세요. 합이 처음 에너지와 같아져야 해요.',
          hint: '처음 E_p = ' + SLOPE.E0 + ' J이고 바닥에서 E_k = ½ × ' + f1(SLOPE.m) + ' × v² (v는 속력 표시를 읽어요). 줄어든 양이 열 Q예요. 🖊️ 장부에 적기를 눌러 확인해요.',
          setup() { S.lg.sub = 'slope'; S.showT = false; updateCtl(); setScene('ledger'); },
          check() {
            const l = S.lg, q = l.led.slope.q;
            if (!l.led.slope.ran) return '먼저 ▶ 내려 보내기로 상자를 끝까지 내려 보내세요.';
            if (q == null) return '열 Q를 입력하고 🖊️ 장부에 적기를 눌러요.';
            if (Math.abs(q - SLOPE.Q) > 0.5) return '합이 ' + SLOPE.E0 + ' J이 아니에요. 처음 에너지 ' + SLOPE.E0 + ' J에서 나중 운동 에너지 ' + eJ(SLOPE.Ek) + ' J을 뺀 값이 열이에요.';
            return true;
          },
          status: () => mark(S.lg.led.slope.ran) + ' 비탈 실행 &nbsp; 장부의 열 Q: ' + (S.lg.led.slope.q == null ? '—' : eJ(S.lg.led.slope.q) + ' J'),
          explain: '처음 E_p = ' + f1(SLOPE.m) + ' × ' + G + ' × ' + SLOPE.h + ' = <b>' + SLOPE.E0 + ' J</b>, 바닥에서 E_k = ½ × ' + f1(SLOPE.m) + ' × ' + f1(SLOPE.v) + '² = <b>' + eJ(SLOPE.Ek) + ' J</b>이에요. 줄어든 ' + eJ(SLOPE.Q) + ' J이 마찰열 Q예요(마찰력 ' + SLOPE.f + ' N × ' + SLOPE.L + ' m = ' + eJ(SLOPE.Q) + ' J). ' + eJ(SLOPE.Ek) + ' + ' + eJ(SLOPE.Q) + ' = ' + SLOPE.E0 + ' J로 총량이 보존돼요.',
        },
        {
          title: '줄의 실험: 20번 낙하 후 온도', manual: true,
          goal: '<b>추를 20번</b> 떨어뜨려 물을 휘저은 뒤, 물의 <b>온도 상승(°C)</b>을 계산해서 입력하세요. (소수 둘째 자리까지)',
          hint: '추 1번의 열 Q = mgh = ' + JOULE.M + ' × ' + G + ' × ' + f1(JOULE.h) + ' = ' + JOULE.E1 + ' J이에요. 20번이면 Q는 몇 J일까요? ΔT = Q ÷ (c m) = Q ÷ (' + JOULE.c + ' × ' + f1(JOULE.mw) + ')로 구해요.',
          setup() { S.lg.sub = 'joule'; S.showT = true; $('#tInput').value = ''; $('#tInput').classList.remove('bad'); S.lastT = null; updateCtl(); setScene('ledger'); },
          check() {
            const j = S.lg.jo; if (j.n < 20) return '먼저 ⏩ 20번 빠르게 또는 ⬇️ 1번으로 추를 20번 이상 떨어뜨려요. (지금 ' + j.n + '번)';
            const v = num($('#tInput').value);
            if (!isFinite(v)) return '물의 온도 상승을 숫자(°C)로 입력해요.';
            const want = JOULE.E1 * j.n / (JOULE.c * JOULE.mw);
            if (Math.abs(v - want) > 0.02) {
              if (S.lastT !== v) { S.lastT = v; $('#tInput').classList.remove('bad'); void $('#tInput').offsetWidth; $('#tInput').classList.add('bad'); }
              if (Math.abs(v - JOULE.E1 * j.n) < 1) return '그 값은 열량 Q(J)예요. 온도로 바꾸려면 c × m = ' + (JOULE.c * JOULE.mw) + ' J/°C로 나눠요.';
              return '다시 계산해 보세요. ' + j.n + '번이면 Q = ' + JOULE.E1 * j.n + ' J이고, ΔT = Q ÷ ' + (JOULE.c * JOULE.mw) + '이에요.';
            }
            $('#tInput').classList.remove('bad'); return true;
          },
          status: () => '지금 추 ' + S.lg.jo.n + '번 낙하 → 물 ' + t3(S.lg.jo.e / (JOULE.c * JOULE.mw)) + ' °C 상승',
          explain: '20번 낙하하면 Q = 20 × ' + JOULE.E1 + ' = <b>' + (20 * JOULE.E1) + ' J</b>이고, ΔT = Q ÷ (c m) = ' + (20 * JOULE.E1) + ' ÷ (' + JOULE.c + ' × ' + f1(JOULE.mw) + ') = <b>약 ' + tC(jouleAns) + ' °C</b>예요. 한 번에는 ' + t3(JOULE.dT1) + ' °C로 매우 작지만, 쌓이면 측정할 수 있어요.',
        },
        {
          type: 'quiz', title: '마찰이 있으면 에너지 보존이 깨질까?',
          goal: '마찰 비탈에서 역학적 에너지(E_k + E_p)는 ' + SLOPE.E0 + ' J에서 ' + eJ(SLOPE.Ek) + ' J로 줄었어요. 에너지 보존 법칙은 어떻게 되었을까요?',
          setup() { S.showT = false; S.lg.sub = 'slope'; updateCtl(); setScene('ledger'); },
          choices: ['에너지 총량이 줄었으므로 보존 법칙이 깨졌다', '역학적 에너지는 줄었지만, 열을 더한 에너지 총량은 보존된다', '역학적 에너지는 그대로이고 열만 새로 생겼다', '마찰은 에너지와 관계가 없다'],
          answer: 1,
          feedback: ['줄어든 것은 역학적 에너지뿐이에요. 열까지 더하면 처음과 같아요.', '', '역학적 에너지는 ' + SLOPE.E0 + ' J에서 ' + eJ(SLOPE.Ek) + ' J로 줄었어요.', '마찰은 역학적 에너지를 열로 바꾸는 중요한 과정이에요.'],
          explain: '마찰이 있을 때 <b>역학적 에너지 보존은 성립하지 않지만</b>, 열까지 포함한 <b>에너지의 총량은 보존돼요</b>. ' + eJ(SLOPE.Ek) + ' J + ' + eJ(SLOPE.Q) + ' J = ' + SLOPE.E0 + ' J이에요.',
        },
      ],
    },
    {
      title: '열이 나타나는 현상: 중학교 개념과 연결', short: '열 현상', icon: '🌡️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 줄어든 역학적 에너지가 열이 되는 것을 장부로 확인했어요. 중학교에서 배운 <b>열의 이동, 비열, 상태 변화, 기상 현상</b>은 모두 이 열이 일으키는 현상이에요. 열이 된 에너지가 어떤 현상으로 나타나는지 연결해 봐요.</div>' +
        '<p>카드 6장을 보고 각각 어떤 개념과 연결되는지 골라요. 이 단원에서는 열역학 법칙이나 식을 따지지 않고 <b>현상을 정성적으로</b> 설명해요.</p>',
      features: ['phenom'],
      setup() { resetPh(); resetPhUI(); setScene('phenom'); },
      recap: '역학적 에너지가 열이 되면 열의 이동, 온도 상승(비열), 상태 변화, 기상 현상 같은 다양한 현상으로 나타나요. 열은 사라지지 않고 주변으로 퍼져요.',
      summary: '<ul><li><b>열의 이동</b>: 마찰열은 전도·대류·복사로 주변에 퍼져요. (손바닥의 열, 유성의 빛과 열)</li><li><b>비열과 온도 변화</b> Q = cmΔT: 브레이크 디스크 ' + eJ(CAR.E0 / 1000) + ' kJ → 철 ' + CAR.mdisc + ' kg이 약 ' + eJ(CAR.dT) + ' °C 상승, 폭포(낙차 ' + FALLS.h + ' m)는 물이 약 ' + tC(FALLS.dT) + ' °C 상승</li><li><b>상태 변화</b>: 마찰열로 얼음이 녹는 동안에는 온도가 일정해요.</li><li><b>기상 현상</b>: 태풍은 바다의 열(수증기의 응결열)이 바람의 에너지가 돼요.</li><li>열은 사라지지 않지만 주변으로 흩어져서 <b>다시 쓰기 어려워요</b>.</li></ul>',
      missions: [
        {
          title: '열이 된 에너지와 현상 연결하기', manual: true,
          goal: '카드 6장이 <b>A~D 중 어떤 개념</b>과 연결되는지 오른쪽에서 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '같은 개념을 여러 번 골라도 돼요. 온도가 올라가는 양은 B, 온도가 일정한 구간은 C, 열이 퍼지거나 빛으로 나가면 A, 바람이 만들어지면 D예요.',
          setup() { setScene('phenom'); updateCtl(); },
          check() {
            const miss = CARDS.filter((c, i) => !S.ph.ans[i]);
            if (miss.length) return '아직 고르지 않은 카드가 ' + miss.length + '장 있어요.';
            let bad = 0;
            CARDS.forEach((c, i) => { const ok = S.ph.ans[i] === c.ans; if (!ok) bad++; if (!ok && S.ph.ok[i] !== false) { phSel[i].classList.remove('ok', 'bad'); void phSel[i].offsetWidth; phSel[i].classList.add('bad'); } if (ok) { phSel[i].classList.remove('bad'); phSel[i].classList.add('ok'); } S.ph.ok[i] = ok; });
            if (bad) return '빨간 칸을 다시 생각해 보세요. 카드 아래의 설명(온도 변화, 일정한 온도, 퍼지는 열 등)에서 단서를 찾아요.';
            return true;
          },
          status: () => '고른 카드 ' + CARDS.filter((c, i) => S.ph.ans[i]).length + ' / ' + CARDS.length,
          explain: '<b>열이 주변으로 퍼지거나 빛으로 방출</b>되는 것은 열의 이동(A), <b>온도가 올라가는 양</b>은 비열(B), 얼음이 녹는 동안 <b>온도가 일정</b>한 것은 상태 변화(C), 바다의 열이 <b>바람</b>이 되는 것은 기상 현상(D)이에요. 브레이크 디스크 약 ' + eJ(CAR.dT) + ' °C, 폭포 약 ' + tC(FALLS.dT) + ' °C는 Q = cmΔT로 구한 값이에요.',
        },
        {
          type: 'quiz', title: '식은 열을 다시 쓸 수 있을까?',
          goal: '급제동한 자동차의 브레이크 디스크가 뜨거워졌다가 식었어요. 그 열을 모아 <b>자동차를 다시 달리게</b> 할 수 있을까요?',
          setup() { setScene('phenom'); },
          choices: ['열은 식으면 사라지므로 불가능하다', '열은 주변으로 퍼져서 모으기 어렵고, 다시 운동 에너지로 바꾸려면 열기관 같은 장치가 필요하다', '열은 저절로 운동 에너지로 돌아와서 자동차가 다시 달린다', '디스크의 열은 에너지가 아니라서 쓸 수 없다'],
          answer: 1,
          feedback: ['열은 사라지지 않아요. 주변 공기·땅으로 퍼져 나갈 뿐이에요.', '', '열이 저절로 운동 에너지로 돌아오는 일은 없어요.', '열도 에너지의 한 형태예요.'],
          explain: '열은 사라지지 않고 <b>주변으로 퍼져서</b> 다시 모아 쓰기가 어려워요. 열을 다시 역학적 에너지로 바꾸려면 <b>열기관</b> 같은 장치가 필요한데, 그것은 다음 차시에서 알아봐요.',
        },
      ],
    },
    {
      title: '총량 논증: 사라진 에너지 찾기', short: '총량 논증', icon: '⚖️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 열이 된 에너지가 여러 현상으로 나타나는 것을 보았어요. 이제 <b>사라진 에너지 찾기 퀴즈</b>로 에너지 총량이 보존된다는 것을 직접 논증해 봐요.</div>' +
        '<p>세 시나리오(<b>굴러가다 멈춘 공 · 떨어져 부딪힌 점토 · 급제동하는 자동차</b>)에서 <b>처음 역학적 에너지, 나중 역학적 에너지, 발생한 열</b>을 구해 입력해요. 실행해서 값을 확인할 수 있어요.</p>',
      features: ['argue'],
      setup() { resetAr(); S.ar.inp = { ball: {}, clay: {}, car: {} }; S.ar.ran = {}; $('#eaInput').value = ''; $('#ebInput').value = ''; $('#ecInput').value = ''; setScene('argue'); },
      recap: '역학적 에너지가 줄어도 줄어든 만큼이 열로 바뀌어서 에너지의 총량은 일정해요. 에너지는 소모되는 것이 아니라 다른 형태로 전환돼요.',
      summary: '<ul><li><b>에너지 총량 논증</b>: 처음 역학적 에너지 = 나중 역학적 에너지 + 발생한 열</li><li>굴러가던 공(' + BALLS.m + ' kg, ' + BALLS.v + ' m/s): E_k = ' + eJ(BALLS.E0) + ' J → 0, 열 ' + eJ(BALLS.E0) + ' J</li><li>떨어진 점토(' + CLAY.m + ' kg, ' + f1(CLAY.h) + ' m): E_p = ' + eJ(CLAY.E0) + ' J → 0, 소리·변형·열 ' + eJ(CLAY.E0) + ' J</li><li>급제동 자동차(' + CAR.m + ' kg, ' + CAR.v + ' m/s): E_k = ' + eJ(CAR.E0 / 1000) + ' kJ → 0, 브레이크의 열 ' + eJ(CAR.E0 / 1000) + ' kJ (제동 거리 ' + CAR.d + ' m)</li><li>에너지는 <b>소모되는 것이 아니라 전환</b>돼요. 다만 열은 퍼져서 다시 쓰기 어려워요.</li></ul>',
      missions: [
        {
          title: '세 시나리오의 에너지 장부 맞추기', manual: true,
          goal: '<b>세 시나리오</b>를 각각 실행하고, <b>처음 역학적 에너지 · 나중 역학적 에너지 · 발생한 열</b>을 입력해 장부를 맞추세요.',
          hint: '공은 E_k = ½mv², 점토는 E_p = mgh, 자동차는 E_k = ½mv²(단위는 kJ)로 처음 에너지를 구해요. 멈춘 뒤 역학적 에너지는 0이고, 줄어든 만큼이 열 Q예요.',
          setup() { setScene('argue'); updateCtl(); },
          check() {
            const miss = ARK.filter((k) => !S.ar.ran[k]);
            if (miss.length) return '아직 실행하지 않은 시나리오가 있어요: ' + miss.map((k) => ARG[k].name.replace(/^[^ ]+ /, '')).join(', ');
            const nf = ARK.filter((k) => arCheckOne(k) === null);
            if (nf.length) return '세 칸(처음·나중·열)을 모두 채우지 않은 시나리오가 있어요: ' + nf.map((k) => ARG[k].name.replace(/^[^ ]+ /, '')).join(', ');
            const bad = ARK.filter((k) => arCheckOne(k) !== true);
            if (bad.length) return '값을 다시 확인해요: ' + bad.map((k) => ARG[k].name.replace(/^[^ ]+ /, '')).join(', ') + '. 처음 역학적 에너지는 얼마이고, 멈춘 뒤에는 얼마일까요?';
            return true;
          },
          status: () => ARK.map((k) => mark(!!S.ar.ran[k]) + ARG[k].name.replace(/^[^ ]+ /, '') + (arCheckOne(k) === true ? ' ✔' : '')).join(' &nbsp; '),
          explain: '<b>공</b>: E_k = ½ × ' + BALLS.m + ' × ' + BALLS.v + '² = ' + eJ(BALLS.E0) + ' J → 멈추면 0, 열 ' + eJ(BALLS.E0) + ' J. <b>점토</b>: E_p = ' + CLAY.m + ' × ' + G + ' × ' + f1(CLAY.h) + ' = ' + eJ(CLAY.E0) + ' J → 부딪혀 멈추면 0, 소리·변형·열 ' + eJ(CLAY.E0) + ' J. <b>자동차</b>: E_k = ½ × ' + CAR.m + ' × ' + CAR.v + '² = ' + eJ(CAR.E0 / 1000) + ' kJ → 0, 브레이크에서 열 ' + eJ(CAR.E0 / 1000) + ' kJ. 세 경우 모두 (나중 역학적 에너지) + (열) = (처음 에너지)예요.',
        },
        {
          type: 'quiz', title: '예상과 측정이 다른 까닭',
          goal: '줄의 실험에서 추를 20번 떨어뜨린 뒤 물의 온도 상승을 <b>측정</b>했더니 계산값 ' + tC(jouleAns) + ' °C보다 <b>조금 작게</b> 나왔어요. 가장 알맞은 설명은?',
          setup() { setScene('argue'); },
          choices: ['에너지가 실제로 사라졌기 때문에', '열의 일부가 용기와 주변 공기로 퍼져 나가고, 날개와 줄의 마찰·온도계 오차도 있기 때문에', '물의 비열이 갑자기 작아졌기 때문에', '추의 질량이 줄어들었기 때문에'],
          answer: 1,
          feedback: ['에너지는 사라지지 않아요. 물 밖으로 퍼진 열이 있을 뿐이에요.', '', '비열은 물질의 성질이라 갑자기 변하지 않아요.', '추의 질량은 변하지 않아요.'],
          explain: '실제 실험에서는 열의 일부가 <b>용기·공기로 이동</b>하고, 장치의 마찰과 온도계의 오차도 있어서 측정값이 계산값보다 조금 작게 나와요. 그래도 퍼진 열까지 모두 더하면 에너지 총량은 보존돼요.',
        },
        {
          type: 'quiz', title: '에너지는 소모될까, 전환될까?',
          goal: '“공이 멈추면서 에너지가 <b>소모</b>됐다”는 말을 과학적으로 가장 알맞게 고치면?',
          setup() { setScene('argue'); },
          choices: ['에너지가 없어지는 것은 맞고, 소모된 에너지는 다시 생기지 않는다', '운동 에너지가 열로 전환되어 쓸모 있는 역학적 에너지는 줄었지만 에너지 총량은 그대로이다', '마찰이 없으면 에너지가 늘어난다', '열은 에너지가 아니라서 총량에 넣지 않는다'],
          answer: 1,
          feedback: ['에너지는 없어지지 않아요. 열의 형태로 바뀔 뿐이에요.', '', '마찰이 없다고 에너지가 늘지는 않아요. 마찰이 없으면 역학적 에너지가 그대로 유지돼요.', '열도 에너지예요. 열을 포함해야 총량이 같아져요.'],
          explain: '에너지는 <b>소모되는 것이 아니라 다른 형태로 전환</b>돼요. 마찰이 없는 이상적인 경우에는 역학적 에너지가 그대로 유지되지만, 현실에서는 일부가 열로 흩어져서 다시 쓰기 어려워져요. 열을 다시 역학적 에너지로 바꾸는 장치는 다음 차시(열기관)에서 만나요.',
        },
      ],
    },
  ];

  /* 이어 하기(새로고침)로 중간 미션에서 열려도 미션 setup()이 만든 장면을 덮어쓰지 않도록, 장면 상태를 게임보다 먼저 만들어요 */
  resetStop('box'); resetLedger(false); resetPh(); resetAr();
  setScene('stop');
  game = SciSim.game({
    simId: 'hp-energy-heat', mount: '#game', badge: '에너지 탐정', homeHref: '../../index.html#hp',
    featureLabels: { stop: '🧱 마찰 장면 3가지 · 열화상 카메라', ledger: '📒 에너지 장부 · 줄의 실험', phenom: '🌡️ 열 현상 카드 6장', argue: '⚖️ 사라진 에너지 찾기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  view.canvas.addEventListener('click', (ev) => {
    if (S.mode === 'stop') { if (S.sp.st === 'ready') stopGo(); }
    else if (S.mode === 'ledger') { if (S.lg.sub !== 'joule') { const o = S.lg.sub === 'slope' ? S.lg.sl : S.lg.cr; if (o.st === 'ready') lgRun(); } else jouleDrop(1); }
    else if (S.mode === 'phenom') { const p = view.toLocal(ev); for (let i = 0; i < CARDS.length; i++) { const r = cardRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { S.ph.sel = i; phSel[i].focus({ preventScroll: true }); Sound.click(); } } }
    else if (S.mode === 'argue') { if (S.ar.st[S.ar.sel] === 'ready') arGo(); }
  });

  /* ---------- 시작 ---------- */
  let lastFree = false, lastMode = '', lastKey = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    const key = [S.mode, S.sp.st, S.lg.sl.st, S.lg.cr.st, S.lg.jo.st, S.lg.jo.n, S.ar.st[S.ar.sel]].join('|');
    if (key !== lastKey) { lastKey = key; updateCtl(); }
    view.apply();
    if (S.mode === 'stop') { stepStop(dt); drawStop(dt); }
    else if (S.mode === 'ledger') { stepLedger(dt); drawLedger(dt); }
    else if (S.mode === 'phenom') { drawPh(dt); }
    else { stepAr(dt); drawArgue(dt); }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, resetStop, stopGo, resetLedger, lgRun, jouleDrop, resetPh, resetAr, arGo, updateCtl, ARG, CARDS, SLOPE, JOULE, jouleAns,
    stepAll(sec) {
      const n = Math.ceil(sec / 0.02);
      for (let i = 0; i < n; i++) {
        if (S.mode === 'stop') stepStop(0.02); else if (S.mode === 'ledger') stepLedger(0.02); else if (S.mode === 'argue') stepAr(0.02);
      }
      updateCtl();
    },
  };
})();
