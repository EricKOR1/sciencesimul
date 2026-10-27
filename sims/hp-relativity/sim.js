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
  const numOf = (s) => parseFloat(String(s).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'));


  /* =========================================================
     물리학 Ⅲ. 빛과 물질 - 시간 팽창과 길이 수축 (단원 8차시)
     성취기준 [12물리03-06] 모든 관성계에서 빛의 속력이 동일하다는 원리로부터 시간 팽창, 길이 수축 현상이 나타남을 알고,
                         이러한 지식이 사회에 미친 영향을 조사할 수 있다.
     ① 관찰: 광속 불변 (기차 · 공 · 빛의 속력 측정)
     ② 모형: 시간 팽창 (빛시계)
     ③ 설명: 길이 수축 (우주선 · 뮤온)
     ④ 적용: 영향 조사 (GPS · 입자 가속기 · 뮤온 · 핵에너지 · SF)
     동시성의 상대성과 정량적 계산(로런츠 인자 식)은 다루지 않아요. 화면에는 식과 계산 문제를 쓰지 않고, 그래프를 읽는 수준만 보여 줘요.
     ========================================================= */

  /* ---------- 모델 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const C_MS = 3.0e8;                                            // 진공에서 빛의 속력 (m/s) = 1 c
  const U_BALL = 0.3;                                            // 기차 안에서 던진 공의 속력 (c 단위, 이 장면에서만 쓰는 값)
  const rate = (b) => Math.sqrt(Math.max(0, 1 - b * b));         // 움직이는 시계가 가는 빠르기 = 운동 방향 길이의 비 (정지 = 1)
  const BETA_MU = 0.998, H_ATM_KM = 15, TAU_MU_US = 2.2, N_MU = 40;      // 뮤온의 속력(c), 생성 높이(km), 정지했을 때 평균 수명(μs), 내려보내는 뮤온 수
  const T_EARTH_US = H_ATM_KM * 1000 / (BETA_MU * C_MS) * 1e6;           // 지구 시계로 측정한 낙하 시간 (μs)
  const T_MU_US = T_EARTH_US * rate(BETA_MU);                            // 뮤온 시계로 측정한 낙하 시간 (μs)
  const H_THIN_KM = H_ATM_KM * rate(BETA_MU);                            // 뮤온이 본 대기의 두께 (km)
  const D_NOREL_M = Math.round(TAU_MU_US * 1e-6 * C_MS);                 // 수명 동안 갈 수 있다고 예상한 거리 (m) = 660
  const ERR_KM_DAY = 10;                                         // 시계를 보정하지 않을 때 위치 오차 (km/일)
  const sgnS = (b) => f2(b);
  const BADGE_CARDS = 5;

  /* ---------- 상태 ---------- */
  const mkO = () => ({ bt: 0, trainX: -60, run: null, rows: [], seen: {} });
  const mkK = () => ({ b: 0, g: 0, A: { y: 0, dir: 1, ticks: 0 }, B: { y: 0, dir: 1, ticks: 0, pts: [] }, S2: { y: 0, dir: 1, ticks: 0 }, view: 'earth', seen: {}, tm: { cmp: 0, p10: 0, p90: 0, p99: 0 }, t: 0 });
  const mkL = () => ({ view: 'ship', b: 0, off: 0, seen: {}, tm: { s50: 0, s90: 0 }, mu: null });
  const mkC = () => ({ sel: 0, gps: 'on', day: 0, seen: {}, tm: { off: 0, on: 0 } });
  const S = { mode: 'obs', t: 0, fade: 0, o: mkO(), k: mkK(), l: mkL(), c: mkC() };
  const cmpSt = {}, cmpOk = {}, muSt = {}, muOk = {}, cardSt = {}, cardOk = {};
  let game = null, need = '';
  const MODES = { obs: '🚆 기차 위의 공과 빛', clock: '🕒 빛시계', len: '📏 길이 수축', soc: '🌍 상대성 이론의 영향' };
  const K_VIEWS = [['earth', '지면 관측자가 본 모습'], ['ship', '우주선 안에서 본 모습']];
  const L_VIEWS = [['ship', '우주선 길이'], ['muon', '뮤온 이야기']];

  /* ---------- 장면 · 컨트롤 ---------- */
  const subOf = () => (S.mode === 'len' ? S.l.view : S.mode === 'clock' ? S.k.view : '');
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; parts.clear(); } S.mode = mode; updateCtl(); }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-need')) on = n.getAttribute('data-need') === need;
      if (on && n.hasAttribute('data-hide')) on = n.getAttribute('data-hide') !== need;
      if (on && n.hasAttribute('data-sub')) on = n.getAttribute('data-sub').split(' ').indexOf(S.l.view) >= 0;
      n.hidden = !on;
    });
    if (S.mode === 'clock') setTb(MODES.clock, K_VIEWS, S.k.view, (v) => { S.k.view = v; S.fade = 1; resetClocks(); updateCtl(); });
    else if (S.mode === 'len') setTb(MODES.len, L_VIEWS, S.l.view, (v) => { S.l.view = v; S.fade = 1; updateCtl(); });
    else setTb(MODES[S.mode], null);
    setSlider('#sBt', S.o.bt, 0, 0.5, '#oBt', f1(S.o.bt) + ' c');
    setSlider('#sBc', S.k.b, 0, 0.99, '#oBc', f2(S.k.b) + ' c');
    setSlider('#sBl', S.l.b, 0, 0.99, '#oBl', f2(S.l.b) + ' c');
    setSlider('#sDay', S.c.day, 0, 2, '#oDay', f1(S.c.day) + ' 일');
    syncSeg('#gpsSeg', S.c.gps);
    $$('#bcSeg button').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.v - S.k.b) < 0.0051));
    $$('#blSeg button').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.v - S.l.b) < 0.0051));
    $('#bBall').disabled = $('#bLight').disabled = !!S.o.run;
    $('#bMu').disabled = !!(S.l.mu && S.l.mu.running);
  }
  const bgRect = (x, y, w, h, c1, c2) => { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c1); g.addColorStop(1, c2); D.roundRect(x, y, w, h, 14); ctx.fillStyle = g; ctx.fill(); };
  const personDraw = (x, y, s, col) => { D.sphere(x, y - 14 * s, 7 * s, '#ffd9b5', { gloss: false }); D.roundRect(x - 7 * s, y - 6 * s, 14 * s, 18 * s, 5 * s); ctx.fillStyle = col; ctx.fill(); };

  /* ================= ① 광속 불변 ================= */
  const LO = PHONE
    ? { w: [12, 12, 456, 250], g1: 96, g2: 290, ty: 168, cvis: 240, info: [12, 270, 456, 438] }
    : { w: [14, 14, 772, 300], g1: 190, g2: 510, ty: 206, cvis: 400, info: [14, 322, 772, 224] };
  const CAR_L = PHONE ? 110 : 150;
  function startRun(kind) {
    const o = S.o; if (o.run) return;
    const v = kind === 'ball' ? o.bt + U_BALL : 1, D2 = LO.g2 - LO.g1;
    o.run = { kind, bt: o.bt, t: 0, v, T: D2 / (v * LO.cvis), done: false };
    o.trainX = LO.g1; Sound.tone(kind === 'ball' ? 330 : 880, 0.12, 'triangle', 0.08); updateCtl();
  }
  function stepObs(dt) {
    const o = S.o, r = o.run, v = r ? r.bt : o.bt;
    o.trainX += v * LO.cvis * dt;
    const right = LO.w[0] + LO.w[2] + CAR_L + 20;
    if (!r && o.trainX > right) o.trainX = LO.w[0] - 20;
    if (r) {
      r.t += dt;
      if (!r.done && r.t >= r.T) {
        r.done = true; const exp = r.kind === 'ball' ? r.bt + U_BALL : 1 + r.bt;
        o.rows.push({ kind: r.kind, bt: r.bt, exp, meas: r.v }); if (o.rows.length > 12) o.rows.shift();
        if (r.kind === 'ball' && r.bt >= 0.5 - 1e-9) o.seen.ball50 = true;
        if (r.kind === 'light' && r.bt === 0) o.seen.light0 = true;
        if (r.kind === 'light' && r.bt >= 0.5 - 1e-9) o.seen.light50 = true;
        Sound.success(); parts.burst(LO.g2, LO.ty - 60, { count: 10, speed: 90, size: 3, colors: ['#ffd447', '#fff', '#14a058'], gravity: 80 });
      }
      if (r.t > r.T + 1.4) { o.run = null; updateCtl(); }
    }
  }
  function drawObs(dt) {
    const o = S.o, g = LO, w = g.w, r = o.run, v = r ? r.bt : o.bt;
    bgRect(w[0], w[1], w[2], w[3], '#cfe6ff', '#eaf4ff');
    ctx.fillStyle = '#9bb08a'; ctx.fillRect(w[0], g.ty + 14, w[2], w[1] + w[3] - g.ty - 14);
    ctx.fillStyle = '#7a6a58'; ctx.fillRect(w[0], g.ty + 4, w[2], 10);
    ctx.save(); D.roundRect(w[0], w[1], w[2], w[3], 14); ctx.clip(); ctx.restore();
    T(w[0] + 14, w[1] + 26, '지면에 서 있는 관측자가 속력을 재요', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    // 게이트
    [g.g1, g.g2].forEach((x, i) => { ctx.fillStyle = '#394258'; ctx.fillRect(x - 3, g.ty - 80, 6, 94); D.roundRect(x - 2, g.ty - 80, 36, 22, 5); ctx.fillStyle = i ? '#e2464b' : '#14a058'; ctx.fill(); T(x + 16, g.ty - 64, i ? '끝' : '시작', 12, '#fff', 'center', 800); });
    D.arrow(g.g1 + 6, g.ty + 30, g.g2 - 6, g.ty + 30, { color: '#394258', width: 2, head: 8 }); D.arrow(g.g2 - 6, g.ty + 30, g.g1 + 6, g.ty + 30, { color: '#394258', width: 2, head: 8 });
    D.label((g.g1 + g.g2) / 2, g.ty + 30, '게이트 간격 D', { bg: '#fff', color: '#26324a', size: 12, border: '#9aa7bd' });
    // 관측자와 초시계
    personDraw((g.g1 + g.g2) / 2 - 30, g.ty + 70, PHONE ? 1 : 1.2, '#2f6df6');
    const tshow = r ? Math.min(r.t, r.T) : 0;
    D.roundRect((g.g1 + g.g2) / 2 - 6, g.ty + 52, 116, 36, 8); ctx.fillStyle = '#26324a'; ctx.fill(); T((g.g1 + g.g2) / 2 + 52, g.ty + 77, '⏱ ' + f2(tshow) + ' s', 18, '#8bffb0', 'center', 800);
    // 기차
    const fx = o.trainX, cy = g.ty - 8;
    D.shadow(() => { D.roundRect(fx - CAR_L, cy - 52, CAR_L, 52, 10); const gr = ctx.createLinearGradient(0, cy - 52, 0, cy); gr.addColorStop(0, '#6aa0ff'); gr.addColorStop(1, '#2f6df6'); ctx.fillStyle = gr; ctx.fill(); }, { blur: 6, y: 3 });
    for (let k = 0; k < 3; k++) { D.roundRect(fx - CAR_L + 12 + k * (CAR_L - 24) / 3, cy - 42, (CAR_L - 24) / 3 - 8, 22, 4); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill(); }
    personDraw(fx - 24, cy - 24, 0.8, '#e2552a');
    [fx - CAR_L + 24, fx - 24].forEach((x) => D.sphere(x, g.ty + 8, 8, '#394258', { gloss: false }));
    T(fx - CAR_L / 2 - 6, cy - 6, '기차 ' + f1(v) + ' c', PHONE ? 11 : 12.5, '#fff', 'center', 800);
    if (v > 0) D.arrow(fx - CAR_L / 2, cy - 64, fx - CAR_L / 2 + v * (PHONE ? 150 : 190), cy - 64, { color: '#2f6df6', width: 3.4, head: 10 });
    // 공 · 빛
    if (r) {
      const ox = g.g1 + r.v * g.cvis * r.t, oy = g.ty - 60;
      if (r.kind === 'ball') { D.sphere(ox, oy, 10, '#e2464b', { gloss: true, shadow: true }); D.arrow(ox, oy - 26, ox + r.v * (PHONE ? 130 : 170), oy - 26, { color: '#e2464b', width: 3.4, head: 10 }); D.label(ox + 6, oy - 42, '공 ' + f2(r.v) + ' c', { bg: '#e2464b', size: 12, align: 'left' }); }
      else {
        ctx.save(); ctx.strokeStyle = 'rgba(255,212,71,.45)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(g.g1, oy); ctx.lineTo(ox, oy); ctx.stroke(); ctx.restore();
        D.glow(ox, oy, 34, '#ffd447', 0.7); D.sphere(ox, oy, 8, '#fff7c2', { gloss: false }); D.arrow(ox, oy - 26, ox + (PHONE ? 130 : 170) * 1.0, oy - 26, { color: '#d99a00', width: 3.4, head: 10 }); D.label(ox + 6, oy - 42, '빛 ' + f2(1) + ' c', { bg: '#d99a00', size: 12, align: 'left' });
      }
    } else T(w[0] + w[2] / 2, w[1] + 52, '기차 속력을 정하고 공이나 빛을 쏘아 보세요', PHONE ? 12 : 14, '#5a6679', 'center', 800);
    // 정보
    const f = g.info; panel(f[0], f[1], f[2], f[3]);
    T(f[0] + 14, f[1] + 26, '측정 결과 · 속력 = 게이트 간격 D / 걸린 시간', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const cols = PHONE ? [f[0] + 14, f[0] + 78, f[0] + 190, f[0] + 322] : [f[0] + 18, f[0] + 130, f[0] + 330, f[0] + 540];
    ['종류 · 기차', '예상 (기차 + 대상)', '측정', '결과'].forEach((h, i) => T(PHONE ? [cols[0], cols[1] + 0, cols[2], cols[3]][i] : cols[i], f[1] + 52, PHONE ? ['종류', '기차', '예상 → 측정', '결과'][i] : h, 12.5, '#5a6679', 'left', 800));
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(f[0] + 10, f[1] + 60); ctx.lineTo(f[0] + f[2] - 10, f[1] + 60); ctx.stroke();
    const rh = PHONE ? 30 : 26, nrows = Math.floor((f[3] - 74) / rh), rows = o.rows.slice(-nrows);
    rows.forEach((q, i) => {
      const y = f[1] + 60 + i * rh + rh / 2 + 6, same = Math.abs(q.exp - q.meas) < 1e-9;
      T(cols[0], y, (q.kind === 'ball' ? '🏐 공' : '🔦 빛') + (PHONE ? '' : '  · 기차 ' + f1(q.bt) + ' c'), 14, '#26324a', 'left', 800);
      if (PHONE) { T(cols[1], y, f1(q.bt) + ' c', 14, '#26324a', 'left', 800); T(cols[2], y, f2(q.exp) + ' → ' + f2(q.meas) + ' c', 14, '#26324a', 'left', 800); }
      else { T(cols[1] + 0, y, '', 14, '#26324a', 'left', 800); T(cols[1] + 0, y, '', 14, '#26324a', 'left', 800); T(cols[1] + 0, y, '', 13, '#26324a', 'left', 800); T(cols[2] - 200, y, '', 13, '#26324a', 'left', 800); T(cols[1] + 20, y, f1(q.bt) + ' + ' + (q.kind === 'ball' ? f1(U_BALL) : '1.0') + ' = ' + f2(q.exp) + ' c', 14, '#26324a', 'left', 800); T(cols[2], y, f2(q.meas) + ' c', 15, same ? '#0f7a43' : '#b42318', 'left', 800); }
      T(cols[3], y, same ? '✅ 같아요' : '❗ 달라요', 14, same ? '#0f7a43' : '#b42318', 'left', 800);
    });
    if (!rows.length) T(f[0] + f[2] / 2, f[1] + f[3] / 2 + 10, '🏐 공 던지기나 🔦 빛 쏘기로 속력을 재 보세요', 14, '#98a2b3', 'center', 700);
    T(f[0] + 14, f[1] + f[3] - 12, '공은 기차 안에서 ' + f1(U_BALL) + ' c로 던져요 (비교용 단순 덧셈 · 실제로는 이보다 조금 작아요)', PHONE ? 10.5 : 12, '#7b8aa3', 'left', 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ② 시간 팽창 ================= */
  const LK = PHONE
    ? { w: [12, 12, 456, 340], ax: 92, cx: 318, yt: 110, H: 120, cL: 240, cnt: [12, 360, 456, 160], gr: [12, 528, 456, 180] }
    : { w: [14, 14, 772, 332], ax: 160, cx: 530, yt: 108, H: 130, cL: 260, cnt: [14, 354, 380, 192], gr: [402, 354, 384, 192] };
  function resetClocks() {
    const k = S.k; k.A = { y: 0, dir: 1, ticks: 0 }; k.B = { y: 0, dir: 1, ticks: 0, pts: [] }; k.S2 = { y: 0, dir: 1, ticks: 0 }; k.tm = { cmp: 0, p10: 0, p90: 0, p99: 0 }; k.t = 0;
  }
  function stepClock(dt) {
    const k = S.k, g = LK, b = k.b; k.t += dt;
    k.g += b * g.cL * dt;
    const adv = (c, vy) => { c.y += c.dir * vy * dt; if (c.y >= g.H) { c.y = g.H; c.dir = -1; if (c.pts) c.pts.push({ X: k.g, y: g.H }); } else if (c.y <= 0) { c.y = 0; c.dir = 1; c.ticks++; if (c.pts) c.pts.push({ X: k.g, y: 0 }); } if (c.pts && c.pts.length > 4) c.pts.shift(); };
    adv(k.A, g.cL); adv(k.B, g.cL * rate(b)); adv(k.S2, g.cL);
    if (S.mode === 'clock' && k.view === 'earth') {
      k.tm.cmp = (b >= 0.9 - 1e-9 && k.A.ticks >= 5 && k.B.ticks < k.A.ticks) ? k.tm.cmp + dt : 0; if (k.tm.cmp > 0.5) k.seen.cmp = true;
      [['p10', 0.1], ['p90', 0.9], ['p99', 0.99]].forEach((p) => { k.tm[p[0]] = Math.abs(b - p[1]) < 0.0051 ? k.tm[p[0]] + dt : 0; if (k.tm[p[0]] > 0.8) k.seen[p[0]] = true; });
    }
  }
  function lightClock(x, yt, H, hw, py, o) {
    // 위 거울, 아래 거울, 빛 알갱이
    o = o || {};
    D.roundRect(x - hw, yt - 8, hw * 2, 8, 3); ctx.fillStyle = '#9aa7bd'; ctx.fill(); D.roundRect(x - hw, yt + H, hw * 2, 8, 3); ctx.fillStyle = '#9aa7bd'; ctx.fill();
    ctx.strokeStyle = 'rgba(138,149,168,.45)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, yt); ctx.lineTo(x, yt + H); ctx.stroke(); ctx.setLineDash([]);
    const y = yt + H - py; D.glow(x + (o.dx || 0), y, 18, '#ffd447', 0.7); D.sphere(x + (o.dx || 0), y, 6, '#fff3a8', { gloss: false });
  }
  function drawClock(dt) {
    const k = S.k, g = LK, w = g.w, b = k.b, ytB = g.yt, hw = 30;
    bgRect(w[0], w[1], w[2], w[3], '#101935', '#1c2a55');
    for (let i = 0; i < 40; i++) { const sx = w[0] + ((i * 97) % w[2]), sy = w[1] + 12 + ((i * 53) % (w[3] - 80)); ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.4 * ((i * 7) % 3) / 3) + ')'; ctx.fillRect(sx, sy, 1.8, 1.8); }
    T(w[0] + 14, w[1] + 26, k.view === 'earth' ? '지면 관측자의 눈으로 본 두 개의 빛시계' : '우주선 안에서 본 빛시계', PHONE ? 12.5 : 14.5, '#fff', 'left', 800);
    const rulerY = w[1] + w[3] - 26;
    if (k.view === 'earth') {
      // 지면 눈금 (우주선이 움직이면 왼쪽으로 흘러가요)
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w[0] + 10, rulerY); ctx.lineTo(w[0] + w[2] - 10, rulerY); ctx.stroke();
      const sp = 90, off = ((k.g % sp) + sp) % sp;
      for (let x = -off; x < w[2]; x += sp) { const sx = w[0] + x; if (sx > w[0] + 10 && sx < w[0] + w[2] - 10) { ctx.beginPath(); ctx.moveTo(sx, rulerY); ctx.lineTo(sx, rulerY - 12); ctx.stroke(); } }
      T(w[0] + 16, rulerY - 16, '지면의 눈금', 11.5, 'rgba(255,255,255,.75)', 'left', 700);
      // A: 정지한 시계
      lightClock(g.ax, g.yt, g.H, hw, k.A.y);
      T(g.ax, g.yt + g.H + 36, '정지한 시계 A', PHONE ? 12.5 : 14, '#bfe0ff', 'center', 800);
      // B: 우주선 시계
      const cx = g.cx;
      D.shadow(() => { D.roundRect(cx - 110, g.yt - 30, 220, g.H + 60, 26); const gr = ctx.createLinearGradient(0, g.yt, 0, g.yt + g.H + 60); gr.addColorStop(0, 'rgba(170,190,230,.5)'); gr.addColorStop(1, 'rgba(90,110,170,.45)'); ctx.fillStyle = gr; ctx.fill(); }, { blur: 8, y: 3, color: 'rgba(0,0,0,.35)' });
      ctx.strokeStyle = 'rgba(200,215,255,.8)'; ctx.lineWidth = 2; D.roundRect(cx - 110, g.yt - 30, 220, g.H + 60, 26); ctx.stroke();
      // 빛이 지나간 자취 (지면 기준 좌표 → 화면)
      const pts = k.B.pts.slice(); pts.push({ X: k.g, y: k.B.y });
      const bxs = (X) => cx + (X - k.g), yOf = (yy) => g.yt + g.H - yy;
      ctx.save(); D.roundRect(w[0] + 4, w[1] + 4, w[2] - 8, w[3] - 8, 12); ctx.clip();
      ctx.strokeStyle = 'rgba(255,212,71,.9)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, i) => { const x = bxs(p.X), y = yOf(p.y); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke();
      ctx.restore();
      lightClock(cx, g.yt, g.H, hw, k.B.y);
      T(cx, g.yt + g.H + 52, '우주선의 시계 B  (' + f2(b) + ' c)', PHONE ? 12.5 : 14, '#ffe9a8', 'center', 800);
      if (b > 0) { D.arrow(cx - 60, g.yt - 38, cx + 60 * Math.max(0.3, b), g.yt - 38, { color: '#8bd0ff', width: 3, head: 9 }); }
      T(g.ax, g.yt + g.H + 56, '(빛이 위아래로 오가요)', 12, '#bfe0ff', 'center', 700);
      if (!PHONE) T(cx + 70, g.yt - 38, b > 0 ? '빛은 비스듬히 더 긴 길을 가요' : '', 12, '#ffe9a8', 'left', 700); else if (b > 0) T(cx, g.yt - 52, '빛이 비스듬히 더 긴 길을 가요', 11.5, '#ffe9a8', 'center', 700);
    } else {
      const cx = w[0] + w[2] / 2;
      D.shadow(() => { D.roundRect(cx - 120, g.yt - 30, 240, g.H + 60, 26); ctx.fillStyle = 'rgba(150,170,220,.4)'; ctx.fill(); }, { blur: 8, y: 3, color: 'rgba(0,0,0,.35)' });
      lightClock(cx, g.yt, g.H, hw + 6, k.S2.y); personDraw(cx - 90, g.yt + g.H - 10, 1.3, '#ff9a6a');
      T(cx, g.yt + g.H + 56, '우주선 안의 사람에게는 자기 시계가 정상이에요', PHONE ? 12.5 : 14.5, '#ffe9a8', 'center', 800);
      T(cx, g.yt + g.H + 80, '빛은 위아래로 똑바로 오가고, 한 번 왕복(똑딱)에 ' + f1(2 * g.H / g.cL) + ' 초가 걸려요', PHONE ? 11.5 : 13, '#bfe0ff', 'center', 700);
    }
    // 똑딱 세기
    const c = g.cnt; panel(c[0], c[1], c[2], c[3]);
    T(c[0] + 14, c[1] + 26, k.view === 'earth' ? '똑딱 횟수 (지면의 같은 시간 동안)' : '우주선 안의 똑딱 횟수', PHONE ? 12.5 : 14.5, '#26324a', 'left', 800);
    const bw = c[2] - 28, mx = Math.max(10, k.A.ticks, k.B.ticks);
    if (k.view === 'earth') {
      [['A', k.A.ticks, '#2f6df6'], ['B', k.B.ticks, '#f26b3a']].forEach((q, i) => {
        const y = c[1] + 48 + i * 52; T(c[0] + 14, y + 4, '시계 ' + q[0], 13.5, '#26324a', 'left', 800); ctx.fillStyle = '#eef1f7'; ctx.fillRect(c[0] + 14, y + 12, bw, 16); ctx.fillStyle = q[2]; ctx.fillRect(c[0] + 14, y + 12, bw * q[1] / mx, 16); T(c[0] + c[2] - 14, y + 4, q[1] + '번', 18, q[2], 'right', 800);
      });
      T(c[0] + 14, c[1] + c[3] - 14, k.A.ticks >= 3 ? (k.B.ticks < k.A.ticks ? 'B는 A보다 똑딱이 적어요 → B의 시계가 느리게 갔어요' : 'B도 A와 같은 횟수예요 (속력이 거의 0일 때)') : '속력을 올리고 A가 5번 이상 똑딱할 때까지 기다려요', PHONE ? 11.5 : 12.5, '#3a465c', 'left', 800);
    } else {
      T(c[0] + 14, c[1] + 56, '시계: ' + k.S2.ticks + '번', 24, '#f26b3a', 'left', 800);
      textBlock(c[0] + 14, c[1] + 92, bw, '자기와 함께 움직이는 시계는 속력과 관계없이 항상 정상으로 가요. 느려지는 것은 지면의 관측자가 볼 때예요.', PHONE ? 12.5 : 13.5, '#3a465c', 19, 700);
    }
    // 그래프
    const q = g.gr; panel(q[0], q[1], q[2], q[3]);
    T(q[0] + 14, q[1] + 24, '움직이는 시계가 가는 빠르기 (정지한 시계 = 1)', PHONE ? 11.5 : 13, '#26324a', 'left', 800);
    const gx0 = q[0] + 48, gx1 = q[0] + q[2] - 18, gy0 = q[1] + q[3] - 38, gy1 = q[1] + 44;
    const px = (bb) => gx0 + bb * (gx1 - gx0), py = (rr) => gy0 - rr * (gy0 - gy1);
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1; for (let r = 0; r <= 1; r += 0.5) { ctx.beginPath(); ctx.moveTo(gx0, py(r)); ctx.lineTo(gx1, py(r)); ctx.stroke(); T(gx0 - 6, py(r) + 4, f1(r), 11.5, '#5a6679', 'right', 700); }
    for (let bb = 0; bb <= 1; bb += 0.25) { T(px(bb), gy0 + 16, f2(bb), 11, '#5a6679', 'center', 700); }
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx0, gy1 - 6); ctx.lineTo(gx0, gy0); ctx.lineTo(gx1 + 4, gy0); ctx.stroke();
    T((gx0 + gx1) / 2, gy0 + 32, '우주선 속력 (c)', 11.5, '#5a6679', 'center', 700);
    ctx.beginPath(); for (let i = 0; i <= 120; i++) { const bb = 0.995 * i / 120; const x = px(bb), y = py(rate(bb)); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 3.4; ctx.stroke();
    [0.1, 0.9, 0.99].forEach((bb) => { ctx.beginPath(); ctx.arc(px(bb), py(rate(bb)), 4, 0, TAU); ctx.fillStyle = '#c4b5fd'; ctx.fill(); T(px(bb) + (bb > 0.95 ? -6 : 6), py(rate(bb)) - 8, f2(rate(bb)), 11, '#5b3fd0', bb > 0.95 ? 'right' : 'left', 800); });
    const mx2 = px(b), my2 = py(rate(b)); D.glow(mx2, my2, 18, '#f26b3a', 0.5); D.sphere(mx2, my2, 6.5, '#f26b3a', { gloss: true, shadow: true });
    T(gx1, gy1 + 6, '지금 ' + f2(b) + ' c → ' + f2(rate(b)), 13, '#c2410c', 'right', 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ③ 길이 수축 ================= */
  const LL = PHONE
    ? { w: [12, 12, 456, 250], cy: 150, Ls: 170, Hs: 56, cL: 240, gr: [12, 270, 456, 190], mu: { e: [12, 12, 456, 290], m: [12, 310, 456, 290], i: [12, 608, 456, 100] } }
    : { w: [14, 14, 772, 282], cy: 160, Ls: 240, Hs: 70, cL: 220, gr: [14, 304, 772, 242], mu: { e: [14, 14, 380, 438], m: [406, 14, 380, 438], i: [14, 460, 772, 86] } };
  function stepLen(dt) {
    const l = S.l, g = LL;
    l.off += l.b * g.cL * dt; const span = g.w[2] + g.Ls + 40; if (l.off > span) l.off -= span;
    l.tm.s50 = Math.abs(l.b - 0.5) < 0.0051 ? l.tm.s50 + dt : 0; l.tm.s90 = l.b >= 0.9 - 1e-9 ? l.tm.s90 + dt : 0;
    if (S.mode === 'len' && l.view === 'ship') { if (l.tm.s50 > 0.6) l.seen.s50 = true; if (l.tm.s90 > 0.6) l.seen.s90 = true; }
    const mu = l.mu;
    if (mu && mu.running) {
      mu.p += dt / mu.dur; mu.arrived = 0; mu.decayed = 0;
      mu.list.forEach((m) => { if (mu.p >= m.pd && m.pd < 1) { if (!m.dead) { m.dead = true; const gm = muGeom(); parts.burst(gm.ex(m.x), gm.eyAt(m.pd), { count: 4, speed: 50, size: 2.2, colors: ['#ffb400', '#fff'], gravity: 40, life: 0.5 }); } mu.decayed++; } });
      if (mu.p >= 1) { mu.p = 1; mu.running = false; mu.done = true; mu.arrived = mu.list.filter((m) => m.pd >= 1).length; mu.decayed = N_MU - mu.arrived; Sound.success(); S.l.seen.mu = true; updateCtl(); }
      else mu.arrived = 0;
    }
  }
  function muGeom() {
    const m = LL.mu, e = m.e, top = e[1] + 66, Hpx = PHONE ? 130 : 280;
    return { top, Hpx, ex: (x) => e[0] + 22 + x * (e[2] - 44), eyAt: (p) => top + 14 + p * Hpx, thin: Hpx * rate(BETA_MU) };
  }
  function launchMuons() {
    const l = S.l; if (l.mu && l.mu.running) return;
    const list = []; for (let i = 0; i < N_MU; i++) { const life = -TAU_MU_US * Math.log(1 - Math.random()); list.push({ x: i / (N_MU - 1), row: 0, life, pd: life / T_MU_US, dead: false }); }
    l.mu = { running: true, done: false, p: 0, dur: RM ? 1.2 : 5, list, arrived: 0, decayed: 0 }; Sound.tone(200, 0.2, 'sine', 0.06); updateCtl();
  }
  function resetMu() { S.l.mu = null; Sound.click(); updateCtl(); }
  function shipDraw(cx, cy, Ls, Hs, sx, o) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, 1);
    D.shadow(() => { D.roundRect(-Ls / 2, -Hs / 2, Ls, Hs, Hs / 2.4); const gr = ctx.createLinearGradient(0, -Hs / 2, 0, Hs / 2); gr.addColorStop(0, '#dfe7f5'); gr.addColorStop(1, '#8fa0c0'); ctx.fillStyle = gr; ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#e2552a'; ctx.beginPath(); ctx.moveTo(Ls / 2 - 4, -Hs * 0.3); ctx.lineTo(Ls / 2 + 28, 0); ctx.lineTo(Ls / 2 - 4, Hs * 0.3); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 4; i++) { D.roundRect(-Ls / 2 + 24 + i * (Ls - 80) / 4, -Hs * 0.2, (Ls - 100) / 4, Hs * 0.4, 6); ctx.fillStyle = 'rgba(70,120,210,.85)'; ctx.fill(); }
    ctx.restore();
  }
  function drawLen(dt) {
    const l = S.l, g = LL, b = l.b, r = rate(b);
    if (l.view === 'ship') {
      const w = g.w; bgRect(w[0], w[1], w[2], w[3], '#101935', '#24376b');
      for (let i = 0; i < 40; i++) { const sx = w[0] + ((i * 97) % w[2]), sy = w[1] + 10 + ((i * 53) % (w[3] - 40)); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(sx, sy, 1.8, 1.8); }
      T(w[0] + 14, w[1] + 26, '지면의 막대(길이 L) 옆을 지나가는 우주선', PHONE ? 12.5 : 14.5, '#fff', 'left', 800);
      // 지면 막대
      const rodY = w[1] + w[3] - 40, rodL = PHONE ? 300 : 460, rx = w[0] + (w[2] - rodL) / 2;
      D.roundRect(rx, rodY - 5, rodL, 10, 4); ctx.fillStyle = '#c9d3e6'; ctx.fill(); for (let i = 0; i <= 10; i++) { ctx.fillStyle = '#c9d3e6'; ctx.fillRect(rx + i * rodL / 10 - 1, rodY - 12, 2, 8); }
      T(rx + rodL / 2, rodY + 24, '지면의 막대 (길이 L)', 12.5, '#bfe0ff', 'center', 700);
      // 정지했을 때의 모양(점선)
      const gy = g.cy - g.Hs / 2 - (PHONE ? 60 : 62);
      ctx.save(); ctx.globalAlpha = 0.28; shipDraw(w[0] + w[2] / 2, gy + g.Hs / 2, g.Ls, g.Hs, 1, {}); ctx.restore(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; D.roundRect(w[0] + w[2] / 2 - g.Ls / 2, gy, g.Ls, g.Hs, g.Hs / 2.4); ctx.stroke(); ctx.setLineDash([]);
      T(w[0] + w[2] / 2, gy - (PHONE ? 5 : 8), '정지했을 때의 우주선 (기준)', 12, '#fff', 'center', 700);
      // 움직이는 우주선
      const span = w[2] + g.Ls + 40; const x = b > 0 ? w[0] - g.Ls / 2 - 10 + l.off : w[0] + w[2] / 2;
      const sx = r; shipDraw(x, g.cy, g.Ls, g.Hs, sx, {});
      if (b > 0.005) { D.arrow(x + 10, g.cy - g.Hs / 2 - 14, x + 10 + 60 * Math.max(0.3, b), g.cy - g.Hs / 2 - 14, { color: '#8bd0ff', width: 3, head: 9 }); }
      // 길이 · 높이 표시
      const lw = g.Ls * r; ctx.strokeStyle = '#ffd447'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - lw / 2, g.cy + g.Hs / 2 + 10); ctx.lineTo(x + lw / 2, g.cy + g.Hs / 2 + 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - lw / 2, g.cy + g.Hs / 2 + 5); ctx.lineTo(x - lw / 2, g.cy + g.Hs / 2 + 15); ctx.moveTo(x + lw / 2, g.cy + g.Hs / 2 + 5); ctx.lineTo(x + lw / 2, g.cy + g.Hs / 2 + 15); ctx.stroke();
      T(x, g.cy + g.Hs / 2 + 32, '길이 ' + f0(100 * r) + ' %', 13, '#ffe9a8', 'center', 800);
      // 아래 패널
      const q = g.gr; panel(q[0], q[1], q[2], q[3]);
      T(q[0] + 14, q[1] + 26, '지면에서 본 우주선의 크기 (정지했을 때 = 100 %)', PHONE ? 12 : 14.5, '#26324a', 'left', 800);
      const bw = q[2] - 28 - 70;
      [['운동 방향의 길이', 100 * r, '#f26b3a'], ['높이 (수직 방향)', 100, '#2f6df6']].forEach((c2, i) => {
        const y = q[1] + 50 + i * 54; T(q[0] + 14, y + 2, c2[0], 13.5, '#26324a', 'left', 800); ctx.fillStyle = '#eef1f7'; ctx.fillRect(q[0] + 14, y + 10, bw, 18); ctx.fillStyle = c2[2]; ctx.fillRect(q[0] + 14, y + 10, bw * c2[1] / 100, 18); T(q[0] + 14 + bw + 8, y + 25, f0(c2[1]) + ' %', 16, c2[2], 'left', 800);
      });
      textBlock(q[0] + 14, q[1] + 170, q[2] - 28, '운동 방향의 길이만 줄어요. 속력이 클수록 많이 줄어요. 수직 방향(높이)은 그대로예요.', PHONE ? 12.5 : 13.5, '#3a465c', 19, 700);
      parts.update(dt); parts.draw(ctx);
      return;
    }
    // ----- 뮤온 이야기 -----
    const gm = muGeom(), mu = l.mu, m = g.mu, p = mu ? mu.p : 0;
    const pxKm = gm.Hpx / H_ATM_KM;
    [['e', m.e, '지구에서 본 모습'], ['m', m.m, '뮤온에서 본 모습']].forEach((pp) => {
      panel(pp[1][0], pp[1][1], pp[1][2], pp[1][3]); T(pp[1][0] + 14, pp[1][1] + 26, pp[2], PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    });
    // 지구 화면
    const e = m.e, top = gm.top, gnd = top + 14 + gm.Hpx;
    const sky = ctx.createLinearGradient(0, top, 0, gnd); sky.addColorStop(0, '#2a3f7a'); sky.addColorStop(1, '#bfe0ff'); ctx.fillStyle = sky; ctx.fillRect(e[0] + 10, top, e[2] - 20, gnd - top);
    ctx.fillStyle = '#7a8f66'; ctx.fillRect(e[0] + 10, gnd, e[2] - 20, 18);
    T(e[0] + 16, top + 12, '대기의 높이 ' + H_ATM_KM + ' km', 12, '#fff', 'left', 800);
    D.arrow(e[0] + e[2] - 22, top + 4, e[0] + e[2] - 22, gnd - 2, { color: '#fff', width: 2, head: 8 });
    // 뮤온 화면 (같은 눈금)
    const mm = m.m, mtop = mm[1] + 66, mgnd = mtop + 14 + gm.Hpx, my = mtop + 14 + 30;
    const slabTop = mtop + 14 + 30 - gm.thin * p, slabBot = slabTop + gm.thin;
    ctx.fillStyle = '#243768'; ctx.fillRect(mm[0] + 10, mtop, mm[2] - 20, mgnd - mtop + 18);
    // 얇아진 대기 (같은 눈금으로 그려요)
    const gs = ctx.createLinearGradient(0, slabTop, 0, slabBot); gs.addColorStop(0, '#6f93d9'); gs.addColorStop(1, '#bfe0ff'); ctx.fillStyle = gs; ctx.fillRect(mm[0] + 10, slabTop, mm[2] - 20, gm.thin);
    ctx.fillStyle = '#7a8f66'; ctx.fillRect(mm[0] + 10, slabBot, mm[2] - 20, mgnd + 18 - slabBot); T(mm[0] + mm[2] / 2, mgnd + 8, '지구', 12, '#fff', 'center', 800);
    T(mm[0] + 16, mtop + 12, '뮤온은 가만히 있고 지구가 올라와요', 12, '#fff', 'left', 800);
    D.arrow(mm[0] + mm[2] - 40, slabBot + 40, mm[0] + mm[2] - 40, slabBot + 6, { color: '#fff', width: 2.4, head: 8 });
    D.label(mm[0] + mm[2] / 2, slabTop - 14 < mtop + 36 ? mtop + 36 : slabTop - 14, '대기의 두께 약 ' + f0(H_THIN_KM) + ' km (원래 ' + H_ATM_KM + ' km)', { bg: '#14a058', size: PHONE ? 11 : 12.5 });
    // 뮤온
    if (mu) mu.list.forEach((q) => {
      const xE = m.e[0] + 22 + q.x * (m.e[2] - 44), xM = m.m[0] + 22 + q.x * (m.m[2] - 44), off = q.row * 14;
      const dead = mu.p >= q.pd && q.pd < 1;
      const pe = Math.min(mu.p, q.pd < 1 ? q.pd : 1);
      if (!dead || mu.p - q.pd < 0.04) { ctx.globalAlpha = dead ? 1 - (mu.p - q.pd) / 0.04 : 1; D.sphere(xE, top + 14 + off + pe * (gm.Hpx - off), 3.4, '#ffb400', { gloss: false }); D.sphere(xM, my + off, 3.4, '#ffb400', { gloss: false }); ctx.globalAlpha = 1; }
      else { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillText('', 0, 0); ctx.beginPath(); ctx.arc(xE, top + 14 + off + pe * (gm.Hpx - off), 1.5, 0, TAU); ctx.fill(); }
      if (!dead && mu.done && q.pd >= 1) { ctx.beginPath(); ctx.arc(xE, gnd - 4 - off * 0.3, 5, 0, TAU); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2; ctx.stroke(); }
    });
    // 시계
    const ey = gnd + 36;
    T(e[0] + 16, ey, '지구의 시계 ' + f1(p * T_EARTH_US) + ' μs', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    T(e[0] + 16, ey + 22, '뮤온의 시계 ' + f1(p * T_MU_US) + ' μs  (뮤온 시계가 느리게 가요)', PHONE ? 11.5 : 12.5, '#c2410c', 'left', 800);
    const eym = mgnd + 36;
    T(mm[0] + 16, eym, '뮤온의 시계 ' + f1(p * T_MU_US) + ' μs', PHONE ? 12.5 : 14, '#c2410c', 'left', 800);
    T(mm[0] + 16, eym + 22, '뮤온의 평균 수명은 ' + f1(TAU_MU_US) + ' μs 그대로예요', PHONE ? 11.5 : 12.5, '#26324a', 'left', 800);
    const iP = m.i; panel(iP[0], iP[1], iP[2], iP[3]);
    if (!mu) T(iP[0] + 14, iP[1] + 32, '▶ 뮤온 내려보내기를 눌러요. 뮤온 ' + N_MU + '개가 대기 상층(' + H_ATM_KM + ' km)에서 지표로 향해요.', PHONE ? 12.5 : 14, '#3a465c', 'left', 800);
    else {
      const arrived = mu.done ? mu.arrived : mu.list.filter((q) => q.pd >= 1).length * 0;
      T(iP[0] + 14, iP[1] + 30, mu.done ? '지표에 도착한 뮤온 ' + mu.arrived + '개 / ' + N_MU + '개' : '내려가는 중…  (붕괴한 뮤온 ' + mu.list.filter((q) => mu.p >= q.pd && q.pd < 1).length + '개)', PHONE ? 13.5 : 16, '#0f7a43', 'left', 800);
      textBlock(iP[0] + 14, iP[1] + 54, iP[2] - 28, '시간 팽창을 무시하면 수명 ' + f1(TAU_MU_US) + ' μs 동안 약 ' + D_NOREL_M + ' m밖에 못 가서 지표 도착은 거의 0개로 예상해요. 지구와 뮤온 두 관점의 결과는 같아요.', PHONE ? 11.5 : 12.5, '#3a465c', 17, 700);
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* ================= ④ 영향 조사 ================= */
  const CARDS = [
    { ic: '🛰️', name: 'GPS · 위성 내비게이션', need: 'GPS 위성(약 20000 km 상공, 약 3.9 km/s)의 시계는 지상의 시계와 가는 빠르기가 달라요. 보정하지 않으면 하루에 수십 μs씩 어긋나요.', eff: '시계 보정 덕분에 내비게이션 · 지도 · 물류가 정확해졌어요.', why: 'r1' },
    { ic: '⚛️', name: '입자 가속기', need: '빛 속력에 가까운 입자는 수명이 길어져 보여요(시간 팽창). 가속기를 설계할 때 이 효과를 고려해요.', eff: '소립자 연구와 의료용 가속기에 쓰여요.', why: 'r2' },
    { ic: '☄️', name: '우주선 뮤온 검출', need: '대기 상층에서 생긴 뮤온이 지표에서 검출되는 것은 시간 팽창(길이 수축) 덕분이에요.', eff: '우주선 연구와 상대성 이론을 확인하는 증거가 돼요.', why: 'r3' },
    { ic: '☢️', name: '핵에너지', need: '질량과 에너지가 서로 바뀔 수 있다는 질량–에너지 동등성도 상대성 이론의 결과예요. (이름만 알아봐요)', eff: '원자력 발전과 핵 기술의 바탕이 돼요.', why: 'r4' },
    { ic: '🚀', name: '우주 여행 · SF', need: '빠르게 움직이면 시계가 느리게 간다는 결과가 이야기의 소재가 돼요.', eff: '과학관 전시와 영화 · 소설 같은 대중문화에 영향을 줘요.', why: 'r5' },
  ];
  const REASONS = [['r1', '위성 시계와 지상 시계의 빠르기 차이를 보정해야 해서'], ['r2', '빛에 가까운 입자의 수명이 길어지는 것을 고려해서'], ['r3', '시간 팽창 덕분에 뮤온이 지표까지 도달해서'], ['r4', '질량과 에너지가 서로 바뀐다는 결과 (이름만)'], ['r5', '빠른 우주선의 시계가 느리게 간다는 소재']];
  const CARDQ = CARDS.map((c) => [c.ic + ' ' + c.name + ' — 상대성 이론과 어떤 관계일까요?', REASONS, c.why]);
  const LS = PHONE
    ? { cards: [12, 12, 456, 124], det: [12, 144, 456, 240], map: [12, 392, 456, 316] }
    : { cards: [14, 14, 250, 532], det: [272, 14, 514, 246], map: [272, 268, 514, 278] };
  function stepSoc(dt) {
    const c = S.c, err = c.gps === 'off' ? ERR_KM_DAY * c.day : 0;
    c.tm.off = (S.mode === 'soc' && c.gps === 'off' && c.day >= 1) ? c.tm.off + dt : 0; c.tm.on = (S.mode === 'soc' && c.gps === 'on' && c.day >= 1) ? c.tm.on + dt : 0;
    if (c.tm.off > 0.6) c.seen.off = true; if (c.tm.on > 0.6) c.seen.on = true;
    c.err = SciSim.approach(c.err == null ? 0 : c.err, err, dt, 7);
  }
  function drawSoc(dt) {
    const c = S.c, g = LS, mp = g.map, pxKm = PHONE ? 4.5 : 5;
    // 카드 목록
    const cl = g.cards; panel(cl[0], cl[1], cl[2], cl[3]);
    if (!PHONE) {
      T(cl[0] + 14, cl[1] + 26, '🔎 조사 카드 5장', 14.5, '#26324a', 'left', 800);
      CARDS.forEach((cd, i) => { const y = cl[1] + 44 + i * 96, on = c.sel === i; cbtn(cl[0] + 10, y, cl[2] - 20, 84, '', () => { c.sel = i; Sound.click(); }, { on, r: 14, color: '#f26b3a' }); T(cl[0] + 38, y + 38, cd.ic, 26, '#26324a', 'center', 800); T(cl[0] + 62, y + 36, cd.name, 14, on ? '#fff' : '#26324a', 'left', 800); T(cl[0] + 62, y + 58, c.seenCards && c.seenCards[i] ? '✔ 읽었어요' : '눌러서 읽기', 12, on ? '#ffe9d8' : '#7b8aa3', 'left', 700); });
    } else {
      T(cl[0] + 14, cl[1] + 24, '🔎 조사 카드 (눌러서 읽기)', 13, '#26324a', 'left', 800);
      CARDS.forEach((cd, i) => { const bw = (cl[2] - 20 - 4 * 6) / 5, x = cl[0] + 10 + i * (bw + 6), on = c.sel === i; cbtn(x, cl[1] + 36, bw, 78, '', () => { c.sel = i; Sound.click(); }, { on, r: 12, color: '#f26b3a' }); T(x + bw / 2, cl[1] + 72, cd.ic, 26, '#26324a', 'center', 800); T(x + bw / 2, cl[1] + 100, c.seenCards && c.seenCards[i] ? '✔' : '', 14, on ? '#fff' : '#0f7a43', 'center', 800); });
    }
    c.seenCards = c.seenCards || {}; c.seenCards[c.sel] = true;
    // 상세
    const d = g.det, cd = CARDS[c.sel]; panel(d[0], d[1], d[2], d[3]);
    T(d[0] + 20, d[1] + 46, cd.ic, 32, '#26324a', 'left', 800); T(d[0] + 66, d[1] + 44, cd.name, PHONE ? 16 : 18, '#26324a', 'left', 800);
    T(d[0] + 14, d[1] + 76, '왜 상대성 이론이 필요할까?', 13, '#c2410c', 'left', 800);
    const h1 = textBlock(d[0] + 14, d[1] + 98, d[2] - 28, cd.need, PHONE ? 12.5 : 14, '#3a465c', PHONE ? 18 : 20, 700);
    T(d[0] + 14, d[1] + 104 + h1, '사회 · 생활에 준 영향', 13, '#0f7a43', 'left', 800);
    textBlock(d[0] + 14, d[1] + 126 + h1, d[2] - 28, cd.eff, PHONE ? 12.5 : 14, '#3a465c', PHONE ? 18 : 20, 700);
    // GPS 지도
    panel(mp[0], mp[1], mp[2], mp[3]);
    T(mp[0] + 14, mp[1] + 26, '🛰️ GPS 위성 시계를 보정하지 않으면?', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const mx = mp[0] + (PHONE ? 120 : 140), my = mp[1] + mp[3] / 2 + 14, half = PHONE ? 90 : 100;
    ctx.save(); D.roundRect(mx - half, my - half, half * 2, half * 2, 12); ctx.clip(); ctx.fillStyle = '#e8f1e0'; ctx.fillRect(mx - half, my - half, half * 2, half * 2); ctx.strokeStyle = '#cfe0c4'; ctx.lineWidth = 1; for (let k = -6; k <= 6; k++) { const gs4 = k * 4 * pxKm; ctx.beginPath(); ctx.moveTo(mx + gs4, my - half); ctx.lineTo(mx + gs4, my + half); ctx.moveTo(mx - half, my + gs4); ctx.lineTo(mx + half, my + gs4); ctx.stroke(); }
    ctx.fillStyle = 'rgba(120,160,200,.45)'; ctx.fillRect(mx - half, my + half * 0.35, half * 2, 24); ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx - half, my - 30); ctx.lineTo(mx + half, my - 50); ctx.stroke();
    const ang = -0.6, ex = mx + Math.cos(ang) * c.err * pxKm, ey2 = my + Math.sin(ang) * c.err * pxKm;
    if (c.err > 0.05) { ctx.beginPath(); ctx.arc(mx, my, c.err * pxKm, 0, TAU); ctx.fillStyle = 'rgba(226,70,75,.12)'; ctx.fill(); ctx.strokeStyle = 'rgba(226,70,75,.7)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); D.arrow(mx, my, ex, ey2, { color: '#e2464b', width: 2.4, head: 9 }); }
    ctx.restore();
    D.sphere(mx, my, 7, '#14a058', { gloss: false }); T(mx + 10, my - 8, '실제 위치', 12, '#0f7a43', 'left', 800);
    if (c.err > 0.05) { D.sphere(ex, ey2, 7, '#e2464b', { gloss: false }); D.label(ex + 8, ey2 - 22, '지도에 표시된 위치', { bg: '#e2464b', size: 11.5, align: 'right' }); }
    T(mx - half, my + half + 18, '지도 한 칸 = 4 km', 11.5, '#7b8aa3', 'left', 700);
    const tx = mx + half + 24, tw = mp[0] + mp[2] - tx - 12;
    T(tx, mp[1] + 60, c.gps === 'on' ? '시계 보정: 켬' : '시계 보정: 끔', PHONE ? 13 : 15, c.gps === 'on' ? '#0f7a43' : '#b42318', 'left', 800);
    T(tx, mp[1] + 90, '경과 ' + f1(c.day) + ' 일', 14, '#26324a', 'left', 800);
    T(tx, mp[1] + 122, '위치 오차 ' + f0(c.gps === 'off' ? ERR_KM_DAY * c.day : 0) + ' km', PHONE ? 16 : 20, c.gps === 'off' && c.day > 0 ? '#b42318' : '#0f7a43', 'left', 800);
    textBlock(tx, mp[1] + 150, tw, c.gps === 'off' ? '하루에 약 ' + ERR_KM_DAY + ' km씩 오차가 쌓여요.' : '위성 시계에 상대성 효과를 미리 보정해서 오차가 쌓이지 않아요.', PHONE ? 12 : 13.5, '#3a465c', 18, 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* ---------- 읽음 칸 ---------- */
  function updReadouts() {
    if (S.mode === 'obs') {
      const o = S.o, lb = [...o.rows].reverse().find((q) => q.kind === 'ball'), ll = [...o.rows].reverse().find((q) => q.kind === 'light');
      readouts('기차 속력', f1(o.bt) + ' c', '마지막 공 측정', lb ? f2(lb.meas) + ' c' : '—', '마지막 빛 측정', ll ? f2(ll.meas) + ' c' : '—');
    } else if (S.mode === 'clock') {
      const k = S.k; readouts('우주선 속력', f2(k.b) + ' c', 'A · B 똑딱', k.A.ticks + ' · ' + k.B.ticks, 'B 시계의 빠르기', f2(rate(k.b)) + ' (A = 1)');
    } else if (S.mode === 'len') {
      const l = S.l;
      if (l.view === 'ship') readouts('우주선 속력', f2(l.b) + ' c', '운동 방향 길이', f0(100 * rate(l.b)) + ' %', '높이', '100 %');
      else readouts('내려보낸 뮤온', l.mu ? N_MU + '개' : '—', '지표 도착', l.mu && l.mu.done ? l.mu.arrived + '개' : '—', '대기 두께(뮤온)', '약 ' + f0(H_THIN_KM) + ' km');
    } else {
      const c = S.c; readouts('시계 보정', c.gps === 'on' ? '켬' : '끔', '경과', f1(c.day) + ' 일', '위치 오차', f0(c.gps === 'off' ? ERR_KM_DAY * c.day : 0) + ' km');
    }
  }

  /* ---------- 컨트롤 연결 ---------- */
  $('#sBt').addEventListener('input', (e) => { S.o.bt = Math.round(+e.target.value * 10) / 10; Sound.tick(); updateCtl(); });
  $('#bBall').addEventListener('click', () => startRun('ball')); $('#bLight').addEventListener('click', () => startRun('light'));
  $('#sBc').addEventListener('input', (e) => { S.k.b = Math.round(+e.target.value * 100) / 100; resetClocks(); Sound.tick(); updateCtl(); });
  $$('#bcSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.k.b = +b.dataset.v; resetClocks(); updateCtl(); }));
  $('#bClkReset').addEventListener('click', () => { Sound.click(); resetClocks(); });
  $('#sBl').addEventListener('input', (e) => { S.l.b = Math.round(+e.target.value * 100) / 100; Sound.tick(); updateCtl(); });
  $$('#blSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.l.b = +b.dataset.v; updateCtl(); }));
  $('#bMu').addEventListener('click', launchMuons); $('#bMuReset').addEventListener('click', resetMu);
  $$('#gpsSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.c.gps = b.dataset.v; updateCtl(); }));
  $('#sDay').addEventListener('input', (e) => { S.c.day = +e.target.value; Sound.tick(); updateCtl(); });
  const CMP = [
    ['공은 “예상(기차 + 공)”과 측정이 어땠나요?', [['same', '같았어요'], ['diff', '달랐어요']], 'same'],
    ['빛은 “예상(기차 + 빛)”과 측정이 어땠나요?', [['same', '같았어요'], ['diff', '달랐어요']], 'diff'],
    ['기차 속력을 바꿔도 지면에서 잰 빛의 속력은?', [['c', '변하지 않고 항상 c예요'], ['up', '기차 속력만큼 커져요'], ['down', '기차 속력만큼 작아져요']], 'c'],
  ];
  const cmpSels = mkSelects($('#cmpRows'), CMP, cmpSt, cmpOk);
  const MUQ = [
    ['지구에서 보면 뮤온이 지표까지 올 수 있는 까닭은?', [['td', '뮤온의 시계가 느리게 가서 수명이 길어져요'], ['lc', '대기가 얇아져서 짧은 거리만 지나면 돼요'], ['fast', '뮤온이 빛보다 빨리 날아요']], 'td'],
    ['뮤온에서 보면 지표까지 올 수 있는 까닭은?', [['td', '뮤온의 수명이 길어져요'], ['lc', '다가오는 대기가 운동 방향으로 짧아져요'], ['fast', '뮤온이 빛보다 빨리 날아요']], 'lc'],
    ['두 관점에서 지표에 도착하는 뮤온의 수는?', [['same', '같아요 (같은 현상의 두 가지 설명)'], ['e', '지구에서 볼 때 더 많아요'], ['m', '뮤온에서 볼 때 더 많아요']], 'same'],
  ];
  const muSels = mkSelects($('#muRows'), MUQ, muSt, muOk);
  const cardSels = mkSelects($('#cardRows'), CARDQ, cardSt, cardOk);
  const resetSel = (sels, st, ok) => { Object.keys(st).forEach((k) => delete st[k]); Object.keys(ok).forEach((k) => delete ok[k]); sels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); };

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '빛의 속력은 더해지지 않아요', short: '광속 불변', icon: '🚆', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 아주 빠르게 날아가는 우주선 안의 시계는 지구의 시계와 같은 속도로 갈까?</p>' +
        '<div class="si-link">🔗 <b>앞의 운동 단원에서</b> 속도를 부호와 함께 다루며 달리는 기차에서 던진 공의 속력은 <b>기차 속력 + 공 속력</b>이라고 배웠어요. 중학교에서 배운 빛의 속력도 이어서 생각해 봐요.</div>' +
        '<p>달리는 기차에서 공을 던지고 손전등을 켜요. 지면의 관측자가 두 개의 게이트 사이를 지나는 시간을 재서 <b>속력 = 거리 ÷ 시간</b>을 구해요. 기차가 빨라질수록 빛의 속력은 어떻게 될까요?</p>',
      features: ['obs'],
      setup() { S.o = mkO(); S.o.trainX = LO.w[0]; need = ''; resetSel(cmpSels, cmpSt, cmpOk); setScene('obs'); updateCtl(); },
      recap: '기차 속력을 바꾸면 공의 속력은 (기차 + 공)으로 더해지지만, 지면에서 잰 빛의 속력은 기차가 얼마나 빨라도 항상 c로 같아요. 광원이나 관측자가 움직여도 빛의 속력은 변하지 않아요(광속 불변).',
      summary: '<ul><li>일상의 속력: 달리는 기차에서 던진 공의 속력(지면 기준)은 <b>기차 속력 + 공 속력</b>이에요.</li><li>그런데 <b>빛의 속력은 모든 관성계에서 같아요</b>(<b>광속 불변</b>): 진공에서 약 ' + (C_MS / 1e8).toFixed(1) + '×10<sup>8</sup> m/s. 광원(기차)이 움직여도, 관측자가 움직여도 변하지 않아요. (마이컬슨–몰리 실험 등)</li><li>속력 = 거리 ÷ 시간이 모든 관측자에게 c로 같으려면, <b>거리와 시간이 관측자마다 달라져야</b> 해요. 이것이 시간 팽창과 길이 수축의 출발점이에요.</li></ul>',
      missions: [
        {
          title: '공과 빛의 속력 재기',
          goal: '① <b>기차 0.5 c</b>일 때 공을 던져 측정하고, ② <b>기차가 정지(0)</b>일 때와 ③ <b>0.5 c</b>일 때 빛의 속력을 각각 측정하세요.',
          hint: '기차 속력 슬라이더를 끝(0.5 c)으로 옮기고 🏐 공 던지기를 눌러요. 결과가 표에 쌓여요. 이어서 🔦 빛 쏘기를 0.5 c에서, 그리고 슬라이더를 0으로 하고 한 번 더 눌러요. 측정이 끝날 때까지 기다려요.',
          setup() { need = ''; updateCtl(); setScene('obs'); },
          check: () => S.o.seen.ball50 && S.o.seen.light0 && S.o.seen.light50,
          hold: 0.2,
          status: () => mark(S.o.seen.ball50) + ' 기차 0.5 c에서 공 &nbsp; ' + mark(S.o.seen.light0) + ' 기차 0 c에서 빛 &nbsp; ' + mark(S.o.seen.light50) + ' 기차 0.5 c에서 빛' + (S.o.run ? '<br>측정 중… (' + (S.o.run.kind === 'ball' ? '공' : '빛') + ')' : ''),
          explain: '기차가 0.5 c일 때 공은 지면에서 <b>' + f2(0.5 + U_BALL) + ' c</b>(= 0.5 + ' + f1(U_BALL) + ')로 측정돼요. 그런데 빛은 기차가 정지해 있을 때도, 0.5 c로 달릴 때도 <b>항상 1.00 c</b>예요. “1.5 c”가 되지 않아요! (공은 일상의 속도 더하기 규칙으로 계산해 보여 주고 있어요.)',
        },
        {
          title: '예상과 측정 비교하기', manual: true,
          goal: '표를 보고 공과 빛에서 “예상(더하기)”과 측정이 같았는지, 기차 속력을 바꿨을 때 빛의 속력이 어땠는지 고르고 ✔ 확인하기를 누르세요.',
          hint: '화면 아래 표에서 “예상 → 측정”과 결과 칸(✅ / ❗)을 확인해요. 빛은 어떤 기차 속력에서도 측정값이 같아요.',
          setup() { need = 'cmp'; resetSel(cmpSels, cmpSt, cmpOk); updateCtl(); setScene('obs'); },
          check() {
            const r = checkSelects(CMP, cmpSels, cmpSt, cmpOk);
            if (r.miss) return '아직 고르지 않은 칸이 ' + r.miss + '개 있어요.';
            return r.bad ? '빨간 칸을 다시 골라 보세요. 표의 결과 칸(✅ / ❗)을 확인해 보세요.' : true;
          },
          status: () => '고른 칸 ' + CMP.filter((w, i) => cmpSt[i]).length + ' / ' + CMP.length,
          explain: '공은 예상(기차 + 공)과 측정이 <b>같고</b>, 빛은 예상(기차 + 빛 = 1 + 기차 속력)과 측정이 <b>달라요</b>. 지면에서 잰 빛의 속력은 기차 속력과 관계없이 <b>항상 c</b>예요.',
        },
        {
          type: 'quiz', title: '빛의 속력과 관측자',
          goal: '다음 중 실험으로 확인된 사실로 옳은 것은?',
          setup() { need = ''; updateCtl(); setScene('obs'); },
          choices: ['빛의 속력은 관측자의 속도에 관계없이 모든 관성계에서 같다', '광원이 움직이면 소리처럼 빛의 속력에 광원의 속력이 더해진다', '관측자가 빛과 같은 방향으로 움직이면 빛이 더 느리게 보인다', '빛의 속력은 기차 안에서만 일정하다'],
          answer: 0,
          feedback: ['', '소리는 매질 속을 가지만, 빛은 광원이 움직여도 속력이 같아요. 기차에서 쏜 빛의 측정 결과를 보세요.', '관측자가 어떻게 움직여도 빛의 속력은 c로 같게 측정돼요.', '빛의 속력은 지면에서 측정해도 기차 안에서 측정해도 같아요.'],
          explain: '빛의 속력은 광원이나 관측자의 움직임과 <b>관계없이 모든 관성계에서 같아요</b>. 이것이 <b>광속 불변</b> 원리예요. 그래서 속력 = 거리 ÷ 시간이 항상 c가 되도록 시간과 거리가 달라지게 돼요.',
        },
      ],
    },
    {
      title: '빛시계로 보는 시간 팽창', short: '시간 팽창', icon: '🕒', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 빛의 속력이 모든 관측자에게 같다는 것을 확인했어요. 이 원리로 시간이 어떻게 달라지는지 <b>빛시계</b>로 알아봐요.</div>' +
        '<p><b>빛시계</b>는 위아래 거울 사이를 빛이 한 번 왕복하는 것을 <b>똑딱 1번</b>으로 세는 시계예요. 정지한 시계 A와 옆으로 날아가는 우주선의 시계 B를 지면 관측자의 눈으로 비교해요. 빛이 가는 길이 다르면, 같은 속력 c로 가도 걸리는 시간이 달라요.</p>',
      features: ['clock'],
      setup() { S.k = mkK(); need = ''; setScene('clock'); updateCtl(); },
      recap: '지면에서 보면 움직이는 빛시계의 빛은 비스듬히 더 긴 길을 가요. 빛의 속력은 똑같이 c이므로 한 번 왕복(똑딱)에 더 오래 걸려요 → 움직이는 시계가 느리게 가요(시간 팽창). 속력이 광속에 가까울수록 더 느려지고, 우주선 안의 사람에게는 자기 시계가 정상이에요.',
      summary: '<ul><li><b>빛시계</b>: 위아래 거울 사이를 오가는 빛 한 번 왕복 = 똑딱 1번.</li><li>지면에서 보면 움직이는 시계의 빛은 <b>비스듬히 더 긴 경로</b>를 가요. 빛의 속력은 같은 c이므로 한 번 왕복에 <b>더 오래</b> 걸려요 → <b>움직이는 시계는 느리게 가요</b> (시간 팽창).</li><li>그래프 읽기: 광속의 ' + f2(0.1) + ' c에서는 거의 변화가 없고(' + f2(rate(0.1)) + '), ' + f2(0.9) + ' c에서는 확연히(' + f2(rate(0.9)) + '), ' + f2(0.99) + ' c에서는 매우 많이(' + f2(rate(0.99)) + ') 느려져요.</li><li>우주선 안의 사람은 자기 시계가 정상으로 가는 것으로 느껴요. 시계가 고장난 것이 아니라 <b>관측자에 따라 시간이 다르게 흘러요</b>.</li></ul>',
      missions: [
        {
          title: '두 시계의 똑딱 비교하고 그래프 읽기',
          goal: '속력을 <b>0.9 c 이상</b>으로 하고 A가 5번 이상 똑딱할 때 B의 똑딱이 더 적은 것을 확인하세요. 그리고 속력을 <b>0.1 c, 0.9 c, 0.99 c</b>로 각각 맞춰 그래프의 값을 읽어요.',
          hint: '“0.9 c” 버튼을 누르고 A가 5번 똑딱할 때까지(약 5초) 기다려요. 이어서 0.1 c와 0.99 c 버튼도 각각 눌러 1초쯤 머물러요. 속력을 바꾸면 똑딱 세기가 다시 시작돼요.',
          setup() { need = ''; S.k.view = 'earth'; S.k.seen = {}; resetClocks(); updateCtl(); setScene('clock'); },
          check: () => S.k.seen.cmp && S.k.seen.p10 && S.k.seen.p90 && S.k.seen.p99,
          hold: 0.1,
          status: () => mark(S.k.seen.cmp) + ' 0.9 c 이상에서 B 똑딱 &lt; A 똑딱 (A ' + S.k.A.ticks + ' / B ' + S.k.B.ticks + ') &nbsp; ' + mark(S.k.seen.p10) + ' 0.1 c &nbsp; ' + mark(S.k.seen.p90) + ' 0.9 c &nbsp; ' + mark(S.k.seen.p99) + ' 0.99 c',
          explain: '그래프의 값: 0.1 c → <b>' + f2(rate(0.1)) + '</b>, 0.9 c → <b>' + f2(rate(0.9)) + '</b>, 0.99 c → <b>' + f2(rate(0.99)) + '</b>. 움직이는 시계가 정지한 시계의 몇 배의 빠르기로 가는지를 뜻해요. 빛이 비스듬히 더 긴 길을 가므로, 같은 속력 c로 가도 한 번 왕복이 더 오래 걸려요. 일상 속력에서는 차이가 거의 없어 느낄 수 없어요.',
        },
        {
          type: 'quiz', title: '우주선 안의 사람은?',
          goal: '우주선 안의 사람은 자기 시계가 이상하게 가는 것을 느낄까요?',
          setup() { need = ''; updateCtl(); setScene('clock'); },
          choices: ['느끼지 못한다. 자기와 함께 움직이는 시계는 정상으로 간다', '시계가 고장 나서 느려진다', '느리게 가는 것을 직접 느낀다', '시계가 거꾸로 간다'],
          answer: 0,
          feedback: ['', '시계는 고장 나지 않았어요. 지면 관측자가 볼 때만 느리게 보여요. “우주선 안에서 본 모습”을 눌러 확인해 보세요.', '우주선 안에서는 시계도, 몸도, 모든 것이 정상 속도로 움직여요.', '시계는 앞으로 가요. 다만 지면에서 보면 느리게 가요.'],
          explain: '우주선 안에서 보면 빛시계의 빛은 위아래로 똑바로 오가서 <b>정상으로</b> 똑딱해요. 느려지는 것은 <b>지면의 관측자가 볼 때</b>예요. 시계가 고장 난 것이 아니라 <b>시간이 관측자에 따라 다르게 흐르는 것</b>이에요.',
        },
      ],
    },
    {
      title: '운동 방향으로 줄어드는 길이', short: '길이 수축', icon: '📏', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 움직이는 시계는 느리게 간다는 것을 알았어요. 시간이 달라지면 <b>거리(길이)</b>도 달라져야 해요. (속력 = 거리 ÷ 시간이 모두에게 c로 같아야 하니까요.)</div>' +
        '<p>먼저 우주선이 빨라질수록 지면에서 본 <b>길이</b>가 어떻게 달라지는지 살펴봐요. 그다음 <b>뮤온</b> 이야기로 시간 팽창과 길이 수축이 같은 현상의 두 가지 설명이라는 것을 알아봐요.</p>',
      features: ['len'],
      setup() { S.l = mkL(); need = ''; resetSel(muSels, muSt, muOk); setScene('len'); updateCtl(); },
      recap: '움직이는 물체의 길이는 지면에서 보면 운동 방향으로만 줄어들고(길이 수축), 수직 방향은 그대로예요. 뮤온은 지구에서 보면 시간 팽창으로 수명이 길어져, 뮤온에서 보면 대기가 얇아져서 지표에 도달해요. 같은 현상의 두 가지 설명이에요.',
      summary: '<ul><li><b>길이 수축</b>: 움직이는 물체의 길이는 <b>운동 방향으로만</b> 줄어들어요. 수직 방향(높이)은 변하지 않아요. 속력이 클수록 많이 줄어요: 0.5 c → ' + f0(100 * rate(0.5)) + ' %, 0.9 c → ' + f0(100 * rate(0.9)) + ' %, 0.99 c → ' + f0(100 * rate(0.99)) + ' %.</li><li><b>뮤온</b>: 대기 상층(' + H_ATM_KM + ' km)에서 생긴 뮤온의 평균 수명은 ' + f1(TAU_MU_US) + ' μs라서, 시간 팽창을 무시하면 약 ' + D_NOREL_M + ' m밖에 못 가야 해요. 그런데 지표에서 많이 검출돼요.</li><li><b>지구에서 보면</b> 뮤온의 시계가 느리게 가서(시간 팽창) 수명이 길어져요. <b>뮤온에서 보면</b> 다가오는 대기가 운동 방향으로 얇아져(길이 수축) 짧은 거리만 지나요. 두 설명의 결과는 같아요.</li></ul>',
      missions: [
        {
          title: '속력에 따른 우주선 길이 관찰하기',
          goal: '“우주선 길이” 화면에서 속력을 <b>0.5 c</b>와 <b>0.9 c 이상</b>으로 바꿔 보며 우주선의 길이와 높이가 어떻게 달라지는지 관찰하세요.',
          hint: '0.5 c 버튼과 0.9 c 버튼을 차례로 눌러 1초쯤 머물러요. 노란 표시와 아래 막대에서 길이는 줄고 높이는 그대로인지 확인해요.',
          setup() { need = ''; S.l.view = 'ship'; S.l.seen = {}; updateCtl(); setScene('len'); },
          check: () => S.l.seen.s50 && S.l.seen.s90,
          hold: 0.1,
          status: () => mark(S.l.seen.s50) + ' 0.5 c에서 관찰 (길이 ' + f0(100 * rate(0.5)) + ' %) &nbsp; ' + mark(S.l.seen.s90) + ' 0.9 c 이상에서 관찰 (길이 ' + f0(100 * rate(0.9)) + ' % 이하)<br>지금: ' + f2(S.l.b) + ' c → 길이 ' + f0(100 * rate(S.l.b)) + ' %, 높이 100 %',
          explain: '속력이 <b>0.5 c</b>이면 길이는 정지했을 때의 <b>' + f0(100 * rate(0.5)) + ' %</b>, <b>0.9 c</b>이면 <b>' + f0(100 * rate(0.9)) + ' %</b>, <b>0.99 c</b>이면 <b>' + f0(100 * rate(0.99)) + ' %</b>예요. 줄어드는 것은 <b>운동 방향의 길이뿐</b>이고 높이는 그대로예요.',
        },
        {
          title: '뮤온 이야기 연결하기', manual: true,
          goal: '“뮤온 이야기” 화면에서 뮤온을 내려보낸 뒤, 지구에서 본 설명과 뮤온에서 본 설명을 연결하고 ✔ 확인하기를 누르세요.',
          hint: '지구에서는 뮤온의 “시계”가 느리게 가는 것이 이유(시간 팽창), 뮤온에서는 다가오는 “대기의 두께”가 줄어드는 것이 이유(길이 수축)예요. 도착한 뮤온의 수는 두 화면에서 같아요.',
          setup() { need = 'mu'; S.l.view = 'muon'; resetSel(muSels, muSt, muOk); updateCtl(); setScene('len'); },
          check() {
            if (!S.l.seen.mu) return '먼저 ▶ 뮤온 내려보내기로 결과를 확인해 보세요.';
            const r = checkSelects(MUQ, muSels, muSt, muOk);
            if (r.miss) return '아직 고르지 않은 칸이 ' + r.miss + '개 있어요.';
            return r.bad ? '빨간 칸을 다시 골라 보세요. 지구에서는 시계, 뮤온에서는 대기의 두께를 생각해 보세요.' : true;
          },
          status: () => '고른 칸 ' + MUQ.filter((w, i) => muSt[i]).length + ' / ' + MUQ.length + (S.l.seen.mu ? '' : '<br>먼저 ▶ 뮤온 내려보내기로 결과를 확인해요'),
          explain: '<b>지구에서 보면</b> 뮤온의 시계가 느리게 가서(시간 팽창) 수명이 길어져요. <b>뮤온에서 보면</b> 자기 수명은 그대로지만 다가오는 대기의 두께가 ' + H_ATM_KM + ' km에서 약 ' + f0(H_THIN_KM) + ' km로 줄어(길이 수축) 짧은 거리만 지나면 돼요. 같은 현상의 두 가지 설명이라 도착하는 뮤온의 수는 같아요.',
        },
        {
          type: 'quiz', title: '길이가 줄어드는 방향',
          goal: '우주선이 빠르게 지나갈 때 지면에서 본 우주선의 모양으로 옳은 것은?',
          setup() { need = ''; S.l.view = 'ship'; updateCtl(); setScene('len'); },
          choices: ['운동 방향의 길이만 줄고, 속력이 클수록 더 많이 줄어든다', '높이와 길이가 모두 같은 비율로 줄어든다', '높이만 줄어든다', '속력과 관계없이 길이는 항상 변하지 않는다'],
          answer: 0,
          feedback: ['', '우주선 길이 화면의 막대를 보세요. 높이는 100 %로 그대로예요.', '줄어드는 것은 운동 방향의 길이예요. 수직 방향은 변하지 않아요.', '속력이 광속에 가까워지면 길이가 눈에 띄게 줄어들어요.'],
          explain: '길이 수축은 <b>운동 방향</b>으로만 일어나요. 속력이 클수록 많이 줄어들고(0.99 c에서는 약 ' + f0(100 * rate(0.99)) + ' %), 수직 방향은 그대로예요.',
        },
      ],
    },
    {
      title: '상대성 이론이 사회에 준 영향 조사하기', short: '영향 조사', icon: '🌍', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 광속 불변으로부터 시간 팽창과 길이 수축을 이끌어 냈어요. 이 지식은 우리 사회에 어떤 영향을 줬을까요?</div>' +
        '<p>조사 카드 5장을 읽고, GPS 위성 시계의 보정이 왜 필요한지 지도 위의 오차로 확인해요. 일상의 속력에서는 상대론 효과를 느끼지 못한다는 점도 함께 생각해 봐요.</p>',
      features: ['soc'],
      setup() { S.c = mkC(); need = ''; resetSel(cardSels, cardSt, cardOk); setScene('soc'); updateCtl(); },
      recap: 'GPS 위성의 시계는 상대성 효과를 보정하지 않으면 하루에 약 10 km씩 위치 오차가 쌓여요. 상대성 이론은 GPS, 입자 가속기, 우주선 연구, 핵에너지(질량–에너지 동등성), 대중문화에 영향을 줬어요. 일상의 속력은 광속에 비해 매우 작아서 상대론 효과를 느끼지 못해요.',
      summary: '<ul><li><b>GPS</b>: 위성(약 20000 km 상공, 약 3.9 km/s)의 시계는 지상의 시계와 가는 빠르기가 달라요. 보정하지 않으면 하루에 수십 μs씩 어긋나 위치 오차가 하루 약 ' + ERR_KM_DAY + ' km씩 쌓여요 → 위성 시계에 미리 보정을 적용해요 (내비게이션 · 지도 · 물류).</li><li><b>입자 가속기</b>: 빛에 가까운 입자의 수명이 길어지는 효과를 고려해 설계해요.</li><li><b>우주선 뮤온 검출</b>: 시간 팽창(길이 수축) 덕분에 지표에서 뮤온이 검출돼요.</li><li><b>핵에너지</b>: 질량–에너지 동등성도 상대성 이론의 결과예요 (이름만 알아봐요).</li><li><b>우주 여행 · SF</b>: 과학 문화에 영향을 줬어요.</li><li>자동차나 비행기의 속력은 광속에 비해 매우 작아서 일상에서는 상대론 효과를 느끼지 못해요.</li></ul>',
      missions: [
        {
          title: 'GPS 시계 보정이 필요한 까닭 확인하기',
          goal: '시계 보정을 <b>끄고</b> 경과 시간을 <b>1일 이상</b>으로 해서 오차를 확인한 뒤, 보정을 <b>켜고</b> 같은 시간에서 오차가 사라지는 것을 확인하세요.',
          hint: '“보정 끄기”를 고르고 경과 시간 슬라이더를 1일 이상으로 올려 지도의 빨간 오차를 확인해요. 그다음 “보정 켜기”를 눌러 오차가 사라지는지 봐요.',
          setup() { need = ''; S.c.seen = {}; S.c.tm = { off: 0, on: 0 }; updateCtl(); setScene('soc'); },
          check: () => S.c.seen.off && S.c.seen.on,
          hold: 0.1,
          status: () => mark(S.c.seen.off) + ' 보정 끔 · 1일 이상 → 오차 ' + ERR_KM_DAY + ' km 이상 &nbsp; ' + mark(S.c.seen.on) + ' 보정 켬 · 1일 이상 → 오차 0',
          explain: '보정하지 않으면 하루에 약 <b>' + ERR_KM_DAY + ' km</b>씩 위치 오차가 쌓여요. 위성 시계에 상대성 효과를 <b>미리 보정</b>하기 때문에 내비게이션이 정확해요. 상대성 이론은 실생활에 쓰이는 기술에 꼭 필요한 지식이에요.',
        },
        {
          title: '조사 카드와 이유 연결하기', manual: true,
          goal: '조사 카드 5장을 읽고, 각 카드가 <b>상대성 이론과 어떤 관계</b>인지 골라 연결한 뒤 ✔ 확인하기를 누르세요.',
          hint: '카드를 눌러 “왜 상대성 이론이 필요할까?”를 읽어요. GPS는 시계 보정, 가속기는 수명, 뮤온은 시간 팽창으로 지표 도달, 핵에너지는 질량–에너지 동등성, SF는 소재예요.',
          setup() { need = 'cards'; resetSel(cardSels, cardSt, cardOk); updateCtl(); setScene('soc'); },
          check() {
            const r = checkSelects(CARDQ, cardSels, cardSt, cardOk);
            if (r.miss) return '아직 고르지 않은 칸이 ' + r.miss + '개 있어요.';
            return r.bad ? '빨간 칸을 다시 골라 보세요. 화면의 카드를 눌러 설명을 다시 읽어 보세요.' : true;
          },
          status: () => '고른 칸 ' + CARDQ.filter((w, i) => cardSt[i]).length + ' / ' + CARDQ.length,
          explain: CARDS.map((cd, i) => cd.ic + ' <b>' + cd.name + '</b>: ' + REASONS[i][1]).join('<br>'),
        },
        {
          type: 'quiz', title: '일상에서 상대론 효과를 못 느끼는 까닭',
          goal: '자동차나 비행기를 타도 시간 팽창이나 길이 수축을 느끼지 못하는 까닭은?',
          setup() { need = ''; updateCtl(); setScene('soc'); },
          choices: ['일상의 속력은 광속에 비해 매우 작아서 효과가 거의 없기 때문', '상대성 이론은 우주에서만 성립하기 때문', '자동차와 비행기의 시계는 고장 나지 않기 때문', '상대성 이론은 틀린 이론이기 때문'],
          answer: 0,
          feedback: ['', '상대성 이론은 모든 곳에서 성립해요. 다만 효과가 속력이 클 때 커져요.', '시계는 정상이에요. 차이가 너무 작아 느끼지 못하는 것이에요.', '실험(뮤온, GPS 등)으로 확인된 이론이에요.'],
          explain: '시간 팽창과 길이 수축의 크기는 속력이 광속(' + (C_MS / 1e8).toFixed(1) + '×10<sup>8</sup> m/s)에 가까울수록 커져요. 자동차나 비행기의 속력은 광속에 비해 <b>매우 작아서</b> 효과가 거의 0이에요. 그러나 GPS 위성처럼 정밀한 시계를 쓰면 영향이 드러나요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-relativity', mount: '#game', badge: '시공간 탐험가', homeHref: '../../index.html#hp',
    featureLabels: { obs: '🚆 기차 · 공 · 빛 속력 측정', clock: '🕒 빛시계 · 똑딱 세기 · 그래프', len: '📏 우주선 길이 · 뮤온 이야기', soc: '🌍 조사 카드 · GPS 오차 지도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  S.o.trainX = LO.w[0];
  let lastLvl = -1, lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && (game.level !== lastLvl || game.free !== lastFree)) { lastLvl = game.level; lastFree = game.free; updateCtl(); }
    HITS.length = 0;
    stepObs(dt); stepClock(dt); stepLen(dt); stepSoc(dt);
    view.apply(); ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'obs') drawObs(dt); else if (S.mode === 'clock') drawClock(dt); else if (S.mode === 'len') drawLen(dt); else drawSoc(dt);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    updReadouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, updateCtl, rate, startRun, launchMuons, resetClocks, LO, LK, LL, LS, T_MU_US, T_EARTH_US, H_THIN_KM, D_NOREL_M, N_MU, CARDS,
  };
})();
