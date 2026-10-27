/* =========================================================
   화학 Ⅰ. 화학의 언어 - 화학 반응의 양적 관계 [12화학01-03]
   ① 설명: 계산 틀 (반응식 → 몰로 바꾸기 → 몰수비 → 질량으로 바꾸기)
   ② 탐구: 질량 계산 (CaCO₃ 분해 · 메테인 연소, 질량 보존 막대로 검산)
   ③ 분석: 부피로 확장 (기체 부피 22.4 L/mol, 0 °C 1기압 · 입자 수)
   ④ 적용: 남는 반응물 (먼저 소진되는 반응물) — 수득률 · 용액의 몰 농도는 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const INK = '#1b2333', MUTED = '#5d6879', VIO = '#7c3aed', AMB = '#d97706', GOOD = '#14a058', BAD = '#e2464b', BLU = '#3867f4';
  const BGC = '#f4f1fb';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BGC });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = [], W = (t) => ctx.measureText(t).width;
    str.split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((w) => {
        const t = line ? line + ' ' + w : w;
        if (W(t) <= maxW || !line) line = t; else { out.push(line); line = w; }
        if (W(line) > maxW) { let cur = ''; for (const ch of line) { if (W(cur + ch) > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; } line = cur; }
      });
      out.push(line);
    });
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  const fT = (v) => String(+(+v).toFixed(3));                    // 소수 셋째 자리까지, 끝의 0은 생략
  const parseNum = (s) => { const fr = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(String(s)); if (fr && +fr[2] !== 0) return +fr[1] / +fr[2]; const t = String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const SUBD = '₀₁₂₃₄₅₆₇₈₉', SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const FOR = (k) => k.replace(/\d/g, (d) => SUBD[+d]);
  const sci = (v) => { const e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e); return (+m.toFixed(3)) + '×10' + String(e).split('').map((c) => SUPD[+c]).join(''); };
  const NA = 6.02e23, VM = 22.4;

  /* ---------- 화학 자료 (원자량은 반올림 값) ---------- */
  const AW = { H: 1, C: 12, N: 14, O: 16, Mg: 24, Al: 27, Cl: 35.5, Ca: 40 };
  const COMP = {
    H2: { H: 2 }, O2: { O: 2 }, H2O: { H: 2, O: 1 }, N2: { N: 2 }, NH3: { N: 1, H: 3 }, CH4: { C: 1, H: 4 }, CO2: { C: 1, O: 2 },
    CaCO3: { Ca: 1, C: 1, O: 3 }, CaO: { Ca: 1, O: 1 }, Al: { Al: 1 }, HCl: { H: 1, Cl: 1 }, AlCl3: { Al: 1, Cl: 3 }, Mg: { Mg: 1 }, MgO: { Mg: 1, O: 1 },
  };
  const MM = (k) => Object.keys(COMP[k]).reduce((s, e) => s + COMP[k][e] * AW[e], 0);
  const SP_COL = ['#8b5cf6', '#3b82f6', '#f59e0b', '#ec7a52'];
  const EQS = {
    h2o: [['H2', 2, 'g', 0], ['O2', 1, 'g', 0], ['H2O', 2, 'l', 1]],
    caco3: [['CaCO3', 1, 's', 0], ['CaO', 1, 's', 1], ['CO2', 1, 'g', 1]],
    ch4: [['CH4', 1, 'g', 0], ['O2', 2, 'g', 0], ['CO2', 1, 'g', 1], ['H2O', 2, 'l', 1]],
    nh3: [['N2', 1, 'g', 0], ['H2', 3, 'g', 0], ['NH3', 2, 'g', 1]],
    al: [['Al', 2, 's', 0], ['HCl', 6, 'aq', 0], ['AlCl3', 2, 'aq', 1], ['H2', 3, 'g', 1]],
  };
  // 문제: g = 주어진 물질(식에서의 번호), gw = 주어진 질량(g), a = 구하는 물질, unit = 구하는 양의 단위
  function mkProb(id, name, eq, g, gw, gwTxt, a, unit) {
    const sp = EQS[eq], cg = sp[g][1], ca = sp[a][1], Mg = MM(sp[g][0]), Ma = MM(sp[a][0]);
    const n1 = r6(gw / Mg), n2 = r6(n1 * ca / cg), ans = r6(unit === 'g' ? n2 * Ma : n2 * VM);
    const all = sp.map((s) => ({ n: r6(n1 * s[1] / cg), m: r6(n1 * s[1] / cg * MM(s[0])) }));
    return { id, name, eq, sp, g, gw, gwTxt, a, unit, cg, ca, Mg, Ma, n1, n2, ans, all };
  }
  const P = {
    h2o: mkProb('h2o', '수소 연소', 'h2o', 0, 6, '6', 2, 'g'),
    caco3: mkProb('caco3', 'CaCO₃ 분해', 'caco3', 0, 200, '200', 1, 'g'),
    ch4: mkProb('ch4', '메테인 연소', 'ch4', 0, 8, '8.0', 1, 'g'),
    nh3: mkProb('nh3', '암모니아 합성', 'nh3', 2, 3.4, '3.4', 1, 'L'),
    al: mkProb('al', '알루미늄과 염산', 'al', 0, 5.4, '5.4', 3, 'L'),
  };
  const PLIST = { frame: [P.h2o], mass: [P.caco3, P.ch4], vol: [P.nh3, P.al] };
  const stateOf = {};
  Object.keys(P).forEach((k) => { stateOf[k] = { stage: 0, vals: [], ver: false, barp: { v: 0 }, tk: { x: 0 }, wrong: 0 }; });
  const probName = (p) => FOR(p.sp[p.g][0]) + ' ' + p.gwTxt + ' g → ' + FOR(p.sp[p.a][0]);
  const unitTxt = (p) => (p.unit === 'g' ? 'g' : 'L');
  const eqItems = (sp) => {
    const out = [];
    sp.forEach((s, j) => {
      if (j > 0) out.push({ t: s[3] === 1 && sp[j - 1][3] === 0 ? '  →  ' : '  +  ', color: s[3] === 1 && sp[j - 1][3] === 0 ? VIO : MUTED, sp: -1 });
      out.push({ t: s[1] > 1 ? s[1] + ' ' : '', color: BAD, sp: j }); out.push({ t: FOR(s[0]) + '(' + s[2] + ')', color: INK, sp: j });
    });
    return out;
  };
  // 한 줄 반응식 그리기 + 물질별 영역 반환
  function drawEq(cx, y, items, size, maxW) {
    ctx.save(); let sz = size, tot = 0;
    for (let k = 0; k < 7; k++) { ctx.font = D.font(sz, 800); tot = items.reduce((a, it) => a + ctx.measureText(it.t).width, 0); if (tot <= maxW) break; sz -= 1.5; }
    let x = cx - tot / 2; const spans = {}; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    items.forEach((it) => {
      const w = ctx.measureText(it.t).width; ctx.fillStyle = it.color; ctx.fillText(it.t, x, y);
      if (it.sp >= 0) { const o = spans[it.sp] || (spans[it.sp] = { x0: x, x1: x + w }); o.x1 = x + w; o.x0 = Math.min(o.x0, x); }
      x += w;
    });
    ctx.restore(); return { spans, size: sz };
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'frame', t: 0, fade: 0, gate: '',
    sel: { mass: 0, vol: 0 },
    order: { picks: [], shuf: [2, 0, 3, 1], done: false, shake: 0 },
    tank: { x: new SciSim.Spring(0, { stiffness: 90, damping: 14 }), ps: [] },
    left: { o2: 48, phase: 'idle', ps: [], events: [], t: 0, res: null, shake: 0 },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { frame: '🧮 계산 틀', mass: '⚖️ 질량 계산', vol: '💨 부피로 확장', left: '🧪 남는 반응물' };
  const tws = [];
  function tw(o, to, opts) { const h = SciSim.tween(o, to, opts); tws.push(h); if (tws.length > 60) tws.splice(0, 30); return h; }
  const curProb = () => (S.mode === 'frame' ? P.h2o : S.mode === 'mass' ? PLIST.mass[S.sel.mass] : PLIST.vol[S.sel.vol]);
  const stOf = (p) => stateOf[p.id];
  const solved = (p) => stOf(p).stage >= 3;

  /* ---------- 공통 UI ---------- */
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); clearTimeout(vTimer); if (S.mode === 'left') resetLeft(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    buildChips(); refreshCalc(); updateCtl();
    if (mode === 'vol') syncTank(true);
  }
  function buildChips() {
    const box = $('#rxChips'); box.innerHTML = '';
    if (S.mode !== 'mass' && S.mode !== 'vol') return;
    $('#rxHead').textContent = S.mode === 'mass' ? '⚖️ 질량 문제 고르기' : '💨 부피 문제 고르기';
    PLIST[S.mode].forEach((p, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.v = i; b.textContent = p.name;
      b.addEventListener('click', () => { Sound.click(); S.sel[S.mode] = i; refreshCalc(); updateCtl(); if (S.mode === 'vol') syncTank(false); });
      box.appendChild(b);
    });
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = S.gate === n.getAttribute('data-gate');
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#rxChips button').forEach((b) => { const p = PLIST[S.mode][+b.dataset.v]; b.classList.toggle('on', +b.dataset.v === S.sel[S.mode]); b.classList.toggle('done', solved(p) && (S.mode !== 'mass' || stOf(p).ver)); });
    $('#bVerify').hidden = S.mode !== 'mass';
    const p = S.mode === 'frame' || S.mode === 'mass' || S.mode === 'vol' ? curProb() : null;
    if (p) { $('#bVerify').disabled = !solved(p) || stOf(p).ver; $('#bCalc').disabled = solved(p); $('#cIn').disabled = solved(p); }
    $('#oMinus').disabled = S.left.o2 <= 0 || S.left.phase === 'run'; $('#oPlus').disabled = S.left.o2 >= 64 || S.left.phase === 'run';
    $('#oRange').disabled = S.left.phase === 'run';
    $('#bReact').disabled = S.left.phase !== 'idle'; $('#bRedo').disabled = S.left.phase === 'idle';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ================= 4단계 계산기 ================= */
  const STAGE_LAB = ['② 몰로 바꾸기', '③ 몰수비로 구하기', '④ ' + '바꿔 쓰기'];
  function refreshCalc() {
    if (S.mode === 'left') return;
    const p = curProb(), s = stOf(p), a = FOR(p.sp[p.a][0]), g = FOR(p.sp[p.g][0]);
    let h = '', unit = 'mol', note = '';
    if (s.stage === 0) { h = '<span class="k">② 몰로 바꾸기</span><br>' + g + ' ' + p.gwTxt + ' g의 몰수 n = w ÷ M (M = ' + fT(p.Mg) + ' g/mol)'; unit = 'mol'; }
    else if (s.stage === 1) { h = '<span class="k">③ 계수비로 몰수 구하기</span><br>' + g + ' : ' + a + ' = ' + p.cg + ' : ' + p.ca + ' → ' + a + '의 몰수는?'; unit = 'mol'; }
    else if (s.stage === 2) {
      unit = unitTxt(p);
      h = p.unit === 'g' ? '<span class="k">④ 질량으로 바꾸기</span><br>' + a + '의 질량 w = n × M (M = ' + fT(p.Ma) + ' g/mol)' : '<span class="k">④ 부피로 바꾸기</span><br>' + a + '의 부피(0 °C, 1기압) V = n × ' + VM + ' L/mol';
    } else {
      h = '<div class="calc-done">🎉 ' + g + ' ' + p.gwTxt + ' g → ' + a + ' ' + fT(p.ans) + ' ' + unitTxt(p) + ' (' + fT(p.n1) + ' mol → ' + fT(p.n2) + ' mol)</div>';
    }
    if (s.stage < 3) note = '답을 쓰고 ✔ 확인을 눌러요. 지금까지 구한 값: ' + (s.vals.length ? s.vals.map((v, i) => ['n₁', 'n₂'][i] + ' = ' + fT(v) + ' mol').join(', ') : '없음');
    else note = S.mode === 'mass' ? (s.ver ? '검산을 마쳤어요.' : '⚖️ 질량 보존 검산을 눌러 반응물과 생성물의 질량 합을 비교해 봐요.') : S.mode === 'vol' ? '그림의 주사기 눈금에서 부피를 확인해요.' : '위 계산 컨베이어가 한 번 돌았어요.';
    $('#calcPrompt').innerHTML = h; $('#cUnit').textContent = unit; $('#cLab').textContent = s.stage < 3 ? '답' : '';
    $('#calcRow').style.display = s.stage < 3 ? '' : 'none';
    $('#calcNote').textContent = note; $('#cIn').value = '';
  }
  function expectOf(p, stage) { return stage === 0 ? p.n1 : stage === 1 ? p.n2 : p.ans; }
  function checkCalc() {
    if (S.mode === 'left') return;
    const p = curProb(), s = stOf(p); if (s.stage >= 3) return;
    const v = parseNum($('#cIn').value), e = expectOf(p, s.stage);
    if (isNaN(v)) { Sound.fail(); showHint('답을 숫자로 써 주세요.', 2600); return; }
    if (Math.abs(v - e) <= Math.max(0.0005, Math.abs(e) * 0.02)) {
      s.vals.push(r6(e)); s.stage++; Sound.success();
      tw(s.tk, { x: s.stage }, { duration: RM ? 0.01 : 0.7, ease: 'outCubic' });
      const c = cardRect(s.stage); parts.burst(c.x + c.w / 2, c.y + c.h / 2, { count: 12, speed: 110, size: 3, colors: ['#8b5cf6', '#14a058', '#ffb400'] });
      if (s.stage === 3 && S.mode === 'vol') syncTank(false);
      if (s.stage === 3 && S.mode === 'frame') { /* 예제 완료 */ }
      refreshCalc(); updateCtl();
    } else {
      s.wrong++; Sound.fail(); $('#cIn').classList.remove('bad'); void $('#cIn').offsetWidth; $('#cIn').classList.add('bad');
      let msg = '';
      const a = FOR(p.sp[p.a][0]);
      if (s.stage === 0) msg = Math.abs(v - p.gw) < 0.01 * p.gw ? '질량 그대로가 아니라, 몰질량 ' + fT(p.Mg) + ' g/mol로 나누어야 몰수가 돼요.' : Math.abs(v - p.gw * p.Mg) < 0.02 * p.gw * p.Mg ? '몰수는 질량 ÷ 몰질량이에요. 곱하지 말고 나누어요.' : 'n = w ÷ M이에요. ' + p.gwTxt + ' ÷ ' + fT(p.Mg) + '를 계산해 보세요.';
      else if (s.stage === 1) msg = Math.abs(v - p.n1) <= 0.02 * p.n1 && p.cg !== p.ca ? '계수비 ' + p.cg + ' : ' + p.ca + '를 아직 쓰지 않았어요. 몰수에 ' + p.ca + '/' + p.cg + '를 곱해요.' : Math.abs(v - r6(p.n1 * p.cg / p.ca)) <= 0.02 * p.n1 && p.cg !== p.ca ? '계수비를 거꾸로 썼어요. 구하는 물질의 계수 ' + p.ca + '가 분자예요.' : '몰수비 = 계수비예요. ' + fT(p.n1) + ' mol × ' + p.ca + '/' + p.cg + '를 계산해요.';
      else msg = Math.abs(v - p.n2) <= 0.02 * p.n2 ? (p.unit === 'g' ? '몰수에 ' + a + '의 몰질량 ' + fT(p.Ma) + ' g/mol을 곱해야 질량이 돼요.' : '기체 1 mol의 부피 ' + VM + ' L를 곱해야 부피가 돼요.') : (p.unit === 'g' ? 'w = n × M = ' + fT(p.n2) + ' × ' + fT(p.Ma) + '를 계산해요.' : 'V = n × ' + VM + ' = ' + fT(p.n2) + ' × ' + VM + '를 계산해요.');
      showHint(msg, 5200);
    }
  }
  $('#bCalc').addEventListener('click', checkCalc);
  $('#cIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') checkCalc(); });
  $('#cIn').addEventListener('input', () => $('#cIn').classList.remove('bad'));
  let vTimer = 0;
  $('#bVerify').addEventListener('click', () => {
    const p = curProb(), s = stOf(p); if (!solved(p) || s.ver) return;
    Sound.click(); s.ver = true; tw(s.barp, { v: 1 }, { duration: RM ? 0.01 : 1.4, ease: 'outCubic' });
    clearTimeout(vTimer); vTimer = setTimeout(() => { if (S.mode !== 'mass') return; Sound.success(); const B = LAY.bot; parts.burst(B.x + B.w / 2, B.y + 80, { count: 20, speed: 160, size: 3.4, colors: ['#8b5cf6', '#14a058', '#ffb400'] }); }, RM ? 0 : 900);
    refreshCalc(); updateCtl();
  });

  /* ================= 계산 컨베이어 (계산 틀 · 질량 계산 · 부피로 확장) ================= */
  const LAY = PHONE
    ? { eq: { x: 8, y: 8, w: 464, h: 84 }, conv: { x: 8, y: 100, w: 464, h: 306 }, bot: { x: 8, y: 414, w: 464, h: 278 }, cw: 448, ch: 62 }
    : { eq: { x: 8, y: 8, w: 784, h: 90 }, conv: { x: 8, y: 106, w: 784, h: 216 }, bot: { x: 8, y: 330, w: 784, h: 222 }, cw: 166, ch: 144 };
  function cardRect(i) {
    const c = LAY.conv;
    if (PHONE) return { x: c.x + 8, y: c.y + 34 + i * 68, w: LAY.cw, h: LAY.ch };
    return { x: c.x + 15 + i * (LAY.cw + 30), y: c.y + 58, w: LAY.cw, h: LAY.ch };
  }
  function drawUnit(kind, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineWidth = 2; ctx.strokeStyle = '#4c1d95'; ctx.fillStyle = '#c4b5fd'; ctx.lineCap = 'round';
    if (kind === 'g') {
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-5, 9); ctx.lineTo(5, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-11, -4); ctx.lineTo(11, -4); ctx.stroke();
      ctx.beginPath(); ctx.arc(-11, 0, 3.5, 0, Math.PI); ctx.moveTo(7.5, 0); ctx.arc(11, 0, 3.5, 0, Math.PI); ctx.stroke();
    } else if (kind === 'mol') {
      D.roundRect(-9, -9, 18, 18, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4c1d95'; [[-3.5, -3], [3.5, -3], [0, 3.5]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a, b, 2, 0, TAU); ctx.fill(); });
    } else {
      D.roundRect(-11, -6, 22, 12, 4); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(16, 0); ctx.moveTo(-11, -9); ctx.lineTo(-11, 9); ctx.stroke();
    }
    ctx.restore();
  }
  function tokenLabel(p, idx) {
    const s = stOf(p);
    return idx === 0 ? [p.gwTxt + ' g', 'g'] : idx === 1 ? [fT(p.n1) + ' mol', 'mol'] : idx === 2 ? [fT(p.n2) + ' mol', 'mol'] : [fT(p.ans) + ' ' + unitTxt(p), p.unit === 'g' ? 'g' : 'L'];
  }
  function drawCards(p) {
    const s = stOf(p), a = FOR(p.sp[p.a][0]), g = FOR(p.sp[p.g][0]), c = LAY.conv;
    panel(c.x, c.y, c.w, c.h, 14);
    T(c.x + 14, c.y + 24, '계산 컨베이어', 14.5, INK, 'left', 800);
    T(c.x + c.w - 14, c.y + 24, '값이 ① → ④로 변환돼요', 13, MUTED, 'right', 800);
    const titles = ['① 반응식', '② 몰로 바꾸기', '③ 몰수비', p.unit === 'g' ? '④ 질량으로' : '④ 부피로'];
    const tags = [['중3', '계수 맞추기'], ['새로', '몰질량'], ['중3', '계수비'], ['새로', p.unit === 'g' ? '× 몰질량' : '× 22.4 L/mol']];
    const lines = [
      ['계수비의 두 항', g + ' : ' + a, '= ' + p.cg + ' : ' + p.ca],
      ['n = w / M', p.gwTxt + ' g / ' + fT(p.Mg) + ' g/mol', '= ' + (s.stage >= 1 ? fT(p.n1) : '?') + ' mol'],
      ['몰수 × 계수비', (s.stage >= 1 ? fT(p.n1) + ' mol' : 'n') + ' × ' + p.ca + '/' + p.cg, '= ' + (s.stage >= 2 ? fT(p.n2) : '?') + ' mol'],
      [p.unit === 'g' ? 'w = n × M' : 'V = n × 22.4', (s.stage >= 2 ? fT(p.n2) + ' mol' : 'n') + ' × ' + (p.unit === 'g' ? fT(p.Ma) + ' g/mol' : '22.4 L/mol'), '= ' + (s.stage >= 3 ? fT(p.ans) : '?') + ' ' + unitTxt(p)],
    ];
    for (let i = 0; i < 4; i++) {
      const r = cardRect(i), done = i === 0 || s.stage >= i, act = !done && s.stage + 1 === i;
      if (i < 3) {
        const r2 = cardRect(i + 1);
        if (PHONE) D.arrow(r.x + r.w / 2, r.y + r.h + 1, r2.x + r2.w / 2, r2.y - 1, { color: done && s.stage >= i + 1 ? GOOD : '#b7bdd0', width: 3, head: 9 });
        else D.arrow(r.x + r.w + 3, r.y + r.h / 2, r2.x - 3, r.y + r.h / 2, { color: done && s.stage >= i + 1 ? GOOD : '#b7bdd0', width: 4, head: 11 });
      }
      ctx.save(); if (!done && !act) ctx.globalAlpha = 0.55;
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = done ? '#eefbf3' : '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = done ? GOOD : act ? VIO : '#d5d9e6'; ctx.lineWidth = act ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      ctx.restore();
      if (act) { const k = (S.t * 1.2) % 1; ctx.save(); ctx.strokeStyle = SciSim.color.rgba(VIO, 0.5 * (1 - k)); ctx.lineWidth = 3; D.roundRect(r.x - k * 7, r.y - k * 7, r.w + k * 14, r.h + k * 14, 12 + k * 7); ctx.stroke(); ctx.restore(); }
      const tx = PHONE ? r.x + 12 : r.x + 12, ty = PHONE ? r.y + 22 : r.y + 26;
      T(tx, ty, titles[i], PHONE ? 15 : 15.5, done ? '#0b6b39' : act ? '#5b21b6' : MUTED, 'left', 800);
      const lx = PHONE ? r.x + 150 : r.x + 12, ly = PHONE ? r.y + 20 : r.y + 56, lh = PHONE ? 19 : 24;
      lines[i].forEach((ln, k) => T(lx, ly + k * lh, ln, PHONE ? 14 : 15, k === 2 ? (done ? '#0b6b39' : MUTED) : INK, 'left', 800));
      if (PHONE) D.label(r.x + 12, r.y + 46, tags[i][0] + ' · ' + tags[i][1], { bg: tags[i][0] === '새로' ? '#f59e0b' : '#8b5cf6', size: 11.5, align: 'left', pad: 6 });
      else D.label(r.x + 12, r.y + r.h - 16, tags[i][0] + ' · ' + tags[i][1], { bg: tags[i][0] === '새로' ? '#f59e0b' : '#8b5cf6', size: 12, align: 'left', pad: 7 });
    }
    // 값 토큰
    const tk = s.tk.x, idx = Math.round(tk), lab = tokenLabel(p, idx), r0 = cardRect(0), rs = cardRect(1);
    let tx, ty;
    if (PHONE) { tx = r0.x + r0.w - 62; ty = r0.y + tk * (rs.y - r0.y) + r0.h / 2; }
    else { tx = r0.x + tk * (rs.x - r0.x) + r0.w / 2; ty = r0.y - 14; }
    ctx.save(); ctx.translate(tx, ty);
    D.shadow(() => { D.roundRect(-52, -15, 104, 30, 15); ctx.fillStyle = '#4c1d95'; ctx.fill(); }, { blur: 8, y: 3 });
    drawUnit(lab[1], -34, 0, 0.85); T(10, 5, lab[0], 13.5, '#fff', 'center', 800);
    ctx.restore();
  }
  function drawEqPanel(p) {
    const e = LAY.eq; panel(e.x, e.y, e.w, e.h, 14);
    const y = e.y + (PHONE ? 58 : 62), r = drawEq(e.x + e.w / 2, y, eqItems(p.sp), PHONE ? 20 : 26, e.w - 24);
    [[p.g, VIO, '주어진 물질 ' + p.gwTxt + ' g'], [p.a, AMB, '구하는 물질 (' + unitTxt(p) + ')']].forEach(([j, col, lab]) => {
      const sp = r.spans[j]; if (!sp) return;
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; D.roundRect(sp.x0 - 6, y - r.size - 2, sp.x1 - sp.x0 + 12, r.size + 14, 10); ctx.stroke(); ctx.fillStyle = col; ctx.globalAlpha = 0.09; ctx.fill(); ctx.restore();
      const lw = ctx.measureText ? 0 : 0; D.label((sp.x0 + sp.x1) / 2, y - r.size - 14, lab, { bg: col, size: PHONE ? 11.5 : 12.5, pad: 7 });
    });
  }

  /* ---- 계산 틀: 순서 카드 ---- */
  const ORD = [
    { t: '반응식을 쓰고 계수를 맞춘다', tag: '중3에서 배운 것', col: '#8b5cf6' },
    { t: '아는 물질의 질량을 몰로 바꾼다 (몰질량으로 나눈다)', tag: '새로 배우는 것', col: '#f59e0b' },
    { t: '계수비로 구하는 물질의 몰수를 구한다', tag: '중3의 계수비 → 몰수비', col: '#3b82f6' },
    { t: '몰을 질량 · 부피 · 입자 수로 바꾼다', tag: '새로 배우는 것', col: '#ec7a52' },
  ];
  function ordRect(k) {
    const b = LAY.bot;
    if (PHONE) return { x: b.x + 10 + (k % 2) * 228, y: b.y + 44 + Math.floor(k / 2) * 112, w: 216, h: 102 };
    return { x: b.x + 12 + k * 194, y: b.y + 50, w: 182, h: 150 };
  }
  function ordDown(p) {
    for (let k = 0; k < 4; k++) {
      const r = ordRect(k);
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        const id = S.order.shuf[k], pk = S.order.picks, at = pk.indexOf(id);
        Sound.click();
        if (at >= 0) pk.splice(at, 1); else if (pk.length < 4) pk.push(id);
        return true;
      }
    }
    return false;
  }
  function drawOrder() {
    const b = LAY.bot, o = S.order; panel(b.x, b.y, b.w, b.h, 14);
    T(b.x + 14, b.y + 26, '🃏 계산 순서 카드', 14.5, INK, 'left', 800);
    T(b.x + b.w - 14, b.y + 26, o.done ? '순서가 맞아요!' : '먼저 할 일부터 차례로 눌러요 (' + o.picks.length + ' / 4)', 13, o.done ? '#0b7a41' : MUTED, 'right', 800);
    for (let k = 0; k < 4; k++) {
      const r = ordRect(k), id = o.shuf[k], c = ORD[id], at = o.picks.indexOf(id), sh = o.shake > 0 && at >= 0 && at !== id ? Math.sin(S.t * 60) * 3 : 0;
      ctx.save(); ctx.translate(sh, 0);
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = at >= 0 ? '#f3efff' : '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = at >= 0 ? (o.done ? GOOD : c.col) : '#d5d9e6'; ctx.lineWidth = at >= 0 ? 3 : 2; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      const ls = wrap(c.t, r.w - 54, PHONE ? 14 : 15, 800); ls.forEach((l, i) => T(r.x + 12, r.y + 30 + i * (PHONE ? 19 : 21), l, PHONE ? 14 : 15, INK, 'left', 800));
      D.label(r.x + 12, r.y + r.h - 16, c.tag, { bg: c.col, size: 11.5, align: 'left', pad: 6 });
      if (at >= 0) { D.sphere(r.x + r.w - 20, r.y + 20, 15, o.done ? GOOD : VIO, { text: String(at + 1), textScale: 1.0 }); }
      ctx.restore();
    }
  }

  /* ---- 질량 보존 막대 ---- */
  function drawBars(p) {
    const b = LAY.bot, s = stOf(p); panel(b.x, b.y, b.w, b.h, 14);
    T(b.x + 14, b.y + 26, '⚖️ 질량 보존 검산', 14.5, INK, 'left', 800);
    T(b.x + b.w - 14, b.y + 26, s.ver ? '반응물의 합 = 생성물의 합' : solved(p) ? '검산 단추를 눌러요' : '먼저 계산을 끝내요', 13, s.ver ? '#0b7a41' : MUTED, 'right', 800);
    const x0 = b.x + (PHONE ? 16 : 100), BW = b.w - (PHONE ? 32 : 120), pg = clamp(s.barp.v, 0, 1);
    [0, 1].forEach((side) => {
      const items = p.sp.map((q, j) => ({ q, j, m: p.all[j].m, n: p.all[j].n })).filter((o) => o.q[3] === side), tot = items.reduce((a, o) => a + o.m, 0);
      const y = b.y + (PHONE ? 58 + side * 100 : 56 + side * 80);
      if (PHONE) T(x0, y - 8, side ? '생성물' : '반응물', 14, side ? AMB : VIO, 'left', 800); else T(b.x + 14, y + 28, side ? '생성물' : '반응물', 15, side ? AMB : VIO, 'left', 800);
      const by = y + (PHONE ? 0 : 6);
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#b7bdd0'; ctx.lineWidth = 1.5; D.roundRect(x0, by, BW, 44, 10); ctx.stroke(); ctx.restore();
      let cx = x0;
      items.forEach((o) => {
        const w = (o.m / tot) * BW * pg; if (w < 1) return;
        ctx.fillStyle = SP_COL[o.j % 4]; ctx.save(); D.roundRect(x0, by, BW * pg, 44, 10); ctx.clip(); ctx.fillRect(cx, by, w, 44); ctx.restore();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + w, by); ctx.lineTo(cx + w, by + 44); ctx.stroke();
        if (w > (PHONE ? 80 : 110)) T(cx + w / 2, by + 27, FOR(o.q[0]) + ' ' + fT(o.m) + ' g', PHONE ? 13 : 14, '#fff', 'center', 800);
        else if (w > 44) T(cx + w / 2, by + 27, fT(o.m) + ' g', 13, '#fff', 'center', 800);
        cx += w;
      });
      if (pg > 0.97) T(x0 + BW, by + 64, '합 ' + fT(tot) + ' g', 14, INK, 'right', 800);
    });
    if (!s.ver) T(b.x + b.w / 2, b.y + b.h - 22, solved(p) ? '각 물질의 질량 = 몰수 × 몰질량으로 막대가 채워져요.' : '구하는 물질의 질량을 구하면 반응물 · 생성물의 막대를 채울 수 있어요.', 13, MUTED, 'center', 700);
  }

  /* ---- 기체 주사기 (부피로 확장) ---- */
  const SY = (() => { const b = LAY.bot; return { x0: b.x + 30, w: b.w - 60, y: b.y + (PHONE ? 76 : 62), h: 66 }; })();
  const PER_P = 0.05;                                              // 입자 1개 = 0.05 mol
  const tankV = () => { const p = curProb(); return S.mode === 'vol' && solved(p) ? p.ans : 0; };
  const plungerX = () => clamp(SY.x0 + (S.tank.x.value / VM) * SY.w, SY.x0 + 6, SY.x0 + SY.w);
  function syncTank(snap) {
    const p = curProb(), V = tankV(); S.tank.x.target = V;
    if (snap || RM) { S.tank.x.value = V; S.tank.x.velocity = 0; }
    const n = V > 0 ? Math.min(20, Math.round(p.n2 / PER_P)) : 0, ps = S.tank.ps;
    while (ps.length > n) ps.pop();
    const xmax = SY.x0 + (V / VM) * SY.w;
    while (ps.length < n) ps.push({ x: SY.x0 + 12 + Math.random() * Math.max(10, xmax - SY.x0 - 24), y: SY.y + 14 + Math.random() * (SY.h - 28), vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120 });
  }
  function stepTank(dt) {
    S.tank.x.update(dt);
    const xa = SY.x0 + 8, xb = plungerX() - 8, ya = SY.y + 8, yb = SY.y + SY.h - 8;
    S.tank.ps.forEach((q) => {
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (xb < xa + 4) { q.x = xa + 2; } else {
        if (q.x < xa) { q.x = xa; q.vx = Math.abs(q.vx); } else if (q.x > xb) { q.x = xb; q.vx = -Math.abs(q.vx); }
      }
      if (q.y < ya) { q.y = ya; q.vy = Math.abs(q.vy); } else if (q.y > yb) { q.y = yb; q.vy = -Math.abs(q.vy); }
    });
  }
  function drawSyringe(p) {
    const b = LAY.bot, s = stOf(p), a = FOR(p.sp[p.a][0]), px = plungerX(), ok = solved(p);
    panel(b.x, b.y, b.w, b.h, 14);
    T(b.x + 14, b.y + 26, '💨 기체 주사기 (0 °C, 1기압)', 14.5, INK, 'left', 800);
    T(b.x + b.w - 14, b.y + 26, '눈금 끝 22.4 L = 기체 1 mol', 13, MUTED, 'right', 800);
    D.roundRect(SY.x0, SY.y, SY.w, SY.h, 10); ctx.fillStyle = '#f4f8ff'; ctx.fill();
    if (px > SY.x0 + 8) { ctx.save(); D.roundRect(SY.x0, SY.y, SY.w, SY.h, 10); ctx.clip(); ctx.fillStyle = 'rgba(56,103,244,.12)'; ctx.fillRect(SY.x0, SY.y, px - SY.x0, SY.h); ctx.restore(); }
    S.tank.ps.forEach((q) => D.sphere(q.x, q.y, 6, '#60a5fa', { gloss: true }));
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; D.roundRect(SY.x0, SY.y, SY.w, SY.h, 10); ctx.stroke();
    // 눈금
    [0, 5, 10, 15, 20].forEach((v) => { const x = SY.x0 + (v / VM) * SY.w; ctx.strokeStyle = '#7b8499'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, SY.y + SY.h); ctx.lineTo(x, SY.y + SY.h + 8); ctx.stroke(); T(x, SY.y + SY.h + 24, String(v), 12.5, MUTED, 'center', 800); });
    ctx.strokeStyle = '#7b8499'; ctx.beginPath(); ctx.moveTo(SY.x0 + SY.w, SY.y + SY.h); ctx.lineTo(SY.x0 + SY.w, SY.y + SY.h + 8); ctx.stroke(); T(SY.x0 + SY.w, SY.y + SY.h + 24, '22.4', 12.5, MUTED, 'right', 800);
    T(SY.x0, SY.y + SY.h + 24, '', 12, MUTED);
    // 피스톤
    D.shadow(() => { D.roundRect(px - 5, SY.y - 4, 10, SY.h + 8, 4); ctx.fillStyle = '#6b7690'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.fillStyle = '#9aa3b5'; ctx.fillRect(px, SY.y + SY.h / 2 - 4, Math.max(0, SY.x0 + SY.w + 16 - px), 8);
    D.roundRect(SY.x0 + SY.w + 12, SY.y + SY.h / 2 - 16, 8, 32, 3); ctx.fillStyle = '#6b7690'; ctx.fill();
    if (ok) {
      D.label(clamp(px, SY.x0 + 40, SY.x0 + SY.w - 40), SY.y - 16, fT(p.ans) + ' L', { bg: '#3867f4', size: 14 });
      const l1 = a + ' ' + fT(p.n2) + ' mol → 부피 V = ' + fT(p.n2) + ' × 22.4 = ' + fT(p.ans) + ' L', l2 = '분자 수 = ' + fT(p.n2) + ' × 6.02×10²³ = ' + sci(p.n2 * NA) + '개';
      const ys = SY.y + SY.h + 56;
      textBlock(b.x + 16, ys, b.w - 32, l1, PHONE ? 14 : 15.5, INK, 21, 800);
      textBlock(b.x + 16, ys + (PHONE ? 46 : 28), b.w - 32, l2, PHONE ? 14 : 15.5, VIO, 21, 800);
      T(b.x + b.w - 16, b.y + b.h - 14, '● = ' + PER_P + ' mol', 12.5, MUTED, 'right', 800);
    } else T(b.x + b.w / 2, SY.y + SY.h + 62, '계산을 끝내면 기체가 주사기를 채워요.', 14, MUTED, 'center', 800);
  }

  /* ================= ④ 남는 반응물 ================= */
  const LL = PHONE
    ? { vs: { x: 8, y: 50, w: 464, h: 236 }, tb: { x: 8, y: 294, w: 464, h: 186 }, gr: { x: 8, y: 488, w: 464, h: 204 } }
    : { vs: { x: 8, y: 50, w: 486, h: 300 }, tb: { x: 506, y: 50, w: 286, h: 300 }, gr: { x: 8, y: 360, w: 784, h: 192 } };
  const H2_G = 4, UNIT = 0.25;                                        // 수소 4 g(2 mol) 고정, 입자 1개 = 0.25 mol
  const calcLeft = (o2g) => {
    const nH = H2_G / MM('H2'), nO = o2g / MM('O2'), nW = Math.min(nH, 2 * nO), lH = nH - nW, lO = nO - nW / 2;
    return { nH, nO, nW, lH, lO, gW: nW * MM('H2O'), gH: lH * MM('H2'), gO: lO * MM('O2') };
  };
  const wOf = (o) => calcLeft(o).gW;
  const vessel = () => { const v = LL.vs; return { x0: v.x + 14, x1: v.x + v.w - 14, y0: v.y + 40, y1: v.y + v.h - 14 }; };
  function spawn(type) {
    const v = vessel(), a = Math.random() * TAU, sp = 35 + Math.random() * 35;
    return { type, x: v.x0 + 16 + Math.random() * (v.x1 - v.x0 - 32), y: v.y0 + 16 + Math.random() * (v.y1 - v.y0 - 32), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 2, st: 0 };
  }
  function resetLeft() {
    const L = S.left; L.phase = 'idle'; L.events = []; L.t = 0; L.res = null; L.ps = [];
    for (let i = 0; i < H2_G / MM('H2') / UNIT; i++) L.ps.push(spawn('H2'));
    for (let i = 0; i < Math.round(L.o2 / MM('O2') / UNIT); i++) L.ps.push(spawn('O2'));
    L.mk = L.mk || { x: L.o2, y: wOf(L.o2) };
    if (typeof updateCtl === 'function' && $('#bReact')) updateCtl();
  }
  function setO2(v, force) {
    v = clamp(Math.round(v / 8) * 8, 0, 64);
    if (S.left.phase === 'run' && !force) return;
    S.left.o2 = v; $('#oRange').value = v; $('#oOut').textContent = v + ' g'; $('#oRange').style.setProperty('--pct', (v / 64) * 100 + '%');
    resetLeft();
  }
  $('#oRange').addEventListener('input', () => { setO2(+$('#oRange').value); Sound.click(); });
  $('#oMinus').addEventListener('click', () => { setO2(S.left.o2 - 8); Sound.click(); });
  $('#oPlus').addEventListener('click', () => { setO2(S.left.o2 + 8); Sound.click(); });
  $('#bRedo').addEventListener('click', () => { Sound.click(); resetLeft(); });
  $('#bReact').addEventListener('click', () => {
    const L = S.left; if (L.phase !== 'idle') return;
    const h2 = L.ps.filter((q) => q.type === 'H2'), o2 = L.ps.filter((q) => q.type === 'O2'), produced = Math.min(h2.length, 2 * o2.length);
    if (produced === 0) { Sound.fail(); S.left.shake = 0.4; showHint('산소가 없어서 반응할 수 없어요. 산소를 늘려 보세요.', 3600); return; }
    Sound.click();
    const v = vessel(), n = produced / 2;
    L.events = [];
    for (let e = 0; e < n; e++) L.events.push({ m: [h2[2 * e], h2[2 * e + 1], o2[e]], x: v.x0 + 40 + Math.random() * (v.x1 - v.x0 - 80), y: v.y0 + 36 + Math.random() * (v.y1 - v.y0 - 72), delay: e * 0.4, done: false });
    L.phase = 'run'; L.t = 0; updateCtl();
  });
  function stepLeft(dt) {
    const L = S.left, v = vessel(); L.t += dt; L.shake = Math.max(0, L.shake - dt);
    L.mk = L.mk || { x: L.o2, y: wOf(L.o2) };
    L.mk.x = RM ? L.o2 : SciSim.approach(L.mk.x, L.o2, dt, 9); L.mk.y = RM ? wOf(L.o2) : SciSim.approach(L.mk.y, wOf(L.o2), dt, 9);
    const moving = new Set();
    L.events.forEach((e) => {
      if (e.done || L.t < e.delay) return;
      e.m.forEach((q) => { moving.add(q); q.vx = 0; q.vy = 0; q.x = SciSim.approach(q.x, e.x + (q.type === 'O2' ? 0 : (q === e.m[0] ? -14 : 14)), dt, 3.2); q.y = SciSim.approach(q.y, e.y + (q.type === 'O2' ? 0 : 6), dt, 3.2); });
      const close = e.m.every((q) => Math.hypot(q.x - e.x, q.y - e.y) < 22);
      if (close || L.t - e.delay > 2.2) {
        e.done = true; Sound.click();
        L.ps = L.ps.filter((q) => e.m.indexOf(q) < 0);
        for (let k = 0; k < 2; k++) { const w = spawn('H2O'); w.x = e.x + (k ? 12 : -12); w.y = e.y; L.ps.push(w); }
        parts.burst(e.x, e.y, { count: 8, speed: 70, size: 2.6, life: 0.6, colors: ['#60a5fa', '#ffffff', '#fbbf24'], gravity: 40 });
      }
    });
    L.ps.forEach((q) => {
      if (moving.has(q)) { q.rot += q.vr * dt; return; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      const m = PHONE ? 18 : 21;
      if (q.x < v.x0 + m) { q.x = v.x0 + m; q.vx = Math.abs(q.vx); } else if (q.x > v.x1 - m) { q.x = v.x1 - m; q.vx = -Math.abs(q.vx); }
      if (q.y < v.y0 + m) { q.y = v.y0 + m; q.vy = Math.abs(q.vy); } else if (q.y > v.y1 - m) { q.y = v.y1 - m; q.vy = -Math.abs(q.vy); }
    });
    if (L.phase === 'run' && L.events.every((e) => e.done)) {
      L.phase = 'done'; L.res = calcLeft(L.o2); Sound.success(); updateCtl();
      parts.burst(v.x0 + (v.x1 - v.x0) / 2, v.y0 + 40, { count: 18, speed: 150, size: 3.2, colors: ['#8b5cf6', '#14a058', '#ffb400'] });
    }
  }
  function drawPart(q) {
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(PHONE ? 1.1 : 1.35, PHONE ? 1.1 : 1.35);
    if (q.type === 'H2') { D.sphere(-5, 0, 5.5, '#f1f5f9', { outline: '#94a3b8', outlineWidth: 1 }); D.sphere(5, 0, 5.5, '#f1f5f9', { outline: '#94a3b8', outlineWidth: 1 }); }
    else if (q.type === 'O2') { D.sphere(-6.5, 0, 7.5, '#ef4444'); D.sphere(6.5, 0, 7.5, '#ef4444'); }
    else { D.sphere(0, -2, 7.5, '#ef4444'); D.sphere(-8, 6, 5, '#f1f5f9', { outline: '#94a3b8', outlineWidth: 1 }); D.sphere(8, 6, 5, '#f1f5f9', { outline: '#94a3b8', outlineWidth: 1 }); }
    ctx.restore();
  }
  function drawLeft() {
    const L = S.left, v = LL.vs, tb = LL.tb, gr = LL.gr, c = calcLeft(L.o2), done = L.phase === 'done';
    drawEq(VW / 2, 30, eqItems(EQS.h2o), PHONE ? 18 : 22, VW - 20);
    // 반응 용기
    panel(v.x, v.y, v.w, v.h, 14);
    T(v.x + 14, v.y + 26, '반응 용기 (입자 1개 = ' + UNIT + ' mol)', 14, INK, 'left', 800);
    const w = vessel();
    ctx.save(); const sh = L.shake > 0 ? Math.sin(S.t * 60) * 3 : 0; ctx.translate(sh, 0);
    D.roundRect(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0, 12); ctx.fillStyle = '#f3f8ff'; ctx.fill(); ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.stroke();
    L.ps.forEach(drawPart);
    ctx.restore();
    // 범례
    // 표
    panel(tb.x, tb.y, tb.w, tb.h, 14);
    const heads = ['', '처음', '반응 후'];
    T(tb.x + 14, tb.y + 24, '물질의 양', 14, INK, 'left', 800);
    const cx0 = tb.x + 14, cwd = (tb.w - 28 - (PHONE ? 100 : 60)) / 2, hx = [cx0 + (PHONE ? 100 : 60), cx0 + (PHONE ? 100 : 60) + cwd];
    heads.forEach((h, i) => { if (i) T(hx[i - 1] + cwd / 2, tb.y + 48, h, 13, MUTED, 'center', 800); });
    const rows = [['H₂', 'H2', H2_G, c.nH, c.gH, c.lH], ['O₂', 'O2', L.o2, c.nO, c.gO, c.lO], ['H₂O', 'H2O', 0, 0, c.gW, c.nW]];
    const rh = Math.min(66, (tb.h - 70) / 3);
    rows.forEach((r, i) => {
      const y = tb.y + 62 + i * rh, left = done && r[5] > 1e-9 && i < 2;
      if (left) { D.roundRect(tb.x + 8, y, tb.w - 16, rh - 4, 10); ctx.fillStyle = 'rgba(245,158,11,.16)'; ctx.fill(); }
      T(cx0, y + rh / 2 + 3, r[0], 15, INK, 'left', 800);
      T(hx[0] + cwd / 2, y + rh / 2 - 6, fT(r[2]) + ' g', 14, INK, 'center', 800); T(hx[0] + cwd / 2, y + rh / 2 + 12, fT(r[3]) + ' mol', 12.5, MUTED, 'center', 800);
      if (done) { T(hx[1] + cwd / 2, y + rh / 2 - 6, fT(r[4]) + ' g', 14, left ? '#b45309' : INK, 'center', 800); T(hx[1] + cwd / 2, y + rh / 2 + 12, fT(r[5]) + ' mol', 12.5, MUTED, 'center', 800); }
      else T(hx[1] + cwd / 2, y + rh / 2 + 3, '—', 15, '#b0b8c6', 'center', 800);
    });
    // 그래프: O₂의 양에 따른 H₂O 생성량
    panel(gr.x, gr.y, gr.w, gr.h, 14);
    T(gr.x + 14, gr.y + 24, '산소를 늘리면 물이 계속 늘어날까? (수소 4 g 고정)', 14, INK, 'left', 800);
    const px0 = gr.x + (PHONE ? 52 : 70), px1 = gr.x + gr.w - 20, py0 = gr.y + gr.h - 36, py1 = gr.y + 64;
    const X = (o) => px0 + (o / 64) * (px1 - px0), Y = (g) => py0 - (g / 40) * (py0 - py1);
    ctx.strokeStyle = '#d5d9e6'; ctx.lineWidth = 1.5;
    [0, 10, 20, 30, 40].forEach((g) => { ctx.beginPath(); ctx.moveTo(px0, Y(g)); ctx.lineTo(px1, Y(g)); ctx.stroke(); T(px0 - 8, Y(g) + 4, String(g), 12.5, MUTED, 'right', 800); });
    [0, 16, 32, 48, 64].forEach((o) => T(X(o), py0 + 18, String(o), 12.5, MUTED, 'center', 800));
    T(px1, py0 + 33, 'O₂의 질량 (g)', 12.5, MUTED, 'right', 800); T(px0 + 6, py1 - 12, '생긴 H₂O (g)', 12.5, MUTED, 'left', 800);
    ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); [0, 32, 64].forEach((o, i) => { const x = X(o), y = Y(wOf(o)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    D.dashedLine(X(32), py0, X(32), py1, { color: '#14a058', width: 2 });
    T(X(32) + 6, Y(12), 'H₂ : O₂ = 2 : 1 (몰)', 12.5, '#0b7a41', 'left', 800);
    if (!PHONE) { T(X(16) + 4, Y(18) - 30, 'O₂가 먼저 소진', 12.5, '#6d28d9', 'center', 800); T(X(48), Y(36) - 20, 'H₂가 먼저 소진 · O₂ 남음', 12.5, '#b45309', 'center', 800); }
    else { T(X(16), Y(18) - 28, 'O₂ 먼저 소진', 12, '#6d28d9', 'center', 800); T(X(49), Y(36) - 20, 'H₂ 먼저 소진', 12, '#b45309', 'center', 800); }
    const mx = X(L.mk.x), my = Y(L.mk.y); D.glow(mx, my, 16, '#f59e0b', 0.5); D.sphere(mx, my, 8, '#f59e0b', { gloss: true });
  }

  /* ---------- 포인터 (순서 카드) ---------- */
  SciSim.pointer(view, {
    down(p) { if (S.mode === 'frame') { ordDown(p); } return false; },
    hover(p) { if (S.mode !== 'frame') return 'default'; for (let k = 0; k < 4; k++) { const r = ordRect(k); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return 'pointer'; } return 'default'; },
  });
  $('#bOrderClear').addEventListener('click', () => { Sound.click(); S.order.picks = []; });

  /* ---------- 장면 초기화 ---------- */
  function snapTweens() {
    tws.forEach((h) => h.cancel()); tws.length = 0;
    Object.keys(stateOf).forEach((k) => { const s = stateOf[k]; s.tk.x = s.stage; s.barp.v = s.ver ? 1 : 0; });
  }
  function resetProbs(list) { clearTimeout(vTimer); snapTweens(); list.forEach((p) => { const s = stOf(p); s.stage = 0; s.vals = []; s.ver = false; s.barp.v = 0; s.tk.x = 0; s.wrong = 0; }); }
  function resetOrder() { S.order.picks = []; }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'left') {
      const L = S.left, r = calcLeft(L.o2), done = L.phase === 'done';
      L1 = '수소 / 산소'; a = fT(H2_G) + ' g / ' + fT(L.o2) + ' g';
      L2 = '생긴 H₂O'; b = done ? fT(r.gW) + ' g (' + fT(r.nW) + ' mol)' : L.phase === 'run' ? '반응 중…' : '반응 전';
      L3 = '남는 물질'; c = !done ? '—' : r.lO > 1e-9 ? 'O₂ ' + fT(r.gO) + ' g' : r.lH > 1e-9 ? 'H₂ ' + fT(r.gH) + ' g' : '없음 (딱 맞아요)';
    } else {
      const p = curProb(), s = stOf(p), g = FOR(p.sp[p.g][0]), ak = FOR(p.sp[p.a][0]);
      L1 = '주어진 물질'; a = g + ' ' + p.gwTxt + ' g';
      L2 = g + '의 몰수'; b = s.stage >= 1 ? fT(p.n1) + ' mol' : '? (② 계산)';
      L3 = ak + ' (' + unitTxt(p) + ')'; c = s.stage >= 3 ? fT(p.ans) + ' ' + unitTxt(p) : s.stage >= 2 ? fT(p.n2) + ' mol → ?' : '?';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const pc = P.h2o, pk = P.caco3, pm = P.ch4, pn = P.nh3, pa = P.al;
  const mgN = r6(6 / MM('Mg')), mgO2 = r6(mgN / 2 * MM('O2')), mgOx = r6(mgN * MM('MgO'));
  const lf = calcLeft(48), lf32 = calcLeft(32), lf64 = calcLeft(64);
  const fNH3 = r6(6 * 2 / 3);
  const plotSVG = () => {
    const W = 300, H = 178, x0 = 44, x1 = 286, y0 = 142, y1 = 14, X = (o) => x0 + (o / 64) * (x1 - x0), Y = (g) => y0 - (g / 40) * (y0 - y1);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="300" role="img" aria-label="산소의 질량에 따른 생긴 물의 질량 그래프" style="max-width:100%">';
    [0, 10, 20, 30, 40].forEach((g) => { s += '<line x1="' + x0 + '" y1="' + Y(g) + '" x2="' + x1 + '" y2="' + Y(g) + '" stroke="#d5d9e6"/><text x="' + (x0 - 6) + '" y="' + (Y(g) + 4) + '" font-size="11" text-anchor="end" fill="#5d6879">' + g + '</text>'; });
    [0, 16, 32, 48, 64].forEach((o) => { s += '<text x="' + X(o) + '" y="' + (y0 + 16) + '" font-size="11" text-anchor="middle" fill="#5d6879">' + o + '</text>'; });
    s += '<polyline points="' + [0, 32, 64].map((o) => X(o) + ',' + Y(wOf(o))).join(' ') + '" fill="none" stroke="#8b5cf6" stroke-width="3.5" stroke-linejoin="round"/>';
    s += '<text x="' + x1 + '" y="' + (H - 4) + '" font-size="11" text-anchor="end" fill="#5d6879">산소 O₂의 질량 (g) · 수소 4 g 고정</text><text x="' + x0 + '" y="9" font-size="11" fill="#5d6879">생긴 H₂O (g)</text></svg>';
    return s;
  };
  const levels = [
    {
      title: '계산 틀: 4단계로 풀기', short: '계산 틀', icon: '🧮', phase: '설명',
      intro: '<p class="si-q">❓ 탐구 질문: 수소 6 g이 연소하면 물이 몇 g 생길까? 질량비를 모르는 반응도 예측할 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 반응식의 계수 맞추기와 계수비 = 입자 수의 비를 배웠어요. 이제 앞 차시에서 익힌 <b>몰과 몰질량</b>으로 이어 붙이면, 질량이 달라도 계수비로 양을 예측할 수 있어요.</div>' +
        '<p>양적 관계 계산은 <b>① 반응식(계수) → ② 몰로 바꾸기 → ③ 계수비로 몰수 구하기 → ④ 질량 · 부피로 바꾸기</b> 네 단계예요. 모든 계산은 가운데에 <b>몰</b>을 거쳐요.</p>',
      features: ['frame'],
      setup() { S.gate = ''; resetProbs([P.h2o]); resetOrder(); setScene('frame'); updateCtl(); },
      recap: '질량 → 몰 → (계수비) → 몰 → 질량 · 부피의 순서로 계산해요. 질량이 다른 물질끼리는 몰을 거쳐야 비교할 수 있어요.',
      summary: '<ul><li>계산 틀: <b>① 반응식 완성 → ② 아는 물질을 몰로(÷ 몰질량) → ③ 계수비로 구하는 물질의 몰수 → ④ 질량 · 부피 · 입자 수로</b></li><li>예) 2H₂ + O₂ → 2H₂O에서 H₂ 6 g: ' + fT(pc.n1) + ' mol → H₂O ' + fT(pc.n2) + ' mol → <b>' + fT(pc.ans) + ' g</b> (필요한 O₂ ' + fT(r6(pc.n1 / 2)) + ' mol = ' + fT(r6(pc.n1 / 2 * MM('O2'))) + ' g, 6 + ' + fT(r6(pc.n1 / 2 * MM('O2'))) + ' = ' + fT(pc.ans) + ' g)</li><li>질량이 같아도 몰질량이 다르면 몰수가 달라요. 반드시 <b>몰로 바꾸어</b> 계수비를 써요.</li></ul>',
      missions: [
        {
          title: '계산 순서 카드 정하기', manual: true,
          goal: '그림 아래의 카드 4장을 <b>먼저 할 일부터</b> 차례로 눌러 순서를 정한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '질량으로는 계수비를 쓸 수 없으니, 먼저 반응식을 맞추고, 질량을 몰로 바꿔요. 그다음 계수비를 쓰고 마지막에 다시 질량으로 바꿔요.',
          setup() { S.gate = 'order'; setScene('frame'); updateCtl(); },
          check() {
            const q = S.order.picks;
            if (q.length < 4) return '카드 4장을 모두 눌러 순서를 정해요. (지금 ' + q.length + '장)';
            if (q[0] !== 0) return '가장 먼저 할 일은 반응식을 쓰고 계수를 맞추는 것이에요.';
            if (q[1] !== 1) return '계수비를 쓰려면 몰수가 필요해요. 질량을 먼저 몰로 바꿔요.';
            if (q[2] !== 2) return '몰수를 구한 다음에는 계수비로 구하는 물질의 몰수를 구해요.';
            if (q[3] !== 3) return '마지막으로 몰을 질량 · 부피 · 입자 수로 바꿔요.';
            return true;
          },
          explain: '순서는 <b>반응식 → 몰로 바꾸기 → 계수비로 몰수 구하기 → 질량으로 바꾸기</b>예요. 계수 맞추기와 계수비는 중3에서, 몰질량으로 몰로 바꾸는 것은 앞 차시에서 배운 것이에요.',
        },
        {
          title: '예제: 수소 6 g이 연소하면?',
          goal: '2H₂ + O₂ → 2H₂O에서 H₂ <b>6 g</b>이 모두 연소할 때 생기는 <b>물의 질량</b>을 ②→③→④ 단계로 구하세요.',
          hint: '② 6 g ÷ 2 g/mol = 3 mol, ③ H₂ : H₂O = 2 : 2이므로 H₂O도 3 mol, ④ 3 mol × 18 g/mol이에요.',
          setup() { S.gate = ''; resetProbs([P.h2o]); setScene('frame'); updateCtl(); },
          check: () => solved(P.h2o),
          hold: 0.5,
          status: () => { const s = stOf(P.h2o); return mark(s.stage >= 1) + ' ② 몰로 바꾸기 &nbsp; ' + mark(s.stage >= 2) + ' ③ 몰수비 &nbsp; ' + mark(s.stage >= 3) + ' ④ 질량'; },
          explain: 'H₂ 6 g ÷ 2 g/mol = <b>' + fT(pc.n1) + ' mol</b>, 계수비 2 : 2이므로 H₂O도 <b>' + fT(pc.n2) + ' mol</b>, 질량은 ' + fT(pc.n2) + ' mol × 18 g/mol = <b>' + fT(pc.ans) + ' g</b>이에요. 필요한 O₂는 ' + fT(r6(pc.n1 / 2)) + ' mol = ' + fT(r6(pc.n1 / 2 * MM('O2'))) + ' g이고, 6 g + ' + fT(r6(pc.n1 / 2 * MM('O2'))) + ' g = ' + fT(pc.ans) + ' g으로 질량도 보존돼요.',
        },
        {
          type: 'quiz', title: '6 g과 54 g을 바로 비교할 수 없는 까닭',
          goal: '계수비가 2 : 2 = 1 : 1이라서 "H₂ 6 g에서 H₂O 6 g이 생기겠지"라고 하면 안 되는 까닭은?',
          setup() { S.gate = ''; setScene('frame'); updateCtl(); },
          choices: ['계수의 비가 곧 질량의 비이기 때문이에요', '물질마다 몰질량이 달라서, 같은 몰수라도 질량이 달라지기 때문이에요', '수소는 기체이고 물은 액체이기 때문이에요', '반응하면 질량이 늘어나기 때문이에요'],
          answer: 1,
          feedback: ['계수비는 몰수의 비예요. 질량은 몰수에 몰질량을 곱해야 해요.', '', '상태가 달라도 몰수를 거치면 계산할 수 있어요. 질량이 다른 까닭은 몰질량이에요.', '반응 전후 질량의 합은 같아요(질량 보존).'],
          explain: 'H₂ ' + fT(pc.n1) + ' mol(6 g)과 H₂O ' + fT(pc.n2) + ' mol(' + fT(pc.ans) + ' g)은 몰수는 같지만 몰질량이 2 g/mol, 18 g/mol로 달라서 질량이 달라요. 그래서 질량을 <b>몰로 바꾼 뒤</b> 계수비를 써야 해요.',
        },
      ],
    },
    {
      title: '질량 계산: 질량 → 몰 → 몰 → 질량', short: '질량 계산', icon: '⚖️', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 4단계 계산 틀을 익혔어요. 이번에는 직접 <b>CaCO₃ 분해</b>와 <b>메테인 연소</b> 문제를 풀고, 구한 값으로 반응 전후의 질량이 같은지 <b>검산</b>해 봐요.</div>' +
        '<p>CaCO₃(s) → CaO(s) + CO₂(g)에서 CaCO₃ 200 g이 분해하면 CaO는 몇 g일까요? 메테인 8.0 g을 태우려면 산소는 몇 g이 필요할까요?</p>',
      features: ['mass'],
      setup() { S.gate = ''; resetProbs([P.caco3, P.ch4]); S.sel.mass = 0; setScene('mass'); updateCtl(); },
      recap: '질량 → 몰 → 계수비 → 몰 → 질량의 4단계로 구하고, 반응물의 질량 합과 생성물의 질량 합이 같은지 검산해요.',
      summary: '<ul><li>CaCO₃(s) → CaO(s) + CO₂(g): CaCO₃ 200 g = ' + fT(pk.n1) + ' mol → CaO ' + fT(pk.n2) + ' mol = <b>' + fT(pk.ans) + ' g</b>, CO₂ ' + fT(pk.all[2].n) + ' mol = ' + fT(pk.all[2].m) + ' g (' + fT(pk.ans) + ' + ' + fT(pk.all[2].m) + ' = 200 g)</li><li>CH₄ + 2O₂ → CO₂ + 2H₂O: CH₄ 8.0 g = ' + fT(pm.n1) + ' mol → O₂ ' + fT(pm.n2) + ' mol = <b>' + fT(pm.ans) + ' g</b>, CO₂ ' + fT(pm.all[2].m) + ' g, H₂O ' + fT(pm.all[3].m) + ' g (8 + ' + fT(pm.ans) + ' = ' + fT(pm.all[2].m) + ' + ' + fT(pm.all[3].m) + ' = ' + fT(pm.all[2].m + pm.all[3].m) + ' g)</li><li>Mg 6.0 g이 타면 MgO ' + fT(mgOx) + ' g: 늘어난 ' + fT(r6(mgOx - 6)) + ' g은 결합한 산소(O₂ ' + fT(mgN / 2) + ' mol)예요.</li></ul>',
      missions: [
        {
          title: 'CaCO₃ 200 g을 분해하면 CaO는?',
          goal: 'CaCO₃ <b>200 g</b>이 모두 분해될 때 생기는 <b>CaO의 질량</b>을 구하세요.',
          hint: 'CaCO₃의 몰질량은 40 + 12 + 3×16 = 100 g/mol이에요. 계수비 CaCO₃ : CaO = 1 : 1, CaO의 몰질량은 56 g/mol이에요.',
          setup() { S.gate = ''; S.sel.mass = 0; setScene('mass'); updateCtl(); },
          check: () => solved(P.caco3),
          hold: 0.5,
          status: () => { const s = stOf(P.caco3); return mark(s.stage >= 1) + ' ② 몰 &nbsp; ' + mark(s.stage >= 2) + ' ③ 몰수비 &nbsp; ' + mark(s.stage >= 3) + ' ④ 질량'; },
          explain: '200 g ÷ 100 g/mol = <b>' + fT(pk.n1) + ' mol</b>, 계수비 1 : 1이므로 CaO도 <b>' + fT(pk.n2) + ' mol</b> → ' + fT(pk.n2) + ' × 56 = <b>' + fT(pk.ans) + ' g</b>이에요. CO₂는 ' + fT(pk.all[2].m) + ' g으로, ' + fT(pk.ans) + ' + ' + fT(pk.all[2].m) + ' = 200 g이에요.',
        },
        {
          title: '메테인 8.0 g을 태우려면 산소는?',
          goal: 'CH₄ <b>8.0 g</b>이 완전히 연소할 때 필요한 <b>O₂의 질량</b>을 구한 뒤, <b>⚖️ 질량 보존 검산</b>까지 해 보세요.',
          hint: 'CH₄ 8.0 g ÷ 16 g/mol = 0.5 mol, 계수비 CH₄ : O₂ = 1 : 2이므로 O₂는 1.0 mol이에요. 질량은 몰질량 32 g/mol을 곱해요.',
          setup() { S.gate = ''; resetProbs([P.ch4]); S.sel.mass = 1; setScene('mass'); updateCtl(); },
          check: () => solved(P.ch4) && stOf(P.ch4).ver,
          hold: 0.8,
          status: () => { const s = stOf(P.ch4); return mark(s.stage >= 1) + ' ② 몰 &nbsp; ' + mark(s.stage >= 2) + ' ③ 몰수비 &nbsp; ' + mark(s.stage >= 3) + ' ④ 질량 &nbsp; ' + mark(s.ver) + ' 검산'; },
          explain: 'CH₄ 8.0 g ÷ 16 g/mol = <b>' + fT(pm.n1) + ' mol</b> → 계수비 1 : 2에서 O₂ <b>' + fT(pm.n2) + ' mol</b> → <b>' + fT(pm.ans) + ' g</b>이에요. 생성물은 CO₂ ' + fT(pm.all[2].n) + ' mol(' + fT(pm.all[2].m) + ' g), H₂O ' + fT(pm.all[3].n) + ' mol(' + fT(pm.all[3].m) + ' g)이고, 8 + ' + fT(pm.ans) + ' = ' + fT(pm.all[2].m) + ' + ' + fT(pm.all[3].m) + ' = ' + fT(pm.all[2].m + pm.all[3].m) + ' g으로 질량이 보존돼요.',
        },
        {
          type: 'quiz', title: '마그네슘이 타면 질량이 늘어난 까닭',
          goal: '마그네슘 6.0 g이 완전히 타면 산화 마그네슘(MgO) <b>' + fT(mgOx) + ' g</b>이 돼요. 늘어난 <b>' + fT(r6(mgOx - 6)) + ' g</b>은 어디서 왔을까요?',
          setup() { S.gate = ''; setScene('mass'); updateCtl(); },
          choices: ['마그네슘이 스스로 불어났어요', '공기 중의 산소가 결합했어요', '열이 질량으로 바뀌었어요', '질량 보존 법칙이 깨졌어요'],
          answer: 1,
          feedback: ['마그네슘은 반응물이에요. 새로 생기지 않아요.', '', '열은 질량으로 바뀌지 않아요. 반응식의 계수비를 보세요.', '질량 보존은 늘 성립해요. 반응에 참여한 산소의 질량까지 합해야 해요.'],
          explain: '2Mg + O₂ → 2MgO에서 Mg 6.0 g = <b>' + fT(mgN) + ' mol</b> → O₂ ' + fT(r6(mgN / 2)) + ' mol = <b>' + fT(mgO2) + ' g</b>, MgO ' + fT(mgN) + ' mol = ' + fT(mgOx) + ' g이에요. Mg와 O 질량비는 3 : 2이고, 6.0 g + ' + fT(mgO2) + ' g = ' + fT(mgOx) + ' g이므로 늘어난 ' + fT(mgO2) + ' g은 <b>결합한 산소</b>의 질량이에요.',
        },
      ],
    },
    {
      title: '부피로 확장: 기체 22.4 L/mol', short: '부피로 확장', icon: '💨', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 질량을 구하는 4단계 계산을 했어요. 구하는 물질이 <b>기체</b>이면 마지막 단계에서 ‘× 몰질량’ 대신 <b>‘× 22.4 L/mol’</b>(0 °C, 1기압)로 부피를 구해요.</div>' +
        '<p>암모니아 합성과 알루미늄과 염산의 반응에서 생성되거나 필요한 <b>기체의 부피</b>를 구하고, 몰수에 6.02×10²³을 곱해 <b>입자 수</b>로도 바꿔 봐요.</p>',
      features: ['vol'],
      setup() { S.gate = ''; resetProbs([P.nh3, P.al]); S.sel.vol = 0; setScene('vol'); updateCtl(); },
      recap: '기체는 몰수에 22.4 L/mol(0 °C, 1기압)를 곱해 부피를 구하고, 6.02×10²³을 곱해 입자 수를 구해요. 기체의 부피비는 계수비 = 몰수비예요.',
      summary: '<ul><li>N₂ + 3H₂ → 2NH₃: NH₃ 3.4 g = ' + fT(pn.n1) + ' mol → H₂ ' + fT(pn.n2) + ' mol → 0 °C, 1기압에서 <b>' + fT(pn.ans) + ' L</b> (분자 수 ' + sci(pn.n2 * NA) + '개)</li><li>2Al + 6HCl → 2AlCl₃ + 3H₂: Al 5.4 g = ' + fT(pa.n1) + ' mol → H₂ ' + fT(pa.n2) + ' mol = <b>' + fT(pa.ans) + ' L</b>, 필요한 HCl ' + fT(r6(pa.n1 * 3)) + ' mol = ' + fT(r6(pa.n1 * 3 * MM('HCl'))) + ' g</li><li>기체 부피 V = n × 22.4 L/mol, 입자 수 N = n × 6.02×10²³. 같은 온도 · 압력에서 기체의 부피비 = 계수비 = 몰수비예요.</li></ul>',
      missions: [
        {
          title: '암모니아 3.4 g에서 수소의 부피',
          goal: 'N₂ + 3H₂ → 2NH₃에서 NH₃ <b>3.4 g</b>을 만들 때 필요한 <b>H₂의 부피</b>(0 °C, 1기압)를 구하세요.',
          hint: 'NH₃의 몰질량은 17 g/mol이에요. 계수비 NH₃ : H₂ = 2 : 3이므로 H₂의 몰수는 NH₃의 1.5배이고, 부피는 몰수 × 22.4예요.',
          setup() { S.gate = ''; S.sel.vol = 0; setScene('vol'); updateCtl(); },
          check: () => solved(P.nh3),
          hold: 0.5,
          status: () => { const s = stOf(P.nh3); return mark(s.stage >= 1) + ' ② 몰 &nbsp; ' + mark(s.stage >= 2) + ' ③ 몰수비 &nbsp; ' + mark(s.stage >= 3) + ' ④ 부피'; },
          explain: '3.4 g ÷ 17 g/mol = <b>' + fT(pn.n1) + ' mol</b> → H₂ ' + fT(pn.n1) + ' × 3/2 = <b>' + fT(pn.n2) + ' mol</b> → ' + fT(pn.n2) + ' × 22.4 = <b>' + fT(pn.ans) + ' L</b>이에요. 분자 수는 ' + fT(pn.n2) + ' × 6.02×10²³ = ' + sci(pn.n2 * NA) + '개예요.',
        },
        {
          title: '알루미늄 5.4 g과 염산',
          goal: '2Al + 6HCl → 2AlCl₃ + 3H₂에서 Al <b>5.4 g</b>이 모두 반응할 때 생기는 <b>H₂의 부피</b>(0 °C, 1기압)를 구하세요.',
          hint: 'Al의 몰질량은 27 g/mol이에요. 계수비 Al : H₂ = 2 : 3이므로 H₂의 몰수는 Al의 1.5배예요.',
          setup() { S.gate = ''; resetProbs([P.al]); S.sel.vol = 1; setScene('vol'); updateCtl(); },
          check: () => solved(P.al),
          hold: 0.5,
          status: () => { const s = stOf(P.al); return mark(s.stage >= 1) + ' ② 몰 &nbsp; ' + mark(s.stage >= 2) + ' ③ 몰수비 &nbsp; ' + mark(s.stage >= 3) + ' ④ 부피'; },
          explain: '5.4 g ÷ 27 g/mol = <b>' + fT(pa.n1) + ' mol</b> → H₂ ' + fT(pa.n1) + ' × 3/2 = <b>' + fT(pa.n2) + ' mol</b> → <b>' + fT(pa.ans) + ' L</b>예요. 필요한 HCl은 ' + fT(r6(pa.n1 * 3)) + ' mol(' + fT(r6(pa.n1 * 3 * MM('HCl'))) + ' g)이에요.',
        },
        {
          type: 'quiz', title: '기체의 부피비 = 계수비',
          goal: '같은 온도 · 압력에서 N₂ + 3H₂ → 2NH₃ 반응으로 H₂ <b>6 L</b>가 모두 반응하면 생기는 NH₃는 몇 L일까요?',
          setup() { S.gate = ''; setScene('vol'); updateCtl(); },
          choices: ['2 L', fT(fNH3) + ' L', '6 L', '9 L'],
          answer: 1,
          feedback: ['H₂ : NH₃ = 3 : 2이에요. H₂가 6 L이면 그 2/3예요.', '', '부피가 같다고 보면 안 돼요. 계수비 3 : 2를 써야 해요.', 'NH₃의 계수가 더 작아서 H₂보다 부피가 작아요.'],
          explain: '같은 온도 · 압력에서 기체의 부피비 = 몰수비 = 계수비예요. H₂ : NH₃ = 3 : 2이므로 6 L × 2/3 = <b>' + fT(fNH3) + ' L</b>예요. 중3에서 배운 기체 반응 법칙을 <b>몰</b>로 설명한 것이에요.',
        },
      ],
    },
    {
      title: '남는 반응물: 먼저 소진되는 쪽이 정해요', short: '남는 반응물', icon: '🧪', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 반응물이 정확히 반응하는 양을 계산했어요. 그런데 반응물을 <b>비율에 맞지 않게</b> 넣으면 어떻게 될까요?</div>' +
        '<p>수소 H₂ 4 g(2 mol)에 산소 O₂를 넣어 반응시켜요. 입자 모형에서 한쪽이 <b>먼저 모두 소진</b>되고 다른 쪽은 남아요. 남는 양은 <b>몰 → 질량</b>으로 계산해요. (‘한계 반응물’이라고 부르기도 해요.)</p>',
      features: ['left'],
      setup() { S.gate = ''; setScene('left'); setO2(48, true); updateCtl(); },
      recap: '반응물이 많다고 생성물이 계속 늘지 않아요. 먼저 모두 소진되는 반응물이 생성물의 양을 정하고, 다른 반응물은 남아요.',
      summary: '<ul><li>H₂ 4 g(2 mol) + O₂ 48 g(1.5 mol): 2 mol의 H₂와 반응하는 O₂는 1 mol → <b>H₂가 먼저 소진</b>, O₂ ' + fT(lf.lO) + ' mol = <b>' + fT(lf.gO) + ' g 남고</b> H₂O ' + fT(lf.nW) + ' mol = ' + fT(lf.gW) + ' g 생성 (4 + 48 = ' + fT(lf.gW) + ' + ' + fT(lf.gO) + ' = 52 g)</li><li>O₂가 32 g일 때 둘 다 딱 맞게 반응해 물 ' + fT(lf32.gW) + ' g이 최대예요(H₂ : O₂ = 2 : 1 몰비).</li><li>O₂를 더 넣어도(64 g) 물은 ' + fT(lf64.gW) + ' g 그대로예요. 먼저 소진되는 쪽이 생성물의 양을 정해요.</li></ul>',
      missions: [
        {
          title: '남는 물질과 그 양 구하기', manual: true,
          goal: '산소를 <b>48 g</b>으로 맞추고 <b>▶ 반응시키기</b>를 누른 뒤, 반응이 끝나고 <b>남는 물질과 그 질량</b>을 쓰세요. 끝나면 <b>✔ 확인하기</b>를 누르세요.',
          hint: 'H₂ 4 g = 2 mol, O₂ 48 g = 1.5 mol. 2H₂ + O₂이므로 H₂ 2 mol에는 O₂ 1 mol이 필요해요. 남는 O₂의 몰수에 32 g/mol을 곱해요.',
          setup() { S.gate = 'ans'; setScene('left'); if (S.left.o2 !== 48) setO2(48, true); $('#lfSel').value = ''; $('#lfIn').value = ''; updateCtl(); },
          check() {
            if (S.left.o2 !== 48) return '산소를 48 g에 맞춰 주세요. (지금은 ' + S.left.o2 + ' g)';
            if (S.left.phase !== 'done') return '▶ 반응시키기를 눌러 반응이 끝나게 해 주세요.';
            const sel = $('#lfSel').value;
            if (!sel) return '남는 물질을 골라 주세요.';
            if (sel !== 'O2') return sel === 'H2' ? '수소 입자는 모두 반응했어요. 용기에 남은 입자를 다시 살펴보세요.' : '입자 모형에 반응하지 못하고 남은 입자가 있어요.';
            const v = parseNum($('#lfIn').value);
            if (isNaN(v)) return '남는 산소의 질량(g)을 써 주세요.';
            if (Math.abs(v - lf.gO) > 0.5) return '남는 O₂의 몰수 ' + fT(lf.nO) + ' − ' + fT(r6(lf.nW / 2)) + '(반응한 몰수)를 구하고 32 g/mol을 곱해 보세요.';
            return true;
          },
          explain: 'H₂ ' + fT(lf.nH) + ' mol과 반응하는 O₂는 ' + fT(r6(lf.nW / 2)) + ' mol이에요. 산소는 ' + fT(lf.nO) + ' mol이 있었으므로 <b>O₂ ' + fT(lf.lO) + ' mol = ' + fT(lf.gO) + ' g</b>이 남고, H₂는 모두 소진돼요. 생성된 물은 ' + fT(lf.nW) + ' mol = ' + fT(lf.gW) + ' g이에요.',
        },
        {
          type: 'quiz', title: '반응물이 많으면 생성물도 계속 늘까?',
          goal: '수소 4 g에 넣는 산소를 늘려 갈 때 생기는 물의 질량 그래프예요. 옳은 설명은?',
          figure: plotSVG(),
          setup() { S.gate = ''; setScene('left'); updateCtl(); },
          choices: ['산소를 계속 늘리면 물도 계속 늘어나요', '산소가 ' + fT(MM('O2')) + ' g보다 많아져도 물은 ' + fT(lf32.gW) + ' g에서 더 늘지 않아요. 먼저 소진되는 수소가 양을 정해요', '산소가 64 g이면 물은 72 g이 돼요', '남는 반응물이 많을수록 생성물도 많아져요'],
          answer: 1,
          feedback: ['그래프를 보세요. O₂ 32 g 이후에는 수평이에요.', '', '수소 4 g(2 mol)에서는 물이 최대 2 mol(' + fT(lf32.gW) + ' g)만 생겨요.', '남는 것은 반응하지 못한 양이에요. 생성물의 양은 먼저 소진되는 반응물이 정해요.'],
          explain: '수소 2 mol은 산소 1 mol(' + fT(MM('O2')) + ' g)과 딱 맞게 반응해 물 2 mol(' + fT(lf32.gW) + ' g)을 만들어요. 산소를 더 넣어도 수소가 먼저 소진되어 물은 늘지 않고 산소만 남아요. <b>먼저 소진되는 반응물이 생성물의 양을 정해요.</b>',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-stoich-calc', mount: '#game', badge: '양적 관계 박사', homeHref: '../../index.html#hc',
    featureLabels: { frame: '🧮 4단계 계산 컨베이어 · 순서 카드', mass: '⚖️ 질량 계산 · 질량 보존 막대', vol: '💨 기체 주사기 (22.4 L/mol)', left: '🧪 반응 용기 · 산소 슬라이더' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setO2(48);
  setScene(S.mode);
  let lastV = -1, lastMode = '', lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    ctx.fillStyle = BGC; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'left') { stepLeft(dt); drawLeft(); }
    else {
      const p = curProb();
      if (S.mode === 'vol') { const V = tankV(), key = p.id + ':' + V; if (key !== lastV) { lastV = key; syncTank(false); } stepTank(dt); }
      drawEqPanel(p); drawCards(p);
      if (S.mode === 'frame') drawOrder(); else if (S.mode === 'mass') drawBars(p); else drawSyringe(p);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(244,241,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, P, VW, VH, LAY, LL, SY, stateOf, calcLeft, get game() { return game; },
    setScene, checkCalc, curProb, resetLeft, setO2, mkProb, MM,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; if (S.mode === 'left') stepLeft(0.02); else stepTank(0.02); parts.update(0.02); } },
  };
})();
