/* =========================================================
   화학 Ⅱ. 물질의 구조와 성질 - 결합과 전기 전도성 [12화학02-01]
   ① 관찰: 고체 시험 (전지·전구·전류계 회로, 고체 시료 6가지)
   ② 실험: 액체·용액 (시료 8가지, 가열 장치는 모의 조작 + 안전 수칙, 상태별 O/X 표)
   ③ 모형: 전하 운반자 (전기장 속 입자 모형: 자유 전자 / 이온 / 없음, HCl의 이온화)
   ④ 분석: 결합 추론 (비밀 시료 A·B·C, 흐름도)
   ※ 결합의 성질은 '전기 전도성'에 한정해요. 녹는점·경도·용해도는 결합 판정에 쓰지 않고,
      흑연·다이아몬드 같은 공유 결정은 범위 밖이에요.
   ※ 전류계의 mA 값은 모의 실험의 예시 값이에요(전구가 직렬로 연결된 회로).
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, modal } = SciSim;
  const { tween, approach, Particles } = SciSim;
  const CO = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 800 : 560;
  const FS = PHONE ? 1.12 : 1;
  const fs = (n) => Math.round(n * FS);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f3f0fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const fx = new Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size: fs(size), color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(fs(size), weight || 700);
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
  function panel(x, y, w, h, r, fill, stroke) {
    D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 });
    if (stroke) { D.roundRect(x, y, w, h, r || 14); ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  const INK = '#1b2333', MUTED = '#5d6879', GOOD = '#14a058', BAD = '#d6453d', ELEC = '#f5b400';
  const CAT = '#e8604c', ANI = '#3b6df0', PUR = '#7c3aed';

  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const roCache = {};
  function setRO(i, label, value) {
    const k = label + '|' + value;
    if (roCache[i] === k) return;
    roCache[i] = k; $('#roL' + i).textContent = label; $('#roV' + i).innerHTML = value;
  }

  /* ---------- 시료 자료 (O/X는 I > 0 으로 판정해요) ---------- */
  const IMAX = 300;                                   // 전류계 눈금의 최댓값 (mA)
  const SMP = [
    { id: 'cu', grp: 'solid', form: 'solid', mat: 'metal', name: '구리(Cu)', short: 'Cu', I: 300, col: '#d98a52' },
    { id: 'al', grp: 'solid', form: 'solid', mat: 'metal', name: '알루미늄 호일(Al)', short: 'Al 호일', I: 300, col: '#c9d2dd' },
    { id: 'nacl_s', grp: 'solid', form: 'solid', mat: 'ionic', name: '염화 나트륨 결정(NaCl)', short: 'NaCl 결정', I: 0, col: '#f4f7fb' },
    { id: 'cacl2_s', grp: 'solid', form: 'solid', mat: 'ionic', name: '염화 칼슘 결정(CaCl₂)', short: 'CaCl₂ 결정', I: 0, col: '#eef2f7' },
    { id: 'sugar_s', grp: 'solid', form: 'solid', mat: 'mol', name: '설탕(C₁₂H₂₂O₁₁)', short: '설탕', I: 0, col: '#fbf6ee' },
    { id: 'wax', grp: 'solid', form: 'solid', mat: 'mol', name: '파라핀', short: '파라핀', I: 0, col: '#f2e6c4' },
    { id: 'nacl_l', grp: 'liq', form: 'melt', mat: 'ionic', name: '용융 염화 나트륨(NaCl)', short: '용융 NaCl', I: 250, col: '#ff9a3c' },
    { id: 'hg', grp: 'liq', form: 'liquid', mat: 'metal', name: '액체 수은(Hg)', short: '수은', I: 300, col: '#c3cbd6' },
    { id: 'eth', grp: 'liq', form: 'liquid', mat: 'mol', name: '에탄올(C₂H₅OH)', short: '에탄올', I: 0, col: '#dff1ff' },
    { id: 'h2o', grp: 'liq', form: 'liquid', mat: 'mol', name: '증류수(H₂O)', short: '증류수', I: 0, col: '#bfe3ff' },
    { id: 'nacl_aq', grp: 'liq', form: 'aq', mat: 'ionic', name: '염화 나트륨 수용액', short: 'NaCl 수용액', I: 180, col: '#b7dcff' },
    { id: 'sugar_aq', grp: 'liq', form: 'aq', mat: 'mol', name: '설탕 수용액', short: '설탕 수용액', I: 0, col: '#fdeab5' },
    { id: 'cacl2_aq', grp: 'liq', form: 'aq', mat: 'ionic', name: '염화 칼슘 수용액', short: 'CaCl₂ 수용액', I: 200, col: '#c4e0ff' },
    { id: 'hcl_aq', grp: 'liq', form: 'aq', mat: 'mol', name: '염산(HCl 수용액)', short: 'HCl 수용액', I: 260, col: '#e3f2b8' },
  ];
  const BY = {}; SMP.forEach((s) => { BY[s.id] = s; });
  const SOL = SMP.filter((s) => s.grp === 'solid'), LIQ = SMP.filter((s) => s.grp === 'liq');
  const STATE = { solid: '고체', melt: '액체(용융)', liquid: '액체', aq: '수용액' };
  const MATNAME = { metal: '금속 결합 물질', ionic: '이온 결합 물질', mol: '분자 물질' };
  const conducts = (I) => I > 0;
  // 비밀 시료의 시험 결과 (위의 시료 자료에서 가져와요)
  const TRUTH = {
    metal: { solid: BY.cu.I, melt: BY.hg.I, aq: null },
    ionic: { solid: BY.nacl_s.I, melt: BY.nacl_l.I, aq: BY.nacl_aq.I },
    mol: { solid: 0, melt: 0, aq: 0 },
  };
  function bright(I) {
    const g = I / IMAX;
    return g >= 0.9 ? '매우 밝음' : g >= 0.5 ? '밝음' : g >= 0.1 ? '희미함' : '꺼짐';
  }

  /* ---------- 상태 ---------- */
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  const LET = ['A', 'B', 'C'];
  const S = {
    scene: 'lab', t: 0, gate: '', fade: 0, amp: 0, glow: 0, phase: 0, verdict: null,
    st: { item: null, want: null, p: 0, heat: 0, settle: 0, rec: false },
    rec: {}, order: [], flash: {}, safe: false, tbl: {},
    obs: {}, field: false, fieldA: 0,
    sec: { cur: 'A', map: {}, res: { A: {}, B: {}, C: {} }, cls: {}, tok: { x: 0, y: 0, a: 0 } },
    flow: {}, flowOK: {},
  };
  function shuffleSecret() {
    const m = shuffle(['metal', 'ionic', 'mol']);
    LET.forEach((L, i) => { S.sec.map[L] = m[i]; });
  }
  shuffleSecret();
  function resetSecret() {
    shuffleSecret();
    S.sec.res = { A: {}, B: {}, C: {} }; S.sec.cls = {}; S.sec.cur = 'A'; S.sec.tok = { x: 0, y: 0, a: 0 }; S.flow = {}; S.flowOK = {};
  }
  let game = null;
  const gameLevel = () => (game ? game.level : 0);
  const isFree = () => !!(game && game.free);

  /* =========================================================
     회로 · 시료대 (장면 lab / secret 공통)
     ========================================================= */
  const X0 = PHONE ? 40 : 70, X1 = VW - X0, YT = 72, YB = 228;
  const CX = VW / 2, TOFF = PHONE ? 60 : 66, TL = CX - TOFF, TR = CX + TOFF, TY = YB;
  const BATY = (YT + YB) / 2 + 4, BHALF = 40;
  const BX = X0 + (X1 - X0) * 0.30, AX = X0 + (X1 - X0) * 0.74, AR = PHONE ? 30 : 33;
  const RIM = TY + 14, BWD = PHONE ? 168 : 180, BHT = 96, SURF = RIM + 36;
  const TBY = PHONE ? 354 : 352;                      // 아래 영역(표) 시작
  // 전자 흐름 경로 (전지 (−) → 시료 왼쪽 단자 / 시료 오른쪽 단자 → 전지 (+))
  const P1 = [[X0, BATY + BHALF], [X0, YB], [TL, YB]];
  const P2 = [[TR, YB], [X1, YB], [X1, YT], [X0, YT], [X0, BATY - BHALF]];
  function pathInfo(P) {
    const cum = [0];
    for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    return { P, cum, len: cum[cum.length - 1] };
  }
  const PI1 = pathInfo(P1), PI2 = pathInfo(P2);
  function atPath(pi, s) {
    s = clamp(s, 0, pi.len);
    for (let i = 1; i < pi.P.length; i++) {
      if (s <= pi.cum[i] + 1e-6) {
        const k = (s - pi.cum[i - 1]) / Math.max(1e-6, pi.cum[i] - pi.cum[i - 1]);
        return [pi.P[i - 1][0] + (pi.P[i][0] - pi.P[i - 1][0]) * k, pi.P[i - 1][1] + (pi.P[i][1] - pi.P[i - 1][1]) * k];
      }
    }
    return pi.P[pi.P.length - 1];
  }

  const same = (a, b) => (a ? a.key : null) === (b ? b.key : null);
  function itemOf(id) {
    const s = BY[id];
    return { key: s.id, id: s.id, form: s.form, mat: s.mat, name: s.name, short: s.short, I: s.I, col: s.col };
  }
  function secretItem(L, mode) {
    const mat = S.sec.map[L];
    return { key: 's:' + L + ':' + mode, id: 'sec', secret: true, letter: L, mode, form: mode, mat, name: '시료 ' + L + ' (' + STATE[mode] + ')', short: '시료 ' + L, I: TRUTH[mat][mode], col: '#b9c2d0' };
  }
  function resetTest() { S.st.heat = 0; S.st.settle = 0; S.st.rec = false; S.verdict = null; }
  function setWant(item) { S.st.want = item; }
  const closed = () => !!(S.st.item && same(S.st.item, S.st.want) && S.st.p > 0.97);
  const ready = () => closed() && (S.st.item.form !== 'melt' || S.st.heat >= 1);
  const target = () => (ready() ? S.st.item.I : 0);

  function pick(id) {
    const s = BY[id];
    if (!s) return;
    if (id === 'nacl_l' && !S.safe) {
      modal({
        icon: '🥽', title: '안전 수칙을 먼저 확인해요',
        html: '<div style="text-align:left;font-size:15px;line-height:1.55">' +
          '<b>용융 NaCl</b>은 약 800 °C 이상으로 가열해야 해서 실제 실험실에서는 교사가 시범을 보이거나 영상으로 관찰해요. 여기서는 <b>모의 조작</b>으로 시험해요.<br>' +
          '• 가열 장치 주변에서는 <b>보안경 · 실험복 · 내열 장갑</b>을 착용해요.<br>' +
          '• 가열한 도가니와 시료는 식을 때까지 만지지 않아요.<br>' +
          '• <b>수은</b>은 독성이 있어서 직접 다루지 않고 밀폐 용기 영상으로만 관찰해요.<br>' +
          '• 실험이 끝난 용액과 시료는 <b>실험실 폐수 · 폐기물 처리 기준</b>에 따라 분리해서 버려요.</div>',
        buttons: [{ label: '취소' }, { label: '확인했어요', primary: true, onClick: () => { S.safe = true; pick(id); } }],
      });
      return;
    }
    if (id === 'hg' && !S.safeHg) { S.safeHg = true; showHint('☠️ 수은은 독성이 있어 영상(모의)으로만 관찰해요. 실험실 안전 수칙을 지켜요.', 5200); }
    setWant(itemOf(id));
    Sound.click();
    updateUI();
  }
  function removeSample() { setWant(null); updateUI(); }

  function recordNow() {
    const st = S.st, it = st.item;
    st.rec = true;
    if (it.secret) { S.sec.res[it.letter][it.mode] = it.I; }
    else {
      if (!S.rec[it.key]) { S.rec[it.key] = { I: it.I }; S.order.push(it.key); }
      S.flash[it.key] = S.t;
    }
    const ok = conducts(it.I);
    S.verdict = { ok, t0: S.t };
    Sound.tick();
    if (ok) fx.burst(BX, YT - 30, { count: 12, colors: ['#ffd34d', '#fff6c2', '#ffb400'], speed: 130, size: 3.2, gravity: 80 });
    updateUI();
  }

  function stationStep(dt) {
    const st = S.st;
    if (!same(st.item, st.want)) {
      if (st.item) { st.p = approach(st.p, 0, dt, 8); if (st.p < 0.04) { st.item = st.want; st.p = 0; resetTest(); } }
      else { st.item = st.want; st.p = 0; resetTest(); }
    } else if (st.item) st.p = approach(st.p, 1, dt, 3.6);
    if (closed() && st.item.form === 'melt' && st.heat < 1) st.heat = RM ? 1 : Math.min(1, st.heat + dt / 2.2);
    const tg = target();
    S.amp = approach(S.amp, tg, dt, 6);
    if (Math.abs(S.amp - tg) < 0.4) S.amp = tg;
    S.glow = approach(S.glow, S.amp / IMAX, dt, 7);
    if (ready() && !st.rec && Math.abs(S.amp - tg) < 1) {
      st.settle += dt;
      if (st.settle > 0.9) recordNow();
    } else if (!ready()) st.settle = 0;
    // 전자 흐름 점
    const sp = S.amp > 2 ? 40 + 130 * (S.amp / IMAX) : 0;
    S.phase += sp * dt;
  }

  /* ---------- 그리기: 회로 ---------- */
  function drawWires() {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = (P) => { ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };
    [P1, P2].forEach((P) => {
      path(P); ctx.strokeStyle = '#3d4657'; ctx.lineWidth = 6; ctx.stroke();
      path(P); ctx.strokeStyle = '#7d8aa0'; ctx.lineWidth = 2.5; ctx.stroke();
    });
    ctx.restore();
  }
  function drawFlowDots() {
    if (S.amp < 2) return;
    const total = PI1.len + PI2.len, gap = 26;
    const a = clamp(S.amp / 60, 0, 1);
    const n = Math.floor(total / gap);
    for (let k = 0; k < n; k++) {
      let s = (S.phase + k * gap) % total;
      const pt = s < PI1.len ? atPath(PI1, s) : atPath(PI2, s - PI1.len);
      ctx.globalAlpha = a;
      D.sphere(pt[0], pt[1], 4.2, ELEC, { gloss: false, outline: 'rgba(120,70,0,.5)', outlineWidth: 1 });
    }
    ctx.globalAlpha = 1;
    T(X1 - 12, (YT + YB) / 2 + 4, 'e⁻ 흐름 ↑', 12.5, '#8a5a00', 'right', 800);
  }
  function drawBattery() {
    const x = X0, y = BATY;
    D.shadow(() => { D.roundRect(x - 17, y - BHALF, 34, BHALF * 2, 8); ctx.fillStyle = '#2b3a52'; ctx.fill(); }, { blur: 8, y: 3 });
    const g = ctx.createLinearGradient(x - 17, 0, x + 17, 0);
    g.addColorStop(0, '#46618a'); g.addColorStop(0.5, '#5c7db0'); g.addColorStop(1, '#2f4468');
    D.roundRect(x - 15, y - BHALF + 12, 30, BHALF * 2 - 12, 7); ctx.fillStyle = g; ctx.fill();
    D.roundRect(x - 8, y - BHALF - 4, 16, 10, 3); ctx.fillStyle = '#c9d2df'; ctx.fill();
    T(x, y - BHALF + 30, '+', 22, '#fff', 'center', 900, { baseline: 'middle' });
    T(x, y + BHALF - 14, '−', 24, '#fff', 'center', 900, { baseline: 'middle' });
    T(x + 26, y - 4, '전지', 13, MUTED, 'left', 800);
    T(x + 26, y + 14, '3 V', 13, MUTED, 'left', 800);
  }
  function drawBulb() {
    const x = BX, y = YT, gl = S.glow, r = PHONE ? 22 : 24, cy = y - r - 8;
    if (gl > 0.02) D.glow(x, cy, r + 26 + 50 * gl, '#ffd34d', 0.7 * gl);
    D.roundRect(x - 11, y - 11, 22, 14, 3); ctx.fillStyle = '#6b7588'; ctx.fill();
    D.roundRect(x - 9, y - 16, 18, 8, 2); ctx.fillStyle = '#9aa5b8'; ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, cy - r * 0.35, r * 0.1, x, cy, r);
    g.addColorStop(0, CO.mix('#ffffff', '#fff3b0', gl)); g.addColorStop(1, CO.mix('#dfe6f0', '#ffcf4a', gl));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(100,115,140,.75)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = CO.mix('#6b7588', '#ff9a1f', gl); ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 6, y - 14); ctx.lineTo(x - 5, cy + 3); ctx.lineTo(x - 2.5, cy - 3); ctx.lineTo(x + 2.5, cy + 3); ctx.lineTo(x + 5, cy - 3); ctx.lineTo(x + 6, y - 14); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(x - r * 0.45, cy - r * 0.45, r * 0.2, r * 0.12, -0.6, 0, TAU); ctx.fill();
    T(x, y + 26, '전구', 13, MUTED, 'center', 800);
    const lab = bright(S.glow * IMAX);
    D.label(x, y + 48, lab, { size: fs(12.5), bg: gl > 0.1 ? '#b7791f' : '#6b7588', color: '#fff' });
  }
  function drawAmmeter() {
    const x = AX, y = YT, r = AR;
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }, { blur: 8, y: 2 });
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (a1 - a0) * (i / 6);
      ctx.strokeStyle = '#5d6879'; ctx.lineWidth = i % 2 ? 1.2 : 2;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4)); ctx.lineTo(x + Math.cos(a) * (r - (i % 2 ? 8 : 11)), y + Math.sin(a) * (r - (i % 2 ? 8 : 11))); ctx.stroke();
    }
    const na = a0 + (a1 - a0) * clamp(S.amp / IMAX, 0, 1);
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(na) * (r - 9), y + Math.sin(na) * (r - 9)); ctx.stroke();
    ctx.fillStyle = '#2b3a52'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill();
    T(x, y + r * 0.62, 'A', 13, MUTED, 'center', 900);
    T(x, y - r - 8, '전류계', 13, MUTED, 'center', 800);
    D.label(x, y + r + 16, Math.round(S.amp) + ' mA', { size: fs(13.5), bg: '#1b2333' });
  }
  function drawClips(pb, tipL, tipR) {
    [[TL, 1, tipL], [TR, -1, tipR]].forEach(([tx, dir, tip]) => {
      const g = 3.5 * (1 - pb);
      ctx.save();
      D.roundRect(Math.min(tx, tx + dir * 18), TY - 8, 18, 16, 5); ctx.fillStyle = dir > 0 ? '#2f3a4d' : '#8a2f2f'; ctx.fill();
      const x1 = tx + dir * 14, x2 = tip;
      [[-1], [1]].forEach(([sg]) => {
        ctx.fillStyle = '#b8c2cf'; ctx.strokeStyle = '#6b7588'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, TY + sg * 8); ctx.lineTo(x2, TY + sg * (3 + g)); ctx.lineTo(x2, TY + sg * (7 + g)); ctx.lineTo(x1, TY + sg * 8 + sg * 0.5);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      ctx.restore();
    });
    [TL, TR].forEach((tx) => { D.sphere(tx, TY, 6.5, '#aab4c3', { gloss: false, outline: '#6b7588', outlineWidth: 1.2 }); });
  }

  function beakerPath(x, y, w, h) {
    ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 3, y + h - 12); ctx.quadraticCurveTo(x + 4, y + h, x + 16, y + h);
    ctx.lineTo(x + w - 16, y + h); ctx.quadraticCurveTo(x + w - 4, y + h, x + w - 3, y + h - 12); ctx.lineTo(x + w + 4, y);
  }
  function crucPath(cx, y, tw, bw, h) {
    ctx.beginPath(); ctx.moveTo(cx - tw / 2, y); ctx.lineTo(cx - bw / 2, y + h - 8); ctx.quadraticCurveTo(cx - bw / 2 + 2, y + h, cx - bw / 2 + 12, y + h);
    ctx.lineTo(cx + bw / 2 - 12, y + h); ctx.quadraticCurveTo(cx + bw / 2 - 2, y + h, cx + bw / 2, y + h - 8); ctx.lineTo(cx + tw / 2, y);
  }
  function solidPattern(it, x, y, w, h) {
    D.roundRect(x, y, w, h, 5);
    if (it.secret) {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#d3d9e4'); g.addColorStop(1, '#9aa6b8'); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = '#6b7588'; ctx.lineWidth = 2; ctx.stroke();
      T(x + w / 2, y + h / 2 + 1, it.letter, 22, '#2b3a52', 'center', 900, { baseline: 'middle' });
      return;
    }
    const id = it.id;
    if (id === 'cu') {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#f0a56a'); g.addColorStop(0.5, '#d98a52'); g.addColorStop(1, '#a8582a'); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = '#8a4520'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 6, y + 4, w - 12, 3);
    } else if (id === 'al') {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#f1f4f8'); g.addColorStop(0.5, '#c4ccd8'); g.addColorStop(1, '#9aa5b5'); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = '#7d8798'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = 'rgba(90,100,120,.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); for (let i = 0; i <= 12; i++) { const px = x + 4 + (w - 8) * i / 12; const py = y + h / 2 + (i % 2 ? 4 : -4); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    } else if (id === 'wax') {
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fbf3da'); g.addColorStop(1, '#e5d4a2'); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = '#bda66a'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x + 6, y + 5, w - 12, 3);
    } else {
      ctx.fillStyle = id === 'sugar_s' ? '#fffaf0' : '#f6f9fd'; ctx.fill();
      ctx.save(); D.roundRect(x, y, w, h, 5); ctx.clip();
      ctx.strokeStyle = 'rgba(150,170,200,.55)'; ctx.lineWidth = 1;
      const cell = 9;
      for (let gx = x; gx < x + w; gx += cell) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke(); }
      for (let gy = y; gy < y + h; gy += cell) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 0; k < 7; k++) ctx.fillRect(x + 6 + ((k * 37) % (w - 14)), y + 4 + ((k * 13) % (h - 10)), 5, 4);
      ctx.restore();
      D.roundRect(x, y, w, h, 5); ctx.strokeStyle = '#9aa9bf'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }
  function liquidFill(it, clipFn, surfY, bottomY, left, right) {
    ctx.save(); clipFn(); ctx.clip();
    let c = it.col;
    if (it.secret) c = it.form === 'melt' ? (it.mat === 'metal' ? '#c9d1dc' : it.mat === 'ionic' ? '#ff9a3c' : '#eadfc8') : '#d8e4f2';
    const g = ctx.createLinearGradient(0, surfY, 0, bottomY);
    g.addColorStop(0, CO.rgba(c, it.form === 'melt' ? 0.95 : 0.6)); g.addColorStop(1, CO.rgba(CO.shade(c, -0.12), it.form === 'melt' ? 1 : 0.88));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(left, bottomY + 4);
    for (let i = 0; i <= 20; i++) ctx.lineTo(left + (right - left) * i / 20, surfY + Math.sin(S.t * 2.2 + i * 0.8) * 1.4);
    ctx.lineTo(right, bottomY + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(left, surfY - 1, right - left, 3);
    if (it.mat === 'metal' && (it.id === 'hg' || it.form === 'melt')) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(left + 12, surfY + 6, (right - left) * 0.5, 4); }
    ctx.restore();
  }
  function drawRods(depthY, pb) {
    [TL, TR].forEach((tx) => {
      const yb = TY + (depthY - TY) * pb;
      const g = ctx.createLinearGradient(tx - 4, 0, tx + 4, 0); g.addColorStop(0, '#6b7588'); g.addColorStop(0.5, '#3d4657'); g.addColorStop(1, '#262d3a');
      D.roundRect(tx - 4, TY, 8, Math.max(2, yb - TY), 3); ctx.fillStyle = g; ctx.fill();
    });
  }
  function drawStation() {
    const st = S.st, it = st.item;
    if (!it) { drawClips(0, TL + 26, TR - 26); return; }
    const p = st.p;
    const pa = clamp(p / 0.6, 0, 1), pb = clamp((p - 0.6) / 0.4, 0, 1);
    const ease = (v) => 1 - Math.pow(1 - v, 3);
    if (it.form === 'solid') {
      const hw = TOFF - 30, hh = it.id === 'al' ? 7 : 15;
      const dy = -(1 - ease(pa)) * 80;
      ctx.save(); ctx.globalAlpha = clamp(pa * 1.4, 0, 1);
      D.shadow(() => { solidPattern(it, CX - hw, TY - hh + dy, hw * 2, hh * 2); }, { blur: 6, y: 3, color: 'rgba(30,40,70,.25)' });
      ctx.restore();
      drawClips(pb, TL + 36 - (1 - pb) * 12, TR - 36 + (1 - pb) * 12);
      // 클립이 시료 끝을 물어요
      return;
    }
    const slide = (1 - ease(pa)) * 220;
    ctx.save();
    ctx.globalAlpha = clamp(pa * 1.5, 0, 1);
    ctx.translate(slide, 0);
    if (it.form === 'melt') {
      const cw = 128, bw = 88, ch = 66, cy = RIM;
      // 삼발이 + 가열 장치 (모의)
      ctx.strokeStyle = '#59616f'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      [[-cw / 2 + 6, -bw / 2 + 4], [cw / 2 - 6, bw / 2 - 4]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(CX + a, cy + 14); ctx.lineTo(CX + b * 1.1, cy + ch + 34); ctx.stroke(); });
      D.roundRect(CX - 26, cy + ch + 30, 52, 12, 4); ctx.fillStyle = '#4a5363'; ctx.fill();
      const heatOn = st.item && closed();
      if (heatOn) {
        const fl = st.heat < 1 ? 1 : 0.55;
        D.flame(CX, cy + ch + 30, 32 * fl, S.t, { glow: '#ff7a2a' });
      }
      D.shadow(() => { crucPath(CX, cy, cw, bw, ch); ctx.closePath(); ctx.fillStyle = '#ddd6ca'; ctx.fill(); }, { blur: 6, y: 2 });
      // 내용물: 가열하면 고체 결정 -> 녹아서 액체
      const h = st.heat, surf = cy + 14;
      ctx.save(); crucPath(CX, cy, cw, bw, ch); ctx.closePath(); ctx.clip();
      const solidC = it.secret ? (it.mat === 'metal' ? '#aeb8c6' : it.mat === 'ionic' ? '#f4f7fb' : '#f6efe0') : '#f4f7fb';
      const liqC = it.secret ? (it.mat === 'metal' ? '#cfd6e0' : it.mat === 'ionic' ? '#ff9a3c' : '#efe2c2') : '#ff9a3c';
      const hot = it.secret ? (it.mat === 'ionic' ? 1 : it.mat === 'metal' ? 0.5 : 0.25) : 1;
      ctx.fillStyle = CO.mix(solidC, liqC, clamp((h - 0.35) / 0.45, 0, 1));
      ctx.fillRect(CX - cw / 2, surf, cw, ch);
      if (h < 0.7) { ctx.strokeStyle = 'rgba(150,170,200,.6)'; ctx.lineWidth = 1; for (let gx = CX - cw / 2; gx < CX + cw / 2; gx += 9) { ctx.beginPath(); ctx.moveTo(gx, surf); ctx.lineTo(gx, surf + ch); ctx.stroke(); } }
      else { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(CX - cw / 2, surf, cw, 3); }
      ctx.restore();
      if (h > 0.4 && hot > 0.6) D.glow(CX, surf + 18, 70, '#ff7a1a', 0.45 * clamp((h - 0.4) / 0.6, 0, 1));
      crucPath(CX, cy, cw, bw, ch); ctx.strokeStyle = '#8a8274'; ctx.lineWidth = 3; ctx.stroke();
      if (it.secret) T(CX, cy + 40, it.letter, 20, '#2b3a52', 'center', 900, { baseline: 'middle', stroke: 'rgba(255,255,255,.7)', strokeWidth: 4 });
      ctx.restore();
      // 가열 진행 막대
      if (closed() && st.heat < 1) {
        D.roundRect(CX - 50, TY - 24, 100, 8, 4); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill();
        D.roundRect(CX - 50, TY - 24, Math.max(8, 100 * st.heat), 8, 4); ctx.fillStyle = '#ff7a1a'; ctx.fill();
      }
      drawRods(cy + 14 + 34, pb);
      return;
    }
    // 비커
    const bx = CX - BWD / 2;
    D.shadow(() => { beakerPath(bx, RIM, BWD, BHT); ctx.lineTo(bx + BWD + 4, RIM); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); }, { blur: 6, y: 2 });
    const lvl = it.id === 'hg' ? RIM + BHT - 30 : SURF;
    liquidFill(it, () => { beakerPath(bx, RIM, BWD, BHT); ctx.lineTo(bx + BWD + 4, RIM); ctx.closePath(); }, lvl, RIM + BHT, bx - 4, bx + BWD + 4);
    beakerPath(bx, RIM, BWD, BHT); ctx.strokeStyle = 'rgba(110,135,170,.95)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx + 9, RIM + 8); ctx.lineTo(bx + 12, RIM + BHT - 22); ctx.stroke();
    if (it.secret) T(CX, RIM + BHT - 26, it.letter, 20, '#2b3a52', 'center', 900, { baseline: 'middle', stroke: 'rgba(255,255,255,.7)', strokeWidth: 4 });
    ctx.restore();
    drawRods(lvl + 28, pb);
  }
  function drawVerdict() {
    const v = S.verdict; if (!v) return;
    const age = S.t - v.t0; if (age > 2.6) return;
    const k = clamp(age / 0.25, 0, 1), al = age > 2.0 ? clamp(1 - (age - 2.0) / 0.6, 0, 1) : 1;
    ctx.save(); ctx.globalAlpha = al;
    const y = TY - 70 - (1 - k) * 10;
    D.label(CX, y, v.ok ? '✅ 전기가 통해요 (전구 켜짐)' : '❌ 전기가 통하지 않아요 (전구 꺼짐)', { size: fs(15), bg: v.ok ? GOOD : '#6b7588' });
    ctx.restore();
  }
  function drawSampleName() {
    const it = S.st.item; if (!it || S.st.p < 0.5) return;
    const heating = it.form === 'melt' && closed() && S.st.heat < 1;
    D.label(CX, TY - 38, it.short + ' · ' + STATE[it.form] + (heating ? ' · 가열 중… (모의)' : ''), { size: fs(13.5), bg: '#ffffff', color: heating ? '#b45309' : INK, border: '#c9bfe8' });
  }
  function drawCircuit() {
    drawWires();
    drawFlowDots();
    drawBattery(); drawBulb(); drawAmmeter();
    drawStation();
    drawSampleName(); drawVerdict();
    if (!S.st.item) T(CX, TY - 38, '시료를 고르면 여기에 연결돼요', 13.5, MUTED, 'center', 700);
  }

  /* ---------- 그리기: 결과 표 ---------- */
  function drawTable(x, y, w, title, list, rowH) {
    const hdr = 24, h = hdr + list.length * rowH + 6;
    panel(x, y, w, h, 12, '#fff', '#e3dcf5');
    T(x + 10, y + 17, title, 14, '#4c1d95', 'left', 900);
    const cCur = w * 0.66, cBul = w * 0.80, cChip = w * 0.93;
    T(x + cCur, y + 17, '전류', 12.5, MUTED, 'right', 800);
    T(x + cBul, y + 17, '전구', 12.5, MUTED, 'center', 800);
    T(x + cChip, y + 17, '전도', 12.5, MUTED, 'center', 800);
    list.forEach((s, i) => {
      const ry = y + hdr + i * rowH, r = S.rec[s.id], on = !!r;
      if (i % 2 === 0) { D.roundRect(x + 5, ry, w - 10, rowH - 1, 6); ctx.fillStyle = 'rgba(139,92,246,.05)'; ctx.fill(); }
      const fl = S.flash[s.id] != null ? clamp(1 - (S.t - S.flash[s.id]) / 1.4, 0, 1) : 0;
      if (fl > 0) { D.roundRect(x + 5, ry, w - 10, rowH - 1, 6); ctx.fillStyle = 'rgba(250,204,21,' + (0.5 * fl) + ')'; ctx.fill(); }
      T(x + 12, ry + rowH / 2 + 5, s.short, 13.5, on ? INK : '#a2abb9', 'left', on ? 800 : 700);
      if (on) {
        const ok = conducts(r.I);
        T(x + cCur, ry + rowH / 2 + 5, r.I + ' mA', 13.5, INK, 'right', 800);
        T(x + cBul, ry + rowH / 2 + 5, bright(r.I), 12.5, ok ? '#8a5a00' : MUTED, 'center', 800);
        D.sphere(x + cChip, ry + rowH / 2, rowH * 0.36, ok ? GOOD : '#9aa5b5', { gloss: false });
        T(x + cChip, ry + rowH / 2 + 0.5, ok ? 'O' : 'X', 12.5, '#fff', 'center', 900, { baseline: 'middle' });
      } else {
        T(x + cCur, ry + rowH / 2 + 5, '—', 13.5, '#c3cad6', 'right', 700);
      }
    });
    return h;
  }
  function drawLabBottom() {
    const L = gameLevel(), free = isFree();
    const showLiq = free || L >= 1;
    const rowH = PHONE ? 25 : 21;
    if (PHONE) {
      const w = VW - 32;
      let y = TBY;
      const h1 = drawTable(16, y, w, '① 고체 시료', SOL, rowH);
      y += h1 + 12;
      if (showLiq) drawTable(16, y, w, '② 액체 · 수용액 시료', LIQ, rowH);
      else {
        panel(16, y, w, 150, 12, '#fff', '#e3dcf5');
        T(30, y + 26, '💡 전류가 흐르려면?', 15, '#4c1d95', 'left', 900);
        textBlock(30, y + 52, w - 28, '① 움직일 수 있는 전하(자유 전자나 이온)가 있어야 해요.\n② 전지가 만든 전위차가 그 전하를 한 방향으로 밀어 줘야 해요.\n시료를 바꿔 가며 전구가 켜지는지 살펴봐요.', 14, INK, 21, 700);
      }
    } else {
      const w = 372;
      drawTable(24, TBY, w, '① 고체 시료', SOL, rowH);
      if (showLiq) drawTable(404, TBY, w, '② 액체 · 수용액 시료', LIQ, rowH);
      else {
        panel(404, TBY, w, 24 + 6 * rowH + 6, 12, '#fff', '#e3dcf5');
        T(420, TBY + 26, '💡 전류가 흐르려면?', 15, '#4c1d95', 'left', 900);
        textBlock(420, TBY + 54, w - 32, '① 움직일 수 있는 전하(자유 전자나 이온)가 있어야 해요.\n② 전지가 만든 전위차가 그 전하를 한 방향으로 밀어 줘야 해요.\n시료를 바꿔 가며 전구가 켜지는지 살펴봐요.', 14, INK, 22, 700);
      }
    }
  }

  /* =========================================================
     ③ 입자 모형 (전기장 속 전하 운반자)
     ========================================================= */
  const MG = PHONE
    ? { ix0: 78, ix1: 402, iy0: 160, iy1: 392, wl: 160 + 62 }
    : { ix0: 130, ix1: 670, iy0: 114, iy1: 324, wl: 114 + 56 };
  const MODELS = [
    { id: 'cu', label: '구리(금속)', name: '구리(Cu)', type: 'metal' },
    { id: 'nacl_s', label: 'NaCl 고체', name: '고체 NaCl', type: 'ionlattice' },
    { id: 'nacl_l', label: '용융 NaCl', name: '용융 NaCl', type: 'ionliquid', mix: 'Na' },
    { id: 'nacl_aq', label: 'NaCl 수용액', name: 'NaCl 수용액', type: 'ionliquid', water: true, mix: 'Na' },
    { id: 'sugar_aq', label: '설탕 수용액', name: '설탕 수용액', type: 'sugar', water: true },
    { id: 'hcl_aq', label: 'HCl 수용액', name: 'HCl 수용액', type: 'hcl', water: true },
  ];
  const MBY = {}; MODELS.forEach((m) => { MBY[m.id] = m; });
  const M = { id: 'cu', parts: [], diss: false, dissT: 0, pops: [] };
  const R_NA = 11, R_CL = 15, R_CU = 13, R_H = 8;
  const DRIFT = { e: 100, na: 22, cl: 22, h: 36 };
  function mkP(type, x, y, extra) {
    const a = Math.random() * TAU, sp = rnd(25, 60);
    return Object.assign({ type, x, y, hx: x, hy: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ph: Math.random() * TAU }, extra || {});
  }
  function buildModel(id) {
    M.id = id; M.parts = []; M.diss = false; M.dissT = 0; M.pops = [];
    const m = MBY[id], g = MG, W = g.ix1 - g.ix0, H = g.iy1 - g.iy0;
    const cols = PHONE ? 6 : 8, rows = 4;
    const liqTop = g.wl + 12, liqBot = g.iy1 - 8;
    const rx = (lo, hi) => rnd(lo, hi);
    if (m.type === 'metal') {
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) M.parts.push(mkP('cu', g.ix0 + (i + 0.5) * W / cols, g.iy0 + (j + 0.5) * H / rows, { r: R_CU }));
      const n = PHONE ? 22 : 30;
      for (let k = 0; k < n; k++) M.parts.push(mkP('e', rx(g.ix0 + 8, g.ix1 - 8), rx(g.iy0 + 8, g.iy1 - 8), { r: 4.6 }));
    } else if (m.type === 'ionlattice') {
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const isNa = (i + j) % 2 === 0;
        M.parts.push(mkP(isNa ? 'na' : 'cl', g.ix0 + (i + 0.5) * W / cols, g.iy0 + (j + 0.5) * H / rows, { r: isNa ? R_NA : R_CL }));
      }
    } else if (m.type === 'ionliquid') {
      const n = PHONE ? 9 : 13;
      for (let k = 0; k < n; k++) {
        M.parts.push(mkP('na', rx(g.ix0 + 20, g.ix1 - 20), rx(m.water ? liqTop + 10 : g.iy0 + 20, liqBot - 14), { r: R_NA }));
        M.parts.push(mkP('cl', rx(g.ix0 + 20, g.ix1 - 20), rx(m.water ? liqTop + 10 : g.iy0 + 20, liqBot - 14), { r: R_CL }));
      }
    } else if (m.type === 'sugar') {
      for (let k = 0; k < (PHONE ? 8 : 10); k++) M.parts.push(mkP('sug', rx(g.ix0 + 24, g.ix1 - 24), rx(liqTop + 14, liqBot - 14), { r: 15 }));
    } else if (m.type === 'hcl') {
      for (let k = 0; k < (PHONE ? 7 : 9); k++) M.parts.push(mkP('hcl', rx(g.ix0 + 24, g.ix1 - 24), rx(g.iy0 + 14, g.wl - 14), { r: 15, gas: true, ang: rnd(0, TAU), va: rnd(-1.5, 1.5) }));
    }
    if (m.water) {
      const nw = PHONE ? 26 : 38;
      for (let k = 0; k < nw; k++) M.parts.push(mkP('w', rx(g.ix0 + 10, g.ix1 - 10), rx(liqTop + 4, liqBot - 4), { r: 6, ang: rnd(0, TAU), va: rnd(-1, 1) }));
    }
  }
  const mdl = () => MBY[M.id];
  function modelConducting() {
    if (!S.field) return false;
    const t = mdl().type;
    if (t === 'metal' || t === 'ionliquid') return true;
    if (t === 'hcl') return M.diss && M.parts.some((p) => p.type === 'h');
    return false;
  }
  function modelCarrierText() {
    const m = mdl(), t = m.type;
    if (t === 'metal') return '자유 전자 → (+)극';
    if (t === 'ionliquid') return 'Na⁺ → (−)극, Cl⁻ → (+)극';
    if (t === 'hcl') return M.diss ? 'H⁺ → (−)극, Cl⁻ → (+)극' : '없음 (HCl 분자는 전하가 없어요)';
    if (t === 'ionlattice') return '없음 (이온이 제자리에 고정)';
    return '없음 (중성 분자)';
  }
  function dissolve() {
    if (mdl().type !== 'hcl' || M.diss) return;
    M.diss = true; M.dissT = S.t;
    let k = 0;
    M.parts.forEach((p) => { if (p.type === 'hcl') { p.dl = k * 0.16; p.fall = true; k++; } });
    Sound.click(); updateUI();
  }
  function stepModel(dt) {
    const g = MG, m = mdl(), field = S.field;
    S.fieldA = approach(S.fieldA, field ? 1 : 0, dt, 6);
    if (field && S.scene === 'model') S.obs[M.id] = (S.obs[M.id] || 0) + dt;
    const liqTop = g.wl, liqBot = g.iy1;
    const ions = [];
    M.parts.forEach((p) => {
      p.ph += dt;
      if (p.type === 'cu' || (p.type === 'na' || p.type === 'cl') && m.type === 'ionlattice') {
        p.x = p.hx + Math.sin(p.ph * 9 + p.hx) * 2.2; p.y = p.hy + Math.cos(p.ph * 8 + p.hy) * 2.2; return;
      }
      if (p.type === 'e') {
        if (Math.random() < 2.2 * dt) { const a = Math.random() * TAU, sp = rnd(30, 70); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; }
        p.x += (p.vx + (field ? DRIFT.e : 0) * S.fieldA) * dt; p.y += p.vy * dt;
        if (p.x > g.ix1 - 4) p.x -= (g.ix1 - g.ix0 - 8); if (p.x < g.ix0 + 4) p.x += (g.ix1 - g.ix0 - 8);
        if (p.y < g.iy0 + 6) { p.y = g.iy0 + 6; p.vy = Math.abs(p.vy); } if (p.y > g.iy1 - 6) { p.y = g.iy1 - 6; p.vy = -Math.abs(p.vy); }
        return;
      }
      if (p.type === 'hcl' && p.gas) {
        if (p.fall) {
          p.dl -= dt;
          if (p.dl <= 0) {
            p.y += 150 * dt; p.x += Math.sin(p.ph * 3) * 14 * dt; p.ang += p.va * dt;
            if (p.y > liqTop + 22) {
              // 물과 만나 H⁺ 와 Cl⁻ 로 나뉘어요
              p.dead = true;
              const hx = p.x - 9, cx = p.x + 9;
              M.parts.push(mkP('h', hx, p.y, { r: R_H, vx: -50, vy: -10 }), mkP('cl', cx, p.y, { r: R_CL, vx: 40, vy: 10 }));
              fx.burst(p.x, p.y, { count: 10, colors: ['#ffffff', '#ffb4a8', '#9ec0ff'], speed: 80, size: 3, gravity: 0, life: 0.6 });
              M.pops.push({ x: p.x, y: p.y, t: S.t });
            }
          }
          return;
        }
        if (Math.random() < 2 * dt) { const a = Math.random() * TAU, sp = rnd(25, 60); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.ang += p.va * dt;
        if (p.x < g.ix0 + p.r) { p.x = g.ix0 + p.r; p.vx = Math.abs(p.vx); } if (p.x > g.ix1 - p.r) { p.x = g.ix1 - p.r; p.vx = -Math.abs(p.vx); }
        if (p.y < g.iy0 + p.r) { p.y = g.iy0 + p.r; p.vy = Math.abs(p.vy); } if (p.y > liqTop - p.r - 2) { p.y = liqTop - p.r - 2; p.vy = -Math.abs(p.vy); }
        return;
      }
      // 액체 속 입자: 열운동 + 전기장 속 이동 (전하를 띤 입자만)
      if (Math.random() < 2.5 * dt) { const a = Math.random() * TAU, sp = rnd(22, p.type === 'w' ? 40 : 58); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; }
      let dx = 0;
      if (p.type === 'na') dx = -DRIFT.na; else if (p.type === 'cl') dx = DRIFT.cl; else if (p.type === 'h') dx = -DRIFT.h;
      p.x += (p.vx + dx * S.fieldA) * dt; p.y += p.vy * dt;
      if (p.ang != null) p.ang += (p.va || 0) * dt;
      const top = m.water ? liqTop + p.r + 2 : g.iy0 + p.r;
      if (p.x < g.ix0 + p.r) { p.x = g.ix0 + p.r; p.vx = Math.abs(p.vx); } if (p.x > g.ix1 - p.r) { p.x = g.ix1 - p.r; p.vx = -Math.abs(p.vx); }
      if (p.y < top) { p.y = top; p.vy = Math.abs(p.vy); } if (p.y > liqBot - p.r - 2) { p.y = liqBot - p.r - 2; p.vy = -Math.abs(p.vy); }
      if (p.type === 'na' || p.type === 'cl' || p.type === 'h' || p.type === 'sug') ions.push(p);
    });
    // 입자끼리 겹치지 않게 살짝 밀어내요
    for (let i = 0; i < ions.length; i++) for (let j = i + 1; j < ions.length; j++) {
      const a = ions[i], b = ions[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r - 1;
      if (d < min) { const k = (min - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
    }
    if (M.parts.some((p) => p.dead)) M.parts = M.parts.filter((p) => !p.dead);
    // 전선의 전자 흐름
    const cond = modelConducting();
    S.mAmp = approach(S.mAmp || 0, cond ? 1 : 0, dt, 5);
    S.mPhase = (S.mPhase || 0) + 120 * S.mAmp * dt;
  }
  // 모형 장면 좌표
  const MTOP = PHONE ? 80 : 58;
  function modelWire() {
    const g = MG, xl = g.ix0 - 7, xr = g.ix1 + 7, bxc = VW / 2, bw = PHONE ? 90 : 110;
    return { xl, xr, bl: bxc - bw / 2, br: bxc + bw / 2, y: MTOP, bulbX: PHONE ? xl + 74 : xl + 150 };
  }
  function drawModel() {
    const g = MG, m = mdl(), w = modelWire();
    const field = S.field;
    // 배경 장면
    const bgG = ctx.createLinearGradient(0, 0, 0, VH); bgG.addColorStop(0, '#f7f4fe'); bgG.addColorStop(1, '#ece7f9'); ctx.fillStyle = bgG; ctx.fillRect(0, 0, VW, VH);
    // 전선
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const wire = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.strokeStyle = '#3d4657'; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = '#7d8aa0'; ctx.lineWidth = 2.5; ctx.stroke(); };
    wire([[w.bl, w.y], [w.xl, w.y], [w.xl, g.iy0]]);
    wire([[w.br, w.y], [w.xr, w.y], [w.xr, g.iy0]]);
    ctx.restore();
    // 전지 (왼쪽 끝 −, 오른쪽 끝 +)
    {
      const bw = w.br - w.bl;
      D.shadow(() => { D.roundRect(w.bl, w.y - 17, bw, 34, 8); ctx.fillStyle = '#2b3a52'; ctx.fill(); }, { blur: 8, y: 3 });
      const gg = ctx.createLinearGradient(0, w.y - 15, 0, w.y + 15); gg.addColorStop(0, '#6a88b8'); gg.addColorStop(1, '#2f4468');
      D.roundRect(w.bl + 12, w.y - 15, bw - 14, 30, 7); ctx.fillStyle = gg; ctx.fill();
      T(w.bl + 6, w.y + 1, '−', 22, '#fff', 'center', 900, { baseline: 'middle' });
      T(w.br - 8, w.y + 1, '+', 22, '#fff', 'center', 900, { baseline: 'middle' });
      T((w.bl + w.br) / 2, w.y + 1, '전지', 13.5, '#fff', 'center', 800, { baseline: 'middle' });
    }
    // 전구 (왼쪽 전선 위)
    {
      const gl = clamp(S.mAmp || 0, 0, 1), bx = w.bulbX, by = w.y, r = 17;
      D.roundRect(bx - 12, by - 6, 24, 12, 3); ctx.fillStyle = '#8c97aa'; ctx.fill();
      if (gl > 0.02) D.glow(bx, by - 22, 22 + 38 * gl, '#ffd34d', 0.7 * gl);
      const gg = ctx.createRadialGradient(bx - 5, by - 27, 2, bx, by - 22, r);
      gg.addColorStop(0, CO.mix('#ffffff', '#fff3b0', gl)); gg.addColorStop(1, CO.mix('#dfe6f0', '#ffcf4a', gl));
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(bx, by - 22, r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(100,115,140,.75)'; ctx.lineWidth = 2; ctx.stroke();
      T(bx, by + 24, '전구', 12.5, MUTED, 'center', 800);
    }
    // 전자 흐름 점 (전선) : 전지 (−) → 왼쪽 판, 오른쪽 판 → 전지 (+)
    if ((S.mAmp || 0) > 0.05) {
      const pl = pathInfo([[w.bl, w.y], [w.xl, w.y], [w.xl, g.iy0]]), pr = pathInfo([[w.xr, g.iy0], [w.xr, w.y], [w.br, w.y]]);
      ctx.globalAlpha = clamp(S.mAmp, 0, 1);
      [pl, pr].forEach((pi, idx) => {
        const n = Math.floor(pi.len / 26);
        for (let k = 0; k < n; k++) { const pt = atPath(pi, (S.mPhase + k * 26) % pi.len); D.sphere(pt[0], pt[1], 4, ELEC, { gloss: false, outline: 'rgba(120,70,0,.5)', outlineWidth: 1 }); }
      });
      ctx.globalAlpha = 1;
    }
    // 용기 (두 판이 양쪽 벽)
    const isLiq = m.type === 'ionliquid' || m.type === 'sugar' || m.type === 'hcl';
    // 바닥
    D.roundRect(g.ix0 - 14, g.iy1, g.ix1 - g.ix0 + 28, 10, 4); ctx.fillStyle = '#9aa5b8'; ctx.fill();
    if (isLiq) {
      const lg = ctx.createLinearGradient(0, g.wl, 0, g.iy1); const lc = m.id === 'nacl_l' ? '#ff9a3c' : '#b7dcff';
      lg.addColorStop(0, CO.rgba(lc, m.id === 'nacl_l' ? 0.7 : 0.5)); lg.addColorStop(1, CO.rgba(lc, m.id === 'nacl_l' ? 0.9 : 0.78));
      const top = m.type === 'ionliquid' && !m.water ? g.iy0 + 4 : g.wl;
      ctx.fillStyle = lg; ctx.fillRect(g.ix0, top, g.ix1 - g.ix0, g.iy1 - top);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(g.ix0, top, g.ix1 - g.ix0, 3);
      if (m.id === 'nacl_l') D.glow((g.ix0 + g.ix1) / 2, (g.iy0 + g.iy1) / 2, 240, '#ff7a1a', 0.18);
    } else {
      ctx.fillStyle = m.type === 'metal' ? 'rgba(217,138,82,.22)' : 'rgba(255,255,255,.7)'; ctx.fillRect(g.ix0, g.iy0, g.ix1 - g.ix0, g.iy1 - g.iy0);
      ctx.strokeStyle = 'rgba(120,130,150,.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(g.ix0, g.iy0, g.ix1 - g.ix0, g.iy1 - g.iy0);
    }
    // 판 (왼쪽 −, 오른쪽 +)
    const plate = (x, neg) => {
      const gg = ctx.createLinearGradient(x, 0, x + 14, 0); const c = neg ? ANI : CAT;
      gg.addColorStop(0, CO.shade(c, 0.25)); gg.addColorStop(1, CO.shade(c, -0.25));
      D.shadow(() => { D.roundRect(x, g.iy0 - 6, 14, g.iy1 - g.iy0 + 10, 4); ctx.fillStyle = gg; ctx.fill(); }, { blur: 5, y: 2 });
      T(x + 7, g.iy0 - 14, neg ? '−' : '+', 22, neg ? ANI : CAT, 'center', 900);
    };
    plate(g.ix0 - 14, true); plate(g.ix1, false);
    T(g.ix0 - 7, g.iy1 + 28, '(−)극', 13.5, ANI, 'center', 900); T(g.ix1 + 7, g.iy1 + 28, '(+)극', 13.5, CAT, 'center', 900);
    // 입자
    drawParts(m);
    // 전기장 화살표 (+ → −)
    if (S.fieldA > 0.02) {
      ctx.save(); ctx.globalAlpha = S.fieldA;
      const ay = g.iy1 + 46, ax1 = (g.ix0 + g.ix1) / 2 + 90, ax0 = (g.ix0 + g.ix1) / 2 - 90;
      D.arrow(ax1, ay, ax0, ay, { color: '#7c3aed', width: 4, head: 13 });
      T((g.ix0 + g.ix1) / 2, ay - 9, '전기장 방향 (+극 → −극)', 13, '#5b21b6', 'center', 800);
      ctx.restore();
    }
    // HCl 안내
    if (m.type === 'hcl' && !M.diss) {
      D.label((g.ix0 + g.ix1) / 2, g.wl - 10 + 0, 'HCl 기체 분자 (공유 결합, 전하 없음)', { size: fs(12.5), bg: 'rgba(27,35,51,.85)' });
      T((g.ix0 + g.ix1) / 2, g.wl + 22, '물', 13, '#2d6aa8', 'center', 800);
    }
    M.pops.forEach((q) => { const age = S.t - q.t; if (age < 1.2) { ctx.globalAlpha = 1 - age / 1.2; T(q.x, q.y - 18 - age * 20, 'H⁺ + Cl⁻', 12.5, '#5b21b6', 'center', 900, { stroke: 'rgba(255,255,255,.85)', strokeWidth: 3 }); ctx.globalAlpha = 1; } });
    drawModelBottom();
  }
  function drawWater(p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang || 0); ctx.globalAlpha = 0.9;
    D.sphere(0, 0, 4.6, '#7fb6e8', { gloss: false });
    D.sphere(-4.6, 3.2, 2.5, '#ffffff', { gloss: false, outline: 'rgba(80,120,170,.5)', outlineWidth: 0.7 });
    D.sphere(4.6, 3.2, 2.5, '#ffffff', { gloss: false, outline: 'rgba(80,120,170,.5)', outlineWidth: 0.7 });
    ctx.restore();
  }
  function drawParts(m) {
    // 물 분자 → 큰 입자 순서
    M.parts.forEach((p) => { if (p.type === 'w') drawWater(p); });
    M.parts.forEach((p) => {
      if (p.type === 'w') return;
      if (p.type === 'cu') D.sphere(p.x, p.y, p.r, '#e07a5a', { text: '+', textScale: 1.0, outline: 'rgba(110,40,20,.55)', outlineWidth: 1.2, gloss: true });
      else if (p.type === 'e') D.sphere(p.x, p.y, p.r, ELEC, { gloss: false, outline: 'rgba(120,70,0,.55)', outlineWidth: 1 });
      else if (p.type === 'na') D.sphere(p.x, p.y, p.r, CAT, { text: '+', textScale: 1.05, outline: 'rgba(110,30,20,.5)', outlineWidth: 1.2 });
      else if (p.type === 'cl') D.sphere(p.x, p.y, p.r, ANI, { text: '−', textScale: 1.1, outline: 'rgba(20,40,120,.5)', outlineWidth: 1.2 });
      else if (p.type === 'h') D.sphere(p.x, p.y, p.r, '#ff8f7a', { text: '+', textScale: 1.1, outline: 'rgba(110,30,20,.5)', outlineWidth: 1.2 });
      else if (p.type === 'sug') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ph * 0.4);
        ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * TAU / 6; ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); } ctx.closePath();
        ctx.fillStyle = '#f9d98a'; ctx.fill(); ctx.strokeStyle = '#c9972f'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#d6453d'; ctx.beginPath(); ctx.arc(14, 0, 3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(-9, 10, 3, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (p.type === 'hcl') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang || 0);
        ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke();
        D.sphere(-9, 0, 5.5, '#ffffff', { gloss: false, outline: '#8a95a8', outlineWidth: 1.2 });
        D.sphere(8, 0, 9, '#3fae6a', { gloss: true, outline: 'rgba(20,80,40,.55)', outlineWidth: 1.2 });
        ctx.restore();
      }
    });
  }
  function drawModelBottom() {
    const g = MG, m = mdl();
    const y0 = PHONE ? g.iy1 + 84 : g.iy1 + 70;
    const x0 = PHONE ? 16 : 24, w = VW - x0 * 2;
    // 범례
    const leg = [];
    if (m.type === 'metal') leg.push(['cu', '금속 양이온 (제자리)'], ['e', '자유 전자']);
    else if (m.type === 'ionlattice') leg.push(['na', 'Na⁺'], ['cl', 'Cl⁻'], ['txt', '이온이 제자리에서 진동만 해요']);
    else if (m.type === 'ionliquid') { leg.push(['na', 'Na⁺'], ['cl', 'Cl⁻']); if (m.water) leg.push(['w', '물 분자']); }
    else if (m.type === 'sugar') leg.push(['sug', '설탕 분자 (중성)'], ['w', '물 분자']);
    else leg.push(['hcl', 'HCl 분자'], ['h', 'H⁺'], ['cl', 'Cl⁻'], ['w', '물 분자']);
    panel(x0, y0, w, PHONE ? 66 : 46, 12, '#fff', '#e3dcf5');
    let lx = x0 + 14, ly = y0 + (PHONE ? 20 : 23);
    leg.forEach(([k, label]) => {
      if (k === 'txt') { T(lx, ly + 5, label, 13, MUTED, 'left', 700); return; }
      const tw = (() => { ctx.save(); ctx.font = D.font(fs(13), 700); const v = ctx.measureText(label).width; ctx.restore(); return v; })();
      if (PHONE && lx + 26 + tw > x0 + w - 8) { lx = x0 + 14; ly += 24; }
      const fake = { x: lx + 9, y: ly, r: 8, type: k, ph: 0, ang: 0 };
      if (k === 'w') drawWater(fake);
      else if (k === 'e') D.sphere(lx + 9, ly, 5, ELEC, { gloss: false, outline: 'rgba(120,70,0,.5)', outlineWidth: 1 });
      else if (k === 'cu') D.sphere(lx + 9, ly, 9, '#e07a5a', { text: '+', outline: 'rgba(110,40,20,.55)', outlineWidth: 1 });
      else if (k === 'na') D.sphere(lx + 9, ly, 9, CAT, { text: '+', outline: 'rgba(110,30,20,.5)', outlineWidth: 1 });
      else if (k === 'cl') D.sphere(lx + 9, ly, 9, ANI, { text: '−', outline: 'rgba(20,40,120,.5)', outlineWidth: 1 });
      else if (k === 'h') D.sphere(lx + 9, ly, 7, '#ff8f7a', { text: '+', outline: 'rgba(110,30,20,.5)', outlineWidth: 1 });
      else if (k === 'sug') { ctx.save(); ctx.translate(lx + 9, ly); ctx.beginPath(); for (let q = 0; q < 6; q++) { const a = q * TAU / 6; ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); } ctx.closePath(); ctx.fillStyle = '#f9d98a'; ctx.fill(); ctx.strokeStyle = '#c9972f'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); }
      else if (k === 'hcl') { ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(lx + 4, ly); ctx.lineTo(lx + 16, ly); ctx.stroke(); D.sphere(lx + 3, ly, 4.5, '#fff', { gloss: false, outline: '#8a95a8', outlineWidth: 1 }); D.sphere(lx + 16, ly, 7, '#3fae6a', { gloss: false, outline: 'rgba(20,80,40,.5)', outlineWidth: 1 }); }
      const off = k === 'hcl' ? 32 : 24;
      T(lx + off, ly + 5, label, 13, INK, 'left', 700);
      lx += off + tw + 18;
    });
    // 관찰 시간 막대
    const by = y0 + (PHONE ? 80 : 60);
    panel(x0, by, w, PHONE ? 130 : 96, 12, '#fff', '#e3dcf5');
    T(x0 + 14, by + 22, '⚡ 전기장을 켠 시간 (2초 이상 지켜봐요)', 13.5, '#4c1d95', 'left', 900);
    const targets = ['cu', 'nacl_s', 'nacl_l', 'sugar_aq'];
    const cw = (w - 28 - (PHONE ? 8 : 24)) / (PHONE ? 2 : 4);
    targets.forEach((id, i) => {
      const col = PHONE ? i % 2 : i, row = PHONE ? Math.floor(i / 2) : 0;
      const cx = x0 + 14 + col * (cw + (PHONE ? 8 : 8)), cy = by + 36 + row * 44;
      const v = clamp(S.obs[id] || 0, 0, 2) / 2;
      T(cx, cy + 12, MBY[id].label, 12.5, v >= 1 ? '#0b6b39' : MUTED, 'left', 800);
      D.roundRect(cx, cy + 18, cw - 6, 10, 5); ctx.fillStyle = 'rgba(0,0,0,.09)'; ctx.fill();
      if (v > 0.01) { D.roundRect(cx, cy + 18, Math.max(10, (cw - 6) * v), 10, 5); ctx.fillStyle = v >= 1 ? GOOD : '#a78bfa'; ctx.fill(); }
    });
  }

  /* =========================================================
     ④ 비밀 시료 · 흐름도
     ========================================================= */
  const CLS_KEYS = ['metal', 'ionic', 'mol'];
  const CLS_SHORT = { metal: '금속 결합', ionic: '이온 결합', mol: '분자 물질' };
  function secNeeded(L) {   // 분류를 판단하려면 꼭 필요한 시험
    const m = S.sec.map[L];
    return m === 'metal' ? ['solid'] : ['solid', 'melt'];
  }
  function secTested(L, mode) { return S.sec.res[L][mode] != null; }
  function secOK(L) {
    return S.sec.cls[L] === S.sec.map[L] && secNeeded(L).every((m) => secTested(L, m));
  }
  const FL = PHONE
    ? { q1: [240, 556, 300, 40], q2: [358, 650, 232, 40], r1: [92, 650, 132, 40], r2: [296, 744, 118, 40], r3: [420, 744, 104, 40] }
    : { q1: [411, 388, 190, 38], q2: [668, 388, 216, 38], r1: [411, 482, 150, 40], r2: [614, 482, 112, 40], r3: [728, 482, 90, 40] };
  function flowTokenTarget(L) {
    const r = S.sec.res[L];
    const below = (b) => [b[0], b[1] + b[3] / 2 + 16];
    if (r.solid == null) return null;
    if (conducts(r.solid)) return below(FL.r1);
    if (r.melt == null) return [FL.q2[0], FL.q2[1] + FL.q2[3] / 2 + (PHONE ? 16 : 26)];
    return conducts(r.melt) ? below(FL.r2) : below(FL.r3);
  }
  function drawSecretBottom() {
    const L = S.sec.cur;
    // 결과 표
    const gx = PHONE ? 16 : 24, gy = TBY, gw = PHONE ? VW - 32 : 286, rh = PHONE ? 34 : 36;
    panel(gx, gy, gw, 28 + 3 * rh + 8, 12, '#fff', '#e3dcf5');
    const cols = [gx + 12, gx + gw * 0.30, gx + gw * 0.47, gx + gw * 0.64, gx + gw * 0.84];
    T(cols[0], gy + 19, '시료', 12.5, MUTED, 'left', 800);
    ['고체', '용융', '수용액'].forEach((t, i) => T(cols[i + 1] + 14, gy + 19, t, 12.5, MUTED, 'center', 800));
    T(cols[4] + 6, gy + 19, '내 분류', 12.5, MUTED, 'center', 800);
    LET.forEach((l, i) => {
      const y = gy + 28 + i * rh;
      if (l === L) { D.roundRect(gx + 5, y, gw - 10, rh - 2, 8); ctx.fillStyle = 'rgba(139,92,246,.12)'; ctx.fill(); }
      T(cols[0], y + rh / 2 + 5, '시료 ' + l, 14, INK, 'left', 900);
      ['solid', 'melt', 'aq'].forEach((m, k) => {
        const v = S.sec.res[l][m], cx = cols[k + 1] + 14, cy = y + rh / 2;
        if (v == null) {
          const na = (m === 'aq' && S.sec.map[l] === 'metal');
          T(cx, cy + 5, '?', 15, '#b4bccb', 'center', 800);
        } else {
          D.sphere(cx, cy, 11, conducts(v) ? GOOD : '#9aa5b5', { gloss: false });
          T(cx, cy + 0.5, conducts(v) ? 'O' : 'X', 13, '#fff', 'center', 900, { baseline: 'middle' });
        }
      });
      const c = S.sec.cls[l];
      if (c) D.label(cols[4] + 6, y + rh / 2, CLS_SHORT[c], { size: fs(12), bg: '#4c1d95' });
      else T(cols[4] + 6, y + rh / 2 + 5, '—', 14, '#c3cad6', 'center', 700);
    });
    // 흐름도
    const f = FL;
    const box = (b, text, fill, stroke, tc, dashed) => {
      D.shadow(() => { D.roundRect(b[0] - b[2] / 2, b[1] - b[3] / 2, b[2], b[3], 12); ctx.fillStyle = fill; ctx.fill(); }, { blur: 5, y: 2 });
      if (dashed) ctx.setLineDash([6, 4]);
      D.roundRect(b[0] - b[2] / 2, b[1] - b[3] / 2, b[2], b[3], 12); ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      T(b[0], b[1] + 5, text, 13.5, tc, 'center', 800);
    };
    const arrowL = (x1, y1, x2, y2, label, ox, oy) => {
      D.arrow(x1, y1, x2, y2, { color: '#7d8aa0', width: 2.5, head: 9 });
      if (label) T((x1 + x2) / 2 + ox, (y1 + y2) / 2 + oy, label, 12.5, '#5b21b6', 'center', 900);
    };
    const bs = (b) => ({ l: b[0] - b[2] / 2, r: b[0] + b[2] / 2, t: b[1] - b[3] / 2, b: b[1] + b[3] / 2 });
    const q1 = bs(f.q1), q2 = bs(f.q2), r1 = bs(f.r1), r2 = bs(f.r2), r3 = bs(f.r3);
    if (PHONE) {
      arrowL(f.q1[0] - 60, q1.b, f.r1[0] + 30, r1.t, '예', -16, 4);
      arrowL(f.q1[0] + 60, q1.b, f.q2[0] - 40, q2.t, '아니오', 26, 4);
      arrowL(f.q2[0] - 70, q2.b, f.r2[0], r2.t, '예', -14, 4);
      arrowL(f.q2[0] + 60, q2.b, f.r3[0], r3.t, '아니오', 26, 4);
    } else {
      arrowL(f.q1[0], q1.b, f.r1[0], r1.t, '예', 14, 4);
      arrowL(q1.r, f.q1[1], q2.l, f.q2[1], '아니오', 0, -8);
      arrowL(f.q2[0] - 40, q2.b, f.r2[0], r2.t, '예', -14, 4);
      arrowL(f.q2[0] + 40, q2.b, f.r3[0], r3.t, '아니오', 24, 4);
    }
    box(f.q1, '고체에서 전기가 통하는가?', '#fff', '#8b5cf6', INK);
    box(f.q2, '액체(용융)에서 전기가 통하는가?', '#fff', '#8b5cf6', INK);
    [['r1', f.r1], ['r2', f.r2], ['r3', f.r3]].forEach(([k, b]) => {
      const ans = S.flow && S.flow[k];
      const tx = ans ? FLOW_OPT[ans - 1] : '?';
      box(b, tx, ans ? '#f3effd' : '#fff', ans ? (S.flowOK && S.flowOK[k] === true ? GOOD : S.flowOK && S.flowOK[k] === false ? BAD : '#7c3aed') : '#b4a3e8', ans ? INK : '#9a8bd0', !ans);
    });
    // 토큰: 선택한 시료의 시험 결과를 따라 움직여요
    const tg = flowTokenTarget(L), tk = S.sec.tok;
    if (tg) {
      D.sphere(tk.x, tk.y, 13, PUR, { text: L, textScale: 1.0, shadow: true });
    }
  }
  const FLOW_OPT = ['금속 결합 물질', '이온 결합 물질', '분자 물질'];
  const FLOW_ANS = { r1: 0, r2: 1, r3: 2 };
  function stepSecret(dt) {
    const tg = flowTokenTarget(S.sec.cur), tk = S.sec.tok;
    if (tg) {
      if (tk.x === 0) { tk.x = FL.q1[0]; tk.y = FL.q1[1] - (PHONE ? 34 : 28); }
      tk.x = approach(tk.x, tg[0], dt, 4); tk.y = approach(tk.y, tg[1], dt, 4);
    } else { tk.x = 0; tk.y = 0; }
  }

  /* ---------- 화면 전환 · UI ---------- */
  const SCENE_LABEL = { lab: '🔌 전기 전도성 시험', model: '🔬 전기장 속 입자 모형', secret: '🕵️ 비밀 시료 분류' };
  function setScene(sc) {
    if (S.scene !== sc) {
      S.fade = 1; fx.clear(); hintOff();
      S.verdict = null;
      if (sc === 'lab' || sc === 'secret') setWant(null);
      if (sc === 'model') { S.field = false; S.fieldA = 0; }
    }
    S.scene = sc;
    $('#tbLabel').textContent = SCENE_LABEL[sc];
    updateUI();
  }
  function hintOff() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  const setHidden = (id, hide) => { const e = $(id); if (e) e.hidden = !!hide; };
  function updateUI() {
    const L = gameLevel(), free = isFree(), sc = S.scene, gate = S.gate;
    const nog = !gate;
    setHidden('#cs-solids', !(sc === 'lab' && nog && (free || L === 0 || L >= 2)));
    setHidden('#cs-liquids', !(sc === 'lab' && nog && (free || L >= 1)));
    setHidden('#cs-table', !(sc === 'lab' && gate === 'tbl'));
    setHidden('#cs-model', !(sc === 'model' && gate !== 'carrier'));
    setHidden('#cs-carrier', !(sc === 'model' && gate === 'carrier'));
    setHidden('#cs-secret', !(sc === 'secret' && gate !== 'flow'));
    setHidden('#cs-flow', !(sc === 'secret' && gate === 'flow'));
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    // 시료 버튼 상태
    $$('#solidBtns .opt, #liquidBtns .opt').forEach((b) => {
      const id = b.dataset.id; b.classList.toggle('on', !!(S.st.want && S.st.want.key === id)); b.classList.toggle('done', !!S.rec[id]);
    });
    $$('#modelBtns .opt').forEach((b) => { b.classList.toggle('on', b.dataset.id === M.id); b.classList.toggle('done', (S.obs[b.dataset.id] || 0) >= 2); });
    const fb = $('#fieldBtn'); fb.textContent = S.field ? '⚡ 전기장 끄기' : '⚡ 전기장 켜기'; fb.classList.toggle('sw-on', S.field);
    const db = $('#dissBtn'); db.hidden = mdl().type !== 'hcl'; db.disabled = M.diss; db.textContent = M.diss ? '💧 녹았어요' : '💧 물에 녹이기';
    // 비밀 시료
    $$('#secBtns .opt').forEach((b) => { b.classList.toggle('on', b.dataset.l === S.sec.cur); });
    const L2 = S.sec.cur;
    $$('#testBtns .opt').forEach((b) => {
      const m = b.dataset.m; b.classList.toggle('done', secTested(L2, m));
      b.classList.toggle('on', !!(S.st.want && S.st.want.secret && S.st.want.letter === L2 && S.st.want.mode === m));
    });
    $$('#clsBtns .opt').forEach((b) => { b.classList.toggle('on', S.sec.cls[L2] === b.dataset.c); });
    const note = $('#ctlNote');
    let nt = '';
    if (sc === 'lab') nt = (L === 0 && !free) ? '시료를 하나씩 눌러 시험해요. 전구가 켜지고 전류계 바늘이 움직이면 전기가 통하는 거예요.' : (L === 1 && !free && !gate) ? '가열 장치와 수은은 안전 수칙을 지켜야 해서 모의 조작으로 시험해요. 🥽' : '';
    if (sc === 'model') nt = gate === 'carrier' ? '' : '시료를 고르고 전기장을 켜서 입자가 어떻게 움직이는지 관찰해요.';
    if (sc === 'secret') nt = gate === 'flow' ? '' : '시료를 고르고 시험한 뒤, 결과로 알맞은 종류를 골라요. (금속은 물에 녹지 않아 수용액 시험이 없어요)';
    note.textContent = nt; note.hidden = !nt;
  }

  /* ---------- 폼 도우미 ---------- */
  function makeSelects(box, defs) {
    box.innerHTML = '';
    return defs.map((d) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      const q = document.createElement('div'); q.className = 'q'; q.innerHTML = d.q; row.appendChild(q);
      const s = document.createElement('select'); s.className = 'sel-in'; s.setAttribute('aria-label', d.aria || d.q.replace(/<[^>]+>/g, ''));
      s.appendChild(new Option('— 고르기 —', ''));
      d.opts.forEach((t, k) => s.appendChild(new Option(t, String(k + 1))));
      s.addEventListener('change', () => { Sound.tick(); s.classList.remove('ok', 'bad'); d.ok = null; });
      row.appendChild(s); box.appendChild(row); return s;
    });
  }
  function checkSelects(defs, sels, msg) {
    if (sels.some((s) => !s.value)) return '아직 고르지 않은 칸이 ' + sels.filter((s) => !s.value).length + '개 있어요.';
    let bad = 0;
    defs.forEach((d, i) => {
      const ok = +sels[i].value - 1 === d.ans;
      if (!ok) bad++;
      if (!ok && d.ok !== false) { sels[i].classList.remove('ok', 'bad'); void sels[i].offsetWidth; sels[i].classList.add('bad'); }
      if (ok) { sels[i].classList.remove('bad'); sels[i].classList.add('ok'); }
      d.ok = ok;
    });
    return bad ? msg : true;
  }
  function resetSelects(sels, defs) { sels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); defs.forEach((d) => { d.ok = null; }); }

  const CARRIER_DEFS = [
    { q: '🟤 구리(Cu) 조각', opts: ['자유 전자', '이온', '없음 (움직이는 전하가 없어요)'], ans: 0 },
    { q: '🔥 용융 NaCl', opts: ['자유 전자', '이온', '없음 (움직이는 전하가 없어요)'], ans: 1 },
    { q: '🍬 설탕 수용액', opts: ['자유 전자', '이온', '없음 (움직이는 전하가 없어요)'], ans: 2 },
  ];
  const carrierSel = makeSelects($('#carrierSel'), CARRIER_DEFS);
  const FLOW_DEFS = [
    { q: '① 고체에서 전기가 <b>통해요</b> →', opts: FLOW_OPT, ans: 0 },
    { q: '② 고체는 안 통하고 액체(용융)에서 <b>통해요</b> →', opts: FLOW_OPT, ans: 1 },
    { q: '③ 고체도 액체(용융)도 <b>안 통해요</b> →', opts: FLOW_OPT, ans: 2 },
  ];
  const flowSel = makeSelects($('#flowSel'), FLOW_DEFS);
  ['r1', 'r2', 'r3'].forEach((k, i) => { flowSel[i].addEventListener('change', () => { S.flow[k] = flowSel[i].value ? +flowSel[i].value : 0; S.flowOK[k] = null; }); });

  // 정리표 (상태별 O/X)
  const TBL_ROWS = [
    { label: '금속<br>(Cu · Hg)', cells: [['t', 'cu'], ['t', 'hg'], null] },
    { label: '염화 나트륨<br>(NaCl)', cells: [['t', 'nacl_s'], ['t', 'nacl_l'], ['t', 'nacl_aq']] },
    { label: '설탕', cells: [['t', 'sugar_s'], null, ['t', 'sugar_aq']] },
  ];
  const tblSels = [];
  (function buildTbl() {
    const tb = $('#tblSel'); tb.innerHTML = '<thead><tr><th></th><th>고체</th><th>액체(용융)</th><th>수용액</th></tr></thead>';
    const body = document.createElement('tbody');
    TBL_ROWS.forEach((r, ri) => {
      const tr = document.createElement('tr'); const th = document.createElement('th'); th.innerHTML = r.label; tr.appendChild(th);
      r.cells.forEach((c, ci) => {
        const td = document.createElement('td');
        if (!c) td.textContent = '—';
        else {
          const s = document.createElement('select'); s.setAttribute('aria-label', r.label.replace(/<[^>]+>/g, ' ') + ' ' + ['고체', '액체', '수용액'][ci]);
          s.appendChild(new Option('?', '')); s.appendChild(new Option('O', 'O')); s.appendChild(new Option('X', 'X'));
          s.addEventListener('change', () => { Sound.tick(); s.classList.remove('ok', 'bad'); s._ok = null; });
          s._ans = conducts(BY[c[1]].I) ? 'O' : 'X';
          td.appendChild(s); tblSels.push(s);
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    tb.appendChild(body);
  })();
  function checkTable() {
    if (tblSels.some((s) => !s.value)) return '아직 고르지 않은 칸이 ' + tblSels.filter((s) => !s.value).length + '개 있어요.';
    let bad = 0;
    tblSels.forEach((s) => {
      const ok = s.value === s._ans;
      if (!ok) bad++;
      if (!ok && s._ok !== false) { s.classList.remove('ok', 'bad'); void s.offsetWidth; s.classList.add('bad'); }
      if (ok) { s.classList.remove('bad'); s.classList.add('ok'); }
      s._ok = ok;
    });
    return bad ? '빨간 칸을 다시 골라 보세요. 아래 결과 표(전류 · 전도 O/X)를 확인해요.' : true;
  }
  function resetTable() { tblSels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); s._ok = null; }); }

  // 시료 버튼
  function buildChips(box, list, handler) {
    box.innerHTML = '';
    list.forEach((s) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.id = s.id; b.textContent = s.label || s.short;
      b.addEventListener('click', () => handler(s.id)); box.appendChild(b);
    });
  }
  buildChips($('#solidBtns'), SOL, (id) => pick(id));
  buildChips($('#liquidBtns'), LIQ, (id) => pick(id));
  buildChips($('#modelBtns'), MODELS, (id) => { buildModel(id); Sound.click(); updateUI(); });
  (function buildSecretBtns() {
    const sb = $('#secBtns'); sb.innerHTML = '';
    LET.forEach((l) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.l = l; b.textContent = '시료 ' + l; b.addEventListener('click', () => { S.sec.cur = l; setWant(null); Sound.click(); updateUI(); }); sb.appendChild(b); });
    const tb = $('#testBtns'); tb.innerHTML = '';
    [['solid', '고체'], ['melt', '용융(가열)'], ['aq', '수용액']].forEach(([m, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.m = m; b.textContent = t; b.addEventListener('click', () => testSecret(S.sec.cur, m)); tb.appendChild(b); });
    const cb = $('#clsBtns'); cb.innerHTML = '';
    CLS_KEYS.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.c = c; b.textContent = CLS_SHORT[c]; b.addEventListener('click', () => classify(S.sec.cur, c)); cb.appendChild(b); });
  })();
  function testSecret(L, mode) {
    S.sec.cur = L;
    if (mode === 'aq' && S.sec.map[L] === 'metal') {
      S.sec.res[L].aq = null;
      showHint('금속 조각은 물에 녹지 않아서 수용액 시험은 할 수 없어요. 고체 · 용융 시험으로 판단해요.', 4600);
      Sound.fail(); return;
    }
    if (mode === 'melt' && !S.safe) {
      modal({ icon: '🥽', title: '안전 수칙', html: '가열 장치 근처에서는 <b>보안경 · 실험복 · 내열 장갑</b>을 착용하고, 가열한 시료는 식을 때까지 만지지 않아요. 여기서는 모의 조작이에요.', buttons: [{ label: '취소' }, { label: '확인했어요', primary: true, onClick: () => { S.safe = true; testSecret(L, mode); } }] });
      return;
    }
    setWant(secretItem(L, mode)); Sound.click(); updateUI();
  }
  function classify(L, c) { S.sec.cls[L] = c; Sound.click(); updateUI(); }
  $('#fieldBtn').addEventListener('click', () => { S.field = !S.field; Sound.click(); updateUI(); });
  $('#dissBtn').addEventListener('click', () => dissolve());
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.scene === 'model') { S.field = false; buildModel(M.id); }
    else { setWant(null); S.verdict = null; }
    updateUI();
  });

  /* ---------- 읽기 값 ---------- */
  function readouts() {
    if (S.scene === 'model') {
      const m = mdl(), obs = (S.obs[M.id] || 0) >= 1 && S.field;
      setRO(1, '시료', m.name); setRO(2, '전기장', S.field ? '켜짐 (+극 → −극)' : '꺼짐');
      setRO(3, '움직이는 전하', obs ? modelCarrierText() : '—');
      return;
    }
    const it = S.st.item;
    if (S.scene === 'secret') {
      const L = S.sec.cur, r = S.sec.res[L];
      setRO(1, '시료', '시료 ' + L + (it && it.secret ? ' · ' + STATE[it.mode] : ''));
      setRO(2, '전류계', Math.round(S.amp) + ' mA');
      setRO(3, '시험 결과', ['solid', 'melt', 'aq'].map((m, i) => ['고체', '용융', '수용액'][i] + ' ' + (r[m] == null ? '?' : conducts(r[m]) ? 'O' : 'X')).join(' · '));
      return;
    }
    setRO(1, '시료', it ? it.short + ' (' + STATE[it.form] + ')' : '시료를 골라 주세요');
    setRO(2, '전류계', Math.round(S.amp) + ' mA');
    setRO(3, '전구', bright(S.glow * IMAX));
  }

  /* =========================================================
     미션
     ========================================================= */
  const pend = (s) => '<span style="color:#9a8bd0">' + s + '</span>';
  const compactChips = (list) => list.map((s) => mark(!!S.rec[s.id]) + ' ' + s.short).join(' &nbsp; ');
  const tblFig = (rows) => '<svg viewBox="0 0 300 110" width="300" role="img" aria-label="시료 P의 시험 결과 표" style="max-width:100%"><rect width="300" height="110" rx="10" fill="#f3f0fb"/>' + rows + '</svg>';
  const figP = tblFig(
    '<text x="150" y="24" text-anchor="middle" font-size="14" font-weight="800" fill="#4c1d95">시료 P의 시험 결과</text>' +
    '<g font-size="14" font-weight="800" fill="#1b2333" text-anchor="middle"><text x="60" y="52">고체</text><text x="150" y="52">액체(용융)</text><text x="240" y="52">수용액</text>' +
    '<circle cx="60" cy="80" r="15" fill="#9aa5b5"/><text x="60" y="85" fill="#fff">X</text><circle cx="150" cy="80" r="15" fill="#9ca3af"/><text x="150" y="85" fill="#fff">?</text><circle cx="240" cy="80" r="15" fill="#14a058"/><text x="240" y="85" fill="#fff">O</text></g></svg>');

  const levels = [
    {
      title: '고체 시료의 전기 전도성', short: '고체 시험', icon: '💡', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 소금이 고체일 때는 전기가 안 통하고 물에 녹이면 통하는 까닭은? 금속은 왜 언제나 통할까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 이온 결합 물질은 고체에서는 전기가 통하지 않고 수용액에서는 통하며, 물이나 설탕 같은 분자 물질은 통하지 않는다고 배웠어요. 금속은 <b>자유 전자</b> 덕분에 전기가 통했죠.</div>' +
        '<p>이번 차시에서는 <b>전기 전도성</b>이라는 실험 결과 하나로 결합의 종류를 알아내요. 전지 · 전구 · 전류계 회로에 시료를 끼우고 전구가 켜지는지 살펴봐요. 먼저 <b>고체 시료 6가지</b>부터 시험해요. (흑연 · 다이아몬드 같은 공유 결정은 다루지 않아요.)</p>',
      features: ['lab'],
      setup() { S.gate = ''; setWant(null); S.rec = {}; S.order = []; S.flash = {}; setScene('lab'); updateUI(); },
      recap: '전류가 흐르려면 움직일 수 있는 전하(자유 전자나 이온)가 필요해요. 고체에서는 금속만 전기가 통하고, 이온 결합 물질과 분자 물질은 통하지 않아요.',
      summary: '<ul><li>전류가 흐르려면 <b>움직일 수 있는 전하</b>(자유 전자 · 이온)가 있어야 해요.</li><li>고체에서 전기가 통하는 것은 <b>금속</b>(Cu, Al)뿐이었어요. NaCl · CaCl₂ 결정과 설탕 · 파라핀은 통하지 않았어요.</li><li>고체 NaCl에도 Na⁺와 Cl⁻는 있지만 <b>제자리에 고정</b>되어 움직일 수 없어서 전기가 통하지 않아요.</li></ul>',
      missions: [
        {
          title: '고체 시료 6가지 시험하기',
          goal: '고체 시료 <b>6가지를 모두</b> 회로에 연결해 전구가 켜지는지 확인하세요.',
          hint: '시료 버튼을 하나씩 눌러요. 시료가 연결되고 2~3초 뒤에 결과 표에 기록돼요. 버튼 옆에 ✓가 생기면 시험 완료예요.',
          setup() { S.gate = ''; setScene('lab'); updateUI(); },
          check: () => SOL.every((s) => S.rec[s.id]),
          hold: 0.4,
          status: () => compactChips(SOL),
          explain: 'Cu와 Al 호일에서만 전구가 켜졌어요. 이온 결합 물질(NaCl · CaCl₂), 설탕, 파라핀은 <b>고체 상태에서 전기가 통하지 않았어요</b>.',
        },
        {
          type: 'quiz', title: '고체 NaCl이 전기를 통하지 않는 까닭',
          goal: '고체 NaCl 결정에서 전구가 켜지지 않는 까닭으로 가장 알맞은 것은?',
          setup() { S.gate = ''; setScene('lab'); updateUI(); },
          choices: ['NaCl에는 이온이 전혀 없어서', 'Na⁺와 Cl⁻는 있지만 제자리에 고정되어 움직일 수 없어서', 'NaCl은 전자가 하나도 없어서', 'NaCl은 분자라서 전하를 띠지 않아서'],
          answer: 1,
          feedback: ['NaCl 결정은 Na⁺와 Cl⁻로 이루어져 있어요. 이온은 있어요!', '', '전자는 있어요. 문제는 전하를 나르는 입자가 움직이지 못한다는 거예요.', 'NaCl은 분자가 아니라 이온으로 이루어진 물질이에요. 전기적으로 중성이지만 이온은 전하를 띠고 있어요.'],
          explain: '고체 NaCl에서는 Na⁺와 Cl⁻가 규칙적으로 배열되어 <b>제자리에서 진동만</b> 해요. 전류가 흐르려면 전하가 움직여야 하는데 움직이지 못해서 전기가 통하지 않아요.',
        },
      ],
    },
    {
      title: '액체와 수용액의 전기 전도성', short: '액체·용액', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 고체는 금속만 전기가 통했어요. 같은 물질을 <b>액체나 수용액</b> 상태로 바꾸면 어떻게 될까요?</div>' +
        '<p>시료 <b>8가지</b>를 시험해 표를 채워 봐요. 용융 NaCl은 고온 가열이 필요하고 수은은 독성이 있어서 <b>안전 수칙</b>을 확인한 뒤 모의 조작으로 시험해요. 🥽 시험이 끝나면 결과를 <b>상태별 O/X 표</b>로 정리해요.</p>',
      features: [],
      setup() { S.gate = ''; setWant(null); LIQ.forEach((x) => { delete S.rec[x.id]; delete S.flash[x.id]; }); S.order = S.order.filter((k) => !(BY[k] && BY[k].grp === 'liq')); setScene('lab'); resetTable(); updateUI(); },
      recap: '이온 결합 물질은 고체에서는 안 통하지만 액체(용융)와 수용액에서는 통해요. 금속은 고체와 액체 모두 통하고, 설탕처럼 중성 분자로 된 물질은 물에 녹여도 통하지 않아요.',
      summary: '<table class="mini"><tr><th>물질</th><th>고체</th><th>액체(용융)</th><th>수용액</th></tr><tr><td>금속 (Cu · Hg)</td><td>O</td><td>O</td><td>—</td></tr><tr><td>NaCl</td><td>X</td><td>O</td><td>O</td></tr><tr><td>설탕</td><td>X</td><td>—</td><td>X</td></tr></table><ul><li>CaCl₂ 수용액도 O, <b>HCl 수용액</b>도 O예요. 에탄올과 증류수는 X예요.</li><li>이온 결합 물질: 고체 X, 용융 O, 수용액 O. 금속: 고체 · 액체 모두 O. 설탕: 모든 상태에서 X.</li></ul>',
      missions: [
        {
          title: '액체 · 수용액 8가지 시험하기',
          goal: '액체와 수용액 시료 <b>8가지를 모두</b> 시험해 결과 표를 채우세요.',
          hint: '용융 NaCl과 수은은 안전 수칙을 확인한 뒤 모의로 시험해요. 용융 NaCl은 가열 때문에 2~3초가 걸려요.',
          setup() { S.gate = ''; setScene('lab'); updateUI(); },
          check: () => LIQ.every((s) => S.rec[s.id]),
          hold: 0.4,
          status: () => compactChips(LIQ),
          explain: '용융 NaCl, 수은, NaCl · CaCl₂ · HCl 수용액에서 전구가 켜졌어요. 에탄올, 증류수, 설탕 수용액은 켜지지 않았어요.',
        },
        {
          title: '상태별 O / X 표 완성하기', manual: true,
          goal: '금속, NaCl, 설탕이 <b>고체 · 액체 · 수용액</b>일 때 전기가 통하는지 표를 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '아래 결과 표(전류 · 전도 O/X)를 보면서 채워요. — 칸은 이번 실험에서 시험하지 않았어요.',
          setup() { S.gate = 'tbl'; setScene('lab'); resetTable(); updateUI(); },
          check: () => checkTable(),
          status: () => '고른 칸 ' + tblSels.filter((s) => s.value).length + ' / ' + tblSels.length,
          explain: '금속은 고체 · 액체 모두 <b>O</b>예요. NaCl은 고체 <b>X</b>, 용융 <b>O</b>, 수용액 <b>O</b>이고, 설탕은 고체와 수용액 모두 <b>X</b>예요. 이온 결합 물질의 전도성은 <b>상태</b>에 따라 달라져요.',
        },
        {
          type: 'quiz', title: '설탕물은 왜 전기가 통하지 않을까?',
          goal: '설탕을 물에 녹여도 전구가 켜지지 않았어요. 그 까닭은?',
          setup() { S.gate = ''; setScene('lab'); updateUI(); },
          choices: ['설탕이 물에 녹지 않아서', '설탕이 물에 녹아도 이온으로 나뉘지 않고 중성인 분자 그대로 있어서', '설탕 분자가 너무 커서 전류가 막혀서', '물이 전기를 통하지 못하게 막아서'],
          answer: 1,
          feedback: ['설탕은 물에 잘 녹아요. 녹았는데도 전기가 통하지 않은 까닭을 찾아야 해요.', '', '분자의 크기보다 전하를 나르는 입자가 있는지가 중요해요.', '물 자체가 전류를 막는 것이 아니에요. 설탕 수용액에 전하를 나르는 입자가 없다는 것이 핵심이에요.'],
          explain: '설탕은 물에 녹아도 <b>중성인 분자 그대로</b> 흩어져요. 전하를 띤 입자(이온)가 생기지 않으니 전류를 나를 입자가 없어요. NaCl은 물에 녹으면 Na⁺와 Cl⁻로 나뉘어 이동할 수 있어서 전기가 통해요.',
        },
      ],
    },
    {
      title: '전하 운반자: 전기를 나르는 입자', short: '전하 운반자', icon: '🔬', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 NaCl이 고체에서는 안 통하고 용융 · 수용액에서는 통했어요. 시료 속 <b>입자</b>가 어떻게 움직이는지 눈으로 확인해 봐요.</div>' +
        '<p>시료 양쪽에 (+)극과 (−)극을 연결하면 <b>전기장</b>이 생겨요. 전기장을 켜고 전하를 띤 입자가 어느 쪽으로 움직이는지 관찰해요. HCl은 분자 물질인데 수용액이 전기를 통하는 까닭도 알아봐요.</p>',
      features: ['model'],
      setup() { S.gate = ''; S.obs = {}; setScene('model'); S.field = false; buildModel(M.id); updateUI(); },
      recap: '금속에서는 자유 전자가, 용융 · 수용액 상태의 이온 결합 물질에서는 이온이 전하를 날라요. 고체 NaCl과 설탕 수용액에는 움직이는 전하가 없어요. HCl은 물과 만나 H⁺와 Cl⁻로 나뉘어 전류가 흘러요.',
      summary: '<ul><li><b>금속</b>: 양이온은 제자리, <b>자유 전자</b>가 (+)극 쪽으로 이동해요.</li><li><b>이온 결합 물질</b>: 고체에서는 이온이 고정, <b>용융 · 수용액</b>에서는 양이온이 (−)극, 음이온이 (+)극 쪽으로 이동해요.</li><li><b>설탕</b>: 중성 분자라 이동하는 전하가 없어요.</li><li><b>HCl</b>: 분자 물질이지만 물 분자와 만나 H⁺와 Cl⁻로 나뉘고(이온화) 이 이온들이 전하를 날라요. (실제로 H⁺는 물 분자와 결합한 H₃O⁺로 존재해요.)</li></ul>',
      missions: [
        {
          title: '전기장 속 입자 관찰하기',
          goal: '전기장을 켜고 <b>구리 · 고체 NaCl · 용융 NaCl · 설탕 수용액</b>을 각각 2초 이상 지켜보세요.',
          hint: '시료 버튼을 누른 뒤 ⚡ 전기장 켜기를 눌러요. 입자가 어느 쪽으로 움직이는지(또는 움직이지 않는지) 봐요. 아래 막대가 가득 차면 완료예요.',
          setup() { S.gate = ''; setScene('model'); updateUI(); },
          check: () => ['cu', 'nacl_s', 'nacl_l', 'sugar_aq'].every((id) => (S.obs[id] || 0) >= 2),
          hold: 0.3,
          status: () => ['cu', 'nacl_s', 'nacl_l', 'sugar_aq'].map((id) => mark((S.obs[id] || 0) >= 2) + ' ' + MBY[id].label).join(' &nbsp; '),
          explain: '구리에서는 <b>자유 전자</b>가 (+)극 쪽으로, 용융 NaCl에서는 <b>Na⁺가 (−)극, Cl⁻가 (+)극</b> 쪽으로 움직였어요. 고체 NaCl의 이온은 제자리에서 떨기만 하고, 설탕 분자는 전하가 없어서 전기장의 영향을 받지 않았어요.',
        },
        {
          title: '전하 운반자 이름 붙이기', manual: true,
          goal: '세 시료에서 전기를 나르는 입자를 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '구리는 금속, 용융 NaCl은 이온으로 이루어진 물질, 설탕 수용액은 중성 분자예요. 입자 모형에서 움직이는 전하를 떠올려요.',
          setup() { S.gate = 'carrier'; setScene('model'); resetSelects(carrierSel, CARRIER_DEFS); updateUI(); },
          check: () => checkSelects(CARRIER_DEFS, carrierSel, '빨간 칸을 다시 골라 보세요. 전기장을 켰을 때 실제로 움직이는 전하가 무엇이었나요?'),
          status: () => '고른 칸 ' + carrierSel.filter((s) => s.value).length + ' / ' + carrierSel.length,
          explain: '구리는 <b>자유 전자</b>, 용융 NaCl은 <b>이온</b>(Na⁺, Cl⁻)이 전하를 날라요. 설탕 수용액은 중성 분자뿐이라 나를 전하가 <b>없어요</b>.',
        },
        {
          type: 'quiz', title: 'HCl 수용액은 왜 전기가 통할까?',
          goal: 'HCl은 공유 결합으로 이루어진 분자 물질인데 수용액은 전기를 통해요. 알맞은 설명은?',
          setup() { S.gate = ''; setScene('model'); buildModel('hcl_aq'); updateUI(); showHint('💧 물에 녹이기를 눌러 HCl 분자에게 무슨 일이 생기는지 보세요', 5200); },
          choices: ['HCl이 사실은 이온 결합 물질이라서', 'HCl 분자가 물과 만나 H⁺와 Cl⁻로 나뉘고, 이 이온들이 전하를 나르기 때문에', 'HCl 분자가 그대로 전기장 속에서 이동하기 때문에', '물 분자 자체가 전기를 잘 통하기 때문에'],
          answer: 1,
          feedback: ['HCl은 비금속 원소끼리 전자쌍을 공유한 공유 결합 물질이에요. 이온 결합 물질이 아니에요.', '', 'HCl 분자는 전기적으로 중성이라 전기장 속에서도 방향을 갖고 이동하지 않아요.', '증류수는 전구가 켜지지 않았어요. 물 분자만으로는 전하를 나르지 못해요.'],
          explain: 'HCl은 공유 결합 물질이지만 <b>물 분자와 만나면 H⁺와 Cl⁻로 나뉘어</b>(이온화) 전하를 나르는 이온이 생겨요. 그래서 <b>수용액에서 전기가 통해요</b>. 같은 분자 물질이라도 물과 반응해 이온이 생기는지에 따라 달라요.',
        },
      ],
    },
    {
      title: '전도성으로 결합 추론하기', short: '결합 추론', icon: '🕵️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전기를 나르는 입자(자유 전자 / 이온)가 시료마다 다르다는 것을 알았어요. 이제 거꾸로, <b>전도성 결과로 결합의 종류를 추론</b>해 봐요.</div>' +
        '<p>정체를 모르는 <b>비밀 시료 A · B · C</b>를 고체 · 용융 · 수용액 상태로 시험해 금속 결합 물질, 이온 결합 물질, 분자 물질로 분류해요. 시험 결과에 따라 따라갈 <b>흐름도</b>도 완성해요. 🥽 가열(용융) 시험은 안전 수칙을 지켜요.</p>',
      features: ['secret'],
      setup() { S.gate = ''; setWant(null); resetSecret(); setScene('secret'); updateUI(); },
      recap: '고체에서 전기가 통하면 금속, 고체는 안 통하고 용융 상태에서 통하면 이온 결합 물질, 모두 안 통하면 분자 물질이에요. 수용액 결과만으로는 이온 결합 물질과 HCl 같은 분자 물질을 구별할 수 없어요.',
      summary: '<ul><li><b>고체에서 O</b> → 금속 결합 물질</li><li><b>고체 X, 액체(용융) O</b> → 이온 결합 물질</li><li><b>고체 X, 액체(용융) X</b> → 분자 물질 (공유 결합)</li><li>수용액이 전기를 통해도 이온 결합 물질이라고 단정할 수 없어요. <b>HCl</b> 같은 분자 물질도 물과 만나 이온이 되기 때문에, 액체(용융) 상태의 시험이 필요해요.</li></ul>',
      missions: [
        {
          title: '비밀 시료 3종 분류하기',
          goal: '시료 <b>A · B · C</b>를 시험하고, 금속 결합 / 이온 결합 / 분자 물질 중 하나로 분류하세요.',
          hint: '먼저 고체 시험을 해요. 고체에서 안 통하면 용융(가열) 시험도 해요. 금속은 물에 녹지 않아서 수용액 시험이 없어요.',
          setup() { S.gate = ''; setScene('secret'); updateUI(); },
          check: () => LET.every(secOK),
          hold: 0.5,
          status: () => LET.map((l) => {
            const c = S.sec.cls[l], ok = secOK(l);
            const bad = c && S.sec.cls[l] !== S.sec.map[l];
            return (ok ? '✅' : bad ? '❌' : '⬜') + ' 시료 ' + l + (c ? ' → ' + CLS_SHORT[c] : '') + (c && !bad && !ok ? ' (시험 더 필요)' : '') + (bad ? ' (다시 확인)' : '');
          }).join(' &nbsp; '),
          explain: '시료의 전도성 결과로 결합의 종류를 정했어요. <b>고체에서 통하면 금속</b>, <b>고체 X · 용융 O면 이온 결합 물질</b>, <b>모두 X면 분자 물질</b>이에요.',
        },
        {
          title: '흐름도 완성하기', manual: true,
          goal: '전도성 시험 결과에 따라 결합의 종류를 정하는 <b>흐름도의 빈칸</b>을 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '시료 토큰이 흐름도를 따라 움직이는 모습을 떠올려요. 고체에서 통하면 왼쪽(예), 아니면 오른쪽(아니오) 질문으로 가요.',
          setup() { S.gate = 'flow'; setScene('secret'); S.flow = {}; S.flowOK = {}; resetSelects(flowSel, FLOW_DEFS); updateUI(); },
          check: () => {
            const r = checkSelects(FLOW_DEFS, flowSel, '빨간 칸을 다시 골라 보세요. 비밀 시료에서 어떤 결과가 나왔을 때 어떤 종류였는지 떠올려요.');
            ['r1', 'r2', 'r3'].forEach((k, i) => { S.flowOK[k] = FLOW_DEFS[i].ok === true ? true : FLOW_DEFS[i].ok === false ? false : null; });
            return r;
          },
          status: () => '고른 칸 ' + flowSel.filter((s) => s.value).length + ' / ' + flowSel.length,
          explain: '<b>고체에서 O → 금속 결합 물질</b>, 고체 X이고 <b>액체(용융)에서 O → 이온 결합 물질</b>, 둘 다 X → <b>분자 물질</b>이에요. 용융 상태 시험이 이온 결합 물질과 분자 물질을 가르는 열쇠예요.',
        },
        {
          type: 'quiz', title: '수용액 결과만 보고 단정할 수 있을까?', figure: figP,
          goal: '시료 P는 고체에서 전기가 통하지 않고, 수용액에서는 통했어요. 액체(용융) 상태는 시험하지 않았어요. <b>P는 이온 결합 물질이라고 단정할 수 있을까요?</b>',
          setup() { S.gate = ''; setScene('secret'); updateUI(); },
          choices: ['네, 수용액에서 전기가 통하면 항상 이온 결합 물질이에요', '아니요, HCl 같은 분자 물질도 물과 만나 이온이 되어 수용액이 통해요. 액체(용융) 시험이 더 필요해요', '아니요, 고체에서 안 통하면 반드시 분자 물질이에요', '네, 금속은 수용액에서도 전기가 통하기 때문이에요'],
          answer: 1,
          feedback: ['HCl 수용액을 떠올려 봐요. 분자 물질인데도 수용액에서 전기가 통했어요.', '', '이온 결합 물질도 고체에서는 전기가 통하지 않았어요(고체 NaCl). 고체 결과만으로는 분자 물질이라고 할 수 없어요.', '금속은 대부분 물에 녹지 않아 수용액으로 시험하지 않아요. 문제의 시료 P는 고체에서 전기가 통하지 않았어요.'],
          explain: '수용액이 전기를 통하는 물질에는 <b>이온 결합 물질</b>도 있지만 물과 반응해 이온이 생기는 <b>분자 물질(HCl)</b>도 있어요. <b>액체(용융) 상태</b>에서 전기가 통하면 이온 결합 물질, 통하지 않으면 분자 물질이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hc-conductivity', mount: '#game', badge: '전도성 탐정', homeHref: '../../index.html#hc',
    featureLabels: { lab: '🔌 전지 · 전구 · 전류계 회로와 결과 표', model: '🔬 전기장 속 입자 모형', secret: '🕵️ 비밀 시료 · 분류 흐름도' },
    onFeatures() { updateUI(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  buildModel('cu');
  updateUI();
  function update(dt) {
    S.t += dt;
    stationStep(dt);
    if (S.scene === 'model') stepModel(dt); else if (S.scene === 'secret') stepSecret(dt);
    fx.update(dt);
  }
  let lastFree = false, lastLevel = -1;
  SciSim.loop((dt) => {
    if (game && (game.free !== lastFree || game.level !== lastLevel)) { lastFree = game.free; lastLevel = game.level; updateUI(); }
    update(dt);
    view.apply();
    if (S.scene === 'model') drawModel();
    else {
      const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#f7f4fe'); g.addColorStop(1, '#ece7f9'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      drawCircuit();
      if (S.scene === 'lab') drawLabBottom(); else drawSecretBottom();
    }
    fx.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, M, SMP, BY, TRUTH, VW, VH, MG, FL, get game() { return game; },
    pick, setScene, buildModel, dissolve, testSecret, classify, secOK, updateUI, CARRIER_DEFS, FLOW_DEFS, carrierSel, flowSel, tblSels,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) update(0.02); },
    setField(v) { S.field = !!v; updateUI(); },
  };
})();
