/* =========================================================
   전자기와 양자 Ⅰ. 전자기적 상호작용 - 전류 주위의 자기장 (단원 4차시)
   성취기준 [12전자01-03] 자기력선을 이용하여 전류가 흐르는 도선 주위의 자기장의 세기와 방향을 추리할 수 있다.
   ① 실험: 직선 전류 (오른손 규칙, B = 2×10⁻⁷ I/r)
   ② 실험: 원형 전류 (중심의 B = μ₀NI/(2R))
   ③ 모형: 솔레노이드 (내부 B = μ₀nI, 균일 / 외부 약함, 철심)
   ④ 분석: 완성된 자기력선 그림 해석
   자기력선은 같은 자속마다 한 줄씩 그린 등고선이에요(선 밀도 = 세기). 비오-사바르 적분, 앙페르 법칙의 유도, 벡터 퍼텐셜은 다루지 않아요.
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

  const MU0 = 4e-7 * Math.PI;
  const CXs = SC.w / 2, CYs = SC.h / 2;                    // 장면 가운데
  const view_ = view;
  const MODE_LABEL = { wire: '🧭 직선 전류', loop: '⭕ 원형 전류', sol: '🧲 솔레노이드', fig: '🔍 그림 해석' };
  const dirTxt = (d) => (d > 0 ? '⊙ 지면에서 나오는 방향' : '⊗ 지면으로 들어가는 방향');

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'wire', t: 0, fade: 0, gate: '',
    w: { I: 10, r: 10, dir: 1, Id: 10, rd: 10, flips: 0, tab: [], needles: [], rec: 0 },
    l: { I: 5, R: 5, N: 1, dir: 1, Id: 5, Rd: 5, Nd: 1, key: '', cont: [], arrows: [], flow: makeFlow(38), clamped: false, K: 0, needles: [] },
    s: { n: 2000, I: 1.0, iron: false, dir: 1, nd: 2000, Id: 1.0, ironA: 0, key: '', cont: [], arrows: [], flow: makeFlow(46), clamped: false, K: 0, needles: [], ready: false },
    f: { fig: 'a' },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const Bwire = (I, r) => 2e-7 * I / (r / 100);               // T
  const Bloop = (N, I, R) => MU0 * N * I / (2 * R / 100);
  const Bsol = (n, I) => MU0 * n * I;
  const tabCells = [[5, 10], [10, 10], [20, 10], [10, 4], [10, 5], [10, 20]];
  function resetTab() { S.w.tab = tabCells.map((c) => ({ I: c[0], r: c[1], v: null })); S.w.flips = 0; }
  resetTab();
  S.w.needles = [0, 1, 2, 3, 4, 5].map(() => makeNeedle(-Math.PI / 2));
  S.l.needles = [0, 1, 2].map(() => makeNeedle(-Math.PI / 2));
  S.s.needles = [0, 1, 2, 3].map(() => makeNeedle(-Math.PI / 2));

  /* ================= ① 직선 전류 ================= */
  const WPX = 8.5;                                          // 1 cm = 8.5 화면 단위
  const WIRE_R = 9;
  function ringTan(a, dir) { return dir > 0 ? { x: Math.sin(a), y: -Math.cos(a) } : { x: -Math.sin(a), y: Math.cos(a) }; }
  function drawWire() {
    const w = S.w, mk = S.gate === 'mw2';
    sceneBegin();
    // 격자 점
    ctx.fillStyle = 'rgba(100,116,139,.13)';
    for (let x = 18; x < SC.w; x += 26) for (let y = 18; y < SC.h; y += 26) { ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill(); }
    const Is = Math.max(0.4, w.Id), fadeI = clamp(w.Id / 1.5, 0, 1);
    // 자기력선 (같은 간격의 자속마다 한 줄 → 선이 빽빽할수록 B가 커요)
    let idx = 0;
    for (let k = 1; k < 220; k++) {
      const rc = 100 * Math.exp(-k * 2.2 / Is);
      if (rc > 20.6) continue; if (rc < 0.9) break;
      const rp = rc * WPX, al = 0.78 * Math.min(1, (rc - 0.9) / 1.3) * Math.min(1, (21 - rc) / 1.6) * fadeI;
      ctx.strokeStyle = 'rgba(37,99,235,' + al + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(CXs, CYs, rp, 0, TAU); ctx.stroke();
      if (rp >= 20 && al > 0.1) {
        const a0 = idx * 2.4;
        for (let h = 0; h < 2; h++) {
          const a = a0 + h * Math.PI, t = ringTan(a, w.dir), px = CXs + Math.cos(a) * rp, py = CYs + Math.sin(a) * rp;
          ctx.fillStyle = 'rgba(30,64,175,' + Math.min(0.95, al + 0.15) + ')';
          ctx.beginPath(); ctx.moveTo(px + t.x * 6, py + t.y * 6); ctx.lineTo(px - t.x * 5 - t.y * 4.5, py - t.y * 5 + t.x * 4.5); ctx.lineTo(px - t.x * 5 + t.y * 4.5, py - t.y * 5 - t.x * 4.5); ctx.closePath(); ctx.fill();
        }
        if (!RM && idx < 14) {
          ctx.fillStyle = 'rgba(245,158,11,' + Math.min(1, al + 0.2) + ')';
          for (let h = 0; h < 2; h++) { const a = a0 + 1 + h * Math.PI - w.dir * (42 / rp) * S.t; ctx.beginPath(); ctx.arc(CXs + Math.cos(a) * rp, CYs + Math.sin(a) * rp, 2.5, 0, TAU); ctx.fill(); }
        }
      }
      idx++;
    }
    // 측정 원 (점선) · 나침반 · 센서
    const rpx = w.rd * WPX;
    ctx.strokeStyle = 'rgba(71,85,105,.55)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(CXs, CYs, rpx, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const Rc = clamp(rpx * 0.36, 6, 12);
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3, x = CXs + Math.cos(a) * rpx, y = CYs + Math.sin(a) * rpx;
      drawCompass(x, y, Rc, w.needles[k]);
    }
    // 도선 단면
    if (w.Id > 0.2 && !RM) D.glow(CXs, CYs, WIRE_R * (2 + w.Id / 8), '#f59e0b', 0.25 + 0.1 * Math.sin(S.t * 5));
    drawWireDot(CXs, CYs, WIRE_R, w.dir > 0);
    // 센서
    const sa = Math.PI / 6, sx = CXs + Math.cos(sa) * rpx, sy = CYs + Math.sin(sa) * rpx;
    D.shadow(() => { D.roundRect(sx - 15, sy - 9, 30, 18, 5); ctx.fillStyle = '#334155'; ctx.fill(); }, { blur: 5, y: 1.5 });
    ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(sx - 8, sy, 2.4, 0, TAU); ctx.fill();
    T(sx + 4, sy + 4.5, 'B', 12, '#fff', 'center', 800);
    const B = Bwire(w.I, w.r);
    const lx = clamp(sx + Math.cos(sa) * 70 + 8, 78, SC.w - 78), ly = clamp(sy + Math.sin(sa) * 44 + 22, 20, SC.h - 20);
    ctx.strokeStyle = 'rgba(51,65,85,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx, sy + 9); ctx.lineTo(lx, ly - 10); ctx.stroke();
    D.label(lx, ly, '센서 B = ' + (mk ? '?' : sci(B) + ' T'), { bg: '#334155', size: 13, pad: 7 });
    sceneEnd();
    // 아래 띠: 측정표
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    T(STP.x + 12, STP.y + 20, '📋 센서 측정표', 14, '#1e40af', 'left', 800);
    T(STP.x + STP.w - 12, STP.y + 20, '기록한 칸 ' + w.tab.filter((c) => c.v != null).length + ' / 6', 13, '#516079', 'right', 800);
    const cw = (STP.w - 24) / 3;
    w.tab.forEach((c, i) => {
      const row = i < 3 ? 0 : 1, col = i % 3, x = STP.x + 12 + col * cw, y = STP.y + 28 + row * 28;
      const cur = c.I === w.I && c.r === w.r && c.v == null;
      D.roundRect(x + 2, y, cw - 4, 24, 8); ctx.fillStyle = c.v != null ? '#e8f7ee' : cur ? '#fff2e5' : '#f3f6fb'; ctx.fill();
      ctx.strokeStyle = c.v != null ? '#16a34a' : cur ? '#f26b3a' : '#d5deec'; ctx.lineWidth = cur ? 2.2 : 1.4; ctx.stroke();
      T(x + 8, y + 16.5, 'I=' + c.I + ' A · r=' + c.r + ' cm', 12, '#26324a', 'left', 800);
      T(x + cw - 10, y + 16.5, c.v != null ? sci(c.v) + ' T' : '?', 12, c.v != null ? '#0b7a41' : '#94a3b8', 'right', 800);
    });
    // 오른쪽(아래) 설명 패널
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = IN.y + 24, x = IN.x + 14, mw = IN.w - 28;
    T(x, y, '직선 도선의 자기장', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    y += textBlock(x, y, mw, 'B = (μ₀/2π)(I/r) = 2×10⁻⁷ × I/r', sz, '#26324a', lh, 800);
    y += textBlock(x, y, mw, '= 2×10⁻⁷ × ' + w.I + ' / ' + g3(w.r / 100) + (mk ? ' = ?' : ' = ' + sci(B) + ' T'), sz, '#9a3412', lh, 800);
    y += 4;
    if (!PHONE || IN.h > 190) {
      y += textBlock(x, y, mw, 'B ∝ I (전류가 2배 → B 2배)', sz - 0.5, '#26324a', lh - 1, 700);
      y += textBlock(x, y, mw, 'B ∝ 1/r (거리가 2배 → B 1/2)', sz - 0.5, '#26324a', lh - 1, 700);
    }
    // 지구 자기장 비교 막대 (0 ~ 2.0×10⁻⁴ T)
    if (!mk) {
      y += 6; T(x, y + 4, '지구 자기장 5×10⁻⁵ T와 비교', sz - 1, '#516079', 'left', 800); y += 12;
      const bw = mw, bh = 16, f = clamp(B / 2e-4, 0, 1);
      D.roundRect(x, y, bw, bh, 7); ctx.fillStyle = '#eef1f7'; ctx.fill();
      if (f * bw > 1) { D.roundRect(x, y, Math.max(2, f * bw), bh, 7); ctx.fillStyle = '#2563eb'; ctx.fill(); }
      const ex = x + bw * 0.25; ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex, y - 4); ctx.lineTo(ex, y + bh + 4); ctx.stroke();
      T(x, y + bh + 15, '0', 11.5, '#516079', 'left', 700); T(x + bw, y + bh + 15, '2.0×10⁻⁴ T', 11.5, '#516079', 'right', 700); T(ex, y + bh + 15, '지구', 11.5, '#c0392b', 'center', 800);
      y += bh + 22;
    }
    if (!PHONE) {
      y += 6;
      const hx = x + 38, hy = y + 50;
      ctx.fillStyle = '#f6f9ff'; D.roundRect(x - 4, y, mw + 8, 92, 12); ctx.fill(); ctx.strokeStyle = '#dbe5f5'; ctx.lineWidth = 1.2; ctx.stroke();
      D.arrow(hx, hy + 22, hx, hy - 30, { color: '#d97706', width: 5, head: 11 });
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(hx, hy - 2, 24, 8, 0, Math.PI * 0.15, Math.PI * 1.65); ctx.stroke();
      { const ex = hx + 24 * Math.cos(Math.PI * 1.65), ey = hy - 2 + 8 * Math.sin(Math.PI * 1.65); D.arrow(ex - 2, ey + 3, ex + 4, ey - 4, { color: '#2563eb', width: 3, head: 9 }); }
      T(hx + 38, hy - 18, '🖐 오른손 규칙', 13, '#1e40af', 'left', 800);
      T(hx + 38, hy + 2, '엄지 = 전류 I', 13, '#b45309', 'left', 800);
      T(hx + 38, hy + 22, '손가락 = 자기장 B', 13, '#1d4ed8', 'left', 800);
      y += 100;
      textBlock(x, y + 8, mw, '🏭 클램프 전류계는 도선을 둘러싼 자기장의 세기로 전류를 재요.', sz - 1, '#0b7a41', lh - 2, 800);
    } else T(x, y + 6, '🖐 엄지 = 전류 I, 감아쥔 손가락 = 자기장 B', sz - 0.5, '#1d4ed8', 'left', 800);
  }
  function stepWire(dt) {
    const w = S.w;
    w.Id = SciSim.approach(w.Id, w.I, dt, 7); w.rd = SciSim.approach(w.rd, w.r, dt, 9);
    w.needles.forEach((nd, k) => {
      const a = k * Math.PI / 3, t = ringTan(a, w.dir), tgt = w.I > 0 ? Math.atan2(t.y, t.x) : -Math.PI / 2;
      stepNeedle(nd, tgt, dt, 38);
    });
  }
  function recordWire() {
    const w = S.w, c = w.tab.find((q) => q.I === w.I && q.r === w.r);
    if (!c) { showHint('표에 있는 (I, r) 조합으로 슬라이더를 맞춘 뒤 기록해 보세요.', 3200); Sound.wrong && Sound.wrong(); return; }
    if (c.v != null) { showHint('이미 기록한 칸이에요. 다른 칸을 채워 보세요.', 2600); return; }
    c.v = Bwire(c.I, c.r); Sound.success(); parts.burst(SC.x + CXs, SC.y + CYs, { count: 14, speed: 130, life: 0.7, size: 3 });
    updateCtl();
  }
  $('#wRec').addEventListener('click', () => { Sound.click(); recordWire(); });
  $('#wDir').addEventListener('click', () => { Sound.click(); S.w.dir = -S.w.dir; S.w.flips++; updateCtl(); });
  bindSl('wI', () => S.w.I, (v) => { S.w.I = v; }, updateCtl);
  bindSl('wR', () => S.w.r, (v) => { S.w.r = v; }, updateCtl);

  /* ================= ② 원형 전류 ================= */
  const LPX = 12, PHI0_L = 6.0e-8;
  const lgrid = makeGrid(0, 0, SC.w, SC.h, 4);
  let lGridR = -1;
  const FCAP_L = psiLoop(0.93, 0);
  function loopPsi(x, y, Rpx) { return psiLoop((y - CYs) / Rpx, (x - CXs) / Rpx); }
  function loopDir(Rpx, sgn) {
    return (x, y) => {
      const h = 0.7; let ym = CYs - y; if (Math.abs(ym) < 0.6) ym = ym < 0 ? -0.6 : 0.6;
      const fx = (loopPsi(x + h, y, Rpx) - loopPsi(x - h, y, Rpx)) / (2 * h), fy = (loopPsi(x, y + h, Rpx) - loopPsi(x, y - h, Rpx)) / (2 * h);
      let dx = -fy / ym, dy = fx / ym; const m = Math.hypot(dx, dy); if (m < 1e-12) return null;
      return { x: sgn * dx / m, y: sgn * dy / m };
    };
  }
  function updateLoopLines(force) {
    const l = S.l, Rpx = l.Rd * LPX;
    const amp = MU0 * l.Nd * l.Id * (l.Rd / 100);
    const key = Rpx.toFixed(2) + '|' + amp.toExponential(3) + '|' + l.dir;
    if (!force && key === l.key) return; l.key = key;
    if (Math.abs(Rpx - lGridR) > 0.02) { lGridR = Rpx; fillGrid(lgrid, (x, y) => loopPsi(x, y, Rpx)); }
    const fcap = FCAP_L;
    let K = amp > 0 ? Math.floor(fcap * amp / PHI0_L) : 0, delta;
    l.clamped = K > 30;
    if (K > 30) { K = 30; delta = fcap / 30.5; } else if (K < 1) { K = amp > 0 ? 1 : 0; delta = fcap / 2; } else delta = PHI0_L / amp;
    l.K = K;
    const levels = []; for (let k = 1; k <= K; k++) levels.push(k * delta);
    l.cont = contourLevels(lgrid, levels);
    l.arrows = pickArrows(l.cont, loopDir(Rpx, l.dir), 120, 26);
  }
  function drawWindN(x, y, N, out) {
    const n = Math.min(N, 5);
    for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 6.5; drawWireDot(x + o * 0.9, y + (i % 2 ? 2 : -2), n > 1 ? 6 : 8, out); }
  }
  function drawLoop() {
    const l = S.l, mk = S.gate === 'ml2', Rpx = l.Rd * LPX;
    updateLoopLines();
    sceneBegin();
    ctx.fillStyle = 'rgba(100,116,139,.12)';
    for (let x = 18; x < SC.w; x += 26) for (let y = 18; y < SC.h; y += 26) { ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill(); }
    // 자기력선 (선 1개 = 같은 자속)
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    l.cont.forEach((c, i) => { ctx.strokeStyle = 'rgba(37,99,235,' + (0.82 - 0.2 * i / Math.max(1, l.cont.length)) + ')'; ctx.lineWidth = l.cont.length > 20 ? 1.5 : 2; ctx.stroke(c.path); });
    drawArrowHeads(l.arrows);
    if (!RM) { stepFlowDraw(); }
    // 고리 (면에 수직인 단면)
    ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(CXs, CYs - Rpx); ctx.lineTo(CXs, CYs + Rpx); ctx.stroke(); ctx.setLineDash([]);
    drawWindN(CXs, CYs - Rpx, l.N, l.dir > 0); drawWindN(CXs, CYs + Rpx, l.N, l.dir < 0);
    // 극 이름표
    const pr = 0.5 * Rpx;
    [[1, 'N', POS], [-1, 'S', NEG]].forEach((p) => {
      const side = p[0] * l.dir;
      D.sphere(CXs + side * 26, CYs + pr + 4, 10, p[0] * l.dir > 0 ? POS : NEG, { shadow: true, text: p[0] * l.dir > 0 ? 'N' : 'S', textScale: 1.0 });
    });
    // 나침반
    const cps = loopCompassPos(Rpx);
    cps.forEach((p, k) => drawCompass(p.x, p.y, 11, l.needles[k]));
    // 크기 표시
    if (!PHONE || true) {
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(CXs + 18, CYs); ctx.lineTo(CXs + 18, CYs - Rpx); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CXs + 13, CYs - Rpx); ctx.lineTo(CXs + 23, CYs - Rpx); ctx.stroke();
      T(CXs + 28, CYs - Rpx / 2 + 4, 'R=' + l.R.toFixed(1) + ' cm', 13, '#0b7a41', 'left', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
    }
    if (l.clamped) T(SC.w - 10, 20, '선이 너무 많아 30개까지만 그렸어요', 12.5, '#9a3412', 'right', 800);
    lbl(CXs, SC.h - 14, '중심의 B: ' + (l.dir > 0 ? '→' : '←') + '   (손가락 = 전류, 엄지 = B)', { size: 12.5, minX: 0, maxX: SC.w, bg: 'rgba(255,255,255,.88)', color: '#516079' });
    sceneEnd();
    // 띠: 읽기 값
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    const B = Bloop(l.N, l.I, l.R);
    T(STP.x + 12, STP.y + 22, '고리 중심의 자기장', 14, '#1e40af', 'left', 800);
    T(STP.x + 12, STP.y + 48, 'B = μ₀NI/(2R) = 4π×10⁻⁷ × ' + l.N + ' × ' + g3(l.I) + ' / (2 × ' + g3(l.R / 100) + ')', PHONE ? 12 : 13, '#26324a', 'left', 800);
    T(STP.x + 12, STP.y + 72, mk ? 'B = ?' : 'B = ' + sci(B) + ' T', 17, '#9a3412', 'left', 800);
    T(STP.x + STP.w - 12, STP.y + 72, mk ? '' : '(지구 자기장의 ' + g3(B / 5e-5) + '배)', 12.5, '#516079', 'right', 800);
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = IN.y + 24, x = IN.x + 14, mw = IN.w - 28;
    T(x, y, '원형 도선의 자기장', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    y += textBlock(x, y, mw, '중심에서 B가 가장 크고, 방향은 고리 면에 수직이에요.', sz, '#26324a', lh, 800) + 2;
    y += textBlock(x, y, mw, 'B ∝ NI/R : N이 3배 → B 3배, R이 1/2 → B 2배', sz, '#9a3412', lh, 800) + 2;
    if (!PHONE) {
      y += textBlock(x, y, mw, '한 면은 N극, 반대 면은 S극인 얇은 자석처럼 행동해요.', sz, '#26324a', lh, 800) + 2;
      y += textBlock(x, y, mw, '고리 바깥쪽(같은 평면)의 B는 중심과 반대 방향이에요. 선이 닫힌 곡선이라서 안으로 들어간 만큼 밖으로 돌아 나와요.', sz - 0.5, '#26324a', lh - 1, 700) + 2;
      textBlock(x, y + 4, mw, '선 1개 = 같은 자속. 선이 빽빽한 곳이 B가 센 곳이에요.', sz - 1, '#0b7a41', lh - 2, 800);
    }
  }
  function loopCompassPos(Rpx) {
    return [{ x: CXs, y: CYs }, { x: CXs, y: CYs - Rpx * 1.75 }, { x: clamp(CXs + Rpx * 2.3, 0, SC.w - 20), y: CYs }];
  }
  function stepFlowDraw() {
    const m = S.mode;
    if (m === 'loop') drawFlow(S.l.flow); else if (m === 'sol') drawFlow(S.s.flow);
  }
  function stepLoop(dt) {
    const l = S.l;
    l.Id = SciSim.approach(l.Id, l.I, dt, 8); l.Rd = SciSim.approach(l.Rd, l.R, dt, 8); l.Nd = SciSim.approach(l.Nd, l.N, dt, 8);
    updateLoopLines();
    const Rpx = l.Rd * LPX, dir = loopDir(Rpx, l.dir), cps = loopCompassPos(Rpx);
    l.needles.forEach((nd, k) => { const d = dir(cps[k].x, cps[k].y); stepNeedle(nd, d && l.I > 0 ? Math.atan2(d.y, d.x) : -Math.PI / 2, dt, 34); });
    stepFlow(l.flow, l.cont, dir, dt, 62, { x0: 0, y0: 0, x1: SC.w, y1: SC.h });
  }
  bindSl('lI', () => S.l.I, (v) => { S.l.I = v; }, updateCtl);
  bindSl('lR', () => S.l.R, (v) => { S.l.R = v; }, updateCtl);
  bindSl('lN', () => S.l.N, (v) => { S.l.N = v; }, updateCtl);
  $('#lDir').addEventListener('click', () => { Sound.click(); S.l.dir = -S.l.dir; updateCtl(); });

  /* ================= ③ 솔레노이드 ================= */
  const SOL = { x0: 86, x1: 386, R: 30, M: 40, MD: 16, PHI0: 2.5e-6, L: 0.5, Rm: 0.05 };
  const sgrid = makeGrid(0, 0, SC.w, SC.h, 4);
  const sGs = (x, y) => {                                   // 단위 전류 · 단위 감김 밀도의 자속 함수 (모형 고리 M개의 평균)
    let s = 0; const rho = (y - CYs) / SOL.R;
    for (let j = 0; j < SOL.M; j++) { const zj = SOL.x0 + (j + 0.5) * (SOL.x1 - SOL.x0) / SOL.M; s += psiLoop(rho, (x - zj) / SOL.R); }
    return s / SOL.M;
  };
  let sGridReady = false, FCAP_S = 0.26;
  function ensureSolGrid() {
    if (sGridReady) return; sGridReady = true;
    fillGrid(sgrid, sGs); FCAP_S = sGs(CXs, CYs - 0.93 * SOL.R); S.s.ready = true;
  }
  const solPsiPt = (x, y) => sGs(x, y);
  function solDir(sgn) {
    return (x, y) => {
      const h = 0.8; let ym = CYs - y; if (Math.abs(ym) < 0.6) ym = ym < 0 ? -0.6 : 0.6;
      const fx = (solPsiPt(x + h, y) - solPsiPt(x - h, y)) / (2 * h), fy = (solPsiPt(x, y + h) - solPsiPt(x, y - h)) / (2 * h);
      let dx = -fy / ym, dy = fx / ym; const m = Math.hypot(dx, dy); if (m < 1e-12) return null;
      return { x: sgn * dx / m, y: sgn * dy / m };
    };
  }
  /* 가운데 면에서 선 사이 간격 s를 B에 반비례하게 잡아요 (선 개수 ∝ B). 균일한 내부는 평행한 등간격 선으로 보여요. */
  const SOL_B0 = 2.5e-3, SOL_NMAX = 14;
  function solSeeds(B, iron) {
    const rmax = 0.93 * SOL.R, s0 = rmax / 4.001;
    let n = 0, clamped = false;
    if (iron && B > 0) { n = SOL_NMAX; clamped = true; }
    else if (B > 0) { const s = s0 * SOL_B0 / B; n = Math.floor(rmax / s); if (n > SOL_NMAX) { n = SOL_NMAX; clamped = true; } }
    const sp = n >= SOL_NMAX && (clamped) ? rmax / (SOL_NMAX - 0.5) : s0 * SOL_B0 / Math.max(B, 1e-12);
    const levels = []; for (let i = 0; i < n; i++) levels.push(sGs(CXs, CYs - (i + 0.5) * sp));
    return { n, levels, clamped };
  }
  function updateSolLines(force) {
    const s = S.s; ensureSolGrid();
    const key = s.nd.toFixed(1) + '|' + s.Id.toFixed(3) + '|' + s.iron + '|' + s.dir;
    if (!force && key === s.key) return; s.key = key;
    const sd = solSeeds(MU0 * s.nd * s.Id, s.iron); s.K = sd.n; s.clamped = sd.clamped;
    s.cont = contourLevels(sgrid, sd.levels);
    s.arrows = pickArrows(s.cont, solDir(s.dir), 120, 26);
  }
  const solCompassPos = [{ x: CXs, y: CYs }, { x: SOL.x1 + 34, y: CYs }, { x: SOL.x0 - 34, y: CYs }, { x: CXs, y: CYs - 76 }];
  function drawSolenoid() {
    const s = S.s, hidePole = S.gate === 'sl2', Bv = Bsol(s.n, s.I);
    updateSolLines();
    sceneBegin();
    ctx.fillStyle = 'rgba(100,116,139,.12)';
    for (let x = 18; x < SC.w; x += 26) for (let y = 18; y < SC.h; y += 26) { ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill(); }
    // 철심
    if (s.ironA > 0.01) {
      const g = ctx.createLinearGradient(0, CYs - SOL.R * 0.62, 0, CYs + SOL.R * 0.62); g.addColorStop(0, '#cbd5e1'); g.addColorStop(0.5, '#f1f5f9'); g.addColorStop(1, '#94a3b8');
      ctx.globalAlpha = s.ironA; D.roundRect(SOL.x0 - 6, CYs - SOL.R * 0.62, SOL.x1 - SOL.x0 + 12, SOL.R * 1.24, 5); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 코일 몸통
    D.roundRect(SOL.x0 - 4, CYs - SOL.R, SOL.x1 - SOL.x0 + 8, SOL.R * 2, 6); ctx.fillStyle = 'rgba(217,164,65,.10)'; ctx.fill(); ctx.strokeStyle = 'rgba(180,130,30,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    // 자기력선
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    s.cont.forEach((c, i) => { ctx.strokeStyle = 'rgba(37,99,235,' + (s.iron ? 0.62 : 0.8) + ')'; ctx.lineWidth = s.cont.length > 20 ? 1.4 : 1.9; ctx.stroke(c.path); });
    drawArrowHeads(s.arrows);
    if (!RM) drawFlow(s.flow);
    // 감긴 선 (그림에는 16개만)
    for (let j = 0; j < SOL.MD; j++) {
      const x = SOL.x0 + (j + 0.5) * (SOL.x1 - SOL.x0) / SOL.MD;
      drawWireDot(x, CYs - SOL.R, 5, s.dir > 0); drawWireDot(x, CYs + SOL.R, 5, s.dir < 0);
    }
    // 극 이름표 (코일 안쪽 끝)
    if (!hidePole && s.Id > 0) {
      const eN = s.dir > 0 ? SOL.x1 - 20 : SOL.x0 + 20, eS = s.dir > 0 ? SOL.x0 + 20 : SOL.x1 - 20;
      D.sphere(eN, CYs + 16, 11, POS, { shadow: true, text: 'N' });
      D.sphere(eS, CYs + 16, 11, NEG, { shadow: true, text: 'S' });
    }
    solCompassPos.forEach((p, k) => drawCompass(p.x, p.y, 11, s.needles[k]));
    lbl(CXs, CYs + SOL.R + 40, '길이 0.50 m · 반지름 5.0 cm (감은 선은 일부만 그렸어요)', { size: 12.5, minX: 0, maxX: SC.w, bg: 'rgba(255,255,255,.88)', color: '#516079' });
    if (s.clamped) T(SC.w - 10, 20, '선이 너무 많아 30개까지만 그렸어요', 12.5, '#9a3412', 'right', 800);
    lbl(CXs, SC.h - 14, '내부는 균일, 외부는 약해요. 선이 많을수록 B가 세요', { size: 12.5, minX: 0, maxX: SC.w, bg: 'rgba(255,255,255,.88)', color: '#516079' });
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    T(STP.x + 12, STP.y + 22, '솔레노이드 내부의 자기장', 14, '#1e40af', 'left', 800);
    T(STP.x + 12, STP.y + 47, 'B = μ₀nI = 4π×10⁻⁷ × ' + s.n + ' × ' + g3(s.I), PHONE ? 12 : 13, '#26324a', 'left', 800);
    if (s.iron) T(STP.x + 12, STP.y + 72, '철심: 수백~수천 × μ₀nI  (' + sci(Bv) + ' T의 수백~수천 배)', PHONE ? 13 : 14.5, '#9a3412', 'left', 800);
    else T(STP.x + 12, STP.y + 72, 'B = ' + sci(Bv) + ' T', 17, '#9a3412', 'left', 800);
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = IN.y + 24, x = IN.x + 14, mw = IN.w - 28;
    T(x, y, '솔레노이드', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    y += textBlock(x, y, mw, '고리를 겹겹이 쌓으면 내부 자기장이 균일하게 모이고 바깥은 약해져요.', sz, '#26324a', lh, 800) + 2;
    y += textBlock(x, y, mw, 'n = 단위 길이당 감은 수 (회/m).  B ∝ nI', sz, '#9a3412', lh, 800) + 2;
    if (!PHONE) {
      y += textBlock(x, y, mw, '오른손: 손가락 = 전류가 도는 방향, 엄지 = 내부 B → 엄지가 향하는 끝이 N극이에요.', sz, '#26324a', lh, 800) + 2;
      y += textBlock(x, y, mw, '🏭 전자석: 크레인, MRI(1.5~3 T), 자기 부상 열차. 철심을 넣으면 자기장이 수백~수천 배 세져요.', sz - 0.5, '#0b7a41', lh - 1, 800);
    }
  }
  function stepSol(dt) {
    const s = S.s;
    s.nd = SciSim.approach(s.nd, s.n, dt, 8); s.Id = SciSim.approach(s.Id, s.I, dt, 8); s.ironA = SciSim.approach(s.ironA, s.iron ? 1 : 0, dt, 9);
    updateSolLines();
    const dir = solDir(s.dir);
    s.needles.forEach((nd, k) => { const d = dir(solCompassPos[k].x, solCompassPos[k].y); stepNeedle(nd, d && s.I > 0 ? Math.atan2(d.y, d.x) : -Math.PI / 2, dt, 34); });
    stepFlow(s.flow, s.cont, dir, dt, 70, { x0: 0, y0: 0, x1: SC.w, y1: SC.h });
  }
  bindSl('sN', () => S.s.n, (v) => { S.s.n = v; }, updateCtl);
  bindSl('sI', () => S.s.I, (v) => { S.s.I = v; }, updateCtl);
  $('#sIron').addEventListener('click', () => { Sound.click(); S.s.iron = !S.s.iron; updateCtl(); });
  $('#sDir').addEventListener('click', () => { Sound.click(); S.s.dir = -S.s.dir; updateCtl(); });

  /* ================= ④ 그림 해석 ================= */
  const FR = { x0: 0, y0: 0, x1: SC.w, y1: SC.h };
  function wireA(wires, rmin) {          // A = -Σ I ln(r/100) (그림 단위)
    return (x, y) => { let a = 0; wires.forEach((w) => { a += -w.I * Math.log(Math.max(Math.hypot(x - w.x, y - w.y), rmin) / 100); }); return a; };
  }
  function wireDir(wires) {
    return (x, y) => {
      let bx = 0, by = 0;
      wires.forEach((w) => { const dx = x - w.x, dy = -(y - w.y), r2 = Math.max(dx * dx + dy * dy, 1); bx += w.I * (-dy) / r2; by += w.I * dx / r2; });
      const m = Math.hypot(bx, by); if (m < 1e-9) return null;
      return { x: bx / m, y: -by / m };
    };
  }
  function wireMag(wires, x, y) {
    let bx = 0, by = 0;
    wires.forEach((w) => { const dx = x - w.x, dy = -(y - w.y), r2 = Math.max(dx * dx + dy * dy, 1); bx += w.I * (-dy) / r2; by += w.I * dx / r2; });
    return Math.hypot(bx, by);
  }
  function build2D(wires, dA, box, rmin) {
    const g = makeGrid(box.x, box.y, box.w, box.h, 3), A = wireA(wires, rmin);
    fillGrid(g, A);
    let mn = 1e9, mx = -1e9; for (let i = 0; i < g.v.length; i++) { if (g.v[i] < mn) mn = g.v[i]; if (g.v[i] > mx) mx = g.v[i]; }
    const levels = []; for (let k = Math.ceil(mn / dA); k * dA <= mx; k++) levels.push(k * dA);
    const cont = contourLevels(g, levels), dir = wireDir(wires);
    return { cont, arrows: pickArrows(cont, dir, 95, 30), wires, dir, box };
  }
  const FIGS = {};
  (function buildFigs() {
    // 가: 직선 도선 한 개 (전류는 지면으로 들어가는 방향 → 시계 방향)
    FIGS.a = { kind: '2d', name: '그림 가', subs: [build2D([{ x: CXs, y: CYs, I: -1 }], 0.231, { x: 0, y: 0, w: SC.w, h: SC.h }, 11)] };
    FIGS.a.pts = { P: { x: CXs, y: CYs - 48, tag: 'P' }, Q: { x: CXs - 96, y: CYs, tag: 'Q' } };
    // 나: 두 도선 (㉠ 반대 방향, ㉡ 같은 방향)
    const hw = SC.w / 2;
    const sA = build2D([{ x: hw / 2 - 42, y: CYs, I: 1 }, { x: hw / 2 + 42, y: CYs, I: -1 }], 0.3, { x: 0, y: 0, w: hw - 3, h: SC.h }, 9);
    const sB = build2D([{ x: hw + 3 + hw / 2 - 42, y: CYs, I: -1 }, { x: hw + 3 + hw / 2 + 42, y: CYs, I: -1 }], 0.3, { x: hw + 3, y: 0, w: hw - 3, h: SC.h }, 9);
    FIGS.b = { kind: '2d', name: '그림 나', subs: [sA, sB], pts: { P1: { x: hw / 2, y: CYs, tag: 'P' }, P2: { x: hw + 3 + hw / 2, y: CYs, tag: 'P' } } };
    // 라: 알 수 없는 장치 (네 도선)
    const wd = [{ x: CXs - 92, y: CYs - 62, I: -1, name: 'A' }, { x: CXs + 92, y: CYs - 62, I: 3, name: 'B' }, { x: CXs - 92, y: CYs + 62, I: -2, name: 'C' }, { x: CXs + 92, y: CYs + 62, I: 1, name: 'D' }];
    FIGS.d = { kind: '2d', name: '그림 라', subs: [build2D(wd, 0.3, { x: 0, y: 0, w: SC.w, h: SC.h }, 8)], wd };
  })();
  FIGS.c = { kind: 'sol', name: '그림 다', dir: -1, pts: { P: { x: CXs, y: CYs - 8 }, Q: { x: CXs + 20, y: CYs - 78 } } };
  let figC = null;
  function ensureFigC() {
    if (figC) return; ensureSolGrid();
    const sd = solSeeds(MU0 * 5000, false);
    const cont = contourLevels(sgrid, sd.levels), dir = solDir(FIGS.c.dir);
    figC = { cont, arrows: pickArrows(cont, dir, 120, 26), dir };
  }
  const dirIdx = (d) => (Math.abs(d.x) > Math.abs(d.y) ? (d.x > 0 ? 3 : 2) : (d.y < 0 ? 0 : 1));   // 0 위 1 아래 2 왼 3 오른
  function drawFig2d(sub, pts, mask) {
    ctx.save(); ctx.beginPath(); ctx.rect(sub.box.x, sub.box.y, sub.box.w, sub.box.h); ctx.clip();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    sub.cont.forEach((c) => { ctx.strokeStyle = 'rgba(37,99,235,.72)'; ctx.lineWidth = 1.8; ctx.stroke(c.path); });
    drawArrowHeads(sub.arrows);
    ctx.restore();
  }
  function drawFigs() {
    const f = FIGS[S.f.fig];
    sceneBegin();
    if (f.kind === '2d') {
      f.subs.forEach((s) => drawFig2d(s));
      if (f.name === '그림 가') {
        drawWireDot(CXs, CYs, 9, false, { q: true, fill: '#cbd5e1' }); T(CXs, CYs + 5, '?', 14, '#475569', 'center', 800);
      } else if (f.name === '그림 나') {
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(SC.w / 2, 8); ctx.lineTo(SC.w / 2, SC.h - 8); ctx.stroke();
        f.subs.forEach((s) => s.wires.forEach((w) => { drawWireDot(w.x, w.y, 8, true, { q: true, fill: '#cbd5e1' }); T(w.x, w.y + 5, '?', 13, '#475569', 'center', 800); }));
        T(SC.w / 4, 24, '그림 ㉠', 15, '#26324a', 'center', 800); T(SC.w * 3 / 4, 24, '그림 ㉡', 15, '#26324a', 'center', 800);
      } else {
        f.wd.forEach((w) => { drawWireDot(w.x, w.y, 8, true, { q: true, fill: '#cbd5e1' }); T(w.x, w.y + 5, '?', 13, '#475569', 'center', 800); lbl(w.x + 22, w.y - 18, w.name, { bg: '#26324a', color: '#fff', size: 13, pad: 7, minX: 0, maxX: SC.w }); });
      }
      Object.keys(f.pts || {}).forEach((k) => {
        const p = f.pts[k]; D.sphere(p.x, p.y, 6.5, '#475569', { shadow: true, gloss: false });
        lbl(p.x + 16, p.y - 16, p.tag || k, { bg: '#f26b3a', color: '#fff', size: 13, pad: 7, minX: 0, maxX: SC.w });
      });
    } else {
      ensureFigC();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      D.roundRect(SOL.x0 - 4, CYs - SOL.R, SOL.x1 - SOL.x0 + 8, SOL.R * 2, 6); ctx.fillStyle = 'rgba(217,164,65,.10)'; ctx.fill(); ctx.strokeStyle = 'rgba(180,130,30,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
      figC.cont.forEach((c) => { ctx.strokeStyle = 'rgba(37,99,235,.75)'; ctx.lineWidth = 1.6; ctx.stroke(c.path); });
      drawArrowHeads(figC.arrows);
      for (let j = 0; j < SOL.MD; j++) {
        const x = SOL.x0 + (j + 0.5) * (SOL.x1 - SOL.x0) / SOL.MD;
        drawWireDot(x, CYs - SOL.R, 5, f.dir > 0); drawWireDot(x, CYs + SOL.R, 5, f.dir < 0);
      }
      Object.keys(f.pts).forEach((k) => { const p = f.pts[k]; D.sphere(p.x, p.y, 6.5, '#475569', { shadow: true, gloss: false }); lbl(p.x + 16, p.y - 16, k, { bg: '#f26b3a', color: '#fff', size: 13, pad: 7, minX: 0, maxX: SC.w }); });
      T(10, 22, '그림 다 (솔레노이드의 단면)', 15, '#26324a', 'left', 800);
    }
    if (f.name === '그림 가') T(10, 22, '그림 가 (도선의 단면)', 15, '#26324a', 'left', 800);
    if (f.name === '그림 라') T(10, 22, '그림 라 (알 수 없는 장치: 도선 A~D의 단면)', 14, '#26324a', 'left', 800);
    sceneEnd();
    panel(STP.x, STP.y, STP.w, STP.h, 14);
    T(STP.x + 12, STP.y + 22, '그림에서 읽을 수 있는 것', 14, '#1e40af', 'left', 800);
    const tip = { a: '자기력선은 도선을 둘러싼 동심원이고, 화살표가 전류와 오른손 규칙으로 이어져요. 바깥으로 갈수록 선 간격이 넓어져요.', b: '두 도선의 자기장은 벡터로 더해져요. 선이 서로 밀려나 비어 있는 곳이 B가 약한 곳이에요.', c: '내부에서는 선이 평행하고 촘촘해요. 선은 끊기지 않고 밖으로 돌아 N극 쪽에서 나와 S극 쪽으로 들어가요.', d: '선이 빽빽한 곳일수록 B가 세요. 도선 가까이에서 둘러싼 선의 수를 비교해 보세요.' }[S.f.fig];
    textBlock(STP.x + 12, STP.y + 42, STP.w - 24, tip, PHONE ? 12 : 12.5, '#26324a', 17, 700);
    panel(IN.x, IN.y, IN.w, IN.h, 14);
    const sz = PHONE ? 12.5 : 14, lh = PHONE ? 19 : 22; let y = IN.y + 24, x = IN.x + 14, mw = IN.w - 28;
    T(x, y, '자기력선 그림 읽는 법', sz + 1, '#1e40af', 'left', 800); y += lh + 2;
    ['선의 접선 = 자기장 방향, 화살표 = 방향', '선이 빽빽 = 자기장이 세요', '자기력선은 끊기지 않는 닫힌 곡선이에요', '전류 방향과 자기장 방향은 오른손 규칙'].forEach((t) => { y += textBlock(x, y, mw, '• ' + t, sz - (PHONE ? 0.5 : 0), '#26324a', lh, 800) + 2; });
    if (!PHONE) textBlock(x, y + 6, mw, '아래 질문에 답하고 ✔ 확인하기를 눌러요. 그림 가·나·다·라를 모두 풀어요.', sz - 0.5, '#9a3412', lh, 800);
  }
  /* 질문과 정답은 그림의 계산값에서 구해요 */
  const FQ = (function () {
    const a = FIGS.a, ad = a.subs[0].dir;
    const pP = a.pts.P, pQ = a.pts.Q;
    const dirQ = dirIdx(ad(pQ.x, pQ.y));
    const bP = wireMag(a.subs[0].wires, pP.x, pP.y), bQ = wireMag(a.subs[0].wires, pQ.x, pQ.y);
    const ratio = bP / bQ;
    const ratioIdx = Math.abs(ratio - 2) < 0.1 ? 2 : Math.abs(ratio - 1) < 0.1 ? 1 : Math.abs(ratio - 0.5) < 0.05 ? 0 : 3;
    const b = FIGS.b, bm1 = wireMag(b.subs[0].wires, b.pts.P1.x, b.pts.P1.y), bm2 = wireMag(b.subs[1].wires, b.pts.P2.x, b.pts.P2.y);
    const dd = FIGS.d.wd;
    const maxI = dd.reduce((m, w, i) => (Math.abs(w.I) > Math.abs(dd[m].I) ? i : m), 0);
    return {
      a: [['전류의 방향은?', ['⊙ 지면에서 나오는 방향', '⊗ 지면으로 들어가는 방향'], 1], ['점 P와 점 Q의 자기장 세기 B_P : B_Q 는?', ['1 : 2', '1 : 1', '2 : 1', '4 : 1'], ratioIdx], ['점 Q에서 자기장의 방향은?', ['위쪽', '아래쪽', '왼쪽', '오른쪽'], dirQ]],
      b: [['그림 ㉠에서 두 도선의 전류 방향은?', ['서로 같아요', '서로 반대예요'], bm1 > bm2 ? 1 : 0], ['두 도선 한가운데 점 P에서 자기장이 약한(거의 0인) 그림은?', ['그림 ㉠', '그림 ㉡', '둘 다 같아요'], bm1 < bm2 ? 0 : 1]],
      c: [['솔레노이드의 N극은 어느 쪽 끝에 생기나요?', ['왼쪽 끝', '오른쪽 끝'], FIGS.c.dir > 0 ? 1 : 0], ['점 P(내부)와 점 Q(외부) 중 자기장이 센 곳은?', ['점 P', '점 Q', '같아요'], 0], ['솔레노이드 내부의 자기력선 모양은?', ['거의 평행하고 간격이 일정해요', '가운데로 모였다가 퍼져요', '없어요'], 0]],
      d: [['전류가 가장 큰 도선은?', ['도선 A', '도선 B', '도선 C', '도선 D'], maxI], ['전류의 크기가 같은 두 도선은?', ['A와 B', 'A와 D', 'B와 C', 'C와 D'], 1]],
    };
  })();
  const fHost = $('#selHost4'), fSels = {}, fStore = {}, fOk = {};
  ['a', 'b', 'c', 'd'].forEach((k) => {
    fStore[k] = {}; fOk[k] = {};
    const tmp = document.createElement('div');
    fSels[k] = makeSelects(tmp, FQ[k], fStore[k], fOk[k]);
    Array.from(tmp.children).forEach((row) => { row.dataset.fig = k; fHost.appendChild(row); });
  });
  const fN = (k) => Object.keys(fStore[k]).filter((i) => fStore[k][i]).length;
  function checkFigs() {
    let miss = 0; ['a', 'b', 'c', 'd'].forEach((k) => FQ[k].forEach((r, i) => { if (!fStore[k][i]) miss++; }));
    if (miss) return '아직 답하지 않은 문제가 ' + miss + '개 있어요. (그림 가·나·다·라를 모두 풀어요)';
    const bad = [];
    ['a', 'b', 'c', 'd'].forEach((k) => { let w = 0; FQ[k].forEach((r, i) => { const o = +fStore[k][i] - 1 === r[2]; if (!o) w++; selMark(fSels[k][i], i, o, fOk[k]); }); if (w) bad.push(FIGS[k].name); });
    return bad.length ? bad.join(', ') + '에서 틀린 답이 있어요. 빨간 칸을 다시 생각해 보세요. (화살표 방향, 선의 간격, 오른손 규칙을 살펴봐요)' : true;
  }
  function resetFigs() { ['a', 'b', 'c', 'd'].forEach((k) => resetSels(fSels[k], fStore[k], fOk[k])); S.f.fig = 'a'; }
  $$('#figSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.f.fig = b.dataset.v; S.fade = 0.6; updateCtl(); }));

  /* ---------- 숫자 입력 · 선택 ---------- */
  const numW = makeNum($('#numWHost'), '<b>I = 10 A</b>, <b>r = 5.0 cm</b>에서 센서가 가리킬 B는?', 'B =', 'T');
  const numL = makeNum($('#numLHost'), '<b>I = 5.0 A</b>, <b>R = 5.0 cm</b>인 고리를 <b>N = 10번</b> 감으면 중심의 B는?', 'B =', 'T');
  const polR = [['그림의 전류 방향일 때 솔레노이드의 <b>N극</b>은 어느 쪽 끝인가요?', ['왼쪽 끝', '오른쪽 끝'], 0]];
  const polSt = {}, polOk = {}, polSels = makeSelects($('#polHost'), polR, polSt, polOk);

  /* ================= 공통 UI ================= */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; }
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
    const w = S.w, l = S.l, s = S.s;
    setRange('wI', w.I, 0, 20, (v) => v + ' A'); setRange('wR', w.r, 2, 20, (v) => v + ' cm');
    $('#wIM').disabled = w.I <= 0; $('#wIP').disabled = w.I >= 20; $('#wRM').disabled = w.r <= 2; $('#wRP').disabled = w.r >= 20;
    $('#wDir').textContent = '🔁 전류 방향 바꾸기 (지금 ' + (w.dir > 0 ? '⊙' : '⊗') + ')';
    setRange('lI', l.I, 1, 8, (v) => v.toFixed(1) + ' A'); setRange('lR', l.R, 3, 8, (v) => v.toFixed(1) + ' cm'); setRange('lN', l.N, 1, 3, (v) => v + '회');
    $('#lIM').disabled = l.I <= 1; $('#lIP').disabled = l.I >= 8; $('#lRM').disabled = l.R <= 3; $('#lRP').disabled = l.R >= 8; $('#lNM').disabled = l.N <= 1; $('#lNP').disabled = l.N >= 3;
    $('#lDir').textContent = '🔁 전류 방향 바꾸기 (지금 ' + (l.dir > 0 ? '⊙ 위 / ⊗ 아래' : '⊗ 위 / ⊙ 아래') + ')';
    setRange('sN', s.n, 500, 4000, (v) => v + ' 회/m'); setRange('sI', s.I, 0, 3, (v) => v.toFixed(1) + ' A');
    $('#sNM').disabled = s.n <= 500; $('#sNP').disabled = s.n >= 4000; $('#sIM').disabled = s.I <= 0; $('#sIP').disabled = s.I >= 3;
    $('#sIron').textContent = s.iron ? '🔩 철심 빼기' : '🔩 철심 넣기'; $('#sIron').classList.toggle('btn-primary', !s.iron);
    $('#sDir').textContent = '🔁 전류 방향 바꾸기';
    $$('#figSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.f.fig));
    $$('#selHost4 .sel-row').forEach((r) => { r.hidden = r.dataset.fig !== S.f.fig; });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  function readouts() {
    let a, b, c;
    const m = S.mode;
    if (m === 'wire') { const w = S.w, mk = S.gate === 'mw2'; a = ['전류 I', w.I + ' A']; b = ['도선에서 거리 r', w.r + ' cm']; c = ['센서 B', mk ? '?' : sci(Bwire(w.I, w.r)) + ' T']; }
    else if (m === 'loop') { const l = S.l, mk = S.gate === 'ml2'; a = ['감은 수 N · 전류 I', l.N + '회 · ' + l.I.toFixed(1) + ' A']; b = ['반지름 R', l.R.toFixed(1) + ' cm']; c = ['중심의 B', mk ? '?' : sci(Bloop(l.N, l.I, l.R)) + ' T']; }
    else if (m === 'sol') { const s = S.s; a = ['감김 밀도 n', s.n + ' 회/m']; b = ['전류 I', s.I.toFixed(1) + ' A']; c = ['내부 B', s.iron ? '수백~수천 × μ₀nI' : sci(Bsol(s.n, s.I)) + ' T']; }
    else { const k = S.f.fig, tot = fN('a') + fN('b') + fN('c') + fN('d'); a = ['보는 그림', FIGS[k].name]; b = ['이 그림에서 답한 문제', fN(k) + ' / ' + FQ[k].length]; c = ['전체 답한 문제', tot + ' / 10']; }
    [[l1, v1, a], [l2, v2, b], [l3, v3, c]].forEach((z) => { if (z[0].textContent !== z[2][0]) z[0].textContent = z[2][0]; if (z[1].textContent !== z[2][1]) z[1].textContent = z[2][1]; });
  }

  /* ================= 미션 ================= */
  const MS = {};
  const solOK = () => !S.s.iron && Math.abs(Bsol(S.s.n, S.s.I) - 5.0e-3) <= 0.03 * 5.0e-3;
  const loopOK = () => Math.abs(Bloop(S.l.N, S.l.I, S.l.R) - 6.28e-5) <= 0.03 * 6.28e-5;
  function setW(I, r, dir) { S.w.I = I; S.w.r = r; if (dir) S.w.dir = dir; }
  const levels = [
    {
      title: '직선 전류: 오른손 규칙과 B ∝ I/r', short: '직선 전류', icon: '🧭', phase: '실험',
      intro: '<p class="si-q">❓ 탐구 질문: 전류가 흐르는 도선 둘레의 자기장은 전류와 거리에 따라 어떻게 달라질까?</p>' +
        '<div class="si-link">🔗 <b>중학교 「전류의 자기 작용」</b>에서 전류 둘레에 자기장이 생기는 것을, <b>물리학 「전동기와 스피커」</b>에서 자기장 속 전류가 받는 힘 F = BIL(B는 주어진 값)을 배웠어요. 이번에는 그 <b>B가 전류로부터 어떻게 정해지는지</b> 알아봐요.</div>' +
        '<p>전류(원인)가 주변 공간에 <b>자기장</b>을 만들고, 그 자기장 속에 놓인 다른 전류가 힘을 받아요. 도선을 둘러싼 나침반과 센서로 방향(오른손 규칙)과 세기(B와 I, r의 관계)를 찾아요. 🏭 도선을 끼워 전류를 재는 클램프 전류계가 이 원리예요.</p>',
      features: ['wire'],
      setup() { S.gate = ''; setW(10, 10, 1); resetTab(); numW.clear(); setScene('wire'); },
      recap: '직선 전류의 자기장은 도선을 둘러싼 동심원이에요(오른손 규칙). 세기는 B = 2×10⁻⁷ I/r 로 전류에 비례하고 거리에 반비례해요.',
      summary: '<ul><li><b>방향</b>: 앙페르의 오른손 규칙 — 엄지가 전류 방향이면 감아쥔 손가락이 자기장 방향이에요. 전류를 반대로 하면 자기장도 반대가 돼요.</li><li><b>세기</b>: B = (μ₀/2π)(I/r) = 2×10⁻⁷ × I/r (T). B ∝ I, B ∝ 1/r. 예) I = 10 A, r = 5.0 cm → <b>4.0×10⁻⁵ T</b>(지구 자기장 약 5×10⁻⁵ T와 비슷).</li><li>자기력선은 도선 둘레의 동심원이고, 바깥으로 갈수록 간격이 넓어져요(B가 작아져요). 전기장의 1/r²과 헷갈리지 않아요.</li><li>전류(원인)가 자기장을 만들고, 그 속의 다른 전류가 힘을 받아요 — 장이 상호작용을 전달해요.</li></ul>',
      missions: [
        {
          title: '센서 표 채우기',
          goal: '<b>전류 방향을 한 번 바꿔 보고</b>(⊙↔⊗), 슬라이더를 맞춘 뒤 <b>📋 기록</b>으로 표의 <b>6칸</b>을 모두 채우세요.',
          hint: '표 칸에 적힌 I와 r로 슬라이더를 맞춘 다음 기록을 눌러요. 칸이 주황색 테두리가 되면 지금 값과 같다는 뜻이에요. 방향 바꾸기 버튼도 눌러 보세요.',
          setup() { S.gate = ''; setW(10, 10, 1); resetTab(); setScene('wire'); },
          check: () => S.w.flips >= 1 && S.w.tab.every((c) => c.v != null),
          hold: 0.6,
          status: () => mark(S.w.flips >= 1) + ' 방향 바꿔 봄 &nbsp; ' + mark(S.w.tab.every((c) => c.v != null)) + ' 표 ' + S.w.tab.filter((c) => c.v != null).length + ' / 6',
          explain: '나침반 바늘이 도선을 둘러싸는 원 모양으로 늘어서요(전류를 반대로 하면 바늘도 반대 방향). 표에서 r = 10 cm일 때 I가 2배, 4배면 B도 2배, 4배(B ∝ I)이고, I = 10 A일 때 r이 2배, 4배가 되면 B는 1/2, 1/4배(B ∝ 1/r)예요.',
        },
        {
          title: 'B 예측하기', manual: true,
          goal: '<b>I = 10 A, r = 5.0 cm</b>에서 센서가 가리킬 자기장 B를 계산해 입력한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'B = 2×10⁻⁷ × I / r. r는 m 단위로 바꿔요(5.0 cm = 0.050 m). 2×10⁻⁷ × 10 / 0.050 을 계산해요.',
          setup() { S.gate = 'mw2'; setW(10, 5, 1); numW.clear(); setScene('wire'); },
          check: () => checkNum(numW, 4.0e-5, 0.03, '다시 계산해 보세요. B = 2×10⁻⁷ × 10 / 0.050 이에요. 10의 거듭제곱도 확인해요.'),
          status: () => '센서 값은 가려 두었어요 (I = 10 A, r = 5.0 cm)',
          explain: 'B = 2×10⁻⁷ × 10 / 0.050 = <b>4.0×10⁻⁵ T</b>예요. 지구 자기장(약 5×10⁻⁵ T)과 비슷한 크기라서 나침반 바늘이 눈에 띄게 움직여요.',
        },
        {
          type: 'quiz', title: '거리가 2배가 되면',
          goal: '도선에서 거리 r가 <b>2배</b>가 되면 자기장 B는 어떻게 될까요?',
          setup() { S.gate = ''; setW(10, 5, 1); setScene('wire'); },
          choices: ['1/2배가 돼요', '1/4배가 돼요', '2배가 돼요', '변하지 않아요'],
          answer: 0,
          feedback: ['', '1/4배는 전기장(E = kq/r²)의 경우예요. 직선 전류의 자기장은 B ∝ 1/r 이라서 1/2배가 돼요.', 'B는 거리가 멀어질수록 작아져요. 센서 값을 r 슬라이더로 직접 확인해 보세요.', '거리가 달라지면 B도 달라져요. 표에서 I = 10 A일 때 r = 5, 10, 20 cm의 B를 비교해 보세요.'],
          explain: 'B = 2×10⁻⁷ I / r 이므로 <b>B ∝ 1/r</b>이에요. r가 2배가 되면 B는 <b>1/2배</b>가 돼요. 점전하의 전기장 E ∝ 1/r²과는 달라요 — 자기력선의 간격이 바깥으로 갈수록 (r에 비례해서) 넓어지는 그림으로 기억해요.',
        },
      ],
    },
    {
      title: '원형 전류: 중심의 B = μ₀NI/(2R)', short: '원형 전류', icon: '⭕', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 직선 전류의 B가 I에 비례하고 거리에 반비례한다는 것을 배웠어요. 이 직선 도선을 <b>고리 모양으로 구부리면</b> 자기장은 어떻게 될까요?</div>' +
        '<p>고리의 단면 그림에서 중심의 자기장은 <b>B = μ₀NI/(2R)</b>(N: 감은 수, μ₀ = 4π×10⁻⁷ T·m/A)이고 방향은 고리 면에 수직이에요. 오른손 손가락을 전류 방향으로 감아쥐면 엄지가 중심의 B 방향이에요. R, I, N을 바꾸며 B ∝ NI/R를 확인해요.</p>',
      features: ['loop'],
      setup() { S.gate = ''; Object.assign(S.l, { I: 3, R: 6, N: 1, dir: 1 }); numL.clear(); setScene('loop'); },
      recap: '원형 도선 중심의 자기장은 B = μ₀NI/(2R)로 N·I에 비례하고 R에 반비례해요. 고리는 한 면이 N극, 반대 면이 S극인 얇은 자석과 같아요.',
      summary: '<ul><li>원형 도선(N회 감음) 중심의 자기장: <b>B = μ₀NI/(2R)</b> ∝ NI/R. 예) N = 1, I = 5.0 A, R = 5.0 cm → <b>6.3×10⁻⁵ T</b>, R = 10 cm이면 3.1×10⁻⁵ T, N = 10회이면 6.3×10⁻⁴ T.</li><li>방향은 고리 면에 수직이고, 오른손 규칙으로 정해요(손가락 = 전류, 엄지 = 중심의 B).</li><li>고리는 한 면이 <b>N극</b>, 반대 면이 <b>S극</b>인 얇은 자석처럼 행동해요.</li><li>자기력선은 닫힌 곡선이라서, 고리 바깥쪽(같은 평면)의 자기장은 중심과 <b>반대 방향</b>이에요.</li></ul>',
      missions: [
        {
          title: '6.3×10⁻⁵ T 만들기',
          goal: '고리 중심의 자기장이 <b>6.3×10⁻⁵ T</b>가 되도록 R, I, N을 맞추세요. (오차 3 % 이내)',
          hint: 'B = μ₀NI/(2R)에서 N = 1, I = 5.0 A, R = 5.0 cm이면 6.3×10⁻⁵ T예요. NI/R 값이 같으면 다른 조합도 돼요.',
          setup() { S.gate = ''; Object.assign(S.l, { I: 3, R: 6, N: 1, dir: 1 }); setScene('loop'); },
          check: loopOK, hold: 0.8,
          status: () => mark(loopOK()) + ' B = ' + sci(Bloop(S.l.N, S.l.I, S.l.R)) + ' T (목표 6.3×10⁻⁵ T)',
          explain: 'B = 4π×10⁻⁷ × 1 × 5.0 / (2 × 0.050) = <b>6.3×10⁻⁵ T</b>예요. R이 절반이면 B가 2배, N이 3배이면 B도 3배 — 자기력선이 고리 안쪽에서 더 빽빽해지는 것으로도 볼 수 있어요.',
        },
        {
          title: '감은 수 효과 예측하기', manual: true,
          goal: '<b>I = 5.0 A, R = 5.0 cm</b>인 고리를 <b>N = 10번</b> 감으면 중심의 B는 얼마일까요? 계산해 입력하세요.',
          hint: '감은 수가 10배가 되면 B도 10배예요. N = 1일 때 6.3×10⁻⁵ T였어요.',
          setup() { S.gate = 'ml2'; Object.assign(S.l, { I: 5, R: 5, N: 3, dir: 1 }); numL.clear(); setScene('loop'); },
          check: () => checkNum(numL, 6.28e-4, 0.03, '다시 계산해 보세요. B = 4π×10⁻⁷ × 10 × 5.0 / (2 × 0.050) 이에요.'),
          status: () => 'N = 10일 때의 B는 가려 두었어요',
          explain: 'B = 4π×10⁻⁷ × 10 × 5.0 / (2 × 0.050) = <b>6.3×10⁻⁴ T</b>예요. 고리를 한 번 감을 때마다 전류가 한 번 더 중심 둘레를 돌기 때문에 B ∝ N이에요.',
        },
        {
          type: 'quiz', title: '고리 바깥쪽의 자기장 방향',
          goal: '고리와 <b>같은 평면</b>에서 고리 <b>바깥쪽</b> 한 점의 자기장 방향은 중심의 자기장과 어떤가요? (위쪽 나침반을 보세요)',
          setup() { S.gate = ''; Object.assign(S.l, { I: 5, R: 5, N: 1, dir: 1 }); setScene('loop'); },
          choices: ['중심과 반대 방향이에요', '중심과 같은 방향이에요', '자기장이 0이에요', '고리 둘레를 도는 원 모양이에요'],
          answer: 0,
          feedback: ['', '자기력선은 끊어지지 않는 닫힌 곡선이라서 고리 안쪽을 지난 선은 바깥쪽으로 되돌아 나와요. 바깥에서는 방향이 거꾸로예요.', '고리 바깥에도 자기장이 있어요(약해도 0은 아니에요). 위쪽 나침반 바늘이 움직이는 것을 보세요.', '그건 직선 도선의 모양이에요. 고리의 자기장은 고리 면을 수직으로 통과하는 선이에요.'],
          explain: '자기력선은 닫힌 곡선이라서 고리 안쪽에서 (N극 쪽으로) 나간 선이 바깥쪽을 돌아 되돌아와요. 그래서 같은 평면의 고리 <b>바깥쪽에서는 중심과 반대 방향</b>이에요.',
        },
      ],
    },
    {
      title: '솔레노이드: 균일한 내부 자기장', short: '솔레노이드', icon: '🧲', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 고리 하나는 얇은 자석이고 B ∝ NI/R이었어요. 이런 <b>고리를 길게 쌓으면</b> 어떤 자기장이 만들어질까요?</div>' +
        '<p>솔레노이드(원통형 코일) 내부에서는 자기력선이 <b>평행하게 모여 균일한 자기장 B = μ₀nI</b>(n: 단위 길이당 감은 수)가 되고, 바깥은 약해져요. 막대자석과 비슷한 모양이고 전류 방향에 따라 N극 위치가 바뀌어요. 🏭 철심을 넣은 전자석은 크레인·MRI·자기 부상 열차에 쓰여요.</p>',
      features: ['sol'],
      setup() { S.gate = ''; Object.assign(S.s, { n: 2000, I: 1.0, iron: false, dir: 1 }); polClear(); setScene('sol'); },
      recap: '솔레노이드 내부의 자기장은 B = μ₀nI로 균일하고 바깥은 약해요. 철심을 넣으면 자기장이 수백~수천 배 세져요.',
      summary: '<ul><li>솔레노이드 내부: <b>B = μ₀nI</b> (n = 단위 길이당 감은 수). 내부는 <b>균일</b>하고 외부는 약해서 막대자석과 같은 모양이에요. 예) n = 2000 회/m, I = 1.0 A → <b>2.5×10⁻³ T</b>, I = 2.0 A → 5.0×10⁻³ T.</li><li>오른손 규칙: 손가락 = 전류가 도는 방향, 엄지가 향하는 끝이 <b>N극</b>이에요. 전류 방향을 바꾸면 N극과 S극이 바뀌어요.</li><li>감은 수만 2배로 하면 B도 2배(B ∝ n). <b>철심</b>을 넣으면 내부 자기장이 수백~수천 배 세져요.</li><li>🏭 전자석: 쓰레기 처리장 크레인, MRI 장치(1.5~3 T), 자기 부상 열차.</li></ul>',
      missions: [
        {
          title: '5.0×10⁻³ T 만들기',
          goal: '철심 없이 솔레노이드 내부의 자기장이 <b>5.0×10⁻³ T</b>가 되도록 n과 I를 맞추세요. (오차 3 % 이내)',
          hint: 'B = μ₀nI. n = 2000 회/m이면 I = 2.0 A, n = 4000 회/m이면 I = 1.0 A예요. 철심은 빼 두어요.',
          setup() { S.gate = ''; Object.assign(S.s, { n: 2000, I: 1.0, iron: false, dir: 1 }); setScene('sol'); },
          check: solOK, hold: 0.8,
          status: () => mark(solOK()) + ' B = ' + (S.s.iron ? '철심 때문에 수백~수천 배' : sci(Bsol(S.s.n, S.s.I)) + ' T') + ' (목표 5.0×10⁻³ T)',
          explain: 'B = 4π×10⁻⁷ × 2000 × 2.0 = <b>5.0×10⁻³ T</b>예요. n이나 I가 2배가 되면 B도 2배가 되고, 그만큼 내부의 자기력선이 더 빽빽해져요.',
        },
        {
          title: 'N극 찾기', manual: true,
          goal: '그림에 보이는 전류 방향(위쪽 단면과 아래쪽 단면의 ⊙·⊗)에서 <b>N극</b>이 생기는 끝을 오른손 규칙으로 찾아 고르세요.',
          hint: '오른손 손가락을 전류가 도는 방향으로 감아쥐면 엄지가 향하는 끝이 N극이에요. 위쪽 단면에서 ⊗(들어감), 아래쪽 단면에서 ⊙(나옴)이면 전류는 위에서 아래로 앞면을 돌아요.',
          setup() { S.gate = 'sl2'; Object.assign(S.s, { n: 2000, I: 1.0, iron: false, dir: -1 }); polClear(); setScene('sol'); },
          check: () => {
            if (!polSt[0]) return 'N극이라고 생각하는 끝을 골라 주세요.';
            const ok = +polSt[0] - 1 === (S.s.dir > 0 ? 1 : 0); selMark(polSels[0], 0, ok, polOk);
            return ok ? true : '다시 생각해 보세요. 나침반의 붉은 바늘(N극)이 솔레노이드 안에서 향하는 쪽이 N극이 생기는 끝이에요.';
          },
          status: () => (polSt[0] ? '답을 골랐어요' : '아직 고르지 않았어요'),
          explain: '위쪽 단면이 ⊗, 아래쪽 단면이 ⊙이면 전류는 솔레노이드 앞면에서 아래→위로 흘러요. 오른손으로 감아쥐면 엄지가 <b>왼쪽</b>을 향해, 왼쪽 끝이 N극이에요. 내부 자기장은 S극에서 N극 쪽으로 나가는 방향이에요(나침반 붉은 바늘이 가리켜요).',
        },
        {
          type: 'quiz', title: '감은 수만 2배로 하면',
          goal: '솔레노이드의 길이와 전류는 그대로 두고 <b>감은 수만 2배</b>로 하면 내부 자기장은 어떻게 될까요?',
          setup() { S.gate = ''; Object.assign(S.s, { n: 2000, I: 1.0, iron: false, dir: 1 }); setScene('sol'); },
          choices: ['2배가 돼요', '1/2배가 돼요', '4배가 돼요', '변하지 않아요'],
          answer: 0,
          feedback: ['', '감은 선이 많아질수록 자기장은 세져요. n 슬라이더를 올려 선 밀도를 확인해 보세요.', '4배는 아니에요. B = μ₀nI에서 n에 비례(1차)해요. n이 2배면 B도 2배예요.', '길이가 같고 감은 수가 2배면 n(단위 길이당 감은 수)이 2배예요. 그러면 B도 달라져요.'],
          explain: '길이가 같고 감은 수가 2배이면 n이 2배이므로 B = μ₀nI도 <b>2배</b>예요. 솔레노이드 속에 <b>철심</b>을 넣으면 철이 자석처럼 자화되어 내부 자기장이 수백~수천 배로 세져요(그림에서 자기력선이 매우 빽빽해져요).',
        },
      ],
    },
    {
      title: '그림 해석: 자기력선에서 읽기', short: '그림 해석', icon: '🔍', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 직선·원형·솔레노이드의 자기장 방향(오른손 규칙)과 세기(I, r, N, n과의 관계)를 배웠어요. 이제 <b>이미 그려진 자기력선 그림</b>을 읽어 정보를 추리해요. (자기력선을 직접 그리는 방법은 다루지 않아요.)</div>' +
        '<p>네 장의 그림 — (가) 도선 한 개, (나) 두 도선, (다) 솔레노이드, (라) 알 수 없는 장치 — 에서 <b>전류의 방향</b>, <b>자기장의 세기 비교</b>, <b>N극의 위치</b>를 답해요. 선이 빽빽한 곳이 자기장이 센 곳이에요.</p>',
      features: ['fig'],
      setup() { S.gate = ''; resetFigs(); setScene('fig'); },
      recap: '자기력선의 방향은 오른손 규칙으로 전류 방향과 이어지고, 선이 빽빽할수록 B가 세요. 두 도선의 자기장은 벡터로 더해지고, 솔레노이드 내부는 균일해요.',
      summary: '<ul><li>그림에서 읽기: 선의 <b>화살표</b> → 자기장 방향(→ 오른손 규칙으로 전류 방향), 선의 <b>빽빽함</b> → B의 세기.</li><li>직선 도선 둘레의 동심원은 바깥으로 갈수록 간격이 넓어져요(B ∝ 1/r). 예) 거리가 2배인 점은 B가 1/2.</li><li>두 평행 도선: 전류가 <b>같은 방향</b>이면 한가운데에서 B가 서로 상쇄되어 0, <b>반대 방향</b>이면 더해져 센 자기장이 돼요.</li><li>솔레노이드 단면: 내부는 선이 평행하고 촘촘(균일), 외부는 성겨요. 선은 N극에서 나와 S극으로 들어가고, 자석 안에서는 S극에서 N극으로 이어지는 <b>닫힌 곡선</b>이에요.</li><li>전류 방향을 반대로 하면 선의 모양은 같고 화살표와 N·S극이 모두 반대가 돼요.</li></ul>',
      missions: [
        {
          title: '그림 4장 읽기', manual: true,
          goal: '그림 가·나·다·라를 차례로 보고 각 질문(모두 10문제)에 답한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '가: 화살표가 시계 방향이면 전류는 들어가는 방향(⊗)이고, 선이 두 배 성긴 곳은 B가 절반이에요. 나: 선이 비어 있는 한가운데가 B가 약한 곳이에요. 다: 나침반처럼 선의 방향이 나가는 끝이 N극이에요. 라: 둘러싼 선의 수가 많은 도선이 전류가 커요.',
          setup() { S.gate = ''; resetFigs(); setScene('fig'); },
          check: checkFigs,
          status: () => ['a', 'b', 'c', 'd'].map((k) => FIGS[k].name.replace('그림 ', '') + ' ' + fN(k) + '/' + FQ[k].length).join(' &nbsp; '),
          explain: '(가) 화살표가 시계 방향이므로 전류는 지면으로 들어가는 방향(⊗)이에요. 점 P는 점 Q보다 도선에 2배 가까워 선이 2배 촘촘하고 B_P : B_Q = 2 : 1이에요. (나) 반대 방향 전류(㉠)는 한가운데에서 서로 더해 B가 세고, 같은 방향 전류(㉡)는 한가운데에서 상쇄돼요. (다) 선이 나가는 끝이 N극이고 내부 B가 더 세요. (라) 도선 B가 가장 많은 선으로 둘러싸여 전류가 가장 크고, A와 D는 같은 크기예요.',
        },
        {
          type: 'quiz', title: '자기력선은 닫힌 곡선',
          goal: '자기력선이 <b>끊어지지 않는 닫힌 곡선</b>인 것은 자석 내부에서 어떻게 나타나나요?',
          setup() { S.gate = ''; S.f.fig = 'c'; setScene('fig'); },
          choices: ['자석 안에서도 S극에서 N극으로 이어져요', '자석 안에는 자기력선이 없어요', 'N극에서 나온 선은 S극에서 끝나요', '자기력선은 N극에서만 나와요'],
          answer: 0,
          feedback: ['', '솔레노이드 그림에서 내부의 선을 보세요. 안에서도 선이 지나가요. 내부 선이 바깥 선과 이어져 하나의 닫힌 곡선이 돼요.', '전기력선은 (+)에서 시작해 (−)에서 끝나지만, 자기력선은 시작도 끝도 없이 이어져요. 자석 안에서 S극에서 N극으로 이어져요.', '자기력선은 N극에서 나와 S극으로 들어간 다음 자석 안에서 S극에서 N극으로 이어지는 닫힌 곡선이에요.'],
          explain: '자기력선은 시작도 끝도 없이 <b>닫힌 곡선</b>이에요. 밖에서는 N극에서 나와 S극으로 들어가고, 자석(솔레노이드) 안에서는 S극에서 N극으로 이어져요. 전류 방향을 반대로 하면 선의 모양은 같고 화살표와 N·S극이 모두 반대가 돼요.',
        },
      ],
    },
  ];
  levels.forEach((lv) => lv.missions.forEach((m) => { MS[m.title] = m; }));
  function polClear() { resetSels(polSels, polSt, polOk); }

  game = SciSim.game({
    simId: 'hq-magnetic-field', mount: '#game', badge: '자기장 읽기 달인', homeHref: '../../index.html#hq',
    featureLabels: { wire: '🧭 직선 전류 · 나침반 · 센서', loop: '⭕ 원형 전류 · 중심의 B', sol: '🧲 솔레노이드 · 철심', fig: '🔍 자기력선 그림 4장' },
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
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    if (S.mode === 'wire') stepWire(dt); else if (S.mode === 'loop') stepLoop(dt); else if (S.mode === 'sol') stepSol(dt);
    sceneBg();
    T(14, 26, MODE_LABEL[S.mode] === undefined ? '' : { wire: '🧭 직선 도선 둘레의 자기장 (도선 단면 위에서 본 모습)', loop: '⭕ 원형 도선(고리)의 자기장 — 고리의 단면', sol: '🧲 솔레노이드의 자기장 — 단면', fig: '🔍 완성된 자기력선 그림 읽기' }[S.mode], PHONE ? 13 : 17, '#26324a', 'left', 800);
    if (S.mode === 'wire') drawWire(); else if (S.mode === 'loop') drawLoop(); else if (S.mode === 'sol') drawSolenoid(); else drawFigs();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SC, STP, IN, FIGS, FQ, fSels, fStore, numW, numL, polSels, polSt, MS, Bwire, Bloop, Bsol, tabCells, FCAP_L, SOL,
    get game() { return game; }, setScene, updateCtl, checkFigs, recordWire, solOK, loopOK, updateLoopLines, updateSolLines, ensureSolGrid,
    get FCAP_S() { return FCAP_S; },
    solSeeds, psiLoop,
  };

})();
