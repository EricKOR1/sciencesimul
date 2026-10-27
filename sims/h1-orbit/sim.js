/* =========================================================
   통합과학1 Ⅲ. 시스템과 상호작용 - 지구 주위의 공전 (단원 6차시)
   성취기준 [10통과1-03-03] 중력의 작용으로 인한 지구 표면과 지구 주위의 다양한 운동을 설명할 수 있다.
   ① 관찰: 대포 던지기 (뉴턴의 대포, 발사 속력 1~9 km/s)
   ② 탐구: 낙하와 공전 (중력이 없다면 직선 경로 vs 실제 궤도, 가속도 방향 고르기)
   ③ 분석: 거리와 가속도 (지표 · 국제 우주 정거장 · 정지 위성 · 달)
   ④ 적용: 우주 정거장 (무중량 = 자유 낙하 상태, 자유 낙하 승강기)
   g = 9.8 m/s², 지구 반지름 6371 km, 공기 저항 무시. 대포는 높이 20 km의 상상 속 산 위에 있어요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 860 : 560;
  const FS = PHONE ? 1.2 : 1;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const R = 6371;                        // 지구 반지름 (km)
  const G0 = 9.8;                        // 지표 중력 가속도 (m/s²)
  const MU = (G0 / 1000) * R * R;        // 중력 상수 × 질량 (km³/s²)
  const H0 = 20;                         // 대포가 있는 산의 높이 (km)
  const R0 = R + H0;
  const VC0 = Math.sqrt(MU / R0);        // 대포 높이에서의 원 궤도 속력 (≈ 7.9 km/s)
  const R_ISS = R + 400, R_GEO = R + 35786, R_MOON = 384400;
  const gAt = (r) => MU / (r * r) * 1000;          // 중력 가속도 (m/s²)
  const vCirc = (r) => Math.sqrt(MU / r);          // 원 궤도 속력 (km/s)
  const fmtN = (n) => Math.round(n).toLocaleString('ko-KR');
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  function fmtG(a) { if (a >= 1) return a.toFixed(1); if (a >= 0.1) return a.toFixed(2); return a.toPrecision(2); }
  const STOPS = [
    { id: 'surf', name: '지표', r: R, icon: '🌍' },
    { id: 'iss', name: '국제 우주 정거장', r: R_ISS, icon: '🚀', alt: '고도 약 400 km' },
    { id: 'geo', name: '정지 위성', r: R_GEO, icon: '📡', alt: '고도 약 3.6만 km' },
    { id: 'moon', name: '달', r: R_MOON, icon: '🌙', alt: '거리 약 38만 km' },
  ];
  const periodMin = (r) => 2 * Math.PI * r / vCirc(r) / 60;
  const fmtPeriod = (r) => { const m = periodMin(r); if (m < 180) return '약 ' + Math.round(m) + '분'; if (m < 60 * 48) return '약 ' + Math.round(m / 60) + '시간'; return '약 ' + Math.round(m / 1440) + '일'; };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'cannon', clock: 0, fade: 0,
    v: 5, shots: [], shot: null, landings: [], cam: null, camT: null, circleLaps: 0,
    grav: true, sat: null, flewOff: false, backOn: 0, pick: false, pickSel: -1, pickOK: false, satT: 0,
    dsel: 0, dseen: new Set([0]),
    st: 'iss', drops: [], taps: 0, lift: { state: 'ready', t: 0, y: 0 }, cut: false, ast: null,
  };
  let game = null;

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#0b1226' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const font = (n, w) => D.font(n, w || 700);
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const AP = (c, t, dt, r) => (RM ? t : SciSim.approach(c, t, dt, r));
  const rgba = SciSim.color.rgba;
  const wrapCache = new Map();
  function wrap(text, maxW, fnt) {
    const key = text + '|' + Math.round(maxW) + '|' + fnt;
    if (wrapCache.has(key)) return wrapCache.get(key);
    ctx.save(); ctx.font = fnt;
    const lines = []; let cur = '';
    const push = (w) => {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW) { cur = t; return; }
      if (cur) { lines.push(cur); cur = ''; }
      if (ctx.measureText(w).width <= maxW) { cur = w; return; }
      let s = '';
      for (const ch of w) { if (ctx.measureText(s + ch).width > maxW && s) { lines.push(s); s = ''; } s += ch; }
      cur = s;
    };
    text.split(' ').forEach(push);
    if (cur) lines.push(cur);
    ctx.restore();
    wrapCache.set(key, lines);
    return lines;
  }
  function textBlock(text, x, y, maxW, o) {
    o = o || {};
    const size = o.size || 14, lh = o.lh || size * 1.34 * FS;
    const lines = wrap(text, maxW, font(size, o.weight || 700));
    lines.forEach((ln, i) => D.text(x, y + i * lh, ln, { size, weight: o.weight || 700, color: o.color || '#1b2333', align: o.align || 'left', baseline: 'middle', stroke: o.stroke, strokeWidth: o.strokeWidth }));
    return lines.length * lh;
  }
  function spaceBg(t, o) {
    o = o || {};
    D.space(0, 0, VW, VH, RM ? 0 : t, { stars: o.stars || 80, top: '#18244b', bottom: '#050813' });
  }
  function earthDisc(cx, cy, r, o) {
    o = o || {};
    D.glow(cx, cy, r * 1.25, '#6bb6ff', 0.35);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    let g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#5aa9ee'); g.addColorStop(1, '#1d5ba6');
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.fillStyle = '#4fae62';
    [[-0.38, -0.22, 0.3, 0.2, 0.4], [0.24, 0.1, 0.26, 0.4, -0.3], [-0.1, 0.52, 0.24, 0.13, 0.1], [0.5, -0.45, 0.16, 0.1, 0.5], [-0.62, 0.2, 0.1, 0.18, 0]].forEach(([x, y, rx, ry, rot]) => { ctx.beginPath(); ctx.ellipse(cx + x * r, cy + y * r, rx * r, ry * r, rot, 0, Math.PI * 2); ctx.fill(); });
    g = ctx.createLinearGradient(cx - r, 0, cx + r, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(5,10,40,.4)');
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.restore();
  }

  /* ---------- 운동 계산 (km, s) ---------- */
  function rk4(s, dt, mu) {
    mu = mu == null ? MU : mu;
    const acc = (x, y) => { const r2 = x * x + y * y, r3 = r2 * Math.sqrt(r2); return [-mu * x / r3, -mu * y / r3]; };
    const f = (a) => { const q = acc(a[0], a[1]); return [a[2], a[3], q[0], q[1]]; };
    const k1 = f(s), s2 = s.map((v, i) => v + k1[i] * dt / 2), k2 = f(s2), s3 = s.map((v, i) => v + k2[i] * dt / 2), k3 = f(s3), s4 = s.map((v, i) => v + k3[i] * dt), k4 = f(s4);
    return s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }
  /* 발사 속력 v (km/s)로 수평 발사했을 때의 전체 경로를 미리 계산 */
  function predict(v) {
    const eps = v * v / 2 - MU / R0, h = R0 * v;
    const e = Math.sqrt(Math.max(0, 1 + 2 * eps * h * h / (MU * MU)));
    const bound = eps < 0;
    const p = h * h / MU;
    const rp = p / (1 + e), ra = bound ? p / (1 - e) : Infinity;
    const impact = bound && rp < R - 1e-6;
    const a = bound ? -MU / (2 * eps) : Infinity;
    const P = bound ? 2 * Math.PI * Math.sqrt(a * a * a / MU) : Infinity;
    let st = [0, R0, v, 0], t = 0;
    const path = [{ t: 0, x: 0, y: R0 }];
    let tEnd = 0, range = 0, hit = null;
    if (impact) {
      const dt = 0.5;
      for (let i = 0; i < 20000; i++) {
        const nx = rk4(st, dt), r1 = Math.hypot(nx[0], nx[1]);
        if (r1 <= R) { const r0 = Math.hypot(st[0], st[1]), f = (r0 - R) / (r0 - r1 || 1); hit = [lerp(st[0], nx[0], f), lerp(st[1], nx[1], f)]; t += dt * f; path.push({ t, x: hit[0], y: hit[1] }); break; }
        st = nx; t += dt;
        if (i % 2 === 1) path.push({ t, x: st[0], y: st[1] });
      }
      tEnd = t; range = R * Math.atan2(hit[0], hit[1]);
    } else {
      const N = 900, dtp = P / N;
      for (let i = 0; i < N; i++) { const n = Math.ceil(dtp / 2); for (let j = 0; j < n; j++) st = rk4(st, dtp / n); t += dtp; path.push({ t, x: st[0], y: st[1] }); }
      tEnd = P;
    }
    const cls = impact ? 'impact' : e <= 0.05 ? 'circle' : 'ellipse';
    // 화면에 맞출 범위
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    path.forEach((q) => { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); });
    if (impact) { const th = Math.atan2(hit[0], hit[1]); for (let i = 0; i <= 12; i++) { const a = th * i / 12; const gx = R * Math.sin(a), gy = R * Math.cos(a); x0 = Math.min(x0, gx); x1 = Math.max(x1, gx); y0 = Math.min(y0, gy); y1 = Math.max(y1, gy); } }
    else { x0 = Math.min(x0, -R); x1 = Math.max(x1, R); y0 = Math.min(y0, -R); y1 = Math.max(y1, R); }
    return { v, e, eps, bound, rp, ra, P, cls, path, tEnd, range, hit, bbox: { x0, x1, y0, y1 }, t: 0, laps: 0, state: 'wait', idx: 0, kPlay: 1, id: Math.random() };
  }
  const posAt = (sh, t) => {
    const path = sh.path, n = path.length;
    if (sh.cls !== 'impact') t = t % sh.tEnd; else t = Math.min(t, sh.tEnd);
    // 이분 탐색
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (path[m].t <= t) lo = m; else hi = m; }
    const a = path[lo], b = path[hi], f = b.t > a.t ? clamp((t - a.t) / (b.t - a.t), 0, 1) : 0;
    return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), i: lo };
  };

  /* ======================================================
     ① 뉴턴의 대포
     ====================================================== */
  const fitCam = (b) => {
    const m = PHONE ? 54 : 70, ex = (b.x1 - b.x0) * 0.1 + 1, ey = (b.y1 - b.y0) * 0.14 + 1;
    const bw = b.x1 - b.x0 + 2 * ex, bh = b.y1 - b.y0 + 2 * ey;
    const s = Math.min((VW - 2 * m) / bw, (VH - 2 * m - 40) / bh);
    return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 - 18 / s, s: clamp(s, 0.005, 14) };
  };
  const IDLE_BOX = { x0: -R, x1: R, y0: -R, y1: R0 + 120 };
  S.cam = Object.assign({}, fitCam(IDLE_BOX)); S.camT = Object.assign({}, S.cam); S.idleS = S.cam.s;
  const w2s = (x, y) => [VW / 2 + (x - S.cam.x) * S.cam.s, VH / 2 - (y - S.cam.y) * S.cam.s];
  function fire() {
    const prev = S.shot;
    if (prev && prev.state !== 'wait') { S.shots.push(prev); if (S.shots.length > 5) S.shots.shift(); }
    const sh = predict(S.v);
    sh.kPlay = sh.cls === 'impact' ? sh.tEnd / 4.5 : sh.P / 9;
    sh.state = 'run';
    S.shot = sh; S.camT = fitCam(sh.bbox);
    Sound.click(); updateCtl();
  }
  function clearShots() { S.shots = []; S.shot = null; S.landings = []; S.camT = Object.assign({}, fitCam(IDLE_BOX)); updateCtl(); }
  function stepCannon(dt) {
    const c = S.cam, T = S.camT;
    c.s = Math.exp(AP(Math.log(c.s), Math.log(T.s), dt, 3.2)); c.x = AP(c.x, T.x, dt, 3.5); c.y = AP(c.y, T.y, dt, 3.5);
    const sh = S.shot;
    if (!sh || sh.state !== 'run') return;
    sh.t += dt * sh.kPlay;
    if (sh.cls === 'impact') {
      if (sh.t >= sh.tEnd) {
        sh.t = sh.tEnd; sh.state = 'done';
        if (!S.landings.some((l) => Math.abs(l.v - sh.v) < 0.5)) S.landings.push({ v: sh.v, range: sh.range, x: sh.hit[0], y: sh.hit[1] });
        const [sx, sy] = w2s(sh.hit[0], sh.hit[1]);
        parts.burst(sx, sy, { count: 16, speed: 130, size: 3.5, life: 0.8, colors: ['#ffb347', '#ff6b3a', '#fde68a'], gravity: 160 });
        Sound.success(); updateCtl();
      }
    } else {
      sh.laps = sh.t / sh.tEnd;
      if (sh.cls === 'circle') S.circleLaps = sh.laps;
    }
  }
  function niceKm(px, s) { const km = px / s, p = Math.pow(10, Math.floor(Math.log10(km))), m = km / p; return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p; }
  function drawWorldEarth(t) {
    const c = S.cam, [ex, ey] = w2s(0, 0), r = R * c.s;
    // 하늘: 지표 근처는 파랗고 100 km 위부터 우주
    ctx.fillStyle = '#050813'; ctx.fillRect(0, 0, VW, VH);
    const zoom = clamp((Math.log(c.s) - Math.log(S.idleS)) / Math.log(30), 0, 1);
    if (zoom < 0.95) D.space(0, 0, VW, VH, RM ? 0 : t, { stars: 70, top: '#101a3c', bottom: '#050813' });
    const g = ctx.createRadialGradient(ex, ey, r, ex, ey, r + 110 * c.s);
    g.addColorStop(0, '#8ccaf7'); g.addColorStop(0.3, '#3f7cc6'); g.addColorStop(1, 'rgba(10,18,50,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    if (r < 3500) {
      earthDisc(ex, ey, r);
    } else {
      const thc = Math.atan2(c.x, c.y), span = Math.min(Math.PI, Math.hypot(VW, VH) / (R * c.s) * 0.75 + 0.03);
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) { const a = thc - span + 2 * span * i / 48; const [px, py] = w2s(R * Math.sin(a), R * Math.cos(a)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      const [lx, ly] = w2s(R * Math.sin(thc + span), R * Math.cos(thc + span));
      ctx.lineTo(lx, ly + 3000); ctx.lineTo(VW / 2 - Math.hypot(VW, VH) * 2, ly + 3000);
      ctx.closePath();
      const gg = ctx.createLinearGradient(0, VH * 0.5, 0, VH);
      gg.addColorStop(0, '#59b36a'); gg.addColorStop(1, '#2f7a4a');
      ctx.fillStyle = gg; ctx.fill();
      ctx.strokeStyle = '#2f7a4a'; ctx.lineWidth = 3; ctx.stroke();
    }
  }
  function drawCannonScene(t) {
    const c = S.cam;
    drawWorldEarth(t);
    // 산 (높이 20 km, 실제 비율)
    const [bx, by] = w2s(0, R - 1), [ax, ay] = w2s(0, R0), hw = H0 * 0.9 * c.s;
    ctx.fillStyle = '#7b5a44'; ctx.beginPath(); ctx.moveTo(bx - hw, by + 1); ctx.lineTo(ax - Math.max(2, 0.04 * hw), ay + 1); ctx.lineTo(ax + Math.max(2, 0.04 * hw), ay + 1); ctx.lineTo(bx + hw, by + 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e9edf3'; ctx.beginPath(); ctx.moveTo(ax - hw * 0.14, ay + (by - ay) * 0.18); ctx.lineTo(ax - 2, ay); ctx.lineTo(ax + 2, ay); ctx.lineTo(ax + hw * 0.14, ay + (by - ay) * 0.18); ctx.closePath(); ctx.fill();
    // 이전 경로와 낙하 지점
    S.shots.concat(S.shot ? [S.shot] : []).forEach((sh, i) => {
      const cur = sh === S.shot;
      ctx.strokeStyle = cur ? '#ffd166' : 'rgba(255,209,102,.35)'; ctx.lineWidth = cur ? 2.6 : 1.6; ctx.lineJoin = 'round';
      ctx.beginPath();
      const last = cur ? posAt(sh, sh.t).i : sh.path.length - 1;
      for (let k = 0; k <= last; k++) { const q = sh.path[k]; const [px, py] = w2s(q.x, q.y); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      if (cur && sh.state !== 'wait') { const p = posAt(sh, sh.t), [px, py] = w2s(p.x, p.y); ctx.lineTo(px, py); }
      ctx.stroke();
    });
    const lbPlaced = [];   // 낙하 지점이 가까우면 이름표가 겹치지 않게 아래로 내려요
    S.landings.forEach((l) => {
      const [sx, sy] = w2s(l.x, l.y);
      if (sx < -30 || sx > VW + 30 || sy < -30 || sy > VH + 30) return;
      ctx.strokeStyle = '#ff5d5d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 6, sy - 6); ctx.lineTo(sx + 6, sy + 6); ctx.moveTo(sx + 6, sy - 6); ctx.lineTo(sx - 6, sy + 6); ctx.stroke();
      let ly = sy + 20 * FS;
      for (let k = 0; k < 6; k++) { const hit = lbPlaced.some((q) => Math.abs(q[0] - sx) < 150 * FS && Math.abs(q[1] - ly) < 22 * FS); if (!hit) break; ly += 24 * FS; }
      lbPlaced.push([sx, ly]);
      D.label(sx, ly, f1(l.v) + ' km/s · ' + fmtN(l.range) + ' km', { bg: 'rgba(15,23,42,.82)', size: 12.5, pad: 7 });
    });
    // 대포
    ctx.save(); ctx.translate(ax, ay);
    const cs = PHONE ? 1.15 : 1;
    ctx.fillStyle = '#334155'; rr(-26 * cs, -12 * cs, 26 * cs, 10 * cs, 3).fill();
    ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(-12 * cs, -2 * cs, 7 * cs, 0, 7); ctx.fill();
    ctx.restore();
    // 공
    const sh = S.shot;
    if (sh && sh.state !== 'wait') { const p = posAt(sh, sh.t), [px, py] = w2s(p.x, p.y); D.glow(px, py, 12, '#ffb347', 0.5); D.sphere(px, py, 5.5 * FS, '#1f2937', { gloss: true }); }
    else { D.sphere(ax, ay - 2 * (PHONE ? 1.15 : 1), 5, '#1f2937'); }
    parts.draw(ctx);
    // 눈금자
    const km = niceKm(PHONE ? 90 : 110, c.s), px = km * c.s;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(16, VH - 22); ctx.lineTo(16 + px, VH - 22); ctx.moveTo(16, VH - 28); ctx.lineTo(16, VH - 16); ctx.moveTo(16 + px, VH - 28); ctx.lineTo(16 + px, VH - 16); ctx.stroke();
    D.text(16 + px / 2, VH - 32, fmtN(km) + ' km', { size: 13, weight: 800, color: '#fff', stroke: 'rgba(0,0,0,.6)', strokeWidth: 3 });
    // 안내 · 결과 표시
    D.text(14, 24, '뉴턴의 대포', { size: 16, weight: 800, color: '#fff', align: 'left', baseline: 'middle', stroke: 'rgba(0,0,0,.55)', strokeWidth: 3 });
    D.text(14, 46, '산 높이 20 km (상상) · 공기 저항 없음', { size: 12.5, weight: 700, color: '#e5e7eb', align: 'left', baseline: 'middle', stroke: 'rgba(0,0,0,.55)', strokeWidth: 3 });
    if (!sh) D.label(VW / 2, VH - 60, '속력을 정하고 🔥 발사!를 눌러요', { bg: 'rgba(15,23,42,.8)', size: 14, pad: 11 });
    else if (sh.cls !== 'impact' && sh.state === 'run') {
      D.label(VW - 14, 26, (sh.cls === 'circle' ? '원에 가까운 궤도' : '타원 궤도') + ' · ' + Math.floor(sh.laps * 100) + ' %', { bg: sh.cls === 'circle' ? '#14a058' : '#7c3aed', size: 13.5, pad: 10, align: 'right' });
    } else if (sh.cls === 'impact' && sh.state === 'done') {
      const [sx, sy] = w2s(sh.hit[0], sh.hit[1]);
      D.label(clamp(sx, 90, VW - 90), clamp(sy - 36 * FS, 70, VH - 70), '낙하! 거리 ' + fmtN(sh.range) + ' km', { bg: '#e2464b', size: 13.5, pad: 10 });
    }
  }

  /* ======================================================
     ② 낙하와 공전 (직선 경로 vs 실제 궤도)
     ====================================================== */
  const OG = (() => { const R2 = PHONE ? 168 : 150, s = R2 / R; return { cx: VW / 2, cy: VH / 2 + (PHONE ? 10 : 8), Rpx: R2, s }; })();
  const PICK_PHI = (40 * Math.PI) / 180;
  const orbitXY = (x, y) => [OG.cx + x * OG.s, OG.cy - y * OG.s];
  function newSat() { const v = vCirc(R_ISS); return { x: 0, y: R_ISS, vx: v, vy: 0, alive: true, trail: [], run: 0 }; }
  S.sat = newSat();
  const K2 = (2 * Math.PI * R_ISS / vCirc(R_ISS)) / 10;      // 한 바퀴를 10초에 보여 줘요
  function satReset() { S.sat = newSat(); S.grav = true; S.backRun = 0; updateCtl(); }
  function setGrav(on) { if (S.pick) return; S.grav = on; Sound.click(); updateCtl(); }
  function stepOrbit(dt) {
    const sat = S.sat;
    if (S.pick) {   // 가속도 방향 고르기: 위성을 PICK_PHI 위치에 세워 둠
      const v = vCirc(R_ISS);
      Object.assign(sat, { x: R_ISS * Math.cos(PICK_PHI), y: R_ISS * Math.sin(PICK_PHI), vx: v * Math.sin(PICK_PHI), vy: -v * Math.cos(PICK_PHI), alive: true, trail: [] });
      return;
    }
    if (!sat.alive) return;
    let rem = dt * K2;
    while (rem > 1e-6) {
      const h = Math.min(2, rem); rem -= h;
      if (S.grav) { const n = rk4([sat.x, sat.y, sat.vx, sat.vy], h); sat.x = n[0]; sat.y = n[1]; sat.vx = n[2]; sat.vy = n[3]; }
      else { sat.x += sat.vx * h; sat.y += sat.vy * h; }
      if (Math.hypot(sat.x, sat.y) <= R) { sat.alive = false; const [sx, sy] = orbitXY(sat.x, sat.y); parts.burst(sx, sy, { count: 16, speed: 120, size: 3.5, life: 0.8, colors: ['#ffb347', '#ff6b3a', '#fde68a'], gravity: 100 }); Sound.fail(); break; }
    }
    sat.run += dt;
    sat.trail.push([sat.x, sat.y]); if (sat.trail.length > 160) sat.trail.shift();
    const r = Math.hypot(sat.x, sat.y);
    if (!S.grav && r > R_ISS * 1.7) S.flewOff = true;
    if (S.grav && S.flewOff && sat.alive) S.backRun = (S.backRun || 0) + dt; else if (!S.flewOff) S.backRun = 0;
    if (S.backRun > 2.5) S.backOn = true;
  }
  function drawSatIcon(x, y, ang, sz) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = '#3b82f6'; rr(-sz * 0.2, -sz * 1.3, sz * 0.4, sz * 0.95, 2).fill(); rr(-sz * 0.2, sz * 0.35, sz * 0.4, sz * 0.95, 2).fill();
    ctx.fillStyle = '#e5e7eb'; rr(-sz * 0.55, -sz * 0.35, sz * 1.1, sz * 0.7, 4).fill();
    ctx.fillStyle = '#f26b3a'; ctx.fillRect(-sz * 0.2, -sz * 0.12, sz * 0.4, sz * 0.24);
    ctx.restore();
  }
  function unit(x, y) { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; }
  function drawOrbit(t) {
    spaceBg(t, { stars: 70 });
    const { cx, cy, Rpx, s } = OG, sat = S.sat;
    earthDisc(cx, cy, Rpx);
    ctx.strokeStyle = 'rgba(180,200,255,.35)'; ctx.lineWidth = 1.6; ctx.setLineDash([6, 7]); ctx.beginPath(); ctx.arc(cx, cy, R_ISS * s, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const [sx, sy] = orbitXY(sat.x, sat.y), sp = Math.hypot(sat.vx, sat.vy), r = Math.hypot(sat.x, sat.y);
    const vdx = sat.vx / sp, vdy = sat.vy / sp;
    // 지나온 길
    if (!S.pick && sat.trail.length > 2) { ctx.strokeStyle = 'rgba(255,209,102,.7)'; ctx.lineWidth = 2.4; ctx.beginPath(); sat.trail.forEach((q, i) => { const [px, py] = orbitXY(q[0], q[1]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); }
    // 직선 경로(중력이 없다면) + 실제로 떨어진 만큼
    let dTxt = '';
    if (!S.pick && sat.alive) {
      const dtp = 600;
      const Q = [sat.x + sat.vx * dtp, sat.y + sat.vy * dtp];
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([7, 6]); ctx.beginPath(); ctx.moveTo(sx, sy); const [qx, qy] = orbitXY(Q[0], Q[1]); ctx.lineTo(qx, qy); ctx.stroke(); ctx.setLineDash([]);
      if (S.grav) {
        let st = [sat.x, sat.y, sat.vx, sat.vy]; ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy);
        for (let i = 1; i <= 12; i++) { st = rk4(st, dtp / 12); const [px, py] = orbitXY(st[0], st[1]); ctx.lineTo(px, py); }
        ctx.stroke();
        const F = [st[0], st[1]], [fx, fy] = orbitXY(F[0], F[1]);
        ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(fx, fy); ctx.stroke();
        D.sphere(qx, qy, 4, '#fff', { gloss: false }); D.sphere(fx, fy, 4.5, '#7dd3fc', { gloss: false });
        const d = Math.hypot(Q[0] - F[0], Q[1] - F[1]);
        dTxt = '10분 동안 직선 경로(흰 점선)보다 지구 쪽으로 약 ' + fmtN(Math.round(d / 10) * 10) + ' km 떨어져요';
      }
    }
    // 위성과 화살표
    drawSatIcon(sx, sy, Math.atan2(-vdy, vdx), (S.pick ? 12 : 9) * FS);
    if (!S.pick && sat.alive) {
      D.arrow(sx, sy, sx + vdx * 62 * FS, sy - vdy * 62 * FS, { color: '#7cc4ff', width: 4, head: 11 });
      if (S.grav) { const [ux, uy] = unit(-sat.x, -sat.y); D.arrow(sx, sy, sx + ux * 62 * FS, sy - uy * 62 * FS, { color: '#ff6b6b', width: 4, head: 11 }); }
    }
    if (S.pick) drawPick(sx, sy);
    parts.draw(ctx);
    // 설명
    D.text(14, 24, S.pick ? '가속도의 방향을 골라요' : '위성의 움직임', { size: 16, weight: 800, color: '#fff', align: 'left', baseline: 'middle' });
    if (!S.pick) {
      const bx = 14, by = VH - (PHONE ? 130 : 96), bw = VW - 28;
      ctx.fillStyle = 'rgba(15,23,42,.78)'; rr(bx, by, bw, PHONE ? 116 : 84, 12).fill();
      let y = by + 18 * FS;
      D.sphere(bx + 16, y, 5, '#7cc4ff', { gloss: false }); y += textBlock('파랑 화살표: 속도 (' + f1(sp) + ' km/s)' + (S.grav ? ' — 속력은 같지만 방향이 계속 바뀌어요' : ' — 방향도 크기도 그대로예요'), bx + 30, y, bw - 44, { size: 13, color: '#e8eeff' });
      if (S.grav && sat.alive) { D.sphere(bx + 16, y + 3, 5, '#ff6b6b', { gloss: false }); y += textBlock('빨강 화살표: 가속도 (' + f1(gAt(r)) + ' m/s²) — 항상 지구 중심 방향', bx + 30, y + 3, bw - 44, { size: 13, color: '#ffd0d0' }); }
      else if (!S.grav) { y += textBlock('중력이 없으면 가속도가 0이라서 위성은 직선으로 날아가 버려요.', bx + 14, y + 3, bw - 28, { size: 13, weight: 800, color: '#fde68a' }); }
      if (dTxt) textBlock(dTxt, bx + 14, y + 4, bw - 28, { size: 13, weight: 800, color: '#fde68a' });
      if (!sat.alive) D.label(cx, 80, '위성이 지구에 떨어졌어요! ↺ 처음 자리로', { bg: '#e2464b', size: 14, pad: 12 });
    }
  }
  /* 가속도 방향 고르기: 네 방향 화살표 */
  const PICK_DIRS = () => {
    const v = [Math.sin(PICK_PHI), -Math.cos(PICK_PHI)], c = [-Math.cos(PICK_PHI), -Math.sin(PICK_PHI)];
    return [
      { id: 'fwd', label: 'A', name: '진행 방향', d: [v[0], -v[1]] },
      { id: 'center', label: 'B', name: '지구 중심 쪽', d: [c[0], -c[1]] },
      { id: 'out', label: 'C', name: '바깥쪽', d: [-c[0], c[1]] },
      { id: 'back', label: 'D', name: '진행 반대 방향', d: [-v[0], v[1]] },
    ];     // 화면 좌표 방향 (y 아래가 +)
  };
  const PICK_LEN = PHONE ? 92 : 84;
  function drawPick(sx, sy) {
    PICK_DIRS().forEach((p, i) => {
      const sel = S.pickSel === i, ex = sx + p.d[0] * PICK_LEN, ey = sy + p.d[1] * PICK_LEN;
      if (sel) D.glow(ex, ey, 30, '#ffd166', 0.6);
      D.arrow(sx, sy, ex, ey, { color: sel ? '#ffd166' : '#cbd5e1', width: sel ? 6 : 4, head: 13 });
      const lx = sx + p.d[0] * (PICK_LEN + 20), ly = sy + p.d[1] * (PICK_LEN + 20);
      D.sphere(lx, ly, 13 * FS, sel ? '#f59e0b' : '#475569', { gloss: false, text: p.label, textColor: '#fff', textScale: 1.0 });
      D.text(lx + (p.d[0] >= 0 ? 24 : -24) * FS, ly + 5, p.name, { size: 12.5, weight: 800, color: '#e5e7eb', align: p.d[0] >= 0 ? 'left' : 'right', stroke: 'rgba(0,0,0,.6)', strokeWidth: 3 });
    });
    D.text(VW / 2, VH - 28, '위성에 작용하는 가속도 화살표를 눌러 고르세요', { size: 14, weight: 800, color: '#fde68a', stroke: 'rgba(0,0,0,.6)', strokeWidth: 3 });
  }
  function pickClick(p) {
    const [sx, sy] = orbitXY(S.sat.x, S.sat.y);
    let best = -1, bd = 26;
    PICK_DIRS().forEach((q, i) => {
      const ex = sx + q.d[0] * PICK_LEN, ey = sy + q.d[1] * PICK_LEN;
      const vx = ex - sx, vy = ey - sy, wx = p.x - sx, wy = p.y - sy, tt = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy), 0, 1);
      const d = Math.hypot(wx - vx * tt, wy - vy * tt);
      const dl = Math.hypot(p.x - (sx + q.d[0] * (PICK_LEN + 20)), p.y - (sy + q.d[1] * (PICK_LEN + 20)));
      const dd = Math.min(d, dl);
      if (dd < bd) { bd = dd; best = i; }
    });
    if (best >= 0) { S.pickSel = best; Sound.click(); }
  }

  /* ======================================================
     ③ 거리와 가속도
     ====================================================== */
  const DL = PHONE ? { A: { x: 12, y: 12, w: 576, h: 250 }, B: { x: 12, y: 274, w: 576, h: 574 } } : { A: { x: 12, y: 12, w: 776, h: 192 }, B: { x: 12, y: 216, w: 776, h: 332 } };
  const logX = (rho) => { const A = DL.A, x0 = A.x + 56, x1 = A.x + A.w - 56; return x0 + (Math.log10(rho) / 2) * (x1 - x0); };
  function panelLight(r, fill) { D.shadow(() => { ctx.fillStyle = fill || '#fff'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: 12, y: 3 }); }
  function drawDist(t) {
    ctx.fillStyle = '#eef2f8'; ctx.fillRect(0, 0, VW, VH);
    const A = DL.A, B = DL.B;
    // A: 로그 눈금 거리자
    ctx.save(); rr(A.x, A.y, A.w, A.h, 14).clip();
    const g = ctx.createLinearGradient(0, A.y, 0, A.y + A.h); g.addColorStop(0, '#0b1226'); g.addColorStop(1, '#1d2a52');
    ctx.fillStyle = g; ctx.fillRect(A.x, A.y, A.w, A.h);
    ctx.restore();
    D.text(A.x + 14, A.y + 22, '지구 중심에서의 거리 (지구 반지름 R = 6371 km의 배수, 로그 눈금)', { size: PHONE ? 12.5 : 13.5, weight: 800, color: '#e8eeff', align: 'left', baseline: 'middle' });
    const ay = A.y + (PHONE ? 150 : 128);
    ctx.strokeStyle = '#8ea0cf'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(logX(1), ay); ctx.lineTo(logX(100), ay); ctx.stroke();
    [1, 2, 5, 10, 20, 50, 100].forEach((q) => { ctx.beginPath(); ctx.moveTo(logX(q), ay - 6); ctx.lineTo(logX(q), ay + 6); ctx.stroke(); D.text(logX(q), ay + 24 * FS, q + ' R', { size: 12, weight: 700, color: '#aebbe0' }); });
    // 지구 · 천체 아이콘
    const sel = STOPS[S.dsel];
    STOPS.forEach((p, i) => {
      const rho = p.r / R, x = logX(rho) + (i === 1 ? 10 : 0), on = i === S.dsel;
      const ico = i === 0 ? 0 : 1;
      if (on) D.glow(x, ay - 28 * FS, 32 * FS, '#ffd166', 0.5);
      ctx.font = font(on ? 28 : 22); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.fillText(p.icon, x, ay - 28 * FS);
      const ly = ay - 66 * FS, nm = p.name === '국제 우주 정거장' ? (PHONE ? 'ISS' : '국제 우주 정거장') : p.name;
      const dx = PHONE ? (i === 0 ? -44 : i === 1 ? 30 : 0) : (i === 0 ? -40 : i === 1 ? 40 : 0), al = i < 2 ? 'left' : 'center';
      D.text(x + dx, ly, nm, { size: 12.5, weight: 800, color: on ? '#fde68a' : '#cbd5f5', align: al });
      if (S.dseen.has(i)) D.text(x + dx, ay + 46 * FS, fmtG(gAt(p.r)) + ' m/s²', { size: 12.5, weight: 800, color: '#ffd0d0', align: al });
    });
    // 선택한 곳의 중력 화살표 (지구 쪽)
    const sx = logX(sel.r / R) + (S.dsel === 1 ? 10 : 0);
    D.arrow(sx - 12, ay - 28 * FS, Math.max(logX(1) + 10, sx - 12 - 56), ay - 28 * FS, { color: '#ff6b6b', width: 4, head: 11 });
        // B: 막대 비교
    panelLight(B);
    D.text(B.x + 14, B.y + 24, '중력 가속도 g (m/s²) — 막대는 실제 비율이에요', { size: 15, weight: 800, color: '#1b2333', align: 'left', baseline: 'middle' });
    const rh = PHONE ? 104 : 50, y0 = B.y + 44, barX = B.x + (PHONE ? 16 : 190), barW = PHONE ? B.w - 150 : 380;
    STOPS.forEach((p, i) => {
      const y = y0 + i * rh, seen = S.dseen.has(i), on = i === S.dsel, a = gAt(p.r);
      if (on) { ctx.fillStyle = '#fff4ea'; rr(B.x + 8, y - 2, B.w - 16, rh - 4, 10).fill(); ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2; rr(B.x + 8, y - 2, B.w - 16, rh - 4, 10).stroke(); }
      const ty = PHONE ? y + 16 : y + rh / 2 - 8;
      D.text(B.x + 18, ty, p.icon + ' ' + p.name, { size: 14, weight: 800, color: '#1b2333', align: 'left', baseline: 'middle' });
      if (!PHONE) D.text(B.x + 18, ty + 17, p.id === 'surf' ? 'r = 1 R' : '지구 중심에서 ' + fmtN(p.r) + ' km', { size: 11.5, weight: 700, color: '#64748b', align: 'left', baseline: 'middle' });
      const by = PHONE ? y + 34 : y + 6;
      ctx.fillStyle = '#eef2f8'; rr(barX, by, barW, 18, 5).fill();
      if (seen) { const w = barW * a / G0; if (w >= 0.5) { ctx.fillStyle = i === 3 ? '#7c3aed' : '#f26b3a'; rr(barX, by, Math.max(0.5, w), 18, Math.min(5, w / 2)).fill(); } }
      const vx = PHONE ? barX : barX + barW + 12, vy = PHONE ? by + 36 : by + 9;
      D.text(vx, vy, seen ? fmtG(a) + ' m/s²' : '? (거리를 눌러 보세요)', { size: 14, weight: 800, color: seen ? '#9a3412' : '#94a3b8', align: 'left', baseline: 'middle' });
      if (seen) {
        const info = '원 궤도 속력 ' + f1(vCirc(p.r)) + ' km/s · 주기 ' + (periodMin(p.r) < 180 ? '약 ' + f1(periodMin(p.r)) + '분' : fmtPeriod(p.r).replace('약 ', '약 '));
        const ix = barX, iy = PHONE ? by + 58 : by + 28;
        D.text(ix, iy, info, { size: 11.5, weight: 700, color: '#64748b', align: 'left', baseline: 'middle' });
      }
    });
    const ny = y0 + 4 * rh + 6;
    ctx.fillStyle = '#f8fafc'; rr(B.x + 10, ny, B.w - 20, B.y + B.h - ny - 10, 10).fill();
    let yy = ny + 18 * FS;
    if (S.dsel === 3 && S.dseen.has(3)) yy += textBlock('달에도 지구 중력이 작용해요. 달은 날아가면서 지구 쪽으로 매 순간 떨어지고 있어서 지구 둘레를 돌아요.', B.x + 22, yy, B.w - 44, { size: 13.5, weight: 800, color: '#6d28d9' }) + 4;
    else yy += textBlock('거리가 멀어질수록 g는 작아져요. 하지만 0이 되지는 않아요. (달: 0.0027 m/s², 막대가 너무 짧아 보이지 않아요)', B.x + 22, yy, B.w - 44, { size: 13.5, weight: 700, color: '#2b3445' }) + 4;
    textBlock('거리가 2배가 되면 g는 약 1/4로 줄어요. (정지 위성은 약 6.6 R: 9.8 ÷ 6.6² ≈ 0.22)', B.x + 22, yy, B.w - 44, { size: 13.5, weight: 700, color: '#2b3445' });
  }

  /* ======================================================
     ④ 우주 정거장 · 자유 낙하 승강기 (무중량)
     ====================================================== */
  const MASS = 60, MG_ISS = Math.round(MASS * gAt(R_ISS) / 10) * 10, MG_SURF = Math.round(MASS * G0);
  const MOD = PHONE ? { x: 18, y: 64, w: 564, h: 400 } : { x: 28, y: 52, w: 560, h: 300 };
  function initStation() {
    const M = MOD;
    S.drops = [0, 1, 2].map((i) => ({ x: M.x + M.w * (0.25 + 0.25 * i), y: M.y + M.h * (0.3 + 0.2 * (i % 2)), vx: rnd(-14, 14), vy: rnd(-14, 14), r: 11 * FS, hit: 0 }));
    S.ast = { x: M.x + M.w * 0.5, y: M.y + M.h * 0.5, vx: 8, vy: -4, rot: 0.2, vr: 0.2 };
  }
  initStation();
  function stepStation(dt) {
    const M = MOD;
    const bounce = (o, rx, ry) => {
      if (o.x < M.x + rx) { o.x = M.x + rx; o.vx = Math.abs(o.vx) * 0.9; } if (o.x > M.x + M.w - rx) { o.x = M.x + M.w - rx; o.vx = -Math.abs(o.vx) * 0.9; }
      if (o.y < M.y + ry) { o.y = M.y + ry; o.vy = Math.abs(o.vy) * 0.9; } if (o.y > M.y + M.h - ry) { o.y = M.y + M.h - ry; o.vy = -Math.abs(o.vy) * 0.9; }
    };
    if (S.st === 'iss') {
      S.drops.forEach((d) => { d.x += d.vx * dt; d.y += d.vy * dt; d.hit = Math.max(0, d.hit - dt * 2); bounce(d, d.r, d.r); });
      const a = S.ast; a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.vr * dt; bounce(a, 50, 76);
      for (let i = 0; i < S.drops.length; i++) for (let j = i + 1; j < S.drops.length; j++) {   // 물방울끼리 튕김
        const p = S.drops[i], q = S.drops[j], dx = q.x - p.x, dy = q.y - p.y, dd = Math.hypot(dx, dy), m = p.r + q.r;
        if (dd < m && dd > 0.01) { const nx = dx / dd, ny = dy / dd, vn = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny; if (vn > 0) { p.vx -= vn * nx; p.vy -= vn * ny; q.vx += vn * nx; q.vy += vn * ny; } const o = (m - dd) / 2; p.x -= nx * o; p.y -= ny * o; q.x += nx * o; q.y += ny * o; }
      }
    } else {
      const L = S.lift;
      if (L.state === 'fall') {
        L.t += dt; const T = Math.sqrt(2 * LIFT.drop / G0);
        if (L.t >= T) { L.t = T; L.state = 'stop'; Sound.fail(); parts.burst(LIFT.x + LIFT.w / 2, LIFT.floorY, { count: 14, speed: 110, size: 3, life: 0.7, colors: ['#cbd5e1', '#94a3b8'], gravity: 160 }); }
        L.y = 0.5 * G0 * L.t * L.t;
      }
    }
  }
  const LIFT = (() => PHONE ? { x: 60, w: 250, h: 190, top: 90, k: 40, drop: 8, floorY: 0 } : { x: 70, w: 230, h: 180, top: 70, k: 36, drop: 8, floorY: 0 })();
  LIFT.floorY = LIFT.top + LIFT.drop * LIFT.k + LIFT.h;
  function pushDrops(from) {
    S.drops.forEach((d) => { const dx = d.x - from.x, dy = d.y - from.y, dd = Math.hypot(dx, dy) || 1; const f = 60 / (1 + dd / 120); d.vx += dx / dd * f + rnd(-10, 10); d.vy += dy / dd * f + rnd(-10, 10); d.hit = 1; });
  }
  function stationClick(p) {
    if (S.st !== 'iss') return;
    let hit = false;
    S.drops.forEach((d) => { if (Math.hypot(p.x - d.x, p.y - d.y) < d.r + 16) { const dx = d.x - p.x, dy = d.y - p.y, dd = Math.hypot(dx, dy) || 1; d.vx += dx / dd * 70 + rnd(-8, 8); d.vy += dy / dd * 70 + rnd(-8, 8); d.hit = 1; hit = true; } });
    const a = S.ast;
    if (!hit && Math.abs(p.x - a.x) < 50 && Math.abs(p.y - a.y) < 80) { a.vx += (a.x - p.x) * 1.2 + rnd(-6, 6); a.vy += (a.y - p.y) * 1.2 + rnd(-6, 6); a.vr += rnd(-0.5, 0.5); hit = true; }
    if (hit) { S.taps++; Sound.tick(); updateCtl(); }
  }
  function drawAst(x, y, rot, k, arms) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    drawAstronautBody(k, arms);
    ctx.restore();
  }
  function drawAstronautBody(k, up) {
    // 중심이 몸통 한가운데인 우주복 그림 (키 약 1.8 m = 3.6k)
    ctx.fillStyle = '#e5e7eb'; rr(-0.17 * k, 0.3 * k, 0.3 * k, 1.5 * k, 0.12 * k).fill(); rr(0.0 * k, 0.3 * k + (up ? -0.1 * k : 0), 0.3 * k, 1.5 * k, 0.12 * k).fill();
    ctx.fillStyle = '#94a3b8'; rr(-0.2 * k, 1.7 * k, 0.38 * k, 0.2 * k, 0.06 * k).fill(); rr(0.0 * k, 1.7 * k + (up ? -0.1 * k : 0), 0.38 * k, 0.2 * k, 0.06 * k).fill();
    D.shadow(() => { ctx.fillStyle = '#f3f4f6'; rr(-0.4 * k, -1.0 * k, 0.8 * k, 1.5 * k, 0.2 * k).fill(); }, { blur: 4, y: 2 });
    ctx.fillStyle = '#f26b3a'; rr(-0.14 * k, -0.35 * k, 0.28 * k, 0.2 * k, 0.04 * k).fill();
    ctx.strokeStyle = '#f3f4f6'; ctx.lineWidth = 0.26 * k; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0.4 * k, -0.7 * k); ctx.lineTo(0.8 * k, up ? -1.4 * k : -0.1 * k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.4 * k, -0.7 * k); ctx.lineTo(-0.8 * k, up ? -1.4 * k : -0.1 * k); ctx.stroke();
    D.sphere(0, -1.5 * k, 0.5 * k, '#f3f4f6', { gloss: false });
    ctx.fillStyle = '#1e3a8a'; rr(-0.05 * k, -1.7 * k, 0.5 * k, 0.4 * k, 0.18 * k).fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; rr(0.08 * k, -1.65 * k, 0.2 * k, 0.1 * k, 0.05 * k).fill();
  }
  function scaleIcon(x, y, w, reading, ok) {
    D.shadow(() => { ctx.fillStyle = '#f1f5f9'; rr(x - w / 2, y, w, 22 * FS, 8).fill(); }, { blur: 4, y: 2 });
    ctx.fillStyle = '#0f172a'; rr(x - w * 0.22, y + 4 * FS, w * 0.44, 14 * FS, 3).fill();
    D.text(x, y + 11.5 * FS, (typeof reading === 'number' ? reading + ' N' : reading), { size: 11.5, weight: 800, color: ok ? '#86efac' : '#fca5a5', baseline: 'middle' });
  }
  function drawStation(t) {
    spaceBg(t, { stars: 60 });
    if (S.st === 'iss') drawISS(t); else drawLift(t);
    parts.draw(ctx);
  }
  function drawISS(t) {
    const M = MOD;
    // 지구 (아래)
    const ex = M.x + M.w / 2, ey = M.y + M.h + 560 * (PHONE ? 1.1 : 1), er = 500 * (PHONE ? 1.1 : 1) + 40;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
    D.glow(ex, ey, er * 1.06, '#6bb6ff', 0.3);
    const g = ctx.createRadialGradient(ex - er * 0.2, ey - er * 0.7, er * 0.2, ex, ey, er); g.addColorStop(0, '#5aa9ee'); g.addColorStop(1, '#1d5ba6');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 모듈
    D.shadow(() => { ctx.fillStyle = '#cfd6e2'; rr(M.x - 10, M.y - 10, M.w + 20, M.h + 20, 26).fill(); }, { blur: 14, y: 4 });
    const wg = ctx.createLinearGradient(0, M.y, 0, M.y + M.h); wg.addColorStop(0, '#f1f5f9'); wg.addColorStop(1, '#dbe3ee');
    ctx.fillStyle = wg; rr(M.x, M.y, M.w, M.h, 18).fill();
    ctx.strokeStyle = '#b6c2d4'; ctx.lineWidth = 2; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(M.x + (M.w * i) / 6, M.y + 6); ctx.lineTo(M.x + (M.w * i) / 6, M.y + M.h - 6); ctx.stroke(); }
    ctx.fillStyle = '#8fb4e8'; rr(M.x + M.w * 0.7, M.y + M.h * 0.1, M.w * 0.24, M.h * 0.34, 20).fill();   // 창문
    ctx.fillStyle = '#2f77c9'; ctx.beginPath(); ctx.ellipse(M.x + M.w * 0.82, M.y + M.h * 0.42, M.w * 0.1, M.h * 0.14, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 4; rr(M.x + M.w * 0.7, M.y + M.h * 0.1, M.w * 0.24, M.h * 0.34, 20).stroke();
    // 물방울
    S.drops.forEach((d) => {
      D.sphere(d.x, d.y, d.r, '#7cc4ff', { light: '#e0f2ff', dark: '#2a7fd0' });
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * d.hit) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(d.x, d.y, d.r + 6 * d.hit + 2, 0, 7); ctx.stroke();
    });
    // 우주인 (둥둥)
    const a = S.ast, k = 0.5 * 34 * FS / 0.5 / 1.0;
    drawAst(a.x, a.y, a.rot, 21 * (PHONE ? 1.05 : 1), true);
    // 저울 · 중력 막대
    const ix = MOD.x, iy = MOD.y + MOD.h + 26, iw = MOD.w;
    D.label(M.x + 16, M.y + 22, '국제 우주 정거장 안 (고도 약 400 km)', { bg: 'rgba(15,23,42,.8)', size: 13, pad: 9, align: 'left' });
    const px = PHONE ? 18 : 604, py = PHONE ? MOD.y + MOD.h + 74 : 52, pw = PHONE ? 564 : 180;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(px, py, pw, PHONE ? 300 : 340, 14).fill();
    const lx = px + 14, tw = pw - 28; let y = py + 22 * FS;
    D.text(lx, y, '🧑‍🚀 몸무게 ' + MASS + ' kg 우주인', { size: 14, weight: 800, color: '#1b2333', align: 'left', baseline: 'middle' }); y += 28 * FS;
    const row = (label, val, max, col) => {
      D.text(lx, y, label, { size: 12.5, weight: 800, color: '#475569', align: 'left', baseline: 'middle' }); y += 20 * FS;
      ctx.fillStyle = '#eef2f8'; rr(lx, y, tw, 14, 5).fill(); if (val > 0) { ctx.fillStyle = col; rr(lx, y, Math.max(2, tw * val / max), 14, 5).fill(); }
      y += 28 * FS; D.text(lx, y - 5 * FS, val + ' N', { size: 14, weight: 800, color: col === '#94a3b8' ? '#475569' : col, align: 'left', baseline: 'middle' }); y += 14 * FS;
    };
    row('지표에서의 중력', MG_SURF, 600, '#f26b3a');
    row('정거장 중력 (8.7 m/s²)', MG_ISS, 600, '#e2464b');
    row('저울 눈금 (정거장 안)', 0, 600, '#94a3b8');
    if (!PHONE || y < py + 290) textBlock('중력이 약해진 게 아니에요! 우주인과 정거장이 함께 지구로 떨어지는(자유 낙하) 중이라 무중량이에요.', lx, y + 4, tw, { size: 12.5, weight: 800, color: '#9a3412' });
    // 지구 중심 방향 화살표
    D.arrow(M.x + M.w * 0.5, M.y + M.h + 14, M.x + M.w * 0.5, M.y + M.h + 56, { color: '#ff6b6b', width: 4, head: 11 });
    D.text(M.x + M.w * 0.5 + 12, M.y + M.h + 40, '지구 중심 방향 a = 8.7 m/s²', { size: 12.5, weight: 800, color: '#ffd0d0', align: 'left', stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 });
    D.arrow(M.x + 26, M.y + M.h + 30, M.x + 96, M.y + M.h + 30, { color: '#7cc4ff', width: 3.5, head: 10 });
    D.text(M.x + 104, M.y + M.h + 34, 'v 약 7.7 km/s', { size: 12.5, weight: 800, color: '#cfe8ff', align: 'left', stroke: 'rgba(0,0,0,.5)', strokeWidth: 3 });
    if (S.taps < 1) D.label(M.x + M.w / 2, M.y + M.h - 22, '물방울이나 우주인을 눌러 보세요', { bg: 'rgba(15,23,42,.8)', size: 13.5, pad: 10 });
  }
  function drawLift(t) {
    const L = LIFT, st = S.lift, k = L.k;
    const shaftTop = L.top - 14, shaftBot = L.floorY + 18;
    // 승강기 통로
    ctx.fillStyle = '#1f2a48'; rr(L.x - 20, shaftTop, L.w + 40, shaftBot - shaftTop, 12).fill();
    ctx.strokeStyle = 'rgba(180,200,255,.3)'; ctx.lineWidth = 1.5;
    for (let m = 0; m <= L.drop; m += 2) { const y = L.top + m * k + L.h; ctx.beginPath(); ctx.moveTo(L.x - 20, y); ctx.lineTo(L.x - 8, y); ctx.stroke(); D.text(L.x - 24, y + 4, m + ' m', { size: 11.5, weight: 700, color: '#aebbe0', align: 'right' }); }
    ctx.fillStyle = '#6b7280'; rr(L.x - 20, L.floorY, L.w + 40, 18, 6).fill();
    D.text(L.x + L.w / 2, L.floorY + 12, '바닥', { size: 11.5, weight: 800, color: '#e5e7eb' });
    const cy = L.top + st.y * k;
    // 줄
    if (!S.cut) { ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(L.x + L.w / 2, shaftTop); ctx.lineTo(L.x + L.w / 2, cy); ctx.stroke(); }
    else { ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(L.x + L.w / 2, shaftTop); ctx.lineTo(L.x + L.w / 2 - 6, shaftTop + 26); ctx.stroke(); }
    // 승강기 칸
    D.shadow(() => { ctx.fillStyle = '#e8eef7'; rr(L.x, cy, L.w, L.h, 10).fill(); }, { blur: 8, y: 3 });
    ctx.fillStyle = '#d3dcea'; rr(L.x + 8, cy + 8, L.w - 16, L.h - 16, 6).fill();
    // 사람과 저울: 사람 키 1.8 m = 1.8 * k 픽셀 (칸 높이 5 m가 아니라 그림용으로 줄인 칸)
    const fl = cy + L.h - 8, pk = L.h / 4.2 / 3.6 * 1.0 * 2.0;
    const float = st.state === 'ready' ? 0 : Math.min(1, st.t / 0.5);
    scaleIcon(L.x + L.w / 2, fl - 22 * FS, 80 * FS, st.state === 'ready' ? MG_SURF : (st.state === 'stop' ? '—' : 0), st.state !== 'ready');
    ctx.save(); ctx.translate(L.x + L.w / 2, fl - 22 * FS - (1.9 * pk) - float * 14 * FS - 2); drawAstronautBody(pk, st.state !== 'ready' && st.state !== 'stop' ? true : false); ctx.restore();
    // 설명 패널
    const px = PHONE ? 18 : 380, py = PHONE ? shaftBot + 24 : 52, pw = PHONE ? 564 : 400;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(px, py, pw, PHONE ? 250 : 330, 14).fill();
    const lx = px + 16, tw = pw - 32; let y = py + 24 * FS;
    D.text(lx, y, '🛗 자유 낙하 승강기 (몸무게 ' + MASS + ' kg)', { size: 14.5, weight: 800, color: '#1b2333', align: 'left', baseline: 'middle' }); y += 30 * FS;
    const reading = st.state === 'ready' ? MG_SURF : st.state === 'stop' ? null : 0;
    y += textBlock('중력: ' + MASS + ' kg × 9.8 m/s² = ' + MG_SURF + ' N (줄을 끊어도 그대로예요)', lx, y, tw, { size: 13.5, weight: 800, color: '#b91c1c' }) + 6;
    y += textBlock('저울 눈금: ' + (reading == null ? '—' : reading + ' N'), lx, y, tw, { size: 14.5, weight: 800, color: reading === 0 ? '#0b6b39' : '#1b2333' }) + 8;
    y += textBlock(st.state === 'ready' ? '줄을 끊기 전: 저울이 몸을 받쳐 줘서 눈금이 중력과 같아요.' : st.state === 'fall' ? '낙하 중: 승강기와 사람이 같은 가속도 9.8 m/s²로 떨어져서 저울이 사람을 밀지 않아요 → 무중량!' : '바닥에 닿아 멈췄어요. 떨어지는 동안(약 ' + f1(Math.sqrt(2 * L.drop / G0)) + '초)만 무중량이었어요.', lx, y, tw, { size: 13.5, weight: 700, color: '#2b3445' }) + 6;
    if (!PHONE || y < py + 230) textBlock('우주 정거장도 같아요. 지구를 돌며 계속 떨어지는 중이라서 무중량이에요.', lx, y, tw, { size: 13, weight: 800, color: '#9a3412' });
    if (st.state === 'fall' && !RM) { ctx.strokeStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 4; i++) { const x = L.x + 20 + i * 62; ctx.beginPath(); ctx.moveTo(x, cy - 12 - ((t * 400 + i * 40) % 80)); ctx.lineTo(x, cy - 40 - ((t * 400 + i * 40) % 80)); ctx.stroke(); } }
  }
  function cutLift() { if (S.st !== 'lift' || S.lift.state !== 'ready') return; S.cut = true; S.lift = { state: 'fall', t: 0, y: 0 }; S.liftDone = true; Sound.click(); updateCtl(); }
  function resetStation() { S.cut = false; S.lift = { state: 'ready', t: 0, y: 0 }; initStation(); updateCtl(); }

  /* ======================================================
     화면 · 조작 연결
     ====================================================== */
  const hint = $('#stageHint');
  let hintTimer = 0;
  function showHint(msg, ms) { hint.textContent = msg; hint.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => hint.classList.add('hide'), ms || 4200); }
  const TB = { cannon: '💥 뉴턴의 대포', orbit: '🛰️ 낙하와 공전', dist: '📏 거리와 중력 가속도', station: '🧑‍🚀 무중량' };
  function setMode(m) {
    if (S.mode !== m) { S.mode = m; S.fade = 1; parts.clear(); if (m !== 'orbit') S.pick = false; }
    updateCtl();
  }
  function setDist(i) { S.dsel = i; S.dseen.add(i); Sound.click(); updateCtl(); }
  function setSt(id) { if (S.st === id) return; S.st = id; S.fade = 1; parts.clear(); resetStation(); }
  function updateCtl() {
    $$('#ctrlCard .control').forEach((c) => { const ms = (c.dataset.modes || '').split(/\s+/); c.hidden = ms.indexOf(S.mode) < 0; });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $('#tbLabel').textContent = TB[S.mode];
    $('#sV').value = S.v; $('#sV').style.setProperty('--pct', ((S.v - 1) / 8 * 100) + '%'); $('#oV').textContent = f1(S.v) + ' km/s';
    $('#vMinus').disabled = S.v <= 1.0001; $('#vPlus').disabled = S.v >= 8.9999;
    $('#gravBtn').setAttribute('aria-pressed', S.grav ? 'true' : 'false'); $('#gravBtn').textContent = S.grav ? '🌍 지구의 중력: 켜짐' : '🌍 지구의 중력: 꺼짐';
    $('#gravBtn').disabled = S.pick; $('#satReset').disabled = S.pick;
    $('#orbitNote').textContent = S.pick ? '화면에서 가속도 화살표를 눌러 골라요.' : S.grav ? '중력을 끄면 위성이 어떻게 될까요? 껐다가 다시 켜 보세요.' : '위성이 직선으로 날아가고 있어요. ↺ 버튼으로 되돌려요.';
    $$('#distBtns .opt').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.d === S.dsel ? 'true' : 'false'));
    $('#oDist').textContent = STOPS[S.dsel].name;
    $$('#stSeg .opt').forEach((b) => b.setAttribute('aria-pressed', b.dataset.s === S.st ? 'true' : 'false'));
    $('#stGo').textContent = S.st === 'iss' ? '💧 물방울 밀기' : '✂️ 줄 끊기';
    $('#stGo').disabled = S.st === 'lift' && S.lift.state !== 'ready';
    $('#stNote').textContent = S.st === 'iss' ? '물방울이나 우주인을 눌러 살짝 밀어 보세요. (' + Math.min(S.taps, 99) + '번)' : '줄을 끊으면 승강기와 사람이 함께 자유 낙하해요.';
    readouts();
  }
  function readouts() {
    const L = ['', '', ''], V = ['', '', ''];
    if (S.mode === 'cannon') {
      const sh = S.shot;
      L[0] = '발사 속력'; V[0] = f1(S.v) + ' km/s';
      L[1] = '결과';
      L[2] = '낙하 지점까지 거리';
      if (!sh) { V[1] = '아직 쏘지 않았어요'; V[2] = '—'; }
      else if (sh.cls === 'impact') { V[1] = sh.state === 'done' ? '지구에 떨어졌어요' : '날아가는 중…'; V[2] = sh.state === 'done' ? fmtN(sh.range) + ' km' : '—'; }
      else { V[1] = (sh.cls === 'circle' ? '원에 가까운 궤도' : '타원 궤도') + ' · ' + Math.floor(sh.laps * 100) + ' %'; L[2] = '궤도의 높이 (낮은 곳 ~ 높은 곳)'; V[2] = fmtN(sh.rp - R) + ' ~ ' + fmtN(sh.ra - R) + ' km'; }
    } else if (S.mode === 'orbit') {
      const sat = S.sat, r = Math.hypot(sat.x, sat.y), sp = Math.hypot(sat.vx, sat.vy);
      L[0] = '위성의 속력 |v|'; V[0] = f1(sp) + ' km/s';
      L[1] = '가속도 a'; V[1] = !sat.alive ? '추락!' : S.grav ? fmtG(gAt(r)) + ' m/s² (중심 방향)' : '0 (중력이 꺼짐)';
      L[2] = '지구 중심까지 거리'; V[2] = fmtN(r) + ' km';
    } else if (S.mode === 'dist') {
      const p = STOPS[S.dsel];
      L[0] = '고른 곳'; V[0] = p.name; L[1] = '중력 가속도 g'; V[1] = fmtG(gAt(p.r)) + ' m/s²'; L[2] = '지구 중심에서 거리'; V[2] = fmtN(p.r) + ' km';
    } else if (S.st === 'iss') {
      L[0] = '정거장에서의 중력'; V[0] = '약 ' + MG_ISS + ' N (' + MASS + ' kg)'; L[1] = '저울 눈금'; V[1] = '0 N'; L[2] = '상태'; V[2] = '무중량 = 자유 낙하';
    } else {
      const st = S.lift;
      L[0] = '중력'; V[0] = MG_SURF + ' N (' + MASS + ' kg)'; L[1] = '저울 눈금'; V[1] = st.state === 'ready' ? MG_SURF + ' N' : st.state === 'fall' ? '0 N' : '—'; L[2] = '승강기 가속도'; V[2] = st.state === 'fall' ? '9.8 m/s² (아래)' : '0';
    }
    for (let i = 0; i < 3; i++) { const a = $('#l' + (i + 1)), b = $('#v' + (i + 1)); if (a.textContent !== L[i]) a.textContent = L[i]; if (b.textContent !== V[i]) b.textContent = V[i]; }
  }
  $('#sV').addEventListener('input', (e) => { S.v = Math.round(+e.target.value * 10) / 10; updateCtl(); });
  $('#vMinus').addEventListener('click', () => { S.v = Math.max(1, Math.round((S.v - 0.1) * 10) / 10); Sound.tick(); updateCtl(); });
  $('#vPlus').addEventListener('click', () => { S.v = Math.min(9, Math.round((S.v + 0.1) * 10) / 10); Sound.tick(); updateCtl(); });
  $('#fireBtn').addEventListener('click', fire);
  $('#clearShots').addEventListener('click', () => { Sound.click(); clearShots(); });
  $('#gravBtn').addEventListener('click', () => setGrav(!S.grav));
  $('#satReset').addEventListener('click', () => { Sound.click(); satReset(); });
  $$('#distBtns .opt').forEach((b) => b.addEventListener('click', () => setDist(+b.dataset.d)));
  $$('#stSeg .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSt(b.dataset.s); }));
  $('#stGo').addEventListener('click', () => { if (S.st === 'iss') { pushDrops({ x: MOD.x + MOD.w / 2, y: MOD.y + MOD.h / 2 }); S.taps++; Sound.tick(); updateCtl(); } else cutLift(); });
  $('#stReset').addEventListener('click', () => { Sound.click(); resetStation(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  SciSim.pointer(view, {
    down(p) { if (S.mode === 'orbit' && S.pick) pickClick(p); else if (S.mode === 'station') stationClick(p); return false; },
    hover(p) { return S.mode === 'station' && S.st === 'iss' ? 'pointer' : S.pick ? 'pointer' : null; },
  });
  if (PHONE) view.canvas.style.touchAction = 'pan-y';

  /* ======================================================
     단계 · 미션
     ====================================================== */
  const chip3 = (items) => items.map(([ok, label]) => mark(ok) + ' ' + label).join('  ');
  const levels = [
    {
      title: '대포 던지기: 얼마나 빨라야 한 바퀴 돌까?', short: '대포 던지기', icon: '💥', phase: '관찰',
      features: ['cannon'],
      intro: '<p class="si-q">❓ 탐구 질문: 인공위성은 왜 떨어지지 않고 지구 주위를 돌까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 지구가 태양 둘레를 도는 공전(중1)과 자유 낙하(중3)를 배웠고, <b>앞 차시</b>에서는 수평으로 던진 공이 속력이 클수록 멀리 떨어진다는 것을 봤어요.</div>' +
        '<p>아주 높은 산 위의 <b>대포</b>(뉴턴의 대포)를 수평으로 쏴요. 발사 속력을 점점 키우면 대포알은 어디에 떨어질까요? (공기 저항은 없다고 해요)</p>',
      setup() { setMode('cannon'); S.landings = []; S.shots = []; S.shot = null; S.circleLaps = 0; S.camT = Object.assign({}, fitCam(IDLE_BOX)); updateCtl(); },
      recap: '속력이 클수록 대포알은 더 멀리 떨어지고, 약 7.9 km/s가 되면 떨어지는 만큼 지구 표면이 휘어져 있어서 계속 떨어지며 지구를 한 바퀴 돌아요.',
      summary: '<ul><li>수평으로 쏜 대포알은 속력이 클수록 <b>더 멀리</b> 떨어져요.</li><li>지표 근처에서 약 <b>7.9 km/s</b>로 쏘면 떨어지는 만큼 지구 표면이 휘어져서 <b>원 궤도</b>로 지구를 돌아요.</li><li>7.9 km/s보다 조금 더 빠르면 <b>타원 궤도</b>가 돼요.</li></ul>' +
        '<p class="note">이 차시에서는 7.9 km/s = 지구를 스치듯 도는 속력(제1우주 속도)만 다뤄요.</p>',
      missions: [
        {
          title: '낙하 지점 3개 찍기',
          goal: '발사 속력을 <b>서로 다르게</b> 해서 대포알을 <b>3번</b> 쏘고, 낙하 지점을 3곳 만들어요.',
          hint: '1 km/s, 4 km/s, 7 km/s처럼 속력을 크게 바꿔 쏴 보세요. 속력이 클수록 낙하 지점이 멀어져요.',
          setup() { setMode('cannon'); showHint('속력을 정하고 🔥 발사!', 5000); },
          hold: 0.4,
          check: () => S.landings.length >= 3,
          status: () => '낙하 지점 <b>' + Math.min(3, S.landings.length) + ' / 3</b> ' + S.landings.map((l) => '· ' + f1(l.v) + ' km/s').join(' '),
          explain: '속력이 클수록 낙하 지점이 멀어져요. 대포알은 수평 방향으로 날아가면서 동시에 중력으로 <b>떨어지기</b> 때문이에요. 속력이 클수록 떨어지는 동안 더 멀리 가고, 그 사이에 지구 표면도 휘어져 있어요.',
        },
        {
          title: '원 궤도 만들기',
          goal: '대포알이 땅에 떨어지지 않고 <b>한 바퀴 돌도록</b> 속력을 맞춰 쏴 보세요.',
          hint: '낙하 지점이 점점 멀어졌어요. 속력을 7.9 ~ 8.0 km/s 근처로 맞춰 보세요.',
          setup() { setMode('cannon'); S.circleLaps = 0; showHint('떨어지지 않고 한 바퀴 도는 속력을 찾아요', 5000); },
          hold: 0.6,
          check: () => !!(S.shot && S.shot.cls === 'circle' && S.shot.laps >= 1),
          status: () => { const sh = S.shot; const circ = !!(sh && sh.cls === 'circle'); return chip3([[circ, '원 궤도'], [circ && sh.laps >= 1, '한 바퀴 (' + (circ ? Math.min(100, Math.floor(sh.laps * 100)) : 0) + ' %)']]); },
          explain: '속력이 약 <b>7.9 km/s</b>일 때, 대포알이 떨어지는 만큼 지구 표면이 휘어져 있어서 대포알은 계속 떨어지면서도 <b>땅에 닿지 않아요</b>. 이것이 인공위성이 지구 둘레를 도는 원리예요.',
        },
        {
          type: 'quiz', title: '속력에 따라 달라지는 운동',
          goal: '발사 속력이 7.9 km/s보다 <b>훨씬 작을 때</b>와 <b>약 7.9 km/s일 때</b>, 대포알은 각각 어떻게 될까요?',
          setup() { setMode('cannon'); },
          choices: ['작으면 곧바로 우주로 날아가고, 7.9 km/s에서는 땅에 떨어진다', '작으면 지구에 떨어지고(속력이 클수록 멀리), 약 7.9 km/s가 되면 떨어지지 않고 지구를 돈다', '속력과 상관없이 모두 같은 곳에 떨어진다', '7.9 km/s에서는 중력이 사라져서 공중에 떠 있다'],
          answer: 1,
          feedback: ['속력이 작으면 중력이 대포알을 지구로 끌어내려요. 우주로 날아가지 않아요.', '', '속력이 클수록 낙하 지점이 멀어졌어요.', '중력은 사라지지 않아요. 중력 때문에 계속 떨어지는 거예요.'],
          explain: '대포알은 속력이 작으면 <b>지구에 떨어지고</b>, 약 <b>7.9 km/s</b>가 되면 떨어지는 만큼 지구 표면이 휘어져 <b>원 궤도</b>를 돌아요. 이보다 빠르면 타원 궤도가 돼요. 모두 <b>중력</b>이 지구 중심 쪽으로 계속 끌어당기기 때문에 일어나는 운동이에요.',
        },
      ],
    },
    {
      title: '낙하와 공전: 휘어지는 만큼 떨어져요', short: '낙하와 공전', icon: '🛰️', phase: '탐구',
      features: ['orbit'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 대포알이 약 7.9 km/s에서 계속 떨어지며 지구를 한 바퀴 돌았어요. 공전하는 위성도 같은 원리일까요?</div>' +
        '<p>이번에는 <b>국제 우주 정거장</b> 높이(약 400 km)를 도는 위성을 관찰해요. 중력이 없다면 위성은 어떻게 움직일까요? 흰 점선(직선 경로)과 실제 궤도를 비교해 봐요.</p>',
      setup() { S.pick = false; S.flewOff = false; S.backOn = false; S.backRun = 0; satReset(); setMode('orbit'); },
      recap: '위성은 중력이 없다면 직선으로 날아가 버려요. 중력이 매 순간 지구 중심 쪽으로 잡아당겨 직선 경로보다 떨어진 만큼 휘어지고, 속력은 같아도 방향이 바뀌므로 가속도 운동이에요.',
      summary: '<ul><li>중력이 없으면 가속도가 0이라 위성은 <b>직선</b>으로 날아가요.</li><li>공전하는 위성에는 <b>지구 중심 방향</b>의 중력 가속도가 작용해서 속도의 <b>방향</b>이 계속 바뀌어요.</li><li>속력이 일정해도 방향이 바뀌면 <b>가속도 운동</b>이에요.</li><li>국제 우주 정거장(고도 약 400 km): 속력 약 7.7 km/s, 가속도 약 8.7 m/s²</li></ul>',
      missions: [
        {
          title: '중력 끄기와 켜기',
          goal: '<b>중력을 끄고</b> 위성이 멀리 날아가는 것을 본 뒤, ↺ 버튼으로 되돌려 <b>중력을 켠 채</b> 다시 도는 것을 지켜봐요.',
          hint: '🌍 버튼으로 중력을 끄고 위성이 화면 가장자리로 갈 때까지 기다려요. 그다음 ↺ 버튼을 누르고 3초쯤 지켜봐요.',
          setup() { S.pick = false; S.flewOff = false; S.backOn = false; S.backRun = 0; satReset(); setMode('orbit'); showHint('🌍 버튼으로 중력을 껐다 켜 봐요', 5000); },
          hold: 0.4,
          check: () => S.flewOff && S.backOn,
          status: () => chip3([[S.flewOff, '중력을 끄고 날아가는 것 보기'], [S.backOn, '다시 켜고 돌기']]),
          explain: '중력이 없으면 위성은 <b>직선</b>으로 날아가요(관성). 중력이 있으면 매 순간 지구 중심 쪽으로 <b>떨어지면서</b> 직선 경로에서 휘어져 원 궤도를 돌아요. 흰 점선보다 파란 곡선이 지구 쪽으로 떨어진 만큼이 바로 그 낙하예요.',
        },
        {
          title: '가속도의 방향 고르기', manual: true,
          goal: '위성에 작용하는 <b>가속도</b>의 방향은 A~D 중 어느 것일까요? 화살표를 눌러 고르고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '가속도는 중력이 만들어요. 중력은 어느 쪽으로 끌어당기나요?',
          setup() { S.pick = true; S.pickSel = -1; setMode('orbit'); updateCtl(); },
          check() {
            const p = PICK_DIRS()[S.pickSel];
            if (!p) return '화살표 A ~ D 중 하나를 눌러서 골라요.';
            if (p.id === 'center') return true;
            if (p.id === 'fwd') return 'A는 <b>속도</b>의 방향이에요. 속도와 가속도는 방향이 달라도 돼요. 중력이 어느 쪽으로 끌어당기는지 생각해 봐요.';
            if (p.id === 'out') return '바깥쪽으로 가속하면 위성이 지구에서 점점 멀어져요. 중력은 지구를 향해 끌어당겨요.';
            return '진행 반대 방향으로 가속하면 위성이 점점 느려져야 해요. 하지만 공전 속력은 일정해요.';
          },
          explain: '가속도는 <b>힘(중력)의 방향</b>이에요. 중력은 지구 중심 쪽으로 작용하므로 가속도도 항상 <b>지구 중심 방향</b>이에요. 속도(진행 방향)와 수직이라서 속력은 변하지 않고 방향만 바뀌어요.',
        },
        {
          type: 'quiz', title: '공전하는 위성의 가속도',
          goal: '속력이 일정한 위성(약 7.7 km/s)의 가속도에 대해 옳은 설명은 무엇일까요?',
          setup() { S.pick = false; satReset(); setMode('orbit'); },
          choices: ['속력이 일정하므로 가속도는 0이다', '속도의 방향이 계속 바뀌므로 가속도가 있고, 그 방향은 지구 중심이다', '가속도는 있고 그 방향은 위성의 진행 방향이다', '위성은 중력을 받지 않으므로 가속도가 없다'],
          answer: 1,
          feedback: ['속력만 보면 안 돼요. 속도는 방향도 포함해요. 방향이 바뀌면 속도가 변한 거예요.', '', '진행 방향으로 가속하면 속력이 커져요. 공전 속력은 일정해요.', '위성에는 지구 중력이 작용해요(약 8.7 m/s²). 그래서 도는 거예요.'],
          explain: '가속도는 <b>속도가 변하는 정도</b>예요. 속력이 같아도 방향이 바뀌면 속도가 변하므로 가속도 운동이에요. 공전하는 위성은 중력 가속도(약 8.7 m/s²)가 <b>지구 중심 방향</b>으로 작용하며 방향만 바꿔 줘요.',
        },
      ],
    },
    {
      title: '거리와 가속도: 멀어질수록 약해져요', short: '거리와 가속도', icon: '📏', phase: '분석',
      features: ['dist'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지구 중심 방향의 중력 가속도가 위성을 돌게 한다는 것을 알았어요. 그 가속도의 크기는 어디서나 같을까요?</div>' +
        '<p>지표, 국제 우주 정거장, 정지 위성, 달의 <b>중력 가속도</b>를 비교해 봐요. 달도 같은 원리로 지구를 돌고 있어요.</p>',
      setup() { S.dseen = new Set([S.dsel]); setMode('dist'); },
      recap: '지구 중심에서 멀어질수록 중력 가속도는 작아지지만(지표 9.8 → 정거장 8.7 → 정지 위성 0.22 → 달 0.0027 m/s²) 0이 되지는 않아요. 달도 지구 둘레를 돌며 매 순간 떨어지고 있어요.',
      summary: '<table class="mini"><tr><th>위치</th><th>g (m/s²)</th><th>속력</th><th>주기</th></tr><tr><td>지표</td><td>9.8</td><td>―</td><td>―</td></tr><tr><td>국제 우주 정거장</td><td>8.7</td><td>약 7.7 km/s</td><td>약 92분</td></tr><tr><td>정지 위성</td><td>0.22</td><td>약 3.1 km/s</td><td>24시간</td></tr><tr><td>달</td><td>0.0027</td><td>약 1.0 km/s</td><td>약 27일</td></tr></table>' +
        '<ul><li>거리가 멀수록 g는 작아져요. 거리가 2배면 약 <b>1/4</b>이에요.</li><li>g는 0이 되지 않아요. 달의 공전도 낙하 운동과 같은 원리예요.</li></ul>',
      missions: [
        {
          title: '네 곳의 가속도 기록하기',
          goal: '지표, 국제 우주 정거장, 정지 위성, 달을 <b>한 번씩 눌러</b> 중력 가속도를 확인해요.',
          hint: '왼쪽 버튼 네 개를 차례로 눌러 보세요. 막대 길이와 값이 나타나요.',
          setup() { S.dseen = new Set([S.dsel]); setMode('dist'); updateCtl(); showHint('네 곳을 모두 눌러 값을 확인해요', 5000); },
          hold: 0.5,
          check: () => S.dseen.size === 4,
          status: () => chip3(STOPS.map((p, i) => [S.dseen.has(i), p.name === '국제 우주 정거장' ? 'ISS' : p.name])),
          explain: '지표 <b>9.8</b> → 국제 우주 정거장 <b>8.7</b> → 정지 위성 <b>0.22</b> → 달 <b>0.0027</b> m/s²로 거리가 멀수록 작아져요. 하지만 달에서도 0은 아니에요. 그래서 달이 지구에 끌리며 공전하는 거예요.',
        },
        {
          type: 'quiz', title: '거리가 2배가 되면?',
          goal: '지구 중심에서의 거리가 <b>2배</b>가 되면 중력 가속도는 대략 얼마로 줄어들까요?',
          setup() { setMode('dist'); },
          choices: ['약 1/2', '약 1/4', '약 1/8', '거의 달라지지 않는다'],
          answer: 1,
          feedback: ['표를 보세요. 거리가 6.6배인 정지 위성에서 g는 1/2이 아니라 훨씬 더 작아졌어요.', '', '거리가 2배일 때의 값은 1/8이 아니라 그보다 커요.', '정지 위성(약 6.6 R)에서는 9.8이 0.22로 크게 줄었어요.'],
          explain: '중력은 거리가 2배가 되면 약 <b>1/4</b>로 줄어요. 확인해 보면 정지 위성은 약 6.6 R이라 9.8 ÷ 6.6² ≈ <b>0.22</b>로 표의 값과 같아요. 달(약 60 R)은 9.8 ÷ 60² ≈ 0.0027이에요.',
        },
      ],
    },
    {
      title: '우주 정거장: 무중량은 중력이 없는 걸까?', short: '우주 정거장', icon: '🧑‍🚀', phase: '적용',
      features: ['station'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 정거장 높이에서도 중력 가속도는 지표의 약 89 %(8.7 m/s²)로 거의 그대로라는 것을 봤어요. 그런데 우주인은 왜 둥둥 떠다닐까요?</div>' +
        '<p><b>우주 정거장 안</b>을 들여다보고, <b>자유 낙하 승강기</b>와 비교해 봐요.</p>',
      setup() { setMode('station'); resetStation(); },
      recap: '무중량은 중력이 없는 상태가 아니라, 우주인과 정거장이 함께 자유 낙하(공전) 중이라서 저울이 몸을 받치지 않는 상태예요. 지표로 떨어지는 운동과 공전은 모두 지구 중심 방향의 중력 가속도 운동이에요.',
      summary: '<ul><li>정거장에서도 중력은 약 89 %예요(8.7 m/s²). <b>우주에 중력이 없는 것이 아니에요.</b></li><li><b>무중량</b> = 정거장과 우주인이 함께 <b>자유 낙하</b> 중인 상태 (저울 눈금 0 N)</li><li><b>정지 위성</b>: 고도 약 3.6만 km, 주기 24시간 = 지구 자전 주기, 적도 위에서 같은 방향으로 돌아서 한 곳에 머물러 보여요.</li><li>지표에서의 낙하와 지구 주위 공전은 모두 <b>지구 중심 방향의 중력 가속도 운동</b>이에요.</li></ul>',
      missions: [
        {
          title: '무중량 체험하기',
          goal: '우주 정거장 안의 <b>물방울이나 우주인을 3번</b> 건드리고, <b>자유 낙하 승강기의 줄을 끊어</b> 저울 눈금을 확인해요.',
          hint: '🛰️ 장면에서 물방울을 눌러 밀어 보고, 🛗 장면으로 바꿔 ✂️ 줄 끊기를 눌러 보세요.',
          setup() { S.taps = 0; S.liftDone = false; setSt('iss'); setMode('station'); resetStation(); showHint('물방울이 어떻게 움직이나요?', 5000); },
          hold: 0.5,
          check: () => S.taps >= 3 && !!S.liftDone,
          status: () => chip3([[S.taps >= 3, '물방울 · 우주인 건드리기 ' + Math.min(3, S.taps) + ' / 3'], [!!S.liftDone, '승강기 줄 끊기']]),
          explain: '정거장 안의 물방울은 아래로 가라앉지 않고 <b>둥둥</b> 떠요. 승강기도 줄을 끊으면 저울 눈금이 <b>0 N</b>이 돼요. 둘 다 <b>자유 낙하</b>하는 중이라 저울이나 바닥이 몸을 받치지 않기 때문이에요.',
        },
        {
          type: 'quiz', title: '우주인은 왜 둥둥 뜰까?',
          goal: '국제 우주 정거장 안에서 우주인이 <b>둥둥 떠다니는</b> 까닭은 무엇일까요?',
          setup() { setMode('station'); },
          choices: ['우주에는 중력이 없기 때문이다', '정거장 높이에서는 중력이 거의 0이 되기 때문이다', '정거장과 우주인이 함께 지구 중력으로 자유 낙하(공전)하고 있기 때문이다', '정거장이 너무 빨리 돌아서 중력이 밖으로 튕겨 나가기 때문이다'],
          answer: 2,
          feedback: ['우주에도 중력은 있어요. 정거장 높이에서도 지표의 약 89 %예요.', '정거장 높이(약 400 km)는 지구 반지름(6371 km)에 비해 아주 가까워서 중력이 약 89 %나 남아 있어요.', '', '빠르게 돈다고 중력이 없어지지 않아요. 중력이 지구 쪽으로 계속 떨어뜨리고 있어요.'],
          explain: '정거장 높이에서 중력은 지표의 약 89 %(몸무게 60 kg이면 약 520 N)예요. 우주인과 정거장이 <b>같은 가속도로 함께 떨어지는</b> 중이라서 서로를 밀지 않고 무중량 상태가 돼요. 지표로 떨어지는 운동과 공전은 모두 <b>지구 중심 방향의 중력 가속도 운동</b>이에요.',
        },
        {
          type: 'quiz', title: '정지 위성의 조건',
          goal: '정지 위성(고도 약 3.6만 km)이 하늘의 <b>한 곳에 멈춰 있는 것처럼</b> 보이는 까닭은 무엇일까요?',
          setup() { setMode('station'); },
          choices: ['중력이 없는 곳에 있어서 움직이지 않기 때문이다', '지구 자전과 같은 방향으로, 자전 주기와 같은 24시간에 한 바퀴 돌기 때문이다', '지구보다 훨씬 느리게 돌기 때문이다', '달과 같은 거리에 있기 때문이다'],
          answer: 1,
          feedback: ['정지 위성에도 중력(약 0.22 m/s²)이 작용해요. 중력 때문에 도는 거예요.', '', '실제로는 약 3.1 km/s로 빠르게 돌아요. 지구가 같이 자전해서 멈춘 듯 보이는 거예요.', '달은 약 38만 km로 훨씬 멀어요. 주기도 약 27일로 달라요.'],
          explain: '정지 위성은 <b>주기가 24시간</b>이라 지구 자전과 같은 속도로 같은 방향(적도 위)으로 돌아요. 그래서 지상에서 보면 한곳에 멈춰 있는 것처럼 보여요. 이 위성도 달처럼 중력을 받아 <b>지구에 매 순간 떨어지면서</b> 돌고 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-orbit', mount: '#game', badge: '우주 궤도 전문가', homeHref: '../../index.html#h1a',
    featureLabels: { cannon: '💥 발사 속력 슬라이더 · 뉴턴의 대포', orbit: '🛰️ 중력 켜기/끄기 · 가속도 화살표', dist: '📏 거리별 중력 가속도 비교', station: '🧑‍🚀 우주 정거장 · 자유 낙하 승강기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode === 'cannon') stepCannon(dt); else if (S.mode === 'orbit') stepOrbit(dt); else if (S.mode === 'station') stepStation(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'cannon') drawCannonScene(t);
    else if (S.mode === 'orbit') drawOrbit(t);
    else if (S.mode === 'dist') drawDist(t);
    else drawStation(t);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, R, PICK_DIRS, predict, get game() { return game; }, setMode, fire, setDist, setSt, setGrav, satReset, updateCtl, orbitXY, MOD, LIFT, cutLift, vCirc, gAt,
    jump(sec) { const sh = S.shot; if (sh) sh.t += sec * sh.kPlay; },
  };
})();
