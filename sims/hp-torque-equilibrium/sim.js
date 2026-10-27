/* =========================================================
   물리학 Ⅰ. 힘과 에너지 - 돌림힘과 평형 (단원 1차시)
   성취기준 [12물리01-01] 물체에 작용하는 알짜힘과 돌림힘이 0일 때 평형을 이룸을 알고, 다양한 구조물의 안정성을 분석할 수 있다.
   ① 관찰: 돌림힘 (스패너, τ = F × 수직 거리)
   ② 실험: 회전 평형 (시소, 시계·반시계 돌림힘의 합)
   ③ 탐구: 두 조건 (우력, 널빤지 다리 - 알짜힘 = 0, 돌림힘의 합 = 0)
   ④ 적용: 안정성 (기울어지는 직육면체, 크레인, 책장 적재)
   기준점(회전축)은 항상 1개만 잡아요. 가속하는 회전·관성 모멘트는 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 620 : 560;
  const SH = PHONE ? 312 : 300;                         // 장면(위쪽) 높이
  const PX = 10, PY = SH + 6, PW = VW - 20, PH = VH - SH - 16;   // 아래쪽 자료 패널
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const G = 10;                                          // N/kg
  const nf = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const deg = (r) => r * 180 / Math.PI;

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef2fa' });
  const ctx = view.ctx;
  if (PHONE) view.canvas.style.touchAction = 'pan-y';
  const D = SciSim.draw(ctx);
  /* 캔버스 글자는 가상 좌표에서 13px 이상으로 */
  const _dtext = D.text, _dlabel = D.label;
  D.text = (x, y, str, o) => _dtext(x, y, str, Object.assign({}, o, { size: Math.max(13, (o && o.size) || 14) }));
  D.label = (x, y, str, o) => _dlabel(x, y, str, Object.assign({}, o, { size: Math.max(13, (o && o.size) || 13) }));
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    size = Math.max(13, size);
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
    size = Math.max(13, size);
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, 'left', weight || 700)); return ls.length * lh;
  }
  function bgFill(top, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, SH); g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, SH);
    ctx.fillStyle = '#e4eaf5'; ctx.fillRect(0, SH, VW, VH - SH);
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  /* 회전 방향 화살표 호: a0에서 a1까지 (캔버스 각도, 시계 방향 +). ccw=true이면 시각적으로 반시계 방향으로 그려요 */
  function arcArrow(cx, cy, r, a0, a1, ccw, color, width) {
    ctx.save(); ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = width || 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1, !!ccw); ctx.stroke();
    const ex = cx + r * Math.cos(a1), ey = cy + r * Math.sin(a1);
    const dx = ccw ? Math.sin(a1) : -Math.sin(a1), dy = ccw ? -Math.cos(a1) : Math.cos(a1);
    const h = 11 + (width || 5), nx = -dy, ny = dx;
    ctx.beginPath(); ctx.moveTo(ex + dx * h, ey + dy * h); ctx.lineTo(ex - dx * h * 0.1 + nx * h * 0.6, ey - dy * h * 0.1 + ny * h * 0.6); ctx.lineTo(ex - dx * h * 0.1 - nx * h * 0.6, ey - dy * h * 0.1 - ny * h * 0.6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function bar(x, y, w, h, val, max, color, track) {
    D.roundRect(x, y, w, h, Math.min(8, h / 2)); ctx.fillStyle = track || '#eef1f7'; ctx.fill();
    const fw = w * clamp(val / max, 0, 1);
    if (fw > 0.5) { ctx.save(); D.roundRect(x, y, w, h, Math.min(8, h / 2)); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x, y, fw, h); ctx.restore(); }
  }
  const approach = (a, b, dt, k) => SciSim.approach(a, b, dt, k);

  /* ---------- 상태 ---------- */
  const S = { mode: 'spanner', clock: 0, fade: 0, sp: null, ss: null, cp: null, pl: null, tl: null, cr: null, ld: null, ruleOK: {}, rule: {} };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  /* 장면이 바뀌면 진행 중이던 동작은 끝난 상태로 정리해서, 중간 상태가 남지 않게 해요 */
  function settleScenes() {
    const s = S.sp;
    if (s && s.st === 'turn') spComplete(false);
    else if (s && s.st === 'back') { s.st = 'idle'; s.ang = 0; }
    cpFinish(false);
    [S.tl, S.ld].forEach((t) => { if (t && t.st === 'fall') { t.st = 'down'; t.ang = Math.PI / 2; } });
    if (S.ss) S.ss.drag = null;
    if (S.pl) S.pl.drag = false;
  }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); settleScenes(); }
    S.mode = mode;
    updateCtl();
  }
  let showRule = false;
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-rule')) on = showRule;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const sp = S.sp;
    if (sp) {
      $('#oF').textContent = sp.F + ' N';
      const sl = $('#sF'); if (+sl.value !== sp.F) sl.value = sp.F; sl.style.setProperty('--pct', ((sp.F - 10) / 90 * 100) + '%');
      $$('#rSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.r === sp.r));
      $$('#thSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.th === sp.th));
      $('#bSpRun').textContent = sp.loose ? '🔩 다시 조이기' : '🔧 돌려 보기';
      $('#bSpRun').disabled = sp.st !== 'idle';
    }
    const ss = S.ss;
    if (ss) { $$('#mASeg button').forEach((b) => b.classList.toggle('on', +b.dataset.m === ss.mA)); $$('#mBSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.m === ss.mB)); }
    const cp = S.cp;
    if (cp) {
      [['sFL', 'oFL', 0], ['sFC', 'oFC', 1], ['sFR', 'oFR', 2]].forEach((a) => {
        const sl = $('#' + a[0]); if (+sl.value !== cp.f[a[2]]) sl.value = cp.f[a[2]];
        sl.style.setProperty('--pct', ((cp.f[a[2]] + 20) / 40 * 100) + '%');
        const v = cp.f[a[2]]; $('#' + a[1]).textContent = (v > 0 ? '↑ ' : v < 0 ? '↓ ' : '') + Math.abs(v) + ' N';
      });
      $('#bCpRun').disabled = !!(cp.run && cp.run.st === 'run');
    }
    const pl = S.pl;
    if (pl) {
      $('#oLoad').textContent = pl.x.toFixed(1) + ' m';
      const sl = $('#sLoad'); if (+sl.value !== pl.x) sl.value = pl.x; sl.style.setProperty('--pct', (pl.x / 6 * 100) + '%');
      $$('#refSeg button').forEach((b) => b.classList.toggle('on', b.dataset.ref === pl.ref));
    }
    const tl = S.tl;
    if (tl) {
      $$('#tWSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.w === tl.w));
      $$('#tHSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.h === tl.h));
      $('#oTilt').textContent = tl.deg + '°';
      const sl = $('#sTilt'); if (+sl.value !== tl.deg) sl.value = tl.deg; sl.style.setProperty('--pct', (tl.deg / 60 * 100) + '%');
    }
    const cr = S.cr;
    if (cr) {
      $$('#cWSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.wl === cr.wl));
      $$('#cDSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.dl === cr.dl));
      $('#oCw').textContent = cr.dc.toFixed(1) + ' m';
      const sl = $('#sCw'); if (+sl.value !== cr.dc) sl.value = cr.dc; sl.style.setProperty('--pct', ((cr.dc - 0.5) / 5.5 * 100) + '%');
    }
    const ld = S.ld;
    if (ld) {
      $$('#lPosSeg button').forEach((b) => b.classList.toggle('on', b.dataset.pos === ld.pos));
      $('#oLTilt').textContent = ld.deg + '°';
      const sl = $('#sLTilt'); if (+sl.value !== ld.deg) sl.value = ld.deg; sl.style.setProperty('--pct', (ld.deg / 40 * 100) + '%');
    }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ================= ① 스패너: 돌림힘 τ = F × ℓ ================= */
  const NEED = 12;                                  // 볼트가 풀리는 돌림힘 (N·m)
  const R_MAX = 0.4;                                // 손잡이에서 가장 먼 위치 (m)
  const F_LOOSE = Math.round(NEED / R_MAX);          // 풀 수 있는 가장 작은 힘 (N) = 30
  const SINT = { 0: 0, 30: 0.5, 90: 1 };
  const spTau = (s) => Math.round(s.F * s.r * SINT[s.th] * 10) / 10;
  const spEll = (s) => Math.round(s.r * SINT[s.th] * 100) / 100;
  const SPO = { x: PHONE ? 96 : 176, y: PHONE ? 190 : 186 }, SPPM = PHONE ? 560 : 780;
  const BOLT_TURN = 1.05;                           // 볼트가 한 번에 돌아가는 각 (rad, 약 60°)
  function resetSpanner(fresh) {   // fresh: 힘·위치·방향도 처음 값(50 N, 0.2 m, 90°)으로
    const p = fresh ? null : S.sp;
    S.sp = { F: p ? p.F : 50, r: p ? p.r : 0.2, th: p ? p.th : 90, st: 'idle', t: 0, ang: 0, bolt: 0, lift: 0, loose: false, freed: null, run: null, fail: null, seen8: false, seen0: false, log: [] };
    updateCtl();
  }
  function spSet(k, v) { const s = S.sp; if (s[k] === v) return; s[k] = v; if (s.st === 'idle') s.fail = null; updateCtl(); }
  function spRun() {
    const s = S.sp; if (s.st !== 'idle') return;
    Sound.click();
    if (s.loose) { s.loose = false; s.freed = null; s.bolt = 0; s.fail = null; updateCtl(); return; }
    const tau = spTau(s);
    s.run = { F: s.F, r: s.r, th: s.th, tau, ok: tau >= NEED };
    s.st = 'turn'; s.t = 0; s.fail = null; updateCtl();
  }
  function spComplete(fx) {   // 돌려 보기가 끝났을 때 (fx: 소리·효과를 낼지)
    const s = S.sp;
    s.log.push({ F: s.run.F, r: s.run.r, th: s.run.th, tau: s.run.tau, ok: s.run.ok }); if (s.log.length > 3) s.log.shift();
    if (s.run.ok) {
      s.st = fx ? 'back' : 'idle'; s.t = 0; s.loose = true; s.freed = { F: s.run.F, r: s.run.r, th: s.run.th, tau: s.run.tau }; s.bolt = BOLT_TURN; if (!fx) s.ang = 0;
      if (fx) { Sound.success(); parts.burst(SPO.x, SPO.y - 10, { count: 16, speed: 150, size: 3.2, colors: ['#14a058', '#ffd447', '#fff'], gravity: 120, life: 0.8 }); }
    } else { s.st = 'idle'; s.ang = 0; s.fail = { tau: s.run.tau }; if (fx) Sound.fail(); }
    updateCtl();
  }
  function stepSpanner(dt) {
    const s = S.sp, tau = spTau(s);
    if (tau === 8) s.seen8 = true;
    if (s.F > 0 && tau === 0) s.seen0 = true;
    s.lift = approach(s.lift, s.loose ? 1 : 0, dt, 8);
    if (s.st === 'turn') {
      s.t += dt / (RM ? 0.2 : 1.0);
      const p = Math.min(1, s.t);
      if (s.run.ok) { s.ang = SciSim.ease.inOutQuad(p) * BOLT_TURN; s.bolt = s.ang; }
      else s.ang = Math.sin(Math.PI * p) * 0.07;
      if (p >= 1) spComplete(true);
    } else if (s.st === 'back') {
      s.t += dt / (RM ? 0.1 : 0.4);
      s.ang = BOLT_TURN * (1 - SciSim.ease.inOutQuad(Math.min(1, s.t)));
      if (s.t >= 1) { s.st = 'idle'; s.ang = 0; updateCtl(); }
    }
  }
  function drawHex(x, y, r, rot, fill, stroke) {
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = rot + i * TAU / 6; ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
  }
  function drawSpannerScene(dt) {
    const s = S.sp, O = SPO, P = SPPM;
    const run = s.st === 'idle' ? null : s.run;
    const F = run ? run.F : s.F, r = run ? run.r : s.r, th = run ? run.th : s.th;
    const tau = run ? run.tau : spTau(s), ell = Math.round(r * SINT[th] * 100) / 100;
    bgFill('#e9f0fb', '#f6f9fe');
    // 작업대 (위에서 본 모습)
    D.roundRect(10, 40, VW - 20, SH - 50, 18); ctx.fillStyle = '#dfe6f1'; ctx.fill();
    T(16, 28, '🔧 스패너로 볼트 풀기 (위에서 본 모습)', PHONE ? 14.5 : 17, '#26324a', 'left', 800);
    // 반시계 방향 호 (돌림힘의 크기에 비례)
    const sweep = clamp(tau / 40 * 4.6, 0, 4.6);
    if (tau > 0 && s.st !== 'back') arcArrow(O.x, O.y, 58, -0.45, -0.45 - sweep, true, tau >= NEED ? '#14a058' : '#f26b3a', 5);
    const lift = s.lift;
    // 스패너
    ctx.save(); ctx.translate(O.x, O.y); ctx.rotate(-s.ang);
    D.shadow(() => {
      D.roundRect(10, -11, 0.46 * P, 22, 11); const g = ctx.createLinearGradient(0, -11, 0, 11); g.addColorStop(0, '#d5dbe6'); g.addColorStop(1, '#8c97aa'); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fillStyle = g; ctx.fill();
    }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#6b7689'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.stroke(); D.roundRect(10, -11, 0.46 * P, 22, 11); ctx.stroke();
    drawHex(0, 0, 24, 0, '#6b7689', '#4b5566'); ctx.fillStyle = '#4b5566'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();
    // r 눈금
    [0.1, 0.2, 0.3, 0.4].forEach((m) => { const mx = m * P; ctx.strokeStyle = m === r ? '#e2552a' : 'rgba(40,50,70,.55)'; ctx.lineWidth = m === r ? 3 : 1.6; ctx.beginPath(); ctx.moveTo(mx, -11); ctx.lineTo(mx, -4); ctx.stroke(); });
    ctx.restore();
    // 볼트 (스패너 입구 안쪽에 보여요)
    D.shadow(() => { drawHex(O.x, O.y - lift * 3, 20, -s.bolt, '#b9c2d0', '#7a869a'); }, { blur: 6 + lift * 8, y: 2 + lift * 5 });
    ctx.fillStyle = '#8f9bb0'; ctx.beginPath(); ctx.arc(O.x, O.y - lift * 3, 9, 0, TAU); ctx.fill();
    if (!s.loose) { ctx.fillStyle = 'rgba(194,98,40,.55)'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(O.x + 15 * Math.cos(i * 0.9 + 0.3 - s.bolt), O.y + 15 * Math.sin(i * 0.9 + 0.3 - s.bolt), 2.6, 0, TAU); ctx.fill(); } }
    [0.1, 0.2, 0.3, 0.4].forEach((m) => T(O.x + m * P, O.y + 29, m.toFixed(1), 12.5, '#3a465c', 'center', 800));
    T(O.x + 0.46 * P + 6, O.y + 29, 'm', 12.5, '#3a465c', 'left', 800);
    // 힘 · 수직 거리 (돌리는 동안에는 숨김)
    if (s.st === 'idle') {
      const u = { x: Math.cos(th * Math.PI / 180), y: -Math.sin(th * Math.PI / 180) };
      const Pp = { x: O.x + r * P, y: O.y };
      const len = 26 + F * (PHONE ? 0.62 : 0.78);
      // 작용선
      const foot = r * P * u.x;            // P에서 거꾸로 간 거리
      const Q = { x: Pp.x - u.x * foot, y: Pp.y - u.y * foot };
      D.dashedLine(Q.x - u.x * 34, Q.y - u.y * 34, Pp.x + u.x * (len + 18), Pp.y + u.y * (len + 18), { color: 'rgba(124,92,255,.65)', width: 1.8, dash: [5, 5] });
      if (ell > 0) {
        D.dashedLine(O.x, O.y, Q.x, Q.y, { color: '#7c5cff', width: 2.4, dash: [4, 3] });
        const sgx = Math.sign(Q.x - O.x) || 1, sgy = Math.sign(Q.y - O.y) || -1;
        ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 1.6; ctx.strokeRect(Math.min(Q.x, Q.x - sgx * 9), Math.min(Q.y, Q.y - sgy * 9), 9, 9);
        D.label((O.x + Q.x) / 2 + (th === 90 ? -2 : 0), (O.y + Q.y) / 2 + (th === 90 ? 0 : -14), 'ℓ = ' + ell.toFixed(2) + ' m', { bg: '#7c5cff', size: PHONE ? 12 : 13 });
      } else T(O.x, O.y - 70, '작용선이 볼트 중심을 지나요 → ℓ = 0', PHONE ? 12 : 13.5, '#7c5cff', 'center', 800);
      D.arrow(Pp.x, Pp.y, Pp.x + u.x * len, Pp.y + u.y * len, { color: '#e2464b', width: 5.5, label: F + ' N', labelOffset: th === 0 ? -22 : 20 });
      // 손
      D.sphere(Pp.x, Pp.y, 11, '#f3cfa8', { shadow: true, outline: '#c9966b', gloss: true });
    }
    // 상태 카드
    const cw = PHONE ? 150 : 205, cx = VW - cw - 18, cy = 54;
    panel(cx, cy, cw, PHONE ? 76 : 96, 14);
    T(cx + 12, cy + 24, '🔩 녹슨 볼트', PHONE ? 13.5 : 15.5, '#26324a', 'left', 800);
    T(cx + 12, cy + 46, '풀리는 돌림힘 ' + NEED + ' N·m', PHONE ? 12.5 : 14, '#5a6679', 'left', 800);
    const okNow = tau >= NEED;
    T(cx + 12, cy + 68, s.loose ? '✅ 풀렸어요!' : s.fail ? '❌ ' + s.fail.tau.toFixed(1) + ' < ' + NEED + ' 꿈쩍 안 해요' : (okNow ? 'τ ' + tau.toFixed(1) + ' ≥ ' + NEED + ' → 풀려요' : 'τ ' + tau.toFixed(1) + ' < ' + NEED + ' → 안 풀려요'), PHONE ? 12.5 : 14, s.loose || (okNow && !s.fail) ? '#0b6b39' : '#c0392b', 'left', 800);
    T(16, SH - 18, '손(✋)을 끌어서 위치를 바꿀 수도 있어요', PHONE ? 12 : 13, '#5a6679', 'left', 700);
    drawSpannerPanel(tau, ell, F);
    parts.update(dt); parts.draw(ctx);
  }
  function drawSpannerPanel(tau, ell, F) {
    panel(PX, PY, PW, PH, 16);
    const bx = PX + 20, bw = PW - 40;
    T(bx, PY + 30, '🧮 돌림힘 τ = 힘 F × 수직 거리 ℓ', PHONE ? 14.5 : 16, '#26324a', 'left', 800);
    T(bx, PY + 58, 'τ = ' + F + ' N × ' + ell.toFixed(2) + ' m = ' + tau.toFixed(1) + ' N·m', PHONE ? 17 : 22, '#c2410c', 'left', 800);
    T(bx, PY + 82, PHONE ? '계기 (N·m)' : '계기 (N·m) · 반시계 방향 +', 13, '#5a6679', 'left', 800);
    const by = PY + 94, bh = 26;
    bar(bx, by, bw, bh, tau, 40, tau >= NEED ? '#14a058' : '#f59e0b');
    for (let v = 0; v <= 40; v += 10) { const x = bx + bw * v / 40; ctx.strokeStyle = 'rgba(40,50,70,.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, by + bh); ctx.lineTo(x, by + bh + 6); ctx.stroke(); T(x, by + bh + 21, String(v), 12.5, '#3a465c', v === 0 ? 'left' : v === 40 ? 'right' : 'center', 800); }
    const nx = bx + bw * NEED / 40;
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(nx, by - 8); ctx.lineTo(nx, by + bh + 4); ctx.stroke(); ctx.setLineDash([]);
    T(nx + 5, by - 12, '볼트가 풀리는 ' + NEED + ' N·m', PHONE ? 12 : 13, '#c0392b', 'left', 800);
    const ty = by + bh + 46, sp = S.sp;
    if (sp.log.length) {
      T(bx, ty - 2, '📋 돌려 본 기록', PHONE ? 13 : 13.5, '#26324a', 'left', 800);
      sp.log.forEach((r, i) => {
        const y = ty + 8 + i * 22;
        T(bx, y + 14, r.F + ' N · r ' + r.r.toFixed(1) + ' m · ' + r.th + '° → τ ' + r.tau.toFixed(1) + ' N·m', PHONE ? 13 : 14, '#26324a', 'left', 800);
        T(bx + bw, y + 14, r.ok ? '✅ 풀렸어요' : '❌ 안 풀려요', PHONE ? 13 : 14, r.ok ? '#0b6b39' : '#c0392b', 'right', 800);
      });
      return;
    }
    const txt = ell === 0 ? '힘의 작용선이 회전축을 지나면 수직 거리 ℓ = 0이라서 힘이 커도 돌림힘은 0이에요.' : '같은 힘이라도 축에서 수직 거리가 길수록 돌림힘이 커요. (힘이 손잡이와 수직일 때 ℓ = r)';
    textBlock(bx, ty, bw, txt, PHONE ? 13 : 14, '#3a465c', PHONE ? 18 : 20, 700);
  }

  /* ================= ② 시소: 회전 평형 ================= */
  const SSC = { HB: 2.5, MAXB: 0.18, MASSES: [15, 30, 45, 60], MARKS: [0.5, 1.0, 1.5, 2.0] };
  const SPPM2 = PHONE ? 92 : 150, SCX = VW / 2, SCY = PHONE ? 128 : 120, SGY = SCY + (PHONE ? 134 : 146);
  const SBW = PHONE ? 0.8 : 1;
  function resetSeesaw(full) {
    const p = S.ss;
    S.ss = { mA: 30, xA: 1.0, mB: 45, xB: 1.0, beta: 0, omega: 0, levelT: 0, bal: {}, pA: 1.0, pB: 1.0, drag: null, hover: null };
    if (p && !full) S.ss.bal = p.bal;
    updateCtl();
  }
  const ssTA = (s) => s.mA * G * s.xA, ssTB = (s) => s.mB * G * s.xB;
  function stepSeesaw(dt) {
    const s = S.ss, net = ssTB(s) - ssTA(s);
    const target = net === 0 ? 0 : Math.sign(net) * clamp(0.05 + Math.abs(net) / 1500 * 0.13, 0.05, SSC.MAXB);
    if (RM) { s.beta = target; s.omega = 0; }
    else {
      const n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n;
      for (let i = 0; i < n; i++) {
        s.omega += (-70 * (s.beta - target) - 7 * s.omega) * h; s.beta += s.omega * h;
        if (s.beta > SSC.MAXB) { s.beta = SSC.MAXB; if (s.omega > 0) s.omega *= -0.2; }
        if (s.beta < -SSC.MAXB) { s.beta = -SSC.MAXB; if (s.omega < 0) s.omega *= -0.2; }
      }
    }
    s.pA = approach(s.pA, s.xA, dt, 16); s.pB = approach(s.pB, s.xB, dt, 16);
    const level = net === 0 && Math.abs(s.beta) < 0.01 && Math.abs(s.omega) < 0.06;
    s.levelT = level ? s.levelT + dt : 0;
    if (s.levelT >= 0.5 && !s.drag) {
      const key = Math.min(s.mA, s.mB) + '|' + Math.max(s.mA, s.mB);
      if (!s.bal[key]) {
        s.bal[key] = { mA: s.mA, mB: s.mB, xA: s.xA, xB: s.xB };
        Sound.success(); parts.burst(SCX, SCY - 14, { count: 14, speed: 130, size: 3.2, colors: ['#14a058', '#ffd447', '#fff'], gravity: 120, life: 0.8 });
      }
    }
  }
  const ssDiffBal = () => Object.keys(S.ss.bal).filter((k) => S.ss.bal[k].mA !== S.ss.bal[k].mB);
  function ssPt(s, m) { const c = Math.cos(s.beta), sn = Math.sin(s.beta); return { x: SCX + m * SPPM2 * c, y: SCY + m * SPPM2 * sn }; }
  function ssBlock(s, side) {   // 추 블록의 화면 위치
    const m = side === 'A' ? s.mA : s.mB, pos = side === 'A' ? -s.pA : s.pB;
    const hk = ssPt(s, pos), bw = (40 + m * 0.3) * SBW, bh = (34 + m * 0.25) * SBW, rope = 18;
    return { hk, bw, bh, cx: hk.x, cy: hk.y + rope + bh / 2, m };
  }
  function drawSeesaw(dt) {
    const s = S.ss, tA = ssTA(s), tB = ssTB(s);
    bgFill('#eaf1fb', '#f7faff');
    T(16, 28, '⚖️ 시소: 두 추를 걸어 수평 맞추기', PHONE ? 14.5 : 17, '#26324a', 'left', 800);
    // 바닥 · 받침대 · 받침 기둥
    ctx.fillStyle = '#c3ccd8'; ctx.fillRect(0, SGY, VW, SH - SGY); ctx.fillStyle = '#97a3b5'; ctx.fillRect(0, SGY, VW, 3);
    const bmax = SSC.HB * SPPM2;
    [-1, 1].forEach((sg) => {
      const px = SCX + sg * bmax * Math.cos(SSC.MAXB), top = SCY + bmax * Math.sin(SSC.MAXB) + 9;
      D.roundRect(px - 11, top, 22, SGY - top, 4); ctx.fillStyle = '#9aa5b8'; ctx.fill();
    });
    ctx.beginPath(); ctx.moveTo(SCX, SCY + 8); ctx.lineTo(SCX - 36, SGY); ctx.lineTo(SCX + 36, SGY); ctx.closePath();
    const fg = ctx.createLinearGradient(0, SCY, 0, SGY); fg.addColorStop(0, '#8e9ab0'); fg.addColorStop(1, '#6b7689'); ctx.fillStyle = fg; ctx.fill();
    // 받침 힘 화살표
    const N = (s.mA + s.mB) * G, aLen = 24 + N / 1200 * 56;
    D.arrow(SCX, SCY + 14 + aLen, SCX, SCY + 14, { color: '#14a058', width: 5, head: 12 });
    D.label(SCX, SGY - 16, '받침 힘 ' + nf(N) + ' N', { bg: '#14a058', size: PHONE ? 12 : 13 });
    // 막대
    ctx.save(); ctx.translate(SCX, SCY); ctx.rotate(s.beta);
    D.shadow(() => { D.roundRect(-SSC.HB * SPPM2, -7, SSC.HB * 2 * SPPM2, 14, 7); const g = ctx.createLinearGradient(0, -7, 0, 7); g.addColorStop(0, '#e0b57a'); g.addColorStop(1, '#b8844a'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#7a5428'; ctx.lineWidth = 1.5; D.roundRect(-SSC.HB * SPPM2, -7, SSC.HB * 2 * SPPM2, 14, 7); ctx.stroke();
    for (let m = -2; m <= 2; m += 0.5) { const x = m * SPPM2; ctx.strokeStyle = m === 0 ? '#e2464b' : 'rgba(60,40,20,.7)'; ctx.lineWidth = m === 0 ? 3 : 1.6; ctx.beginPath(); ctx.moveTo(x, -7); ctx.lineTo(x, m === 0 ? 7 : -1); ctx.stroke(); }
    ctx.restore();
    D.sphere(SCX, SCY, 6, '#e2464b', { gloss: false });
    // 눈금 숫자 (막대와 함께 기울어요)
    ctx.save(); ctx.translate(SCX, SCY); ctx.rotate(s.beta);
    [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2].forEach((m) => { if (PHONE && (Math.abs(m) * 2) % 2 === 1) return; T(m * SPPM2, -13, Math.abs(m).toFixed(1), PHONE ? 11.5 : 12.5, '#5a3d1a', 'center', 800); });
    ctx.restore();
    // 추
    ['A', 'B'].forEach((side) => {
      const b = ssBlock(s, side), hot = s.drag === side || s.hover === side;
      ctx.strokeStyle = '#5a6679'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.hk.x, b.hk.y + 6); ctx.lineTo(b.cx, b.cy - b.bh / 2); ctx.stroke();
      D.sphere(b.hk.x, b.hk.y, 4.5, '#5a6679', { gloss: false });
      const col = side === 'A' ? '#3b82f6' : '#f26b3a';
      D.shadow(() => { D.roundRect(b.cx - b.bw / 2, b.cy - b.bh / 2 - (hot ? 3 : 0), b.bw, b.bh, 8); const g = ctx.createLinearGradient(0, b.cy - b.bh / 2, 0, b.cy + b.bh / 2); g.addColorStop(0, C.shade(col, 0.2)); g.addColorStop(1, C.shade(col, -0.15)); ctx.fillStyle = g; ctx.fill(); }, { blur: hot ? 12 : 6, y: hot ? 6 : 3 });
      ctx.strokeStyle = C.shade(col, -0.4); ctx.lineWidth = 2; D.roundRect(b.cx - b.bw / 2, b.cy - b.bh / 2 - (hot ? 3 : 0), b.bw, b.bh, 8); ctx.stroke();
      T(b.cx, b.cy - (hot ? 3 : 0) + 5, b.m + ' kg', PHONE ? 12.5 : 14, '#fff', 'center', 800);
      D.label(b.hk.x, b.hk.y - 40, (side === 'A' ? s.xA : s.xB).toFixed(1) + ' m', { bg: col, size: PHONE ? 12 : 13 });
    });
    if (Math.abs(s.beta) < 0.01 && tA === tB) D.label(SCX, 52, '수평!', { bg: '#14a058', size: 15 });
    T(VW - 14, 28, PHONE ? '추를 끌어 보세요' : '추를 끌어서 거리를 바꿔요', PHONE ? 12 : 13, '#5a6679', 'right', 700);
    drawSeesawPanel(s, tA, tB, N);
    parts.update(dt); parts.draw(ctx);
  }
  function drawSeesawPanel(s, tA, tB, N) {
    panel(PX, PY, PW, PH, 16);
    const bx = PX + 20, bw = PW - 40, MAXT = 1200;
    T(bx, PY + 28, '🧮 돌림힘 비교 (받침점 기준, N·m)', PHONE ? 14.5 : 16, '#26324a', 'left', 800);
    const rowH = PHONE ? 62 : 58;
    [['↺ 반시계 방향 (왼쪽 추)', tA, s.mA * G, s.xA, '#3b82f6'], ['↻ 시계 방향 (오른쪽 추)', tB, s.mB * G, s.xB, '#f26b3a']].forEach((r, i) => {
      const y = PY + 44 + i * rowH;
      T(bx, y + 12, r[0], PHONE ? 13 : 14, r[4], 'left', 800);
      T(bx + bw, y + 12, nf(r[2]) + ' N × ' + r[3].toFixed(1) + ' m = ' + nf(r[1]) + ' N·m', PHONE ? 13 : 14.5, '#26324a', 'right', 800);
      bar(bx, y + 20, bw, 22, r[1], MAXT, r[4]);
    });
    const vy = PY + 44 + 2 * rowH + 8;
    const eq = tA === tB;
    D.roundRect(bx, vy, bw, 36, 12); ctx.fillStyle = eq ? '#e7f7ee' : '#fff4d6'; ctx.fill();
    T(bx + bw / 2, vy + 24, eq ? '두 돌림힘이 같아요 → 알짜 돌림힘 0 → 수평!' : (tB > tA ? '시계 방향이 더 커요 → 오른쪽이 내려가요' : '반시계 방향이 더 커요 → 왼쪽이 내려가요'), PHONE ? 13.5 : 15, eq ? '#0b6b39' : '#7a4b00', 'center', 800);
    T(bx, vy + 56, '알짜힘 0: 받침 힘 N = (' + s.mA + ' + ' + s.mB + ') kg × 10 = ' + nf(N) + ' N (막대 무게는 무시)', PHONE ? 12 : 13.5, '#3a465c', 'left', 700);
  }

  /* ================= ③ 우력: 알짜힘 = 0이어도 돌 수 있어요 ================= */
  const CPX = [-0.2, 0, 0.2];
  const CPPM = PHONE ? 330 : 400, CPCX = VW / 2, CPCY = PHONE ? 178 : 170, CTR = 36, CDUR = 2.2;
  const cpSumF = (f) => f[0] + f[1] + f[2];
  const cpSumT = (f) => (f[2] - f[0]) / 5;            // 중심 기준 Στ = Σ x·F (반시계 +) = 0.2 × (F오른 − F왼)
  function cpKind(f) {
    const a = cpSumF(f), t = cpSumT(f);
    if (f.every((v) => v === 0)) return '힘이 없어요';
    if (a === 0 && t === 0) return '정지 (평형)';
    if (a === 0) return '제자리에서 회전';
    if (t === 0) return '이동만 (회전 없음)';
    return '이동 + 회전';
  }
  function resetCouple() {
    const p = S.cp;
    S.cp = { f: p ? p.f.slice() : [0, 0, 0], run: null, flags: { couple: false, eq: false }, rows: [] };
    updateCtl();
  }
  function cpClearRun() { if (S.cp.run) { S.cp.run = null; } }
  function cpSetF(i, v) { if (S.cp.f[i] === v) return; S.cp.f[i] = v; cpClearRun(); updateCtl(); }
  function cpRunTrial() {
    const c = S.cp; if (c.run && c.run.st === 'run') return;
    if (c.f.every((v) => v === 0)) { showHint('먼저 힘을 하나 이상 정해 주세요.'); return; }
    Sound.click(); c.run = { st: 'run', t: 0, f: c.f.slice() }; updateCtl();
  }
  function stepCouple(dt) {
    const c = S.cp, r = c.run; if (!r || r.st !== 'run') return;
    r.t += dt / (RM ? 0.3 : CDUR);
    if (r.t >= 1) cpFinish(true);
  }
  function cpFinish(fx) {
    const c = S.cp, r = c.run; if (!r || r.st !== 'run') return;
    r.t = 1; r.st = 'done';
    const a = cpSumF(r.f), t = cpSumT(r.f);
    if (a === 0 && t !== 0) c.flags.couple = true;
    if (a === 0 && t === 0) c.flags.eq = true;
    c.rows.push({ f: r.f.slice(), a, t, kind: cpKind(r.f) }); if (c.rows.length > 4) c.rows.shift();
    if (fx) Sound.success();
    updateCtl();
  }
  function cpPose(r) {
    if (!r) return { dy: 0, rot: 0 };
    const a = cpSumF(r.f), t = cpSumT(r.f), p = r.t, q = p * p;
    return { dy: -clamp(a / 20 * CTR, -CTR, CTR) * q, rot: clamp(-t / 4 * 1.6, -3.2, 3.2) * q };   // rot: 화면에서 시계 방향 +
  }
  function drawCouple(dt) {
    const c = S.cp, r = c.run, f = r ? r.f : c.f, pose = cpPose(r);
    bgFill('#e8f3fb', '#f4f9fe');
    T(16, 28, '🌀 얼음 위의 막대 (위에서 본 모습, 마찰 없음)', PHONE ? 14 : 17, '#26324a', 'left', 800);
    D.roundRect(10, 40, VW - 20, SH - 50, 22); const ig = ctx.createLinearGradient(0, 40, 0, SH); ig.addColorStop(0, '#d9efff'); ig.addColorStop(1, '#bfe3fb'); ctx.fillStyle = ig; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(30 + i * 150, 70); ctx.lineTo(80 + i * 150, 54); ctx.stroke(); }
    // 처음 위치 표시
    ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(60,80,110,.45)'; ctx.lineWidth = 1.6; ctx.strokeRect(CPCX - 0.2 * CPPM, CPCY - 9, 0.4 * CPPM, 18); ctx.setLineDash([]);
    const L = 0.4 * CPPM;
    const cx = CPCX, cy = CPCY + pose.dy;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(pose.rot);
    D.shadow(() => { D.roundRect(-L / 2, -9, L, 18, 9); const g = ctx.createLinearGradient(0, -9, 0, 9); g.addColorStop(0, '#e0b57a'); g.addColorStop(1, '#b8844a'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#7a5428'; ctx.lineWidth = 1.8; D.roundRect(-L / 2, -9, L, 18, 9); ctx.stroke();
    CPX.forEach((x) => { ctx.fillStyle = '#5a6679'; ctx.beginPath(); ctx.arc(x * CPPM, 0, 4, 0, TAU); ctx.fill(); });
    ctx.restore();
    D.sphere(cx, cy, 5, '#e2464b', { gloss: false });
    // 힘 화살표 (위쪽 +)
    f.forEach((v, i) => {
      if (v === 0) return;
      const pt = { x: cx + CPX[i] * CPPM * Math.cos(pose.rot), y: cy + CPX[i] * CPPM * Math.sin(pose.rot) };
      const len = Math.abs(v) * (PHONE ? 3.2 : 3.8);
      const col = i === 1 ? '#7c5cff' : '#e2464b';
      if (v > 0) D.arrow(pt.x, pt.y - 10, pt.x, pt.y - 10 - len, { color: col, width: 5.5, label: Math.abs(v) + ' N', labelOffset: 20 });
      else D.arrow(pt.x, pt.y + 10, pt.x, pt.y + 10 + len, { color: col, width: 5.5, label: Math.abs(v) + ' N', labelOffset: 20 });
    });
    // 이름표
    if (!r) {
      T(CPCX - 0.2 * CPPM, CPCY + 38, '−0.2 m', PHONE ? 12 : 13, '#3a465c', 'center', 800);
      T(CPCX, CPCY + 38, '중심(기준점)', PHONE ? 12 : 13, '#c0392b', 'center', 800);
      T(CPCX + 0.2 * CPPM, CPCY + 38, '+0.2 m', PHONE ? 12 : 13, '#3a465c', 'center', 800);
    } else if (r.st === 'done') {
      D.label(VW - 14, 56, '결과: ' + cpKind(r.f), { bg: cpSumF(r.f) === 0 && cpSumT(r.f) === 0 ? '#14a058' : '#26324a', size: PHONE ? 13 : 15, align: 'right' });
    } else if (!RM) D.label(VW - 14, 56, '🐌 슬로모션', { bg: '#26324a', size: 13, align: 'right' });
    drawCouplePanel(f);
    parts.update(dt); parts.draw(ctx);
  }
  function drawCouplePanel(f) {
    const c = S.cp;
    panel(PX, PY, PW, PH, 16);
    const bx = PX + 20, bw = PW - 40, a = cpSumF(f), t = cpSumT(f);
    T(bx, PY + 28, '🧮 두 가지 평형 조건 확인하기', PHONE ? 14.5 : 16, '#26324a', 'left', 800);
    const half = (bw - 14) / 2;
    [['① 알짜힘 ΣF', (a > 0 ? '+' : '') + a + ' N', a === 0], ['② 돌림힘의 합 Στ', (t > 0 ? '+' : '') + t.toFixed(1) + ' N·m', t === 0]].forEach((r, i) => {
      const x = bx + i * (half + 14), y = PY + 40;
      D.roundRect(x, y, half, 56, 12); ctx.fillStyle = r[2] ? '#e7f7ee' : '#fff4d6'; ctx.fill();
      T(x + 10, y + 20, r[0], PHONE ? 12.5 : 14, '#5a6679', 'left', 800);
      T(x + 10, y + 44, r[1] + (r[2] ? ' ✔' : ''), PHONE ? 15 : 18, r[2] ? '#0b6b39' : '#7a4b00', 'left', 800);
    });
    const fh = textBlock(bx, PY + 116, bw, 'Στ = (−0.2 m) × F왼 + 0 × F가운데 + (0.2 m) × F오른 (위쪽 힘이 오른쪽에 있으면 반시계 방향 +)', 13, '#5a6679', 17, 700);
    // 기록
    const ty = PY + 116 + fh + 8;
    T(bx, ty + 4, '📋 실험 기록 (▶ 힘 가하기를 누를 때마다)', PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
    if (!c.rows.length) T(bx, ty + 30, '아직 기록이 없어요', 13.5, '#98a2b3', 'left', 700);
    c.rows.forEach((r, i) => {
      const y = ty + 14 + i * (PHONE ? 26 : 24);
      const fs = r.f.map((v) => (v > 0 ? '↑' + v : v < 0 ? '↓' + (-v) : '0')).join(' · ');
      T(bx, y + 14, fs + ' N', PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
      T(bx + bw * (PHONE ? 0.40 : 0.32), y + 14, 'ΣF ' + r.a + ', Στ ' + r.t.toFixed(1), PHONE ? 12.5 : 13.5, '#5a6679', 'left', 700);
      T(bx + bw, y + 14, r.kind, PHONE ? 12.5 : 13.5, r.a === 0 && r.t === 0 ? '#0b6b39' : '#7a4b00', 'right', 800);
    });
  }

  /* ================= ③ 널빤지 다리: N_A, N_B 구하기 ================= */
  const PLK = { SPAN: 4, LEN: 8, WP: 200, WL: 400, OVER: 2 };
  const plNB = (x) => (PLK.WP * PLK.SPAN / 2 + PLK.WL * x) / PLK.SPAN;     // A를 기준점으로 한 돌림힘 식
  const plNA = (x) => PLK.WP + PLK.WL - plNB(x);
  const plTip = (x) => plNA(x) < 0;
  const PPM3 = PHONE ? 52 : 90, PAX = PHONE ? 32 + PLK.OVER * PPM3 : 40 + PLK.OVER * PPM3;
  const PGY = PHONE ? 288 : 276, PPH = 84, PTH = 18, FSC = 0.13;
  const PBY = PGY - PPH;           // 널빤지 아랫면 높이
  function resetPlank(x) {
    const p = S.pl;
    S.pl = { x: x != null ? x : (p ? p.x : 1), ref: 'A', rows: [], tip: 0, sawB: false, px: x != null ? x : (p ? p.x : 1), drag: false };
    updateCtl();
  }
  function plSetX(x) { x = clamp(Math.round(x * 2) / 2, 0, 6); if (S.pl.x === x) return; S.pl.x = x; updateCtl(); }
  function plAddRow() {
    const pl = S.pl, el = $('#predIn'), raw = el.value.trim();
    if (raw === '' || !isFinite(+raw)) { showHint('예측값을 숫자로 입력해 주세요.'); return; }
    const pred = Math.round(+raw), meas = plTip(pl.x) ? PLK.WP + PLK.WL : plNB(pl.x);
    pl.rows.push({ x: pl.x, pred, meas }); if (pl.rows.length > 4) pl.rows.shift();
    Sound[pred === meas ? 'success' : 'fail'](); updateCtl();
  }
  function stepPlank(dt) {
    const pl = S.pl;
    pl.tip = approach(pl.tip, plTip(pl.x) ? 0.13 : 0, dt, 7);
    pl.px = approach(pl.px, pl.x, dt, 16);
  }
  function drawPlank(dt) {
    const pl = S.pl, x = pl.x, tip = plTip(x), NB = tip ? PLK.WP + PLK.WL : plNB(x), NA = tip ? 0 : plNA(x);
    bgFill('#eaf1fb', '#f7faff');
    T(16, 28, '🌉 널빤지 다리: 받침 힘 센서 두 개', PHONE ? 14.5 : 17, '#26324a', 'left', 800);
    ctx.fillStyle = '#c3ccd8'; ctx.fillRect(0, PGY, VW, SH - PGY); ctx.fillStyle = '#97a3b5'; ctx.fillRect(0, PGY, VW, 3);
    const Ax = PAX, Bx = PAX + PLK.SPAN * PPM3;
    // 받침 기둥 + 센서
    [[Ax, 'A', NA], [Bx, 'B', NB]].forEach((q) => {
      D.roundRect(q[0] - 9, PBY, 18, PGY - PBY, 3); ctx.fillStyle = '#8e9ab0'; ctx.fill();
      D.roundRect(q[0] - 31, PGY - 38, 62, 28, 6); ctx.fillStyle = '#1f2937'; ctx.fill();
      T(q[0], PGY - 28, 'N_' + q[1], 10.5, '#9ae6b4', 'center', 800); T(q[0], PGY - 14, nf(q[2]) + ' N', 13, '#9ae6b4', 'center', 800);
      T(q[0], PGY + 16, q[1] + ' 점', PHONE ? 12.5 : 13.5, '#3a465c', 'center', 800);
    });
    // 널빤지 + 짐 (B를 중심으로 기울어요)
    const ph = pl.tip;
    const cs = Math.cos(ph), sn = Math.sin(ph);
    const wpt = (lx, ly) => ({ x: Bx + lx * cs - ly * sn, y: PBY + lx * sn + ly * cs });   // 널빤지 좌표 → 화면 (B점이 원점, 위쪽이 −y)
    ctx.save(); ctx.translate(Bx, PBY); ctx.rotate(ph);
    const x0 = (-PLK.OVER - PLK.SPAN) * PPM3, wl = PLK.LEN * PPM3;
    D.shadow(() => { D.roundRect(x0, -PTH, wl, PTH, 4); const g = ctx.createLinearGradient(0, -PTH, 0, 0); g.addColorStop(0, '#e0b57a'); g.addColorStop(1, '#b8844a'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#7a5428'; ctx.lineWidth = 1.6; D.roundRect(x0, -PTH, wl, PTH, 4); ctx.stroke();
    for (let m = -PLK.OVER; m <= PLK.SPAN + PLK.OVER; m += 1) { ctx.strokeStyle = 'rgba(80,50,20,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo((m - PLK.SPAN) * PPM3, -PTH); ctx.lineTo((m - PLK.SPAN) * PPM3, -PTH + 4); ctx.stroke(); if (m >= 0 && m <= 6) T((m - PLK.SPAN) * PPM3, -4, String(m), 13, '#5a3d1a', 'center', 800); }
    // 짐
    const cb = PHONE ? 34 : 46, lx = (pl.px - PLK.SPAN) * PPM3;
    D.shadow(() => { D.roundRect(lx - cb / 2, -PTH - cb, cb, cb, 6); const g = ctx.createLinearGradient(0, -PTH - cb, 0, -PTH); g.addColorStop(0, '#f2873a'); g.addColorStop(1, '#c2410c'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#8a3207'; ctx.lineWidth = 2; D.roundRect(lx - cb / 2, -PTH - cb, cb, cb, 6); ctx.stroke();
    ctx.restore();
    T(wpt(lx, -PTH - cb / 2).x, wpt(lx, -PTH - cb / 2).y + 5, String(PLK.WL), PHONE ? 12 : 14, '#fff', 'center', 800);
    // 눈금 숫자 (A에서의 거리, m)
    // 힘 화살표 (길이는 힘에 비례: 1 N당 같은 길이)
    const lp = wpt(lx, -PTH - cb), llen = PLK.WL * FSC;
    D.arrow(lp.x, lp.y - llen, lp.x, lp.y - 2, { color: '#e2464b', width: 5, head: 11, label: '짐 ' + PLK.WL + ' N', labelOffset: lp.x > VW - 120 ? (PHONE ? 44 : 52) : (PHONE ? -44 : -52) });
    const mp = wpt((PLK.LEN / 2 - PLK.OVER - PLK.SPAN) * PPM3, 0), mlen = PLK.WP * FSC;
    D.arrow(mp.x, mp.y + 2, mp.x, mp.y + 2 + mlen, { color: '#c0392b', width: 5, head: 11, label: '판 ' + PLK.WP + ' N', labelOffset: PHONE ? -40 : -48 });
    if (NA > 0) D.arrow(Ax + 20, PBY + NA * FSC, Ax + 20, PBY + 2, { color: '#14a058', width: 5, head: 11, label: nf(NA) + ' N', labelOffset: 26 });
    D.arrow(Bx + 20, PBY + NB * FSC, Bx + 20, PBY + 2, { color: '#14a058', width: 5, head: 11, label: nf(NB) + ' N', labelOffset: 26 });
    if (tip) D.label(VW / 2, 56, '⚠️ A 쪽이 들려요! N_A = 0', { bg: '#e2464b', size: PHONE ? 13 : 15 });
    else if (NA === 0) D.label(VW / 2, 56, '아슬아슬: N_A = 0', { bg: '#f59e0b', size: PHONE ? 13 : 15 });
    T(VW - 14, 28, PHONE ? '짐을 끌어 보세요' : '짐을 끌어서 옮길 수 있어요', PHONE ? 12 : 13, '#5a6679', 'right', 700);
    drawPlankPanel(pl, x, tip, NA, NB);
    parts.update(dt); parts.draw(ctx);
  }
  function drawPlankPanel(pl, x, tip, NA, NB) {
    panel(PX, PY, PW, PH, 16);
    const bx = PX + 18, bw = PW - 36;
    const eqW = PHONE ? bw : Math.round(bw * 0.56);
    T(bx, PY + 28, '🧮 기준점 ' + pl.ref + ' 점으로 돌림힘의 합 = 0', PHONE ? 14 : 15.5, '#26324a', 'left', 800);
    let lines;
    if (tip) lines = ['짐이 B에서 너무 멀어요. A를 기준으로 하면', 'N_B × 4.0 = 200 × 2.0 + 400 × ' + x.toFixed(1) + ' → N_B = ' + nf(plNB(x)) + ' N', '그런데 N_A = 600 − N_B < 0 (받침이 당길 수 없어요)', '→ 평형이 깨져 B를 축으로 돌아가요.'];
    else if (pl.ref === 'A') lines = ['N_B × 4.0 = 200 × 2.0 + 400 × ' + x.toFixed(1), '→ N_B = ' + nf(plNB(x)) + ' N', '알짜힘 0: N_A + N_B = 200 + 400', '→ N_A = ' + nf(plNA(x)) + ' N'];
    else lines = ['N_A × 4.0 = 200 × 2.0 + 400 × (4.0 − ' + x.toFixed(1) + ')', '→ N_A = ' + nf(plNA(x)) + ' N', '알짜힘 0: N_A + N_B = 200 + 400', '→ N_B = ' + nf(plNB(x)) + ' N'];
    lines.forEach((l, i) => T(bx, PY + 56 + i * (PHONE ? 22 : 25), l, PHONE ? 13 : 14.5, i % 2 ? '#c2410c' : '#26324a', 'left', 800));
    if (!PHONE) T(bx, PY + 56 + 4 * 25 + 4, '확인: N_A + N_B = ' + nf((tip ? 0 : plNA(x)) + (tip ? PLK.WP + PLK.WL : plNB(x))) + ' N (판 200 + 짐 400)', 13.5, '#0b6b39', 'left', 800);
    // 표
    const tx = PHONE ? bx : bx + eqW + 10, tw = PHONE ? bw : bw - eqW - 10, ty = PHONE ? PY + 56 + 4 * 22 + 10 : PY + 14, rh = PHONE ? 24 : 26;
    if (!PHONE) { D.roundRect(tx, ty, tw, PH - 28, 12); ctx.fillStyle = '#f5f7fc'; ctx.fill(); }
    const cx0 = tx + 8;
    const cols = [cx0, cx0 + tw * 0.25, cx0 + tw * 0.5, cx0 + tw * 0.76];
    ['짐 위치', '예측 N_B', '측정 N_B', '차이'].forEach((h, i) => T(cols[i], ty + 20, h, PHONE ? 12 : 13, '#5a6679', 'left', 800));
    if (!pl.rows.length) T(cx0, ty + 20 + rh + 4, '예측값을 쓰고 확인을 눌러요', PHONE ? 12.5 : 13.5, '#98a2b3', 'left', 700);
    pl.rows.slice(PHONE ? -3 : -4).forEach((r, i) => {
      const y = ty + 20 + (i + 1) * rh, d = r.pred - r.meas;
      T(cols[0], y, r.x.toFixed(1) + ' m', PHONE ? 13 : 14, '#26324a', 'left', 800); T(cols[1], y, nf(r.pred) + ' N', PHONE ? 13 : 14, '#26324a', 'left', 800);
      T(cols[2], y, nf(r.meas) + ' N', PHONE ? 13 : 14, '#0b6b39', 'left', 800); T(cols[3], y, d === 0 ? '0 ✔' : (d > 0 ? '+' : '') + nf(d) + ' N', PHONE ? 13 : 14, d === 0 ? '#0b6b39' : '#c0392b', 'left', 800);
    });
  }

  /* ================= ④ 안정성: 기울어지는 구조물 (직육면체·책장 공통 모형) ================= */
  const thC = (w, h) => deg(Math.atan((w / 2) / h));          // 넘어지는 한계 각 (도): tan θ = (w/2) ÷ h
  const r1 = (v) => Math.round(v * 10) / 10;
  const newTopple = (extra) => Object.assign({ deg: 0, ang: 0, st: 'idle', om: 0 }, extra);
  function stepTopple(t, tc, dt) {
    if (t.st === 'idle') {
      const tgt = t.deg * Math.PI / 180;
      t.ang = RM ? tgt : approach(t.ang, tgt, dt, 16);
      if (Math.abs(t.deg - deg(t.ang)) < 0.05) t.ang = tgt;
      if (t.deg >= tc - 1e-9 && deg(t.ang) >= tc - 1e-9) { t.st = 'fall'; t.om = 0.25; Sound.fail(); return 'fall'; }
    } else if (t.st === 'fall') {
      t.om += 9 * dt; t.ang += t.om * dt;
      if (t.ang >= Math.PI / 2) { t.ang = Math.PI / 2; t.st = 'down'; Sound.tick(); return 'land'; }
    }
    return '';
  }
  /* 슬라이더 값 d를 반영해요. 넘어진 뒤 한계보다 작은 값으로 돌아오면 다시 세워서 시작해요 */
  function toppleDeg(t, d, maxD, tc, upright) {
    d = clamp(Math.round(d), 0, maxD);
    if (t.st !== 'idle' && d < tc - 1e-6) { upright({ deg: d }); return; }
    t.deg = d; updateCtl();
  }
  /* o: {ppm, px, gy, w, h, shape} - 오른쪽 아래 모서리(px, gy)를 축으로 기울어요. 무게중심이 모서리보다 안쪽이면 true */
  function drawTopple(t, o) {
    ctx.fillStyle = '#c3ccd8'; ctx.fillRect(0, o.gy, VW, SH - o.gy); ctx.fillStyle = '#97a3b5'; ctx.fillRect(0, o.gy, VW, 3);
    ctx.fillStyle = 'rgba(20,160,88,.55)'; ctx.fillRect(o.px - o.w * o.ppm, o.gy - 1, o.w * o.ppm, 6);
    T(o.px - o.w * o.ppm / 2, o.gy + 22, '받침면 ' + o.w.toFixed(1) + ' m', PHONE ? 12 : 13, '#0b6b39', 'center', 800);
    ctx.save(); ctx.translate(o.px, o.gy); ctx.rotate(t.ang); o.shape(); ctx.restore();
    const cs = Math.cos(t.ang), sn = Math.sin(t.ang), cgx = -o.w / 2 * o.ppm, cgy = -o.h * o.ppm;
    const cg = { x: o.px + cgx * cs - cgy * sn, y: o.gy + cgx * sn + cgy * cs };
    const inside = cg.x <= o.px + 0.01;
    D.dashedLine(cg.x, cg.y, cg.x, o.gy, { color: inside ? '#14a058' : '#e2464b', width: 2.2, dash: [5, 4] });
    D.sphere(cg.x, cg.y, 7, '#fff', { outline: '#e2464b', outlineWidth: 3, gloss: false });
    const aLen = clamp(o.gy - (cg.y + 8) - 3, 14, 34);
    D.arrow(cg.x, cg.y + 8, cg.x, cg.y + 8 + aLen, { color: '#e2464b', width: 4, head: 10 });
    T(cg.x + 12, cg.y + 8 + aLen / 2 + 5, '무게 W', 13, '#c0392b', 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
    ctx.fillStyle = '#26324a'; ctx.beginPath(); ctx.moveTo(o.px, o.gy - 1); ctx.lineTo(o.px - 8, o.gy + 12); ctx.lineTo(o.px + 8, o.gy + 12); ctx.closePath(); ctx.fill();
    T(o.px + 14, o.gy + 22, '회전축(모서리)', PHONE ? 12 : 13, '#26324a', 'left', 800);
    if (t.st === 'idle' && t.deg > 0) arcArrow(o.px, o.gy, 36, -Math.PI / 2 - 0.1, -Math.PI / 2 - 0.1 + (inside ? -1.0 : 1.0), inside, inside ? '#14a058' : '#e2464b', 4.5);
    if (t.st === 'idle' && t.deg > 0) {
      if (inside) T(o.px - o.w * o.ppm - 18, o.gy - 30, '↺ 되돌리는 돌림힘', 13.5, '#0b6b39', 'right', 800);
      else T(o.px + 26, o.gy - 24, '↻ 넘어뜨리는 돌림힘', 13.5, '#c0392b', 'left', 800);
    }
    // 각도 센서 카드
    const cw = PHONE ? 136 : 168, cx = PHONE ? 14 : 24, cy = 52;
    panel(cx, cy, cw, PHONE ? 64 : 74, 14);
    T(cx + 12, cy + 22, '📐 각도 센서', PHONE ? 12.5 : 14, '#5a6679', 'left', 800);
    T(cx + 12, cy + (PHONE ? 50 : 56), deg(t.ang).toFixed(1) + '°', PHONE ? 22 : 28, '#26324a', 'left', 800);
    return inside;
  }

  /* ---- 직육면체 ---- */
  const BH = 1.0;
  const TPPM = PHONE ? 130 : 170, TPX = PHONE ? 292 : 440, TGY = SH - 36;
  const tlKey = (w, h) => w + '|' + h;
  function resetTilt() { S.tl = newTopple({ w: 0.4, h: 0.5, rec: {}, latch: false }); parts.clear(); updateCtl(); }
  function tlUpright(mod) { const p = S.tl; S.tl = newTopple(Object.assign({ w: p.w, h: p.h, rec: p.rec, latch: p.latch }, mod || {})); parts.clear(); updateCtl(); }
  function tlConfig(k, v) { if (S.tl[k] === v) return; tlUpright({ [k]: v }); }
  function tlSetDeg(d) { toppleDeg(S.tl, d, 60, thC(S.tl.w, S.tl.h), tlUpright); }
  function stepTilt(dt) {
    const t = S.tl, tc = thC(t.w, t.h), ev = stepTopple(t, tc, dt);
    if (ev === 'fall') t.rec[tlKey(t.w, t.h)] = r1(tc);
    if (ev === 'land') parts.burst(TPX + BH * TPPM * 0.5, TGY - 4, { count: 14, speed: 110, size: 3, colors: ['#c3ccd8', '#97a3b5', '#fff'], gravity: 60, life: 0.7 });
    if (t.st === 'idle' && t.w === 0.6 && t.h === 0.3 && t.deg >= 40 && deg(t.ang) >= 39.9) t.latch = true;
  }
  function drawBlockShape(t) {     // 오른쪽 아래 모서리가 원점, 위쪽이 −y
    const w = t.w, h = t.h, bw = w * TPPM, bh = BH * TPPM, fell = t.st !== 'idle';
    D.shadow(() => { D.roundRect(-bw, -bh, bw, bh, 4); const g = ctx.createLinearGradient(-bw, 0, 0, 0); g.addColorStop(0, fell ? '#e9a1a3' : '#a9c4f2'); g.addColorStop(1, fell ? '#d9686b' : '#6f93d8'); ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 3 });
    if (h < 0.5) { ctx.fillStyle = '#4b5563'; ctx.fillRect(-bw + 1, -h * TPPM, bw - 2, h * TPPM - 1); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-bw + 1, -h * TPPM, bw - 2, 3); T(-bw * 0.75, -h * TPPM / 2 + 5, '추', 13, '#fff', 'center', 800); }
    ctx.strokeStyle = fell ? '#9b2b2e' : '#3b57a8'; ctx.lineWidth = 2.5; D.roundRect(-bw, -bh, bw, bh, 4); ctx.stroke();
  }
  function drawTilt(dt) {
    const t = S.tl, tc = thC(t.w, t.h);
    bgFill('#e9f0fb', '#f6f9fe');
    T(16, 28, '📦 직육면체를 기울이면 언제 넘어질까?', PHONE ? 14 : 17, '#26324a', 'left', 800);
    drawTopple(t, { ppm: TPPM, px: TPX, gy: TGY, w: t.w, h: t.h, shape: () => drawBlockShape(t) });
    if (t.st !== 'idle') D.label(VW - 14, 50, '💥 넘어졌어요! 한계 각 ' + r1(tc).toFixed(1) + '°', { bg: '#e2464b', size: PHONE ? 13 : 15, align: 'right' });
    else if (t.deg >= 40 && t.w === 0.6 && t.h === 0.3) D.label(VW - 14, 50, '튼튼해요! 40°에서도 서 있어요', { bg: '#14a058', size: PHONE ? 13 : 15, align: 'right' });
    drawTiltPanel(t, tc);
    parts.update(dt); parts.draw(ctx);
  }
  function drawTiltPanel(t, tc) {
    panel(PX, PY, PW, PH, 16);
    const bx = PX + 20, bw = PW - 40, tcr = r1(tc);
    T(bx, PY + 28, '🧮 tan θ한계 = (w / 2) / h', PHONE ? 14.5 : 16, '#26324a', 'left', 800);
    T(bx, PY + 54, 'tan θ한계 = ' + (t.w / 2).toFixed(2) + ' / ' + t.h.toFixed(2) + ' = ' + (t.w / 2 / t.h).toFixed(2) + ' → θ한계 = ' + tcr.toFixed(1) + '°', PHONE ? 13.5 : 16, '#c2410c', 'left', 800);
    // 각도 막대 0~60도
    const by = PY + 82, bh = 24, MAXA = 60;
    D.roundRect(bx, by, bw, bh, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
    ctx.save(); D.roundRect(bx, by, bw, bh, 8); ctx.clip();
    ctx.fillStyle = 'rgba(20,160,88,.30)'; ctx.fillRect(bx, by, bw * tc / MAXA, bh); ctx.fillStyle = 'rgba(226,70,75,.28)'; ctx.fillRect(bx + bw * tc / MAXA, by, bw * (1 - tc / MAXA), bh);
    ctx.restore();
    const ax = bx + bw * clamp(t.st === 'idle' ? deg(t.ang) : tc, 0, MAXA) / MAXA;
    D.sphere(ax, by + bh / 2, 8, t.st === 'idle' ? '#3867f4' : '#e2464b', { gloss: false });
    const cxp = bx + bw * tc / MAXA;
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cxp, by - 5); ctx.lineTo(cxp, by + bh + 5); ctx.stroke();
    T(cxp, by - 9, 'θ한계 ' + tcr.toFixed(1) + '°', PHONE ? 12 : 13, '#26324a', cxp > bx + bw - 60 ? 'right' : 'center', 800);
    for (let v = 0; v <= MAXA; v += 15) T(bx + bw * v / MAXA, by + bh + 17, v + '°', 12, '#3a465c', v === 0 ? 'left' : v === MAXA ? 'right' : 'center', 800);
    T(bx + 4, by + bh / 2 + 5, '안정', 12.5, '#0b6b39', 'left', 800); T(bx + bw - 4, by + bh / 2 + 5, '넘어짐', 12.5, '#c0392b', 'right', 800);
    // 실험 기록
    const ty = by + bh + 34;
    T(bx, ty, '📋 넘어진 각 기록 (직접 넘어뜨린 경우)', PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
    const combos = [[0.4, 0.5], [0.6, 0.5], [0.4, 0.3], [0.6, 0.3]];
    const colW = PHONE ? bw : bw / 2;
    combos.forEach((cb, i) => {
      const col = PHONE ? 0 : i % 2, row = PHONE ? i : Math.floor(i / 2), rh = PHONE ? 22 : 24;
      const x = bx + col * colW, y = ty + 18 + row * rh, r = t.rec[tlKey(cb[0], cb[1])];
      const cur = cb[0] === t.w && cb[1] === t.h;
      if (cur) { D.roundRect(x - 4, y - 3, colW - 8, rh - 1, 6); ctx.fillStyle = 'rgba(242,107,58,.12)'; ctx.fill(); }
      T(x, y + 13, '폭 ' + cb[0].toFixed(1) + ' m · h ' + cb[1].toFixed(1) + ' m', PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
      T(x + colW - 14, y + 13, r != null ? r.toFixed(1) + '°' : '?', PHONE ? 12.5 : 13.5, r != null ? '#c0392b' : '#98a2b3', 'right', 800);
    });
  }

  /* ---- 책장 (같은 모형, 무거운 책의 칸에 따라 무게중심 높이가 달라져요) ---- */
  const SHELF = { W: 0.8, H: 2.0, MS: 40, MB: 40, LV: { top: 1.75, mid: 1.0, bottom: 0.25 }, BOARD: { top: 1.55, mid: 0.8, bottom: 0.05 }, BOOK: 0.4, NAME: { top: '위칸', mid: '가운데 칸', bottom: '아래칸' } };
  const ldH = (pos) => (SHELF.MS * (SHELF.H / 2) + SHELF.MB * SHELF.LV[pos]) / (SHELF.MS + SHELF.MB);
  const ldTc = (pos) => thC(SHELF.W, ldH(pos));
  const LPPM = PHONE ? 84 : 100, LPX = PHONE ? 296 : 440, LGY = SH - 36;
  function resetLoad() { S.ld = newTopple({ pos: 'top', rec: {}, latch: false }); parts.clear(); updateCtl(); }
  function ldUpright(mod) { const p = S.ld; S.ld = newTopple(Object.assign({ pos: p.pos, rec: p.rec, latch: p.latch }, mod || {})); parts.clear(); updateCtl(); }
  function ldSetPos(pos) { if (S.ld.pos === pos) return; ldUpright({ pos }); }
  function ldSetDeg(d) { toppleDeg(S.ld, d, 40, ldTc(S.ld.pos), ldUpright); }
  function stepLoad(dt) {
    const l = S.ld, tc = ldTc(l.pos), ev = stepTopple(l, tc, dt);
    if (ev === 'fall') l.rec[l.pos] = r1(tc);
    if (ev === 'land') parts.burst(LPX + SHELF.H * LPPM * 0.5, LGY - 4, { count: 14, speed: 110, size: 3, colors: ['#c3ccd8', '#97a3b5', '#fff'], gravity: 60, life: 0.7 });
    if (l.st === 'idle' && l.pos === 'bottom' && l.deg >= 25 && deg(l.ang) >= 24.9) l.latch = true;
  }
  function drawShelfShape(l) {
    const bw = SHELF.W * LPPM, bh = SHELF.H * LPPM, fell = l.st !== 'idle';
    D.shadow(() => { D.roundRect(-bw, -bh, bw, bh, 3); ctx.fillStyle = fell ? '#d9a27a' : '#c99a62'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.fillStyle = '#ecd9b8'; ctx.fillRect(-bw + 5, -bh + 5, bw - 10, bh - 10);
    ['bottom', 'mid', 'top'].forEach((k) => {
      const by = -SHELF.BOARD[k] * LPPM, bk = SHELF.BOOK * LPPM;
      ctx.fillStyle = '#a97c45'; ctx.fillRect(-bw + 5, by, bw - 10, 5);
      if (k === l.pos) {
        D.roundRect(-bw + 8, by - bk, bw - 16, bk, 3); ctx.fillStyle = '#3b3f52'; ctx.fill(); ctx.strokeStyle = '#1f2233'; ctx.lineWidth = 1.5; ctx.stroke();
        T(-bw / 2, by - bk / 2 + 4, '무거운 책', PHONE ? 10.5 : 12, '#fff', 'center', 800);
      } else {
        const cols = ['#e07a5f', '#81b29a', '#f2cc8f', '#6c8ebf'];
        for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[i]; ctx.fillRect(-bw + 9 + i * ((bw - 18) / 4), by - bk * 0.7, (bw - 18) / 4 - 2, bk * 0.7); }
      }
    });
    ctx.strokeStyle = '#7a5428'; ctx.lineWidth = 2.5; D.roundRect(-bw, -bh, bw, bh, 3); ctx.stroke();
  }
  function drawLoad(dt) {
    const l = S.ld, tc = ldTc(l.pos), h = ldH(l.pos);
    bgFill('#e9f0fb', '#f6f9fe');
    T(16, 28, '📚 책장을 기울이면 언제 넘어질까?', PHONE ? 14 : 17, '#26324a', 'left', 800);
    drawTopple(l, { ppm: LPPM, px: LPX, gy: LGY, w: SHELF.W, h, shape: () => drawShelfShape(l) });
    if (l.st !== 'idle') D.label(VW - 14, 50, '💥 쓰러졌어요! 한계 각 ' + r1(tc).toFixed(1) + '°', { bg: '#e2464b', size: PHONE ? 13 : 15, align: 'right' });
    else if (l.deg >= 25 && l.pos === 'bottom') D.label(VW - 14, 50, '아래칸이면 25°에서도 튼튼해요!', { bg: '#14a058', size: PHONE ? 13 : 15, align: 'right' });
    drawLoadPanel(l, h, tc);
    parts.update(dt); parts.draw(ctx);
  }
  function drawLoadPanel(l, h, tc) {
    panel(PX, PY, PW, PH, 16);
    const bx = PX + 20, bw = PW - 40, tcr = r1(tc);
    T(bx, PY + 28, '🧮 책장(' + SHELF.MS + ' kg) + 무거운 책(' + SHELF.MB + ' kg)의 무게중심', PHONE ? 13.5 : 16, '#26324a', 'left', 800);
    T(bx, PY + 52, 'h = (' + SHELF.MS + ' × ' + (SHELF.H / 2).toFixed(2) + ' + ' + SHELF.MB + ' × ' + SHELF.LV[l.pos].toFixed(2) + ') / ' + (SHELF.MS + SHELF.MB) + ' = ' + h.toFixed(3) + ' m', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    T(bx, PY + 76, 'tan θ한계 = ' + (SHELF.W / 2).toFixed(2) + ' / ' + h.toFixed(3) + ' → θ한계 = ' + tcr.toFixed(1) + '°', PHONE ? 13.5 : 16, '#c2410c', 'left', 800);
    const ty = PY + 100;
    T(bx, ty + 8, '📋 칸마다 넘어지는 한계 각', PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
    ['top', 'mid', 'bottom'].forEach((k, i) => {
      const y = ty + 18 + i * (PHONE ? 30 : 32), cur = l.pos === k;
      if (cur) { D.roundRect(bx - 6, y - 2, bw + 12, PHONE ? 28 : 30, 8); ctx.fillStyle = 'rgba(242,107,58,.12)'; ctx.fill(); }
      T(bx, y + 17, '무거운 책을 ' + SHELF.NAME[k] + '에', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
      T(bx + bw * (PHONE ? 0.55 : 0.5), y + 17, 'h = ' + ldH(k).toFixed(3) + ' m', PHONE ? 12.5 : 14, '#5a6679', 'left', 700);
      T(bx + bw, y + 17, r1(ldTc(k)).toFixed(1) + '°' + (l.rec[k] != null ? ' ✔' : ''), PHONE ? 13 : 14.5, '#c0392b', 'right', 800);
    });
    textBlock(bx, ty + 18 + 3 * (PHONE ? 30 : 32) + 18, bw, '✔ 표시는 직접 기울여서 넘어뜨려 본 칸이에요. 무게중심이 낮을수록 더 많이 기울여도 서 있어요.', PHONE ? 12 : 13, '#3a465c', 17, 700);
  }

  /* ================= ④ 크레인: 평형추로 돌림힘 맞추기 ================= */
  const CR = { WC: 3000, MAXB: 0.1 };
  const CPPM4 = PHONE ? 22 : 34, CRX = PHONE ? 232 : 360, CRY = PHONE ? 112 : 104, CRGY = SH - 22;
  function resetCrane() {
    S.cr = { wl: 2000, dl: 6, dc: 3, beta: 0, omega: 0, balT: 0, bal: {}, pdc: 3 };
    parts.clear(); updateCtl();
  }
  const crTL = (c) => c.wl * c.dl, crTC = (c) => CR.WC * c.dc;
  function stepCrane(dt) {
    const c = S.cr, net = crTL(c) - crTC(c);
    const target = net === 0 ? 0 : Math.sign(net) * clamp(0.04 + Math.abs(net) / 24000 * 0.1, 0.04, CR.MAXB);
    if (RM) { c.beta = target; c.omega = 0; }
    else {
      const n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n;
      for (let i = 0; i < n; i++) {
        c.omega += (-60 * (c.beta - target) - 5.5 * c.omega) * h; c.beta += c.omega * h;
        if (c.beta > CR.MAXB) { c.beta = CR.MAXB; if (c.omega > 0) c.omega *= -0.2; }
        if (c.beta < -CR.MAXB) { c.beta = -CR.MAXB; if (c.omega < 0) c.omega *= -0.2; }
      }
    }
    c.pdc = approach(c.pdc, c.dc, dt, 14);
    const level = net === 0 && Math.abs(c.beta) < 0.01 && Math.abs(c.omega) < 0.06;
    c.balT = level ? c.balT + dt : 0;
    if (c.balT >= 0.5) {
      const key = c.wl + '|' + c.dl;
      if (!c.bal[key]) { c.bal[key] = { wl: c.wl, dl: c.dl, dc: c.dc }; Sound.success(); parts.burst(CRX, CRY - 20, { count: 14, speed: 130, size: 3.2, colors: ['#14a058', '#ffd447', '#fff'], gravity: 120, life: 0.8 }); }
    }
  }
  function drawCrane(dt) {
    const c = S.cr, tL = crTL(c), tC = crTC(c), net = tL - tC;
    bgFill('#e6f0fb', '#f6f9fe');
    T(16, 28, '🏗️ 크레인: 탑 꼭대기를 기준으로 한 돌림힘', PHONE ? 14 : 17, '#26324a', 'left', 800);
    ctx.fillStyle = '#c3ccd8'; ctx.fillRect(0, CRGY, VW, SH - CRGY); ctx.fillStyle = '#97a3b5'; ctx.fillRect(0, CRGY, VW, 3);
    // 탑
    const tw = PHONE ? 16 : 22;
    ctx.fillStyle = '#e0a82e'; ctx.fillRect(CRX - tw / 2, CRY + 6, tw, CRGY - CRY - 6);
    ctx.strokeStyle = '#b07d0a'; ctx.lineWidth = 2; ctx.beginPath(); for (let y = CRY + 14; y < CRGY - 12; y += 20) { ctx.moveTo(CRX - tw / 2, y); ctx.lineTo(CRX + tw / 2, y + 20); ctx.moveTo(CRX + tw / 2, y); ctx.lineTo(CRX - tw / 2, y + 20); } ctx.stroke();
    ctx.strokeRect(CRX - tw / 2, CRY + 6, tw, CRGY - CRY - 6);
    D.roundRect(CRX - 26, CRGY - 8, 52, 10, 4); ctx.fillStyle = '#8e9ab0'; ctx.fill();
    // 팔 (기울어져요)
    const jr = 8.6 * CPPM4, jl = 6.8 * CPPM4, wob = c.balT > 0.3 && !RM ? Math.sin(S.clock * 9) * 0.004 : 0;
    ctx.save(); ctx.translate(CRX, CRY); ctx.rotate(c.beta + wob);
    D.shadow(() => { D.roundRect(-jl, -6, jl + jr, 12, 4); ctx.fillStyle = '#f5b83d'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#b07d0a'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = -jl + 6; x < jr - 6; x += 14) { ctx.moveTo(x, -6); ctx.lineTo(x + 7, 6); ctx.moveTo(x + 7, -6); ctx.lineTo(x + 14, 6); } ctx.stroke();
    D.roundRect(-jl, -6, jl + jr, 12, 4); ctx.stroke();
    for (let m = 1; m <= 8; m++) { ctx.strokeStyle = 'rgba(60,40,0,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(m * CPPM4, -6); ctx.lineTo(m * CPPM4, -11); ctx.stroke(); if (!PHONE || m % 2 === 0) T(m * CPPM4, -16, String(m), PHONE ? 11 : 12, '#5a3d00', 'center', 800); }
    for (let m = 1; m <= 6; m++) { ctx.strokeStyle = 'rgba(60,40,0,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-m * CPPM4, -6); ctx.lineTo(-m * CPPM4, -11); ctx.stroke(); if (!PHONE || m % 2 === 0) T(-m * CPPM4, -16, String(m), PHONE ? 11 : 12, '#5a3d00', 'center', 800); }
    ctx.restore();
    D.sphere(CRX, CRY, 6, '#e2464b', { gloss: false });
    const pt = (m) => ({ x: CRX + m * CPPM4 * Math.cos(c.beta + wob), y: CRY + m * CPPM4 * Math.sin(c.beta + wob) });
    // 짐
    const lp = pt(c.dl), lsz = (PHONE ? 22 : 30) + c.wl / 1000 * (PHONE ? 6 : 8), cab = PHONE ? 34 : 44;
    ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lp.x, lp.y + 6); ctx.lineTo(lp.x, lp.y + cab); ctx.stroke();
    D.shadow(() => { D.roundRect(lp.x - lsz / 2, lp.y + cab, lsz, lsz, 5); const g = ctx.createLinearGradient(0, lp.y + cab, 0, lp.y + cab + lsz); g.addColorStop(0, '#f2873a'); g.addColorStop(1, '#c2410c'); ctx.fillStyle = g; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#8a3207'; ctx.lineWidth = 2; D.roundRect(lp.x - lsz / 2, lp.y + cab, lsz, lsz, 5); ctx.stroke();
    T(lp.x, lp.y + cab + lsz / 2 + 5, nf(c.wl), PHONE ? 11.5 : 13.5, '#fff', 'center', 800);
    // 평형추
    const cp2 = pt(-c.pdc), csz = PHONE ? 38 : 52;
    ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cp2.x, cp2.y + 6); ctx.lineTo(cp2.x, cp2.y + 24); ctx.stroke();
    D.shadow(() => { D.roundRect(cp2.x - csz / 2, cp2.y + 24, csz, csz * 0.9, 5); ctx.fillStyle = '#6b7280'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 2; D.roundRect(cp2.x - csz / 2, cp2.y + 24, csz, csz * 0.9, 5); ctx.stroke();
    T(cp2.x, cp2.y + 24 + csz * 0.45 + 5, nf(CR.WC), PHONE ? 11.5 : 13.5, '#fff', 'center', 800);
    // 탑이 떠받치는 힘
    const Nn = c.wl + CR.WC, al = 22 + Nn / 6000 * 40;
    D.arrow(CRX, CRY + 24 + al, CRX, CRY + 22, { color: '#14a058', width: 4.5, head: 11 });
    if (PHONE) D.label(CRX + 8, CRY + 104, '받침 ' + nf(Nn) + ' N', { bg: '#14a058', size: 13, align: 'left' }); else D.label(CRX + 70, CRY + 48, '떠받치는 힘 ' + nf(Nn) + ' N', { bg: '#14a058', size: 13 });
    if (net === 0 && Math.abs(c.beta) < 0.01) D.label(CRX, 52, '평형!', { bg: '#14a058', size: 15 });
    else if (Math.abs(c.beta) > 0.02) D.label(CRX, 52, net > 0 ? '짐 쪽이 내려가요' : '평형추 쪽이 내려가요', { bg: '#e2464b', size: PHONE ? 13 : 14 });
    drawCranePanel(c, tL, tC);
    parts.update(dt); parts.draw(ctx);
  }
  function drawCranePanel(c, tL, tC) {
    panel(PX, PY, PW, PH, 16);
    const bx = PX + 20, bw = PW - 40, MAXT = 24000;
    T(bx, PY + 28, '🧮 탑 꼭대기 기준 돌림힘 (N·m)', PHONE ? 14.5 : 16, '#26324a', 'left', 800);
    const rowH = PHONE ? 62 : 58;
    [['↻ 짐 쪽 (시계 방향)', tL, c.wl, c.dl, '#f26b3a'], ['↺ 평형추 쪽 (반시계 방향)', tC, CR.WC, c.dc, '#6b7280']].forEach((r, i) => {
      const y = PY + 44 + i * rowH;
      T(bx, y + 12, r[0], PHONE ? 13 : 14, r[4], 'left', 800);
      T(bx + bw, y + 12, nf(r[2]) + ' N × ' + r[3].toFixed(1) + ' m = ' + nf(r[1]) + ' N·m', PHONE ? 13 : 14.5, '#26324a', 'right', 800);
      bar(bx, y + 20, bw, 22, r[1], MAXT, r[4]);
    });
    const vy = PY + 44 + 2 * rowH + 8, eq = tL === tC;
    D.roundRect(bx, vy, bw, 36, 12); ctx.fillStyle = eq ? '#e7f7ee' : '#fff4d6'; ctx.fill();
    T(bx + bw / 2, vy + 24, eq ? '돌림힘이 같아요 → 크레인이 평형이에요' : (tL > tC ? '짐 쪽 돌림힘이 더 커요 → 평형추를 더 멀리' : '평형추 쪽 돌림힘이 더 커요 → 평형추를 더 가까이'), PHONE ? 13 : 15, eq ? '#0b6b39' : '#7a4b00', 'center', 800);
    T(bx, vy + 56, '알짜힘 0: 탑이 떠받치는 힘 = ' + nf(c.wl) + ' + ' + nf(CR.WC) + ' = ' + nf(c.wl + CR.WC) + ' N (팔 무게는 무시)', PHONE ? 11.5 : 13.5, '#3a465c', 'left', 700);
  }

  /* ---------- 입력 연결 ---------- */
  $('#sF').addEventListener('input', (e) => { spSet('F', +e.target.value); });
  $$('#rSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); spSet('r', +b.dataset.r); }));
  $$('#thSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); spSet('th', +b.dataset.th); }));
  $('#bSpRun').addEventListener('click', spRun);
  $$('#mASeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ss.mA = +b.dataset.m; updateCtl(); }));
  $$('#mBSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ss.mB = +b.dataset.m; updateCtl(); }));
  $('#bSsReset').addEventListener('click', () => { Sound.click(); resetSeesaw(); parts.clear(); });
  [['sFL', 0], ['sFC', 1], ['sFR', 2]].forEach((a) => $('#' + a[0]).addEventListener('input', (e) => { cpSetF(a[1], +e.target.value); }));
  $('#bCpRun').addEventListener('click', cpRunTrial);
  $('#bCpReset').addEventListener('click', () => { Sound.click(); cpClearRun(); updateCtl(); });
  $('#sLoad').addEventListener('input', (e) => { plSetX(+e.target.value); });
  $$('#refSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pl.ref = b.dataset.ref; if (b.dataset.ref === 'B') S.pl.sawB = true; updateCtl(); }));
  $('#bPred').addEventListener('click', plAddRow);
  $('#predIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') plAddRow(); });
  $$('#tWSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); tlConfig('w', +b.dataset.w); }));
  $$('#tHSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); tlConfig('h', +b.dataset.h); }));
  $('#sTilt').addEventListener('input', (e) => { tlSetDeg(+e.target.value); });
  $('#bTiltReset').addEventListener('click', () => { Sound.click(); tlUpright(); });
  $$('#cWSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cr.wl = +b.dataset.wl; updateCtl(); }));
  $$('#cDSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cr.dl = +b.dataset.dl; updateCtl(); }));
  $('#sCw').addEventListener('input', (e) => { S.cr.dc = +e.target.value; updateCtl(); });
  $$('#lPosSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); ldSetPos(b.dataset.pos); }));
  $('#sLTilt').addEventListener('input', (e) => { ldSetDeg(+e.target.value); });
  $('#bLoadReset').addEventListener('click', () => { Sound.click(); ldUpright(); });

  /* 규칙 문장 완성 (시소 단계의 manual 미션) */
  const RULE_Q = [
    { q: '① 시소가 수평일 때, 시계 방향 돌림힘의 합은 반시계 방향 돌림힘의 합과', opts: ['더 커요', '같아요', '더 작아요'], ans: 1 },
    { q: '② 추 하나가 만드는 돌림힘은', opts: ['무게 × 받침점까지의 수직 거리', '무게 ÷ 받침점까지의 거리', '질량만으로 정해져요'], ans: 0 },
    { q: '③ 질량이 서로 다른 두 추도 수평을 이룰 수 있나요?', opts: ['아니요, 질량이 같아야만 수평이 돼요', '네, 거리를 다르게 하면 돼요'], ans: 1 },
  ];
  const ruleSel = [];
  (function buildRule() {
    const box = $('#ruleRows');
    RULE_Q.forEach((q, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      const qq = document.createElement('div'); qq.className = 'q'; qq.textContent = q.q;
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', q.q);
      const o0 = document.createElement('option'); o0.value = ''; o0.textContent = '고르세요'; sel.appendChild(o0);
      q.opts.forEach((t, j) => { const o = document.createElement('option'); o.value = String(j); o.textContent = t; sel.appendChild(o); });
      sel.addEventListener('change', () => { S.rule[i] = sel.value; sel.classList.remove('ok', 'bad'); S.ruleOK[i] = undefined; Sound.click(); });
      row.appendChild(qq); row.appendChild(sel); box.appendChild(row); ruleSel.push(sel);
    });
  })();
  function resetRule() { S.rule = {}; S.ruleOK = {}; ruleSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }

  /* ---------- 캔버스 포인터 (스패너 손, 시소 추, 널빤지 짐) ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'spanner') {
        const s = S.sp; if (s.st !== 'idle') return false;
        const Pp = { x: SPO.x + s.r * SPPM, y: SPO.y };
        if (Math.hypot(p.x - Pp.x, p.y - Pp.y) < 30) { S._drag = 'sp'; return true; }
      } else if (S.mode === 'seesaw') {
        const s = S.ss;
        for (const side of ['B', 'A']) {
          const b = ssBlock(s, side);
          if (Math.abs(p.x - b.cx) <= b.bw / 2 + 10 && p.y >= b.hk.y - 16 && p.y <= b.cy + b.bh / 2 + 10) { s.drag = side; return true; }
        }
      } else if (S.mode === 'plank') {
        const pl = S.pl, q = Math.abs(p.x - (PAX + (pl.px) * PPM3)) < 36 && p.y > 20 && p.y < PBY + 6;
        if (q) { pl.drag = true; return true; }
      }
      return false;
    },
    move(p) {
      if (S.mode === 'spanner' && S._drag === 'sp') {
        const m = (p.x - SPO.x) / SPPM; let best = 0.1, bd = 9;
        [0.1, 0.2, 0.3, 0.4].forEach((r) => { const d = Math.abs(r - m); if (d < bd) { bd = d; best = r; } });
        if (S.sp.r !== best) { Sound.tick(); spSet('r', best); }
      } else if (S.mode === 'seesaw' && S.ss.drag) {
        const s = S.ss, side = s.drag, m = (p.x - SCX) / SPPM2;
        const a = side === 'A' ? -m : m; let best = SSC.MARKS[0], bd = 9;
        SSC.MARKS.forEach((k) => { const d = Math.abs(k - a); if (d < bd) { bd = d; best = k; } });
        if (side === 'A' && s.xA !== best) { s.xA = best; Sound.tick(); } else if (side === 'B' && s.xB !== best) { s.xB = best; Sound.tick(); }
      } else if (S.mode === 'plank' && S.pl.drag) {
        const x = (p.x - PAX) / PPM3; const nx = clamp(Math.round(x * 2) / 2, 0, 6); if (nx !== S.pl.x) { Sound.tick(); plSetX(nx); }
      }
    },
    up() { S._drag = null; if (S.ss) S.ss.drag = null; if (S.pl) S.pl.drag = false; },
    hover(p) {
      if (S.mode === 'spanner' && S.sp.st === 'idle') { const Pp = { x: SPO.x + S.sp.r * SPPM, y: SPO.y }; return Math.hypot(p.x - Pp.x, p.y - Pp.y) < 30 ? 'ew-resize' : ''; }
      if (S.mode === 'seesaw') {
        const s = S.ss; s.hover = null;
        for (const side of ['B', 'A']) { const b = ssBlock(s, side); if (Math.abs(p.x - b.cx) <= b.bw / 2 + 10 && p.y >= b.hk.y - 16 && p.y <= b.cy + b.bh / 2 + 10) { s.hover = side; return 'grab'; } }
      }
      if (S.mode === 'plank') return Math.abs(p.x - (PAX + S.pl.px * PPM3)) < 36 && p.y > 20 && p.y < PBY + 6 ? 'ew-resize' : '';
      return '';
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    const m = S.mode;
    if (m === 'spanner') {
      const s = S.sp; L1 = '힘 F'; a = s.F + ' N'; L2 = '수직 거리 ℓ'; b = spEll(s).toFixed(2) + ' m'; L3 = '돌림힘 τ'; c = spTau(s).toFixed(1) + ' N·m';
    } else if (m === 'seesaw') {
      const s = S.ss; L1 = '반시계 돌림힘'; a = nf(ssTA(s)) + ' N·m'; L2 = '시계 돌림힘'; b = nf(ssTB(s)) + ' N·m'; L3 = '받침 힘'; c = nf((s.mA + s.mB) * G) + ' N';
    } else if (m === 'couple') {
      const f = S.cp.run ? S.cp.run.f : S.cp.f, t = cpSumT(f), aF = cpSumF(f);
      L1 = '알짜힘 ΣF'; a = (aF > 0 ? '+' : '') + aF + ' N'; L2 = '돌림힘 합 Στ'; b = (t > 0 ? '+' : '') + t.toFixed(1) + ' N·m'; L3 = '예상 결과'; c = cpKind(f);
    } else if (m === 'plank') {
      const x = S.pl.x, tip = plTip(x); L1 = 'A 센서 N_A'; a = nf(tip ? 0 : plNA(x)) + ' N'; L2 = 'B 센서 N_B'; b = nf(tip ? PLK.WP + PLK.WL : plNB(x)) + ' N'; L3 = '짐 위치(A에서)'; c = x.toFixed(1) + ' m';
    } else if (m === 'tilt') {
      const t = S.tl; L1 = '기울기 θ'; a = deg(t.ang).toFixed(1) + '°'; L2 = 'θ한계'; b = (Math.round(thC(t.w, t.h) * 10) / 10).toFixed(1) + '°'; L3 = '상태'; c = t.st === 'idle' ? (deg(t.ang) < thC(t.w, t.h) ? '서 있어요' : '—') : '넘어졌어요';
    } else if (m === 'crane') {
      const cr = S.cr; L1 = '짐 쪽 돌림힘'; a = nf(crTL(cr)) + ' N·m'; L2 = '평형추 쪽'; b = nf(crTC(cr)) + ' N·m'; L3 = '탑이 받치는 힘'; c = nf(cr.wl + CR.WC) + ' N';
    } else {
      const l = S.ld; L1 = '책장의 기울기'; a = deg(l.ang).toFixed(1) + '°'; L2 = 'θ한계'; b = (Math.round(ldTc(l.pos) * 10) / 10).toFixed(1) + '°'; L3 = '무게중심 높이'; c = ldH(l.pos).toFixed(3) + ' m';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '돌림힘: 힘 × 수직 거리', short: '돌림힘', icon: '🔧', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 힘으로 밀어도 문손잡이 쪽을 밀 때와 경첩 쪽을 밀 때 왜 다를까? 높은 건물은 왜 쓰러지지 않을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 알짜힘이 0이면 물체의 운동 상태가 변하지 않는다고 배웠어요. 그런데 알짜힘이 0이어도 물체가 <b>빙글빙글 돌 수</b> 있어요. 물체를 돌리는 효과를 나타내는 양이 <b>돌림힘</b>이에요.</div>' +
        '<p>스패너로 녹슨 볼트를 풀어 보며 돌림힘이 <b>힘의 크기</b>와 <b>회전축에서 힘의 작용선까지의 수직 거리</b>에 어떻게 달라지는지 알아봐요. (회전축은 볼트 중심 하나만 잡아요.)</p>',
      features: ['spanner'],
      setup() { resetSpanner(); resetRule(); showRule = false; setScene('spanner'); },
      recap: '돌림힘 τ = 힘 F × 수직 거리 ℓ이에요. 힘의 작용선이 회전축을 지나면 ℓ = 0이라서 돌림힘이 0이에요.',
      summary: '<ul><li><b>돌림힘</b> τ = F × ℓ (단위 N·m). ℓ은 회전축에서 힘의 <b>작용선까지의 수직 거리</b>예요.</li><li>같은 힘이라도 축에서 멀리, 손잡이에 <b>수직</b>으로 작용할수록 돌림힘이 커요.</li><li>작용선이 회전축을 지나면 ℓ = 0 → 돌림힘 0 (문의 경첩 쪽을 밀 때).</li><li>방향 약속: <b>반시계 방향 +</b>, 시계 방향 −.</li><li>예) 50 N, r = 0.20 m, 수직 → 10 N·m / r = 0.40 m → 20 N·m</li></ul>',
      missions: [
        {
          title: '녹슨 볼트 풀기',
          goal: '볼트는 돌림힘이 <b>' + NEED + ' N·m 이상</b>이어야 풀려요. 힘을 <b>' + F_LOOSE + ' N 이하</b>로 하면서도 볼트를 풀어 보세요.',
          hint: '손으로 미는 위치를 손잡이 맨 끝(' + R_MAX.toFixed(1) + ' m)으로 하고, 힘의 방향을 손잡이와 수직(90°)으로 한 뒤 🔧 돌려 보기를 눌러요.',
          setup() { resetSpanner(true); setScene('spanner'); },
          check: () => !!(S.sp.freed && S.sp.freed.F <= F_LOOSE),
          hold: 0.6,
          status: () => mark(!!(S.sp.freed && S.sp.freed.F <= F_LOOSE)) + ' 볼트 풀림 · 지금 τ = ' + spTau(S.sp).toFixed(1) + ' N·m (필요 ' + NEED + ')' + (S.sp.freed && S.sp.freed.F > F_LOOSE ? ' · 힘이 ' + F_LOOSE + ' N보다 컸어요, 다시 조여서 도전!' : ''),
          explain: 'r = ' + R_MAX.toFixed(1) + ' m, 수직이면 ℓ = ' + R_MAX.toFixed(2) + ' m라서 τ = ' + F_LOOSE + ' N × ' + R_MAX.toFixed(2) + ' m = <b>' + NEED + ' N·m</b>로 딱 풀려요. 같은 ' + F_LOOSE + ' N이라도 r = 0.2 m이면 τ = ' + (F_LOOSE * 0.2).toFixed(1) + ' N·m라서 풀리지 않아요. 긴 스패너를 쓰면 작은 힘으로도 돌릴 수 있어요.',
        },
        {
          title: '돌림힘 계기 읽기',
          goal: '돌림힘 계기가 정확히 <b>8.0 N·m</b>를 가리키게 만들고, 힘을 주는데도 계기가 <b>0</b>이 되는 방향도 찾아 보세요.',
          hint: '예) 40 N · 0.2 m · 수직이면 8.0 N·m예요. 계기가 0이 되려면 힘의 방향을 손잡이와 나란히(0°) 해 보세요.',
          setup() { resetSpanner(true); setScene('spanner'); },
          check: () => S.sp.seen8 && S.sp.seen0,
          hold: 0.6,
          status: () => mark(S.sp.seen8) + ' 8.0 N·m 만들기 &nbsp; ' + mark(S.sp.seen0) + ' 힘이 있는데 0 N·m 만들기 &nbsp; (지금 ' + spTau(S.sp).toFixed(1) + ' N·m)',
          explain: '8.0 N·m는 40 N × 0.20 m(또는 20 N × 0.40 m, 80 N × 0.10 m)로 만들 수 있어요. 힘을 손잡이와 나란히 하면 작용선이 볼트 중심을 지나 ℓ = 0이므로 힘이 아무리 커도 <b>τ = 0</b>이에요. 돌림힘은 힘의 크기만으로 정해지지 않아요.',
        },
        {
          type: 'quiz', title: '문의 경첩 쪽을 밀면?',
          goal: '문의 <b>경첩 가까이</b>를 밀면 같은 힘으로도 문손잡이 쪽을 밀 때보다 잘 열리지 않아요. 그 까닭은?',
          setup() { setScene('spanner'); },
          choices: ['돌림힘은 힘의 크기만으로 정해지는데, 경첩 쪽은 힘이 작아서', '경첩 쪽은 회전축에서 가까워 수직 거리 ℓ이 짧으므로 돌림힘이 작아서', '경첩 쪽을 밀면 문의 무게가 더 커져서', '경첩 쪽에서는 힘의 방향이 바뀌어서'],
          answer: 1,
          feedback: ['같은 힘으로 밀었다고 했어요. 힘의 크기가 같아도 돌림힘은 달라져요.', '', '문의 무게는 밀어도 변하지 않아요.', '힘의 방향이 같아도 축에서의 수직 거리가 달라지면 돌림힘이 달라져요.'],
          explain: '돌림힘 τ = F × ℓ이에요. 같은 힘이어도 회전축(경첩)에서 가까운 곳을 밀면 <b>ℓ이 짧아서 돌림힘이 작아요</b>. 그래서 문손잡이를 경첩에서 가장 먼 곳에 달아요.',
        },
      ],
    },
    {
      title: '회전 평형: 시소 수평 맞추기', short: '회전 평형', icon: '⚖️', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 돌림힘 τ = F × ℓ이고 반시계 방향이 +, 시계 방향이 −라는 것을 배웠어요. 시소에 두 추를 걸면 한쪽은 반시계, 다른 쪽은 시계 방향으로 돌리려 해요. 언제 수평이 될까요?</div>' +
        '<p>추의 무게 = 질량 × 10 N/kg(예: 30 kg → 300 N)이고, 받침점에서 추까지의 거리가 수직 거리예요(막대 무게는 무시). 추의 질량과 걸린 눈금을 바꿔 수평을 맞춰 봐요.</p>',
      features: ['seesaw'],
      setup() { resetSeesaw(true); resetRule(); showRule = false; setScene('seesaw'); },
      recap: '시계 방향 돌림힘의 합 = 반시계 방향 돌림힘의 합이면 회전하지 않고 수평(회전 평형)을 이뤄요. 무거운 추는 축 가까이에 걸면 돼요.',
      summary: '<ul><li><b>회전 평형</b>: 한 기준점(받침점)에 대한 시계 방향 돌림힘의 합 = 반시계 방향 돌림힘의 합</li><li>시소: m<sub>A</sub>g·x<sub>A</sub> = m<sub>B</sub>g·x<sub>B</sub></li><li>예) 30 kg(300 N)을 1.5 m에, 45 kg(450 N)을 1.0 m에 → 450 N·m = 450 N·m 수평</li><li>질량이 달라도 <b>거리를 다르게</b> 하면 평형을 이뤄요. 무거운 쪽이 항상 내려가는 것은 아니에요.</li><li>이때 받침점이 떠받치는 힘은 두 무게의 합(750 N)이에요.</li></ul>',
      missions: [
        {
          title: '질량이 다른 추로 수평 만들기',
          goal: '왼쪽과 오른쪽 추의 질량을 <b>다르게</b> 하고 거리를 맞춰 수평을 만드세요. 서로 다른 질량 조합으로 <b>2번</b> 성공해야 해요.',
          hint: '무거운 추는 받침점 가까이, 가벼운 추는 멀리 걸어요. 예) 30 kg을 1.5 m에, 45 kg을 1.0 m에. 추를 끌어서 눈금을 바꿔요.',
          setup() { resetSeesaw(true); showRule = false; setScene('seesaw'); },
          check: () => ssDiffBal().length >= 2,
          hold: 0.5,
          status: () => '서로 다른 질량 조합 ' + Math.min(2, ssDiffBal().length) + ' / 2 · ' + (ssTA(S.ss) === ssTB(S.ss) ? '지금 수평' : '지금 시계 ' + nf(ssTB(S.ss)) + ' vs 반시계 ' + nf(ssTA(S.ss)) + ' N·m'),
          explain: '수평일 때 m<sub>A</sub>g·x<sub>A</sub> = m<sub>B</sub>g·x<sub>B</sub>예요. 예) 30 kg × 10 × 1.5 m = <b>450 N·m</b> = 45 kg × 10 × 1.0 m. 질량이 달라도 <b>무게 × 거리</b>가 같으면 평형이에요.',
        },
        {
          title: '규칙 문장 완성하기', manual: true,
          goal: '실험에서 알게 된 규칙을 세 문장으로 완성하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '평형일 때 두 돌림힘의 크기는 같았어요. 돌림힘 = 힘 × 수직 거리였죠. 질량이 다른 두 추로도 수평을 만들었어요.',
          setup() { resetRule(); showRule = true; setScene('seesaw'); updateCtl(); },
          check() {
            const miss = RULE_Q.filter((q, i) => S.rule[i] === undefined || S.rule[i] === '');
            if (miss.length) return '아직 고르지 않은 문장이 ' + miss.length + '개 있어요.';
            let bad = 0;
            RULE_Q.forEach((q, i) => {
              const ok = +S.rule[i] === q.ans;
              if (!ok) bad++;
              if (!ok && S.ruleOK[i] !== false) { ruleSel[i].classList.remove('ok', 'bad'); void ruleSel[i].offsetWidth; ruleSel[i].classList.add('bad'); }
              if (ok) { ruleSel[i].classList.remove('bad'); ruleSel[i].classList.add('ok'); }
              S.ruleOK[i] = ok;
            });
            if (bad) return '빨간 칸을 다시 골라 보세요. 수평일 때 두 돌림힘은 어땠나요? 무거운 쪽이 항상 내려가던가요?';
            return true;
          },
          status: () => '고른 문장 ' + RULE_Q.filter((q, i) => S.rule[i]).length + ' / 3',
          explain: '수평(회전 평형)이면 <b>시계 방향 돌림힘의 합 = 반시계 방향 돌림힘의 합</b>이에요. 돌림힘은 <b>무게 × 수직 거리</b>이므로 질량이 달라도 거리를 조절하면 평형을 이룰 수 있어요. 무거운 쪽이 항상 내려가는 것이 아니에요.',
        },
      ],
    },
    {
      title: '알짜힘과 돌림힘이 모두 0', short: '두 조건', icon: '🌉', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 시소는 돌림힘의 합이 0일 때 수평이 되었어요. 중학교에서는 <b>알짜힘이 0</b>일 때 힘의 평형이라고 배웠죠. 평형을 이루려면 둘 중 하나만 0이면 될까요, 둘 다 0이어야 할까요?</div>' +
        '<p>먼저 마찰 없는 얼음 위의 막대로 <b>알짜힘 = 0인데도 도는 경우(우력)</b>를 확인하고, 이어서 널빤지 다리에서 두 조건을 모두 써서 <b>받침 힘</b>을 예측해 봐요. 기준점은 한 번에 하나만 잡아요.</p>',
      features: ['couple', 'plank'],
      setup() { resetCouple(); resetPlank(1); showRule = false; setScene('couple'); },
      recap: '평형이 되려면 ① 알짜힘 = 0 ② 한 기준점에 대한 돌림힘의 합 = 0, 두 조건을 모두 만족해야 해요.',
      summary: '<ul><li><b>평형 조건 2가지</b>: ① 알짜힘 ΣF = 0 (병진 평형) ② 한 기준점에 대한 돌림힘의 합 Στ = 0 (회전 평형)</li><li><b>우력</b>: 크기가 같고 방향이 반대인 두 힘이 다른 작용선에 있으면 ΣF = 0이어도 Στ ≠ 0이라서 <b>회전</b>해요. (예: 핸들 양쪽 10 N씩, 0.2 m → Στ = 4 N·m)</li><li>널빤지 다리: A 기준 N<sub>B</sub> × 4.0 = 200 × 2.0 + 400 × x → N<sub>B</sub> = 100 + 100x, N<sub>A</sub> = 600 − N<sub>B</sub> (x = 1.0 m → N<sub>B</sub> = 200 N, N<sub>A</sub> = 400 N)</li><li>평형이면 <b>어느 점을 기준점</b>으로 잡아도 돌림힘의 합이 0이에요. 단, 한 번에 한 점만 잡아요.</li><li>짐이 너무 멀면(x &gt; 5 m) N<sub>A</sub> &lt; 0이 되어 평형이 깨져요.</li></ul>',
      missions: [
        {
          title: '우력과 평형 만들기',
          goal: '▶ 힘 가하기로 ① 알짜힘이 <b>0</b>인데 <b>제자리에서 도는</b> 경우와 ② 힘을 가해도 <b>움직이지 않는 평형</b>을 각각 만들어 보세요.',
          hint: '① 왼쪽 끝 ↑10 N, 오른쪽 끝 ↓10 N. ② 양 끝에 위쪽 10 N씩, 가운데에 아래쪽 20 N.',
          setup() { resetCouple(); setScene('couple'); },
          check: () => S.cp.flags.couple && S.cp.flags.eq,
          hold: 0.5,
          status: () => mark(S.cp.flags.couple) + ' ΣF = 0인데 회전(우력) &nbsp; ' + mark(S.cp.flags.eq) + ' 힘이 있는데 정지(평형)',
          explain: '왼쪽 ↑10 N, 오른쪽 ↓10 N이면 ΣF = 0이지만, 두 힘의 돌림힘이 모두 시계 방향(−2 N·m씩)이라서 Στ = −2 − 2 = −4 N·m, 크기 <b>4 N·m</b>로 막대가 돌아요(우력). 양 끝 ↑10 N씩과 가운데 ↓20 N이면 ΣF = 0, Στ = 0이라서 <b>정지(평형)</b>예요. 두 조건이 모두 필요해요.',
        },
        {
          title: '받침 힘 N_B 예측하기', manual: true,
          goal: '짐(400 N)이 A에서 <b>1.0 m</b>에 있어요. A를 기준점으로 돌림힘 식을 세워 <b>N_B</b>를 예측해 입력하고 확인하세요. 기준점을 B로 바꿔서도 확인해 보세요.',
          hint: 'N_B × 4.0 = 200 × 2.0 + 400 × 1.0. 널빤지 무게 200 N은 가운데(A에서 2.0 m)에 작용해요.',
          setup() { resetPlank(1); $('#predIn').value = ''; setScene('plank'); },
          check() {
            const pl = S.pl;
            if (pl.x !== 1) return '짐을 A에서 1.0 m 위치에 놓아 주세요.';
            const raw = $('#predIn').value.trim();
            if (raw === '') return '예측값(N_B)을 입력해 주세요.';
            if (Math.round(+raw) !== plNB(1)) return 'A를 기준으로 쓴 식 N_B × 4.0 = 200 × 2.0 + 400 × 1.0을 다시 계산해 보세요.';
            if (!pl.rows.some((r) => r.x === 1 && r.pred === plNB(1))) return '확인 버튼을 눌러 센서의 측정값과 비교해 보세요.';
            if (!pl.sawB) return '기준점을 B 점으로 바꿔서 N_A를 다시 계산해 보세요. 결과가 같은가요?';
            return true;
          },
          status: () => mark(S.pl.rows.some((r) => r.x === 1 && r.pred === plNB(1))) + ' 예측 확인 &nbsp; ' + mark(S.pl.sawB) + ' 기준점 B로 바꿔 보기',
          explain: 'A를 기준점으로 하면 N<sub>B</sub> × 4.0 = 200 × 2.0 + 400 × 1.0 → <b>N<sub>B</sub> = 200 N</b>이고, 알짜힘 0에서 N<sub>A</sub> = 600 − 200 = <b>400 N</b>이에요. 기준점을 B로 바꿔도 N<sub>A</sub> × 4.0 = 200 × 2.0 + 400 × 3.0 → N<sub>A</sub> = 400 N으로 같아요. 평형이면 어느 점을 기준으로 잡아도 돌림힘의 합이 0이기 때문이에요.',
        },
        {
          type: 'quiz', title: '예측과 측정이 다를 때',
          goal: '실제 실험에서 예측한 N_B는 200 N인데 센서에는 193 N이 나왔어요. 가장 알맞은 해석은?',
          setup() { setScene('plank'); },
          choices: ['돌림힘 평형 조건이 성립하지 않는다는 증거예요', '널빤지 무게가 놓인 위치(무게중심)의 어림, 짐 위치·눈금 읽기의 오차, 센서 영점 오차 같은 까닭으로 조금 다를 수 있어요', '센서 값은 항상 옳으니 예측 식은 쓸모없어요', '이럴 때는 N_A + N_B = 600 N이 성립하지 않아도 돼요'],
          answer: 1,
          feedback: ['오차가 조금 있다고 평형 조건이 틀리는 것은 아니에요. 측정 도구와 가정의 한계를 먼저 따져 봐요.', '', '식은 이상적인 가정에서 세운 예측이에요. 차이가 나는 까닭을 찾으면 실험을 더 잘 설계할 수 있어요.', '평형이라면 두 받침 힘의 합은 전체 무게(600 N)와 같아야 해요. 차이가 크면 측정을 다시 점검해요.'],
          explain: '예측값과 측정값이 <b>조금</b> 다른 것은 흔해요. 널빤지가 균일하지 않아 무게중심이 약간 어긋나거나, 짐의 위치·센서 눈금을 읽을 때 오차가 있거나, 센서의 영점이 어긋난 경우예요. 차이가 작으면 모형(평형 조건)이 옳다고 볼 수 있어요.',
        },
      ],
    },
    {
      title: '구조물의 안정성', short: '안정성', icon: '🏗️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 알짜힘과 돌림힘이 모두 0이면 평형이라는 것을 배웠어요. 구조물은 <b>무게중심의 수직선이 받침면 안</b>에 있을 때 안정하고, 벗어나면 중력이 구조물을 넘어뜨리는 돌림힘을 만들어요.</div>' +
        '<p>기울어지는 직육면체, 크레인, 책장에 두 조건을 적용해 안정성을 분석해요. 회전축은 넘어지는 모서리 하나만 잡아요.</p>',
      features: ['tilt', 'crane', 'load'],
      setup() { resetTilt(); resetCrane(); resetLoad(); setScene('tilt'); },
      recap: '무게중심의 수직선이 받침면 안에 있으면 안정하고 벗어나면 넘어져요. 폭이 넓고 무게중심이 낮을수록 안정해요.',
      summary: '<ul><li><b>안정</b>: 무게중심의 수직선이 받침면(회전축이 되는 모서리) 안쪽 → 중력의 돌림힘이 되돌려요.</li><li><b>넘어짐</b>: 수직선이 받침면 밖 → 중력의 돌림힘이 넘어뜨려요.</li><li>한계 각 tan θ = (w ÷ 2) ÷ h: 폭 0.4 m, h 0.5 m → 21.8° / 폭 0.6 m → 31.0° / h 0.3 m → 33.7°</li><li>폭이 넓을수록, 무게중심이 낮을수록 안정해요. 무거운 짐은 <b>아래</b>에 실어요.</li><li>크레인 평형: 짐 2000 N × 6 m = 평형추 3000 N × 4 m = 12 000 N·m (탑 꼭대기 기준)</li></ul>',
      missions: [
        {
          title: '가장 안정한 구조 만들기',
          goal: '① 📦 기울기: 폭 <b>0.6 m</b>, 무게중심 <b>0.3 m</b>로 하고 <b>40°</b>까지 기울여도 서 있게 하세요. ② 📚 책장: 무거운 책을 <b>아래칸</b>에 두고 <b>25°</b>까지 기울여도 서 있게 하세요.',
          hint: '폭을 넓히고 무게중심을 낮추면 한계 각이 커져요. 📦 기울기 화면에서 먼저 해 보고, 📚 책장 화면으로 바꿔 보세요.',
          setup() { resetTilt(); resetLoad(); setScene('tilt'); },
          check: () => S.tl.latch && S.ld.latch,
          hold: 0.5,
          status: () => mark(S.tl.latch) + ' 📦 폭 0.6 m · h 0.3 m · 40° &nbsp; ' + mark(S.ld.latch) + ' 📚 아래칸 · 25°',
          explain: '폭 0.6 m, h 0.3 m이면 tan θ = 0.30 ÷ 0.30 = 1.00 → <b>45°</b>까지 서 있어요. 책장은 무거운 책을 아래칸에 두면 무게중심이 낮아져 한계 각이 32.6°로 커지고, 위칸에 두면 16.2°로 줄어요.',
        },
        {
          title: '크레인 평형 맞추기',
          goal: '평형추(3000 N)의 위치를 조절해 짐의 무게가 <b>서로 다른 두 경우</b>에서 크레인을 평형으로 만드세요.',
          hint: '탑 꼭대기를 기준으로 짐의 돌림힘 = 평형추의 돌림힘이어야 해요. 예) 2000 N을 6 m에 달면 평형추는 4.0 m에 두어요.',
          setup() { resetCrane(); setScene('crane'); },
          check: () => Object.keys(S.cr.bal).map((k) => S.cr.bal[k].wl).filter((v, i, a) => a.indexOf(v) === i).length >= 2,
          hold: 0.5,
          status: () => '서로 다른 짐 무게로 평형 ' + Math.min(2, Object.keys(S.cr.bal).map((k) => S.cr.bal[k].wl).filter((v, i, a) => a.indexOf(v) === i).length) + ' / 2 · ' + (crTL(S.cr) === crTC(S.cr) ? '지금 평형' : '지금 ' + nf(crTL(S.cr)) + ' vs ' + nf(crTC(S.cr)) + ' N·m'),
          explain: '평형일 때 W<sub>짐</sub> × d<sub>짐</sub> = 3000 N × d<sub>추</sub>예요. 2000 N을 6 m에 달면 12 000 N·m = 3000 N × <b>4 m</b>이고, 3000 N을 6 m에 달면 평형추를 <b>6 m</b>에 두어야 해요. 이때 탑은 짐과 평형추의 무게 합을 떠받쳐요.',
        },
        {
          type: 'quiz', title: 'SUV와 승용차',
          goal: '같은 도로에서 급하게 방향을 틀 때, <b>SUV</b>가 승용차보다 전복되기 쉬운 가장 알맞은 까닭은?',
          setup() { setScene('tilt'); },
          choices: ['SUV는 무게가 가벼워서', 'SUV는 무게중심이 높고 폭이 상대적으로 좁아, 무게중심의 수직선이 받침면을 벗어나는 한계 각이 작아서', 'SUV는 바퀴가 커서 항상 돌림힘이 0이어서', '승용차는 알짜힘이 항상 0이어서'],
          answer: 1,
          feedback: ['오히려 SUV가 더 무거운 경우가 많아요. 전복은 무게 자체보다 무게중심의 높이와 폭이 좌우해요.', '', '바퀴의 크기와 돌림힘이 0이 되는 것은 관계가 없어요.', '승용차도 방향을 틀 때는 알짜힘이 0이 아니에요. 핵심은 무게중심의 높이와 받침면의 폭이에요.'],
          explain: 'tan θ한계 = (폭 ÷ 2) ÷ 무게중심 높이예요. 무게중심이 높고 폭이 좁은 SUV는 <b>한계 각이 작아</b> 조금만 기울어도 수직선이 받침면을 벗어나 넘어지기 쉬워요. 그래서 책장도 무거운 책을 아래칸에 두는 것이 안전해요.',
        },
      ],
    },
  ];

  /* 이어 하기(새로고침)로 중간 미션에서 열려도 미션 setup()이 먼저 만든 장면을 덮어쓰지 않도록, 장면 상태를 게임보다 먼저 만들어요 */
  resetSpanner(); resetSeesaw(true); resetCouple(); resetPlank(1); resetTilt(); resetCrane(); resetLoad(); resetRule();
  setScene('spanner');
  game = SciSim.game({
    simId: 'hp-torque-equilibrium', mount: '#game', badge: '평형 박사', homeHref: '../../index.html#hp',
    featureLabels: { spanner: '🔧 스패너 · 돌림힘 계기', seesaw: '⚖️ 시소 · 시계/반시계 돌림힘 막대', couple: '🌀 우력 · 얼음 위 막대', plank: '🌉 널빤지 다리 · 받침 힘 센서', tilt: '📦 기울어지는 직육면체 · 각도 센서', crane: '🏗️ 크레인 · 평형추', load: '📚 책장 · 짐 쌓기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    switch (S.mode) {
      case 'spanner': stepSpanner(dt); drawSpannerScene(dt); break;
      case 'seesaw': stepSeesaw(dt); drawSeesaw(dt); break;
      case 'couple': stepCouple(dt); drawCouple(dt); break;
      case 'plank': stepPlank(dt); drawPlank(dt); break;
      case 'tilt': stepTilt(dt); drawTilt(dt); break;
      case 'crane': stepCrane(dt); drawCrane(dt); break;
      default: stepLoad(dt); drawLoad(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, spSet, spRun, spTau, resetSpanner, resetSeesaw, ssTA, ssTB, cpSetF, cpRunTrial, plSetX, plAddRow, plNB, plNA, tlConfig, tlSetDeg, thC, resetCrane, resetTilt, resetLoad, crTL, crTC, ldSetPos, ldSetDeg, ldTc, ldH, ssBlock, PAX, PPM3, SCX, SPPM2, SPO, SPPM,
    stepAll(sec) {
      const n = Math.ceil(sec / 0.02);
      const fn = { spanner: stepSpanner, seesaw: stepSeesaw, couple: stepCouple, plank: stepPlank, tilt: stepTilt, crane: stepCrane, load: stepLoad }[S.mode];
      for (let i = 0; i < n; i++) fn(0.02);
    },
  };
})();
