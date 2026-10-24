/* =========================================================
   전자기와 양자 Ⅰ. 전자기적 상호작용 - 로런츠 힘의 활용 (단원 6차시)
   성취기준 [12전자01-04] 로런츠 힘이 발생하는 조건을 알고, 로런츠 힘과 관련된 현상과 기술을 설명할 수 있다.
   ① 모형: 사이클로트론 (공명 f = qB/2πm, K = (qBR)²/2m)
   ② 탐구: 질량 분석 (속도 선택기 v = E/B₁, r = mv/qB₂)
   ③ 탐구: 토카막 (자기장에 감겨 도는 플라스마 가두기, r = mv/qB)
   ④ 분석: 밴앨런대와 오로라 (자기 거울, 위성 궤도)
   상대론적 가속기, 플라스마 불안정성, 자기 거울 조건의 수식, 지구 자기장 모형 식은 다루지 않아요.
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

  const QE = 1.6e-19, ME = 9.11e-31, MP = 1.67e-27, MD = 3.344e-27, EV = 1.602e-19;
  const MODE_LABEL = { cyc: '⚛️ 사이클로트론', mass: '🧪 질량 분석', tok: '🍩 토카막', van: '🌍 밴앨런대' };
  const TITLE = { cyc: '⚛️ 사이클로트론: 틈새에서 가속, D 안에서 반원 (위에서 본 모습, B ⊙)', mass: '🧪 질량 분석기: 속도 선택기 → 반원 → 검출기', tok: '🍩 토카막: 자기장이 뜨거운 플라스마를 가둔다', van: '🌍 지구 자기장에 갇힌 입자: 밴앨런대와 오로라' };
  const CXs = SC.w / 2, CYs = SC.h / 2;
  const rand = (a, b) => a + Math.random() * (b - a);

  const S = {
    mode: 'cyc', t: 0, fade: 0, gate: '',
    cy: { B: 1.0, f: 15.2, stage: 'idle', n: 0, K: 0, y0: 0, seg: null, path: new Path2D(), hist: [], msg: '', maxK: 0, peaked: false, flash: 0, ext: false, Kext: 0, done: false, keepFlag: 0 },
    ms: { E: 5.0, B1: 0.5, set: 'mix', ions: [], spawnT: 0, hits: {}, sums: {}, spots: [], flashes: [], bins: {}, run: true },
    tk: { B: 0.5, Bd: 0.5, Ip: false, ions: [], Ts: 1.0, hot: 0, lost: 0, flashes: [], t: 0, seenR: false },
    va: { sp: 'p', pitch: 40, storm: false, p: null, trail: [], bounce: 0, aur: 0, aurHits: 0, lastSign: 0, lastBT: -9, state: 'idle', ambient: [], landFlash: [], t: 0, maxBounce: 0, losses: 0, trapped: false, sats: {} },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const barRow = (x, y, w, label, col, frac, txt) => {
    T(x, y + 12, label, 13, '#26324a', 'left', 800);
    D.roundRect(x + 112, y, w - 112, 16, 7); ctx.fillStyle = '#eef1f7'; ctx.fill();
    const bw = Math.max(3, clamp(frac, 0, 1) * (w - 112)); D.roundRect(x + 112, y, bw, 16, 7); ctx.fillStyle = col; ctx.fill();
    T(x + 112 + bw + 8, y + 12.5, txt, 12.5, '#26324a', 'left', 800);
  };

  /* ================= ① 사이클로트론 ================= */
  const CY = { R: 170, RD: 182, Rm: 0.5, V0: 20e3, kap: 1 / 25, gap: 7 };
  const cyFres = (B) => QE * B / (TAU * MP);                          // Hz
  const cyKext = (B) => Math.pow(QE * B * CY.Rm, 2) / (2 * MP);        // J
  const MEV = 1.602e-13;
  const cyDelta = () => S.cy.f * 1e6 / cyFres(S.cy.B) - 1;
  const cyRm = (K, B) => Math.sqrt(2 * MP * K) / (QE * B);              // m
  const cyPx = (rm) => rm * CY.R / CY.Rm;
  function cyReset() {
    const c = S.cy; c.n0 = Math.round(cyKext(c.B) / (QE * CY.V0)); c.stage = 'idle'; c.n = 0; c.K = 0; c.y0 = 0; c.seg = null; c.path = new Path2D(); c.hist = []; c.msg = ''; c.maxK = 0; c.peaked = false; c.ext = false; c.Kext = 0; c.flash = 0; c.keepFlag = 0;
  }
  function cyGain(n) {                                                  // n번째(0부터) 틈새 통과에서 얻는 운동 에너지 (J)
    const th = n * Math.PI * cyDelta() * CY.kap;
    return QE * CY.V0 * Math.cos(th);
  }
  function cyStartSeg() {                                               // 다음 반원 준비: 틈새 통과(가속) 후 반원
    const c = S.cy, n = c.n;                                            // n: 지금까지 통과한 횟수
    const g = cyGain(n); c.K = Math.max(0, c.K + g); c.hist.push(g / (QE * CY.V0)); if (c.hist.length > 14) c.hist.shift();
    c.maxK = Math.max(c.maxK, c.K);
    c.n = n + 1;
    if (c.K < 1e-22) { c.stage = 'fail'; c.msg = '공명이 어긋나 가속되지 않고 멈췄어요'; c.seg = null; return; }
    const rm = cyRm(c.K, S.cy.B), rpx = cyPx(rm), odd = c.n % 2 === 1, s = odd ? 1 : -1;
    const cyc = c.y0 + s * rpx;                                         // 반원의 중심 높이(상대)
    const reach = rpx;
    c.seg = { n: c.n, rpx, s, cy: cyc, y0: c.y0, prog: 0, dur: RM ? 0.01 : 0.26 / (1 + c.n / 5) + 0.0022, last: reach >= CY.R };
    c.flash = 1;
    if (c.n > 2400) { c.stage = 'fail'; c.msg = '너무 오래 걸려요: 공명을 맞춰 보세요'; c.seg = null; }
  }
  function cyStart() { cyReset(); S.cy.stage = 'run'; Sound.click(); cyStartSeg(); updateCtl(); }
  function stepCyc(dt) {
    const c = S.cy;
    c.flash = Math.max(0, c.flash - dt * 4);
    if (c.stage !== 'run' || !c.seg) return;
    let budget = dt;
    while (budget > 0 && c.stage === 'run' && c.seg) {
      const sg = c.seg, need = (1 - sg.prog) * sg.dur;
      if (budget < need) { sg.prog += budget / sg.dur; budget = 0; break; }
      budget -= need; sg.prog = 1;
      // 반원 완성: 자취에 더하기
      const a0 = sg.s > 0 ? -Math.PI / 2 : Math.PI / 2, a1 = a0 + Math.PI;
      const dr = CY.R / (2 * Math.sqrt(Math.max(1, sg.n) * Math.max(1, c.n0 || 600))), st = Math.max(1, Math.ceil(5 / (2 * dr))), turn = Math.floor((sg.n - 1) / 2);
      if (turn % st === 0) { c.path.moveTo(CXs + sg.rpx * Math.cos(a0), CYs + sg.cy + sg.rpx * Math.sin(a0)); c.path.arc(CXs, CYs + sg.cy, sg.rpx, a0, a1, false); }
      c.y0 = sg.y0 + sg.s * 2 * sg.rpx;
      if (sg.last) { c.stage = 'done'; c.ext = true; c.Kext = c.K; c.done = true; c.seg = null; Sound.success(); parts.burst(SC.x + CXs + (sg.s > 0 ? 100 : -100), SC.y + CYs + c.y0, { count: 30, speed: 220, life: 0.9, size: 3.5 }); break; }
      cyStartSeg();
    }
  }
  function cyBars(x, y, w, h) {
    const c = S.cy, n = 14, bw = (w - 8) / n;
    ctx.fillStyle = '#eef1f7'; D.roundRect(x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 4, y + h / 2); ctx.lineTo(x + w - 4, y + h / 2); ctx.stroke();
    c.hist.forEach((g, i) => { const hh = g * (h / 2 - 3); const bx = x + 4 + (n - c.hist.length + i) * bw; ctx.fillStyle = g >= 0 ? '#16a34a' : '#e2574c'; ctx.fillRect(bx + 1, g >= 0 ? y + h / 2 - hh : y + h / 2, bw - 2, Math.max(1, Math.abs(hh))); });
  }
  function drawCyc() {
    const c = S.cy, B = c.B, fres = cyFres(B) / 1e6, dl = cyDelta(), mkF = S.gate === 'mc1';
    sceneBegin();
    // 디 (D 모양 전극)
    const g1 = ctx.createRadialGradient(CXs - 40, CYs - 60, 20, CXs, CYs, CY.RD); g1.addColorStop(0, '#f1f6ff'); g1.addColorStop(1, '#d5e3fb');
    ctx.fillStyle = g1; ctx.strokeStyle = '#6b86b8'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(CXs, CYs, CY.RD, -Math.PI / 2, Math.PI / 2, false); ctx.lineTo(CXs + CY.gap / 2, CYs + CY.RD); ctx.lineTo(CXs + CY.gap / 2, CYs - CY.RD); ctx.closePath();
    ctx.save(); ctx.beginPath(); ctx.arc(CXs, CYs, CY.RD, -Math.PI / 2, Math.PI / 2, false); ctx.lineTo(CXs + CY.gap / 2, CYs + CY.RD); ctx.lineTo(CXs + CY.gap / 2, CYs - CY.RD); ctx.closePath(); ctx.restore();
    D.shadow(() => { ctx.beginPath(); ctx.moveTo(CXs + CY.gap / 2, CYs - CY.RD); ctx.arc(CXs + CY.gap / 2, CYs, CY.RD, -Math.PI / 2, Math.PI / 2, false); ctx.closePath(); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.beginPath(); ctx.moveTo(CXs + CY.gap / 2, CYs - CY.RD); ctx.arc(CXs + CY.gap / 2, CYs, CY.RD, -Math.PI / 2, Math.PI / 2, false); ctx.closePath(); ctx.stroke();
    D.shadow(() => { ctx.beginPath(); ctx.moveTo(CXs - CY.gap / 2, CYs - CY.RD); ctx.arc(CXs - CY.gap / 2, CYs, CY.RD, -Math.PI / 2, Math.PI / 2, true); ctx.closePath(); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.beginPath(); ctx.moveTo(CXs - CY.gap / 2, CYs - CY.RD); ctx.arc(CXs - CY.gap / 2, CYs, CY.RD, -Math.PI / 2, Math.PI / 2, true); ctx.closePath(); ctx.stroke();
    // ⊙ 자기장 점
    for (let x = CXs - 150; x <= CXs + 150; x += 50) for (let y = CYs - 150; y <= CYs + 150; y += 50) { if (Math.hypot(x - CXs, y - CYs) > CY.RD - 14 || Math.abs(x - CXs) < 12) continue; ctx.strokeStyle = 'rgba(124,58,237,.38)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(124,58,237,.55)'; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill(); }
    T(CXs + 70, CYs - CY.R + 26, 'D', 20, '#6b86b8', 'center', 800); T(CXs - 70, CYs - CY.R + 26, 'D', 20, '#6b86b8', 'center', 800);
    // 틈새의 전기장
    ctx.fillStyle = 'rgba(250,204,21,' + (0.28 + 0.4 * c.flash) + ')'; ctx.fillRect(CXs - CY.gap / 2, CYs - CY.RD, CY.gap, CY.RD * 2);
    if (c.stage === 'run' && c.seg) {
      const nextRight = c.seg.n % 2 === 0, g = cyGain(c.n), col = g >= 0 ? '#16a34a' : '#e2574c';
      for (let k = -2; k <= 2; k++) { const y = CYs + k * 30; D.arrow(CXs + (nextRight ? -5 : 5), y, CXs + (nextRight ? 5 : -5), y, { color: col, width: 2.4, head: 6 }); }
    }
    // 입자 자취와 입자
    ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.stroke(c.path);
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(CXs, CYs, 4, 0, TAU); ctx.fill(); T(CXs + 8, CYs + 20, '이온 주입', 12, '#475569', 'left', 800);
    if (c.seg) {
      const sg = c.seg, a0 = sg.s > 0 ? -Math.PI / 2 : Math.PI / 2, a = a0 + Math.PI * sg.prog;
      ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(CXs, CYs + sg.cy, sg.rpx, a0, a, false); ctx.stroke();
      const px = CXs + sg.rpx * Math.cos(a), py = CYs + sg.cy + sg.rpx * Math.sin(a);
      D.glow(px, py, 18, '#f97316', 0.5); D.sphere(px, py, 6.5, POS, { shadow: true, text: '+', textScale: 1.2 });
    } else if (c.stage === 'done') {
      const yy = CYs + c.y0; D.glow(CXs, yy, 30, '#fbbf24', 0.6); lbl(CXs, 24, '인출! K = ' + g3(c.Kext / MEV) + ' MeV', { bg: '#16a34a', color: '#fff', size: 14, pad: 10, minX: 0, maxX: SC.w });
    }
    if (c.stage === 'fail') lbl(CXs, 24, c.msg, { bg: '#e2574c', color: '#fff', size: 13, pad: 9, minX: 0, maxX: SC.w });
    if (c.stage === 'idle') lbl(CXs, 24, '▶ 가속 시작을 눌러 양성자를 넣어 보세요', { size: 13, minX: 0, maxX: SC.w, color: '#9a3412' });
    // 공명 표시
    ctx.fillStyle = 'rgba(255,255,255,.92)'; D.roundRect(8, SC.h - 52, 168, 44, 10); ctx.fill();
    T(16, SC.h - 34, 'f = ' + c.f.toFixed(1) + ' MHz', 13, '#1e40af', 'left', 800);
    T(16, SC.h - 15, mkF ? '공명 진동수 = ?' : '공명 진동수 = ' + fres.toFixed(1) + ' MHz', 12.5, Math.abs(dl) < 0.013 && !mkF ? '#0b7a41' : '#9a3412', 'left', 800);
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    T(STP.x + 12, STP.y + 18, '틈새를 지날 때마다 얻는 에너지 (초록: 가속, 빨강: 감속)', 12.5, '#1e40af', 'left', 800);
    cyBars(STP.x + 10, STP.y + 26, STP.w - 20, 54);
    // 설명
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = IN.y + 24, x = IN.x + 14, mw = IN.w - 28;
    T(x, y, '사이클로트론 (양성자)', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    y += textBlock(x, y, mw, '반 바퀴 시간 T/2 = πm/(qB)는 속력과 무관 → 같은 진동수 f = qB/(2πm)의 전압으로 계속 가속해요.', sz - 0.5, '#26324a', lh - 1, 800) + 2;
    y += textBlock(x, y, mw, '공명 f = ' + (mkF ? '?' : g3(fres) + ' MHz') + ' (B = ' + B.toFixed(1) + ' T)', sz, '#9a3412', lh, 800) + 2;
    const Ke = cyKext(B) / MEV;
    y += textBlock(x, y, mw, '최종 K = (qBR)²/2m = ' + (mkF ? '?' : g3(Ke) + ' MeV') + '  (R = 0.50 m)', sz - 0.5, '#9a3412', lh - 1, 800) + 2;
    y += textBlock(x, y, mw, '틈새 1번 20 kV → 20 keV (1바퀴 40 keV)', sz - 0.5, '#26324a', lh - 1, 800) + 2;
    if (!PHONE) y += textBlock(x, y + 2, mw, '⚠ 자기장은 방향만 바꿔요. 입자를 가속하는 것은 틈새의 전기장이에요.', sz - 0.5, '#0b7a41', lh - 1, 800) + 2;
    if (!PHONE) textBlock(x, y + 4, mw, '🏭 의료용 양성자 치료, 동위원소 생산. (그림은 어긋남의 영향을 25분의 1로 줄여 보여 줘요.)', sz - 1, '#516079', lh - 2, 700);
  }
  bindSl('sCB', () => S.cy.B, (v) => { S.cy.B = v; cyReset(); }, updateCtlProxy);
  bindSl('sCf', () => S.cy.f, (v) => { S.cy.f = v; cyReset(); }, updateCtlProxy);
  $('#bCyGo').addEventListener('click', cyStart);
  $('#bCyReset').addEventListener('click', () => { Sound.click(); cyReset(); updateCtl(); });
  function updateCtlProxy() { updateCtl(); }

  /* ================= ② 질량 분석 ================= */
  const MSC = { pxcm: 40, y0: 100, sx0: 50, sx1: 190, wall: 204, half: 32, hole: 6, TS: 2.5e-7, B2: 0.5 };
  const PXM = MSC.pxcm * 100;
  const SPC = { c12: { name: '탄소-12 이온', m: 1.99e-26, q: 1, col: '#e2464b' }, c14: { name: '탄소-14 이온', m: 2.32e-26, q: 1, col: '#2f6df6' }, c12d: { name: '탄소-12 이온 (+2e)', m: 1.99e-26, q: 2, col: '#f59e0b' }, x: { name: '시료 X 이온', m: 2.159e-26, q: 1, col: '#10b981' } };
  const SETS = { mix: ['c12', 'c14'], dbl: ['c12d'], x: ['x'] };
  const VSET = [0.6e5, 0.8e5, 1.0e5, 1.25e5, 1.6e5];
  const msV = () => S.ms.E * 1e4 / S.ms.B1;
  function msReset() { const m = S.ms; m.ions = []; m.hits = {}; m.sums = {}; m.spots = []; m.flashes = []; m.bins = {}; m.spawnT = 0; }
  function msSpawn() {
    const m = S.ms, set = SETS[m.set], k = set[(Math.random() * set.length) | 0], sp = SPC[k];
    // 선택 속력 가까이에서도 자주 나오도록: 절반은 속도 선택값에 가까운 고정 목록
    const v = VSET[(Math.random() * VSET.length) | 0];
    m.ions.push({ k, sp, x: 14, y: MSC.y0 + rand(-1.2, 1.2), vx: v, vy: 0, in2: false, dead: false, trail: [] });
    if (m.ions.length > 90) m.ions.shift();
  }
  function stepMs(dt) {
    const m = S.ms; if (!m.run) return;
    m.spawnT += dt; while (m.spawnT > 0.075) { m.spawnT -= 0.075; msSpawn(); }
    const E = m.E * 1e4, B1 = m.B1, B2 = MSC.B2;
    const dtr = dt * MSC.TS, n = Math.max(1, Math.ceil(dtr / 1.2e-9)), h = dtr / n;
    m.ions.forEach((p) => {
      if (p.dead) return;
      const qm = p.sp.q * QE / p.sp.m;
      for (let i = 0; i < n && !p.dead; i++) {
        const inSel = p.x >= MSC.sx0 && p.x <= MSC.sx1, inB2 = p.in2 && p.x > MSC.wall;
        const ey = inSel ? E : 0, B = inSel ? B1 : inB2 ? B2 : 0;
        p.vy += qm * ey * h / 2;
        if (B > 0) { const th = -qm * B * h, c = Math.cos(th), s = Math.sin(th), vx = p.vx * c - p.vy * s, vy = p.vx * s + p.vy * c; p.vx = vx; p.vy = vy; }
        p.vy += qm * ey * h / 2;
        const ox = p.x;
        p.x += p.vx * h * PXM; p.y -= p.vy * h * PXM;
        if (inSel || (p.x >= MSC.sx0 && p.x <= MSC.sx1)) { if (Math.abs(p.y - MSC.y0) >= MSC.half) { p.dead = true; m.flashes.push({ x: p.x, y: p.y, t: 0, c: '#94a3b8' }); } }
        if (!p.in2 && ox < MSC.wall && p.x >= MSC.wall) {
          if (Math.abs(p.y - MSC.y0) > MSC.hole) { p.dead = true; m.flashes.push({ x: MSC.wall - 3, y: p.y, t: 0, c: '#94a3b8' }); } else p.in2 = true;
        } else if (p.in2 && p.x <= MSC.wall && p.vx < 0) {
          p.dead = true; const d = (p.y - MSC.y0) / MSC.pxcm;
          m.hits[p.k] = (m.hits[p.k] || 0) + 1; m.sums[p.k] = (m.sums[p.k] || 0) + d;
          const bin = Math.round(p.y / 2); m.bins[bin] = (m.bins[bin] || { n: 0, k: p.k }); m.bins[bin].n++;
          m.flashes.push({ x: MSC.wall, y: p.y, t: 0, c: p.sp.col }); Sound.tick && Sound.tick();
        }
        if (p.y < -10 || p.y > SC.h + 10 || p.x > SC.w + 10) p.dead = true;
      }
      p.trail.push(p.x, p.y); if (p.trail.length > 36) p.trail.splice(0, 2);
    });
    m.ions = m.ions.filter((p) => !p.dead || p.trail.length > 0 && (p.trail.shift(), p.trail.shift(), p.trail.length > 0));
    m.flashes.forEach((f) => { f.t += dt; }); m.flashes = m.flashes.filter((f) => f.t < 0.7);
  }
  const msMean = (k) => (S.ms.hits[k] ? S.ms.sums[k] / S.ms.hits[k] : null);
  function drawMass() {
    const m = S.ms, mkM = S.gate === 'mm2', vsel = msV();
    sceneBegin();
    // B2 영역 (⊙)
    ctx.fillStyle = 'rgba(124,58,237,.06)'; ctx.fillRect(MSC.wall, 0, SC.w - MSC.wall, SC.h);
    for (let x = MSC.wall + 22; x < SC.w; x += 34) for (let y = 22; y < SC.h; y += 34) { ctx.strokeStyle = 'rgba(124,58,237,.35)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(124,58,237,.5)'; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill(); }
    lbl(SC.w - 90, 20, 'B₂ = 0.50 T ⊙', { bg: COL_B, color: '#fff', size: 12.5, pad: 7, minX: MSC.wall, maxX: SC.w });
    // 선택기: 판, B1
    ctx.fillStyle = 'rgba(124,58,237,.07)'; ctx.fillRect(MSC.sx0, MSC.y0 - MSC.half, MSC.sx1 - MSC.sx0, MSC.half * 2);
    for (let x = MSC.sx0 + 14; x < MSC.sx1; x += 28) { ctx.strokeStyle = 'rgba(124,58,237,.4)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(x, MSC.y0 + 14, 4.5, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(124,58,237,.55)'; ctx.beginPath(); ctx.arc(x, MSC.y0 + 14, 1.3, 0, TAU); ctx.fill(); }
    D.roundRect(MSC.sx0, MSC.y0 - MSC.half - 7, MSC.sx1 - MSC.sx0, 7, 3); ctx.fillStyle = '#2f6df6'; ctx.fill();
    D.roundRect(MSC.sx0, MSC.y0 + MSC.half, MSC.sx1 - MSC.sx0, 7, 3); ctx.fillStyle = '#e2574c'; ctx.fill();
    T(MSC.sx0 + 4, MSC.y0 - MSC.half - 12, '(−)판', 12, '#1e40af', 'left', 800); T(MSC.sx0 + 4, MSC.y0 + MSC.half + 22, '(+)판', 12, '#9a3412', 'left', 800);
    for (let i = 0; i < 4; i++) { const x = MSC.sx0 + 24 + i * 34; D.arrow(x, MSC.y0 - 5, x, MSC.y0 - 22, { color: 'rgba(37,99,235,.7)', width: 2, head: 6 }); }
    lbl(MSC.sx0 + 70, 22, '속도 선택기: E ↑ · B₁ ⊙', { bg: '#334155', color: '#fff', size: 12.5, pad: 7, minX: 0, maxX: SC.w });
    // 이온원
    D.roundRect(2, MSC.y0 - 16, 22, 32, 6); ctx.fillStyle = '#64748b'; ctx.fill(); T(13, MSC.y0 + 4, '원', 13, '#fff', 'center', 800);
    // 벽 (슬릿)
    ctx.fillStyle = '#475569'; ctx.fillRect(MSC.wall - 3, 0, 6, MSC.y0 - MSC.hole); ctx.fillRect(MSC.wall - 3, MSC.y0 + MSC.hole, 6, SC.h - MSC.y0 - MSC.hole);
    T(MSC.wall - 8, 18, '슬릿', 12, '#475569', 'right', 800);
    // 눈금자 (슬릿에서의 거리 d)
    for (let d = 0; d <= 8; d++) { const y = MSC.y0 + d * MSC.pxcm; if (y > SC.h - 6) break; ctx.strokeStyle = '#334155'; ctx.lineWidth = d % 2 === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(MSC.wall - 3, y); ctx.lineTo(MSC.wall - (d % 2 === 0 ? 14 : 8), y); ctx.stroke(); if (d > 0 && d % 2 === 0) T(MSC.wall - 18, y + 4, d + ' cm', 11.5, '#334155', 'right', 800); }
    // 검출기 막대
    Object.keys(m.bins).forEach((k) => { const b = m.bins[k], y = (+k) * 2, w = Math.min(46, b.n * 2.2); ctx.fillStyle = SPC[b.k].col; ctx.globalAlpha = 0.85; ctx.fillRect(MSC.wall - 3 - w, y - 1.5, w, 3); ctx.globalAlpha = 1; });
    // 이온
    m.ions.forEach((p) => {
      if (p.trail.length > 2) { ctx.strokeStyle = p.sp.col; ctx.globalAlpha = 0.45; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.trail[0], p.trail[1]); for (let i = 2; i < p.trail.length; i += 2) ctx.lineTo(p.trail[i], p.trail[i + 1]); ctx.stroke(); ctx.globalAlpha = 1; }
      if (!p.dead) { ctx.fillStyle = p.sp.col; ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(p.x - 1, p.y - 1, 1.1, 0, TAU); ctx.fill(); }
    });
    m.flashes.forEach((f) => { D.glow(f.x, f.y, 10 * (1 + f.t * 2), f.c, 0.45 * (1 - f.t / 0.7)); });
    // 평균 도착 위치 표시
    Object.keys(SPC).forEach((k) => { const d = msMean(k); if (d == null || (m.hits[k] || 0) < 3) return; const y = MSC.y0 + d * MSC.pxcm; lbl(MSC.wall + 60, y, SPC[k].name.replace(' 이온', '').replace(' (+2e)', '²⁺') + ': d = ' + d.toFixed(1) + ' cm', { bg: SPC[k].col, color: '#fff', size: 12.5, pad: 7, minX: MSC.wall + 6, maxX: SC.w }); });
    // 선택 속력 안내
    lbl(MSC.wall + 70, SC.h - 20, '통과 속력 v = E/B₁ = ' + (mkM ? '1.0×10⁵ m/s' : g3(vsel / 1e5) + '×10⁵ m/s'), { bg: 'rgba(255,255,255,.95)', color: '#1e40af', size: 12.5, pad: 7, minX: MSC.wall + 4, maxX: SC.w });
    sceneEnd();
    // 띠
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    T(STP.x + 12, STP.y + 20, '도착한 이온 (평균 위치 d = 지름 = 2r)', 13, '#1e40af', 'left', 800);
    const set = SETS[m.set];
    set.forEach((k, i) => {
      const n = m.hits[k] || 0, d = msMean(k);
      T(STP.x + 14, STP.y + 44 + i * 22, SPC[k].name, 13, SPC[k].col, 'left', 800);
      T(STP.x + 200, STP.y + 44 + i * 22, 'n = ' + n + '  d = ' + (d == null ? '—' : d.toFixed(1) + ' cm' + (mkM ? '' : '  (r = ' + (d / 2).toFixed(2) + ' cm)')), 13, '#26324a', 'left', 800);
    });
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = IN.y + 24, x = IN.x + 14, mw = IN.w - 28;
    T(x, y, '속도 선택기 → 질량 분석', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    y += textBlock(x, y, mw, 'qE = qvB₁ → v = E/B₁ (질량·전하와 무관)', sz - 0.5, '#9a3412', lh - 1, 800) + 2;
    y += textBlock(x, y, mw, 'E = ' + g3(m.E) + '×10⁴ V/m, B₁ = ' + g3(m.B1) + ' T → v = ' + (mkM ? '?' : g3(vsel / 1e5) + '×10⁵ m/s'), sz - 0.5, '#26324a', lh - 1, 800) + 2;
    y += textBlock(x, y, mw, '반원: r = mv/(qB₂) ∝ m (같은 v, q). 도착 위치는 지름 d = 2r.', sz - 0.5, '#26324a', lh - 1, 800) + 2;
    if (!PHONE) {
      y += textBlock(x, y, mw, '예) 탄소-12: r = 2.5 cm, 탄소-14: r = 2.9 cm → 두 지점이 구별돼요.', sz - 0.5, '#26324a', lh - 1, 800) + 2;
      y += textBlock(x, y, mw, '도선이 받는 힘 F = BIL은 이런 전하들이 받는 힘의 합이에요.', sz - 1, '#516079', lh - 2, 700) + 2;
      textBlock(x, y + 4, mw, '🏭 동위원소 비 측정, 탄소 연대 측정, 약물 분석, 반도체 이온 주입.', sz - 1, '#0b7a41', lh - 2, 800);
    }
  }
  bindSl('sME', () => S.ms.E, (v) => { S.ms.E = v; msReset(); }, updateCtlProxy);
  bindSl('sMB', () => S.ms.B1, (v) => { S.ms.B1 = v; msReset(); }, updateCtlProxy);
  $$('#setSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ms.set = b.dataset.v; msReset(); updateCtl(); }));
  $('#bMsClear').addEventListener('click', () => { Sound.click(); msReset(); });

  /* ================= ③ 토카막 ================= */
  const TKS = { x0: 14, x1: 458, yT: 176, yB: 386, v0: 51.5, pxcm: 12, nu: 0.25, heat: 0.12, N: 44, Tmax: 1.5e8 };
  const tkMid = () => (TKS.yT + TKS.yB) / 2, tkHalf = () => (TKS.yB - TKS.yT) / 2;
  const tkRfull = (B) => 2.05 / Math.max(B, 1e-6) * TKS.pxcm;              // 에너지 10 keV 중수소의 반지름(화면 단위)
  const tkR_mm = (B) => (MD * Math.sqrt(2 * 10e3 * EV / MD) / (QE * B)) * 1000;
  function tkNewIon(hot) {
    const i = { x: rand(TKS.x0 + 20, TKS.x1 - 20), y: tkMid() + rand(-0.8, 0.8) * tkHalf(), e: hot ? 1 : 0, state: 'ok', cd: 0, phi: rand(0, TAU), vpar: 0, sa: 1, yc: 0, dir: rand(0, TAU), tr: [] };
    tkCollide(i); return i;
  }
  function tkCollide(i) {
    const ca = rand(-1, 1); i.sa = Math.sqrt(1 - ca * ca); i.ca = ca; i.phi = rand(0, TAU); i.dir = rand(0, TAU);
  }
  function tkReset(e0) { const k = S.tk; e0 = e0 == null ? 1 : e0; k.ions = []; for (let i = 0; i < TKS.N; i++) { const q = tkNewIon(true); q.e = e0; k.ions.push(q); } k.Ts = e0; k.lost = 0; k.flashes = []; }
  function stepTok(dt) {
    const k = S.tk; k.t += dt; k.Bd = SciSim.approach(k.Bd, k.B, dt, 6);
    const B = k.Bd; let sum = 0;
    k.ions.forEach((i) => {
      if (i.state === 'out') { i.cd -= dt; if (i.cd <= 0) { i.state = 'ok'; i.e = 0; i.x = rand(TKS.x0 + 20, TKS.x1 - 20); i.y = tkMid() + rand(-0.7, 0.7) * tkHalf(); tkCollide(i); i.tr = []; } sum += 0; return; }
      i.e = Math.min(1, i.e + TKS.heat * dt);
      if (Math.random() < TKS.nu * dt) tkCollide(i);
      const sq = Math.sqrt(i.e), v = TKS.v0 * sq;
      if (B < 0.05) { i.x += Math.cos(i.dir) * v * dt; i.y += Math.sin(i.dir) * v * dt; }
      else {
        const r = tkRfull(B) * sq * i.sa, w = 2.094 * B;
        const yc = i.y - r * Math.cos(i.phi);                              // 세기가 바뀌어도 위치가 튀지 않게 중심을 다시 잡아요
        i.phi += w * dt; i.y = yc + r * Math.cos(i.phi); i.x += v * i.ca * dt;
      }
      if (i.x > TKS.x1) i.x = TKS.x0; if (i.x < TKS.x0) i.x = TKS.x1;       // 도넛 방향으로 이어져요
      i.tr.push(i.x, i.y); if (i.tr.length > 24) i.tr.splice(0, 2);
      if (i.y < TKS.yT + 3 || i.y > TKS.yB - 3) { k.flashes.push({ x: i.x, y: i.y < tkMid() ? TKS.yT : TKS.yB, t: 0 }); i.state = 'out'; i.cd = 0.6; i.e = 0; i.tr = []; k.lost++; Sound.tick && Sound.tick(); }
      sum += i.e;
    });
    k.Tm = sum / k.ions.length; k.Ts = SciSim.approach(k.Ts, k.Tm, dt, 1.2);
    k.flashes.forEach((f) => { f.t += dt; }); k.flashes = k.flashes.filter((f) => f.t < 0.5);
  }
  const tkTemp = () => S.tk.Ts * TKS.Tmax;
  const tempCol = (f) => (f < 0.5 ? C.mix('#3b82f6', '#fbbf24', f * 2) : C.mix('#fbbf24', '#ef4444', (f - 0.5) * 2));
  function drawDonut() {
    const k = S.tk, cx = CXs, cy = 78, rxO = 200, ryO = 56, rxI = 108, ryI = 24, f = clamp(k.Ts, 0, 1);
    // 도넛 몸체
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rxO, ryO, 0, 0, TAU); ctx.ellipse(cx, cy, rxI, ryI, 0, 0, TAU, true);
    const g = ctx.createLinearGradient(0, cy - ryO, 0, cy + ryO); g.addColorStop(0, '#e2e8f0'); g.addColorStop(1, '#b6c2d4'); ctx.fillStyle = g; ctx.fill('evenodd'); ctx.restore();
    ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, rxO, ryO, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx, cy, rxI, ryI, 0, 0, TAU); ctx.stroke();
    // 플라스마 (온도에 따라 색과 밝기)
    const rxC = (rxO + rxI) / 2, ryC = (ryO + ryI) / 2;
    ctx.save(); ctx.lineWidth = 16 + 10 * f; ctx.lineCap = 'round'; ctx.strokeStyle = C.rgba(tempCol(f), 0.35 + 0.4 * f); ctx.beginPath(); ctx.ellipse(cx, cy, rxC, ryC, 0, 0, TAU); ctx.stroke(); ctx.restore();
    // 코일
    for (let i = 0; i < 14; i++) { const a = i * TAU / 14 + 0.2, px = cx + rxC * Math.cos(a), py = cy + ryC * Math.sin(a); ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(ryC * Math.cos(a), -rxC * Math.sin(a))); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 4, 21, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    // 도넛 방향 자기장 화살표
    if (k.Bd > 0.05) for (let i = 0; i < 10; i++) { const a = (i * TAU / 10 + (RM ? 0 : S.t * 0.5 * k.Bd / 3)) % TAU, px = cx + rxC * Math.cos(a), py = cy + ryC * Math.sin(a), tx = -rxC * Math.sin(a), ty = ryC * Math.cos(a), tm = Math.hypot(tx, ty); ctx.fillStyle = 'rgba(124,58,237,' + clamp(0.35 + k.Bd / 6, 0, 0.95) + ')'; ctx.beginPath(); ctx.moveTo(px + tx / tm * 8, py + ty / tm * 8); ctx.lineTo(px - tx / tm * 6 - ty / tm * 5, py - ty / tm * 6 + tx / tm * 5); ctx.lineTo(px - tx / tm * 6 + ty / tm * 5, py - ty / tm * 6 - tx / tm * 5); ctx.closePath(); ctx.fill(); }
    // 플라스마 전류 → 나선형 자기력선
    if (k.Ip) {
      ctx.strokeStyle = 'rgba(16,185,129,.95)'; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let i = 0; i <= 260; i++) { const th = i / 260 * TAU, ph = 3 * th + (RM ? 0 : S.t * 1.2), px = cx + (rxC + 22 * Math.cos(ph)) * Math.cos(th), py = cy + (ryC + 7 * Math.cos(ph)) * Math.sin(th) - 13 * Math.sin(ph); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.stroke();
      lbl(cx, cy - ryO - 4 + 6, '나선 모양 자기력선 = 도넛 방향 B + 플라스마 전류의 B', { bg: '#10b981', color: '#fff', size: 11.5, pad: 6, minX: 0, maxX: SC.w });
    }
    // 확대 창
    ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2.4; const wx = cx - rxC, wy = cy; D.roundRect(wx - 22, wy - 18, 44, 36, 7); ctx.stroke();
    ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(wx - 22, wy + 18); ctx.lineTo(TKS.x0, TKS.yT - 6); ctx.moveTo(wx + 22, wy + 18); ctx.lineTo(TKS.x1, TKS.yT - 6); ctx.stroke(); ctx.setLineDash([]);
    T(cx, cy + 6, '진공 용기(도넛)', 12.5, '#475569', 'center', 800);
  }
  function drawTok() {
    const k = S.tk, B = k.B, mk = S.gate === 'mt2';
    sceneBegin();
    drawDonut();
    // 슬랩 (확대)
    const mid = tkMid();
    ctx.fillStyle = '#fbfcff'; ctx.fillRect(TKS.x0, TKS.yT, TKS.x1 - TKS.x0, TKS.yB - TKS.yT);
    if (k.Bd > 0.05) for (let i = 0; i < 5; i++) { const y = TKS.yT + 20 + i * ((TKS.yB - TKS.yT - 40) / 4); D.arrow(TKS.x0 + 6, y, TKS.x1 - 6, y, { color: 'rgba(124,58,237,' + clamp(0.1 + k.Bd / 12, 0, 0.45) + ')', width: 1.6, head: 7 }); }
    ctx.fillStyle = '#64748b'; ctx.fillRect(TKS.x0, TKS.yT - 7, TKS.x1 - TKS.x0, 7); ctx.fillRect(TKS.x0, TKS.yB, TKS.x1 - TKS.x0, 7);
    T(TKS.x0 + 6, TKS.yT - 12, '용기 벽 (닿으면 식어요)', 11.5, '#475569', 'left', 800);
    // 회전 반지름 표시
    if (B > 0.1) { const rr = tkRfull(B); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(TKS.x1 - 40, mid, Math.min(rr, 100), 0, TAU); ctx.stroke(); ctx.setLineDash([]); lbl(TKS.x1 - 40, mid + Math.min(rr, 100) + 16, 'r = ' + (mk ? '?' : g3(tkR_mm(B)) + ' mm'), { bg: '#16a34a', color: '#fff', size: 12, pad: 6, minX: TKS.x0, maxX: TKS.x1 }); }
    // 이온
    k.ions.forEach((i) => {
      if (i.state === 'out') return;
      const col = tempCol(i.e);
      if (i.tr.length > 4) { ctx.strokeStyle = C.rgba(col, 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(i.tr[0], i.tr[1]); for (let q = 2; q < i.tr.length; q += 2) { if (Math.abs(i.tr[q] - i.tr[q - 2]) > 100) { ctx.moveTo(i.tr[q], i.tr[q + 1]); continue; } ctx.lineTo(i.tr[q], i.tr[q + 1]); } ctx.stroke(); }
      D.sphere(i.x, i.y, 4.8, col, { gloss: false });
    });
    k.flashes.forEach((f) => D.glow(f.x, f.y, 16 * (1 + f.t * 3), '#60a5fa', 0.7 * (1 - f.t / 0.5)));
    sceneEnd();
    // 온도 막대
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const T0 = tkTemp(), bx = STP.x + 12, bw = STP.w - 24;
    T(bx, STP.y + 20, '플라스마 온도', 13, '#1e40af', 'left', 800);
    D.roundRect(bx, STP.y + 28, bw, 20, 8); ctx.fillStyle = '#eef1f7'; ctx.fill();
    const fw = clamp(T0 / TKS.Tmax, 0, 1) * bw; if (fw > 1) { D.roundRect(bx, STP.y + 28, Math.max(4, fw), 20, 8); ctx.fillStyle = tempCol(clamp(T0 / TKS.Tmax, 0, 1)); ctx.fill(); }
    const mx = bx + bw * (1e8 / TKS.Tmax); ctx.strokeStyle = '#111827'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, STP.y + 24); ctx.lineTo(mx, STP.y + 52); ctx.stroke(); T(mx, STP.y + 66, '1억 °C', 12, '#111827', 'center', 800);
    T(bx + 4, STP.y + 66, '0', 12, '#516079', 'left', 700); T(bx + bw, STP.y + 66, '1.5억 °C', 12, '#516079', 'right', 700);
    T(bx + bw - 4, STP.y + 20, g3(T0 / 1e8) + '억 °C', 14, T0 >= 1e8 ? '#0b7a41' : '#9a3412', 'right', 800);
    // 설명
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = IN.y + 24, x = IN.x + 14, mw = IN.w - 28;
    T(x, y, '자기장으로 가두기', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    y += textBlock(x, y, mw, '핵융합 연료 플라스마는 1억 °C 이상 → 어떤 그릇도 녹아요. 벽에 닿으면 식어요.', sz - 0.5, '#26324a', lh - 1, 800) + 2;
    y += textBlock(x, y, mw, '중수소 핵(10 keV): v = ' + g3(Math.sqrt(2 * 10e3 * EV / MD) / 1e5) + '×10⁵ m/s', sz - 0.5, '#26324a', lh - 1, 800) + 2;
    y += textBlock(x, y, mw, 'B = ' + g3(B) + ' T → r = mv/(qB) = ' + (B > 0.01 ? (mk ? '?' : g3(tkR_mm(B)) + ' mm') : '—'), sz, '#9a3412', lh, 800) + 2;
    y += textBlock(x, y, mw, 'B가 강할수록 r이 작아 자기력선에 감겨 돌며 벽에 닿지 않아요(가둠 시간 ∝ B²).', sz - 0.5, '#26324a', lh - 1, 800) + 2;
    if (!PHONE) textBlock(x, y + 4, mw, '🏭 KSTAR 같은 토카막이 태양의 방식(핵융합)을 연구해요. (그림은 관 일부를 25 cm 폭으로 확대한 모형이에요.)', sz - 1, '#0b7a41', lh - 2, 800);
  }
  bindSl('sTB', () => S.tk.B, (v) => { S.tk.B = v; }, updateCtlProxy);
  $('#bIp').addEventListener('click', () => { Sound.click(); S.tk.Ip = !S.tk.Ip; updateCtl(); });
  $('#bTkRe').addEventListener('click', () => { Sound.click(); tkReset(1); });

  /* ================= ④ 밴앨런대와 오로라 ================= */
  const VA = { cx: CXs, cy: CYs, RE: 34, kq: 945, v: 150 };
  const ATM = VA.RE * (1 + 100 / 6371);
  const SAT = [
    { id: 'iss', name: '국제우주정거장', alt: 400, risk: false }, { id: 'obs', name: '지구 관측 위성', alt: 800, risk: false },
    { id: 'gps', name: 'GPS 위성', alt: 20200, risk: true }, { id: 'geo', name: '정지 궤도 위성', alt: 35786, risk: true },
  ];
  const altR = (km) => 1 + km / 6371;
  const beltAt = (km) => (km >= 1000 && km <= 6000) ? '내대' : (km >= 13000 && km <= 60000) ? '외대' : '';
  /* 안내 중심 근사(첫째 단열 불변량): v⊥²/B 일정 → 자기 거울점에서 B = B_eq / sin²α. 한 자기력선(L = 4)을 따라 움직여요. */
  const VL = 4;
  const bRel = (lam) => Math.sqrt(1 + 3 * Math.sin(lam) * Math.sin(lam)) / Math.pow(Math.cos(lam), 6);     // B / B_eq (같은 자기력선)
  const rRel = (lam) => VL * Math.cos(lam) * Math.cos(lam);                                                // r / R_E
  const vaPos = (lam) => ({ x: rRel(lam) * Math.cos(lam) * VA.RE, y: rRel(lam) * Math.sin(lam) * VA.RE });
  function vaLaunch() {
    const a = S.va, alpha = a.pitch * DEG;
    a.p = { lam: 0, dir: 1, phi: rand(0, TAU), sgn: a.sp === 'p' ? 1 : -1, t: 0, s2: Math.sin(alpha) * Math.sin(alpha), px: 0, py: 0, rg: 0 };
    a.trail = []; a.state = 'fly'; a.bounce = 0; a.lastSign = 1; a.lastBT = -9; a.trapped = false; a.fl = 0; Sound.click(); updateCtl();
  }
  function stepVan(dt) {
    const a = S.va; a.t += dt; a.aur = Math.max(a.storm ? 0.35 : 0, a.aur - dt * 0.18);
    const nAmb = a.storm ? 54 : 26;
    while (a.ambient.length < nAmb) a.ambient.push({ L: Math.random() < 0.5 ? rand(1.3, 1.9) : rand(3.1, 6), ph: rand(0, TAU), w: rand(0.6, 1.4), lm: rand(0.25, 0.9), side: Math.random() < 0.5 ? 1 : -1 });
    while (a.ambient.length > nAmb) a.ambient.pop();
    a.landFlash.forEach((f) => { f.t += dt; }); a.landFlash = a.landFlash.filter((f) => f.t < 2.5);
    const p = a.p; if (!p) return;
    if (a.state === 'hit') { a.fl -= dt; return; }
    const n = Math.max(1, Math.ceil(dt / 0.002)), h = dt / n, Bm = 1 / p.s2;
    for (let i = 0; i < n && a.state === 'fly'; i++) {
      const b = bRel(p.lam), vpar = VA.v * p.dir * Math.sqrt(Math.max(0, 1 - b / Bm));
      const dsdl = VL * VA.RE * Math.cos(p.lam) * Math.sqrt(1 + 3 * Math.sin(p.lam) * Math.sin(p.lam));
      p.lam += vpar / dsdl * h;
      const b2 = bRel(p.lam);
      if (b2 >= Bm) { p.lam -= vpar / dsdl * h; p.dir = -p.dir; if (S.t - a.lastBT > 0.25) { a.bounce++; a.lastBT = S.t; if (a.bounce >= 4) { a.trapped = true; a.everTrapped = true; } } }
      const w = VA.kq * Math.pow(VA.RE / (rRel(p.lam) * VA.RE), 3) * Math.sqrt(1 + 3 * Math.sin(p.lam) * Math.sin(p.lam));
      p.phi += p.sgn * w * h;
      if (rRel(p.lam) <= 1.0157) { a.state = 'hit'; a.fl = 1.5; a.aur = 1; a.aurHits++; a.landFlash.push({ t: 0, north: p.lam > 0 }); const q = vaPos(p.lam); parts.burst(SC.x + VA.cx + q.x, SC.y + VA.cy - q.y, { count: 20, speed: 120, life: 0.7, size: 3 }); Sound.success(); }
    }
    p.t += dt;
    // 화면 위치: 안내 중심 + 자기력선에 수직인 방향으로 감겨 도는 크기 r_g
    const q0 = vaPos(p.lam), q1 = vaPos(p.lam + 0.002), tx = q1.x - q0.x, ty = -(q1.y - q0.y), tm = Math.hypot(tx, ty) || 1;
    const bb = bRel(p.lam), rg = VA.v * Math.sqrt(Math.min(1, bb / Bm)) / (VA.kq * Math.pow(VA.RE / (rRel(p.lam) * VA.RE), 3) * Math.sqrt(1 + 3 * Math.sin(p.lam) * Math.sin(p.lam)));
    p.rg = rg; const nx = -ty / tm, ny = tx / tm, wob = rg * Math.cos(p.phi);
    p.px = q0.x + nx * wob; p.py = q0.y - ny * wob;                  // 화면 (오른쪽 +, 위쪽 +)
    a.trail.push(p.px, -p.py); if (a.trail.length > 900) a.trail.splice(0, 2);
    if (p.t > 120) { a.p = null; a.state = 'idle'; }
  }
  function fieldLine(L, side, n) {
    const pts = [], lam0 = Math.acos(Math.sqrt(1 / L));
    for (let i = 0; i <= n; i++) { const lam = -lam0 + 2 * lam0 * i / n, r = L * Math.cos(lam) * Math.cos(lam); pts.push([VA.cx + side * r * Math.cos(lam) * VA.RE, VA.cy - r * Math.sin(lam) * VA.RE]); }
    return pts;
  }
  function drawVan() {
    const a = S.va, RE = VA.RE, cx = VA.cx, cy = VA.cy;
    sceneBegin();
    // 우주 배경
    const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, 300); g.addColorStop(0, '#16213f'); g.addColorStop(1, '#0a1020'); ctx.fillStyle = g; ctx.fillRect(0, 0, SC.w, SC.h);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 40; i++) { const x = (i * 97.3) % SC.w, y = (i * 61.7) % SC.h; ctx.fillRect(x, y, 1.2, 1.2); }
    // 벨트: 같은 L의 자기력선 사이
    const bandFill = (L1, L2, col) => { [1, -1].forEach((s) => { const A = fieldLine(L1, s, 60), Bp = fieldLine(L2, s, 60); ctx.fillStyle = col; ctx.beginPath(); A.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); for (let i = Bp.length - 1; i >= 0; i--) ctx.lineTo(Bp[i][0], Bp[i][1]); ctx.closePath(); ctx.fill(); }); };
    bandFill(1.16, 1.94, 'rgba(250,204,21,' + (0.18 + (a.storm ? 0.1 : 0)) + ')'); bandFill(3.04, 7.5, 'rgba(244,114,182,' + (0.14 + (a.storm ? 0.1 : 0)) + ')');
    // 자기력선
    [1.4, 2, 3, 4, 5.2, 6.6].forEach((L) => [1, -1].forEach((s) => { const pts = fieldLine(L, s, 80); ctx.strokeStyle = 'rgba(167,139,250,.55)'; ctx.lineWidth = 1.3; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      if (L === 4 || L === 2) { const q = pts[Math.floor(pts.length * (L === 4 ? 0.28 : 0.3))], q2 = pts[Math.floor(pts.length * (L === 4 ? 0.28 : 0.3)) + 1], dir = (q2[1] - q[1]) < 0 ? 1 : -1; /* 적도에서 위(북)쪽으로 향함 */ const ang = Math.atan2(q2[1] - q[1], q2[0] - q[0]); const sg = s * -1; ctx.fillStyle = 'rgba(196,181,253,.95)'; ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(ang + (q2[1] < q[1] ? 0 : 0)); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.restore(); } }));
    // 지구
    const eg = ctx.createRadialGradient(cx - 10, cy - 12, 4, cx, cy, RE); eg.addColorStop(0, '#6fb6ff'); eg.addColorStop(0.6, '#2563eb'); eg.addColorStop(1, '#0b2a6b');
    D.glow(cx, cy, RE * 1.5, '#60a5fa', 0.25); ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(cx, cy, RE, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(74,222,128,.7)'; ctx.beginPath(); ctx.ellipse(cx - 9, cy - 8, 9, 6, -0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + 11, cy + 9, 7, 8, 0.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(147,197,253,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, ATM + 0.4, 0, TAU); ctx.stroke();   // 대기 (약 100 km)
    // 막대자석
    ctx.save(); ctx.globalAlpha = 0.9; D.roundRect(cx - 5, cy - 18, 10, 18, 3); ctx.fillStyle = '#3b6fe0'; ctx.fill(); D.roundRect(cx - 5, cy, 10, 18, 3); ctx.fillStyle = '#e2464b'; ctx.fill(); ctx.restore();
    T(cx, cy - 6, 'S', 10, '#fff', 'center', 800); T(cx, cy + 14, 'N', 10, '#fff', 'center', 800);
    // 극지 오로라: 위도 56°~74° 고리에서 위로 솟는 초록 커튼
    const aurDraw = (north) => {
      const inten = clamp(a.aur + (a.landFlash.some((f) => f.north === north) ? 0.45 : 0), 0, 1); if (inten < 0.03) return;
      const nsg = north ? -1 : 1;
      for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 16; i++) {
        const th = (56 + i * 1.2) * DEG, sx = cx + side * RE * Math.cos(th), sy = cy + nsg * RE * Math.sin(th);
        const ph = (RM ? 0 : a.t * 1.6) + i * 0.7 + (side > 0 ? 1.3 : 0), h = (10 + 14 * Math.abs(Math.sin(ph))) * (0.4 + inten);
        const ux = side * Math.cos(th), uy = nsg * Math.sin(th);
        const gg = ctx.createLinearGradient(sx, sy, sx + ux * h, sy + uy * h); gg.addColorStop(0, 'rgba(74,222,128,' + 0.9 * inten + ')'); gg.addColorStop(1, 'rgba(74,222,128,0)');
        ctx.strokeStyle = gg; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + ux * h, sy + uy * h); ctx.stroke();
      }
      D.glow(cx, cy + nsg * RE * 0.9, 38 * (0.4 + inten), '#4ade80', 0.35 * inten);
    };
    aurDraw(true); aurDraw(false);
    // 위성 궤도
    SAT.forEach((s) => { const R = altR(s.alt) * RE; ctx.strokeStyle = 'rgba(226,232,240,.5)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      const ang = (s.id === 'geo' ? -0.35 : s.id === 'gps' ? -0.8 : s.id === 'obs' ? 0.9 : 2.4) + (RM ? 0 : a.t * (s.id === 'geo' ? 0.05 : s.id === 'gps' ? 0.09 : 0.5)), sx = cx + R * Math.cos(ang), sy = cy + R * Math.sin(ang);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(sx - 3, sy - 3, 6, 6); ctx.fillRect(sx - 8, sy - 1, 4, 2); ctx.fillRect(sx + 4, sy - 1, 4, 2); });
    lbl(SC.w - 70, SC.h - 22, '정지 궤도 36,000 km', { bg: 'rgba(15,23,42,.8)', color: '#fef08a', size: 11.5, pad: 6, minX: 0, maxX: SC.w });
    lbl(cx - 118, cy - 108, 'GPS 20,200 km', { bg: 'rgba(15,23,42,.8)', color: '#fef08a', size: 11.5, pad: 6, minX: 0, maxX: SC.w });
    lbl(cx + 2, cy + RE + 22, '저궤도 400 km · 내대 1,000~6,000 km', { bg: 'rgba(15,23,42,.8)', color: '#e5e7eb', size: 11, pad: 6, minX: 0, maxX: SC.w });
    lbl(cx - 168, cy - 150, '외대 13,000~60,000 km →', { bg: 'rgba(15,23,42,.8)', color: '#fbcfe8', size: 11.5, pad: 6, minX: 0, maxX: SC.w });
    // 장식 입자
    a.ambient.forEach((m) => { const lam = m.lm * Math.sin(a.t * m.w + m.ph) * (RM ? 0 : 1) + (RM ? m.lm * 0.4 : 0), r = m.L * Math.cos(lam) * Math.cos(lam), x = cx + m.side * r * Math.cos(lam) * RE, y = cy - r * Math.sin(lam) * RE; if (r * RE < ATM) return; ctx.fillStyle = 'rgba(253,224,71,.7)'; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill(); });
    // 입자와 자취
    if (a.trail.length > 4) { ctx.strokeStyle = a.p && a.p.sgn < 0 ? 'rgba(96,165,250,.95)' : 'rgba(248,113,113,.95)'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(cx + a.trail[0], cy + a.trail[1]); for (let i = 2; i < a.trail.length; i += 2) ctx.lineTo(cx + a.trail[i], cy + a.trail[i + 1]); ctx.stroke(); }
    if (a.p && a.state !== 'hit') { const px = cx + a.p.px, py = cy - a.p.py; D.glow(px, py, 12, a.p.sgn > 0 ? '#f87171' : '#60a5fa', 0.7); D.sphere(px, py, 4, a.p.sgn > 0 ? POS : NEG, { gloss: false }); }
    if (a.state === 'hit') lbl(CXs, 24, '대기에 부딪혀 극지방에서 오로라가 빛나요!', { bg: '#16a34a', color: '#fff', size: 13, pad: 9, minX: 0, maxX: SC.w });
    else if (a.trapped) lbl(CXs, 24, '붙잡혔어요: 자기력선에 감겨 남북을 왕복해요 (왕복 ' + Math.floor(a.bounce / 2) + '번)', { bg: '#7c3aed', color: '#fff', size: 12.5, pad: 9, minX: 0, maxX: SC.w });
    else if (!a.p) lbl(CXs, 24, '▶ 입자 넣기를 눌러 보세요 (적도, 지구 반지름의 4배 거리)', { size: 12.5, minX: 0, maxX: SC.w, color: '#9a3412' });
    sceneEnd();
    // 띠: 위성 표
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    T(STP.x + 12, STP.y + 19, '위성 궤도와 밴앨런대 (내대 1,000~6,000 km · 외대 13,000~60,000 km)', 12.5, '#1e40af', 'left', 800);
    SAT.forEach((s, i) => { const col = i % 2, row = i >> 1, x = STP.x + 12 + col * ((STP.w - 24) / 2), y = STP.y + 32 + row * 24; T(x, y + 14, s.name + ' ' + s.alt.toLocaleString('ko-KR') + ' km', 12, '#26324a', 'left', 800); });
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = IN.y + 24, x = IN.x + 14, mw = IN.w - 28;
    T(x, y, '지구 자기장에 갇힌 입자', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    y += textBlock(x, y, mw, '지구는 큰 막대자석. 하전 입자는 자기력선에 감겨 돌며 극 쪽으로 가다가, 자기장이 센 극 근처에서 되돌아와(자기 거울) 남북을 왕복해요.', sz - 0.5, '#26324a', lh - 1, 800) + 2;
    y += textBlock(x, y, mw, '피치각이 너무 작으면 거울점이 대기 안이라 대기와 충돌 → 오로라(산소 557.7 nm 초록).', sz - 0.5, '#9a3412', lh - 1, 800) + 2;
    if (!PHONE) {
      y += textBlock(x, y, mw, '내대: 고에너지 양성자, 외대: 전자. 태양풍을 막아 지표 생물을 보호하지만 위성·우주인에게는 방사선 위험이 있어요.', sz - 0.5, '#26324a', lh - 1, 800) + 2;
      textBlock(x, y + 4, mw, '☀️ 태양 폭풍이 오면 벨트의 입자가 늘고 오로라가 강해져요.', sz - 1, '#0b7a41', lh - 2, 800);
    }
  }
  $$('#paSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.va.pitch = +b.dataset.v; S.va.p = null; S.va.trail = []; S.va.state = 'idle'; updateCtl(); }));
  $$('#vsSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.va.sp = b.dataset.v; S.va.p = null; S.va.trail = []; S.va.state = 'idle'; updateCtl(); }));
  $('#bVaGo').addEventListener('click', vaLaunch);
  $('#bStorm').addEventListener('click', () => { Sound.click(); S.va.storm = !S.va.storm; updateCtl(); });

  /* ---------- 입력 도구 ---------- */
  const numF = makeNum($('#numFHost'), '<b>B = 1.0 T</b>에서 양성자의 <b>공명 진동수 f = qB/(2πm)</b>은? (m = 1.67×10⁻²⁷ kg)', 'f =', 'Hz', 7);
  const numM = makeNum($('#numMHost'), '시료 X 이온(전하 +e)의 <b>질량 m = qB₂d/(2v)</b>는? (d는 화면에서 읽어요)', 'm =', 'kg', -26);
  const numR = makeNum($('#numRHost'), '<b>B = 3.0 T</b>에서 10 keV 중수소 핵(<b>v = 9.8×10⁵ m/s</b>, m = 3.34×10⁻²⁷ kg)의 회전 반지름 r은?', 'r =', 'm', -3);
  const sat4R = SAT.map((s) => ['<b>' + s.name + '</b> (' + s.alt.toLocaleString('ko-KR') + ' km)는?', ['밴앨런대 밖 (방사선 위험 낮음)', '밴앨런대 안 (방사선 위험 큼)'], s.risk ? 1 : 0]).concat([['오로라가 <b>극지방에서만</b> 보이는 까닭은?', ['입자가 자기력선을 따라 극지방의 대기로 들어오기 때문', '극지방의 태양이 더 밝기 때문', '극지방에는 산소가 더 많기 때문'], 0]]);
  const s4St = {}, s4Ok = {}, s4Sels = makeSelects($('#sat4Host'), sat4R, s4St, s4Ok);
  const clr4 = () => resetSels(s4Sels, s4St, s4Ok);

  /* ================= 공통 UI ================= */
  function setScene(mode) { if (S.mode !== mode) S.fade = 1; S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl(); }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const c = S.cy, m = S.ms, k = S.tk, a = S.va;
    setRange('sCB', c.B, 0.6, 1.2, (v) => v.toFixed(1) + ' T'); setRange('sCf', c.f, 10, 20, (v) => v.toFixed(1) + ' MHz');
    $('#sCBM').disabled = c.B <= 0.6; $('#sCBP').disabled = c.B >= 1.2; $('#sCfM').disabled = c.f <= 10; $('#sCfP').disabled = c.f >= 20;
    $('#bCyGo').disabled = c.stage === 'run';
    setRange('sME', m.E, 3, 7, (v) => v.toFixed(1) + '×10⁴ V/m'); setRange('sMB', m.B1, 0.3, 0.7, (v) => v.toFixed(2) + ' T');
    $('#sMEM').disabled = m.E <= 3; $('#sMEP').disabled = m.E >= 7; $('#sMBM').disabled = m.B1 <= 0.3; $('#sMBP').disabled = m.B1 >= 0.7;
    $$('#setSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === m.set));
    setRange('sTB', k.B, 0, 4, (v) => v.toFixed(1) + ' T'); $('#sTBM').disabled = k.B <= 0; $('#sTBP').disabled = k.B >= 4;
    $('#bIp').textContent = k.Ip ? '⚡ 플라스마 전류 끄기' : '⚡ 플라스마 전류 켜기'; $('#bIp').classList.toggle('btn-primary', !k.Ip);
    $$('#paSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === a.pitch)); $$('#vsSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === a.sp));
    $('#bStorm').textContent = a.storm ? '☀️ 태양 폭풍 끄기' : '☀️ 태양 폭풍 켜기'; $('#bStorm').classList.toggle('btn-primary', !a.storm);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  function readouts() {
    let a, b, c; const m = S.mode;
    if (m === 'cyc') { const q = S.cy, K = q.K / MEV; a = ['B · f', q.B.toFixed(1) + ' T · ' + q.f.toFixed(1) + ' MHz']; b = ['틈새 통과 횟수', q.n + '번']; c = ['운동 에너지 K', g3(K) + ' MeV']; }
    else if (m === 'mass') { const q = S.ms, vs = msV(); a = ['선택 속력 E/B₁', S.gate === 'mm2' ? '1.0×10⁵ m/s' : g3(vs / 1e5) + '×10⁵ m/s']; b = ['도착한 이온 수', Object.keys(q.hits).reduce((s, k) => s + q.hits[k], 0) + '개']; const k0 = SETS[q.set][0], d = msMean(k0); c = [SPC[k0].name.replace(' 이온', '') + ' 도착 d', d == null ? '—' : d.toFixed(1) + ' cm']; }
    else if (m === 'tok') { const q = S.tk; a = ['자기장 B', q.B.toFixed(1) + ' T']; b = ['플라스마 온도', g3(tkTemp() / 1e8) + '억 °C']; c = ['벽에 닿아 식은 횟수', q.lost + '번']; }
    else { const q = S.va; a = ['입자', (q.sp === 'p' ? '양성자' : '전자') + ' · 피치각 ' + q.pitch + '°']; b = ['남북 왕복', Math.floor(q.bounce / 2) + '번']; c = ['대기 충돌(오로라)', q.aurHits + '번']; }
    [[l1, v1, a], [l2, v2, b], [l3, v3, c]].forEach((z) => { if (z[0].textContent !== z[2][0]) z[0].textContent = z[2][0]; if (z[1].textContent !== z[2][1]) z[1].textContent = z[2][1]; });
  }

  /* ================= 미션 ================= */
  const MS = {};
  const cycOK = () => S.cy.stage === 'done' && S.cy.Kext >= 11.5 * MEV;
  const selOK = () => Math.abs(msV() - 1.0e5) <= 0.03e5;
  const msOK = () => S.ms.set === 'mix' && selOK() && (S.ms.hits.c12 || 0) >= 4 && (S.ms.hits.c14 || 0) >= 4;
  const tkOK = () => tkTemp() >= 1.0e8;
  const vaOK = () => S.va.everTrapped && S.va.aurHits >= 1;
  const levels = [
    {
      title: '사이클로트론: 틈새에서 가속, D 안에서 반원', short: '가속기', icon: '⚛️', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 빛에 가까운 속도의 입자를 어떻게 좁은 장치 안에 가두고 가속할 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(로런츠 힘)</b>에서 r = mv/(qB), 주기 T = 2πm/(qB)(속력과 무관)를 배웠어요. 이 두 성질로 입자를 <b>작은 장치 안에서 여러 번 가속</b>하는 사이클로트론을 만들 수 있어요. (도선이 받는 힘 F = BIL도 이런 전하들이 받는 로런츠 힘의 합이었어요.)</div>' +
        '<p>두 개의 D자 전극 안에서는 자기장이 입자를 반원으로 돌리고, <b>틈새를 지날 때마다 전기장이 가속</b>해요. 속력이 커지면 반지름도 커지지만 반 바퀴 시간은 같아서, 전원의 진동수를 <b>f = qB/(2πm)</b>에 맞추면(공명) 계속 가속돼요. 🏭 의료용 양성자 치료와 동위원소 생산에 쓰여요.</p>',
      features: ['cyc'],
      setup() { S.gate = ''; S.cy.B = 0.8; S.cy.f = 12.0; cyReset(); numF.clear(); setScene('cyc'); },
      recap: '사이클로트론은 자기장으로 반원을 돌리고 틈새의 전기장으로 가속해요. 전원의 진동수를 f = qB/(2πm)에 맞추면(공명) 반지름이 커져도 같은 리듬으로 계속 가속돼요.',
      summary: '<ul><li><b>사이클로트론</b>: 두 D 전극(자기장 영역)과 틈새의 교류 전기장. 입자는 D 안에서 <b>반원</b>을 돌고 틈새를 지날 때마다 가속돼요 → 반지름이 커지는 나선 궤적.</li><li>반 바퀴 시간 πm/(qB)는 속력과 무관 → 전원 진동수를 <b>f = qB/(2πm)</b>에 맞추면(공명) 계속 가속. 예) 양성자, B = 1.0 T → <b>f ≈ 1.5×10⁷ Hz (15 MHz)</b>.</li><li>최종 에너지 <b>K = (qBR)²/(2m)</b>. R = 0.50 m, B = 1.0 T → 1.9×10⁻¹² J ≈ <b>12 MeV</b>. 틈새 한 번에 20 kV → 20 keV, 한 바퀴 40 keV → 약 300바퀴.</li><li><b>자기장은 입자를 가속하지 않아요</b>(방향만 바꿈). 가속하는 것은 틈새의 전기장이에요. 🏭 양성자 치료, 동위원소 생산.</li></ul>',
      missions: [
        {
          title: '공명을 맞춰 12 MeV 만들기',
          goal: '자기장 B와 진동수 f를 <b>공명</b>에 맞춰 양성자를 <b>약 12 MeV</b>까지 가속해 인출하세요. (K ≥ 11.5 MeV)',
          hint: '공명 진동수는 화면 왼쪽 아래에 표시돼요(f = 15.25 × B[T] MHz). B = 1.0 T, f = 15.2 MHz(또는 15.3)로 맞추고 ▶ 가속 시작을 눌러요. B가 크면 최종 에너지가 B²에 비례해요.',
          setup() { S.gate = ''; S.cy.B = 0.8; S.cy.f = 12.0; cyReset(); setScene('cyc'); },
          check: cycOK, hold: 0.3,
          status: () => mark(S.cy.stage === 'done') + ' 인출 &nbsp; ' + mark(cycOK()) + ' K = ' + g3((S.cy.stage === 'done' ? S.cy.Kext : S.cy.K) / MEV) + ' MeV (목표 12 MeV)',
          explain: '공명 f = qB/(2πm) = 1.6×10⁻¹⁹ × 1.0 / (2π × 1.67×10⁻²⁷) ≈ <b>15 MHz</b>일 때 틈새를 지날 때마다 계속 가속돼서 K = (qBR)²/(2m) ≈ <b>12 MeV</b>(R = 0.50 m)가 돼요. f가 어긋나면 입자가 틈새에 도착하는 순간 전기장이 감속 쪽이 되어 에너지가 오르내리다 멈춰요.',
        },
        {
          title: '공명 진동수 계산하기', manual: true,
          goal: '<b>B = 1.0 T</b>에서 양성자의 <b>공명 진동수 f = qB/(2πm)</b>을 계산해 입력한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'f = qB/(2πm) = 1.6×10⁻¹⁹ × 1.0 / (2π × 1.67×10⁻²⁷). 약 1.5×10⁷ Hz예요. 반 바퀴 시간이 속력과 무관해서 속력은 필요 없어요.',
          setup() { S.gate = 'mc1'; S.cy.B = 1.0; S.cy.f = 15.2; cyReset(); numF.clear(); setScene('cyc'); },
          check: () => checkNum(numF, 1.525e7, 0.03, '다시 계산해 보세요. f = qB/(2πm) = 1.6×10⁻¹⁹ × 1.0 / (2π × 1.67×10⁻²⁷) 이에요. 속력은 필요 없어요.'),
          status: () => '공명 진동수는 가려 두었어요 (B = 1.0 T)',
          explain: 'f = qB/(2πm) = 1.6×10⁻¹⁹ × 1.0 / (2π × 1.67×10⁻²⁷) ≈ <b>1.5×10⁷ Hz (15 MHz)</b>예요. 속력이 커지면 반지름이 커지지만 반 바퀴 도는 시간 πm/(qB)는 같아서, 교류 전원의 진동수를 바꿀 필요가 없어요.',
        },
        {
          type: 'quiz', title: '입자를 가속하는 것은?',
          goal: '사이클로트론에서 입자의 <b>속력을 늘려 주는</b> 것은 무엇일까요?',
          setup() { S.gate = ''; S.cy.B = 1.0; S.cy.f = 15.2; cyReset(); setScene('cyc'); },
          choices: ['틈새의 전기장이 가속하고, 자기장은 입자의 방향만 바꿔요', '자기장이 입자를 가속해서 반지름이 커져요', '전기장과 자기장이 똑같이 가속해요', 'D 전극 안에서 입자가 저절로 빨라져요'],
          answer: 0,
          feedback: ['', '로런츠 힘은 속도에 수직이라 일을 하지 않아요. 반지름이 커지는 것은 틈새의 전기장이 가속해서 속력이 커지기 때문이에요.', '자기력은 일을 하지 않아서 가속에 기여하지 못해요. 가속은 전기장만 해요.', 'D 안에는 전기장이 없어서(금속 안) 힘은 자기력뿐이고, 속력은 그대로예요.'],
          explain: '자기력은 항상 속도에 수직이라 일을 하지 않아 속력을 바꾸지 못하고 <b>방향만</b> 바꿔요(반원 운동). 속력은 <b>틈새의 전기장</b>이 올려요. 그래서 K = (qBR)²/(2m)처럼 최종 에너지가 B와 R로 정해지는 것은 <b>반지름이 한계(R)에 이를 때까지만</b> 가속할 수 있기 때문이에요.',
        },
      ],
    },
    {
      title: '질량 분석: 속도 선택기와 반원', short: '질량 분석', icon: '🧪', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 로런츠 힘으로 입자의 반지름 r = mv/(qB)이 정해진다는 것을 이용했어요. 이번에는 <b>같은 속력</b>으로 들어온 이온이 질량에 따라 <b>다른 반지름</b>으로 도는 것을 이용해 이온을 분류해요.</div>' +
        '<p>이온을 먼저 <b>속도 선택기</b>(전기장 E와 자기장 B₁이 수직)에 통과시켜요. 전기력 qE와 자기력 qvB₁이 같은 <b>v = E/B₁</b>인 이온만 직진해 슬릿을 지나요. 이어서 자기장 B₂에서 반원을 그려 검출기에 도착하는데 r = mv/(qB₂) ∝ m이라서 탄소-12와 탄소-14가 다른 곳에 닿아요.</p>',
      features: ['mass'],
      setup() { S.gate = ''; S.ms.E = 4.0; S.ms.B1 = 0.5; S.ms.set = 'mix'; msReset(); setScene('mass'); },
      recap: '속도 선택기는 qE = qvB₁인 v = E/B₁인 이온만 통과시켜요. 같은 속력이면 반원의 반지름 r = mv/(qB₂)가 질량에 비례해서 질량이 다른 이온이 서로 다른 곳에 도착해요.',
      summary: '<ul><li><b>속도 선택기</b>: E ⟂ B₁에서 전기력 qE = 자기력 qvB₁ → <b>v = E/B₁</b>만 직진(질량·전하와 무관). 예) E = 5.0×10⁴ V/m, B₁ = 0.50 T → v = 1.0×10⁵ m/s.</li><li><b>질량 분석</b>: 이어서 B₂ = 0.50 T에서 반원, <b>r = mv/(qB₂)</b> ∝ m. 탄소-12 이온 r = 2.5 cm, 탄소-14 이온 r = 2.9 cm → 도착 지점(지름)이 0.8 cm 떨어져요.</li><li>전하가 2배인 이온은 r이 1/2배예요(r ∝ 1/q). 도착 위치로 질량 m = qB₂d/(2v)를 구해요 (d = 2r).</li><li>🏭 동위원소 비 측정, 탄소 연대 측정, 약물 분석, 반도체 이온 주입. F = BIL은 이런 전하들이 받는 힘의 합이에요.</li></ul>',
      missions: [
        {
          title: '두 동위원소 분리하기',
          goal: '선택 속력을 <b>v = 1.0×10⁵ m/s</b>(E/B₁)로 맞추고, <b>탄소-12와 탄소-14</b>가 검출기에서 서로 다른 곳에 4개 이상씩 도착하게 하세요.',
          hint: 'v = E/B₁이에요. 처음에는 E = 4.0×10⁴, B₁ = 0.50이라 v = 0.8×10⁵예요. E를 5.0×10⁴ V/m로 올리면 1.0×10⁵ m/s가 돼요. 이온이 모이는 데 몇 초 걸려요.',
          setup() { S.gate = ''; S.ms.E = 4.0; S.ms.B1 = 0.5; S.ms.set = 'mix'; msReset(); setScene('mass'); },
          check: msOK, hold: 0.5,
          status: () => mark(selOK()) + ' v = ' + g3(msV() / 1e5) + '×10⁵ m/s &nbsp; ' + mark((S.ms.hits.c12 || 0) >= 4) + ' C-12 ' + (S.ms.hits.c12 || 0) + '개 &nbsp; ' + mark((S.ms.hits.c14 || 0) >= 4) + ' C-14 ' + (S.ms.hits.c14 || 0) + '개',
          explain: 'v = E/B₁ = 5.0×10⁴ / 0.50 = <b>1.0×10⁵ m/s</b>인 이온만 슬릿을 지나요. 이어서 r = mv/(qB₂)에서 탄소-12는 r ≈ 2.5 cm(d ≈ 5.0 cm), 탄소-14는 r ≈ 2.9 cm(d ≈ 5.8 cm)로 <b>질량이 큰 쪽이 더 멀리</b> 닿아요(r ∝ m).',
        },
        {
          title: '시료 X의 질량 구하기', manual: true,
          goal: '선택 속력 <b>v = 1.0×10⁵ m/s</b>, <b>B₂ = 0.50 T</b>에서 시료 X 이온(+e)이 도착한 위치 d를 읽고 <b>질량 m = qB₂d/(2v)</b>를 구해 입력하세요.',
          hint: '화면의 평균 도착 위치 d(cm)를 읽어요. d를 m로 바꿔(1 cm = 0.01 m) m = 1.6×10⁻¹⁹ × 0.50 × d / (2 × 1.0×10⁵) 에 넣어요. 값이 모이도록 잠시 기다려요.',
          setup() { S.gate = 'mm2'; S.ms.E = 5.0; S.ms.B1 = 0.5; S.ms.set = 'x'; msReset(); numM.clear(); setScene('mass'); },
          check: () => { if ((S.ms.hits.x || 0) < 3) return '이온이 아직 충분히 도착하지 않았어요. 잠시 기다린 뒤 평균 d를 읽어요.'; return checkNum(numM, 2.16e-26, 0.05, '다시 계산해 보세요. m = qB₂d/(2v) = 1.6×10⁻¹⁹ × 0.50 × (d를 m로) / (2 × 1.0×10⁵) 이에요.'); },
          status: () => '시료 X 도착 ' + (S.ms.hits.x || 0) + '개 · d = ' + (msMean('x') == null ? '—' : msMean('x').toFixed(1) + ' cm'),
          explain: 'd = 2r이므로 r = mv/(qB₂)에서 m = qB₂r/v = qB₂d/(2v) = 1.6×10⁻¹⁹ × 0.50 × 0.054 / (2 × 1.0×10⁵) ≈ <b>2.2×10⁻²⁶ kg</b>이에요. 탄소-12(2.0×10⁻²⁶ kg)와 탄소-14(2.3×10⁻²⁶ kg) 사이이므로 탄소-13이에요.',
        },
        {
          type: 'quiz', title: '속도 선택기의 조건',
          goal: '속도 선택기에서 이온이 <b>직진해 슬릿을 지나려면</b> 어떤 조건이어야 하고, 전하가 <b>2배</b>인 이온이 B₂에서 도는 반지름은 어떻게 될까요?',
          setup() { S.gate = ''; S.ms.E = 5.0; S.ms.B1 = 0.5; S.ms.set = 'dbl'; msReset(); setScene('mass'); },
          choices: ['qE = qvB₁ 이어서 v = E/B₁ 이고, 전하가 2배면 r는 1/2배가 돼요', 'qE = qvB₁ 이어서 v = E/B₁ 이고, 전하가 2배면 r도 2배가 돼요', '질량이 같을 때만 직진하고, 전하가 2배면 r는 변하지 않아요', 'E = B₁ 일 때만 직진하고, 전하가 2배면 r는 1/4배가 돼요'],
          answer: 0,
          feedback: ['', '선택기의 조건은 맞아요. 그러나 r = mv/(qB₂)에서 q가 분모에 있어서 전하가 2배면 r는 1/2배(탄소-12 2+: d ≈ 2.5 cm)예요.', 'v = E/B₁ 은 질량과 무관해요. 그리고 r ∝ 1/q 이므로 전하가 2배면 r는 달라져요.', '단위가 달라서 E = B₁은 의미가 없어요. 직진 조건은 qE = qvB₁ 에서 v = E/B₁ 이에요. 그리고 r ∝ 1/q 이므로 1/2배예요.'],
          explain: '직진하려면 전기력 qE와 자기력 qvB₁이 같아야 해서 <b>v = E/B₁</b>(q, m과 무관)이에요. 반원에서는 r = mv/(qB₂)이므로 전하가 2배이면 반지름은 <b>1/2배</b>가 돼요(탄소-12 이온 +2e는 r ≈ 1.2 cm).',
        },
      ],
    },
    {
      title: '토카막: 자기장으로 가두는 플라스마', short: '토카막', icon: '🍩', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 하전 입자는 자기장 속에서 r = mv/(qB)의 원운동(B와 비스듬하면 나선 운동)을 한다는 것을 이용했어요. 이 성질로 <b>1억 °C의 플라스마를 벽에 닿지 않게</b> 가둘 수 있을까요?</div>' +
        '<p>핵융합 연료는 1억 °C 이상의 플라스마라서 어떤 용기도 닿으면 녹고 플라스마도 식어요. <b>토카막</b>은 도넛 모양 용기에 도넛 방향의 자기장을 걸어 입자가 자기력선에 <b>감겨 돌게</b> 해서 벽에 닿지 않게 해요. 확대 창(25 cm 폭)에서 B를 바꾸며 온도가 유지되는지 살펴봐요. 🏭 한국의 KSTAR도 이런 장치예요.</p>',
      features: ['tok'],
      setup() { S.gate = ''; S.tk.B = 0.5; S.tk.Bd = 0.5; S.tk.Ip = false; tkReset(0.1); numR.clear(); setScene('tok'); },
      recap: '자기장이 없으면 플라스마가 벽에 닿아 식고, 도넛 방향 자기장이 있으면 입자가 자기력선에 감겨 돌며 벽에 닿지 않아요. B가 강할수록 회전 반지름이 작아 더 잘 가둬요.',
      summary: '<ul><li>핵융합 플라스마(약 1억 °C 이상)는 용기 벽에 닿으면 식어요. 닿지 않게 <b>자기장으로 가둬요</b>.</li><li>하전 입자는 자기력선에 감겨 돌아요. 중수소 핵(평균 운동 에너지 10 keV = 1.6×10⁻¹⁵ J), B = 3 T → v = √(2K/m) ≈ 9.8×10⁵ m/s, <b>r = mv/(qB) ≈ 6.8 mm</b>. 장치 크기(수 m)에 비해 아주 작아서 벗어나지 못해요.</li><li>도넛(토로이드) 방향 자기장 + 플라스마 전류가 만드는 자기장 → <b>나선 모양 자기력선</b>이 돼요. B가 강할수록 r이 작아 가둠이 좋아져요.</li><li>🏭 KSTAR 같은 토카막이 태양의 방식(핵융합) 발전을 연구해요.</li></ul>',
      missions: [
        {
          title: '1억 °C 유지하기',
          goal: '자기장 B를 조절해 식어 있는 플라스마의 온도를 <b>1억 °C 이상</b>으로 올리고 <b>5초 이상</b> 유지하세요.',
          hint: 'B가 작으면 입자가 벽에 닿아 식어요(파란 점). B를 1.5 T 이상으로 올리면 입자가 벽에 닿지 않아 온도가 천천히(10초쯤) 올라가요.',
          setup() { S.gate = ''; S.tk.B = 0; S.tk.Bd = 0; tkReset(0.1); setScene('tok'); },
          check: tkOK, hold: 5,
          status: () => mark(tkOK()) + ' 온도 ' + g3(tkTemp() / 1e8) + '억 °C (목표 1억 °C 이상, B = ' + S.tk.B.toFixed(1) + ' T)',
          explain: 'B가 약하면 회전 반지름이 커서 입자가 벽에 닿아 식어요. B ≥ 1.5 T에서는 입자가 자기력선에 감겨 돌며(r는 수십 mm 이하) 벽에 거의 닿지 않아 1억 °C가 유지돼요. 실제로 가둠 시간은 B²에 비례해 좋아져요.',
        },
        {
          title: '회전 반지름 구하기', manual: true,
          goal: '<b>B = 3.0 T</b>에서 10 keV 중수소 핵의 회전 반지름 <b>r = mv/(qB)</b>를 계산해 입력한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'r = mv/(qB) = 3.34×10⁻²⁷ × 9.8×10⁵ / (1.6×10⁻¹⁹ × 3.0). 약 6.8×10⁻³ m(6.8 mm)예요.',
          setup() { S.gate = 'mt2'; S.tk.B = 3.0; S.tk.Bd = 3.0; tkReset(1); numR.clear(); setScene('tok'); },
          check: () => checkNum(numR, 6.8e-3, 0.04, '다시 계산해 보세요. r = 3.34×10⁻²⁷ × 9.8×10⁵ / (1.6×10⁻¹⁹ × 3.0) 이에요.'),
          status: () => '반지름은 가려 두었어요 (B = 3.0 T)',
          explain: 'r = mv/(qB) = 3.34×10⁻²⁷ × 9.8×10⁵ / (1.6×10⁻¹⁹ × 3.0) ≈ <b>6.8×10⁻³ m (6.8 mm)</b>예요. 장치의 크기(수 m)에 비해 수백 분의 1이라서 입자는 자기력선에 감겨 돌며 벽으로 나가지 못해요.',
        },
        {
          type: 'quiz', title: '그릇 없이 가두는 까닭',
          goal: '1억 °C 플라스마를 담을 수 있는 <b>그릇이 없는데도</b> 가둘 수 있는 까닭은?',
          setup() { S.gate = ''; S.tk.B = 3.0; S.tk.Bd = 3.0; S.tk.Ip = true; tkReset(1); setScene('tok'); },
          choices: ['자기장 속에서 하전 입자가 자기력선에 감겨 돌아 벽에 닿지 않기 때문이에요', '플라스마가 너무 뜨거워 벽을 통과하기 때문이에요', '자기장이 입자를 가속해서 벽을 밀어내기 때문이에요', '자기장이 플라스마를 식혀서 1억 °C가 안 되기 때문이에요'],
          answer: 0,
          feedback: ['', '입자는 벽을 통과하지 않아요. 닿으면 식어서 문제인 거예요. 그래서 닿지 않게 가두는 거예요.', '자기력은 일을 하지 않아 입자를 가속하지 못해요. 입자의 경로를 휘게 해 감겨 돌게 해요.', '자기장은 플라스마를 식히지 않아요. 오히려 벽에 닿지 않게 해서 온도가 유지돼요.'],
          explain: '하전 입자는 로런츠 힘 때문에 자기력선에 <b>감겨 돌면서</b>(r ≈ 수 mm) 자기력선을 따라서만 움직이고 옆으로 벗어나지 못해요. 도넛 모양으로 이어진 자기력선을 따라 돌기 때문에 벽에 닿지 않고 1억 °C가 유지돼요.',
        },
      ],
    },
    {
      title: '밴앨런대와 오로라', short: '밴앨런대', icon: '🌍', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 하전 입자가 자기력선에 감겨 도는 것(나선 운동)을 배웠어요. 지구 둘레에서도 같은 일이 크게 일어나요.</div>' +
        '<p>지구는 큰 막대자석이라서 자기력선이 극에서 모여요. 입자는 자기력선을 따라 나선으로 극 쪽으로 가다가 <b>자기장이 센 극 근처에서 되돌아와</b>(자기 거울) 남북을 왕복해요. 이렇게 갇힌 곳이 <b>밴앨런대</b>(내대, 외대)예요. 피치각이 너무 작은 입자는 대기와 부딪혀 <b>오로라</b>가 돼요.</p>',
      features: ['van'],
      setup() { S.gate = ''; Object.assign(S.va, { sp: 'p', pitch: 40, storm: false, p: null, trail: [], bounce: 0, aur: 0, aurHits: 0, trapped: false, everTrapped: false, state: 'idle' }); clr4(); setScene('van'); },
      recap: '지구 자기장 속의 입자는 자기력선에 감겨 돌며 극 사이를 왕복해요(밴앨런대). 대기에 닿는 입자가 극지방에서 오로라를 만들고, 위성은 밴앨런대를 조심해야 해요.',
      summary: '<ul><li>지구 자기장은 큰 막대자석. 입자가 <b>자기력선에 감겨 나선</b>으로 극 쪽으로 가다가, 자기장이 센 극 근처에서 되돌아와 <b>남북을 왕복</b>(자기 거울)하고, 동시에 지구 둘레를 천천히 동서로 돌아요.</li><li><b>밴앨런대</b>: 내대(약 1,000~6,000 km, 고에너지 양성자), 외대(약 13,000~60,000 km, 전자). 태양풍·우주선 입자를 막아 지표 생물을 보호하지만, 위성과 우주인에게는 방사선 위험이 있어요.</li><li>저궤도 400 km는 대체로 안전, 정지 궤도(36,000 km)는 외대 근처예요.</li><li><b>오로라</b>: 극지방에서 자기력선이 대기로 들어가 입자가 질소·산소와 충돌 → 산소 557.7 nm 초록색 빛. 태양 폭풍 때 입자가 늘어 더 강해요.</li></ul>',
      missions: [
        {
          title: '붙잡힌 입자와 오로라 만들기',
          goal: '입자를 넣어 <b>남북을 2번 이상 왕복(붙잡힘)</b>하는 입자와, <b>대기에 부딪혀 오로라</b>를 만드는 입자를 각각 만들어 보세요.',
          hint: '피치각(적도에서 자기력선과 이루는 각)이 크면 극 쪽 거울점에서 되돌아와 왕복해요. 피치각이 아주 작으면(3°) 거울점이 대기 속이라 대기에 부딪혀요. 왕복 두 번이 끝나기까지 몇 초 기다려요.',
          setup() { S.gate = ''; Object.assign(S.va, { sp: 'p', pitch: 40, storm: false, p: null, trail: [], bounce: 0, aur: 0, aurHits: 0, trapped: false, everTrapped: false, state: 'idle' }); setScene('van'); },
          check: vaOK, hold: 0.4,
          status: () => mark(S.va.everTrapped) + ' 남북 왕복 ' + Math.floor(S.va.bounce / 2) + '번 &nbsp; ' + mark(S.va.aurHits >= 1) + ' 오로라(대기 충돌) ' + S.va.aurHits + '번',
          explain: '피치각이 40°나 70°인 입자는 극 쪽에서 자기장이 세지는 거울점에서 되돌아와 남북을 왕복해요(붙잡힘). 피치각이 3°처럼 작은 입자는 거울점이 대기보다 낮아서(손실 원뿔 약 5°) 대기에 부딪혀 극지방의 질소·산소를 들뜨게 하고 오로라가 생겨요.',
        },
        {
          title: '위성 궤도와 오로라 판단', manual: true,
          goal: '네 위성이 밴앨런대 안에 있는지 판단하고, 오로라가 <b>극지방에서만</b> 보이는 까닭도 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '내대는 약 1,000~6,000 km, 외대는 약 13,000~60,000 km예요. 400 km와 800 km는 그 사이/아래에 있어요. 오로라는 입자가 자기력선을 따라 내려오는 곳에서 생겨요.',
          setup() { S.gate = 'mv2'; clr4(); setScene('van'); },
          check: () => checkSel(sat4R, s4St, s4Ok, s4Sels, '빨간 칸을 다시 골라 보세요. 위성 고도가 밴앨런대 범위(1,000~6,000 km, 13,000~60,000 km)에 들어가는지 비교하고, 오로라는 입자가 자기력선을 따라 어디로 들어오는지 생각해요.'),
          status: () => '고른 문제 ' + sat4R.filter((r, i) => s4St[i]).length + ' / 5',
          explain: '국제우주정거장(400 km)과 지구 관측 위성(800 km)은 내대(1,000 km 이상) 아래라서 방사선 위험이 낮아요. GPS(20,200 km)와 정지 궤도(36,000 km)는 외대(13,000~60,000 km) 안이라 방사선 위험이 커요. 오로라는 입자가 <b>자기력선을 따라 극지방의 대기로 들어와</b> 질소·산소와 충돌해 생겨서 극지방에서만 보여요. 밴앨런대는 태양풍·우주선 입자를 붙잡아 지표에 닿는 방사선을 줄여 줘요.',
        },
      ],
    },
  ];
  levels.forEach((lv) => lv.missions.forEach((m) => { MS[m.title] = m; }));

  game = SciSim.game({
    simId: 'hq-lorentz-tech', mount: '#game', badge: '로런츠 힘 기술자', homeHref: '../../index.html#hq',
    featureLabels: { cyc: '⚛️ 사이클로트론 · B와 f', mass: '🧪 속도 선택기 · 질량 분석기', tok: '🍩 토카막 · 온도 막대', van: '🌍 지구 자기장 · 밴앨런대 · 오로라' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  tkReset(); updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    if (S.mode === 'cyc') stepCyc(dt); else if (S.mode === 'mass') stepMs(dt); else if (S.mode === 'tok') stepTok(dt); else stepVan(dt);
    sceneBg();
    T(14, 26, TITLE[S.mode], PHONE ? 12 : 15.5, '#26324a', 'left', 800);
    if (S.mode === 'cyc') drawCyc(); else if (S.mode === 'mass') drawMass(); else if (S.mode === 'tok') drawTok(); else drawVan();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SC, STP, IN, MS, numF, numM, numR, s4Sels, sat4R, s4St, SAT, TKS, VA, MSC,
    get game() { return game; }, setScene, updateCtl, cyStart, cyReset, cyFres, cyKext, cyDelta, msV, msReset, tkTemp, tkReset, vaLaunch, msMean, cycOK, msOK, tkOK, vaOK,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; if (S.mode === 'cyc') stepCyc(0.02); else if (S.mode === 'mass') stepMs(0.02); else if (S.mode === 'tok') stepTok(0.02); else stepVan(0.02); } },
  };

})();
