/* =========================================================
   전자기와 양자 Ⅰ. 전자기적 상호작용 - 패러데이와 자기 브레이크 (단원 7차시)
   성취기준 [12전자01-05] 자기선속의 변화로 전자기 유도를 이해하고, 변압기, 인덕터 등 전자기 유도의 활용 기술을 설명할 수 있다.
   ① 관찰: 자기선속 Φ = BA cosθ (B · A · θ, 검류계)
   ② 실험: 유도 기전력 ε = NΔΦ/Δt (Φ–t 그래프의 기울기, 표 만들기)
   ③ 탐구: 렌츠 법칙 (자석·코일, 막대 도체 ε = BLv, F = BIL, 에너지 보존)
   ④ 탐구: 자기 브레이크 (도체판 진자, 와전류, 구리 파이프)
   변압기·인덕터는 다음 차시예요. 맥스웰 방정식, 유도 전기장의 선적분, 상호 인덕턴스 계산, 와전류 분포 계산은 다루지 않아요.
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

  const COL_PHI = '#7c3aed', COL_ORG = '#f97316', COL_TEAL = '#0d9488', COL_BLUE = '#1e40af', COL_RED = '#dc2626';
  const MODE_LABEL = { flux: '🧲 자기선속', emf: '⚡ 유도 기전력', lenz: '🔁 렌츠 법칙', brake: '🌪️ 자기 브레이크' };
  const TITLE = {
    flux: '🧲 Φ = BA cosθ — 코일을 지나는 자기력선의 수',
    emf: '⚡ ε = NΔΦ/Δt — 선속이 빨리 변할수록 기전력이 커요',
    lenz: '🔁 렌츠 법칙 — 유도 전류는 선속의 변화를 방해해요',
    brake: '🌪️ 자기 브레이크 — 와전류가 움직임을 막아요',
  };
  const CXs = SC.w / 2;
  const phiOf = (B, A, th) => B * A * Math.cos(th * DEG);
  const phiStr = (v) => (Math.round(v * 1e4) / 1e4 + 1e-12).toFixed(4);

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'flux', t: 0, fade: 0, gate: '',
    f: { B: 0.5, A: 0.02, th: 0, dB: 0.5, dA: 0.02, dth: 0, phiD: 0.01, rate: 0, gal: new SciSim.Spring(0, { stiffness: 150, damping: 15 }), phase: 0 },
    e: { N: 200, dp: 0.01, dt: 0.1, run: -1, done: false, ranKey: '', rec: {}, live: 0, ph: 0 },
    l: {
      view: 'mag', mx: 90, tx: 90, vx: 0, I: 0, flip: 1, drag: false, auto: null, seen: { ap: 0, le: 0 }, ph: 0, Fa: 0,
      rv: 2, rB: 0.5, push: false, bx: 0, rph: 0, rwait: 0, ready: false,
      fake: { on: false, x: 0, v: 1, done: false, t: 0 },
    },
    b: { view: 'pend', mat: 'cu', mag: 2, fast: false, phi: 0.5236, w: 0, t: 0, run: false, done: false, status: '', cross: 0, rec: {}, Q: 0, ph: 0, ph2: 0, vx: 0, pipe: { run: false, t: 0, fin: { f: 0, p: 0, c: 0 } } },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const curView = () => (S.mode === 'lenz' ? S.l.view : S.mode === 'brake' ? S.b.view : '');

  /* ================= ① 자기선속 ================= */
  const PHI = () => phiOf(S.f.B, S.f.A, S.f.th);
  const PHI_MAX = 0.03;
  function stepFlux(dt) {
    const f = S.f; if (dt <= 0) return;
    f.dB = SciSim.approach(f.dB, f.B, dt, 7); f.dA = SciSim.approach(f.dA, f.A, dt, 7); f.dth = SciSim.approach(f.dth, f.th, dt, 7);
    const phi = phiOf(f.dB, f.dA, f.dth);
    f.rate = SciSim.approach(f.rate, (phi - f.phiD) / dt, dt, 22); f.phiD = phi;
    f.gal.target = clamp(-f.rate / 0.04, -1, 1) * 60; f.gal.update(dt);
    f.phase += dt * 38;
  }
  function drawGalv(cx, cy, R, deg, title) {
    D.shadow(() => { D.roundRect(cx - R - 12, cy - R - 12, 2 * R + 24, R + 44, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 6; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI * 5 / 6, -Math.PI / 6); ctx.stroke();
    for (let k = -2; k <= 2; k++) {
      const a = -Math.PI / 2 + k * 30 * DEG; ctx.strokeStyle = k === 0 ? '#475569' : '#94a3b8'; ctx.lineWidth = k === 0 ? 2.4 : 1.6;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - 9), cy + Math.sin(a) * (R - 9)); ctx.lineTo(cx + Math.cos(a) * (R + 5), cy + Math.sin(a) * (R + 5)); ctx.stroke();
    }
    const a = -Math.PI / 2 + deg * DEG;
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4)); ctx.stroke();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fill();
    T(cx, cy + 24, title, 12.5, '#334155', 'center', 800);
    T(cx, cy + 40, Math.abs(deg) < 1.5 ? '전류 0' : '전류 흐름!', 12.5, Math.abs(deg) < 1.5 ? '#64748b' : '#b45309', 'center', 800);
  }
  function drawFlux() {
    const f = S.f; sceneBegin();
    D.roundRect(10, 40, SC.w - 20, SC.h - 52, 16); ctx.fillStyle = 'rgba(124,58,237,.05)'; ctx.fill();
    lbl(86, 26, '균일한 자기장 B → ' + f.B.toFixed(1) + ' T', { bg: COL_PHI, color: '#fff', size: 12.5, pad: 8, minX: 0, maxX: SC.w });
    // 자기력선 (간격 ∝ 1/B)
    const cx = 200, cy = 205, sp = 17.5 / Math.max(0.08, f.dB), th = f.dth * DEG;
    const a = 3000 * f.dA * 1 / 1.0;                                   // 코일 한 변의 절반 길이 (px) ∝ 면적
    const half = a * Math.cos(th);
    const lines = [];
    for (let k = -Math.ceil(170 / sp); k <= Math.ceil(170 / sp); k++) { const y = cy + k * sp; if (y > 50 && y < 352) lines.push(y); }
    ctx.lineCap = 'round';
    lines.forEach((y) => {
      const hot = Math.abs(y - cy) <= half;
      ctx.setLineDash(hot ? [] : [10, 9]); ctx.lineDashOffset = -f.phase;
      ctx.strokeStyle = hot ? 'rgba(249,115,22,.95)' : 'rgba(124,58,237,.38)'; ctx.lineWidth = hot ? 3 : 1.6;
      ctx.beginPath(); ctx.moveTo(22, y); ctx.lineTo(450, y); ctx.stroke();
    });
    ctx.setLineDash([]);
    lines.forEach((y, i) => { if (i % 2 === 0 || sp > 30) { const hot = Math.abs(y - cy) <= half; ctx.fillStyle = hot ? 'rgba(249,115,22,.95)' : 'rgba(124,58,237,.55)'; const xx = 440; ctx.beginPath(); ctx.moveTo(xx + 8, y); ctx.lineTo(xx - 3, y - 4.5); ctx.lineTo(xx - 3, y + 4.5); ctx.closePath(); ctx.fill(); } });
    // 코일 (옆에서 본 모습, 한 겹으로 단순화)
    const rot = Math.PI / 2 - th, nx = Math.cos(th), ny = -Math.sin(th);
    ctx.fillStyle = 'rgba(249,115,22,.10)'; ctx.beginPath(); ctx.ellipse(cx, cy, a, a * 0.22, rot, 0, TAU); ctx.fill();
    for (let k = -1; k <= 1; k++) {
      const p = new Path2D(); p.ellipse(cx + nx * k * 6, cy + ny * k * 6, a, a * 0.22, rot, 0, TAU); wireStroke(p, 3, 0);
    }
    // 법선 n, 각 θ
    D.arrow(cx, cy, cx + nx * 84, cy + ny * 84, { color: COL_TEAL, width: 3.5, head: 11 });
    T(cx + nx * 84 + 8, cy + ny * 84 - (th > 0.2 ? 4 : -16), 'n', 15, COL_TEAL, 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(30,41,59,.5)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 84, cy); ctx.stroke(); ctx.setLineDash([]);
    if (f.dth > 1.5) {
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 44, -th, 0); ctx.stroke();
      T(cx + 54 * Math.cos(th / 2) + 4, cy - 54 * Math.sin(th / 2) + 5, 'θ', 15, '#334155', 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    }
    lbl(cx, cy + a + 38 > 340 ? 340 : cy + a + 38, '주황색 선 = 코일을 통과하는 자기력선', { size: 12, bg: 'rgba(255,255,255,.93)', color: '#9a3412', minX: 0, maxX: SC.w });
    drawGalv(SC.w - 70, 300, 38, f.gal.value, '검류계');
    sceneEnd();
    // 띠
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, bw = STP.w - 24, phi = phiOf(f.dB, f.dA, f.dth);
    T(bx, STP.y + 20, 'Φ = B × A × cosθ = ' + f.B.toFixed(1) + ' × ' + f.A.toFixed(3) + ' × cos ' + f.th + '° = ' + phiStr(PHI()) + ' Wb', PHONE ? 12 : 13.5, COL_BLUE, 'left', 800);
    trackBar(bx + 30, STP.y + 34, bw - 120, 18, phi / PHI_MAX, COL_PHI);
    T(bx, STP.y + 48, 'Φ', 14, COL_PHI, 'left', 800); T(bx + bw - 84, STP.y + 48, '최대 ' + PHI_MAX.toFixed(3) + ' Wb', 12, '#516079', 'left', 800);
    T(bx, STP.y + 74, f.th === 90 ? '면이 자기장과 나란해서 지나는 선이 하나도 없어요.' : '선이 많이 지날수록 Φ가 커요. 선속이 변하는 동안만 검류계 바늘이 움직여요.', PHONE ? 11.5 : 12.5, '#0b7a41', 'left', 800);
    infoPanel([
      { h: '자기선속 Φ' },
      { p: 'Φ = B A cosθ  (단위 Wb = T·m²)' },
      { p: 'θ는 자기장 B와 코일 면의 수직선 n 사이의 각이에요. θ = 0°이면 선이 면을 곧게 통과해 Φ가 최대, θ = 90°이면 0이에요.' },
      { tbl: [['θ = 0°', 'cos 0° = 1', 'Φ = BA'], ['θ = 60°', 'cos 60° = 0.5', 'Φ = BA/2'], ['θ = 90°', 'cos 90° = 0', 'Φ = 0']], c1: 0.34, cur: f.th === 0 ? 0 : f.th === 60 ? 1 : f.th === 90 ? 2 : -1 },
      { p: '선속을 바꾸는 방법 3가지: ① B 바꾸기 ② 면적 A 바꾸기 ③ 각도 θ 바꾸기', c: '#9a3412', big: 1 },
      { p: '🔗 변하는 자기장이 도선 속 전하를 밀어 주는 전기장을 만들어 전류가 흘러요. 발전기도 코일을 돌려 θ를 계속 바꾸는 장치예요.', c: '#0b7a41', big: 1 },
    ]);
  }
  bindSl('sB', () => S.f.B, (v) => { S.f.B = v; }, updateCtl);
  bindSl('sA', () => S.f.A, (v) => { S.f.A = v; }, updateCtl);
  bindSl('sT', () => S.f.th, (v) => { S.f.th = v; }, updateCtl);

  /* ================= ② 유도 기전력 ================= */
  const E_LEAD = 0.05, E_TOT = 0.55, E_SLOW = 8, R_TOT = 10;
  const DTS = [0.05, 0.1, 0.2, 0.4];
  const epsOf = () => S.e.N * S.e.dp / S.e.dt;
  const eKey = () => S.e.N + '|' + S.e.dp + '|' + S.e.dt;
  const nearly = (a, b) => Math.abs(a - b) < 1e-9;
  const fmtEps = (v) => g3(v);
  function eReset() { const e = S.e; e.run = -1; e.done = false; e.live = 0; }
  function runEmf() {
    const e = S.e; e.run = 0; e.done = false; e.live = 0; Sound.click(); updateCtl();
  }
  function recEmf() {
    const e = S.e;
    if (!(e.done && e.ranKey === eKey())) { showHint('먼저 ▶ 자석 빼기로 이 설정의 실험을 끝까지 해 보세요.'); return; }
    if (e.N !== 200 || !nearly(e.dp, 0.01)) { showHint('표는 N = 200회, ΔΦ = 0.010 Wb 일 때의 값이에요. 두 값을 맞춰 주세요.'); return; }
    const k = DTS.findIndex((d) => nearly(d, e.dt)); if (k < 0) return;
    if (!e.rec[k]) { Sound.success(); parts.burst(SC.x + 330, SC.y + 300, { count: 14, speed: 140 }); }
    e.rec[k] = epsOf(); updateCtl();
  }
  function stepEmf(dt) {
    const e = S.e;
    if (e.run >= 0) {
      e.run += dt;
      if (e.run / E_SLOW >= E_TOT) { e.run = -1; e.done = true; e.ranKey = eKey(); updateCtl(); }
    }
    const tau = e.run >= 0 ? e.run / E_SLOW : e.done ? E_TOT : 0;
    const inWin = e.run >= 0 && tau >= E_LEAD && tau <= E_LEAD + e.dt;
    e.live = SciSim.approach(e.live, inWin ? epsOf() : 0, dt, 18);
    if (e.live < 0.01) e.live = 0;
    e.ph += dt * (30 + 90 * clamp(e.live / 160, 0, 1)) * (e.live > 0.3 ? 1 : 0);
  }
  function drawEmf() {
    const e = S.e, N = e.N; sceneBegin();
    const tau = e.run >= 0 ? e.run / E_SLOW : e.done ? E_TOT : 0;
    const p = clamp((tau - E_LEAD) / e.dt, 0, 1);                         // 자석을 빼낸 정도
    const cx = 270, cy = 96, aa = 46, bb = 13, nt = N === 100 ? 3 : N === 200 ? 5 : 7, sp = 9;
    const x0 = cx - (nt - 1) * sp / 2;
    // 뒤쪽 반(왼쪽) 고리
    for (let i = 0; i < nt; i++) { const pth = new Path2D(); pth.ellipse(x0 + i * sp, cy, bb, aa, 0, Math.PI / 2, Math.PI * 1.5); wireStroke(pth, 3, e.live / 60); }
    // 자석 (선속의 원천)
    const mxc = cx - p * 190, mw = 112, mh = 30, strong = 0;
    D.shadow(() => { D.roundRect(mxc - mw / 2, cy - mh / 2, mw, mh, 6); ctx.fillStyle = '#ef4444'; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.save(); D.roundRect(mxc - mw / 2, cy - mh / 2, mw, mh, 6); ctx.clip();
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(mxc - mw / 2, cy - mh / 2, mw / 2, mh);
    const gl = ctx.createLinearGradient(0, cy - mh / 2, 0, cy + mh / 2); gl.addColorStop(0, 'rgba(255,255,255,.45)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,.18)');
    ctx.fillStyle = gl; ctx.fillRect(mxc - mw / 2, cy - mh / 2, mw, mh); ctx.restore();
    T(mxc - mw / 4, cy + 6, 'S', 17, '#fff', 'center', 800); T(mxc + mw / 4, cy + 6, 'N', 17, '#fff', 'center', 800);
    // 자석 세기 표시 (선속 ΔΦ)
    for (let k = 0; k < 3; k++) { const on = k === 0 || (k === 1 && e.dp >= 0.01 - 1e-9) || (k === 2 && e.dp >= 0.02 - 1e-9); ctx.fillStyle = on ? '#f59e0b' : '#e2e8f0'; ctx.beginPath(); ctx.arc(mxc - 12 + k * 12, cy - mh / 2 - 9, 4, 0, TAU); ctx.fill(); }
    // 앞쪽 반(오른쪽) 고리
    for (let i = 0; i < nt; i++) { const pth = new Path2D(); pth.ellipse(x0 + i * sp, cy, bb, aa, 0, -Math.PI / 2, Math.PI / 2); wireStroke(pth, 3, e.live / 60); }
    // 도선 → 전압계
    const xr = x0 + (nt - 1) * sp + bb, vx = 408;
    const top = [[xr - 1, cy - aa], [xr - 1, 22], [vx, 22], [vx, 50]], bot = [[xr - 1, cy + aa], [xr - 1, 176], [vx, 176], [vx, 142]];
    [top, bot].forEach((pts) => { const pth = new Path2D(); pts.forEach((q, i) => (i ? pth.lineTo(q[0], q[1]) : pth.moveTo(q[0], q[1]))); wireStroke(pth, 2.6, e.live / 60); });
    if (e.live > 0.3) {
      ctx.save();
      pathDots([[xr - 1, cy + aa], [xr - 1, 176], [vx, 176], [vx, 142]], e.ph, 22, 2.6, '#f59e0b');
      pathDots([[vx, 50], [vx, 22], [xr - 1, 22], [xr - 1, cy - aa]], e.ph, 22, 2.6, '#f59e0b');
      ctx.restore();
    }
    lbl(cx - 70, 190 - 4, 'N = ' + N + '회 코일', { size: 12.5, bg: 'rgba(255,255,255,.95)', color: '#7c4a1c', minX: 0, maxX: SC.w });
    if (e.run >= 0 && p > 0 && p < 1) D.arrow(mxc - mw / 2 - 6, cy + 36, mxc - mw / 2 - 52, cy + 36, { color: COL_TEAL, width: 3.5, head: 10 });
    if (e.run >= 0 && p > 0 && p < 1) T(mxc - mw / 2 - 28, cy + 56, '빼는 중', 12.5, COL_TEAL, 'center', 800);
    // 전압계
    D.shadow(() => { D.roundRect(vx - 48, 50, 96, 92, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    T(vx, 68, '전압계 V', 12.5, '#334155', 'center', 800);
    const masked = S.gate === 'me2';
    T(vx, 98, masked ? '?' : (e.live < 0.05 ? '0' : g3(e.live)) + (masked ? '' : ' V'), 22, e.live > 0.3 ? COL_RED : '#64748b', 'center', 800);
    trackBar(vx - 38, 112, 76, 10, masked ? 0 : e.live / 160, COL_RED);
    T(vx, 136, '0 ~ 160 V', 11, '#94a3b8', 'center', 700);
    // ---- Φ–t 그래프 ----
    const gx0 = 56, gx1 = 450, gy0 = 254, gy1 = 366;
    const X = (t) => gx0 + t / E_TOT * (gx1 - gx0), Y = (ph) => gy1 - ph / 0.02 * (gy1 - gy0);
    D.roundRect(8, 204, SC.w - 16, 190, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e1e7f0'; ctx.lineWidth = 1.4; ctx.stroke();
    T(16, 224, 'Φ–t 그래프 (자석을 빼는 동안 선속이 ΔΦ에서 0으로)', PHONE ? 11.5 : 12.5, COL_BLUE, 'left', 800);
    ctx.strokeStyle = '#e8edf5'; ctx.lineWidth = 1;
    [0, 0.005, 0.01, 0.015, 0.02].forEach((v) => { ctx.beginPath(); ctx.moveTo(gx0, Y(v)); ctx.lineTo(gx1, Y(v)); ctx.stroke(); });
    for (let t = 0; t <= 0.5001; t += 0.1) { ctx.beginPath(); ctx.moveTo(X(t), gy0); ctx.lineTo(X(t), gy1); ctx.stroke(); T(X(t), gy1 + 14, t.toFixed(1), 11.5, '#64748b', 'center', 700); }
    [0, 0.01, 0.02].forEach((v) => T(gx0 - 6, Y(v) + 4, v.toFixed(3), 11.5, '#64748b', 'right', 700));
    T(gx1 + 4, gy1 + 14, 't (s)', 11.5, '#64748b', 'right', 800);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(gx0, gy0 - 4); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    const pts = [[0, e.dp], [E_LEAD, e.dp], [E_LEAD + e.dt, 0], [E_TOT, 0]];
    ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(124,58,237,.35)'; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1])))); ctx.stroke(); ctx.setLineDash([]);
    if (tau > 0) {
      ctx.strokeStyle = COL_PHI; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(X(0), Y(e.dp));
      const phiAt = (t) => (t <= E_LEAD ? e.dp : t >= E_LEAD + e.dt ? 0 : e.dp * (1 - (t - E_LEAD) / e.dt));
      [E_LEAD, E_LEAD + e.dt, E_TOT].forEach((tk) => { if (tau >= tk) ctx.lineTo(X(tk), Y(phiAt(tk))); });
      ctx.lineTo(X(Math.min(tau, E_TOT)), Y(phiAt(Math.min(tau, E_TOT)))); ctx.stroke();
      D.glow(X(Math.min(tau, E_TOT)), Y(phiAt(Math.min(tau, E_TOT))), 14, COL_PHI, 0.5);
    }
    // 기울기 삼각형
    const sx0 = X(E_LEAD), sx1 = X(E_LEAD + e.dt), sy0 = Y(e.dp), sy1 = Y(0);
    ctx.setLineDash([4, 3]); ctx.strokeStyle = COL_ORG; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx1, sy0); ctx.lineTo(sx1, sy1); ctx.stroke(); ctx.setLineDash([]);
    T((sx0 + sx1) / 2, sy0 - 6, 'Δt = ' + e.dt.toFixed(2) + ' s', 12, '#9a3412', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    T(sx1 + 5, (sy0 + sy1) / 2 + 4, 'ΔΦ = ' + e.dp.toFixed(3), 12, '#9a3412', 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    sceneEnd();
    // 띠
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, eps = epsOf();
    T(bx, STP.y + 22, 'ε = N × ΔΦ/Δt = ' + N + ' × ' + e.dp.toFixed(3) + ' / ' + e.dt.toFixed(2) + (masked ? ' = ?' : ' = ' + fmtEps(eps) + ' V'), PHONE ? 12.5 : 14.5, COL_BLUE, 'left', 800);
    T(bx, STP.y + 46, '그래프의 기울기 ΔΦ/Δt = ' + g3(e.dp / e.dt) + ' Wb/s  (가파를수록 ε가 커요)', PHONE ? 11.5 : 12.5, '#26324a', 'left', 800);
    T(bx, STP.y + 70, e.run >= 0 ? '실험 중 (화면은 ' + E_SLOW + '배 느리게 보여 줘요)' : e.done && e.ranKey === eKey() ? '실험 끝! 📝 표에 기록해 보세요.' : '▶ 자석 빼기를 눌러 보세요.', PHONE ? 11.5 : 12.5, '#0b7a41', 'left', 800);
    const rows = DTS.map((d, i) => [(d.toFixed(2)) + ' s', e.rec[i] != null ? '→ ε = ' + fmtEps(e.rec[i]) + ' V' : '→ ?', e.rec[i] != null ? '✅' : '⬜']);
    infoPanel([
      { h: '패러데이 법칙' },
      { p: '유도 기전력의 크기  ε = N ΔΦ/Δt', c: COL_BLUE },
      { p: 'ε는 선속의 변화 “빠르기”에 비례해요. 선속이 일정하면 ΔΦ = 0이라 ε = 0이에요.' },
      { p: 'N = 200회, ΔΦ = 0.010 Wb 일 때', c: '#516079' },
      { tbl: rows, cur: DTS.findIndex((d) => nearly(d, e.dt)), c1: 0.3 },
      { p: '총 저항 ' + R_TOT + ' Ω이면 전류 I = ε/R (예: 20 V이면 2.0 A)', c: '#26324a', big: 1 },
      { p: '🔗 선속이 변하면 코일 안에 전하를 밀어 주는 전기장이 생겨요. 변하는 장이 상호작용을 매개해요.', c: '#0b7a41', big: 1 },
    ]);
  }
  $$('#nSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.e.N = +b.dataset.v; eReset(); updateCtl(); }));
  $$('#dpSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.e.dp = +b.dataset.v; eReset(); updateCtl(); }));
  $$('#dtSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.e.dt = +b.dataset.v; eReset(); updateCtl(); }));
  $('#bRun').addEventListener('click', runEmf);
  $('#bRec').addEventListener('click', recEmf);

  /* ================= ③ 렌츠 법칙 ================= */
  const COIL = { x: 300, y: 190, a: 74, b: 20 };
  const MAG = { w: 110, h: 30 };
  const A_FLUX = 80;                                                     // 고리 크기에 해당하는 길이 (px)
  const lenzF = (d) => 1 / Math.pow(1 + (d * d) / (A_FLUX * A_FLUX), 1.5);        // 자석(쌍극자)이 만드는 고리의 선속 (상대값)
  const lenzDF = (d) => (-3 * d / (A_FLUX * A_FLUX)) * Math.pow(1 + (d * d) / (A_FLUX * A_FLUX), -2.5);
  const RAIL = { L: 0.4, R: 0.3, scale: 55, len: 300, x0: 60, bar0: 110, yT: 120, yB: 300 };
  const p3 = (v) => (Math.abs(v) < 1e-9 ? '0' : (v * (1 + 1e-12)).toPrecision(3));
  const railEps = () => (S.l.push ? S.l.rB * RAIL.L * S.l.rv : 0);
  const railI = () => railEps() / RAIL.R;
  const railF = () => S.l.rB * railI() * RAIL.L;
  function setLView(v) {
    const l = S.l; l.view = v; l.auto = null; l.drag = false; l.push = false; l.bx = 0; l.rwait = 0; l.rph = 0;
    l.fake = { on: false, x: 0, v: 1, done: false, t: 0 };
    updateCtl();
  }
  function startAuto(a, b) { const l = S.l; l.auto = { a, b, t: 0, dur: 1.4 }; l.tx = a; l.mx = a; l.vx = 0; Sound.click(); }
  function stepLenz(dt) {
    const l = S.l; if (dt <= 0) return;
    if (l.view === 'mag') {
      if (l.auto) { l.auto.t += dt; const u = Math.min(1, l.auto.t / l.auto.dur); l.tx = l.auto.a + (l.auto.b - l.auto.a) * SciSim.ease.inOutSine(u); if (u >= 1) l.auto = null; }
      const prev = l.mx;
      l.mx = l.auto ? l.tx : SciSim.approach(l.mx, l.tx, dt, 26);
      l.vx = SciSim.approach(l.vx, (l.mx - prev) / dt, dt, 24);
      if (Math.abs(l.vx) < 1.5) l.vx = 0;
      const d = l.mx - COIL.x, dphi = lenzDF(d) * l.flip * l.vx;                 // dΦ/dt (+x 방향 선속)
      l.I = SciSim.approach(l.I, -dphi / 0.5, dt, 22);                            // I > 0 : 유도 자기장이 +x 방향
      if (Math.abs(l.I) < 0.004) l.I = 0;
      l.Fa = Math.pow(lenzDF(d) * A_FLUX, 2) * Math.abs(l.vx) / 200;
      if (l.flip === 1 && l.mx < COIL.x - 30) { if (l.vx > 70) l.seen.ap += dt; if (l.vx < -70) l.seen.le += dt; }
      l.ph += dt * clamp(l.I, -1.5, 1.5) * 5;
    } else if (l.view === 'rail') {
      if (l.push) {
        if (l.rwait > 0) { l.rwait -= dt; if (l.rwait <= 0) l.bx = 0; }
        else { l.bx += l.rv * RAIL.scale * dt; if (l.bx >= RAIL.len) { l.bx = RAIL.len; l.rwait = 0.6; } }
      }
      const run = l.push && l.rwait <= 0 ? 1 : 0;
      l.rph += dt * run * (30 + 34 * railI());
    } else {
      const f = l.fake;
      if (f.on) { f.t += dt; f.v *= Math.exp(1.333 * dt); f.x += f.v * RAIL.scale * dt; if (f.x >= RAIL.len) { f.x = RAIL.len; f.on = false; f.done = true; Sound.fail(); } }
      l.rph -= dt * (f.on || f.done ? 38 + 10 * f.v : 0);
    }
  }
  function drawLenzMag() {
    const l = S.l; sceneBegin();
    const mxs = l.mx, my = COIL.y, nW = l.flip === 1 ? 'S' : 'N', nE = l.flip === 1 ? 'N' : 'S';
    // 코일 (3겹) — 뒤쪽 반
    const offs = [-7, 0, 7], Ia = clamp(Math.abs(l.I), 0, 1.4), dirI = l.I >= 0 ? 1 : -1;
    offs.forEach((o) => { const pth = new Path2D(); pth.ellipse(COIL.x + o, COIL.y, COIL.b, COIL.a, 0, Math.PI / 2, Math.PI * 1.5); wireStroke(pth, 3.4, Ia * 0.9); });
    // 자석
    const pull = l.auto || l.drag;
    D.shadow(() => { D.roundRect(mxs - MAG.w / 2, my - MAG.h / 2, MAG.w, MAG.h, 6); ctx.fillStyle = '#ef4444'; ctx.fill(); }, { blur: pull ? 12 : 6, y: pull ? 6 : 3 });
    ctx.save(); D.roundRect(mxs - MAG.w / 2, my - MAG.h / 2, MAG.w, MAG.h, 6); ctx.clip();
    ctx.fillStyle = l.flip === 1 ? '#3b82f6' : '#ef4444'; ctx.fillRect(mxs - MAG.w / 2, my - MAG.h / 2, MAG.w / 2, MAG.h);
    ctx.fillStyle = l.flip === 1 ? '#ef4444' : '#3b82f6'; ctx.fillRect(mxs, my - MAG.h / 2, MAG.w / 2, MAG.h);
    const gl = ctx.createLinearGradient(0, my - MAG.h / 2, 0, my + MAG.h / 2); gl.addColorStop(0, 'rgba(255,255,255,.45)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,.18)');
    ctx.fillStyle = gl; ctx.fillRect(mxs - MAG.w / 2, my - MAG.h / 2, MAG.w, MAG.h); ctx.restore();
    T(mxs - MAG.w / 4, my + 6, nW, 17, '#fff', 'center', 800); T(mxs + MAG.w / 4, my + 6, nE, 17, '#fff', 'center', 800);
    // 코일 — 앞쪽 반
    offs.forEach((o) => { const pth = new Path2D(); pth.ellipse(COIL.x + o, COIL.y, COIL.b, COIL.a, 0, -Math.PI / 2, Math.PI / 2); wireStroke(pth, 3.4, Ia * 0.9); });
    // 유도 전류 점 (I > 0 : 앞쪽 반에서 아래로, 뒤쪽 반에서 위로)
    if (Ia > 0.06) {
      ctx.fillStyle = '#f59e0b';
      offs.forEach((o) => {
        for (let k = 0; k < 9; k++) {
          const th = l.ph * 0.9 + k * TAU / 9;
          ctx.beginPath(); ctx.arc(COIL.x + o + COIL.b * Math.cos(th), COIL.y + COIL.a * Math.sin(th), 3.2, 0, TAU); ctx.fill();
        }
      });
    }
    // 코일 면의 극성과 유도 자기장
    const strong = Ia > 0.12;
    const bxL = COIL.x - 52, bxR = COIL.x + 52, byB = COIL.y - COIL.a - 22;
    if (strong) {
      const leftN = l.I < 0, rightN = l.I > 0;
      lbl(bxL, byB, leftN ? 'N' : 'S', { bg: leftN ? '#ef4444' : '#3b82f6', size: 13, pad: 9, minX: 0, maxX: SC.w });
      lbl(bxR, byB, rightN ? 'N' : 'S', { bg: rightN ? '#ef4444' : '#3b82f6', size: 13, pad: 9, minX: 0, maxX: SC.w });
      const ay = COIL.y + COIL.a + 28;
      D.arrow(COIL.x - 34 * dirI, ay, COIL.x + 34 * dirI, ay, { color: COL_TEAL, width: 4, head: 11 });
      lbl(COIL.x, ay + 22, '유도 전류의 자기장 B′', { size: 12, bg: 'rgba(255,255,255,.93)', color: COL_TEAL, minX: 0, maxX: SC.w });
    } else {
      lbl(COIL.x, byB, '코일 (유도 전류 0)', { size: 12, bg: 'rgba(255,255,255,.9)', color: '#64748b', minX: 0, maxX: SC.w });
    }
    // 힘·속도 화살표
    if (Math.abs(l.vx) > 12) {
      const sg = Math.sign(l.vx), vy = my + 42;
      D.arrow(mxs, vy, mxs + sg * clamp(Math.abs(l.vx) * 0.32, 14, 60), vy, { color: COL_TEAL, width: 3.4, head: 10 });
      T(mxs + sg * clamp(Math.abs(l.vx) * 0.32, 14, 60) + sg * 6, vy + 5, 'v', 14, COL_TEAL, sg > 0 ? 'left' : 'right', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
      const fl = clamp(l.Fa * 110, 0, 84);
      if (fl > 6) {
        const fy = my - 42, fs = -sg;
        D.arrow(mxs, fy, mxs + fs * fl, fy, { color: '#f26b3a', width: 4.4, head: 12 });
        T(mxs + fs * fl + fs * 7, fy + 5, 'F', 15, '#9a3412', fs > 0 ? 'left' : 'right', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
        lbl(mxs, fy - 24, '운동을 방해하는 힘', { size: 12, bg: 'rgba(255,255,255,.95)', color: '#9a3412', minX: 0, maxX: SC.w });
      }
    } else if (!pull) lbl(CXs - 36, 52, '자석이 멈추면 전류도 힘도 0이에요', { size: 12.5, bg: 'rgba(255,255,255,.93)', color: '#516079', minX: 0, maxX: SC.w });
    lbl(CXs, SC.h - 16, '접근: 선속 증가 → 밀어냄 · 이탈: 선속 감소 → 끌어당김 (손가락으로 자석을 끌어 보세요)', { size: PHONE ? 11 : 12, bg: 'rgba(255,255,255,.93)', color: '#516079', minX: 0, maxX: SC.w });
    sceneEnd();
    // 띠
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, bw = STP.w - 24;
    T(bx, STP.y + 20, '유도 전류의 세기 (자석의 속력에 따라)', 12.5, COL_BLUE, 'left', 800);
    trackBar(bx + 110, STP.y + 30, bw - 110, 14, Ia / 1.4, '#f59e0b'); T(bx, STP.y + 42, '유도 전류 I', 12.5, '#26324a', 'left', 800);
    trackBar(bx + 110, STP.y + 52, bw - 110, 14, clamp(l.Fa * 1.6, 0, 1), '#f26b3a'); T(bx, STP.y + 64, '방해하는 힘 F', 12.5, '#26324a', 'left', 800);
    T(bx, STP.y + 80, '자석의 속력이 클수록, 선속이 빨리 변할수록 I와 F가 커요.', 11.5, '#0b7a41', 'left', 800);
    infoPanel([
      { h: '렌츠 법칙' },
      { p: '유도 전류는 선속의 “변화”를 방해하는 방향으로 흘러요. (ε = −NΔΦ/Δt 의 − 부호)', c: COL_BLUE },
      { tbl: [['N극 접근', '선속 증가', '밀어냄'], ['N극 멀어짐', '선속 감소', '끌어당김'], ['정지', '변화 없음', '힘 0']], cur: l.flip === 1 && l.mx < COIL.x - 30 ? (l.vx > 12 ? 0 : l.vx < -12 ? 1 : 2) : -1, c1: 0.4 },
      { p: '코일이 자석을 밀거나 당겨서 접근·이탈을 방해해요. 방해하지 않고 도와준다면 에너지가 공짜로 생겨 버려요.' },
      { p: '🔗 자석(원인)이 만든 변하는 자기장 → 코일 안의 전하가 힘을 받음(결과). 장이 상호작용을 전달해요.', c: '#0b7a41', big: 1 },
    ]);
  }
  function xMark(x, y, r, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    const d = r * 0.55; ctx.beginPath(); ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d); ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d); ctx.stroke();
  }
  function drawRails(fake) {
    const l = S.l, f = l.fake, masked = S.gate === 'ml2';
    sceneBegin();
    const bar = fake ? f.x : l.bx, bxs = RAIL.bar0 + bar, v = fake ? f.v : l.rv, run = fake ? (f.on || f.done) : (l.push && l.rwait <= 0);
    // 자기장 ⊗
    D.roundRect(70, 100, 372, 220, 12); ctx.fillStyle = 'rgba(124,58,237,.05)'; ctx.fill();
    for (let x = 90; x < 440; x += 44) for (let y = 138; y < 300; y += 40) xMark(x, y, 6, 'rgba(124,58,237,.55)');
    lbl(344, 84, 'B ⊗ 화면 속으로 ' + (fake ? '0.50' : l.rB.toFixed(2)) + ' T', { bg: COL_PHI, color: '#fff', size: 12, pad: 7, minX: 0, maxX: SC.w });
    // 고리 넓이
    ctx.fillStyle = 'rgba(250,204,21,.13)'; ctx.fillRect(RAIL.x0, RAIL.yT, bxs - RAIL.x0, RAIL.yB - RAIL.yT);
    // 레일 + 저항
    const rails = new Path2D(); rails.moveTo(RAIL.x0, RAIL.yT); rails.lineTo(440, RAIL.yT); rails.moveTo(RAIL.x0, RAIL.yB); rails.lineTo(440, RAIL.yB);
    rails.moveTo(RAIL.x0, RAIL.yT); rails.lineTo(RAIL.x0, 180); rails.moveTo(RAIL.x0, 240); rails.lineTo(RAIL.x0, RAIL.yB);
    wireStroke(rails, 4, 0);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(RAIL.x0, 180);
    for (let k = 0; k < 6; k++) ctx.lineTo(RAIL.x0 + (k % 2 ? -9 : 9), 180 + 10 + k * 10); ctx.lineTo(RAIL.x0, 240); ctx.stroke();
    T(RAIL.x0 + 14, 215, 'R = 0.30 Ω', 12.5, '#334155', 'left', 800);
    // L 표시
    D.arrow(96, 128, 96, 292, { color: '#64748b', width: 1.8, head: 8 }); D.arrow(96, 292, 96, 128, { color: '#64748b', width: 1.8, head: 8 });
    lbl(116, 160, 'L = 0.40 m', { size: 12, bg: 'rgba(255,255,255,.93)', color: '#334155', minX: 0, maxX: SC.w, align: 'center' });
    // 전류 점 (실제: 막대에서 위로 → 반시계 / 가상: 반대)
    const I = fake ? 0.6 + f.v * 0.3 : railI(), cur = run && I > 0.01;
    if (cur) {
      const pts = [[bxs, RAIL.yB], [bxs, RAIL.yT], [RAIL.x0, RAIL.yT], [RAIL.x0, RAIL.yB], [bxs, RAIL.yB]];
      const rev = pts.slice().reverse();
      pathDots(fake ? rev : pts, Math.abs(l.rph), 24, 3.2, '#f59e0b');
    }
    // 막대
    D.shadow(() => { D.roundRect(bxs - 6, RAIL.yT - 12, 12, RAIL.yB - RAIL.yT + 24, 5); ctx.fillStyle = '#94a3b8'; ctx.fill(); }, { blur: 6, y: 2 });
    const bg = ctx.createLinearGradient(bxs - 6, 0, bxs + 6, 0); bg.addColorStop(0, '#e2e8f0'); bg.addColorStop(0.5, '#94a3b8'); bg.addColorStop(1, '#64748b');
    D.roundRect(bxs - 6, RAIL.yT - 12, 12, RAIL.yB - RAIL.yT + 24, 5); ctx.fillStyle = bg; ctx.fill();
    // 속도 · 힘 화살표
    if (run) {
      D.arrow(bxs + 10, 90, bxs + 10 + clamp(v * 9, 14, 56), 90, { color: COL_TEAL, width: 3.4, head: 10 });
      T(Math.min(bxs + 14, 352), 78, 'v = ' + p3(v) + ' m/s', 12, COL_TEAL, 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    }
    if (!fake) {
      const F = railF(), fl = clamp(F / 0.86 * 100, 0, 100);
      if (run && fl > 3) {
        D.arrow(bxs + 8, 210, bxs + 8 + fl, 210, { color: '#2563eb', width: 5, head: 13 });
        D.arrow(bxs - 8, 244, bxs - 8 - fl, 244, { color: '#f26b3a', width: 5, head: 13 });
        lbl(clamp(bxs + 8 + fl / 2, 60, 420), 192, '외력 F', { size: 12, bg: 'rgba(255,255,255,.95)', color: '#1d4ed8', minX: 0, maxX: SC.w });
        lbl(clamp(bxs - 8 - fl / 2, 60, 420), 262, masked ? '자기력 F = ?' : '자기력 F = BIL', { size: 12, bg: 'rgba(255,255,255,.95)', color: '#9a3412', minX: 0, maxX: SC.w });
      }
      if (!l.push) lbl(CXs + 30, 340, '▶ 막대 밀기를 눌러 보세요', { size: 13, bg: 'rgba(255,255,255,.95)', color: '#9a3412', minX: 0, maxX: SC.w });
      else lbl(CXs + 20, 346, '화면은 실제보다 느리게 보여 줘요 · 막대는 일정한 속력', { size: 11.5, bg: 'rgba(255,255,255,.93)', color: '#516079', minX: 0, maxX: SC.w });
    } else {
      lbl(CXs, 34, '🚫 상상 속 장면: 유도 전류가 선속 변화를 “돕는다면”?', { size: PHONE ? 11.5 : 13, bg: '#7f1d1d', color: '#fff', minX: 0, maxX: SC.w });
      const Fm = 0.1333 * f.v, fl = clamp(Fm / 1.1 * 100, 0, 100);
      if (run) {
        D.arrow(bxs + 8, 244, bxs + 8 + fl, 244, { color: '#f26b3a', width: 5, head: 13 });
        lbl(clamp(bxs + 8 + fl / 2, 60, 420), 262, '자기력이 운동 방향!', { size: 12, bg: 'rgba(255,255,255,.95)', color: '#9a3412', minX: 0, maxX: SC.w });
      }
      lbl(CXs - 10, 330, '외력 = 0 인데 막대가 점점 빨라져요', { size: 12.5, bg: 'rgba(255,255,255,.95)', color: '#7f1d1d', minX: 0, maxX: SC.w });
      if (f.done) { lbl(CXs, 190, '❌ 불가능! 에너지가 공짜로 늘어나요', { size: 15, bg: '#dc2626', color: '#fff', pad: 12, minX: 0, maxX: SC.w }); }
    }
    sceneEnd();
    // 띠
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const sx = STP.x + 12, sw = STP.w - 24;
    if (!fake) {
      const Pe = railF() * l.rv * (l.push ? 1 : 0), Ph = railI() * railI() * RAIL.R;
      T(sx, STP.y + 20, '에너지 보존: 외력이 하는 일률 Fv = 저항의 열 I²R', 12.5, COL_BLUE, 'left', 800);
      T(sx, STP.y + 44, '외력 Fv', 12.5, '#26324a', 'left', 800); trackBar(sx + 80, STP.y + 32, sw - 170, 14, masked ? 0 : Pe / 3.6, '#2563eb'); T(sx + sw, STP.y + 44, masked ? '?' : p3(Pe) + ' W', 12.5, '#26324a', 'right', 800);
      T(sx, STP.y + 66, '열 I²R', 12.5, '#26324a', 'left', 800); trackBar(sx + 80, STP.y + 54, sw - 170, 14, masked ? 0 : Ph / 3.6, '#ef4444'); T(sx + sw, STP.y + 66, masked ? '?' : p3(Ph) + ' W', 12.5, '#26324a', 'right', 800);
      T(sx, STP.y + 82, '막대가 한 일은 모두 저항에서 열로 바뀌어요.', 11.5, '#0b7a41', 'left', 800);
    } else {
      const KE = 0.5 * 0.1 * f.v * f.v;
      T(sx, STP.y + 20, '가상 장면의 에너지 (막대 질량 0.10 kg)', 12.5, COL_BLUE, 'left', 800);
      T(sx, STP.y + 44, '운동 에너지', 12.5, '#26324a', 'left', 800); trackBar(sx + 96, STP.y + 32, sw - 180, 14, KE / 4, '#ef4444'); T(sx + sw, STP.y + 44, p3(KE) + ' J', 12.5, '#26324a', 'right', 800);
      T(sx, STP.y + 66, '외력이 한 일', 12.5, '#26324a', 'left', 800); trackBar(sx + 96, STP.y + 54, sw - 180, 14, 0, '#2563eb'); T(sx + sw, STP.y + 66, '0 J', 12.5, '#26324a', 'right', 800);
      T(sx, STP.y + 82, '한 일이 0인데 에너지가 늘어요 → 에너지 보존 법칙 위반!', 11.5, '#b91c1c', 'left', 800);
    }
    const eps = railEps(), Iv = railI();
    if (!fake) infoPanel([
      { h: '움직이는 막대 도체' },
      { tbl: [['ε = B L v', (l.push ? p3(eps) : '0') + ' V', ''], ['I = ε / R', (l.push ? p3(Iv) : '0') + ' A', ''], ['F = B I L', masked ? '?' : (l.push ? p3(railF()) : '0') + ' N', ''], ['Fv', masked ? '?' : p3(railF() * l.rv * (l.push ? 1 : 0)) + ' W', ''], ['I²R', masked ? '?' : p3(Iv * Iv * RAIL.R) + ' W', '']], c1: 0.62 },
      { p: '유도 전류가 흐르는 막대는 운동을 방해하는 쪽으로 자기력 F = BIL = B²L²v/R 을 받아요. 속력이 일정하려면 같은 크기의 외력이 필요해요.' },
      { p: '식에 L = 0.40 m, R = 0.30 Ω 를 넣어 보세요.', c: '#516079', big: 1 },
    ]);
    else infoPanel([
      { h: '만약 돕는다면?' },
      { p: '실제 렌츠 법칙: 유도 전류는 선속 변화를 방해 → 막대에 운동을 막는 힘이 생겨요.', c: '#0b7a41' },
      { p: '가상: 유도 전류가 선속 변화를 도우면 자기력이 막대를 더 빨리 밀어요. 빨라지면 ε도 커지고 힘도 커져서 계속 빨라져요.', c: '#9a3412' },
      { p: '아무 일도 해 주지 않았는데 운동 에너지와 열이 계속 늘어나니 에너지 보존 법칙에 어긋나요. 그래서 렌츠 법칙(방해)이 성립해야 해요.', c: '#26324a' },
    ]);
  }
  $$('#lViewSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setLView(b.dataset.v); }));
  $('#bAppr').addEventListener('click', () => { S.l.drag = false; startAuto(70, 220); });
  $('#bLeave').addEventListener('click', () => { S.l.drag = false; startAuto(220, 70); });
  $('#bFlip').addEventListener('click', () => { Sound.click(); S.l.flip *= -1; });
  $('#bPush').addEventListener('click', () => { Sound.click(); S.l.push = !S.l.push; if (S.l.push) { S.l.bx = 0; S.l.rwait = 0; } updateCtl(); });
  $('#bFake').addEventListener('click', () => { Sound.click(); S.l.fake = { on: true, x: 0, v: 1, done: false, t: 0 }; updateCtl(); });
  $$('#rBSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.l.rB = +b.dataset.v; updateCtl(); }));
  bindSl('sRv', () => S.l.rv, (v) => { S.l.rv = v; }, updateCtl);
  function lenzDown(p) {
    if (S.mode !== 'lenz' || S.l.view !== 'mag') return false;
    const q = lp(p), l = S.l;
    if (Math.abs(q.x - l.mx) < MAG.w / 2 + 12 && Math.abs(q.y - COIL.y) < MAG.h / 2 + 22) { l.drag = true; l.auto = null; l.dx = l.mx - q.x; l.tx = l.mx; return true; }
    return false;
  }

  /* ================= ④ 자기 브레이크 ================= */
  const PEND = { px: 236, py: 34, L: 270, Lm: 0.5, g: 9.8, m: 0.2, wp: 100, wm: 64, gam0: 0.7, phi0: 30 * DEG, tmax: 20 };
  const GX = PEND.px, GY = PEND.py + PEND.L;
  const MATS = { cu: { name: '구리', k: 1, col: '#c9824a' }, al: { name: '알루미늄', k: 0.6, col: '#b9c3ce' }, pl: { name: '플라스틱', k: 0, col: '#7dd3fc' }, slot: { name: '틈 있는 구리', k: 0.3, col: '#c9824a' } };
  const MKEYS = ['cu', 'al', 'pl', 'slot'];
  const MAGS = { 1: { name: '약', r: 1, B: 0.10 }, 2: { name: '중', r: 1.5, B: 0.15 }, 3: { name: '강', r: 2, B: 0.20 } };
  const overlapF = (x) => clamp(((PEND.wp + PEND.wm) / 2 - Math.abs(x)) / PEND.wm, 0, 1);       // 자기장 영역이 판에 덮인 비율
  const pendE = () => 0.5 * PEND.Lm * PEND.Lm * S.b.w * S.b.w + PEND.g * PEND.Lm * (1 - Math.cos(S.b.phi));
  const E0P = PEND.g * PEND.Lm * (1 - Math.cos(PEND.phi0));
  function pendReset() {
    const b = S.b; b.phi = PEND.phi0; b.w = 0; b.t = 0; b.run = false; b.done = false; b.status = ''; b.cross = 0; b.vx = 0; b.tstop = 0; b.nsw = 0; b.settle = 0;
  }
  function pendRelease() { pendReset(); S.b.run = true; Sound.click(); updateCtl(); }
  function pipeReset() { const p = S.b.pipe; p.run = false; p.t = 0; p.fin = { f: 0, p: 0, c: 0 }; }
  const vTerm = () => 0.5 / (MAGS[S.b.mag].r * MAGS[S.b.mag].r);
  const pipeS = (t, c) => { const g = PEND.g; if (!c) return clamp(0.5 * g * t * t, 0, 1); const vt = vTerm(); return clamp(vt * t - (vt * vt / g) * (1 - Math.exp(-g * t / vt)), 0, 1); };
  const pipeV = (t, c, s) => { if (s >= 1) return 0; return c ? vTerm() * (1 - Math.exp(-PEND.g * t / vTerm())) : PEND.g * t; };
  function stepBrake(dt) {
    const b = S.b; if (dt <= 0) return;
    if (b.view === 'pend') {
      const mat = MATS[b.mat], r = MAGS[b.mag].r;
      if (b.run) {
        const ts = b.fast ? 3 : 1; let rem = dt * ts;
        while (rem > 1e-9) {
          const h = Math.min(0.004, rem); rem -= h;
          const x = PEND.L * Math.sin(b.phi), gam = PEND.gam0 * mat.k * r * r * overlapF(x);
          const prev = b.phi;
          b.w += (-(PEND.g / PEND.Lm) * Math.sin(b.phi) - gam * b.w) * h; b.phi += b.w * h; b.t += h;
          if (prev * b.phi < 0) b.cross++;
          if (!b.done) {
            const E = pendE();
            if (E < 0.01 * E0P) { b.done = true; b.status = 'stop'; b.tstop = b.t; b.nsw = Math.floor(b.cross / 2); b.rec[b.mat] = { t: b.tstop, n: b.nsw, status: 'stop', mag: b.mag }; Sound.success(); parts.burst(SC.x + GX, SC.y + GY, { count: 12, speed: 130 }); updateCtl(); }
            else if (b.t >= PEND.tmax) { b.done = true; b.status = 'timeout'; b.tstop = b.t; b.nsw = Math.floor(b.cross / 2); b.rec[b.mat] = { t: b.tstop, n: b.nsw, status: 'timeout', mag: b.mag }; updateCtl(); }
          }
          if (b.done && b.status === 'timeout') { b.run = false; break; }
          if (b.done && b.status === 'stop' && (pendE() < 1e-4 * E0P || b.t > b.tstop + 4)) { b.run = false; b.phi = 0; b.w = 0; break; }
        }
      }
      b.vx = b.run ? PEND.L * Math.cos(b.phi) * b.w : 0;
      b.vxs = SciSim.approach(b.vxs || 0, b.vx, dt, 30);
      const xs = PEND.L * Math.sin(b.phi);
      const s = clamp(Math.abs(b.vxs) / (PEND.L * 2.3), 0, 1) * overlapF(xs) * (mat.k > 0 ? 1 : 0);
      b.sw = SciSim.approach(b.sw || 0, s, dt, 14);
      b.ph += dt * (b.vxs > 0 ? 1 : -1) * (3 + 20 * b.sw);
    } else {
      const p = b.pipe;
      if (p.run) {
        p.t += dt;
        if (!p.fin.f && pipeS(p.t, false) >= 1) p.fin.f = Math.sqrt(2 / PEND.g);
        if (!p.fin.p && pipeS(p.t, false) >= 1) p.fin.p = Math.sqrt(2 / PEND.g);
        if (!p.fin.c && pipeS(p.t, true) >= 1) { p.fin.c = p.t; p.run = false; Sound.success(); }
      }
      const vc = p.run || p.fin.c ? pipeV(p.t, true, pipeS(p.t, true)) : 0;
      b.sw = SciSim.approach(b.sw || 0, clamp(vc / 0.5, 0, 1), dt, 10);
      b.ph += dt * (4 + 30 * b.sw);
    }
  }
  function swirl(cx, cy, rx, ry, dirSign, amp, ph, clipRect) {
    if (amp < 0.03) return;
    ctx.save();
    if (clipRect) { ctx.beginPath(); ctx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h); ctx.clip(); }
    ctx.strokeStyle = 'rgba(245,158,11,' + (0.25 + 0.5 * amp) + ')'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(180,83,9,' + (0.35 + 0.65 * amp) + ')';
    for (let k = 0; k < 7; k++) { const th = dirSign * ph + k * TAU / 7; ctx.beginPath(); ctx.arc(cx + rx * Math.cos(th), cy + ry * Math.sin(th), 2.8, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawPend() {
    const b = S.b, mat = MATS[b.mat], r = MAGS[b.mag].r; sceneBegin();
    const sx = PEND.px + PEND.L * Math.sin(b.phi), sy = PEND.py + PEND.L * Math.cos(b.phi);
    // 받침
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(PEND.px - 70, PEND.py - 14, 140, 9); ctx.fillStyle = '#94a3b8'; ctx.fillRect(PEND.px - 70, PEND.py - 14, 140, 3);
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(10, 366, SC.w - 20, 10);
    // 자석 (뒤쪽 S극 + 받침대)
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(GX - 8, GY + 32, 16, 366 - GY - 32);
    D.shadow(() => { D.roundRect(GX - 32, GY - 32, 64, 64, 6); ctx.fillStyle = '#60a5fa'; ctx.fill(); }, { blur: 6, y: 2 });
    T(GX, GY + 8, 'S', 22, 'rgba(255,255,255,.85)', 'center', 800);
    // 막대 + 판
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(PEND.px, PEND.py); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(PEND.px, PEND.py, 5, 0, TAU); ctx.fill();
    const heat = clamp((E0P - pendE()) / E0P, 0, 1) * (b.run || b.done ? 1 : 0);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(b.phi);
    D.shadow(() => { D.roundRect(-50, -50, 100, 100, 6); ctx.fillStyle = mat.col; ctx.fill(); }, { blur: 8, y: 3 });
    const pg = ctx.createLinearGradient(-50, -50, 50, 50); pg.addColorStop(0, 'rgba(255,255,255,.4)'); pg.addColorStop(0.5, 'rgba(255,255,255,0)'); pg.addColorStop(1, 'rgba(0,0,0,.15)');
    D.roundRect(-50, -50, 100, 100, 6); ctx.fillStyle = mat.col; ctx.fill(); ctx.fillStyle = pg; ctx.fill();
    if (b.mat === 'pl') { D.roundRect(-50, -50, 100, 100, 6); ctx.fillStyle = 'rgba(125,211,252,.55)'; ctx.fill(); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.stroke(); }
    if (heat > 0.01 && mat.k > 0) { D.roundRect(-50, -50, 100, 100, 6); ctx.fillStyle = 'rgba(239,68,68,' + (0.62 * heat) + ')'; ctx.fill(); }
    if (b.mat === 'slot') { ctx.fillStyle = '#eef2fa'; [-32, -16, 0, 16, 32].forEach((sxl) => ctx.fillRect(sxl - 2, -2, 4, 52)); }
    ctx.restore();
    // 와전류 소용돌이 (자기장 영역 ∩ 판)
    const ix0 = Math.max(GX - 32, sx - 50), ix1 = Math.min(GX + 32, sx + 50), iy0 = Math.max(GY - 32, sy - 50), iy1 = Math.min(GY + 32, sy + 50);
    if (ix1 > ix0 && iy1 > iy0 && mat.k > 0) {
      const clip = { x: ix0, y: iy0, w: ix1 - ix0, h: iy1 - iy0 }, sg = b.vxs >= 0 ? 1 : -1;
      if (b.mat === 'slot') { [-24, -8, 8, 24].forEach((ox, i) => swirl(GX + ox, GY, 6, 12, (ox < 0 ? -1 : 1) * sg, b.sw * 0.6, b.ph, clip)); }
      else { swirl(GX - 16, GY, 13, 16, -sg, b.sw, b.ph, clip); swirl(GX + 16, GY, 13, 16, sg, b.sw, b.ph, clip); }
    }
    // 앞쪽 N극 (반투명) + 자기장 ⊗
    D.roundRect(GX - 32, GY - 32, 64, 64, 6); ctx.fillStyle = 'rgba(239,68,68,.30)'; ctx.fill(); ctx.strokeStyle = 'rgba(220,38,38,.85)'; ctx.lineWidth = 2; ctx.stroke();
    xMark(GX - 18, GY - 18, 5, 'rgba(76,29,149,.8)'); xMark(GX + 18, GY - 18, 5, 'rgba(76,29,149,.8)'); xMark(GX - 18, GY + 18, 5, 'rgba(76,29,149,.8)'); xMark(GX + 18, GY + 18, 5, 'rgba(76,29,149,.8)');
    lbl(GX + 78, GY - 38, 'N극 (앞)', { size: 12, bg: '#ef4444', pad: 7, minX: 0, maxX: SC.w });
    lbl(GX + 78, GY - 14, 'B ⊗ ' + MAGS[b.mag].B.toFixed(2) + ' T', { size: 12, bg: COL_PHI, pad: 7, minX: 0, maxX: SC.w });
    // 안내
    if (!b.run && !b.done) lbl(CXs, 340, '▶ 진자 놓기를 눌러 판이 자석 사이를 지나가게 해요', { size: 12.5, bg: 'rgba(255,255,255,.95)', color: '#9a3412', minX: 0, maxX: SC.w });
    if (b.mat === 'pl') lbl(110, 70, '와전류 없음 (도체가 아님)', { size: 12, bg: 'rgba(255,255,255,.95)', color: '#0369a1', minX: 0, maxX: SC.w });
    else if (b.sw > 0.15) lbl(110, 70, '와전류 → 운동을 방해', { size: 12, bg: 'rgba(255,255,255,.95)', color: '#9a3412', minX: 0, maxX: SC.w });
    if (b.done) lbl(CXs, 36, b.status === 'stop' ? '멈췄어요! ' + b.tstop.toFixed(1) + ' s · 왕복 ' + b.nsw + '회' : PEND.tmax + ' s가 지나도 멈추지 않아요', { size: 13.5, bg: b.status === 'stop' ? '#16a34a' : '#475569', pad: 10, minX: 0, maxX: SC.w });
    sceneEnd();
    // 띠: 에너지
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const sxx = STP.x + 12, sw = STP.w - 24, E = clamp(pendE(), 0, E0P), mJ = (x) => (x * PEND.m * 1000).toFixed(0);
    T(sxx, STP.y + 20, '에너지 (처음 역학적 에너지 ' + mJ(E0P) + ' mJ)   경과 ' + b.t.toFixed(1) + ' s', 12.5, COL_BLUE, 'left', 800);
    T(sxx, STP.y + 44, '역학적 E', 12.5, '#26324a', 'left', 800); trackBar(sxx + 82, STP.y + 32, sw - 150, 14, E / E0P, '#2563eb'); T(sxx + sw, STP.y + 44, mJ(E) + ' mJ', 12.5, '#26324a', 'right', 800);
    T(sxx, STP.y + 66, '판의 열 Q', 12.5, '#26324a', 'left', 800); trackBar(sxx + 82, STP.y + 54, sw - 150, 14, (E0P - E) / E0P, '#ef4444'); T(sxx + sw, STP.y + 66, mJ(E0P - E) + ' mJ', 12.5, '#26324a', 'right', 800);
    T(sxx, STP.y + 82, '운동 에너지가 판의 열로 바뀌어요 (합은 항상 같아요).', 11.5, '#0b7a41', 'left', 800);
    const rows = MKEYS.map((k) => { const rc = b.rec[k]; return [MATS[k].name, rc ? (rc.status === 'stop' ? rc.t.toFixed(1) + ' s' : PEND.tmax + ' s+') : '—', rc ? (rc.status === 'stop' ? '왕복 ' + rc.n + '회' : '안 멈춤') + ' (' + MAGS[rc.mag].name + ')' : '']; });
    infoPanel([
      { h: '도체판 진자와 자기 브레이크' },
      { p: '판이 자석 사이로 들어가면 선속이 변해 판 속에 소용돌이 모양 전류(와전류)가 생기고, 렌츠 법칙에 따라 판의 움직임을 방해해요.' },
      { tbl: rows, cur: MKEYS.indexOf(b.mat), c1: 0.36 },
      { p: '제동력은 속력에 비례해서 멈추기 직전에는 약해지고, 정지하면 사라져요(마찰과 달라요). 에너지는 판의 열로 바뀌어요.', c: '#9a3412', big: 1 },
      { p: '🏭 롤러코스터·열차의 자기 제동, 인덕션 레인지(와전류로 냄비 가열)에 쓰여요.', c: '#0b7a41', big: 1 },
    ]);
  }
  const PIPE_X = [86, 236, 386], PIPE_T = 64, PIPE_B = 354, PIPE_Y0 = 84, PIPE_Y1 = 334;
  function drawPipeScene() {
    const b = S.b, p = b.pipe, r = MAGS[b.mag].r; sceneBegin();
    const names = ['자유 낙하', '플라스틱 파이프', '구리 파이프'];
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(10, PIPE_B + 4, SC.w - 20, 10);
    const sCopper = pipeS(p.t, true), sFree = pipeS(p.t, false);
    for (let i = 0; i < 3; i++) {
      const x = PIPE_X[i];
      if (i > 0) {
        const cu = i === 2;
        const g = ctx.createLinearGradient(x - 22, 0, x + 22, 0);
        if (cu) { g.addColorStop(0, '#8a4f22'); g.addColorStop(0.3, '#e0a46c'); g.addColorStop(0.7, '#c9824a'); g.addColorStop(1, '#7a4420'); } else { g.addColorStop(0, 'rgba(125,211,252,.55)'); g.addColorStop(0.35, 'rgba(224,242,254,.7)'); g.addColorStop(1, 'rgba(56,189,248,.5)'); }
        D.shadow(() => { D.roundRect(x - 22, PIPE_T, 44, PIPE_B - PIPE_T, 8); ctx.fillStyle = cu ? '#c9824a' : 'rgba(125,211,252,.4)'; ctx.fill(); }, { blur: 6, y: 3 });
        D.roundRect(x - 22, PIPE_T, 44, PIPE_B - PIPE_T, 8); ctx.fillStyle = g; ctx.fill();
        D.roundRect(x - 13, PIPE_T - 1, 26, PIPE_B - PIPE_T + 2, 5); ctx.fillStyle = cu ? '#3b2412' : 'rgba(241,245,249,.85)'; ctx.fill();
      } else { ctx.setLineDash([4, 6]); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, PIPE_T); ctx.lineTo(x, PIPE_B); ctx.stroke(); ctx.setLineDash([]); }
      const s = i === 2 ? sCopper : sFree, my = PIPE_Y0 + s * (PIPE_Y1 - PIPE_Y0);
      // 자석 (N극이 아래)
      D.shadow(() => { D.roundRect(x - 8, my - 18, 16, 36, 4); ctx.fillStyle = '#ef4444'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.save(); D.roundRect(x - 8, my - 18, 16, 36, 4); ctx.clip(); ctx.fillStyle = '#3b82f6'; ctx.fillRect(x - 8, my - 18, 16, 18); ctx.fillStyle = '#ef4444'; ctx.fillRect(x - 8, my, 16, 18); ctx.restore();
      T(x, my - 4, 'S', 11, '#fff', 'center', 800); T(x, my + 13, 'N', 11, '#fff', 'center', 800);
      // 구리 파이프의 와전류 고리
      if (i === 2 && b.sw > 0.04) {
        [[my + 32, -1], [my - 32, 1]].forEach((rr) => {
          const cy = rr[0], dir = rr[1], amp = b.sw;
          ctx.strokeStyle = 'rgba(245,158,11,' + (0.3 + 0.6 * amp) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, cy, 28, 8, 0, 0, TAU); ctx.stroke();
          ctx.fillStyle = '#b45309'; for (let k = 0; k < 8; k++) { const th = dir * b.ph + k * TAU / 8; ctx.beginPath(); ctx.arc(x + 28 * Math.cos(th), cy + 8 * Math.sin(th), 3, 0, TAU); ctx.fill(); }
        });
      }
      T(x, 50, names[i], 13, '#26324a', 'center', 800);
      const fin = i === 0 ? p.fin.f : i === 1 ? p.fin.p : p.fin.c, tShow = fin || (p.run ? p.t : 0);
      lbl(x, PIPE_B + 30, (fin ? '도착 ' : '') + (p.run || fin ? tShow.toFixed(2) + ' s' : '— s'), { size: 12.5, bg: fin ? '#16a34a' : '#475569', pad: 8, minX: 0, maxX: SC.w });
    }
    if (!p.run && !p.fin.c) lbl(CXs, 28, '▶ 자석 떨어뜨리기를 눌러 세 자석을 동시에 놓아 보세요', { size: 12.5, bg: 'rgba(255,255,255,.95)', color: '#9a3412', minX: 0, maxX: SC.w });
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const sxx = STP.x + 12, sw = STP.w - 24, M = 0.02, s = sCopper, vc = p.run || p.fin.c ? pipeV(p.t, true, s) : 0;
    const PE = M * PEND.g * s * 1000, KE = 0.5 * M * vc * vc * 1000;
    T(sxx, STP.y + 20, '구리 파이프 속 자석 (질량 20 g, 1 m 낙하)  속력 ' + (vc * 100).toFixed(0) + ' cm/s', 12.5, COL_BLUE, 'left', 800);
    T(sxx, STP.y + 44, '운동 E', 12.5, '#26324a', 'left', 800); trackBar(sxx + 64, STP.y + 32, sw - 134, 14, KE / 196, '#2563eb'); T(sxx + sw, STP.y + 44, KE.toFixed(1) + ' mJ', 12.5, '#26324a', 'right', 800);
    T(sxx, STP.y + 66, '파이프 열', 12.5, '#26324a', 'left', 800); trackBar(sxx + 64, STP.y + 54, sw - 134, 14, (PE - KE) / 196, '#ef4444'); T(sxx + sw, STP.y + 66, (PE - KE).toFixed(1) + ' mJ', 12.5, '#26324a', 'right', 800);
    T(sxx, STP.y + 82, '줄어든 위치 에너지 ' + PE.toFixed(0) + ' mJ 의 거의 전부가 열이 돼요.', 11.5, '#0b7a41', 'left', 800);
    infoPanel([
      { h: '구리 파이프 속 자석' },
      { p: '자유 낙하하는 자석은 1 m를 약 0.45 s에 떨어져요. 구리 파이프 속에서는 자석이 지나는 곳마다 고리 모양 와전류가 생겨 위·아래에서 낙하를 방해해요.' },
      { tbl: [['자유 낙하', '0.45 s', ''], ['플라스틱', '0.45 s', ''], ['구리 파이프', p.fin.c ? p.fin.c.toFixed(1) + ' s' : '— s', '']], cur: 2, c1: 0.5 },
      { p: '속력이 커질수록 방해하는 힘도 커져서 일정한 속력(종단 속력)으로 천천히 내려와요. 자석이 셀수록 더 느려요 (지금: ' + MAGS[b.mag].name + ').', c: '#9a3412', big: 1 },
      { p: '🔁 자석 아래쪽 고리는 선속이 늘어나고 위쪽 고리는 줄어들어서 전류 방향이 서로 반대예요.', c: '#0b7a41', big: 1 },
    ]);
  }
  $$('#bViewSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.b.view = b.dataset.v; pendReset(); pipeReset(); updateCtl(); }));
  $$('#matSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.b.mat = b.dataset.v; pendReset(); updateCtl(); }));
  $$('#magSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.b.mag = +b.dataset.v; pendReset(); pipeReset(); updateCtl(); }));
  $('#bRelease').addEventListener('click', pendRelease);
  $('#bFast').addEventListener('click', () => { Sound.click(); S.b.fast = !S.b.fast; updateCtl(); });
  $('#bDrop').addEventListener('click', () => { pipeReset(); S.b.pipe.run = true; Sound.click(); updateCtl(); });

  /* ---------- 화면 전환 · 조작 상태 ---------- */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  function updateCtl() {
    const view = curView();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      if (on && n.hasAttribute('data-view')) on = n.getAttribute('data-view').split(' ').indexOf(view) >= 0;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const f = S.f, e = S.e, l = S.l, b = S.b;
    setRange('sB', f.B, 0.1, 1.0, (v) => v.toFixed(1) + ' T'); setRange('sA', f.A, 0.005, 0.03, (v) => v.toFixed(3) + ' m²'); setRange('sT', f.th, 0, 90, (v) => v + '°');
    $('#sBM').disabled = f.B <= 0.1 + 1e-9; $('#sBP').disabled = f.B >= 1.0 - 1e-9; $('#sAM').disabled = f.A <= 0.005 + 1e-9; $('#sAP').disabled = f.A >= 0.03 - 1e-9; $('#sTM').disabled = f.th <= 0; $('#sTP').disabled = f.th >= 90;
    $$('#nSeg button').forEach((x) => x.classList.toggle('on', +x.dataset.v === e.N));
    $$('#dpSeg button').forEach((x) => x.classList.toggle('on', nearly(+x.dataset.v, e.dp)));
    $$('#dtSeg button').forEach((x) => x.classList.toggle('on', nearly(+x.dataset.v, e.dt)));
    $('#bRun').disabled = e.run >= 0; $('#bRec').disabled = !(e.done && e.ranKey === eKey());
    $$('#lViewSeg button').forEach((x) => x.classList.toggle('on', x.dataset.v === l.view));
    $$('#rBSeg button').forEach((x) => x.classList.toggle('on', nearly(+x.dataset.v, l.rB)));
    setRange('sRv', l.rv, 1, 4, (v) => v.toFixed(1) + ' m/s'); $('#sRvM').disabled = l.rv <= 1; $('#sRvP').disabled = l.rv >= 4;
    $('#bPush').textContent = l.push ? '⏹ 막대 멈추기' : '▶ 막대 밀기'; $('#bPush').classList.toggle('btn-primary', !l.push);
    $('#bFake').disabled = l.fake.on;
    $$('#bViewSeg button').forEach((x) => x.classList.toggle('on', x.dataset.v === b.view));
    $$('#matSeg button').forEach((x) => x.classList.toggle('on', x.dataset.v === b.mat));
    $$('#magSeg button').forEach((x) => x.classList.toggle('on', +x.dataset.v === b.mag));
    $('#bFast').classList.toggle('btn-primary', b.fast); $('#bFast').textContent = b.fast ? '⏩ 빠르게 (3배)' : '⏩ 빨리 감기';
    $('#bRelease').textContent = b.run ? '↺ 다시 놓기' : '▶ 진자 놓기';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  function readouts() {
    let a, b, c; const m = S.mode, masked = (g) => S.gate === g;
    if (m === 'flux') { const f = S.f; a = ['B · A', f.B.toFixed(1) + ' T · ' + f.A.toFixed(3) + ' m²']; b = ['각도 θ', f.th + '°']; c = ['자기선속 Φ', phiStr(PHI()) + ' Wb']; }
    else if (m === 'emf') { const e = S.e; a = ['N · ΔΦ', e.N + '회 · ' + e.dp.toFixed(3) + ' Wb']; b = ['Δt · ΔΦ/Δt', e.dt.toFixed(2) + ' s · ' + g3(e.dp / e.dt) + ' Wb/s']; c = ['기전력 ε', masked('me2') ? '?' : fmtEps(epsOf()) + ' V']; }
    else if (m === 'lenz') {
      const l = S.l;
      if (l.view === 'mag') { const ia = Math.abs(l.I); a = ['코일 왼쪽 면', ia > 0.12 ? (l.I < 0 ? 'N극' : 'S극') : '—']; b = ['코일 오른쪽 면', ia > 0.12 ? (l.I > 0 ? 'N극' : 'S극') : '—']; c = ['유도 전류', ia > 0.06 ? '흐르는 중' : '0']; }
      else if (l.view === 'rail') { a = ['ε = BLv', (l.push ? p3(railEps()) : '0') + ' V']; b = ['I = ε/R', (l.push ? p3(railI()) : '0') + ' A']; c = ['F = BIL', masked('ml2') ? '?' : (l.push ? p3(railF()) : '0') + ' N']; }
      else { const f = l.fake; a = ['막대 속력', p3(f.v) + ' m/s']; b = ['운동 에너지', p3(0.05 * f.v * f.v) + ' J']; c = ['외력이 한 일', '0 J']; }
    } else {
      const bb = S.b;
      if (bb.view === 'pend') { a = ['판의 재질', MATS[bb.mat].name]; b = ['경과 시간', bb.t.toFixed(1) + ' s']; c = ['자석 세기', MAGS[bb.mag].name + ' (' + MAGS[bb.mag].B.toFixed(2) + ' T)']; }
      else { a = ['자석 세기', MAGS[bb.mag].name + ' (' + MAGS[bb.mag].B.toFixed(2) + ' T)']; b = ['경과 시간', bb.pipe.t.toFixed(2) + ' s']; c = ['구리 파이프 도착', bb.pipe.fin.c ? bb.pipe.fin.c.toFixed(1) + ' s' : '—']; }
    }
    [[l1, v1, a], [l2, v2, b], [l3, v3, c]].forEach((z) => { if (z[0].textContent !== z[2][0]) z[0].textContent = z[2][0]; if (z[1].textContent !== z[2][1]) z[1].textContent = z[2][1]; });
  }

  /* ---------- 입력 도구 ---------- */
  const numEps = makePlain($('#numEHost'), '① 유도 기전력의 크기 ε', 'ε =', 'V');
  const numI = makePlain($('#numEHost'), '② 총 저항이 10 Ω일 때 유도 전류 I', 'I =', 'A');
  const numF = makePlain($('#numFHost'), '막대가 받는 자기력 F = B²L²v/R (B = 0.50 T, L = 0.40 m, v = 3.0 m/s, R = 0.30 Ω)', 'F =', 'N');
  const selFR = [['코일 면을 자기장과 나란하게 놓았을 때(θ = 90°) 자기선속 Φ는?', ['Φ = BA (최대)', 'Φ = BA/2', 'Φ = 0', 'Φ = −BA'], 2]];
  const selPR = [['외력이 하는 일률 Fv는 저항에서 나오는 열의 일률 I²R과?', ['같아요', 'Fv가 더 커요', 'Fv가 더 작아요'], 0]];
  const selBR = [
    ['플라스틱 판이 거의 느려지지 않는 까닭은?', ['도체가 아니라서 와전류가 흐르지 않기 때문이에요', '플라스틱은 가벼워서 자석이 끌어당기지 못해요', '플라스틱이 자기장을 모두 막아 버리기 때문이에요'], 0],
    ['틈이 있는 구리판이 덜 느려지는 까닭은?', ['틈이 와전류의 흐름을 끊어 전류가 약해지기 때문이에요', '틈 때문에 판이 가벼워져 공기 저항이 줄어서예요', '틈으로 자기장이 새어 자석이 약해져서예요'], 0],
    ['롤러코스터에 마찰 브레이크 대신 자기 브레이크를 쓰는 장점은?', ['접촉이 없어 닳지 않고 속력에 따라 부드럽게 제동돼요', '정지한 뒤에도 계속 강하게 붙잡아 줘요', '운동 에너지가 사라져서 열이 전혀 생기지 않아요'], 0],
  ];
  const selF = { st: {}, ok: {} }, selP = { st: {}, ok: {} }, selB = { st: {}, ok: {} };
  const selFs = makeSelects($('#selFHost'), selFR, selF.st, selF.ok);
  const selPs = makeSelects($('#numFHost'), selPR, selP.st, selP.ok);
  const selBs = makeSelects($('#selBHost'), selBR, selB.st, selB.ok);
  const lenzSeen = () => S.l.seen.ap >= 0.35 && S.l.seen.le >= 0.35;
  const matsDone = () => MKEYS.every((k) => S.b.rec[k]);
  function syncFlux() { const f = S.f; f.dB = f.B; f.dA = f.A; f.dth = f.th; f.phiD = phiOf(f.B, f.A, f.th); f.rate = 0; f.gal.value = 0; f.gal.target = 0; f.gal.velocity = 0; }
  function setFlux(B, A, th) { Object.assign(S.f, { B, A, th }); syncFlux(); }
  function setEmf(N, dp, dt) { Object.assign(S.e, { N, dp, dt }); eReset(); }
  function setupLenzMag() { const l = S.l; setLView('mag'); l.mx = l.tx = 70; l.vx = 0; l.I = 0; l.flip = 1; l.seen = { ap: 0, le: 0 }; }
  function setupBrake(view, mat, mag) { const b = S.b; b.view = view; b.mat = mat; b.mag = mag; b.fast = false; pendReset(); pipeReset(); }

  /* ================= 미션 ================= */
  const MS = {};
  const levels = [
    {
      title: '자기선속: 코일을 지나는 자기력선의 수', short: '자기선속', icon: '🧲', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 마찰이 없는데도 자석 사이를 지나는 금속판은 왜 느려질까?</p>' +
        '<div class="si-link">🔗 <b>통합과학 「전자기 유도와 발전기」</b>에서 코일 근처에서 자석을 움직일 때 전류가 유도되는 것을 배웠어요(자석이 움직이는 동안만!). 이 단원에서는 그 까닭을 <b>자기선속</b>이라는 양으로 정량적으로 설명해요.</div>' +
        '<p>균일한 자기장 B 속에 면적 A인 코일을 놓으면 코일을 지나는 자기력선의 수가 자기선속 <b>Φ = BA cosθ</b>예요. B, A, θ를 바꿔 Φ가 어떻게 달라지는지 보고, 검류계 바늘이 언제 움직이는지 살펴봐요.</p>',
      features: ['flux'],
      setup() { S.gate = ''; setFlux(0.5, 0.02, 0); setScene('flux'); },
      recap: '자기선속 Φ = BA cosθ. Φ가 변하는 동안에만 유도 전류가 흘러요.',
      summary: '<ul><li><b>자기선속</b> Φ = B A cosθ (단위 Wb = T·m²). θ는 자기장 B와 코일 면의 수직선 사이의 각이에요.</li><li>예) B = 0.50 T, A = 0.020 m², θ = 0° → Φ = 0.010 Wb, θ = 60° → <b>0.0050 Wb</b>, θ = 90° → <b>0</b>.</li><li>선속을 바꾸는 방법: ① 자기장 B ② 면적 A ③ 각도 θ를 바꾸기.</li><li>유도 전류는 선속이 <b>변하는 동안만</b> 흘러요. 자기장이 아무리 세도 변하지 않으면 전류가 없어요. (발전기는 코일을 돌려 θ를 계속 바꿔요.)</li></ul>',
      missions: [
        {
          title: 'Φ = 0.0050 Wb 만들기',
          goal: 'B, 면적 A, 각도 θ를 바꿔 자기선속 <b>Φ = 0.0050 Wb</b>를 만들어 보세요.',
          hint: 'Φ = B·A·cosθ. B = 0.5 T, A = 0.020 m²일 때 cos θ = 0.5 이면 되니까 θ = 60°예요. 다른 조합도 괜찮아요.',
          setup() { S.gate = ''; setFlux(0.5, 0.02, 0); setScene('flux'); },
          check: () => phiStr(PHI()) === '0.0050', hold: 0.8,
          status: () => mark(phiStr(PHI()) === '0.0050') + ' Φ = ' + phiStr(PHI()) + ' Wb (목표 0.0050 Wb)',
          explain: 'Φ = BA cosθ = 0.50 × 0.020 × cos 60° = <b>0.0050 Wb</b>예요. 코일 면이 기울어질수록 코일을 통과하는 자기력선이 줄어요. 바늘이 움직이는 동안은 Φ가 변하는 중이었다는 점도 확인했죠?',
        },
        {
          title: '코일을 자기장과 나란히', manual: true,
          goal: 'θ를 <b>90°</b>로 돌려 코일 면을 자기장과 나란하게 하고, 이때의 Φ를 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'θ = 90°이면 cos 90° = 0이에요. 주황색 선(코일을 지나는 자기력선)이 하나도 없어지는지 보세요.',
          setup() { S.gate = 'mf2'; setFlux(0.5, 0.02, 0); resetSels(selFs, selF.st, selF.ok); setScene('flux'); },
          check: () => (S.f.th !== 90 ? 'θ 슬라이더를 90°로 돌려 코일 면을 자기장과 나란하게 만들어 보세요.' : checkSel(selFR, selF.st, selF.ok, selFs, '다시 생각해 보세요. Φ = BA cosθ 에서 cos 90° 는 얼마일까요?')),
          status: () => mark(S.f.th === 90) + ' θ = ' + S.f.th + '° &nbsp; ' + mark(!!selF.st[0]) + ' Φ 고르기',
          explain: 'θ = 90°이면 코일 면이 자기력선과 나란해서 코일을 통과하는 선이 없어요. Φ = BA cos 90° = <b>0</b>이에요. 같은 B, 같은 A라도 방향에 따라 선속은 최대(BA)에서 0까지 달라져요.',
        },
        {
          type: 'quiz', title: '센 자기장 속에 가만히 놓인 코일',
          goal: '아주 센 자기장(B = 1.0 T) 속에 코일을 가만히 두었어요. 선속은 크지만 변하지 않아요. 유도 전류는?',
          setup() { S.gate = ''; setFlux(1.0, 0.03, 0); setScene('flux'); },
          choices: ['흐르지 않아요 — 유도 전류는 선속이 변하는 동안에만 흘러요', '자기장이 세니까 계속 크게 흘러요', '자기장이 셀수록 전류가 점점 더 커져요', '선속이 크면 전류의 방향이 계속 바뀌어요'],
          answer: 0,
          feedback: ['', '자기장이 세다고 전류가 생기는 것이 아니에요. 선속이 “변해야” 해요. 검류계 바늘은 0을 가리켜요.', '선속이 일정하면 시간이 지나도 전류는 커지지 않아요.', '방향이 바뀌는 것은 선속이 늘다 줄다 할 때예요.'],
          explain: '유도 전류를 만드는 것은 선속의 <b>크기</b>가 아니라 선속의 <b>변화</b>예요. B가 아무리 세도 B·A·cosθ가 일정하면 ΔΦ = 0이라 전류가 흐르지 않아요. 슬라이더를 움직여 Φ가 변할 때만 바늘이 움직였죠?',
        },
      ],
    },
    {
      title: '유도 기전력: ε = NΔΦ/Δt', short: '유도 기전력', icon: '⚡', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 선속이 “변하는 동안만” 전류가 흐르는 것을 봤어요. 이제 선속이 <b>얼마나 빨리</b> 변하는지, 코일을 <b>몇 번</b> 감았는지에 따라 기전력이 어떻게 달라지는지 측정해요.</div>' +
        '<p>코일 속 자석을 빼내면 선속이 ΔΦ에서 0으로 변해요. 패러데이 법칙: 유도 기전력의 크기 <b>ε = N ΔΦ/Δt</b>. Φ–t 그래프의 기울기가 가파를수록 ε가 커요. 변하는 자기장이 전하를 밀어 주는 전기장을 만들기 때문이에요(장이 상호작용을 매개).</p>',
      features: ['emf'],
      setup() { S.gate = ''; setEmf(200, 0.01, 0.1); S.e.rec = {}; setScene('emf'); },
      recap: '유도 기전력의 크기 ε = N ΔΦ/Δt. 선속이 빨리 변할수록(Δt가 짧을수록), 감은 수 N이 많을수록 ε가 커요.',
      summary: '<ul><li><b>패러데이 법칙</b>: 유도 기전력의 크기 ε = N ΔΦ/Δt (Φ–t 그래프의 기울기 × N).</li><li>예) N = 200회, 선속이 0.10 s 동안 0.010 Wb에서 0이 되면 ε = 200 × 0.010 / 0.10 = <b>20 V</b>. 총 저항 10 Ω이면 I = ε/R = <b>2.0 A</b>.</li><li>N이 2배 → ε 2배, Δt가 반 → ε 2배. 선속이 일정하면(기울기 0) ε = 0.</li><li>같은 자석을 넣어도 천천히 넣으면 ε가 작고, 빨리 넣으면 ε가 커요(ΔΦ는 같아도 Δt가 달라요).</li></ul>',
      missions: [
        {
          title: 'Δt를 바꿔 표 4칸 채우기',
          goal: 'N = 200회, ΔΦ = 0.010 Wb로 두고 <b>Δt = 0.05 · 0.10 · 0.20 · 0.40 s</b>를 하나씩 ▶ 자석 빼기 → 📝 표에 기록하여 표 4칸을 채우세요.',
          hint: 'Δt 칩을 고르고 ▶ 자석 빼기를 끝까지 본 다음 📝 표에 기록을 눌러요. 오른쪽 위 표(또는 아래 설명 패널)에 ε가 채워져요. Δt가 반이 되면 ε는 2배가 돼요.',
          setup() { S.gate = ''; setEmf(200, 0.01, 0.1); S.e.rec = {}; setScene('emf'); },
          check: () => DTS.every((d, i) => S.e.rec[i] != null), hold: 0.4,
          status: () => DTS.map((d, i) => mark(S.e.rec[i] != null) + ' ' + d.toFixed(2) + ' s').join(' &nbsp; '),
          explain: 'ε = NΔΦ/Δt = 200 × 0.010 / Δt 이므로 Δt = 0.05 · 0.10 · 0.20 · 0.40 s일 때 ε = <b>40 · 20 · 10 · 5.0 V</b>예요. Δt가 반이 되면 ε가 2배 — ε는 Δt에 반비례하고, Φ–t 그래프 기울기에 비례해요.',
        },
        {
          title: '기전력 20 V 계산하기', manual: true,
          goal: 'N = 200회 코일의 선속이 <b>0.10 s</b> 동안 <b>0.010 Wb</b>에서 0이 될 때 ε와, 총 저항 10 Ω일 때 전류 I를 계산해 입력한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'ε = N·ΔΦ/Δt = 200 × 0.010 / 0.10. 전류는 I = ε/R (R = 10 Ω)이에요.',
          setup() { S.gate = 'me2'; setEmf(200, 0.01, 0.1); numEps.clear(); numI.clear(); setScene('emf'); },
          check: () => {
            const a = checkNum(numEps, 20, 0.03, 'ε = 200 × 0.010 / 0.10 을 계산해 보세요.');
            const b = checkNum(numI, 2.0, 0.03, 'I = ε/R = ε / 10 Ω 을 계산해 보세요.');
            if (a !== true) return a; if (b !== true) return b; return true;
          },
          status: () => '기전력 값은 가려 두었어요 (N = 200, ΔΦ = 0.010 Wb, Δt = 0.10 s)',
          explain: 'ε = NΔΦ/Δt = 200 × 0.010 / 0.10 = <b>20 V</b>, I = ε/R = 20 / 10 = <b>2.0 A</b>예요. 선속의 변화율(기울기) 0.10 Wb/s에 감은 수 200을 곱한 거예요.',
        },
        {
          type: 'quiz', title: '천천히 넣을 때와 빨리 넣을 때',
          goal: '같은 자석을 같은 코일에 <b>천천히</b> 넣을 때와 <b>빨리</b> 넣을 때, 총 선속 변화 ΔΦ는 같은데 기전력이 다른 까닭은?',
          setup() { S.gate = ''; setEmf(200, 0.01, 0.4); setScene('emf'); },
          choices: ['ε는 선속이 변하는 “빠르기” ΔΦ/Δt에 비례하기 때문이에요', '빨리 넣으면 자석이 더 세지기 때문이에요', '빨리 넣으면 코일의 감은 수가 늘어나기 때문이에요', '천천히 넣을 때는 선속이 변하지 않기 때문이에요'],
          answer: 0,
          feedback: ['', '자석의 세기는 그대로예요. 달라진 것은 같은 ΔΦ가 변하는 데 걸린 시간 Δt뿐이에요.', '코일의 감은 수 N은 그대로예요.', '천천히 넣어도 선속은 변해요. 다만 변하는 속도가 느려서 ε가 작을 뿐이에요.'],
          explain: 'ε = NΔΦ/Δt 에서 ΔΦ와 N이 같아도 Δt가 짧으면(빨리 넣으면) ε가 커요. 그래프 기울기 ΔΦ/Δt가 가파르기 때문이에요.',
        },
      ],
    },
    {
      title: '렌츠 법칙: 변화를 방해하는 유도 전류', short: '렌츠 법칙', icon: '🔁', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기전력의 “크기”를 ε = NΔΦ/Δt로 구했어요. 식 ε = −NΔΦ/Δt의 <b>− 부호</b>는 유도 전류의 방향을 말해 줘요.</div>' +
        '<p><b>렌츠 법칙</b>: 유도 전류는 선속의 변화를 <b>방해하는</b> 방향으로 흘러요. 자석을 코일에 가까이 하면 코일이 밀어내고, 멀리하면 끌어당겨요. 막대 도체를 레일 위에서 밀면 ε = BLv, 운동을 막는 힘 F = BIL이 생기고, 이 힘을 이기는 일이 모두 열이 돼요.</p>',
      features: ['lenz'],
      setup() { S.gate = ''; setupLenzMag(); setScene('lenz'); },
      recap: '유도 전류는 선속의 변화를 방해하는 방향으로 흘러요. 그래야 에너지 보존 법칙이 지켜져요.',
      summary: '<ul><li><b>렌츠 법칙</b>: 유도 전류는 선속의 변화를 방해하는 방향으로 흘러요(ε = −NΔΦ/Δt 의 − 부호). N극이 접근하면 코일 면이 N극이 되어 밀어내고, 멀어지면 S극이 되어 끌어당겨요.</li><li>막대 도체(길이 L, 속력 v, 자기장 B): ε = <b>BLv</b>. 예) 0.50 × 0.40 × 3.0 = 0.60 V, R = 0.30 Ω이면 I = 2.0 A.</li><li>막대가 받는 힘은 운동의 반대 방향: F = BIL = B²L²v/R = <b>0.40 N</b>. 일정한 속력으로 밀려면 외력이 같은 크기여야 해요.</li><li>외력의 일률 Fv = 1.2 W = 저항의 열 I²R = 1.2 W → <b>에너지 보존</b>. 만약 유도 전류가 변화를 돕는다면 에너지가 공짜로 생기므로 불가능해요.</li></ul>',
      missions: [
        {
          title: 'N극을 접근시켰다가 멀리하기',
          goal: '자석의 N극이 코일을 향하게 하고 <b>→ 접근</b>과 <b>← 이탈</b>을 해 보세요. 코일의 어느 면이 N극·S극이 되는지, 힘이 어느 쪽인지 살펴봐요.',
          hint: '→ 접근, ← 이탈 버튼을 누르거나 자석을 손가락으로 끌어요. 코일에서 먼 위치에서 1초쯤 움직이면 기록돼요. 자석이 멈추면 전류도 0이에요.',
          setup() { S.gate = ''; setupLenzMag(); setScene('lenz'); },
          check: lenzSeen, hold: 0.3,
          status: () => mark(S.l.seen.ap >= 0.35) + ' N극 접근 &nbsp; ' + mark(S.l.seen.le >= 0.35) + ' N극 멀어짐',
          explain: 'N극이 접근하면 코일을 지나는 선속이 늘어나요. 코일은 이를 방해하려고 N극을 향한 면이 N극이 되도록 전류를 흘려 <b>밀어내요</b>. 멀어질 때는 선속이 줄어드니 그 면이 S극이 되어 <b>끌어당겨요</b>. 어느 쪽이든 자석의 움직임을 방해해요.',
        },
        {
          title: '막대가 받는 자기력 계산하기', manual: true,
          goal: 'B = 0.50 T, L = 0.40 m, v = 3.0 m/s, R = 0.30 Ω일 때 막대가 받는 자기력 F를 계산하고 일률 질문에 답한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'ε = BLv = 0.60 V → I = ε/R = 2.0 A → F = BIL = 0.50 × 2.0 × 0.40. 또는 F = B²L²v/R 이에요.',
          setup() { S.gate = 'ml2'; setLView('rail'); S.l.rv = 3; S.l.rB = 0.5; S.l.push = true; numF.clear(); resetSels(selPs, selP.st, selP.ok); setScene('lenz'); },
          check: () => {
            const a = checkNum(numF, 0.40, 0.03, 'F = BIL = 0.50 × 2.0 × 0.40 을 계산해 보세요. (I = ε/R = 0.60 / 0.30)');
            const b = checkSel(selPR, selP.st, selP.ok, selPs, '막대를 일정한 속력으로 미는 외력의 일은 어디로 갈까요? 에너지 보존을 생각해 보세요.');
            if (a !== true) return a; return b;
          },
          status: () => '힘 값은 가려 두었어요 (ε와 I는 보여요)',
          explain: 'ε = BLv = 0.50 × 0.40 × 3.0 = 0.60 V, I = ε/R = 2.0 A, F = BIL = 0.50 × 2.0 × 0.40 = <b>0.40 N</b>(운동 반대 방향)이에요. 외력의 일률 Fv = 0.40 × 3.0 = 1.2 W = I²R = 4.0 × 0.30 = 1.2 W, 즉 외력이 한 일이 모두 열이 돼요.',
        },
        {
          type: 'quiz', title: '렌츠 법칙과 에너지 보존',
          goal: '렌츠 법칙이 <b>에너지 보존 법칙</b>과 연결되는 까닭은? (🚫 가상 화면을 보세요)',
          setup() { S.gate = ''; setLView('fake'); S.l.fake = { on: true, x: 0, v: 1, done: false, t: 0 }; setScene('lenz'); },
          choices: ['유도 전류가 선속 변화를 돕는다면 외력 없이도 막대가 스스로 빨라져 에너지가 공짜로 생기기 때문이에요', '유도 전류는 항상 자석을 끌어당기기 때문이에요', '렌츠 법칙은 전류가 클수록 에너지가 줄어든다는 뜻이기 때문이에요', '에너지 보존 법칙과 렌츠 법칙은 관계가 없어요'],
          answer: 0,
          feedback: ['', '접근할 때는 밀어내고 멀어질 때는 끌어당겨요. 항상 “변화를 방해하는” 쪽이에요.', '렌츠 법칙은 전류의 “방향”에 관한 법칙이에요.', '유도 전류가 변화를 돕는다면 에너지가 저절로 늘어나서 에너지 보존 법칙이 깨져요. 관련이 깊어요.'],
          explain: '유도 전류가 선속 변화를 도우면 힘이 운동 방향으로 작용해 점점 빨라지고 ε도 더 커져요. 외력이 한 일이 없는데 운동 에너지와 열이 계속 늘어나게 되죠. 그래서 유도 전류는 변화를 <b>방해하는</b> 방향이어야 하고, 렌츠 법칙은 에너지 보존의 결과예요.',
        },
      ],
    },
    {
      title: '자기 브레이크: 와전류가 운동을 막아요', short: '자기 브레이크', icon: '🌪️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 유도 전류가 움직임을 방해하는 힘을 만들고, 그 일이 열이 된다는 것을 배웠어요. 코일 대신 <b>금속판 전체</b>에 유도되는 전류가 <b>와전류</b>예요.</div>' +
        '<p>🔬 탐구 활동: 도체판과 자석으로 자기 브레이크 탐색하기. 판의 재질(구리·알루미늄·플라스틱·틈 있는 구리)과 자석의 세기를 바꿔 진자가 멈추는 시간과 왕복 횟수를 재 봐요. 구리 파이프 속에서 떨어지는 자석도 관찰해요.</p>',
      features: ['brake'],
      setup() { S.gate = ''; S.b.rec = {}; setupBrake('pend', 'cu', 2); setScene('brake'); },
      recap: '도체판 속 와전류가 판의 운동을 방해해요(속력에 비례). 운동 에너지는 열로 바뀌고, 도체가 아니거나 와전류가 끊기면 약해져요.',
      summary: '<ul><li><b>와전류</b>: 금속판 속 선속이 변할 때 판 안에 소용돌이 모양으로 유도되는 전류. 렌츠 법칙에 따라 판과 자석의 상대 운동을 방해해요.</li><li>제동력은 <b>속력에 비례</b>해서 빨리 움직일수록 강하고, 정지하면 사라져요(마찰과 달라요). 운동 에너지는 줄열로 바뀌어 판이 뜨거워져요.</li><li>자석이 셀수록, 판의 저항이 낮을수록(구리 &gt; 알루미늄) 강해요. 판에 틈을 내면 와전류가 끊겨 약해지고, 플라스틱은 도체가 아니라 효과가 없어요.</li><li>구리 파이프 속의 네오디뮴 자석은 자유 낙하(1 m에 약 0.45 s)보다 훨씬 느리게 내려와요. 응용: 열차·롤러코스터의 자기 제동(접촉·마모 없음), 전력량계 원판, 인덕션 레인지.</li></ul>',
      missions: [
        {
          title: '판의 재질 4종 시험하기',
          goal: '구리 · 알루미늄 · 플라스틱 · 틈 있는 구리 <b>4가지 판</b>을 모두 ▶ 진자 놓기로 끝까지 측정해 보세요. (⏩ 빨리 감기를 써도 돼요)',
          hint: '재질 칩을 고르고 ▶ 진자 놓기를 누르면 멈출 때까지 시간과 왕복 횟수가 재져요. 플라스틱은 20 s가 지나도 멈추지 않아 측정이 끝난 걸로 기록돼요.',
          setup() { S.gate = ''; S.b.rec = {}; setupBrake('pend', 'cu', 2); setScene('brake'); },
          check: matsDone, hold: 0.3,
          status: () => MKEYS.map((k) => mark(!!S.b.rec[k]) + ' ' + MATS[k].name).join(' &nbsp; '),
          explain: '같은 자석에서 구리가 가장 빨리 멈추고, 알루미늄은 전기 저항이 더 커서 와전류가 약해 더 오래 걸려요. 틈 있는 구리는 와전류가 끊겨 훨씬 오래 걸리고, 플라스틱은 도체가 아니라 거의 그대로 계속 흔들려요.',
        },
        {
          title: '와전류와 자기 브레이크 정리하기', manual: true,
          goal: '세 질문에 답하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '플라스틱은 도체일까요? 틈은 와전류의 길을 막을까요? 자기 브레이크는 판과 자석이 닿지 않아요.',
          setup() { S.gate = 'mb2'; setupBrake('pend', 'cu', 2); resetSels(selBs, selB.st, selB.ok); setScene('brake'); },
          check: () => checkSel(selBR, selB.st, selB.ok, selBs, '빨간 칸을 다시 골라 보세요. 와전류는 도체 속에서 흐르는 전류예요.'),
          status: () => '고른 문제 ' + selBR.filter((r, i) => selB.st[i]).length + ' / 3',
          explain: '플라스틱은 부도체라 와전류가 흐르지 않아요. 틈은 와전류가 흐를 길을 끊어 제동력을 줄여요. 자기 브레이크는 접촉하지 않아 마모가 없고, 제동력이 속력에 비례해 부드럽게 줄어들어요(정지 후에는 붙잡지 못해서 보통 마찰 브레이크와 함께 써요).',
        },
      ],
    },
  ];
  levels.forEach((lv) => lv.missions.forEach((m) => { MS[m.title] = m; }));

  game = SciSim.game({
    simId: 'hq-faraday-law', mount: '#game', badge: '패러데이 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { flux: '🧲 자기선속 Φ = BA cosθ', emf: '⚡ Φ–t 그래프 · 전압계', lenz: '🔁 자석·코일 · 막대·레일', brake: '🌪️ 도체판 진자 · 구리 파이프' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) { return lenzDown(p); },
    move(p) { if (S.l.drag) { S.l.tx = clamp(lp(p).x + (S.l.dx || 0), 60, 440); } },
    up() { S.l.drag = false; },
    hover(p) { if (S.mode !== 'lenz' || S.l.view !== 'mag') return 'default'; const q = lp(p); return Math.abs(q.x - S.l.mx) < MAG.w / 2 + 12 && Math.abs(q.y - COIL.y) < MAG.h / 2 + 22 ? 'grab' : 'default'; },
  });

  /* ---------- 시작 ---------- */
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    if (S.mode === 'flux') stepFlux(dt); else if (S.mode === 'emf') stepEmf(dt); else if (S.mode === 'lenz') stepLenz(dt); else stepBrake(dt);
    sceneBg();
    T(14, 26, TITLE[S.mode], PHONE ? 12.5 : 16.5, '#26324a', 'left', 800);
    if (S.mode === 'flux') drawFlux(); else if (S.mode === 'emf') drawEmf();
    else if (S.mode === 'lenz') { if (S.l.view === 'mag') drawLenzMag(); else drawRails(S.l.view === 'fake'); }
    else if (S.b.view === 'pend') drawPend(); else drawPipeScene();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SC, STP, IN, MS, PEND, MATS, MKEYS, DTS, numEps, numI, numF, selFs, selPs, selBs, selF, selP, selB,
    get game() { return game; }, setScene, updateCtl, setFlux, setEmf, runEmf, recEmf, setLView, setupLenzMag, startAuto, pendRelease, pendReset, pipeReset,
    PHI, phiStr, epsOf, railF, railI, railEps, lenzSeen, matsDone, lp,
  };

})();
