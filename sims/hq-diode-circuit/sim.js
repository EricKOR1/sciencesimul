/* =========================================================
   전자기와 양자 Ⅰ. 전자기적 상호작용 - 다이오드 회로 (단원 10차시)
   성취기준 [12전자01-07] 다이오드, 트랜지스터 등 반도체 소자를 활용하는 전자회로를 분석하고, 현대 문명에서 반도체의 중요성을 인식할 수 있다.
   ① 실험: 전류의 길 (순방향 약 0.7 V 강하로 도통, 역방향 차단)
   ② 분석: 브리지 (반파·전파 정류, 오실로스코프, 켜지는 다이오드 쌍)
   ③ 적용: 전원 장치 (220 V → 변압 → 정류 → 평활, 리플 ΔV ≈ I/(fC))
   ④ 적용: LED·논리 (보호 저항 R = (V − V_LED)/I, 다이오드 OR·AND)
   다이오드는 '한 방향으로만 전류를 흘리는 소자'로만 모형화해요. I–V 지수식, 제너·쇼트키, 공핍층은 다루지 않아요.
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

  const MODE_LABEL = { path: '🔺 전류의 길', bridge: '🔀 브리지', supply: '🔌 전원 장치', led: '💡 LED·논리' };
  const TITLE = {
    path: '🔺 다이오드: 한 방향으로만 전류를 흘려요',
    bridge: '🔀 정류: 교류를 한 방향의 전류로 바꿔요',
    supply: '🔌 전원 장치: 변압 → 정류 → 평활',
    led: '💡 LED와 다이오드 논리: 순방향일 때만 작동해요',
  };
  const CXs = SC.w / 2;
  const VD = 0.7, VSRC = 5.0, RBULB = 43, VPK = 12 * Math.SQRT2, RLD = 100, VLED = 2.0, ILED = 0.020, IMAXLED = 0.040;
  const fmA = (i) => { const m = i * 1000; return (m >= 100 ? m.toFixed(0) : m >= 10 ? m.toFixed(1) : m.toFixed(1)) + ' mA'; };
  const fV1 = (v) => v.toFixed(1) + ' V';

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'path', t: 0, fade: 0, gate: '',
    p: { cir: 0, flip: true, ph: 0, br: [0, 0], pz: false, seenRev: 0, seenFwd: 0 },
    b: { type: 'half', orient: [1, 1, 1, 1], ang: [0, 0, 0, 0], tc: 0, halfT: 0, ph: { d: [0, 0, 0, 0], l: 0, s: 0 }, cache: null, cacheKey: '', flipN: 0 },
    w: { form: 'bridge', ci: 3, I: 0.10, vc: 0, t: 0, hist: [], acc: 0, cond: false, rip: null, ph: 0 },
    l: { sub: 'led', R: 330, flip: false, burn: 0, burned: false, burnSeen: false, replN: 0, A: 0, B: 0, ph: 0, br: 0, seen: {}, tb: {}, safeT: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const masked = (g) => S.gate === g && game && game.phase === 'active';

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
  function batt(x, y, flip, label) {                        // 세로 전지: 긴 가는 판이 +
    const pl = flip ? y + 9 : y - 9, mi = flip ? y - 9 : y + 9;
    ctx.strokeStyle = '#0f172a'; ctx.lineCap = 'round'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 15, pl); ctx.lineTo(x + 15, pl); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 8, mi); ctx.lineTo(x + 8, mi); ctx.stroke();
    T(x - 23, pl + 5, '+', 14, '#dc2626', 'center', 800); T(x - 23, mi + 5, '−', 14, '#2563eb', 'center', 800);
    if (label) T(x + 24, y + 5, label, 13, '#334155', 'left', 800);
  }
  function diodeSym(x, y, ang, L, st, glow) {                // 다이오드 기호: 삼각형이 향하는 쪽이 순방향
    const h = L * 0.36;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (st === 'on') D.glow(0, 0, L * 1.1, '#4ade80', 0.5 * (glow == null ? 1 : glow));
    const fill = st === 'on' ? '#86efac' : st === 'off' ? '#fecaca' : '#e5e7eb', ln = st === 'on' ? '#15803d' : st === 'off' ? '#b91c1c' : '#475569';
    ctx.fillStyle = fill; ctx.strokeStyle = ln; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-L / 2, -h); ctx.lineTo(L / 2 - 3, 0); ctx.lineTo(-L / 2, h); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(L / 2 - 3, -h - 1.5); ctx.lineTo(L / 2 - 3, h + 1.5); ctx.stroke();
    ctx.restore();
  }
  function acSym(x, y, r) {
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 3; ctx.lineCap = 'round'; const k = r / 24;
    ctx.beginPath(); ctx.moveTo(x - 14 * k, y); ctx.bezierCurveTo(x - 9 * k, y - 18 * k, x - 3 * k, y - 18 * k, x, y); ctx.bezierCurveTo(x + 3 * k, y + 18 * k, x + 9 * k, y + 18 * k, x + 14 * k, y); ctx.stroke();
  }
  function meterV(x, y, text, color) {                       // 전압계 (원 + V) 와 읽음값
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = color || '#0d9488'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.stroke();
    T(x, y + 5, 'V', 15, color || '#0d9488', 'center', 800);
    if (text) lbl(x + 46, y, text, { size: 12.5, bg: color || '#0d9488', pad: 7, minX: 0, maxX: SC.w });
  }
  function gndSym(x, y) {
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x, y); ctx.moveTo(x - 13, y); ctx.lineTo(x + 13, y); ctx.moveTo(x - 8, y + 5); ctx.lineTo(x + 8, y + 5); ctx.moveTo(x - 3, y + 10); ctx.lineTo(x + 3, y + 10); ctx.stroke();
  }
  function dot(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function flowBox(x, y, w, h, title, sub, fill, ink, hot) {
    D.shadow(() => { D.roundRect(x, y, w, h, 10); ctx.fillStyle = fill; ctx.fill(); }, { blur: hot ? 9 : 4, y: 2 });
    if (hot) { D.roundRect(x, y, w, h, 10); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.4; ctx.stroke(); }
    T(x + w / 2, y + 20, title, 12.5, ink, 'center', 800); if (sub) T(x + w / 2, y + 38, sub, 11.5, ink, 'center', 700);
  }

  /* ================= ① 전류의 길 ================= */
  // 회로 = 직렬로 이어진 묶음(group)들, 묶음 안에는 병렬 가닥(lane). 'D' = 전지 → 오른쪽 방향이 순방향인 다이오드, 'd' = 반대 방향, 'B' = 전구
  const CIRS = [
    { name: '다이오드 1개', g: [[['D', 'B']]] },
    { name: '같은 방향 2개', g: [[['D', 'D', 'B']]] },
    { name: '반대 방향 2개', g: [[['D', 'd', 'B']]] },
    { name: '맞서 병렬', g: [[['D'], ['d']], [['B']]] },
    { name: '전구 2개', g: [[['D', 'B'], ['d', 'B']]] },
  ];
  const PUZ = [1, 3, 4];
  function cirEval(ci, pol) {                                 // pol = +1 (전지 + 쪽이 왼쪽 위) / −1 (뒤집음)
    const c = CIRS[ci];
    const lanesOn = c.g.map((grp) => grp.map((ln) => ln.every((e) => e === 'B' || (e === 'D' ? pol === 1 : pol === -1))));
    let on = true, nd = 0;
    c.g.forEach((grp, gi) => { const k = lanesOn[gi].indexOf(true); if (k < 0) on = false; else nd += grp[k].filter((e) => e !== 'B').length; });
    const cond = c.g.map((grp, gi) => grp.map((ln, li) => on && li === lanesOn[gi].indexOf(true)));
    const bulbs = [];
    c.g.forEach((grp, gi) => grp.forEach((ln, li) => ln.forEach((e) => { if (e === 'B') bulbs.push(cond[gi][li]); })));
    return { on, lanesOn, cond, nd, bulbs, I: on ? (VSRC - VD * nd) / RBULB : 0 };
  }
  const pzOn = () => S.p.pz && S.gate === 'mp2';
  const cirGeoCache = {};
  function cirGeo(ci) {
    if (cirGeoCache[ci]) return cirGeoCache[ci];
    const c = CIRS[ci], laneN = Math.max.apply(null, c.g.map((g) => g.length)), GAP = 46;
    const xb = 34; let cx = xb + 24; const groups = [];
    c.g.forEach((grp) => { const slots = Math.max.apply(null, grp.map((l) => l.length)); const gw = slots * 56 + 24; groups.push({ x0: cx, x1: cx + gw, slots }); cx += gw; });
    const xr = cx + 22, y0 = 24, yb = y0 + (laneN > 1 ? GAP : 0) + 56;
    const nB = c.g.reduce((n, grp) => n + grp.reduce((m, ln) => m + ln.filter((e) => e === 'B').length, 0), 0);
    const G = { nB, xb, xr, y0, yb, ym: (y0 + yb) / 2, groups, laneY: [y0, y0 + GAP], total: xr + 12, h: yb + 16 };
    cirGeoCache[ci] = G; return G;
  }
  const slotX = (G, gi, s) => G.groups[gi].x0 + 12 + s * 56 + 28;
  function activePts(ci, G, ev, pol) {
    const c = CIRS[ci], pts = [[G.xb, G.ym - 9], [G.xb, G.y0]];
    c.g.forEach((grp, gi) => {
      const k = ev.lanesOn[gi].indexOf(true), g = G.groups[gi];
      if (k > 0) { pts.push([g.x0, G.y0], [g.x0, G.laneY[k]], [g.x1, G.laneY[k]], [g.x1, G.y0]); } else pts.push([g.x1, G.y0]);
    });
    pts.push([G.xr, G.y0], [G.xr, G.yb], [G.xb, G.yb], [G.xb, G.ym + 9]);
    return pol === 1 ? pts : pts.slice().reverse();
  }
  // o: { pol, ev, powered, br[], ph, meter }
  function drawCir(ci, ox, oy, W, o) {
    const G = cirGeo(ci), c = CIRS[ci], ev = o.ev, pw = o.powered !== false, pol = o.pol;
    const sc = o.sc || 1;
    ctx.save(); ctx.translate(ox + Math.round((W - G.total * sc) / 2), oy); ctx.scale(sc, sc);
    if (pw && ev.on) { const ap = activePts(ci, G, ev, pol); ctx.beginPath(); ap.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.strokeStyle = 'rgba(250,204,21,.42)'; ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
    const w = new Path2D();
    w.moveTo(G.xb, G.ym - 9); w.lineTo(G.xb, G.y0); w.lineTo(G.xr, G.y0); w.lineTo(G.xr, G.yb); w.lineTo(G.xb, G.yb); w.lineTo(G.xb, G.ym + 9);
    c.g.forEach((grp, gi) => { const g = G.groups[gi]; for (let k = 1; k < grp.length; k++) { w.moveTo(g.x0, G.y0); w.lineTo(g.x0, G.laneY[k]); w.lineTo(g.x1, G.laneY[k]); w.lineTo(g.x1, G.y0); } });
    wireStroke(w, 2.8, 0);
    batt(G.xb, G.ym, pol === -1, VSRC.toFixed(1) + ' V');
    let bi = 0;
    c.g.forEach((grp, gi) => grp.forEach((ln, li) => {
      const y = G.laneY[li];
      ln.forEach((e, s) => {
        const x = slotX(G, gi, s);
        if (e === 'B') {
          drawBulb(x, y, 13, pw ? (o.br[bi] || 0) : 0);
          if (G.nB > 1) T(x + 24, y + 5, '①②③'[bi], 15, '#475569', 'left', 800);
          bi++;
        } else {
          const fwd = e === 'D' ? pol === 1 : pol === -1;
          const st = !pw ? 'idle' : fwd ? (ev.cond[gi][li] ? 'on' : 'idle') : 'off';
          diodeSym(x, y, e === 'D' ? 0 : Math.PI, 30, st, 1);
          if (pw) { if (st === 'on') T(x, y + 26, '0.7 V', 12, '#15803d', 'center', 800); else if (st === 'off') T(x, y + 26, '차단', 12, '#b91c1c', 'center', 800); }
        }
      });
    }));
    if (pw && ev.on && ev.I > 0.001) pathDots(activePts(ci, G, ev, pol), o.ph, 24, 2.8, '#f59e0b');
    if (o.meter) {                                            // 첫 다이오드 양단 전압계
      const x = slotX(G, 0, 0), lead = '#0d9488';
      ctx.strokeStyle = lead; ctx.lineWidth = 1.8; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x - 22, G.y0); ctx.lineTo(x - 22, G.y0 - 34); ctx.lineTo(x - 15, G.y0 - 34); ctx.moveTo(x + 22, G.y0); ctx.lineTo(x + 22, G.y0 - 34); ctx.lineTo(x + 15, G.y0 - 34); ctx.stroke(); ctx.setLineDash([]);
      meterV(x, G.y0 - 34, '', ev.on ? '#0d9488' : '#dc2626');
      lbl(x + 54, G.y0 - 34, o.meterText, { size: 12.5, bg: ev.on ? '#0d9488' : '#dc2626', pad: 7, minX: -1e4, maxX: 1e4 });
    }
    ctx.restore();
  }
  function drawPuzzle() {
    const rv = S.p.rv || 0, reveal = rv > 0.02;
    let y = 8;
    const tags = ['㉮', '㉯', '㉰'];
    PUZ.forEach((ci, j) => {
      const G = cirGeo(ci), ev = cirEval(ci, 1);
      D.roundRect(6, y - 2, SC.w - 12, G.h + 4, 12); ctx.fillStyle = 'rgba(241,245,249,.7)'; ctx.fill();
      T(20, y + 20, tags[j], 18, COL_BLUE, 'left', 800);
      drawCir(ci, 0, y, SC.w, { pol: 1, ev, powered: reveal, br: reveal ? ev.bulbs.map((b) => (b ? clamp(ev.I / 0.1, 0, 1) * rv : 0)) : [], ph: S.p.ph });
      y += G.h + 12;
    });
  }
  function stepPath(dt) {
    const p = S.p; if (dt <= 0) return;
    const pol = p.flip ? -1 : 1, pz = pzOn(), ev = pz ? cirEval(PUZ[0], 1) : cirEval(p.cir, pol);
    p.rv = SciSim.approach(p.rv || 0, pz && game && game.phase !== 'active' ? 1 : 0, dt, 5);
    p.ph += dt * (ev.on ? 40 + 700 * ev.I : 0);
    const n = Math.max(2, ev.bulbs.length);
    for (let i = 0; i < n; i++) p.br[i] = SciSim.approach(p.br[i] || 0, ev.bulbs[i] ? clamp(ev.I / 0.1, 0, 1) : 0, dt, 9);
    if (!pz && p.cir === 0) { if (p.flip) p.seenRev += dt; else p.seenFwd += dt; }
  }
  function drawPath() {
    const p = S.p; sceneBegin();
    if (pzOn()) {
      drawPuzzle();
      sceneEnd();
      panel(STP.x, STP.y, STP.w, STP.h, 14);
      const bx = STP.x + 12;
      const rev = game && game.phase !== 'active';
      T(bx, STP.y + 22, rev ? '전지를 연결했을 때의 모습이에요. 예측과 비교해 봐요.' : '전지를 연결하면 어느 전구가 켜질까요? 먼저 예측해 봐요.', PHONE ? 12 : 13.5, COL_BLUE, 'left', 800);
      T(bx, STP.y + 46, '다이오드의 삼각형이 향하는 쪽이 순방향이에요.', PHONE ? 11.5 : 12.5, '#26324a', 'left', 800);
      T(bx, STP.y + 68, '전지의 + 극이 왼쪽 위에 있어 전류는 오른쪽 방향으로 나가요.', PHONE ? 11.5 : 12.5, '#0b7a41', 'left', 800);
    } else {
      const pol = p.flip ? -1 : 1, ev = cirEval(p.cir, pol), G = cirGeo(p.cir);
      const mt = p.cir === 0 ? (ev.on ? '다이오드 0.7 V' : '다이오드 5.0 V') : null;
      const scx = p.cir === 3 || p.cir === 4 ? 1.2 : 1.35, oyc = p.cir === 0 ? 58 : 28;
      drawCir(p.cir, 0, oyc, SC.w, { pol, ev, powered: true, br: p.br, ph: p.ph, meter: p.cir === 0, meterText: mt, sc: scx });
      // 아래: 측정 카드
      const y0 = oyc + (G.h + 6) * scx + 4;
      D.shadow(() => { D.roundRect(10, y0, 452, 394 - y0, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      let y = y0 + 22;
      if (p.cir === 0) {
        T(20, y, '전지 5.0 V 가 나뉘는 모습 (눈금 5.0 V)', 13, COL_BLUE, 'left', 800); y += 14;
        const bx = 20, bw = 432, dvw = (ev.on ? VD : VSRC) / VSRC * bw, bulbV = ev.on ? VSRC - VD : 0;
        D.roundRect(bx, y, bw, 26, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
        ctx.save(); D.roundRect(bx, y, bw, 26, 8); ctx.clip();
        ctx.fillStyle = ev.on ? '#22c55e' : '#ef4444'; ctx.fillRect(bx, y, dvw, 26);
        if (ev.on) { ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx + dvw, y, bw - dvw, 26); }
        ctx.restore();
        if (ev.on) { T(bx + dvw / 2, y + 18, '0.7', 12, '#fff', 'center', 800); T(bx + dvw + (bw - dvw) / 2, y + 18, '전구 ' + bulbV.toFixed(1) + ' V', 13, '#fff', 'center', 800); }
        else T(bx + bw / 2, y + 18, '다이오드가 5.0 V 를 모두 떠맡고 전구는 0 V', 13, '#fff', 'center', 800);
        y += 44;
        T(20, y, ev.on ? '순방향: 다이오드는 약 0.7 V 를 쓰고 전류 ' + fmA(ev.I) + ' = (5.0 − 0.7) / 43 Ω' : '역방향: 다이오드가 전류를 막아요. 전류 0 mA', 12.5, ev.on ? '#15803d' : '#b91c1c', 'left', 800);
      } else {
        T(20, y, '전류의 길 점검', 13, COL_BLUE, 'left', 800); y += 8;
        const items = [];
        let di = 0, bi = 0;
        CIRS[p.cir].g.forEach((grp, gi) => grp.forEach((ln, li) => {
          ln.forEach((e) => {
            if (e === 'B') { items.push(['전구 ' + (bi + 1), ev.bulbs[bi] ? '켜짐' : '꺼짐', ev.bulbs[bi] ? '#15803d' : '#64748b']); bi++; }
            else { const fwd = e === 'D' ? pol === 1 : pol === -1; di++; items.push(['다이오드 D' + di, fwd ? (ev.cond[gi][li] ? '통과 · 0.7 V 강하' : '순방향 (전류 없음)') : '차단 (역방향)', fwd ? (ev.cond[gi][li] ? '#15803d' : '#64748b') : '#b91c1c']); }
          });
        }));
        items.forEach((it, i) => { y += 22; dot(26, y - 4, 5, it[2]); T(38, y, it[0], 12.5, '#26324a', 'left', 800); T(130, y, it[1], 12.5, it[2], 'left', 800); });
        y += 28;
        T(20, y, ev.on ? '전류 ' + fmA(ev.I) + ' = (5.0 − ' + (ev.nd * VD).toFixed(1) + ') / 43 Ω' : '어느 한 곳이라도 막히면 전류는 흐르지 않아요. 전류 0 mA', 12.5, ev.on ? '#15803d' : '#b91c1c', 'left', 800);
      }
      sceneEnd();
      panel(STP.x, STP.y, STP.w, STP.h, 14);
      const bx = STP.x + 12;
      T(bx, STP.y + 22, '회로 ' + '①②③④⑤'[p.cir] + ' · ' + CIRS[p.cir].name + ' · 전지 ' + (p.flip ? '뒤집음' : '바른 방향'), PHONE ? 12 : 13.5, COL_BLUE, 'left', 800);
      T(bx, STP.y + 46, ev.on ? '전류가 흐르는 길이 노랗게 빛나요.' : '전류가 막혀서 전구가 꺼졌어요.', PHONE ? 11.5 : 12.5, ev.on ? '#15803d' : '#b91c1c', 'left', 800);
      T(bx, STP.y + 68, '다이오드의 삼각형 방향 = 전류가 흐를 수 있는 방향', PHONE ? 11.5 : 12.5, '#26324a', 'left', 800);
    }
    infoPanel([
      { h: '다이오드의 한 방향 통로' },
      { p: '삼각형이 향하는 쪽으로는 전류가 흘러요(순방향). 순방향이면 약 0.7 V 가 줄어들면서 켜져요.', c: COL_BLUE },
      { tbl: [['순방향', '도통 · 약 0.7 V 강하', ''], ['역방향', '차단 · 전류 0', '']], c1: 0.3 },
      { p: '이 차시에서는 다이오드를 “한 방향으로만 전류를 흘리는 소자”로만 생각해요.' },
      { p: '직렬로 이어진 다이오드는 하나라도 역방향이면 막혀요. 병렬 가닥은 한 가닥만 열려도 전류가 흘러요.', c: '#9a3412' },
      { p: '🏭 건전지를 거꾸로 꽂아도 회로를 지켜 주는 역전압 보호, 라디오 신호 검출, 코일 스위칭 서지 흡수(플라이백)에 쓰여요.', c: '#0b7a41', big: 1 },
    ]);
  }
  $$('#cirSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.p.cir = +b.dataset.v; updateCtl(); }));
  $('#bFlip').addEventListener('click', () => { Sound.click(); S.p.flip = !S.p.flip; updateCtl(); });

  /* ================= ② 브리지 ================= */
  // 마디: 0 = AC₁, 1 = AC₂, 2 = P(+출력), 3 = N(−출력). 표준 방향 [양극(anode), 음극(cathode)]
  const BRD = [[0, 2], [1, 2], [3, 1], [3, 0]];
  const BN = [[120, 76], [352, 76], [236, 18], [236, 130]];             // 마디 좌표 (장면 좌표)
  const BSRC = { x: 236, y: 172, r: 17 };
  const GD = 100;
  function bridgeSolve(v, orient) {
    const nv = (n) => (n === 0 ? v : n === 1 ? 0 : null);
    const dio = BRD.map((d, k) => (orient[k] > 0 ? d : [d[1], d[0]]));
    const find = (a, k) => dio.findIndex((d) => d[0] === a && d[1] === k);
    const shorts = [];
    [2, 3].forEach((X) => {
      const a1 = find(0, X), a2 = find(1, X), b1 = find(X, 0), b2 = find(X, 1);
      if (a1 >= 0 && b2 >= 0 && v >= 2 * VD) shorts.push([a1, b2, 1]);
      if (a2 >= 0 && b1 >= 0 && -v >= 2 * VD) shorts.push([a2, b1, -1]);
    });
    if (shorts.length) {                                       // 합선: 부하를 거치지 않고 다이오드 두 개만으로 전원이 이어짐
      const on = [0, 0, 0, 0], di = [0, 0, 0, 0]; let isrc = 0;
      shorts.forEach((s) => { on[s[0]] = on[s[1]] = 1; di[s[0]] = di[s[1]] = 0.15; isrc += s[2] * 0.15; });
      return { short: true, on, vp: 0, vn: 0, vout: 0, il: 0, di, isrc };
    }
    for (let m = 0; m < 16; m++) {
      if (m === 0) {                                          // 모두 꺼짐: 부하에 전류 없음, P = N = u
        let lo = -1e9, hi = 1e9;
        dio.forEach((d) => { const a = nv(d[0]), k = nv(d[1]); if (a != null && k == null) lo = Math.max(lo, a - VD); else if (a == null && k != null) hi = Math.min(hi, k + VD); });
        if (lo <= hi) { const u = clamp(0, lo, hi); return { on: [0, 0, 0, 0], vp: u, vn: u, vout: 0, il: 0, di: [0, 0, 0, 0], isrc: 0 }; }
        continue;
      }
      // KCL: 마디 P, N 에서 나가는 전류의 합 = 0   (미지수 vp, vn)
      const row = [[1 / RLD, -1 / RLD, 0], [-1 / RLD, 1 / RLD, 0]];
      for (let k = 0; k < 4; k++) {
        if (!(m & (1 << k))) continue;
        const a = dio[k][0], c = dio[k][1];
        const E = [0, 0, -VD * GD];                           // g(Va − Vc − VD) = cp·vp + cn·vn + c0
        if (a === 2) E[0] += GD; else if (a === 3) E[1] += GD; else E[2] += GD * nv(a);
        if (c === 2) E[0] -= GD; else if (c === 3) E[1] -= GD; else E[2] -= GD * nv(c);
        if (a >= 2) { const r = row[a - 2]; r[0] += E[0]; r[1] += E[1]; r[2] += E[2]; }
        if (c >= 2) { const r = row[c - 2]; r[0] -= E[0]; r[1] -= E[1]; r[2] -= E[2]; }
      }
      const det = row[0][0] * row[1][1] - row[0][1] * row[1][0];
      if (Math.abs(det) < 1e-9) continue;
      const vp = (-row[0][2] * row[1][1] + row[0][1] * row[1][2]) / det, vn = (-row[0][0] * row[1][2] + row[1][0] * row[0][2]) / det;
      const V = (n) => (n === 2 ? vp : n === 3 ? vn : nv(n));
      let ok = true; const di = [0, 0, 0, 0];
      for (let k = 0; k < 4 && ok; k++) {
        const x = V(dio[k][0]) - V(dio[k][1]) - VD;
        if (m & (1 << k)) { if (x < -1e-7) ok = false; else di[k] = GD * x; } else if (x > 1e-7) ok = false;
      }
      if (!ok) continue;
      let isrc = 0;                                           // 전원이 AC₁ 으로 내보내는 전류
      for (let k = 0; k < 4; k++) { if (dio[k][0] === 0) isrc += di[k]; if (dio[k][1] === 0) isrc -= di[k]; }
      return { on: [0, 1, 2, 3].map((k) => (m & (1 << k) ? 1 : 0)), vp, vn, vout: vp - vn, il: (vp - vn) / RLD, di, isrc };
    }
    return { on: [0, 0, 0, 0], vp: 0, vn: 0, vout: 0, il: 0, di: [0, 0, 0, 0], isrc: 0 };
  }
  const vinAt = (tms) => VPK * Math.sin(TAU * 0.05 * tms);              // 50 Hz, t 는 ms
  function halfSolve(v) { const on = v > VD; const vo = on ? v - VD : 0; return { on: [on ? 1 : 0], vout: vo, il: vo / RLD, di: [vo / RLD], isrc: vo / RLD }; }
  const NSC = 200, TWIN = 40;
  function bridgeSamples() {
    const b = S.b, key = b.type + b.orient.join(',');
    if (b.cacheKey === key) return b.cache;
    const o = [], inn = [];
    for (let i = 0; i <= NSC; i++) { const t = i / NSC * TWIN, v = vinAt(t); inn.push(v); o.push((b.type === 'half' ? halfSolve(v) : bridgeSolve(v, b.orient)).vout); }
    b.cache = { inn, out: o, max: Math.max.apply(null, o), min: Math.min.apply(null, o) }; b.cacheKey = key; return b.cache;
  }
  const fullOK = () => {
    const b = S.b; if (b.type !== 'bridge') return false;
    const a = bridgeSolve(VPK, b.orient).vout, c = bridgeSolve(-VPK, b.orient).vout;
    return a > 15 && c > 15;
  };
  const brOkN = () => S.b.orient.filter((o) => o > 0).length;
  const bMask = () => masked('mb2');
  const BRNAME = ['D₁', 'D₂', 'D₃', 'D₄'];
  function stepBridge(dt) {
    const b = S.b; if (dt <= 0) return;
    b.tc = (b.tc + dt * 8) % TWIN;                                  // 실제보다 125배 느리게 (1 주기 = 2.5 s)
    if (b.type === 'half') b.halfT += dt;
    for (let k = 0; k < 4; k++) { const tgt = (b.flipN_[k] || 0) * Math.PI; b.ang[k] = SciSim.approach(b.ang[k], tgt, dt, 14); }
    const v = vinAt(b.tc), sol = b.type === 'half' ? halfSolve(v) : bridgeSolve(v, b.orient);
    b.sol = sol; b.v = v;
    const sp = (i) => 40 + 700 * i;
    if (b.type === 'half') { b.ph.s += dt * sp(sol.il); }
    else { for (let k = 0; k < 4; k++) b.ph.d[k] += dt * sp(sol.di[k]); b.ph.l += dt * sp(Math.abs(sol.il)); b.ph.s += dt * sp(Math.abs(sol.isrc)); }
  }
  S.b.flipN_ = [0, 0, 0, 0];
  function flipDiode(k) {
    const b = S.b; b.orient[k] = -b.orient[k]; b.flipN_[k] = (b.flipN_[k] || 0) + 1; Sound.click(); b.cacheKey = ''; updateCtl();
  }
  function brReset() { const b = S.b; b.orient = [-1, -1, 1, 1]; b.flipN_ = [1, 1, 0, 0]; b.cacheKey = ''; for (let k = 0; k < 4; k++) b.ang[k] = (b.flipN_[k]) * Math.PI; }
  function bPos(k) { const d = BRD[k], A = BN[d[0]], K = BN[d[1]]; return { x: (A[0] + K[0]) / 2, y: (A[1] + K[1]) / 2, ang: Math.atan2(K[1] - A[1], K[0] - A[0]) }; }
  const BLBL = [[-16, -12], [16, -12], [16, 14], [-16, 14]];
  function drawBridgeCircuit() {
    const b = S.b, sol = b.sol || bridgeSolve(0, b.orient), mk = bMask();
    // 도선
    const w = new Path2D();
    w.moveTo(BN[0][0], BN[0][1]); w.lineTo(BN[0][0], BSRC.y); w.lineTo(BSRC.x - BSRC.r, BSRC.y);
    w.moveTo(BSRC.x + BSRC.r, BSRC.y); w.lineTo(BN[1][0], BSRC.y); w.lineTo(BN[1][0], BN[1][1]);
    for (let k = 0; k < 4; k++) { const d = BRD[k]; w.moveTo(BN[d[0]][0], BN[d[0]][1]); w.lineTo(BN[d[1]][0], BN[d[1]][1]); }
    w.moveTo(BN[2][0], BN[2][1]); w.lineTo(236, 40); w.moveTo(236, 106); w.lineTo(BN[3][0], BN[3][1]);
    wireStroke(w, 2.8, 0);
    // 전류 점
    const dotsCol = '#f59e0b';
    for (let k = 0; k < 4; k++) { if (sol.di[k] > 0.004) { const d = BRD[k], A = BN[d[0]], K = BN[d[1]]; const pts = b.orient[k] > 0 ? [A, K] : [K, A]; pathDots(pts, b.ph.d[k], 22, 2.8, dotsCol); } }
    if (Math.abs(sol.il) > 0.004) pathDots(sol.il > 0 ? [[236, 18], [236, 130]] : [[236, 130], [236, 18]], b.ph.l, 22, 2.8, dotsCol);
    if (Math.abs(sol.isrc) > 0.004) {
      const L = [[BSRC.x - BSRC.r, BSRC.y], [BN[0][0], BSRC.y], [BN[0][0], BN[0][1]]], R = [[BN[1][0], BN[1][1]], [BN[1][0], BSRC.y], [BSRC.x + BSRC.r, BSRC.y]];
      pathDots(sol.isrc > 0 ? L : L.slice().reverse(), b.ph.s, 22, 2.8, dotsCol); pathDots(sol.isrc > 0 ? R : R.slice().reverse(), b.ph.s, 22, 2.8, dotsCol);
    }
    // 부하
    zig(236, 40, 236, 106, 6, 10, '#475569', 3.6);
    T(264, 78, '부하 100 Ω', 12.5, '#334155', 'left', 800);
    // 다이오드
    for (let k = 0; k < 4; k++) {
      const q = bPos(k), on = sol.on[k] > 0;
      diodeSym(q.x, q.y, q.ang + b.ang[k], 32, on ? 'on' : 'idle', 1);
      T(q.x + BLBL[k][0] * 1.0, q.y + BLBL[k][1] + (k < 2 ? -4 : 12), BRNAME[k], 12.5, on ? '#15803d' : '#475569', 'center', 800);
    }
    // 마디 점
    BN.forEach((p) => dot(p[0], p[1], 3.6, '#334155'));
    T(BN[0][0] - 12, BN[0][1] + 4, '', 12, '#000', 'right', 700);
    acSym(BSRC.x, BSRC.y, BSRC.r);
    T(BSRC.x, BSRC.y + 36, '교류 12 V', 12, '#334155', 'center', 800);
    T(BN[2][0] + 12, BN[2][1] + 4, '+', 14, '#dc2626', 'left', 800); T(BN[3][0] + 12, BN[3][1] + 4, '−', 16, '#2563eb', 'left', 800);
    for (let k = 0; k < 4; k++) if (sol.short && sol.on[k]) { const q = bPos(k); D.glow(q.x, q.y, 30, '#ef4444', 0.55); }
    if (!mk && !S.b.touched) { T(414, 96, '👆 다이오드를', 12.5, COL_BLUE, 'center', 800); T(414, 114, '눌러 방향을', 12.5, COL_BLUE, 'center', 800); T(414, 132, '뒤집어요', 12.5, COL_BLUE, 'center', 800); }
    if (sol.short) lbl(CXs, 206, '⚠ 합선! 전원이 부하를 거치지 않고 다이오드만 거쳐 돌아와요', { size: 12, bg: '#dc2626', pad: 8, minX: 0, maxX: SC.w });
  }
  function drawHalfCircuit() {
    const b = S.b, sol = b.sol || halfSolve(0);
    const w = new Path2D();
    w.moveTo(62, 92); w.lineTo(62, 40); w.lineTo(400, 40); w.lineTo(400, 60);
    w.moveTo(400, 134); w.lineTo(400, 180); w.lineTo(62, 180); w.lineTo(62, 128);
    wireStroke(w, 2.8, 0);
    if (sol.il > 0.004) pathDots([[62, 92], [62, 40], [400, 40], [400, 180], [62, 180], [62, 128]], b.ph.s, 22, 2.8, '#f59e0b');
    zig(400, 60, 400, 134, 6, 11, '#475569', 3.6); T(384, 100, '부하 100 Ω', 12.5, '#334155', 'right', 800);
    diodeSym(200, 40, 0, 34, sol.on[0] ? 'on' : (b.v < 0 ? 'off' : 'idle'), 1);
    T(200, 22, 'D', 12.5, sol.on[0] ? '#15803d' : '#475569', 'center', 800);
    T(200, 68, sol.on[0] ? '통과' : b.v < 0 ? '차단' : '', 12, sol.on[0] ? '#15803d' : '#b91c1c', 'center', 800);
    acSym(62, 110, 18); T(100, 114, '교류 12 V', 12, '#334155', 'left', 800);
    dot(62, 40, 3.6, '#334155'); dot(400, 40, 3.6, '#334155'); dot(400, 180, 3.6, '#334155'); dot(62, 180, 3.6, '#334155');
  }
  function drawScope() {
    const b = S.b, sm = bridgeSamples(), mk = bMask();
    D.shadow(() => { D.roundRect(10, 214, 452, 180, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    const gx0 = 52, gx1 = 440, gy0 = 244, gy1 = 366, Y = (v) => (gy0 + gy1) / 2 - v / 20 * ((gy1 - gy0) / 2), X = (i) => gx0 + i / NSC * (gx1 - gx0);
    T(20, 233, '오실로스코프: 입력 (파랑) · 출력 (주황) — 40 ms (2주기)', 11.5, COL_BLUE, 'left', 800);
    ctx.strokeStyle = '#e8edf5'; ctx.lineWidth = 1; [-20, -10, 0, 10, 20].forEach((v) => { ctx.beginPath(); ctx.moveTo(gx0, Y(v)); ctx.lineTo(gx1, Y(v)); ctx.stroke(); T(gx0 - 5, Y(v) + 4, v + ' V', 10.5, '#516079', 'right', 700); });
    [0, 10, 20, 30, 40].forEach((t) => T(X(t / TWIN * NSC), gy1 + 16, t + ' ms', 10.5, '#64748b', 'center', 700));
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx0, gy0 - 6); ctx.lineTo(gx0, gy1 + 6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(gx0, Y(0)); ctx.lineTo(gx1, Y(0)); ctx.stroke();
    const cur = Math.round(b.tc / TWIN * NSC);
    const trace = (arr, col) => {
      ctx.lineJoin = 'round'; ctx.lineWidth = 2.6;
      ctx.strokeStyle = SciSim.color.rgba ? SciSim.color.rgba(col, 0.25) : col; ctx.beginPath(); arr.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)))); ctx.stroke();
      ctx.strokeStyle = col; ctx.beginPath(); for (let i = 0; i <= cur; i++) (i ? ctx.lineTo(X(i), Y(arr[i])) : ctx.moveTo(X(i), Y(arr[i]))); ctx.stroke();
      D.glow(X(cur), Y(arr[cur]), 10, col, 0.6);
    };
    trace(sm.inn, '#2563eb'); trace(sm.out, '#f97316');
    ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(X(cur), gy0 - 6); ctx.lineTo(X(cur), gy1 + 6); ctx.setLineDash([]); ctx.stroke();
    const pk = b.type === 'half' ? halfSolve(VPK).vout : bridgeSolve(VPK, b.orient).vout;
    const txt = mk ? '출력 최대 ?' : '출력 최대 ' + fV1(Math.max(sm.max, 0));
    lbl(gx1 - 52, gy0 + 4, txt, { size: 11.5, bg: '#f97316', pad: 6, minX: 0, maxX: SC.w });
    return pk;
  }
  function drawBridge() {
    const b = S.b, mk = bMask(), sol = b.sol || { on: [0, 0, 0, 0], vout: 0, il: 0 }; sceneBegin();
    if (b.type === 'half') drawHalfCircuit(); else drawBridgeCircuit();
    drawScope();
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, sm = bridgeSamples();
    const onNames = b.type === 'half' ? (sol.on[0] ? 'D' : '없음') : (sol.on.map((o, k) => (o ? BRNAME[k] : null)).filter(Boolean).join(' · ') || '없음');
    T(bx, STP.y + 20, '지금 전류가 지나는 다이오드: ' + onNames, PHONE ? 12 : 13.5, '#15803d', 'left', 800);
    T(bx, STP.y + 44, '입력 ' + fV1(b.v || 0).replace('-', '−') + ' → 출력 ' + fV1(sol.vout) + '   (부하 전류 ' + fmA(sol.il) + ')', PHONE ? 12 : 13, '#26324a', 'left', 800);
    const full = b.type === 'bridge' && fullOK();
    T(bx, STP.y + 68, b.type === 'half' ? '반파 정류: 한 주기 중 양(+) 반쪽만 통과해요.' : full ? '전파 정류: 반주기마다 켜지는 다이오드 쌍이 번갈아 바뀌어요.' : '배선이 맞지 않아요. 다이오드 방향을 확인해 봐요.', PHONE ? 11.5 : 12.5, full ? '#0b7a41' : '#9a3412', 'left', 800);
    infoPanel([
      { h: '정류: 교류 → 한 방향' },
      { p: '변압기가 만든 교류 12 V(실효값)의 최댓값은 12√2 ≈ 17 V, 주파수 50 Hz (한 주기 20 ms)예요.', c: COL_BLUE },
      { tbl: [['반파 (D 1개)', mk ? '출력 최대 ?' : '최대 ' + fV1(halfSolve(VPK).vout) + ' · 50 Hz', ''], ['브리지 (D 4개)', mk ? '출력 최대 ?' : '최대 ' + fV1(bridgeSolve(VPK, [1, 1, 1, 1]).vout) + ' · 100 Hz', '']], c1: 0.38 },
      { p: '브리지는 전류가 항상 다이오드 2개를 지나서 전압 강하가 0.7 V × 2 = 1.4 V 예요. 그래서 반파보다 0.7 V 낮아요.', c: '#9a3412' },
      { p: '반주기마다 켜지는 쌍이 D₁·D₃ ↔ D₂·D₄ 로 바뀌어도 부하 전류의 방향은 늘 위 → 아래예요.' },
      { p: '🏭 노트북·휴대폰 충전기, 전자 제품 내부의 전원부에는 정류 회로가 들어 있어요.', c: '#0b7a41', big: 1 },
    ]);
  }
  $$('#rectSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.b.type = b.dataset.v; updateCtl(); }));
  $('#bBrReset').addEventListener('click', () => { Sound.click(); brReset(); updateCtl(); });
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'bridge' || S.b.type !== 'bridge' || S.gate === 'mb2') return false;
      const q = lp(p);
      for (let k = 0; k < 4; k++) { const c = bPos(k); if (Math.hypot(q.x - c.x, q.y - c.y) < 26) { S.b.touched = true; flipDiode(k); return false; } }
      return false;
    },
    move() {}, up() {},
    hover(p) { if (S.mode !== 'bridge' || S.b.type !== 'bridge' || S.gate === 'mb2') return 'default'; const q = lp(p); for (let k = 0; k < 4; k++) { const c = bPos(k); if (Math.hypot(q.x - c.x, q.y - c.y) < 26) return 'pointer'; } return 'default'; },
  });

  /* ================= ③ 전원 장치 ================= */
  const CVALS = [100, 220, 470, 1000, 2200, 4700, 10000];                 // μF
  const SDT = 0.1, WN = 400, SIMV = 8;                                    // 표본 간격 0.1 ms, 40 ms 창, 화면 1초 = 8 ms
  const rectV = (vin, form) => (form === 'bridge' ? Math.max(0, Math.abs(vin) - 2 * VD) : Math.max(0, vin - VD));
  function supStep(w, dtms) {
    const vin = vinAt(w.t), vr = rectV(vin, w.form), C = CVALS[w.ci] * 1e-6;
    if (vr > w.vc) { w.vc = vr; w.cond = true; } else { w.vc = Math.max(0, w.vc - w.I * dtms * 1e-3 / C); w.cond = false; }
    w.t += dtms; w.vin = vin; w.vr = vr;
  }
  const ripCache = {};
  function ripple(form, ci, I) {                                           // 정상 상태에서 측정한 리플 (12주기 돌린 뒤 마지막 주기)
    const key = form + '|' + ci + '|' + I.toFixed(2);
    if (ripCache[key]) return ripCache[key];
    const w = { form, ci, I, vc: 0, t: 0, cond: false }; let mn = 1e9, mx = -1e9, sum = 0, n = 0;
    const steps = 12 * 1000;
    for (let i = 0; i < steps; i++) { supStep(w, 0.02); if (i >= steps - 1000) { mn = Math.min(mn, w.vc); mx = Math.max(mx, w.vc); sum += w.vc; n++; } }
    return (ripCache[key] = { rip: mx - mn, max: mx, min: mn, mean: sum / n });
  }
  const supF = () => (S.w.form === 'bridge' ? 100 : 50);
  const supFormula = () => S.w.I / (supF() * CVALS[S.w.ci] * 1e-6);
  const fR = (x) => (x < 9.995 ? x.toFixed(2) : x.toFixed(1)) + ' V';
  const sMask = () => masked('ms2');
  function wSeed() {                                                       // 설정이 바뀌면 정상 상태에서 다시 시작
    const w = S.w, t0 = w.t;
    const tmp = { form: w.form, ci: w.ci, I: w.I, vc: 0, t: t0 - 260, cond: false };
    w.hist = [];
    const total = Math.round(260 / SDT);
    for (let i = 0; i < total; i++) { for (let k = 0; k < 5; k++) supStep(tmp, SDT / 5); if (i >= total - WN) w.hist.push([tmp.vin, tmp.vr, tmp.vc, tmp.cond ? 1 : 0]); }
    w.vc = tmp.vc; w.t = tmp.t; w.cond = tmp.cond; w.acc = 0; w.rip = ripple(w.form, w.ci, w.I);
  }
  function stepSupply(dt) {
    const w = S.w; if (dt <= 0) return;
    let rem = dt * SIMV; w.acc += rem;
    while (w.acc >= SDT) { w.acc -= SDT; for (let k = 0; k < 5; k++) supStep(w, SDT / 5); w.hist.push([w.vin, w.vr, w.vc, w.cond ? 1 : 0]); if (w.hist.length > WN) w.hist.shift(); }
    w.ph += dt * (30 + 300 * w.I);
    w.glow = SciSim.approach(w.glow || 0, w.cond ? 1 : 0, dt, 18);
  }
  function miniScope(x, y, w, h, idx, color, vmax, label) {
    D.roundRect(x, y, w, h, 8); ctx.fillStyle = '#0f172a'; ctx.fill();
    ctx.save(); D.roundRect(x, y, w, h, 8); ctx.clip();
    ctx.strokeStyle = 'rgba(148,163,184,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
    const hist = S.w.hist, n = hist.length; if (n > 1) {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let i = 0; i < n; i += 2) {
        const v = hist[i][idx], X = x + 3 + (i / (WN - 1)) * (w - 6), Y = idx === 0 ? y + h / 2 - v / vmax * (h / 2 - 5) : y + h - 5 - v / vmax * (h - 10);
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.stroke();
    }
    ctx.restore();
    T(x + w / 2, y + h + 14, label, 11.5, '#26324a', 'center', 800);
  }
  function drawSupply() {
    const w = S.w, mk = sMask(), r = w.rip || ripple(w.form, w.ci, w.I); sceneBegin();
    // 블록 그림
    const bl = [[10, 62, '220 V', '교류'], [86, 90, '변압기', '220 : 12'], [188, 86, w.form === 'bridge' ? '브리지' : '반파', '정류'], [286, 86, '평활', 'C = ' + CVALS[w.ci] + ' μF'], [384, 78, '부하', 'I = ' + w.I.toFixed(2) + ' A']];
    bl.forEach((b, i) => {
      flowBox(b[0], 6, b[1], 48, b[2], b[3], i === 0 ? '#e0f2fe' : i === 1 ? '#ede9fe' : i === 2 ? '#dcfce7' : i === 3 ? '#fef9c3' : '#ffedd5', '#1e293b', i === 2 && w.cond);
      if (i < 4) D.arrow(b[0] + b[1] + 1, 30, bl[i + 1][0] - 2, 30, { color: '#f97316', width: 3.4, head: 9 });
    });
    miniScope(86, 66, 90, 40, 0, '#38bdf8', 20, '변압 후 교류');
    miniScope(188, 66, 86, 40, 1, '#fb923c', 20, '정류 후');
    miniScope(286, 66, 86, 40, 2, '#4ade80', 20, '평활 후');
    miniScope(384, 66, 78, 40, 2, '#4ade80', 20, '부하 전압');
    // 메인 스코프
    D.shadow(() => { D.roundRect(10, 134, 452, 260, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    const gx0 = 52, gx1 = 440, gy0 = 178, gy1 = 366, Y = (v) => gy1 - v / 18 * (gy1 - gy0), X = (i) => gx0 + i / (WN - 1) * (gx1 - gx0);
    T(20, 154, '출력 전압 (초록) 과 정류 직후 전압 (주황) — 40 ms', 12, COL_BLUE, 'left', 800);
    ctx.strokeStyle = '#e8edf5'; ctx.lineWidth = 1; for (let v = 0; v <= 18; v += 3) { ctx.beginPath(); ctx.moveTo(gx0, Y(v)); ctx.lineTo(gx1, Y(v)); ctx.stroke(); T(gx0 - 5, Y(v) + 4, v + ' V', 10.5, '#516079', 'right', 700); }
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx0, gy0 - 4); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    const hist = w.hist, n = hist.length;
    if (n > 1) {
      // 다이오드가 켜진 구간 (전류가 축전기를 충전하는 때)
      ctx.fillStyle = 'rgba(34,197,94,.14)'; for (let i = 0; i < n; i++) if (hist[i][3]) ctx.fillRect(X(i) - 0.5, gy0 - 4, Math.max(1.2, (gx1 - gx0) / WN + 0.3), gy1 - gy0 + 4);
      ctx.lineJoin = 'round'; ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(249,115,22,.75)'; ctx.beginPath(); for (let i = 0; i < n; i++) (i ? ctx.lineTo(X(i), Y(hist[i][1])) : ctx.moveTo(X(i), Y(hist[i][1]))); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = '#16a34a'; ctx.beginPath(); for (let i = 0; i < n; i++) (i ? ctx.lineTo(X(i), Y(hist[i][2])) : ctx.moveTo(X(i), Y(hist[i][2]))); ctx.stroke();
      D.glow(X(n - 1), Y(hist[n - 1][2]), 11, '#16a34a', 0.6);
    }
    // 리플 표시
    const yMax = Y(r.max), yMin = Y(r.min);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(220,38,38,.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(gx0, yMax); ctx.lineTo(gx1, yMax); ctx.moveTo(gx0, yMin); ctx.lineTo(gx1, yMin); ctx.stroke(); ctx.setLineDash([]);
    if (r.rip > 0.05) { ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(gx1 + 8, yMax); ctx.lineTo(gx1 + 8, yMin); ctx.moveTo(gx1 + 4, yMax); ctx.lineTo(gx1 + 12, yMax); ctx.moveTo(gx1 + 4, yMin); ctx.lineTo(gx1 + 12, yMin); ctx.stroke(); }
    lbl(gx0 + 108, gy0 - 8, '리플 ΔV = ' + fR(r.rip), { size: 12.5, bg: '#dc2626', pad: 8, minX: 0, maxX: SC.w });
    lbl(gx1 - 66, gy1 - 18, '녹색 띠: 다이오드가 충전하는 때', { size: 11, bg: 'rgba(22,163,74,.9)', pad: 6, minX: 0, maxX: SC.w });
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, f = supFormula(), fv = f < 0.3 * (r.max + 0.001) ? '≈ ' + fR(f) : '식 사용 불가 (너무 커요)';
    T(bx, STP.y + 20, '출력 평균 ' + fR(r.mean) + ' · 리플 ΔV(측정) ' + fR(r.rip), PHONE ? 12 : 13.5, '#26324a', 'left', 800);
    T(bx, STP.y + 44, 'ΔV ≈ I / (f C) = ' + w.I.toFixed(2) + ' / (' + supF() + ' × ' + (CVALS[w.ci] * 1e-6 * 1000).toFixed(CVALS[w.ci] >= 1000 ? 0 : 1) + '×10⁻³) ' + (mk ? '= ?' : fv), PHONE ? 11 : 12, '#9a3412', 'left', 800);
    T(bx, STP.y + 68, w.form === 'bridge' ? '전파: 충전이 1/100 초마다 → 방전 시간이 짧아 리플이 작아요.' : '반파: 충전이 1/50 초마다 → 리플이 약 2배예요.', PHONE ? 11.5 : 12.5, '#0b7a41', 'left', 800);
    infoPanel([
      { h: '직류 전원 장치' },
      { p: '220 V 교류 → 변압기 (220 : 12) → 정류 (다이오드) → 평활 (축전기) → 부하.', c: COL_BLUE },
      { tbl: [['정류 방식', w.form === 'bridge' ? '전파 (브리지)' : '반파', ''], ['정류 주파수 f', supF() + ' Hz', ''], ['C · I', CVALS[w.ci] + ' μF · ' + w.I.toFixed(2) + ' A', '']], c1: 0.42 },
      { p: '정류된 전압이 낮아지면 축전기가 방전해 부하에 전류를 줘요. 전압이 다시 올라가면 다이오드가 켜져 충전해요.', c: '#9a3412' },
      { p: '부하 전류 I가 크거나 C가 작을수록 방전하는 동안 전압이 더 많이 내려가 리플이 커져요.' },
      { p: '🏭 휴대폰 충전기: 220 V → 변압 → 정류 → 평활 → 5 V 직류.', c: '#0b7a41', big: 1 },
    ]);
  }
  $$('#formSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.w.form = b.dataset.v; wSeed(); updateCtl(); }));
  bindSl('sC', () => S.w.ci, (v) => { S.w.ci = v; wSeed(); }, updateCtl);
  bindSl('sI', () => Math.round(S.w.I * 100), (v) => { S.w.I = v / 100; wSeed(); }, updateCtl);

  /* ================= ④ LED · 논리 ================= */
  const ledI = () => (S.l.burned || S.l.flip ? 0 : (VSRC - VLED) / S.l.R);
  const ledSafe = () => !S.l.burned && !S.l.flip && Math.abs(ledI() - ILED) <= 0.002;
  function gateY(kind, A, B) {
    const a = A ? 5 : 0, b = B ? 5 : 0;
    if (kind === 'or') { const m = Math.max(a, b); return m > 0 ? m - VD : 0; }
    const m = Math.min(a, b); return m < 5 ? m + VD : 5;
  }
  const isHigh = (y) => y > 2.5;
  function recordGate() { const l = S.l; if (l.sub === 'led') return; const t = (l.tb[l.sub] = l.tb[l.sub] || {}); t[(l.A ? 2 : 0) + (l.B ? 1 : 0)] = gateY(l.sub, l.A, l.B); }
  function stepLed(dt) {
    const l = S.l; if (dt <= 0) return;
    const I = ledI(), over = !l.burned && I > IMAXLED && !(l.grace > 0);
    if (l.grace > 0) l.grace -= dt;
    if (over) l.burn = clamp(l.burn + dt * (I / IMAXLED - 1), 0, 1.01); else l.burn = clamp(l.burn - dt * 0.5, 0, 1.01);
    if (!l.burned && l.burn >= 1) { l.burned = true; l.burnSeen = true; updateCtl(); Sound.fail(); parts.burst(SC.x + 330, SC.y + 60, { count: 18, speed: 150, colors: ['#fde047', '#fb923c', '#fff7ed'], life: 0.6, shape: 'star', size: 3 }); showHint('LED가 전류를 견디지 못하고 타 버렸어요! 🔧 LED 새로 끼우기를 눌러요.', 5200); }
    if (l.burned && !RM && Math.random() < dt * 10) parts.emit({ x: SC.x + 330 + (Math.random() - 0.5) * 12, y: SC.y + 46, vx: (Math.random() - 0.5) * 12, vy: -(30 + Math.random() * 30), life: 1.2, size: 6, color: 'rgba(100,116,139,.45)', shape: 'smoke', grow: 10 });
    l.br = SciSim.approach(l.br, clamp(I / ILED, 0, 1.6), dt, 9);
    l.ph += dt * (30 + 1500 * I);
    if (l.sub !== 'led') { const sp = 60; l.ph2 = (l.ph2 || 0) + dt * sp; }
  }
  function drawLedScene() {
    const l = S.l, I = ledI(), fl = l.flip; sceneBegin();
    // 도선
    const w = new Path2D();
    w.moveTo(60, 111); w.lineTo(60, 60); w.lineTo(130, 60); w.moveTo(250, 60); w.lineTo(306, 60); w.moveTo(354, 60); w.lineTo(420, 60); w.lineTo(420, 180); w.lineTo(60, 180); w.lineTo(60, 129);
    wireStroke(w, 2.8, I > 0.001 ? 0.35 : 0);
    batt(60, 120, fl, '5.0 V');
    zig(130, 60, 250, 60, 7, 11, '#475569', 3.8); T(190, 34, 'R = ' + l.R + ' Ω', 13, '#334155', 'center', 800);
    // LED
    const br = l.br, glowI = clamp(br, 0, 1.2);
    if (!l.burned && glowI > 0.04) D.glow(330, 60, 34 + 26 * glowI, '#ef4444', clamp(0.75 * glowI, 0, 0.9));
    const cool = l.burn;
    diodeSym(330, 60, 0, 34, l.burned ? 'idle' : fl ? 'off' : I > 0 ? 'on' : 'idle', 0.6);
    if (l.burned) { ctx.strokeStyle = '#111827'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(318, 48); ctx.lineTo(342, 72); ctx.moveTo(342, 48); ctx.lineTo(318, 72); ctx.stroke(); }
    else if (I > 0) { ctx.fillStyle = 'rgba(239,68,68,' + clamp(0.35 + 0.6 * glowI, 0, 1) + ')'; ctx.beginPath(); ctx.moveTo(318, 44); ctx.lineTo(341, 60); ctx.lineTo(318, 76); ctx.closePath(); ctx.fill(); if (cool > 0.05) { ctx.fillStyle = 'rgba(255,255,255,' + cool * 0.8 + ')'; ctx.fill(); } }
    if (!l.burned && glowI > 0.04) { ctx.strokeStyle = 'rgba(239,68,68,' + clamp(glowI, 0, 1) + ')'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; for (let k = 0; k < 2; k++) { const x = 332 + k * 14, y = 38 - k * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y - 12); ctx.moveTo(x + 12, y - 12); ctx.lineTo(x + 5, y - 11); ctx.moveTo(x + 12, y - 12); ctx.lineTo(x + 11, y - 5); ctx.stroke(); } }
    T(330, 96, l.burned ? '타 버린 LED' : '적색 LED', 12.5, l.burned ? '#b91c1c' : '#475569', 'center', 800);
    if (I > 0.001) pathDots([[60, 111], [60, 60], [420, 60], [420, 180], [60, 180], [60, 129]], l.ph, 24, 2.8, '#f59e0b');
    if (fl) lbl(330, 120, 'LED 양단 5.0 V · 역방향 → 전류 0', { size: 12, bg: '#b91c1c', pad: 7, minX: 0, maxX: SC.w });
    // 열 누적 막대
    if (!l.burned && cool > 0.02) { trackBar(280, 112, 100, 10, cool, '#ef4444'); T(330, 140, '과열 ' + Math.round(cool * 100) + ' %', 11.5, '#b91c1c', 'center', 800); }
    // 전압 나눔 막대
    D.shadow(() => { D.roundRect(10, 204, 452, 190, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    T(20, 226, '전지 5.0 V 가 나뉘는 모습 (눈금 5.0 V)', 13, COL_BLUE, 'left', 800);
    const bx = 20, bw = 432, vR = I > 0 ? I * l.R : 0, vL = I > 0 ? VLED : (fl ? 5.0 : 0);
    D.roundRect(bx, 236, bw, 24, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
    ctx.save(); D.roundRect(bx, 236, bw, 24, 8); ctx.clip();
    if (I > 0) { ctx.fillStyle = '#64748b'; ctx.fillRect(bx, 236, vR / 5 * bw, 24); ctx.fillStyle = '#ef4444'; ctx.fillRect(bx + vR / 5 * bw, 236, vL / 5 * bw, 24); }
    else if (fl) { ctx.fillStyle = '#ef4444'; ctx.fillRect(bx, 236, bw, 24); }
    ctx.restore();
    if (I > 0) { T(bx + vR / 10 * bw, 253, '저항 ' + vR.toFixed(1) + ' V', 12, '#fff', 'center', 800); T(bx + vR / 5 * bw + vL / 10 * bw, 253, 'LED ' + vL.toFixed(1) + ' V', 12, '#fff', 'center', 800); }
    else if (fl) T(bx + bw / 2, 253, 'LED 가 5.0 V 를 모두 떠맡아요', 12, '#fff', 'center', 800);
    // 전류 눈금
    T(20, 290, '전류 I = (5.0 − 2.0) / R = ' + (l.burned ? '끊어짐' : fl ? '0 mA (역방향)' : (3 / l.R * 1000).toFixed(1) + ' mA'), 13, '#26324a', 'left', 800);
    const gx = 28, gw = 416, gy = 312, MAXI = 0.08;
    D.roundRect(gx, gy, gw, 18, 9); ctx.fillStyle = '#eef1f7'; ctx.fill();
    ctx.save(); D.roundRect(gx, gy, gw, 18, 9); ctx.clip();
    ctx.fillStyle = 'rgba(34,197,94,.45)'; ctx.fillRect(gx, gy, ILED / MAXI * gw, 18); ctx.fillStyle = 'rgba(250,204,21,.5)'; ctx.fillRect(gx + ILED / MAXI * gw, gy, (IMAXLED - ILED) / MAXI * gw, 18); ctx.fillStyle = 'rgba(239,68,68,.45)'; ctx.fillRect(gx + IMAXLED / MAXI * gw, gy, (MAXI - IMAXLED) / MAXI * gw, 18);
    ctx.restore();
    [[0, '0'], [0.02, '20 mA (정격)'], [0.04, '40 mA'], [0.08, '80 mA']].forEach((m) => { const X = gx + m[0] / MAXI * gw; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(X, gy + 18); ctx.lineTo(X, gy + 24); ctx.stroke(); T(clamp(X, gx + 20, gx + gw - 20), gy + 38, m[1], 11.5, '#516079', 'center', 700); });
    const nx = gx + clamp(I, 0, MAXI) / MAXI * gw;
    if (I > 0) { ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.moveTo(nx, gy - 2); ctx.lineTo(nx - 7, gy - 12); ctx.lineTo(nx + 7, gy - 12); ctx.closePath(); ctx.fill(); if (I > MAXI) T(gx + gw - 4, gy - 16, '▶ 눈금 밖', 11.5, '#b91c1c', 'right', 800); }
    const state = l.burned ? '타 버렸어요' : fl ? '꺼짐 (역방향)' : I > IMAXLED ? '과전류! 곧 타요' : I > ILED * 1.1 ? '정격 초과 (수명 단축)' : I >= ILED * 0.9 ? '정상 밝기 (정격 전류)' : '어두워요';
    lbl(CXs, 372, 'LED 상태: ' + state, { size: 13, bg: l.burned || I > IMAXLED ? '#dc2626' : fl ? '#64748b' : Math.abs(I - ILED) <= 0.002 ? '#16a34a' : '#f59e0b', pad: 10, minX: 0, maxX: SC.w });
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const sx = STP.x + 12;
    T(sx, STP.y + 22, 'LED 는 순방향일 때만 켜져요. 순방향 전압은 약 2.0 V 로 거의 일정해요.', PHONE ? 11.5 : 12.5, COL_BLUE, 'left', 800);
    T(sx, STP.y + 46, '그래서 남는 전압 3.0 V 를 저항이 맡아야 전류가 정해져요.', PHONE ? 11.5 : 12.5, '#26324a', 'left', 800);
    T(sx, STP.y + 68, 'R = (V − V_LED) / I = (5.0 − 2.0) / 0.020 = 150 Ω', PHONE ? 12 : 13, '#9a3412', 'left', 800);
    infoPanel([
      { h: '발광 다이오드 (LED)' },
      { p: 'LED 도 다이오드라서 순방향에서만 전류가 흘러 빛을 내요. 순방향 전압은 적색 LED 약 2.0 V.', c: COL_BLUE },
      { tbl: [['정격 전류', '20 mA', ''], ['보호 저항', '150 Ω', ''], ['저항이 너무 작으면', '전류 급증 → 소손', '', '#b91c1c']], c1: 0.42 },
      { p: '순방향 전류는 전압에 아주 민감해서, 전압이 조금만 높아져도 전류가 크게 늘어요. 그래서 저항을 직렬로 달아 전류를 정해요.', c: '#9a3412' },
      { p: '🏭 LED 조명·전광판·리모컨·표시등. 같은 불빛에 전기를 훨씬 덜 써요.', c: '#0b7a41', big: 1 },
    ]);
  }
  // 입력 스위치 위치 (장면 좌표)
  const SWY = { A: 84, B: 164 };
  const swRect = (k) => ({ x: 8, y: SWY[k] - 20, w: 62, h: 40 });
  function drawGateScene() {
    const l = S.l, kind = l.sub, or = kind === 'or'; sceneBegin();
    const Y = gateY(kind, l.A, l.B), hi = isHigh(Y);
    // 도선
    const w = new Path2D();
    w.moveTo(76, SWY.A); w.lineTo(240, SWY.A); w.moveTo(76, SWY.B); w.lineTo(240, SWY.B); w.moveTo(240, SWY.A); w.lineTo(240, SWY.B); w.moveTo(240, 124); w.lineTo(334, 124);
    if (or) { w.moveTo(290, 124); w.lineTo(290, 140); w.moveTo(290, 188); w.lineTo(290, 194); } else { w.moveTo(290, 124); w.lineTo(290, 108); w.moveTo(290, 60); w.lineTo(290, 46); }
    wireStroke(w, 2.8, 0);
    // 전류 점
    const hiIn = (k) => (k === 'A' ? l.A : l.B);
    if (or) {
      ['A', 'B'].forEach((k) => { if (hiIn(k) && Y > 0) { const cnt = (l.A ? 1 : 0) + (l.B ? 1 : 0); pathDots([[76, SWY[k]], [240, SWY[k]], [240, 124], [290, 124], [290, 194]], l.ph2 || 0, 22, 2.8, '#f59e0b', 1 / cnt * 0.5 + 0.5); } });
    } else {
      ['A', 'B'].forEach((k) => { if (!hiIn(k)) { pathDots([[290, 46], [290, 124], [240, 124], [240, SWY[k]], [76, SWY[k]]], l.ph2 || 0, 22, 2.8, '#f59e0b'); } });
    }
    // 소자
    if (or) { zig(290, 140, 290, 188, 5, 9, '#475569', 3.4); T(306, 168, '1 kΩ', 12, '#334155', 'left', 800); gndSym(290, 198); }
    else { zig(290, 60, 290, 108, 5, 9, '#475569', 3.4); T(306, 88, '1 kΩ', 12, '#334155', 'left', 800); T(290, 38, '+5 V', 13, '#dc2626', 'center', 800); }
    ['A', 'B'].forEach((k) => {
      const y = SWY[k], high = hiIn(k), conducting = or ? (high && Y > 0) : !high;
      diodeSym(150, y, or ? 0 : Math.PI, 34, conducting ? 'on' : 'idle', 1);
      T(150, y - 20, 'D' + (k === 'A' ? '₁' : '₂'), 12.5, conducting ? '#15803d' : '#475569', 'center', 800);
      if (conducting) T(150, y + 28, '0.7 V 강하', 11.5, '#15803d', 'center', 800); else T(150, y + 28, '전류 없음', 11.5, '#64748b', 'center', 700);
      // 스위치 상자
      const r = swRect(k);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = high ? '#fee2e2' : '#dbeafe'; ctx.fill(); }, { blur: 5, y: 2 });
      D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.strokeStyle = high ? '#dc2626' : '#2563eb'; ctx.lineWidth = 2.2; ctx.stroke();
      T(r.x + 14, r.y + 25, k, 17, '#1e293b', 'center', 800);
      T(r.x + 44, r.y + 17, high ? '5.0 V' : '0 V', 11.5, high ? '#b91c1c' : '#1d4ed8', 'center', 800); T(r.x + 44, r.y + 33, high ? 'HIGH' : 'LOW', 11.5, high ? '#b91c1c' : '#1d4ed8', 'center', 800);
      dot(76, y, 3.6, '#334155');
    });
    dot(240, 124, 3.8, '#334155'); dot(290, 124, 3.8, '#334155');
    // 출력
    meterV(350, 124, '', '#0d9488'); gndSym(350, 160);
    ctx.strokeStyle = '#0d9488'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(350, 139); ctx.lineTo(350, 152); ctx.stroke();
    const bxx = 384; D.shadow(() => { D.roundRect(bxx, 92, 80, 64, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
    drawBulb(bxx + 40, 118, 11, hi ? 1 : 0);
    T(bxx + 40, 150, 'Y = ' + Y.toFixed(1) + ' V', 12.5, hi ? '#15803d' : '#475569', 'center', 800);
    T(bxx + 40, 86, 'Y: ' + (hi ? 'HIGH' : 'LOW'), 12.5, hi ? '#15803d' : '#475569', 'center', 800);
    // 진리표 (관찰한 값만 기록)
    D.shadow(() => { D.roundRect(10, 210, 452, 184, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    T(20, 230, (or ? 'OR' : 'AND') + ' 게이트: 입력을 바꿔 가며 Y 를 기록해요 (관찰한 줄만 채워져요)', 12, COL_BLUE, 'left', 800);
    const tb = l.tb[kind] || {}, rows = [[0, 0], [0, 1], [1, 0], [1, 1]];
    T(60, 252, 'A', 12.5, '#516079', 'center', 800); T(120, 252, 'B', 12.5, '#516079', 'center', 800); T(260, 252, '출력 Y', 12.5, '#516079', 'center', 800);
    rows.forEach((r, i) => {
      const y = 262 + i * 28, cur = r[0] === l.A && r[1] === l.B, val = tb[i];
      D.roundRect(30, y, 300, 24, 8); ctx.fillStyle = cur ? '#fff2e5' : '#f3f6fb'; ctx.fill(); ctx.strokeStyle = cur ? '#f26b3a' : '#dbe3f0'; ctx.lineWidth = cur ? 2 : 1.2; ctx.stroke();
      T(60, y + 17, String(r[0]), 14, r[0] ? '#b91c1c' : '#1d4ed8', 'center', 800); T(120, y + 17, String(r[1]), 14, r[1] ? '#b91c1c' : '#1d4ed8', 'center', 800);
      T(196, y + 17, '→', 14, '#64748b', 'center', 800);
      if (val == null) T(260, y + 17, '?', 14, '#94a3b8', 'center', 800); else T(260, y + 17, (isHigh(val) ? '1' : '0') + '  (' + val.toFixed(1) + ' V)', 13, isHigh(val) ? '#15803d' : '#475569', 'center', 800);
    });
    T(350, 280, or ? '하나라도 HIGH 이면' : '둘 다 HIGH 일 때만', 12, '#9a3412', 'left', 800); T(350, 298, or ? 'Y = HIGH' : 'Y = HIGH', 12, '#9a3412', 'left', 800);
    T(20, 388, '0 = LOW (0 V 근처)   1 = HIGH (2.5 V 이상)', 11.5, '#516079', 'left', 700);
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const sx = STP.x + 12;
    T(sx, STP.y + 22, or ? 'OR: 음극을 한 점 Y 에 묶었어요. 더 높은 입력이 다이오드를 켜서 Y 를 올려요.' : 'AND: 양극을 한 점 Y 에 묶고 +5 V 로 당겨 놨어요. LOW 입력이 Y 를 끌어내려요.', PHONE ? 11 : 12.5, COL_BLUE, 'left', 800);
    T(sx, STP.y + 46, or ? 'HIGH 입력: Y = 5.0 − 0.7 = 4.3 V (다이오드 강하만큼 낮아져요)' : 'LOW 입력이 있으면 Y = 0 + 0.7 = 0.7 V (LOW), 둘 다 HIGH 면 Y = 5.0 V', PHONE ? 11 : 12.5, '#26324a', 'left', 800);
    T(sx, STP.y + 68, '입력 A = ' + (l.A ? 'HIGH' : 'LOW') + ' · B = ' + (l.B ? 'HIGH' : 'LOW') + ' → Y = ' + Y.toFixed(1) + ' V (' + (hi ? 'HIGH' : 'LOW') + ')', PHONE ? 11.5 : 13, '#0b7a41', 'left', 800);
    infoPanel([
      { h: or ? '다이오드 OR 게이트' : '다이오드 AND 게이트' },
      { p: or ? '두 다이오드의 음극을 한 점에 묶으면 A, B 중 하나라도 HIGH(5 V)일 때 출력이 HIGH(약 4.3 V)가 돼요.' : '두 다이오드의 양극을 한 점에 묶고 풀업 저항을 달면 A, B 가 모두 HIGH 일 때만 출력이 HIGH 가 돼요.', c: COL_BLUE },
      { tbl: or ? [['A  B', 'Y', ''], ['0  0', 'LOW', ''], ['하나라도 1', 'HIGH', '']] : [['A  B', 'Y', ''], ['하나라도 0', 'LOW', ''], ['1  1', 'HIGH', '']], c1: 0.55 },
      { p: or ? '출력 HIGH 는 입력보다 0.7 V 낮아요(5.0 − 0.7 = 4.3 V). 이런 전압 손실 때문에 컴퓨터 칩은 트랜지스터로 게이트를 만들어요.' : '입력이 LOW 여도 출력은 0 V 가 아니라 0.7 V 예요(다이오드 강하). 이런 손실 때문에 컴퓨터 칩은 트랜지스터로 게이트를 만들어요.', c: '#9a3412' },
      { p: '🏭 컴퓨터·스마트폰의 논리회로가 이렇게 0 과 1 을 처리해요.', c: '#0b7a41', big: 1 },
    ]);
  }
  function drawLed() { if (S.l.sub === 'led') drawLedScene(); else drawGateScene(); }
  function setSub(s) { S.l.sub = s; if (s !== 'led') recordGate(); updateCtl(); }
  $$('#subSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSub(b.dataset.v); }));
  $$('#rLSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.l.R = +b.dataset.v; updateCtl(); }));
  $('#bFlipL').addEventListener('click', () => { Sound.click(); S.l.flip = !S.l.flip; updateCtl(); });
  $('#bRepl').addEventListener('click', () => { const l = S.l; if (!l.burned) return; Sound.click(); l.burned = false; l.burn = 0; l.replN++; l.grace = 1.6; updateCtl(); });
  function toggleIn(k) { const l = S.l; if (k === 'A') l.A = l.A ? 0 : 1; else l.B = l.B ? 0 : 1; Sound.click(); recordGate(); updateCtl(); }
  $('#bInA').addEventListener('click', () => toggleIn('A'));
  $('#bInB').addEventListener('click', () => toggleIn('B'));
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'led' || S.l.sub === 'led') return false;
      const q = lp(p); ['A', 'B'].forEach((k) => { const r = swRect(k); if (q.x >= r.x - 4 && q.x <= r.x + r.w + 4 && q.y >= r.y - 4 && q.y <= r.y + r.h + 4) toggleIn(k); });
      return false;
    },
    move() {}, up() {},
    hover(p) { if (S.mode !== 'led' || S.l.sub === 'led') return 'default'; const q = lp(p); for (const k of ['A', 'B']) { const r = swRect(k); if (q.x >= r.x && q.x <= r.x + r.w && q.y >= r.y && q.y <= r.y + r.h) return 'pointer'; } return 'default'; },
  });

  /* ---------- 화면 전환 · 조작 상태 ---------- */
  const subKey = () => (S.mode === 'led' ? S.l.sub : S.mode === 'bridge' ? S.b.type : '');
  function setScene(mode) {
    if (S.mode !== mode) S.fade = 1;
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode];
    if (mode === 'led' && S.l.sub !== 'led') recordGate();
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      if (on && n.hasAttribute('data-sub')) on = n.getAttribute('data-sub').split(' ').indexOf(subKey()) >= 0;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#cirSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.p.cir));
    $('#bFlip').textContent = S.p.flip ? '🔄 전지 바로 놓기' : '🔄 전지 뒤집기';
    $$('#rectSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.b.type));
    $$('#formSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.w.form));
    setRange('sC', S.w.ci, 0, 6, (v) => CVALS[v] + ' μF');
    setRange('sI', Math.round(S.w.I * 100), 5, 50, (v) => (v / 100).toFixed(2) + ' A');
    $$('#subSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.l.sub));
    $$('#rLSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.l.R));
    $('#bFlipL').textContent = S.l.flip ? '🔄 전원 바로 놓기' : '🔄 전원 뒤집기';
    $('#bRepl').disabled = !S.l.burned; $('#bRepl').classList.toggle('btn-primary', S.l.burned);
    $('#bInA').textContent = 'A: ' + (S.l.A ? 'HIGH (5 V)' : 'LOW (0 V)'); $('#bInB').textContent = 'B: ' + (S.l.B ? 'HIGH (5 V)' : 'LOW (0 V)');
    $('#bInA').classList.toggle('btn-primary', !!S.l.A); $('#bInB').classList.toggle('btn-primary', !!S.l.B);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  function readouts() {
    let a, b, c; const m = S.mode;
    if (m === 'path') {
      const p = S.p, pz = pzOn(), ev = pz ? cirEval(PUZ[0], 1) : cirEval(p.cir, p.flip ? -1 : 1);
      if (pz) { a = ['전류 I', '—']; b = ['다이오드 전압', '—']; c = ['켜진 전구', game && game.phase !== 'active' ? '공개' : '예측 중']; }
      else {
        a = ['전류 I', fmA(ev.I)];
        b = p.cir === 0 ? ['다이오드 양단', ev.on ? '0.7 V (통과)' : '5.0 V (차단)'] : ['다이오드 강하 합', (ev.on ? (ev.nd * VD).toFixed(1) : '0') + ' V'];
        c = ['켜진 전구', ev.bulbs.filter((x) => x).length + ' / ' + ev.bulbs.length + ' 개'];
      }
    } else if (m === 'bridge') {
      const k = S.b, mk = bMask(), sm = bridgeSamples(), sol = k.sol || { vout: 0 };
      a = ['입력 최대 (12√2)', fV1(VPK)];
      b = ['출력 최대', mk ? '?' : fV1(Math.max(sm.max, 0))];
      c = ['출력 주파수', k.type === 'half' ? '50 Hz' : (fullOK() ? '100 Hz' : '배선 확인')];
    } else if (m === 'supply') {
      const w = S.w, r = w.rip || { rip: 0, mean: 0 };
      a = ['출력 평균', fR(r.mean)]; b = ['리플 ΔV (측정)', fR(r.rip)]; c = ['정류 주파수 f', supF() + ' Hz'];
    } else {
      const l = S.l;
      if (l.sub === 'led') { a = ['보호 저항 R', l.R + ' Ω']; b = ['전류 I', l.burned ? '끊어짐' : l.flip ? '0 mA' : (3000 / l.R).toFixed(1) + ' mA']; c = ['LED', l.burned ? '타 버림' : l.flip ? '꺼짐 (역방향)' : (3 / l.R > IMAXLED ? '과전류' : '켜짐')]; }
      else { const Y = gateY(l.sub, l.A, l.B); a = ['입력 A · B', (l.A ? 'HIGH' : 'LOW') + ' · ' + (l.B ? 'HIGH' : 'LOW')]; b = ['출력 Y 전압', Y.toFixed(1) + ' V']; c = ['출력 Y', isHigh(Y) ? 'HIGH (1)' : 'LOW (0)']; }
    }
    [[l1, v1, a], [l2, v2, b], [l3, v3, c]].forEach((z) => { if (z[0].textContent !== z[2][0]) z[0].textContent = z[2][0]; if (z[1].textContent !== z[2][1]) z[1].textContent = z[2][1]; });
  }

  /* ---------- 입력 도구 ---------- */
  const numB = makePlain($('#numBHost'), '입력 최대 17 V 에서 브리지 정류의 출력 최대 전압 V_max', 'V_max =', 'V');
  const numR = makePlain($('#numSHost'), 'C = 1000 μF, I = 0.10 A, 전파 정류(f = 100 Hz)일 때 리플 ΔV ≈ I / (f C)', 'ΔV ≈', 'V');
  const selPR = [
    ['㉮ 같은 방향 다이오드 2개 + 전구: 전구는?', ['켜져요 (전류가 흘러요)', '안 켜져요'], 0],
    ['㉯ 반대 방향 다이오드 2개를 병렬로 + 전구: 전구는?', ['켜져요 (전류가 흘러요)', '안 켜져요'], 0],
    ['㉰ 전구 2개, 다이오드 방향이 서로 반대: 켜지는 전구는?', ['위쪽 전구 ①만', '아래쪽 전구 ②만', '둘 다', '둘 다 안 켜져요'], 0],
  ];
  const selSR = [['부하 전류 I 가 커지면 리플이 커지는 까닭은?', ['방전하는 동안 축전기에서 전하가 더 빨리 빠져나가 전압이 더 많이 내려가기 때문이에요', '정류기가 더 많은 전압을 만들기 때문이에요', '전류가 크면 교류의 주파수가 바뀌기 때문이에요'], 0]];
  const selLR = [
    ['LED에 저항을 꼭 직렬로 연결해야 하는 까닭은?', ['순방향 전류가 전압에 아주 민감해서 저항이 없으면 전류가 급증해 LED가 타기 때문이에요', 'LED는 저항이 있어야만 빛을 낼 수 있기 때문이에요', '저항이 LED의 순방향 전압을 5 V로 높여 주기 때문이에요'], 0],
    ['휴대폰 충전기에 변압기·정류기·평활이 모두 필요한 까닭은?', ['220 V 교류를 낮추고(변압), 한 방향으로 바꾸고(정류), 출렁임을 줄여야(평활) 안정된 직류 5 V 가 되기 때문이에요', '정류만 있으면 전압이 올라가 배터리가 더 빨리 충전되기 때문이에요', '평활은 교류의 주파수를 두 배로 만들기 위해서예요'], 0],
  ];
  const selP = { st: {}, ok: {} }, selS = { st: {}, ok: {} }, selL = { st: {}, ok: {} };
  const selPs = makeSelects($('#selPHost'), selPR, selP.st, selP.ok);
  const selSs = makeSelects($('#numSHost'), selSR, selS.st, selS.ok);
  const selLs = makeSelects($('#selLHost'), selLR, selL.st, selL.ok);
  // 진리표 입력 표
  const TT = { or: [], and: [], ok: {} };
  const TRUTH = { or: [0, 1, 1, 1], and: [0, 0, 0, 1] };
  (function buildTruth() {
    const host = $('#tblHost');
    host.innerHTML = '<div class="tt-title">A, B 입력에 따른 출력 Y 를 채워 주세요 (LOW = 0, HIGH = 1)</div>';
    const tbl = document.createElement('table'); tbl.className = 'tt';
    tbl.innerHTML = '<thead><tr><th>A</th><th>B</th><th>OR 의 Y</th><th>AND 의 Y</th></tr></thead>';
    const tb = document.createElement('tbody');
    [[0, 0], [0, 1], [1, 0], [1, 1]].forEach((r, i) => {
      const tr = document.createElement('tr'); tr.innerHTML = '<td>' + r[0] + '</td><td>' + r[1] + '</td>';
      ['or', 'and'].forEach((k) => {
        const td = document.createElement('td'), sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', k.toUpperCase() + ' A=' + r[0] + ' B=' + r[1] + ' 출력');
        sel.innerHTML = '<option value="">—</option><option value="0">0 (LOW)</option><option value="1">1 (HIGH)</option>';
        sel.addEventListener('change', () => { TT[k][i] = sel.value; sel.classList.remove('ok', 'bad'); delete TT.ok[k + i]; Sound.click(); });
        td.appendChild(sel); tr.appendChild(td); TT[k + 'Sel'] = TT[k + 'Sel'] || []; TT[k + 'Sel'][i] = sel;
      });
      tb.appendChild(tr);
    });
    tbl.appendChild(tb); host.appendChild(tbl);
  })();
  function truthReset() { ['or', 'and'].forEach((k) => { TT[k] = []; TT[k + 'Sel'].forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }); TT.ok = {}; }
  function truthCheck() {
    let miss = 0, bad = 0;
    ['or', 'and'].forEach((k) => TRUTH[k].forEach((v, i) => { if (TT[k][i] == null || TT[k][i] === '') miss++; }));
    if (miss) return '아직 고르지 않은 칸이 ' + miss + '개 있어요.';
    ['or', 'and'].forEach((k) => TRUTH[k].forEach((v, i) => {
      const ok = +TT[k][i] === v, s = TT[k + 'Sel'][i], key = k + i;
      if (!ok) bad++;
      if (TT.ok[key] !== ok) { TT.ok[key] = ok; s.classList.remove('ok', 'bad'); if (ok) s.classList.add('ok'); else { void s.offsetWidth; s.classList.add('bad'); } }
    }));
    return bad ? '빨간 칸을 다시 확인해 봐요. OR 는 하나라도 HIGH 면 HIGH, AND 는 둘 다 HIGH 일 때만 HIGH 예요. 💡 화면에서 입력을 바꿔 확인해 보세요.' : true;
  }
  const truthN = () => ['or', 'and'].reduce((n, k) => n + TRUTH[k].filter((v, i) => TT[k][i] != null && TT[k][i] !== '').length, 0);
  const tbSeen = () => ['or', 'and'].reduce((n, k) => n + Object.keys(S.l.tb[k] || {}).length, 0);

  /* ================= 미션 ================= */
  const MS = {};
  const levels = [
    {
      title: '전류의 길: 한 방향 통로', short: '전류의 길', icon: '🔺', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 콘센트의 교류로 어떻게 건전지처럼 한 방향으로만 흐르는 전기를 만들까?</p>' +
        '<div class="si-link">🔗 <b>물리학 「p-n 접합과 다이오드」</b>에서 다이오드가 한 방향으로만 전류를 흘린다는 것을 배웠어요. 이 차시에서는 원리가 아니라 다이오드를 <b>회로 부품</b>으로 쓰는 방법을 분석해요.</div>' +
        '<p>먼저 다이오드가 있는 회로에서 <b>전류가 흐르는 길</b>을 따라가 봐요. 다이오드를 “한 방향으로만 전류를 흘리는 소자”로 보고, 순방향이면 약 <b>0.7 V</b>가 줄어들면서 통과하고, 역방향이면 막힌다고 생각해요.</p>',
      features: ['path'],
      setup() { S.gate = ''; S.p.pz = false; S.p.cir = 0; S.p.flip = true; setScene('path'); },
      recap: '다이오드는 순방향이면 약 0.7 V 를 쓰고 전류를 흘리고, 역방향이면 막아요. 직렬은 하나라도 막히면 끊기고, 병렬은 한 가닥만 열려도 흘러요.',
      summary: '<ul><li><b>다이오드</b>: 한 방향(삼각형이 향하는 쪽)으로만 전류를 흘리는 소자. 순방향이면 <b>약 0.7 V</b>의 전압 강하로 도통, 역방향이면 <b>차단</b>(전류 0).</li><li>5.0 V 전지 + 다이오드 + 전구(43 Ω): 순방향 I = (5.0 − 0.7) / 43 = 0.10 A. 역방향이면 5.0 V 가 모두 다이오드에 걸려요.</li><li>직렬로 이어진 다이오드는 하나라도 역방향이면 전류가 흐르지 않아요(서로 반대 방향 2개 → 전류 0). 병렬 가닥은 한 가닥이라도 열려 있으면 전류가 흘러요.</li><li>쓰임: 역전압 보호(전지를 거꾸로 꽂았을 때), 신호 검출, 코일 스위칭 서지 흡수.</li></ul>',
      missions: [
        {
          title: '전구가 켜지는 방향 만들기',
          goal: '전지의 방향을 바꿔 전구를 켜 보세요. 켜졌을 때 전압계가 다이오드 양단에서 몇 V 를 가리키는지 읽어요.',
          hint: '전지의 + 극에서 나온 전류가 삼각형이 향하는 쪽으로 지나가야 해요. 🔄 전지 뒤집기를 눌러 보세요.',
          setup() { S.gate = ''; S.p.pz = false; S.p.cir = 0; S.p.flip = true; setScene('path'); },
          check: () => S.p.cir === 0 && !S.p.flip && S.p.br[0] > 0.9, hold: 0.8,
          status: () => mark(S.p.cir === 0 && !S.p.flip) + ' 순방향 연결 &nbsp; ' + mark(S.p.br[0] > 0.9) + ' 전구 켜짐 (다이오드 양단 0.7 V)',
          explain: '전지의 + 극에서 나온 전류가 다이오드의 삼각형 방향으로 지나가면 <b>순방향</b>이에요. 이때 다이오드 양단 전압은 약 <b>0.7 V</b>이고, 전구에는 5.0 − 0.7 = 4.3 V 가 걸려 I = 4.3 / 43 = 0.10 A 가 흘러요. 거꾸로 연결하면 다이오드가 5.0 V 를 모두 떠맡고 전류는 0 이에요.',
        },
        {
          title: '켜질 전구 예측하기', manual: true,
          goal: '세 회로(㉮ ㉯ ㉰)에서 어느 전구가 켜질지 예측해 고른 뒤 <b>✔ 확인하기</b>를 눌러요. (전지의 + 극은 왼쪽 위예요)',
          hint: '각 가닥이 “다이오드 방향이 모두 순방향”이어야 전류가 흘러요. 직렬은 모두 순방향이어야 하고, 병렬은 한 가닥만 순방향이어도 돼요.',
          setup() { resetSels(selPs, selP.st, selP.ok); S.gate = 'mp2'; S.p.pz = true; S.p.rv = 0; setScene('path'); },
          check: () => checkSel(selPR, selP.st, selP.ok, selPs, '빨간 칸을 다시 생각해 봐요. 삼각형이 전류 방향(왼쪽 → 오른쪽)을 향하는 가닥만 전류가 흘러요.'),
          status: () => '고른 문제 ' + selPR.filter((r, i) => selP.st[i]).length + ' / 3',
          explain: '㉮ 같은 방향으로 이어진 두 다이오드는 모두 순방향이라 전류가 흘러요(강하 0.7 V × 2 = 1.4 V). ㉯ 병렬로 맞서 있는 두 다이오드 중 하나는 순방향이라 전류가 그쪽으로 흘러요. ㉰ 위쪽 가닥만 순방향이라 <b>전구 ①만</b> 켜져요. 직렬은 모두 열려야, 병렬은 한 가닥만 열려도 되는 거예요.',
        },
        {
          type: 'quiz', title: '반대 방향으로 이어 붙이면?',
          goal: '다이오드 두 개를 <b>서로 반대 방향</b>으로 직렬로 연결하면 전류는 어떻게 될까요?',
          setup() { S.gate = ''; S.p.pz = false; S.p.cir = 2; S.p.flip = false; setScene('path'); },
          choices: ['흐르지 않아요 — 둘 중 하나는 반드시 역방향이라 막혀요', '두 다이오드를 모두 통과해 더 센 전류가 흘러요', '전류가 절반만 흘러요', '전지 방향을 바꾸면 흘러요'],
          answer: 0,
          feedback: ['', '직렬로 이어진 소자에는 같은 전류가 흘러야 하는데 한쪽이 막고 있어서 센 전류는 불가능해요.', '다이오드는 “절반만” 통과시키는 소자가 아니에요. 차단이면 전류 0 이에요.', '전지를 뒤집으면 막히는 다이오드가 서로 바뀔 뿐이에요. 화면 위의 🔄 전지 뒤집기를 눌러 확인해 보세요.'],
          explain: '서로 반대 방향인 두 다이오드는 전지를 어느 방향으로 달아도 <b>둘 중 하나가 역방향</b>이라 전류가 흐르지 않아요. 직렬은 하나라도 막히면 끊기는 것이죠.',
        },
      ],
    },
    {
      title: '브리지: 교류를 한 방향으로', short: '브리지', icon: '🔀', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 다이오드는 순방향이면 0.7 V 를 쓰며 통과하고 역방향이면 막혔어요. 교류는 전류의 방향이 계속 바뀌니, 다이오드로 한쪽 방향만 골라낼 수 있을까요?</div>' +
        '<p>변압기(<b>「변압기와 인덕터」</b>)가 만든 <b>12 V(실효값) 교류</b>를 정류해 봐요. 최댓값은 12√2 ≈ 17 V, 주파수 50 Hz 예요. <b>반파 정류</b>(다이오드 1개)와 <b>브리지 정류</b>(다이오드 4개)의 입력·출력을 오실로스코프로 비교해요. 브리지에서는 반주기마다 켜지는 다이오드 쌍을 따라가요.</p>',
      features: ['bridge'],
      setup() { S.gate = ''; S.b.type = 'half'; setScene('bridge'); },
      recap: '반파 정류는 양(+) 반쪽만 통과시켜요. 브리지는 반주기마다 켜지는 다이오드 쌍(D₁·D₃ ↔ D₂·D₄)이 바뀌어 부하 전류가 늘 같은 방향이고, 다이오드 2개를 지나 출력이 1.4 V 낮아요.',
      summary: '<ul><li>교류 12 V(실효) → 최댓값 12√2 ≈ <b>17 V</b>, 50 Hz(한 주기 20 ms).</li><li><b>반파 정류</b>: 다이오드 1개, 출력은 양(+) 반쪽만, 최대 17 − 0.7 = <b>16.3 V</b>, 주파수 50 Hz.</li><li><b>브리지(전파) 정류</b>: 다이오드 4개, 전류가 항상 다이오드 2개를 지나 출력 최대 17 − 1.4 = <b>15.6 V</b>, 주파수 <b>100 Hz</b>(간격 10 ms). 양(+)·음(−) 반주기 모두 부하 전류가 같은 방향.</li><li>양(+) 반주기에는 D₁·D₃, 음(−) 반주기에는 D₂·D₄ 가 켜져요. 다이오드를 4개 쓴다고 전압이 4배가 되는 것은 아니에요.</li></ul>',
      missions: [
        {
          title: '브리지 배선 완성하기',
          goal: '먼저 <b>반파 정류</b>의 출력을 2초 이상 관찰하고, <b>브리지</b>로 바꿔 다이오드 4개의 방향을 맞춰서 출력이 늘 같은 방향(전파 정류)이 되게 하세요.',
          hint: '🔀 브리지를 고르고 회로 그림의 다이오드(D₁~D₄)를 눌러 방향을 뒤집어요. D₁·D₂ 는 P(+) 쪽으로, D₃·D₄ 는 N(−) 쪽에서 오도록 삼각형이 향해야 해요.',
          setup() { S.gate = ''; S.b.type = 'half'; S.b.halfT = 0; S.b.touched = false; brReset(); setScene('bridge'); },
          check: () => S.b.halfT >= 2 && fullOK(), hold: 1.2,
          status: () => mark(S.b.halfT >= 2) + ' 반파 정류 관찰 &nbsp; ' + mark(fullOK()) + ' 브리지 전파 정류 (맞는 다이오드 ' + brOkN() + ' / 4)',
          explain: '정답 배선은 D₁: AC₁ → P, D₂: AC₂ → P, D₃: N → AC₂, D₄: N → AC₁ 이에요. 양(+) 반주기에는 D₁ → 부하 → D₃ 로, 음(−) 반주기에는 D₂ → 부하 → D₄ 로 전류가 흘러 부하에서는 늘 P → N 방향이에요. 방향이 하나라도 틀리면 어느 반주기에는 출력이 없거나, 전원이 부하를 거치지 않고 다이오드만 거쳐 돌아오는 <b>합선</b>이 생겨요(실제로는 퓨즈가 끊어져요).',
        },
        {
          title: '출력 최대 전압 계산하기', manual: true,
          goal: '입력의 최댓값은 12√2 ≈ 17 V 예요. 전류는 항상 다이오드 2개를 지나가요. 출력 최대 전압을 계산해 쓰고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '출력 최대 = 입력 최대 − (다이오드 하나의 강하 0.7 V) × (지나는 다이오드 수).',
          setup() { S.b.type = 'bridge'; S.b.orient = [1, 1, 1, 1]; S.b.flipN_ = [0, 0, 0, 0]; S.b.ang = [0, 0, 0, 0]; S.b.cacheKey = ''; numB.clear(); S.gate = 'mb2'; setScene('bridge'); },
          check: () => { const v = numB.val(); if (!isNaN(v) && Math.abs(v - 16.3) <= 0.1) { numB.mark(false); return '16.3 V 는 반파 정류의 값이에요. 브리지는 다이오드를 2개 지나요.'; } if (!isNaN(v) && Math.abs(v - 17) <= 0.1) { numB.mark(false); return '다이오드의 전압 강하(0.7 V)를 빼야 해요.'; } return checkNum(numB, 15.6, 0.01, '17 V − 0.7 V × 2 = ? 를 계산해 보세요.'); },
          status: () => '출력 최대 전압은 가려 두었어요 (입력 최대 17 V)',
          explain: 'V_max = 17 − 0.7 × 2 = <b>15.6 V</b>예요 (정확히는 16.97 − 1.4 ≈ 15.57 V). 반파 정류의 최대 16.3 V 보다 0.7 V 낮은데, 다이오드를 하나 더 지나기 때문이에요.',
        },
        {
          type: 'quiz', title: '부하 전류의 방향이 늘 같은 까닭',
          goal: '브리지 정류에서 입력의 방향이 바뀌어도 부하를 지나는 전류의 방향이 <b>늘 같은</b> 까닭은?',
          setup() { S.gate = ''; S.b.type = 'bridge'; brReset(); S.b.orient = [1, 1, 1, 1]; S.b.flipN_ = [0, 0, 0, 0]; S.b.ang = [0, 0, 0, 0]; S.b.cacheKey = ''; setScene('bridge'); },
          choices: ['반주기마다 켜지는 다이오드 쌍이 바뀌어 전류가 부하를 같은 방향으로 지나도록 길을 바꿔 주기 때문이에요', '다이오드 4개가 전압을 4배로 만들기 때문이에요', '교류의 방향이 사실은 바뀌지 않기 때문이에요', '다이오드가 전류를 저장했다가 한 방향으로만 내보내기 때문이에요'],
          answer: 0,
          feedback: ['', '다이오드는 전압을 높이지 못해요. 오히려 0.7 V × 2 만큼 낮아져요. 입력 17 V → 출력 15.6 V 였죠?', '입력 파형(파랑)은 양(+)과 음(−)을 오가요. 바뀌는 쪽은 켜지는 다이오드예요.', '저장하는 것은 축전기의 일이에요. 브리지 안의 다이오드는 길을 열고 닫기만 해요.'],
          explain: '양(+) 반주기에는 D₁·D₃, 음(−) 반주기에는 D₂·D₄ 가 켜져서 전류는 반주기마다 <b>다른 길</b>로 돌아 나오지만 부하는 늘 P → N 방향으로 지나요. 다이오드 4개를 쓴다고 전압이 4배가 되지는 않아요.',
        },
      ],
    },
    {
      title: '전원 장치: 변압 · 정류 · 평활', short: '전원 장치', icon: '🔌', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 브리지 정류로 한 방향의 전류를 얻었지만 출력은 100 Hz 로 출렁였어요. <b>「소자와 에너지」</b>에서 배운 축전기가 에너지를 모았다가 내놓는 것을 이용하면 출렁임을 줄일 수 있어요.</div>' +
        '<p>220 V 교류 → <b>변압기(220 : 12)</b> → <b>브리지</b> → <b>평활 축전기</b> → <b>부하</b>로 이어진 직류 전원 장치예요. C 와 부하 전류 I 를 바꿔 출력 전압의 출렁임(<b>리플 ΔV</b>)을 측정하고, ΔV ≈ I / (f C) 와 비교해 봐요.</p>',
      features: ['supply'],
      setup() { S.gate = ''; S.w.form = 'bridge'; S.w.ci = 3; S.w.I = 0.10; wSeed(); setScene('supply'); },
      recap: '평활 축전기는 정류된 전압이 낮아질 때 방전해 부하에 전류를 줘요. 리플 ΔV ≈ I / (f C): C 가 크고 I 가 작고 f 가 클수록(전파 정류) 작아져요.',
      summary: '<ul><li>전원 장치: 220 V 교류 → 변압(220 : 12) → 정류 → <b>평활(축전기)</b> → 직류 부하. 다이오드는 축전기를 충전하는 짧은 시간에만 켜져요.</li><li>축전기는 방전하는 동안 전압이 조금씩 내려가요. 이 출렁임이 <b>리플</b>: ΔV ≈ <b>I / (f C)</b>.</li><li>예) I = 0.10 A, C = 1000 μF, 전파 정류 f = 100 Hz: ΔV ≈ 0.10 / (100 × 1.0×10⁻³) = <b>1.0 V</b>. 반파(f = 50 Hz)이면 약 2배, C 를 10배로 하면 약 1/10, I 가 커지면 ΔV 도 커져요.</li><li>리플이 작을수록 안정한 직류예요. 휴대폰 충전기는 변압 → 정류 → 평활 → 5 V 로 만들어요.</li></ul>',
      missions: [
        {
          title: '리플 1 V 이하 만들기',
          goal: '부하 전류를 <b>0.20 A 이상</b>으로 둔 채, 전파 정류에서 리플 ΔV(측정)를 <b>1 V 이하</b>로 줄여 보세요.',
          hint: 'C 가 클수록 방전하는 동안 전압이 덜 내려가요. 부하 전류 0.20 A 이상에서는 C 를 2200 μF 이상으로 해야 해요.',
          setup() { S.gate = ''; S.w.form = 'bridge'; S.w.ci = 1; S.w.I = 0.30; wSeed(); setScene('supply'); },
          check: () => S.w.form === 'bridge' && S.w.I >= 0.2 - 1e-9 && S.w.rip && Math.round(S.w.rip.rip * 100) / 100 <= 1.0, hold: 1.0,
          status: () => mark(S.w.form === 'bridge') + ' 전파 정류 &nbsp; ' + mark(S.w.I >= 0.2 - 1e-9) + ' I ≥ 0.20 A (지금 ' + S.w.I.toFixed(2) + ' A) &nbsp; ' + mark(!!S.w.rip && Math.round(S.w.rip.rip * 100) / 100 <= 1.0) + ' ΔV ' + (S.w.rip ? fR(S.w.rip.rip) : '') + ' ≤ 1 V',
          explain: 'ΔV ≈ I / (f C) 이므로 I = 0.20 A, f = 100 Hz 에서 ΔV 를 1 V 이하로 하려면 C ≳ 0.20 / (100 × 1) = 2.0×10⁻³ F = 2000 μF 이상이 필요해요. 그래서 2200 μF 이상에서 조건을 만족해요. 부하가 무거울수록 큰 축전기가 필요해요.',
        },
        {
          title: '리플 계산과 부하의 영향', manual: true,
          goal: 'C = 1000 μF, I = 0.10 A, 전파 정류일 때 ΔV ≈ I / (f C) 를 계산해 쓰고, 부하 전류의 영향을 고른 뒤 <b>✔ 확인하기</b>를 눌러요.',
          hint: 'f = 100 Hz, C = 1000 μF = 1.0×10⁻³ F. ΔV = 0.10 / (100 × 1.0×10⁻³) 를 계산해 보세요.',
          setup() { S.w.form = 'bridge'; S.w.ci = 3; S.w.I = 0.10; wSeed(); numR.clear(); resetSels(selSs, selS.st, selS.ok); S.gate = 'ms2'; setScene('supply'); },
          check: () => { const a = checkNum(numR, 1.0, 0.06, 'ΔV ≈ I / (f C) = 0.10 / (100 × 1.0×10⁻³) 를 계산해 보세요.'); if (a !== true) return a; return checkSel(selSR, selS.st, selS.ok, selSs, '빨간 칸을 다시 생각해 봐요. 부하 전류가 크면 축전기에서 전하가 더 빨리 빠져나가요.'); },
          status: () => '계산값은 가려 두었어요 (측정 리플은 화면에 보여요: ' + (S.w.rip ? fR(S.w.rip.rip) : '') + ')',
          explain: 'ΔV ≈ I / (fC) = 0.10 / (100 × 1.0×10⁻³) = <b>1.0 V</b>예요. 화면의 측정값(약 0.89 V)이 조금 작은 까닭은 방전이 한 반주기 전체가 아니라 다음 충전이 시작될 때까지만 이어지기 때문이에요. 부하 전류가 커지면 방전 속도(I / C)가 커져서 리플이 커져요.',
        },
      ],
    },
    {
      title: 'LED와 다이오드 논리', short: 'LED·논리', icon: '💡', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 다이오드의 한 방향 성질로 교류를 직류로 바꾸는 전원 장치를 완성했어요. 같은 성질로 <b>빛을 내는 다이오드(LED)</b>와 <b>0 과 1 을 처리하는 논리 게이트</b>도 만들 수 있어요.</div>' +
        '<p>5.0 V 전원에 적색 LED(순방향 전압 약 2.0 V, 정격 20 mA)를 달 때 필요한 <b>보호 저항</b>을 구하고, 다이오드 두 개로 <b>OR · AND 게이트</b>를 만들어 입력(HIGH = 5 V, LOW = 0 V)에 따른 출력을 확인해 봐요.</p>',
      features: ['led'],
      setup() { S.gate = ''; S.l.sub = 'led'; setScene('led'); },
      recap: 'LED 는 순방향에서만 켜지고, 남는 전압을 맡는 보호 저항 R = (V − V_LED) / I 가 필요해요. 다이오드 OR 는 하나라도 HIGH 면, AND 는 둘 다 HIGH 일 때만 출력이 HIGH 예요.',
      summary: '<ul><li><b>LED</b>: 순방향(+ → −)일 때만 켜져요. 순방향 전압 약 2.0 V(적색), 정격 20 mA. 전류가 전압에 아주 민감하므로 <b>보호 저항</b>을 직렬로 달아요.</li><li>R = (V − V_LED) / I = (5.0 − 2.0) / 0.020 = <b>150 Ω</b>. R 이 너무 작으면(예: 15 Ω → 200 mA) 전류가 급증해 LED 가 타고, 너무 크면 어두워요.</li><li><b>다이오드 OR</b>: 음극을 묶음 → 하나라도 HIGH 면 출력 HIGH(5.0 − 0.7 = 4.3 V). <b>AND</b>: 양극을 묶고 풀업 저항 → 둘 다 HIGH 일 때만 HIGH(LOW 일 때 출력 0.7 V).</li><li>진리표 OR: 00→0, 01→1, 10→1, 11→1 / AND: 00→0, 01→0, 10→0, 11→1.</li><li>충전기는 변압(220 → 12 V) → 정류 → 평활이 모두 필요해요. 현대 문명 곳곳(충전기·LED 조명·컴퓨터 논리)에 반도체 소자가 쓰여요.</li></ul>',
      missions: [
        {
          title: 'LED 안전 점등',
          goal: '보호 저항을 <b>15 Ω</b>으로 해서 LED 가 어떻게 되는지 보고, 🔧 LED 를 새로 끼운 뒤 <b>정격 20 mA</b>로 안전하게 켜 보세요.',
          hint: 'R = (5.0 − 2.0) V / 0.020 A 를 계산해 보세요. 먼저 15 Ω 을 눌러 LED 가 타는 것을 본 다음 🔧 LED 새로 끼우기를 눌러요.',
          setup() { S.gate = ''; Object.assign(S.l, { sub: 'led', R: 330, flip: false, burn: 0, burned: false, burnSeen: false, br: 0 }); setScene('led'); },
          check: () => S.l.burnSeen && ledSafe(), hold: 1.0,
          status: () => mark(S.l.burnSeen) + ' 15 Ω 에서 소손 확인 &nbsp; ' + mark(ledSafe()) + ' 안전 점등 (지금 ' + (S.l.burned ? '타 버림' : S.l.flip ? '0 mA' : (3000 / S.l.R).toFixed(1) + ' mA') + ', 목표 20 mA)',
          explain: 'R = (V − V_LED) / I = (5.0 − 2.0) / 0.020 = <b>150 Ω</b>이에요. 15 Ω 이면 I = 3.0 / 15 = 200 mA 로 정격의 10배라서 LED 가 타 버려요. LED 는 순방향 전압이 거의 일정(약 2.0 V)해서, 전압이 조금만 달라져도 전류가 크게 변하기 때문에 저항으로 전류를 정해 줘요.',
        },
        {
          title: '진리표 완성하기', manual: true,
          goal: 'OR · AND 게이트의 입력 A, B 를 바꿔 보며 Y 를 확인해, 진리표의 8칸을 모두 채우고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '💡 화면 아래 표는 관찰한 줄만 채워져요. 4가지 입력을 모두 눌러 본 뒤에 표를 채우세요. OR: 하나라도 HIGH → HIGH. AND: 둘 다 HIGH 일 때만 HIGH.',
          setup() { S.l.sub = 'or'; S.l.A = 0; S.l.B = 0; S.l.tb = {}; truthReset(); S.gate = 'mL2'; setScene('led'); },
          check: () => { if (tbSeen() < 8) return '먼저 OR 와 AND 모두에서 입력 4가지를 눌러 Y 를 확인해 보세요. (지금 ' + tbSeen() + ' / 8줄)'; return truthCheck(); },
          status: () => mark(tbSeen() >= 8) + ' 입력 관찰 ' + tbSeen() + ' / 8 &nbsp; ' + mark(truthN() === 8) + ' 표 ' + truthN() + ' / 8칸',
          explain: 'OR: 00→0(LOW), 01→1, 10→1, 11→1 — 하나라도 HIGH(5 V)이면 그 입력의 다이오드가 켜져 Y = 5.0 − 0.7 = 4.3 V 가 돼요. AND: 00→0, 01→0, 10→0, 11→1 — LOW 입력이 있으면 그 다이오드가 켜져 Y = 0.7 V(LOW)로 끌려가고, 둘 다 HIGH 일 때만 풀업 저항이 Y 를 5.0 V 로 당겨요.',
        },
        {
          title: '반도체가 필요한 까닭', manual: true,
          goal: '두 질문에 답하고 <b>✔ 확인하기</b>를 눌러요.',
          hint: 'LED 는 순방향 전압이 거의 일정해서 전류가 전압에 아주 민감해요. 충전기는 교류 220 V 를 낮추고, 한 방향으로 바꾸고, 출렁임을 줄여야 해요.',
          setup() { S.l.sub = 'led'; S.l.R = 150; S.l.flip = false; S.l.burned = false; S.l.burn = 0; resetSels(selLs, selL.st, selL.ok); S.gate = 'mL3'; setScene('led'); },
          check: () => checkSel(selLR, selL.st, selL.ok, selLs, '빨간 칸을 다시 생각해 봐요. 앞 단계 화면(전압 나눔 막대와 전원 장치)을 떠올려 보세요.'),
          status: () => '고른 문제 ' + selLR.filter((r, i) => selL.st[i]).length + ' / 2',
          explain: 'LED 는 순방향 전류가 전압에 아주 민감해서 저항 없이 연결하면 전류가 급증해 타요. 휴대폰 충전기는 220 V 교류를 <b>변압</b>으로 낮추고, <b>정류</b>로 한 방향으로 바꾸고, <b>평활</b>로 출렁임을 줄여야 안정된 5 V 직류가 돼요. 다이오드 같은 반도체 소자가 이 모든 곳에서 일하고 있어요.',
        },
      ],
    },
  ];
  levels.forEach((lv) => lv.missions.forEach((m) => { MS[m.title] = m; }));

  game = SciSim.game({
    simId: 'hq-diode-circuit', mount: '#game', badge: '다이오드 분석가', homeHref: '../../index.html#hq',
    featureLabels: { path: '🔺 전류의 길 · 전압계', bridge: '🔀 정류 회로 · 오실로스코프', supply: '🔌 전원 장치 · 리플 측정', led: '💡 LED · 다이오드 논리' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  brReset(); wSeed(); updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && (game.free || game.phase === 'complete' || game.phase === 'intro')) { S.gate = ''; updateCtl(); }
    view.apply();
    if (S.mode === 'path') stepPath(dt); else if (S.mode === 'bridge') stepBridge(dt); else if (S.mode === 'supply') stepSupply(dt); else stepLed(dt);
    sceneBg();
    T(14, 26, TITLE[S.mode], PHONE ? 11.5 : 15.5, '#26324a', 'left', 800);
    if (S.mode === 'path') drawPath(); else if (S.mode === 'bridge') drawBridge(); else if (S.mode === 'supply') drawSupply(); else drawLed();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SC, STP, IN, MS, TT, numB, numR, selPs, selSs, selLs,
    get game() { return game; }, setScene, updateCtl, setSub, toggleIn, flipDiode, brReset, wSeed, ripple, bridgeSolve, halfSolve, cirEval, gateY, fullOK, ledI, ledSafe, CVALS, lp, bPos, swRect,
  };

})();
