/* =========================================================
   물질과 에너지 Ⅲ. 화학 변화의 자발성 - 엔트로피 [12물에03-03]
   ① 관찰: 저절로 일어나는 변화 4장면과 거꾸로 재생 (에너지 보존만으로는 방향을 설명할 수 없어요)
   ② 모형: 두 칸 용기에서 입자의 배열 수 세기 (N = 4, 10, 20, 왼쪽 입자 수의 히스토그램)
   ③ 탐구: 엔트로피가 커지는 조건 (상태 변화, 온도, 부피, 용해, 분자 수)
   ④ 예측: 변화·반응 12가지의 ΔS 부호 분류
   엔트로피는 정성적으로만 다뤄요. S = k ln W, 엔트로피 값 표, ΔS 계산, 깁스 자유 에너지는 다루지 않아요.
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
  const HOT = '#e2553b', COLD = '#2f7fd8';
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
  const f0 = (v) => String(Math.round(v));
  const MINUS = '−';
  const sgn = (v, d) => { const r = Math.round(Math.abs(v) * Math.pow(10, d || 0)) / Math.pow(10, d || 0); const s = r === 0 ? '' : v < 0 ? MINUS : '+'; return s + r.toFixed(d || 0); };
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const ap = SciSim.approach;
  const ap2 = (cur, tg, dt, rate) => (RM ? tg : ap(cur, tg, dt, rate));
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  function parseNum(s) {
    let t = String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => '^' + SUP[c]).replace(/[−–﹣－]/g, '-').replace(/\s+/g, '').replace(/,/g, '');
    const m = t.match(/^([0-9.]+)[×x*]10\^?(-?[0-9]+)$/);
    if (m) return +m[1] * Math.pow(10, +m[2]);
    t = t.replace(/\^/g, ''); if (t !== '' && !isNaN(+t)) return +t;
    t = t.replace(/[^0-9.\-eE+]/g, ''); return t === '' || isNaN(+t) ? NaN : +t;
  }
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const chipBtn = (txt, aria, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (cls) b.className = cls; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', () => { Sound.click(); fn(); }); return b; };
  const shakeBad = (inp) => { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); };
  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 558, w: 464, h: 394 } : { x: 490, y: 50, w: 298, h: 498 },
  };
  function bar(x0, x1, y, col, w) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore(); }
  function dline(x0, y0, x1, y1, col, w) { ctx.save(); ctx.strokeStyle = col || 'rgba(100,116,139,.5)'; ctx.lineWidth = w || 1.4; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore(); }
  function stamp(cx, cy, txt, p, col) {           // p: 0~1 진행. 도장
    const sc = 1 + Math.max(0, 0.35 - p) * 2.4;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.2); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, p * 6);
    ctx.font = D.font(22, 800); const w = ctx.measureText(txt).width + 26;
    D.roundRect(-w / 2, -21, w, 42, 10); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.strokeStyle = col || GOOD; ctx.lineWidth = 4; ctx.stroke(); T(0, 8, txt, 22, col || GOOD, 'center', 800); ctx.restore();
  }

  const MODE_LABEL = { obs: '👀 저절로 일어나는 일들을 관찰해요', model: '🎲 입자가 놓일 수 있는 배열을 세어요', cond: '🔬 배열의 수가 늘어나는 조건을 찾아요', pred: '🎯 ΔS 의 부호를 예측해요' };
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  /* ================= ① 관찰: 장면을 미리 계산해 두고 앞뒤로 재생해요 ================= */
  const NS = 240, SFPS = 30;                       // 8 초, 30 프레임/초
  const SW = 1.6, SH = 1.0;                        // 장면 좌표: 가로 1.6, 세로 1.0
  const SC = [
    { name: '잉크가 물에 퍼짐', icon: '🖋️', fwd: '잉크 입자가 물 전체로 고르게 퍼져요.', bwd: '퍼진 잉크가 저절로 한 방울로 모이는 일은 본 적이 없어요.', en: '입자가 한곳으로 모이는 데 에너지가 필요하지는 않아요.' },
    { name: '기체가 양쪽으로 퍼짐', icon: '💨', fwd: '칸막이를 열면 왼쪽의 기체가 양쪽 칸으로 퍼져요.', bwd: '퍼진 기체가 저절로 왼쪽 칸에만 모이는 일은 본 적이 없어요.', en: '기체가 한쪽으로 모일 때 에너지 변화는 없어요(에너지 보존에 어긋나지 않아요).' },
    { name: '방이 어질러짐', icon: '🧺', fwd: '가지런히 꽂힌 물건들이 방 곳곳에 흩어져요.', bwd: '흩어진 물건이 저절로 제자리로 돌아가는 일은 본 적이 없어요.', en: '물건이 제자리에 있느냐에 따라 에너지가 달라지지는 않아요.' },
    { name: '뜨거운 물과 찬물의 섞임', icon: '🌡️', fwd: '뜨거운 물(빨강)과 찬물(파랑)이 섞여 미지근해져요.', bwd: '미지근한 물이 저절로 뜨거운 쪽과 찬 쪽으로 나뉘는 일은 본 적이 없어요.', en: '거꾸로 되어도 에너지의 총량은 그대로예요(에너지 보존).' },
  ];
  const SNAP = [];
  function buildScene(k) {
    const R = rng(1000 + k * 77), snaps = [];
    const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += R(); return (s - 3) / 0.7071; };
    if (k === 0) {
      const N = 80, p = []; for (let i = 0; i < N; i++) p.push([0.8 + (R() - 0.5) * 0.12, 0.18 + (R() - 0.5) * 0.1]);
      for (let f = 0; f <= NS; f++) {
        snaps.push(p.map((q) => [q[0], q[1]]));
        for (const q of p) { q[0] += gauss() * 0.02; q[1] += gauss() * 0.02 + 0.0015; q[0] = refl(q[0], 0.03, SW - 0.03); q[1] = refl(q[1], 0.03, SH - 0.03); }
      }
    } else if (k === 1 || k === 3) {
      const N = k === 1 ? 36 : 40, r = 0.034, xp = 0.8, open = 15, p = [];
      for (let i = 0; i < N; i++) {
        let x, y, ok, tries = 0;
        do { x = r + R() * (xp - 2 * r); y = r + R() * (SH - 2 * r); ok = p.every((q) => Math.hypot(q.x - x, q.y - y) > 2.2 * r); tries++; } while (!ok && tries < 400);
        const hot = k === 3 && i < N / 2;
        const sp = k === 1 ? 0.55 : (i < N / 2 ? 0.95 : 0.25), a = R() * TAU;
        if (k === 3 && i >= N / 2) { x = xp + r + R() * (SW - xp - 2 * r); }
        p.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, hot });
      }
      if (k === 3) for (let i = N / 2; i < N; i++) { const q = p[i]; let tries = 0; while (tries++ < 400 && p.some((o, j) => j !== i && o.x > xp && Math.hypot(o.x - q.x, o.y - q.y) < 2.2 * r)) { q.x = xp + r + R() * (SW - xp - 2 * r); q.y = r + R() * (SH - 2 * r); } }
      const dt = 1 / SFPS / 3;
      for (let f = 0; f <= NS; f++) {
        snaps.push(p.map((q) => [q.x, q.y, Math.hypot(q.vx, q.vy)]));
        for (let sub = 0; sub < 3; sub++) {
          const wall = f < open;                                         // 칸막이가 열리기 전에는 칸막이에서도 튕겨요
          for (const q of p) {
            q.x += q.vx * dt; q.y += q.vy * dt;
            if (q.y < r) { q.y = r; q.vy = Math.abs(q.vy); } if (q.y > SH - r) { q.y = SH - r; q.vy = -Math.abs(q.vy); }
            if (q.x < r) { q.x = r; q.vx = Math.abs(q.vx); } if (q.x > SW - r) { q.x = SW - r; q.vx = -Math.abs(q.vx); }
            if (wall) { if (q.x < xp && q.x > xp - r) { q.x = xp - r; q.vx = -Math.abs(q.vx); } else if (q.x >= xp && q.x < xp + r) { q.x = xp + r; q.vx = Math.abs(q.vx); } }
          }
          for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
            const a = p[i], b = p[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
            if (d2 < 4 * r * r && d2 > 1e-9) {
              const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (rel > 0) { a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx; b.vy += rel * ny; }
              const ov = (2 * r - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
            }
          }
        }
      }
    } else {
      const N = 16, items = [];
      for (let i = 0; i < N; i++) items.push({ x0: 0.14 + i * 0.087, y0: 0.13, x1: 0.1 + R() * 1.4, y1: 0.35 + R() * 0.55, a1: (R() - 0.5) * 2.6, ph: R() * TAU });
      for (let f = 0; f <= NS; f++) {
        const e = sm((f / NS - 0.08) / 0.8);
        snaps.push(items.map((q) => [q.x0 + (q.x1 - q.x0) * e + Math.sin(f * 0.3 + q.ph) * 0.012 * Math.sin(Math.PI * e), q.y0 + (q.y1 - q.y0) * e + Math.cos(f * 0.27 + q.ph) * 0.012 * Math.sin(Math.PI * e), q.a1 * e]));
      }
    }
    return snaps;
  }
  function refl(v, lo, hi) { while (v < lo || v > hi) { if (v < lo) v = 2 * lo - v; if (v > hi) v = 2 * hi - v; } return v; }
  const getSnap = (k) => SNAP[k] || (SNAP[k] = buildScene(k));
  function stepSnapTime(p) {                                               // 보간된 프레임
    const f = clamp(p, 0, NS), i0 = Math.floor(f), i1 = Math.min(NS, i0 + 1), w = f - i0; return [i0, i1, w];
  }
  const speedCol = (v) => C.mix('#3b82f6', '#ef4444', clamp((v - 0.2) / 0.9, 0, 1));

  const OB = () => S.ob;
  const obPlay = () => {
    const O = OB(); if (O.dir === 1) return;
    if (O.p >= NS - 0.01) O.p = 0;
    O.dir = 1; Sound.click(); updateCtl();
  };
  const obRev = () => {
    const O = OB();
    if (!O.played[O.sel] || O.p < 0.5) { showHint('먼저 ▶ 재생으로 끝까지 본 뒤에 거꾸로 재생해요.'); Sound.fail(); return; }
    O.dir = -1; Sound.click(); updateCtl();
  };
  function setOb(i) { const O = OB(); if (O.sel !== i) { O.sel = i; O.p = 0; O.dir = 0; } Sound.tick(); updateCtl(); }
  function obJudge(sayYes) {
    const O = OB(), i = O.sel;
    if (!O.played[i] || !O.rev[i]) { showHint('장면을 재생하고 거꾸로 재생도 본 뒤에 판정해요.'); Sound.fail(); return; }
    if (sayYes) { O.judged[i] = -1; O.msg = '에너지 보존에는 어긋나지 않지만, 이런 일은 관찰된 적이 없어요. 다시 생각해 봐요.'; Sound.fail(); showHint(O.msg, 5000); }
    else { O.judged[i] = 1; O.msg = '맞아요! 에너지는 보존되는데도 이 방향으로는 저절로 일어나지 않아요.'; Sound.success(); parts.burst(RC.L.x + RC.L.w / 2, RC.L.y + 200, { count: 16, speed: 150, life: 0.7, size: 3.8 }); showHint(O.msg, 3500); }
    updateCtl();
  }
  function stepOb(dt) {
    const O = OB(); if (O.dir === 0) return;
    O.p += O.dir * dt * SFPS * (RM ? 3 : 1);
    if (O.dir === 1 && O.p >= NS) { O.p = NS; O.dir = 0; O.played[O.sel] = true; Sound.tick(); updateCtl(); }
    else if (O.dir === -1 && O.p <= 0) { O.p = 0; O.dir = 0; O.rev[O.sel] = true; Sound.tick(); updateCtl(); }
  }
  const obRect = () => { const L = RC.L; return { x: L.x + 20, y: L.y + 70, w: L.w - 40, h: Math.round((L.w - 40) / 1.6) }; };
  function drawObsScene(t) {
    const L = RC.L, O = OB(), k = O.sel, rc = obRect(), sc = rc.w / SW, sn = getSnap(k), [i0, i1, w] = stepSnapTime(O.p);
    const X = (x) => rc.x + x * sc, Y = (y) => rc.y + y * sc;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, SC[k].icon + ' ' + SC[k].name, PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '▶ 로 재생하고, 끝까지 본 뒤 ⏪ 로 거꾸로 재생해 봐요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    // 용기
    ctx.save(); D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.clip();
    ctx.fillStyle = k === 0 || k === 3 ? '#e6f2fd' : k === 1 ? '#fbfcff' : '#f7f0e4'; ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
    if (k === 2) { ctx.fillStyle = '#e8d8bc'; ctx.fillRect(rc.x, Y(0.26), rc.w, rc.h - (Y(0.26) - rc.y)); ctx.fillStyle = '#b98f5c'; ctx.fillRect(rc.x, Y(0.2), rc.w, 0.035 * sc); }
    sn[i0].forEach((a, j) => {
      const b = sn[i1][j], x = a[0] + (b[0] - a[0]) * w, y = a[1] + (b[1] - a[1]) * w;
      if (k === 0) D.sphere(X(x), Y(y), 0.02 * sc * 1.1, '#5b2a86', { gloss: false });
      else if (k === 1) D.sphere(X(x), Y(y), 0.034 * sc, '#8b5cf6', { shadow: false });
      else if (k === 3) D.sphere(X(x), Y(y), 0.034 * sc, speedCol(a[2] + (b[2] - a[2]) * w), { shadow: false });
      else {
        const ang = a[2] + (b[2] - a[2]) * w; ctx.save(); ctx.translate(X(x), Y(y)); ctx.rotate(ang); const bw = 0.075 * sc, bh = 0.12 * sc;
        D.roundRect(-bw / 2, -bh / 2, bw, bh, 3); ctx.fillStyle = ['#e2553b', '#3867f4', '#14a058', '#d97706'][j % 4]; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
      }
    });
    ctx.restore();
    // 칸막이 (장면 1, 3)
    if (k === 1 || k === 3) {
      const open = 15, f = O.p, up = clamp((f - open + 8) / 8, 0, 1), px = X(0.8);
      if (up < 1) { ctx.fillStyle = '#7d8aa0'; D.roundRect(px - 3, rc.y - 4 - up * rc.h, 6, rc.h + 4, 3); ctx.fill(); }
      T(rc.x + rc.w * 0.25, rc.y + rc.h + 18, k === 3 ? '처음의 뜨거운 물' : '처음에 기체가 든 칸', 12.5, k === 3 ? HOT : MUTED, 'center', 800);
      T(rc.x + rc.w * 0.75, rc.y + rc.h + 18, k === 3 ? '처음의 찬물' : '처음에 빈 칸', 12.5, k === 3 ? COLD : MUTED, 'center', 800);
    }
    D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
    if (O.dir === -1) { D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fillStyle = 'rgba(124,58,237,.10)'; ctx.fill(); D.label(rc.x + rc.w - 10, rc.y + 22, '⏪ 거꾸로 재생', { size: 13, bg: PUR, align: 'right' }); }
    else if (O.dir === 1) D.label(rc.x + rc.w - 10, rc.y + 22, '▶ 재생 중', { size: 13, bg: '#8a95a8', align: 'right' });
    // 진행 막대
    const by = rc.y + rc.h + 34;
    D.roundRect(rc.x, by, rc.w, 8, 4); ctx.fillStyle = '#e2e8f3'; ctx.fill();
    D.roundRect(rc.x, by, Math.max(0, rc.w * O.p / NS), 8, 4); ctx.fillStyle = O.dir === -1 ? PUR : '#8a95a8'; ctx.fill();
    T(rc.x, by + 28, '0 초', 12, MUTED, 'left', 700); T(rc.x + rc.w, by + 28, '8 초', 12, MUTED, 'right', 700);
    const msg = !O.played[k] ? '재생을 눌러 어떻게 되는지 봐요.' : !O.rev[k] ? '이제 ⏪ 거꾸로 재생을 눌러 반대 방향의 영상을 봐요.' : O.judged[k] === 1 ? '✅ 이 장면은 판정을 마쳤어요.' : '이런 거꾸로의 일이 실제로 일어날까요? 오른쪽 조작판에서 판정해요.';
    textBlock(L.x + 14, by + 54, L.w - 28, msg, 13, INK, 18, 800);
    // 판정 표시
    O.judged.forEach((j, i) => { const cx = L.x + L.w - 24 - (3 - i) * 24; if (j === 1) D.check(cx, L.y + 26, 9, 1); else D.sphere(cx, L.y + 26, 6, i === k ? PUR : '#c7cedd', { gloss: false }); });
  }
  function drawObsInfo(t) {
    const R = RC.R, O = OB(), k = O.sel, s = SC[k];
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📺 장면 살펴보기', 14.5, INK, 'left', 800);
    let y = R.y + 50;
    const blocks = [['▶ 앞으로', s.fwd, INK], ['⏪ 거꾸로', s.bwd, PUR], ['⚡ 에너지', s.en, AMB]];
    blocks.forEach((b) => { T(R.x + 14, y, b[0], 13.5, b[2], 'left', 800); const h = textBlock(R.x + 14, y + 20, R.w - 28, b[1], 13, INK, 18, 700); y += 20 + h + 10; });
    // 판정 진행
    const cy = R.y + R.h - 112;
    D.roundRect(R.x + 10, cy, R.w - 20, 100, 12); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    T(R.x + 20, cy + 22, '판정한 장면 ' + O.judged.filter((v) => v === 1).length + ' / 4', 13.5, O.judged.every((v) => v === 1) ? GOOD : INK, 'left', 800);
    SC.forEach((q, i) => { const x = R.x + 20 + i * ((R.w - 40) / 4); D.sphere(x + 14, cy + 54, 13, O.judged[i] === 1 ? GOOD : i === k ? PUR : '#c7cedd', { text: String(i + 1), shadow: false }); });
    T(R.x + 20, cy + 88, O.judged.every((v) => v === 1) ? '에너지만으로는 방향을 설명할 수 없어요!' : '네 장면을 모두 판정해요', 12.5, MUTED, 'left', 700);
  }

  /* ================= ② 모형: 두 칸 용기의 배열 수 ================= */
  const NS_OPT = [4, 10, 20];
  const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
  const W4 = [1, 4, 6, 4, 1];
  const MD = () => S.md;
  const mdCont = () => { const L = RC.L; return { x: L.x + 20, y: L.y + 66, w: L.w - 40, h: PHONE ? 170 : 166 }; };
  function mdSet(N) {                                                // 입자 수를 바꿔요
    const M = MD(); M.N = N; M.k = N === 4 ? 0 : N === 10 ? 1 : 2;
    M.pts = []; for (let i = 0; i < N; i++) M.pts.push({ x: 0.1 + 0.8 * ((i % 8) + 0.5) / 8 * 0.5, y: 0.2 + 0.6 * (Math.floor(i / 8) + 0.5) / 3, tx: 0, ty: 0, side: 0 });
    // 처음에는 왼쪽 칸에 모아 둬요
    M.pts.forEach((p, i) => { p.x = 0.06 + 0.38 * ((i * 0.618) % 1); p.y = 0.1 + 0.8 * (((i * 0.37) + 0.11) % 1); p.tx = p.x; p.ty = p.y; p.side = 0; });
    M.last = -1; M.divider = 1; M.pend = 0;
  }
  function mdTrial(anim) {
    const M = MD(), N = M.N, k = M.k;
    let left = 0;
    M.pts.forEach((p) => {
      const isL = Math.random() < 0.5; if (isL) left++;
      p.side = isL ? 0 : 1;
      p.tx = (isL ? 0.04 : 0.54) + Math.random() * 0.42; p.ty = 0.07 + Math.random() * 0.86;
      if (!anim) { p.x = p.tx; p.y = p.ty; }
    });
    M.hist[k][left]++; M.trials[k]++; M.last = left;
    if (left === 0 || left === N) M.one[k]++;
    if (anim) { M.divider = 0; M.pend = 1.2; }
    return left;
  }
  function mdMany(n) {
    const M = MD(), N = M.N, k = M.k;
    for (let i = 0; i < n; i++) { let left = 0; for (let j = 0; j < N; j++) if (Math.random() < 0.5) left++; M.hist[k][left]++; M.trials[k]++; if (left === 0 || left === N) M.one[k]++; M.last = left; }
    Sound.tick(); updateCtl();
  }
  function stepMd(dt) {
    const M = MD();
    M.pts.forEach((p) => { p.x = ap2(p.x, p.tx, dt, 5); p.y = ap2(p.y, p.ty, dt, 5); });
    if (M.pend > 0) { M.pend = Math.max(0, M.pend - dt); if (M.pend === 0) { M.divider = 1; } }
    M.hd = M.hd || [];
    for (let k = 0; k < 3; k++) { M.hd[k] = M.hd[k] || []; for (let j = 0; j < M.hist[k].length; j++) M.hd[k][j] = ap2(M.hd[k][j] || 0, M.hist[k][j], dt, 6); }
    const top = M.hmax[M.k], need = Math.max(...M.hist[M.k]);
    M.hmax[M.k] = ap2(top, Math.max(need, 1), dt, 4);
  }
  const mdOkTable = () => MD().tab.map((v, i) => v !== '' && Math.abs(parseNum(v) - W4[i]) < 1e-9);
  const mdTableAll = () => mdOkTable().every((v) => v);
  function drawArr4(x, y, w, h) {                                    // 입자 4개의 16가지 배열 (왼쪽 입자 수별로 묶어서)
    T(x, y + 14, '입자 A, B, C, D 의 배열 (보라 = 왼쪽 칸, 주황 = 오른쪽 칸)', 12.5, MUTED, 'left', 800);
    const names = ['A', 'B', 'C', 'D'], cellW = (w - 4 * 8) / 5 , gy = y + 28;
    for (let kk = 0; kk <= 4; kk++) {
      const cx = x + kk * (cellW + 8);
      T(cx + cellW / 2, gy + 12, '왼쪽 ' + kk + '개', 12, kk === 2 ? PUR : INK, 'center', 800);
      const list = []; for (let m = 0; m < 16; m++) { let c = 0; for (let b = 0; b < 4; b++) if (!(m & (1 << b))) c++; if (c === kk) list.push(m); }
      list.forEach((m, j) => {
        const yy = gy + 22 + j * 24;
        D.roundRect(cx, yy, cellW, 20, 5); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1; ctx.stroke();
        for (let b = 0; b < 4; b++) { const isL = !(m & (1 << b)); D.sphere(cx + 9 + b * ((cellW - 18) / 3), yy + 10, 5.2, isL ? '#8b5cf6' : '#f59e0b', { gloss: false }); }
      });
    }
    T(x, y + h - 4, '줄 안의 점은 왼쪽부터 A, B, C, D 예요.', 11.5, MUTED, 'left', 700);
  }
  function drawModel(t) {
    const L = RC.L, M = MD(), N = M.N, rc = mdCont();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🎲 두 칸 용기에 입자 ' + N + '개', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '섞을 때마다 입자가 왼쪽 칸이나 오른쪽 칸에 무작위로 놓여요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    ctx.save(); D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.clip(); ctx.fillStyle = '#fbfcff'; ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
    ctx.fillStyle = 'rgba(139,92,246,.07)'; ctx.fillRect(rc.x, rc.y, rc.w / 2, rc.h); ctx.fillStyle = 'rgba(245,158,11,.08)'; ctx.fillRect(rc.x + rc.w / 2, rc.y, rc.w / 2, rc.h); ctx.restore();
    M.pts.forEach((p) => { const x = rc.x + 12 + clamp(p.x, 0, 1) * (rc.w - 24), y = rc.y + 12 + clamp(p.y, 0, 1) * (rc.h - 24); D.sphere(x, y, N > 10 ? 7 : 9, p.side === 0 ? '#8b5cf6' : '#f59e0b', { shadow: true }); });
    D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
    const dv = M.divider; ctx.save(); ctx.globalAlpha = 0.35 + 0.65 * dv; ctx.fillStyle = '#7d8aa0'; D.roundRect(rc.x + rc.w / 2 - 3, rc.y + 2 - (1 - dv) * 12, 6, rc.h - 4, 3); ctx.fill(); ctx.restore();
    T(rc.x + rc.w * 0.25, rc.y + rc.h + 18, '왼쪽 칸', 12.5, '#6d3fd0', 'center', 800); T(rc.x + rc.w * 0.75, rc.y + rc.h + 18, '오른쪽 칸', 12.5, '#b45309', 'center', 800);
    const ys = rc.y + rc.h + 30;
    if (N === 4) drawArr4(L.x + 14, ys + 6, L.w - 28, L.h - (ys - L.y) - 12);
    else {
      D.roundRect(L.x + 12, ys + 8, L.w - 24, L.h - (ys - L.y) - 20, 12); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
      const yy = ys + 34;
      T(L.x + 26, yy, '전체 배열의 수  ' + (N === 10 ? '2¹⁰ = 1,024가지' : '2²⁰ = 1,048,576가지'), 14, INK, 'left', 800);
      T(L.x + 26, yy + 26, '입자가 모두 왼쪽 칸에 있는 배열: 1가지', 13.5, INK, 'left', 800);
      T(L.x + 26, yy + 52, '확률 ' + (N === 10 ? '1 / 1,024 ≈ 0.1 %' : '1 / 1,048,576 ≈ 0.0001 %'), 13.5, PUR, 'left', 800);
      textBlock(L.x + 26, yy + 78, L.w - 52, '입자가 많아질수록 한쪽에 모이는 배열의 비율은 급격히 줄어요. 입자가 100개이면 약 10⁻³⁰ 으로 사실상 0 이고, 실제 기체 1 mol(6×10²³개)에서는 고르게 퍼진 상태가 압도적이에요.', 12.5, MUTED, 16, 700);
    }
  }
  function drawModelInfo(t) {
    const R = RC.R, M = MD(), N = M.N, k = M.k, hist = M.hist[k], hd = M.hd[k] || hist;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📊 왼쪽 칸의 입자 수 (N = ' + N + ')', 14, INK, 'left', 800);
    T(R.x + 14, R.y + 42, '시행 ' + M.trials[k] + '번 · 모두 한쪽에 모인 횟수 ' + M.one[k] + '번', 12, MUTED, 'left', 700);
    const px = R.x + 38, pw = R.w - 52, py = R.y + 76, ph = R.h - 190, ymax = Math.max(M.hmax[k], 4);
    const nice = (v) => { const e = Math.pow(10, Math.floor(Math.log10(v))); const f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; };
    const top = nice(ymax * 1.05), Y = (v) => py + ph - clamp(v / top, 0, 1) * ph;
    ctx.strokeStyle = '#eef1f7'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const v = top * i / 4, yy = Y(v); ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy); ctx.stroke(); T(px - 6, yy + 4, f0(v), 11.5, MUTED, 'right', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
    const nb = N + 1, bw = pw / nb;
    for (let j = 0; j < nb; j++) {
      const h = clamp(hd[j] || 0, 0, top), x = px + j * bw, mid = j === Math.round(N / 2);
      if (h > 0.01) { D.roundRect(x + bw * 0.1, Y(h), bw * 0.8, py + ph - Y(h), 2); ctx.fillStyle = mid ? 'rgba(124,58,237,.85)' : 'rgba(139,92,246,.6)'; ctx.fill(); }
      if (N <= 10 || j % 2 === 0) T(x + bw / 2, py + ph + 16, String(j), 12, MUTED, 'center', 700);
      if (hist[j] > 0 && N <= 10) T(x + bw / 2, Y(h) - 4, String(hist[j]), 11.5, INK, 'center', 800, HALO);
    }
    T(px + pw / 2, py + ph + 34, '왼쪽 칸의 입자 수 →', 12, MUTED, 'center', 800); T(px - 6, py - 10, '시행 횟수', 12, MUTED, 'left', 800);
    if (N === 4) { for (let j = 0; j < 5; j++) T(px + j * bw + bw / 2, py + ph + 50, 'W=' + W4[j], 11.5, '#6d3fd0', 'center', 800); }
    const msg = M.trials[k] < 20 ? '「섞기」를 여러 번 눌러 막대가 어떻게 쌓이는지 봐요.' : N === 4 ? '가운데(2개)가 가장 높아요. 배열의 수 W 가 많은 경우가 더 자주 나타나요.' : '가운데가 가장 높은 종 모양이에요. 한쪽 끝은 거의 나타나지 않아요.';
    textBlock(R.x + 14, R.y + R.h - 36, R.w - 28, msg, 12.5, INK, 16, 700);
  }

  /* ================= ③ 탐구: 엔트로피가 커지는 조건 ================= */
  const CD = [
    { k: 'state', name: '상태 변화', lab: '상태: 고체 ↔ 액체 ↔ 기체', note: '고체 → 액체 → 기체로 갈수록 입자가 놓일 수 있는 배열이 늘어요.', why: '고체의 입자는 제자리에서 진동해요. 액체는 서로 미끄러지며 위치를 바꾸고, 기체는 용기 전체를 돌아다녀요. 입자가 놓일 수 있는 배열의 수: 고체 < 액체 < 기체.' },
    { k: 'temp', name: '온도 올리기', lab: '온도: 낮음 ↔ 높음', note: '온도가 높을수록 입자의 운동이 다양해져요.', why: '온도가 오르면 입자의 진동이 커지고 속력의 분포가 넓어져, 입자가 가질 수 있는 운동 상태가 다양해져요. 엔트로피가 조금 커져요.' },
    { k: 'vol', name: '부피 팽창', lab: '기체의 부피: 작음 ↔ 큼 (2배)', note: '부피가 커지면 입자가 놓일 자리가 늘어요.', why: '같은 입자가 더 넓은 공간에 놓일 수 있어요. 가능한 배열의 수가 늘어나 엔트로피가 커져요.' },
    { k: 'diss', name: '용해', lab: '용해: 결정 ↔ 녹아서 퍼짐', note: '결정을 이루던 이온이 물에 퍼져요.', why: '결정에서는 이온이 격자의 정해진 자리에 있어요. 녹으면 이온이 물 전체로 퍼져 배열의 수가 늘어요. (물 분자의 변화는 정성적으로 생략해요.)' },
    { k: 'mol', name: '분자 수 증가', lab: '반응: 반응 전 ↔ 반응 후', note: '2H₂O₂ → 2H₂O + O₂ : 분자가 2개에서 3개로, 기체가 생겨요.', why: '입자(분자) 수가 늘고 기체가 생기면 입자가 놓일 수 있는 배열이 크게 늘어요. 반응에서 기체의 몰수가 늘면 엔트로피가 커져요.' },
  ];
  const CDN = CD.length;
  function sLevel(k, p) {                                              // 배열의 수(정성적 크기, 0~1)
    if (k === 0) return p < 0.5 ? 0.12 + 0.30 * sm(p * 2) : 0.42 + 0.50 * sm((p - 0.5) * 2);
    if (k === 1) return 0.22 + 0.16 * p;
    if (k === 2) return 0.42 + 0.34 * p;
    if (k === 3) return 0.24 + 0.50 * sm(p);
    return 0.30 + 0.50 * sm(p);
  }
  const CDS = () => S.cd;
  function cdPick(k) { S.cd.sel = k; Sound.tick(); cdSyncSlide(); updateCtl(); }
  function cdSet(v) {
    const C0 = CDS(), k = C0.sel; v = clamp(Math.round(v), 0, 100);
    C0.p[k] = v / 100; if (v >= 95) C0.seen[k] = true; cdSyncSlide(); updateCtl();
  }
  function cdSyncSlide() { const k = CDS().sel; $('#cdSlide').value = Math.round(CDS().p[k] * 100); }
  function stepCd(dt) { const C0 = CDS(); for (let k = 0; k < CDN; k++) { C0.pd[k] = ap2(C0.pd[k], C0.p[k], dt, 6); if (Math.abs(C0.pd[k] - C0.p[k]) < 0.002) C0.pd[k] = C0.p[k]; } }
  const cdCont = () => { const L = RC.L; return { x: L.x + 20, y: L.y + 66, w: L.w - 40, h: 316 }; };
  const CDR = rng(4242);
  const CP = { liq: [], gas: [], diss: [], vol: [] };
  (function () { for (let i = 0; i < 20; i++) { CP.liq.push([0.12 + CDR() * 0.76, 0.58 + CDR() * 0.36]); CP.gas.push([0.06 + CDR() * 0.88, 0.06 + CDR() * 0.88]); CP.vol.push([CDR(), CDR()]); } for (let i = 0; i < 12; i++) CP.diss.push([0.08 + CDR() * 0.84, 0.1 + CDR() * 0.8]); })();
  function mol(x, y, kind, a, sc) {                                    // 간단한 분자 그림 (kind: h2o2 | h2o | o2)
    sc = sc || 1; a = a == null ? 1 : a; if (a <= 0.01) return; ctx.save(); ctx.globalAlpha = a;
    const O = (xx, yy) => D.sphere(x + xx * sc, y + yy * sc, 10 * sc, '#e2464b', { shadow: false }), H = (xx, yy) => D.sphere(x + xx * sc, y + yy * sc, 6 * sc, '#f4f6fa', { gloss: false, outline: '#b5bccb', outlineWidth: 1 });
    const bond = (x1, y1, x2, y2) => { ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 3 * sc; ctx.beginPath(); ctx.moveTo(x + x1 * sc, y + y1 * sc); ctx.lineTo(x + x2 * sc, y + y2 * sc); ctx.stroke(); };
    if (kind === 'h2o2') { bond(-13, 0, 13, 0); bond(-13, 0, -22, -14); bond(13, 0, 22, 14); O(-13, 0); O(13, 0); H(-23, -15); H(23, 15); }
    else if (kind === 'h2o') { bond(0, 0, -14, 12); bond(0, 0, 14, 12); H(-15, 13); H(15, 13); O(0, -2); }
    else { ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3 * sc; ctx.beginPath(); ctx.moveTo(x - 8 * sc, y - 3 * sc); ctx.lineTo(x + 8 * sc, y - 3 * sc); ctx.moveTo(x - 8 * sc, y + 3 * sc); ctx.lineTo(x + 8 * sc, y + 3 * sc); ctx.stroke(); O(-10, 0); O(10, 0); }
    ctx.restore();
  }
  function drawCond(t) {
    const L = RC.L, C0 = CDS(), k = C0.sel, p = C0.pd[k], rc = cdCont(), Nn = 20;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🔬 ' + CD[k].name + ': 입자의 배열이 어떻게 달라질까요?', PHONE ? 13.5 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '조작판의 슬라이더로 변화를 일으켜요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    const bgc = k === 3 ? '#e1f0fd' : '#fbfcff';
    ctx.save(); D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.clip(); ctx.fillStyle = bgc; ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
    const px = (u) => rc.x + 14 + u * (rc.w - 28), py = (v) => rc.y + 14 + v * (rc.h - 28);
    const wob = (i, amp, fr) => [Math.sin(t * fr + i * 2.3) * amp, Math.cos(t * fr * 1.13 + i * 1.7) * amp];
    if (k === 0 || k === 1) {
      const a1 = k === 0 ? 0 : 1 + 9 * p, col = k === 1 ? C.mix('#3b82f6', '#ef4444', p) : '#8b5cf6';
      for (let i = 0; i < Nn; i++) {
        const r = Math.floor(i / 5), c = i % 5, lat = [0.5 + (c - 2) * 0.13, 0.52 + (r - 1.5) * 0.16];
        let x, y, w;
        if (k === 1) { w = wob(i, a1 * 0.9, 9 + (i % 3)); x = px(lat[0]) + w[0]; y = py(lat[1]) + w[1]; }
        else {
          const q = p < 0.5 ? sm(p * 2) : 1, g = p < 0.5 ? 0 : sm((p - 0.5) * 2);
          let u = lat[0] + (CP.liq[i][0] - lat[0]) * q, v = lat[1] + (CP.liq[i][1] - lat[1]) * q;
          u = u + (CP.gas[i][0] - u) * g; v = v + (CP.gas[i][1] - v) * g;
          const amp = p < 0.5 ? 1.5 + 4 * sm(p * 2) : 5.5 + 9 * sm((p - 0.5) * 2); w = wob(i, amp, 5 + (i % 4));
          x = clamp(px(u) + w[0], rc.x + 12, rc.x + rc.w - 12); y = clamp(py(v) + w[1], rc.y + 12, rc.y + rc.h - 12);
        }
        D.sphere(x, y, 9, col, { shadow: true });
      }
      T(rc.x + rc.w / 2, rc.y + rc.h - 8, k === 0 ? (p < 0.25 ? '고체' : p < 0.75 ? '액체' : '기체') : p < 0.3 ? '낮은 온도: 제자리 진동이 작아요' : '높은 온도: 진동이 커졌어요', 13, INK, 'center', 800, HALO);
    } else if (k === 2) {
      const wx = rc.x + 10 + (rc.w - 20) * (0.5 + 0.5 * p);
      for (let i = 0; i < 16; i++) { const u = CP.vol[i][0], v = CP.vol[i][1], w = wob(i, 6, 3 + (i % 3)), x = clamp(rc.x + 20 + u * (wx - rc.x - 40) + w[0], rc.x + 14, wx - 12), y = clamp(py(v) + w[1], rc.y + 14, rc.y + rc.h - 14); D.sphere(x, y, 8, '#8b5cf6', { shadow: true }); }
      ctx.fillStyle = '#7d8aa0'; D.roundRect(wx, rc.y + 2, 8, rc.h - 4, 3); ctx.fill();
      ctx.fillStyle = 'rgba(100,116,139,.12)'; ctx.fillRect(wx + 8, rc.y, rc.x + rc.w - wx - 8, rc.h);
      T(rc.x + 14, rc.y + rc.h - 8, '부피 ' + f1(1 + p) + '배', 13, INK, 'left', 800, HALO);
    } else if (k === 3) {
      const q = sm(p);
      for (let i = 0; i < 12; i++) {
        const r = Math.floor(i / 4), c = i % 4, lat = [0.12 + c * 0.08, 0.62 + r * 0.1], rnd2 = CP.diss[i], na = (r + c) % 2 === 0;
        const w = wob(i, 1 + 5 * q, 5 + (i % 3)); const u = lat[0] + (rnd2[0] - lat[0]) * q, v = lat[1] + (rnd2[1] - lat[1]) * q;
        D.sphere(clamp(px(u) + w[0], rc.x + 12, rc.x + rc.w - 12), clamp(py(v) + w[1], rc.y + 12, rc.y + rc.h - 12), 9, na ? '#8b5cf6' : '#14a058', { shadow: true, text: na ? '+' : '−' });
      }
      T(rc.x + rc.w - 12, rc.y + 22, '보라 +: Na⁺   초록 −: Cl⁻', 12.5, MUTED, 'right', 800, HALO);
    } else {
      const q = sm(clamp(p * 1.3, 0, 1)), q2 = sm(clamp((p - 0.35) / 0.65, 0, 1)), cx = rc.x + rc.w / 2, cy = rc.y + rc.h / 2;
      const a = (i, fr) => wob(i, 3, fr);
      [[-0.2, -0.05], [0.2, 0.06]].forEach((o, i) => { const w = a(i, 4); mol(cx + o[0] * rc.w + w[0], cy + o[1] * rc.h + w[1], 'h2o2', 1 - q, 1.3); });
      [[-0.3, -0.12], [0.02, 0.13]].forEach((o, i) => { const w = a(i + 3, 4); mol(cx + o[0] * rc.w + w[0] - 0.05 * rc.w * q2, cy + o[1] * rc.h + w[1], 'h2o', q2, 1.3); });
      const w3 = a(7, 5), ox = cx + (0.12 + 0.2 * q2) * rc.w + w3[0], oy = cy - (0.05 + 0.16 * q2) * rc.h + w3[1];
      mol(ox, oy, 'o2', q2, 1.3);
      if (q2 > 0.6) T(ox, oy - 26, 'O₂ (기체)', 12.5, INK, 'center', 800, HALO);
      T(rc.x + rc.w / 2, rc.y + rc.h - 8, p < 0.5 ? '분자 2개 (H₂O₂ 2개)' : '분자 3개 (H₂O 2개 + O₂ 1개)', 13, INK, 'center', 800, HALO);
    }
    ctx.restore(); D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
    // 아래 설명
    textBlock(L.x + 14, rc.y + rc.h + 26, L.w - 28, CD[k].note, 13, INK, 18, 800);
    // 도구
    CD.forEach((c, i) => D.sphere(L.x + 24 + i * 22, L.y + L.h - 18, 7, C0.seen[i] ? GOOD : '#c7cedd', { gloss: false }));
    T(L.x + 24 + CDN * 22 + 4, L.y + L.h - 13, '살펴본 조건 ' + C0.seen.filter((v) => v).length + ' / ' + CDN, 12.5, C0.seen.every((v) => v) ? GOOD : MUTED, 'left', 800);
  }
  function drawCondInfo(t) {
    const R = RC.R, C0 = CDS(), k = C0.sel, p = C0.pd[k];
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📊 배열의 수 (정성적 크기)', 14, INK, 'left', 800);
    const bx = R.x + 20, bw = PHONE ? 100 : 66, gap = PHONE ? 60 : 36, by0 = R.y + 66, bh = PHONE ? 150 : 190;
    const s0 = sLevel(k, 0), s1 = sLevel(k, p);
    const cols = [['처음', s0, '#a5adbd'], ['지금', s1, '#7c3aed']];
    const x0 = R.x + (R.w - (2 * bw + gap)) / 2;
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(x0 - 12, by0 - 4); ctx.lineTo(x0 - 12, by0 + bh); ctx.lineTo(x0 + 2 * bw + gap + 12, by0 + bh); ctx.stroke();
    cols.forEach((c, i) => { const x = x0 + i * (bw + gap), h = bh * c[1]; D.roundRect(x, by0 + bh - h, bw, h, 5); ctx.fillStyle = c[2]; ctx.fill(); T(x + bw / 2, by0 + bh + 18, c[0], 13, INK, 'center', 800); });
    T(x0 - 12, by0 - 10, '배열의 수', 12, MUTED, 'left', 800);
    const d = s1 - s0, sg = Math.abs(d) < 0.015 ? '같아요' : d > 0 ? '늘었어요 ▲' : '줄었어요 ▼';
    D.label(R.x + R.w / 2, by0 + bh + 46, '배열의 수  ' + sg, { size: 13.5, bg: Math.abs(d) < 0.015 ? '#8a95a8' : d > 0 ? PUR : COLD, align: 'center' });
    textBlock(R.x + 14, by0 + bh + 74, R.w - 28, CD[k].why, 12.5, INK, 17, 700);
  }

  /* ================= ④ 예측: ΔS 부호 분류 ================= */
  const PC = [
    { t: 'H₂O(s) → H₂O(l)', plus: true, why: '고체 → 액체: 입자가 움직일 수 있는 배열이 늘어요.' },
    { t: 'H₂O(l) → H₂O(g)', plus: true, why: '액체 → 기체: 입자가 퍼져 배열의 수가 크게 늘어요.' },
    { t: '설탕이 물에 녹음', plus: true, why: '설탕 분자가 물 전체로 퍼져요.' },
    { t: '기체가 진공 쪽으로 팽창', plus: true, why: '부피가 커져 입자가 놓일 자리가 늘어요.' },
    { t: '두 기체가 섞임', plus: true, why: '입자가 섞이면 놓일 수 있는 배열이 늘어요.' },
    { t: 'CaCO₃(s) → CaO(s) + CO₂(g)', plus: true, why: '고체에서 기체가 생겨 기체 몰수가 0 → 1 로 늘어요.' },
    { t: '2H₂O₂(l) → 2H₂O(l) + O₂(g)', plus: true, why: '기체 O₂ 가 생겨 기체 몰수가 늘어요.' },
    { t: 'H₂O(g) → H₂O(l)', plus: false, why: '기체 → 액체: 배열의 수가 줄어요.' },
    { t: '물이 얼어 얼음이 됨', plus: false, why: '액체 → 고체: 입자가 격자 자리에 고정돼요.' },
    { t: 'N₂(g) + 3H₂(g) → 2NH₃(g)', plus: false, why: '기체 몰수가 4 → 2 로 줄어요.' },
    { t: '2H₂(g) + O₂(g) → 2H₂O(l)', plus: false, why: '기체 3몰이 액체가 되어 배열의 수가 크게 줄어요.' },
    { t: '소금물에서 소금 결정이 석출', plus: false, why: '퍼져 있던 이온이 결정 격자에 모여요.' },
  ];
  const NP = PC.length;
  const trayRect = (i) => { const L = RC.L, w = (L.w - 24 - 16) / 3, h = PHONE ? 44 : 40; return { x: L.x + 12 + (i % 3) * (w + 8), y: L.y + 58 + Math.floor(i / 3) * (h + 8), w, h }; };
  const binRect = (b) => { const L = RC.L, w = (L.w - 24 - 10) / 2, y = L.y + 58 + 4 * ((PHONE ? 44 : 40) + 8) + 8; return { x: L.x + 12 + b * (w + 10), y, w, h: L.y + L.h - 12 - y }; };
  function prInit() {
    const order = [4, 9, 1, 11, 6, 0, 8, 3, 10, 2, 7, 5];                   // 섞어 놓아요
    S.pr.cards = order.map((src, i) => { const r = trayRect(i); return { id: src, x: r.x, y: r.y, w: r.w, h: r.h, bin: -1, ord: 0, slot: i }; });
    S.pr.sel = -1; S.pr.drag = null; S.pr.cnt = 0;
  }
  function prAssign(i, bin) {
    const P = S.pr, c = P.cards[i]; if (c.bin === bin) return;
    c.bin = bin; c.ord = ++P.cnt; Sound.tick(); updateCtl();
  }
  const prPlaced = () => S.pr.cards.filter((c) => c.bin >= 0).length;
  const prWrong = () => S.pr.cards.filter((c) => c.bin >= 0 && (c.bin === 0) !== PC[c.id].plus);
  function binTargets(bin) {                                            // 상자 안의 카드 자리 (놓은 순서대로)
    const b = binRect(bin), list = S.pr.cards.map((c, i) => ({ c, i })).filter((o) => o.c.bin === bin).sort((a, z) => a.c.ord - z.c.ord);
    const pitch = Math.min(26, (b.h - 36) / Math.max(7, list.length)), out = {};
    list.forEach((o, k) => { out[o.i] = { x: b.x + 6, y: b.y + 30 + k * pitch, w: b.w - 12, h: pitch - 3 }; });
    return out;
  }
  function stepPr(dt) {
    const P = S.pr, tg = [binTargets(0), binTargets(1)], rank = {};
    P.cards.map((c, i) => ({ c, i })).filter((o) => o.c.bin < 0).sort((a, z) => a.c.slot - z.c.slot).forEach((o, k) => { rank[o.i] = k; });
    P.cards.forEach((c, i) => {
      if (P.drag && P.drag.i === i) return;
      const t = c.bin < 0 ? trayRect(rank[i]) : tg[c.bin][i];
      c.x = ap2(c.x, t.x, dt, 12); c.y = ap2(c.y, t.y, dt, 12); c.w = ap2(c.w, t.w, dt, 12); c.h = ap2(c.h, t.h, dt, 12);
    });
  }
  function drawPred(t) {
    const L = RC.L, P = S.pr;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🎯 이 변화에서 계의 엔트로피는?', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '카드를 끌어 아래 상자에 놓아요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    [0, 1].forEach((b) => {
      const r = binRect(b), col = b === 0 ? PUR : COLD;
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = b === 0 ? 'rgba(124,58,237,.07)' : 'rgba(47,127,216,.07)'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
      T(r.x + r.w / 2, r.y + 22, b === 0 ? '▲ 증가 (ΔS > 0)' : '▼ 감소 (ΔS < 0)', 13.5, col, 'center', 800);
    });
    const drawCard = (c, i, lift) => {
      const cd = PC[c.id], small = c.bin >= 0 && !lift, sel = P.sel === i;
      ctx.save(); if (lift) { ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; }
      D.roundRect(c.x, c.y, c.w, c.h, small ? 7 : 10); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
      D.roundRect(c.x, c.y, c.w, c.h, small ? 7 : 10); ctx.strokeStyle = sel ? PUR : '#cfd6e6'; ctx.lineWidth = sel ? 2.8 : 1.4; ctx.stroke();
      if (small) T(c.x + 8, c.y + c.h / 2 + 4, cd.t, Math.min(11.5, Math.max(9.5, c.h - 4)), INK, 'left', 800);
      else { const ls = wrap(cd.t, c.w - 12, 12, 800); ls.slice(0, 2).forEach((l, k) => T(c.x + c.w / 2, c.y + c.h / 2 + (ls.length > 1 ? (k - 0.5) * 15 + 4 : 4), l, 12, INK, 'center', 800)); }
    };
    P.cards.forEach((c, i) => { if (!(P.drag && P.drag.i === i)) drawCard(c, i, false); });
    if (P.drag) drawCard(P.cards[P.drag.i], P.drag.i, true);
    T(L.x + L.w - 14, L.y + 26, '놓은 카드 ' + prPlaced() + ' / ' + NP, 13, prPlaced() === NP ? GOOD : MUTED, 'right', 800);
  }
  function drawPredInfo(t) {
    const R = RC.R, P = S.pr;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '🧭 ΔS 판단 기준', 14.5, INK, 'left', 800);
    const rules = ['상태: 고체 < 액체 < 기체 순으로 배열의 수가 커요.', '반응: 기체의 몰수가 늘면 ΔS > 0, 줄면 ΔS < 0 이에요.', '퍼지고 섞이는 변화는 ΔS > 0, 한곳에 모이는 변화는 ΔS < 0 이에요.', '입자 수가 늘어나는 반응은 ΔS > 0 이에요.'];
    let y = R.y + 50;
    rules.forEach((s) => { D.sphere(R.x + 18, y - 4, 4, PUR, { gloss: false }); y += textBlock(R.x + 30, y, R.w - 44, s, 12.5, INK, 17, 700) + 6; });
    const by = Math.max(y + 8, R.y + R.h - 138);
    D.roundRect(R.x + 10, by, R.w - 20, R.y + R.h - by - 10, 12); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    if (P.sel >= 0) { const cd = PC[P.cards[P.sel].id]; T(R.x + 20, by + 22, '고른 카드', 12, MUTED, 'left', 800); const h = textBlock(R.x + 20, by + 42, R.w - 40, cd.t, 13.5, INK, 18, 800); textBlock(R.x + 20, by + 46 + h, R.w - 40, '배열의 수가 어떻게 변할까요?', 12.5, MUTED, 16, 700); }
    else textBlock(R.x + 20, by + 28, R.w - 40, prPlaced() === NP ? '모두 놓았어요. 「확인하기」를 눌러요.' : '카드를 누르거나 끌어 보세요.', 13, MUTED, 18, 700);
    if (prPlaced() === NP && prWrong().length === 0) textBlock(R.x + 20, by + 70, R.w - 40, '엔트로피가 감소하는데도 저절로 일어나는 변화(물이 얼음이 됨)가 있어요. 왜일까요? 다음 차시에서 주위까지 함께 살펴봐요.', 12, PUR, 16, 800);
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'obs', sub: 'trial', fade: 0, lock: false, t: 0,
    ob: { sel: 0, p: 0, dir: 0, played: [false, false, false, false], rev: [false, false, false, false], judged: [0, 0, 0, 0], msg: '' },
    md: { N: 4, k: 0, pts: [], hist: [new Array(5).fill(0), new Array(11).fill(0), new Array(21).fill(0)], hd: null, trials: [0, 0, 0], one: [0, 0, 0], hmax: [4, 4, 4], last: -1, divider: 1, pend: 0, tab: ['', '', '', '', ''] },
    cd: { sel: 0, p: new Array(CDN).fill(0), pd: new Array(CDN).fill(0), seen: new Array(CDN).fill(false) },
    pr: { cards: [], sel: -1, drag: null, cnt: 0 },
  };
  let game = null;

  /* ================= 조작판 ================= */
  const setSub = (s) => { S.sub = s; updateCtl(); };
  function buildCtl() {
    SC.forEach((s, i) => $('#obChips').appendChild(chipBtn(s.icon + ' ' + s.name, s.name, () => setOb(i))));
    NS_OPT.forEach((n, i) => $('#nChips').appendChild(chipBtn('N = ' + n, '입자 ' + n + '개', () => { mdSet(n); updateCtl(); })));
    CD.forEach((c, i) => $('#cdChips').appendChild(chipBtn(c.name, c.name, () => cdPick(i))));
    ['0', '1', '2', '3', '4'].forEach((k) => {
      const lab = document.createElement('label'); lab.append('왼쪽 ' + k + '개');
      const inp = document.createElement('input'); inp.className = 'num-in'; inp.type = 'text'; inp.inputMode = 'numeric'; inp.autocomplete = 'off'; inp.id = 'w' + k; inp.setAttribute('aria-label', '왼쪽 ' + k + '개일 때 배열의 수');
      inp.addEventListener('input', () => { MD().tab[+k] = inp.value; inp.classList.remove('bad'); updateCtl(); });
      inp.addEventListener('change', () => { if (inp.value === '') return; if (Math.abs(parseNum(inp.value) - W4[+k]) > 1e-9) { shakeBad(inp); showHint('왼쪽 칸에 입자가 ' + k + '개 있는 배열을 표에서 세어 봐요. 같은 줄의 칸 수를 세면 돼요.'); } });
      lab.appendChild(inp); $('#in5').appendChild(lab);
    });
  }
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => {
      let show = n.getAttribute('data-show') === S.mode; const sub = n.getAttribute('data-sub');
      if (show && sub && S.lock && S.sub !== sub) show = false;
      if (show && sub === 'count' && !S.lock && S.md.N !== 4) show = false;
      n.hidden = !show;
    });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const O = OB(), i = O.sel, both = O.played[i] && O.rev[i];
    $$('#obChips button').forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('done', O.judged[k] === 1); });
    $('#bOb').textContent = O.dir === 1 ? '⏳ 재생 중…' : O.played[i] ? '↻ 다시 재생' : '▶ 재생'; $('#bOb').disabled = O.dir !== 0;
    $('#bObRev').disabled = O.dir !== 0 || !O.played[i];
    $('#bObYes').disabled = !both; $('#bObNo').disabled = !both;
    $('#bObYes').classList.toggle('no', O.judged[i] === -1); $('#bObNo').classList.toggle('ok', O.judged[i] === 1);
    $('#obNote').textContent = !O.played[i] ? '① ▶ 재생으로 장면을 끝까지 봐요.' : !O.rev[i] ? '② ⏪ 거꾸로 재생으로 반대 방향의 영상을 봐요.' : O.judged[i] === 1 ? '✅ ' + O.msg : O.msg || '③ 거꾸로 된 일이 실제로 일어날지 골라요.';
    const M = MD();
    $$('#nChips button').forEach((b, k) => b.classList.toggle('on', NS_OPT[k] === M.N));
    $('#trNote').textContent = 'N = ' + M.N + ': 시행 ' + M.trials[M.k] + '번' + (M.last >= 0 ? ' · 방금 왼쪽 칸 ' + M.last + '개' : '');
    const ok = mdOkTable();
    ['0', '1', '2', '3', '4'].forEach((k) => { const inp = $('#w' + k); if (document.activeElement !== inp && inp.value !== M.tab[+k]) inp.value = M.tab[+k]; });
    void ok;
    const C0 = CDS(), ck = C0.sel;
    $$('#cdChips button').forEach((b, k) => { b.classList.toggle('on', k === ck); b.classList.toggle('done', C0.seen[k]); });
    $('#cdSlideLab').textContent = CD[ck].lab; $('#cdSlide').value = Math.round(C0.p[ck] * 100);
    $('#cdNote').textContent = '살펴본 조건 ' + C0.seen.filter((v) => v).length + ' / ' + CDN + ' (슬라이더를 끝까지 움직이면 살펴본 거예요)';
    const P = S.pr;
    $('#bPlus').disabled = P.sel < 0; $('#bMinus').disabled = P.sel < 0;
    $('#bPlus').classList.toggle('on', P.sel >= 0 && P.cards[P.sel].bin === 0); $('#bMinus').classList.toggle('on', P.sel >= 0 && P.cards[P.sel].bin === 1);
    $('#prSel').textContent = P.sel >= 0 ? '고른 카드: ' + PC[P.cards[P.sel].id].t : '카드를 끌어서 놓거나, 카드를 누른 뒤 아래 버튼을 눌러요.';
    $('#prNote').textContent = '놓은 카드 ' + prPlaced() + ' / ' + NP;
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#bOb').addEventListener('click', obPlay);
  $('#bObRev').addEventListener('click', obRev);
  $('#bObYes').addEventListener('click', () => obJudge(true));
  $('#bObNo').addEventListener('click', () => obJudge(false));
  $('#bTr1').addEventListener('click', () => { Sound.tick(); mdTrial(true); updateCtl(); });
  $('#bTr100').addEventListener('click', () => mdMany(100));
  $('#cdSlide').addEventListener('input', (e) => cdSet(+e.target.value));
  $('#cdMinus').addEventListener('click', () => { Sound.tick(); cdSet(CDS().p[CDS().sel] * 100 - 10); });
  $('#cdPlus').addEventListener('click', () => { Sound.tick(); cdSet(CDS().p[CDS().sel] * 100 + 10); });
  $('#bPlus').addEventListener('click', () => { if (S.pr.sel >= 0) prAssign(S.pr.sel, 0); });
  $('#bMinus').addEventListener('click', () => { if (S.pr.sel >= 0) prAssign(S.pr.sel, 1); });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'obs') { const O = OB(); O.p = 0; O.dir = 0; O.played = [false, false, false, false]; O.rev = [false, false, false, false]; O.judged = [0, 0, 0, 0]; O.msg = ''; }
    else if (S.mode === 'model') resetMd();
    else if (S.mode === 'cond') resetCd();
    else prInit();
    updateCtl();
  });
  /* 카드 끌기 (부호 예측) */
  const cardAt = (p) => { const P = S.pr; for (let i = P.cards.length - 1; i >= 0; i--) if (inRect(p, P.cards[i])) return i; return -1; };
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'pred') return false; const i = cardAt(p); if (i < 0) return false;
      const P = S.pr, c = P.cards[i]; P.sel = i; P.drag = { i, sx: p.x, sy: p.y, moved: false }; Sound.tick(); updateCtl(); void c; return true;
    },
    move(p) {
      const P = S.pr, d = P.drag; if (!d) return; const c = P.cards[d.i], tr = trayRect(0);
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 6) d.moved = true;
      if (d.moved) { c.w = tr.w; c.h = tr.h; c.x = p.x - c.w / 2; c.y = p.y - c.h / 2; }
    },
    up(p) {
      const P = S.pr, d = P.drag; if (!d) return; P.drag = null; const c = P.cards[d.i];
      if (!d.moved) return;
      if (inRect(p, binRect(0))) prAssign(d.i, 0); else if (inRect(p, binRect(1))) prAssign(d.i, 1);
      else if (c.bin >= 0) { c.bin = -1; Sound.tick(); updateCtl(); }
    },
    hover(p) { return S.mode === 'pred' && cardAt(p) >= 0 ? 'grab' : null; },
  });
  $('#cv').style.touchAction = 'pan-y';
  $('#cv').addEventListener('touchstart', (e) => { if (S.mode !== 'pred' || !e.touches.length) return; const p = view.toLocal(e.touches[0]); if (cardAt(p) >= 0) e.preventDefault(); }, { passive: false });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'obs') { const O = OB(); L1 = '장면'; a = SC[O.sel].name; L2 = '재생 방향'; b = O.dir === 1 ? '앞으로' : O.dir === -1 ? '거꾸로' : '멈춤'; L3 = '판정한 장면'; c = O.judged.filter((v) => v === 1).length + ' / 4'; }
    else if (S.mode === 'model') { const M = MD(), k = M.k; L1 = '입자 수 N'; a = String(M.N); L2 = '시행 횟수'; b = M.trials[k] + '번'; L3 = '모두 한쪽에 모인 횟수'; c = M.one[k] + '번'; }
    else if (S.mode === 'cond') { const C0 = CDS(), k = C0.sel, d = sLevel(k, C0.pd[k]) - sLevel(k, 0); L1 = '조건'; a = CD[k].name; L2 = '배열의 수'; b = Math.abs(d) < 0.015 ? '처음과 같아요' : d > 0 ? '늘었어요 ▲' : '줄었어요 ▼'; L3 = '살펴본 조건'; c = C0.seen.filter((v) => v).length + ' / ' + CDN; }
    else { L1 = '놓은 카드'; a = prPlaced() + ' / ' + NP; L2 = '증가 상자'; b = S.pr.cards.filter((x) => x.bin === 0).length + '장'; L3 = '감소 상자'; c = S.pr.cards.filter((x) => x.bin === 1).length + '장'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  const resetOb = () => { const O = OB(); O.p = 0; O.dir = 0; O.played = [false, false, false, false]; O.rev = [false, false, false, false]; O.judged = [0, 0, 0, 0]; O.msg = ''; O.sel = 0; };
  const resetMd = () => { const M = MD(); M.hist = [new Array(5).fill(0), new Array(11).fill(0), new Array(21).fill(0)]; M.hd = null; M.trials = [0, 0, 0]; M.one = [0, 0, 0]; M.hmax = [4, 4, 4]; M.tab = ['', '', '', '', '']; mdSet(M.N); ['0', '1', '2', '3', '4'].forEach((k) => { $('#w' + k).value = ''; }); };
  const resetCd = () => { const C0 = CDS(); C0.p.fill(0); C0.pd.fill(0); C0.seen.fill(false); C0.sel = 0; };

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '저절로 일어나는 변화와 그 반대', short: '저절로 일어남', icon: '👀', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 뜨거운 커피는 저절로 식고 잉크는 저절로 퍼지는데, 반대 방향은 왜 저절로 일어나지 않을까?</p>' +
        '<div class="si-link">🔗 <b>앞 단원과 통합과학에서</b> 입자의 운동과 확산, 상태 변화, 용해를 배웠고, 앞 차시들에서 반응의 열 출입(ΔH)을 다뤘어요. 열의 출입만으로 변화가 일어나는 방향을 설명할 수 있을까요?</div>' +
        '<p>잉크가 물에 퍼지는 것, 기체가 양쪽 칸으로 퍼지는 것, 방이 어질러지는 것, 뜨거운 물과 찬물이 섞이는 것을 보고 <b>거꾸로 재생</b>해 봐요. 이 장면들의 반대 방향은 <b>에너지 보존에 어긋나지 않아요.</b> 그런데도 일어나지 않아요.</p>',
      features: ['obs'],
      setup() { S.lock = false; setMode('obs'); },
      recap: '에너지 보존에는 어긋나지 않는데도 저절로 일어나지 않는 방향이 있어요. 에너지만으로는 변화의 방향을 설명할 수 없어요.',
      summary: '<ul><li>잉크의 확산, 기체의 퍼짐, 방이 어질러짐, 뜨거운 물과 찬물의 섞임은 <b>저절로</b> 일어나는 변화예요.</li><li>이 변화들의 거꾸로 된 과정은 <b>에너지 보존에 어긋나지 않아요.</b> (예: 기체가 한쪽 칸에 모일 때 에너지 변화는 없어요.) 그런데도 관찰된 적이 없어요.</li><li>그래서 에너지(열의 출입)만으로는 변화가 일어나는 방향을 설명할 수 없고, 입자의 <b>배열</b>에 관한 새로운 개념이 필요해요. 이것이 <b>엔트로피</b>예요.</li></ul>',
      missions: [
        {
          title: '네 장면의 거꾸로 영상 판정하기',
          goal: '네 장면을 모두 <b>재생 → 거꾸로 재생</b>한 뒤, 거꾸로 된 일이 실제로 일어나는지 판정해요.',
          hint: '장면을 고르고 ▶ 재생, 끝나면 ⏪ 거꾸로 재생을 눌러요. 그 뒤 조작판 아래쪽의 판정 버튼이 열려요.',
          setup() { S.lock = true; resetOb(); setMode('obs'); },
          check: () => OB().judged.every((v) => v === 1), hold: 0.4,
          status: () => SC.map((s, i) => (i + 1) + ' ' + mark(OB().judged[i] === 1)).join(' &nbsp; '),
          explain: '네 장면 모두 거꾸로 된 일은 에너지 보존에 어긋나지 않지만 저절로는 일어나지 않아요. 입자들이 한곳에 모이거나, 흩어진 물건이 제자리로 가거나, 섞인 물이 뜨거운 쪽과 찬 쪽으로 나뉘는 일은 관찰되지 않아요.',
        },
        {
          type: 'quiz', title: '칸막이를 열었더니 한쪽으로?',
          goal: '칸막이를 열어 양쪽으로 퍼진 기체가 저절로 한쪽 칸에만 모일 수 있을까요?',
          setup() { S.lock = true; setMode('obs'); },
          choices: ['에너지 보존에 어긋나서 절대 불가능해요', '이론상 가능하지만 입자가 많으면 확률이 극히 작아 관찰할 수 없어요', '칸막이를 다시 닫아야만 가능해요', '온도가 내려가면 저절로 모여요'],
          answer: 1,
          feedback: ['기체가 한쪽에 모일 때 에너지는 변하지 않아요. 에너지 보존 때문에 불가능한 것은 아니에요.', '', '칸막이는 처음에 입자를 가둬 둘 뿐이에요. 입자가 스스로 한쪽으로 모이지는 않아요.', '온도와는 관계가 없어요. 입자가 놓이는 배열의 문제예요.'],
          explain: '입자는 어느 칸에든 놓일 수 있어요. 입자가 한쪽에만 있는 배열은 전체 배열 중 극히 일부라서, 입자가 많으면 그런 일이 일어날 확률이 사실상 0 이에요. 다음 단계에서 직접 세어 봐요.',
        },
      ],
    },
    {
      title: '배열의 수와 엔트로피', short: '배열의 수', icon: '🎲', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 퍼진 기체가 저절로 한쪽으로 모이지 않는 것을 보았어요. 이번에는 입자가 놓일 수 있는 <b>배열의 수</b>를 세어 그 까닭을 알아봐요.</div>' +
        '<p>두 칸 용기에 입자를 넣고 왼쪽 칸에 몇 개가 있는지 세요. 입자 4개일 때의 배열을 직접 세어 보고, 입자를 10개, 20개로 늘려 무작위로 섞는 시행을 반복해 봐요. <b>배열의 수가 많은 상태가 더 자주 나타나요.</b> 이 “배열이 많은 정도”가 <b>엔트로피</b>의 의미예요(정성적).</p>',
      features: ['model'],
      setup() { S.lock = false; mdSet(4); setMode('model'); },
      recap: '입자가 놓일 수 있는 배열의 수가 많은 상태일수록 엔트로피가 커요. 입자가 많아질수록 한쪽에 몰린 상태는 거의 나타나지 않아요.',
      summary: '<ul><li>입자 4개를 왼쪽·오른쪽 칸에 놓는 방법은 전체 16가지예요. 왼쪽 입자 수가 0, 1, 2, 3, 4개인 배열의 수는 <b>1, 4, 6, 4, 1</b>.</li><li>입자가 많아질수록 가운데(고르게 퍼진 상태)의 배열 수가 압도적으로 많아져요. 입자 10개에서 모두 한쪽 칸에 모일 배열은 전체 1024가지 중 1가지(약 0.1 %), 입자 100개에서는 약 10⁻³⁰ 으로 사실상 0 이에요.</li><li><b>엔트로피(S)</b>는 입자가 놓일 수 있는 배열의 수가 많은 정도를 나타내요. 배열이 많을수록 엔트로피가 커요(정성적으로만 다뤄요).</li><li>엔트로피는 에너지의 다른 이름이 아니에요.</li></ul>',
      missions: [
        {
          title: '입자 4개의 배열 수 세기',
          goal: '표를 보고 왼쪽 칸에 입자가 0, 1, 2, 3, 4개 있는 배열의 수를 세어 적어요.',
          hint: '입자 A, B, C, D 가 각각 왼쪽·오른쪽 중 한 곳에 놓여요. 왼쪽 칸 입자가 1개인 배열은 A, B, C, D 중 누가 왼쪽에 있느냐로 4가지예요.',
          manual: true,
          setup() { S.lock = true; resetMd(); mdSet(4); setMode('model'); setSub('count'); },
          check: () => {
            const ok = mdOkTable(), T4 = MD().tab; if (T4.every((v) => v === '')) return '표의 줄마다 배열의 수를 세어 칸에 적어요.';
            const bad = ok.findIndex((v) => !v); if (bad >= 0) return '왼쪽 칸에 입자가 ' + bad + '개인 배열의 수를 다시 세어 봐요. 같은 줄의 칸 수예요.';
            return true;
          },
          explain: '배열의 수는 <b>1, 4, 6, 4, 1</b> (합 16). 왼쪽에 2개인 배열이 6가지로 가장 많고, 모두 한쪽에 있는 배열은 각각 1가지뿐이에요.',
        },
        {
          title: '입자가 많아지면 한쪽에 모일까?',
          goal: '입자 4개를 <b>50번 이상</b>, 입자 10개를 <b>200번 이상</b> 섞어 보고 <b>모두 한쪽에 모인 횟수</b>를 비교해요.',
          hint: '입자 수 N 을 고르고 「100번 섞기」를 눌러요. 입자 4개에서는 한쪽에 모이는 일이 가끔 보이지만, 10개에서는 거의 보이지 않아요.',
          setup() { S.lock = true; resetMd(); mdSet(4); setMode('model'); setSub('trial'); },
          check: () => MD().trials[0] >= 50 && MD().trials[1] >= 200, hold: 0.4,
          status: () => 'N=4 시행 ' + Math.min(MD().trials[0], 50) + '/50 (한쪽 ' + MD().one[0] + '번) &nbsp; N=10 시행 ' + Math.min(MD().trials[1], 200) + '/200 (한쪽 ' + MD().one[1] + '번)',
          explain: '입자 4개는 16가지 중 2가지(모두 왼쪽 또는 모두 오른쪽)가 한쪽에 모이는 경우라서 약 12 % 예요. 입자 10개는 1024가지 중 2가지라 약 0.2 % 라서 200번을 섞어도 한 번 있을까 말까예요. 입자가 많을수록 한쪽에 모인 상태는 거의 나타나지 않아요.',
        },
        {
          type: 'quiz', title: '엔트로피가 큰 상태란?',
          goal: '엔트로피에 대한 설명으로 알맞은 것은?',
          setup() { S.lock = true; setMode('model'); setSub('trial'); },
          choices: ['엔트로피는 에너지의 다른 이름이에요', '입자가 놓일 수 있는 배열의 수가 많은 상태일수록 엔트로피가 커요', '입자가 한쪽에 모여 있을수록 엔트로피가 커요', '엔트로피가 큰 상태는 에너지가 큰 상태예요'],
          answer: 1,
          feedback: ['엔트로피는 에너지가 아니라 배열의 수와 관련된 양이에요.', '', '한쪽에 모인 상태는 배열의 수가 가장 적어서 엔트로피가 작아요.', '에너지의 크기와는 별개의 개념이에요.'],
          explain: '엔트로피는 <b>입자가 놓일 수 있는 배열의 수가 많은 정도</b>예요. 고르게 퍼진 상태는 배열의 수가 가장 많아 엔트로피가 커요. 에너지와는 다른 개념이에요.',
        },
      ],
    },
    {
      title: '엔트로피가 커지는 조건', short: '증가 조건', icon: '🔬', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 배열의 수가 많을수록 엔트로피가 크다는 것을 알았어요. 그렇다면 어떤 변화에서 입자가 놓일 수 있는 배열의 수가 늘어날까요?</div>' +
        '<p>다섯 가지 조건에서 입자의 배열이 어떻게 달라지는지 살펴봐요. 상태 변화, 온도, 부피, 용해, 분자 수. 조작판의 슬라이더를 움직이면 입자 모형과 <b>배열의 수 막대</b>가 함께 변해요. 막대는 크기를 정성적으로 나타낸 거예요.</p>',
      features: ['cond'],
      setup() { S.lock = false; setMode('cond'); },
      recap: '상태가 고체 → 액체 → 기체로 바뀔 때, 온도가 오를 때, 부피가 늘 때, 용해될 때, 분자 수가 늘 때 배열의 수가 늘어나 엔트로피가 커져요.',
      summary: '<ul><li><b>상태 변화</b>: 고체 → 액체 → 기체로 갈수록 엔트로피가 커요 (S(고체) &lt; S(액체) &lt; S(기체)).</li><li><b>온도</b>가 높을수록 입자의 운동이 다양해져 엔트로피가 커져요.</li><li><b>부피</b>가 커지거나 기체가 <b>섞이면</b> 입자가 놓일 자리가 늘어 엔트로피가 커져요.</li><li><b>용해</b>로 결정을 이루던 입자가 용액에 퍼지면 엔트로피가 커져요.</li><li>반응에서 <b>입자 수(특히 기체의 몰수)</b>가 늘면 엔트로피가 커져요 (예: 2H₂O₂ → 2H₂O + O₂).</li></ul>',
      missions: [
        {
          title: '배열의 수가 늘어나는 조건 찾기',
          goal: '조건 5가지 중 <b>4가지 이상</b>에서 슬라이더를 끝까지 움직여, 배열의 수 막대가 늘어나는 것을 확인해요.',
          hint: '조건을 고르고 슬라이더를 오른쪽 끝까지 움직여요. 막대에 처음과 지금 값이 함께 나타나요.',
          setup() { S.lock = true; resetCd(); setMode('cond'); },
          check: () => CDS().seen.filter((v) => v).length >= 4, hold: 0.4,
          status: () => CD.map((c, i) => c.name + ' ' + mark(CDS().seen[i])).join(' &nbsp; '),
          explain: '상태 변화, 온도, 부피, 용해, 분자 수 증가 모두 입자가 놓일 수 있는 배열의 수가 늘어나는 변화예요. 따라서 엔트로피가 증가해요.',
        },
        {
          type: 'quiz', title: '엔트로피가 가장 큰 상태',
          goal: '같은 양(1 mol)의 물질 중 엔트로피가 가장 큰 상태는?',
          setup() { S.lock = true; setMode('cond'); },
          choices: ['고체', '액체', '기체', '모두 같아요'],
          answer: 2,
          feedback: ['고체는 입자가 격자에 고정되어 배열의 수가 가장 적어요.', '액체는 고체보다는 크지만 기체보다는 작아요.', '', '상태가 달라지면 입자가 놓일 수 있는 배열의 수가 달라져요.'],
          explain: '기체의 입자는 용기 전체를 자유롭게 돌아다녀 놓일 수 있는 배열의 수가 가장 많아요. 엔트로피는 <b>기체 &gt; 액체 &gt; 고체</b> 순이에요.',
        },
      ],
    },
    {
      title: 'ΔS 부호 예측하기', short: '부호 예측', icon: '🎯', phase: '예측',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 엔트로피가 커지는 조건을 찾았어요. 이제 이 조건을 근거로 여러 변화에서 <b>계의 엔트로피 변화 ΔS</b>의 부호를 예측해요.</div>' +
        '<p>변화 후 배열의 수가 늘면 <b>ΔS &gt; 0</b>(증가), 줄면 <b>ΔS &lt; 0</b>(감소)이에요. 상태 변화, 기체의 몰수, 용해와 석출을 근거로 12장의 카드를 알맞은 상자에 놓아요. 값을 계산하지는 않고 부호만 정성적으로 따져요.</p>',
      features: ['pred'],
      setup() { S.lock = false; setMode('pred'); },
      recap: '상태 변화, 기체의 몰수, 용해·석출을 보면 ΔS 의 부호를 예측할 수 있어요. 엔트로피가 감소하는데도 저절로 일어나는 변화는 다음 차시에서 살펴봐요.',
      summary: '<ul><li><b>ΔS &gt; 0</b>: 고체 → 액체, 액체 → 기체, 용해, 기체의 팽창과 혼합, 기체 몰수가 늘어나는 반응(CaCO₃ → CaO + CO₂, 2H₂O₂ → 2H₂O + O₂).</li><li><b>ΔS &lt; 0</b>: 기체 → 액체, 액체 → 고체(물이 얼음이 됨), 결정 석출, 기체 몰수가 줄어드는 반응(N₂ + 3H₂ → 2NH₃: 4몰 → 2몰, 2H₂ + O₂ → 2H₂O(l)).</li><li>ΔS 는 <b>계</b>의 엔트로피 변화예요. 물이 얼 때처럼 ΔS &lt; 0 인데도 저절로 일어나는 변화가 있어요. 그 까닭은 주위까지 함께 따져야 알 수 있어요 (다음 차시).</li></ul>',
      missions: [
        {
          title: '12장의 카드 분류하기',
          goal: '변화·반응 카드 12장을 <b>엔트로피 증가(ΔS &gt; 0)</b>와 <b>감소(ΔS &lt; 0)</b> 상자에 알맞게 놓아요.',
          hint: '고체 → 액체 → 기체 방향이면 증가예요. 반응은 기체의 몰수가 늘면 증가, 줄면 감소예요. 퍼지고 섞이면 증가, 한곳에 모이면 감소예요.',
          manual: true,
          setup() { S.lock = true; prInit(); setMode('pred'); },
          check: () => {
            if (prPlaced() < NP) return '아직 상자에 놓지 않은 카드가 ' + (NP - prPlaced()) + '장 있어요.';
            const w = prWrong(); if (!w.length) return true;
            return '“' + PC[w[0].id].t + '” 카드를 다시 생각해 봐요. ' + PC[w[0].id].why + ' (고쳐야 할 카드 ' + w.length + '장)';
          },
          explain: '증가: 고체 → 액체, 액체 → 기체, 설탕의 용해, 기체의 팽창과 혼합, CaCO₃ 분해(기체 0 → 1몰), H₂O₂ 분해(기체 생성). 감소: 기체 → 액체, 물이 얼음이 됨, N₂ + 3H₂ → 2NH₃(기체 4 → 2몰), 2H₂ + O₂ → 2H₂O(l), 소금 결정 석출.',
        },
        {
          type: 'quiz', title: 'N₂ + 3H₂ → 2NH₃ 의 ΔS',
          goal: 'N₂(g) + 3H₂(g) → 2NH₃(g) 반응에서 계의 엔트로피 변화 ΔS 의 부호와 까닭은?',
          setup() { S.lock = true; setMode('pred'); },
          choices: ['ΔS > 0, 생성물의 종류가 줄어서 배열이 늘어요', 'ΔS < 0, 기체의 몰수가 4몰에서 2몰로 줄어 배열의 수가 줄어요', 'ΔS = 0, 반응물과 생성물이 모두 기체이기 때문이에요', 'ΔS > 0, 발열 반응이기 때문이에요'],
          answer: 1,
          feedback: ['입자의 종류가 아니라 입자(분자)의 수가 중요해요. 분자 수가 4개에서 2개로 줄어요.', '', '모두 기체여도 분자 수가 줄면 놓일 수 있는 배열이 줄어요.', '발열 여부(ΔH)는 ΔS 의 부호를 정하지 않아요.'],
          explain: '기체 분자가 4몰에서 2몰로 줄어 입자가 놓일 수 있는 배열의 수가 줄어요. 그래서 <b>ΔS &lt; 0</b> 이에요.',
        },
        {
          type: 'quiz', title: '물이 얼 때의 ΔS',
          goal: '겨울에 물이 저절로 얼어요. 이 변화에서 계의 ΔS 와 그 의미는?',
          setup() { S.lock = true; setMode('pred'); },
          choices: ['ΔS > 0 이에요. 얼음은 입자가 더 자유로워요', 'ΔS < 0 이에요. 엔트로피가 줄어도 저절로 일어나는 변화가 있어요', 'ΔS = 0 이에요. 상태만 바뀌고 입자는 그대로예요', '엔트로피가 줄면 저절로 일어날 수 없어서 물은 얼지 않아요'],
          answer: 1,
          feedback: ['얼음에서는 입자가 격자 자리에 고정돼요. 배열의 수가 줄어요.', '', '상태가 바뀌면 입자의 배열이 달라져요.', '물은 실제로 얼어요. 계의 엔트로피만으로는 판단할 수 없다는 뜻이에요.'],
          explain: '물이 얼면 입자가 격자에 고정되어 <b>ΔS &lt; 0</b> 인데도 저절로 얼어요. 계의 엔트로피 감소만으로는 방향을 알 수 없고 <b>주위까지 함께</b> 따져야 해요. 이를 다음 차시에서 엔탈피와 함께 설명해요.',
        },
        {
          type: 'quiz', title: '소금이 녹을 때의 ΔS',
          goal: 'NaCl(s) 이 물에 녹을 때 ΔS 의 부호와 까닭은?',
          setup() { S.lock = true; setMode('pred'); },
          choices: ['ΔS < 0, 입자가 물에 갇혀서 움직이지 못해요', 'ΔS > 0, 결정 속의 이온이 물 전체로 퍼져 배열의 수가 늘어요', 'ΔS = 0, 녹아도 이온의 수는 같아요', 'ΔS < 0, 고체가 사라지기 때문이에요'],
          answer: 1,
          feedback: ['결정에서 이온이 고정되어 있었어요. 녹으면 오히려 자유롭게 퍼져요.', '', '이온의 수는 같아도 놓일 수 있는 배열이 늘어나요.', '고체가 사라지는 것이 아니라 이온이 퍼지는 것이 핵심이에요.'],
          explain: 'NaCl 결정의 이온이 물 전체로 퍼지면서 놓일 수 있는 배열의 수가 늘어나요. 그래서 <b>ΔS &gt; 0</b> 이에요.',
        },
      ],
    },
  ];

  buildCtl(); mdSet(4); prInit();
  game = SciSim.game({
    simId: 'hx-entropy', mount: '#game', badge: '배열의 수 탐험가', homeHref: '../../index.html#hx',
    featureLabels: { obs: '👀 저절로 일어나는 변화', model: '🎲 두 칸 용기 모형', cond: '🔬 증가 조건 탐구', pred: '🎯 ΔS 부호 예측' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setMode('obs');
  [1, 3, 2].forEach((k, j) => setTimeout(() => getSnap(k), 600 + j * 350));
  function stepAll1(dt) { S.t += dt; stepOb(dt); stepMd(dt); stepCd(dt); stepPr(dt); }
  let lastFree = false;
  SciSim.loop((dt) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'obs') { drawObsScene(S.t); drawObsInfo(S.t); }
    else if (S.mode === 'model') { drawModel(S.t); drawModelInfo(S.t); }
    else if (S.mode === 'cond') { drawCond(S.t); drawCondInfo(S.t); }
    else { drawPred(S.t); drawPredInfo(S.t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, SC, CD, PC, W4, setMode, setSub, setOb, obPlay, obRev, obJudge, mdSet, mdTrial, mdMany, cdPick, cdSet, prAssign, prInit, trayRect, binRect, prWrong, prPlaced, getSnap, NS,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepAll1(0.02); parts.update(0.02); } },
  };

})();
