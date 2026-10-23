/* =========================================================
   전자기와 양자 Ⅰ. 전자기적 상호작용 - 로런츠 힘 (단원 5차시)
   성취기준 [12전자01-04] 로런츠 힘이 발생하는 조건을 알고, 로런츠 힘과 관련된 현상과 기술을 설명할 수 있다.
   ① 관찰: 힘의 조건 (정지 · 나란히 · 수직 · 비스듬히, 양전하와 음전하, 전기장과 비교)
   ② 실험: 힘의 크기 F = |q|vB sinθ (벡터 · 달리는 입자 · 도선 확대 F = BIL)
   ③ 탐구: 원운동 r = mv/(qB), T = 2πm/(qB), 나선 운동
   ④ 분석: 거품 상자 궤적 해석 (부호, 운동량 p = qBr)
   전기장과 자기장이 함께 있는 경우(속도 선택기는 다음 차시), 상대론적 효과는 다루지 않아요.
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

  /* ---------- 타원 적분 · 고리 전류의 자속 함수 (단위: μ₀·I·R) ---------- */
  function ellipKE(m) {
    m = Math.min(m, 1 - 1e-12);
    let a = 1, b = Math.sqrt(1 - m), sum = 0.5 * m, pw = 0.5;
    for (let i = 0; i < 12; i++) {
      const c = (a - b) / 2, an = (a + b) / 2, bn = Math.sqrt(a * b);
      a = an; b = bn; pw *= 2; sum += pw * c * c;
      if (c < 1e-14) break;
    }
    const K = Math.PI / (2 * a);
    return [K, K * (1 - sum)];
  }
  function psiLoop(rho, z) {                    // 반지름 1인 고리 하나가 만드는 자속 함수 ψ = 2πρA (μ₀I 단위)
    rho = Math.abs(rho);
    const D2 = 1 + rho * rho + z * z + 2 * rho, m = 4 * rho / D2;
    let f;
    if (m < 1e-4) f = Math.PI * m / 16;
    else { const ke = ellipKE(m); f = ((2 - m) * ke[0] - 2 * ke[1]) / m; }
    return 2 * Math.PI * rho * (1 / (4 * Math.PI)) * 4 / Math.sqrt(D2) * f;
  }

  /* ---------- 등고선(마칭 스퀘어) : 같은 간격의 수준마다 한 줄씩 → 선 밀도 = 세기 ---------- */
  function makeGrid(x0, y0, w, h, cs) { const nx = Math.ceil(w / cs) + 1, ny = Math.ceil(h / cs) + 1; return { x0, y0, cs, nx, ny, v: new Float32Array(nx * ny) }; }
  function fillGrid(g, fn) { for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) g.v[j * g.nx + i] = fn(g.x0 + i * g.cs, g.y0 + j * g.cs); }
  /* levels: 오름차순 수준 배열. 반환: 수준마다 {path, segs: [mx,my,...]} */
  function contourLevels(g, levels) {
    const out = levels.map(() => ({ path: new Path2D(), segs: [] })), { nx, ny, cs, v } = g, nL = levels.length;
    if (!nL) return out;
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = v[j * nx + i], b = v[j * nx + i + 1], c = v[(j + 1) * nx + i + 1], d = v[(j + 1) * nx + i];
        const mn = Math.min(a, b, c, d), mx = Math.max(a, b, c, d);
        if (mx < levels[0] || mn > levels[nL - 1]) continue;
        // 이 칸을 지나는 수준 구간을 이분 탐색으로 찾기
        let lo = 0, hi = nL; while (lo < hi) { const m = (lo + hi) >> 1; if (levels[m] < mn) lo = m + 1; else hi = m; }
        const x = g.x0 + i * cs, y = g.y0 + j * cs;
        for (let k = lo; k < nL && levels[k] <= mx; k++) {
          const L = levels[k], p = [];
          const cr = (v1, v2, x1, y1, x2, y2) => { if ((v1 > L) !== (v2 > L)) { const t = (L - v1) / (v2 - v1); p.push(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t); } };
          cr(a, b, x, y, x + cs, y); cr(b, c, x + cs, y, x + cs, y + cs); cr(d, c, x, y + cs, x + cs, y + cs); cr(a, d, x, y, x, y + cs);
          const o = out[k];
          if (p.length === 4) { o.path.moveTo(p[0], p[1]); o.path.lineTo(p[2], p[3]); o.segs.push((p[0] + p[2]) / 2, (p[1] + p[3]) / 2); }
          else if (p.length === 8) { o.path.moveTo(p[0], p[1]); o.path.lineTo(p[6], p[7]); o.path.moveTo(p[2], p[3]); o.path.lineTo(p[4], p[5]); o.segs.push((p[0] + p[6]) / 2, (p[1] + p[7]) / 2, (p[2] + p[4]) / 2, (p[3] + p[5]) / 2); }
        }
      }
    }
    return out;
  }
  /* 등고선 위에 방향 화살표 놓을 자리 고르기 (dirFn(x,y) → {x,y} 단위 방향) */
  function pickArrows(cont, dirFn, gap, minD) {
    const arrows = [];
    cont.forEach((c) => {
      const mine = [];
      for (let i = 0; i < c.segs.length; i += 2) {
        const x = c.segs[i], y = c.segs[i + 1];
        let ok = true;
        for (let k = 0; k < mine.length; k++) if (Math.hypot(mine[k].x - x, mine[k].y - y) < gap) { ok = false; break; }
        if (ok) for (let k = 0; k < arrows.length; k++) if (Math.hypot(arrows[k].x - x, arrows[k].y - y) < minD) { ok = false; break; }
        if (ok) { const d = dirFn(x, y); if (d) { const a = { x, y, dx: d.x, dy: d.y }; mine.push(a); arrows.push(a); } }
      }
    });
    return arrows;
  }
  function drawArrowHeads(arrows, color, sz) {
    ctx.fillStyle = color || 'rgba(30,64,175,.9)'; sz = sz || 1;
    arrows.forEach((a) => {
      const ux = a.dx, uy = a.dy;
      ctx.beginPath(); ctx.moveTo(a.x + ux * 6 * sz, a.y + uy * 6 * sz); ctx.lineTo(a.x - ux * 5 * sz - uy * 4.5 * sz, a.y - uy * 5 * sz + ux * 4.5 * sz); ctx.lineTo(a.x - ux * 5 * sz + uy * 4.5 * sz, a.y - uy * 5 * sz - ux * 4.5 * sz); ctx.closePath(); ctx.fill();
    });
  }
  /* 선을 따라 흐르는 점: 방향 함수로 입자를 옮김 */
  function makeFlow(n) { const a = []; for (let i = 0; i < n; i++) a.push({ x: 0, y: 0, age: 99, life: 3 + Math.random() * 3 }); return a; }
  function stepFlow(flow, cont, dirFn, dt, speed, rect) {
    const segLists = cont.filter((c) => c.segs.length > 0);
    flow.forEach((f) => {
      f.age += dt;
      if (f.age > f.life || f.x < rect.x0 || f.x > rect.x1 || f.y < rect.y0 || f.y > rect.y1) {
        if (!segLists.length) { f.age = 99; return; }
        const c = segLists[(Math.random() * segLists.length) | 0], k = ((Math.random() * c.segs.length / 2) | 0) * 2;
        f.x = c.segs[k]; f.y = c.segs[k + 1]; f.age = 0; f.life = 2 + Math.random() * 3; return;
      }
      const d1 = dirFn(f.x, f.y); if (!d1) { f.age = 99; return; }
      const d2 = dirFn(f.x + d1.x * speed * dt / 2, f.y + d1.y * speed * dt / 2) || d1;
      f.x += d2.x * speed * dt; f.y += d2.y * speed * dt;
    });
  }
  function drawFlow(flow) {
    if (RM) return;
    flow.forEach((f) => {
      if (f.age > f.life) return;
      const a = Math.min(1, f.age * 2.5, (f.life - f.age) * 2.5);
      ctx.fillStyle = 'rgba(245,158,11,' + (0.95 * a) + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, 2.6, 0, TAU); ctx.fill();
    });
  }
  /* 나침반 (바늘의 붉은 끝 = N극이 향하는 방향) */
  function makeNeedle(ang) { return { a: ang, w: 0 }; }
  function stepNeedle(nd, target, dt, k) {
    const steps = Math.max(1, Math.ceil(dt / 0.008)), h = dt / steps;
    for (let i = 0; i < steps; i++) { const err = wrapPi(target - nd.a + 1e-4); nd.w += (k * err - 5 * nd.w) * h; nd.a += nd.w * h; }
  }
  function drawCompass(x, y, R, nd, o) {
    o = o || {};
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); }, { blur: 4, y: 1.5 });
    ctx.strokeStyle = o.rim || '#64748b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
    const L = R * 0.82, w = R * 0.26, c = Math.cos(nd.a), s = Math.sin(nd.a);
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(x + c * L, y + s * L); ctx.lineTo(x - s * w, y + c * w); ctx.lineTo(x + s * w, y - c * w); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3b6fe0'; ctx.beginPath(); ctx.moveTo(x - c * L, y - s * L); ctx.lineTo(x - s * w, y + c * w); ctx.lineTo(x + s * w, y - c * w); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(x, y, Math.max(1.2, R * 0.12), 0, TAU); ctx.fill();
  }
  /* 도선 단면 (⊙ 나오는 방향 / ⊗ 들어가는 방향) */
  function drawWireDot(x, y, r, out, o) {
    o = o || {};
    D.shadow(() => { ctx.fillStyle = o.fill || '#d9a441'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }, { blur: 5, y: 1.5 });
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); g.addColorStop(0, '#fff3c4'); g.addColorStop(1, o.fill || '#d9a441');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7c5a12'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    if (o.q) { return; }
    ctx.fillStyle = '#4a3408'; ctx.strokeStyle = '#4a3408'; ctx.lineWidth = Math.max(1.4, r * 0.18);
    if (out) { ctx.beginPath(); ctx.arc(x, y, r * 0.28, 0, TAU); ctx.fill(); }
    else { const d = r * 0.5; ctx.beginPath(); ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d); ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d); ctx.stroke(); }
  }
  const FIELD_NOTE = ['⊙', '⊗'];

  const QE = 1.6e-19, ME = 9.11e-31, MP = 1.67e-27, G = 9.8;
  const MODE_LABEL = { cond: '🧭 힘의 조건', mag: '📐 힘의 크기', orb: '🌀 원운동', trk: '🔍 궤적 해석' };
  const TITLE = { cond: '🧭 자기장(⊙) 속의 전하 — 이 방향으로 쏘면 힘을 받을까?', mag: '📐 F = qvB sinθ — 힘의 크기와 방향', orb: '🌀 B에 수직으로 들어간 전하의 원운동 (위에서 본 모습)', trk: '🔍 거품 상자 사진 속 궤적 읽기 (B는 지면에서 나와요 ⊙)' };
  const CXs = SC.w / 2, CYs = SC.h / 2;

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'cond', t: 0, fade: 0, gate: '',
    c: { kase: 'perp', sign: 1, field: 'B', seen: {}, p: null, trail: [], launchT: -1, lastFlight: 0, sawE: false },
    m: { view: 'vec', q: 1, v: 2.0, B: 1.0, th: 90, Fd: 0, ph: 0, trail: [], runT: 0 },
    o: { sp: 'e', v: 2.0, B: 1.0, th: 90, cmp: false, ph: 0, ph2: 0, t: 0, trail: [], trail2: [], zS: [], seenR: false },
    k: { fig: 'a', guess: { a: {}, b: {} }, fast: '', tt: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');

  /* ================= ① 힘의 조건 (비스듬히 본 3차원 상자) ================= */
  const BOX = { w: 260, h: 200, d: 300, ox: 150, oy: 268, kx: 0.28, ky: 0.22 };
  const proj = (x, y, z) => ({ x: BOX.ox + x - BOX.kx * z, y: BOX.oy - y + BOX.ky * z });
  const V0 = 110, W0 = 2.4, AE = 70;
  const CASES = {
    rest: { name: '정지', th: null, label: 'v = 0' },
    par: { name: 'B와 나란히', th: 0, label: 'θ = 0°' },
    perp: { name: 'B에 수직', th: 90, label: 'θ = 90°' },
    obl: { name: '비스듬히', th: 30, label: 'θ = 30°' },
  };
  const KASES = ['rest', 'par', 'perp', 'obl'];
  function newParticle() {
    const c = S.c, k = c.kase;
    const p = { x: 90, y: 100, z: 150, vx: 0, vy: 0, vz: 0, t: 0, out: false };
    if (k === 'par') { p.z = 5; p.vz = V0; }
    else if (k === 'perp') { p.vx = V0; }
    else if (k === 'obl') { p.z = 5; p.vx = V0 * Math.sin(30 * DEG); p.vz = V0 * Math.cos(30 * DEG); }
    return p;
  }
  function launch() {
    const c = S.c; c.p = newParticle(); c.trail = []; c.launchT = S.t; c.lastFlight = 0;
    Sound.click(); updateCtl();
  }
  function clearC() { const c = S.c; c.p = null; c.trail = []; c.launchT = -1; c.lastFlight = 0; updateCtl(); }
  function stepCond(dt) {
    const c = S.c, p = c.p; if (!p || p.out) return;
    const n = 4, h = dt / n, s = c.sign;
    for (let i = 0; i < n; i++) {
      if (c.field === 'B') {
        const a = s * W0 * h / 2, ca = Math.cos(a), sa = Math.sin(a);
        let vx = p.vx * ca + p.vy * sa, vy = -p.vx * sa + p.vy * ca;
        p.x += vx * h; p.y += vy * h; p.z += p.vz * h;
        const a2 = s * W0 * h / 2, c2 = Math.cos(a2), s2 = Math.sin(a2);
        p.vx = vx * c2 + vy * s2; p.vy = -vx * s2 + vy * c2;
      } else {
        p.vy += s * AE * h; p.x += p.vx * h; p.y += p.vy * h - 0 + 0; p.z += p.vz * h;
      }
    }
    p.t += dt; c.lastFlight = p.t;
    const sp = proj(p.x, p.y, p.z);
    c.trail.push(sp.x, sp.y); if (c.trail.length > 1600) c.trail.splice(0, 2);
    if (p.x < 0 || p.x > BOX.w || p.y < 0 || p.y > BOX.h || p.z < 0 || p.z > BOX.d) { p.out = true; }
    if (c.field === 'B' && p.t > 1.4 && !c.seen[c.kase]) { c.seen[c.kase] = true; Sound.success(); }
    if (c.field === 'E' && p.t > 1.0) c.sawE = true;
  }
  const speedC = () => { const p = S.c.p; return p ? Math.hypot(p.vx, p.vy, p.vz) : 0; };
  function boxEdges() {
    const P = (x, y, z) => proj(x, y, z);
    ctx.save(); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(100,116,139,.55)';
    const a = P(0, 0, 0), b = P(BOX.w, 0, 0), c = P(BOX.w, BOX.h, 0), d = P(0, BOX.h, 0), e = P(0, 0, BOX.d), f = P(BOX.w, 0, BOX.d), g = P(BOX.w, BOX.h, BOX.d), hh = P(0, BOX.h, BOX.d);
    ctx.fillStyle = 'rgba(124,58,237,.05)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
    ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.moveTo(a.x, a.y); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(f.x, f.y); ctx.moveTo(c.x, c.y); ctx.lineTo(g.x, g.y); ctx.moveTo(d.x, d.y); ctx.lineTo(hh.x, hh.y);
    ctx.moveTo(e.x, e.y); ctx.lineTo(f.x, f.y); ctx.lineTo(g.x, g.y); ctx.lineTo(hh.x, hh.y); ctx.closePath(); ctx.stroke();
    ctx.restore();
    return { e, f, g, hh };
  }
  function drawCond() {
    const c = S.c, p = c.p, isB = c.field === 'B';
    sceneBegin();
    ctx.fillStyle = 'rgba(100,116,139,.10)';
    for (let x = 18; x < SC.w; x += 26) for (let y = 18; y < SC.h; y += 26) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, TAU); ctx.fill(); }
    const fr = boxEdges();
    // 장 표시
    if (isB) {
      [[60, 50], [200, 50], [60, 150], [200, 150]].forEach((q) => {
        const a = proj(q[0], q[1], 0), b = proj(q[0], q[1], BOX.d);
        D.arrow(a.x, a.y, b.x, b.y, { color: 'rgba(124,58,237,.55)', width: 2, head: 9 });
      });
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const q = proj(45 + i * 85, 55 + j * 90, BOX.d);
        ctx.strokeStyle = 'rgba(124,58,237,.8)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(q.x, q.y, 6.5, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(124,58,237,.9)'; ctx.beginPath(); ctx.arc(q.x, q.y, 2, 0, TAU); ctx.fill();
      }
      const lb = proj(BOX.w - 4, BOX.h + 2, BOX.d); lbl(lb.x + 20, lb.y + 22, 'B ⊙ 화면 밖으로', { bg: COL_B, color: '#fff', size: 12.5, pad: 7, minX: 0, maxX: SC.w });
    } else {
      for (let i = 0; i < 5; i++) {
        const q = 25 + i * 52, a = proj(q, 14, 150), b = proj(q, BOX.h - 14, 150);
        D.arrow(a.x, a.y, b.x, b.y, { color: 'rgba(37,99,235,.55)', width: 2.2, head: 9 });
      }
      const lb = proj(BOX.w - 4, BOX.h + 2, BOX.d); lbl(lb.x + 20, lb.y + 22, 'E ↑ 위쪽', { bg: COL_E, color: '#fff', size: 12.5, pad: 7, minX: 0, maxX: SC.w });
    }
    // 축 방향 안내
    const axo = proj(0, 0, BOX.d);
    // 자취
    if (c.trail.length > 4) {
      ctx.strokeStyle = c.sign > 0 ? 'rgba(226,70,75,.8)' : 'rgba(47,109,246,.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(c.trail[0], c.trail[1]); for (let i = 2; i < c.trail.length; i += 2) ctx.lineTo(c.trail[i], c.trail[i + 1]); ctx.stroke();
    }
    // 입자
    const pp = p || newParticle(), sp = proj(pp.x, pp.y, pp.z), col = c.sign > 0 ? POS : NEG;
    if (!(p && p.out)) {
      // 바닥 그림자
      const sh = proj(pp.x, 0, pp.z); ctx.fillStyle = 'rgba(30,41,59,.16)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 9, 4, 0, 0, TAU); ctx.fill();
      const sz = 8 + 2.5 * (pp.z / BOX.d);
      D.glow(sp.x, sp.y, 20, col, 0.28); D.sphere(sp.x, sp.y, sz, col, { shadow: true, text: c.sign > 0 ? '+' : '−' });
      // 속도 · 힘 화살표
      const sv = Math.hypot(pp.vx, pp.vy, pp.vz);
      if (p && sv > 4) {
        const ux = pp.vx - BOX.kx * pp.vz, uy = -pp.vy + BOX.ky * pp.vz, um = Math.hypot(ux, uy) || 1, L = 40 * sv / V0;
        D.arrow(sp.x + ux / um * 12, sp.y + uy / um * 12, sp.x + ux / um * (12 + L), sp.y + uy / um * (12 + L), { color: COL_V, width: 3.5, head: 9 });
        T(sp.x + ux / um * (12 + L) + 8, sp.y + uy / um * (12 + L) - 6, 'v', 13, COL_V, 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
      }
      let fx = 0, fy = 0;
      if (p) { if (isB) { fx = c.sign * pp.vy / V0; fy = -c.sign * pp.vx / V0; } else { fy = c.sign; } }
      const fm = Math.hypot(fx, fy);
      if (p && fm > 0.04) {
        const sx = fx, sy = -fy, m = Math.hypot(sx, sy), L = 46 * fm;
        D.arrow(sp.x + sx / m * 12, sp.y + sy / m * 12, sp.x + sx / m * (12 + L), sp.y + sy / m * (12 + L), { color: COL_F, width: 4, head: 10 });
        T(sp.x + sx / m * (12 + L) + 10, sp.y + sy / m * (12 + L) + 4, 'F', 14, '#9a3412', 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
      } else if (p && isB && !p.out) {
        lbl(sp.x + 40, sp.y - 26, 'F = 0', { bg: '#475569', color: '#fff', size: 13, pad: 7, minX: 0, maxX: SC.w });
      }
    }
    if (p && p.out) lbl(CXs, 28, '상자를 벗어났어요 — 다시 쏴 보세요', { size: 13, minX: 0, maxX: SC.w, color: '#9a3412' });
    if (!p) lbl(CXs, 28, '▶ 발사를 눌러 보세요', { size: 13, minX: 0, maxX: SC.w, color: '#9a3412' });
    // 시작 위치 표시
    sceneEnd();
    // 띠: 속력 막대, 힘 막대
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const sv = speedC(), bx = STP.x + 12, bw = STP.w - 24;
    T(bx, STP.y + 20, '속력 v (막대)', 13, '#1e40af', 'left', 800);
    D.roundRect(bx + 90, STP.y + 8, bw - 90, 16, 7); ctx.fillStyle = '#eef1f7'; ctx.fill();
    const fw = clamp(sv / (V0 * 2.4), 0, 1) * (bw - 90); if (fw > 1) { D.roundRect(bx + 90, STP.y + 8, Math.max(3, fw), 16, 7); ctx.fillStyle = COL_V; ctx.fill(); }
    T(bx, STP.y + 46, '힘의 크기 F', 13, '#9a3412', 'left', 800);
    let fmag = 0; if (p && !p.out) { fmag = isB ? Math.hypot(p.vx, p.vy) / V0 : 1; }
    D.roundRect(bx + 90, STP.y + 34, bw - 90, 16, 7); ctx.fillStyle = '#eef1f7'; ctx.fill();
    const fw2 = clamp(fmag, 0, 1) * (bw - 90); if (fw2 > 1) { D.roundRect(bx + 90, STP.y + 34, Math.max(3, fw2), 16, 7); ctx.fillStyle = COL_F; ctx.fill(); }
    T(bx, STP.y + 74, isB ? '자기장: 속력은 그대로, 방향만 바뀌어요' : '전기장: 정지한 전하도 힘을 받고 속력이 점점 커져요', 12.5, isB ? '#0b7a41' : '#9a3412', 'left', 800);
    // 설명 패널
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = IN.y + 24, x = IN.x + 14, mw = IN.w - 28;
    T(x, y, '로런츠 힘 F = qvB sinθ', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    y += textBlock(x, y, mw, 'θ = v와 B 사이의 각. 힘의 방향은 v와 B에 모두 수직이에요.', sz - 0.5, '#26324a', lh - 1, 800) + 2;
    const rows = [['정지', 'v = 0', '0'], ['B와 나란히', 'θ = 0°', '0'], ['B에 수직', 'θ = 90°', '최대'], ['비스듬히', 'θ = 30°', '1/2']];
    rows.forEach((r, i) => {
      const cur = KASES[i] === c.kase && isB, yy = y + i * 26;
      D.roundRect(x - 3, yy, mw + 6, 23, 8); ctx.fillStyle = cur ? '#fff2e5' : '#f3f6fb'; ctx.fill(); ctx.strokeStyle = cur ? '#f26b3a' : '#dbe3f0'; ctx.lineWidth = cur ? 2 : 1.2; ctx.stroke();
      T(x + 5, yy + 16, r[0], 12.5, '#26324a', 'left', 800); T(x + mw * 0.50, yy + 16, r[1], 12.5, '#516079', 'left', 800); T(x + mw - 4, yy + 16, 'F ' + r[2], 12.5, cur ? '#9a3412' : '#516079', 'right', 800);
    });
    y += rows.length * 26 + 18;
    if (!PHONE) {
      y += textBlock(x, y, mw, '음전하(전자)는 같은 조건에서 힘의 방향이 반대예요.', sz - 0.5, '#26324a', lh - 1, 800) + 2;
      y += textBlock(x, y, mw, '전기장은 정지한 전하에도 힘 F = qE를 주지만, 자기장은 움직이는 전하에만 힘을 줘요.', sz - 0.5, '#9a3412', lh - 1, 800) + 2;
      textBlock(x, y + 4, mw, '🔗 장이 상호작용을 매개해요: 자기장이 있는 곳에서 움직이는 전하가 힘을 받아요.', sz - 1, '#0b7a41', lh - 2, 800);
    }
  }
  $$('#caseSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.c.kase = b.dataset.v; clearC(); }));
  $$('#qSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.c.sign = +b.dataset.v; clearC(); }));
  $$('#fieldSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.c.field = b.dataset.v; clearC(); }));
  $('#bLaunch').addEventListener('click', launch);
  $('#bClear').addEventListener('click', () => { Sound.click(); clearC(); });

  /* ================= ② 힘의 크기 ================= */
  const F0 = QE * 2.0e6 * 1.0e-3;                         // 3.2×10⁻¹⁶ N
  const Fm = () => S.m.q * QE * S.m.v * 1e6 * S.m.B * 1e-3 * Math.sin(S.m.th * DEG);
  const MGE = ME * G;
  const WIRE = { I: 5.0, L: 0.20 };
  const logBar = (x) => clamp((Math.log10(x) + 31) / 17, 0, 1);
  function drawVec() {
    const m = S.m, F = Fm();
    sceneBegin();
    const nR = 3 + 2 * Math.round((m.B - 0.5) / 0.5), yS = 60, yE = 340;
    for (let i = 0; i < nR; i++) {
      const y = yS + (yE - yS) * (i + 0.5) / nR;
      D.arrow(18, y, 454, y, { color: 'rgba(124,58,237,' + (0.30 + 0.12 * (m.B / 0.5)) + ')', width: 1.8 + 0.5 * m.B / 0.5, head: 9 });
    }
    lbl(CXs, 22, '자기장 B → (오른쪽) · 선이 많을수록 세요: B = ' + m.B.toFixed(1) + ' mT', { bg: COL_B, color: '#fff', size: 12.5, pad: 8, minX: 0, maxX: SC.w });
    const ox = 190, oy = 210, th = m.th * DEG, Lv = 40 * m.v;
    // θ 호
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, 52, -th, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(30,41,59,.4)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + 120, oy); ctx.stroke(); ctx.setLineDash([]);
    if (m.th > 0) T(ox + 62 * Math.cos(th / 2) + 6, oy - 62 * Math.sin(th / 2) + 4, 'θ = ' + m.th + '°', 13, '#334155', 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    // v 화살표
    if (m.v > 0) { D.arrow(ox, oy, ox + Lv * Math.cos(th), oy - Lv * Math.sin(th), { color: COL_V, width: 4.5, head: 12 }); T(ox + Lv * Math.cos(th) + 8, oy - Lv * Math.sin(th) - 8, 'v', 15, COL_V, 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 }); }
    // 힘 화살표: 전자(−) → 화면 밖(오른쪽 아래 → 왼쪽 아래 대각선)
    const Lf = 30 * F / F0;
    if (Lf > 1.5) { const fx = ox - Lf * 0.62, fy = oy + Lf * 0.62; D.arrow(ox - 6, oy + 6, fx - 6, fy + 6, { color: COL_F, width: 5, head: 13 }); lbl(fx - 74, fy + 14, 'F (화면 밖으로)', { bg: 'rgba(255,255,255,.95)', color: '#9a3412', border: '#f6b08a', size: 12.5, pad: 6, minX: 0, maxX: SC.w }); }
    else lbl(ox - 60, oy + 34, 'F = 0', { bg: '#475569', color: '#fff', size: 13, pad: 8, minX: 0, maxX: SC.w });
    D.glow(ox, oy, 24, NEG, 0.3); D.sphere(ox, oy, 11, NEG, { shadow: true, text: '−' });
    lbl(ox + 78, oy + 4, m.q === 1 ? '전자 (−e)' : '전하 −' + m.q + 'e', { bg: NEG, color: '#fff', size: 12.5, pad: 7, minX: 0, maxX: SC.w });
    lbl(CXs, SC.h - 14, '오른손: 손가락(v) → B로 굽히면 엄지가 +전하의 힘 방향. 음전하는 반대예요.', { size: 12, minX: 0, maxX: SC.w, bg: 'rgba(255,255,255,.92)', color: '#516079' });
    sceneEnd();
    drawMagStrip(F);
    drawMagPanel(F);
  }
  function drawMagStrip(F) {
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, bw = STP.w - 24;
    T(bx, STP.y + 19, 'F = |q|vB sinθ  (로그 눈금: 10⁻³¹ ~ 10⁻¹⁴ N)', 12.5, '#1e40af', 'left', 800);
    const rows = [['자기력 F', F, COL_F], ['전자의 무게 mg', MGE, '#64748b']];
    rows.forEach((r, i) => {
      const y = STP.y + 27 + i * 26;
      T(bx, y + 15, r[0], 12.5, '#26324a', 'left', 800);
      D.roundRect(bx + 100, y + 3, bw - 100, 15, 6); ctx.fillStyle = '#eef1f7'; ctx.fill();
      if (r[1] > 0) { const w = logBar(r[1]) * (bw - 100); D.roundRect(bx + 100, y + 3, Math.max(3, w), 15, 6); ctx.fillStyle = r[2]; ctx.fill(); T(w > 150 ? bx + 100 + w - 8 : bx + 100 + Math.max(3, w) + 7, y + 15, sci(r[1]) + ' N', 12, w > 150 ? '#fff' : '#26324a', w > 150 ? 'right' : 'left', 800); }
      else T(bx + 108, y + 15, '0 N', 12, '#516079', 'left', 800);
    });
  }
  function drawMagPanel(F) {
    const m = S.m, mk = S.gate === 'mm1';
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = IN.y + 24, x = IN.x + 14, mw = IN.w - 28;
    T(x, y, '전자가 받는 로런츠 힘', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    y += textBlock(x, y, mw, 'F = |q| v B sinθ', sz, '#26324a', lh, 800);
    y += textBlock(x, y, mw, '= ' + g3(m.q * 1.6) + '×10⁻¹⁹ × ' + g3(m.v) + '×10⁶ × ' + g3(m.B) + '×10⁻³ × sin ' + m.th + '°', sz - 0.5, '#26324a', lh - 1, 800);
    y += textBlock(x, y, mw, mk ? '= ?' : '= ' + (F > 0 ? sci(F) : '0') + ' N', sz + 1, '#9a3412', lh, 800) + 4;
    y += textBlock(x, y, mw, 'v와 F는 항상 수직이라 힘은 속력을 바꾸지 못하고 방향만 바꿔요 (일 = 0, 운동 에너지 불변).', sz - 0.5, '#0b7a41', lh - 1, 800) + 2;
    if (!PHONE) textBlock(x, y + 4, mw, F > 0 ? '자기력은 전자의 무게의 ' + sci(F / MGE, 1) + '배 → 원운동에서 중력은 무시해요.' : '', sz - 0.5, '#26324a', lh - 1, 800);
  }
  /* 도선 확대 */
  function drawWireZoom() {
    const m = S.m, F = WIRE.I * WIRE.L * m.B * 1e-3;
    sceneBegin();
    ctx.fillStyle = 'rgba(124,58,237,.10)'; for (let x = 24; x < SC.w; x += 40) for (let y = 24; y < SC.h; y += 40) { ctx.strokeStyle = 'rgba(124,58,237,.65)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(124,58,237,.8)'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill(); }
    lbl(CXs, 22, 'B ⊙ 화면 밖으로 = ' + m.B.toFixed(1) + ' mT', { bg: COL_B, color: '#fff', size: 12.5, pad: 8, minX: 0, maxX: SC.w });
    // 도선
    const wy = 150, wx0 = 40, wx1 = 432;
    const g = ctx.createLinearGradient(0, wy - 22, 0, wy + 22); g.addColorStop(0, '#f3c76b'); g.addColorStop(0.5, '#d9a441'); g.addColorStop(1, '#a8741c');
    D.shadow(() => { D.roundRect(wx0, wy - 22, wx1 - wx0, 44, 22); ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 3 });
    D.arrow(wx0 + 6, wy - 38, wx0 + 90, wy - 38, { color: '#d97706', width: 4, head: 11 }); T(wx0 + 98, wy - 33, '전류 I = 5.0 A', 13, '#b45309', 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    // 전하 운반체 (전자 · 왼쪽으로 이동) 와 각각의 힘
    const n = 9, sp = (wx1 - wx0 - 40) / n, off = RM ? 0 : (S.t * 38) % sp;
    for (let i = 0; i < n + 1; i++) {
      const x = wx1 - 24 - ((i * sp + off) % ((n + 1) * sp)) - 0;
      if (x < wx0 + 14 || x > wx1 - 14) continue;
      D.sphere(x, wy, 8, NEG, { shadow: false, text: '−', textScale: 1.1 });
      D.arrow(x, wy + 10, x, wy + 10 + 22 * (m.B / 1.0), { color: COL_F, width: 2.6, head: 7 });
    }
    T(wx0 + 6, wy + 40, '← 전자가 이동 (전류는 →)', 12.5, '#334155', 'left', 800);
    // 전체 힘
    const Lw = 70 * m.B / 1.0; D.arrow(CXs, wy + 52, CXs, wy + 52 + Lw + 30, { color: '#c2410c', width: 8, head: 18 });
    lbl(CXs + 70, wy + 52 + (Lw + 30) / 2, '도선이 받는 힘 F = BIL', { bg: 'rgba(255,255,255,.95)', color: '#9a3412', border: '#f6b08a', size: 13, pad: 7, minX: 0, maxX: SC.w });
    lbl(CXs, SC.h - 14, '각 전하의 힘 qvB를 모두 더하면 도선이 받는 힘 BIL이 돼요.', { size: 12.5, minX: 0, maxX: SC.w, bg: 'rgba(255,255,255,.92)', color: '#516079' });
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    T(STP.x + 12, STP.y + 22, '도선 L = 0.20 m, I = 5.0 A', 13.5, '#1e40af', 'left', 800);
    T(STP.x + 12, STP.y + 46, 'F = BIL = ' + g3(m.B) + '×10⁻³ × 5.0 × 0.20', 13.5, '#26324a', 'left', 800);
    T(STP.x + 12, STP.y + 72, 'F = ' + sci(F) + ' N', 17, '#9a3412', 'left', 800);
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = IN.y + 24, x = IN.x + 14, mw = IN.w - 28;
    T(x, y, '도선이 받는 힘 = 전하들의 합', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    y += textBlock(x, y, mw, '단위 부피당 전하 수 n, 단면적 A, 이동 속력 v 이면 I = nqvA', sz - 0.5, '#26324a', lh - 1, 800) + 2;
    y += textBlock(x, y, mw, '전하 수 nAL, 하나가 받는 힘 qvB', sz - 0.5, '#26324a', lh - 1, 800) + 2;
    y += textBlock(x, y, mw, 'F = nAL × qvB = B(nqvA)L = BIL', sz, '#9a3412', lh, 800) + 2;
    if (!PHONE) textBlock(x, y + 4, mw, '🏭 전동기와 스피커가 도선(코일)이 받는 힘으로 움직여요.', sz - 1, '#0b7a41', lh - 2, 800);
  }
  /* 달리는 입자 (위에서 본 모습, B ⊙) */
  const SCALE_E = 30;
  function orbParamsM() {
    const m = S.m, q = m.q * QE, sin = Math.sin(m.th * DEG);
    const r = ME * m.v * 1e6 * sin / (q * m.B * 1e-3);                    // m
    const w = q * m.B * 1e-3 / ME, T0 = TAU / w;
    return { r, w, T: T0, rpx: r * 100 * SCALE_E };
  }
  const KAPPA_E = TAU / 3.0 / (QE * 1e-3 / ME);                           // 전자, 1 mT에서 한 바퀴 3.0초
  function drawRun() {
    const m = S.m, o = orbParamsM(), cx = CXs, cy0 = 280;
    sceneBegin();
    ctx.fillStyle = 'rgba(100,116,139,.0)';
    for (let x = 24; x < SC.w; x += 40) for (let y = 24; y < SC.h; y += 40) { ctx.strokeStyle = 'rgba(124,58,237,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(124,58,237,.5)'; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill(); }
    lbl(CXs, 22, 'B ⊙ 화면 밖으로 = ' + m.B.toFixed(1) + ' mT', { bg: COL_B, color: '#fff', size: 12.5, pad: 8, minX: 0, maxX: SC.w });
    const rpx = Math.max(o.rpx, 0), ccx = cx, ccy = cy0 - rpx;           // 전자(−): 반시계 방향, 시작점은 아래쪽
    const ph = m.ph;                                                       // 반시계: 각도가 줄어듦
    if (rpx > 1) { ctx.strokeStyle = 'rgba(71,85,105,.35)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(ccx, ccy, rpx, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    if (m.trail.length > 4) { ctx.strokeStyle = 'rgba(47,109,246,.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(m.trail[0], m.trail[1]); for (let i = 2; i < m.trail.length; i += 2) ctx.lineTo(m.trail[i], m.trail[i + 1]); ctx.stroke(); }
    const a = Math.PI / 2 - ph, px = ccx + rpx * Math.cos(a), py = ccy + rpx * Math.sin(a);
    const dvx = Math.sin(a), dvy = -Math.cos(a), Lv = 46, Lf = 34;          // 반시계 방향 접선
    D.glow(px, py, 20, NEG, 0.3); D.sphere(px, py, 9, NEG, { shadow: true, text: '−' });
    D.arrow(px + dvx * 12, py + dvy * 12, px + dvx * (12 + Lv), py + dvy * (12 + Lv), { color: COL_V, width: 3.5, head: 10 });
    T(px + dvx * (12 + Lv) + 6, py + dvy * (12 + Lv) - 6, 'v', 14, COL_V, 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    if (o.rpx > 2 && m.th > 0) { const fx = ccx - px, fy = ccy - py, fm = Math.hypot(fx, fy) || 1; D.arrow(px + fx / fm * 12, py + fy / fm * 12, px + fx / fm * (12 + Lf), py + fy / fm * (12 + Lf), { color: COL_F, width: 3.5, head: 10 }); T(px + fx / fm * (12 + Lf) + 6, py + fy / fm * (12 + Lf) - 4, 'F', 14, '#9a3412', 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 }); }
    if (m.th === 0) lbl(CXs, 190, 'v ∥ B → F = 0, 직진해요 (B 방향으로 다가와요)', { size: 13, minX: 0, maxX: SC.w, color: '#9a3412' });
    lbl(CXs, 388, 'F ⟂ v → 힘이 한 일 W = 0 (속력과 운동 에너지는 그대로)', { size: 12.5, minX: 0, maxX: SC.w, bg: 'rgba(255,255,255,.92)', color: '#0b7a41' });
    sceneEnd();
    // 띠: 속력 · 운동 에너지 막대
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12, bw = STP.w - 24, v = m.v * 1e6, K = 0.5 * ME * v * v;
    const barRow = (y, label, col, frac, txt) => {
      T(bx, y + 12, label, 13, '#26324a', 'left', 800);
      D.roundRect(bx + 118, y, bw - 118, 16, 7); ctx.fillStyle = '#eef1f7'; ctx.fill();
      const w = Math.max(3, clamp(frac, 0, 1) * (bw - 118)); D.roundRect(bx + 118, y, w, 16, 7); ctx.fillStyle = col; ctx.fill();
      T(bx + 118 + w + 8, y + 12.5, txt, 12.5, '#26324a', 'left', 800);
    };
    barRow(STP.y + 8, '속력 v (일정)', COL_V, m.v / 4 * 0.6, m.v.toFixed(1) + '×10⁶ m/s');
    barRow(STP.y + 32, '운동 에너지 K (일정)', COL_F, K / (0.5 * ME * 16e12) * 0.6, sci(K) + ' J');
    T(bx, STP.y + 74, '한 바퀴 시간(주기) T = ' + g3(o.T * 1e9) + ' ns', 13, '#26324a', 'left', 800);
    drawMagPanelRun(o);
  }
  function drawMagPanelRun(o) {
    const m = S.m;
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = IN.y + 24, x = IN.x + 14, mw = IN.w - 28;
    T(x, y, '자기력은 일을 하지 않아요', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    y += textBlock(x, y, mw, '힘 F ⟂ 속도 v 이므로 W = F · Δs · cos 90° = 0 → 운동 에너지가 변하지 않고 방향만 바뀌어요.', sz - 0.5, '#26324a', lh - 1, 800) + 2;
    y += textBlock(x, y, mw, '궤도 반지름 r = m v sinθ /(|q|B) = ' + g3(o.r * 100) + ' cm  (축척: 1 cm = ' + SCALE_E + ' 화면 단위)', sz - 0.5, '#9a3412', lh - 1, 800) + 2;
    if (!PHONE) y += textBlock(x, y, mw, '전기장의 힘 F = qE는 정지한 전하에도 작용하고 일을 해서 운동 에너지를 바꿔요. 자기장과의 가장 큰 차이예요.', sz - 0.5, '#0b7a41', lh - 1, 800);
  }
  function stepMag(dt) {
    const m = S.m;
    if (m.view !== 'run') return;
    const o = orbParamsM(), ws = o.w * KAPPA_E * (m.th > 0 ? 1 : 0);
    m.ph += ws * dt; m.runT += dt;
    const rpx = o.rpx, cx = CXs, cy = 280 - rpx, a = Math.PI / 2 - m.ph;
    if (rpx > 1) { m.trail.push(cx + rpx * Math.cos(a), cy + rpx * Math.sin(a)); if (m.trail.length > 700) m.trail.splice(0, 2); } else m.trail.length = 0;
  }
  $$('#viewSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.m.view = b.dataset.v; S.fade = 0.5; S.m.trail = []; updateCtl(); }));
  $$('#q2Seg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.m.q = +b.dataset.v; S.m.trail = []; updateCtl(); }));
  bindSl('sv2', () => S.m.v, (v) => { S.m.v = v; S.m.trail = []; }, updateCtl);
  bindSl('sB2', () => S.m.B, (v) => { S.m.B = v; S.m.trail = []; }, updateCtl);
  bindSl('sTh', () => S.m.th, (v) => { S.m.th = v; S.m.trail = []; }, updateCtl);

  /* ================= ③ 원운동 ================= */
  const SP = {
    e: { name: '전자', q: -QE, m: ME, sgn: -1, vmin: 1.0, vmax: 4.0, vstep: 0.5, vdef: 2.0, bmin: 0.5, bmax: 2.0, bstep: 0.1, bdef: 1.0, bun: 'mT', bk: 1e-3, scale: 30, col: NEG },
    p: { name: '양성자', q: QE, m: MP, sgn: 1, vmin: 0.25, vmax: 1.0, vstep: 0.25, vdef: 0.5, bmin: 0.10, bmax: 0.40, bstep: 0.05, bdef: 0.20, bun: 'T', bk: 1, scale: 13, col: POS },
    pos: { name: '양전자', q: QE, m: ME, sgn: 1, vmin: 1.0, vmax: 4.0, vstep: 0.5, vdef: 2.0, bmin: 0.5, bmax: 2.0, bstep: 0.1, bdef: 1.0, bun: 'mT', bk: 1e-3, scale: 30, col: POS },
  };
  const spec = () => SP[S.o.sp];
  const KAP = { e: TAU / 3.0 / (QE * 1e-3 / ME), pos: TAU / 3.0 / (QE * 1e-3 / ME), p: TAU / 3.0 / (QE * 0.2 / MP) };
  function orbParams(v6, Bv, th) {
    const sp = spec(), v = v6 * 1e6, B = Bv * sp.bk, sin = Math.sin(th * DEG);
    const r = sp.m * v * sin / (Math.abs(sp.q) * B), w = Math.abs(sp.q) * B / sp.m;
    return { r, w, T: TAU / w, rpx: r * 100 * sp.scale, v, B, pitch: TAU * sp.m * v * Math.cos(th * DEG) / (Math.abs(sp.q) * B) };
  }
  const orbMain = () => orbParams(S.o.v, S.o.B, S.o.th);
  function cmpV() { const o = S.o, p1 = orbMain(); return p1.rpx * 4 <= 270 ? o.v * 2 : o.v / 2; }
  function orbStart() { return spec().sgn > 0 ? 108 : 292; }
  function resetOrb() { const o = S.o; o.ph = 0; o.ph2 = 0; o.t = 0; o.trail = []; o.trail2 = []; o.zS = []; }
  function stepOrb(dt) {
    const o = S.o, sp = spec(), p1 = orbMain(), k = KAP[S.o.sp];
    const ws = p1.w * k; o.ph += ws * dt; o.t += dt;
    const cx = CXs, cy = orbStart() + sp.sgn * p1.rpx, a = (sp.sgn > 0 ? -Math.PI / 2 : Math.PI / 2) + sp.sgn * o.ph;
    if (p1.rpx > 0.8) { o.trail.push(cx + p1.rpx * Math.cos(a), cy + p1.rpx * Math.sin(a)); if (o.trail.length > 2400) o.trail.splice(0, 2); } else o.trail.length = 0;
    if (o.th < 90) { o.zS.push(o.t, Math.cos(o.ph) * p1.rpx); while (o.zS.length > 2 && o.zS[0] < o.t - 4) o.zS.splice(0, 2); } else o.zS = [];
    if (o.cmp) {
      const v2 = cmpV(), p2 = orbParams(v2, o.B, o.th), cy2 = orbStart() + sp.sgn * p2.rpx, a2 = (sp.sgn > 0 ? -Math.PI / 2 : Math.PI / 2) + sp.sgn * (o.ph);
      if (p2.rpx > 0.8) { o.trail2.push(cx + p2.rpx * Math.cos(a2), cy2 + p2.rpx * Math.sin(a2)); if (o.trail2.length > 2400) o.trail2.splice(0, 2); }
    }
    // 한 바퀴를 돌 때마다 자취를 처음부터 다시 (겹침 방지)
    if (o.ph > TAU * 3) { o.ph -= TAU * 3; }
  }
  const realT = () => S.o.t * KAP[S.o.sp];
  function drawOrb() {
    const o = S.o, sp = spec(), p1 = orbMain(), mkT = S.gate === 'mo2';
    sceneBegin();
    for (let x = 24; x < SC.w; x += 40) for (let y = 24; y < SC.h; y += 40) { ctx.strokeStyle = 'rgba(124,58,237,.33)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(124,58,237,.5)'; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill(); }
    lbl(CXs, 22, 'B ⊙ 화면 밖으로 = ' + (sp.bun === 'mT' ? o.B.toFixed(1) + ' mT' : o.B.toFixed(2) + ' T'), { bg: COL_B, color: '#fff', size: 12.5, pad: 8, minX: 0, maxX: SC.w });
    const cx = CXs, y0 = orbStart(), draw1 = (pp, trail, ph, col, v6, tag) => {
      const cy = y0 + sp.sgn * pp.rpx, a = (sp.sgn > 0 ? -Math.PI / 2 : Math.PI / 2) + sp.sgn * ph;
      if (pp.rpx > 1) { ctx.strokeStyle = 'rgba(71,85,105,.3)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, pp.rpx, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      if (trail.length > 4) { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(trail[0], trail[1]); for (let i = 2; i < trail.length; i += 2) ctx.lineTo(trail[i], trail[i + 1]); ctx.stroke(); }
      const px = cx + pp.rpx * Math.cos(a), py = cy + pp.rpx * Math.sin(a);
      // 속도: 접선 (sgn>0 → 시계방향)
      const dvx = -sp.sgn * Math.sin(a) * 1, dvy = sp.sgn * Math.cos(a) * 1;
      return { px, py, dvx, dvy, cx, cy };
    };
    const A = draw1(p1, o.trail, o.ph, sp.sgn > 0 ? 'rgba(226,70,75,.85)' : 'rgba(47,109,246,.85)', o.v);
    let B2 = null;
    if (o.cmp) { const v2 = cmpV(), p2 = orbParams(v2, o.B, o.th); B2 = draw1(p2, o.trail2, o.ph, 'rgba(16,185,129,.85)', v2); B2.v = v2; B2.p = p2; }
    // 출발점 (총)
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(cx, y0, 4, 0, TAU); ctx.fill();
    // 입자 + 화살표
    const prt = (Q, pp, col, txt) => {
      D.glow(Q.px, Q.py, 18, col, 0.3); D.sphere(Q.px, Q.py, 8.5, col, { shadow: true, text: txt });
      if (pp.rpx > 1) {
        const Lv = 38, Lf = 30;
        D.arrow(Q.px + Q.dvx * 11, Q.py + Q.dvy * 11, Q.px + Q.dvx * (11 + Lv), Q.py + Q.dvy * (11 + Lv), { color: COL_V, width: 3.2, head: 9 });
        const fx = Q.cx - Q.px, fy = Q.cy - Q.py, fm = Math.hypot(fx, fy) || 1;
        D.arrow(Q.px + fx / fm * 11, Q.py + fy / fm * 11, Q.px + fx / fm * (11 + Lf), Q.py + fy / fm * (11 + Lf), { color: COL_F, width: 3.2, head: 9 });
      }
    };
    prt(A, p1, sp.col, sp.sgn > 0 ? '+' : '−');
    if (B2) prt(B2, B2.p, '#10b981', sp.sgn > 0 ? '+' : '−');
    // 축척 막대
    const scb = sp.scale * (sp.scale >= 20 ? 1 : 5);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(14, SC.h - 16); ctx.lineTo(14 + scb, SC.h - 16); ctx.moveTo(14, SC.h - 21); ctx.lineTo(14, SC.h - 11); ctx.moveTo(14 + scb, SC.h - 21); ctx.lineTo(14 + scb, SC.h - 11); ctx.stroke();
    T(14 + scb + 8, SC.h - 11, (sp.scale >= 20 ? '1 cm' : '5 cm'), 13, '#334155', 'left', 800);
    // 비스듬한 입사: 옆에서 본 나선 보조도
    if (o.th < 90) {
      const bx = SC.w - 164, by = 36, bw = 154, bh = 112;
      ctx.fillStyle = 'rgba(255,255,255,.94)'; D.roundRect(bx, by, bw, bh, 10); ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.2; ctx.stroke();
      T(bx + 8, by + 17, '옆에서 본 모습 (B 방향 →)', 11.5, '#334155', 'left', 800);
      D.arrow(bx + 10, by + bh - 12, bx + bw - 10, by + bh - 12, { color: 'rgba(124,58,237,.7)', width: 2, head: 7 });
      ctx.save(); ctx.beginPath(); ctx.rect(bx + 4, by + 22, bw - 8, bh - 34); ctx.clip();
      ctx.strokeStyle = sp.sgn > 0 ? 'rgba(226,70,75,.9)' : 'rgba(47,109,246,.9)'; ctx.lineWidth = 2.2; ctx.beginPath();
      const amp = clamp(p1.rpx, 3, 32) / Math.max(p1.rpx, 1) * 1, scl = clamp(32 / Math.max(p1.rpx, 1), 0, 1);
      let first = true;
      for (let i = 0; i < o.zS.length; i += 2) { const x = bx + 12 + (o.zS[i] - (o.t - 4)) / 4 * (bw - 24), y = by + 22 + (bh - 34) / 2 + o.zS[i + 1] * scl; if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); }
      ctx.stroke(); ctx.restore();
      T(bx + 8, by + bh - 16, '', 11, '#516079', 'left', 700);
    }
    sceneEnd();
    // 띠
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const bx = STP.x + 12;
    T(bx, STP.y + 22, 'r = m v /(|q|B) = ' + g3(p1.r * 100) + ' cm' + (o.th < 90 ? '  (θ = ' + o.th + '°: r sinθ)' : ''), 14, '#9a3412', 'left', 800);
    T(bx, STP.y + 47, 'T = 2πm /(|q|B) = ' + (mkT ? '?' : g3(p1.T * 1e9) + ' ns') + '  (속력과 무관)', 14, '#1e40af', 'left', 800);
    T(bx, STP.y + 72, '실제 경과 시간 t = ' + (mkT ? '?' : g3(realT() * 1e9) + ' ns'), 13, '#516079', 'left', 800);
    // 설명
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = IN.y + 24, x = IN.x + 14, mw = IN.w - 28;
    T(x, y, 'qvB = mv²/r  →  원운동', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    y += textBlock(x, y, mw, 'r = mv/(qB),  T = 2πm/(qB)', sz, '#9a3412', lh, 800) + 2;
    y += textBlock(x, y, mw, 'v가 크면 큰 원, 느리면 작은 원 — 그런데 한 바퀴 도는 시간 T는 같아요.', sz - 0.5, '#26324a', lh - 1, 800) + 2;
    y += textBlock(x, y, mw, '+전하는 시계 방향, −전하는 반시계 방향으로 돌아요.', sz - 0.5, '#26324a', lh - 1, 800) + 2;
    if (!PHONE) {
      y += textBlock(x, y, mw, '같은 v, B에서 양성자의 r은 전자의 약 1.8×10³배 (질량 비).', sz - 0.5, '#26324a', lh - 1, 800) + 2;
      if (o.th < 90) y += textBlock(x, y, mw, '비스듬히 들어가면 B와 나란한 성분은 그대로 이동해서 나선 운동이 돼요. 위에서 보면 반지름 r sinθ인 원이에요.', sz - 1, '#0b7a41', lh - 2, 800);
    }
  }
  $$('#spSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setSpecies(b.dataset.v); }));
  function setSpecies(k) { const o = S.o; o.sp = k; const sp = SP[k]; o.v = sp.vdef; o.B = sp.bdef; resetOrb(); updateCtl(); }
  bindSl('sv3', () => S.o.v, (v) => { S.o.v = clamp(v, spec().vmin, spec().vmax); resetOrb(); }, updateCtl);
  bindSl('sB3', () => S.o.B, (v) => { S.o.B = clamp(v, spec().bmin, spec().bmax); resetOrb(); }, updateCtl);
  $('#bTheta').addEventListener('click', () => { Sound.click(); const o = S.o; o.th = o.th === 90 ? 60 : o.th === 60 ? 30 : 90; resetOrb(); updateCtl(); });
  $('#bCmp').addEventListener('click', () => { Sound.click(); S.o.cmp = !S.o.cmp; resetOrb(); updateCtl(); });

  /* ================= ④ 궤적 해석 ================= */
  function makeTrack(x0, y0, h0, sgn, r0, k, turns, steps) {   // sgn +1: 시계 방향(화면), −1: 반시계
    const pts = [x0, y0]; let x = x0, y = y0, h = h0; const n = steps || 360, da = turns * TAU / n;
    for (let i = 0; i < n; i++) { const al = i * da, r = r0 * Math.exp(-k * al); x += Math.cos(h) * r * da; y += Math.sin(h) * r * da; h += sgn * da; pts.push(x, y); }
    return pts;
  }
  const O4 = { x: CXs, y: 300 };
  const TRK = {
    a: [
      { id: 1, pts: makeTrack(O4.x, O4.y, -Math.PI / 2, 1, 125, 0, 0.52, 160), sign: 1, col: '#c2410c' },
      { id: 2, pts: makeTrack(O4.x, O4.y, -Math.PI / 2, -1, 70, 0, 0.72, 160), sign: -1, col: '#1d4ed8' },
      { id: 3, pts: makeTrack(O4.x, O4.y, -Math.PI / 2, 1, 40, 0, 0.82, 160), sign: 1, col: '#15803d' },
    ],
    b: [
      { id: 1, pts: makeTrack(O4.x + 4, O4.y, -Math.PI / 2 + 0.25, 1, 90, 0.11, 2.2, 400), sign: 1, col: '#c2410c' },
      { id: 2, pts: makeTrack(O4.x - 4, O4.y, -Math.PI / 2 - 0.25, -1, 90, 0.11, 2.2, 400), sign: -1, col: '#1d4ed8' },
    ],
  };
  const T4 = { x0: 0, y0: 0 };
  function trackLen(t) { return t.pts.length / 2; }
  function drawTrack(t, prog, ghost) {
    const n = trackLen(t), m = Math.max(2, Math.floor(n * prog));
    ctx.strokeStyle = ghost ? 'rgba(100,116,139,.35)' : t.col; ctx.lineWidth = ghost ? 2 : 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(t.pts[0], t.pts[1]); for (let i = 1; i < m; i++) ctx.lineTo(t.pts[i * 2], t.pts[i * 2 + 1]); ctx.stroke();
    return { x: t.pts[(m - 1) * 2], y: t.pts[(m - 1) * 2 + 1] };
  }
  const trackLabelPos = (t) => { const n = trackLen(t), i = Math.floor(n * 0.62); return { x: t.pts[i * 2], y: t.pts[i * 2 + 1] }; };
  function guessOf(fig, id) { return S.k.guess[fig][id]; }
  function drawTrk() {
    const k = S.k, f = k.fig;
    sceneBegin();
    for (let x = 24; x < SC.w; x += 40) for (let y = 24; y < SC.h; y += 40) { ctx.strokeStyle = 'rgba(124,58,237,.25)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(124,58,237,.4)'; ctx.beginPath(); ctx.arc(x, y, 1.3, 0, TAU); ctx.fill(); }
    lbl(CXs, 22, 'B ⊙ 화면 밖으로 (모든 입자는 전하의 크기가 같아요)', { bg: COL_B, color: '#fff', size: 12.5, pad: 8, minX: 0, maxX: SC.w });
    if (f === 'a' || f === 'b') {
      const cyc = (k.tt % 7.5), prog = clamp(cyc / 2.6, 0, 1), fade = cyc > 6.3 ? clamp(1 - (cyc - 6.3) / 1.2, 0, 1) : 1;
      ctx.globalAlpha = RM ? 1 : fade;
      TRK[f].forEach((t) => { const hd = drawTrack(t, RM ? 1 : prog); if (!RM && prog < 1) D.glow(hd.x, hd.y, 14, '#fbbf24', 0.7); });
      ctx.globalAlpha = 1;
      D.sphere(O4.x, O4.y, 5, '#475569', { shadow: true, gloss: false });
      T(O4.x + 10, O4.y + 20, f === 'a' ? '충돌 위치' : '쌍 생성 위치', 12.5, '#475569', 'left', 800);
      // 라벨 (눌러서 부호 추측)
      TRK[f].forEach((t) => {
        const p = trackLabelPos(t), g = guessOf(f, t.id), ok = g != null && g === t.sign;
        const txt = g == null ? '?' : (g > 0 ? '+' : '−');
        D.sphere(p.x, p.y, 15, g == null ? '#94a3b8' : ok ? '#16a34a' : '#f26b3a', { shadow: true, text: txt, textScale: 1.2 });
        T(p.x, p.y - 22, f === 'a' ? '트랙 ' + t.id : '', 12.5, '#26324a', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
      });
      if (!k.touched) lbl(CXs, 52, '트랙의 동그라미를 눌러 부호(+ / −)를 정해요', { size: 12.5, minX: 0, maxX: SC.w, color: '#9a3412' });
    } else {
      // 그림 다: 눈금 격자 · 양성자 한 개의 궤적
      const s = 20, cx = 240, cy = 210;
      ctx.strokeStyle = 'rgba(100,116,139,.25)'; ctx.lineWidth = 1; for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(cx + i * s, 10); ctx.lineTo(cx + i * s, SC.h - 10); ctx.stroke(); ctx.beginPath(); ctx.moveTo(10, cy + i * s); ctx.lineTo(SC.w - 10, cy + i * s); ctx.stroke(); }
      const r = 100;
      const cyc = k.tt % 6, prog = clamp(cyc / 2.4, 0, 1);
      ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI * 0.9, -Math.PI * 0.9 + (RM ? 1 : prog) * Math.PI * 1.55); ctx.stroke();
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * Math.cos(0.5), cy + r * Math.sin(0.5)); ctx.stroke();
      D.sphere(cx, cy, 4, '#475569', { gloss: false });
      lbl(cx + r * 0.5 * Math.cos(0.5) + 24, cy + r * 0.5 * Math.sin(0.5) + 8, 'r = 5.0 cm', { bg: '#16a34a', color: '#fff', size: 13, pad: 7, minX: 0, maxX: SC.w });
      lbl(cx, 52, '격자 한 칸 = 1.0 cm · 양성자 · B = 0.20 T', { size: 12.5, minX: 0, maxX: SC.w, color: '#334155' });
      const a = -Math.PI * 0.9 + (RM ? 1 : prog) * Math.PI * 1.55;
      D.sphere(cx + r * Math.cos(a), cy + r * Math.sin(a), 8, POS, { shadow: true, text: '+' });
    }
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const tip = { a: '곡선이 휘는 방향으로 부호를 알 수 있어요(B ⊙에서 +는 시계 방향). 반지름이 클수록 운동량 p = |q|Br이 커요.', b: '같은 곳에서 생긴 한 쌍은 반대로 휘어요. 선이 안쪽으로 감기는 것은 에너지를 잃어서예요.', c: 'p = |q|Br 에 q = 1.6×10⁻¹⁹ C, B = 0.20 T, r = 0.050 m 를 넣고 v = p/m 으로 속력을 구해요.' }[f];
    T(STP.x + 12, STP.y + 22, '그림에서 읽을 수 있는 것', 14, '#1e40af', 'left', 800);
    textBlock(STP.x + 12, STP.y + 42, STP.w - 24, tip, PHONE ? 12 : 12.5, '#26324a', 17, 700);
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = IN.y + 24, x = IN.x + 14, mw = IN.w - 28;
    T(x, y, '궤적 읽는 법', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    ['휘는 방향 → 전하의 부호 (B ⊙: + 시계, − 반시계)', 'r = p /(|q|B) → 반지름이 클수록 운동량이 커요', '나선으로 안쪽으로 감기면 에너지(속력)를 잃고 있어요', '🏭 입자 검출기(거품 상자 등)는 이렇게 입자를 알아내요'].forEach((t) => { y += textBlock(x, y, mw, '• ' + t, sz - 0.5, '#26324a', lh - 1, 800) + 2; });
  }
  function trkDown(p) {
    const k = S.k, f = k.fig; if (f === 'c' || S.mode !== 'trk') return false;
    const q = lp(p); let best = null, bd = 26;
    TRK[f].forEach((t) => { const lpz = trackLabelPos(t), d = Math.hypot(q.x - lpz.x, q.y - lpz.y); if (d < bd) { bd = d; best = t; } });
    if (!best) return false;
    const g = k.guess[f], cur = g[best.id]; g[best.id] = cur == null ? 1 : cur > 0 ? -1 : 1; k.touched = true; Sound.click();
    return true;
  }
  $$('#fig4Seg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.k.fig = b.dataset.v; S.k.tt = 0; S.fade = 0.5; updateCtl(); }));
  const trkOK = () => TRK.a.every((t) => S.k.guess.a[t.id] === t.sign) && TRK.b.every((t) => S.k.guess.b[t.id] === t.sign);
  const trkN = () => TRK.a.filter((t) => S.k.guess.a[t.id] === t.sign).length + TRK.b.filter((t) => S.k.guess.b[t.id] === t.sign).length;
  const fastOK = () => S.k.fast === '1';
  /* ---------- 입력 도구 ---------- */
  const numF = makeNum($('#numFHost'), '전자(−e)가 <b>v = 2.0×10⁶ m/s</b>, <b>B = 1.0×10⁻³ T</b>에 수직으로 들어갈 때 힘 F는?', 'F =', 'N', -16);
  const numT = makeNum($('#numTHost'), '<b>B = 1.0×10⁻³ T</b>에서 전자의 <b>주기 T</b>는? (m = 9.11×10⁻³¹ kg)', 'T =', 's', -8);
  const numP = makeNum($('#numPHost'), '양성자(r = 5.0 cm, B = 0.20 T)의 <b>운동량 p = qBr</b>은?', 'p =', 'kg·m/s', -21);
  const numV = makeNum($('#numVHost'), '이 양성자의 <b>속력 v = p/m</b> (m = 1.67×10⁻²⁷ kg)은?', 'v =', 'm/s', 5);
  const sel1R = [['<b>양전하</b>를 오른쪽(→)으로 쏘면 힘의 방향은? (B는 ⊙)', ['위쪽', '아래쪽', '오른쪽(앞으로)'], 1], ['<b>전자</b>를 오른쪽(→)으로 쏘면 휘는 방향은?', ['위쪽', '아래쪽', '휘지 않아요'], 0], ['<b>정지한</b> 전하가 자기장 속에서 받는 힘은?', ['0이에요', '0이 아니에요'], 0]];
  const s1St = {}, s1Ok = {}, s1Sels = makeSelects($('#sel1Host'), sel1R, s1St, s1Ok);
  const fastR = [['세 입자의 전하 크기와 질량이 같을 때 <b>가장 빠른 입자</b>는?', ['트랙 1', '트랙 2', '트랙 3'], 0]];
  const fSt = {}, fOk = {}, fSels = makeSelects($('#fastHost'), fastR, fSt, fOk);
  const s4R = [['나선이 <b>안쪽으로 감기는</b> 까닭은?', ['에너지(속력)를 잃어 r가 줄어서', '자기장이 점점 세져서', '전하가 늘어나서'], 0], ['같은 속도의 <b>헬륨 핵</b>(전하 2e, 질량 4배)의 반지름은 양성자의 몇 배?', ['1/2배', '1배', '2배', '4배'], 2]];
  const s4St = {}, s4Ok = {}, s4Sels = makeSelects($('#sel4Host'), s4R, s4St, s4Ok);
  function clr1() { resetSels(s1Sels, s1St, s1Ok); }
  function clr4() { resetSels(s4Sels, s4St, s4Ok); numP.clear(); numV.clear(); }
  function clrFast() { resetSels(fSels, fSt, fOk); }
  fSels[0].addEventListener('change', () => { S.k.fast = fSt[0] || ''; });

  /* ================= 공통 UI ================= */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      if (on && n.hasAttribute('data-view')) on = n.getAttribute('data-view').split(' ').indexOf(S.m.view) >= 0;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const c = S.c, m = S.m, o = S.o, sp = spec();
    $$('#caseSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === c.kase));
    $$('#qSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === c.sign));
    $$('#fieldSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === c.field));
    $('#bLaunch').disabled = false;
    $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === m.view));
    $$('#q2Seg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === m.q));
    setRange('sv2', m.v, 1, 4, (v) => v.toFixed(1) + '×10⁶ m/s'); setRange('sB2', m.B, 0.5, 1.5, (v) => v.toFixed(1) + ' mT'); setRange('sTh', m.th, 0, 90, (v) => v + '°');
    $('#sv2M').disabled = m.v <= 1; $('#sv2P').disabled = m.v >= 4; $('#sB2M').disabled = m.B <= 0.5; $('#sB2P').disabled = m.B >= 1.5; $('#sThM').disabled = m.th <= 0; $('#sThP').disabled = m.th >= 90;
    $$('#spSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === o.sp));
    const vs = $('#sv3'), bs = $('#sB3');
    vs.min = sp.vmin; vs.max = sp.vmax; vs.step = sp.vstep; bs.min = sp.bmin; bs.max = sp.bmax; bs.step = sp.bstep;
    setRange('sv3', o.v, sp.vmin, sp.vmax, (v) => v.toFixed(2).replace(/0$/, '') + '×10⁶ m/s'); setRange('sB3', o.B, sp.bmin, sp.bmax, (v) => (sp.bun === 'mT' ? v.toFixed(1) + ' mT' : v.toFixed(2) + ' T'));
    $('#sv3M').disabled = o.v <= sp.vmin + 1e-9; $('#sv3P').disabled = o.v >= sp.vmax - 1e-9; $('#sB3M').disabled = o.B <= sp.bmin + 1e-9; $('#sB3P').disabled = o.B >= sp.bmax - 1e-9;
    $('#bTheta').textContent = '↗ 입사각 θ = ' + o.th + '° (누르면 바뀜)'; $('#bCmp').textContent = o.cmp ? '👥 비교 입자 끄기' : '👥 속력이 다른 입자 하나 더'; $('#bCmp').classList.toggle('btn-primary', !o.cmp);
    $$('#fig4Seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.k.fig));
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  function readouts() {
    let a, b, c; const m = S.mode;
    if (m === 'cond') { const k = S.c; a = ['발사 조건', CASES[k.kase].name + ' · ' + CASES[k.kase].label]; b = ['전하', (k.sign > 0 ? '양전하 +' : '음전하 −') + ' · ' + (k.field === 'B' ? '자기장' : '전기장')]; c = ['시험한 조건 (B)', Object.keys(k.seen).length + ' / 4']; }
    else if (m === 'mag') { const q = S.m, F = Fm(); a = ['|q|, v', q.q + 'e, ' + g3(q.v) + '×10⁶ m/s']; b = ['B, θ', g3(q.B) + ' mT, ' + q.th + '°']; c = ['힘 F', S.gate === 'mm1' ? '?' : (F > 0 ? sci(F) : '0') + ' N']; }
    else if (m === 'orb') { const o = S.o, p1 = orbMain(); a = [SP[o.sp].name + ' · v', g3(o.v) + '×10⁶ m/s']; b = ['반지름 r', g3(p1.r * 100) + ' cm']; c = ['주기 T', S.gate === 'mo2' ? '?' : g3(p1.T * 1e9) + ' ns']; }
    else { const k = S.k; a = ['보는 그림', { a: '그림 가', b: '그림 나', c: '그림 다' }[k.fig]]; b = ['맞힌 부호', trkN() + ' / 5']; c = ['가장 빠른 입자', k.fast ? '트랙 ' + k.fast : '아직 안 골랐어요']; }
    [[l1, v1, a], [l2, v2, b], [l3, v3, c]].forEach((z) => { if (z[0].textContent !== z[2][0]) z[0].textContent = z[2][0]; if (z[1].textContent !== z[2][1]) z[1].textContent = z[2][1]; });
  }

  /* ================= 미션 ================= */
  const MS = {};
  const condOK = () => KASES.every((k) => S.c.seen[k]);
  const taskOK = () => S.m.q === 1 && S.m.B === 1.0 && S.m.v === 4.0 && S.m.th === 30 && Math.abs(Fm() - F0) < 0.02 * F0;
  const radOK = () => S.o.sp === 'e' && S.o.th === 90 && Math.abs(orbMain().r * 100 - 1.1) <= 0.07;
  const levels = [
    {
      title: '로런츠 힘이 생기는 조건', short: '힘의 조건', icon: '🧭', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 자기장 속을 달리는 전하는 왜 속력은 그대로인데 방향이 계속 바뀔까?</p>' +
        '<div class="si-link">🔗 <b>물리학 「전동기와 스피커」</b>에서 자기장 속의 전류가 받는 힘 F = BIL로 전동기와 스피커가 움직이는 것을 배웠어요. 이번에는 그 힘의 근본인 <b>움직이는 전하 하나가 받는 힘(로런츠 힘)</b>을 알아봐요.</div>' +
        '<p>상자 안 자기장(B ⊙: 화면 밖으로)에서 전하를 <b>정지시키거나, B와 나란히, 수직으로, 비스듬히</b> 쏘며 언제 힘을 받는지 관찰하고, 양전하와 음전하(전자)의 방향을 비교해요. 전기장 속에서는 어떻게 다른지도 확인해 봐요.</p>',
      features: ['cond'],
      setup() { S.gate = ''; Object.assign(S.c, { kase: 'perp', sign: 1, field: 'B', seen: {} }); clearC(); clr1(); setScene('cond'); },
      recap: '자기장 속에서 로런츠 힘은 움직이는 전하에만 작용하고(v ≠ 0), v가 B와 나란하면 0이에요. 힘의 방향은 v와 B에 모두 수직이고 음전하는 반대예요.',
      summary: '<ul><li><b>로런츠 힘</b>: 자기장 B 속에서 속도 v로 움직이는 전하 q가 받는 힘. <b>F = qvB sinθ</b> (θ: v와 B 사이의 각).</li><li>정지한 전하(v = 0)나 B와 나란히 움직이는 전하(θ = 0)는 <b>힘이 0</b>이에요. B에 수직(θ = 90°)이면 최대, θ = 30°이면 절반이에요.</li><li>힘의 방향은 <b>v와 B에 모두 수직</b>(오른손 규칙). 음전하는 같은 조건에서 방향이 반대예요.</li><li>전기장의 힘 F = qE는 정지한 전하에도 작용해요. 자기장은 <b>움직이는 전하에만</b> 힘을 줘요.</li></ul>',
      missions: [
        {
          title: '네 가지 방향으로 쏘아 보기',
          goal: '자기장(B) 모드에서 <b>정지 · B와 나란히 · B에 수직 · 비스듬히(30°)</b> 네 가지를 모두 쏘아 보세요.',
          hint: '위 칩에서 조건을 고르고 ▶ 발사를 눌러요. 각 조건을 1.5초 이상 지켜보면 완료로 기록돼요. 전기장이 아니라 자기장(B) 모드여야 해요.',
          setup() { S.gate = ''; Object.assign(S.c, { kase: 'perp', sign: 1, field: 'B', seen: {} }); clearC(); setScene('cond'); },
          check: condOK, hold: 0.4,
          status: () => KASES.map((k) => mark(S.c.seen[k]) + ' ' + CASES[k].name).join(' &nbsp; '),
          explain: '정지한 전하(v = 0)와 B와 나란히 움직이는 전하(θ = 0°)는 힘이 0이라 가던 대로 가요. B에 수직으로 쏘면 힘이 최대(F = qvB)라 원을 그리고, 30°로 비스듬히 쏘면 힘이 절반(sin 30° = 1/2)이라 나선(원운동 + 앞으로 나감)이 돼요.',
        },
        {
          title: '힘의 방향 예측하기', manual: true,
          goal: '자기장은 <b>⊙(화면 밖으로)</b>예요. 세 질문에 답하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '오른손 손가락을 v 방향으로 펴서 B 쪽으로 굽히면 엄지가 +전하의 힘 방향이에요. 음전하는 반대예요. 정지한 전하는 v = 0이에요. 앞에서 직접 쏴 본 결과도 떠올려요.',
          setup() { S.gate = 'mc2'; Object.assign(S.c, { kase: 'perp', sign: 1, field: 'B' }); clearC(); clr1(); setScene('cond'); },
          check: () => checkSel(sel1R, s1St, s1Ok, s1Sels, '빨간 칸을 다시 골라 보세요. 양전하는 (v → B) 오른손 규칙, 음전하는 반대, 정지 전하는 v = 0이에요.'),
          status: () => '고른 문제 ' + sel1R.filter((r, i) => s1St[i]).length + ' / 3',
          explain: '+전하를 →로 쏘면 힘 F = qv × B 는 <b>아래쪽</b>이라 시계 방향으로 휘어요. 전자(−)는 같은 조건에서 힘이 반대인 <b>위쪽</b>이라 반시계 방향으로 휘어요. 정지한 전하는 v = 0이므로 자기장에서 <b>힘이 0</b>이에요.',
        },
        {
          type: 'quiz', title: '정지한 전하와 자기장',
          goal: '정지해 있는 전하가 자기장 속에서 <b>힘을 받지 않는</b> 까닭은? (전기장 모드와 비교해 보세요)',
          setup() { S.gate = ''; Object.assign(S.c, { kase: 'rest', sign: 1 }); clearC(); setScene('cond'); },
          choices: ['로런츠 힘 F = qvB sinθ 는 속도 v에 비례하므로 v = 0이면 0이에요', '자기장은 모든 전하를 끌어당기지만 정지 전하는 너무 가벼워서 안 움직여요', '정지한 전하는 자기장을 만들어 B를 상쇄해요', '전하가 정지해 있으면 전하량이 0이 돼요'],
          answer: 0,
          feedback: ['', '자기장은 전하를 끌어당기지 않아요. 힘은 항상 속도에 수직이고, 정지한 전하에는 힘이 0이에요. (전기장은 정지한 전하도 밀거나 당겨요.)', '정지한 전하는 정전기 장을 만들 뿐 자기장을 만들지 않아요. 힘이 0인 까닭은 F ∝ v 이기 때문이에요.', '전하량은 움직이는지와 상관없이 일정해요.'],
          explain: 'F = qvB sinθ에서 힘은 속도 v에 비례해요. v = 0이면 F = 0이에요. 반면 전기장의 힘 F = qE는 속도와 상관없이 정지한 전하에도 작용해요. 자기장은 모든 전하를 끌어당기는 것이 아니라 <b>움직이는 전하의 방향을 휘게</b> 해요.',
        },
      ],
    },
    {
      title: '로런츠 힘의 크기 F = qvB sinθ', short: '힘의 크기', icon: '📐', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> v가 B에 수직일 때 힘이 최대이고 나란하면 0이라는 것을 관찰했어요. 이제 <b>q, v, B, θ</b>를 바꾸며 힘의 크기를 정량적으로 읽어요.</div>' +
        '<p>F는 q, v, B에 비례하고 sinθ에 비례해요. 전자(m = 9.11×10⁻³¹ kg, e = 1.6×10⁻¹⁹ C)가 v = 2.0×10⁶ m/s로 B = 1.0×10⁻³ T에 수직으로 들어가면 F = 3.2×10⁻¹⁶ N이에요. 🔍 도선을 확대하면 이 힘이 모여 F = BIL이 되는 것도 볼 수 있어요.</p>',
      features: ['mag'],
      setup() { S.gate = ''; Object.assign(S.m, { view: 'vec', q: 1, v: 2.0, B: 1.0, th: 90, trail: [] }); numF.clear(); setScene('mag'); },
      recap: '로런츠 힘 F = |q|vB sinθ는 q, v, B에 비례하고 sinθ에 비례해요. F ⟂ v 이므로 일을 하지 않아 속력과 운동 에너지는 그대로예요.',
      summary: '<ul><li><b>F = |q| v B sinθ</b>. 전자 예: v = 2.0×10⁶ m/s, B = 1.0×10⁻³ T(수직) → <b>F = 3.2×10⁻¹⁶ N</b>. 전자의 무게 mg ≈ 9×10⁻³⁰ N의 약 10¹³배라서 원운동에서는 중력을 무시해요.</li><li>v를 2배로 하고 θ를 30°로 하면 F = (2) × (1/2) = 같은 값이에요.</li><li>F는 항상 v에 수직이라 <b>일을 하지 않아요</b>. 속력과 운동 에너지는 변하지 않고 방향만 바뀌어요.</li><li>도선 속 전하가 받는 힘의 합이 <b>F = BIL</b>이에요(I = nqvA, 전하 수 nAL).</li></ul>',
      missions: [
        {
          title: '전자가 받는 힘 계산하기', manual: true,
          goal: '<b>v = 2.0×10⁶ m/s</b>, <b>B = 1.0×10⁻³ T</b>(수직)인 전자가 받는 힘 F를 계산해 입력한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'F = |q| v B sin 90° = 1.6×10⁻¹⁹ × 2.0×10⁶ × 1.0×10⁻³ 을 계산해요. 10의 거듭제곱도 확인해요.',
          setup() { S.gate = 'mm1'; Object.assign(S.m, { view: 'vec', q: 1, v: 2.0, B: 1.0, th: 90, trail: [] }); numF.clear(); setScene('mag'); },
          check: () => checkNum(numF, 3.2e-16, 0.03, '다시 계산해 보세요. F = 1.6×10⁻¹⁹ × 2.0×10⁶ × 1.0×10⁻³ 이에요.'),
          status: () => '힘 값은 가려 두었어요 (v = 2.0×10⁶ m/s, B = 1.0×10⁻³ T)',
          explain: 'F = 1.6×10⁻¹⁹ × 2.0×10⁶ × 1.0×10⁻³ × sin 90° = <b>3.2×10⁻¹⁶ N</b>이에요. 전자의 무게 mg = 9.11×10⁻³¹ × 9.8 ≈ 8.9×10⁻³⁰ N과 비교하면 약 10¹³배로, 중력은 무시해도 돼요.',
        },
        {
          title: 'v를 2배로, 힘은 그대로',
          goal: '<b>v = 4.0×10⁶ m/s</b>(2배)로 하고, 힘이 처음과 같은 <b>3.2×10⁻¹⁶ N</b>이 되도록 각도 θ를 맞추세요.',
          hint: 'F ∝ v sinθ 이에요. v가 2배이면 sinθ가 1/2이 되어야 해요. sin 30° = 0.5 예요. q = 1e, B = 1.0 mT 그대로 두어요.',
          setup() { S.gate = ''; Object.assign(S.m, { view: 'vec', q: 1, v: 2.0, B: 1.0, th: 90, trail: [] }); setScene('mag'); },
          check: taskOK, hold: 0.8,
          status: () => mark(S.m.v === 4.0) + ' v = ' + g3(S.m.v) + '×10⁶ &nbsp; ' + mark(taskOK()) + ' F = ' + (Fm() > 0 ? sci(Fm()) : '0') + ' N (목표 3.2×10⁻¹⁶ N)',
          explain: 'F = e v B sinθ 에서 v를 2배(4.0×10⁶)로 하면 sinθ를 1/2(θ = 30°)로 맞추어야 같은 F = 3.2×10⁻¹⁶ N이에요. 힘은 속도의 <b>B에 수직인 성분</b> v sinθ에 비례하는 거예요.',
        },
        {
          type: 'quiz', title: '일을 하지 않는 힘',
          goal: '로런츠 힘이 전하의 <b>운동 에너지를 바꾸지 못하는</b> 까닭은? (🏃 달리는 입자 화면을 보세요)',
          setup() { S.gate = ''; Object.assign(S.m, { view: 'run', q: 1, v: 2.0, B: 1.0, th: 90, trail: [] }); setScene('mag'); },
          choices: ['힘이 항상 속도에 수직이라 이동 방향으로 일을 하지 않기 때문이에요', '로런츠 힘이 너무 작아서 속력을 바꾸지 못해요', '자기장이 전하의 질량을 늘려서 속력이 같아 보여요', '자기력은 전하를 끌어당겨서 속력이 줄어들어요'],
          answer: 0,
          feedback: ['', '힘이 작다고 일을 못 하는 것이 아니에요. 힘이 커도 속도에 수직이면 일 = 0이에요.', '자기장은 질량을 바꾸지 않아요.', '자기력은 속력을 줄이지도 늘리지도 않고 방향만 바꿔요.'],
          explain: '일 W = F · Δs · cosφ에서 F ⟂ v이면 φ = 90°라 W = 0이에요. 그래서 운동 에너지 ½mv²는 그대로이고 속력은 변하지 않으며 <b>방향만</b> 바뀌어요. 전기력(F = qE)은 일을 해서 속력을 바꿔요.',
        },
      ],
    },
    {
      title: '원운동: r = mv/(qB), T = 2πm/(qB)', short: '원운동', icon: '🌀', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 로런츠 힘이 속도에 수직이라 속력은 그대로이고 방향만 바뀐다는 것을 배웠어요. 그러면 B에 <b>수직으로</b> 들어간 전하는 어떤 운동을 할까요?</div>' +
        '<p>힘 F = qvB가 구심력이 되어 <b>등속 원운동</b>을 해요. qvB = mv²/r에서 <b>r = mv/(qB)</b>, 주기는 <b>T = 2πm/(qB)</b>로 속력과 무관해요. 전자·양성자·양전자와 v, B를 바꾸며 r과 T를 재 봐요. 비스듬히 들어가면 나선이 돼요.</p>',
      features: ['orb'],
      setup() { S.gate = ''; setSpecies('e'); S.o.th = 90; S.o.cmp = false; resetOrb(); setScene('orb'); },
      recap: 'B에 수직으로 들어간 전하는 반지름 r = mv/(qB), 주기 T = 2πm/(qB)로 등속 원운동해요. 주기는 속력과 무관하고, 부호가 반대면 반대 방향으로 돌아요.',
      summary: '<ul><li>qvB = mv²/r → <b>r = mv/(qB)</b>, 주기 <b>T = 2πm/(qB)</b> (속력 v와 무관). v를 바꿔도 T가 같아요(느리면 작은 원, 빠르면 큰 원).</li><li>예) 전자 v = 2.0×10⁶ m/s, B = 1.0×10⁻³ T → r ≈ 1.1×10⁻² m(1.1 cm), T ≈ 3.6×10⁻⁸ s(36 ns). v를 2배 → r 2배, T 그대로. B를 2배 → r 1/2, T 1/2.</li><li>같은 v, B에서 양성자의 r은 전자의 약 1836배(질량 비). 양성자 v = 1.0×10⁶ m/s, B = 0.10 T → r = 0.10 m, T = 6.6×10⁻⁷ s.</li><li>+전하와 −전하는 반대 방향으로 돌아요. B와 비스듬히 들어가면(θ) 반지름 r sinθ인 <b>나선 운동</b>이에요.</li></ul>',
      missions: [
        {
          title: '반지름 1.1 cm 만들기',
          goal: '전자의 원운동 반지름을 <b>r ≈ 1.1 cm</b>로 만드세요. (v와 B를 바꿔요, 오차 약 6 % 이내)',
          hint: 'r = mv/(eB). v = 2.0×10⁶ m/s, B = 1.0 mT이면 r = 1.1 cm예요. v/B 비가 같으면 같은 r이에요. 입사각은 90°로 두어요.',
          setup() { S.gate = ''; setSpecies('e'); S.o.v = 3.0; S.o.B = 1.5; S.o.th = 90; S.o.cmp = false; resetOrb(); setScene('orb'); },
          check: radOK, hold: 0.8,
          status: () => mark(radOK()) + ' r = ' + g3(orbMain().r * 100) + ' cm (목표 1.1 cm)',
          explain: 'r = mv/(eB) = 9.11×10⁻³¹ × 2.0×10⁶ / (1.6×10⁻¹⁹ × 1.0×10⁻³) ≈ <b>1.1×10⁻² m</b>예요. v를 2배로 하면 r도 2배, B를 2배로 하면 r는 1/2이에요. 주기는 v를 바꿔도 변하지 않는 것도 확인했어요(👥 비교 입자).',
        },
        {
          title: '전자의 주기 예측하기', manual: true,
          goal: '<b>B = 1.0×10⁻³ T</b>에서 전자의 <b>주기 T</b>를 계산해 입력한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'T = 2πm/(eB) = 2π × 9.11×10⁻³¹ / (1.6×10⁻¹⁹ × 1.0×10⁻³). 약 3.6×10⁻⁸ s(36 ns)예요. 속력은 필요 없어요.',
          setup() { S.gate = 'mo2'; setSpecies('e'); S.o.th = 90; S.o.cmp = false; resetOrb(); numT.clear(); setScene('orb'); },
          check: () => checkNum(numT, 3.58e-8, 0.04, '다시 계산해 보세요. T = 2πm/(eB) 이에요 (v는 필요 없어요). 값은 약 3.6×10⁻⁸ s예요.'),
          status: () => '주기 값은 가려 두었어요 (B = 1.0×10⁻³ T)',
          explain: 'T = 2πm/(eB) = 2π × 9.11×10⁻³¹ / (1.6×10⁻¹⁹ × 1.0×10⁻³) ≈ <b>3.6×10⁻⁸ s (36 ns)</b>예요. 식에 v가 없으므로 속력이 달라도 한 바퀴 도는 시간은 같아요.',
        },
        {
          type: 'quiz', title: '속력을 3배로 하면',
          goal: '같은 B에서 입자의 속력을 <b>3배</b>로 하면 원운동의 <b>반지름</b>과 <b>한 바퀴 도는 시간</b>은?',
          setup() { S.gate = ''; setSpecies('e'); S.o.th = 90; S.o.cmp = true; resetOrb(); setScene('orb'); },
          choices: ['반지름 3배, 한 바퀴 시간 그대로', '반지름 3배, 한 바퀴 시간 3배', '반지름 그대로, 한 바퀴 시간 1/3배', '반지름 9배, 한 바퀴 시간 3배'],
          answer: 0,
          feedback: ['', '속력이 3배라면 둘레도 3배라 시간이 3배일 것 같지만, 원이 커진 만큼 더 빨리 달려서 같아요. T = 2πm/(qB)에는 v가 없어요.', '반지름은 r = mv/(qB)로 속력에 비례해서 커져요.', '9배는 v²에 비례한다고 착각했을 때 나오는 값이에요. r ∝ v(1차)예요.'],
          explain: 'r = mv/(qB)이므로 v가 3배면 r도 <b>3배</b>예요. 그런데 주기 T = 2πm/(qB)에는 v가 없어서 한 바퀴 도는 시간은 <b>그대로</b>예요 — 큰 원을 그만큼 더 빨리 달리기 때문이에요(👥 비교 입자 두 개가 동시에 출발점에 돌아와요).',
        },
      ],
    },
    {
      title: '궤적 해석: 거품 상자 사진', short: '궤적 해석', icon: '🔍', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> r = mv/(qB)와 +·−전하의 회전 방향을 배웠어요. 이제 <b>이미 찍힌 궤적 사진</b>에서 입자의 정보를 읽어요. (궤적을 직접 그리는 것이 아니라 읽는 활동이에요.)</div>' +
        '<p>거품 상자 사진(B는 화면 밖 ⊙)에서 <b>곡선이 휘는 방향</b>으로 전하의 부호를, <b>반지름</b>으로 운동량(p = |q|Br)을 알아내요. 나선으로 안쪽으로 감기는 궤적은 에너지를 잃는 입자예요. 🏭 입자 검출기는 이런 궤적으로 입자를 구별해요.</p>',
      features: ['trk'],
      setup() { S.gate = ''; S.k.guess = { a: {}, b: {} }; S.k.fast = ''; S.k.fig = 'a'; S.k.tt = 0; S.k.touched = false; clrFast(); clr4(); setScene('trk'); },
      recap: '곡선의 휘는 방향으로 전하의 부호를, 반지름 r = p/(|q|B)로 운동량(속력)을 알 수 있어요. 나선으로 안쪽으로 감기면 에너지를 잃고 있는 거예요.',
      summary: '<ul><li>B 방향이 주어지면 <b>휘는 방향</b>으로 부호를 알아요(B ⊙에서 +전하는 시계, −전하는 반시계). 전자·양전자 쌍은 같은 점에서 생겨 반대로 휘어요.</li><li><b>r = p/(|q|B)</b>: 같은 종류의 입자라면 반지름이 큰 궤적이 운동량(속력)이 커요. 예) 양성자 r = 5.0 cm, B = 0.20 T → p = 1.6×10⁻²¹ kg·m/s, v = p/m ≈ <b>9.6×10⁵ m/s</b>.</li><li>에너지를 잃으면 r이 줄어 <b>나선으로 안쪽으로 감겨요</b>.</li><li>같은 속도의 헬륨 핵(전하 2e, 질량 4배)의 반지름은 양성자의 2배예요 (r ∝ m/q).</li></ul>',
      missions: [
        {
          title: '궤적의 부호와 가장 빠른 입자',
          goal: '그림 가·나의 <b>모든 트랙(5개)</b>의 동그라미를 눌러 부호(+ / −)를 맞추고, 그림 가에서 <b>가장 빠른 입자</b>를 고르세요.',
          hint: 'B ⊙에서는 +전하가 시계 방향, −전하가 반시계 방향으로 휘어요. 동그라미를 누를 때마다 ? → + → − 로 바뀌어요. 가장 빠른 것은 반지름이 가장 큰 트랙이에요.',
          setup() { S.gate = ''; S.k.guess = { a: {}, b: {} }; S.k.fast = ''; S.k.fig = 'a'; S.k.tt = 0; S.k.touched = false; clrFast(); setScene('trk'); },
          check: () => trkOK() && fastOK(), hold: 0.6,
          status: () => mark(trkN() === 5) + ' 부호 ' + trkN() + ' / 5 &nbsp; ' + mark(fastOK()) + ' 가장 빠른 입자',
          explain: 'B가 지면 밖(⊙)이면 +전하는 시계 방향, −전하는 반시계 방향으로 휘어요. 그림 가에서 오른쪽으로 휘는 트랙 1·3은 (+), 왼쪽으로 휘는 트랙 2는 (−)예요. 전하량과 질량이 같으면 r = mv/(qB)에서 반지름이 가장 큰 <b>트랙 1</b>이 가장 빨라요. 그림 나의 전자-양전자 쌍은 반대로 휘어요.',
        },
        {
          title: '양성자의 운동량과 속력', manual: true,
          goal: '그림 다의 양성자(r = 5.0 cm, B = 0.20 T)에서 <b>p = qBr</b>과 <b>v = p/m</b>을 구하고, 아래 두 질문에도 답한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'p = 1.6×10⁻¹⁹ × 0.20 × 0.050 = 1.6×10⁻²¹ kg·m/s. v = p/m = 1.6×10⁻²¹ / 1.67×10⁻²⁷ ≈ 9.6×10⁵ m/s. 안쪽으로 감기는 이유는 에너지 손실, 헬륨 핵은 r ∝ m/q.',
          setup() { S.gate = 'mt4'; S.k.fig = 'c'; S.k.tt = 0; clr4(); setScene('trk'); },
          check: () => {
            const miss = s4R.filter((r, i) => !s4St[i]).length; if (miss) return '아직 고르지 않은 질문이 ' + miss + '개 있어요.';
            let bad = 0; s4R.forEach((r, i) => { const o = +s4St[i] - 1 === r[2]; if (!o) bad++; selMark(s4Sels[i], i, o, s4Ok); });
            const a = checkNum(numP, 1.6e-21, 0.04, 'p = qBr = 1.6×10⁻¹⁹ × 0.20 × 0.050 을 계산해 보세요.');
            const b = checkNum(numV, 9.6e5, 0.04, 'v = p/m = 1.6×10⁻²¹ / 1.67×10⁻²⁷ 을 계산해 보세요.');
            if (bad) return '빨간 칸의 질문을 다시 생각해 보세요. (r = mv/(qB))';
            if (a !== true) return a; if (b !== true) return b;
            return true;
          },
          status: () => '질문 ' + s4R.filter((r, i) => s4St[i]).length + ' / 2 · 계산 2칸',
          explain: 'p = qBr = 1.6×10⁻¹⁹ × 0.20 × 0.050 = <b>1.6×10⁻²¹ kg·m/s</b>, v = p/m = 1.6×10⁻²¹ / 1.67×10⁻²⁷ ≈ <b>9.6×10⁵ m/s</b>예요. 나선 궤적이 안쪽으로 감기는 것은 입자가 에너지를 잃어 속력이 줄고 r = mv/(qB)가 작아지기 때문이에요. 같은 속도의 헬륨 핵은 r ∝ m/q = 4/2 = 2배예요.',
        },
      ],
    },
  ];
  levels.forEach((lv) => lv.missions.forEach((m) => { MS[m.title] = m; }));

  game = SciSim.game({
    simId: 'hq-lorentz-force', mount: '#game', badge: '로런츠 힘 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { cond: '🧭 자기장·전기장 상자 · 전하 발사기', mag: '📐 힘 벡터 · 도선 확대 · 달리는 입자', orb: '🌀 전자·양성자·양전자의 원운동', trk: '🔍 거품 상자 궤적 3장' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, { down(p) { return trkDown(p); }, move() {}, up() {}, hover(p) { if (S.mode !== 'trk' || S.k.fig === 'c') return 'default'; const q = lp(p); return TRK[S.k.fig].some((t) => { const z = trackLabelPos(t); return Math.hypot(q.x - z.x, q.y - z.y) < 26; }) ? 'pointer' : 'default'; } });

  /* ---------- 시작 ---------- */
  setSpecies('e'); updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    if (S.mode === 'cond') stepCond(dt); else if (S.mode === 'mag') stepMag(dt); else if (S.mode === 'orb') stepOrb(dt); else S.k.tt += dt;
    sceneBg();
    T(14, 26, TITLE[S.mode], PHONE ? 12.5 : 16.5, '#26324a', 'left', 800);
    if (S.mode === 'cond') drawCond(); else if (S.mode === 'mag') { if (S.m.view === 'vec') drawVec(); else if (S.m.view === 'wire') drawWireZoom(); else drawRun(); } else if (S.mode === 'orb') drawOrb(); else drawTrk();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SC, STP, IN, TRK, MS, SP, numF, numT, numP, numV, s1Sels, fSels, s4Sels, sel1R, s1St, fSt, s4St,
    get game() { return game; }, setScene, updateCtl, launch, clearC, Fm, orbMain, orbParamsM, setSpecies, resetOrb, trkOK, fastOK, trkN, condOK, taskOK, radOK, F0, trkDown, trackLabelPos, lp,
  };

})();
