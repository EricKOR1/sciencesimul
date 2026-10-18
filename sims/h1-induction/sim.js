/* =========================================================
   통합과학2 Ⅱ. 환경과 에너지 - 전자기 유도와 발전기 (단원 7차시)
   성취기준 [10통과2-02-05] 발전기에서 운동 에너지가 전기 에너지로 전환되는 과정을 이해하고, … (발전기의 원리 부분)
   ① 관찰: 전자기 유도 (코일 · 막대자석 · 검류계)
   ② 실험: 세기 요인 (속도 · 자석 수 · 코일 감은 수, 변인 통제)
   ③ 탐구: 간이 발전기 (자석을 돌려 LED 두 개를 번갈아 켜기)
   ④ 설명: 에너지 전환 (수력 · 풍력 · 증기 터빈 → 발전기)
   렌츠 법칙 · 패러데이 법칙 식 · 유도 기전력 계산은 다루지 않아요 (관찰 사실로만).
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 620 : 560;
  const K = PHONE ? 0.6 : 1.25;                 // 물체 크기 배율
  const SH = PHONE ? 330 : 310;              // 위쪽 장면 높이 (아래는 자료 영역)
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);

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
  const fmtR = (r) => (r >= 0 ? '+' : '−') + Math.abs(r).toFixed(1);

  /* ---------- 물리 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const REF = 5;                       // 기본 조건(자석 1개 · 100회 · 보통 속도)에서 검류계 최대 눈금 (칸)
  const GALV_MAX = 10;                 // 검류계 눈금 한계 (칸)
  const V0 = 180 * K;                  // 보통 속도 (화면 px/s)
  const WS = 26 * K;                   // 코일 입구에서 자기장이 변하는 폭 (px)
  const LC = 110 * K, LM = 130 * K, CH = 40 * K, MT = PHONE ? 16 : 25;   // 코일 길이, 자석 길이, 코일 반지름, 자석 두께
  const S_FAR = 150 * K;               // 자석 끝이 코일 입구에서 떨어진 처음 거리
  const TY = SH - 38;                  // 실험대 윗면
  const XC = PHONE ? 262 : 470;        // 코일 중심 x
  const YC = TY - 14 - CH;             // 코일 중심 y
  const XMIN = XC - LC / 2 - S_FAR - LM / 2, XMAX = XC;         // 자석 중심이 움직이는 범위
  const GX = VW - (PHONE ? 70 : 108), GR = PHONE ? 56 : 84, GY = TY - 44;   // 검류계
  const tipS = (xm) => xm + LM / 2 - (XC - LC / 2);              // 자석 앞끝이 코일 입구를 지난 거리
  const shapeF = (s) => { const c = Math.cosh(s / WS / 2); return 1 / (c * c); };       // 코일 입구(s=0)에서 1
  const fluxF = (s) => 1 / (1 + Math.exp(-s / WS));                                     // 코일을 지나는 자기장(자석 1개 = 1)
  function readingOf(cfg, pol, v, s) { return REF * (cfg.tn / 100) * cfg.mg * pol * (v / V0) * shapeF(s); }

  // 간이 발전기
  const KE = 0.8, VTH = 1.0, VREF = 6.4, FMAX = 4;       // 유도 전압 = 0.8 × 회전수 × (감은 수/100) × 자석 수, LED 켜지는 전압 1.0, 최대 밝기 기준 6.4
  // 에너지 전환
  const WMAX = 3.0;                                      // 공급량 100 %일 때 발전기 회전 (회/초)

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'obs', fade: 0, t: 0,
    xm: XMIN, pol: 1, v: 0, vS: 0, prevX: XMIN, drag: null, auto: null, run: null,
    cfg: { sp: 1, mg: 1, tn: 100 },
    reading: 0, needle: new SciSim.Spring(0, { stiffness: 260, damping: 22 }), hist: [], histAcc: 0, dotPh: 0,
    seen: {}, stillT: 0, rows: [], rule: {}, ruleOK: {}, showRule: false,
    gen: { f: 2, ft: 2, tn: 100, mg: 1, phi: 0, e: 0, ph: 0, hist: [], hAcc: 0, dotP: 0, ledA: 0, ledB: 0, amp: 0 },
    cv: { kind: 'water', sup: 0.5, w: 0, ang: 0, b: 0, done: {}, ph: 0, parts: [], acc: 0, wsh: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { obs: '🧲 전자기 유도', lab: '📊 세기 요인', gen: '⚙️ 간이 발전기', conv: '🔋 에너지 전환' };
  const curCfg = () => (S.mode === 'lab' ? { mg: S.cfg.mg, tn: S.cfg.tn } : { mg: 1, tn: 100 });
  const baseKey = '1|1|100';
  const keyOf = (c) => c.sp + '|' + c.mg + '|' + c.tn;
  const nChanged = (c) => (c.sp !== 1 ? 1 : 0) + (c.mg !== 1 ? 1 : 0) + (c.tn !== 100 ? 1 : 0);

  function cancelMotion() { S.auto = null; S.run = null; S.drag = null; S.v = 0; S.vS = 0; }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); cancelMotion(); S.cv.parts.length = 0; }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-match')) on = S.showRule;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const busy = !!S.run;
    $$('#spSeg button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.cfg.sp); b.disabled = busy; });
    $$('#mgSeg button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.cfg.mg); b.disabled = busy; });
    $$('#tnSeg button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === S.cfg.tn); b.disabled = busy; });
    $$('#gnSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.gen.tn));
    $$('#gmSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.gen.mg));
    $$('#cvSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.cv.kind));
    $('#bMeasure').disabled = busy;
    $('#bFlip').disabled = false;
    const sg = $('#sRev'); if (+sg.value !== S.gen.ft) sg.value = S.gen.ft;
    sg.style.setProperty('--pct', (S.gen.ft / FMAX * 100) + '%'); $('#oRev').textContent = S.gen.ft.toFixed(1) + ' 회/초';
    const sc = $('#sSup'); if (+sc.value !== Math.round(S.cv.sup * 100)) sc.value = Math.round(S.cv.sup * 100);
    sc.style.setProperty('--pct', (S.cv.sup * 100) + '%'); $('#oSup').textContent = Math.round(S.cv.sup * 100) + ' %';
    $('#lSup').textContent = { water: '💧 물의 양', wind: '🌬️ 바람의 세기', steam: '♨️ 수증기의 양' }[S.cv.kind];
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ================= ① ② 코일 · 자석 · 검류계 ================= */
  function startAuto(dir, mult) {
    if (S.run) return;
    S.drag = null; S.auto = { dir, mult: mult || 1 }; Sound.click();
  }
  function flipPole() {
    if (S.run) return;
    if (tipS(S.xm) > -30 * K) { showHint('자석을 코일 밖으로 빼낸 뒤에 극을 바꿔요.', 3200); Sound.fail(); return; }
    S.pol = -S.pol; S.flipAnim = 1; Sound.click(); S.vS = 0;
  }
  function measure() {
    if (S.run || S.mode !== 'lab') return;
    const c = S.cfg;
    if (nChanged(c) > 1 && !(game && game.free)) {
      SciSim.toast('한 번에 하나만 바꿔요. 두 가지 이상 바꾸면 어떤 요인 때문인지 알 수 없어요.', 'bad'); Sound.fail(); return;
    }
    S.auto = null; S.pol = 1;
    S.run = { phase: S.xm > XMIN + 1 ? 'out' : 'in', mult: c.sp, cfg: { sp: c.sp, mg: c.mg, tn: c.tn }, peak: 0 };
    Sound.click(); updateCtl();
  }
  function stepMagnet(dt) {
    const cfg = S.mode === 'lab' ? (S.run ? S.run.cfg : S.cfg) : { mg: 1, tn: 100 };
    let reading = 0, v = 0;
    if (S.run || S.auto) {
      const dir = S.run ? (S.run.phase === 'out' ? -1 : 1) : S.auto.dir;
      const mult = S.run ? S.run.mult : S.auto.mult;
      stepSub(dt, 0.004, (h) => {
        if (!(S.run || S.auto)) return;
        const d2 = S.run ? (S.run.phase === 'out' ? -1 : 1) : S.auto.dir;
        v = d2 * mult * V0;
        S.xm += v * h;
        const s = tipS(S.xm);
        reading = readingOf(cfg, S.pol, v, s);
        if (S.run && S.run.phase === 'in') S.run.peak = Math.max(S.run.peak, Math.abs(reading));
        if (S.xm >= XMAX) {
          S.xm = XMAX;
          if (S.run) {
            const rw = { sp: S.run.cfg.sp, mg: S.run.cfg.mg, tn: S.run.cfg.tn, peak: Math.round(S.run.peak * 10) / 10 };
            const k = keyOf(rw); const i = S.rows.findIndex((r) => keyOf(r) === k);
            if (i >= 0) S.rows[i] = rw; else S.rows.push(rw);
            S.run = null; Sound.success(); parts.burst(XC, YC - 50 * K, { count: 10, speed: 110, size: 3, colors: ['#ffb400', '#f26b3a', '#3867f4'], gravity: 150 });
            updateCtl();
          } else S.auto = null;
          v = 0; reading = 0;
        } else if (S.xm <= XMIN) {
          S.xm = XMIN;
          if (S.run && S.run.phase === 'out') S.run.phase = 'in'; else if (S.auto) S.auto = null;
          v = 0;
        }
      });
      S.vS = v; S.v = v;
    } else {
      if (S.drag) { const vi = (S.xm - S.prevX) / Math.max(dt, 0.001); S.vS = SciSim.approach(S.vS, vi, dt, 22); }
      else S.vS = SciSim.approach(S.vS, 0, dt, 22);
      if (Math.abs(S.vS) < 0.5) S.vS = 0;
      v = S.vS; S.v = v;
      reading = readingOf(cfg, S.pol, v, tipS(S.xm));
    }
    S.prevX = S.xm;
    S.reading = reading;
    S.needle.target = clamp(reading, -GALV_MAX, GALV_MAX);
    S.needle.update(dt);
    // 관찰 기록 (미션 확인용)
    const sNow = tipS(S.xm);
    if (S.mode === 'obs') {
      if (S.pol === 1 && reading >= 1.0) S.seen.inN = true;
      if (S.pol === 1 && reading <= -1.0) S.seen.outN = true;
      if (S.pol === -1 && reading <= -1.0) S.seen.inS = true;
      if (sNow >= 60 * K && Math.abs(S.vS) < 2 * K && Math.abs(reading) < 0.05) { S.stillT += dt; if (S.stillT >= 1.0) S.seen.still = true; } else S.stillT = 0;
    }
    S.histAcc += dt;
    while (S.histAcc >= 0.05) { S.histAcc -= 0.05; S.hist.push({ t: S.t, r: reading }); }
    while (S.hist.length && S.t - S.hist[0].t > 6.2) S.hist.shift();
    // 전류 점
    S.dotPh += reading * dt * 0.35;
  }

  function fieldLines(x, y, pol, count) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, TY); ctx.clip();
    const nEnd = pol === 1 ? x + LM / 2 : x - LM / 2, sEnd = pol === 1 ? x - LM / 2 : x + LM / 2;
    const sg = pol === 1 ? 1 : -1;
    ctx.lineWidth = 1.6; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -S.t * 26;
    for (let k = 1; k <= 4; k++) {
      const hh = (20 + k * 22) * K * (count === 2 ? 1.15 : 1), ex = (34 + k * 22) * K;
      [-1, 1].forEach((side) => {
        ctx.strokeStyle = C.rgba('#7c5cff', (0.5 - k * 0.07) * (count === 2 ? 1 : 0.85));
        ctx.beginPath(); ctx.moveTo(nEnd, y);
        ctx.bezierCurveTo(nEnd + sg * ex, y + side * hh * 1.3, sEnd - sg * ex, y + side * hh * 1.3, sEnd, y);
        ctx.stroke();
      });
    }
    ctx.restore();
  }
  function drawMagnetBody(x, y, pol, count, lift) {
    const offs = count === 2 ? [-(MT / 2 + 1.5 * K), MT / 2 + 1.5 * K] : [0];
    offs.forEach((oy) => {
      const left = x - LM / 2, top = y + oy - MT / 2;
      D.shadow(() => { D.roundRect(left, top, LM, MT, 4); ctx.fillStyle = '#ccd3df'; ctx.fill(); }, { blur: lift ? 10 : 5, y: lift ? 5 : 2 });
      const lc = pol === 1 ? '#2f6df6' : '#e2464b', rc = pol === 1 ? '#e2464b' : '#2f6df6';
      ctx.save(); D.roundRect(left, top, LM, MT, 4); ctx.clip();
      ctx.fillStyle = lc; ctx.fillRect(left, top, LM / 2, MT); ctx.fillStyle = rc; ctx.fillRect(x, top, LM / 2, MT);
      const g = ctx.createLinearGradient(0, top, 0, top + MT); g.addColorStop(0, 'rgba(255,255,255,.45)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
      ctx.fillStyle = g; ctx.fillRect(left, top, LM, MT); ctx.restore();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(40,50,70,.55)'; D.roundRect(left, top, LM, MT, 4); ctx.stroke();
      if (MT >= 14) { T(left + LM * 0.25, top + MT / 2 + 5, pol === 1 ? 'S' : 'N', Math.max(12, MT * 0.7), '#fff', 'center', 800); T(left + LM * 0.75, top + MT / 2 + 5, pol === 1 ? 'N' : 'S', Math.max(12, MT * 0.7), '#fff', 'center', 800); }
    });
  }
  function coilPath(i, n) { return XC - LC / 2 + (i + 0.5) * LC / n; }
  function drawCoilBack(tn, glow) {
    if (glow > 0.02) { D.glow(XC, YC, LC * 0.95, '#ffb400', Math.min(0.55, glow)); }
    const n = Math.round(tn / 10);
    ctx.lineWidth = Math.max(1.6, 3 * K); ctx.strokeStyle = '#b8742c'; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) { const x = coilPath(i, n); ctx.beginPath(); ctx.ellipse(x, YC, 6 * K + 1, CH, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke(); }
  }
  function drawCoilFront(tn, reading) {
    const n = Math.round(tn / 10);
    ctx.lineWidth = Math.max(1.8, 3.2 * K); ctx.strokeStyle = '#e39a45'; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) { const x = coilPath(i, n); ctx.beginPath(); ctx.ellipse(x, YC, 6 * K + 1, CH, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); }
    // 전류 점 (코일 앞쪽 줄을 따라 위/아래로)
    const a = Math.abs(reading);
    if (a > 0.08) {
      const dir = reading > 0 ? 1 : -1;
      for (let i = 0; i < n; i++) {
        const x = coilPath(i, n);
        for (let j = 0; j < 2; j++) {
          const q = ((S.dotPh * 1.0 + j * 0.5 + i * 0.13) % 1 + 1) % 1;
          const ang = -Math.PI / 2 + q * Math.PI;
          const px = x + Math.cos(ang) * (6 * K + 1), py = YC + Math.sin(ang) * CH;
          ctx.globalAlpha = Math.min(1, a / 2.0);
          D.sphere(px, py, Math.max(2.2, 3 * K), dir > 0 ? '#ffd447' : '#7cd0ff', { gloss: false });
          ctx.globalAlpha = 1;
        }
      }
    }
    // 코일 끝 도선 → 검류계
    ctx.lineWidth = 3; ctx.strokeStyle = '#b8742c';
    const xl = XC - LC / 2, xr = XC + LC / 2;
    ctx.beginPath(); ctx.moveTo(xl, YC + CH); ctx.lineTo(xl, TY - 14); ctx.lineTo(GX - GR * 0.5, TY - 14); ctx.lineTo(GX - GR * 0.5, GY + 36); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xr, YC + CH); ctx.lineTo(xr, TY - 5); ctx.lineTo(GX + GR * 0.5, TY - 5); ctx.lineTo(GX + GR * 0.5, GY + 36); ctx.stroke();
  }
  function drawGalv(cx, cy, r, val, off) {
    const w = r * 2 + 30, h = r + 56;
    D.shadow(() => { D.roundRect(cx - w / 2, cy - r - 16, w, h, 14); ctx.fillStyle = '#394258'; ctx.fill(); }, { blur: 8, y: 3 });
    D.roundRect(cx - w / 2 + 7, cy - r - 9, w - 14, h - 14, 10); ctx.fillStyle = '#fbfaf3'; ctx.fill();
    // 눈금
    const angF = (v) => -Math.PI / 2 + (v / GALV_MAX) * 1.2;      // 눈금 한쪽 끝 = 약 69도
    const px = (a, rr) => cx + Math.cos(a) * rr, py = (a, rr) => cy + Math.sin(a) * rr;
    ctx.strokeStyle = '#2b3140';
    for (let v = -GALV_MAX; v <= GALV_MAX; v++) {
      const a = angF(v), major = v % 5 === 0;
      ctx.lineWidth = major ? 2.4 : 1.2;
      ctx.beginPath(); ctx.moveTo(px(a, r * 0.92), py(a, r * 0.92)); ctx.lineTo(px(a, r * (major ? 0.74 : 0.82)), py(a, r * (major ? 0.74 : 0.82))); ctx.stroke();
      if (major) T(px(a, r * 0.6), py(a, r * 0.6) + 5, v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v), PHONE ? 12 : 13, '#2b3140', 'center', 800);
    }
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r * 0.92, angF(-GALV_MAX), angF(GALV_MAX)); ctx.stroke();
    T(cx, cy + 26, '검류계 (칸)', PHONE ? 12 : 13, '#5a6679', 'center', 800);
    // 바늘
    const a = angF(clamp(val, -GALV_MAX, GALV_MAX));
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 10, cy - Math.sin(a) * 10); ctx.lineTo(px(a, r * 0.88), py(a, r * 0.88)); ctx.stroke(); ctx.restore();
    D.sphere(cx, cy, 7, '#394258', { gloss: false });
    if (Math.abs(S.reading) > GALV_MAX + 0.05) D.label(cx, cy - r - 30, '눈금 밖! (' + fmtR(S.reading) + '칸)', { bg: '#e2464b', size: 12 });
  }
  function drawBench() {
    ctx.fillStyle = '#d9c2a0'; ctx.fillRect(0, TY, VW, SH - TY); ctx.fillStyle = '#b89870'; ctx.fillRect(0, TY, VW, 4);
    ctx.fillStyle = 'rgba(0,0,0,.05)'; ctx.fillRect(0, SH - 4, VW, 4);
  }
  function drawCoilScene(dt) {
    // 장면 배경 (위)
    const g = ctx.createLinearGradient(0, 0, 0, SH); g.addColorStop(0, '#eaf1fb'); g.addColorStop(1, '#f7f9fd'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, SH);
    drawBench();
    const cfg = S.mode === 'lab' ? (S.run ? S.run.cfg : S.cfg) : { mg: 1, tn: 100 };
    const glow = Math.min(1, Math.abs(S.reading) / GALV_MAX) * 0.8;
    drawCoilBack(cfg.tn, glow);
    // 자기력선 + 자석
    fieldLines(S.xm, YC, S.pol, cfg.mg);
    drawMagnetBody(S.xm, YC, S.pol, cfg.mg, !!S.drag);
    drawCoilFront(cfg.tn, S.reading);
    // 표지
    const lab = (x, y, t, col) => D.label(x, y, t, { bg: col, size: PHONE ? 11.5 : 13 });
    lab(XC, YC - CH - 18, '코일 ' + cfg.tn + '회', '#b8742c');
    lab(clamp(S.xm, 60, XC - LC / 2 - 20), YC - CH - 18 - (PHONE ? 14 : 14), '막대자석' + (cfg.mg === 2 ? ' 2개' : ''), '#5a4fcf');
    drawGalv(GX, GY, GR, S.needle.value, 0);
    // 자석 손잡이 힌트
    if (S.mode === 'obs' && !S.drag && !S.auto && S.t > 1 && Math.abs(S.reading) < 0.05 && !S.seen.inN) {
      const px = S.xm, py = YC + MT + 16 * K; D.arrow(px, py + 26, px, py + 4, { color: '#f26b3a', width: 3 });
      T(px, py + 44, '끌어 보세요', 13, '#9a3412', 'center', 800);
    }
    // 방향 표지
    const mv = Math.abs(S.v) < 1 ? '정지' : S.v > 0 ? '코일 쪽으로' : '코일에서 멀어짐';
    T(14, 26, S.mode === 'lab' ? '📊 속도 ' + (S.run ? S.run.mult : S.cfg.sp) + '배로 자석을 코일에 넣어요' : '🧲 자석을 코일에 넣고 빼 보세요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, S.mode === 'lab' ? '검류계의 최대 눈금을 기록해요' : '자석의 움직임: ' + mv, PHONE ? 12 : 13.5, '#5a6679', 'left', 700);
    drawDataRegion(dt);
    parts.update(dt); parts.draw(ctx);
  }

  /* ---- 아래 자료 영역 ---- */
  function drawStrip(px, py, pw, ph) {
    panel(px, py, pw, ph, 14);
    const x0 = px + 44, x1 = px + pw - 14, y0 = py + 34, y1 = py + ph - 26, ym = (y0 + y1) / 2;
    T(px + 14, py + 22, '검류계 눈금의 변화 (최근 6초)', 13.5, '#26324a', 'left', 800);
    const gy = (r) => ym - (clamp(r, -GALV_MAX, GALV_MAX) / GALV_MAX) * (ym - y0);
    [-10, -5, 0, 5, 10].forEach((r) => {
      ctx.strokeStyle = r === 0 ? '#516079' : 'rgba(120,135,160,.25)'; ctx.lineWidth = r === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x0, gy(r)); ctx.lineTo(x1, gy(r)); ctx.stroke();
      T(x0 - 6, gy(r) + 4, r === 0 ? '0' : (r > 0 ? '+' : '−') + Math.abs(r), 12, '#3a465c', 'right', 800);
    });
    T(x0, y1 + 18, '6초 전', 12, '#5a6679', 'left', 700); T(x1, y1 + 18, '지금', 12, '#5a6679', 'right', 700);
    const pts = S.hist.map((h) => ({ x: x1 - (S.t - h.t) / 6 * (x1 - x0), y: gy(h.r), r: h.r })).filter((p) => p.x >= x0 - 0.5);
    if (pts.length > 1) {
      ctx.beginPath(); ctx.moveTo(pts[0].x, ym); pts.forEach((p) => ctx.lineTo(p.x, p.y)); ctx.lineTo(pts[pts.length - 1].x, ym); ctx.closePath();
      ctx.fillStyle = 'rgba(242,107,58,.16)'; ctx.fill();
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    }
  }
  function drawFluxBar(px, py, pw, ph) {
    panel(px, py, pw, ph, 14);
    const cfg = curCfg();
    const phi = cfg.mg * fluxF(tipS(S.xm));
    T(px + 14, py + 22, '코일을 지나는 자기장 (상대값)', 13.5, '#26324a', 'left', 800);
    const bx = px + 16, bw = pw - 32, by = py + 34, bh = 18, MAXP = 2;
    D.roundRect(bx, by, bw, bh, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
    const fw = bw * clamp(phi / MAXP, 0, 1);
    if (fw > 0.5) { D.roundRect(bx, by, fw, bh, 8); ctx.fillStyle = '#7c5cff'; ctx.fill(); }
    [0, 1, 2].forEach((v) => { const xx = bx + bw * v / MAXP; ctx.strokeStyle = 'rgba(60,70,90,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx, by + bh); ctx.lineTo(xx, by + bh + 5); ctx.stroke(); T(xx, by + bh + 18, String(v), 12, '#3a465c', xx <= bx ? 'left' : xx >= bx + bw ? 'right' : 'center', 800); });
    T(bx + Math.max(8, Math.min(fw, bw) - 6), by + 16, phi.toFixed(2), 13, fw > 52 ? '#fff' : '#26324a', fw > 52 ? 'right' : 'left', 800);
    const moving = Math.abs(S.v) >= 1;
    const y2 = by + bh + 26;
    D.roundRect(px + 12, y2, pw - 24, ph - (y2 - py) - 8, 10); ctx.fillStyle = moving ? '#fff4d6' : '#eef1f7'; ctx.fill();
    textBlock(px + 22, y2 + 19, pw - 44, moving ? '자기장의 세기가 변하는 중 → 유도 전류가 생겨요' : '자기장의 세기가 변하지 않음 → 유도 전류 없음', PHONE ? 12.5 : 13.5, moving ? '#7a4b00' : '#3a465c', PHONE ? 16 : 18, 800);
  }
  const ROW_Y = SH + 10;
  function drawTable(px, py, pw, ph) {
    panel(px, py, pw, ph, 14);
    T(px + 14, py + 22, '실험 기록표 (검류계 최대 눈금)', 13.5, '#26324a', 'left', 800);
    const hh = 34, rh = PHONE ? 25 : 27, nrows = Math.floor((ph - hh - 44) / rh);
    const cols = [px + 14, px + pw * 0.2, px + pw * 0.4, px + pw * 0.6];
    const hy = py + 46;
    ['속도', '자석', '감은 수', '최대 눈금'].forEach((h, i) => T(cols[i], hy, h, 12.5, '#5a6679', 'left', 800));
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 10, hy + 6); ctx.lineTo(px + pw - 10, hy + 6); ctx.stroke();
    const rows = S.rows.slice(-nrows);
    const BARX = cols[3] + (PHONE ? 54 : 62), BARW = px + pw - 14 - BARX, BMAX = 12;
    rows.forEach((r, i) => {
      const yy = hy + 12 + i * rh, mid = yy + rh / 2 + 4;
      const hi = (v, base) => (v !== base ? '#c2410c' : '#26324a');
      T(cols[0], mid, r.sp + '배', 14, hi(r.sp, 1), 'left', 800);
      T(cols[1], mid, r.mg + '개', 14, hi(r.mg, 1), 'left', 800);
      T(cols[2], mid, r.tn + '회', 14, hi(r.tn, 100), 'left', 800);
      T(cols[3], mid, r.peak.toFixed(1), 14, '#c2410c', 'left', 800);
      const w = BARW * clamp(r.peak / BMAX, 0, 1);
      D.roundRect(BARX, yy + 4, BARW, rh - 8, 5); ctx.fillStyle = '#eef1f7'; ctx.fill();
      if (w > 0.5) { D.roundRect(BARX, yy + 4, w, rh - 8, 5); ctx.fillStyle = r.peak > BMAX ? '#e2464b' : '#f2873a'; ctx.fill(); }
      if (r.peak > BMAX) T(BARX + BARW - 4, mid, '▶ 막대 밖', 11, '#fff', 'right', 800);
    });
    if (!rows.length) T(px + pw / 2, hy + 50, '📏 측정하기를 눌러 기록해요', 14, '#98a2b3', 'center', 700);
    T(px + pw - 14, py + ph - 8, '막대 눈금: 0 ~ ' + BMAX + '칸', 11.5, '#7b8aa3', 'right', 700);
  }
  function drawDataRegion() {
    const y = ROW_Y, h = VH - y - 10;
    if (S.mode === 'lab') { drawTable(12, y, VW - 24, h); return; }
    if (PHONE) { drawStrip(12, y, VW - 24, 142); drawFluxBar(12, y + 152, VW - 24, h - 152); }
    else { drawStrip(12, y, 470, h); drawFluxBar(494, y, VW - 506, h); }
  }

  /* ---- 포인터 (자석 끌기) ---- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'obs' || S.run) return false;
      if (Math.abs(p.x - S.xm) <= LM / 2 + 10 && Math.abs(p.y - YC) <= MT + 22) {
        S.auto = null; S.drag = { ox: p.x - S.xm }; S.vS = 0; Sound.click(); return true;
      }
      return false;
    },
    move(p) { if (!S.drag) return; S.xm = clamp(p.x - S.drag.ox, XMIN, XMAX); },
    up() { S.drag = null; },
    hover(p) { return S.mode === 'obs' && Math.abs(p.x - S.xm) <= LM / 2 + 10 && Math.abs(p.y - YC) <= MT + 22 ? 'grab' : 'default'; },
  });
  $('#bIn').addEventListener('click', () => { if (S.mode === 'obs') startAuto(1, 1); });
  $('#bOut').addEventListener('click', () => { if (S.mode === 'obs') startAuto(-1, 1); });
  $('#bFlip').addEventListener('click', flipPole);
  $$('#spSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cfg.sp = +b.dataset.v; updateCtl(); }));
  $$('#mgSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cfg.mg = +b.dataset.v; updateCtl(); }));
  $$('#tnSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cfg.tn = +b.dataset.v; updateCtl(); }));
  $('#bMeasure').addEventListener('click', measure);
  $('#bClear').addEventListener('click', () => { Sound.click(); S.rows = []; });

  /* ---- 규칙 문장 (2단계 미션 2) ---- */
  const RULES = [
    ['자석을 2배 빠르게 움직이면 (기본과 비교해서) 유도 전류가', 1],
    ['자석을 2개(세기 2배)로 하면 유도 전류가', 1],
    ['코일 감은 수를 200회로 하면 유도 전류가', 1],
    ['코일 감은 수를 50회로 하면 유도 전류가', 2],
  ];
  const RULE_OPT = ['커져요', '작아져요', '변하지 않아요'];
  const ruleSel = [];
  RULES.forEach((r, i) => {
    const row = document.createElement('div'); row.className = 'sel-row';
    row.innerHTML = '<div class="q">' + r[0] + '</div>';
    const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', r[0]);
    sel.innerHTML = '<option value="">— 고르기 —</option>' + RULE_OPT.map((o, j) => '<option value="' + (j + 1) + '">' + o + '</option>').join('');
    sel.addEventListener('change', () => { S.rule[i] = sel.value; sel.classList.remove('ok', 'bad'); delete S.ruleOK[i]; Sound.click(); });
    row.appendChild(sel); $('#ruleRows').appendChild(row); ruleSel.push(sel);
  });
  function resetRule() { S.rule = {}; S.ruleOK = {}; ruleSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }
  // 정답 인덱스: 1=커져요, 2=작아져요 (RULE_OPT 순서와 같음)

  /* ================= ③ 간이 발전기 ================= */
  const G3 = (() => {
    // 위치 (장면)
    const wx = PHONE ? 100 : 148, wy = PHONE ? 178 : 168, wr = PHONE ? 44 : 64, mh = PHONE ? 36 : 56;
    const cx = PHONE ? 214 : 322, cl = PHONE ? 60 : 100, ch = PHONE ? 28 : 42;
    const term = cx + cl / 2 + 8 * K;
    const yt = wy - ch, yb = wy + ch;
    const xa = PHONE ? 330 : 520, xb = PHONE ? 410 : 625;
    return { wx, wy, wr, mh, cx, cl, ch, term, yt, yb, xa, xb, xe: xb + (PHONE ? 30 : 50) };
  })();
  const genAmp = (g) => KE * g.f * (g.tn / 100) * g.mg;
  const axisMaxOf = (a) => (a <= 4 ? 4 : a <= 8 ? 8 : 16);
  const ledPct = (g) => Math.round(clamp((genAmp(g) - VTH) / (VREF - VTH), 0, 1) * 100);
  function stepGen(dt) {
    const g = S.gen;
    g.f = Math.abs(g.f - g.ft) < 0.005 ? g.ft : SciSim.approach(g.f, g.ft, dt, 3);
    g.phi += TAU * g.f * dt; if (g.phi > 1e4) g.phi -= 1e4 - (1e4 % TAU);
    g.e = genAmp(g) * Math.sin(g.phi);
    g.ledA = SciSim.approach(g.ledA, clamp((g.e - VTH) / (VREF - VTH), 0, 1), dt, 40);
    g.ledB = SciSim.approach(g.ledB, clamp((-g.e - VTH) / (VREF - VTH), 0, 1), dt, 40);
    g.hAcc += dt;
    while (g.hAcc >= 0.01) { g.hAcc -= 0.01; g.hist.push({ t: S.t, e: g.e }); }
    while (g.hist.length && S.t - g.hist[0].t > 4.05) g.hist.shift();
    g.dotP += (Math.abs(g.e) > VTH ? (0.25 + (Math.abs(g.e) - VTH) * 0.12) : 0) * dt;
  }
  function drawLED(x, y, r, col, b, up) {
    const bb = Math.sqrt(b);
    if (b > 0.01) D.glow(x, y, r * (2.2 + 1.6 * bb), col, 0.25 + 0.6 * bb);
    D.sphere(x, y, r, b > 0.01 ? C.mix('#8a7a7a', col, 0.3 + 0.7 * bb) : '#b9a9aa', { gloss: true });
    ctx.fillStyle = '#1b2333'; ctx.beginPath();
    const s = r * 0.5;
    if (up) { ctx.moveTo(x, y - s); ctx.lineTo(x - s, y + s * 0.8); ctx.lineTo(x + s, y + s * 0.8); } else { ctx.moveTo(x, y + s); ctx.lineTo(x - s, y - s * 0.8); ctx.lineTo(x + s, y - s * 0.8); }
    ctx.closePath(); ctx.fill();
    ctx.fillRect(x - s, up ? y - s : y + s - 2, s * 2, 2.4);
  }
  function loopDots(path, p0, n, col, a) {
    // path: 닫힌 도선 [[x,y],...]
    let L = 0; const seg = []; for (let i = 0; i < path.length; i++) { const A = path[i], B = path[(i + 1) % path.length]; const d = Math.hypot(B[0] - A[0], B[1] - A[1]); seg.push(d); L += d; }
    for (let j = 0; j < n; j++) {
      let q = (((p0 + j / n) % 1) + 1) % 1 * L, i = 0;
      while (q > seg[i]) { q -= seg[i]; i++; }
      const A = path[i], B = path[(i + 1) % path.length], f = q / seg[i];
      ctx.globalAlpha = a; D.sphere(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, Math.max(2.4, 3.4 * K), col, { gloss: false }); ctx.globalAlpha = 1;
    }
  }
  function drawGenScene(dt) {
    const g = S.gen, L = G3;
    const gr = ctx.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, '#eaf1fb'); gr.addColorStop(1, '#f7f9fd'); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, SH);
    drawBench();
    // 바퀴 + 손잡이 + 자석
    ctx.save(); ctx.translate(L.wx, L.wy);
    D.shadow(() => { ctx.beginPath(); ctx.arc(0, 0, L.wr, 0, TAU); ctx.fillStyle = '#dbe2ee'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#9aa7bd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, L.wr, 0, TAU); ctx.stroke();
    ctx.rotate(g.phi);
    const mt = MT * 1.1;
    const offs = g.mg === 2 ? [-(mt / 2 + 1.5), mt / 2 + 1.5] : [0];
    offs.forEach((oy) => {
      D.roundRect(-L.mh, oy - mt / 2, L.mh * 2, mt, 4); ctx.fillStyle = '#ccd3df'; ctx.fill();
      ctx.save(); D.roundRect(-L.mh, oy - mt / 2, L.mh * 2, mt, 4); ctx.clip();
      ctx.fillStyle = '#2f6df6'; ctx.fillRect(-L.mh, oy - mt / 2, L.mh, mt); ctx.fillStyle = '#e2464b'; ctx.fillRect(0, oy - mt / 2, L.mh, mt); ctx.restore();
      ctx.strokeStyle = 'rgba(40,50,70,.55)'; ctx.lineWidth = 1.4; D.roundRect(-L.mh, oy - mt / 2, L.mh * 2, mt, 4); ctx.stroke();
    });
    // 손잡이 (자석과 수직)
    ctx.strokeStyle = '#7a8599'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, L.wr * 0.92); ctx.stroke();
    D.sphere(0, L.wr * 0.92, PHONE ? 7 : 10, '#f2873a', { shadow: true });
    D.sphere(0, 0, 5, '#394258', { gloss: false });
    ctx.restore();
    T(L.wx, L.wy + L.wr + 20, '손잡이를 돌려 자석을 회전', PHONE ? 11.5 : 13, '#5a6679', 'center', 700);
    // N/S 글씨 (회전과 함께)
    ctx.save(); ctx.translate(L.wx, L.wy); ctx.rotate(g.phi);
    T(-L.mh * 0.5, 5, 'S', 13, '#fff', 'center', 800); T(L.mh * 0.5, 5, 'N', 13, '#fff', 'center', 800); ctx.restore();
    // 코일 (고정)
    const n = Math.round(g.tn / 10);
    if (Math.abs(g.e) > 0.2) D.glow(L.cx, L.wy, L.cl * 0.9, '#ffb400', Math.min(0.5, Math.abs(g.e) / 14));
    const lp = (i) => L.cx - L.cl / 2 + (i + 0.5) * L.cl / n;
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.6, 2.8 * K); ctx.strokeStyle = '#e39a45';
    for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.ellipse(lp(i), L.wy, 5 * K + 1, L.ch, 0, 0, TAU); ctx.stroke(); }
    lab3(L.cx, L.wy - L.ch - 16, '코일 ' + g.tn + '회');
    // 회로
    ctx.strokeStyle = '#7a8599'; ctx.lineWidth = 3;
    const xr = L.term + 6;
    ctx.beginPath(); ctx.moveTo(L.cx + L.cl / 2, L.yt); ctx.lineTo(L.xe, L.yt); ctx.moveTo(L.cx + L.cl / 2, L.yb); ctx.lineTo(L.xe, L.yb);
    ctx.moveTo(L.xa, L.yt); ctx.lineTo(L.xa, L.yb); ctx.moveTo(L.xb, L.yt); ctx.lineTo(L.xb, L.yb); ctx.stroke();
    drawLED(L.xa, L.wy, PHONE ? 15 : 21, '#ff4d4d', g.ledA, false);
    drawLED(L.xb, L.wy, PHONE ? 15 : 21, '#37d67a', g.ledB, true);
    T(L.xa, L.yb + 22, 'LED 1', PHONE ? 11.5 : 13, '#5a6679', 'center', 800); T(L.xb, L.yb + 22, 'LED 2', PHONE ? 11.5 : 13, '#5a6679', 'center', 800);
    // 전류 점
    if (Math.abs(g.e) > VTH) {
      const x0 = L.cx - L.cl / 2;
      const aLoop = [[x0, L.yt], [L.cx + L.cl / 2, L.yt], [L.xa, L.yt], [L.xa, L.yb], [L.cx + L.cl / 2, L.yb], [x0, L.yb]];
      const bLoop = [[x0, L.yb], [L.cx + L.cl / 2, L.yb], [L.xb, L.yb], [L.xb, L.yt], [L.cx + L.cl / 2, L.yt], [x0, L.yt]];
      loopDots(g.e > 0 ? aLoop : bLoop, g.dotP, PHONE ? 12 : 18, g.e > 0 ? '#ff7a7a' : '#6fe3a1', 0.95);
    }
    T(14, 26, '⚙️ 자석을 돌려 LED를 켜 보세요', PHONE ? 14 : 17, '#26324a', 'left', 800);
    T(14, PHONE ? 46 : 50, g.e > VTH ? '지금: LED 1이 켜져요' : g.e < -VTH ? '지금: LED 2가 켜져요' : '지금: 두 LED 모두 꺼짐 (전압이 ' + VTH.toFixed(1) + ' 이하)', PHONE ? 12 : 13.5, '#5a6679', 'left', 700);
    drawGenData();
    parts.update(dt); parts.draw(ctx);
  }
  function lab3(x, y, t) { D.label(x, y, t, { bg: '#b8742c', size: PHONE ? 11.5 : 13 }); }
  function drawGenData() {
    const g = S.gen, y = ROW_Y, h = VH - y - 10;
    const A = genAmp(g), AX = axisMaxOf(A);
    const px = 12, pw = PHONE ? 330 : 530, ph = h;
    panel(px, y, pw, ph, 14);
    T(px + 14, y + 22, '유도 전압의 변화 (상대값, 최근 4초)', 13.5, '#26324a', 'left', 800);
    const x0 = px + 44, x1 = px + pw - 14, y0 = y + 36, y1 = y + ph - 26, ym = (y0 + y1) / 2;
    const gy = (e) => ym - clamp(e / AX, -1, 1) * (ym - y0);
    const ticks = [-AX, -AX / 2, 0, AX / 2, AX];
    ticks.forEach((e) => { ctx.strokeStyle = e === 0 ? '#516079' : 'rgba(120,135,160,.25)'; ctx.lineWidth = e === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(x0, gy(e)); ctx.lineTo(x1, gy(e)); ctx.stroke(); T(x0 - 6, gy(e) + 4, (e > 0 ? '+' : e < 0 ? '−' : '') + Math.abs(e), 12, '#3a465c', 'right', 800); });
    [VTH, -VTH].forEach((e) => { ctx.strokeStyle = '#e2464b'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, gy(e)); ctx.lineTo(x1, gy(e)); ctx.stroke(); ctx.setLineDash([]); });
    T(x0 + 6, y0 + 12, '점선: LED가 켜지는 전압 ±' + VTH.toFixed(1), 12, '#c0392b', 'left', 800);
    T(x0, y1 + 18, '4초 전', 12, '#5a6679', 'left', 700); T(x1, y1 + 18, '지금', 12, '#5a6679', 'right', 700);
    const pts = g.hist.map((p) => ({ x: x1 - (S.t - p.t) / 4 * (x1 - x0), y: gy(p.e), e: p.e })).filter((p) => p.x >= x0 - 0.5);
    if (pts.length > 1) {
      // 켜진 구간 색 칠하기
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        if (Math.abs(a.e) > VTH && Math.abs(b.e) > VTH && a.e * b.e > 0) {
          ctx.beginPath(); ctx.moveTo(a.x, gy(a.e > 0 ? VTH : -VTH)); ctx.lineTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x, gy(b.e > 0 ? VTH : -VTH)); ctx.closePath();
          ctx.fillStyle = a.e > 0 ? 'rgba(255,90,90,.28)' : 'rgba(55,214,122,.3)'; ctx.fill();
        }
      }
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
      const last = pts[pts.length - 1]; D.sphere(last.x, last.y, 5, '#7c5cff', { gloss: false });
    }
    // 오른쪽: 자기장과 전압 막대
    const bx = px + pw + 10, by = y, bw = VW - bx - 12, bh = h;
    panel(bx, by, bw, bh, 14);
    T(bx + 14, by + 22, '자기장과 전압', 13.5, '#26324a', 'left', 800);
    const colx = [bx + bw * 0.27, bx + bw * 0.73], top = by + 58, bot = by + bh - 34, mid = (top + bot) / 2;
    const vals = [{ v: Math.cos(g.phi), max: 1, col: '#7c5cff', txt: Math.cos(g.phi).toFixed(2) }, { v: g.e, max: AX, col: '#f26b3a', txt: (g.e >= 0 ? '+' : '−') + Math.abs(g.e).toFixed(1) }];
    vals.forEach((o, i) => {
      const x = colx[i], w = Math.min(34, bw * 0.2);
      D.roundRect(x - w / 2, top, w, bot - top, 6); ctx.fillStyle = '#eef1f7'; ctx.fill();
      const hgt = clamp(o.v / o.max, -1, 1) * (bot - top) / 2;
      if (Math.abs(hgt) > 0.5) { ctx.fillStyle = o.col; ctx.fillRect(x - w / 2, hgt >= 0 ? mid - hgt : mid, w, Math.abs(hgt)); }
      ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - w / 2 - 4, mid); ctx.lineTo(x + w / 2 + 4, mid); ctx.stroke();
      T(x, bot + 16, o.txt, 13, '#26324a', 'center', 800);
    });
    T(colx[0], by + 48, '자기장', 12, '#5a4fcf', 'center', 800); T(colx[1], by + 48, '전압', 12, '#c2410c', 'center', 800);
  }
  $('#sRev').addEventListener('input', (e) => { S.gen.ft = +e.target.value; Sound.tick(); updateCtl(); });
  $$('#gnSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.gen.tn = +b.dataset.v; updateCtl(); }));
  $$('#gmSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.gen.mg = +b.dataset.v; updateCtl(); }));

  /* ================= ④ 에너지 전환 ================= */
  const CVN = { water: '수력 발전', wind: '풍력 발전', steam: '증기 터빈 발전' };
  const CVIN = { water: '흐르는 물', wind: '부는 바람', steam: '수증기' };
  const GEN4 = (() => {
    const gx = PHONE ? 300 : 470, gy = PHONE ? 178 : 172, gr = PHONE ? 38 : 54;
    return { gx, gy, gr, dx: PHONE ? 130 : 210, lx: PHONE ? 420 : 690, ly: gy };
  })();
  function stepConv(dt) {
    const c = S.cv;
    c.w = Math.abs(c.w - c.sup * WMAX) < 0.003 ? c.sup * WMAX : SciSim.approach(c.w, c.sup * WMAX, dt, 2.4);
    c.ang += TAU * c.w * dt; if (c.ang > 1e4) c.ang -= 1e4 - (1e4 % TAU);
    c.b = c.w / WMAX;
    c.ph += c.w * dt * 0.6;
    // 입자: 물방울 · 바람 · 수증기
    if (c.lastKind !== c.kind) { c.lastKind = c.kind; c.parts.length = 0; c.acc = 0; }
    const pc = c.parts;
    c.acc += dt;
    const rate = c.sup * (c.kind === 'water' ? 55 : c.kind === 'wind' ? 26 : 40);
    const dx = GEN4.dx, gy = GEN4.gy;
    while (rate > 0 && c.acc > 1 / rate) {
      c.acc -= 1 / rate;
      if (c.kind === 'water') pc.push({ x: dx - (PHONE ? 42 : 66) * 0.55 + rnd(-3, 3), y: gy - (PHONE ? 42 : 66) - (PHONE ? 30 : 50) + 6, vx: rnd(-3, 3), vy: 0, life: 3 });
      else if (c.kind === 'wind') pc.push({ x: -10, y: rnd(40, SH - 70), vx: (120 + 160 * c.sup) * (PHONE ? 0.75 : 1), vy: 0, life: 4, len: rnd(16, 34) });
      else pc.push({ x: dx - (PHONE ? 38 : 66), y: gy + (PHONE ? 52 : 80), t: 0, life: 1.6 });
    }
    if (rate <= 0) c.acc = 0;
    for (let i = pc.length - 1; i >= 0; i--) {
      const p = pc[i]; p.life -= dt;
      if (c.kind === 'water') {
        p.vy += 520 * dt * (PHONE ? 0.8 : 1); p.x += p.vx * dt; p.y += p.vy * dt;
        const Rw = (PHONE ? 42 : 66) * 0.92;
        if (Math.hypot(p.x - dx, p.y - gy) < Rw) {      // 물레방아 날개에 부딪혀 튀어요
          if (!RM) for (let q = 0; q < 2; q++) parts.emit({ x: p.x, y: p.y, vx: rnd(-70, 20), vy: rnd(-60, -10), life: 0.4, size: 2.2, color: '#9ad4ff', gravity: 420, shape: 'circle' });
          pc.splice(i, 1);
        } else if (p.life <= 0 || p.y > SH) pc.splice(i, 1);
      } else if (c.kind === 'wind') {
        p.x += p.vx * dt; if (p.x > VW + 40 || p.life <= 0) pc.splice(i, 1);
      } else {
        p.t += dt / 1.6; if (p.t >= 1) pc.splice(i, 1);
      }
    }
    if (c.sup > 0 && !RM && c.kind === 'steam' && Math.random() < dt * 14 * c.sup) parts.emit({ x: dx + rnd(-8, 8), y: gy - (PHONE ? 38 : 58), vx: rnd(-8, 8), vy: rnd(-40, -18), life: 1.2, size: 5 + rnd(0, 3), color: 'rgba(235,240,248,.9)', shape: 'smoke', grow: 8 });
    // 확인 기록
    const pct = Math.round(c.b * 100);
    if (S.mode === 'conv' && pct >= 50) c.done[c.kind] = true;
  }
  function drawGenerator4(x, y, r, ang, b) {
    D.shadow(() => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#566178'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.beginPath(); ctx.arc(x, y, r - 5, 0, TAU); ctx.fillStyle = '#e8edf6'; ctx.fill();
    // 고정 코일 두 개
    [-1, 1].forEach((sg) => {
      const cx = x + sg * (r - 15 * K - 4), w = 14 * K + 4, h = r * 1.0;
      D.roundRect(cx - w / 2, y - h / 2, w, h, 4); ctx.fillStyle = '#e39a45'; ctx.fill();
      ctx.strokeStyle = '#a8662a'; ctx.lineWidth = 1.4; for (let i = 0; i < 5; i++) { const yy = y - h / 2 + (i + 0.5) * h / 5; ctx.beginPath(); ctx.moveTo(cx - w / 2, yy); ctx.lineTo(cx + w / 2, yy); ctx.stroke(); }
    });
    // 회전 자석
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const L = r * 0.6, t = r * 0.3;
    D.roundRect(-L, -t / 2, L * 2, t, 4); ctx.fillStyle = '#ccd3df'; ctx.fill();
    ctx.save(); D.roundRect(-L, -t / 2, L * 2, t, 4); ctx.clip(); ctx.fillStyle = '#2f6df6'; ctx.fillRect(-L, -t / 2, L, t); ctx.fillStyle = '#e2464b'; ctx.fillRect(0, -t / 2, L, t); ctx.restore();
    ctx.restore();
    D.sphere(x, y, 4, '#394258', { gloss: false });
    T(x, y + r + 20, '발전기', PHONE ? 12 : 14, '#26324a', 'center', 800);
  }
  function drawLamp(x, y, b) {
    const R = PHONE ? 24 : 32;
    if (b > 0.02) D.glow(x, y - 4, R * (2.2 + 1.8 * Math.sqrt(b)), '#ffd447', 0.2 + 0.6 * Math.sqrt(b));
    D.sphere(x, y - 4, R, C.mix('#d9d7cf', '#fff3a8', Math.sqrt(b)), { gloss: true });
    ctx.strokeStyle = C.mix('#7a7468', '#ff9d00', b); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 7, y + R - 6); ctx.lineTo(x - 5, y - 2); ctx.lineTo(x, y + 4); ctx.lineTo(x + 5, y - 2); ctx.lineTo(x + 7, y + R - 6); ctx.stroke();
    ctx.fillStyle = '#7a8599'; D.roundRect(x - 11, y + R - 6, 22, 14, 3); ctx.fill();
    T(x, y + R + 24, '전구', PHONE ? 12 : 14, '#26324a', 'center', 800);
  }
  function drawConvScene(dt) {
    const c = S.cv, L = GEN4;
    const gr = ctx.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, c.kind === 'wind' ? '#d9ecff' : '#eaf1fb'); gr.addColorStop(1, '#f7f9fd'); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, SH);
    drawBench();
    const dx = L.dx, gy = L.gy;
    // 축
    ctx.strokeStyle = '#8791a5'; ctx.lineWidth = 7; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(dx, gy); ctx.lineTo(L.gx - L.gr, gy); ctx.stroke();
    ctx.strokeStyle = '#d6dbe6'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -c.ang * 6; ctx.beginPath(); ctx.moveTo(dx, gy); ctx.lineTo(L.gx - L.gr, gy); ctx.stroke(); ctx.setLineDash([]);
    if (c.kind === 'water') drawWater(c, dx, gy); else if (c.kind === 'wind') drawWind(c, dx, gy); else drawSteam(c, dx, gy);
    drawGenerator4(L.gx, L.gy, L.gr, c.ang, c.b);
    // 전선 + 전류 점 (교류: 앞뒤로 출렁)
    const wy1 = L.gy - 12, wy2 = L.gy + 12, wx0 = L.gx + L.gr, wx1 = L.lx - (PHONE ? 18 : 26);
    ctx.strokeStyle = '#7a8599'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx0, wy1); ctx.lineTo(wx1, wy1); ctx.lineTo(wx1, L.ly + 6); ctx.moveTo(wx0, wy2); ctx.lineTo(wx1 + 12, wy2); ctx.lineTo(wx1 + 12, L.ly + 10); ctx.stroke();
    if (c.b > 0.01) {
      const nD = 7, osc = (0.03 + 0.07 * c.b) * Math.cos(c.ang);
      for (let j = 0; j < nD; j++) {
        const q = ((j + 0.5) / nD + osc + 2) % 1;
        const x = wx0 + (wx1 - wx0) * q;
        ctx.globalAlpha = 0.5 + 0.5 * c.b; D.sphere(x, wy1, 3.2, '#ffd447', { gloss: false }); D.sphere(wx1 + 12 - (wx1 + 12 - wx0) * q, wy2, 3.2, '#ffd447', { gloss: false }); ctx.globalAlpha = 1;
      }
    }
    drawLamp(L.lx, L.ly, c.b);
    // 이름표
    const lb = (x, y, t, col) => D.label(x, y, t, { bg: col, size: PHONE ? 11.5 : 13 });
    lb(dx, 24, '입력: ' + CVIN[c.kind] + '의 운동 에너지', '#2f6df6');
    lb(L.lx - (PHONE ? 0 : 0), 24, '출력: 전기 에너지', '#f2873a');
    T(14, SH - 12, '💡 ' + CVN[c.kind], PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    drawConvData();
    parts.update(dt); parts.draw(ctx);
  }
  function drawWater(c, dx, gy) {
    const R = PHONE ? 42 : 66, wy = gy;
    // 수조 · 물길
    const pw = PHONE ? 50 : 100, tx1 = dx - R * 0.55 + 8;
    ctx.fillStyle = '#9aa7bd'; D.roundRect(tx1 - pw, gy - R - (PHONE ? 30 : 50), pw, PHONE ? 10 : 14, 4); ctx.fill();
    ctx.fillStyle = '#cfe8ff'; ctx.fillRect(tx1 - pw + 4, gy - R - (PHONE ? 30 : 50) - 4, pw - 8, 4);
    // 아래 물
    ctx.fillStyle = 'rgba(80,160,230,.55)'; ctx.fillRect(dx - R - 20, SH - 40, 2 * R + 80, 36 - 0);
    // 바퀴
    ctx.save(); ctx.translate(dx, wy); ctx.rotate(-c.ang);
    D.shadow(() => { ctx.beginPath(); ctx.arc(0, 0, R * 0.8, 0, TAU); ctx.fillStyle = '#b98c5a'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#8a6238'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R * 0.8, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8; ctx.strokeStyle = '#8a6238'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); ctx.stroke();
      ctx.save(); ctx.translate(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92); ctx.rotate(a); ctx.fillStyle = '#a3763f'; ctx.fillRect(-R * 0.16, -7, R * 0.32, 14); ctx.strokeStyle = '#6e4a22'; ctx.lineWidth = 1.2; ctx.strokeRect(-R * 0.16, -7, R * 0.32, 14); ctx.restore();
    }
    ctx.restore(); D.sphere(dx, wy, 6, '#394258', { gloss: false });
    c.parts.forEach((p) => { ctx.globalAlpha = 0.9; D.sphere(p.x, p.y, 2.6, '#6fb8f5', { gloss: false }); ctx.globalAlpha = 1; });
  }
  function drawWind(c, dx, gy) {
    const R = PHONE ? 46 : 74;
    // 탑
    ctx.fillStyle = '#c2c9d6'; ctx.beginPath(); ctx.moveTo(dx - 7, gy + 8); ctx.lineTo(dx + 7, gy + 8); ctx.lineTo(dx + 12, TY); ctx.lineTo(dx - 12, TY); ctx.closePath(); ctx.fill();
    // 바람 줄
    c.parts.forEach((p) => { ctx.strokeStyle = 'rgba(90,130,190,.55)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x - p.len, p.y); ctx.lineTo(p.x, p.y); ctx.stroke(); });
    ctx.save(); ctx.translate(dx, gy); ctx.rotate(c.ang * 0.5);
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.rotate(i * TAU / 3);
      D.shadow(() => { ctx.beginPath(); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-9, -R * 0.5, 0, -R); ctx.quadraticCurveTo(10, -R * 0.45, 6, 0); ctx.closePath(); ctx.fillStyle = '#f4f6fa'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = '#aab3c4'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    }
    ctx.restore(); D.sphere(dx, gy, 9, '#7a8599', { shadow: true });
  }
  function drawSteam(c, dx, gy) {
    // 보일러
    const bw = PHONE ? 56 : 90, bh = PHONE ? 64 : 100, bx = dx - (PHONE ? 78 : 118), by = TY - 24 - bh;
    D.shadow(() => { D.roundRect(bx - bw / 2, by, bw, bh, 8); ctx.fillStyle = '#8a94a8'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#6a7488'; ctx.fillRect(bx - bw / 2 + 6, by + bh * 0.35, bw - 12, bh * 0.4);
    ctx.fillStyle = 'rgba(111,184,245,.85)'; ctx.fillRect(bx - bw / 2 + 8, by + bh * 0.3, bw - 16, bh * 0.3);
    D.flame(bx, TY - 2, (PHONE ? 20 : 30) * (0.3 + 0.7 * c.sup), S.t);
    T(bx, by + bh * 0.2, '보일러', PHONE ? 11.5 : 13, '#fff', 'center', 800);
    // 파이프
    const px0 = bx, py0 = by, px1 = dx - (PHONE ? 38 : 58);
    ctx.strokeStyle = '#a7b0c2'; ctx.lineWidth = PHONE ? 8 : 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px0, py0 - (PHONE ? 20 : 30)); ctx.lineTo(px1, py0 - (PHONE ? 20 : 30)); ctx.lineTo(px1, gy - (PHONE ? 20 : 30)); ctx.stroke();
    // 수증기 점 (파이프를 따라)
    const path = [[px0, py0], [px0, py0 - (PHONE ? 20 : 30)], [px1, py0 - (PHONE ? 20 : 30)], [px1, gy - (PHONE ? 20 : 30)]];
    let L = 0; const segL = []; for (let i = 0; i < path.length - 1; i++) { const d = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); segL.push(d); L += d; }
    c.parts.forEach((p) => {
      let q = p.t * L, i = 0; while (i < segL.length - 1 && q > segL[i]) { q -= segL[i]; i++; }
      const A = path[i], B = path[i + 1], f = clamp(q / segL[i], 0, 1);
      D.sphere(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, PHONE ? 3.4 : 4.6, '#ffffff', { gloss: false, outline: '#8fa0b8', outlineWidth: 1 });
    });
    // 터빈 케이스 + 날개
    const R = PHONE ? 34 : 54;
    D.shadow(() => { ctx.beginPath(); ctx.arc(dx, gy, R, 0, TAU); ctx.fillStyle = '#dfe5f0'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#8791a5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(dx, gy, R, 0, TAU); ctx.stroke();
    ctx.save(); ctx.translate(dx, gy); ctx.rotate(c.ang);
    for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.fillStyle = '#7a8599'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R * 0.86, -R * 0.12); ctx.lineTo(R * 0.86, R * 0.22); ctx.closePath(); ctx.fill(); }
    ctx.restore(); D.sphere(dx, gy, 5, '#394258', { gloss: false });
    T(dx, gy + R + 18, '터빈', PHONE ? 11.5 : 13, '#26324a', 'center', 800);
    T(bx - bw / 2 + 2, by - (PHONE ? 34 : 46), '열원은 다음 차시에서', PHONE ? 11 : 12, '#5a6679', 'left', 700);
  }
  function drawConvData() {
    const c = S.cv, y = ROW_Y, h = VH - y - 10;
    panel(12, y, VW - 24, h, 14);
    T(26, y + 24, '에너지의 흐름', 14, '#26324a', 'left', 800);
    const bx = [PHONE ? 20 : 40, PHONE ? 184 : 300, PHONE ? 348 : 560], bw = PHONE ? 112 : 190, bh = PHONE ? 60 : 64, by = y + 40;
    const names = [['입력', '운동 에너지', '#2f6df6'], ['발전기', '운동 → 전기', '#566178'], ['출력', '전기 에너지', '#f2873a']];
    names.forEach((n, i) => {
      D.roundRect(bx[i], by, bw, bh, 12); ctx.fillStyle = C.rgba(n[2], 0.12); ctx.fill(); ctx.strokeStyle = n[2]; ctx.lineWidth = 2; ctx.stroke();
      T(bx[i] + bw / 2, by + 24, n[0], 13, n[2], 'center', 800); T(bx[i] + bw / 2, by + 46, n[1], PHONE ? 13 : 15, '#26324a', 'center', 800);
    });
    const aw = 2 + 8 * c.sup;
    D.arrow(bx[0] + bw + 4, by + bh / 2, bx[1] - 4, by + bh / 2, { color: '#2f6df6', width: aw, head: 10 + aw });
    D.arrow(bx[1] + bw + 4, by + bh / 2, bx[2] - 4, by + bh / 2, { color: '#f2873a', width: Math.max(2, aw * 0.85), head: 10 + aw * 0.85 });
    D.arrow(bx[1] + bw / 2, by - 2, bx[1] + bw / 2, by - 18, { color: '#e2464b', width: Math.max(1.5, aw * 0.15), head: 8, alpha: 0.9 });
    T(bx[1] + bw / 2 + 12, by - 4, '일부는 열', 11.5, '#c0392b', 'left', 700);
    // 비교 카드
    const cy = by + bh + 16, cw = (VW - 24 - 36) / 2, ch = h - (cy - y) - 10;
    [['🔌 전동기 (중2)', '전기 에너지 → 운동 에너지\n예) 선풍기, 전기 자동차', '#9a3412'], ['⚙️ 발전기 (이번 차시)', '운동 에너지 → 전기 에너지\n예) 수력·풍력·화력 발전소', '#1d4ed8']].forEach((o, i) => {
      const x = 24 + i * (cw + 12);
      D.roundRect(x, cy, cw, ch, 10); ctx.fillStyle = '#f5f7fb'; ctx.fill();
      T(x + 12, cy + 20, o[0], PHONE ? 12 : 13, o[2], 'left', 800);
      textBlock(x + 12, cy + 40, cw - 24, o[1], PHONE ? 12 : 13.5, '#26324a', 17, 800);
    });
  }
  $$('#cvSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (S.cv.kind !== b.dataset.v) { S.cv.kind = b.dataset.v; S.cv.parts.length = 0; S.cv.acc = 0; parts.clear(); S.fade = 0.6; } updateCtl(); }));
  $('#sSup').addEventListener('input', (e) => { S.cv.sup = +e.target.value / 100; Sound.tick(); updateCtl(); });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'obs') {
      L1 = '유도 전류'; a = fmtR(S.reading) + ' 칸' + (Math.abs(S.reading) > GALV_MAX ? ' (눈금 밖)' : '');
      L2 = '자석의 움직임'; b = Math.abs(S.v) < 1 ? '정지' : S.v > 0 ? '코일 쪽으로' : '코일에서 멀어짐';
      L3 = '코일 속 자기장'; c = (curCfg().mg * fluxF(tipS(S.xm))).toFixed(2) + ' (상대값)';
    } else if (S.mode === 'lab') {
      const last = S.rows[S.rows.length - 1];
      L1 = '지금 조건'; a = S.cfg.sp + '배 · ' + S.cfg.mg + '개 · ' + S.cfg.tn + '회';
      L2 = '검류계'; b = S.run ? fmtR(S.reading) + ' 칸' : '—';
      L3 = '마지막 기록'; c = last ? last.peak.toFixed(1) + ' 칸' : '—';
    } else if (S.mode === 'gen') {
      const g = S.gen;
      L1 = '회전 속도'; a = g.f.toFixed(1) + ' 회/초'; L2 = '최대 전압'; b = genAmp(g).toFixed(1) + ' (상대값)'; L3 = 'LED 최대 밝기'; c = ledPct(g) + ' %';
    } else {
      const k = S.cv;
      L1 = '공급량'; a = Math.round(k.sup * 100) + ' %'; L2 = '발전기 회전'; b = k.w.toFixed(1) + ' 회/초'; L3 = '전구 밝기'; c = Math.round(k.b * 100) + ' %';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const rowHas = (f) => S.rows.some(f);
  const hasBase = () => S.rows.some((r) => keyOf(r) === baseKey);
  const onlySp = (r) => r.sp === 2 && r.mg === 1 && r.tn === 100;
  const onlyMg = (r) => r.sp === 1 && r.mg === 2 && r.tn === 100;
  const onlyTn = (r) => r.sp === 1 && r.mg === 1 && r.tn !== 100;
  const levels = [
    {
      title: '전자기 유도: 자석을 움직이면?', short: '전자기 유도', icon: '🧲', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 전지도 없이 코일과 자석만으로 어떻게 전기를 만들 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 전류가 흐르는 코일은 자석(전자석)이 되고, 전동기는 <b>전기 에너지를 운동 에너지로</b> 바꾼다고 배웠어요. 이번에는 거꾸로 <b>자석을 움직여 전류</b>를 만들 수 있는지 알아봐요.</div>' +
        '<p>코일에 <b>검류계</b>(작은 전류를 재는 장치)를 연결하고, 막대자석을 넣고 빼면서 바늘이 언제 움직이는지 관찰해요. 이렇게 코일에 생기는 전류를 <b>유도 전류</b>라고 해요.</p>',
      features: ['obs'],
      setup() { S.xm = XMIN; S.pol = 1; cancelMotion(); S.seen = {}; S.stillT = 0; S.hist.length = 0; setScene('obs'); },
      recap: '코일을 지나는 자기장의 세기가 변할 때만 유도 전류가 생겨요. 자석이 정지해 있으면 전류가 없고, 가까워질 때와 멀어질 때 방향이 반대예요.',
      summary: '<ul><li>코일에 자석을 가까이 하거나 멀리 하면 검류계 바늘이 움직여요 → <b>유도 전류</b></li><li>가까이 → 한쪽(+), 멀리 → 반대쪽(−). <b>자석의 극을 반대로</b> 하면 방향도 반대예요.</li><li>자석이 코일 속에 <b>정지</b>해 있으면 전류가 없어요.</li><li>이렇게 <b>코일을 지나는 자기장의 세기가 변할 때</b> 코일에 전류가 유도되는 현상을 <b>전자기 유도</b>라고 해요.</li></ul>',
      missions: [
        {
          title: '네 가지 동작 해 보기',
          goal: '자석의 N극으로 <b>넣기 · 빼기</b>, 코일 속에서 <b>1초 이상 멈추기</b>, 극을 바꿔 <b>S극으로 넣기</b>를 해 보세요.',
          hint: '자석을 끌거나 ▶ 넣기 · ◀ 빼기 버튼을 써요. 극 바꾸기는 자석을 코일 밖으로 뺀 뒤에 할 수 있어요. 손으로 끌 때는 조금 빠르게 움직여야 바늘이 뚜렷이 움직여요.',
          setup() { S.seen = {}; S.stillT = 0; setScene('obs'); },
          check: () => S.seen.inN && S.seen.outN && S.seen.still && S.seen.inS,
          hold: 0.5,
          status: () => mark(S.seen.inN) + ' N극 넣기 &nbsp; ' + mark(S.seen.outN) + ' 빼기 &nbsp; ' + mark(S.seen.still) + ' 코일 속에서 멈추기 &nbsp; ' + mark(S.seen.inS) + ' S극 넣기',
          explain: 'N극을 넣으면 바늘이 <b>+</b>쪽, 빼면 <b>−</b>쪽으로 움직이고, 코일 속에서 멈추면 <b>0</b>이에요. S극을 넣으면 N극을 넣을 때와 <b>반대(−)</b>쪽으로 움직여요. 자석이 움직이는 동안에만 전류가 생겨요.',
        },
        {
          type: 'quiz', title: '자석이 멈추면 왜 전류가 없을까?',
          goal: '자석이 코일 속에 가만히 멈춰 있을 때 유도 전류가 흐르지 않는 까닭은?',
          setup() { setScene('obs'); },
          choices: ['코일 속에 자기장이 없어져서', '코일을 지나는 자기장의 세기가 변하지 않아서', '자석이 코일에 닿아 있지 않아서', '검류계가 고장 나서'],
          answer: 1,
          feedback: ['자석이 멈춰도 자기장은 코일 속에 그대로 있어요. 오른쪽 아래의 자기장 막대를 보세요.', '', '자석은 코일 속에 들어와 있어요. 자석이 코일에 닿는지는 중요하지 않아요.', '자석을 움직이면 바늘이 움직였죠? 검류계는 정상이에요.'],
          explain: '자석이 멈추면 <b>코일을 지나는 자기장의 세기가 변하지 않아</b> 전류가 생기지 않아요. 자기장이 <b>있다</b>고 전류가 생기는 것이 아니라, 자기장이 <b>변할 때</b> 전류가 생겨요.',
        },
      ],
    },
    {
      title: '세기 요인: 유도 전류를 크게 하려면?', short: '세기 요인', icon: '📊', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 자석이 움직일 때만 유도 전류가 생기는 것을 봤어요. 그렇다면 <b>유도 전류의 크기</b>는 무엇에 따라 달라질까요?</div>' +
        '<p>자석의 <b>속도</b>, 자석의 <b>수(세기)</b>, 코일의 <b>감은 수</b> 중 <b>한 번에 하나만</b> 바꾸고 나머지는 같게 해서 검류계의 최대 눈금을 기록해요. 이렇게 하는 실험을 <b>변인 통제</b>라고 해요.</div>',
      features: ['lab'],
      setup() { S.xm = XMIN; S.pol = 1; cancelMotion(); S.rows = []; S.cfg = { sp: 1, mg: 1, tn: 100 }; S.showRule = false; resetRule(); setScene('lab'); },
      recap: '자석이 빠르게 움직일수록, 자석이 셀수록, 코일을 많이 감을수록 유도 전류가 커져요. 자기장이 변하는 정도가 클수록 유도 전류가 커요.',
      summary: '<ul><li>기본(보통 속도 · 자석 1개 · 100회): 최대 눈금 <b>5칸</b></li><li>자석 속도 2배: <b>10칸</b> · 자석 2개: <b>10칸</b> · 코일 200회: <b>10칸</b> · 코일 50회: <b>2.5칸</b></li><li>자석이 <b>빠를수록</b>, 자석이 <b>셀수록</b>, 코일을 <b>많이 감을수록</b> 유도 전류가 커요.</li><li>한 번에 <b>하나의 변인만</b> 바꾸어야 그 변인의 영향을 알 수 있어요.</li></ul>',
      missions: [
        {
          title: '세 가지 요인 실험해 기록하기',
          goal: '먼저 <b>기본 조건</b>을 측정한 뒤, <b>속도 · 자석 수 · 코일 감은 수</b>를 각각 하나씩만 바꾸어 측정하세요.',
          hint: '기본(보통 · 1개 · 100회)을 먼저 측정해요. 그 다음 속도만 2배, 자석만 2개, 감은 수만 50회나 200회로 바꾸고 📏 측정하기를 눌러요.',
          setup() { S.showRule = false; setScene('lab'); updateCtl(); },
          check: () => hasBase() && rowHas(onlySp) && rowHas(onlyMg) && rowHas(onlyTn),
          hold: 0.6,
          status: () => mark(hasBase()) + ' 기본 &nbsp; ' + mark(rowHas(onlySp)) + ' 속도 &nbsp; ' + mark(rowHas(onlyMg)) + ' 자석 수 &nbsp; ' + mark(rowHas(onlyTn)) + ' 감은 수',
          explain: '기본 조건에서 <b>5.0칸</b>이에요. 속도 2배는 <b>10.0칸</b>, 자석 2개는 <b>10.0칸</b>, 코일 200회는 <b>10.0칸</b>, 50회는 <b>2.5칸</b>으로 기록돼요. 세 요인 모두 값이 커질수록 유도 전류도 커져요.',
        },
        {
          title: '규칙 문장 완성하기', manual: true,
          goal: '기록표를 보고 네 문장의 빈칸을 골라 <b>규칙</b>을 완성한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '기본 5.0칸보다 큰지 작은지 기록표에서 확인하세요. 50회는 기본(100회)보다 어떻게 되었나요?',
          setup() { S.showRule = true; resetRule(); setScene('lab'); updateCtl(); },
          check() {
            const miss = RULES.filter((r, i) => !S.rule[i]);
            if (miss.length) return '아직 고르지 않은 문장이 ' + miss.length + '개 있어요.';
            let bad = 0;
            RULES.forEach((r, i) => {
              const ok = +S.rule[i] === r[1];
              if (!ok) bad++;
              if (!ok && S.ruleOK[i] !== false) { ruleSel[i].classList.remove('ok', 'bad'); void ruleSel[i].offsetWidth; ruleSel[i].classList.add('bad'); }
              if (ok) { ruleSel[i].classList.remove('bad'); ruleSel[i].classList.add('ok'); }
              S.ruleOK[i] = ok;
            });
            if (bad) return '빨간 칸을 다시 골라 보세요. 기록표에서 기본(5.0칸)과 비교해 보세요.';
            return true;
          },
          status: () => '고른 문장 ' + RULES.filter((r, i) => S.rule[i]).length + ' / ' + RULES.length,
          explain: '속도 2배 · 자석 2개 · 200회는 모두 <b>10.0칸</b>으로 기본(5.0칸)보다 <b>커져요</b>. 50회는 <b>2.5칸</b>으로 <b>작아져요</b>. 코일을 지나는 자기장이 <b>빠르게, 크게</b> 변할수록 유도 전류가 커요.',
        },
        {
          type: 'quiz', title: '한 번에 하나만 바꾸는 까닭',
          goal: '속도와 자석 수를 <b>동시에</b> 바꾸어 측정하면 안 되는 까닭은?',
          setup() { S.showRule = false; setScene('lab'); updateCtl(); },
          choices: ['실험 시간이 너무 길어져서', '눈금이 달라진 까닭이 어느 요인 때문인지 알 수 없어서', '검류계가 고장 나서', '코일이 너무 뜨거워져서'],
          answer: 1,
          feedback: ['시간 때문이 아니에요. 결과를 해석할 수 있는지가 중요해요.', '', '검류계는 고장 나지 않아요.', '이 실험에서는 코일이 뜨거워지지 않아요.'],
          explain: '두 가지를 동시에 바꾸면 눈금이 변해도 <b>어느 요인 때문인지</b> 알 수 없어요. 그래서 한 번에 <b>하나의 변인만</b> 바꾸고 나머지는 같게 하는 <b>변인 통제</b>가 필요해요.',
        },
      ],
    },
    {
      title: '간이 발전기: 자석을 돌려 LED 켜기', short: '간이 발전기', icon: '⚙️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 자기장이 빠르게, 크게 변할수록 유도 전류가 커진다는 것을 알았어요. 자석을 코일 옆에서 <b>계속 돌리면</b> 자기장이 계속 변하겠죠?</div>' +
        '<p>손잡이를 돌려 자석을 회전시키는 <b>간이 발전기</b>예요. 코일에 LED 두 개를 서로 <b>반대 방향</b>으로 연결했어요. 돌리는 속도와 코일, 자석을 바꿔 보며 LED가 켜지는 모습을 관찰해요.</p>',
      features: ['gen'],
      setup() { S.gen.ft = 2; S.gen.f = 0; S.gen.tn = 100; S.gen.mg = 1; S.gen.hist.length = 0; setScene('gen'); },
      recap: '자석이 돌면 코일을 지나는 자기장이 계속 변해 전류의 방향이 번갈아 바뀌어요(교류). 빠르게 돌릴수록 전압이 크고 LED가 밝아요.',
      summary: '<ul><li>자석을 코일 옆에서 돌리면 자기장이 계속 변해 유도 전류가 생기고, <b>방향이 번갈아 바뀌어요</b> (교류).</li><li>LED는 한쪽 방향으로만 전류가 흘러서 서로 반대로 연결한 두 LED가 <b>번갈아</b> 켜져요.</li><li>유도 전압이 <b>LED가 켜지는 전압(1.0)</b>보다 커야 LED가 켜져요.</li><li><b>빠르게</b> 돌릴수록, 코일을 <b>많이 감을수록</b>, <b>자석이 셀수록</b> 전압이 커지고 밝아요.</li></ul>',
      missions: [
        {
          title: 'LED 켜기',
          goal: '손잡이를 돌려 <b>LED 중 하나 이상</b>을 켜 보세요. 처음에는 두 LED 모두 꺼져 있어요.',
          hint: '돌리는 속도를 올려요. 유도 전압의 최댓값이 LED가 켜지는 전압(1.0)을 넘어야 해요.',
          setup() { S.gen.ft = 0.5; S.gen.f = 0; S.gen.tn = 100; S.gen.mg = 1; setScene('gen'); updateCtl(); },
          check: () => ledPct(S.gen) > 0,
          hold: 0.8,
          status: () => 'LED 최대 밝기 ' + ledPct(S.gen) + ' % ' + (ledPct(S.gen) > 0 ? '✅' : '⬜'),
          explain: '최대 전압(= 0.8 × 회전수 × 감은 수/100 × 자석 수)이 <b>1.0</b>보다 커지면 LED가 켜져요. 예) 100회 · 자석 1개에서는 회전수가 <b>1.25 회/초</b>보다 커야 해요.',
        },
        {
          title: '가장 밝게 만들기',
          goal: 'LED의 <b>최대 밝기를 100 %</b>로 만드세요. 속도, 코일 감은 수, 자석 수를 조절해요.',
          hint: '속도를 최대로 올리고, 코일을 200회로 하거나 자석을 2개로 해 보세요. 한 가지만 더해도 100 %가 될 수 있어요.',
          setup() { S.gen.ft = 2; S.gen.tn = 100; S.gen.mg = 1; setScene('gen'); updateCtl(); },
          check: () => ledPct(S.gen) >= 100,
          hold: 0.8,
          status: () => 'LED 최대 밝기 ' + ledPct(S.gen) + ' % ' + (ledPct(S.gen) >= 100 ? '✅' : '⬜') + ' &nbsp; (속도 ' + S.gen.f.toFixed(1) + ' · ' + S.gen.tn + '회 · 자석 ' + S.gen.mg + '개)',
          explain: '최대 전압이 <b>6.4</b> 이상이면 최대 밝기(100 %)예요. 4 회/초에서 코일 200회(또는 자석 2개)이면 0.8 × 4 × 2 = <b>6.4</b>가 되어요. 자기장이 가장 빠르게 변하는 조건이 가장 밝아요.',
        },
        {
          type: 'quiz', title: '전류가 번갈아 흐르는 까닭',
          goal: '간이 발전기에서 두 LED가 <b>번갈아</b> 켜지는 까닭은?',
          setup() { setScene('gen'); },
          choices: ['자석이 돌면서 코일을 지나는 자기장이 커졌다 작아졌다 하여 전류의 방향이 번갈아 바뀌어서', '두 LED의 밝기가 원래 달라서', '코일의 감은 수가 계속 바뀌어서', '손잡이를 돌릴 때 전지가 연결되어서'],
          answer: 0,
          feedback: ['', 'LED는 같은 종류예요. 방향이 반대로 연결되어 있을 뿐이에요.', '감은 수는 변하지 않아요.', '이 장치에는 전지가 없어요. 자석의 회전만으로 전류가 만들어져요.'],
          explain: '자석이 반 바퀴 돌 때마다 코일을 지나는 자기장의 <b>증가와 감소</b>가 바뀌어 전류의 방향이 바뀌어요(<b>교류</b>). LED는 한 방향으로만 전류가 흘러서 반대로 연결한 두 LED가 번갈아 켜져요.',
        },
      ],
    },
    {
      title: '에너지 전환: 발전기는 무엇을 바꿀까?', short: '에너지 전환', icon: '🔋', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 자석을 돌리기만 해도 전기가 만들어졌어요. 실제 발전소에서는 <b>손 대신 무엇이 자석(또는 코일)을 돌릴까요?</b></div>' +
        '<p>물, 바람, 수증기가 <b>터빈(날개바퀴)</b>을 돌리고, 그 회전으로 발전기 속 자석이 돌아요. 세 장면에서 에너지가 어떻게 바뀌는지 살펴봐요.</p>',
      features: ['conv'],
      setup() { S.cv.kind = 'water'; S.cv.sup = 0.5; S.cv.w = 0; S.cv.done = {}; S.cv.parts.length = 0; setScene('conv'); },
      recap: '발전기는 터빈의 운동 에너지를 전기 에너지로 바꿔요. 전기를 새로 만들어 내는 것이 아니라 에너지의 형태를 바꾸는 장치예요.',
      summary: '<ul><li><b>발전기</b>: 터빈이 자석(또는 코일)을 돌려 <b>운동 에너지를 전기 에너지로 전환</b>해요.</li><li>터빈을 돌리는 것: 흐르는 <b>물</b>(수력), 부는 <b>바람</b>(풍력), 뜨거운 <b>수증기</b>(화력·원자력 등).</li><li>에너지는 새로 생기는 것이 아니라 한 형태에서 다른 형태로 <b>전환</b>돼요.</li><li><b>전동기</b>: 전기 → 운동, <b>발전기</b>: 운동 → 전기 (서로 거꾸로)</li></ul>',
      missions: [
        {
          title: '세 가지 발전 장면 켜 보기',
          goal: '<b>물 · 바람 · 수증기</b> 세 장면에서 각각 전구 밝기를 <b>50 % 이상</b>으로 켜 보세요.',
          hint: '장면을 바꾸고 공급량 슬라이더를 50 % 이상으로 올려요. 전구 밝기가 올라갈 때까지 잠시 기다려요.',
          setup() { S.cv.done = {}; setScene('conv'); },
          check: () => S.cv.done.water && S.cv.done.wind && S.cv.done.steam,
          hold: 0.4,
          status: () => mark(S.cv.done.water) + ' 물 &nbsp; ' + mark(S.cv.done.wind) + ' 바람 &nbsp; ' + mark(S.cv.done.steam) + ' 수증기',
          explain: '물, 바람, 수증기가 터빈을 돌리면 발전기 속 자석이 돌아 <b>전구에 불이 들어와요</b>. 공급량을 늘리면 터빈이 빨리 돌고, 자기장이 빨리 변해 전기가 더 많이 만들어져요.',
        },
        {
          type: 'quiz', title: '발전기는 전기를 만드는 장치일까?',
          goal: '“발전기는 에너지를 새로 만들어 낸다”는 설명을 고쳐 쓴 것으로 옳은 것은?',
          setup() { setScene('conv'); },
          choices: ['발전기는 터빈의 운동 에너지를 전기 에너지로 바꾸는 장치이다', '발전기는 아무것도 넣지 않아도 전기를 만든다', '발전기는 전기 에너지를 운동 에너지로 바꾸는 장치이다', '발전기는 열에너지를 빛에너지로만 바꾼다'],
          answer: 0,
          feedback: ['', '공급량을 0 %로 하면 전구가 꺼져요. 에너지를 넣어 주어야 해요.', '그것은 전동기예요. 발전기는 반대 방향의 전환이에요.', '발전기는 터빈의 운동 에너지를 전기 에너지로 바꿔요.'],
          explain: '발전기는 에너지를 <b>새로 만드는</b> 것이 아니라 <b>운동 에너지를 전기 에너지로 전환</b>해요. 공급량이 0이면 터빈이 멈추고 전구도 꺼지죠.',
        },
        {
          type: 'quiz', title: '전동기와 발전기',
          goal: '중학교에서 배운 <b>전동기</b>와 이번에 배운 <b>발전기</b>를 바르게 비교한 것은?',
          setup() { setScene('conv'); },
          choices: ['전동기: 운동 → 전기, 발전기: 전기 → 운동', '전동기: 전기 → 운동, 발전기: 운동 → 전기', '둘 다 전기 → 운동', '둘 다 운동 → 전기'],
          answer: 1,
          feedback: ['서로 바뀌었어요. 전동기는 전지를 연결하면 도는 장치였어요.', '', '발전기는 전기를 만드는 쪽이에요.', '전동기는 전기를 써서 돌아가는 장치예요.'],
          explain: '<b>전동기</b>는 자기장 속의 코일에 전류를 흘려 <b>전기 에너지를 운동 에너지</b>로, <b>발전기</b>는 자기장 속에서 코일(또는 자석)을 돌려 <b>운동 에너지를 전기 에너지</b>로 바꿔요. 서로 거꾸로인 전환이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-induction', mount: '#game', badge: '전자기 유도 박사', homeHref: '../../index.html#h1b',
    featureLabels: { obs: '🧲 막대자석 · 코일 · 검류계', lab: '📊 속도 · 자석 수 · 감은 수 실험표', gen: '⚙️ 손잡이로 돌리는 간이 발전기 · LED', conv: '🔋 수력 · 풍력 · 증기 터빈 발전' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  S.cv.kind = 'water';
  setScene('obs');
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    if (S.mode === 'obs' || S.mode === 'lab') { stepMagnet(dt); drawCoilScene(dt); }
    else if (S.mode === 'gen') { stepGen(dt); drawGenScene(dt); }
    else { stepConv(dt); drawConvScene(dt); }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, XMIN, XMAX, XC, YC, LM, V0, get game() { return game; }, setScene, startAuto, flipPole, measure, genAmp, ledPct, tipS, readingOf, ruleSel, RULES,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; if (S.mode === 'obs' || S.mode === 'lab') stepMagnet(0.02); else if (S.mode === 'gen') stepGen(0.02); else stepConv(0.02); } },
  };
})();
