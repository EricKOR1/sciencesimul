/* =========================================================
   중3 Ⅶ. 재해·재난과 안전 — 재해·재난의 원인과 피해 [9과22-01]
   ① [관찰] 재해와 재난: 사례 카드 10장을 자연 재난 / 사회 재난으로 분류
   ② [실험] 감염병 확산: 사람 점 모형(이동량·마스크·예방 접종) + 실시간 감염자 곡선
   ③ [분석] 지진: 진앙에서 거리·지반·내진 설계가 다른 마을 3곳의 흔들림(진도)과 피해 비교
   ④ [분석] 기상·화학 재난: 예시 자료 그래프(폭염 일수, 해수면 온도와 태풍) 해석 + 화학 물질 확산 지도
   ※ 모든 수치는 학습용 '예시 자료'이며, 한 가지 자료만으로 결론 내리지 않도록 비교하게 해요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, Sound, clamp, lerp, fmt } = SciSim;
  const TAU = Math.PI * 2;
  const view = SciSim.stage($('#cv'), { width: 800, height: 540, background: '#eef2f7' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const rgba = SciSim.color.rgba, shade = SciSim.color.shade, mixc = SciSim.color.mix;
  const approach = SciSim.approach;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mkRng = (seed) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

  let game = null;
  let F = new Set();
  const has = (f) => F.has(f);
  const isNew = (f) => !!(game && game.isNew(f));
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const fx = new SciSim.Particles();
  const SLATE = '#64748b';

  /* ---------- 장면 ---------- */
  const SCENES = [
    { id: 'cards', step: 0, label: '🗂️ 사례 카드', feat: 'cards' },
    { id: 'epi', step: 1, label: '🦠 감염병 확산', feat: 'epi' },
    { id: 'quake', step: 2, label: '🌍 지진 마을', feat: 'quake' },
    { id: 'heat', step: 3, label: '📈 폭염 일수', feat: 'heat' },
    { id: 'typhoon', step: 3, label: '🌀 해수면·태풍', feat: 'typhoon' },
    { id: 'gas', step: 3, label: '☣️ 유출 지도', feat: 'gas' },
  ];
  const S = { scene: 'cards', prev: null, tr: 1, t: 0, hasSnap: false, ph: '', okAt: -9 };

  /* ---------- 공통 그리기 도우미 ---------- */
  function pill(x, y, text, o) { return D.label(x, y, text, Object.assign({ bg: 'rgba(255,255,255,.94)', color: '#1b2333', border: '#cbd5e1', size: 13 }, o || {})); }
  function caption(text) { pill(16, 28, text, { bg: 'rgba(30,41,59,.84)', color: '#fff', border: null, size: 14.5, pad: 12, align: 'left' }); }
  function newTag() {
    const x = 14, y = 44;
    const a = 0.5 + 0.5 * Math.sin(S.t * 6);
    ctx.save(); ctx.fillStyle = '#ef4444'; D.roundRect(x, y, 46, 20, 10); ctx.fill();
    ctx.globalAlpha = 0.35 + a * 0.4; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; D.roundRect(x - 3, y - 3, 52, 26, 13); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = D.font(12, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NEW', x + 23, y + 11); ctx.restore();
  }
  function example(x, y, text) {
    pill(x, y, text || '※ 예시 자료', { bg: '#fff7ed', color: '#9a3412', border: '#fdba74', size: 12.5, weight: 800, align: 'right' });
  }
  const wrapCache = new Map();
  function wrapLines(text, maxW, size, weight) {
    const key = text + '|' + maxW + '|' + size + '|' + weight;
    let r = wrapCache.get(key);
    if (r) return r;
    ctx.save(); ctx.font = D.font(size, weight || 700);
    r = []; let line = '';
    for (const ch of text) {
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { r.push(line); line = ch === ' ' ? '' : ch; } else line = t;
    }
    if (line) r.push(line);
    ctx.restore();
    wrapCache.set(key, r);
    return r;
  }
  function panelBG(color) { view.clear(color || '#eef2f7'); }
  let hintTimer = 0;
  function showHint(text, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = text; h.classList.remove('hide');
    clearTimeout(hintTimer);
    if (ms) hintTimer = setTimeout(() => h.classList.add('hide'), ms);
  }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); }

  /* =========================================================
     ① 사례 카드 분류
     ========================================================= */
  const CARDS = [
    { id: 'quake', icon: '🌍', name: '지진', kind: 'nat', cause: '땅속 암석이 쌓인 힘을 견디지 못하고 끊어지며 에너지가 퍼져 나가요.' },
    { id: 'epi', icon: '🦠', name: '감염병 확산', kind: 'soc', cause: '병원체가 사람과 사람 사이에서 전파돼요.' },
    { id: 'typh', icon: '🌀', name: '태풍', kind: 'nat', cause: '따뜻한 바다에서 수증기를 공급받아 발달해 강풍·호우를 일으켜요.' },
    { id: 'chem', icon: '☣️', name: '화학 물질 유출', kind: 'soc', cause: '저장·운반·취급 중의 사고나 관리 소홀로 물질이 새어 나와요.' },
    { id: 'rain', icon: '🌧️', name: '집중 호우', kind: 'nat', cause: '짧은 시간에 많은 비가 내려 하천이 넘치고 산사태가 일어나요.' },
    { id: 'fire', icon: '🔥', name: '대형 화재', kind: 'soc', cause: '전기·가스 사고나 부주의로 불이 나고, 타기 쉬운 물질을 따라 번져요.' },
    { id: 'heat', icon: '🌡️', name: '폭염', kind: 'nat', cause: '뜨거운 공기가 오래 머물러 매우 더운 날씨가 계속돼요.' },
    { id: 'trans', icon: '🚢', name: '운송 수단 사고', kind: 'soc', cause: '정비·운행 소홀이나 부주의에 나쁜 날씨가 겹쳐 사고가 나요.' },
    { id: 'volc', icon: '🌋', name: '화산 폭발', kind: 'nat', cause: '땅속 마그마와 가스가 지표로 뿜어져 나와요.' },
    { id: 'coll', icon: '🏗️', name: '건물 붕괴', kind: 'soc', cause: '부실한 시공이나 낡은 시설의 관리 소홀로 건물이 버티지 못해요.' },
  ];
  const CW = 150, CH = 54;
  const BOX = { nat: { x: 16, y: 232, w: 376, h: 292, label: '🌋 자연 재난', sub: '자연 현상이 원인', c: '#0ea5e9' },
    soc: { x: 408, y: 232, w: 376, h: 292, label: '🏭 사회 재난', sub: '사람의 활동·관리·전파와 관련이 큰 원인', c: '#f97316' } };
  const cards = CARDS.map((c, i) => {
    const px = 25 + (i % 5) * 152, py = 62 + Math.floor(i / 5) * 66;
    return Object.assign(c, { px, py, x: px, y: py, box: null, lift: 0, drag: false, shake: 0, tw: null, warned: false, pop: 0 });
  });
  const CD = { sel: null, order: cards.slice(), over: null, overA: { nat: 0, soc: 0 }, down: null };
  function slotOf(c) {
    if (!c.box) return { x: c.px, y: c.py };
    const list = cards.filter((k) => k.box === c.box);
    const i = list.indexOf(c), b = BOX[c.box];
    const rows = Math.ceil(list.length / 2);
    const step = Math.min(62, (b.h - 60) / Math.max(1, rows));
    return { x: b.x + 22 + (i % 2) * 172, y: b.y + 50 + Math.floor(i / 2) * step };
  }
  function reflow(skip) {
    cards.forEach((c) => {
      if (c === skip || c.drag) return;
      const s = slotOf(c);
      if (c.tw) c.tw.cancel();
      c.tw = SciSim.tween(c, { x: s.x, y: s.y }, { duration: 0.38, ease: 'outBack' });
    });
  }
  function cardAt(p) {
    for (let i = CD.order.length - 1; i >= 0; i--) {
      const c = CD.order[i];
      if (p.x >= c.x && p.x <= c.x + CW && p.y >= c.y && p.y <= c.y + CH) return c;
    }
    return null;
  }
  function boxAt(p) { return p.x >= BOX.nat.x && p.x <= BOX.nat.x + BOX.nat.w && p.y >= BOX.nat.y ? (p.x < 400 ? 'nat' : 'soc') : (p.x >= BOX.soc.x && p.x <= BOX.soc.x + BOX.soc.w && p.y >= BOX.soc.y ? 'soc' : null); }
  function cardsReset() {
    cards.forEach((c) => { c.box = null; c.warned = false; c.shake = 0; c.drag = false; if (c.tw) c.tw.cancel(); c.tw = SciSim.tween(c, { x: c.px, y: c.py }, { duration: 0.4, ease: 'outCubic' }); });
    CD.sel = null;
  }
  function cardsStep(dt) {
    cards.forEach((c) => { c.lift = approach(c.lift, c.drag ? 1 : 0, dt, 16); c.shake *= Math.exp(-4 * dt); c.pop *= Math.exp(-5 * dt); });
    ['nat', 'soc'].forEach((k) => { CD.overA[k] = approach(CD.overA[k], CD.over === k ? 1 : 0, dt, 14); });
  }
  function drawCard(c) {
    const sx = c.shake > 0.02 ? Math.sin(S.t * 55) * 6 * c.shake : 0;
    const L = c.lift, sel = CD.sel === c;
    const w = CW * (1 + 0.06 * L), h = CH * (1 + 0.06 * L);
    const x = c.x - (w - CW) / 2 + sx, y = c.y - (h - CH) / 2 - 5 * L;
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(x, y, w, h, 14); ctx.fill(); }, { blur: 6 + 14 * L, y: 2 + 8 * L, color: 'rgba(30,41,59,' + (0.18 + 0.12 * L) + ')' });
    const col = c.box ? BOX[c.box].c : '#94a3b8';
    ctx.lineWidth = sel ? 3.5 : 2; ctx.strokeStyle = sel ? '#1e293b' : (c.warned ? '#ef4444' : col);
    D.roundRect(x, y, w, h, 14); ctx.stroke();
    ctx.fillStyle = rgba(col, 0.14); D.roundRect(x + 2, y + 2, 48, h - 4, 12); ctx.fill();
    ctx.font = '26px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    ctx.fillText(c.icon, x + 26, y + h / 2 + 1);
    ctx.font = D.font(c.name.length > 7 ? 14 : 15.5, 800); ctx.fillStyle = '#1b2333'; ctx.textAlign = 'left';
    ctx.fillText(c.name, x + 56, y + h / 2 + 1);
    ctx.restore();
  }
  function drawBox(k) {
    const b = BOX[k], a = CD.overA[k];
    ctx.save();
    ctx.fillStyle = rgba(b.c, 0.08 + 0.12 * a); D.roundRect(b.x, b.y, b.w, b.h, 18); ctx.fill();
    ctx.strokeStyle = rgba(b.c, 0.55 + 0.4 * a); ctx.lineWidth = 3 + 2 * a; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -S.t * 12;
    D.roundRect(b.x, b.y, b.w, b.h, 18); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    D.text(b.x + 18, b.y + 30, b.label, { size: 19, weight: 800, color: shade(b.c, -0.3), align: 'left' });
    D.text(b.x + b.w - 14, b.y + 29, b.sub, { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
    const n = cards.filter((c) => c.box === k).length;
    if (n === 0) D.text(b.x + b.w / 2, b.y + b.h / 2 + 10, '카드를 여기로 끌어 놓아요', { size: 15, weight: 700, color: rgba(b.c, 0.7) });
  }
  function drawCards() {
    panelBG('#eef2f7');
    caption('사례 카드를 원인에 따라 나눠 보세요');
    // 카드 보관 구역 안내
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.55)'; D.roundRect(12, 52, 776, 136, 16); ctx.fill(); ctx.restore();
    drawBox('nat'); drawBox('soc');
    // 원인 읽기 줄
    ctx.save(); ctx.fillStyle = '#fff'; D.roundRect(12, 194, 776, 30, 15); ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    if (CD.sel) {
      ctx.font = '17px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(CD.sel.icon, 24, 210);
      D.text(48, 210, CD.sel.name + ' · 원인', { size: 13.5, weight: 800, color: '#334155', align: 'left', baseline: 'middle' });
      D.text(150, 210, CD.sel.cause, { size: 13.5, weight: 700, color: '#1b2333', align: 'left', baseline: 'middle' });
    } else {
      D.text(400, 210, '👆 카드를 눌러 원인을 읽어 보세요', { size: 14, weight: 700, color: '#64748b', baseline: 'middle' });
    }
    CD.order.forEach((c) => { if (!c.drag) drawCard(c); });
    CD.order.forEach((c) => { if (c.drag) drawCard(c); });
    if (isNew('cards')) newTag();
  }

  /* =========================================================
     ② 감염병 확산 모형
     ========================================================= */
  const EPI = { N: 140, W: 500, H: 350, R: 15, BETA: 0.42, REC: 10, V0: 6, V1: 30, MASK: 0.6, DT: 0.1, TMAX: 120, SPEED: 3.5, SEED: 7919, X0: 16, Y0: 48 };
  class Epi {
    constructor(P, withFx) {
      this.P = { move: P.move, mask: !!P.mask, vacc: P.vacc };
      this.fxOn = !!withFx;
      const rnd = this.rnd = mkRng(EPI.SEED);
      this.dots = [];
      for (let i = 0; i < EPI.N; i++) this.dots.push({ x: 12 + rnd() * (EPI.W - 24), y: 12 + rnd() * (EPI.H - 24), a: rnd() * TAU, s: 0, t: 0, rec: 0, tc: 9 });
      const idx = []; for (let i = 0; i < EPI.N; i++) idx.push(i);
      for (let i = EPI.N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }
      const nv = Math.round(EPI.N * P.vacc / 100);
      for (let k = 0; k < nv; k++) this.dots[idx[k]].s = 3;
      let seeded = 0;
      for (let k = EPI.N - 1; k >= 0 && seeded < 4; k--) {
        const d = this.dots[idx[k]];
        if (d.s === 0) { d.s = 1; d.rec = EPI.REC * (0.85 + rnd() * 0.3); seeded++; }
      }
      this.t = 0; this.peak = 4; this.series = [[0, 4]]; this.n = 0; this.ended = false; this.acc = 0; this.events = [];
      this.cnt = [0, 0, 0, 0]; this.count();
    }
    count() { const c = this.cnt; c[0] = c[1] = c[2] = c[3] = 0; for (const d of this.dots) c[d.s]++; }
    step() {
      const rnd = this.rnd, dots = this.dots, dt = EPI.DT, W = EPI.W, H = EPI.H;
      const spd = EPI.V0 + EPI.V1 * this.P.move / 100, mf = this.P.mask ? EPI.MASK : 1;
      this.t += dt; this.n++;
      for (const d of dots) {
        d.a += (rnd() - 0.5) * 0.9;
        const sp = spd * (d.s === 1 ? 0.9 : 1);
        d.x += Math.cos(d.a) * sp * dt; d.y += Math.sin(d.a) * sp * dt;
        if (d.x < 8) { d.x = 8; d.a = Math.PI - d.a; } else if (d.x > W - 8) { d.x = W - 8; d.a = Math.PI - d.a; }
        if (d.y < 8) { d.y = 8; d.a = -d.a; } else if (d.y > H - 8) { d.y = H - 8; d.a = -d.a; }
        d.tc += dt;
      }
      const R2 = EPI.R * EPI.R, pr = EPI.BETA * dt * mf;
      for (const i of dots) {
        if (i.s !== 1) continue;
        for (const d of dots) {
          if (d.s !== 0 || d.ns) continue;
          const dx = d.x - i.x, dy = d.y - i.y;
          if (dx * dx + dy * dy < R2 && rnd() < pr) d.ns = true;
        }
      }
      for (const d of dots) {
        if (d.ns) { d.ns = false; d.s = 1; d.tc = 0; d.rec = EPI.REC * (0.85 + rnd() * 0.3); if (this.fxOn) this.events.push({ x: d.x, y: d.y, age: 0 }); }
        else if (d.s === 1) { d.t += dt; if (d.t >= d.rec) { d.s = 2; d.tc = 0; } }
      }
      this.count();
      const I = this.cnt[1];
      if (I > this.peak) this.peak = I;
      if (this.n % 5 === 0) this.series.push([this.t, I]);
      if (I === 0 || this.t >= EPI.TMAX - 1e-6) { this.ended = true; this.series.push([this.t, I]); }
    }
  }
  const BASE = (() => { const e = new Epi({ move: 100, mask: false, vacc: 0 }, false); let g = 0; while (!e.ended && g++ < 5000) e.step(); return { peak: e.peak, series: e.series.slice(), t: e.t }; })();
  const EP = { P: { move: 100, mask: false, vacc: 0 }, m: null, maskA: 0, xmax: 60, resetA: 1 };
  function epReset(silent) {
    EP.m = new Epi(EP.P, true);
    EP.xmax = 60; EP.resetA = 0;
    if (!silent) Sound.tick();
  }
  const isDefaultP = () => EP.P.move === 100 && !EP.P.mask && EP.P.vacc === 0;
  const SCOL = ['#60a5fa', '#ef4444', '#22c55e', '#a78bfa'];
  const SNAME = ['건강(감염되지 않음)', '감염', '회복', '접종'];
  function epiStep(dt) {
    const m = EP.m;
    EP.maskA = approach(EP.maskA, EP.P.mask ? 1 : 0, dt, 10);
    EP.resetA = Math.min(1, EP.resetA + dt * 3);
    if (!m.ended) {
      m.acc += dt * EPI.SPEED;
      let g = 0;
      while (m.acc >= EPI.DT && g++ < 4) { m.acc -= EPI.DT; m.step(); if (m.ended) break; }
    }
    m.events.forEach((e) => { e.age += dt; });
    while (m.events.length && m.events[0].age > 0.9) m.events.shift();
    const tx = Math.max(60, Math.ceil((m.t + 4) / 20) * 20);
    EP.xmax = approach(EP.xmax, tx, dt, 4);
  }
  function drawEpi() {
    panelBG('#eef2f7');
    const m = EP.m, X0 = EPI.X0, Y0 = EPI.Y0;
    caption('감염된 사람(빨강)이 가까이 있는 사람에게 병원체를 옮겨요');
    // 마을 상자
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#fbfdff'; D.roundRect(X0, Y0 + 6, EPI.W, EPI.H, 18); ctx.fill(); }, { blur: 14, y: 4 });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; D.roundRect(X0, Y0 + 6, EPI.W, EPI.H, 18); ctx.stroke();
    ctx.beginPath(); D.roundRect(X0, Y0 + 6, EPI.W, EPI.H, 18); ctx.clip();
    ctx.translate(X0, Y0 + 6);
    // 감염 범위 고리 + 점
    const R = EPI.R;
    for (const d of m.dots) {
      if (d.s === 1) {
        const k = (S.t * 0.9 + d.x * 0.013) % 1;
        ctx.fillStyle = 'rgba(239,68,68,.10)'; ctx.beginPath(); ctx.arc(d.x, d.y, R, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(239,68,68,' + (0.45 * (1 - k)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(d.x, d.y, R * (0.55 + 0.45 * k), 0, TAU); ctx.stroke();
      }
    }
    for (const d of m.dots) {
      const col = d.tc < 0.5 && d.s !== 0 && d.s !== 3 ? mixc(d.s === 1 ? SCOL[0] : SCOL[1], SCOL[d.s], d.tc / 0.5) : SCOL[d.s];
      const r = 5.6 + (d.s === 1 && d.tc < 0.4 ? 3 * (1 - d.tc / 0.4) : 0);
      D.sphere(d.x, d.y, r, col, { gloss: true });
      if (EP.maskA > 0.02) {
        ctx.fillStyle = 'rgba(255,255,255,' + EP.maskA + ')'; ctx.strokeStyle = 'rgba(100,116,139,' + EP.maskA * 0.8 + ')'; ctx.lineWidth = 0.8;
        D.roundRect(d.x - 3.6, d.y + 0.4, 7.2, 3.6, 1.6); ctx.fill(); ctx.stroke();
      }
      if (d.s === 3) { ctx.strokeStyle = 'rgba(167,139,250,.8)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(d.x, d.y, r + 2.6, 0, TAU); ctx.stroke(); }
    }
    m.events.forEach((e) => {
      const k = e.age / 0.9;
      ctx.strokeStyle = 'rgba(239,68,68,' + (0.8 * (1 - k)) + ')'; ctx.lineWidth = 3 * (1 - k) + 0.5;
      ctx.beginPath(); ctx.arc(e.x, e.y, 6 + k * 22, 0, TAU); ctx.stroke();
    });
    ctx.restore();
    // 설정 요약 스티커
    const info = '이동 ' + EP.P.move + '% · 마스크 ' + (EP.P.mask ? '○' : '✕') + ' · 접종 ' + EP.P.vacc + '%';
    pill(X0 + 8, Y0 + EPI.H - 6, info, { bg: 'rgba(30,41,59,.82)', color: '#fff', border: null, size: 12.5, align: 'left' });
    if (m.ended) {
      const msg = m.cnt[1] === 0 ? '유행이 끝났어요' : '관찰 끝';
      pill(X0 + EPI.W - 8, Y0 + EPI.H - 6, '✔ ' + msg + ' · 최대 감염자 ' + m.peak + '명', { bg: '#16a34a', color: '#fff', border: null, size: 12.5, align: 'right' });
    }
    drawCurve(m);
    // 구성 막대
    const bx = 16, by = 428, bw = 768, bh = 24;
    ctx.save(); D.roundRect(bx, by, bw, bh, 12); ctx.fillStyle = '#e2e8f0'; ctx.fill(); ctx.clip();
    let x = bx;
    const order = [3, 0, 1, 2];
    order.forEach((s) => { const w = bw * m.cnt[s] / EPI.N; ctx.fillStyle = SCOL[s]; ctx.fillRect(x, by, w + 0.5, bh); x += w; });
    ctx.restore();
    // 범례
    const lg = [[0, '건강'], [1, '감염'], [2, '회복'], [3, '예방 접종(면역)']];
    let lx = 20;
    lg.forEach(([s, name]) => {
      D.sphere(lx + 7, 482, 7, SCOL[s], { gloss: false });
      const t = name + ' ' + m.cnt[s === 0 ? 0 : s] + '명';
      D.text(lx + 20, 487, t, { size: 14, weight: 800, color: '#334155', align: 'left' });
      ctx.save(); ctx.font = D.font(14, 800); lx += 20 + ctx.measureText(t).width + 22; ctx.restore();
    });
    if (EP.P.mask) { D.text(20, 516, '😷 마스크를 쓰면 병원체가 옮겨질 확률이 줄어들어요 (단순화한 모형)', { size: 12.5, weight: 700, color: '#64748b', align: 'left' }); }
    else D.text(20, 516, '※ 모든 수치는 단순화한 모형이 만든 예시 자료예요', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
    if (isNew('epi')) newTag();
  }
  function drawCurve(m) {
    const px = 546, py = 70, pw = 228, ph = 262;
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(532, 54, 256, 342, 16); ctx.fill(); }, { blur: 12, y: 3 });
    ctx.restore();
    D.text(660, 76, '감염자 수 곡선 (예시)', { size: 14.5, weight: 800, color: '#334155' });
    const L = px + 26, T = py + 18, Wd = pw - 34, Ht = ph - 52;
    const ymax = 70, xmax = EP.xmax;
    const X = (t) => L + (t / xmax) * Wd, Y = (v) => T + Ht - (v / ymax) * Ht;
    ctx.save();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [0, 20, 40, 60].forEach((v) => { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + Wd, Y(v)); ctx.stroke(); D.text(L - 5, Y(v) + 4, String(v), { size: 11.5, weight: 700, color: '#94a3b8', align: 'right' }); });
    const step = xmax <= 60 ? 20 : 40;
    for (let t = 0; t <= xmax + 0.01; t += step) D.text(X(t), T + Ht + 16, t + '일', { size: 11.5, weight: 700, color: '#94a3b8' });
    // 기본 설정 곡선(비교용)
    ctx.beginPath();
    BASE.series.forEach(([t, v], i) => { const x = X(t), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
    // 목표선(기본 최대의 절반)
    const hy = Y(BASE.peak / 2);
    ctx.strokeStyle = 'rgba(22,163,74,.75)'; ctx.lineWidth = 1.8; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(L, hy); ctx.lineTo(L + Wd, hy); ctx.stroke(); ctx.setLineDash([]);
    // 현재 곡선
    const ser = m.series;
    ctx.beginPath(); ctx.moveTo(X(0), Y(0));
    ser.forEach(([t, v]) => ctx.lineTo(X(t), Y(v)));
    const last = ser[ser.length - 1];
    ctx.lineTo(X(last[0]), Y(0)); ctx.closePath();
    const g = ctx.createLinearGradient(0, T, 0, T + Ht); g.addColorStop(0, 'rgba(239,68,68,.35)'); g.addColorStop(1, 'rgba(239,68,68,.04)');
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath();
    ser.forEach(([t, v], i) => { const x = X(t), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    D.sphere(X(last[0]), Y(last[1]), 5, '#ef4444', { gloss: false });
    // 최대 표시
    ctx.restore();
    // 범례
    ctx.save();
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(548, 362); ctx.lineTo(570, 362); ctx.stroke();
    D.text(575, 366, '지금 설정', { size: 12, weight: 700, color: '#475569', align: 'left' });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(648, 362); ctx.lineTo(670, 362); ctx.stroke(); ctx.setLineDash([]);
    D.text(675, 366, '기본 설정', { size: 12, weight: 700, color: '#475569', align: 'left' });
    ctx.strokeStyle = 'rgba(22,163,74,.85)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(548, 382); ctx.lineTo(570, 382); ctx.stroke(); ctx.setLineDash([]);
    D.text(575, 386, '기본 최대 감염자의 절반', { size: 12, weight: 700, color: '#166534', align: 'left' });
    ctx.restore();
  }

  /* =========================================================
     ③ 지진: 마을 3곳 비교
     ========================================================= */
  const EPIC = { x: 64, y: 300 };
  const VILL = [
    { id: 'A', name: '가 마을', cx: 232, top: 96, km: 8, soft: false, brace: true, gtxt: '단단한 암반', dtxt: '내진 설계 있음' },
    { id: 'B', name: '나 마을', cx: 430, top: 330, km: 20, soft: true, brace: false, gtxt: '연약한 지반(매립지)', dtxt: '내진 설계 없음' },
    { id: 'C', name: '다 마을', cx: 700, top: 150, km: 40, soft: false, brace: false, gtxt: '단단한 암반', dtxt: '내진 설계 없음' },
  ];
  const VW = 156, VH = 184, VWAVE = 330;
  VILL.forEach((v, i) => {
    v.dist = Math.hypot(v.cx - EPIC.x, v.top + 92 - EPIC.y);
    v.arrive = v.dist / VWAVE;
    v.g = 0; v.dmgS = 0; v.I = 0; v.dmg = 0; v.fired = false; v.dust = 0; v.crackA = 0; v.selA = 0;
    v.bl = [
      { dx: -50, w: 32, h: 46, col: '#f1e3c8', sp: new SciSim.Spring(0, { stiffness: 1100, damping: 15 }) },
      { dx: -2, w: 38, h: 66, col: '#e6d5f0', sp: new SciSim.Spring(0, { stiffness: 650, damping: 11 }) },
      { dx: 48, w: 28, h: 36, col: '#d6ebdc', sp: new SciSim.Spring(0, { stiffness: 1500, damping: 17 }) },
    ];
  });
  const QK = { M: 5.8, fired: false, t: 0, M0: 5.8, arrived: 0, sel: null, rings: [], flash: 0 };
  function calcQuake(v, M) {
    const I = Math.max(1, 1.6 * M - 1.0 - 3.0 * Math.log10(v.km) + (v.soft ? 1.2 : 0));
    const vuln = v.brace ? 0.25 : 1;
    const dmg = clamp((I - 4) / 3, 0, 1) * vuln;
    return { I, dmg };
  }
  const ROMAN = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ'];
  const roman = (I) => ROMAN[clamp(Math.round(I), 1, 10)];
  function dmgName(d) { return d < 0.05 ? '미미' : d < 0.2 ? '작음' : d < 0.45 ? '보통' : d < 0.7 ? '큼' : '매우 큼'; }
  function dmgColor(d) { return d < 0.05 ? '#22c55e' : d < 0.2 ? '#84cc16' : d < 0.45 ? '#f59e0b' : d < 0.7 ? '#f97316' : '#dc2626'; }
  function quakeFire() {
    QK.M0 = QK.M; QK.fired = true; QK.t = 0; QK.arrived = 0; QK.flash = 1;
    QK.rings = [];
    VILL.forEach((v) => {
      const c = calcQuake(v, QK.M); v.I = c.I; v.dmg = c.dmg; v.fired = false; v.age = -1; v.dmgS = 0; v.crackA = 0;
      v.bl.forEach((b) => { b.sp.value = 0; b.sp.velocity = 0; b.sp.target = 0; });
    });
    fx.burst(EPIC.x, EPIC.y, { count: 22, speed: 170, colors: ['#f59e0b', '#fbbf24', '#ef4444'], gravity: 40 });
    Sound.tick();
  }
  function quakeReset() {
    QK.fired = false; QK.t = 0; QK.arrived = 0; QK.rings = []; QK.flash = 0;
    VILL.forEach((v) => { v.fired = false; v.age = -1; v.g = 0; v.dmgS = 0; v.crackA = 0; v.I = 0; v.dmg = 0; v.bl.forEach((b) => { b.sp.value = 0; b.sp.velocity = 0; b.sp.target = 0; }); });
  }
  function quakeStep(dt) {
    VILL.forEach((v) => { v.selA = approach(v.selA, QK.sel === v.id ? 1 : 0, dt, 12); });
    QK.flash *= Math.exp(-3 * dt);
    if (!QK.fired) return;
    QK.t += dt;
    let arrived = 0;
    VILL.forEach((v) => {
      const tau = QK.t - v.arrive;
      if (tau >= 0) {
        arrived++;
        if (!v.fired) {
          v.fired = true;
          if (v.dmg > 0.3) for (let i = 0; i < 8; i++) fx.emit({ x: v.cx + (Math.random() - 0.5) * 100, y: v.top + 148, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, life: 1.4, size: 8, grow: 14, color: 'rgba(150,140,125,.7)', shape: 'smoke' });
        }
        const amp = clamp(1.7 * (v.I - 2), 0, 12);
        const env = Math.min(1, tau / 0.3) * Math.exp(-Math.max(0, tau - 1.3) * 0.85);
        v.g = amp * env * Math.sin(tau * 21) * (0.75 + 0.25 * Math.sin(tau * 7.3));
        v.bl.forEach((b) => { b.sp.target = v.g; b.sp.update(dt); });
        v.dmgS = approach(v.dmgS, v.dmg, dt, 0.9);
        v.crackA = clamp((tau - 0.8) / 1.2, 0, 1);
      } else {
        v.g = approach(v.g, 0, dt, 10);
      }
    });
    QK.arrived = arrived;
    QK.rings.forEach((r) => { r.r = VWAVE * (QK.t - r.t0); });
    if (QK.t < 1.0) { const n = Math.floor(QK.t / 0.4); while (QK.rings.length <= n) QK.rings.push({ t0: QK.rings.length * 0.4, r: 0 }); }
    if (QK.t > 5.5) { VILL.forEach((v) => { v.bl.forEach((b) => { b.sp.target = 0; b.sp.update(dt); }); v.g = approach(v.g, 0, dt, 6); }); }
  }
  function drawBuilding(v, b, gy, cx) {
    const g = v.g * (v.soft ? 1 : 0.8);
    const top = b.sp.value * 1.0 + (v.dmgS * (b.h > 50 ? 7 : 4)) * (v.crackA);
    const x0 = cx + b.dx - b.w / 2, bw = b.w, h = b.h;
    const sh = (f) => g + (top - g) * Math.pow(f, 1.25);
    const P = (fx_, fy) => [x0 + fx_ * bw + sh(fy), gy - fy * h];
    const dmgT = v.dmgS * v.crackA;
    const col = mixc(b.col, '#a8a29e', clamp(dmgT * 0.9, 0, 0.8));
    ctx.save();
    ctx.beginPath();
    const p0 = P(0, 0), p1 = P(1, 0), p2 = P(1, 1), p3 = P(0, 1);
    ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath();
    const gr = ctx.createLinearGradient(x0, 0, x0 + bw, 0); gr.addColorStop(0, shade(col, 0.15)); gr.addColorStop(1, shade(col, -0.12));
    ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = shade(col, -0.45); ctx.lineWidth = 1.6; ctx.stroke();
    // 지붕
    const r0 = P(-0.08, 1), r1 = P(1.08, 1), r2 = P(0.5, 1.0);
    ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]); ctx.lineTo(r2[0] + sh(1.0) * 0, r0[1] - 8); ctx.closePath();
    ctx.fillStyle = mixc('#b45309', '#78716c', clamp(dmgT, 0, 0.7)); ctx.fill();
    // 창문
    const rows = Math.max(2, Math.floor(h / 16));
    for (let r = 0; r < rows; r++) {
      const fy = (r + 0.7) / (rows + 0.2);
      for (let c = 0; c < 2; c++) {
        const a = P(0.18 + c * 0.45, fy), w = bw * 0.27;
        ctx.fillStyle = dmgT > 0.4 && (r + c) % 2 === 0 ? '#475569' : '#bfdbfe';
        ctx.fillRect(a[0], a[1] - 7, w, 7);
      }
    }
    // 내진 보강 가새(X자)
    if (v.brace) {
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.2;
      const a = P(0.05, 0.05), b2 = P(0.95, 0.95), c = P(0.95, 0.05), d = P(0.05, 0.95);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b2[0], b2[1]); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
    }
    // 균열
    if (dmgT > 0.3) {
      ctx.strokeStyle = 'rgba(30,20,10,' + clamp(dmgT * 1.4, 0, 0.9) + ')'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
      const a = P(0.35, 1), c1 = P(0.5, 0.7), c2 = P(0.3, 0.45), c3 = P(0.55, 0.2);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(c3[0], c3[1]); ctx.stroke();
      if (dmgT > 0.55) { const d2 = P(0.8, 0.8), d3 = P(0.65, 0.55); ctx.beginPath(); ctx.moveTo(d2[0], d2[1]); ctx.lineTo(d3[0], d3[1]); ctx.lineTo(P(0.8, 0.3)[0], P(0.8, 0.3)[1]); ctx.stroke(); }
    }
    ctx.restore();
  }
  function drawVillage(v) {
    const x = v.cx - VW / 2, y = v.top;
    const sel = v.selA;
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(x, y, VW, VH, 16); ctx.fill(); }, { blur: 12 + 8 * sel, y: 4, color: 'rgba(30,41,59,.22)' });
    ctx.lineWidth = 2 + 2.5 * sel; ctx.strokeStyle = sel > 0.05 ? mixc('#cbd5e1', '#0f172a', sel) : '#cbd5e1';
    D.roundRect(x, y, VW, VH, 16); ctx.stroke();
    ctx.restore();
    D.text(x + 12, y + 24, v.name, { size: 17, weight: 800, color: '#1b2333', align: 'left' });
    D.text(x + VW - 10, y + 24, v.km + ' km', { size: 13.5, weight: 800, color: '#0369a1', align: 'right' });
    D.text(x + 12, y + 44, v.soft ? '🏖️ ' + v.gtxt : '🪨 ' + v.gtxt, { size: 12.5, weight: 700, color: '#475569', align: 'left' });
    D.text(x + 12, y + 62, (v.brace ? '🛡️ ' : '🏚️ ') + v.dtxt, { size: 12.5, weight: 700, color: v.brace ? '#1d4ed8' : '#475569', align: 'left' });
    // 지반
    const gy = y + 142;
    ctx.save();
    ctx.beginPath(); D.roundRect(x + 6, y + 72, VW - 12, VH - 78, 10); ctx.clip();
    const sky = ctx.createLinearGradient(0, y + 72, 0, gy); sky.addColorStop(0, '#e0f2fe'); sky.addColorStop(1, '#f0f9ff'); ctx.fillStyle = sky; ctx.fillRect(x, y + 72, VW, gy - y - 72);
    ctx.save(); ctx.translate(v.g * (v.soft ? 1.0 : 0.8), 0);
    ctx.fillStyle = v.soft ? '#e8cf9a' : '#9ca3af'; ctx.fillRect(x - 20, gy, VW + 40, 60);
    if (v.soft) { ctx.strokeStyle = 'rgba(146,100,30,.45)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); for (let k = 0; k <= 12; k++) { const px = x - 10 + k * 14, py = gy + 8 + i * 8 + Math.sin(k * 1.3 + i) * 2.2; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); } }
    else { ctx.fillStyle = 'rgba(71,85,105,.5)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(x + 14 + i * 26, gy + 12 + (i % 2) * 14, 8, 4, 0, 0, TAU); ctx.fill(); } }
    ctx.fillStyle = v.soft ? '#d4b878' : '#6b7280'; ctx.fillRect(x - 20, gy, VW + 40, 3);
    ctx.restore();
    v.bl.forEach((b) => drawBuilding(v, b, gy, v.cx));
    ctx.restore();
    // 결과 줄
    const fy = y + VH - 5;
    if (QK.fired && v.fired) {
      const a = sstep(0.0, 0.6, QK.t - v.arrive - 0.5);
      ctx.save(); ctx.globalAlpha = a;
      pill(x + VW / 2, y + 162, '진도 ' + roman(v.I) + ' · 피해 ' + dmgName(v.dmg), { bg: dmgColor(v.dmg), color: '#fff', border: null, size: 12.5 });
      ctx.restore();
    } else {
      D.text(x + VW / 2, y + 166, QK.fired ? '지진파가 오고 있어요…' : '진도 ?  ·  피해 ?', { size: 12.5, weight: 700, color: '#94a3b8' });
    }
  }
  function drawQuake() {
    panelBG('#e2eedb');
    // 지도 바탕
    const g = ctx.createLinearGradient(0, 0, 800, 540); g.addColorStop(0, '#e6f1df'); g.addColorStop(1, '#dbe9d3'); ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 540);
    ctx.save(); ctx.strokeStyle = 'rgba(100,130,90,.12)'; ctx.lineWidth = 1;
    for (let x = 0; x <= 800; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 540); ctx.stroke(); }
    for (let y = 0; y <= 540; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke(); }
    ctx.restore();
    caption('같은 지진인데 마을마다 흔들림과 피해가 같을까요?');
    // 지진파
    QK.rings.forEach((r) => {
      if (r.r <= 2) return;
      const a = clamp(Math.exp(-r.r / 650) * 0.9, 0, 0.9);
      ctx.save();
      ctx.strokeStyle = 'rgba(234,88,12,' + a + ')'; ctx.lineWidth = 3 + (QK.M0 - 4) * 1.4;
      ctx.beginPath(); ctx.arc(EPIC.x, EPIC.y, r.r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(251,191,36,' + a * 0.7 + ')'; ctx.lineWidth = 1.5;
      if (r.r > 8) { ctx.beginPath(); ctx.arc(EPIC.x, EPIC.y, r.r - 6, 0, TAU); ctx.stroke(); }
      ctx.restore();
    });
    // 진앙 표시
    if (!QK.fired) D.ring(EPIC.x, EPIC.y, 22, S.t, { color: '#ea580c', speed: 0.9 });
    D.glow(EPIC.x, EPIC.y, 40 + QK.flash * 40, '#f59e0b', 0.35 + 0.5 * QK.flash);
    ctx.save(); ctx.translate(EPIC.x, EPIC.y); ctx.rotate(S.t * 0.4);
    ctx.fillStyle = '#ea580c'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? 7 : 15, a = (i / 10) * TAU - Math.PI / 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    pill(EPIC.x, EPIC.y + 34, '진앙', { bg: '#7c2d12', color: '#fff', border: null, size: 13.5 });
    pill(EPIC.x, EPIC.y + 62, '규모 ' + QK.M.toFixed(1), { bg: '#fff', color: '#9a3412', border: '#fdba74', size: 14 });
    // 거리 점선
    VILL.forEach((v) => {
      D.dashedLine(EPIC.x + 18, EPIC.y, v.cx - VW / 2 - 4 + (v.cx < 300 ? 0 : 0), v.top + 92, { color: 'rgba(30,41,59,.28)', width: 2, dash: [6, 7], offset: S.t * 10 });
    });
    VILL.forEach(drawVillage);
    example(784, 28, '※ 거리·진도·피해는 예시 자료');
    if (isNew('quake')) newTag();
  }

  /* =========================================================
     ④-a 폭염 일수 그래프 (예시 자료)
     ========================================================= */
  const HEAT = [6, 11, 7, 9, 5, 14, 8, 12, 18, 9, 11, 24, 13, 31, 14, 8, 19, 16, 22, 30];
  const HY0 = 2005;
  const HT = { y0: 2005, y1: 2024, y0S: 2005, y1S: 2024, tap: -1, tapA: 0, shortT: 0, longT: 0, seenShort: false, seenLong: false, slopeA: 0 };
  function heatStats() {
    const a = HT.y0 - HY0, b = HT.y1 - HY0, n = b - a + 1;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = a; i <= b; i++) { sx += i; sy += HEAT[i]; sxx += i * i; sxy += i * HEAT[i]; }
    const den = n * sxx - sx * sx;
    const slope = den ? (n * sxy - sx * sy) / den : 0;
    const mean = sy / n, icpt = (sy - slope * sx) / n;
    return { n, slope, mean, icpt, a, b };
  }
  const HP = { L: 90, R: 764, T: 100, B: 372 };
  const hx = (yr) => HP.L + 12 + (yr - HY0) / 19 * (HP.R - HP.L - 24);
  const hy = (v) => HP.B - (v / 40) * (HP.B - HP.T);
  function heatStep(dt) {
    HT.y0S = approach(HT.y0S, HT.y0, dt, 9); HT.y1S = approach(HT.y1S, HT.y1, dt, 9);
    HT.tapA = approach(HT.tapA, HT.tap >= 0 ? 1 : 0, dt, 12);
    const st = heatStats();
    HT.slopeA = approach(HT.slopeA, st.slope, dt, 8);
    if (S.scene === 'heat') {
      if (st.n >= 3 && st.n <= 5 && st.slope < 0) HT.shortT += dt; else HT.shortT = 0;
      if (st.n >= 15 && st.slope > 0) HT.longT += dt; else HT.longT = 0;
      if (HT.shortT > 0.8 && !HT.seenShort) { HT.seenShort = true; Sound.tick(); }
      if (HT.longT > 0.8 && !HT.seenLong) { HT.seenLong = true; Sound.tick(); }
    }
  }
  function drawHeat() {
    panelBG('#fff7ed');
    caption('같은 자료도 어느 기간을 보느냐에 따라 달라 보여요');
    example(784, 28, '※ 예시 자료 (실제 관측값이 아니에요)');
    const st = heatStats();
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(20, 56, 760, 346, 18); ctx.fill(); }, { blur: 12, y: 3 });
    ctx.restore();
    D.text(44, 84, '연도별 폭염 일수 (일)', { size: 14.5, weight: 800, color: '#334155', align: 'left' });
    // 격자
    ctx.save(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [0, 10, 20, 30, 40].forEach((v) => { ctx.beginPath(); ctx.moveTo(HP.L, hy(v)); ctx.lineTo(HP.R, hy(v)); ctx.stroke(); D.text(HP.L - 8, hy(v) + 4, String(v), { size: 12, weight: 700, color: '#94a3b8', align: 'right' }); });
    for (let yr = 2005; yr <= 2024; yr += 5) D.text(hx(yr), HP.B + 20, yr + '년', { size: 12, weight: 700, color: '#94a3b8' });
    ctx.restore();
    // 선택 기간 띠
    const bx0 = hx(HT.y0S) - 14, bx1 = hx(HT.y1S) + 14;
    ctx.save(); ctx.fillStyle = 'rgba(249,115,22,.12)'; D.roundRect(bx0, HP.T - 10, bx1 - bx0, HP.B - HP.T + 20, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(249,115,22,.6)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); D.roundRect(bx0, HP.T - 10, bx1 - bx0, HP.B - HP.T + 20, 10); ctx.stroke(); ctx.restore();
    // 선과 점
    ctx.save();
    ctx.beginPath(); HEAT.forEach((v, i) => { const x = hx(HY0 + i), y = hy(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.beginPath(); let started = false;
    HEAT.forEach((v, i) => { const yr = HY0 + i; if (yr < HT.y0 || yr > HT.y1) return; const x = hx(yr), y = hy(v); started ? ctx.lineTo(x, y) : ctx.moveTo(x, y); started = true; });
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3.5; ctx.stroke();
    HEAT.forEach((v, i) => {
      const yr = HY0 + i, inn = yr >= HT.y0 && yr <= HT.y1;
      D.sphere(hx(yr), hy(v), inn ? 6.5 : 5, inn ? '#f97316' : '#cbd5e1', { gloss: inn });
    });
    ctx.restore();
    // 경향선
    {
      const xa = hx(HT.y0S), xb = hx(HT.y1S);
      const va = st.icpt + st.slope * st.a, vb = st.icpt + st.slope * st.b;
      const col = st.slope < 0 ? '#2563eb' : '#dc2626';
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([9, 6]); ctx.lineDashOffset = -S.t * 18;
      ctx.beginPath(); ctx.moveTo(xa, hy(clamp(va, 0, 40))); ctx.lineTo(xb, hy(clamp(vb, 0, 40))); ctx.stroke(); ctx.restore();
      pill((xa + xb) / 2, Math.min(HP.B - 14, hy(clamp((va + vb) / 2, 0, 40)) - 26 < HP.T ? hy(clamp((va + vb) / 2, 0, 40)) + 26 : hy(clamp((va + vb) / 2, 0, 40)) - 26), '경향선: ' + (Math.abs(st.slope) < 0.15 ? '거의 변화 없음' : st.slope > 0 ? '늘어남 ↗' : '줄어듦 ↘'), { bg: col, color: '#fff', border: null, size: 13.5 });
    }
    // 점 눌렀을 때
    if (HT.tap >= 0 && HT.tapA > 0.02) {
      const i = HT.tap, x = hx(HY0 + i), y = hy(HEAT[i]);
      ctx.save(); ctx.globalAlpha = HT.tapA;
      D.dashedLine(x, y, x, HP.B, { color: '#64748b', width: 1.5 });
      pill(clamp(x, 100, 700), y - 22 * HT.tapA - 8, (HY0 + i) + '년 · ' + HEAT[i] + '일', { bg: '#1e293b', color: '#fff', border: null, size: 13.5 });
      ctx.restore();
    }
    // 안내 문구
    let msg, mc = '#334155', bg = '#f1f5f9';
    if (st.n <= 5) { msg = st.slope < 0 ? '⚠️ 짧은 기간만 보면 줄어드는 것처럼 보여요! 이 결론을 믿어도 될까요?' : '이 짧은 기간은 늘어나는 것처럼 보여요. 기간을 바꿔 비교해 봐요.'; if (st.slope < 0) { bg = '#fef2f2'; mc = '#b91c1c'; } }
    else if (st.n >= 15) { msg = st.slope > 0 ? '✔ 긴 기간으로 보면 해마다 오르내리지만, 전체적으로 늘어나는 경향이 보여요.' : '긴 기간의 경향이 보여요.'; if (st.slope > 0) { bg = '#f0fdf4'; mc = '#166534'; } }
    else msg = '기간을 좁히거나 넓혀 경향선이 어떻게 달라지는지 비교해 봐요.';
    ctx.save(); ctx.fillStyle = bg; D.roundRect(20, 416, 760, 44, 14); ctx.fill(); ctx.restore();
    D.text(400, 444, msg, { size: 15, weight: 800, color: mc });
    D.text(400, 490, '평균 ' + st.mean.toFixed(1) + '일  ·  기간 ' + HT.y0 + '~' + HT.y1 + '년 (' + st.n + '개 연도)', { size: 13.5, weight: 700, color: '#64748b' });
    if (isNew('heat')) newTag();
  }

  /* =========================================================
     ④-b 해수면 온도와 태풍 (예시 자료)
     ========================================================= */
  const TY = [[26.2, 24], [26.8, 31], [27.1, 28], [27.5, 36], [27.9, 33], [28.2, 42], [28.6, 38], [28.9, 47], [29.1, 40], [29.4, 52], [29.8, 49], [30.1, 45], [30.3, 57], [30.6, 50]];
  const TP = { L: 96, R: 764, T: 100, B: 372 };
  const tx = (v) => TP.L + 16 + (v - 26) / 5 * (TP.R - TP.L - 32);
  const ty = (v) => TP.B - ((v - 20) / 45) * (TP.B - TP.T);
  const TS = { sel: -1, selA: 0, tapped: new Set(), pulse: TY.map(() => 0) };
  function tyStep(dt) { TS.selA = approach(TS.selA, TS.sel >= 0 ? 1 : 0, dt, 12); TS.pulse = TS.pulse.map((p, i) => approach(p, TS.sel === i ? 1 : 0, dt, 12)); }
  function drawTyphoon() {
    panelBG('#eff6ff');
    caption('해수면 온도가 다른 태풍 14개를 비교해 보세요');
    example(784, 28, '※ 예시 자료 (실제 관측값이 아니에요)');
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(20, 56, 760, 346, 18); ctx.fill(); }, { blur: 12, y: 3 });
    ctx.restore();
    D.text(44, 84, '● 태풍 한 개마다 한 점  (세로축: 최대 풍속, m/s)', { size: 14.5, weight: 800, color: '#334155', align: 'left' });
    ctx.save(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    [20, 30, 40, 50, 60].forEach((v) => { ctx.beginPath(); ctx.moveTo(TP.L, ty(v)); ctx.lineTo(TP.R, ty(v)); ctx.stroke(); D.text(TP.L - 8, ty(v) + 4, String(v), { size: 12, weight: 700, color: '#94a3b8', align: 'right' }); });
    for (let v = 26; v <= 31; v++) D.text(tx(v), TP.B + 20, v + ' °C', { size: 12, weight: 700, color: '#94a3b8' });
    ctx.restore();
    D.text(TP.R, TP.B + 44, '태풍이 지나간 곳의 해수면 온도 (°C) →', { size: 13, weight: 800, color: '#475569', align: 'right' });
    // 경향선(참고)
    const n = TY.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
    TY.forEach(([a, b]) => { sx += a; sy += b; sxx += a * a; sxy += a * b; });
    const sl = (n * sxy - sx * sy) / (n * sxx - sx * sx), ic = (sy - sl * sx) / n;
    ctx.save(); ctx.strokeStyle = 'rgba(37,99,235,.55)'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -S.t * 14;
    ctx.beginPath(); ctx.moveTo(tx(26), ty(ic + sl * 26)); ctx.lineTo(tx(31), ty(ic + sl * 31)); ctx.stroke(); ctx.restore();
    pill(tx(30.4), ty(ic + sl * 30.4) + 34, '경향선(참고)', { bg: 'rgba(37,99,235,.85)', color: '#fff', border: null, size: 12.5 });
    TY.forEach(([a, b], i) => {
      const p = TS.pulse[i];
      const x = tx(a), y = ty(b);
      if (!TS.tapped.has(i)) D.glow(x, y, 16, '#38bdf8', 0.28 + 0.12 * Math.sin(S.t * 3 + i));
      D.sphere(x, y, 8 + 3 * p, TS.tapped.has(i) ? '#2563eb' : '#38bdf8', { shadow: true });
    });
    if (TS.sel >= 0) {
      const [a, b] = TY[TS.sel], x = tx(a), y = ty(b);
      ctx.save(); ctx.globalAlpha = TS.selA;
      D.dashedLine(x, y, x, TP.B, { color: '#64748b', width: 1.5 }); D.dashedLine(TP.L, y, x, y, { color: '#64748b', width: 1.5 });
      pill(clamp(x, 150, 700), y - 28, '해수면 ' + a.toFixed(1) + ' °C · 풍속 ' + b + ' m/s', { bg: '#1e293b', color: '#fff', border: null, size: 13.5 });
      ctx.restore();
    }
    ctx.save(); ctx.fillStyle = '#f1f5f9'; D.roundRect(20, 416, 760, 44, 14); ctx.fill(); ctx.restore();
    D.text(400, 444, '따뜻한 바다일수록 풍속이 큰 경향이 있지만, 같은 온도에서도 점마다 달라요.', { size: 15, weight: 800, color: '#334155' });
    D.text(400, 490, '태풍은 따뜻한 바다에서 수증기를 공급받아 발달해요.', { size: 13.5, weight: 700, color: '#64748b' });
    if (isNew('typhoon')) newTag();
  }

  /* =========================================================
     ④-c 화학 물질 유출 확산 지도
     ========================================================= */
  const GW = 40, GH = 27, GC = 20;
  const FAC = { x: 270, y: 292 };
  const WINDS = { E: { dx: 1, dy: 0, label: '➡ 동쪽', name: '동쪽' }, S: { dx: 0, dy: 1, label: '⬇ 남쪽', name: '남쪽' }, W: { dx: -1, dy: 0, label: '⬅ 서쪽', name: '서쪽' }, N: { dx: 0, dy: -1, label: '⬆ 북쪽', name: '북쪽' } };
  const GV = [
    { id: 'a', name: '가 마을', x: 560, y: 315 },
    { id: 'b', name: '나 마을', x: 300, y: 470 },
    { id: 'c', name: '다 마을', x: 330, y: 120 },
    { id: 'd', name: '라 마을', x: 78, y: 300 },
  ];
  function terrain(x, y) {
    const gs = (cx, cy, sg, a) => a * Math.exp(-((x - cx) * (x - cx) + (y - cy) * (y - cy)) / (2 * sg * sg));
    const yv = 300 + 0.1 * (x - 400) + 18 * Math.sin(x / 120);
    const val = 0.3 * Math.exp(-((y - yv) * (y - yv)) / (2 * 55 * 55));
    return clamp(0.42 + gs(340, 95, 85, 0.75) + gs(660, 90, 110, 0.6) + gs(110, 480, 100, 0.5) + gs(720, 480, 70, 0.25) - val, 0, 1.2);
  }
  const GG = { h: new Float32Array(GW * GH), gx: new Float32Array(GW * GH), gy: new Float32Array(GW * GH), c: new Float32Array(GW * GH), c2: new Float32Array(GW * GH), terr: null };
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) GG.h[j * GW + i] = terrain(i * GC + GC / 2, j * GC + GC / 2);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const h = (a, b) => GG.h[clamp(b, 0, GH - 1) * GW + clamp(a, 0, GW - 1)];
    GG.gx[j * GW + i] = (h(i + 1, j) - h(i - 1, j)) / (2 * GC);
    GG.gy[j * GW + i] = (h(i, j + 1) - h(i, j - 1)) / (2 * GC);
  }
  const GAS = { wind: 'E', running: false, t: 0, peaks: { a: 0, b: 0, c: 0, d: 0 }, winds: new Set(), sel: new Set(), parts: [], selA: { a: 0, b: 0, c: 0, d: 0 }, reveal: 0, shake: { a: 0, b: 0, c: 0, d: 0 }, warned: new Set() };
  const G_WSPD = 40, G_K = 9000, G_LEAK = 8, G_END = 22, G_Q = 110, G_DIFF = 0.35;
  const LV_HI = 0.6, LV_MID = 0.2;
  const gcell = new SciSim.Particles();
  function gasSample(arr, x, y) {
    const fx_ = clamp(x / GC - 0.5, 0, GW - 1.001), fy_ = clamp(y / GC - 0.5, 0, GH - 1.001);
    const i = Math.floor(fx_), j = Math.floor(fy_), a = fx_ - i, b = fy_ - j;
    return arr[j * GW + i] * (1 - a) * (1 - b) + arr[j * GW + i + 1] * a * (1 - b) + arr[(j + 1) * GW + i] * (1 - a) * b + arr[(j + 1) * GW + i + 1] * a * b;
  }
  function gasVel(x, y, out) {
    const w = WINDS[GAS.wind];
    // 공기보다 무거운 기체는 낮은 곳으로 흘러내려요
    out[0] = w.dx * G_WSPD - G_K * gasSample(GG.gx, x, y);
    out[1] = w.dy * G_WSPD - G_K * gasSample(GG.gy, x, y);
    return out;
  }
  const _v = [0, 0];
  function gasReset(clear) {
    GG.c.fill(0); GG.c2.fill(0); GAS.t = 0; GAS.running = false; GAS.parts.length = 0;
    GAS.peaks = { a: 0, b: 0, c: 0, d: 0 }; GAS.sel.clear(); GAS.warned.clear();
  }
  function gasStart() {
    GG.c.fill(0); GG.c2.fill(0); GAS.t = 0; GAS.running = true; GAS.parts.length = 0; GAS.peaks = { a: 0, b: 0, c: 0, d: 0 };
    GAS.winds.add(GAS.wind); GAS.sel.clear(); GAS.warned.clear();
    Sound.tick();
  }
  function gasPhys(dt) {
    const c = GG.c, o = GG.c2;
    const fi = Math.floor(FAC.x / GC), fj = Math.floor(FAC.y / GC);
    if (GAS.t < G_LEAK) { c[fj * GW + fi] += G_Q * dt; c[fj * GW + fi + 1] += G_Q * dt * 0.5; c[(fj + 1) * GW + fi] += G_Q * dt * 0.5; }
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const k = j * GW + i, x = i * GC + GC / 2, y = j * GC + GC / 2;
      gasVel(x, y, _v);
      o[k] = gasSample(c, x - _v[0] * dt, y - _v[1] * dt);
    }
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const k = j * GW + i;
      const l = i > 0 ? o[k - 1] : o[k], r = i < GW - 1 ? o[k + 1] : o[k], u = j > 0 ? o[k - GW] : o[k], d = j < GH - 1 ? o[k + GW] : o[k];
      c[k] = Math.max(0, (o[k] + G_DIFF * dt * (l + r + u + d - 4 * o[k])) * (1 - 0.03 * dt));
    }
    GAS.t += dt;
    GV.forEach((v) => { const val = gasSample(c, v.x, v.y); if (val > GAS.peaks[v.id]) GAS.peaks[v.id] = val; });
    if (GAS.t >= G_END) GAS.running = false;
  }
  const glevel = (p) => (p >= LV_HI ? 2 : p >= LV_MID ? 1 : 0);
  function gasStep(dt) {
    if (GAS.running) {
      let rem = dt, g = 0; while (rem > 1e-6 && g++ < 6) { const d = Math.min(0.05, rem); gasPhys(d); rem -= d; }
      // 연기 입자(시각 효과)
      if (GAS.t < G_LEAK && !SciSim.reduceMotion) {
        GAS.emit = (GAS.emit || 0) + dt * 36;
        while (GAS.emit >= 1) { GAS.emit -= 1; GAS.parts.push({ x: FAC.x + (Math.random() - 0.5) * 14, y: FAC.y + (Math.random() - 0.5) * 14, age: 0, life: 5 + Math.random() * 3, s: 8 + Math.random() * 6 }); }
      }
    }
    for (let i = GAS.parts.length - 1; i >= 0; i--) {
      const p = GAS.parts[i]; p.age += dt;
      if (p.age > p.life) { GAS.parts.splice(i, 1); continue; }
      gasVel(p.x, p.y, _v);
      p.x += (_v[0] + (Math.random() - 0.5) * 16) * dt; p.y += (_v[1] + (Math.random() - 0.5) * 16) * dt; p.s += 7 * dt;
    }
    GV.forEach((v) => { GAS.selA[v.id] = approach(GAS.selA[v.id], GAS.sel.has(v.id) ? 1 : 0, dt, 12); GAS.shake[v.id] *= Math.exp(-4 * dt); });
    const rev = game && (game.free || (game.current() && game.current().id === 'gasPick' && game.phase === 'success'));
    GAS.reveal = approach(GAS.reveal, rev ? 1 : 0, dt, 5);
  }
  // 지형 지도 미리 그리기
  function buildTerrain() {
    const c = document.createElement('canvas'); c.width = 800; c.height = 540;
    const g = c.getContext('2d');
    const img = g.createImageData(800, 540), d = img.data;
    const stops = [[0, [188, 224, 170]], [0.38, [214, 232, 176]], [0.55, [236, 232, 176]], [0.8, [214, 188, 140]], [1.1, [176, 142, 104]]];
    const colAt = (h) => { for (let s = 1; s < stops.length; s++) { if (h <= stops[s][0]) { const a = stops[s - 1], b = stops[s], t = (h - a[0]) / (b[0] - a[0]); return [a[1][0] + (b[1][0] - a[1][0]) * t, a[1][1] + (b[1][1] - a[1][1]) * t, a[1][2] + (b[1][2] - a[1][2]) * t]; } } return stops[stops.length - 1][1]; };
    const H = new Float32Array(800 * 540);
    for (let y = 0; y < 540; y++) for (let x = 0; x < 800; x++) H[y * 800 + x] = terrain(x, y);
    for (let y = 0; y < 540; y++) for (let x = 0; x < 800; x++) {
      const k = y * 800 + x, h = H[k];
      const hl = H[y * 800 + Math.max(0, x - 1)], hu = H[Math.max(0, y - 1) * 800 + x];
      let sh = ((hl - h) + (hu - h)) * 18; sh = clamp(sh, -0.25, 0.25);
      const col = colAt(h);
      const band = Math.floor(h * 14), bl = Math.floor(hl * 14), bu = Math.floor(hu * 14);
      const contour = band !== bl || band !== bu;
      const f = contour ? 0.86 : 1 + sh;
      const o = k * 4;
      d[o] = clamp(col[0] * f, 0, 255); d[o + 1] = clamp(col[1] * f, 0, 255); d[o + 2] = clamp(col[2] * f, 0, 255); d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // 하천
    g.strokeStyle = '#7fb8e6'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath();
    for (let x = -10; x <= 810; x += 8) { const yv = 300 + 0.1 * (x - 400) + 18 * Math.sin(x / 120) + 26; x === -10 ? g.moveTo(x, yv) : g.lineTo(x, yv); }
    g.stroke(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.stroke();
    return c;
  }
  let terrCv = null;
  const gasImg = document.createElement('canvas'); gasImg.width = GW; gasImg.height = GH;
  const gasImgCtx = gasImg.getContext('2d'); const gasData = gasImgCtx.createImageData(GW, GH);
  function drawGas() {
    if (!terrCv) terrCv = buildTerrain();
    ctx.drawImage(terrCv, 0, 0, 800, 540);
    // 바람 줄무늬
    const w = WINDS[GAS.wind];
    ctx.save(); ctx.strokeStyle = 'rgba(30,64,175,.20)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let k = 0; k < 14; k++) {
      const ph = ((S.t * 0.22 + k * 0.137) % 1);
      const bx = (k * 211) % 800, by = (k * 97 + 40) % 540;
      const off = ph * 120 - 60;
      const x1 = bx + w.dx * off, y1 = by + w.dy * off;
      ctx.globalAlpha = Math.sin(ph * Math.PI);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + w.dx * 38, y1 + w.dy * 38); ctx.stroke();
    }
    ctx.restore();
    // 농도 구름
    const c = GG.c;
    for (let k = 0; k < GW * GH; k++) {
      const v = c[k], a = 0.86 * (1 - Math.exp(-4 * v)), t = clamp(v / 1.2, 0, 1);
      const o = k * 4;
      gasData.data[o] = 250 - 20 * t; gasData.data[o + 1] = 215 - 175 * t; gasData.data[o + 2] = 40 - 10 * t; gasData.data[o + 3] = a * 255;
    }
    gasImgCtx.putImageData(gasData, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(gasImg, 0, 0, 800, 540); ctx.restore();
    GAS.parts.forEach((p) => {
      const a = (1 - p.age / p.life) * 0.35;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s);
      g.addColorStop(0, 'rgba(180,150,30,' + a + ')'); g.addColorStop(1, 'rgba(180,150,30,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill();
    });
    // 공장
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#64748b'; D.roundRect(FAC.x - 24, FAC.y - 18, 48, 30, 5); ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#475569'; ctx.fillRect(FAC.x - 16, FAC.y - 34, 9, 18); ctx.fillRect(FAC.x + 4, FAC.y - 28, 9, 12);
    ctx.fillStyle = '#fde68a'; ctx.fillRect(FAC.x - 16, FAC.y - 8, 8, 8); ctx.fillRect(FAC.x - 3, FAC.y - 8, 8, 8); ctx.fillRect(FAC.x + 10, FAC.y - 8, 8, 8);
    ctx.restore();
    pill(FAC.x, FAC.y + 28, '🏭 화학 공장', { bg: '#7f1d1d', color: '#fff', border: null, size: 13 });
    if (!GAS.running && GAS.t === 0) D.ring(FAC.x, FAC.y - 4, 34, S.t, { color: '#dc2626', speed: 0.9 });
    // 마을
    GV.forEach((v) => {
      const sel = GAS.selA[v.id], sh = Math.sin(S.t * 50) * 5 * GAS.shake[v.id];
      const lv = glevel(GAS.peaks[v.id]);
      ctx.save(); ctx.translate(v.x + sh, v.y);
      if (sel > 0.02) { ctx.globalAlpha = sel; ctx.fillStyle = 'rgba(220,38,38,.18)'; ctx.beginPath(); ctx.arc(0, 0, 36 + 4 * Math.sin(S.t * 5), 0, TAU); ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3.5; ctx.stroke(); ctx.globalAlpha = 1; }
      D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(-30, -22, 60, 40, 9); ctx.fill(); }, { blur: 8, y: 3 });
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(-22, -10, 14, 22); ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-4, -16, 16, 28); ctx.fillStyle = '#e8d5b7'; ctx.fillRect(14, -6, 12, 18);
      ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.moveTo(-24, -10); ctx.lineTo(-15, -20); ctx.lineTo(-6, -10); ctx.fill();
      ctx.restore();
      pill(v.x, v.y + 34, v.name, { bg: sel > 0.5 ? '#dc2626' : '#fff', color: sel > 0.5 ? '#fff' : '#1b2333', border: sel > 0.5 ? null : '#94a3b8', size: 13.5 });
      if (GAS.reveal > 0.05) {
        ctx.save(); ctx.globalAlpha = GAS.reveal;
        const lab = ['낮음', '보통', '높음'][lv], col = ['#16a34a', '#d97706', '#dc2626'][lv];
        pill(v.x, v.y - 40, '농도 ' + lab, { bg: col, color: '#fff', border: null, size: 12.5 });
        ctx.restore();
      }
    });
    // 나침반 + 바람 표시
    ctx.save();
    ctx.translate(748, 74);
    ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.arc(0, 0, 36, 0, TAU); ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
    D.text(0, -21, '북', { size: 12.5, weight: 800, color: '#475569' }); D.text(0, 30, '남', { size: 12.5, weight: 800, color: '#475569' }); D.text(-25, 4, '서', { size: 12.5, weight: 800, color: '#475569' }); D.text(25, 4, '동', { size: 12.5, weight: 800, color: '#475569' });
    D.arrow(-w.dx * 9, -w.dy * 9 + 1, w.dx * 14, w.dy * 14 + 1, { color: '#2563eb', width: 5, head: 11 });
    ctx.restore();
    pill(748, 126, '바람: ' + w.name + '으로', { bg: '#1d4ed8', color: '#fff', border: null, size: 12.5 });
    // 범례
    ctx.save();
    ctx.translate(468, 0);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; D.roundRect(16, 480, 300, 48, 12); ctx.fill();
    const lg = ctx.createLinearGradient(26, 0, 126, 0); lg.addColorStop(0, '#bce0aa'); lg.addColorStop(0.5, '#ece8b0'); lg.addColorStop(1, '#b08e68');
    ctx.fillStyle = lg; ctx.fillRect(26, 490, 100, 10);
    D.text(26, 518, '낮은 곳', { size: 12, weight: 700, color: '#475569', align: 'left' }); D.text(126, 518, '높은 곳', { size: 12, weight: 700, color: '#475569', align: 'right' });
    const lg2 = ctx.createLinearGradient(160, 0, 300, 0); lg2.addColorStop(0, 'rgba(250,215,40,.2)'); lg2.addColorStop(0.5, 'rgba(240,150,30,.7)'); lg2.addColorStop(1, 'rgba(230,40,30,.9)');
    ctx.fillStyle = lg2; ctx.fillRect(160, 490, 140, 10);
    D.text(160, 518, '묽은 가스', { size: 12, weight: 700, color: '#475569', align: 'left' }); D.text(300, 518, '진한 가스', { size: 12, weight: 700, color: '#475569', align: 'right' });
    ctx.restore();
    caption('☣️ 유독 가스는 공기보다 무거워 낮은 곳으로 흘러요');
    if (GAS.running || GAS.t > 0) pill(784, 462, '유출 후 ' + Math.floor(GAS.t) + '초', { bg: 'rgba(30,41,59,.84)', color: '#fff', border: null, size: 13, align: 'right' });
    else showGasIdle();
    if (isNew('gas')) newTag();
  }
  function showGasIdle() { example(784, 462, '※ 단순화한 모형 (예시)'); }

  /* =========================================================
     장면 전환 · 갱신 · 조작
     ========================================================= */
  const DRAW = { cards: drawCards, epi: drawEpi, quake: drawQuake, heat: drawHeat, typhoon: drawTyphoon, gas: drawGas };
  const STEPF = { cards: cardsStep, epi: epiStep, quake: quakeStep, heat: heatStep, typhoon: tyStep, gas: gasStep };
  const PANEL = { cards: 'cCards', epi: 'cEpi', quake: 'cQuake', heat: 'cGraph', typhoon: 'cTy', gas: 'cGas' };
  const HINT = {
    cards: '👆 카드를 눌러 원인을 읽고, 알맞은 상자로 끌어 놓아요',
    epi: '🚶 이동량·😷 마스크·💉 접종을 바꿔 곡선을 비교해요',
    quake: '📏 규모를 정하고 💥 지진을 일으켜요. 마을을 눌러 골라 봐요',
    heat: '📅 시작·끝 연도를 바꿔 경향선이 어떻게 달라지는지 봐요',
    typhoon: '● 점을 눌러 값을 읽어 봐요',
    gas: '🌬️ 바람 방향을 고르고 ☣️ 유출을 시작해 봐요',
  };
  const snap = document.createElement('canvas');
  function setScene(id) {
    if (id === S.scene) return;
    try {
      snap.width = view.canvas.width; snap.height = view.canvas.height;
      snap.getContext('2d').drawImage(view.canvas, 0, 0);
      S.hasSnap = true;
    } catch (e) { S.hasSnap = false; }
    S.prev = S.scene; S.scene = id; S.tr = 0;
    SciSim.tween(S, { tr: 1 }, { duration: 0.45, ease: 'outCubic' });
    afterScene();
  }
  const WRAPBG = { cards: '#eef2f7', epi: '#eef2f7', quake: '#e2eedb', heat: '#fff7ed', typhoon: '#eff6ff', gas: '#c9dfb6' };
  function afterScene() {
    view.wrap.style.setProperty('--stage-bg', WRAPBG[S.scene]);
    Object.keys(PANEL).forEach((k) => $('#' + PANEL[k]).classList.toggle('is-off', k !== S.scene));
    showHint(HINT[S.scene], 6000);
    segKey = '';
    renderSeg();
  }
  let segKey = '';
  function renderSeg() {
    const lvl = game ? (game.free ? -1 : game.level) : 0;
    const list = SCENES.filter((s) => lvl < 0 || s.step === lvl);
    const key = lvl + '|' + S.scene;
    if (key === segKey) return;
    segKey = key;
    const box = $('#sceneSeg'); box.innerHTML = '';
    list.forEach((s) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = s.label;
      if (s.id === S.scene) b.className = 'on';
      b.addEventListener('click', () => { Sound.click(); setScene(s.id); });
      box.appendChild(b);
    });
    box.classList.toggle('is-off', list.length < 2);
  }
  function resetScene() {
    Sound.click();
    switch (S.scene) {
      case 'cards': cardsReset(); break;
      case 'epi': epReset(true); break;
      case 'quake': quakeReset(); break;
      case 'heat': setYears(2005, 2024); HT.tap = -1; break;
      case 'typhoon': TS.sel = -1; break;
      case 'gas': gasReset(); break;
    }
  }
  $('#resetBtn').addEventListener('click', resetScene);

  /* ---------- 컨트롤 ---------- */
  const mvUI = SciSim.bindRange($('#sMove'), $('#oMove'), (v) => v + '%', (v) => { EP.P.move = v; epReset(); });
  const vcUI = SciSim.bindRange($('#sVacc'), $('#oVacc'), (v) => v + '%', (v) => { EP.P.vacc = v; epReset(); });
  function setMask(v, silent) { EP.P.mask = v; const b = $('#tgMask'); b.setAttribute('aria-pressed', v); b.textContent = v ? '😷 마스크 쓰는 중' : '😷 마스크 쓰기'; if (!silent) epReset(); }
  $('#tgMask').addEventListener('click', () => setMask(!EP.P.mask));
  function setEpiParams(m, k, v) { EP.P.move = m; EP.P.mask = k; EP.P.vacc = v; mvUI.set(m); vcUI.set(v); setMask(k, true); epReset(true); }
  const magUI = SciSim.bindRange($('#sMag'), $('#oMag'), (v) => '규모 ' + (+v).toFixed(1), (v) => { QK.M = +v; });
  $('#quakeBtn').addEventListener('click', () => { quakeFire(); });
  const y0UI = SciSim.bindRange($('#sY0'), $('#oY0'), (v) => v + '년', (v) => { HT.y0 = v; if (HT.y1 < v + 2) { HT.y1 = v + 2; y1UI.set(HT.y1); } HT.tap = -1; });
  const y1UI = SciSim.bindRange($('#sY1'), $('#oY1'), (v) => v + '년', (v) => { HT.y1 = v; if (HT.y0 > v - 2) { HT.y0 = v - 2; y0UI.set(HT.y0); } HT.tap = -1; });
  function setYears(a, b) { HT.y0 = a; HT.y1 = b; y0UI.set(a); y1UI.set(b); }
  (function mkWindBtns() {
    const box = $('#windBtns');
    Object.keys(WINDS).forEach((k) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tgl'; b.dataset.w = k; b.textContent = WINDS[k].label;
      b.setAttribute('aria-pressed', k === GAS.wind);
      b.addEventListener('click', () => { Sound.click(); setWind(k); });
      box.appendChild(b);
    });
  })();
  function setWind(k) {
    GAS.wind = k; $$('#windBtns .tgl').forEach((b) => b.setAttribute('aria-pressed', b.dataset.w === k));
    gasReset();
  }
  $('#leakBtn').addEventListener('click', gasStart);

  /* ---------- 캔버스 직접 조작 ---------- */
  let ptr = null;
  SciSim.pointer(view, {
    down(p) {
      if (S.scene === 'cards') {
        const c = cardAt(p);
        if (!c) return false;
        ptr = { c, ox: p.x - c.x, oy: p.y - c.y, x0: p.x, y0: p.y, t0: performance.now() };
        c.drag = true; if (c.tw) c.tw.cancel();
        CD.order.splice(CD.order.indexOf(c), 1); CD.order.push(c);
        Sound.tick();
        return true;
      }
      if (S.scene === 'quake') {
        for (const v of VILL) if (p.x >= v.cx - VW / 2 && p.x <= v.cx + VW / 2 && p.y >= v.top && p.y <= v.top + VH) { QK.sel = QK.sel === v.id ? null : v.id; Sound.tick(); return false; }
      }
      if (S.scene === 'heat') {
        let best = -1, bd = 26;
        HEAT.forEach((v, i) => { const d = Math.hypot(p.x - hx(HY0 + i), p.y - hy(v)); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) { HT.tap = HT.tap === best ? -1 : best; Sound.tick(); }
        return false;
      }
      if (S.scene === 'typhoon') {
        let best = -1, bd = 28;
        TY.forEach(([a, b], i) => { const d = Math.hypot(p.x - tx(a), p.y - ty(b)); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) { TS.sel = TS.sel === best ? -1 : best; if (TS.sel >= 0) TS.tapped.add(best); Sound.tick(); }
        return false;
      }
      if (S.scene === 'gas') {
        for (const v of GV) if (Math.hypot(p.x - v.x, p.y - v.y + 4) < 42) {
          if (GAS.t < 1) { toastOnce('먼저 ☣️ 유출을 시작해서 가스가 퍼지는 모습을 봐요.'); return false; }
          if (GAS.sel.has(v.id)) GAS.sel.delete(v.id); else GAS.sel.add(v.id);
          GAS.warned.delete(v.id); Sound.tick(); return false;
        }
      }
      return false;
    },
    move(p) {
      if (!ptr) return;
      const c = ptr.c;
      c.x = clamp(p.x - ptr.ox, 4, 800 - CW - 4); c.y = clamp(p.y - ptr.oy, 4, 540 - CH - 4);
      CD.over = boxAt({ x: c.x + CW / 2, y: c.y + CH / 2 });
    },
    up(p) {
      if (!ptr) return;
      const c = ptr.c, moved = Math.hypot(p.x - ptr.x0, p.y - ptr.y0);
      c.drag = false; CD.sel = c;
      const dest = boxAt({ x: c.x + CW / 2, y: c.y + CH / 2 });
      CD.over = null;
      if (moved >= 8) {
        const before = c.box;
        c.box = dest; c.warned = false; c.shake = 0;
        if (dest && dest !== before) { fx.burst(c.x + CW / 2, c.y + CH / 2, { count: 10, speed: 110, colors: [BOX[dest].c, '#fff'], life: 0.5, size: 3 }); Sound.tick(); }
      }
      ptr = null;
      reflow(null);
    },
    hover(p) {
      if (S.scene === 'cards' && cardAt(p)) return 'grab';
      if (S.scene === 'quake' && VILL.some((v) => Math.abs(p.x - v.cx) < VW / 2 && p.y > v.top && p.y < v.top + VH)) return 'pointer';
      if (S.scene === 'heat' && HEAT.some((v, i) => Math.hypot(p.x - hx(HY0 + i), p.y - hy(v)) < 20)) return 'pointer';
      if (S.scene === 'typhoon' && TY.some(([a, b]) => Math.hypot(p.x - tx(a), p.y - ty(b)) < 20)) return 'pointer';
      if (S.scene === 'gas' && GV.some((v) => Math.hypot(p.x - v.x, p.y - v.y) < 40)) return 'pointer';
      return 'default';
    },
  });
  let lastToast = 0;
  function toastOnce(msg) { const n = performance.now(); if (n - lastToast > 2500) { lastToast = n; SciSim.toast(msg); } }

  /* ---------- 읽기 값 ---------- */
  const roC = {};
  function setRO(i, label, html) {
    if (roC['l' + i] !== label) { roC['l' + i] = label; $('#rl' + i).textContent = label; }
    if (roC['v' + i] !== html) { roC['v' + i] = html; $('#rv' + i).innerHTML = html; }
  }
  let lastUI = 0;
  function readouts(t) {
    if (t - lastUI < 0.1) return; lastUI = t;
    switch (S.scene) {
      case 'cards': {
        const n = cards.filter((c) => c.box).length;
        setRO(1, '분류한 카드', n + '<small>/ 10장</small>');
        setRO(2, '🌋 자연 재난', cards.filter((c) => c.box === 'nat').length + '<small>장</small>');
        setRO(3, '🏭 사회 재난', cards.filter((c) => c.box === 'soc').length + '<small>장</small>');
        break;
      }
      case 'epi': {
        const m = EP.m;
        setRO(1, '경과 시간', Math.floor(m.t) + '<small>일</small>');
        setRO(2, '지금 감염자', m.cnt[1] + '<small>명</small>');
        setRO(3, '최대 감염자 (기본 ' + BASE.peak + '명)', m.peak + '<small>명</small>');
        break;
      }
      case 'quake': {
        const v = VILL.find((x) => x.id === QK.sel);
        setRO(1, '지진의 규모 (하나의 값)', QK.M.toFixed(1));
        setRO(2, v ? v.name + ' 진도' : '마을을 눌러 보세요', v ? (QK.fired && v.fired ? roman(v.I) : '?') : '-');
        setRO(3, v ? v.name + ' 피해' : '피해 정도', v ? (QK.fired && v.fired ? dmgName(v.dmg) : '?') : '-');
        break;
      }
      case 'heat': {
        const st = heatStats();
        setRO(1, '보는 기간', st.n + '<small>년</small>');
        setRO(2, '평균 폭염 일수', st.mean.toFixed(1) + '<small>일</small>');
        setRO(3, '경향', Math.abs(st.slope) < 0.15 ? '거의 같음' : st.slope > 0 ? '늘어남 ↗' : '줄어듦 ↘');
        break;
      }
      case 'typhoon': {
        const s = TS.sel >= 0 ? TY[TS.sel] : null;
        setRO(1, '해수면 온도', s ? s[0].toFixed(1) + '<small>°C</small>' : '-');
        setRO(2, '최대 풍속', s ? s[1] + '<small>m/s</small>' : '-');
        setRO(3, '살펴본 점', TS.tapped.size + '<small>/ 14개</small>');
        break;
      }
      case 'gas': {
        setRO(1, '바람이 불어가는 쪽', WINDS[GAS.wind].name);
        setRO(2, '유출 후 시간', Math.floor(GAS.t) + '<small>초</small>');
        setRO(3, '고른 마을', GAS.sel.size + '<small>곳</small>');
        break;
      }
    }
  }

  /* =========================================================
     퀴즈 그림 (인라인 SVG)
     ========================================================= */
  const FIG = {
    quake: '<svg viewBox="0 0 320 150" width="320" height="150" role="img" aria-label="같은 지진, 마을별 진도와 피해: 가 마을 진도 6 피해 작음, 나 마을 진도 6 피해 큼, 다 마을 진도 3 피해 미미"><rect width="320" height="150" fill="#f1f5f9"/>' +
      '<text x="160" y="22" text-anchor="middle" font-size="14" font-weight="800" fill="#9a3412">규모 5.8 지진 한 번 (예시 자료)</text>' +
      '<g font-size="12.5" font-weight="800" text-anchor="middle">' +
      '<rect x="10" y="36" width="94" height="104" rx="10" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><text x="57" y="56" fill="#1b2333">가 마을</text><text x="57" y="74" fill="#475569" font-size="11.5">8 km·암반·내진 ○</text><text x="57" y="102" fill="#1e293b" font-size="15">진도 Ⅵ</text><rect x="20" y="112" width="74" height="20" rx="10" fill="#84cc16"/><text x="57" y="126" fill="#fff">피해 작음</text>' +
      '<rect x="113" y="36" width="94" height="104" rx="10" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><text x="160" y="56" fill="#1b2333">나 마을</text><text x="160" y="74" fill="#475569" font-size="11.5">20 km·매립지·내진 ✕</text><text x="160" y="102" fill="#1e293b" font-size="15">진도 Ⅵ</text><rect x="123" y="112" width="74" height="20" rx="10" fill="#f97316"/><text x="160" y="126" fill="#fff">피해 큼</text>' +
      '<rect x="216" y="36" width="94" height="104" rx="10" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><text x="263" y="56" fill="#1b2333">다 마을</text><text x="263" y="74" fill="#475569" font-size="11.5">40 km·암반·내진 ✕</text><text x="263" y="102" fill="#1e293b" font-size="15">진도 Ⅲ</text><rect x="226" y="112" width="74" height="20" rx="10" fill="#22c55e"/><text x="263" y="126" fill="#fff">피해 미미</text></g></svg>',
    epi: '<svg viewBox="0 0 300 120" width="300" height="120" role="img" aria-label="접종받은 사람이 많으면 감염자가 만날 수 있는 면역 없는 사람이 줄어든다"><rect width="300" height="120" fill="#f8fafc"/>' +
      '<g><circle cx="60" cy="60" r="12" fill="#ef4444"/><circle cx="110" cy="38" r="10" fill="#a78bfa"/><circle cx="110" cy="84" r="10" fill="#a78bfa"/><circle cx="160" cy="60" r="10" fill="#a78bfa"/><circle cx="210" cy="38" r="10" fill="#a78bfa"/><circle cx="210" cy="84" r="10" fill="#60a5fa"/><circle cx="260" cy="60" r="10" fill="#a78bfa"/></g>' +
      '<path d="M72 56 L98 44" stroke="#ef4444" stroke-width="3" stroke-dasharray="4 4"/><path d="M72 66 L98 78" stroke="#ef4444" stroke-width="3" stroke-dasharray="4 4"/>' +
      '<text x="150" y="112" text-anchor="middle" font-size="12.5" font-weight="800" fill="#475569">● 감염  ● 접종(면역)  ● 접종 안 한 사람</text></svg>',
  };
  const summaryFig = (svg) => '<div class="note-fig">' + svg + '</div>';

  /* =========================================================
     미션 (4단계)
     ========================================================= */
  game = SciSim.game({
    simId: 'm3-disaster-analysis',
    mount: '#game',
    badge: '재해·재난 분석가',
    homeHref: '../../index.html#g3',
    featureLabels: {
      cards: '🗂️ 사례 카드 10장',
      epi: '🦠 감염병 확산 모형 (이동량 · 마스크 · 예방 접종)',
      quake: '🌍 지진 마을 비교 (규모 · 진도)',
      heat: '📈 폭염 일수 그래프 (예시 자료)',
      typhoon: '🌀 해수면 온도와 태풍 (예시 자료)',
      gas: '☣️ 화학 물질 확산 지도',
    },
    onFeatures(set) { F = set; segKey = ''; renderSeg(); },
    onMissionStart(m) {
      if (m.scene) setScene(m.scene);
    },
    levels: [
      {
        title: '재해와 재난은 무엇이 다를까요?', short: '재해와 재난', icon: '🗂️', phase: '관찰',
        features: ['cards'],
        intro: '<p class="si-q">❓ 탐구 질문: 같은 재해가 일어나도 어떤 곳은 피해가 크고 어떤 곳은 작은 까닭은 무엇일까?</p>' +
          '<p>이 질문에 답하려고 <b>재해·재난 사례</b>를 조사하고 <b>원인과 피해</b>를 과학적으로 분석해 볼 거예요. 먼저 사례 카드를 읽고, 일어나는 <b>원인</b>에 따라 나눠 봐요.</p>',
        setup() { setScene('cards'); afterScene(); },
        recap: '재해·재난은 원인에 따라 <b>자연 재난</b>(지진·태풍 등)과 <b>사회 재난</b>(감염병·화학 물질 유출 등)으로 나눌 수 있어요. 피해의 크기는 재해의 세기만이 아니라 <b>장소의 조건과 대비 정도</b>에도 달라져요.',
        summary: '<ul><li><b>자연 재난</b>: 자연 현상이 원인이 되는 재난 (지진, 화산, 태풍, 집중 호우, 폭염 등)</li>' +
          '<li><b>사회 재난</b>: 사람의 활동·관리·전파와 관련이 큰 원인으로 일어나는 재난 (감염병 확산, 화학 물질 유출, 화재, 운송 수단 사고, 건물 붕괴 등)</li>' +
          '<li>피해의 크기는 재해의 <b>세기</b>뿐 아니라 <b>지형·지반, 건물의 튼튼함, 인구, 대비 정도</b>에 따라 달라진다.</li></ul>',
        missions: [
          {
            id: 'cards', title: '사례 카드를 원인에 따라 나누기', scene: 'cards', manual: true,
            goal: '카드를 눌러 <b>원인</b>을 읽고, <b>자연 재난</b>과 <b>사회 재난</b> 상자로 끌어다 놓아요. 10장을 모두 나눈 뒤 확인해요.',
            hint: '원인이 자연 현상(땅속·바다·날씨)이면 자연 재난, 사고·관리 소홀·사람 사이의 전파가 관련되면 사회 재난이에요.',
            setup() { cardsReset(); },
            check() {
              const un = cards.filter((c) => !c.box);
              if (un.length) return '아직 상자에 넣지 않은 카드가 ' + un.length + '장 있어요.';
              const bad = cards.filter((c) => c.box !== c.kind);
              if (bad.length) {
                bad.forEach((c) => { if (!c.warned) { c.warned = true; c.shake = 1; } });
                return bad.slice(0, 2).map((c) => '<b>' + c.name + '</b>').join(', ') + ' 카드를 다시 생각해 봐요. 카드를 눌러 원인을 읽고, 자연 현상이 원인인지 사람의 활동·관리·전파와 관련이 큰지 따져 봐요.';
              }
              return true;
            },
            explain: '<b>자연 재난</b>은 지진·태풍처럼 <b>자연 현상</b>이 원인이에요. <b>사회 재난</b>은 화재·화학 물질 유출·운송 수단 사고처럼 <b>사람의 활동이나 관리 소홀</b>과 관련이 크고, 감염병은 병원체가 <b>사람 사이에 전파</b>되어 퍼져요. 두 종류 모두 미리 알고 대비하면 피해를 줄일 수 있어요.',
          },
          {
            type: 'quiz', title: '피해의 크기를 정하는 것은?', scene: 'cards',
            goal: '같은 세기의 재해라도 지역에 따라 피해가 다르게 나타나요. 피해 크기에 영향을 주는 것으로 알맞은 것은?',
            choices: ['재해의 세기 하나만 피해를 정한다', '재해의 세기와 함께 그 지역의 지형·건물·인구·대비 정도가 영향을 준다', '자연 재난은 대비해도 피해가 줄지 않는다', '사회 재난은 지역에 관계없이 피해가 같다'],
            answer: 1,
            feedback: ['같은 세기여도 장소에 따라 피해가 달라지는 사례가 많아요. 다른 조건도 생각해 봐요.', '', '대비(예: 튼튼한 건물, 경보, 대피 훈련)를 하면 자연 재난의 피해도 줄일 수 있어요.', '화학 물질 유출이나 감염병도 바람, 지형, 인구 밀도에 따라 피해가 크게 달라져요.'],
            explain: '피해의 크기는 재해의 <b>세기</b>뿐 아니라 <b>지형·지반, 건물의 튼튼함, 사는 사람 수, 대비 정도</b>가 함께 정해요. 앞으로 감염병, 지진, 기상·화학 재난을 직접 분석하며 확인해 봐요.',
          },
        ],
      },
      {
        title: '감염병은 어떻게 퍼질까요?', short: '감염병 확산', icon: '🦠', phase: '실험',
        features: ['epi'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 감염병 확산이 <b>사회 재난</b>이고, 병원체가 사람 사이에 전파되어 퍼진다는 것을 알았어요.</div>' +
          '<p>사람을 <b>점</b>으로 나타낸 모형에서 이동량, 마스크, 예방 접종을 바꿔 보며 <b>감염자 수 곡선</b>이 어떻게 달라지는지 분석해요. 설정을 바꾸면 처음부터 다시 시작해요. (단순화한 모형, 예시 자료)</p>',
        setup() { setScene('epi'); setEpiParams(100, false, 0); afterScene(); },
        recap: '접촉이 많을수록, 면역이 없는 사람이 많을수록 감염병은 빨리 퍼져요. <b>이동 줄이기·마스크·예방 접종</b>은 최대 감염자 수를 낮춰요.',
        summary: '<ul><li>감염병은 병원체가 <b>접촉·비말</b> 등으로 사람 사이에 전파되어 퍼진다.</li>' +
          '<li>사람들의 <b>이동량(접촉)이 많을수록</b>, <b>면역이 없는 사람이 많을수록</b> 빠르게 확산한다.</li>' +
          '<li><b>이동 줄이기(거리 두기), 마스크, 예방 접종</b>은 전파 가능성을 낮추어 <b>최대 감염자 수</b>를 줄이고 곡선을 낮춘다.</li>' +
          '<li>예방 접종을 한 사람이 많으면 접종하지 않은 사람도 감염될 가능성이 줄어든다.</li></ul>' +
          '<p style="font-size:13px;color:var(--muted)">※ 점 모형과 수치는 단순화한 예시 자료예요.</p>',
        missions: [
          {
            id: 'epiBase', title: '기본 설정에서 퍼지는 모습 관찰', scene: 'epi',
            goal: '이동량 100%, 마스크 없음, 접종 0%인 <b>기본 설정</b>에서 감염이 퍼지는 모습을 약 40일 동안 지켜봐요.',
            hint: '빨간 점(감염)이 파란 점(건강)에게 가까이 갈 때 어떤 일이 생기는지, 오른쪽 곡선은 어떻게 변하는지 봐요.',
            setup() { setEpiParams(100, false, 0); },
            check: () => isDefaultP() && (EP.m.ended || EP.m.t >= 40),
            status: () => chk(isDefaultP(), '기본 설정 (이동 100% · 마스크 ✕ · 접종 0%)') + ' · ' + chk(EP.m.ended || EP.m.t >= 40, '관찰 <b>' + Math.min(40, Math.floor(EP.m.t)) + '</b> / 40일') + ' · 최대 감염자 <b>' + EP.m.peak + '명</b>',
            hold: 0.4,
            explain: '감염된 사람(빨강) 가까이에 있는 건강한 사람(파랑)이 병원체를 옮겨 받으면 감염돼요. 감염자가 늘수록 만나는 사람이 많아져 처음에는 <b>빠르게 늘다가</b>, 회복해 면역이 생긴 사람(초록)이 늘면 <b>감염자가 줄어요</b>. 곡선의 가장 높은 값이 <b>최대 감염자 수</b>예요.',
          },
          {
            id: 'epiHalf', title: '최대 감염자 수를 절반 이하로', scene: 'epi',
            goal: '이동량·마스크·접종 비율을 바꿔서 <b>최대 감염자 수</b>를 기본 설정(' + BASE.peak + '명)의 <b>절반 이하</b>로 낮추고, 끝까지 지켜봐요.',
            hint: '한 가지만 바꿔도 되고, 여러 가지를 함께 써도 돼요. 초록 점선(목표선)보다 낮게 유지되면 성공이에요.',
            setup() { setEpiParams(100, false, 0); },
            check: () => EP.m.ended && EP.m.peak <= BASE.peak / 2,
            status: () => chk(EP.m.peak <= BASE.peak / 2, '최대 감염자 <b>' + EP.m.peak + '명</b> (기본의 ' + Math.round(EP.m.peak / BASE.peak * 100) + '%) / 목표 ' + Math.floor(BASE.peak / 2) + '명 이하') + ' · ' + chk(EP.m.ended, '끝까지 관찰 <b>' + Math.floor(EP.m.t) + '일</b>'),
            hold: 0.4,
            explain: '이동량을 줄이면 <b>접촉이 줄고</b>, 마스크는 병원체가 옮겨질 <b>확률</b>을 낮추고, 예방 접종은 <b>면역이 있는 사람</b>을 늘려요. 이 세 가지는 감염자가 한꺼번에 많아지는 것을 막아 곡선을 낮추고 완만하게 만들어요.',
          },
          {
            type: 'quiz', title: '접종률이 높으면 왜 안전할까?', figure: FIG.epi, scene: 'epi',
            goal: '예방 접종을 받은 사람이 많은 마을에서는 접종을 받지 않은 사람도 감염될 가능성이 줄어요. 그 까닭은?',
            choices: ['접종을 받지 않아도 몸에서 저절로 면역이 생기기 때문이다', '감염자가 만날 수 있는 면역 없는 사람이 줄어, 병원체가 퍼져 나갈 길이 막히기 때문이다', '접종받은 사람이 주변의 병원체를 모두 흡수하기 때문이다', '접종하면 병원체가 공기 중에서 없어지기 때문이다'],
            answer: 1,
            feedback: ['접종을 받지 않은 사람은 면역이 없어요. 감염자의 주변 상황을 생각해 봐요.', '', '접종받은 사람이 병원체를 흡수하는 것은 아니에요. 감염자가 병원체를 옮길 수 있는 대상을 생각해 봐요.', '병원체가 공기 중에서 사라지는 것이 아니라, 옮겨 갈 수 있는 사람이 줄어드는 거예요.'],
            explain: '접종받은 사람은 면역이 있어 병원체를 이어 주지 못해요. 그래서 감염자가 <b>만날 수 있는 면역 없는 사람이 줄어</b> 전체 확산이 느려지고, 접종하지 못한 사람도 보호받아요.',
          },
        ],
      },
      {
        title: '지진: 장소마다 흔들림이 달라요', short: '지진', icon: '🌍', phase: '분석',
        features: ['quake'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 설정이라도 조건에 따라 결과가 달라지는 것을 분석했어요.</div>' +
          '<p>이번에는 <b>자연 재난인 지진</b>이에요. 지진이 한 번 나면 <b>진앙에서 거리, 땅(지반), 건물 설계</b>가 다른 마을 3곳이 어떻게 흔들리는지 비교해요. 2016년 경주 지진은 규모 5.8, 2017년 포항 지진은 규모 5.4였어요. (마을 자료는 예시 자료)</p>',
        setup() { setScene('quake'); quakeReset(); QK.sel = null; QK.M = 5.8; magUI.set(5.8); afterScene(); },
        recap: '<b>규모</b>는 지진 자체의 크기(하나의 값), <b>진도</b>는 장소마다 다른 흔들림의 정도예요. 진앙에서 멀수록 진도는 작아지고, <b>연약한 지반</b>과 <b>내진 설계가 없는 건물</b>에서 피해가 커요.',
        summary: '<ul><li><b>규모</b>: 지진 자체가 낸 에너지의 크기. 한 지진에 <b>하나의 값</b>이다.</li>' +
          '<li><b>진도</b>: 어떤 장소에서 느끼는 <b>흔들림의 정도</b>. 같은 지진도 <b>장소마다 다르다</b>.</li>' +
          '<li>진앙에서 <b>멀수록</b> 진도가 작아진다. 같은 거리여도 <b>연약한 지반</b>에서는 흔들림이 커진다.</li>' +
          '<li><b>내진 설계</b>가 된 건물은 같은 흔들림에서도 피해가 작다.</li>' +
          '<li>예: 2016년 경주 지진(규모 5.8), 2017년 포항 지진(규모 5.4)</li></ul>' + summaryFig(FIG.quake),
        missions: [
          {
            id: 'quakeFire', title: '지진을 일으켜 비교하기', scene: 'quake',
            goal: '규모 <b>5.5 이상</b>으로 💥 지진을 일으켜, 지진파가 세 마을에 모두 닿을 때까지 건물의 흔들림을 비교해요.',
            hint: '규모 슬라이더는 기본값(5.8)이면 충분해요. 💥 버튼을 눌러 보세요.',
            setup() { quakeReset(); },
            check: () => QK.fired && QK.M0 >= 5.5 && QK.arrived >= 3 && QK.t > 4.5,
            status: () => chk(QK.fired && QK.M0 >= 5.5, '규모 5.5 이상 지진 일으키기 (규모 <b>' + QK.M.toFixed(1) + '</b>)') + ' · ' + chk(QK.arrived >= 3, '지진파가 닿은 마을 <b>' + QK.arrived + '</b> / 3곳'),
            hold: 0.3,
            explain: '지진이 나면 <b>진앙</b>에서 지진파가 퍼져 나가요. 진앙에서 <b>가까운 마을</b>에 먼저 닿고, 멀수록 늦게 닿으면서 <b>흔들림도 약해져요</b>. 그런데 같은 거리라도 땅과 건물에 따라 흔들림과 피해가 달라질 수 있어요.',
          },
          {
            id: 'quakePick', title: '피해가 가장 큰 마을은?', scene: 'quake', manual: true,
            goal: '세 마을의 <b>진도와 피해</b>를 비교해서, 피해가 가장 큰 마을을 눌러 고르고 그 까닭도 생각해 봐요.',
            hint: '진앙에서 가장 가까운 마을이 항상 가장 큰 피해를 입을까요? 지반과 내진 설계도 비교해 봐요.',
            check() {
              if (!QK.fired || QK.M0 < 5.5) return '먼저 규모 5.5 이상으로 지진을 일으켜 마을별 진도와 피해를 비교해 봐요.';
              if (!QK.sel) return '피해가 가장 큰 마을 카드를 눌러 골라 주세요.';
              if (QK.sel === 'B') return true;
              if (QK.sel === 'A') return '가 마을은 진앙에서 가장 가깝지만 단단한 암반 위에 <b>내진 설계</b>까지 되어 있어요. 지반과 건물 설계도 비교해 봐요.';
              return '다 마을은 진앙에서 가장 멀어서 흔들림이 약했어요. 마을 카드에 나온 피해 정도를 다시 비교해 봐요.';
            },
            explain: '<b>나 마을</b>은 진앙에서 가 마을보다 멀지만, <b>연약한 지반</b>이 흔들림을 키우고 <b>내진 설계가 없는 건물</b>이 많아 피해가 가장 컸어요. 피해는 <b>거리 + 지반 + 건물 설계</b>가 함께 정해요.',
          },
          {
            type: 'quiz', title: '규모와 진도, 어떻게 다를까?', figure: FIG.quake, scene: 'quake',
            goal: '그림처럼 규모 5.8 지진 한 번에 마을마다 진도와 피해가 달랐어요. 옳은 설명은?',
            choices: ['규모가 마을마다 달랐기 때문이다', '규모는 지진 자체의 크기로 하나의 값이고, 진도는 장소마다 다르다. 나 마을은 연약한 지반과 내진 설계가 없는 건물 때문에 피해가 컸다', '진도는 지진 자체의 에너지를 나타낸다', '진앙에서 가까울수록 항상 피해가 가장 크다'],
            answer: 1,
            feedback: ['규모는 한 지진에 하나의 값이에요. 마을마다 달라지는 것이 무엇인지 생각해 봐요.', '', '지진 자체의 에너지를 나타내는 것은 규모예요. 진도는 장소에서 느끼는 흔들림의 정도예요.', '가 마을은 가장 가까웠지만 피해가 작았어요. 지반과 내진 설계도 중요해요.'],
            explain: '<b>규모</b>는 지진 자체의 크기(한 지진에 하나의 값), <b>진도</b>는 <b>장소마다 다른</b> 흔들림의 정도예요. 같은 지진이라도 거리·지반·건물에 따라 피해가 달라져요.',
          },
        ],
      },
      {
        title: '기상 재해와 화학 물질 유출', short: '기상·화학 재난', icon: '🌡️', phase: '분석',
        features: ['heat', 'typhoon', 'gas'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지진은 거리·지반·건물에 따라 피해가 달라졌어요.</div>' +
          '<p>이번에는 <b>기상 재해</b>(폭염, 태풍)를 <b>예시 자료 그래프</b>로 해석하고, <b>화학 물질 유출</b>이 바람과 지형을 따라 퍼지는 모습을 지도에서 분석해요. 자료를 볼 때는 <b>한 가지 자료만 보고 판단하지 않는 것</b>이 중요해요.</p>',
        setup() { setScene('heat'); setYears(2005, 2024); HT.tap = -1; HT.seenShort = false; HT.seenLong = false; afterScene(); },
        recap: '기상 재해의 자료는 <b>기간을 넉넉히, 여러 자료를 함께</b> 봐야 해요. 유독 가스는 <b>바람이 불어가는 쪽</b>과 <b>낮은 곳</b>으로 퍼져 위험해요.',
        summary: '<ul><li><b>폭염·태풍 자료</b>: 짧은 기간만 보면 경향이 반대로 보일 수 있다. <b>충분히 긴 기간</b>의 자료를 보고, <b>여러 자료를 함께</b> 비교해야 편향된 판단을 피할 수 있다.</li>' +
          '<li><b>태풍</b>은 따뜻한 바다에서 수증기를 공급받아 발달한다. 해수면 온도가 높을수록 센 경향이 있지만, 다른 조건도 영향을 준다.</li>' +
          '<li><b>화학 물질 유출</b>: 유출된 기체는 <b>바람을 따라 퍼지고</b> 멀어질수록 농도가 낮아진다. 공기보다 무거운 기체는 <b>낮은 곳에 고인다</b>.</li></ul>' +
          '<p style="font-size:13px;color:var(--muted)">※ 그래프와 확산 지도의 수치는 모두 예시 자료예요.</p>',
        missions: [
          {
            id: 'heat', title: '기간에 따라 달라 보이는 그래프', scene: 'heat',
            goal: '시작·끝 연도를 바꿔서 <b>짧은 기간(5년 이하)</b>에서 줄어드는 경향을, <b>긴 기간(15년 이상)</b>에서 늘어나는 경향을 찾아봐요.',
            hint: '예: 2018년부터 2020년까지만 보면 줄어들고, 2005년부터 2024년까지 보면 늘어나요.',
            setup() { HT.seenShort = false; HT.seenLong = false; HT.shortT = 0; HT.longT = 0; setYears(2005, 2024); HT.tap = -1; },
            check: () => HT.seenShort && HT.seenLong,
            status: () => chk(HT.seenShort, '짧은 기간(5년 이하)에서 <b>줄어드는</b> 경향') + ' · ' + chk(HT.seenLong, '긴 기간(15년 이상)에서 <b>늘어나는</b> 경향'),
            hold: 0.3,
            explain: '해마다 폭염 일수는 <b>오르내려요</b>. 그래서 짧은 기간만 보면 줄어드는 것처럼 보일 수도 있어요. <b>긴 기간의 자료</b>로 보아야 전체 경향을 알 수 있어요. 한 가지 기간(자료)만 보고 판단하면 <b>편향된 결론</b>을 내릴 수 있어요.',
          },
          {
            id: 'gasPick', title: '유독 가스가 퍼지는 곳 찾기', scene: 'gas', manual: true,
            goal: '바람 방향을 바꿔 가며 ☣️ 유출을 2번 이상 지켜본 뒤, 마지막 유출에서 <b>가스가 진하게 닿은 마을</b>을 모두 골라요.',
            hint: '지도의 파란 하천 주변이 낮은 곳이에요. 노란색보다 빨간색에 가까울수록 진한 가스예요. 유출 후 약 15초까지 지켜봐요.',
            setup() { gasReset(); GAS.winds.clear(); setWind('E'); },
            check() {
              if (GAS.winds.size < 2) return '바람 방향을 바꿔서 유출을 한 번 더 지켜봐요. (지금까지 ' + GAS.winds.size + '가지 방향)';
              if (GAS.t < 15) return '마지막 유출이 퍼지는 모습을 15초 넘게 지켜본 뒤에 골라 주세요.';
              const hi = GV.filter((v) => glevel(GAS.peaks[v.id]) === 2), low = GV.filter((v) => glevel(GAS.peaks[v.id]) === 0);
              const miss = hi.filter((v) => !GAS.sel.has(v.id)), extra = low.filter((v) => GAS.sel.has(v.id));
              extra.forEach((v) => { if (!GAS.warned.has(v.id)) { GAS.warned.add(v.id); GAS.shake[v.id] = 1; } });
              if (miss.length) return '가스가 진하게 닿은 마을이 더 있어요. 지금 바람이 불어가는 쪽과 낮은 곳을 살펴봐요.';
              if (extra.length) return '<b>' + extra.map((v) => v.name).join(', ') + '</b>에는 가스가 거의 닿지 않았어요. 바람이 불어가는 쪽과 높이를 다시 확인해 봐요.';
              return true;
            },
            explain: '유출된 가스는 <b>바람이 불어가는 쪽</b>으로 퍼져요. 또 공기보다 <b>무거운 가스</b>는 <b>낮은 곳(하천·골짜기)</b>을 따라 고여요. 공장에서 멀어질수록 농도는 낮아지지만, 바람과 지형이 같으면 더 멀리까지 닿아요.',
          },
          {
            type: 'quiz', title: '자료를 어떻게 읽어야 할까?', scene: 'typhoon',
            goal: '그림의 예시 자료에서 해수면 온도가 높은 태풍이 대체로 더 셌어요. 이 자료만 보고 "해수면 온도가 오르면 태풍은 반드시 세진다"고 결론 내려도 될까요?',
            choices: ['된다. 점이 하나라도 있으면 결론은 맞다', '된다. 그래프가 있으면 모든 경우에 적용된다', '안 된다. 같은 온도에서도 풍속이 다르고 자료가 적어서, 다른 자료도 함께 비교해 판단해야 한다', '안 된다. 해수면 온도는 태풍과 관계가 전혀 없다'],
            answer: 2,
            feedback: ['점이 흩어져 있다는 것은 다른 요인도 있다는 뜻이에요. 한 자료만 믿으면 안 돼요.', '그래프는 일부 자료일 뿐이에요. 모든 경우에 적용된다고 말할 수 없어요.', '', '해수면 온도가 높으면 수증기 공급이 늘어 태풍이 발달하는 경향이 있어요. 관계가 전혀 없다는 것도 편향된 결론이에요.'],
            explain: '해수면 온도가 높으면 수증기를 많이 공급받아 태풍이 발달하는 <b>경향</b>이 있어요. 하지만 같은 온도에서도 풍속이 달라요. <b>한 가지 자료만 보고 단정하지 않고</b>, 다양한 자료를 조사해 비교해야 해요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  epReset(true);
  afterScene();
  window.__sim = {
    S, CARDS: cards, EP, BASE, QK, VILL, HT, TS, GAS, GV, game: () => game,
    setScene, setEpiParams, quakeFire, quakeReset, setYears, gasStart, setWind, gasPhys, glevel,
    unlockAll() { ['cards', 'epi', 'quake', 'heat', 'typhoon', 'gas'].forEach((f) => F.add(f)); },
    classify(ok) { cards.forEach((c) => { c.box = ok === false && c.id === 'quake' ? 'soc' : c.kind; c.warned = false; }); reflow(null); },
    gasRun(w, secs) { setWind(w); gasStart(); const n = Math.round(secs / 0.05); for (let i = 0; i < n; i++) gasPhys(0.05); return Object.assign({}, GAS.peaks); },
    epiRun(P) { EP.P = { move: P.move, mask: !!P.mask, vacc: P.vacc }; const e = new Epi(EP.P, false); let g = 0; while (!e.ended && g++ < 5000) e.step(); return { peak: e.peak, t: e.t }; },
    Epi,
  };
  SciSim.loop((dt, t) => {
    S.t = t;
    // 성공 효과
    const ph = game ? game.phase : '';
    if (ph === 'success' && S.ph !== 'success') { S.okAt = t; fx.burst(748, 38, { count: 28, speed: 210 }); }
    S.ph = ph;
    fx.update(dt);
    if (STEPF[S.scene]) STEPF[S.scene](dt);
    if (S.scene === 'epi') { /* 곡선 갱신은 epiStep */ }
    // 그리기
    view.clear('#eef2f7');
    DRAW[S.scene]();
    if (S.tr < 1 && S.hasSnap) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - S.tr;
      ctx.drawImage(snap, 0, 0, view.canvas.width, view.canvas.height); ctx.restore();
    }
    fx.draw(ctx);
    const k = t - S.okAt;
    if (k >= 0 && k < 1.6) { ctx.save(); ctx.globalAlpha = 1 - sstep(1.1, 1.6, k); D.check(748, 38, 22 * SciSim.ease.outBack(Math.min(1, k / 0.4)), Math.min(1, k / 0.45)); ctx.restore(); }
    readouts(t);
    if (game) renderSeg();
  });
})();
