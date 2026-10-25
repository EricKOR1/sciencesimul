/* =========================================================
   전자기와 양자 Ⅱ. 빛과 정보 통신 - 광학 기기와 수차 (단원 3차시)
   성취기준 [12전자02-02] 렌즈와 거울을 이용한 광학 기기의 원리와 수차를 설명할 수 있다.
   ① 모형: 렌즈·거울 (평행광 광선 경로, 프리즘의 분산과 전반사, 세 광선 작도 → 렌즈 식으로 확인)
   ② 실험: 카메라 (렌즈 위치로 초점 맞추기, 조리개)
   ③ 모형: 망원경·현미경 (굴절식·반사식 망원경, 현미경, 쌍안경 프리즘)
   ④ 분석: 상이 흐려질 때 (가장자리 빛과 색에 따른 초점 차이 — 용어 없이 현상으로 다뤄요)
   광학 기기는 정성적 원리 위주예요. 렌즈 식은 작도 결과를 확인할 때 한 번만 써요.
   (색에 따른 굴절 차이는 보기 쉽게 실제보다 크게 그렸어요.)
   ========================================================= */
(function () {
  'use strict';
  const PH0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PH0 ? 480 : 800, VH = PH0 ? 584 : 560;
  const BG = '#eef2fa';
  /* ===== 공통 도우미 (모든 차시 공통) ===== */
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
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
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const supOf = (n) => String(n).split('').map((c) => SUP[c] || c).join('');
  // 과학적 표기: sci(5.55e14, 1) → "5.6×10¹⁴"
  function sci(x, d) {
    d = d == null ? 1 : d;
    if (!isFinite(x) || x === 0) return '0';
    let e = Math.floor(Math.log10(Math.abs(x))); let m = x / Math.pow(10, e);
    m = +m.toFixed(d); if (Math.abs(m) >= 10) { m /= 10; e += 1; }
    if (e === 0) return m.toFixed(d);
    return m.toFixed(d) + '×10' + supOf(e);
  }
  // 파장(nm) → 색 (가시광선 근사, 380 미만은 자외선=보라 회색, 780 초과는 적외선)
  function wlRGB(wl) {
    let r = 0, g = 0, b = 0;
    if (wl >= 380 && wl < 440) { r = -(wl - 440) / 60; b = 1; }
    else if (wl >= 440 && wl < 490) { g = (wl - 440) / 50; b = 1; }
    else if (wl >= 490 && wl < 510) { g = 1; b = -(wl - 510) / 20; }
    else if (wl >= 510 && wl < 580) { r = (wl - 510) / 70; g = 1; }
    else if (wl >= 580 && wl < 645) { r = 1; g = -(wl - 645) / 65; }
    else if (wl >= 645 && wl <= 780) { r = 1; }
    else if (wl < 380) { return [150, 120, 210]; }
    else { return [150, 60, 60]; }
    let f = 1;
    if (wl < 420) f = 0.35 + 0.65 * (wl - 380) / 40; else if (wl > 700) f = 0.35 + 0.65 * (780 - wl) / 80;
    const gm = 0.8;
    return [r, g, b].map((c) => Math.round(255 * Math.pow(Math.max(0, c) * f, gm)));
  }
  const wlColor = (wl) => { const c = wlRGB(wl); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); };
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(rand) { let u = 0; while (u === 0) u = rand(); const v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

  // 슬라이더(+조절 버튼) 연결: id 'sX' → 값 표시 'oX'. 반환 {set, refresh}
  function bindSlider(id, fmt, onInput) {
    const inp = $('#' + id), out = $('#o' + id.slice(1));
    const api = SciSim.bindRange(inp, out, fmt, (v) => { Sound.tick(); onInput && onInput(v); });
    $$('.nudge[data-for="' + id + '"]').forEach((b) => b.addEventListener('click', () => {
      const st = +inp.step || 1, d = +b.dataset.d;
      const v = clamp(Math.round(((+inp.value) + d * st) / st) * st, +inp.min, +inp.max);
      inp.value = v; api.refresh(); Sound.tick(); onInput && onInput(+inp.value);
    }));
    return api;
  }
  // 버튼 묶음(segmented/chips): data-v 값 선택. 반환 {set(v), get()}
  function bindSeg(id, onPick) {
    const root = $('#' + id); let cur = null;
    const set = (v) => { cur = String(v); $$('button', root).forEach((b) => b.classList.toggle('on', b.dataset.v === cur)); };
    $$('button', root).forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; Sound.click(); set(b.dataset.v); onPick && onPick(b.dataset.v); }));
    return { set, get: () => cur, root };
  }
  // 고르기 문장 묶음: rows = [{q, opts:[...], ans:index(0-based)}]  → 값은 vals[i] (''/'0'..)
  function mkSelRows(hostId, rows) {
    const host = $('#' + hostId); const sels = []; const vals = {}; const okS = {};
    rows.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + r.q + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', r.q.replace(/<[^>]+>/g, ''));
      sel.innerHTML = '<option value="">— 고르기 —</option>' + r.opts.map((o, j) => '<option value="' + j + '">' + o + '</option>').join('');
      sel.addEventListener('change', () => { vals[i] = sel.value; sel.classList.remove('ok', 'bad'); delete okS[i]; Sound.click(); });
      row.appendChild(sel); host.appendChild(row); sels.push(sel);
    });
    return {
      sels, vals,
      reset() { Object.keys(vals).forEach((k) => delete vals[k]); Object.keys(okS).forEach((k) => delete okS[k]); sels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); },
      count() { return rows.filter((r, i) => vals[i] !== undefined && vals[i] !== '').length; },
      grade(missMsg, badMsg) {
        const miss = rows.filter((r, i) => vals[i] === undefined || vals[i] === '').length;
        if (miss) return missMsg || ('아직 고르지 않은 문장이 ' + miss + '개 있어요.');
        let bad = 0;
        rows.forEach((r, i) => {
          const ok = +vals[i] === r.ans;
          if (!ok) bad++;
          if (!ok && okS[i] !== false) { sels[i].classList.remove('ok', 'bad'); void sels[i].offsetWidth; sels[i].classList.add('bad'); }
          if (ok) { sels[i].classList.remove('bad'); sels[i].classList.add('ok'); }
          okS[i] = ok;
        });
        return bad ? (badMsg || '빨간 칸을 다시 골라 보세요.') : true;
      },
    };
  }
  // 그래프 축 그리기: 반환 {X(v), Y(v), x, y, w, h}
  function axes(x, y, w, h, o) {
    const X = (v) => x + (v - o.xmin) / (o.xmax - o.xmin) * w;
    const Y = (v) => y + h - (v - o.ymin) / (o.ymax - o.ymin) * h;
    ctx.save();
    ctx.fillStyle = o.bg || '#fbfcff'; ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 1; ctx.strokeStyle = '#e3e8f2';
    (o.xt || []).forEach((t) => { ctx.beginPath(); ctx.moveTo(X(t[0]), y); ctx.lineTo(X(t[0]), y + h); ctx.stroke(); });
    (o.yt || []).forEach((t) => { ctx.beginPath(); ctx.moveTo(x, Y(t[0])); ctx.lineTo(x + w, Y(t[0])); ctx.stroke(); });
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.6; ctx.strokeRect(x, y, w, h);
    const fs = o.fs || 12;
    (o.xt || []).forEach((t) => T(X(t[0]), y + h + fs + 4, t[1], fs, '#5d6879', 'center', 700));
    (o.yt || []).forEach((t) => T(x - 6, Y(t[0]) + fs * 0.35, t[1], fs, '#5d6879', 'right', 700));
    if (o.xl) T(x + w / 2, y + h + fs * 2 + 10, o.xl, fs + 1, '#26324a', 'center', 800);
    if (o.yl) { ctx.save(); ctx.translate(x - (o.ylx || 40), y + h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, o.yl, fs + 1, '#26324a', 'center', 800); ctx.restore(); }
    ctx.restore();
    return { X, Y, x, y, w, h };
  }

  const rad = Math.PI / 180;

  /* ---------- 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const F_CM = 10;                       // 렌즈·거울의 초점거리 (cm)
  const N_GLASS = 1.52;                  // 프리즘 유리의 굴절률 (전반사 임계각 = 약 41°)
  const CRIT = Math.asin(1 / N_GLASS) / rad;   // 임계각 (도)
  const CAM_F = 50, CAM_DMAX = 25, CAM_DMIN = 6.25;   // 카메라: 렌즈 초점거리, 조리개 구멍의 큰 값·작은 값 (mm)
  const CAM_A = { far: Infinity, mid: 5000, near: 500 };   // 피사체까지의 거리 (mm)
  const C_OK = 0.05, BLUR_K = 50;        // 선명하다고 보는 번짐 지름 (mm), 사진 그림에서 번짐 지름 1 mm당 번짐 픽셀 수
  const F_O = 1000, F_E = 25, D_O = 50;  // 굴절 망원경: 대물·접안 초점거리, 대물 지름 (mm)
  const TUBE_OK = 3;                     // 초점이 맞는다고 보는 간격 오차 (mm)
  const M_TEL = F_O / F_E;               // 망원경 배율 = 40
  const MIC_F = 4, MIC_FE = 25;          // 현미경: 대물 초점거리, 접안 초점거리 (mm)
  const MIC_EYE = 10;                    // 접안렌즈 배율 (×10)
  const STAR_SEP = 0.4;                  // 두 별 사이의 각도 (분)
  const EYE_LIM = 0.7;                   // 눈이 한 점으로 번져 보이는 반지름 (분)
  const SPH_THRESH = 2.0;                // 구면 렌즈에서 점의 상이 선명하다고 보는 번짐 반지름 (그림 눈금)
  const CROWN = (l) => 1.4457 + 22170 / (l * l), FLINT = (l) => 1.4657 + 46670 / (l * l);   // 크라운·플린트 유리의 굴절률 (색 번짐을 크게 그렸어요)
  const LAM_B = 450, LAM_R = 650, LAM_G = 550;
  const F_SINGLE = PHONE ? 80 : 110;                 // 볼록렌즈 한 장의 초점거리 (550 nm, 그림 눈금)
  const C1 = 1 / (F_SINGLE * (CROWN(LAM_G) - 1));
  const DBL_K = (CROWN(LAM_B) - CROWN(LAM_R)) / (FLINT(LAM_B) - FLINT(LAM_R));
  const powAb = (el, l) => (el === 'single' ? C1 * (CROWN(l) - 1) : C1 * ((CROWN(l) - 1) - DBL_K * (FLINT(l) - 1)));   // 렌즈의 굴절 능력 (1/f)
  const wlHex = (l) => wlColor(l);

  /* ---------- 장면 배치 ---------- */
  const MA = PHONE ? { x: 8, y: 8, w: 464, h: 388 } : { x: 12, y: 12, w: 776, h: 414 };
  const BOT = PHONE ? { x: 8, y: 404, w: 464, h: 170 } : { x: 12, y: 436, w: 776, h: 112 };

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'parts', t: 0, fade: 0, dt: 0.016,
    show: { selK: false, numB: false, selC2: false, numM: false },
    pt: { view: 'box', part: 'convex', prism: 'disp', visited: {}, held: 0, _k: '', a: 30, ans: false, aD: 30 },
    cm: { subj: 'mid', b: 50.0, bs: new SciSim.Spring(50, { stiffness: 150, damping: 18 }), ap: 'big', apD: CAM_DMAX, f5: false, f05: false, fFar: false, hold: 0 },
    sc: { view: 'refr', tube: 1010, tubeD: 1010, mic: '40', micD: 40, seen: {}, held: 0, _k: '', ok: false, okHold: 0 },
    ab: { view: 'a', ap: 100, apD: 100, el: 'single', apOK: false, elOK: false, okH1: 0, okH2: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { parts: '🧰 렌즈·거울', camera: '📸 카메라', scope: '🔭 망원경·현미경', aber: '🌫️ 상이 흐려질 때' };
  const PART_NAME = { convex: '볼록렌즈', concave: '오목렌즈', cmirror: '오목거울', vmirror: '볼록거울', pmirror: '평면거울', prism: '프리즘' };

  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  const subOf = () => (S.mode === 'parts' ? S.pt.view : S.mode === 'scope' ? S.sc.view : S.mode === 'aber' ? S.ab.view : '');
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      const sub = n.getAttribute('data-sub');
      if (on && sub) on = sub === subOf();
      if (on && n.getAttribute('data-need') === 'prism') on = S.pt.part === 'prism';
      const dm = n.getAttribute('data-match');
      if (on && dm) on = !!S.show[dm];
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    p1Seg.set(S.pt.view); pkSeg.set(S.pt.part); prSeg.set(S.pt.prism); sbSeg.set(S.cm.subj); apSeg3.set(S.cm.ap);
    scSeg.set(S.sc.view); micSeg.set(S.sc.mic); abSeg.set(S.ab.view); elSeg.set(S.ab.el);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ---------- 컨트롤 연결 ---------- */
  const p1Seg = bindSeg('p1Seg', (v) => { S.pt.view = v; updateCtl(); });
  const pkSeg = bindSeg('pkSeg', (v) => { S.pt.part = v; updateCtl(); });
  const prSeg = bindSeg('prSeg', (v) => { S.pt.prism = v; S.pt.visited.prism_t = v === 'tir' ? true : S.pt.visited.prism_t; S.pt.visited.prism_d = v === 'disp' ? true : S.pt.visited.prism_d; updateCtl(); });
  const sbSeg = bindSeg('sbSeg', (v) => { S.cm.subj = v; updateCtl(); });
  const apSeg3 = bindSeg('apSeg3', (v) => { S.cm.ap = v; updateCtl(); });
  const scSeg = bindSeg('scSeg', (v) => { S.sc.view = v; updateCtl(); });
  const micSeg = bindSeg('micSeg', (v) => { S.sc.mic = v; updateCtl(); });
  const abSeg = bindSeg('abSeg', (v) => { S.ab.view = v; updateCtl(); });
  const elSeg = bindSeg('elSeg', (v) => { S.ab.el = v; updateCtl(); });
  const slA = bindSlider('sA', (v) => v + ' cm', (v) => { S.pt.a = +v; });
  const slB = bindSlider('sBc', (v) => (v / 10).toFixed(1) + ' mm', (v) => { S.cm.b = v / 10; });
  const slT = bindSlider('sTube', (v) => v + ' mm', (v) => { S.sc.tube = +v; });
  const slAp = bindSlider('sAp', (v) => v + ' %', (v) => { S.ab.ap = +v; });
  ['inB', 'inM1', 'inM2'].forEach((id) => $('#' + id).addEventListener('input', () => $('#' + id).classList.remove('ok', 'bad')));

  /* 부품 분류 (6개 문장, 고를 때마다 맞는지 바로 표시) */
  const KINDS = ['빛을 모아요 (수렴)', '빛을 퍼뜨려요 (발산)', '평행한 빛은 평행한 채 방향만 바꿔요'];
  const SEL_K = mkSelRows('selK', [
    { q: '🔍 <b>볼록렌즈</b>는', opts: KINDS, ans: 0 }, { q: '🔎 <b>오목렌즈</b>는', opts: KINDS, ans: 1 },
    { q: '🥄 <b>오목거울</b>은', opts: KINDS, ans: 0 }, { q: '🛣️ <b>볼록거울</b>은', opts: KINDS, ans: 1 },
    { q: '🪞 <b>평면거울</b>은', opts: KINDS, ans: 2 }, { q: '🔺 <b>프리즘</b>은 (평행한 빛은 평행한 채)', opts: KINDS, ans: 2 },
  ]);
  const SEL_K_ANS = [0, 1, 0, 1, 2, 2];
  const kOK = () => SEL_K.sels.filter((s, i) => s.value !== '' && +s.value === SEL_K_ANS[i]).length;
  SEL_K.sels.forEach((s, i) => s.addEventListener('change', () => { s.classList.remove('ok', 'bad'); if (s.value !== '') { if (+s.value === SEL_K_ANS[i]) s.classList.add('ok'); else { void s.offsetWidth; s.classList.add('bad'); } } }));
  const SEL_C2 = mkSelRows('selC2', [
    { q: '피사체가 가까워질수록 상이 맺히는 거리 b는', opts: ['길어져요', '짧아져요'], ans: 0 },
    { q: '그래서 가까운 물체를 찍으려면 렌즈를 센서에서', opts: ['멀리 해야 해요', '가까이 해야 해요'], ans: 0 },
    { q: '5 m 앞 피사체를 찍을 때 렌즈 ~ 센서 거리는', opts: ['50.0 mm', '50.5 mm', '55.6 mm'], ans: 1 },
    { q: '0.5 m 앞 피사체를 찍을 때는', opts: ['50.5 mm', '55.6 mm', '60.0 mm'], ans: 1 },
  ]);

  /* ---------- 광선 계산 도우미 (모두 같은 식을 그림과 판정에 써요) ---------- */
  // 다각형을 지나는 광선 추적 (스넬 법칙 + 전반사). poly: 꼭짓점 배열, nFn(λ): 굴절률. 화면 좌표 (y 아래쪽이 +)
  function tracePoly(px, py, dx, dy, polys, n, lenEnd) {
    let inside = false; const pts = [[px, py]];
    for (let it = 0; it < 12; it++) {
      let best = null;
      for (const poly of polys) for (let i = 0; i < poly.length; i++) {
        const A = poly[i], B = poly[(i + 1) % poly.length], ex = B[0] - A[0], ey = B[1] - A[1], den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-12) continue;
        const t = ((A[0] - px) * ey - (A[1] - py) * ex) / den, u = ((A[0] - px) * dy - (A[1] - py) * dx) / den;
        if (t > 1e-5 && u >= -1e-9 && u <= 1 + 1e-9 && (!best || t < best.t)) best = { t, nx: ey, ny: -ex };
      }
      if (!best) { pts.push([px + dx * lenEnd, py + dy * lenEnd]); break; }
      const hx = px + dx * best.t, hy = py + dy * best.t; pts.push([hx, hy]);
      const nl = Math.hypot(best.nx, best.ny); let nx = best.nx / nl, ny = best.ny / nl;
      if (nx * dx + ny * dy > 0) { nx = -nx; ny = -ny; }
      const ci = -(nx * dx + ny * dy), eta = inside ? n : 1 / n, s2 = eta * eta * (1 - ci * ci);
      if (s2 > 1) { dx = dx + 2 * ci * nx; dy = dy + 2 * ci * ny; }           // 전반사
      else { const ct = Math.sqrt(1 - s2); dx = eta * dx + (eta * ci - ct) * nx; dy = eta * dy + (eta * ci - ct) * ny; inside = !inside; }
      px = hx; py = hy; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
    }
    return pts;
  }
  const polyPath = (pts) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); };
  function lineTo2(pts, col, w, al) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha = al == null ? 1 : al; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; polyPath(pts); ctx.stroke(); ctx.restore(); }
  function lensShape(x, y, hh, wd, col) {      // 볼록렌즈 모양
    const g = ctx.createLinearGradient(x - wd, 0, x + wd, 0); g.addColorStop(0, 'rgba(190,225,255,.75)'); g.addColorStop(0.5, 'rgba(235,246,255,.9)'); g.addColorStop(1, 'rgba(170,210,250,.75)');
    ctx.save(); ctx.fillStyle = g; ctx.strokeStyle = col || '#5b8fd1'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - hh); ctx.quadraticCurveTo(x + wd * 2, y, x, y + hh); ctx.quadraticCurveTo(x - wd * 2, y, x, y - hh); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function concaveShape(x, y, hh, wd) {        // 오목렌즈 모양
    const g = ctx.createLinearGradient(x - wd, 0, x + wd, 0); g.addColorStop(0, 'rgba(190,225,255,.75)'); g.addColorStop(0.5, 'rgba(235,246,255,.9)'); g.addColorStop(1, 'rgba(170,210,250,.75)');
    ctx.save(); ctx.fillStyle = g; ctx.strokeStyle = '#5b8fd1'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - wd, y - hh); ctx.lineTo(x + wd, y - hh); ctx.quadraticCurveTo(x - wd * 0.2, y, x + wd, y + hh); ctx.lineTo(x - wd, y + hh); ctx.quadraticCurveTo(x + wd * 1.6, y, x - wd, y - hh); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  /* ================= ① 렌즈·거울 ================= */
  const PK = PHONE ? { px: 11.0, x0: MA.x + 150 } : { px: 14.0, x0: MA.x + 300 };   // 1 cm의 화면 길이, 부품의 위치
  function stepParts(dt) {
    const P = S.pt; P.aD = SciSim.approach(P.aD, P.a, dt, 14);
    if (S.mode === 'parts' && P.view === 'box') {
      const k = P.part + (P.part === 'prism' ? P.prism : '');
      P.held = P._k === k ? P.held + dt : 0; P._k = k;
      if (P.held > 0.6) P.visited[P.part] = true;
    }
  }
  function drawPartsBox() {
    const P = S.pt, PX = PK.px, yc = MA.y + (PHONE ? 196 : 206), xL = MA.x + 26, xR = MA.x + MA.w - 14, X0 = PK.x0;
    const hs = [-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6];
    const ray = '#f2a30b', rayVirt = 'rgba(120,130,150,.7)';
    T(MA.x + 14, MA.y + 22, '🧰 ' + PART_NAME[P.part] + (P.part === 'prism' ? ' — ' + (P.prism === 'disp' ? '빛의 분산' : '전반사') : '') + ': 평행한 빛을 비춰 봐요', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
    // 광축
    ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = '#c3cbdb'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xL, yc); ctx.lineTo(xR, yc); ctx.stroke(); ctx.restore();
    const flow = (S.t * 90) % 40;
    const raySeg = (pts, col, w) => lineTo2(pts, col || ray, w || 2.4);
    const arrowMark = (x, y, dx, dy) => D.arrow(x - dx * 8, y - dy * 8, x + dx * 6, y + dy * 6, { color: ray, width: 2.4, head: 8 });
    const pm = (cm) => Math.round(cm * PX);
    const half = 4.4 * PX;                         // 부품의 반쪽 높이
    if (P.part === 'convex' || P.part === 'concave') {
      const cv = P.part === 'convex';
      hs.forEach((h) => {
        const y = yc - h * PX;
        if (cv) { const tt = Math.min(3.4, (xR - X0 - 6) / (F_CM * PX)); raySeg([[xL, y], [X0, y], [X0 + tt * F_CM * PX, y + (yc - y) * tt]]); }
        else { raySeg([[xL, y], [X0, y], [xR, yc - (h * PX + h / F_CM * (xR - X0))]]); ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = rayVirt; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(X0, y); ctx.lineTo(X0 - F_CM * PX, yc); ctx.stroke(); ctx.restore(); }
      });
      if (cv) lensShape(X0, yc, half, 8); else concaveShape(X0, yc, half, 9);
      // 초점
      const fx = X0 + (cv ? 1 : -1) * F_CM * PX;
      D.sphere(fx, yc, 6, cv ? '#e8501b' : '#8a95a6', { gloss: false });
      D.label(fx, yc + 24, cv ? '초점 F (f = 10 cm)' : '허초점 F (f = 10 cm)', { size: PHONE ? 11.5 : 13, bg: cv ? '#e8501b' : '#6b7280' });
      if (!cv) T(X0 + 60, yc - half - 6, '퍼진 빛을 거꾸로 이으면 F에서 나온 것 같아요', PHONE ? 11 : 12.5, '#5d6879', 'left', 700);
    } else if (P.part === 'cmirror' || P.part === 'vmirror') {
      const cc = P.part === 'cmirror', Xm = MA.x + (PHONE ? 300 : 500);
      const sagOf = (yy) => (cc ? -1 : 1) * (yy * yy) / (4 * F_CM * PX);
      hs.forEach((h) => {
        const y = yc - h * PX, hx = Xm + sagOf(y - yc);
        const pts = [[xL, y], [hx, y]];
        if (cc) { // 반사한 빛은 초점 F를 지나요
          const F = [Xm - F_CM * PX, yc], dx = F[0] - hx, dy = F[1] - y, L = Math.hypot(dx, dy);
          pts.push([hx + dx / L * (L + 70 * (PHONE ? 0.6 : 1)), y + dy / L * (L + 70 * (PHONE ? 0.6 : 1))]);
        } else { // 볼록거울: 반사한 빛은 뒤쪽 초점 F에서 나온 것처럼 퍼져요
          const F = [Xm + F_CM * PX, yc], dx = hx - F[0], dy = y - F[1], L = Math.hypot(dx, dy);
          pts.push([hx + dx / L * 200, y + dy / L * 200]);
          ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = rayVirt; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx, y); ctx.lineTo(F[0], F[1]); ctx.stroke(); ctx.restore();
        }
        raySeg(pts);
      });
      // 거울 면
      ctx.save(); ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 5; ctx.beginPath();
      for (let yy = -half; yy <= half; yy += 3) { const px2 = Xm + sagOf(yy); if (yy === -half) ctx.moveTo(px2, yc + yy); else ctx.lineTo(px2, yc + yy); }
      ctx.stroke(); ctx.strokeStyle = '#e9f2ff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = 'rgba(100,110,130,.6)'; ctx.lineWidth = 3;
      for (let yy = -half; yy <= half; yy += 12) { const px2 = Xm + sagOf(yy); ctx.beginPath(); ctx.moveTo(px2, yc + yy); ctx.lineTo(px2 + 10, yc + yy + 6); ctx.stroke(); }
      ctx.restore();
      const fx = Xm + (cc ? -1 : 1) * F_CM * PX;
      D.sphere(fx, yc, 6, cc ? '#e8501b' : '#8a95a6', { gloss: false });
      D.label(fx, yc + (cc ? 24 : 24), cc ? '초점 F (f = 10 cm)' : '허초점 F (거울 뒤)', { size: PHONE ? 11.5 : 13, bg: cc ? '#e8501b' : '#6b7280' });
    } else if (P.part === 'pmirror') {
      const Xm = MA.x + (PHONE ? 240 : 420), Lm = 62 * (PHONE ? 0.7 : 1);
      ctx.save(); ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(Xm - Lm, yc + Lm); ctx.lineTo(Xm + Lm, yc - Lm); ctx.stroke(); ctx.strokeStyle = '#e9f2ff'; ctx.lineWidth = 2.6; ctx.stroke(); ctx.restore();
      hs.forEach((h) => {
        const y = yc - h * PX, t = yc - y, hx = Xm + t;     // 입사선과 거울(45°)의 교점
        if (Math.abs(t) > Lm) { raySeg([[xL, y], [Xm + 80, y]]); return; }
        raySeg([[xL, y], [hx, y], [hx, MA.y + 36]]);
      });
      D.label(Xm + Lm + 40, yc + Lm + 6, '평면거울 (45°로 세움)', { size: PHONE ? 11.5 : 13, bg: '#6b7280' });
      T(Xm - 26, MA.y + 56, '위로 꺾여도 평행해요', PHONE ? 11.5 : 13, '#5d6879', 'center', 800);
    } else {
      drawPrism(yc, xL, xR);
    }
    // 설명
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const msgs = {
      convex: ['볼록렌즈: 평행한 빛이 굴절해서 한 점(초점 F)에 모여요. 빛을 모으는 부품(수렴)이에요.', '카메라 렌즈, 돋보기, 망원경·현미경의 렌즈로 쓰여요.'],
      concave: ['오목렌즈: 평행한 빛이 퍼져 나가요. 퍼진 빛을 뒤로 이으면 한 점(허초점)에서 나온 것 같아요. 빛을 퍼뜨리는 부품(발산)이에요.', '근시 안경이 오목렌즈예요.'],
      cmirror: ['오목거울: 평행한 빛이 반사해서 초점 F에 모여요. 빛을 모으는 부품이에요.', '천체 망원경의 주경, 자동차 전조등 반사경으로 쓰여요.'],
      vmirror: ['볼록거울: 평행한 빛이 반사하며 퍼져요. 넓은 범위가 비쳐요.', '도로의 반사경, 자동차 오른쪽 거울로 쓰여요.'],
      pmirror: ['평면거울: 평행한 빛이 평행한 채 반사해요. 방향만 바꿔요. 반사의 법칙(입사각 = 반사각)을 따라요.', '망원경에서 빛의 방향을 돌릴 때 써요.'],
    };
    if (P.part === 'prism') {
      if (P.prism === 'disp') { msgs.prism = ['프리즘: 빛의 색마다 굴절하는 정도가 조금씩 달라서 흰빛이 여러 색으로 갈라져요(분산). 파란빛이 더 많이 꺾여요.', '(색의 차이를 실제보다 크게 그렸어요)']; }
      else msgs.prism = ['직각 프리즘: 빛이 빗면에 임계각(약 ' + Math.round(CRIT) + '°)보다 큰 45°로 입사해서 전반사해요. 빛이 직각으로 꺾여요.', '쌍안경 속 프리즘이 상을 바로 세우고 경통 길이를 줄여요.'];
    }
    const mm = msgs[P.part];
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, mm[0], PHONE ? 14 : 15, '#26324a', 21, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 100 : 74), BOT.w - 32, mm[1], PHONE ? 13 : 13.5, '#5d6879', 19, 700);
  }
  const prN = (l) => CROWN(l);
  function drawPrism(yc, xL, xR) {
    const P = S.pt;
    if (P.prism === 'disp') {
      const s = PHONE ? 90 : 130, cx = MA.x + (PHONE ? 150 : 290), top = [cx, yc - s * 0.5], bl = [cx - s / 2, yc + s * 0.37], br = [cx + s / 2, yc + s * 0.37];
      const poly = [top, bl, br];
      const lams = [420, 470, 532, 580, 610, 650], endX = MA.x + MA.w - (PHONE ? 40 : 60);
      const g = ctx.createLinearGradient(bl[0], 0, br[0], 0); g.addColorStop(0, 'rgba(200,230,255,.75)'); g.addColorStop(1, 'rgba(160,200,245,.7)');
      ctx.fillStyle = g; ctx.strokeStyle = '#5b8fd1'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(bl[0], bl[1]); ctx.lineTo(br[0], br[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
      const ca = Math.cos(20 * rad), sa = Math.sin(20 * rad), Mx = cx - s * 0.25, My = yc - s * 0.02;       // 왼쪽 면의 한 점으로 20° 위를 향해 입사
      const y0 = My + (Mx - xL) * sa / ca;
      // 흰빛 한 줄기 → 여러 색
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.globalAlpha = 0.9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(xL, y0); ctx.lineTo(Mx, My); ctx.stroke(); ctx.strokeStyle = '#f2a30b'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      const outs = [];
      lams.forEach((l) => {
        const pts = tracePoly(xL, y0, ca, -sa, [poly], prN(l), 1000);
        // 마지막 점은 스크린 위치(endX)에서 자르기
        const out = []; for (let i = 0; i < pts.length; i++) { out.push(pts[i]); if (i && pts[i][0] > endX) break; }
        const last = out[out.length - 1], pv = out[out.length - 2];
        if (last[0] > endX && pv) { const tt = (endX - pv[0]) / (last[0] - pv[0]); out[out.length - 1] = [endX, pv[1] + (last[1] - pv[1]) * tt]; }
        lineTo2(out, wlColor(l), 2.8, 0.95); outs.push(out[out.length - 1][1]);
      });
      ctx.fillStyle = '#10131c'; ctx.fillRect(endX, Math.min(...outs) - 30, 10, Math.max(...outs) - Math.min(...outs) + 60);
      lams.forEach((l, i) => { ctx.fillStyle = wlColor(l); ctx.fillRect(endX, outs[i] - 3, 10, 6); });
      T(endX + 5, Math.min(...outs) - 38, '스크린', 12, '#5d6879', 'center', 700);
      D.label(cx, top[1] - 16, '유리 프리즘', { size: 12.5, bg: '#5b8fd1' });
      T(xL + 6, y0 - 12, '흰빛', 13, '#26324a', 'left', 800);
    } else {
      const s = PHONE ? 100 : 140, x0 = MA.x + (PHONE ? 140 : 300), y0 = yc - s * 0.1;
      const poly = [[x0, y0], [x0 + s, y0], [x0, y0 - s]];     // 직각 꼭짓점 (x0, y0), 빗변은 오른쪽 위
      const g = ctx.createLinearGradient(x0, 0, x0 + s, 0); g.addColorStop(0, 'rgba(200,230,255,.8)'); g.addColorStop(1, 'rgba(160,200,245,.7)');
      ctx.fillStyle = g; ctx.strokeStyle = '#5b8fd1'; ctx.lineWidth = 2.4; ctx.beginPath(); poly.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill(); ctx.stroke();
      [-12, -4, 4, 12].forEach((dy) => {
        const yy = y0 - s * 0.35 + dy;
        const pts = tracePoly(xL, yy, 1, 0, [poly], N_GLASS, 130);
        lineTo2(pts, '#f2a30b', 2.6);
      });
      // 입사각 45° 표시
      const hx = x0 + s * 0.35, hy = y0 - s * 0.35;
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx - 40, hy - 0); ctx.lineTo(hx + 22, hy + 0); ctx.moveTo(hx - 25, hy + 25); ctx.lineTo(hx + 25, hy - 25); ctx.stroke(); ctx.restore();
      D.label(x0 + s * 0.8, y0 - s * 0.62, '45° > 임계각 ' + Math.round(CRIT) + '° → 전반사', { size: PHONE ? 11.5 : 13, bg: '#e8501b', align: 'left' });
      D.label(x0 + s * 0.35, y0 + 22, '유리 n = ' + N_GLASS.toFixed(2), { size: 12, bg: '#5b8fd1' });
    }
  }

  /* --- 상 작도 --- */
  const DRP = PHONE ? { px: 7.0, lx: MA.x + 298, yc: MA.y + 214 } : { px: 12.0, lx: MA.x + 520, yc: MA.y + 224 };
  const imgOf = (a) => { const b = a * F_CM / (a - F_CM); return { b, m: b / a }; };       // 렌즈 식으로 확인한 값 (작도 결과와 같아요)
  function drawPartsDraw() {
    const P = S.pt, PX = DRP.px, yc = DRP.yc, lx = DRP.lx, a = P.aD, h = 3;
    T(MA.x + 14, MA.y + 22, '✏️ 세 광선으로 상 찾기 (볼록렌즈 f = 10 cm)', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const X = (cm) => lx + cm * PX, Y = (cm) => yc - cm * PX;
    ctx.fillStyle = '#f7f9fd'; D.roundRect(MA.x + 8, MA.y + 34, MA.w - 16, PHONE ? 304 : 354, 12); ctx.fill();
    // 축과 눈금 (5 cm 간격)
    ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(MA.x + 12, yc); ctx.lineTo(MA.x + MA.w - 12, yc); ctx.stroke();
    for (let c = -40; c <= 24; c += 5) { const xx = X(c); if (xx < MA.x + 14 || xx > MA.x + MA.w - 14) continue; ctx.beginPath(); ctx.moveTo(xx, yc - 5); ctx.lineTo(xx, yc + 5); ctx.stroke(); T(xx, yc + 20, String(Math.abs(c)), 11.5, '#5d6879', 'center', 700); }
    T(MA.x + MA.w - 18, yc + 38, '거리 (cm)', 11.5, '#5d6879', 'right', 700);
    // 렌즈, 초점
    lensShape(lx, yc, 4.8 * PX, 8);
    [-F_CM, F_CM].forEach((c) => { D.sphere(X(c), yc, 5, '#e8501b', { gloss: false }); T(X(c), yc - 12, 'F', 13, '#e8501b', 'center', 800); });
    // 물체 (화살표)
    D.arrow(X(-a), yc, X(-a), Y(h), { color: '#2f6bff', width: 4, head: 11 });
    T(X(-a), yc + 36, '물체', 12.5, '#2f6bff', 'center', 800);
    // 세 광선
    const im = imgOf(a), yi = -h * im.b / a;     // 상 끝의 높이 (cm, 아래쪽이 −)
    const tip = [X(-a), Y(h)], img = [X(im.b), Y(yi)];
    const yth = -h * F_CM / (a - F_CM);          // 앞쪽 초점을 지난 광선이 렌즈에서 갖는 높이 (cm)
    const ext = Math.min(12, (MA.x + MA.w - 22 - X(im.b)) / PX), be = im.b + ext;
    const rays = [
      { pts: [tip, [lx, Y(h)], [X(be), Y(h + (yi - h) * be / im.b)]], c: '#e8501b', lab: '①' },
      { pts: [tip, [X(be), Y(yi * be / im.b)]], c: '#14a058', lab: '②' },
      { pts: [tip, [lx, Y(yth)], [X(be), Y(yth)]], c: '#8b5cf6', lab: '③' },
    ];
    rays.forEach((r) => lineTo2(r.pts, r.c, 2.4, 0.95));
    // 상 (실상)
    ctx.save(); ctx.setLineDash([]); D.arrow(X(im.b), yc, X(im.b), Y(yi), { color: '#14a058', width: 4, head: 11, alpha: P.ans ? 1 : 0.0 }); ctx.restore();
    if (P.ans) { D.sphere(img[0], img[1], 5, '#14a058', { gloss: false }); T(X(im.b), yc - 14, '상', 13, '#14a058', 'center', 800); }
    // 설명
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const rb = Math.round(im.b * 10) / 10;
    if (P.ans && Math.round(a) === 30) { textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, '작도로 구한 b = 15 cm를 렌즈 식으로 확인해요: 1/a + 1/b = 1/30 + 1/15 = 3/30 = 1/10 = 1/f ✓', PHONE ? 14 : 15, '#1c7a4a', 21, 800); }
    else textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, '세 광선: ① 광축에 평행하게 들어가 초점을 지나요 ② 렌즈 중심을 지나 직진해요 ③ 앞쪽 초점을 지나 들어가 광축에 평행하게 나가요.', PHONE ? 14 : 15, '#26324a', 21, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 112 : 78), BOT.w - 32, P.ans ? '물체가 가까워지면 상은 렌즈에서 더 멀어지고 커져요. 슬라이더로 a를 바꿔 보세요.' : '광선이 만나는 곳의 눈금을 읽어 렌즈에서 상까지의 거리 b를 구해요. (a = 30 cm로 맞춰 보세요)', PHONE ? 12.5 : 13.5, '#5d6879', 19, 700);
  }

  /* ================= ② 카메라 ================= */
  const CAMP = PHONE ? { sc: 3.2, xS: MA.x + 226, yc: MA.y + 104, photo: { x: MA.x + 10, y: MA.y + 240, w: 250, h: 142 } } : { sc: 5.6, xS: MA.x + 404, yc: MA.y + 196, photo: { x: MA.x + 432, y: MA.y + 12, w: 332, h: 252 } };
  const camB = (subj) => { const a = CAM_A[subj]; return isFinite(a) ? a * CAM_F / (a - CAM_F) : CAM_F; };   // 렌즈 식으로 구한 상이 맺히는 거리 (mm)
  function camState() {
    const C = S.cm, D1 = C.apD, bs = C.bs.value;
    const bSub = camB(C.subj), bBg = CAM_F;
    const cSub = D1 * Math.abs(bs - bSub) / bSub, cBg = D1 * Math.abs(bs - bBg) / bBg;
    return { D1, bs, bSub, cSub, cBg, sharpSub: cSub <= C_OK, sharpBg: cBg <= C_OK, bright: Math.pow(D1 / CAM_DMAX, 2) };
  }
  function stepCamera(dt) {
    const C = S.cm;
    if (!C.bs) C.bs = new SciSim.Spring(C.b, { stiffness: 150, damping: 18 });
    C.bs.target = C.b; C.bs.update(dt);
    C.apD = SciSim.approach(C.apD, C.ap === 'big' ? CAM_DMAX : CAM_DMIN, dt, 9);
    if (S.mode === 'camera') {
      const st = camState();
      const ok = st.sharpSub;
      C.hold = ok ? C.hold + dt : 0;
      if (C.hold > 0.4) { if (C.subj === 'mid') C.f5 = true; if (C.subj === 'near') C.f05 = true; if (C.subj === 'far') C.fFar = true; }
    }
  }
  // 사진 그림 (배경 + 피사체): 한 번 그려 두고 번짐에 따라 다시 그려요
  const PH = (() => {
    const mk = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
    const w = CAMP.photo.w, h = CAMP.photo.h;
    const bg = mk(w, h, (g) => {
      const sk = g.createLinearGradient(0, 0, 0, h * 0.7); sk.addColorStop(0, '#7bb8f2'); sk.addColorStop(1, '#d6ecff'); g.fillStyle = sk; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffe48a'; g.beginPath(); g.arc(w * 0.78, h * 0.2, h * 0.09, 0, TAU); g.fill();
      g.fillStyle = '#9db7d6'; g.beginPath(); g.moveTo(0, h * 0.62); g.lineTo(w * 0.2, h * 0.36); g.lineTo(w * 0.38, h * 0.55); g.lineTo(w * 0.55, h * 0.3); g.lineTo(w * 0.8, h * 0.58); g.lineTo(w, h * 0.45); g.lineTo(w, h * 0.7); g.lineTo(0, h * 0.7); g.fill();
      g.fillStyle = '#5aa05a'; g.fillRect(0, h * 0.68, w, h * 0.32);
      g.fillStyle = '#3f7d3f'; for (let i = 0; i < 14; i++) { g.fillRect(i * w / 14 + 4, h * 0.72 + (i % 3) * 8, 3, 14); }
      g.fillStyle = '#6a7f99'; g.fillRect(w * 0.1, h * 0.5, 6, 30); g.fillRect(w * 0.1 - 10, h * 0.5 - 6, 26, 8);
    });
    const flower = (g, cx, cy, s) => {
      g.strokeStyle = '#2e7d32'; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy + 70 * s); g.stroke();
      g.fillStyle = '#43a047'; g.beginPath(); g.ellipse(cx - 14 * s, cy + 48 * s, 14 * s, 6 * s, -0.5, 0, TAU); g.fill();
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.fillStyle = '#ff8fb1'; g.beginPath(); g.ellipse(cx + Math.cos(a) * 18 * s, cy + Math.sin(a) * 18 * s, 12 * s, 7 * s, a, 0, TAU); g.fill(); }
      g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(cx, cy, 11 * s, 0, TAU); g.fill();
      g.strokeStyle = '#b87f00'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, 11 * s, 0, TAU); g.stroke();
    };
    const mid = mk(w, h, (g) => flower(g, w * 0.5, h * 0.52, 0.9));
    const near = mk(w, h, (g) => flower(g, w * 0.5, h * 0.4, 2.1));
    return { bg, mid, near, w, h };
  })();
  const TMP = document.createElement('canvas'), TMP2 = document.createElement('canvas'); TMP.width = TMP2.width = 400; TMP.height = TMP2.height = 300;
  function drawBlurred(src, x, y, w, h, blurPx) {          // 줄였다가 두 단계로 키워서 흐리게 (캔버스 필터를 쓰지 않아요)
    if (blurPx <= 0.9) { ctx.drawImage(src, x, y, w, h); return; }
    const s = Math.min(14, 1 + blurPx * 0.9), tw = Math.max(2, Math.round(w / s)), th = Math.max(2, Math.round(h / s)), g = TMP.getContext('2d'), g2 = TMP2.getContext('2d');
    const mw = Math.max(tw + 1, Math.round(Math.sqrt(tw * w))), mh = Math.max(th + 1, Math.round(Math.sqrt(th * h)));
    g.clearRect(0, 0, 400, 300); g.imageSmoothingEnabled = true; g.drawImage(src, 0, 0, w, h, 0, 0, tw, th);
    g2.clearRect(0, 0, 400, 300); g2.imageSmoothingEnabled = true; g2.drawImage(TMP, 0, 0, tw, th, 0, 0, mw, mh);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(TMP2, 0, 0, mw, mh, x, y, w, h); ctx.restore();
  }
  function drawCamera() {
    const C = S.cm, st = camState(), K = CAMP, sc = K.sc, yc = K.yc;
    panel(MA.x, MA.y, MA.w, MA.h, 14);
    T(MA.x + 14, MA.y + 22, '📸 카메라 속 (렌즈와 센서를 확대한 그림)', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const lx = K.xS - st.bs * sc, half = st.D1 / 2 * sc, lensH = 13.5 * sc;
    // 피사체 아이콘과 들어오는 빛
    const objX = MA.x + (PHONE ? 22 : 24);
    T(objX + 8, yc + 6, C.subj === 'far' ? '🏔' : C.subj === 'mid' ? '🌸' : '🌼', PHONE ? 24 : 30, '#26324a', 'center', 700);
    T(objX + 8, yc + 38, C.subj === 'far' ? 'a = ∞' : C.subj === 'mid' ? 'a = 5 m' : 'a = 0.5 m', 12.5, '#26324a', 'center', 800);
    const aMm = CAM_A[C.subj];
    const bImg = st.bSub;
    // 광선: 광축 위의 한 점에서 오는 빛이 렌즈 구멍 가장자리를 지나 모여요
    [-1, 1].forEach((sg) => {
      const x1 = lx - 90 / 1, dxmm = 90 / sc, y1 = isFinite(aMm) ? sg * st.D1 / 2 * (1 - dxmm / aMm) : sg * st.D1 / 2;   // 렌즈 앞 90 px 지점의 광선 높이 (mm)
      const imgX = lx + bImg * sc, ex = K.xS + 16, tEnd = (ex - lx) / (bImg * sc), yEnd = sg * st.D1 / 2 * (1 - tEnd);
      lineTo2([[x1, yc - y1 * sc], [lx, yc - sg * st.D1 / 2 * sc], [ex, yc - yEnd * sc]], '#f2a30b', 2.2, 0.95);
    });
    // 조리개 가림판과 렌즈
    ctx.fillStyle = '#4a5568'; ctx.fillRect(lx - 3, yc - lensH - 8, 6, lensH + 8 - half); ctx.fillRect(lx - 3, yc + half, 6, lensH + 8 - half);
    lensShape(lx, yc, lensH, 9);
    T(lx, yc + lensH + 24, '렌즈', 12.5, '#26324a', 'center', 800);
    // 센서와 번진 점
    ctx.fillStyle = '#2d3646'; ctx.fillRect(K.xS, yc - 16 * sc, 8, 32 * sc);
    ctx.fillStyle = 'rgba(100,255,160,.35)'; ctx.fillRect(K.xS + 1, yc - 16 * sc, 3, 32 * sc);
    const cs = Math.max(1.5, st.cSub * sc);
    const sp = ctx.createRadialGradient(K.xS + 4, yc, 0, K.xS + 4, yc, cs / 2 + 1);
    sp.addColorStop(0, st.sharpSub ? 'rgba(255,230,120,1)' : 'rgba(255,230,120,.75)'); sp.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = sp; ctx.beginPath(); ctx.ellipse(K.xS + 4, yc, 5 + (st.sharpSub ? 0 : 2), cs / 2 + 1, 0, 0, TAU); ctx.fill();
    if (st.sharpSub) { D.sphere(K.xS + 4, yc, 4, '#ffd24a', { gloss: false }); }
    T(K.xS + 4, yc - 16 * sc - 10, '센서', 12.5, '#26324a', 'center', 800);
    // 거리 표시 b
    ctx.strokeStyle = '#26324a'; ctx.lineWidth = 1.6; const by = yc + lensH + (PHONE ? 34 : 54);
    ctx.beginPath(); ctx.moveTo(lx, by); ctx.lineTo(K.xS + 4, by); ctx.moveTo(lx, by - 5); ctx.lineTo(lx, by + 5); ctx.moveTo(K.xS + 4, by - 5); ctx.lineTo(K.xS + 4, by + 5); ctx.stroke();
    D.label((lx + K.xS + 4) / 2, by - 14, 'b = ' + st.bs.toFixed(1) + ' mm', { size: PHONE ? 12 : 13.5, bg: '#26324a' });
    // 구멍 크기
    D.label(lx, yc - lensH - 22, '조리개 구멍 ' + (Math.round(st.D1 * 10) / 10).toFixed(1) + ' mm', { size: PHONE ? 11.5 : 12.5, bg: C.ap === 'big' ? '#2f6bff' : '#8b5cf6' });
    // 상태 말풍선
    const ok = st.sharpSub;
    D.label(K.xS - (PHONE ? 100 : 100), by + (PHONE ? 24 : 26), ok ? '선명해요! 센서에 상이 맺혔어요' : '흐려요: 상이 센서 앞뒤에 맺혀요', { size: PHONE ? 12 : 13.5, bg: ok ? '#14a058' : '#e8501b' });
    // 사진
    const ph = K.photo;
    ctx.save(); D.roundRect(ph.x, ph.y, ph.w, ph.h, 10); ctx.clip();
    const bgBlur = st.cBg * BLUR_K, subBlur = st.cSub * BLUR_K;
    drawBlurred(PH.bg, ph.x, ph.y, ph.w, ph.h, bgBlur);
    if (C.subj !== 'far') drawBlurred(C.subj === 'mid' ? PH.mid : PH.near, ph.x, ph.y, ph.w, ph.h, subBlur);
    const dk = 1 - Math.pow(st.bright, 0.4545);
    ctx.fillStyle = 'rgba(0,0,0,' + dk.toFixed(3) + ')'; ctx.fillRect(ph.x, ph.y, ph.w, ph.h);
    ctx.restore();
    ctx.strokeStyle = '#6d7686'; ctx.lineWidth = 3; D.roundRect(ph.x, ph.y, ph.w, ph.h, 10); ctx.stroke();
    T(ph.x + 8, ph.y - 6, '찍힌 사진', 12.5, '#26324a', 'left', 800);
    {
      const ix = PHONE ? ph.x + ph.w + 12 : ph.x, iy = PHONE ? ph.y + 18 : ph.y + ph.h + 20, bw = PHONE ? 170 : 220;
      T(ix, iy + 4, '밝기 ' + Math.round(st.bright * 100) + ' %', PHONE ? 13 : 14, '#26324a', 'left', 800);
      ctx.fillStyle = '#e1e6f0'; D.roundRect(PHONE ? ix : ix + 90, PHONE ? iy + 12 : iy - 8, bw, 14, 7); ctx.fill(); ctx.fillStyle = '#f2a30b'; D.roundRect(PHONE ? ix : ix + 90, PHONE ? iy + 12 : iy - 8, Math.max(8, bw * st.bright), 14, 7); ctx.fill();
      T(ix, PHONE ? iy + 52 : iy + 32, '피사체 ' + (st.sharpSub ? '선명' : '흐림'), PHONE ? 13 : 13.5, st.sharpSub ? '#1c7a4a' : '#e8501b', 'left', 800);
      if (C.subj !== 'far') T(ix, PHONE ? iy + 74 : iy + 54, '배경 ' + (st.sharpBg ? '선명' : '흐림'), PHONE ? 13 : 13.5, st.sharpBg ? '#1c7a4a' : '#e8501b', 'left', 800);
    }
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const mm = ok ? (C.subj === 'far' ? '먼 풍경은 b = 초점거리(50 mm)에 상이 맺혀요.' : '센서에 상이 맺혔어요. 피사체가 가까울수록 렌즈를 센서에서 더 멀리 해야 해요.') : '렌즈 위치를 조절해 센서에 상이 맺히게 하세요. 슬라이더 옆 + − 버튼으로 0.1 mm씩 맞춰요.';
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, mm, PHONE ? 14 : 15, '#26324a', 21, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 90 : 62), BOT.w - 32, '조리개를 크게 하면 밝고 초점이 맞는 거리의 범위가 좁아져 배경이 흐려져요. 작게 하면 어둡지만 먼 곳까지 선명해요.', PHONE ? 13 : 13.5, '#5d6879', 19, 700);
  }

  /* ================= ③ 망원경 · 현미경 ================= */
  const SCP = PHONE ? { kx: 0.27, ky: 0.8, xo: MA.x + 22, yc: MA.y + 120 } : { kx: 0.40, ky: 1.2, xo: MA.x + 56, yc: MA.y + 214 };
  const tubeDev = () => Math.abs(S.sc.tubeD - (F_O + F_E));
  function scopeEye() {                                  // 눈에 보이는 별 두 개: 번진 정도와 간격 (화면 눈금)
    const dev = tubeDev(), s2 = 6, blobR = EYE_LIM * s2 + 3.0 * dev, sep = M_TEL * STAR_SEP * s2;
    return { dev, blobR, sep, resolved: sep >= 2.2 * blobR, focusOK: dev <= TUBE_OK };
  }
  function stepScope(dt) {
    const Q = S.sc; Q.tubeD = SciSim.approach(Q.tubeD, Q.tube, dt, 12); Q.micD = SciSim.approach(Q.micD, Q.mic === '40' ? 400 : 100, dt, 5);
    if (S.mode === 'scope') {
      Q.held = Q._k === Q.view ? Q.held + dt : 0; Q._k = Q.view;
      if (Q.held > 0.8) Q.seen[Q.view] = true;
      const e = scopeEye(); Q.okHold = (Q.view === 'refr' && e.focusOK && e.resolved) ? Q.okHold + dt : 0;
      if (Q.okHold > 0.5) Q.ok = true;
    }
  }
  const gCol = (a) => 'rgba(242,163,11,' + a + ')';
  function drawLensBarrel(x, y, hh, wd) { lensShape(x, y, hh, wd); }
  function drawScope() {
    panel(MA.x, MA.y, MA.w, MA.h, 14);
    const v = S.sc.view;
    if (v === 'refr') drawRefractor(); else if (v === 'refl') drawReflector(); else if (v === 'mic') drawMicroscope(); else drawBino();
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const msgs = {
      refr: ['굴절 망원경: 대물렌즈가 먼 별의 빛을 초점(f = 1000 mm)에 모아 작은 상을 만들고, 접안렌즈(f = 25 mm)가 그 상을 돋보기처럼 확대해요. 배율 = 대물 f / 접안 f = 40배, 상은 거꾸로 보여요.', '두 렌즈 사이의 간격이 f_대물 + f_접안 = 1025 mm일 때 초점이 맞아요.'],
      refl: ['반사 망원경: 오목한 주경이 빛을 모으고, 작은 평면거울이 빛을 옆의 접안렌즈로 돌려요. 거울은 색에 상관없이 반사해서 색 번짐이 없고, 큰 구경을 만들기 쉬워요.', '구경이 클수록 더 많은 빛을 모아서 어두운 천체도 볼 수 있어요.'],
      mic: ['현미경: 대물렌즈가 물체를 초점 바로 바깥에 두고 확대된 실상을 만들고, 접안렌즈가 그 상을 돋보기처럼 다시 확대해서(허상) 봐요.', '총배율 = 대물 배율 × 접안 배율 (그림의 세로 눈금은 늘려서 그렸어요).'],
      bino: ['쌍안경: 대물렌즈가 만든 거꾸로 선 상을 두 개의 직각 프리즘이 전반사로 두 번 꺾어 바로 세워요.', '빛이 지그재그로 지나가서 경통 길이가 짧아져요.'],
    };
    const mm = msgs[v];
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, mm[0], PHONE ? 13.5 : 14.5, '#26324a', PHONE ? 20 : 21, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 112 : 80), BOT.w - 32, mm[1], PHONE ? 12.5 : 13.5, '#5d6879', 18, 700);
  }
  function starBlob(cx, cy, r, col, a) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(2, r)); g.addColorStop(0, 'rgba(255,255,240,' + a + ')'); g.addColorStop(0.35, 'rgba(255,240,170,' + a * 0.6 + ')'); g.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, r), 0, TAU); ctx.fill();
  }
  function drawRefractor() {
    const K = SCP, Q = S.sc, kx = K.kx, ky = K.ky, yc = K.yc, L = Q.tubeD, xo = K.xo;
    const X = (mm) => xo + mm * kx, Y = (mm) => yc - mm * ky;
    T(MA.x + 14, MA.y + 22, '🔭 굴절 망원경 (두 별에서 온 빛의 경로)', PHONE ? 13 : 15, '#26324a', 'left', 800);
    // 경통
    const hO = D_O / 2 * ky + 8;
    ctx.fillStyle = '#c6cfdf'; ctx.fillRect(X(0), Y(0) - hO * 0.55, (L) * kx, hO * 1.1); ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 2; ctx.strokeRect(X(0), Y(0) - hO * 0.55, L * kx, hO * 1.1);
    ctx.fillStyle = '#e9eef8'; ctx.fillRect(X(0) + 1, Y(0) - hO * 0.55 + 1, L * kx - 2, hO * 1.1 - 2);
    // 광선: 별 A (축 위), 별 B (조금 비껴 있음: 각도는 크게 그렸어요)
    const beams = [{ m: 0, col: '#f2a30b' }, { m: -0.012, col: '#2f6bff' }];
    beams.forEach((bm) => {
      [-D_O / 2, 0, D_O / 2].forEach((y0) => {
        const pts = [[X(-150), Y(y0 - bm.m * 150)], [X(0), Y(y0)]];
        const m1 = bm.m - y0 / F_O, yL = y0 + m1 * L, m2 = m1 - yL / F_E;
        pts.push([X(L), Y(yL)]);
        const xe = L + 90 / kx * 0.4; pts.push([X(xe), Y(yL + m2 * (xe - L))]);
        lineTo2(pts, bm.col, 1.8, 0.95);
      });
    });
    // 중간 상 (초점면에서 거꾸로 선 두 점)
    [[0, '#f2a30b'], [-0.012 * F_O, '#2f6bff']].forEach((q) => { D.sphere(X(F_O), Y(q[0]), 3.5, q[1], { gloss: false }); });
    D.label(X(F_O), Y(0) - hO - 12, '초점면의 작은 상(거꾸로)', { size: PHONE ? 11 : 12.5, bg: '#26324a' });
    // 렌즈
    lensShape(X(0), Y(0), D_O / 2 * ky + 6, 6); T(X(0), Y(0) + D_O / 2 * ky + 28, '대물렌즈 f = 1000 mm', PHONE ? 11.5 : 12.5, '#26324a', 'left', 800, { });
    lensShape(X(L), Y(0), 12, 3.5); T(X(L), Y(0) + 40, '접안렌즈 f = 25 mm', PHONE ? 11 : 12.5, '#26324a', 'center', 800);
    // 눈
    D.sphere(X(L + 130), Y(0), 11, '#f3f6fc', { shadow: true, gloss: false }); D.sphere(X(L + 124), Y(0), 5, '#26324a', { gloss: false }); T(X(L + 130), Y(0) - 18, '눈', 12.5, '#26324a', 'center', 800);
    // 별 아이콘
    T(MA.x + 14, Y(0) - 16, '★ 별 A', 12.5, '#c98a00', 'left', 800); T(MA.x + 14, Y(0) + 22, '★ 별 B', 12.5, '#2f6bff', 'left', 800);
    T(MA.x + 14, Y(0) + 40, '(각도는 크게 그렸어요)', 11, '#7b8798', 'left', 700);
    // 눈에 보이는 모습 (두 칸)
    const e = scopeEye();
    const bx = PHONE ? MA.x + 8 : MA.x + 556, bw = PHONE ? 224 : 218, bh = PHONE ? 138 : 188, by1 = PHONE ? MA.y + 246 : MA.y + 12, by2 = PHONE ? MA.y + 246 : MA.y + 214;
    const bx2 = PHONE ? MA.x + 240 : bx;
    const box = (x, y, ttl, drawFn) => { ctx.fillStyle = '#0d1424'; D.roundRect(x, y, bw, bh, 12); ctx.fill(); T(x + 12, y + 20, ttl, PHONE ? 12 : 13.5, '#cfd8ee', 'left', 800); ctx.save(); D.roundRect(x, y, bw, bh, 12); ctx.clip(); drawFn(x + bw / 2, y + bh / 2 + 8); ctx.restore(); };
    box(bx, by1, '눈으로 직접 보면', (cx, cy) => { const s1 = PHONE ? 26 : 40; const sepPx = STAR_SEP * s1; starBlob(cx - sepPx / 2, cy, EYE_LIM * s1, '#fff', 0.9); starBlob(cx + sepPx / 2, cy, EYE_LIM * s1, '#fff', 0.9); T(cx, cy + bh / 2 - 14, '한 점으로 보여요', PHONE ? 12 : 13, '#ffd24a', 'center', 800); });
    const sc2 = PHONE ? 0.7 : 1;
    box(bx2, by2, '망원경으로 보면 (' + M_TEL + '배)', (cx, cy) => { const sepPx = e.sep * sc2, br = e.blobR * sc2; starBlob(cx - sepPx / 2, cy, br, '#fff', 0.95); starBlob(cx + sepPx / 2, cy, br, '#fff', 0.95); const lab = e.focusOK ? (e.resolved ? '두 점으로 보여요!' : '흐려요') : '초점이 안 맞아 흐려요'; T(cx, cy + bh / 2 - 14, lab, PHONE ? 12 : 13, e.focusOK && e.resolved ? '#7dffb0' : '#ff9d7a', 'center', 800); });
    D.label(X(L) + (PHONE ? 20 : 70), MA.y + 54, e.focusOK ? '초점이 맞아요' : '초점을 맞춰 보세요', { size: PHONE ? 12 : 13.5, bg: e.focusOK ? '#14a058' : '#e8501b' });
  }
  function drawReflector() {
    const kx = PHONE ? 0.28 : 0.42, yc = MA.y + (PHONE ? 200 : 250), xm = MA.x + (PHONE ? 380 : 500), Fp = 1000 * kx, D2 = 200;
    T(MA.x + 14, MA.y + 22, '🔭 반사 망원경 (뉴턴식)', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const sag = (y) => -(y * y) / (4 * Fp);                // 주경 면 (오목, 초점 Fp = 1000 mm)
    const xs = xm - 800 * kx;                              // 평면 보조 거울 위치 (초점에서 200 mm 앞)
    const hs = [-100, -70, 70, 100];
    const nrm = [1 / Math.SQRT2, -1 / Math.SQRT2];         // 보조 거울의 법선
    // 경통
    ctx.fillStyle = '#e9eef8'; ctx.fillRect(MA.x + 30, yc - D2 / 2 * kx - 6, xm - MA.x - 30, D2 * kx + 12); ctx.strokeStyle = '#8a95a6'; ctx.lineWidth = 2; ctx.strokeRect(MA.x + 30, yc - D2 / 2 * kx - 6, xm - MA.x - 30, D2 * kx + 12);
    hs.forEach((hmm) => {
      const y = yc - hmm * kx, hx = xm + sag(hmm * kx), F = [xm - Fp, yc];
      // 반사 → 초점 쪽, 보조 거울에서 위로 꺾임
      const dx = F[0] - hx, dy = F[1] - y, L0 = Math.hypot(dx, dy), ux = dx / L0, uy = dy / L0;
      // 보조 거울(점 (xs, yc)를 지나는 '\' 모양 직선)과의 교점
      const tt = ((xs - hx) + (y - yc)) / (ux - uy);              // 직선 x - xs = y - yc 와의 교점
      const px = hx + ux * tt, py = y + uy * tt;
      const dot = ux * nrm[0] + uy * nrm[1], rx = ux - 2 * dot * nrm[0], ry = uy - 2 * dot * nrm[1];
      lineTo2([[MA.x + 30, y], [hx, y], [px, py], [px + rx * 90, py + ry * 90]], '#f2a30b', 2, 0.95);
    });
    // 주경 면
    ctx.save(); ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 6; ctx.beginPath(); for (let yy = -D2 / 2 * kx; yy <= D2 / 2 * kx; yy += 2) { const x2 = xm + sag(yy); if (yy === -D2 / 2 * kx) ctx.moveTo(x2, yc + yy); else ctx.lineTo(x2, yc + yy); } ctx.stroke(); ctx.strokeStyle = '#e9f2ff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    T(xm - 30, yc + D2 / 2 * kx + 24, '오목 주경', 12.5, '#26324a', 'center', 800);
    // 보조 평면거울
    ctx.save(); ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(xs - 9, yc - 9); ctx.lineTo(xs + 9, yc + 9); ctx.stroke(); ctx.strokeStyle = '#e9f2ff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    T(xs, yc + 34, '평면거울', 12.5, '#26324a', 'center', 800);
    // 접안렌즈와 눈
    const fy = yc - (xs - (xm - Fp));                      // 꺾인 초점의 높이
    lensShape(xs, fy - 8, 11, 3.2); T(xs + 36, fy - 6, '접안렌즈', 12.5, '#26324a', 'left', 800);
    D.sphere(xs, fy - 40, 11, '#f3f6fc', { shadow: true, gloss: false }); D.sphere(xs, fy - 34, 5, '#26324a', { gloss: false }); T(xs + 24, fy - 38, '눈', 12.5, '#26324a', 'left', 800);
    D.sphere(xs, fy, 4, '#e8501b', { gloss: false });
    T(MA.x + 36, MA.y + 52, '별빛 →', 13, '#c98a00', 'left', 800);
    // 비교 카드
    const cx0 = PHONE ? MA.x + 10 : MA.x + 556, cy0 = PHONE ? MA.y + 252 : MA.y + 52, cw = PHONE ? MA.w - 20 : 210;
    ctx.fillStyle = '#f7f9fd'; D.roundRect(cx0, cy0, cw, PHONE ? 130 : 330, 12); ctx.fill();
    T(cx0 + 12, cy0 + 22, '모으는 빛의 양 (구경의 넓이)', PHONE ? 12.5 : 13.5, '#26324a', 'left', 800);
    const bar = (yy, lab, d, col) => { const area = d * d; const w0 = (PHONE ? 260 : 150) * area / (200 * 200); T(cx0 + 12, yy, lab, PHONE ? 12 : 12.5, '#5d6879', 'left', 800); ctx.fillStyle = col; D.roundRect(cx0 + 12, yy + 6, Math.max(6, w0), 14, 7); ctx.fill(); };
    bar(cy0 + 50, '굴절 망원경 (구경 50 mm)', 50, '#3d8ed2'); bar(cy0 + 88, '반사 망원경 (구경 200 mm)', 200, '#f26b3a');
    T(cx0 + 12, cy0 + 130, '→ 16배 더 많은 빛', PHONE ? 13 : 14, '#c4501b', 'left', 800);
    if (!PHONE) { textBlock(cx0 + 12, cy0 + 168, cw - 24, '거울은 색에 상관없이 같은 방향으로 반사해서 색 번짐이 없어요.', 13, '#26324a', 18, 800); textBlock(cx0 + 12, cy0 + 224, cw - 24, '큰 렌즈는 무겁고 가장자리만 받칠 수 있지만, 거울은 뒷면 전체를 받칠 수 있어서 크게 만들기 쉬워요.', 12.5, '#5d6879', 17, 700); }
  }
  const MICP = PHONE ? { kx: 1.45, x0: MA.x + 34, yc: MA.y + 140 } : { kx: 2.5, x0: MA.x + 56, yc: MA.y + 196 };
  function drawMicroscope() {
    const K = MICP, kx = K.kx, ky = kx * 5, yc = K.yc, x0 = K.x0, M = +S.sc.mic, f = MIC_F, a = f * (1 + 1 / M), b = f * (1 + M);
    const X = (mm) => x0 + mm * kx, Y = (mm) => yc - mm * ky, h = 0.2;
    T(MA.x + 14, MA.y + 22, '🔬 현미경 (세로 눈금을 늘려서 그렸어요)', PHONE ? 13 : 15, '#26324a', 'left', 800);
    ctx.setLineDash([6, 5]); ctx.strokeStyle = '#c3cbdb'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(MA.x + 12, yc); ctx.lineTo(MA.x + MA.w - 12, yc); ctx.stroke(); ctx.setLineDash([]);
    const xe = b + 0.8 * MIC_FE;                           // 접안렌즈 위치 (상이 접안렌즈의 초점 안쪽에 오도록)
    // 물체 (세포)
    D.arrow(X(-a), yc, X(-a), Y(h), { color: '#14a058', width: 3, head: 7 });
    const yi = -h * b / a;
    // 광선: ① 광축에 평행 ② 중심 ③ 앞쪽 초점을 지남 (두 렌즈 모두 얇은 렌즈로 계산)
    const rays = [{ y0: h, m0: 0 }, { y0: 0, m0: -h / a }, { y0: h * 0, m0: 0, special: true }];
    const drawR = (y0, m0, startX, col) => {      // y0: 렌즈 평면에서의 높이, m0: 입사 기울기
      const m1 = m0 - y0 / f, yE = y0 + m1 * xe, m2 = m1 - yE / MIC_FE;
      const ext = 70 / kx, pts = [[X(startX), Y(y0 + m0 * startX)], [X(0), Y(y0)], [X(xe), Y(yE)], [X(xe + ext), Y(yE + m2 * ext)]];
      lineTo2(pts, col, 1.8, 0.95);
      // 접안렌즈를 지난 빛을 거꾸로 이은 점선 (허상 방향)
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(120,130,150,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(xe), Y(yE)); ctx.lineTo(X(xe - 60 / kx), Y(yE - m2 * 60 / kx)); ctx.stroke(); ctx.restore();
    };
    [[1.4, '#e8501b'], [-1.4, '#2f6bff']].forEach(([yl, col]) => drawR(yl, (yl - h) / a, -a, col));   // 물체의 끝에서 렌즈 위쪽·아래쪽을 지나는 광선
    drawR(0, -h / a, -a, '#8b5cf6');               // 렌즈 중심을 지나는 광선
    // 실상
    D.arrow(X(b), yc, X(b), Y(yi), { color: '#14a058', width: 3, head: 7 });
    D.label(X(b), Y(yi) + (yi < 0 ? 24 : -24), '확대된 실상 (' + M + '배)', { size: PHONE ? 11 : 12.5, bg: '#14a058' });
    // 렌즈
    lensShape(X(0), yc, 24, 4); T(X(0), yc + 44, '대물렌즈', PHONE ? 11.5 : 12.5, '#26324a', 'center', 800);
    lensShape(X(xe), yc, 22, 6); T(X(xe), yc + 44, '접안렌즈', PHONE ? 11.5 : 12.5, '#26324a', 'center', 800);
    T(X(-a) - 4, yc - 30, '세포', 12.5, '#14a058', 'right', 800);
    D.sphere(X(xe + 96 / kx), yc, 11, '#f3f6fc', { shadow: true, gloss: false }); D.sphere(X(xe + 90 / kx), yc, 5, '#26324a', { gloss: false }); T(X(xe + 96 / kx), yc + 30, '눈', 12.5, '#26324a', 'center', 800);
    // 시야의 세포 (배율에 따라 커져요)
    const fx = PHONE ? MA.x + 120 : MA.x + 668, fy2 = PHONE ? MA.y + 306 : MA.y + 326, fr = PHONE ? 60 : 72, s = S.sc.micD / 100;
    ctx.save(); ctx.beginPath(); ctx.arc(fx, fy2, fr, 0, TAU); ctx.clip();
    ctx.fillStyle = '#f4f8ff'; ctx.fillRect(fx - fr, fy2 - fr, fr * 2, fr * 2);
    const cr = (PHONE ? 10 : 12) * s;
    for (const [dx, dy, ss] of [[0, 0, 1], [3.2, -1.2, 0.8], [-3.0, 1.6, 0.9]]) {
      const cx2 = fx + dx * cr * 0.9, cy2 = fy2 + dy * cr * 0.9, rr = cr * ss;
      ctx.fillStyle = 'rgba(120,200,150,.55)'; ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = Math.max(1.5, rr * 0.06); ctx.beginPath(); ctx.arc(cx2, cy2, rr, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7a4cc2'; ctx.beginPath(); ctx.arc(cx2 + rr * 0.15, cy2 - rr * 0.1, rr * 0.34, 0, TAU); ctx.fill();
      if (rr > 18) { ctx.fillStyle = '#f2a30b'; for (let i = 0; i < 5; i++) { const an = i / 5 * TAU + 0.5; ctx.beginPath(); ctx.arc(cx2 + Math.cos(an) * rr * 0.62, cy2 + Math.sin(an) * rr * 0.62, rr * 0.08, 0, TAU); ctx.fill(); } }
    }
    ctx.restore(); ctx.strokeStyle = '#6d7686'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(fx, fy2, fr, 0, TAU); ctx.stroke();
    T(fx, fy2 - fr - 10, '눈에 보이는 시야', PHONE ? 12 : 13, '#26324a', 'center', 800);
    D.label(PHONE ? MA.x + 330 : MA.x + 668, fy2 + (PHONE ? 6 : fr + 20), '대물 ×' + M + ' × 접안 ×' + MIC_EYE + ' = ' + (M * MIC_EYE) + '배', { size: PHONE ? 12 : 14, bg: '#8b5cf6' });
  }
  function drawBino() {
    const s = PHONE ? 78 : 104, xA = MA.x + (PHONE ? 190 : 330), yA = MA.y + (PHONE ? 104 : 150), xB = xA, yB = yA + 16;
    T(MA.x + 14, MA.y + 22, '🔭 쌍안경 속 프리즘 (한쪽 경통)', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const pA = [[xA, yA], [xA + s, yA], [xA, yA - s]], pB = [[xB, yB], [xB + s, yB], [xB, yB + s]];
    const gr = ctx.createLinearGradient(xA, 0, xA + s, 0); gr.addColorStop(0, 'rgba(200,230,255,.85)'); gr.addColorStop(1, 'rgba(160,200,245,.75)');
    [pA, pB].forEach((p) => { ctx.fillStyle = gr; ctx.strokeStyle = '#5b8fd1'; ctx.lineWidth = 2.4; ctx.beginPath(); p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    const xl = MA.x + (PHONE ? 62 : 120);
    const cols = ['#e8501b', '#14a058', '#2f6bff'], names = ['위쪽 광선', '가운데', '아래쪽 광선'];
    const offs = [-15, 0, 15], ys = offs.map((o) => yA - s * 0.5 + o);
    const outs = [];
    ys.forEach((yy, i) => {
      const pts = tracePoly(xl + 14, yy, 1, 0, [pA, pB], N_GLASS, 220);
      lineTo2(pts, cols[i], 2.6, 0.95); outs.push([pts[pts.length - 1], pts[pts.length - 2]]);
    });
    // 대물렌즈와 접안렌즈
    lensShape(xl, yA - s * 0.5, 38, 6); T(xl, yA - s * 0.5 - 50, '대물렌즈', PHONE ? 11.5 : 12.5, '#26324a', 'center', 800);
    lensShape(MA.x + (PHONE ? 62 : 120) - 0, yB + s * 0.55, 26, 5); T(xl, yB + s * 0.55 + 42, '접안렌즈', PHONE ? 11.5 : 12.5, '#26324a', 'center', 800);
    D.label(xA + s * 0.78, yA - s * 0.96, '전반사 ①', { size: 12, bg: '#e8501b' }); D.label(xB + s * 0.78, yB + s * 0.92, '전반사 ②', { size: 12, bg: '#e8501b' });
    // 상의 방향 (세 단계)
    const bx = PHONE ? MA.x + 14 : MA.x + 520, by = PHONE ? MA.y + 268 : MA.y + 60;
    const steps = [['물체', true], ['대물렌즈 뒤', false], ['프리즘 뒤', true]];
    steps.forEach((st, i) => {
      const cx2 = bx + (PHONE ? 40 + i * 150 : 54), cy2 = by + (PHONE ? 50 : 40 + i * 104);
      ctx.fillStyle = '#f7f9fd'; D.roundRect(cx2 - 42, cy2 - 44, 130, PHONE ? 100 : 92, 12); ctx.fill();
      T(cx2 + 23, cy2 - 26, st[0], PHONE ? 12 : 13, '#26324a', 'center', 800);
      D.arrow(cx2 + 23, st[1] ? cy2 + 30 : cy2 - 14, cx2 + 23, st[1] ? cy2 - 8 : cy2 + 34, { color: st[1] ? '#14a058' : '#e8501b', width: 5, head: 12 });
      T(cx2 + 23, cy2 + 52, st[1] ? '바로 서 있어요' : '거꾸로 서 있어요', PHONE ? 11.5 : 12.5, st[1] ? '#1c7a4a' : '#e8501b', 'center', 800);
    });
    T(MA.x + 14, MA.y + 48, '빛 →', 13, '#c98a00', 'left', 800);
    D.label(xA + s + 6, yB + s * 0.52, '← 되돌아와요', { size: 12, bg: '#4a5568', align: 'left' });
    if (!PHONE) T(xA + s * 0.5, yB + s + 34, '두 번의 전반사로 상이 뒤집히고, 경통이 짧아져요', 13, '#26324a', 'center', 800);
  }

  /* ================= ④ 상이 흐려질 때 ================= */
  const SPH = { R: 100, H: 42, N: CROWN(LAM_G) };
  SPH.t = SPH.R - Math.sqrt(SPH.R * SPH.R - SPH.H * SPH.H);          // 렌즈 가운데 두께의 반쪽 (가장자리에서 두 구면이 만나요)
  function lensPoly() {                                              // 그림에 쓰는 렌즈 모양 (두 구면의 일부)
    const R = SPH.R, pts = [], N = 40;
    for (let i = 0; i <= N; i++) { const y = -SPH.H + 2 * SPH.H * i / N; pts.push([-SPH.t + R - Math.sqrt(R * R - y * y), y]); }
    for (let i = N; i >= 0; i--) { const y = -SPH.H + 2 * SPH.H * i / N; pts.push([SPH.t - R + Math.sqrt(R * R - y * y), y]); }
    return pts;
  }
  const LP = lensPoly();
  function sphRefract(d, nrm, n1, n2) {                              // nrm: 광선과 마주 보는 단위 법선, 반환: 새 방향 (또는 전반사면 null)
    const ci = -(nrm[0] * d[0] + nrm[1] * d[1]), eta = n1 / n2, s2 = eta * eta * (1 - ci * ci);
    if (s2 > 1) return null;
    const ct = Math.sqrt(1 - s2); return [eta * d[0] + (eta * ci - ct) * nrm[0], eta * d[1] + (eta * ci - ct) * nrm[1]];
  }
  function sphRay(h) {                                               // 높이 h에서 광축과 평행하게 들어오는 광선을 두 구면에서 실제로 굴절시켜 따라가요 (렌즈 좌표, y는 아래쪽이 +)
    const R = SPH.R, t0 = SPH.t, n = SPH.N, C1 = [-t0 + R, 0], C2 = [t0 - R, 0];
    const root = (P, d, C, far) => { const ox = P[0] - C[0], oy = P[1] - C[1], b = ox * d[0] + oy * d[1], c = ox * ox + oy * oy - R * R, disc = b * b - c; if (disc < 0) return null; const sq = Math.sqrt(disc); return far ? -b + sq : -b - sq; };
    let P = [-200, h], d = [1, 0];
    const k1 = root(P, d, C1, false); if (k1 == null) return [P, [600, h]];
    const H1 = [P[0] + d[0] * k1, P[1] + d[1] * k1], N1 = [(H1[0] - C1[0]) / R, (H1[1] - C1[1]) / R];
    const d1 = sphRefract(d, N1, 1, n); if (!d1) return [P, H1];
    const k2 = root(H1, d1, C2, true); if (k2 == null) return [P, H1];
    const H2 = [H1[0] + d1[0] * k2, H1[1] + d1[1] * k2], N2 = [-(H2[0] - C2[0]) / R, -(H2[1] - C2[1]) / R];
    const d2 = sphRefract(d1, N2, n, 1); if (!d2) return [P, H1, H2];
    return [P, H1, H2, [H2[0] + d2[0] * 800, H2[1] + d2[1] * 800]];
  }
  function crossAxis(pts) { const a = pts[pts.length - 2], b = pts[pts.length - 1]; if (Math.abs(b[1] - a[1]) < 1e-9) return null; const t = -a[1] / (b[1] - a[1]); return a[0] + (b[0] - a[0]) * t; }
  const SPH_FP = (() => { const p = sphRay(1.5); return crossAxis(p); })();     // 광축 근처 빛이 모이는 곳 (스크린 위치)
  const sphSpread = (hAp) => {                           // 조리개 hAp(눈금)까지 쓸 때, 스크린(광축 근처 초점)에서의 번짐 반지름
    let mx = 0; for (let i = 0; i <= 8; i++) { const h = hAp * i / 8, p = sphRay(h), a = p[p.length - 2], b = p[p.length - 1], t = (SPH_FP - a[0]) / (b[0] - a[0]); mx = Math.max(mx, Math.abs(a[1] + (b[1] - a[1]) * t)); }
    return mx;
  };
  const SPH_APS = []; for (let ap = 25; ap <= 100; ap++) SPH_APS.push(sphSpread(SPH.H * ap / 100));
  const spreadOf = (ap) => SPH_APS[clamp(Math.round(ap), 25, 100) - 25];
  function abState() {
    const A = S.ab, lensEl = A.el, fb = 1 / powAb(lensEl === 'mirror' ? 'single' : lensEl, LAM_B), fr = 1 / powAb(lensEl === 'mirror' ? 'single' : lensEl, LAM_R);
    return { sp: spreadOf(A.ap), spOK: spreadOf(A.ap) <= SPH_THRESH, fb: lensEl === 'mirror' ? 100 : fb, fr: lensEl === 'mirror' ? 100 : fr };
  }
  function stepAber(dt) {
    const A = S.ab; A.apD = SciSim.approach(A.apD, A.ap, dt, 12);
    if (S.mode === 'aber') {
      const st = abState();
      A.okH1 = (A.view === 'a' && st.spOK) ? A.okH1 + dt : 0; if (A.okH1 > 0.5) A.apOK = true;
      A.okH2 = (A.view === 'b' && A.el === 'doublet' && Math.abs(st.fb - st.fr) <= 0.6) ? A.okH2 + dt : 0; if (A.okH2 > 0.5) A.elOK = true;
    }
  }
  function drawAber() {
    panel(MA.x, MA.y, MA.w, MA.h, 14);
    if (S.ab.view === 'a') drawAberA(); else drawAberB();
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    const st = abState(), A = S.ab;
    let m1, m2;
    if (A.view === 'a') {
      m1 = st.spOK ? '렌즈 한가운데 부분만 쓰니 빛이 거의 한 점에 모여 상이 선명해요. 대신 들어오는 빛의 양이 줄어 어두워져요.' : '렌즈 가장자리를 지난 빛은 한가운데를 지난 빛보다 렌즈에 더 가까운 곳에 모여서 점이 번져요. 상이 흐려져요.';
      m2 = '조리개로 가장자리 빛을 가리면 선명해지고 어두워져요. 카메라 렌즈를 여러 장 조합하거나 렌즈 면을 특수하게 연마해서도 줄여요.';
    } else {
      m1 = A.el === 'single' ? '렌즈는 빛의 색에 따라 굴절하는 정도가 조금씩 달라서 파란빛이 빨간빛보다 렌즈에 더 가까운 곳에 모여요. 그래서 상의 가장자리에 색이 번져요.' : A.el === 'doublet' ? '볼록렌즈와 오목렌즈를 붙이면 파랑과 빨강이 같은 곳에 모여서 색 번짐이 사라져요.' : '거울은 빛의 색과 상관없이 같은 방향으로 반사해서 색 번짐이 없어요.';
      m2 = '(색에 따른 차이를 실제보다 크게 그렸어요.) 간단한 렌즈 한 장으로 찍는 장난감 카메라는 가장자리가 흐리고 색이 번져요.';
    }
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, m1, PHONE ? 14 : 15, '#26324a', 21, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 112 : 80), BOT.w - 32, m2, PHONE ? 12.5 : 13.5, '#5d6879', 18, 700);
  }
  function drawAberA() {
    const A = S.ab, hAp = SPH.H * A.apD / 100, lx = MA.x + (PHONE ? 130 : 200), yc = MA.y + (PHONE ? 140 : 200), xL = MA.x + 16, xR = MA.x + (PHONE ? 330 : 520);
    const st = abState();
    T(MA.x + 14, MA.y + 22, '🌫️ 렌즈 한 장: 가장자리 빛은 어디로 모일까?', PHONE ? 13 : 15, '#26324a', 'left', 800);
    const sc = PHONE ? 1.1 : 1.7, X = (x) => lx + x * sc, Y = (y) => yc + y * sc;
    ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = '#c3cbdb'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xL, yc); ctx.lineTo(xR, yc); ctx.stroke(); ctx.restore();
    // 렌즈
    ctx.fillStyle = 'rgba(190,225,255,.7)'; ctx.strokeStyle = '#5b8fd1'; ctx.lineWidth = 2; ctx.beginPath(); LP.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1])))); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 광선 (조리개 밖은 가림판에서 막혀요)
    const hs = []; for (let i = -5; i <= 5; i++) hs.push(i / 5 * SPH.H * 0.95);
    hs.forEach((h) => {
      const blocked = Math.abs(h) > hAp;
      if (blocked) { lineTo2([[xL, Y(h)], [X(-34), Y(h)]], '#aab3c3', 1.6, 0.8); return; }
      const p = sphRay(h), pts = p.map((q) => [X(q[0]), Y(q[1])]);
      const lastP = pts[pts.length - 1], prev = pts[pts.length - 2];
      const tt = Math.min(1, (xR - prev[0]) / (lastP[0] - prev[0])); pts[pts.length - 1] = [prev[0] + (lastP[0] - prev[0]) * tt, prev[1] + (lastP[1] - prev[1]) * tt];
      pts[0] = [xL, Y(h)];
      const mid = Math.abs(h) < SPH.H * 0.35;
      lineTo2(pts, mid ? '#14a058' : '#e8501b', 2, 0.95);
    });
    // 조리개 가림판
    ctx.fillStyle = '#4a5568'; ctx.fillRect(X(-34), Y(-SPH.H * 1.15), 6, (SPH.H * 1.15 - hAp) * sc); ctx.fillRect(X(-34), Y(hAp), 6, (SPH.H * 1.15 - hAp) * sc);
    // 스크린과 초점 표시
    const sx = X(SPH_FP);
    ctx.fillStyle = '#2d3646'; ctx.fillRect(sx - 3, Y(-SPH.H * 0.6), 6, SPH.H * 1.2 * sc);
    D.sphere(sx, yc, 4.5, '#14a058', { gloss: false });
    const pM = sphRay(SPH.H * 0.95), xm = crossAxis(pM);
    if (xm && xm < SPH_FP - 2) { D.sphere(X(xm), yc, 4.5, '#e8501b', { gloss: false }); D.label(X(xm) - 6, yc + SPH.H * sc * 0.55, '가장자리 빛은 여기에 모여요', { size: PHONE ? 11 : 12.5, bg: '#e8501b' }); }
    D.label(sx - 6, yc - SPH.H * sc - 18, '가운데 빛은 여기 (스크린)', { size: PHONE ? 11 : 12.5, bg: '#14a058' });
    // 상 (점광원의 모습)
    const ix = PHONE ? MA.x + 350 : MA.x + 566, iy = PHONE ? MA.y + 100 : MA.y + 100, ir = PHONE ? 54 : 74;
    ctx.fillStyle = '#0d1424'; ctx.beginPath(); ctx.arc(ix, iy + 30, ir, 0, TAU); ctx.fill();
    const rpx = Math.max(1.2, st.sp * (PHONE ? 5 : 7));
    const gl = ctx.createRadialGradient(ix, iy + 30, 0, ix, iy + 30, Math.max(3, rpx + 4)); gl.addColorStop(0, 'rgba(255,255,255,1)'); gl.addColorStop(0.45, 'rgba(160,255,200,.85)'); gl.addColorStop(1, 'rgba(120,255,170,0)');
    ctx.fillStyle = gl; ctx.save(); ctx.beginPath(); ctx.arc(ix, iy + 30, ir - 2, 0, TAU); ctx.clip(); ctx.globalAlpha = Math.min(1, 0.4 + 0.6 * A.apD / 100); ctx.beginPath(); ctx.arc(ix, iy + 30, Math.max(3, rpx + 4), 0, TAU); ctx.fill(); ctx.restore();
    T(ix, iy + 30 - ir - 10, '점광원의 상 (확대)', PHONE ? 12 : 13.5, '#26324a', 'center', 800);
    D.label(ix, iy + 30 + ir + 22, st.spOK ? '선명해요' : '흐려요', { size: PHONE ? 12.5 : 14, bg: st.spOK ? '#14a058' : '#e8501b' });
    T(ix, iy + 30 + ir + 52, '밝기 ' + Math.round(Math.pow(A.apD / 100, 2) * 100) + ' %', PHONE ? 13 : 14, '#26324a', 'center', 800);
  }
  function drawAberB() {
    const A = S.ab, st = abState(), el = A.el, lx = MA.x + (PHONE ? 60 : 110), yc = MA.y + (PHONE ? 140 : 200), xR = MA.x + (PHONE ? 340 : 540), H = 44;
    T(MA.x + 14, MA.y + 22, '🌈 파랑 빛과 빨강 빛은 같은 곳에 모일까?', PHONE ? 13 : 15, '#26324a', 'left', 800);
    ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = '#c3cbdb'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(MA.x + 16, yc); ctx.lineTo(xR + 16, yc); ctx.stroke(); ctx.restore();
    const fb = st.fb, fr = st.fr, hs = [-H, -H / 2, H / 2, H];
    const cols = [[LAM_B, '#2f6bff'], [LAM_R, '#e8501b']];
    let scrX;
    if (el === 'mirror') {
      const xm = lx + 150;
      ctx.save(); ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 6; ctx.beginPath(); for (let yy = -H * 1.4; yy <= H * 1.4; yy += 2) { const x2 = xm - (yy * yy) / (4 * 100); if (yy === -H * 1.4) ctx.moveTo(x2, yc + yy); else ctx.lineTo(x2, yc + yy); } ctx.stroke(); ctx.strokeStyle = '#e9f2ff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      cols.forEach(([l, c], ci) => hs.forEach((h) => { const hx = xm - (h * h) / (4 * 100); const Fx = xm - 100, ddx = Fx - hx; lineTo2([[MA.x + 20, yc - h], [hx, yc - h], [Fx, yc], [Fx + ddx * 0.6, yc + h * 0.6]], c, 1.8, 0.85); }));
      D.sphere(xm - 100, yc, 5, '#14a058', { gloss: false }); D.label(xm - 100, yc + 28, '두 색이 같은 곳에 모여요', { size: PHONE ? 11 : 12.5, bg: '#14a058' });
      scrX = xm - 100;
    } else {
      // 렌즈 모양
      if (el === 'single') lensShape(lx, yc, H * 1.35, 9);
      else { lensShape(lx, yc, H * 1.35, 9, '#5b8fd1'); ctx.save(); ctx.fillStyle = 'rgba(255,214,150,.65)'; ctx.strokeStyle = '#c98a00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx + 3, yc - H * 1.3); ctx.quadraticCurveTo(lx + 22, yc, lx + 3, yc + H * 1.3); ctx.quadraticCurveTo(lx + 9, yc, lx + 3, yc - H * 1.3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); T(lx, yc - H * 1.35 - 10, '볼록 + 오목', 12.5, '#26324a', 'center', 800); }
      scrX = lx + (fb + fr) / 2;
      cols.forEach(([l, c]) => {
        const f = l === LAM_B ? fb : fr;
        hs.forEach((h) => { const xe = Math.min(xR, lx + f * 1.55), ye = yc - h * (1 - (xe - lx) / f); lineTo2([[MA.x + 20, yc - h], [lx, yc - h], [xe, ye]], c, 1.8, 0.85); });
        D.sphere(lx + f, yc, 4.5, c, { gloss: false });
      });
      D.label(lx + fb - 14, yc + 38, '파랑 초점', { size: PHONE ? 11 : 12.5, bg: '#2f6bff' }); D.label(lx + fr + 24, yc - 38, '빨강 초점', { size: PHONE ? 11 : 12.5, bg: '#e8501b' });
      ctx.fillStyle = '#2d3646'; ctx.fillRect(scrX - 2.5, yc - H * 0.8, 5, H * 1.6);
    }
    // 흰빛 점광원의 상
    const rB = el === 'mirror' ? 0 : Math.abs(H * (1 - (scrX - lx) / fb)), rR = el === 'mirror' ? 0 : Math.abs(H * (1 - (scrX - lx) / fr));
    const ix = PHONE ? MA.x + 400 : MA.x + 610, iy = PHONE ? MA.y + 150 : MA.y + 140, ir = PHONE ? 50 : 66;
    ctx.fillStyle = '#0d1424'; ctx.beginPath(); ctx.arc(ix, iy + 24, ir, 0, TAU); ctx.fill();
    const k = PHONE ? 4.5 : 6.5;
    const ring = (r, col) => { if (r < 0.6) return; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ix, iy + 24, Math.min(ir - 3, r * k), 0, TAU); ctx.fill(); };
    ring(rB, 'rgba(60,110,255,.55)'); ring(rR, 'rgba(255,70,50,.5)');
    const gl = ctx.createRadialGradient(ix, iy + 24, 0, ix, iy + 24, 9); gl.addColorStop(0, 'rgba(255,255,255,1)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(ix, iy + 24, 9, 0, TAU); ctx.fill();
    T(ix, iy + 24 - ir - 10, '흰빛 점광원의 상', PHONE ? 12 : 13.5, '#26324a', 'center', 800);
    const ok = Math.abs(fb - fr) <= 0.6;
    D.label(ix, iy + 24 + ir + 22, ok ? '색 번짐이 없어요' : '가장자리에 색이 번져요', { size: PHONE ? 12 : 13.5, bg: ok ? '#14a058' : '#e8501b' });
  }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'parts') {
      if (S.pt.view === 'box') { L1 = '부품'; a = PART_NAME[S.pt.part]; L2 = '평행한 빛은'; b = { convex: '한 점에 모여요', concave: '퍼져요', cmirror: '한 점에 모여요', vmirror: '퍼져요', pmirror: '평행한 채 꺾여요', prism: S.pt.prism === 'disp' ? '색이 갈라져요' : '직각으로 전반사' }[S.pt.part]; L3 = '분류'; c = { convex: '수렴', concave: '발산', cmirror: '수렴', vmirror: '발산', pmirror: '방향만 변화', prism: S.pt.prism === 'disp' ? '방향 변화 + 분산' : '방향 변화' }[S.pt.part]; }
      else { const im = imgOf(S.pt.a); L1 = '물체 거리 a'; a = S.pt.a + ' cm'; L2 = '초점거리 f'; b = F_CM + ' cm'; L3 = '상의 위치 b'; c = S.pt.ans ? im.b.toFixed(1) + ' cm' : '작도해서 구해요'; }
    } else if (S.mode === 'camera') {
      const st = camState();
      L1 = '렌즈 ~ 센서 b'; a = st.bs.toFixed(1) + ' mm'; L2 = '번진 원의 지름'; b = st.cSub.toFixed(2) + ' mm'; L3 = '피사체'; c = st.sharpSub ? '선명' : '흐림';
    } else if (S.mode === 'scope') {
      const v = S.sc.view;
      if (v === 'refr') { const e = scopeEye(); L1 = '두 렌즈 사이 간격'; a = Math.round(S.sc.tube) + ' mm'; L2 = '배율 (f_대물 / f_접안)'; b = M_TEL + '배'; L3 = '두 별'; c = e.focusOK ? (e.resolved ? '두 점으로 구분' : '흐림') : '초점이 안 맞음'; }
      else if (v === 'refl') { L1 = '주경 구경'; a = '200 mm'; L2 = '굴절 망원경(50 mm)보다'; b = '16배 많은 빛'; L3 = '색 번짐'; c = '없음'; }
      else if (v === 'mic') { L1 = '대물 배율'; a = '×' + S.sc.mic; L2 = '접안 배율'; b = '×' + MIC_EYE; L3 = '총배율'; c = (+S.sc.mic * MIC_EYE) + '배'; }
      else { L1 = '전반사 횟수'; a = '2번'; L2 = '프리즘 유리 임계각'; b = '약 ' + Math.round(CRIT) + '°'; L3 = '상'; c = '바로 서요'; }
    } else {
      const st = abState();
      if (S.ab.view === 'a') { L1 = '조리개 (쓰는 부분)'; a = Math.round(S.ab.ap) + ' %'; L2 = '점의 번짐 반지름'; b = st.sp.toFixed(1) + ' 눈금'; L3 = '상 / 밝기'; c = (st.spOK ? '선명' : '흐림') + ' / ' + Math.round(Math.pow(S.ab.ap / 100, 2) * 100) + '%'; }
      else { L1 = '장치'; a = { single: '볼록렌즈 한 장', doublet: '볼록 + 오목', mirror: '오목거울' }[S.ab.el]; L2 = '파랑·빨강 초점 차이'; b = S.ab.el === 'mirror' ? '0' : Math.abs(st.fb - st.fr).toFixed(1) + ' 눈금'; L3 = '색 번짐'; c = Math.abs(st.fb - st.fr) <= 0.6 ? '없음' : '있음'; }
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const numFl = (id, ok) => { const el = $('#' + id); if (!ok && !el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } };
  const camSharp = () => camState().sharpSub;
  const levels = [
    {
      title: '렌즈·거울: 빛을 모을까, 퍼뜨릴까?', short: '렌즈·거울', icon: '🧰', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 렌즈 한 장으로는 선명한 사진을 찍기 어려운 까닭은 무엇이고, 우리는 어떻게 멀리 있는 별과 아주 작은 세포를 볼 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>물리학에서</b> 볼록렌즈의 광선 추적(세 주광선)과 실상·허상을 배웠어요. 이번에는 렌즈 하나가 아니라 <b>렌즈·거울·프리즘을 조합한 광학 기기</b>를 알아봐요.</div>' +
        '<p>먼저 부품 상자에서 평행한 빛을 비춰 <b>렌즈·거울·프리즘</b>이 빛을 어떻게 다루는지 살펴봐요. 볼록렌즈와 오목거울은 빛을 <b>모으고(수렴)</b>, 오목렌즈와 볼록거울은 빛을 <b>퍼뜨려요(발산)</b>. 프리즘은 굴절로 색을 가르거나 전반사로 빛을 꺾어요. (렌즈 식은 작도 결과를 확인할 때 한 번만 써요.)</p>',
      features: ['parts'],
      setup() { S.pt.view = 'box'; S.pt.part = 'convex'; S.pt.prism = 'disp'; S.pt.visited = {}; S.pt.held = 0; S.pt._k = ''; SEL_K.reset(); S.show.selK = false; S.show.numB = false; setScene('parts'); },
      recap: '볼록렌즈·오목거울은 평행한 빛을 모으고, 오목렌즈·볼록거울은 퍼뜨려요. 평면거울은 방향만 바꾸고, 프리즘은 굴절로 색을 가르거나 전반사로 빛을 직각으로 꺾어요. 세 주광선을 그려 구한 상의 위치는 렌즈 식과 같아요.',
      summary: '<ul><li><b>수렴</b>: 볼록렌즈, 오목거울 / <b>발산</b>: 오목렌즈, 볼록거울 / 평면거울은 평행한 빛을 평행한 채 방향만 바꿔요.</li><li><b>프리즘</b>: 색마다 굴절하는 정도가 달라서 흰빛이 갈라져요(분산). 유리에서 임계각(약 42°)보다 크게 입사하면 <b>전반사</b>해서 빛이 직각으로 꺾여요(쌍안경 속 프리즘).</li><li>f = 10 cm 볼록렌즈에서 a = 30 cm이면 세 광선이 만나는 곳은 <b>b = 15 cm</b>. 렌즈 식 1/a + 1/b = 1/f로 확인하면 1/30 + 1/15 = 1/10으로 같아요.</li></ul>',
      missions: [
        {
          title: '부품을 모으는지 퍼뜨리는지 분류하기',
          goal: '🧰 부품 상자에서 여섯 부품을 모두 살펴보고, 평행한 빛을 <b>모으는지, 퍼뜨리는지, 방향만 바꾸는지</b> 문장을 완성하세요.',
          hint: '부품 이름 버튼을 눌러 한 개씩 보세요(0.6초 이상). 오목렌즈의 점선과 볼록거울의 점선은 빛이 퍼져서 거꾸로 이은 선이에요.',
          setup() { S.pt.view = 'box'; S.pt.visited = {}; S.pt.held = 0; S.pt._k = ''; SEL_K.reset(); S.show.selK = true; S.show.numB = false; setScene('parts'); },
          check: () => Object.keys(S.pt.visited).length >= 6 && kOK() === 6,
          hold: 0.5,
          status: () => mark(Object.keys(S.pt.visited).length >= 6) + ' 살펴본 부품 ' + Math.min(6, Object.keys(S.pt.visited).length) + ' / 6 &nbsp; ' + mark(kOK() === 6) + ' 맞게 분류한 문장 ' + kOK() + ' / 6',
          explain: '<b>볼록렌즈·오목거울</b>은 평행한 빛을 한 점(초점)에 모으고, <b>오목렌즈·볼록거울</b>은 빛을 퍼뜨려요. <b>평면거울</b>은 평행한 빛을 평행한 채 방향만 바꾸고, <b>프리즘</b>도 평행한 빛은 평행한 채 꺾되 색마다 꺾이는 정도가 달라서 색이 갈라져요.',
        },
        {
          title: '세 광선으로 상의 위치 구하기', manual: true,
          goal: '✏️ 상 작도에서 <b>a = 30 cm</b>로 맞추고, 세 광선이 만나는 곳까지의 거리 <b>b</b>를 눈금으로 읽어 쓰세요. (cm)',
          hint: '렌즈 오른쪽 축의 눈금(5 cm 간격)에서 세 광선이 모이는 곳을 읽어요. 렌즈에서 그곳까지가 b예요.',
          setup() { S.pt.view = 'draw'; S.pt.a = 30; S.pt.aD = 30; slA.set(30); S.pt.ans = false; S.show.selK = false; S.show.numB = true; $('#inB').value = ''; $('#inB').classList.remove('ok', 'bad'); setScene('parts'); },
          check() {
            const v = parseFloat($('#inB').value);
            if (S.pt.a !== 30) return '물체 거리를 a = 30 cm로 맞춰 주세요.';
            if (!isFinite(v)) { return '작도한 b를 숫자(cm)로 써 주세요.'; }
            if (Math.abs(v - 15) <= 0.6) { S.pt.ans = true; numFl('inB', true); return true; }
            numFl('inB', false);
            if (Math.abs(v - 30) <= 1) return '30 cm는 물체까지의 거리 a예요. 상은 렌즈 오른쪽의 세 광선이 만나는 곳이에요.';
            if (Math.abs(v - 10) <= 0.6) return '10 cm는 초점(F)이에요. 세 광선이 실제로 만나는 곳을 눈금에서 읽어 보세요.';
            return '세 광선이 모이는 점의 눈금을 다시 읽어 보세요. 렌즈에서 오른쪽으로 잰 거리예요.';
          },
          status: () => mark(S.pt.a === 30) + ' a = 30 cm &nbsp; ' + mark(S.pt.ans) + ' b 구하기',
          explain: '세 광선은 렌즈에서 오른쪽 <b>15 cm</b>에서 만나요. 렌즈 식으로 확인하면 1/a + 1/b = 1/30 + 1/15 = 1/10 = 1/f로 작도와 같아요. 상은 거꾸로 선 실상(0.5배)이에요.',
        },
        {
          type: 'quiz', title: '오목렌즈로 스크린에 상을 맺을 수 없는 까닭',
          goal: '볼록렌즈는 스크린에 상을 맺지만 오목렌즈는 스크린에 상을 맺지 못해요. 그 까닭은?',
          setup() { S.pt.view = 'box'; S.pt.part = 'concave'; S.show.numB = false; S.show.selK = false; setScene('parts'); },
          choices: ['오목렌즈는 빛을 흡수하기 때문에', '오목렌즈를 지난 빛은 퍼져서 실제로 한 점에 모이지 않기 때문에 (거꾸로 이은 점선만 만나요)', '오목렌즈는 초점이 없기 때문에', '오목렌즈는 상을 거꾸로 만들기 때문에'],
          answer: 1,
          feedback: ['오목렌즈도 빛을 통과시켜요. 지난 뒤 빛이 어디로 가는지 보세요.', '', '오목렌즈에도 (허)초점이 있어요. 빛이 그곳에서 나온 것처럼 퍼질 뿐이에요.', '거꾸로 선 상은 볼록렌즈가 만들어요. 오목렌즈는 상을 맺지 못해요.'],
          explain: '오목렌즈를 지난 빛은 <b>퍼져 나가서 실제로 만나지 않아요</b>. 거꾸로 이은 점선이 만나는 곳에 허상이 보일 뿐이라 스크린에는 맺히지 않아요. (근시 안경이 오목렌즈예요.)',
        },
      ],
    },
    {
      title: '카메라: 초점 맞추기와 조리개', short: '카메라', icon: '📸', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 볼록렌즈는 평행한 빛을 초점에 모으고, 물체가 가까울수록 상이 멀리 생긴다는 것을 작도로 확인했어요. 카메라는 이 원리로 <b>센서</b>에 선명한 상을 맺히게 해요.</div>' +
        '<p>카메라의 렌즈는 초점거리 f = 50 mm예요. 먼 풍경(a = ∞)은 b = 50 mm에, 가까운 피사체는 더 먼 곳에 상이 맺혀서, <b>렌즈를 앞뒤로 움직여</b> 센서 위치에 상이 오게 해요(초점 맞추기). 렌즈 앞의 <b>조리개</b>(구멍 크기)는 밝기와 선명하게 찍히는 거리의 범위를 정해요.</p>',
      features: ['camera'],
      setup() { S.cm.subj = 'mid'; S.cm.b = 50.0; slB.set(500); S.cm.bs.value = 50.0; S.cm.bs.velocity = 0; S.cm.ap = 'big'; S.cm.apD = CAM_DMAX; S.cm.f5 = false; S.cm.f05 = false; S.cm.fFar = false; S.cm.hold = 0; S.show.selC2 = false; setScene('camera'); },
      recap: '피사체가 가까울수록 상이 맺히는 거리 b가 길어져서 렌즈를 센서에서 더 멀리 해야 해요(5 m → b = 50.5 mm, 0.5 m → b = 55.6 mm). 조리개를 작게 하면 어두워지지만 선명한 범위가 넓어져요.',
      summary: '<ul><li>f = 50 mm: 먼 풍경 a = ∞ → b = 50.0 mm / 5 m → b = 50.5 mm / 0.5 m → b = 55.6 mm. (렌즈 식으로 확인한 값이에요.) <b>센서가 상이 맺히는 곳에 있어야</b> 선명해요.</li><li>가까운 물체를 찍으려면 렌즈를 센서에서 <b>멀리</b> 해야 해요.</li><li><b>조리개</b>: 크게 하면 밝지만 초점이 맞는 거리의 범위가 좁아 배경이 흐려지고, 작게 하면 어둡지만 먼 곳까지 선명해요.</li></ul>',
      missions: [
        {
          title: '5 m와 0.5 m의 피사체에 초점 맞추기',
          goal: '피사체 거리를 <b>5 m</b>와 <b>0.5 m</b>로 바꿔 가며 렌즈 위치(b)를 조절해 센서에 <b>선명한 상</b>을 맺으세요. (각각 0.4초 이상)',
          hint: '“렌즈~센서 거리 b” 슬라이더와 + − 버튼(0.1 mm)을 써요. 광선이 센서에서 한 점에 모이고 “선명해요!”가 뜨는 곳을 찾아요. 읽음 칸의 번짐이 가장 작아지는 곳이에요.',
          setup() { S.cm.subj = 'mid'; S.cm.b = 50.0; slB.set(500); S.cm.ap = 'big'; S.cm.f5 = false; S.cm.f05 = false; S.cm.hold = 0; S.show.selC2 = false; setScene('camera'); },
          check: () => S.cm.f5 && S.cm.f05,
          hold: 0.3,
          status: () => mark(S.cm.f5) + ' 5 m에서 선명 &nbsp; ' + mark(S.cm.f05) + ' 0.5 m에서 선명 &nbsp; (지금 ' + (camSharp() ? '선명' : '흐림') + ')',
          explain: '5 m 앞은 <b>b = 50.5 mm</b>, 0.5 m 앞은 <b>b = 55.6 mm</b>에서 상이 맺혀요. 가까울수록 렌즈를 센서에서 멀리 해야 해요.',
        },
        {
          title: '초점 맞추기 정리', manual: true,
          goal: '카메라의 초점 맞추기에 대한 문장 네 개를 완성하세요.',
          hint: '앞에서 5 m와 0.5 m에서 선명해졌을 때의 b 값을 떠올려 보세요.',
          setup() { S.show.selC2 = true; SEL_C2.reset(); setScene('camera'); },
          check: () => SEL_C2.grade(),
          status: () => '고른 문장 ' + SEL_C2.count() + ' / 4',
          explain: '렌즈 식 1/a + 1/b = 1/f에서 b = af/(a − f)예요. 5 m: b = 5000 × 50 / 4950 ≈ 50.5 mm, 0.5 m: b = 500 × 50 / 450 ≈ 55.6 mm. a가 작을수록 b가 길어져서 렌즈를 센서에서 멀리 해야 해요.',
        },
        {
          type: 'quiz', title: '조리개를 작게 하면?',
          goal: '조리개를 <b>작게</b> 하면 사진이 어두워지지만 배경까지 선명해져요. 그 까닭은?',
          setup() { S.show.selC2 = false; S.cm.subj = 'mid'; S.cm.ap = 'big'; setScene('camera'); },
          choices: ['구멍이 작으면 초점이 맞지 않은 점이 번진 원의 크기가 작아지고, 들어오는 빛의 양은 줄기 때문에', '구멍이 작으면 렌즈의 초점거리가 길어지기 때문에', '구멍이 작으면 센서가 빛을 더 잘 받기 때문에', '구멍이 작으면 피사체가 센서에 가까워지기 때문에'],
          answer: 0,
          feedback: ['', '조리개는 초점거리를 바꾸지 않아요. 구멍의 크기만 정해요.', '조리개를 작게 하면 센서에 들어오는 빛은 줄어서 어두워져요.', '피사체의 위치는 그대로예요. 달라지는 것은 번짐의 크기예요.'],
          explain: '센서에서 벗어난 위치의 점은 구멍의 크기만큼 번진 원으로 찍혀요. 구멍이 <b>작을수록 번진 원이 작아져서</b> 초점이 맞는 거리의 범위가 넓어지고(배경도 선명), 대신 들어오는 빛은 구멍 넓이만큼 줄어 어두워져요.',
        },
      ],
    },
    {
      title: '망원경·현미경: 렌즈를 조합해요', short: '망원경·현미경', icon: '🔭', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 렌즈 하나로 센서에 상을 맺는 카메라를 살펴봤어요. 망원경과 현미경은 <b>렌즈(또는 거울) 두 개를 조합</b>해서 먼 곳과 작은 것을 크게 보여 줘요.</div>' +
        '<p><b>굴절 망원경</b>은 대물렌즈(f가 길어요)가 먼 별빛으로 작은 상을 만들고, 접안렌즈(f가 짧아요)가 그 상을 돋보기처럼 확대해요. 배율은 <b>대물 f / 접안 f</b>예요. <b>현미경</b>은 대물렌즈가 확대된 실상을 만들고 접안렌즈가 다시 확대해서, 배율은 대물 배율 × 접안 배율이에요. <b>반사 망원경</b>은 렌즈 대신 오목거울로 빛을 모아요.</p>',
      features: ['scope'],
      setup() { S.sc.view = 'refr'; S.sc.tube = 1010; S.sc.tubeD = 1010; slT.set(1010); S.sc.mic = '40'; S.sc.micD = 400; S.sc.seen = {}; S.sc.held = 0; S.sc._k = ''; S.sc.ok = false; S.sc.okHold = 0; S.show.numM = false; setScene('scope'); },
      recap: '굴절 망원경의 배율은 대물 f / 접안 f = 1000 / 25 = 40배이고 상은 거꾸로 보여요. 현미경의 총배율은 대물 배율 × 접안 배율 = 40 × 10 = 400배예요. 반사 망원경은 색 번짐이 없고 큰 구경을 만들기 쉬워 큰 망원경에 많이 써요.',
      summary: '<ul><li><b>굴절 망원경</b>: 대물렌즈 f = 1000 mm, 접안렌즈 f = 25 mm, 두 렌즈 간격 = f_대물 + f_접안. 배율 = f_대물 / f_접안 = 40배, 상은 거꾸로.</li><li><b>반사 망원경</b>: 오목 주경이 빛을 모으고 작은 평면거울이 접안렌즈로 돌려요. 거울은 색에 상관없이 반사하고, 구경이 클수록 더 많은 빛을 모아 어두운 천체를 볼 수 있어요.</li><li><b>현미경</b>: 대물렌즈(물체를 f 바로 바깥에)가 확대된 실상을 만들고 접안렌즈가 확대된 허상으로 봐요. 총배율 = 40 × 10 = 400배.</li><li><b>쌍안경</b>: 두 개의 직각 프리즘이 전반사로 상을 바로 세우고 경통 길이를 줄여요.</li></ul>',
      missions: [
        {
          title: '망원경을 조립해 두 별 구분하기',
          goal: '굴절 망원경의 <b>초점을 맞춰</b> 눈으로는 한 점인 두 별을 <b>두 점으로</b> 보세요. 그리고 반사 망원경 · 현미경 · 쌍안경 프리즘도 한 번씩 살펴보세요.',
          hint: '“초점 조절” 슬라이더를 움직여 두 렌즈 사이의 간격이 f_대물 + f_접안 = 1025 mm 근처가 되게 해요. “초점이 맞아요”가 뜨면 두 점이 구분돼요.',
          setup() { S.sc.view = 'refr'; S.sc.tube = 1010; S.sc.tubeD = 1010; slT.set(1010); S.sc.seen = {}; S.sc.held = 0; S.sc._k = ''; S.sc.ok = false; S.sc.okHold = 0; S.show.numM = false; setScene('scope'); },
          check: () => S.sc.ok && S.sc.seen.refl && S.sc.seen.mic && S.sc.seen.bino,
          hold: 0.4,
          status: () => mark(S.sc.ok) + ' 두 별 구분 (초점 ' + (scopeEye().focusOK ? '맞음' : '아직') + ') &nbsp; ' + mark(S.sc.seen.refl) + ' 반사 망원경 &nbsp; ' + mark(S.sc.seen.mic) + ' 현미경 &nbsp; ' + mark(S.sc.seen.bino) + ' 쌍안경',
          explain: '대물렌즈가 만든 상의 위치(초점)에 접안렌즈의 초점이 오도록 간격을 f_대물 + f_접안 = 1025 mm로 하면 접안렌즈를 나온 빛이 평행해져서 눈이 편하게 선명한 상을 봐요. 별 사이의 각도가 배율만큼(40배) 커져서 두 점이 구분돼요.',
        },
        {
          title: '배율 계산하기', manual: true,
          goal: '굴절 망원경의 배율과, 대물 ×40 · 접안 ×10 현미경의 총배율을 구해 쓰세요. (배)',
          hint: '망원경 배율 = 대물 f / 접안 f (1000 mm와 25 mm). 현미경 총배율 = 대물 배율 × 접안 배율이에요.',
          setup() { S.show.numM = true; ['inM1', 'inM2'].forEach((i) => { $('#' + i).value = ''; $('#' + i).classList.remove('ok', 'bad'); }); S.sc.view = 'refr'; setScene('scope'); },
          check() {
            const A = parseFloat($('#inM1').value), B = parseFloat($('#inM2').value);
            if (!isFinite(A) || !isFinite(B)) return '두 칸에 배율을 숫자로 써 주세요.';
            const okA = Math.abs(A - M_TEL) < 0.5, okB = Math.abs(B - 400) < 0.5;
            numFl('inM1', okA); numFl('inM2', okB);
            if (okA && okB) return true;
            return (okA ? '' : (Math.abs(A - 1025) < 1 ? '망원경 배율은 두 렌즈 사이 간격이 아니라 f_대물 / f_접안이에요. ' : '망원경 배율 = 1000 / 25를 계산해 보세요. ')) + (okB ? '' : (Math.abs(B - 40) < 0.5 ? '40배는 대물렌즈만의 배율이에요. 접안렌즈 ×10을 곱해야 해요.' : '현미경 총배율 = 대물 배율 × 접안 배율이에요.'));
          },
          status: () => '망원경 f_대물 / f_접안, 현미경 대물 × 접안',
          explain: '굴절 망원경의 배율은 <b>1000 / 25 = 40배</b>이고, 현미경의 총배율은 <b>40 × 10 = 400배</b>예요.',
        },
        {
          type: 'quiz', title: '큰 망원경이 대부분 반사식인 까닭',
          goal: '큰 천체 망원경은 대부분 반사 망원경이에요. 그 까닭으로 알맞은 것은?',
          setup() { S.show.numM = false; S.sc.view = 'refl'; setScene('scope'); },
          choices: ['거울은 색 번짐이 없고, 뒷면 전체를 받쳐서 크게 만들기 쉽기 때문에', '반사식은 배율이 항상 더 크기 때문에', '거울은 빛을 증폭하기 때문에', '큰 렌즈는 값이 싸기 때문에'],
          answer: 0,
          feedback: ['', '배율은 대물과 접안의 초점거리로 정해져요. 거울이어서 배율이 큰 것이 아니에요.', '거울은 빛을 증폭하지 않고 모으기만 해요. 구경이 크면 더 많은 빛을 모아요.', '큰 렌즈는 무겁고 비싸고 가장자리만 받칠 수 있어서 크게 만들기 어려워요.'],
          explain: '큰 <b>렌즈</b>는 무겁고, 가장자리만 받칠 수 있어서 처지며, 색에 따라 굴절이 달라 색이 번져요. <b>거울</b>은 색에 상관없이 반사하고 뒷면 전체를 받칠 수 있어서 구경을 크게 만들 수 있어요. 구경이 클수록 어두운 천체도 볼 수 있어요.',
        },
      ],
    },
    {
      title: '상이 흐려질 때: 가장자리와 색', short: '상이 흐려질 때', icon: '🌫️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 렌즈와 거울을 조합한 여러 기기를 봤어요. 그런데 렌즈 한 장만 쓰면 점이 <b>깨끗한 점</b>으로 맺히지 않아요. 실제 카메라 렌즈가 여러 장인 까닭을 알아봐요.</div>' +
        '<p>두 가지 현상이 있어요. 첫째, 렌즈의 <b>가장자리를 지난 빛</b>은 한가운데를 지난 빛과 <b>다른 곳에 모여서</b> 상이 흐려져요. 둘째, 렌즈는 빛의 <b>색에 따라</b> 굴절하는 정도가 조금씩 달라서 파랑과 빨강이 <b>다른 곳에 모여 색이 번져요</b>. 어떻게 줄이는지 직접 해 봐요.</p>',
      features: ['aber'],
      setup() { S.ab.view = 'a'; S.ab.ap = 100; S.ab.apD = 100; slAp.set(100); S.ab.el = 'single'; S.ab.apOK = false; S.ab.elOK = false; S.ab.okH1 = 0; S.ab.okH2 = 0; setScene('aber'); },
      recap: '렌즈 가장자리를 지난 빛은 가운데를 지난 빛보다 가까운 곳에 모여 상이 흐려져요(조리개로 가리면 선명하지만 어두워져요). 색에 따라 굴절이 달라 색이 번지는 것은 볼록렌즈와 오목렌즈를 붙이거나 거울을 써서 줄여요.',
      summary: '<ul><li>(a) 렌즈 <b>가장자리를 지난 빛</b>은 가운데 빛과 다른 곳에 모여서 상이 흐려져요. <b>조리개</b>로 가장자리 빛을 가리면 선명해지고 어두워져요. 렌즈 면을 특수하게 연마하거나 렌즈를 여러 장 조합해서도 줄여요.</li><li>(b) 렌즈는 <b>빛의 색에 따라</b> 굴절이 조금씩 달라서 파란빛은 렌즈에 더 가까운 곳에, 빨간빛은 더 먼 곳에 모여요. 그래서 상의 가장자리에 <b>색이 번져요</b>. 볼록렌즈와 오목렌즈를 붙여 겹치게 하거나, 색과 무관하게 반사하는 거울을 써요.</li><li>그래서 카메라 렌즈는 여러 장으로 이루어져 있고, 간단한 렌즈 한 장으로 찍는 장난감 카메라는 가장자리가 흐리고 색이 번져요.</li></ul>',
      missions: [
        {
          title: '조리개로 상 선명하게 만들기',
          goal: '렌즈 한 장에서 점의 상이 흐려져 있어요. <b>조리개</b>를 조절해서 상이 <b>선명</b>해지게 하세요(번짐 2.0 눈금 이하). 밝기가 얼마나 줄었는지도 확인해요.',
          hint: '조리개 슬라이더를 줄여 가장자리의 빨간 광선이 막히게 하세요. 읽음 칸의 “점의 번짐 반지름”이 2.0 이하가 되면 돼요.',
          setup() { S.ab.view = 'a'; S.ab.ap = 100; S.ab.apD = 100; slAp.set(100); S.ab.apOK = false; S.ab.okH1 = 0; setScene('aber'); },
          check: () => S.ab.apOK,
          hold: 0.3,
          status: () => mark(abState().spOK) + ' 점의 번짐 ' + abState().sp.toFixed(1) + ' (2.0 이하) &nbsp; 밝기 ' + Math.round(Math.pow(S.ab.ap / 100, 2) * 100) + ' %',
          explain: '조리개로 가장자리 빛을 가리고 가운데 부분만 쓰면 빛이 거의 한 점에 모여 상이 선명해져요. 하지만 렌즈에서 쓰는 넓이가 줄어든 만큼 상이 <b>어두워져요</b>.',
        },
        {
          title: '렌즈 조합으로 색 번짐 없애기',
          goal: '🌈 색이 번짐 장면에서 <b>볼록 + 오목 붙임</b>으로 파랑과 빨강이 <b>같은 곳</b>에 모이게 하세요.',
          hint: '“빛을 모으는 장치”에서 볼록 + 오목 붙임을 골라요. 파랑 초점과 빨강 초점이 겹치면 색 번짐이 사라져요. 오목거울도 살펴보세요.',
          setup() { S.ab.view = 'b'; S.ab.el = 'single'; S.ab.elOK = false; S.ab.okH2 = 0; setScene('aber'); },
          check: () => S.ab.elOK,
          hold: 0.3,
          status: () => mark(S.ab.el === 'doublet') + ' 볼록 + 오목 붙임 &nbsp; ' + mark(Math.abs(abState().fb - abState().fr) <= 0.6) + ' 파랑·빨강 초점 차이 ' + Math.abs(abState().fb - abState().fr).toFixed(1) + ' 눈금',
          explain: '볼록렌즈는 파랑을 더 많이 꺾고, 오목렌즈는 반대로 퍼뜨려서 두 색의 차이가 서로 줄어들어요. 알맞게 붙이면 파랑과 빨강이 <b>같은 곳</b>에 모여요. 거울은 색에 상관없이 반사하므로 처음부터 색 번짐이 없어요.',
        },
        {
          type: 'quiz', title: '카메라 렌즈가 여러 장인 까닭',
          goal: '카메라 렌즈는 렌즈 여러 장을 겹쳐서 만들어요. 그 까닭은?',
          setup() { S.ab.view = 'a'; setScene('aber'); },
          choices: ['렌즈를 겹치면 빛이 더 밝아지기 때문에', '가장자리가 흐려지고 색이 번지는 현상을 렌즈 조합으로 줄이기 위해서', '렌즈 한 장은 상을 거꾸로 만들지 못하기 때문에', '렌즈를 여러 장 쓰면 초점거리가 필요 없어지기 때문에'],
          answer: 1,
          feedback: ['밝기는 조리개가 주로 정해요. 렌즈 장수 때문이 아니에요.', '', '상이 거꾸로 맺히는 것은 렌즈 한 장도 마찬가지예요.', '초점거리는 여전히 필요해요. 여러 장이 하나의 렌즈처럼 작용해요.'],
          explain: '렌즈 한 장은 <b>가장자리가 흐려지고 색이 번져요</b>. 볼록·오목 렌즈를 여러 장 조합하면 두 현상이 서로 줄어들어서 가장자리까지 선명하고 색이 번지지 않는 상을 얻어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hq-optical-instruments', mount: '#game', badge: '광학 기기 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { parts: '🧰 렌즈·거울·프리즘 · 상 작도', camera: '📸 카메라 · 조리개', scope: '🔭 망원경 · 현미경 · 쌍안경', aber: '🌫️ 조리개 · 렌즈 조합' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('parts');
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t; S.dt = dt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepParts(dt); stepCamera(dt); stepScope(dt); stepAber(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'parts') { panel(MA.x, MA.y, MA.w, MA.h, 14); if (S.pt.view === 'box') drawPartsBox(); else drawPartsDraw(); }
    else if (S.mode === 'camera') drawCamera();
    else if (S.mode === 'scope') drawScope();
    else drawAber();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, MA, BOT, SEL_K, SEL_C2, slA, slB, slT, slAp, camState, camB, scopeEye, abState, spreadOf: spreadOf, SPH_FP, SPH_APS, imgOf, kOK, powAb, setScene, updateCtl, sphRay, crossAxis, tracePoly, CRIT,
    setSub(sub) { const m = S.mode; if (m === 'parts') S.pt.view = sub; else if (m === 'scope') S.sc.view = sub; else if (m === 'aber') S.ab.view = sub; updateCtl(); },
    get game() { return game; },
  };

})();
