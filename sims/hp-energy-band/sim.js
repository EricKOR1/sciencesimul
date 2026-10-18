(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 720 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef2fa' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = [];
    String(str).split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((tok) => {
        const sep = line ? ' ' : '';
        if (ctx.measureText(line + sep + tok).width <= maxW) { line += sep + tok; return; }
        if (line) { out.push(line); line = ''; }
        if (ctx.measureText(tok).width <= maxW) { line = tok; return; }
        for (const ch of tok) { if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
      });
      out.push(line);
    });
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3600);
  }
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const f0 = (v) => String(Math.round(v));
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- 파장 → 색 ---------- */
  const WLC = [];
  (function () {
    for (let i = 0; i <= 800; i++) {
      const l = 380 + i * 0.5;
      let r = 0, g = 0, b = 0;
      if (l < 440) { r = -(l - 440) / 60; b = 1; }
      else if (l < 490) { g = (l - 440) / 50; b = 1; }
      else if (l < 510) { g = 1; b = -(l - 510) / 20; }
      else if (l < 580) { r = (l - 510) / 70; g = 1; }
      else if (l < 645) { r = 1; g = -(l - 645) / 65; }
      else { r = 1; }
      const f = l < 420 ? 0.45 + 0.55 * (l - 380) / 40 : l > 700 ? 0.45 + 0.55 * (780 - l) / 80 : 1;
      const gm = 0.8;
      WLC.push([Math.round(255 * Math.pow(Math.max(0, r) * f, gm)), Math.round(255 * Math.pow(Math.max(0, g) * f, gm)), Math.round(255 * Math.pow(Math.max(0, b) * f, gm))]);
    }
  })();
  const wl = (l) => WLC[clamp(Math.round((l - 380) * 2), 0, 800)];
  const wlHex = (l, a) => { const c = wl(l); return a == null ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')' : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  const rgbHex = (c) => '#' + c.map((v) => ('0' + v.toString(16)).slice(-2)).join('');
  const wlSolid = (l) => rgbHex(wl(l));

  /* ---------- 캔버스 버튼 · 포인터 ---------- */
  const HITS = [];
  const DRAG = { down: null, move: null, up: null, hover: null };
  function hitAt(p) { for (let i = HITS.length - 1; i >= 0; i--) { const h = HITS[i]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; }
  function cbtn(x, y, w, h, label, fn, o) {
    o = o || {};
    const on = !!o.on, dis = !!o.disabled;
    D.roundRect(x, y, w, h, o.r != null ? o.r : h / 2);
    ctx.fillStyle = dis ? '#eef0f4' : on ? (o.color || '#f26b3a') : '#fff'; ctx.fill();
    ctx.lineWidth = 2.2; ctx.strokeStyle = dis ? '#cfd5df' : (o.color || '#f26b3a'); ctx.stroke();
    T(x + w / 2, y + h / 2 + (o.size || 14) * 0.36, label, o.size || 14, dis ? '#a3acba' : on ? '#fff' : '#26324a', 'center', 800);
    if (!dis && fn) HITS.push({ x, y, w, h, fn });
  }
  let press = null;
  SciSim.pointer(view, {
    down(p) {
      if (DRAG.down && DRAG.down(p)) { press = { drag: true }; return true; }
      const h = hitAt(p); if (h) { press = { hit: h, x: p.x, y: p.y }; return true; } return false;
    },
    move(p) { if (press && press.drag && DRAG.move) DRAG.move(p); },
    up(p) {
      if (press && press.drag) { DRAG.up && DRAG.up(p); }
      else if (press && press.hit && Math.hypot(p.x - press.x, p.y - press.y) < 14) press.hit.fn(p);
      press = null;
    },
    hover(p) { if (DRAG.hover) { const c = DRAG.hover(p); if (c) return c; } return hitAt(p) ? 'pointer' : 'default'; },
  });

  /* ---------- 읽음 칸 · 툴바 ---------- */
  let rlast = '';
  function readouts(L1, a, L2, b, L3, c) {
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    $('#l1').textContent = L1; $('#v1').textContent = a; $('#l2').textContent = L2; $('#v2').textContent = b; $('#l3').textContent = L3; $('#v3').textContent = c;
  }
  function setTb(label, items, cur, onPick) {
    $('#tbLabel').textContent = label;
    const seg = $('#tbSeg'); seg.innerHTML = '';
    seg.hidden = !items || items.length < 2;
    (items || []).forEach((it) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = it[1]; b.dataset.v = it[0];
      b.classList.toggle('on', it[0] === cur);
      b.addEventListener('click', () => { Sound.click(); onPick(it[0]); });
      seg.appendChild(b);
    });
  }
  const setSlider = (id, v, min, max, outId, txt) => {
    const e = $(id); if (!e) return; if (+e.value !== v) e.value = v;
    e.style.setProperty('--pct', ((v - min) / (max - min) * 100) + '%');
    if (outId) $(outId).textContent = txt;
  };
  const syncSeg = (sel, v) => $$(sel + ' button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
  function mkSelects(host, defs, store, okStore) {
    // defs: [[question, [[value, label]...], answer]]
    host.innerHTML = '';
    const sels = [];
    defs.forEach((w, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + w[0] + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', w[0].replace(/<[^>]+>/g, ''));
      sel.innerHTML = '<option value="">— 고르기 —</option>' + w[1].map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('');
      sel.addEventListener('change', () => { store[i] = sel.value; sel.classList.remove('ok', 'bad'); delete okStore[i]; Sound.click(); });
      row.appendChild(sel); host.appendChild(row); sels.push(sel);
    });
    return sels;
  }
  function checkSelects(defs, sels, store, okStore) {
    const miss = defs.filter((w, i) => !store[i]);
    if (miss.length) return { miss: miss.length };
    let bad = 0;
    defs.forEach((w, i) => {
      const ok = store[i] === w[2];
      if (!ok) bad++;
      if (!ok && okStore[i] !== false) { sels[i].classList.remove('ok', 'bad'); void sels[i].offsetWidth; sels[i].classList.add('bad'); }
      if (ok) { sels[i].classList.remove('bad'); sels[i].classList.add('ok'); }
      okStore[i] = ok;
    });
    return { bad };
  }
  const numOf = (s) => parseFloat(String(s).replace(',', '.'));


  /* =========================================================
     물리학 Ⅲ. 빛과 물질 - 에너지띠와 반도체 (단원 6차시)
     성취기준 [12물리03-05] 고체의 에너지띠 구조로부터 도체와 부도체의 차이를 알고, 반도체 소자의 원리를 설명할 수 있다.
     ① 모형: 원자 수 · 간격에 따른 에너지띠 형성
     ② 설명: 도체 · 반도체 · 부도체 (띠 간격과 전도띠 전자 수)
     ③ 탐구: 순수 반도체의 전자와 양공 (온도 · 빛 · 전압)
     ④ 적용: 도핑 (n형 · p형)
     페르미 준위 계산, 브릴루앙 영역, 유효 질량, 간접·직접 띠틈, p-n 접합(다음 차시)은 다루지 않아요.
     ========================================================= */

  /* ---------- 모델 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const E_LO = 0, E_HI = 5.0;                                    // 원자 1개의 두 준위 (eV, 그림용 값)
  const tHop = (d) => 0.25 * Math.exp((0.40 - d) / 0.10);        // 이웃 원자와의 상호작용 세기 (eV), 간격 d(nm)가 작을수록 커요
  const subE = (E0, k, N, d, sgn) => E0 + sgn * 2 * tHop(d) * Math.cos(k * Math.PI / (N + 1));   // k번째 갈라진 준위 (sgn = -1: 아래쪽부터)
  const gapNd = (N, d) => E_HI - E_LO - 4 * tHop(d) * Math.cos(Math.PI / (N + 1));            // 두 띠 사이의 간격 (eV)
  const widthNd = (N, d) => 4 * tHop(d) * Math.cos(Math.PI / (N + 1));                          // 띠 폭 (eV) = 맨 위 준위 − 맨 아래 준위
  const N_LV = [1, 2, 4, 8, 20, 50];
  const KT = 0.026;                                              // 상온(300 K)의 열에너지 (eV)
  const LOGMIN = -40;                                            // 전도띠 전자 수 눈금의 끝 (10^−40)
  const expOf = (eg) => -eg / (2 * KT * Math.LN10);              // 상온에서 전도띠 전자 수의 상대값 = 10^expOf(Eg) (도체 = 1)
  const EG_INS = -LOGMIN * 2 * KT * Math.LN10;                   // 눈금 끝에 닿는 띠 간격 (≈ 4.8 eV, “약 5 eV 이상”이 부도체)
  const MATS = [{ id: 'cu', name: '구리', eg: 0 }, { id: 'si', name: '규소', eg: 1.1 }, { id: 'ge', name: '저마늄', eg: 0.67 }, { id: 'ga', name: '갈륨 비소', eg: 1.4 }, { id: 'di', name: '다이아몬드', eg: 5.5 }, { id: 'gl', name: '유리', eg: 9.0 }];
  const clsOf = (eg) => (eg <= 0 ? 'c' : eg >= EG_INS ? 'i' : 's');
  const CLS_NAME = { c: '도체', s: '반도체', i: '부도체' };
  const EG_SI = 1.1, KB = 8.617e-5, T_REF = 650, N_THERM = 12, N_LIGHT = 6, HC = 1240, NM_VIS = 550, NM_IR = 1300;
  const nTherm = (T) => N_THERM * Math.exp(-(EG_SI / (2 * KB)) * (1 / T - 1 / T_REF));   // 열로 생기는 전자–양공 쌍 수 (그림용 표시 개수)
  const SI_DENS = 5.0e22, N_I = 1.0e10, E_DON = 0.05;           // 규소 원자 밀도, 순수 규소의 전하 나르개 밀도 (cm⁻³), 도너·억셉터 준위의 깊이 (eV)
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '−': '⁻', '.': '·' };
  const sup = (s) => String(s).split('').map((c) => SUP[c] || c).join('');
  const pow10s = (e) => '10' + sup((Math.round(e * 10) / 10).toString().replace('-', '−'));
  const sciStr = (v) => { const ex = Math.floor(Math.log10(v) + 1e-9), m = v / Math.pow(10, ex); return f1(m) + '×10' + sup(ex); };
  const dopeFactor = (e) => SI_DENS * Math.pow(10, e) / N_I;      // 도핑한 규소의 전도성 ÷ 순수 규소의 전도성

  /* ---------- 상태 ---------- */
  const mkB = () => ({ N: 1, d: 0.40, seenN: false, seenNear: false, seenFar: false, lv: Array.from({ length: 50 }, () => ({ y: 0, a: 0 })), lc: Array.from({ length: 50 }, () => ({ y: 0, a: 0 })) });
  const mkM = () => ({ eg: 1.1, mat: 'si', seen: {}, hold: 0, t: 0, el: [] });
  const mkC = () => ({ T: 300, light: 'off', volt: 'on', E: [], H: [], ph: [], seen: {}, tm: { heat: 0, vis: 0, ir: 0 }, sp: 0, rc: 0, hop: [], flash: [] });
  const mkD = () => ({ dop: 'none', e: -7, sub: 'lat', car: [], seen: {}, tm: { n: 0, p: 0 }, hopT: 0, hops: [] });
  const S = { mode: 'band', t: 0, fade: 0, b: mkB(), m: mkM(), c: mkC(), d: mkD() };
  const labSt = {}, labOk = {}, clsSt = {}, clsOk = {}, mtSt = {}, mtOk = {};
  let game = null, need = '';
  const MODES = { band: '🪜 에너지띠 만들기', mat: '🧱 도체 · 반도체 · 부도체', carr: '⚡ 순수 반도체: 전자와 양공', dope: '🧪 도핑' };
  const D_VIEWS = [['lat', '도핑 실험'], ['bands', '띠 그림']];

  /* ---------- 장면 · 컨트롤 ---------- */
  const subOf = () => (S.mode === 'dope' ? S.d.sub : '');
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; parts.clear(); } S.mode = mode; updateCtl(); }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-need')) on = n.getAttribute('data-need') === need;
      if (on && n.hasAttribute('data-hide')) on = n.getAttribute('data-hide') !== need;
      n.hidden = !on;
    });
    if (S.mode === 'dope') setTb(MODES.dope, D_VIEWS, S.d.sub, (v) => { S.d.sub = v; S.fade = 1; updateCtl(); });
    else setTb(MODES[S.mode], null);
    syncSeg('#nSeg', S.b.N); syncSeg('#matSeg', S.m.mat); syncSeg('#lightSeg', S.c.light); syncSeg('#voltSeg', S.c.volt); syncSeg('#dopSeg', S.d.dop);
    setSlider('#sD', S.b.d, 0.3, 0.6, '#oD', f2(S.b.d) + ' nm');
    setSlider('#sEg', S.m.eg, 0, 10, '#oEg', f1(S.m.eg) + ' eV');
    setSlider('#sT', S.c.T, 250, 650, '#oT', S.c.T + ' K');
    setSlider('#sE', S.d.e, -9, -5, '#oE', pow10s(S.d.e));
  }

  /* ---------- 공통 그리기 ---------- */
  const lineSpr = (x1, x2, y, o) => { ctx.strokeStyle = o.c; ctx.lineWidth = o.w || 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); };
  const eDot = (x, y, r) => { D.sphere(x, y, r || 5, '#2f6df6', { gloss: r > 5, shadow: false }); };
  const hDot = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r || 5.5, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#e2552a'; ctx.lineWidth = 2; ctx.stroke(); T(x, y + (r || 5.5) * 0.45, '+', (r || 5.5) * 1.5, '#e2552a', 'center', 800); };
  function bandRect(x, y, w, h, kind, fillFrac) {
    // kind: 'v' 채워진 띠(파랑) / 'c' 빈 띠(주황)
    D.roundRect(x, y, w, h, 10); ctx.fillStyle = kind === 'v' ? 'rgba(47,109,246,.16)' : 'rgba(242,107,58,.12)'; ctx.fill();
    if (fillFrac > 0) { ctx.save(); D.roundRect(x, y, w, h, 10); ctx.clip(); ctx.fillStyle = 'rgba(47,109,246,.34)'; ctx.fillRect(x, y + h * (1 - fillFrac), w, h * fillFrac); ctx.restore(); }
    D.roundRect(x, y, w, h, 10); ctx.strokeStyle = kind === 'v' ? '#2f6df6' : '#f26b3a'; ctx.lineWidth = 2.4; ctx.stroke();
  }

  /* ================= ① 에너지띠 ================= */
  const LB = PHONE
    ? { a: [12, 12, 456, 132], b: [12, 152, 456, 430], c: [12, 590, 456, 118], cx: 140, hw: 76, y0: 218, y1: 556 }
    : { a: [14, 14, 772, 150], b: [14, 172, 772, 374], c: null, cx: 250, hw: 96, y0: 244, y1: 520 };
  const EMIN = -2.6, EMAX = 7.6;
  const yE = (E) => LB.y1 - (E - EMIN) / (EMAX - EMIN) * (LB.y1 - LB.y0);
  const labDefs = [
    ['① 위쪽의 비어 있는 띠의 이름은?', [['v', '원자가띠'], ['c', '전도띠'], ['g', '띠 간격']], 'c'],
    ['② 두 띠 사이 에너지가 없는 부분의 이름은?', [['v', '원자가띠'], ['c', '전도띠'], ['g', '띠 간격']], 'g'],
    ['③ 아래쪽의 전자로 가득 찬 띠의 이름은?', [['v', '원자가띠'], ['c', '전도띠'], ['g', '띠 간격']], 'v'],
  ];
  function stepBand(dt) {
    const b = S.b, N = b.N, d = b.d;
    for (let k = 0; k < 50; k++) {
      const tv = k < N ? yE(subE(E_LO, k + 1, N, d, -1)) : yE(E_LO), tc = k < N ? yE(subE(E_HI, k + 1, N, d, -1)) : yE(E_HI);
      const first = b.lv[k].a === 0 && b.lv[k].y === 0;
      if (first) { b.lv[k].y = yE(E_LO); b.lc[k].y = yE(E_HI); }
      b.lv[k].y = SciSim.approach(b.lv[k].y, tv, dt, 7); b.lc[k].y = SciSim.approach(b.lc[k].y, tc, dt, 7);
      b.lv[k].a = SciSim.approach(b.lv[k].a, k < N ? 1 : 0, dt, 8); b.lc[k].a = b.lv[k].a;
    }
    if (N >= 20) { b.seenN = true; if (d <= 0.35) b.seenNear = true; if (d >= 0.50) b.seenFar = true; }
  }
  function drawBand(dt) {
    const b = S.b, g = LB, N = b.N, d = b.d;
    panel(g.a[0], g.a[1], g.a[2], g.a[3]);
    T(g.a[0] + 14, g.a[1] + 24, '원자 ' + N + '개를 간격 ' + f2(d) + ' nm로 늘어놓았어요', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const cnt = Math.min(N, PHONE ? 6 : 8), sp = d * (PHONE ? 100 : 130), tot = (cnt - 1) * sp, ax = g.a[0] + g.a[2] / 2 - tot / 2 - (N > cnt ? 18 : 0), ay = g.a[1] + 72;
    for (let i = 0; i < cnt; i++) {
      D.glow(ax + i * sp, ay, 24, '#8bb8ff', 0.28);
      D.sphere(ax + i * sp, ay, 13, '#6aa0ff', { gloss: true, shadow: true });
      if (i < cnt - 1) { ctx.strokeStyle = 'rgba(47,109,246,.25)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(ax + i * sp + 14, ay); ctx.lineTo(ax + (i + 1) * sp - 14, ay); ctx.stroke(); ctx.setLineDash([]); }
    }
    if (N > cnt) { T(ax + tot + 36, ay + 6, '… ×' + N, PHONE ? 15 : 17, '#26324a', 'left', 800); }
    if (cnt > 1) { ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.6; const yy = ay + 28; ctx.beginPath(); ctx.moveTo(ax, yy); ctx.lineTo(ax + sp, yy); ctx.stroke(); T(ax + sp / 2, yy + 17, 'd', 13, '#5a6679', 'center', 800); }
    T(g.a[0] + g.a[2] / 2, g.a[1] + g.a[3] - 10, '이웃한 원자끼리 서로 영향을 줘요' + (d <= 0.35 ? ' (가까워서 영향이 커요)' : d >= 0.5 ? ' (멀어서 영향이 작아요)' : ''), PHONE ? 11.5 : 12.5, '#5a6679', 'center', 700);
    // 에너지 그림
    panel(g.b[0], g.b[1], g.b[2], g.b[3]);
    T(g.b[0] + 14, g.b[1] + 26, '전자의 에너지 준위', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const ax0 = g.b[0] + (PHONE ? 34 : 50);
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax0, g.y1 + 6); ctx.lineTo(ax0, g.y0 - 30); ctx.stroke();
    D.arrow(ax0, g.y0 - 24, ax0, g.y0 - 36, { color: '#8a95a8', width: 2, head: 8 }); T(ax0 + 8, g.y0 - 30, 'E (eV)', 12, '#5a6679', 'left', 700);
    for (let e = -2; e <= 7; e += 1) { const yy = yE(e); ctx.beginPath(); ctx.moveTo(ax0 - 4, yy); ctx.lineTo(ax0 + 4, yy); ctx.stroke(); if (e % 1 === 0 && (e % 2 === 0 || e === 5)) T(ax0 - 8, yy + 4, String(e), 11.5, '#5a6679', 'right', 700); }
    // 원자 1개의 준위 (기준선)
    [[E_LO, '원자 1개의 준위'], [E_HI, '원자 1개의 준위']].forEach((r) => { ctx.strokeStyle = 'rgba(138,149,168,.7)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(ax0 + 8, yE(r[0])); ctx.lineTo(g.cx + g.hw + 30, yE(r[0])); ctx.stroke(); ctx.setLineDash([]); });
    // 갈라진 준위
    const band = N >= 8, aFill = smooth((N - 4) / 16);
    [[b.lc, 'c', E_HI], [b.lv, 'v', E_LO]].forEach((r) => {
      const arr = r[0], kind = r[1];
      if (aFill > 0.02) { let lo = 1e9, hi = -1e9; for (let k = 0; k < N; k++) { lo = Math.min(lo, arr[k].y); hi = Math.max(hi, arr[k].y); } D.roundRect(g.cx - g.hw - 8, lo - 4, g.hw * 2 + 16, hi - lo + 8, 8); ctx.fillStyle = (kind === 'v' ? 'rgba(47,109,246,' : 'rgba(242,107,58,') + (0.22 * aFill) + ')'; ctx.fill(); }
      for (let k = 0; k < 50; k++) {
        const L = arr[k]; if (L.a < 0.03) continue;
        ctx.globalAlpha = L.a; lineSpr(g.cx - g.hw, g.cx + g.hw, L.y, { c: kind === 'v' ? '#2f6df6' : '#f26b3a', w: N > 12 ? 1.6 : 3.2 });
        if (kind === 'v' && N <= 8) { eDot(g.cx - 30, L.y, 3.4); eDot(g.cx - 20, L.y, 3.4); }
        ctx.globalAlpha = 1;
      }
    });
    // 띠 이름 · 간격
    const topC = yE(subE(E_HI, N, N, d, -1)), botC = yE(subE(E_HI, 1, N, d, -1)), topV = yE(subE(E_LO, N, N, d, -1)), botV = yE(subE(E_LO, 1, N, d, -1));
    const gx = g.cx + g.hw + 22, gap = gapNd(N, d);
    if (N >= 2) {
      D.arrow(gx, (botC + topV) / 2 + 2, gx, botC + 2, { color: '#14a058', width: 2.4, head: 8 }); D.arrow(gx, (botC + topV) / 2 - 2, gx, topV - 2, { color: '#14a058', width: 2.4, head: 8 });
      T(gx + 12, (botC + topV) / 2 + 5, '간격 ' + f2(gap) + ' eV', PHONE ? 12 : 13.5, '#0f7a43', 'left', 800);
      T(gx + 12, (topC + botC) / 2 + 5, '폭 ' + f2(widthNd(N, d)) + ' eV', 12, '#c2410c', 'left', 700);
      T(gx + 12, (topV + botV) / 2 + 5, '폭 ' + f2(widthNd(N, d)) + ' eV', 12, '#1d4ed8', 'left', 700);
    }
    if (band) {
      const my = [[(topC + botC) / 2, '①'], [(botC + topV) / 2, '②'], [(topV + botV) / 2, '③']];
      my.forEach((m) => { const mx = g.cx - g.hw - 28; D.sphere(mx, m[0], 12, m[1] === '②' ? '#14a058' : m[1] === '①' ? '#f26b3a' : '#2f6df6', { gloss: false, text: m[1], textScale: 1.0 }); });
    }
    const tx = PHONE ? g.b[0] + 14 : g.cx + g.hw + 200, tw = PHONE ? g.b[2] - 28 : g.b[0] + g.b[2] - tx - 16, ty = PHONE ? g.b[1] + g.b[3] - 14 - 60 : g.b[1] + 50;
    if (!PHONE) {
      const msg = N === 1 ? '원자 1개: 준위가 하나씩 있어요. 아래 준위에는 전자가 2개 들어 있어요.' : N < 8 ? '원자 ' + N + '개: 준위가 ' + N + '개씩으로 갈라졌어요. 준위마다 전자는 최대 2개예요.' : '원자 ' + N + '개: 아주 많은 준위가 촘촘히 모여 하나의 띠처럼 보여요. 아래 띠는 전자로 가득 차고, 위 띠는 비어 있어요.';
      textBlock(tx, ty, tw, msg, 14, '#3a465c', 20, 700);
      textBlock(tx, ty + 120, tw, '회색 점선은 원자 1개일 때의 준위예요. 간격 d가 작을수록 영향이 커서 띠가 넓어지고 두 띠 사이 간격은 줄어요. (에너지 값은 개념을 보이기 위한 예시예요.)', 13, '#5a6679', 18, 700);
    } else {
      panel(g.c[0], g.c[1], g.c[2], g.c[3]);
      textBlock(g.c[0] + 14, g.c[1] + 26, g.c[2] - 28, N === 1 ? '원자 1개: 준위가 하나씩 있어요.' : N < 8 ? '원자 ' + N + '개: 준위가 ' + N + '개씩으로 갈라졌어요.' : '원자 ' + N + '개: 준위가 촘촘히 모여 띠가 돼요. 아래 띠는 전자로 가득, 위 띠는 비어 있어요.', 13, '#3a465c', 18, 700);
      textBlock(g.c[0] + 14, g.c[1] + 82, g.c[2] - 28, '간격 d가 작을수록 띠가 넓어지고 띠 간격은 줄어요.', 12.5, '#5a6679', 17, 700);
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ② 도체 · 반도체 · 부도체 ================= */
  const LM = PHONE
    ? { p: [12, 12, 456, 400], vbY: 340, th: 56, x0: 40, x1: 300, m: [12, 420, 456, 150], i: [12, 578, 456, 130] }
    : { p: [14, 14, 520, 532], vbY: 452, th: 66, x0: 60, x1: 380, m: [546, 14, 240, 300], i: [546, 322, 240, 224] };
  const pxEg = PHONE ? 18 : 21;
  function stepMat(dt) {
    const m = S.m, cl = clsOf(m.eg);
    m.t += dt;
    if (cl === 'c') m.seen.c = (m.seen.c || 0) + dt; else if (cl === 's') m.seen.s = (m.seen.s || 0) + dt; else m.seen.i = (m.seen.i || 0) + dt;
    const nE = m.eg === 0 ? 14 : Math.round(14 * Math.pow(10, expOf(m.eg)));
    while (m.el.length < nE) m.el.push({ x: Math.random(), y: Math.random() });
    if (m.el.length > nE) m.el.length = nE;
    m.el.forEach((e) => { e.x += dt * 0.35; if (e.x > 1) e.x -= 1; });
  }
  function drawMat(dt) {
    const m = S.m, g = LM, eg = m.eg, cl = clsOf(eg);
    panel(g.p[0], g.p[1], g.p[2], g.p[3]);
    T(g.p[0] + 14, g.p[1] + 26, '전압을 걸었을 때 전자가 움직일 수 있을까?', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const w = g.x1 - g.x0, vbTop = g.vbY, vbH = g.th;
    // 전지
    const bx = g.p[0] + g.p[2] - (PHONE ? 70 : 62), by = g.vbY - (PHONE ? 150 : 210);
    D.shadow(() => { D.roundRect(bx - 20, by - 24, 40, 70, 8); ctx.fillStyle = '#394258'; ctx.fill(); }, { blur: 6, y: 2 });
    T(bx, by - 6, '전지', 12, '#fff', 'center', 800); T(bx, by + 12, '+  −', 14, '#ffd447', 'center', 800);
    D.arrow(bx + 18, by + 74, bx - 28, by + 74, { color: '#e2552a', width: 3, head: 9 }); T(bx + 22, by + 96, '전기장 방향', 11.5, '#c2410c', 'right', 700);
    textBlock(g.p[0] + 14, g.p[1] + 84, (PHONE ? 250 : 340), '전류가 흐르려면 전자가 움직일 수 있는 빈 준위가 필요해요. 가득 찬 띠의 전자는 갈 곳이 없고, 전도띠로 올라간 전자만 전류를 나를 수 있어요.', PHONE ? 12 : 13.5, '#3a465c', PHONE ? 16 : 19, 700);
    if (eg === 0) {
      const top = vbTop - 130, hh = vbH + 130 - 0;
      bandRect(g.x0, top, w, hh, 'v', 0.52);
      T(g.x0 + w / 2, top - 8, '부분적으로 차 있는 띠 (또는 두 띠가 겹쳐요)', PHONE ? 11.5 : 13, '#26324a', 'center', 800);
      T(g.x0 + w / 2, top + 22, '빈 준위가 바로 위에 있어요', 12.5, '#5a6679', 'center', 700);
      m.el.forEach((e) => { const x = g.x0 + 10 + e.x * (w - 20), y = top + 40 + e.y * (hh * 0.48 - 50); eDot(x, y, 5.5); });
      for (let i = 0; i < 14; i++) { const xx = g.x0 + 10 + ((i / 14 + m.t * 0.35) % 1) * (w - 20), yy = top + hh * 0.52 + 14 + (i % 4) * ((hh * 0.48 - 30) / 4); eDot(xx, yy, 5); }
    } else {
      const cbBot = vbTop - eg * pxEg, cbTop = cbBot - vbH;
      bandRect(g.x0, cbTop, w, vbH, 'c', 0);
      bandRect(g.x0, vbTop, w, vbH, 'v', 1);
      T(g.x0 + 8, cbTop + 20, '전도띠 (비어 있음)', 12.5, '#c2410c', 'left', 800); T(g.x0 + 8, vbTop + vbH - 8, '원자가띠 (가득 참)', 12.5, '#1d4ed8', 'left', 800);
      // 간격 표시
      const gx = g.x0 + w + 18;
      D.arrow(gx, (cbBot + vbTop) / 2 + 1, gx, cbBot + 1, { color: '#14a058', width: 2.4, head: 8 }); D.arrow(gx, (cbBot + vbTop) / 2 - 1, gx, vbTop - 1, { color: '#14a058', width: 2.4, head: 8 });
      D.label(gx + 4, (cbBot + vbTop) / 2, '띠 간격 ' + f1(eg) + ' eV', { bg: '#14a058', size: 12.5, align: 'left' });
      // 가득 찬 원자가띠의 전자: 빈 자리가 없어 움직일 수 없음
      for (let i = 0; i < 9; i++) { eDot(g.x0 + 30 + i * (w - 60) / 8, vbTop + 20 + (i % 2) * 18, 5); }
      T(g.x0 + w / 2, vbTop + vbH + 22, '가득 찬 띠의 전자는 갈 곳(빈 준위)이 없어요', 12.5, '#5a6679', 'center', 700);
      if (m.el.length) m.el.forEach((e) => { eDot(g.x0 + 10 + e.x * (w - 20), cbTop + 14 + e.y * (vbH - 28), 5.5); });
      else if (expOf(eg) > -14) { const gxp = g.x0 + w / 2 + Math.sin(m.t * 1.4) * 40, gyp = cbTop + vbH / 2; ctx.beginPath(); ctx.arc(gxp, gyp, 6, 0, TAU); ctx.setLineDash([3, 3]); ctx.strokeStyle = '#2f6df6'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]); T(g.x0 + w / 2, cbTop - 8, '전도띠 전자가 아주 적게(0은 아님) 있어요', PHONE ? 11.5 : 12.5, '#2f6df6', 'center', 800); }
      else T(g.x0 + w / 2, cbTop - 8, '열에너지로는 전도띠에 올라갈 수 없어요', PHONE ? 11.5 : 12.5, '#b42318', 'center', 800);
    }
    D.label(g.p[0] + 84, g.p[1] + 52, CLS_NAME[cl] + ' · ' + (m.mat === 'x' ? '직접 고른 띠 간격' : MATS.find((x) => x.id === m.mat).name), { bg: cl === 'c' ? '#2f6df6' : cl === 's' ? '#14a058' : '#e2464b', size: 13, align: 'center' });
    // 계기
    panel(g.m[0], g.m[1], g.m[2], g.m[3]); panel(g.i[0], g.i[1], g.i[2], g.i[3]);
    T(g.m[0] + 14, g.m[1] + 24, '전도띠 전자 수 (상온)', 13.5, '#26324a', 'left', 800);
    T(g.m[0] + 14, g.m[1] + 44, '도체의 전자 수 = 1 로 비교', 11.5, '#5a6679', 'left', 700);
    const ex = eg === 0 ? 0 : expOf(eg), frac = clamp(1 + ex / -LOGMIN, 0, 1);
    const gx0 = g.m[0] + 18, gw = g.m[2] - 36, gy = g.m[1] + 74;
    ctx.fillStyle = '#eef1f7'; ctx.fillRect(gx0, gy, gw, 20);
    const grd = ctx.createLinearGradient(gx0, 0, gx0 + gw, 0); grd.addColorStop(0, '#2f6df6'); grd.addColorStop(0.5, '#14a058'); grd.addColorStop(1, '#e2464b');
    ctx.fillStyle = grd; ctx.globalAlpha = 0.28; ctx.fillRect(gx0, gy, gw, 20); ctx.globalAlpha = 1;
    ctx.fillStyle = frac > 0.002 ? '#394258' : '#394258'; ctx.fillRect(gx0, gy, gw * frac, 20);
    for (let k = 0; k <= 4; k++) { const x = gx0 + gw * k / 4; ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, gy + 20); ctx.lineTo(x, gy + 26); ctx.stroke(); T(x, gy + 40, '10' + (k === 4 ? '⁰' : sup('−' + ((4 - k) * 10))), 11, '#5a6679', 'center', 700); }
    T(gx0, gy + 58, '← 거의 없음', 11.5, '#b42318', 'left', 700); T(gx0 + gw, gy + 58, '많음 →', 11.5, '#1d4ed8', 'right', 700);
    const reading = eg === 0 ? '1' : ex <= LOGMIN ? '0에 가까움' : pow10s(ex);
    T(g.m[0] + g.m[2] / 2, g.m[1] + g.m[3] - 62, reading, PHONE ? 20 : 26, cl === 'i' ? '#b42318' : '#26324a', 'center', 800);
    T(g.m[0] + g.m[2] / 2, g.m[1] + g.m[3] - 38, '전류 ∝ 전도띠 전자 수', 12.5, '#5a6679', 'center', 700);
    T(g.m[0] + g.m[2] / 2, g.m[1] + g.m[3] - 14, cl === 'c' ? '전류가 잘 흘러요' : cl === 's' ? '전류가 조금 흘러요' : '전류가 거의 안 흘러요', 14, cl === 'c' ? '#1d4ed8' : cl === 's' ? '#0f7a43' : '#b42318', 'center', 800);
    T(g.i[0] + 14, g.i[1] + 24, '구분 기준', 13.5, '#26324a', 'left', 800);
    textBlock(g.i[0] + 14, g.i[1] + 48, g.i[2] - 28, '도체: 띠가 부분적으로 차 있거나 겹쳐서 빈 준위가 바로 있어요.\n반도체: 띠 간격이 작아(약 1 eV) 열에너지로 일부 전자가 올라가요.\n부도체: 띠 간격이 커서(약 5 eV 이상) 올라갈 수 없어요.', PHONE ? 12 : 12.5, '#3a465c', PHONE ? 16 : 17, 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ③ 전자와 양공 ================= */
  const LC = PHONE
    ? { p: [12, 12, 456, 470], x0: 40, x1: 440, cbY: 104, cbH: 56, vbY: 330, vbH: 62, ns: 12, info: [12, 490, 456, 218] }
    : { p: [14, 14, 772, 400], x0: 50, x1: 750, cbY: 100, cbH: 60, vbY: 300, vbH: 64, ns: 20, info: [14, 422, 772, 124] };
  const slotX = (k) => LC.x0 + (k + 0.5) * (LC.x1 - LC.x0) / LC.ns;
  function nearestFreeSlot(c, x) {
    const taken = {}; c.H.forEach((h) => { taken[h.s] = true; });
    let k = clamp(Math.round((x - LC.x0) / (LC.x1 - LC.x0) * LC.ns - 0.5), 0, LC.ns - 1);
    for (let r = 0; r < LC.ns; r++) { for (const q of [k + r, k - r]) { if (q >= 0 && q < LC.ns && !taken[q]) return q; } }
    return -1;
  }
  function spawnPair(c, x, kind) {
    const s = nearestFreeSlot(c, x); if (s < 0) return false;
    c.E.push({ x: slotX(s), y: Math.random(), rise: 0, vx: 0 });
    c.H.push({ s, p: s, hopT: Math.random(), hopFrom: s });
    c.flash.push({ x: slotX(s), y: LC.vbY + LC.vbH / 2, t: 0, kind });
    return true;
  }
  function stepCarr(dt) {
    const c = S.c, g = LC;
    const nEq = nTherm(c.T) + (c.light === 'vis' ? N_LIGHT : 0), target = Math.min(Math.round(nEq), g.ns - 3);
    // 생성
    if (c.E.length < target) {
      c.sp += dt;
      if (c.light === 'vis') { c.rc += dt; if (c.rc > 0.22) { c.rc = 0; c.ph.push({ x: rnd(g.x0 + 20, g.x1 - 20), y: 40, ok: true, p: 0 }); } }
      else if (c.sp > 0.18) { c.sp = 0; spawnPair(c, rnd(g.x0 + 20, g.x1 - 20), 'heat'); }
    } else c.sp = 0;
    if (c.light === 'ir') { c.rc += dt; if (c.rc > 0.35) { c.rc = 0; c.ph.push({ x: rnd(g.x0 + 20, g.x1 - 20), y: 40, ok: false, p: 0 }); } }
    c.ph.forEach((p) => { p.y += dt * 260; if (p.ok && !p.done && p.y >= g.vbY + g.vbH / 2) { p.done = true; if (c.E.length < target + 1) spawnPair(c, p.x, 'light'); } });
    c.ph = c.ph.filter((p) => p.y < g.vbY + g.vbH + 60 && !p.done);
    // 재결합 (전압이 없거나 쌍이 너무 많을 때)
    if (c.E.length > target && c.E.length > 0) {
      c.recT = (c.recT || 0) + dt;
      if (c.recT > 0.25) { c.recT = 0; const i = Math.floor(Math.random() * c.E.length); const e = c.E[i]; let bi = 0, bd = 1e9; c.H.forEach((h, j) => { const dd = Math.abs(slotX(h.s) - e.x); if (dd < bd) { bd = dd; bi = j; } }); const h = c.H[bi]; if (h) { c.flash.push({ x: slotX(h.s), y: g.vbY + g.vbH / 2, t: 0, kind: 'rec' }); parts.burst(slotX(h.s), (g.cbY + g.vbY) / 2, { count: 5, speed: 60, size: 2.4, colors: ['#ffd447', '#fff'], gravity: 0, life: 0.4 }); c.H.splice(bi, 1); } c.E.splice(i, 1); }
    } else c.recT = 0;
    // 전자 이동
    const on = c.volt === 'on';
    for (let i = c.E.length - 1; i >= 0; i--) {
      const e = c.E[i]; e.rise = Math.min(1, e.rise + dt * 2.2);
      if (on) e.x += dt * 70;
      if (e.x > g.x1 + 6) { parts.burst(g.x1, g.cbY + g.cbH / 2, { count: 4, speed: 50, size: 2.2, colors: ['#2f6df6', '#fff'], gravity: 0, life: 0.35 }); c.E.splice(i, 1); }
    }
    // 양공 이동: 이웃 전자가 빈자리로 옮겨 가며 양공은 반대쪽(−극)으로
    for (let i = c.H.length - 1; i >= 0; i--) {
      const h = c.H[i];
      h.p = SciSim.approach(h.p, h.s, dt, 16);
      if (on) { h.hopT += dt * 1.6; if (h.hopT >= 1) { h.hopT = 0; const to = h.s - 1; if (to < 0) { c.H.splice(i, 1); parts.burst(g.x0, g.vbY + g.vbH / 2, { count: 4, speed: 50, size: 2.2, colors: ['#e2552a', '#fff'], gravity: 0, life: 0.35 }); continue; } if (!c.H.some((o) => o.s === to)) { h.hopFrom = h.s; h.s = to; } } }
    }
    c.flash.forEach((f) => { f.t += dt; }); c.flash = c.flash.filter((f) => f.t < 0.5);
    // 미션 기록
    const cnt = c.E.length;
    c.tm.heat = (c.T >= 600 && cnt >= 5) ? c.tm.heat + dt : 0;
    c.tm.vis = (c.light === 'vis' && c.T <= 350 && cnt >= 5) ? c.tm.vis + dt : 0;
    c.tm.ir = (c.light === 'ir' && c.T <= 350) ? c.tm.ir + dt : 0;
    if (c.tm.heat > 0.6) c.seen.heat = true; if (c.tm.vis > 0.6) c.seen.vis = true; if (c.tm.ir > 1.2 && cnt === 0) c.seen.ir = true;
  }
  function drawCarr(dt) {
    const c = S.c, g = LC, w = g.x1 - g.x0, on = c.volt === 'on';
    panel(g.p[0], g.p[1], g.p[2], g.p[3]);
    T(g.p[0] + 14, g.p[1] + 26, '순수한 규소의 띠 (띠 간격 ' + f1(EG_SI) + ' eV)', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const cbBot = g.cbY + g.cbH;
    // 전극
    [[g.x0 - 14, '−', '#2f6df6'], [g.x1 + 14, '+', '#e2464b']].forEach((e) => { D.roundRect(e[0] - 5, g.cbY - 8, 10, g.vbY + g.vbH - g.cbY + 16, 5); ctx.fillStyle = on ? e[2] : '#c4ccd9'; ctx.fill(); T(e[0], g.cbY - 14, e[1], 16, on ? e[2] : '#98a2b3', 'center', 800); });
    bandRect(g.x0, g.cbY, w, g.cbH, 'c', 0); bandRect(g.x0, g.vbY, w, g.vbH, 'v', 0);
    T(g.x0 + 8, g.cbY - 8, '전도띠', 12.5, '#c2410c', 'left', 800); T(g.x0 + 8, g.vbY + g.vbH + 18, '원자가띠', 12.5, '#1d4ed8', 'left', 800);
    const gy = (cbBot + g.vbY) / 2;
    D.arrow(g.x0 + 30, gy + 1, g.x0 + 30, cbBot + 1, { color: '#14a058', width: 2.4, head: 8 }); D.arrow(g.x0 + 30, gy - 1, g.x0 + 30, g.vbY - 1, { color: '#14a058', width: 2.4, head: 8 });
    T(g.x0 + 42, gy + 5, '띠 간격 ' + f1(EG_SI) + ' eV (빈 곳: 전자가 있을 수 없어요)', PHONE ? 11 : 12.5, '#0f7a43', 'left', 800);
    // 원자가띠의 전자 (양공 자리는 비어 있음)
    const holes = {}; c.H.forEach((h) => { holes[h.s] = true; });
    for (let k = 0; k < g.ns; k++) {
      if (holes[k]) continue;
      const hopping = c.H.find((h) => Math.abs(h.p - h.s) > 0.04 && h.hopFrom === k + 0 && false);
      eDot(slotX(k), g.vbY + g.vbH / 2, 6.2);
    }
    c.H.forEach((h) => {
      const moving = Math.abs(h.p - h.s) > 0.03;
      const hx = slotX(h.p) - 0; // 양공의 위치 (부드럽게 이동)
      hDot(hx, g.vbY + g.vbH / 2, 7);
      if (moving) { const ex = slotX(h.hopFrom + h.s - h.p); D.glow(ex, g.vbY + g.vbH / 2, 14, '#8bd0ff', 0.6); eDot(ex, g.vbY + g.vbH / 2, 6.2); }
    });
    // 전도띠의 전자
    c.E.forEach((e) => {
      const yc = g.cbY + 14 + e.y * (g.cbH - 28), ys = g.vbY + g.vbH / 2, y = lerp(ys, yc, SciSim.ease.outCubic(e.rise));
      D.glow(e.x, y, 12, '#8bd0ff', 0.45); eDot(e.x, y, 6.2);
    });
    c.flash.forEach((f) => { const q = f.t / 0.5; ctx.beginPath(); ctx.arc(f.x, f.y, 6 + 18 * q, 0, TAU); ctx.strokeStyle = f.kind === 'rec' ? 'rgba(255,196,0,' + (1 - q) + ')' : f.kind === 'light' ? 'rgba(20,160,88,' + (1 - q) + ')' : 'rgba(242,107,58,' + (1 - q) + ')'; ctx.lineWidth = 3; ctx.stroke(); });
    // 광자
    c.ph.forEach((p) => { const col = p.ok ? wlSolid(NM_VIS) : '#c2410c'; D.glow(p.x, p.y, 16, col, 0.5); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); for (let i = -18; i <= 18; i += 2) { const xx = p.x + 6 * Math.sin(i / 5 * TAU / 2.2), yy = p.y + i; if (i === -18) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); } ctx.stroke(); });
    if (c.light !== 'off') {
      const E = HC / (c.light === 'vis' ? NM_VIS : NM_IR);
      D.label(g.p[0] + g.p[2] / 2, g.p[1] + 52, '광자 에너지 ' + f2(E) + ' eV ' + (E >= EG_SI ? '≥' : '<') + ' 띠 간격 ' + f1(EG_SI) + ' eV → ' + (E >= EG_SI ? '전자가 올라가요' : '전자가 올라가지 못해요'), { bg: E >= EG_SI ? '#14a058' : '#e2464b', size: PHONE ? 11.5 : 13 });
    }
    if (on) { D.arrow(g.x0 + w * 0.3, g.cbY + g.cbH + 24, g.x0 + w * 0.3 + 70, g.cbY + g.cbH + 24, { color: '#2f6df6', width: 3, head: 10 }); T(g.x0 + w * 0.3 + 76, g.cbY + g.cbH + 29, '전자 → + 극', 12.5, '#1d4ed8', 'left', 800); D.arrow(g.x0 + w * 0.3 + 70, g.vbY - 22, g.x0 + w * 0.3, g.vbY - 22, { color: '#e2552a', width: 3, head: 10 }); T(g.x0 + w * 0.3 + 76, g.vbY - 17, '양공 → − 극', 12.5, '#c2410c', 'left', 800); }
    // 정보
    const f = g.info; panel(f[0], f[1], f[2], f[3]);
    const cnt = c.E.length, cur = on ? cnt : 0;
    T(f[0] + 14, f[1] + 26, '전자–양공 쌍 ' + cnt + '개 · 상대 전류 ' + cur, PHONE ? 14 : 16, '#26324a', 'left', 800);
    const bw = f[2] - 28, by = f[1] + 40; ctx.fillStyle = '#eef1f7'; ctx.fillRect(f[0] + 14, by, bw, 14);
    const mx = g.ns - 3;
    ctx.fillStyle = on ? '#14a058' : '#b6bfcd'; ctx.fillRect(f[0] + 14, by, bw * clamp(cur / mx, 0, 1), 14);
    T(f[0] + 14, by + 30, '0', 11.5, '#5a6679', 'left', 700); T(f[0] + 14 + bw, by + 30, String(mx), 11.5, '#5a6679', 'right', 700);
    textBlock(f[0] + 14, by + 52, f[2] - 28, '온도가 높을수록, 띠 간격보다 큰 에너지의 빛을 받을수록 쌍이 많아져요. 전압이 있으면 전자는 + 극으로, 양공은 − 극으로 움직여 전류가 흘러요. (쌍의 수는 그림에 보이는 개수예요.)', PHONE ? 12.5 : 13, '#3a465c', PHONE ? 17 : 18, 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ④ 도핑 ================= */
  const LD = PHONE
    ? { lat: [12, 12, 456, 330], gx: 40, gy: 80, sp: 56, cols: 8, rows: 4, bd: [12, 350, 456, 230], gauge: [12, 588, 456, 120] }
    : { lat: [14, 14, 480, 400], gx: 54, gy: 92, sp: 56, cols: 8, rows: 5, bd: [504, 14, 282, 400], gauge: [14, 422, 772, 124] };
  const DOP_POS = [[3, 2], [6, 1], [1, 3], [5, 3], [2, 0], [7, 3], [4, 4], [0, 1], [6, 4], [3, 0]];
  const dopCount = (e) => Math.round(2 + (e + 9));
  function dopCarriers(d) {
    const want = d.dop === 'none' ? 0 : dopCount(d.e);
    while (d.car.length < want) { const p = DOP_POS[d.car.length % DOP_POS.length]; d.car.push({ x: LD.gx + p[0] * LD.sp, y: LD.gy + Math.min(p[1], LD.rows - 1) * LD.sp, vx: rnd(-20, 20), vy: rnd(-20, 20) }); }
    if (d.car.length > want) d.car.length = want;
  }
  function stepDope(dt) {
    const d = S.d; dopCarriers(d);
    const g = LD, x0 = g.gx - 20, x1 = g.gx + (g.cols - 1) * g.sp + 20, y0 = g.gy - 20, y1 = g.gy + (g.rows - 1) * g.sp + 20;
    d.car.forEach((c) => {
      c.vx += rnd(-90, 90) * dt; c.vy += rnd(-90, 90) * dt; c.vx *= 0.96; c.vy *= 0.96;
      const dr = d.dop === 'P' ? 14 : -14;   // 전자는 오른쪽(+극), 양공은 왼쪽(−극)으로 흘러가요
      c.x += (c.vx + dr) * dt; c.y += c.vy * dt;
      if (c.x > x1) c.x = x0 + (c.x - x1); if (c.x < x0) c.x = x1 - (x0 - c.x);
      if (c.y > y1) { c.y = y1; c.vy = -Math.abs(c.vy); } if (c.y < y0) { c.y = y0; c.vy = Math.abs(c.vy); }
    });
    d.hopT += dt;
    if (d.hopT > 0.9 && d.dop !== 'none') { d.hopT = 0; d.hops.push({ t: 0 }); }
    d.hops.forEach((h) => { h.t += dt; }); d.hops = d.hops.filter((h) => h.t < 0.9);
    d.tm.n = (d.dop === 'P' && d.e >= -8) ? d.tm.n + dt : 0; d.tm.p = (d.dop === 'B' && d.e >= -8) ? d.tm.p + dt : 0;
    if (d.tm.n > 0.6) d.seen.n = true; if (d.tm.p > 0.6) d.seen.p = true;
  }
  function bandDiagram(x, y, w, h, kind, lbl, o) {
    // kind: 'none' | 'P' | 'B'; 간격 1.1 eV 를 눈금에 맞춰 그려요 (도너 · 억셉터 준위는 0.05 eV)
    o = o || {};
    const th = Math.round(h * 0.2), sc = (h - 2 * th - 8) / EG_SI, cbB = y + th, vbT = cbB + EG_SI * sc;
    bandRect(x, y, w, th, 'c', 0); bandRect(x, vbT, w, th, 'v', 1);
    T(x + w - 8, y + th - 7, '전도띠', 12, '#c2410c', 'right', 800); T(x + w - 8, vbT + th - 7, '원자가띠', 12, '#1d4ed8', 'right', 800);
    T(x + 8, (cbB + vbT) / 2 + 4, 'Eg ' + f1(EG_SI) + ' eV', 12, '#0f7a43', 'left', 800);
    const dy = kind === 'P' ? cbB + E_DON * sc : vbT - E_DON * sc;
    if (kind !== 'none') {
      ctx.strokeStyle = kind === 'P' ? '#e2552a' : '#7c5cff'; ctx.lineWidth = 3; ctx.setLineDash([7, 4]); ctx.beginPath(); ctx.moveTo(x + w * 0.3, dy); ctx.lineTo(x + w * 0.9, dy); ctx.stroke(); ctx.setLineDash([]);
      T(x + w * 0.3 - 6, dy + (kind === 'P' ? 15 : -7), (kind === 'P' ? '도너 준위' : '억셉터 준위'), 11.5, kind === 'P' ? '#c2410c' : '#5b3fd0', 'right', 800);
      if (!o.nodepth) T(x + w * 0.5, dy + (kind === 'P' ? -6 : 15), '준위 깊이 ' + E_DON + ' eV', 10.5, '#5a6679', 'center', 700);
      const tt = (o.t || 0) % 1.6;
      if (kind === 'P') { eDot(x + w * 0.6, dy, 5.5); if (tt < 0.8) { const q = SciSim.ease.outCubic(tt / 0.8); eDot(x + w * 0.6 + 14, lerp(dy, cbB - 14, q), 5.5); D.arrow(x + w * 0.6 + 26, dy - 4, x + w * 0.6 + 26, cbB - 6, { color: 'rgba(226,85,42,.5)', width: 2, head: 7 }); } }
      else { if (tt < 0.8) { const q = SciSim.ease.outCubic(tt / 0.8); eDot(x + w * 0.6, lerp(vbT + 10, dy, q), 5.5); } hDot(x + w * 0.45, vbT + 14, 5.5); }
    }
  }
  function drawDope(dt) {
    const d = S.d, g = LD;
    if (d.sub === 'bands') {
      const px = PHONE ? 12 : 14, pw = PHONE ? 456 : 772;
      panel(px, 14, pw, PHONE ? 690 : 532);
      T(px + 14, 40, '띠 그림 세 개 — 어떤 반도체일까요?', PHONE ? 13.5 : 15, '#26324a', 'left', 800);
      const ordr = ['B', 'none', 'P'], names = ['가', '나', '다'];
      const n = 3, cw = PHONE ? pw - 60 : (pw - 28 - 40) / 3, ch = PHONE ? 180 : 330;
      ordr.forEach((k, i) => { const x = PHONE ? px + 30 : px + 14 + i * (cw + 20), y = PHONE ? 70 + i * 205 : 90; D.label(x + 24, y - 10, names[i], { bg: '#394258', size: 15 }); bandDiagram(x, y + 14, cw, ch - 14, k, '', { t: S.t + i * 0.5, nodepth: true }); });
      parts.update(dt); parts.draw(ctx);
      return;
    }
    // 격자
    panel(g.lat[0], g.lat[1], g.lat[2], g.lat[3]);
    T(g.lat[0] + 14, g.lat[1] + 26, '규소 결정 (위에서 본 모습) · ' + (d.dop === 'none' ? '순수 규소' : d.dop === 'P' ? '인(5가) 도핑' : '붕소(3가) 도핑'), PHONE ? 12 : 14, '#26324a', 'left', 800);
    const k = d.dop === 'none' ? 0 : dopCount(d.e), dopSet = {}; for (let i = 0; i < k; i++) { const p = DOP_POS[i]; if (p[1] < g.rows) dopSet[p[0] + ',' + p[1]] = true; }
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
      const x = g.gx + c * g.sp, y = g.gy + r * g.sp;
      if (c < g.cols - 1) { ctx.strokeStyle = '#c4ccd9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + g.sp, y); ctx.stroke(); }
      if (r < g.rows - 1) { ctx.strokeStyle = '#c4ccd9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + g.sp); ctx.stroke(); }
    }
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
      const x = g.gx + c * g.sp, y = g.gy + r * g.sp, isD = dopSet[c + ',' + r];
      if (isD) { const col = d.dop === 'P' ? '#e2552a' : '#7c5cff'; D.glow(x, y, 26, col, 0.35); D.sphere(x, y, 15, col, { gloss: true, shadow: true, text: d.dop === 'P' ? 'P' : 'B' }); }
      else D.sphere(x, y, 12, '#6aa0ff', { gloss: true, text: 'Si', textScale: 0.9 });
    }
    // 이동 전하
    d.car.forEach((c) => { if (d.dop === 'P') { D.glow(c.x, c.y, 12, '#8bd0ff', 0.5); eDot(c.x, c.y, 5.5); } else hDot(c.x, c.y, 6.5); });
    const lb = g.lat[1] + g.lat[3];
    if (d.dop === 'none') T(g.lat[0] + g.lat[2] / 2, lb - 14, '자유롭게 움직이는 전하가 거의 없어요', PHONE ? 11.5 : 13, '#5a6679', 'center', 800);
    else T(g.lat[0] + g.lat[2] / 2, lb - 14, d.dop === 'P' ? '인의 전자 5개 중 4개는 결합, 남는 전자 1개가 자유롭게 움직여요 → 전자 ⊖' : '붕소는 전자 3개뿐이라 결합에 1개가 모자라요 → 빈자리(양공 ⊕)가 움직여요', PHONE ? 10.5 : 12, d.dop === 'P' ? '#1d4ed8' : '#c2410c', 'center', 800);
    T(g.lat[0] + g.lat[2] - 12, g.lat[1] + 26, d.dop === 'none' ? '' : '그림에는 불순물 ' + k + '개만 그렸어요', PHONE ? 10.5 : 12, '#7b8aa3', 'right', 700);
    // 띠 그림
    panel(g.bd[0], g.bd[1], g.bd[2], g.bd[3]);
    T(g.bd[0] + 14, g.bd[1] + 26, '띠 그림', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    bandDiagram(g.bd[0] + 16, g.bd[1] + 46, g.bd[2] - 32, g.bd[3] - 100, d.dop, '', { t: S.t });
    T(g.bd[0] + g.bd[2] / 2, g.bd[1] + g.bd[3] - 34, d.dop === 'none' ? '준위가 없어요 (순수)' : d.dop === 'P' ? 'n형: 다수 전하 나르개 = 전자' : 'p형: 다수 전하 나르개 = 양공', PHONE ? 12 : 13, '#26324a', 'center', 800);
    T(g.bd[0] + g.bd[2] / 2, g.bd[1] + g.bd[3] - 12, '전체는 전기적으로 중성이에요', PHONE ? 11.5 : 12.5, '#0f7a43', 'center', 800);
    // 전도성 계기
    const q = g.gauge; panel(q[0], q[1], q[2], q[3]);
    const fac = d.dop === 'none' ? 1 : dopeFactor(d.e), lg = Math.log10(fac), bw = q[2] - 28;
    T(q[0] + 14, q[1] + 26, '전도성 (순수 규소 = 1)', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    T(q[0] + q[2] - 14, q[1] + 26, d.dop === 'none' ? '1배' : '약 ' + sciStr(fac) + '배', PHONE ? 15 : 18, d.dop === 'none' ? '#5a6679' : '#0f7a43', 'right', 800);
    ctx.fillStyle = '#eef1f7'; ctx.fillRect(q[0] + 14, q[1] + 42, bw, 16);
    ctx.fillStyle = '#14a058'; ctx.fillRect(q[0] + 14, q[1] + 42, bw * clamp(lg / 8, 0, 1), 16);
    for (let t = 0; t <= 8; t += 2) { const x = q[0] + 14 + bw * t / 8; ctx.strokeStyle = '#7b8aa3'; ctx.beginPath(); ctx.moveTo(x, q[1] + 58); ctx.lineTo(x, q[1] + 64); ctx.stroke(); T(x, q[1] + 78, '10' + sup(t), 11.5, '#5a6679', 'center', 700); }
    T(q[0] + 14, q[1] + q[3] - 12, '불순물 비율 ' + (d.dop === 'none' ? '—' : pow10s(d.e) + ' (규소 원자 ' + sciStr(Math.pow(10, -d.e)).replace('1.0×', '') + '개 중 1개)'), PHONE ? 11.5 : 13, '#3a465c', 'left', 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* ---------- 읽음 칸 ---------- */
  function updReadouts() {
    if (S.mode === 'band') {
      const b = S.b; readouts('원자 수 N', b.N + '개', '원자 간격 d', f2(b.d) + ' nm', '띠 간격', b.N < 2 ? '—' : f2(gapNd(b.N, b.d)) + ' eV');
    } else if (S.mode === 'mat') {
      const m = S.m, ex = m.eg === 0 ? 0 : expOf(m.eg);
      readouts('띠 간격', m.eg === 0 ? '0 (겹침)' : f1(m.eg) + ' eV', '전도띠 전자 수', m.eg === 0 ? '1' : ex <= LOGMIN ? '0에 가까움' : pow10s(ex), '구분', CLS_NAME[clsOf(m.eg)]);
    } else if (S.mode === 'carr') {
      const c = S.c; readouts('온도', c.T + ' K', '전자–양공 쌍', c.E.length + '개', '상대 전류', (c.volt === 'on' ? c.E.length : 0) + '');
    } else {
      const d = S.d; readouts('불순물', d.dop === 'none' ? '없음' : d.dop === 'P' ? '인 → n형' : '붕소 → p형', '비율', d.dop === 'none' ? '—' : pow10s(d.e), '전도성', d.dop === 'none' ? '1배' : '약 ' + sciStr(dopeFactor(d.e)) + '배');
    }
  }

  /* ---------- 컨트롤 연결 ---------- */
  $$('#nSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.b.N = +b.dataset.v; updateCtl(); }));
  $('#sD').addEventListener('input', (e) => { S.b.d = Math.round(+e.target.value * 100) / 100; Sound.tick(); updateCtl(); });
  const matSeg = $('#matSeg');
  MATS.concat([{ id: 'x', name: '직접', eg: null }]).forEach((m) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = m.id; b.textContent = m.name; b.addEventListener('click', () => { Sound.click(); S.m.mat = m.id; if (m.eg != null) { S.m.eg = m.eg; } updateCtl(); }); matSeg.appendChild(b); });
  $('#sEg').addEventListener('input', (e) => { S.m.eg = Math.round(+e.target.value * 10) / 10; const hit = MATS.find((m) => Math.abs(m.eg - S.m.eg) < 1e-9); S.m.mat = hit ? hit.id : 'x'; Sound.tick(); updateCtl(); });
  $('#sT').addEventListener('input', (e) => { S.c.T = +e.target.value; Sound.tick(); updateCtl(); });
  $$('#lightSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.c.light = b.dataset.v; S.c.rc = 0; updateCtl(); }));
  $$('#voltSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.c.volt = b.dataset.v; updateCtl(); }));
  $$('#dopSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.d.dop = b.dataset.v; S.d.car = []; updateCtl(); }));
  $('#sE').addEventListener('input', (e) => { S.d.e = +e.target.value; Sound.tick(); updateCtl(); });
  const resetSel = (sels, st, ok) => { Object.keys(st).forEach((k) => delete st[k]); Object.keys(ok).forEach((k) => delete ok[k]); sels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); };
  const labSels = mkSelects($('#labRows'), labDefs, labSt, labOk);
  const josaEun = (w) => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c % 28 !== 0 ? '은' : '는'; };
  const CLSQ = MATS.map((m) => [m.name + josaEun(m.name) + '?', [['c', '도체'], ['s', '반도체'], ['i', '부도체']], clsOf(m.eg)]);
  const clsSels = mkSelects($('#clsRows'), CLSQ, clsSt, clsOk);
  const MTQ = [['가는 어떤 반도체일까요?', [['none', '순수 반도체'], ['P', 'n형 반도체'], ['B', 'p형 반도체']], 'B'], ['나는 어떤 반도체일까요?', [['none', '순수 반도체'], ['P', 'n형 반도체'], ['B', 'p형 반도체']], 'none'], ['다는 어떤 반도체일까요?', [['none', '순수 반도체'], ['P', 'n형 반도체'], ['B', 'p형 반도체']], 'P']];
  const mtSels = mkSelects($('#mtRows'), MTQ, mtSt, mtOk);

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '원자가 모이면 준위가 띠가 돼요', short: '에너지띠', icon: '🪜', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 규소인데 왜 순수한 규소는 거의 전기가 안 통하고, 소량의 불순물을 넣으면 잘 통할까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(수소 원자와 에너지 준위)에서</b> 원자 속 전자의 에너지는 띄엄띄엄한 <b>준위</b>라는 것을 배웠어요. 그런데 고체에는 원자가 아주 많이 모여 있어요. 이웃 원자끼리 영향을 주면 준위는 어떻게 될까요?</div>' +
        '<p>원자 수 N과 원자 사이 간격 d를 바꾸며 준위가 어떻게 달라지는지 살펴봐요. (통합과학에서 배운 “자유 전자·불순물”을 띠 구조로 설명하는 첫걸음이에요.)</p>',
      features: ['band'],
      setup() { S.b = mkB(); need = ''; resetSel(labSels, labSt, labOk); setScene('band'); updateCtl(); },
      recap: '원자가 모이면 이웃 원자의 영향으로 각 준위가 원자 수만큼 갈라져, 아주 많은 준위가 촘촘히 모인 띠가 돼요. 전자로 가득 찬 아랫 띠가 원자가띠, 비어 있는 윗 띠가 전도띠, 그 사이 에너지가 없는 곳이 띠 간격이에요.',
      summary: '<ul><li>원자 1개에서는 준위가 하나씩이지만, 원자 N개가 모이면 이웃 원자와의 상호작용으로 준위가 <b>N개로 갈라져</b> 촘촘한 <b>띠</b>가 돼요.</li><li>원자 사이 간격이 <b>작을수록</b> 영향이 커서 띠가 넓어지고 띠 사이 간격은 줄어요.</li><li>전자로 가득 찬 아랫 띠 = <b>원자가띠</b>, 비어 있는 윗 띠 = <b>전도띠</b>, 둘 사이 에너지가 없는 곳 = <b>띠 간격</b>.</li></ul>',
      missions: [
        {
          title: '준위를 띠로 만들기',
          goal: '원자 수를 <b>20개 이상</b>으로 늘려 띠를 만들고, 원자 간격을 <b>0.35 nm 이하</b>와 <b>0.50 nm 이상</b>으로 각각 바꿔 띠 폭의 변화를 관찰하세요.',
          hint: '원자 수 버튼에서 20개나 50개를 고른 뒤 간격 슬라이더를 왼쪽 끝(0.30 nm)과 오른쪽 끝(0.60 nm) 쪽으로 움직여 보세요.',
          setup() { need = ''; updateCtl(); setScene('band'); },
          check: () => S.b.seenN && S.b.seenNear && S.b.seenFar,
          hold: 0.2,
          status: () => mark(S.b.N >= 20) + ' 원자 ' + S.b.N + '개 (20개 이상) &nbsp; ' + mark(S.b.seenNear) + ' 간격 0.35 nm 이하 &nbsp; ' + mark(S.b.seenFar) + ' 간격 0.50 nm 이상',
          explain: '원자가 모이면 준위가 N개로 갈라져 띠가 돼요. 간격이 <b>' + f2(0.3) + ' nm</b>일 때 띠 폭은 <b>' + f2(widthNd(50, 0.3)) + ' eV</b>, <b>' + f2(0.6) + ' nm</b>일 때는 <b>' + f2(widthNd(50, 0.6)) + ' eV</b>로, 원자가 가까울수록 띠가 넓어지고 띠 간격(' + f2(gapNd(50, 0.3)) + ' eV ↔ ' + f2(gapNd(50, 0.6)) + ' eV)은 줄어요.',
        },
        {
          title: '띠의 이름표 붙이기', manual: true,
          goal: '원자 50개의 에너지 그림에서 ①, ②, ③ 부분의 이름을 고르고 ✔ 확인하기를 누르세요.',
          hint: '아래쪽 띠는 전자가 가득 차 있어요 (원자가띠). 위쪽 띠는 비어 있어요 (전도띠). 두 띠 사이에는 에너지 값이 없어요.',
          setup() { need = 'lab'; S.b.N = 50; resetSel(labSels, labSt, labOk); updateCtl(); setScene('band'); },
          check() {
            const r = checkSelects(labDefs, labSels, labSt, labOk);
            if (r.miss) return '아직 고르지 않은 칸이 ' + r.miss + '개 있어요.';
            return r.bad ? '빨간 칸을 다시 골라 보세요. 전자로 가득 찬 띠와 비어 있는 띠를 구분해 보세요.' : true;
          },
          status: () => '고른 칸 ' + labDefs.filter((w, i) => labSt[i]).length + ' / ' + labDefs.length,
          explain: '① 비어 있는 위쪽 띠 = <b>전도띠</b>, ② 두 띠 사이 에너지가 없는 곳 = <b>띠 간격</b>, ③ 전자로 가득 찬 아래쪽 띠 = <b>원자가띠</b>예요. 전자는 띠 간격에는 있을 수 없어요.',
        },
        {
          type: 'quiz', title: '원자 1개의 준위가 띠가 되는 까닭',
          goal: '원자 1개일 때 하나였던 준위가 고체에서는 띠가 되는 까닭은?',
          setup() { need = ''; updateCtl(); setScene('band'); },
          choices: ['이웃한 원자들이 서로 영향을 주어 준위가 아주 많이 갈라지기 때문', '고체에서는 전자의 수가 줄어들기 때문', '고체에서는 에너지 보존 법칙이 성립하지 않기 때문', '원자가 커져서 전자가 사라지기 때문'],
          answer: 0,
          feedback: ['', '전자 수가 줄어서가 아니라, 원자 수가 늘어 준위가 갈라지는 거예요.', '에너지 보존 법칙은 항상 성립해요. 달라지는 것은 준위의 개수예요.', '전자는 사라지지 않아요. 같은 에너지였던 준위가 갈라지는 거예요.'],
          explain: '원자가 가까이 모이면 이웃 원자와의 상호작용으로 같은 에너지였던 준위가 <b>원자 수만큼 갈라져요</b>. 원자가 매우 많은 고체에서는 갈라진 준위가 촘촘해 하나의 <b>띠</b>처럼 보여요.',
        },
      ],
    },
    {
      title: '띠 간격으로 도체와 부도체를 구분해요', short: '띠 간격', icon: '🧱', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 고체에는 전자로 가득 찬 <b>원자가띠</b>와 비어 있는 <b>전도띠</b>, 그 사이 <b>띠 간격</b>이 있다는 것을 알았어요. 전류가 흐르려면 전자가 <b>움직일 수 있는 빈 준위</b>가 필요해요.</div>' +
        '<p>띠 간격 E<sub>g</sub>를 0에서 10 eV까지 바꿔 보며 전도띠에 올라간 전자의 수와 전류가 어떻게 달라지는지 알아봐요. 상온에서 전자가 얻는 열에너지는 약 ' + KT + ' eV로 아주 작아요.</p>',
      features: ['mat'],
      setup() { S.m = mkM(); need = ''; resetSel(clsSels, clsSt, clsOk); setScene('mat'); updateCtl(); },
      recap: '띠가 부분적으로 차 있거나 겹치면 도체, 띠 간격이 작으면(약 1 eV) 열로 일부 전자가 올라가 반도체, 띠 간격이 매우 크면(약 5 eV 이상) 전자가 올라갈 수 없어 부도체예요.',
      summary: '<ul><li>전류가 흐르려면 전자가 움직일 <b>빈 준위</b>가 필요해요. 가득 찬 띠의 전자는 갈 곳이 없어요.</li><li><b>도체</b>(구리): 띠가 부분적으로 차 있거나 두 띠가 겹쳐서 전자가 쉽게 움직여요.</li><li><b>반도체</b>(규소 1.1 eV, 저마늄 0.67 eV, 갈륨 비소 1.4 eV): 띠 간격이 작아 열에너지로 일부 전자가 전도띠로 올라가요.</li><li><b>부도체</b>(다이아몬드 5.5 eV, 유리 약 9 eV): 띠 간격이 커서 전자가 올라갈 수 없어요. (부도체에도 전자는 있어요. 올라갈 에너지가 없을 뿐이에요.)</li></ul>',
      missions: [
        {
          title: '전류가 거의 사라지는 띠 간격 찾기',
          goal: '띠 간격 슬라이더로 <b>도체(0)</b>, <b>반도체 구간</b>, <b>부도체(' + f1(EG_INS) + ' eV 이상)</b>를 차례로 살펴보세요. 전류계(전도띠 전자 수) 바늘이 눈금 끝에 닿는 곳을 찾아요.',
          hint: '슬라이더를 왼쪽 끝(0)에서 시작해 1~2 eV 부근, 그리고 5 eV 쪽으로 천천히 움직여요. 각 구간에서 0.5초쯤 머물러요.',
          setup() { need = ''; S.m.seen = {}; updateCtl(); setScene('mat'); },
          check: () => (S.m.seen.c || 0) > 0.5 && (S.m.seen.s || 0) > 0.5 && (S.m.seen.i || 0) > 0.5,
          hold: 0.1,
          status: () => mark((S.m.seen.c || 0) > 0.5) + ' 도체 (Eg = 0) &nbsp; ' + mark((S.m.seen.s || 0) > 0.5) + ' 반도체 (0 < Eg < ' + f1(EG_INS) + ') &nbsp; ' + mark((S.m.seen.i || 0) > 0.5) + ' 부도체 (Eg ≥ ' + f1(EG_INS) + ')<br>지금: Eg = ' + f1(S.m.eg) + ' eV → ' + CLS_NAME[clsOf(S.m.eg)],
          explain: '상온에서 전도띠로 올라가는 전자 수는 열에너지(약 ' + KT + ' eV)에 비해 띠 간격이 클수록 급격히 줄어요. 규소(1.1 eV)는 도체의 약 <b>' + pow10s(expOf(1.1)) + '</b>배이고, 띠 간격이 약 <b>' + f1(EG_INS) + ' eV</b> 이상이면 전도띠 전자가 거의 없어 전류가 흐르지 않아요 (부도체).',
        },
        {
          title: '물질 6종 분류하기', manual: true,
          goal: '구리, 규소, 저마늄, 갈륨 비소, 다이아몬드, 유리를 <b>도체 · 반도체 · 부도체</b>로 분류하고 ✔ 확인하기를 누르세요.',
          hint: '물질 버튼을 눌러 띠 간격을 확인해요. 띠가 겹치면 도체, 약 1 eV 안팎이면 반도체, 5 eV 이상이면 부도체예요.',
          setup() { need = 'cls'; resetSel(clsSels, clsSt, clsOk); updateCtl(); setScene('mat'); },
          check() {
            const r = checkSelects(CLSQ, clsSels, clsSt, clsOk);
            if (r.miss) return '아직 고르지 않은 칸이 ' + r.miss + '개 있어요.';
            return r.bad ? '빨간 칸을 다시 골라 보세요. 물질 버튼으로 띠 간격(0 / 1 eV 안팎 / 5 eV 이상)을 확인해 보세요.' : true;
          },
          status: () => '고른 칸 ' + CLSQ.filter((w, i) => clsSt[i]).length + ' / ' + CLSQ.length,
          explain: MATS.map((m) => m.name + ' (' + (m.eg === 0 ? '겹침' : f2(m.eg).replace(/0$/, '') + ' eV') + ') → <b>' + CLS_NAME[clsOf(m.eg)] + '</b>').join('<br>'),
        },
        {
          type: 'quiz', title: '부도체의 전자',
          goal: '다이아몬드와 같은 부도체에서 전류가 흐르지 않는 까닭으로 옳은 것은?',
          setup() { need = ''; S.m.mat = 'di'; S.m.eg = 5.5; updateCtl(); setScene('mat'); },
          choices: ['부도체에는 전자가 하나도 없기 때문', '전도띠로 올라갈 에너지가 부족하고, 가득 찬 원자가띠에는 빈 준위가 없기 때문', '부도체의 전자는 전압을 걸어도 힘을 받지 않기 때문', '부도체는 원자가 없기 때문'],
          answer: 1,
          feedback: ['부도체에도 전자는 많이 있어요. 전자가 가득 찬 원자가띠를 보세요.', '', '전자는 전하를 가지므로 힘을 받아요. 다만 움직일 빈 자리가 없어요.', '부도체도 원자로 이루어져 있어요.'],
          explain: '부도체에도 전자는 많지만 원자가띠가 <b>가득 차서</b> 움직일 빈 준위가 없고, 띠 간격이 커서 열에너지로는 <b>전도띠로 올라갈 수 없어요</b>. 그래서 전류가 거의 흐르지 않아요.',
        },
      ],
    },
    {
      title: '순수 반도체의 전자와 양공', short: '전자·양공', icon: '⚡', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 반도체는 띠 간격이 작아서 열에너지로 일부 전자가 전도띠로 올라간다는 것을 알았어요. 전자가 올라간 자리에는 어떤 일이 생길까요?</div>' +
        '<p>전자가 전도띠로 올라가면 원자가띠에는 전자의 빈자리 <b>양공</b>이 생겨요. <b>온도</b>와 <b>빛</b>으로 전자–양공 쌍을 만들고, 전압을 걸어 이들이 어떻게 움직이는지 관찰해요.</p>',
      features: ['carr'],
      setup() { S.c = mkC(); need = ''; setScene('carr'); updateCtl(); },
      recap: '열이나 띠 간격보다 큰 에너지의 빛으로 전자가 전도띠에 올라가면 원자가띠에 양공이 생겨요. 전압을 걸면 전자는 + 극으로, 양공(이웃 전자가 차례로 채우며 빈자리가 이동)은 − 극으로 움직여 전류가 흘러요. 온도가 높을수록 쌍이 늘어 저항이 줄어요.',
      summary: '<ul><li>전자가 전도띠로 올라가면 원자가띠에 <b>양공</b>(전자의 빈자리)이 생겨요. 전자와 양공은 <b>쌍</b>으로 생겨요.</li><li>전압을 걸면 전자는 <b>+ 극</b>, 양공은 <b>− 극</b> 쪽으로 이동해 둘 다 전류를 나르는 <b>전하 나르개</b>예요. 양공은 이웃 전자가 차례로 빈자리를 채워서 옮겨 가요.</li><li>온도가 높으면 전자–양공 쌍이 늘어 <b>저항이 줄어요</b> (금속은 반대로 온도가 오르면 저항이 커져요).</li><li>빛은 광자 에너지가 <b>띠 간격 이상</b>일 때만 쌍을 만들어요. 규소(' + f1(EG_SI) + ' eV)는 파장 ' + f0(HC / EG_SI) + ' nm보다 짧은 빛(가시광선 포함)에 반응하고 적외선(' + NM_IR + ' nm, ' + f2(HC / NM_IR) + ' eV)에는 반응하지 않아요. → 광센서 · 태양 전지의 원리.</li></ul>',
      missions: [
        {
          title: '온도와 빛으로 전자–양공 쌍 만들기',
          goal: '① 온도를 <b>600 K 이상</b>으로 올려 쌍을 5개 이상 만들고, ② 온도를 낮춘 채(350 K 이하) <b>가시광</b>으로 쌍을 5개 이상 만든 뒤, ③ <b>적외선</b>에는 쌍이 생기지 않는 것을 확인하세요.',
          hint: '① 온도 슬라이더를 오른쪽(600 K 이상)으로. ② 온도를 300 K쯤으로 되돌리고 빛에서 “가시광 550 nm”를 고르세요. ③ “적외선 1300 nm”를 고르고 1~2초 기다려요. 쌍의 개수는 화면 아래 숫자로 확인해요.',
          setup() { need = ''; S.c.seen = {}; S.c.tm = { heat: 0, vis: 0, ir: 0 }; updateCtl(); setScene('carr'); },
          check: () => S.c.seen.heat && S.c.seen.vis && S.c.seen.ir,
          hold: 0.1,
          status: () => mark(S.c.seen.heat) + ' 온도 600 K 이상에서 쌍 5개 이상 &nbsp; ' + mark(S.c.seen.vis) + ' 가시광(350 K 이하)에서 쌍 5개 이상 &nbsp; ' + mark(S.c.seen.ir) + ' 적외선에서는 쌍 0개<br>지금: ' + S.c.T + ' K · 쌍 ' + S.c.E.length + '개',
          explain: '온도가 올라가면 열에너지가 커져 전도띠로 올라가는 전자가 늘어요 (그림 속 쌍의 수: 300 K에서 ' + f1(nTherm(300)) + '개 → 600 K에서 ' + f1(nTherm(600)) + '개). 가시광(' + NM_VIS + ' nm)의 광자 에너지는 ' + f2(HC / NM_VIS) + ' eV로 띠 간격 ' + f1(EG_SI) + ' eV보다 커서 전자를 올리지만, 적외선(' + NM_IR + ' nm)은 ' + f2(HC / NM_IR) + ' eV로 모자라서 전자를 올리지 못해요.',
        },
        {
          type: 'quiz', title: '온도가 오르면 반도체의 저항은?',
          goal: '순수한 반도체는 온도가 오르면 저항이 어떻게 될까요?',
          setup() { need = ''; updateCtl(); setScene('carr'); },
          choices: ['전자–양공 쌍이 많아져서 저항이 줄어든다', '원자가 더 세게 진동해서 저항이 반드시 커진다', '전자–양공 쌍의 수는 그대로여서 변하지 않는다', '양공이 사라져서 저항이 없어진다'],
          answer: 0,
          feedback: ['', '금속은 그렇지만, 반도체는 온도가 오를 때 전하 나르개가 늘어나는 효과가 훨씬 커요.', '온도 슬라이더를 올려 보세요. 쌍의 수가 크게 늘어요.', '양공은 사라지지 않고 오히려 전자와 같은 수만큼 늘어요.'],
          explain: '온도가 높아지면 전도띠로 올라가는 전자가 늘어 <b>전자와 양공이 모두 늘어요</b>. 전류를 나르는 입자가 많아져 저항이 <b>줄어요</b>. 양공이 움직인다는 것은 이웃 전자가 빈자리로 차례로 옮겨 가서 <b>빈자리가 반대쪽으로 이동</b>한다는 뜻이에요.',
        },
      ],
    },
    {
      title: '불순물로 전도성 조절하기 (도핑)', short: '도핑', icon: '🧪', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 순수한 반도체에서는 열이나 빛으로 만든 전자–양공 쌍만이 전류를 나른다는 것을 알았어요. 그런데 규소에 소량의 <b>불순물</b>을 넣으면 전도성이 크게 달라져요. (통합과학에서 “불순물을 넣어 전도성을 조절한 반도체”를 배웠어요.)</div>' +
        '<p>규소(전자 4개로 결합)에 <b>인(5가)</b> 또는 <b>붕소(3가)</b>를 넣어 어떤 전하 나르개가 생기는지, 띠 그림에 어떤 준위가 생기는지 살펴봐요.</p>',
      features: ['dope'],
      setup() { S.d = mkD(); need = ''; resetSel(mtSels, mtSt, mtOk); setScene('dope'); updateCtl(); },
      recap: '5가 원소(인)를 넣으면 전도띠 바로 아래의 도너 준위에서 전자가 쉽게 전도띠로 올라가는 n형, 3가 원소(붕소)를 넣으면 원자가띠 바로 위의 억셉터 준위로 전자가 올라가 양공이 생기는 p형이 돼요. 불순물 원자도 중성이어서 반도체 전체는 중성이에요.',
      summary: '<ul><li><b>n형 반도체</b>: 인(5가)을 넣으면 남는 전자 1개가 <b>도너 준위</b>(전도띠 바로 아래, 약 ' + E_DON + ' eV)에서 상온에서도 쉽게 전도띠로 올라가요. 다수 전하 나르개 = <b>전자</b>.</li><li><b>p형 반도체</b>: 붕소(3가)를 넣으면 전자 1개가 부족해 <b>억셉터 준위</b>(원자가띠 바로 위)로 원자가띠 전자가 올라가고 <b>양공</b>이 생겨요. 다수 전하 나르개 = <b>양공</b>.</li><li>불순물을 규소 원자 10<sup>7</sup>개당 1개(10<sup>−7</sup>)만 넣어도 전도성이 순수 규소의 약 <b>' + sciStr(dopeFactor(-7)) + '배</b>가 돼요.</li><li>n형, p형 모두 전체적으로 <b>전기적으로 중성</b>이에요. 불순물 원자도 중성이기 때문이에요.</li></ul>',
      missions: [
        {
          title: 'n형과 p형 반도체 만들기',
          goal: '인(5가)을 넣어 <b>n형</b>, 붕소(3가)를 넣어 <b>p형</b>을 만드세요. 불순물 비율은 <b>10<sup>−8</sup> 이상</b>으로 해요.',
          hint: '“넣는 불순물”에서 인을 고르고 비율 슬라이더를 10^−8 이상으로 올린 뒤 잠시 기다려요. 이어서 붕소도 같게 해요.',
          setup() { need = ''; S.d.sub = 'lat'; S.d.seen = {}; S.d.tm = { n: 0, p: 0 }; updateCtl(); setScene('dope'); },
          check: () => S.d.seen.n && S.d.seen.p,
          hold: 0.1,
          status: () => mark(S.d.seen.n) + ' 인 → n형 (전자가 움직여요) &nbsp; ' + mark(S.d.seen.p) + ' 붕소 → p형 (양공이 움직여요)<br>지금: ' + (S.d.dop === 'none' ? '불순물 없음' : (S.d.dop === 'P' ? '인' : '붕소') + ' ' + pow10s(S.d.e)),
          explain: '인(5가)은 결합에 4개를 쓰고 <b>전자 1개가 남아</b> 자유롭게 움직여요 → n형. 붕소(3가)는 전자가 <b>1개 모자라</b> 빈자리(양공)가 생겨요 → p형. 비율 10<sup>−7</sup>이면 전도성이 순수 규소의 약 ' + sciStr(dopeFactor(-7)) + '배예요.',
        },
        {
          title: '띠 그림 짝 맞추기', manual: true,
          goal: '띠 그림 가, 나, 다가 각각 순수 · n형 · p형 중 어느 것인지 고르고 ✔ 확인하기를 누르세요.',
          hint: '전도띠 바로 아래에 준위(도너)가 있으면 n형, 원자가띠 바로 위에 준위(억셉터)가 있으면 p형, 아무것도 없으면 순수 반도체예요.',
          setup() { need = 'mt'; S.d.sub = 'bands'; resetSel(mtSels, mtSt, mtOk); updateCtl(); setScene('dope'); },
          check() {
            const r = checkSelects(MTQ, mtSels, mtSt, mtOk);
            if (r.miss) return '아직 고르지 않은 칸이 ' + r.miss + '개 있어요.';
            return r.bad ? '빨간 칸을 다시 골라 보세요. 준위가 전도띠 쪽에 있는지 원자가띠 쪽에 있는지 살펴보세요.' : true;
          },
          status: () => '고른 칸 ' + MTQ.filter((w, i) => mtSt[i]).length + ' / ' + MTQ.length,
          explain: '가: 원자가띠 바로 위에 <b>억셉터 준위</b> → <b>p형</b>. 나: 추가 준위 없음 → <b>순수 반도체</b>. 다: 전도띠 바로 아래에 <b>도너 준위</b> → <b>n형</b>.',
        },
        {
          type: 'quiz', title: 'n형 반도체는 전기를 띠고 있을까?',
          goal: 'n형 반도체(인을 넣은 규소)에 대한 설명으로 옳은 것은?',
          setup() { need = ''; S.d.sub = 'lat'; S.d.dop = 'P'; S.d.car = []; updateCtl(); setScene('dope'); },
          choices: ['전자가 많아도 불순물 원자까지 포함한 전체는 전기적으로 중성이다', '전자가 많으므로 전체가 음(−)전하를 띤다', '인 원자는 전자를 잃어 전체가 양(+)전하를 띤다', '전하 나르개가 늘어나도 전도성은 변하지 않는다'],
          answer: 0,
          feedback: ['', '인 원자의 원자핵 전하도 규소보다 하나 더 커서, 전자 수가 늘어난 만큼 +전하도 늘어나 중성이에요.', '인이 전자를 내놓아도 원자핵에 +전하가 그만큼 있어 전체는 중성이에요.', '전하 나르개가 크게 늘어 전도성이 수만 배 이상 커져요.'],
          explain: '인 원자는 원자핵의 양성자도 하나 더 많아서 <b>중성</b>이에요. n형 반도체는 전체로 <b>중성</b>이고, 움직일 수 있는 전자가 많아졌을 뿐이에요. 전하 나르개가 늘어서 전도성이 크게 커져요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-energy-band', mount: '#game', badge: '띠 구조 탐험가', homeHref: '../../index.html#hp',
    featureLabels: { band: '🪜 원자 수 · 간격 · 에너지 그림', mat: '🧱 물질 · 띠 간격 · 전도띠 전자 수 계기', carr: '⚡ 온도 · 빛 · 전압 · 전자와 양공', dope: '🧪 도핑 · 띠 그림' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('band');
  let lastLvl = -1, lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && (game.level !== lastLvl || game.free !== lastFree)) { lastLvl = game.level; lastFree = game.free; updateCtl(); }
    HITS.length = 0;
    stepBand(dt); stepMat(dt); stepCarr(dt); stepDope(dt);
    view.apply(); ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'band') drawBand(dt); else if (S.mode === 'mat') drawMat(dt); else if (S.mode === 'carr') drawCarr(dt); else drawDope(dt);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    updReadouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, updateCtl, gapNd, widthNd, expOf, EG_INS, nTherm, dopeFactor, clsOf, MATS, EG_SI,
  };
})();
