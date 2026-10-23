/* =========================================================
   역학과 에너지 Ⅰ. 시공간과 운동 - 포물선 운동과 에너지 (3차시)
   성취기준 [12역학01-02] 뉴턴 운동 법칙을 이용하여 물체의 포물선 운동을 정량적으로 설명하고, 포물선 운동에서의 역학적 에너지를 구할 수 있다. (뒷부분: 역학적 에너지)
   ① 분석: 영상 분석 (프레임의 위치 차이로 속력, E_k = ½mv², E_p = mgh, E = E_k + E_p)
   ② 확인: 에너지 보존 (E_k와 E_p가 교환되고 합은 일정, 공기 저항을 켜면 E가 줄어 열이 됨)
   ③ 모형: 속력 예측 (½mv₀² = ½mv² + mgh → v² = v₀² − 2gh, 질량·각도와 무관)
   ④ 적용: 옥상에서 던지기, 농구 자유투
   만유인력 위치 에너지·회전 운동 에너지는 다루지 않아요. g = 10 m/s².
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 720 : 560;
  const SH = PHONE ? 340 : 300;
  const PX = 10, PY = SH + 6, PW = VW - 20, PH = VH - SH - 16;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const MINUS = '−';
  const fx = (v, d) => { const s = Math.abs(v).toFixed(d); return (v < 0 && +s !== 0 ? MINUS : '') + s; };

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef2fa' });
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
  function labIn(x, y, str, o, x0, x1) {
    ctx.save(); ctx.font = D.font(Math.max(13, o.size || 13), 800); const w = ctx.measureText(str).width + 16; ctx.restore();
    const al = o.align || 'center';
    let lx = al === 'left' ? x : al === 'right' ? x - w : x - w / 2;
    lx = Math.max(x0, Math.min(x1 - w, lx));
    return D.label(al === 'left' ? lx : al === 'right' ? lx + w : lx + w / 2, y, str, Object.assign({}, o, { align: al }));
  }
  function lines(x, y, lh, fs, arr) { arr.forEach((l, i) => T(x, y + i * lh, l[0], fs, l[1] || '#26324a', 'left', 800)); }
  function axes(rc, o) {
    const ml = PHONE ? 36 : 40, mr = 12, mt = 30, mb = 28;
    const ix = rc.x + ml, iy = rc.y + mt, iw = rc.w - ml - mr, ih = rc.h - mt - mb;
    card(rc.x, rc.y, rc.w, rc.h);
    const gx = (xv) => ix + iw * (xv - o.xmin) / (o.xmax - o.xmin), gy = (yv) => iy + ih - ih * (yv - o.ymin) / (o.ymax - o.ymin);
    for (let yv = o.ymin; yv <= o.ymax + 1e-9; yv += o.ystep) {
      const z = Math.abs(yv - o.ymin) < 1e-9;
      ctx.strokeStyle = z ? '#516079' : 'rgba(120,135,160,.25)'; ctx.lineWidth = z ? 2 : 1; ctx.beginPath(); ctx.moveTo(ix, gy(yv)); ctx.lineTo(ix + iw, gy(yv)); ctx.stroke();
      T(ix - 6, gy(yv) + 5, o.yd != null ? yv.toFixed(o.yd) : String(+yv.toFixed(2)), 13, '#3a465c', 'right', 800);
    }
    for (let xv = o.xmin; xv <= o.xmax + 1e-9; xv += o.xstep) {
      ctx.strokeStyle = 'rgba(120,135,160,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(xv), iy); ctx.lineTo(gx(xv), iy + ih); ctx.stroke();
      T(gx(xv), iy + ih + 17, o.xd != null ? xv.toFixed(o.xd) : String(+xv.toFixed(2)), 13, '#3a465c', 'center', 800);
    }
    T(rc.x + 10, rc.y + 21, o.title, 13.5, '#26324a', 'left', 800);
    if (o.right) T(rc.x + rc.w - 8, rc.y + 21, o.right, 13.5, '#c2410c', 'right', 800);
    return { gx, gy, ix, iy, iw, ih };
  }

  /* ================= 상수 ================= */
  const G = 10, M = 0.50, FDT = 0.2, NFMAX = 9;
  const V0 = 10, E0 = 0.5 * M * V0 * V0;                    // 영상 속 공: v₀ = 10 m/s (53°), 처음 에너지 25 J
  const NOISE = [0, 0.03, -0.02, 0.02, -0.03, 0.03, -0.02, 0.02, 0];   // 위치 읽기 오차 (m): 눈금 오차 때문에 E의 합이 조금 흔들려요
  const AIR_C = 0.033;                                      // 공기 저항 계수 (a = −c|v|v, 1/m)
  const ENDS = { a: { h0: 5, v0: 10 }, b: { h0: 2.0, v0: 7.5, th: 59, rx: 4.2, ry: 3.05 } };

  /* ---------- 영상 데이터 (참값) ---------- */
  function buildClean() { const a = []; for (let k = 0; k < NFMAX; k++) { const t = FDT * k; a.push({ t, x: 6 * t, y: 8 * t - 5 * t * t }); } return a; }
  function buildAir() {
    const dense = [], fr = [];
    let x = 0, y = 0, vx = 6, vy = 8, n = 0, H = 0; const dt = 0.0005;
    dense.push({ t: 0, x, y }); fr.push({ t: 0, x, y });
    let tEnd = null, vEnd = null;
    while (n < 5000) {
      const sp = Math.hypot(vx, vy);
      vx += -AIR_C * sp * vx * dt; vy += (-G - AIR_C * sp * vy) * dt; x += vx * dt; y += vy * dt; n++;
      H = Math.max(H, y);
      if (y < 0) { tEnd = n * dt; vEnd = Math.hypot(vx, vy); break; }
      if (n % 40 === 0) dense.push({ t: n * dt, x, y });
      if (n % 400 === 0) fr.push({ t: n * dt, x, y });
    }
    return { fr, dense, H, tEnd, Eend: 0.5 * M * vEnd * vEnd };
  }
  const CLEAN = buildClean(), AIR = buildAir();
  const frames = (air) => (air ? AIR.fr : CLEAN);
  const nFrames = (air) => frames(air).length;
  function ballAt(air, t) {
    if (!air) return { x: 6 * t, y: 8 * t - 5 * t * t };
    const d = AIR.dense, i = Math.min(d.length - 2, Math.max(0, Math.floor(t / 0.02 + 1e-9))), a = d[i], b = d[i + 1], u = clamp((t - a.t) / (b.t - a.t), 0, 1);
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  }
  /* 측정값: 찍은 위치 → 표 */
  function mrow(air, k) {
    const F = frames(air), f = F[k], ym = f.y + NOISE[k];
    const row = { t: f.t, x: f.x, y: ym, Ep: M * G * ym, v: null, Ek: null, E: null, vx: null, vy: null };
    if (k > 0 && k < F.length - 1) {
      const a = F[k - 1], b = F[k + 1];
      row.vx = (b.x - a.x) / (2 * FDT); row.vy = ((b.y + NOISE[k + 1]) - (a.y + NOISE[k - 1])) / (2 * FDT);
      row.v = Math.hypot(row.vx, row.vy); row.Ek = 0.5 * M * row.v * row.v; row.E = row.Ek + row.Ep;
    }
    return row;
  }

  /* ---------- 비행 (③ ④) ---------- */
  function flightE(v0, th, h0) {
    const r = th * RAD, vx = v0 * Math.cos(r), vy = v0 * Math.sin(r);
    const Tt = (vy + Math.sqrt(vy * vy + 2 * G * h0)) / G;
    const tH = vy > 0 ? vy / G : 0, H = h0 + (vy > 0 ? vy * vy / (2 * G) : 0);
    return { vx, vy, T: Tt, tH, H, R: vx * Tt, h0, v0 };
  }
  const posF = (f, t) => ({ x: f.vx * t, y: f.h0 + f.vy * t - 0.5 * G * t * t });
  const speedF = (f, t) => Math.hypot(f.vx, f.vy - G * t);
  /* 높이 h를 지나는 시각 (올라갈 때, 내려올 때) */
  function crossT(f, h) {
    const d = f.vy * f.vy - 2 * G * (h - f.h0); if (d < 0) return null;
    const s = Math.sqrt(d); return { up: (f.vy - s) / G, down: (f.vy + s) / G };
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'video', clock: 0, fade: 0,
    vd: { fr: 0, tp: 0, play: false, mk: new Array(NFMAX).fill(false) },
    air: false, airSeen: false, eShow: false,
    bar: { ek: 0, ep: 0, e: 0 },
    sp: { m: 0.5, th: 53, h: 1.4, st: 'idle', t: 0, fl: null, thrown: {}, rows: {}, scale: null },
    ap: { sc: 'a', st: 'idle', t: 0, balls: null, done: { a: false, b: false }, res: null, scale: null },
    flags: { mE: false, eIn: false, vIn: false, pIn: false, hide: false, lockH: false, ang: false },
  };
  let game = null;
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const eff = (k) => (game && game.free ? k === 'ang' : S.flags[k]);
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); S.vd.play = false; if (S.sp.st === 'run') { S.sp.st = 'idle'; S.sp.t = 0; } if (S.ap.st === 'run') { S.ap.st = 'idle'; S.ap.t = 0; } }
    S.mode = mode;
    updateCtl();
  }
  const NF = () => nFrames(S.air);
  const marked = () => { const n = NF(); return S.vd.mk.slice(0, n); };
  const vReady = (k) => { const n = NF(), m = S.vd.mk; return k > 0 && k < n - 1 && m[k - 1] && m[k] && m[k + 1]; };
  const readyRows = () => { let c = 0; for (let k = 1; k < NF() - 1; k++) if (vReady(k)) c++; return c; };

  /* ================= 영상 장면 (① ②) ================= */
  const VR = () => {
    const fr = PHONE ? { x: 8, y: 44, w: VW - 16, h: SH - 56 } : { x: 8, y: 44, w: 462, h: SH - 56 };
    const bars = PHONE ? { x: PX + 8, y: PY + 6, w: 128, h: 158 } : { x: 478, y: 44, w: 112, h: SH - 56 };
    const side = PHONE ? { x: PX + 8, y: PY + 6, w: PW - 16, h: 158 } : { x: 478, y: 44, w: VW - 486, h: SH - 56 };
    const graph = PHONE ? { x: PX + 144, y: PY + 6, w: PW - 152, h: 158 } : { x: 598, y: 44, w: VW - 606, h: SH - 56 };
    const table = PHONE ? { x: PX + 8, y: PY + 172, w: PW - 16, h: PH - 180 } : { x: PX + 8, y: PY + 8, w: PW - 16, h: PH - 16 };
    const sV = (fr.w - 34) / 10.4, X0 = fr.x + 22, gy = fr.y + fr.h - 28;
    return { fr, bars, side, graph, table, sV, X0, gy, X: (x) => X0 + x * sV, Y: (y) => gy - y * sV };
  };
  const vdTime = () => (S.vd.play ? S.vd.tp : S.vd.fr * FDT);
  function setFrame(k) { const v = S.vd; v.fr = clamp(k, 0, NF() - 1); v.tp = v.fr * FDT; if (S.air && v.fr >= NF() - 1) S.airSeen = true; }
  function drawVideo(dt) {
    const v = S.vd, g = VR(), { fr, X, Y, gy, sV } = g, energy = S.mode === 'energy';
    const n = NF();
    if (v.play) {
      const tmax = (n - 1) * FDT;
      v.tp = Math.min(tmax, v.tp + dt * 0.5 * (RM ? 4 : 1));
      v.fr = Math.round(v.tp / FDT);
      if (v.tp >= tmax - 1e-9) { v.play = false; setFrame(n - 1); updateCtl(); }
      else if (S.air && v.fr >= n - 1) S.airSeen = true;
    }
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    T(14, 28, PHONE ? (energy ? '⚡ 에너지는 어떻게 변할까?' : '🎞️ 던진 공의 영상 (격자 1 m)') : (energy ? '⚡ 공이 날아가는 동안 에너지가 어떻게 바뀌는지 살펴봐요' : '🎞️ 던진 공의 영상을 프레임마다 분석해요 (m = 0.50 kg, 격자 1 m)'), PHONE ? 14 : 17, '#26324a', 'left', 800);
    // 영상 틀
    D.shadow(() => { D.roundRect(fr.x, fr.y, fr.w, fr.h, 12); ctx.fillStyle = '#1c2a44'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.save(); ctx.beginPath(); D.roundRect(fr.x + 3, fr.y + 3, fr.w - 6, fr.h - 6, 10); ctx.clip();
    const sky = ctx.createLinearGradient(0, fr.y, 0, gy); sky.addColorStop(0, S.air ? '#4a4f66' : '#2b4a7a'); sky.addColorStop(1, S.air ? '#8a97ad' : '#6f9ccb'); ctx.fillStyle = sky; ctx.fillRect(fr.x, fr.y, fr.w, fr.h);
    ctx.fillStyle = '#5a8f48'; ctx.fillRect(fr.x, gy, fr.w, fr.h);
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1;
    for (let m = 0; m <= 10; m++) { ctx.beginPath(); ctx.moveTo(X(m), fr.y); ctx.lineTo(X(m), gy); ctx.stroke(); if (m % 2 === 0) T(X(m), gy + 18, m + ' m', 13, '#e7f6df', 'center', 800); }
    for (let m = 0; m <= 4; m++) { ctx.beginPath(); ctx.moveTo(fr.x, Y(m)); ctx.lineTo(fr.x + fr.w, Y(m)); ctx.stroke(); T(fr.x + 8, Y(m) - 3, m + ' m', 13, '#cfe0f5', 'left', 800); }
    // 공기 저항 켠 경우: 공기 저항이 없을 때의 궤적(점선)과 비교
    if (S.air) { ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const q = 1.6 * i / 40, p = ballAt(false, q); if (i) ctx.lineTo(X(p.x), Y(p.y)); else ctx.moveTo(X(p.x), Y(p.y)); } ctx.stroke(); ctx.setLineDash([]); }
    // 찍은 마커
    v.mk.forEach((m, k) => { if (!m || k >= n) return; const q = frames(S.air)[k], x = X(q.x), y = Y(q.y); ctx.strokeStyle = '#ffd447'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6); ctx.stroke(); T(x, y - 12, String(k), 13, '#ffe58a', 'center', 800); });
    const t = vdTime(), pos = ballAt(S.air, t), bx = X(pos.x), by = Y(pos.y);
    D.sphere(bx, by, 9, '#fff3c4', { shadow: true, outline: '#e0b84a' });
    ctx.restore();
    // 최고점 표시 (공기 저항 켰을 때)
    if (S.air) { D.label(fr.x + fr.w - 12, fr.y + 50, '공기 저항 ON: 최고점 약 ' + AIR.H.toFixed(1) + ' m (OFF: 3.2 m)', { bg: 'rgba(185,28,28,.9)', size: 13, align: 'right' }); }
    D.label(fr.x + fr.w - 12, fr.y + 22, '프레임 ' + v.fr + ' / ' + (n - 1) + ' · t = ' + (v.play ? t.toFixed(2) : (v.fr * FDT).toFixed(1)) + ' s', { bg: 'rgba(0,0,0,.55)', size: 13, align: 'right' });
    if (S.air && v.play === false && v.fr > 0) { /* 열 파티클 */ }
    if (S.air && !RM && Math.random() < 0.25 && t > 0 && t < 1.45) parts.burst(bx, by, { count: 1, speed: 30, size: 2.4, colors: ['#ff8a5b', '#ffd1a1'], gravity: -40, life: 0.6 });
    // 오른쪽 / 위 카드
    if (!PHONE) { ctx.fillStyle = '#e4eaf5'; ctx.fillRect(0, SH, VW, VH - SH); }
    panel(PX, PY, PW, PH, 16);
    const row = v.mk[v.fr] ? mrow(S.air, v.fr) : null;
    if (!energy) drawCalcCard(g.side, row);
    else drawEnergyViews(g, row);
    drawTable(g.table);
    parts.update(dt); parts.draw(ctx);
  }
  function drawCalcCard(rc, row) {
    card(rc.x, rc.y, rc.w, rc.h);
    T(rc.x + 10, rc.y + 22, '🧮 이 프레임의 속력 계산', 13.5, '#26324a', 'left', 800);
    const k = S.vd.fr, ok = vReady(k), lh = PHONE ? 25 : 31, x0 = rc.x + 12, y0 = rc.y + 54, fs = PHONE ? 13 : 14.5;
    if (!ok) {
      T(x0, y0, k === 0 || k === NF() - 1 ? '양 끝 프레임은 이웃이 한쪽뿐이라' : '앞 프레임과 뒤 프레임을 모두', fs, '#5a6679', 'left', 800);
      T(x0, y0 + lh * 0.85, k === 0 || k === NF() - 1 ? '속력을 구하지 않아요.' : '찍으면 속력이 계산돼요.', fs, '#5a6679', 'left', 800);
      T(x0, y0 + lh * 2.1, 'v = √(vx² + vy²)', fs, '#26324a', 'left', 800);
      T(x0, y0 + lh * 3, 'vx = (다음 x − 이전 x) / 0.4 s', fs, '#1d4ed8', 'left', 800);
      T(x0, y0 + lh * 3.9, 'vy = (다음 y − 이전 y) / 0.4 s', fs, '#b45309', 'left', 800);
      return;
    }
    const r = mrow(S.air, k);
    lines(x0, y0, lh, fs, [
      ['vx = (다음 x − 이전 x) / 0.4 s = ' + r.vx.toFixed(2) + ' m/s', '#1d4ed8'],
      ['vy = (다음 y − 이전 y) / 0.4 s = ' + fx(r.vy, 2) + ' m/s', '#b45309'],
      ['v = √(vx² + vy²) = ' + r.v.toFixed(2) + ' m/s', '#0b6b39'],
      [S.eShow ? 'E_k = ½mv² = ' + r.Ek.toFixed(1) + ' J' : 'E_k = ½mv² = ?', '#c2410c'],
      [S.eShow ? 'E_p = mgy = ' + r.Ep.toFixed(1) + ' J' : 'E_p = mgy = ?', '#1d4ed8'],
    ].slice(0, PHONE ? 5 : 5));
  }
  const E_MAX = 30;
  function drawEnergyViews(g, row) {
    const v = S.vd, k = v.fr, ok = vReady(k), rc = g.bars, gr = g.graph;
    // 막대 (E_k, E_p, E) - 눈금은 1 J당 같은 길이
    const tgt = ok ? mrow(S.air, k) : null;
    S.bar.ek = approach(S.bar.ek, tgt ? tgt.Ek : 0, 0.016, 10); S.bar.ep = approach(S.bar.ep, tgt ? tgt.Ep : 0, 0.016, 10); S.bar.e = approach(S.bar.e, tgt ? tgt.E : 0, 0.016, 10);
    card(rc.x, rc.y, rc.w, rc.h);
    T(rc.x + rc.w / 2, rc.y + 20, '에너지 (J)', 13.5, '#26324a', 'center', 800);
    const top = rc.y + 56, base = rc.y + rc.h - 30, hh = base - top, bw = 26, gap = (rc.w - 3 * bw) / 4;
    for (let j = 0; j <= 3; j++) { const yy = base - hh * j * 10 / E_MAX; ctx.strokeStyle = 'rgba(120,135,160,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rc.x + 6, yy); ctx.lineTo(rc.x + rc.w - 6, yy); ctx.stroke(); if (j) T(rc.x + 7, yy - 3, String(j * 10), 13, '#7b879c', 'left', 800); }
    [['E_k', S.bar.ek, '#f59e0b', tgt && tgt.Ek], ['E_p', S.bar.ep, '#3867f4', tgt && tgt.Ep], ['E', S.bar.e, '#14a058', tgt && tgt.E]].forEach(([nm, val, col, num], i) => {
      const x = rc.x + gap * (i + 1) + bw * i, h = clamp(val, 0, E_MAX) / E_MAX * hh;
      D.shadow(() => { D.roundRect(x, base - h, bw, Math.max(h, 0.5), 4); const gg = ctx.createLinearGradient(x, 0, x + bw, 0); gg.addColorStop(0, col); gg.addColorStop(1, SciSim.color.shade(col, -0.25)); ctx.fillStyle = gg; ctx.fill(); }, { blur: 4, y: 2 });
      T(x + bw / 2, base + 17, nm, 13, '#26324a', 'center', 800);
      T(x + bw / 2, Math.min(base - 6, base - h - 6), num != null ? num.toFixed(1) : '—', 13, col === '#14a058' ? '#0b6b39' : '#26324a', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    });
    // 그래프 E–t (찍은 프레임까지 실시간으로)
    const a = axes(gr, { xmin: 0, xmax: 1.6, xstep: 0.4, xd: 1, ymin: 0, ymax: E_MAX, ystep: 10, yd: 0, title: '에너지 – 시간 그래프' });
    ctx.save(); ctx.beginPath(); ctx.rect(a.ix, a.iy, a.iw, a.ih); ctx.clip();
    ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(20,160,88,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.gx(0), a.gy(E0)); ctx.lineTo(a.gx(1.6), a.gy(E0)); ctx.stroke(); ctx.setLineDash([]);
    const series = (key, col) => {
      const pts = []; for (let j = 1; j <= Math.min(k, NF() - 2); j++) if (vReady(j)) pts.push({ t: j * FDT, val: mrow(S.air, j)[key] });
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); pts.forEach((p, i) => { if (i) ctx.lineTo(a.gx(p.t), a.gy(p.val)); else ctx.moveTo(a.gx(p.t), a.gy(p.val)); }); ctx.stroke();
      pts.forEach((p) => D.sphere(a.gx(p.t), a.gy(p.val), 4, col, { gloss: false, outline: '#fff', outlineWidth: 1 }));
    };
    series('Ek', '#f59e0b'); series('Ep', '#3867f4'); series('E', '#14a058');
    ctx.restore();
    T(a.ix + a.iw - 2, a.gy(E0) - 6, '처음 E = ' + E0.toFixed(0) + ' J', 13, '#0b6b39', 'right', 800);
    [['E_k', '#f59e0b'], ['E_p', '#3867f4'], ['E', '#14a058']].forEach(([nm, col], i) => { D.sphere(gr.x + gr.w - 70 + (i % 3) * 0, gr.y + 12, 0.1, col, { gloss: false }); });
  }
  function drawTable(tb) {
    const v = S.vd, n = NF();
    card(tb.x, tb.y, tb.w, tb.h);
    T(tb.x + 10, tb.y + 18, '📋 영상 분석 표 (m = 0.50 kg)', 13.5, '#26324a', 'left', 800);
    T(tb.x + tb.w - 10, tb.y + 18, '속력은 앞뒤 프레임의 위치 차이로 구해요', 13, '#5a6679', 'right', 800);
    const rows = ['t (s)', 'y (m)', 'v (m/s)', 'E_k (J)', 'E_p (J)', 'E (J)'], c0 = tb.x + (PHONE ? 6 : 10), lw = PHONE ? 58 : 76, cw = (tb.w - lw - 14) / NFMAX, rh = Math.min(PHONE ? 22 : 27, (tb.h - 30) / 6.3), y0 = tb.y + 26;
    rows.forEach((r, i) => T(c0, y0 + (i + 1) * rh, r, 13, ['#5a6679', '#5a6679', '#5a6679', '#c2410c', '#1d4ed8', '#0b6b39'][i], 'left', 800));
    for (let k = 0; k < NFMAX; k++) {
      const cx = c0 + lw + cw * k;
      if (k >= n) { T(cx, y0 + rh, '—', 13, '#c8cfdc', 'left', 800); continue; }
      if (v.fr === k) { ctx.fillStyle = 'rgba(56,103,244,.1)'; ctx.fillRect(cx - 3, y0 + 4, cw, rh * 6.1); }
      const got = v.mk[k], vr = vReady(k), r = got ? mrow(S.air, k) : null;
      const cell = (i, s, col) => T(cx, y0 + (i + 1) * rh, s, 13, col, 'left', 800);
      cell(0, (k * FDT).toFixed(1), '#26324a');
      cell(1, got ? r.y.toFixed(2) : '·', got ? '#26324a' : '#b4bccb');
      cell(2, vr ? r.v.toFixed(2) : '·', vr ? '#0b6b39' : '#b4bccb');
      if (vr) { cell(3, S.eShow ? r.Ek.toFixed(1) : '?', S.eShow ? '#c2410c' : '#98a2b3'); cell(4, S.eShow ? r.Ep.toFixed(1) : '?', S.eShow ? '#1d4ed8' : '#98a2b3'); cell(5, S.eShow ? r.E.toFixed(1) : '?', S.eShow ? '#0b6b39' : '#98a2b3'); }
      else { cell(3, '·', '#b4bccb'); cell(4, got && S.eShow ? r.Ep.toFixed(1) : '·', got && S.eShow ? '#1d4ed8' : '#b4bccb'); cell(5, '·', '#b4bccb'); }
    }
  }
  function vdMark(k) {
    const v = S.vd; if (k >= NF()) return;
    if (v.mk[k]) { showHint('이 프레임은 이미 찍었어요. 다른 프레임으로 넘겨요.', 2200); return; }
    v.mk[k] = true; Sound.click(); updateCtl();
    const g = VR(), q = frames(S.air)[k];
    parts.burst(g.X(q.x), g.Y(q.y), { count: 8, speed: 80, size: 2.6, colors: ['#ffd447', '#fff'], gravity: 40, life: 0.5 });
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'video' && !S.vd.play) {
        const g = VR(), k = S.vd.fr, q = frames(S.air)[k];
        if (q && Math.hypot(p.x - g.X(q.x), p.y - g.Y(q.y)) < 30) vdMark(k);
        return false;
      }
      if (S.mode === 'speed') { const c = spGeo(); if (Math.abs(p.y - c.Y(S.sp.h)) < 18 && p.x < c.right && !eff('lockH')) { dragH = true; return true; } }
      return false;
    },
    move(p) { if (!dragH) return; const c = spGeo(); const h = clamp(Math.round((c.gy - p.y) / c.s * 10) / 10, 0, 3.2); setH(h); },
    up() { dragH = false; },
    hover(p) {
      if (S.mode === 'video' && !S.vd.play) { const g = VR(), q = frames(S.air)[S.vd.fr]; return q && Math.hypot(p.x - g.X(q.x), p.y - g.Y(q.y)) < 30 ? 'pointer' : ''; }
      if (S.mode === 'speed') { const c = spGeo(); return Math.abs(p.y - c.Y(S.sp.h)) < 18 && p.x < c.right && !eff('lockH') ? 'ns-resize' : ''; }
      return '';
    },
  });
  let dragH = false;

  /* ================= ③ 속력 예측 ================= */
  const spFl = () => flightE(V0, S.sp.th, 0);
  function spGeo() {
    const gy = SH - 34, ox = PHONE ? 26 : 56, right = PHONE ? VW - 14 : VW - 202;
    const s = Math.min((right - ox - 6) / 10.8, (gy - 56) / 4.4);
    return { gy, ox, s, right, X: (x) => ox + x * s, Y: (y) => gy - y * s };
  }
  function setH(h) { const p = S.sp; if (p.h === h) return; p.h = h; if (p.st === 'done') { p.st = 'idle'; p.t = 0; } updateCtl(); }
  function spThrow() {
    const p = S.sp; if (p.st === 'run') return;
    p.fl = spFl(); p.st = 'run'; p.t = 0; p.cx = crossT(p.fl, p.h); p.mass = p.m; parts.clear(); Sound.click(); updateCtl();
  }
  function spStep(dt) {
    const p = S.sp; if (p.st !== 'run') return;
    p.t = Math.min(p.fl.T, p.t + dt * (RM ? 4 : 0.8));
    if (p.t >= p.fl.T - 1e-9) {
      p.t = p.fl.T; p.st = 'done'; Sound.success();
      p.thrown[p.mass] = true;
      const c = p.cx, f = p.fl;
      p.rows[p.mass] = { m: p.mass, th: p.th, h: p.h, up: c ? speedF(f, c.up) : null, down: c ? speedF(f, c.down) : null, E: 0.5 * p.mass * V0 * V0 };
      const g = spGeo(); parts.burst(g.X(f.R), g.gy - 4, { count: 10, speed: 100, size: 3, colors: ['#14a058', '#ffd447', '#fff'], gravity: 140, life: 0.7 });
      updateCtl();
    }
  }
  function drawSpeed(dt) {
    const p = S.sp, f = p.st === 'idle' || !p.fl ? spFl() : p.fl, g = spGeo(), { gy, ox, s, X, Y } = g;
    const sky = ctx.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, '#cfe6fb'); sky.addColorStop(1, '#f1f8ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, SH);
    ctx.fillStyle = '#e4eaf5'; ctx.fillRect(0, SH, VW, VH - SH);
    const gr = ctx.createLinearGradient(0, gy, 0, SH); gr.addColorStop(0, '#9fd08a'); gr.addColorStop(1, '#7fb46a'); ctx.fillStyle = gr; ctx.fillRect(0, gy, VW, SH - gy);
    ctx.fillStyle = '#5f9a4e'; ctx.fillRect(0, gy, VW, 3);
    for (let m = 0; X(m) < g.right; m += 2) { ctx.strokeStyle = '#2d4a24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(m), gy); ctx.lineTo(X(m), gy + 7); ctx.stroke(); T(X(m), gy + 25, String(m), 13, '#1f3a18', 'center', 800); }
    T(g.right + 2, gy + 25, 'm', 13, '#1f3a18', 'left', 800);
    T(14, 28, PHONE ? '🚀 높이에 따른 속력 예측' : '🚀 같은 높이에서는 질량과 방향에 관계없이 속력이 같을까요?', PHONE ? 14 : 17, '#26324a', 'left', 800);
    // 예측 궤적(연한 점선) + 높이 커서
    ctx.save(); ctx.setLineDash([4, 7]); ctx.strokeStyle = 'rgba(109,63,214,.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const q = posF(f, f.T * i / 60); if (i) ctx.lineTo(X(q.x), Y(q.y)); else ctx.moveTo(X(q.x), Y(q.y)); } ctx.stroke(); ctx.restore();
    const hy = Y(p.h), cr = crossT(f, p.h);
    ctx.save(); ctx.setLineDash([8, 5]); ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox - 6, hy); ctx.lineTo(g.right, hy); ctx.stroke(); ctx.restore();
    D.roundRect(ox - 22, hy - 11, 22, 22, 6); ctx.fillStyle = '#e2552a'; ctx.fill(); T(ox - 11, hy + 5, '↕', 13, '#fff', 'center', 800);
    D.label(g.right - 6, hy + 16, 'h = ' + p.h.toFixed(1) + ' m', { bg: '#e2552a', size: 13, align: 'right' });
    // 교차점 표시
    if (cr) [cr.up, cr.down].forEach((tt, i) => { const q = posF(f, tt); ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), 8, 0, TAU); ctx.stroke(); });
    else labIn((ox + g.right) / 2, hy + 24, '이 각도로는 h = ' + p.h.toFixed(1) + ' m까지 올라가지 못해요 (최고점 ' + f.H.toFixed(1) + ' m)', { bg: '#5a6679', size: 13 }, 8, VW - 8);
    // 발사 장치 + 비행
    D.sphere(X(0), gy, 8, '#7c8aa5', { gloss: false, outline: '#3a465c' });
    ctx.save(); ctx.translate(X(0), gy); ctx.rotate(-p.th * RAD); D.roundRect(-6, -5, 32, 10, 4); ctx.fillStyle = '#4b5a78'; ctx.fill(); ctx.restore();
    const mm = p.st === 'idle' ? p.m : p.mass, rb = mm > 1 ? 11 : 8;
    let Et = { ek: 0.5 * mm * V0 * V0, ep: 0 };
    if (p.st !== 'idle') {
      const t = p.t, q = posF(f, t);
      ctx.strokeStyle = 'rgba(226,70,75,.75)'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 50; i++) { const w = posF(f, t * i / 50); if (i) ctx.lineTo(X(w.x), Y(w.y)); else ctx.moveTo(X(w.x), Y(w.y)); } ctx.stroke();
      for (let k = 1; k * FDT <= t + 1e-9; k++) { const w = posF(f, k * FDT); ctx.fillStyle = 'rgba(124,138,165,.4)'; ctx.beginPath(); ctx.arc(X(w.x), Y(w.y), rb, 0, TAU); ctx.fill(); }
      D.sphere(X(q.x), Y(q.y), rb, mm > 1 ? '#3a5cb8' : '#e2464b', { shadow: true, outline: '#2a2f45' });
      const sp = speedF(f, t);
      Et = { ek: 0.5 * mm * sp * sp, ep: mm * G * q.y };
      if (p.cx) [['up', p.cx.up], ['down', p.cx.down]].forEach(([nm, tt]) => { if (t >= tt - 1e-9) { const w = posF(f, tt), v = speedF(f, tt); labIn(X(w.x) + (nm === 'up' ? -12 : 12), Y(w.y) - 18, 'v = ' + v.toFixed(1) + ' m/s', { bg: nm === 'up' ? '#14a058' : '#3867f4', size: 13, align: nm === 'up' ? 'right' : 'left' }, 8, g.right); } });
      D.label(VW - 10, 28, 't = ' + t.toFixed(2) + ' s · v = ' + sp.toFixed(1) + ' m/s', { bg: '#26324a', size: 13, align: 'right' });
    }
    // 에너지 막대 (오른쪽 카드)
    const Etot = 0.5 * mm * V0 * V0, emax = Math.max(30, Math.ceil(Etot * 1.15 / 10) * 10);
    const rc = PHONE ? { x: PX + 8, y: PY + 6, w: 150, h: PH - 12 } : { x: VW - 190, y: 44, w: 180, h: gy - 50 };
    S.bar.ek = approach(S.bar.ek, Et.ek, dt, 12); S.bar.ep = approach(S.bar.ep, Et.ep, dt, 12);
    if (PHONE) panel(PX, PY, PW, PH, 16);
    energyBars(rc, S.bar.ek, S.bar.ep, emax, 'm = ' + mm.toFixed(1) + ' kg (E = ' + Etot.toFixed(0) + ' J)');
    drawSpeedPanel(p, f);
    parts.update(dt); parts.draw(ctx);
  }
  function energyBars(rc, ek, ep, emax, title) {
    card(rc.x, rc.y, rc.w, rc.h);
    T(rc.x + rc.w / 2, rc.y + 20, title, 13, '#26324a', 'center', 800);
    const top = rc.y + 56, base = rc.y + rc.h - 30, hh = base - top, bw = 30, gap = (rc.w - 3 * bw) / 4, step = emax / 3;
    for (let j = 1; j <= 3; j++) { const yy = base - hh * j / 3; ctx.strokeStyle = 'rgba(120,135,160,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rc.x + 6, yy); ctx.lineTo(rc.x + rc.w - 6, yy); ctx.stroke(); T(rc.x + 7, yy - 3, String(Math.round(step * j)), 13, '#7b879c', 'left', 800); }
    [['E_k', ek, '#f59e0b'], ['E_p', ep, '#3867f4'], ['E', ek + ep, '#14a058']].forEach(([nm, val, col], i) => {
      const x = rc.x + gap * (i + 1) + bw * i, h = clamp(val, 0, emax) / emax * hh;
      D.shadow(() => { D.roundRect(x, base - h, bw, Math.max(h, 0.5), 4); const gg = ctx.createLinearGradient(x, 0, x + bw, 0); gg.addColorStop(0, col); gg.addColorStop(1, SciSim.color.shade(col, -0.25)); ctx.fillStyle = gg; ctx.fill(); }, { blur: 4, y: 2 });
      T(x + bw / 2, base + 17, nm, 13, '#26324a', 'center', 800);
      T(x + bw / 2, Math.min(base - 6, base - h - 6), val.toFixed(1), 13, col === '#14a058' ? '#0b6b39' : '#26324a', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    });
  }
  function drawSpeedPanel(p, f) {
    if (!PHONE) panel(PX, PY, PW, PH, 16);
    const x0 = PHONE ? PX + 14 : PX + 14, lh = PHONE ? 24 : 27, fs = PHONE ? 13 : 14.5, y0 = PY + 25;
    const hide = eff('hide'), q = (s) => (hide ? '?' : s), h = p.h, v2 = V0 * V0 - 2 * G * h;
    const L = [
      ['처음 에너지 E = ½mv₀² = ½ × ' + p.m.toFixed(1) + ' × 10² = ' + (0.5 * p.m * V0 * V0).toFixed(0) + ' J (모두 E_k)'],
      ['E 보존: ½mv₀² = ½mv² + mgh  → 양변의 m이 약분돼요', '#6d3fd6'],
      ['v² = v₀² − 2gh = 100 − 2 × 10 × ' + h.toFixed(1) + ' = ' + q(v2.toFixed(1)), '#1d4ed8'],
      ['v = ' + q(v2 >= 0 ? Math.sqrt(v2).toFixed(1) + ' m/s' : '—') + '  (올라갈 때와 내려올 때 같아요)', '#c2410c'],
      ['최고점 H = ' + f.H.toFixed(1) + ' m: v = v₀cosθ = ' + f.vx.toFixed(1) + ' m/s (0이 아니에요)', '#0b6b39'],
    ];
    if (PHONE) { lines(x0, PY + 6 + 0 + 188, lh, fs, L.slice(1)); return; }
    lines(x0, y0, lh, fs, L);
    const rc = { x: PX + 520, y: PY + 8, w: PW - 528, h: PH - 16 };
    card(rc.x, rc.y, rc.w, rc.h);
    T(rc.x + 10, rc.y + 20, '📋 h = ' + h.toFixed(1) + ' m에서 측정한 속력', 13.5, '#26324a', 'left', 800);
    [0.5, 2].forEach((m, i) => {
      const r = p.rows[m], y = rc.y + 52 + i * 52;
      T(rc.x + 10, y, 'm = ' + m.toFixed(1) + ' kg' + (r ? ' (' + r.th + '°)' : ''), 14, '#26324a', 'left', 800);
      T(rc.x + 10, y + 20, r && r.up != null ? '올라갈 때 ' + r.up.toFixed(1) + ' · 내려올 때 ' + r.down.toFixed(1) + ' m/s' : '아직 던지지 않았어요', 13.5, r ? '#0b6b39' : '#98a2b3', 'left', 800);
    });
  }

  /* ================= ④ 적용 ================= */
  const BALLS = [{ nm: '위로 45°', th: 45, col: '#3867f4' }, { nm: '수평', th: 0, col: '#14a058' }, { nm: '아래로 45°', th: -45, col: '#f59e0b' }];
  function apFlights() {
    if (S.ap.sc === 'a') return BALLS.map((b) => ({ b, f: flightE(ENDS.a.v0, b.th, ENDS.a.h0) }));
    const e = ENDS.b, f = flightE(e.v0, e.th, e.h0), tr = e.rx / f.vx;
    // 림 높이를 지난 뒤 그물 속(높이 2.4 m)까지
    const yEnd = 2.4, tEnd = (f.vy + Math.sqrt(f.vy * f.vy - 2 * G * (yEnd - e.h0))) / G;
    f.T = tEnd; f.tRim = tr;
    return [{ b: { nm: '자유투', th: e.th, col: '#e2464b' }, f }];
  }
  function apThrow() { const a = S.ap; if (a.st === 'run') return; a.balls = apFlights(); a.st = 'run'; a.t = 0; a.res = null; parts.clear(); Sound.click(); updateCtl(); }
  function apStep(dt) {
    const a = S.ap; if (a.st !== 'run') return;
    const tmax = Math.max.apply(null, a.balls.map((x) => x.f.T));
    a.t = Math.min(tmax, a.t + dt * (RM ? 5 : (a.sc === 'a' ? 0.8 : 0.7)));
    if (a.t >= tmax - 1e-9) {
      a.st = 'done'; a.done[a.sc] = true; Sound.success();
      if (a.sc === 'b') { const f = a.balls[0].f, yr = posF(f, f.tRim).y; a.res = { v: speedF(f, f.tRim), y: yr, ok: Math.abs(yr - ENDS.b.ry) <= 0.15 }; }
      else a.res = { v: a.balls.map((x) => speedF(x.f, x.f.T)), t: a.balls.map((x) => x.f.T) };
      updateCtl();
    }
  }
  function apGeo() {
    const a = S.ap, gy = SH - 34;
    const xn = a.sc === 'a' ? 15.5 : 5.4, yn = a.sc === 'a' ? 8.6 : 4.6, ox0 = PHONE ? 30 : 60;
    const s = clamp(Math.min((VW - ox0 - 16) / xn, (gy - 56) / yn), 8, 60);
    const ox = a.sc === 'a' ? ox0 : Math.max(ox0, (VW - xn * s) / 2);
    return { gy, ox, s, X: (x) => ox + x * s, Y: (y) => gy - y * s };
  }
  function drawApply(dt) {
    const a = S.ap, g = apGeo(), { gy, ox, s, X, Y } = g, def = a.sc;
    const sky = ctx.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, '#cfe6fb'); sky.addColorStop(1, '#f1f8ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, SH);
    ctx.fillStyle = '#e4eaf5'; ctx.fillRect(0, SH, VW, VH - SH);
    const gr = ctx.createLinearGradient(0, gy, 0, SH); gr.addColorStop(0, def === 'b' ? '#d9b48a' : '#9fd08a'); gr.addColorStop(1, def === 'b' ? '#c19a6b' : '#7fb46a'); ctx.fillStyle = gr; ctx.fillRect(0, gy, VW, SH - gy);
    ctx.fillStyle = def === 'b' ? '#a67c52' : '#5f9a4e'; ctx.fillRect(0, gy, VW, 3);
    const stp = def === 'a' ? 2 : 1;
    for (let m = 0; X(m) < VW - 10; m += stp) { ctx.strokeStyle = '#2d4a24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(m), gy); ctx.lineTo(X(m), gy + 7); ctx.stroke(); T(X(m), gy + 25, String(m), 13, '#1f3a18', 'center', 800); }
    T(VW - 10, gy + 25, 'm', 13, '#1f3a18', 'right', 800);
    T(14, 28, PHONE ? (def === 'a' ? '🏠 옥상(5 m)에서 v₀ = 10 m/s' : '🏀 자유투 (v₀ = 7.5 m/s)') : (def === 'a' ? '🏠 옥상(5 m)에서 세 방향으로 같은 속력 10 m/s로 던져요' : '🏀 높이 2.0 m에서 7.5 m/s로 던진 자유투가 림(3.05 m)을 지나요'), PHONE ? 14 : 17, '#26324a', 'left', 800);
    const flights = a.st === 'idle' ? apFlights() : a.balls;
    const t = a.st === 'idle' ? 0 : a.t;
    if (def === 'a') {
      const top = Y(ENDS.a.h0);
      D.shadow(() => { D.roundRect(-10, top, ox + 10, gy - top, 4); const bg = ctx.createLinearGradient(0, top, 0, gy); bg.addColorStop(0, '#d7dce6'); bg.addColorStop(1, '#b9c1cf'); ctx.fillStyle = bg; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.fillStyle = '#9aa5b8'; ctx.fillRect(-10, top, ox + 10, 5);
      T(6, top + 24, '옥상 5 m', 13, '#26324a', 'left', 800);
    } else {
      // 골대: 백보드 + 림 + 그물
      const rx = X(ENDS.b.rx), ry = Y(ENDS.b.ry), rr = 0.23 * s;
      ctx.fillStyle = '#7b879c'; ctx.fillRect(X(4.62), Y(ENDS.b.ry + 1.0), 6, gy - Y(ENDS.b.ry + 1.0));
      D.shadow(() => { D.roundRect(X(4.62) - 4, Y(ENDS.b.ry + 0.95), 8, 1.1 * s, 3); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 4, y: 2 }); ctx.strokeStyle = '#b6beca'; ctx.lineWidth = 1.5; D.roundRect(X(4.62) - 4, Y(ENDS.b.ry + 0.95), 8, 1.1 * s, 3); ctx.stroke();
      ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(rx - rr, ry); ctx.lineTo(rx + rr, ry); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(rx + i * rr / 2, ry); ctx.lineTo(rx + i * rr / 3.2, ry + 0.5 * s); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(rx - rr * 0.7, ry + 0.25 * s); ctx.lineTo(rx + rr * 0.7, ry + 0.25 * s); ctx.stroke();
      labIn(rx - 10, ry + 0.75 * s, '림 3.05 m', { bg: '#e2552a', size: 13, align: 'right' }, 8, VW - 8);
      // 던지는 사람 (릴리스 높이 2.0 m)
      ctx.strokeStyle = '#5a6679'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(-0.1), gy); ctx.lineTo(X(-0.1), Y(1.3)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(X(-0.1), Y(1.3)); ctx.lineTo(X(0), Y(2.0)); ctx.stroke();
      D.sphere(X(-0.1), Y(1.65) - 0, 0.01, '#fff', { gloss: false });
      ctx.fillStyle = '#d7dce6'; ctx.beginPath(); ctx.arc(X(-0.12), Y(1.75), 0.14 * s + 2, 0, TAU); ctx.fill();
      T(X(-0.2), Y(2.0) - 12, '릴리스 2.0 m', 13, '#26324a', 'right', 800);
    }
    // 던지는 장치 표시
    D.sphere(X(0), Y(def === 'a' ? ENDS.a.h0 : ENDS.b.h0), 5, '#7c8aa5', { gloss: false, outline: '#3a465c' });
    // 예측 점선
    if (a.st === 'idle') flights.forEach(({ b, f }) => { ctx.save(); ctx.setLineDash([3, 7]); ctx.strokeStyle = SciSim.color.rgba ? SciSim.color.rgba(b.col, 0.55) : b.col; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i <= 50; i++) { const q = posF(f, f.T * i / 50); if (i) ctx.lineTo(X(q.x), Y(q.y)); else ctx.moveTo(X(q.x), Y(q.y)); } ctx.stroke(); ctx.restore(); });
    // 비행
    if (a.st !== 'idle') {
      flights.forEach(({ b, f }, idx) => {
        const tt = Math.min(t, f.T), q = posF(f, tt), rb = def === 'a' ? 7 : Math.max(6, 0.12 * s);
        ctx.strokeStyle = SciSim.color.rgba ? SciSim.color.rgba(b.col, 0.8) : b.col; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 50; i++) { const w = posF(f, tt * i / 50); if (i) ctx.lineTo(X(w.x), Y(w.y)); else ctx.moveTo(X(w.x), Y(w.y)); } ctx.stroke();
        for (let k = 1; k * FDT <= tt + 1e-9; k++) { const w = posF(f, k * FDT); ctx.fillStyle = 'rgba(124,138,165,.35)'; ctx.beginPath(); ctx.arc(X(w.x), Y(w.y), rb, 0, TAU); ctx.fill(); }
        D.sphere(X(q.x), Y(q.y), rb, b.col, { shadow: true, outline: '#2a2f45' });
        if (def === 'a' && t >= f.T - 1e-9) labIn(X(q.x), gy - 16 - idx * 0, 'v = ' + speedF(f, f.T).toFixed(1), { bg: b.col, size: 13 }, 8, VW - 8);
        if (def === 'b') { if (tt >= f.tRim - 1e-9) { const w = posF(f, f.tRim); labIn(X(w.x) - 14, Y(w.y) - 22, '림에서 v = ' + speedF(f, f.tRim).toFixed(1) + ' m/s', { bg: '#14a058', size: 13, align: 'right' }, 8, VW - 8); } }
      });
      if (a.st === 'run') D.label(VW - 10, 28, 't = ' + t.toFixed(2) + ' s', { bg: '#26324a', size: 13, align: 'right' });
      if (def === 'b' && a.st === 'done' && a.res) labIn(VW / 2, 60, a.res.ok ? '🎉 골인! 림을 지날 때 높이 ' + a.res.y.toFixed(2) + ' m' : '림을 벗어났어요', { bg: a.res.ok ? '#14a058' : '#e2552a', size: 14 }, 8, VW - 8);
    }
    // 오른쪽 위: 도달 시간 · 속력 막대 (a)
    const apCard = (rc) => {
      card(rc.x, rc.y, rc.w, rc.h);
      T(rc.x + 10, rc.y + 20, '⏱ 지면 도달 시간과 속력(m/s)', 13, '#26324a', 'left', 800);
      flights.forEach(({ b, f }, i) => {
        const y = rc.y + 38 + i * 28, wmax = rc.w - 190, tt = Math.min(t, f.T), arrived = a.st !== 'idle' && t >= f.T - 1e-9;
        T(rc.x + 10, y + 14, b.nm, 13, '#26324a', 'left', 800);
        ctx.fillStyle = '#eef1f7'; ctx.fillRect(rc.x + 86, y + 2, wmax, 14);
        ctx.fillStyle = b.col; ctx.fillRect(rc.x + 86, y + 2, wmax * (a.st === 'idle' ? 0 : tt) / 2.0, 14);
        T(rc.x + 92 + wmax, y + 14, arrived ? f.T.toFixed(2) + ' s · ' + speedF(f, f.T).toFixed(1) : '', 13, '#26324a', 'left', 800);
      });
    };
    if (def === 'a' && !PHONE) apCard({ x: 520, y: 44, w: VW - 530, h: 128 });
    else if (def === 'b' && !PHONE) {
      const f = flights[0].f, e = ENDS.b;
      const tt = a.st === 'idle' ? 0 : Math.min(a.t, f.T), sp = speedF(f, tt), q = posF(f, tt);
      const rc = { x: VW - 190, y: 44, w: 180, h: gy - 50 };
      const ek = 0.5 * 0.6 * sp * sp, ep = 0.6 * G * (q.y - e.h0);
      S.bar.ek = approach(S.bar.ek, ek, dt, 12); S.bar.ep = approach(S.bar.ep, ep, dt, 12);
      energyBars(rc, S.bar.ek, S.bar.ep, 30, 'm = 0.6 kg');
    }
    drawApplyPanel(a, flights);
    if (def === 'a' && PHONE) apCard({ x: PX + 8, y: PY + PH - 128, w: PW - 16, h: 120 });
    parts.update(dt); parts.draw(ctx);
  }
  function drawApplyPanel(a, flights) {
    panel(PX, PY, PW, PH, 16);
    const x0 = PX + 14, lh = PHONE ? 24 : 27, fs = PHONE ? 13 : 14.5, y0 = PY + 25;
    const rev = a.done[a.sc] || (game && game.free), q = (s) => (rev ? s : '?');
    let L;
    if (a.sc === 'a') {
      const v = Math.sqrt(100 + 2 * G * 5);
      L = [
        ['지면(h = 0)에서의 E는 옥상에서의 E와 같아요 (역학적 에너지 보존)'],
        ['½mv₀² + mgh₀ = ½mv²  →  v = √(v₀² + 2gh₀)', '#6d3fd6'],
        ['v = √(10² + 2 × 10 × 5) = √200 = ' + q(v.toFixed(1) + ' m/s'), '#c2410c'],
        ['방향(위·수평·아래)과 질량에 관계없이 속력은 같아요', '#0b6b39'],
        ['다른 것은 도달 시간: 아래로 던진 공이 가장 빨리, 위로 던진 공이 가장 늦게 닿아요', '#5a6679'],
      ];
    } else {
      const e = ENDS.b, v = Math.sqrt(e.v0 * e.v0 - 2 * G * (e.ry - e.h0));
      L = [
        ['릴리스: 높이 2.0 m, v₀ = 7.5 m/s  →  림: 높이 3.05 m (Δh = 1.05 m 상승)'],
        ['E 보존: ½mv₀² = ½mv² + mgΔh  →  v = √(v₀² − 2gΔh)', '#6d3fd6'],
        ['v = √(7.5² − 2 × 10 × 1.05) = √35.25 = ' + q(v.toFixed(1) + ' m/s'), '#c2410c'],
        ['림을 지날 때 공은 내려오는 중이고, 수평 속도 ' + flightE(e.v0, e.th, e.h0).vx.toFixed(1) + ' m/s가 남아 있어요', '#0b6b39'],
        ['공의 질량(약 0.6 kg)은 식에 나오지 않아요', '#5a6679'],
      ];
    }
    lines(x0, y0, lh, fs, L.map((l) => [l[0], l[1]]));
    const rc = PHONE ? { x: PX + 8, y: PY + 5 * lh + 20, w: PW - 16, h: PH - 5 * lh - 28 } : { x: PX + 560, y: PY + 8, w: PW - 568, h: PH - 16 };
    if (rc.h > 56 && !PHONE) {
      card(rc.x, rc.y, rc.w, rc.h);
      T(rc.x + 10, rc.y + 21, '🏁 던져서 확인', 13.5, '#26324a', 'left', 800);
      [['a', '🏠 옥상에서 던지기'], ['b', '🏀 자유투']].forEach(([k, nm], i) => T(rc.x + 12, rc.y + 54 + i * 30, mark(a.done[k]) + ' ' + nm, 14, '#26324a', 'left', 800));
    } else if (PHONE && rc.h > 40) {
      T(x0, rc.y + 16, mark(a.done.a) + ' 옥상에서 던지기   ' + mark(a.done.b) + ' 자유투', fs, '#26324a', 'left', 800);
    }
  }

  /* ---------- 컨트롤 연결 ---------- */
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) {
        if (n.hasAttribute('data-mE') && !eff('mE')) on = false;
        if (n.hasAttribute('data-eIn') && !eff('eIn')) on = false;
        if (n.hasAttribute('data-vIn') && !eff('vIn')) on = false;
        if (n.hasAttribute('data-pIn') && !eff('pIn')) on = false;
        if (n.hasAttribute('data-aseg') && !eff('ang')) on = false;
      }
      n.hidden = !on;
    });
    $$('#ctrlCard [data-markbtn]').forEach((n) => { n.hidden = S.mode !== 'video'; });
    $$('#ctrlCard [data-airbtn]').forEach((n) => { n.hidden = S.mode !== 'energy'; });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const v = S.vd, n = NF();
    $('#oFr').textContent = v.fr + ' / ' + (n - 1);
    { const sl = $('#sFr'); sl.max = String(n - 1); if (+sl.value !== v.fr) sl.value = v.fr; sl.style.setProperty('--pct', (v.fr / (n - 1) * 100) + '%'); }
    $('#bPlay').textContent = v.play ? '⏸ 멈춤' : '▶ 재생';
    $('#bMark').disabled = v.play || !!v.mk[v.fr];
    $('#bAir').textContent = S.air ? '🌬️ 공기 저항 끄기' : '🌬️ 공기 저항 켜기';
    const p = S.sp;
    $('#oH').textContent = p.h.toFixed(1) + ' m';
    { const sl = $('#sH'); const iv = Math.round(p.h * 10); if (+sl.value !== iv) sl.value = iv; sl.style.setProperty('--pct', (iv / 32 * 100) + '%'); sl.disabled = !!eff('lockH'); }
    $$('#mSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.m === p.m));
    $$('#aSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.a === p.th));
    $('#bSThrow').disabled = p.st === 'run';
    const a = S.ap;
    $$('#scSeg button').forEach((b) => b.classList.toggle('on', b.dataset.sc === a.sc));
    $('#bAThrow').disabled = a.st === 'run';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $('#sFr').addEventListener('input', (e) => { S.vd.play = false; setFrame(+e.target.value); updateCtl(); });
  $('#bPlay').addEventListener('click', () => { const v = S.vd; Sound.click(); if (v.play) { v.play = false; v.tp = v.fr * FDT; } else { if (v.fr >= NF() - 1) setFrame(0); v.tp = v.fr * FDT; v.play = true; } updateCtl(); });
  $('#bMark').addEventListener('click', () => { if (!S.vd.play) vdMark(S.vd.fr); });
  $('#bAir').addEventListener('click', () => { Sound.click(); S.air = !S.air; S.vd.play = false; setFrame(Math.min(S.vd.fr, NF() - 1)); parts.clear(); updateCtl(); });
  $('#sH').addEventListener('input', (e) => { if (eff('lockH')) { e.target.value = Math.round(S.sp.h * 10); return; } setH(+e.target.value / 10); });
  $$('#mSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const p = S.sp; if (p.st === 'run') return; p.m = +b.dataset.m; if (p.st === 'done') { p.st = 'idle'; p.t = 0; } updateCtl(); }));
  $$('#aSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const p = S.sp; if (p.st === 'run') return; p.th = +b.dataset.a; p.st = 'idle'; p.t = 0; updateCtl(); }));
  $('#bSThrow').addEventListener('click', () => { const p = S.sp; if (p.st === 'done') { p.st = 'idle'; p.t = 0; } spThrow(); });
  $$('#scSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const a = S.ap; if (a.st === 'run') return; a.sc = b.dataset.sc; a.st = 'idle'; a.t = 0; a.res = null; parts.clear(); updateCtl(); }));
  $('#bAThrow').addEventListener('click', () => { const a = S.ap; if (a.st === 'done') { a.st = 'idle'; a.t = 0; } apThrow(); });
  ['iEk', 'iEp', 'iEm', 'iEe', 'iV', 'iPa', 'iPb'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a = '—', b = '—', c = '—', L1 = '운동 에너지 E_k', L2 = '위치 에너지 E_p', L3 = '역학적 에너지 E';
    if (S.mode === 'video' || S.mode === 'energy') {
      const k = S.vd.fr;
      if (vReady(k) && (S.eShow || S.mode === 'energy')) { const r = mrow(S.air, k); a = r.Ek.toFixed(1) + ' J'; b = r.Ep.toFixed(1) + ' J'; c = r.E.toFixed(1) + ' J'; }
      else if (vReady(k)) { const r = mrow(S.air, k); L1 = '속력 v'; a = r.v.toFixed(2) + ' m/s'; L2 = '높이 y'; b = r.y.toFixed(2) + ' m'; L3 = '시각 t'; c = (k * FDT).toFixed(1) + ' s'; }
      else { L1 = '프레임'; a = k + ' / ' + (NF() - 1); L2 = '시각 t'; b = (k * FDT).toFixed(1) + ' s'; L3 = '속력 v'; c = '— (이웃 프레임 필요)'; }
    } else if (S.mode === 'speed') {
      const p = S.sp, f = spFl(), r = p.rows[p.m];
      L1 = '높이 커서 h'; a = p.h.toFixed(1) + ' m'; L2 = '측정한 속력 v'; b = r && r.up != null && r.th === p.th ? r.up.toFixed(1) + ' m/s' : '—'; L3 = '최고점 속력'; c = f.vx.toFixed(1) + ' m/s';
    } else {
      const ap = S.ap;
      if (ap.sc === 'a') { L1 = '지면 도달 속력'; a = ap.done.a && ap.res ? ap.res.v.map((x) => x.toFixed(1)).join(' · ') + ' m/s' : '—'; L2 = '도달 시간'; b = ap.done.a && ap.res ? ap.res.t.map((x) => x.toFixed(2)).join(' · ') + ' s' : '—'; L3 = '던진 방향'; c = '위 · 수평 · 아래'; }
      else { L1 = '림에서의 속력'; a = ap.done.b && ap.res ? ap.res.v.toFixed(1) + ' m/s' : '—'; L2 = '림 높이'; b = '3.05 m'; L3 = '결과'; c = ap.done.b && ap.res ? (ap.res.ok ? '골인 ✅' : '실패 ❌') : '—'; }
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const fb = (pairs) => pairs.forEach(([e, ok]) => { if (ok) { e.classList.remove('bad'); e.classList.add('ok'); } else if (!e.classList.contains('bad')) { e.classList.remove('ok'); void e.offsetWidth; e.classList.add('bad'); } });
  const num = (id) => { const v = $('#' + id).value.trim(); return v === '' || !isFinite(+v) ? null : +v; };
  const clearIn = (ids) => ids.forEach((id) => { $('#' + id).value = ''; $('#' + id).classList.remove('ok', 'bad'); });
  const resetVid = (all, air) => { S.vd.mk = new Array(NFMAX).fill(!!all); S.air = !!air; S.vd.play = false; setFrame(0); S.airSeen = false; };
  const Ek04 = 0.5 * M * (36 + 16), Ep04 = M * G * CLEAN[2].y;                   // t = 0.4 s: v² = 6² + 4.0²
  const clean = []; for (let k = 1; k <= 7; k++) { const r = mrow(false, k); clean.push(r); }
  const eMean = () => clean.reduce((s, r) => s + r.E, 0) / clean.length;
  const eSpread = () => (Math.max.apply(null, clean.map((r) => r.E)) - Math.min.apply(null, clean.map((r) => r.E))) / 2;
  const f53 = flightE(V0, 53, 0), vh14 = Math.sqrt(100 - 2 * G * 1.4);
  const vLand = Math.sqrt(100 + 2 * G * 5), vRim = Math.sqrt(ENDS.b.v0 * ENDS.b.v0 - 2 * G * (ENDS.b.ry - ENDS.b.h0));
  const levels = [
    {
      title: '영상 분석: 프레임에서 속력 구하기', short: '영상 분석', icon: '🎞️', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 던진 공의 운동 에너지는 올라갈 때 줄었다가 내려올 때 다시 늘어난다. 그 사이 에너지는 어디로 갔다 올까? 한 순간만 보고도 속력을 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 던진 공의 운동을 수평 등속 + 연직 등가속도로 설명했고, <b>물리학</b>에서 운동 에너지 E<sub>k</sub> = ½mv², 중력 위치 에너지 E<sub>p</sub> = mgh, 역학적 에너지 보존을 배웠어요. 이번에는 <b>같은 영상</b>(0.50 kg 공, v₀ = 10 m/s, 53°)에서 에너지를 구해 봐요.</div>' +
        '<p>영상의 프레임마다 공의 위치를 찍으면, <b>앞뒤 프레임의 위치 차이 ÷ 시간 간격</b>으로 속력을 구할 수 있어요. 위치를 읽는 눈금에는 작은 오차가 있어요(±0.03 m).</p>',
      features: ['video'],
      setup() { resetVid(false, false); S.eShow = false; setFlag('mE', false); setScene('video'); },
      recap: '프레임의 위치 차이로 속력 v = √(vx² + vy²)를 구하고, 이것으로 E_k = ½mv², E_p = mgy를 계산해요.',
      summary: '<ul><li><b>영상 분석</b>: 0.2 s 간격 프레임에서 공의 위치(x, y)를 읽고, 앞뒤 프레임의 위치 차이로 속력을 구해요: vx = Δx ÷ 0.4 s, vy = Δy ÷ 0.4 s, v = √(vx² + vy²).</li><li>공 0.50 kg, v₀ = 10 m/s이면 처음 에너지 E = ½ × 0.50 × 10² = <b>25 J</b>(모두 E<sub>k</sub>, E<sub>p</sub> = 0).</li><li>t = 0.4 s: y = 2.4 m, v² = 6² + 4.0² = 52 → <b>E<sub>k</sub> = 13 J, E<sub>p</sub> = mgy = 12 J</b>, 합 25 J.</li><li>프레임 간격이 너무 넓으면 그 사이에 속도가 많이 변해서 위치 차이로 구한 속도가 그 순간의 속도와 달라져요.</li></ul>',
      missions: [
        {
          title: '프레임마다 공 위치 찍기',
          goal: '프레임을 <b>5개 이상</b> 찍고, <b>속력이 계산된 프레임이 3개 이상</b>이 되게 하세요. (앞뒤 프레임이 모두 찍혀야 그 프레임의 속력이 계산돼요.)',
          hint: '프레임 슬라이더로 프레임을 고르고 공을 누르거나 📍 버튼을 눌러요. 연속된 프레임 다섯 개를 찍으면 가운데 세 프레임의 속력이 계산돼요.',
          setup() { resetVid(false, false); S.eShow = false; setFlag('mE', false); setScene('video'); },
          check: () => marked().filter(Boolean).length >= 5 && readyRows() >= 3,
          hold: 0.6,
          status: () => '찍은 프레임 ' + Math.min(5, marked().filter(Boolean).length) + ' / 5 &nbsp; 속력이 계산된 프레임 ' + Math.min(3, readyRows()) + ' / 3',
          explain: '속력은 앞뒤 프레임의 위치 차이를 시간 간격(0.4 s)으로 나눠서 구해요. 예) t = 0.4 s: vx = (3.6 − 1.2) ÷ 0.4 = 6.0 m/s, vy = (3.0 − 1.4) ÷ 0.4 = 4.0 m/s → v = √(6² + 4²) ≈ 7.2 m/s.',
        },
        {
          title: 't = 0.4 s의 E_k와 E_p 계산하기', manual: true,
          goal: 'm = 0.50 kg인 공의 <b>t = 0.4 s</b>에서 운동 에너지 E<sub>k</sub>와 위치 에너지 E<sub>p</sub>를 표의 값으로 계산해 입력하고 ✔ 확인하기를 누르세요.',
          hint: '표의 t = 0.4 s 열에서 y와 v를 읽어요. E_k = ½ × 0.50 × v², E_p = 0.50 × 10 × y.',
          setup() { resetVid(true, false); setFrame(2); S.eShow = false; clearIn(['iEk', 'iEp']); setFlag('mE', true); setScene('video'); },
          check() {
            const a = num('iEk'), b = num('iEp');
            if (a == null || b == null) return 'E_k와 E_p를 모두 숫자로 입력해 주세요.';
            const okK = Math.abs(a - Ek04) <= 0.8, okP = Math.abs(b - Ep04) <= 0.5;
            fb([[$('#iEk'), okK], [$('#iEp'), okP]]);
            if (!okK) return '운동 에너지는 ½mv²이에요. 표의 v(약 7.2 m/s)를 제곱해 0.25(= ½ × 0.50)를 곱해 보세요.';
            if (!okP) return '위치 에너지는 mgy예요. m = 0.50 kg, g = 10 m/s², y는 표에서 읽어요.';
            return true;
          },
          status: () => 'E_k ' + ($('#iEk').value.trim() || '—') + ' J · E_p ' + ($('#iEp').value.trim() || '—') + ' J',
          explain: 'v ≈ 7.2 m/s → E<sub>k</sub> = ½ × 0.50 × 7.2² ≈ <b>13 J</b>, y ≈ 2.4 m → E<sub>p</sub> = 0.50 × 10 × 2.4 = <b>12 J</b>. 합은 13 + 12 = 25 J로 처음 에너지와 같아요!',
        },
        {
          type: 'quiz', title: '프레임 간격이 너무 넓으면?',
          goal: '프레임 사이의 시간 간격이 너무 넓으면 위치 차이로 구한 속력이 <b>부정확해지는 까닭</b>은?',
          setup() { resetVid(true, false); setFrame(3); S.eShow = true; setFlag('mE', false); setScene('video'); },
          choices: ['위치 차이로 구한 값은 그 시간 동안의 평균 속도라서, 간격이 넓으면 그 사이에 속도가 변해 순간의 속도와 달라져요', '프레임 간격이 넓으면 공의 질량이 달라져요', '간격이 넓을수록 중력 가속도가 커져요', '간격이 넓으면 에너지가 사라져요'],
          answer: 0,
          feedback: ['', '질량은 프레임 간격과 관계없어요.', '중력 가속도는 일정해요. 달라지는 것은 평균 속도와 순간 속도의 차이예요.', '에너지는 사라지지 않아요. 계산한 속력의 정확도 문제예요.'],
          explain: '위치 차이 ÷ 시간 간격은 <b>그 구간의 평균 속도</b>예요. 간격이 짧을수록 순간의 속도에 가까워져요. (이 영상에서는 앞뒤 프레임의 가운데 프레임에서 구하는 방법을 써서 오차가 작아요.)',
        },
      ],
    },
    {
      title: '에너지 보존: E_k와 E_p의 교환', short: '에너지 보존', icon: '⚡', phase: '확인',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 프레임마다 E<sub>k</sub>와 E<sub>p</sub>를 구했어요. 이제 <b>시간에 따른 변화</b>를 막대와 그래프로 확인해요. 올라갈 때 E<sub>k</sub>는 줄고 E<sub>p</sub>는 늘고, 내려올 때는 반대일까요? 둘의 합은요?</div>' +
        '<p>공기 저항이 없을 때와 있을 때를 비교해요. 공기 저항이 있으면 공이 공기에 일을 하므로 역학적 에너지 E가 줄어들고, 그 에너지는 열 등으로 바뀌어요(총 에너지는 보존돼요).</p>',
      features: ['energy'],
      setup() { resetVid(true, false); S.eShow = true; setFlag('mE', false); setFlag('eIn', false); setScene('energy'); },
      recap: '공기 저항이 없으면 E_k와 E_p가 서로 바뀌어도 합 E는 일정해요(측정 오차 안에서). 공기 저항이 있으면 E가 줄어 열 등으로 바뀌어요.',
      summary: '<ul><li>올라갈 때 E<sub>k</sub> 감소, E<sub>p</sub> 증가 / 내려올 때 E<sub>k</sub> 증가, E<sub>p</sub> 감소. 그러나 <b>E = E<sub>k</sub> + E<sub>p</sub> ≈ 25 J로 일정</b>해요(눈금 읽기 오차 안에서). 중력 외의 힘이 일을 하지 않기 때문이에요.</li><li>t = 0.2 s: E<sub>k</sub> = 18 J, E<sub>p</sub> = 7 J / 0.4 s: 13 J, 12 J / 0.6 s: 10 J, 15 J / <b>0.8 s(최고점)</b>: 9 J, 16 J.</li><li>최고점(H = 3.2 m)에서도 속도는 0이 아니라 수평 속도 vx = 6 m/s이므로 <b>E<sub>k</sub> = ½ × 0.50 × 6² = 9 J</b>예요.</li><li>공기 저항이 있으면 최고점이 3.2 m → 약 ' + AIR.H.toFixed(1) + ' m로 낮아지고 E가 25 J → 약 ' + AIR.Eend.toFixed(0) + ' J로 줄어요. 줄어든 에너지는 공기에 한 일 = 열 등으로 바뀌어요(에너지 총량은 보존).</li></ul>',
      missions: [
        {
          title: '역학적 에너지 E의 값과 오차 읽기', manual: true,
          goal: '프레임을 넘기며 표의 <b>E 행</b>을 살펴보고, 역학적 에너지 <b>E의 평균</b>과 <b>오차 범위(±)</b>를 입력하고 ✔ 확인하기를 누르세요.',
          hint: '표의 E 값들은 25 J 근처에서 조금씩 흔들려요. 가장 큰 값과 가장 작은 값의 차이의 절반이 오차 범위예요.',
          setup() { resetVid(true, false); S.eShow = true; setFrame(1); clearIn(['iEm', 'iEe']); setFlag('mE', false); setFlag('eIn', true); setScene('energy'); },
          check() {
            const m = num('iEm'), e = num('iEe');
            if (m == null || e == null) return '평균과 오차 범위를 모두 숫자로 입력해 주세요.';
            const okM = Math.abs(m - E0) <= 0.5, okE = e >= 0.1 && e <= 1.2;
            fb([[$('#iEm'), okM], [$('#iEe'), okE]]);
            if (!okM) return '표의 E 값들의 평균을 구해 보세요. 처음 에너지 25 J와 비교해 봐요.';
            if (!okE) return '오차 범위는 E가 흔들리는 폭이에요. (가장 큰 값 − 가장 작은 값) ÷ 2를 구해 보세요. 0이 아니고, 1 J를 넘지 않아요.';
            return true;
          },
          status: () => 'E 평균 ' + ($('#iEm').value.trim() || '—') + ' J · 오차 ± ' + ($('#iEe').value.trim() || '—') + ' J',
          explain: '일곱 프레임의 E는 모두 약 <b>25 J ± ' + eSpread().toFixed(1) + ' J</b>(평균 ' + eMean().toFixed(1) + ' J)예요. 위치를 읽는 눈금에 ±0.03 m 정도의 오차가 있어서 합이 조금씩 흔들리지만, 오차 범위 안에서 <b>역학적 에너지는 일정</b>해요.',
        },
        {
          title: '공기 저항을 켜고 비교하기',
          goal: '<b>🌬️ 공기 저항 켜기</b>를 누르고 프레임을 끝까지 넘겨(▶ 재생) 최고점이 낮아지고 E가 줄어드는 것을 확인하세요.',
          hint: '공기 저항을 켠 뒤 ▶ 재생을 눌러 마지막 프레임까지 보거나 프레임 슬라이더를 끝까지 움직여요. 막대 E가 줄어드는 것을 봐요.',
          setup() { resetVid(true, false); S.eShow = true; setFrame(0); setFlag('eIn', false); setScene('energy'); },
          check: () => S.air && S.airSeen,
          hold: 0.6,
          status: () => mark(S.air) + ' 공기 저항 켜기 &nbsp; ' + mark(S.air && S.airSeen) + ' 마지막 프레임까지 보기',
          explain: '공기 저항을 켜면 최고점이 3.2 m → 약 <b>' + AIR.H.toFixed(1) + ' m</b>로 낮아져요. E는 25 J → 마지막 프레임에서 약 <b>' + mrow(true, AIR.fr.length - 2).E.toFixed(0) + ' J</b>로 줄어들고(착지 직전 약 ' + AIR.Eend.toFixed(0) + ' J), 줄어든 에너지는 공기에 한 일 = 열 등으로 바뀌어요. 에너지가 사라진 것이 아니라 <b>역학적 에너지가 다른 형태로 전환</b>된 거예요.',
        },
        {
          type: 'quiz', title: '최고점에서의 운동 에너지',
          goal: '영상 속 공(0.50 kg)이 <b>최고점(t = 0.8 s)</b>에 있을 때 운동 에너지 E<sub>k</sub>는?',
          setup() { resetVid(true, false); S.eShow = true; setFrame(4); setFlag('eIn', false); setScene('energy'); },
          choices: ['0 J — 최고점에서는 공이 멈춰요', '9 J — 수평 속도 6 m/s가 남아 있어요', '25 J — 처음과 같아요', '16 J — 위치 에너지와 같아요'],
          answer: 1,
          feedback: ['최고점에서 멈추는 것은 연직 속도뿐이에요. 수평 속도 6 m/s가 그대로라서 E_k = 0이 아니에요.', '', '25 J은 역학적 에너지 전체예요. 최고점에서는 그 일부만 E_k이고 나머지는 E_p예요.', '16 J은 최고점의 위치 에너지 mgH = 0.50 × 10 × 3.2예요. 운동 에너지는 9 J이고, 합이 25 J이에요.'],
          explain: '최고점에서 vy = 0이지만 vx = 6 m/s가 남아 <b>E<sub>k</sub> = ½ × 0.50 × 6² = 9 J</b>이고, E<sub>p</sub> = 0.50 × 10 × 3.2 = 16 J이에요. 합은 25 J! 에너지 보존의 관점에서도 "최고점에서 멈춘다"는 생각이 틀렸음을 알 수 있어요.',
        },
      ],
    },
    {
      title: '속력 예측: v² = v₀² − 2gh', short: '속력 예측', icon: '🚀', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 역학적 에너지가 일정함을 확인했어요. 이 보존 법칙을 식으로 쓰면 영상 없이도 <b>높이만 알면 속력을 예측</b>할 수 있어요.</div>' +
        '<p>½mv₀² = ½mv² + mgh에서 양변의 <b>질량 m이 약분</b>돼요. 그래서 <b>v² = v₀² − 2gh</b>이고, 속력은 질량과 던진 각도에 관계없이 높이만으로 정해져요. 올라갈 때와 내려올 때 같은 높이에서는 속력이 같아요.</p>',
      features: ['speed'],
      setup() { const p = S.sp; p.m = 0.5; p.th = 53; p.h = 1.4; p.st = 'idle'; p.t = 0; p.thrown = {}; p.rows = {}; setFlag('hide', false); setFlag('vIn', false); setFlag('ang', false); setFlag('lockH', false); setScene('speed'); },
      recap: '역학적 에너지 보존으로 v² = v₀² − 2gh를 얻어요. 속력은 높이에만 관계하고 질량·방향·올라가는지 내려오는지와 무관해요.',
      summary: '<ul><li>E 보존: <b>½mv₀² = ½mv² + mgh</b> → 질량이 약분되어 <b>v² = v₀² − 2gh</b>.</li><li>v₀ = 10 m/s: h = 1.4 m에서 v = √(100 − 28) = √72 ≈ <b>8.5 m/s</b> — 올라갈 때(t = 0.2 s)와 내려올 때(t = 1.4 s) 모두 같아요.</li><li>질량이 0.50 kg이든 2.0 kg이든 궤적과 속력이 같아요(에너지 값만 4배: 25 J → 100 J).</li><li>같은 v₀로 던진 30°와 60°의 공은 같은 높이에서 <b>속력이 같아요</b>(방향만 달라요). 최고점의 속력은 v₀cosθ이고, 이때 H = (v₀sinθ)² ÷ 2g(앞 차시 식)와 같은 결과예요.</li></ul>',
      missions: [
        {
          title: 'h = 1.4 m에서의 속력 계산하기', manual: true,
          goal: '<b>v₀ = 10 m/s</b>로 던진 공이 <b>h = 1.4 m</b>를 지날 때의 속력 v를 역학적 에너지 보존으로 계산해 입력하고 ✔ 확인하기를 누르세요.',
          hint: 'v² = v₀² − 2gh = 100 − 2 × 10 × 1.4 = 72. 제곱근을 구해요(8.5 근처).',
          setup() { const p = S.sp; p.m = 0.5; p.th = 53; p.h = 1.4; p.st = 'idle'; p.t = 0; clearIn(['iV']); setFlag('hide', true); setFlag('vIn', true); setFlag('ang', false); setFlag('lockH', true); setScene('speed'); },
          check() {
            const v = num('iV');
            if (v == null) return '속력을 숫자로 입력해 주세요.';
            const ok = Math.abs(v - vh14) <= 0.1; fb([[$('#iV'), ok]]);
            if (!ok) return 'v² = v₀² − 2gh예요. v₀² = 100, 2gh = 2 × 10 × 1.4 = 28이니 v² = 72, v는 약 8.5예요.';
            return true;
          },
          status: () => 'v = ' + ($('#iV').value.trim() || '—') + ' m/s',
          explain: 'v² = 10² − 2 × 10 × 1.4 = 72 → v = <b>8.5 m/s</b>. 에너지로 보면 ½ × 0.50 × 72 = 18 J(E<sub>k</sub>), 0.50 × 10 × 1.4 = 7 J(E<sub>p</sub>), 합 25 J예요. ▶ 던지기로 확인해 보세요.',
        },
        {
          title: '질량을 바꿔도 속력이 같을까?',
          goal: '같은 높이 커서(h = 1.4 m)에서 <b>0.5 kg과 2.0 kg</b> 공을 각각 던져 속력이 같은지 확인하세요.',
          hint: '질량 버튼으로 0.5 kg을 던진 뒤 2.0 kg도 던져요. 오른쪽 카드에서 두 공의 속력을 비교해요.',
          setup() { const p = S.sp; p.m = 0.5; p.th = 53; p.h = 1.4; p.st = 'idle'; p.t = 0; p.thrown = {}; p.rows = {}; setFlag('hide', false); setFlag('vIn', false); setFlag('ang', false); setFlag('lockH', false); setScene('speed'); },
          check: () => S.sp.thrown[0.5] && S.sp.thrown[2],
          hold: 0.6,
          status: () => mark(S.sp.thrown[0.5]) + ' 0.5 kg &nbsp; ' + mark(S.sp.thrown[2]) + ' 2.0 kg',
          explain: '두 공의 궤적과 속력이 같아요(h = 1.4 m에서 약 8.5 m/s). 질량이 2.0 kg이면 E = ½mv₀² = <b>100 J</b>로 4배지만, 식에서 <b>m이 양변에서 약분</b>되어 속력 v² = v₀² − 2gh에는 질량이 나오지 않아요.',
        },
        {
          type: 'quiz', title: '30°와 60°로 던진 공의 속력',
          goal: '같은 속력 v₀ = 10 m/s로 던진 <b>30°와 60°</b>의 공이 같은 높이(h = 1.0 m)를 지날 때 속력은?',
          setup() { const p = S.sp; p.m = 0.5; p.th = 30; p.h = 1.0; p.st = 'idle'; p.t = 0; setFlag('hide', false); setFlag('vIn', false); setFlag('ang', true); setFlag('lockH', false); setScene('speed'); },
          choices: ['60°로 던진 공이 더 빨라요', '30°로 던진 공이 더 빨라요', '같아요 (v = √(v₀² − 2gh) = 8.9 m/s)', '올라갈 때는 같지만 내려올 때는 달라요'],
          answer: 2,
          feedback: ['각도는 식 v² = v₀² − 2gh에 들어가지 않아요. 속력은 높이로만 정해져요.', '던진 각도와 관계없이 같은 높이에서는 같은 속력이에요.', '', '올라갈 때나 내려올 때나 같은 높이에서는 속력이 같아요(대칭).'],
          explain: 'v² = v₀² − 2gh = 100 − 20 = 80 → v = <b>8.9 m/s</b>로 두 공 모두 같아요. 각도는 방향(수평·연직 성분의 비)만 바꾸고 속력은 에너지 보존으로 높이에 의해서만 정해져요. (30° 공은 최고점 1.25 m, 60° 공은 3.75 m까지 올라가요.)',
        },
      ],
    },
    {
      title: '적용: 옥상에서 던지기와 자유투', short: '적용', icon: '🏠', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 높이만 알면 속력을 알 수 있다는 식 v² = v₀² − 2gh를 얻었어요. 이제 경로가 복잡해도 <b>처음과 나중의 높이와 속력</b>만으로 답을 구해 봐요.</div>' +
        '<p>🏠 옥상(5 m)에서 같은 속력으로 위·수평·아래로 던진 세 공의 지면 도달 속력, 🏀 자유투 공이 림을 지날 때의 속력을 에너지 보존으로 예측하고 던져서 확인해요.</p>',
      features: ['apply'],
      setup() { const a = S.ap; a.sc = 'a'; a.st = 'idle'; a.t = 0; a.done = { a: false, b: false }; a.res = null; clearIn(['iPa', 'iPb']); setFlag('pIn', false); setScene('apply'); },
      recap: '역학적 에너지 보존을 쓰면 경로를 몰라도 높이 차이만으로 속력을 구할 수 있어요. 마찰이 있으면 역학적 에너지는 줄지만 에너지 총량은 보존돼요.',
      summary: '<ul><li><b>옥상 5 m</b>, v₀ = 10 m/s: 위·수평·아래 어느 방향으로 던져도 지면 도달 속력 v = √(v₀² + 2gh) = √200 ≈ <b>14.1 m/s</b>로 같아요. 도달 <b>시간</b>만 달라요(아래 0.52 s, 수평 1.00 s, 위 1.93 s).</li><li><b>자유투</b>(릴리스 2.0 m, 림 3.05 m, v₀ = 7.5 m/s): 림에서 v = √(7.5² − 2 × 10 × 1.05) ≈ <b>5.9 m/s</b>. 질량(약 0.6 kg)은 필요 없어요.</li><li>야구공과 볼링공이 같은 높이에서 같은 속력으로 던져지면 낙하 속력은 같아요(에너지 값만 달라요).</li><li>공기 저항·마찰이 있으면 역학적 에너지는 줄지만, 줄어든 만큼 열 등으로 바뀌어 <b>에너지 총량은 보존</b>돼요.</li></ul>',
      missions: [
        {
          title: '에너지 보존으로 두 장면의 속력 예측하기', manual: true,
          goal: '🏠 <b>옥상에서 던진 공이 지면에 닿을 때의 속력</b>과 🏀 <b>자유투 공이 림을 지날 때의 속력</b>을 계산해 입력하고, 두 장면을 모두 ▶ 던지기로 확인한 뒤 ✔ 확인하기를 누르세요.',
          hint: '🏠 v = √(v₀² + 2gh₀) = √(100 + 100). 🏀 v = √(v₀² − 2gΔh) = √(56.25 − 2 × 10 × 1.05).',
          setup() { const a = S.ap; a.sc = 'a'; a.st = 'idle'; a.t = 0; a.done = { a: false, b: false }; a.res = null; clearIn(['iPa', 'iPb']); setFlag('pIn', true); setScene('apply'); },
          check() {
            const a = num('iPa'), b = num('iPb');
            if (a == null || b == null) return '두 속력을 모두 숫자로 입력해 주세요.';
            const okA = Math.abs(a - vLand) <= 0.2, okB = Math.abs(b - vRim) <= 0.2;
            fb([[$('#iPa'), okA], [$('#iPb'), okB]]);
            if (!okA) return '🏠 지면에서 ½mv² = ½mv₀² + mgh₀이에요. v² = v₀² + 2gh₀ = 100 + 2 × 10 × 5를 계산해 보세요. 던진 방향은 상관없어요.';
            if (!okB) return '🏀 림까지 Δh = 1.05 m 올라가므로 v² = v₀² − 2gΔh = 56.25 − 21 = 35.25예요.';
            if (!S.ap.done.a || !S.ap.done.b) return '계산이 맞아요! 🏠와 🏀 두 장면을 모두 ▶ 던지기로 확인한 뒤 다시 확인하기를 눌러요.';
            return true;
          },
          status: () => '입력 ' + mark(num('iPa') != null && num('iPb') != null) + ' &nbsp; ' + mark(S.ap.done.a) + ' 🏠 던지기 &nbsp; ' + mark(S.ap.done.b) + ' 🏀 던지기',
          explain: '🏠 v = √(10² + 2 × 10 × 5) = √200 ≈ <b>14.1 m/s</b> — 위·수평·아래 방향 모두 같아요(도달 시간만 달라요). 🏀 v = √(7.5² − 2 × 10 × 1.05) = √35.25 ≈ <b>5.9 m/s</b>이에요. 경로의 모양을 몰라도 처음과 나중의 <b>높이 차이</b>만으로 속력이 정해져요.',
        },
        {
          type: 'quiz', title: '야구공과 볼링공',
          goal: '같은 높이에서 같은 속력으로 던진 <b>야구공(0.15 kg)</b>과 <b>볼링공(5 kg)</b>이 지면에 닿을 때의 속력을 비교하면? (공기 저항은 무시)',
          setup() { setFlag('pIn', false); setScene('apply'); },
          choices: ['볼링공이 더 빨라요 (질량이 크니까)', '야구공이 더 빨라요 (가벼우니까)', '속력은 같아요. 다만 볼링공의 운동 에너지가 더 커요', '볼링공은 공기 저항이 없어도 더 느려요'],
          answer: 2,
          feedback: ['v = √(v₀² + 2gh)에는 질량이 없어요. 질량이 큰 만큼 mgh와 ½mv²도 함께 커서 속력은 그대로예요.', '가벼워도 같은 높이·같은 처음 속력이면 속력이 같아요.', '', '공기 저항이 없다면 질량과 관계없이 속력이 같아요.'],
          explain: '에너지 보존 식 ½mv² = ½mv₀² + mgh에서 <b>m이 약분</b>되어 v = √(v₀² + 2gh)로 같아요. 운동 에너지 ½mv²는 질량이 큰 볼링공이 더 크지만(질량에 비례) 속력은 같아요. 마찰·공기 저항이 있다면 역학적 에너지는 줄지만 <b>줄어든 만큼 열로 바뀌어</b> 에너지 총량은 보존돼요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-projectile-energy', mount: '#game', badge: '에너지 보존 박사', homeHref: '../../index.html#hm',
    featureLabels: { video: '🎞️ 영상 분석 · 속력 계산 표', energy: '⚡ 에너지 막대 · E–t 그래프 · 공기 저항', speed: '🚀 높이 커서 · 질량·각도 비교', apply: '🏠 옥상 · 🏀 자유투' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('video');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; if (game.free) S.eShow = true; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    spStep(dt); apStep(dt);
    switch (S.mode) {
      case 'video': case 'energy': drawVideo(dt); break;
      case 'speed': drawSpeed(dt); break;
      default: drawApply(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, setFrame, vdMark, VR, mrow, vReady, readyRows, spThrow, apThrow, spGeo, AIR, CLEAN, eMean, eSpread, flightE, speedF,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { spStep(0.02); apStep(0.02); } },
  };
})();
