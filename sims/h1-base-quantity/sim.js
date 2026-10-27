/* =========================================================
   통합과학1 Ⅰ. 과학의 기초 - 기본량과 단위 (단원 3차시)
   성취기준 [10통과1-01-02] 과학 탐구에서 중요한 기본량의 의미를 알고, 자연 현상을 기술하는 데 단위가 가지는 의미와
   적용사례를 설명할 수 있다.
   ① 관찰: 단위의 힘 (단위 붙이기, 화성 기후 궤도선)
   ② 탐구: 기본량 (짝짓기, 접두어와 단위 환산)
   ③ 분석: 유도량 (기본량 블록으로 속력·넓이·부피·밀도 만들기)
   ④ 적용: 스마트 측정 (진자·공·온도 센서로 측정 · 기록 · 평균)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 860 : 560;
  const RM = SciSim.reduceMotion;
  const SUPD = { '.': '·', '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const sup = (n) => String(n).split('').map((c) => SUPD[c] || c).join('');
  const p10 = (n) => '10' + sup(n);
  const MINUS = '−';
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const comma = (n) => String(Math.round(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  const num = (s) => { let t = String(s).trim(); t = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t) ? t.replace(/,/g, '') : t.replace(/,/g, '.'); const v = parseFloat(t.replace(/[^0-9eE+\-.]/g, '')); return isFinite(v) ? v : NaN; };

  const FS = PHONE ? 1.2 : 1;
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f4f8fd' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const parts = new SciSim.Particles();

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'units', sub: 'units', clock: 0, fade: 0, drag: null,
    units: { pick: [null, null, null], ok: false, bad: [false, false, false], marsT: -1, marsDone: false, marsPlays: 0 },
    cards: [], slots: [], matchOK: false, matchFlash: 0,
    pre: 4, conv: { idx: 0, solved: [false, false, false], flash: 0, shake: 0 },
    asm: { target: 'speed', top: [], bot: [], ok: false, okAt: 0, solved: {}, unitA: 0 }, blocks: [],
    ph: { rec: [], pend: { state: 'idle', p: 0, n: 0, val: null, ph: 0 }, ball: { state: 'idle', t: 0, done: false }, temp: { T: 8, heat: false, hist: [], t: 0 }, calcOK: false, avgOK: false, spdOK: false },
    showCalc: false,
  };
  let game = null;

  /* ======================================================
     화면 1-a: 단위 붙이기
     ====================================================== */
  const UQ = [
    { key: 'salt', lead: '소금', num: '3', opts: ['mg', 'g', 'kg'], ans: 1, say: ['싱거워요! 소금이 거의 들어가지 않았어요', '알맞게 간이 맞아요', '너무 짜서 먹을 수 없어요'] },
    { key: 'speed', lead: '제한 속도', num: '100', opts: ['cm/s', 'km/h', 'm/s'], ans: 1, say: ['= 3.6 km/h → 걷는 속도예요', '= 100 km/h → 고속 도로 속도예요', '= 360 km/h → 비행기보다 빨라요'] },
    { key: 'syrup', lead: '시럽', num: '5', opts: ['mL', 'L', 'm³'], ans: 0, say: ['티스푼 하나 정도예요', '큰 물병 2개 반이에요', '욕조 30개 가득이에요'] },
  ];
  function uPanel(i) { return PHONE ? { x: 8, y: 8 + i * 286, w: 584, h: 276 } : { x: 8 + i * 264, y: 8, w: 256, h: VH - 16 }; }
  function drawUnits(t, dt) {
    ctx.fillStyle = '#f4f8fd'; ctx.fillRect(0, 0, VW, VH);
    UQ.forEach((q, i) => {
      const P = uPanel(i), pk = S.units.pick[i], ok = pk === q.ans;
      ctx.save(); ctx.translate(P.x, P.y);
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(0, 0, P.w, P.h, 16).fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = pk == null ? '#cbd5e1' : S.units.bad[i] ? '#e2464b' : ok ? '#14a058' : '#f59e0b'; ctx.lineWidth = 3; rr(0, 0, P.w, P.h, 16).stroke();
      // 문장
      const sx = 16, sy = 42;
      D.text(sx, sy, q.lead + ' ' + q.num, { size: 24, color: '#1b2333', weight: 800, align: 'left' });
      ctx.font = D.font(24, 800); const w0 = ctx.measureText(q.lead + ' ' + q.num).width;
      const ux = sx + w0 + 10, label = pk == null ? '?' : q.opts[pk];
      ctx.font = D.font(24, 800); const uw = Math.max(46, ctx.measureText(label).width + 22);
      ctx.fillStyle = pk == null ? '#fef3c7' : ok ? '#dcfce7' : '#ffedd5'; ctx.strokeStyle = pk == null ? '#f59e0b' : ok ? '#14a058' : '#f97316'; ctx.lineWidth = 2.5; ctx.setLineDash(pk == null ? [5, 4] : []);
      rr(ux, sy - 28, uw, 38, 10).fill(); rr(ux, sy - 28, uw, 38, 10).stroke(); ctx.setLineDash([]);
      D.text(ux + uw / 2, sy, label, { size: 24, color: pk == null ? '#f59e0b' : '#1b2333', weight: 800 });
      // 장면
      const sc = { x: 12, y: 62, w: P.w - 24, h: P.h - 62 - (PHONE ? 54 : 78) };
      ctx.save(); rr(sc.x, sc.y, sc.w, sc.h, 12).clip();
      if (i === 0) saltScene(sc, pk, t); else if (i === 1) carScene(sc, pk, t, i, dt); else syrupScene(sc, pk, t);
      ctx.restore();
      const msg = pk == null ? '위에서 단위를 골라 보세요' : q.say[pk];
      D.text(P.w / 2, P.h - (PHONE ? 22 : 42), msg, { size: 14, color: pk == null ? '#94a3b8' : ok ? '#0b6b39' : '#b45309', weight: 800 });
      if (pk != null && !PHONE) D.text(P.w / 2, P.h - 18, ok ? '👍 알맞은 단위!' : '🤔 어딘가 이상해요', { size: 15, color: ok ? '#14a058' : '#e2464b', weight: 800 });
      ctx.restore();
    });
  }
  function saltScene(sc, pk, t) {
    const g = ctx.createLinearGradient(0, sc.y, 0, sc.y + sc.h); g.addColorStop(0, '#fef9ec'); g.addColorStop(1, '#f6e7c8'); ctx.fillStyle = g; ctx.fillRect(sc.x, sc.y, sc.w, sc.h);
    const cx = sc.x + sc.w / 2, by = sc.y + sc.h - 24, bw = Math.min(sc.w * 0.8, 200), bh = sc.h * 0.34;
    // 냄비
    D.shadow(() => { ctx.fillStyle = '#6b7280'; rr(cx - bw / 2 - 10, by - bh, bw + 20, bh, 12).fill(); }, { blur: 8, y: 4 });
    ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.ellipse(cx, by - bh + 4, bw / 2, 12, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.ellipse(cx, by - bh + 5, bw / 2 - 8, 8, 0, 0, 6.3); ctx.fill();
    ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx + bw / 2 + 10, by - bh * 0.7); ctx.lineTo(cx + bw / 2 + 32, by - bh * 0.7); ctx.stroke();
    for (let k = 0; k < 3; k++) { const ph = (t * 0.6 + k / 3) % 1; ctx.strokeStyle = 'rgba(148,163,184,' + (0.5 * (1 - ph)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 24 + k * 24, by - bh - 8 - ph * 34); ctx.quadraticCurveTo(cx - 14 + k * 24, by - bh - 20 - ph * 34, cx - 24 + k * 24, by - bh - 32 - ph * 34); ctx.stroke(); }
    // 소금 더미
    if (pk != null) {
      const gram = [0.003, 3, 3000][pk], h = pk === 0 ? 1.2 : pk === 1 ? 14 : sc.h * 0.62, w = pk === 0 ? 3 : pk === 1 ? 30 : bw * 1.05;
      const ty = by - bh - 6 - h * 0.0;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - w, by - bh + 2); ctx.quadraticCurveTo(cx - w * 0.3, by - bh - h * 1.1, cx, by - bh - h); ctx.quadraticCurveTo(cx + w * 0.3, by - bh - h * 1.1, cx + w, by - bh + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e2e8f0'; const r = rng(4 + pk); for (let k = 0; k < (pk === 2 ? 40 : 10); k++) ctx.fillRect(cx + (r() - 0.5) * w * 1.4, by - bh - r() * h * 0.9, 2, 2);
      D.text(cx, sc.y + 24, comma(gram < 1 ? 0 : gram) === '0' ? '0.003 g' : comma(gram) + ' g', { size: 16, color: '#92400e', weight: 800 });
      if (pk === 2) D.text(cx + bw * 0.45, sc.y + 54, '으악 짜!', { size: 17, color: '#dc2626', weight: 800 });
    } else D.text(cx, sc.y + 30, '소금을 얼마나 넣을까요?', { size: 15, color: '#92400e', weight: 800 });
  }
  function carScene(sc, pk, t, i) {
    const g = ctx.createLinearGradient(0, sc.y, 0, sc.y + sc.h); g.addColorStop(0, '#bfe3ff'); g.addColorStop(0.62, '#e6f3ff'); g.addColorStop(0.62, '#4b5563'); g.addColorStop(1, '#374151'); ctx.fillStyle = g; ctx.fillRect(sc.x, sc.y, sc.w, sc.h);
    const ry = sc.y + sc.h * 0.8; ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3; ctx.setLineDash([16, 14]); ctx.lineDashOffset = -((S.units.roadOff || 0)); ctx.beginPath(); ctx.moveTo(sc.x, ry); ctx.lineTo(sc.x + sc.w, ry); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    // 표지판
    ctx.fillStyle = '#6b7280'; ctx.fillRect(sc.x + 20, sc.y + sc.h * 0.24, 5, sc.h * 0.4);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(sc.x + 22, sc.y + sc.h * 0.24, 26, 0, 6.3); ctx.fill(); ctx.stroke();
    D.text(sc.x + 22, sc.y + sc.h * 0.24 + 7, '100', { size: 20, color: '#1b2333', weight: 800 });
    if (pk != null) D.text(sc.x + 22, sc.y + sc.h * 0.24 + 44, ['cm/s', 'km/h', 'm/s'][pk], { size: 13, color: '#fff', weight: 800 });
    // 자동차
    const kmh = pk == null ? 0 : [3.6, 100, 360][pk], spd = pk == null ? 0 : 36 * Math.pow(kmh / 100, 0.7) * 2.4;
    const U = S.units; U.carX = ((U.carX == null ? sc.w * 0.3 : U.carX) + spd * (S.dt || 0.016)) % (sc.w + 80); U.roadOff = ((U.roadOff || 0) + spd * (S.dt || 0.016)) % 30;
    const cx = sc.x + U.carX - 40, cy = ry - 20;
    D.shadow(() => { ctx.fillStyle = '#ef4444'; rr(cx - 30, cy - 14, 60, 22, 8).fill(); ctx.fillStyle = '#fca5a5'; rr(cx - 16, cy - 28, 34, 18, 7).fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(cx - 18, cy + 8, 7, 0, 6.3); ctx.arc(cx + 18, cy + 8, 7, 0, 6.3); ctx.fill();
    if (kmh >= 300) { for (let k = 0; k < 4; k++) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 40 - k * 16, cy - 16 + k * 7); ctx.lineTo(cx - 70 - k * 16, cy - 16 + k * 7); ctx.stroke(); } D.text(sc.x + sc.w - 70, sc.y + 30, '⚠ 과속!', { size: 18, color: '#fecaca', weight: 800 }); }
    if (pk != null) D.label(sc.x + sc.w / 2, sc.y + sc.h - 14, '≈ ' + ['3.6', '100', '360'][pk] + ' km/h', { bg: 'rgba(15,23,42,.8)', size: 14 });
    else D.text(sc.x + sc.w / 2, sc.y + 30, '자동차는 얼마나 빨라야 할까요?', { size: 14, color: '#1b2333', weight: 800 });
  }
  function syrupScene(sc, pk, t) {
    const g = ctx.createLinearGradient(0, sc.y, 0, sc.y + sc.h); g.addColorStop(0, '#eef6ff'); g.addColorStop(1, '#dbeafe'); ctx.fillStyle = g; ctx.fillRect(sc.x, sc.y, sc.w, sc.h);
    const cx = sc.x + sc.w / 2, gy = sc.y + sc.h - 18; ctx.fillStyle = '#cbd5e1'; ctx.fillRect(sc.x, gy, sc.w, 18);
    // 사람 (비교용)
    const personH = 54, px = sc.x + sc.w - 30;
    ctx.fillStyle = '#94a3b8'; rr(px - 6, gy - personH * 0.45, 12, personH * 0.45, 3).fill(); ctx.fillStyle = '#3867f4'; rr(px - 9, gy - personH * 0.85, 18, personH * 0.4, 5).fill(); D.sphere(px, gy - personH * 0.95, 6, '#fcd9b6');
    if (pk === 0) {
      const sx = cx - 10, sy = gy - 40; ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.ellipse(sx, sy, 26, 13, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.ellipse(sx, sy - 2, 22, 9, 0, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx + 22, sy + 4); ctx.lineTo(sx + 70, sy + 18); ctx.stroke();
      ctx.fillStyle = '#7c2d12'; rr(cx - 62, gy - 52, 28, 52, 6).fill(); ctx.fillStyle = '#fed7aa'; rr(cx - 56, gy - 74, 16, 24, 4).fill();
    } else if (pk === 1) {
      [0, 1].forEach((k) => { const bx = cx - 60 + k * 48; ctx.fillStyle = 'rgba(249,115,22,.85)'; rr(bx, gy - 90, 38, 90, 10).fill(); ctx.fillStyle = '#7c2d12'; rr(bx + 10, gy - 106, 18, 18, 4).fill(); });
      ctx.fillStyle = 'rgba(249,115,22,.85)'; rr(cx + 36, gy - 45, 38, 45, 10).fill();
    } else if (pk === 2) {
      const s2 = Math.min(sc.w * 0.6, sc.h * 0.8); ctx.fillStyle = 'rgba(249,115,22,.55)'; ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 3; rr(cx - s2 / 2 - 14, gy - s2, s2, s2, 8).fill(); rr(cx - s2 / 2 - 14, gy - s2, s2, s2, 8).stroke();
      ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 2; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(cx - s2 / 2 - 14, gy - s2 * k / 4); ctx.lineTo(cx + s2 / 2 - 14, gy - s2 * k / 4); ctx.stroke(); }
    } else D.text(cx, sc.y + 30, '시럽을 얼마나 먹어야 할까요?', { size: 14, color: '#1e3a8a', weight: 800 });
    if (pk != null) D.label(sc.x + sc.w / 2, sc.y + 18, ['5 mL', '5 L', '5 m³'][pk], { bg: 'rgba(15,23,42,.8)', size: 14 });
  }
  function checkUnits() {
    const un = S.units.pick.filter((p) => p == null).length;
    if (un) return '아직 단위를 고르지 않은 문장이 <b>' + un + '개</b> 있어요.';
    const bad = [];
    S.units.pick.forEach((p, i) => { if (p !== UQ[i].ans) bad.push(i); });
    S.units.bad = [0, 1, 2].map((i) => bad.includes(i));
    if (bad.length) return bad.map((i) => '<b>' + UQ[i].lead + ' ' + UQ[i].num + '</b>').join(', ') + ' 문장이 이상해요. 장면과 안내 글을 살펴보세요.';
    S.units.bad = [false, false, false];
    return true;
  }

  /* ======================================================
     화면 1-b: 화성 기후 궤도선
     ====================================================== */
  const MC = PHONE ? { x: 300, y: 560, R: 190 } : { x: 585, y: 440, R: 190 };
  function marsPos(t, rmin) { const a = (-90 + t * 72) * Math.PI / 180, r = rmin + (260 - rmin) * t * t * (PHONE ? 0.8 : 1); return { x: MC.x + Math.cos(a) * (MC.R + r), y: MC.y + Math.sin(a) * (MC.R + r) }; }
  function drawMars(t, dt) {
    const sk = ctx.createLinearGradient(0, 0, 0, VH); sk.addColorStop(0, '#050816'); sk.addColorStop(1, '#1b1033'); ctx.fillStyle = sk; ctx.fillRect(0, 0, VW, VH);
    const r = rng(8); for (let i = 0; i < 70; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.6 * r()) + ')'; ctx.beginPath(); ctx.arc(r() * VW, r() * VH, 0.6 + r() * 1.2, 0, 6.3); ctx.fill(); }
    // 화성
    D.glow(MC.x, MC.y, MC.R + 40, '#fb923c', 0.35);
    ctx.fillStyle = 'rgba(253,186,116,.4)'; ctx.beginPath(); ctx.arc(MC.x, MC.y, MC.R + 14, 0, 6.3); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(MC.x, MC.y, MC.R, 0, 6.3); ctx.clip();
    const g = ctx.createRadialGradient(MC.x - MC.R * 0.3, MC.y - MC.R * 0.4, 10, MC.x, MC.y, MC.R); g.addColorStop(0, '#fdba74'); g.addColorStop(0.6, '#c2410c'); g.addColorStop(1, '#7c2d12'); ctx.fillStyle = g; ctx.fillRect(MC.x - MC.R, MC.y - MC.R, MC.R * 2, MC.R * 2);
    ctx.fillStyle = 'rgba(124,45,18,.5)'; [[-60, -90, 28], [40, -120, 18], [-110, -30, 22], [70, -40, 14]].forEach(([dx, dy, rad]) => { ctx.beginPath(); ctx.arc(MC.x + dx, MC.y + dy, rad, 0, 6.3); ctx.fill(); });
    ctx.restore();
    // 계획 궤도, 실제 궤도
    ctx.setLineDash([7, 6]); ctx.lineWidth = 3;
    ctx.strokeStyle = '#4ade80'; ctx.beginPath(); for (let k = -1; k <= 1.001; k += 0.04) { const p = marsPos(k, 60); k === -1 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); } ctx.stroke();
    ctx.strokeStyle = '#f87171'; ctx.beginPath(); for (let k = -1; k <= 0.3; k += 0.04) { const p = marsPos(k, 8); k === -1 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); } ctx.stroke(); ctx.setLineDash([]);
    const pp = marsPos(0, 60); D.text(Math.min(pp.x + 14, VW - 160), pp.y - 12, '계획: 고도 약 226 km', { size: 14, color: '#86efac', weight: 800, align: 'left' });
    const ap = marsPos(0, 8); D.text(ap.x + (PHONE ? -70 : 14), ap.y + 24, '실제: 약 57 km (대기권)', { size: 14, color: '#fca5a5', weight: 800, align: 'left' });
    // 궤도선
    const U = S.units;
    if (U.marsT >= -1) {
      const burn = U.marsT > 0.04, tt = Math.min(U.marsT, 0.14), p = marsPos(tt, 8);
      if (!burn || U.marsT < 0.2) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-0.6 + tt * 3);
        ctx.fillStyle = '#e2e8f0'; rr(-12, -7, 24, 14, 3).fill(); ctx.fillStyle = '#3b82f6'; rr(-30, -4, 15, 8, 2).fill(); rr(15, -4, 15, 8, 2).fill(); ctx.restore();
      }
      if (burn && U.marsT < 0.6) { D.glow(p.x, p.y, 40 + 40 * Math.sin(t * 20) * 0.2, '#fb923c', 0.9); if (!RM) for (let k = 0; k < 2; k++) parts.emit({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0.6, size: 3 + Math.random() * 3, color: ['#fde047', '#fb923c', '#ef4444'][k % 3], gravity: 0, drag: 2 }); }
      if (U.marsT >= 0.3) D.label(PHONE ? VW / 2 : 470, PHONE ? 480 : 140, '📡 신호가 끊겼어요… 궤도선을 잃었어요', { bg: '#dc2626', size: 17 });
    } else D.text(VW / 2 - (PHONE ? 0 : 60), 200, '▶ 사고 장면 다시 보기를 눌러요', { size: 15, color: '#94a3b8', weight: 700 });
    // 팀 상자
    const bx = PHONE ? 14 : 14, bw = PHONE ? 400 : 290;
    [['🛰️ 우주선 제작 팀', '추진력을 파운드-힘(lbf)·초 단위로 계산해 보냄', '#fbbf24'], ['🧭 항법 팀', '그 값을 뉴턴(N)·초 단위인 줄 알고 계산함', '#60a5fa']].forEach(([a, b2, c], i) => {
      const y = 18 + i * 96;
      D.shadow(() => { ctx.fillStyle = 'rgba(15,23,42,.82)'; rr(bx, y, bw, 82, 14).fill(); }, { blur: 8, y: 3, color: 'rgba(0,0,0,.4)' });
      ctx.strokeStyle = c; ctx.lineWidth = 2.5; rr(bx, y, bw, 82, 14).stroke();
      D.text(bx + 14, y + 28, a, { size: 17, color: c, weight: 800, align: 'left' }); D.text(bx + 14, y + 56, b2, { size: PHONE ? 13 : 14, color: '#e2e8f0', weight: 700, align: 'left' });
    });
    D.label(bx + bw / 2, 224, '1 lbf ≈ 4.45 N  →  값이 4.45배 달라져요', { bg: '#f26b3a', size: 15 });
  }
  function marsPlay() { S.units.marsT = -1; S.units.marsPlay = true; S.units.marsPlays++; Sound.click(); }
  function stepMars(dt) { const U = S.units; if (!U.marsPlay) return; U.marsT += dt * (RM ? 3 : 0.42); if (U.marsT >= 0.8) { U.marsPlay = false; U.marsDone = true; } }

  /* ======================================================
     끌어 놓기 공통
     ====================================================== */
  function pickItem(p, list) { for (let i = list.length - 1; i >= 0; i--) { const c = list[i]; if (Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return c; } return null; }
  function cardBox(c, o) {
    o = o || {};
    const lift = c.lift || 0, sc = 1 + lift * 0.07, sh = c.shake > 0 ? Math.sin(c.shake * 40) * 5 * Math.min(1, c.shake * 3) : 0;
    ctx.save(); ctx.translate(c.x + sh, c.y); ctx.scale(sc, sc);
    D.shadow(() => { ctx.fillStyle = o.fill || '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 12).fill(); }, { blur: 5 + lift * 14, y: 2 + lift * 7, color: 'rgba(30,45,80,' + (0.16 + lift * 0.12) + ')' });
    ctx.strokeStyle = o.stroke || '#cbd5e1'; ctx.lineWidth = o.sw || 2; rr(-c.w / 2, -c.h / 2, c.w, c.h, 12).stroke();
    return () => ctx.restore();
  }
  function dragStart(c, p, list) { S.drag = { c, ox: p.x - c.x, oy: p.y - c.y }; if (list) { const i = list.indexOf(c); if (i >= 0) { list.splice(i, 1); list.push(c); } } SciSim.tween(c, { lift: 1 }, { duration: 0.12 }); Sound.click(); c.free = true; }
  function flyTo(c, x, y) { c.free = false; c.tx = x; c.ty = y; SciSim.tween(c, { lift: 0 }, { duration: 0.25 }); }
  function stepItems(list, dt) { list.forEach((c) => { if (c.free) return; if (RM) { c.x = c.tx; c.y = c.ty; } else { c.x = SciSim.approach(c.x, c.tx, dt, 14); c.y = SciSim.approach(c.y, c.ty, dt, 14); } if (c.shake > 0) c.shake = Math.max(0, c.shake - dt); }); }

  /* ======================================================
     화면 2-a: 기본량 짝짓기
     ====================================================== */
  const QTY = [
    { id: 'time', ico: '⏱️', name: '시간', ex: '얼마나 오래 걸렸나?', tool: '초시계', unit: 's', uname: '초' },
    { id: 'length', ico: '📏', name: '길이', ex: '얼마나 길고 멀까?', tool: '자', unit: 'm', uname: '미터' },
    { id: 'mass', ico: '⚖️', name: '질량', ex: '물질의 양은 얼마일까?', tool: '저울', unit: 'kg', uname: '킬로그램' },
    { id: 'current', ico: '⚡', name: '전류', ex: '전기가 얼마나 흐를까?', tool: '전류계', unit: 'A', uname: '암페어' },
    { id: 'temp', ico: '🌡️', name: '온도', ex: '얼마나 뜨겁고 찰까?', tool: '온도계', unit: 'K', uname: '켈빈' },
  ];
  const MR = PHONE ? { sx: 16, sw: 320, sh: 80, sy0: 70, gap: 12, cx: 470, cw: 200, ch: 70 } : { sx: 22, sw: 380, sh: 64, sy0: 84, gap: 12, cx: 590, cw: 190, ch: 64 };
  function initMatch() {
    S.slots = QTY.map((q, i) => ({ q, i, x: MR.sx + MR.sw / 2, y: MR.sy0 + i * (MR.sh + MR.gap) + MR.sh / 2, w: MR.sw, h: MR.sh, card: null }));
    const order = [3, 0, 4, 2, 1];
    S.cards = order.map((qi, n) => { const q = QTY[qi], hx = MR.cx + (PHONE ? 0 : 0), hy = MR.sy0 + n * (MR.sh + MR.gap) + MR.sh / 2; return { kind: 'card', q, id: q.id, x: hx - (PHONE ? 20 : 0), y: hy, tx: hx - (PHONE ? 20 : 0), ty: hy, hx: hx - (PHONE ? 20 : 0), hy, w: MR.cw, h: MR.ch - (PHONE ? 8 : 0), lift: 0, shake: 0, free: false, slot: null, bad: false }; });
    S.matchOK = false; S.matchFlash = 0;
  }
  function slotAt(p) { return S.slots.find((s) => Math.abs(p.x - s.x) <= s.w / 2 + 6 && Math.abs(p.y - s.y) <= s.h / 2 + 4); }
  function cardDrop(c, p) {
    S.drag = null;
    const sl = slotAt(p);
    if (sl) {
      const other = sl.card && sl.card !== c ? sl.card : null;
      if (c.slot) c.slot.card = null;
      if (other) { other.slot = null; if (c.slot) { other.slot = c.slot; c.slot.card = other; flyTo(other, c.slot.x + c.slot.w / 2 - 78, c.slot.y); other.w = 150; } else { flyTo(other, other.hx, other.hy); other.w = MR.cw; } other.bad = false; }
      sl.card = c; c.slot = sl; c.bad = false; c.w = 150; c.h = sl.h - 14; Sound.tick(); flyTo(c, sl.x + sl.w / 2 - 82, sl.y);
    } else { if (c.slot) c.slot.card = null; c.slot = null; c.w = MR.cw; c.h = MR.ch - (PHONE ? 8 : 0); c.bad = false; flyTo(c, c.hx, c.hy); }
  }
  function drawMatch(t) {
    ctx.fillStyle = '#f4f8fd'; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 34, '기본량 5가지와 측정 기구·단위를 짝지어 봐요', { size: PHONE ? 16 : 19, color: '#1b2333', weight: 800 });
    D.text(MR.sx + MR.sw / 2, 66, '기본량', { size: 14, color: '#5d6879', weight: 800 }); D.text(MR.cx - (PHONE ? 20 : 0), 66, '측정 기구 · 단위', { size: 14, color: '#5d6879', weight: 800 });
    S.slots.forEach((s) => {
      const hit = S.drag && S.drag.c.kind === 'card' && slotAt(S.drag.c) === s;
      ctx.fillStyle = hit ? '#e0e9ff' : '#fff'; ctx.strokeStyle = hit ? '#3867f4' : S.matchOK ? '#14a058' : '#94a3b8'; ctx.lineWidth = hit ? 3 : 2; ctx.setLineDash(s.card ? [] : [6, 5]);
      D.shadow(() => rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).fill(), { blur: 5, y: 2 }); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).stroke(); ctx.setLineDash([]);
      D.text(s.x - s.w / 2 + 16, s.y + 10, s.q.ico, { size: 28, align: 'left', weight: 700 });
      D.text(s.x - s.w / 2 + 62, s.y - 4, s.q.name, { size: 20, color: '#1b2333', weight: 800, align: 'left' });
      D.text(s.x - s.w / 2 + 62, s.y + 18, s.q.ex, { size: 13, color: '#5d6879', weight: 700, align: 'left' });
      if (S.matchOK) D.text(s.x + s.w / 2 - 20, s.y + 8, s.q.unit, { size: 22, color: '#14a058', weight: 800, align: 'right' });
    });
    S.cards.forEach((c) => {
      const end = cardBox(c, { stroke: c.bad ? '#e2464b' : S.matchOK ? '#14a058' : c.slot ? '#3867f4' : '#cbd5e1' });
      if (c.slot) { D.text(0, -4, c.q.tool, { size: 16, color: '#1b2333', weight: 800 }); D.text(0, 16, c.q.unit + ' (' + c.q.uname + ')', { size: 14, color: '#3867f4', weight: 800 }); }
      else { D.text(0, -4, '🔧 ' + c.q.tool, { size: 16, color: '#1b2333', weight: 800 }); D.text(0, 17, c.q.unit + ' (' + c.q.uname + ')', { size: 15, color: '#3867f4', weight: 800 }); }
      end();
    });
    if (S.matchOK) D.label(VW / 2 - (PHONE ? 0 : 0), VH - 28, '그 밖에 물질량(mol)과 광도(cd)도 있어요. 모두 7가지 기본량이에요.', { bg: '#1b2333', size: PHONE ? 13 : 14 });
  }
  const matchDone = () => S.slots.every((s) => s.card && s.card.id === s.q.id);

  /* ======================================================
     화면 2-b: 접두어와 단위 환산
     ====================================================== */
  const PRE = [['n', '나노', -9], ['µ', '마이크로', -6], ['m', '밀리', -3], ['', '(없음)', 0], ['k', '킬로', 3], ['M', '메가', 6], ['G', '기가', 9]];
  const CONVQ = [
    { text: '2.5 km = ? m', ans: [2500, 2500], hint: 'k(킬로) = 10³ 이므로 2.5 × 1000', unit: 'm', fb: '킬로(k)는 1000배를 뜻해요.' },
    { text: '500 mg = ? kg', ans: [0.0005, 0.0005], hint: 'mg = 10⁻³ g, g = 10⁻³ kg → 500 × 10⁻⁶', unit: 'kg', fb: 'mg → g → kg로 두 번 1000으로 나눠요. (500 × 10⁻⁶ kg)' },
    { text: '25 °C = ? K', ans: [297.5, 298.5], hint: 'K = °C + 273', unit: 'K', fb: '켈빈 온도는 섭씨온도에 273을 더해요.' },
  ];
  function drawConvert(t) {
    ctx.fillStyle = '#f4f8fd'; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 34, '단위 접두어와 환산', { size: PHONE ? 17 : 20, color: '#1b2333', weight: 800 });
    // 접두어 사다리
    const x0 = 50, x1 = VW - 50, y0 = PHONE ? 160 : 150, step = (x1 - x0) / 6;
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    PRE.forEach((p, i) => {
      const x = x0 + i * step, on = i === S.pre;
      D.sphere(x, y0, on ? 17 : 11, on ? '#3867f4' : '#94a3b8', { gloss: false });
      D.text(x, y0 + 6, p[0] || '1', { size: on ? 18 : 14, color: '#fff', weight: 800 });
      D.text(x, y0 + 44, p[1], { size: 13, color: on ? '#1d4ed8' : '#5d6879', weight: 800 });
      D.text(x, y0 - 26, p10(p[2]), { size: 14, color: on ? '#1d4ed8' : '#64748b', weight: 800 });
    });
    const pi = PRE[S.pre];
    D.label(VW / 2, y0 + 84, '1 ' + pi[0] + 'm = ' + (pi[2] === 0 ? '1' : p10(pi[2])) + ' m  (' + (pi[2] >= 0 ? comma(Math.pow(10, pi[2])) : '1/' + comma(Math.pow(10, -pi[2]))) + ')', { bg: '#1b2333', size: 17 });
    // 로그 막대
    const by = y0 + 130, bx0 = 40, bx1 = VW - 40;
    ctx.fillStyle = '#e2e8f0'; rr(bx0, by, bx1 - bx0, 18, 9).fill();
    const lenx = bx0 + (pi[2] + 9) / 18 * (bx1 - bx0); ctx.fillStyle = '#3867f4'; rr(bx0, by, Math.max(10, lenx - bx0), 18, 9).fill();
    D.text(bx0, by + 38, '10⁻⁹ m', { size: 13, color: '#5d6879', weight: 800, align: 'left' }); D.text(bx1, by + 38, '10⁹ m', { size: 13, color: '#5d6879', weight: 800, align: 'right' }); D.text((bx0 + bx1) / 2, by + 38, '1 m', { size: 13, color: '#5d6879', weight: 800 });
    D.text(VW / 2, by + 62, '길이를 로그 눈금(10배씩)으로 나타낸 막대', { size: 13, color: '#94a3b8', weight: 700 });
    // 문제 카드
    const q = CONVQ[Math.min(2, S.conv.idx)], all = S.conv.solved.every(Boolean), cy = by + (PHONE ? 100 : 96), ch = PHONE ? 200 : 170;
    const sh = S.conv.shake > 0 ? Math.sin(S.conv.shake * 40) * 6 : 0;
    ctx.save(); ctx.translate(sh, 0);
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(40, cy, VW - 80, ch, 18).fill(); }, { blur: 10, y: 4 });
    ctx.strokeStyle = all ? '#14a058' : '#3867f4'; ctx.lineWidth = 3; rr(40, cy, VW - 80, ch, 18).stroke();
    D.text(VW / 2, cy + 38, all ? '🎉 환산 문제 3개를 모두 풀었어요!' : '환산 문제 ' + (S.conv.idx + 1) + ' / 3', { size: 17, color: all ? '#14a058' : '#3867f4', weight: 800 });
    D.text(VW / 2, cy + 98, all ? '' : q.text, { size: PHONE ? 34 : 42, color: '#1b2333', weight: 800 });
    S.conv.solved.forEach((s, i) => D.sphere(VW / 2 - 30 + i * 30, cy + ch - 28, 9, s ? '#14a058' : '#cbd5e1', { gloss: false }));
    ctx.restore();
    if (!all) D.text(VW / 2, cy + ch - 56, '단위를 환산해서 왼쪽 패널에 입력해요', { size: 13, color: '#94a3b8', weight: 700 });
  }
  function checkConv() {
    const C = S.conv, q = CONVQ[C.idx], raw = $('#inConv').value.trim();
    if (!raw) { toast('답을 입력해 주세요', '', 1200); return; }
    const v = num(raw);
    if (!isFinite(v)) { toast('숫자로 입력해요', '', 1200); return; }
    const ok = v >= q.ans[0] * (q.ans[0] === q.ans[1] ? 0.98 : 1) && v <= q.ans[1] * (q.ans[0] === q.ans[1] ? 1.02 : 1);
    if (ok) {
      C.solved[C.idx] = true; Sound.success(); parts.burst(VW / 2, 330, { count: 16, speed: 160, size: 4 }); toast('정답! ' + q.hint, 'good', 2200);
      $('#inConv').value = ''; if (C.idx < 2) C.idx++; else C.idx = 2; updateQ();
    } else { C.shake = 0.5; Sound.fail(); toast(q.fb, 'bad', 3200); }
  }
  function updateQ() { const C = S.conv; $('#qText').textContent = C.solved.every(Boolean) ? '✅ 3문제 모두 정답!' : '문제 ' + (C.idx + 1) + ' / 3 : ' + CONVQ[C.idx].text; }

  /* ======================================================
     화면 3: 유도량 블록 조립
     ====================================================== */
  const BASEB = [{ t: 'L', name: '길이', unit: 'm', col: '#3867f4', ico: '📏' }, { t: 'T', name: '시간', unit: 's', col: '#f59e0b', ico: '⏱️' }, { t: 'M', name: '질량', unit: 'kg', col: '#16a34a', ico: '⚖️' }];
  const BB = {}; BASEB.forEach((b) => { BB[b.t] = b; });
  const TARGET = {
    speed: { name: '속력', vec: [0, 1, -1], unit: 'm/s', q: '100 m를 12.5 s에 달리면 속력은 몇 m/s일까요?', ans: 8, tol: 0.05, fb: '속력 = 100 m ÷ 12.5 s 를 계산해 보세요.' },
    area: { name: '넓이', vec: [0, 2, 0], unit: 'm²', q: '가로 4 m, 세로 3 m인 방의 넓이는 몇 m²일까요?', ans: 12, tol: 0.05, fb: '넓이 = 길이 × 길이 = 4 m × 3 m 예요.' },
    volume: { name: '부피', vec: [0, 3, 0], unit: 'm³', q: '한 변이 2 m인 정육면체의 부피는 몇 m³일까요?', ans: 8, tol: 0.05, fb: '부피 = 길이 × 길이 × 길이 = 2 × 2 × 2 예요.' },
    density: { name: '밀도', vec: [1, -3, 0], unit: 'kg/m³', q: '물 200 g(0.2 kg)이 200 cm³(2×10⁻⁴ m³)일 때 밀도는 몇 kg/m³일까요?', ans: 1000, tol: 0.03, fb: '0.2 kg ÷ 0.0002 m³ = 1000 kg/m³ 예요. (1 g/cm³ = 1000 kg/m³)' },
  };
  const NAMES = { '0|1|-1': '속력', '0|2|0': '넓이', '0|3|0': '부피', '1|-3|0': '밀도', '0|1|0': '길이', '0|0|1': '시간', '1|0|0': '질량' };
  function vecOf(asm) { const v = { kg: 0, m: 0, s: 0 }; const add = (list, sg) => list.forEach((b) => { v[b.t === 'L' ? 'm' : b.t === 'T' ? 's' : 'kg'] += sg; }); add(asm.top, 1); add(asm.bot, -1); return [v.kg, v.m, v.s]; }
  function unitStr(v) {
    const nm = ['kg', 'm', 's'], ex = (n) => (Math.abs(n) === 1 ? '' : sup(Math.abs(n)));
    const pos = [], neg = []; v.forEach((n, i) => { if (n > 0) pos.push(nm[i] + ex(n)); else if (n < 0) neg.push(nm[i] + ex(n)); });
    if (!pos.length && !neg.length) return '(단위 없음)';
    return (pos.length ? pos.join('·') : '1') + (neg.length ? '/' + neg.join('·') : '');
  }
  const BL = PHONE ? { fx: 20, fy: 60, fw: 560, sh: 92, resX: 20, resY: 330, resW: 560, resH: 100, trayY: 450, demoX: 20, demoY: 560, demoW: 560, demoH: 280 } : { fx: 24, fy: 66, fw: 366, sh: 82, resX: 408, resY: 66, resW: 368, resH: 190, trayY: 322, demoX: 408, demoY: 276, demoW: 368, demoH: 276 };
  const topR = () => ({ x: BL.fx, y: BL.fy, w: BL.fw, h: BL.sh }), botR = () => ({ x: BL.fx, y: BL.fy + BL.sh + 22, w: BL.fw, h: BL.sh });
  function layoutBlocks() {
    ['top', 'bot'].forEach((k) => {
      const R = k === 'top' ? topR() : botR(), list = S.asm[k], n = list.length, bw = 96, gap = 16, tot = n * bw + (n - 1) * gap, x0 = R.x + R.w / 2 - tot / 2 + bw / 2;
      list.forEach((b, i) => { b.tx = x0 + i * (bw + gap); b.ty = R.y + R.h / 2; b.w = bw; b.h = R.h - 22; b.free = false; });
    });
  }
  function trayBlock(i) { const w = PHONE ? 170 : 108, gp = PHONE ? 10 : 8; return { x: BL.fx + w / 2 + i * (w + gp), y: BL.trayY + 52, w, h: 64 }; }
  function newBlock(t, x, y) { return { kind: 'blk', t, x, y, tx: x, ty: y, w: 96, h: 60, lift: 0, shake: 0, free: false, where: null }; }
  function blockDrop(b, p) {
    S.drag = null; const A = S.asm, T = topR(), B = botR();
    const inR = (R) => p.x > R.x - 6 && p.x < R.x + R.w + 6 && p.y > R.y - 10 && p.y < R.y + R.h + 10;
    const where = inR(T) ? 'top' : inR(B) ? 'bot' : null;
    S.blocks = S.blocks.filter((x) => x !== b); A.top = A.top.filter((x) => x !== b); A.bot = A.bot.filter((x) => x !== b);
    if (where && A[where].length < 3) { A[where].push(b); S.blocks.push(b); b.where = where; Sound.tick(); }
    else { const src = trayBlock(BASEB.findIndex((q) => q.t === b.t)); b.free = false; b.tx = src.x; b.ty = src.y; b.dying = true; SciSim.tween(b, { lift: 0 }, { duration: 0.2 }); S.dying.push(b); }
    layoutBlocks(); evalAsm();
  }
  function evalAsm() {
    const A = S.asm, v = vecOf(A), tg = TARGET[A.target], ok = A.top.length + A.bot.length > 0 && v.every((n, i) => n === tg.vec[i]);
    if (ok && !A.ok) { A.ok = true; A.okAt = S.clock; A.unitA = 0; Sound.success(); const R = { x: BL.resX + BL.resW / 2, y: BL.resY + BL.resH / 2 }; parts.burst(R.x, R.y, { count: 22, speed: 190, size: 4 }); }
    if (!ok) A.ok = false;
    A.vec = v;
  }
  S.dying = [];
  function resetAsm(target) { const A = S.asm; if (target) A.target = target; A.top = []; A.bot = []; A.ok = false; A.vec = [0, 0, 0]; S.blocks = []; S.dying = []; updateCalc(); }
  function drawBuild(t) {
    ctx.fillStyle = '#f4f8fd'; ctx.fillRect(0, 0, VW, VH);
    const A = S.asm, tg = TARGET[A.target];
    D.text(24, 38, '🎯 만들 양: ', { size: 20, color: '#5d6879', weight: 800, align: 'left' });
    D.label(PHONE ? 190 : 176, 33, tg.name, { bg: '#3867f4', size: 20, align: 'left' });
    // 분수 틀
    [['top', topR()], ['bot', botR()]].forEach(([k, R]) => {
      ctx.fillStyle = A.ok ? '#f0fdf4' : '#fff'; ctx.strokeStyle = A.ok ? '#14a058' : '#94a3b8'; ctx.lineWidth = 2; ctx.setLineDash(A[k].length ? [] : [6, 5]);
      D.shadow(() => rr(R.x, R.y, R.w, R.h, 12).fill(), { blur: 5, y: 2 }); rr(R.x, R.y, R.w, R.h, 12).stroke(); ctx.setLineDash([]);
      if (!A[k].length) D.text(R.x + R.w / 2, R.y + R.h / 2 + 5, k === 'top' ? '위 칸 (분자) — 곱하는 양' : '아래 칸 (분모) — 나누는 양', { size: 14, color: '#94a3b8', weight: 700 });
    });
    const bar = botR().y - 11; ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(BL.fx + 20, bar); ctx.lineTo(BL.fx + BL.fw - 20, bar); ctx.stroke();
    D.text(BL.fx + 4, bar - 8, '나누기', { size: 13, color: '#1b2333', weight: 800, align: 'left' });
    // 결과 카드
    const rx = BL.resX, ry = BL.resY, rw = BL.resW, rh = BL.resH;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(rx, ry, rw, rh, 16).fill(); }, { blur: 10, y: 4 });
    ctx.strokeStyle = A.ok ? '#14a058' : '#cbd5e1'; ctx.lineWidth = 3; rr(rx, ry, rw, rh, 16).stroke();
    const v = A.vec || [0, 0, 0], us = unitStr(v), nm = NAMES[v.join('|')];
    A.unitA = SciSim.approach(A.unitA, 1, 0.016, 8);
    D.text(rx + rw / 2, ry + 30, '블록을 합치면 단위는…', { size: 14, color: '#5d6879', weight: 800 });
    ctx.save(); ctx.translate(rx + rw / 2, ry + (PHONE ? 72 : 88)); const sc2 = A.ok ? 1 + 0.12 * Math.sin(Math.min(1, (S.clock - A.okAt) * 3) * Math.PI) : 1; ctx.scale(sc2, sc2);
    D.text(0, 0, us, { size: PHONE ? 38 : 46, color: A.ok ? '#14a058' : '#1b2333', weight: 800 }); ctx.restore();
    if (!PHONE) { D.label(rx + rw / 2, ry + 140, nm ? ('= ' + nm) + (nm === tg.name ? ' ✔' : '') : '아직 이름 없는 양이에요', { bg: A.ok ? '#14a058' : nm ? '#f59e0b' : '#94a3b8', size: 17 }); if (A.ok) D.text(rx + rw / 2, ry + 174, tg.name + '은(는) 기본량으로 만든 유도량!', { size: 14, color: '#0b6b39', weight: 800 }); }
    else D.label(rx + rw / 2, ry + 90, nm ? '= ' + nm + (A.ok ? ' ✔' : '') : '이름 없는 양', { bg: A.ok ? '#14a058' : '#94a3b8', size: 14 });
    // 트레이
    D.text(BL.fx, BL.trayY + 14, '🧱 기본량 블록 — 끌어서 위·아래 칸에 놓아요', { size: 14, color: '#5d6879', weight: 800, align: 'left' });
    BASEB.forEach((b, i) => { const tb = trayBlock(i); drawBlockShape(tb.x, tb.y, tb.w, tb.h, b, 0); });
    // 블록
    S.blocks.concat(S.dying).forEach((b) => { const bb = BB[b.t], lift = b.lift || 0; ctx.save(); drawBlockShape(b.x, b.y, b.w, b.h, bb, lift, b.shake); ctx.restore(); });
    // 데모
    drawBuildDemo(t);
  }
  function drawBlockShape(x, y, w, h, b, lift, shake) {
    const sc = 1 + (lift || 0) * 0.08; ctx.save(); ctx.translate(x + (shake > 0 ? Math.sin(shake * 40) * 4 : 0), y); ctx.scale(sc, sc);
    D.shadow(() => { ctx.fillStyle = b.col; rr(-w / 2, -h / 2, w, h, 12).fill(); }, { blur: 5 + (lift || 0) * 12, y: 3 + (lift || 0) * 6, color: 'rgba(20,30,60,.3)' });
    ctx.fillStyle = 'rgba(255,255,255,.22)'; rr(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.4, 8).fill();
    D.text(-w / 2 + 22, 8, b.ico, { size: 20, weight: 700 }); D.text(8, -2, b.name, { size: 16, color: '#fff', weight: 800 }); D.text(8, 18, b.unit, { size: 15, color: '#fff', weight: 800, alpha: 0.95 });
    ctx.restore();
  }
  function drawBuildDemo(t) {
    const A = S.asm, tg = TARGET[A.target], x = BL.demoX, y = BL.demoY, w = BL.demoW, h = BL.demoH;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, w, h, 16).fill(); }, { blur: 8, y: 3 }); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; rr(x, y, w, h, 16).stroke();
    ctx.save(); rr(x, y, w, h, 16).clip();
    if (!A.ok) {
      const hint = { speed: '속력: 얼마나 빨리 움직이나?\n(움직인 거리 ÷ 걸린 시간)', area: '넓이: 평면이 얼마나 넓은가?\n(길이를 몇 번 곱할까?)', volume: '부피: 공간을 얼마나 차지하나?\n(길이를 몇 번 곱할까?)', density: '밀도: 같은 부피에 질량이 얼마나?\n(질량을 부피로 나눠요)' }[A.target].split('\n');
      D.text(x + w / 2, y + h / 2 - 14, hint[0], { size: 16, color: '#475569', weight: 800 }); D.text(x + w / 2, y + h / 2 + 16, hint[1], { size: 14, color: '#94a3b8', weight: 700 });
    } else if (A.target === 'speed') {
      const gy = y + h * 0.62, tx0 = x + 30, tx1 = x + w - 30, cyc = (t % 4.2) / 4.2, d = 100 * cyc;
      ctx.fillStyle = '#86efac'; ctx.fillRect(x, gy, w, 14); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; for (let k = 0; k <= 4; k++) { const px = tx0 + (tx1 - tx0) * k / 4; ctx.beginPath(); ctx.moveTo(px, gy); ctx.lineTo(px, gy + 14); ctx.stroke(); D.text(px, gy + 34, (k * 25) + ' m', { size: 13, color: '#166534', weight: 800 }); }
      const px = tx0 + (tx1 - tx0) * cyc; D.sphere(px, gy - 16, 14, '#f26b3a', { shadow: true }); for (let k = 1; k < 4; k++) { ctx.fillStyle = 'rgba(242,107,58,' + 0.3 / k + ')'; ctx.beginPath(); ctx.arc(px - k * 14, gy - 16, 10 - k * 2, 0, 6.3); ctx.fill(); }
      D.label(x + w / 2, y + 36, '시간 ' + (cyc * 12.5).toFixed(1) + ' s  ·  거리 ' + d.toFixed(0) + ' m', { bg: '#1b2333', size: 15 });
      D.text(x + w / 2, y + 74, '속력 = 100 m / 12.5 s = 8 m/s', { size: 17, color: '#14a058', weight: 800 });
    } else if (A.target === 'area') {
      const gw = 4, gh = 3, c = Math.min((w - 80) / gw, (h - 110) / gh), gx = x + w / 2 - c * gw / 2, gy = y + 54;
      for (let i = 0; i < gw; i++) for (let j = 0; j < gh; j++) { const on = (i + j * gw) < ((t * 5) % 14); ctx.fillStyle = on ? '#bfdbfe' : '#eff6ff'; ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; ctx.fillRect(gx + i * c, gy + j * c, c, c); ctx.strokeRect(gx + i * c, gy + j * c, c, c); }
      D.text(x + w / 2, gy - 12, '가로 4 m', { size: 14, color: '#1d4ed8', weight: 800 }); D.text(gx - 10, gy + c * 1.5, '세로 3 m', { size: 14, color: '#1d4ed8', weight: 800, align: 'right' });
      D.text(x + w / 2, y + h - 22, '넓이 = 4 m × 3 m = 12 m²', { size: 17, color: '#14a058', weight: 800 });
    } else if (A.target === 'volume') {
      const s = Math.min(w, h) * 0.2, cx0 = x + w / 2 - s * 1.0, cy0 = y + h / 2 - s * 0.3;
      for (let k = 0; k < 2; k++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const px = cx0 + i * s + k * s * 0.55, py = cy0 + j * s - k * s * 0.5 - 0; ctx.fillStyle = '#bfdbfe'; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1.5; ctx.fillRect(px, py, s, s); ctx.strokeRect(px, py, s, s); }
      D.text(x + w / 2, y + 36, '한 변 2 m인 정육면체', { size: 14, color: '#1d4ed8', weight: 800 }); D.text(x + w / 2, y + h - 22, '부피 = 2 × 2 × 2 = 8 m³', { size: 17, color: '#14a058', weight: 800 });
    } else {
      const cx = x + w / 2, by = y + h * 0.66;
      ctx.fillStyle = '#94a3b8'; rr(cx - 80, by + 12, 160, 10, 5).fill(); rr(cx - 6, by - 30, 12, 44, 3).fill();
      ctx.fillStyle = 'rgba(96,165,250,.75)'; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.5; rr(cx - 36, by - 66 + Math.sin(t * 2) * 1.5, 72, 66, 6).fill(); rr(cx - 36, by - 66 + Math.sin(t * 2) * 1.5, 72, 66, 6).stroke();
      D.text(cx, by - 30, '물', { size: 16, color: '#fff', weight: 800 }); D.text(cx, by - 80, '200 cm³', { size: 14, color: '#1d4ed8', weight: 800 });
      ctx.fillStyle = '#0f172a'; rr(cx + 60, by - 60, 84, 34, 8).fill(); D.text(cx + 102, by - 36, '200 g', { size: 16, color: '#86efac', weight: 800 });
      D.text(x + w / 2, y + 34, '1 cm³마다 물 1 g', { size: 14, color: '#1d4ed8', weight: 800 }); D.text(x + w / 2, y + h - 20, '밀도 = 0.2 kg / 2×10⁻⁴ m³ = 1000 kg/m³', { size: PHONE ? 15 : 16, color: '#14a058', weight: 800 });
    }
    ctx.restore();
  }
  const CALC_TEXT = (k) => TARGET[k].q;
  function updateCalc() { const A = S.asm; $('#calcBox').hidden = !A.ok; $('#calcQ').textContent = TARGET[A.target].q; }
  function checkCalc() {
    const A = S.asm, tg = TARGET[A.target], raw = $('#inCalc').value.trim(); if (!raw) { toast('값을 입력해 주세요', '', 1200); return; }
    const v = num(raw); if (!isFinite(v)) { toast('숫자로 입력해요', '', 1200); return; }
    if (Math.abs(v - tg.ans) <= tg.ans * tg.tol) { A.solved[A.target] = true; Sound.success(); parts.burst(BL.resX + BL.resW / 2, BL.resY + 60, { count: 18, speed: 170, size: 4 }); toast('정답! ' + tg.ans + ' ' + tg.unit, 'good', 2000); }
    else { Sound.fail(); toast(v === 1 && A.target === 'density' ? '1은 g/cm³ 단위의 값이에요. kg/m³로 바꿔 보세요 (×1000).' : tg.fb, 'bad', 3200); }
  }

  /* ======================================================
     화면 4: 스마트 측정
     ====================================================== */
  const PHN = PHONE ? { x: 150, y: 346, w: 300, h: 330 } : { x: 490, y: 8, w: 300, h: 544 };
  const PENDS = [10.1, 10.3, 9.9, 10.2, 10.0, 10.1];
  function periodNow() { return 1.01; }
  function initPhone() {
    const P = S.ph; P.rec = []; P.pend = { state: 'idle', p: 0, n: 0, val: null, ph: 0, k: 0 }; P.ball = { state: 'idle', t: 0, done: false, x: 0, saved: false }; P.temp = { T: 8, heat: false, hist: [], t: 0 }; P.avgOK = false; P.spdOK = false;
    $('#bHeat').textContent = '🔥 물 데우기 켜기';
  }
  function recCount(kind) { return S.ph.rec.filter((r) => r.kind === kind).length; }
  function recordNow() {
    const P = S.ph;
    if (S.sub === 'pend') { if (P.pend.state !== 'done' || P.pend.val == null) { toast('먼저 진자 10번 왕복을 재세요', '', 1500); return; } if (P.pend.saved) { toast('이미 기록했어요. 다시 재 볼까요?', '', 1500); return; } P.rec.push({ kind: 'pend', val: P.pend.val }); P.pend.saved = true; }
    else if (S.sub === 'ball') { if (!P.ball.done) { toast('먼저 공을 굴려 보세요', '', 1500); return; } if (P.ball.saved) { toast('이미 기록했어요', '', 1500); return; } P.rec.push({ kind: 'ball', d: 2.0, t: 1.6 }); P.ball.saved = true; }
    else { P.rec.push({ kind: 'temp', val: Math.round(P.temp.T * 10) / 10 }); P.temp.hist.push({ t: P.temp.t, T: P.temp.T, mark: true }); }
    Sound.success(); parts.burst(PHN.x + PHN.w / 2, PHN.y + PHN.h - 80, { count: 10, speed: 120, size: 3, life: 0.6 });
  }
  function startPend() { const p = S.ph.pend; if (p.state === 'run') return; p.state = 'run'; p.p = 0; p.n = 0; p.saved = false; p.val = null; Sound.click(); }
  function startBall() { const b = S.ph.ball; if (b.state === 'run') return; b.state = 'run'; b.t = 0; b.done = false; b.saved = false; Sound.click(); }
  function stepPhone(dt) {
    const P = S.ph, p = P.pend;
    if (p.state === 'run') { p.p += dt / (RM ? 0.5 : 4.2); p.ph += dt * 2.4; p.n = Math.min(10, Math.floor(p.p * 10)); if (p.p >= 1) { p.state = 'done'; p.val = PENDS[p.k++ % PENDS.length]; p.n = 10; Sound.success(); } }
    else p.ph += dt * 0.0;
    const b = P.ball; if (b.state === 'run') { b.t += dt; if (b.t >= 1.6) { b.t = 1.6; b.state = 'done'; b.done = true; Sound.success(); } }
    const T = P.temp; T.t += dt; T.T += ((T.heat ? 50 : 22) - T.T) * (T.heat ? 0.075 : 0.01) * dt; if (Math.floor(T.t * 2) !== Math.floor((T.t - dt) * 2)) { T.hist.push({ t: T.t, T: T.T }); if (T.hist.length > 400) T.hist.shift(); }
  }
  function drawPhoneScene(t) {
    ctx.fillStyle = '#f4f8fd'; ctx.fillRect(0, 0, VW, VH);
    const P = S.ph, ex = 8, ey = 8, ew = PHONE ? 584 : 470, eh = PHONE ? 330 : 340;
    // 실험 장면
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(ex, ey, ew, eh, 16).fill(); }, { blur: 8, y: 3 });
    ctx.save(); rr(ex, ey, ew, eh, 16).clip();
    if (S.sub === 'pend') {
      const g = ctx.createLinearGradient(0, ey, 0, ey + eh); g.addColorStop(0, '#f8fafc'); g.addColorStop(1, '#e2e8f0'); ctx.fillStyle = g; ctx.fillRect(ex, ey, ew, eh);
      const px = ex + ew / 2, py = ey + 36, len = PHONE ? 230 : 226, th = P.pend.state === 'run' ? 0.36 * Math.cos(P.pend.ph * 2 * Math.PI / 1.01) : 0.0;
      ctx.fillStyle = '#78350f'; rr(px - 42, py - 14, 176, 14, 5).fill(); ctx.fillStyle = '#92400e'; rr(px + 128, py - 14, 12, ey + eh - py + 10, 3).fill();
      const bx = px + Math.sin(th) * len, by = py + Math.cos(th) * len; ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke(); D.sphere(bx, by, 20, '#f59e0b', { shadow: true });
      ctx.strokeStyle = 'rgba(148,163,184,.6)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + len + 30); ctx.stroke(); ctx.setLineDash([]);
      D.text(ex + 18, ey + 30, '⏱ 진자 10번 왕복', { size: 17, color: '#1b2333', weight: 800, align: 'left' });
      D.text(ex + 18, ey + 58, '왕복 ' + P.pend.n + ' / 10 번', { size: 15, color: '#3867f4', weight: 800, align: 'left' });
      D.text(ex + 18, ey + eh - 14, '(스톱워치는 실제보다 빠르게 감아서 보여 줘요)', { size: 13, color: '#94a3b8', weight: 700, align: 'left' });
    } else if (S.sub === 'ball') {
      const g = ctx.createLinearGradient(0, ey, 0, ey + eh); g.addColorStop(0, '#e0f2fe'); g.addColorStop(0.5, '#f1f5f9'); g.addColorStop(0.5, '#d6c4a4'); g.addColorStop(1, '#b89b6c'); ctx.fillStyle = g; ctx.fillRect(ex, ey, ew, eh);
      const fy = ey + eh * 0.72, x0 = ex + 50, ppm = (ew - 130) / 2.4, tt = P.ball.t / 1.6, dist = 2.0 * (1 - Math.pow(1 - tt, 2));
      ctx.fillStyle = '#facc15'; ctx.fillRect(x0 - 3, fy - 30, 6, 60); D.text(x0, fy + 52, '출발', { size: 14, color: '#713f12', weight: 800 });
      ctx.fillStyle = '#fde68a'; rr(x0, fy + 22, ppm * 2.4, 16, 3).fill(); ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1.5; for (let k = 0; k <= 12; k++) { const px = x0 + ppm * k * 0.2; ctx.beginPath(); ctx.moveTo(px, fy + 22); ctx.lineTo(px, fy + 22 + (k % 5 === 0 ? 14 : 8)); ctx.stroke(); if (k % 5 === 0) D.text(px, fy + 66, (k / 5) + ' m', { size: 13, color: '#713f12', weight: 800 }); }
      const bx = x0 + ppm * dist; D.shadow(() => { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(bx, fy + 18, 16, 5, 0, 0, 6.3); ctx.fill(); }, { blur: 4, y: 0 });
      ctx.save(); ctx.translate(bx, fy - 6); ctx.rotate(dist * ppm / 16); D.sphere(0, 0, 18, '#3867f4'); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 11, 0.2, 1.8); ctx.stroke(); ctx.restore();
      D.label(bx, fy - 44, dist.toFixed(2) + ' m', { bg: '#1b2333', size: 14 });
      D.text(ex + 18, ey + 30, '⚾ 공 굴리기', { size: 17, color: '#1b2333', weight: 800, align: 'left' });
    } else {
      const g = ctx.createLinearGradient(0, ey, 0, ey + eh); g.addColorStop(0, '#f1f5f9'); g.addColorStop(1, '#e2e8f0'); ctx.fillStyle = g; ctx.fillRect(ex, ey, ew, eh);
      const cx = ex + ew / 2 - 20, by = ey + eh - 70, bw = 150, bh = 170, T = P.temp.T;
      D.beaker(cx - bw / 2, by - bh, bw, bh, { level: 0.68, liquid: SciSim.color.mix('#60a5fa', '#f87171', clamp((T - 8) / 40, 0, 1)), t, ticks: 6 });
      ctx.fillStyle = '#e2e8f0'; rr(cx - 50, by + 12, 100, 14, 4).fill(); ctx.fillStyle = '#475569'; rr(cx - 60, by + 26, 120, 18, 5).fill();
      if (P.temp.heat) D.flame(cx, by + 12, 38, t);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx + 36, by - bh - 30); ctx.lineTo(cx + 36, by - 40); ctx.stroke(); D.sphere(cx + 36, by - 40, 7, '#ef4444', { gloss: false });
      D.text(ex + 18, ey + 30, '🌡 물의 온도', { size: 17, color: '#1b2333', weight: 800, align: 'left' });
      D.text(ex + 18, ey + eh - 14, P.temp.heat ? '🔥 데우는 중' : '가열 꺼짐', { size: 14, color: P.temp.heat ? '#ea580c' : '#94a3b8', weight: 800, align: 'left' });
    }
    ctx.restore();
    // 기록표
    const ty = PHONE ? PHN.y + PHN.h + 10 : ey + eh + 8, th = VH - ty - 8, tw = ew;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(ex, ty, tw, th, 14).fill(); }, { blur: 8, y: 3 });
    D.text(ex + 14, ty + 26, '📋 기록표', { size: 16, color: '#1b2333', weight: 800, align: 'left' });
    const rows = P.rec.slice(-8);
    if (!rows.length) D.text(ex + tw / 2, ty + th / 2 + 14, '➕ 기록하기를 눌러 값을 모아 보세요', { size: 14, color: '#94a3b8', weight: 700 });
    rows.forEach((r, i) => { const col = i % 2, row = Math.floor(i / 2), x = ex + 14 + col * (tw / 2), y = ty + 54 + row * 24; const txt = r.kind === 'pend' ? '⏱ 진자 10번 ' + r.val.toFixed(1) + ' s' : r.kind === 'ball' ? '⚾ ' + r.d.toFixed(1) + ' m · ' + r.t.toFixed(1) + ' s' : '🌡 ' + r.val.toFixed(1) + ' °C'; D.text(x, y, (P.rec.length - rows.length + i + 1) + '. ' + txt, { size: 14, color: '#1b2333', weight: 800, align: 'left' }); });
    // 스마트폰
    const ph = PHN; ctx.save();
    D.shadow(() => { ctx.fillStyle = '#0f172a'; rr(ph.x, ph.y, ph.w, ph.h, 34).fill(); }, { blur: 16, y: 6, color: 'rgba(0,0,0,.4)' });
    const sx = ph.x + 12, sy = ph.y + 14, sw = ph.w - 24, sh = ph.h - 28;
    ctx.fillStyle = '#f8fafc'; rr(sx, sy, sw, sh, 26).fill(); ctx.save(); rr(sx, sy, sw, sh, 26).clip();
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(sx, sy, sw, 30); D.text(sx + 18, sy + 21, '9:41', { size: 13, color: '#1b2333', weight: 800, align: 'left' }); D.text(sx + sw - 18, sy + 21, '📶 🔋', { size: 12, color: '#1b2333', weight: 800, align: 'right' });
    const cxm = sx + sw / 2;
    if (S.sub === 'pend') {
      D.text(cxm, sy + 62, '스톱워치', { size: 16, color: '#475569', weight: 800 });
      const showV = P.pend.state === 'run' ? P.pend.p * 10.1 : P.pend.val;
      D.text(cxm, sy + 130, showV == null ? '0.0' : showV.toFixed(1), { size: PHONE ? 44 : 52, color: '#0f172a', weight: 800 }); D.text(cxm, sy + 158, 's', { size: 18, color: '#64748b', weight: 800 });
      D.text(cxm, sy + 196, P.pend.state === 'run' ? '재는 중… ' + P.pend.n + ' / 10 왕복' : P.pend.state === 'done' ? '정지! (아직 기록 전)' : '대기 중', { size: 14, color: '#3867f4', weight: 800 });
      D.text(cxm, sy + 232, '기록한 값', { size: 14, color: '#64748b', weight: 800 });
      P.rec.filter((r) => r.kind === 'pend').slice(PHONE ? -3 : -4).forEach((r, i) => D.text(cxm, sy + 258 + i * 24, (i + 1) + '회  ' + r.val.toFixed(1) + ' s', { size: 15, color: '#1b2333', weight: 800 }));
    } else if (S.sub === 'ball') {
      D.text(cxm, sy + 62, 'AR 줄자 + 스톱워치', { size: 16, color: '#475569', weight: 800 });
      const dist = 2.0 * (1 - Math.pow(1 - P.ball.t / 1.6, 2));
      D.text(cxm - 60, sy + 120, dist.toFixed(2), { size: 36, color: '#0f172a', weight: 800 }); D.text(cxm - 60, sy + 146, '거리 (m)', { size: 14, color: '#64748b', weight: 800 });
      D.text(cxm + 62, sy + 120, P.ball.t.toFixed(2), { size: 36, color: '#0f172a', weight: 800 }); D.text(cxm + 62, sy + 146, '시간 (s)', { size: 14, color: '#64748b', weight: 800 });
      D.text(cxm, sy + 196, P.ball.state === 'run' ? '공이 굴러가는 중…' : P.ball.done ? '정지! 2.00 m, 1.60 s' : '대기 중', { size: 14, color: '#3867f4', weight: 800 });
    } else {
      D.text(cxm, sy + 62, '온도 센서', { size: 16, color: '#475569', weight: 800 });
      D.text(cxm, sy + 124, P.temp.T.toFixed(1), { size: PHONE ? 44 : 52, color: SciSim.color.mix('#2563eb', '#dc2626', clamp((P.temp.T - 8) / 40, 0, 1)), weight: 800 }); D.text(cxm, sy + 150, '°C', { size: 18, color: '#64748b', weight: 800 });
      // 그래프
      const gx = sx + 38, gy = sy + 180, gw = sw - 56, gh = PHONE ? 96 : 190;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.fillRect(gx, gy, gw, gh); ctx.strokeRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#e2e8f0'; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(gx, gy + gh * k / 5); ctx.lineTo(gx + gw, gy + gh * k / 5); ctx.stroke(); }
      [0, 25, 50].forEach((v) => D.text(gx - 6, gy + gh - gh * v / 50 + 4, String(v), { size: 12, color: '#64748b', weight: 800, align: 'right' }));
      const H = P.temp.hist, tmax = Math.max(60, P.temp.t), x2 = (tt) => gx + gw * (tt - Math.max(0, P.temp.t - 60)) / 60;
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.beginPath(); let st = false; H.forEach((h) => { if (h.t < P.temp.t - 60) return; const px = x2(h.t), py = gy + gh - gh * clamp(h.T, 0, 50) / 50; st ? ctx.lineTo(px, py) : ctx.moveTo(px, py); st = true; }); ctx.stroke();
      H.filter((h) => h.mark && h.t >= P.temp.t - 60).forEach((h) => D.sphere(x2(h.t), gy + gh - gh * clamp(h.T, 0, 50) / 50, 6, '#3867f4', { gloss: false, outline: '#fff', outlineWidth: 1.5 }));
      D.text(gx + gw / 2, gy + gh + 22, '시간 (최근 60 s)', { size: 12, color: '#64748b', weight: 800 });
      D.text(sx + 14, gy - 6, '°C', { size: 12, color: '#64748b', weight: 800, align: 'left' });
    }
    ctx.restore();
    ctx.restore();
  }
  const penDone = () => S.ph.rec.filter((r) => r.kind === 'pend').length;

  /* ======================================================
     입력 · 컨트롤
     ====================================================== */
  const MODE_LABEL = { units: '🔢 단위의 힘', base: '📏 기본량', build: '🧩 유도량 만들기', phone: '📱 스마트 측정' };
  const SUBS = { units: [['units', '🔢 단위 붙이기'], ['mars', '🚀 화성 궤도선']], base: [['match', '🔗 짝짓기'], ['convert', '🔡 접두어·환산']], phone: [['pend', '⏱ 스톱워치'], ['ball', '⚾ 공 굴리기'], ['temp', '🌡 온도']] };
  const modeSeg = $('#modeSeg'), subSeg = $('#subSeg');
  function buildSub() {
    const list = SUBS[S.mode]; subSeg.innerHTML = '';
    if (!list) { subSeg.hidden = true; return; }
    list.forEach(([k, l]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.sub = k; b.textContent = l; b.className = S.sub === k ? 'on' : ''; b.addEventListener('click', () => { Sound.click(); setMode(S.mode, k); }); subSeg.appendChild(b); });
    subSeg.hidden = false;
  }
  const DEFSUB = { units: 'units', base: 'match', build: '', phone: 'pend' };
  function setMode(m, sub) {
    if (S.mode !== m || (sub && S.sub !== sub)) S.fade = 1;
    S.mode = m; S.sub = sub || DEFSUB[m]; S.drag = null; updateCtl();
  }
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => {
      let ok = c.dataset.modes.split(' ').includes(S.mode) && (!c.dataset.sub || c.dataset.sub === S.sub);
      if (c.id === 'calc2') ok = S.mode === 'phone' && S.showCalc;
      c.hidden = !ok;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    modeSeg.hidden = !(game && game.free); buildSub();
    $$('#tgtSeg button').forEach((b) => b.classList.toggle('on', b.dataset.t === S.asm.target));
    $$('.segmented[data-q]').forEach((sg) => { const qi = +sg.dataset.q; $$('button', sg).forEach((b) => b.classList.toggle('on', S.units.pick[qi] === +b.dataset.i)); });
  }
  $$('.segmented[data-q]').forEach((sg) => $$('button', sg).forEach((b) => b.addEventListener('click', () => { Sound.click(); const qi = +sg.dataset.q; S.units.pick[qi] = +b.dataset.i; S.units.bad[qi] = false; updateCtl(); })));
  $('#bMars').addEventListener('click', marsPlay);
  $('#bResetMatch').addEventListener('click', () => { Sound.click(); initMatch(); });
  const sP = $('#sP'), oP = $('#oP');
  SciSim.bindRange(sP, oP, (v) => { const p = PRE[+v]; return (p[0] || '(없음)') + ' (' + p[1] + ') = ' + p10(p[2]); }, (v) => { S.pre = +v; });
  $('#bConv').addEventListener('click', checkConv);
  $('#inConv').addEventListener('keydown', (e) => { if (e.key === 'Enter') checkConv(); });
  $$('#tgtSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); resetAsm(b.dataset.t); updateCtl(); $('#inCalc').value = ''; }));
  $('#bClear').addEventListener('click', () => { Sound.click(); resetAsm(); });
  $('#bCalc').addEventListener('click', checkCalc);
  $('#inCalc').addEventListener('keydown', (e) => { if (e.key === 'Enter') checkCalc(); });
  $('#bPend').addEventListener('click', startPend);
  $('#bBall').addEventListener('click', startBall);
  $('#bHeat').addEventListener('click', () => { const T = S.ph.temp; T.heat = !T.heat; $('#bHeat').textContent = T.heat ? '⏹ 물 데우기 끄기' : '🔥 물 데우기 켜기'; Sound.click(); });
  $$('.rec-btn').forEach((b) => b.addEventListener('click', recordNow));
  $('#bCalc2').addEventListener('click', () => {
    const P = S.ph, pr = P.rec.filter((r) => r.kind === 'pend'), br = P.rec.find((r) => r.kind === 'ball');
    const avg = pr.length ? pr.reduce((a, r) => a + r.val, 0) / pr.length / 10 : NaN, spd = br ? br.d / br.t : NaN;
    const a = num($('#inAvg').value), v = num($('#inSpd').value); const msgs = [];
    if (isFinite(a) && isFinite(avg) && Math.abs(a - avg) <= 0.012) P.avgOK = true; else msgs.push('평균 주기는 (기록한 시간의 평균) ÷ 10 이에요.');
    if (isFinite(v) && isFinite(spd) && Math.abs(v - spd) <= 0.03) P.spdOK = true; else msgs.push('속력 = 거리 ÷ 시간 = ' + (br ? br.d.toFixed(1) + ' m ÷ ' + br.t.toFixed(1) + ' s' : '공 굴리기 기록 필요') + ' 를 계산해요.');
    if (P.avgOK && P.spdOK) { Sound.success(); toast('두 값이 모두 맞아요!', 'good', 1800); } else { Sound.fail(); toast(msgs.join(' '), 'bad', 3600); }
  });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000); }
  const activeList = () => (S.mode === 'base' && S.sub === 'match' ? S.cards : S.mode === 'build' ? S.blocks : null);
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'build') {
        for (let i = 0; i < 3; i++) { const tb = trayBlock(i); if (Math.abs(p.x - tb.x) <= tb.w / 2 && Math.abs(p.y - tb.y) <= tb.h / 2) { const b = newBlock(BASEB[i].t, tb.x, tb.y); b.w = 96; b.h = 60; S.blocks.push(b); dragStart(b, p, S.blocks); return true; } }
        const b = pickItem(p, S.blocks); if (b) { S.asm.top = S.asm.top.filter((x) => x !== b); S.asm.bot = S.asm.bot.filter((x) => x !== b); dragStart(b, p, S.blocks); layoutBlocks(); evalAsm(); return true; }
        return false;
      }
      const list = activeList(); if (!list) return false;
      const c = pickItem(p, list); if (!c) return false;
      dragStart(c, p, list);
      if (c.slot) { c.slot.card = null; c.slot = null; c.w = MR.cw; c.h = MR.ch - (PHONE ? 8 : 0); }
      return true;
    },
    move(p) { const d = S.drag; if (!d) return; d.c.x = p.x - d.ox; d.c.y = p.y - d.oy; },
    up(p) { const d = S.drag; if (!d) return; const c = d.c; c.x = p.x - d.ox; c.y = p.y - d.oy; if (c.kind === 'card') cardDrop(c, { x: c.x, y: c.y }); else blockDrop(c, { x: p.x, y: p.y }); },
    hover(p) { if (S.mode === 'build') return 'grab'; const l = activeList(); return l && pickItem(p, l) ? 'grab' : 'default'; },
  });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'units') {
      const q = UQ; L1 = '소금'; a = q[0].num + ' ' + (S.units.pick[0] == null ? '?' : q[0].opts[S.units.pick[0]]); L2 = '제한 속도'; b = q[1].num + ' ' + (S.units.pick[1] == null ? '?' : q[1].opts[S.units.pick[1]]); L3 = '시럽'; c = q[2].num + ' ' + (S.units.pick[2] == null ? '?' : q[2].opts[S.units.pick[2]]);
    } else if (S.mode === 'base' && S.sub === 'match') { L1 = '짝지은 기본량'; a = S.slots.filter((s) => s.card).length + ' / 5'; L2 = '기본량 단위'; b = 's · m · kg · A · K'; L3 = ''; c = ''; }
    else if (S.mode === 'base') { const p = PRE[S.pre]; L1 = '접두어'; a = (p[0] || '(없음)') + ' ' + p[1]; L2 = '크기'; b = p10(p[2]); L3 = '푼 문제'; c = S.conv.solved.filter(Boolean).length + ' / 3'; }
    else if (S.mode === 'build') { const A = S.asm, v = A.vec || [0, 0, 0]; L1 = '합친 단위'; a = unitStr(v); L2 = '이 양의 이름'; b = NAMES[v.join('|')] || '이름 없음'; L3 = '만든 양'; c = Object.keys(A.solved).filter((k) => A.solved[k]).length + ' / 4 계산 완료'; }
    else { const P = S.ph; L1 = '기록한 값'; a = P.rec.length + ' 개'; L2 = '진자 주기(평균)'; const pr = P.rec.filter((r) => r.kind === 'pend'); b = pr.length ? (pr.reduce((x, r) => x + r.val, 0) / pr.length / 10).toFixed(3) + ' s' : '—'; L3 = '물의 온도'; c = P.temp.T.toFixed(1) + ' °C'; }
    const key = L1 + a + L2 + b + L3 + c; if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3 || ' '; v3.textContent = c || ' ';
    v3.parentElement.style.visibility = L3 ? 'visible' : 'hidden';
  }

  /* ---------- 단계 · 미션 ---------- */
  function enterLevel(li) {
    if (li === 0) { S.units.pick = [null, null, null]; S.units.bad = [false, false, false]; S.units.marsT = -2; S.units.marsPlay = false; S.units.marsDone = false; S.units.marsPlays = 0; setMode('units', 'units'); }
    else if (li === 1) { initMatch(); S.conv = { idx: 0, solved: [false, false, false], flash: 0, shake: 0 }; $('#inConv').value = ''; updateQ(); setMode('base', 'match'); }
    else if (li === 2) { S.asm.solved = {}; resetAsm('speed'); $('#inCalc').value = ''; setMode('build', ''); }
    else { initPhone(); S.showCalc = false; setMode('phone', 'pend'); }
  }
  function ensure(m, sub) { if (S.mode !== m || (sub && S.sub !== sub)) { if (m === 'base' && !S.slots.length) initMatch(); setMode(m, sub); } }
  const levels = [
    {
      title: '단위의 힘: 숫자만으로는 부족해요', short: '단위의 힘', icon: '🔢', phase: '관찰',
      features: ['units'],
      intro: '<p class="si-q">❓ 탐구 질문: 숫자만 있고 단위가 없으면 무슨 일이 생길까? 수많은 양은 몇 가지 기본량으로 나타낼 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 관찰과 측정(중1 Ⅰ), 속력(중3 Ⅳ), 밀도(중2 Ⅰ)를 배웠어요. 이 값들에는 모두 <b>단위</b>가 붙어 있었죠. 단위가 없으면 어떻게 될까요?</div>' +
        '<p>소금 3, 제한 속도 100, 시럽 5… 단위가 빠진 문장은 뜻이 달라져요. 알맞은 단위를 붙여 보고, 단위를 잘못 써서 우주선을 잃은 실제 사고도 살펴봐요.</p>',
      setup() { enterLevel(0); },
      recap: '단위는 크기를 비교하는 기준이에요. 단위가 없거나 서로 다르면 같은 숫자도 전혀 다른 크기가 돼요.',
      summary: '<ul><li>양의 크기는 <b>숫자 + 단위</b>로 나타내요. 단위가 없으면 크기를 알 수 없어요.</li><li>소금 3 <b>g</b>은 알맞지만 3 kg은 너무 짜요. 제한 속도 100 <b>km/h</b>는 고속 도로, 100 m/s는 360 km/h!</li><li>1999년 <b>화성 기후 궤도선</b>은 한 팀은 lbf·s, 다른 팀은 N·s(1 lbf ≈ 4.45 N)로 계산해 대기권에서 불타 버렸어요. → 단위를 통일해야 해요.</li></ul>',
      missions: [
        {
          title: '단위를 붙여 문장 바로잡기',
          goal: '세 문장의 <b>□에 알맞은 단위</b>를 골라 장면이 자연스러워지게 하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '소금 3 □은 국에 넣는 양, 제한 속도 100 □은 고속 도로, 시럽 5 □은 숟가락으로 먹는 양을 생각해요.',
          manual: true,
          setup() { ensure('units', 'units'); },
          check: () => checkUnits(),
          explain: '소금은 <b>3 g</b>, 제한 속도는 <b>100 km/h</b>, 시럽은 <b>5 mL</b>가 알맞아요. 같은 숫자라도 단위에 따라 크기가 수천~수십만 배 달라져요. 그래서 단위는 크기를 비교하는 <b>기준</b>이에요.',
        },
        {
          type: 'quiz', title: '화성 기후 궤도선의 교훈',
          goal: '1999년 화성 기후 궤도선이 화성 대기권에서 불타 버린 까닭은? (▶ 사고 장면을 보면서 풀어도 좋아요)',
          setup() { ensure('units', 'mars'); },
          choices: ['한 팀은 파운드-힘(lbf), 다른 팀은 뉴턴(N)을 써서 단위를 통일하지 않았기 때문이다', '궤도선이 너무 무거워서 연료가 부족했기 때문이다', '화성의 중력을 계산하지 않았기 때문이다', '지구와 화성의 시계가 서로 달랐기 때문이다'],
          answer: 0,
          feedback: ['', '문제는 연료의 양이 아니라 계산에 쓴 단위였어요.', '중력은 계산에 포함되어 있었어요. 문제는 단위였어요.', '시계의 문제가 아니라 힘의 단위(lbf와 N)가 달랐던 거예요.'],
          explain: '두 팀이 <b>서로 다른 단위</b>(1 lbf ≈ 4.45 N)를 쓰는 바람에 궤도선은 계획보다 훨씬 낮은 고도(약 57 km)로 내려가 대기권에서 불타 버렸어요. 과학에서는 단위를 <b>통일</b>하는 것이 정말 중요해요.',
        },
      ],
    },
    {
      title: '기본량: 몇 가지로 이루어진 세상', short: '기본량', icon: '📏', phase: '탐구',
      features: ['base'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 숫자에는 단위가 꼭 필요하다는 것을 알았어요. 그런데 단위의 종류는 수없이 많아요. 이것들은 몇 가지 <b>기본량</b>에서 나와요.</div>' +
        '<p>초·중학교에서 배운 <b>시간, 길이, 질량, 전류, 온도</b>가 대표적인 기본량이에요. 기본량마다 쓰는 기구와 단위가 정해져 있어요. 짝지어 보고, 단위 앞에 붙는 <b>접두어</b>로 환산도 해 봐요.</div>',
      setup() { enterLevel(1); },
      recap: '기본량: 시간(s) · 길이(m) · 질량(kg) · 전류(A) · 온도(K). 접두어(n, µ, m, k, M, G)로 크고 작은 값을 나타내요.',
      summary: '<table class="mini"><tr><th>기본량</th><th>단위</th><th>기구</th></tr><tr><td>시간</td><td>s (초)</td><td>초시계</td></tr><tr><td>길이</td><td>m (미터)</td><td>자</td></tr><tr><td>질량</td><td>kg</td><td>저울</td></tr><tr><td>전류</td><td>A (암페어)</td><td>전류계</td></tr><tr><td>온도</td><td>K (켈빈)</td><td>온도계</td></tr></table><ul><li>접두어: n 10⁻⁹ · µ 10⁻⁶ · m 10⁻³ · k 10³ · M 10⁶ · G 10⁹</li><li>켈빈 온도 K = 섭씨온도 °C + 273</li><li>그 밖에 물질량(mol), 광도(cd)도 기본량이에요.</li></ul>',
      missions: [
        {
          title: '기본량 5쌍 짝짓기',
          goal: '측정 기구·단위 카드 <b>5장</b>을 알맞은 <b>기본량</b> 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '질량은 저울로 재고 단위는 kg, 온도의 단위는 켈빈(K)이에요.',
          manual: true,
          setup() { ensure('base', 'match'); },
          check() {
            const un = S.slots.filter((s) => !s.card).length; if (un) return '아직 카드가 없는 칸이 <b>' + un + '칸</b> 있어요.';
            const bad = S.slots.filter((s) => s.card.id !== s.q.id); bad.forEach((s) => { if (!s.card.bad) { s.card.bad = true; s.card.shake = 0.5; } });
            if (bad.length) return bad.map((s) => '<b>' + s.q.name + '</b>').join(', ') + ' 칸의 카드를 다시 생각해 보세요.';
            S.cards.forEach((c) => { c.bad = false; }); if (!S.matchOK) { S.matchOK = true; S.slots.forEach((s) => parts.burst(s.x, s.y, { count: 6, speed: 90, size: 3, life: 0.6 })); }
            return true;
          },
          explain: '시간 <b>s</b>, 길이 <b>m</b>, 질량 <b>kg</b>, 전류 <b>A</b>, 온도 <b>K</b>가 기본량의 단위예요. (물질량 mol, 광도 cd까지 모두 7가지) 이 몇 가지 기본량으로 세상의 수많은 양을 나타낼 수 있어요.',
        },
        {
          title: '접두어로 단위 환산하기',
          goal: '<b>🔡 접두어·환산</b> 화면에서 환산 문제 <b>3개</b>를 풀어 보세요. 정답을 입력하고 <b>✔ 정답 확인</b>을 눌러요.',
          hint: 'k(킬로)는 10³, m(밀리)는 10⁻³이에요. 켈빈 온도는 섭씨온도에 273을 더해요. 접두어 슬라이더를 움직여 보세요.',
          setup() { ensure('base', 'convert'); showHint('🔡 환산 문제를 풀어 보세요', 5000); },
          check: () => S.conv.solved.every(Boolean), hold: 0.4,
          status: () => S.conv.solved.map((s, i) => mark(s) + ' 문제 ' + (i + 1)).join(' · '),
          explain: '2.5 km = 2.5 × 10³ m = <b>2500 m</b>, 500 mg = 500 × 10⁻⁶ kg = <b>5×10⁻⁴ kg</b>, 25 °C = 25 + 273 = <b>298 K</b>이에요. 접두어를 알면 아주 큰 값과 작은 값도 같은 단위로 나타낼 수 있어요.',
        },
        {
          type: 'quiz', title: '기본량이 아닌 것',
          goal: '다음 중 <b>기본량이 아닌</b> 것은?',
          setup() { ensure('base', 'convert'); },
          choices: ['시간', '길이', '속력', '질량'],
          answer: 2,
          feedback: ['시간은 기본량이에요. 단위는 초(s)예요.', '길이는 기본량이에요. 단위는 미터(m)예요.', '', '질량은 기본량이에요. 단위는 킬로그램(kg)이에요.'],
          explain: '<b>속력</b>은 길이를 시간으로 나눈 양(m/s)이라서 기본량이 아니라 기본량으로 만든 <b>유도량</b>이에요. 부피(m³), 밀도(kg/m³)도 마찬가지예요.',
        },
      ],
    },
    {
      title: '유도량: 기본량으로 만든 새로운 양', short: '유도량', icon: '🧩', phase: '분석',
      features: ['build'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 시간·길이·질량·전류·온도가 기본량이고, 속력과 부피는 기본량이 아니라고 했어요. 그럼 속력이나 부피는 어디서 왔을까요?</div>' +
        '<p>기본량 블록을 <b>곱하고 나누어</b> 새로운 양을 만들어 봐요. 블록을 합치면 <b>단위도 함께 합쳐져서</b> 새 단위가 돼요. 이렇게 기본량으로부터 도출된 양을 <b>유도량</b>이라고 해요.</p>',
      setup() { enterLevel(2); },
      recap: '속력(m/s) = 길이 ÷ 시간, 넓이(m²) = 길이², 부피(m³) = 길이³, 밀도(kg/m³) = 질량 ÷ 부피. 단위도 함께 만들어져요.',
      summary: '<table class="mini"><tr><th>유도량</th><th>만드는 법</th><th>단위</th></tr><tr><td>속력</td><td>길이 ÷ 시간</td><td>m/s</td></tr><tr><td>넓이</td><td>길이 × 길이</td><td>m²</td></tr><tr><td>부피</td><td>길이 × 길이 × 길이</td><td>m³</td></tr><tr><td>밀도</td><td>질량 ÷ 부피</td><td>kg/m³</td></tr></table><ul><li>1 L = 10⁻³ m³ = 1000 cm³ · 물의 밀도 1000 kg/m³ = 1 g/cm³</li><li>72 km/h = 20 m/s (÷ 3.6)</li><li>농도(질량 ÷ 부피, g/L)도 유도량이에요.</li></ul>',
      missions: [
        {
          title: '속력 만들기',
          goal: '<b>속력</b>을 만드세요. 블록을 위·아래 칸에 놓아 단위가 <b>m/s</b>가 되게 한 뒤, 오른쪽 문제의 값을 계산해 입력하세요.',
          hint: '속력 = 움직인 거리 ÷ 걸린 시간이에요. 위 칸에는 길이, 아래 칸에는 시간!',
          setup() { ensure('build'); if (S.asm.target !== 'speed') { resetAsm('speed'); updateCtl(); } },
          check: () => !!S.asm.solved.speed && S.asm.target === 'speed' && S.asm.ok, hold: 0.5,
          status: () => mark(S.asm.target === 'speed' && S.asm.ok) + ' 단위 m/s 만들기 · ' + mark(!!S.asm.solved.speed) + ' 계산 (100 m ÷ 12.5 s)',
          explain: '길이(m) ÷ 시간(s) = <b>m/s</b>예요. 100 m를 12.5 s에 달렸다면 속력은 100 ÷ 12.5 = <b>8 m/s</b>예요. 단위도 기본량의 단위 두 개가 합쳐져서 만들어졌어요.',
        },
        {
          title: '밀도 만들기',
          goal: '<b>🎯 만들 양</b>을 <b>밀도</b>로 바꾸고, 블록으로 단위가 <b>kg/m³</b>가 되게 만든 뒤 계산해 입력하세요.',
          hint: '밀도 = 질량 ÷ 부피예요. 부피는 길이 × 길이 × 길이이므로 아래 칸에 길이 블록 3개!',
          setup() { ensure('build'); if (S.asm.target !== 'density') { resetAsm('density'); updateCtl(); $('#inCalc').value = ''; } },
          check: () => !!S.asm.solved.density && S.asm.target === 'density' && S.asm.ok, hold: 0.5,
          status: () => mark(S.asm.target === 'density' && S.asm.ok) + ' 단위 kg/m³ 만들기 · ' + mark(!!S.asm.solved.density) + ' 계산 (0.2 kg ÷ 2×10⁻⁴ m³)',
          explain: '질량(kg) ÷ [길이 × 길이 × 길이](m³) = <b>kg/m³</b>예요. 물 200 g이 200 cm³이면 밀도는 1 g/cm³ = <b>1000 kg/m³</b>이에요. 기본량 3개가 모두 쓰여 밀도가 만들어져요.',
        },
        {
          type: 'quiz', title: '유도량의 단위',
          goal: '<b>1 g/cm³</b>를 kg/m³로 바꾸면 얼마일까요? (1 g = 10⁻³ kg, 1 cm³ = 10⁻⁶ m³)',
          setup() { ensure('build'); },
          choices: ['1 kg/m³', '10 kg/m³', '1000 kg/m³', '10⁶ kg/m³'],
          answer: 2,
          feedback: ['g을 kg으로, cm³을 m³으로 바꾸면 값이 달라져요.', 'cm³을 m³으로 바꾸면 10⁻⁶이에요. 분모가 10⁻⁶이면 값은 10⁶배 커져요.', '', 'g → kg은 10⁻³배(1000분의 1)라서 최종값은 10⁶이 아니라 10³배예요.'],
          explain: '1 g/cm³ = 10⁻³ kg ÷ 10⁻⁶ m³ = <b>10³ kg/m³ = 1000 kg/m³</b>이에요. 단위를 바꿀 때는 기본량 단위(kg, m)로 하나씩 바꾸면 틀리지 않아요.',
        },
      ],
    },
    {
      title: '스마트 기기로 측정하고 분석하기', short: '스마트 측정', icon: '📱', phase: '적용',
      features: ['phone'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 속력 같은 유도량은 길이와 시간 같은 기본량을 측정해서 구한다는 것을 알았어요.</div>' +
        '<p>스마트폰에는 시간, 거리, 온도를 재는 <b>센서 앱</b>이 있어요. 진자의 주기, 공의 속력, 물의 온도를 직접 재서 기록하고 <b>분석</b>해 봐요. 한 번만 재면 값이 조금씩 달라질 수 있으니 여러 번 재요!</p>',
      setup() { enterLevel(3); },
      recap: '측정값은 조금씩 달라서 여러 번 재어 평균을 쓰고, 유도량(주기·속력)은 측정한 기본량으로 계산해요.',
      summary: '<ul><li>진자 10번 왕복 시간 3회 평균 → <b>평균 ÷ 10 = 주기</b> (예: 10.1 s → 1.01 s)</li><li>공의 속력 = 거리 ÷ 시간 = 2.0 m ÷ 1.6 s = <b>1.25 m/s</b></li><li>물의 온도는 시간에 따라 변해요. 센서는 값을 그래프로 보여 줘요.</li><li>한 번만 재면 우연한 오차가 있을 수 있어서 <b>여러 번 재어 평균</b>을 써요.</li></ul>',
      missions: [
        {
          title: '센서 앱으로 측정하고 기록하기',
          goal: '<b>스톱워치</b>로 진자의 10번 왕복 시간을 <b>3번</b> 재어 기록하고, <b>공 굴리기</b>를 <b>1번</b>, <b>온도</b>는 찬물일 때와 데운 뒤 <b>2번</b> 기록하세요.',
          hint: '각 앱에서 측정(재기)을 한 뒤 ➕ 기록하기를 눌러요. 온도는 🔥 데우기를 켜 두고 물이 따뜻해질 때까지 기다려요(약 20초).',
          setup() { ensure('phone', 'pend'); },
          check: () => penDone() >= 3 && recCount('ball') >= 1 && S.ph.rec.some((r) => r.kind === 'temp' && r.val <= 15) && S.ph.rec.some((r) => r.kind === 'temp' && r.val >= 30), hold: 0.4,
          status: () => mark(penDone() >= 3) + ' 진자 ' + penDone() + '/3 · ' + mark(recCount('ball') >= 1) + ' 공 ' + recCount('ball') + '/1 · ' + mark(S.ph.rec.some((r) => r.kind === 'temp' && r.val <= 15)) + ' 찬물 · ' + mark(S.ph.rec.some((r) => r.kind === 'temp' && r.val >= 30)) + ' 따뜻한 물',
          explain: '스마트 기기의 센서로 <b>시간·길이·온도</b>라는 기본량을 쉽게 측정했어요. 진자를 세 번 쟀더니 값이 10.1 s, 10.3 s, 9.9 s로 조금씩 달랐죠? 이런 차이는 측정할 때 늘 생겨요.',
        },
        {
          title: '평균과 속력 구하기',
          goal: '기록표를 분석해 진자의 <b>평균 주기</b>(s)와 공의 <b>속력</b>(m/s)을 구해 입력하고 <b>✔ 계산 확인</b>을 누르세요.',
          hint: '평균 주기 = (세 번의 10번 왕복 시간의 평균) ÷ 10, 공의 속력 = 거리 ÷ 시간이에요.',
          setup() { S.showCalc = true; ensure('phone'); updateCtl(); },
          check: () => S.ph.avgOK && S.ph.spdOK, hold: 0.4,
          status: () => mark(S.ph.avgOK) + ' 평균 주기 · ' + mark(S.ph.spdOK) + ' 공의 속력',
          explain: '진자 10번 왕복 시간 3회의 평균은 (10.1 + 10.3 + 9.9) ÷ 3 = 10.1 s이고, 1번 왕복(주기)은 <b>1.01 s</b>예요. 공의 속력은 2.0 m ÷ 1.6 s = <b>1.25 m/s</b>로, 길이와 시간(기본량)에서 계산한 유도량이에요.',
        },
        {
          type: 'quiz', title: '여러 번 재어 평균을 쓰는 까닭',
          goal: '측정을 <b>여러 번 하여 평균</b>을 구해 쓰는 까닭은?',
          setup() { ensure('phone'); },
          choices: ['측정할 때마다 생기는 우연한 오차의 영향을 줄이기 위해서', '측정값이 항상 똑같이 나오기 때문에', '단위를 바꾸기 위해서', '평균이 항상 정확한 참값이기 때문에'],
          answer: 0,
          feedback: ['', '측정값은 매번 조금씩 달랐어요(10.1, 10.3, 9.9 s). 그래서 평균을 써요.', '평균을 구하는 것과 단위를 바꾸는 것은 관계없어요.', '평균이 참값이라고는 할 수 없어요. 다만 한 번 잰 값보다 참값에 가까워져요.'],
          explain: '측정값에는 조금씩 다른 <b>우연한 오차</b>가 섞여요. 여러 번 재어 <b>평균</b>을 내면 이런 오차의 영향이 줄어들어 참값에 더 가까워져요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-base-quantity', mount: '#game', badge: '단위 박사', homeHref: '../../index.html#h1a',
    featureLabels: { units: '🔢 단위 고르기 · 🚀 화성 궤도선', base: '📏 기본량 짝짓기 · 🔡 접두어 환산', build: '🧩 기본량 블록 조립', phone: '📱 스마트폰 센서 앱 3종' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  initMatch(); initPhone(); resetAsm('speed'); updateQ(); updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t; S.dt = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    stepItems(S.cards, dt); stepItems(S.blocks, dt); stepItems(S.dying, dt);
    S.dying = S.dying.filter((b) => !(Math.abs(b.x - b.tx) < 3 && Math.abs(b.y - b.ty) < 3));
    stepMars(dt); stepPhone(dt); parts.update(dt);
    if (S.conv.shake > 0) S.conv.shake = Math.max(0, S.conv.shake - dt);
    const cb = $('#calcBox'); if (cb.hidden === S.asm.ok) updateCalc();
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'units') { if (S.sub === 'units') drawUnits(t, dt); else drawMars(t, dt); }
    else if (S.mode === 'base') { if (S.sub === 'match') drawMatch(t); else drawConvert(t); }
    else if (S.mode === 'build') drawBuild(t);
    else drawPhoneScene(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setMode, enterLevel, marsPlay, checkConv, startPend, startBall, recordNow, resetAsm, TARGET, BASEB, trayBlock, BL, MR, QTY,
    pickUnits(a) { S.units.pick = a.slice(); updateCtl(); },
    solveMatch(right) { S.slots.forEach((s) => { s.card = null; }); S.cards.forEach((c) => { const s = S.slots.find((x) => x.q.id === c.id); const t2 = right === false ? S.slots[(S.slots.indexOf(s) + 1) % 5] : s; t2.card = c; c.slot = t2; c.x = c.tx = t2.x + t2.w / 2 - 82; c.y = c.ty = t2.y; c.w = 150; c.h = t2.h - 14; }); },
    addBlocks(top, bot) { resetAsm(); [['top', top], ['bot', bot]].forEach(([k, arr]) => arr.forEach((t) => { const b = newBlock(t, 0, 0); b.where = k; S.asm[k].push(b); S.blocks.push(b); })); layoutBlocks(); S.blocks.forEach((b) => { b.x = b.tx; b.y = b.ty; }); evalAsm(); updateCalc(); },
    setTarget(k) { resetAsm(k); updateCtl(); },
    setHeat(v) { S.ph.temp.heat = v; $('#bHeat').textContent = v ? '⏹ 물 데우기 끄기' : '🔥 물 데우기 켜기'; },
    setTemp(v) { S.ph.temp.T = v; },
    finish(kind) { const P = S.ph; if (kind === 'pend') { P.pend.p = 1; } if (kind === 'ball') { P.ball.t = 1.59; } },
  };
})();
