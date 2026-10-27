/* =========================================================
   전자기와 양자 Ⅰ. 전자기적 상호작용 - 전기력선과 등전위면 (단원 2차시)
   성취기준 [12전자01-01] 전하 주위의 전기장을 정량적으로 구하고, 전기력선과 등전위면으로부터 전기장의 세기와 방향을 추리할 수 있다.
   ① 분석: 전기력선 읽기 (완성된 그림에서 방향 · 세기 · 전하의 부호와 비)
   ② 분석: 등전위면 (전위 눈금 읽기, 간격과 E, 같은 등전위면 위의 이동 일 = 0)
   ③ 탐구: 균일한 장 (평행판 E = ΔV/d, F = qE, W = qEd = qΔV)
   ④ 적용: 그림 해석 (쌍극자 · 같은 부호 두 전하 · 도체의 뾰족한 끝)
   그림을 직접 그리는 방법, 점전하 전위식의 유도, 가우스 법칙은 다루지 않아요. (V = kq/r는 눈금 값을 읽는 보조 정보)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const mark = (b) => (b ? '✅' : '⬜');
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
  function textBlock(x, y, maxW, str, size, color, lh, weight) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, 'left', weight || 700)); return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function sceneBg() {
    ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#eaf1fb'); g.addColorStop(1, '#f7f9fd');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function lbl(x, y, text, o) {
    o = o || {}; const size = o.size || (PHONE ? 12 : 13), pad = 8;
    ctx.save(); ctx.font = D.font(size, 800); const w = ctx.measureText(text).width + pad * 2; ctx.restore();
    const cx = clamp(x, 4 + w / 2, VW - 4 - w / 2);
    return D.label(cx, y, text, Object.assign({ bg: 'rgba(255,255,255,.95)', size }, o));
  }
  const SUPM = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
  const sup = (n) => String(n).replace(/[0-9-]/g, (c) => SUPM[c]);
  function sci(x, d) {
    if (!x || !isFinite(x)) return '0';
    d = d == null ? 1 : d;
    const sg = x < 0 ? '−' : ''; x = Math.abs(x) * (1 + 1e-12);
    let e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    m = Number(m.toFixed(d)); if (m >= 10) { m /= 10; e++; }
    return sg + m.toFixed(d) + '×10' + sup(e);
  }
  const g3 = (x) => String(parseFloat((x * (1 + 1e-12)).toPrecision(3)));
  const potCol = (f) => { f = clamp(f, 0, 1); return f < 0.5 ? C.mix('#4a7be0', '#f6f2ea', f * 2) : C.mix('#f6f2ea', '#e2574c', (f - 0.5) * 2); };
  const POS = '#e2464b', NEG = '#2f6df6', COL_E = '#2563eb', COL_F = '#f26b3a';

  /* ---------- 공통 배치 ---------- */
  const PS = PHONE ? 0.58 : 1;
  const FR = PHONE ? { x0: 10, y0: 52, x1: VW - 10, y1: 372 } : { x0: 14, y0: 52, x1: VW - 14, y1: 408 };
  const CX = VW / 2, CY = (FR.y0 + FR.y1) / 2;
  const PYB = FR.y1 + 8, PHB = VH - PYB - 8;
  const AR = PHONE ? FR : { x0: 14, y0: 52, x1: 486, y1: VH - 12 };          // 등전위면 · 평행판 화면의 그림 영역
  const RC = (q) => (q > 1 ? 17 : 14) * PS;               // 전하 그림의 반지름
  const LPQ = 10;                                          // 전하량 1단위당 전기력선 개수

  /* ---------- 장 · 전위 계산 (k = 1 인 상대 단위) ---------- */
  function fld(ch, x, y) {
    let ex = 0, ey = 0;
    for (let i = 0; i < ch.length; i++) { const c = ch[i], dx = x - c.x, dy = y - c.y, r2 = Math.max(dx * dx + dy * dy, 4), r = Math.sqrt(r2); ex += c.q * dx / (r2 * r); ey += c.q * dy / (r2 * r); }
    const e = Math.hypot(ex, ey);
    return { ex, ey, e, ux: e > 1e-14 ? ex / e : 0, uy: e > 1e-14 ? ey / e : 0 };
  }
  function pot(ch, x, y) { let v = 0; for (let i = 0; i < ch.length; i++) { const c = ch[i]; v += c.q / Math.max(Math.hypot(x - c.x, y - c.y), 2); } return v; }
  function trace(ch, sx, sy, sgn, rect, stopR) {
    const pts = [sx, sy]; let x = sx, y = sy; const ds = 2.6;
    for (let i = 0; i < 1800; i++) {
      const e = fld(ch, x, y); if (e.e < 1e-14) break;
      const e2 = fld(ch, x + sgn * e.ux * ds / 2, y + sgn * e.uy * ds / 2);
      x += sgn * e2.ux * ds; y += sgn * e2.uy * ds; pts.push(x, y);
      if (x < rect.x0 || x > rect.x1 || y < rect.y0 || y > rect.y1) break;
      let hit = false;
      for (let k = 0; k < ch.length; k++) { const c = ch[k]; if (c.q * sgn < 0 && Math.hypot(x - c.x, y - c.y) < stopR) { hit = true; break; } }
      if (hit) break;
    }
    return pts;
  }
  function finishLine(pts) {
    const cum = [0]; for (let i = 2; i < pts.length; i += 2) cum.push(cum[cum.length - 1] + Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]));
    return { pts, cum, L: cum[cum.length - 1] };
  }
  function pointAt(ln, s) {
    const cum = ln.cum; let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const t = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]), p = ln.pts;
    return { x: p[lo * 2] + (p[hi * 2] - p[lo * 2]) * t, y: p[lo * 2 + 1] + (p[hi * 2 + 1] - p[lo * 2 + 1]) * t, dx: p[hi * 2] - p[lo * 2], dy: p[hi * 2 + 1] - p[lo * 2 + 1] };
  }
  function contourPath(Vf, level, r, cs, labRow) {
    const path = new Path2D(), nx = Math.ceil((r.x1 - r.x0) / cs), ny = Math.ceil((r.y1 - r.y0) / cs), g = [], labs = [];
    for (let j = 0; j <= ny; j++) { const row = new Float32Array(nx + 1); for (let i = 0; i <= nx; i++) row[i] = Math.max(-1e6, Math.min(1e6, Vf(r.x0 + i * cs, r.y0 + j * cs) - level)); g.push(row); }
    const labJ = labRow != null ? Math.round((labRow - r.y0) / cs) : -1;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = g[j][i], b = g[j][i + 1], c = g[j + 1][i + 1], d = g[j + 1][i], x = r.x0 + i * cs, y = r.y0 + j * cs, p = [];
        const cr = (v1, v2, x1, y1, x2, y2) => { if ((v1 > 0) !== (v2 > 0)) { const t = v1 / (v1 - v2); p.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]); } };
        cr(a, b, x, y, x + cs, y); cr(b, c, x + cs, y, x + cs, y + cs); cr(d, c, x, y + cs, x + cs, y + cs); cr(a, d, x, y, x, y + cs);
        if (p.length === 2) { path.moveTo(p[0][0], p[0][1]); path.lineTo(p[1][0], p[1][1]); }
        else if (p.length === 4) { path.moveTo(p[0][0], p[0][1]); path.lineTo(p[3][0], p[3][1]); path.moveTo(p[1][0], p[1][1]); path.lineTo(p[2][0], p[2][1]); }
        if (j === labJ) { const t = (a > 0) !== (b > 0); if (t) labs.push(x + cs * a / (a - b)); }
      }
    }
    return { path, labs };
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'read', t: 0, fade: 0, gate: '',
    l1: { fig: 2, sel: 'A', ang: { 1: {}, 2: {}, 3: {} }, reveal: false, drag: false },
    l2: { X: { x: 0, y: 0 }, Y: { x: 0, y: 0 }, band: 0, drag: null, tc: { mode: '', s: 0, tw: null }, tcSeen: {} },
    l3: { V: 6, d: 6, probe: { x: 0, y: 0 }, seen: {}, drag: false, run: { st: 'rest', t: 0 } },
    l4: { fig: 'a', ans: { a: {}, b: {}, c: {} } },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { read: '🗺️ 전기력선 읽기', equi: '🎯 등전위면', plates: '🔋 균일한 장', fig: '🔍 그림 해석' };

  /* ---------- 숫자 입력 · 선택 상자 ---------- */
  function makeNum(host, q, pre, unit) {
    const row = document.createElement('div'); row.className = 'numrow';
    const exps = []; for (let e = -9; e <= 9; e++) exps.push('<option value="' + e + '"' + (e === 0 ? ' selected' : '') + '>10' + sup(e) + '</option>');
    row.innerHTML = '<div class="q">' + q + '</div><span class="pre">' + pre + '</span>' +
      '<input class="num-in" type="number" step="any" inputmode="decimal" aria-label="' + q.replace(/<[^>]+>/g, '') + ' 계수">' +
      '<span class="pre">×</span><select class="num-in" aria-label="10의 거듭제곱">' + exps.join('') + '</select><span class="unit">' + unit + '</span>';
    host.appendChild(row);
    const inp = row.querySelector('input'), sel = row.querySelector('select');
    const h = {
      row, inp, sel, st: null,
      val() { const s = inp.value.trim().replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'); if (s === '' || isNaN(+s)) return NaN; return +s * Math.pow(10, +sel.value); },
      clear() { inp.value = ''; sel.value = '0'; inp.classList.remove('ok', 'bad'); sel.classList.remove('ok', 'bad'); h.st = null; },
      mark(ok) { if (h.st === ok) return; h.st = ok; [inp, sel].forEach((n) => { n.classList.remove('ok', 'bad'); if (ok === false) { void n.offsetWidth; n.classList.add('bad'); } else if (ok) n.classList.add('ok'); }); },
    };
    [inp, sel].forEach((n) => n.addEventListener('input', () => { h.st = null; inp.classList.remove('ok', 'bad'); sel.classList.remove('ok', 'bad'); }));
    return h;
  }
  function numOK(h, target, tol) { const v = h.val(); if (isNaN(v)) return null; return Math.abs(v - target) <= tol * Math.abs(target); }
  function makeSelects(host, rules, store, okStore) {
    const sels = [];
    rules.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + r[0] + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', r[0].replace(/<[^>]+>/g, ''));
      sel.innerHTML = '<option value="">— 고르기 —</option>' + r[1].map((o, j) => '<option value="' + (j + 1) + '">' + o + '</option>').join('');
      sel.addEventListener('change', () => { store[i] = sel.value; sel.classList.remove('ok', 'bad'); delete okStore[i]; Sound.click(); });
      row.appendChild(sel); host.appendChild(row); sels.push(sel);
    });
    return sels;
  }
  function selMark(sel, i, ok, okStore) {
    if (okStore[i] === ok) return; okStore[i] = ok;
    sel.classList.remove('ok', 'bad'); if (ok) sel.classList.add('ok'); else { void sel.offsetWidth; sel.classList.add('bad'); }
  }
  function resetSels(sels, store, okStore) { Object.keys(store).forEach((k) => delete store[k]); Object.keys(okStore).forEach((k) => delete okStore[k]); sels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }

  /* ================= 그림(전하 배치) 만들기 ================= */
  function buildFig(def) {
    const ch = def.ch, rect = { x0: FR.x0, y0: FR.y0, x1: FR.x1, y1: FR.y1 }, lines = [];
    const stopR = RC(1) + 2;
    if (def.kind === 'spheroid') {
      const N = PHONE ? 16 : 22;
      for (let side = -1; side <= 1; side += 2) {
        for (let k = 0; k < N; k++) {
          const sy = -def.a + (k + 0.5) * 2 * def.a / N, sxs = side * def.b * Math.sqrt(Math.max(0, 1 - (sy / def.a) * (sy / def.a)));
          const nx = sxs / (def.b * def.b), ny = sy / (def.a * def.a), nl = Math.hypot(nx, ny);
          lines.push(finishLine(trace(ch, def.cx + sxs + nx / nl * 2, def.cy + sy + ny / nl * 2, 1, rect, 0)));
        }
      }
    } else {
      const pos = ch.filter((c) => c.q > 0), neg = ch.filter((c) => c.q < 0);
      (pos.length ? pos : neg).forEach((c) => {
        const N = Math.round(Math.abs(c.q) * LPQ), r0 = RC(Math.abs(c.q)) + 2;
        for (let k = 0; k < N; k++) {
          const a = TAU * k / N + (def.rot || 0);
          const pts = trace(ch, c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0, pos.length ? 1 : -1, rect, stopR);
          if (!pos.length) { const rv = []; for (let i = pts.length - 2; i >= 0; i -= 2) rv.push(pts[i], pts[i + 1]); lines.push(finishLine(rv)); } else lines.push(finishLine(pts));
        }
      });
    }
    // 점 A, B, C의 참값
    const pts = {};
    Object.keys(def.pts).forEach((k) => {
      const p = def.pts[k], e = fld(ch, p.ex != null ? p.ex : p.x, p.ey != null ? p.ey : p.y);
      pts[k] = { x: p.x, y: p.y, ang: Math.atan2(e.uy, e.ux), E: e.e, V: pot(ch, p.x, p.y), nul: !!p.nul };
    });
    // 등전위선
    const cont = [];
    if (def.levels) {
      const Vf = (x, y) => def.vs * pot(ch, x, y);
      def.levels.forEach((lv, i) => { const c = contourPath(Vf, lv, rect, 4, def.labRows ? def.labRows[i] : null); cont.push({ lv, path: c.path, labs: c.labs, row: def.labRows ? def.labRows[i] : null }); });
    }
    return Object.assign({}, def, { lines, pts, cont });
  }
  const P = (dx, dy) => ({ x: CX + dx * PS, y: CY + dy * PS });
  function mkCh(list) { return list.map((c) => Object.assign({ q: c[2] }, P(c[0], c[1]))); }
  function mkPts(o) { const r = {}; Object.keys(o).forEach((k) => { r[k] = Object.assign({}, P(o[k][0], o[k][1]), o[k][2] || {}); }); return r; }
  const FIG1 = {
    1: buildFig({ id: 1, name: '점전하', ch: mkCh([[0, 0, 1]]), pts: mkPts({ A: [75, -10], B: [150, -85], C: [-210, 95] }) }),
    2: buildFig({ id: 2, name: '쌍극자', ch: mkCh([[-110, 0, 1], [110, 0, -1]]), pts: mkPts({ A: [0, -100], B: [-215, -60], C: [165, 85] }) }),
    3: buildFig({ id: 3, name: '두 전하', ch: mkCh([[-120, 0, 2], [120, 0, 1]]), pts: mkPts({ A: [-110, -70], B: [130, -70], C: [0, -120] }), rot: 0.08 }),
  };
  const strongest = (f) => Object.keys(f.pts).sort((a, b) => f.pts[b].E - f.pts[a].E);
  // ④ 처음 보는 그림
  const A4 = (function () {
    const mk = (a) => buildFig(a);
    // 가: 쌍극자 (오른쪽이 +)
    const ca = mkCh([[110, 0, 1], [-110, 0, -1]]);
    const fa = mk({ id: 'a', name: '그림 가', ch: ca, levels: [-60, -30, 0, 30, 60], vs: 3000, labRows: [CY + 30 * PS, CY + 62 * PS, CY + 100 * PS, CY - 62 * PS, CY - 30 * PS], pts: mkPts({ A: [-60, -20], B: [0, -110], C: [190, -60] }) });
    // 나: 같은 부호 두 전하
    const cb = mkCh([[-110, 0, 1], [110, 0, 1]]);
    const pb = mkPts({ A: [0, 0, { nul: true }], B: [0, -100], C: [0, 100] });
    const vB = 3000 * pot(cb, pb.B.x, pb.B.y);
    const fb = mk({ id: 'b', name: '그림 나', ch: cb, levels: [vB * 0.7, vB, vB * 1.6, vB * 3], vs: 3000, labRows: [CY + 140 * PS, CY + 96 * PS, CY + 55 * PS, CY + 22 * PS], pts: pb });
    // 다: 도체의 뾰족한 끝 (긴 타원체 → 전기력선은 균일한 선전하의 장으로 계산)
    const a = 125 * PS, b = 40 * PS, c = Math.sqrt(a * a - b * b), M = 41, cx = CX, cy = CY + 10 * PS;
    const cc = []; for (let i = 0; i < M; i++) cc.push({ x: cx, y: cy - c + 2 * c * i / (M - 1), q: 1 / M * 3 });
    const V0 = pot(cc, cx + b + 0.5, cy);
    const ptsC = { A: { x: cx, y: cy - a, ey: cy - a - 9 }, B: { x: cx + b, y: cy, ex: cx + b + 9 }, C: { x: cx + 150 * PS, y: cy } };
    const fc = mk({ id: 'c', name: '그림 다', kind: 'spheroid', a, b, cx, cy, ch: cc, levels: [V0 * 0.8, V0 * 0.62, V0 * 0.48, V0 * 0.36], vs: 1, pts: ptsC });
    fc.V0 = V0;
    return { a: fa, b: fb, c: fc };
  })();
  // 질문과 정답 (그림의 계산값에서 구해요)
  const QS = (function () {
    const abc = ['점 A', '점 B', '점 C'], idx = (k) => 'ABC'.indexOf(k);
    const fa = A4.a, fb = A4.b, fc = A4.c;
    const hiV = Object.keys(fa.pts).sort((x, y) => fa.pts[y].V - fa.pts[x].V)[0];
    return {
      a: [['왼쪽 전하의 부호는?', ['(+)', '(−)'], 1], ['전기장이 가장 센 점은?', abc, idx(strongest(fa)[0])], ['전위가 가장 높은 점은?', abc, idx(hiV)]],
      b: [['두 전하의 부호는?', ['둘 다 (+)', '둘 다 (−)', '(+)와 (−)'], 0], ['전기장이 0인 점은?', abc, 0], ['(+) 시험 전하를 점 B에서 점 C로 옮길 때 전기력이 하는 일은?', ['양(+)의 일', '음(−)의 일', '0'], Math.abs(fb.pts.B.V - fb.pts.C.V) < 1e-6 ? 2 : 0]],
      c: [['전기장이 가장 센 점은?', abc, idx(strongest(fc)[0])], ['도체 표면 위의 점 A와 점 B 사이의 전위차는?', ['0 V', 'A가 더 높아요', 'B가 더 높아요'], 0], ['점 B에서 전기력선은 도체 표면에 대해?', ['수직이에요', '나란해요', '비스듬해요'], 0]],
    };
  })();

  /* ================= 그림 그리기 ================= */
  function drawChargeAt(c, reveal) {
    const r = RC(Math.abs(c.q));
    if (reveal) { D.glow(c.x, c.y, r * 2.6, c.q > 0 ? POS : NEG, 0.3); D.sphere(c.x, c.y, r, c.q > 0 ? POS : NEG, { shadow: true, text: c.q > 0 ? '+' : '−' }); }
    else D.sphere(c.x, c.y, r, '#94a3b8', { shadow: true, text: '?' });
  }
  function drawLines(fig, alpha, color) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    fig.lines.forEach((ln) => {
      ctx.strokeStyle = color || 'rgba(37,99,235,' + (alpha || 0.75) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ln.pts[0], ln.pts[1]); for (let i = 2; i < ln.pts.length; i += 2) ctx.lineTo(ln.pts[i], ln.pts[i + 1]); ctx.stroke();
    });
    ctx.restore();
    // 화살표(방향)와 흐르는 점
    fig.lines.forEach((ln, li) => {
      if (ln.L < 30) return;
      ctx.fillStyle = color ? 'rgba(30,64,175,.9)' : 'rgba(30,64,175,.9)';
      for (let s = 52 + (li % 3) * 14; s < ln.L - 10; s += 150) {
        const p = pointAt(ln, s), m = Math.hypot(p.dx, p.dy) || 1, ux = p.dx / m, uy = p.dy / m;
        ctx.beginPath(); ctx.moveTo(p.x + ux * 6, p.y + uy * 6); ctx.lineTo(p.x - ux * 5 - uy * 4.5, p.y - uy * 5 + ux * 4.5); ctx.lineTo(p.x - ux * 5 + uy * 4.5, p.y - uy * 5 - ux * 4.5); ctx.closePath(); ctx.fill();
      }
      if (!RM) {
        ctx.fillStyle = '#f59e0b';
        for (let s = (S.t * 48 + li * 23) % 90; s < ln.L; s += 90) { const p = pointAt(ln, s); ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, TAU); ctx.fill(); }
      }
    });
  }
  function drawContours(fig, pulse) {
    if (!fig.cont) return;
    const vmin = fig.cont[0].lv, vmax = fig.cont[fig.cont.length - 1].lv;
    fig.cont.forEach((c) => {
      const f = fig.cont.length > 1 ? (c.lv - vmin) / (vmax - vmin) : 0.5;
      ctx.save(); ctx.strokeStyle = C.rgba(C.shade(potCol(fig.id === 'c' ? 0.5 + 0.5 * f : f), -0.2), 0.55 + 0.25 * (RM ? 0 : Math.sin(S.t * 2 + c.lv)) * pulse); ctx.lineWidth = 3; ctx.stroke(c.path); ctx.restore();
      if (c.row != null && c.labs.length) { const x = c.lv < -1e-9 ? Math.min.apply(null, c.labs) : c.lv > 1e-9 ? Math.max.apply(null, c.labs) : c.labs[0]; D.label(x, c.row, Math.round(c.lv) + ' V', { bg: 'rgba(255,255,255,.92)', color: '#26324a', size: PHONE ? 10.5 : 12, pad: 5 }); }
    });
  }

  /* ================= ① 전기력선 읽기 ================= */
  const TOL = 22 * DEG;
  const angDiff = (a, b) => { let d = Math.abs(a - b) % TAU; if (d > Math.PI) d = TAU - d; return d; };
  const ptOK = (fig, k) => { const a = S.l1.ang[fig][k]; return a != null && angDiff(a, FIG1[fig].pts[k].ang) <= TOL; };
  const allOK = (fig) => ['A', 'B', 'C'].every((k) => ptOK(fig, k));
  function drawRead() {
    sceneBg();
    const f = FIG1[S.l1.fig], st = S.l1;
    T(14, 26, '🗺️ 완성된 전기력선 그림 — 점 A, B, C에서 전기장을 읽어요', PHONE ? 13 : 17, '#26324a', 'left', 800);
    panel(FR.x0, FR.y0, FR.x1 - FR.x0, FR.y1 - FR.y0, 16, '#fbfcff');
    ctx.save(); ctx.beginPath(); ctx.rect(FR.x0, FR.y0, FR.x1 - FR.x0, FR.y1 - FR.y0); ctx.clip();
    drawLines(f, 0.7);
    ctx.restore();
    f.ch.forEach((c) => drawChargeAt(c, st.reveal || (game && game.free)));
    ['A', 'B', 'C'].forEach((k) => {
      const p = f.pts[k], a = st.ang[f.id][k], ok = a != null && ptOK(f.id, k), sel = st.sel === k;
      if (sel) D.ring(p.x, p.y, 13, S.t, { color: '#f26b3a', width: 2.5 });
      if (a != null) { const L = 50 * Math.max(0.7, PS); D.arrow(p.x, p.y, p.x + Math.cos(a) * L, p.y + Math.sin(a) * L, { color: ok ? '#16a34a' : '#f26b3a', width: 4.5, head: 12 }); }
      D.sphere(p.x, p.y, 7, ok ? '#16a34a' : '#475569', { shadow: true, gloss: false });
      D.label(p.x + (p.x > CX ? 16 : -16), p.y - 16, k, { bg: sel ? '#f26b3a' : '#26324a', size: 13, pad: 7, align: p.x > CX ? 'left' : 'right' });
    });
    if (!st.touched && S.t > 1.5) T(CX, FR.y1 - 12, '점을 고른 뒤 그림을 눌러 전기장 방향을 가리켜 보세요', PHONE ? 12 : 14, '#9a3412', 'center', 800);
    // 아래 설명 패널
    panel(12, PYB, VW - 24, PHB, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = PYB + 26;
    T(26, y, '전기력선 읽는 규칙', sz + 1, '#1e40af', 'left', 800); y += lh + (PHONE ? 4 : 0);
    const rules = ['① 선은 (+)에서 나와 (−)로 들어가요 (화살표 방향)', '② 선의 접선 방향 = 그 점의 전기장 방향 (+전하가 받는 힘의 방향)', '③ 선이 빽빽한 곳일수록 전기장이 세요', '④ 전기력선은 서로 교차하지 않아요'];
    rules.forEach((r) => { y += textBlock(26, y, VW - 56, r, sz, '#26324a', lh, 800) + (PHONE ? 4 : 0); });
  }
  function readDown(p) {
    const st = S.l1; if (S.gate === 'm2') return false;
    if (p.x < FR.x0 || p.x > FR.x1 || p.y < FR.y0 || p.y > FR.y1) return false;
    const f = FIG1[st.fig]; st.touched = true;
    let best = null, bd = 30;
    ['A', 'B', 'C'].forEach((k) => { const d = Math.hypot(p.x - f.pts[k].x, p.y - f.pts[k].y); if (d < bd) { bd = d; best = k; } });
    if (best) { st.sel = best; updateCtl(); Sound.click(); st.drag = false; return true; }
    st.drag = true; readSet(p); Sound.tick(); return true;
  }
  function readSet(p) {
    const st = S.l1, f = FIG1[st.fig], q = f.pts[st.sel];
    if (Math.hypot(p.x - q.x, p.y - q.y) < 8) return;
    st.ang[st.fig][st.sel] = Math.atan2(p.y - q.y, p.x - q.x);
  }
  function rotSel(dd) { const st = S.l1, cur = st.ang[st.fig][st.sel]; st.ang[st.fig][st.sel] = (cur == null ? 0 : cur) + dd * DEG; st.touched = true; Sound.tick(); }
  $('#rotL').addEventListener('click', () => rotSel(-15));
  $('#rotR').addEventListener('click', () => rotSel(15));
  $$('#figSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.l1.fig = +b.dataset.v; S.fade = 0.6; updateCtl(); }));
  $$('#ptSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.l1.sel = b.dataset.v; updateCtl(); }));

  /* ================= ② 등전위면 ================= */
  const E2 = PHONE ? { cx: 240, cy: 212, px: 12.5 } : { cx: 240, cy: 300, px: 18 };
  const RADS = [3, 6, 9, 12];
  const Vcm = (rcm) => 900 / rcm;                           // V = kq/r = 9.0 V·m / r (q = +1.0 nC)
  const polar = (rcm, ang) => ({ x: E2.cx + Math.cos(ang) * rcm * E2.px, y: E2.cy + Math.sin(ang) * rcm * E2.px });
  const rcmOf = (p) => Math.hypot(p.x - E2.cx, p.y - E2.cy) / E2.px;
  const Vof = (m) => Math.round(Vcm(rcmOf(m)));
  const IV = [[300, 150], [150, 100], [100, 75]];
  const Eiv = (i) => (IV[i][0] - IV[i][1]) / 0.03;
  const U0 = 2.0e-9 * 300;                                   // 6.0×10⁻⁷ J
  function snapR(p) {
    let dx = p.x - E2.cx, dy = p.y - E2.cy, rc = Math.hypot(dx, dy) / E2.px;
    if (rc < 1e-6) { dx = 1; dy = 0; rc = 1; }
    const ang = Math.atan2(dy, dx); let r = clamp(rc, 2, 12.5);
    for (const g of RADS) if (Math.abs(r - g) * E2.px < 9) r = g;
    return polar(r, ang);
  }
  function tcPos() {
    const t = S.l2.tc, a0 = -30 * DEG;
    if (t.mode === 'arc') return polar(3, a0 + TAU * t.s);
    if (t.mode === 'rad') return polar(3 + 9 * t.s, a0);
    return polar(3, a0);
  }
  const tcV = () => { const p = tcPos(); return Vcm(rcmOf(p)); };
  function tcGo(mode) {
    const t = S.l2.tc; if (t.tw) t.tw.cancel();
    t.mode = mode; t.s = 0; S.l2.tcSeen[mode] = false;
    t.tw = SciSim.tween(t, { s: 1 }, { duration: RM ? 0.01 : mode === 'arc' ? 3.2 : 2.6, ease: 'inOutQuad', onDone: () => { t.tw = null; S.l2.tcSeen[mode] = true; Sound.success(); updateCtl(); } });
    updateCtl();
  }
  function tcReset() { const t = S.l2.tc; if (t.tw) { t.tw.cancel(); t.tw = null; } t.mode = ''; t.s = 0; }
  $('#bArc').addEventListener('click', () => { Sound.click(); tcGo('arc'); });
  $('#bRad').addEventListener('click', () => { Sound.click(); tcGo('rad'); });
  $('#bTcReset').addEventListener('click', () => { Sound.click(); tcReset(); updateCtl(); });
  $$('#ivSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.l2.band = +b.dataset.v; updateCtl(); }));
  function resetEqui() { const l = S.l2; tcReset(); l.band = 0; l.X = polar(4.5, -60 * DEG); l.Y = polar(10, 40 * DEG); l.drag = null; l.tcSeen = {}; }
  const msk2 = () => S.gate === 'm2b';
  function drawEqui() {
    sceneBg();
    const l = S.l2, c = { x: E2.cx, y: E2.cy };
    T(14, 26, '🎯 +1.0 nC 둘레의 등전위선 (점선은 전기력선)', PHONE ? 13.5 : 17, '#26324a', 'left', 800);
    panel(AR.x0, AR.y0, AR.x1 - AR.x0, AR.y1 - AR.y0, 16, '#fbfcff');
    ctx.save(); ctx.beginPath(); ctx.rect(AR.x0, AR.y0, AR.x1 - AR.x0, AR.y1 - AR.y0); ctx.clip();
    // 색 띠 (전위가 높을수록 붉게, 맥동)
    const pul = RM ? 0 : Math.sin(S.t * 2.2) * 0.07;
    for (let i = 4; i >= 0; i--) {
      const rin = i === 0 ? 0 : RADS[i - 1], rout = i === 4 ? 12.9 : RADS[i], Vm = i === 0 ? 450 : i === 4 ? 60 : (Vcm(RADS[i - 1]) + Vcm(RADS[i])) / 2;
      ctx.fillStyle = C.rgba(potCol(0.5 + 0.5 * clamp(Vm / 300, 0, 1)), 0.34 + pul);
      ctx.beginPath(); ctx.arc(c.x, c.y, rout * E2.px, 0, TAU); if (rin > 0) ctx.arc(c.x, c.y, rin * E2.px, 0, TAU, true); ctx.fill('evenodd');
    }
    // 선택한 구간 강조
    const bi = l.band, r1 = RADS[bi], r2 = RADS[bi + 1];
    ctx.fillStyle = 'rgba(245,158,11,' + (0.22 + 0.1 * (RM ? 0 : Math.sin(S.t * 4))) + ')';
    ctx.beginPath(); ctx.arc(c.x, c.y, r2 * E2.px, 0, TAU); ctx.arc(c.x, c.y, r1 * E2.px, 0, TAU, true); ctx.fill('evenodd');
    // 등전위선
    RADS.forEach((rr) => { ctx.strokeStyle = '#8b3a1d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, rr * E2.px, 0, TAU); ctx.stroke(); });
    // 전기력선 (점선) + 흐르는 점
    for (let k = 0; k < 12; k++) {
      const a = k * TAU / 12 + 0.26;
      ctx.strokeStyle = 'rgba(37,99,235,.5)'; ctx.lineWidth = 1.6; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(c.x + Math.cos(a) * 16 * PS, c.y + Math.sin(a) * 16 * PS); ctx.lineTo(c.x + Math.cos(a) * 12.9 * E2.px, c.y + Math.sin(a) * 12.9 * E2.px); ctx.stroke(); ctx.setLineDash([]);
      const ax = c.x + Math.cos(a) * 7.5 * E2.px, ay = c.y + Math.sin(a) * 7.5 * E2.px;
      ctx.fillStyle = 'rgba(30,64,175,.9)'; ctx.beginPath(); ctx.moveTo(ax + Math.cos(a) * 6, ay + Math.sin(a) * 6); ctx.lineTo(ax - Math.cos(a) * 5 - Math.sin(a) * 4.5, ay - Math.sin(a) * 5 + Math.cos(a) * 4.5); ctx.lineTo(ax - Math.cos(a) * 5 + Math.sin(a) * 4.5, ay - Math.sin(a) * 5 - Math.cos(a) * 4.5); ctx.closePath(); ctx.fill();
      if (!RM) { const s = (S.t * 0.6 + k * 0.083) % 1, rr = (1.2 + s * 11.6) * E2.px; ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, 2.4, 0, TAU); ctx.fill(); }
    }
    // 직각 표시 (등전위선 ⟂ 전기력선)
    const ang = 0.26 + 3 * TAU / 12 - 0.0; RADS.forEach((rr) => {
      const a = 0.26 + TAU * 2 / 12, px = c.x + Math.cos(a) * rr * E2.px, py = c.y + Math.sin(a) * rr * E2.px, ux = Math.cos(a), uy = Math.sin(a), tx = -uy, ty = ux, s = 9;
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - ux * s, py - uy * s); ctx.lineTo(px - ux * s + tx * s, py - uy * s + ty * s); ctx.lineTo(px + tx * s, py + ty * s); ctx.stroke();
    });
    ctx.restore();
    T(E2.cx + Math.cos(0.26 + TAU / 6) * 9.2 * E2.px + 8, E2.cy + Math.sin(0.26 + TAU / 6) * 9.2 * E2.px + 22, '직각 ⊾', PHONE ? 11 : 12.5, '#0b7a41', 'left', 800);
    // 눈금 라벨
    RADS.forEach((rr) => {
      const a = -90 * DEG; D.label(c.x + Math.cos(a) * rr * E2.px, c.y + Math.sin(a) * rr * E2.px, rr + ' cm · ' + Math.round(Vcm(rr)) + ' V', { bg: '#8b3a1d', size: PHONE ? 10.5 : 12.5, pad: 6 });
    });
    D.glow(c.x, c.y, 34 * PS, POS, 0.4); D.sphere(c.x, c.y, 14 * PS, POS, { shadow: true, text: '+' });
    // 시험 전하
    if (l.tc.mode || true) {
      const p = tcPos(), moving = !!l.tc.tw;
      if (l.tc.mode === 'arc') { ctx.strokeStyle = 'rgba(245,158,11,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, 3 * E2.px, -30 * DEG, -30 * DEG + TAU * l.tc.s); ctx.stroke(); }
      if (l.tc.mode === 'rad') { const e = polar(3 + 9 * l.tc.s, -30 * DEG), s0 = polar(3, -30 * DEG); ctx.strokeStyle = 'rgba(245,158,11,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(e.x, e.y); ctx.stroke(); }
      D.sphere(p.x, p.y, 9, '#ffb400', { shadow: true, text: 'q' });
      if (l.tc.mode && moving || l.tc.mode) {
        const ux = (p.x - c.x) / Math.hypot(p.x - c.x, p.y - c.y), uy = (p.y - c.y) / Math.hypot(p.x - c.x, p.y - c.y);
        D.arrow(p.x + ux * 11, p.y + uy * 11, p.x + ux * 40, p.y + uy * 40, { color: COL_F, width: 3.5, head: 9 });
        if (l.tc.mode === 'arc') { const dir = l.tc.s < 1 ? 1 : 0; if (dir) D.arrow(p.x - uy * 11, p.y + ux * 11, p.x - uy * 36, p.y + ux * 36, { color: '#475569', width: 3.5, head: 9 }); }
        lbl(p.x + ux * 52, p.y + uy * 52, '힘 F', { color: '#9a3412', border: '#f6b08a', size: 12, pad: 6 });
      }
    }
    // 점 X, Y
    [['X', l.X, '#7c3aed'], ['Y', l.Y, '#0d9488']].forEach((a) => {
      const p = a[1], v = Vof(p);
      D.shadow(() => { ctx.fillStyle = a[2]; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, TAU); ctx.fill(); }, { blur: 6, y: 2 });
      T(p.x, p.y + 5, a[0], 13, '#fff', 'center', 800);
      lbl(p.x + 28, p.y - 18, v + ' V', { bg: a[2], color: '#fff', size: PHONE ? 12 : 13.5 });
      if (l.drag === a[0]) D.ring(p.x, p.y, 15, S.t, { color: a[2], width: 2 });
    });
    if (!S.seenXY && S.t > 1.5 && S.t < 12 && !msk2()) T(AR.x0 + 14, AR.y1 - 14, '점 X, Y를 끌어 등전위선 위에 올려 보세요', PHONE ? 12 : 13.5, '#9a3412', 'left', 800);
    drawEquiPanel();
  }
  function drawEquiPanel() {
    const l = S.l2, bi = l.band, mk = msk2();
    const x = PHONE ? 12 : 496, w = PHONE ? VW - 24 : VW - 496 - 12;
    const y1 = PHONE ? PYB : AR.y0, h1 = PHONE ? 118 : 188;
    panel(x, y1, w, h1, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = y1 + 24;
    T(x + 12, y, mk ? '구간별 전위차와 간격' : '구간 ' + RADS[bi] + '~' + RADS[bi + 1] + ' cm 에서', sz + 0.5, '#1e40af', 'left', 800);
    if (mk) {
      for (let i = 0; i < 3; i++) { y += lh; T(x + 12, y, RADS[i] + '~' + RADS[i + 1] + ' cm: ΔV = ' + (IV[i][0] - IV[i][1]) + ' V, Δr = 0.03 m, E = ?', sz, '#26324a', 'left', 800); }
    } else {
      y += lh; T(x + 12, y, 'ΔV = ' + IV[bi][0] + ' V − ' + IV[bi][1] + ' V = ' + (IV[bi][0] - IV[bi][1]) + ' V', sz, '#26324a', 'left', 800);
      y += lh; T(x + 12, y, 'Δr = ' + (RADS[bi + 1] - RADS[bi]) + ' cm = 0.03 m', sz, '#26324a', 'left', 800);
      y += lh; T(x + 12, y, 'E ≈ ΔV / Δr = ' + sci(Eiv(bi)) + ' V/m', sz, '#9a3412', 'left', 800);
      if (!PHONE) { y += lh; T(x + 12, y, bi === 0 ? '← 간격이 좁은 곳이 E가 커요' : bi === 2 ? '← 간격이 넓은 곳은 E가 작아요' : '', sz - 0.5, '#0b7a41', 'left', 800); }
    }
    // 에너지 막대
    const y2 = PHONE ? y1 + h1 + 8 : y1 + h1 + 10, h2 = PHONE ? PHB - h1 - 8 : AR.y1 - y2;
    panel(x, y2, w, h2, 14);
    const U = 2.0e-9 * tcV(), W = U0 - U, t = l.tc;
    T(x + 12, y2 + 24, '시험 전하 q = 2.0 nC의 전위 에너지 U = qV', sz, '#26324a', 'left', 800);
    const bx = x + 12, bw = w - 24, by = y2 + 38, bh = 24;
    D.roundRect(bx, by, bw, bh, 9); ctx.fillStyle = '#eef1f7'; ctx.fill();
    const fw = bw * clamp(U / U0, 0, 1);
    if (fw > 0.5) { D.roundRect(bx, by, fw, bh, 9); ctx.fillStyle = '#f2873a'; ctx.fill(); }
    T(bx + 8, by + 17, 'U = ' + sci(U) + ' J', 13.5, fw > 100 ? '#fff' : '#26324a', 'left', 800);
    T(bx, by + bh + 17, '0', 12, '#516079', 'left', 700); T(bx + bw, by + bh + 17, sci(U0) + ' J', 12, '#516079', 'right', 700);
    if (t.mode === 'arc') T(x + 12, by + bh + (PHONE ? 38 : 42), t.s >= 1 ? 'U가 그대로 → 한 일 W = 0' : 'U가 변하지 않아요…', sz, t.s >= 1 ? '#0b7a41' : '#516079', 'left', 800);
    else if (t.mode === 'rad') textBlock(x + 12, by + bh + (PHONE ? 38 : 42), w - 24, t.s >= 1 ? 'W = qΔV = (2.0×10⁻⁹)(300 − 75) = ' + sci(U0 - 2.0e-9 * 75) + ' J' : 'U가 줄어들고 있어요…', sz, '#0b7a41', lh, 800);
    else T(x + 12, by + bh + (PHONE ? 38 : 42), '버튼으로 시험 전하를 옮겨 보세요', sz, '#516079', 'left', 800);
  }
  function equiDown(p) {
    const l = S.l2; if (p.x < AR.x0 || p.y < AR.y0 || p.y > AR.y1 || p.x > AR.x1) return false;
    let best = null, bd = 30; [['X', l.X], ['Y', l.Y]].forEach((a) => { const d = Math.hypot(p.x - a[1].x, p.y - a[1].y); if (d < bd) { bd = d; best = a[0]; } });
    if (!best) return false; l.drag = best; S.seenXY = true; Sound.click(); return true;
  }
  function equiMove(p) { const l = S.l2; if (!l.drag) return; const q = snapR({ x: clamp(p.x, AR.x0 + 8, AR.x1 - 8), y: clamp(p.y, AR.y0 + 8, AR.y1 - 8) }); if (l.drag === 'X') l.X = q; else l.Y = q; }

  /* ================= ③ 균일한 장 ================= */
  const E_CH = 1.6e-19, M_E = 9.11e-31, M_P = 1.67e-27;
  const PL = PHONE ? { x0: 40, x1: 360, cy: 232, px: 30 } : { x0: 44, x1: 384, cy: 300, px: 46 };
  const lineStep = (V) => Math.ceil(V / 6);
  function plGeom() { const l = S.l3, g = l.d * PL.px; return { top: PL.cy - g / 2, bot: PL.cy + g / 2, g }; }
  const Eof3 = () => S.l3.V / (S.l3.d / 100);
  const fE3 = (x) => g3(x);
  const msk3 = () => S.gate === 'num3';
  const tPhys = () => Math.sqrt(2 * Math.pow(S.l3.d / 100, 2) * M_E / (E_CH * S.l3.V));
  function plBack() { const r = S.l3.run; r.st = 'rest'; r.t = 0; }
  function plGo() { const r = S.l3.run; if (r.st === 'run') return; r.st = 'run'; r.t = 0; Sound.click(); }
  $('#bGo').addEventListener('click', plGo);
  $('#bBack').addEventListener('click', () => { Sound.click(); plBack(); updateCtl(); });
  function bindSl(id, get, set) {
    const s = $('#' + id);
    s.addEventListener('input', () => { if (S.l3.run.st === 'run') return; set(+s.value); updateCtl(); Sound.tick(); });
    $('#' + id + 'M').addEventListener('click', () => { if (S.l3.run.st === 'run') return; Sound.click(); set(get() - (+s.step)); updateCtl(); });
    $('#' + id + 'P').addEventListener('click', () => { if (S.l3.run.st === 'run') return; Sound.click(); set(get() + (+s.step)); updateCtl(); });
  }
  bindSl('sV', () => S.l3.V, (v) => { S.l3.V = clamp(Math.round(v), 3, 12); plBack(); clampProbe(); });
  bindSl('sD', () => S.l3.d, (v) => { S.l3.d = clamp(Math.round(v * 2) / 2, 3, 6); plBack(); clampProbe(); });
  function clampProbe() { const g = plGeom(), p = S.l3.probe; p.y = clamp(p.y, g.top + 8, g.bot - 8); p.x = clamp(p.x, PL.x0 + 14, PL.x1 - 14); }
  function stepPlates(dt) {
    const l = S.l3, r = l.run, tp = tPhys();
    if (r.st === 'run') { r.t += dt / 1.9 * tp; if (r.t >= tp) { r.t = tp; r.st = 'done'; const g = plGeom(); parts.burst((PL.x0 + PL.x1) / 2 - 60, g.top + 4, { count: 14, speed: 140, life: 0.7, size: 3 }); Sound.success(); updateCtl(); } }
    // 탐침이 지나간 높이 구간 기록
    const g = plGeom(), p = l.probe, f = (g.bot - p.y) / g.g;
    l.seen[f < 1 / 3 ? 'bot' : f > 2 / 3 ? 'top' : 'mid'] = true;
  }
  function drawPlates() {
    sceneBg();
    const l = S.l3, g = plGeom(), r = l.run, V = l.V, step = lineStep(V), E = Eof3(), mk = msk3();
    T(14, 26, '🔋 평행판 사이의 균일한 전기장', PHONE ? 15 : 17, '#26324a', 'left', 800);
    const wPan = AR.x1 - AR.x0;
    panel(AR.x0, AR.y0, wPan, AR.y1 - AR.y0, 16, '#fbfcff');
    // 전위 색 띠
    const grad = ctx.createLinearGradient(0, g.top, 0, g.bot); grad.addColorStop(0, C.rgba(potCol(1), 0.32)); grad.addColorStop(1, C.rgba(potCol(0.5), 0.32));
    ctx.fillStyle = grad; ctx.fillRect(PL.x0, g.top, PL.x1 - PL.x0, g.g);
    // 판
    D.roundRect(PL.x0 - 6, g.top - 14, PL.x1 - PL.x0 + 12, 14, 5); ctx.fillStyle = '#e2574c'; ctx.fill();
    D.roundRect(PL.x0 - 6, g.bot, PL.x1 - PL.x0 + 12, 14, 5); ctx.fillStyle = '#2f6df6'; ctx.fill();
    T(PL.x0 + 4, g.top - 20, '(+)판  ' + V + ' V', 13, '#9a3412', 'left', 800); T(PL.x0 + 4, g.bot + 32, '(−)판  0 V', 13, '#1e40af', 'left', 800);
    // 등전위선
    for (let v = step; v < V - 1e-9; v += step) {
      const y = g.bot - v / V * g.g;
      ctx.strokeStyle = 'rgba(139,58,29,.7)'; ctx.lineWidth = 1.8; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(PL.x0, y); ctx.lineTo(PL.x1, y); ctx.stroke(); ctx.setLineDash([]);
      T(PL.x1 + 8, y + 4, v + ' V', 12.5, '#8b3a1d', 'left', 800);
    }
    // 간격 표시 (첫 등전위선 ~ 둘째)
    { const y1 = g.bot - step / V * g.g, y0 = g.bot - (step * 2 <= V - 1e-9 ? step * 2 : V) / V * g.g, bx = PL.x1 + 44;
      if (bx + 34 < wPan + AR.x0) { ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, y0); ctx.lineTo(bx, y1); ctx.moveTo(bx - 5, y0); ctx.lineTo(bx + 5, y0); ctx.moveTo(bx - 5, y1); ctx.lineTo(bx + 5, y1); ctx.stroke();
        T(bx + 8, (y0 + y1) / 2 + 4, g3((y1 - y0) / PL.px) + ' cm', PHONE ? 11.5 : 12.5, '#0b7a41', 'left', 800); } }
    // 전기력선 (아래로, 균일)
    const nL = 7;
    for (let i = 0; i < nL; i++) {
      const x = PL.x0 + (i + 0.5) * (PL.x1 - PL.x0) / nL;
      D.arrow(x, g.top + 6, x, g.bot - 4, { color: 'rgba(37,99,235,.55)', width: 2.4, head: 9 });
      if (!RM) { const s = (S.t * 0.55 + i * 0.13) % 1; ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(x, g.top + 6 + s * (g.g - 10), 2.5, 0, TAU); ctx.fill(); }
    }
    // 입자
    const tp = tPhys(), u = clamp(r.t / tp, 0, 1);
    const xe = (PL.x0 + PL.x1) / 2 - 60, xp = (PL.x0 + PL.x1) / 2 + 60;
    const ye = g.bot - 9 - (g.g - 18) * u * u, yp = g.top + 9 + (g.g - 18) * u * u / (M_P / M_E);
    const Fp = E_CH * E, Lf = 46;
    D.arrow(xe, ye - 14, xe, ye - 14 - Lf, { color: COL_F, width: 4, head: 10 }); D.arrow(xp, yp + 14, xp, yp + 14 + Lf, { color: COL_F, width: 4, head: 10 });
    lbl(xe + 20, ye - 14 - Lf / 2, 'F', { color: '#9a3412', border: '#f6b08a', size: 12, pad: 6 }); lbl(xp + 20, yp + 14 + Lf / 2, 'F', { color: '#9a3412', border: '#f6b08a', size: 12, pad: 6 });
    D.sphere(xe, ye, 9, NEG, { shadow: true, text: '−' }); D.sphere(xp, yp, 9, POS, { shadow: true, text: '+' });
    lbl(xe + 38, ye + 2, '전자', { bg: NEG, color: '#fff', size: 12, pad: 6 });
    lbl(xp + 44, yp - 2, '양성자', { bg: POS, color: '#fff', size: 12, pad: 6 });
    // 탐침 ✚
    const p = l.probe;
    D.shadow(() => { ctx.strokeStyle = '#26324a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x - 11, p.y); ctx.lineTo(p.x + 11, p.y); ctx.moveTo(p.x, p.y - 11); ctx.lineTo(p.x, p.y + 11); ctx.stroke(); }, { blur: 4, y: 1 });
    lbl(p.x + 54, p.y - 16, 'E = ' + (mk ? '?' : fE3(E) + ' V/m'), { bg: '#26324a', color: '#fff', size: PHONE ? 12 : 13.5 });
    if (l.drag) D.ring(p.x, p.y, 16, S.t, { color: '#f26b3a', width: 2 });
    drawPlatesPanel(E, mk, tp);
  }
  function drawPlatesPanel(E, mk, tp) {
    const l = S.l3, r = l.run, V = l.V, d = l.d, step = lineStep(V);
    const x = PHONE ? 12 : 496, w = PHONE ? VW - 24 : VW - 496 - 12;
    const y1 = PHONE ? PYB : AR.y0, h1 = PHONE ? 132 : 128;
    panel(x, y1, w, h1, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = y1 + 24;
    const gap = (step / V) * d;
    T(x + 12, y, '등전위선으로 구하기', sz + 0.5, '#1e40af', 'left', 800);
    y += lh; T(x + 12, y, '인접한 선: ΔV = ' + step + ' V, 간격 ' + g3(gap) + ' cm', sz, '#26324a', 'left', 800);
    y += lh; T(x + 12, y, 'E = ΔV / Δd = ' + (mk ? '?' : step + ' / ' + g3(gap / 100) + ' = ' + fE3(E) + ' V/m'), sz, '#9a3412', 'left', 800);
    y += lh; T(x + 12, y, '판 전체: E = V / d = ' + (mk ? '?' : V + ' / ' + g3(d / 100) + ' = ' + fE3(E) + ' V/m'), sz, '#9a3412', 'left', 800);
    if (!PHONE) { y += lh; T(x + 12, y, '판 사이 어디서나 E가 같아요', sz, '#0b7a41', 'left', 800); }
    // 전자·양성자
    const y2 = PHONE ? y1 + h1 + 8 : y1 + h1 + 10, h2 = PHONE ? PHB - h1 - 8 : AR.y1 - y2;
    panel(x, y2, w, h2, 14);
    const F = E_CH * E, ae = F / M_E, ap = F / M_P, u = clamp(r.t / tp, 0, 1);
    let yy = y2 + 24; const adv = (str, col) => { yy += textBlock(x + 12, yy, w - 24, str, sz - 0.5, col, lh - 2, 800) + 2; };
    T(x + 12, yy, '(+)판 ↔ (−)판 사이의 전하', sz + 0.5, '#1e40af', 'left', 800); yy += lh - 2;
    adv('F = eE = ' + (mk ? '?' : sci(F) + ' N') + ' (크기는 같고 방향은 반대)', '#26324a');
    adv('가속도 a = F/m : 전자 ' + (mk ? '?' : sci(ae) + ' m/s²') + ', 양성자 ' + (mk ? '?' : sci(ap) + ' m/s²') + ' (약 1.8×10³배 작아요)', '#26324a');
    const keE = V * u * u, keP = V * u * u / (M_P / M_E);
    if (r.st === 'rest') adv('▶ 놓기를 눌러 보세요', '#516079');
    else {
      adv('시간 t = ' + g3(r.t * 1e9) + ' ns', '#26324a');
      adv('전자 운동 에너지 ' + g3(keE) + ' eV', NEG);
      adv('양성자 운동 에너지 ' + (keP < 0.01 ? sci(keP, 1) : g3(keP)) + ' eV', POS);
      if (r.st === 'done') adv('W = eEd = eΔV = ' + V + ' eV → 전자는 ' + V + ' eV를 얻었어요. 양성자는 같은 시간에 거의 움직이지 못했어요.', '#0b7a41');
    }
  }
  function platesDown(p) {
    const g = plGeom(), l = S.l3;
    if (p.x < PL.x0 - 14 || p.x > PL.x1 + 14 || p.y < g.top - 10 || p.y > g.bot + 10) return false;
    l.drag = true; l.probe.x = clamp(p.x, PL.x0 + 14, PL.x1 - 14); l.probe.y = clamp(p.y, g.top + 8, g.bot - 8); S.seenProbe = true; Sound.click(); return true;
  }
  function platesMove(p) { const l = S.l3, g = plGeom(); if (!l.drag) return; l.probe.x = clamp(p.x, PL.x0 + 14, PL.x1 - 14); l.probe.y = clamp(p.y, g.top + 8, g.bot - 8); }

  /* ================= ④ 그림 해석 ================= */
  function drawFigs() {
    sceneBg();
    const k = S.l4.fig, f = A4[k];
    T(14, 26, '🔍 처음 보는 그림 — ' + f.name + (k === 'a' ? ' (등전위선 V 눈금)' : k === 'b' ? ' (등전위선 V 눈금)' : ' (도체)'), PHONE ? 13.5 : 17, '#26324a', 'left', 800);
    panel(FR.x0, FR.y0, FR.x1 - FR.x0, FR.y1 - FR.y0, 16, '#fbfcff');
    ctx.save(); ctx.beginPath(); ctx.rect(FR.x0, FR.y0, FR.x1 - FR.x0, FR.y1 - FR.y0); ctx.clip();
    drawContours(f, 1);
    drawLines(f, 0.7);
    ctx.restore();
    if (f.kind === 'spheroid') {
      const g = ctx.createLinearGradient(f.cx - f.b, 0, f.cx + f.b, 0); g.addColorStop(0, '#cbd5e1'); g.addColorStop(0.45, '#f1f5f9'); g.addColorStop(1, '#94a3b8');
      D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(f.cx, f.cy, f.b, f.a, 0, 0, TAU); ctx.fill(); }, { blur: 8, y: 2 });
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(f.cx, f.cy, f.b, f.a, 0, 0, TAU); ctx.stroke();
      T(f.cx, f.cy + 5, '도체', PHONE ? 11 : 13, '#334155', 'center', 800);
      T(f.cx - f.b - 12, f.cy - f.a + 4, '뾰족한 끝', PHONE ? 11 : 12.5, '#475569', 'right', 800);
    } else f.ch.forEach((c) => drawChargeAt(c, false));
    const sets = S.l4.ans[k];
    ['A', 'B', 'C'].forEach((n) => {
      const p = f.pts[n];
      D.sphere(p.x, p.y, 7, '#475569', { shadow: true, gloss: false });
      D.label(p.x + (p.x > CX ? 16 : -16), p.y - 16, n, { bg: '#26324a', size: 13, pad: 7, align: p.x > CX ? 'left' : 'right' });
    });
    panel(12, PYB, VW - 24, PHB, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = PYB + 26;
    T(26, y, '그림에서 읽을 수 있는 것', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    const tips = k === 'a' ? ['전기력선의 화살표 방향으로 전하의 부호를 알 수 있어요', '선이 빽빽한 곳 = E가 큰 곳, 등전위선 눈금 = 전위 V'] : k === 'b' ? ['선이 서로 밀려나는 곳(선이 없는 곳)이 E = 0인 점이에요', '같은 등전위선 위의 두 점은 전위가 같아요'] : ['도체 표면은 등전위면이고, 전기력선은 표면에 수직으로 나와요', '선이 빽빽한 뾰족한 끝에서 E가 가장 세요'];
    tips.forEach((tx) => { y += textBlock(26, y, VW - 56, '• ' + tx, sz, '#26324a', lh, 800) + 2; });
    y += 4; T(26, y, '오른쪽(아래) 질문에 답하고 ✔ 확인하기를 눌러요', sz, '#9a3412', 'left', 800);
  }

  /* ================= 포인터 ================= */
  SciSim.pointer(view, {
    down(p) { if (S.mode === 'read') return readDown(p); if (S.mode === 'equi') return equiDown(p); if (S.mode === 'plates') return platesDown(p); return false; },
    move(p) { if (S.mode === 'read') { if (S.l1.drag) readSet(p); } else if (S.mode === 'equi') equiMove(p); else if (S.mode === 'plates') platesMove(p); },
    up() { S.l1.drag = false; S.l2.drag = null; S.l3.drag = false; },
    hover(p) {
      if (S.mode === 'equi') { const l = S.l2; return Math.hypot(p.x - l.X.x, p.y - l.X.y) < 24 || Math.hypot(p.x - l.Y.x, p.y - l.Y.y) < 24 ? 'grab' : 'default'; }
      if (S.mode === 'plates') { const q = S.l3.probe; return Math.hypot(p.x - q.x, p.y - q.y) < 24 ? 'grab' : 'default'; }
      return 'default';
    },
  });

  /* ================= 공통 UI 갱신 ================= */
  function setRange(id, v, mn, mx, fmt) {
    const s = $('#' + id); if (!s) return;
    if (Math.abs(+s.value - v) > 1e-9) s.value = v;
    s.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%');
    const o = s.parentElement.parentElement.querySelector('output'); if (o) o.textContent = fmt(v);
  }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); S.l1.drag = false; S.l2.drag = null; S.l3.drag = false; if (mode !== 'equi') tcReset(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#figSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.l1.fig));
    $$('#ptSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.l1.sel));
    $$('#ivSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.l2.band));
    $('#bArc').disabled = !!S.l2.tc.tw; $('#bRad').disabled = !!S.l2.tc.tw; $('#bTcReset').disabled = !!S.l2.tc.tw || !S.l2.tc.mode;
    const l = S.l3, run = l.run.st === 'run';
    setRange('sV', l.V, 3, 12, (v) => v + ' V'); setRange('sD', l.d, 3, 6, (v) => v.toFixed(1) + ' cm');
    $('#sV').disabled = run; $('#sD').disabled = run; $('#sVM').disabled = run || l.V <= 3; $('#sVP').disabled = run || l.V >= 12; $('#sDM').disabled = run || l.d <= 3; $('#sDP').disabled = run || l.d >= 6;
    $('#bGo').disabled = run; $('#bBack').disabled = l.run.st === 'rest';
    $$('#fig4Seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.l4.fig));
    $$('#selHost4 .sel-row').forEach((r) => { r.hidden = r.dataset.fig !== S.l4.fig; });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#fig4Seg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.l4.fig = b.dataset.v; S.fade = 0.6; updateCtl(); }));

  function readouts() {
    let a, b, c;
    if (S.mode === 'read') {
      const f = S.l1.fig, st = (k) => { const x = S.l1.ang[f][k]; return x == null ? '아직 안 정했어요' : ptOK(f, k) ? '방향 맞아요 ✅' : '다시 돌려 봐요'; };
      a = ['점 A', st('A')]; b = ['점 B', st('B')]; c = ['점 C', st('C')];
    } else if (S.mode === 'equi') {
      const l = S.l2, vx = Vof(l.X), vy = Vof(l.Y);
      a = ['점 X의 전위', vx + ' V']; b = ['점 Y의 전위', vy + ' V']; c = ['전위차 V_X − V_Y', (vx - vy) + ' V'];
    } else if (S.mode === 'plates') {
      const E = Eof3(); a = ['판 사이 전기장 E', msk3() ? '?' : fE3(E) + ' V/m']; b = ['전자·양성자의 힘 F = eE', msk3() ? '?' : sci(E_CH * E) + ' N']; c = ['판 사이 전압 · 간격', S.l3.V + ' V · ' + S.l3.d.toFixed(1) + ' cm'];
    } else {
      const k = S.l4.fig, n = (kk) => Object.keys(S.l4.ans[kk]).filter((i) => S.l4.ans[kk][i]).length;
      a = ['보는 그림', A4[k].name]; b = ['이 그림에서 답한 문제', n(k) + ' / 3']; c = ['전체 답한 문제', (n('a') + n('b') + n('c')) + ' / 9'];
    }
    [[l1, v1, a], [l2, v2, b], [l3, v3, c]].forEach((z) => { if (z[0].textContent !== z[2][0]) z[0].textContent = z[2][0]; if (z[1].textContent !== z[2][1]) z[1].textContent = z[2][1]; });
  }

  /* ================= 미션 ================= */
  const M2R = [
    ['그림 ③에서 두 전하의 부호는?', ['둘 다 (+)', '둘 다 (−)', '(+)와 (−)'], 0],
    ['왼쪽 전하량 : 오른쪽 전하량 (선의 개수 비)', ['1 : 1', '2 : 1', '1 : 2'], 1],
    ['점 A, B, C 중 전기장이 가장 센 점은?', ['점 A', '점 B', '점 C'], 'ABC'.indexOf(strongest(FIG1[3])[0])],
    ['점 A, B, C 중 전기장이 가장 약한 점은?', ['점 A', '점 B', '점 C'], 'ABC'.indexOf(strongest(FIG1[3])[2])],
  ];
  const m2Store = {}, m2Ok = {}, m2Sels = makeSelects($('#selHost1'), M2R, m2Store, m2Ok);
  function checkSel(rules, store, ok, sels, msg) {
    const miss = rules.filter((r, i) => !store[i]).length; if (miss) return '아직 고르지 않은 문제가 ' + miss + '개 있어요.';
    let bad = 0; rules.forEach((r, i) => { const o = +store[i] - 1 === r[2]; if (!o) bad++; selMark(sels[i], i, o, ok); });
    return bad ? msg : true;
  }
  const B2 = { rules: [['등전위선 간격이 가장 좁은 구간은?', ['3~6 cm', '6~9 cm', '9~12 cm'], 0]], st: {}, ok: {} };
  const b2Sels = makeSelects($('#selHost2'), B2.rules, B2.st, B2.ok);
  const num2 = makeNum($('#selHost2'), '그 구간의 전기장 E = ΔV/Δr 은?', 'E ≈', 'V/m');
  const num3 = makeNum($('#num3Host'), '<b>V = 12 V</b>인 판의 간격만 <b>절반(6.0 cm → 3.0 cm)</b>으로 줄이면 E는?', 'E =', 'V/m');
  // 그림 해석 질문 (그림별 3개, 모두 한 번에 확인)
  const q4Host = $('#selHost4'), q4Sels = {}, q4Store = {}, q4Ok = {};
  ['a', 'b', 'c'].forEach((k) => {
    q4Store[k] = {}; q4Ok[k] = {};
    const tmp = document.createElement('div');
    q4Sels[k] = makeSelects(tmp, QS[k], q4Store[k], q4Ok[k]);
    Array.from(tmp.children).forEach((row) => { row.dataset.fig = k; q4Host.appendChild(row); });
    q4Sels[k].forEach((s, i) => s.addEventListener('change', () => { S.l4.ans[k][i] = !!s.value; }));
  });
  function check4() {
    let miss = 0, bad = []; ['a', 'b', 'c'].forEach((k) => { QS[k].forEach((r, i) => { if (!q4Store[k][i]) miss++; }); });
    if (miss) return '아직 답하지 않은 문제가 ' + miss + '개 있어요. (그림 가·나·다를 모두 풀어요)';
    ['a', 'b', 'c'].forEach((k) => { let w = 0; QS[k].forEach((r, i) => { const o = +q4Store[k][i] - 1 === r[2]; if (!o) w++; selMark(q4Sels[k][i], i, o, q4Ok[k]); }); if (w) bad.push(A4[k].name); });
    return bad.length ? bad.join(', ') + '에서 틀린 답이 있어요. 빨간 칸을 다시 생각해 보세요. (선의 방향·빽빽함, 등전위선의 눈금을 살펴봐요)' : true;
  }
  function checkNum(h, target, tol, hintMsg) { const ok = numOK(h, target, tol); if (ok === null) return '값을 입력해 주세요.'; h.mark(ok); return ok ? true : hintMsg; }
  function reset4() { resetSels(q4Sels.a, q4Store.a, q4Ok.a); resetSels(q4Sels.b, q4Store.b, q4Ok.b); resetSels(q4Sels.c, q4Store.c, q4Ok.c); S.l4.ans = { a: {}, b: {}, c: {} }; }
  function resetRead(fig) { S.l1.fig = fig || 2; S.l1.sel = 'A'; S.l1.ang = { 1: {}, 2: {}, 3: {} }; S.l1.reveal = false; S.l1.touched = false; resetSels(m2Sels, m2Store, m2Ok); }
  const MS = {};

  const levels = [
    {
      title: '전기력선 읽기', short: '전기력선 읽기', icon: '🗺️', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 그림만 보고도 전기장이 어디서 센지 알아낼 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(점전하의 전기장)</b>에서 E = kq/r²으로 전기장을 계산했어요. 이번에는 <b>이미 그려진 전기력선·등전위선 그림</b>을 읽어서 전기장의 방향과 세기를 알아내요. (그림을 그리는 방법은 다루지 않아요.)</div>' +
        '<p>전기력선은 (+)에서 나와 (−)로 들어가고, 접선 방향이 전기장 방향이며, 빽빽한 곳일수록 전기장이 세요. 점 A, B, C에서 전기장 방향을 가리켜 보고, 선의 모양으로 전하의 부호와 전하량 비를 추리해요.</p>',
      features: ['read'],
      setup() { S.gate = ''; resetRead(2); setScene('read'); },
      recap: '전기력선은 (+)에서 나와 (−)로 들어가고, 접선 방향이 전기장의 방향이에요. 선이 빽빽할수록 전기장이 세고, 선의 개수 비는 전하량 비와 같아요.',
      summary: '<ul><li><b>전기력선</b>은 (+)전하에서 나와 (−)전하로 들어가요. 한 점에서 선의 <b>접선 방향 = 전기장 방향</b>(+전하가 받는 힘의 방향)이에요.</li><li>선이 <b>빽빽한 곳일수록 전기장이 세요</b>. 전하량이 큰 전하에서는 더 많은 선이 나와요(선의 개수 비 = 전하량 비, 예 2 : 1).</li><li>전기력선은 서로 <b>교차하지 않아요</b>. 한 점에서 전기장 방향이 두 개일 수 없기 때문이에요.</li><li>전기력선은 전하가 실제로 움직이는 경로가 아니라, 각 점의 전기장 방향을 이은 선이에요.</li></ul>',
      missions: [
        {
          title: '점마다 방향 고르기',
          goal: '그림 ②(쌍극자)에서 점 A, B, C마다 <b>전기장 방향 화살표</b>를 그 점을 지나는 전기력선의 접선 방향으로 맞추세요.',
          hint: '점을 고른 뒤 그림을 눌러 방향을 가리켜요. 화살표가 초록색이 되면 맞은 거예요. 선 위 노란 점이 흐르는 방향이 전기장 방향이에요.',
          setup() { S.gate = ''; resetRead(2); setScene('read'); },
          check: () => allOK(2),
          hold: 0.8,
          status: () => ['A', 'B', 'C'].map((k) => mark(ptOK(2, k)) + ' 점 ' + k).join(' &nbsp; '),
          explain: '전기력선의 접선 방향이 전기장 방향이에요. 쌍극자에서 두 전하 가운데(A)는 (+)에서 (−)쪽으로, (+)전하 바깥(B)은 전하에서 멀어지는 쪽으로, (−)전하 가까이(C)는 (−)전하를 향하는 쪽으로 가리켜요.',
        },
        {
          title: '세기와 전하량 비 추리하기', manual: true,
          goal: '그림 ③을 보고 <b>두 전하의 부호</b>, <b>전하량 비</b>(선의 개수 비), 점 A, B, C의 <b>전기장 세기</b>를 답한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '선이 모두 바깥쪽으로 나가면 둘 다 (+)예요. 왼쪽에서 나오는 선과 오른쪽에서 나오는 선을 세어 비를 구하고, 점 주변 선이 빽빽한 정도를 비교해요.',
          setup() { S.gate = 'm2'; resetRead(3); resetSels(m2Sels, m2Store, m2Ok); setScene('read'); },
          check: () => checkSel(M2R, m2Store, m2Ok, m2Sels, '빨간 칸을 다시 골라 보세요. 선의 방향(화살표)과 선의 개수, 점 주변의 빽빽함을 살펴봐요.'),
          status: () => '고른 문제 ' + M2R.filter((r, i) => m2Store[i]).length + ' / ' + M2R.length,
          explain: '선이 모두 바깥으로 나가므로 두 전하는 <b>둘 다 (+)</b>예요. 왼쪽 전하에서 20개, 오른쪽 전하에서 10개의 선이 나오므로 전하량 비는 <b>2 : 1</b>이에요. 큰 전하에 가까운 점 A에서 선이 가장 빽빽해 <b>E가 가장 세고</b>, 두 전하에서 먼 점 C에서 가장 약해요.',
        },
        {
          type: 'quiz', title: '전기력선이 교차하지 않는 까닭',
          goal: '전기력선이 서로 <b>교차하지 않는</b> 까닭으로 알맞은 것은?',
          setup() { S.gate = ''; S.l1.reveal = true; setScene('read'); },
          choices: ['교차하는 점에서는 전기장의 방향이 두 개가 되기 때문이에요', '전하가 선을 따라 움직이다가 부딪히기 때문이에요', '전기력선은 질량 있는 입자가 지나간 자국이라 겹치면 안 돼요', '(+)전하에서 나온 선은 (−)전하에만 닿기 때문이에요'],
          answer: 0,
          feedback: ['', '전기력선은 전하가 실제로 움직이는 경로가 아니에요. 각 점의 전기장 방향을 나타내는 선이에요.', '선은 입자의 자국이 아니에요. 질량이 있는 전하는 곡선인 선을 그대로 따라가지 않을 수도 있어요.', '(+)에서 나온 선이 (−)가 없으면 멀리 뻗어 나가기도 해요. 교차하지 않는 까닭은 아니에요.'],
          explain: '한 점의 전기장은 하나의 방향만 가져요. 선이 교차하면 그 점에서 접선이 두 개가 되어 <b>전기장 방향이 두 개</b>가 되므로 교차할 수 없어요. 또 전기력선은 입자가 실제로 가는 길이 아니라 <b>전기장의 방향을 나타내는 선</b>이에요.',
        },
      ],
    },
    {
      title: '등전위면: 전위와 전기장', short: '등전위면', icon: '🎯', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전기력선으로 전기장의 방향과 세기를 읽었어요. 같은 그림에 <b>등전위선</b>(전위가 같은 점을 이은 선)을 겹쳐 보면 무엇을 더 알 수 있을까요?</div>' +
        '<p>+1.0 nC 점전하 둘레의 등전위선에는 전위 눈금이 적혀 있어요(V = kq/r 값을 읽기만 해요). 전기력선과 등전위선은 <b>직각</b>으로 만나고, 전기력선은 전위가 높은 쪽에서 낮은 쪽으로 향해요. 등전위선 간격이 좁은 곳에서 전기장이 세요. 🏭 피뢰침·전기 집진기는 이런 전위·전기장 분포를 이용해요.</p>',
      features: ['equi'],
      setup() { S.gate = ''; resetEqui(); resetSels(b2Sels, B2.st, B2.ok); num2.clear(); setScene('equi'); },
      recap: '등전위선은 전기력선과 직각이고, 전기력선은 전위가 높은 쪽에서 낮은 쪽으로 향해요. 등전위선 간격이 좁을수록 E = ΔV/d가 커요. 같은 등전위면 위에서 전하를 옮기면 전기력이 한 일은 0이에요.',
      summary: '<ul><li><b>등전위면(선)</b>: 전위가 같은 점들을 이은 면. 전기력선과 항상 <b>수직</b>이에요. 전기력선은 전위가 <b>높은 쪽에서 낮은 쪽</b>으로 향해요.</li><li>인접한 등전위면의 <b>간격이 좁을수록 E가 커요</b>: E ≈ ΔV/Δr. 예) +1.0 nC, 3·6·9·12 cm에서 V = 300·150·100·75 V → 구간별 E ≈ 5.0×10³, 1.7×10³, 8.3×10² V/m.</li><li>전하 q를 전위차 ΔV인 곳으로 옮길 때 전기력이 하는 일 <b>W = qΔV</b>. 예) 2.0 nC을 300 V → 75 V: 4.5×10⁻⁷ J.</li><li><b>같은 등전위면 위</b>에서 옮기면 W = 0이에요. 힘이 이동 방향에 수직이기 때문이에요.</li></ul>',
      missions: [
        {
          title: '두 점의 전위차 읽기',
          goal: '점 X를 <b>300 V</b> 등전위선 위에, 점 Y를 <b>75 V</b> 등전위선 위에 올려 놓고 <b>전위차</b>를 읽으세요.',
          hint: '점을 끌면 가까운 등전위선에 달라붙어요. 3 cm 선이 300 V, 12 cm 선이 75 V예요. 점 옆 라벨에 전위가 보여요.',
          setup() { S.gate = ''; resetEqui(); setScene('equi'); },
          check: () => Vof(S.l2.X) === 300 && Vof(S.l2.Y) === 75,
          hold: 0.8,
          status: () => mark(Vof(S.l2.X) === 300) + ' X = ' + Vof(S.l2.X) + ' V &nbsp; ' + mark(Vof(S.l2.Y) === 75) + ' Y = ' + Vof(S.l2.Y) + ' V &nbsp; (전위차 ' + (Vof(S.l2.X) - Vof(S.l2.Y)) + ' V)',
          explain: '3 cm 선은 V = (9.0 V·m)/(0.03 m) = <b>300 V</b>, 12 cm 선은 <b>75 V</b>이므로 전위차는 300 − 75 = <b>225 V</b>예요. 2.0 nC의 전하를 300 V에서 75 V로 옮기면 전기력이 하는 일은 W = qΔV = (2.0×10⁻⁹)(225) = <b>4.5×10⁻⁷ J</b>이에요.',
        },
        {
          title: '간격이 좁은 곳 찾기', manual: true,
          goal: '등전위선 간격이 <b>가장 좁은 구간</b>을 고르고, 그 구간의 전기장 <b>E ≈ ΔV/Δr</b>을 구해 입력한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '구간별 ΔV와 간격 Δr(= 0.03 m)이 화면에 적혀 있어요. 가장 안쪽 구간은 ΔV = 150 V예요. E = ΔV / Δr.',
          setup() { S.gate = 'm2b'; resetSels(b2Sels, B2.st, B2.ok); num2.clear(); setScene('equi'); },
          check: () => {
            if (!B2.st[0]) return '구간을 먼저 골라 주세요.';
            const ok = +B2.st[0] - 1 === 0; selMark(b2Sels[0], 0, ok, B2.ok);
            const r = checkNum(num2, 5.0e3, 0.04, 'E = ΔV/Δr = 150 V / 0.03 m 를 계산해 보세요. 10의 거듭제곱도 확인해요.');
            if (!ok) return '간격이 가장 좁은 구간을 다시 찾아 보세요. 그림에서 동심원 사이가 가장 촘촘한 곳이에요.';
            return r;
          },
          status: () => '구간 ' + mark(!!B2.st[0] && +B2.st[0] === 1) + ' &nbsp; E ' + mark(numOK(num2, 5.0e3, 0.04) === true),
          explain: '안쪽 구간(3~6 cm)의 간격이 가장 좁고(전위차 150 V가 3 cm에 몰려 있어요), E ≈ 150 / 0.03 = <b>5.0×10³ V/m</b>예요. 바깥으로 갈수록 같은 3 cm 간격이어도 전위차가 150 → 50 → 25 V로 줄어 E는 5.0×10³ → 1.7×10³ → 8.3×10² V/m로 약해져요.',
        },
        {
          type: 'quiz', title: '같은 등전위면 위에서의 이동',
          goal: '시험 전하를 <b>같은 등전위면 위</b>에서 옮길 때 전기력이 하는 일이 0인 까닭은? (⭕ 버튼으로 직접 확인해 보세요)',
          setup() { S.gate = ''; setScene('equi'); },
          choices: ['전기력이 이동 방향에 수직이라서 힘이 이동 방향으로 일을 하지 않기 때문이에요', '등전위면 위에서는 전기력이 0이기 때문이에요', '전하가 움직이면 전기장이 사라지기 때문이에요', '전위가 같으면 전하가 움직일 수 없기 때문이에요'],
          answer: 0,
          feedback: ['', '등전위면 위에도 전기장(전기력)은 있어요. 힘의 방향이 전기력선 방향(면에 수직)이에요.', '전하가 움직여도 전기장은 사라지지 않아요.', '등전위면 위에서도 다른 힘으로 얼마든지 움직일 수 있어요. 전위가 같다는 것은 W = qΔV = 0이라는 뜻이에요.'],
          explain: '등전위면은 전기력선과 수직이므로 전기력은 면에 수직이에요. 면을 따라 움직이는 방향과 힘이 수직이라 <b>일 = 0</b>이에요. 또 같은 면 위에서는 ΔV = 0이므로 W = qΔV = 0이에요.',
        },
      ],
    },
    {
      title: '균일한 장: 평행판', short: '균일한 장', icon: '🔋', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 등전위선 간격이 좁을수록 E가 크다는 것(E ≈ ΔV/Δr)을 배웠어요. 평행한 두 금속판 사이에서는 등전위선 간격이 일정해서 E가 어디서나 같아요.</div>' +
        '<p>판 사이 전압 V와 간격 d를 바꾸며 등전위선 간격을 읽고 <b>E = ΔV/d</b>(단위 V/m = N/C)를 확인해요. 전자와 양성자를 (−)판, (+)판에서 놓으면 둘 다 <b>F = qE</b>의 힘을 받고, 에너지는 <b>W = qEd = qΔV</b>만큼 변해요. 🏭 이 원리가 전자총·복사기·집진기의 가속과 편향에 쓰여요.</p>',
      features: ['plates'],
      setup() { S.gate = ''; const l = S.l3; l.V = 6; l.d = 4; l.seen = {}; plBack(); const g = plGeom(); l.probe.x = (PL.x0 + PL.x1) / 2; l.probe.y = (g.top + g.bot) / 2; num3.clear(); setScene('plates'); },
      recap: '평행판 사이의 전기장은 어디서나 같고 E = V/d(= ΔV/Δd)예요. 전하 q는 F = qE를 받고, 판 사이를 지나면 W = qEd = qΔV의 에너지 변화가 생겨요.',
      summary: '<ul><li>평행판 사이의 전기장은 <b>균일</b>해요(어디서나 같은 세기·방향). <b>E = ΔV/d</b> (단위 V/m = N/C). 예) 12 V, 6.0 cm → <b>200 V/m</b>.</li><li>판 간격만 절반으로 줄이면 E는 <b>2배</b>(400 V/m)예요. 등전위선 간격도 절반이 돼요.</li><li>전하 q는 <b>F = qE</b>의 힘을 받아요. 전자(−)와 양성자(+)는 크기가 같고 방향이 반대인 힘을 받아요.</li><li>이동 일 <b>W = qEd = qΔV</b>. 전자가 12 V를 가속되면 <b>12 eV</b>의 운동 에너지를 얻어요. 가속도는 질량에 반비례해서 전자가 양성자보다 약 1.8×10³배 커요.</li></ul>',
      missions: [
        {
          title: '판 사이의 E 재 보기',
          goal: '전압 <b>12 V</b>, 간격 <b>6.0 cm</b>로 맞추고, 십자(✚)를 판 사이 <b>위·가운데·아래</b>로 옮겨 가며 E를 확인하세요.',
          hint: 'V 슬라이더를 12 V, d 슬라이더를 6.0 cm로 맞춘 뒤 ✚를 끌어서 세 높이에 놓아 보세요. 등전위선 간격(1.0 cm)과 ΔV(2 V)로 E = ΔV/Δd도 구해 봐요.',
          setup() { S.gate = ''; const l = S.l3; l.V = 6; l.d = 4; l.seen = {}; plBack(); const g = plGeom(); l.probe.x = (PL.x0 + PL.x1) / 2; l.probe.y = (g.top + g.bot) / 2; setScene('plates'); },
          check: () => S.l3.V === 12 && S.l3.d === 6 && S.l3.seen.top && S.l3.seen.mid && S.l3.seen.bot,
          hold: 0.6,
          status: () => mark(S.l3.V === 12) + ' 12 V &nbsp; ' + mark(S.l3.d === 6) + ' 6.0 cm &nbsp; ' + mark(S.l3.seen.top) + ' 위 ' + mark(S.l3.seen.mid) + ' 가운데 ' + mark(S.l3.seen.bot) + ' 아래',
          explain: '12 V, 6.0 cm에서 인접 등전위선은 2 V 간격으로 1.0 cm마다 있어요. E = ΔV/Δd = 2 V / 0.010 m = <b>200 V/m</b>이고, 판 전체로 보아도 E = V/d = 12 / 0.060 = <b>200 V/m</b>예요. ✚를 어디에 놓아도 같은 값이라서 <b>균일한 전기장</b>이에요.',
        },
        {
          title: '간격을 절반으로 줄이면?', manual: true,
          goal: '전압 <b>12 V</b>는 그대로 두고 판 간격만 <b>절반</b>(6.0 cm → 3.0 cm)으로 줄이면 E는 얼마일까요? 계산해 입력하세요.',
          hint: 'E = V/d = 12 V / 0.030 m. 간격이 절반이면 같은 전압이 절반의 거리에 걸리므로 E는 몇 배가 될까요?',
          setup() { S.gate = 'num3'; const l = S.l3; l.V = 12; l.d = 6; plBack(); num3.clear(); setScene('plates'); },
          check: () => checkNum(num3, 400, 0.03, '다시 계산해 보세요. E = V/d = 12 V ÷ 0.030 m 이에요. 단위는 m로 바꿔요(3.0 cm = 0.030 m).'),
          status: () => '12 V, d: 6.0 cm → 3.0 cm &nbsp; (E 값은 숨겨 두었어요)',
          explain: 'E = V/d = 12 V / 0.030 m = <b>400 V/m</b>예요. 전압이 같을 때 E는 간격 d에 반비례하므로 d가 절반이면 E는 2배(200 → 400 V/m)가 돼요.',
        },
        {
          type: 'quiz', title: '양성자와 전자를 놓으면?',
          goal: '같은 전기장 속에서 <b>양성자</b>와 <b>전자</b>가 받는 힘과 가속도를 비교한 것으로 옳은 것은? (▶ 놓기로 확인해 보세요)',
          setup() { S.gate = ''; const l = S.l3; l.V = 12; l.d = 6; plBack(); setScene('plates'); },
          choices: ['힘의 크기는 같고 방향은 반대이며, 전자의 가속도가 훨씬 커요', '양성자가 질량이 커서 힘도 더 크게 받아서 가속도가 더 커요', '힘의 방향이 같고 가속도도 같아요', '전자는 (−)전하라서 전기장에서 힘을 받지 않아요'],
          answer: 0,
          feedback: ['', '힘 F = qE는 전하량에 비례해요. 질량은 가속도(a = F/m)에 영향을 줘요. 크기가 같은 힘을 받아도 질량이 큰 쪽의 가속도가 작아요.', '전자와 양성자의 전하 부호가 반대라서 힘의 방향도 반대예요. 화면의 두 화살표(F)를 보세요.', '(−)전하도 F = qE의 힘을 받아요. 방향이 (+)전하와 반대일 뿐이에요.'],
          explain: '전자와 양성자의 전하량 크기가 같으므로 <b>F = eE의 크기가 같고</b>, 부호가 반대라 <b>방향은 반대</b>예요. 그런데 가속도 a = F/m이므로 질량이 약 1.8×10³배 작은 <b>전자의 가속도가 훨씬 커요</b>. 전자가 (+)판에 닿을 때 양성자는 거의 움직이지 못해요.',
        },
      ],
    },
    {
      title: '그림 해석: 처음 보는 그림', short: '그림 해석', icon: '🔍', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 전기력선(방향·세기), 등전위선(전위·간격), 균일한 장(E = ΔV/d)을 배웠어요. 이제 <b>처음 보는 그림 3장</b>에서 정보를 읽어 내요.</div>' +
        '<p>그림 가(쌍극자와 등전위선), 그림 나(같은 부호의 두 전하), 그림 다(도체의 뾰족한 끝)에서 전하의 부호, 전기장이 센 곳, 전위가 높은 곳, 시험 전하를 옮길 때 전기력이 하는 일을 답해요. 🏭 피뢰침의 끝이 뾰족한 까닭도 알아봐요.</p>',
      features: ['fig'],
      setup() { S.gate = ''; S.l4.fig = 'a'; reset4(); setScene('fig'); updateCtl(); },
      recap: '전기력선의 방향과 빽빽함, 등전위선의 눈금으로 전하의 부호, 전기장의 세기, 전위의 높낮이를 알 수 있어요. 도체 표면은 등전위면이고, 뾰족한 끝에서 전기장이 가장 세요.',
      summary: '<ul><li>그림에서 읽기: 선의 <b>방향</b> → 전하의 부호, 선의 <b>빽빽함</b> → E의 크기, 등전위선의 <b>눈금</b> → 전위의 높낮이, 선이 없는 곳(밀려난 곳) → E = 0인 점.</li><li>같은 부호의 두 전하 사이에는 E = 0인 점이 있어요. 같은 등전위선 위의 두 점 사이에서 전기력이 하는 일은 <b>0</b>이에요.</li><li><b>도체 표면은 등전위면</b>이에요. 표면에 전위차가 있으면 전하가 계속 움직이기 때문에 정전기 평형이 될 수 없어요. 전기력선은 표면에 <b>수직</b>이에요.</li><li>도체의 <b>뾰족한 끝에서 전기력선이 빽빽</b>해 전기장이 가장 세요. 그래서 <b>피뢰침</b>은 끝을 뾰족하게 해서 방전을 유도해요.</li></ul>',
      missions: [
        {
          title: '그림별 문제 풀기', manual: true,
          goal: '그림 가·나·다를 차례로 보고 각 3문제(모두 9문제)에 답한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '그림 가: 화살표가 나가는 쪽이 (+)이고, 등전위선 눈금(V)을 비교해요. 그림 나: 선이 밀려난 곳이 E = 0이고, 같은 등전위선 위의 점은 전위가 같아요. 그림 다: 선이 가장 빽빽한 곳을 찾아요.',
          setup() { S.gate = ''; S.l4.fig = 'a'; setScene('fig'); updateCtl(); },
          check: check4,
          status: () => ['a', 'b', 'c'].map((k) => A4[k].name + ' ' + Object.keys(S.l4.ans[k]).filter((i) => S.l4.ans[k][i]).length + '/3').join(' &nbsp; '),
          explain: '그림 가: 선이 오른쪽 전하에서 나가므로 오른쪽이 (+), 왼쪽이 (−)이고, (−)전하에 가까운 점 A에서 선이 가장 빽빽해요. 전위는 (+)에 가까운 점 C가 가장 높아요. 그림 나: 선이 서로 밀어내는 가운데 점 A가 E = 0이고, 점 B와 C는 같은 등전위선 위라서 전기력이 한 일은 0이에요. 그림 다: 뾰족한 끝 A에서 E가 가장 세고, 표면 위 두 점의 전위차는 0이며 전기력선은 표면에 수직이에요.',
        },
        {
          type: 'quiz', title: '피뢰침 끝이 뾰족한 까닭',
          goal: '피뢰침의 끝이 <b>뾰족한</b> 까닭으로 알맞은 것은?',
          setup() { S.gate = ''; S.l4.fig = 'c'; setScene('fig'); updateCtl(); },
          choices: ['뾰족한 끝에서 전기력선이 빽빽해 전기장이 가장 세기 때문에, 번개(방전)가 끝으로 유도되어 안전하게 땅으로 흘러가요', '뾰족한 끝에는 전하가 모이지 않아서 번개가 피해 가요', '도체 표면이 등전위면이 아니게 되기 때문이에요', '끝이 뾰족하면 전기장이 약해져 방전이 일어나지 않아요'],
          answer: 0,
          feedback: ['', '뾰족한 끝에 전하가 오히려 더 많이 모여요(전기력선이 빽빽한 곳). 그래서 전기장이 가장 세요.', '정전기 평형에서 도체 표면은 모양과 상관없이 항상 등전위면이에요.', '뾰족한 끝에서는 전기장이 가장 강해서 방전이 가장 먼저 일어나요. 그림 다에서 선이 빽빽했던 곳을 떠올려 보세요.'],
          explain: '도체 표면은 등전위면이지만 뾰족한 끝에서는 전기력선이 빽빽해 <b>전기장이 가장 세요</b>. 그래서 방전(번개)이 피뢰침 끝으로 유도되고, 접지선을 따라 안전하게 땅으로 흘러가요. 도체 표면이 등전위면이어야 하는 까닭은 표면에 전위차가 있으면 표면의 전하가 계속 움직여 정전기 평형이 깨지기 때문이에요.',
        },
      ],
    },
  ];
  levels.forEach((lv) => lv.missions.forEach((m) => { MS[m.title] = m; }));

  game = SciSim.game({
    simId: 'hq-field-lines', mount: '#game', badge: '장 읽기 전문가', homeHref: '../../index.html#hq',
    featureLabels: { read: '🗺️ 전기력선 그림 · 방향 화살표', equi: '🎯 등전위선 · 전위 눈금 · 시험 전하', plates: '🔋 평행판 · 전자와 양성자', fig: '🔍 처음 보는 그림 3장' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetEqui(); resetRead(2);
  { const l = S.l3, g = plGeom(); l.probe.x = (PL.x0 + PL.x1) / 2; l.probe.y = (g.top + g.bot) / 2; }
  updateCtl();
  function stepAll1(dt) { if (S.mode === 'plates') stepPlates(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    // 전하의 부호는 '세기와 전하량 비' 미션을 마치면 보여 줘요
    if (game && game.phase !== 'active' && game.current() === MS['세기와 전하량 비 추리하기']) S.l1.reveal = true;
    view.apply();
    stepAll1(dt);
    if (S.mode === 'read') drawRead(); else if (S.mode === 'equi') drawEqui(); else if (S.mode === 'plates') drawPlates(); else drawFigs();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, FR, E2, PL, FIG1, A4, QS, M2R, B2, num2, num3, m2Sels, b2Sels, q4Sels, RADS, MS,
    get game() { return game; }, setScene, Vof, plGeom, plGo, plBack, tcGo, tPhys, Eof3, ptOK, allOK, strongest, polar, check4, updateCtl,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };
})();
