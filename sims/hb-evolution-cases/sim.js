(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const L = (a, b) => (PHONE ? b : a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const ease = SciSim.ease;
  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* 받침 유무에 따라 조사 고르기: josa('핵형', '은', '는') */
  function josa(w, a, b) { const ch = String(w).charCodeAt(String(w).length - 1); if (ch < 0xAC00 || ch > 0xD7A3) return b; return ((ch - 0xAC00) % 28) ? a : b; }

  const BG = '#f3f1e8';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FONT_EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function E(ch, x, y, size, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = size + 'px ' + FONT_EMO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; ctx.fillText(ch, 0, 0); ctx.restore();
  }
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '', sp = -1;
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; sp = -1; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) {
        if (sp > 0 && ch !== ' ') { out.push(line.slice(0, sp).trimEnd()); line = line.slice(sp + 1) + ch; } else { out.push(line); line = ch.trim() === '' ? '' : ch; }
        sp = line.lastIndexOf(' ');
      } else { line = t; if (ch === ' ') sp = line.length - 1; }
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700);
    ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
    return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function bgFill(top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  /* 염색 분체 한 가닥 (세로 막대): 가운데 y를 기준으로 len 길이, 동원체는 위에서 cen 비율 */

  /* 순서 고르기 (DOM): 보기 버튼을 누른 순서대로 번호 칩이 쌓여요 */
  function makePicker(root, items, onChange) {
    let seq = [];
    root.innerHTML = '';
    const pool = document.createElement('div'); pool.className = 'pk-pool';
    const row = document.createElement('div'); row.className = 'pk-seq';
    const rst = document.createElement('button'); rst.type = 'button'; rst.className = 'btn btn-sm pk-reset'; rst.textContent = '↺ 다시 고르기';
    root.append(pool, row, rst);
    const btns = items.map((it) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pk-item'; b.innerHTML = it.html; b.dataset.id = it.id;
      b.addEventListener('click', () => { if (seq.indexOf(it.id) >= 0) return; seq.push(it.id); Sound.click(); render(); onChange && onChange(seq.slice()); });
      pool.appendChild(b); return b;
    });
    function render() {
      row.innerHTML = '';
      seq.forEach((id, i) => {
        const it = items.find((x) => x.id === id);
        const c = document.createElement('button'); c.type = 'button'; c.className = 'pk-chip'; c.innerHTML = '<b>' + (i + 1) + '</b> ' + it.html; c.title = '눌러서 빼기';
        c.addEventListener('click', () => { seq = seq.slice(0, i); Sound.click(); render(); onChange && onChange(seq.slice()); });
        row.appendChild(c);
      });
      btns.forEach((b) => { b.disabled = seq.indexOf(b.dataset.id) >= 0; });
      row.classList.remove('bad'); row.classList.remove('ok');
    }
    rst.addEventListener('click', () => { seq = []; Sound.click(); render(); onChange && onChange([]); });
    render();
    return { get seq() { return seq.slice(); }, set(a) { seq = a.slice(); render(); onChange && onChange(seq.slice()); }, reset() { seq = []; render(); onChange && onChange([]); }, mark(cls) { row.classList.remove('bad', 'ok'); if (cls) row.classList.add(cls); } };
  }

  /* =========================================================
     고등학교 생명과학 Ⅲ. 생명의 연속성과 다양성 - 자연선택과 진화 사례 (단원 39, 5차시)
     성취기준 [12생과03-03] 생물 진화의 원리를 이해하고, 생물 진화 연구의 다양한 사례를 조사하여 협력적으로 소통할 수 있다. (사례 부분)
     ① 실험: 모의실험(집단의 형질 비율)  ② 분석: 후추나방  ③ 분석: 항생제 내성균  ④ 조사: 핀치 부리와 공통 틀
     (하디-바인베르크 법칙과 대립유전자 빈도는 다루지 않고 "유리한 형질을 가진 개체의 비율"만 사용)
     ========================================================= */
  const S = { mode: 'sim', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { sim: '🧪 자연선택 모의실험', moth: '🐦 후추나방과 새', mothg: '📈 어두운색 나방의 비율', bac: '🦠 배양 접시와 항생제', finch: '🐤 핀치의 부리 깊이', frame: '🧩 네 사례의 공통 틀' };
  const rr = (a, b) => a + Math.random() * (b - a);
  const pct = (v, d) => (v * 100).toFixed(d == null ? 0 : d) + ' %';
  const f2 = (v) => v.toFixed(2);
  const A_COL = '#f59e0b', B_COL = '#3b82f6';

  /* 선 그래프 공통: 축과 눈금 */
  function axes(r, o) {
    ctx.save(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.3;
    (o.yt || []).forEach((v) => { const y = r.y + r.h - (v - o.y0) / (o.y1 - o.y0) * r.h; ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); ctx.stroke(); T(r.x - 8, y + 4.5, o.yf ? o.yf(v) : String(v), 12.5, '#64748b', 'right', 800); });
    (o.xt || []).forEach((v) => { const x = r.x + (v - o.x0) / (o.x1 - o.x0) * r.w; ctx.beginPath(); ctx.moveTo(x, r.y + r.h); ctx.lineTo(x, r.y + r.h + 5); ctx.strokeStyle = '#94a3b8'; ctx.stroke(); T(x, r.y + r.h + 20, o.xf ? o.xf(v) : String(v), 12.5, '#64748b', 'center', 800); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y + r.h); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.stroke(); ctx.restore();
    return { X: (v) => r.x + (v - o.x0) / (o.x1 - o.x0) * r.w, Y: (v) => r.y + r.h - clamp((v - o.y0) / (o.y1 - o.y0), 0, 1) * r.h };
  }
  /* 작은 곤충 (모의실험의 개체) */
  function bug(x, y, r, col, a, sc) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = a;
    ctx.strokeStyle = C.shade(col, -0.45); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.8); ctx.lineTo(-r * 0.7, -r * 1.35); ctx.moveTo(r * 0.3, -r * 0.8); ctx.lineTo(r * 0.7, -r * 1.35); ctx.stroke();
    D.sphere(0, 0, r, col, { gloss: true });
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-0.7, -r * 0.6, 1.4, r * 1.4);
    ctx.restore();
  }

  /* =========================================================
     ① 모의실험: 집단 100마리, 형질 A의 비율 p
     ========================================================= */
  const HB = L({ x: 14, y: 46, w: 392, h: 394 }, { x: 6, y: 34, w: 468, h: 424 });
    const IP = L({ x: 418, y: 292, w: 368, h: 148 }, { x: 6, y: 0, w: 0, h: 0 });
  const TB = L({ x: 14, y: 450, w: 772, h: 98 }, { x: 6, y: 624, w: 468, h: 70 });
  const CELL = 36, G0 = L([HB.x + 16, HB.y + 36], [HB.x + (HB.w - 360) / 2, HB.y + 62]);
  const cellXY = (i) => [G0[0] + (i % 10) * CELL + CELL / 2, G0[1] + Math.floor(i / 10) * CELL + CELL / 2];
  const PERM = (function () { const r = mulberry(7), a = Array.from({ length: 100 }, (_, i) => i); for (let i = 99; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; })();
  const SIM_TYPES = { var: '변이 있음 · 유전됨', none: '변이 없음 (모두 A)', noinh: '변이 있음 · 유전 안 됨' };
  const SB = 0.4;
  const simSA = () => Math.round((SB + S.sim.delta) * 100) / 100;
  const nextP = (q) => {
    if (q.type === 'noinh') return 0.5;
    const sA = simSA(), num = sA * q.p, den = sA * q.p + SB * (1 - q.p);
    return den > 0 ? num / den : q.p;
  };
  function layoutSlots() {
    const q = S.sim, nA = Math.round(q.p * 100);
    q.slots = PERM.map((rank, i) => ({ i, type: rank < nA ? 'A' : 'B', a: 1, sc: 1, ph: Math.random() * TAU, st: 'alive', t0: 0, nt: null }));
    // 같은 칸 번호 i에 PERM[i] 순위의 형질을 붙임 (A 칸이 섞여 보이도록)
  }
  function resetSim(full) {
    const prev = S.sim;
    const type = prev && !full ? prev.type : 'var', delta = prev ? prev.delta : 0.4;
    const ghost = prev && prev.hist.length > 1 ? prev.hist.slice() : prev ? prev.ghost : null;
    S.sim = { type, delta, p: type === 'none' ? 1 : 0.5, g: 0, hist: [type === 'none' ? 1 : 0.5], ghost, phase: 'idle', t: 0, good: prev ? 0 : 0, seenNone: prev ? prev.seenNone : false, seenNoInh: prev ? prev.seenNoInh : false, plan: null, hawk: -1, slots: [] };
    layoutSlots(); updateCtl && updateCtl();
  }
  function simStep() {
    const q = S.sim; if (q.phase !== 'idle' || q.g >= 10) return;
    const p2 = nextP(q), sA = simSA(), nA = Math.round(q.p * 100), nB = 100 - nA, nA2 = Math.round(p2 * 100);
    const A = q.slots.filter((s) => s.type === 'A'), B = q.slots.filter((s) => s.type === 'B');
    const shuf = (a) => a.slice().sort(() => Math.random() - 0.5);
    const dieA = shuf(A).slice(0, Math.round(nA * (1 - sA))), dieB = shuf(B).slice(0, Math.round(nB * (1 - SB)));
    // 칸의 위치 순서에 따라 새가 훑고 지나가는 시각을 정해요
    const die = dieA.concat(dieB); die.forEach((s) => { const [x, y] = cellXY(s.i); s.st = 'doomed'; s.t0 = 0.3 + 1.2 * clamp(((x - G0[0]) / 360 + (y - G0[1]) / 360) / 2, 0, 1) + Math.random() * 0.15; });
    const surv = q.slots.filter((s) => s.st === 'alive'), sAn = surv.filter((s) => s.type === 'A').length, sBn = surv.length - sAn;
    let oA = clamp(nA2 - sAn, 0, 100 - surv.length), oB = 100 - surv.length - oA;
    const kids = die.slice(); // 빈 칸(죽은 개체의 자리)에 새끼가 태어나요
    kids.forEach((s, k) => { s.nt = k < oA ? 'A' : 'B'; });
    // 개수 보정: 최종 A 개체 수가 round(100 p')와 같도록 새끼부터 색을 바꿔요
    let cntA = sAn + kids.filter((s) => s.nt === 'A').length;
    for (let k = 0; k < kids.length && cntA !== nA2; k++) { if (cntA < nA2 && kids[k].nt === 'B') { kids[k].nt = 'A'; cntA++; } else if (cntA > nA2 && kids[k].nt === 'A') { kids[k].nt = 'B'; cntA--; } }
    q.plan = { p2, nA2, sAn, sBn, deadA: dieA.length, deadB: dieB.length, kids: kids.length };
    q.phase = 'select'; q.t = 0; q.hawk = 0; Sound.click();
    if (q.type === 'none' && sA >= 0) q.seenNone = true;
    if (q.type === 'noinh' && q.delta >= 0.2) q.seenNoInh = true;
    q.good = q.type === 'var' && q.delta > 0 ? q.good + 1 : 0;
    updateCtl();
  }
  function stepSim(dt) {
    const q = S.sim; if (!q) return;
    q.slots.forEach((s) => { s.ph += dt * 2; });
    if (q.phase === 'idle') return;
    q.t += dt;
    if (q.phase === 'select') {
      q.hawk = clamp(q.t / 1.7, 0, 1);
      q.slots.forEach((s) => {
        if (s.st === 'doomed' && q.t >= s.t0) { s.st = 'dying'; const [x, y] = cellXY(s.i); parts.burst(x, y, { count: 5, colors: [s.type === 'A' ? A_COL : B_COL, '#fff'], speed: 70, size: 2.4, life: 0.45, gravity: 120, shape: 'circle' }); }
        if (s.st === 'dying') { s.a = SciSim.approach(s.a, 0, dt, 9); s.sc = SciSim.approach(s.sc, 0.3, dt, 9); if (s.a < 0.03) { s.st = 'dead'; s.a = 0; } }
      });
      if (q.t >= 1.9 && !q.slots.some((s) => s.st === 'doomed' || s.st === 'dying')) { q.phase = 'breed'; q.t = 0; q.hawk = -1; q.slots.forEach((s) => { if (s.st === 'dead') { s.bt = 0.1 + Math.random() * 0.8; } }); }
    } else if (q.phase === 'breed') {
      let waiting = 0;
      q.slots.forEach((s) => {
        if (s.st === 'dead') { if (q.t >= s.bt) { s.st = 'born'; s.type = s.nt; s.a = 0; s.sc = 0.2; const [x, y] = cellXY(s.i); parts.burst(x, y, { count: 4, colors: [s.type === 'A' ? A_COL : B_COL, '#fff'], speed: 50, size: 2, life: 0.4, gravity: -30 }); } else waiting++; }
        if (s.st === 'born') { s.a = SciSim.approach(s.a, 1, dt, 8); s.sc = SciSim.approach(s.sc, 1, dt, 9); if (s.a > 0.97 && s.sc > 0.97) { s.st = 'alive'; s.a = 1; s.sc = 1; } }
      });
      if (q.t >= 1.2 && waiting === 0 && q.slots.every((s) => s.st === 'alive')) {
        q.g++; q.p = q.plan.p2; q.hist.push(q.p); q.phase = 'idle'; q.plan = null; Sound.success();
        updateCtl();
      }
    }
  }
  const simA = () => S.sim.slots.filter((s) => s.type === 'A' && s.st !== 'dead').length;
  function simPopA() { return Math.round(S.sim.p * 100); }
  function drawSim(dt, t) {
    const q = S.sim;
    bgFill('#f4f1e6', '#eaf1ea');
    T(HB.x, L(30, 22), '🧪 집단 100마리의 한 세대씩', L(17, 15), '#5b4630', 'left', 800);
    panel(HB.x, HB.y, HB.w, HB.h, 18, '#fffdf6');
    // 칸 배경
    ctx.save(); D.roundRect(HB.x + 4, HB.y + 4, HB.w - 8, HB.h - 8, 15); ctx.clip();
    const bgG = ctx.createLinearGradient(0, HB.y, 0, HB.y + HB.h); bgG.addColorStop(0, '#f3efdc'); bgG.addColorStop(1, '#e2ebcf'); ctx.fillStyle = bgG; ctx.fillRect(HB.x, HB.y, HB.w, HB.h);
    ctx.restore();
    T(HB.x + 14, HB.y + 24, '세대 ' + q.g, L(16, 15), '#26324a', 'left', 800);
    T(HB.x + HB.w - 14, HB.y + 24, 'A 비율 ' + f2(q.p) + ' · A ' + simPopA() + '마리', L(15, 14), '#b45309', 'right', 800);
    // 개체들
    q.slots.forEach((s) => {
      if (s.st === 'dead' && s.a <= 0) return;
      const [x, y] = cellXY(s.i), bob = RM ? 0 : Math.sin(s.ph) * 1.4;
      bug(x + (RM ? 0 : Math.cos(s.ph * 0.7) * 1.6), y + bob, 10.5, s.type === 'A' ? A_COL : B_COL, s.a, s.sc);
    });
    // 새(선택압) 지나감
    if (q.phase === 'select' && q.hawk >= 0) {
      const k = q.hawk, hx = G0[0] - 20 + k * 400, hy = G0[1] - 10 + k * 380 + Math.sin(k * 14) * 8;
      ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.ellipse(hx, hy + 22, 28, 9, 0, 0, TAU); ctx.fill(); ctx.restore();
      E('🦅', hx, hy, 40);
      D.label(HB.x + HB.w / 2, HB.y + HB.h - 16, '환경(선택압)이 작용해요', { bg: '#7c3aed', size: 14 });
    } else if (q.phase === 'breed') D.label(HB.x + HB.w / 2, HB.y + HB.h - 16, '살아남은 개체가 번식해요', { bg: '#15803d', size: 14 });
    else if (q.g === 0 && !PHONE) T(HB.x + HB.w / 2, HB.y + HB.h - 12, '▶ 다음 세대를 눌러 한 세대씩 진행해요', 13.5, '#64748b', 'center', 800);
    // 그래프
    panel(PHONE ? 6 : 418, PHONE ? 466 : 46, PHONE ? 468 : 368, PHONE ? 150 : 236, 16);
    const gx = PHONE ? { x: 52, y: 498, w: 400, h: 84 } : { x: 466, y: 88, w: 300, h: 150 };
    T(PHONE ? 18 : 432, PHONE ? 488 : 70, 'A 형질의 비율', 15, '#26324a', 'left', 800);
    const ax = axes(gx, { x0: 0, x1: 10, y0: 0, y1: 1, xt: [0, 2, 4, 6, 8, 10], yt: [0, 0.5, 1], yf: (v) => v.toFixed(1), xf: (v) => String(v) });
    T(gx.x + gx.w, gx.y + gx.h + (PHONE ? 34 : 36), '세대', 12.5, '#64748b', 'right', 800);
    if (q.ghost && q.ghost.length > 1) { ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); q.ghost.forEach((v, k) => (k ? ctx.lineTo(ax.X(k), ax.Y(v)) : ctx.moveTo(ax.X(k), ax.Y(v)))); ctx.stroke(); ctx.restore(); T(gx.x + gx.w - 4, gx.y + 14, '점선: 이전 실행', 12, '#64748b', 'right', 700); }
    ctx.save(); ctx.strokeStyle = A_COL; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.beginPath(); q.hist.forEach((v, k) => (k ? ctx.lineTo(ax.X(k), ax.Y(v)) : ctx.moveTo(ax.X(k), ax.Y(v)))); ctx.stroke(); ctx.restore();
    q.hist.forEach((v, k) => D.sphere(ax.X(k), ax.Y(v), 5.2, A_COL, { outline: '#fff', outlineWidth: 1.5 }));
    const last = q.hist[q.hist.length - 1]; D.label(clamp(ax.X(q.hist.length - 1) + 6, gx.x + 24, gx.x + gx.w - 22), clamp(ax.Y(last) - 16, gx.y + 8, gx.y + gx.h), f2(last), { bg: '#b45309', size: 12.5 });
    // 선택압 정보
    if (!PHONE) {
      panel(IP.x, IP.y, IP.w, IP.h, 16);
      T(IP.x + 14, IP.y + 26, '환경: 생존율 (살아남을 확률)', 14.5, '#26324a', 'left', 800);
      const sA = simSA();
      [['A', sA, A_COL], ['B', SB, B_COL]].forEach(([n, s, col], k) => {
        const y = IP.y + 52 + k * 34; bug(IP.x + 28, y + 4, 9, col, 1, 1);
        T(IP.x + 46, y + 10, n + ' 형질', 14, '#475569', 'left', 800);
        D.roundRect(IP.x + 112, y - 4, 190, 18, 9); ctx.fillStyle = '#eef2f7'; ctx.fill();
        D.roundRect(IP.x + 112, y - 4, Math.max(18, 190 * s), 18, 9); ctx.fillStyle = col; ctx.fill();
        T(IP.x + 312, y + 10, f2(s), 15, '#1f2d44', 'left', 800);
      });
      textBlock(IP.x + 14, IP.y + 126, IP.w - 28, q.type === 'none' ? '모두 A라서 비교할 형질 B가 없어요' : q.type === 'noinh' ? '형질이 자손에게 유전되지 않아요' : sA > SB ? '생존율이 높은 A가 더 많이 남아 번식해요' : '두 형질의 생존율이 같아요', 13.5, '#7c3aed', 18, 800);
    } else {
      bug(HB.x + 22, HB.y + 44, 6.5, A_COL, 1, 1); T(HB.x + 34, HB.y + 48, 'A 생존율 ' + f2(simSA()), 13.5, '#92400e', 'left', 800); bug(HB.x + 182, HB.y + 44, 6.5, B_COL, 1, 1); T(HB.x + 194, HB.y + 48, 'B 생존율 ' + f2(SB), 13.5, '#1d4ed8', 'left', 800);
    }
    // 세대별 표
    panel(TB.x, TB.y, TB.w, TB.h, 14);
    const cw = (TB.w - (PHONE ? 70 : 110)) / 11, tx = TB.x + (PHONE ? 66 : 104);
    T(TB.x + 12, TB.y + L(25, 20), '세대', L(14, 13), '#475569', 'left', 800); T(TB.x + 12, TB.y + L(55, 43), 'A 비율', L(14, 13), '#b45309', 'left', 800); T(TB.x + 12, TB.y + L(82, 63), 'A 개체', L(14, 13), '#64748b', 'left', 800);
    for (let k = 0; k <= 10; k++) {
      const x = tx + k * cw + cw / 2, on = k < q.hist.length, cur = k === q.g;
      if (cur) { ctx.fillStyle = 'rgba(245,158,11,.14)'; D.roundRect(x - cw / 2 + 2, TB.y + 6, cw - 4, TB.h - 12, 8); ctx.fill(); }
      T(x, TB.y + L(25, 20), String(k), L(14, 13), '#475569', 'center', 800);
      T(x, TB.y + L(55, 43), on ? f2(q.hist[k]) : '—', L(14.5, 12.5), on ? '#1f2d44' : '#cbd5e1', 'center', 800);
      T(x, TB.y + L(82, 63), on ? String(Math.round(q.hist[k] * 100)) : '—', L(13.5, 12.5), on ? '#64748b' : '#cbd5e1', 'center', 700);
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ② 후추나방: 새의 사냥 모의 + 어두운색 나방 비율 그래프
     ========================================================= */
  const TRUNK = L({ x: 14, y: 46, w: 392, h: 494 }, { x: 6, y: 34, w: 468, h: 380 });
  const MSTAT = L({ x: 418, y: 46, w: 368, h: 494 }, { x: 6, y: 422, w: 468, h: 270 });
  const RATE_C = 0.8, RATE_K = 0.2;   // 눈에 잘 띄는 나방 / 잘 안 띄는 나방이 잡히는 비율
  const MOTH_SLOTS = (function () {
    const r = mulberry(11), out = [], cols = 4, rows = 5;
    for (let i = 0; i < 20; i++) { const c = i % cols, rw = Math.floor(i / cols); out.push({ fx: (c + 0.5 + (r() - 0.5) * 0.5) / cols, fy: (rw + 0.5 + (r() - 0.5) * 0.45) / rows, rot: (r() - 0.5) * 1.2 }); }
    return out;
  })();
  const trunkRect = () => ({ x: TRUNK.x + L(60, 50), y: TRUNK.y + 40, w: TRUNK.w - L(120, 100), h: TRUNK.h - 60 });
  const mothXY = (i) => { const t = trunkRect(), m = MOTH_SLOTS[i]; return [t.x + 30 + m.fx * (t.w - 60), t.y + 24 + m.fy * (t.h - 48)]; };
  function newMothPop(nD) { const idx = MOTH_SLOTS.map((_, i) => i).sort(() => Math.random() - 0.5); return MOTH_SLOTS.map((_, i) => ({ i, type: idx.indexOf(i) < nD ? 'D' : 'L', st: 'alive', a: 1, sc: 1 })); }
  function resetMoth(env) {
    const prev = S.mt;
    S.mt = { env: env || (prev ? prev.env : 'light'), gen: 0, hist: [0.5], moths: newMothPop(10), phase: 'idle', t: 0, first: prev ? prev.first : { light: null, soot: null }, bird: null, queue: [], res: null, bark: (env || (prev ? prev.env : 'light')) === 'light' ? 0 : 1 };
    updateCtl && updateCtl();
  }
  const mothDark = () => S.mt.moths.filter((m) => m.type === 'D' && m.st !== 'gone').length;
  function mothHunt() {
    const q = S.mt; if (q.phase !== 'idle' || q.gen >= 6) return;
    const D_ = q.moths.filter((m) => m.type === 'D'), L_ = q.moths.filter((m) => m.type === 'L');
    const conspD = q.env === 'light';
    const cons = conspD ? D_ : L_, camo = conspD ? L_ : D_;
    const shuf = (a) => a.slice().sort(() => Math.random() - 0.5);
    const caughtC = shuf(cons).slice(0, Math.round(cons.length * RATE_C)), caughtK = shuf(camo).slice(0, Math.round(camo.length * RATE_K));
    q.queue = shuf(caughtC.concat(caughtK)); q.res = { cD: caughtC.concat(caughtK).filter((m) => m.type === 'D').length, cL: caughtC.concat(caughtK).filter((m) => m.type === 'L').length, n0: q.moths.length, d0: D_.length };
    q.phase = 'hunt'; q.t = 0; q.bird = { x: TRUNK.x + TRUNK.w + 30, y: TRUNK.y + 20, tx: 0, ty: 0, k: -1 }; q.step = 0; q.stepT = 0; Sound.click(); updateCtl();
  }
  function stepMoth(dt) {
    const q = S.mt; if (!q) return;
    q.moths.forEach((m) => { if (m.st === 'eaten') { m.a = SciSim.approach(m.a, 0, dt, 12); m.sc = SciSim.approach(m.sc, 1.4, dt, 10); if (m.a < 0.03) m.st = 'gone'; } if (m.st === 'born') { m.a = SciSim.approach(m.a, 1, dt, 8); m.sc = SciSim.approach(m.sc, 1, dt, 9); if (m.a > 0.97) { m.st = 'alive'; m.a = 1; m.sc = 1; } } });
    if (q.phase === 'hunt') {
      q.t += dt; const b = q.bird;
      if (q.step < q.queue.length) {
        const m = q.queue[q.step], [tx, ty] = mothXY(m.i); if (q.stepT === 0) { b.fx = b.x; b.fy = b.y; } q.stepT += dt;
        const k = clamp(q.stepT / 0.38, 0, 1);
        b.x = lerp(b.fx, tx, smooth(k)); b.y = lerp(b.fy, ty - 12, smooth(k)) - Math.sin(k * Math.PI) * 14;
        if (k >= 1) { m.st = 'eaten'; parts.burst(tx, ty, { count: 8, colors: [m.type === 'D' ? '#44403c' : '#e7e0cf', '#fff'], speed: 90, size: 3, life: 0.6, gravity: 120 }); Sound.tick(); q.step++; q.stepT = 0; }
      } else {
        b.x += dt * 380; b.y -= dt * 90; if (b.x > TRUNK.x + TRUNK.w + 60) { q.phase = 'breed'; q.t = 0; mothPlanBreed(); }
      }
    } else if (q.phase === 'breed') {
      q.t += dt; let w = 0;
      q.moths.forEach((m) => { if (m.st === 'wait') { if (q.t >= m.bt) { m.st = 'born'; m.a = 0; m.sc = 0.2; const [x, y] = mothXY(m.i); parts.burst(x, y, { count: 4, colors: ['#fff', m.type === 'D' ? '#78716c' : '#d6cfb8'], speed: 50, size: 2, life: 0.4, gravity: -20 }); } else w++; } });
      if (q.t > 1.1 && w === 0 && q.moths.every((m) => m.st === 'alive' || m.st === 'gone')) {
        q.moths = q.moths.filter((m) => m.st === 'alive'); q.gen++; const nd = q.moths.filter((m) => m.type === 'D').length; q.hist.push(nd / q.moths.length); q.phase = 'idle'; q.bird = null;
        const rs = q.res; if (!q.first[q.env] && q.gen === 1) q.first[q.env] = { cD: rs.cD, cL: rs.cL, next: nd / q.moths.length, nd };
        Sound.success(); updateCtl();
      }
    }
  }
  function mothPlanBreed() {
    const q = S.mt, alive = q.moths.filter((m) => m.st === 'alive'), sd = alive.filter((m) => m.type === 'D').length, sl = alive.length - sd;
    const nD2 = alive.length ? Math.round(20 * sd / alive.length) : 0, free = 20 - alive.length;
    const oD = clamp(nD2 - sd, 0, free), oL = free - oD;
    const used = new Set(q.moths.filter((m) => m.st === 'alive').map((m) => m.i)); const empty = MOTH_SLOTS.map((_, i) => i).filter((i) => !used.has(i)).sort(() => Math.random() - 0.5);
    q.moths = alive.concat(empty.map((i, k) => ({ i, type: k < oD ? 'D' : 'L', st: 'wait', a: 0, sc: 1, bt: 0.15 + Math.random() * 0.7 })));
  }
  function drawMoth(x, y, type, a, sc, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(sc, sc); ctx.globalAlpha = a;
    const col = type === 'D' ? '#2f2926' : '#efe8d5', edge = type === 'D' ? '#12100f' : '#a79f86';
    ctx.fillStyle = col; ctx.strokeStyle = edge; ctx.lineWidth = 1.4;
    [-1, 1].forEach((sx) => { ctx.beginPath(); ctx.ellipse(sx * 9, 1, 10, 6.5, sx * 0.35, 0, TAU); ctx.fill(); ctx.stroke(); });
    ctx.beginPath(); ctx.ellipse(0, 1, 3.4, 8.4, 0, 0, TAU); ctx.fillStyle = type === 'D' ? '#1b1715' : '#d9d0b8'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-1.5, -7); ctx.lineTo(-5, -12); ctx.moveTo(1.5, -7); ctx.lineTo(5, -12); ctx.stroke();
    ctx.restore();
  }
  function drawTrunk(r, bark, withLichen) {
    ctx.save();
    D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 18); ctx.fillStyle = C.mix('#d8d0bc', '#4a423d', bark); ctx.fill(); }, { blur: 12, y: 4 });
    D.roundRect(r.x, r.y, r.w, r.h, 18); ctx.clip();
    const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0); g.addColorStop(0, 'rgba(0,0,0,.22)'); g.addColorStop(0.25, 'rgba(255,255,255,.05)'); g.addColorStop(0.7, 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    const rg = mulberry(5);
    ctx.strokeStyle = bark > 0.5 ? 'rgba(0,0,0,.28)' : 'rgba(90,75,50,.3)'; ctx.lineWidth = 2;
    for (let k = 0; k < 16; k++) { const x = r.x + rg() * r.w, y0 = r.y + rg() * r.h; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + (rg() - 0.5) * 14, y0 + 40 + rg() * 50); ctx.stroke(); }
    if (withLichen) { for (let k = 0; k < 46; k++) { const x = r.x + rg() * r.w, y = r.y + rg() * r.h, rr_ = 3 + rg() * 6; ctx.fillStyle = 'rgba(' + (150 + rg() * 40 | 0) + ',' + (175 + rg() * 30 | 0) + ',' + (120 + rg() * 30 | 0) + ',' + (0.55 * (1 - bark)) + ')'; ctx.beginPath(); ctx.arc(x, y, rr_, 0, TAU); ctx.fill(); } }
    if (bark > 0.01) { for (let k = 0; k < 90; k++) { const x = r.x + rg() * r.w, y = r.y + rg() * r.h; ctx.fillStyle = 'rgba(15,12,10,' + (0.35 * bark) + ')'; ctx.fillRect(x, y, 3 + rg() * 5, 2 + rg() * 3); } }
    ctx.restore();
  }
  function drawMothMode(dt, t) {
    const q = S.mt;
    bgFill('#e4eede', '#d9e6d0');
    q.bark = SciSim.approach(q.bark, q.env === 'light' ? 0 : 1, dt, 5);
    T(TRUNK.x, L(30, 22), '🐦 새가 나무 줄기의 나방을 사냥해요', L(17, 15), '#334a2b', 'left', 800);
    const tr = trunkRect(); drawTrunk(tr, q.bark, true);
    q.moths.forEach((m) => { if (m.st === 'gone' || m.st === 'wait') return; const [x, y] = mothXY(m.i); drawMoth(x, y, m.type, m.a, m.sc, MOTH_SLOTS[m.i].rot); });
    if (q.bird) { const b = q.bird; ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(b.x, b.y + 22, 16, 5, 0, 0, TAU); ctx.fill(); ctx.restore(); E('🐦', b.x, b.y, 38, { rot: RM ? 0 : Math.sin(t * 16) * 0.12 }); }
    D.label(TRUNK.x + TRUNK.w / 2, TRUNK.y + 22, q.env === 'light' ? '🌳 밝은 나무 줄기 (이끼가 덮여 있어요)' : '🏭 그을음으로 어두워진 나무 줄기', { bg: q.env === 'light' ? '#65a30d' : '#44403c', size: L(14, 13) });
    // 오른쪽: 결과
    panel(MSTAT.x, MSTAT.y, MSTAT.w, MSTAT.h, 18, '#fffefa');
    let y0 = MSTAT.y + 28;
    T(MSTAT.x + 14, y0, '세대 ' + q.gen + ' · 어두운색 나방 ' + mothDarkNow() + ' / 20마리', L(16, 14.5), '#26324a', 'left', 800);
    y0 += 14;
    const rs = q.res, hunting = q.phase !== 'idle';
    // 이번 사냥
    if (rs) {
      const caughtD = q.queue.filter((m) => m.type === 'D' && (m.st === 'eaten' || m.st === 'gone')).length, caughtL = q.queue.filter((m) => m.type === 'L' && (m.st === 'eaten' || m.st === 'gone')).length;
      T(MSTAT.x + 14, y0 + 20, '이번 사냥에서 잡힌 나방', 14, '#475569', 'left', 800);
      [['밝은색', caughtL, rs.n0 - rs.d0, '#d9d0b8'], ['어두운색', caughtD, rs.d0, '#2f2926']].forEach(([n, c, tot, col], k) => {
        const yy = y0 + 36 + k * 30; T(MSTAT.x + 14, yy + 14, n, 13.5, '#334155', 'left', 800);
        D.roundRect(MSTAT.x + 82, yy, MSTAT.w - 130, 20, 8); ctx.fillStyle = '#eef2f7'; ctx.fill();
        if (tot > 0) { D.roundRect(MSTAT.x + 82, yy, Math.max(6, (MSTAT.w - 130) * c / tot), 20, 8); ctx.fillStyle = col; ctx.fill(); }
        T(MSTAT.x + MSTAT.w - 14, yy + 15, c + ' / ' + tot, 13.5, '#1f2d44', 'right', 800);
      });
      y0 += 100;
    } else { textBlock(MSTAT.x + 14, y0 + 24, MSTAT.w - 28, '나무 줄기를 고르고 🐦 새의 사냥을 시작해요. 새는 눈에 잘 띄는 나방을 더 많이 잡아요.', 14, '#64748b', 20, 700); y0 += 76; }
    // 비교 표
    T(MSTAT.x + 14, y0 + 20, '첫 사냥 비교 (처음엔 밝은색 10 : 어두운색 10)', 13.5, '#26324a', 'left', 800);
    const cols = ['나무 줄기', '잡힌 밝은색', '잡힌 어두운색', '다음 세대 어두운색'];
    const cx = L([14, 92, 164, 236], [14, 120, 232, 340]).map((v) => MSTAT.x + v), tw = MSTAT.w;
    const ty = y0 + 40; ctx.fillStyle = '#f1f5f9'; D.roundRect(MSTAT.x + 8, ty - 14, tw - 16, 26, 8); ctx.fill();
    cols.forEach((c, k) => T(cx[k], ty + 4, c, 12, '#475569', 'left', 800));
    ['light', 'soot'].forEach((e, k) => {
      const f = q.first[e], yy = ty + 30 + k * 30;
      T(cx[0], yy + 4, e === 'light' ? '밝은 나무' : '그을음 나무', 13.5, '#334155', 'left', 800);
      T(cx[1] + 14, yy + 4, f ? String(f.cL) : '—', 14, '#1f2d44', 'left', 800); T(cx[2] + 14, yy + 4, f ? String(f.cD) : '—', 14, '#1f2d44', 'left', 800);
      T(cx[3] + 20, yy + 4, f ? f2(f.next) : '—', 14.5, f ? (f.next > 0.5 ? '#44403c' : '#65a30d') : '#94a3b8', 'left', 800);
    });
    y0 = ty + 100;
    // 세대별 어두운색 비율 (현재 줄기)
    const gh = MSTAT.y + MSTAT.h - y0 - 34;
    if (gh > 60) {
      T(MSTAT.x + 14, y0, '어두운색 비율 변화 (지금 나무)', 13.5, '#26324a', 'left', 800);
      const gr = { x: MSTAT.x + 46, y: y0 + 12, w: MSTAT.w - 76, h: gh - 14 };
      const ax = axes(gr, { x0: 0, x1: 6, y0: 0, y1: 1, xt: [0, 2, 4, 6], yt: [0, 0.5, 1], yf: (v) => v.toFixed(1) });
      ctx.save(); ctx.strokeStyle = '#44403c'; ctx.lineWidth = 2.6; ctx.beginPath(); q.hist.forEach((v, k) => (k ? ctx.lineTo(ax.X(k), ax.Y(v)) : ctx.moveTo(ax.X(k), ax.Y(v)))); ctx.stroke(); ctx.restore();
      q.hist.forEach((v, k) => D.sphere(ax.X(k), ax.Y(v), 4.4, '#57534e', { outline: '#fff', outlineWidth: 1.2 }));
      T(gr.x + gr.w, gr.y + gr.h + 30, '세대', 12, '#64748b', 'right', 800);
    }
    parts.update(dt); parts.draw(ctx);
  }
  const mothDarkNow = () => S.mt.moths.filter((m) => m.type === 'D' && (m.st === 'alive' || m.st === 'born')).length;

  /* ---------- 어두운색 나방 비율 그래프 (단순화된 경향) ---------- */
  const sm3 = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const darkF = (y) => (y <= 1895 ? 0.01 + 0.97 * sm3((y - 1848) / 47) : y <= 1960 ? 0.98 : 0.98 - 0.88 * sm3((y - 1960) / 40));
  const polluF = (y) => (y <= 1880 ? sm3((y - 1848) / 32) : y <= 1950 ? 1 : 1 - 0.8 * sm3((y - 1950) / 40));
  const MGP = L({ x: 60, y: 82, w: 706, h: 168 }, { x: 52, y: 66, w: 408, h: 156 });
  const MTR = L({ x: 14, y: 300, w: 280, h: 246 }, { x: 6, y: 300, w: 220, h: 300 });
  function resetMg() { S.mg = { year: 1848, tw: 1848, seen: { y1895: false, post: false }, pick: [null, null, null, null], flag: [0, 0, 0, 0] }; const s = $('#sYear'); if (s) s.value = 1848; }
  function drawMothG(dt, t) {
    const q = S.mg;
    bgFill('#e8eff4', '#eef0e6');
    q.year = SciSim.approach(q.year, q.tw, dt, 12);
    const yr = Math.round(q.year);
    T(L(14, 8), L(30, 22), '📈 어두운색 나방의 비율 (단순화한 경향)', L(17, 15), '#334155', 'left', 800);
    panel(L(14, 6), L(44, 34), L(772, 468), L(238, 226), 16, '#fffefa');
    const ax = axes(MGP, { x0: 1848, x1: 2000, y0: 0, y1: 1, xt: [1850, 1900, 1950, 2000], yt: [0, 0.5, 1], yf: (v) => (v * 100) + '', xf: (v) => String(v) });
    T(MGP.x - 10, MGP.y - 8, '어두운색 나방의 비율 (%)', 12.5, '#64748b', 'left', 800);
    // 오염도 점선
    ctx.save(); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2.2; ctx.setLineDash([6, 5]); ctx.beginPath(); for (let y = 1848; y <= 2000; y += 2) { const px = ax.X(y), py = ax.Y(polluF(y)); y === 1848 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke(); ctx.restore();
    ctx.save(); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2.2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(ax.X(1893), ax.Y(0.1)); ctx.lineTo(ax.X(1908), ax.Y(0.1)); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = '#3f3a37'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(ax.X(1893), ax.Y(0.22)); ctx.lineTo(ax.X(1908), ax.Y(0.22)); ctx.stroke(); ctx.restore(); T(ax.X(1911), ax.Y(0.1) + 4.5, '대기 오염(그을음) 정도', 12.5, '#a16207', 'left', 800); T(ax.X(1911), ax.Y(0.22) + 4.5, '어두운색 나방의 비율', 12.5, '#3f3a37', 'left', 800);
    // 비율 곡선: 1895까지는 실선, 이후 경향은 점선
    ctx.save(); ctx.strokeStyle = '#3f3a37'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath(); for (let y = 1848; y <= 1950; y += 1) { const px = ax.X(y), py = ax.Y(darkF(y)); y === 1848 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke();
    ctx.setLineDash([2, 5]); ctx.lineCap = 'round'; ctx.beginPath(); for (let y = 1950; y <= 2000; y += 1) { const px = ax.X(y), py = ax.Y(darkF(y)); y === 1950 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke(); ctx.restore();
    T(ax.X(1985), ax.Y(0.5), '(경향)', 12.5, '#57534e', 'center', 800);
    [[1848, '1848 · 약 1 %'], [1895, '1895 · 약 98 %']].forEach(([y, lab]) => { D.sphere(ax.X(y), ax.Y(darkF(y)), 6, '#57534e', { outline: '#fff' }); D.label(clamp(ax.X(y) + (y === 1848 ? 56 : 72), MGP.x + 40, MGP.x + MGP.w - 60), ax.Y(darkF(y)) + (y === 1848 ? -16 : 26), lab, { bg: '#57534e', size: 12.5 }); });
    // 커서
    const cx = ax.X(yr); D.dashedLine(cx, MGP.y, cx, MGP.y + MGP.h, { color: '#7c3aed', width: 2 }); D.sphere(cx, ax.Y(darkF(yr)), 8, '#7c3aed', { outline: '#fff', outlineWidth: 2.5, shadow: true });
    D.label(clamp(cx, MGP.x + 30, MGP.x + MGP.w - 30), MGP.y - 16, yr + '년 · ' + pct(darkF(yr)), { bg: '#7c3aed', size: 13.5 });
    // 나무 줄기와 나방 20마리
    const tr = PHONE ? { x: 16, y: 280, w: 200, h: 290 } : { x: 30, y: 308, w: 248, h: 232 };
    drawTrunk(tr, polluF(yr), true);
    const nD = Math.round(20 * darkF(yr)), order = MOTH_SLOTS.map((_, i) => i);
    order.forEach((i, k) => { const m = MOTH_SLOTS[i], x = tr.x + 28 + m.fx * (tr.w - 56), y = tr.y + 22 + m.fy * (tr.h - 44); drawMoth(x, y, (k * 7 % 20) < nD ? 'D' : 'L', 1, 0.95, m.rot); });
    // 설명
    const ix = PHONE ? 236 : 300, iy = PHONE ? 280 : 308, iw = PHONE ? 238 : 486, ih = PHONE ? 290 : 232;
    panel(ix, iy, iw, ih, 16, '#fffefa');
    T(ix + 14, iy + 28, yr + '년', L(19, 17), '#7c3aed', 'left', 800);
    const rows = [['어두운색 나방', nD + ' / 20마리 (' + pct(darkF(yr)) + ')'], ['나무 줄기', polluF(yr) > 0.66 ? '그을음으로 어두워졌어요' : polluF(yr) > 0.25 ? '점점 어두워져요' : '밝아요 (이끼가 있어요)'], ['대기 오염', polluF(yr) > 0.66 ? '심해요' : polluF(yr) > 0.25 ? '늘고 있어요' : '적어요']];
    rows.forEach(([a, b], k) => { T(ix + 14, iy + 62 + k * 30, a, L(14.5, 13.5), '#64748b', 'left', 800); T(ix + iw - 14, iy + 62 + k * 30, b, L(14.5, 13), '#1f2d44', 'right', 800); });
    textBlock(ix + 14, iy + 168, iw - 28, '슬라이더로 해를 옮기며, 나무 줄기 색과 어두운색 나방의 비율이 함께 달라지는 것을 확인해요. 이 자료는 경향만 단순하게 나타낸 거예요.', L(13.5, 13), '#475569', L(20, 19), 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ③ 항생제 내성균: 한 번 투여할 때마다 감수성균은 1/10로 (단순화 모형)
     ========================================================= */
  const CAP = 1e6;
  const DISH = L({ x: 14, y: 46, w: 392, h: 394 }, { x: 6, y: 34, w: 468, h: 330 });
  const BGR = L({ x: 418, y: 46, w: 368, h: 254 }, { x: 6, y: 372, w: 468, h: 190 });
  const BCNT = L({ x: 418, y: 310, w: 368, h: 130 }, { x: 6, y: 570, w: 468, h: 124 });
  const BTL = L({ x: 14, y: 450, w: 772, h: 98 }, { x: 0, y: 0, w: 0, h: 0 });
  const dishC = () => [DISH.x + DISH.w / 2, DISH.y + L(212, 190)], dishR = () => L(166, 134);
  const BAC_N = 160;
  const bacPts = (function () { const r = mulberry(3), out = []; for (let i = 0; i < BAC_N; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.9; out.push({ a, d, ph: r() * TAU, rr: 0.7 + r() * 0.5, k: r() }); } return out; })();
  function resetBac(keepHist) {
    const prev = S.bac;
    S.bac = { S: CAP - 1, R: 1, doses: 0, sinceRegrow: 0, regrows: 0, firstDoses: 0, ev: [{ k: 'start', r: 1 / CAP }], phase: 'idle', t: 0, drops: [], pulse: 0, fade: 0, max6: prev ? prev.max6 : 0, done6: prev ? prev.done6 : false, done2: prev ? prev.done2 : false, grow: 1 };
    updateCtl && updateCtl();
  }
  const bacRatio = () => S.bac.R / (S.bac.R + S.bac.S);
  const bacTotal = () => S.bac.R + S.bac.S;
  function bacDose() {
    const q = S.bac; if (q.phase !== 'idle' || q.doses >= 12) return;
    q.phase = 'dose'; q.t = 0; q.drops = Array.from({ length: 26 }, () => ({ x: rr(0.05, 0.95), y: -rr(0, 0.5), v: rr(0.8, 1.4) })); Sound.click(); updateCtl();
  }
  function bacRegrow() {
    const q = S.bac; if (q.phase !== 'idle' || bacTotal() >= CAP) return;
    q.phase = 'grow'; q.t = 0; q.grow = 0; Sound.click(); updateCtl();
  }
  function bacFinishDose() {
    const q = S.bac; q.S = q.S / 10; q.doses++; q.sinceRegrow++;
    q.ev.push({ k: 'dose', r: bacRatio() }); q.phase = 'idle'; Sound.success();
    if (q.regrows === 0 && q.doses === 6) { q.done6 = true; }
    if (q.regrows >= 1 && q.sinceRegrow >= 1 && q.sinceRegrow <= 3 && q.firstDoses >= 1 && q.firstDoses <= 3 && bacRatio() >= 0.5 - 1e-9) q.done2 = true;
    updateCtl();
  }
  function bacFinishGrow() {
    const q = S.bac; let n = 0; while (q.S + q.R < CAP && n < 20) { q.S *= 10; q.R *= 10; n++; }
    q.regrows++; if (q.regrows === 1) q.firstDoses = q.doses; q.sinceRegrow = 0; q.ev.push({ k: 'grow', r: bacRatio() }); q.phase = 'idle'; Sound.success(); updateCtl();
  }
  function stepBac(dt) {
    const q = S.bac; if (!q) return;
    q.pulse += dt;
    if (q.phase === 'dose') { q.t += dt; q.drops.forEach((d) => { d.y += d.v * dt * 0.9; }); q.fade = smooth(clamp((q.t - 0.5) / 0.8, 0, 1)); if (q.t > 1.5) { q.fade = 0; bacFinishDose(); } }
    else if (q.phase === 'grow') { q.t += dt; q.grow = clamp(q.t / 1.6, 0, 1); if (q.t > 1.7) { q.grow = 1; bacFinishGrow(); } }
  }
  const fmtN = (v) => (v >= 10 ? Math.round(v).toLocaleString('ko-KR') : v >= 1 ? v.toFixed(0) : v.toPrecision(1).replace(/^0\./, '0.'));
  const fmtP = (r) => { const p = r * 100; return (p >= 10 ? p.toFixed(0) : p >= 0.1 ? String(parseFloat(p.toFixed(1))) : String(parseFloat(p.toPrecision(2)))) + ' %'; };
  function drawBacMode(dt, t) {
    const q = S.bac, [cx, cy] = dishC(), R0 = dishR();
    bgFill('#eef0f8', '#f1eef7');
    T(DISH.x, L(30, 22), '🦠 배양 접시: 세균 집단의 표본 ' + BAC_N + '개', L(17, 15), '#3b2f63', 'left', 800);
    panel(DISH.x, DISH.y, DISH.w, DISH.h, 18, '#fbfaff');
    // 접시
    ctx.save(); D.shadow(() => { ctx.beginPath(); ctx.arc(cx, cy, R0 + 8, 0, TAU); ctx.fillStyle = '#e3e8f3'; ctx.fill(); }, { blur: 10, y: 3 });
    const g = ctx.createRadialGradient(cx - 30, cy - 40, 10, cx, cy, R0); g.addColorStop(0, '#fff7da'); g.addColorStop(1, '#f2d98b'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R0 + 4, 0.2, 1.3); ctx.stroke(); ctx.restore();
    const ratio = bacRatio(), nR = Math.round(BAC_N * ratio), tot = bacTotal();
    // 세균(표본): 접시 안에만 그려요
    const growK = q.phase === 'grow' ? smooth(q.grow) : 1, order = bacPts.map((b, i) => i);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R0 - 2, 0, TAU); ctx.clip();
    bacPts.forEach((b, i) => {
      const isR = i < nR, x = cx + Math.cos(b.a + (RM ? 0 : Math.sin(q.pulse * 0.5 + b.ph) * 0.03)) * b.d * (R0 - 14), y = cy + Math.sin(b.a) * b.d * (R0 - 14);
      let a = 1, sc = 1;
      if (!isR && q.phase === 'dose') { a = 1 - q.fade * 0.9; sc = 1 - q.fade * 0.3; }
      if (q.phase === 'grow') { sc = 0.5 + 0.5 * growK; a = 0.4 + 0.6 * growK; }
      const col = isR ? '#f97316' : '#6b8ccf';
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(sc, sc);
      ctx.fillStyle = col; ctx.strokeStyle = C.shade(col, -0.35); ctx.lineWidth = 1.2; D.roundRect(-5.5 * b.rr, -2.8 * b.rr, 11 * b.rr, 5.6 * b.rr, 2.8 * b.rr); ctx.rotate(b.a); ctx.fill(); ctx.stroke(); ctx.restore();
    });
    ctx.restore();
    if (nR === 0 && q.R >= 1) {
      const rx = cx + 40, ry = cy - 56; D.ring(rx, ry, 17, t, { color: '#f97316' }); D.sphere(rx, ry, 4.6, '#f97316', { gloss: false });
      D.label(rx + 4, ry - 30, '내성균 ' + fmtN(q.R) + '개체 (표본에는 안 보여요)', { bg: '#c2410c', size: 12.5 });
    }
    // 투여 방울
    if (q.phase === 'dose') q.drops.forEach((d) => { const x = DISH.x + 20 + d.x * (DISH.w - 40), y = DISH.y + 30 + d.y * (DISH.h - 60); if (d.y > -0.05) { ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill(); ctx.restore(); } });
    // 범례
    const ly = DISH.y + DISH.h - 20;
    ctx.fillStyle = '#6b8ccf'; D.roundRect(DISH.x + 16, ly - 6, 14, 8, 4); ctx.fill(); T(DISH.x + 36, ly + 2, '감수성균', 13.5, '#334155', 'left', 800);
    ctx.fillStyle = '#f97316'; D.roundRect(DISH.x + 112, ly - 6, 14, 8, 4); ctx.fill(); T(DISH.x + 132, ly + 2, '내성균', 13.5, '#334155', 'left', 800);
    D.label(DISH.x + DISH.w - 14, DISH.y + 24, q.phase === 'dose' ? '💊 항생제 투여 중' : q.phase === 'grow' ? '⏳ 세균이 다시 증식해요' : '투여 ' + q.doses + '회', { bg: q.phase === 'idle' ? '#7c3aed' : '#a855f7', size: 13.5, align: 'right' });
    // 그래프: 사건별 내성균 비율
    panel(BGR.x, BGR.y, BGR.w, BGR.h, 16);
    T(BGR.x + 14, BGR.y + 25, '내성균의 비율', 14.5, '#26324a', 'left', 800);
    const gx = { x: BGR.x + L(52, 54), y: BGR.y + 40, w: BGR.w - L(76, 80), h: BGR.h - 78 }, nEv = Math.max(q.ev.length - 1, 8);
    const ax = axes(gx, { x0: 0, x1: nEv, y0: 0, y1: 1, xt: Array.from({ length: Math.min(nEv, 12) + 1 }, (_, i) => Math.round(i * nEv / Math.min(nEv, 12))).filter((v, i, a) => a.indexOf(v) === i), yt: [0, 0.5, 1], yf: (v) => Math.round(v * 100) + '%' });
    T(gx.x + gx.w, gx.y + gx.h + 34, '사건 순서 (투여 · 증식)', 12.5, '#64748b', 'right', 800);
    ctx.save(); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); q.ev.forEach((e, k) => (k ? ctx.lineTo(ax.X(k), ax.Y(e.r)) : ctx.moveTo(ax.X(k), ax.Y(e.r)))); ctx.stroke(); ctx.restore();
    q.ev.forEach((e, k) => { D.sphere(ax.X(k), ax.Y(e.r), e.k === 'grow' ? 6 : 5, e.k === 'grow' ? '#16a34a' : e.k === 'dose' ? '#a855f7' : '#94a3b8', { outline: '#fff', outlineWidth: 1.2 }); });
    const le = q.ev[q.ev.length - 1]; D.label(clamp(ax.X(q.ev.length - 1) + 6, gx.x + 30, gx.x + gx.w - 30), clamp(ax.Y(le.r) - 18, gx.y + 8, gx.y + gx.h - 4), fmtP(le.r), { bg: '#c2410c', size: 12.5 });
    // 개수 패널
    panel(BCNT.x, BCNT.y, BCNT.w, BCNT.h, 16);
    const rows = [['감수성균', q.S, '#6b8ccf'], ['내성균', q.R, '#f97316']];
    rows.forEach(([n, v, col], k) => {
      const y = BCNT.y + 30 + k * 34;
      T(BCNT.x + 14, y + 5, n, 14, '#334155', 'left', 800);
      D.roundRect(BCNT.x + 92, y - 8, BCNT.w - 230, 18, 9); ctx.fillStyle = '#eef2f7'; ctx.fill();
      const lg = clamp((Math.log10(Math.max(v, 1e-3)) + 3) / 9, 0, 1); D.roundRect(BCNT.x + 92, y - 8, Math.max(12, (BCNT.w - 230) * lg), 18, 9); ctx.fillStyle = col; ctx.fill();
      T(BCNT.x + BCNT.w - 14, y + 5, v < 1 ? '1개체 미만' : fmtN(v) + '개체', 14, '#1f2d44', 'right', 800);
    });
    T(BCNT.x + 14, BCNT.y + BCNT.h - 22, '내성균 비율 ' + fmtP(ratio), L(15, 14.5), '#c2410c', 'left', 800);
    T(BCNT.x + BCNT.w - 14, BCNT.y + BCNT.h - 22, '막대 길이: 개체 수(로그 눈금)', 12.5, '#64748b', 'right', 700);
    if (!PHONE) {
      panel(BTL.x, BTL.y, BTL.w, BTL.h, 14);
      T(BTL.x + 14, BTL.y + 27, '모형의 약속 (단순화)', 14, '#26324a', 'left', 800);
      textBlock(BTL.x + 14, BTL.y + 52, BTL.w - 28, '처음에는 세균 100만 개체 중 내성균이 1개체뿐이에요. 💊 투여할 때마다 감수성균은 10분의 1로 줄고 내성균은 그대로 살아남아요. ⏹ 중단하면 살아남은 세균이 다시 증식해 100만 개체 이상이 돼요(감수성균과 내성균이 같은 비율로 늘어요).', 13.5, '#475569', 20, 700);
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ④ 핀치 부리 깊이 (가뭄 전 · 후 히스토그램) + 네 사례의 공통 틀
     ========================================================= */
  const FB = { lo: 7.0, hi: 12.0, w: 0.25 };
  const FN = Math.round((FB.hi - FB.lo) / FB.w);
  const fCenter = (i) => FB.lo + (i + 0.5) * FB.w;
  const FIN = (function () {
    const mean = (a) => { let n = 0, s = 0; a.forEach((c, i) => { n += c; s += c * fCenter(i); }); return s / n; };
    const normal = (m, sd) => Array.from({ length: FN }, (_, i) => Math.exp(-0.5 * Math.pow((fCenter(i) - m) / sd, 2)));
    let before = null;
    for (let m = 9.1; m < 9.4; m += 0.0005) { const raw = normal(m, 0.7), sum = raw.reduce((a, b) => a + b, 0), b = raw.map((v) => Math.round(v / sum * 1200)); if (Math.round(mean(b) * 10) / 10 === 9.2 && Math.abs(mean(b) - 9.2) < 0.012) { before = b; break; } }
    if (!before) { const raw = normal(9.2, 0.7), sum = raw.reduce((a, b) => a + b, 0); before = raw.map((v) => Math.round(v / sum * 1200)); }
    // 큰 부리 깊이일수록 살아남을 확률이 높아요 (로지스틱)
    let lo = 8.0, hi = 11.5, after = null;
    for (let it = 0; it < 60; it++) {
      const mid = (lo + hi) / 2, w = before.map((c, i) => c / (1 + Math.exp(-(fCenter(i) - mid) / 0.42))), sum = w.reduce((a, b) => a + b, 0);
      const a = w.map((v) => Math.round(v / sum * 180)); const mm = mean(a);
      if (mm < 9.7) lo = mid; else hi = mid; after = a;
    }
    return { before, after, mB: mean(before), mA: mean(after), nB: before.reduce((a, b) => a + b, 0), nA: after.reduce((a, b) => a + b, 0) };
  })();
  const FP = L({ x: 70, y: 82, w: 700, h: 280 }, { x: 52, y: 90, w: 410, h: 270 });
  const FMAX = 180;
  function resetFinch() { S.fn = { view: 'before', k: 0, mk: { before: null, after: null }, lock: { before: false, after: false }, drag: null, shake: 0, sel: -1, msg: '' }; }
  const fpX = (v) => FP.x + (v - FB.lo) / (FB.hi - FB.lo) * FP.w;
  const fpY = (c) => FP.y + FP.h - clamp(c / FMAX, 0, 1) * FP.h;
  function finchDown(p) {
    const q = S.fn;
    if (p.x < FP.x - 6 || p.x > FP.x + FP.w + 6 || p.y < FP.y - 20 || p.y > FP.y + FP.h + 10) return false;
    if (q.view === 'both') { showHint('먼저 "가뭄 전" 또는 "가뭄 후"를 골라 평균 위치를 표시해요.', 3500); return false; }
    if (q.lock[q.view]) { const i = Math.floor((p.x - FP.x) / FP.w * FN); q.sel = clamp(i, 0, FN - 1); return false; }
    q.drag = q.view; q.mk[q.view] = clamp(FB.lo + (p.x - FP.x) / FP.w * (FB.hi - FB.lo), FB.lo, FB.hi); return true;
  }
  function finchMove(p) { const q = S.fn; if (q.drag) q.mk[q.drag] = clamp(FB.lo + (p.x - FP.x) / FP.w * (FB.hi - FB.lo), FB.lo, FB.hi); }
  function finchUp(p) {
    const q = S.fn; if (!q.drag) return; const v = q.drag; q.drag = null;
    const tru = v === 'before' ? FIN.mB : FIN.mA, mk = q.mk[v];
    if (Math.abs(mk - tru) <= 0.2) { q.lock[v] = true; SciSim.tween(q.mk, { [v]: tru }, { duration: 0.3, ease: 'outBack' }); Sound.success(); parts.burst(fpX(tru), FP.y + 30, { count: 14, colors: ['#16a34a', '#fde047', '#fff'], speed: 120, size: 3, life: 0.8 }); showHint('가뭄 ' + (v === 'before' ? '전' : '후') + ' 평균 부리 깊이 ' + tru.toFixed(1) + ' mm', 3000); }
    else { q.shake = 1; Sound.fail(); showHint('막대가 가장 많이 몰린 곳이 평균이에요. 분포 전체의 가운데를 생각해 봐요.', 3500); setTimeout(() => { if (!q.lock[v]) q.mk[v] = null; }, 800); }
    updateCtl();
  }
  function drawFinch(dt, t) {
    const q = S.fn;
    bgFill('#f6f0e2', '#eef2e4');
    q.k = SciSim.approach(q.k, q.view === 'before' ? 0 : 1, dt, 6); q.shake = SciSim.approach(q.shake, 0, dt, 5);
    T(L(14, 8), L(30, 22), '🐤 갈라파고스 핀치의 부리 깊이 (1977년 가뭄 전 · 후)', L(17, 15), '#5b4630', 'left', 800);
    panel(L(14, 6), L(44, 34), L(772, 468), FP.y + FP.h + 46 - L(44, 34), 16, '#fffdf7');
    const ax = axes(FP, { x0: FB.lo, x1: FB.hi, y0: 0, y1: FMAX, xt: [7, 8, 9, 10, 11, 12], yt: [0, 60, 120, 180], xf: (v) => String(v) });
    T(FP.x + FP.w, FP.y + FP.h + 38, '부리 깊이 (mm)', 13, '#64748b', 'right', 800); T(L(24, 14), FP.y - 12, '개체 수 (마리)', 12.5, '#64748b', 'left', 800);
    const bw = FP.w / FN;
    const bar = (i, c, col, a, stroke) => { const x = FP.x + i * bw + 1, y = fpY(c), h = FP.y + FP.h - y; if (h < 0.5) return; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; D.roundRect(x, y, bw - 2, h, 3); ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke(); } ctx.restore(); };
    const bothM = q.view === 'both';
    for (let i = 0; i < FN; i++) {
      const cb = FIN.before[i], ca = FIN.after[i];
      if (bothM) { bar(i, cb, '#cbd5e1', 0.9); bar(i, ca, '#f97316', 0.95); }
      else { const c = lerp(cb, ca, q.k); bar(i, c, q.view === 'before' ? '#6b8ccf' : '#f97316', 1, q.sel === i ? '#7c3aed' : null); }
    }
    // 평균 표시
    const mkLine = (v, col, lab, locked, dx) => { if (v == null) return; const x = fpX(v); ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = locked ? 3.2 : 2.4; if (!locked) ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(x, FP.y - 8); ctx.lineTo(x, FP.y + FP.h); ctx.stroke(); ctx.restore(); D.label(clamp(x + (dx || 0), FP.x + 40, FP.x + FP.w - 40), FP.y - 16, lab + ' ' + v.toFixed(1) + ' mm', { bg: col, size: 13 }); };
    if (bothM) { mkLine(FIN.mB, '#475569', '전 평균', true, -52); mkLine(FIN.mA, '#c2410c', '후 평균', true, 52); D.arrow(fpX(FIN.mB), FP.y + 22, fpX(FIN.mA), FP.y + 22, { color: '#7c3aed', width: 3, head: 11 }); T((fpX(FIN.mB) + fpX(FIN.mA)) / 2, FP.y + 52, '+' + (FIN.mA - FIN.mB).toFixed(1) + ' mm', 14, '#7c3aed', 'center', 800); }
    else { const v = q.view; if (q.mk[v] != null) mkLine(q.mk[v], q.lock[v] ? (v === 'before' ? '#475569' : '#c2410c') : '#7c3aed', '평균', q.lock[v]); }
    // 요약 카드
    const sy = FP.y + FP.h + 58;
    panel(L(14, 6), sy, L(772, 468), VH - sy - 8, 14);
    const cur = q.view === 'both' ? null : q.view;
    const ls = [['가뭄 전 (1976년)', '약 ' + Math.round(FIN.nB / 10) * 10 + '마리', FIN.mB, '#475569', 'before'], ['가뭄 후 (1978년)', '약 ' + Math.round(FIN.nA / 10) * 10 + '마리', FIN.mA, '#c2410c', 'after']];
    ls.forEach(([n, c, m, col, key], k) => { const x = L(14, 6) + 14 + k * L(386, 234); T(x, sy + 26, n, L(14.5, 13.5), col, 'left', 800); T(x, sy + 50, '집단 크기 ' + c, L(14, 13), '#475569', 'left', 700); T(x, sy + 74, q.lock[key] || q.view === 'both' ? '평균 부리 깊이 ' + m.toFixed(1) + ' mm' : '평균 부리 깊이 ?', L(14.5, 13.5), q.lock[key] || q.view === 'both' ? '#1f2d44' : '#94a3b8', 'left', 800); });
    textBlock(L(14, 6) + 14, sy + L(106, 106), L(772, 468) - 28, L('막대를 눌러 구간별 마릿수를 볼 수 있어요. 가뭄으로 작은 씨앗이 줄어 단단한 큰 씨앗만 남았고, 부리가 깊은 개체가 더 많이 살아남았어요.', '막대를 눌러 구간별 마릿수를 볼 수 있어요. 1977년 가뭄으로 작은 씨앗이 줄어 단단한 큰 씨앗만 남았고, 부리가 깊은 개체가 더 많이 살아남았어요. 부리 크기는 유전되어 다음 세대의 평균도 커졌어요.'), 13.5, '#475569', 19, 700);
    if (q.sel >= 0) { const i = q.sel; D.label(L(14, 6) + L(772, 468) - 12, sy + 26, fCenter(i).toFixed(2) + ' mm 구간: 전 ' + FIN.before[i] + ' · 후 ' + FIN.after[i] + '마리', { bg: '#7c3aed', size: 12.5, align: 'right' }); }
    parts.update(dt); parts.draw(ctx);
  }

  /* ---------- 공통 틀 ---------- */
  const FR_CASES = [{ n: '모의실험', ic: '🧪' }, { n: '후추나방', ic: '🦋' }, { n: '내성균', ic: '🦠' }, { n: '핀치 부리', ic: '🐤' }];
  const FR_VAR = ['부리 깊이', '형질 A · B', '항생제 내성 여부', '몸 색(밝은색 · 어두운색)'];
  const FR_ENV = ['가뭄으로 큰 씨앗만 남음', '새의 포식(나무 줄기 색)', '생존율이 다른 환경', '항생제'];
  const FR_RES = ['내성균 비율 증가', 'A 형질 비율 증가', '평균 부리 깊이 증가', '어두운색 나방 비율 증가'];
  const FR_ANS = [[1, 2, 1], [3, 1, 3], [2, 3, 0], [0, 0, 2]];
  const FR_GROUPS = [
    { n: '모둠 가', t: '나무가 어두워지자 나방이 필요에 맞게 스스로 어두운색으로 변했어요.' },
    { n: '모둠 나', t: '어두운색 나방이 처음부터 있었고, 새에게 덜 잡혀 더 많이 번식해 비율이 늘었어요.' },
    { n: '모둠 다', t: '항생제가 세균 안에 내성이라는 변이를 만들어 냈어요.' },
  ];
  const FR_GROUP_OK = 1;
  function resetFrame() { S.fr = { cs: 0, pick: FR_CASES.map(() => [null, null, null]), flag: FR_CASES.map(() => [0, 0, 0]), group: null, gflag: 0, pop: FR_CASES.map(() => 1) }; }
  const frRight = () => { let n = 0; FR_ANS.forEach((a, i) => a.forEach((v, k) => { if (S.fr.pick[i][k] === v) n++; })); return n; };
  const frFilled = () => S.fr.pick.reduce((n, r) => n + r.filter((v) => v != null).length, 0);
  function drawFrame(dt, t) {
    const q = S.fr;
    bgFill('#f2f0f8', '#eef4ee');
    T(L(14, 8), L(30, 22), '🧩 네 사례를 같은 틀에 넣어 비교해요', L(17, 15), '#3b2f63', 'left', 800);
    const colW = L((772 - 120) / 4, (468 - 96) / 4), x0 = L(14, 6) + L(120, 96);
    const hdr = L(['변이', '환경(선택압)', '유리한 개체의 번식', '집단의 형질 비율 변화'], ['변이', '환경', '번식', '비율 변화']);
    hdr.forEach((h, k) => { const x = x0 + k * colW; D.label(x + colW / 2 - 2, L(60, 52), h, { bg: ['#0ea5e9', '#7c3aed', '#16a34a', '#d97706'][k], size: L(13.5, 12), pad: 6 }); if (k < 3) D.arrow(x + colW - 14, L(60, 52), x + colW + 8, L(60, 52), { color: '#94a3b8', width: 2, head: 7 }); });
    const rh = L(74, 62);
    FR_CASES.forEach((c, i) => {
      const y = L(84, 72) + i * (rh + 8), sel = q.cs === i;
      panel(L(14, 6), y, L(772, 468), rh, 14, sel ? '#fffbe9' : '#fff'); if (sel) { ctx.save(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.5; D.roundRect(L(14, 6), y, L(772, 468), rh, 14); ctx.stroke(); ctx.restore(); }
      if (!PHONE) { T(L(14, 6) + 12, y + rh / 2 + 8, c.ic, 26, '#000', 'left', 700); T(L(14, 6) + 52, y + rh / 2 + 5, c.n, 15, '#26324a', 'left', 800); } else { E(c.ic, 6 + 48, y + 20, 20); T(6 + 48, y + 46, c.n, 12.5, '#26324a', 'center', 800); }
      [FR_VAR, FR_ENV, null, FR_RES].forEach((opts, k) => {
        const x = x0 + k * colW + 3, w = colW - 10, h = rh - 18, yy = y + 9;
        let txt, st = 0;
        if (k === 2) { txt = L('유리한 개체가 더 많이 살아남아 번식', '유리한 개체가 더 많이 번식'); st = 1; }
        else { const kk = k === 3 ? 2 : k, v = q.pick[i][kk]; txt = v == null ? '(비어 있음)' : opts[v]; st = v == null ? 0 : (q.flag[i][kk] === 2 ? 3 : q.flag[i][kk] === 1 ? 1 : 2); }
        ctx.save(); D.roundRect(x, yy, w, h, 10); ctx.fillStyle = st === 0 ? '#f8fafc' : st === 1 ? '#dcfce7' : st === 3 ? '#fee2e2' : '#ede9fe'; ctx.fill(); ctx.setLineDash(st === 0 ? [5, 4] : []); ctx.strokeStyle = st === 0 ? '#cbd5e1' : st === 1 ? '#22c55e' : st === 3 ? '#dc2626' : '#8b5cf6'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore();
        textBlock(x + w / 2, yy + h / 2 - (wrap(txt, w - 12, L(13, 11.5)).length - 1) * L(8, 7) + 4.5, w - 12, txt, L(13, 11.5), st === 0 ? '#94a3b8' : '#1f2d44', L(16, 14), 800, 'center');
      });
    });
    // 가상 모둠 의견
    const gy = L(84, 72) + 4 * (rh + 8) + 6;
    T(L(14, 6), gy + 14, '💬 가상 모둠 의견 (나방과 내성균에 대한 설명)', L(14.5, 13.5), '#26324a', 'left', 800);
    FR_GROUPS.forEach((g, k) => {
      const w = L(252, 152), x = L(14, 6) + k * (w + L(8, 6)), y = gy + 24, h = L(110, 128), sel = q.group === k;
      panel(x, y, w, h, 12, sel ? '#ede9fe' : '#fff');
      if (sel) { ctx.save(); ctx.strokeStyle = q.gflag === 1 ? '#16a34a' : q.gflag === 2 ? '#dc2626' : '#7c3aed'; ctx.lineWidth = 3; D.roundRect(x, y, w, h, 12); ctx.stroke(); ctx.restore(); }
      T(x + 10, y + 21, g.n, L(14, 13), '#7c3aed', 'left', 800); textBlock(x + 10, y + 42, w - 20, g.t, L(13, 12), '#475569', L(18, 16), 700);
    });
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     화면 전환 · 조작 연결 · 읽음 칸
     ========================================================= */
  const MG_ROWS = [
    { q: '1848년 → 1895년, 어두운색 나방의 비율은?', opts: ['증가했다', '감소했다', '변화가 없다'], ans: 0, tip: '그래프의 실선이 어떻게 달라졌는지 봐요.' },
    { q: '같은 시기에 나무 줄기 색은?', opts: ['더 밝아졌다', '그을음으로 더 어두워졌다', '변화가 없다'], ans: 1, tip: '점선(대기 오염 정도)과 나무 그림을 함께 봐요.' },
    { q: '대기 오염이 줄어든 뒤 어두운색 나방의 비율은?', opts: ['증가했다', '감소했다', '변화가 없다'], ans: 1, tip: '1950년 이후의 점선 구간을 봐요.' },
    { q: '비율이 달라진 까닭은?', opts: ['나방이 환경에 맞춰 스스로 몸 색을 바꿨다', '이미 있던 몸 색 변이 중 눈에 덜 띄는 쪽이 더 많이 살아남아 번식했다'], ans: 1, tip: '환경은 변이를 만드는 것일까요, 선택하는 것일까요?' },
  ];
  const curId = () => { const m = game && game.current(); return m ? m.id : ''; };
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); hideHint(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    const curLv = game ? game.level + 1 : 1, showAll = !!(game && game.free), id = curId();
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.classList.toggle('lv-off', !showAll && +b.dataset.lv !== curLv && b.dataset.mode !== S.mode); });
    $('#mgWrap').hidden = !(S.mode === 'mothg' && (id === 'mgread' || showAll));
    const q = S.sim;
    if (q) {
      const busy = q.phase !== 'idle';
      $$('#simType button').forEach((b) => { b.classList.toggle('on', b.dataset.t === q.type); b.disabled = busy; });
      $('#sDelta').value = q.delta; $('#sDelta').style.setProperty('--pct', (q.delta / 0.6 * 100) + '%'); $('#oDelta').textContent = q.delta.toFixed(1) + ' (A ' + f2(simSA()) + ' · B ' + f2(SB) + ')';
      $('#bSimStep').disabled = busy || q.g >= 10; $('#bSimStep').textContent = q.g >= 10 ? '세대 10까지 끝' : '▶ 다음 세대 (' + (q.g + 1) + ')'; $('#bSimReset').disabled = busy;
      $('#simNote').innerHTML = q.type === 'none' ? '<b>변이 없음</b>: 처음부터 모든 개체가 A예요. 선택할 다른 형질이 없어요.' : q.type === 'noinh' ? '<b>유전 안 됨</b>: 형질 차이가 자손에게 유전되지 않아 자손은 다시 반반으로 태어나요.' : '<b>변이 있음</b>: A와 B가 반반이고, 형질이 자손에게 유전돼요.';
    }
    const m = S.mt;
    if (m) { $$('#barkSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.e === m.env); b.disabled = m.phase !== 'idle'; }); $('#bHunt').disabled = m.phase !== 'idle' || m.gen >= 6; $('#bHunt').textContent = m.gen >= 6 ? '6세대까지 끝' : m.gen === 0 ? '🐦 새의 사냥 시작' : '🐦 다음 세대 사냥 (' + (m.gen + 1) + ')'; $('#mothNote').innerHTML = '새는 눈에 잘 띄는 나방의 <b>80 %</b>, 잘 안 띄는 나방의 <b>20 %</b>를 잡고, 살아남은 나방이 번식해 20마리가 돼요.'; }
    const g = S.mg; if (g) { $('#sYear').value = Math.round(g.tw); $('#sYear').style.setProperty('--pct', ((g.tw - 1848) / 152 * 100) + '%'); $('#oYear').textContent = Math.round(g.tw) + '년'; $$('#mgRows select').forEach((s, i) => { s.value = g.pick[i] == null ? '' : String(g.pick[i]); s.classList.toggle('ok', g.flag[i] === 1); s.classList.toggle('bad', g.flag[i] === 2); }); }
    const b = S.bac;
    if (b) {
      const busy = b.phase !== 'idle';
      $('#bDose').disabled = busy || b.doses >= 12; $('#bGrow').disabled = busy || bacTotal() >= CAP; $('#bBacNew').disabled = busy;
      $('#bacNote').innerHTML = '투여 ' + b.doses + '회 · 내성균 비율 <b>' + fmtP(bacRatio()) + '</b>' + (b.regrows ? ' · 증식 ' + b.regrows + '회' : '');
    }
    const f = S.fn; if (f) { $$('#finSeg button').forEach((x) => x.classList.toggle('on', x.dataset.v === f.view)); $('#finNote').innerHTML = f.view === 'both' ? '평균이 <b>' + FIN.mB.toFixed(1) + ' mm → ' + FIN.mA.toFixed(1) + ' mm</b>로 옮겨 갔어요.' : '막대 분포의 <b>평균 위치</b>를 화면에서 끌어 표시해요. ' + (f.lock.before ? '✅ 전 ' : '⬜ 전 ') + (f.lock.after ? '✅ 후' : '⬜ 후'); }
    const r = S.fr;
    if (r) {
      $$('#frCases button').forEach((x, i) => { x.classList.toggle('on', i === r.cs); x.classList.toggle('ok', r.pick[i].every((v) => v != null)); });
      $$('#frSels select').forEach((s) => { const k = +s.dataset.k; if (k < 3) { s.value = r.pick[r.cs][k] == null ? '' : String(r.pick[r.cs][k]); s.classList.toggle('ok', r.flag[r.cs][k] === 1); s.classList.toggle('bad', r.flag[r.cs][k] === 2); } else { s.value = r.group == null ? '' : String(r.group); s.classList.toggle('ok', r.gflag === 1); s.classList.toggle('bad', r.gflag === 2); } });
    }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#sDelta').addEventListener('input', (e) => { S.sim.delta = Math.round(+e.target.value * 10) / 10; if (S.sim.delta === 0) S.sim.good = 0; Sound.tick(); updateCtl(); });
  $$('#simType button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (S.sim.phase !== 'idle') return; S.sim.type = b.dataset.t; resetSim(false); S.sim.type = b.dataset.t; S.sim.p = b.dataset.t === 'none' ? 1 : 0.5; S.sim.hist = [S.sim.p]; layoutSlots(); updateCtl(); }));
  $('#bSimStep').addEventListener('click', simStep);
  $('#bSimReset').addEventListener('click', () => { Sound.click(); parts.clear(); resetSim(false); });
  $$('#barkSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); if (S.mt.phase !== 'idle') return; parts.clear(); resetMoth(b.dataset.e); }));
  $('#bHunt').addEventListener('click', mothHunt);
  $('#sYear').addEventListener('input', (e) => { S.mg.tw = +e.target.value; Sound.tick(); checkMgSeen(); updateCtl(); });
  $$('#yearSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); SciSim.tween(S.mg, { tw: +b.dataset.y }, { duration: 0.8, ease: 'inOutQuad', onUpdate: updateCtl }); }));
  function checkMgSeen() { /* 연도 이동 기록은 필요하지 않아요 */ }
  $('#bDose').addEventListener('click', bacDose); $('#bGrow').addEventListener('click', bacRegrow);
  $('#bBacNew').addEventListener('click', () => { Sound.click(); if (S.bac.phase !== 'idle') return; parts.clear(); resetBac(); });
  $$('#finSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.fn.view = b.dataset.v; S.fn.sel = -1; hideHint(); updateCtl(); }));
  function buildSelect(box, label, opts, kk, onPick) {
    const row = document.createElement('div'); row.className = 'sel-row'; row.innerHTML = '<div class="q">' + label + '</div>';
    const sel = document.createElement('select'); sel.className = 'sel-in'; sel.dataset.k = kk; sel.setAttribute('aria-label', label.replace(/<[^>]+>/g, ''));
    sel.innerHTML = '<option value="">고르기</option>' + opts.map((o, j) => '<option value="' + j + '">' + o + '</option>').join('');
    sel.addEventListener('change', () => { onPick(sel.value === '' ? null : +sel.value); Sound.click(); updateCtl(); });
    row.appendChild(sel); box.appendChild(row);
  }
  MG_ROWS.forEach((r, i) => buildSelect($('#mgRows'), r.q, r.opts, i, (v) => { S.mg.pick[i] = v; S.mg.flag[i] = 0; }));
  $$('#frCases button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.fr.cs = +b.dataset.c; updateCtl(); }));
  buildSelect($('#frSels'), '변이: 무엇이 개체마다 달라요?', FR_VAR, 0, (v) => { S.fr.pick[S.fr.cs][0] = v; S.fr.flag[S.fr.cs][0] = 0; });
  buildSelect($('#frSels'), '환경(선택압): 무엇이 선택해요?', FR_ENV, 1, (v) => { S.fr.pick[S.fr.cs][1] = v; S.fr.flag[S.fr.cs][1] = 0; });
  buildSelect($('#frSels'), '결과: 집단의 형질 비율은?', FR_RES, 2, (v) => { S.fr.pick[S.fr.cs][2] = v; S.fr.flag[S.fr.cs][2] = 0; });
  buildSelect($('#frSels'), '💬 후추나방 · 내성균에 대한 옳은 의견은?', FR_GROUPS.map((g) => g.n), 3, (v) => { S.fr.group = v; S.fr.gflag = 0; });

  SciSim.pointer(view, {
    down(p) { if (S.mode === 'finch') return finchDown(p); return false; },
    move(p) { if (S.mode === 'finch') finchMove(p); },
    up(p) { if (S.mode === 'finch') finchUp(p); },
    hover(p) { if (S.mode === 'finch') return p.x >= FP.x && p.x <= FP.x + FP.w && p.y >= FP.y - 10 && p.y <= FP.y + FP.h ? 'ew-resize' : 'default'; return 'default'; },
  });

  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c; const m = S.mode;
    if (m === 'sim') { const q = S.sim; L1 = '세대'; a = q.g + ' / 10'; L2 = 'A 형질 비율'; b = f2(q.p); L3 = 'A 개체 수'; c = Math.round(q.p * 100) + '마리'; }
    else if (m === 'moth') { const q = S.mt; L1 = '세대'; a = q.gen + ' / 6'; L2 = '어두운색 나방'; b = mothDarkNow() + ' / 20마리'; L3 = '나무 줄기'; c = q.env === 'light' ? '밝은 나무' : '그을음 나무'; }
    else if (m === 'mothg') { const y = Math.round(S.mg.year); L1 = '연도'; a = y + '년'; L2 = '어두운색 나방 비율'; b = pct(darkF(y)); L3 = '대기 오염 정도'; c = polluF(y) > 0.66 ? '심함' : polluF(y) > 0.25 ? '늘어남' : '적음'; }
    else if (m === 'bac') { const q = S.bac; L1 = '항생제 투여'; a = q.doses + '회'; L2 = '내성균 비율'; b = fmtP(bacRatio()); L3 = '내성균 개체 수'; c = fmtN(q.R) + '개체'; }
    else if (m === 'finch') { const q = S.fn; L1 = '보는 자료'; a = q.view === 'before' ? '가뭄 전' : q.view === 'after' ? '가뭄 후' : '전·후 겹쳐 보기'; L2 = '평균 부리 깊이'; b = q.view === 'both' ? FIN.mB.toFixed(1) + ' → ' + FIN.mA.toFixed(1) + ' mm' : q.lock[q.view] ? (q.view === 'before' ? FIN.mB : FIN.mA).toFixed(1) + ' mm' : '— (표시해요)'; L3 = '집단 크기'; c = q.view === 'both' ? '약 ' + Math.round(FIN.nB / 10) * 10 + ' → ' + Math.round(FIN.nA / 10) * 10 : '약 ' + Math.round((q.view === 'before' ? FIN.nB : FIN.nA) / 10) * 10 + '마리'; }
    else { L1 = '채운 칸'; a = frFilled() + ' / 12'; L2 = '맞게 채운 칸'; b = frRight() + ' / 12'; L3 = '고른 의견'; c = S.fr.group == null ? '—' : FR_GROUPS[S.fr.group].n; }
    const key = [L1, a, L2, b, L3, c].join('|'); if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function autoFill() {
    const q = S.fn; q.lock.before = q.lock.after = true; q.mk.before = FIN.mB; q.mk.after = FIN.mA;
    S.fr.pick = FR_ANS.map((r) => r.slice()); S.fr.flag = FR_ANS.map(() => [1, 1, 1]); S.fr.group = FR_GROUP_OK; S.fr.gflag = 1;
    S.mg.pick = MG_ROWS.map((r) => r.ans); S.mg.flag = MG_ROWS.map(() => 1);
    updateCtl();
  }

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '집단의 비율이 변하는 모의실험', short: '모의실험', icon: '🧪', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 환경이 바뀌면 생물이 필요에 맞춰 스스로 변할까, 아니면 이미 있던 변이 중에서 선택될까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 애벌레와 새 모의실험으로 변이와 자연선택을 개체 수준에서 살펴봤어요. 이번에는 <b>집단 전체</b>에서 유리한 형질을 가진 개체의 <b>비율</b>이 세대마다 어떻게 달라지는지 확인해요.</div>' +
        '<p>집단 100마리를 한 세대씩 진행하면서 <b>선택압</b>(생존율의 차이)과 <b>변이</b>가 비율 변화에 어떤 영향을 주는지 알아봐요.</p>',
      features: ['sim'],
      setup() { S.sim = null; resetSim(true); setMode('sim'); },
      recap: '유리한 형질을 가진 개체가 더 많이 생존하고 번식하면 세대가 지날수록 그 형질을 가진 개체의 비율이 늘어요. 변이가 없거나 유전되지 않으면 자연선택에 의한 진화는 일어나지 않아요.',
      summary: '<ul><li><b>자연선택의 조건</b>: ① 집단 안에 변이가 있고 ② 그 변이가 유전되며 ③ 환경(선택압)에서 형질에 따라 생존·번식이 달라야 해요.</li><li>모의실험: 생존율 A 0.8, B 0.4이면 A 형질의 비율이 세대 0 → 4에서 <b>0.50 → 0.67 → 0.80 → 0.89 → 0.94</b>로 늘어요.</li><li>변이가 없으면(모두 A) 비율이 변하지 않고, 유전되지 않는 변이도 집단의 비율을 바꾸지 못해요.</li><li>환경은 변이를 <b>만드는 것</b>이 아니라 이미 있던 변이를 <b>선택</b>해요. 변이는 무작위로 생겨요.</li></ul>',
      missions: [
        {
          id: 'gen5', title: '5세대 진행하기',
          goal: '선택압 <b>0.4</b>(A 0.80, B 0.40)에서 <b>변이 있음</b> 집단을 <b>5세대</b> 진행해 A 비율의 변화를 그래프로 그리세요.',
          hint: '▶ 다음 세대를 5번 눌러요. 새가 지나가면 B가 더 많이 사라지고, 살아남은 개체가 번식해 빈자리를 채워요.',
          setup() { setMode('sim'); },
          check: () => S.sim.type === 'var' && S.sim.good >= 5 && S.sim.g >= 5 && S.sim.phase === 'idle', hold: 0.6,
          status: () => '세대 ' + S.sim.g + ' · A 비율 ' + f2(S.sim.p) + ' · 선택압 ' + S.sim.delta.toFixed(1) + (S.sim.type !== 'var' ? ' (변이 있음을 골라요)' : ''),
          explain: '생존율이 높은 A가 해마다 더 많이 남아 번식하므로 A의 비율이 <b>0.50 → 0.67 → 0.80 → 0.89 → 0.94 → 0.97</b>로 늘었어요. 개체가 변한 것이 아니라 <b>집단 안의 비율</b>이 달라진 거예요.',
        },
        {
          id: 'nochg', title: '선택이 일어나지 않는 경우',
          goal: '<b>변이 없음</b>(모두 A)과 <b>유전 안 됨</b> 집단에서 각각 한 세대 이상 진행해 비율이 변하는지 관찰하세요. (선택압은 0.2 이상)',
          hint: '아래 세 버튼에서 집단 종류를 바꿔요. 종류를 바꾸면 처음 집단으로 돌아가요. 선택압 슬라이더도 0.2 이상으로 두세요.',
          setup() { setMode('sim'); },
          check: () => S.sim.seenNone && S.sim.seenNoInh && S.sim.phase === 'idle', hold: 0.6,
          status: () => mark(S.sim.seenNone) + ' 변이 없음 관찰 &nbsp; ' + mark(S.sim.seenNoInh) + ' 유전 안 됨 관찰',
          explain: '모두 A이면 선택할 다른 형질이 없어서 비율이 <b>1.00으로 그대로</b>예요. 변이가 있어도 유전되지 않으면 자손이 다시 반반으로 태어나 <b>0.50에서 변하지 않아요</b>. 유전되는 변이만 진화의 재료가 돼요.',
        },
        {
          type: 'quiz', title: '변이가 없으면?', setup() { setMode('sim'); },
          goal: '모든 개체의 형질이 같은 집단에서 자연선택이 일어날 수 있을까요?',
          choices: ['일어난다. 환경이 새로운 형질을 만들어 주기 때문이다', '일어나지 않는다. 선택할 수 있는 서로 다른 형질이 없기 때문이다', '일어난다. 생존율이 낮은 개체가 스스로 형질을 바꾸기 때문이다', '일어나지 않는다. 자손이 태어나지 않기 때문이다'],
          answer: 1,
          feedback: ['환경은 변이를 만들지 않아요. 이미 있던 변이를 선택할 뿐이에요.', '', '개체가 스스로 형질을 바꾸는 것은 자연선택이 아니에요. 형질 차이가 있어야 선택돼요.', '자손은 태어나요. 문제는 선택할 형질의 차이가 없다는 점이에요.'],
          explain: '자연선택은 <b>변이가 있을 때</b>만 일어나요. 모두 같은 형질이면 생존율이 같아서 비율이 변하지 않아요.',
        },
      ],
    },
    {
      title: '후추나방: 환경과 어두운색 나방의 비율', short: '후추나방', icon: '🦋', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 변이가 있고 유전될 때 선택압에 따라 집단의 비율이 달라지는 것을 확인했어요. 이번에는 실제 사례인 <b>후추나방</b>에서 같은 원리를 찾아요.</div>' +
        '<p>나무 줄기의 색에 따라 새가 어떤 나방을 많이 잡는지 관찰하고, 영국 맨체스터 지역의 <b>어두운색 나방 비율 그래프</b>(단순화한 경향)를 환경의 변화와 함께 해석해요.</p>',
      features: ['moth', 'mothg'],
      setup() { S.mt = null; resetMoth('light'); resetMg(); setMode('moth'); },
      recap: '나무 줄기가 그을음으로 어두워지자 눈에 덜 띄는 어두운색 나방이 더 많이 살아남아 번식했고, 어두운색 나방의 비율이 늘었어요. 오염이 줄자 비율은 다시 감소했어요.',
      summary: '<ul><li><b>후추나방</b>: 밝은색과 어두운색 변이가 이미 있었어요. 밝은 나무에서는 어두운색이, 그을음 나무에서는 밝은색이 새에게 더 잘 잡혀요.</li><li>맨체스터 지역의 어두운색 나방 비율은 1848년 약 1 % → 1895년 약 98 %로 늘었고(그을음으로 나무가 어두워짐), 대기 오염이 줄자 다시 감소했어요(단순화한 경향).</li><li>환경(새와 나무 색)이 어두운색을 <b>만든 것이 아니라</b> 이미 있던 변이 중 유리한 쪽을 <b>선택</b>했어요.</li></ul>',
      missions: [
        {
          id: 'cmp', title: '두 나무 줄기 비교',
          goal: '<b>밝은 나무</b>와 <b>그을음 나무</b>에서 각각 새의 사냥을 한 번씩 해 보세요. (처음 나방은 밝은색 10 : 어두운색 10)',
          hint: '나무를 고르고 🐦 새의 사냥 시작을 눌러요. 줄기를 바꾸면 나방이 처음 상태(10 : 10)로 돌아가요.',
          setup() { setMode('moth'); },
          check: () => !!(S.mt.first.light && S.mt.first.soot) && S.mt.phase === 'idle', hold: 0.6,
          status: () => mark(!!S.mt.first.light) + ' 밝은 나무 &nbsp; ' + mark(!!S.mt.first.soot) + ' 그을음 나무',
          explain: '밝은 나무에서는 눈에 띄는 <b>어두운색</b> 나방이, 그을음 나무에서는 눈에 띄는 <b>밝은색</b> 나방이 더 많이 잡혀요. 살아남은 나방이 번식하면 다음 세대에서 눈에 덜 띄는 색의 비율이 늘어요(밝은 나무 0.20, 그을음 나무 0.80).',
        },
        {
          id: 'mgread', title: '비율 그래프 해석',
          goal: '그래프와 나무 그림을 보고 <b>네 문항</b>에 답하세요.',
          hint: '연도 슬라이더를 1848, 1895, 2000 근처로 옮기며 나무 줄기 색과 어두운색 나방의 수를 확인해요.',
          manual: true, setup() { setMode('mothg'); updateCtl(); },
          check: () => {
            const q = S.mg; let first = null;
            MG_ROWS.forEach((r, i) => { q.flag[i] = q.pick[i] == null ? 0 : q.pick[i] === r.ans ? 1 : 2; });
            for (let i = 0; i < MG_ROWS.length; i++) { if (q.pick[i] == null) return (i + 1) + '번 문항에 답해 주세요.'; if (q.pick[i] !== MG_ROWS[i].ans && first == null) first = i; }
            if (first != null) return (first + 1) + '번 문항을 다시 생각해 봐요. ' + MG_ROWS[first].tip;
            return true;
          },
          explain: '1848년 약 1 %에서 1895년 약 98 %로 <b>증가</b>했고, 그 시기에 나무 줄기는 그을음으로 어두워졌어요. 대기 오염이 줄자 비율이 <b>감소</b>했어요. 몸 색 변이는 이미 있었고 환경이 그 가운데 눈에 덜 띄는 쪽을 선택했어요.',
        },
        {
          type: 'quiz', title: '나방이 어두운색을 얻으려고 변했을까?', setup() { setMode('mothg'); },
          goal: '그을음 때문에 나무가 어두워진 뒤 어두운색 나방이 늘어난 까닭으로 옳은 것은?',
          choices: ['나무가 어두워지자 나방이 필요에 맞춰 몸 색을 바꿨다', '어두운색 변이가 이미 있었고, 그을음 나무에서 새에게 덜 잡혀 더 많이 번식했다', '그을음이 나방의 몸을 어둡게 물들였고 그 색이 자손에게 전해졌다', '밝은색 나방이 모두 다른 곳으로 이사를 갔다'],
          answer: 1,
          feedback: ['나방 개체가 필요에 맞춰 스스로 색을 바꾸는 것이 아니에요. 변이는 이미 있었어요.', '', '몸 표면에 묻은 그을음 같은 획득 형질은 유전되지 않아요.', '새에게 잡히는 정도의 차이가 비율을 바꿨어요.'],
          explain: '환경이 변이를 만든 것이 아니라 <b>이미 있던 어두운색 변이</b>가 선택된 결과예요. 그 결과 집단의 어두운색 비율이 늘었어요.',
        },
      ],
    },
    {
      title: '항생제 내성균: 선택되는 내성', short: '내성균', icon: '🦠', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 나방에서는 새가 선택압이었어요. 이번에는 <b>항생제</b>가 선택압인 세균 집단을 배양 접시로 살펴봐요.</div>' +
        '<p>세균 집단에는 처음부터 항생제에 견디는 <b>내성균</b>이 아주 적은 비율로 섞여 있어요. 항생제를 투여할 때마다 비율이 어떻게 달라지는지, 중간에 중단하면 어떻게 되는지 비교해요.</p>',
      features: ['bac'],
      setup() { S.bac = null; resetBac(); setMode('bac'); },
      recap: '항생제가 내성을 만드는 것이 아니라 이미 있던 내성균을 선택해요. 처방대로 끝까지 복용하지 않으면 살아남은 세균이 다시 늘어 내성균이 더 빨리 우세해져요.',
      summary: '<ul><li><b>내성균</b>은 항생제를 투여하기 전부터 아주 적은 비율(예: 100만 개체 중 1개체)로 있었어요.</li><li>투여할 때마다 감수성균은 10분의 1로 줄고 내성균은 그대로라서 내성균 비율은 0회 0.0001 %, 3회 0.1 %, 5회 약 9 %, <b>6회 50 %</b>, 7회 약 91 %, 8회 약 99 %로 늘어요.</li><li>도중에 중단하면 살아남은 세균과 내성균이 다시 늘어나요. 이후 같은 항생제를 쓰면 더 적은 횟수로 내성균이 우세해져요. 그래서 처방대로 복용하고 오남용을 줄여야 해요.</li></ul>',
      missions: [
        {
          id: 'dose6', title: '6회 투여 후 비율 확인',
          goal: '<b>새 감염</b>에서 중간에 멈추지 않고 <b>💊 항생제를 6번</b> 투여해 내성균의 비율을 확인하세요.',
          hint: '💊 항생제 1회 투여를 6번 눌러요. 투여할 때마다 파란 감수성균이 줄고 그래프의 주황 선이 올라가요.',
          setup() { setMode('bac'); },
          check: () => S.bac.done6, hold: 0.6,
          status: () => '투여 ' + S.bac.doses + '회 · 내성균 비율 ' + fmtP(bacRatio()),
          explain: '처음 100만 개체 중 내성균은 1개체(0.0001 %)였어요. 투여할 때마다 감수성균만 10분의 1로 줄어 3회 0.1 %, 5회 약 9 %, <b>6회 50 %</b>가 돼요. 항생제는 내성균을 <b>만든 것이 아니라 골라낸 거예요</b>.',
        },
        {
          id: 'stop', title: '중단하면 어떻게 될까?',
          goal: '<b>새 감염</b>에서 3회 투여한 뒤 <b>⏹ 중단하고 세균이 늘어나길 기다리고</b>, 다시 3회 투여해 내성균 비율 <b>50 %</b>를 만드세요.',
          hint: '💊 3번 → ⏹ 기다리기 → 💊 3번 순서예요. 처음부터 6번 투여해야 하던 50 %를, 중단했다가 다시 3번 만에 만들어요.',
          setup() { if (S.bac.doses > 0 && S.bac.phase === 'idle') resetBac(); setMode('bac'); },
          check: () => S.bac.done2, hold: 0.6,
          status: () => '투여 ' + S.bac.doses + '회 · 증식 ' + S.bac.regrows + '회 · 내성균 비율 ' + fmtP(bacRatio()),
          explain: '3회에서 중단하면 살아남은 세균이 다시 늘어요. 내성균도 1개체에서 약 1,000개체로 늘어 있어서, 다시 3회 투여하면 감수성균이 1,000개체로 줄어 <b>내성균이 50 %</b>가 돼요. 처음부터는 6회가 필요했던 거예요.',
        },
        {
          type: 'quiz', title: '항생제와 내성균', setup() { setMode('bac'); },
          goal: '항생제를 쓸 때 세균 집단에서 일어나는 일로 옳은 것은?',
          choices: ['항생제가 세균 안에 내성 유전자를 만들어 넣는다', '내성균은 처음부터 있었고, 항생제가 감수성균을 줄여 내성균의 비율을 높인다', '세균이 항생제를 만나면 필요에 맞춰 내성을 얻어 자손에게 물려준다', '항생제는 내성균만 골라서 죽인다'],
          answer: 1,
          feedback: ['항생제가 유전자를 만들어 넣는 것이 아니에요. 변이는 항생제를 쓰기 전에 이미 있어요.', '', '세균이 필요에 맞춰 내성을 얻는 것이 아니라, 이미 있던 내성균이 선택되는 거예요.', '항생제는 감수성균을 죽이고 내성균은 살아남아요.'],
          explain: '내성은 <b>이미 있던 변이</b>이고 항생제는 <b>선택압</b>이에요. 처방대로 끝까지 복용하지 않으면 살아남은 세균이 다시 늘어 내성균이 빨리 우세해지므로, 처방대로 복용하고 오남용을 줄여야 해요.',
        },
      ],
    },
    {
      title: '핀치 부리와 네 사례 비교', short: '핀치 부리', icon: '🐤', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 모의실험, 후추나방, 내성균 세 가지에서 같은 원리가 나타나는 것을 확인했어요. 이번에는 <b>갈라파고스 핀치</b>의 정량 자료를 해석하고, 네 사례를 하나의 틀로 정리해 소통해요.</div>' +
        '<p>1977년 가뭄 전 · 후 부리 깊이 분포(히스토그램)에서 평균이 어떻게 달라졌는지 읽고, <b>변이 → 환경(선택압) → 유리한 개체의 번식 → 집단의 형질 비율 변화</b> 틀에 네 사례를 채워요.</div>',
      features: ['finch', 'frame'],
      setup() { resetFinch(); resetFrame(); setMode('finch'); },
      recap: '네 사례 모두 변이가 있는 집단에서 환경이 유리한 개체를 더 많이 살아남게 해 집단의 형질 비율이 달라졌어요. 개체는 진화하지 않고 집단이 진화해요.',
      summary: '<ul><li><b>핀치</b>: 1977년 가뭄으로 작은 씨앗이 줄고 큰 단단한 씨앗만 남았어요. 집단 크기는 약 1200마리 → 약 180마리, 평균 부리 깊이는 약 9.2 mm → 약 9.7 mm로 커졌어요. 부리 크기는 유전되어 다음 세대의 평균도 커졌어요.</li><li><b>공통 틀</b>: 변이 → 환경(선택압) → 유리한 개체의 더 많은 생존·번식 → 집단의 형질 비율 변화.</li><li>획득 형질은 유전되지 않아요. 개체는 진화하지 않고 <b>집단</b>이 진화해요.</li></ul>',
      missions: [
        {
          id: 'mean', title: '히스토그램에서 평균 읽기',
          goal: '<b>가뭄 전</b>과 <b>가뭄 후</b> 부리 깊이 분포에서 평균 위치를 끌어 표시하세요. (±0.2 mm 안이면 맞아요)',
          hint: '자료를 고른 뒤 그래프를 눌러 끌어요. 막대가 몰려 있는 곳의 가운데 근처가 평균이에요. 가뭄 후에는 큰 쪽으로 치우쳐 있어요.',
          setup() { setMode('finch'); },
          check: () => S.fn.lock.before && S.fn.lock.after, hold: 0.6,
          status: () => mark(S.fn.lock.before) + ' 가뭄 전 평균 &nbsp; ' + mark(S.fn.lock.after) + ' 가뭄 후 평균',
          explain: '가뭄 전 평균 약 <b>9.2 mm</b> → 가뭄 후 약 <b>9.7 mm</b>예요. 집단 크기는 약 1200마리에서 약 180마리로 줄었고, 살아남은 개체 중에는 부리가 깊은(큰) 개체가 많았어요. 큰 씨앗을 깨 먹을 수 있는 개체가 더 많이 생존·번식한 결과예요.',
        },
        {
          id: 'frame', title: '네 사례를 공통 틀에 채우기',
          goal: '네 사례의 <b>변이 · 환경(선택압) · 결과</b>를 채우고, 세 모둠 의견 중 <b>옳은 의견</b>을 고르세요. (12칸 + 의견 1개)',
          hint: '사례 버튼으로 바꿔 가며 칸을 채워요. 나방은 몸 색 변이, 새의 포식과 나무 줄기 색이 선택압이에요. 환경이 변이를 만들어 낸다는 의견은 옳지 않아요.',
          manual: true, setup() { setMode('frame'); updateCtl(); },
          check: () => {
            const q = S.fr; let first = null;
            FR_ANS.forEach((a, i) => a.forEach((v, k) => { q.flag[i][k] = q.pick[i][k] == null ? 0 : q.pick[i][k] === v ? 1 : 2; }));
            q.gflag = q.group == null ? 0 : q.group === FR_GROUP_OK ? 1 : 2;
            for (let i = 0; i < 4 && first == null; i++) for (let k = 0; k < 3; k++) { if (q.pick[i][k] == null) return FR_CASES[i].n + ' 사례의 ' + ['변이', '환경(선택압)', '결과'][k] + ' 칸이 비어 있어요.'; if (q.pick[i][k] !== FR_ANS[i][k] && first == null) first = [i, k]; }
            if (first) return FR_CASES[first[0]].n + ' 사례의 ' + ['변이', '환경(선택압)', '결과'][first[1]] + ' 칸을 다시 생각해 봐요.';
            if (q.group == null) return '모둠 의견 중 옳은 것을 하나 골라 주세요.';
            if (q.group !== FR_GROUP_OK) return FR_GROUPS[q.group].n + '의 의견은 ' + (q.group === 0 ? '나방 개체가 필요에 맞춰 변했다고 보는 점이' : '항생제가 변이를 만들었다고 보는 점이') + ' 틀려요. 변이는 환경이 만들기 전에 이미 있어요.';
            return true;
          },
          explain: '네 사례 모두 <b>변이 → 환경(선택압) → 유리한 개체의 번식 → 집단의 형질 비율 변화</b> 틀로 설명돼요. 옳은 의견은 모둠 나예요. 어두운색 나방은 처음부터 있었고, 환경이 그 변이를 선택했어요.',
        },
        {
          type: 'quiz', title: '획득 형질은 유전될까?', setup() { setMode('finch'); },
          goal: '가뭄 동안 단단한 씨앗을 깨느라 부리 근육을 많이 써서 부리가 굵어진 핀치가 낳은 새끼의 부리는?',
          choices: ['어미가 노력해서 얻은 부리 크기가 그대로 전해진다', '생활하며 얻은 변화는 유전되지 않으므로 새끼의 부리는 유전자에 따라 정해진다', '새끼는 반드시 어미보다 부리가 더 굵어진다', '부리가 굵은 새끼는 한 마리도 태어나지 않는다'],
          answer: 1,
          feedback: ['생활하며 얻은 변화(획득 형질)는 생식세포의 유전자를 바꾸지 않아서 유전되지 않아요.', '', '새끼의 부리 크기는 부모에게서 받은 유전자에 따라 정해져요. 어미의 노력과는 관계가 없어요.', '부리가 굵은 유전자를 받으면 굵은 부리를 가진 새끼가 태어나요.'],
          explain: '자손에게 전해지는 것은 <b>유전되는 변이</b>(부리를 크게 하는 유전자)예요. 가뭄 때 부리가 깊은 개체가 많이 살아남았기 때문에 다음 세대의 평균이 커졌어요.',
        },
        {
          type: 'quiz', title: '개체가 아니라 집단이 진화한다', setup() { setMode('frame'); },
          goal: '"어두운색 나방의 비율이 늘었다"를 가장 알맞게 설명한 것은?',
          choices: ['한 마리의 밝은색 나방이 평생에 걸쳐 어두운색으로 진화했다', '집단 안에서 어두운색 형질을 가진 개체의 비율이 세대에 걸쳐 늘어났다', '어두운색 나방 개체가 점점 더 큰 몸으로 변했다', '모든 나방이 한꺼번에 어두운색으로 바뀌었다'],
          answer: 1,
          feedback: ['개체는 평생 같은 몸 색을 가져요. 한 개체가 진화하지는 않아요.', '', '비율이 늘어난 것이지 개체의 몸이 변한 것이 아니에요.', '이미 어두운색과 밝은색이 섞여 있었고 그 비율이 달라진 거예요.'],
          explain: '진화는 개체가 아니라 <b>집단</b>에서 일어나요. 집단 안에서 유리한 형질을 가진 개체의 비율이 세대를 거치며 달라지는 것이 진화예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-evolution-cases', mount: '#game', badge: '진화 사례 탐험가', homeHref: '../../index.html#hb',
    featureLabels: { sim: '🧪 집단 모의실험 · 선택압 슬라이더', moth: '🐦 새의 사냥 관찰', mothg: '📈 어두운색 나방 비율 그래프', bac: '🦠 항생제 배양 접시', finch: '🐤 핀치 부리 히스토그램', frame: '🧩 네 사례 공통 틀' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetSim(true); resetMoth('light'); resetMg(); resetBac(); resetFinch(); resetFrame();
  setMode('sim');
  let lastFree = false, lastMode = '', lastMission = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    const cmid = curId(); if (cmid !== lastMission) { lastMission = cmid; updateCtl(); }
    view.apply();
    stepSim(dt); stepMoth(dt); stepBac(dt);
    switch (S.mode) {
      case 'sim': drawSim(dt, t); break;
      case 'moth': drawMothMode(dt, t); break;
      case 'mothg': drawMothG(dt, t); break;
      case 'bac': drawBacMode(dt, t); break;
      case 'finch': drawFinch(dt, t); break;
      default: drawFrame(dt, t);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,241,232,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    if (game && game.free && !S.filled) { S.filled = true; autoFill(); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, levels, FIN, FP, fpX, fpY, FR_ANS, FR_GROUPS, FR_VAR, MG_ROWS, simSA, CAP, bacRatio, bacTotal, darkF, polluF, autoFill, fmtP, fmtN, mothDarkNow,
  };
})();
