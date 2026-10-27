/* =========================================================
   전자기와 양자 Ⅰ. 전자기적 상호작용 - 소자와 에너지 (단원 9차시)
   성취기준 [12전자01-06] 저항, 축전기, 인덕터를 활용하는 장치를 찾아 에너지 관점에서 정성적으로 설명할 수 있다.
   ① 실험: 저항 (전기 → 열, P = VI = I²R, 저장 없음)
   ② 실험: 축전기 (R–C 충방전, 저장 ½CV², 충전 중 열 ½CV²)
   ③ 실험: 인덕터 (R–L, 자기장에 저장 ½LI², 전류 변화 방해, 스파크)
   ④ 분석: 장치 6가지에서 소자의 역할과 에너지 흐름 찾기
   RC·RL의 지수 함수 해(시간 상수 계산), 임피던스, 공진 주파수 식, 미분 방정식은 다루지 않아요.
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
      val() { const s = inp.value.trim().replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'); if (s === '' || isNaN(+s)) return NaN; return +s * Math.pow(10, +sel.value); },
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
      val() { const s = inp.value.trim().replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'); if (s === '' || isNaN(+s)) return NaN; return +s; },
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
  const COL_BLUE = '#1e40af', COL_TEAL = '#0d9488', COL_RED = '#dc2626', COL_ORG = '#f97316';
  const MODE_LABEL = { res: '🔥 저항', cap: '🔋 축전기', ind: '🌀 인덕터', dev: '🧰 장치 분석' };
  const TITLE = {
    res: '🔥 저항 — 전기 에너지가 곧바로 열이 돼요 (저장 안 됨)',
    cap: '🔋 축전기 — 전기장에 에너지를 저장했다가 내놓아요',
    ind: '🌀 인덕터 — 자기장에 에너지를 저장하고 전류 변화를 방해해요',
    dev: '🧰 장치 속 소자 찾기 — 에너지가 어디로 가나요?',
  };
  const CXs = SC.w / 2;
  const fW = (w) => (w >= 1000 ? (w / 1000).toFixed(2) + ' kW' : w >= 100 ? w.toFixed(0) + ' W' : w.toFixed(1) + ' W');
  const fmJ = (j) => (j * 1000 >= 100 ? (j * 1000).toFixed(0) : (j * 1000).toFixed(1)) + ' mJ';

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'res', t: 0, fade: 0, gate: '',
    r: { V: 220, R: 44, on: false, T: 0, ph: 0 },
    c: { R: 1, C: 1000, mode: 'off', v: 0, i: 0, Esup: 0, run: 0, startV: 0, h: [], done: {}, ph: 0, flashB: 0, everDis: false },
    n: { L: 2, closed: false, opening: false, I: 0, Iopen: 0, vL: 0, flash: 0, ph: 0, run: 0, runs: {}, cur: [], seen: {}, last: '', acc: 0, glow: 0, ever: false },
    d: { sel: 0, ans: {}, wrongT: {}, t0: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');

  function drawBulb(x, y, r, b) {
    const g = clamp(b, 0, 1);
    if (g > 0.03) D.glow(x, y, r * 2.6, '#fde047', 0.75 * g);
    ctx.fillStyle = g > 0.03 ? 'rgba(254,240,138,' + (0.45 + 0.55 * g) + ')' : 'rgba(226,232,240,.9)'; ctx.beginPath(); ctx.arc(x, y - 3, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = g > 0.03 ? '#f59e0b' : '#94a3b8'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - r * 0.35, y + r * 0.25); ctx.lineTo(x - r * 0.2, y - r * 0.25); ctx.lineTo(x, y + r * 0.1); ctx.lineTo(x + r * 0.2, y - r * 0.25); ctx.lineTo(x + r * 0.35, y + r * 0.25); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(x - r * 0.38, y + r - 6, r * 0.76, 10); ctx.fillStyle = '#64748b'; ctx.fillRect(x - r * 0.38, y + r - 2, r * 0.76, 2);
  }
  function zig(x1, y1, x2, y2, n, amp, color, lw) {                 // 저항 기호 (지그재그)
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, px = -uy, py = ux;
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1);
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, s = k % 2 ? -amp : amp; ctx.lineTo(x1 + dx * t + px * s, y1 + dy * t + py * s); }
    ctx.lineTo(x2, y2); ctx.stroke();
  }
  function battery(x, y, on) {                                         // 세로 전지 (위쪽이 +)
    ctx.strokeStyle = on ? '#0f172a' : '#94a3b8'; ctx.lineCap = 'round'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 15, y - 9); ctx.lineTo(x + 15, y - 9); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 8, y + 9); ctx.lineTo(x + 8, y + 9); ctx.stroke();
    T(x - 22, y - 7, '+', 14, '#dc2626', 'center', 800); T(x - 22, y + 21, '−', 14, '#2563eb', 'center', 800);
  }
  function sw(x0, x1, y, closed) {
    ctx.fillStyle = '#fbfcff'; ctx.fillRect(x0 - 2, y - 3, x1 - x0 + 4, 6);
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(x0, y, 3.8, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x1, y, 3.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(closed ? x1 : x1 - 6, closed ? y : y - 24); ctx.stroke();
  }

  /* ================= ① 저항 ================= */
  const rI = () => S.r.V / S.r.R, rP = () => S.r.V * rI();
  const rMask = () => S.gate === 'mr2';
  const rOK = () => S.r.on && S.r.V === 220 && fW(rP()) === '1.10 kW';
  function toggleR() { const r = S.r; r.on = !r.on; Sound.click(); updateCtl(); }
  function stepRes(dt) {
    const r = S.r; if (dt <= 0) return;
    const tgt = r.on ? clamp(Math.sqrt(rP() / 2200), 0, 1) : 0;
    r.T = SciSim.approach(r.T, tgt, dt, r.on ? 1.6 : 0.9);
    r.ph += dt * (r.on ? 30 + 12 * rI() : 0);
    if (r.on && r.T > 0.15 && !RM && Math.random() < dt * (10 + 40 * r.T)) parts.emit({ x: SC.x + 345 + (Math.random() - 0.5) * 30, y: SC.y + 82, vx: (Math.random() - 0.5) * 14, vy: -(40 + 50 * r.T), life: 1.1, size: 6 + 5 * r.T, color: 'rgba(251,146,60,.5)', shape: 'smoke', grow: 10 });
    if (!r.on && r.T > 0.1 && !RM && Math.random() < dt * 8 * r.T) parts.emit({ x: SC.x + 345 + (Math.random() - 0.5) * 30, y: SC.y + 82, vx: 0, vy: -30, life: 0.9, size: 5, color: 'rgba(148,163,184,.35)', shape: 'smoke', grow: 8 });
  }
  function flowBox(x, y, w, h, title, sub, fill, ink) {
    D.shadow(() => { D.roundRect(x, y, w, h, 12); ctx.fillStyle = fill; ctx.fill(); }, { blur: 5, y: 2 });
    T(x + w / 2, y + 22, title, 13, ink, 'center', 800); T(x + w / 2, y + 40, sub, 11.5, ink, 'center', 700);
  }
  function drawRes() {
    const r = S.r, mk = rMask(); sceneBegin();
    // 회로
    const w = new Path2D(); w.moveTo(50, 90); w.lineTo(50, 40); w.lineTo(110, 40); w.moveTo(160, 40); w.lineTo(330, 40); w.lineTo(330, 70);
    w.moveTo(330, 160); w.lineTo(330, 188); w.lineTo(50, 188); w.lineTo(50, 130);
    wireStroke(w, 2.8, r.on ? 0.3 : 0);
    battery(50, 110, true); T(78, 116, r.V + ' V', 13, '#334155', 'left', 800);
    sw(110, 160, 40, r.on); T(135, 26, r.on ? 'ON' : 'OFF', 12, r.on ? '#16a34a' : '#64748b', 'center', 800);
    // 발열체
    const hot = r.T, col = SciSim.color.mix('#64748b', '#ef4444', hot);
    if (hot > 0.04) { D.glow(330, 115, 70 + 40 * hot, '#fb923c', 0.55 * hot); }
    D.shadow(() => { D.roundRect(300, 64, 60, 102, 10); ctx.fillStyle = '#e2e8f0'; ctx.fill(); }, { blur: 5, y: 2 });
    D.roundRect(304, 68, 52, 94, 8); ctx.fillStyle = hot > 0.04 ? 'rgba(254,215,170,' + (0.4 + 0.5 * hot) + ')' : '#f8fafc'; ctx.fill();
    zig(330, 70, 330, 160, 8, 20, hot > 0.04 ? SciSim.color.mix('#f97316', '#fef08a', hot) : '#64748b', 4.4);
    zig(330, 70, 330, 160, 8, 20, col, 2.4);
    T(300, 208, '저항 R = ' + r.R + ' Ω', 12.5, '#334155', 'center', 800);
    if (r.on) pathDots([[50, 90], [50, 40], [330, 40], [330, 70], [330, 160], [330, 188], [50, 188], [50, 130]], r.ph, 24, 2.8, '#f59e0b');
    lbl(160, 70, 'I = V / R = ' + (mk ? '?' : (rI()).toFixed(1) + ' A'), { size: 13, bg: '#1e3a8a', pad: 9, minX: 0, maxX: SC.w });
    // 에너지 흐름도
    const P = rP(), th = clamp(P / 2200, 0, 1), on = r.on;
    T(14, 232, '에너지 흐름', 13, COL_BLUE, 'left', 800);
    flowBox(12, 246, 120, 56, '🔋 전지', on ? '전기 에너지 공급' : '대기 중', '#dbeafe', '#1e3a8a');
    flowBox(176, 246, 120, 56, '🔥 저항', on ? '전기 → 열' : '식은 상태', '#fee2e2', '#7f1d1d');
    flowBox(340, 246, 120, 56, '♨️ 열', on ? '공기를 데워요' : '—', '#ffedd5', '#7c2d12');
    [[132, 176], [296, 340]].forEach((a) => { if (on) D.arrow(a[0] + 2, 274, a[1] - 2, 274, { color: '#f97316', width: 3 + 9 * th, head: 12 + 4 * th }); else D.arrow(a[0] + 2, 274, a[1] - 2, 274, { color: '#cbd5e1', width: 3, head: 11 }); });
    lbl(154, 320, on ? 'P = VI = ' + (mk ? '?' : fW(P)) : 'P = 0', { size: 12.5, bg: on ? '#f97316' : '#94a3b8', pad: 8, minX: 0, maxX: SC.w });
    lbl(318, 320, on ? 'P = I²R = ' + (mk ? '?' : fW(P)) : 'P = 0', { size: 12.5, bg: on ? '#ef4444' : '#94a3b8', pad: 8, minX: 0, maxX: SC.w });
    D.roundRect(176, 340, 120, 42, 10); ctx.fillStyle = 'rgba(241,245,249,.9)'; ctx.fill(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]);
    T(236, 358, '저장되는 에너지', 11.5, '#64748b', 'center', 700); T(236, 374, '0  (식으면 바로 끝)', 12, '#475569', 'center', 800);
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, bw = STP.w - 24;
    T(bx, STP.y + 19, '전지가 내는 일률 = 저항이 내는 열의 일률 (최대 2.2 kW 눈금)', PHONE ? 11.5 : 12.5, COL_BLUE, 'left', 800);
    T(bx, STP.y + 44, '전지 VI', 12.5, '#26324a', 'left', 800); trackBar(bx + 64, STP.y + 32, bw - 150, 14, mk || !on ? 0 : P / 2200, '#2563eb'); T(bx + bw, STP.y + 44, on && !mk ? fW(P) : mk ? '?' : '0', 12.5, '#26324a', 'right', 800);
    T(bx, STP.y + 66, '열 I²R', 12.5, '#26324a', 'left', 800); trackBar(bx + 64, STP.y + 54, bw - 150, 14, mk || !on ? 0 : P / 2200, '#ef4444'); T(bx + bw, STP.y + 66, on && !mk ? fW(P) : mk ? '?' : '0', 12.5, '#26324a', 'right', 800);
    T(bx, STP.y + 82, on ? '에너지는 사라지지 않고 열로 바뀌어요 (보존).' : '스위치를 끄면 곧바로 식어요.', 11.5, '#0b7a41', 'left', 800);
    infoPanel([
      { h: '저항: 전기 → 열' },
      { p: '저항은 전기 에너지를 곧바로 열로 바꿔요. 일률 P = VI = I²R = V²/R.', c: COL_BLUE },
      { tbl: [['전기난로', '220 V · 44 Ω', ''], ['전류 I', '5.0 A', ''], ['전력 P', '1100 W = 1.1 kW', '']], c1: 0.42 },
      { p: '1시간 쓰면 ' + (mk ? '?' : (rP() / 1000).toFixed(2)) + ' kW × 1 h = ' + (mk ? '?' : (rP() / 1000).toFixed(2)) + ' kWh 가 모두 열이 돼요.', c: '#9a3412' },
      { p: '저항은 에너지를 저장하지 못해요. 전류를 끊으면 열 발생도 바로 멈춰요.', big: 1 },
      { p: '🏭 전기난로·토스터·전기밥솥, 인덕션 레인지의 냄비도 모두 이 원리예요.', c: '#0b7a41', big: 1 },
    ]);
  }
  $$('#vSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.r.V = +b.dataset.v; updateCtl(); }));
  $$('#rSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.r.R = +b.dataset.v; updateCtl(); }));
  $('#bSwR').addEventListener('click', toggleR);

  /* ================= ② 축전기 ================= */
  const CV = 9;
  const cTau = () => S.c.R * 1e3 * S.c.C * 1e-6;
  const cE = (v) => 0.5 * S.c.C * 1e-6 * v * v;
  const cMask = () => S.gate === 'mc2';
  function cReset() { const c = S.c; c.v = 0; c.i = 0; c.Esup = 0; c.run = 0; c.startV = 0; c.h = []; c.flashB = 0; }
  function cSetMode(m) { const c = S.c; if (c.mode !== m) { c.mode = m; c.run = 0; c.startV = c.v; c.h = []; if (m === 'dis') c.everDis = true; } Sound.click(); updateCtl(); }
  function stepCap(dt) {
    const c = S.c; if (dt <= 0) return;
    const tau = cTau(), vOld = c.v;
    if (c.mode === 'off') { c.i = 0; c.flashB = SciSim.approach(c.flashB, 0, dt, 12); return; }
    if (c.mode === 'chg') { c.v = CV - (CV - c.v) * Math.exp(-dt / tau); c.i = (CV - c.v) / (c.R * 1e3); c.Esup += CV * S.c.C * 1e-6 * (c.v - vOld); }
    else { c.v = c.v * Math.exp(-dt / tau); c.i = -c.v / (c.R * 1e3); }
    c.run += dt;
    if (c.run <= 6 && (c.h.length === 0 || c.run - c.h[c.h.length - 1][0] > 0.02)) c.h.push([c.run, c.v, c.i]);
    if (c.mode === 'chg' && c.startV < 0.1 && c.v >= 0.95 * CV && !c.done[c.R]) { c.done[c.R] = true; Sound.success(); parts.burst(SC.x + 420, SC.y + 110, { count: 14, speed: 140 }); }
    c.ph += dt * (c.i * 1000 * 22) * 1;                                 // 부호 있는 흐름
    c.flashB = SciSim.approach(c.flashB, c.mode === 'dis' ? Math.sqrt(clamp(-c.i * 1000 / 18, 0, 1)) : 0, dt, 12);
  }
  function drawCap() {
    const c = S.c, mk = cMask(); sceneBegin();
    const top = 52, bot = 172, xl = 50, xr = 420;
    const w = new Path2D(); w.moveTo(xl, 96); w.lineTo(xl, top); w.lineTo(120, top); w.moveTo(222, top); w.lineTo(xr, top); w.lineTo(xr, 96);
    w.moveTo(xr, 134); w.lineTo(xr, bot); w.lineTo(260, bot); w.moveTo(200, bot); w.lineTo(xl, bot); w.lineTo(xl, 136);
    wireStroke(w, 2.8, c.mode === 'chg' ? Math.abs(c.i) * 1000 / 18 * 0.5 : 0);
    // 전지 / 도선 (스위치 위치)
    if (c.mode === 'chg') { battery(xl, 116, true); T(xl + 30, 122, '9 V', 13, '#334155', 'left', 800); }
    else { if (c.mode === 'dis') { ctx.strokeStyle = '#7c4a1c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xl, 96); ctx.lineTo(xl, 136); ctx.stroke(); } battery(xl + 22, 116, false); ctx.globalAlpha = 0.5; T(xl + 52, 122, '9 V', 13, '#94a3b8', 'left', 800); ctx.globalAlpha = 1; }
    // 저항
    zig(120, top, 222, top, 6, 11, '#475569', 3.4); T(171, top - 18, 'R = ' + c.R + ' kΩ', 12.5, '#334155', 'center', 800);
    // 표시등 (전류 표시)
    drawBulb(230, bot - 2, 14, clamp(Math.sqrt(Math.abs(c.i) * 1000 / 18), 0, 1));
    T(230, bot + 30, '표시등', 11, '#64748b', 'center', 700);
    // 축전기 극판
    const q = clamp(c.v / CV, 0, 1), n = Math.round(q * 8);
    D.shadow(() => { D.roundRect(xr - 34, 96, 68, 7, 3); ctx.fillStyle = '#64748b'; ctx.fill(); D.roundRect(xr - 34, 127, 68, 7, 3); ctx.fill(); }, { blur: 4, y: 2 });
    for (let k = 0; k < n; k++) { const x = xr - 28 + k * 8; T(x + 2, 93, '+', 11, '#dc2626', 'center', 800); T(x + 2, 148, '−', 12, '#2563eb', 'center', 800); }
    for (let k = 0; k < 5; k++) { const x = xr - 26 + k * 13; if (q > 0.04) D.arrow(x, 105, x, 125, { color: 'rgba(37,99,235,' + (0.25 + 0.7 * q) + ')', width: 1.4 + 2 * q, head: 6 }); }
    T(xr, 168 - 6 + 24, 'C = ' + c.C + ' μF', 12.5, '#334155', 'center', 800);
    // 전류 점 (충전: 시계 방향, 방전: 반시계)
    const spd = Math.abs(c.i) * 1000;
    if (spd > 0.15) { const pts = [[xl, 96], [xl, top], [xr, top], [xr, 96], [xr, 134], [xr, bot], [xl, bot], [xl, 136]]; pathDots(c.i >= 0 ? pts : pts.slice().reverse(), Math.abs(c.ph), 24, 2.8, '#f59e0b'); }
    lbl(CXs - 20, 214 - 18, c.mode === 'off' ? '스위치가 열려 있어요 — ⚡ 충전이나 💡 방전을 골라 보세요 (극판 전압 ' + (mk ? '?' : p3(c.v) + ' V') + ')' : c.mode === 'chg' ? '충전 중: 전류 ' + (mk ? '?' : p3(c.i * 1000) + ' mA') + ' · 극판 전압 ' + (mk ? '?' : p3(c.v) + ' V') : '방전 중: 전류 ' + (mk ? '?' : p3(-c.i * 1000) + ' mA') + ' · 극판 전압 ' + (mk ? '?' : p3(c.v) + ' V'), { size: 12, bg: 'rgba(255,255,255,.95)', color: '#334155', minX: 0, maxX: SC.w });
    // 그래프
    D.shadow(() => { D.roundRect(10, 214, 452, 180, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    const gx0 = 52, gx1 = 424, gy0 = 244, gy1 = 366;
    T(20, 233, '극판 전압 (파랑, 왼쪽)과 전류 (주황, 오른쪽) — 스위치를 바꾼 뒤 6 초', 11.5, COL_BLUE, 'left', 800);
    ctx.strokeStyle = '#e8edf5'; ctx.lineWidth = 1; for (let k = 0; k <= 3; k++) { const y = gy0 + k * (gy1 - gy0) / 3; ctx.beginPath(); ctx.moveTo(gx0, y); ctx.lineTo(gx1, y); ctx.stroke(); }
    [0, 3, 6, 9].forEach((v) => T(gx0 - 5, gy1 - v / 9 * (gy1 - gy0) + 4, v + ' V', 10.5, '#2563eb', 'right', 700));
    [0, 6, 12, 18].forEach((v) => T(gx1 + 5, gy1 - v / 18 * (gy1 - gy0) + 4, v + ' mA', 10.5, '#ea580c', 'left', 700));
    for (let t = 0; t <= 6; t += 1) T(gx0 + t / 6 * (gx1 - gx0), gy1 + 14, t + ' s', 10.5, '#64748b', 'center', 700);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    const X = (t) => gx0 + t / 6 * (gx1 - gx0);
    ctx.lineJoin = 'round'; ctx.lineWidth = 2.8;
    ctx.strokeStyle = '#2563eb'; ctx.beginPath(); c.h.forEach((p, k) => { const y = gy1 - clamp(p[1], 0, 9) / 9 * (gy1 - gy0); k ? ctx.lineTo(X(p[0]), y) : ctx.moveTo(X(p[0]), y); }); ctx.stroke();
    ctx.strokeStyle = '#f97316'; ctx.beginPath(); c.h.forEach((p, k) => { const y = gy1 - clamp(Math.abs(p[2]) * 1000, 0, 18) / 18 * (gy1 - gy0); k ? ctx.lineTo(X(p[0]), y) : ctx.moveTo(X(p[0]), y); }); ctx.stroke();
    if (c.h.length) { const p = c.h[c.h.length - 1]; D.glow(X(p[0]), gy1 - clamp(p[1], 0, 9) / 9 * (gy1 - gy0), 11, '#2563eb', 0.5); }
    T(gx1 - 6, (gy0 + gy1) / 2 + 4, 'RC = ' + p3(cTau()) + ' s (RC가 클수록 느려요)', 11.5, '#7c2d12', 'right', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, bw = STP.w - 24, E = cE(c.v), Eh = Math.max(0, c.Esup - E), SC_E = 0.081;
    T(bx, STP.y + 18, '에너지 (눈금 81 mJ)', 12, COL_BLUE, 'left', 800);
    const rows = [['전지가 낸 E', c.Esup, '#2563eb'], ['축전기 저장 ½CV²', E, '#16a34a'], ['저항의 열', Eh, '#ef4444']];
    rows.forEach((q2, i) => { const y = STP.y + 24 + i * 19; T(bx, y + 12, q2[0], 11.5, '#26324a', 'left', 800); trackBar(bx + 118, y + 1, bw - 205, 13, mk ? 0 : q2[1] / SC_E, q2[2]); T(bx + bw, y + 12, mk ? '?' : fmJ(q2[1]), 11.5, '#26324a', 'right', 800); });
    const Qm = c.C * 1e-6 * c.v * 1000;
    infoPanel([
      { h: '축전기: 에너지 저장' },
      { p: '충전할 때 전류는 처음에 가장 크고 점점 0이 되며, 극판 전압은 천천히 전지 전압(9 V)에 가까워져요.', c: COL_BLUE },
      { tbl: [['쌓인 전하 Q = CV', mk ? '?' : p3(Qm) + ' mC', ''], ['저장 에너지 ½CV²', mk ? '?' : fmJ(E), ''], ['전지가 준 E = QV', mk ? '?' : fmJ(c.Esup), '']], c1: 0.5 },
      { p: '전지가 준 에너지의 절반만 저장되고 나머지 절반은 충전하는 동안 저항에서 열이 돼요. 이 열은 R 값과 관계없이 같아요.', c: '#9a3412' },
      { p: '🏭 카메라 플래시: C = 100 μF, 300 V로 천천히 충전한 4.5 J을 약 1 ms 만에 방전해요(순간 4.5 kW).', c: '#0b7a41', big: 1 },
    ]);
  }
  $$('#cModeSeg button').forEach((b) => b.addEventListener('click', () => cSetMode(b.dataset.v)));
  $$('#rcSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.c.R = +b.dataset.v; S.c.run = 0; S.c.startV = S.c.v; S.c.h = []; updateCtl(); }));
  $$('#ccSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.c.C = +b.dataset.v; cReset(); updateCtl(); }));
  $('#bCReset').addEventListener('click', () => { Sound.click(); cReset(); S.c.mode = 'off'; updateCtl(); });

  /* ================= ③ 인덕터 ================= */
  const IND = { V: 12, R: 24, I0: 0.5, slow: 10, topen: 0.010 };
  const nMask = () => S.gate === 'mn2';
  function nReset(L, closed, steady) {
    const n = S.n; n.L = L; n.closed = !!closed; n.opening = false; n.I = steady ? IND.I0 : 0; n.vL = 0; n.flash = 0; n.cur = []; n.run = 0; n.last = ''; n.glow = steady ? 1 : 0;
  }
  function toggleN() {
    const n = S.n; Sound.click();
    if (!n.closed) { n.closed = true; n.opening = false; n.cur = []; n.run = 0; n.ever = true; }
    else {
      n.closed = false;
      if (n.I > 0.003) {
        n.opening = true; n.Iopen = n.I; const eps0 = n.L * n.Iopen / IND.topen;
        n.flash = Math.max(n.flash, clamp(eps0 / 100, 0, 1.3));
        n.last = 'ε = L × ΔI/Δt = ' + n.L.toFixed(1) + ' × ' + n.Iopen.toFixed(2) + ' / ' + IND.topen.toFixed(3) + ' = ' + p3(eps0) + ' V';
        parts.burst(SC.x + 275, SC.y + 124, { count: Math.round(5 + 14 * clamp(eps0 / 100, 0, 1)), speed: 80 + 90 * clamp(eps0 / 100, 0, 1), colors: ['#fb923c', '#fde047', '#fff7ed'], life: 0.6, gravity: 80, size: 3, shape: 'star' });
        Sound.success();
      }
    }
    updateCtl();
  }
  function stepInd(dt) {
    const n = S.n; if (dt <= 0) return;
    const L = n.L, k = Math.max(1, Math.ceil(dt / 0.01)), h = dt / k / IND.slow;
    for (let q = 0; q < k; q++) {
      if (n.closed) { n.I += (IND.V - IND.R * n.I) / L * h; n.vL = IND.V - IND.R * n.I; }
      else if (n.opening) { const rate = n.Iopen / IND.topen; n.I -= rate * h; if (n.I <= 0) { n.I = 0; n.opening = false; n.vL = 0; } else n.vL = -L * rate; }
      else n.vL = 0;
    }
    if (n.closed) { n.run += dt; if (n.I >= 0.45) n.seen[L] = true; }
    if (!n.opening) n.flash = SciSim.approach(n.flash, 0, dt, 3.2);
    n.ph += dt * (n.closed ? n.I * 70 : 0);
    n.glow = SciSim.approach(n.glow, clamp(n.I / IND.I0, 0, 1) * (L / 2 * 0.7 + 0.3), dt, 8);
    n.acc += dt;
    while (n.acc >= 1 / 60) { n.acc -= 1 / 60; if (n.closed && n.cur.length < 240) { n.cur.push(n.I); n.runs[L] = n.cur; } }
  }
  function drawIndC() {
    const n = S.n, L = n.L, mk = nMask(); sceneBegin();
    const w = new Path2D();
    w.moveTo(50, 118); w.lineTo(50, 70); w.lineTo(110, 70); w.moveTo(160, 70); w.lineTo(215, 70); w.moveTo(335, 70); w.lineTo(420, 70); w.lineTo(420, 108);
    w.moveTo(420, 150); w.lineTo(420, 200); w.lineTo(50, 200); w.lineTo(50, 146);
    w.moveTo(215, 70); w.lineTo(215, 124); w.lineTo(252, 124); w.moveTo(298, 124); w.lineTo(335, 124); w.lineTo(335, 70);
    wireStroke(w, 2.8, n.closed ? n.I / IND.I0 * 0.4 : 0);
    battery(50, 132, true); T(78, 138, '12 V', 12.5, '#334155', 'left', 800);
    sw(110, 160, 70, n.closed); T(135, 54, n.closed ? '닫힘' : '열림', 12, n.closed ? '#16a34a' : '#64748b', 'center', 800);
    const glow = clamp(n.glow, 0, 1);
    if (glow > 0.03) for (let k = 0; k < 3; k++) { ctx.strokeStyle = 'rgba(124,58,237,' + (glow * (0.65 - k * 0.17)) + ')'; ctx.lineWidth = 2.4; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -n.ph; ctx.beginPath(); ctx.ellipse(275, 70, 76 + k * 14, 34 + k * 14, 0, 0, TAU); ctx.stroke(); }
    ctx.setLineDash([]);
    D.shadow(() => { D.roundRect(222, 62, 106, 16, 5); ctx.fillStyle = '#94a3b8'; ctx.fill(); }, { blur: 4, y: 2 });
    for (let i = 0; i < 8; i++) { const x = 226 + i * 14, p = new Path2D(); p.ellipse(x, 70, 7, 24, 0, -Math.PI / 2, Math.PI / 2); wireStroke(p, 3.2, glow * 0.4); }
    T(275, 28, 'L = ' + L.toFixed(1) + ' H', 13, '#7c2d12', 'center', 800);
    drawBulb(420, 130, 17, clamp(n.I / IND.I0, 0, 1)); T(448, 134, '전구', 11, '#475569', 'right', 800);
    const fl = clamp(n.flash, 0, 1.3);
    ctx.fillStyle = 'rgba(241,245,249,.95)'; D.roundRect(252, 112, 46, 24, 11); ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.stroke();
    if (fl > 0.04) { D.glow(275, 124, 34 + 30 * fl, '#fb923c', clamp(0.9 * fl, 0, 0.95)); ctx.fillStyle = 'rgba(251,146,60,' + clamp(0.5 + 0.5 * fl, 0, 1) + ')'; D.roundRect(254, 114, 42, 20, 9); ctx.fill(); }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(258, 124); ctx.lineTo(268, 124); ctx.moveTo(282, 124); ctx.lineTo(292, 124); ctx.stroke();
    T(275, 154, '네온 램프', 11, '#475569', 'center', 800);
    if (n.closed && n.I > 0.01) pathDots([[50, 118], [50, 70], [420, 70], [420, 200], [50, 200], [50, 146]], n.ph, 26, 2.8, '#f59e0b');
    else if (n.opening) pathDots([[215, 70], [335, 70], [335, 124], [215, 124], [215, 70]], S.t * 60, 22, 2.8, '#fb923c');
    if (n.last && !mk) lbl(CXs, 220, n.last, { size: 12, bg: 'rgba(255,255,255,.96)', color: '#6d28d9', minX: 0, maxX: SC.w });
    // 전류 그래프 (닫은 뒤 4초) — 다른 L의 기록은 흐리게
    D.shadow(() => { D.roundRect(10, 236, 452, 158, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    const gx0 = 50, gx1 = 440, gy0 = 262, gy1 = 366, X = (i) => gx0 + i / 240 * (gx1 - gx0), Y = (I) => gy1 - I / 0.6 * (gy1 - gy0);
    T(20, 254, '스위치를 닫은 뒤 전류 I (4 초) — 인덕턴스 L이 클수록 서서히 늘어요', 11.5, COL_BLUE, 'left', 800);
    ctx.strokeStyle = '#e8edf5'; ctx.lineWidth = 1; [0, 0.2, 0.4, 0.6].forEach((v) => { ctx.beginPath(); ctx.moveTo(gx0, Y(v)); ctx.lineTo(gx1, Y(v)); ctx.stroke(); T(gx0 - 5, Y(v) + 4, v.toFixed(1), 10.5, '#ea580c', 'right', 700); });
    for (let t = 0; t <= 4; t++) T(X(t * 60), gy1 + 14, t + ' s', 10.5, '#64748b', 'center', 700);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    [0.5, 2].forEach((LL) => {
      const arr = n.runs[LL]; if (!arr || !arr.length) return; const cur = LL === L;
      ctx.strokeStyle = LL === 2 ? (cur ? '#7c3aed' : 'rgba(124,58,237,.35)') : (cur ? '#f97316' : 'rgba(249,115,22,.35)'); ctx.lineWidth = cur ? 3 : 2.2; ctx.lineJoin = 'round'; ctx.beginPath();
      arr.forEach((I, i) => (i ? ctx.lineTo(X(i), Y(I)) : ctx.moveTo(X(i), Y(I)))); ctx.stroke();
    });
    lbl(gx1 - 70, gy0 + 14, 'L 0.5 H', { size: 11, bg: '#f97316', pad: 6, minX: 0, maxX: SC.w }); lbl(gx1 - 6, gy0 + 14, 'L 2.0 H', { size: 11, bg: '#7c3aed', pad: 6, minX: 0, maxX: SC.w });
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, bw = STP.w - 24, E = 0.5 * L * n.I * n.I;
    T(bx, STP.y + 19, '자기장에 저장된 에너지 ½LI² (눈금 250 mJ)', 12.5, COL_BLUE, 'left', 800);
    trackBar(bx, STP.y + 28, bw - 90, 15, mk ? 0 : E / 0.25, '#7c3aed'); T(bx + bw, STP.y + 41, mk ? '?' : fmJ(E), 12.5, '#26324a', 'right', 800);
    T(bx, STP.y + 64, '전구 밝기', 12.5, '#26324a', 'left', 800); trackBar(bx + 74, STP.y + 52, bw - 74, 15, n.I / IND.I0, '#f59e0b');
    T(bx, STP.y + 82, n.closed ? '닫으면 전류가 서서히 늘고 에너지가 자기장에 쌓여요.' : n.opening ? '전류가 끊기자 저장된 에너지가 스파크·열로 방출돼요!' : '스위치를 열면 저장된 에너지가 방출돼요.', 11.5, '#0b7a41', 'left', 800);
    infoPanel([
      { h: '인덕터: 자기장에 저장' },
      { p: '전류가 변하면 그 변화를 방해하는 기전력이 생겨서 전류가 서서히 늘고 서서히 줄어요.', c: COL_BLUE },
      { tbl: [['축전기', '전압이 서서히 변함', ''], ['인덕터', '전류가 서서히 변함', '']], c1: 0.3 },
      { p: '축전기는 전기장에, 인덕터는 자기장에 에너지를 저장해요.' },
      { p: '스위치를 열면 전류가 갑자기 끊기지 못하고 저장된 에너지가 스파크·열로 방출돼요. L이 클수록 큰 ε (예: 2.0 H, 0.50 A → 100 V).', c: '#6d28d9' },
      { p: '🏭 자동차 점화 코일, 형광등 안정기, 전원 장치의 초크 코일에 쓰여요.', c: '#0b7a41', big: 1 },
    ]);
  }
  $$('#lSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const was = S.n.closed; S.n.L = +b.dataset.v; if (was) { S.n.cur = []; S.n.run = 0; } updateCtl(); }));
  $('#bSwN').addEventListener('click', toggleN);

  /* ================= ④ 장치 분석 ================= */
  const EL = { res: { name: '저항', icon: '🔥', col: '#ef4444', bg: '#fee2e2' }, cap: { name: '축전기', icon: '🔋', col: '#2563eb', bg: '#dbeafe' }, ind: { name: '인덕터', icon: '🌀', col: '#7c3aed', bg: '#ede9fe' } };
  const DEV = [
    { name: '전기난로', icon: '🔥', ans: 'res', src: '콘센트 220 V', store: '저장 없음', out: '열 1.1 kW (곧바로)', why: '전기 에너지를 열로 바꿔 버려요. 끄면 바로 식어요.' },
    { name: '카메라 플래시', icon: '📸', ans: 'cap', src: '전지 9 V (천천히 충전)', store: '전기장에 4.5 J 저장', out: '약 1 ms 방전 → 센 빛(4.5 kW)', why: '천천히 저장했다가 한순간에 내놓아서 센 빛을 내요.' },
    { name: '점화 코일', icon: '🚗', ans: 'ind', src: '12 V 전원', store: '자기장에 저장', out: '전류 차단 → 수 kV 스파크', why: '전류를 급히 끊으면 코일이 전류를 유지하려고 큰 전압을 만들어요.' },
    { name: '터치 센서', icon: '📱', ans: 'cap', src: '작은 전압 신호', store: '전기장 (정전 용량 C)', out: '손가락이 닿으면 C가 변해요', why: '전기장이 있는 곳에 손가락(도체)이 닿아 정전 용량이 변하는 것을 읽어요.' },
    { name: '평활 회로', icon: '🔌', ans: 'cap', src: '정류된 출렁이는 전압', store: '전기장에 잠깐 저장', out: '전압이 줄면 내놓아 매끄럽게', why: '병렬로 단 축전기가 충전·방전하며 전압의 출렁임을 줄여요. (초크 코일도 쓰여요)' },
    { name: '형광등 안정기', icon: '💡', ans: 'ind', src: '교류 전원', store: '자기장에 저장', out: '전류의 변화를 방해해 전류를 제한', why: '인덕터가 전류의 변화를 방해해 전류가 지나치게 커지는 것을 막아요.' },
  ];
  const devOK = (i) => S.d.ans[i] === DEV[i].ans;
  const devAll = () => DEV.every((d, i) => devOK(i));
  const devN = () => DEV.filter((d, i) => devOK(i)).length;
  const cardRect = (i) => ({ x: 10 + (i % 3) * 154, y: 8 + Math.floor(i / 3) * 92, w: 146, h: 84 });
  function pickEl(e) {
    const d = S.d, i = d.sel; d.ans[i] = e; Sound.click();
    if (devOK(i)) { Sound.success(); const r = cardRect(i); parts.burst(SC.x + r.x + r.w / 2, SC.y + r.y + r.h / 2, { count: 12, speed: 120 }); } else { Sound.fail(); d.wrongT[i] = S.t; }
    updateCtl();
  }
  function selDev(i) { S.d.sel = i; Sound.click(); updateCtl(); }
  function drawDev() {
    const d = S.d; sceneBegin();
    DEV.forEach((dv, i) => {
      const r = cardRect(i), cur = d.sel === i, got = d.ans[i], ok = devOK(i), shake = !ok && got && S.t - (d.wrongT[i] || -9) < 0.4 ? Math.sin((S.t - d.wrongT[i]) * 60) * 4 : 0;
      D.shadow(() => { D.roundRect(r.x + shake, r.y, r.w, r.h, 12); ctx.fillStyle = ok ? '#dcfce7' : got ? '#fee2e2' : '#fff'; ctx.fill(); }, { blur: cur ? 10 : 5, y: cur ? 4 : 2 });
      D.roundRect(r.x + shake, r.y, r.w, r.h, 12); ctx.strokeStyle = cur ? '#f26b3a' : ok ? '#16a34a' : '#dbe3f0'; ctx.lineWidth = cur ? 3 : 1.6; ctx.stroke();
      T(r.x + shake + 28, r.y + 40, dv.icon, 26, '#000', 'center', 700);
      T(r.x + shake + 90, r.y + 34, dv.name, 12.5, '#26324a', 'center', 800);
      T(r.x + shake + 90, r.y + 56, ok ? '✅ ' + EL[dv.ans].name : got ? '❌ 다시' : '❓ 소자는?', 12.5, ok ? '#15803d' : got ? '#b91c1c' : '#64748b', 'center', 800);
    });
    const dv = DEV[d.sel], ok = devOK(d.sel), msk = S.gate === 'md2';
    D.shadow(() => { D.roundRect(10, 200, 452, 192, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    T(20, 222, dv.icon + ' ' + dv.name + ' — 에너지 흐름도', 14, COL_BLUE, 'left', 800);
    if (ok || msk) {
      const el = EL[dv.ans];
      flowBox(18, 238, 124, 56, '🔋 ' + '전원', dv.src.split(' (')[0], '#e0f2fe', '#0c4a6e');
      flowBox(174, 238, 124, 56, el.icon + ' ' + el.name, dv.ans === 'res' ? '전기 → 열' : dv.ans === 'cap' ? '전기장에 저장' : '자기장에 저장', el.bg, '#1e1b4b');
      flowBox(330, 238, 124, 56, '⚡ 결과', dv.ans === 'res' ? '열 (저장 없음)' : '저장 후 방출', '#fef9c3', '#713f12');
      D.arrow(144, 266, 172, 266, { color: '#f97316', width: 5, head: 13 }); D.arrow(300, 266, 328, 266, { color: '#f97316', width: 5, head: 13 });
      let y = 312; y += textBlock(22, y, 430, '입력: ' + dv.src, 12.5, '#26324a', 18, 800);
      y += textBlock(22, y + 4, 430, '저장: ' + dv.store, 12.5, '#6d28d9', 18, 800);
      y += textBlock(22, y + 8, 430, '출력: ' + dv.out, 12.5, '#9a3412', 18, 800);
      textBlock(22, y + 14, 430, dv.why, 12, '#0b7a41', 17, 800);
    } else {
      lbl(CXs, 300, d.ans[d.sel] ? '다시 생각해 봐요: 이 장치는 에너지를 어떻게 다룰까요?' : '오른쪽에서 이 장치의 핵심 소자를 골라 보세요', { size: 13, bg: 'rgba(255,255,255,.95)', color: '#9a3412', minX: 0, maxX: SC.w });
      T(CXs, 340, '저항: 열로 · 축전기: 전기장에 저장 · 인덕터: 자기장에 저장', 12, '#516079', 'center', 800);
    }
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12;
    T(bx, STP.y + 20, '맞힌 장치 ' + devN() + ' / 6', 13.5, COL_BLUE, 'left', 800);
    T(bx, STP.y + 44, '저항: 전기 → 열 · 축전기: 전기장에 저장 · 인덕터: 자기장에 저장', PHONE ? 11.5 : 12.5, '#26324a', 'left', 800);
    T(bx, STP.y + 68, '카드를 눌러 장치를 고르고 소자를 골라요.', PHONE ? 11.5 : 12.5, '#0b7a41', 'left', 800);
    infoPanel([
      { h: '세 소자 비교' },
      { tbl: [['🔥 저항', '열로 전환', '저장 없음', EL.res.col], ['🔋 축전기', '전기장에 저장', '전압 변화 방해', EL.cap.col], ['🌀 인덕터', '자기장에 저장', '전류 변화 방해', EL.ind.col]], c1: 0.3 },
      { p: '축전기: 천천히 모았다가 한꺼번에 내놓기에 좋아요. 인덕터: 전류가 급히 변하는 것을 막고, 끊으면 큰 전압을 만들어요.' },
      { p: '예측: 플래시의 축전기 C를 반으로 줄이면 같은 전압에서 저장·방출 에너지(½CV²)는 절반이에요.', c: '#9a3412', big: 1 },
    ]);
  }
  $$('#devSeg button').forEach((b) => b.addEventListener('click', () => selDev(+b.dataset.v)));
  $$('#elSeg button').forEach((b) => b.addEventListener('click', () => pickEl(b.dataset.v)));
  function devDown(p) {
    if (S.mode !== 'dev' || S.gate === 'md2') return false;
    const q = lp(p); for (let i = 0; i < 6; i++) { const r = cardRect(i); if (q.x >= r.x && q.x <= r.x + r.w && q.y >= r.y && q.y <= r.y + r.h) { selDev(i); return false; } }
    return false;
  }

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
    const r = S.r, c = S.c, n = S.n, d = S.d;
    $$('#vSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === r.V));
    $$('#rSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === r.R));
    $('#bSwR').textContent = r.on ? '⏻ 스위치 끄기' : '⏻ 스위치 켜기'; $('#bSwR').classList.toggle('btn-primary', !r.on);
    $$('#cModeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === c.mode));
    $$('#rcSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === c.R));
    $$('#ccSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === c.C));
    $$('#lSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === n.L));
    $('#bSwN').textContent = n.closed ? '🔌 스위치 열기' : '🔌 스위치 닫기';
    $$('#devSeg button').forEach((b) => { const i = +b.dataset.v; b.classList.toggle('on', i === d.sel); b.textContent = (devOK(i) ? '✅ ' : '') + DEV[i].name; });
    $$('#elSeg button').forEach((b) => b.classList.toggle('on', d.ans[d.sel] === b.dataset.v));
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  function readouts() {
    let a, b, c; const m = S.mode;
    if (m === 'res') { const r = S.r, mk = rMask(); a = ['전압 · 저항', r.V + ' V · ' + r.R + ' Ω']; b = ['전류 I', mk ? '?' : (r.on ? rI().toFixed(1) : '0') + ' A']; c = ['전력 P', mk ? '?' : r.on ? fW(rP()) : '0 W']; }
    else if (m === 'cap') { const k = S.c, mk = cMask(); a = ['R · C', k.R + ' kΩ · ' + k.C + ' μF']; b = ['극판 전압', mk ? '?' : p3(k.v) + ' V']; c = ['저장 에너지', mk ? '?' : fmJ(cE(k.v))]; }
    else if (m === 'ind') { const k = S.n, mk = nMask(); a = ['인덕턴스 L', k.L.toFixed(1) + ' H']; b = ['전류 I', (mk ? '?' : k.I.toFixed(3)) + ' A']; c = ['저장 에너지', mk ? '?' : fmJ(0.5 * k.L * k.I * k.I)]; }
    else { const dv = DEV[S.d.sel]; a = ['선택한 장치', dv.name]; b = ['맞힌 장치', devN() + ' / 6']; c = ['고른 소자', S.d.ans[S.d.sel] ? EL[S.d.ans[S.d.sel]].name + (devOK(S.d.sel) ? ' ✅' : ' ❌') : '—']; }
    [[l1, v1, a], [l2, v2, b], [l3, v3, c]].forEach((z) => { if (z[0].textContent !== z[2][0]) z[0].textContent = z[2][0]; if (z[1].textContent !== z[2][1]) z[1].textContent = z[2][1]; });
  }

  /* ---------- 입력 도구 ---------- */
  const numKwh = makePlain($('#numRHost'), '220 V, 44 Ω 난로를 1시간 쓸 때 소비하는 전기 에너지 E = Pt', 'E =', 'kWh');
  const selCR = [
    ['저항 R이 클 때 충전이 느린 까닭은?', ['전류가 작아서 같은 전하를 쌓는 데 시간이 오래 걸리기 때문이에요', 'R이 크면 축전기의 전기 용량 C가 작아지기 때문이에요', 'R이 크면 전지의 전압이 낮아지기 때문이에요'], 0],
    ['충전된 축전기는 전지처럼 계속 일정한 전류를 낼 수 있을까요? (💡 방전을 눌러 보세요)', ['아니요, 방전하면 저장된 전하가 빠져나가며 전류가 곧 0이 돼요', '네, 같은 크기의 전류를 계속 흘려요', '네, 전지보다 훨씬 오래 가요'], 0],
  ];
  const selNR = [
    ['스위치를 열 때 스파크(네온 번쩍임)가 생기는 까닭은?', ['저장된 자기장 에너지가 코일이 전류를 유지하려는 큰 기전력으로 방출되기 때문이에요', '전지의 전압이 갑자기 커지기 때문이에요', '전구가 에너지를 한꺼번에 내놓기 때문이에요'], 0],
    ['인덕턴스 L이 커지면 전류가 늘어나는 모양은?', ['더 서서히 늘어나요', '더 빠르게 늘어나요', '달라지지 않아요'], 0],
  ];
  const selDR = [
    ['플래시에서 축전기 C를 반으로 줄이면(같은 전압) 한 번에 내놓는 에너지는?', ['절반이 돼요 (½CV²)', '2배가 돼요', '변하지 않아요'], 0],
    ['플래시가 한순간에 센 빛을 낼 수 있는 까닭은?', ['천천히 저장한 에너지를 아주 짧은 시간에 한꺼번에 방전하기 때문이에요', '전지가 순간적으로 에너지를 더 만들어 내기 때문이에요', '저항이 에너지를 빛으로 바꾸어 저장하기 때문이에요'], 0],
    ['전원 장치에 축전기를 병렬로 다는 까닭은?', ['전압이 출렁일 때 충전·방전하며 전압을 매끄럽게 하려고요', '전류를 더 많이 만들려고요', '전압을 2배로 올리려고요'], 0],
  ];
  const selC = { st: {}, ok: {} }, selN = { st: {}, ok: {} }, selD = { st: {}, ok: {} };
  const selCs = makeSelects($('#selCHost'), selCR, selC.st, selC.ok);
  const selNs = makeSelects($('#selNHost'), selNR, selN.st, selN.ok);
  const selDs = makeSelects($('#selDHost'), selDR, selD.st, selD.ok);
  function setupRes(on) { const r = S.r; r.V = 220; r.R = 44; r.on = !!on; r.T = on ? 1 : 0; }
  function setupCap(R, C, charged) { const c = S.c; c.R = R; c.C = C; cReset(); c.mode = 'off'; c.done = {}; c.everDis = false; if (charged) { c.v = CV; c.Esup = CV * C * 1e-6 * CV; } }

  /* ================= 미션 ================= */
  const MS = {};
  const levels = [
    {
      title: '저항: 전기 에너지가 열이 돼요', short: '저항', icon: '🔥', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 카메라 플래시는 왜 전지를 연결해도 바로 번쩍이지 않고 “삐-” 소리와 함께 충전하는 시간이 필요할까?</p>' +
        '<div class="si-link">🔗 <b>물리학 「소비 전력과 전기 안전」</b>에서 P = VI = I²R로 전기 기구의 전력을 계산했어요. 이 차시에서는 <b>저항 · 축전기 · 인덕터</b>를 같은 눈높이로 놓고 “에너지가 어디로 가는가”를 비교해요.</div>' +
        '<p>먼저 <b>저항</b>부터. 전기난로(220 V, 44 Ω)를 켜면 전지(콘센트)가 내놓는 전기 에너지가 어디로 갈까요? 에너지 흐름도에서 전지 → 저항 → 열로 이어지는 화살표를 따라가 봐요.</p>',
      features: ['res'],
      setup() { S.gate = ''; setupRes(false); setScene('res'); },
      recap: '저항은 전기 에너지를 곧바로 열로 바꿔요. P = VI = I²R 이고, 에너지를 저장하지 않아서 전류를 끊으면 바로 식어요.',
      summary: '<ul><li><b>저항</b>: 전기 에너지를 열 에너지로 전환(저장 ✕). 전력 P = VI = I²R = V²/R.</li><li>전기난로 220 V, R = 44 Ω → I = 5.0 A, P = 1100 W = <b>1.1 kW</b>. 1시간 쓰면 <b>1.1 kWh</b>가 전부 열이 돼요.</li><li>전지가 내는 일률 = 저항이 내는 열의 일률(에너지 보존). 에너지가 사라지는 것이 아니라 열로 바뀌어요.</li><li>전류를 끊으면 열 발생도 바로 멈춰요. (전기난로, 토스터, 인덕션 레인지의 냄비 가열)</li></ul>',
      missions: [
        {
          title: '난로 전력 1.1 kW 만들기',
          goal: '스위치를 켜고 전기난로의 전력이 <b>P = 1.1 kW</b>가 되도록 전압과 저항을 고르세요.',
          hint: 'P = V² / R. 220 V에서 R = 44 Ω이면 I = 5.0 A, P = 1100 W = 1.10 kW예요. ⏻ 스위치도 켜야 해요.',
          setup() { S.gate = ''; Object.assign(S.r, { V: 110, R: 22 }); S.r.on = false; S.r.T = 0; setScene('res'); },
          check: rOK, hold: 0.8,
          status: () => mark(S.r.on) + ' 스위치 ON &nbsp; ' + mark(rOK()) + ' P = ' + (S.r.on ? fW(rP()) : '0 W') + ' (목표 1.10 kW)',
          explain: 'P = VI = V²/R = 220² / 44 = <b>1100 W = 1.1 kW</b>이고 I = V/R = 5.0 A예요. 같은 220 V라도 R이 절반(22 Ω)이면 전력은 2배, 두 배(88 Ω)이면 절반이에요. 이 에너지는 모두 열이 돼요.',
        },
        {
          title: '1시간 사용하면 몇 kWh?', manual: true,
          goal: '220 V, 44 Ω 난로를 <b>1시간</b> 쓸 때 소비하는 전기 에너지(E = Pt)를 kWh 단위로 계산해 입력한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'P = 1.1 kW 이므로 E = P × t = 1.1 kW × 1 h 이에요.',
          setup() { S.gate = 'mr2'; setupRes(true); numKwh.clear(); setScene('res'); },
          check: () => checkNum(numKwh, 1.1, 0.03, 'E = P × t = 1.1 kW × 1 h 를 계산해 보세요. (1.1 kW = 1100 W)'),
          status: () => '전력 값은 가려 두었어요 (220 V, 44 Ω)',
          explain: 'E = Pt = 1.1 kW × 1 h = <b>1.1 kWh</b>예요. 이 1.1 kWh(= 3.96 × 10⁶ J)는 모두 열에너지로 바뀌어요. 전기요금은 이 kWh로 계산해요.',
        },
        {
          type: 'quiz', title: '저항이 전기 에너지를 없앨까?',
          goal: '저항은 전기 에너지를 <b>사라지게</b> 할까요?',
          setup() { S.gate = ''; setupRes(true); setScene('res'); },
          choices: ['아니요 — 열 에너지로 전환될 뿐 전체 에너지는 보존돼요', '네 — 저항을 지나면 에너지가 없어져요', '아니요 — 저항이 에너지를 저장해 두었다가 나중에 돌려줘요', '네 — 전류가 줄어들어 에너지도 줄어요'],
          answer: 0,
          feedback: ['', '에너지는 없어지지 않아요. 흐름도에서 전지가 낸 만큼 열이 나오는 것을 봤죠?', '저항은 저장하지 못해요. 스위치를 끄면 곧바로 식는 것이 증거예요. (저장하는 소자는 축전기·인덕터!)', '저항에서는 전류가 줄지 않고(직렬 회로) 그만큼 전압이 소비돼 열이 돼요.'],
          explain: '저항에서 전기 에너지는 열에너지로 <b>전환</b>될 뿐 사라지지 않아요(에너지 보존). 전지가 내는 일률 VI와 저항의 열 I²R이 같은 값이었죠. 저장되지는 않아서 전류를 끊으면 바로 열 발생이 멈춰요.',
        },
      ],
    },
    {
      title: '축전기: 전기장에 저장했다 내놓아요', short: '축전기', icon: '🔋', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 저항은 전기 에너지를 열로 바꿔 버려요. <b>물리학 「축전기와 센서」</b>에서 배운 축전기는 에너지를 어떻게 다룰까요? 처음 질문(플래시)의 열쇠예요.</div>' +
        '<p>R–C 직렬 회로에서 스위치로 <b>충전·방전</b>해 봐요. 충전 전류는 처음에 가장 크고 점점 0이 되고, 극판 전압은 천천히 전지 전압(9 V)에 가까워져요. 저장 에너지 ½CV²과 저항에서의 열도 살펴봐요. (지수 함수 식은 쓰지 않고, RC가 클수록 느리다는 것만 확인해요.)</p>',
      features: ['cap'],
      setup() { S.gate = ''; setupCap(1, 1000, false); setScene('cap'); },
      recap: '축전기는 전지가 준 에너지의 절반(½CV²)을 전기장에 저장했다가 방전할 때 내놓아요. 나머지 절반은 충전 중 저항에서 열이 돼요. RC가 클수록 천천히 충전돼요.',
      summary: '<ul><li><b>축전기</b>: 전기 에너지를 전기장에 저장하고 방전할 때 한꺼번에 내놓아요. 충전 전류는 처음 최대 → 점점 0, 전압은 천천히 전지 전압으로.</li><li>C = 1000 μF를 9.0 V로 충전: Q = CV = <b>9.0 mC</b>, 저장 에너지 ½CV² = <b>40.5 mJ</b>, 전지가 공급한 에너지 CV² = <b>81 mJ</b>. 절반은 저장, 절반은 충전하는 동안 열이 돼요(<b>R 값과 관계없이 같아요</b>).</li><li>R이 클수록, C가 클수록(RC가 클수록) 충전이 천천히 돼요.</li><li>카메라 플래시: C = 100 μF를 300 V로 충전하면 4.5 J을 저장했다가 약 1 ms 만에 방전해요(순간 약 4.5 kW).</li></ul>',
      missions: [
        {
          title: '충전 곡선 만들기',
          goal: '빈 축전기를 <b>충전</b>해 극판 전압을 9 V의 95 %까지 올려 보세요. 저항 R을 <b>두 가지 이상</b> 바꿔 가며 충전 속도를 비교해요.',
          hint: '⚡ 충전을 고르고 6초쯤 기다려요. 끝나면 ↺ 비우고 다시를 누른 뒤 R을 다른 값으로 바꿔 한 번 더 충전해요. R이 클수록 곡선이 천천히 올라가요.',
          setup() { S.gate = ''; setupCap(1, 1000, false); setScene('cap'); },
          check: () => Object.keys(S.c.done).length >= 2, hold: 0.3,
          status: () => ['0.5', '1', '2'].map((k) => mark(!!S.c.done[k]) + ' R = ' + k + ' kΩ').join(' &nbsp; ') + ' (2가지 이상)',
          explain: 'R이 작으면 전류가 커서 빨리 충전되고, R이 크면 전류가 작아서 오래 걸려요. 어느 경우에도 충전 전류는 처음이 가장 크고 점점 0이 되며, 극판 전압은 9 V에 천천히 가까워져요.',
        },
        {
          title: '충전이 느린 까닭과 방전', manual: true,
          goal: '<b>💡 방전</b>을 눌러 표시등이 번쩍이는 것을 보고, 두 질문에 답한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '큰 R은 전류를 작게 해요. 방전하면 극판의 전하가 빠져나가 극판 전압과 전류가 0으로 줄어들어요.',
          setup() { S.gate = ''; setupCap(1, 1000, true); resetSels(selCs, selC.st, selC.ok); S.gate = 'mc2'; setScene('cap'); },
          check: () => (!S.c.everDis ? '먼저 💡 방전을 눌러 표시등이 번쩍이는 것을 보세요.' : checkSel(selCR, selC.st, selC.ok, selCs, '빨간 칸을 다시 골라 보세요. 전류 = 전압 / 저항, 그리고 방전하면 저장된 전하가 빠져나가요.')),
          status: () => mark(S.c.everDis) + ' 방전해 보기 &nbsp; ' + mark(!!selC.st[0] && !!selC.st[1]) + ' 질문 2개',
          explain: 'R이 크면 같은 전압에서 전류가 작아서(I = V/R) 전하가 쌓이는 데 오래 걸려요. 충전된 축전기는 방전하면 저장된 전하가 빠져나가 전류가 곧 0이 돼요 — 전지처럼 계속 전류를 내지 못해요. 그래서 플래시는 “한 번” 크게 내놓고 다시 충전해요.',
        },
        {
          type: 'quiz', title: 'R을 2배로 하면 열은?',
          goal: 'R을 <b>2배</b>로 하면 충전하는 동안 저항에서 열로 사라지는 에너지는 몇 배가 될까요?',
          setup() { S.gate = ''; setupCap(1, 1000, false); setScene('cap'); },
          choices: ['변하지 않아요 — 항상 ½CV²예요', '2배가 돼요', '1/2배가 돼요', '4배가 돼요'],
          answer: 0,
          feedback: ['', 'R이 2배라서 전류는 1/2이 되지만 충전 시간은 2배로 길어져요. 열 = ∫I²R dt 는 변하지 않아요.', 'R이 커져도 전류가 작아지는 대신 오래 걸려서 열의 총량은 같아요.', '4배가 되지 않아요. 열은 전지 에너지 CV²의 절반으로 정해져 있어요.'],
          explain: '충전이 끝나면 전지가 낸 에너지 CV² 중 ½CV²는 축전기에 저장되고, 나머지 ½CV²가 열이에요. R을 바꾸면 충전 속도(전류의 크기와 시간)만 바뀌고 열의 총량은 같아요. (그래프 아래 에너지 막대로 확인했어요.)',
        },
      ],
    },
    {
      title: '인덕터: 자기장에 저장하고 변화를 방해해요', short: '인덕터', icon: '🌀', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 축전기는 전기장에 에너지를 저장했어요(전압이 서서히 변함). <b>앞 차시 「변압기와 인덕터」</b>의 인덕터는 어떨까요? 같은 질문 “에너지가 어디에 있나?”를 던져 봐요.</div>' +
        '<p>R–L 직렬 회로에서 스위치를 닫으면 전류가 <b>서서히</b> 늘고, 에너지 ½LI²이 <b>자기장</b>에 저장돼요. 스위치를 열면 전류는 갑자기 끊기지 못하고 저장된 에너지가 스파크로 방출돼요. L을 바꿔 느린 정도를 비교해요.</p>',
      features: ['ind'],
      setup() { S.gate = ''; nReset(0.5, false, false); S.n.runs = {}; S.n.seen = {}; setScene('ind'); },
      recap: '인덕터는 자기장에 에너지를 저장하고 전류의 급변을 방해해요(전류가 서서히 변함). 전류를 끊으면 저장된 에너지가 스파크로 방출돼요.',
      summary: '<ul><li><b>인덕터</b>: 에너지를 자기장에 저장(½LI²)하고 전류의 변화를 방해해요. 스위치를 닫으면 전류가 서서히 늘어요. L이 클수록 더 느려요.</li><li>스위치를 열면 전류가 갑자기 끊기지 못하고 저장된 에너지가 스파크·열로 방출돼요. 예) L = 2.0 H, 0.50 A → 0.010 s: |ε| = 100 V.</li><li>대비: <b>축전기는 전압이</b>, <b>인덕터는 전류가</b> 갑자기 변하지 못해요. 축전기는 전기장에, 인덕터는 자기장에 에너지를 저장해요.</li><li>쓰임: 자동차 점화 코일, 형광등 안정기, 전원 장치의 초크 코일(전류 변화 완만화).</li></ul>',
      missions: [
        {
          title: '전류 상승 곡선 비교하기',
          goal: 'L = <b>0.5 H</b>와 <b>2.0 H</b> 모두 스위치를 닫고 전류가 0.45 A(최대의 90 %)를 넘을 때까지 기다려 보세요. 어느 쪽이 더 느린가요?',
          hint: 'L 칩을 고르고 🔌 스위치 닫기 → 그래프의 곡선이 올라가요. 0.45 A를 넘은 뒤 스위치를 열고 다른 L로 한 번 더 해요. (화면은 10배 느려요)',
          setup() { S.gate = ''; nReset(0.5, false, false); S.n.runs = {}; S.n.seen = {}; setScene('ind'); },
          check: () => !!S.n.seen[0.5] && !!S.n.seen[2], hold: 0.3,
          status: () => mark(!!S.n.seen[0.5]) + ' L = 0.5 H &nbsp; ' + mark(!!S.n.seen[2]) + ' L = 2.0 H',
          explain: 'L이 클수록 전류의 증가를 더 강하게 방해해서 곡선이 더 천천히 올라가요(L = 2.0 H가 더 느려요). 두 경우 모두 결국 같은 전류(0.50 A)에 도달하고, 그때 자기장에 저장된 에너지는 ½LI²이라 L이 클수록 많아요.',
        },
        {
          title: '스파크와 L의 효과', manual: true,
          goal: '두 질문에 답한 뒤 <b>✔ 확인하기</b>를 누르세요. (화면의 곡선과 번쩍임을 떠올려 봐요)',
          hint: '인덕터는 저장한 자기장 에너지를 전류가 끊길 때 내놓아요. L이 클수록 전류 변화를 더 강하게 방해해요.',
          setup() { S.gate = 'mn2'; nReset(2, true, true); resetSels(selNs, selN.st, selN.ok); setScene('ind'); },
          check: () => checkSel(selNR, selN.st, selN.ok, selNs, '빨간 칸을 다시 골라 보세요. 인덕터는 전류의 “변화”를 방해하고 에너지를 자기장에 저장해요.'),
          status: () => '고른 문제 ' + selNR.filter((r, i) => selN.st[i]).length + ' / 2',
          explain: '스위치를 열면 전류가 급히 줄어들고, 코일은 그 변화를 방해하려고 저장해 둔 자기장 에너지로 큰 기전력을 만들어요(스파크). L이 클수록 방해가 커서 전류가 <b>더 서서히</b> 늘어나요.',
        },
        {
          type: 'quiz', title: '갑자기 변하지 못하는 것',
          goal: '축전기와 인덕터 중 <b>전압이 갑자기 변하지 못하는</b> 소자는 어느 것일까요?',
          setup() { S.gate = ''; setScene('ind'); },
          choices: ['축전기 — 극판의 전하가 조금씩 쌓이므로 전압이 서서히 변해요', '인덕터 — 전류가 서서히 변하므로 전압도 서서히 변해요', '둘 다예요', '저항이에요'],
          answer: 0,
          feedback: ['', '인덕터는 “전류”가 갑자기 변하지 못해요. 전압은 오히려 갑자기 커질 수 있어요(스파크!).', '두 소자는 반대예요. 축전기는 전압, 인덕터는 전류가 서서히 변해요.', '저항은 전류와 전압이 비례해서 곧바로 따라 변해요.'],
          explain: '축전기는 전하가 쌓이거나 빠져나가는 데 시간이 걸려서 <b>전압</b>이 서서히 변하고, 인덕터는 자기장 에너지가 변하는 데 시간이 걸려서 <b>전류</b>가 서서히 변해요. 그래서 인덕터를 급히 끊으면 전압이 크게 튀어요.',
        },
      ],
    },
    {
      title: '장치 분석: 소자의 역할 찾기', short: '장치 분석', icon: '🧰', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 저항(열), 축전기(전기장에 저장), 인덕터(자기장에 저장)를 배웠어요. 이제 일상 속 장치 6가지에서 <b>핵심 소자</b>를 찾고 에너지 흐름도를 완성해요.</div>' +
        '<p>카드를 눌러 장치를 고르고 핵심 소자를 골라 보세요. 맞으면 에너지 흐름도(전원 → 소자 → 저장/열/방출)가 나타나요. 소자를 바꾸면 어떻게 달라지는지도 예측해 봐요.</p>',
      features: ['dev'],
      setup() { S.gate = ''; S.d.ans = {}; S.d.sel = 0; S.d.wrongT = {}; setScene('dev'); },
      recap: '저항은 에너지를 열로 바꾸고, 축전기는 전기장에, 인덕터는 자기장에 저장했다가 내놓아요. 장치마다 이 성질을 이용해요.',
      summary: '<ul><li><b>전기난로</b> — 저항: 전기 → 열(저장 ✕). <b>카메라 플래시</b> — 축전기: 천천히 충전해 4.5 J 저장 → 약 1 ms에 방전. <b>점화 코일</b> — 인덕터: 전류를 끊으면 12 V에서 수 kV.</li><li><b>터치 센서</b> — 축전기: 손가락이 닿아 정전 용량이 변하는 것을 읽어요. <b>평활 회로</b> — 병렬 축전기가 전압 출렁임을 줄여요(초크 코일 = 인덕터도 사용). <b>형광등 안정기</b> — 인덕터: 전류의 변화를 방해해 전류를 제한.</li><li>E = ½CV²: C를 반으로 하면 저장·방출 에너지는 절반. 축전기는 모았다가 한꺼번에, 인덕터는 급변을 막아요.</li></ul>',
      missions: [
        {
          title: '장치 6가지의 핵심 소자',
          goal: '장치 카드 <b>6장</b>을 모두 눌러 각 장치의 핵심 소자(저항 · 축전기 · 인덕터)를 맞혀 보세요.',
          hint: '난로는 열, 플래시·터치·평활 회로는 전기장에 저장, 점화 코일·안정기는 전류의 변화를 방해해요. 틀리면 다른 소자를 다시 골라요.',
          setup() { S.gate = ''; S.d.ans = {}; S.d.sel = 0; S.d.wrongT = {}; setScene('dev'); },
          check: devAll, hold: 0.4,
          status: () => DEV.map((d, i) => mark(devOK(i)) + ' ' + d.name).join(' &nbsp; '),
          explain: '난로=저항(열), 플래시=축전기(전기장에 저장 후 방전), 점화 코일=인덕터(전류 차단 시 고전압), 터치 센서=축전기(정전 용량 변화), 평활 회로=축전기(전압 출렁임 완화), 형광등 안정기=인덕터(전류 변화 방해)예요.',
        },
        {
          title: '소자를 바꾸면? · 플래시의 비밀', manual: true,
          goal: '세 질문에 답하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '저장 에너지는 ½CV²이에요. 플래시는 천천히 저장하고 한꺼번에 내놓아요. 평활 회로의 축전기는 전압이 변할 때 충전·방전해요.',
          setup() { S.gate = 'md2'; S.d.sel = 1; resetSels(selDs, selD.st, selD.ok); setScene('dev'); },
          check: () => checkSel(selDR, selD.st, selD.ok, selDs, '빨간 칸을 다시 골라 보세요. E = ½CV², 축전기는 모았다가 한꺼번에 내놓아요.'),
          status: () => '고른 문제 ' + selDR.filter((r, i) => selD.st[i]).length + ' / 3',
          explain: 'E = ½CV²이므로 C를 반으로 하면 같은 전압에서 저장·방출 에너지도 <b>절반</b>이에요. 플래시는 천천히 저장한 에너지를 약 1 ms에 한꺼번에 내놓아 센 빛을 만들고, 전원 장치의 평활 축전기는 전압이 높을 때 충전·낮을 때 방전해 전압을 매끄럽게 해요.',
        },
      ],
    },
  ];
  levels.forEach((lv) => lv.missions.forEach((m) => { MS[m.title] = m; }));

  game = SciSim.game({
    simId: 'hq-circuit-energy', mount: '#game', badge: '소자 분석가', homeHref: '../../index.html#hq',
    featureLabels: { res: '🔥 저항 · 에너지 흐름도', cap: '🔋 R–C 충방전 · 에너지 막대', ind: '🌀 R–L 회로 · 네온 램프', dev: '🧰 장치 카드 6장' },
    onFeatures() { updateCtl(); },
    levels,
  });

  SciSim.pointer(view, { down(p) { return devDown(p); }, move() {}, up() {}, hover(p) { if (S.mode !== 'dev' || S.gate === 'md2') return 'default'; const q = lp(p); for (let i = 0; i < 6; i++) { const r = cardRect(i); if (q.x >= r.x && q.x <= r.x + r.w && q.y >= r.y && q.y <= r.y + r.h) return 'pointer'; } return 'default'; } });

  /* ---------- 시작 ---------- */
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    if (S.mode === 'res') stepRes(dt); else if (S.mode === 'cap') stepCap(dt); else if (S.mode === 'ind') stepInd(dt);
    sceneBg();
    T(14, 26, TITLE[S.mode], PHONE ? 11.5 : 15.5, '#26324a', 'left', 800);
    if (S.mode === 'res') drawRes(); else if (S.mode === 'cap') drawCap(); else if (S.mode === 'ind') drawIndC(); else drawDev();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SC, STP, IN, MS, DEV, EL, numKwh, selCs, selNs, selDs,
    get game() { return game; }, setScene, updateCtl, toggleR, cSetMode, cReset, toggleN, nReset, selDev, pickEl, rP, rI, cTau, lp, cardRect,
  };

})();
