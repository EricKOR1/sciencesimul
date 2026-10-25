/* =========================================================
   전자기와 양자 Ⅰ. 전자기적 상호작용 - 트랜지스터 회로 (단원 11차시)
   성취기준 [12전자01-07] 다이오드, 트랜지스터 등 반도체 소자를 활용하는 전자회로를 분석하고, 현대 문명에서 반도체의 중요성을 인식할 수 있다.
   ① 실험: 스위치 (NPN: I_C = βI_B, 포화, 자동 가로등)
   ② 실험: 증폭 (바이어스, 위상 반전, 클리핑)
   ③ 탐구: 소리 증폭 (마이크 → 1단 → 2단 → 스피커 배선, 클리핑 왜곡)
   ④ 분석: 논리회로 (NOT · NAND · NOR, NAND 만능성, 반가산기)
   트랜지스터는 '베이스 전류가 컬렉터 전류를 조절하는 소자'로만 모형화해요. 전자·양공 이동, 하이브리드 파라미터, 전압 이득 공식, 전계 효과 트랜지스터는 다루지 않아요.
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
  const COL_BLUE = '#1e40af', COL_TEAL = '#0d9488', COL_RED = '#dc2626', COL_ORG = '#f97316';

  const MODE_LABEL = { sw: '🔌 스위치', amp: '📈 증폭', snd: '📢 소리 증폭', logic: '🧮 논리회로' };
  const TITLE = {
    sw: '🔌 트랜지스터 스위치: 작은 I_B 가 큰 I_C 를 조절해요',
    amp: '📈 증폭: I_B 의 작은 변화 → I_C 의 큰 변화',
    snd: '📢 소리 증폭: 마이크 → 증폭기 → 스피커',
    logic: '🧮 트랜지스터로 만드는 논리회로',
  };
  const CXs = SC.w / 2;
  const BETA = 100, VBE = 0.7, VCES = 0.2, RLAMP = 0.2 /* kΩ */, ICMAX = (5 - VCES) / RLAMP /* 24 mA */;
  const mark2 = mark;

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'sw', t: 0, fade: 0, gate: '',
    w: { sub: 'vin', vin: 0, br: 10, lamp: 0, phb: 0, phc: 0, seenOff: 0, seenAct: 0 },
    a: { bias: 2.0, A: 10, tc: 0, phb: 0, phc: 0, sawCut: 0, sawSat: 0, key: '', cache: null, cur: { ib: 20, ic: 2, vc: 5 } },
    s: { conn: [-1, -1, -1, -1], on: [true, true], voice: 10, drag: null, sel: null, ph: 0, cone: 0, rings: [], sawQuiet: 0, tc: 0, flash: 0 },
    g: { sub: 'inv', kind: 'not', nbk: 'not', A: 0, B: 0, tb: {}, seen: {}, ph: 0, ph2: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const masked = (g) => S.gate === g && game && game.phase === 'active';
  const fmI = (mA) => p3(mA) + ' mA';

  /* ---------- 공통 그림 도구 ---------- */
  function drawBulb(x, y, r, b) {
    const g = clamp(b, 0, 1);
    if (g > 0.03) D.glow(x, y, r * 2.6, '#fde047', 0.75 * g);
    ctx.fillStyle = '#fbfcff'; ctx.beginPath(); ctx.arc(x, y - 3, r + 1, 0, TAU); ctx.fill();
    ctx.fillStyle = g > 0.03 ? 'rgba(254,240,138,' + (0.45 + 0.55 * g) + ')' : 'rgba(226,232,240,.9)'; ctx.beginPath(); ctx.arc(x, y - 3, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = g > 0.03 ? '#f59e0b' : '#94a3b8'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - r * 0.35, y + r * 0.25); ctx.lineTo(x - r * 0.2, y - r * 0.25); ctx.lineTo(x, y + r * 0.1); ctx.lineTo(x + r * 0.2, y - r * 0.25); ctx.lineTo(x + r * 0.35, y + r * 0.25); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(x - r * 0.38, y + r - 6, r * 0.76, 10); ctx.fillStyle = '#64748b'; ctx.fillRect(x - r * 0.38, y + r - 2, r * 0.76, 2);
  }
  function zig(x1, y1, x2, y2, n, amp, color, lw) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, px = -uy, py = ux;
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1);
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n, s = k % 2 ? -amp : amp; ctx.lineTo(x1 + dx * t + px * s, y1 + dy * t + py * s); }
    ctx.lineTo(x2, y2); ctx.stroke();
  }
  function gndSym(x, y) {
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x, y); ctx.moveTo(x - 13, y); ctx.lineTo(x + 13, y); ctx.moveTo(x - 8, y + 5); ctx.lineTo(x + 8, y + 5); ctx.moveTo(x - 3, y + 10); ctx.lineTo(x + 3, y + 10); ctx.stroke();
  }
  function dot(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function ammeter(x, y, r, color) {
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }, { blur: 4, y: 1 });
    ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); T(x, y + 4.5, 'A', 12, color, 'center', 800);
  }
  function meterV(x, y, color) {
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = color || '#0d9488'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.stroke(); T(x, y + 5, 'V', 14, color || '#0d9488', 'center', 800);
  }
  // NPN 트랜지스터 기호. 단자: B(왼쪽) C(위) E(아래)
  const NPN = (cx, cy) => ({ B: [cx - 46, cy], C: [cx + 12, cy - 44], E: [cx + 12, cy + 44] });
  function npn(cx, cy, st, noLab) {                                 // st: 'off' | 'act' | 'sat'
    const col = st === 'off' ? '#64748b' : st === 'act' ? '#16a34a' : '#d97706';
    if (st !== 'off') D.glow(cx, cy, 46, st === 'act' ? '#4ade80' : '#fbbf24', 0.38);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, TAU); ctx.fill(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 46, cy); ctx.lineTo(cx - 10, cy); ctx.stroke();
    ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(cx - 10, cy - 16); ctx.lineTo(cx - 10, cy + 16); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 10, cy - 8); ctx.lineTo(cx + 12, cy - 24); ctx.lineTo(cx + 12, cy - 44); ctx.moveTo(cx - 10, cy + 8); ctx.lineTo(cx + 12, cy + 24); ctx.lineTo(cx + 12, cy + 44); ctx.stroke();
    const ax = cx + 12, ay = cy + 24, ux = 22 / 27.2, uy = 16 / 27.2;       // 이미터 화살표 (전류가 나가는 방향)
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(ax - ux * 2 + 0, ay - uy * 2); ctx.lineTo(ax - ux * 10 + uy * 5, ay - uy * 10 - ux * 5); ctx.lineTo(ax - ux * 10 - uy * 5, ay - uy * 10 + ux * 5); ctx.closePath(); ctx.fill();
    if (!noLab) { T(cx - 17, cy + 11, 'B', 11, '#64748b', 'right', 800); T(cx + 22, cy - 30, 'C', 11, '#64748b', 'left', 800); T(cx + 22, cy + 40, 'E', 11, '#64748b', 'left', 800); }
  }
  function flowBox(x, y, w, h, title, sub, fill, ink, hot) {
    D.shadow(() => { D.roundRect(x, y, w, h, 10); ctx.fillStyle = fill; ctx.fill(); }, { blur: hot ? 9 : 4, y: 2 });
    if (hot) { D.roundRect(x, y, w, h, 10); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.4; ctx.stroke(); }
    T(x + w / 2, y + 20, title, 12.5, ink, 'center', 800); if (sub) T(x + w / 2, y + 38, sub, 11.5, ink, 'center', 700);
  }
  const bjtState = (c) => (c.region === 'cut' ? 'off' : c.region === 'sat' ? 'sat' : 'act');
  const REG = { cut: '차단', act: '증폭 영역', sat: '포화' };
  function calcBjt(Vth, RthK) {                              // Vth (V), Rth (kΩ) → 전류는 mA
    const IB = Math.max(0, Vth - VBE) / RthK, IC0 = BETA * IB, sat = IB > 0 && IC0 >= ICMAX - 1e-9, IC = Math.min(IC0, ICMAX);
    return { Vth, IB, IC0, IC, sat, region: IB <= 0 ? 'cut' : sat ? 'sat' : 'act', VCE: sat ? VCES : 5 - RLAMP * IC, lamp: IC / ICMAX };
  }

  /* ================= ① 스위치 ================= */
  const RC_TAB = [100, 60, 36, 22, 14, 9, 5.5, 3.2, 2.0, 1.4, 1.0];       // CdS 저항 (kΩ), 주변 밝기 단계 0(깜깜) ~ 10(한낮)
  function swCalc() {
    const w = S.w;
    if (w.sub === 'vin') return calcBjt(w.vin, 10);
    const Rc = RC_TAB[w.br], R1 = 10;
    return Object.assign(calcBjt(5 * Rc / (R1 + Rc), R1 * Rc / (R1 + Rc)), { Rc });
  }
  const wMask = () => masked('mw2');
  function stepSw(dt) {
    const w = S.w; if (dt <= 0) return;
    const c = swCalc();
    w.lamp = SciSim.approach(w.lamp, c.lamp, dt, 9);
    w.phb += dt * (c.IB > 0 ? 12 + 90 * c.IB : 0); w.phc += dt * (c.IC > 0 ? 12 + 3 * c.IC : 0);
    if (w.sub === 'vin') { if (w.vin < VBE - 1e-9) w.seenOff += dt; if (c.region === 'act' && c.IC > 2 && c.IC < 20) w.seenAct += dt; }
  }
  function drawSw() {
    const w = S.w, c = swCalc(), mk = wMask(), cds = w.sub === 'cds'; sceneBegin();
    const st = bjtState(c), cx = 260, cy = 130, P = NPN(cx, cy);
    // 도선
    const wp = new Path2D();
    wp.moveTo(cx + 12, 12); wp.lineTo(cx + 12, 22); wp.moveTo(cx + 12, 62); wp.lineTo(cx + 12, 72); wp.moveTo(cx + 12, 88); wp.lineTo(P.C[0], P.C[1]);
    wp.moveTo(P.E[0], P.E[1]); wp.lineTo(P.E[0], 190);
    if (!cds) { wp.moveTo(40, 150); wp.lineTo(40, 130); wp.lineTo(80, 130); wp.moveTo(150, 130); wp.lineTo(160, 130); wp.moveTo(176, 130); wp.lineTo(P.B[0], P.B[1]); wp.moveTo(170, 12); wp.lineTo(cx + 12, 12); }
    else { wp.moveTo(150, 12); wp.lineTo(cx + 12, 12); wp.moveTo(150, 12); wp.lineTo(150, 30); wp.moveTo(150, 96); wp.lineTo(150, 130); wp.lineTo(P.B[0] - 40, 130); wp.moveTo(P.B[0] - 26, 130); wp.lineTo(P.B[0], P.B[1]); wp.moveTo(150, 130); wp.lineTo(150, 146); wp.moveTo(150, 190); wp.lineTo(150, 196); }
    wireStroke(wp, 2.8, c.IC > 0.5 ? 0.25 : 0);
    gndSym(P.E[0], 196);
    T(170 + (cds ? -20 : 0), 18, '+5.0 V', 12.5, '#dc2626', 'right', 800);
    // 램프
    drawBulb(cx + 12, 42, 14, w.lamp); T(cx + 34, 40, '램프 200 Ω', 12, '#475569', 'left', 800);
    // 전류계
    ammeter(cx + 12, 80, 8, '#ea580c'); lbl(cx + 78, 80, 'I_C = ' + (mk ? '?' : fmI(c.IC)), { size: 12, bg: '#ea580c', pad: 6, minX: 0, maxX: SC.w });
    npn(cx, cy, st);
    if (!cds) {
      zig(80, 130, 150, 130, 5, 8, '#475569', 3.2); T(115, 152, 'R_B 10 kΩ', 12, '#334155', 'center', 800);
      ammeter(168, 130, 8, '#7c3aed'); lbl(168, 106, 'I_B = ' + fmI(c.IB), { size: 12, bg: '#7c3aed', pad: 6, minX: 0, maxX: SC.w });
      // 입력 전원
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(40, 163, 13, 0, TAU); ctx.fill(); }, { blur: 4, y: 1 });
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(40, 163, 13, 0, TAU); ctx.stroke(); T(40, 168, '+', 14, '#dc2626', 'center', 800);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(40, 176); ctx.lineTo(40, 184); ctx.stroke(); gndSym(40, 190);
      lbl(40, 108, 'V_in = ' + w.vin.toFixed(1) + ' V', { size: 12.5, bg: '#2563eb', pad: 7, minX: 0, maxX: SC.w });
      if (c.IB > 0.001) pathDots([[40, 150], [40, 130], [P.B[0], P.B[1]]], w.phb, 20, 2.6, '#a78bfa');
    } else {
      zig(150, 30, 150, 96, 6, 8, '#475569', 3.2); T(138, 66, 'R 10 kΩ', 12, '#334155', 'right', 800);
      zig(150, 146, 150, 190, 5, 8, '#92400e', 3.4); gndSym(150, 196); T(138, 172, 'CdS ' + (RC_TAB[w.br] >= 10 ? RC_TAB[w.br].toFixed(0) : RC_TAB[w.br].toFixed(1)) + ' kΩ', 12, '#92400e', 'right', 800); T(170, 168, w.br >= 6 ? '☀️' : '🌙', 20, '#000', 'center', 700);
      dot(150, 130, 3.6, '#334155');
      ammeter(P.B[0] - 33, 130, 8, '#7c3aed'); lbl(P.B[0] - 28, 106, 'I_B = ' + fmI(c.IB), { size: 12, bg: '#7c3aed', pad: 6, minX: 0, maxX: SC.w });
      lbl(70, 130, '베이스 전압 ' + c.Vth.toFixed(2) + ' V', { size: 12, bg: '#2563eb', pad: 6, minX: 0, maxX: SC.w });
      if (c.IB > 0.001) pathDots([[150, 12], [150, 130], [P.B[0], P.B[1]]], w.phb, 20, 2.6, '#a78bfa');
    }
    if (c.IC > 0.02) pathDots([[cx + 12, 12], [cx + 12, 72], [P.C[0], P.C[1]], [P.E[0], P.E[1]], [P.E[0], 190]], w.phc, 22, 2.8, '#f59e0b');
    lbl(400, 112, '상태: ' + REG[c.region], { size: 13, bg: c.region === 'cut' ? '#64748b' : c.region === 'act' ? '#16a34a' : '#d97706', pad: 9, minX: 0, maxX: SC.w });
    T(400, 144, 'V_CE = ' + c.VCE.toFixed(1) + ' V', 12.5, '#334155', 'center', 800);
    T(400, 164, c.region === 'sat' ? 'β I_B = ' + (mk ? '?' : p3(c.IC0) + ' mA') : c.region === 'act' ? 'I_C = β I_B' : '문턱 0.7 V 아래', 12, '#9a3412', 'center', 800);
    // 그래프
    D.shadow(() => { D.roundRect(10, 216, 452, 178, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    const gx0 = 52, gx1 = 440, gy0 = 252, gy1 = 366;
    const xmax = cds ? 10 : 5, X = (v) => gx0 + v / xmax * (gx1 - gx0), Y = (i) => gy1 - clamp(i, 0, 45) / 45 * (gy1 - gy0);
    T(20, 234, cds ? '주변 밝기에 따른 램프 전류 I_C (밤 → 낮)' : '입력 전압에 따른 컬렉터 전류 I_C', 12, COL_BLUE, 'left', 800);
    if (!cds) { [[0, 0.7, 'rgba(100,116,139,.14)', '차단'], [0.7, 3.1, 'rgba(34,197,94,.14)', '증폭'], [3.1, 5, 'rgba(245,158,11,.16)', '포화']].forEach((z) => { ctx.fillStyle = z[2]; ctx.fillRect(X(z[0]), gy0, X(z[1]) - X(z[0]), gy1 - gy0); T((X(z[0]) + X(z[1])) / 2, gy0 + 14, z[3], 11.5, '#516079', 'center', 800); }); }
    ctx.strokeStyle = '#e8edf5'; ctx.lineWidth = 1; [0, 10, 20, 30, 40].forEach((v) => { ctx.beginPath(); ctx.moveTo(gx0, Y(v)); ctx.lineTo(gx1, Y(v)); ctx.stroke(); T(gx0 - 5, Y(v) + 4, v, 10.5, '#ea580c', 'right', 700); });
    T(gx0 - 6, gy0 - 6, 'mA', 10.5, '#ea580c', 'right', 700);
    if (!cds) for (let v = 0; v <= 5; v++) T(X(v), gy1 + 15, v + ' V', 10.5, '#64748b', 'center', 700);
    else for (let v = 0; v <= 10; v += 2) T(X(v), gy1 + 15, v === 0 ? '밤' : v === 10 ? '낮' : v, 10.5, '#64748b', 'center', 700);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx0, gy0 - 4); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    const pts = [], N = cds ? 10 : 100;
    for (let i = 0; i <= N; i++) { const v = i / N * xmax; let cc; if (cds) { const Rc = RC_TAB[i]; cc = calcBjt(5 * Rc / (10 + Rc), 10 * Rc / (10 + Rc)); } else cc = calcBjt(v, 10); pts.push([v, cc]); }
    if (!cds && !mk) { ctx.setLineDash([5, 4]); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1].IC0)) : ctx.moveTo(X(q[0]), Y(q[1].IC0)))); ctx.stroke(); ctx.setLineDash([]); lbl(X(3.9), Y(43) + 3, 'β I_B (점선)', { size: 11, bg: '#2563eb', pad: 5, minX: 0, maxX: SC.w }); }
    if (!mk || cds) { ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1].IC)) : ctx.moveTo(X(q[0]), Y(q[1].IC)))); ctx.stroke(); }
    if (!cds) lbl(X(4.4), Y(24) + 14, '램프 최대 24 mA', { size: 11, bg: '#f97316', pad: 5, minX: 0, maxX: SC.w });
    const px = cds ? X(w.br) : X(w.vin);
    if (!mk || cds) { D.glow(px, Y(c.IC), 12, '#f97316', 0.7); dot(px, Y(c.IC), 5, '#ea580c'); }
    ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, gy0); ctx.lineTo(px, gy1); ctx.stroke(); ctx.setLineDash([]);
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, bw = STP.w - 24;
    T(bx, STP.y + 19, '램프 밝기 (최대 24 mA 눈금)', 12.5, COL_BLUE, 'left', 800); trackBar(bx + 4, STP.y + 28, bw - 90, 14, mk ? 0 : c.IC / ICMAX, '#f59e0b'); T(bx + bw, STP.y + 40, mk ? '?' : fmI(c.IC), 12.5, '#26324a', 'right', 800);
    T(bx, STP.y + 64, c.region === 'cut' ? '입력이 0.7 V 아래라 I_B = 0 → I_C = 0 (스위치 꺼짐)' : c.region === 'act' ? 'I_C = β I_B (β = 100): 작은 I_B 가 100배의 I_C 를 조절해요' : 'β I_B 가 램프 허용 전류보다 커서 포화 → 스위치 켜짐', PHONE ? 11 : 12, '#0b7a41', 'left', 800);
    T(bx, STP.y + 82, '※ 전류 눈금: I_B ' + (cds ? '0.42' : '0.43') + ' mA 이하, I_C 24 mA 이하', 11, '#516079', 'left', 700);
    infoPanel([
      { h: cds ? '자동 가로등' : '트랜지스터 스위치' },
      { p: cds ? '밤이 되어 CdS 저항이 커지면 베이스 전압이 올라가 트랜지스터가 켜지고 램프(가로등)가 켜져요.' : 'NPN 트랜지스터는 베이스(B) 전류 I_B 가 컬렉터(C) 전류 I_C 를 조절해요. 활성 영역에서 I_C = β I_B (β = 100).', c: COL_BLUE },
      { tbl: [['차단', 'V_BE < 0.7 V → I_B = 0', ''], ['증폭', 'I_C = β I_B', ''], ['포화', '램프 허용 24 mA', '']], c1: 0.2 },
      { p: '포화: β I_B 가 램프가 허용하는 최대 전류 (5.0 − 0.2) V / 200 Ω = 24 mA 보다 크면 I_C 는 24 mA 에서 멈추고 V_CE ≈ 0.2 V 예요.', c: '#9a3412' },
      { p: '🏭 자동 가로등, 도어락 신호등, 릴레이 구동, 컴퓨터 메모리의 스위치로 쓰여요.', c: '#0b7a41', big: 1 },
    ]);
  }
  bindSl('sVin', () => Math.round(S.w.vin * 10), (v) => { S.w.vin = v / 10; }, () => updateCtl());
  bindSl('sBr', () => S.w.br, (v) => { S.w.br = v; }, () => updateCtl());
  $$('#swSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.w.sub = b.dataset.v; updateCtl(); }));

  /* ================= ② 증폭 ================= */
  const ICSAT = (9 - VCES) / 2;                                    // 4.4 mA (R_C = 2.0 kΩ, V_CC = 9.0 V)
  const NS = 200;
  function ampSamples() {
    const a = S.a, key = a.bias + '|' + a.A;
    if (a.key === key) return a.cache;
    const ib = [], ic = [], vc = []; let lo = 1e9, hi = -1e9;
    for (let i = 0; i <= NS; i++) {
      const phi = TAU * 2 * i / NS, ibv = a.bias * 10 + a.A * Math.sin(phi), raw = ibv / 10;      // μA → mA (β = 100)
      lo = Math.min(lo, raw); hi = Math.max(hi, raw);
      const c = clamp(raw, 0, ICSAT); ib.push(ibv); ic.push(c); vc.push(9 - 2 * c);
    }
    const vmax = Math.max.apply(null, vc), vmin = Math.min.apply(null, vc);
    a.cache = { ib, ic, vc, clipLo: lo < -1e-9, clipHi: hi > ICSAT + 1e-9, amp: (vmax - vmin) / 2, vmax, vmin }; a.key = key; return a.cache;
  }
  const aMask = () => masked('ma2');
  const aClean = () => { const m = ampSamples(); return !m.clipLo && !m.clipHi && S.a.A >= 10; };
  function stepAmp(dt) {
    const a = S.a; if (dt <= 0) return;
    a.tc = (a.tc + dt / 4.8) % 1;
    const m = ampSamples(), idx = Math.min(NS, Math.round(a.tc * NS));
    a.cur = { ib: m.ib[idx], ic: m.ic[idx], vc: m.vc[idx] };
    a.phb += dt * (12 + 3 * Math.max(0, a.cur.ib)); a.phc += dt * (12 + 30 * a.cur.ic);
    if (m.clipLo) a.sawCut += dt; if (m.clipHi) a.sawSat += dt;
  }
  function drawAmp() {
    const a = S.a, m = ampSamples(), mk = aMask(); sceneBegin();
    const cx = 300, cy = 136, P = NPN(cx, cy), cur = a.cur;
    const wp = new Path2D();
    wp.moveTo(cx + 12, 10); wp.lineTo(cx + 12, 16); wp.moveTo(cx + 12, 46); wp.lineTo(cx + 12, 50); wp.moveTo(cx + 12, 66); wp.lineTo(P.C[0], P.C[1]); wp.moveTo(P.E[0], P.E[1]); wp.lineTo(P.E[0], 190);
    wp.moveTo(60, 145); wp.lineTo(60, cy); wp.lineTo(190, cy); wp.moveTo(206, cy); wp.lineTo(P.B[0], P.B[1]);
    wp.moveTo(150, 10); wp.lineTo(cx + 12, 10);
    wireStroke(wp, 2.8, cur.ic > 0.3 ? 0.2 : 0);
    gndSym(P.E[0], 190); T(144, 16, '+9.0 V', 12.5, '#dc2626', 'right', 800);
    zig(cx + 12, 16, cx + 12, 46, 5, 8, '#475569', 3.2); T(cx - 6, 34, 'R_C 2.0 kΩ', 12, '#334155', 'right', 800);
    ammeter(cx + 12, 58, 8, '#ea580c');
    npn(cx, cy, cur.ic <= 0.001 ? 'off' : cur.ic >= ICSAT - 0.01 ? 'sat' : 'act');
    // 출력 단자
    dot(cx + 12, 76, 3.6, '#334155'); ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(cx + 12, 76); ctx.lineTo(cx + 60, 76); ctx.stroke(); meterV(cx + 74, 76, '#0d9488');
    lbl(404, 50, 'i_C = ' + (mk ? '?' : p3(cur.ic) + ' mA'), { size: 12, bg: '#ea580c', pad: 6, minX: 0, maxX: SC.w });
    lbl(404, 100, 'v_C = ' + (mk ? '?' : cur.vc.toFixed(1) + ' V'), { size: 12, bg: '#0d9488', pad: 6, minX: 0, maxX: SC.w });
    // 입력
    ammeter(198, cy, 8, '#7c3aed'); lbl(130, cy - 22, 'i_B = ' + p3(cur.ib) + ' μA', { size: 12, bg: '#7c3aed', pad: 6, minX: 0, maxX: SC.w });
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(60, 160, 15, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(60, 160, 15, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(49, 160); ctx.bezierCurveTo(53, 148, 57, 148, 60, 160); ctx.bezierCurveTo(63, 172, 67, 172, 71, 160); ctx.stroke();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(60, 175); ctx.lineTo(60, 183); ctx.stroke(); gndSym(60, 189);
    T(88, 164, '입력 ± ' + a.A + ' μA', 12, '#334155', 'left', 800); T(88, 182, '바이어스 ' + (a.bias * 10).toFixed(0) + ' μA', 12, '#334155', 'left', 800);
    if (cur.ib > 0.05) pathDots([[60, 145], [60, cy], [P.B[0], P.B[1]]], a.phb, 22, 2.6, '#a78bfa');
    if (cur.ic > 0.02) pathDots([[cx + 12, 10], [cx + 12, 66], [P.C[0], P.C[1]], [P.E[0], P.E[1]], [P.E[0], 190]], a.phc, 22, 2.8, '#f59e0b');
    const note = m.clipLo ? '왜곡: 입력의 아래쪽에서 I_C = 0 (차단) → 출력 위쪽이 잘려요' : m.clipHi ? '왜곡: I_C 가 포화 한계 4.4 mA → 출력 아래쪽이 잘려요' : '왜곡 없음: 입력과 같은 모양으로 커졌어요';
    lbl(CXs, 213, note, { size: 12, bg: m.clipLo || m.clipHi ? '#dc2626' : '#16a34a', pad: 9, minX: 0, maxX: SC.w });
    // 스코프
    D.shadow(() => { D.roundRect(10, 226, 452, 168, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    const gx0 = 50, gx1 = 424, gy0 = 252, gy1 = 366, Y1 = (v) => gy1 - (clamp(v, -20, 60) + 20) / 80 * (gy1 - gy0), Y2 = (v) => gy1 - clamp(v, 0, 9) / 9 * (gy1 - gy0), X = (i) => gx0 + i / NS * (gx1 - gx0);
    T(20, 244, '입력 i_B (파랑, 왼쪽 μA) · 출력 v_C (주황, 오른쪽 V) — 2주기', 11.5, COL_BLUE, 'left', 800);
    ctx.strokeStyle = '#e8edf5'; ctx.lineWidth = 1; [-20, 0, 20, 40, 60].forEach((v) => { ctx.beginPath(); ctx.moveTo(gx0, Y1(v)); ctx.lineTo(gx1, Y1(v)); ctx.stroke(); T(gx0 - 5, Y1(v) + 4, v, 10.5, '#2563eb', 'right', 700); });
    [0, 3, 6, 9].forEach((v) => T(gx1 + 5, Y2(v) + 4, v + ' V', 10.5, '#ea580c', 'left', 700));
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx0, gy0 - 4); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(37,99,235,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(gx0, Y1(a.bias * 10)); ctx.lineTo(gx1, Y1(a.bias * 10)); ctx.stroke(); ctx.setLineDash([]);
    const cs = Math.round(a.tc * NS);
    const tr = (arr, col, Yf) => {
      ctx.lineJoin = 'round'; ctx.lineWidth = 2.8;
      ctx.strokeStyle = SciSim.color.rgba(col, 0.28); ctx.beginPath(); arr.forEach((v, i) => (i ? ctx.lineTo(X(i), Yf(v)) : ctx.moveTo(X(i), Yf(v)))); ctx.stroke();
      ctx.strokeStyle = col; ctx.beginPath(); for (let i = 0; i <= cs; i++) (i ? ctx.lineTo(X(i), Yf(arr[i])) : ctx.moveTo(X(i), Yf(arr[i]))); ctx.stroke();
      D.glow(X(cs), Yf(arr[cs]), 10, col, 0.6);
    };
    tr(m.ib, '#2563eb', Y1); if (!mk) tr(m.vc, '#f97316', Y2); else { ctx.fillStyle = 'rgba(100,116,139,.8)'; T((gx0 + gx1) / 2, (gy0 + gy1) / 2, '출력 파형은 계산한 뒤에 공개돼요', 13, '#64748b', 'center', 800); }
    ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(cs), gy0 - 4); ctx.lineTo(X(cs), gy1); ctx.stroke(); ctx.setLineDash([]);
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12;
    T(bx, STP.y + 20, '바이어스 I_C0 = ' + a.bias.toFixed(1) + ' mA (I_B0 = ' + (a.bias * 10).toFixed(0) + ' μA, V_CE = ' + (9 - 2 * a.bias).toFixed(1) + ' V)', PHONE ? 12 : 13, COL_BLUE, 'left', 800);
    T(bx, STP.y + 44, '입력 ± ' + a.A + ' μA → I_C ± ' + (a.A / 10).toFixed(1) + ' mA → R_C 전압 ± ' + (mk ? '?' : (a.A / 10 * 2).toFixed(1)) + ' V' + (m.clipLo || m.clipHi ? ' (잘림)' : ''), PHONE ? 11.5 : 12.5, '#26324a', 'left', 800);
    T(bx, STP.y + 68, '출력 진폭(측정) ± ' + (mk ? '?' : m.amp.toFixed(1)) + ' V · 입력이 커지면 출력은 작아져요(위상 반대)', PHONE ? 11 : 12, '#9a3412', 'left', 800);
    infoPanel([
      { h: '트랜지스터 증폭기' },
      { p: '바이어스(직류) I_B0 가 I_C 의 중심을 정하고, 작은 신호 ± ΔI_B 가 ± β ΔI_B 의 I_C 변화를 만들어요.', c: COL_BLUE },
      { tbl: [['I_C = β I_B', '± 10 μA → ± 1.0 mA', ''], ['v_C = 9 − R_C I_C', 'R_C 전압 ± 2.0 V', '']], c1: 0.42 },
      { p: '출력 v_C 는 입력과 위상이 반대예요: i_B ↑ → I_C ↑ → R_C 의 전압 ↑ → 컬렉터 전압 ↓.', c: '#9a3412' },
      { p: '바이어스가 0이면 입력의 양(+) 반쪽만 증폭돼요. 너무 크면 I_C 가 한계(4.4 mA)에 닿아 파형이 잘려요.' },
      { p: '🏭 마이크·센서 신호 증폭, 라디오·오디오 앰프의 기본 회로예요.', c: '#0b7a41', big: 1 },
    ]);
  }
  bindSl('sBias', () => Math.round(S.a.bias * 2), (v) => { S.a.bias = v / 2; }, () => updateCtl());
  $$('#aSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.a.A = +b.dataset.v; updateCtl(); }));

  /* ================= ③ 소리 증폭 ================= */
  const BK = ['mic', 'a1', 'a2', 'spk'], BNAME = ['🎤 마이크', '1단 증폭', '2단 증폭', '🔊 스피커'], ILIM = 150;     // mA
  const blk = (i) => ({ x: 10 + i * 124, y: 36, w: 84, h: 76 });
  const pOut = (i) => { const r = blk(i); return [r.x + r.w, r.y + 38]; };
  const pIn = (i) => { const r = blk(i); return [r.x, r.y + 38]; };
  function sndCalc() {
    const s = S.s, seq = [0], seen = { 0: 1 }; let cur = 0;
    while (s.conn[cur] >= 0 && !seen[s.conn[cur]]) { cur = s.conn[cur]; seen[cur] = 1; seq.push(cur); }
    const reach = seq[seq.length - 1] === 3;
    let amp = s.voice / 1000, clipped = false, stages = 0; const vals = {};       // 전류 진폭 (mA)
    vals[0] = amp;
    for (let k = 1; k < seq.length; k++) {
      const b = seq[k];
      if (b === 1 || b === 2) { if (s.on[b - 1]) { amp *= BETA; stages++; if (amp > ILIM + 1e-9) { amp = ILIM; clipped = true; } } }
      vals[b] = amp;
    }
    const raw = (() => { let r = s.voice / 1000, n = 0; for (let k = 1; k < seq.length; k++) { const b = seq[k]; if ((b === 1 || b === 2) && s.on[b - 1]) { r *= BETA; n++; } } return r; })();
    const level = reach ? 20 * Math.log10(amp / (s.voice / 1000)) : 0;
    return { seq, reach, amp, raw, clipped, stages, vals, level, clear: reach && !clipped && amp >= 50 - 1e-9 };
  }
  const sndWired = () => S.s.conn[0] === 1 && S.s.conn[1] === 2 && S.s.conn[2] === 3;
  const fmAmp = (mA) => (mA < 1 ? Math.round(mA * 1000) + ' μA' : mA < 100 ? mA.toFixed(1) + ' mA' : Math.round(mA) + ' mA');
  function connect(i, j) {
    const s = S.s; if (i === j || i === 3 || j === 0) return false;
    for (let k = 0; k < 4; k++) if (s.conn[k] === j) s.conn[k] = -1;
    s.conn[i] = j; Sound.click(); s.flash = 1; updateCtl(); return true;
  }
  function stepSnd(dt) {
    const s = S.s; if (dt <= 0) return;
    const c = sndCalc(); s.tc += dt; s.ph += dt * 10;
    s.flash = SciSim.approach(s.flash, 0, dt, 4);
    const lvl = c.reach ? clamp(c.level / 85, 0, 1) : 0;
    s.cone = SciSim.approach(s.cone, lvl, dt, 8);
    if (c.reach && c.stages <= 1) s.sawQuiet += dt;
    if (c.reach && !RM) { s.nextRing = (s.nextRing || 0) - dt; if (s.nextRing <= 0) { s.nextRing = 0.95 - 0.7 * lvl; s.rings.push({ r: 8, a: 0.2 + 0.7 * lvl, w: 1 + 2 * lvl }); } }
    s.rings.forEach((q) => { q.r += dt * 55; q.a -= dt * 0.55; }); s.rings = s.rings.filter((q) => q.a > 0 && q.r < 70);
  }
  function bez(p0, p1, p2, p3_, t) { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3_[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3_[1]]; }
  function wireCtl(i, j) { const a = pOut(i), b = pIn(j), arc = j - i > 1 ? -34 * (j - i - 1) - 12 : j < i ? 40 : 0; return [a, [a[0] + 30, a[1] + arc], [b[0] - 30, b[1] + arc], b]; }
  function drawWire(pts, col, lw, dash) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]); ctx.stroke(); ctx.setLineDash([]);
  }
  function drawSnd() {
    const s = S.s, c = sndCalc(); sceneBegin();
    // 배선
    const act = {}; for (let k = 1; k < c.seq.length; k++) act[c.seq[k - 1]] = true;
    for (let i = 0; i < 3; i++) if (s.conn[i] >= 0) {
      const pts = wireCtl(i, s.conn[i]), on = !!act[i] && c.reach;
      drawWire(pts, 'rgba(15,23,42,.18)', 6); drawWire(pts, on ? '#f59e0b' : '#94a3b8', 3.2);
      if (on && !RM) for (let k = 0; k < 4; k++) { const t = ((s.ph * 0.05 + k / 4) % 1), q = bez(pts[0], pts[1], pts[2], pts[3], t); dot(q[0], q[1], 3, '#fff7ed'); dot(q[0], q[1], 2, '#ea580c'); }
    }
    if (s.drag) { const a = pOut(s.drag.from), q = [s.drag.x, s.drag.y]; drawWire([a, [a[0] + 30, a[1]], [q[0] - 30, q[1]], q], '#2563eb', 3, [7, 5]); }
    // 블록
    for (let i = 0; i < 4; i++) {
      const r = blk(i), onAmp = i === 1 || i === 2 ? s.on[i - 1] : true;
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = i === 0 ? '#e0f2fe' : i === 3 ? '#ffedd5' : onAmp ? '#dcfce7' : '#f1f5f9'; ctx.fill(); }, { blur: 6, y: 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.strokeStyle = onAmp ? '#475569' : '#94a3b8'; ctx.lineWidth = 2; if (!onAmp) ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      T(r.x + r.w / 2, r.y + 18, BNAME[i], 12.5, '#1e293b', 'center', 800);
      if (i === 0) { const a = clamp(s.voice / 30, 0.15, 1); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2.6; ctx.beginPath(); for (let k = 0; k <= 30; k++) { const x = r.x + 14 + k * 1.9, y = r.y + 50 + Math.sin(k / 30 * TAU * 2 + s.ph * 0.6) * 12 * a; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      if (i === 1 || i === 2) {
        ctx.fillStyle = onAmp ? '#16a34a' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(r.x + 24, r.y + 32); ctx.lineTo(r.x + 24, r.y + 68); ctx.lineTo(r.x + 58, r.y + 50); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.8; ctx.stroke();
        T(r.x + 36, r.y + 54, onAmp ? '×100' : '건너뜀', onAmp ? 11 : 10, '#fff', 'center', 800);
        dot(r.x + r.w - 12, r.y + 12, 5, onAmp ? '#22c55e' : '#94a3b8');
      }
      if (i === 3) {
        const cx = r.x + 26, cy = r.y + 52, off = c.reach ? Math.sin(s.ph * 1.7) * 4 * s.cone : 0;
        ctx.fillStyle = '#475569'; ctx.fillRect(cx - 12, cy - 12, 12, 24); ctx.fillStyle = '#94a3b8';
        ctx.beginPath(); ctx.moveTo(cx + off, cy - 8); ctx.lineTo(cx + 20 + off, cy - 20); ctx.lineTo(cx + 20 + off, cy + 20); ctx.lineTo(cx + off, cy + 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.8; ctx.stroke();
        ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
        s.rings.forEach((q) => { ctx.strokeStyle = 'rgba(234,88,12,' + clamp(q.a, 0, 1) + ')'; ctx.lineWidth = q.w; ctx.beginPath(); ctx.arc(cx + 22, cy, q.r, -0.9, 0.9); ctx.stroke(); });
        ctx.restore();
      }
      // 포트
      if (i < 3) { const q = pOut(i), hot = s.sel === i || (s.drag && s.drag.from === i); dot(q[0], q[1], hot ? 9 : 7, hot ? '#2563eb' : '#f97316'); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q[0], q[1], hot ? 9 : 7, 0, TAU); ctx.stroke(); if (hot) { ctx.strokeStyle = 'rgba(37,99,235,.55)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(q[0], q[1], 14 + 3 * Math.sin(S.t * 6), 0, TAU); ctx.stroke(); } }
      if (i > 0) { const q = pIn(i); const used = s.conn.indexOf(i) >= 0; dot(q[0], q[1], 7, used ? '#16a34a' : '#fff'); ctx.strokeStyle = used ? '#14532d' : '#64748b'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(q[0], q[1], 7, 0, TAU); ctx.stroke(); }
      // 이 지점의 신호 크기
      const inPath = c.vals[i] != null && (c.seq.indexOf(i) >= 0);
      const txt = inPath ? (i === 3 ? '입력 ± ' : '출력 ± ') + fmAmp(c.vals[i]) : (i === 3 ? '신호 없음' : '');
      if (txt) lbl(r.x + r.w / 2, r.y + r.h + 16, txt, { size: 11.5, bg: i === 3 ? (c.clipped ? '#dc2626' : '#ea580c') : '#2563eb', pad: 6, minX: 0, maxX: SC.w });
    }
    if (!S.s.touched) lbl(CXs, 20, '주황 점(출력)에서 초록 점(입력)으로 끌어서 연결해요', { size: 12, bg: 'rgba(30,64,175,.9)', color: '#fff', pad: 8, minX: 0, maxX: SC.w });
    // 스피커 전류 파형
    D.shadow(() => { D.roundRect(10, 160, 452, 100, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    const gx0 = 56, gx1 = 440, gy0 = 190, gy1 = 250, my = (gy0 + gy1) / 2, YS = (v) => my - clamp(v, -200, 200) / 200 * ((gy1 - gy0) / 2);
    T(20, 178, '스피커로 가는 전류 (± mA) — 점선: 원래 신호, 실선: 실제', 11.5, COL_BLUE, 'left', 800);
    ctx.strokeStyle = '#e8edf5'; ctx.lineWidth = 1; [-150, 0, 150].forEach((v) => { ctx.beginPath(); ctx.moveTo(gx0, YS(v)); ctx.lineTo(gx1, YS(v)); ctx.stroke(); T(gx0 - 5, YS(v) + 4, v, 10.5, '#516079', 'right', 700); });
    ctx.setLineDash([4, 3]); ctx.strokeStyle = 'rgba(220,38,38,.5)'; ctx.beginPath(); ctx.moveTo(gx0, YS(ILIM)); ctx.lineTo(gx1, YS(ILIM)); ctx.moveTo(gx0, YS(-ILIM)); ctx.lineTo(gx1, YS(-ILIM)); ctx.stroke(); ctx.setLineDash([]);
    if (c.reach) {
      const wave = (amp, off) => { ctx.beginPath(); for (let k = 0; k <= 120; k++) { const ph = k / 120 * TAU * 3 - off, v = amp * Math.sin(ph), x = gx0 + k / 120 * (gx1 - gx0); k ? ctx.lineTo(x, YS(v)) : ctx.moveTo(x, YS(v)); } ctx.stroke(); };
      if (c.clipped) { ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(100,116,139,.6)'; ctx.lineWidth = 1.6; wave(c.raw, s.ph * 0.3); ctx.setLineDash([]); }
      ctx.strokeStyle = c.clipped ? '#dc2626' : '#ea580c'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; const E = Math.min(c.raw, ILIM); ctx.beginPath(); for (let k = 0; k <= 120; k++) { const ph = k / 120 * TAU * 3 - s.ph * 0.3, v = clamp(c.raw * Math.sin(ph), -ILIM, ILIM), x = gx0 + k / 120 * (gx1 - gx0); k ? ctx.lineTo(x, YS(v)) : ctx.moveTo(x, YS(v)); } ctx.stroke();
      if (c.clipped) lbl(gx1 - 80, gy0 + 6, '꼭대기가 잘렸어요 (클리핑)', { size: 11.5, bg: '#dc2626', pad: 6, minX: 0, maxX: SC.w });
    } else T((gx0 + gx1) / 2, my + 5, '아직 신호가 스피커에 도착하지 않았어요', 12.5, '#94a3b8', 'center', 800);
    // 소리 크기 · 에너지 흐름
    D.shadow(() => { D.roundRect(10, 270, 220, 124, 12); ctx.fillStyle = '#fff'; ctx.fill(); D.roundRect(238, 270, 224, 124, 12); ctx.fill(); }, { blur: 6, y: 2 });
    T(20, 290, '소리 크기 (직접 연결 = 0 dB)', 12, COL_BLUE, 'left', 800);
    const lbx = 22, lbw = 196, lv = c.reach ? c.level : 0;
    trackBar(lbx, 300, lbw, 16, clamp(lv / 90, 0, 1), c.clipped ? '#dc2626' : '#ea580c');
    [0, 40, 80].forEach((v) => { const X = lbx + v / 90 * lbw; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X, 316); ctx.lineTo(X, 321); ctx.stroke(); T(clamp(X, lbx + 8, lbx + lbw - 12), 334, v + ' dB', 10.5, '#516079', 'center', 700); });
    T(20, 358, c.reach ? '지금 ' + Math.round(lv) + ' dB' + (c.clipped ? ' (잘려서 찢어진 소리)' : lv < 30 ? ' (거의 안 들려요)' : lv < 60 ? ' (작은 소리)' : ' (큰 소리)') : '소리가 나지 않아요', 12.5, c.clipped ? '#b91c1c' : '#26324a', 'left', 800);
    T(20, 380, '마이크 입력 ± ' + s.voice + ' μA · 증폭 ' + c.stages + '단', 11.5, '#516079', 'left', 700);
    T(350, 290, '에너지 흐름', 12, COL_BLUE, 'center', 800);
    const pw = c.stages > 0 ? 1 : 0, snd = c.reach ? clamp(lv / 90, 0, 1) : 0;
    flowBox(246, 302, 62, 44, '🔋 전원', '', '#dbeafe', '#1e3a8a'); flowBox(324, 302, 62, 44, '증폭기', '', '#dcfce7', '#14532d', pw > 0);
    flowBox(398, 296, 58, 28, '🔊 소리', '', '#ffedd5', '#7c2d12'); flowBox(398, 330, 58, 28, '♨️ 열', '', '#fee2e2', '#7f1d1d');
    D.arrow(308, 324, 322, 324, { color: pw ? '#2563eb' : '#cbd5e1', width: 3 + 7 * pw, head: 8 });
    D.arrow(386, 316, 396, 310, { color: snd > 0 ? '#ea580c' : '#cbd5e1', width: 2 + 6 * snd, head: 7 }); D.arrow(386, 332, 396, 342, { color: pw ? '#ef4444' : '#cbd5e1', width: 2 + 6 * pw, head: 7 });
    T(350, 380, pw ? '전원이 에너지를 대 줘요: 소리 + 열' : '전원이 꺼져 있어요(건너뜀)', 11.5, '#516079', 'center', 700);
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12;
    T(bx, STP.y + 20, '마이크 ± ' + s.voice + ' μA → ' + (c.reach ? c.stages + '단 증폭 → 스피커 ± ' + fmAmp(c.amp) : '(스피커까지 연결되지 않았어요)'), PHONE ? 12 : 13.5, COL_BLUE, 'left', 800);
    T(bx, STP.y + 44, '증폭기 1단: 전류 × 100 (β = 100). 2단이면 × 100 × 100 = × 10000', PHONE ? 11.5 : 12.5, '#26324a', 'left', 800);
    T(bx, STP.y + 68, c.clipped ? '출력이 전원이 허용하는 한계(± ' + ILIM + ' mA)를 넘어 파형이 잘려요' : c.clear ? '선명하고 큰 소리예요!' : c.reach ? '소리가 작아요. 증폭 단 수를 확인해 봐요' : '탭: 주황 점(출력) → 초록 점(입력) 순서로 눌러도 연결돼요', PHONE ? 11 : 12.5, c.clipped ? '#b91c1c' : '#0b7a41', 'left', 800);
    infoPanel([
      { h: '스피커 소리 증폭 (탐구)' },
      { p: '마이크가 만든 ± 10 μA 의 작은 전류를 트랜지스터 증폭기로 키워 스피커(8 Ω)를 울려요.', c: COL_BLUE },
      { tbl: [['직접 연결', '± 10 μA', '0 dB'], ['1단 (× 100)', '± 1 mA', '40 dB'], ['2단 (× 10⁴)', '± 100 mA', '80 dB']], c1: 0.42 },
      { p: '전원이 허용하는 최대 전류(± 150 mA)를 넘는 입력은 꼭대기가 잘려 소리가 찢어져요(클리핑 왜곡).', c: '#9a3412' },
      { p: '트랜지스터는 전원의 에너지를 신호 모양대로 조절해요. 에너지를 만들지는 않아서 전원의 에너지는 소리와 열로 나가요.' },
      { p: '🏭 스마트폰·블루투스 스피커·보청기·전기 기타 앰프의 증폭기에 쓰여요.', c: '#0b7a41', big: 1 },
    ]);
  }
  const hitOut = (q) => { for (let i = 0; i < 3; i++) { const p = pOut(i); if (Math.hypot(q.x - p[0], q.y - p[1]) < 18) return i; } return -1; };
  const hitIn = (q) => { for (let j = 1; j < 4; j++) { const p = pIn(j); if (Math.hypot(q.x - p[0], q.y - p[1]) < 20) return j; } return -1; };
  function hitAmp(q) { for (let i = 1; i < 3; i++) { const r = blk(i); if (q.x >= r.x + 8 && q.x <= r.x + r.w - 8 && q.y >= r.y && q.y <= r.y + r.h) return i; } return -1; }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'snd') return false;
      const q = lp(p), s = S.s; s.touched = true;
      const j = hitIn(q);
      if (s.sel != null && j >= 0) { connect(s.sel, j); s.sel = null; return false; }
      const o = hitOut(q);
      if (o >= 0) { s.drag = { from: o, x: q.x, y: q.y, x0: q.x, y0: q.y }; return true; }
      if (j >= 0) { const i = s.conn.indexOf(j); if (i >= 0) { s.conn[i] = -1; Sound.click(); s.drag = { from: i, x: q.x, y: q.y, x0: q.x, y0: q.y }; updateCtl(); return true; } }
      const a = hitAmp(q); if (a >= 0) { s.on[a - 1] = !s.on[a - 1]; Sound.click(); updateCtl(); }
      s.sel = null; return false;
    },
    move(p) { const s = S.s; if (!s.drag) return; const q = lp(p); s.drag.x = q.x; s.drag.y = q.y; },
    up(p) {
      const s = S.s; if (!s.drag) return; const q = lp(p), d = s.drag; s.drag = null;
      const j = hitIn(q);
      if (j >= 0 && connect(d.from, j)) { s.sel = null; return; }
      if (Math.hypot(q.x - d.x0, q.y - d.y0) < 8) { s.sel = d.from === s.sel ? null : d.from; Sound.click(); }
      else { s.sel = null; Sound.fail(); }
    },
    hover(p) { if (S.mode !== 'snd') return 'default'; const q = lp(p); return hitOut(q) >= 0 || hitIn(q) >= 0 || hitAmp(q) >= 0 ? 'pointer' : 'default'; },
  });
  bindSl('sVoice', () => S.s.voice / 5, (v) => { S.s.voice = v * 5; }, () => updateCtl());
  $('#bAm1').addEventListener('click', () => { Sound.click(); S.s.on[0] = !S.s.on[0]; updateCtl(); });
  $('#bAm2').addEventListener('click', () => { Sound.click(); S.s.on[1] = !S.s.on[1]; updateCtl(); });
  $('#bClr').addEventListener('click', () => { Sound.click(); S.s.conn = [-1, -1, -1, -1]; S.s.sel = null; updateCtl(); });

  /* ================= ④ 논리회로 ================= */
  const nandF = (a, b) => (a && b ? 0 : 1);
  const isHi = (v) => v > 2.5;
  function invY(kind, A, B) {                                    // 트랜지스터 수준: 입력 HIGH → 트랜지스터 포화
    const q1 = !!A, q2 = !!B;
    if (kind === 'not') return q1 ? VCES : 5;
    if (kind === 'nand') return q1 && q2 ? 2 * VCES : 5;
    return q1 || q2 ? VCES : 5;
  }
  const NETS = {
    not: { in: [['A', 14, 100]], gates: [{ id: 'n', a: 'A', b: 'A', x: 170, y: 100 }], out: [['n', 'Y = A 아님 (NOT)']] },
    and: { in: [['A', 14, 70], ['B', 14, 130]], gates: [{ id: 'g1', a: 'A', b: 'B', x: 120, y: 100 }, { id: 'g2', a: 'g1', b: 'g1', x: 270, y: 100 }], out: [['g2', 'Y = A AND B']] },
    half: { in: [['A', 14, 58], ['B', 14, 160]], gates: [{ id: 'n1', a: 'A', b: 'B', x: 100, y: 108 }, { id: 'n2', a: 'A', b: 'n1', x: 206, y: 52 }, { id: 'n3', a: 'B', b: 'n1', x: 206, y: 162 }, { id: 'S', a: 'n2', b: 'n3', x: 316, y: 108 }, { id: 'C', a: 'n1', b: 'n1', x: 316, y: 196 }], out: [['S', 'S (합)'], ['C', 'C (올림)']] },
  };
  function netEval(net, A, B) {
    const v = { A, B };
    net.gates.forEach((g) => { v[g.id] = nandF(v[g.a], v[g.b]); });
    return v;
  }
  const GW = 44;                                                 // NAND 몸통 너비 (+ 방울)
  function nandSym(x, y, val) {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x + 26, y - 18); ctx.arc(x + 26, y, 18, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x, y + 18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + GW + 4.5, y, 4.5, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    T(x + 21, y + 5, 'NAND', 10.5, '#64748b', 'center', 800);
  }
  const pinIn = (g, k) => [g.x, g.y + (k ? 9 : -9)], pinOut = (g) => [g.x + GW + 9, g.y];
  function netPos(net, id, g2, k) { const inp = net.in.find((q) => q[0] === id); if (inp) return [inp[1] + 50, inp[2]]; return pinOut(net.gates.find((q) => q.id === id)); }
  function drawNet(name, A, B, ph) {
    const net = NETS[name], v = netEval(net, A, B), col = (x) => (x ? '#ef4444' : '#3b82f6');
    const wires = [], used = {};
    net.gates.forEach((g) => { [['a', 0], ['b', 1]].forEach((q) => { const src = g[q[0]], s = netPos(net, src), d = pinIn(g, q[1]); wires.push({ src, s, d }); used[src] = (used[src] || 0) + 1; }); });
    wires.forEach((w) => {
      const tx = w.s[0] + 16, pts = [w.s, [tx, w.s[1]], [tx, w.d[1]], w.d];
      ctx.strokeStyle = 'rgba(15,23,42,.12)'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.strokeStyle = col(v[w.src]); ctx.lineWidth = 3; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      if (v[w.src] && !RM) pathDots(pts, ph, 26, 2.2, '#fff', 0.9);
      if (used[w.src] > 1) dot(tx, w.s[1], 3.6, col(v[w.src]));
    });
    net.in.forEach((q) => {
      const k = q[0], val = v[k], x = q[1], y = q[2];
      D.shadow(() => { D.roundRect(x - 6, y - 17, 56, 34, 10); ctx.fillStyle = val ? '#fee2e2' : '#dbeafe'; ctx.fill(); }, { blur: 4, y: 2 });
      D.roundRect(x - 6, y - 17, 56, 34, 10); ctx.strokeStyle = col(val); ctx.lineWidth = 2.2; ctx.stroke();
      T(x + 8, y + 6, k, 16, '#1e293b', 'center', 800); T(x + 32, y + 5, val ? '1' : '0', 15, col(val), 'center', 800);
    });
    net.gates.forEach((g) => {
      nandSym(g.x, g.y, v[g.id]);
      const o = pinOut(g); ctx.strokeStyle = col(v[g.id]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x + GW + 9, g.y); ctx.lineTo(g.x + GW + 14, g.y); ctx.stroke();
      D.roundRect(g.x + GW - 4, g.y - 40, 22, 17, 8); ctx.fillStyle = col(v[g.id]); ctx.fill(); T(g.x + GW + 7, g.y - 27, String(v[g.id]), 12, '#fff', 'center', 800);
    });
    net.out.forEach((q, i) => {
      const g = net.gates.find((x) => x.id === q[0]), val = v[q[0]], x = g.x + GW + 18, y = g.y;
      ctx.strokeStyle = col(val); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x + GW + 14, y); ctx.lineTo(x + 8, y); ctx.stroke();
      lbl(x + 12 + 4, y + 30, q[1] + ' = ' + val, { size: 12.5, bg: col(val), pad: 7, minX: 0, maxX: SC.w });
    });
    return v;
  }
  // 트랜지스터 게이트 (NOT · NAND · NOR)
  function npnM(cx, cy, st) {                                      // 좌우 반전 NPN (베이스가 오른쪽)
    ctx.save(); ctx.translate(cx * 2, 0); ctx.scale(-1, 1); npn(cx, cy, st, true); ctx.restore();
    T(cx + 17, cy + 11, 'B', 11, '#64748b', 'left', 800); T(cx - 22, cy - 30, 'C', 11, '#64748b', 'right', 800); T(cx - 22, cy + 40, 'E', 11, '#64748b', 'right', 800);
  }
  function inBox(k, y, val, x) {
    const w = 56;
    D.shadow(() => { D.roundRect(x, y - 20, w, 40, 12); ctx.fillStyle = val ? '#fee2e2' : '#dbeafe'; ctx.fill(); }, { blur: 5, y: 2 });
    D.roundRect(x, y - 20, w, 40, 12); ctx.strokeStyle = val ? '#dc2626' : '#2563eb'; ctx.lineWidth = 2.2; ctx.stroke();
    T(x + 14, y + 6, k, 17, '#1e293b', 'center', 800); T(x + 40, y - 3, val ? '5 V' : '0 V', 11.5, val ? '#b91c1c' : '#1d4ed8', 'center', 800); T(x + 40, y + 13, val ? 'HIGH' : 'LOW', 11, val ? '#b91c1c' : '#1d4ed8', 'center', 800);
  }
  const GIN = { A: 100, B: 186 };
  function gateGeo(kind) {
    if (kind === 'not') return { bx: { A: 100 }, q: [[238, 120]], inY: { A: 120 } };
    if (kind === 'nand') return { q: [[258, 98], [258, 186]], inY: { A: 98, B: 186 } };
    return { q: [[160, 124], [272, 124]], inY: { A: 124, B: 124 } };
  }
  function drawGateT() {
    const g = S.g, kind = g.kind, A = g.A, B = g.B, Y = invY(kind, A, B), hi = isHi(Y), on1 = !!A, on2 = kind !== 'not' && !!B, ph = g.ph;
    const geo = gateGeo(kind), wp = new Path2D(), dots = [];
    let Ynode, cdPaths = [];
    if (kind === 'not') {
      const [cx, cy] = geo.q[0], P = NPN(cx, cy);
      wp.moveTo(cx + 12, 14); wp.lineTo(cx + 12, 20); wp.moveTo(cx + 12, 54); wp.lineTo(P.C[0], P.C[1]); wp.moveTo(P.E[0], P.E[1]); wp.lineTo(P.E[0], 190);
      wp.moveTo(62, cy); wp.lineTo(96, cy); wp.moveTo(150, cy); wp.lineTo(P.B[0], P.B[1]); wp.moveTo(cx + 12, 64); wp.lineTo(344, 64);
      wireStroke(wp, 2.8, on1 ? 0.25 : 0);
      zig(cx + 12, 20, cx + 12, 54, 5, 8, '#475569', 3.2); T(cx - 6, 40, 'R_C 1 kΩ', 12, '#334155', 'right', 800);
      zig(96, cy, 150, cy, 5, 7, '#475569', 3); T(123, cy - 14, 'R_B 10 kΩ', 11.5, '#334155', 'center', 800);
      npn(cx, cy, on1 ? 'sat' : 'off'); dot(cx + 12, 64, 3.6, '#334155'); gndSym(P.E[0], 196); T(cx - 6, 14, '+5 V', 12, '#dc2626', 'right', 800);
      inBox('A', cy, A, 6);
      if (on1) { dots.push([[cx + 12, 14], [cx + 12, 64], [P.C[0], P.C[1]], [P.E[0], P.E[1]], [P.E[0], 190]]); dots.push([[62, cy], [P.B[0], P.B[1]]]); }
      Ynode = [cx + 12, 64];
    } else if (kind === 'nand') {
      const [cx, cy] = geo.q[0], [cx2, cy2] = geo.q[1], P = NPN(cx, cy), P2 = NPN(cx2, cy2);
      wp.moveTo(cx + 12, 8); wp.lineTo(cx + 12, 14); wp.moveTo(cx + 12, 44); wp.lineTo(P.C[0], P.C[1]); wp.moveTo(P.E[0], P.E[1]); wp.lineTo(P2.C[0], P2.C[1]); wp.moveTo(P2.E[0], P2.E[1]); wp.lineTo(P2.E[0], 236);
      wp.moveTo(62, cy); wp.lineTo(96, cy); wp.moveTo(150, cy); wp.lineTo(P.B[0], P.B[1]); wp.moveTo(62, cy2); wp.lineTo(96, cy2); wp.moveTo(150, cy2); wp.lineTo(P2.B[0], P2.B[1]); wp.moveTo(cx + 12, 54); wp.lineTo(344, 54);
      wireStroke(wp, 2.8, on1 && on2 ? 0.25 : 0);
      zig(cx + 12, 14, cx + 12, 44, 4, 7, '#475569', 3.2); T(cx - 6, 32, 'R_C 1 kΩ', 12, '#334155', 'right', 800);
      zig(96, cy, 150, cy, 5, 7, '#475569', 3); zig(96, cy2, 150, cy2, 5, 7, '#475569', 3); T(123, cy - 14, 'R_B', 11.5, '#334155', 'center', 800); T(123, cy2 - 14, 'R_B', 11.5, '#334155', 'center', 800);
      npn(cx, cy, on1 ? 'sat' : 'off'); npn(cx2, cy2, on2 ? 'sat' : 'off'); dot(cx + 12, 54, 3.6, '#334155'); gndSym(P2.E[0], 242); T(cx + 30, 12, '+5 V', 12, '#dc2626', 'left', 800);
      inBox('A', cy, A, 6); inBox('B', cy2, B, 6);
      if (on1 && on2) { dots.push([[cx + 12, 8], [cx + 12, 54], [P.C[0], P.C[1]], [P.E[0], P.E[1]], [P2.C[0], P2.C[1]], [P2.E[0], P2.E[1]], [P2.E[0], 236]]); }
      if (on1) dots.push([[62, cy], [P.B[0], P.B[1]]]); if (on2) dots.push([[62, cy2], [P2.B[0], P2.B[1]]]);
      Ynode = [cx + 12, 54];
    } else {
      const [c1, y1] = geo.q[0], [c2] = geo.q[1], P = NPN(c1, y1), Pm = { B: [c2 + 46, y1], C: [c2 - 12, y1 - 44], E: [c2 - 12, y1 + 44] };
      wp.moveTo(216, 8); wp.lineTo(216, 14); wp.moveTo(216, 44); wp.lineTo(216, 56); wp.moveTo(P.C[0], P.C[1]); wp.lineTo(P.C[0], 56); wp.lineTo(Pm.C[0], 56); wp.lineTo(Pm.C[0], Pm.C[1]);
      wp.moveTo(P.E[0], P.E[1]); wp.lineTo(P.E[0], 196); wp.lineTo(Pm.E[0], 196); wp.lineTo(Pm.E[0], Pm.E[1]);
      wp.moveTo(62, y1); wp.lineTo(64, y1); wp.moveTo(104, y1); wp.lineTo(P.B[0], P.B[1]); wp.moveTo(Pm.B[0], Pm.B[1]); wp.lineTo(362, y1); wp.moveTo(402, y1); wp.lineTo(406, y1); wp.moveTo(216, 56); wp.lineTo(344, 56);
      wireStroke(wp, 2.8, on1 || on2 ? 0.25 : 0);
      zig(216, 14, 216, 44, 4, 7, '#475569', 3.2); T(204, 32, 'R_C 1 kΩ', 12, '#334155', 'right', 800);
      zig(64, y1, 104, y1, 4, 6, '#475569', 3); zig(362, y1, 402, y1, 4, 6, '#475569', 3);
      npn(c1, y1, on1 ? 'sat' : 'off'); npnM(c2, y1, on2 ? 'sat' : 'off'); dot(216, 56, 3.6, '#334155'); dot(P.E[0], 196, 3.6, '#334155'); gndSym(216, 204); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(216, 196); ctx.lineTo(216, 198); ctx.stroke(); T(236, 12, '+5 V', 12, '#dc2626', 'left', 800);
      inBox('A', y1, A, 6); inBox('B', y1, B, 408);
      if (on1) { dots.push([[216, 8], [216, 56], [P.C[0], 56], [P.C[0], P.C[1]], [P.E[0], P.E[1]], [P.E[0], 196], [216, 196]]); dots.push([[62, y1], [P.B[0], P.B[1]]]); }
      if (on2) { dots.push([[216, 8], [216, 56], [Pm.C[0], 56], [Pm.C[0], Pm.C[1]], [Pm.E[0], Pm.E[1]], [Pm.E[0], 196], [216, 196]]); dots.push([[406, y1], [Pm.B[0], Pm.B[1]]]); }
      Ynode = [216, 56];
    }
    dots.forEach((d) => pathDots(d, ph, 22, 2.7, '#f59e0b'));
    // 출력
    const ox = kind === 'nor' ? 366 : 366, oy = Ynode[1];
    meterV(ox, oy, '#0d9488'); gndSym(ox, oy + 36); ctx.strokeStyle = '#0d9488'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(ox, oy + 14); ctx.lineTo(ox, oy + 28); ctx.stroke();
    const bx = 396, by = oy - 30; D.shadow(() => { D.roundRect(bx, by, 70, 62, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
    drawBulb(bx + 35, by + 28, 10, hi ? 1 : 0); T(bx + 35, by + 55, 'Y ' + (hi ? 'HIGH' : 'LOW'), 11.5, hi ? '#15803d' : '#475569', 'center', 800);
    lbl(ox, oy - 26, 'Y = ' + Y.toFixed(1) + ' V', { size: 12, bg: hi ? '#16a34a' : '#64748b', pad: 6, minX: 0, maxX: SC.w });
    return { Y };
  }
  function inRects() {                                           // 입력 상자 위치 (장면 좌표)
    const g = S.g;
    if (g.sub === 'inv') {
      if (g.kind === 'not') return { A: { x: 6, y: 100, w: 56, h: 40 } };
      if (g.kind === 'nand') return { A: { x: 6, y: 78, w: 56, h: 40 }, B: { x: 6, y: 166, w: 56, h: 40 } };
      return { A: { x: 6, y: 104, w: 56, h: 40 }, B: { x: 408, y: 104, w: 56, h: 40 } };
    }
    const net = NETS[g.sub === 'half' ? 'half' : g.nbk]; const o = {};
    net.in.forEach((q) => { o[q[0]] = { x: q[1] - 6, y: q[2] - 17, w: 56, h: 34 }; }); return o;
  }
  function recordG() {
    const g = S.g, idx = (g.A ? 2 : 0) + (g.B ? 1 : 0);
    if (g.sub === 'inv') { const t = (g.tb[g.kind] = g.tb[g.kind] || {}); t[g.kind === 'not' ? g.A : idx] = invY(g.kind, g.A, g.B); }
    else if (g.sub === 'nand') { const v = netEval(NETS[g.nbk], g.A, g.B), t = (g.tb['nb_' + g.nbk] = g.tb['nb_' + g.nbk] || {}); t[g.nbk === 'not' ? g.A : idx] = v[g.nbk === 'not' ? 'n' : 'g2']; }
    else { const v = netEval(NETS.half, g.A, g.B); (g.tb.half = g.tb.half || {})[idx] = [v.S, v.C]; g.seen[idx] = true; }
  }
  const gSeenN = (k) => Object.keys(S.g.tb[k] || {}).length;
  function tableCard(y0) {
    const g = S.g; D.shadow(() => { D.roundRect(10, y0, 452, 394 - y0, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    let cols, rows, tb, title, cur;
    if (g.sub === 'inv') { const k = g.kind; tb = g.tb[k] || {}; title = (k === 'not' ? 'NOT' : k === 'nand' ? 'NAND' : 'NOR') + ' 게이트: 입력을 바꿔 가며 Y 를 기록해요 (관찰한 줄만 채워져요)'; cols = k === 'not' ? ['A', 'Y'] : ['A', 'B', 'Y']; rows = k === 'not' ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]]; cur = k === 'not' ? g.A : (g.A ? 2 : 0) + g.B; }
    else if (g.sub === 'nand') { const k = g.nbk; tb = g.tb['nb_' + k] || {}; title = (k === 'not' ? 'NAND 한 개를 묶으면' : 'NAND 두 개를 이으면') + ': 입력 → 출력 기록'; cols = k === 'not' ? ['A', 'Y'] : ['A', 'B', 'Y']; rows = k === 'not' ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]]; cur = k === 'not' ? g.A : (g.A ? 2 : 0) + g.B; }
    else { tb = g.tb.half || {}; title = '반가산기: A + B = (C S)₂ — 4가지 입력을 모두 확인해 봐요'; cols = ['A', 'B', 'S (합)', 'C (올림)']; rows = [[0, 0], [0, 1], [1, 0], [1, 1]]; cur = (g.A ? 2 : 0) + g.B; }
    T(20, y0 + 20, title, 11.5, COL_BLUE, 'left', 800);
    const n = cols.length, cx0 = 48, cw = (452 - 76) / n;
    cols.forEach((c, i) => T(cx0 + cw * (i + 0.5), y0 + 40, c, 12, '#516079', 'center', 800));
    const rh = Math.min(26, (394 - y0 - 52) / rows.length);
    rows.forEach((r, i) => {
      const y = y0 + 48 + i * rh, on = i === cur, v = tb[i];
      D.roundRect(24, y, 424, rh - 3, 8); ctx.fillStyle = on ? '#fff2e5' : '#f3f6fb'; ctx.fill(); ctx.strokeStyle = on ? '#f26b3a' : '#dbe3f0'; ctx.lineWidth = on ? 2 : 1.2; ctx.stroke();
      r.forEach((b, j) => T(cx0 + cw * (j + 0.5), y + rh - 9, String(b), 14, b ? '#b91c1c' : '#1d4ed8', 'center', 800));
      const base = r.length;
      if (g.sub === 'half') {
        [0, 1].forEach((j) => T(cx0 + cw * (base + j + 0.5), y + rh - 9, v == null ? '?' : String(v[j]), 14, v == null ? '#94a3b8' : '#15803d', 'center', 800));
      } else T(cx0 + cw * (base + 0.5), y + rh - 9, v == null ? '?' : g.sub === 'inv' ? (isHi(v) ? '1' : '0') + ' (' + v.toFixed(1) + ' V)' : String(v), 13, v == null ? '#94a3b8' : (g.sub === 'inv' ? isHi(v) : v) ? '#15803d' : '#475569', 'center', 800);
    });
  }
  function drawLogic() {
    const g = S.g; sceneBegin();
    if (g.sub === 'inv') { drawGateT(); tableCard(256); }
    else if (g.sub === 'nand') {
      const v = drawNet(g.nbk, g.A, g.B, g.ph2);
      const txt = g.nbk === 'not' ? ['NAND 의 두 입력을 하나(A)로 묶으면', 'A 가 1 이면 1·1 → 0, A 가 0 이면 0·0 → 1', '그래서 입력과 반대가 되는 NOT 이 돼요.'] : ['첫 NAND: A, B 가 모두 1 일 때만 0', '둘째 NAND(입력을 묶음)가 그 값을 뒤집어요', '그래서 A, B 가 모두 1 일 때만 1 인 AND 예요.'];
      txt.forEach((t, i) => T(14, 172 + i * 20, t, 12, '#516079', 'left', 800));
      tableCard(256);
    } else { drawNet('half', g.A, g.B, g.ph2); tableCard(250); }
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, F = (x) => (x ? 1 : 0);
    let l1_, l2_, l3_;
    if (g.sub === 'inv') {
      const Y = invY(g.kind, g.A, g.B);
      l1_ = (g.kind === 'not' ? 'NOT: 입력 HIGH → 트랜지스터 켜짐 → 출력 LOW' : g.kind === 'nand' ? 'NAND: 트랜지스터 2개 직렬 — 둘 다 켜져야 출력이 LOW' : 'NOR: 트랜지스터 2개 병렬 — 하나만 켜져도 출력이 LOW');
      l2_ = '입력 A = ' + (g.A ? 'HIGH' : 'LOW') + (g.kind === 'not' ? '' : ' · B = ' + (g.B ? 'HIGH' : 'LOW')) + ' → 출력 Y = ' + Y.toFixed(1) + ' V (' + (isHi(Y) ? 'HIGH' : 'LOW') + ')';
      l3_ = '켜진 트랜지스터는 포화라 V_CE ≈ 0.2 V, 꺼지면 출력은 5.0 V 로 당겨져요.';
    } else if (g.sub === 'nand') {
      const v = netEval(NETS[g.nbk], g.A, g.B);
      l1_ = g.nbk === 'not' ? 'NAND 한 개로 NOT 을 만들 수 있어요.' : 'NAND 두 개로 AND 를 만들 수 있어요.'; l2_ = '입력 A = ' + g.A + (g.nbk === 'not' ? '' : ' · B = ' + g.B) + ' → 출력 Y = ' + v[g.nbk === 'not' ? 'n' : 'g2'];
      l3_ = '그래서 NAND 만으로 모든 논리회로를 만들 수 있어요(NOT → AND → OR …).';
    } else {
      const v = netEval(NETS.half, g.A, g.B);
      l1_ = '반가산기: 합 S = A XOR B, 올림 C = A AND B (NAND 5개)'; l2_ = g.A + ' + ' + g.B + ' = ' + v.C + v.S + '₂  (C = ' + v.C + ', S = ' + v.S + ')'; l3_ = '1 + 1 = 10₂ : 합 0, 올림 1';
    }
    T(bx, STP.y + 22, l1_, PHONE ? 11 : 12.5, COL_BLUE, 'left', 800); T(bx, STP.y + 46, l2_, PHONE ? 11.5 : 12.5, '#26324a', 'left', 800); T(bx, STP.y + 68, l3_, PHONE ? 11 : 12, '#0b7a41', 'left', 800);
    infoPanel([
      { h: g.sub === 'inv' ? '트랜지스터로 만드는 게이트' : g.sub === 'nand' ? 'NAND 만능 게이트' : '반가산기' },
      { p: g.sub === 'inv' ? '트랜지스터는 입력 HIGH 에서 켜져(포화) 출력을 LOW 로 끌어내려요. 직렬이면 NAND, 병렬이면 NOR 예요.' : g.sub === 'nand' ? 'NAND 게이트를 이어 붙여 NOT, AND 를 만들었어요. 같은 방법으로 OR 등 모든 논리회로를 만들 수 있어요.' : '0 과 1 의 덧셈을 하는 회로예요. 이런 회로를 모아 CPU 의 계산 장치를 만들어요.', c: COL_BLUE },
      { tbl: [['1971년 4004', '트랜지스터 약 2300개', ''], ['오늘날 CPU·GPU', '수십억~수백억 개', '']], c1: 0.45 },
      { p: '🏭 스마트폰·자동차·의료기기·인공지능 서버가 모두 반도체 칩 위에서 움직여요. 칩 공급망과 전력 효율이 산업·사회의 큰 과제예요.', c: '#0b7a41', big: 1 },
    ]);
  }
  function stepLogic(dt) { const g = S.g; if (dt <= 0) return; g.ph += dt * 70; g.ph2 += dt * 40; }
  function toggleG(k) { const g = S.g; if (k === 'A') g.A = g.A ? 0 : 1; else g.B = g.B ? 0 : 1; Sound.click(); recordG(); updateCtl(); }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'logic') return false;
      const q = lp(p), R = inRects(); Object.keys(R).forEach((k) => { const r = R[k]; if (q.x >= r.x - 4 && q.x <= r.x + r.w + 4 && q.y >= r.y - 4 && q.y <= r.y + r.h + 4) toggleG(k); });
      return false;
    },
    move() {}, up() {},
    hover(p) { if (S.mode !== 'logic') return 'default'; const q = lp(p), R = inRects(); for (const k of Object.keys(R)) { const r = R[k]; if (q.x >= r.x && q.x <= r.x + r.w && q.y >= r.y && q.y <= r.y + r.h) return 'pointer'; } return 'default'; },
  });
  $$('#lgSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.g.sub = b.dataset.v; recordG(); updateCtl(); }));
  $$('#gtSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.g.kind = b.dataset.v; recordG(); updateCtl(); }));
  $$('#nbSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.g.nbk = b.dataset.v; recordG(); updateCtl(); }));
  $('#bInA').addEventListener('click', () => toggleG('A'));
  $('#bInB').addEventListener('click', () => toggleG('B'));

  /* ---------- 화면 전환 · 조작 상태 ---------- */
  const subKey = () => (S.mode === 'sw' ? S.w.sub : S.mode === 'logic' ? S.g.sub : '');
  function setScene(mode) {
    if (S.mode !== mode) S.fade = 1;
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode];
    if (mode === 'logic') recordG();
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = n.getAttribute('data-gate-off').split(' ').indexOf(S.gate) < 0;
      if (on && n.hasAttribute('data-sub')) on = n.getAttribute('data-sub').split(' ').indexOf(subKey()) >= 0;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#swSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.w.sub));
    setRange('sVin', Math.round(S.w.vin * 10), 0, 50, (v) => (v / 10).toFixed(1) + ' V');
    setRange('sBr', S.w.br, 0, 10, (v) => v + '단계');
    setRange('sBias', Math.round(S.a.bias * 2), 0, 8, (v) => (v / 2).toFixed(1) + ' mA');
    $$('#aSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.a.A));
    setRange('sVoice', S.s.voice / 5, 1, 6, (v) => '± ' + v * 5 + ' μA');
    $('#bAm1').textContent = '1단 증폭기: ' + (S.s.on[0] ? '켜짐' : '건너뜀'); $('#bAm2').textContent = '2단 증폭기: ' + (S.s.on[1] ? '켜짐' : '건너뜀');
    $('#bAm1').classList.toggle('btn-primary', S.s.on[0]); $('#bAm2').classList.toggle('btn-primary', S.s.on[1]);
    $$('#lgSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.g.sub));
    $$('#gtSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.g.kind));
    $$('#nbSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.g.nbk));
    const oneIn = (S.g.sub === 'inv' && S.g.kind === 'not') || (S.g.sub === 'nand' && S.g.nbk === 'not');
    $('#bInA').textContent = 'A: ' + (S.g.A ? 'HIGH (1)' : 'LOW (0)'); $('#bInB').textContent = 'B: ' + (S.g.B ? 'HIGH (1)' : 'LOW (0)'); $('#bInB').disabled = oneIn;
    $('#bInA').classList.toggle('btn-primary', !!S.g.A); $('#bInB').classList.toggle('btn-primary', !!S.g.B && !oneIn);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  function readouts() {
    let a, b, c; const m = S.mode;
    if (m === 'sw') {
      const w = S.w, cc = swCalc(), mk = wMask();
      a = [w.sub === 'vin' ? '입력 V_in' : '베이스 전압', w.sub === 'vin' ? w.vin.toFixed(1) + ' V' : cc.Vth.toFixed(2) + ' V']; b = ['I_B → I_C', fmI(cc.IB).replace(' mA', '') + ' → ' + (mk ? '?' : cc.IC < 10 ? cc.IC.toFixed(2) : cc.IC.toFixed(1)) + ' mA']; c = ['상태', REG[cc.region]];
    } else if (m === 'amp') {
      const a_ = S.a, mm = ampSamples(), mk = aMask();
      a = ['바이어스 I_C0', a_.bias.toFixed(1) + ' mA']; b = ['출력 진폭', mk ? '± ? V' : '± ' + mm.amp.toFixed(1) + ' V']; c = ['파형', mm.clipLo ? '아래 잘림 (차단)' : mm.clipHi ? '위 잘림 (포화)' : '왜곡 없음'];
    } else if (m === 'snd') {
      const s = S.s, cc = sndCalc();
      a = ['마이크 입력', '± ' + s.voice + ' μA']; b = ['스피커 전류', cc.reach ? '± ' + fmAmp(cc.amp) : '없음']; c = ['소리', !cc.reach ? '없음' : cc.clipped ? '찢어짐' : cc.clear ? '선명·큼' : cc.level < 30 ? '거의 안 들림' : '작음'];
    } else {
      const g = S.g;
      if (g.sub === 'inv') { const Y = invY(g.kind, g.A, g.B); a = ['게이트', g.kind === 'not' ? 'NOT' : g.kind === 'nand' ? 'NAND' : 'NOR']; b = ['입력', 'A = ' + g.A + (g.kind === 'not' ? '' : ' · B = ' + g.B)]; c = ['출력 Y', Y.toFixed(1) + ' V (' + (isHi(Y) ? '1' : '0') + ')']; }
      else if (g.sub === 'nand') { const v = netEval(NETS[g.nbk], g.A, g.B); a = ['만든 게이트', g.nbk === 'not' ? 'NOT' : 'AND']; b = ['입력', 'A = ' + g.A + (g.nbk === 'not' ? '' : ' · B = ' + g.B)]; c = ['출력 Y', String(v[g.nbk === 'not' ? 'n' : 'g2'])]; }
      else { const v = netEval(NETS.half, g.A, g.B); a = ['입력', 'A = ' + g.A + ' · B = ' + g.B]; b = ['합 S · 올림 C', v.S + ' · ' + v.C]; c = ['확인한 입력', Object.keys(g.seen).length + ' / 4']; }
    }
    [[l1, v1, a], [l2, v2, b], [l3, v3, c]].forEach((z) => { if (z[0].textContent !== z[2][0]) z[0].textContent = z[2][0]; if (z[1].textContent !== z[2][1]) z[1].textContent = z[2][1]; });
  }

  /* ---------- 입력 도구 ---------- */
  const numI = makePlain($('#numWHost'), 'V_in = 1.5 V 일 때 컬렉터 전류 I_C = β I_B (β = 100)', 'I_C =', 'mA');
  const numA = makePlain($('#numAHost'), '입력 ± 10 μA 일 때 R_C(2.0 kΩ) 의 전압 변화 진폭 = β ΔI_B R_C', '± ', 'V');
  const selWR = [
    ['V_in = 5.0 V 에서 β I_B = 43 mA 인데 I_C 가 24 mA 인 까닭은?', ['램프가 허용하는 최대 전류가 (5.0 − 0.2) V / 200 Ω = 24 mA 라서 포화되기 때문이에요', 'V_in 이 5 V 가 되면 β 가 24 로 줄어들기 때문이에요', '트랜지스터가 전류의 일부를 저장하기 때문이에요'], 0],
    ['자동 가로등에서 밤이 되어 CdS 저항이 커지면 램프는?', ['켜져요 — 베이스 전압이 올라 I_B 가 흘러 트랜지스터가 켜지기 때문이에요', '꺼져요 — 베이스 전압이 낮아져 I_B 가 0 이 되기 때문이에요', '변하지 않아요'], 0],
  ];
  const selAR = [['출력이 입력과 위상이 반대인 까닭은?', ['입력 ↑ → I_C ↑ → R_C 의 전압 ↑ → 컬렉터 전압(9 V − R_C 전압) ↓ 이기 때문이에요', 'R_C 가 신호를 뒤집는 소자이기 때문이에요', '전원이 교류이기 때문이에요'], 0]];
  const selHR = [['1 + 1 의 합 비트 S 는?', ['0 (LOW)', '1 (HIGH)'], 0], ['올림 비트 C 는?', ['0 (LOW)', '1 (HIGH)'], 1]];
  const selGR = [
    ['NAND 만으로 모든 논리회로를 만들 수 있는 까닭은?', ['NAND 에서 NOT 과 AND 를 만들 수 있고, 이것들을 조합하면 OR 를 포함한 모든 논리회로가 되기 때문이에요', 'NAND 는 입력이 많아서 다른 게이트를 대신할 수 있기 때문이에요', '실제로는 NAND 만으로는 아무것도 만들 수 없어요'], 0],
    ['반도체 칩이 사회의 기반이 된 까닭은?', ['작고 전력이 적게 드는 트랜지스터 스위치를 수십억 개 한 칩에 넣어 계산·제어·통신을 할 수 있기 때문이에요', '칩이 에너지를 새로 만들어 내기 때문이에요', '칩은 소리를 내는 부품이기 때문이에요'], 0],
  ];
  const selW = { st: {}, ok: {} }, selA = { st: {}, ok: {} }, selH = { st: {}, ok: {} }, selG = { st: {}, ok: {} };
  const selWs = makeSelects($('#numWHost'), selWR, selW.st, selW.ok);
  const selAs = makeSelects($('#numAHost'), selAR, selA.st, selA.ok);
  const selHs = makeSelects($('#selHHost'), selHR, selH.st, selH.ok);
  const selGs = makeSelects($('#selGHost'), selGR, selG.st, selG.ok);
  // 진리표 입력 표 (NAND · NOR)
  const TT = { nand: [], nor: [], ok: {} }, TRUTH = { nand: [1, 1, 1, 0], nor: [1, 0, 0, 0] };
  (function buildTruth() {
    const host = $('#tblHost');
    host.innerHTML = '<div class="tt-title">A, B 입력에 따른 출력 Y 를 채워 주세요 (LOW = 0, HIGH = 1)</div>';
    const tbl = document.createElement('table'); tbl.className = 'tt';
    tbl.innerHTML = '<thead><tr><th>A</th><th>B</th><th>NAND 의 Y</th><th>NOR 의 Y</th></tr></thead>';
    const tb = document.createElement('tbody');
    [[0, 0], [0, 1], [1, 0], [1, 1]].forEach((r, i) => {
      const tr = document.createElement('tr'); tr.innerHTML = '<td>' + r[0] + '</td><td>' + r[1] + '</td>';
      ['nand', 'nor'].forEach((k) => {
        const td = document.createElement('td'), sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', k.toUpperCase() + ' A=' + r[0] + ' B=' + r[1] + ' 출력');
        sel.innerHTML = '<option value="">—</option><option value="0">0 (LOW)</option><option value="1">1 (HIGH)</option>';
        sel.addEventListener('change', () => { TT[k][i] = sel.value; sel.classList.remove('ok', 'bad'); delete TT.ok[k + i]; Sound.click(); });
        td.appendChild(sel); tr.appendChild(td); TT[k + 'Sel'] = TT[k + 'Sel'] || []; TT[k + 'Sel'][i] = sel;
      });
      tb.appendChild(tr);
    });
    tbl.appendChild(tb); host.appendChild(tbl);
  })();
  function truthReset() { ['nand', 'nor'].forEach((k) => { TT[k] = []; TT[k + 'Sel'].forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }); TT.ok = {}; }
  function truthCheck() {
    let miss = 0, bad = 0;
    ['nand', 'nor'].forEach((k) => TRUTH[k].forEach((v, i) => { if (TT[k][i] == null || TT[k][i] === '') miss++; }));
    if (miss) return '아직 고르지 않은 칸이 ' + miss + '개 있어요.';
    ['nand', 'nor'].forEach((k) => TRUTH[k].forEach((v, i) => {
      const ok = +TT[k][i] === v, s = TT[k + 'Sel'][i], key = k + i; if (!ok) bad++;
      if (TT.ok[key] !== ok) { TT.ok[key] = ok; s.classList.remove('ok', 'bad'); if (ok) s.classList.add('ok'); else { void s.offsetWidth; s.classList.add('bad'); } }
    }));
    return bad ? '빨간 칸을 다시 확인해 봐요. NAND 는 둘 다 HIGH 일 때만 LOW, NOR 는 하나라도 HIGH 이면 LOW 예요. 화면에서 입력을 바꿔 확인해 보세요.' : true;
  }
  const truthN = () => ['nand', 'nor'].reduce((n, k) => n + TRUTH[k].filter((v, i) => TT[k][i] != null && TT[k][i] !== '').length, 0);

  /* ================= 미션 ================= */
  const MS = {};
  const levels = [
    {
      title: '스위치: 작은 I_B 가 큰 I_C 를 조절해요', short: '스위치', icon: '🔌', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 마이크가 만드는 아주 작은 전기 신호로 어떻게 스피커를 크게 울릴까?</p>' +
        '<div class="si-link">🔗 <b>물리학 「p-n 접합과 다이오드」</b>와 앞 차시 <b>「다이오드 회로」</b>의 0.7 V 문턱을 이어 받아요. 트랜지스터는 이 차시가 처음으로 <b>회로 부품</b>으로 등장해요. (내부 원리가 아니라 회로로 분석해요.)</div>' +
        '<p>NPN 트랜지스터는 <b>베이스(B) 전류 I_B</b>가 <b>컬렉터(C) 전류 I_C</b>를 조절하는 소자예요. V_BE ≈ 0.7 V 를 넘어야 켜지고, 활성 영역에서 <b>I_C = β I_B</b>(β = 100)예요. 램프가 허용하는 전류를 넘으면 <b>포화</b>돼서 스위치처럼 켜져요.</p>',
      features: ['sw'],
      setup() { S.gate = ''; Object.assign(S.w, { sub: 'vin', vin: 0, br: 10, seenOff: 0, seenAct: 0 }); setScene('sw'); },
      recap: '트랜지스터는 V_BE 0.7 V 아래에서는 차단, 그 위에서는 I_C = β I_B 로 커지다가 램프가 허용하는 최댓값에서 포화돼 스위치처럼 켜져요.',
      summary: '<ul><li><b>NPN 트랜지스터</b>: 베이스 전류 I_B 가 컬렉터 전류 I_C 를 조절. V_BE ≳ 0.7 V 이어야 켜져요(차단 → 활성 → 포화).</li><li>활성 영역: <b>I_C = β I_B</b> (β = 100). 포화: β I_B 가 램프 허용 전류 (5.0 − 0.2) / 200 Ω = <b>24 mA</b> 보다 크면 I_C = 24 mA, V_CE ≈ 0.2 V.</li><li>V_CC = 5.0 V, 램프 200 Ω, R_B = 10 kΩ: V_in = 0 → I_B = 0 (램프 꺼짐), V_in = 5.0 V → I_B = (5.0 − 0.7) / 10 kΩ = 0.43 mA, β I_B = 43 mA → 포화(24 mA, 램프 켜짐).</li><li>자동 가로등: 어두워져서 CdS 저항이 커지면 베이스 전압이 올라 트랜지스터가 켜져요.</li><li>트랜지스터는 에너지를 만들지 않아요. 전원의 에너지를 신호에 맞게 조절할 뿐이에요.</li></ul>',
      missions: [
        {
          title: '램프 켜기',
          goal: '입력 전압 V_in 을 0 에서부터 천천히 올려 램프를 <b>가장 밝게</b> 켜 보세요. 중간에 I_B 와 I_C 가 어떻게 변하는지 읽어요.',
          hint: '🎚 슬라이더를 0.7 V 이상으로 올리면 I_B 가 흐르고, 약 3.1 V 이상이면 램프가 최대로 밝아져요. 먼저 중간 값(1~3 V)에서 램프가 흐릿하게 켜지는 것도 확인해 보세요.',
          setup() { S.gate = ''; Object.assign(S.w, { sub: 'vin', vin: 0, seenOff: 0, seenAct: 0 }); setScene('sw'); },
          check: () => S.w.sub === 'vin' && S.w.seenOff >= 0.5 && S.w.seenAct >= 0.5 && S.w.lamp > 0.95, hold: 0.8,
          status: () => mark(S.w.seenOff >= 0.5) + ' V_in < 0.7 V 에서 꺼짐 &nbsp; ' + mark(S.w.seenAct >= 0.5) + ' 중간 밝기 확인 &nbsp; ' + mark(S.w.lamp > 0.95) + ' 램프 최대 밝기',
          explain: 'V_in 이 0.7 V 아래이면 I_B = 0 이라 I_C = 0 이에요(차단). 0.7 V 를 넘으면 I_B = (V_in − 0.7) / 10 kΩ 이 흐르고 I_C = β I_B 로 커져서 램프가 점점 밝아져요. V_in ≈ 3.1 V 이상에서는 β I_B 가 24 mA 를 넘어 포화되고, 램프는 최대로 켜져요.',
        },
        {
          title: '읽기와 포화, 자동 가로등', manual: true,
          goal: 'V_in = 1.5 V 에서 I_B 를 읽어 I_C 를 계산해 쓰고, 두 질문에 답한 뒤 <b>✔ 확인하기</b>를 눌러요.',
          hint: '슬라이더를 1.5 V 로 맞추면 I_B = 0.080 mA 예요. I_C = β I_B = 100 × 0.080 mA. 가로등 화면은 🌙 자동 가로등 칩에서 볼 수 있어요.',
          setup() { Object.assign(S.w, { sub: 'vin', vin: 1.5 }); numI.clear(); resetSels(selWs, selW.st, selW.ok); S.gate = 'mw2'; setScene('sw'); },
          check: () => { const a = checkNum(numI, 8.0, 0.04, 'I_C = β I_B = 100 × (화면의 I_B) 를 계산해 보세요. V_in 을 1.5 V 로 맞췄는지도 확인해요.'); if (a !== true) return a; return checkSel(selWR, selW.st, selW.ok, selWs, '빨간 칸을 다시 생각해 봐요. 포화는 램프가 허용하는 최대 전류, 가로등은 베이스 전압이 핵심이에요.'); },
          status: () => '컬렉터 전류 I_C 는 가려 두었어요 (β = 100)',
          explain: 'V_in = 1.5 V 이면 I_B = (1.5 − 0.7) / 10 kΩ = 0.080 mA 이고 I_C = 100 × 0.080 = <b>8.0 mA</b> 예요(활성 영역). V_in = 5.0 V 에서는 β I_B = 43 mA 이지만 램프가 허용하는 최대는 (5.0 − 0.2) / 200 Ω = 24 mA 라서 <b>포화</b>돼 I_C = 24 mA 예요. 자동 가로등에서는 밤에 CdS 저항이 커져 베이스 전압이 오르면 I_B 가 흘러 램프가 켜져요.',
        },
        {
          type: 'quiz', title: '증폭기는 에너지를 공짜로 늘릴까?',
          goal: '트랜지스터는 전기 에너지를 <b>만들어 내는</b> 소자일까요?',
          setup() { S.gate = ''; Object.assign(S.w, { sub: 'vin', vin: 5 }); setScene('sw'); },
          choices: ['아니요 — 전원의 에너지를 입력 신호에 맞게 조절할 뿐이에요', '네 — 작은 전류를 100배의 에너지로 바꿔 줘요', '네 — 베이스 전류가 컬렉터에서 증폭되어 새로 생겨요', '아니요 — 트랜지스터는 에너지를 쓰지 않아요'],
          answer: 0,
          feedback: ['', 'I_C 를 이루는 에너지는 전원(V_CC)이 대 줘요. 신호가 에너지를 늘려 주는 것은 아니에요.', '컬렉터 전류는 전원에서 오는 전류이고, 베이스 전류는 그 흐름을 조절하는 역할이에요.', '트랜지스터에도 V_CE × I_C 만큼의 전력이 열로 쓰여요. 에너지 보존은 늘 지켜져요.'],
          explain: '트랜지스터는 <b>전원(V_CC)의 에너지를 신호의 모양에 맞게 조절</b>해요. 입력 신호는 작은 I_B 로 큰 I_C 의 흐름을 열었다 닫는 역할만 해요. 증폭기가 에너지를 공짜로 만드는 것은 아니에요.',
        },
      ],
    },
    {
      title: '증폭: 작은 신호를 크게', short: '증폭', icon: '📈', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> I_C = β I_B 를 확인했어요. 스위치로는 켜짐/꺼짐만 썼지만, 활성 영역에서 I_B 가 조금씩 변하면 I_C 도 100배의 폭으로 변해요. 이것이 <b>증폭</b>이에요.</div>' +
        '<p>V_CC = 9.0 V, R_C = 2.0 kΩ 의 증폭 회로예요. <b>바이어스</b>(직류 I_B0)로 I_C 의 중심을 정하고, 작은 정현파 신호(± 10 μA)를 얹어요. 출력 v_C = 9 − R_C I_C 는 입력과 <b>위상이 반대</b>예요. 바이어스를 바꿔 <b>왜곡 없는 증폭</b>이 되는 값을 찾아봐요.</p>',
      features: ['amp'],
      setup() { S.gate = ''; Object.assign(S.a, { bias: 2, A: 10, sawCut: 0, sawSat: 0 }); setScene('amp'); },
      recap: '적당한 바이어스(I_C0 = 2.0 mA)에서 ± 10 μA 의 입력은 I_C ± 1.0 mA, R_C 전압 ± 2.0 V 로 위상이 반대로 커져요. 바이어스가 틀리면 파형이 잘려요.',
      summary: '<ul><li><b>증폭</b>: 바이어스 I_B0 = 20 μA (I_C0 = 2.0 mA, V_RC = 4.0 V, V_CE = 5.0 V) 위에 입력 ± 10 μA → I_C ± 1.0 mA → R_C 전압 ± 2.0 V.</li><li>출력은 입력과 <b>위상이 반대</b>: 입력 ↑ → I_C ↑ → R_C 전압 ↑ → 컬렉터 전압 ↓.</li><li>바이어스가 0 이면 입력의 양(+) 반쪽만 증폭, 너무 크면 I_C 가 한계(4.4 mA)에 닿아 출력의 아래쪽이 잘려요(<b>클리핑 왜곡</b>).</li><li>전원이 에너지를 대 주고 입력 신호는 그 흐름을 조절해요.</li></ul>',
      missions: [
        {
          title: '왜곡 없는 증폭 만들기',
          goal: '바이어스를 <b>0 mA</b> 근처와 <b>4 mA</b> 근처로도 바꿔 파형이 잘리는 것을 1초 이상 보고, 마지막으로 <b>왜곡 없이</b> 증폭되게 맞추세요.',
          hint: '바이어스 슬라이더로 0.0 mA 와 4.0 mA 를 각각 1초 이상 두고 나서, 2.0 mA 로 가져오면 왜곡이 없어요. (입력은 ± 10 μA 이상)',
          setup() { S.gate = ''; Object.assign(S.a, { bias: 1, A: 10, sawCut: 0, sawSat: 0 }); setScene('amp'); },
          check: () => S.a.sawCut >= 1 && S.a.sawSat >= 1 && aClean(), hold: 1.0,
          status: () => mark(S.a.sawCut >= 1) + ' 아래가 잘리는 경우 &nbsp; ' + mark(S.a.sawSat >= 1) + ' 위가 잘리는 경우 &nbsp; ' + mark(aClean()) + ' 왜곡 없음 (바이어스 ' + S.a.bias.toFixed(1) + ' mA)',
          explain: '바이어스가 0 이면 입력의 음(−) 반쪽에서 I_B 가 0 이 되어 I_C 도 0(차단) → 출력 위쪽이 잘려요. 바이어스가 너무 크면 I_C 가 한계 (9.0 − 0.2) / 2.0 kΩ = 4.4 mA 에 닿아 포화 → 출력 아래쪽이 잘려요. 적당한 I_C0 = 2.0 mA (I_B0 = 20 μA)에서는 I_C 가 1~3 mA 로 변해 왜곡 없이 증폭돼요.',
        },
        {
          title: '출력 진폭 계산과 위상 반전', manual: true,
          goal: '입력 ± 10 μA 일 때 R_C 전압의 변화 진폭을 계산해 쓰고, 위상이 반대인 까닭을 고른 뒤 <b>✔ 확인하기</b>를 눌러요.',
          hint: 'ΔI_C = β ΔI_B = 100 × 10 μA = 1.0 mA. 전압 변화 = ΔI_C × R_C = 1.0 mA × 2.0 kΩ.',
          setup() { Object.assign(S.a, { bias: 2, A: 10 }); numA.clear(); resetSels(selAs, selA.st, selA.ok); S.gate = 'ma2'; setScene('amp'); },
          check: () => { const a = checkNum(numA, 2.0, 0.03, 'ΔI_C = 100 × 10 μA = 1.0 mA, ΔV = 1.0 mA × 2.0 kΩ 를 계산해 보세요.'); if (a !== true) return a; return checkSel(selAR, selA.st, selA.ok, selAs, '빨간 칸을 다시 생각해 봐요. 컬렉터 전압 = 9 V − R_C 의 전압 이에요.'); },
          status: () => '출력 진폭은 가려 두었어요 (입력 ± 10 μA, R_C = 2.0 kΩ)',
          explain: 'ΔI_C = β ΔI_B = 100 × 10 μA = 1.0 mA, R_C 의 전압 변화는 1.0 mA × 2.0 kΩ = <b>± 2.0 V</b> 예요(출력 v_C 는 5.0 V 를 중심으로 3~7 V). 입력이 커지면 I_C 와 R_C 의 전압은 커지지만 컬렉터 전압 = 9 V − R_C 전압 은 작아지므로 위상이 반대예요.',
        },
      ],
    },
    {
      title: '소리 증폭: 마이크에서 스피커까지', short: '소리 증폭', icon: '📢', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 증폭기 하나는 전류를 100배로 키웠어요. 마이크 신호 ± 10 μA 는 1단 증폭 후에도 ± 1 mA 뿐이에요. 스피커(8 Ω)를 크게 울리려면 몇 단이 필요할까요? <b>소리 증폭 탐구 활동</b>이에요.</div>' +
        '<p>마이크 → 1단 증폭 → 2단 증폭 → 스피커 순서로 <b>배선</b>하고(출력 점을 끌어 입력 점에 놓거나 차례로 눌러요), 증폭 단 수와 목소리 크기를 바꿔 <b>선명한 소리</b>를 찾아요. 전원이 허용하는 전류(± 150 mA)를 넘으면 파형이 잘려 소리가 찢어져요.</p>',
      features: ['snd'],
      setup() { S.gate = ''; Object.assign(S.s, { conn: [-1, -1, -1, -1], on: [true, true], voice: 10, sel: null, drag: null, sawQuiet: 0, touched: false }); setScene('snd'); },
      recap: '증폭은 1단이면 × 100, 2단이면 × 10000 이에요. 전원이 허용하는 한계를 넘으면 파형이 잘려(클리핑) 소리가 찢어져요. 전원의 에너지가 소리와 열이 돼요.',
      summary: '<ul><li>마이크 ± 10 μA → 1단 증폭(β = 100) ± 1 mA → 2단 증폭 ± 100 mA(= 10 μA × 100 × 100). 스피커(8 Ω)를 크게 울리려면 2단이 필요해요. 증폭은 40 dB씩 늘어요.</li><li>입력이 지나치게 크거나 증폭이 많으면 출력이 전원이 허용하는 한계를 넘으려 해서 파형의 위·아래가 잘려요(<b>클리핑 왜곡</b>, 소리가 찢어짐).</li><li>에너지 흐름: 전원 → 증폭기 → 소리 + 열. 트랜지스터가 에너지를 만들어 내는 것이 아니라 전원의 에너지를 신호에 맞춰 조절해요.</li></ul>',
      missions: [
        {
          title: '배선 완성하기', manual: true,
          goal: '<b>🎤 마이크 → 1단 증폭 → 2단 증폭 → 🔊 스피커</b> 순서로 배선하고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '주황 점(출력)을 끌어 초록 점(입력)에 놓아요. 또는 주황 점을 누른 뒤 초록 점을 눌러도 돼요. 잘못 이었으면 초록 점을 눌러 끊고 다시 이어요.',
          setup() { Object.assign(S.s, { conn: [-1, -1, -1, -1], on: [true, true], voice: 10, sel: null, drag: null }); S.gate = ''; setScene('snd'); },
          check: () => { const c = S.s.conn, need = [[0, 1, '마이크 → 1단'], [1, 2, '1단 → 2단'], [2, 3, '2단 → 스피커']], miss = need.filter((n) => c[n[0]] !== n[1]).map((n) => n[2]); if (miss.length) return '아직 연결되지 않은 곳이 있어요: ' + miss.join(', '); return true; },
          status: () => ['0:1:마이크→1단', '1:2:1단→2단', '2:3:2단→스피커'].map((t) => { const q = t.split(':'); return mark(S.s.conn[+q[0]] === +q[1]) + ' ' + q[2]; }).join(' &nbsp; '),
          explain: '신호는 마이크 → 1단 → 2단 → 스피커 순으로 지나가며 한 단을 지날 때마다 전류가 100배가 돼요. 직렬로 이은 증폭 단은 이득이 곱해져서 2단이면 100 × 100 = 10000배예요.',
        },
        {
          title: '선명한 소리 만들기',
          goal: '1단 이하일 때의 소리를 1초 이상 들어 본 뒤, <b>스피커 전류 50 mA 이상</b>이면서 파형이 잘리지 않는 <b>선명한 소리</b>를 만드세요.',
          hint: '증폭기 버튼으로 2단 중 하나를 건너뛰면 소리가 작아져요. 다시 켠 뒤 목소리 크기를 ± 15 μA 이하로 줄이면 100 ~ 150 mA 로 선명해요. (± 25 μA 에서는 잘려요)',
          setup() { Object.assign(S.s, { conn: [1, 2, 3, -1], on: [true, true], voice: 25, sel: null, drag: null, sawQuiet: 0, touched: true }); S.gate = ''; setScene('snd'); },
          check: () => sndWired() && S.s.sawQuiet >= 1 && sndCalc().clear, hold: 1.2,
          status: () => { const c = sndCalc(); return mark(sndWired()) + ' 배선 &nbsp; ' + mark(S.s.sawQuiet >= 1) + ' 1단 이하 소리 듣기 &nbsp; ' + mark(c.clear) + ' 선명 (' + (c.reach ? fmAmp(c.amp) : '—') + (c.clipped ? ', 잘림' : '') + ')'; },
          explain: '2단 증폭에서 마이크 ± 10 μA → ± 100 mA 가 되어 스피커가 선명하게 울려요. 1단은 ± 1 mA 로 작은 소리예요. 목소리를 ± 25 μA 로 키우면 2단 출력 250 mA 가 한계 150 mA 를 넘어 꼭대기가 잘리고(클리핑) 소리가 찢어져요.',
        },
        {
          type: 'quiz', title: '소리가 찢어지는 까닭',
          goal: '증폭을 <b>지나치게</b> 하면 소리가 찢어지는 까닭은 무엇일까요?',
          setup() { Object.assign(S.s, { conn: [1, 2, 3, -1], on: [true, true], voice: 25, sel: null, drag: null, touched: true }); S.gate = ''; setScene('snd'); },
          choices: ['출력 전류가 전원이 허용하는 한계를 넘을 수 없어 파형의 꼭대기가 잘려 모양이 변하기 때문이에요', '트랜지스터가 소리를 새로 만들어 내기 때문이에요', '증폭할수록 β 가 커지기 때문이에요', '마이크가 고장 났기 때문이에요'],
          answer: 0,
          feedback: ['', '트랜지스터는 소리를 만들지 않아요. 입력 신호의 모양을 따라 전류를 조절할 뿐이에요.', 'β 는 변하지 않아요. 단 수가 늘면 이득이 곱해질 뿐이에요.', '마이크는 정상이에요. 같은 입력도 1단에서는 찢어지지 않아요. 화면의 점선과 실선 파형을 비교해 보세요.'],
          explain: '출력 전류는 전원이 허용하는 한계(여기서는 ± 150 mA)를 넘을 수 없어요. 입력×이득이 그 값을 넘으면 파형의 위·아래가 평평하게 잘려(<b>클리핑</b>) 원래 소리와 다른 모양이 되고 소리가 찢어져요.',
        },
      ],
    },
    {
      title: '논리회로: 트랜지스터 스위치의 조합', short: '논리회로', icon: '🧮', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 트랜지스터는 스위치(켜짐/꺼짐)와 증폭기로 쓰였어요. 스위치로 쓰면 <b>0 과 1</b>을 처리하는 논리 게이트를 만들 수 있어요. 앞 차시의 다이오드 OR·AND 와 달리 전압 손실 없이 HIGH/LOW 를 만들어요.</div>' +
        '<p><b>NOT</b>(입력과 반대), 트랜지스터 2개를 직렬로 한 <b>NAND</b>, 병렬로 한 <b>NOR</b>의 출력을 확인하고 진리표를 채워요. NAND 만으로 NOT·AND 를 만들고, 마지막으로 <b>반가산기</b>(1 + 1 = 10₂)에 도전해요.</p>',
      features: ['logic'],
      setup() { S.gate = ''; Object.assign(S.g, { sub: 'inv', kind: 'not', nbk: 'not', A: 0, B: 0, tb: {}, seen: {} }); setScene('logic'); },
      recap: 'NOT·NAND·NOR 는 트랜지스터 스위치로 만들고, NAND 만으로 NOT·AND 등 모든 논리회로를 만들 수 있어요. 반가산기는 합 S = A XOR B, 올림 C = A AND B 예요.',
      summary: '<ul><li><b>NOT</b>: 입력 HIGH → 트랜지스터 켜짐 → 출력 LOW (입력과 반대). <b>NAND</b>: 트랜지스터 2개 직렬 — 둘 다 HIGH 일 때만 LOW. <b>NOR</b>: 병렬 — 하나라도 HIGH 이면 LOW.</li><li>NAND 한 개의 입력을 묶으면 NOT, NAND 뒤에 NOT 을 이으면 AND. NAND 만으로 모든 논리회로를 만들 수 있어요.</li><li><b>반가산기</b>: 합 S = A XOR B, 올림 C = A AND B. 1 + 1 = <b>10₂</b> (S = 0, C = 1).</li><li>CPU 는 한 칩에 트랜지스터 수십억~수백억 개(1971년 약 2300개). 스마트폰·자동차·의료 기기·인공지능 서버가 반도체 위에서 동작해요.</li></ul>',
      missions: [
        {
          title: '진리표 완성하기', manual: true,
          goal: '<b>NAND</b> 와 <b>NOR</b> 의 입력 4가지를 모두 눌러 Y 를 확인한 뒤, 진리표 8칸을 채우고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '게이트 종류를 NAND / NOR 로 바꿔 가며 A, B 를 눌러 보세요. 화면 아래 표에는 관찰한 줄만 채워져요. NAND: 둘 다 HIGH 일 때만 LOW. NOR: 하나라도 HIGH 이면 LOW.',
          setup() { Object.assign(S.g, { sub: 'inv', kind: 'nand', A: 0, B: 0, tb: {}, seen: {} }); truthReset(); S.gate = 'mg2'; setScene('logic'); },
          check: () => { if (gSeenN('nand') < 4 || gSeenN('nor') < 4) return '먼저 NAND 와 NOR 모두에서 입력 4가지를 눌러 Y 를 확인해 보세요. (지금 ' + (gSeenN('nand') + gSeenN('nor')) + ' / 8줄)'; return truthCheck(); },
          status: () => mark(gSeenN('nand') >= 4 && gSeenN('nor') >= 4) + ' 입력 관찰 ' + (gSeenN('nand') + gSeenN('nor')) + ' / 8 &nbsp; ' + mark(truthN() === 8) + ' 표 ' + truthN() + ' / 8칸',
          explain: 'NAND: 00→1, 01→1, 10→1, 11→0 (직렬 트랜지스터는 둘 다 켜져야 출력이 LOW). NOR: 00→1, 01→0, 10→0, 11→0 (병렬은 하나만 켜져도 출력이 LOW). 켜진 트랜지스터는 포화라 출력이 약 0.2 V, 꺼진 출력은 5.0 V 로 당겨져 HIGH 가 돼요.',
        },
        {
          title: '반가산기 확인하기', manual: true,
          goal: '반가산기에서 입력 <b>4가지</b>를 모두 눌러 보고, 1 + 1 일 때의 합 S 와 올림 C 를 고른 뒤 <b>✔ 확인하기</b>를 눌러요.',
          hint: 'A, B 를 눌러 00, 01, 10, 11 을 모두 만들어 봐요. 표에 S, C 가 기록돼요. 1 + 1 = 10₂ 이므로 올림 C = 1, 합 S = 0 이에요.',
          setup() { Object.assign(S.g, { sub: 'half', A: 0, B: 0, tb: {}, seen: {} }); resetSels(selHs, selH.st, selH.ok); S.gate = 'mg3'; setScene('logic'); },
          check: () => { const n = Object.keys(S.g.seen).length; if (n < 4) return '입력 4가지(00, 01, 10, 11)를 모두 눌러 확인해 보세요. (지금 ' + n + ' / 4)'; return checkSel(selHR, selH.st, selH.ok, selHs, '빨간 칸을 다시 확인해 봐요. 1 + 1 = 10₂ 이에요. (올림 C = 1, 합 S = 0)'); },
          status: () => mark(Object.keys(S.g.seen).length >= 4) + ' 입력 확인 ' + Object.keys(S.g.seen).length + ' / 4 &nbsp; ' + mark(!!selH.st[0] && !!selH.st[1]) + ' S, C 고르기',
          explain: '반가산기는 NAND 5개로 만들어요. S = A XOR B 이고 C = A AND B 이므로 1 + 1 에서는 S = 0, C = 1 → 10₂ 예요. 0+0 = 00, 0+1 = 01, 1+0 = 01, 1+1 = 10 이에요.',
        },
        {
          title: 'NAND의 힘과 반도체의 의미', manual: true,
          goal: '두 질문에 답하고 <b>✔ 확인하기</b>를 눌러요. (🧱 NAND로 만들기 화면에서 NOT·AND 만드는 것을 먼저 보면 도움이 돼요)',
          hint: 'NAND 의 입력을 묶으면 NOT, NAND 뒤에 NOT 을 이으면 AND 예요. NOT·AND 로 OR 도 만들 수 있어요. 칩에는 작은 스위치가 아주 많이 들어가요.',
          setup() { Object.assign(S.g, { sub: 'nand', nbk: 'not', A: 0, B: 0 }); resetSels(selGs, selG.st, selG.ok); S.gate = 'mg4'; setScene('logic'); },
          check: () => checkSel(selGR, selG.st, selG.ok, selGs, '빨간 칸을 다시 생각해 봐요. NAND 로 NOT·AND 를 만들었고, 칩은 작고 효율적인 스위치를 아주 많이 모아요.'),
          status: () => '고른 문제 ' + selGR.filter((r, i) => selG.st[i]).length + ' / 2',
          explain: 'NAND 하나의 입력을 묶으면 NOT, 두 NAND 를 이으면 AND 가 되고, NOT·AND 를 조합하면 OR 를 포함한 모든 논리회로를 만들 수 있어요. 한 칩에 트랜지스터 스위치를 수십억 개 넣을 수 있어서 계산·제어·통신 장치가 모두 반도체 칩 위에서 동작해요.',
        },
      ],
    },
  ];
  levels.forEach((lv) => lv.missions.forEach((m) => { MS[m.title] = m; }));

  game = SciSim.game({
    simId: 'hq-transistor', mount: '#game', badge: '트랜지스터 분석가', homeHref: '../../index.html#hq',
    featureLabels: { sw: '🔌 트랜지스터 스위치 · 자동 가로등', amp: '📈 증폭기 · 오실로스코프', snd: '📢 소리 증폭 배선', logic: '🧮 논리 게이트 · 반가산기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && (game.free || game.phase === 'complete' || game.phase === 'intro')) { S.gate = ''; updateCtl(); }
    view.apply();
    if (S.mode === 'sw') stepSw(dt); else if (S.mode === 'amp') stepAmp(dt); else if (S.mode === 'snd') stepSnd(dt); else stepLogic(dt);
    sceneBg();
    T(14, 26, TITLE[S.mode], PHONE ? 11.5 : 15.5, '#26324a', 'left', 800);
    if (S.mode === 'sw') drawSw(); else if (S.mode === 'amp') drawAmp(); else if (S.mode === 'snd') drawSnd(); else drawLogic();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SC, STP, IN, MS, TT, numI, numA, selWs, selAs, selHs, selGs,
    get game() { return game; }, setScene, updateCtl, swCalc, calcBjt, ampSamples, sndCalc, sndWired, connect, invY, netEval, NETS, toggleG, recordG, blk, pOut, pIn, lp, inRects, truthReset, ICSAT,
  };

})();
