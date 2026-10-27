/* =========================================================
   전자기와 양자 Ⅱ. 빛과 정보 통신 - 편광과 디스플레이 (단원 4차시)
   성취기준 [12전자02-03] 편광의 원리를 이해하고, 이를 활용한 디지털 정보 기술의 사례를 조사할 수 있다.
   ① 관찰: 편광판 (횡파 줄 비유, 두 장·세 장 겹침, 투과량은 정성적으로)
   ② 실험: 편광 만들기 (반사·산란이 만드는 편광, 편광 선글라스와 사진 필터)
   ③ 탐구: 디스플레이 조사 (센서 + 편광판으로 모의 기기 5종의 투과량 측정)
   ④ 적용: 정보 기술 (LCD 한 픽셀, 3D 극장 안경, 편광 다중화)
   말뤼스 법칙 식(cos²θ), 브루스터 각 계산, 원편광 수식, 액정 이론은 다루지 않아요. (막대·화살표는 정성 그림이에요.)
   ========================================================= */
(function () {
  'use strict';
  const PH0 = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PH0 ? 480 : 800, VH = PH0 ? 680 : 560;
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
      if (ctx.measureText(t).width > maxW && line) {
        if (/[.,;:!?)%]/.test(ch)) { line = t; continue; }                       // 문장부호가 줄 맨 앞에 오지 않게
        const m = /[A-Za-z0-9_.(]+$/.exec(line);                                  // 숫자·영문 덩어리(예: 5.0)는 쪼개지 않기
        if (m && m.index > 0 && /[A-Za-z0-9_]/.test(ch)) { out.push(line.slice(0, m.index)); line = m[0] + ch; }
        else { out.push(line); line = ch.trim() === '' ? '' : ch; }
      } else line = t;
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

  /* ---------- 상수·모형 (화면의 숫자와 모두 같은 값) ---------- */
  const cosD = (d) => Math.cos(d * rad), sinD = (d) => Math.sin(d * rad);
  const cos2 = (d) => Math.pow(cosD(d), 2), sin2 = (d) => Math.pow(sinD(d), 2);
  const MA = PHONE ? { x: 8, y: 8, w: 464, h: 520 } : { x: 12, y: 12, w: 776, h: 414 };
  const BOT = PHONE ? { x: 8, y: 536, w: 464, h: 136 } : { x: 12, y: 436, w: 776, h: 112 };
  // 편광판 n장의 투과량 (첫 판 뒤의 빛 = 1). 돌리는 판의 각도 a (첫 판의 투과축 = 0°)
  function polT(n, a) { if (n === 1) return 1; if (n === 2) return cos2(a); return cos2(a) * sin2(a); }
  function levelWord(T) { return T >= 0.9 ? '아주 밝음' : T >= 0.6 ? '밝음' : T >= 0.3 ? '중간' : T >= 0.1 ? '약함' : T >= 0.03 ? '아주 약함' : '거의 없음'; }
  // 물(n = 1.33)에서 반사하는 자연광: 수평(s)·수직(p) 성분의 반사율 (정성 그림의 바탕 자료)
  const N_WATER = 1.33;
  function fresnel(thI) {
    const ti = thI * rad, tt = Math.asin(Math.sin(ti) / N_WATER);
    const rs = -Math.sin(ti - tt) / Math.sin(ti + tt);
    const rp = Math.tan(ti - tt) / Math.tan(ti + tt);
    return { Rs: rs * rs, Rp: rp * rp };
  }
  function glareShare(thI) { const f = fresnel(thI); const s = f.Rs / (f.Rs + f.Rp); return { s, p: 1 - s, R: (f.Rs + f.Rp) / 2 }; }
  const glareOf = (thI, gl) => { const g = glareShare(thI); return gl === 'v' ? g.p : gl === 'h' ? g.s : 1; };   // 안경 없을 때 = 1
  // 맑은 하늘: 태양과 이루는 각 γ에서 편광 정도 (최대 약 0.75)
  const skyP = (g) => 0.75 * sin2(g) / (1 + cos2(g));
  const SKY_DOM = 0;                                        // 하늘빛이 가장 많이 진동하는 방향(위에서 본 그림에서 세로)
  const skyB = (g, f) => 0.5 * (1 + skyP(g) * Math.cos(2 * (f - SKY_DOM) * rad));   // 필터를 지난 하늘 밝기 (필터 없는 하늘 = 1)
  // 모의 디스플레이 5종 (예시 자료)
  const DEVS = [
    { id: 'A', name: '모니터 A', kind: 'LCD', max: 100, min: 3, ang: 90 },
    { id: 'B', name: '노트북 B', kind: 'LCD', max: 100, min: 5, ang: 45 },
    { id: 'C', name: '스마트폰 C', kind: 'OLED', max: 100, min: 70, ang: 0 },
    { id: 'D', name: '백열등', kind: '전구', max: 100, min: 100, ang: 0 },
    { id: 'E', name: '맑은 하늘', kind: '하늘', max: 100, min: 55, ang: 30 },
  ];
  const devAng = (d, lying) => (d.max === d.min ? 0 : (d.ang + (lying ? 90 : 0)) % 180);
  const sensorAt = (d, lying, a) => d.min + (d.max - d.min) * cos2(a - devAng(d, lying));
  const BIN = 5, NB = 37;                                   // 0°~180°를 5°마다 측정 (37칸)
  const devClass = (d) => { const df = d.max - d.min; return df >= 90 ? 2 : df >= 10 ? 1 : 0; };   // 2 뚜렷, 1 약함, 0 없음
  // LCD 한 픽셀: 전압 V(0~5 V) → 액정의 비틂 각 → 위 편광판을 지난 밝기 (전압이 클수록 어두워요)
  const twistOf = (V) => 90 * (1 - clamp(V, 0, 5) / 5);
  const lcdB = (V) => sin2(twistOf(V));
  const lcdLevel = (V) => Math.round(255 * lcdB(V) + 1e-9);
  const volOf = (s) => 5 * (1 - Math.asin(Math.sqrt(clamp(s, 0, 255) / 255)) / (Math.PI / 2));

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'pol', t: 0, fade: 0,
    show: { mid: false, selA: false, selB: false, selC: false, selD: false },
    pol: { n: 2, ang: 0, angD: 0, bar: 1, seen3: false, midHold: 0, seenDark: false },
    mk: { sub: 'refl', th: 30, gl: 'n', dir: '90', fil: 0, filMin: 0, filMax: 0, seenSky: false, seenRefl: false, thD: 30, filD: 0 },
    sv: { dev: 'A', lying: false, ang: 0, angD: 0, auto: false, bins: {}, done: {}, prev: 0 },
    te: { sub: 'lcd', V: 0, VD: 0, lcdSeen: false, ci: { on: false, axL: 0, axR: 0 }, seenCine: false, seenFiber: false, ciOK: false },
  };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { pol: '🕶️ 편광판', make: '🚗 편광 만들기', survey: '🔬 디스플레이 조사', tech: '📱 정보 기술' };
  const keyOf = (id, lying) => id + (lying ? 'L' : 'N');
  const curDev = () => DEVS.find((d) => d.id === S.sv.dev);
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    if (mode === 'make') S.mk.seenRefl = S.mk.seenRefl || S.mk.sub === 'refl';
    if (mode === 'make' && S.mk.sub === 'sky') S.mk.seenSky = true;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }

  /* ---------- 컨트롤 연결 ---------- */
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      const sub = n.getAttribute('data-sub');
      if (on && sub) on = sub === (S.mode === 'make' ? S.mk.sub : S.mode === 'tech' ? S.te.sub : '');
      const dm = n.getAttribute('data-match');
      if (on && dm) on = !!S.show[dm] || (dm === 'mid' && !!game && game.free);
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    sheetSeg.set(String(S.pol.n)); mkSeg.set(S.mk.sub); glSeg.set(S.mk.gl); dirSeg.set(S.mk.dir);
    devSeg.set(S.sv.dev); teSeg.set(S.te.sub);
    const dv = $('#bTilt'); if (dv) { dv.textContent = S.sv.lying ? '📱 세워 놓기' : '📱 눕혀 놓기 (90° 돌리기)'; dv.classList.toggle('btn-primary', S.sv.lying); }
    const bs = $('#bSweep'); if (bs) bs.textContent = S.sv.auto ? '⏸ 멈추기' : '▶ 자동으로 돌리며 측정';
    const gb = $('#bGlass'); if (gb) { gb.textContent = S.te.ci.on ? '😎 안경 벗기' : '😎 안경 쓰기'; gb.classList.toggle('btn-primary', S.te.ci.on); }
    const bl = $('#bAxL'); if (bl) bl.textContent = '왼쪽 렌즈 ' + (S.te.ci.axL === 0 ? '↕' : '↔');
    const br = $('#bAxR'); if (br) br.textContent = '오른쪽 렌즈 ' + (S.te.ci.axR === 0 ? '↕' : '↔');
    $$('#measureNote').forEach((n) => { n.textContent = measureNote(); });
  }
  function measureNote() {
    const k = keyOf(S.sv.dev, S.sv.lying), cov = Object.keys(S.sv.bins[k] || {}).length;
    const tail = S.sv.lying ? ' (표에는 세워서 잰 값을 적어요)' : '';
    return S.sv.done[k] ? '✅ 이 기기 측정을 마쳤어요.' + tail : '측정한 각도 ' + cov + ' / ' + NB + '칸 (0°~180° 모두 지나가야 해요)' + tail;
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  const sheetSeg = bindSeg('sheetSeg', (v) => { S.pol.n = +v; if (S.pol.n === 3) { S.pol.seen3 = S.pol.seen3 || false; setAng(45); } else if (S.pol.n === 2) setAng(S.pol.ang); updateCtl(); });
  const mkSeg = bindSeg('mkSeg', (v) => { S.mk.sub = v; if (v === 'sky') S.mk.seenSky = true; if (v === 'refl') S.mk.seenRefl = true; updateCtl(); });
  const glSeg = bindSeg('glSeg', (v) => { S.mk.gl = v; updateCtl(); });
  const dirSeg = bindSeg('dirSeg', (v) => { S.mk.dir = v; updateCtl(); });
  const devSeg = bindSeg('devSeg', (v) => { selectDev(v); });
  const teSeg = bindSeg('teSeg', (v) => { S.te.sub = v; if (v === 'cine') S.te.seenCine = true; if (v === 'fiber') S.te.seenFiber = true; if (v === 'lcd') S.te.lcdSeen = true; parts.clear(); updateCtl(); });
  const slA = bindSlider('sA', (v) => v + '°', (v) => { S.pol.ang = +v; });
  const slI = bindSlider('sI', (v) => v + '°', (v) => { S.mk.th = +v; });
  const slF = bindSlider('sF', (v) => v + '°', (v) => { S.mk.fil = +v; trackFil(); });
  const slM = bindSlider('sM', (v) => v + '°', (v) => { S.sv.auto = false; S.sv.ang = +v; recordBins(); updateCtl(); });
  const slV = bindSlider('sV', (v) => (v / 100).toFixed(2) + ' V', (v) => { S.te.V = v / 100; });
  function setAng(a) { S.pol.ang = a; slA.set(a); }
  function trackFil() { S.mk.filMin = Math.min(S.mk.filMin, S.mk.fil); S.mk.filMax = Math.max(S.mk.filMax, S.mk.fil); }
  function selectDev(id) {
    S.sv.dev = id; S.sv.lying = false; S.sv.auto = false; S.sv.ang = 0; S.sv.prev = 0; slM.set(0);   // 기기를 바꾸면 세워 놓은 상태에서 다시 시작해요 (표는 세워서 잰 값)
    const k = keyOf(id, S.sv.lying); if (!S.sv.bins[k]) S.sv.bins[k] = {}; S.sv.bins[k][0] = true; completeIf(k);
    updateCtl();
  }
  function recordBins() {
    const k = keyOf(S.sv.dev, S.sv.lying); const B = S.sv.bins[k] || (S.sv.bins[k] = {});
    const a = S.sv.prev, b = S.sv.ang, lo = Math.min(a, b), hi = Math.max(a, b);
    for (let i = Math.ceil(lo / BIN - 1e-9); i <= Math.floor(hi / BIN + 1e-9); i++) B[i] = true;
    S.sv.prev = b; completeIf(k);
  }
  function completeIf(k) { if (Object.keys(S.sv.bins[k] || {}).length >= NB && !S.sv.done[k]) S.sv.done[k] = true; }
  // 측정이 끝난 기기의 표 값: 기록한 칸의 최댓값·최솟값과 그때의 각도
  function tableOf(d, lying) {
    const k = keyOf(d.id, lying); if (!S.sv.done[k]) return null;
    let mx = -1, mn = 1e9, am = 0;
    let rmx = -1;
    for (let i = 0; i < NB; i++) { const raw = sensorAt(d, lying, i * BIN), v = Math.round(raw); if (raw > rmx + 1e-9) { rmx = raw; am = i * BIN; } if (v > mx) mx = v; if (v < mn) mn = v; }
    return { max: mx, min: mn, ang: am === 180 ? 0 : am };
  }
  $('#bTilt').addEventListener('click', () => { Sound.click(); S.sv.lying = !S.sv.lying; S.sv.auto = false; S.sv.ang = 0; S.sv.prev = 0; slM.set(0); const k = keyOf(S.sv.dev, S.sv.lying); if (!S.sv.bins[k]) S.sv.bins[k] = {}; S.sv.bins[k][0] = true; completeIf(k); S.sv.tilted = true; updateCtl(); });
  $('#bSweep').addEventListener('click', () => { Sound.click(); if (S.sv.auto) { S.sv.auto = false; } else { if (S.sv.ang >= 180) { S.sv.ang = 0; S.sv.prev = 0; slM.set(0); } S.sv.auto = true; } updateCtl(); });
  $('#bGlass').addEventListener('click', () => { Sound.click(); S.te.ci.on = !S.te.ci.on; updateCtl(); });
  $('#bAxL').addEventListener('click', () => { Sound.click(); S.te.ci.axL = S.te.ci.axL === 0 ? 90 : 0; updateCtl(); });
  $('#bAxR').addEventListener('click', () => { Sound.click(); S.te.ci.axR = S.te.ci.axR === 0 ? 90 : 0; updateCtl(); });

  const SEL_A = mkSelRows('selA', [
    { q: '서로 직각인(0°, 90°) 편광판 두 장 사이에 <b>45°</b> 판을 끼우면 빛은', opts: ['여전히 모두 차단돼요', '약하게 다시 통과해요', '원래 밝기로 돌아와요'], ans: 1 },
    { q: '가운데 판이 하는 일은', opts: ['빛의 색을 바꿔요', '편광 방향을 비틀어 다음 판을 통과할 성분을 만들어 줘요', '빛을 모두 흡수해요'], ans: 1 },
    { q: '가운데 판을 <b>0°나 90°</b>로 돌리면 화면은', opts: ['더 밝아져요', '다시 어두워져요', '아무 변화가 없어요'], ans: 1 },
  ]);
  const SEL_B = mkSelRows('selB', [
    { q: '<b>편광판</b>을 지난 자연광은', opts: ['한 방향 진동만 남아요', '색이 바뀌어요', '세기가 두 배가 돼요'], ans: 0 },
    { q: '물·도로 표면에서 <b>반사</b>한 빛은', opts: ['수평으로 진동하는 성분이 더 많아요', '수직으로 진동하는 성분이 더 많아요', '편광되지 않아요'], ans: 0 },
    { q: '맑은 하늘에서 <b>산란</b>한 빛은', opts: ['태양과 직각 방향에서 편광이 가장 뚜렷해요', '태양 쪽을 볼 때 편광이 가장 뚜렷해요', '편광되지 않아요'], ans: 0 },
  ]);
  const OPT3 = ['뚜렷한 편광', '약한 편광', '편광 없음'];
  const SEL_C = mkSelRows('selC', DEVS.map((d) => ({ q: '<b>' + d.name + '</b> (' + d.kind + ')의 빛은', opts: OPT3, ans: 2 - devClass(d) })));
  const SEL_D = mkSelRows('selD', [
    { q: '3D 극장에서 왼쪽·오른쪽 눈에 보낼 영상은', opts: ['같은 방향으로 편광시켜 투사해요', '서로 직교한 편광으로 투사해요'], ans: 1 },
    { q: '한 광섬유에 서로 직교한 두 편광으로 <b>정보를 따로</b> 실으면 전송량은', opts: ['같아요', '2배가 돼요', '절반이 돼요'], ans: 1 },
  ]);

  /* ---------- 그리기 도우미 ---------- */
  const rgbaH = (hex, a) => C.rgba(hex, a);
  // 양쪽 화살표(전기장 진동 방향): ang 0° = 세로, 시계 방향
  function dbl(cx, cy, len, ang, col, w) {
    if (len < 1.5) return;
    const dx = Math.sin(ang * rad) * len, dy = -Math.cos(ang * rad) * len;
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w || 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - dx, cy - dy); ctx.lineTo(cx + dx, cy + dy); ctx.stroke();
    const hs = Math.min(6.5, len * 0.5);
    [1, -1].forEach((s) => {
      const ex = cx + s * dx, ey = cy + s * dy, ux = s * dx / len, uy = s * dy / len;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * hs - uy * hs * 0.6, ey - uy * hs + ux * hs * 0.6); ctx.lineTo(ex - ux * hs + uy * hs * 0.6, ey - uy * hs - ux * hs * 0.6); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }
  // 빛의 단면(앞에서 본 그림): comps = [{ang, len(0~1), col}]
  function xsec(cx, cy, R, comps, label, o) {
    o = o || {};
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = o.stroke || '#c7d0e0'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    comps.forEach((c) => dbl(cx, cy, c.len * R * 0.82, c.ang, c.col || '#2f6bff', c.w || 2.4));
    if (label) T(cx, cy + R + 16, label, PHONE ? 12 : 13, '#26324a', 'center', 800);
  }
  const natComps = (t) => [0, 1, 2, 3, 4, 5].map((i) => ({ ang: i * 30 + 22 * Math.sin(t * 2.3 + i * 1.9), len: 0.9, col: '#8a93a6', w: 2 }));
  // 편광판(비스듬히 본 모습): 투과축 방향 줄무늬
  function sheet(cx, cy, ry, rx, axis, col, o) {
    o = o || {};
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    D.shadow(() => { ctx.fillStyle = rgbaH(col, 0.2); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.clip();
    const k = rx / ry, a = axis * rad, ux = Math.sin(a), uy = Math.cos(a), px = Math.cos(a), py = -Math.sin(a);
    ctx.strokeStyle = rgbaH(col, 0.85); ctx.lineWidth = o.lw || 1.6;
    for (let s = -ry * 1.5; s <= ry * 1.5; s += o.gap || 9) {
      const x0 = s * px, y0 = s * py, L = ry * 1.6;
      ctx.beginPath(); ctx.moveTo(cx + (x0 - L * ux) * k, cy - (y0 - L * uy)); ctx.lineTo(cx + (x0 + L * ux) * k, cy - (y0 + L * uy)); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = shadeOf(col); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  const shadeOf = (col) => C.shade(col, -0.25);
  // 흐르는 빛 띠
  function beamBand(x1, x2, cy, hh, lvl, flow) {
    if (x2 <= x1) return;
    const a = clamp(lvl, 0, 1);
    ctx.save();
    const g = ctx.createLinearGradient(0, cy - hh, 0, cy + hh);
    g.addColorStop(0, 'rgba(255,236,160,0)'); g.addColorStop(0.5, 'rgba(255,240,170,' + (0.08 + 0.7 * a) + ')'); g.addColorStop(1, 'rgba(255,236,160,0)');
    ctx.fillStyle = g; ctx.fillRect(x1, cy - hh, x2 - x1, hh * 2);
    if (a > 0.03 && !RM) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * a) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const sp = 30, off = (flow * 60) % sp;
      for (let x = x1 + off; x < x2 - 6; x += sp) { ctx.beginPath(); ctx.moveTo(x, cy - hh * 0.35); ctx.lineTo(x + 10, cy - hh * 0.35); ctx.moveTo(x + 14, cy + hh * 0.3); ctx.lineTo(x + 24, cy + hh * 0.3); ctx.stroke(); }
    }
    ctx.restore();
  }
  function bulb(x, y, r) {
    D.glow(x, y, r * 2.2, '#ffd34d', 0.55);
    D.sphere(x, y, r, '#ffe27a', { shadow: true });
    ctx.fillStyle = '#7b8798'; D.roundRect(x - r * 0.45, y + r * 0.75, r * 0.9, r * 0.7, 3); ctx.fill();
  }
  function barH(x, y, w, h, frac, col, bg) {
    ctx.fillStyle = bg || '#e3e8f2'; D.roundRect(x, y, w, h, h / 2); ctx.fill();
    const fw = clamp(frac, 0, 1) * w;
    if (fw > 0.5) { ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(x, y, fw, h); ctx.restore(); }
  }

  /* ================= ① 편광판 ================= */
  const polLay = () => PHONE
    ? { a: { x: MA.x, y: MA.y, w: MA.w, h: 304 }, b: { x: MA.x, y: MA.y + 312, w: MA.w, h: MA.h - 312 } }
    : { a: { x: MA.x, y: MA.y, w: 484, h: MA.h }, b: { x: MA.x + 496, y: MA.y, w: 280, h: MA.h } };
  function polAxes() { const P = S.pol; return P.n === 1 ? [P.angD] : P.n === 2 ? [0, P.angD] : [0, P.angD, 90]; }
  function polGeom() {
    const L = polLay().a, k = PHONE ? 0.78 : 1, n = S.pol.n;
    const lampX = L.x + 40 * k, scrX = L.x + L.w - 46 * k, cy = L.y + (PHONE ? 92 : 112);
    const xs = []; for (let i = 0; i < n; i++) xs.push(lampX + 22 + (scrX - lampX - 22) * (i + 1) / (n + 1));
    return { L, k, lampX, scrX, cy, ry: 56 * k, rx: 20 * k, xs, ri: n === 3 ? 1 : n - 1 };
  }
  function drawPol() {
    const P = S.pol, G = polGeom(), { L, k, lampX, scrX, cy, ry, rx, xs } = G, n = P.n;
    panel(L.x, L.y, L.w, L.h, 14);
    T(L.x + 14, L.y + 24, '💡 자연광 → 편광판 → 화면', PHONE ? 14 : 15, '#26324a', 'left', 800);
    if (!PHONE) T(L.x + L.w - 14, L.y + 24, '돌리는 판을 위아래로 끌어도 돼요', 12.5, '#5d6879', 'right', 700);
    const axes = polAxes();
    // 단계별 진폭·밝기 (그림용)
    const amps = [1], lv = [1];
    if (n === 1) { amps.push(1); lv.push(0.5); }
    else if (n === 2) { amps.push(1); lv.push(0.5); const c = Math.abs(cosD(P.angD)); amps.push(c); lv.push(0.5 * c * c); }
    else { amps.push(1); lv.push(0.5); const c = Math.abs(cosD(P.angD)); amps.push(c); lv.push(0.5 * c * c); const c2 = c * Math.abs(sinD(P.angD)); amps.push(c2); lv.push(0.5 * c2 * c2); }
    const stops = [lampX + 12].concat(xs).concat([scrX]);
    // 빛 띠
    for (let i = 0; i < stops.length - 1; i++) beamBand(stops[i] + (i === 0 ? 0 : 6), stops[i + 1] - (i === stops.length - 2 ? 22 * k : 6), cy, 20 * k, lv[i], S.t * (1 - 0.0));
    bulb(lampX, cy, 15 * k);
    T(lampX, cy + 54 * k + 14, '자연광', PHONE ? 12 : 13, '#26324a', 'center', 800);
    // 편광판
    xs.forEach((x, i) => {
      const isRot = i === G.ri;
      const col = isRot ? '#f26b3a' : '#2f6bff';
      sheet(x, cy, ry, rx, axes[i], col);
      const lab = n === 1 ? '편광판' : n === 2 ? (i === 0 ? 'P₁' : 'P₂') : (i === 0 ? 'P₁' : i === 1 ? '가운데 판' : 'P₃');
      T(x, cy - ry - 8, lab, PHONE ? 12.5 : 14, col === '#f26b3a' ? '#c4501b' : '#1f4fcf', 'center', 800);
      T(x, cy + ry + 17, (Math.round(axes[i]) % 360) + '°', PHONE ? 12 : 13, '#5d6879', 'center', 800);
    });
    // 화면
    const Tn = Math.pow(polT(n, P.angD), 0.6);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(scrX, cy, 20 * k, ry, 0, 0, TAU); ctx.fillStyle = '#2f384d'; ctx.fill();
    D.glow(scrX, cy, 80 * k, '#fff3b0', 0.85 * Tn);
    ctx.beginPath(); ctx.ellipse(scrX, cy, 20 * k, ry, 0, 0, TAU); ctx.fillStyle = 'rgba(255,248,214,' + (0.97 * Tn) + ')'; ctx.fill();
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    T(scrX, cy + ry + 17, '화면', PHONE ? 12 : 13, '#26324a', 'center', 800);
    // 단면 그림 (앞에서 본 진동 방향)
    const cy2 = L.y + (PHONE ? 192 : 244), R2 = (PHONE ? 22 : 28);
    const labs = n === 1 ? ['판 앞', '판 뒤'] : n === 2 ? ['P₁ 앞', 'P₁ 뒤', 'P₂ 뒤'] : ['P₁ 앞', 'P₁ 뒤', '가운데 판 뒤', 'P₃ 뒤'];
    for (let i = 0; i <= n; i++) {
      const cx = (stops[i] + stops[i + 1]) / 2;
      const a = i === 0 ? natComps(S.t) : [{ ang: axes[i - 1], len: amps[i], col: i === 1 ? '#2f6bff' : '#f26b3a' }];
      xsec(cx, cy2, R2, a, labs[i]);
    }
    // 밝기 막대
    const by = L.y + L.h - (PHONE ? 42 : 62), bx = L.x + 16, bw = L.w - 32;
    T(bx, by - 8, '화면 밝기 (P₁만 지난 빛을 가득 찬 막대로 놓았을 때)', PHONE ? 12 : 13, '#26324a', 'left', 800);
    barH(bx, by, bw, 20, P.bar, '#ffb400');
    T(bx + 8, by + 15, levelWord(polT(n, P.ang)), 13, P.bar > 0.12 ? '#26324a' : '#5d6879', 'left', 800);
    // 줄 파동 비유
    const R = polLay().b;
    panel(R.x, R.y, R.w, R.h, 14);
    T(R.x + 14, R.y + 24, '🧵 줄 파동으로 비유하면', PHONE ? 14 : 15, '#26324a', 'left', 800);
    if (PHONE) { const w2 = (R.w - 24) / 2; drawRope({ x: R.x + 8, y: R.y + 34, w: w2, h: R.h - 44 }, true); drawRope({ x: R.x + 16 + w2, y: R.y + 34, w: w2, h: R.h - 44 }, false); }
    else { const h2 = (R.h - 52) / 2; drawRope({ x: R.x + 8, y: R.y + 34, w: R.w - 16, h: h2 - 4 }, true); drawRope({ x: R.x + 8, y: R.y + 38 + h2, w: R.w - 16, h: h2 - 4 }, false); }
  }
  function drawRope(r, vert) {
    ctx.fillStyle = '#f7f9fd'; D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fill();
    T(r.x + 8, r.y + 17, vert ? '세로로 진동 → 통과' : '가로로 진동 → 차단', PHONE ? 11.5 : 12.5, vert ? '#1c7a4a' : '#c4501b', 'left', 800);
    const x0 = r.x + 12, x1 = r.x + r.w - 12, Lr = x1 - x0, xf = x0 + Lr * 0.55, my = r.y + r.h * 0.58;
    const A = Math.min(24, r.h * 0.2), zs = 0.5, ys = 0.3, lam = Lr * 0.28;
    const ph = RM ? 0 : S.t * 3.2;
    const P = (x, y, z) => [x - z * zs, my - y - z * ys];
    const wave = (x) => A * Math.sin(TAU * ((x - x0) / lam) - ph);
    const rope = (xa, xb, fy, fz) => {
      ctx.beginPath();
      for (let x = xa; x <= xb; x += 3) { const [px, py] = P(x, fy(x), fz(x)); if (x === xa) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.stroke();
    };
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 3.2; ctx.strokeStyle = vert ? '#2f6bff' : '#f26b3a';
    // 판 뒤쪽 (통과한 줄)
    rope(xf, x1, (x) => (vert ? wave(x) : 0), () => 0);
    // 틈 있는 판 (세로 틈)
    const hh = Math.min(40, r.h * 0.36), zz = Math.min(50, Lr * 0.18), sl = 4;
    const piece = (z0, z1, col) => {
      const q = [P(xf, -hh, z0), P(xf, hh, z0), P(xf, hh, z1), P(xf, -hh, z1)];
      D.shadow(() => { ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5; ctx.stroke();
    };
    piece(-zz, -sl, '#aeb8c9'); piece(sl, zz, '#c3ccdb');
    // 들어오는 줄
    ctx.strokeStyle = vert ? '#2f6bff' : '#f26b3a';
    rope(x0, xf, (x) => (vert ? wave(x) : 0), (x) => (vert ? 0 : wave(x) * Math.min(1, (xf - x) / 12)));
    ctx.restore();
  }
  const polBottomText = () => {
    const P = S.pol, a = P.ang, n = P.n;
    if (n === 1) return '편광판 한 장: 자연광은 모든 방향으로 진동하다가 판을 지나면 한 방향 진동만 남아요. 판을 돌려도 밝기는 그대로예요.';
    if (n === 2) {
      const d = Math.min(a % 180, 180 - (a % 180));
      if (d <= 6) return '두 판의 투과축이 나란해요(0° 또는 180°). 가장 많은 빛이 통과해요.';
      if (Math.abs(a - 90) <= 6) return '투과축이 서로 직각이에요(90°). 두 번째 판이 진동 방향을 막아서 빛이 거의 통과하지 못해요.';
      return a < 90 ? '각도가 커질수록 통과하는 빛이 점점 줄어들어요. (0°에서 90°까지는 계속 어두워져요)' : '90°를 지나면 다시 점점 밝아져 180°에서 처음처럼 밝아져요. (밝기의 주기는 180°)';
    }
    return '세 장: P₁(0°)과 P₃(90°)는 직각이라 두 장만으로는 어두워요. 가운데 판이 진동 방향을 비틀면 P₃를 통과할 성분이 생겨서 빛이 약하게 통과해요.';
  };

  /* ================= ② 편광 만들기 ================= */
  const mkLay = () => PHONE
    ? { a: { x: MA.x, y: MA.y, w: MA.w, h: 292 }, b: { x: MA.x, y: MA.y + 300, w: MA.w, h: MA.h - 300 } }
    : { a: { x: MA.x, y: MA.y, w: 500, h: MA.h }, b: { x: MA.x + 512, y: MA.y, w: 264, h: MA.h } };
  function drawMake() {
    if (S.mk.sub === 'refl') drawRefl(); else drawSky();
  }
  function lensAt(x, y, axisDeg, scale) {
    sheet(x, y, 20 * scale, 9 * scale, axisDeg, '#3d4658', { gap: 6, lw: 1.3 });
  }
  function drawRefl() {
    const M = S.mk, L = mkLay(), a = L.a, b = L.b, k = PHONE ? 0.75 : 1;
    const th = M.thD, tr = th * rad;
    panel(a.x, a.y, a.w, a.h, 14);
    T(a.x + 14, a.y + 24, '🚗 도로(물 젖은 길)에서 반사한 햇빛', PHONE ? 14 : 15, '#26324a', 'left', 800);
    const Rr = PHONE ? 124 : 196, x0 = a.x + a.w / 2 - (PHONE ? 6 : 0), yg = a.y + (PHONE ? a.h - 44 : a.h - 70);
    // 하늘·도로
    ctx.save(); D.roundRect(a.x + 6, a.y + 34, a.w - 12, a.h - 40, 10); ctx.clip();
    const sg = ctx.createLinearGradient(0, a.y, 0, yg); sg.addColorStop(0, '#d8ecff'); sg.addColorStop(1, '#f4faff'); ctx.fillStyle = sg; ctx.fillRect(a.x, a.y, a.w, yg - a.y);
    const rg = ctx.createLinearGradient(0, yg, 0, a.y + a.h); rg.addColorStop(0, '#6b7385'); rg.addColorStop(1, '#4a5163'); ctx.fillStyle = rg; ctx.fillRect(a.x, yg, a.w, a.h);
    D.glow(x0, yg + 2, 70 * k + th * 0.6, '#ffffff', 0.5);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.setLineDash([14, 12]); ctx.beginPath(); ctx.moveTo(a.x + 20, yg + 26); ctx.lineTo(a.x + a.w - 20, yg + 26); ctx.stroke(); ctx.setLineDash([]);
    const sx = x0 - Rr * Math.sin(tr), sy = yg - Rr * Math.cos(tr), ex = x0 + Rr * Math.sin(tr), ey = yg - Rr * Math.cos(tr);
    // 법선·각도
    ctx.strokeStyle = '#9aa6b8'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x0, yg); ctx.lineTo(x0, yg - Rr * 0.9); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#c4501b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x0, yg, 44 * k, -Math.PI / 2 - tr, -Math.PI / 2 + tr); ctx.stroke();
    T(a.x + a.w - 14, a.y + 24, '입사각 = 반사각 = ' + M.th + '°', PHONE ? 12.5 : 13.5, '#c4501b', 'right', 800);
    // 햇빛과 반사광
    const flowLine = (x1, y1, x2, y2, col, w) => {
      ctx.save(); ctx.strokeStyle = rgbaH(col, 0.35); ctx.lineWidth = w + 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = w; if (!RM) { ctx.setLineDash([12, 10]); ctx.lineDashOffset = -S.t * 50; } ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
    };
    flowLine(sx, sy, x0, yg, '#ffb400', 3.2);
    const gs = glareShare(M.thD);
    flowLine(x0, yg, ex, ey, '#f26b3a', 3.2);
    D.glow(sx, sy, 34 * k, '#ffd34d', 0.7); D.sphere(sx, sy, 15 * k, '#ffd34d', { shadow: false });
    // 눈과 편광 선글라스
    const hx = ex + 22 * k, hy = ey - 4;
    D.sphere(hx, hy, 17 * k, '#f2c9a0', { shadow: true });
    ctx.fillStyle = '#26324a'; ctx.beginPath(); ctx.arc(ex + 8 * k, hy - 3, 2.6, 0, TAU); ctx.fill();
    T(hx + 2, hy + 17 * k + 15, '운전자', PHONE ? 11.5 : 12.5, '#26324a', 'center', 800);
    if (M.gl !== 'n') lensAt(ex + 1, ey, M.gl === 'v' ? 0 : 90, k);
    // 단면 그림: 입사광 / 반사광 / 안경 뒤
    const R3 = (PHONE ? 20 : 25);
    const place = (x1, y1, x2, y2, side) => {
      const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, px_ = -dy / l, py_ = dx / l, mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dd = 40 * k;
      let sg = px_ * side >= 0 ? 1 : -1;
      let cx = mx + sg * px_ * dd, cy = my + sg * py_ * dd;
      if (cy + R3 + 18 > yg) { cx = mx - sg * px_ * dd; cy = my - sg * py_ * dd; }
      return [cx, cy];
    };
    const c1 = place(sx, sy, x0, yg, -1), c2 = place(x0, yg, ex, ey, 1);
    xsec(c1[0], c1[1], R3, natComps(S.t), '자연광');
    const aS = Math.sqrt(gs.s), aP = Math.sqrt(gs.p);
    xsec(c2[0], c2[1], R3, [{ ang: 90, len: aS, col: '#f26b3a' }, { ang: 0, len: aP, col: '#2f6bff' }], '반사광');
    if (M.gl !== 'n') {
      const pass = M.gl === 'v' ? [{ ang: 0, len: aP, col: '#2f6bff' }] : [{ ang: 90, len: aS, col: '#f26b3a' }];
      xsec(ex - 2, ey - 26 * k - R3, R3 * 0.9, pass, '', {});
      T(ex - 2, ey - 26 * k - 2 * R3 * 0.9 - 7, '안경 뒤', PHONE ? 11 : 12, '#26324a', 'center', 800);
    }
    // 오른쪽(또는 아래) 정보
    panel(b.x, b.y, b.w, b.h, 14);
    const px = b.x + 16, pw = b.w - 32;
    let yy = b.y + 28;
    T(px, yy, '반사광은 어떤 방향으로 진동할까?', PHONE ? 14 : 14.5, '#26324a', 'left', 800); yy += PHONE ? 22 : 26;
    const sPct = Math.round(gs.s * 100), pPct = 100 - sPct;
    ctx.fillStyle = '#e3e8f2'; D.roundRect(px, yy, pw, 22, 11); ctx.fill();
    ctx.save(); D.roundRect(px, yy, pw, 22, 11); ctx.clip();
    ctx.fillStyle = '#f26b3a'; ctx.fillRect(px, yy, pw * sPct / 100, 22); ctx.fillStyle = '#2f6bff'; ctx.fillRect(px + pw * sPct / 100, yy, pw * pPct / 100, 22); ctx.restore();
    yy += 38;
    T(px, yy, '■ 수평 진동 ' + sPct + ' %', 13.5, '#c4501b', 'left', 800); T(px + pw, yy, '■ 수직 진동 ' + pPct + ' %', 13.5, '#1f4fcf', 'right', 800); yy += 12;
if (!PHONE) textBlock(px, yy + 14, pw, sPct - pPct > 6 ? '수평 진동이 더 많은 부분 편광이에요.' + (pPct <= 8 ? ' 이 각도 근처에서 거의 수평 진동만 남아요.' : '') : '입사각이 작으면 거의 편광되지 않아요.', 13, '#26324a', 18, 700);
    yy += PHONE ? 22 : 62;
    const g = glareOf(M.th, M.gl), gp = Math.round(g * 100);
    T(px, yy, '눈부심 (안경 없을 때 = 100)', 13.5, '#26324a', 'left', 800); yy += 10;
    barH(px, yy, pw, 22, g, gp <= 10 ? '#16a05a' : '#e2464b'); T(px + 8, yy + 16, gp + '', 13.5, g > 0.12 ? '#fff' : '#26324a', 'left', 800); yy += 44;
    T(px, yy, '반사되는 빛: 입사광의 ' + (gs.R * 100).toFixed(1) + ' %', 12.5, '#5d6879', 'left', 700); yy += 20;
    if (!PHONE) textBlock(px, yy, pw, '선글라스 투과축을 세로로 하면 수평 진동을 막아 눈부심이 줄어요.', 12.5, '#5d6879', 17, 700);
    // 아래 설명
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, M.gl === 'n' ? '반사광은 수평으로 진동하는 성분이 더 많은 부분 편광이에요. 입사각이 50° 안팎일 때 가장 뚜렷해요. 선글라스를 골라 보세요.' : M.gl === 'v' ? '투과축이 세로인 선글라스는 수평 진동을 막아요. 입사각이 50° 안팎일 때 눈부심이 가장 많이 줄어요.' : '투과축이 가로인 선글라스는 오히려 수평 진동(눈부심)을 통과시켜요. 편광 선글라스는 투과축을 세로로 만들어요.', PHONE ? 14 : 15, '#26324a', PHONE ? 21 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 78), BOT.w - 32, '(수면은 물의 굴절률 1.33으로 계산한 반사 자료예요.)', 12.5, '#5d6879', 18, 700);
  }
  function drawSky() {
    const M = S.mk, L = mkLay(), a = L.a, b = L.b, k = PHONE ? 0.75 : 1;
    panel(a.x, a.y, a.w, a.h, 14);
    T(a.x + 14, a.y + 24, '🌤️ 맑은 하늘의 빛 (위에서 내려다본 그림)', PHONE ? 14 : 15, '#26324a', 'left', 800);
    const gam = +M.dir, camx = a.x + a.w * 0.52, camy = a.y + a.h - (PHONE ? 52 : 80), sunx = a.x + 72 * k, suny = a.y + (PHONE ? 90 : 118);
    ctx.save(); D.roundRect(a.x + 6, a.y + 34, a.w - 12, a.h - 40, 10); ctx.clip();
    const sg = ctx.createLinearGradient(0, a.y, 0, a.y + a.h); sg.addColorStop(0, '#bfe0ff'); sg.addColorStop(1, '#eaf5ff'); ctx.fillStyle = sg; ctx.fillRect(a.x, a.y, a.w, a.h); ctx.restore();
    const us = Math.atan2(suny - camy, sunx - camx), dv = us + gam * rad;
    const D0 = (PHONE ? 150 : 205), px_ = camx + Math.cos(dv) * D0, py_ = camy + Math.sin(dv) * D0;
    // 시선과 산란점, 햇빛 (평행)
    ctx.strokeStyle = '#9aa6b8'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(camx, camy); ctx.lineTo(camx + Math.cos(us) * 150 * k, camy + Math.sin(us) * 150 * k); ctx.stroke(); ctx.setLineDash([]);
    const dl = (x1, y1, x2, y2, col, w) => { ctx.save(); ctx.strokeStyle = rgbaH(col, 0.35); ctx.lineWidth = w + 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; if (!RM) { ctx.setLineDash([12, 10]); ctx.lineDashOffset = -S.t * 50; } ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); };
    const sdx = Math.cos(us), sdy = Math.sin(us);
    dl(px_ + sdx * 215, py_ + sdy * 215, px_, py_, '#ffb400', 3);
    dl(px_, py_, camx, camy, '#f26b3a', 3);
    D.glow(px_, py_, 20, '#ffffff', 0.9); D.sphere(px_, py_, 6, '#ffffff', { gloss: false });
    T(px_ + (PHONE ? 8 : 12), py_ - 10, '공기 분자', 12, '#26324a', 'left', 800);
    D.glow(sunx, suny, 44 * k, '#ffd34d', 0.8); D.sphere(sunx, suny, 18 * k, '#ffd34d', {});
    T(sunx, suny + 34 * k, '태양', 13, '#26324a', 'center', 800);
    // 카메라와 필터
    D.roundRect(camx - 22 * k, camy - 4, 44 * k, 28 * k, 6); ctx.fillStyle = '#3d4658'; ctx.fill();
    ctx.fillStyle = '#7b8798'; ctx.beginPath(); ctx.arc(camx, camy - 4, 11 * k, 0, TAU); ctx.fill();
    sheet(camx + Math.cos(dv) * 20, camy + Math.sin(dv) * 20, 15 * k, 15 * k, M.filD, '#3d4658', { gap: 5, lw: 1.3 });
    T(camx, camy + 48 * k, '카메라(편광 필터)', PHONE ? 12 : 13, '#26324a', 'center', 800);
    // 각도 호
    ctx.strokeStyle = '#c4501b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(camx, camy, 62 * k, us, dv, false); ctx.stroke();
    T(camx + Math.cos((us + dv) / 2) * 82 * k, camy + Math.sin((us + dv) / 2) * 82 * k + 4, '태양과 ' + gam + '°', PHONE ? 12 : 13, '#c4501b', 'center', 800);
    // 단면
    const p = skyP(gam), pc = Math.round(p * 100);
    const R3 = PHONE ? 20 : 25;
    xsec(a.x + a.w - R3 - 22, a.y + R3 + 44, R3, [{ ang: SKY_DOM, len: Math.sqrt((1 + p) / 2), col: '#f26b3a' }, { ang: 90, len: Math.sqrt((1 - p) / 2), col: '#2f6bff' }], '산란한 빛');
    // 사진
    panel(b.x, b.y, b.w, b.h, 14);
    const px = b.x + 16, pw = b.w - 32;
    T(px, b.y + 26, '📷 사진에서 하늘이 어떻게 보일까?', PHONE ? 14 : 14.5, '#26324a', 'left', 800);
    const ph = PHONE ? 86 : 170, py = b.y + 38;
    const bv = skyB(gam, M.filD), kk = 0.35 + 0.65 * bv / 0.875;
    ctx.save(); D.roundRect(px, py, pw, ph, 10); ctx.clip();
    const g = ctx.createLinearGradient(0, py, 0, py + ph);
    const mixc = (c, f) => 'rgb(' + c.map((v) => Math.round(clamp(v * f, 0, 255))).join(',') + ')';
    g.addColorStop(0, mixc([70, 140, 230], kk * 1.05)); g.addColorStop(1, mixc([150, 200, 250], kk));
    ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
    const cloud = (cx, cy, s) => { ctx.fillStyle = 'rgba(255,255,255,.95)'; [[0, 0, 22], [22, -8, 18], [-22, 4, 16], [10, 8, 20]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(cx + dx * s, cy + dy * s, r * s, 0, TAU); ctx.fill(); }); };
    cloud(px + pw * 0.3, py + ph * 0.55, ph / 130); cloud(px + pw * 0.72, py + ph * 0.38, ph / 160);
    ctx.restore();
    ctx.strokeStyle = '#c7d0e0'; ctx.lineWidth = 2; D.roundRect(px, py, pw, ph, 10); ctx.stroke();
    let yy = py + ph + 26;
    T(px, yy, '하늘 밝기 (필터 없는 하늘 = 100)', 13, '#26324a', 'left', 800); yy += 8;
    const bp = Math.round(skyB(gam, M.fil) * 100);
    barH(px, yy, pw, 20, bp / 100, '#2f6bff'); T(px + 8, yy + 15, bp + '', 13, bp > 12 ? '#fff' : '#26324a', 'left', 800); yy += 40;
    T(px, yy, '이 방향의 편광 정도: ' + (pc >= 55 ? '뚜렷해요' : pc >= 20 ? '조금 있어요' : '거의 없어요'), 12.5, '#5d6879', 'left', 700);
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, gam === 90 ? '태양과 직각 방향의 하늘빛은 산란 때문에 한 방향 진동이 많아요. 필터를 돌리면 하늘이 가장 밝아졌다 어두워졌다 해요.' : '태양과 직각이 아닌 방향(태양 쪽·반대쪽)은 편광이 약해서 필터를 돌려도 밝기가 조금만 변해요.', PHONE ? 14 : 15, '#26324a', PHONE ? 21 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 78), BOT.w - 32, '구름은 편광되지 않은 빛이라 필터를 돌려도 밝기가 그대로예요. 그래서 하늘이 어두워지면 구름이 더 또렷해져요.', 12.5, '#5d6879', 18, 700);
  }

  /* ================= ③ 디스플레이 조사 ================= */
  const svLay = () => PHONE
    ? { sc: { x: MA.x, y: MA.y, w: MA.w, h: 130 }, gr: { x: MA.x, y: MA.y + 138, w: MA.w, h: 172 }, tb: { x: MA.x, y: MA.y + 318, w: MA.w, h: MA.h - 318 } }
    : { sc: { x: MA.x, y: MA.y, w: 372, h: 204 }, gr: { x: MA.x + 384, y: MA.y, w: 392, h: 204 }, tb: { x: MA.x, y: MA.y + 214, w: MA.w, h: MA.h - 214 } };
  function devPic(d, cx, cy, s, lying) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    if (d.id === 'D') { bulb(0, 0, 20); }
    else if (d.id === 'E') {
      const g = ctx.createLinearGradient(0, -34, 0, 34); g.addColorStop(0, '#5d9bf0'); g.addColorStop(1, '#bfe0ff');
      ctx.fillStyle = g; D.roundRect(-34, -34, 68, 68, 10); ctx.fill();
      D.glow(-18, -16, 26, '#ffd34d', 0.9); D.sphere(-18, -16, 8, '#ffd34d', {});
      ctx.fillStyle = '#fff'; [[10, 12, 9], [20, 8, 7], [0, 14, 7]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); });
    } else {
      if (lying) ctx.rotate(Math.PI / 2);
      if (d.id === 'A') {
        D.shadow(() => { ctx.fillStyle = '#26324a'; D.roundRect(-38, -26, 76, 50, 5); ctx.fill(); }, { blur: 6, y: 2 });
        const g = ctx.createLinearGradient(-34, -22, 34, 18); g.addColorStop(0, '#9fd0ff'); g.addColorStop(1, '#5d9bf0'); ctx.fillStyle = g; ctx.fillRect(-34, -22, 68, 42);
        ctx.fillStyle = '#7b8798'; ctx.fillRect(-4, 24, 8, 12); ctx.fillRect(-18, 35, 36, 5);
        ctx.fillStyle = '#26324a'; ctx.font = D.font(11, 800); ctx.textAlign = 'center'; ctx.fillText('↑', 0, -4);
      } else if (d.id === 'B') {
        D.shadow(() => { ctx.fillStyle = '#26324a'; D.roundRect(-34, -30, 68, 44, 4); ctx.fill(); }, { blur: 6, y: 2 });
        const g = ctx.createLinearGradient(-30, -26, 30, 10); g.addColorStop(0, '#c7e6ff'); g.addColorStop(1, '#7fb4ee'); ctx.fillStyle = g; ctx.fillRect(-30, -26, 60, 36);
        ctx.fillStyle = '#9aa6b8'; D.roundRect(-44, 14, 88, 8, 3); ctx.fill();
        ctx.fillStyle = '#26324a'; ctx.font = D.font(11, 800); ctx.textAlign = 'center'; ctx.fillText('↑', 0, -8);
      } else {
        D.shadow(() => { ctx.fillStyle = '#26324a'; D.roundRect(-20, -36, 40, 72, 7); ctx.fill(); }, { blur: 6, y: 2 });
        const g = ctx.createLinearGradient(-17, -30, 17, 30); g.addColorStop(0, '#ffd2a8'); g.addColorStop(1, '#f58aa6'); ctx.fillStyle = g; D.roundRect(-17, -30, 34, 60, 3); ctx.fill();
        ctx.fillStyle = '#26324a'; ctx.font = D.font(11, 800); ctx.textAlign = 'center'; ctx.fillText('↑', 0, 0);
      }
    }
    ctx.restore();
  }
  function drawSurvey() {
    const V = S.sv, L = svLay(), d = curDev(), k = PHONE ? 0.8 : 1;
    // --- 측정 장치 ---
    const a = L.sc; panel(a.x, a.y, a.w, a.h, 14);
    T(a.x + 14, a.y + 22, '🔬 광센서 + 편광판으로 측정하기', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    const cy = a.y + (PHONE ? 74 : 102), dx = a.x + 52 * k, sx = a.x + a.w * 0.5, rx = a.x + a.w - 52 * k;
    const val = sensorAt(d, V.lying, V.angD);
    const pass = d.id === 'D' ? 0.9 : 0.8;
    beamBand(dx + 30 * k, sx - 12, cy, 16 * k, 0.75, S.t);
    beamBand(sx + 12, rx - 26 * k, cy, 16 * k, 0.75 * val / 100, S.t);
    devPic(d, dx, cy, k * 0.95, V.lying);
    sheet(sx, cy, 44 * k, 16 * k, V.angD, '#f26b3a');
    // 센서 상자
    D.shadow(() => { ctx.fillStyle = '#3d4658'; D.roundRect(rx - 24 * k, cy - 30 * k, 52 * k, 60 * k, 8); ctx.fill(); }, { blur: 6, y: 2 });
    ctx.fillStyle = '#10151f'; D.roundRect(rx - 18 * k, cy - 22 * k, 40 * k, 26 * k, 4); ctx.fill();
    T(rx + 2 * k, cy - 3 * k, Math.round(val) + '%', PHONE ? 12.5 : 14, '#7dff9b', 'center', 800);
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(rx - 6 * k, cy + 18 * k, 4, 0, TAU); ctx.fill();
    T(dx, cy + 50 * k + 14, d.name + (V.lying && d.id !== 'D' && d.id !== 'E' ? ' (눕힘)' : ''), PHONE ? 12 : 13, '#26324a', 'center', 800);
    T(sx, cy + 50 * k + 14, '편광판 ' + Math.round(V.angD) + '°', PHONE ? 12 : 13, '#c4501b', 'center', 800);
    T(rx, cy + 50 * k + 14, '광센서', PHONE ? 12 : 13, '#26324a', 'center', 800);
    if (!PHONE) T(a.x + 14, a.y + a.h - 12, '모의 기기 · 예시 자료예요 (실제 제품은 다를 수 있어요)', 12, '#5d6879', 'left', 700);
    // --- 그래프 ---
    const g = L.gr; panel(g.x, g.y, g.w, g.h, 14);
    T(g.x + 14, g.y + 22, '📈 편광판 각도와 센서 투과량', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    const ax = axes(g.x + 54, g.y + 34, g.w - 74, g.h - (PHONE ? 78 : 88), { xmin: 0, xmax: 180, ymin: 0, ymax: 100, xt: [0, 30, 60, 90, 120, 150, 180].map((v) => [v, v + '°']), yt: [0, 50, 100].map((v) => [v, v + '']), xl: '편광판 투과축 각도', yl: '투과량(%)', fs: PHONE ? 11.5 : 12, ylx: 38 });
    const kk = keyOf(d.id, V.lying), B = V.bins[kk] || {};
    const other = keyOf(d.id, !V.lying);
    if (V.lying && V.done[other]) {      // 세워서 잰 결과를 점선으로
      ctx.save(); ctx.strokeStyle = '#9aa6b8'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.6; ctx.beginPath();
      for (let i = 0; i < NB; i++) { const x = ax.X(i * BIN), y = ax.Y(sensorAt(d, false, i * BIN)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke(); ctx.restore();
    }
    ctx.save(); ctx.strokeStyle = '#2f6bff'; ctx.lineWidth = 2; ctx.beginPath(); let st = false;
    for (let i = 0; i < NB; i++) { if (!B[i]) { st = false; continue; } const x = ax.X(i * BIN), y = ax.Y(sensorAt(d, V.lying, i * BIN)); if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y); }
    ctx.stroke(); ctx.restore();
    for (let i = 0; i < NB; i++) if (B[i]) { ctx.fillStyle = '#2f6bff'; ctx.beginPath(); ctx.arc(ax.X(i * BIN), ax.Y(sensorAt(d, V.lying, i * BIN)), 2.8, 0, TAU); ctx.fill(); }
    const cx2 = ax.X(V.angD), cy2 = ax.Y(sensorAt(d, V.lying, V.angD));
    ctx.strokeStyle = 'rgba(242,107,58,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(cx2, ax.y); ctx.lineTo(cx2, ax.y + ax.h); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(cx2, cy2, 6, '#f26b3a', { gloss: false });
    const cov = Object.keys(B).length;
    T(g.x + g.w - 14, g.y + 22, V.done[kk] ? '✅ 측정 완료' : cov + ' / ' + NB + '칸', PHONE ? 12 : 13, V.done[kk] ? '#1c7a4a' : '#5d6879', 'right', 800);
    // --- 표 ---
    const b = L.tb; panel(b.x, b.y, b.w, b.h, 14);
    T(b.x + 14, b.y + 22, '📋 측정 결과 표 (센서 투과량 %)', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    const cols = PHONE ? [0.04, 0.38, 0.58, 0.78] : [0.04, 0.34, 0.52, 0.72];
    const rh = Math.min(PHONE ? 20 : 27, (b.h - 78) / 6), y0 = b.y + 36;
    ['기기', '최대', '최소', '최대일 때 각도'].forEach((h, i) => T(b.x + b.w * cols[i], y0 + rh * 0.7, h, PHONE ? 11.5 : 13, '#5d6879', 'left', 800));
    DEVS.forEach((dv, r) => {
      const yy = y0 + rh * (r + 1);
      if (dv.id === V.dev) { ctx.fillStyle = 'rgba(242,107,58,.12)'; D.roundRect(b.x + 8, yy + 2, b.w - 16, rh - 2, 6); ctx.fill(); }
      T(b.x + b.w * cols[0], yy + rh * 0.7, dv.name, PHONE ? 12 : 13.5, '#26324a', 'left', 800);
      const tb = tableOf(dv, false);
      if (tb) {
        T(b.x + b.w * cols[1], yy + rh * 0.7, tb.max + ' %', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
        T(b.x + b.w * cols[2], yy + rh * 0.7, tb.min + ' %', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
        T(b.x + b.w * cols[3], yy + rh * 0.7, tb.max === tb.min ? '— (일정)' : tb.ang + '°', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
      } else {
        const c = Object.keys(V.bins[keyOf(dv.id, false)] || {}).length;
        T(b.x + b.w * cols[1], yy + rh * 0.7, c > 1 ? '측정 중 ' + c + ' / ' + NB : '측정 전', PHONE ? 12 : 13.5, '#9aa6b8', 'left', 800);
      }
    });
    const dl = curDev(), tn = tableOf(dl, false), tl = tableOf(dl, true);
    const note = tn && tl && tn.max !== tn.min ? '📱 ' + dl.name + '을(를) 눕혔더니 최대 각도가 ' + tn.ang + '° → ' + tl.ang + '°로 옮겨 갔어요.' : '최대와 최소의 차이가 클수록 빛이 한 방향으로 뚜렷하게 편광된 거예요.';
    textBlock(b.x + 14, b.y + b.h - (PHONE ? 22 : 30), b.w - 28, note, PHONE ? 12 : 13, '#26324a', 17, 700);
  }

  /* ================= ④ 정보 기술 ================= */
  const teLay = () => PHONE
    ? { a: { x: MA.x, y: MA.y, w: MA.w, h: 312 }, b: { x: MA.x, y: MA.y + 320, w: MA.w, h: MA.h - 320 } }
    : { a: { x: MA.x, y: MA.y, w: 520, h: MA.h }, b: { x: MA.x + 532, y: MA.y, w: 244, h: MA.h } };
  function drawTech() {
    if (S.te.sub === 'lcd') drawLCD(); else if (S.te.sub === 'cine') drawCine(); else drawFiber();
  }
  function drawLCD() {
    const E = S.te, L = teLay(), a = L.a, b = L.b, k = PHONE ? 0.8 : 1;
    panel(a.x, a.y, a.w, a.h, 14);
    T(a.x + 14, a.y + 24, '📱 LCD 한 픽셀의 구조 (분해도)', PHONE ? 14 : 15, '#26324a', 'left', 800);
    const cy = a.y + (PHONE ? 124 : 180), ry = (PHONE ? 54 : 66) * k, rx = 18 * k;
    const xB = a.x + 40 * k, xP1 = a.x + 118 * k, xL0 = a.x + 178 * k, xL1 = a.x + 320 * k, xP2 = a.x + 384 * k, xPx = a.x + a.w - 44 * k;
    const tw = twistOf(E.VD), Bv = lcdB(E.VD);
    // 백라이트
    D.shadow(() => { ctx.fillStyle = '#fff6c8'; D.roundRect(xB - 18 * k, cy - ry, 36 * k, ry * 2, 6); ctx.fill(); }, { blur: 8, y: 2 });
    D.glow(xB, cy, 52 * k, '#ffe27a', 0.5);
    for (let i = -2; i <= 2; i++) { ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(xB, cy + i * 20 * k, 4, 0, TAU); ctx.fill(); }
    T(xB, cy + ry + 17, '백라이트', PHONE ? 11.5 : 12.5, '#26324a', 'center', 800); T(xB, cy + ry + 32, '(편광 아님)', PHONE ? 10.5 : 11.5, '#5d6879', 'center', 700);
    // 빛 띠
    beamBand(xB + 20 * k, xP1 - 8, cy, 18 * k, 0.8, S.t);
    beamBand(xP1 + 8, xL0, cy, 18 * k, 0.4, S.t);
    beamBand(xL0, xL1, cy, 18 * k, 0.4, S.t);
    beamBand(xL1, xP2 - 8, cy, 18 * k, 0.4, S.t);
    beamBand(xP2 + 8, xPx - 20 * k, cy, 18 * k, 0.4 * Bv, S.t);
    // 아래 편광판(세로 투과)
    sheet(xP1, cy, ry, rx, 0, '#2f6bff'); T(xP1, cy - ry - 8, '아래 편광판', PHONE ? 11.5 : 12.5, '#1f4fcf', 'center', 800); T(xP1, cy + ry + 17, '세로 투과', PHONE ? 11 : 12, '#5d6879', 'center', 700);
    // 액정층
    D.shadow(() => { ctx.fillStyle = 'rgba(160,215,200,.35)'; D.roundRect(xL0, cy - ry, xL1 - xL0, ry * 2, 10); ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = 'rgba(70,150,130,.7)'; ctx.lineWidth = 1.5; D.roundRect(xL0, cy - ry, xL1 - xL0, ry * 2, 10); ctx.stroke();
    const NJ = 7;
    for (let j = 0; j < NJ; j++) {
      const x = xL0 + (xL1 - xL0) * (j + 0.5) / NJ, ang = tw * j / (NJ - 1);
      // 막대 분자 (비스듬히 본 모습): 비틂 각만큼 돌아가 있어요
      const Lr = 30 * k, dxm = Math.sin(ang * rad) * Lr * 0.75, dym = Math.cos(ang * rad) * Lr;
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#2a9d8f'; ctx.lineWidth = 8 * k;
      ctx.beginPath(); ctx.moveTo(x - dxm, cy + dym); ctx.lineTo(x + dxm, cy - dym); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - dxm - 1.5, cy + dym - 1); ctx.lineTo(x + dxm - 1.5, cy - dym - 1); ctx.stroke();
      ctx.restore();
      dbl(x, cy - ry + 14 * k, 14 * k, ang, '#f26b3a', 2.6);       // 그 자리에서 빛의 진동 방향
    }
    T((xL0 + xL1) / 2, cy - ry - 8, '액정층', PHONE ? 11.5 : 12.5, '#1c7a6e', 'center', 800);
    T((xL0 + xL1) / 2, cy + ry + 17, '비틂 ' + Math.round(tw) + '° (' + (E.V < 0.05 ? '전압 꺼짐' : E.V >= 4.95 ? '전압 최대' : '전압 ' + E.V.toFixed(2) + ' V') + ')', PHONE ? 11 : 12, '#5d6879', 'center', 800);
    // 전극과 전원
    ctx.fillStyle = '#9aa6b8'; ctx.fillRect(xL0, cy - ry - 4, xL1 - xL0, 3); ctx.fillRect(xL0, cy + ry + 1, xL1 - xL0, 3);
    // 위 편광판(가로 투과)
    sheet(xP2, cy, ry, rx, 90, '#2f6bff'); T(xP2, cy - ry - 8, '위 편광판', PHONE ? 11.5 : 12.5, '#1f4fcf', 'center', 800); T(xP2, cy + ry + 17, '가로 투과', PHONE ? 11 : 12, '#5d6879', 'center', 700);
    // 픽셀 (R, G, B 부화소)
    const lev = lcdLevel(E.VD), f = lev / 255;
    ctx.fillStyle = '#26324a'; D.roundRect(xPx - 22 * k, cy - ry * 0.9, 44 * k, ry * 1.8, 6); ctx.fill();
    ['#ff5a4d', '#2fd66b', '#4a7dff'].forEach((c, i) => { const w = 11 * k; ctx.fillStyle = C.mix('#1a1f2b', c, 0.12 + 0.88 * f); ctx.fillRect(xPx - 18 * k + i * (w + 1.5 * k), cy - ry * 0.8, w, ry * 1.6); });
    D.glow(xPx, cy, 44 * k, '#ffffff', 0.45 * f);
    T(xPx, cy + ry + 17, '픽셀', PHONE ? 11.5 : 12.5, '#26324a', 'center', 800); T(xPx, cy - ry - 8, '밝기 ' + lev, PHONE ? 12 : 13, '#26324a', 'center', 800);
    // 아래 설명
    textBlock(a.x + 16, a.y + a.h - (PHONE ? 58 : 66), a.w - 32, E.V < 0.05 ? '전압이 꺼지면 액정이 비틀려 있어 빛의 진동 방향도 90° 돌아가요. 위 편광판을 통과해 밝아요.' : E.V >= 4.95 ? '전압이 크면 액정의 비틂이 풀려 진동 방향이 그대로예요. 위 편광판이 막아 어두워요.' : '전압이 클수록 비틂이 풀려요. 진동 방향이 조금만 돌아간 만큼 위 편광판을 덜 통과해요.', PHONE ? 13 : 14, '#26324a', PHONE ? 19 : 21, 800);
    // 계조 표
    panel(b.x, b.y, b.w, b.h, 14);
    const px = b.x + 16, pw = b.w - 32; let yy = b.y + 28;
    T(px, yy, '전압 → 밝기 단계', PHONE ? 14 : 15, '#26324a', 'left', 800); yy += PHONE ? 30 : 38;
    T(px, yy, lev + ' / 255', PHONE ? 22 : 28, '#26324a', 'left', 900); T(px + pw, yy, '전압 ' + E.V.toFixed(2) + ' V', PHONE ? 13 : 14, '#c4501b', 'right', 800); yy += PHONE ? 14 : 18;
    const gx = px, gw = pw, gh = 18;
    const gg = ctx.createLinearGradient(gx, 0, gx + gw, 0); gg.addColorStop(0, '#000'); gg.addColorStop(1, '#fff'); ctx.fillStyle = gg; D.roundRect(gx, yy, gw, gh, 9); ctx.fill(); ctx.strokeStyle = '#9aa6b8'; ctx.lineWidth = 1.5; ctx.stroke();
    const mx = gx + gw * lev / 255; ctx.fillStyle = '#f26b3a'; ctx.beginPath(); ctx.moveTo(mx, yy + gh + 2); ctx.lineTo(mx - 6, yy + gh + 11); ctx.lineTo(mx + 6, yy + gh + 11); ctx.closePath(); ctx.fill();
    yy += gh + (PHONE ? 26 : 34);
    textBlock(px, yy, pw, '8비트: 2⁸ = 256단계 (0~255). 영상 신호 값마다 필요한 전압이 정해져 있어요.', 12.5, '#5d6879', 17, 700); yy += PHONE ? 40 : 56;
    const rowsS = [0, 64, 128, 192, 255];
    const near = rowsS.reduce((bst, s) => (Math.abs(s - lev) < Math.abs(bst - lev) ? s : bst), 0);
    if (PHONE) {
      const cw = pw / 5;
      T(px - 4, yy + 14, '신호', 12, '#5d6879', 'left', 800); T(px - 4, yy + 36, '전압', 12, '#5d6879', 'left', 800);
      rowsS.forEach((s, i) => {
        const cx = px + 34 + (pw - 34) * (i + 0.5) / 5;
        if (s === near && Math.abs(s - lev) <= 6) { ctx.fillStyle = 'rgba(242,107,58,.14)'; D.roundRect(cx - cw * 0.45, yy, cw * 0.9, 46, 6); ctx.fill(); }
        T(cx, yy + 14, String(s), 12.5, '#26324a', 'center', 800); T(cx, yy + 36, volOf(s).toFixed(2), 12.5, '#26324a', 'center', 800);
      });
    } else {
      const rh = 23;
      T(px, yy, '신호 값', 12.5, '#5d6879', 'left', 800); T(px + pw, yy, '전압', 12.5, '#5d6879', 'right', 800); yy += 6;
      rowsS.forEach((s, i) => {
        const y1 = yy + rh * (i + 0.5) + 5;
        if (s === near && Math.abs(s - lev) <= 6) { ctx.fillStyle = 'rgba(242,107,58,.14)'; D.roundRect(px - 6, y1 - rh * 0.65, pw + 12, rh * 0.95, 6); ctx.fill(); }
        T(px, y1, String(s), 13, '#26324a', 'left', 800); T(px + pw, y1, volOf(s).toFixed(2) + ' V', 13, '#26324a', 'right', 800);
      });
    }
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, 'LCD는 스스로 빛을 내지 않아요. 백라이트의 빛이 아래 편광판 → 액정 → 위 편광판을 지나며 밝기가 정해져요. 픽셀마다 전압을 달리해 0~255의 밝기 단계를 만들어요.', PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
    textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 84), BOT.w - 32, '컬러 필터를 씌운 빨강·초록·파랑 부화소 세 개가 모여 한 픽셀의 색을 만들어요. (이 장면은 세 부화소에 같은 전압을 걸었어요.)', 12.5, '#5d6879', 18, 700);
  }
  const trans = (ax, pol) => cos2(ax - pol);
  function drawCine() {
    const E = S.te, ci = E.ci, L = teLay(), a = L.a, b = L.b, k = PHONE ? 0.8 : 1;
    panel(a.x, a.y, a.w, a.h, 14);
    T(a.x + 14, a.y + 24, '🎬 3D 극장: 두 영상을 서로 다른 편광으로', PHONE ? 14 : 15, '#26324a', 'left', 800);
    const yL = a.y + (PHONE ? 90 : 104), yR = a.y + (PHONE ? 196 : 214), yM = (yL + yR) / 2;
    const xP = a.x + 44 * k, xS = a.x + 210 * k, xG = a.x + 330 * k;
    const projector = (y, col, lab, axis) => {
      D.shadow(() => { ctx.fillStyle = '#3d4658'; D.roundRect(xP - 30 * k, y - 18 * k, 60 * k, 36 * k, 8); ctx.fill(); }, { blur: 6, y: 2 });
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(xP + 30 * k, y, 9 * k, 0, TAU); ctx.fill();
      T(xP - 6 * k, y + 4, lab, PHONE ? 11.5 : 12.5, '#fff', 'center', 800);
      sheet(xP + 62 * k, y, 24 * k, 8 * k, axis, col, { gap: 6, lw: 1.3 });
    };
    // 스크린
    D.shadow(() => { ctx.fillStyle = '#f5f7fb'; D.roundRect(xS - 10, yL - 32 * k, 20, yR - yL + 64 * k, 6); ctx.fill(); }, { blur: 8, y: 2 });
    T(xS, yR + 52 * k, '스크린', PHONE ? 12 : 13, '#26324a', 'center', 800);
    // 투사
    beamBand(xP + 74 * k, xS - 12, yL, 12 * k, 0.8, S.t); beamBand(xP + 74 * k, xS - 12, yR, 12 * k, 0.8, S.t);
    projector(yL, '#e2464b', '왼눈', 0); projector(yR, '#1f6fe0', '오른눈', 90);
    T(xP + 62 * k, yL - 32 * k, '세로 편광', PHONE ? 11 : 12, '#c0353b', 'center', 800); T(xP + 62 * k, yR - 32 * k, '가로 편광', PHONE ? 11 : 12, '#1f4fcf', 'center', 800);
    // 안경 렌즈
    const lensY = [yL, yR], axs = [ci.axL, ci.axR], lab = ['왼쪽 렌즈', '오른쪽 렌즈'];
    lensY.forEach((y, i) => {
      if (ci.on) sheet(xG, y, 28 * k, 10 * k, axs[i], '#3d4658', { gap: 6, lw: 1.3 });
      else { ctx.strokeStyle = '#9aa6b8'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(xG, y, 10 * k, 28 * k, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      T(xG, y - 34 * k, ci.on ? lab[i] + ' ' + (axs[i] === 0 ? '↕' : '↔') : '(안경 없음)', PHONE ? 11 : 12, '#26324a', 'center', 800);
    });
    // 스크린 → 렌즈 선 (왼눈 영상 빨강, 오른눈 영상 파랑)
    const tr = [[ci.on ? trans(ci.axL, 0) : 1, ci.on ? trans(ci.axL, 90) : 1], [ci.on ? trans(ci.axR, 0) : 1, ci.on ? trans(ci.axR, 90) : 1]];
    const xE = a.x + a.w - 62 * k;
    lensY.forEach((y, i) => {
      [[0, '#e2464b', -3], [1, '#1f6fe0', 3]].forEach(([j, col, off]) => {
        ctx.save(); ctx.lineWidth = 3.2; ctx.lineCap = 'round';
        ctx.strokeStyle = rgbaH(col, 0.85); ctx.beginPath(); ctx.moveTo(xS + 12, yM + (j ? 6 : -6)); ctx.lineTo(xG - 12, y + off * 2); ctx.stroke();
        const al = tr[i][j]; if (al > 0.01) { ctx.strokeStyle = rgbaH(col, 0.85 * al); ctx.beginPath(); ctx.moveTo(xG + 12, y + off * 2); ctx.lineTo(xE - 38 * k, y + off * 2); ctx.stroke(); }
        ctx.restore();
      });
    });
    // 눈에 보이는 장면
    const eyeBox = (cx, y, i, name) => {
      const w = 76 * k * 1.15, h = 64 * k;
      ctx.fillStyle = '#10151f'; D.roundRect(cx - w / 2, y - h / 2, w, h, 8); ctx.fill();
      const rr = 13 * k;
      const ball = (bx, col, al) => { if (al < 0.01) return; ctx.save(); ctx.globalAlpha = al; D.sphere(bx, y, rr, col, {}); ctx.restore(); };
      ball(cx - 9 * k, '#e2464b', tr[i][0]); ball(cx + 9 * k, '#3b82f6', tr[i][1]);
      T(cx, y - h / 2 - 6, name, PHONE ? 11 : 12, '#26324a', 'center', 800);
      const sL = tr[i][0] > 0.9 && tr[i][1] < 0.1, sR = tr[i][1] > 0.9 && tr[i][0] < 0.1, none = tr[i][0] < 0.1 && tr[i][1] < 0.1;
      const want = i === 0 ? sL : sR;
      T(cx, y + h / 2 + 14, want ? '✅ 내 눈 영상만 보여요' : none ? '❌ 아무것도 안 보여요' : sL || sR ? '❌ 반대쪽 영상만 보여요' : '❌ 두 영상이 겹쳐요', PHONE ? 10.5 : 12, want ? '#1c7a4a' : '#c0353b', 'center', 800);
    };
    eyeBox(xE, yL, 0, '왼눈에 보이는 장면'); eyeBox(xE, yR, 1, '오른눈에 보이는 장면');
    E.ciOK = ci.on && ci.axL === 0 && ci.axR === 90;
    if (E.ciOK) { T(a.x + a.w / 2, a.y + a.h - 18, '✨ 두 눈의 영상 차이로 뇌가 입체감을 느껴요', PHONE ? 13 : 14.5, '#1c7a4a', 'center', 800); }
    panel(b.x, b.y, b.w, b.h, 14);
    const px = b.x + 16, pw = b.w - 32;
    T(px, b.y + 28, '편광 안경의 원리', 14.5, '#26324a', 'left', 800);
    textBlock(px, b.y + 54, pw, '렌즈의 투과축과 같은 방향으로 편광된 영상만 통과해요. 투과축이 직각이면 그 영상은 막혀요.', 13, '#5d6879', 18, 700);
    if (!PHONE) textBlock(px, b.y + 150, pw, '두 렌즈의 투과축을 ↕ ↔ 로 바꿔서 왼눈에는 빨간 영상만, 오른눈에는 파란 영상만 보이게 맞춰 보세요.', 13, '#26324a', 18, 800);
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, '3D 영화는 왼눈용·오른눈용 영상을 서로 직교한 편광으로 한 스크린에 겹쳐 투사해요. 안경을 벗으면 두 영상이 겹쳐 흐릿해 보여요.', PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
  }
  // 광통신: 직교한 두 편광에 각각 정보를 실어요
  const BITS_A = '10110010111001010110', BITS_B = '01101001000111011001';
  function drawFiber() {
    const L = teLay(), a = L.a, b = L.b, k = PHONE ? 0.8 : 1;
    const wide = { x: MA.x, y: MA.y, w: MA.w, h: MA.h };
    panel(wide.x, wide.y, wide.w, wide.h, 14);
    T(wide.x + 14, wide.y + 24, '🌐 광섬유 속 편광 다중화 (개략)', PHONE ? 14 : 15, '#26324a', 'left', 800);
    const x0 = wide.x + 96 * k, x1 = wide.x + wide.w - 96 * k, yA = wide.y + (PHONE ? 100 : 132), yB = yA + (PHONE ? 70 : 90), ym = (yA + yB) / 2;
    // 송신기
    const tx = (y, col, lab, bits, ang) => {
      D.shadow(() => { ctx.fillStyle = '#3d4658'; D.roundRect(wide.x + 14, y - 22 * k, 62 * k, 44 * k, 8); ctx.fill(); }, { blur: 6, y: 2 });
      T(wide.x + 14 + 31 * k, y + 5, lab, PHONE ? 11 : 12.5, '#fff', 'center', 800);
      dbl(wide.x + 14 + 31 * k, y - 32 * k, 11 * k, ang, col, 2.6);
    };
    tx(yA, '#f26b3a', '레이저 ①', BITS_A, 0); tx(yB, '#2f6bff', '레이저 ②', BITS_B, 90);
    // 광섬유
    const xm = x0 + 50 * k, xj = x1 - 50 * k;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = '#c7d0e0'; ctx.lineWidth = 16 * k; ctx.beginPath(); ctx.moveTo(x0, yA); ctx.lineTo(xm, ym); ctx.lineTo(xj, ym); ctx.lineTo(x1, yA); ctx.moveTo(x0, yB); ctx.lineTo(xm, ym); ctx.moveTo(xj, ym); ctx.lineTo(x1, yB); ctx.stroke();
    ctx.strokeStyle = '#eef2fa'; ctx.lineWidth = 10 * k; ctx.stroke(); ctx.restore();
    // 펄스 (이동 거리에 따라 위치 계산)
    const gap = 26 * k, sp = 70 * k;
    const lineA = [[x0, yA], [xm, ym], [xj, ym], [x1, yA]], lineB = [[x0, yB], [xm, ym], [xj, ym], [x1, yB]];
    const along = (pts, s) => {
      let rem = s;
      for (let i = 0; i < pts.length - 1; i++) { const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy); if (rem <= l) return [pts[i][0] + dx * rem / l, pts[i][1] + dy * rem / l, true]; rem -= l; }
      return null;
    };
    const totA = lineA.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - lineA[i - 1][0], p[1] - lineA[i - 1][1]) : 0), 0);
    const totB = lineB.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - lineB[i - 1][0], p[1] - lineB[i - 1][1]) : 0), 0);
    const tt = RM ? 0 : S.t * sp, n0 = Math.floor(tt / gap);
    const draw1 = (pts, tot, bits, col) => {
      for (let n = n0; n > n0 - Math.ceil(tot / gap) - 1; n--) {
        const s = tt - n * gap; if (s < 0 || s > tot) continue;
        const bit = bits[((n % bits.length) + bits.length) % bits.length] === '1';
        const p = along(pts, s); if (!p) continue;
        if (bit) { D.glow(p[0], p[1], 11 * k, col, 0.8); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], 4.2 * k, 0, TAU); ctx.fill(); }
        else { ctx.strokeStyle = rgbaH(col, 0.35); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p[0], p[1], 3.2 * k, 0, TAU); ctx.stroke(); }
      }
    };
    draw1(lineA, totA, BITS_A, '#f26b3a'); draw1(lineB, totB, BITS_B, '#2f6bff');
    // 수신: 편광 분리기
    const rx = wide.x + wide.w - 14;
    const nArr = Math.floor((tt - totA) / gap);
    const rxb = (y, col, lab, bits) => {
      D.shadow(() => { ctx.fillStyle = '#3d4658'; D.roundRect(rx - 62 * k, y - 22 * k, 62 * k, 44 * k, 8); ctx.fill(); }, { blur: 6, y: 2 });
      T(rx - 31 * k, y + 5, lab, PHONE ? 11 : 12.5, '#fff', 'center', 800);
      let str = ''; for (let i = 7; i >= 0; i--) str += bits[(((nArr - i) % bits.length) + bits.length) % bits.length];
      T(rx - 31 * k, y - 32 * k, str.split('').join(' '), PHONE ? 10.5 : 12, col, 'center', 800);
    };
    rxb(yA, '#c4501b', '수신기 ①', BITS_A); rxb(yB, '#1f4fcf', '수신기 ②', BITS_B);
    D.label(xm + (xj - xm) / 2, ym - 16 * k, '한 가닥의 광섬유', { size: PHONE ? 11.5 : 12.5, bg: '#fff', color: '#26324a', border: '#c7d0e0' });
    D.label(xm - 8 * k, ym + 26 * k, '합치기', { size: PHONE ? 10.5 : 11.5, bg: '#fff', color: '#5d6879', border: '#c7d0e0' });
    D.label(xj + 8 * k, ym + 26 * k, '편광으로 나누기', { size: PHONE ? 10.5 : 11.5, bg: '#fff', color: '#5d6879', border: '#c7d0e0' });
    textBlock(wide.x + 16, wide.y + wide.h - (PHONE ? 104 : 92), wide.w - 32, '서로 직교한 두 편광은 한 광섬유 속에서도 섞이지 않아서 각각 다른 정보를 실을 수 있어요. 두 편광을 합치면 같은 광섬유로 보내는 정보량이 2배가 돼요(편광 다중화). 0은 꺼짐, 1은 켜짐인 펄스예요.', PHONE ? 13 : 14, '#26324a', PHONE ? 19 : 21, 800);
    panel(BOT.x, BOT.y, BOT.w, BOT.h, 14);
    textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, '광통신에서는 편광뿐 아니라 파장도 달리해서 정보를 더 실어요. 편광으로 정보를 나누는 방법은 디지털 정보 기술에서 전송량을 늘리는 데 쓰여요.', PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800);
  }

  /* ---------- 단계 진행(매 프레임) ---------- */
  function stepAll(dt) {
    const P = S.pol, M = S.mk, V = S.sv, E = S.te;
    P.angD = SciSim.approach(P.angD, P.ang, dt, 16);
    P.bar = SciSim.approach(P.bar, polT(P.n, P.ang), dt, 10);
    if (S.mode === 'pol' && P.n === 3 && polT(3, P.ang) >= 0.2) { P.midHold += dt; if (P.midHold > 0.5) P.seen3 = true; } else P.midHold = 0;
    M.thD = SciSim.approach(M.thD, M.th, dt, 14); M.filD = SciSim.approach(M.filD, M.fil, dt, 14);
    if (V.auto) {
      V.ang = Math.min(180, V.ang + 45 * dt); slM.set(Math.round(V.ang)); recordBins();
      if (V.ang >= 180) { V.auto = false; updateCtl(); }
    }
    V.angD = SciSim.approach(V.angD, V.ang, dt, 22);
    E.VD = SciSim.approach(E.VD, E.V, dt, 12);
    if (S.mode === 'survey' && (S.t * 3 | 0) !== (S._mt | 0)) { S._mt = S.t * 3; const n = $('#measureNote'); if (n) n.textContent = measureNote(); }
  }

  /* ---------- 포인터 ---------- */
  const polSetY = (y) => { const G = polGeom(); setAng(clamp(Math.round((y - (G.cy - G.ry)) / (2 * G.ry) * 180), 0, 180)); };
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'pol') {
        const G = polGeom(), x = G.xs[G.ri];
        if (Math.abs(p.x - x) < 36 && Math.abs(p.y - G.cy) < G.ry + 16) { S.pol.drag = true; polSetY(p.y); Sound.click(); return true; }
      }
      return false;
    },
    move(p) { if (S.pol.drag) polSetY(p.y); },
    up() { S.pol.drag = false; },
    hover(p) {
      if (S.mode === 'pol') { const G = polGeom(); if (Math.abs(p.x - G.xs[G.ri]) < 36 && Math.abs(p.y - G.cy) < G.ry + 16) return 'ns-resize'; }
      return 'default';
    },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'pol') {
      const P = S.pol;
      L1 = P.n === 1 ? '편광판의 투과축' : '돌리는 판의 투과축'; a = P.ang + '°';
      L2 = '화면 밝기'; b = levelWord(polT(P.n, P.ang));
      L3 = '편광판 수'; c = P.n + '장';
    } else if (S.mode === 'make') {
      const M = S.mk;
      if (M.sub === 'refl') {
        const gs = glareShare(M.th), sp = Math.round(gs.s * 100);
        L1 = '입사각 = 반사각'; a = M.th + '°';
        L2 = '수평 : 수직 진동'; b = sp + ' : ' + (100 - sp);
        L3 = '눈부심 (안경 없을 때 = 100)'; c = String(Math.round(glareOf(M.th, M.gl) * 100));
      } else {
        const p = skyP(+M.dir);
        L1 = '태양과 이루는 각'; a = M.dir + '°';
        L2 = '하늘빛의 편광'; b = p >= 0.55 ? '뚜렷함' : p >= 0.2 ? '조금 있음' : '거의 없음';
        L3 = '하늘 밝기 (필터 없음 = 100)'; c = String(Math.round(skyB(+M.dir, M.fil) * 100));
      }
    } else if (S.mode === 'survey') {
      const d = curDev(), n = DEVS.filter((x) => S.sv.done[keyOf(x.id, false)]).length;
      L1 = '편광판 각도'; a = Math.round(S.sv.ang) + '°';
      L2 = '센서 투과량'; b = Math.round(sensorAt(d, S.sv.lying, S.sv.ang)) + ' %';
      L3 = '측정을 마친 기기'; c = n + ' / 5';
    } else if (S.te.sub === 'lcd') {
      L1 = '전압'; a = S.te.V.toFixed(2) + ' V';
      L2 = '액정이 돌린 각'; b = Math.round(twistOf(S.te.V)) + '°';
      L3 = '밝기 단계'; c = lcdLevel(S.te.V) + ' / 255';
    } else if (S.te.sub === 'cine') {
      const ci = S.te.ci;
      L1 = '안경'; a = ci.on ? '쓰고 있어요' : '벗었어요';
      L2 = '두 렌즈의 투과축'; b = ci.on ? (ci.axL === 0 ? '↕' : '↔') + ' · ' + (ci.axR === 0 ? '↕' : '↔') : '—';
      L3 = '입체 영상'; c = ciOK() ? '제대로 보여요' : '아직이에요';
    } else {
      L1 = '편광 채널'; a = '2개 (↕, ↔)'; L2 = '전송량'; b = '1채널의 2배'; L3 = '신호'; c = '켜짐 1 · 꺼짐 0';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  const ciOK = () => S.te.ci.on && S.te.ci.axL === 0 && S.te.ci.axR === 90;
  const doneCount = () => DEVS.filter((x) => S.sv.done[keyOf(x.id, false)]).length;
  function resetSurvey() { S.sv = { dev: 'A', lying: false, ang: 0, angD: 0, auto: false, bins: { AN: { 0: true } }, done: {}, prev: 0 }; slM.set(0); }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '편광판: 빛의 진동 방향 거르기', short: '편광판', icon: '🕶️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 편광 선글라스를 쓰고 스마트폰을 보면 화면이 어두워지는 때가 있는 건 왜일까?</p>' +
        '<div class="si-link">🔗 <b>중학교 \'빛과 파동\'과 물리학에서</b> 빛이 파동이고, 파동이 만나면 간섭이 일어난다는 것을 배웠어요. 앞 차시(비누막·회절)는 모두 파동의 성질이었죠. 이번에는 빛이 <b>횡파</b>여서만 생기는 현상, <b>편광</b>을 알아봐요. (소리는 종파라서 편광이 없어요.)</div>' +
        '<p>빛은 전기장이 <b>진동하는 방향</b>을 가진 횡파예요. 태양이나 백열등의 <b>자연광</b>은 모든 방향으로 진동하는 빛이 섞여 있어요. <b>편광판</b>은 특정한 방향(투과축)으로 진동하는 빛만 통과시켜요. 이 단계에서는 투과량이 어떻게 변하는지 <b>정성적으로</b> 살펴봐요.</p>',
      features: ['pol'],
      setup() { S.pol.n = 2; setAng(0); S.pol.angD = 0; S.pol.bar = 1; S.pol.seen3 = false; S.show.mid = false; S.show.selA = false; setScene('pol'); },
      recap: '편광판은 투과축 방향으로 진동하는 빛만 통과시켜요. 두 장을 겹치면 나란할 때 가장 밝고, 직각이면 거의 어둡고, 그 사이에서는 점점 변해요. 직각인 두 판 사이에 45° 판을 끼우면 약하게 다시 통과해요.',
      summary: '<ul><li>빛은 <b>횡파</b>예요. 전기장이 진동하는 방향이 있고, 자연광은 모든 방향이 섞여 있어요.</li><li><b>편광판</b>을 지난 빛은 한 방향 진동만 남은 <b>편광</b>이 돼요. (자연광은 한 장을 지나면 대략 절반 정도 남아요.) 판을 돌려도 밝기는 그대로예요.</li><li>두 장을 겹치고 한 장을 돌리면 투과축이 <b>나란할 때 가장 밝고</b>, 점점 어두워지다가 <b>직각(90°)에서 거의 0</b>, 180°에서 다시 밝아요.</li><li>직각인 두 판 사이에 <b>45° 판</b>을 끼우면 빛이 다시 약하게 통과해요. 가운데 판이 진동 방향을 비틀기 때문이에요.</li><li>줄 파동도 비슷해요. 세로 틈은 세로 진동만 통과시키고 가로 진동은 막아요.</li></ul>',
      missions: [
        {
          title: '화면 어둡게 만들기',
          goal: '편광판 <b>두 장</b>을 겹친 채 돌리는 판(P₂)의 각도를 바꿔 보세요. 화면이 <b>거의 꺼질 때</b>까지 돌려요.',
          hint: '각도를 0°에서 천천히 키워 보세요. 판을 위아래로 끌어도 돼요. 밝기가 줄다가 90° 근처에서 거의 사라져요.',
          setup() { S.pol.n = 2; setAng(0); S.show.mid = false; S.show.selA = false; setScene('pol'); },
          check: () => S.pol.n === 2 && Math.abs(S.pol.ang - 90) <= 3,
          hold: 0.6,
          status: () => mark(S.pol.n === 2 && Math.abs(S.pol.ang - 90) <= 3) + ' 돌리는 판 ' + S.pol.ang + '° · 화면 ' + levelWord(polT(S.pol.n, S.pol.ang)),
          explain: '두 편광판의 투과축이 서로 <b>직각(90°)</b>이면 첫 판을 지난 진동을 두 번째 판이 막아서 빛이 거의 통과하지 못해요. 나란하면(0°) 가장 많이 통과하고, 그 사이에서는 각도가 커질수록 점점 줄어요. 180°가 되면 다시 나란해져서 처음처럼 밝아요.',
        },
        {
          title: '세 장 실험 예측하기', manual: true,
          goal: '편광판을 <b>세 장</b>으로 바꾸고 가운데 판을 돌려 보세요. 직각인 두 판 사이에 45° 판을 끼우면 어떻게 될까요? 관찰한 뒤 문장을 완성해요.',
          hint: '“세 장”을 누르면 가운데 판이 45°로 놓여요. 가운데 판의 각도를 0°나 90°로도 돌려 보세요.',
          setup() { S.show.mid = true; S.show.selA = true; SEL_A.reset(); S.pol.seen3 = false; S.pol.n = 2; setAng(0); setScene('pol'); },
          check() {
            if (!S.pol.seen3) return '“세 장”으로 바꿔 가운데 판을 45° 근처로 두고, 화면이 다시 밝아지는지 직접 확인해 보세요.';
            return SEL_A.grade();
          },
          status: () => mark(S.pol.seen3) + ' 세 장 실험 관찰 &nbsp; · 고른 문장 ' + SEL_A.count() + ' / 3',
          explain: '직각인 두 판(0°, 90°) 사이에 <b>45° 판</b>을 끼우면 빛이 <b>약하게 다시 통과</b>해요. 첫 판을 지난 세로 진동이 45° 판을 지나면 45° 방향 진동이 되고, 이 진동에는 마지막 판의 투과축 방향 성분이 들어 있기 때문이에요. 가운데 판의 투과축이 0°나 90°이면 다시 어두워져요. 가운데 판이 진동 방향을 <b>비틀어</b> 준 거예요.',
        },
        {
          type: 'quiz', title: '편광판 한 장을 돌리면?',
          goal: '자연광이 편광판 <b>한 장</b>을 지나고 있어요. 이 판을 천천히 돌리면 판 뒤의 밝기는 어떻게 변할까요?',
          setup() { S.show.mid = true; S.show.selA = false; S.pol.n = 1; setAng(0); setScene('pol'); },
          choices: ['돌려도 밝기가 거의 그대로예요 (자연광의 절반 정도)', '90°에서 완전히 어두워졌다가 180°에서 다시 밝아져요', '돌릴수록 점점 더 밝아져요', '편광판이 빛의 색을 바꿔서 색이 달라져요'],
          answer: 0,
          feedback: ['', '두 장을 겹쳤을 때의 이야기예요. 자연광은 모든 방향으로 진동하므로 한 장은 어느 방향으로 두어도 같은 양이 통과해요.', '편광판이 빛을 더 세게 만들지는 않아요. 일부를 걸러 낼 뿐이에요.', '편광판은 진동 방향만 걸러 낼 뿐 빛의 색(파장)은 바꾸지 않아요.'],
          explain: '자연광은 <b>모든 방향</b>으로 진동하는 빛이 섞여 있어서, 편광판을 어느 방향으로 돌려도 같은 양(대략 절반)이 통과해요. 밝기가 달라지려면 이미 편광된 빛이거나 두 번째 판이 있어야 해요. 편광판은 색을 바꾸지 않아요.',
        },
      ],
    },
    {
      title: '편광 만들기: 반사와 산란', short: '편광 만들기', icon: '🚗', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 편광판이 자연광을 한 방향 진동만 남은 편광으로 바꾼다는 것을 알았어요. 그런데 편광판 말고도 자연에서 빛이 편광되는 일이 있어요.</div>' +
        '<p>물웅덩이나 도로에서 <b>반사</b>한 빛은 수평으로 진동하는 성분이 더 많은 <b>부분 편광</b>이에요. 맑은 하늘의 빛은 공기 분자에 <b>산란</b>해서 편광돼요. 편광 선글라스와 사진용 편광 필터는 이런 빛을 골라 걸러 내요.</p>',
      features: ['make'],
      setup() { S.mk.sub = 'refl'; S.mk.th = 30; S.mk.thD = 30; S.mk.gl = 'n'; S.mk.dir = '90'; S.mk.fil = 0; S.mk.filD = 0; S.mk.filMin = 0; S.mk.filMax = 0; S.mk.seenSky = false; slI.set(30); slF.set(0); S.show.selB = false; setScene('make'); },
      recap: '반사한 빛은 수평 진동이 더 많은 부분 편광이고, 하늘빛은 산란으로 편광돼요. 투과축이 세로인 편광 선글라스는 수평 진동을 막아 반사 눈부심을 줄여요. 판, 반사, 산란이 편광을 만드는 세 가지 방법이에요.',
      summary: '<ul><li><b>편광을 만드는 방법</b>: ① 편광판, ② 반사, ③ 산란.</li><li>물·도로에 반사한 빛은 <b>수평으로 진동하는 성분</b>이 더 많은 부분 편광이에요. 입사각이 50° 안팎일 때 가장 뚜렷하고, 입사각이 작으면 거의 편광되지 않아요.</li><li><b>편광 선글라스</b>는 투과축을 세로로 해서 수평 진동(반사 눈부심)을 막아요. 낚시꾼이 수면 속 물고기를 보는 데도 쓰여요.</li><li>맑은 하늘의 빛은 산란 때문에 <b>태양과 직각인 방향</b>에서 편광이 가장 뚜렷해요. 카메라의 편광 필터를 돌리면 하늘을 더 푸르게(어둡게) 찍을 수 있어요. 구름은 편광되지 않아 밝기가 그대로예요.</li></ul>',
      missions: [
        {
          title: '눈부심 줄이기',
          goal: '도로에서 반사한 햇빛의 눈부심을 편광 선글라스로 줄여 보세요. 눈부심이 안경 없을 때의 <b>10 이하</b>가 되도록 입사각과 투과축을 찾아요.',
          hint: '투과축을 “세로”로 하고 입사각을 천천히 바꿔 보세요. 50° 안팎에서 눈부심이 가장 많이 줄어요. “가로”는 오히려 눈부심을 통과시켜요.',
          setup() { S.mk.sub = 'refl'; S.mk.gl = 'n'; S.mk.th = 30; slI.set(30); S.show.selB = false; setScene('make'); },
          check: () => S.mk.sub === 'refl' && S.mk.gl === 'v' && Math.round(glareOf(S.mk.th, 'v') * 100) <= 10,
          hold: 0.8,
          status: () => mark(S.mk.gl === 'v') + ' 투과축 세로 &nbsp; ' + mark(S.mk.gl === 'v' && Math.round(glareOf(S.mk.th, 'v') * 100) <= 10) + ' 눈부심 ' + Math.round(glareOf(S.mk.th, S.mk.gl) * 100) + ' (입사각 ' + S.mk.th + '°)',
          explain: '반사광은 수평으로 진동하는 성분이 훨씬 많아요. 투과축이 <b>세로</b>인 선글라스는 수평 진동을 막으므로 눈부심이 크게 줄어요. 입사각이 <b>50° 안팎</b>일 때 반사광이 거의 수평 진동만 남아서 눈부심이 거의 사라져요. 입사각이 작으면 반사광이 거의 편광되지 않아 효과가 작아요.',
        },
        {
          title: '편광이 만들어지는 방법 연결하기', manual: true,
          goal: '<b>하늘 산란</b> 장면에서 사진 필터를 60° 이상 돌려 보고, 편광을 만드는 세 가지 방법(판·반사·산란)의 특징을 문장으로 완성하세요.',
          hint: '“하늘 산란”을 누르고 태양과 90°인 방향에서 필터를 돌려 보세요. 하늘 밝기 막대가 크게 변해요.',
          setup() { S.show.selB = true; SEL_B.reset(); S.mk.seenSky = false; S.mk.filMin = S.mk.fil; S.mk.filMax = S.mk.fil; setScene('make'); },
          check() {
            if (!S.mk.seenSky) return '“🌤️ 하늘 산란” 장면도 살펴보고 필터를 돌려 보세요.';
            if (S.mk.filMax - S.mk.filMin < 60) return '하늘 장면에서 필터를 60° 이상 돌려 밝기 변화를 확인해 보세요.';
            return SEL_B.grade();
          },
          status: () => mark(S.mk.seenSky) + ' 하늘 장면 &nbsp; ' + mark(S.mk.filMax - S.mk.filMin >= 60) + ' 필터 돌려 보기 &nbsp; · 고른 문장 ' + SEL_B.count() + ' / 3',
          explain: '<b>편광판</b>은 한 방향 진동만 통과시켜 편광을 만들어요. <b>반사</b>한 빛은 수평 진동이 더 많은 부분 편광이에요. <b>산란</b>한 하늘빛은 태양과 직각인 방향에서 편광이 가장 뚜렷하므로, 사진 필터를 돌리면 그 방향의 하늘 밝기가 가장 크게 변해요.',
        },
        {
          type: 'quiz', title: '낚시용 편광 안경',
          goal: '낚시꾼이 편광 안경을 쓰면 수면 속 물고기가 더 잘 보여요. 그 까닭은?',
          setup() { S.show.selB = false; S.mk.sub = 'refl'; S.mk.th = 50; slI.set(50); S.mk.gl = 'v'; setScene('make'); },
          choices: ['수면에서 반사된 빛(수평 편광이 많은 눈부심)을 줄여서 물속에서 오는 빛이 상대적으로 잘 보여요', '안경이 물고기를 확대해서 보여 줘요', '안경이 물속의 빛을 더 밝게 만들어 줘요', '안경이 물고기의 색을 바꿔서 눈에 띄게 해요'],
          answer: 0,
          feedback: ['', '편광 안경은 렌즈처럼 확대하지 않아요.', '안경은 빛을 만들어 내지 못해요. 일부를 걸러 낼 뿐이에요.', '편광판은 색을 바꾸지 않아요. 진동 방향만 걸러 내요.'],
          explain: '수면에서 반사한 빛은 수평 진동이 많은 편광이라, 투과축이 세로인 안경이 이를 막아 줘요. 그러면 수면의 눈부심이 줄어서 물속에서 올라오는 빛(물고기)이 더 잘 보여요.',
        },
      ],
    },
    {
      title: '디스플레이 조사: 누구의 빛이 편광일까?', short: '디스플레이 조사', icon: '🔬', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 편광된 빛은 편광판을 돌릴 때 밝기가 변하고, 편광되지 않은 빛은 변하지 않는다는 것을 알았어요. 이 성질로 <b>빛이 편광되어 있는지</b> 조사할 수 있어요.</div>' +
        '<p><b>탐구 활동</b>: 광센서 앞에 편광판을 놓고 0°~180°로 돌리면서 투과량을 재 보세요. 모의 기기 5종(모니터, 노트북, 스마트폰, 백열등, 맑은 하늘)을 차례로 측정해서 표를 완성하고, 편광 여부와 투과축 방향을 판단해요.</p>',
      features: ['survey'],
      setup() { resetSurvey(); S.show.selC = false; setScene('survey'); updateCtl(); },
      recap: '편광판을 돌릴 때 센서 투과량의 최댓값과 최솟값의 차이가 클수록 빛이 뚜렷하게 편광된 거예요. LCD 모니터와 노트북은 뚜렷하고, 백열등은 편광되지 않았어요. 기기를 눕히면 최대·최소 각도가 90° 옮겨 가요.',
      summary: '<ul><li><b>조사 방법</b>: 광센서 앞에서 편광판을 0°~180°로 돌리며 투과량을 재요.</li><li>최댓값과 최솟값의 <b>차이가 클수록</b> 편광이 뚜렷해요. 차이가 없으면 편광되지 않은 빛(백열등)이에요.</li><li>LCD 모니터와 노트북은 투과량이 100 %와 3~5 % 사이에서 변하는 <b>뚜렷한 편광</b>이에요. 투과축 방향이 기기에 고정되어 있어서, 기기를 눕히면 최대 각도가 <b>90° 옮겨 가요</b>.</li><li>스마트폰(OLED)과 하늘은 변화가 작은 <b>약한 편광</b>이에요. (모의 기기의 예시 자료예요. 실제 제품은 달라요.)</li></ul>',
      missions: [
        {
          title: '5개 기기 측정하기',
          goal: '기기를 하나씩 고르고 편광판을 <b>0°에서 180°까지</b> 돌려 투과량을 재세요. 5개 기기의 측정을 모두 마쳐 표를 채워요.',
          hint: '“자동으로 돌리며 측정”을 누르면 0°부터 180°까지 저절로 돌아가요. 슬라이더를 직접 끌어도 돼요. 표의 칸이 채워지면 완료예요.',
          setup() { S.sv.lying = false; S.show.selC = false; setScene('survey'); updateCtl(); },
          check: () => doneCount() === 5,
          hold: 0.3,
          status: () => DEVS.map((d) => mark(!!S.sv.done[keyOf(d.id, false)]) + d.id.replace('D', '전구').replace('E', '하늘')).join(' ') + ' &nbsp; (' + doneCount() + ' / 5)',
          explain: '편광판을 돌릴 때 센서 투과량이 크게 변하는 기기는 빛이 편광된 거예요. 모니터 A와 노트북 B는 100 %와 3~5 % 사이에서 크게 변하고, 백열등은 늘 100 %로 일정해요. 스마트폰 C와 하늘은 변화가 작은 약한 편광이에요.',
        },
        {
          title: '편광이 뚜렷한 기기 고르기', manual: true,
          goal: '표의 최대·최소 차이를 보고 기기마다 빛이 <b>뚜렷한 편광</b>인지, <b>약한 편광</b>인지, <b>편광이 아닌지</b> 판정하세요.',
          hint: '차이가 아주 크면(100 %와 3~5 %) 뚜렷한 편광, 차이가 작으면(70 %나 55 %까지만 내려감) 약한 편광, 차이가 없으면 편광 없음이에요.',
          setup() { S.show.selC = true; SEL_C.reset(); setScene('survey'); },
          check() {
            if (doneCount() < 5) return '먼저 5개 기기를 모두 측정해서 표를 채워 주세요. (' + doneCount() + ' / 5)';
            return SEL_C.grade();
          },
          status: () => '측정 ' + doneCount() + ' / 5 &nbsp; · 고른 문장 ' + SEL_C.count() + ' / 5',
          explain: '<b>모니터 A·노트북 B</b>: 최대 100 %, 최소 3~5 %로 차이가 커서 뚜렷한 편광이에요(LCD 속 위 편광판을 지나온 빛). <b>스마트폰 C·맑은 하늘</b>: 차이가 작아 약한 편광이에요. <b>백열등</b>은 모든 각도에서 같아서 편광되지 않은 자연광이에요.',
        },
        {
          type: 'quiz', title: '스마트폰을 눕혔더니 어두워졌어요',
          goal: '편광 선글라스를 쓰고 LCD 스마트폰을 보다가 폰을 옆으로 눕혔더니 화면이 갑자기 어두워졌어요. 그 까닭은?',
          setup() { S.show.selC = false; setScene('survey'); },
          choices: ['LCD 화면의 빛은 편광되어 있어서, 눕히면 선글라스의 투과축과 직각이 되어 빛이 막히기 때문이에요', '눕히면 스마트폰의 배터리가 방전되기 때문이에요', '선글라스가 화면의 색을 바꿔서 어둡게 보이기 때문이에요', '눕히면 백라이트가 저절로 꺼지기 때문이에요'],
          answer: 0,
          feedback: ['', '배터리와는 상관없어요. 화면 빛이 편광이라는 것과 관련이 있어요.', '편광판은 색을 바꾸지 않아요.', '백라이트는 그대로 켜져 있어요. 달라진 것은 편광 방향과 안경의 투과축이 이루는 각이에요.'],
          explain: 'LCD 화면에서 나오는 빛은 위 편광판의 투과축 방향으로 <b>편광</b>되어 있어요. 폰을 눕히면 이 편광 방향이 90° 돌아가 선글라스의 투과축과 <b>직각</b>이 되고, 그러면 빛이 거의 차단돼서 화면이 어두워 보여요.',
        },
      ],
    },
    {
      title: '정보 기술: LCD와 3D 극장', short: '정보 기술', icon: '📱', phase: '적용',
      intro: '<div class="si-link">🔗 <b>통합과학의 디지털 신호</b>와 <b>앞 단계의 조사</b>가 만나요. LCD 모니터의 빛이 편광인 까닭, 그리고 영상의 밝기가 0~255의 디지털 값으로 정해지는 과정을 알아봐요.</div>' +
        '<p><b>LCD</b>의 한 픽셀은 백라이트 → 아래 편광판 → 액정 → 위 편광판으로 이루어져요. 액정에 거는 <b>전압</b>이 편광 방향을 돌리는 정도를 정해서 밝기 단계(계조)를 만들어요. 편광은 <b>3D 영화 안경</b>과 <b>광통신</b>에도 쓰여요.</p>',
      features: ['tech'],
      setup() { S.te.sub = 'lcd'; S.te.V = 0; S.te.VD = 0; slV.set(0); S.te.lcdSeen = true; S.te.ci = { on: false, axL: 0, axR: 0 }; S.te.seenCine = false; S.te.seenFiber = false; S.show.selD = false; setScene('tech'); },
      recap: 'LCD는 전압으로 액정이 빛의 편광 방향을 돌리는 정도를 조절해 위 편광판을 지나는 밝기를 정해요(0~255의 계조). 3D 극장은 직교한 두 편광으로 눈마다 다른 영상을 보내고, 광통신은 직교한 두 편광에 정보를 따로 실어 전송량을 늘려요.',
      summary: '<ul><li><b>LCD 한 픽셀</b>: 백라이트(자연광) → 아래 편광판(세로) → 액정층 → 위 편광판(가로). 전압이 꺼지면 액정이 편광 방향을 90° 돌려 밝고, 전압이 크면 돌려 주지 못해 어두워요. 중간 전압은 중간 밝기예요.</li><li>밝기는 <b>8비트 256단계(0~255)</b>의 계조예요. 영상 신호 값마다 전압이 정해져 있고(예: 128은 약 2.5 V), 컬러 필터를 씌운 R·G·B 부화소가 색을 만들어요.</li><li><b>3D 영화</b>: 왼눈·오른눈 영상을 서로 직교한 편광으로 투사하고, 안경의 편광 필터가 각각의 눈에 맞는 영상만 통과시켜요.</li><li><b>광통신</b>: 서로 직교한 두 편광에 서로 다른 정보를 실으면 같은 광섬유로 보내는 정보량이 <b>2배</b>가 돼요(편광 다중화).</li></ul>',
      missions: [
        {
          title: 'LCD 픽셀 밝기 128 만들기',
          goal: 'LCD 한 픽셀에 거는 <b>전압</b>을 조절해서 밝기 단계를 <b>128 (±5)</b>로 맞춰 보세요.',
          hint: '전압이 0 V이면 가장 밝은 255이고 5 V이면 0이에요. 중간 정도인 약 2.5 V 근처에서 128이 돼요.',
          setup() { S.te.sub = 'lcd'; S.show.selD = false; setScene('tech'); },
          check: () => S.te.sub === 'lcd' && Math.abs(lcdLevel(S.te.V) - 128) <= 5,
          hold: 0.8,
          status: () => mark(Math.abs(lcdLevel(S.te.V) - 128) <= 5) + ' 밝기 ' + lcdLevel(S.te.V) + ' / 목표 128 (±5) · 전압 ' + S.te.V.toFixed(2) + ' V',
          explain: '전압이 클수록 액정의 비틂이 풀려서 편광 방향을 덜 돌려 주고, 그만큼 위 편광판을 덜 통과해요. 전압 0 V에서는 90° 돌려 가장 밝은 <b>255</b>, 5 V에서는 0이에요. 신호 값 <b>128</b>은 중간쯤인 <b>약 2.5 V</b>로 만들어요.',
        },
        {
          title: '3D 안경과 편광 다중화', manual: true,
          goal: '<b>3D 극장</b> 장면에서 안경을 쓰고 두 렌즈의 투과축을 맞춰 왼눈에는 빨간 영상, 오른눈에는 파란 영상만 보이게 하세요. <b>광통신</b> 장면도 본 뒤 문장을 완성해요.',
          hint: '“안경 쓰기”를 누르고 왼쪽 렌즈는 ↕(세로), 오른쪽 렌즈는 ↔(가로)로 맞춰요. 왼눈 영상이 세로 편광이기 때문이에요.',
          setup() { S.show.selD = true; SEL_D.reset(); S.te.seenCine = false; S.te.seenFiber = false; setScene('tech'); },
          check() {
            if (!S.te.seenCine) return '“🎬 3D 극장” 장면에서 안경을 써 보세요.';
            if (!ciOK()) return '안경을 쓰고 왼쪽 렌즈는 ↕, 오른쪽 렌즈는 ↔로 맞춰 각 눈에 맞는 영상만 보이게 하세요.';
            if (!S.te.seenFiber) return '“🌐 광통신” 장면도 살펴보세요.';
            return SEL_D.grade();
          },
          status: () => mark(S.te.seenCine) + ' 3D 극장 &nbsp; ' + mark(ciOK()) + ' 안경 맞추기 &nbsp; ' + mark(S.te.seenFiber) + ' 광통신 &nbsp; · 고른 문장 ' + SEL_D.count() + ' / 2',
          explain: '3D 극장은 왼눈용 영상은 세로, 오른눈용 영상은 가로로 <b>직교한 편광</b>으로 투사해요. 안경의 왼쪽 렌즈(세로 투과)는 왼눈 영상만, 오른쪽 렌즈(가로 투과)는 오른눈 영상만 통과시켜 눈마다 다른 영상을 보게 해요. 광통신에서도 직교한 두 편광에 정보를 따로 실으면 전송량이 <b>2배</b>가 돼요.',
        },
        {
          type: 'quiz', title: '편광 안경으로 LCD 모니터를 보면?',
          goal: '편광 안경을 쓰고 LCD 모니터를 보다가 머리를 옆으로 기울였더니 화면이 꺼진 것처럼 보였어요. 그 까닭은?',
          setup() { S.show.selD = false; S.te.sub = 'lcd'; S.te.V = 0; slV.set(0); setScene('tech'); },
          choices: ['모니터 빛은 위 편광판 때문에 한 방향으로 편광되어 있어서, 안경의 투과축과 직각이 되는 각도에서는 차단되기 때문이에요', '머리를 기울이면 모니터의 전원이 꺼지기 때문이에요', '안경이 모니터의 빛을 모두 흡수하기 때문이에요', '모니터의 주사율 때문에 깜박이기 때문이에요'],
          answer: 0,
          feedback: ['', '전원은 그대로예요. 보는 각도에 따라 안경의 투과축과 빛의 편광 방향이 이루는 각이 달라져요.', '안경은 한 방향 진동만 통과시켜요. 모든 빛을 흡수하지는 않아요.', '깜박임이 아니라 편광 방향과 투과축 사이의 각도 때문이에요.'],
          explain: 'LCD의 빛은 위 편광판의 투과축 방향으로 편광되어 있어요. 편광 안경의 투과축이 이 방향과 <b>직각</b>이 되면 빛이 차단돼서 화면이 꺼진 것처럼 보여요. 나란하면 밝게 보여요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hq-polarization', mount: '#game', badge: '편광 탐험가', homeHref: '../../index.html#hq',
    featureLabels: { pol: '🕶️ 편광판 · 줄 파동 비유', make: '🚗 반사·산란이 만드는 편광', survey: '🔬 센서 + 편광판 측정', tech: '📱 LCD · 3D 극장 · 광통신' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetSurvey();
  setScene('pol');
  updateCtl();
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepAll(dt);
    ctx.clearRect(0, 0, VW, VH);
    if (S.mode === 'pol') { drawPol(); panel(BOT.x, BOT.y, BOT.w, BOT.h, 14); textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, polBottomText(), PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800); textBlock(BOT.x + 16, BOT.y + (PHONE ? 98 : 84), BOT.w - 32, '막대의 길이는 정성적인 그림이에요. 각도가 커질수록 밝기가 어떻게 달라지는지 모양으로 읽어 보세요.', 12.5, '#5d6879', 18, 700); }
    else if (S.mode === 'make') drawMake();
    else if (S.mode === 'survey') { drawSurvey(); panel(BOT.x, BOT.y, BOT.w, BOT.h, 14); textBlock(BOT.x + 16, BOT.y + 28, BOT.w - 32, '편광판을 돌릴 때 센서 투과량이 크게 변하면 빛이 편광된 거예요. 변화가 없으면 편광되지 않은 빛이에요. 측정을 마친 뒤에는 기기를 눕혀 최대 각도가 어떻게 달라지는지도 확인해 보세요.', PHONE ? 13.5 : 15, '#26324a', PHONE ? 20 : 22, 800); }
    else drawTech();
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, MA, BOT, SEL_A, SEL_B, SEL_C, SEL_D, DEVS, slA, slI, slF, slM, slV, setScene, updateCtl, polT, glareShare, glareOf, skyB, skyP, lcdLevel, lcdB, twistOf, volOf, sensorAt, tableOf, devClass, doneCount, ciOK, levelWord,
    sheetSeg, mkSeg, glSeg, dirSeg, devSeg, teSeg, polGeom, selectDev, setAng, recordBins, keyOf, resetSurvey,
    perfPrep(m, sub) { if (m === 'make' && sub) { S.mk.sub = sub; updateCtl(); } if (m === 'tech' && sub) { S.te.sub = sub; updateCtl(); } if (m === 'survey') { S.sv.auto = true; } },
    setSub(sub) { if (S.mode === 'make') S.mk.sub = sub; else if (S.mode === 'tech') S.te.sub = sub; updateCtl(); },
    get game() { return game; },
  };

})();
