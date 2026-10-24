/* =========================================================
   전자기와 양자 Ⅰ. 전자기적 상호작용 - 변압기와 인덕터 (단원 8차시)
   성취기준 [12전자01-05] 자기선속의 변화로 전자기 유도를 이해하고, 변압기, 인덕터 등 전자기 유도의 활용 기술을 설명할 수 있다.
   ① 모형: 변압기 (교류·직류, 철심 속 선속, 오실로스코프)
   ② 실험: 권선비 V₁/V₂ = N₁/N₂, V₁I₁ = V₂I₂ (이상적인 변압기)
   ③ 분석: 송전 P = VI, 손실 I²R (고전압의 이점)
   ④ 모형: 인덕터 (자체 유도 ε = −L ΔI/Δt, 스파크)
   상호 인덕턴스 M의 계산, 히스테리시스, 3상 교류, 임피던스·리액턴스는 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 760 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const mark = (b) => (b ? '✅' : '⬜');
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef2fa' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  /* 화면 배치: 장면 틀(SC) · 아래 띠(STP) · 설명 패널(IN) */
  const SC = PHONE ? { x: 4, y: 52, w: 472, h: 400 } : { x: 14, y: 52, w: 472, h: 400 };
  const STP = PHONE ? { x: 8, y: 458, w: 464, h: 84 } : { x: 14, y: 460, w: 472, h: 88 };
  const IN = PHONE ? { x: 8, y: 548, w: 464, h: 204 } : { x: 496, y: 52, w: 292, h: 496 };
  const lp = (p) => ({ x: p.x - SC.x, y: p.y - SC.y });          // 가상 화면 좌표 → 장면 좌표
  const inSC = (p) => p.x >= SC.x && p.x <= SC.x + SC.w && p.y >= SC.y && p.y <= SC.y + SC.h;
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
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#eaf1fb'); g.addColorStop(1, '#f7f9fd');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  function sceneBegin(fill) {            // 장면 틀 안에서 그리기 시작 (틀 좌표 0..472 x 0..400)
    panel(SC.x, SC.y, SC.w, SC.h, 16, fill || '#fbfcff');
    ctx.save(); ctx.translate(SC.x, SC.y); ctx.beginPath(); ctx.rect(0, 0, SC.w, SC.h); ctx.clip();
  }
  function sceneEnd() { ctx.restore(); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function lbl(x, y, text, o) {
    o = o || {}; const size = o.size || 13, pad = o.pad != null ? o.pad : 8;
    ctx.save(); ctx.font = D.font(size, 800); const w = ctx.measureText(text).width + pad * 2; ctx.restore();
    const lo = o.minX != null ? o.minX : 4, hi = o.maxX != null ? o.maxX : VW - 4;
    const cx = clamp(x, lo + w / 2, hi - w / 2);
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
  const POS = '#e2464b', NEG = '#2f6df6', COL_B = '#7c3aed', COL_F = '#f26b3a', COL_V = '#0d9488', COL_E = '#2563eb';
  const angDiff = (a, b) => { let d = Math.abs(a - b) % TAU; if (d > Math.PI) d = TAU - d; return d; };
  const wrapPi = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

  /* ---------- 숫자 입력 · 선택 상자 ---------- */
  function makeNum(host, q, pre, unit, e0) {
    const row = document.createElement('div'); row.className = 'numrow';
    const exps = []; for (let e = -34; e <= 12; e++) exps.push('<option value="' + e + '"' + (e === (e0 || 0) ? ' selected' : '') + '>10' + sup(e) + '</option>');
    row.innerHTML = '<div class="q">' + q + '</div><span class="pre">' + pre + '</span>' +
      '<input class="num-in" type="number" step="any" inputmode="decimal" aria-label="' + q.replace(/<[^>]+>/g, '') + ' 계수">' +
      '<span class="pre">×</span><select class="num-in" aria-label="10의 거듭제곱">' + exps.join('') + '</select><span class="unit">' + unit + '</span>';
    host.appendChild(row);
    const inp = row.querySelector('input'), sel = row.querySelector('select');
    const h = {
      row, inp, sel, st: null, e0: e0 || 0,
      val() { const s = inp.value.trim().replace(',', '.'); if (s === '' || isNaN(+s)) return NaN; return +s * Math.pow(10, +sel.value); },
      clear() { inp.value = ''; sel.value = String(h.e0); inp.classList.remove('ok', 'bad'); sel.classList.remove('ok', 'bad'); h.st = null; },
      mark(ok) { if (h.st === ok) return; h.st = ok; [inp, sel].forEach((n) => { n.classList.remove('ok', 'bad'); if (ok === false) { void n.offsetWidth; n.classList.add('bad'); } else if (ok) n.classList.add('ok'); }); },
    };
    [inp, sel].forEach((n) => n.addEventListener('input', () => { h.st = null; inp.classList.remove('ok', 'bad'); sel.classList.remove('ok', 'bad'); }));
    return h;
  }
  function numOK(h, target, tol) { const v = h.val(); if (isNaN(v)) return null; return Math.abs(v - target) <= tol * Math.abs(target); }
  function checkNum(h, target, tol, hintMsg) { const ok = numOK(h, target, tol); if (ok === null) return '값을 입력해 주세요.'; h.mark(ok); return ok ? true : hintMsg; }
  function makeSelects(host, rules, store, okStore, attr) {
    const sels = [];
    rules.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      if (attr) row.dataset.grp = attr[i];
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
  function checkSel(rules, store, ok, sels, msg) {
    const miss = rules.filter((r, i) => !store[i]).length; if (miss) return '아직 고르지 않은 문제가 ' + miss + '개 있어요.';
    let bad = 0; rules.forEach((r, i) => { const o = +store[i] - 1 === r[2]; if (!o) bad++; selMark(sels[i], i, o, ok); });
    return bad ? msg : true;
  }
  function setRange(id, v, mn, mx, fmt) {
    const s = $('#' + id); if (!s) return;
    if (Math.abs(+s.value - v) > 1e-9) s.value = v;
    s.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%');
    const o = s.parentElement.parentElement.querySelector('output'); if (o) o.textContent = fmt(v);
  }
  /* 슬라이더 + 증감 버튼 묶음: bindSl(id, get, set) — 슬라이더 id, 버튼 id+'M', id+'P' */
  function bindSl(id, get, set, after) {
    const s = $('#' + id); if (!s) return;
    const put = (v) => { const step = +s.step || 1, mn = +s.min, mx = +s.max; v = Math.round(clamp(v, mn, mx) / step) * step; set(Math.round(v * 1e6) / 1e6); if (after) after(); };
    s.addEventListener('input', () => { put(+s.value); Sound.tick(); });
    $('#' + id + 'M').addEventListener('click', () => { Sound.click(); put(get() - (+s.step || 1)); });
    $('#' + id + 'P').addEventListener('click', () => { Sound.click(); put(get() + (+s.step || 1)); });
  }

  /* ---------- 이 차시에서 쓰는 도우미 ---------- */
  function makePlain(host, q, pre, unit) {
    const row = document.createElement('div'); row.className = 'numrow';
    row.innerHTML = '<div class="q">' + q + '</div><span class="pre">' + pre + '</span>' +
      '<input class="num-in" type="number" step="any" inputmode="decimal" aria-label="' + q.replace(/<[^>]+>/g, '') + '"><span class="unit">' + unit + '</span>';
    host.appendChild(row);
    const inp = row.querySelector('input');
    const h = {
      row, inp, st: null,
      val() { const s = inp.value.trim().replace(',', '.'); if (s === '' || isNaN(+s)) return NaN; return +s; },
      clear() { inp.value = ''; inp.classList.remove('ok', 'bad'); h.st = null; },
      mark(ok) { if (h.st === ok) return; h.st = ok; inp.classList.remove('ok', 'bad'); if (ok === false) { void inp.offsetWidth; inp.classList.add('bad'); } else if (ok) inp.classList.add('ok'); },
    };
    inp.addEventListener('input', () => { h.st = null; inp.classList.remove('ok', 'bad'); });
    return h;
  }
  function trackBar(x, y, w, h, frac, color) {          // 눈금에 맞춘 막대 (바탕 + 채움)
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#eef1f7'; ctx.fill();
    const fw = clamp(frac, 0, 1) * w;
    if (fw > 0.4) { ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x, y, fw, h); ctx.restore(); }
  }
  function polyCum(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return cum; }
  function polyAt(pts, cum, d) {
    const tot = cum[cum.length - 1]; d = ((d % tot) + tot) % tot;
    let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
    const u = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u];
  }
  function pathDots(pts, ph, gap, r, color, alpha) {                    // 경로를 따라 흐르는 점
    if (RM && ph === 0) return;
    const cum = polyCum(pts), tot = cum[cum.length - 1], n = Math.max(2, Math.round(tot / gap));
    ctx.fillStyle = color || '#f59e0b'; ctx.globalAlpha = alpha == null ? 1 : alpha;
    for (let i = 0; i < n; i++) { const p = polyAt(pts, cum, ph + i * tot / n); ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function wireStroke(path, lw, glow) {                                  // 구리선 모양 선
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (glow > 0.02) { ctx.strokeStyle = 'rgba(250,204,21,' + (0.45 * clamp(glow, 0, 1)) + ')'; ctx.lineWidth = lw + 7; ctx.stroke(path); }
    ctx.strokeStyle = '#7c4a1c'; ctx.lineWidth = lw + 1.6; ctx.stroke(path);
    ctx.strokeStyle = '#dca06a'; ctx.lineWidth = lw; ctx.stroke(path);
  }
  function infoPanel(items) {
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22, x = IN.x + 14, mw = IN.w - 28;
    let y = IN.y + 24; const yMax = IN.y + IN.h - 6;
    for (const it of items) {
      if (it.big && PHONE) continue;
      if (y > yMax - 14) break;
      if (it.h) { T(x, y, it.h, sz + 1, '#1e40af', 'left', 800); y += lh + 2; }
      else if (it.p) { const hgt = textBlock(x, y, mw, it.p, sz - 0.5, it.c || '#26324a', lh - 1, 800); y += hgt + 3; }
      else if (it.tbl) {
        it.tbl.forEach((r, i) => {
          const cur = it.cur === i, yy = y + i * 26;
          D.roundRect(x - 3, yy, mw + 6, 23, 8); ctx.fillStyle = cur ? '#fff2e5' : '#f3f6fb'; ctx.fill(); ctx.strokeStyle = cur ? '#f26b3a' : '#dbe3f0'; ctx.lineWidth = cur ? 2 : 1.2; ctx.stroke();
          T(x + 5, yy + 16, r[0], 12.5, '#26324a', 'left', 800); T(x + mw * (it.c1 || 0.46), yy + 16, r[1], 12.5, r[3] || '#516079', 'left', 800); T(x + mw - 4, yy + 16, r[2], 12.5, r[3] || '#516079', 'right', 800);
        });
        y += it.tbl.length * 26 + 18;
      } else if (it.gap) y += it.gap;
    }
  }

  function xMark(x, y, r, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    const d = r * 0.55; ctx.beginPath(); ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d); ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d); ctx.stroke();
  }

  const p3 = (v) => (Math.abs(v) < 1e-9 ? '0' : (v * (1 + 1e-12)).toPrecision(3));
  const fV = (v) => (v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2));
  const fI = (i) => (i >= 10 ? i.toFixed(1) : i >= 1 ? i.toFixed(2) : i.toFixed(3));
  const COL_BLUE = '#1e40af', COL_TEAL = '#0d9488', COL_RED = '#dc2626', COL_ORG = '#f97316';
  const MODE_LABEL = { tr: '🔌 변압기', ratio: '🔢 권선비', grid: '🏙️ 송전', ind: '🌀 인덕터' };
  const TITLE = {
    tr: '🔌 변압기 — 1차 코일의 변하는 선속이 2차 코일에 전압을 만들어요',
    ratio: '🔢 V₁ : V₂ = N₁ : N₂ , V₁I₁ = V₂I₂ (이상적인 변압기)',
    grid: '🏙️ 송전 — 전압을 높이면 전류가 줄어 손실이 크게 줄어요',
    ind: '🌀 인덕터 — 전류의 “변화”를 방해해요',
  };
  const CXs = SC.w / 2;
  const CORE = { x: 130, y: 52, w: 210, h: 160, t: 36 };
  const Y0 = CORE.y + 22, Y1 = CORE.y + CORE.h - 22, CXL = CORE.x + CORE.t / 2, CXR = CORE.x + CORE.w - CORE.t / 2;
  const SRC = { x: 62, y: (Y0 + Y1) / 2 }, LOAD = { x: 404, y: (Y0 + Y1) / 2 };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'tr', t: 0, fade: 0, gate: '',
    a: { src: 'ac', sw: false, ph: 0, phase: 0, v1: 0, v2: 0, pw: 0, fp: 0, h1: [], h2: [], acc: 0, lit: 0, dcTried: false, swAng: 0 },
    r: { N1: 200, N2: 100, V1: 220, I2: 1, fp: 0, ph: 0, dots: 0 },
    g: { vi: 0, ph: 0, heat: 0, arr: 1, dots: 0 },
    i: { closed: false, core: false, I: 0, Iopen: 0, opening: false, eps: 0, vL: 0, flash: 0, ph: 0, seenClose: false, seenFlash: false, hist: [], acc: 0, glow: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');

  /* ---------- 철심 변압기 그림 (공통) ---------- */
  function ringsFor(N) { return clamp(Math.round(N / 100) + 2, 2, 12); }
  function windingArcs(cx, n, front, glow) {
    const gap = (Y1 - Y0) / (n - 1);
    for (let i = 0; i < n; i++) { const p = new Path2D(); p.ellipse(cx, Y0 + i * gap, 27, 7.5, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); wireStroke(p, 3.4, glow); }
  }
  function coreBody() {
    const c = CORE;
    ctx.save(); ctx.shadowColor = 'rgba(20,40,80,.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h); ctx.rect(c.x + c.t, c.y + c.t, c.w - 2 * c.t, c.h - 2 * c.t);
    const g = ctx.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h); g.addColorStop(0, '#c3cfdf'); g.addColorStop(0.5, '#8a9bb3'); g.addColorStop(1, '#6b7c96');
    ctx.fillStyle = g; ctx.fill('evenodd'); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.4; ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
  }
  function fluxArrows(ph, fp) {
    const a = Math.abs(ph); if (a < 0.04) return;
    const x0 = CORE.x + CORE.t / 2, x1 = CORE.x + CORE.w - CORE.t / 2, ya = CORE.y + CORE.t / 2, yb = CORE.y + CORE.h - CORE.t / 2;
    const pts = [[x0, ya], [x1, ya], [x1, yb], [x0, yb], [x0, ya]], cum = polyCum(pts), tot = cum[cum.length - 1], sg = ph >= 0 ? 1 : -1;
    const n = Math.round(tot / 38);
    for (let i = 0; i < n; i++) {
      const d = i * tot / n + fp, p = polyAt(pts, cum, d), q = polyAt(pts, cum, d + 3), dx = q[0] - p[0], dy = q[1] - p[1], m = Math.hypot(dx, dy) || 1, ux = sg * dx / m, uy = sg * dy / m;
      ctx.fillStyle = 'rgba(250,204,21,' + (0.35 + 0.65 * a) + ')'; ctx.strokeStyle = 'rgba(133,77,14,' + (0.5 * a) + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p[0] + ux * 8, p[1] + uy * 8); ctx.lineTo(p[0] - ux * 5 - uy * 6, p[1] - uy * 5 + ux * 6); ctx.lineTo(p[0] - ux * 5 + uy * 6, p[1] - uy * 5 - ux * 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  function drawBulb(x, y, r, b) {                        // b: 0~1 밝기
    const g = clamp(b, 0, 1);
    if (g > 0.03) D.glow(x, y, r * 2.6, '#fde047', 0.75 * g);
    ctx.fillStyle = g > 0.03 ? 'rgba(254,240,138,' + (0.45 + 0.55 * g) + ')' : 'rgba(226,232,240,.9)'; ctx.beginPath(); ctx.arc(x, y - 3, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = g > 0.03 ? '#f59e0b' : '#94a3b8'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 8, y + 6); ctx.lineTo(x - 5, y - 6); ctx.lineTo(x, y + 2); ctx.lineTo(x + 5, y - 6); ctx.lineTo(x + 8, y + 6); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(x - 9, y + r - 6, 18, 11); ctx.fillStyle = '#64748b'; ctx.fillRect(x - 9, y + r - 2, 18, 2);
  }
  function drawSourceSym(x, y, ac) {
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 24, 0, TAU); ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, 24, 0, TAU); ctx.stroke();
    ctx.strokeStyle = ac ? '#0ea5e9' : '#dc2626'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    if (ac) { ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.bezierCurveTo(x - 9, y - 18, x - 3, y - 18, x, y); ctx.bezierCurveTo(x + 3, y + 18, x + 9, y + 18, x + 14, y); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(x - 12, y - 4); ctx.lineTo(x + 12, y - 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 8, y + 6); ctx.lineTo(x + 8, y + 6); ctx.stroke(); T(x - 17, y - 10, '+', 12, '#dc2626', 'center', 800); }
  }
  function drawXfmr(o) {                                   // o: {n1, n2, ph, fp, glow1, glow2, sw, ac, load: 'bulb'|'res', bulb}
    // 뒤쪽 고리 → 철심 → 앞쪽 고리 → 자속
    windingArcs(CXL, ringsFor(o.n1), false, o.glow1); windingArcs(CXR, ringsFor(o.n2), false, o.glow2);
    coreBody();
    windingArcs(CXL, ringsFor(o.n1), true, o.glow1); windingArcs(CXR, ringsFor(o.n2), true, o.glow2);
    fluxArrows(o.ph, o.fp);
    // 도선
    const w = new Path2D();
    w.moveTo(CXL - 27, Y0); w.lineTo(SRC.x, Y0); w.lineTo(SRC.x, SRC.y - 24); w.moveTo(CXL - 27, Y1); w.lineTo(SRC.x, Y1); w.lineTo(SRC.x, SRC.y + 24);
    w.moveTo(CXR + 27, Y0); w.lineTo(LOAD.x, Y0); w.lineTo(LOAD.x, SRC.y - 26); w.moveTo(CXR + 27, Y1); w.lineTo(LOAD.x, Y1); w.lineTo(LOAD.x, SRC.y + 26);
    wireStroke(w, 2.6, 0);
    drawSourceSym(SRC.x, SRC.y, o.ac);
    // 스위치 (위쪽 도선, 선 위에 얹어서 그림)
    const sx0 = 86, sx1 = 112;
    ctx.fillStyle = '#fff'; ctx.fillRect(sx0 - 2, Y0 - 3, sx1 - sx0 + 4, 6);
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(sx0, Y0, 3.6, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(sx1, Y0, 3.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx0, Y0); ctx.lineTo(sx1 - (o.sw ? 0 : 5), Y0 - (o.sw ? 0 : 20)); ctx.stroke();
    T((sx0 + sx1) / 2, Y0 - 26, o.sw ? '스위치 ON' : '스위치 OFF', 11.5, o.sw ? '#16a34a' : '#64748b', 'center', 800);
    if (o.load === 'bulb') drawBulb(LOAD.x, SRC.y, 24, o.bulb);
    else {
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(LOAD.x, SRC.y - 26);
      for (let k = 0; k < 6; k++) ctx.lineTo(LOAD.x + (k % 2 ? -9 : 9), SRC.y - 26 + 6 + k * 8.6); ctx.lineTo(LOAD.x, SRC.y + 26); ctx.stroke();
      T(LOAD.x + 14, SRC.y + 4, '부하', 12, '#334155', 'left', 800);
    }
    lbl(CXL, 26, '1차 코일 N₁ = ' + o.n1 + '회', { size: 12, bg: '#dbeafe', color: '#1e40af', pad: 7, minX: 0, maxX: SC.w });
    lbl(CXR, 26, '2차 코일 N₂ = ' + o.n2 + '회', { size: 12, bg: '#ffe4e6', color: '#9f1239', pad: 7, minX: 0, maxX: SC.w });
  }
  /* 오실로스코프 (아래 영역) */
  const SCO = { x: 10, y: 246, w: 452, h: 146, mid: 319, pxv: 1.8 };
  function drawScope(a) {
    D.shadow(() => { D.roundRect(SCO.x, SCO.y, SCO.w, SCO.h, 12); ctx.fillStyle = '#0f172a'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.save(); D.roundRect(SCO.x, SCO.y, SCO.w, SCO.h, 12); ctx.clip();
    ctx.strokeStyle = 'rgba(148,163,184,.22)'; ctx.lineWidth = 1;
    for (let k = -2; k <= 2; k++) { const y = SCO.mid + k * 36; ctx.beginPath(); ctx.moveTo(SCO.x, y); ctx.lineTo(SCO.x + SCO.w, y); ctx.stroke(); }
    for (let x = SCO.x + 40; x < SCO.x + SCO.w; x += 60) { ctx.beginPath(); ctx.moveTo(x, SCO.y); ctx.lineTo(x, SCO.y + SCO.h); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.beginPath(); ctx.moveTo(SCO.x, SCO.mid); ctx.lineTo(SCO.x + SCO.w, SCO.mid); ctx.stroke();
    const N = a.h1.length, x0 = SCO.x + 36, dx = (SCO.w - 44) / 170;
    [[a.h1, '#38bdf8'], [a.h2, '#fb923c']].forEach((hh) => {
      ctx.strokeStyle = hh[1]; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath();
      hh[0].forEach((v, i) => { const x = x0 + i * dx, y = SCO.mid - clamp(v * SCO.pxv, -66, 66); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    });
    ctx.restore();
    T(SCO.x + 8, SCO.mid - 36 + 4, '20 V', 10.5, '#94a3b8', 'left', 700); T(SCO.x + 8, SCO.mid + 36 + 4, '−20 V', 10.5, '#94a3b8', 'left', 700);
    lbl(SCO.x + 70, SCO.y + 14, 'V₁ (1차)', { size: 11.5, bg: '#0369a1', pad: 6, minX: 0, maxX: SC.w }); lbl(SCO.x + 150, SCO.y + 14, 'V₂ (2차)', { size: 11.5, bg: '#c2410c', pad: 6, minX: 0, maxX: SC.w });
    T(SCO.x + SCO.w - 8, SCO.y + SCO.h - 7, '오실로스코프 (실제 60 Hz를 느리게 보여 줘요)', 10.5, '#94a3b8', 'right', 700);
  }

  /* ================= ① 변압기 ================= */
  const TR = { V1: 10, n1: 100, n2: 200, f: 1.25, tau: 0.12 };
  function toggleSw() {
    const a = S.a; a.sw = !a.sw; Sound.click();
    if (a.src === 'dc' && a.sw) a.dcTried = true;
    updateCtl();
  }
  function setSrc(v) { const a = S.a; a.src = v; a.sw = false; a.ph = 0; a.h1 = []; a.h2 = []; a.lit = 0; Sound.click(); updateCtl(); }
  function stepTr(dt) {
    const a = S.a; if (dt <= 0) return;
    a.phase += dt * TAU * TR.f;
    let v1_ = 0, v2_ = 0;
    if (a.src === 'ac') {
      if (a.sw) { v1_ = TR.V1 * Math.SQRT2 * Math.sin(a.phase); v2_ = v1_ * TR.n2 / TR.n1; a.ph = -Math.cos(a.phase); }
      else a.ph = SciSim.approach(a.ph, 0, dt, 12);
    } else {
      const tgt = a.sw ? 1 : 0, e = tgt - a.ph;
      v1_ = a.sw ? TR.V1 : 0; v2_ = e * TR.V1 * TR.n2 / TR.n1;
      a.ph = tgt - e * Math.exp(-dt / TR.tau);
    }
    a.v1 = v1_; a.v2 = v2_;
    a.pw = SciSim.approach(a.pw, v2_ * v2_, dt, 6);
    a.fp += a.ph * dt * 70;
    a.acc += dt;
    while (a.acc >= 1 / 60) { a.acc -= 1 / 60; a.h1.push(v1_); a.h2.push(v2_); if (a.h1.length > 170) { a.h1.shift(); a.h2.shift(); } }
    a.lit = (a.src === 'ac' && a.sw && a.pw / 400 > 0.6) ? a.lit + dt : 0;
  }
  const bulbB = () => clamp(S.a.pw / 400, 0, 1);
  function drawTr() {
    const a = S.a; sceneBegin();
    const dcPulse = a.src === 'dc' ? Math.abs(a.v2) / 20 : 0;
    drawXfmr({ n1: TR.n1, n2: TR.n2, ph: a.ph, fp: a.fp, glow1: a.sw ? 0.5 : 0, glow2: clamp(Math.abs(a.v2) / 20, 0, 1) * 0.8, sw: a.sw, ac: a.src === 'ac', load: 'bulb', bulb: Math.sqrt(bulbB()) });
    // 선속 설명
    const fl = a.src === 'ac' ? (a.sw ? (Math.abs(a.ph) < 0.2 ? '선속이 0을 지나는 순간' : '선속이 계속 오가요') : '꺼짐') : (a.sw ? (Math.abs(1 - a.ph) < 0.04 ? '선속이 일정 → 2차 전압 0' : '선속이 변하는 중!') : (Math.abs(a.ph) < 0.04 ? '선속 없음' : '선속이 줄어드는 중!'));
    lbl(CXs, 236 - 6, '철심 속 자기선속: ' + fl, { size: 12.5, bg: 'rgba(255,255,255,.95)', color: '#92400e', minX: 0, maxX: SC.w });
    drawScope(a);
    if (!a.sw) lbl(SC.w / 2, 330, '⏻ 스위치를 켜 보세요', { size: 13, bg: 'rgba(255,255,255,.95)', color: '#9a3412', minX: 0, maxX: SC.w });
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, bw = STP.w - 24, ac = a.src === 'ac';
    T(bx, STP.y + 20, 'V₁ : V₂ = N₁ : N₂ = ' + TR.n1 + ' : ' + TR.n2 + ' = 1 : 2   (파형의 높이로 비교해요)', PHONE ? 11.5 : 13, COL_BLUE, 'left', 800);
    T(bx, STP.y + 44, '2차 전구 밝기', 12.5, '#26324a', 'left', 800); trackBar(bx + 100, STP.y + 32, bw - 100, 14, bulbB(), '#f59e0b');
    T(bx, STP.y + 68, ac ? (a.sw ? '교류: 선속이 계속 변해서 2차에 교류 전압이 계속 유도돼요.' : '교류 전원을 켜 보세요.') : (a.sw || a.dcTried ? '직류: 켜고 끄는 순간에만 선속이 변해 잠깐 깜빡여요.' : '직류 전원도 켜 보세요.'), PHONE ? 11.5 : 12.5, '#0b7a41', 'left', 800);
    infoPanel([
      { h: '변압기의 원리' },
      { p: '1차 코일에 흐르는 전류가 철심에 자기선속을 만들고, 선속이 변하면 2차 코일에 유도 기전력이 생겨요 (ε = −NΔΦ/Δt).' },
      { tbl: [['교류', '선속이 계속 변함', '2차 교류 ✔', ac && a.sw ? '#0b7a41' : '#516079'], ['직류(켠 뒤)', '선속 일정', '2차 전압 0', !ac && a.sw ? '#9a3412' : '#516079'], ['직류(켜는 순간)', '선속 변함', '잠깐만', '#516079']], c1: 0.36 },
      { p: '같은 선속이 두 코일을 지나서 V ∝ N 이에요. 철심은 선속을 모아 주는 길이에요.', big: 1 },
      { p: '🏭 휴대폰 충전기, 전봇대 변압기, 용접기에 쓰여요.', c: '#0b7a41', big: 1 },
    ]);
  }
  $$('#srcSeg button').forEach((b) => b.addEventListener('click', () => setSrc(b.dataset.v)));
  $('#bSw').addEventListener('click', toggleSw);

  /* ================= ② 권선비 ================= */
  const rV2 = () => S.r.V1 * S.r.N2 / S.r.N1;
  const rI1 = () => S.r.I2 * S.r.N2 / S.r.N1;
  const logBar = (v, lo, hi) => clamp((Math.log10(Math.max(v, 1e-12)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)), 0, 1);
  const rOK = () => S.r.V1 === 220 && fV(rV2()) === '5.0';
  function stepRatio(dt) { const r = S.r; r.ph = -Math.cos(S.t * TAU * TR.f); r.fp += r.ph * dt * 70; }
  function drawRatio() {
    const r = S.r, V2 = rV2(), I1 = rI1(), P = V2 * r.I2, mk = S.gate === 'mr2'; sceneBegin();
    drawXfmr({ n1: r.N1, n2: r.N2, ph: r.ph, fp: r.fp, glow1: 0.5, glow2: 0.5, sw: true, ac: true, load: 'res' });
    lbl(58, 228, 'V₁ = ' + fV(r.V1) + ' V', { size: 12.5, bg: '#0369a1', pad: 7, minX: 0, maxX: SC.w });
    lbl(168, 228, 'I₁ = ' + (mk ? '?' : fI(I1) + ' A'), { size: 12.5, bg: '#c2410c', pad: 7, minX: 0, maxX: SC.w });
    lbl(312, 228, 'I₂ = ' + fI(r.I2) + ' A', { size: 12.5, bg: '#c2410c', pad: 7, minX: 0, maxX: SC.w });
    lbl(408, 228, 'V₂ = ' + fV(V2) + ' V', { size: 12.5, bg: '#0369a1', pad: 7, minX: 0, maxX: SC.w });
    // 로그 눈금 막대
    D.shadow(() => { D.roundRect(10, 246, 452, 146, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    T(20, 266, '전압과 전류의 크기 (로그 눈금: 10배마다 같은 간격)', 12, COL_BLUE, 'left', 800);
    const rows = [['V₁', r.V1, 0.1, 1e5, '#0ea5e9', fV(r.V1) + ' V'], ['V₂', V2, 0.1, 1e5, '#0ea5e9', fV(V2) + ' V'], ['I₁', I1, 1e-3, 1e3, '#f97316', mk ? '?' : fI(I1) + ' A'], ['I₂', r.I2, 1e-3, 1e3, '#f97316', fI(r.I2) + ' A']];
    rows.forEach((q, i) => {
      const y = 280 + i * 27, w = 300;
      T(20, y + 11, q[0], 13, '#26324a', 'left', 800); trackBar(52, y, w, 15, mk && q[0] === 'I₁' ? 0 : logBar(q[1], q[2], q[3]), q[4]); T(52 + w + 10, y + 12, q[5], 12.5, '#26324a', 'left', 800);
    });
    T(52, 388, '0.1 V', 10.5, '#94a3b8', 'left', 700); T(52 + 300, 388, '100 kV (전류는 1 mA ~ 1 kA)', 10.5, '#94a3b8', 'right', 700);
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12;
    T(bx, STP.y + 20, 'V₁ / V₂ = ' + p3(r.V1 / V2) + ' ,  N₁ / N₂ = ' + p3(r.N1 / r.N2), PHONE ? 12 : 13.5, COL_BLUE, 'left', 800);
    T(bx, STP.y + 44, 'V₁I₁ = ' + (mk ? '?' : p3(r.V1 * I1) + ' W') + ' ,  V₂I₂ = ' + p3(P) + ' W', PHONE ? 12 : 13.5, '#9a3412', 'left', 800);
    T(bx, STP.y + 68, '감은 수가 많은 쪽이 고전압·저전류예요.', PHONE ? 11.5 : 12.5, '#0b7a41', 'left', 800);
    infoPanel([
      { h: '이상적인 변압기' },
      { p: 'V₁ / V₂ = N₁ / N₂ (같은 선속이 두 코일을 지나요)', c: COL_BLUE },
      { p: '에너지 보존: V₁I₁ = V₂I₂ (입력 전력 = 출력 전력) → I₁ / I₂ = N₂ / N₁' },
      { tbl: [['V₁ : V₂', fV(r.V1) + ' : ' + fV(V2), ''], ['N₁ : N₂', r.N1 + ' : ' + r.N2, ''], ['I₁ : I₂', mk ? '?' : fI(I1) + ' : ' + fI(r.I2), ''], ['출력 전력', p3(P) + ' W', '']], c1: 0.42 },
      { p: '현실의 변압기는 코일 저항, 철심의 와전류, 누설 선속 때문에 효율이 95~99 %예요. 철심은 얇은 판을 겹쳐 와전류를 줄여요.', big: 1 },
    ]);
  }
  bindSl('sN1', () => S.r.N1, (v) => { S.r.N1 = v; }, updateCtl);
  bindSl('sN2', () => S.r.N2, (v) => { S.r.N2 = v; }, updateCtl);
  $$('#v1Seg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.r.V1 = +b.dataset.v; updateCtl(); }));
  $$('#i2Seg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.r.I2 = +b.dataset.v; updateCtl(); }));

  /* ================= ③ 송전 ================= */
  const GRID = { P: 10000, R: 2.0, volts: [200, 500, 1000, 2000, 5000, 10000] };
  const gV = () => GRID.volts[S.g.vi], gI = () => GRID.P / gV(), gLoss = () => gI() * gI() * GRID.R, gFrac = () => gLoss() / GRID.P;
  const fW = (w) => (w >= 1000 ? p3(w / 1000) + ' kW' : p3(w) + ' W');
  const fVk = (v) => (v >= 1000 ? p3(v / 1000) + ' kV' : v + ' V');
  const pct = (f) => p3(f * 100) + ' %';
  function stepGrid(dt) {
    const g = S.g; if (dt <= 0) return;
    g.heat = SciSim.approach(g.heat, Math.sqrt(clamp(gFrac() * 2, 0, 1)), dt, 6);
    g.arr = SciSim.approach(g.arr, 1 - gFrac(), dt, 6);
    g.dots += dt * (22 + 24 * Math.sqrt(gI()));
  }
  function drawGridScene() {
    const g = S.g; sceneBegin();
    const sky = ctx.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, '#dbeafe'); sky.addColorStop(1, '#f0f9ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, SC.w, 300);
    ctx.fillStyle = '#bbf7d0'; ctx.fillRect(0, 300, SC.w, 100); ctx.fillStyle = '#86efac'; ctx.fillRect(0, 300, SC.w, 5);
    // 발전소
    D.shadow(() => { D.roundRect(10, 236, 56, 64, 4); ctx.fillStyle = '#94a3b8'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.fillStyle = '#64748b'; ctx.fillRect(18, 214, 10, 24); ctx.fillRect(40, 220, 10, 18);
    for (let k = 0; k < 3; k++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.8 - k * 0.2) + ')'; ctx.beginPath(); ctx.arc(24 + k * 9 + Math.sin(S.t + k) * 3, 204 - k * 12, 7 + k * 2, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#facc15'; ctx.fillRect(22, 262, 10, 14); ctx.fillRect(44, 262, 10, 14);
    T(42, 322, '발전소', 12.5, '#26324a', 'center', 800); T(42, 338, '200 V', 11.5, '#516079', 'center', 700);
    // 변압기 상자
    const xf = (x, label, sub) => {
      D.shadow(() => { D.roundRect(x, 252, 44, 48, 6); ctx.fillStyle = '#475569'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.fillStyle = '#facc15'; ctx.fillRect(x + 8, 244, 6, 8); ctx.fillRect(x + 30, 244, 6, 8);
      T(x + 22, 280, '⚡', 18, '#facc15', 'center', 800);
      T(x + 22, 322, label, 12.5, '#26324a', 'center', 800); T(x + 22, 338, sub, 11.5, '#516079', 'center', 700);
    };
    const n = gV() / 200;
    xf(78, '승압', '1 : ' + p3(n)); xf(352, '강압', p3(n) + ' : 1');
    // 철탑 + 전선
    const px = [170, 250, 330];
    px.forEach((x) => { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 14, 300); ctx.lineTo(x, 176); ctx.lineTo(x + 14, 300); ctx.moveTo(x - 9, 250); ctx.lineTo(x + 9, 250); ctx.moveTo(x - 6, 208); ctx.lineTo(x + 6, 208); ctx.moveTo(x - 12, 176); ctx.lineTo(x + 12, 176); ctx.stroke(); });
    const pts = [[100, 244], [170, 180]];
    for (let s = 0; s < 2; s++) { const xa = px[s], xb = px[s + 1]; for (let k = 1; k <= 8; k++) { const u = k / 8; pts.push([xa + (xb - xa) * u, 180 + 12 * Math.sin(Math.PI * u)]); } }
    pts.push([374, 244]);
    const heat = g.heat, wcol = ctx.createLinearGradient(100, 0, 374, 0);
    const path = new Path2D(); pts.forEach((q, i) => (i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1])));
    if (heat > 0.05) { ctx.strokeStyle = 'rgba(239,68,68,' + (0.5 * heat) + ')'; ctx.lineWidth = 3 + 9 * heat; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(path); }
    ctx.strokeStyle = SciSim.color.mix('#6b4423', '#ef4444', heat); ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(path);
    pathDots(pts, g.dots, 26, 2.6, '#facc15');
    // 도시
    const bright = clamp(g.arr, 0, 1);
    [[404, 56, 62], [434, 44, 74], [452, 36, 50]].forEach((h, i) => {
      const x = h[0], w = h[1], hh = h[2], y = 300 - hh;
      if (i === 2) return;
      D.shadow(() => { D.roundRect(x, y, w, hh, 3); ctx.fillStyle = '#e2e8f0'; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, hh);
      for (let wy = y + 8; wy < 290; wy += 18) for (let wx = x + 6; wx < x + w - 10; wx += 16) {
        ctx.fillStyle = 'rgba(250,204,21,' + (0.12 + 0.88 * bright) + ')'; ctx.fillRect(wx, wy, 9, 10);
        if (bright > 0.6) { D.glow(wx + 4.5, wy + 5, 10, '#fde047', 0.35 * bright); }
      }
    });
    T(432, 322, '도시', 12.5, '#26324a', 'center', 800); T(432, 338, '200 V', 11.5, '#516079', 'center', 700);
    lbl(CXs, 134, '송전 전압 ' + fVk(gV()) + '  ·  선로 전류 ' + p3(gI()) + ' A', { size: 13.5, bg: '#1e3a8a', pad: 10, minX: 0, maxX: SC.w });
    lbl(CXs, 156, '전선 저항 R = 2.0 Ω', { size: 12, bg: 'rgba(255,255,255,.95)', color: '#475569', minX: 0, maxX: SC.w });
    // 아래 상자
    const mk = S.gate === 'mg2';
    [['보내는 전력', fW(GRID.P), '#1e40af', 'P = VI'], ['선로 손실', mk ? '?' : fW(gLoss()), '#b91c1c', 'I²R = ' + (mk ? '?' : pct(gFrac()))], ['도착 전력', mk ? '?' : fW(GRID.P - gLoss()), '#15803d', mk ? '' : pct(1 - gFrac())]].forEach((q, i) => {
      const x = 12 + i * 152;
      D.shadow(() => { D.roundRect(x, 352, 144, 44, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
      T(x + 72, 369, q[0], 11.5, '#64748b', 'center', 800); T(x + 72, 387, q[1] + (q[3] ? ' · ' + q[3] : ''), PHONE ? 11 : 12, q[2], 'center', 800);
    });
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, bw = STP.w - 24;
    T(bx, STP.y + 19, 'P = VI 를 보낼 때 전류 I = P / V , 손실 = I²R', PHONE ? 12 : 13.5, COL_BLUE, 'left', 800);
    T(bx, STP.y + 44, '도착', 12.5, '#26324a', 'left', 800); trackBar(bx + 44, STP.y + 32, bw - 120, 14, mk ? 0 : 1 - gFrac(), '#16a34a'); T(bx + bw, STP.y + 44, mk ? '?' : pct(1 - gFrac()), 12.5, '#26324a', 'right', 800);
    T(bx, STP.y + 66, '손실', 12.5, '#26324a', 'left', 800); trackBar(bx + 44, STP.y + 54, bw - 120, 14, mk ? 0 : gFrac(), '#ef4444'); T(bx + bw, STP.y + 66, mk ? '?' : pct(gFrac()), 12.5, '#26324a', 'right', 800);
    T(bx, STP.y + 82, '손실이 아주 작으면 막대가 거의 보이지 않아요.', 11.5, '#0b7a41', 'left', 800);
    const rows = GRID.volts.map((v, i) => { const I = GRID.P / v, L = I * I * GRID.R; return [fVk(v), mk ? '' : p3(I) + ' A', mk ? '' : fW(L), i === S.g.vi ? '#9a3412' : '#516079']; });
    infoPanel([
      { h: '송전과 변압기' },
      { p: '같은 전력 P = VI를 보낼 때 전압 V를 높이면 전류 I가 줄고, 손실 I²R은 I²에 비례해 크게 줄어요.' },
      { tbl: rows, cur: S.g.vi, c1: 0.34 },
      { p: '우리나라는 765 kV, 345 kV, 154 kV 송전망으로 보내고, 변전소와 전봇대 변압기로 220 V까지 낮춰요. 교류는 변압기로 전압을 쉽게 바꿀 수 있어요.', c: '#0b7a41', big: 1 },
    ]);
  }
  bindSl('sV', () => S.g.vi, (v) => { S.g.vi = v; }, updateCtl);

  /* ================= ④ 인덕터 ================= */
  const IND = { V: 12, R: 24, I0: 0.5, Lair: 0.5, Lcore: 2.0, slow: 10, topen: 0.010 };
  const Lcur = () => (S.i.core ? IND.Lcore : IND.Lair);
  function toggleSwI() {
    const s = S.i; Sound.click();
    if (!s.closed) { s.closed = true; s.opening = false; }
    else {
      s.closed = false;
      if (s.I > 0.003) {
        s.opening = true; s.Iopen = s.I; const L = Lcur(), eps0 = L * s.Iopen / IND.topen;
        s.flash = Math.max(s.flash, clamp(eps0 / 100, 0, 1.3)); s.lastEps = 'ε = L × ΔI/Δt = ' + L.toFixed(1) + ' × ' + s.Iopen.toFixed(2) + ' / ' + IND.topen.toFixed(3) + ' = ' + p3(eps0) + ' V';
        s.epsEvent = eps0;
        if (s.core && eps0 >= 90) s.seenFlash = true;
        parts.burst(SC.x + 275, SC.y + 160, { count: Math.round(6 + 14 * clamp(eps0 / 100, 0, 1)), speed: 90 + 90 * clamp(eps0 / 100, 0, 1), colors: ['#fb923c', '#fde047', '#fff7ed'], life: 0.6, gravity: 80, size: 3, shape: 'star' });
        Sound.success();
      }
    }
    updateCtl();
  }
  function toggleCore() { const s = S.i; s.core = !s.core; Sound.click(); updateCtl(); }
  function indReset(core, closed, steady) {
    const s = S.i; s.core = !!core; s.closed = !!closed; s.opening = false; s.I = steady ? IND.I0 : 0; s.eps = 0; s.vL = 0; s.flash = 0; s.hist = []; s.lastEps = ''; s.epsEvent = 0;
    s.coreSp = s.coreSp || new SciSim.Spring(0, { stiffness: 120, damping: 14 }); s.coreSp.value = s.core ? 1 : 0; s.coreSp.target = s.coreSp.value; s.coreSp.velocity = 0;
  }
  function stepInd(dt) {
    const s = S.i; if (dt <= 0) return;
    if (!s.coreSp) indReset(false, false, false);
    const L = Lcur(), n = Math.max(1, Math.ceil(dt / 0.01)), h = dt / n / IND.slow;
    for (let k = 0; k < n; k++) {
      if (s.closed) { s.I += (IND.V - IND.R * s.I) / L * h; s.vL = IND.V - IND.R * s.I; s.eps = 0; }
      else if (s.opening) {
        const rate = s.Iopen / IND.topen; s.I -= rate * h;
        if (s.I <= 0) { s.I = 0; s.opening = false; s.vL = 0; } else s.vL = -L * rate;
      } else { s.vL = 0; }
    }
    if (s.closed && s.I >= 0.4) s.seenClose = true;
    s.coreSp.target = s.core ? 1 : 0; s.coreSp.update(dt);
    if (!s.opening) s.flash = SciSim.approach(s.flash, 0, dt, 3.2);
    s.ph += dt * (s.closed ? s.I * 70 : 0);
    s.glow = SciSim.approach(s.glow, clamp(s.I / IND.I0, 0, 1) * (L / IND.Lcore * 0.7 + 0.3), dt, 8);
    s.acc += dt;
    while (s.acc >= 1 / 60) { s.acc -= 1 / 60; s.hist.push([s.I, s.vL]); if (s.hist.length > 330) s.hist.shift(); }
  }
  const indMask = () => S.gate === 'mi2';
  const fVL = (v) => (Math.abs(v) < 0.05 ? '0 V' : (v >= 0 ? '+' : '−') + p3(Math.abs(v)) + ' V');
  function drawInd() {
    const s = S.i, L = Lcur(); sceneBegin();
    if (!s.coreSp) indReset(false, false, false);
    const cs = s.coreSp.value;
    // 도선
    const w = new Path2D();
    w.moveTo(50, 158); w.lineTo(50, 100); w.lineTo(110, 100); w.moveTo(160, 100); w.lineTo(215, 100); w.moveTo(335, 100); w.lineTo(420, 100); w.lineTo(420, 148);
    w.moveTo(420, 192); w.lineTo(420, 230); w.lineTo(50, 230); w.lineTo(50, 176);
    w.moveTo(215, 100); w.lineTo(215, 160); w.lineTo(252, 160); w.moveTo(298, 160); w.lineTo(335, 160); w.lineTo(335, 100);
    wireStroke(w, 2.8, s.closed ? s.I / IND.I0 * 0.4 : 0);
    // 전지
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(36, 158); ctx.lineTo(64, 158); ctx.stroke(); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(42, 176); ctx.lineTo(58, 176); ctx.stroke();
    T(24, 156, '+', 14, '#dc2626', 'center', 800); T(24, 186, '−', 14, '#2563eb', 'center', 800); T(78, 172, '12 V', 12.5, '#334155', 'left', 800);
    // 스위치
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(110, 100, 3.8, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(160, 100, 3.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(110, 100); ctx.lineTo(s.closed ? 160 : 154, s.closed ? 100 : 74); ctx.stroke();
    T(135, 124, s.closed ? '닫힘' : '열림', 12, s.closed ? '#16a34a' : '#64748b', 'center', 800);
    // 코일 둘레 자기장 (저장되는 에너지)
    const glow = clamp(s.glow, 0, 1);
    if (glow > 0.03) for (let k = 0; k < 3; k++) { ctx.strokeStyle = 'rgba(124,58,237,' + (glow * (0.65 - k * 0.17)) + ')'; ctx.lineWidth = 2.4; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -s.ph; ctx.beginPath(); ctx.ellipse(275, 100, 76 + k * 16, 36 + k * 16, 0, 0, TAU); ctx.stroke(); }
    ctx.setLineDash([]);
    // 철심 (미끄러져 들어옴)
    const cy = 100 - 62 * (1 - cs);
    D.shadow(() => { D.roundRect(222, cy - 9, 106, 18, 5); ctx.fillStyle = '#94a3b8'; ctx.fill(); }, { blur: 5, y: 2 });
    const cg = ctx.createLinearGradient(0, cy - 9, 0, cy + 9); cg.addColorStop(0, '#cbd5e1'); cg.addColorStop(1, '#64748b'); D.roundRect(222, cy - 9, 106, 18, 5); ctx.fillStyle = cg; ctx.fill();
    T(275, cs > 0.5 ? 140 : cy - 14, '철심', 11.5, '#475569', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    // 코일 고리
    for (let i = 0; i < 8; i++) { const x = 226 + i * 14; const p = new Path2D(); p.ellipse(x, 100, 7, 26, 0, -Math.PI / 2, Math.PI / 2); wireStroke(p, 3.2, glow * 0.4); }
    T(275, 76 - 2 + (cs > 0.5 ? -14 : 0), 'L = ' + L.toFixed(1) + ' H' + (s.core ? ' (철심)' : ' (공심)'), 12.5, '#7c2d12', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    // 전구
    drawBulb(420, 170, 17, clamp(s.I / IND.I0, 0, 1));
    T(450, 174, '전구', 11.5, '#475569', 'right', 800);
    // 네온 램프 (코일과 병렬)
    const fl = clamp(s.flash, 0, 1.3);
    ctx.fillStyle = 'rgba(241,245,249,.95)'; D.roundRect(252, 148, 46, 24, 11); ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.stroke();
    if (fl > 0.04) { D.glow(275, 160, 34 + 30 * fl, '#fb923c', clamp(0.9 * fl, 0, 0.95)); ctx.fillStyle = 'rgba(251,146,60,' + clamp(0.5 + 0.5 * fl, 0, 1) + ')'; D.roundRect(254, 150, 42, 20, 9); ctx.fill(); }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(258, 160); ctx.lineTo(268, 160); ctx.moveTo(282, 160); ctx.lineTo(292, 160); ctx.stroke();
    T(275, 190, '네온 램프', 11.5, '#475569', 'center', 800);
    // 전류 점
    if (s.closed && s.I > 0.01) pathDots([[50, 158], [50, 100], [420, 100], [420, 230], [50, 230], [50, 176]], s.ph, 26, 2.8, '#f59e0b');
    else if (s.opening) pathDots([[215, 100], [335, 100], [335, 160], [215, 160], [215, 100]], S.t * 60, 22, 2.8, '#fb923c');
    // 기록 그래프
    D.shadow(() => { D.roundRect(10, 246, 452, 146, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    const gx0 = 52, gx1 = 452, gy0 = 276, gy1 = 372, N = 330;
    T(20, 266, '전류 I (주황, 왼쪽 눈금)와 코일 양단 전압 (보라, 오른쪽 눈금)', 11.5, COL_BLUE, 'left', 800);
    ctx.strokeStyle = '#e8edf5'; ctx.lineWidth = 1; for (let k = 0; k <= 4; k++) { const y = gy0 + k * (gy1 - gy0) / 4; ctx.beginPath(); ctx.moveTo(gx0, y); ctx.lineTo(gx1, y); ctx.stroke(); }
    [0, 0.25, 0.5].forEach((v) => T(gx0 - 4, gy1 - v / 0.6 * (gy1 - gy0) + 4, v.toFixed(2), 10.5, '#ea580c', 'right', 700));
    ctx.save(); ctx.beginPath(); ctx.rect(gx0, gy0 - 4, gx1 - gx0, gy1 - gy0 + 8); ctx.clip();
    const vmap = (v) => gy1 - (clamp(v, -120, 120) + 120) / 240 * (gy1 - gy0) * 1; const imap = (i) => gy1 - i / 0.6 * (gy1 - gy0);
    const dx = (gx1 - gx0) / N, off = N - s.hist.length;
    ctx.lineJoin = 'round'; ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#a78bfa'; ctx.beginPath(); s.hist.forEach((q, i) => { const x = gx0 + (off + i) * dx, y = vmap(q[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    ctx.strokeStyle = '#f97316'; ctx.beginPath(); s.hist.forEach((q, i) => { const x = gx0 + (off + i) * dx, y = imap(q[0]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    ctx.restore();
    T(gx1 - 4, gy0 + 12, '+120 V', 10.5, '#7c3aed', 'right', 700); T(gx1 - 4, gy1 - 4, '−120 V', 10.5, '#7c3aed', 'right', 700);
    const vtxt = indMask() ? '?' : fVL(s.vL);
    lbl(352, 208, indMask() ? '코일 양단 전압: ?' : '코일 양단 전압 ' + vtxt, { size: 12, bg: s.vL < -5 ? '#7c3aed' : 'rgba(241,245,249,.97)', color: s.vL < -5 ? '#fff' : '#475569', minX: 0, maxX: SC.w });
    if (!s.closed && !s.opening && s.I === 0 && !s.hist.length) lbl(CXs, 52, '🔌 스위치를 닫아 보세요', { size: 13, bg: 'rgba(255,255,255,.95)', color: '#9a3412', minX: 0, maxX: SC.w });
    if (s.lastEps && !indMask()) lbl(CXs, 52, s.lastEps, { size: 12, bg: 'rgba(255,255,255,.96)', color: '#6d28d9', minX: 0, maxX: SC.w });
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, bw = STP.w - 24, E = 0.5 * L * s.I * s.I;
    T(bx, STP.y + 20, '|ε| = L |ΔI| / Δt   (L이 클수록, 전류가 급히 변할수록 커요)', PHONE ? 11.5 : 13, COL_BLUE, 'left', 800);
    T(bx, STP.y + 44, '전구 밝기', 12.5, '#26324a', 'left', 800); trackBar(bx + 80, STP.y + 32, bw - 80, 14, s.I / IND.I0, '#f59e0b');
    T(bx, STP.y + 66, '코일에 저장된 에너지 ½LI² = ' + (E * 1000).toFixed(0) + ' mJ', 12.5, '#26324a', 'left', 800);
    T(bx, STP.y + 84, s.closed ? '닫은 뒤 전류가 서서히 늘어요 (코일이 급한 증가를 방해).' : s.opening ? '전류를 급히 끊으니 코일이 유지하려고 큰 전압을 만들어요!' : '스위치를 열면 코일이 전류를 유지하려 해요.', 11.5, '#0b7a41', 'left', 800);
    infoPanel([
      { h: '인덕터 (코일)' },
      { p: '전류가 변하면 코일을 지나는 자기선속이 변해서 그 변화를 방해하는 기전력이 생겨요: ε = −L ΔI/Δt (L: 인덕턴스, 단위 H).', c: COL_BLUE },
      { tbl: [['스위치 닫을 때', '전류 서서히 ↑', '전구 천천히'], ['열 때', '전류 급히 ↓', '큰 ε → 스파크'], ['철심 넣으면', 'L 증가', '방해가 커져요']], c1: 0.4 },
      { p: '예) L = 2.0 H, 0.50 A가 0.010 s에 0이 되면 |ε| = 2.0 × 0.50 / 0.010 = 100 V. 전지는 12 V뿐이에요!', c: '#6d28d9', big: 1 },
      { p: '인덕터는 전류를 “막는” 저항이 아니라 전류의 “변화”를 방해해요. 자동차 점화 코일, 형광등 안정기, 필터에 쓰여요.', c: '#0b7a41', big: 1 },
    ]);
  }
  $('#bSwI').addEventListener('click', toggleSwI);
  $('#bCore').addEventListener('click', toggleCore);

  /* ---------- 화면 전환 · 조작 상태 ---------- */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const a = S.a, r = S.r, g = S.g, i = S.i;
    $$('#srcSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === a.src));
    $('#bSw').textContent = a.sw ? '⏻ 스위치 끄기' : '⏻ 스위치 켜기'; $('#bSw').classList.toggle('btn-primary', !a.sw);
    $('#trNote').textContent = '화면은 실제(60 Hz)보다 느리게 보여 줘요.';
    setRange('sN1', r.N1, 10, 1000, (v) => v + '회'); setRange('sN2', r.N2, 10, 1000, (v) => v + '회');
    $('#sN1M').disabled = r.N1 <= 10; $('#sN1P').disabled = r.N1 >= 1000; $('#sN2M').disabled = r.N2 <= 10; $('#sN2P').disabled = r.N2 >= 1000;
    $$('#v1Seg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === r.V1));
    $$('#i2Seg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === r.I2));
    setRange('sV', g.vi, 0, 5, (v) => fVk(GRID.volts[v])); $('#sVM').disabled = g.vi <= 0; $('#sVP').disabled = g.vi >= 5;
    $('#bSwI').textContent = i.closed ? '🔌 스위치 열기' : '🔌 스위치 닫기'; $('#bSwI').classList.toggle('btn-primary', true);
    $('#bCore').textContent = i.core ? '🧲 철심 빼기' : '🧲 철심 넣기';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  function readouts() {
    let a, b, c; const m = S.mode;
    if (m === 'tr') { const s = S.a; a = ['전원 · 스위치', (s.src === 'ac' ? '교류' : '직류') + ' · ' + (s.sw ? 'ON' : 'OFF')]; b = ['V₁ : V₂', TR.n1 + ' : ' + TR.n2]; c = ['2차 전구', bulbB() > 0.6 ? '켜짐' : bulbB() > 0.05 ? '깜빡임' : '꺼짐']; }
    else if (m === 'ratio') { const r = S.r, mk = S.gate === 'mr2'; a = ['V₁ → V₂', fV(r.V1) + ' → ' + fV(rV2()) + ' V']; b = ['N₁ : N₂', r.N1 + ' : ' + r.N2]; c = ['I₁ → I₂', (mk ? '?' : fI(rI1())) + ' → ' + fI(r.I2) + ' A']; }
    else if (m === 'grid') { const mk = S.gate === 'mg2'; a = ['송전 전압', fVk(gV())]; b = ['선로 전류', mk ? '?' : p3(gI()) + ' A']; c = ['선로 손실', mk ? '?' : fW(gLoss()) + ' (' + pct(gFrac()) + ')']; }
    else { const s = S.i, L = Lcur(); a = ['인덕턴스 L', L.toFixed(1) + ' H (' + (s.core ? '철심' : '공심') + ')']; b = ['전류 I', fI(s.I) + ' A']; c = ['코일 양단 전압', indMask() ? '?' : fVL(s.vL)]; }
    [[l1, v1, a], [l2, v2, b], [l3, v3, c]].forEach((z) => { if (z[0].textContent !== z[2][0]) z[0].textContent = z[2][0]; if (z[1].textContent !== z[2][1]) z[1].textContent = z[2][1]; });
  }

  /* ---------- 입력 도구 ---------- */
  const selTR = [['직류 전원을 켜 둔 뒤에는 2차 전구가 꺼지는 까닭은?', ['선속이 일정해서 변화가 없으므로 유도 기전력이 생기지 않아요', '직류는 전압이 낮아서 철심을 지나지 못해요', '직류는 1차 코일에 전류가 흐르지 않아요'], 0]];
  const numI1 = makePlain($('#numRHost'), '출력이 5.0 V, 2.0 A이고 입력이 220 V일 때 1차 코일에 흐르는 입력 전류 I₁ (이상적인 변압기)', 'I₁ =', 'A');
  const numG1 = makePlain($('#numGHost'), '① 10 kW를 200 V로 보낼 때 선로 전류 I', 'I =', 'A');
  const numG2 = makePlain($('#numGHost'), '② 저항 2.0 Ω인 전선에서의 손실 I²R', '손실 =', 'kW');
  const selGR = [['송전에 교류를 쓰는 까닭은?', ['변압기로 전압을 쉽게 올리고 내릴 수 있어서예요', '교류는 저항이 0이라 손실이 없어서예요', '직류는 전선을 지나지 못해서예요'], 0]];
  const numIe = makePlain($('#numIHost'), 'L = 2.0 H 코일에 흐르던 0.50 A가 0.010 s 만에 0이 될 때 코일에 생기는 기전력의 크기', '|ε| =', 'V');
  const selIR = [
    ['스위치를 열 때 스파크(네온 번쩍임)가 생기는 까닭은?', ['코일이 전류가 급히 끊어지는 것을 방해해 큰 기전력을 만들기 때문이에요', '전지의 전압이 갑자기 커지기 때문이에요', '전구가 에너지를 한꺼번에 내놓기 때문이에요'], 0],
    ['인덕터에 대한 설명으로 옳은 것은?', ['전류의 “변화”를 방해해요 (일정한 전류는 거의 막지 않아요)', '전류가 흐르는 것을 항상 막는 저항이에요', '전류를 늘려 주는 증폭기예요'], 0],
  ];
  const selT = { st: {}, ok: {} }, selG = { st: {}, ok: {} }, selI = { st: {}, ok: {} };
  const selTs = makeSelects($('#selTHost'), selTR, selT.st, selT.ok);
  const selGs = makeSelects($('#numGHost'), selGR, selG.st, selG.ok);
  const selIs = makeSelects($('#numIHost'), selIR, selI.st, selI.ok);
  function setAc(src, sw) { const a = S.a; a.src = src; a.sw = sw; a.ph = 0; a.h1 = []; a.h2 = []; a.lit = 0; a.dcTried = false; a.pw = 0; }

  /* ================= 미션 ================= */
  const MS = {};
  const levels = [
    {
      title: '변압기: 변하는 선속이 전압을 만들어요', short: '변압기', icon: '🔌', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 발전소에서 우리 집까지 전기를 보내려면 왜 전압을 바꿔야 할까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시 「패러데이와 자기 브레이크」</b>에서 선속이 변하면 ε = −NΔΦ/Δt의 기전력이 유도된다고 배웠어요. 물리학 「무선 충전의 원리」에서는 감은 수 비에 따라 전압이 달라진다고만 보았어요. 이번에는 그 원리를 식으로 정리해요.</div>' +
        '<p><b>변압기</b>는 철심에 감은 두 코일로 이루어져요. 1차 코일에 <b>교류</b>를 흘리면 철심 속 선속이 계속 변하고, 같은 선속이 지나는 2차 코일에 교류 기전력이 유도돼요. 직류에서는 어떻게 될까요? 오실로스코프로 두 전압의 파형을 비교해 봐요.</p>',
      features: ['tr'],
      setup() { S.gate = ''; setAc('ac', false); setScene('tr'); },
      recap: '변압기는 상호 유도로 작동해요. 교류는 철심의 선속을 계속 바꿔 2차에 전압을 만들지만, 일정한 직류는 선속이 변하지 않아 전압을 만들지 못해요.',
      summary: '<ul><li><b>변압기</b>: 철심에 감은 1차·2차 코일. 1차에 교류를 흘리면 선속이 변하고 2차에 교류 기전력이 유도돼요(상호 유도).</li><li>직류를 계속 흘리면 선속이 일정해서 2차 전압이 <b>0</b>이에요. 켜고 끄는 순간에만 선속이 변해 잠깐 전압이 생겨요.</li><li>같은 선속이 두 코일을 지나서 전압은 감은 수에 비례해요(V ∝ N).</li><li>변압기는 에너지를 만들지 않아요. 전압을 올리면 전류는 그만큼 줄어요.</li></ul>',
      missions: [
        {
          title: '교류로 2차 전구 켜기',
          goal: '전원을 <b>교류</b>로 하고 스위치를 켜서 2차 코일의 전구를 계속 켜 보세요. 오실로스코프 파형도 살펴봐요.',
          hint: '⚡ 전원에서 ∿ 교류를 고르고 ⏻ 스위치 켜기를 눌러요. 철심 속 노란 화살표가 오가고, 2차 파형(주황)이 1차(파랑)의 2배 높이로 나타나요.',
          setup() { S.gate = ''; setAc('ac', false); setScene('tr'); },
          check: () => S.a.lit > 0.5, hold: 0.4,
          status: () => mark(S.a.src === 'ac') + ' 교류 &nbsp; ' + mark(S.a.sw) + ' 스위치 ON &nbsp; ' + mark(S.a.lit > 0.5) + ' 전구 켜짐',
          explain: '교류를 흘리면 1차 코일의 전류가 계속 변하고, 철심 속 선속도 계속 변해요. 그 선속이 2차 코일을 지나므로 2차 코일에 교류 기전력이 유도돼 전구가 켜져요. 감은 수가 1 : 2라서 2차 파형의 높이도 2배예요.',
        },
        {
          title: '직류에서 전구가 꺼지는 까닭', manual: true,
          goal: '<b>🔋 직류</b>로 바꿔 스위치를 켜 보고(켜는 순간 전구가 어떻게 되나요?), 켜 둔 뒤 전구가 꺼지는 까닭을 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '직류를 켜면 선속이 0에서 일정한 값으로 변하는 “순간”에만 2차 전압이 생겨요. 선속이 일정해진 뒤에는 ΔΦ/Δt = 0이에요.',
          setup() { S.gate = 'mt2'; setAc('dc', false); resetSels(selTs, selT.st, selT.ok); setScene('tr'); },
          check: () => (!S.a.dcTried ? '먼저 🔋 직류로 두고 ⏻ 스위치를 켜 보세요. (켜는 순간과 켜 둔 뒤를 비교해 봐요)' : checkSel(selTR, selT.st, selT.ok, selTs, '다시 생각해 보세요. 2차 코일에 전압이 생기려면 선속이 어떻게 되어야 할까요?')),
          status: () => mark(S.a.dcTried) + ' 직류 켜 보기 &nbsp; ' + mark(!!selT.st[0]) + ' 까닭 고르기',
          explain: '직류가 일정하게 흐르면 철심의 선속이 일정해서 ΔΦ = 0이에요. ε = −NΔΦ/Δt = 0이므로 2차 전압이 없고 전구는 꺼져요. 스위치를 켜고 끄는 순간에만 선속이 변해서 잠깐 전압이 유도돼요.',
        },
        {
          type: 'quiz', title: '승압 변압기는 에너지를 만들까?',
          goal: '전압을 2배로 높이는 <b>승압 변압기</b>는 전력을 늘려 줄까요?',
          setup() { S.gate = ''; setAc('ac', true); setScene('tr'); },
          choices: ['아니요 — 전압이 커지면 전류가 그만큼 줄어 전력(V × I)은 같아요', '네 — 전압이 커진 만큼 전력도 늘어나요', '네 — 철심이 에너지를 보태 줘요', '아니요 — 승압 변압기는 전류를 늘려요'],
          answer: 0,
          feedback: ['', '전압만 보면 2배지만 전류가 1/2로 줄어요. 전력 = 전압 × 전류는 같아요.', '철심은 선속의 통로일 뿐 에너지를 더하지 않아요.', '전압이 올라가면 전류는 줄어요. 전류를 늘리는 것은 강압 변압기예요.'],
          explain: '변압기는 에너지를 새로 만들지 못해요. 이상적인 변압기에서는 입력 전력 V₁I₁과 출력 전력 V₂I₂가 같아서, 전압이 2배가 되면 전류는 1/2배가 돼요. (다음 단계에서 계산해 봐요.)',
        },
      ],
    },
    {
      title: '권선비: V₁ : V₂ = N₁ : N₂', short: '권선비', icon: '🔢', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 선속이 두 코일을 지나는 변압기를 봤어요. 코일의 감은 수 N이 다르면 유도 기전력 ε = NΔΦ/Δt도 달라질 거예요. 이제 숫자로 확인해요.</div>' +
        '<p>이상적인 변압기에서 <b>V₁ / V₂ = N₁ / N₂</b>이고, 에너지 보존 <b>V₁I₁ = V₂I₂</b> 때문에 <b>I₁ / I₂ = N₂ / N₁</b>이에요. 감은 수와 입력 전압을 바꾸며 출력 전압과 전류를 읽어 봐요. 휴대폰 충전기(220 V → 5.0 V)를 직접 만들어요.</p>',
      features: ['ratio'],
      setup() { S.gate = ''; Object.assign(S.r, { N1: 200, N2: 100, V1: 220, I2: 1 }); setScene('ratio'); },
      recap: 'V₁ : V₂ = N₁ : N₂, V₁I₁ = V₂I₂ 이므로 I₁ : I₂ = N₂ : N₁. 감은 수가 많은 쪽이 고전압·저전류예요.',
      summary: '<ul><li>이상적인 변압기: <b>V₁ / V₂ = N₁ / N₂</b>, <b>V₁I₁ = V₂I₂</b> → <b>I₁ / I₂ = N₂ / N₁</b>.</li><li>휴대폰 충전기: N₁ : N₂ = 44 : 1, V₁ = 220 V → V₂ = <b>5.0 V</b>. 출력 5.0 V × 2.0 A = 10 W → 입력 전류 I₁ = 10 / 220 ≈ <b>0.045 A</b>.</li><li>승압 예: N₁ = 100, N₂ = 1000, V₁ = 22 kV → 220 kV.</li><li>현실의 변압기는 코일 저항, 철심의 와전류(얇은 판을 겹쳐 줄여요), 누설 선속 때문에 효율이 95~99 %예요.</li></ul>',
      missions: [
        {
          title: '220 V → 5.0 V 만들기',
          goal: '입력 전압 <b>220 V</b>에서 출력 전압 <b>V₂ = 5.0 V</b>가 되도록 감은 수 N₁, N₂를 정해 보세요.',
          hint: 'V₂ = V₁ × N₂ / N₁ = 220 × N₂ / N₁. N₁ : N₂ = 44 : 1 이면 돼요. 예를 들어 N₁ = 440회, N₂ = 10회예요.',
          setup() { S.gate = ''; Object.assign(S.r, { N1: 200, N2: 100, V1: 220, I2: 1 }); setScene('ratio'); },
          check: rOK, hold: 0.8,
          status: () => mark(S.r.V1 === 220) + ' V₁ = ' + fV(S.r.V1) + ' V &nbsp; ' + mark(rOK()) + ' V₂ = ' + fV(rV2()) + ' V (목표 5.0 V)',
          explain: 'V₁ / V₂ = N₁ / N₂ 에서 220 / 5.0 = 44 이므로 N₁ : N₂ = <b>44 : 1</b>이어야 해요. N₁ = 440, N₂ = 10 처럼 1차 코일을 44배 더 많이 감아요. 감은 수의 비는 전압의 비와 같아요.',
        },
        {
          title: '입력 전류 계산하기', manual: true,
          goal: '충전기가 <b>5.0 V, 2.0 A</b>를 내보내고 입력이 <b>220 V</b>일 때, 이상적인 변압기의 입력 전류 I₁을 계산해 입력한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '출력 전력 V₂I₂ = 5.0 × 2.0 = 10 W. 이상적이면 입력 전력도 10 W이므로 I₁ = 10 / 220 이에요. 약 0.045 A예요.',
          setup() { S.gate = 'mr2'; Object.assign(S.r, { N1: 440, N2: 10, V1: 220, I2: 2 }); numI1.clear(); setScene('ratio'); },
          check: () => checkNum(numI1, 10 / 220, 0.05, '다시 계산해 보세요. V₁I₁ = V₂I₂ = 10 W 이므로 I₁ = 10 / 220 이에요.'),
          status: () => '입력 전류는 가려 두었어요 (V₂ = 5.0 V, I₂ = 2.0 A, V₁ = 220 V)',
          explain: 'V₁I₁ = V₂I₂ = 5.0 × 2.0 = 10 W 이므로 I₁ = 10 / 220 ≈ <b>0.045 A</b>예요. 전류의 비 I₁ : I₂ = 0.045 : 2.0 ≈ 1 : 44 = N₂ : N₁ 이에요. 전압이 44배 낮아진 만큼 전류는 44배 커졌어요.',
        },
        {
          type: 'quiz', title: '감은 수가 많은 쪽',
          goal: '변압기에서 감은 수가 <b>많은 쪽</b>이 고전압·<b>저전류</b>인 까닭은?',
          setup() { S.gate = ''; Object.assign(S.r, { N1: 200, N2: 100, V1: 220, I2: 1 }); setScene('ratio'); },
          choices: ['입력 전력과 출력 전력이 같아야 하므로 전압이 크면 전류가 작아야 해요 (V₁I₁ = V₂I₂)', '감은 수가 많으면 코일의 저항이 커서 전류가 줄어요', '감은 수가 많은 쪽에서 에너지가 더 많이 만들어져요', '철심이 전류를 막아서 전압만 커져요'],
          answer: 0,
          feedback: ['', '실제 코일 저항은 작은 손실만 만들어요. 전류가 줄어드는 근본 이유는 에너지(전력) 보존이에요.', '변압기는 에너지를 만들어 내지 못해요.', '철심은 선속의 통로이지 전류를 막지 않아요.'],
          explain: 'V₁I₁ = V₂I₂ (에너지 보존)이므로 전압이 큰 쪽은 전류가 작아요. 그래서 I₁ / I₂ = V₂ / V₁ = N₂ / N₁ 이에요. 이 성질 덕분에 높은 전압으로 보내면 전선에 흐르는 전류가 작아져요 (다음 단계).',
        },
      ],
    },
    {
      title: '송전: 고전압으로 손실을 줄여요', short: '송전', icon: '🏙️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 변압기가 전력을 보존하면서 전압을 높이면 전류가 줄어든다는 것을 알았어요. 물리학 「소비 전력과 전기 안전」의 열 손실 P = I²R을 떠올려 봐요.</div>' +
        '<p>발전소가 <b>10 kW</b>를 저항 <b>2.0 Ω</b>인 전선으로 보내요. 같은 전력 P = VI를 보낼 때 송전 전압 V를 바꾸면 전류 I와 손실 I²R이 어떻게 달라질까요? 승압·강압 변압기를 지나는 송전 과정을 보며 계산해 봐요.</p>',
      features: ['grid'],
      setup() { S.gate = ''; S.g.vi = 0; setScene('grid'); },
      recap: '같은 전력을 보낼 때 전압을 10배로 올리면 전류는 1/10, 손실 I²R은 1/100이 돼요. 그래서 고전압으로 보내요.',
      summary: '<ul><li>송전 전력 P = VI 이므로 선로 전류 I = P / V. 선로 손실은 <b>P손실 = I²R</b>.</li><li>예) 10 kW, R = 2.0 Ω: V = 200 V → I = 50 A, 손실 <b>5.0 kW (50 %)</b>. V = 10 kV → I = 1.0 A, 손실 2.0 W (0.02 %).</li><li>전압을 10배로 올리면 I는 1/10, 손실은 <b>1/100</b>.</li><li>교류는 변압기로 전압을 쉽게 올리고 내릴 수 있어서 송전에 쓰여요. 우리나라는 765 kV, 345 kV, 154 kV 송전망을 쓰고 변전소와 주상 변압기로 220 V까지 낮춰요.</li></ul>',
      missions: [
        {
          title: '손실이 가장 작은 송전 전압',
          goal: '송전 전압 슬라이더를 움직여 선로 <b>손실이 가장 작은</b> 전압을 골라 보세요.',
          hint: '전압이 높을수록 전류가 줄어 손실 I²R이 줄어요. 가장 높은 10 kV일 때 손실은 2.0 W예요.',
          setup() { S.gate = ''; S.g.vi = 0; setScene('grid'); },
          check: () => S.g.vi === 5, hold: 0.6,
          status: () => mark(S.g.vi === 5) + ' V = ' + fVk(gV()) + ' → 손실 ' + fW(gLoss()) + ' (' + pct(gFrac()) + ')',
          explain: '10 kW를 10 kV로 보내면 I = P / V = 1.0 A, 손실 I²R = 1.0² × 2.0 = <b>2.0 W</b> (0.02 %)예요. 200 V일 때 50 A, 손실 5.0 kW(50 %)와 비교해 보세요. 전선이 달아오르는 모습도 사라졌죠?',
        },
        {
          title: '200 V 송전의 손실 계산', manual: true,
          goal: '10 kW를 <b>200 V</b>로 보낼 때 선로 전류 I와 손실 I²R(저항 2.0 Ω)을 계산하고, 질문에 답한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'I = P / V = 10000 / 200. 손실 = I²R = I² × 2.0 을 kW로 나타내요.',
          setup() { S.gate = 'mg2'; S.g.vi = 0; numG1.clear(); numG2.clear(); resetSels(selGs, selG.st, selG.ok); setScene('grid'); },
          check: () => {
            const a = checkNum(numG1, 50, 0.03, 'I = P / V = 10000 / 200 을 계산해 보세요.');
            const b = checkNum(numG2, 5.0, 0.03, '손실 = I²R = 50² × 2.0 = ? W 를 kW로 나타내 보세요.');
            const c = checkSel(selGR, selG.st, selG.ok, selGs, '송전에 교류를 쓰는 까닭을 다시 생각해 보세요. (변압기)');
            if (a !== true) return a; if (b !== true) return b; return c;
          },
          status: () => '손실 값은 가려 두었어요 (P = 10 kW, V = 200 V, R = 2.0 Ω)',
          explain: 'I = P / V = 10000 / 200 = <b>50 A</b>, 손실 I²R = 50² × 2.0 = 5000 W = <b>5.0 kW</b>로 보낸 전력의 절반이에요. 교류는 변압기로 전압을 쉽게 올리고 내릴 수 있어서 송전에 써요.',
        },
        {
          type: 'quiz', title: '전압을 10배 올리면 손실은?',
          goal: '같은 전력을 보내면서 송전 전압을 <b>10배</b>로 올리면 선로 손실은 몇 배가 될까요?',
          setup() { S.gate = ''; S.g.vi = 0; setScene('grid'); },
          choices: ['1/100배 (전류가 1/10이 되고 손실은 전류의 제곱에 비례)', '1/10배', '10배', '변하지 않아요'],
          answer: 0,
          feedback: ['', '전류가 1/10이 되는 것은 맞지만 손실은 I²R이라서 전류의 “제곱”에 비례해요.', '전압이 올라가면 같은 전력에서 전류가 줄어 손실이 줄어요.', 'R은 그대로여도 I가 달라지므로 I²R이 변해요.'],
          explain: 'P = VI 이므로 V를 10배로 올리면 I는 1/10이 되고, 손실 I²R은 I²에 비례해 <b>1/100</b>이 돼요. 200 V(5.0 kW)에서 2000 V로 올리면 50 W가 되는 것을 슬라이더로도 확인했어요.',
        },
      ],
    },
    {
      title: '인덕터: 전류의 변화를 방해해요', short: '인덕터', icon: '🌀', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 변하는 선속이 코일에 기전력을 만드는 것을 변압기에서 이용했어요. 이번에는 <b>코일 자신</b>에 흐르는 전류가 변할 때를 살펴봐요(자체 유도).</div>' +
        '<p>코일에 흐르는 전류가 변하면 코일을 지나는 자기선속도 변해서 그 변화를 <b>방해하는</b> 기전력 ε = −L ΔI/Δt가 생겨요(L: 인덕턴스, 단위 H). 스위치를 닫을 때와 열 때 전구와 네온 램프가 어떻게 되는지 보고, 철심을 넣어 L을 키워 봐요.</p>',
      features: ['ind'],
      setup() { S.gate = ''; indReset(false, false, false); S.i.seenClose = false; S.i.seenFlash = false; setScene('ind'); },
      recap: '인덕터는 전류의 “변화”를 방해해요. 전류가 서서히 늘고, 급히 끊으면 큰 기전력이 생겨요. L이 클수록 방해가 커요.',
      summary: '<ul><li><b>자체 유도</b>: 코일 전류가 변하면 그 변화를 방해하는 기전력 <b>ε = −L ΔI/Δt</b> (L: 자체 인덕턴스, 단위 H)가 생겨요.</li><li>스위치를 닫으면 전류가 <b>서서히</b> 늘어 전구가 천천히 밝아져요. 철심을 넣으면 L이 커져서 더 느려져요.</li><li>스위치를 열어 전류를 급히 끊으면 큰 기전력이 생겨요. 예) L = 2.0 H, 0.50 A → 0이 0.010 s: |ε| = 2.0 × 0.50 / 0.010 = <b>100 V</b> (전지는 12 V뿐!). 네온 램프가 번쩍여요.</li><li>인덕터는 전류를 “막는” 저항이 아니라 전류의 <b>변화</b>를 방해해요. 자동차 점화 코일은 이 원리로 12 V에서 수 kV 이상을 만들고, 필터·초크 코일은 빠르게 변하는 노이즈를 방해해요.</li></ul>',
      missions: [
        {
          title: '스위치를 닫고 열어 보기',
          goal: '<b>🧲 철심을 넣고</b> 스위치를 닫아 전구가 환해진 뒤(전류 약 0.50 A) 스위치를 열어 네온 램프가 번쩍이는 것을 보세요.',
          hint: '스위치를 닫으면 전류가 서서히 늘어요. 전류가 0.4 A를 넘을 때까지 기다린 뒤 🔌 스위치 열기를 눌러요. 철심이 없으면 ε가 작아서 약하게 깜빡여요.',
          setup() { S.gate = ''; indReset(false, false, false); S.i.seenClose = false; S.i.seenFlash = false; setScene('ind'); },
          check: () => S.i.seenClose && S.i.seenFlash, hold: 0.3,
          status: () => mark(S.i.seenClose) + ' 전류가 충분히 늘어남 &nbsp; ' + mark(S.i.seenFlash) + ' 철심으로 번쩍',
          explain: '스위치를 닫으면 코일이 전류의 증가를 방해해서 전구가 <b>서서히</b> 밝아져요. 스위치를 열면 전류가 급히 끊기는 것을 코일이 방해하며 큰 기전력(약 100 V)을 만들어 네온 램프가 번쩍여요. 철심을 빼면 L이 작아져(0.5 H) ε도 약 25 V로 작아요.',
        },
        {
          title: '스파크와 인덕터 정리', manual: true,
          goal: 'L = 2.0 H, 0.50 A → 0 (0.010 s)일 때 기전력의 크기를 계산하고 질문 둘에 답한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '|ε| = L |ΔI| / Δt = 2.0 × 0.50 / 0.010 이에요. 인덕터는 “변화”를 방해하는 소자예요.',
          setup() { S.gate = 'mi2'; indReset(true, true, true); S.i.seenClose = true; numIe.clear(); resetSels(selIs, selI.st, selI.ok); setScene('ind'); },
          check: () => {
            const a = checkNum(numIe, 100, 0.03, '|ε| = L |ΔI| / Δt = 2.0 × 0.50 / 0.010 을 계산해 보세요.');
            const b = checkSel(selIR, selI.st, selI.ok, selIs, '빨간 칸을 다시 골라 보세요. 인덕터는 전류의 “변화”에 반응해요.');
            if (a !== true) return a; return b;
          },
          status: () => '기전력 값은 가려 두었어요 (L = 2.0 H, ΔI = 0.50 A, Δt = 0.010 s)',
          explain: '|ε| = L|ΔI|/Δt = 2.0 × 0.50 / 0.010 = <b>100 V</b>예요. 전류가 급히 끊기면 ΔI/Δt가 아주 커서 코일 양단에 큰 전압이 생겨요(점화 플러그의 스파크). 인덕터는 전류 자체를 막는 것이 아니라 전류의 변화를 방해해요 — 일정한 전류는 거의 방해하지 않아요.',
        },
      ],
    },
  ];
  levels.forEach((lv) => lv.missions.forEach((m) => { MS[m.title] = m; }));

  game = SciSim.game({
    simId: 'hq-transformer', mount: '#game', badge: '변압기 박사', homeHref: '../../index.html#hq',
    featureLabels: { tr: '🔌 철심 변압기 · 오실로스코프', ratio: '🔢 권선비 · 전압·전류 측정', grid: '🏙️ 송전 과정 · 손실 계산', ind: '🌀 코일·전구·네온 램프 회로' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  indReset(false, false, false); updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    if (S.mode === 'tr') stepTr(dt); else if (S.mode === 'ratio') stepRatio(dt); else if (S.mode === 'grid') stepGrid(dt); else stepInd(dt);
    sceneBg();
    T(14, 26, TITLE[S.mode], PHONE ? 11.5 : 15.5, '#26324a', 'left', 800);
    if (S.mode === 'tr') drawTr(); else if (S.mode === 'ratio') drawRatio(); else if (S.mode === 'grid') drawGridScene(); else drawInd();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SC, STP, IN, MS, TR, GRID, IND, numI1, numG1, numG2, numIe, selTs, selGs, selIs,
    get game() { return game; }, setScene, updateCtl, setSrc, toggleSw, toggleSwI, toggleCore, indReset, rV2, rI1, gI, gLoss, bulbB, lp,
  };

})();
