/* =========================================================
   물질과 에너지 Ⅱ. 용액의 성질 - 삼투 현상 [12물에02-03]
   ① 관찰: 반투막 (U자관에서 농도가 다른 두 용액 사이로 물이 이동해 수위가 변해요)
   ② 모형: 입자 모형 (막의 구멍을 지나는 물 분자를 양방향으로 세어 순 이동을 찾아요)
   ③ 탐구: 실험 설계 (감자 막대: 변인 정하기 → 5개 농도 측정 → 그래프에서 등장액 농도 찾기)
   ④ 적용: 생활 속 삼투 (적혈구, 사례 카드)
   삼투압의 식(π = CRT)과 세포막 수송 단백질·능동 수송은 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 960 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#7c3aed', GOOD = '#14a058', BAD = '#e2464b', AMB = '#d97706', BLU = '#3867f4', SKY = '#0ea5e9';
  const SUGC = '#f472b6', SUGD = '#be185d', WAT = '#38bdf8', RBC = '#c8283c';
  const BG = '#f3f0fb';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  const HALO = { stroke: 'rgba(255,255,255,.92)', strokeWidth: 3 };
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(str).split('\n').forEach((ln, li) => {
      if (li) { out.push(line.trimEnd()); line = ''; }
      const toks = ln.match(/[가-힣]|\s+|[^\s가-힣]+/g) || [];
      for (const tk of toks) {
        if (tk.trim() === '') { if (line) line += tk; continue; }
        const t = line + tk;
        if (ctx.measureText(t).width > maxW && line.trim() && !/^[)\]}.,!?;:·…%]+$/.test(tk) && !/[(\[{]$/.test(line)) { out.push(line.trimEnd()); line = tk; } else line = t;
      }
    });
    if (line) out.push(line.trimEnd());
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const r1 = (v) => { const x = Math.round(v * 10) / 10; return x === 0 ? 0 : x; };
  const f1 = (v) => r1(v).toFixed(1).replace('-', '−');
  const sg1 = (v) => (r1(v) > 0 ? '+' : '') + f1(v);
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const ap = SciSim.approach;
  const ap2 = (cur, tg, dt, rate) => (RM ? tg : ap(cur, tg, dt, rate));
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

  /* ---------- 배치 ---------- */
  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 558, w: 464, h: 394 } : { x: 490, y: 50, w: 298, h: 498 },
  };
  const MODE_LABEL = { u: '🥼 반투막으로 나뉜 U자관', mol: '🔬 막을 지나는 물 분자', pot: '🥔 감자 실험을 설계해요', life: '🏠 생활 속 삼투' };
  const cOf = (i) => i * 0.05;                              // 슬라이더 값(0~10) → 몰 농도 (M)
  const fM = (i) => cOf(i).toFixed(2) + ' M';

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'u', fade: 0, lock: false, t: 0, clk: 0,
    sub: { pot: 'vars', life: 'rbc' },
    iL: 0, iR: 10,
    u: { dh: 0, seen: { diff: false, same: false }, tSame: 0, acc: 0 },
    pot: { bd: null, dip: { p: 0, go: false, done: false }, rec: [null, null, null, null, null], cur: 40 },
    life: { bd: null, sol: 1, v: 1, lysed: false, lt: 0, tIso: 0, seen: { lys: false, iso: false, cren: false }, acc: 0 },
  };
  let game = null;

  /* ================= ① U자관 ================= */
  const DH_K = 24, R_U = 0.5;                               // 평형 수위 차 = 24 cm × (농도 차 M), 수위는 지수적으로 평형에 다가가요
  const dhEq = () => DH_K * (cOf(S.iR) - cOf(S.iL));
  const hL = () => 15 - S.u.dh / 2, hR = () => 15 + S.u.dh / 2;
  const dhTxt = () => Math.abs(r1(hR()) - r1(hL())).toFixed(1);   // 표시된 두 수위의 차와 같게 반올림
  const netFlow = () => R_U * (dhEq() - S.u.dh);             // 오른쪽으로 가는 물의 순 이동 속도 (수위 차 cm/s)
  const UG = () => {
    const L = RC.L, aw = 60, lx = L.x + 70, rx = L.x + L.w - 70 - aw, yb1 = L.y + 388, yb0 = yb1 - 54, pc = 7;
    return { aw, lx, rx, yb1, yb0, yTop: L.y + 112, pc, xm: (lx + aw + rx) / 2, yOf: (cm) => yb1 - cm * pc };
  };
  function stepU(dt) {
    const U = S.u, eq = dhEq();
    U.dh = ap2(U.dh, eq, dt, R_U); if (Math.abs(U.dh - eq) < 0.004) U.dh = eq;
    const dc = cOf(S.iR) - cOf(S.iL);
    if (Math.abs(dc) >= 0.2 - 1e-9 && U.dh * Math.sign(dc) >= 4) U.seen.diff = true;
    const same = S.iL === S.iR && Math.abs(U.dh) < 0.3;
    U.tSame = same ? U.tSame + dt : 0;
    if (U.seen.diff && U.tSame >= 1.2) U.seen.same = true;
    // 막을 지나는 물방울 (순 이동 방향)
    const nf = netFlow();
    if (!RM && S.mode === 'u' && Math.abs(nf) > 0.1) {
      U.acc += Math.min(Math.abs(nf), 3) * 4 * dt;
      const g = UG();
      while (U.acc >= 1) {
        U.acc -= 1;
        const dir = nf > 0 ? 1 : -1;
        parts.emit({ x: g.xm - dir * 26 + rnd(-4, 4), y: rnd(g.yb0 + 8, g.yb1 - 8), vx: dir * rnd(55, 80), vy: 0, life: 0.55, size: 2.8, color: '#5ab8f5', shape: 'circle', fade: true });
      }
    }
  }
  function drawU(t) {
    const L = RC.L, g = UG(), U = S.u, a = hL(), b = hR(), yA = g.yOf(a), yB = g.yOf(b);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🥼 반투막(셀로판)으로 나뉜 U자관', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 48, '왼쪽과 오른쪽 용액의 농도를 바꾸고 수위를 지켜봐요', PHONE ? 12 : 13, MUTED, 'left', 700);
    // 처음 수위
    const y15 = g.yOf(15);
    // 액체
    [0, 1].forEach((side) => {
      const x0 = side ? g.rx : g.lx, y = side ? yB : yA, c = cOf(side ? S.iR : S.iL);
      const col = C.mix('#8fd0ff', '#f6a6cf', clamp(c / 0.5, 0, 1) * 0.75);
      const grd = ctx.createLinearGradient(0, y, 0, g.yb1); grd.addColorStop(0, C.rgba(col, 0.62)); grd.addColorStop(1, C.rgba(col, 0.9)); ctx.fillStyle = grd;
      ctx.fillRect(x0, y, g.aw, g.yb1 - y);
      if (side === 0) ctx.fillRect(x0 + g.aw, g.yb0, g.xm - (x0 + g.aw), g.yb1 - g.yb0); else ctx.fillRect(g.xm, g.yb0, x0 - g.xm, g.yb1 - g.yb0);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x0, y - 1, g.aw, 3);
      // 녹은 설탕 입자
      const n = Math.round(c * 30);
      for (let k = 0; k < n; k++) {
        const u = 0.1 + 0.8 * hash(k, side + 3), v = 0.1 + 0.8 * hash(k + 40, side + 9);
        const px = x0 + g.aw * u + (RM ? 0 : Math.sin(t * 1.6 + k) * 1.4), py = y + 6 + (g.yb1 - y - 12) * v;
        D.sphere(px, py, 3.2, SUGC, { gloss: false });
      }
    });
    // 유리관
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(g.lx - 5, g.yTop); ctx.lineTo(g.lx - 5, g.yb1 + 5); ctx.lineTo(g.rx + g.aw + 5, g.yb1 + 5); ctx.lineTo(g.rx + g.aw + 5, g.yTop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(g.lx + g.aw + 5, g.yTop); ctx.lineTo(g.lx + g.aw + 5, g.yb0 - 5); ctx.lineTo(g.rx - 5, g.yb0 - 5); ctx.lineTo(g.rx - 5, g.yTop); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.lx + 4, g.yTop + 10); ctx.lineTo(g.lx + 4, g.yb1 - 12); ctx.moveTo(g.rx + 4, g.yTop + 10); ctx.lineTo(g.rx + 4, g.yb1 - 12); ctx.stroke();
    // 반투막
    ctx.fillStyle = 'rgba(224,160,50,.85)'; ctx.fillRect(g.xm - 3, g.yb0 - 5, 6, g.yb1 - g.yb0 + 10);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let k = 0; k < 6; k++) ctx.fillRect(g.xm - 3, g.yb0 + 1 + k * 8.6, 6, 3);
    D.label(g.xm, g.yb1 + 24, '반투막', { size: 13, bg: '#b7791f', align: 'center' });
    // 눈금자
    [[g.lx - 16, 'right'], [g.rx + g.aw + 16, 'left']].forEach(([x, al]) => {
      for (let cm = 5; cm <= 35; cm += 5) { const y = g.yOf(cm); ctx.strokeStyle = '#9aa6bb'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.stroke(); T(x + (al === 'right' ? -9 : 9), y + 4, String(cm), 12, MUTED, al === 'right' ? 'right' : 'left', 700); }
    });
    T(g.lx - 22, g.yTop - 4, 'cm', 12, MUTED, 'right', 800); T(g.rx + g.aw + 22, g.yTop - 4, 'cm', 12, MUTED, 'left', 800);
    // 수위선, Δh
    ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(g.lx - 2, y15); ctx.lineTo(g.lx + g.aw + 2, y15); ctx.moveTo(g.rx - 2, y15); ctx.lineTo(g.rx + g.aw + 2, y15); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,70,100,.6)'; ctx.beginPath(); ctx.moveTo(g.lx + g.aw + 6, yA); ctx.lineTo(g.xm + 10, yA); ctx.moveTo(g.rx - 6, yB); ctx.lineTo(g.xm - 10, yB); ctx.stroke(); ctx.setLineDash([]);
    if (Math.abs(yA - yB) > 5) D.arrow(g.xm, yA < yB ? yA : yB, g.xm, yA < yB ? yB : yA, { color: BAD, width: 2.6, head: 9 });
    D.label(g.xm, (yA + yB) / 2 + (Math.abs(yA - yB) > 5 ? 0 : 0) - 0, 'Δh = ' + dhTxt() + ' cm', { size: 13, bg: BAD, align: 'center' });
    D.label(g.lx + g.aw / 2, yA - 16, f1(a) + ' cm', { size: 13, bg: '#475569', align: 'center' });
    D.label(g.rx + g.aw / 2, yB - 16, f1(b) + ' cm', { size: 13, bg: '#475569', align: 'center' });
    T(g.xm, g.yTop + 18, '- - 처음 수위 15 cm', 12.5, MUTED, 'center', 700);
    // 물의 순 이동 화살표
    const nf = netFlow();
    if (Math.abs(nf) > 0.1) { const dir = nf > 0 ? 1 : -1, ym = (g.yb0 + g.yb1) / 2; D.arrow(g.xm - dir * 24, ym - 40, g.xm + dir * 24, ym - 40, { color: SKY, width: clamp(Math.abs(nf) * 1.2 + 2, 2, 7), head: 12 }); T(g.xm, ym - 52, '물의 순 이동', 13, '#0369a1', 'center', 800, HALO); }
    // 농도 표지
    [[g.lx + g.aw / 2, '왼쪽', S.iL], [g.rx + g.aw / 2, '오른쪽', S.iR]].forEach(([x, nm, i]) => {
      T(x, g.yTop - 36, nm + ' 용액', 14, INK, 'center', 800);
      T(x, g.yTop - 18, i === 0 ? '순수한 물 0.00 M' : '설탕 ' + fM(i), 13, i === 0 ? '#0369a1' : SUGD, 'center', 800);
    });
    // 아래 설명
    const eq = dhEq();
    const msg = S.iL === S.iR ? '양쪽 농도가 같아서 물의 순 이동이 없어요. 수위 차가 0이에요.' : eq > 0 ? '오른쪽 용액이 더 진해요. 물이 오른쪽으로 이동해 오른쪽 수위가 올라가요. 수위 차가 ' + eq.toFixed(1) + ' cm가 되면 멈춰요.' : '왼쪽 용액이 더 진해요. 물이 왼쪽으로 이동해 왼쪽 수위가 올라가요. 수위 차가 ' + Math.abs(eq).toFixed(1) + ' cm가 되면 멈춰요.';
    textBlock(L.x + 16, L.y + 436, L.w - 32, msg, PHONE ? 13 : 13.5, INK, 19, 800);
  }

  /* ================= ② 입자 모형: 막 구멍을 지나는 물 분자 ================= */
  const MZW = 360, MZH = 200, XM = 180, HM = 5, NT = 60, RW = 3.6, RSG = 9.2, PORE_H = 8.5, PORE_OK = 6.8, PSPD = { w: 130, s: 70 };
  const PORES = [0, 1, 2, 3, 4, 5].map((k) => 22 + k * 31.2);
  const mz = { P: [], G: [], F: [], ev: [], cnt: { lr: 0, rl: 0 } };
  const nSug = (side) => Math.round(cOf(side ? S.iR : S.iL) * 50), nWat = (side) => NT - nSug(side);
  const poreNear = (y) => PORES.some((py) => Math.abs(y - py) <= PORE_OK);
  const rOf = (p) => (p.kind === 's' ? RSG : RW);
  function mkP(side, kind, fresh) {
    const r = kind === 's' ? RSG : RW, a = rnd(0, TAU);
    const x = side === 0 ? rnd(r + 4, XM - HM - r - 4) : rnd(XM + HM + r + 4, MZW - r - 4);
    return { x, y: rnd(r + 4, MZH - r - 4), vx: Math.cos(a), vy: Math.sin(a), side, kind, fade: fresh ? 0 : 1, dying: false, ang: rnd(0, TAU) };
  }
  function mzSync() {
    [0, 1].forEach((side) => ['w', 's'].forEach((kind) => {
      const tg = kind === 's' ? nSug(side) : nWat(side), live = mz.P.filter((p) => p.side === side && p.kind === kind && !p.dying);
      if (live.length < tg) for (let i = live.length; i < tg; i++) mz.P.push(mkP(side, kind, mz.P.length > 0));
      else if (live.length > tg) for (let i = tg; i < live.length; i++) live[i].dying = true;
    }));
  }
  function mzReset() { mz.P = []; mz.G = []; mz.F = []; mz.ev = []; mz.cnt = { lr: 0, rl: 0 }; mzSync(); }
  function mzCross(p, to) {
    const from = p.side; p.side = to; p.x = to === 1 ? XM + HM + RW + 0.6 : XM - HM - RW - 0.6;
    p.vx = (to === 1 ? 1 : -1) * Math.abs(p.vx);
    if (from === 0) mz.cnt.lr++; else mz.cnt.rl++;
    mz.ev.push({ t: S.clk, d: from }); mz.F.push({ x: XM, y: p.y, t: 0, d: from });
    // 확대한 부분 밖에서 물이 채워진다고 보고 입자 수를 일정하게 맞춰요
    let best = null, bd = -1; mz.P.forEach((q) => { if (q !== p && q.kind === 'w' && q.side === to && !q.dying && q.fade >= 1) { const d = Math.abs(q.x - XM); if (d > bd) { bd = d; best = q; } } });
    if (best) { mz.G.push({ x: best.x, y: best.y, t: 0 }); best.side = from; const r = RW + 4; best.x = from === 0 ? rnd(r, 30) : rnd(MZW - 30, MZW - r); best.y = rnd(r, MZH - r); best.fade = 0; }
  }
  function stepMZ(dt) {
    mzSync();
    for (let k = mz.P.length - 1; k >= 0; k--) {
      const p = mz.P[k], r = rOf(p), spd = PSPD[p.kind];
      if (p.dying) { p.fade -= dt * 3; if (p.fade <= 0) { mz.P.splice(k, 1); continue; } } else p.fade = Math.min(1, p.fade + dt * 3);
      const s = Math.hypot(p.vx, p.vy) || 1;
      p.vx += rnd(-0.6, 0.6) * dt * 6; p.vy += rnd(-0.6, 0.6) * dt * 6;
      const s2 = Math.hypot(p.vx, p.vy) || 1; p.vx /= s2; p.vy /= s2;
      p.x += p.vx * spd * dt; p.y += p.vy * spd * dt; p.ang += dt * 1.5;
      const xmin = p.side === 0 ? r : XM + HM + r, xmax = p.side === 0 ? XM - HM - r : MZW - r;
      if (p.y < r) { p.y = r; p.vy = Math.abs(p.vy); } else if (p.y > MZH - r) { p.y = MZH - r; p.vy = -Math.abs(p.vy); }
      if (p.x < xmin) { if (p.side === 1 && p.kind === 'w' && !p.dying && poreNear(p.y)) mzCross(p, 0); else { p.x = xmin; p.vx = Math.abs(p.vx); } }
      else if (p.x > xmax) { if (p.side === 0 && p.kind === 'w' && !p.dying && poreNear(p.y)) mzCross(p, 1); else { p.x = xmax; p.vx = -Math.abs(p.vx); } }
    }
    mz.G.forEach((g) => { g.t += dt * 2.2; }); mz.G = mz.G.filter((g) => g.t < 1);
    mz.F.forEach((f) => { f.t += dt * 2.6; }); mz.F = mz.F.filter((f) => f.t < 1);
    mz.ev = mz.ev.filter((e) => S.clk - e.t < 10);
  }
  const mzWin = () => ({ lr: mz.ev.filter((e) => e.d === 0).length, rl: mz.ev.filter((e) => e.d === 1).length });
  /* x, y, w: 화면 위치. 높이는 w * MZH / MZW. 위쪽에 이름표를 그려요 */
  function drawMZ(x, y, w, big) {
    const s = w / MZW, h = MZH * s;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    [0, 1].forEach((side) => {
      const c = cOf(side ? S.iR : S.iL), col = C.mix('#e6f3ff', '#fbe0ee', clamp(c / 0.5, 0, 1) * 0.8);
      ctx.fillStyle = col; D.roundRect(side ? XM + HM : 0, 0, side ? MZW - XM - HM : XM - HM, MZH, 8); ctx.fill();
    });
    // 반투막
    ctx.fillStyle = '#e0a032';
    let y0 = 0; PORES.forEach((py) => { ctx.fillRect(XM - HM, y0, HM * 2, py - PORE_H - y0); y0 = py + PORE_H; }); ctx.fillRect(XM - HM, y0, HM * 2, MZH - y0);
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3 / s * 0.8; D.roundRect(0, 0, MZW, MZH, 8); ctx.stroke();
    // 입자
    mz.G.forEach((g) => { ctx.strokeStyle = 'rgba(56,189,248,' + (1 - g.t) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(g.x, g.y, 5 + g.t * 8, 0, TAU); ctx.stroke(); });
    mz.P.forEach((p) => {
      ctx.globalAlpha = clamp(p.fade, 0, 1);
      if (p.kind === 's') D.sphere(p.x, p.y, RSG, SUGC, { gloss: true, outline: 'rgba(255,255,255,.6)', outlineWidth: 1 });
      else D.sphere(p.x, p.y, RW, WAT, { gloss: false });
    });
    ctx.globalAlpha = 1;
    mz.F.forEach((f) => { const col = f.d === 0 ? '#0ea5e9' : GOOD; ctx.strokeStyle = C.rgba(col, 1 - f.t); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(f.x + (f.d === 0 ? 6 : -6) * f.t * 2, f.y, 6 + f.t * 12, 0, TAU); ctx.stroke(); });
    ctx.restore();
    T(x + w * 0.24, y - 8, '왼쪽 ' + (S.iL ? fM(S.iL) : '물'), big ? 14 : 13, S.iL ? SUGD : '#0369a1', 'center', 800);
    T(x + w * 0.76, y - 8, '오른쪽 ' + (S.iR ? fM(S.iR) : '물'), big ? 14 : 13, S.iR ? SUGD : '#0369a1', 'center', 800);
    D.label(x + w * (XM / MZW), y + h + 14, '반투막', { size: 12.5, bg: '#b7791f', align: 'center' });
    return h;
  }
  function drawMol(t) {
    const L = RC.L, W = mzWin();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🔬 반투막의 구멍을 지나는 분자', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '구멍은 물 분자만 지나갈 수 있어요 (설탕 분자는 구멍보다 커요)', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    const w = L.w - 40, h = drawMZ(L.x + 20, L.y + 86, w, true);
    const y = L.y + 86 + h + 46;
    // 이동 횟수
    T(L.x + 16, y - 6, '막을 지난 물 분자 수 (농도를 바꾼 뒤부터 센 값)', 13, INK, 'left', 800);
    const rows = [['왼쪽 → 오른쪽', mz.cnt.lr, SKY], ['오른쪽 → 왼쪽', mz.cnt.rl, GOOD]], mx = Math.max(40, mz.cnt.lr, mz.cnt.rl), bx = L.x + 128, bw = L.w - 128 - 70;
    rows.forEach(([lab, v, col], i) => {
      const yy = y + 4 + i * 30;
      T(L.x + 16, yy + 15, lab, 13.5, col, 'left', 800);
      D.roundRect(bx, yy + 2, bw, 18, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
      ctx.save(); D.roundRect(bx, yy + 2, bw, 18, 8); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(bx, yy + 2, bw * clamp(v / mx, 0, 1), 18); ctx.restore();
      T(bx + bw + 8, yy + 16, v + '번', 13.5, INK, 'left', 800);
    });
    const net = mz.cnt.lr - mz.cnt.rl;
    T(L.x + 16, y + 84, '차이(순 이동) = ' + (net >= 0 ? '왼쪽 → 오른쪽 ' : '오른쪽 → 왼쪽 ') + Math.abs(net) + '번', 13.5, PUR, 'left', 800);
  }
  function drawMolInfo(t) {
    const R = RC.R, W = mzWin();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 최근 10초 동안', 14.5, INK, 'left', 800);
    [['왼쪽 → 오른쪽', W.lr, SKY], ['오른쪽 → 왼쪽', W.rl, GOOD]].forEach(([lab, v, col], i) => { T(R.x + 14, R.y + 56 + i * 26, lab, 13.5, col, 'left', 800); T(R.x + R.w - 14, R.y + 56 + i * 26, v + '번', 14.5, col, 'right', 800); });
    let y = R.y + 120;
    y += textBlock(R.x + 14, y, R.w - 28, '물 분자는 양쪽으로 모두 지나가요. 다만 더 자주 지나가는 방향이 있어서 순 이동이 생겨요.', 13.5, INK, 19, 800) + 8;
    y += textBlock(R.x + 14, y, R.w - 28, '물이 많은(농도가 낮은) 쪽의 막 표면에는 물 분자가 더 많아서 구멍에 더 자주 부딪혀요. 용액 쪽은 설탕이 자리를 차지해 물 분자의 비율이 낮아요. (증기압 내림과 같은 까닭이에요)', 13, MUTED, 18, 700) + 8;
    if (!PHONE) textBlock(R.x + 14, y, R.w - 28, '확대한 부분 밖에서 물이 채워진다고 보고 입자 수를 일정하게 그렸어요.', 12, MUTED, 16, 700);
  }
  function drawUInfo(t) {
    const R = RC.R, U = S.u;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '🔍 반투막을 확대해서 봐요', 14.5, INK, 'left', 800);
    const w = Math.min(R.w - 24, 290), h = drawMZ(R.x + (R.w - w) / 2, R.y + 56, w, false);
    let y = R.y + 56 + h + 36;
    const rows = [['왼쪽 수위', f1(hL()) + ' cm', INK], ['오른쪽 수위', f1(hR()) + ' cm', INK], ['수위 차 Δh', dhTxt() + ' cm', BAD]];
    rows.forEach((r, i) => { T(R.x + 14, y + i * 24, r[0], 13.5, r[2], 'left', 800); T(R.x + R.w - 14, y + i * 24, r[1], 14.5, r[2], 'right', 800); });
    y += 3 * 24 + 8;
    if (!PHONE || y + 30 < R.y + R.h) textBlock(R.x + 14, y, R.w - 28, '설탕 분자(분홍)는 막을 지나지 못하고, 물 분자(파랑)만 지나가요.', 13, MUTED, 18, 700);
  }

  /* ================= 카드 분류 판 (③ 변인, ④ 사례) ================= */
  const mkBoard = (cfg) => ({ cfg, cards: [], sel: -1, wrong: [], drag: null, ordN: 0 });
  function bGeo(B) {
    const L = RC.L, n = B.cfg.cards.length, nb = B.cfg.bins.length, cw = (L.w - 40) / 2, ch = PHONE ? 50 : 46, rows = Math.ceil(n / 2), py = L.y + 58, by = py + rows * (ch + 8) + 16, bw = (L.w - 28 - (nb - 1) * 10) / nb;
    return { cw, ch, by, pool: (k) => ({ x: L.x + 14 + (k % 2) * (cw + 12), y: py + Math.floor(k / 2) * (ch + 8) }), bins: Array.from({ length: nb }, (_, b) => ({ x: L.x + 14 + b * (bw + 10), y: by, w: bw, h: L.y + L.h - 14 - by })) };
  }
  function boardInit(B) {
    const G = bGeo(B);
    B.cards = B.cfg.cards.map((c, k) => { const p = G.pool(k); return Object.assign({}, c, { bin: -1, ord: 0, x: p.x, y: p.y, w: G.cw, h: G.ch, tx: p.x, ty: p.y, tw: G.cw, th: G.ch }); });
    B.sel = -1; B.wrong = []; B.drag = null; B.ordN = 0;
  }
  function boardLayout(B) {
    const G = bGeo(B); B.wrong = [];
    B.cards.forEach((c, k) => { if (c.bin < 0) { const p = G.pool(k); c.tx = p.x; c.ty = p.y; c.tw = G.cw; c.th = G.ch; } });
    G.bins.forEach((bn, b) => {
      const list = B.cards.map((c, k) => k).filter((k) => B.cards[k].bin === b).sort((p, q) => B.cards[p].ord - B.cards[q].ord);
      const th = list.length <= 4 ? 40 : 32, step = Math.min(th + 4, (bn.h - 46) / Math.max(1, list.length));
      list.forEach((k, n) => { const c = B.cards[k]; c.tx = bn.x + 6; c.ty = bn.y + 40 + n * step; c.tw = bn.w - 12; c.th = th; });
    });
  }
  function boardPlace(B, k, b) { const c = B.cards[k]; c.bin = b; c.ord = ++B.ordN; B.sel = -1; boardLayout(B); Sound.tick(); updateCtl(); }
  function boardReturn(B, k) { B.cards[k].bin = -1; B.sel = -1; boardLayout(B); updateCtl(); }
  const boardPlaced = (B) => B.cards.filter((c) => c.bin >= 0).length;
  function boardCheck(B) {
    const n = boardPlaced(B);
    if (n < B.cards.length) return '카드 ' + B.cards.length + '장을 모두 상자에 넣어 주세요. (지금 ' + n + '장)';
    B.wrong = B.cards.map((c, k) => k).filter((k) => B.cards[k].bin !== B.cards[k].a);
    if (B.wrong.length) return B.wrong.length + '장이 알맞지 않아요. 빨간 테두리 카드를 다시 생각해 봐요. ' + B.cfg.tip;
    return true;
  }
  function boardStep(B, dt) {
    B.cards.forEach((c, k) => {
      if (B.drag && B.drag.i === k && B.drag.moved) return;
      c.x = ap2(c.x, c.tx, dt, 14); c.y = ap2(c.y, c.ty, dt, 14); c.w = ap2(c.w, c.tw, dt, 14); c.h = ap2(c.h, c.th, dt, 14);
    });
  }
  function drawCard(B, c, k, lift) {
    const sel = B.sel === k, wr = B.wrong.indexOf(k) >= 0;
    D.shadow(() => { D.roundRect(c.x, c.y, c.w, c.h, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: lift ? 14 : 5, y: lift ? 6 : 2 });
    D.roundRect(c.x, c.y, c.w, c.h, 10); ctx.strokeStyle = wr ? BAD : sel ? PUR : '#cfd8ea'; ctx.lineWidth = wr || sel ? 3 : 1.5; ctx.stroke();
    const small = c.h < 36, sz = small ? 12 : 13, lh = small ? 14 : 16;
    const ls = wrap(c.t, c.w - 16, sz, 800).slice(0, 3);
    ls.forEach((l, n) => T(c.x + 8, c.y + c.h / 2 - (ls.length - 1) * lh / 2 + n * lh + 4, l, sz, INK, 'left', 800));
  }
  function drawBoard(B) {
    const L = RC.L, G = bGeo(B);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, B.cfg.title, PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '카드를 끌어 알맞은 상자에 넣어요 (또는 카드를 누르고 상자를 눌러요)', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    const hot = B.sel >= 0 || (B.drag && B.drag.moved);
    G.bins.forEach((bn, b) => {
      const bc = B.cfg.bins[b];
      D.roundRect(bn.x, bn.y, bn.w, bn.h, 12); ctx.fillStyle = C.rgba(bc.c, hot ? 0.13 : 0.07); ctx.fill(); ctx.strokeStyle = bc.c; ctx.lineWidth = hot ? 2.4 : 1.6; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
      T(bn.x + bn.w / 2, bn.y + 20, bc.n, 13.5, bc.c, 'center', 800);
      if (bc.s) T(bn.x + bn.w / 2, bn.y + 36, bc.s, 12, MUTED, 'center', 700);
    });
    B.cards.forEach((c, k) => { if (!(B.drag && B.drag.moved && B.drag.i === k)) drawCard(B, c, k, false); });
    if (B.drag && B.drag.moved) drawCard(B, B.cards[B.drag.i], B.drag.i, true);
  }
  function drawBoardInfo(B, extra) {
    const R = RC.R;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, B.cfg.infoTitle, 14.5, INK, 'left', 800);
    let y = R.y + 52;
    const c = B.sel >= 0 ? B.cards[B.sel] : null;
    if (c) { y += textBlock(R.x + 14, y, R.w - 28, c.t, 14, PUR, 20, 800) + 8; y += textBlock(R.x + 14, y, R.w - 28, c.info, 13.5, INK, 19, 700) + 10; }
    else y += textBlock(R.x + 14, y, R.w - 28, '카드를 누르면 설명이 나와요.', 13.5, MUTED, 19, 700) + 10;
    B.cfg.facts.forEach((f) => { y += textBlock(R.x + 14, y, R.w - 28, f, 13, f[0] === '※' ? MUTED : INK, 18, 800) + 6; });
  }

  /* ================= ③ 감자 실험 설계 ================= */
  const POT_C = [0, 0.10, 0.20, 0.30, 0.40], POT_P = [9.8, 4.1, -1.2, -6.3, -10.5], POT_M0 = 5.0;
  const potMass = (i) => POT_M0 * (1 + POT_P[i] / 100);
  const potN = () => S.pot.rec.filter((v) => v != null).length;
  const potCur = () => S.pot.cur * 0.005;
  function potFit() {
    const pts = []; S.pot.rec.forEach((v, i) => { if (v != null) pts.push([POT_C[i], v]); });
    if (pts.length < 2) return null;
    const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
    let sxy = 0, sxx = 0; pts.forEach((p) => { sxy += (p[0] - mx) * (p[1] - my); sxx += (p[0] - mx) * (p[0] - mx); });
    const b = sxy / sxx, a = my - b * mx; return { a, b, x0: -a / b };
  }
  const potY = (x) => { const f = potFit(); return f ? f.a + f.b * x : null; };
  function potDip() { const d = S.pot.dip; if (d.go) return; d.p = 0; d.done = false; d.go = true; Sound.click(); updateCtl(); }
  function potRecord(i) {
    const P = S.pot, d = P.dip;
    if (!d.done) { showHint('먼저 「30분 담그기」를 눌러 감자 막대를 담가요.'); Sound.fail(); return; }
    if (i == null) i = P.rec.findIndex((v) => v == null);
    if (i < 0) { showHint('5개 농도를 모두 기록했어요.'); return; }
    if (P.rec[i] != null) return;
    P.rec[i] = POT_P[i]; Sound.success(); const g = potGeo(); parts.burst(g.cx(i), g.by - 30, { count: 10, speed: 110, life: 0.5, size: 3.2 }); updateCtl();
  }
  function stepPot(dt) { const d = S.pot.dip; if (d.go) { d.p = Math.min(1, d.p + dt / 5); if (d.p >= 1) { d.go = false; d.done = true; updateCtl(); } } }
  const potGeo = () => { const L = RC.L, cw = (L.w - 24) / 5; return { cw, bw: Math.min(66, cw - 8), bh: 104, by: L.y + 292, cx: (i) => L.x + 12 + cw * (i + 0.5) }; };
  function drawPotato(cx, by, i, p, t) {
    const pct = POT_P[i] / 100, e = sm(p), len = 66 * (1 + 2.5 * pct * e), wid = 20 * (1 + 1.2 * pct * e);
    const top = by - 8 - len, x = cx - wid / 2;
    D.shadow(() => { D.roundRect(x, top, wid, len, Math.min(10, wid / 2)); ctx.fillStyle = '#e1bd78'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.save(); D.roundRect(x, top, wid, len, Math.min(10, wid / 2)); ctx.clip();
    ctx.fillStyle = 'rgba(160,110,50,.35)'; for (let k = 0; k < 9; k++) ctx.fillRect(x + 3 + hash(k, i) * (wid - 6), top + 6 + hash(k + 7, i) * (len - 12), 2.4, 2.4);
    if (pct < 0 && e > 0.1) { ctx.strokeStyle = 'rgba(120,80,30,' + clamp(e * (-pct) * 6, 0, 0.7) + ')'; ctx.lineWidth = 1.5; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x, top + k * len / 5); ctx.quadraticCurveTo(cx, top + k * len / 5 + (k % 2 ? 3 : -3), x + wid, top + k * len / 5); ctx.stroke(); } }
    ctx.restore();
    D.roundRect(x, top, wid, len, Math.min(10, wid / 2)); ctx.strokeStyle = '#b08a4a'; ctx.lineWidth = 1.6; ctx.stroke();
  }
  function drawPotRun(t) {
    const L = RC.L, P = S.pot, g = potGeo(), d = P.dip;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧪 감자 막대를 5가지 농도에 담가요', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '독립 변인 = 설탕 용액의 농도, 종속 변인 = 질량 변화율', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    // 시간 막대
    const bx = L.x + 16, bw = L.w - 32;
    D.roundRect(bx, L.y + 64, bw, 14, 7); ctx.fillStyle = '#e9eef7'; ctx.fill();
    ctx.save(); D.roundRect(bx, L.y + 64, bw, 14, 7); ctx.clip(); ctx.fillStyle = PUR; ctx.fillRect(bx, L.y + 64, bw * d.p, 14); ctx.restore();
    T(bx, L.y + 100, '⏱ 담근 시간 ' + Math.round(d.p * 30) + ' / 30분', 13.5, INK, 'left', 800);
    T(L.x + L.w - 16, L.y + 100, d.done ? '✅ 끝' : d.go ? '담그는 중' : '아직 담그지 않았어요', 13, d.done ? GOOD : MUTED, 'right', 800);
    for (let i = 0; i < 5; i++) {
      const cx = g.cx(i), x = cx - g.bw / 2, y = g.by - g.bh, rec = P.rec[i] != null;
      T(cx, L.y + 150, POT_C[i] === 0 ? '0 M' : POT_C[i].toFixed(2) + ' M', 14, POT_C[i] === 0 ? '#0369a1' : SUGD, 'center', 800);
      if (POT_C[i] === 0) T(cx, L.y + 168, '(증류수)', 12, '#0369a1', 'center', 700); else T(cx, L.y + 168, '설탕 용액', 12, MUTED, 'center', 700);
      D.beaker(x, y, g.bw, g.bh, { level: 0.82, liquid: C.mix('#9fd6ff', '#f6a6cf', clamp(POT_C[i] / 0.5, 0, 1) * 0.7), t, wave: 1, glass: '#8fa3bd' });
      drawPotato(cx, g.by, i, d.p, t);
      if (d.done) {
        D.label(cx, g.by + 24, sg1(POT_P[i]) + ' %', { size: 13.5, bg: POT_P[i] > 0 ? '#2563eb' : POT_P[i] < -3 ? '#c2410c' : '#475569', align: 'center' });
        T(cx, g.by + 46, f3(potMass(i)) + ' g', 12, MUTED, 'center', 700);
        T(cx, g.by + 64, rec ? '✅ 기록함' : '👆 눌러 기록', 12.5, rec ? GOOD : PUR, 'center', 800);
      }
    }
    T(L.x + 16, L.y + L.h - 26, '막대 변화는 알아보기 쉽게 과장해서 그렸어요. 처음 질량은 모두 5.0 g이에요.', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
  }
  const f3 = (v) => v.toFixed(3);
  const potGraph = () => { const L = RC.L; return { x: L.x + 64, y: L.y + 78, w: L.w - 96, h: L.h - 160, xmax: 0.42, ymin: -12, ymax: 12 }; };
  function drawPotGraph(t) {
    const L = RC.L, P = S.pot, g = potGraph(), X = (v) => g.x + v / g.xmax * g.w, Y = (v) => g.y + g.h - (v - g.ymin) / (g.ymax - g.ymin) * g.h;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '📈 감자 막대의 질량 변화율–농도 그래프', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 48, '변화율이 0 %가 되는 농도에서는 물이 들어가지도 나오지도 않아요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    ctx.fillStyle = '#fbfdff'; D.roundRect(g.x, g.y, g.w, g.h, 6); ctx.fill();
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    for (let v = -12; v <= 12; v += 4) { ctx.beginPath(); ctx.moveTo(g.x, Y(v)); ctx.lineTo(g.x + g.w, Y(v)); ctx.stroke(); T(g.x - 8, Y(v) + 4, String(v).replace('-', '−'), 12, MUTED, 'right', 700); }
    for (let x = 0; x <= 0.4001; x += 0.1) { ctx.beginPath(); ctx.moveTo(X(x), g.y); ctx.lineTo(X(x), g.y + g.h); ctx.stroke(); T(X(x), g.y + g.h + 17, x.toFixed(2), 12, MUTED, 'center', 700); }
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, Y(0)); ctx.lineTo(g.x + g.w, Y(0)); ctx.stroke();
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x, g.y + g.h); ctx.stroke();
    T(g.x + g.w, g.y + g.h + 36, '설탕 용액의 농도 (M) →', 12.5, MUTED, 'right', 800); T(g.x - 6, g.y - 8, '질량 변화율 (%)', 12.5, MUTED, 'left', 800);
    const f = potFit();
    if (f && potN() >= 3) { ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip(); ctx.strokeStyle = BAD; ctx.lineWidth = 2.6; ctx.setLineDash([8, 5]); ctx.beginPath(); ctx.moveTo(X(0), Y(f.a)); ctx.lineTo(X(g.xmax), Y(f.a + f.b * g.xmax)); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
    P.rec.forEach((v, i) => { if (v != null) { D.sphere(X(POT_C[i]), Y(v), 7, '#d97706', { gloss: true, outline: '#fff', shadow: true }); T(X(POT_C[i]) + 10, Y(v) - 8, sg1(v), 12, INK, 'left', 800, HALO); } });
    const cx = potCur(), yy = potY(cx);
    ctx.strokeStyle = PUR; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(X(cx), g.y); ctx.lineTo(X(cx), g.y + g.h); ctx.stroke();
    if (yy != null && potN() >= 3) { D.sphere(X(cx), clamp(Y(yy), g.y + 4, g.y + g.h - 4), 5.5, '#fff', { gloss: false, outline: PUR, outlineWidth: 2.6 }); D.label(clamp(X(cx) + 70, g.x + 80, g.x + g.w - 80), g.y + 20, '눈금 ' + cx.toFixed(3) + ' M → ' + sg1(yy) + ' %', { size: 12.5, bg: PUR, align: 'center' }); }
    else D.label(g.x + g.w / 2, g.y + 20, potN() < 3 ? '먼저 측정 화면에서 결과를 기록해요 (' + potN() + ' / 5)' : '', { size: 12.5, bg: '#64748b', align: 'center' });
    if (f && potN() === 5 && Math.abs(r1(yy)) <= 0.5) D.label(X(cx), Y(0) - 22, '질량 변화 0 → 등장액', { size: 12.5, bg: GOOD, align: 'center' });
  }
  function drawPotInfo(t) {
    const R = RC.R, P = S.pot;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 결과 기록표', 14.5, INK, 'left', 800);
    const cx = [R.x + 16, R.x + R.w * 0.3, R.x + R.w * 0.66], hy = R.y + 52;
    ['농도(M)', '나중 질량(g)', '변화율(%)'].forEach((h, k) => T(cx[k], hy, h, 12, MUTED, 'left', 800));
    ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(R.x + 12, hy + 8); ctx.lineTo(R.x + R.w - 12, hy + 8); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const y = hy + 30 + i * 26, has = P.rec[i] != null;
      T(cx[0], y, POT_C[i].toFixed(2), 13.5, INK, 'left', 800);
      T(cx[1], y, has ? f3(potMass(i)) : '—', 13.5, has ? INK : '#9aa6bb', 'left', 800);
      T(cx[2], y, has ? sg1(POT_P[i]) : '—', 13.5, has ? (POT_P[i] > 0 ? '#2563eb' : '#c2410c') : '#9aa6bb', 'left', 800);
    }
    let y = hy + 30 + 5 * 26 + 6;
    const ok = S.pot.bd && boardCheck(S.pot.bd) === true;
    D.roundRect(R.x + 12, y, R.w - 24, 122, 10); ctx.fillStyle = 'rgba(124,58,237,.07)'; ctx.fill(); ctx.strokeStyle = '#d6c8f7'; ctx.lineWidth = 1.4; ctx.stroke();
    T(R.x + 22, y + 20, '🔎 설계 점검', 13.5, PUR, 'left', 800);
    [['대조군이 있나요?', '0 M(증류수)에 담근 막대'], ['같은 조건인가요?', '크기·시간·온도·부피를 같게']].forEach((r, k) => { T(R.x + 22, y + 44 + k * 38, (ok ? '✅ ' : '⬜ ') + r[0], 13, ok ? GOOD : MUTED, 'left', 800); T(R.x + 38, y + 62 + k * 38, r[1], 12, MUTED, 'left', 700); });
    y += 122 + 12;
    if (!PHONE) textBlock(R.x + 14, y, R.w - 28, '농도가 진할수록 감자 속 물이 용액 쪽으로 빠져나가 질량이 줄어요.', 12.5, INK, 17, 800);
  }

  /* ================= ④ 적혈구 ================= */
  const SOLN = [{ n: '저장액', w: '증류수 (0 %)', pc: 0, tg: 1.75 }, { n: '등장액', w: '0.9 % NaCl 용액', pc: 0.9, tg: 1.0 }, { n: '고장액', w: '3 % NaCl 용액', pc: 3, tg: 0.66 }];
  const LIFE = () => S.life;
  function newCell() { const Lf = S.life; Lf.v = 1; Lf.lysed = false; Lf.lt = 0; Lf.tIso = 0; parts.clear(); updateCtl(); }
  function setSol(i) { const Lf = S.life; if (Lf.sol !== i) Lf.tIso = 0; Lf.sol = i; updateCtl(); }
  function stepLife(dt) {
    const Lf = S.life;
    if (!Lf.lysed) {
      Lf.v = ap2(Lf.v, SOLN[Lf.sol].tg, dt, 0.5);
      if (Lf.v > 1.45) { Lf.lysed = true; Lf.lt = 0; Lf.seen.lys = true; const c = rbcPos(); parts.burst(c.x, c.y, { count: 22, speed: 150, life: 0.9, size: 3.6, colors: ['#e11d48', '#fb7185', '#fecdd3'], gravity: 60 }); Sound.fail(); updateCtl(); }
      if (Lf.sol === 1) Lf.tIso += dt;
      if (Lf.sol === 1 && Lf.tIso >= 3) Lf.seen.iso = true;
      if (Lf.sol === 2 && Lf.v < 0.74) Lf.seen.cren = true;
    } else Lf.lt += dt;
    if (!RM && S.mode === 'life' && S.sub.life === 'rbc' && Lf.lysed && Lf.lt < 2.5) { Lf.acc += dt; while (Lf.acc > 0.12) { Lf.acc -= 0.12; const c = rbcPos(); parts.emit({ x: c.x + rnd(-30, 30), y: c.y + rnd(-30, 30), vx: rnd(-10, 10), vy: rnd(-12, 4), life: 1.4, size: rnd(9, 15), color: 'rgba(225,60,80,.45)', shape: 'smoke', fade: true }); } }
  }
  const rbcPos = () => { const L = RC.L; return { x: L.x + L.w / 2, y: L.y + 218 }; };
  function drawCell(cx, cy, v, t) {
    const R0 = 50, R = R0 * Math.sqrt(v), cren = clamp((1 - v) / 0.26, 0, 1), swell = clamp((v - 1) / 0.5, 0, 1);
    ctx.save(); ctx.translate(cx, cy);
    const path = () => { ctx.beginPath(); const n = 72; for (let k = 0; k <= n; k++) { const a = k / n * TAU, rr = R * (1 + 0.1 * cren * Math.sin(a * 12 + 0.4) + (RM ? 0 : 0.012 * Math.sin(a * 3 + t * 3) * swell)); const x = Math.cos(a) * rr, y = Math.sin(a) * rr; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); };
    D.shadow(() => { path(); ctx.fillStyle = RBC; ctx.fill(); }, { blur: 12, y: 4, color: 'rgba(120,20,40,.35)' });
    const g = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R * 1.05); g.addColorStop(0, '#f4627a'); g.addColorStop(0.7, RBC); g.addColorStop(1, '#8e1a2c'); ctx.fillStyle = g; path(); ctx.fill();
    const dimple = clamp(1 - swell * 1.3, 0, 1) * (1 - cren * 0.3);
    if (dimple > 0.02) { ctx.fillStyle = 'rgba(120,16,34,' + 0.45 * dimple + ')'; ctx.beginPath(); ctx.ellipse(0, 0, R * 0.46, R * 0.46 * 0.92, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.ellipse(-R * 0.18, -R * 0.2, R * 0.2, R * 0.1, -0.6, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; path(); ctx.stroke();
    ctx.restore();
  }
  function drawRbc(t) {
    const L = RC.L, Lf = S.life, so = SOLN[Lf.sol], c = rbcPos();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🩸 적혈구를 여러 용액에 넣어 봐요', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '적혈구 안의 용액은 0.9 % NaCl 용액과 농도가 같아요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    const bx = L.x + 16, by = L.y + 62, bw = L.w - 32, bh = 300;
    ctx.save(); D.roundRect(bx, by, bw, bh, 14); ctx.clip();
    ctx.fillStyle = C.mix('#e3f2ff', '#fde6c8', clamp(so.pc / 3, 0, 1) * 0.8); ctx.fillRect(bx, by, bw, bh);
    // 물 분자와 이온 (장식)
    const rc = 50 * Math.sqrt(Lf.v) + 8;
    for (let k = 0; k < 26; k++) {
      const x = bx + bw * (0.5 + 0.46 * Math.sin(t * (0.3 + hash(k, 1) * 0.5) + k * 2.1)), y = by + bh * (0.5 + 0.46 * Math.sin(t * (0.25 + hash(k, 2) * 0.5) + k * 1.3));
      if (!Lf.lysed && Math.hypot(x - c.x, y - c.y) < rc) continue;
      D.sphere(x, y, 3.4, WAT, { gloss: false });
    }
    const nIon = so.pc === 0 ? 0 : so.pc < 1 ? 14 : 38;
    for (let k = 0; k < nIon; k++) {
      const x = bx + bw * (0.5 + 0.47 * Math.sin(t * (0.15 + hash(k, 5) * 0.3) + k * 1.7)), y = by + bh * (0.5 + 0.47 * Math.sin(t * (0.12 + hash(k, 6) * 0.3) + k * 2.9));
      if (!Lf.lysed && Math.hypot(x - c.x, y - c.y) < rc) continue;
      D.sphere(x, y, 4, k % 2 ? '#22c55e' : '#94a3b8', { gloss: false });
    }
    ctx.restore();
    D.roundRect(bx, by, bw, bh, 14); ctx.strokeStyle = '#b6c3dc'; ctx.lineWidth = 1.8; ctx.stroke();
    if (!Lf.lysed) {
      drawCell(c.x, c.y - 0 + 0, Lf.v, t);
      // 물의 이동 화살표
      const gap = SOLN[Lf.sol].tg - Lf.v, R = 50 * Math.sqrt(Lf.v);
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * TAU + 0.2, ux = Math.cos(a), uy = Math.sin(a);
        if (Math.abs(gap) > 0.04) {
          const inward = gap > 0, a0 = inward ? R + 38 : R + 10, a1 = inward ? R + 14 : R + 34;
          D.arrow(c.x + ux * a0, c.y + uy * a0, c.x + ux * a1, c.y + uy * a1, { color: '#0ea5e9', width: 3, head: 9, alpha: clamp(Math.abs(gap) * 1.6, 0.3, 0.95) });
        } else if (k % 2 === 0) {
          const ux2 = Math.cos(a + 0.3), uy2 = Math.sin(a + 0.3);
          D.arrow(c.x + ux * (R + 12), c.y + uy * (R + 12), c.x + ux * (R + 28), c.y + uy * (R + 28), { color: '#7dd3fc', width: 2, head: 6, alpha: 0.75 });
          D.arrow(c.x + ux2 * (R + 28), c.y + uy2 * (R + 28), c.x + ux2 * (R + 12), c.y + uy2 * (R + 12), { color: '#7dd3fc', width: 2, head: 6, alpha: 0.75 });
        }
      }
    } else {
      ctx.strokeStyle = 'rgba(190,30,60,.6)'; ctx.lineWidth = 2.4; ctx.setLineDash([6, 6]); [[0.3, 1.9], [2.3, 3.6], [4.0, 5.5]].forEach(([a0, a1], k) => { ctx.beginPath(); ctx.arc(c.x + Math.cos(k * 2) * Lf.lt * 6, c.y + Math.sin(k * 2) * Lf.lt * 6, 58 + k * 6, a0, a1); ctx.stroke(); }); ctx.setLineDash([]);
      D.label(c.x, c.y + 4, '용혈: 세포막이 터졌어요', { size: 14, bg: BAD, align: 'center' });
    }
    D.label(L.x + L.w / 2, by + 20, so.n + ' · ' + so.w, { size: 13.5, bg: Lf.sol === 0 ? '#2563eb' : Lf.sol === 1 ? GOOD : '#c2410c', align: 'center' });
    const msg = Lf.lysed ? '세포 안으로 물이 너무 많이 들어와 세포가 터졌어요. 「새 적혈구 넣기」로 다시 해 봐요.' : Lf.sol === 0 ? '세포 밖이 더 묽어요. 물이 세포 안으로 들어와서 세포가 부풀어요.' : Lf.sol === 1 ? '세포 안과 밖의 농도가 같아요. 물이 들어가고 나가는 양이 같아서 모양이 그대로예요.' : '세포 밖이 더 진해요. 물이 세포 밖으로 빠져나가서 세포가 쭈그러들어요.';
    textBlock(L.x + 16, by + bh + 28, L.w - 32, msg, PHONE ? 13 : 13.5, INK, 19, 800);
  }
  function drawRbcInfo(t) {
    const R = RC.R, Lf = S.life, so = SOLN[Lf.sol];
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '⚖️ 안과 밖의 농도 비교', 14.5, INK, 'left', 800);
    let y = R.y + 52;
    [['세포 안', '약 0.9 %', INK], ['세포 밖', (so.pc === 0 ? '0 %' : so.pc + ' %'), so.pc > 0.9 ? '#c2410c' : so.pc < 0.9 ? '#2563eb' : GOOD], ['세포의 부피', Lf.lysed ? '터짐' : '×' + Lf.v.toFixed(2), BAD]].forEach((r, i) => { T(R.x + 14, y + i * 26, r[0], 13.5, r[2], 'left', 800); T(R.x + R.w - 14, y + i * 26, r[1], 14.5, r[2], 'right', 800); });
    y += 3 * 26 + 8;
    [['저장액', 0, '세포 안보다 묽은 용액. 세포가 부풀어요.', '#2563eb'], ['등장액', 1, '세포 안과 농도가 같은 용액. 모양 그대로.', GOOD], ['고장액', 2, '세포 안보다 진한 용액. 세포가 쭈그러들어요.', '#c2410c']].forEach(([nm, k, d, col]) => {
      const seen = k === 0 ? Lf.seen.lys : k === 1 ? Lf.seen.iso : Lf.seen.cren;
      T(R.x + 14, y + 4, (seen ? '✅ ' : '⬜ ') + nm, 13.5, col, 'left', 800); y += 20;
      y += textBlock(R.x + 28, y, R.w - 44, d, 12.5, MUTED, 17, 700) + 8;
    });
  }

  /* ================= 카드 자료 ================= */
  S.pot.bd = mkBoard({
    title: '📝 이 실험의 변인을 나눠 봐요', infoTitle: '💡 변인 설명', tip: '바꾸는 것, 재는 것, 같게 하는 것으로 나누어 봐요.',
    bins: [{ n: '독립 변인', s: '바꾸는 것', c: '#7c3aed' }, { n: '종속 변인', s: '재는 것', c: '#0ea5e9' }, { n: '통제 변인', s: '같게 하는 것', c: '#16a34a' }],
    cards: [
      { t: '설탕 용액의 농도', a: 0, info: '실험에서 일부러 바꾸는 값이에요. 0, 0.10, 0.20, 0.30, 0.40 M 으로 달리해요. → 독립 변인' },
      { t: '감자 막대의 질량 변화율', a: 1, info: '농도에 따라 달라지는 결과로, 실험에서 재는 값이에요. 변화율(%) = (나중 질량 − 처음 질량) / 처음 질량 × 100 → 종속 변인' },
      { t: '감자 막대의 크기와 처음 질량', a: 2, info: '모든 막대를 같은 크기, 5.0 g으로 맞춰요. 달라지면 결과를 비교할 수 없어요. → 통제 변인' },
      { t: '담가 두는 시간', a: 2, info: '모든 막대를 같은 시간(30분) 동안 담가요. → 통제 변인' },
      { t: '용액의 부피와 온도', a: 2, info: '용액의 부피와 온도도 같게 해요. → 통제 변인' },
    ],
    facts: ['한 번에 한 가지(독립 변인)만 바꾸고 나머지(통제 변인)는 같게 해야 결과의 까닭을 알 수 있어요.', '0 M(증류수)에 담근 막대는 비교의 기준이 되는 대조군이에요.'],
  });
  S.life.bd = mkBoard({
    title: '🃏 물은 어느 쪽으로 이동할까요?', infoTitle: '💡 사례 설명', tip: '세포 안과 밖 중 어느 쪽 용액이 더 진한지 생각해요.',
    bins: [{ n: '💧 물이 세포 안으로', c: '#2563eb' }, { n: '💧 물이 세포 밖으로', c: '#c2410c' }],
    cards: [
      { t: '배추를 소금에 절이면 숨이 죽어요', a: 1, info: '세포 밖의 소금물이 세포 안보다 진해서 세포 안의 물이 밖으로 나와요. 그래서 부피가 줄어 숨이 죽어요.' },
      { t: '민달팽이에 소금을 뿌리면 쪼그라들어요', a: 1, info: '소금이 몸 표면에서 진한 용액이 되어, 몸속의 물이 밖으로 빠져나가요.' },
      { t: '시든 채소를 물에 담그면 살아나요', a: 0, info: '물이 세포 안의 용액보다 묽어서 물이 세포 안으로 들어가요. 세포가 팽팽해져요.' },
      { t: '증류수를 혈관에 주사하면 적혈구가 터져요', a: 0, info: '증류수는 혈액보다 훨씬 묽어서 적혈구 안으로 물이 들어가요. 그래서 링거액은 혈액과 농도가 같은 0.9 % 로 만들어요.' },
      { t: '바닷물을 마시면 오히려 갈증이 나요', a: 1, info: '바닷물(약 3.5 %)은 몸속 세포보다 진해서 세포 속의 물이 밖으로 나가요. 그래서 탈수가 돼요.' },
      { t: '꿀·설탕에 절인 과일은 쪼그라들어요', a: 1, info: '진한 설탕물이 과일 세포 속의 물을 끌어내요. 미생물 세포에서도 물이 빠져 잘 자라지 못해서 오래 보관돼요.' },
      { t: '물에 담근 건포도가 부풀어요', a: 0, info: '건포도 속 당 농도가 물보다 높아서 물이 안으로 들어와 부풀어요.' },
      { t: '식물 뿌리털이 땅속 물을 빨아들여요', a: 0, info: '뿌리털 세포의 용액이 흙 속의 물보다 진해서 물이 세포 안으로 들어와요.' },
    ],
    facts: ['물은 농도가 낮은(물이 많은) 쪽에서 농도가 높은 쪽으로 이동해요.', '링거액은 혈액과 같은 0.9 % NaCl 용액(등장액)이에요.'],
  });
  const boardOf = () => (S.mode === 'pot' && S.sub.pot === 'vars' ? S.pot.bd : S.mode === 'life' && S.sub.life === 'cards' ? S.life.bd : null);

  /* ================= 컨트롤 · 공통 ================= */
  const solBox = $('#solChips');
  SOLN.forEach((s, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.i = i; b.textContent = i === 0 ? '증류수 0 %' : s.pc + ' % NaCl';
    b.setAttribute('aria-label', s.n + ' ' + s.w);
    b.addEventListener('click', () => { Sound.click(); setSol(i); });
    solBox.appendChild(b);
  });
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => {
      const toks = n.getAttribute('data-show').split(' ');
      n.hidden = !toks.some((tk) => { const [m, v] = tk.split(':'); return m === S.mode && (v == null || S.sub[m] === v); });
    });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#potSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.pot));
    $$('#lifeSub button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.sub.life));
    $('#oCl').textContent = fM(S.iL); $('#sCl').value = S.iL; $('#clMinus').disabled = S.iL <= 0; $('#clPlus').disabled = S.iL >= 10;
    $('#oCr').textContent = fM(S.iR); $('#sCr').value = S.iR; $('#crMinus').disabled = S.iR <= 0; $('#crPlus').disabled = S.iR >= 10;
    const d = S.pot.dip;
    $('#bDip').textContent = d.go ? '담그는 중…' : d.done ? '↻ 다시 담그기' : '▶ 30분 담그기'; $('#bDip').disabled = d.go;
    $('#bRecPot').textContent = potN() === 5 ? '✅ 모두 기록했어요' : '📝 다음 결과 기록 (' + potN() + ' / 5)'; $('#bRecPot').disabled = potN() === 5 || d.go;
    $('#oPc').textContent = potCur().toFixed(3) + ' M'; $('#sPc').value = S.pot.cur; $('#pcMinus').disabled = S.pot.cur <= 0; $('#pcPlus').disabled = S.pot.cur >= 80;
    $$('#solChips button').forEach((b, i) => b.classList.toggle('on', i === S.life.sol));
    $('#oSol').textContent = SOLN[S.life.sol].n;
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) {
    if (S.mode !== m) { S.fade = 1; parts.clear(); }
    S.mode = m; updateCtl();
  }
  function setSub(m, v) { S.sub[m] = v; updateCtl(); }
  const mzCountReset = () => { mz.cnt = { lr: 0, rl: 0 }; mz.ev = []; };
  const setIL = (v) => { v = clamp(Math.round(v), 0, 10); if (v !== S.iL) { S.iL = v; mzCountReset(); } updateCtl(); };
  const setIR = (v) => { v = clamp(Math.round(v), 0, 10); if (v !== S.iR) { S.iR = v; mzCountReset(); } updateCtl(); };
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $$('#potSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub('pot', b.dataset.v); }));
  $$('#lifeSub button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub('life', b.dataset.v); }));
  $('#sCl').addEventListener('input', (e) => setIL(+e.target.value));
  $('#clMinus').addEventListener('click', () => { Sound.tick(); setIL(S.iL - 1); });
  $('#clPlus').addEventListener('click', () => { Sound.tick(); setIL(S.iL + 1); });
  $('#sCr').addEventListener('input', (e) => setIR(+e.target.value));
  $('#crMinus').addEventListener('click', () => { Sound.tick(); setIR(S.iR - 1); });
  $('#crPlus').addEventListener('click', () => { Sound.tick(); setIR(S.iR + 1); });
  $('#bDip').addEventListener('click', () => potDip());
  $('#bRecPot').addEventListener('click', () => potRecord());
  const setPc = (v) => { S.pot.cur = clamp(Math.round(v), 0, 80); updateCtl(); };
  $('#sPc').addEventListener('input', (e) => setPc(+e.target.value));
  $('#pcMinus').addEventListener('click', () => { Sound.tick(); setPc(S.pot.cur - 1); });
  $('#pcPlus').addEventListener('click', () => { Sound.tick(); setPc(S.pot.cur + 1); });
  $('#bPotCards').addEventListener('click', () => { Sound.click(); boardInit(S.pot.bd); boardLayout(S.pot.bd); updateCtl(); });
  $('#bLifeCards').addEventListener('click', () => { Sound.click(); boardInit(S.life.bd); boardLayout(S.life.bd); updateCtl(); });
  $('#bNewCell').addEventListener('click', () => { Sound.click(); newCell(); });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'u') { S.iL = 0; S.iR = 10; S.u.dh = 0; S.u.tSame = 0; mzCountReset(); }
    else if (S.mode === 'mol') { S.iL = 0; S.iR = 10; mzReset(); }
    else if (S.mode === 'pot') { if (S.sub.pot === 'vars') { boardInit(S.pot.bd); boardLayout(S.pot.bd); } else if (S.sub.pot === 'run') { S.pot.rec = [null, null, null, null, null]; S.pot.dip = { p: 0, go: false, done: false }; } else S.pot.cur = 40; }
    else if (S.sub.life === 'rbc') { S.life.sol = 1; S.life.seen = { lys: false, iso: false, cren: false }; newCell(); } else { boardInit(S.life.bd); boardLayout(S.life.bd); }
    updateCtl();
  });

  /* ================= 포인터 ================= */
  let dragCur = false;
  const potCurFrom = (p) => { const g = potGraph(); setPc(clamp((p.x - g.x) / g.w * g.xmax, 0, 0.4) / 0.005); };
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'pot' && S.sub.pot === 'run') {
        const g = potGeo(), L = RC.L;
        for (let i = 0; i < 5; i++) if (inRect(p, { x: g.cx(i) - g.cw / 2, y: L.y + 140, w: g.cw, h: 250 })) { potRecord(i); return true; }
        return false;
      }
      if (S.mode === 'pot' && S.sub.pot === 'graph') { const g = potGraph(); if (inRect(p, { x: g.x - 10, y: g.y - 10, w: g.w + 20, h: g.h + 30 })) { dragCur = true; potCurFrom(p); return true; } return false; }
      const B = boardOf();
      if (B) {
        let hit = -1;
        for (let k = B.cards.length - 1; k >= 0; k--) { const c = B.cards[k]; if (inRect(p, { x: c.x, y: c.y, w: c.w, h: c.h })) { hit = k; break; } }
        B.drag = { i: hit, sx: p.x, sy: p.y, moved: false, ox: 0, oy: 0 }; return true;
      }
      return false;
    },
    move(p) {
      if (dragCur) { potCurFrom(p); return; }
      const B = boardOf(); if (!B) return; const d = B.drag; if (!d || d.i < 0) return;
      const c = B.cards[d.i], G = bGeo(B);
      if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 7) { d.moved = true; c.w = c.tw = G.cw; c.h = c.th = G.ch; d.ox = G.cw / 2; d.oy = G.ch / 2; B.sel = -1; }
      if (d.moved) { c.x = clamp(p.x - d.ox, 2, VW - c.w - 2); c.y = clamp(p.y - d.oy, 2, VH - c.h - 2); }
    },
    up(p) {
      if (dragCur) { dragCur = false; return; }
      const B = boardOf(); if (!B) return;
      const d = B.drag; B.drag = null; if (!d) return;
      const G = bGeo(B), binAt = G.bins.findIndex((b) => inRect(p, b));
      if (d.i >= 0 && d.moved) { if (binAt >= 0) boardPlace(B, d.i, binAt); else boardReturn(B, d.i); return; }
      if (d.i >= 0) {
        const c = B.cards[d.i];
        if (B.sel >= 0 && B.sel !== d.i && c.bin >= 0 && B.cards[B.sel].bin !== c.bin) { boardPlace(B, B.sel, c.bin); return; }
        B.sel = B.sel === d.i ? -1 : d.i; Sound.tick(); updateCtl(); return;
      }
      if (B.sel >= 0) { if (binAt >= 0) boardPlace(B, B.sel, binAt); else if (B.cards[B.sel].bin >= 0 && p.y < G.by) boardReturn(B, B.sel); else B.sel = -1; }
    },
    hover(p) {
      if (S.mode === 'pot' && S.sub.pot === 'graph') return inRect(p, potGraph()) ? 'ew-resize' : null;
      if (S.mode === 'pot' && S.sub.pot === 'run') { const g = potGeo(), L = RC.L; return S.pot.dip.done && [0, 1, 2, 3, 4].some((i) => inRect(p, { x: g.cx(i) - g.cw / 2, y: L.y + 140, w: g.cw, h: 250 })) ? 'pointer' : null; }
      const B = boardOf(); if (B) return B.cards.some((c) => inRect(p, { x: c.x, y: c.y, w: c.w, h: c.h })) ? 'grab' : null;
      return null;
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'u') { L1 = '왼쪽 수위'; a = f1(hL()) + ' cm'; L2 = '오른쪽 수위'; b = f1(hR()) + ' cm'; L3 = '수위 차 Δh'; c = dhTxt() + ' cm'; }
    else if (S.mode === 'mol') { L1 = '왼쪽 → 오른쪽'; a = mz.cnt.lr + '번'; L2 = '오른쪽 → 왼쪽'; b = mz.cnt.rl + '번'; L3 = '순 이동'; c = Math.abs(mz.cnt.lr - mz.cnt.rl) + '번 ' + (mz.cnt.lr >= mz.cnt.rl ? '(→)' : '(←)'); }
    else if (S.mode === 'pot') {
      if (S.sub.pot === 'vars') { const B = S.pot.bd; L1 = '상자에 넣은 카드'; a = boardPlaced(B) + ' / ' + B.cards.length; L2 = '선택한 카드'; b = B.sel >= 0 ? B.cards[B.sel].t.slice(0, 11) + '…' : '—'; L3 = '변인'; c = '독립 · 종속 · 통제'; }
      else if (S.sub.pot === 'run') { L1 = '담근 시간'; a = Math.round(S.pot.dip.p * 30) + ' / 30분'; L2 = '기록한 결과'; b = potN() + ' / 5'; L3 = '처음 질량'; c = '5.0 g'; }
      else { const y = potY(potCur()); L1 = '농도 눈금'; a = potCur().toFixed(3) + ' M'; L2 = '질량 변화율'; b = y == null || potN() < 3 ? '—' : sg1(y) + ' %'; L3 = '기록한 결과'; c = potN() + ' / 5'; }
    } else if (S.sub.life === 'rbc') { const Lf = S.life; L1 = '세포 밖 용액'; a = SOLN[Lf.sol].n; L2 = '세포의 부피'; b = Lf.lysed ? '터짐' : '×' + Lf.v.toFixed(2); L3 = '관찰한 용액'; c = (Lf.seen.lys + Lf.seen.iso + Lf.seen.cren) + ' / 3'; }
    else { const B = S.life.bd; L1 = '상자에 넣은 카드'; a = boardPlaced(B) + ' / ' + B.cards.length; L2 = '선택한 카드'; b = B.sel >= 0 ? B.cards[B.sel].t.slice(0, 11) + '…' : '—'; L3 = '상자'; c = '세포 안 · 세포 밖'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const potFill = () => { if (potN() < 5) { for (let i = 0; i < 5; i++) if (S.pot.rec[i] == null) S.pot.rec[i] = POT_P[i]; S.pot.dip.done = true; S.pot.dip.p = 1; return true; } return false; };
  const lifeSeen = () => S.life.seen;
  const levels = [
    {
      title: '반투막: 수위가 달라져요', short: '반투막', icon: '🥼', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 용매인 물은 어느 쪽으로, 왜 움직일까? 이동하는 양은 농도 차와 어떤 관계가 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학(세포막)과 앞 차시(증기압 내림)에서</b> 물이 농도가 낮은 쪽에서 높은 쪽으로 이동한다는 것과, 용질이 녹으면 용매의 증기압이 내려간다는 것을 배웠어요. 이번에는 그 까닭을 입자 수준에서 찾아봐요.</div>' +
        '<p>U자관 가운데에 <b>반투막</b>(물 분자는 지나가고 설탕 분자는 지나가지 못하는 막)이 있어요. 왼쪽과 오른쪽 용액의 농도를 바꾸며 <b>수위</b>가 어떻게 달라지는지 관찰해요.</p>',
      features: ['u'],
      setup() { S.lock = false; setMode('u'); },
      recap: '반투막을 사이에 두고 농도가 다른 두 용액이 있으면, 물이 농도가 낮은 쪽에서 높은 쪽으로 이동해 농도가 높은 쪽의 수위가 올라가요. 농도가 같으면 수위 차가 없어요.',
      summary: '<ul><li><b>반투막</b>: 용매(물) 분자는 통과시키고 용질(설탕) 분자는 통과시키지 못하는 막.</li><li><b>삼투 현상</b>: 반투막을 사이에 두고 물이 농도가 낮은 용액에서 농도가 높은 용액 쪽으로 이동하는 현상.</li><li>왼쪽 물, 오른쪽 0.50 M 설탕 용액이면 오른쪽 수위가 올라가 수위 차가 커지다가 멈춰요(이 모형에서 약 12 cm). 농도 차가 클수록 수위 차도 커요.</li><li>양쪽 농도가 같으면 물의 순 이동이 없어 수위 차가 0이에요.</li></ul>',
      missions: [
        {
          title: '농도가 다를 때와 같을 때의 수위',
          goal: '① 왼쪽 물, 오른쪽 0.50 M에서 수위 차가 4 cm 이상 벌어지는 것을 관찰해요. ② 양쪽 농도를 같게 맞추고 수위 차가 0이 되는 것을 확인해요.',
          hint: '① 처음 설정 그대로 두고 오른쪽 수위가 올라가길 기다려요. ② 그다음 왼쪽 농도를 오른쪽과 같게 맞추고 수위 차가 0으로 돌아올 때까지 기다려요.',
          setup() { S.lock = true; S.iL = 0; S.iR = 10; S.u.dh = 0; S.u.tSame = 0; S.u.seen = { diff: false, same: false }; mzCountReset(); setMode('u'); },
          check: () => S.u.seen.diff && S.u.seen.same, hold: 0.3,
          status: () => '① 농도가 다를 때 수위 차 4 cm 이상 ' + mark(S.u.seen.diff) + ' &nbsp; ② 농도를 같게 한 뒤 수위 차 0 ' + mark(S.u.seen.same) + ' &nbsp; (Δh ' + dhTxt() + ' cm)',
          explain: '농도가 다르면 물이 <b>농도가 낮은 쪽 → 높은 쪽</b>으로 이동해서 농도가 높은 쪽의 수위가 올라가요. 농도가 같으면 한쪽으로 가는 물의 순 이동이 없어서 수위 차가 <b>0</b>이에요.',
        },
        {
          type: 'quiz', title: '수위가 올라가는 쪽',
          goal: 'U자관의 왼쪽에는 순수한 물, 오른쪽에는 0.50 M 설탕 용액이 있어요. 수위가 올라가는 쪽은?',
          setup() { S.lock = true; setMode('u'); },
          choices: ['왼쪽(물). 물이 설탕 용액 쪽에서 나오기 때문이에요', '오른쪽(설탕 용액). 물이 설탕 용액 쪽으로 이동하기 때문이에요', '양쪽 모두 올라가요', '아무 변화가 없어요'],
          answer: 1,
          feedback: ['물은 농도가 높은 쪽(설탕 용액)으로 이동해요. 반대로 생각했어요.', '', '물이 한쪽에서 다른 쪽으로 이동하므로 한쪽은 올라가고 한쪽은 내려가요.', '농도가 다르면 물이 이동해서 수위가 달라져요.'],
          explain: '물은 농도가 낮은(물이 많은) 쪽 → 농도가 높은 쪽으로 이동해요. 그래서 <b>오른쪽(설탕 용액)</b>의 수위가 올라가요. 설탕 분자는 반투막을 지나지 못해요.',
        },
      ],
    },
    {
      title: '입자 모형: 막을 지나는 물 분자', short: '입자 모형', icon: '🔬', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 농도가 높은 쪽으로 물이 이동해 수위가 올라가는 것을 보았어요. <b>왜</b> 그런지 막 근처의 분자를 확대해서 살펴봐요. (앞 차시에서 용질이 표면의 자리를 차지해 증기압이 내려갔던 것을 떠올려요.)</div>' +
        '<p>반투막에는 물 분자만 지나갈 수 있는 작은 구멍이 있어요. 물 분자(파랑)와 설탕 분자(분홍)가 움직이다가 구멍을 만나면 물 분자만 지나가요. 막을 지난 물 분자를 <b>양쪽 방향으로</b> 세어 봐요.</p>',
      features: ['mol'],
      setup() { S.lock = false; setMode('mol'); },
      recap: '물 분자는 막을 양쪽으로 모두 지나가지만, 물 분자의 비율이 높은 쪽에서 낮은 쪽으로 가는 횟수가 더 많아서 순 이동이 생겨요.',
      summary: '<ul><li>반투막의 구멍은 물 분자만 지나갈 수 있어요. 설탕 분자는 구멍보다 커서 지나가지 못해요.</li><li>물 분자는 <b>양쪽 방향으로 모두</b> 지나가요. 하지만 순수한 물 쪽은 막 표면의 물 분자가 많아서 더 자주 지나가고, 설탕 용액 쪽은 설탕이 자리를 차지해서 물 분자의 비율이 낮아 덜 자주 지나가요.</li><li>그래서 순 이동은 <b>물 → 용액</b> 방향이에요. (용액의 증기압이 낮은 까닭과 같은 이유예요.)</li><li>양쪽 농도가 같으면 양방향의 횟수가 같아서 순 이동이 없어요.</li></ul>',
      missions: [
        {
          title: '막을 지나는 물 분자를 양방향으로 세기',
          goal: '왼쪽 0 M, 오른쪽 0.50 M에서 막을 지난 물 분자를 세어, 두 방향 모두 <b>20번 이상</b>이 되게 해요.',
          hint: '입자가 움직이는 동안 두 방향의 막대가 모두 20번을 넘을 때까지 기다려요(보통 5초 안팎). 어느 쪽이 더 많은지 비교해 보세요.',
          setup() { S.lock = true; S.iL = 0; S.iR = 10; mzReset(); setMode('mol'); },
          check: () => Math.abs(S.iR - S.iL) >= 4 && mz.cnt.lr >= 20 && mz.cnt.rl >= 20, hold: 0.3,
          status: () => '왼쪽 → 오른쪽 ' + mz.cnt.lr + '번 ' + mark(mz.cnt.lr >= 20) + ' &nbsp; 오른쪽 → 왼쪽 ' + mz.cnt.rl + '번 ' + mark(mz.cnt.rl >= 20) + (Math.abs(S.iR - S.iL) < 4 ? ' &nbsp; (농도 차가 0.20 M 이상이어야 해요)' : ''),
          explain: '물 분자는 <b>양쪽으로 모두</b> 막을 지나가요. 하지만 물 분자가 더 많은 왼쪽에서 오른쪽으로 지나가는 횟수가 더 많아서, 물의 순 이동은 <b>물 → 설탕 용액</b> 방향이에요.',
        },
        {
          title: '농도를 같게 하면?',
          goal: '양쪽 농도를 <b>같게</b> 맞추고, 막을 지난 물 분자가 <b>합계 60번 이상</b>이 되도록 세어요. 두 방향의 횟수가 비슷한지 비교해요.',
          hint: '두 슬라이더를 같은 값으로 맞춰요. 두 방향의 막대 길이가 비슷해질 때까지 기다려요.',
          setup() { S.lock = true; setMode('mol'); mzCountReset(); },
          check: () => S.iL === S.iR && mz.cnt.lr + mz.cnt.rl >= 60 && Math.abs(mz.cnt.lr - mz.cnt.rl) <= 0.2 * (mz.cnt.lr + mz.cnt.rl), hold: 0.3,
          status: () => '농도 같음 ' + mark(S.iL === S.iR) + ' &nbsp; 합계 ' + (mz.cnt.lr + mz.cnt.rl) + '번 ' + mark(mz.cnt.lr + mz.cnt.rl >= 60) + ' &nbsp; 두 방향 ' + mz.cnt.lr + ' · ' + mz.cnt.rl + ' ' + mark(S.iL === S.iR && mz.cnt.lr + mz.cnt.rl >= 1 && Math.abs(mz.cnt.lr - mz.cnt.rl) <= 0.2 * (mz.cnt.lr + mz.cnt.rl)),
          explain: '양쪽 농도가 같으면 막 표면의 물 분자 비율이 같아서 두 방향의 이동 횟수가 <b>거의 같아요</b>. 물은 계속 왔다 갔다 하지만 <b>순 이동은 0</b>이라 수위가 변하지 않아요.',
        },
        {
          type: 'quiz', title: '물 분자의 움직임',
          goal: '반투막을 사이에 둔 순수한 물과 설탕 용액에서, 물 분자의 움직임으로 옳은 것은?',
          setup() { S.lock = true; setMode('mol'); },
          choices: ['물 분자는 순수한 물에서 설탕 용액 쪽으로만 움직여요', '물 분자는 양쪽으로 모두 지나가지만, 순수한 물 → 용액으로 가는 것이 더 많아요', '설탕 분자도 물 분자와 함께 막을 지나가요', '물 분자는 용액에서 순수한 물 쪽으로 더 많이 움직여요'],
          answer: 1,
          feedback: ['물 분자는 반대 방향으로도 지나가요. 다만 그 횟수가 더 적을 뿐이에요.', '', '설탕 분자는 막의 구멍보다 커서 지나가지 못해요.', '물 분자의 비율이 더 높은 순수한 물 쪽에서 오는 횟수가 더 많아요.'],
          explain: '물 분자는 <b>양방향</b>으로 움직이지만 <b>순 이동은 한쪽</b>이에요. 물 분자의 비율이 높은 쪽(순수한 물)에서 낮은 쪽(설탕 용액)으로 가는 횟수가 더 많기 때문이에요.',
        },
      ],
    },
    {
      title: '실험 설계: 감자 막대로 농도 찾기', short: '실험 설계', icon: '🥔', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 농도 차가 있으면 물이 이동하고 농도 차가 클수록 수위 차도 크다는 것을 알았어요. 이제 <b>이동하는 물의 양과 농도의 관계</b>를 알아보는 실험을 직접 설계해요.</div>' +
        '<p>처음 질량이 5.0 g인 감자 막대를 여러 농도의 설탕 용액에 30분 동안 담가 질량 변화를 재요. 먼저 <b>변인</b>(독립·종속·통제)을 정리하고, 5가지 농도의 결과를 기록해 그래프로 분석해요.</p>' +
        '<p>🥽 실험 도구를 쓸 때는 보호 장구를 착용하고, 실험 뒤 설탕 용액은 교사의 안내에 따라 처리해요.</p>',
      features: ['pot'],
      setup() { S.lock = false; S.sub.pot = 'vars'; setMode('pot'); },
      recap: '질량 변화율이 0이 되는 농도(약 0.18 M)에서 감자 세포액과 농도가 같아 물의 순 이동이 없어요. 이보다 진하면 질량이 줄고 묽으면 늘어요.',
      summary: '<ul><li><b>독립 변인</b>(바꾸는 것): 설탕 용액의 농도. <b>종속 변인</b>(재는 것): 감자 막대의 질량 변화율. <b>통제 변인</b>(같게 하는 것): 감자 막대의 크기·처음 질량(5.0 g), 담그는 시간(30분), 용액의 부피·온도.</li><li>30분 뒤 질량 변화율: 0 M +9.8 %, 0.10 M +4.1 %, 0.20 M −1.2 %, 0.30 M −6.3 %, 0.40 M −10.5 %.</li><li>농도가 진할수록 질량이 줄어요(감자 속 물이 용액 쪽으로 나와요). 0 M(증류수)는 대조군이에요.</li><li>변화율이 0이 되는 농도는 약 <b>0.18 M</b> → 감자 세포액과 같은 농도(등장액). 이보다 진한 용액은 고장액, 묽은 용액은 저장액이에요.</li></ul>',
      missions: [
        {
          title: '변인 분류하기', manual: true,
          goal: '이 실험의 변인 카드 5장을 <b>독립 변인</b>, <b>종속 변인</b>, <b>통제 변인</b> 상자에 나누어 넣고 「확인하기」를 눌러요.',
          hint: '바꾸는 것은 1가지, 재는 것은 1가지예요. 나머지는 모두 같게 해야 하는 통제 변인이에요. 카드를 누르면 설명이 나와요.',
          setup() { S.lock = true; S.sub.pot = 'vars'; boardInit(S.pot.bd); boardLayout(S.pot.bd); setMode('pot'); },
          check: () => boardCheck(S.pot.bd),
          explain: '<b>독립 변인</b> = 용액의 농도(바꾸는 것), <b>종속 변인</b> = 질량 변화율(재는 것), <b>통제 변인</b> = 막대 크기·처음 질량, 시간, 부피·온도(같게 하는 것). 한 가지만 바꿔야 결과의 까닭을 알 수 있어요.',
        },
        {
          title: '5개 농도의 결과 기록하기',
          goal: '🧪 측정 화면에서 「30분 담그기」를 누르고, 감자 막대 5개의 질량 변화율을 모두 기록해요.',
          hint: '「30분 담그기」를 누르고 5초쯤 기다려요. 「다음 결과 기록」을 누르거나 각 비커를 눌러 기록해요.',
          setup() { S.lock = true; S.sub.pot = 'run'; S.pot.rec = [null, null, null, null, null]; S.pot.dip = { p: 0, go: false, done: false }; setMode('pot'); },
          check: () => potN() === 5, hold: 0.4,
          status: () => '기록 ' + potN() + ' / 5 &nbsp; ' + S.pot.rec.map((v) => mark(v != null)).join(''),
          explain: '농도가 진할수록 질량 변화율이 <b>+9.8 → +4.1 → −1.2 → −6.3 → −10.5 %</b>로 줄어요. 0.20 M 부근에서 부호가 바뀌어요.',
        },
        {
          title: '그래프에서 등장액 농도 찾기',
          goal: '📈 그래프에서 농도 눈금을 움직여 질량 변화율이 <b>0 %</b>(−0.5 ~ +0.5 %)가 되는 농도를 찾아요.',
          hint: '그래프를 누르거나 눈금 슬라이더를 움직여요. 점들을 지나는 점선이 0 % 선(검은 가로선)과 만나는 곳이에요. 0.20 M보다 조금 왼쪽에 있어요.',
          setup() { S.lock = true; S.sub.pot = 'graph'; if (potFill()) showHint('측정 자료가 없어서 앞 단계 자료로 채웠어요.'); S.pot.cur = 40; setMode('pot'); },
          check: () => { const y = potY(potCur()); return potN() === 5 && y != null && Math.abs(r1(y)) <= 0.5; }, hold: 0.5,
          status: () => { const y = potY(potCur()); return '눈금 ' + potCur().toFixed(3) + ' M → ' + (y == null ? '—' : sg1(y) + ' %') + ' ' + mark(y != null && Math.abs(r1(y)) <= 0.5); },
          explain: '직선이 0 %를 지나는 농도는 약 <b>0.18 M</b>이에요. 이 농도에서는 감자 세포액과 농도가 같아 물의 순 이동이 없어요(<b>등장액</b>). 이보다 진한 용액(고장액)에서는 물이 감자 밖으로 나가 질량이 줄고, 묽은 용액(저장액)에서는 물이 들어와 늘어요.',
        },
      ],
    },
    {
      title: '생활 속 삼투: 세포와 음식', short: '생활 속 삼투', icon: '🏠', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 감자 세포는 용액의 농도가 세포액보다 진한지 묽은지에 따라 물이 나가거나 들어왔어요. 같은 원리로 적혈구와 우리 생활 속 여러 현상을 설명해 봐요.</div>' +
        '<p>세포 밖 용액이 세포 안보다 <b>묽으면 저장액</b>, <b>같으면 등장액</b>, <b>진하면 고장액</b>이에요. 적혈구를 세 가지 용액에 넣어 모양 변화를 관찰하고, 생활 속 사례 카드를 분류해요.</p>',
      features: ['life'],
      setup() { S.lock = false; S.sub.life = 'rbc'; setMode('life'); },
      recap: '물은 농도가 낮은 쪽에서 높은 쪽으로 이동해요. 세포는 저장액에서 부풀고(터질 수 있고), 등장액에서 그대로이고, 고장액에서 쭈그러들어요. 배추 절임, 링거액, 갈증 등이 모두 삼투 현상이에요.',
      summary: '<ul><li><b>저장액</b>(세포 안보다 묽음): 물이 세포 안으로 → 적혈구가 부풀어 터질 수 있어요(용혈). <b>등장액</b>(0.9 % NaCl): 모양 유지. <b>고장액</b>(3 % NaCl): 물이 밖으로 → 쭈그러들어요.</li><li>물이 세포 <b>안으로</b>: 시든 채소를 물에 담금, 물에 담근 건포도, 식물 뿌리의 물 흡수.</li><li>물이 세포 <b>밖으로</b>: 배추 절임(10 % 소금물), 민달팽이에 소금, 설탕·꿀에 절인 과일, 바닷물을 마시면 탈수.</li><li>링거액은 혈액과 같은 0.9 % NaCl 용액(등장액)으로 만들어요.</li></ul>',
      missions: [
        {
          title: '적혈구를 세 가지 용액에 넣어 보기',
          goal: '증류수, 0.9 % NaCl, 3 % NaCl 용액에 적혈구를 각각 넣고 변화를 관찰해요. (0.9 %는 3초 이상 지켜봐요)',
          hint: '증류수에서는 세포가 터져요. 터지면 「새 적혈구 넣기」를 누르고 다른 용액을 골라요. 3 % 용액에서는 세포가 쭈그러들 때까지 기다려요.',
          setup() { S.lock = true; S.sub.life = 'rbc'; S.life.sol = 1; S.life.seen = { lys: false, iso: false, cren: false }; newCell(); setMode('life'); },
          check: () => lifeSeen().lys && lifeSeen().iso && lifeSeen().cren, hold: 0.3,
          status: () => '저장액(터짐) ' + mark(lifeSeen().lys) + ' &nbsp; 등장액(그대로) ' + mark(lifeSeen().iso) + ' &nbsp; 고장액(쭈그러듦) ' + mark(lifeSeen().cren),
          explain: '증류수(<b>저장액</b>)에서는 물이 들어와 적혈구가 터지고, 0.9 % NaCl(<b>등장액</b>)에서는 그대로, 3 % NaCl(<b>고장액</b>)에서는 물이 나가 쭈그러들어요.',
        },
        {
          title: '삼투 사례 분류하기', manual: true,
          goal: '사례 카드 8장을 <b>물이 세포 안으로</b>, <b>물이 세포 밖으로</b> 상자에 나누어 넣고 「확인하기」를 눌러요.',
          hint: '세포 안과 밖 중 어느 쪽 용액이 더 진한지 생각해요. 물은 진한 쪽으로 이동해요. 카드를 누르면 설명이 나와요.',
          setup() { S.lock = true; S.sub.life = 'cards'; boardInit(S.life.bd); boardLayout(S.life.bd); setMode('life'); },
          check: () => boardCheck(S.life.bd),
          explain: '물이 <b>안으로</b>: 시든 채소, 증류수와 적혈구, 건포도, 뿌리털. 물이 <b>밖으로</b>: 소금에 절인 배추, 민달팽이, 설탕에 절인 과일, 바닷물을 마신 몸. 어느 쪽 용액이 더 진한지가 방향을 정해요.',
        },
        {
          type: 'quiz', title: '바닷물을 마시면 갈증이 나는 까닭',
          goal: '바닷물을 마시면 오히려 더 목이 마르는 까닭으로 알맞은 것은?',
          setup() { S.lock = true; S.sub.life = 'rbc'; setMode('life'); },
          choices: ['바닷물이 몸속 세포보다 진해서, 세포 속의 물이 밖으로 빠져나가기 때문이에요', '바닷물이 너무 차가워서 몸이 떨리기 때문이에요', '바닷물의 소금이 몸속에서 물을 만들어 내기 때문이에요', '바닷물의 물이 세포 안으로 너무 많이 들어오기 때문이에요'],
          answer: 0,
          feedback: ['', '온도 때문이 아니라 농도 때문이에요.', '소금이 물을 만들어 내지는 않아요. 물이 이동하는 방향이 중요해요.', '바닷물은 세포보다 진해서 물이 세포 밖으로 나가요. 반대로 생각했어요.'],
          explain: '바닷물(약 3.5 %)은 몸속 세포(약 0.9 %)보다 훨씬 진한 <b>고장액</b>이에요. 물이 세포 밖으로 빠져나가 세포가 탈수되므로 오히려 갈증이 나요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hx-osmosis', mount: '#game', badge: '삼투 탐험가', homeHref: '../../index.html#hx',
    featureLabels: { u: '🥼 반투막 U자관', mol: '🔬 막을 지나는 분자', pot: '🥔 감자 실험 설계', life: '🏠 적혈구와 사례 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  mzReset(); boardInit(S.pot.bd); boardLayout(S.pot.bd); boardInit(S.life.bd); boardLayout(S.life.bd);
  setMode('u');
  function stepAll1(dt) {
    S.clk += dt;
    stepU(dt);
    if (S.mode === 'u' || S.mode === 'mol') stepMZ(dt);
    stepPot(dt); stepLife(dt);
    boardStep(S.pot.bd, dt); boardStep(S.life.bd, dt);
  }
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'u') { drawU(t); drawUInfo(t); }
    else if (S.mode === 'mol') { drawMol(t); drawMolInfo(t); }
    else if (S.mode === 'pot') { if (S.sub.pot === 'vars') { drawBoard(S.pot.bd); drawBoardInfo(S.pot.bd); } else if (S.sub.pot === 'run') { drawPotRun(t); drawPotInfo(t); } else { drawPotGraph(t); drawPotInfo(t); } }
    else if (S.sub.life === 'rbc') { drawRbc(t); drawRbcInfo(t); }
    else { drawBoard(S.life.bd); drawBoardInfo(S.life.bd); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, mz, POT_P, POT_C, DH_K, setMode, setSub, setIL, setIR, dhEq, hL, hR, netFlow, potDip, potRecord, potFit, potY, potN, potCur, setPc, potGeo, potGraph,
    boardOf, bGeo, boardInit, boardLayout, boardPlace, boardCheck, boardPlaced, setSol, newCell, mzReset, mzWin, SOLN,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
