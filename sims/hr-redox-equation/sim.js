/* 화학 반응의 세계 Ⅱ. 산화⋅환원 반응 - 산화·환원 반응식 완성 [12반응02-01]
   ① 분석: 반쪽 나누기 (Zn + Cu²⁺, Cu + Ag⁺)  ② 탐구: 전자 맞추기 (곱하기, 전자 저울)
   ③ 설명: 산성 용액 (H₂O → H⁺ → e⁻ 사다리)  ④ 적용: 완성하기 (문제 4개, 원자 · 전하 검사기)
   염기성 용액에서 OH⁻로 맞추는 방법, 불균등화, 구경꾼 이온을 넣은 분자식 완성은 다루지 않아요. */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 760 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#8b5cf6', BG = '#f3f0fb';
  const RED = '#ef4444', BLUE = '#2563eb', GRAYC = '#94a3b8', GOODC = '#14a058', WARN = '#b45309';
  const MINUS = '−';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(str).split('\n').forEach((ln, li) => {
      if (li) { out.push(line.trimEnd()); line = ''; }
      const toks = ln.match(/[가-힣][^\s가-힣]*|\s+|[^\s가-힣]+/g) || [];
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
  function textW(str, size, weight) { ctx.save(); ctx.font = D.font(size, weight || 700); const w = ctx.measureText(str).width; ctx.restore(); return w; }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const parseNum = (s) => { const t = String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.').replace(/[−–]/g, '-').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const ap = SciSim.approach;
  const SPL = SciSim.ease;
  const pointInRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const r1 = (x) => Math.round(x * 10 + 1e-9) / 10;
  const oxs = (n) => (n > 0 ? '+' + n : n < 0 ? MINUS + (-n) : '0');
  const SUBD = '₀₁₂₃₄₅₆₇₈₉';
  const subs = (n) => String(n).split('').map((c) => SUBD[+c]).join('');
  const MAIN = PHONE ? { x: 8, y: 52, w: 464, h: 424 } : { x: 12, y: 52, w: 776, h: 342 };
  const INFO = PHONE ? { x: 8, y: 484, w: 464, h: 270 } : { x: 12, y: 402, w: 776, h: 148 };

  /* ---------- 상태 (공통) ---------- */
  const S = { mode: '', sub: {}, gate: '', fade: 0, t: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function setRead(L1, a, L2, b, L3, c) {
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); if (typeof onLeave === 'function') onLeave(S.mode); }
    S.mode = mode;
    const tb = $('#tbLabel'); if (tb && typeof MODE_LABEL !== 'undefined') tb.textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = n.getAttribute('data-gate').split(' ').indexOf(S.gate) >= 0;
      if (on && n.hasAttribute('data-sub')) on = S.sub[S.mode] === n.getAttribute('data-sub');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (typeof uiExtra === 'function') uiExtra();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  function makeChips(box, items, onPick) {
    box.innerHTML = '';
    items.forEach(([v, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = label; b.addEventListener('click', () => { Sound.click(); onPick(v); }); box.appendChild(b); });
  }
  function markChips(box, cur, doneMap) { $$('button', box).forEach((b) => { b.classList.toggle('on', b.dataset.v === String(cur)); b.classList.toggle('done', !!(doneMap && doneMap[b.dataset.v])); }); }
  function flash(x, y, colors) { parts.burst(x, y, { count: 16, speed: 150, size: 3.2, colors: colors || ['#ffb400', '#14a058', '#8b5cf6'] }); }

  /* ---------- 공통 그림 도구 ---------- */
  const ELC = { H: '#f8fafc', C: '#475569', N: '#3b82f6', O: '#ef4444', Cl: '#16a34a', Na: '#a78bfa', K: '#c084fc', S: '#facc15', Mn: '#a855f7', Cr: '#14b8a6', Fe: '#b45309', Cu: '#d97706', Ag: '#cbd5e1', Zn: '#94a3b8', Ca: '#84cc16', I: '#7c3aed', Mg: '#86efac', Pb: '#64748b', Li: '#f472b6', Co: '#2563eb' };
  function atomBall(x, y, r, el, o) {
    o = o || {};
    const c = ELC[el] || '#94a3b8', dark = el === 'H' || el === 'Ag' || el === 'S' || el === 'Mg';
    D.sphere(x, y, r, c, { text: o.text === undefined ? el : o.text, textColor: dark ? '#334155' : '#fff', textScale: o.ts || (el.length > 1 ? 0.95 : 1.1), outline: dark ? '#94a3b8' : null, outlineWidth: 1.2, gloss: r > 8, shadow: !!o.shadow });
  }
  function eBall(x, y, r) { D.sphere(x, y, r, '#fbbf24', { text: 'e⁻', textColor: '#6b3f00', textScale: 0.95, outline: '#b7791f', outlineWidth: 1, gloss: r > 7 }); }
  function pill(x, y, text, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); const s = o.scale == null ? 1 : o.scale; ctx.scale(s, s); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const rc = D.label(0, 0, text, { bg: o.bg || '#fff', color: o.color || INK, size: o.size || 14, border: o.border === undefined ? 'rgba(38,50,74,.35)' : o.border, pad: o.pad });
    ctx.restore(); return rc;
  }
  /* 눈금 있는 비커 (유리) : 안쪽 기하를 돌려줌 */
  function beaker(x, y, w, h, o) {
    o = o || {};
    const ix = x + 5, iw = w - 10, iy = y + 5, ih = h - 11;
    const level = clamp(o.level == null ? 0 : o.level, 0, 1), ly = iy + ih * (1 - level);
    const rad = Math.min(14, w * 0.15);
    const path = (px, py, pw, ph, r) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph - r); ctx.quadraticCurveTo(px, py + ph, px + r, py + ph); ctx.lineTo(px + pw - r, py + ph); ctx.quadraticCurveTo(px + pw, py + ph, px + pw, py + ph - r); ctx.lineTo(px + pw, py); };
    D.shadow(() => { path(x, y, w, h, rad); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fillStyle = 'rgba(235,244,255,.75)'; ctx.fill(); }, { blur: 9, y: 4 });
    if (level > 0.002) {
      ctx.save(); path(ix, iy, iw, ih, Math.max(4, rad - 4)); ctx.closePath(); ctx.clip();
      const g = ctx.createLinearGradient(0, ly, 0, iy + ih);
      const c = o.color || '#9bc8ff'; g.addColorStop(0, C.rgba(c, o.alpha != null ? o.alpha : 0.62)); g.addColorStop(1, C.rgba(C.shade(c, -0.18), Math.min(0.95, (o.alpha != null ? o.alpha : 0.62) + 0.18)));
      ctx.fillStyle = g; ctx.fillRect(ix, ly, iw, iy + ih - ly);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(ix, ly, iw, 2.5);
      if (o.inside) o.inside({ x, y, w, h, ix, iw, iy, ih, ly, bottom: iy + ih });
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(70,100,140,.7)'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; path(x, y, w, h, rad); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 9, y + 12); ctx.lineTo(x + 9, y + h - rad - 8); ctx.stroke();
    return { x, y, w, h, ix, iw, iy, ih, ly, bottom: iy + ih, level };
  }
  const r2 = (i) => [((i + 1) * 0.7548776662466927) % 1, ((i + 1) * 0.5698402909980532) % 1];
  /* 액체 안에 갇힌 입자 : 정규화 좌표(u, v)를 현재 액체 영역에 펼쳐 놓아요 (영역 밖으로 나가지 않음) */
  function ballPos(g, i, r, wob, t) {
    const pad = r + 3, q = r2(i);
    const x0 = g.ix + pad, x1 = g.ix + g.iw - pad, y0 = g.ly + pad, y1 = g.bottom - pad;
    const px = x1 > x0 ? x0 + q[0] * (x1 - x0) : (g.ix + g.iw / 2), py = y1 > y0 ? y0 + q[1] * (y1 - y0) : (g.ly + g.bottom) / 2;
    const k = RM ? 0 : (wob == null ? 1.6 : wob);
    const mx = Math.min(k, Math.max(0, (x1 - x0) / 2)), my = Math.min(k, Math.max(0, (y1 - y0) / 2));
    return [px + Math.sin(t * 1.3 + i * 1.9) * mx * (px > x0 && px < x1 ? 1 : 0), py + Math.cos(t * 1.1 + i * 2.3) * my * (py > y0 && py < y1 ? 1 : 0)];
  }
  function hexAdd(c1, c2, t) { return C.mix(c1, c2, clamp(t, 0, 1)); }
  /* 숫자 입력칸 도우미 */
  function bindNum(inp, onSet) {
    inp.addEventListener('input', () => onSet(parseNum(inp.value), false));
    inp.addEventListener('change', () => onSet(parseNum(inp.value), true));
  }
  const MODE_LABEL_FALLBACK = {};

  const MODE_LABEL = { split: '✂️ 반쪽 나누기', balance: '⚖️ 전자 맞추기', acid: '🪜 산성 용액', complete: '✅ 반응식 완성' };
  const OXC = '#dc2626', REDC = '#2563eb', GOODC2 = '#14a058';
  const fz = (n) => (PHONE ? n - 2 : n);

  /* ---------- 화학종 ---------- */
  const SP = {
    Zn: { f: 'Zn', q: 0, a: { Zn: 1 } }, Zn2: { f: 'Zn²⁺', q: 2, a: { Zn: 1 } },
    Cu: { f: 'Cu', q: 0, a: { Cu: 1 } }, Cu2: { f: 'Cu²⁺', q: 2, a: { Cu: 1 } },
    Ag: { f: 'Ag', q: 0, a: { Ag: 1 } }, Agp: { f: 'Ag⁺', q: 1, a: { Ag: 1 } },
    e: { f: 'e⁻', q: -1, a: {}, e: true },
    H: { f: 'H⁺', q: 1, a: { H: 1 } }, H2O: { f: 'H₂O', q: 0, a: { H: 2, O: 1 } },
    MnO4: { f: 'MnO₄⁻', q: -1, a: { Mn: 1, O: 4 } }, Mn2: { f: 'Mn²⁺', q: 2, a: { Mn: 1 } },
    Fe2: { f: 'Fe²⁺', q: 2, a: { Fe: 1 } }, Fe3: { f: 'Fe³⁺', q: 3, a: { Fe: 1 } },
    NO3: { f: 'NO₃⁻', q: -1, a: { N: 1, O: 3 } }, NO: { f: 'NO', q: 0, a: { N: 1, O: 1 } },
    Cr2O7: { f: 'Cr₂O₇²⁻', q: -2, a: { Cr: 2, O: 7 } }, Cr3: { f: 'Cr³⁺', q: 3, a: { Cr: 1 } },
    EtOH: { f: 'CH₃CH₂OH', q: 0, a: { C: 2, H: 6, O: 1 } }, AcH: { f: 'CH₃CHO', q: 0, a: { C: 2, H: 4, O: 1 } },
  };
  const ELORDER = ['C', 'H', 'O', 'N', 'Mn', 'Cr', 'Fe', 'Cu', 'Zn', 'Ag'];
  const sideTot = (terms) => { const a = {}; let q = 0; terms.forEach((t) => { const s = SP[t.key]; Object.keys(s.a).forEach((el) => { a[el] = (a[el] || 0) + s.a[el] * t.n; }); q += s.q * t.n; }); return { a, q }; };
  function tallies(Lt, Rt) {
    const l = sideTot(Lt), r = sideTot(Rt);
    const rows = ELORDER.filter((el) => (l.a[el] || 0) || (r.a[el] || 0)).map((el) => ({ k: el, l: l.a[el] || 0, r: r.a[el] || 0 }));
    rows.push({ k: '전하', l: l.q, r: r.q, ch: true });
    return { rows, ok: rows.every((x) => x.l === x.r) };
  }
  const qs = (q) => (q === 0 ? '0' : q > 0 ? '+' + q : MINUS + (-q));
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const T0 = (key, n) => ({ key, n, id: key });

  /* ---------- 팝(복제) 효과 기록 ---------- */
  const popMap = {}, prevN = {};
  function popTick(dt) { Object.keys(popMap).forEach((k) => { popMap[k] = Math.max(0, popMap[k] - dt * 2.6); }); }

  /* ---------- 식 그리기 ---------- */
  const ETILE = { fill: '#fef3c7', border: '#f59e0b' };
  function termDims(t, fs) {
    const s = SP[t.key], cw = t.n > 1 ? textW(String(t.n), fs, 900) + 7 : 0;
    const w = s.e ? fs * 1.35 : textW(s.f, fs, 800) + fs * 0.9;
    return { cw, w, h: fs * 1.8 };
  }
  /* L, R : [{key, n, id}] (n 0 은 그리지 않음).  반환: 각 항의 위치 */
  function drawEq(L, R, cx, cy, fs, maxW, o) {
    o = o || {};
    L = L.filter((t) => t.n > 0); R = R.filter((t) => t.n > 0);
    const opW = fs * 1.2, arW = fs * 2.2;
    const sideW = (side, f) => side.reduce((tot, t, i) => { const d = termDims(t, f); return tot + d.cw + d.w + (i < side.length - 1 ? opW * f / fs : 0); }, 0);
    const oneRow = (f) => sideW(L, f) + sideW(R, f) + arW * f / fs;
    let f = fs, stacked = false;
    if (oneRow(f) > maxW) {
      if (o.stack && oneRow(Math.max(15.5, fs * 0.85)) > maxW) { stacked = true; f = Math.min(fs, Math.max(13, maxW / Math.max(sideW(L, fs), sideW(R, fs)) * fs)); }
      else f = Math.max(12, fs * maxW / oneRow(fs));
    }
    const op = opW * f / fs, ar = arW * f / fs, rowGap = f * 2.9;
    const pos = {}; let lx0 = 0, lx1 = 0, rx0 = 0, rx1 = 0, arx = cx;
    const drawTerm = (t, side, x, y) => {
      const s = SP[t.key], d = termDims(t, f), pk = (o.pk || 'q') + ':' + side + t.id;
      if (prevN[pk] !== undefined && prevN[pk] !== t.n) popMap[pk] = 1;
      prevN[pk] = t.n;
      const pop = popMap[pk] || 0, sc = 1 + 0.2 * pop, w = d.cw + d.w;
      const mx = x + w / 2, al = o.alpha && o.alpha[t.id] != null ? o.alpha[t.id] : 1;
      ctx.save(); ctx.translate(mx, y); ctx.scale(sc, sc); ctx.globalAlpha = al;
      if (d.cw) T(-w / 2 + d.cw / 2 - 1, f * 0.36, String(t.n), f, '#7c3aed', 'center', 900);
      const tx = -w / 2 + d.cw + d.w / 2;
      const hl = o.hl && o.hl[t.id];
      if (s.e) {
        D.sphere(tx, 0, f * 0.62, '#fbbf24', { text: 'e⁻', textColor: '#6b3f00', textScale: 0.95, outline: hl || '#b7791f', outlineWidth: hl ? 2.6 : 1, gloss: f > 14 });
      } else {
        D.shadow(() => { D.roundRect(tx - d.w / 2, -d.h / 2, d.w, d.h, 10); ctx.fillStyle = hl ? C.mix('#ffffff', hl, 0.12) : '#ffffff'; ctx.fill(); }, { blur: 5, y: 2 });
        D.roundRect(tx - d.w / 2, -d.h / 2, d.w, d.h, 10); ctx.strokeStyle = hl || '#94a3b8'; ctx.lineWidth = hl ? 2.8 : 1.6; ctx.stroke();
        T(tx, f * 0.36, s.f, f, INK, 'center', 800);
      }
      ctx.restore();
      pos[t.id + side] = { x, w, cx: mx, tx: x + d.cw + d.w / 2, h: d.h };
      if (o.balls) { const nb = Math.min(t.n, 8), r = Math.max(4, f * 0.26); for (let q = 0; q < nb; q++) { const bx = mx - (nb - 1) * (r + 1.5) + q * (r * 2 + 3), by = y + d.h / 2 + r + 5; const col = s.e ? '#fbbf24' : (ELC[Object.keys(s.a)[0]] || '#94a3b8'); ctx.save(); ctx.globalAlpha = al; D.sphere(bx, by, r, col, { gloss: false, outline: s.e ? '#b7791f' : '#64748b', outlineWidth: 0.8 }); ctx.restore(); } }
      return w;
    };
    const drawSide = (side, tag, x0, y) => { let x = x0; side.forEach((t, i) => { x += drawTerm(t, tag, x, y); if (i < side.length - 1) { T(x + op / 2, y + f * 0.36, '+', f * 0.95, '#94a3b8', 'center', 800); x += op; } }); return x; };
    if (!stacked) {
      const total = oneRow(f); let x = cx - total / 2;
      lx0 = x; x = drawSide(L, 'L', x, cy); lx1 = x;
      arx = x + ar / 2; D.arrow(x + ar * 0.15, cy, x + ar * 0.85, cy, { color: '#64748b', width: 3, head: 10 });
      x += ar; rx0 = x; x = drawSide(R, 'R', x, cy); rx1 = x;
      return { pos, lx0, lx1, rx0, rx1, arx, f, y: cy, h: f * 1.8, bottom: cy + f * 0.9 };
    }
    const wl = sideW(L, f), wr = sideW(R, f);
    lx0 = cx - wl / 2; drawSide(L, 'L', lx0, cy); lx1 = lx0 + wl;
    rx0 = cx - wr / 2; drawSide(R, 'R', rx0, cy + rowGap); rx1 = rx0 + wr;
    D.arrow(cx, cy + f * 1.05, cx, cy + rowGap - f * 1.05, { color: '#64748b', width: 3, head: 9 });
    return { pos, lx0, lx1, rx0, rx1, arx: cx, f, y: cy, h: f * 1.8, bottom: cy + rowGap + f * 0.9, stacked: true };
  }
  function chargeBadges(lay, L, R, y, o) {
    o = o || {};
    const l = sideTot(L.filter((t) => t.n > 0)), r = sideTot(R.filter((t) => t.n > 0)), ok = l.q === r.q;
    const lc = (lay.lx0 + lay.lx1) / 2, rc = (lay.rx0 + lay.rx1) / 2;
    pill(lc, y, '전하 ' + qs(l.q), { bg: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#166534' : '#b91c1c', border: ok ? '#4ade80' : '#f87171', size: 13.5 });
    pill(rc, y, '전하 ' + qs(r.q), { bg: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#166534' : '#b91c1c', border: ok ? '#4ade80' : '#f87171', size: 13.5 });
    T(lay.arx, y + 5, ok ? '=' : '≠', 20, ok ? GOODC2 : '#dc2626', 'center', 900);
    return ok;
  }
  /* 원자 수 · 전하 검사기 */
  function drawCounters(x, y, w, h, L, R, title, o) {
    o = o || {};
    const t = tallies(L.filter((q) => q.n > 0), R.filter((q) => q.n > 0));
    T(x, y + 4, title || '원자 수 · 전하 검사기', 14.5, WARN, 'left', 800);
    const cols = o.cols || (PHONE ? 3 : 6), cw = (w + 8) / cols, ch = 42;
    t.rows.forEach((r, i) => {
      const c = i % cols, rw = Math.floor(i / cols), bx = x + c * cw, by = y + 16 + rw * (ch + 6), ok = r.l === r.r;
      D.roundRect(bx, by, cw - 8, ch, 10); ctx.fillStyle = ok ? '#ecfdf5' : '#fef2f2'; ctx.fill(); ctx.strokeStyle = ok ? '#6ee7b7' : '#fca5a5'; ctx.lineWidth = 1.6; ctx.stroke();
      T(bx + 9, by + 17, r.k, 13.5, MUTED, 'left', 800);
      T(bx + 9, by + 35, (r.ch ? qs(r.l) : r.l) + '  |  ' + (r.ch ? qs(r.r) : r.r), 14.5, ok ? '#166534' : '#b91c1c', 'left', 800);
      T(bx + cw - 18, by + 26, ok ? '✓' : '✗', 17, ok ? GOODC2 : '#dc2626', 'right', 900);
    });
    return t.ok;
  }
  /* 전자 저울 */
  function eScale(cx, cy, hl, giveN, takeN, lab1, lab2, t) {
    const mx = Math.max(giveN, takeN, 1), ang = clamp((giveN - takeN) / mx, -1, 1) * 0.2;
    const base = PHONE ? 66 : 76;
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(cx, cy + 4); ctx.lineTo(cx - 13, cy + base); ctx.lineTo(cx + 13, cy + base); ctx.closePath(); ctx.fill(); ctx.fillRect(cx - 32, cy + base, 64, 6);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-ang); ctx.strokeStyle = '#475569'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-hl, 0); ctx.lineTo(hl, 0); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, TAU); ctx.fill();
    const ends = [{ x: cx - Math.cos(ang) * hl, y: cy + Math.sin(ang) * hl, n: giveN, col: OXC, lab: lab1 }, { x: cx + Math.cos(ang) * hl, y: cy - Math.sin(ang) * hl, n: takeN, col: REDC, lab: lab2 }];
    ends.forEach((e) => {
      const py = e.y + 24;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - 32, py); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + 32, py); ctx.stroke();
      D.roundRect(e.x - 36, py, 72, 7, 3); ctx.fillStyle = '#64748b'; ctx.fill();
      const sh = Math.min(e.n, 8);
      for (let q = 0; q < sh; q++) { const col = q % 4, row = Math.floor(q / 4); eBall(e.x - 24 + col * 16, py - 8 - row * 15, 6.8); }
      if (e.n > 8) T(e.x + 40, py - 4, '+' + (e.n - 8), 13, MUTED, 'left', 800);
      T(e.x, py + 27, e.n + '개', 15, e.col, 'center', 800);
    });
    T(cx - hl, cy - 36, lab1, 13, OXC, 'center', 800); T(cx + hl, cy - 36, lab2, 13, REDC, 'center', 800);
    return Math.abs(giveN - takeN) < 1e-9;
  }

  /* ---------- 숫자 증감 칸 ---------- */
  function mkStep(host, label, min, max, get, set, o) {
    o = o || {};
    const cell = document.createElement('div'); cell.className = o.row ? 'stp-row' : 'stp-cell';
    const lab = document.createElement('span'); lab.className = 'lab'; lab.innerHTML = label;
    const stp = document.createElement('div'); stp.className = 'stp';
    const mk = (txt, d, al) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'nudge'; b.textContent = txt; b.setAttribute('aria-label', al); b.addEventListener('click', () => { const v = clamp(get() + d, min, max); if (v !== get()) { Sound.tick(); set(v); } }); return b; };
    const minus = mk('−', -1, '줄이기'), plus = mk('+', 1, '늘리기'), out = document.createElement('output');
    stp.append(minus, out, plus); cell.append(lab, stp); host.appendChild(cell);
    const r = { cell, out, minus, plus, refresh() { out.textContent = String(get()); minus.disabled = r.off || get() <= min; plus.disabled = r.off || get() >= max; }, off: false };
    r.refresh(); return r;
  }

  /* ============ ① 반쪽 나누기 ============ */
  const RXS = [
    { name: 'Zn + Cu²⁺', L: ['Zn', 'Cu2'], R: ['Zn2', 'Cu'], halves: [{ kind: 'ox', L: 'Zn', R: 'Zn2', side: 'R', n: 2 }, { kind: 'red', L: 'Cu2', R: 'Cu', side: 'L', n: 2 }] },
    { name: 'Cu + Ag⁺', L: ['Cu', 'Agp'], R: ['Cu2', 'Ag'], halves: [{ kind: 'ox', L: 'Cu', R: 'Cu2', side: 'R', n: 2 }, { kind: 'red', L: 'Agp', R: 'Ag', side: 'L', n: 1 }] },
  ];
  Object.assign(S, {
    mode: 'split', sub: {},
    sp: { k: 0, sk: [0, 0], split: [false, false], h: [[{ side: '', n: 0 }, { side: '', n: 0 }], [{ side: '', n: 0 }, { side: '', n: 0 }]], pulse: [[0, 0], [0, 0]] },
    bl: { m1: 1, m2: 1, coef: [1, 1, 1, 1], bal: false, K: 0, shake: 0 },
    ac: { ex: 'mn', v: { mn: { rM: 1, w: 0, h: 0, e: 0, chk: NaN }, cr: { rM: 1, w: 0, h: 0, e: 0, chk: NaN } }, rx: 0, pulse: 0, done: {} },
    cp: { k: 0, coef: [], e: [], rx: 0, done: [false, false, false, false] },
  });
  const halfTerms = (k, i) => {
    const h = RXS[k].halves[i], st = S.sp.h[k][i];
    const L = [T0(h.L, 1)], R = [T0(h.R, 1)];
    if (st.side === 'L' && st.n > 0) L.push(T0('e', st.n)); if (st.side === 'R' && st.n > 0) R.push(T0('e', st.n));
    return { L, R };
  };
  const halfOk = (k, i) => { const { L, R } = halfTerms(k, i), st = S.sp.h[k][i]; return st.n > 0 && sideTot(L).q === sideTot(R).q; };
  const halfRight = (k, i) => { const st = S.sp.h[k][i], h = RXS[k].halves[i]; return st.side === h.side && st.n === h.n; };
  const spDone = (k) => halfRight(k, 0) && halfRight(k, 1);
  const spCount = () => [0, 1].reduce((s, k) => s + (halfRight(k, 0) ? 1 : 0) + (halfRight(k, 1) ? 1 : 0), 0);
  function spSel(k) { S.sp.k = k; updateCtl(); }
  function spSplit() { const sp = S.sp; if (sp.split[sp.k]) return; sp.split[sp.k] = true; Sound.click(); updateCtl(); }
  function spReset() { const sp = S.sp; sp.split = [false, false]; sp.sk = [0, 0]; sp.h = [[{ side: '', n: 0 }, { side: '', n: 0 }], [{ side: '', n: 0 }, { side: '', n: 0 }]]; updateCtl(); }
  function spSet(i, side, n) { const st = S.sp.h[S.sp.k][i]; if (side != null) st.side = side; if (n != null) st.n = n; updateCtl(); }
  function stepSplit(dt) {
    const sp = S.sp;
    for (let k = 0; k < 2; k++) {
      sp.sk[k] = ap(sp.sk[k], sp.split[k] ? 1 : 0, dt, 5); if (Math.abs(sp.sk[k] - (sp.split[k] ? 1 : 0)) < 0.003) sp.sk[k] = sp.split[k] ? 1 : 0;
      for (let i = 0; i < 2; i++) { const ok = sp.split[k] && halfRight(k, i); if (ok && sp.pulse[k][i] === 0) { sp.pulse[k][i] = 1; if (S.mode === 'split' && sp.k === k) { const g = laneG(i); flash(MAIN.x + MAIN.w * 0.62, g.y + g.h / 2, ['#14a058', '#fbbf24', '#2563eb']); } } if (!ok && sp.pulse[k][i] === 1) sp.pulse[k][i] = 0; }
    }
  }
  const laneG = (i) => {
    const h = PHONE ? 132 : 100, gap = PHONE ? 12 : 10, y0 = MAIN.y + (PHONE ? 128 : 112);
    return { y: y0 + i * (h + gap), h, x: MAIN.x + 12, w: MAIN.w - 24 };
  };
  function drawLane(g, kind, alpha, off) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(0, off);
    D.roundRect(g.x, g.y, g.w, g.h, 14); ctx.fillStyle = kind === 'ox' ? '#fef2f2' : '#eff6ff'; ctx.fill(); ctx.strokeStyle = kind === 'ox' ? '#fca5a5' : '#93c5fd'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  function drawSplit(t) {
    const sp = S.sp, k = sp.k, rx = RXS[k], e = sm(sp.sk[k]);
    T(14, 26, '✂️ 반응식을 산화 반쪽과 환원 반쪽으로 나눠요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const cx = MAIN.x + MAIN.w / 2;
    const fs = PHONE ? 18 : 22;
    T(MAIN.x + 16, MAIN.y + 24, '반응식 골격', 13.5, MUTED, 'left', 800);
    const lay = drawEq(rx.L.map((q) => T0(q, 1)), rx.R.map((q) => T0(q, 1)), cx, MAIN.y + 62, fs, MAIN.w - 40, { pk: 'sp' + k });
    T(cx, MAIN.y + 62 + fs * 1.3 + 14, '(전자의 이동은 아직 쓰지 않았어요)', 13.5, MUTED, 'center', 700);
    if (e < 0.02) {
      [0, 1].forEach((i) => { const g = laneG(i); D.roundRect(g.x, g.y, g.w, g.h, 14); ctx.setLineDash([7, 6]); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); });
      T(cx, laneG(0).y + laneG(0).h / 2 + 5, '✂️ “반쪽으로 나누기”를 눌러요', 15, PUR, 'center', 800);
      return;
    }
    [0, 1].forEach((i) => {
      const g = laneG(i), hf = RXS[k].halves[i], off = -(1 - e) * 46;
      drawLane(g, hf.kind, e, off);
      ctx.save(); ctx.globalAlpha = e; ctx.translate(0, off);
      T(g.x + 14, g.y + 22, hf.kind === 'ox' ? '산화 반쪽 : 전자를 잃는 쪽' : '환원 반쪽 : 전자를 얻는 쪽', 14, hf.kind === 'ox' ? '#b91c1c' : '#1d4ed8', 'left', 800);
      const { L, R } = halfTerms(k, i), st = sp.h[k][i];
      const ok = halfOk(k, i), right = halfRight(k, i);
      const hl = {}; if (st.n > 0) hl.e = ok ? GOODC2 : '#f59e0b';
      const fs2 = PHONE ? 20 : 24;
      const ly = drawEq(L, R, g.x + g.w / 2, g.y + (PHONE ? 62 : 50), fs2, g.w - 40, { pk: 'sph' + k + i, hl });
      chargeBadges(ly, L, R, g.y + g.h - (PHONE ? 22 : 17));
      if (right) { D.check(g.x + g.w - 28, g.y + 24, 13, 1); }
      ctx.restore();
    });
    // 안내
    const ok0 = halfRight(k, 0), ok1 = halfRight(k, 1);
    const g1 = laneG(1);
    if (!PHONE) T(MAIN.x + 16, MAIN.y + MAIN.h - 6, '', 12, MUTED);
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '반쪽 반응식의 규칙', 15, WARN, 'left', 800);
    const lines = [
      [ok0, '산화 반쪽 : 전자를 잃으므로 e⁻가 화살표의 오른쪽(생성물 쪽)에 나타나요.'],
      [ok1, '환원 반쪽 : 전자를 얻으므로 e⁻가 화살표의 왼쪽(반응물 쪽)에 나타나요.'],
      [ok0 && ok1, '두 반쪽 모두 왼쪽과 오른쪽의 원자 수와 전하가 같아야 해요.'],
    ];
    let yy = INFO.y + 54;
    lines.forEach((l) => { yy += textBlock(INFO.x + 16, yy, INFO.w - 32, (l[0] ? '✅ ' : '⬜ ') + l[1], 14, l[0] ? '#166534' : INK, 19, 700) + 7; });
  }

  /* ============ ② 전자 맞추기 ============ */
  const BLC = [['Cu', 'Cu'], ['Agp', 'Ag⁺'], ['Cu2', 'Cu²⁺'], ['Ag', 'Ag']];
  const blHalf = () => {
    const b = S.bl;
    return { ox: { L: [T0('Cu', b.m1)], R: [T0('Cu2', b.m1), T0('e', 2 * b.m1)] }, red: { L: [T0('Agp', b.m2), T0('e', b.m2)], R: [T0('Ag', b.m2)] } };
  };
  const blGive = () => 2 * S.bl.m1, blTake = () => S.bl.m2;
  const blBalanced = () => blGive() === blTake();
  const blNet = () => { const g = blGive(), tk = blTake(); return { L: Math.max(0, tk - g), R: Math.max(0, g - tk) }; };
  function blSum() {
    const b = S.bl, n = blNet();
    return { L: [T0('Cu', b.m1), T0('Agp', b.m2), T0('e', n.L)], R: [T0('Cu2', b.m1), T0('Ag', b.m2), T0('e', n.R)] };
  }
  const blMy = () => ({ L: [T0('Cu', S.bl.coef[0]), T0('Agp', S.bl.coef[1])], R: [T0('Cu2', S.bl.coef[2]), T0('Ag', S.bl.coef[3])] });
  const blFinalOk = () => { const c = S.bl.coef, t = tallies(blMy().L.filter((q) => q.n > 0), blMy().R.filter((q) => q.n > 0)); return t.ok && c.every((v) => v > 0) && gcd(gcd(c[0], c[1]), gcd(c[2], c[3])) === 1; };
  function blSet(m1, m2) { const b = S.bl; if (m1 != null) { b.m1 = m1; popMap.mul0 = 1; } if (m2 != null) { b.m2 = m2; popMap.mul1 = 1; } updateCtl(); }
  function blReset() { const b = S.bl; b.m1 = 1; b.m2 = 1; b.coef = [1, 1, 1, 1]; b.bal = false; b.K = 0; updateCtl(); }
  function stepBal(dt) {
    const b = S.bl, bal = blBalanced();
    b.K = ap(b.K, bal ? 1 : 0, dt, 4); b.shake = Math.max(0, b.shake - dt);
    if (bal && !b.bal) { b.bal = true; if (S.mode === 'balance') { const g0 = laneB(0), g1 = laneB(1); flash(MAIN.x + MAIN.w * 0.72, g0.y + g0.h / 2, ['#fbbf24', '#14a058', '#ffffff']); flash(MAIN.x + MAIN.w * 0.3, g1.y + g1.h / 2, ['#fbbf24', '#14a058', '#ffffff']); } updateCtl(); }
    if (!bal && b.bal) { b.bal = false; updateCtl(); }
  }
  const laneB = (i) => { const h = PHONE ? 112 : 88, y0 = MAIN.y + 8; return { y: y0 + i * (h + 8), h, x: MAIN.x + 10, w: MAIN.w - 20 }; };
  function drawBalance(t) {
    const b = S.bl, hv = blHalf(), bal = blBalanced();
    T(14, 26, '⚖️ 주고받는 전자 수가 같도록 곱해서 더해요', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const fs = PHONE ? 19 : 23, cx = MAIN.x + MAIN.w / 2;
    [['ox', 0, b.m1, '산화 반쪽 (Cu)'], ['red', 1, b.m2, '환원 반쪽 (Ag⁺)']].forEach(([kind, i, m, title]) => {
      const g = laneB(i); drawLane(g, kind, 1, 0);
      T(g.x + 12, g.y + 20, title + ' × ' + m, 13.5, kind === 'ox' ? '#b91c1c' : '#1d4ed8', 'left', 800);
      const hl = {}; hl.e = bal ? GOODC2 : '#f59e0b';
      drawEq(hv[kind].L, hv[kind].R, cx, g.y + (PHONE ? 52 : 44), fs, g.w - 30, { pk: 'bl' + i, hl, balls: true });
      pill(g.x + g.w - 46, g.y + 20, '× ' + m, { bg: '#ede9fe', color: '#5b21b6', border: '#a78bfa', size: 14, scale: 1 + 0.2 * (popMap['mul' + i] || 0) });
    });
    // 더한 식
    const sy = laneB(1).y + laneB(1).h + 8, sh = MAIN.y + MAIN.h - 8 - sy;
    D.roundRect(MAIN.x + 10, sy, MAIN.w - 20, sh, 14); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.6; ctx.stroke();
    const net = blNet(), sum = blSum(), mine = S.gate === 'coef';
    T(MAIN.x + 24, sy + 21, mine ? '내가 쓰는 완성식' : '두 반쪽 식을 더하고 같은 전자를 지우면', 14, WARN, 'left', 800);
    const eqY = sy + (PHONE ? 66 : 54), f2 = PHONE ? 19 : 22;
    if (mine) {
      const my = blMy(); const lay = drawEq(my.L, my.R, cx, eqY, f2, MAIN.w - 50, { pk: 'blmy' });
      const ok = chargeBadges(lay, my.L, my.R, eqY + (PHONE ? 46 : 44));
      if (blFinalOk()) D.check(MAIN.x + MAIN.w - 36, sy + 24, 12, 1);
    } else {
      const hl = { e: '#dc2626' };
      const lay = drawEq(sum.L, sum.R, cx, eqY, f2, MAIN.w - 50, { pk: 'blsum', hl });
      if (net.L + net.R > 0) {
        const nn = net.L + net.R;
        const er = tallies(sum.L.filter((q) => q.n > 0 && q.key !== 'e'), sum.R.filter((q) => q.n > 0 && q.key !== 'e'));
        const lq = sideTot(sum.L.filter((q) => q.key !== 'e' && q.n > 0)).q, rq = sideTot(sum.R.filter((q) => q.key !== 'e' && q.n > 0)).q;
        textBlock(MAIN.x + 28, eqY + (PHONE ? 46 : 46), MAIN.w - 56, '⚠ 전자 ' + nn + '개가 남아요. 그냥 지우면 전하가 왼쪽 ' + qs(lq) + ', 오른쪽 ' + qs(rq) + '로 달라져요.', 14, '#b91c1c', 19, 800);
      } else {
        const gg = gcd(b.m1, gcd(b.m2, 1));
        pill(cx, eqY + (PHONE ? 46 : 44), b.m1 === 1 && b.m2 === 2 ? '✅ 전자 ' + blGive() + '개가 모두 지워졌어요! 완성식이에요' : '전자는 맞았지만 더 작은 정수로 맞출 수 있어요', { bg: b.m1 === 1 && b.m2 === 2 ? '#dcfce7' : '#fff7ed', color: b.m1 === 1 && b.m2 === 2 ? '#166534' : '#9a3412', border: b.m1 === 1 && b.m2 === 2 ? '#4ade80' : '#fdba74', size: 14.5 });
      }
    }
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const sx = PHONE ? INFO.x + INFO.w / 2 : INFO.x + 168, sy2 = INFO.y + (PHONE ? 60 : 58);
    eScale(sx, sy2, PHONE ? 108 : 100, blGive(), blTake(), '내놓는 전자', '받는 전자', t);
    const cL = mine ? blMy().L : sum.L.filter((q) => q.key !== 'e'), cR = mine ? blMy().R : sum.R.filter((q) => q.key !== 'e');
    if (!PHONE) drawCounters(INFO.x + 340, INFO.y + 26, INFO.w - 356, INFO.h - 30, cL, cR, mine ? '내가 쓴 식 검사' : 'e⁻를 지운 식 검사', { cols: 3 });
    else drawCounters(INFO.x + 16, INFO.y + 178, INFO.w - 32, 80, cL, cR, mine ? '내가 쓴 식 검사' : 'e⁻를 지운 식 검사', { cols: 3 });
  }

  /* ============ ③ 산성 용액 ============ */
  const ACX = {
    mn: { name: 'MnO₄⁻ → Mn²⁺', Lk: 'MnO4', Rk: 'Mn2', metal: 'Mn', nL: 1, oO: 4, ox: [7, 2], ans: { rM: 1, w: 4, h: 8, e: 5 }, ion: ['MnO₄⁻', 'Mn²⁺'], c0: '#8e2bb5', c1: '#f4e4f8' },
    cr: { name: 'Cr₂O₇²⁻ → Cr³⁺', Lk: 'Cr2O7', Rk: 'Cr3', metal: 'Cr', nL: 2, oO: 7, ox: [6, 3], ans: { rM: 2, w: 7, h: 14, e: 6 }, ion: ['Cr₂O₇²⁻', 'Cr³⁺'], c0: '#f59e0b', c1: '#4ea36a' },
  };
  const acV = () => S.ac.v[S.ac.ex];
  const acTerms = () => {
    const x = ACX[S.ac.ex], v = acV();
    return { L: [T0(x.Lk, 1), T0('H', v.h), T0('e', v.e)], R: [T0(x.Rk, v.rM), T0('H2O', v.w)] };
  };
  const acEcnt = (x) => (x.ox[0] - x.ox[1]) * x.nL;
  function acRung(ex) {
    const x = ACX[ex], v = S.ac.v[ex], tm = { L: [T0(x.Lk, 1), T0('H', v.h), T0('e', v.e)], R: [T0(x.Rk, v.rM), T0('H2O', v.w)] };
    const r1 = v.rM === x.nL, r2 = v.w === x.oO, r3 = v.h === 2 * v.w, r4 = sideTot(tm.L.filter((q) => q.n > 0)).q === sideTot(tm.R.filter((q) => q.n > 0)).q;
    const r5 = v.chk === acEcnt(x) && r4 && v.e === acEcnt(x);
    return [r1, r1 && r2, r1 && r2 && r3, r1 && r2 && r3 && r4, r1 && r2 && r3 && r4 && r5];
  }
  const acAllDone = (ex) => acRung(ex)[4];
  const acOpen = (ex) => { const r = acRung(ex); return [true, r[0], r[1], r[2], r[3]]; };
  let acUI = null;
  function stepAcid(dt) {
    const a = S.ac, d = acRung(a.ex);
    a.rx = ap(a.rx, d[3] ? 1 : 0, dt, 2.2);
    a.pulse = Math.max(0, a.pulse - dt * 2.2);
    const key = a.ex + ':' + d.join('');
    if (a.lastKey !== key) {
      const prev = a.lastD || [false, false, false, false, false];
      d.forEach((ok, i) => { if (ok && !prev[i]) { a.pulse = 1; if (S.mode === 'acid') flash(MAIN.x + 60, MAIN.y + 118 + i * 40, ['#14a058', '#fbbf24']); } });
      a.lastKey = key; a.lastD = d; updateCtl();
    }
  }
  function drawAcid(t) {
    const a = S.ac, x = ACX[a.ex], v = acV(), tm = acTerms(), rg = acRung(a.ex), op = acOpen(a.ex);
    T(14, 26, '🪜 산성 용액에서 ' + x.ion[0] + ' → ' + x.ion[1] + ' 반쪽 반응식 만들기', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const cx = MAIN.x + MAIN.w / 2, fs = PHONE ? 20 : 23;
    const hl = {}; if (v.h > 0) hl.H = '#7c3aed'; if (v.w > 0) hl.H2O = '#0ea5e9'; if (v.e > 0) hl.e = rg[3] ? GOODC2 : '#f59e0b';
    const lay = drawEq(tm.L, tm.R, cx, MAIN.y + 50, fs, MAIN.w - 30, { pk: 'ac' + a.ex, hl, stack: PHONE });
    if (rg[3]) { T(cx, lay.bottom + 14, '✅ 원자 수와 전하가 모두 같아요', 14, '#166534', 'center', 800); }
    // 사다리
    const labels = ['① 산소 · 수소 이외의 원자 수 맞추기', '② 산소 원자 수 맞추기 : H₂O 더하기', '③ 수소 원자 수 맞추기 : H⁺ 더하기', '④ 전하 맞추기 : e⁻ 더하기', '⑤ 산화수 변화로 전자 수 확인'];
    const subs = [x.metal + ' 원자 : ' + x.nL + '개 | ' + v.rM + '개', 'O 원자 : ' + x.oO + '개 | ' + v.w + '개', 'H 원자 : ' + v.h + '개 | ' + 2 * v.w + '개', '전하 : ' + qs(sideTot(tm.L.filter((q) => q.n > 0)).q) + ' | ' + qs(sideTot(tm.R.filter((q) => q.n > 0)).q), x.metal + ' ' + oxs2(x.ox[0]) + ' → ' + oxs2(x.ox[1]) + ' : ' + (isNaN(v.chk) ? '?' : v.chk) + '개'];
    const lx = MAIN.x + 14, ly0 = MAIN.y + (PHONE ? 104 : 96), rh = PHONE ? 46 : 44, lw = PHONE ? MAIN.w - 28 : 372;
    labels.forEach((lb, i) => {
      const y = ly0 + i * rh, on = rg[i], cur = !on && (i === 0 || rg[i - 1]), lock = !on && !cur;
      D.roundRect(lx, y, lw, rh - 6, 10); ctx.fillStyle = on ? '#ecfdf5' : cur ? '#f5f3ff' : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = on ? '#6ee7b7' : cur ? PUR : '#cbd5e1'; ctx.lineWidth = cur ? 2.4 : 1.4; ctx.stroke();
      T(lx + 12, y + 17, lb, 13.5, lock ? '#94a3b8' : INK, 'left', 800);
      T(lx + 12, y + 35, lock ? '앞 단계를 먼저 맞춰요' : subs[i], 13, on ? '#166534' : lock ? '#94a3b8' : '#5b21b6', 'left', 700);
      T(lx + lw - 14, y + 28, on ? '✓' : lock ? '🔒' : '✏️', 18, on ? GOODC2 : MUTED, 'right', 900);
    });
    if (!PHONE) {
      // 산화수 변화 그림
      const px = MAIN.x + 420, py = MAIN.y + 96, pw = MAIN.w - 436, ph = 5 * rh - 6;
      D.roundRect(px, py, pw, ph, 12); ctx.fillStyle = '#faf5ff'; ctx.fill(); ctx.strokeStyle = '#ddd6fe'; ctx.lineWidth = 1.6; ctx.stroke();
      T(px + pw / 2, py + 24, x.metal + '의 산화수 변화', 14, WARN, 'center', 800);
      const c0 = x.c0, c1 = x.c1, k = a.rx, ey = py + 100;
      D.sphere(px + 62, ey, 36, c0, { text: x.ion[0], textScale: 0.5, shadow: true });
      D.sphere(px + pw - 62, ey, 36, C.mix(c0, c1, sm(k)), { text: x.ion[1], textColor: '#4a2a5a', textScale: 0.6, shadow: true, outline: '#c4b5fd' });
      pill(px + 62, ey - 56, x.metal + ' ' + oxs2(x.ox[0]), { bg: '#fee2e2', color: '#b91c1c', border: '#f87171', size: 14 });
      pill(px + pw - 62, ey - 56, x.metal + ' ' + oxs2(x.ox[1]), { bg: '#dbeafe', color: '#1d4ed8', border: '#60a5fa', size: 14 });
      D.arrow(px + 108, ey, px + pw - 108, ey, { color: '#64748b', width: 3, head: 10 });
      const n = v.e; for (let q = 0; q < Math.min(n, 8); q++) { eBall(px + pw / 2 - (Math.min(n, 8) - 1) * 9 + q * 18, ey - 20 + Math.sin(t * 3 + q) * 2, 7); }
      T(px + pw / 2, ey + 28, n > 0 ? 'e⁻ ' + n + '개를 얻어요 (환원)' : '전자를 얻어요 (환원)', 14, REDC, 'center', 800);
      T(px + 62, ey + 52, '색: ' + (a.ex === 'mn' ? '보라색' : '주황색'), 13.5, MUTED, 'center', 700);
      T(px + pw - 62, ey + 52, '색: ' + (a.ex === 'mn' ? '거의 무색' : '초록색'), 13.5, MUTED, 'center', 700);
      T(px + pw / 2, py + ph - 14, rg[4] ? '✅ 산화수로 센 전자 ' + v.chk + '개 = 반쪽 식의 e⁻ ' + v.e + '개' : '산화수 변화로 구한 전자 수와 비교해요', 13.5, rg[4] ? '#166534' : MUTED, 'center', 800);
    }
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    drawCounters(INFO.x + 16, INFO.y + 22, INFO.w - 32, INFO.h - 30, tm.L, tm.R, '원자 수 · 전하 검사기 (왼쪽 | 오른쪽)', { cols: PHONE ? 3 : 6 });
  }
  const oxs2 = (n) => (n > 0 ? '+' + n : n < 0 ? MINUS + (-n) : '0');
  function acSet(key, val) { acV()[key] = val; updateCtl(); }

  /* ============ ④ 완성하기 ============ */
  const CPX = [
    { name: 'Fe²⁺ + MnO₄⁻', L: ['Fe2', 'MnO4', 'H'], R: ['Fe3', 'Mn2', 'H2O'], ans: [5, 1, 8, 5, 1, 4], e: 5, ox: ['Fe  +2 → +3 (산화)  ×5', 'Mn  +7 → +2 (환원)  ×1'], viz: { c0: '#8e2bb5', a0: 0.72, c1: '#f4e4f8', a1: 0.3, t0: '보라색 (MnO₄⁻)', t1: '거의 무색 (Mn²⁺)' } },
    { name: 'Cu + NO₃⁻', L: ['Cu', 'NO3', 'H'], R: ['Cu2', 'NO', 'H2O'], ans: [3, 2, 8, 3, 2, 4], e: 6, ox: ['Cu  0 → +2 (산화)  ×3', 'N  +5 → +2 (환원)  ×2'], viz: { c0: '#dbeafe', a0: 0.4, c1: '#3b9be0', a1: 0.7, t0: '무색', t1: '푸른색 (Cu²⁺)', fx: 'gas' } },
    { name: 'Cr₂O₇²⁻ + 에탄올', L: ['EtOH', 'Cr2O7', 'H'], R: ['AcH', 'Cr3', 'H2O'], ans: [3, 1, 8, 3, 2, 7], e: 6, ox: ['에탄올 → 아세트알데하이드 : e⁻ 2개를 잃어요  ×3', 'Cr  +6 → +3 (환원)  ×2'], viz: { c0: '#f59e0b', a0: 0.75, c1: '#3f9d63', a1: 0.7, t0: '주황색 (Cr₂O₇²⁻)', t1: '초록색 (Cr³⁺)' } },
    { name: 'Zn + Ag⁺', L: ['Zn', 'Agp'], R: ['Zn2', 'Ag'], ans: [1, 2, 1, 2], e: 2, ox: ['Zn  0 → +2 (산화)  ×1', 'Ag  +1 → 0 (환원)  ×2'], viz: { c0: '#dbeafe', a0: 0.4, c1: '#dbeafe', a1: 0.35, t0: '무색', t1: '무색 + 은 알갱이', fx: 'silver' } },
  ];
  CPX.forEach((p, k) => { S.cp.coef[k] = p.L.concat(p.R).map(() => 1); S.cp.e[k] = NaN; });
  const cpTerms = (k) => { const p = CPX[k], c = S.cp.coef[k], nl = p.L.length; return { L: p.L.map((key, i) => T0(key, c[i])), R: p.R.map((key, i) => T0(key, c[nl + i])) }; };
  const cpBal = (k) => { const t = cpTerms(k); return tallies(t.L, t.R).ok; };
  const cpOk = (k) => { const c = S.cp.coef[k]; return cpBal(k) && c.reduce((g, v) => gcd(g, v), 0) === 1; };
  const cpOkN = () => CPX.filter((p, k) => cpOk(k)).length;
  let cpUI = [];
  function cpSelect(k) { S.cp.k = k; $('#cpE').value = isNaN(S.cp.e[k]) ? '' : String(S.cp.e[k]); $('#cpE').classList.remove('ok', 'bad'); buildCp(); updateCtl(); }
  function buildCp() {
    const host = $('#coefBox4'); host.innerHTML = ''; const k = S.cp.k, p = CPX[k]; cpUI = [];
    p.L.concat(p.R).forEach((key, i) => { cpUI.push(mkStep(host, SP[key].f + (i < p.L.length ? '' : ' (생성물)'), 1, 20, () => S.cp.coef[k][i], (v) => { S.cp.coef[k][i] = v; updateCtl(); })); });
  }
  function stepCp(dt) {
    const c = S.cp, k = c.k, ok = cpOk(k);
    c.rx = ap(c.rx, ok ? 1 : 0, dt, 1.6);
    for (let i = 0; i < 4; i++) { const o = cpOk(i); if (o && !c.done[i]) { c.done[i] = true; if (S.mode === 'complete' && i === c.k) flash(MAIN.x + MAIN.w / 2, MAIN.y + 60, ['#14a058', '#fbbf24', '#8b5cf6']); updateCtl(); } if (!o && c.done[i]) { c.done[i] = false; updateCtl(); } }
  }
  function drawComplete(t) {
    const c = S.cp, k = c.k, p = CPX[k], tm = cpTerms(k), bal = cpBal(k), ok = cpOk(k);
    T(14, 26, '✅ 계수를 채워 산화·환원 반응식을 완성해요', PHONE ? 14 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const cx = MAIN.x + MAIN.w / 2, fs = PHONE ? 18 : 21;
    const hl = {}; [].concat(p.L, p.R).forEach((key) => { hl[key] = ok ? GOODC2 : null; });
    const lay = drawEq(tm.L, tm.R, cx, MAIN.y + 40, fs, MAIN.w - 24, { pk: 'cp' + k, hl, stack: PHONE });
    T(cx, lay.bottom + 16, ok ? '✅ 원자 수와 전하가 모두 같은 반응식이에요' : bal ? '균형은 맞았어요. 계수를 가장 작은 정수로 줄여요' : '아래 검사기가 모두 초록색이 되도록 계수를 바꿔요', 14, ok ? '#166534' : bal ? '#9a3412' : MUTED, 'center', 800);
    // 산화수 변화 + 비커
    const vz = p.viz, bw = PHONE ? 100 : 112, bh = PHONE ? 130 : 150, bx = MAIN.x + (PHONE ? 30 : 60), by = MAIN.y + (PHONE ? 190 : 128);
    const e = sm(c.rx), col = C.mix(vz.c0, vz.c1, e), al = vz.a0 + (vz.a1 - vz.a0) * e;
    const bk = beaker(bx, by, bw, bh, { level: 0.62, color: col, alpha: al, inside: (g) => {
      if (vz.fx === 'silver') { const n = Math.round(14 * e); for (let q = 0; q < n; q++) { const q2 = ballPos(g, q + 11, 3, 1.5, t); ctx.fillStyle = 'rgba(203,213,225,.95)'; ctx.beginPath(); ctx.arc(q2[0], q2[1], 3.4, 0, TAU); ctx.fill(); } }
    } });
    if (vz.fx === 'gas' && e > 0.05 && e < 0.97 && !RM && Math.random() < 0.4) parts.emit({ x: bx + 14 + Math.random() * (bw - 28), y: bk.bottom - 10, vx: 0, vy: -40, life: Math.max(0.2, (bk.bottom - bk.ly - 14) / 40), size: 3, color: 'rgba(255,255,255,.9)', shape: 'bubble', gravity: 0 });
    T(bx + bw / 2, by + bh + 22, ok ? vz.t1 : vz.t0, 13.5, MUTED, 'center', 800);
    T(bx + bw / 2, by - 10, ok ? '반응 후' : '반응 전', 13.5, ok ? '#166534' : MUTED, 'center', 800);
    const tx = bx + bw + (PHONE ? 16 : 40), tw = MAIN.x + MAIN.w - tx - 14;
    T(tx, by + 14, '산화수 변화', 14, WARN, 'left', 800);
    let yy = by + 40;
    p.ox.forEach((s, i) => { yy += textBlock(tx, yy, tw, s, 13.5, i === 0 ? OXC : REDC, 18, 800) + 8; });
    textBlock(tx, yy + 4, tw, '식을 완성하면 왼쪽 비커에서 반응 장면이 재생돼요.', 13.5, MUTED, 18, 700);
    // INFO
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    drawCounters(INFO.x + 16, INFO.y + 22, INFO.w - 32, INFO.h - 30, tm.L, tm.R, '원자 수 · 전하 검사기 (왼쪽 | 오른쪽)', { cols: PHONE ? 3 : 6 });
  }

  /* ---------- 조작 장치 ---------- */
  const halfUI = [];
  function buildHalf() {
    const host = $('#halfBox'); host.innerHTML = '';
    [0, 1].forEach((i) => {
      const d = document.createElement('div'); d.className = 'hf';
      const lab = document.createElement('span'); lab.className = 'lab'; d.appendChild(lab);
      const ch = document.createElement('div'); ch.className = 'chips';
      const bs = ['L', 'R'].map((sd) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = sd === 'L' ? 'e⁻를 왼쪽에' : 'e⁻를 오른쪽에'; b.addEventListener('click', () => { Sound.click(); spSet(i, sd, S.sp.h[S.sp.k][i].n || 1); }); ch.appendChild(b); return b; });
      d.appendChild(ch);
      const st = mkStep(d, '', 0, 3, () => S.sp.h[S.sp.k][i].n, (v) => spSet(i, null, v), { row: true });
      st.cell.querySelector('.lab').textContent = 'e⁻ 개수';
      host.appendChild(d); halfUI.push({ d, lab, bs, st });
    });
  }
  buildHalf();
  makeChips($('#spSel'), RXS.map((r, i) => [String(i), (i + 1) + '. ' + r.name]), (v) => spSel(+v));
  $('#bSplit').addEventListener('click', spSplit);
  $('#bSplitReset').addEventListener('click', () => { Sound.click(); spReset(); });
  const mulUI = [
    mkStep($('#mulBox'), '산화 반쪽 (Cu) 에 곱하기', 1, 4, () => S.bl.m1, (v) => blSet(v, null), { row: true }),
    mkStep($('#mulBox'), '환원 반쪽 (Ag⁺) 에 곱하기', 1, 4, () => S.bl.m2, (v) => blSet(null, v), { row: true }),
  ];
  const coefUI2 = BLC.map(([key, f], i) => mkStep($('#coefBox2'), f + (i >= 2 ? ' (생성물)' : ''), 1, 8, () => S.bl.coef[i], (v) => { S.bl.coef[i] = v; updateCtl(); }));
  makeChips($('#acEx'), [['mn', 'MnO₄⁻ → Mn²⁺'], ['cr', 'Cr₂O₇²⁻ → Cr³⁺']], (v) => { S.ac.ex = v; refreshAcInputs(); updateCtl(); });
  const acRows = [];
  (function () {
    const host = $('#acBox');
    acRows.push(mkStep(host, '① 금속 이온의 계수', 1, 4, () => acV().rM, (v) => acSet('rM', v), { row: true }));
    acRows.push(mkStep(host, '② H₂O 개수', 0, 10, () => acV().w, (v) => acSet('w', v), { row: true }));
    acRows.push(mkStep(host, '③ H⁺ 개수', 0, 16, () => acV().h, (v) => acSet('h', v), { row: true }));
    acRows.push(mkStep(host, '④ e⁻ 개수', 0, 10, () => acV().e, (v) => acSet('e', v), { row: true }));
    const row = document.createElement('div'); row.className = 'row-line';
    row.innerHTML = '<span class="lab">⑤ 산화수 변화로 센 전자 수 (개)</span><div class="in-wrap"><input class="num-in" id="acChk" type="text" inputmode="numeric" autocomplete="off" placeholder="0" aria-label="산화수 변화로 센 전자 수"><span class="unit">개</span></div>';
    host.appendChild(row);
  })();
  const acChk = $('#acChk');
  bindNum(acChk, (v, ch) => { acV().chk = isNaN(v) ? NaN : Math.round(v); updateCtl(); });
  function refreshAcInputs() { const v = acV().chk; acChk.value = isNaN(v) ? '' : String(v); }
  makeChips($('#cpSel'), CPX.map((p, i) => [String(i), (i + 1) + '. ' + p.name]), (v) => cpSelect(+v));
  const cpE = $('#cpE');
  bindNum(cpE, (v, ch) => { const c = S.cp; c.e[c.k] = isNaN(v) ? NaN : Math.round(v); const ok = c.e[c.k] === CPX[c.k].e; cpE.classList.toggle('ok', ok); if (ok) cpE.classList.remove('bad'); else if (ch && !isNaN(v)) cpE.classList.add('bad'); updateCtl(); });
  buildCp();

  function onLeave() {}
  function uiExtra() {
    const sp = S.sp, k = sp.k, rx = RXS[k];
    markChips($('#spSel'), String(k), { 0: spDone(0), 1: spDone(1) });
    $('#bSplit').disabled = sp.split[k];
    halfUI.forEach((u, i) => {
      const hf = rx.halves[i], st = sp.h[k][i];
      u.d.classList.toggle('dis', !sp.split[k]);
      u.lab.textContent = (hf.kind === 'ox' ? '산화 반쪽 : ' : '환원 반쪽 : ') + SP[hf.L].f + ' → ' + SP[hf.R].f;
      u.bs.forEach((b, j) => b.classList.toggle('on', st.side === (j ? 'R' : 'L')));
      u.st.refresh();
    });
    mulUI.forEach((u) => u.refresh()); coefUI2.forEach((u) => u.refresh());
    const rg = acOpen(S.ac.ex);
    markChips($('#acEx'), S.ac.ex, { mn: acAllDone('mn'), cr: acAllDone('cr') });
    acRows.forEach((u, i) => { u.off = !rg[i]; u.cell.style.opacity = rg[i] ? '1' : '.5'; u.refresh(); });
    acRows[0].cell.hidden = false;
    acChk.disabled = !rg[4];
    $('#acNote').textContent = acAllDone(S.ac.ex) ? '반쪽 반응식이 완성됐어요!' : '앞 단계 칸이 맞아야 다음 칸이 열려요. 왼쪽 그림의 검사기를 보며 맞춰요.';
    const done = {}; CPX.forEach((p, i) => { done[String(i)] = cpOk(i); });
    markChips($('#cpSel'), String(S.cp.k), done);
    cpUI.forEach((u) => u.refresh());
  }

  function readouts() {
    const m = S.mode;
    if (m === 'split') { const sp = S.sp; setRead('고른 반응', RXS[sp.k].name, '완성한 반쪽 식', spCount() + ' / 4', '나눈 반응', sp.split.filter(Boolean).length + ' / 2'); }
    else if (m === 'balance') { setRead('내놓는 전자', blGive() + ' 개', '받는 전자', blTake() + ' 개', '전자 수', blBalanced() ? '같아요' : '달라요'); }
    else if (m === 'acid') { const rg = acRung(S.ac.ex); setRead('맞춘 단계', rg.filter(Boolean).length + ' / 5', 'H₂O · H⁺ · e⁻', acV().w + ' · ' + acV().h + ' · ' + acV().e, '반쪽 반응식', rg[3] ? '완성' : '작업 중'); }
    else { const t = tallies(cpTerms(S.cp.k).L, cpTerms(S.cp.k).R); setRead('고른 문제', CPX[S.cp.k].name, '검사기', t.ok ? '모두 같음' : '다른 곳 있음', '완성한 문제', cpOkN() + ' / 4'); }
  }

  /* ================= 미션 ================= */
  function resetCp() { CPX.forEach((p, k) => { S.cp.coef[k] = p.L.concat(p.R).map(() => 1); S.cp.e[k] = NaN; }); S.cp.done = [false, false, false, false]; S.cp.k = 0; cpE.value = ''; cpE.classList.remove('ok', 'bad'); buildCp(); updateCtl(); }
  function resetAc() { S.ac.v = { mn: { rM: 1, w: 0, h: 0, e: 0, chk: NaN }, cr: { rM: 1, w: 0, h: 0, e: 0, chk: NaN } }; S.ac.ex = 'mn'; S.ac.lastKey = ''; refreshAcInputs(); updateCtl(); }
  const levels = [
    {
      title: '반쪽 나누기: 전자는 어느 쪽에?', short: '반쪽 나누기', icon: '✂️', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 산화와 환원은 동시에 일어나는데, 두 반응을 식으로 합치려면 무엇을 맞춰야 할까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 산화수가 증가하면 산화, 감소하면 환원이고 잃은 전자 수와 얻은 전자 수가 같다는 것을 배웠어요. 이제 반응식을 <b>산화 반쪽</b>과 <b>환원 반쪽</b>으로 나누어 전자(e⁻)를 직접 써 봐요.</div>' +
        '<p>Zn + Cu²⁺ → Zn²⁺ + Cu 를 두 칸으로 나눈 뒤, 각 반쪽 식에서 e⁻를 어느 쪽에 몇 개 더해야 <b>양쪽의 전하가 같아지는지</b> 찾아요.</p>',
      features: ['split'],
      setup() { spReset(); S.sp.k = 0; setScene('split'); },
      recap: '산화 반쪽 반응식에서는 e⁻가 화살표 오른쪽에, 환원 반쪽 반응식에서는 e⁻가 화살표 왼쪽에 나타나요. 각 반쪽 식은 원자 수와 전하가 양쪽에서 같아야 해요.',
      summary: '<ul><li>Zn + Cu²⁺ → Zn²⁺ + Cu 를 나누면 <b>산화 반쪽</b> Zn → Zn²⁺ + 2e⁻ , <b>환원 반쪽</b> Cu²⁺ + 2e⁻ → Cu</li><li>Cu + Ag⁺ → Cu²⁺ + Ag : 산화 반쪽 Cu → Cu²⁺ + 2e⁻ , 환원 반쪽 Ag⁺ + e⁻ → Ag</li><li>산화 반쪽 : e⁻가 <b>오른쪽</b>(전자를 잃음) / 환원 반쪽 : e⁻가 <b>왼쪽</b>(전자를 얻음)</li><li>반쪽 반응식은 원자 수와 전하가 양쪽에서 같아요.</li></ul>',
      missions: [
        {
          title: '반쪽 반응식 쓰기 2개', manual: true,
          goal: '<b>Zn + Cu²⁺</b>와 <b>Cu + Ag⁺</b> 반응을 각각 나누고, 두 반쪽 식에 e⁻를 알맞게 써서 <b>✔ 확인하기</b>를 누르세요.',
          hint: '“반쪽으로 나누기”를 누른 뒤, e⁻를 왼쪽 또는 오른쪽에 놓고 개수를 정해요. 아래 전하 표시가 = 가 되면 맞는 식이에요. 반응 고르기 단추로 두 반응을 모두 해요.',
          setup() { spReset(); S.sp.k = 0; setScene('split'); },
          check() {
            if (spDone(0) && spDone(1)) return true;
            const miss = [0, 1].filter((k) => !spDone(k));
            const k = miss[0], bad = [0, 1].find((i) => !halfRight(k, i));
            const st = S.sp.h[k][bad];
            if (!S.sp.split[k]) return '“' + RXS[k].name + '” 반응을 먼저 “반쪽으로 나누기”로 나눠 주세요.';
            if (st.n === 0) return '“' + RXS[k].name + '” 의 ' + (bad === 0 ? '산화' : '환원') + ' 반쪽에 e⁻를 써 넣어 주세요.';
            return '“' + RXS[k].name + '” 의 ' + (bad === 0 ? '산화' : '환원') + ' 반쪽을 다시 살펴보세요. ' + (halfOk(k, bad) ? '전하는 맞지만 e⁻의 위치가 반대예요. 전자를 잃는 쪽은 e⁻가 오른쪽이에요.' : '양쪽 전하가 같아지도록 e⁻ 개수와 위치를 고쳐 보세요.');
          },
          status: () => '완성한 반쪽 식 ' + spCount() + ' / 4',
          explain: 'Zn → Zn²⁺ + 2e⁻ (산화), Cu²⁺ + 2e⁻ → Cu (환원). Cu → Cu²⁺ + 2e⁻ (산화), Ag⁺ + e⁻ → Ag (환원). 산화 반쪽에서는 전자가 생성물 쪽에 나타나고, 환원 반쪽에서는 반응물 쪽에서 전자를 받아요. 양쪽 전하가 같아야 해요.',
        },
        {
          type: 'quiz', title: '산화 반쪽 식에서 e⁻의 위치',
          goal: '산화 반쪽 반응식(예: Zn → Zn²⁺ + 2e⁻)에서 <b>e⁻는 화살표의 어느 쪽</b>에 나타날까요?',
          setup() { setScene('split'); },
          choices: ['화살표의 왼쪽 : 반응물이 전자를 받아요', '화살표의 오른쪽 : 반응물이 전자를 잃어서 생성물 쪽에 전자가 나타나요', '화살표의 양쪽에 똑같이 써요', '산화 반쪽 식에는 e⁻를 쓰지 않아요'],
          answer: 1,
          feedback: ['전자를 받는 쪽은 환원 반쪽이에요. 산화에서는 전자를 잃어요.', '', '전자는 한쪽 방향으로 이동하므로 한쪽에만 써요.', '전하를 맞추려면 e⁻를 꼭 써야 해요. Zn → Zn²⁺ 만으로는 전하가 0과 +2로 달라요.'],
          explain: '산화는 전자를 <b>잃는</b> 변화예요. Zn → Zn²⁺ + 2e⁻ 처럼 전자가 반응물에서 떠나 <b>생성물 쪽(화살표 오른쪽)</b>에 나타나요. 환원 반쪽에서는 e⁻가 반응물 쪽(왼쪽)에 있어요.',
        },
      ],
    },
    {
      title: '전자 맞추기: 주고받는 전자를 같게', short: '전자 맞추기', icon: '⚖️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 반쪽 반응식을 썼어요. Cu + Ag⁺ 에서 산화 반쪽은 e⁻ <b>2개</b>를 내놓고, 환원 반쪽은 e⁻ <b>1개</b>만 받아요. 이대로 더하면 전자가 남아요.</div>' +
        '<p>각 반쪽 식에 <b>정수를 곱해서</b> 내놓는 전자 수와 받는 전자 수를 같게 한 뒤, 두 식을 더하고 e⁻를 지워서 완성식을 만들어요. 곱할 때 입자가 복제되는 모습도 살펴봐요.</p>',
      features: ['balance'],
      setup() { blReset(); S.gate = ''; setScene('balance'); },
      recap: '두 반쪽 반응식에 정수를 곱해 e⁻ 수를 같게 한 뒤 더하면 e⁻가 모두 지워지고 원자 수와 전하가 보존되는 완성식이 나와요. Cu + Ag⁺ 는 Cu 식 ×1, Ag⁺ 식 ×2 로 Cu + 2Ag⁺ → Cu²⁺ + 2Ag 예요.',
      summary: '<ul><li>Cu → Cu²⁺ + 2e⁻ (×1) , Ag⁺ + e⁻ → Ag (×2) → 내놓는 전자 2개 = 받는 전자 2개</li><li>더하고 e⁻를 지우면 <b>Cu + 2Ag⁺ → Cu²⁺ + 2Ag</b> (왼쪽 전하 +2, 오른쪽 전하 +2)</li><li>전자 수를 맞추지 않고 더하면 e⁻가 남거나, e⁻를 지울 때 <b>전하가 보존되지 않아요</b>. (Cu + Ag⁺ → Cu²⁺ + Ag : +1 ≠ +2)</li><li>곱하는 수는 가장 작은 정수로 해요.</li></ul>',
      missions: [
        {
          title: '곱해서 전자 수 맞추기',
          goal: '<b>Cu + Ag⁺</b> 반응에서 두 반쪽 식에 곱할 수를 정해 <b>내놓는 전자 수 = 받는 전자 수</b>가 되게 하세요. 가장 작은 정수를 써요.',
          hint: '산화 반쪽은 e⁻ 2개를 내놓고 환원 반쪽은 e⁻ 1개를 받아요. 환원 반쪽에 몇을 곱해야 받는 전자가 2개가 될까요? 전자 저울이 수평이 되면 성공이에요.',
          setup() { blReset(); S.gate = ''; setScene('balance'); },
          check: () => S.bl.m1 === 1 && S.bl.m2 === 2, hold: 0.8,
          status: () => '내놓는 전자 ' + blGive() + '개 · 받는 전자 ' + blTake() + '개 ' + mark(blBalanced()) + (blBalanced() && !(S.bl.m1 === 1 && S.bl.m2 === 2) ? ' (더 작은 수로)' : ''),
          explain: '산화 반쪽 Cu → Cu²⁺ + 2e⁻ 는 전자 2개를 내놓고, 환원 반쪽 Ag⁺ + e⁻ → Ag 는 1개를 받으므로 환원 반쪽에 <b>2</b>를 곱해요. 2Ag⁺ + 2e⁻ → 2Ag. 이제 내놓는 전자 2개 = 받는 전자 2개예요.',
        },
        {
          title: '완성식 쓰기', manual: true,
          goal: '두 반쪽 식을 더해 e⁻를 지운 <b>완성식의 계수</b>를 쓰고 <b>✔ 확인하기</b>를 누르세요. (원자 수와 전하가 모두 같아야 해요)',
          hint: '2Ag⁺ + 2e⁻ → 2Ag 와 Cu → Cu²⁺ + 2e⁻ 를 더하면 e⁻가 양쪽에서 지워져요. 아래 검사기가 모두 초록색이 되게 해요.',
          setup() { S.bl.m1 = 1; S.bl.m2 = 2; S.bl.coef = [1, 1, 1, 1]; S.gate = 'coef'; setScene('balance'); updateCtl(); },
          check() { if (blFinalOk()) return true; return tallies(blMy().L, blMy().R).ok ? '원자 수와 전하는 맞아요. 계수를 가장 작은 정수로 써 주세요.' : '왼쪽과 오른쪽의 원자 수 또는 전하가 달라요. 검사기에서 빨간 칸을 확인해 보세요.'; },
          status: () => '원자 · 전하 검사 ' + mark(tallies(blMy().L, blMy().R).ok),
          explain: '더한 식 Cu + 2Ag⁺ + 2e⁻ → Cu²⁺ + 2e⁻ + 2Ag 에서 양쪽의 2e⁻를 지우면 <b>Cu + 2Ag⁺ → Cu²⁺ + 2Ag</b>. 왼쪽 전하 +2, 오른쪽 전하 +2로 보존돼요.',
        },
        {
          type: 'quiz', title: '전자 수를 맞추지 않으면?',
          goal: '전자 수를 맞추지 않고 두 반쪽 식을 그냥 더해서 e⁻를 지우면 어떤 일이 생길까요?',
          setup() { S.gate = ''; setScene('balance'); },
          choices: ['전하가 보존되지 않는 틀린 식이 돼요 (예: Cu + Ag⁺ → Cu²⁺ + Ag 는 왼쪽 +1, 오른쪽 +2)', '아무 문제 없어요. e⁻는 어차피 지워져요', '원자 수가 달라져요', '식의 계수가 모두 사라져요'],
          answer: 0,
          feedback: ['', 'e⁻의 수가 서로 다르면 지워지지 않고 남아요. 그냥 지우면 전하가 맞지 않아요.', '원자 수는 반쪽 식에서 이미 맞췄어요. 달라지는 것은 전하예요.', '계수는 사라지지 않아요.'],
          explain: '두 반쪽 식에서 e⁻의 수가 다르면 e⁻를 지울 수 없어요. 억지로 지우면 <b>전하가 왼쪽 +1, 오른쪽 +2</b>처럼 달라져 전하가 보존되지 않아요. 그래서 먼저 곱해서 전자 수를 같게 해야 해요.',
        },
      ],
    },
    {
      title: '산성 용액: H₂O와 H⁺로 맞추기', short: '산성 용액', icon: '🪜', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> e⁻ 수를 맞춰 더하는 방법을 배웠어요. 그런데 MnO₄⁻ → Mn²⁺ 처럼 산소가 들어 있는 이온은 반쪽 반응식을 어떻게 쓸까요?</div>' +
        '<p><b>산성 수용액</b>에는 H⁺와 H₂O가 충분해서 이들로 원자를 맞출 수 있어요. 순서는 ① 산소 · 수소 이외의 원자 → ② 산소는 H₂O로 → ③ 수소는 H⁺로 → ④ 전하는 e⁻로 이고, 마지막에 산화수 변화로 전자 수를 확인해요.</p>',
      features: ['acid'],
      setup() { resetAc(); setScene('acid'); },
      recap: '산성 용액의 반쪽 반응식은 산소 · 수소 이외의 원자 → 산소는 H₂O → 수소는 H⁺ → 전하는 e⁻ 순서로 맞춰요. MnO₄⁻ + 8H⁺ + 5e⁻ → Mn²⁺ + 4H₂O 이고 e⁻ 수는 산화수 변화(+7 → +2)와 같아요.',
      summary: '<ul><li><b>산성 용액 반쪽 반응식 순서</b> : ① 산소 · 수소 이외의 원자 수 → ② 산소는 <b>H₂O</b> → ③ 수소는 <b>H⁺</b> → ④ 전하는 <b>e⁻</b></li><li>MnO₄⁻ → Mn²⁺ : MnO₄⁻ + 8H⁺ + 5e⁻ → Mn²⁺ + 4H₂O (왼쪽 전하 −1 + 8 − 5 = +2 , 오른쪽 +2)</li><li>산화수 변화 Mn +7 → +2 = 5 감소 → e⁻ 5개 (검증)</li><li>Cr₂O₇²⁻ + 14H⁺ + 6e⁻ → 2Cr³⁺ + 7H₂O (Cr +6 → +3, 2개 × 3 = 6)</li><li>이 단원에서는 <b>산성 용액</b>만 다뤄요. (염기성 용액은 H⁺가 거의 없어서 방법이 달라져요)</li></ul>',
      missions: [
        {
          title: 'MnO₄⁻ → Mn²⁺ 사다리 채우기', manual: true,
          goal: 'MnO₄⁻ → Mn²⁺ 반쪽 반응식을 ② H₂O → ③ H⁺ → ④ e⁻ 순서로 맞추고, ⑤ 산화수 변화로 센 전자 수를 써서 <b>✔ 확인하기</b>를 누르세요.',
          hint: '② O 원자 4개를 맞추려면 오른쪽에 H₂O 몇 개? ③ H₂O의 H 원자 수만큼 왼쪽에 H⁺ ④ 전하가 같아지도록 e⁻ ⑤ Mn은 +7에서 +2로 얼마나 줄었나요?',
          setup() { resetAc(); setScene('acid'); },
          check() {
            const r = acRung('mn');
            if (r[4]) return true;
            if (!r[0]) return '① 단계부터 확인해요. 오른쪽 Mn²⁺의 계수를 맞춰 주세요.';
            if (!r[1]) return '② 산소 원자 수가 아직 달라요. 왼쪽 MnO₄⁻의 O 4개와 같아지도록 H₂O 수를 정해 주세요.';
            if (!r[2]) return '③ 수소 원자 수가 아직 달라요. H₂O에 들어 있는 H 원자 수만큼 왼쪽에 H⁺를 놓아 주세요.';
            if (!r[3]) return '④ 전하가 아직 달라요. 왼쪽과 오른쪽 전하가 같아지도록 e⁻를 더해 주세요.';
            return '⑤ 산화수 변화로 센 전자 수를 써 주세요. Mn은 +7에서 +2로 변해요.';
          },
          status: () => { const r = acRung('mn'); return 'H₂O ' + mark(r[1]) + ' H⁺ ' + mark(r[2]) + ' e⁻ ' + mark(r[3]) + ' 확인 ' + mark(r[4]); },
          explain: '② 산소 4개 → 오른쪽에 4H₂O, ③ 수소 8개 → 왼쪽에 8H⁺, ④ 전하 : 왼쪽 −1 + 8 = +7, 오른쪽 +2 이므로 왼쪽에 5e⁻ 를 더해요. ⑤ Mn +7 → +2 : 5 감소 = e⁻ 5개로 일치해요. <b>MnO₄⁻ + 8H⁺ + 5e⁻ → Mn²⁺ + 4H₂O</b>',
        },
        {
          type: 'quiz', title: 'e⁻를 마지막에 더하는 까닭',
          goal: 'H₂O와 H⁺를 먼저 맞추고 <b>e⁻는 마지막</b>에 더하는 까닭은?',
          setup() { setScene('acid'); },
          choices: ['H₂O와 H⁺는 원자 수와 전하를 함께 바꾸지만 e⁻는 전하만 바꾸므로, 원자 수를 먼저 맞추고 전하를 마지막에 맞추면 쉬워요', 'e⁻는 질량이 커서 마지막에 넣어야 해요', '순서가 달라지면 완성된 식이 다른 반응이 돼요', 'H⁺를 먼저 넣어야 용액이 염기성이 되기 때문이에요'],
          answer: 0,
          feedback: ['', '전자의 질량은 매우 작고, 순서의 이유는 질량과 상관없어요.', '순서와 상관없이 올바르게 맞춘 식은 같아요. 다만 순서를 지키면 실수가 줄어요.', 'H⁺가 많으면 용액은 산성이에요. 염기성이 되는 것이 아니에요.'],
          explain: 'e⁻는 <b>전하만</b> 바꾸고 원자 수는 바꾸지 않아요. 반대로 H₂O와 H⁺는 원자 수와 전하를 모두 바꿔요. 그래서 원자 수(산소 → 수소)를 먼저 맞춘 뒤, 남은 <b>전하 차이</b>를 e⁻로 한 번에 맞추는 것이 가장 편해요.',
        },
        {
          type: 'quiz', title: '산성 용액으로 한정하는 까닭',
          goal: '이 방법을 <b>염기성 용액</b>에는 그대로 쓰지 못해요. 그래서 이 단원에서는 산성 용액에서만 써요. 그 까닭은?',
          setup() { setScene('acid'); },
          choices: ['염기성 용액에는 H⁺가 거의 없어서 H⁺를 더하는 방법을 그대로 쓸 수 없어요', '염기성 용액에서는 산화·환원 반응이 일어나지 않아요', '염기성 용액에서는 전자의 개수가 달라져요', '염기성 용액에서는 H₂O를 쓸 수 없어요'],
          answer: 0,
          feedback: ['', '염기성 용액에서도 산화·환원 반응은 많이 일어나요.', '전자의 개수는 용액의 성질이 아니라 산화수 변화로 정해져요.', 'H₂O는 용액에 모두 있어요. 달라지는 것은 H⁺와 OH⁻의 양이에요.'],
          explain: '염기성 용액에는 <b>OH⁻가 많고 H⁺가 거의 없어요</b>. 그래서 H⁺로 수소를 맞추는 방법을 그대로 쓸 수 없고 OH⁻를 이용하는 다른 보정이 필요해요. 이 단원에서는 <b>산성 용액</b>의 경우만 다뤄요.',
        },
      ],
    },
    {
      title: '완성하기: 반응식 4문제', short: '완성하기', icon: '✅', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 반쪽 반응식을 쓰고 전자 수를 맞춰 더하는 방법을 모두 익혔어요. 이제 문제 4개의 <b>완성식 계수</b>를 직접 채워 봐요.</div>' +
        '<p>계수를 바꾸면 <b>원자 수 · 전하 검사기</b>가 왼쪽과 오른쪽을 비교해 줘요. 모두 초록색이 되도록 가장 간단한 정수 계수로 완성하고, 식이 완성되면 용액의 변화도 확인해요. (식 속 이온은 모두 산성 수용액 속에 있어요.)</p>',
      features: ['complete'],
      setup() { resetCp(); setScene('complete'); },
      recap: '산화·환원 반응식은 두 반쪽 반응식의 전자 수를 같게 곱해 더하고 e⁻를 지워 완성해요. 완성된 식은 원자 수와 전하가 모두 보존돼요. 이동한 전자 수는 산화수 변화로도 확인할 수 있어요.',
      summary: '<ul><li>Fe²⁺ + MnO₄⁻ (산성) : <b>MnO₄⁻ + 8H⁺ + 5Fe²⁺ → Mn²⁺ + 4H₂O + 5Fe³⁺</b> (전자 5개, 전하 +17 = +17)</li><li>Cu + NO₃⁻ (산성) : <b>3Cu + 2NO₃⁻ + 8H⁺ → 3Cu²⁺ + 2NO + 4H₂O</b> (전자 6개)</li><li>Cr₂O₇²⁻ + 에탄올 : <b>3CH₃CH₂OH + Cr₂O₇²⁻ + 8H⁺ → 3CH₃CHO + 2Cr³⁺ + 7H₂O</b> (전자 6개)</li><li>Zn + 2Ag⁺ → Zn²⁺ + 2Ag (전자 2개)</li><li>KMnO₄ 용액의 <b>보라색</b>이 사라지는 것은 MnO₄⁻가 Mn²⁺(거의 무색)로 환원되기 때문이에요.</li></ul>',
      missions: [
        {
          title: '반응식 3개 이상 완성하기', manual: true,
          goal: '문제 4개 중 <b>3개 이상</b>에서 원자 수와 전하가 모두 같은, <b>가장 간단한 정수 계수</b>의 식을 완성하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '먼저 가장 복잡한 입자의 계수를 정하고, 산소는 H₂O, 수소는 H⁺로 맞춰요. 검사기에서 빨간 칸을 보면서 하나씩 고쳐요. 반응 고르기 단추로 문제를 바꿔요.',
          setup() { resetCp(); setScene('complete'); },
          check() { const n = cpOkN(); if (n >= 3) return true; const bal = CPX.filter((p, k) => cpBal(k) && !cpOk(k)).length; return '지금까지 ' + n + '개를 완성했어요. 3개 이상 완성해야 해요.' + (bal ? ' 균형은 맞지만 계수를 더 작은 정수로 줄일 수 있는 문제가 있어요.' : ''); },
          status: () => '완성한 문제 ' + cpOkN() + ' / 3 ' + mark(cpOkN() >= 3),
          explain: 'Fe²⁺ + MnO₄⁻ : 5Fe²⁺ + MnO₄⁻ + 8H⁺ → 5Fe³⁺ + Mn²⁺ + 4H₂O / Cu + NO₃⁻ : 3Cu + 2NO₃⁻ + 8H⁺ → 3Cu²⁺ + 2NO + 4H₂O / Cr₂O₇²⁻ + 에탄올 : 3CH₃CH₂OH + Cr₂O₇²⁻ + 8H⁺ → 3CH₃CHO + 2Cr³⁺ + 7H₂O / Zn + 2Ag⁺ → Zn²⁺ + 2Ag. 모두 원자 수와 전하가 보존돼요.',
        },
        {
          type: 'quiz', title: '보라색이 사라지는 까닭',
          goal: 'Fe²⁺ 용액에 KMnO₄ 용액(보라색)을 떨어뜨리면 보라색이 사라져요. 그 까닭은?',
          setup() { cpSelect(0); setScene('complete'); },
          choices: ['MnO₄⁻가 Mn²⁺로 환원되어 거의 무색이 되기 때문이에요', 'MnO₄⁻가 산화되어 색이 없어지기 때문이에요', 'Fe²⁺가 보라색을 흡수해서 없애기 때문이에요', 'H⁺가 MnO₄⁻의 색을 가리기 때문이에요'],
          answer: 0,
          feedback: ['', 'Mn은 +7에서 +2로 산화수가 감소해요. 감소는 환원이에요.', 'Fe²⁺는 환원제로 MnO₄⁻에 전자를 줘요. 색을 흡수해서 없애는 것이 아니에요.', 'H⁺는 반응에 참여하지만 색을 가리지 않아요. 색이 변하는 것은 MnO₄⁻ 이온 자체가 변하기 때문이에요.'],
          explain: '보라색은 <b>MnO₄⁻</b>(Mn +7)의 색이에요. Fe²⁺에게서 전자 5개를 받아 <b>Mn²⁺</b>(Mn +2)로 환원되면 거의 무색(연한 분홍)이 되어 보라색이 사라져요. 그래서 KMnO₄ 용액은 적정에서 스스로 지시약이 돼요.',
        },
        {
          title: 'Cu + NO₃⁻ 에서 이동한 전자 수',
          goal: '<b>2번 문제 (Cu + NO₃⁻)</b>를 완성하고, 완성된 식에서 <b>이동한 전자</b>가 모두 몇 개인지 쓰세요.',
          hint: '3Cu가 각각 전자 2개를 잃으면 모두 몇 개? 2NO₃⁻는 N이 +5에서 +2로 줄어 각각 전자 3개를 얻어요. 두 값은 같아요.',
          setup() { cpSelect(1); setScene('complete'); },
          check: () => cpOk(1) && S.cp.e[1] === 6, hold: 0.6,
          status: () => '2번 식 ' + mark(cpOk(1)) + ' &nbsp; 전자 수 ' + (isNaN(S.cp.e[1]) ? '—' : S.cp.e[1] + '개') + ' ' + mark(S.cp.e[1] === 6),
          explain: '3Cu → 3Cu²⁺ 에서 3×2 = 6개의 전자를 잃고, 2NO₃⁻ → 2NO 에서 N이 +5 → +2 로 2×3 = 6개의 전자를 얻어요. 잃은 전자 수 = 얻은 전자 수 = <b>6개</b>예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hr-redox-equation', mount: '#game', badge: '반응식 박사', homeHref: '../../index.html#hr',
    featureLabels: { split: '✂️ 반쪽 나누기 · e⁻ 채우기', balance: '⚖️ 곱하기 · 전자 저울', acid: '🪜 산성 용액 사다리', complete: '✅ 계수 채우기 · 검사기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('split');
  function stepAll1(dt) { stepSplit(dt); stepBal(dt); stepAcid(dt); stepCp(dt); popTick(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'split') drawSplit(t); else if (S.mode === 'balance') drawBalance(t); else if (S.mode === 'acid') drawAcid(t); else drawComplete(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, PHONE, MAIN, INFO, RXS, CPX, ACX, SP, tallies, sideTot,
    spSel, spSplit, spReset, spSet, spDone, spCount, halfOk, halfRight, blSet, blReset, blBalanced, blFinalOk, acRung, acSet, acAllDone, acV, cpSelect, cpOk, cpOkN, cpTerms, cpBal, resetAc, resetCp,
    get game() { return game; }, setScene, uiExtra,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
