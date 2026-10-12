/* =========================================================
   중2 Ⅷ. 별과 우주 - 팽창하는 우주  [9과15-03]
   탐구 흐름(4단계):
   ① 관찰: 스티커(은하)를 붙인 풍선을 부풀리면 스티커 사이가 모두 멀어짐 (스티커 자체는 커지지 않음)
   ② 실험: 기준 스티커 A에서 B~E까지 거리를 부풀리기 전·후로 재어 표 작성 → 멀리 있는 스티커일수록 더 많이 멀어짐
   ③ 설명: 기준 스티커를 바꿔도 같은 결과 → 팽창의 중심이 따로 없음
   ④ 적용: 시간을 거꾸로 되감으면 은하들이 가까워져 한 점으로 → 우주는 작고 뜨거운 한 점에서 시작(대폭발 우주론, 간단히)
   범위: 적색 편이·허블 법칙·가속 팽창은 다루지 않음(정성적 모형 활동만).
   풍선 표면 = 구면. 스티커 위치는 (경도, 위도), 거리 = 풍선 반지름(6 cm × 배율) × 두 스티커 사이의 각.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, Sound, clamp } = SciSim;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const FONT = '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  const DISPLAY = '"Jua", ' + FONT;
  const RM = !!SciSim.reduceMotion;
  const rgba = SciSim.color.rgba, shade = SciSim.color.shade, mixc = SciSim.color.mix;
  const approach = SciSim.approach, ease = SciSim.ease;
  const VW = 800, VH = 660;
  const V = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eaf6ff' });
  const ctx = V.ctx;
  const D = SciSim.draw(ctx);
  const FX = new SciSim.Particles();
  let game = null;
  const has = (f) => (game ? game.has(f) : f === 'balloon');
  const f = (px, weight) => (weight || 700) + ' ' + px + 'px ' + FONT;
  const txt = (x, y, s, o) => D.text(x, y, s, o);
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const pulse = () => 0.5 + 0.5 * Math.sin(performance.now() / 160);
  function panel(x, y, w, h, o) {
    o = o || {};
    D.shadow(() => { D.roundRect(x, y, w, h, o.r || 14); ctx.fillStyle = o.fill || 'rgba(255,255,255,.92)'; ctx.fill(); }, { blur: 10, y: 3, color: 'rgba(30,60,110,.18)' });
    D.roundRect(x, y, w, h, o.r || 14); ctx.strokeStyle = o.stroke || 'rgba(60,100,160,.22)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  const pill = (x, y, s, o) => D.label(x, y, s, Object.assign({ bg: '#ffffff', color: '#1b2333', border: 'rgba(40,70,120,.25)', size: 14 }, o || {}));

  /* =========================================================
     모형: 풍선 표면의 스티커
     ========================================================= */
  const ST = [
    { id: 'A', lon: 0, lat: 0, col: '#facc15' },
    { id: 'B', lon: 17, lat: 10, col: '#fb7185' },
    { id: 'C', lon: -30, lat: 14, col: '#4ade80' },
    { id: 'D', lon: 40, lat: -33, col: '#c084fc' },
    { id: 'E', lon: -52, lat: -40, col: '#fb923c' },
  ];
  ST.forEach((s) => {
    const lo = s.lon * DEG, la = s.lat * DEG;
    s.v = [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
    s.sx = 0; s.sy = 0; s.sz = 0; s.pop = 0;
  });
  const ang = (a, b) => Math.acos(clamp(ST[a].v[0] * ST[b].v[0] + ST[a].v[1] * ST[b].v[1] + ST[a].v[2] * ST[b].v[2], -1, 1));
  const R_CM = 6; // 풍선 반지름(1배) 6 cm
  const dist = (a, b, s) => R_CM * s * ang(a, b);
  const r1 = (x) => Math.round(x * 10) / 10;
  const fcm = (x) => r1(x).toFixed(1);
  const DEF_VIEW = { lon: -5, lat: -10 };

  const S = {
    s: 1, sT: 1, cx: 400, cy: 338, squash: 0, lon0: DEF_VIEW.lon, lat0: DEF_VIEW.lat, lon0T: DEF_VIEW.lon, lat0T: DEF_VIEW.lat,
    ref: 0, tape: null, tapeA: 0, rec: {}, refsDone: new Set(), playTw: null, bang: false, bangT: 0, grown: 0, lastSnd: 0,
    tableA: 0, legendA: 1, hintTap: 0, tapMsg: null, tapMsgT: 0, flash: 0, rewindDone: false, prevS: 1,
  };
  function resetRec() { S.rec = {}; [1, 2, 3, 4].forEach((i) => { S.rec[i] = { before: null, after: null, pop: 0 }; }); }
  resetRec();

  /* 구면 → 화면 */
  const BASE_R = 108;
  function viewRot(v, o) {
    const lo = S.lon0 * DEG, la = S.lat0 * DEG, c1 = Math.cos(lo), s1 = Math.sin(lo), c2 = Math.cos(la), s2 = Math.sin(la);
    const x1 = v[0] * c1 - v[2] * s1, z1 = v[0] * s1 + v[2] * c1;
    o[0] = x1; o[1] = v[1] * c2 - z1 * s2; o[2] = v[1] * s2 + z1 * c2;
    return o;
  }
  const _v = [0, 0, 0], _w = [0, 0, 0], _u = [0, 0, 0];
  function projectStickers(R) {
    ST.forEach((s) => { viewRot(s.v, _v); s.sx = S.cx + R * _v[0]; s.sy = S.cy - R * _v[1]; s.sz = _v[2]; });
  }
  const heat = () => (has('past') ? Math.pow(clamp((2 - S.s) / 1.96, 0, 1), 1.5) : 0);

  /* =========================================================
     그리기
     ========================================================= */
  const CARD = document.querySelector('.stage-card');
  let bgKey = '';
  function bgFill(h) {
    const base = mixc('#eaf6ff', '#0b1020', clamp(h * 1.6, 0, 1));
    if (base !== bgKey) { bgKey = base; if (CARD) CARD.style.background = base; V.wrap.style.setProperty('--stage-bg', base); }
    ctx.fillStyle = base; ctx.fillRect(0, 0, VW, VH);
    if (h < 0.6) { // 풍선 뒤의 부드러운 빛
      const g = ctx.createRadialGradient(S.cx, S.cy, 20, S.cx, S.cy, 360);
      g.addColorStop(0, 'rgba(255,255,255,' + 0.85 * (1 - h * 1.6) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    }
    if (h > 0.45) { // 어두워지면 별
      ctx.save(); ctx.globalAlpha = clamp((h - 0.45) * 2, 0, 0.9);
      for (let i = 0; i < 70; i++) { const x = (i * 137.5) % VW, y = (i * 91.7) % VH; ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 1.6, 1.6); }
      ctx.restore();
    }
  }
  function balloonColor(h) {
    const a = mixc('#38bdf8', '#fb923c', clamp(h * 2, 0, 1));
    return mixc(a, '#fff3c0', clamp(h * 2 - 1, 0, 1));
  }
  function gridLines(R, cx, cy) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    const N = 48;
    for (let k = -2; k <= 2; k++) { // 위도선
      const la = k * 30 * DEG, y = Math.sin(la), rr = Math.cos(la);
      let pen = false;
      for (let i = 0; i <= N; i++) {
        const lo = (i / N) * TAU;
        _w[0] = rr * Math.sin(lo); _w[1] = y; _w[2] = rr * Math.cos(lo); viewRot(_w, _v);
        if (_v[2] < 0.02) { pen = false; continue; }
        const px = cx + R * _v[0], py = cy - R * _v[1];
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
      }
    }
    for (let k = 0; k < 6; k++) { // 경도선
      const lo = k * 30 * DEG;
      let pen = false;
      for (let i = 0; i <= N; i++) {
        const la = (i / N) * TAU;
        _w[0] = Math.cos(la) * Math.sin(lo); _w[1] = Math.sin(la); _w[2] = Math.cos(la) * Math.cos(lo); viewRot(_w, _v);
        if (_v[2] < 0.02) { pen = false; continue; }
        const px = cx + R * _v[0], py = cy - R * _v[1];
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
      }
    }
    ctx.stroke(); ctx.restore();
  }
  function drawSticker(s, alpha, t, isRef, big) {
    const rad = 17;
    const z = clamp(s.sz, 0, 1), zk = 0.42 + 0.58 * z;
    const sc = 1 + s.pop * 0.35;
    const a = Math.atan2(s.sy - S.cy, s.sx - S.cx);
    ctx.save(); ctx.globalAlpha = alpha * clamp(0.35 + z * 1.6, 0, 1);
    ctx.translate(s.sx, s.sy);
    D.glow(0, 0, rad * 2.1, s.col, 0.0);
    ctx.rotate(a); ctx.scale(zk * sc, sc);
    ctx.shadowColor = 'rgba(20,40,80,.35)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, rad + 2.5, 0, TAU); ctx.fill();
    ctx.shadowColor = 'transparent';
    const g = ctx.createRadialGradient(-rad * 0.35, -rad * 0.4, 1, 0, 0, rad);
    g.addColorStop(0, shade(s.col, 0.45)); g.addColorStop(1, shade(s.col, -0.12));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.fill();
    // 작은 은하 무늬
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, rad * 0.55, -0.4, 2.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, rad * 0.55, Math.PI - 0.4, Math.PI + 2.3); ctx.stroke();
    ctx.restore();
    // 글자
    ctx.save(); ctx.globalAlpha = alpha * clamp(0.3 + z * 1.6, 0, 1);
    D.text(s.sx, s.sy + 5.5, s.id, { size: 16, weight: 800, color: '#fff', stroke: 'rgba(60,40,90,.75)', strokeWidth: 3.5 });
    ctx.restore();
    if (isRef && alpha > 0.5) {
      ctx.save(); ctx.globalAlpha = alpha;
      D.ring(s.sx, s.sy, 25, t, { color: '#f59e0b', width: 3 });
      if (big) D.label(s.sx, s.sy - 40, '기준', { size: 13, bg: '#f59e0b', color: '#fff' });
      ctx.restore();
    }
  }
  function slerp(a, b, k, o) {
    const va = ST[a].v, vb = ST[b].v, w = ang(a, b), sw = Math.sin(w) || 1e-6;
    const ka = Math.sin((1 - k) * w) / sw, kb = Math.sin(k * w) / sw;
    _w[0] = va[0] * ka + vb[0] * kb; _w[1] = va[1] * ka + vb[1] * kb; _w[2] = va[2] * ka + vb[2] * kb;
    return viewRot(_w, o);
  }
  function drawTape(R, t) {
    if (!S.tape || S.tapeA <= 0.01) return;
    const a = S.tape.a, b = S.tape.b, L = dist(a, b, S.s), prog = ease.outCubic(S.tapeA);
    const N = 30, pts = [];
    for (let i = 0; i <= N; i++) {
      const k = (i / N) * prog;
      slerp(a, b, k, _v);
      pts.push([S.cx + R * _v[0], S.cy - R * _v[1], _v[2]]);
    }
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const stroke = (w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); };
    stroke(9, 'rgba(60,40,0,.45)'); stroke(6.5, '#fde047');
    // 눈금 (1 cm마다)
    const wAng = ang(a, b), cmTotal = Math.floor(L);
    ctx.strokeStyle = '#7c5a00'; ctx.lineWidth = 1.6;
    for (let c = 1; c <= cmTotal; c++) {
      const k = (c / L) * prog; if (k > prog) break;
      slerp(a, b, k, _v); const x = S.cx + R * _v[0], y = S.cy - R * _v[1];
      slerp(a, b, Math.min(1, k + 0.01), _u);
      const dx = (S.cx + R * _u[0]) - x, dy = (S.cy - R * _u[1]) - y, n = Math.hypot(dx, dy) || 1;
      ctx.beginPath(); ctx.moveTo(x - dy / n * 5, y + dx / n * 5); ctx.lineTo(x + dy / n * 5, y - dx / n * 5); ctx.stroke();
    }
    void wAng;
    ctx.restore();
    // 값 표시
    if (prog > 0.8) {
      const m = pts[Math.floor(pts.length / 2)];
      D.label(m[0], m[1] - 22, '📏 ' + ST[a].id + '→' + ST[b].id + ' ' + fcm(L) + ' cm', { size: 15, bg: '#fff7c2', color: '#5b4300', border: '#eab308' });
    }
  }
  function drawBalloon(t) {
    const h = heat();
    const R = BASE_R * S.s, cx = S.cx, cy = S.cy;
    const col = balloonColor(h);
    // 바닥 그림자
    ctx.save(); ctx.globalAlpha = 0.18 * (1 - h);
    ctx.fillStyle = '#1e3a6e'; ctx.beginPath(); ctx.ellipse(cx, 626, R * 0.7 + 20, 9 + R * 0.04, 0, 0, TAU); ctx.fill(); ctx.restore();
    if (h > 0.05) D.glow(cx, cy, R * 2.2 + 60 + h * 120, h > 0.5 ? '#ffd27a' : '#fb923c', 0.25 + h * 0.7);
    projectStickers(R);
    const sq = S.squash;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1 + sq, 1 - sq * 0.7); ctx.translate(-cx, -cy);
    // 매듭과 끈
    const ky = cy + R;
    ctx.save();
    ctx.fillStyle = shade(col, -0.18);
    ctx.beginPath(); ctx.moveTo(cx - 6, ky - 3); ctx.lineTo(cx + 6, ky - 3); ctx.lineTo(cx + 9, ky + 13); ctx.lineTo(cx - 9, ky + 13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, ky + 14, 10, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = h > 0.5 ? 'rgba(255,255,255,.5)' : '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, ky + 18);
    for (let i = 1; i <= 8; i++) ctx.lineTo(cx + Math.sin(i * 0.9 + (RM ? 0 : t * 1.4)) * (4 + i * 0.9), ky + 18 + i * 6);
    ctx.stroke(); ctx.restore();
    // 몸통
    const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.08, cx, cy, R);
    g.addColorStop(0, shade(col, 0.6)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.32));
    D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); }, { blur: 18, y: 10, color: 'rgba(20,50,110,' + (0.28 * (1 - h)) + ')' });
    gridLines(R, cx, cy);
    // 하이라이트
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(cx - R * 0.42, cy - R * 0.5, R * 0.2, R * 0.1, -0.7, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R - 2, Math.PI * 0.55, Math.PI * 0.95); ctx.stroke(); ctx.restore();
    // 기준 이동 화살표(3단계): 1배일 때의 자리 → 지금 자리
    if (has('ref') && S.s > 1.03) {
      const R1 = BASE_R;
      ST.forEach((s, i) => {
        if (i === S.ref) return;
        viewRot(s.v, _v);
        const gx = cx + R1 * _v[0], gy = cy - R1 * _v[1];
        if (_v[2] < 0.05) return;
        const k = clamp((S.s - 1.03) / 0.5, 0, 1);
        ctx.save(); ctx.globalAlpha = 0.85 * k; ctx.setLineDash([3, 4]); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(gx, gy, 15, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        const dx = s.sx - gx, dy = s.sy - gy, L = Math.hypot(dx, dy);
        if (L > 30) D.arrow(gx + dx / L * 17, gy + dy / L * 17, s.sx - dx / L * 20, s.sy - dy / L * 20, { color: '#ea580c', width: 3.5, head: 12 });
        ctx.restore();
      });
    }
    // 스티커
    const hide = has('past') ? clamp((S.s - 0.12) / 0.5, 0, 1) : 1;
    ST.map((s, i) => [s, i]).sort((p, q) => p[0].sz - q[0].sz).forEach(([s, i]) => { if (s.sz > -0.05) drawSticker(s, hide, t, i === S.ref && (has('ruler') || has('ref')) && !(game && game.level === 3 && !game.free), true); });
    drawTape(R, t);
    ctx.restore();
    // 1배 크기 점선 테두리 (비교용)
    if (S.s > 1.05 && !has('past')) {
      ctx.save(); ctx.globalAlpha = clamp((S.s - 1.05) * 2, 0, 0.55); ctx.setLineDash([6, 7]); ctx.strokeStyle = '#4b6a99'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(cx, cy, BASE_R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      ctx.save(); ctx.globalAlpha = clamp((S.s - 1.05) * 3, 0, 1);
      pill(cx + BASE_R * 0.05, cy + BASE_R * 0.88, '점선 = 처음 크기', { size: 13, pad: 7 }); ctx.restore();
    }
    // 대폭발(점)
    if (has('past')) drawBang(t, h);
    FX.draw(ctx);
  }
  function drawBang(t, h) {
    const a = clamp((0.55 - S.s) / 0.5, 0, 1);
    if (a > 0.01) {
      ctx.save(); ctx.globalAlpha = a;
      D.glow(S.cx, S.cy, 60 + 30 * Math.sin(t * 6), '#ffffff', 0.9);
      D.glow(S.cx, S.cy, 120, '#ffd27a', 0.5);
      for (let i = 0; i < 8; i++) { const an = i * TAU / 8 + t * 0.6; ctx.strokeStyle = 'rgba(255,240,200,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(S.cx + Math.cos(an) * 16, S.cy + Math.sin(an) * 16); ctx.lineTo(S.cx + Math.cos(an) * (30 + 14 * Math.sin(t * 5 + i)), S.cy + Math.sin(an) * (30 + 14 * Math.sin(t * 5 + i))); ctx.stroke(); }
      ctx.restore();
    }
    if (S.s < 0.2) {
      const k = clamp((0.2 - S.s) / 0.12, 0, 1);
      ctx.save(); ctx.globalAlpha = k;
      pill(S.cx, S.cy - 72, '💥 아주 작고 뜨거운 한 점', { size: 17, bg: '#fff7e0', color: '#9a3412', border: '#fb923c' });
      ctx.restore();
    }
    // 온도 막대
    const x = 748, y0 = 130, hh = 380;
    ctx.save();
    const lightBg = h < 0.3;
    D.roundRect(x - 13, y0 - 8, 26, hh + 16, 13); ctx.fillStyle = lightBg ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.16)'; ctx.fill();
    ctx.strokeStyle = lightBg ? 'rgba(60,100,160,.3)' : 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    const fh = Math.max(6, hh * (0.04 + 0.96 * Math.pow(h, 0.7)));
    const gg = ctx.createLinearGradient(0, y0 + hh, 0, y0); gg.addColorStop(0, '#38bdf8'); gg.addColorStop(0.5, '#fb923c'); gg.addColorStop(1, '#fff3c0');
    D.roundRect(x - 9, y0 + hh - fh, 18, fh, 9); ctx.fillStyle = gg; ctx.fill();
    txt(x, y0 - 18, '🌡️', { size: 20 });
    txt(x, y0 + hh + 36, '온도', { size: 13.5, weight: 800, color: lightBg ? '#334155' : '#e2e8f0' });
    ctx.restore();
  }
  function drawTable(t) {
    const a = ease.outCubic(S.tableA);
    if (a < 0.02) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - a) * -40, 0);
    const x = 14, y = 70, w = 246, h = 330;
    panel(x, y, w, h);
    const refName = ST[S.ref].id, auto = has('ref');
    txt(x + 14, y + 28, '📋 ' + refName + '에서 잰 거리', { size: 16, weight: 800, color: '#1b2333', align: 'left' });
    txt(x + w - 14, y + 28, '(cm)', { size: 13.5, weight: 700, color: '#64748b', align: 'right' });
    const cols = [x + 14, x + 76, x + 138, x + 202];
    ['스티커', '전(1배)', '후(2배)', '늘어남'].forEach((hd, i) => txt(cols[i] + (i ? 20 : 12), y + 56, hd, { size: 12.5, weight: 800, color: '#475569', align: 'center' }));
    ctx.strokeStyle = 'rgba(60,100,160,.25)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 10, y + 66); ctx.lineTo(x + w - 10, y + 66); ctx.stroke();
    const others = ST.map((s, i) => i).filter((i) => i !== S.ref);
    let best = -1, bestV = -1;
    others.forEach((i, row) => {
      const yy = y + 100 + row * 52;
      let bef = null, aft = null;
      if (auto) { bef = dist(S.ref, i, 1); aft = S.s > 1.94 ? dist(S.ref, i, 2) : null; }
      else { const rc = S.rec[i]; if (rc) { bef = rc.before; aft = rc.after; } }
      const pop = (!auto && S.rec[i]) ? S.rec[i].pop : 0;
      const sc = 1 + pop * 0.12;
      ctx.save(); ctx.translate(cols[0] + 12, yy - 5); ctx.scale(sc, sc);
      ctx.fillStyle = ST[i].col; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
      txt(cols[0] + 12, yy, ST[i].id, { size: 15, weight: 800, color: '#fff', stroke: 'rgba(60,40,90,.7)', strokeWidth: 3 });
      txt(cols[1] + 20, yy, bef != null ? fcm(bef) : '—', { size: 17, weight: 800, color: bef != null ? '#0f172a' : '#9aa7b8', alpha: 1 });
      txt(cols[2] + 20, yy, aft != null ? fcm(aft) : '—', { size: 17, weight: 800, color: aft != null ? '#0f172a' : '#9aa7b8' });
      if (bef != null && aft != null) {
        const d = aft - bef; if (d > bestV) { bestV = d; best = i; }
        txt(cols[3] + 20, yy, '+' + fcm(d), { size: 17, weight: 800, color: '#ea580c' });
        D.roundRect(x + 10, yy - 30, w - 20, 44, 10); ctx.strokeStyle = 'rgba(234,88,12,.0)'; ctx.stroke();
      } else txt(cols[3] + 20, yy, '—', { size: 17, weight: 800, color: '#9aa7b8' });
    });
    // 늘어난 양 막대
    const done = others.every((i) => { const rc = S.rec[i]; return auto ? S.s > 1.94 : rc && rc.before != null && rc.after != null; });
    if (done && bestV > 0) {
      others.forEach((i, row) => {
        const yy = y + 100 + row * 52;
        const d = dist(S.ref, i, 2) - dist(S.ref, i, 1);
        D.roundRect(cols[1] - 2, yy + 12, (w - 70) * Math.min(1, d / (bestV || 1)) * 0.98 + 4, 5, 3); ctx.fillStyle = 'rgba(234,88,12,.55)'; ctx.fill();
      });
      txt(x + w / 2, y + h - 16, '가장 많이 멀어진 것: ' + ST[best].id, { size: 14, weight: 800, color: '#9a3412' });
    } else {
      txt(x + w / 2, y + h - 16, auto ? '풍선을 2배로 불면 표가 채워져요' : '스티커를 눌러 거리를 재요', { size: 13.5, weight: 700, color: '#64748b' });
    }
    ctx.restore();
  }
  function drawLegend(t) {
    const a = ease.outCubic(S.legendA);
    if (a < 0.02) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - a) * -30, 0);
    panel(14, 506, 232, 126);
    txt(28, 532, '🎈 모형으로 생각해요', { size: 14.5, weight: 800, color: '#1b2333', align: 'left' });
    txt(28, 560, '풍선 표면  =  우주 공간', { size: 14.5, weight: 700, color: '#0369a1', align: 'left' });
    txt(28, 586, '스티커  =  은하', { size: 14.5, weight: 700, color: '#be185d', align: 'left' });
    txt(28, 612, '스티커 A~E는 은하 5개예요.', { size: 13.5, weight: 600, color: '#64748b', align: 'left' });
    ctx.restore();
  }
  function drawHud(t) {
    // 풍선 크기 / 시간 표시
    if (has('past') && game && (game.level >= 3 || game.free)) {
      const s = S.s, lab = s > 1.9 ? '지금' : s > 1.2 ? '조금 전' : s > 0.6 ? '옛날' : s > 0.2 ? '아주 먼 옛날' : '우주의 시작';
      const dark = heat() > 0.35;
      pill(116, 40, '🕰️ ' + lab, { size: 17, bg: dark ? 'rgba(255,255,255,.18)' : '#fff', color: dark ? '#fff' : '#1b2333', border: dark ? 'rgba(255,255,255,.4)' : 'rgba(40,70,120,.25)', pad: 12 });
      return;
    }
    pill(92, 40, '🎈 풍선 크기 ' + S.s.toFixed(1) + '배', { size: 16, pad: 12 });
  }
  function drawMsg() {
    if (S.tapMsgT > 0 && S.tapMsg) {
      ctx.save(); ctx.globalAlpha = clamp(S.tapMsgT * 2, 0, 1);
      pill(S.cx, 80, S.tapMsg, { size: 14.5, bg: '#fff1f2', color: '#9f1239', border: '#fb7185' });
      ctx.restore();
    }
    // 3단계: 기준에서 본 모습 안내
    if (has('ref') && S.s > 1.9 && game && (game.level === 2 || game.free)) {
      pill(S.cx, 80, ST[S.ref].id + ' 에서 보면 다른 스티커가 모두 멀어져요', { size: 15, bg: '#fff7ed', color: '#9a3412', border: '#fb923c' });
    }
  }
  function draw(t) {
    const h = heat();
    bgFill(h);
    drawBalloon(t);
    if (has('ruler') || S.tableA > 0.02) drawTable(t);
    drawLegend(t);
    drawHud(t);
    drawMsg();
    // 처음 안내: 슬라이더를 밀어요
    if (S.hintTap > 0.02 && S.s < 1.05 && game && game.level === 0 && game.phase === 'active') {
      txt(S.cx, 640, '👉 오른쪽 슬라이더로 풍선을 불어 봐요', { size: 14.5, weight: 800, color: '#0369a1', alpha: (0.6 + 0.4 * pulse()) });
    }
  }

  /* =========================================================
     갱신
     ========================================================= */
  const slider = $('#sSize');
  const sizeUI = SciSim.bindRange(slider, $('#oSize'), (v) => (+v < 0.995 ? v.toFixed(2) : (+v).toFixed(1)) + '배', (v) => {
    if (S.playTw) { S.playTw.cancel(); S.playTw = null; }
    if (Math.abs(v - 1) < 0.03) { v = 1; sizeUI.set(1); } else if (Math.abs(v - 2) < 0.03) { v = 2; sizeUI.set(2); }
    S.sT = v; S.hintTap = 0;
  });
  function syncSlider() { sizeUI.set(S.sT); }
  function configSlider(mode) {
    // mode: 'grow' (1~2배) | 'time' (과거~지금)
    if (mode === 'time') {
      slider.min = 0.04; slider.max = 2; slider.step = 0.01; $('#sizeLabel').textContent = '⏪ 우주의 시간';
      $('#endL').textContent = '아주 먼 과거'; $('#endR').textContent = '지금';
      $('#sizeNote').textContent = '슬라이더를 왼쪽으로 밀어 시간을 거꾸로 돌려요.';
    } else {
      slider.min = 1; slider.max = 2; slider.step = 0.01; $('#sizeLabel').textContent = '🎈 풍선 크기';
      $('#endL').textContent = '처음(1배)'; $('#endR').textContent = '2배';
      $('#sizeNote').textContent = mode === 'ref' ? '스티커를 눌러 기준을 바꿔요. 풍선이 다시 부풀어요.' : mode === 'measure' ? '스티커를 눌러 A에서 그 스티커까지의 거리를 재요.' : '슬라이더를 오른쪽으로 밀어 풍선을 불어요.';
    }
    S.mode = mode; sizeUI.set(clamp(S.sT, +slider.min, +slider.max)); sizeUI.refresh();
  }
  function setSize(v, instant) { if (S.playTw) { S.playTw.cancel(); S.playTw = null; } S.sT = v; if (instant) { S.s = v; S.prevS = v; } syncSlider(); }
  function autoPlay(from, to, dur, onDone, easeName) {
    if (S.playTw) S.playTw.cancel();
    const go = () => {
      S.playTw = SciSim.tween(S, { sT: to }, { duration: RM ? 0.01 : dur, ease: easeName || 'inOutQuad', onDone() { S.playTw = null; onDone && onDone(); } });
    };
    if (Math.abs(S.sT - from) > 0.02) S.playTw = SciSim.tween(S, { sT: from }, { duration: RM ? 0.01 : 0.45, ease: 'outCubic', onDone: go });
    else { S.sT = from; go(); }
  }
  function setRef(i, play) {
    if (S.ref === i && !play) return;
    S.ref = i; S.tape = null; S.tapeA = 0;
    S.lon0T = ST[i].lon; S.lat0T = ST[i].lat;
    ST[i].pop = 1; Sound.tone(660, 0.1, 'triangle', 0.09);
    if (play) { autoPlay(1, 2, 1.7, () => { S.refsDone.add(i); }); }
  }
  function viewDefault() { S.lon0T = DEF_VIEW.lon; S.lat0T = DEF_VIEW.lat; }

  function update(dt, t) {
    if (S.playTw) syncSlider();
    S.s = RM ? S.sT : approach(S.s, S.sT, dt, 11);
    if (Math.abs(S.s - S.sT) < 0.0008) S.s = S.sT;
    const ds = (S.s - S.prevS) / Math.max(dt, 1e-3); S.prevS = S.s;
    S.squash = approach(S.squash, RM ? 0 : clamp(ds * 0.028, -0.05, 0.05), dt, 10);
    if (!RM && Math.abs(ds) > 0.25 && S.lastSnd < t - 0.09) { S.lastSnd = t; Sound.tone(300 + 220 * S.s, 0.04, 'sine', 0.03); }
    // 공기 방울
    if (!RM && ds > 0.3 && Math.random() < dt * 22) {
      FX.emit({ x: S.cx + (Math.random() - 0.5) * 8, y: S.cy + BASE_R * S.s + 6, vx: (Math.random() - 0.5) * 14, vy: -70 - Math.random() * 40, life: 0.5, size: 3 + Math.random() * 2, color: '#ffffff', shape: 'bubble', gravity: 0 });
    }
    S.lon0 = RM ? S.lon0T : approach(S.lon0, S.lon0T, dt, 5.5); S.lat0 = RM ? S.lat0T : approach(S.lat0, S.lat0T, dt, 5.5);
    const wantCx = (has('ruler') && !(game && game.level === 3 && !game.free)) ? 520 : 400;
    S.cx = RM ? wantCx : approach(S.cx, wantCx, dt, 4);
    S.tableA = approach(S.tableA, wantCx === 520 ? 1 : 0, dt, 5);
    S.legendA = approach(S.legendA, (game && game.level === 0 && !game.free) ? 1 : 0, dt, 4);
    S.hintTap = approach(S.hintTap, 1, dt, 1);
    if (S.tape) S.tapeA = approach(S.tapeA, 1, dt, 6);
    ST.forEach((s) => { s.pop = approach(s.pop, 0, dt, 7); });
    Object.keys(S.rec).forEach((k) => { S.rec[k].pop = approach(S.rec[k].pop, 0, dt, 6); });
    S.tapMsgT = Math.max(0, S.tapMsgT - dt);
    // 되감기가 끝(작음)에 닿으면 한 번 터뜨리기
    if (has('past') && S.s < 0.1 && !S.bang) { S.bang = true; FX.burst(S.cx, S.cy, { count: 22, colors: ['#fff3c0', '#ffd27a', '#ffffff', '#fb923c'], speed: 150, gravity: 0, size: 4, life: 1 }); Sound.tone(220, 0.3, 'sawtooth', 0.05); }
    if (S.s > 0.3) S.bang = false;
    FX.update(dt);
  }

  /* =========================================================
     포인터: 스티커 누르기
     ========================================================= */
  function stickerAt(p) {
    let best = -1, bd = 30;
    ST.forEach((s, i) => { if (s.sz < 0.05) return; const d = Math.hypot(p.x - s.sx, p.y - s.sy); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function measure(i) {
    S.tape = { a: S.ref, b: i }; S.tapeA = 0; ST[i].pop = 1;
    const rc = S.rec[i]; if (!rc) return;
    const s = S.s;
    if (Math.abs(s - 1) < 0.04) { rc.before = r1(dist(S.ref, i, 1)); rc.pop = 1; Sound.tone(600 + i * 70, 0.1, 'triangle', 0.09); }
    else if (Math.abs(s - 2) < 0.04) { rc.after = r1(dist(S.ref, i, 2)); rc.pop = 1; Sound.tone(760 + i * 70, 0.1, 'triangle', 0.09); }
    else { S.tapMsg = '풍선이 정확히 1배 또는 2배일 때 재어요'; S.tapMsgT = 2; Sound.tick(); }
  }
  SciSim.pointer(V, {
    hover(p) { return (has('ruler') || has('ref')) && stickerAt(p) >= 0 ? 'pointer' : null; },
    down(p) {
      const i = stickerAt(p);
      if (i < 0) return false;
      if (has('ref')) { if (i !== S.ref) { setRef(i, true); } else { ST[i].pop = 1; Sound.tick(); } return false; }
      if (has('ruler')) { if (i === S.ref) { ST[i].pop = 1; S.tapMsg = 'A는 기준이에요. B~E를 눌러요'; S.tapMsgT = 1.8; return false; } measure(i); return false; }
      ST[i].pop = 1; Sound.tick();
      return false;
    },
  });
  $('#playBtn').addEventListener('click', () => {
    Sound.click();
    setSize(0.04, true); S.bang = false;
    FX.burst(S.cx, S.cy, { count: 24, colors: ['#fff3c0', '#ffd27a', '#ffffff'], speed: 200, gravity: 0, size: 4, life: 0.9 });
    autoPlay(0.04, 2, RM ? 0.1 : 7.5, null, 'outCubic');
  });

  /* =========================================================
     퀴즈 그림 (인라인 SVG)
     ========================================================= */
  const FIG = {};
  function svgSticker(x, y, st, r) {
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (r + 2) + '" fill="#fff"/><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + st.col + '"/>' +
      '<text x="' + x.toFixed(1) + '" y="' + (y + 4.5).toFixed(1) + '" font-size="12" font-weight="800" fill="#fff" stroke="#5b4a82" stroke-width="2.4" paint-order="stroke" text-anchor="middle" font-family="sans-serif">' + st.id + '</text>';
  }
  function viewOf(v, lon0, lat0) {
    const lo = lon0 * DEG, la = lat0 * DEG, c1 = Math.cos(lo), s1 = Math.sin(lo), c2 = Math.cos(la), s2 = Math.sin(la);
    const x1 = v[0] * c1 - v[2] * s1, z1 = v[0] * s1 + v[2] * c1;
    return [x1, v[1] * c2 - z1 * s2, v[1] * s2 + z1 * c2];
  }
  function svgBalloon(cx, cy, R, view, withStickers, col) {
    let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="' + (col || '#7dd3fc') + '" stroke="#0ea5e9" stroke-width="2"/>' +
      '<ellipse cx="' + (cx - R * 0.4) + '" cy="' + (cy - R * 0.5) + '" rx="' + (R * 0.18) + '" ry="' + (R * 0.09) + '" fill="#fff" opacity=".55" transform="rotate(-40 ' + (cx - R * 0.4) + ' ' + (cy - R * 0.5) + ')"/>';
    if (withStickers) ST.forEach((st) => { const q = viewOf(st.v, view[0], view[1]); if (q[2] > 0.02) s += svgSticker(cx + R * q[0], cy - R * q[1], st, 7.5); });
    return s;
  }
  FIG.balloons = '<svg viewBox="0 0 360 180" width="360" role="img" aria-label="스티커를 붙인 풍선을 부풀리기 전과 후. 스티커의 크기는 같고 사이 거리만 멀어졌어요.">' +
    '<rect width="360" height="180" rx="12" fill="#f0f9ff"/>' + svgBalloon(80, 90, 48, [-5, -10], true) + svgBalloon(262, 90, 80, [-5, -10], true) +
    '<path d="M138 90 H176" stroke="#0369a1" stroke-width="4" marker-end="url(#fa)"/><defs><marker id="fa" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#0369a1"/></marker></defs>' +
    '<text x="157" y="76" font-size="12.5" font-weight="800" fill="#0369a1" text-anchor="middle" font-family="sans-serif">부풀리기</text>' +
    '<text x="80" y="170" font-size="13" font-weight="800" fill="#334155" text-anchor="middle" font-family="sans-serif">부풀리기 전</text><text x="262" y="174" font-size="13" font-weight="800" fill="#334155" text-anchor="middle" font-family="sans-serif">부풀린 후</text></svg>';
  (function () {
    let rows = '';
    [1, 2, 3, 4].forEach((i, row) => {
      const y = 72 + row * 26, b = dist(0, i, 1), a = dist(0, i, 2);
      rows += svgSticker(46, y - 4, ST[i], 8) + '<text x="132" y="' + y + '" font-size="15" font-weight="800" fill="#0f172a" text-anchor="middle" font-family="sans-serif">' + fcm(b) + '</text>' +
        '<text x="215" y="' + y + '" font-size="15" font-weight="800" fill="#0f172a" text-anchor="middle" font-family="sans-serif">' + fcm(a) + '</text>' +
        '<text x="300" y="' + y + '" font-size="15" font-weight="800" fill="#ea580c" text-anchor="middle" font-family="sans-serif">+' + fcm(a - b) + '</text>';
    });
    FIG.table = '<svg viewBox="0 0 360 180" width="360" role="img" aria-label="스티커 A에서 B부터 E까지의 거리를 부풀리기 전과 후에 잰 표">' +
      '<rect width="360" height="180" rx="12" fill="#f8fafc" stroke="#cbd5e1"/><text x="180" y="24" font-size="14" font-weight="800" fill="#1b2333" text-anchor="middle" font-family="sans-serif">A에서 잰 거리 (cm)</text>' +
      '<text x="46" y="48" font-size="12.5" font-weight="800" fill="#475569" text-anchor="middle" font-family="sans-serif">스티커</text><text x="132" y="48" font-size="12.5" font-weight="800" fill="#475569" text-anchor="middle" font-family="sans-serif">전(1배)</text>' +
      '<text x="215" y="48" font-size="12.5" font-weight="800" fill="#475569" text-anchor="middle" font-family="sans-serif">후(2배)</text><text x="300" y="48" font-size="12.5" font-weight="800" fill="#475569" text-anchor="middle" font-family="sans-serif">늘어난 양</text>' +
      '<path d="M12 54 H348" stroke="#cbd5e1"/>' + rows + '</svg>';
  })();
  function panelRef(cx, ref, title) {
    const cy = 100;
    let s = '<circle cx="' + cx + '" cy="' + cy + '" r="76" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="2"/><text x="' + cx + '" y="188" font-size="13.5" font-weight="800" fill="#334155" text-anchor="middle" font-family="sans-serif">' + title + '</text>';
    const view = [ST[ref].lon, ST[ref].lat];
    ST.forEach((st, i) => {
      const q = viewOf(st.v, view[0], view[1]); if (q[2] < 0.05) return;
      const x1 = cx + 38 * q[0], y1 = cy - 38 * q[1], x2 = cx + 70 * q[0], y2 = cy - 70 * q[1];
      if (i !== ref) {
        const d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d;
        s += '<circle cx="' + x1.toFixed(1) + '" cy="' + y1.toFixed(1) + '" r="9" fill="none" stroke="#64748b" stroke-dasharray="2 3"/>' +
          '<path d="M' + (x1 + ux * 10).toFixed(1) + ' ' + (y1 + uy * 10).toFixed(1) + ' L' + (x2 - ux * 11).toFixed(1) + ' ' + (y2 - uy * 11).toFixed(1) + '" stroke="#ea580c" stroke-width="3" marker-end="url(#ra)"/>';
      }
    });
    ST.forEach((st, i) => { const q = viewOf(st.v, view[0], view[1]); if (q[2] < 0.05) return; s += svgSticker(cx + (i === ref ? 0 : 70) * (i === ref ? 0 : q[0]), cy - (i === ref ? 0 : 70) * (i === ref ? 0 : q[1]), st, 8); });
    return s;
  }
  FIG.refs = '<svg viewBox="0 0 360 200" width="360" role="img" aria-label="스티커 A에서 본 모습과 스티커 E에서 본 모습. 어느 쪽에서 봐도 다른 스티커들이 모두 멀어져요.">' +
    '<rect width="360" height="200" rx="12" fill="#f0f9ff"/><defs><marker id="ra" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7z" fill="#ea580c"/></marker></defs>' +
    panelRef(92, 0, 'A에서 본 모습') + panelRef(268, 4, 'E에서 본 모습') + '</svg>';
  FIG.back = (function () {
    let s = '<svg viewBox="0 0 360 170" width="360" role="img" aria-label="풍선이 점점 작아져 한 점이 되는 그림. 시간을 거꾸로 돌리면 스티커들이 가까워져요.">' +
      '<rect width="360" height="170" rx="12" fill="#f0f9ff"/>';
    [[70, 62, '지금', '#7dd3fc'], [185, 40, '옛날', '#fdba74'], [290, 16, '아주 먼 과거', '#fef08a']].forEach((q, k) => {
      s += svgBalloon(q[0], 80, q[1], [-5, -10], k < 2, q[3]);
      s += '<text x="' + q[0] + '" y="164" font-size="13" font-weight="800" fill="#334155" text-anchor="middle" font-family="sans-serif">' + q[2] + '</text>';
    });
    s += '<path d="M135 80 H100" stroke="#0369a1" stroke-width="3.5" marker-end="url(#ba)"/><path d="M240 80 H228" stroke="#0369a1" stroke-width="3.5" marker-end="url(#ba)"/>' +
      '<defs><marker id="ba" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#0369a1"/></marker></defs></svg>';
    return s;
  })();

  /* =========================================================
     게임(4단계)
     ========================================================= */
  const nm = (i) => ST[i].id;
  game = SciSim.game({
    simId: 'm2-expanding-universe',
    mount: '#game',
    badge: '우주 팽창 탐험가',
    homeHref: '../../index.html#g2',
    featureLabels: { balloon: '🎈 풍선과 스티커', ruler: '📏 줄자와 기록표', ref: '👆 기준 스티커 바꾸기', past: '⏪ 시간 되감기' },
    onFeatures(set) {
      $('#cPlay').classList.toggle('is-off', !set.has('past'));
    },
    onComplete() { setSize(2, true); },
    levels: [
      /* ---------- 1단계 · 관찰 ---------- */
      {
        title: '스티커를 붙인 풍선', short: '풍선 모형', icon: '🎈', phase: '관찰',
        features: ['balloon'],
        intro: '<p class="si-q">❓ 탐구 질문: 은하들은 서로 가까워지고 있을까, 멀어지고 있을까?</p>' +
          '<p>우주를 직접 부풀려 볼 수는 없어요. 그래서 <b>풍선 모형</b>을 써요. <b>풍선 표면은 우주 공간</b>, <b>스티커는 은하</b>라고 생각해요.</p>' +
          '<p>풍선을 불면서 스티커 A~E가 어떻게 달라지는지 관찰해 봐요.</p>',
        setup() { configSlider('grow'); S.refsDone.clear(); S.ref = 0; viewDefault(); S.tape = null; setSize(1, true); },
        recap: '풍선(우주 공간)이 부풀자 스티커(은하) 사이의 거리가 모두 멀어졌어요. 스티커 자체의 크기는 그대로예요.',
        summary: '<div class="note-fig">' + FIG.balloons + '</div><ul><li><b>풍선 모형</b>: 풍선 표면 = 우주 공간, 스티커 = 은하예요.</li>' +
          '<li>풍선을 불면 스티커 사이의 거리가 모두 <b>멀어져요</b>. 우주가 팽창하면 은하들 사이가 멀어지는 것과 같아요.</li>' +
          '<li>스티커 하나하나의 크기는 <b>그대로</b>예요. 늘어나는 것은 스티커 <b>사이의 공간</b>이에요.</li></ul>',
        missions: [
          {
            title: '🎈 풍선 2배로 부풀리기',
            goal: '슬라이더를 밀어 풍선을 <b>2배</b>로 부풀려요. 스티커 사이가 어떻게 되는지 보세요.',
            hint: '[🎈 풍선 크기] 슬라이더를 오른쪽 끝까지 밀어요. 점선은 처음 풍선 크기예요.',
            setup() { configSlider('grow'); setSize(1, true); S.hintTap = 0; },
            check: () => S.s >= 1.95,
            hold: 0.8,
            status: () => chk(S.s >= 1.95, '풍선 크기 2배') + ' · 지금 ' + S.s.toFixed(1) + '배',
            explain: '풍선이 커질수록 스티커 A~E 사이의 거리가 <b>모두 멀어져요</b>. 어느 스티커가 어느 스티커에서 멀어지는 것이 아니라, <b>사이 공간 전체가 늘어나는</b> 거예요.',
          },
          {
            type: 'quiz',
            title: '🔍 왜 멀어졌을까?',
            goal: '풍선을 불자 스티커 사이가 멀어졌어요. 그림에서 스티커의 <b>크기</b>도 비교해 보세요. 스티커 사이가 멀어진 까닭은?',
            figure: FIG.balloons,
            setup() { setSize(2, true); },
            choices: ['스티커가 풍선 위를 스스로 걸어가서', '스티커가 점점 커져서', '풍선의 표면이 늘어나서', '스티커가 풍선 속으로 들어가서'],
            answer: 2,
            feedback: [
              '스티커는 스스로 움직이지 않았어요. 풍선 표면이 늘어나면서 멀어진 거예요.',
              '그림을 보면 스티커의 크기는 그대로예요. 커진 것은 풍선(공간)이에요.',
              '',
              '스티커는 표면에 붙어 있어요. 안으로 들어가지 않아요.',
            ],
            explain: '스티커의 크기는 그대로이고 <b>풍선 표면이 늘어나서</b> 스티커 사이가 멀어져요. 우주도 은하 자체가 커지는 것이 아니라 <b>은하 사이의 공간이 늘어나요</b>(우주 팽창).',
          },
        ],
      },
      /* ---------- 2단계 · 실험 ---------- */
      {
        title: '거리를 재어 비교하기', short: '거리 측정', icon: '📏', phase: '실험',
        features: ['ruler'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 풍선을 불면 스티커 사이가 모두 멀어지는 것을 봤어요.</div>' +
          '<p>이번에는 <b>줄자</b>로 직접 재 봐요. 기준 스티커 <b>A</b>에서 B~E까지의 거리를 풍선을 불기 <b>전(1배)</b>과 <b>후(2배)</b>에 각각 재서 표에 적어요.</p>' +
          '<p>스티커를 누르면 풍선 표면을 따라 줄자가 펴져요.</p>',
        setup() { configSlider('measure'); resetRec(); S.tape = null; S.ref = 0; viewDefault(); setSize(1, true); },
        recap: '거리를 재어 보니 A에서 멀리 있던 스티커일수록 거리가 더 많이 늘어났어요.',
        summary: '<div class="note-fig">' + FIG.table + '</div><ul><li>풍선을 불기 전과 후에 <b>줄자</b>로 기준 스티커 A에서 다른 스티커까지의 거리를 쟀어요.</li>' +
          '<li>모든 스티커가 A에서 멀어졌고, <b>멀리 있던 스티커일수록 더 많이 멀어졌어요</b>.</li>' +
          '<li>우주에서도 은하들이 서로 멀어지고 있어요. (이 활동은 모형으로 알아본 것이에요.)</li></ul>',
        missions: [
          {
            title: '📏 부풀리기 전에 재기',
            goal: '풍선이 <b>1배</b>일 때, 스티커 <b>B, C, D, E</b>를 하나씩 눌러 A에서의 거리를 재요.',
            hint: '슬라이더가 1배(맨 왼쪽)인지 확인하고 스티커를 눌러요. 눌렀을 때 표에 숫자가 적혀요.',
            setup() { configSlider('measure'); resetRec(); S.tape = null; setSize(1, true); },
            check: () => [1, 2, 3, 4].every((i) => S.rec[i].before != null),
            hold: 0.4,
            status: () => [1, 2, 3, 4].map((i) => chk(S.rec[i].before != null, nm(i))).join(' · '),
            explain: '풍선이 1배일 때 A에서 B, C, D, E까지 거리를 쟀어요. 가까운 스티커는 거리가 짧고, 먼 스티커는 길어요.',
          },
          {
            title: '📏 부풀린 뒤에 재기',
            goal: '풍선을 <b>2배</b>로 부풀린 뒤, 다시 <b>B, C, D, E</b>를 눌러 거리를 재요.',
            hint: '슬라이더를 오른쪽 끝(2배)까지 밀어요. 2배가 되면 스티커를 눌러 거리를 적어요.',
            setup() { configSlider('measure'); [1, 2, 3, 4].forEach((i) => { if (S.rec[i].before == null) S.rec[i].before = r1(dist(0, i, 1)); S.rec[i].after = null; }); S.tape = null; setSize(1, true); },
            check: () => [1, 2, 3, 4].every((i) => S.rec[i].after != null),
            hold: 0.4,
            status: () => chk(S.s >= 1.95, '풍선 2배') + ' · ' + [1, 2, 3, 4].map((i) => chk(S.rec[i].after != null, nm(i))).join(' · '),
            explain: '풍선을 2배로 불었더니 모든 거리가 늘어났어요. 표의 <b>늘어남</b> 열을 보세요.',
          },
          {
            type: 'quiz',
            title: '📊 표를 해석해 봐요',
            goal: '표에서 거리가 <b>가장 많이 늘어난</b> 스티커는, 풍선을 불기 전에 A에서 어떤 위치에 있었을까요?',
            figure: FIG.table,
            setup() { setSize(2, true); },
            choices: ['A에서 가장 가까운 스티커', 'A에서 가장 먼 스티커', '모두 똑같이 늘어났다', '거리가 줄어든 스티커도 있다'],
            answer: 1,
            feedback: [
              '표를 보면 가까운 B는 가장 조금 늘어났어요.',
              '',
              '늘어난 양이 모두 같지 않아요. 표의 마지막 열을 비교해 보세요.',
              '모든 스티커가 A에서 멀어졌어요. 줄어든 것은 없어요.',
            ],
            explain: 'A에서 <b>멀리 있던 스티커일수록 더 많이 멀어졌어요</b>. 풍선이 늘어날 때 사이의 거리가 멀수록 늘어나는 양도 커지기 때문이에요.',
          },
        ],
      },
      /* ---------- 3단계 · 설명 ---------- */
      {
        title: '팽창의 중심은 어디일까?', short: '중심은?', icon: '🎯', phase: '설명',
        features: ['ref'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> A를 기준으로 재어 보니 다른 스티커들이 모두 A에서 멀어졌어요.</div>' +
          '<p>그렇다면 A가 팽창의 <b>중심</b>일까요? 다른 스티커를 <b>기준</b>으로 삼아도 같은 결과가 나오는지 확인해 봐요.</p>' +
          '<p>스티커를 누르면 그 스티커가 기준이 되고, 풍선이 다시 부풀어요. 점선 원은 처음 자리, 주황 화살표는 멀어진 방향이에요.</p>',
        setup() { configSlider('ref'); S.refsDone.clear(); S.tape = null; },
        recap: '어느 스티커에서 보아도 다른 스티커들은 모두 멀어져요. 팽창의 중심이 따로 있는 것이 아니에요.',
        summary: '<div class="note-fig">' + FIG.refs + '</div><ul><li>기준 스티커를 바꿔도 <b>다른 스티커들이 모두 멀어지고, 먼 것일수록 더 많이 멀어져요</b>.</li>' +
          '<li>어느 스티커에서 보아도 똑같으므로 풍선 표면에는 팽창의 <b>중심이 없어요</b>.</li>' +
          '<li>우주에서도 어느 은하에서 보아도 다른 은하들이 멀어져요. 우주 팽창에는 <b>중심이 따로 없어요</b>.</li></ul>',
        missions: [
          {
            title: '👆 기준을 바꿔 보기',
            goal: '서로 다른 스티커 <b>3개</b>를 기준으로 삼아 풍선이 부풀어 오르는 것을 지켜봐요.',
            hint: '지금 기준(A)은 이미 부풀었어요. 다른 스티커 두 개를 눌러 기준을 바꾸고, 풍선이 2배가 될 때까지 기다려요.',
            setup() { configSlider('ref'); S.refsDone.clear(); S.tape = null; S.ref = 0; S.lon0T = ST[0].lon; S.lat0T = ST[0].lat; S.playTw = null; autoPlay(1, 2, 1.7, () => { S.refsDone.add(S.ref); }); },
            check: () => S.refsDone.size >= 3,
            hold: 0.5,
            status: () => '기준 ' + ST.map((s, i) => chk(S.refsDone.has(i), s.id)).join(' ') + ' <b>(' + S.refsDone.size + '/3)</b>',
            explain: '기준을 어느 스티커로 바꿔도 <b>다른 스티커들이 모두 그 스티커에서 멀어져요</b>. 어느 스티커도 특별하지 않아요.',
          },
          {
            type: 'quiz',
            title: '🎯 팽창의 중심은?',
            goal: '어느 스티커를 기준으로 해도 나머지가 모두 멀어졌어요. 이 풍선 모형에서 <b>팽창의 중심</b>은?',
            figure: FIG.refs,
            setup() { S.ref = 0; S.lon0T = ST[0].lon; S.lat0T = ST[0].lat; setSize(2, true); },
            choices: ['처음에 기준으로 삼은 스티커 A', '풍선의 한가운데 점', '풍선 표면에는 중심이라 할 만한 곳이 없다', '가장 먼 곳에 있는 스티커 E'],
            answer: 2,
            feedback: [
              'A에서 보면 멀어지지만, E에서 보아도 똑같이 멀어져요. A가 특별한 게 아니에요.',
              '풍선 속 한가운데는 풍선 표면(우주 공간)에 있는 곳이 아니에요. 표면 위에서는 중심을 찾을 수 없어요.',
              '',
              'E에서 보면 다른 스티커가 E에서 멀어져요. E도 중심이 아니에요.',
            ],
            explain: '어느 스티커에서 보아도 똑같이 멀어지므로 <b>표면에는 팽창의 중심이 없어요</b>. 우주도 마찬가지로 <b>어느 은하에서 보아도 다른 은하들이 멀어지고</b>, 팽창의 중심이 따로 없어요.',
          },
        ],
      },
      /* ---------- 4단계 · 적용 ---------- */
      {
        title: '우주의 과거', short: '우주의 과거', icon: '⏪', phase: '적용',
        features: ['past'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 우주는 어디에서나 팽창하고 있다는 것을 알았어요.</div>' +
          '<p>우주가 지금 팽창하고 있다면, <b>시간을 거꾸로</b> 돌리면 어떻게 될까요? 슬라이더로 풍선을 되감아 은하(스티커) 사이의 거리와 온도를 살펴봐요.</p>',
        setup() { configSlider('time'); S.ref = 0; viewDefault(); S.tape = null; setSize(2, true); S.bang = false; },
        recap: '시간을 거꾸로 돌리면 은하들이 가까워져요. 우주는 아주 먼 과거에 매우 작고 뜨거운 한 점에서 시작해 팽창해 왔다고 설명해요(대폭발 우주론).',
        summary: '<div class="note-fig">' + FIG.back + '</div><ul><li>우주가 팽창하고 있으므로, 과거로 갈수록 은하들 사이는 <b>가까웠어요</b>.</li>' +
          '<li>아주 먼 과거의 우주는 <b>매우 작고 뜨거운 한 점</b>이었어요.</li>' +
          '<li>이 점에서 시작한 큰 폭발로 우주가 시작되고 팽창해 왔다는 이론이 <b>대폭발(빅뱅) 우주론</b>이에요.</li></ul>',
        missions: [
          {
            title: '⏪ 시간을 되감기',
            goal: '[⏪ 우주의 시간] 슬라이더를 왼쪽 끝까지 밀어, 풍선을 <b>가장 작게</b> 만들어요.',
            hint: '슬라이더를 왼쪽으로 천천히 밀면서 스티커 사이의 거리와 온도 막대가 어떻게 달라지는지 봐요.',
            setup() { configSlider('time'); S.bang = false; setSize(2, true); },
            check: () => S.s <= 0.12,
            hold: 0.8,
            status: () => chk(S.s <= 0.12, '풍선을 가장 작게') + ' · 지금 ' + (S.s > 1.9 ? '현재' : S.s > 0.2 ? '과거' : '우주의 시작'),
            explain: '시간을 거꾸로 돌릴수록 풍선이 작아지고 스티커(은하) 사이가 가까워져요. 마지막에는 <b>한 점</b>으로 모이고, 온도는 점점 <b>높아져요</b>.',
          },
          {
            type: 'quiz',
            title: '🕰️ 아주 먼 과거의 우주',
            goal: '시간을 거꾸로 돌려 보니 풍선이 한 점이 되었어요. <b>아주 먼 과거의 우주</b>는 어땠을까요?',
            figure: FIG.back,
            setup() { setSize(0.04, true); },
            choices: ['지금과 똑같은 크기였다', '지금보다 훨씬 작고 뜨거웠다', '지금보다 더 크고 차가웠다', '은하들이 지금보다 더 멀리 떨어져 있었다'],
            answer: 1,
            feedback: [
              '우주가 팽창해 왔으므로 과거에는 지금보다 작았어요.',
              '',
              '팽창해 왔다면 과거에는 더 작았어요. 온도도 과거에 더 높았어요.',
              '과거로 갈수록 은하 사이의 거리는 가까워져요.',
            ],
            explain: '우주는 팽창해 왔으므로 과거에는 <b>지금보다 훨씬 작고 뜨거웠어요</b>. 아주 먼 과거에는 한 점이었다고 생각해요.',
          },
          {
            type: 'quiz',
            title: '💥 대폭발 우주론',
            goal: '<b>대폭발(빅뱅) 우주론</b>을 가장 알맞게 설명한 것은?',
            figure: null,
            setup() { setSize(0.04, true); },
            choices: ['우주는 지금 크기 그대로 영원히 있었다', '우주는 아주 작고 뜨거운 한 점에서 시작해 팽창해 왔다', '우주는 지금 줄어들고 있다', '우주의 중심에서 은하들이 폭발해 퍼져 나갔다'],
            answer: 1,
            feedback: [
              '우주는 팽창하고 있어서 과거에는 더 작았어요.',
              '',
              '지금 우주는 줄어드는 것이 아니라 팽창하고 있어요.',
              '우주에는 팽창의 중심이 따로 없었어요. 폭발한 한가운데에서 퍼져 나간 것이 아니에요.',
            ],
            explain: '<b>대폭발 우주론</b>은 우주가 아주 작고 뜨거운 한 점에서 시작해 지금까지 계속 팽창해 왔다고 설명해요. 팽창에는 중심이 따로 없어요.',
          },
        ],
      },
    ],
  });
  // 그림 없는 퀴즈 정리
  game = game || null;

  /* =========================================================
     시작
     ========================================================= */
  configSlider('grow');
  let frameMs = 0;
  SciSim.loop((dt, t) => {
    const t0 = performance.now();
    update(dt, t);
    draw(t);
    frameMs += (performance.now() - t0 - frameMs) * 0.05;
  });

  /* ---------- 점검용 ---------- */
  window.__sim = {
    S, ST, game: () => game, frameMs: () => frameMs, dist, setSize, setRef, measure, V,
    client(x, y) { const r = V.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
    stickerClient(i) { const s = ST[i]; return this.client(s.sx, s.sy); },
  };
})();
