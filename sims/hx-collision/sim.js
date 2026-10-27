/* =========================================================
   물질과 에너지 Ⅳ. 반응 속도 - 유효 충돌과 활성화 에너지 [12물에04-03]
   ① 모형: 충돌 모형 (확대 창의 분자 충돌, 튕김과 반응, 반응기 전체 카운터 예시)
   ② 탐구: 유효 충돌 (CO + NO₂ 의 방향 2가지 × 속력 2가지)
   ③ 모형: 에너지 장벽 (에너지 도표, Eₐ(정)·ΔH·Eₐ(역), 공이 언덕을 넘는 비유)
   ④ 적용: 반응 조건 (사례 카드와 Eₐ 비교)
   충돌 이론의 정량 식, 반응 메커니즘, 아레니우스 식은 다루지 않아요.
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
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#7c3aed', GOOD = '#14a058', BAD = '#e2464b', AMB = '#d97706', BLU = '#3867f4', SKY = '#0ea5e9', TEAL = '#0d9488';
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
        if (ctx.measureText(t).width > maxW && line.trim()) { out.push(line.trimEnd()); line = tk; } else line = t;
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
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const f3 = (v) => (Math.round(v * 1000) / 1000).toFixed(3);
  const f0 = (v) => String(Math.round(v));
  const MINUS = '−';
  const sg = (v, fn) => (v < 0 ? MINUS : v > 0 ? '+' : '') + fn(Math.abs(v));
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const ap = SciSim.approach;
  const ap2 = (cur, tg, dt, rate) => (RM ? tg : ap(cur, tg, dt, rate));
  const SUPM = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  const SUPD = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  const sup = (n) => String(n).split('').map((c) => (c === '-' ? '⁻' : SUPD[+c])).join('');
  const sci = (v, d) => { if (!(v > 0)) return '0'; let e = Math.floor(Math.log10(v) + 1e-9), m = v / Math.pow(10, e); let s = m.toFixed(d == null ? 1 : d); if (+s >= 10) { e += 1; s = (m / 10).toFixed(d == null ? 1 : d); } return s + '×10' + sup(e); };
  function parseNum(s) {                                  // 0.037, 3.7e-2, 3.7×10⁻², −5.0 모두 읽어요
    let t = String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => '^' + m.split('').map((c) => SUPM[c]).join(''))
      .replace(/[−–﹣－]/g, '-').replace(/\s+/g, '').replace(/,/g, '');
    const m = t.match(/^([+-]?[0-9.]+)[×x*]10\^?(-?[0-9]+)$/);
    if (m) return +m[1] * Math.pow(10, +m[2]);
    t = t.replace(/\^/g, ''); if (t !== '' && !isNaN(+t)) return +t;
    t = t.replace(/[^0-9.\-eE+]/g, ''); return t === '' || isNaN(+t) ? NaN : +t;
  }
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const nearRel = (v, a, rel) => !isNaN(v) && Math.abs(v - a) <= Math.abs(a) * rel;

  /* ---------- 그래프 도구 ---------- */
  function G(o) { o.X = (t) => o.x0 + t / o.xmax * o.w; o.Y = (c) => o.y0 + o.h - c / o.ymax * o.h; return o; }
  function axesG(g) {
    ctx.fillStyle = '#fbfdff'; D.roundRect(g.x0, g.y0, g.w, g.h, 6); ctx.fill();
    ctx.strokeStyle = '#e6ebf5'; ctx.lineWidth = 1;
    for (let c = 0; c <= g.ymax + 1e-6; c += g.ys) { ctx.beginPath(); ctx.moveTo(g.x0, g.Y(c)); ctx.lineTo(g.x0 + g.w, g.Y(c)); ctx.stroke(); T(g.x0 - 7, g.Y(c) + 4, g.yfmt ? g.yfmt(c) : f2(c), 12.5, MUTED, 'right', 700); }
    for (let t = 0; t <= g.xmax + 1e-6; t += g.xs) { ctx.beginPath(); ctx.moveTo(g.X(t), g.y0); ctx.lineTo(g.X(t), g.y0 + g.h); ctx.stroke(); T(g.X(t), g.y0 + g.h + 17, g.xfmt ? g.xfmt(t) : String(t), 12.5, MUTED, 'center', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(g.x0, g.y0); ctx.lineTo(g.x0, g.y0 + g.h); ctx.lineTo(g.x0 + g.w, g.y0 + g.h); ctx.stroke();
    T(g.x0 + g.w, g.y0 + g.h + 35, g.xlab || '', 12.5, MUTED, 'right', 800); T(g.x0 - 8, g.y0 - 9, g.ylab || '', 12.5, MUTED, 'left', 800);
  }
  function dash(x1, y1, x2, y2, col, w) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 1.8; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
  const chipBtn = (txt, aria, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', () => { Sound.click(); fn(); }); return b; };
  const shakeBad = (inp) => { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); };
  const clearInp = (ids) => ids.forEach((id) => { const e = $(id); if (e) { e.value = ''; e.classList.remove('ok', 'bad'); } });
  /* 패널 안의 작은 상자 */
  function box(x, y, w, h, fill, stroke, lw, r) { D.roundRect(x, y, w, h, r == null ? 10 : r); ctx.fillStyle = fill || '#f6f7fb'; ctx.fill(); ctx.strokeStyle = stroke || '#dbe3f3'; ctx.lineWidth = lw || 1.5; ctx.stroke(); }

  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 558, w: 464, h: 394 } : { x: 490, y: 50, w: 298, h: 498 },
  };
  const MODE_LABEL = { box: '💥 분자는 쉴 새 없이 충돌해요', lab: '🧪 어떤 충돌이 반응할까요?', en: '⛰ 에너지 장벽을 넘어야 해요', card: '🏠 반응이 일어나는 조건', eas: '🎚 Eₐ 가 클수록 반응은 드물어요' };
  const CO_C = '#4b5563', O_C = '#e2464b', N_C = '#3867f4';
  const wrapA = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

  /* ---------- 분자 그림 (그림과 판정이 같은 기하를 써요) ---------- */
  /* CO: C 가 +ang 쪽 끝. NO₂: ang = 두 O 가 있는 쪽(이등분선) 방향. 각 O–N–O = 134° */
  function coAtoms(ang, sc) { const ox = Math.cos(ang) * 8 * sc, oy = Math.sin(ang) * 8 * sc; return [{ dx: -ox, dy: -oy, r: 7 * sc, col: O_C, t: 'O' }, { dx: ox, dy: oy, r: 7 * sc, col: CO_C, t: 'C' }]; }
  function no2Atoms(ang, sc) {
    const L = 11 * sc, nx = -Math.cos(ang) * 3.2 * sc, ny = -Math.sin(ang) * 3.2 * sc, a = 1.17;
    return [{ dx: nx, dy: ny, r: 7.4 * sc, col: N_C, t: 'N' },
      { dx: nx + L * Math.cos(ang - a), dy: ny + L * Math.sin(ang - a), r: 6.4 * sc, col: O_C, t: 'O' },
      { dx: nx + L * Math.cos(ang + a), dy: ny + L * Math.sin(ang + a), r: 6.4 * sc, col: O_C, t: 'O' }];
  }
  const co2Atoms = (ang, sc) => { const s = 10.5 * sc, c = Math.cos(ang), n = Math.sin(ang); return [{ dx: -c * s, dy: -n * s, r: 6 * sc, col: O_C }, { dx: 0, dy: 0, r: 6.6 * sc, col: CO_C }, { dx: c * s, dy: n * s, r: 6 * sc, col: O_C }]; };
  const noAtoms = (ang, sc) => { const c = Math.cos(ang) * 7 * sc, n = Math.sin(ang) * 7 * sc; return [{ dx: -c, dy: -n, r: 7 * sc, col: N_C }, { dx: c, dy: n, r: 6.4 * sc, col: O_C }]; };
  function drawAtoms(x, y, atoms, al, bonds) {
    ctx.save(); ctx.globalAlpha = al == null ? 1 : al;
    if (bonds !== false) { ctx.strokeStyle = 'rgba(70,80,100,.75)'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) { const a = atoms[i], b = atoms[j], d = Math.hypot(a.dx - b.dx, a.dy - b.dy); if (d < (a.r + b.r) * 1.7) { ctx.beginPath(); ctx.moveTo(x + a.dx, y + a.dy); ctx.lineTo(x + b.dx, y + b.dy); ctx.stroke(); } } }
    atoms.forEach((a) => D.sphere(x + a.dx, y + a.dy, a.r, a.col, { gloss: a.r > 5.5 }));
    ctx.restore();
  }
  const leadX = (atoms) => Math.min.apply(null, atoms.map((a) => a.dx - a.r));       // 가장 왼쪽 가장자리
  const trailX = (atoms) => Math.max.apply(null, atoms.map((a) => a.dx + a.r));      // 가장 오른쪽 가장자리

  /* ---------- 상태 ---------- */
  const RX_T = [0.4, 0.9, 1.3, 1.9, 2.2, 2.8, 3.1, 3.7, 4.2, 4.6, 5.1, 5.5, 6.0, 6.4, 6.9, 7.3, 7.8, 8.4, 9.0, 9.6];   // 10 s 동안 반응 20회(예시)
  const TOT_COL = 100000, TOT_RX = 20, MEAS_S = 10, MEAS_RATE = 2;
  const S = {
    mode: 'box', fade: 0, lock: false, t: 0,
    bx: { mols: [], fx: [], nCol: 0, nBounce: 0, nRx: 0, run: false, tm: 0, done: false, cTot: 0, cRx: 0, pulse: 0, in: ['', ''], ok: [false, false], seed: 0, spawnQ: [] },
    lb: { co: 'C', no: 'O', lv: 3, ph: 'idle', xa: 0, xb: 0, tm: 0, res: null, tried: {}, fxT: 0, ret: 0, drag: false, glow: 0, seen: 0 },
    en: { seenPass: false, seenBounce: false, crossed: false, ds: 0, E: 40, ph: 'idle', s: 0, tm: 0, res: null, pass: false, bounce: false, in: [['', '', ''], ['', '', '']], ok: [[false, false, false], [false, false, false]], glow: 0, seenDs: [true, false], sStop: 0 },
    cd: { sel: 0, pick: [-1, -1, -1, -1, -1, -1], wrong: [false, false, false, false, false, false], pulse: 1 },
    ea: { ea: 60, seenLo: false, seenHi: false, bar: 0 },
  };
  let game = null;

  /* ================= ① 충돌 모형 (창 속 분자: 진짜 탄성 충돌 + 방향·에너지 판정) ================= */
  const BXR = () => { const L = RC.L; return { x: L.x + 16, y: L.y + 56, w: L.w - 32, h: 236 }; };
  const MR = 15, VN_TH = 135, ORI = 1.1;
  function mkMol(kind, spawnFade) {
    const b = BXR(); let x, y, ok = false, tries = 0;
    while (!ok && tries++ < 80) { x = rnd(b.x + MR + 4, b.x + b.w - MR - 4); y = rnd(b.y + MR + 4, b.y + b.h - MR - 4); ok = S.bx.mols.every((m) => Math.hypot(m.x - x, m.y - y) > MR * 2.3); }
    const an = rnd(0, TAU), v = 55 + (Math.random() + Math.random() + Math.random()) * 38;
    return { kind, x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, th: rnd(0, TAU), om: (Math.random() < 0.5 ? -1 : 1) * rnd(1.2, 3), al: spawnFade ? 0 : 1, life: 0, dying: false };
  }
  function boxInit() {
    const B = S.bx; B.mols = []; B.fx = []; B.spawnQ = [];
    for (let i = 0; i < 7; i++) B.mols.push(mkMol('A'));
    for (let i = 0; i < 7; i++) B.mols.push(mkMol('B'));
    B.nCol = 0; B.nBounce = 0; B.nRx = 0;
  }
  function addFx(x, y, type, label) { S.bx.fx.push({ x, y, t: 0, type, label }); }
  function collide(a, b, B) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6, nx = dx / d, ny = dy / d;
    const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (d >= MR * 2 || vn <= 0) return;
    // 겹침 풀기
    const ov = (MR * 2 - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
    const reactive = (a.kind === 'A' && b.kind === 'B') || (a.kind === 'B' && b.kind === 'A');
    let verdict = 'same';
    if (reactive) {
      const A = a.kind === 'A' ? a : b, Bm = a.kind === 'A' ? b : a;
      const phi = Math.atan2(Bm.y - A.y, Bm.x - A.x);
      const oriOK = Math.abs(wrapA(A.th - phi)) < ORI && Math.abs(wrapA(Bm.th - (phi + Math.PI))) < ORI;
      const enOK = vn >= VN_TH;
      verdict = oriOK && enOK ? 'react' : (!oriOK ? 'ori' : 'en');
      if (verdict === 'react') { A.kind = 'PA'; Bm.kind = 'PB'; A.life = Bm.life = 0; A.dying = Bm.dying = false; }
    }
    // 탄성 충돌 (같은 질량)
    a.vx -= vn * nx; a.vy -= vn * ny; b.vx += vn * nx; b.vy += vn * ny;
    if (verdict === 'react') { a.vx *= 0.8; a.vy *= 0.8; b.vx *= 0.8; b.vy *= 0.8; }
    a.om = (a.om < 0 ? -1 : 1) * rnd(1.2, 3); b.om = (b.om < 0 ? -1 : 1) * rnd(1.2, 3);
    B.nCol++;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (verdict === 'react') { B.nRx++; addFx(mx, my, 'react', '반응!'); if (S.mode === 'box') Sound.success(); if (!RM && S.mode === 'box') parts.burst(mx, my, { count: 14, speed: 120, life: 0.7, size: 3.4, colors: ['#14a058', '#7ddba0', '#ffd23f'] }); }
    else if (verdict === 'same') { B.nBounce++; addFx(mx, my, 'same', ''); }
    else { B.nBounce++; addFx(mx, my, 'bounce', verdict === 'ori' ? '방향 ✗' : '에너지 ✗'); }
  }
  function stepBox(dt) {
    const B = S.bx, b = BXR(), sub = Math.max(1, Math.ceil(dt / 0.012)), h = dt / sub;
    for (let s = 0; s < sub; s++) {
      for (const m of B.mols) {
        m.x += m.vx * h; m.y += m.vy * h; m.th += m.om * h;
        if (m.x < b.x + MR) { m.x = b.x + MR; m.vx = Math.abs(m.vx); } else if (m.x > b.x + b.w - MR) { m.x = b.x + b.w - MR; m.vx = -Math.abs(m.vx); }
        if (m.y < b.y + MR) { m.y = b.y + MR; m.vy = Math.abs(m.vy); } else if (m.y > b.y + b.h - MR) { m.y = b.y + b.h - MR; m.vy = -Math.abs(m.vy); }
      }
      for (let i = 0; i < B.mols.length; i++) for (let j = i + 1; j < B.mols.length; j++) { const a = B.mols[i], c = B.mols[j]; if (a.al < 0.6 || c.al < 0.6) continue; collide(a, c, B); }
    }
    // 생성물은 잠시 보인 뒤 사라지고, 새 반응물이 들어와요 (창 밖에서 반응물이 계속 공급돼요)
    for (let i = B.mols.length - 1; i >= 0; i--) {
      const m = B.mols[i];
      if (m.kind === 'PA' || m.kind === 'PB') { m.life += dt; if (m.life > 2.2) m.dying = true; }
      if (m.dying) { m.al -= dt * 2; if (m.al <= 0) { const k = m.kind === 'PA' ? 'A' : 'B'; B.mols.splice(i, 1); B.mols.push(mkMol(k, true)); } }
      else if (m.al < 1) m.al = Math.min(1, m.al + dt * 2);
    }
    for (let i = B.fx.length - 1; i >= 0; i--) { B.fx[i].t += dt; if (B.fx[i].t > (B.fx[i].type === 'react' ? 1.5 : 0.7)) B.fx.splice(i, 1); }
  }
  function boxRun() {
    const B = S.bx; if (B.run) return;
    B.run = true; B.done = false; B.tm = 0; B.cTot = 0; B.cRx = 0; B.in = ['', '']; B.ok = [false, false]; clearInp(['#bx1', '#bx2']); Sound.click(); updateCtl();
  }
  function stepBoxCount(dt) {
    const B = S.bx; B.pulse = Math.max(0, B.pulse - dt * 2.5);
    if (!B.run) return;
    B.tm = Math.min(MEAS_S, B.tm + dt * MEAS_RATE);
    const f = B.tm / MEAS_S;
    B.cTot = B.tm >= MEAS_S ? TOT_COL : Math.min(TOT_COL - 1, Math.floor(TOT_COL * f * (1 + 0.03 * Math.sin(B.tm * 5.3) * (1 - f))));
    const nrx = RX_T.filter((t) => t <= B.tm + 1e-9).length;
    if (nrx > B.cRx) { B.cRx = nrx; B.pulse = 1; Sound.tick(); }
    if (B.tm >= MEAS_S) { B.run = false; B.done = true; B.cTot = TOT_COL; B.cRx = TOT_RX; Sound.success(); updateCtl(); }
  }
  function checkBx() {
    const B = S.bx;
    B.ok[0] = B.in[0] !== '' && near(parseNum(B.in[0]), 20, 0.01);
    B.ok[1] = B.in[1] !== '' && near(parseNum(B.in[1]), 0.02, 0.0015);
  }
  const bxDone = () => S.bx.done && S.bx.ok[0] && S.bx.ok[1];
  function drawMolBox(m) {
    const al = clamp(m.al, 0, 1); if (al <= 0.01) return;
    ctx.save(); ctx.globalAlpha = al * 0.16; ctx.fillStyle = m.kind === 'PA' || m.kind === 'PB' ? '#14a058' : '#8a95a8'; ctx.beginPath(); ctx.arc(m.x, m.y, MR, 0, TAU); ctx.fill(); ctx.restore();
    const at = m.kind === 'A' ? coAtoms(m.th, 1) : m.kind === 'B' ? no2Atoms(m.th, 1) : m.kind === 'PA' ? co2Atoms(m.th, 1) : noAtoms(m.th, 1);
    drawAtoms(m.x, m.y, at, al);
  }
  function drawBox(t) {
    const L = RC.L, B = S.bx, b = BXR();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '💥 반응기 속 분자 (확대 창)', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + L.w - 14, L.y + 26, 'CO + NO₂ → CO₂ + NO', PHONE ? 12.5 : 13.5, PUR, 'right', 800);
    // 반응기 벽
    ctx.save(); D.shadow(() => { D.roundRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8, 12); ctx.fillStyle = '#eef3fb'; ctx.fill(); }, { blur: 6, y: 2 });
    D.roundRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8, 12); ctx.strokeStyle = '#9fb0cc'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
    ctx.save(); D.roundRect(b.x, b.y, b.w, b.h, 8); ctx.clip();
    B.mols.forEach(drawMolBox);
    B.fx.forEach((f) => {
      const k = f.t / (f.type === 'react' ? 1.5 : 0.7);
      if (f.type === 'react') { ctx.strokeStyle = 'rgba(20,160,88,' + (1 - k) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, 18 + k * 30, 0, TAU); ctx.stroke(); }
      else { ctx.strokeStyle = 'rgba(110,120,140,' + (0.7 * (1 - k)) + ')'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(f.x, f.y, 10 + k * (f.type === 'same' ? 12 : 20), 0, TAU); ctx.stroke(); }
    });
    ctx.restore();
    B.fx.forEach((f) => {
      if (f.label) { const k = f.t / (f.type === 'react' ? 1.5 : 0.7), yy = clamp(f.y - 24 - k * 10, b.y + 12, b.y + b.h - 8), xx = clamp(f.x, b.x + 34, b.x + b.w - 34); ctx.globalAlpha = 1 - k * k; D.label(xx, yy, f.label, { size: 12.5, bg: f.type === 'react' ? GOOD : '#7b8499' }); ctx.globalAlpha = 1; }
    });
    // 범례와 창 속 집계
    const ly = b.y + b.h + 20;
    atomsLegend(L.x + 18, ly);
    T(L.x + 18, ly + 24, '창 속 집계: 충돌 ' + B.nCol + '회 · 튕김 ' + B.nBounce + '회 · 반응 ' + B.nRx + '회', PHONE ? 12 : 12.5, MUTED, 'left', 800);
    // 반응기 전체 카운터 (예시 값)
    const cy = ly + 36, ch = L.y + L.h - cy - 12;
    box(L.x + 12, cy, L.w - 24, ch, '#f6f7fb', '#dbe3f3', 1.5, 12);
    T(L.x + 24, cy + 22, '⏱ 반응기 전체, ' + MEAS_S + ' s 동안 (예시 값)', 13.5, INK, 'left', 800);
    const prog = B.tm / MEAS_S;
    D.roundRect(L.x + L.w - 24 - 120, cy + 11, 120, 10, 5); ctx.fillStyle = '#e4e9f3'; ctx.fill(); if (prog > 0.004) { D.roundRect(L.x + L.w - 24 - 120, cy + 11, 120 * prog, 10, 5); ctx.fillStyle = PUR; ctx.fill(); }
    T(L.x + L.w - 24 - 124, cy + 21, f1(B.tm) + ' s', 12, MUTED, 'right', 800);
    const hw = (L.w - 24 - 36) / 2, by = cy + 36;
    [['충돌 횟수', thou(B.cTot) + ' 회', '#6b7894', 0], ['반응한 충돌', B.cRx + ' 회', GOOD, 1]].forEach(([lab, val, col, k]) => {
      const x = L.x + 24 + k * (hw + 12);
      box(x, by, hw, 54, '#fff', k && B.pulse > 0 ? GOOD : '#dbe3f3', k && B.pulse > 0 ? 3 : 1.5, 10);
      T(x + hw / 2, by + 18, lab, 12.5, MUTED, 'center', 800); T(x + hw / 2, by + 44, val, PHONE ? 21 : 23, col, 'center', 800);
    });
    const msg = B.done ? '충돌 ' + thou(TOT_COL) + '회 중 반응한 충돌은 ' + TOT_RX + '회뿐이에요.' : B.run ? '측정하는 중이에요… 대부분의 충돌은 튕겨 나가요.' : '「10 s 측정」을 눌러 반응기 전체의 충돌 횟수를 세어 봐요.';
    textBlock(L.x + 24, by + 74, L.w - 48, msg, 12.5, B.done ? '#0f6b3c' : MUTED, 17, 800);
  }
  const thou = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  function atomsLegend(x, y) {
    drawAtoms(x + 12, y, coAtoms(0, 0.8), 1); T(x + 30, y + 4, 'CO', 12.5, INK, 'left', 800);
    drawAtoms(x + 74, y, no2Atoms(0, 0.8), 1); T(x + 90, y + 4, 'NO₂', 12.5, INK, 'left', 800);
    T(x + 126, y + 4, '→', 13, MUTED, 'left', 800);
    drawAtoms(x + 158, y, co2Atoms(0, 0.7), 1); T(x + 178, y + 4, 'CO₂', 12.5, INK, 'left', 800);
    drawAtoms(x + 220, y, noAtoms(0, 0.8), 1); T(x + 233, y + 4, 'NO', 12.5, INK, 'left', 800);
  }
  function drawBoxInfo(t) {
    const R = RC.R, B = S.bx;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 충돌이 모두 반응하지는 않아요', 14, INK, 'left', 800);
    let y = R.y + 40;
    const tot = Math.max(1, B.nCol), wBar = R.w - 28;
    T(R.x + 14, y + 12, '확대 창 속 충돌 결과 (실제 집계)', 12.5, MUTED, 'left', 800);
    D.roundRect(R.x + 14, y + 22, wBar, 18, 8); ctx.fillStyle = '#e4e9f3'; ctx.fill();
    ctx.save(); D.roundRect(R.x + 14, y + 22, wBar, 18, 8); ctx.clip();
    ctx.fillStyle = '#9aa6bb'; ctx.fillRect(R.x + 14, y + 22, wBar * B.nBounce / tot, 18);
    ctx.fillStyle = GOOD; ctx.fillRect(R.x + 14 + wBar * B.nBounce / tot, y + 22, wBar * B.nRx / tot, 18);
    ctx.restore();
    T(R.x + 14, y + 58, '■ 튕김 ' + B.nBounce + '회', 12.5, '#6b7894', 'left', 800); T(R.x + R.w - 14, y + 58, '■ 반응 ' + B.nRx + '회', 12.5, GOOD, 'right', 800);
    y += 74;
    const yy = y;
    box(R.x + 10, yy, R.w - 20, R.y + R.h - yy - 10, '#f6f7fb', '#dbe3f3', 1.4, 10);
    T(R.x + 20, yy + 22, '💡 충돌 이론', 13, PUR, 'left', 800);
    const lines = ['기체 분자 하나는 상온에서 1초에 약 10¹⁰회 충돌해요.', '모든 충돌이 반응이라면 반응은 순식간에 끝날 거예요.', '하지만 대부분의 충돌은 그냥 튕겨 나가요. 반응으로 이어지는 충돌만 유효 충돌이에요.'];
    let ty = yy + 44; lines.forEach((s) => { ty += textBlock(R.x + 20, ty, R.w - 40, s, 12.5, INK, 17, 700) + 6; });
    if (ty + 40 < R.y + R.h) textBlock(R.x + 20, ty + 2, R.w - 40, '아래 「방향 ✗」 「에너지 ✗」 표시는 왜 튕겼는지를 보여 줘요. 다음 단계에서 조건을 하나씩 확인해요.', 12.5, MUTED, 17, 700);
  }

  /* ================= ② 유효 충돌 실험 (CO 와 NO₂ 를 정면 충돌) ================= */
  const LB = () => S.lb;
  const lbKey = () => ((LB().co === 'C' && LB().no === 'O') ? 'ok' : 'bad') + '-' + (LB().lv >= 3 ? 'fast' : 'slow');
  const LV_EA = 6.25;                                     // 충돌 에너지 = (속력 단계)², 문턱(Eₐ) = 2.5²
  const lbSpeed = (lv) => 40 + 25 * lv;                   // px/s (두 분자 모두)
  const lbSt = () => { const L = RC.L; return { x: L.x + 14, y: L.y + 52, w: L.w - 28, h: PHONE ? 176 : 184 }; };
  const lbYc = () => { const s = lbSt(); return s.y + s.h / 2 + 8; };
  const coAng = () => (LB().co === 'C' ? 0 : Math.PI);
  const noAng = () => (LB().no === 'O' ? Math.PI + 1.17 : 0);
  const SC_LB = 2.0;
  function lbHome() { const s = lbSt(); return { xa: s.x + 92, xb: s.x + s.w - 92 }; }
  function lbReset(keepTried) { const Z = LB(), h = lbHome(); Z.ph = 'idle'; Z.xa = h.xa; Z.xb = h.xb; Z.tm = 0; Z.res = null; Z.glow = 0; Z.ret = 0; if (!keepTried) { Z.tried = {}; Z.seen = 0; } }
  function lbSet(k, v) { const Z = LB(); if (Z.ph !== 'idle') return; if (Z[k] !== v) { Z[k] = v; Sound.tick(); } updateCtl(); }
  function lbRun() { const Z = LB(); if (Z.ph !== 'idle') return; Z.ph = 'run'; Z.tm = 0; Z.res = null; Z.key = lbKey(); Z.ang = [coAng(), noAng()]; Z.vA = lbSpeed(Z.lv); Z.glow = 0; Sound.click(); updateCtl(); }
  function lbContact() {
    const Z = LB(); const a = coAtoms(Z.ang[0], SC_LB), b = no2Atoms(Z.ang[1], SC_LB);
    return { a: trailX(a), b: leadX(b) };
  }
  function stepLb(dt) {
    const Z = LB(), h = lbHome();
    Z.glow = Math.max(0, Z.glow - dt * 1.2);
    if (Z.ph === 'run') {
      Z.xa += Z.vA * dt; Z.xb -= Z.vA * dt;
      const c = lbContact();
      if (Z.xb + c.b - (Z.xa + c.a) <= 0) {
        const mid = ((Z.xa + c.a) + (Z.xb + c.b)) / 2; Z.xa = mid - c.a; Z.xb = mid - c.b;
        const react = Z.co === 'C' && Z.no === 'O' && Z.lv >= 3;
        Z.ph = react ? 'form' : 'bounce'; Z.tm = 0; Z.res = react ? 'react' : 'bounce'; Z.glow = 1; Z.xa0 = Z.xa; Z.xb0 = Z.xb; Z.vOut = 0;
        Z.tried[Z.key] = Z.res; Z.seen++;
        if (react) { Z.fxX = Z.xb + c.b; Sound.success(); if (!RM) parts.burst(Z.fxX, lbYc(), { count: 18, speed: 150, life: 0.8, size: 3.6, colors: ['#14a058', '#7ddba0', '#ffd23f'] }); }
        else { Sound.fail(); }
        updateCtl();
      }
    } else if (Z.ph === 'form') {
      Z.tm += dt;
      if (Z.tm > 0.45) { Z.vOut = Math.min(80, (Z.vOut || 0) + dt * 160); Z.xa -= Z.vOut * dt; Z.xb += Z.vOut * dt; } else Z.vOut = 0;
      if (Z.tm > 2.2) { Z.ph = 'wait'; Z.tm = 0; }
    } else if (Z.ph === 'bounce') {
      Z.tm += dt; const v = Z.vA * Math.max(0, 1 - Z.tm * 0.45);
      Z.xa -= v * dt * 0.8; Z.xb += v * dt * 0.8;
      if (Z.tm > 1.5) { Z.ph = 'wait'; Z.tm = 0; }
    } else if (Z.ph === 'wait') {
      Z.tm += dt;
      if (Z.res === 'react') { if (Z.tm > 0.5) { Z.ph = 'in'; Z.tm = 0; Z.xa = h.xa; Z.xb = h.xb; } }
      else if (Z.tm > 0.2) { Z.ph = 'back'; Z.tm = 0; Z.fa = Z.xa; Z.fb = Z.xb; }
    } else if (Z.ph === 'in') {
      Z.tm += dt; if (Z.tm >= 0.5) { Z.ph = 'idle'; updateCtl(); }
    } else if (Z.ph === 'back') {
      Z.tm += dt; const k = sm(Z.tm / 0.7); Z.xa = Z.fa + (h.xa - Z.fa) * k; Z.xb = Z.fb + (h.xb - Z.fb) * k;
      if (Z.tm >= 0.7) { Z.ph = 'idle'; Z.xa = h.xa; Z.xb = h.xb; updateCtl(); }
    } else { Z.xa = ap2(Z.xa, h.xa, dt, 10); Z.xb = ap2(Z.xb, h.xb, dt, 10); }
  }
  const LBK = [['ok-fast', '방향 맞음', '빠름'], ['ok-slow', '방향 맞음', '느림'], ['bad-fast', '방향 틀림', '빠름'], ['bad-slow', '방향 틀림', '느림']];
  const lbAll = () => LBK.every((k) => LB().tried[k[0]]);
  const lbN = () => LBK.filter((k) => LB().tried[k[0]]).length;
  function drawLab(t) {
    const L = RC.L, Z = LB(), s = lbSt(), yc = lbYc();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧪 CO 와 NO₂ 를 정면으로 충돌시켜요', PHONE ? 14 : 15, INK, 'left', 800);
    box(s.x, s.y, s.w, s.h, '#f1f5fc', '#cfd9ec', 1.5, 12);
    // 분자 위치와 그림
    ctx.save(); D.roundRect(s.x, s.y, s.w, s.h, 12); ctx.clip();
    const idle = Z.ph === 'idle' || Z.ph === 'back' || Z.ph === 'in';
    const angA = idle ? coAng() : Z.ang[0], angB = idle ? noAng() : Z.ang[1];
    const atA = coAtoms(angA, SC_LB), atB = no2Atoms(angB, SC_LB);
    const prod = Z.res === 'react' && (Z.ph === 'form' || Z.ph === 'wait');
    if (Z.glow > 0 && Z.fxX != null && Z.res === 'react') D.glow(Z.fxX, yc, 70 * Z.glow + 20, '#ffd23f', 0.55 * Z.glow);
    if (prod) {
      const dA = Z.xa - Z.xa0, dB = Z.xb - Z.xb0, fadeA = Z.ph === 'wait' ? clamp(1 - Z.tm / 0.5, 0, 1) : 1;
      const cA = atA.find((a) => a.t === 'C'), oA = atA.find((a) => a.t === 'O');
      const oss = atB.filter((a) => a.t === 'O').sort((p, q) => p.dx - q.dx), o1 = oss[0], o2 = oss[1], nn = atB.find((a) => a.t === 'N');
      ctx.save(); ctx.globalAlpha = fadeA;
      const P = (grp, dx, a) => ({ x: grp + a.dx + dx, y: yc + a.dy, r: a.r, col: a.col });
      const cO = P(Z.xa0, dA, oA), cC = P(Z.xa0, dA, cA), cO1 = P(Z.xb0, dA, o1), nN = P(Z.xb0, dB, nn), nO2 = P(Z.xb0, dB, o2);
      ctx.strokeStyle = 'rgba(70,80,100,.8)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cO.x, cO.y); ctx.lineTo(cC.x, cC.y); ctx.lineTo(cO1.x, cO1.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(nN.x, nN.y); ctx.lineTo(nO2.x, nO2.y); ctx.stroke();
      if (Z.ph === 'form' && Z.tm < 0.45) { ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(226,70,75,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(nN.x, nN.y); ctx.lineTo(cO1.x, cO1.y); ctx.stroke(); ctx.setLineDash([]); }
      [cO, cC, cO1, nN, nO2].forEach((a) => D.sphere(a.x, a.y, a.r, a.col, { gloss: true }));
      ctx.restore();
      if (Z.ph === 'form' && Z.tm < 0.5) T(Z.xb0 + leadX(atB) * 0.4, yc - 70, '활성화물 (전이 상태)', 13, '#b45309', 'center', 800, HALO);
      else { ctx.globalAlpha = fadeA; T(cC.x, yc - 52, 'CO₂', 14, INK, 'center', 800, HALO); T(nN.x + 6, yc - 52, 'NO', 14, INK, 'center', 800, HALO); ctx.globalAlpha = 1; }
    } else {
      const al = Z.ph === 'in' ? clamp(Z.tm / 0.5, 0, 1) : 1;
      drawAtoms(Z.xa, yc, atA, al); drawAtoms(Z.xb, yc, atB, al);
      ctx.globalAlpha = al; T(Z.xa, yc + 54, 'CO', 14, INK, 'center', 800, HALO); T(Z.xb, yc + 54, 'NO₂', 14, INK, 'center', 800, HALO); ctx.globalAlpha = 1;
      if (Z.ph === 'bounce') { const a = clamp(1 - Z.tm / 0.9, 0, 1); T((Z.xa + Z.xb) / 2, yc - 70, '튕겨 나갔어요', 13.5, '#6b7894', 'center', 800, HALO); if (a > 0) { ctx.strokeStyle = 'rgba(110,120,140,' + a * 0.8 + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc((Z.xa + Z.xb) / 2, yc, 16 + (1 - a) * 26, 0, TAU); ctx.stroke(); } }
    }
    ctx.restore();
    // 속도 화살표와 핸들 (CO 쪽을 끌어 속도를 정해요)
    if (Z.ph === 'idle') {
      const len = 14 + 12 * Z.lv, ca = lbContact0();
      const ax1 = Z.xa + ca.a + 4, ax2 = ax1 + len, bx1 = Z.xb + ca.b - 4, bx2 = bx1 - len;
      D.arrow(ax1, yc - 38, ax2, yc - 38, { color: PUR, width: 4, head: 11 }); D.arrow(bx1, yc - 38, bx2, yc - 38, { color: PUR, width: 4, head: 11 });
      T((ax1 + bx1) / 2, yc - 62, '속력 단계 ' + Z.lv, 13, PUR, 'center', 800, HALO);
      ctx.save(); const pulse = Z.drag ? 12 : 10.5; D.shadow(() => { ctx.beginPath(); ctx.arc(ax2 + 3, yc - 38, pulse, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 }); ctx.strokeStyle = PUR; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ax2 + 3, yc - 38, pulse, 0, TAU); ctx.stroke(); ctx.restore();
      T(ax2 + 3, yc - 34, '↔', 12, PUR, 'center', 800);
    }
    // 충돌 에너지 막대
    const gy = s.y + s.h + 16, gx = L.x + 24, gw = L.w - 48, E = Z.lv * Z.lv, fr = E / 25;
    T(gx, gy + 6, '충돌 에너지 (상대값)', 13, INK, 'left', 800);
    const yb = gy + 16;
    D.roundRect(gx, yb, gw, 18, 8); ctx.fillStyle = '#e4e9f3'; ctx.fill();
    ctx.save(); D.roundRect(gx, yb, gw, 18, 8); ctx.clip(); ctx.fillStyle = E >= LV_EA ? GOOD : '#f59e0b'; ctx.fillRect(gx, yb, gw * fr, 18); ctx.restore();
    const ex = gx + gw * LV_EA / 25; ctx.strokeStyle = BAD; ctx.lineWidth = 2.6; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(ex, yb - 7); ctx.lineTo(ex, yb + 25); ctx.stroke(); ctx.setLineDash([]);
    T(ex + 5, yb + 38, 'Eₐ (활성화 에너지)', 12.5, BAD, 'left', 800);
    T(gx + gw, yb + 38, E >= LV_EA ? 'Eₐ 이상' : 'Eₐ 미만', 12.5, E >= LV_EA ? '#0f6b3c' : '#b45309', 'right', 800);
    // 결과 표
    const ty = yb + 54, th = L.y + L.h - ty - 12;
    box(L.x + 12, ty, L.w - 24, th, '#f6f7fb', '#dbe3f3', 1.5, 12);
    T(L.x + 24, ty + 20, '실험 결과 (' + lbN() + ' / 4)', 13, INK, 'left', 800);
    const cw = (L.w - 24 - 24 - 12) / 2, ch = Math.min(44, (th - 36 - 8) / 2);
    LBK.forEach((k, i) => {
      const cx = L.x + 24 + (i % 2) * (cw + 12), cy = ty + 30 + Math.floor(i / 2) * (ch + 8), r = Z.tried[k[0]];
      const cur = Z.ph === 'idle' && lbKey() === k[0];
      box(cx, cy, cw, ch, r === 'react' ? 'rgba(20,160,88,.1)' : r ? 'rgba(110,120,140,.1)' : '#fff', r === 'react' ? GOOD : cur ? PUR : '#d9d0f5', cur ? 2.4 : 1.4, 9);
      T(cx + 10, cy + ch / 2 + 4, k[1] + ' · ' + k[2], 12.5, INK, 'left', 800);
      T(cx + cw - 10, cy + ch / 2 + 4, r === 'react' ? '반응 ✔' : r ? '튕김' : '?', 13, r === 'react' ? '#0f6b3c' : r ? '#6b7894' : '#aab3c4', 'right', 800);
    });
  }
  function lbContact0() { const Z = LB(); return { a: trailX(coAtoms(coAng(), SC_LB)), b: leadX(no2Atoms(noAng(), SC_LB)) }; }
  function drawLabInfo(t) {
    const R = RC.R, Z = LB(), all = lbAll();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 유효 충돌의 조건', 14, INK, 'left', 800);
    let y = R.y + 38;
    if (!all) {
      textBlock(R.x + 16, y + 14, R.w - 32, '방향 2가지와 속력 2가지를 조합해 4번 충돌시켜 봐요. 어떤 충돌만 반응하는지 규칙을 찾아요.', 13, INK, 18, 800);
      y += 78;
      textBlock(R.x + 16, y, R.w - 32, '살펴볼 점', 12.5, PUR, 16, 800); y += 20;
      ['CO 의 어느 원자가 NO₂ 의 어느 원자와 먼저 닿는가?', '충돌 에너지가 Eₐ 를 넘는가?'].forEach((s) => { y += textBlock(R.x + 24, y, R.w - 44, '• ' + s, 12.5, INK, 17, 700) + 4; });
      return;
    }
    const cards = [['① 알맞은 방향', 'CO 의 C 쪽이 NO₂ 의 O 쪽에 닿아야 해요. C 가 N 쪽에 부딪히면 튕겨요.', '#0ea5e9'], ['② 활성화 에너지 이상', '충돌 에너지가 Eₐ 이상이어야 해요. 느리면 방향이 맞아도 튕겨요.', '#d97706']];
    cards.forEach((c, i) => {
      const h = 92; box(R.x + 10, y, R.w - 20, h, '#fff', c[2], 2, 10);
      T(R.x + 20, y + 22, c[0], 13.5, c[2], 'left', 800); textBlock(R.x + 20, y + 42, R.w - 40, c[1], 12.5, INK, 17, 700); y += h + 8;
    });
    if (y + 70 < R.y + R.h) { box(R.x + 10, y, R.w - 20, R.y + R.h - y - 10, 'rgba(20,160,88,.08)', GOOD, 1.6, 10); textBlock(R.x + 20, y + 24, R.w - 40, '유효 충돌 = 방향 ✔ 와 에너지 ✔ 가 모두 맞는 충돌만 반응해요.', 13, '#0f6b3c', 18, 800); }
  }

  /* ================= ③ 에너지 장벽 (에너지 도표 + 공이 언덕을 넘는 비유) ================= */
  const DG = [
    { name: '발열 반응', ea: 50, dh: -30, col: '#e0692f' },
    { name: '흡열 반응', ea: 90, dh: 40, col: '#0ea5e9' },
  ];
  const KMIN = -40, KMAX = 100;
  /* U(s): 반응 경로 s(0~1) 에서 반응물 수준 기준 에너지(kJ). 꼭대기 높이가 정확히 Eₐ 가 되도록 맞춰요. */
  function mkCurve(d) {
    const N = 160, bump = (s) => Math.pow(Math.sin(Math.PI * s), 2);
    const U = (s, B) => d.dh * sm(s) + B * bump(s);
    const pk = (B) => { let m = -1e9; for (let i = 0; i <= N; i++) m = Math.max(m, U(i / N, B)); return m; };
    let lo = 0, hi = 400; for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (pk(mid) < d.ea) lo = mid; else hi = mid; }
    const B = (lo + hi) / 2, u = [], arr = []; let sp = 0, mp = -1e9;
    for (let i = 0; i <= N; i++) { const s = i / N, v = U(s, B); arr.push(v); if (v > mp) { mp = v; sp = s; } }
    return { N, u: arr, sp, at: (s) => { const x = clamp(s, 0, 1) * N, i = Math.min(N - 1, Math.floor(x)); return arr[i] + (arr[i + 1] - arr[i]) * (x - i); } };
  }
  const CV = DG.map(mkCurve);
  const ENG = () => { const L = RC.L; return { x: L.x + 56, y: L.y + 76, w: L.w - 76, h: PHONE ? 244 : 240 }; };
  const eY = (g, kj) => g.y + (KMAX - kj) / (KMAX - KMIN) * g.h;
  const eXs = (g, s) => g.x + 70 + s * (g.w - 140);
  const EN = () => S.en;
  const enOK = (i, k) => S.en.ok[i][k];
  function enCheck(i) {
    const E = EN(), d = DG[i], a = E.ok[i].slice();
    E.ok[i][0] = E.in[i][0] !== '' && near(parseNum(E.in[i][0]), d.ea, 1.5);
    E.ok[i][1] = E.in[i][1] !== '' && near(parseNum(E.in[i][1]), d.dh, 1.5);
    E.ok[i][2] = E.in[i][2] !== '' && near(parseNum(E.in[i][2]), d.ea - d.dh, 1.5);
    E.ok[i].forEach((o, k) => { if (o && !a[k]) { Sound.success(); const g = ENG(); parts.burst(g.x + g.w / 2, g.y + 60, { count: 10, speed: 100, life: 0.6, size: 3.2 }); } });
  }
  const enReadDone = () => EN().ok.every((r) => r[0] && r[1]);
  const enRevDone = () => EN().ok.every((r) => r[2]);
  function sStopFor(i, E) { const c = CV[i]; for (let k = 0; k <= c.N; k++) if (c.u[k] >= E) { const k0 = Math.max(0, k - 1), a = c.u[k0], b = c.u[k]; return (k0 + (b === a ? 0 : (E - a) / (b - a))) / c.N; } return 1; }
  function enRoll() {
    const E = EN(); if (E.ph === 'go') return;
    const d = DG[E.ds]; E.pass = E.E >= d.ea; E.res = null; E.tm = 0; E.s = 0; E.ph = 'go';
    E.sStop = E.pass ? 1 : sStopFor(E.ds, E.E); Sound.click(); updateCtl();
  }
  function stepEn(dt) {
    const E = EN(); E.glow = Math.max(0, E.glow - dt * 1.1);
    if (E.ph !== 'go') return;
    E.tm += dt;
    const c = CV[E.ds];
    if (E.pass) {
      const k = clamp(E.tm / 2.4, 0, 1); E.s = RM ? 1 : sm(k);
      if (!E.crossed && E.s >= c.sp) { E.crossed = true; E.glow = 1; const g = ENG(); parts.burst(eXs(g, c.sp), eY(g, DG[E.ds].ea) - 14, { count: 12, speed: 90, life: 0.6, size: 3.2, colors: ['#ffd23f', '#14a058'] }); }
      if (k >= 1) { E.ph = 'done'; E.res = 'pass'; E.pass2 = true; E.seenPass = true; E.crossed = false; Sound.success(); updateCtl(); }
    } else {
      const T1 = 1.3, T2 = 1.0;
      if (E.tm < T1) E.s = E.sStop * (1 - Math.pow(1 - E.tm / T1, 2));
      else if (E.tm < T1 + T2) { const k = (E.tm - T1) / T2; E.s = E.sStop * (1 - k * k); }
      else { E.s = 0; E.ph = 'done'; E.res = 'bounce'; E.seenBounce = true; Sound.fail(); updateCtl(); }
    }
  }
  function enClear(ks) { const E = EN(); [0, 1].forEach((i) => ks.forEach((k) => { E.in[i][k] = ''; E.ok[i][k] = false; })); }
  function enReset() { const E = EN(); E.ph = 'idle'; E.s = 0; E.tm = 0; E.res = null; E.crossed = false; E.glow = 0; }
  function enSetDs(i) { const E = EN(); if (E.ds !== i) { E.ds = i; E.seenDs[i] = true; enReset(); Sound.tick(); } updateCtl(); }
  function drawEn(t) {
    const L = RC.L, E = EN(), g = ENG(), d = DG[E.ds], cv = CV[E.ds];
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '⛰ ' + d.name + '의 에너지 도표', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '반응물 수준 = 0 kJ · 눈금 한 칸 = 10 kJ', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    // 눈금
    ctx.fillStyle = '#fbfdff'; D.roundRect(g.x, g.y, g.w, g.h, 6); ctx.fill();
    for (let k = KMIN; k <= KMAX; k += 10) { ctx.strokeStyle = k === 0 ? '#c3cce0' : '#edf0f7'; ctx.lineWidth = k === 0 ? 1.4 : 1; ctx.beginPath(); ctx.moveTo(g.x, eY(g, k)); ctx.lineTo(g.x + g.w, eY(g, k)); ctx.stroke(); if (k % 20 === 0) T(g.x - 7, eY(g, k) + 4, String(k), 12, MUTED, 'right', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x, g.y + g.h); ctx.stroke();
    T(g.x - 40, g.y - 9, '에너지 (kJ)', 12.5, MUTED, 'left', 800);
    T(g.x + g.w, g.y + g.h + 17, '반응 경로 →', 12.5, MUTED, 'right', 800);
    // 반응물·생성물 수준
    const x0 = eXs(g, 0), x1 = eXs(g, 1), yR = eY(g, 0), yP = eY(g, d.dh), yT = eY(g, d.ea);
    ctx.save(); ctx.strokeStyle = '#4b5d7e'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(g.x + 8, yR); ctx.lineTo(x0, yR); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1, yP); ctx.lineTo(g.x + g.w - 8, yP); ctx.stroke(); ctx.restore();
    T(g.x + 36, yR + (d.dh > 0 ? 17 : -9), '반응물', 12.5, MUTED, 'center', 800, HALO); T(g.x + g.w - 36, yP + (d.dh > 0 ? -9 : 17), '생성물', 12.5, MUTED, 'center', 800, HALO);
    // 곡선
    ctx.save(); ctx.strokeStyle = d.col; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let k = 0; k <= cv.N; k++) { const x = eXs(g, k / cv.N), y = eY(g, cv.u[k]); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore();
    // 꼭대기 = 활성화물
    const px = eXs(g, cv.sp);
    if (E.glow > 0) D.glow(px, yT, 46 + 20 * E.glow, '#ffd23f', 0.6 * E.glow);
    T(px, yT - 26, '활성화물 (전이 상태)', 12.5, '#b45309', 'center', 800, HALO);
    // 화살표: Eₐ(정), ΔH, Eₐ(역)
    const lab = (k, txt, okv) => (okv ? txt : '?');
    const axA = px - 34, axR = g.x + g.w - 16;
    const ok = E.ok[E.ds];
    dash(px, yT, axR, yT, 'rgba(100,116,139,.55)', 1.4);
    D.arrow(axA, yR, axA, yT + 2, { color: PUR, width: 3.4, head: 10 });
    D.label(axA - 6, (yR + yT) / 2, 'Eₐ(정) = ' + (ok[0] ? d.ea + ' kJ' : '?'), { size: 12.5, bg: PUR, align: 'right' });
    D.arrow(x1 - 14, yR, x1 - 14, yP + (yP > yR ? -2 : 2), { color: d.dh < 0 ? '#e0692f' : '#0ea5e9', width: 3.4, head: 10 });
    D.label(x1 - 20, (yR + yP) / 2 + (d.dh < 0 ? 0 : 0), 'ΔH = ' + (ok[1] ? sg(d.dh, f0) + ' kJ' : '?'), { size: 12.5, bg: d.dh < 0 ? '#e0692f' : '#0ea5e9', align: 'right' });
    D.arrow(axR, yP, axR, yT + 2, { color: TEAL, width: 3.4, head: 10 });
    D.label(axR - 6, (yP + yT) / 2, 'Eₐ(역) = ' + (ok[2] ? (d.ea - d.dh) + ' kJ' : '?'), { size: 12.5, bg: TEAL, align: 'right' });
    // 충돌 에너지 선과 공
    const yE = eY(g, E.E);
    dash(g.x + 4, yE, g.x + g.w - 4, yE, '#14a058', 1.8); D.label(g.x + g.w - 6, yE - 12, 'E = ' + E.E + ' kJ', { size: 12, bg: GOOD, align: 'right' });
    const bs = E.ph === 'idle' ? 0 : E.s;
    D.sphere(eXs(g, bs), eY(g, cv.at(bs)) - 11, 11, '#8b5cf6', { shadow: true });
    // 결과
    const ry = g.y + g.h + 36;
    box(L.x + 12, ry, L.w - 24, L.y + L.h - ry - 12, '#f6f7fb', '#dbe3f3', 1.5, 12);
    const msg = E.res === 'pass' ? '넘었어요! E ≥ Eₐ 이면 장벽을 넘어 생성물이 돼요 (반응).' : E.res === 'bounce' ? '튕겼어요. E < Eₐ 이면 장벽을 못 넘고 되돌아가요.' : E.ph === 'go' ? '충돌한 분자가 언덕(장벽)을 오르고 있어요…' : '충돌 에너지 E 를 정하고 「굴리기」를 눌러요. 언덕 꼭대기가 Eₐ 예요.';
    textBlock(L.x + 24, ry + 24, L.w - 48, msg, 13, E.res === 'pass' ? '#0f6b3c' : E.res === 'bounce' ? '#b45309' : INK, 18, 800);
    if (L.y + L.h - ry > 70) { T(L.x + 24, ry + 66, '굴려 본 결과:  넘음 ' + mark(E.seenPass) + '   튕김 ' + mark(E.seenBounce), 12.5, MUTED, 'left', 800); }
  }
  function drawEnInfo(t) {
    const R = RC.R, E = EN();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 도표에서 읽은 값 (kJ)', 14, INK, 'left', 800);
    const rh = PHONE ? 34 : 40, y0 = R.y + 38;
    D.roundRect(R.x + 10, y0, R.w - 20, rh - 4, 8); ctx.fillStyle = '#ece7fb'; ctx.fill();
    [['', 0.2], ['Eₐ(정)', 0.4], ['ΔH', 0.6], ['Eₐ(역)', 0.82]].forEach(([s, f]) => T(R.x + R.w * f, y0 + rh / 2 + 1, s, 12.5, INK, 'center', 800));
    DG.forEach((d, i) => {
      const y = y0 + rh * (i + 1), sel = i === E.ds;
      D.roundRect(R.x + 10, y, R.w - 20, rh - 4, 8); ctx.fillStyle = sel ? 'rgba(124,58,237,.07)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = sel ? PUR : '#e1dcf3'; ctx.lineWidth = sel ? 2 : 1.2; ctx.stroke();
      T(R.x + R.w * 0.2, y + rh / 2 + 1, d.name.slice(0, 2), 13, d.col, 'center', 800);
      const o = E.ok[i], v = [o[0] ? String(d.ea) : '?', o[1] ? sg(d.dh, f0) : '?', o[2] ? String(d.ea - d.dh) : '?'];
      v.forEach((s, k) => T(R.x + R.w * [0.4, 0.6, 0.82][k], y + rh / 2 + 1, s, 13.5, s === '?' ? '#aab3c4' : '#0f6b3c', 'center', 800));
    });
    const y1 = y0 + rh * 3 + 6, hh = R.y + R.h - y1 - 10;
    box(R.x + 10, y1, R.w - 20, hh, '#f6f7fb', '#dbe3f3', 1.4, 10);
    T(R.x + 20, y1 + 22, '💡 도표 읽는 법', 13, PUR, 'left', 800);
    let ty = y1 + 42;
    ['Eₐ(정) = 반응물 수준에서 꼭대기까지의 높이', 'ΔH = 생성물 수준 − 반응물 수준', enReadDone() ? 'Eₐ(역) = Eₐ(정) − ΔH (생성물 수준에서 꼭대기까지)' : 'Eₐ(역)은 생성물 수준에서 꼭대기까지의 높이예요.'].forEach((s) => { if (ty + 18 < y1 + hh) ty += textBlock(R.x + 20, ty, R.w - 40, '• ' + s, 12.5, INK, 17, 700) + 5; });
  }

  /* ================= ④ 반응 조건 (사례 카드 + Eₐ 비교) ================= */
  const CARDS = [
    { ic: '🔥', name: '성냥 점화', desc: '성냥개비 머리를 거친 면에 그으면 불이 붙어요.', ans: 0, beh: 'over' },
    { ic: '🍳', name: '메테인 불꽃 점화', desc: '메테인과 산소 혼합 기체는 불꽃을 대기 전에는 반응하지 않아요. 연소는 자발적이지만 Eₐ 장벽이 있어요.', ans: 1, beh: 'over' },
    { ic: '🔩', name: '철이 서서히 녹슮', desc: '철은 공기와 수분이 있으면 상온에서 아주 천천히 녹슬어요.', ans: 2, beh: 'rare' },
    { ic: '💨', name: '상온의 H₂ + O₂ 혼합', desc: '수소와 산소를 섞어 두기만 하면 상온에서는 거의 반응하지 않아요.', ans: 3, beh: 'never' },
    { ic: '🌿', name: '광합성에 필요한 빛', desc: '식물은 빛을 받아야 이산화 탄소와 물로 포도당을 만들어요.', ans: 4, beh: 'over' },
    { ic: '🎆', name: '폭죽', desc: '불을 붙이면 반응이 순식간에 이웃한 곳으로 번져요.', ans: 5, beh: 'over' },
  ];
  const CD_OPT = [
    { ic: '🤲', s: '마찰열', t: '마찰열이 Eₐ 를 공급해요' },
    { ic: '🔥', s: '불꽃(열)', t: '불꽃(열)이 Eₐ 를 공급해요' },
    { ic: '🌡️', s: '상온의 열로 서서히', t: '상온의 열에너지로도 일부 충돌이 Eₐ 를 넘어 서서히 진행돼요' },
    { ic: '🚫', s: 'Eₐ 가 커서 안정', t: 'Eₐ 가 매우 커서 상온에서는 거의 반응하지 않고 안정해요' },
    { ic: '☀️', s: '빛에너지', t: '빛에너지를 흡수해 반응에 필요한 에너지를 얻어요' },
    { ic: '🔗', s: '반응열의 연쇄', t: '점화 뒤에는 반응열이 다음 분자의 Eₐ 를 공급해요' },
  ];
  const CDS = () => S.cd;
  const cdN = () => CDS().pick.filter((p, i) => p === CARDS[i].ans).length;
  const cdRect = (i) => { const L = RC.L, w = (L.w - 24 - 10) / 2, h = PHONE ? 50 : 52; return { x: L.x + 12 + (i % 2) * (w + 10), y: L.y + 40 + Math.floor(i / 2) * (h + 8), w, h }; };
  function cdSel(i) { const C2 = CDS(); if (C2.sel !== i) { C2.sel = i; C2.pulse = 0; Sound.tick(); } updateCtl(); }
  function cdPick(k) {
    const C2 = CDS(), i = C2.sel, ok = k === CARDS[i].ans;
    C2.pick[i] = k; C2.wrong[i] = !ok; C2.pulse = 0;
    if (ok) { Sound.success(); const r = cdRect(i); parts.burst(r.x + r.w - 20, r.y + 18, { count: 10, speed: 100, life: 0.6, size: 3.2 }); }
    else { Sound.fail(); showHint('이 사례에는 맞지 않아요. 사례 설명에서 에너지가 어디서 오는지 찾아봐요.'); }
    updateCtl();
  }
  function cdResult() {
    const C2 = CDS(); if (C2.pick.some((p) => p < 0)) return '여섯 카드를 모두 연결해요. (' + C2.pick.filter((p) => p >= 0).length + ' / 6)';
    const bad = C2.pick.map((p, i) => (p === CARDS[i].ans ? null : CARDS[i].name)).filter(Boolean);
    return bad.length ? '다시 확인해요: ' + bad.join(', ') : true;
  }
  function drawMiniHill(x, y, w, h, beh, t, got) {
    // 모식: 반응물 → 언덕(Eₐ) → 생성물. 공 = 충돌한 분자
    const base = y + h - 14, top = y + 16, x0 = x + 14, x1 = x + w - 14;
    const U = (s) => Math.pow(Math.sin(Math.PI * s), 2) * (base - top) * 0.92 - 0.12 * sm(s) * (base - top);
    ctx.strokeStyle = PUR; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let k = 0; k <= 60; k++) { const s = k / 60, px = x0 + (x1 - x0) * s, py = base - U(s); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    T(x0, base + 12, '반응물', 11.5, MUTED, 'left', 800); T(x1, base + 12, '생성물', 11.5, MUTED, 'right', 800);
    T(x + w / 2, top - 4, 'Eₐ 장벽', 11.5, PUR, 'center', 800);
    let s;
    const per = 2.6, ph = (t % per) / per, cyc = Math.floor(t / per);
    const fate = !got ? 'back' : beh === 'over' ? 'over' : beh === 'rare' ? (cyc % 3 === 2 ? 'over' : 'weak') : 'back';
    if (fate === 'over') s = ph < 0.8 ? sm(ph / 0.8) : 1; else if (fate === 'weak') s = ph < 0.5 ? 0.22 * Math.sin(ph / 0.5 * Math.PI * 0.5) : 0.22 * Math.cos((ph - 0.5) / 0.5 * Math.PI * 0.5); else s = ph < 0.6 ? 0.35 * Math.sin(ph / 0.6 * Math.PI * 0.5) : 0.35 * Math.cos((ph - 0.6) / 0.4 * Math.PI * 0.5);
    if (RM) s = fate === 'over' ? 1 : 0;
    const bx = x0 + (x1 - x0) * s, by = base - U(s) - 9;
    D.sphere(bx, by, 8, '#8b5cf6', { shadow: true });
    if (got && fate === 'over' && ph > 0.35 && ph < 0.6) D.glow(bx, by, 26, '#ffd23f', 0.5);
  }
  function drawCards(t) {
    const L = RC.L, C2 = CDS();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🏠 사례마다 Eₐ 는 어떻게 공급될까요?', PHONE ? 14 : 15, INK, 'left', 800);
    CARDS.forEach((c, i) => {
      const r = cdRect(i), sel = i === C2.sel, p = C2.pick[i], ok = p === c.ans && p >= 0;
      box(r.x, r.y, r.w, r.h, ok ? 'rgba(20,160,88,.1)' : p >= 0 ? 'rgba(226,70,75,.08)' : sel ? 'rgba(124,58,237,.1)' : '#fbfaff', ok ? GOOD : p >= 0 ? BAD : sel ? PUR : '#d9d0f5', sel ? 2.6 : 1.5, 10);
      T(r.x + 22, r.y + r.h / 2 + 8, c.ic, 22, INK, 'center', 800);
      const ls = wrap(c.name, r.w - 70, 12.5, 800); ls.slice(0, 2).forEach((ln, k) => T(r.x + 42, r.y + r.h / 2 + 4 + (k - (Math.min(ls.length, 2) - 1) / 2) * 15, ln, 12.5, INK, 'left', 800));
      if (ok) D.check(r.x + r.w - 15, r.y + 15, 8, 1); else if (p >= 0) T(r.x + r.w - 15, r.y + 20, '✗', 16, BAD, 'center', 800);
    });
    const c = CARDS[C2.sel], dy = cdRect(5).y + cdRect(5).h + 12, got = C2.pick[C2.sel] === c.ans;
    box(L.x + 12, dy, L.w - 24, L.y + L.h - dy - 12, '#fff', '#d9d0f5', 1.5, 12);
    T(L.x + 24, dy + 24, c.ic + ' ' + c.name, 15, INK, 'left', 800);
    const hh = textBlock(L.x + 24, dy + 46, L.w - 48, c.desc, 12.5, MUTED, 17, 700);
    const my = dy + 46 + hh + 4, mh = L.y + L.h - my - 70;
    if (mh > 70) drawMiniHill(L.x + 24, my, L.w - 48, mh, c.beh, t, got);
    const fy = L.y + L.h - 54;
    if (C2.pick[C2.sel] < 0) textBlock(L.x + 24, fy + 14, L.w - 48, '조작판에서 Eₐ 를 어떻게 공급하는지 골라요.', 12.5, '#9aa6bb', 17, 800);
    else { const o = CD_OPT[C2.pick[C2.sel]]; textBlock(L.x + 24, fy + 8, L.w - 48, (got ? '✅ ' : '❌ ') + o.t + (got ? '' : ' (이 사례와 달라요)'), 12.5, got ? '#0f6b3c' : BAD, 17, 800); }
  }
  function drawCardsInfo(t) {
    const R = RC.R, C2 = CDS();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 반응이 일어나기 위한 조건', 14, INK, 'left', 800);
    T(R.x + R.w - 14, R.y + 24, cdN() + ' / 6', 14, cdN() === 6 ? GOOD : MUTED, 'right', 800);
    let y = R.y + 40;
    const items = [['🔥 점화 · 가열 · 마찰 · 빛', '반응물에 Eₐ 이상의 에너지를 주면 유효 충돌이 늘어요.'], ['🔗 연쇄', '한 번 시작하면 반응열이 다음 분자의 Eₐ 를 공급해 계속 타요.'], ['🧱 장벽', '발열 반응이라도 Eₐ 장벽이 높으면 상온에서는 거의 일어나지 않아요.']];
    items.forEach((it) => { const h = 78; if (y + h > R.y + R.h - 8) return; box(R.x + 10, y, R.w - 20, h, '#fbfaff', '#e1dcf3', 1.3, 10); T(R.x + 20, y + 22, it[0], 13, PUR, 'left', 800); textBlock(R.x + 20, y + 42, R.w - 40, it[1], 12.5, INK, 17, 700); y += h + 8; });
  }
  /* Eₐ 슬라이더: 같은 충돌 수(10²⁰회) 중 반응 횟수 */
  const RGAS = 8.314, TROOM = 298.15, NCOL = 1e20;
  const eaFrac = (ea) => Math.exp(-ea * 1000 / (RGAS * TROOM));
  const eaCount = (ea) => NCOL * eaFrac(ea);
  function cntTxt(n) { return n >= 1000 ? sci(n) : n >= 10 ? f0(n) : n >= 1 ? f1(n) : f2(n); }
  function needTxt(ea) { return sci(1 / eaFrac(ea)); }
  const EAS = () => S.ea;
  function setEa(v) { const Q = EAS(); v = clamp(Math.round(v / 10) * 10, 20, 120); if (Q.ea !== v) { Q.ea = v; Sound.tick(); } if (v <= 30) Q.seenLo = true; if (v >= 100) Q.seenHi = true; updateCtl(); }
  function stepEas(dt) { const Q = EAS(); Q.disp = ap2(Q.disp == null ? Q.ea : Q.disp, Q.ea, dt, 7); if (Math.abs(Q.disp - Q.ea) < 0.05) Q.disp = Q.ea; Q.bar = ap2(Q.bar, (Math.log10(eaCount(Q.ea)) + 2) / 20, dt, 6); }
  function drawEas(t) {
    const L = RC.L, Q = EAS(), ea = Q.disp == null ? Q.ea : Q.disp, g = { x: L.x + 24, y: L.y + 52, w: L.w - 48, h: PHONE ? 210 : 220 };
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🎚 Eₐ 장벽의 높이를 바꿔 봐요', PHONE ? 14 : 15, INK, 'left', 800);
    box(g.x - 8, g.y - 4, g.w + 16, g.h + 8, '#f1f5fc', '#cfd9ec', 1.4, 12);
    const dh = -50, cv = mkCurve({ ea, dh }), Y = (kj) => g.y + g.h - 24 - (kj + 60) / 190 * (g.h - 44), X = (s) => g.x + 30 + s * (g.w - 60);
    ctx.strokeStyle = PUR; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let k = 0; k <= cv.N; k++) { const px = X(k / cv.N), py = Y(cv.u[k]); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    ctx.strokeStyle = '#4b5d7e'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.x + 4, Y(0)); ctx.lineTo(X(0), Y(0)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(X(1), Y(dh)); ctx.lineTo(g.x + g.w - 4, Y(dh)); ctx.stroke();
    const px = X(cv.sp);
    D.arrow(px - 30, Y(0), px - 30, Y(ea) + 2, { color: PUR, width: 3.4, head: 10 }); D.label(px - 36, (Y(0) + Y(ea)) / 2, 'Eₐ = ' + f0(ea) + ' kJ/mol', { size: 12.5, bg: PUR, align: 'right' });
    T(g.x + 30, Y(0) + 16, '반응물', 12, MUTED, 'left', 800, HALO); T(g.x + g.w - 30, Y(dh) + 16, '생성물', 12, MUTED, 'right', 800, HALO);
    T(g.x + g.w - 4, g.y + 14, 'ΔH = −50 kJ/mol (발열)', 12.5, '#e0692f', 'right', 800);
    // 반응 횟수 막대 (로그 눈금)
    const by = g.y + g.h + 30, n = eaCount(Q.ea);
    T(L.x + 24, by, '상온(25 °C)에서 충돌 10²⁰회 중 반응한 횟수 (예시 값)', PHONE ? 12 : 13, INK, 'left', 800);
    const bx = L.x + 28, bw = L.w - 56, bb = by + 14;
    D.roundRect(bx, bb, bw, 20, 9); ctx.fillStyle = '#e4e9f3'; ctx.fill();
    const fw = clamp(Q.bar, 0, 1) * bw; if (fw > 0.5) { ctx.save(); D.roundRect(bx, bb, bw, 20, 9); ctx.clip(); ctx.fillStyle = Q.ea <= 40 ? GOOD : Q.ea <= 80 ? '#f59e0b' : BAD; ctx.fillRect(bx, bb, fw, 20); ctx.restore(); }
    [-2, 0, 4, 8, 12, 16].forEach((e) => { const x = bx + (e + 2) / 20 * bw; ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, bb + 20); ctx.lineTo(x, bb + 26); ctx.stroke(); T(x, bb + 40, e === -2 ? '0.01' : '10' + sup(e), 11.5, MUTED, 'center', 700); });
    T(bx + bw, bb + 56, '(눈금은 10의 거듭제곱 배씩 커져요)', 11.5, MUTED, 'right', 700);
    const ry = bb + 66;
    box(L.x + 12, ry, L.w - 24, L.y + L.h - ry - 12, '#f6f7fb', '#dbe3f3', 1.5, 12);
    T(L.x + 24, ry + 24, '반응 횟수  ' + cntTxt(n) + ' 회', 16, Q.ea >= 100 ? BAD : INK, 'left', 800);
    textBlock(L.x + 24, ry + 46, L.w - 48, '반응 1회에 필요한 충돌: 약 ' + needTxt(Q.ea) + '회 · Eₐ 가 클수록 에너지 조건을 채우는 충돌이 드물어서 상온에서 느려요.', 12.5, MUTED, 17, 700);
  }
  function drawEasInfo(t) {
    const R = RC.R, Q = EAS();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📋 Eₐ 와 반응 횟수 (예시)', 14, INK, 'left', 800);
    const rh = Math.min(30, (R.h - 76) / 12), y0 = R.y + 36;
    D.roundRect(R.x + 10, y0, R.w - 20, rh - 3, 7); ctx.fillStyle = '#ece7fb'; ctx.fill();
    T(R.x + R.w * 0.2, y0 + rh / 2 + 3, 'Eₐ', 12, INK, 'center', 800); T(R.x + R.w * 0.62, y0 + rh / 2 + 3, '10²⁰회 중 반응', 12, INK, 'center', 800);
    for (let k = 0; k < 11; k++) {
      const ea = 20 + 10 * k, y = y0 + rh * (k + 1), sel = ea === Q.ea;
      D.roundRect(R.x + 10, y, R.w - 20, rh - 3, 7); ctx.fillStyle = sel ? 'rgba(124,58,237,.1)' : '#fbfaff'; ctx.fill(); ctx.strokeStyle = sel ? PUR : '#e1dcf3'; ctx.lineWidth = sel ? 1.8 : 1; ctx.stroke();
      T(R.x + R.w * 0.2, y + rh / 2 + 3, f0(ea), 12.5, INK, 'center', 800); T(R.x + R.w * 0.62, y + rh / 2 + 3, cntTxt(eaCount(ea)), 12.5, sel ? PUR : INK, 'center', 800);
    }
    T(R.x + 14, R.y + R.h - 12, 'Eₐ 단위: kJ/mol', 11.5, MUTED, 'left', 700);
  }

  /* ================= 컨트롤 · 공통 ================= */
  function build() {
    [['C', 'C 쪽이 앞'], ['O', 'O 쪽이 앞']].forEach(([k, s]) => $('#lbCo').appendChild(chipBtn(s, 'CO 는 ' + s, () => lbSet('co', k))));
    [['O', 'O 쪽이 앞'], ['N', 'N 쪽이 앞']].forEach(([k, s]) => $('#lbNo').appendChild(chipBtn(s, 'NO₂ 는 ' + s, () => lbSet('no', k))));
    DG.forEach((d, i) => $('#dsChips').appendChild(chipBtn(d.name + ' 도표', d.name, () => enSetDs(i))));
    CARDS.forEach((c, i) => $('#cdPick').appendChild(chipBtn(c.ic, c.name, () => cdSel(i))));
    CD_OPT.forEach((o, i) => $('#cdOpts').appendChild(chipBtn(o.ic + ' ' + o.s, o.t, () => cdPick(i))));
  }
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => { n.hidden = n.getAttribute('data-show').split(' ').indexOf(S.mode) < 0; });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const B = S.bx, Z = LB(), E = EN(), C2 = CDS(), Q = EAS();
    $('#bxRun').disabled = B.run; $('#bxRun').textContent = B.run ? '측정하는 중…' : B.done ? '↻ 다시 측정 (10 s, 2배속)' : '▶ 10 s 측정 (2배속)';
    ['bx1', 'bx2'].forEach((id, k) => { const inp = $('#' + id); inp.classList.toggle('ok', B.ok[k]); inp.disabled = !B.done; if (document.activeElement !== inp && inp.value !== B.in[k]) inp.value = B.in[k]; });
    const idle = Z.ph === 'idle';
    $$('#lbCo button').forEach((b, k) => { b.classList.toggle('on', Z.co === ['C', 'O'][k]); b.disabled = !idle; });
    $$('#lbNo button').forEach((b, k) => { b.classList.toggle('on', Z.no === ['O', 'N'][k]); b.disabled = !idle; });
    $('#lbRange').value = String(Z.lv); $('#lbOut').textContent = '단계 ' + Z.lv; $('#lbRange').disabled = !idle; $('#lbMinus').disabled = !idle || Z.lv <= 1; $('#lbPlus').disabled = !idle || Z.lv >= 5; $('#lbRun').disabled = !idle;
    $$('#dsChips button').forEach((b, k) => { b.classList.toggle('on', E.ds === k); b.classList.toggle('done', E.ok[k][0] && E.ok[k][1] && E.ok[k][2] && E.ds !== k); });
    $('#enRange').value = String(E.E); $('#enOut').textContent = E.E + ' kJ'; $('#enMinus').disabled = E.E <= 10; $('#enPlus').disabled = E.E >= 110; $('#enRoll').disabled = E.ph === 'go';
    ['en1', 'en2', 'en3'].forEach((id, k) => { const inp = $('#' + id); inp.classList.toggle('ok', E.ok[E.ds][k]); if (document.activeElement !== inp && inp.value !== E.in[E.ds][k]) inp.value = E.in[E.ds][k]; });
    $$('#cdOpts button').forEach((b, k) => { const on = C2.pick[C2.sel] === k, ok = k === CARDS[C2.sel].ans; b.classList.toggle('on', on && ok); b.classList.toggle('no', on && !ok); });
    $$('#cdPick button').forEach((b, k) => { b.classList.toggle('on', C2.sel === k); b.classList.toggle('done', C2.pick[k] === CARDS[k].ans); });
    $('#eaRange').value = String(Q.ea); $('#eaRange').style.setProperty('--pct', ((Q.ea - 20) / 100 * 100) + '%'); $('#enRange').style.setProperty('--pct', ((E.E - 10) / 100 * 100) + '%'); $('#lbRange').style.setProperty('--pct', ((Z.lv - 1) / 4 * 100) + '%'); $('#eaOut').textContent = Q.ea + ' kJ/mol'; $('#eaMinus').disabled = Q.ea <= 20; $('#eaPlus').disabled = Q.ea >= 120;
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#bxRun').addEventListener('click', boxRun);
  ['bx1', 'bx2'].forEach((id, k) => {
    const inp = $('#' + id);
    inp.addEventListener('input', () => { S.bx.in[k] = inp.value; inp.classList.remove('bad'); checkBx(); updateCtl(); });
    inp.addEventListener('change', () => {
      if (inp.value === '' || S.bx.ok[k]) return; shakeBad(inp); const v = parseNum(inp.value);
      if (k === 0) showHint('「반응한 충돌」 카운터(초록 숫자)를 읽어요. 측정이 끝나야 20회로 멈춰요.');
      else showHint(near(v, 0.0002, 0.00005) ? '% 단위로 적어요. 0.0002 는 비율이고 % 로는 0.02 예요.' : '비율(%) = 반응한 충돌 / 전체 충돌 × 100. 20 / 100000 × 100 을 계산해요.');
    });
  });
  $('#lbRange').addEventListener('input', (e) => { if (LB().ph === 'idle') { LB().lv = +e.target.value; Sound.tick(); updateCtl(); } });
  $('#lbMinus').addEventListener('click', () => { Sound.click(); if (LB().ph === 'idle') LB().lv = clamp(LB().lv - 1, 1, 5); updateCtl(); });
  $('#lbPlus').addEventListener('click', () => { Sound.click(); if (LB().ph === 'idle') LB().lv = clamp(LB().lv + 1, 1, 5); updateCtl(); });
  $('#lbRun').addEventListener('click', lbRun);
  $('#enRange').addEventListener('input', (e) => { if (EN().ph !== 'go') { EN().E = +e.target.value; enReset(); updateCtl(); } });
  $('#enMinus').addEventListener('click', () => { Sound.click(); if (EN().ph !== 'go') { EN().E = clamp(EN().E - 5, 10, 110); enReset(); } updateCtl(); });
  $('#enPlus').addEventListener('click', () => { Sound.click(); if (EN().ph !== 'go') { EN().E = clamp(EN().E + 5, 10, 110); enReset(); } updateCtl(); });
  $('#enRoll').addEventListener('click', enRoll);
  ['en1', 'en2', 'en3'].forEach((id, k) => {
    const inp = $('#' + id);
    inp.addEventListener('input', () => { EN().in[EN().ds][k] = inp.value; inp.classList.remove('bad'); enCheck(EN().ds); updateCtl(); });
    inp.addEventListener('change', () => {
      const E = EN(), d = DG[E.ds]; if (inp.value === '' || E.ok[E.ds][k]) return; shakeBad(inp); const v = parseNum(inp.value);
      if (k === 0) showHint('Eₐ(정)은 반응물 수준(0 kJ)에서 꼭대기까지의 높이예요. 눈금 한 칸은 10 kJ 예요.');
      else if (k === 1) showHint(Math.abs(Math.abs(v) - Math.abs(d.dh)) < 1.5 ? 'ΔH 는 생성물 수준 − 반응물 수준이에요. 생성물이 ' + (d.dh < 0 ? '아래' : '위') + '에 있으니 부호를 확인해요.' : 'ΔH 는 반응물 수준에서 생성물 수준까지의 변화예요 (아래로 가면 음수).');
      else showHint('Eₐ(역)은 생성물 수준에서 꼭대기까지의 높이예요. Eₐ(정) − ΔH 로도 구할 수 있어요.');
    });
  });
  $('#eaRange').addEventListener('input', (e) => setEa(+e.target.value));
  $('#eaMinus').addEventListener('click', () => { Sound.click(); setEa(EAS().ea - 10); });
  $('#eaPlus').addEventListener('click', () => { Sound.click(); setEa(EAS().ea + 10); });
  const resetBox = () => { const B = S.bx; B.run = false; B.tm = 0; B.done = false; B.cTot = 0; B.cRx = 0; B.in = ['', '']; B.ok = [false, false]; clearInp(['#bx1', '#bx2']); boxInit(); };
  const resetLab = () => { lbReset(false); };
  const resetEn = () => { const E = EN(); enReset(); E.E = 40; E.ds = 0; E.seenPass = false; E.seenBounce = false; E.in = [['', '', ''], ['', '', '']]; E.ok = [[false, false, false], [false, false, false]]; E.seenDs = [true, false]; clearInp(['#en1', '#en2', '#en3']); };
  const resetCards = () => { const C2 = CDS(); C2.sel = 0; C2.pick = [-1, -1, -1, -1, -1, -1]; C2.wrong = [false, false, false, false, false, false]; };
  const resetEas = () => { const Q = EAS(); Q.ea = 60; Q.seenLo = false; Q.seenHi = false; Q.disp = 60; };
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'box') resetBox(); else if (S.mode === 'lab') resetLab(); else if (S.mode === 'en') resetEn(); else if (S.mode === 'card') resetCards(); else resetEas();
    updateCtl();
  });
  /* 캔버스: 분자를 눌러 방향 바꾸기, 속도 핸들 끌기, 카드 고르기 */
  let dragMode = null;
  function lbHandle() { const Z = LB(), c = lbContact0(), yc = lbYc(); return { x: Z.xa + c.a + 4 + 14 + 12 * Z.lv + 3, y: yc - 38 }; }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'lab' && LB().ph === 'idle') {
        const h = lbHandle(); if (Math.hypot(p.x - h.x, p.y - h.y) < 24) { dragMode = 'spd'; LB().drag = true; return true; }
        const Z = LB(), yc = lbYc();
        if (Math.hypot(p.x - Z.xa, p.y - yc) < 36) { lbSet('co', Z.co === 'C' ? 'O' : 'C'); return false; }
        if (Math.hypot(p.x - Z.xb, p.y - yc) < 40) { lbSet('no', Z.no === 'O' ? 'N' : 'O'); return false; }
      }
      if (S.mode === 'card') { for (let i = 0; i < CARDS.length; i++) if (inRect(p, cdRect(i))) { cdSel(i); return false; } }
      return false;
    },
    move(p) { if (dragMode === 'spd' && LB().ph === 'idle') { const Z = LB(), c = lbContact0(), v = clamp(Math.round((p.x - (Z.xa + c.a + 4) - 3 - 14) / 12), 1, 5); if (v !== Z.lv) { Z.lv = v; Sound.tick(); updateCtl(); } } },
    up() { dragMode = null; LB().drag = false; },
    hover(p) {
      if (S.mode === 'lab' && LB().ph === 'idle') { const h = lbHandle(), Z = LB(), yc = lbYc(); if (Math.hypot(p.x - h.x, p.y - h.y) < 24) return 'ew-resize'; if (Math.hypot(p.x - Z.xa, p.y - yc) < 36 || Math.hypot(p.x - Z.xb, p.y - yc) < 40) return 'pointer'; }
      if (S.mode === 'card') { for (let i = 0; i < CARDS.length; i++) if (inRect(p, cdRect(i))) return 'pointer'; }
      return null;
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'box') { const B = S.bx; L1 = '창 속 충돌'; a = B.nCol + '회'; L2 = '창 속 반응'; b = B.nRx + '회'; L3 = '전체 10 s (예시)'; c = B.done ? '충돌 ' + thou(TOT_COL) + ' · 반응 ' + TOT_RX : B.run ? f1(B.tm) + ' s 측정 중' : '아직 측정 전'; }
    else if (S.mode === 'lab') { const Z = LB(); L1 = '방향'; a = 'CO ' + Z.co + ' · NO₂ ' + Z.no; L2 = '속력 단계'; b = String(Z.lv); L3 = '시도한 조합'; c = lbN() + ' / 4'; }
    else if (S.mode === 'en') { const E = EN(); L1 = '충돌 에너지 E'; a = E.E + ' kJ'; L2 = '공의 결과'; b = E.res === 'pass' ? '넘었어요' : E.res === 'bounce' ? '튕겼어요' : '아직'; L3 = '읽은 값'; c = E.ok.reduce((n, r) => n + r.filter(Boolean).length, 0) + ' / 6'; }
    else if (S.mode === 'card') { const C2 = CDS(); L1 = '고른 카드'; a = CARDS[C2.sel].name; L2 = '맞게 연결'; b = cdN() + ' / 6'; L3 = '장벽을 넘는 길'; c = '열 · 불꽃 · 빛 · 연쇄'; }
    else { const Q = EAS(); L1 = 'Eₐ'; a = Q.ea + ' kJ/mol'; L2 = '반응 횟수'; b = cntTxt(eaCount(Q.ea)) + ' 회'; L3 = '1회에 필요한 충돌'; c = '약 ' + needTxt(Q.ea) + '회'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '충돌 모형: 충돌은 모두 반응일까?', short: '충돌 모형', icon: '💥', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 분자들이 쉴 새 없이 부딪히는데도 왜 대부분의 충돌은 반응을 일으키지 못할까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시들에서</b> 반응 속도를 농도로 재고 속도식 v = k[A]ᵐ[B]ⁿ 을 구했어요. 일반선택 화학의 <b>동적 평형</b>(정반응 속도 = 역반응 속도)과 통합과학2의 여러 가지 반응에서 반응은 입자가 부딪혀 일어난다고 배웠죠. 이제 속도를 <b>입자 충돌</b>로 설명해요.</div>' +
        '<p>반응기 속을 확대해 보면 분자는 쉴 새 없이 움직이며 충돌해요. <b>튕김</b>과 <b>반응</b>이 어떻게 다른지 지켜보고, 반응기 전체에서 10 s 동안 몇 번의 충돌 중 몇 번이 반응하는지 세어 봐요.</p>',
      features: ['box'],
      setup() { S.lock = false; setMode('box'); },
      recap: '분자는 쉴 새 없이 충돌하지만 반응으로 이어지는 충돌(유효 충돌)은 극히 일부예요.',
      summary: '<ul><li>화학 반응은 입자(분자)의 <b>충돌</b>로 일어나요. 그러나 모든 충돌이 반응으로 이어지지는 않아요.</li><li>기체 분자 하나는 상온에서 1초에 약 10¹⁰회 충돌해요. 모든 충돌이 반응이라면 반응은 순식간에 끝날 거예요.</li><li>예시 값: 10 s 동안 충돌 100,000회 중 반응한 충돌은 20회 (0.02 %). 대부분은 튕겨 나가요.</li><li>반응이 일어나는 충돌을 <b>유효 충돌</b>이라고 해요.</li></ul>',
      missions: [
        {
          title: '충돌 카운터 읽기',
          goal: '「10 s 측정」을 눌러 반응기 전체의 카운터를 읽고, <b>반응한 충돌 횟수</b>와 전체 충돌 중 <b>반응한 비율(%)</b>을 입력해요.',
          hint: '측정이 끝나면 충돌 횟수와 반응한 충돌 횟수가 멈춰요. 비율(%) = 반응한 충돌 / 전체 충돌 × 100 이에요.',
          setup() { S.lock = true; resetBox(); setMode('box'); },
          check: () => bxDone(), hold: 0.5,
          status: () => '측정 ' + mark(S.bx.done) + ' &nbsp; 횟수 ' + mark(S.bx.ok[0]) + ' &nbsp; 비율 ' + mark(S.bx.ok[1]),
          explain: '10 s 동안 충돌 <b>100,000회</b> 중 반응한 충돌은 <b>20회</b>예요. 비율은 20 / 100000 × 100 = <b>0.02 %</b> (예시 값). 대부분의 충돌은 반응 없이 튕겨 나가요.',
        },
        {
          type: 'quiz', title: '충돌하면 반드시 반응할까?',
          goal: '“분자가 충돌하기만 하면 반드시 반응한다.” 이 말은?',
          setup() { S.lock = true; setMode('box'); },
          choices: ['맞아요. 충돌하면 항상 새 물질이 만들어져요', '틀려요. 대부분의 충돌은 반응 없이 튕겨 나가요', '맞아요. 다만 온도가 낮을 때만 그래요', '틀려요. 충돌은 반응과 아무 관계가 없어요'],
          answer: 1,
          feedback: ['모든 충돌이 반응이라면 반응은 순식간에 끝날 거예요. 실제로는 충돌 100,000회 중 20회만 반응했어요.', '', '온도와 상관없이 충돌의 대부분은 튕겨 나가요. 온도는 반응하는 충돌의 비율을 바꿔요.', '반응은 입자의 충돌로 일어나요. 다만 그중 일부(유효 충돌)만 반응으로 이어져요.'],
          explain: '충돌은 반응의 <b>필요조건</b>이지만 충분조건은 아니에요. 반응으로 이어지는 충돌만 <b>유효 충돌</b>이고, 대부분은 튕겨 나가요.',
        },
      ],
    },
    {
      title: '유효 충돌: 방향과 에너지', short: '유효 충돌', icon: '🧪', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 충돌 중 일부만 반응하고 창 속 표시에 「방향 ✗」「에너지 ✗」가 있었어요. 이제 CO 와 NO₂ 를 직접 충돌시켜 어떤 조건에서 반응하는지 찾아봐요.</div>' +
        '<p>CO + NO₂ → CO₂ + NO 에서 CO 의 <b>C</b> 가 NO₂ 의 <b>O</b> 와 만나야 새 결합이 생겨요. 분자의 <b>방향</b>(어느 쪽이 앞인가)과 <b>속력</b>을 바꿔 4가지 조합을 모두 시도해요. 분자를 눌러 방향을 돌리고, 보라색 화살표 끝을 끌어 속력을 정할 수도 있어요.</p>',
      features: ['lab'],
      setup() { S.lock = false; setMode('lab'); lbReset(true); },
      recap: '유효 충돌은 ① 알맞은 방향 ② 활성화 에너지(Eₐ) 이상의 에너지, 두 조건을 모두 만족해야 해요.',
      summary: '<ul><li><b>유효 충돌</b> = 반응이 일어나는 충돌. 조건은 두 가지예요.</li><li>① <b>알맞은 방향</b>: CO + NO₂ 에서 C 쪽이 NO₂ 의 O 쪽에 부딪혀야 해요. C 가 N 쪽에 부딪히면 튕겨요.</li><li>② <b>활성화 에너지(Eₐ) 이상의 에너지</b>: 충돌 에너지가 Eₐ 보다 작으면 방향이 맞아도 튕겨요.</li><li>두 조건이 모두 맞을 때만 새 결합이 생겨 CO₂ + NO 가 돼요. 이때 잠깐 거치는 불안정한 상태를 <b>활성화물(전이 상태)</b>이라고 해요.</li></ul>',
      missions: [
        {
          title: '4가지 조합 모두 충돌시키기',
          goal: '방향(맞음·틀림)과 속력(빠름·느림)을 바꿔 <b>4가지 조합</b>을 모두 충돌시켜 결과를 표에 채워요.',
          hint: '방향 칩이나 분자를 눌러 CO 와 NO₂ 의 앞쪽 원자를 바꾸고, 속력 단계를 2 이하(느림)와 3 이상(빠름)으로 나눠 「충돌시키기」를 눌러요.',
          setup() { S.lock = true; lbReset(false); setMode('lab'); },
          check: () => lbAll(), hold: 0.5,
          status: () => LBK.map((k) => k[1].replace('방향 ', '') + '·' + k[2] + ' ' + mark(!!LB().tried[k[0]])).join(' &nbsp; '),
          explain: '<b>방향 맞음 + 빠름</b> 한 가지만 반응했어요. 방향이 틀리면 빨라도 튕기고, 방향이 맞아도 느리면(충돌 에너지 &lt; Eₐ) 튕겨요. 유효 충돌은 두 조건이 모두 필요해요.',
        },
        {
          type: 'quiz', title: '빠르게 부딪히기만 하면 될까?',
          goal: '“분자가 충분히 빠르게(에너지가 크게) 부딪히기만 하면 방향과 관계없이 반응한다.” 이 말은?',
          setup() { S.lock = true; setMode('lab'); },
          choices: ['맞아요. Eₐ 이상의 에너지만 있으면 반응해요', '틀려요. 에너지뿐 아니라 알맞은 방향으로 부딪혀야 해요', '틀려요. 속력은 반응과 관계가 없고 방향만 중요해요', '맞아요. 방향은 반응과 관계가 없어요'],
          answer: 1,
          feedback: ['방향이 틀린 빠른 충돌(C 가 N 쪽에 부딪힘)은 튕겼어요.', '', '방향이 맞아도 느린 충돌은 튕겼어요. 에너지 조건도 필요해요.', '방향이 틀린 충돌은 빨라도 반응하지 않았어요.'],
          explain: '유효 충돌은 <b>방향</b>과 <b>에너지</b> 두 조건이 모두 맞아야 해요. 어느 하나만으로는 반응하지 않아요.',
        },
      ],
    },
    {
      title: '에너지 장벽: 활성화 에너지', short: '에너지 장벽', icon: '⛰', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 충돌 에너지가 Eₐ 보다 작으면 튕긴다는 것을 봤어요. 또 <b>단원 51</b>에서 배운 에너지 도표(엔탈피 H, ΔH)를 이어 써요. 반응 경로–에너지 도표에서 Eₐ 는 반응물이 넘어야 할 <b>장벽</b>의 높이예요.</div>' +
        '<p>충돌한 분자를 <b>공</b>이라고 생각하면 반응물 수준에서 출발해 언덕(장벽)을 넘어야 생성물이 돼요. 에너지 E 가 Eₐ 이상이면 넘고, 작으면 되돌아와요. 두 도표(발열·흡열)에서 <b>Eₐ(정), ΔH, Eₐ(역)</b>을 읽어요.</p>',
      features: ['en'],
      setup() { S.lock = false; setMode('en'); },
      recap: 'Eₐ(정) = 꼭대기 − 반응물 수준, ΔH = 생성물 − 반응물 수준, Eₐ(역) = Eₐ(정) − ΔH 예요.',
      summary: '<ul><li><b>활성화 에너지(Eₐ)</b> = 반응이 일어나기 위해 반응물이 넘어야 하는 최소 에너지 장벽. 충돌 에너지가 Eₐ 이상이어야 반응해요.</li><li>에너지 도표: Eₐ(정) = 반응물 수준에서 꼭대기까지, ΔH = 생성물 수준 − 반응물 수준, Eₐ(역) = Eₐ(정) − ΔH.</li><li>발열 반응: Eₐ = 50 kJ, ΔH = −30 kJ → Eₐ(역) = 80 kJ.</li><li>흡열 반응: Eₐ = 90 kJ, ΔH = +40 kJ → Eₐ(역) = 50 kJ.</li><li>꼭대기의 불안정한 중간 상태를 <b>활성화물(전이 상태)</b>이라고 해요. 발열 반응이라도 Eₐ 장벽이 있어서 점화나 가열이 필요할 수 있어요.</li></ul>',
      missions: [
        {
          title: '공을 굴려 장벽 넘기',
          goal: '충돌 에너지 E 를 Eₐ 보다 <b>작게</b>도, <b>크게</b>도 바꿔 공을 굴려서 두 결과(튕김·넘음)를 모두 확인해요.',
          hint: '언덕 꼭대기 높이가 Eₐ 예요. E 를 30 kJ 로 굴려 보고, 60 kJ 로도 굴려 봐요.',
          setup() { S.lock = true; enReset(); EN().seenPass = false; EN().seenBounce = false; setMode('en'); },
          check: () => EN().seenPass && EN().seenBounce, hold: 0.4,
          status: () => '튕김 ' + mark(EN().seenBounce) + ' &nbsp; 넘음 ' + mark(EN().seenPass),
          explain: 'E ≥ Eₐ 이면 공이 꼭대기(활성화물)를 지나 생성물 수준으로 내려가 <b>반응</b>이 일어나고, E &lt; Eₐ 이면 도중에 되돌아와 <b>튕겨요</b>.',
        },
        {
          title: '도표에서 Eₐ 와 ΔH 읽기',
          goal: '<b>발열·흡열</b> 두 도표에서 Eₐ(정)과 ΔH(kJ)를 읽어 입력해요. 흡열 반응은 도표 칩으로 바꿔요.',
          hint: 'Eₐ(정)은 반응물 수준(0)에서 꼭대기까지의 높이, ΔH 는 생성물 수준 − 반응물 수준이에요. 눈금 한 칸이 10 kJ 예요. 생성물이 아래에 있으면 ΔH 는 음수예요.',
          setup() { S.lock = true; enReset(); enClear([0, 1]); setMode('en'); },
          check: () => enReadDone(), hold: 0.5,
          status: () => DG.map((d, i) => d.name.slice(0, 2) + ' Eₐ ' + mark(EN().ok[i][0]) + ' ΔH ' + mark(EN().ok[i][1])).join(' &nbsp; '),
          explain: '발열 반응: Eₐ = <b>50 kJ</b>, ΔH = <b>−30 kJ</b> (생성물이 더 낮음). 흡열 반응: Eₐ = <b>90 kJ</b>, ΔH = <b>+40 kJ</b> (생성물이 더 높음).',
        },
        {
          title: '역반응의 Eₐ 구하기',
          goal: '두 도표에서 <b>역반응의 활성화 에너지</b> Eₐ(역)을 입력해요. 생성물 수준에서 꼭대기까지의 높이예요.',
          hint: 'Eₐ(역) = Eₐ(정) − ΔH. 발열: 50 − (−30), 흡열: 90 − 40 을 계산해요.',
          setup() { S.lock = true; enReset(); enClear([2]); setMode('en'); },
          check: () => enRevDone(), hold: 0.5,
          status: () => DG.map((d, i) => d.name.slice(0, 2) + ' Eₐ(역) ' + mark(EN().ok[i][2])).join(' &nbsp; '),
          explain: '발열 반응: Eₐ(역) = 50 − (−30) = <b>80 kJ</b>. 흡열 반응: Eₐ(역) = 90 − 40 = <b>50 kJ</b>. 발열 반응은 되돌아가는 장벽이 더 높고, 흡열 반응은 더 낮아요.',
        },
        {
          type: 'quiz', title: '발열 반응인데 왜 가열이 필요할까?',
          goal: '메테인의 연소는 열을 내놓는 <b>발열 반응</b>인데도 불꽃으로 점화해야 시작돼요. 그 까닭은?',
          setup() { S.lock = true; setMode('en'); },
          choices: ['발열 반응은 원래 에너지가 필요 없기 때문이에요', 'Eₐ 장벽을 넘을 만큼의 에너지를 처음에 공급해야 하기 때문이에요', 'ΔH 가 양수라서 에너지를 흡수해야 하기 때문이에요', '생성물이 반응물보다 에너지가 높기 때문이에요'],
          answer: 1,
          feedback: ['발열 반응도 Eₐ 장벽을 넘어야 시작돼요. 장벽 높이는 ΔH 와 별개예요.', '', '발열 반응은 ΔH 가 음수예요. 가열이 필요한 까닭은 ΔH 가 아니라 Eₐ 장벽 때문이에요.', '발열 반응은 생성물이 반응물보다 에너지가 낮아요. 그래도 중간에 Eₐ 장벽이 있어요.'],
          explain: '발열 반응이라도 반응물이 <b>Eₐ 장벽</b>을 넘어야 해요. 점화(불꽃)는 처음의 Eₐ 를 공급하고, 한번 타기 시작하면 반응열이 다음 분자의 Eₐ 를 공급해요.',
        },
      ],
    },
    {
      title: '반응 조건: Eₐ 를 어떻게 공급할까', short: '반응 조건', icon: '🏠', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 반응이 일어나려면 Eₐ 장벽을 넘을 에너지가 필요하다는 것을 알았어요. 우리 주변의 반응에서는 그 에너지가 어디서 올까요? 이것이 <b>반응이 일어나기 위한 조건</b>이에요.</div>' +
        '<p>사례 카드 6장마다 Eₐ 가 어떻게 공급되는지 연결해요. 그다음 Eₐ 슬라이더를 바꿔 같은 충돌 수에서 반응이 얼마나 드물어지는지 비교해요. (이 차시에서는 아레니우스 식이나 정량 식은 다루지 않아요.)</p>',
      features: ['card', 'eas'],
      setup() { S.lock = false; setMode('card'); },
      recap: 'Eₐ 가 크면 상온에서 유효 충돌이 드물어 느리고, 점화·가열·마찰·빛 등으로 에너지를 주면 반응이 시작돼요. ΔH 만으로는 속도를 알 수 없어요.',
      summary: '<ul><li>반응이 일어나려면 Eₐ 이상의 에너지가 필요해요: 성냥은 <b>마찰열</b>, 메테인은 <b>불꽃</b>, 광합성은 <b>빛</b>으로 에너지를 공급해요.</li><li>일단 시작되면 발열 반응의 <b>반응열</b>이 다음 분자의 Eₐ 를 공급해 계속 타요 (폭죽, 종이).</li><li>상온의 H₂ + O₂ 혼합 기체는 Eₐ 가 커서 거의 반응하지 않아 안정해요. 철이 녹스는 것처럼 Eₐ 가 크지 않으면 상온에서도 서서히 진행돼요.</li><li>Eₐ 가 클수록 에너지 조건을 채우는 충돌이 드물어 상온에서 느려요 (예: Eₐ ≈ 100 kJ/mol 이면 충돌 약 10¹⁷~10¹⁸회에 1회). ΔH 가 큰 음수라고 빠른 것은 아니에요.</li></ul>',
      missions: [
        {
          title: '사례 6장 연결하기',
          goal: '사례 카드 <b>6장</b>을 골라 Eₐ 가 어떻게 공급되는지(또는 왜 반응하지 않는지) 알맞게 연결해요.',
          hint: '카드를 누르고 조작판의 여섯 가지 중 하나를 골라요. 성냥은 문질러서, 메테인은 불꽃으로, 광합성은 빛으로, 폭죽은 점화 뒤 반응열의 연쇄예요.',
          manual: true,
          setup() { S.lock = true; resetCards(); setMode('card'); },
          check: () => cdResult(),
          explain: '성냥 → <b>마찰열</b>, 메테인 → <b>불꽃(열)</b>, 철 → 상온의 열에너지로 <b>서서히</b>, 상온의 H₂ + O₂ → Eₐ 가 커서 <b>안정</b>, 광합성 → <b>빛에너지</b>, 폭죽 → 점화 뒤 <b>반응열의 연쇄</b>예요.',
        },
        {
          title: 'Eₐ 가 작을 때와 클 때 비교',
          goal: 'Eₐ 슬라이더를 <b>30 kJ/mol 이하</b>와 <b>100 kJ/mol 이상</b>으로 맞춰 상온 충돌 10²⁰회 중 반응 횟수를 비교해요.',
          hint: '「Eₐ 비교」 화면의 슬라이더를 20~30 으로 한 번, 100~120 으로 한 번 맞춰 반응 횟수 숫자가 어떻게 달라지는지 봐요.',
          setup() { S.lock = true; resetEas(); setMode('eas'); },
          check: () => EAS().seenLo && EAS().seenHi, hold: 0.5,
          status: () => 'Eₐ ≤ 30 ' + mark(EAS().seenLo) + ' &nbsp; Eₐ ≥ 100 ' + mark(EAS().seenHi),
          explain: 'Eₐ = 20 kJ/mol 이면 10²⁰회 충돌 중 약 3.1×10¹⁶회가 반응하지만 Eₐ = 100 kJ/mol 이면 약 300회뿐이에요. Eₐ 가 클수록 상온에서 반응이 훨씬 드물어요 (예시 값).',
        },
        {
          type: 'quiz', title: 'ΔH 가 크게 음수이면 빠를까?',
          goal: '“ΔH 가 큰 음수인 반응(열을 많이 내놓는 반응)은 항상 빠르다.” 이 말은?',
          setup() { S.lock = true; setMode('eas'); },
          choices: ['맞아요. 에너지를 많이 내놓을수록 반응이 빨라요', '틀려요. 속도는 Eₐ 장벽이 정하고 발열량(ΔH)만으로는 알 수 없어요', '맞아요. 발열 반응은 Eₐ 가 항상 0 이에요', '틀려요. 발열 반응은 항상 느려요'],
          answer: 1,
          feedback: ['H₂ 와 O₂ 의 반응은 ΔH 가 큰 음수지만 상온에서 Eₐ 가 커서 거의 일어나지 않아요.', '', '발열 반응도 Eₐ 장벽이 있어요. 그래서 점화가 필요해요.', '발열 반응이 느린 것은 아니에요. 속도는 Eₐ 와 온도 같은 조건에 따라 달라져요.'],
          explain: '반응 속도는 <b>Eₐ 장벽</b>의 높이와 에너지 조건을 채우는 충돌의 수에 달려 있어요. ΔH(반응물과 생성물의 에너지 차)는 속도와 별개의 값이에요 (단원 51의 자발성 ≠ 빠름).',
        },
      ],
    },
  ];

  build();
  game = SciSim.game({
    simId: 'hx-collision', mount: '#game', badge: '충돌 이론가', homeHref: '../../index.html#hx',
    featureLabels: { box: '💥 충돌 모형', lab: '🧪 유효 충돌', en: '⛰ 에너지 장벽', card: '🏠 반응 조건', eas: '🎚 Eₐ 비교' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  boxInit(); lbReset(false); S.ea.disp = S.ea.ea;
  setMode('box');
  function stepAll1(dt) {
    S.t += dt; stepBox(dt * (S.bx.run ? MEAS_RATE : 1)); stepBoxCount(dt); stepLb(dt); stepEn(dt); stepEas(dt);
    const C2 = CDS(); C2.pulse = ap2(C2.pulse, 1, dt, 3);
  }
  let lastFree = false;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'box') { drawBox(S.t); drawBoxInfo(S.t); }
    else if (S.mode === 'lab') { drawLab(S.t); drawLabInfo(S.t); }
    else if (S.mode === 'en') { drawEn(S.t); drawEnInfo(S.t); }
    else if (S.mode === 'card') { drawCards(S.t); drawCardsInfo(S.t); }
    else { drawEas(S.t); drawEasInfo(S.t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, CARDS, DG, CV, LBK, setMode, boxRun, lbRun, lbSet, enRoll, enSetDs, enCheck, cdSel, cdPick, cdResult, setEa, lbAll, lbN, enReadDone, enRevDone, updateCtl, checkBx, eaCount, eaFrac, cntTxt, needTxt, lbContact0, lbHandle, lbYc, cdRect, enReset, resetCards, resetEas,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepAll1(0.02); parts.update(0.02); } },
  };

})();
