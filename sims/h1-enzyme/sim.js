/* =========================================================
   통합과학1 Ⅲ. 시스템과 상호작용 - 효소와 화학 반응 (단원 10차시)
   성취기준 [10통과1-03-05] 생명 시스템을 유지하기 위해서 다양한 화학 반응과 물질 출입이 필요함을 이해하고,
   일상생활에서 활용되는 화학 반응 사례를 조사하여 발표할 수 있다.
   ① 실험: 효소 실험 (과산화 수소 + 간 조각 · 이산화 망가니즈, 효소는 반응 후에도 그대로 → 재사용)
   ② 실험: 조건 변화 (온도·pH에 따른 반응 속도 그래프, 최적 온도·최적 pH, 고온에서 기능 상실)
   ③ 모형: 열쇠-자물쇠 (활성 부위와 기질 특이성, 열에 의한 변성)
   ④ 적용: 사례 발표 (생활 속 화학 반응 카드 8장 → 반응물 · 생성물 · 효소 관여 · 의미)
   ※ 효소의 구조식, 활성화 에너지 그래프·엔탈피는 다루지 않음. 모든 반응 속도는 상대값(0~10).
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 · 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 520 : 800, VH = PHONE ? 780 : 560;
  const RM = SciSim.reduceMotion;
  const FS = PHONE ? 1.18 : 1;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  /* 받침에 따라 은/는 고르기 */
  const eun = (w) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0 ? '은' : '는'); };
  const BG = '#f3f8f4';
  const INK = '#14532d';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const parts = new SciSim.Particles();

  /* ---------- 자료 ---------- */
  const KINDS = ['none', 'mno2', 'liver', 'boiled'];
  const KNAME = { none: '아무것도 없음', mno2: '이산화 망가니즈', liver: '간 조각', boiled: '삶은 간 조각' };
  const KCARD = { none: '🚫 넣지 않음', mno2: '⚫ MnO₂ 가루', liver: '🥩 간 조각', boiled: '♨️ 삶은 간' };
  const BASE = { none: 0, mno2: 6, liver: 10, boiled: 0 };   // 상대 반응 속도 (0 ~ 10)
  const NUM4 = ['①', '②', '③', '④'];

  /* 온도-반응 속도: 0 °C 1 / 20 °C 6 / 37 °C 10 / 50 °C 5 / 60 °C 1 / 100 °C 0 을 지나는 매끄러운 곡선 (단조 3차 보간) */
  function pchip(xs, ys) {
    const n = xs.length, h = [], d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; d[i] = (ys[i + 1] - ys[i]) / h[i]; }
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
    }
    const endM = (h0, h1, d0, d1) => {
      let v = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
      if (Math.sign(v) !== Math.sign(d0)) v = 0; else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(v) > 3 * Math.abs(d0)) v = 3 * d0;
      return v;
    };
    m[0] = endM(h[0], h[1], d[0], d[1]); m[n - 1] = endM(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
    return (x) => {
      let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
      const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
    };
  }
  const tempFn = pchip([0, 20, 37, 50, 60, 100], [1, 6, 10, 5, 1, 0]);
  const ACT_T = []; for (let T = 0; T <= 100; T++) ACT_T[T] = clamp(tempFn(T), 0, 10);
  const rateT = (T) => Math.round(ACT_T[clamp(Math.round(T), 0, 100)]);
  const ENZ = {
    pepsin:  { name: '펩신', where: '위', opt: 2, color: '#e11d48', vals: [3, 8, 10, 8, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    amylase: { name: '아밀레이스', where: '입(침)', opt: 7, color: '#2563eb', vals: [0, 0, 0, 1, 3, 7, 9, 10, 8, 4, 1, 0, 0, 0, 0] },
    trypsin: { name: '트립신', where: '소장', opt: 8, color: '#d97706', vals: [0, 0, 0, 0, 0, 0, 1, 5, 10, 7, 3, 1, 0, 0, 0] },
  };
  const ENZ_KEYS = ['pepsin', 'amylase', 'trypsin'];
  const ratePH = (e, pH) => ENZ[e].vals[clamp(Math.round(pH), 0, 14)];
  /* 만능 지시약 색 (pH 0 빨강 → 7 초록 → 14 보라) */
  const PHC = ['#e11d48', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#a3e635', '#4ade80', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#7c3aed', '#8b5cf6', '#6d28d9'];
  const phColor = (p) => { const i = clamp(p, 0, 14), a = Math.floor(i), b = Math.min(14, a + 1); return SciSim.color.mix(PHC[a], PHC[b], i - a); };

  /* 생활 속 화학 반응 사례 카드 8장 */
  const CARDS = [
    { id: 'digest', icon: '🍚', name: '소화', enz: true, ex: ['녹말', '엿당', '입안 아밀레이스가 녹말을 작게 분해해요'], info: '밥을 오래 씹으면 단맛이 나요. 침 속 <b>아밀레이스</b>가 녹말을 엿당 등으로 분해하기 때문이에요. 음식물이 작게 분해되어야 세포가 흡수할 수 있어요.', why: '소화 효소(아밀레이스)가 녹말을 작은 분자로 분해해요. 세포가 흡수·이용하려면 큰 영양소를 작게 쪼개야 해요.' },
    { id: 'ferment', icon: '🥛', name: '발효', enz: true, ex: ['포도당', '젖산', '유산균이 에너지를 얻으며 만들어요'], info: '김치·요구르트는 유산균이 포도당 같은 당을 <b>젖산</b>으로 바꾸는 발효로 만들어요. 빵 반죽의 효모는 당을 분해해 <b>이산화 탄소</b>와 에탄올을 만들어 반죽을 부풀려요. 미생물의 효소가 일으키는 반응이에요.', why: '미생물 속 효소가 당을 분해하는 물질대사예요. 그 결과 젖산이나 이산화 탄소가 만들어져요.' },
    { id: 'detergent', icon: '🧺', name: '세탁 세제', enz: true, ex: ['단백질 얼룩', '작은 조각들', '효소가 얼룩을 분해해 씻겨 나가요'], info: '효소 세제에는 <b>단백질 분해 효소</b>가 들어 있어요. 우유·피 같은 단백질 얼룩을 작게 분해해 찬물에서도 잘 지워지게 해요. 너무 뜨거운 물에서는 효소가 변성될 수 있어요.', why: '단백질 분해 효소가 얼룩의 단백질을 작은 조각으로 분해해 씻겨 나가게 해요.' },
    { id: 'ripen', icon: '🍌', name: '과일 숙성', enz: true, ex: ['녹말', '당', '과일이 달고 말랑해져요'], info: '풋과일이 익으면 효소가 <b>녹말</b>을 <b>당</b>으로 분해해 점점 달아지고, 세포벽 성분도 분해되어 말랑해져요.', why: '과일 속 효소가 녹말 같은 성분을 분해해 단맛이 늘고 부드러워져요.' },
    { id: 'warmer', icon: '🔥', name: '철 가루 손난로', enz: false, ex: ['철 + 산소', '산화 철', '열이 나서 따뜻해져요'], info: '손난로 속 <b>철 가루</b>가 공기 중 <b>산소</b>와 반응(산화)해 산화 철이 되면서 <b>열</b>을 내요. 효소 없이 일어나는 발열 반응이에요.', why: '효소 없이 철이 산소와 반응하는 산화 반응이에요. 반응하며 열을 내보내 따뜻해져요.' },
    { id: 'antacid', icon: '💊', name: '제산제', enz: false, ex: ['위산 + 염기성 물질', '물 + 염', '속쓰림이 줄어요'], info: '제산제의 <b>염기성 물질</b>이 지나치게 많은 <b>위산(염산)</b>과 반응해 중화돼요. 산과 염기의 중화 반응이라 효소는 필요하지 않아요.', why: '염기성 물질이 위산을 중화하는 반응이에요. 효소가 아니라 산과 염기의 반응이에요.' },
    { id: 'photo', icon: '🌿', name: '광합성', enz: true, ex: ['이산화 탄소 + 물', '포도당 + 산소', '빛에너지를 화학 에너지로 저장해요'], info: '식물은 엽록체에서 빛에너지를 이용해 <b>이산화 탄소</b>와 <b>물</b>로 <b>포도당</b>과 <b>산소</b>를 만들어요. 여러 단계마다 효소가 필요해요.', why: '엽록체의 여러 효소가 단계마다 작용해 빛에너지를 포도당의 화학 에너지로 바꿔 저장해요.' },
    { id: 'resp', icon: '🫁', name: '세포호흡', enz: true, ex: ['포도당 + 산소', '이산화 탄소 + 물', '생명 활동에 쓸 에너지를 얻어요'], info: '세포에서 <b>포도당</b>을 <b>산소</b>로 분해해 <b>이산화 탄소</b>와 <b>물</b>을 만들고 <b>에너지</b>를 얻어요. 여러 단계마다 효소가 작용해요.', why: '세포 속 여러 효소가 포도당을 단계적으로 분해해 생명 활동에 쓸 에너지를 얻어요.' },
  ];
  const cardById = (id) => CARDS.find((c) => c.id === id);
  const STORE_KEY = 'h1-enzyme:cards:v1';
  function loadCards() { try { const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); return s && typeof s === 'object' ? s : {}; } catch (e) { return {}; } }
  function saveCards() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S.cards.data)); } catch (e) { /* 저장할 수 없어도 계속 */ } }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'tubes', sub: 'four', clock: 0, fade: 0, drag: null, hover: '', epoch: 0,
    tubes: [], reuse: null,
    meas: { kind: 'temp', T: 37, ph: 7, enz: 'pepsin', pts: { temp: [], pepsin: [], amylase: [], trypsin: [] }, tOK: false, pOK: { pepsin: false, amylase: false, trypsin: false }, msg: '', msgT: 0, bub: 0 },
    lock: { sel: '', T: 37, maxT: 37, dPerm: 0, d: 0, spr: null, bound: 0, hotFail: false, msg: '', msgT: 0, items: [], complex: null, shake: 0, products: 0, tried: {} },
    cards: { sel: '', info: false, data: loadCards(), msg: '', msgT: 0, flash: 0 },
  };
  let game = null;

  /* ======================================================
     화면 ①: 시험관 4개 + 간 조각 다시 쓰기
     ====================================================== */
  const TG = () => (PHONE
    ? { xs: [84, 202, 320, 438], w: 62, top: 152, h: 400, liq: 0.34, cardY: 84, cardW: 108, cardH: 56, nameY: 590, valY: 622, rulerX: 22 }
    : { xs: [196, 340, 484, 628], w: 74, top: 130, h: 330, liq: 0.36, cardY: 80, cardW: 128, cardH: 46, nameY: 484, valY: 512, rulerX: 62 });
  const tgeo = () => {
    const g = TG(); g.bottom = g.top + g.h; g.liqTop = g.bottom - g.h * g.liq; g.unit = (g.liqTop - (g.top + 6)) / 10; g.rest = g.bottom - g.w / 2 - 8; return g;
  };
  function mkSeeds() { const a = []; for (let i = 0; i < 90; i++) a.push({ x: Math.random() * 2 - 1, y: Math.random(), r: Math.random(), p: Math.random() * 6.28 }); return a; }
  function mkTube(kind, c) { return { kind, added: false, wait: 0, landed: false, c: c == null ? 1 : c, foam: 0, peak: 0, obs: 0, y: 0, vy: 0, seeds: mkSeeds(), bubAcc: 0 }; }
  function resetTubes() { S.tubes = KINDS.map((k) => mkTube(k)); }
  function resetReuse() {
    S.epoch++;
    const g = tgeo(), xs = PHONE ? [150, 370] : [270, 530];
    S.reuse = { X: mkTube('liver', 0), Y: mkTube('liver', 1), xs, piece: { x: xs[0], y: g.rest, where: 'X', lift: 0, bob: 0 }, moved: false, from: 'X', fresh: true, msg: '', msgT: 0 };
    S.reuse.X.landed = true; S.reuse.Y.landed = true;
    S.drag = null;
  }
  function addMaterial(i, delay) {
    const tb = S.tubes[i], g = tgeo(); if (!tb || tb.added) return;
    tb.added = true; tb.wait = delay || 0;
    if (tb.kind === 'none') { tb.landed = true; } else { tb.y = g.top - 46; tb.vy = 0; }
    Sound.click(); updateCtl();
  }
  /* 한 시험관의 반응 · 거품 계산 (catalyst: 촉매가 들어 있는가) */
  function stepTube(tb, dt, g, cx, cat) {
    const base = cat ? BASE[tb.kind] : 0;
    const r = base * tb.c;
    if (cat && base > 0) tb.c = Math.max(0, tb.c - dt * r * 0.004);
    tb.foam = RM ? r : SciSim.approach(tb.foam, r, dt, 1.8);
    if (tb.foam < 0.02) tb.foam = 0;
    tb.peak = Math.max(tb.peak, Math.round(tb.foam));
    if (r > 0.4 && !RM) {            // 액체 속에서 올라오는 산소 방울
      tb.bubAcc += dt * r * 6;
      while (tb.bubAcc >= 1) {
        tb.bubAcc -= 1;
        const bx = cx + rnd(-g.w / 2 + 12, g.w / 2 - 12), by = g.rest - rnd(0, 18), vy = rnd(70, 110);
        parts.emit({ x: bx, y: by, vx: rnd(-6, 6), vy: -vy, life: Math.max(0.1, (by - g.liqTop) / vy), size: rnd(2.4, 4.6), color: '#7dd3fc', shape: 'bubble', gravity: 0, fade: false });
      }
    }
  }
  function stepTubes(dt) {
    const g = tgeo();
    S.tubes.forEach((tb, i) => {
      const cx = g.xs[i];
      if (tb.added && tb.wait > 0) { tb.wait -= dt; }
      else if (tb.added && !tb.landed) {
        tb.vy += 1500 * dt; const y0 = tb.y; tb.y += tb.vy * dt;
        if (y0 < g.liqTop && tb.y >= g.liqTop) { tb.vy *= 0.35; if (!RM) parts.burst(cx, g.liqTop, { count: 8, speed: 70, size: 2.4, life: 0.5, colors: ['#bae6fd', '#fff'], shape: 'circle', gravity: 200 }); }
        if (tb.y >= g.rest) { tb.y = g.rest; tb.landed = true; Sound.tick(); }
      }
      const cat = tb.added && tb.landed && tb.wait <= 0 && BASE[tb.kind] > 0;
      stepTube(tb, dt, g, cx, cat);
      if (tb.added && tb.landed && tb.wait <= 0) tb.obs += dt;
    });
  }
  function stepReuse(dt) {
    const g = tgeo(), R = S.reuse;
    ['X', 'Y'].forEach((k, i) => {
      const tb = R[k]; stepTube(tb, dt, g, R.xs[i], R.piece.where === k);
      tb.obs += dt;
    });
    const p = R.piece; p.lift = RM ? (S.drag ? 1 : 0) : SciSim.approach(p.lift, S.drag ? 1 : 0, dt, 14);
    if (R.msgT > 0) R.msgT -= dt;
  }

  /* ----- 그리기: 시험관 ----- */
  function tubePath(cx, top, w, h) {
    ctx.beginPath(); ctx.moveTo(cx - w / 2, top); ctx.lineTo(cx - w / 2, top + h - w / 2); ctx.arc(cx, top + h - w / 2, w / 2, Math.PI, 0, true); ctx.lineTo(cx + w / 2, top);
  }
  function drawMaterial(kind, x, y, sc, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc || 1, sc || 1);
    if (kind === 'mno2') {
      const dots = [[-14, 4], [-6, 6], [3, 5], [12, 4], [-10, -3], [0, -2], [9, -3], [-3, -8], [5, -9], [-16, 7], [15, 7]];
      dots.forEach((d, i) => D.sphere(d[0], d[1], 4.4 - (i % 3) * 0.5, '#374151', { gloss: false }));
    } else {
      const boiled = kind === 'boiled';
      const g = ctx.createLinearGradient(0, -15, 0, 15);
      g.addColorStop(0, boiled ? '#d6c7b0' : '#c2504f'); g.addColorStop(1, boiled ? '#9c8a74' : '#7f2323');
      D.shadow(() => { ctx.fillStyle = g; rr(-22, -14, 44, 28, 12).fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = boiled ? '#7c6a55' : '#5f1b1b'; ctx.lineWidth = 1.8; rr(-22, -14, 44, 28, 12).stroke();
      ctx.fillStyle = boiled ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(-8, -7, 9, 3.6, -0.2, 0, 6.3); ctx.fill();
      ctx.fillStyle = boiled ? 'rgba(90,70,50,.35)' : 'rgba(60,10,10,.3)';
      [[6, 3, 2.4], [-3, 7, 2], [12, -4, 1.8], [-12, 4, 1.6]].forEach((d) => { ctx.beginPath(); ctx.arc(d[0], d[1], d[2], 0, 6.3); ctx.fill(); });
    }
    ctx.restore();
  }
  function drawFoam(tb, g, cx, t) {
    const fh = tb.foam * g.unit; if (fh < 2) return;
    ctx.save(); tubePath(cx, g.top, g.w - 4, g.h); ctx.closePath(); ctx.clip();
    const y0 = g.liqTop;
    const gr = ctx.createLinearGradient(0, y0 - fh, 0, y0);
    gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(254,249,195,.9)');
    ctx.fillStyle = gr; ctx.fillRect(cx - g.w / 2, y0 - fh * 0.9, g.w, fh * 0.9 + 1);
    ctx.strokeStyle = 'rgba(120,130,140,.28)'; ctx.lineWidth = 1;
    const n = Math.min(90, Math.round(10 + fh * 0.5));
    for (let i = 0; i < n; i++) {
      const s = tb.seeds[i], rad = 4 + s.r * (PHONE ? 6 : 7);
      const bx = cx + s.x * (g.w / 2 - 6), by = y0 - s.y * fh + Math.sin(t * 3 + s.p) * 1.6;
      ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.arc(bx, by, rad, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(bx - rad * 0.35, by - rad * 0.35, rad * 0.25, 0, 6.3); ctx.fill();
    }
    ctx.restore();
  }
  function drawTube(tb, g, cx, t, o) {
    o = o || {};
    // 액체
    ctx.save(); tubePath(cx, g.top, g.w - 4, g.h); ctx.closePath(); ctx.clip();
    const lg = ctx.createLinearGradient(0, g.liqTop, 0, g.bottom);
    if (o.liquid) { lg.addColorStop(0, SciSim.color.rgba(o.liquid, 0.55)); lg.addColorStop(1, SciSim.color.rgba(o.liquid, 0.85)); } else { lg.addColorStop(0, 'rgba(186,230,253,.55)'); lg.addColorStop(1, 'rgba(125,196,255,.8)'); }
    ctx.fillStyle = lg; ctx.fillRect(cx - g.w / 2, g.liqTop, g.w, g.h);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(cx - g.w / 2, g.liqTop - 1, g.w, 3);
    ctx.restore();
    drawFoam(tb, g, cx, t);
    // 물질
    if (o.noMat !== true && tb.added && BASE[tb.kind] >= 0 && tb.kind !== 'none') {
      const my = tb.landed ? g.rest : tb.y;
      drawMaterial(tb.kind, cx, my, PHONE ? 0.82 : 1, t);
    }
    // 유리
    ctx.save(); tubePath(cx, g.top, g.w, g.h); ctx.strokeStyle = o.glow ? '#16a34a' : '#8fa3bd'; ctx.lineWidth = o.glow ? 4 : 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - g.w / 2 + 6, g.top + 10); ctx.lineTo(cx - g.w / 2 + 6, g.bottom - g.w); ctx.stroke();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - g.w / 2 - 5, g.top); ctx.lineTo(cx + g.w / 2 + 5, g.top); ctx.stroke();
    ctx.restore();
  }
  function drawRuler(g, label) {
    const x = g.rulerX;
    ctx.save(); ctx.strokeStyle = '#64748b'; ctx.fillStyle = '#475569'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, g.liqTop); ctx.lineTo(x, g.liqTop - 10 * g.unit); ctx.stroke();
    ctx.font = D.font(12, 800); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (let v = 0; v <= 10; v++) {
      const y = g.liqTop - v * g.unit, big = v % 2 === 0;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (big ? 9 : 5), y); ctx.stroke();
      if (big) ctx.fillText(String(v), x + 12, y);
    }
    ctx.restore();
    ctx.save(); ctx.translate(x - (PHONE ? 6 : 12), g.liqTop - 5 * g.unit); ctx.rotate(-Math.PI / 2);
    D.text(0, 0, label, { size: 12.5, color: '#475569', weight: 800 }); ctx.restore();
    // 기준선(5, 10) 점선
    ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.2;
    [5, 10].forEach((v) => { const y = g.liqTop - v * g.unit; ctx.beginPath(); ctx.moveTo(x + 22, y); ctx.lineTo(VW - 10, y); ctx.stroke(); });
    ctx.restore();
  }
  function drawTubes(t) {
    const g = tgeo();
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, PHONE ? 26 : 28, '과산화 수소(H₂O₂) → 물(H₂O) + 산소(O₂)', { size: PHONE ? 15 : 18.5, weight: 800, color: INK });
    D.text(VW / 2, PHONE ? 48 : 50, '거품 높이가 높을수록 산소가 빨리 만들어져요', { size: PHONE ? 12 : 13.5, weight: 700, color: '#64748b' });
    drawRuler(g, '거품 높이 (상대값)');
    S.tubes.forEach((tb, i) => {
      const cx = g.xs[i];
      // 위쪽 카드
      const hov = S.hover === 'c' + i, cw = g.cardW, ch = g.cardH, cy = g.cardY - ch / 2;
      ctx.save();
      D.shadow(() => { ctx.fillStyle = tb.added ? '#e5e7eb' : '#fff'; rr(cx - cw / 2, cy - (hov ? 2 : 0), cw, ch, 12).fill(); }, { blur: tb.added ? 3 : 7, y: 2 });
      ctx.lineWidth = 2.5; ctx.strokeStyle = tb.added ? '#9ca3af' : '#16a34a'; if (!tb.added) ctx.setLineDash([6, 4]); rr(cx - cw / 2, cy - (hov ? 2 : 0), cw, ch, 12).stroke(); ctx.restore();
      D.text(cx, g.cardY + (PHONE ? -3 : 5), KCARD[tb.kind], { size: PHONE ? 12.5 : 14.5, weight: 800, color: tb.added ? '#6b7280' : '#14532d' });
      if (PHONE) D.text(cx, g.cardY + 17, tb.added ? '넣었어요' : '눌러서 넣기', { size: 11.5, weight: 700, color: tb.added ? '#6b7280' : '#16a34a' });
      if (!PHONE && !tb.added) D.text(cx, g.cardY + 21, '눌러서 넣기', { size: 11.5, weight: 700, color: '#16a34a', alpha: 0.85 });
      if (!tb.added) D.ring(cx, g.cardY, ch * 0.45, t + i * 0.25, { color: '#16a34a', speed: 0.9, width: 1.5 });
      // 연결 화살표 (카드 → 시험관 입구)
      ctx.save(); ctx.strokeStyle = tb.added ? '#cbd5e1' : '#16a34a'; ctx.lineWidth = 2.5; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(cx, cy + ch + 2); ctx.lineTo(cx, g.top - 8); ctx.stroke(); ctx.restore();
      drawTube(tb, g, cx, t, { glow: S.hover === 't' + i });
      // 이름 · 값
      D.text(cx, g.nameY, NUM4[i] + ' ' + (PHONE ? KNAME[tb.kind].replace('이산화 망가니즈', 'MnO₂').replace(' 조각', '') : KNAME[tb.kind]), { size: PHONE ? 12.5 : 14, weight: 800, color: '#334155' });
      const cur = Math.round(tb.foam);
      D.label(cx, g.valY, tb.added ? '지금 ' + cur + ' · 최고 ' + tb.peak : '아직 안 넣음', { bg: tb.added ? (cur > 0 ? '#15803d' : '#64748b') : '#94a3b8', size: PHONE ? 11.5 : 13 });
    });
    if (PHONE) D.text(VW / 2, 668, '시험관 ①은 아무것도 넣지 않은 비교용(대조군)이에요', { size: 12.5, weight: 700, color: '#64748b' });
    else D.text(VW / 2, 540, '① 은 아무것도 넣지 않은 비교용(대조군)이에요', { size: 13, weight: 700, color: '#64748b' });
  }
  /* ----- 그리기: 간 조각 다시 쓰기 ----- */
  function drawReuse(t) {
    const g = tgeo(), R = S.reuse, p = R.piece;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, PHONE ? 26 : 28, '반응이 끝난 뒤의 간 조각, 다시 쓸 수 있을까요?', { size: PHONE ? 15 : 18.5, weight: 800, color: INK });
    D.text(VW / 2, PHONE ? 48 : 50, '간 조각을 끌어다 새 과산화 수소 시험관에 넣어 봐요', { size: PHONE ? 12 : 13.5, weight: 700, color: '#64748b' });
    drawRuler(g, '거품 높이 (상대값)');
    const names = ['반응이 끝난 시험관', '새 과산화 수소'];
    ['X', 'Y'].forEach((k, i) => {
      const tb = R[k], cx = R.xs[i];
      D.label(cx, g.cardY, names[i], { bg: i ? '#16a34a' : '#64748b', size: PHONE ? 12.5 : 14.5 });
      drawTube(tb, g, cx, t, { noMat: true, glow: S.drag && Math.abs(S.drag.x - cx) < g.w / 2 + 14 });
      D.text(cx, g.nameY, i ? '새 시험관 (H₂O₂ 가득)' : '과산화 수소가 모두 분해됨', { size: PHONE ? 12 : 13.5, weight: 800, color: '#334155' });
      const cur = Math.round(tb.foam);
      D.label(cx, g.valY, '지금 ' + cur + ' · 최고 ' + tb.peak, { bg: cur > 0 ? '#15803d' : '#64748b', size: PHONE ? 11.5 : 13 });
    });
    // 간 조각 (끌 수 있음)
    const sc = (PHONE ? 0.9 : 1.1) * (1 + p.lift * 0.12);
    if (p.lift > 0.05) { ctx.save(); ctx.globalAlpha = 0.25 * p.lift; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(p.x + 6, p.y + 22, 26, 7, 0, 0, 6.3); ctx.fill(); ctx.restore(); }
    drawMaterial('liver', p.x, p.y - p.lift * 6, sc, t);
    if (p.where !== 'Y' && !R.moved && !S.drag) { D.ring(p.x, p.y, 34, t, { color: '#16a34a', speed: 0.9, width: 2.5 }); D.text(p.x, p.y - 38, '👆 끌어다 옮겨요', { size: 12.5, weight: 800, color: '#15803d' }); }
    if (R.moved) D.label(VW / 2, PHONE ? 668 : 540, '간 조각은 그대로예요 — 반응에서 소모되지 않아요', { bg: '#15803d', size: PHONE ? 12.5 : 14 });
    else if (R.msgT > 0) D.label(VW / 2, PHONE ? 668 : 540, R.msg, { bg: '#b45309', size: PHONE ? 12.5 : 14 });
    else D.text(VW / 2, PHONE ? 668 : 540, '왼쪽 시험관은 거품이 더 이상 나지 않아요 (재료인 과산화 수소가 없어요)', { size: PHONE ? 12 : 13, weight: 700, color: '#64748b' });
  }

  /* ======================================================
     효소 · 기질 모양 (그림 모형)  — 활성 부위(주머니)는 기질 ②(오각 화살표)와 꼭 맞는 모양
     ====================================================== */
  const SUB = {
    T: { name: '기질 ①', mark: '▲', col: '#fb923c', L: [[0, -34], [0, 28], [-32, 28]], R: [[0, -34], [32, 28], [0, 28]] },
    A: { name: '기질 ②', mark: '⬟', col: '#3b82f6', L: [[-26, -30], [0, -30], [0, 36], [-26, 12]], R: [[0, -30], [26, -30], [26, 12], [0, 36]] },
    B: { name: '기질 ③', mark: '◆', col: '#ec4899', L: [[0, -32], [0, 32], [-30, 0]], R: [[0, -32], [30, 0], [0, 32]] },
  };
  const SUBK = PHONE ? 1.3 : 1.35;
  const POFF = [[-7, 5], [6, -7], [9, 8], [-4, 10], [-9, -6], [5, 9], [-8, 7]];
  function polyPath(pts, ox, oy, k) { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(ox + q[0] * k, oy + q[1] * k) : ctx.moveTo(ox + q[0] * k, oy + q[1] * k))); ctx.closePath(); }
  /* 기질 그리기: split 0~1이면 두 조각이 벌어져요 (효소가 기질을 분해한 모습) */
  function drawSub(id, x, y, k, o) {
    o = o || {};
    const s = SUB[id], sp = (o.split || 0);
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    [['L', -1], ['R', 1]].forEach(([h, dir]) => {
      if (o.only && o.only !== h) return;
      const ox = x + dir * sp * 26 * k, oy = y - sp * 10 * k, rot = dir * sp * 0.25;
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(rot); ctx.translate(-ox, -oy);
      polyPath(s[h], ox, oy, k);
      const g = ctx.createLinearGradient(ox, oy - 34 * k, ox, oy + 36 * k);
      g.addColorStop(0, SciSim.color.shade(s.col, h === 'L' ? 0.32 : 0.12)); g.addColorStop(1, SciSim.color.shade(s.col, h === 'L' ? -0.05 : -0.25));
      if (o.shadow !== false) D.shadow(() => { ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 }); else { ctx.fillStyle = g; ctx.fill(); }
      ctx.lineJoin = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = SciSim.color.shade(s.col, -0.45); ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }
  function pocketPoly(d) {
    const P = SUB.A.L.concat(SUB.A.R); // 오각형 꼭짓점 (왼쪽 조각 + 오른쪽 조각)
    const outline = [[-26, -30], [26, -30], [26, 12], [0, 36], [-26, 12]];
    const cs = Math.cos(0.22 * d), sn = Math.sin(0.22 * d);
    return outline.map((q, i) => {
      const x = q[0] * (1 - 0.45 * d) + POFF[i][0] * d * 1.3, y = q[1] * (1 - 0.08 * d) + POFF[i][1] * d * 1.3;
      return [x * cs - y * sn, x * sn + y * cs];
    });
  }
  function enzymeGeo() { return PHONE ? { cx: 260, cy: 300, rx: 140, ry: 100 } : { cx: 300, cy: 290, rx: 140, ry: 100 }; }
  /* 효소 그리기. (cx, cy) 중심, k 배율, d 변성 정도(0~1), t 시간 */
  function drawEnzyme(cx, cy, k, d, t, o) {
    o = o || {};
    const rx = 140 * k, ry = 100 * k * (1 - 0.2 * d);
    ctx.save(); ctx.translate(cx, cy);
    const blob = () => {
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const w = 1 + 0.04 * Math.sin(3 * a + 0.6) + 0.025 * Math.sin(5 * a) + d * (0.09 * Math.sin(7 * a + 1) + 0.07 * Math.sin(11 * a + 2)) + (o.wob ? o.wob * Math.sin(a * 2 + t * 6) : 0);
        const x = Math.cos(a) * rx * w, y = Math.sin(a) * ry * w;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    };
    const c1 = SciSim.color.mix('#6ee7b7', '#d6d3d1', d), c2 = SciSim.color.mix('#059669', '#78716c', d);
    const g = ctx.createRadialGradient(-rx * 0.35, -ry * 0.5, ry * 0.1, 0, 0, rx);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    blob(); D.shadow(() => { ctx.fillStyle = g; ctx.fill(); }, { blur: 14, y: 6 });
    ctx.lineWidth = 3 * k; ctx.strokeStyle = SciSim.color.mix('#047857', '#57534e', d); blob(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(-rx * 0.38, -ry * 0.28, rx * 0.2, ry * 0.1, -0.5, 0, 6.3); ctx.fill();
    // 활성 부위(주머니)
    const pk = SUBK * k, py = (-100 * k * (1 - 0.2 * d)) + 30 * pk;
    const poly = pocketPoly(d);
    ctx.beginPath(); poly.forEach((q, i) => (i ? ctx.lineTo(q[0] * pk, py + q[1] * pk) : ctx.moveTo(q[0] * pk, py + q[1] * pk))); ctx.closePath();
    const pg = ctx.createLinearGradient(0, py - 30 * pk, 0, py + 36 * pk); pg.addColorStop(0, SciSim.color.mix('#065f46', '#292524', d)); pg.addColorStop(1, SciSim.color.mix('#047857', '#44403c', d));
    ctx.fillStyle = pg; ctx.fill(); ctx.lineWidth = 2.5 * k; ctx.strokeStyle = o.glow ? '#fde047' : SciSim.color.mix('#022c22', '#1c1917', d); ctx.stroke();
    if (o.glow) { ctx.lineWidth = 5 * k; ctx.strokeStyle = 'rgba(253,224,71,.5)'; ctx.stroke(); }
    ctx.restore();
    return { px: cx, py: cy + py, rx, ry };
  }

  /* ======================================================
     화면 ②: 온도 · pH 에 따른 반응 속도
     ====================================================== */
  const MP = () => (PHONE
    ? { x: 10, y: 8, w: 500, h: 328, ico: [56, 52], bath: [150, 62, 150, 196], tcx: 225, ttop: 34, tw: 50, th: 222, tliq: 150, therm: [372, 70, 156], gauge: [30, 296, 440] }
    : { x: 14, y: 14, w: 286, h: 532, ico: [58, 66], bath: [30, 160, 150, 244], tcx: 105, ttop: 118, tw: 56, th: 284, tliq: 268, therm: [226, 134, 220], gauge: [22, 466, 242] });
  const GP = () => (PHONE
    ? { x: 10, y: 344, w: 500, h: 428, px: 70, py: 396, pw: 420, ph: 300 }
    : { x: 312, y: 14, w: 474, h: 532, px: 372, py: 70, pw: 392, ph: 392 });
  const MX = (M) => (M.kind === 'temp' ? { min: 0, max: 100, step: 20, unit: '°C', name: '온도 (°C)' } : { min: 0, max: 14, step: 2, unit: '', name: 'pH' });
  const measSeries = () => { const M = S.meas; return M.kind === 'temp' ? M.pts.temp : M.pts[M.enz]; };
  const measVal = () => (S.meas.kind === 'temp' ? S.meas.T : S.meas.ph);
  const measRate = () => (S.meas.kind === 'temp' ? rateT(S.meas.T) : ratePH(S.meas.enz, S.meas.ph));
  const gx = (G, X, v) => G.px + (v - X.min) / (X.max - X.min) * G.pw;
  const gy = (G, v) => G.py + G.ph - clamp(v, 0, 12) / 12 * G.ph;
  function measFoamTb() { return S.meas.foamTb || (S.meas.foamTb = { foam: 0, seeds: mkSeeds() }); }

  function stepMeas(dt) {
    const M = S.meas, r = measRate(), tb = measFoamTb();
    M.rs = RM ? r : SciSim.approach(M.rs == null ? r : M.rs, r, dt, 6);
    tb.foam = M.rs * 0.55;
    const P = MP();
    const dT = M.kind === 'temp' ? smooth((M.T - 40) / 25) : 0;
    M.dIco = RM ? dT : SciSim.approach(M.dIco || 0, dT, dt, 4);
    if (M.rs > 0.3 && !RM) {
      M.bub += dt * M.rs * 5;
      const cx = P.x + P.tcx, g = { w: P.tw, bottom: P.y + P.ttop + P.th, liqTop: P.y + P.tliq };
      while (M.bub >= 1) {
        M.bub -= 1;
        const bx = cx + rnd(-P.tw / 2 + 10, P.tw / 2 - 10), by = g.bottom - P.tw / 2 - rnd(0, 20), vy = rnd(60, 100);
        parts.emit({ x: bx, y: by, vx: rnd(-6, 6), vy: -vy, life: Math.max(0.1, (by - g.liqTop) / vy), size: rnd(2.2, 4.2), color: M.kind === 'ph' ? '#fff' : '#7dd3fc', shape: 'bubble', gravity: 0, fade: false });
      }
    }
    // 뜨거운 물 김
    if (M.kind === 'temp' && M.T >= 75 && !RM && Math.random() < dt * (M.T - 70) * 0.5) {
      const bx = P.x + P.bath[0] + rnd(10, P.bath[2] - 10), by = P.y + P.bath[1] + P.bath[3] * 0.36;
      parts.emit({ x: bx, y: by, vx: rnd(-8, 8), vy: -rnd(25, 45), life: 1.1, size: rnd(5, 9), color: 'rgba(255,255,255,.7)', shape: 'smoke', gravity: 0, grow: 8 });
    }
    if (M.msgT > 0) M.msgT -= dt;
  }
  function drawMeasPanel(t) {
    const M = S.meas, P = MP(), r = measRate(), isT = M.kind === 'temp';
    ctx.save(); ctx.translate(P.x, P.y);
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(0, 0, P.w, P.h, 16).fill(); }, { blur: 8, y: 3 });
    // 효소 그림 (온도가 높으면 활성 부위가 일그러져요)
    const ico = P.ico, ek = PHONE ? 0.3 : 0.27;
    drawEnzyme(ico[0], ico[1], ek, isT ? M.dIco || 0 : 0, t, {});
    const tx = ico[0] + 50;
    if (isT) {
      D.text(tx, ico[1] - 10, '효소(간의 카탈레이스)', { size: 13.5, weight: 800, color: '#14532d', align: 'left' });
      const dd = M.dIco || 0;
      D.text(tx, ico[1] + 11, dd < 0.1 ? '활성 부위 모양: 정상' : dd < 0.6 ? '활성 부위 모양: 변하는 중' : '활성 부위 모양: 일그러짐', { size: 12.5, weight: 800, color: dd < 0.1 ? '#15803d' : '#b91c1c', align: 'left' });
    } else {
      D.text(tx, ico[1] - 10, ENZ[M.enz].name + ' (' + ENZ[M.enz].where + ')', { size: 14.5, weight: 800, color: ENZ[M.enz].color, align: 'left' });
      D.text(tx, ico[1] + 11, '최적 pH를 찾아봐요', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
    }
    const tcx = P.tcx, g = { top: P.ttop, h: P.th, w: P.tw, liqTop: P.tliq, bottom: P.ttop + P.th, unit: (P.tliq - P.ttop - 8) / 10, rest: P.ttop + P.th - P.tw / 2 - 6 };
    if (isT) {
      // 물중탕 비커
      const b = P.bath, wt = M.T / 100;
      D.beaker(b[0], b[1], b[2], b[3], { level: 0.64, liquid: SciSim.color.mix('#93c5fd', '#fb7185', wt), t, wave: 1.2 });
      if (M.T <= 12) { ctx.save(); [[0.22, 0.32], [0.62, 0.3], [0.42, 0.4]].forEach((q, i) => { ctx.fillStyle = 'rgba(224,242,254,.9)'; ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 1.5; rr(b[0] + b[2] * q[0], b[1] + b[3] * (q[1] + 0.02 * Math.sin(t * 1.5 + i)), 24, 22, 5).fill(); rr(b[0] + b[2] * q[0], b[1] + b[3] * (q[1] + 0.02 * Math.sin(t * 1.5 + i)), 24, 22, 5).stroke(); }); ctx.restore(); }
    }
    drawTube(measFoamTb(), g, tcx, t, { noMat: true, liquid: isT ? null : phColor(M.ph) });
    // 효소 재료 (바닥)
    if (isT) drawMaterial('liver', tcx, g.rest, PHONE ? 0.7 : 0.82, t);
    else { for (let i = 0; i < 5; i++) D.sphere(tcx - 14 + i * 7, g.rest + (i % 2 ? 2 : -3), 4.2, ENZ[M.enz].color, { gloss: false }); }
    // 온도계 / pH 막대
    const th = P.therm;
    if (isT) { D.thermometer(th[0], th[1], th[2], M.T, 0, 100, { step: 20, unit: '' }); D.text(th[0] + 4, th[1] + th[2] + 46, M.T + ' °C', { size: 16, weight: 800, color: '#b91c1c' }); }
    else {
      const bx = th[0] - 12, by = th[1], bw = 24, bh = th[2];
      const gr = ctx.createLinearGradient(0, by, 0, by + bh); for (let i = 0; i <= 14; i++) gr.addColorStop(i / 14, PHC[i]);
      D.shadow(() => { ctx.fillStyle = gr; rr(bx, by, bw, bh, 8).fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; rr(bx, by, bw, bh, 8).stroke();
      ctx.fillStyle = '#334155'; ctx.font = D.font(11.5, 800); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (let i = 0; i <= 14; i += 2) ctx.fillText(String(i), bx + bw + 6, by + 6 + (bh - 12) * i / 14);
      ctx.textBaseline = 'alphabetic';
      const py = by + 6 + (bh - 12) * M.ph / 14;
      ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.moveTo(bx - 4, py); ctx.lineTo(bx - 14, py - 7); ctx.lineTo(bx - 14, py + 7); ctx.closePath(); ctx.fill();
      D.text(bx + bw / 2, by - 8, 'pH 지시약', { size: 11.5, weight: 800, color: '#475569' });
      D.text(bx + bw / 2, by + bh + 26, 'pH ' + M.ph, { size: 16, weight: 800, color: '#334155' });
    }
    // 반응 속도 막대 (0 ~ 10)
    const ga = P.gauge, gw = ga[2];
    D.text(ga[0], ga[1] - 12, '산소 발생 속도 (상대값)', { size: 13, weight: 800, color: '#334155', align: 'left' });
    D.label(ga[0] + gw - 22, ga[1] - 14, String(r), { bg: r >= 8 ? '#15803d' : r > 0 ? '#2563eb' : '#64748b', size: 15, pad: 10 });
    ctx.fillStyle = '#e5e7eb'; rr(ga[0], ga[1], gw, 18, 9).fill();
    const fw = clamp(M.rs, 0, 10) / 10 * gw;
    if (fw > 1) { const gg = ctx.createLinearGradient(ga[0], 0, ga[0] + gw, 0); gg.addColorStop(0, '#60a5fa'); gg.addColorStop(1, '#16a34a'); ctx.fillStyle = gg; rr(ga[0], ga[1], Math.max(fw, 18), 18, 9).fill(); }
    ctx.fillStyle = '#64748b'; ctx.font = D.font(11, 700); ctx.textAlign = 'center';
    [0, 5, 10].forEach((v) => ctx.fillText(String(v), ga[0] + clamp(v / 10 * gw, 6, gw - 6), ga[1] + 34));
    ctx.restore();
  }
  function drawGraph(t) {
    const M = S.meas, G = GP(), X = MX(M);
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(G.x, G.y, G.w, G.h, 16).fill(); }, { blur: 8, y: 3 });
    D.text(G.x + G.w / 2, G.y + 30, M.kind === 'temp' ? '온도에 따른 반응 속도' : 'pH에 따른 반응 속도', { size: PHONE ? 15 : 17, weight: 800, color: INK });
    // 격자 · 축
    ctx.save(); ctx.lineWidth = 1; ctx.font = D.font(12, 700); ctx.fillStyle = '#64748b';
    for (let v = 0; v <= 12; v += 2) {
      const y = gy(G, v); ctx.strokeStyle = v === 10 ? 'rgba(22,163,74,.5)' : '#e5e7eb'; ctx.setLineDash(v === 10 ? [5, 5] : []); ctx.beginPath(); ctx.moveTo(G.px, y); ctx.lineTo(G.px + G.pw, y); ctx.stroke();
      ctx.setLineDash([]); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(String(v), G.px - 8, y);
    }
    for (let v = X.min; v <= X.max + 1e-6; v += X.step) {
      const x = gx(G, X, v); ctx.strokeStyle = '#f1f5f9'; ctx.beginPath(); ctx.moveTo(x, G.py); ctx.lineTo(x, G.py + G.ph); ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(String(v), x, G.py + G.ph + 7);
    }
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(G.px, G.py - 4); ctx.lineTo(G.px, G.py + G.ph); ctx.lineTo(G.px + G.pw + 4, G.py + G.ph); ctx.stroke();
    ctx.restore();
    D.text(G.px + G.pw / 2, G.py + G.ph + 40, X.name, { size: 13.5, weight: 800, color: '#334155' });
    ctx.save(); ctx.translate(G.x + 20, G.py + G.ph / 2); ctx.rotate(-Math.PI / 2); D.text(0, 0, '산소 발생 속도 (상대값)', { size: 13, weight: 800, color: '#334155' }); ctx.restore();
    // 측정 점 · 선
    const keys = M.kind === 'temp' ? ['temp'] : ENZ_KEYS;
    keys.forEach((k) => {
      const pts = M.pts[k].slice().sort((a, b) => a.x - b.x), col = k === 'temp' ? '#16a34a' : ENZ[k].color, sel = k === 'temp' || k === M.enz;
      ctx.save(); ctx.globalAlpha = sel ? 1 : 0.28;
      if (pts.length > 1) { ctx.strokeStyle = col; ctx.lineWidth = sel ? 3.2 : 2; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(gx(G, X, p.x), gy(G, p.v)) : ctx.moveTo(gx(G, X, p.x), gy(G, p.v)))); ctx.stroke(); }
      pts.forEach((p) => {
        const px = gx(G, X, p.x), py = gy(G, p.v), sc = Math.max(0.1, p.pop == null ? 1 : p.pop);
        D.sphere(px, py, (sel ? 7.5 : 5.5) * sc, col, { shadow: sel, outline: '#fff', outlineWidth: 2 });
        if (sel && pts.length <= 9) D.text(px, py - 13, String(p.v), { size: 12, weight: 800, color: '#334155' });
      });
      ctx.restore();
    });
    // 최적 표시 (별)
    const marks = M.kind === 'temp' ? (M.tOK ? [['temp', M.tMark]] : []) : ENZ_KEYS.filter((k) => M.pOK[k]).map((k) => [k, M.pMark[k]]);
    marks.forEach(([k, x]) => {
      const pt = M.pts[k].find((p) => p.x === x); if (!pt) return;
      const px = gx(G, X, x), py = gy(G, pt.v);
      ctx.save(); ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? 6 : 14; i ? ctx.lineTo(px + Math.cos(a) * rad, py - 30 + Math.sin(a) * rad) : ctx.moveTo(px + Math.cos(a) * rad, py - 30 + Math.sin(a) * rad); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      D.label(px, py - 52, k === 'temp' ? '최적 온도 ' + x + ' °C' : ENZ[k].name + ' 최적 pH ' + x, { bg: k === 'temp' ? '#16a34a' : ENZ[k].color, size: 12 });
    });
    // 현재 값 표시선
    const v = measVal(), cx2 = gx(G, X, v), cy2 = gy(G, measRate());
    ctx.save(); ctx.strokeStyle = 'rgba(37,99,235,.55)'; ctx.lineWidth = 1.8; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(cx2, G.py); ctx.lineTo(cx2, G.py + G.ph); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(cx2, cy2, 7, 0, 6.3); ctx.fill(); ctx.stroke(); ctx.restore();
    D.label(clamp(cx2, G.px + 46, G.px + G.pw - 46), G.py + G.ph - 14, (M.kind === 'temp' ? v + ' °C' : 'pH ' + v) + ' → ' + measRate(), { bg: '#2563eb', size: 12 });
    // 범례 (pH)
    if (M.kind === 'ph') {
      ENZ_KEYS.forEach((k, i) => {
        const lx = G.px + 8 + i * (PHONE ? 130 : 118), ly = G.y + G.h - 18;
        D.sphere(lx, ly, 6, ENZ[k].color, { gloss: false }); D.text(lx + 12, ly + 5, ENZ[k].name, { size: 12.5, weight: 800, color: k === M.enz ? '#111827' : '#94a3b8', align: 'left' });
      });
    }
    if (M.msgT > 0) D.label(G.x + G.w / 2, G.y + G.h - (M.kind === 'ph' ? 44 : 18), M.msg, { bg: M.msgBad ? '#b45309' : '#15803d', size: PHONE ? 12 : 13 });
  }
  function drawMeas(t) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    drawMeasPanel(t);
    drawGraph(t);
  }
  function measMsg(msg, bad) { const M = S.meas; M.msg = msg; M.msgBad = !!bad; M.msgT = 3.2; }
  function doMeasure() {
    const M = S.meas, x = measVal(), v = measRate(), arr = measSeries(), G = GP(), X = MX(M);
    let p = arr.find((q) => q.x === x);
    if (p) { p.v = v; p.pop = 0.4; } else { p = { x, v, pop: 0 }; arr.push(p); }
    SciSim.tween(p, { pop: 1 }, { duration: 0.45, ease: 'outBack' });
    Sound.tick(); parts.burst(gx(G, X, x), gy(G, v), { count: 8, speed: 90, size: 3, life: 0.5, colors: ['#16a34a', '#fff', '#60a5fa'] });
    measMsg((M.kind === 'temp' ? x + ' °C' : 'pH ' + x) + ' → 속도 ' + v + ' 측정 (' + arr.length + '개)');
    updateCtl();
  }
  function doMark() {
    const M = S.meas, x = measVal(), arr = measSeries(), p = arr.find((q) => q.x === x);
    if (!p) { measMsg('먼저 이 값에서 📏 측정하기를 눌러 점을 찍어요', true); Sound.fail(); return; }
    if (arr.length < 3) { measMsg('점이 3개 이상이어야 비교할 수 있어요 (지금 ' + arr.length + '개)', true); Sound.fail(); return; }
    if (p.v < 10) { measMsg('이 점(' + p.v + ')보다 더 빠른 곳이 있어요. 값을 바꿔 가며 더 측정해 봐요', true); Sound.fail(); return; }
    const G = GP(), X = MX(M);
    if (M.kind === 'temp') { M.tOK = true; M.tMark = x; measMsg('최적 온도 ' + x + ' °C 표시! 속도가 가장 큰 곳이에요'); }
    else { M.pOK[M.enz] = true; M.pMark = M.pMark || {}; M.pMark[M.enz] = x; measMsg(ENZ[M.enz].name + '의 최적 pH ' + x + ' 표시!'); }
    Sound.success(); parts.burst(gx(G, X, x), gy(G, p.v) - 30, { count: 14, speed: 150, size: 4 });
    updateCtl();
  }
  function setMeasKind(k) {
    const M = S.meas; M.kind = k; S.sub = k; M.rs = null;
    const sl = $('#sM'); sl.min = 0; sl.max = k === 'temp' ? 100 : 14; sl.value = measVal(); sbM.refresh();
    updateCtl();
  }

  /* ======================================================
     화면 ③: 열쇠-자물쇠 (활성 부위 · 기질 특이성 · 열에 의한 변성)
     ====================================================== */
  const LG = () => (PHONE
    ? { xs: [100, 260, 420], ty: 560, tray: [14, 488, 492, 150], prod: [14, 654, 492, 112], items: ['T', 'A', 'B'] }
    : { xs: [130, 300, 470], ty: 492, tray: [24, 428, 552, 118], prod: [590, 170, 192, 300], items: ['T', 'A', 'B'] });
  function lockPocket() {
    const E = enzymeGeo(), d = clamp(S.lock.d, 0, 1);
    return { x: E.cx, y: E.cy + (-E.ry * (1 - 0.2 * d)) + 30 * SUBK };
  }
  function initLock() {
    const L = S.lock, g = LG();
    L.spr = new SciSim.Spring(0, { stiffness: 70, damping: 9 });
    L.T = 37; L.maxT = 37; L.dPerm = 0; L.d = 0; L.sel = ''; L.bound = 0; L.hotFail = false; L.msg = ''; L.msgT = 0; L.cx = null; L.flies = []; L.products = 0; L.shake = 0; L.tried = {}; L.wob = 0; L.bindOnce = false;
    L.items = g.items.map((id, i) => ({ id, x: g.xs[i], y: g.ty, rx: g.xs[i], ry: g.ty, lift: 0, shake: 0, alpha: 1, state: 'tray' }));
    S.drag = null;
    const sl = $('#sLT'); if (sl) { sl.value = 37; sbLT.refresh(); }
  }
  function lockMsg(msg, bad) { S.lock.msg = msg; S.lock.msgBad = !!bad; S.lock.msgT = 3.4; }
  function lockAttempt(it) {
    const L = S.lock, pk = lockPocket();
    L.tried[it.id] = true; L.sel = it.id;
    if (L.cx) { returnItem(it); lockMsg('효소는 한 번에 기질 하나만 붙잡아요. 반응이 끝난 뒤 다시 해 봐요', true); Sound.fail(); return; }
    if (it.id === 'A' && L.d < 0.15) {
      it.state = 'bound'; L.cx = { id: it.id, it, t: 0, phase: 'in', sx: it.x, sy: it.y, px: pk.x, py: pk.y, split: 0 };
      L.bindOnce = true; Sound.tick(); lockMsg('딱 맞아요! 효소–기질 복합체가 만들어졌어요');
      if (!RM) parts.burst(pk.x, pk.y, { count: 10, speed: 110, size: 3, life: 0.6, colors: ['#fde047', '#fff', '#34d399'] });
      updateCtl();
    } else {
      it.shake = 0.5; L.shake = 0.5;
      returnItem(it);
      if (it.id === 'A') { L.hotFail = true; lockMsg('활성 부위의 모양이 변해서(변성) 기질이 들어가지 못해요!', true); }
      else lockMsg(SUB[it.id].name + '의 모양은 활성 부위와 맞지 않아 결합하지 못해요. 다른 기질을 대 봐요', true);
      Sound.fail(); updateCtl();
    }
  }
  function returnItem(it) {
    it.state = 'back';
    SciSim.tween(it, { x: it.rx, y: it.ry, lift: 0 }, { duration: 0.45, ease: 'outBack', onDone: () => { if (it.state === 'back') it.state = 'tray'; } });
  }
  function stepLock(dt) {
    const L = S.lock, T = L.T;
    const target = smooth((T - 45) / 15);
    if (target > L.dPerm) L.dPerm = target;      // 변성은 되돌아가지 않아요
    L.maxT = Math.max(L.maxT, T);
    L.spr.target = L.dPerm; L.spr.update(dt); L.d = clamp(L.spr.value, 0, 1); if (RM) { L.d = L.dPerm; }
    if (L.msgT > 0) L.msgT -= dt;
    if (L.shake > 0) L.shake = Math.max(0, L.shake - dt);
    L.items.forEach((it) => { if (it.shake > 0) it.shake = Math.max(0, it.shake - dt); });
    const c = L.cx;
    if (c) {
      c.t += dt; const pk = lockPocket(); c.px = pk.x; c.py = pk.y;
      if (c.phase === 'in') {
        const u = clamp(c.t / 0.35, 0, 1), e = SciSim.ease.outBack(u);
        c.it.x = lerp(c.sx, c.px, e); c.it.y = lerp(c.sy, c.py, e); if (u >= 1) { c.phase = 'hold'; c.t = 0; }
      } else if (c.phase === 'hold') {
        c.it.x = c.px; c.it.y = c.py; L.wob = 0.012 * Math.sin(c.t * 14);
        if (c.t >= 0.9) { c.phase = 'split'; c.t = 0; Sound.click(); }
      } else if (c.phase === 'split') {
        c.split = RM ? 1 : SciSim.ease.outCubic(clamp(c.t / 0.5, 0, 1)); c.it.x = c.px; c.it.y = c.py; L.wob = 0;
        if (c.t >= 0.5) {
          c.phase = 'fly'; c.t = 0;
          const g = LG(), slot = L.products % 6;
          const zx = g.prod[0] + (PHONE ? 50 + (slot % 6) * 74 : 56 + (slot % 2) * 84), zy = g.prod[1] + (PHONE ? 64 : 84 + Math.floor(slot / 2) * 66);
          c.fly = { x: c.px, y: c.py, tx: zx, ty: zy };
        }
      } else if (c.phase === 'fly') {
        const u = clamp(c.t / 0.8, 0, 1), e = SciSim.ease.outCubic(u);
        c.fx = lerp(c.fly.x, c.fly.tx, e); c.fy = lerp(c.fly.y, c.fly.ty, e);
        if (u >= 1) {
          L.products++; L.bound++; L.cx = null; c.it.state = 'tray'; c.it.x = c.it.rx; c.it.y = c.it.ry; c.it.alpha = 0;
          Sound.success(); if (!RM) parts.burst(c.fly.tx, c.fly.ty, { count: 10, speed: 120, size: 3.4, life: 0.6, colors: ['#3b82f6', '#fde047', '#fff'] });
          lockMsg('기질이 생성물 2개로 나뉘었어요. 효소는 그대로 남아 다시 쓸 수 있어요');
          updateCtl();
        }
      }
    }
    L.items.forEach((it) => { if (it.alpha < 1 && it.state === 'tray') it.alpha = RM ? 1 : Math.min(1, it.alpha + dt * 2.5); });
  }
  function drawLock(t) {
    const L = S.lock, g = LG(), E = enzymeGeo(), pk = lockPocket();
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, PHONE ? 26 : 28, '열쇠–자물쇠 모형: 효소의 활성 부위에 맞는 기질만 결합해요', { size: PHONE ? 13 : 17.5, weight: 800, color: INK });
    D.label(PHONE ? 110 : 96, PHONE ? 52 : 54, '🔍 효소와 기질의 분자 모형', { bg: '#0f766e', size: PHONE ? 11.5 : 12.5 });
    // 열 표시
    if (L.T >= 50) {
      ctx.save(); ctx.strokeStyle = 'rgba(239,68,68,' + (0.25 + 0.2 * Math.sin(t * 5)) + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); for (let k = 0; k <= 12; k++) { const yy = E.cy + E.ry + 12 + k * 4, xx = E.cx + i * 54 + Math.sin(t * 4 + k * 0.8 + i) * 8; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
      ctx.restore();
    }
    ctx.save();
    const sh = L.shake > 0 ? Math.sin(L.shake * 60) * 4 : 0;
    const en = drawEnzyme(E.cx + sh, E.cy, 1, L.d, t, { glow: !!L.cx && L.cx.phase !== 'fly', wob: L.wob });
    ctx.restore();
    D.text(E.cx, E.cy + 30, '효소', { size: PHONE ? 20 : 22, weight: 800, color: '#ecfdf5', stroke: 'rgba(4,120,87,.9)', strokeWidth: 4 });
    D.text(E.cx, E.cy + 54, L.d < 0.15 ? '(단백질)' : '(변성된 단백질)', { size: 13, weight: 800, color: '#ecfdf5', stroke: 'rgba(4,120,87,.9)', strokeWidth: 3 });
    D.label(E.cx + E.rx - 6, E.cy - E.ry - 4, L.T + ' °C', { bg: L.T >= 50 ? '#dc2626' : '#0f766e', size: 13.5 });
    // 활성 부위 이름표
    D.arrow(E.cx - (PHONE ? 120 : 130), pk.y - 40, pk.x - 40, pk.y - 8, { color: '#a16207', width: 3, head: 11 });
    D.label(E.cx - (PHONE ? 130 : 150), pk.y - 52, '활성 부위', { bg: '#a16207', size: PHONE ? 13 : 14.5 });
    // 끌고 있는 기질이 가까우면 안내 링
    if (S.drag && S.drag.mode === 'lock') { const it = S.drag.it; if (Math.hypot(it.x - pk.x, it.y - pk.y) < 80) D.ring(pk.x, pk.y + 4, 46, t, { color: '#facc15', speed: 1.2, width: 3 }); }
    // 복합체 반짝임
    if (L.cx && (L.cx.phase === 'hold' || L.cx.phase === 'split')) { D.glow(pk.x, pk.y, 70, '#fde047', 0.35 + 0.15 * Math.sin(t * 10)); }
    // 기질 놓는 자리
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.75)'; rr(g.tray[0], g.tray[1], g.tray[2], g.tray[3], 16).fill(); }, { blur: 6, y: 2 });
    D.text(g.tray[0] + 76, g.tray[1] + 22, '기질 (끌어다 대 보세요)', { size: 13, weight: 800, color: '#14532d' });
    L.items.forEach((it) => {
      if (it.state === 'drag' || it === (L.cx && L.cx.it)) return;
      const hv = S.hover === it.id;
      ctx.save(); const sc = 1 + it.lift * 0.1 + (hv ? 0.04 : 0); ctx.translate(it.x + (it.shake > 0 ? Math.sin(it.shake * 60) * 5 : 0), it.y); ctx.scale(sc, sc);
      drawSub(it.id, 0, 0, SUBK, { alpha: it.alpha }); ctx.restore();
      if (L.sel === it.id) { ctx.save(); ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3.5; ctx.setLineDash([7, 5]); rr(it.x - 52, it.y - 52, 104, 100, 14).stroke(); ctx.restore(); }
      D.text(it.x, it.y + 66, SUB[it.id].name, { size: 14, weight: 800, color: '#334155' });
    });
    L.items.forEach((it) => {
      const c = L.cx && L.cx.it === it, dr = it.state === 'drag';
      if (!dr && !c) return;
      ctx.save(); const sc = 1 + it.lift * 0.14; ctx.translate(it.x, it.y); ctx.scale(sc, sc);
      drawSub(it.id, 0, 0, SUBK, { split: c && L.cx.phase === 'split' ? L.cx.split : 0, alpha: c && L.cx.phase === 'fly' ? 0 : 1 }); ctx.restore();
    });
    // 날아가는 생성물
    if (L.cx && L.cx.phase === 'fly' && L.cx.fx != null) {
      drawSub(L.cx.id, L.cx.fx - 14, L.cx.fy, 0.8, { only: 'L', shadow: false }); drawSub(L.cx.id, L.cx.fx + 14, L.cx.fy, 0.8, { only: 'R', shadow: false });
    }
    // 생성물 영역
    ctx.save(); D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.75)'; rr(g.prod[0], g.prod[1], g.prod[2], g.prod[3], 16).fill(); }, { blur: 6, y: 2 });
    ctx.restore();
    D.text(g.prod[0] + g.prod[2] / 2, g.prod[1] + 24, '생성물 ' + L.products + '쌍', { size: 14, weight: 800, color: '#14532d' });
    for (let i = 0; i < Math.min(L.products, 6); i++) {
      const zx = g.prod[0] + (PHONE ? 50 + i * 74 : 56 + (i % 2) * 84), zy = g.prod[1] + (PHONE ? 64 : 84 + Math.floor(i / 2) * 66);
      drawSub('A', zx - 14, zy, 0.8, { only: 'L', shadow: false }); drawSub('A', zx + 14, zy, 0.8, { only: 'R', shadow: false });
    }
    if (L.products === 0) D.text(g.prod[0] + g.prod[2] / 2, g.prod[1] + g.prod[3] / 2 + (PHONE ? 10 : 0), '아직 없어요', { size: 13, weight: 700, color: '#94a3b8' });
    if (L.msgT > 0) D.label(VW / 2, PHONE ? 80 : 74, L.msg, { bg: L.msgBad ? '#b45309' : '#15803d', size: PHONE ? 11.5 : 13.5 });
    else if (L.d >= 0.15) D.label(VW / 2, PHONE ? 80 : 74, '변성된 효소: 활성 부위의 모양이 바뀌었어요', { bg: '#b91c1c', size: PHONE ? 11.5 : 13.5 });
  }

  /* ======================================================
     화면 ④: 생활 속 화학 반응 사례 카드 · 발표 카드
     ====================================================== */
  const HOOK = { digest: '밥을 오래 씹으면 단맛이?', ferment: '김치 · 요구르트 · 빵 반죽', detergent: '얼룩이 지워지는 까닭', ripen: '바나나가 달고 말랑해져요', warmer: '흔들면 따뜻해져요', antacid: '속쓰림을 가라앉혀요', photo: '식물이 양분을 만들어요', resp: '세포가 에너지를 얻어요' };
  const CG = () => (PHONE
    ? { cols: 2, w: 236, h: 84, gx: 12, gy: 10, x0: 18, y0: 12, pv: [14, 396, 492, 372] }
    : { cols: 4, w: 176, h: 116, gx: 16, gy: 14, x0: 24, y0: 14, pv: [24, 274, 752, 272] });
  function cardRect(i) { const g = CG(), c = i % g.cols, r = Math.floor(i / g.cols); return { x: g.x0 + c * (g.w + g.gx), y: g.y0 + r * (g.h + g.gy), w: g.w, h: g.h }; }
  const cdata = (id) => (S.cards.data[id] || (S.cards.data[id] = { r: '', p: '', e: '', m: '' }));
  function cardDone(c) {
    const d = S.cards.data[c.id]; if (!d) return false;
    return d.r.trim().length > 0 && d.p.trim().length > 0 && d.e === (c.enz ? 'yes' : 'no') && d.m.trim().length >= 4;
  }
  const doneCount = () => CARDS.filter(cardDone).length;
  function wrapLines(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    Array.from(str).forEach((ch) => { const test = line + ch; if (ctx.measureText(test).width > maxW && line && !/[.,!?)」』·]/.test(ch)) { out.push(line); line = ch === ' ' ? '' : ch; } else line = test; });
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function drawCards(t) {
    const C = S.cards, g = CG();
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    CARDS.forEach((c, i) => {
      const r = cardRect(i), sel = C.sel === c.id, hv = S.hover === 'k' + i, dn = cardDone(c);
      ctx.save(); const lift = sel ? -3 : hv ? -2 : 0;
      D.shadow(() => { ctx.fillStyle = sel ? '#f0fdf4' : '#fff'; rr(r.x, r.y + lift, r.w, r.h, 14).fill(); }, { blur: sel ? 12 : 6, y: sel ? 5 : 2 });
      ctx.lineWidth = sel ? 4 : 2; ctx.strokeStyle = sel ? '#16a34a' : dn ? '#86efac' : '#d7e3da'; rr(r.x, r.y + lift, r.w, r.h, 14).stroke();
      ctx.restore();
      if (PHONE) {
        D.text(r.x + 34, r.y + lift + 54, c.icon, { size: 34 / FS });
        D.text(r.x + 66, r.y + lift + 36, c.name, { size: 16, weight: 800, color: '#14532d', align: 'left' });
        const hl = wrapLines(HOOK[c.id], r.w - 74, 12 / 1);
        hl.slice(0, 2).forEach((l, k) => D.text(r.x + 66, r.y + lift + 56 + k * 16, l, { size: 12, weight: 700, color: '#64748b', align: 'left' }));
      } else {
        D.text(r.x + r.w / 2, r.y + lift + 52, c.icon, { size: 40 });
        D.text(r.x + r.w / 2, r.y + lift + 82, c.name, { size: 17, weight: 800, color: '#14532d' });
        D.text(r.x + r.w / 2, r.y + lift + 102, HOOK[c.id], { size: 12, weight: 700, color: '#64748b' });
      }
      if (dn) D.check(r.x + r.w - 18, r.y + lift + 18, 11, 1);
      if (!C.sel && i === 0) D.ring(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.h, r.w) * 0.5, t, { color: '#16a34a', speed: 0.8, width: 2 });
    });
    // 발표 카드 (미리보기)
    const p = g.pv;
    D.shadow(() => { ctx.fillStyle = '#fffdf5'; rr(p[0], p[1], p[2], p[3], 16).fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#e7d9a8'; ctx.lineWidth = 2.5; rr(p[0], p[1], p[2], p[3], 16).stroke();
    if (!C.sel) {
      D.text(p[0] + p[2] / 2, p[1] + p[3] / 2 - 6, '📋 발표 카드', { size: PHONE ? 22 : 26, weight: 800, color: '#a16207' });
      D.text(p[0] + p[2] / 2, p[1] + p[3] / 2 + 24, '위의 카드에서 사례를 하나 골라 보세요', { size: PHONE ? 13.5 : 15, weight: 700, color: '#78716c' });
      return;
    }
    const c = cardById(C.sel), d = cdata(c.id);
    if (C.info) {
      ctx.fillStyle = '#f0fdf4'; rr(p[0], p[1], p[2], p[3], 16).fill(); ctx.strokeStyle = '#86efac'; ctx.lineWidth = 2.5; rr(p[0], p[1], p[2], p[3], 16).stroke();
      D.text(p[0] + 20, p[1] + 38, '📖 조사 자료  ' + c.icon + ' ' + c.name, { size: PHONE ? 17 : 21, weight: 800, color: '#14532d', align: 'left' });
      const fs = PHONE ? 15 : 17.5, lh = fs * 1.6;
      wrapLines(c.info.replace(/<[^>]+>/g, ''), p[2] - 44, fs, 700).forEach((l, k) => D.text(p[0] + 22, p[1] + 78 + k * lh, l, { size: fs, weight: 700, color: '#1f2937', align: 'left' }));
      D.text(p[0] + p[2] - 18, p[1] + p[3] - 16, '📖 조사 자료 접기를 누르면 발표 카드로 돌아가요', { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
      return;
    }
    D.text(p[0] + 20, p[1] + 36, '📋 발표 카드  ' + c.icon + ' ' + c.name, { size: PHONE ? 17 : 21, weight: 800, color: '#854d0e', align: 'left' });
    const bw = PHONE ? 196 : 262, bh = PHONE ? 62 : 70, by = p[1] + (PHONE ? 62 : 58);
    const bx1 = p[0] + (PHONE ? 16 : 22), bx2 = p[0] + p[2] - (PHONE ? 16 : 22) - bw;
    [[bx1, '반응물', d.r, '#0369a1'], [bx2, '생성물', d.p, '#15803d']].forEach(([bx, lab, val, col]) => {
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(bx, by, bw, bh, 12).fill(); }, { blur: 4, y: 2 });
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; rr(bx, by, bw, bh, 12).stroke();
      D.text(bx + 12, by + 20, lab, { size: 12.5, weight: 800, color: col, align: 'left' });
      const ls = val.trim() ? wrapLines(val, bw - 24, PHONE ? 15 : 17, 800) : ['(입력해요)'];
      ls.slice(0, 2).forEach((l, k) => D.text(bx + 12, by + 42 + k * 19, l, { size: PHONE ? 15 : 17, weight: 800, color: val.trim() ? '#1f2937' : '#cbd5e1', align: 'left' }));
    });
    D.arrow(bx1 + bw + 8, by + bh / 2, bx2 - 8, by + bh / 2, { color: '#a16207', width: 4, head: 12 });
    D.text((bx1 + bw + bx2) / 2, by + bh / 2 - 10, '반응', { size: 12.5, weight: 800, color: '#a16207' });
    const ey = by + bh + (PHONE ? 22 : 26);
    const eTxt = d.e === 'yes' ? '🔑 효소가 관여해요' : d.e === 'no' ? '✕ 효소 없이 일어나요' : '효소 관여 여부: (고르지 않음)';
    D.label(p[0] + 20, ey, eTxt, { bg: d.e === 'yes' ? '#15803d' : d.e === 'no' ? '#b45309' : '#94a3b8', size: PHONE ? 13 : 14.5, align: 'left' });
    D.text(p[0] + 20, ey + 34, '의미', { size: 13, weight: 800, color: '#854d0e', align: 'left' });
    const ml = d.m.trim() ? wrapLines(d.m, p[2] - 40, PHONE ? 15 : 16.5, 700) : ['(한 줄로 정리해요)'];
    ml.slice(0, 3).forEach((l, k) => D.text(p[0] + 20, ey + 58 + k * (PHONE ? 22 : 24), l, { size: PHONE ? 15 : 16.5, weight: 700, color: d.m.trim() ? '#1f2937' : '#cbd5e1', align: 'left' }));
  }
  function setCardSel(id) {
    const C = S.cards; C.sel = id; C.info = false; Sound.click();
    const d = cdata(id);
    $('#inR').value = d.r; $('#inP').value = d.p; $('#inM').value = d.m;
    updateCtl();
  }

  /* ======================================================
     화면 전환 · 컨트롤
     ====================================================== */
  const MODE_LABEL = { tubes: '🧪 효소 실험', meas: '🌡 조건 변화', lock: '🔑 열쇠-자물쇠', cards: '🗂 사례 발표' };
  const DEFSUB = { tubes: 'four', meas: '', lock: 'bind', cards: '' };
  function setMode(m, sub) {
    if (S.mode !== m || (sub != null && S.sub !== sub)) S.fade = 1;
    S.mode = m; S.sub = m === 'meas' ? S.meas.kind : (sub != null ? sub : DEFSUB[m]); S.drag = null; S.hover = '';
    parts.clear();
    updateCtl();
  }
  function ensure(m, sub) { if (S.mode !== m || (sub != null && m !== 'meas' && S.sub !== sub)) setMode(m, sub); }
  function updateCtl() {
    const M = S.meas, L = S.lock, C = S.cards;
    const sub = (S.mode === 'lock' && game && game.free) ? 'heat' : S.sub;
    const key = S.mode + (sub ? ':' + sub : '');
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { const toks = c.dataset.show.split(' '); c.hidden = !(toks.includes(key) || (toks.includes(S.mode) && !c.dataset.show.includes(':'))); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $('#tubeSegBox').hidden = !(S.mode === 'tubes' && game && game.free);
    $$('#tubeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === S.sub));
    $('#modeSeg').hidden = !(game && game.free);
    $('#oTube').textContent = S.tubes.filter((t) => t.added).length + ' / 4';
    $$('#measSeg button').forEach((b) => b.classList.toggle('on', b.dataset.k === M.kind));
    $$('#enzSeg button').forEach((b) => b.classList.toggle('on', b.dataset.e === M.enz));
    $('#mLabel').textContent = M.kind === 'temp' ? '🌡 온도' : '🧪 pH';
    $('#oM').textContent = M.kind === 'temp' ? M.T + ' °C' : 'pH ' + M.ph;
    const n = measSeries().length;
    $('#mNote').innerHTML = M.kind === 'temp' ? '측정한 점 <b>' + n + '개</b> · 속도가 가장 큰 점에서 ⭐ 최적 표시를 눌러요.' : ENZ[M.enz].name + ' 측정한 점 <b>' + n + '개</b> · 가장 큰 점에서 ⭐ 를 눌러요.';
    $('#oLT').textContent = L.T + ' °C';
    const sel = C.sel ? cardById(C.sel) : null, d = sel ? cdata(sel.id) : null;
    $('#cForm').hidden = !sel;
    $('#cTitle').textContent = sel ? '🗂 ' + sel.icon + ' ' + sel.name : '🗂 발표 카드';
    $('#oCard').textContent = doneCount() + ' / 8장';
    $('#cNote').hidden = !!sel;
    $('#bInfo').textContent = C.info ? '📖 조사 자료 접기' : '📖 조사 자료 보기';
    $$('#enzYN button').forEach((b) => b.classList.toggle('on', !!d && d.e === b.dataset.y));
  }
  const sbM = SciSim.bindRange($('#sM'), $('#oM'), (v) => (S.meas.kind === 'temp' ? v + ' °C' : 'pH ' + v), (v) => { if (S.meas.kind === 'temp') S.meas.T = v; else S.meas.ph = v; updateCtl(); });
  const sbLT = SciSim.bindRange($('#sLT'), $('#oLT'), (v) => v + ' °C', (v) => { S.lock.T = v; });
  const stepBtn = (id, sl, dlt) => $(id).addEventListener('click', () => { const el = $(sl); el.value = clamp(+el.value + dlt, +el.min, +el.max); el.dispatchEvent(new Event('input')); Sound.tick(); });
  stepBtn('#bMm', '#sM', -1); stepBtn('#bMp', '#sM', 1); stepBtn('#bLm', '#sLT', -1); stepBtn('#bLp', '#sLT', 1);
  $('#tubeSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); if (b.dataset.s === 'reuse' && (!S.reuse || S.reuse.moved)) resetReuse(); setMode('tubes', b.dataset.s); } });
  $('#bAll').addEventListener('click', () => { S.tubes.forEach((t, i) => { if (!t.added) addMaterial(i, i * 0.3); }); });
  $('#bTubeReset').addEventListener('click', () => { Sound.click(); resetTubes(); updateCtl(); });
  $('#bReuseReset').addEventListener('click', () => { Sound.click(); resetReuse(); updateCtl(); });
  $('#bMove').addEventListener('click', () => movePiece());
  $('#measSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); S.fade = 0.6; setMeasKind(b.dataset.k); } });
  $('#enzSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); S.meas.enz = b.dataset.e; updateCtl(); } });
  $('#bMeas').addEventListener('click', doMeasure);
  $('#bMark').addEventListener('click', doMark);
  $('#bFresh').addEventListener('click', () => { Sound.click(); S.epoch++; initLock(); updateCtl(); });
  $('#bInfo').addEventListener('click', () => { S.cards.info = !S.cards.info; Sound.click(); updateCtl(); });
  [['#inR', 'r'], ['#inP', 'p'], ['#inM', 'm']].forEach(([id, k]) => $(id).addEventListener('input', () => { if (!S.cards.sel) return; cdata(S.cards.sel)[k] = $(id).value; saveCards(); updateCtl(); }));
  $('#enzYN').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && S.cards.sel) { cdata(S.cards.sel).e = b.dataset.y; saveCards(); Sound.click(); updateCtl(); } });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));

  function movePiece() {
    const R = S.reuse, p = R.piece, g = tgeo(); if (!R || p.where === 'Y') return;
    const ep = S.epoch; Sound.click();
    if (R.tw) R.tw.cancel();
    p.where = 'air';
    R.tw = SciSim.tween(p, { x: R.xs[1], y: g.top - 70 }, { duration: 0.7, ease: 'inOutQuad', onDone: () => { if (ep !== S.epoch) return; dropPieceInto('Y'); } });
  }
  function dropPieceInto(k) {
    const R = S.reuse, p = R.piece, g = tgeo(), i = k === 'X' ? 0 : 1; const ep = S.epoch;
    p.where = k; if (k === 'Y') R.moved = true;
    if (R.tw) R.tw.cancel();
    R.tw = SciSim.tween(p, { x: R.xs[i], y: g.rest }, { duration: 0.55, ease: 'outBounce', onDone: () => { if (ep !== S.epoch) return; } });
    Sound.tick(); if (!RM) parts.burst(R.xs[i], g.liqTop, { count: 8, speed: 80, size: 2.6, life: 0.5, colors: ['#bae6fd', '#fff'], shape: 'circle', gravity: 220 });
  }

  /* ---------- 포인터 ---------- */
  function tubeHit(p) {
    const g = tgeo();
    for (let i = 0; i < 4; i++) {
      const cx = g.xs[i];
      if (Math.abs(p.x - cx) <= g.cardW / 2 && Math.abs(p.y - g.cardY) <= g.cardH / 2) return 'c' + i;
      if (Math.abs(p.x - cx) <= g.w / 2 + 12 && p.y >= g.top - 14 && p.y <= g.bottom + 12) return 't' + i;
    }
    return '';
  }
  const pieceHit = (p) => { const q = S.reuse.piece; return Math.hypot(p.x - q.x, p.y - q.y) <= 40; };
  const lockHit = (p) => { const L = S.lock; for (const it of L.items) { if (it.state === 'bound' || (L.cx && L.cx.it === it) || it.alpha < 0.9) continue; if (Math.abs(p.x - it.x) <= 52 && Math.abs(p.y - it.y) <= 52) return it; } return null; };
  const cardHit = (p) => { for (let i = 0; i < CARDS.length; i++) { const r = cardRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i; } return -1; };
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'tubes' && S.sub === 'four') { const h = tubeHit(p); if (h) addMaterial(+h.slice(1)); return false; }
      if (S.mode === 'tubes' && S.sub === 'reuse') {
        if (!pieceHit(p)) return false;
        const R = S.reuse, q = R.piece; if (R.tw) R.tw.cancel(); q.where = 'air'; S.drag = { mode: 'reuse', x: p.x, y: p.y, ox: p.x - q.x, oy: p.y - q.y }; Sound.click(); return true;
      }
      if (S.mode === 'lock') {
        const it = lockHit(p); if (!it) return false;
        if (it.tw) it.tw.cancel();
        it.state = 'drag'; S.lock.sel = it.id; S.drag = { mode: 'lock', it, sx: p.x, sy: p.y, ox: p.x - it.x, oy: p.y - it.y, moved: false };
        SciSim.tween(it, { lift: 1 }, { duration: 0.12 }); Sound.click(); updateCtl(); return true;
      }
      if (S.mode === 'cards') { const i = cardHit(p); if (i >= 0) setCardSel(CARDS[i].id); return false; }
      return false;
    },
    move(p) {
      const d = S.drag; if (!d) return;
      if (d.mode === 'reuse') { const q = S.reuse.piece; d.x = p.x; d.y = p.y; q.x = p.x - d.ox; q.y = p.y - d.oy; }
      else if (d.mode === 'lock') { d.it.x = p.x - d.ox; d.it.y = p.y - d.oy; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; }
    },
    up(p) {
      const d = S.drag; if (!d) return; S.drag = null;
      if (d.mode === 'reuse') {
        const g = tgeo(), R = S.reuse;
        let tgt = '';
        R.xs.forEach((cx, i) => { if (Math.abs(p.x - cx) <= g.w / 2 + 16 && p.y >= g.top - 60 && p.y <= g.bottom + 10) tgt = i ? 'Y' : 'X'; });
        if (!tgt) { tgt = R.from === 'Y' ? 'Y' : 'X'; if (!R.moved) { R.msg = '시험관 안으로 끌어다 놓아요'; R.msgT = 2.4; } }
        dropPieceInto(tgt); R.from = tgt; return;
      }
      if (d.mode === 'lock') {
        const it = d.it, pk = lockPocket();
        if (!d.moved) { it.state = 'back'; SciSim.tween(it, { x: it.rx, y: it.ry, lift: 0 }, { duration: 0.2, onDone: () => { if (it.state === 'back') it.state = 'tray'; } }); return; }
        if (Math.hypot(p.x - pk.x, p.y - pk.y) <= 80) lockAttempt(it); else { returnItem(it); }
      }
    },
    hover(p) {
      if (S.mode === 'tubes' && S.sub === 'four') { const h = tubeHit(p); S.hover = h; if (!h) return 'default'; return S.tubes[+h.slice(1)].added ? 'default' : 'pointer'; }
      if (S.mode === 'tubes' && S.sub === 'reuse') return pieceHit(p) ? 'grab' : 'default';
      if (S.mode === 'lock') { const it = lockHit(p); S.hover = it ? it.id : ''; return it ? 'grab' : 'default'; }
      if (S.mode === 'cards') { const i = cardHit(p); S.hover = i >= 0 ? 'k' + i : ''; return i >= 0 ? 'pointer' : 'default'; }
      S.hover = ''; return 'default';
    },
  });
  view.canvas.addEventListener('pointerleave', () => { S.hover = ''; });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'tubes' && S.sub === 'four') {
      L1 = '최고 거품 높이 ①②③④'; a = S.tubes.map((t) => (t.added ? t.peak : '–')).join(' · ');
      L2 = '넣어 본 시험관'; b = S.tubes.filter((t) => t.added).length + ' / 4';
      const lv = S.tubes[2]; L3 = '간 시험관의 H₂O₂'; c = lv.added ? Math.round(lv.c * 100) + ' % 남음' : '—';
    } else if (S.mode === 'tubes') {
      const R = S.reuse;
      L1 = '반응 끝난 시험관'; a = '거품 ' + Math.round(R.X.foam);
      L2 = '새 시험관'; b = '거품 ' + Math.round(R.Y.foam) + ' (최고 ' + R.Y.peak + ')';
      L3 = '간 조각'; c = R.piece.where === 'Y' ? '새 시험관 속' : R.piece.where === 'X' ? '처음 시험관 속' : '옮기는 중';
    } else if (S.mode === 'meas') {
      const M = S.meas;
      L1 = M.kind === 'temp' ? '온도' : 'pH'; a = M.kind === 'temp' ? M.T + ' °C' : String(M.ph);
      L2 = '산소 발생 속도 (상대값)'; b = String(measRate());
      L3 = '측정한 점'; c = measSeries().length + '개' + ((M.kind === 'temp' ? M.tOK : M.pOK[M.enz]) ? ' · ⭐ 표시함' : '');
    } else if (S.mode === 'lock') {
      const L = S.lock;
      L1 = '온도'; a = L.T + ' °C';
      L2 = '활성 부위'; b = L.d < 0.15 ? '정상' : L.d < 0.6 ? '변하는 중' : '일그러짐(변성)';
      L3 = '만든 생성물'; c = L.products + '쌍';
    } else {
      const C = S.cards, sel = C.sel ? cardById(C.sel) : null;
      L1 = '고른 사례'; a = sel ? sel.icon + ' ' + sel.name : '—';
      const d = sel ? cdata(sel.id) : null;
      L2 = '내가 고른 답'; b = d && d.e ? (d.e === 'yes' ? '효소 반응' : '효소 아님') : '—';
      L3 = '정리한 카드'; c = doneCount() + ' / 8장';
    }
    const key = L1 + a + L2 + b + L3 + c; if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function resetMeas() {
    const M = S.meas;
    M.kind = 'temp'; M.T = 37; M.ph = 7; M.enz = 'pepsin'; M.pts = { temp: [], pepsin: [], amylase: [], trypsin: [] };
    M.tOK = false; M.tMark = null; M.pOK = { pepsin: false, amylase: false, trypsin: false }; M.pMark = {}; M.msgT = 0; M.rs = null;
    const sl = $('#sM'); sl.min = 0; sl.max = 100; sl.value = 37; sbM.refresh();
  }
  function enterLevel(li) {
    S.epoch++;
    if (li === 0) { resetTubes(); resetReuse(); setMode('tubes', 'four'); }
    else if (li === 1) { resetMeas(); setMode('meas'); }
    else if (li === 2) { initLock(); setMode('lock', 'bind'); }
    else { setMode('cards'); }
  }
  const cov = () => { const a = S.meas.pts.temp; return { n: a.length, low: a.some((p) => p.x <= 10), mid: a.some((p) => p.x >= 30 && p.x <= 44), high: a.some((p) => p.x >= 55) }; };
  const tubeObs = (i) => S.tubes[i].added && S.tubes[i].obs >= 5;
  const levels = [
    {
      title: '효소 실험: 반응을 빠르게 하는 물질', short: '효소 실험', icon: '🧪', phase: '실험',
      features: ['tubes'],
      intro: '<p class="si-q">❓ 탐구 질문: 세포 안에서는 왜 몸을 데우지 않고도 화학 반응이 빠르게 일어날까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 소화 효소가 음식물을 분해하는 것을 배웠어요. 우리 몸의 세포 속에서는 소화뿐 아니라 수많은 화학 반응이 쉬지 않고 일어나요.</div>' +
        '<p>생명 시스템을 유지하려면 <b>물질의 출입</b>과 함께 <b>화학 반응(물질대사)</b>이 필요해요. 이 반응을 체온 정도의 온도에서도 빠르게 해 주는 물질이 <b>효소</b>예요. 과산화 수소(H₂O₂)가 물과 산소로 분해되는 반응에 여러 물질을 넣어 거품(산소)이 얼마나 생기는지 비교해 봐요.</p>',
      setup() { enterLevel(0); },
      recap: '효소는 생명체 안에서 화학 반응을 빠르게 하는 생체 촉매예요. 반응 전후에 변하지 않아서 다시 쓸 수 있어요.',
      summary: '<ul><li>세포에서는 많은 <b>화학 반응(물질대사)</b>이 일어나는데, 체온 정도에서도 빠르게 일어나도록 돕는 것이 <b>효소</b>예요.</li><li>효소는 <b>생체 촉매</b>(주성분은 단백질)예요. 간 속 <b>카탈레이스</b>는 과산화 수소(H₂O₂)를 물(H₂O)과 산소(O₂)로 분해해요.</li><li>효소는 반응 전후에 <b>변하지 않아서</b> 계속 다시 쓸 수 있어요.</li><li>삶은 간은 효소의 모양이 변해(변성) 반응하지 못해요.</li></ul>',
      missions: [
        {
          title: '4가지 조건 비교 실험',
          goal: '과산화 수소가 든 시험관 4개에 <b>아무것도 안 넣기 · 이산화 망가니즈 · 간 조각 · 삶은 간 조각</b>을 넣고, 거품 높이를 <b>5초 이상</b> 관찰하세요.',
          hint: '시험관(또는 위의 카드)을 하나씩 눌러 넣어요. ⏩ 모두 넣기를 눌러도 돼요. 거품 높이 눈금을 보며 서로 비교해요.',
          setup() { ensure('tubes', 'four'); },
          check: () => [0, 1, 2, 3].every(tubeObs), hold: 0.5,
          status: () => [0, 1, 2, 3].map((i) => mark(tubeObs(i)) + ' ' + NUM4[i] + (S.tubes[i].added ? ' ' + S.tubes[i].peak : '')).join(' · ') + ' (최고 거품 높이)',
          explain: '<b>간 조각</b>(효소)을 넣은 시험관에서 거품이 가장 높게 올라와요 — 산소가 가장 빨리 만들어졌다는 뜻이에요. 이산화 망가니즈(무기 촉매)도 반응을 빠르게 하지만, <b>삶은 간</b>은 열 때문에 효소의 모양이 변해 거의 반응하지 못해요. 아무것도 넣지 않으면 반응이 거의 일어나지 않아요. 간 속의 <b>카탈레이스</b>가 과산화 수소를 물과 산소로 분해해요.',
        },
        {
          title: '간 조각 다시 쓰기',
          goal: '반응이 끝난 시험관의 <b>간 조각을 새 과산화 수소 시험관에 옮겨</b> 보세요. 새 시험관의 거품 높이가 <b>8 이상</b>이 되면 성공이에요.',
          hint: '간 조각을 손가락(마우스)으로 끌어 오른쪽 시험관 안에 놓아요. 🥢 버튼을 눌러도 옮겨져요.',
          setup() { ensure('tubes', 'reuse'); if (S.reuse.moved || S.reuse.piece.where !== 'X') resetReuse(); updateCtl(); },
          check: () => S.reuse.moved && S.reuse.piece.where === 'Y' && Math.round(S.reuse.Y.foam) >= 8, hold: 0.6,
          status: () => mark(S.reuse.moved) + ' 간 조각 옮기기 · ' + mark(Math.round(S.reuse.Y.foam) >= 8) + ' 새 시험관 거품 높이 ' + Math.round(S.reuse.Y.foam) + ' / 8',
          explain: '반응이 끝난 간 조각을 새 과산화 수소에 넣었더니 또다시 산소가 빠르게 만들어졌어요. 효소는 반응에 쓰여 없어지는 것이 아니라 <b>반응 전후에 변하지 않아서</b> 계속 다시 쓸 수 있어요. 그래서 세포에는 적은 양의 효소만 있어도 많은 반응을 일으킬 수 있어요.',
        },
        {
          type: 'quiz', title: '효소의 특징',
          goal: '효소에 대한 설명으로 <b>옳은</b> 것은?',
          setup() { ensure('tubes', 'reuse'); },
          choices: ['화학 반응을 빠르게 하고, 반응이 끝난 뒤에도 변하지 않아 다시 쓸 수 있다', '반응물과 함께 소모되어 반응이 끝나면 없어진다', '반응할 때 에너지를 만들어 내어 반응을 빠르게 한다', '어떤 화학 반응에나 똑같이 작용한다'],
          answer: 0,
          feedback: ['', '간 조각은 반응이 끝난 뒤에도 또 반응을 일으켰어요. 효소는 소모되지 않아요.', '효소는 에너지를 만들어 내지 않아요. 반응이 일어나는 속도만 빠르게 해 줘요.', '효소는 종류마다 특정한 반응에만 작용해요(다음 단계에서 자세히 봐요).'],
          explain: '효소는 <b>반응을 일으키지만 자신은 변하지 않는</b> 생체 촉매예요. 그래서 반응이 끝난 효소를 다시 쓸 수 있어요.',
        },
      ],
    },
    {
      title: '조건 변화: 온도와 pH의 영향', short: '조건 변화', icon: '🌡️', phase: '실험',
      features: ['meas'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 간 속 효소가 과산화 수소 분해를 빠르게 하고, 삶은 간은 반응하지 못했어요. 그렇다면 온도를 바꾸면 효소는 어떻게 될까요?</div>' +
        '<p>온도를 0 °C부터 100 °C까지 바꿔 가며 <b>산소 발생 속도</b>를 측정해 그래프를 완성해요. 그리고 소화 효소가 가장 잘 작용하는 <b>pH</b>도 찾아봐요. (속도는 가장 빠를 때를 10으로 한 <b>상대값</b>이에요.)</p>',
      setup() { enterLevel(1); },
      recap: '효소는 최적 온도와 최적 pH에서 가장 잘 작용해요. 최적 온도를 크게 넘으면 단백질의 모양이 변해 기능을 잃어요.',
      summary: '<table class="mini"><tr><th>온도(°C)</th><th>0</th><th>20</th><th>37</th><th>50</th><th>60</th><th>100</th></tr><tr><th>속도(상대값)</th><td>1</td><td>6</td><td>10</td><td>5</td><td>1</td><td>0</td></tr></table><ul><li>효소마다 가장 잘 작용하는 <b>최적 온도</b>와 <b>최적 pH</b>가 있어요. 사람 효소의 최적 온도는 약 <b>37 °C</b>예요.</li><li>최적 pH: 펩신(위) 약 <b>2</b>, 아밀레이스(입) 약 <b>7</b>, 트립신(소장) 약 <b>8</b>.</li><li>온도가 너무 높으면 효소(단백질)의 모양이 변해(<b>변성</b>) 기능을 잃어요. 낮은 온도에서는 느려질 뿐이에요.</li></ul>',
      missions: [
        {
          title: '온도별 반응 속도 측정',
          goal: '온도를 바꿔 <b>서로 다른 온도 5곳 이상</b>에서 📏 측정하세요. <b>10 °C 이하, 30~44 °C, 55 °C 이상</b>이 각각 한 곳 이상 들어가야 해요.',
          hint: '예를 들어 0, 20, 37, 50, 60 °C에서 측정해 보세요. − + 버튼으로 1 °C씩 움직일 수 있어요.',
          setup() { ensure('meas'); if (S.meas.kind !== 'temp') setMeasKind('temp'); },
          check: () => { const c = cov(); return c.n >= 5 && c.low && c.mid && c.high; }, hold: 0.5,
          status: () => { const c = cov(); return mark(c.n >= 5) + ' 측정 ' + c.n + ' / 5개 · ' + mark(c.low) + ' 10 °C 이하 · ' + mark(c.mid) + ' 30~44 °C · ' + mark(c.high) + ' 55 °C 이상'; },
          explain: '온도가 오르면 처음에는 반응이 빨라지다가 약 <b>37 °C</b>에서 가장 빨라요. 그보다 더 높아지면 속도가 급격히 줄어 60 °C에서는 거의 반응하지 않아요. 그래프가 <b>산 모양(∩)</b>이 되는 까닭은 온도가 너무 높으면 효소가 기능을 잃기 때문이에요.',
        },
        {
          title: '최적 온도와 최적 pH 찾기',
          goal: '온도 그래프에서 가장 빠른 온도를, pH 그래프에서 <b>펩신과 아밀레이스</b>가 가장 빠른 pH를 찾아 각각 <b>⭐ 최적 표시</b>하세요. (점이 3개 이상 있어야 해요.)',
          hint: '온도는 37 °C 근처를 측정해 가장 높은 점에서 ⭐. pH는 🧪 pH 탭에서 효소를 고르고 pH 1~8 사이를 측정해 봐요.',
          setup() { ensure('meas'); },
          check: () => S.meas.tOK && S.meas.pOK.pepsin && S.meas.pOK.amylase, hold: 0.5,
          status: () => mark(S.meas.tOK) + ' 최적 온도 · ' + mark(S.meas.pOK.pepsin) + ' 펩신 · ' + mark(S.meas.pOK.amylase) + ' 아밀레이스',
          explain: '효소마다 가장 잘 작용하는 <b>최적 온도</b>와 <b>최적 pH</b>가 있어요. 사람 효소의 최적 온도는 체온과 비슷한 약 37 °C예요. <b>펩신</b>은 위(강한 산성)에서 pH 약 <b>2</b>, <b>아밀레이스</b>는 입(중성)에서 pH 약 <b>7</b>, <b>트립신</b>은 소장(약한 염기성)에서 pH 약 <b>8</b>일 때 가장 잘 작용해요. 효소는 자기가 일하는 장소의 환경에 맞춰져 있어요.',
        },
        {
          type: 'quiz', title: '온도와 효소',
          goal: '효소와 온도에 대한 설명으로 <b>옳은</b> 것은?',
          setup() { ensure('meas'); },
          choices: ['온도가 높을수록 효소는 계속 더 잘 작용한다', '최적 온도보다 훨씬 높아지면 효소(단백질)의 모양이 변해 기능을 잃는다', '낮은 온도에서 효소는 변성되어 영영 작용하지 못한다', '모든 효소의 최적 온도는 100 °C이다'],
          answer: 1,
          feedback: ['그래프를 다시 봐요. 37 °C를 넘으면 오히려 속도가 줄어들었어요.', '', '낮은 온도에서는 반응이 느려질 뿐 효소의 모양은 변하지 않아요. 온도를 다시 올리면 활성이 돌아와요.', '사람의 효소는 약 37 °C에서 가장 잘 작용하고, 100 °C에서는 반응하지 못해요.'],
          explain: '높은 온도에서는 효소의 주성분인 단백질의 모양이 변해(<b>변성</b>) 활성 부위가 제 기능을 못 해요. 한 번 변성되면 식혀도 원래대로 돌아오지 않아요. 낮은 온도는 단지 반응을 느리게 할 뿐이에요.',
        },
      ],
    },
    {
      title: '열쇠-자물쇠: 활성 부위와 기질', short: '열쇠-자물쇠', icon: '🔑', phase: '모형',
      features: ['lock'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 효소는 최적 온도에서 가장 잘 작용하고 너무 뜨거우면 기능을 잃었어요. 또 펩신, 아밀레이스처럼 효소마다 일하는 조건이 달랐어요. 효소는 어떻게 일을 할까요?</div>' +
        '<p>효소는 단백질이에요. 효소에는 기질이 달라붙는 <b>활성 부위</b>라는 주머니가 있어서, 모양이 꼭 맞는 <b>기질</b>만 결합해요 — 열쇠와 자물쇠처럼요(<b>기질 특이성</b>). 결합하면 기질이 <b>생성물</b>로 바뀌어 떨어져 나가고, 효소는 그대로 남아요.</p>',
      setup() { enterLevel(2); },
      recap: '효소의 활성 부위에는 모양이 꼭 맞는 기질만 결합해요(기질 특이성). 열을 받으면 활성 부위의 모양이 변해 기질이 결합하지 못해요.',
      summary: '<ul><li><b>활성 부위</b>: 효소에서 기질이 결합하는 부분. 기질과 모양이 꼭 맞아야 해요(<b>열쇠–자물쇠</b>).</li><li><b>기질 특이성</b>: 한 효소는 특정한 기질에만 작용해요. (아밀레이스 → 녹말, 펩신 → 단백질)</li><li>효소–기질 복합체 → <b>생성물</b>로 분리, 효소는 변하지 않고 <b>재사용</b>돼요.</li><li>높은 온도에서는 효소의 모양이 변해(<b>변성</b>) 활성 부위에 기질이 들어가지 못해요. 식혀도 돌아오지 않아요.</li></ul>',
      missions: [
        {
          title: '활성 부위에 맞는 기질 고르기',
          goal: '기질 3개를 효소의 <b>활성 부위</b>에 끌어다 대 보고, 모양이 꼭 맞는 기질을 눌러 고른 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '활성 부위(주머니)의 모양과 기질 모양을 눈으로 비교해요. 끌어다 대 보면 맞지 않는 기질은 튕겨 나가요.',
          manual: true,
          setup() { ensure('lock', 'bind'); },
          check() {
            const L = S.lock;
            if (!L.sel) return '먼저 기질을 눌러 <b>하나 골라요</b>. 끌어다 활성 부위에 대 봐도 좋아요.';
            if (L.sel === 'A') return true;
            return SUB[L.sel].name + '의 모양은 활성 부위와 달라요. 주머니의 모양을 다시 살펴봐요.';
          },
          explain: '<b>기질 ②</b>만 활성 부위에 꼭 맞아 결합했고, 곧 생성물 2개로 나뉘어 떨어져 나갔어요. 효소는 그대로라서 다음 기질을 또 받을 수 있어요. 한 효소가 모양이 맞는 특정한 기질에만 작용하는 것이 <b>기질 특이성</b>이에요.',
        },
        {
          title: '열에 의한 변성 시험',
          goal: '온도를 <b>60 °C 이상</b>으로 올려 효소를 가열한 뒤, 기질 ②를 활성 부위에 다시 대 보세요.',
          hint: '슬라이더(또는 + 버튼)로 60 °C 이상 올려요. 효소 모양이 일그러지면 기질 ②를 끌어다 대 봐요. 식혀도 모양은 돌아오지 않아요.',
          setup() { ensure('lock', 'heat'); if (S.lock.maxT >= 60 || S.lock.dPerm > 0) { initLock(); } updateCtl(); },
          check: () => S.lock.maxT >= 60 && S.lock.hotFail, hold: 0.5,
          status: () => mark(S.lock.maxT >= 60) + ' 60 °C 이상으로 가열 (최고 ' + S.lock.maxT + ' °C) · ' + mark(S.lock.hotFail) + ' 기질 ②가 결합하지 못함',
          explain: '높은 온도에서는 효소(단백질)의 모양이 변하고(<b>변성</b>) 활성 부위의 모양도 달라져서 기질이 결합하지 못해요. 한 번 변성되면 식혀도 원래대로 돌아오지 않아요. 삶은 간이 반응하지 못한 까닭이 바로 이것이에요.',
        },
        {
          type: 'quiz', title: '아밀레이스는 왜 녹말만?',
          goal: '침 속 아밀레이스가 녹말은 분해하지만 단백질은 분해하지 못하는 까닭은?',
          setup() { ensure('lock', 'bind'); },
          choices: ['단백질은 녹말보다 훨씬 커서 아밀레이스가 다룰 수 없기 때문이다', '아밀레이스의 활성 부위는 녹말과 모양이 맞고 단백질과는 맞지 않기 때문이다', '아밀레이스는 온도가 낮아서 단백질에는 작용하지 못하기 때문이다', '단백질은 pH가 달라서 항상 반응하지 못하기 때문이다'],
          answer: 1,
          feedback: ['크기보다 활성 부위와 기질의 <b>모양</b>이 맞는지가 중요해요.', '', '온도 때문이 아니에요. 최적 온도에서도 아밀레이스는 단백질을 분해하지 못해요.', 'pH를 맞춰 줘도 아밀레이스는 단백질을 분해하지 못해요. 모양이 맞지 않기 때문이에요.'],
          explain: '효소는 활성 부위와 <b>모양이 맞는 기질</b>에만 작용해요(기질 특이성). 아밀레이스의 활성 부위는 녹말에 맞고, 단백질은 펩신 같은 다른 효소의 기질이에요.',
        },
      ],
    },
    {
      title: '사례 발표: 생활 속 화학 반응', short: '사례 발표', icon: '🗂️', phase: '적용',
      features: ['cards'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 효소가 활성 부위에 맞는 기질만 분해하고, 온도와 pH에 민감하다는 것을 알았어요. 우리 생활과 몸속에서 일어나는 화학 반응에는 모두 효소가 쓰일까요?</div>' +
        '<p>카드 8장은 <b>생활 속 화학 반응 사례</b>예요. 하나를 골라 <b>반응물 → 생성물</b>, <b>효소가 관여하는지</b>, <b>생활(세포)에서의 의미</b>를 발표 카드로 정리해 보세요. (입력한 내용은 이 기기에만 저장돼요.)</p>',
      setup() { enterLevel(3); },
      recap: '효소는 소화, 발효, 광합성, 세포호흡처럼 생명 시스템에서 일어나는 많은 화학 반응에 쓰여요. 손난로나 제산제처럼 효소 없이 일어나는 화학 반응도 있어요.',
      summary: '<ul><li>생명 시스템을 유지하려면 <b>물질의 출입</b>과 함께 세포에서 일어나는 다양한 <b>화학 반응</b>이 필요해요. 이 반응들에는 <b>효소</b>가 쓰여요.</li><li>효소가 관여하는 사례: <b>소화</b>(아밀레이스), <b>발효</b>(젖산·이산화 탄소), <b>세탁 세제</b>(단백질 분해 효소), <b>과일 숙성</b>, <b>광합성</b>, <b>세포호흡</b>.</li><li>효소 없이 일어나는 화학 반응: <b>손난로</b>(철의 산화, 발열), <b>제산제</b>(산·염기 중화).</li><li>효소는 종류마다 <b>기질 특이성</b>이 있고 <b>최적 온도·최적 pH</b>가 있어요.</li></ul>',
      missions: [
        {
          title: '사례 발표 카드 만들기',
          goal: '카드 1장을 골라 <b>반응물 · 생성물 · 효소 관여 여부 · 의미</b>를 채운 뒤 <b>✔ 확인하기</b>를 누르세요. (📖 조사 자료를 참고해요.)',
          hint: '📖 조사 자료 보기를 눌러 읽고, 반응물과 생성물을 짧게 적어요. 의미는 4글자 이상 한 줄로 정리해요.',
          manual: true,
          setup() { ensure('cards'); },
          check() {
            const C = S.cards; if (!C.sel) return '먼저 위쪽에서 <b>카드를 한 장 골라요</b>.';
            const c = cardById(C.sel), d = cdata(c.id);
            if (!d.r.trim() || !d.p.trim()) return '<b>반응물</b>과 <b>생성물</b>을 모두 적어요. (📖 조사 자료를 참고해요)';
            if (!d.e) return '<b>효소가 관여하는지</b> ○ / ✕ 를 골라요.';
            if (d.e !== (c.enz ? 'yes' : 'no')) return c.enz ? eun(c.name) + ' 효소가 관여하는 반응이에요. 조사 자료를 다시 읽어 봐요.' : eun(c.name) + ' 효소 없이 일어나는 반응이에요. 조사 자료를 다시 읽어 봐요.';
            if (d.m.trim().length < 4) return '<b>의미</b>를 4글자 이상 한 줄로 적어요.';
            return true;
          },
          explain: '카드 하나를 골라 반응물 → 생성물과 효소의 관여 여부를 정리했어요. 생활 속 화학 반응 중 <b>소화·발효·세제·과일 숙성·광합성·세포호흡</b>은 효소가 관여하고, <b>손난로(산화)·제산제(중화)</b>는 효소 없이 일어나요. 다른 카드도 정리해서 친구와 비교해 봐도 좋아요.',
        },
        {
          type: 'quiz', title: '생활 속 화학 반응과 효소',
          goal: '다음 중 <b>옳은</b> 설명은?',
          setup() { ensure('cards'); },
          choices: ['세탁 세제의 단백질 분해 효소와 소화 효소는 둘 다 특정한 기질에만 작용하는 단백질이다', '철 가루 손난로는 효소가 철을 분해하며 열을 내는 반응이다', '제산제는 위에서 소화 효소를 더 많이 만들어 속쓰림을 줄인다', '효소가 관여하는 반응은 모두 열을 내서 체온을 올린다'],
          answer: 0,
          feedback: ['', '손난로는 철이 산소와 반응(산화)하며 열을 내는 반응이에요. 효소는 필요하지 않아요.', '제산제는 염기성 물질이 위산을 <b>중화</b>하는 반응을 이용해요. 소화 효소를 만들지 않아요.', '효소는 반응 속도를 빠르게 할 뿐, 반응이 열을 내는지는 반응에 따라 달라요.'],
          explain: '세탁 세제의 효소도 소화 효소처럼 <b>단백질</b>이고, 모양이 맞는 특정한 기질(예: 단백질 얼룩)에만 작용해요. 손난로(산화)와 제산제(중화)는 효소 없이 일어나는 반응이에요.',
        },
      ],
    },
  ];

  resetTubes(); resetReuse(); resetMeas(); initLock();
  game = SciSim.game({
    simId: 'h1-enzyme', mount: '#game', badge: '효소 박사', homeHref: '../../index.html#h1a',
    featureLabels: { tubes: '🧪 과산화 수소 분해 실험 · 거품 높이 눈금', meas: '🌡 온도 · pH 슬라이더와 반응 속도 그래프', lock: '🔑 효소 활성 부위와 기질 모형', cards: '🗂 생활 속 화학 반응 사례 카드 · 발표 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode === 'tubes') { if (S.sub === 'four') stepTubes(dt); else stepReuse(dt); }
    else if (S.mode === 'meas') stepMeas(dt);
    else if (S.mode === 'lock') stepLock(dt);
    else if (S.cards.msgT > 0) S.cards.msgT -= dt;
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'tubes') { if (S.sub === 'four') drawTubes(t); else drawReuse(t); }
    else if (S.mode === 'meas') drawMeas(t);
    else if (S.mode === 'lock') drawLock(t);
    else drawCards(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setMode, enterLevel, updateCtl, addMaterial, resetTubes, resetReuse, movePiece, doMeasure, doMark, setMeasKind, initLock, lockAttempt, lockPocket, setCardSel, tgeo, cardRect, ENZ, CARDS, rateT, ratePH, cardDone, SUBK, enzymeGeo,
    setMeas(v) { const sl = $('#sM'); sl.value = v; sl.dispatchEvent(new Event('input')); },
    setLockT(v) { const sl = $('#sLT'); sl.value = v; sl.dispatchEvent(new Event('input')); },
  };
})();
