/* =========================================================
   물질과 에너지 Ⅲ. 화학 변화의 자발성 - 화학 변화의 자발성 [12물에03-03]
   ① 관찰: 발열이면 자발? 흡열인데도 저절로 일어나는 변화 (온도 센서로 분류)
   ② 모형: 엔탈피 요인과 엔트로피 요인의 두 접시 저울 (온도는 엔트로피 요인만 키워요)
   ③ 분석: ΔH 와 ΔS 의 부호에 따른 네 가지 경우 (2×2 표)
   ④ 적용: 석회 가마, 암모니아 합성, 오존, 얼어붙는 호수
   깁스 자유 에너지(ΔG = ΔH − TΔS), 수치 계산, 전이 온도 계산은 다루지 않아요. 온도의 영향은 정성적으로만 나타내요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 960 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#7c3aed', GOOD = '#14a058', BAD = '#e2464b', AMB = '#d97706', BLU = '#3867f4', SKY = '#0ea5e9';
  const HOT = '#e2553b', COLD = '#2f7fd8';
  const BG = '#f3f0fb';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  const HALO = { stroke: 'rgba(255,255,255,.92)', strokeWidth: 3 };
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(str).split('\n').forEach((ln, li) => {
      if (li) { out.push(line.trimEnd()); line = ''; }
      const toks = ln.match(/[가-힣]|\s+|[^\s가-힣]+/g) || [];
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
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const f0 = (v) => String(Math.round(v));
  const MINUS = '−';
  const sgn = (v, d) => { const r = Math.round(Math.abs(v) * Math.pow(10, d || 0)) / Math.pow(10, d || 0); const s = r === 0 ? '' : v < 0 ? MINUS : '+'; return s + r.toFixed(d || 0); };
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const ap = SciSim.approach;
  const ap2 = (cur, tg, dt, rate) => (RM ? tg : ap(cur, tg, dt, rate));
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  function parseNum(s) {
    let t = String(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => '^' + SUP[c]).replace(/[−–﹣－]/g, '-').replace(/\s+/g, '').replace(/,/g, '');
    const m = t.match(/^([0-9.]+)[×x*]10\^?(-?[0-9]+)$/);
    if (m) return +m[1] * Math.pow(10, +m[2]);
    t = t.replace(/\^/g, ''); if (t !== '' && !isNaN(+t)) return +t;
    t = t.replace(/[^0-9.\-eE+]/g, ''); return t === '' || isNaN(+t) ? NaN : +t;
  }
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const chipBtn = (txt, aria, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (cls) b.className = cls; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', () => { Sound.click(); fn(); }); return b; };
  const shakeBad = (inp) => { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); Sound.fail(); };
  const RC = {
    L: PHONE ? { x: 8, y: 50, w: 464, h: 500 } : { x: 12, y: 50, w: 470, h: 498 },
    R: PHONE ? { x: 8, y: 558, w: 464, h: 394 } : { x: 490, y: 50, w: 298, h: 498 },
  };
  function bar(x0, x1, y, col, w) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore(); }
  function dline(x0, y0, x1, y1, col, w) { ctx.save(); ctx.strokeStyle = col || 'rgba(100,116,139,.5)'; ctx.lineWidth = w || 1.4; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore(); }
  function stamp(cx, cy, txt, p, col) {           // p: 0~1 진행. 도장
    const sc = 1 + Math.max(0, 0.35 - p) * 2.4;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.2); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, p * 6);
    ctx.font = D.font(22, 800); const w = ctx.measureText(txt).width + 26;
    D.roundRect(-w / 2, -21, w, 42, 10); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.strokeStyle = col || GOOD; ctx.lineWidth = 4; ctx.stroke(); T(0, 8, txt, 22, col || GOOD, 'center', 800); ctx.restore();
  }

  const MODE_LABEL = { obs: '👀 저절로 일어나는 변화를 관찰해요', bal: '⚖️ 두 가지 요인을 저울에 올려요', tab: '🔲 ΔH 와 ΔS 의 부호로 네 가지 경우를 나눠요', app: '🏠 사례를 보고 자발성을 판정해요' };

  /* ================= ① 관찰: 발열이면 자발? ================= */
  const OC = [
    { name: '종이의 연소', exo: true, sense: '불꽃 옆 공기', t0: 25, t1: 45, lo: 20, hi: 50, note: '종이가 타면 열을 내놓아 주위의 온도가 올라가요.' },
    { name: '중화 반응', exo: true, sense: '용액', t0: 22, t1: 28.5, lo: 20, hi: 30, note: '산과 염기가 섞이면 용액의 온도가 올라가요.' },
    { name: '얼음이 실온에서 녹음', exo: false, sense: '얼음이 든 물', t0: 25, t1: 19, lo: 14, hi: 28, note: '얼음은 주위의 열을 흡수해 녹아요. 물의 온도가 내려가요.' },
    { name: '냉각 팩 (NH₄NO₃ 용해)', exo: false, sense: '용액', t0: 22, t1: 14, lo: 10, hi: 24, note: '질산 암모늄이 물에 녹으면서 열을 흡수해 차가워져요 (ΔH ≈ +26 kJ/mol).' },
    { name: 'Ba(OH)₂·8H₂O + NH₄Cl', exo: false, sense: '플라스크 안', t0: 22, t1: -15, lo: -20, hi: 25, note: '온도가 크게 내려가 젖은 나무판이 얼어붙어요. 흡열 반응이지만 실온에서 저절로 일어나요.' },
    { name: '겨울날 물이 얾', exo: true, sense: '물 주위의 공기', t0: -5, t1: -4, lo: -8, hi: 2, note: '물이 얼 때 열을 내놓아 주위 공기의 온도가 조금 올라가요 (ΔH = −6.0 kJ/mol).' },
  ];
  const NOC = OC.length;
  const OBS = () => S.ob;
  const obT = (i) => { const c = OC[i], p = OBS().run[i]; return c.t0 + (c.t1 - c.t0) * sm(p); };
  const obRan = (i) => OBS().run[i] >= 1;
  function obMeasure() {
    const O = OBS(), i = O.sel; if (O.go[i] && O.run[i] < 1) return;
    O.go[i] = true; O.run[i] = Math.max(O.run[i], 0.0001); if (O.run[i] >= 1) O.run[i] = 0.0001; Sound.click(); updateCtl();
  }
  function setObSel(i) { OBS().sel = i; Sound.tick(); updateCtl(); }
  function obClassify(exo) {
    const O = OBS(), i = O.sel, c = OC[i];
    if (!obRan(i)) { showHint('먼저 「온도 재기」로 온도 변화를 확인해요.'); Sound.fail(); return; }
    if (O.bin[i] >= 0) return;
    if (c.exo === exo) { O.bin[i] = exo ? 0 : 1; O.stamp[i] = 0.7; Sound.success(); parts.burst(RC.L.x + 80 + (i % 3) * 150, RC.L.y + 80, { count: 12, speed: 120, life: 0.6, size: 3.4 }); showHint('맞아요! ' + (exo ? '온도가 올랐으니 발열이에요.' : '온도가 내려갔으니 흡열이에요.') + ' 이 변화는 저절로 일어나요.', 3600); }
    else { O.shake = 1; Sound.fail(); showHint(exo ? '온도가 내려갔어요. 열을 흡수했으니 흡열이에요.' : '온도가 올랐어요. 열을 내놓았으니 발열이에요.', 4000); }
    updateCtl();
  }
  function stepOb(dt) {
    const O = OBS();
    for (let i = 0; i < NOC; i++) {
      if (O.go[i] && O.run[i] < 1) { O.run[i] = RM ? 1 : Math.min(1, O.run[i] + dt / 3); if (O.run[i] >= 1) { O.run[i] = 1; O.go[i] = false; Sound.tick(); updateCtl(); } }
      if (O.stamp[i] > 0) O.stamp[i] = Math.max(0, O.stamp[i] - dt);
    }
    if (O.shake > 0) O.shake = Math.max(0, O.shake - dt * 2.5);
  }
  const ocRect = (i) => { const L = RC.L, w = (L.w - 24 - 16) / 3; return { x: L.x + 12 + (i % 3) * (w + 8), y: L.y + 58 + Math.floor(i / 3) * 66, w, h: 60 }; };
  function drawObScene(i, p, rc, t) {
    const c = OC[i], cx = rc.x + rc.w * 0.36, by = rc.y + rc.h - 26, hot = c.exo, col = hot ? HOT : COLD;
    ctx.save(); D.roundRect(rc.x, rc.y, rc.w, rc.h, 12); ctx.clip(); ctx.fillStyle = '#fbfcff'; ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
    ctx.fillStyle = '#e6ebf5'; ctx.fillRect(rc.x, by + 4, rc.w, rc.h);                                 // 탁자
    const q = sm(p), run = OBS().go[i] || (p > 0 && p < 1);
    if (i === 0) {                                                                                      // 종이의 연소
      const ph = 100 * (1 - 0.55 * q);
      ctx.fillStyle = C.mix('#f6f1e3', '#2d2a26', q); ctx.beginPath(); ctx.rect(cx - 36, by - ph, 72, ph); ctx.fill(); ctx.strokeStyle = '#b8b09c'; ctx.lineWidth = 1.5; ctx.stroke();
      if (q > 0.01 && q < 0.995) D.flame(cx, by - ph + 6, 46 + 12 * Math.sin(Math.min(1, q * 4) * Math.PI / 2), t);
    } else if (i === 1) {                                                                               // 중화
      D.beaker(cx - 50, by - 104, 100, 104, { level: 0.62, liquid: C.mix('#cfe9ff', '#ffcf9a', q), t, wave: 1.4 });
    } else if (i === 2) {                                                                               // 얼음이 녹음
      D.beaker(cx - 50, by - 104, 100, 104, { level: 0.62, liquid: C.mix('#d6ecff', '#b9dcff', q), t, wave: 1.2 });
      const s = 34 * (1 - 0.8 * q); ctx.save(); ctx.translate(cx - 4, by - 104 * 0.62 + 4); ctx.rotate(0.15); D.roundRect(-s / 2, -s / 2 - 2, s, s, 5); ctx.fillStyle = 'rgba(235,248,255,.92)'; ctx.fill(); ctx.strokeStyle = '#8fc4ea'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.restore();
    } else if (i === 3) {                                                                               // 냉각 팩
      D.beaker(cx - 50, by - 104, 100, 104, { level: 0.62, liquid: C.mix('#d8e8fa', '#9fc6f2', q), t, wave: 1.2 });
      for (let k = 0; k < 8; k++) { const a = 1 - clamp(q * 1.5 - k * 0.06, 0, 1); if (a > 0.02) { ctx.globalAlpha = a; D.sphere(cx - 32 + hash(k, 4) * 64, by - 14 - hash(k, 8) * 8, 4, '#f4f6fa', { gloss: false, outline: '#b5bccb', outlineWidth: 0.8 }); ctx.globalAlpha = 1; } }
    } else if (i === 4) {                                                                               // Ba(OH)₂ + NH₄Cl
      ctx.fillStyle = '#c99c64'; ctx.fillRect(cx - 78, by - 10, 156, 14); ctx.fillStyle = 'rgba(160,215,255,' + (0.55 * q) + ')'; ctx.fillRect(cx - 78, by - 12, 156, 4);
      D.beaker(cx - 48, by - 110, 96, 100, { level: 0.45, liquid: C.mix('#e8edf5', '#b9d2f0', q), t, wave: 1 });
      if (q > 0.5) for (let k = 0; k < 10; k++) { ctx.globalAlpha = (q - 0.5) * 2; D.sphere(cx - 60 + hash(k, 1) * 120, by - 8 + hash(k, 2) * 4, 2.6, '#ffffff', { gloss: false, outline: '#9ccbee', outlineWidth: 0.8 }); ctx.globalAlpha = 1; }
    } else {                                                                                            // 물이 얾
      D.beaker(cx - 60, by - 90, 120, 90, { level: 0.6, liquid: '#cfe6fb', t, wave: 0.8 * (1 - q) });
      if (q > 0.01) { const th = 36 * 0.6 * q * 1.6; ctx.fillStyle = 'rgba(236,248,255,.95)'; ctx.fillRect(cx - 57, by - 90 * 0.6 - 3, 114, Math.min(th, 36)); ctx.strokeStyle = '#8fc4ea'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 57, by - 90 * 0.6 - 3, 114, Math.min(th, 36)); }
    }
    // 열 화살표
    if (run || (p >= 1)) {
      const a = p >= 1 ? 0.55 : 0.95, sh = Math.sin(t * 6) * 4;
      [-1, 1].forEach((s) => {
        const ax = cx + s * 78;
        if (hot) D.arrow(ax - s * 20, by - 54, ax + s * 12, by - 54 - 6 + sh * 0, { color: HOT, width: 4, head: 11, alpha: a });
        else D.arrow(ax + s * 12, by - 54, ax - s * 20, by - 54, { color: COLD, width: 4, head: 11, alpha: a });
      });
      T(rc.x + 12, rc.y + 24, hot ? '열 방출 (계 → 주위)' : '열 흡수 (주위 → 계)', 13, col, 'left', 800, HALO);
    }
    ctx.restore();
    // 온도계
    const tx = rc.x + rc.w * 0.78;
    D.thermometer(tx, rc.y + 26, 110, obT(i), c.lo, c.hi, { ticks: false, color: p > 0.02 ? col : '#8a95a8' });
    T(tx, rc.y + rc.h - 52, f1(obT(i)) + ' °C', 17, INK, 'center', 800, HALO);
    T(tx, rc.y + rc.h - 33, c.sense, 12, MUTED, 'center', 700, HALO);
    D.roundRect(rc.x, rc.y, rc.w, rc.h, 12); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function drawObs(t) {
    const L = RC.L, O = OBS(), i = O.sel, c = OC[i];
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🧪 저절로 일어나는 변화 6가지', PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '변화를 고르고 온도를 재서 발열인지 흡열인지 분류해요', PHONE ? 11.5 : 12.5, MUTED, 'left', 700);
    OC.forEach((cc, k) => {
      const r = ocRect(k), sel = k === i, bin = O.bin[k];
      D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = bin >= 0 ? (bin === 0 ? 'rgba(226,85,59,.09)' : 'rgba(47,127,216,.09)') : sel ? 'rgba(124,58,237,.07)' : '#fbfcff'; ctx.fill(); ctx.strokeStyle = sel ? PUR : bin >= 0 ? (bin === 0 ? HOT : COLD) : '#dbe3f3'; ctx.lineWidth = sel ? 2.6 : 1.5; ctx.stroke();
      const ls = wrap(cc.name, r.w - 14, 12.5, 800).slice(0, 2); ls.forEach((l, j) => T(r.x + 8, r.y + 20 + j * 16, l, 12.5, INK, 'left', 800));
      T(r.x + 8, r.y + r.h - 7, bin >= 0 ? (bin === 0 ? '🔥 발열' : '🧊 흡열') : obRan(k) ? '온도 확인' : '', 11.5, bin === 0 ? HOT : COLD, 'left', 800);
      if (O.stamp[k] > 0) D.ring(r.x + r.w - 14, r.y + 14, 10 + (0.7 - O.stamp[k]) * 14, t, { color: GOOD, width: 2.5 });
      else if (bin >= 0) D.check(r.x + r.w - 14, r.y + 14, 8, 1);
    });
    const rc = { x: L.x + 12, y: L.y + 196, w: L.w - 24, h: 232 };
    const sk = O.shake > 0 ? Math.sin(O.shake * 40) * 4 * O.shake : 0;
    ctx.save(); ctx.translate(sk, 0); drawObScene(i, O.run[i], rc, t); ctx.restore();
    textBlock(L.x + 14, rc.y + rc.h + 24, L.w - 28, obRan(i) ? c.note : '「온도 재기」를 눌러 ' + c.sense + '의 온도가 어떻게 변하는지 봐요.', 13, INK, 18, 800);
  }
  function drawObsInfo(t) {
    const R = RC.R, O = OBS();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '💭 가설: 발열 반응만 저절로 일어난다?', PHONE ? 13.5 : 13, INK, 'left', 800);
    const done = O.bin.every((b) => b >= 0);
    const bw = R.w - 20, bh = (R.h - 130) / 2 - 6;
    [0, 1].forEach((b) => {
      const y = R.y + 40 + b * (bh + 8), col = b === 0 ? HOT : COLD;
      D.roundRect(R.x + 10, y, bw, bh, 12); ctx.fillStyle = b === 0 ? 'rgba(226,85,59,.07)' : 'rgba(47,127,216,.07)'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
      T(R.x + 20, y + 22, b === 0 ? '🔥 발열 반응 (온도 ↑)' : '🧊 흡열 반응 (온도 ↓)', 13, col, 'left', 800);
      const list = OC.map((c, k) => ({ c, k })).filter((o) => O.bin[o.k] === b);
      list.forEach((o, j) => T(R.x + 22, y + 44 + j * 20, '• ' + o.c.name, 12.5, INK, 'left', 800));
      T(R.x + R.w - 18, y + 22, list.length + ' / 3', 12.5, col, 'right', 800);
    });
    const my = R.y + R.h - 76;
    D.roundRect(R.x + 10, my, bw, 66, 12); ctx.fillStyle = done ? 'rgba(20,160,88,.08)' : '#f6f7fb'; ctx.fill(); ctx.strokeStyle = done ? GOOD : '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    textBlock(R.x + 20, my + 24, bw - 20, done ? '흡열 반응 3가지도 저절로 일어나요. 발열이 아니어도 자발적일 수 있어요!' : '모두 저절로 일어나는 변화예요. 온도를 재서 분류해 봐요 (' + O.bin.filter((b) => b >= 0).length + ' / 6)', 12.5, done ? '#0f6b3c' : MUTED, 17, 800);
  }

  /* ================= ② 모형: 두 접시 저울 ================= */
  const RB = [
    { name: '얼음이 녹음', eq: 'H₂O(s) → H₂O(l)', dH: 1, dS: 1, Tc: 273.15, lo: -20, hi: 20, step: 0.5, t0: -10, hnote: 'ΔH > 0 (열 흡수, +6.0 kJ/mol)', snote: 'ΔS > 0 (고체 → 액체)', unit: '°C' },
    { name: '물이 얾', eq: 'H₂O(l) → H₂O(s)', dH: -1, dS: -1, Tc: 273.15, lo: -20, hi: 20, step: 0.5, t0: -10, hnote: 'ΔH < 0 (열 방출, −6.0 kJ/mol)', snote: 'ΔS < 0 (액체 → 고체)' },
    { name: 'H₂O₂ 분해', eq: '2H₂O₂(aq) → 2H₂O(l) + O₂(g)', dH: -1, dS: 1, Tc: null, lo: 0, hi: 100, step: 1, t0: 25, hnote: 'ΔH < 0 (열 방출, −196 kJ)', snote: 'ΔS > 0 (기체 O₂ 생성)' },
    { name: '암모니아 합성', eq: 'N₂(g) + 3H₂(g) → 2NH₃(g)', dH: -1, dS: -1, Tc: 462, lo: 0, hi: 500, step: 5, t0: 25, hnote: 'ΔH < 0 (열 방출, −92 kJ)', snote: 'ΔS < 0 (기체 4몰 → 2몰)' },
    { name: 'CaCO₃ 분해', eq: 'CaCO₃(s) → CaO(s) + CO₂(g)', dH: 1, dS: 1, Tc: 1108, lo: 0, hi: 1000, step: 10, t0: 25, hnote: 'ΔH > 0 (열 흡수, +178 kJ)', snote: 'ΔS > 0 (기체 CO₂ 생성)' },
    { name: '오존 생성', eq: '3O₂(g) → 2O₃(g)', dH: 1, dS: -1, Tc: null, lo: 0, hi: 100, step: 1, t0: 25, hnote: 'ΔH > 0 (열 흡수, +285 kJ)', snote: 'ΔS < 0 (기체 3몰 → 2몰)' },
  ];
  const NRB = RB.length;
  const BL = () => S.bl;
  const blSel = () => RB[BL().sel];
  const blT = () => BL().T[BL().sel];
  function blW(i, T) {                                                  // 두 요인의 (정성적) 무게. 엔탈피 요인은 일정, 엔트로피 요인은 온도에 비례
    const r = RB[i], TK = T + 273.15, wH = 1, wS = TK / (r.Tc || 298.15);
    const hFav = r.dH < 0, sFav = r.dS > 0, left = (hFav ? wH : 0) + (sFav ? wS : 0), right = (hFav ? 0 : wH) + (sFav ? 0 : wS);
    return { wH, wS, hFav, sFav, left, right, diff: left - right };
  }
  const blBalanced = () => Math.abs(blW(BL().sel, blT()).diff) < 0.005;
  function blSyncSlide() { const r = blSel(); const s = $('#tSlide'); s.min = r.lo; s.max = r.hi; s.step = r.step; s.value = blT(); s.style.setProperty('--pct', ((blT() - r.lo) / (r.hi - r.lo) * 100) + '%'); }
  function setBl(i) { BL().sel = i; Sound.tick(); blSyncSlide(); updateCtl(); }
  function setT(v) {
    const r = blSel(), B = BL(); v = clamp(Math.round(v / r.step) * r.step, r.lo, r.hi); B.T[B.sel] = v;
    if (B.sel === 0) { if (v <= -5) B.below = true; if (v >= 5) B.above = true; }
    updateCtl();
  }
  function stepBl(dt) {
    const B = BL(), w = blW(B.sel, blT()), tg = clamp(w.diff * 2.5, -0.32, 0.32);
    B.ang = ap2(B.ang, tg, dt, 5); B.wH = ap2(B.wH, w.wH, dt, 8); B.wS = ap2(B.wS, w.wS, dt, 8);
    const ice = RB[B.sel].Tc === 273.15 ? sm(clamp((blT() - 0) / 4 + 0.5, 0, 1)) : B.sel === 4 ? sm(clamp((blT() - 835) / 80 + 0.5, 0, 1)) : 0;
    B.ice = ap2(B.ice, ice, dt, 2.2);
  }
  function drawBal(t) {
    const L = RC.L, B = BL(), r = blSel(), T0v = blT(), w = blW(B.sel, T0v);
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '⚖️ ' + r.name + ': ' + r.eq, PHONE ? 13.5 : 15, INK, 'left', 800);
    T(L.x + 14, L.y + 46, '두 요인이 어느 쪽 접시에 놓이는지, 온도를 바꾸면 어떻게 달라지는지 봐요', PHONE ? 11 : 12.5, MUTED, 'left', 700);
    const cx = L.x + L.w / 2, py = L.y + 128, half = Math.min(150, L.w / 2 - 70), a = B.ang, hang = 96;
    // 받침대
    ctx.fillStyle = '#9aa6bb'; ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(cx - 28, py + 190); ctx.lineTo(cx + 28, py + 190); ctx.closePath(); ctx.fill();
    D.roundRect(cx - 64, py + 186, 128, 12, 6); ctx.fillStyle = '#7d8aa0'; ctx.fill();
    const lx = cx - half * Math.cos(a), ly = py + half * Math.sin(a), rx = cx + half * Math.cos(a), ry = py - half * Math.sin(a);
    ctx.strokeStyle = '#5b6b86'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke();
    D.sphere(cx, py, 9, '#7c3aed', { shadow: true });
    const pan = (ex, ey, title, fav, blocks) => {
      const pw = 128, py2 = ey + hang;
      ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - pw / 2, py2); ctx.moveTo(ex, ey); ctx.lineTo(ex + pw / 2, py2); ctx.stroke();
      D.roundRect(ex - pw / 2 - 4, py2, pw + 8, 10, 5); ctx.fillStyle = fav ? '#c4b5fd' : '#a9b6cc'; ctx.fill(); ctx.strokeStyle = '#6b7a95'; ctx.lineWidth = 1.5; ctx.stroke();
      let yy = py2;
      blocks.forEach((b) => {
        const h = clamp(b.w, 0.15, 2.7) * 22; yy -= h;
        D.roundRect(ex - 40, yy, 80, h - 1, 4); ctx.fillStyle = b.col; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
        if (h > 17) T(ex, yy + h / 2 + 4, b.short, 11.5, '#fff', 'center', 800);
      });
      T(ex, py2 + 32, title, 13, fav ? PUR : MUTED, 'center', 800);
    };
    const hb = { w: B.wH, col: '#d97706', short: '엔탈피', key: 'H' }, sb = { w: B.wS, col: '#7c3aed', short: '엔트로피', key: 'S' };
    const leftB = [], rightB = []; (w.hFav ? leftB : rightB).push(hb); (w.sFav ? leftB : rightB).push(sb);
    pan(lx, ly, '✅ 자발적 쪽', true, leftB); pan(rx, ry, '❌ 비자발적 쪽', false, rightB);
    // 판정 표시
    const bal = Math.abs(w.diff) < 0.005, v = bal ? '균형 (두 방향이 맞서요)' : w.diff > 0 ? '저절로 일어나요 (자발적)' : '저절로 일어나지 않아요 (비자발적)';
    D.label(cx, L.y + 74, v, { size: 14, bg: bal ? '#8a95a8' : w.diff > 0 ? GOOD : BAD, align: 'center' });
    T(L.x + 18, L.y + L.h - 130, '온도  ' + sgn(T0v, 1) + ' °C', 20, INK, 'left', 800);
    // 입자 모형 (얼음 ↔ 물, 석회석)
    const bx = L.x + L.w - 190, by = L.y + L.h - 146, bw = 172, bh = 128;
    if (B.sel <= 1 || B.sel === 4) {
      D.roundRect(bx, by, bw, bh, 10); ctx.fillStyle = '#f3f6fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
      const q = B.ice, N = 12;
      for (let i = 0; i < N; i++) {
        const rr = Math.floor(i / 4), cc = i % 4; const lat = [bx + 26 + cc * 40, by + 34 + rr * 30], liq = [bx + 18 + hash(i, 3) * (bw - 36), by + 62 + hash(i, 5) * 54];
        const jig = 1.2 + 6 * q; const x = lat[0] + (liq[0] - lat[0]) * q + Math.sin(t * 5 + i) * jig, y = lat[1] + (liq[1] - lat[1]) * q + Math.cos(t * 5.7 + i * 1.3) * jig;
        D.sphere(clamp(x, bx + 10, bx + bw - 10), clamp(y, by + 10, by + bh - 10), 7.5, B.sel === 4 ? (q > 0.5 ? '#f59e0b' : '#9aa6bb') : q > 0.5 ? '#4fa3e0' : '#cfe6fb', { outline: B.sel === 4 ? null : '#6fb0e6', outlineWidth: 1 });
      }
      T(bx + bw / 2, by + 20, B.sel === 4 ? (q > 0.5 ? '분해 → CaO + CO₂' : 'CaCO₃ 그대로') : q > 0.55 ? '액체 (물)' : q < 0.45 ? '고체 (얼음)' : '얼음과 물이 공존', 12.5, INK, 'center', 800);
    } else {
      textBlock(L.x + L.w - 190, L.y + L.h - 128, 172, r.Tc ? '' : (w.diff > 0 ? '온도에 관계없이 엔탈피 요인과 엔트로피 요인이 모두 자발적 쪽이에요.' : '온도에 관계없이 두 요인이 모두 비자발적 쪽이에요.'), 12.5, MUTED, 17, 700);
    }
  }
  function drawBalInfo(t) {
    const R = RC.R, B = BL(), r = blSel(), w = blW(B.sel, blT());
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '🧭 두 요인의 방향', 14.5, INK, 'left', 800);
    const row = (y, title, note, fav, col) => {
      D.roundRect(R.x + 10, y, R.w - 20, 70, 12); ctx.fillStyle = '#fbfcff'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
      T(R.x + 20, y + 22, title, 13.5, col, 'left', 800); textBlock(R.x + 20, y + 42, R.w - 100, note, 12.5, INK, 16, 700);
      D.label(R.x + R.w - 22, y + 36, fav ? '▲ 자발에 기여' : '▼ 방해', { size: 12.5, bg: fav ? GOOD : BAD, align: 'right' });
    };
    row(R.y + 38, '엔탈피 요인', r.hnote, w.hFav, '#d97706');
    row(R.y + 116, '엔트로피 요인', r.snote, w.sFav, '#7c3aed');
    const y = R.y + 200;
    textBlock(R.x + 14, y, R.w - 28, '🌡️ 온도를 높이면 엔트로피 요인의 무게만 커져요. 엔탈피 요인은 그대로예요.', 12.5, INK, 17, 800);
    const msg = r.Tc ? (r.dS > 0 && r.dH > 0 ? '엔탈피 요인은 방해, 엔트로피 요인은 도움이에요. 온도가 낮으면 방해가 이기고, 높으면 도움이 이겨요.' : '엔탈피 요인은 도움, 엔트로피 요인은 방해예요. 온도가 낮으면 도움이 이기고, 높으면 방해가 이겨요.') : (w.diff > 0 ? '두 요인이 모두 자발적 쪽이라 온도와 관계없이 저절로 일어나요.' : '두 요인이 모두 비자발적 쪽이라 온도와 관계없이 일어나지 않아요.');
    textBlock(R.x + 14, y + 52, R.w - 28, msg, 12.5, MUTED, 17, 700);
    if (B.sel === 0 && B.sel === 0) {
      const f = (ok) => (ok ? '✅' : '⬜');
      T(R.x + 14, R.y + R.h - 36, '−5 °C 이하 ' + f(B.below) + '   +5 °C 이상 ' + f(B.above), 12.5, B.below && B.above ? GOOD : MUTED, 'left', 800);
    }
  }

  /* ================= ③ 분석: 네 가지 경우 (2×2 표) ================= */
  const COND = ['모든 온도에서 자발', '낮은 온도에서만 자발', '높은 온도에서만 자발', '어떤 온도에서도 비자발'];
  const COND_S = ['모든 온도', '낮은 온도', '높은 온도', '없음'];
  const CELL = [
    { h: -1, s: 1, name: 'ΔH < 0, ΔS > 0', cond: 0, why: '발열이라 엔탈피 요인이 도움이고, 엔트로피 증가도 도움이에요. 두 요인이 모두 자발적 쪽이라 모든 온도에서 자발적이에요.' },
    { h: -1, s: -1, name: 'ΔH < 0, ΔS < 0', cond: 1, why: '발열은 도움이지만 엔트로피 감소는 방해예요. 온도가 높을수록 방해(엔트로피 요인)가 커지므로 낮은 온도에서만 자발적이에요.' },
    { h: 1, s: 1, name: 'ΔH > 0, ΔS > 0', cond: 2, why: '흡열은 방해이고 엔트로피 증가는 도움이에요. 온도가 높을수록 도움(엔트로피 요인)이 커지므로 높은 온도에서 자발적이에요.' },
    { h: 1, s: -1, name: 'ΔH > 0, ΔS < 0', cond: 3, why: '흡열도 엔트로피 감소도 방해예요. 두 요인이 모두 비자발적 쪽이라 어떤 온도에서도 비자발적이에요.' },
  ];
  const TC = [
    { t: '2H₂O₂(aq) → 2H₂O(l) + O₂(g)', cell: 0, dh: 'ΔH = −196 kJ (발열)', ds: '기체 O₂ 가 생겨요 → ΔS > 0' },
    { t: 'H₂O(l) → H₂O(s) (물이 얾)', cell: 1, dh: 'ΔH = −6.0 kJ/mol (발열)', ds: '액체 → 고체 → ΔS < 0' },
    { t: 'N₂(g) + 3H₂(g) → 2NH₃(g)', cell: 1, dh: 'ΔH = −92 kJ (발열)', ds: '기체 4몰 → 2몰 → ΔS < 0' },
    { t: 'H₂O(s) → H₂O(l) (얼음이 녹음)', cell: 2, dh: 'ΔH = +6.0 kJ/mol (흡열)', ds: '고체 → 액체 → ΔS > 0' },
    { t: 'CaCO₃(s) → CaO(s) + CO₂(g)', cell: 2, dh: 'ΔH = +178 kJ (흡열)', ds: '기체 CO₂ 가 생겨요 → ΔS > 0' },
    { t: '3O₂(g) → 2O₃(g) (오존 생성)', cell: 3, dh: 'ΔH = +285 kJ (흡열)', ds: '기체 3몰 → 2몰 → ΔS < 0' },
  ];
  const NTC = TC.length;
  const TB = () => S.tb;
  const tTray = (rank) => { const L = RC.L, w = (L.w - 24 - 16) / 3, h = 42; return { x: L.x + 12 + (rank % 3) * (w + 8), y: L.y + 56 + Math.floor(rank / 3) * (h + 8), w, h }; };
  const tCell = (c) => {
    const L = RC.L, hw = 62, gw = (L.w - 24 - hw - 8) / 2, top = L.y + 56 + 2 * 50 + 34, rh = (L.y + L.h - 12 - top) / 2 - 4;
    return { x: L.x + 12 + hw + 4 + (c % 2) * (gw + 4), y: top + Math.floor(c / 2) * (rh + 6), w: gw, h: rh };
  };
  function tbInit() {
    const order = [3, 0, 5, 1, 4, 2];
    S.tb.cards = order.map((id, k) => { const r = tTray(k); return { id, x: r.x, y: r.y, w: r.w, h: r.h, cell: -1, ord: 0, slot: k }; });
    S.tb.sel = -1; S.tb.cell = -1; S.tb.cond = [-1, -1, -1, -1]; S.tb.drag = null; S.tb.cnt = 0;
  }
  function tbPlace(i, cell) {
    const P = TB(), c = P.cards[i]; if (c.cell === cell) return; c.cell = cell; c.ord = ++P.cnt; P.sel = -1; P.cell = cell; Sound.tick(); updateCtl();
  }
  function tbSetCond(k) { const P = TB(); if (P.cell < 0) return; P.cond[P.cell] = k; Sound.tick(); updateCtl(); }
  const tbPlaced = () => TB().cards.filter((c) => c.cell >= 0).length;
  const tbWrong = () => TB().cards.filter((c) => c.cell >= 0 && c.cell !== TC[c.id].cell);
  const tbCondWrong = () => CELL.map((c, i) => i).filter((i) => TB().cond[i] !== CELL[i].cond);
  function cellTargets(cell) {
    const r = tCell(cell), list = TB().cards.map((c, i) => ({ c, i })).filter((o) => o.c.cell === cell).sort((a, z) => a.c.ord - z.c.ord), out = {};
    const pitch = Math.min(26, (r.h - 42) / Math.max(3, list.length));
    list.forEach((o, k) => { out[o.i] = { x: r.x + 5, y: r.y + 8 + k * pitch, w: r.w - 10, h: pitch - 3 }; });
    return out;
  }
  function stepTb(dt) {
    const P = TB(), tg = [0, 1, 2, 3].map(cellTargets), rank = {};
    P.cards.map((c, i) => ({ c, i })).filter((o) => o.c.cell < 0).sort((a, z) => a.c.slot - z.c.slot).forEach((o, k) => { rank[o.i] = k; });
    P.cards.forEach((c, i) => {
      if (P.drag && P.drag.i === i) return;
      const t = c.cell < 0 ? tTray(rank[i]) : tg[c.cell][i];
      c.x = ap2(c.x, t.x, dt, 12); c.y = ap2(c.y, t.y, dt, 12); c.w = ap2(c.w, t.w, dt, 12); c.h = ap2(c.h, t.h, dt, 12);
    });
  }
  function drawTab(t) {
    const L = RC.L, P = TB();
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🔲 반응 카드를 알맞은 칸에 놓고, 자발적인 온도를 골라요', PHONE ? 12.5 : 14.5, INK, 'left', 800);
    // 표 머리
    const tr = tCell(0), tr1 = tCell(1), top = tr.y;
    [['ΔS > 0', tr], ['ΔS < 0', tr1]].forEach((h) => { D.roundRect(h[1].x, top - 30, h[1].w, 26, 8); ctx.fillStyle = '#eef1f8'; ctx.fill(); T(h[1].x + h[1].w / 2, top - 12, h[0] + (h[0] === 'ΔS > 0' ? ' (배열 ↑)' : ' (배열 ↓)'), 13, INK, 'center', 800); });
    [['ΔH < 0', '발열', 0], ['ΔH > 0', '흡열', 2]].forEach((h) => { const c = tCell(h[2]); D.roundRect(L.x + 12, c.y, 58, c.h, 8); ctx.fillStyle = '#eef1f8'; ctx.fill(); T(L.x + 41, c.y + c.h / 2 - 4, h[0], 13, INK, 'center', 800); T(L.x + 41, c.y + c.h / 2 + 14, '(' + h[1] + ')', 12.5, MUTED, 'center', 800); });
    CELL.forEach((cl, i) => {
      const r = tCell(i), sel = P.cell === i;
      D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = sel ? 'rgba(124,58,237,.07)' : '#fbfcff'; ctx.fill(); ctx.strokeStyle = sel ? PUR : '#cfd6e6'; ctx.lineWidth = sel ? 2.8 : 1.5; ctx.stroke();
      const cd = P.cond[i];
      D.roundRect(r.x + 5, r.y + r.h - 28, r.w - 10, 23, 7); ctx.fillStyle = cd >= 0 ? 'rgba(124,58,237,.12)' : '#f1f3f8'; ctx.fill(); ctx.strokeStyle = cd >= 0 ? PUR : '#c7cedd'; ctx.lineWidth = 1.2; ctx.stroke();
      T(r.x + r.w / 2, r.y + r.h - 12, cd >= 0 ? '자발 온도: ' + COND_S[cd] : '자발 온도: ?  (칸을 눌러 고르기)', 12, cd >= 0 ? PUR : '#8a95a8', 'center', 800);
    });
    const drawCard = (c, i, lift) => {
      const sel = P.sel === i, small = c.cell >= 0 && !lift;
      ctx.save(); if (lift) { ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; }
      D.roundRect(c.x, c.y, c.w, c.h, small ? 6 : 9); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
      D.roundRect(c.x, c.y, c.w, c.h, small ? 6 : 9); ctx.strokeStyle = sel ? PUR : '#cfd6e6'; ctx.lineWidth = sel ? 2.8 : 1.4; ctx.stroke();
      const txt = TC[c.id].t;
      if (small) { ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 6); ctx.clip(); const ls = wrap(txt, 9999, 11, 800); T(c.x + 6, c.y + c.h / 2 + 4, ls[0].replace(/ \(.*\)$/, ''), Math.min(11, Math.max(9.5, c.h - 4)), INK, 'left', 800); ctx.restore(); }
      else { const ls = wrap(txt, c.w - 10, 11.5, 800); ls.slice(0, 2).forEach((l, k) => T(c.x + c.w / 2, c.y + c.h / 2 + (ls.length > 1 ? (k - 0.5) * 14 + 4 : 4), l, 11.5, INK, 'center', 800)); }
    };
    P.cards.forEach((c, i) => { if (!(P.drag && P.drag.i === i)) drawCard(c, i, false); });
    if (P.drag) drawCard(P.cards[P.drag.i], P.drag.i, true);
  }
  function drawTabInfo(t) {
    const R = RC.R, P = TB();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '🔎 카드 정보', 14.5, INK, 'left', 800);
    let y = R.y + 50;
    if (P.sel >= 0) {
      const tc = TC[P.cards[P.sel].id];
      y += textBlock(R.x + 14, y, R.w - 28, tc.t, 13.5, INK, 18, 800) + 8;
      T(R.x + 14, y, '열의 출입', 12, MUTED, 'left', 800); y += 18; y += textBlock(R.x + 14, y, R.w - 28, tc.dh, 13, tc.dh.includes('발열') ? HOT : COLD, 17, 800) + 8;
      T(R.x + 14, y, '입자의 배열', 12, MUTED, 'left', 800); y += 18; y += textBlock(R.x + 14, y, R.w - 28, tc.ds, 13, PUR, 17, 800) + 8;
    } else y += textBlock(R.x + 14, y, R.w - 28, '카드를 누르면 ΔH 와 ΔS 에 대한 정보가 나와요. 정보를 보고 알맞은 칸에 놓아요.', 13, MUTED, 18, 700) + 8;
    const cy = Math.max(y + 6, R.y + R.h - 148);
    D.roundRect(R.x + 10, cy, R.w - 20, R.y + R.h - cy - 10, 12); ctx.fillStyle = '#f6f7fb'; ctx.fill(); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
    if (P.cell >= 0) { const cl = CELL[P.cell]; T(R.x + 20, cy + 22, '선택한 칸: ' + cl.name, 13, PUR, 'left', 800); textBlock(R.x + 20, cy + 42, R.w - 40, '조작판에서 이 칸의 자발 온도 조건을 골라요. 힌트: 온도가 높을수록 엔트로피 요인이 커져요.', 12.5, MUTED, 16, 700); }
    else textBlock(R.x + 20, cy + 28, R.w - 40, '놓은 카드 ' + tbPlaced() + ' / ' + NTC + ' · 고른 조건 ' + P.cond.filter((c) => c >= 0).length + ' / 4', 13, MUTED, 18, 700);
  }

  /* ================= ④ 적용: 사례 판정 ================= */
  const AP = [
    { name: '석회 가마', q: '석회석(CaCO₃)을 가열해 생석회(CaO)와 CO₂ 를 얻는 가마예요. ΔH = +178 kJ(흡열)이고 기체가 생겨 ΔS > 0 이에요. 가마를 몇 °C 로 가열해야 분해가 저절로 일어날까요?',
      ch: ['25 °C (실온)', '300 °C', '600 °C', '900 °C'], ans: 3, temps: [25, 300, 600, 900],
      fb: ['흡열이라 엔탈피 요인이 방해예요. 온도가 낮으면 엔트로피 요인이 너무 작아서 분해가 일어나지 않아요.', '아직 엔트로피 요인이 충분히 커지지 않았어요. 더 높은 온도가 필요해요.', '600 °C 도 부족해요. 약 800 °C 이상이 되어야 엔트로피 요인이 이겨요.', ''],
      ok: '약 800 °C 이상에서는 높은 온도 때문에 커진 엔트로피 요인이 열 흡수(방해)를 이겨요. 그래서 석회 가마는 고온으로 가열해요.' },
    { name: '암모니아 합성', q: 'N₂ + 3H₂ → 2NH₃ 는 ΔH < 0, ΔS < 0 이에요. 자발성만 보면 낮은 온도가 유리하지만, 낮은 온도에서는 반응이 너무 느려요. 실제 공정은 어떻게 할까요?',
      ch: ['아주 높은 온도(1000 °C 이상)에서 촉매 없이 반응시켜요', '낮은 온도가 자발성에 유리하지만 느리므로, 촉매를 쓰고 400~500 °C 정도로 타협해요', '낮은 온도에서 느리면 그 반응은 비자발적이라는 뜻이에요', '온도를 높일수록 자발성도 속도도 좋아져요'], ans: 1, temps: [1000, 450, 25, 1000],
      fb: ['온도가 높아지면 ΔS < 0 인 이 반응은 엔트로피 요인이 방해로 커져서 자발성이 나빠져요.', '', '자발적인 것과 빠른 것은 달라요. 느려도 자발적일 수 있어요.', '온도를 높이면 속도는 빨라지지만 이 반응의 자발성은 나빠져요.'],
      ok: '자발성(낮은 온도가 유리)과 속도(높은 온도가 유리)가 충돌해요. 그래서 촉매로 속도를 높이고 400~500 °C 로 타협해요. (속도는 다음 단원에서 배워요.)' },
    { name: '오존 생성', q: '3O₂ → 2O₃ 는 ΔH = +285 kJ(흡열), 기체 3몰 → 2몰(ΔS < 0)이에요. 공기 중에서 오존이 저절로 많이 만들어지지 않는 까닭은?',
      ch: ['반응이 너무 느려서 그래요', '흡열이면서 ΔS < 0 이라 어떤 온도에서도 비자발적이에요. 번개·자외선 같은 에너지를 주어야 만들어져요', '온도가 낮아서 그래요. 온도를 높이면 저절로 만들어져요', '산소가 부족해서 그래요'], ans: 1, temps: [25, 25, 800, 25],
      fb: ['속도의 문제가 아니라 자발성 자체가 없어요.', '', '온도를 높이면 엔트로피 요인(방해)이 오히려 더 커져요.', '산소는 공기 중에 충분히 있어요.'],
      ok: '두 요인이 모두 비자발적 쪽이라 어떤 온도에서도 저절로 일어나지 않아요. 에너지를 공급하는 번개나 자외선이 있어야 오존이 만들어져요.' },
    { name: '얼어붙는 호수', q: '겨울 호수의 물이 어는 변화 H₂O(l) → H₂O(s) 는 ΔH < 0, ΔS < 0 이에요. 물은 어떤 온도 조건에서 저절로 얼까요?',
      ch: ['0 °C 아래에서 저절로 얼어요', '어느 온도에서나 저절로 얼어요', '0 °C 위에서 저절로 얼어요', '저절로는 얼지 않아요'], ans: 0, temps: [-5, 20, 20, 20],
      fb: ['', '온도가 높으면 엔트로피 요인(방해)이 커져서 물이 얼지 않아요.', '0 °C 위에서는 엔트로피 요인이 이겨서 오히려 얼음이 녹아요.', '추운 겨울에 물은 실제로 얼어요.'],
      ok: '발열은 도움이고 엔트로피 감소는 방해예요. 온도가 낮을 때 방해가 작아 도움이 이기므로 0 °C 아래에서 저절로 얼어요.' },
  ];
  const NAP = AP.length;
  const APS = () => S.ap;
  const apOkN = () => APS().ok.filter((v) => v).length;
  function setAp(i) { APS().sel = i; Sound.tick(); updateCtl(); }
  function apAnswer(c) {
    const A = APS(), i = A.sel, p = AP[i]; if (A.ok[i]) return;
    A.pick[i] = c;
    if (c === p.ans) { A.ok[i] = true; A.anim[i] = 0.001; A.msg[i] = p.ok; Sound.success(); parts.burst(RC.L.x + RC.L.w / 2, RC.L.y + 120, { count: 20, speed: 160, life: 0.8, size: 4 }); }
    else { A.msg[i] = p.fb[c]; A.shake = 1; A.wrong[i]++; Sound.fail(); showHint(p.fb[c], 5200); }
    updateCtl();
  }
  function stepAp(dt) { const A = APS(); for (let i = 0; i < NAP; i++) if (A.ok[i]) A.anim[i] = ap2(A.anim[i], 1, dt, 1.1); if (A.shake > 0) A.shake = Math.max(0, A.shake - dt * 2.5); }
  function drawApScene(i, a, rc, t) {                                      // a: 0~1 (정답을 고르면 결과가 나타나요)
    ctx.save(); D.roundRect(rc.x, rc.y, rc.w, rc.h, 12); ctx.clip();
    const cx = rc.x + rc.w * 0.4, by = rc.y + rc.h - 24;
    if (i === 0) {                                                          // 석회 가마
      ctx.fillStyle = '#e9f3fb'; ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
      ctx.fillStyle = '#d7dce6'; ctx.fillRect(rc.x, by, rc.w, 30);
      D.roundRect(cx - 62, by - 130, 124, 130, 10); ctx.fillStyle = '#b9805e'; ctx.fill(); ctx.strokeStyle = '#7a4d34'; ctx.lineWidth = 3; ctx.stroke();
      D.roundRect(cx - 40, by - 80, 80, 80, 8); ctx.fillStyle = '#2b2430'; ctx.fill();
      D.flame(cx, by - 4, 26 + 40 * a, t);
      for (let k = 0; k < 6; k++) D.sphere(cx - 24 + k * 10, by - 12, 5, '#e6e1d4', { gloss: false, outline: '#b5b09f', outlineWidth: 0.8 });
      if (a > 0.3) for (let k = 0; k < 7; k++) { const ph = ((t * 0.5 + k / 7) % 1), al = clamp((a - 0.3) * 1.6, 0, 1) * (1 - ph); ctx.globalAlpha = al; D.sphere(cx - 10 + Math.sin(k * 3 + t) * 22, by - 134 - ph * 70, 7 + ph * 5, '#9aa6bb', { gloss: false }); ctx.globalAlpha = 1; }
      if (a > 0.5) T(cx + 70, by - 170, 'CO₂ ↑', 14, '#6b7a95', 'left', 800, HALO);
      T(rc.x + 14, rc.y + 24, '석회 가마 (CaCO₃ → CaO + CO₂)', 13, INK, 'left', 800);
    } else if (i === 1) {                                                   // 암모니아 합성 반응기
      ctx.fillStyle = '#eef3fb'; ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
      D.roundRect(cx - 60, rc.y + 50, 120, 150, 14); ctx.fillStyle = '#c3cbd9'; ctx.fill(); ctx.strokeStyle = '#7d8aa0'; ctx.lineWidth = 3; ctx.stroke();
      D.roundRect(cx - 44, rc.y + 112, 88, 30, 6); ctx.fillStyle = a > 0 ? 'rgba(217,119,6,.75)' : 'rgba(217,119,6,.35)'; ctx.fill(); T(cx, rc.y + 132, '촉매', 12.5, '#fff', 'center', 800);
      T(cx, rc.y + 70, 'N₂ + H₂', 12.5, INK, 'center', 800); T(cx, rc.y + 190, a > 0.2 ? 'NH₃' : '', 13, '#0f6b3c', 'center', 800);
      D.arrow(cx, rc.y + 20, cx, rc.y + 46, { color: '#7d8aa0', width: 4, head: 10 }); D.arrow(cx, rc.y + 204, cx, rc.y + 230, { color: GOOD, width: 4, head: 10, alpha: a });
      const tx = rc.x + rc.w * 0.8; D.thermometer(tx, rc.y + 36, 110, a > 0 ? 450 : 25, 0, 600, { ticks: false, color: a > 0 ? HOT : '#8a95a8' }); T(tx, rc.y + rc.h - 50, (a > 0 ? '400~500' : '25') + ' °C', 14, INK, 'center', 800, HALO);
    } else if (i === 2) {                                                   // 오존
      ctx.fillStyle = C.mix('#dff0ff', '#2b3358', 0.0); ctx.fillStyle = '#e8f2fc'; ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
      for (let k = 0; k < 6; k++) mol(rc.x + 60 + (k % 3) * 80 + Math.sin(t * 2 + k) * 5, rc.y + 150 + Math.floor(k / 3) * 40 + Math.cos(t * 2.3 + k) * 5, 'o2', 1, 1.1);
      if (a > 0.01) {
        const fl = a < 0.99 ? Math.max(0, Math.sin(a * 30)) : 0;
        ctx.strokeStyle = 'rgba(250,204,21,' + (0.5 + 0.5 * fl) + ')'; ctx.lineWidth = 4; ctx.beginPath(); const bx = rc.x + rc.w * 0.6; ctx.moveTo(bx, rc.y + 10); ctx.lineTo(bx - 14, rc.y + 60); ctx.lineTo(bx + 6, rc.y + 62); ctx.lineTo(bx - 12, rc.y + 120); ctx.stroke();
        T(bx + 20, rc.y + 70, '번개·자외선', 12.5, '#b45309', 'left', 800, HALO);
        for (let k = 0; k < 3; k++) { ctx.globalAlpha = a; mol(rc.x + rc.w * 0.75 + (k % 2) * 40, rc.y + 190 + k * 20, 'o3', 1, 1); ctx.globalAlpha = 1; }
        T(rc.x + rc.w * 0.78, rc.y + 152, 'O₃', 13, '#6d3fd0', 'left', 800);
      }
      T(rc.x + 14, rc.y + 24, '공기 중의 산소 (O₂)', 13, INK, 'left', 800);
    } else {                                                                // 얼어붙는 호수
      ctx.fillStyle = '#e6f1fb'; ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
      ctx.fillStyle = '#9fcdf2'; ctx.fillRect(rc.x, rc.y + 120, rc.w, rc.h - 120);
      const th = 30 * a; ctx.fillStyle = 'rgba(240,250,255,.95)'; ctx.fillRect(rc.x, rc.y + 120, rc.w, th); ctx.strokeStyle = '#8fc4ea'; ctx.lineWidth = 1.5; ctx.strokeRect(rc.x + 1, rc.y + 120, rc.w - 2, th);
      for (let k = 0; k < 4; k++) { D.sphere(rc.x + 40 + k * 90, rc.y + 40 + (k % 2) * 16, 14 + (k % 2) * 4, '#fff', { gloss: false, outline: '#d5e3f0', outlineWidth: 1 }); }
      const tx = rc.x + rc.w * 0.82; D.thermometer(tx, rc.y + 20, 74, a > 0 ? -5 : 5, -12, 12, { ticks: false, color: a > 0 ? COLD : '#8a95a8' }); T(tx, rc.y + 128 + 40, (a > 0 ? '−5' : '5') + ' °C', 14, INK, 'center', 800, HALO);
      T(rc.x + 14, rc.y + 24, '겨울 호수 (H₂O(l) → H₂O(s))', 13, INK, 'left', 800);
    }
    ctx.restore(); D.roundRect(rc.x, rc.y, rc.w, rc.h, 12); ctx.strokeStyle = '#dbe3f3'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function mol(x, y, kind, a, sc) {                                      // 산소·오존 분자 모형
    sc = sc || 1; ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    const O = (xx, yy) => D.sphere(x + xx * sc, y + yy * sc, 9 * sc, kind === 'o3' ? '#8b5cf6' : '#e2464b', { shadow: false });
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 3 * sc; ctx.beginPath();
    if (kind === 'o2') { ctx.moveTo(x - 9 * sc, y); ctx.lineTo(x + 9 * sc, y); } else { ctx.moveTo(x - 14 * sc, y + 8 * sc); ctx.lineTo(x, y - 6 * sc); ctx.lineTo(x + 14 * sc, y + 8 * sc); }
    ctx.stroke();
    if (kind === 'o2') { O(-10, 0); O(10, 0); } else { O(-15, 8); O(0, -7); O(15, 8); }
    ctx.restore();
  }
  function drawApp(t) {
    const L = RC.L, A = APS(), i = A.sel, p = AP[i];
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 26, '🏠 사례 ' + (i + 1) + ': ' + p.name, PHONE ? 14 : 15, INK, 'left', 800);
    T(L.x + L.w - 14, L.y + 26, '맞힌 사례 ' + apOkN() + ' / ' + NAP, 13, apOkN() >= 3 ? GOOD : MUTED, 'right', 800);
    const rc = { x: L.x + 12, y: L.y + 44, w: L.w - 24, h: 252 }, sk = A.shake > 0 ? Math.sin(A.shake * 40) * 4 * A.shake : 0;
    ctx.save(); ctx.translate(sk, 0); drawApScene(i, A.anim[i], rc, t); ctx.restore();
    const h = textBlock(L.x + 14, rc.y + rc.h + 26, L.w - 28, p.q, PHONE ? 12.5 : 13, INK, 18, 800);
    if (A.msg[i]) textBlock(L.x + 14, rc.y + rc.h + 34 + h, L.w - 28, (A.ok[i] ? '✅ ' : '🤔 ') + A.msg[i], 12.5, A.ok[i] ? '#0f6b3c' : BAD, 17, 800);
  }
  function drawAppInfo(t) {
    const R = RC.R, A = APS();
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '📝 판정 기준', 14.5, INK, 'left', 800);
    const rules = ['ΔH < 0 : 열을 내놓아요 → 자발에 기여', 'ΔS > 0 : 배열의 수가 늘어요 → 자발에 기여', '온도가 높을수록 엔트로피 요인이 커져요', '자발적 ≠ 빠름 · 비자발적 ≠ 불가능'];
    let y = R.y + 50;
    rules.forEach((s) => { D.sphere(R.x + 18, y - 4, 4, PUR, { gloss: false }); y += textBlock(R.x + 30, y, R.w - 44, s, 12.5, INK, 17, 700) + 6; });
    y += 8;
    NAP > 0 && AP.forEach((q, k) => { D.sphere(R.x + 24 + k * 30, y + 14, 11, A.ok[k] ? GOOD : k === A.sel ? PUR : '#c7cedd', { text: String(k + 1), shadow: false }); });
    T(R.x + 14, y + 46, '맞힌 사례 ' + apOkN() + ' / ' + NAP + ' (3개 이상이면 통과)', 12.5, apOkN() >= 3 ? GOOD : MUTED, 'left', 800);
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'obs', fade: 0, lock: false, t: 0,
    ob: { sel: 0, run: new Array(NOC).fill(0), go: new Array(NOC).fill(false), bin: new Array(NOC).fill(-1), stamp: new Array(NOC).fill(0), shake: 0 },
    bl: { sel: 0, T: RB.map((r) => r.t0), ang: 0, wH: 1, wS: 1, ice: 0, below: false, above: false },
    tb: { cards: [], sel: -1, cell: -1, cond: [-1, -1, -1, -1], drag: null, cnt: 0 },
    ap: { sel: 0, pick: [-1, -1, -1, -1], ok: [false, false, false, false], anim: [0, 0, 0, 0], msg: ['', '', '', ''], wrong: [0, 0, 0, 0], shake: 0 },
  };
  let game = null;

  /* ================= 조작판 ================= */
  function buildCtl() {
    OC.forEach((c, i) => $('#oChips').appendChild(chipBtn(c.name, c.name, () => setObSel(i))));
    RB.forEach((r, i) => $('#bChips').appendChild(chipBtn(r.name, r.name, () => setBl(i))));
    COND.forEach((c, k) => { const b = chipBtn(c, c, () => tbSetCond(k), 'opt'); $('#cOpts').appendChild(b); });
    AP.forEach((p, i) => $('#aChips').appendChild(chipBtn(p.name, p.name, () => setAp(i))));
    for (let k = 0; k < 4; k++) { const b = chipBtn('', '', () => apAnswer(k), 'opt'); b.dataset.k = k; $('#aOpts').appendChild(b); }
  }
  function updateCtl() {
    $$('#ctrlCard [data-show]').forEach((n) => { n.hidden = n.getAttribute('data-show') !== S.mode; });
    $('#modeSeg').hidden = S.lock;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const O = OBS(), i = O.sel, running = O.go[i];
    $$('#oChips button').forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('done', O.bin[k] >= 0); });
    $('#bOMeas').textContent = running ? '⏳ 재는 중…' : obRan(i) ? '↻ 다시 재기' : '🌡️ 온도 재기'; $('#bOMeas').disabled = running;
    $('#bOExo').disabled = !obRan(i) || O.bin[i] >= 0; $('#bOEndo').disabled = !obRan(i) || O.bin[i] >= 0;
    $('#bOExo').classList.toggle('on', O.bin[i] === 0); $('#bOEndo').classList.toggle('on', O.bin[i] === 1);
    $('#oNote').textContent = O.bin[i] >= 0 ? '✅ 분류했어요. 분류한 변화 ' + O.bin.filter((b) => b >= 0).length + ' / 6' : obRan(i) ? '온도가 어떻게 변했나요? 발열인지 흡열인지 골라요.' : '먼저 온도를 재요. (분류한 변화 ' + O.bin.filter((b) => b >= 0).length + ' / 6)';
    const B = BL();
    $$('#bChips button').forEach((b, k) => b.classList.toggle('on', k === B.sel));
    $('#tSlide').value = blT(); $('#tSlide').style.setProperty('--pct', ((blT() - blSel().lo) / (blSel().hi - blSel().lo) * 100) + '%'); $('#tLab').textContent = '🌡️ 온도: ' + sgn(blT(), 1) + ' °C';
    $('#tNote').textContent = blSel().Tc && (B.sel === 0 || B.sel === 1) ? '저울이 수평이 되는 온도를 찾아봐요. (' + blSel().lo + ' ~ ' + blSel().hi + ' °C)' : '온도를 바꾸며 저울이 어느 쪽으로 기우는지 봐요. (' + blSel().lo + ' ~ ' + blSel().hi + ' °C)';
    const P = TB();
    $$('#cOpts .opt').forEach((b, k) => { b.disabled = P.cell < 0; b.classList.toggle('on', P.cell >= 0 && P.cond[P.cell] === k); });
    $('#cLab').textContent = P.cell >= 0 ? '🌡️ ' + CELL[P.cell].name + ' 인 칸: 저절로 일어나는 온도' : '🌡️ 먼저 칸을 눌러 골라요';
    $('#cNote').textContent = '놓은 카드 ' + tbPlaced() + ' / ' + NTC + ' · 고른 조건 ' + P.cond.filter((c) => c >= 0).length + ' / 4';
    const A = APS(), q = AP[A.sel];
    $$('#aChips button').forEach((b, k) => { b.classList.toggle('on', k === A.sel); b.classList.toggle('done', A.ok[k]); });
    $('#aQ').textContent = '🤔 ' + q.name + ': 알맞은 것을 골라요';
    $$('#aOpts .opt').forEach((b, k) => { b.textContent = q.ch[k]; b.classList.toggle('ok', A.ok[A.sel] && k === q.ans); b.classList.toggle('no', !A.ok[A.sel] && A.pick[A.sel] === k); });
    $('#aNote').textContent = '맞힌 사례 ' + apOkN() + ' / ' + NAP;
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
  }
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#bOMeas').addEventListener('click', obMeasure);
  $('#bOExo').addEventListener('click', () => obClassify(true));
  $('#bOEndo').addEventListener('click', () => obClassify(false));
  $('#tSlide').addEventListener('input', (e) => setT(+e.target.value));
  $('#tMinus').addEventListener('click', () => { Sound.tick(); setT(blT() - blSel().step * (blSel().step < 1 ? 1 : 5)); });
  $('#tPlus').addEventListener('click', () => { Sound.tick(); setT(blT() + blSel().step * (blSel().step < 1 ? 1 : 5)); });
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); S.fade = 0.5; parts.clear();
    if (S.mode === 'obs') resetOb(); else if (S.mode === 'bal') resetBl(); else if (S.mode === 'tab') tbInit(); else resetAp();
    updateCtl();
  });
  /* 포인터: 변화 카드 누르기(관찰), 카드 끌기·칸 누르기(네 가지 경우) */
  const tcAt = (p) => { const P = TB(); for (let i = P.cards.length - 1; i >= 0; i--) if (inRect(p, P.cards[i])) return i; return -1; };
  const cellAt = (p) => { for (let c = 0; c < 4; c++) if (inRect(p, tCell(c))) return c; return -1; };
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'obs') { for (let k = 0; k < NOC; k++) if (inRect(p, ocRect(k))) { setObSel(k); break; } return false; }
      if (S.mode !== 'tab') return false;
      const P = TB(), i = tcAt(p);
      if (i >= 0) { P.sel = i; if (P.cards[i].cell >= 0) P.cell = P.cards[i].cell; P.drag = { i, sx: p.x, sy: p.y, moved: false }; Sound.tick(); updateCtl(); return true; }
      const c = cellAt(p); if (c >= 0) { if (P.sel >= 0 && P.cards[P.sel].cell < 0) tbPlace(P.sel, c); else { P.sel = -1; P.cell = c; Sound.tick(); updateCtl(); } }
      return false;
    },
    move(p) { const P = TB(), d = P.drag; if (!d) return; const c = P.cards[d.i], tr = tTray(0); if (Math.hypot(p.x - d.sx, p.y - d.sy) > 6) d.moved = true; if (d.moved) { c.w = tr.w; c.h = tr.h; c.x = p.x - c.w / 2; c.y = p.y - c.h / 2; } },
    up(p) {
      const P = TB(), d = P.drag; if (!d) return; P.drag = null; if (!d.moved) return; const c = P.cards[d.i], cl = cellAt(p);
      if (cl >= 0) tbPlace(d.i, cl); else if (c.cell >= 0 && p.y < tCell(0).y - 30) { c.cell = -1; Sound.tick(); updateCtl(); }
    },
    hover(p) { if (S.mode === 'obs') { for (let k = 0; k < NOC; k++) if (inRect(p, ocRect(k))) return 'pointer'; return null; } return S.mode === 'tab' && (tcAt(p) >= 0 || cellAt(p) >= 0) ? 'pointer' : null; },
  });
  $('#cv').style.touchAction = 'pan-y';
  $('#cv').addEventListener('touchstart', (e) => { if (S.mode !== 'tab' || !e.touches.length) return; const p = view.toLocal(e.touches[0]); if (tcAt(p) >= 0) e.preventDefault(); }, { passive: false });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'obs') { const O = OBS(), i = O.sel; L1 = '고른 변화'; a = OC[i].name; L2 = '온도 변화'; b = O.run[i] > 0 ? sgn(obT(i) - OC[i].t0, 1) + ' °C' : '—'; L3 = '분류한 변화'; c = O.bin.filter((v) => v >= 0).length + ' / 6'; }
    else if (S.mode === 'bal') { const B = BL(), w = blW(B.sel, blT()); L1 = '온도'; a = sgn(blT(), 1) + ' °C'; L2 = '저울'; b = Math.abs(w.diff) < 0.005 ? '수평 (균형)' : w.diff > 0 ? '자발적 쪽으로 기울어요' : '비자발적 쪽으로 기울어요'; L3 = '엔트로피 요인'; c = w.sFav ? '▲ 자발에 기여' : '▼ 방해'; }
    else if (S.mode === 'tab') { const P = TB(); L1 = '놓은 카드'; a = tbPlaced() + ' / ' + NTC; L2 = '고른 조건'; b = P.cond.filter((v) => v >= 0).length + ' / 4'; L3 = '선택한 칸'; c = P.cell >= 0 ? CELL[P.cell].name : '—'; }
    else { const A = APS(); L1 = '사례'; a = AP[A.sel].name; L2 = '맞힌 사례'; b = apOkN() + ' / ' + NAP; L3 = '틀린 횟수'; c = A.wrong.reduce((x, y) => x + y, 0) + '번'; }
    const k = [L1, a, L2, b, L3, c].join('|'); if (k === rlast) return; rlast = k;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  const resetOb = () => { const O = OBS(); O.sel = 0; O.run.fill(0); O.go.fill(false); O.bin.fill(-1); O.stamp.fill(0); O.shake = 0; };
  const resetBl = () => { const B = BL(); B.sel = 0; B.T = RB.map((r) => r.t0); B.below = false; B.above = false; blSyncSlide(); };
  const resetAp = () => { const A = APS(); A.sel = 0; A.pick.fill(-1); A.ok.fill(false); A.anim.fill(0); A.msg.fill(''); A.wrong.fill(0); };

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '발열이면 저절로 일어날까?', short: '발열이면 자발?', icon: '👀', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 발열 반응은 항상 저절로 일어날까? 흡열인데도 저절로 일어나는 변화는 왜 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시들에서</b> 반응의 열 출입(ΔH)과 엔트로피(입자 배열의 수)를 배웠어요. 이번에는 두 가지를 합쳐 변화가 저절로 일어나는지를 설명해요.</div>' +
        '<p><b>자발적</b> 변화는 바깥에서 계속 도와주지 않아도 저절로 일어나려는 경향이 있는 변화예요. 열을 내놓는 발열 반응만 자발적이라고 생각할 수 있어요. 이 <b>가설</b>을 온도 센서로 확인해 봐요.</p>' +
        '<p>🥽 실제 실험에서 Ba(OH)₂·8H₂O 와 NH₄Cl 의 반응은 암모니아 기체가 나와요. 보호 장구를 쓰고 환기하며 교사의 안내에 따라 해요.</p>',
      features: ['obs'],
      setup() { S.lock = false; setMode('obs'); },
      recap: '흡열 반응도 저절로 일어날 수 있어요. 열의 출입(ΔH)만으로는 자발성을 정할 수 없어요.',
      summary: '<ul><li>저절로 일어나는 변화 중에는 <b>발열</b>인 것(연소, 중화, 물이 얾)도 있고 <b>흡열</b>인 것(얼음이 녹음, NH₄NO₃ 용해, Ba(OH)₂·8H₂O + NH₄Cl)도 있어요.</li><li>그래서 “발열이어야 자발적이다”는 틀렸어요. 엔탈피(열의 출입)만으로는 자발성을 설명할 수 없어요.</li><li>흡열인데도 저절로 일어나는 변화에서는 <b>엔트로피(배열의 수)</b>가 늘어나는 경우가 많아요. 다음 단계에서 두 요인을 함께 따져요.</li></ul>',
      missions: [
        {
          title: '발열과 흡열 분류하기',
          goal: '여섯 가지 변화를 하나씩 골라 <b>온도를 재고</b>, 발열(온도 ↑)과 흡열(온도 ↓)로 분류해요.',
          hint: '변화를 고르고 「온도 재기」를 눌러요. 온도계가 올랐으면 발열, 내려갔으면 흡열이에요. 분류 버튼은 온도를 잰 뒤에 열려요.',
          setup() { S.lock = true; resetOb(); setMode('obs'); },
          check: () => OBS().bin.every((b) => b >= 0), hold: 0.4,
          status: () => '발열 ' + OBS().bin.filter((b) => b === 0).length + ' / 3 &nbsp; 흡열 ' + OBS().bin.filter((b) => b === 1).length + ' / 3',
          explain: '발열(연소, 중화, 물이 얾) 3가지와 흡열(얼음이 녹음, 냉각 팩, Ba(OH)₂·8H₂O + NH₄Cl) 3가지가 모두 저절로 일어나요. 발열이 아닌 흡열 변화도 저절로 일어나므로 가설은 틀렸어요.',
        },
        {
          type: 'quiz', title: '“흡열 반응은 저절로 일어날 수 없다”?',
          goal: '“흡열 반응은 저절로 일어날 수 없다”는 주장에 대한 반례로 알맞은 것은?',
          setup() { S.lock = true; setMode('obs'); },
          choices: ['종이의 연소', '실온에서 얼음이 저절로 녹는 변화', '중화 반응', '물이 어는 변화'],
          answer: 1,
          feedback: ['연소는 발열 반응이에요. 주장의 반례가 되지 못해요.', '', '중화 반응은 발열 반응이에요.', '물이 어는 변화는 열을 내놓는 발열이에요.'],
          explain: '얼음이 녹을 때는 열을 흡수해요(ΔH > 0, 흡열). 그래도 실온에서는 저절로 일어나요. 따라서 “흡열은 자발적일 수 없다”는 주장은 틀렸어요.',
        },
      ],
    },
    {
      title: '두 가지 요인: 엔탈피와 엔트로피', short: '두 가지 요인', icon: '⚖️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 흡열인데도 저절로 일어나는 변화를 보았어요. 열의 출입 말고 또 하나, 앞 차시에서 배운 <b>엔트로피(배열의 수)</b>가 함께 작용해요.</div>' +
        '<p>자발성은 두 가지 요인으로 설명해요. <b>엔탈피 요인</b>: 열을 주위로 내놓으면(ΔH &lt; 0) 자발적 쪽에 도움이 돼요. <b>엔트로피 요인</b>: 계의 배열의 수가 늘면(ΔS &gt; 0) 자발적 쪽에 도움이 돼요.</p>' +
        '<p>두 요인을 <b>두 접시 저울</b>에 올려 봐요. 도움이 되는 요인은 왼쪽(자발적) 접시, 방해하는 요인은 오른쪽(비자발적) 접시에 놓여요. <b>온도가 높을수록 엔트로피 요인의 영향이 커져요.</b></p>',
      features: ['bal'],
      setup() { S.lock = false; setMode('bal'); blSyncSlide(); },
      recap: '엔탈피 요인과 엔트로피 요인이 함께 자발성을 정해요. 온도가 높을수록 엔트로피 요인의 영향이 커져요.',
      summary: '<ul><li><b>엔탈피 요인</b>: 열을 내놓는 변화(ΔH &lt; 0)는 자발적 쪽에 도움, 열을 흡수하는 변화(ΔH &gt; 0)는 방해예요.</li><li><b>엔트로피 요인</b>: 배열의 수가 늘면(ΔS &gt; 0) 도움, 줄면(ΔS &lt; 0) 방해예요.</li><li><b>온도가 높을수록 엔트로피 요인의 영향이 커져요</b> (엔탈피 요인은 그대로예요).</li><li>같은 변화도 온도에 따라 방향이 달라져요. 얼음 → 물(ΔH &gt; 0, ΔS &gt; 0)은 0 °C 보다 높은 온도에서 저절로 일어나고, 0 °C 보다 낮으면 일어나지 않아요(오히려 물이 얼어요).</li></ul>',
      missions: [
        {
          title: '얼음이 녹는 온도 찾기',
          goal: '「얼음이 녹음」을 고르고 온도 슬라이더를 움직여, 저울이 <b>수평(균형)</b>이 되는 온도(약 0 °C)를 찾아요.',
          hint: '얼음이 녹으면 열을 흡수해요(엔탈피 요인은 방해). 온도를 높이면 엔트로피 요인(도움)이 커져요. 저울이 수평이 되는 온도를 찾아요.',
          setup() { S.lock = true; resetBl(); setMode('bal'); setBl(0); },
          check: () => BL().sel === 0 && Math.abs(blT()) <= 1 && blBalanced(), hold: 0.8,
          status: () => '고른 변화 ' + mark(BL().sel === 0) + ' &nbsp; 온도 ' + (Math.round(blT() * 10) / 10).toFixed(1) + ' °C &nbsp; 수평 ' + mark(BL().sel === 0 && Math.abs(blT()) <= 1 && blBalanced()),
          explain: '0 °C 에서 두 요인이 맞서 저울이 수평이에요(얼음과 물이 공존해요). 0 °C 보다 높으면 엔트로피 요인이 이겨 얼음이 저절로 녹고, 낮으면 엔탈피 요인(방해)이 이겨 녹지 않아요.',
        },
        {
          title: '같은 변화, 반대로 기우는 저울',
          goal: '「얼음이 녹음」에서 온도를 <b>−5 °C 이하</b>와 <b>+5 °C 이상</b>으로 각각 맞추고, 저울이 반대로 기우는 것을 확인해요.',
          hint: '슬라이더를 왼쪽 끝 근처(−5 °C 이하)와 오른쪽 끝 근처(+5 °C 이상)로 한 번씩 움직여 봐요.',
          setup() { S.lock = true; const B = BL(); B.below = false; B.above = false; setBl(0); setMode('bal'); },
          check: () => BL().below && BL().above, hold: 0.4,
          status: () => '−5 °C 이하 ' + mark(BL().below) + ' &nbsp; +5 °C 이상 ' + mark(BL().above),
          explain: '낮은 온도에서는 엔트로피 요인이 작아 열 흡수(방해)를 이기지 못해 저울이 비자발적 쪽으로 기울고, 높은 온도에서는 엔트로피 요인이 커져 자발적 쪽으로 기울어요. 같은 변화도 온도에 따라 방향이 달라져요.',
        },
        {
          type: 'quiz', title: '온도가 높아지면 커지는 요인',
          goal: '온도가 높아질 때 영향이 더 커지는 요인은?',
          setup() { S.lock = true; setMode('bal'); },
          choices: ['엔탈피 요인', '엔트로피 요인', '두 요인 모두', '어느 요인도 변하지 않아요'],
          answer: 1,
          feedback: ['열의 출입(엔탈피 요인)은 온도가 바뀌어도 거의 그대로예요.', '', '엔탈피 요인은 그대로이고 엔트로피 요인만 커져요.', '엔트로피 요인은 온도가 높을수록 영향이 커져요.'],
          explain: '온도가 높을수록 입자의 운동이 활발해서 배열의 수가 늘어나는 효과가 커져요. 그래서 <b>엔트로피 요인</b>의 영향이 커지고, 엔탈피 요인은 그대로예요.',
        },
      ],
    },
    {
      title: 'ΔH 와 ΔS 로 나누는 네 가지 경우', short: '네 가지 경우', icon: '🔲', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 엔탈피 요인과 엔트로피 요인의 방향이 온도에 따라 승패를 가르는 것을 보았어요. ΔH 와 ΔS 의 부호 조합은 네 가지예요.</div>' +
        '<p>2×2 표에서 각 칸의 반응이 <b>어떤 온도에서 저절로 일어나는지</b> 정리해요. 부호만 보고 판단하고, 값을 계산하지는 않아요.</p>',
      features: ['tab'],
      setup() { S.lock = false; setMode('tab'); },
      recap: '(−, +)는 모든 온도, (−, −)는 낮은 온도, (+, +)는 높은 온도에서 자발적이고, (+, −)는 어떤 온도에서도 비자발적이에요.',
      summary: '<ul><li><b>ΔH &lt; 0, ΔS &gt; 0</b>: 두 요인이 모두 도움 → <b>모든 온도</b>에서 자발적 (2H₂O₂ → 2H₂O + O₂).</li><li><b>ΔH &lt; 0, ΔS &lt; 0</b>: 엔탈피 요인은 도움, 엔트로피 요인은 방해 → <b>낮은 온도</b>에서 자발적 (물이 얾, N₂ + 3H₂ → 2NH₃).</li><li><b>ΔH &gt; 0, ΔS &gt; 0</b>: 엔탈피 요인은 방해, 엔트로피 요인은 도움 → <b>높은 온도</b>에서 자발적 (얼음이 녹음, CaCO₃ 분해).</li><li><b>ΔH &gt; 0, ΔS &lt; 0</b>: 두 요인이 모두 방해 → <b>어떤 온도에서도 비자발적</b> (3O₂ → 2O₃).</li></ul>',
      missions: [
        {
          title: '2×2 표 완성하기',
          goal: '카드 6장을 ΔH 와 ΔS 의 부호에 맞는 칸에 놓고, 각 칸의 <b>자발적인 온도 조건</b>을 골라요.',
          hint: '카드를 눌러 ΔH 와 ΔS 정보를 보고, 끌어서 칸에 놓아요(또는 카드를 누른 뒤 칸을 눌러요). 칸을 누르고 조작판에서 온도 조건을 골라요.',
          manual: true,
          setup() { S.lock = true; tbInit(); setMode('tab'); },
          check: () => {
            if (tbPlaced() < NTC) return '아직 칸에 놓지 않은 카드가 ' + (NTC - tbPlaced()) + '장 있어요.';
            const w = tbWrong(); if (w.length) return '“' + TC[w[0].id].t + '” 카드를 다시 확인해요. ' + TC[w[0].id].dh + ', ' + TC[w[0].id].ds + '.';
            const cw = tbCondWrong(); if (cw.length) return TB().cond[cw[0]] < 0 ? '“' + CELL[cw[0]].name + '” 칸의 자발적인 온도 조건을 골라요.' : '“' + CELL[cw[0]].name + '” 칸의 조건을 다시 생각해 봐요. ' + CELL[cw[0]].why;
            return true;
          },
          explain: '(−, +): H₂O₂ 분해 — 모든 온도. (−, −): 물이 얾, NH₃ 합성 — 낮은 온도. (+, +): 얼음이 녹음, CaCO₃ 분해 — 높은 온도. (+, −): 오존 생성 — 어떤 온도에서도 비자발.',
        },
        {
          type: 'quiz', title: 'ΔH > 0, ΔS > 0 인 반응의 온도',
          goal: 'ΔH &gt; 0, ΔS &gt; 0 인 반응이 <b>높은 온도</b>에서 자발적인 까닭은?',
          setup() { S.lock = true; setMode('tab'); },
          choices: ['온도가 높으면 흡열 반응이 발열 반응으로 바뀌기 때문이에요', '온도가 높을수록 엔트로피 요인(도움)의 영향이 커져 엔탈피 요인(방해)을 이기기 때문이에요', '온도가 높을수록 엔탈피 요인(방해)이 작아지기 때문이에요', '온도가 높으면 반응 속도가 빨라서 자발적이 되기 때문이에요'],
          answer: 1,
          feedback: ['ΔH 의 부호는 온도에 따라 바뀌지 않아요. 영향이 커지는 요인이 달라져요.', '', '엔탈피 요인은 온도가 바뀌어도 그대로예요. 커지는 것은 엔트로피 요인이에요.', '자발성과 속도는 다른 개념이에요. 속도는 자발성을 정하지 않아요.'],
          explain: '엔탈피 요인(흡열)은 방해로 일정해요. 온도가 높아질수록 엔트로피 요인(배열의 증가)이 커져서 어느 온도 이상에서는 도움이 방해를 이겨 자발적이 돼요.',
        },
      ],
    },
    {
      title: '사례로 판정하기', short: '사례 판정', icon: '🏠', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> ΔH 와 ΔS 의 부호로 자발적인 온도를 판단하는 네 가지 경우를 정리했어요. 이제 실제 사례에 적용해 봐요.</div>' +
        '<p>석회 가마, 암모니아 합성, 오존, 얼어붙는 호수의 사례를 판정해요. 한 가지 주의할 점은 <b>자발적이라고 반드시 빠른 것은 아니고</b>, <b>비자발적이라고 해서 불가능한 것도 아니에요</b>. 속도는 다음 단원에서 배워요.</p>',
      features: ['app'],
      setup() { S.lock = false; setMode('app'); },
      recap: '자발성은 부호와 온도로 판단해요. 자발적이어도 느릴 수 있고, 비자발적인 변화도 에너지를 공급하면 일어나요.',
      summary: '<ul><li><b>석회 가마</b>: CaCO₃ 분해(ΔH &gt; 0, ΔS &gt; 0)는 약 800 °C 이상의 높은 온도에서 자발적이라 가마를 고온으로 가열해요.</li><li><b>암모니아 합성</b>(ΔH &lt; 0, ΔS &lt; 0): 낮은 온도가 자발성에 유리하지만 너무 느려서 촉매를 쓰고 400~500 °C 로 타협해요.</li><li><b>오존 생성</b>(ΔH &gt; 0, ΔS &lt; 0): 어떤 온도에서도 비자발적이라 번개·자외선 같은 에너지가 있어야 만들어져요.</li><li><b>호수</b>(물이 얾, ΔH &lt; 0, ΔS &lt; 0): 0 °C 아래에서 자발적으로 얼어요.</li><li><b>자발적 ≠ 빠름</b>: 수소와 산소의 혼합 기체는 자발적이지만 불꽃이 없으면 반응하지 않아요. <b>비자발적 ≠ 불가능</b>: 물의 전기 분해, 광합성처럼 에너지를 공급하면 일어나요.</li></ul>',
      missions: [
        {
          title: '사례 판정하기',
          goal: '네 가지 사례 중 <b>3개 이상</b> 정답을 골라요.',
          hint: '사례를 고르고 ΔH 와 ΔS 의 부호를 떠올려요. 온도가 높을수록 엔트로피 요인이 커져요. 기억이 안 나면 앞 단계의 2×2 표를 떠올려 봐요.',
          setup() { S.lock = true; resetAp(); setMode('app'); },
          check: () => apOkN() >= 3, hold: 0.4,
          status: () => AP.map((p, i) => p.name + ' ' + mark(APS().ok[i])).join(' &nbsp; '),
          explain: '석회 가마는 높은 온도(약 800 °C 이상), 암모니아 합성은 촉매와 400~500 °C 의 타협, 오존은 에너지를 공급해야만 생성, 호수는 0 °C 아래에서 얼어요.',
        },
        {
          type: 'quiz', title: '자발적인데 일어나지 않는 것처럼 보이는 예',
          goal: '자발적이지만 <b>불꽃이 없으면 일어나지 않는 것처럼 보이는</b> 변화는?',
          setup() { S.lock = true; setMode('app'); },
          choices: ['수소와 산소의 혼합 기체가 물이 되는 반응', '물의 전기 분해', '오존의 생성', '광합성'],
          answer: 0,
          feedback: ['', '물의 전기 분해는 비자발적이어서 전기 에너지를 계속 공급해야 일어나요.', '오존 생성은 비자발적이에요. 자발적인데 느린 예가 아니에요.', '광합성은 비자발적이어서 빛에너지가 필요해요.'],
          explain: '수소와 산소가 물이 되는 반응은 자발적이에요. 하지만 상온에서는 속도가 너무 느려서 불꽃(활성화 에너지)이 없으면 일어나지 않는 것처럼 보여요. <b>자발적이라고 빠른 것은 아니에요.</b>',
        },
        {
          type: 'quiz', title: '비자발적인 변화는 불가능할까?',
          goal: '“비자발적인 변화는 절대 일어날 수 없다”는 말에 대한 설명으로 알맞은 것은?',
          setup() { S.lock = true; setMode('app'); },
          choices: ['맞아요. 비자발적이면 어떤 방법으로도 일어나지 않아요', '틀려요. 바깥에서 에너지를 계속 공급하면 일어날 수 있어요. 물의 전기 분해, 광합성이 그 예예요', '맞아요. 비자발적인 변화는 ΔH 가 항상 음수이기 때문이에요', '틀려요. 비자발적인 변화는 온도를 높이면 항상 일어나요'],
          answer: 1,
          feedback: ['비자발적이라도 에너지를 공급하면 일어날 수 있어요.', '', '비자발적 변화의 ΔH 는 음수일 수도 양수일 수도 있어요.', '온도를 높여도 일어나지 않는 비자발적 변화(ΔH > 0, ΔS < 0)도 있어요.'],
          explain: '비자발적 변화는 <b>저절로</b> 일어나지 않을 뿐 불가능한 것은 아니에요. 물의 전기 분해는 전기 에너지를, 광합성은 빛에너지를, 오존 생성은 번개나 자외선의 에너지를 공급받아 일어나요.',
        },
      ],
    },
  ];

  buildCtl(); tbInit(); blSyncSlide();
  game = SciSim.game({
    simId: 'hx-spontaneity', mount: '#game', badge: '자발성 판정관', homeHref: '../../index.html#hx',
    featureLabels: { obs: '👀 발열·흡열 관찰', bal: '⚖️ 두 접시 저울', tab: '🔲 네 가지 경우 표', app: '🏠 사례 판정' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setMode('obs');
  function stepAll1(dt) { S.t += dt; stepOb(dt); stepBl(dt); stepTb(dt); stepAp(dt); }
  let lastFree = false;
  SciSim.loop((dt) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.lock && game && game.phase !== 'active') { S.lock = false; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    T(14, 26, MODE_LABEL[S.mode], PHONE ? 15 : 17, INK, 'left', 800);
    if (S.mode === 'obs') { drawObs(S.t); drawObsInfo(S.t); }
    else if (S.mode === 'bal') { drawBal(S.t); drawBalInfo(S.t); }
    else if (S.mode === 'tab') { drawTab(S.t); drawTabInfo(S.t); }
    else { drawApp(S.t); drawAppInfo(S.t); }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, RC, OC, RB, TC, CELL, AP, setMode, setObSel, obMeasure, obClassify, setBl, setT, blW, blT, tbInit, tbPlace, tbSetCond, tbPlaced, tbWrong, tTray, tCell, ocRect, setAp, apAnswer, apOkN,
    get game() { return game; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepAll1(0.02); parts.update(0.02); } },
  };

})();
