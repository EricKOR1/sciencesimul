(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  /* ---------- 상수 · 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const approach = (cur, tgt, dt, rate) => (RM ? tgt : SciSim.approach(cur, tgt, dt, rate));
  const f0 = (x) => String(Math.round(x));
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const f2 = (x) => (Math.round(x * 100) / 100).toFixed(2);
  const comma = (n) => String(Math.round(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  const wrap360 = (a) => ((a % 360) + 540) % 360 - 180; // -180 ~ 180
  // 받침 유무에 따라 조사 고르기
  const josa = (word, pair) => {
    const ch = String(word).charCodeAt(String(word).length - 1);
    const has = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0;
    const [a, b] = pair.split('/');
    return has ? a : b;
  };

  let view, ctx, D, VW, VH, FS;
  const parts = new SciSim.Particles();
  function initStage(bg, tw, th, pw, ph, fs) {
    VW = PHONE ? pw : tw; VH = PHONE ? ph : th; FS = PHONE ? (fs || 1.25) : 1;
    view = SciSim.stage($('#cv'), { width: VW, height: VH, background: bg });
    ctx = view.ctx; D = SciSim.draw(ctx);
    const f0_ = D.font; D.font = (n, w) => f0_(Math.round(n * FS * 10) / 10, w);
  }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const shade = (c, a) => SciSim.color.shade(c, a);
  const rgba = (c, a) => SciSim.color.rgba(c, a);
  const mixc = (a, b, t) => SciSim.color.mix(a, b, clamp(t, 0, 1));

  /* 글자 줄바꿈 (한국어: 공백 단위, 너무 긴 단어는 글자 단위) */
  function wrapLines(text, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(text).split('\n').forEach((para, pi) => {
      if (pi > 0) { out.push(line); line = ''; }
      para.split(' ').forEach((w) => {
        const cand = line ? line + ' ' + w : w;
        if (ctx.measureText(cand).width <= maxW) { line = cand; return; }
        if (line) { out.push(line); line = ''; }
        if (ctx.measureText(w).width <= maxW) { line = w; return; }
        let cur = '';
        for (const ch of w) { if (ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch; }
        line = cur;
      });
    });
    out.push(line); ctx.restore();
    return out.filter((l, i) => l !== '' || i < out.length - 1);
  }
  function drawWrap(x, y, text, maxW, size, o) {
    o = o || {};
    const lines = wrapLines(text, maxW, size, o.weight), lh = size * FS * (o.lh || 1.3);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, weight: o.weight || 700, color: o.color || '#334155', align: o.align || 'center', alpha: o.alpha, stroke: o.stroke, strokeWidth: o.strokeWidth }));
    return y + (lines.length - 1) * lh;
  }
  /* 안내 글 상자 (반투명 판) */
  function note(x, y, w, text, size, o) {
    o = o || {};
    const lines = wrapLines(text, w - 24, size, 700), lh = size * FS * 1.32, h = lines.length * lh + 14;
    D.shadow(() => { ctx.fillStyle = o.bg || 'rgba(255,255,255,.92)'; rr(x, y, w, h, 12).fill(); }, { blur: 5, y: 2 });
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 2; rr(x, y, w, h, 12).stroke(); }
    lines.forEach((l, i) => D.text(x + w / 2, y + 12 + size * FS * 0.8 + i * lh, l, { size, weight: 700, color: o.color || '#334155' }));
    return h;
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    D.shadow(() => { ctx.fillStyle = o.fill || 'rgba(255,255,255,.9)'; rr(x, y, w, h, o.r || 14).fill(); }, { blur: 6, y: 2 });
    if (o.line) { ctx.strokeStyle = o.line; ctx.lineWidth = o.lw || 2; rr(x, y, w, h, o.r || 14).stroke(); }
    if (o.title) D.text(x + 12, y + 20, o.title, { size: o.tsize || 14, weight: 800, color: o.tcolor || '#334155', align: 'left' });
  }

  /* 읽음 칸 3개 */
  const rdEls = [1, 2, 3].map((i) => [$('#l' + i), $('#v' + i)]);
  let rdLast = '';
  function setReadouts(a) {
    const key = a.join('|'); if (key === rdLast) return; rdLast = key;
    for (let i = 0; i < 3; i++) { rdEls[i][0].textContent = a[i * 2]; rdEls[i][1].textContent = a[i * 2 + 1]; }
  }
  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200); }
  /* 캔버스 위 일시 메시지 */
  const flash = { text: '', t: 0, bg: '#15803d' };
  function say(text, bad, sec) { flash.text = text; flash.t = sec || 2.8; flash.bg = bad ? '#b91c1c' : '#15803d'; }
  function drawFlash(dt, y) {
    if (flash.t <= 0) return;
    flash.t -= dt;
    const a = clamp(flash.t / 0.4, 0, 1), sz = PHONE ? 13 : 14.5;
    const lines = wrapLines(flash.text, VW - 60, sz, 800), lh = sz * FS * 1.3, h = lines.length * lh + 14;
    ctx.save(); ctx.globalAlpha = a;
    D.shadow(() => { ctx.fillStyle = flash.bg; rr(20, y, VW - 40, h, 12).fill(); }, { blur: 6, y: 2 });
    lines.forEach((l, i) => D.text(VW / 2, y + 7 + sz * FS * 0.95 + i * lh, l, { size: sz, weight: 800, color: '#fff' }));
    ctx.restore();
  }
  function setSlider(input, out, v, fmt) { input.value = v; input.style.setProperty('--pct', ((v - input.min) / (input.max - input.min)) * 100 + '%'); if (out) out.textContent = fmt ? fmt(+input.value) : v; }
  function bindSlider(input, out, fmt, cb) {
    const upd = () => { input.style.setProperty('--pct', ((input.value - input.min) / (input.max - input.min)) * 100 + '%'); if (out) out.textContent = fmt(+input.value); };
    input.addEventListener('input', () => { upd(); cb && cb(+input.value); });
    upd();
  }
  function line(pts, color, w, o) {
    o = o || {};
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
  }
  /* 별밤 배경 (고정 별) */
  const STARS = [];
  (function () { let s = 12345; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 90; i++) STARS.push([r(), r(), 0.4 + r() * 1.2, r() * 6]); })();
  function drawSpaceBg(t) {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0b1230'); g.addColorStop(1, '#16224a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    STARS.forEach((s) => { ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.3 + s[3]); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s[0] * VW, s[1] * VH, s[2], 0, TAU); ctx.fill(); });
    ctx.globalAlpha = 1;
  }
  /* 두 원판이 겹치는 넓이 비율(작은 원판 기준이 아니라 R1 원판 기준) */
  function lensArea(r1, r2, d) {
    if (d >= r1 + r2) return 0;
    if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
    const a1 = Math.acos(clamp((d * d + r1 * r1 - r2 * r2) / (2 * d * r1), -1, 1)), a2 = Math.acos(clamp((d * d + r2 * r2 - r1 * r1) / (2 * d * r2), -1, 1));
    return r1 * r1 * a1 + r2 * r2 * a2 - 0.5 * Math.sqrt(Math.max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)));
  }

  /* 달 위상 그리기 (해 방향이 화면 안에서 (lx, ly), 시청자 쪽으로 lz 성분): 밝은 부분만 칠해요 */
  function litSphere(x, y, r, lx, ly, lz, dark, bright) {
    ctx.save();
    ctx.fillStyle = dark || '#39425c'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    const len = Math.hypot(lx, ly, lz) || 1; lx /= len; ly /= len; lz /= len;
    const ang = Math.atan2(ly, lx), sl = Math.hypot(lx, ly);
    ctx.translate(x, y); ctx.rotate(ang);
    const g = ctx.createRadialGradient(r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    g.addColorStop(0, shade(bright || '#f3efe0', 0.2)); g.addColorStop(1, bright || '#cfc9b4');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);   // 해 쪽 반원
    const ex = Math.abs(lz) * r;
    if (lz > 0) ctx.ellipse(0, 0, ex, r, 0, Math.PI / 2, -Math.PI / 2, false); // 시청자 쪽에서 비춤: 터미네이터가 반대편으로 부풀어요
    else ctx.ellipse(0, 0, ex, r, 0, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
  }

  /* =========================================================
     지구과학 Ⅲ. 태양계 천체와 별과 우주의 진화 - 행성의 겉보기 운동
     [12지구03-01] ... 모형을 이용하여 태양계 행성의 겉보기 운동을 설명할 수 있다.
     ① 모형: 공전 모형과 회합 주기   ② 탐구: 내행성(이각·위상)   ③ 탐구: 외행성(충·합·구)   ④ 분석: 역행
     궤도는 원으로 단순화(케플러 법칙·이심률·위치 계산은 다루지 않아요). 천구·좌표계 대신 '태양과 행성이 이루는 각(이각)'과
     '별자리 배경 위에서의 이동 방향'만 써요. 행성 궤도의 작은 기울기는 하늘 띠의 위아래 위치에만 반영했어요.
     ========================================================= */
  const YR = 365.25;
  const PL = {
    mercury: { id: 'mercury', name: '수성', a: 0.39, P: 0.2408, Pd: '0.24', w: '4.09', col: '#a8a29e', R: 2440, th0: 20, inc: 7.0, Om: 48.3, inner: true },
    venus: { id: 'venus', name: '금성', a: 0.72, P: 0.6152, Pd: '0.615', w: '1.60', col: '#f5d27a', R: 6052, th0: 140, inc: 3.4, Om: 76.7, inner: true },
    earth: { id: 'earth', name: '지구', a: 1.0, P: 1.0, Pd: '1.00', w: '0.99', col: '#3b82f6', R: 6371, th0: 0, inc: 0, Om: 0 },
    mars: { id: 'mars', name: '화성', a: 1.52, P: 1.8808, Pd: '1.881', w: '0.52', col: '#e0653a', R: 3390, th0: 25, inc: 1.85, Om: 49.6, inner: false },
    jupiter: { id: 'jupiter', name: '목성', a: 5.2, P: 11.862, Pd: '11.86', w: '0.083', col: '#d9a066', R: 69911, th0: 200, inc: 1.3, Om: 100.5, inner: false },
    saturn: { id: 'saturn', name: '토성', a: 9.58, P: 29.457, Pd: '29.5', w: '0.033', col: '#e7d49a', R: 58232, th0: 300, inc: 2.5, Om: 113.7, inner: false },
  };
  const ORDER = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn'];
  const AU = 1.496e8;
  function helio(p, t) {
    const th = (p.th0 + 360 * t / (YR * p.P)) * DEG;
    return { x: p.a * Math.cos(th), y: p.a * Math.sin(th), z: p.a * Math.sin(p.inc * DEG) * Math.sin(th - p.Om * DEG), th };
  }
  const synodicD = (id) => { const p = PL[id], f = Math.abs(1 / p.P - 1); return YR / f; };
  function geo(id, t) {
    const e = helio(PL.earth, t), p = helio(PL[id], t);
    const dx = p.x - e.x, dy = p.y - e.y, dz = p.z, rho = Math.hypot(dx, dy);
    return { lam: Math.atan2(dy, dx) / DEG, beta: Math.atan2(dz, rho) / DEG, dist: Math.hypot(dx, dy, dz), e, p };
  }
  const sunLam = (t) => { const e = helio(PL.earth, t); return Math.atan2(-e.y, -e.x) / DEG; };
  const elongOf = (id, t) => wrap360(geo(id, t).lam - sunLam(t));      // +: 동쪽(동방), -: 서쪽(서방)
  function phaseAngle(id, t) {                                          // 행성에서 본 태양-지구 사이 각(도)
    const g = geo(id, t), p = g.p, e = g.e;
    const sx = -p.x, sy = -p.y, sz = -p.z, ex = e.x - p.x, ey = e.y - p.y, ez = -p.z;
    const c = (sx * ex + sy * ey + sz * ez) / (Math.hypot(sx, sy, sz) * Math.hypot(ex, ey, ez));
    return Math.acos(clamp(c, -1, 1)) / DEG;
  }
  const dlam = (id, t) => wrap360(geo(id, t + 0.25).lam - geo(id, t - 0.25).lam) / 0.5;   // °/일 (겉보기 경도 변화)
  const delta = (id, t) => { const a = PL[id], b = PL.earth; // 빠른 쪽 − 느린 쪽의 공전 위치 차 (0 = 일직선: 내합 또는 충)
    const fast = a.P < b.P ? a : b, slow = fast === a ? b : a;
    return (((helio(fast, t).th - helio(slow, t).th) / DEG) % 360 + 360) % 360; };
  /* t 이후 처음 일어나는 특정 배치의 시각 (이진 탐색) */
  function findEvent(id, kind, t0) {
    // kind: 'inf'(내합/충) 위치 차 0°, 'sup'(외합/합) 위치 차 180°, 'east'/'west' 최대 이각(내행성), 'eq'/'wq' 구(외행성)
    const p = PL[id], S = synodicD(id);
    const f = (t) => {
      if (kind === 'inf') return wrap360(delta(id, t));
      if (kind === 'sup') return wrap360(delta(id, t) - 180);
      return null;
    };
    if (kind === 'inf' || kind === 'sup') {
      let t = t0;
      const target = kind === 'inf' ? 0 : 180;
      for (let i = 0; i < 4000; i++, t += S / 1200) {
        const a = wrap360(delta(id, t) - target), b = wrap360(delta(id, t + S / 1200) - target);
        if (a < 0 && b >= 0 || (a >= 0 && b < 0 && Math.abs(a - b) < 90)) {
          let lo = t, hi = t + S / 1200; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2, v = wrap360(delta(id, m) - target); const v0 = wrap360(delta(id, lo) - target); if ((v0 < 0) === (v < 0)) lo = m; else hi = m; }
          return (lo + hi) / 2;
        }
      }
      return null;
    }
    // 최대 이각(극값) 또는 구(이각 ±90°)
    const dt = S / 2400, N = 6000;
    if (kind === 'east' || kind === 'west') {
      const sg = kind === 'east' ? 1 : -1;
      let e0 = elongOf(id, t0) * sg, e1 = elongOf(id, t0 + dt) * sg;
      for (let i = 2; i < N; i++) {
        const e2 = elongOf(id, t0 + dt * i) * sg;
        if (e1 > 5 && e1 >= e0 && e1 > e2) { // 극대: 포물선 보간
          const den = e0 - 2 * e1 + e2, off = den !== 0 ? 0.5 * (e0 - e2) / den : 0;
          return t0 + dt * (i - 1 + off);
        }
        e0 = e1; e1 = e2;
      }
      return null;
    }
    const target = kind === 'eq' ? 90 : -90;
    let tt = t0, last = wrap360(elongOf(id, tt) - target);
    for (let i = 0; i < N; i++) {
      const t2 = tt + dt, v = wrap360(elongOf(id, t2) - target);
      if (Math.abs(v - last) < 60 && (last < 0) !== (v < 0)) {
        let lo = tt, hi = t2; const sl = last < 0;
        for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2, mv = wrap360(elongOf(id, m) - target); if ((mv < 0) === sl) lo = m; else hi = m; }
        return (lo + hi) / 2;
      }
      tt = t2; last = v;
    }
    return null;
  }
  /* 역행 구간(경도가 줄어드는 시기) 목록 */
  const retroCache = {};
  function retroInfo(id) {
    if (retroCache[id]) return retroCache[id];
    const S = synodicD(id), out = [];
    let cur = null, prev = null;
    const tEnd = S * 4.3, dt = 0.25;
    for (let t = 0; t < tEnd; t += dt) {
      const d = dlam(id, t), r = d < 0;
      if (r && !cur) cur = { s: t };
      if (!r && cur && prev != null) { cur.e = t; out.push(cur); cur = null; }
      prev = d;
    }
    out.forEach((c) => { c.days = c.e - c.s; c.mid = (c.s + c.e) / 2; });
    const first = out.find((c) => c.s > 5) || out[0];
    retroCache[id] = { list: out, first, days: first ? first.days : 0 };
    return retroCache[id];
  }
  /* 별자리(황도 12 별자리 이름과 대략의 경도 구간: 장식용) */
  const CONST = [['물고기', 352, 389], ['양', 29, 53], ['황소', 53, 90], ['쌍둥이', 90, 118], ['게', 118, 138], ['사자', 138, 174], ['처녀', 174, 218], ['천칭', 218, 241], ['전갈', 241, 266], ['궁수', 266, 300], ['염소', 300, 328], ['물병', 328, 352]];
  const constName = (lam) => { const L = ((lam % 360) + 360) % 360; for (const c of CONST) { const a = c[1] % 360, b = c[2]; if (c[2] > 360 ? (L >= a || L < b - 360) : (L >= a && L < b)) return c[0] + '자리'; } return ''; };

  /* ---------- 상태 ---------- */
  const S = {
    view: 'orbit', clock: 0, t: 0, sel: 'venus', playing: false, spIdx: 3,
    // ① 공전 모형
    align: {}, synOk: false, showCalc: false,
    // ② 내행성
    inner: 'venus', fl2: { east: false, west: false, calc: false }, thOk: false, showCalc2: false, showCards2: false, cards2: [], jt: null,
    // ③ 외행성
    outer: 'mars', fl3: { opp: false, quad: false }, showCards3: false, cards3: [],
    // ④ 역행
    pl4: 'mars', marks: { s: null, e: null }, markOk: false, retroOk: false, showMark: false, showCalc4: false, tab4: 'car', car: { x: 0 }, lastT: 0,
  };
  let game = null;
  const clickable = (el, fn) => el.addEventListener('click', () => { Sound.click(); fn(el); });
  const hasF = (n) => (game ? game.has(n) : true);
  const SPEEDS = [0, 2, 10, 30, 90, 300];
  const spLabel = (i) => (SPEEDS[i] === 0 ? '정지' : SPEEDS[i] + '일/초');

  function lay() {
    if (PHONE) return { A: { x: 8, y: 8, w: VW - 16, h: 300 }, B: { x: 8, y: 316, w: VW - 16, h: 262 }, C: { x: 8, y: 586, w: VW - 16, h: 158 } };
    return { A: { x: 8, y: 8, w: 400, h: 404 }, B: { x: 416, y: 8, w: VW - 424, h: 404 }, C: { x: 8, y: 420, w: VW - 16, h: 132 } };
  }
  const ARC = (v) => f2(v);
  const angDiaArcsec = (id, dist) => 2 * PL[id].R / (dist * AU) * 206265;   // 겉보기 지름(″)
  const illum = (alpha) => (1 + Math.cos(alpha * DEG)) / 2;
  const hrStr = (h) => { h = ((h % 24) + 24) % 24; const hh = Math.floor(h + 1e-9), mm = Math.round((h - hh) * 60); return (mm === 60 ? hh + 1 : hh) + '시' + (mm === 60 || mm === 0 ? '' : ' ' + mm + '분'); };
  const eLabel = (e) => (Math.abs(e) < 1 ? '이각 0°' : (e > 0 ? '동방 이각 ' : '서방 이각 ') + f0(Math.abs(e)) + '°');

  /* ======================================================
     위에서 본 태양계 (공용)
     ====================================================== */
  function topView(A, o) {
    const t = o.t, cx = A.x + A.w / 2, cy = A.y + A.h / 2 + (o.dy || 0);
    const rho = o.mode === 'rot' ? (-90 - helio(PL.earth, t).th / DEG) * DEG : 0;
    const rad = (a) => (o.sq ? o.Rmax * Math.pow(a / 9.58, 0.42) : a * o.k);
    const P = (id, tt) => { const h = helio(PL[id], tt == null ? t : tt), ang = h.th + rho, r = rad(PL[id].a); return { x: cx + r * Math.cos(ang), y: cy - r * Math.sin(ang), ang, r }; };
    ctx.save(); rr(A.x, A.y, A.w, A.h, 16).clip();
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(A.w, A.h) * 0.7); g.addColorStop(0, '#16224d'); g.addColorStop(1, '#080d22');
    ctx.fillStyle = g; ctx.fillRect(A.x, A.y, A.w, A.h);
    STARS.forEach((s) => { ctx.globalAlpha = 0.25 + 0.2 * Math.sin(o.clock + s[3]); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(A.x + s[0] * A.w, A.y + s[1] * A.h, s[2] * 0.8, 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
    // 궤도
    o.ids.concat(['earth']).forEach((id) => {
      const sel = id === o.sel || id === 'earth';
      ctx.strokeStyle = sel ? rgba(PL[id].col, 0.55) : 'rgba(148,163,184,.28)'; ctx.lineWidth = sel ? 1.8 : 1.2;
      ctx.setLineDash(id === 'earth' ? [] : [4, 5]); ctx.beginPath(); ctx.arc(cx, cy, rad(PL[id].a), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    });
    // 지나온 길(꼬리)
    const tail = (id, span) => {
      const p = P(id), r = p.r, a0 = p.ang;
      for (let k = 0; k < 14; k++) { const a1 = a0 - (k / 14) * span * DEG, a2 = a0 - ((k + 1) / 14) * span * DEG; ctx.strokeStyle = rgba(PL[id].col, 0.7 * (1 - k / 14)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, -a1, -a2, false); ctx.stroke(); }
    };
    if (!o.noTail) { tail('earth', 40); if (o.sel) tail(o.sel, o.sel === 'mercury' ? 90 : o.sel === 'venus' ? 60 : 30); }
    // 태양
    D.glow(cx, cy, 44, '#ffb400', 0.55); D.sphere(cx, cy, PHONE ? 12 : 14, '#ffd23f', { light: '#fff6c2', dark: '#f59e0b', gloss: false });
    const pe = P('earth');
    // 지나간 시선들 (역행 장면)
    if (o.rays) o.rays(P, cx, cy, pe);
    // 선
    if (o.sel && o.lines) {
      const pp = P(o.sel);
      ctx.strokeStyle = 'rgba(253,224,71,.8)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pe.x, pe.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(248,250,252,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pp.x, pp.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(96,165,250,.95)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(pe.x, pe.y); ctx.lineTo(pp.x + (pp.x - pe.x) * (o.ext || 0), pp.y + (pp.y - pe.y) * (o.ext || 0)); ctx.stroke();
    }
    // 행성
    const drawPl = (id) => {
      const p = P(id), r = id === 'earth' ? (PHONE ? 8 : 9) : id === 'jupiter' || id === 'saturn' ? (PHONE ? 8 : 9.5) : (PHONE ? 6.5 : 7.5);
      if (id === 'saturn') { ctx.save(); ctx.strokeStyle = 'rgba(231,212,154,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.9, r * 0.65, -0.4, 0, TAU); ctx.stroke(); ctx.restore(); }
      if (id === o.sel || id === 'earth') D.glow(p.x, p.y, r * 3, PL[id].col, 0.35);
      D.sphere(p.x, p.y, r, PL[id].col, { shadow: true });
      D.text(p.x, p.y - r - 6, PL[id].name, { size: 13, weight: 800, color: id === 'earth' ? '#bfdbfe' : '#e2e8f0', stroke: 'rgba(8,13,34,.85)' });
      return p;
    };
    o.ids.forEach((id) => { if (id !== o.sel) drawPl(id); });
    if (o.sel) drawPl(o.sel);
    drawPl('earth');
    ctx.restore();
    return { P, cx, cy, rho, rad };
  }

  /* ======================================================
     ① 공전 모형
     ====================================================== */
  function drawOrbit(t, dt) {
    const L = lay(), tt = S.t, sel = S.sel, p = PL[sel];
    drawSpaceBg(t);
    const tv = topView(L.A, { t: tt, mode: 'inertial', sq: true, Rmax: Math.min(L.A.w, L.A.h) / 2 - 22, ids: ['mercury', 'venus', 'mars', 'jupiter', 'saturn'], sel, lines: true, clock: t });
    // Δ 부채꼴(태양 중심)
    const pe = tv.P('earth'), pp = tv.P(sel);
    S.hits = ORDER.map((id) => { const q = tv.P(id); return { id, x: q.x, y: q.y }; });
    D.text(L.A.x + 12, L.A.y + 22, '위에서 본 공전 모형', { size: 14, weight: 800, color: '#e2e8f0', align: 'left' });
    D.text(L.A.x + 12, L.A.y + L.A.h - 12, '거리는 줄여서 그렸어요 (크기와 거리는 실제 비율 아님)', { size: 12.5, weight: 700, color: '#94a3b8', align: 'left' });
    // 오른쪽 정보 판
    const B = L.B;
    panel(B.x, B.y, B.w, B.h, { fill: 'rgba(255,255,255,.95)' });
    const x = B.x + 14, w = B.w - 28;
    D.sphere(B.x + 30, B.y + 34, 14, p.col, { shadow: true });
    D.text(B.x + 54, B.y + 40, p.name + (p.inner ? ' (내행성)' : ' (외행성)'), { size: 17, weight: 800, color: '#0f172a', align: 'left' });
    const rows = [['공전 반지름', ARC(p.a) + ' AU'], ['공전 주기 P', p.Pd + '년'], ['각속도', p.w + '°/일'], ['지구의 공전 주기 E', '1.00년 (0.99°/일)']];
    let by;
    if (PHONE) {
      rows.forEach((r, i) => { const cx2 = x + (i % 2) * (w / 2 + 6), yy = B.y + 66 + Math.floor(i / 2) * 36; D.text(cx2, yy, r[0], { size: 12.5, weight: 700, color: '#64748b', align: 'left' }); D.text(cx2, yy + 19, r[1], { size: 14, weight: 800, color: '#0f172a', align: 'left' }); });
      by = B.y + 66 + 2 * 36 + 6;
    } else {
      rows.forEach((r, i) => { const yy = B.y + 76 + i * 26; D.text(x, yy, r[0], { size: 14, weight: 700, color: '#475569', align: 'left' }); D.text(x + w, yy, r[1], { size: 14, weight: 800, color: '#0f172a', align: 'right' }); line([[x, yy + 8], [x + w, yy + 8]], 'rgba(148,163,184,.3)', 1); });
      by = B.y + 76 + rows.length * 26 + 22;
    }
    // 회합 주기 막대
    D.text(x, by, '같은 배치가 다시 올 때까지', { size: 14, weight: 800, color: '#0f172a', align: 'left' });
    const bw = w, bh = PHONE ? 18 : 22, byy = by + 10, ph = delta(sel, tt) / 360;
    ctx.fillStyle = '#e2e8f0'; rr(x, byy, bw, bh, 8).fill();
    ctx.save(); rr(x, byy, bw, bh, 8).clip(); const gr = ctx.createLinearGradient(x, 0, x + bw, 0); gr.addColorStop(0, '#38bdf8'); gr.addColorStop(1, '#6366f1'); ctx.fillStyle = gr; ctx.fillRect(x, byy, bw * ph, bh); ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; rr(x, byy, bw, bh, 8).stroke();
    D.text(x, byy + bh + 17, '일직선', { size: 13, weight: 700, color: '#64748b', align: 'left' });
    D.text(x + bw, byy + bh + 17, PHONE ? '일직선' : '일직선(한 바퀴 더)', { size: 13, weight: 700, color: '#64748b', align: 'right' });
    D.text(x + bw / 2, byy + bh + 17, '반대쪽 일직선', { size: 13, weight: 700, color: '#64748b' });
    line([[x + bw / 2, byy - 3], [x + bw / 2, byy + bh + 3]], '#94a3b8', 1.5, { dash: [3, 3] });
    const al = S.align[sel], sTxt = al && al.S != null ? '측정한 회합 주기: ' + f0(al.S) + '일 (' + f2(al.S / YR) + '년)' : '두 번 일직선이 되는 사이를 재 보세요';
    D.text(x, byy + bh + (PHONE ? 40 : 46), sTxt, { size: 14, weight: 800, color: al && al.S != null ? '#1d4ed8' : '#64748b', align: 'left' });
    const sy = byy + bh + (PHONE ? 50 : 70), shh = PHONE ? 36 : 62;
    ctx.save(); ctx.fillStyle = '#eef6ff'; rr(x, sy, w, shh, 12).fill(); ctx.restore();
    D.text(x + w / 2, sy + (PHONE ? 15 : 22), p.inner ? '안쪽 행성: 1/S = 1/P − 1/E' : '바깥 행성: 1/S = 1/E − 1/P', { size: 15, weight: 800, color: '#1e3a8a' });
    D.text(x + w / 2, sy + (PHONE ? 30 : 46), PHONE ? 'S: 회합 주기 · P: 공전 주기 · E = 1년' : 'S: 회합 주기 · P: 행성 공전 주기 · E = 1년', { size: 12.5, weight: 700, color: '#475569' });
    // 아래 칸: 모든 행성 표
    const C = L.C;
    panel(C.x, C.y, C.w, C.h, { fill: 'rgba(8,15,40,.86)', line: 'rgba(148,163,184,.4)', r: 12 });
    const ids = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn'], cw = (C.w - 24) / ids.length;
    ids.forEach((id, i) => {
      const q = PL[id], cxp = C.x + 12 + cw * (i + 0.5), s2 = id === sel;
      if (s2) { ctx.fillStyle = 'rgba(56,189,248,.18)'; rr(cxp - cw / 2 + 3, C.y + 8, cw - 6, C.h - 16, 10).fill(); }
      D.sphere(cxp, C.y + 30, 10, q.col, {});
      D.text(cxp, C.y + 58, q.name, { size: 14, weight: 800, color: '#e2e8f0' });
      D.text(cxp, C.y + 80, PHONE ? q.Pd + '년' : 'P ' + q.Pd + '년', { size: 13, weight: 700, color: '#cbd5e1' });
      D.text(cxp, C.y + 100, PHONE ? q.w + '°' : q.w + '°/일', { size: 13, weight: 700, color: '#93c5fd' });
      D.text(cxp, C.y + 120, PHONE ? ARC(q.a) : ARC(q.a) + ' AU', { size: 12.5, weight: 700, color: '#94a3b8' });
    });
  }

  /* ======================================================
     ② 내행성 (이각 · 위상 · 크기)
     ====================================================== */
  function planetDisc(x, y, R, id, tt) {
    const g = geo(id, tt), al = phaseAngle(id, tt), e = elongOf(id, tt);
    const sgn = e >= 0 ? 1 : -1;                     // 동방(+): 해는 서쪽(오른쪽)에 있음
    ctx.save();
    D.glow(x, y, R * 2.2, PL[id].col, 0.22);
    litSphere(x, y, R, sgn * Math.sin(al * DEG), 0, Math.cos(al * DEG), '#26324f', mixc(PL[id].col, '#ffffff', 0.35));
    ctx.restore();
    return { al, ill: illum(al), dist: g.dist, dia: angDiaArcsec(id, g.dist), e };
  }
  function drawSkyScene(B, id, tt, t, h) {
    const e = elongOf(id, tt), east = e >= 0, a = Math.abs(e);
    ctx.save(); rr(B.x, B.y, B.w, h, 16).clip();
    const g = ctx.createLinearGradient(0, B.y, 0, B.y + h);
    g.addColorStop(0, '#0b1636'); g.addColorStop(0.65, east ? '#41407a' : '#2f4a8a'); g.addColorStop(1, east ? '#f59e6b' : '#f6b98a');
    ctx.fillStyle = g; ctx.fillRect(B.x, B.y, B.w, h);
    STARS.forEach((s) => { const sy = B.y + s[1] * h * 0.7; ctx.globalAlpha = 0.45 + 0.3 * Math.sin(t * 2 + s[3]); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(B.x + s[0] * B.w, sy, s[2] * 0.7, 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
    const hy = B.y + h - 30, sx = B.x + B.w / 2;
    // 해 (수평선 바로 아래)
    D.glow(sx, hy + 4, 130, '#ffb347', 0.55);
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(sx, hy + 14, 22, Math.PI, TAU); ctx.fill();
    // 행성 (해 위쪽, 이각만큼)
    const kpx = (hy - (B.y + 44)) / 50;
    const px = sx + (east ? -1 : 1) * a * 0.35, py = hy - a * kpx * 0.9 - 12;
    const dd = planetDisc(px, py, 8 + 0, id, tt);
    D.text(px + 16, py + 5, PL[id].name, { size: 13.5, weight: 800, color: '#fff', stroke: 'rgba(8,13,34,.8)', align: 'left' });
    // 지평선·풍경
    ctx.fillStyle = '#101826'; ctx.beginPath(); ctx.moveTo(B.x, hy); for (let k = 0; k <= 20; k++) { const xx = B.x + (B.w * k) / 20; ctx.lineTo(xx, hy - 5 - 9 * Math.abs(Math.sin(k * 1.7 + 0.5))); } ctx.lineTo(B.x + B.w, B.y + h); ctx.lineTo(B.x, B.y + h); ctx.closePath(); ctx.fill();
    ctx.restore();
    D.text(B.x + 12, B.y + 22, east ? '저녁, 해 진 직후의 서쪽 하늘' : '새벽, 해 뜨기 직전의 동쪽 하늘', { size: 14, weight: 800, color: '#fff', align: 'left', stroke: 'rgba(8,13,34,.6)' });
    if (a < 8) D.text(B.x + B.w / 2, B.y + 52, '해와 너무 가까워서 보기 어려워요', { size: 13.5, weight: 800, color: '#fde68a', stroke: 'rgba(8,13,34,.7)' });
    else D.text(B.x + B.w / 2, hy + 22, (east ? '해가 진 뒤 약 ' : '해 뜨기 약 ') + f1(a / 15) + '시간 ' + (east ? '후에 져요' : '전에 떠요'), { size: 13.5, weight: 800, color: '#fde68a', stroke: 'rgba(8,13,34,.7)' });
    return dd;
  }
  function drawInner(t, dt) {
    const L = lay(), id = S.inner, tt = S.t, p = PL[id];
    drawSpaceBg(t);
    const k = (Math.min(L.A.w, L.A.h) / 2 - 38) / 1.02;
    const tv = topView(L.A, { t: tt, mode: 'rot', sq: false, k, dy: -8, ids: [id], sel: id, lines: true, noTail: false, clock: t, ext: 0 });
    const cx = tv.cx, cy = tv.cy, pe = tv.P('earth'), pp = tv.P(id), e = elongOf(id, tt), g = geo(id, tt), al = phaseAngle(id, tt);
    ctx.save(); rr(L.A.x, L.A.y, L.A.w, L.A.h, 16).clip();
    // 이각 호
    const aS = Math.atan2(cy - pe.y, cx - pe.x), aP = Math.atan2(pp.y - pe.y, pp.x - pe.x), ra = 46;
    ctx.strokeStyle = '#f87171'; ctx.lineWidth = 3; ctx.beginPath();
    const d = ((aP - aS + Math.PI * 3) % (TAU)) - Math.PI; ctx.arc(pe.x, pe.y, ra, aS, aS + d, d < 0); ctx.stroke();
    const am = aS + d / 2; D.label(pe.x + Math.cos(am) * (ra + 30), pe.y + Math.sin(am) * (ra + 30) - 2, 'θ ' + f0(Math.abs(e)) + '°', { bg: '#dc2626', size: 13, pad: 8 });
    // 직각 표시 (태양-행성-지구)
    if (Math.abs(al - 90) < 2.5) { const ux = (cx - pp.x), uy = (cy - pp.y), vx = (pe.x - pp.x), vy = (pe.y - pp.y), ul = Math.hypot(ux, uy), vl = Math.hypot(vx, vy), s = 12; const a1 = [pp.x + ux / ul * s, pp.y + uy / ul * s], a2 = [pp.x + vx / vl * s, pp.y + vy / vl * s]; line([a1, [a1[0] + vx / vl * s, a1[1] + vy / vl * s], a2], '#fde047', 2.2); D.label(pp.x + (pp.x < cx ? -34 : 34), pp.y - 18, '90°', { bg: '#a16207', size: 13, pad: 7 }); }
    ctx.restore();
    // 접선(최대 이각 위치) 안내: 직각삼각형
    D.text(L.A.x + 12, L.A.y + 22, '위에서 본 모형 (지구를 아래에 고정)', { size: 14, weight: 800, color: '#e2e8f0', align: 'left' });
    D.text(L.A.x + L.A.w - 12, L.A.y + L.A.h - 12, '위 = 태양 방향 · 왼쪽 = 동쪽', { size: 12.5, weight: 700, color: '#94a3b8', align: 'right' });
    // 오른쪽: 하늘 장면 + 원반
    const B = L.B, hs = B.h - (PHONE ? 128 : 150);
    const dd = drawSkyScene(B, id, tt, t, hs);
    panel(B.x, B.y + hs + 8, B.w, B.h - hs - 8, { fill: 'rgba(255,255,255,.95)' });
    const scaleDisc = 1.2, Rd = Math.max(5, dd.dia * scaleDisc / 2), dxc = B.x + 12 + 40, dyc = B.y + hs + 8 + (B.h - hs - 8) / 2;
    planetDisc(dxc, dyc, Rd, id, tt);
    ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(dxc, dyc, 60 * scaleDisc / 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    const tx = B.x + 100, ty = B.y + hs + 8 + 26;
    D.text(tx, ty, '이각 ' + (Math.abs(e) < 0.5 ? '0°' : f0(Math.abs(e)) + '° (' + (e > 0 ? '동방' : '서방') + ')'), { size: 14.5, weight: 800, color: '#0f172a', align: 'left' });
    D.text(tx, ty + 24, '밝은 부분 ' + f0(dd.ill * 100) + ' %', { size: 14, weight: 700, color: '#334155', align: 'left' });
    D.text(tx, ty + 46, '겉보기 지름 ' + f0(dd.dia) + '″ · 거리 ' + f2(dd.dist) + ' AU', { size: 13.5, weight: 700, color: '#334155', align: 'left' });
    D.text(B.x + 12, B.y + B.h - 10, '원반은 지름에 비례해 그렸어요 (점선 원 = 60″)', { size: 12, weight: 700, color: '#64748b', align: 'left' });
    // 아래: 위상 갤러리
    const C = L.C;
    panel(C.x, C.y, C.w, C.h, { fill: 'rgba(8,15,40,.86)', line: 'rgba(148,163,184,.4)', r: 12 });
    const thM = Math.acos(p.a) / DEG, steps = [6, thM * 0.5, thM, 100, 180, 260, 360 - thM, 354], names = ['내합 부근', '', '서방 최대', '', '외합', '', '동방 최대', '내합 부근'];
    const cw = (C.w - 24) / steps.length, curD = ((delta(id, tt)) % 360 + 360) % 360;
    let nearIdx = 0, nb = 1e9; steps.forEach((dv, i) => { const dd2 = Math.min(Math.abs(curD - dv), 360 - Math.abs(curD - dv)); if (dd2 < nb) { nb = dd2; nearIdx = i; } });
    steps.forEach((dv, i) => {
      const cxp = C.x + 12 + cw * (i + 0.5), cyp = C.y + 50;
      // 지구가 0°, 행성이 dv°인 배치에서의 위상·거리
      const ex = 1, ey = 0, ppx = p.a * Math.cos(dv * DEG), ppy = p.a * Math.sin(dv * DEG);
      const dist = Math.hypot(ppx - ex, ppy - ey), sx = -ppx, sy = -ppy, vx = ex - ppx, vy = ey - ppy;
      const alp = Math.acos(clamp((sx * vx + sy * vy) / (Math.hypot(sx, sy) * Math.hypot(vx, vy)), -1, 1)) / DEG;
      const east2 = dv > 180, dia = angDiaArcsec(id, dist), Rr = Math.max(4, dia * 0.5 / 2);
      const nearC = i === nearIdx;
      if (nearC) { ctx.fillStyle = 'rgba(56,189,248,.2)'; rr(cxp - cw / 2 + 3, C.y + 6, cw - 6, C.h - 12, 10).fill(); }
      litSphere(cxp, cyp, Rr, (east2 ? 1 : -1) * Math.sin(alp * DEG), 0, Math.cos(alp * DEG), '#26324f', mixc(p.col, '#ffffff', 0.35));
      D.text(cxp, C.y + 98, f0(dia) + '″', { size: 13, weight: 700, color: '#cbd5e1' });
      if (names[i]) D.text(cxp, C.y + 118, names[i], { size: 13, weight: 800, color: '#fde68a' });
    });
    D.text(C.x + 12, C.y + 20, '한 바퀴(회합 주기) 동안 모양과 크기 변화', { size: 13, weight: 800, color: '#e2e8f0', align: 'left' });
  }

  /* ======================================================
     ③ 외행성 (합 · 충 · 구)
     ====================================================== */
  function drawOuter(t, dt) {
    const L = lay(), id = S.outer, tt = S.t, p = PL[id];
    drawSpaceBg(t);
    const kmax = id === 'mars' ? 1.52 : id === 'jupiter' ? 5.2 : 9.58;
    const sq = id !== 'mars';
    const tv = topView(L.A, { t: tt, mode: 'rot', sq, Rmax: Math.min(L.A.w, L.A.h) / 2 - 22, k: (Math.min(L.A.w, L.A.h) / 2 - 36) / kmax, dy: id === 'mars' ? 12 : 0, ids: [id], sel: id, lines: true, clock: t, ext: 0.0 });
    const e = elongOf(id, tt), g = geo(id, tt), al = phaseAngle(id, tt), pe = tv.P('earth'), pp = tv.P(id);
    // 이각 호
    ctx.save(); rr(L.A.x, L.A.y, L.A.w, L.A.h, 16).clip();
    const aS = Math.atan2(tv.cy - pe.y, tv.cx - pe.x), aP = Math.atan2(pp.y - pe.y, pp.x - pe.x), ra = 40, d = ((aP - aS + Math.PI * 3) % TAU) - Math.PI;
    ctx.strokeStyle = '#f87171'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pe.x, pe.y, ra, aS, aS + d, d < 0); ctx.stroke();
    const am = aS + d / 2; D.label(pe.x + Math.cos(am) * (ra + 30), pe.y + Math.sin(am) * (ra + 30), 'θ ' + f0(Math.abs(e)) + '°', { bg: '#dc2626', size: 13, pad: 8 });
    ctx.restore();
    D.text(L.A.x + 12, L.A.y + 22, '위에서 본 모형 (지구를 아래에 고정)', { size: 14, weight: 800, color: '#e2e8f0', align: 'left' });
    D.text(L.A.x + L.A.w - 12, L.A.y + L.A.h - 12, '위 = 태양 방향 · 왼쪽 = 동쪽' + (sq ? ' · 거리를 줄여 그림' : ''), { size: 12.5, weight: 700, color: '#94a3b8', align: 'right' });
    // 배치 이름표
    const a = Math.abs(e);
    const nm = a < 6 ? '합' : a > 174 ? '충' : Math.abs(a - 90) < 4 ? (e > 0 ? '동구' : '서구') : '';
    if (nm) D.label(L.A.x + L.A.w / 2, L.A.y + 46, nm, { bg: nm === '충' ? '#dc2626' : nm === '합' ? '#475569' : '#0369a1', size: 16, pad: 14 });
    // 오른쪽: 원반 + 남중 시계
    const B = L.B;
    panel(B.x, B.y, B.w, B.h, { fill: 'rgba(255,255,255,.95)' });
    const dia = angDiaArcsec(id, g.dist), ill = illum(al);
    const boxH = PHONE ? 66 : 84, Rd = Math.max(5, Math.min(dia * 2.2 / 2, boxH / 2 - 6)), dcx = B.x + 70, dcy = B.y + 36 + boxH / 2;
    D.text(B.x + 12, B.y + 24, p.name + josa(p.name, '을/를') + ' 지구에서 보면', { size: 14.5, weight: 800, color: '#0f172a', align: 'left' });
    ctx.save(); ctx.fillStyle = '#0b1230'; rr(B.x + 12, B.y + 36, 116, boxH, 10).fill(); ctx.restore();
    const sgn = e >= 0 ? 1 : -1;
    litSphere(dcx, dcy, Rd, sgn * Math.sin(al * DEG), 0, Math.cos(al * DEG), '#3a2218', mixc(p.col, '#ffffff', 0.15));
    const tx = B.x + 142, ty = B.y + 36 + (PHONE ? 16 : 20);
    D.text(tx, ty, '거리 ' + f2(g.dist) + ' AU', { size: 14.5, weight: 800, color: '#0f172a', align: 'left' });
    D.text(tx, ty + (PHONE ? 20 : 24), '지름 ' + f0(dia) + '″ (겉보기)', { size: 14, weight: 700, color: '#334155', align: 'left' });
    D.text(tx, ty + (PHONE ? 40 : 46), '밝은 부분 ' + f0(ill * 100) + ' %', { size: 14, weight: 700, color: '#334155', align: 'left' });
    // 남중 시계
    const kr = PHONE ? 52 : 78, titleY = B.y + 36 + boxH + 20, kx = B.x + B.w / 2 - (PHONE ? 70 : 0), ky = titleY + 12 + kr + (PHONE ? 4 : 12);
    D.text(B.x + 12, titleY, '남중 시각 = 12시 + 이각/15 (시간)', { size: 13.5, weight: 800, color: '#0f172a', align: 'left' });
    ctx.fillStyle = '#f1f5f9'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(kx, ky, kr, 0, TAU); ctx.fill(); ctx.stroke();
    for (let h = 0; h < 24; h++) { const ang = (h - 12) * 15 * DEG - Math.PI / 2, r0 = kr - (h % 6 === 0 ? 12 : 6); ctx.strokeStyle = '#64748b'; ctx.lineWidth = h % 6 === 0 ? 2.4 : 1.2; ctx.beginPath(); ctx.moveTo(kx + Math.cos(ang) * r0, ky + Math.sin(ang) * r0); ctx.lineTo(kx + Math.cos(ang) * kr, ky + Math.sin(ang) * kr); ctx.stroke(); }
    [[12, '12'], [18, '18'], [24, '24'], [6, '6']].forEach(([h, s2]) => { const ang = (h - 12) * 15 * DEG - Math.PI / 2; D.text(kx + Math.cos(ang) * (kr - 24), ky + Math.sin(ang) * (kr - 24) + 5, s2, { size: 13, weight: 800, color: '#334155' }); });
    const tr = 12 + e / 15, ang = (tr - 12) * 15 * DEG - Math.PI / 2;
    ctx.save(); ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(kx, ky - kr, 9, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    D.text(kx, ky - kr + 5, '☀', { size: 12, weight: 800, color: '#b45309' });
    line([[kx, ky], [kx + Math.cos(ang) * (kr - 10), ky + Math.sin(ang) * (kr - 10)]], p.col, 4);
    D.sphere(kx + Math.cos(ang) * kr, ky + Math.sin(ang) * kr, 9, p.col, {});
    if (!PHONE) D.text(kx, ky + 6, hrStr(((tr % 24) + 24) % 24), { size: 15, weight: 800, color: '#0f172a' });
    const a2 = Math.abs(e);
    const msg = a2 > 168 ? '한밤에 남중: 밤새 볼 수 있어요' : a2 < 12 ? '낮에 남중: 해와 함께 있어 안 보여요' : e > 0 ? '저녁~한밤: 저녁 동쪽 하늘' : '한밤~새벽: 새벽에 남중';
    if (PHONE) { D.text(B.x + B.w - 96, ky - 22, hrStr(((tr % 24) + 24) % 24) + ' 남중', { size: 17, weight: 800, color: '#0f172a' }); drawWrap(B.x + B.w - 96, ky + 4, msg, 170, 13, { color: '#0369a1', weight: 800 }); }
    else D.text(B.x + B.w - 12, B.y + B.h - 12, msg, { size: 13, weight: 800, color: '#0369a1', align: 'right' });
    // 아래: 배치 순환 띠 (서구 → 충 → 동구 → 합)
    const C = L.C;
    panel(C.x, C.y, C.w, C.h, { fill: 'rgba(8,15,40,.86)', line: 'rgba(148,163,184,.4)', r: 12 });
    const ax = C.x + 40, aw = C.w - 80, ay = C.y + 62;
    const marks = [[-1, '합'], [-0.5, '서구'], [0, '충'], [0.5, '동구'], [1, '합']];
    line([[ax, ay], [ax + aw, ay]], 'rgba(148,163,184,.7)', 4);
    const Sd = synodicD(id);
    marks.forEach(([u, nmx]) => { const px = ax + (u + 1) / 2 * aw; ctx.fillStyle = nmx === '충' ? '#ef4444' : '#38bdf8'; ctx.beginPath(); ctx.arc(px, ay, 8, 0, TAU); ctx.fill(); D.text(px, ay + 30, nmx, { size: 14, weight: 800, color: '#e2e8f0' }); });
    const oppT = S.oppT || 0, u = clamp((tt - oppT) / (Sd / 2), -1, 1), cxp = ax + (u + 1) / 2 * aw;
    ctx.save(); ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.moveTo(cxp, ay - 10); ctx.lineTo(cxp - 8, ay - 24); ctx.lineTo(cxp + 8, ay - 24); ctx.closePath(); ctx.fill(); ctx.restore();
    D.text(C.x + 12, C.y + 22, '충에서 다음 충까지 약 ' + f0(Sd) + '일(' + f2(Sd / YR) + '년)', { size: 14, weight: 800, color: '#e2e8f0', align: 'left' });
    if (!PHONE) D.text(C.x + C.w - 12, C.y + 22, '충: 태양-지구-행성이 일직선, 지구가 가운데', { size: 13, weight: 700, color: '#fca5a5', align: 'right' });
    D.text(C.x + C.w / 2, C.y + C.h - 12, PHONE ? '합: 태양 뒤쪽 · 충: 지구가 가운데 일직선 · 구: 직각' : '합: 태양이 가운데 (행성이 태양 뒤쪽) · 구: 태양-지구-행성이 직각', { size: 13, weight: 700, color: '#94a3b8' });
  }

  /* ======================================================
     ④ 역행: 하늘 띠 위의 겉보기 이동
     ====================================================== */
  function ev4(id) {   // 역행이 일어나는 사건: 충(외행성) 또는 내합(내행성)
    const r = retroInfo(id), f = r.first;
    const tc = f ? f.mid : 0, W = Math.max(70, Math.round(f ? f.days * 1.5 : 70));
    return { tc, W, s: f ? f.s : 0, e: f ? f.e : 0, days: f ? f.days : 0 };
  }
  function bandData(id) {
    if (bandCache[id]) return bandCache[id];
    const E = ev4(id), pts = [];
    for (let u = -E.W; u <= E.W; u += 1) { const g = geo(id, E.tc + u), l0 = geo(id, E.tc).lam; pts.push({ u, lam: wrap360(g.lam - l0), beta: g.beta, dl: dlam(id, E.tc + u) }); }
    let lo = 1e9, hi = -1e9, blo = 1e9, bhi = -1e9; pts.forEach((q) => { lo = Math.min(lo, q.lam); hi = Math.max(hi, q.lam); blo = Math.min(blo, q.beta); bhi = Math.max(bhi, q.beta); });
    const stat = [];
    for (let i = 1; i < pts.length; i++) if ((pts[i - 1].dl > 0) !== (pts[i].dl > 0)) stat.push(pts[i].u);
    bandCache[id] = { E, pts, lo, hi, blo, bhi, l0: geo(id, E.tc).lam, stat };
    return bandCache[id];
  }
  const bandCache = {};
  function drawBand(C, id, tt, t) {
    const bd = bandData(id), E = bd.E, u = tt - E.tc;
    panel(C.x, C.y, C.w, C.h, { fill: 'rgba(8,15,40,.9)', line: 'rgba(148,163,184,.4)', r: 12 });
    const padX = 30, x0 = C.x + padX, x1 = C.x + C.w - padX, y0 = C.y + 34, y1 = C.y + C.h - 24;
    const span = Math.max(8, bd.hi - bd.lo) * 1.25, mid = (bd.hi + bd.lo) / 2, kx = (x1 - x0) / span;
    const bmid = (bd.bhi + bd.blo) / 2, ky = Math.min(kx, (y1 - y0) / Math.max(1.2, (bd.bhi - bd.blo) * 1.3 + 0.8));
    const X = (lam) => (x0 + x1) / 2 - (lam - mid) * kx, Y = (b) => (y0 + y1) / 2 - (b - bmid) * ky;
    ctx.save(); rr(C.x + 2, C.y + 2, C.w - 4, C.h - 4, 10).clip();
    // 별
    for (let i = 0; i < 70; i++) { const h1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1, h2 = Math.abs(Math.sin(i * 78.233 + 1.7) * 12345.678) % 1; ctx.globalAlpha = 0.3 + 0.4 * h2; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x0 + h1 * (x1 - x0), y0 + h2 * (y1 - y0), 0.8 + h1, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    // 별자리 경계와 이름
    const L0 = bd.l0 + mid;
    for (let b = Math.floor((L0 - span / 2) / 1) - 1; b <= L0 + span / 2 + 1; b++) {
      const lamAbs = ((b % 360) + 360) % 360;
      CONST.forEach((c) => { const edge = c[1] % 360; if (Math.abs(lamAbs - edge) < 0.5 && Math.abs(b - lamAbs) < 400) { const xx = X(b - bd.l0); if (xx > x0 - 10 && xx < x1 + 10) line([[xx, C.y + 6], [xx, C.y + C.h - 6]], 'rgba(148,163,184,.35)', 1.2, { dash: [3, 5] }); } });
    }
    const nm = constName(L0), lc = (b) => b;
    D.text(C.x + C.w - 14, C.y + 22, '별자리 배경: ' + (nm || ''), { size: 13, weight: 700, color: '#a5b4fc', align: 'right' });
    // 눈금(경도)
    for (let dl = Math.ceil((mid - span / 2) / 5) * 5; dl <= mid + span / 2; dl += 5) { const xx = X(dl); line([[xx, y1 + 2], [xx, y1 + 8]], 'rgba(148,163,184,.7)', 1.4); D.text(xx, y1 + 20, (dl >= 0 ? '+' : '−') + Math.abs(dl) + '°', { size: 12, weight: 700, color: '#94a3b8' }); }
    // 경로
    const seg = (a, b, col, w, dash) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); let st = false; bd.pts.forEach((q) => { if (q.u < a || q.u > b) return; const x = X(q.lam), y = Y(q.beta); st ? ctx.lineTo(x, y) : ctx.moveTo(x, y); st = true; }); ctx.stroke(); ctx.setLineDash([]); };
    seg(-E.W, E.W, 'rgba(148,163,184,.35)', 2, [3, 5]);
    // 지나온 길: 순행(파랑) / 역행(빨강)
    for (let i = 1; i < bd.pts.length; i++) { const a = bd.pts[i - 1], b = bd.pts[i]; if (b.u > u) break; ctx.strokeStyle = b.dl < 0 ? '#f87171' : '#60a5fa'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(X(a.lam), Y(a.beta)); ctx.lineTo(X(b.lam), Y(b.beta)); ctx.stroke(); }
    // 5일 간격 점
    bd.pts.forEach((q) => { if (q.u % 5 === 0 && q.u <= u + 0.01) { ctx.fillStyle = q.dl < 0 ? '#fca5a5' : '#bfdbfe'; ctx.beginPath(); ctx.arc(X(q.lam), Y(q.beta), 3, 0, TAU); ctx.fill(); } });
    // 유(멈춤) 지점
    bd.stat.forEach((su) => { const q = bd.pts.find((p2) => p2.u === su); if (q && q.u <= u + 0.01) { D.ring(X(q.lam), Y(q.beta), 9, t, { color: '#fde047', speed: 0.9, width: 2 }); D.text(X(q.lam), Y(q.beta) - 14, '유', { size: 13, weight: 800, color: '#fde047', stroke: 'rgba(8,13,34,.8)' }); } });
    // 학생이 표시한 곳
    [['s', S.marks.s], ['e', S.marks.e]].forEach(([kk, mu]) => { if (mu == null) return; const q = bd.pts.reduce((a, b) => (Math.abs(b.u - mu) < Math.abs(a.u - mu) ? b : a)); D.text(X(q.lam), Y(q.beta) + 26, '📍', { size: 14, weight: 800, color: '#fff' }); });
    // 현재 행성
    const cur = bd.pts.reduce((a, b) => (Math.abs(b.u - u) < Math.abs(a.u - u) ? b : a)), g = geo(id, tt), cl = wrap360(g.lam - bd.l0), cx = X(cl), cy = Y(g.beta);
    D.glow(cx, cy, 20, PL[id].col, 0.5); D.sphere(cx, cy, 8, PL[id].col, { shadow: true });
    const dl = dlam(id, tt);
    D.text(cx, cy - 16 < C.y + 40 ? cy + 26 : cy - 16, PL[id].name + (Math.abs(dl) < 0.03 ? ' (유)' : dl < 0 ? ' (역행)' : ' (순행)'), { size: 13.5, weight: 800, color: dl < 0 ? '#fca5a5' : '#bfdbfe', stroke: 'rgba(8,13,34,.85)' });
    // 방향 안내
    D.text(C.x + C.w - 16, (y0 + y1) / 2 + 5, '서', { size: 14, weight: 800, color: '#93c5fd' });
    D.text(C.x + 16, (y0 + y1) / 2 + 5, '동', { size: 14, weight: 800, color: '#93c5fd' });
    ctx.restore();
    D.text(C.x + 12, C.y + 22, PHONE ? '하늘 띠: ' + PL[id].name : '하늘 띠: 별자리 배경 위의 ' + PL[id].name, { size: 13.5, weight: 800, color: '#e2e8f0', align: 'left' });
    return { dl, u };
  }
  function drawRetro(t, dt) {
    const L = lay(), id = S.pl4, tt = S.t, p = PL[id], bd = bandData(id), E = bd.E;
    drawSpaceBg(t);
    const sq = true;
    const tv = topView(L.A, {
      t: tt, mode: 'inertial', sq, Rmax: Math.min(L.A.w, L.A.h) / 2 - 22, ids: [id], sel: id, lines: false, clock: t, noTail: true,
      rays: (P, cx, cy, pe) => {
        // 10일 간격의 시선 (지구 → 행성): 별 배경에 대한 방향
        for (let u = -E.W; u <= E.W; u += 10) {
          if (E.tc + u > tt + 0.01) break;
          const e1 = P('earth', E.tc + u), p1 = P(id, E.tc + u), dl = dlam(id, E.tc + u), dx = p1.x - e1.x, dy = p1.y - e1.y, len = Math.hypot(dx, dy) || 1;
          ctx.strokeStyle = dl < 0 ? 'rgba(248,113,113,.55)' : 'rgba(96,165,250,.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(e1.x, e1.y); ctx.lineTo(e1.x + dx / len * 160, e1.y + dy / len * 160); ctx.stroke();
          ctx.fillStyle = 'rgba(148,163,184,.8)'; ctx.beginPath(); ctx.arc(e1.x, e1.y, 2.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(p1.x, p1.y, 2.2, 0, TAU); ctx.fill();
        }
        const pp = P(id), dx = pp.x - pe.x, dy = pp.y - pe.y, len = Math.hypot(dx, dy) || 1;
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(pe.x, pe.y); ctx.lineTo(pe.x + dx / len * 180, pe.y + dy / len * 180); ctx.stroke();
        // 별(고정 방향) 기준 화살표
        D.arrow(pe.x - 4, pe.y - 4, pe.x + 36, pe.y - 4, { color: '#a5b4fc', width: 2, head: 9 });
        D.text(pe.x + 40, pe.y - 1, '별(고정 방향)', { size: 12, weight: 700, color: '#a5b4fc', align: 'left', stroke: 'rgba(8,13,34,.8)' });
      },
    });
    D.text(L.A.x + 12, L.A.y + 22, '위에서 본 모형: 10일마다의 시선', { size: 14, weight: 800, color: '#e2e8f0', align: 'left' });
    D.text(L.A.x + 12, L.A.y + L.A.h - 12, '노랑: 지금의 시선 · 파랑: 순행 · 빨강: 역행 중의 시선', { size: 12.5, weight: 700, color: '#94a3b8', align: 'left' });
    const st = drawBand(L.C, id, tt, t);
    // 오른쪽 판
    const B = L.B;
    panel(B.x, B.y, B.w, B.h, { fill: 'rgba(255,255,255,.95)' });
    if (S.tab4 === 'car') drawCars(B, t, dt); else drawRetroBars(B);
    return st;
  }
  function drawCars(B, t, dt) {
    const id = S.pl4, inner = !!PL[id].inner, E = ev4(id), tau = clamp((S.t - (E.tc - E.W)) / (2 * E.W), 0, 1), sv = (tau - 0.5) * 2;
    D.text(B.x + 12, B.y + 24, '🚗 추월 비유: ' + (inner ? PL[id].name + '(빠름)이 지구를 추월' : '지구(빠름)가 ' + PL[id].name + josa(PL[id].name, '을/를') + ' 추월'), { size: PHONE ? 12.5 : 13.5, weight: 800, color: '#0f172a', align: 'left' });
    const x0 = B.x + 10, x1 = B.x + B.w - 10, lw = x1 - x0, yTop = B.y + (PHONE ? 58 : 62), hpx = PHONE ? 46 : 52, yBot = yTop + hpx, D0 = 2.2 * hpx;
    const roadH = 36;
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(x0, yTop - roadH / 2, lw, roadH); ctx.fillRect(x0, yBot - roadH / 2, lw, roadH);
    ctx.setLineDash([12, 10]); ctx.lineDashOffset = -(t * 60) % 22; line([[x0, (yTop + yBot) / 2], [x1, (yTop + yBot) / 2]], '#fff', 2.2); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    const xObs = B.x + B.w * 0.42, dx = (inner ? sv : -sv) * D0;
    const obsY = inner ? yBot : yTop, othY = inner ? yTop : yBot;
    const car = (x, y, col, nm) => { D.shadow(() => { ctx.fillStyle = col; rr(x - 22, y - 11, 44, 22, 8).fill(); }, { blur: 4, y: 2 }); ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(x - 8, y - 8, 16, 16, 4).fill(); D.text(x, y + (y === yTop ? -17 : 27), nm, { size: 12.5, weight: 800, color: '#0f172a' }); };
    D.text(x1 - 4, yTop - roadH / 2 - 6, '안쪽 차선', { size: 12, weight: 700, color: '#64748b', align: 'right' });
    D.text(x1 - 4, yBot + roadH / 2 + 15, '바깥 차선', { size: 12, weight: 700, color: '#64748b', align: 'right' });
    const xOth = xObs + dx;
    car(xOth, othY, inner ? PL[id].col : '#dc2626', inner ? PL[id].name + '(빠름)' : PL[id].name + '(느림)');
    car(xObs, obsY, '#2563eb', inner ? '지구(느림)' : '지구(빠름)');
    // 차 안에서 본 모습
    const wy = yBot + 38, wh = B.y + B.h - wy - 40, wx = B.x + 12, ww = B.w - 24;
    ctx.save(); rr(wx, wy, ww, wh, 12).clip();
    const sg = ctx.createLinearGradient(0, wy, 0, wy + wh); sg.addColorStop(0, '#9ec5f0'); sg.addColorStop(1, '#e6f1fb'); ctx.fillStyle = sg; ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#7c8fb0'; ctx.beginPath(); ctx.moveTo(wx, wy + wh); for (let k = 0; k <= 14; k++) { ctx.lineTo(wx + ww * k / 14, wy + wh - 16 - 22 * Math.abs(Math.sin(k * 2.3 + 1))); } ctx.lineTo(wx + ww, wy + wh); ctx.closePath(); ctx.fill();
    // 눈금 (먼 산 위의 표지: 고정)
    for (let k = 0; k <= 10; k++) { const xx = wx + ww * k / 10; line([[xx, wy + wh - 8], [xx, wy + wh]], '#334155', 1.6); }
    const mapX = (d) => { const a = Math.atan(d / hpx) / (Math.PI / 2); return wx + ww / 2 + (inner ? 1 : -1) * a * (ww / 2 - 28); };
    // 지난 자리 점
    for (let k = 0; k <= 20; k++) { const tk = k / 20; if (tk > tau + 1e-6) break; const s2 = (tk - 0.5) * 2, d2 = (inner ? s2 : -s2) * D0; ctx.fillStyle = 'rgba(234,88,12,.55)'; ctx.beginPath(); ctx.arc(mapX(d2), wy + wh - 22, 3.2, 0, TAU); ctx.fill(); }
    const mx = mapX(dx);
    ctx.fillStyle = inner ? PL[id].col : '#dc2626'; rr(mx - 16, wy + wh - 46, 32, 18, 6).fill(); ctx.fillStyle = 'rgba(255,255,255,.8)'; rr(mx - 6, wy + wh - 43, 12, 11, 3).fill();
    ctx.restore();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; rr(wx, wy, ww, wh, 12).stroke();
    D.text(wx + 8, wy + 18, '동', { size: 13, weight: 800, color: '#1e3a8a', align: 'left' }); D.text(wx + ww - 8, wy + 18, '서', { size: 13, weight: 800, color: '#1e3a8a', align: 'right' });
    D.text(wx + ww / 2, wy + 18, '지구에서 본 ' + PL[id].name + ' (' + (inner ? '느린' : '빠른') + ' 차 안의 창문)', { size: 12.5, weight: 700, color: '#334155' });
    const going = tau > 0.02 && tau < 0.98;
    D.text(B.x + B.w / 2, B.y + B.h - 14, going ? (Math.abs(sv) < 0.45 ? '나란히 지나는 동안 먼 산에 대해 뒤로(서쪽으로) 물러나 보여요' : '아직은 천천히 움직여요') : '▶ 재생하거나 시간을 움직여 보세요', { size: 13, weight: 800, color: '#9a3412' });
    return { tau };
  }
  function drawRetroBars(B) {
    D.text(B.x + 12, B.y + 24, '📊 행성별 역행 기간(일)', { size: 14.5, weight: 800, color: '#0f172a', align: 'left' });
    const ids = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'], obs = { mercury: 21, venus: 40, mars: 72, jupiter: 120, saturn: 138 };
    const x0 = B.x + 64, x1 = B.x + B.w - 16, maxv = 160, bh = 28, gap = (B.h - 130) / ids.length;
    for (let v = 0; v <= maxv; v += 40) { const xx = x0 + (x1 - x0) * v / maxv; line([[xx, B.y + 44], [xx, B.y + 44 + gap * ids.length]], 'rgba(148,163,184,.4)', 1); D.text(xx, B.y + 44 + gap * ids.length + 16, String(v), { size: 12, weight: 700, color: '#64748b' }); }
    ids.forEach((id, i) => {
      const y = B.y + 50 + i * gap, dd = retroInfo(id).days, w = (x1 - x0) * dd / maxv;
      D.text(x0 - 8, y + bh / 2 + 5, PL[id].name, { size: 13.5, weight: 800, color: '#0f172a', align: 'right' });
      ctx.fillStyle = id === S.pl4 ? PL[id].col : mixc(PL[id].col, '#94a3b8', 0.5); rr(x0, y, w, bh, 6).fill();
      D.text(x0 + w + 6, y + bh / 2 + 5, f0(dd) + '일', { size: 13, weight: 800, color: '#0f172a', align: 'left' });
      const ox = x0 + (x1 - x0) * obs[id] / maxv; line([[ox, y - 2], [ox, y + bh + 2]], '#16a34a', 2.5);
    });
    D.text(B.x + 12, B.y + B.h - 12, '막대: 이 모형(원 궤도) · 초록 선: 실제 관측 예시', { size: 12.5, weight: 700, color: '#475569', align: 'left' });
  }

  /* ======================================================
     조작 · 포인터
     ====================================================== */
  initStage('#0b1230', 800, 560, 520, 760, 1.2);
  const $sp = $('#sSp'), $oSp = $('#oSp'), $u2 = $('#sU2'), $o2 = $('#oU2'), $u3 = $('#sU3'), $o3 = $('#oU3'), $u4 = $('#sU4'), $o4 = $('#oU4');
  S.u2 = 0; S.u3 = -195; S.u4 = -110; S.hits = [];
  const tcache = {};
  function evT(id, kind) { const k = id + ':' + kind; if (tcache[k] == null) tcache[k] = findEvent(id, kind, kind === 'inf' ? 3 : 3); return tcache[k]; }
  function innerBase(id) { return findEvent(id, 'inf', 5) - 0; }

  function setView(v) {
    S.view = v;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
    updateCtl();
  }
  function updateCtl() {
    const free = game && game.free;
    $('#modeSeg').hidden = !free;
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#calcBox1').hidden = !(S.view === 'orbit' && (S.showCalc || free));
    $('#calcBox2').hidden = !(S.view === 'inner' && (S.showCalc2 || free));
    $('#cardsBox2').hidden = !(S.view === 'inner' && (S.showCards2 || free));
    $('#cardsBox3').hidden = !(S.view === 'outer' && (S.showCards3 || free));
    $('#markBox').hidden = !(S.view === 'retro' && (S.showMark || free));
    $('#calcBox4').hidden = !(S.view === 'retro' && (S.showCalc4 || free));
    $('#bPlay1').textContent = S.playing ? '⏸ 멈춤' : '▶ 재생';
    $('#bPlay2').textContent = S.playing ? '⏸ 멈춤' : '▶ 재생';
    $('#bPlay3').textContent = S.playing ? '⏸ 멈춤' : '▶ 재생';
    $('#bPlay4').textContent = S.playing ? '⏸ 멈춤' : '▶ 재생';
    $$('#plSeg1 .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === S.sel));
    $$('#plSeg2 .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === S.inner));
    $$('#plSeg3 .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === S.outer));
    $$('#plSeg4 .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === S.pl4));
    $$('#tabSeg4 .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === S.tab4));
    $('#lU4').textContent = PL[S.pl4].inner ? '📅 내합으로부터' : '📅 충으로부터';
    $('#tbLabel').textContent = S.view === 'orbit' ? '🪐 태양계 공전 모형' : S.view === 'inner' ? '🌕 내행성: 이각과 위상' : S.view === 'outer' ? '🔴 외행성: 합·충·구' : '↩ 행성의 역행';
  }
  $$('#modeSeg button').forEach((b) => clickable(b, () => { stopAll(); setView(b.dataset.view); enterScene(b.dataset.view); }));
  function stopAll() { S.playing = false; if (S.jt) { S.jt.cancel(); S.jt = null; } updateCtl(); }

  /* ---- ① ---- */
  $$('#plSeg1 .opt').forEach((b) => clickable(b, () => { S.sel = b.dataset.k; S.seen = S.seen || {}; S.seen[S.sel] = true; updateCtl(); }));
  bindSlider($sp, $oSp, (v) => spLabel(v), (v) => { S.spIdx = v; });
  clickable($('#bPlay1'), () => { S.playing = !S.playing; if (S.playing && S.spIdx === 0) { S.spIdx = 3; setSlider($sp, $oSp, 3, spLabel); } updateCtl(); });
  clickable($('#bReset1'), () => { S.t = 0; S.align = {}; S.playing = false; updateCtl(); });
  clickable($('#bSyn'), () => {
    const v1 = parseFloat(($('#inVenus').value || '').replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.')), v2 = parseFloat(($('#inMars').value || '').replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'));
    if (!isFinite(v1) || !isFinite(v2)) { say('금성과 화성 모두 일(日) 단위 숫자로 입력해 주세요.', true, 2.5); return; }
    const sv = synodicD('venus'), sm = synodicD('mars'), okV = Math.abs(v1 - sv) <= 16, okM = Math.abs(v2 - sm) <= 16;
    if (okV && okM) { S.synOk = true; say('좋아요! 금성 약 ' + f0(sv) + '일, 화성 약 ' + f0(sm) + '일', false, 3.2); }
    else say((okV ? '' : '금성') + (!okV && !okM ? '과 ' : '') + (okM ? '' : '화성') + ' 값을 다시 계산해 봐요. 1/S = |1/P − 1/E| 이고 단위는 년 → 일(×365)이에요.', true, 3.5);
  });

  /* ---- ② ---- */
  function setBase2() { const id = S.inner; S.base2 = innerBase(id); S.syn2 = synodicD(id); $u2.max = Math.round(S.syn2); }
  function setU2(u) { S.u2 = clamp(u, 0, S.syn2); setSlider($u2, $o2, Math.round(S.u2), (v) => f0(v) + '일'); }
  bindSlider($u2, $o2, (v) => f0(v) + '일', (v) => { stopAll(); S.u2 = v; });
  $$('#plSeg2 .opt').forEach((b) => clickable(b, () => { stopAll(); S.inner = b.dataset.k; setBase2(); setU2(S.id2 || 0); S.fl2.pl = S.inner; updateCtl(); }));
  clickable($('#bPlay2'), () => { S.playing = !S.playing; updateCtl(); });
  function jumpU(getTarget, setter) {
    stopAll(); const to = getTarget(), from = setter.get();
    if (RM) { setter.set(to); return; }
    const o = { v: from }; S.jt = SciSim.tween(o, { v: to }, { duration: clamp(Math.abs(to - from) / 220, 0.5, 1.2), ease: 'inOutCubic', onUpdate: () => setter.set(o.v), onDone: () => { S.jt = null; setter.set(to); } });
  }
  const set2 = { get: () => S.u2, set: (v) => setU2(v) };
  $$('#jump2 .opt').forEach((b) => clickable(b, () => jumpU(() => { const id = S.inner, k = b.dataset.k; if (k === 'inf') return 0; if (k === 'sup') return findEvent(id, 'sup', S.base2) - S.base2; return findEvent(id, k, S.base2) - S.base2; }, set2)));
  clickable($('#bTh'), () => {
    const v = parseFloat(($('#inTh').value || '').replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'));
    if (!isFinite(v)) { say('도(°) 단위 숫자를 입력해 주세요.', true, 2); return; }
    const want = Math.asin(PL.venus.a) / DEG;
    if (Math.abs(v - want) <= 2) { S.thOk = true; say('좋아요! sinθ = 0.72 → θ ≈ ' + f0(want) + '°', false, 3); } else say('sinθ = 0.72를 만족하는 θ를 다시 구해 봐요. (sin 45° ≈ 0.71, sin 50° ≈ 0.77)', true, 3.5);
  });
  function cfgSVG(inner, kind) {
    const W = 70, cx = 35, cy = 35, re = 19, rp = inner ? 13 : 31;
    const E = [cx, cy + re];
    let P;
    if (kind === 'inf') P = [cx, cy + rp]; else if (kind === 'sup') P = [cx, cy - rp];
    else if (kind === 'opp') P = [cx, cy + rp];
    else if (kind === 'conj') P = [cx, cy - rp];
    else if (inner) { const y = re === 0 ? 0 : (rp * rp) / re, x = Math.sqrt(rp * rp - y * y); P = [cx + (kind === 'west' ? 1 : -1) * x, cy + y]; }
    else { const x = Math.sqrt(rp * rp - re * re); P = [cx + (kind === 'wq' ? 1 : -1) * x, cy + re]; }
    return '<svg viewBox="0 0 70 70" aria-hidden="true"><circle cx="' + cx + '" cy="' + cy + '" r="' + re + '" fill="none" stroke="#64748b" stroke-width="1" stroke-dasharray="2 3"/><circle cx="' + cx + '" cy="' + cy + '" r="' + rp + '" fill="none" stroke="#64748b" stroke-width="1" stroke-dasharray="2 3"/>' +
      '<line x1="' + E[0] + '" y1="' + E[1] + '" x2="' + cx + '" y2="' + cy + '" stroke="#fde047" stroke-width="1.2"/><line x1="' + E[0] + '" y1="' + E[1] + '" x2="' + P[0] + '" y2="' + P[1] + '" stroke="#60a5fa" stroke-width="1.4"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="#ffd23f"/><circle cx="' + E[0] + '" cy="' + E[1] + '" r="4" fill="#3b82f6"/><circle cx="' + P[0] + '" cy="' + P[1] + '" r="3.6" fill="' + (inner ? '#f5d27a' : '#e0653a') + '"/></svg>';
  }
  const CARD2 = [
    { kind: 'inf', q: '금성이 태양과 지구 사이에 있을 때 (내합 부근)', a: 'A' },
    { kind: 'east', q: '태양-금성-지구가 직각일 때 (최대 이각 부근)', a: 'B' },
    { kind: 'sup', q: '금성이 태양 뒤쪽에 있을 때 (외합 부근)', a: 'C' },
  ];
  const OPT2 = [['A', '초승달 모양 · 가장 크게'], ['B', '반달 모양 · 중간 크기'], ['C', '둥근 모양 · 가장 작게']];
  CARD2.forEach((c, i) => {
    const row = document.createElement('div'); row.className = 'card-row';
    row.innerHTML = cfgSVG(true, c.kind) + '<div><div class="q">' + c.q + '</div><select class="mini-sel" data-i="' + i + '" aria-label="' + c.q + '"><option value="">고르세요</option>' + OPT2.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') + '</select></div>';
    $('#cardsRows2').appendChild(row);
  });
  $$('#cardsRows2 select').forEach((s) => s.addEventListener('change', () => { Sound.click(); S.cards2[s.dataset.i] = s.value || undefined; }));

  /* ---- ③ ---- */
  function setBase3() { const id = S.outer; S.oppT = findEvent(id, 'inf', 5); S.syn3 = synodicD(id); const h = Math.round(S.syn3 / 2); $u3.min = -h; $u3.max = h; }
  function setU3(u) { const h = Math.round(S.syn3 / 2); S.u3 = clamp(u, -h, h); setSlider($u3, $o3, Math.round(S.u3), (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '일'); }
  bindSlider($u3, $o3, (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '일', (v) => { stopAll(); S.u3 = v; });
  $$('#plSeg3 .opt').forEach((b) => clickable(b, () => { stopAll(); S.outer = b.dataset.k; setBase3(); setU3(-Math.round(S.syn3 / 4)); updateCtl(); }));
  clickable($('#bPlay3'), () => { S.playing = !S.playing; if (S.playing && S.u3 >= Math.round(S.syn3 / 2) - 1) setU3(-Math.round(S.syn3 / 2)); updateCtl(); });
  const set3 = { get: () => S.u3, set: (v) => setU3(v) };
  $$('#jump3 .opt').forEach((b) => clickable(b, () => jumpU(() => { const k = b.dataset.k, id = S.outer; if (k === 'opp') return 0; if (k === 'conj') return Math.round(S.syn3 / 2); return findEvent(id, k, S.oppT - S.syn3 / 2 + 1) - S.oppT; }, set3)));
  const CARD3 = [
    { kind: 'opp', q: '행성이 태양의 반대쪽에 있고 지구가 가운데에 있어요', a: '충' },
    { kind: 'conj', q: '태양이 가운데에 있고 행성은 태양 뒤쪽에 있어요', a: '합' },
    { kind: 'eq', q: '태양-지구-행성이 직각이고 행성이 태양의 동쪽에 있어요', a: '동구' },
    { kind: 'wq', q: '태양-지구-행성이 직각이고 행성이 태양의 서쪽에 있어요', a: '서구' },
  ];
  CARD3.forEach((c, i) => {
    const row = document.createElement('div'); row.className = 'card-row';
    row.innerHTML = cfgSVG(false, c.kind) + '<div><div class="q">' + c.q + '</div><select class="mini-sel" data-i="' + i + '" aria-label="' + c.q + '"><option value="">고르세요</option><option>합</option><option>충</option><option>동구</option><option>서구</option></select></div>';
    $('#cardsRows3').appendChild(row);
  });
  $$('#cardsRows3 select').forEach((s) => s.addEventListener('change', () => { Sound.click(); S.cards3[s.dataset.i] = s.value || undefined; }));

  /* ---- ④ ---- */
  function setBase4() { const E = ev4(S.pl4); S.E4 = E; $u4.min = -E.W; $u4.max = E.W; }
  function setU4(u) { const E = S.E4; S.u4 = clamp(u, -E.W, E.W); setSlider($u4, $o4, Math.round(S.u4), (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '일'); }
  bindSlider($u4, $o4, (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '일', (v) => { stopAll(); S.u4 = v; });
  $$('#plSeg4 .opt').forEach((b) => clickable(b, () => { stopAll(); S.pl4 = b.dataset.k; setBase4(); setU4(-S.E4.W); S.marks = { s: null, e: null }; updateCtl(); }));
  clickable($('#bPlay4'), () => { S.playing = !S.playing; if (S.playing && S.u4 >= S.E4.W - 1) setU4(-S.E4.W); updateCtl(); });
  clickable($('#bReset4'), () => { stopAll(); setU4(-S.E4.W); });
  clickable($('#bMk1'), () => markStat('s'));
  clickable($('#bMk2'), () => markStat('e'));
  function markStat(which) {
    const E = S.E4, want = which === 's' ? E.s - E.tc : E.e - E.tc, d = S.u4;
    if (Math.abs(d - want) <= 8) { S.marks[which] = d; say((which === 's' ? '순행에서 역행으로 바뀌는 때' : '역행에서 순행으로 바뀌는 때') + '를 찾았어요!', false, 2.4); }
    else say('아직 멈춘 것처럼 보이는 때가 아니에요. 점들이 앞뒤로 방향을 바꾸는 곳을 찾아봐요.', true, 2.8);
    updateCtl();
  }
  clickable($('#bRetro'), () => {
    const v = parseFloat(($('#inRetro').value || '').replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.').replace('°', ''));
    if (!isFinite(v)) { say('°/일 단위 숫자를 입력해 주세요.', true, 2); return; }
    const want = Math.abs(dlam('mars', findEvent('mars', 'inf', 5)));
    if (Math.abs(Math.abs(v) - 0.36) <= 0.04) { S.retroOk = true; say('좋아요! 충일 때 화성은 하루 약 0.36°씩 뒤로 가요.', false, 3); } else say('상대 속력 (29.8 − 24.1) km/s를 거리 7800만 km로 나눈 값(rad/s)을 °/일로 바꿔 봐요.', true, 3.8);
  });
  $$('#tabSeg4 .opt').forEach((b) => clickable(b, () => { S.tab4 = b.dataset.k; updateCtl(); }));

  /* ---- 장면 진입 ---- */
  function enterScene(v) {
    if (v === 'orbit') { showHint('행성을 눌러 고르고 ▶ 재생을 눌러 봐요', 5000); }
    if (v === 'inner') { setBase2(); setU2(S.u2); showHint('슬라이더나 버튼으로 금성의 위치를 바꿔 봐요', 5000); }
    if (v === 'outer') { setBase3(); setU3(S.u3); showHint('버튼으로 서구·충·동구·합 배치를 만들어 봐요', 5000); }
    if (v === 'retro') { setBase4(); setU4(S.u4); showHint('▶ 재생을 눌러 점의 움직임을 봐요', 5000); }
    updateCtl();
  }

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'orbit' && S.hits.length) {
        let best = null, bd = 22; S.hits.forEach((h) => { const d = Math.hypot(h.x - p.x, h.y - p.y); if (d < bd) { bd = d; best = h; } });
        if (best && best.id !== 'earth') { S.sel = best.id; S.seen = S.seen || {}; S.seen[S.sel] = true; Sound.click(); updateCtl(); }
      }
      return false;
    },
    hover(p) { return S.view === 'orbit' && S.hits.some((h) => h.id !== 'earth' && Math.hypot(h.x - p.x, h.y - p.y) < 22) ? 'pointer' : 'default'; },
  });

  /* ======================================================
     단계(STEP)와 미션
     ====================================================== */
  const tb = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
  function enterLevel(li) {
    stopAll(); clearTimeout(hintTimer);
    S.showCalc = false; S.showCalc2 = false; S.showCards2 = false; S.showCards3 = false; S.showMark = false; S.showCalc4 = false;
    if (li === 0) { S.t = 0; S.tOrb = 0; S.align = {}; S.sel = 'venus'; S.seen = { venus: true }; setView('orbit'); showHint('행성을 눌러 고르고 ▶ 재생을 눌러 봐요', 6000); }
    else if (li === 1) { S.inner = 'venus'; setView('inner'); setBase2(); setU2(0); S.u2 = 0; showHint('슬라이더나 버튼으로 금성의 위치를 바꿔 봐요', 6000); }
    else if (li === 2) { S.outer = 'mars'; setView('outer'); setBase3(); setU3(-Math.round(S.syn3 / 4)); showHint('버튼으로 서구·충·동구·합 배치를 만들어 봐요', 6000); }
    else { S.pl4 = 'mars'; setView('retro'); setBase4(); setU4(-S.E4.W); S.marks = { s: null, e: null }; showHint('▶ 재생을 눌러 화성의 하늘 위치를 따라가 봐요', 6000); }
    updateCtl();
  }
  const levels = [
    {
      title: '공전 모형: 회합 주기', short: '공전 모형', icon: '🪐', phase: '모형', features: ['orbit'],
      intro: '<p class="si-q">❓ 탐구 질문: 태양 곁을 맴도는 금성과 한밤중에 크게 빛나는 화성은 왜 하늘에서 서로 다르게 움직일까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 행성이 태양 둘레를 공전하고, 안쪽 행성일수록 공전 주기가 짧다는 것과 내행성·외행성의 구분을 배웠어요.</div>' +
        '<p>이번 차시에서는 위에서 본 <b>공전 모형</b>으로 지구에서 보이는 행성의 <b>겉보기 운동</b>을 설명해요. 지구도 함께 공전하기 때문에, 행성과 지구가 같은 배치로 돌아오는 데 걸리는 <b>회합 주기 S</b>는 공전 주기 P와 달라요. 지구의 공전 주기를 E(1년)라고 하면 <b>1/S = |1/P − 1/E|</b>예요.</p>' +
        '<p>궤도는 원으로 단순화했고, 거리는 줄여서 그렸어요. 행성을 눌러 고르고 ▶ 재생을 눌러 봐요.</p>',
      setup() { enterLevel(0); },
      recap: '안쪽 행성이 바깥 행성보다 빨리 공전해요. 같은 배치(일직선)가 다시 오는 시간인 회합 주기는 1/S = |1/P − 1/E|로 구하고, 공전 주기와 달라요.',
      summary: tb([['행성', '공전 반지름(AU)', '공전 주기(년)', '각속도(°/일)']].concat(ORDER.map((id) => [PL[id].name, f2(PL[id].a), PL[id].Pd, PL[id].w]))) + '<ul><li>회합 주기 S: 같은 배치가 다시 오는 시간. <b>1/S = |1/P − 1/E|</b> (E = 1년)</li><li>금성: 1/S = 1/0.615 − 1/1 ≈ 0.626 → S ≈ 1.6년(약 584일)</li><li>화성: 1/S = 1/1 − 1/1.881 ≈ 0.468 → S ≈ 2.1년(약 780일), 목성은 약 1.09년(399일)</li></ul>',
      missions: [
        {
          title: '금성과 화성의 회합 주기 계산',
          goal: '두 행성의 공전 주기 P로 <b>1/S = |1/P − 1/E|</b>를 계산해 회합 주기 S를 <b>일(日)</b> 단위로 입력하고 <b>📝 기록</b>을 눌러요. (E = 1년, 1년 ≈ 365일)',
          hint: '공전 주기는 행성을 눌러 확인해요(금성 0.615년, 화성 1.881년). 1/P − 1/E를 구한 뒤 그 값의 역수가 S(년)예요. 365를 곱해 일로 바꿔요.',
          hold: 0.3, setup() { S.synOk = false; S.showCalc = true; $('#inVenus').value = ''; $('#inMars').value = ''; setView('orbit'); },
          status: () => '회합 주기 계산 ' + mark(S.synOk),
          check: () => S.synOk,
          explain: '금성(안쪽)은 지구보다 빨라서 1/S = 1/0.615 − 1/1 ≈ 0.626 → <b>S ≈ 1.60년 ≈ 584일</b>이에요. 화성(바깥)은 지구가 더 빨라서 1/S = 1/1 − 1/1.881 ≈ 0.468 → <b>S ≈ 2.14년 ≈ 780일</b>이에요. 시뮬레이션에서 두 번의 일직선 배치 사이를 재 보면 같은 값이 나와요.',
        },
        {
          type: 'quiz', title: '회합 주기와 공전 주기가 다른 까닭', goal: '금성의 공전 주기는 0.615년인데 회합 주기는 약 1.6년이에요. 두 값이 다른 까닭은 무엇일까요?', setup() { setView('orbit'); },
          choices: ['지구도 태양 둘레를 공전하고 있어서, 두 행성의 공전 속도 차이만큼만 서로의 위치가 달라지기 때문이에요', '금성의 공전 주기가 해마다 달라져서 평균을 내면 1.6년이 되기 때문이에요', '지구가 멈춰 있고 금성만 움직이기 때문이에요', '회합 주기는 항상 공전 주기의 두 배로 정해져 있기 때문이에요'],
          answer: 0,
          feedback: ['', '공전 주기는 거의 일정해요. 회합 주기가 달라지는 것은 지구도 움직이기 때문이에요.', '지구도 1년에 한 바퀴씩 공전해요. 두 천체가 모두 움직인다는 점을 생각해 봐요.', '금성은 약 2.6배, 화성은 약 1.1배예요. 항상 두 배인 것은 아니에요.'],
          explain: '회합 주기는 두 행성이 서로를 한 바퀴 앞지르는 데 걸리는 시간이에요. 각속도의 차이(금성 1.60 − 지구 0.99 ≈ 0.61°/일)로 360°를 채우는 시간이 584일이므로 1/S = 1/P − 1/E가 돼요.',
        },
      ],
    },
    {
      title: '내행성: 이각과 위상', short: '내행성', icon: '🌕', phase: '탐구', features: ['inner'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 안쪽 행성이 지구보다 빠르게 공전하며 지구와의 배치가 계속 바뀌는 것을 봤어요. 금성과 수성(<b>내행성</b>)은 지구에서 볼 때 늘 태양 곁에서만 보여요.</div>' +
        '<p>지구에서 태양과 행성이 이루는 각이 <b>이각</b>이에요. 태양의 동쪽에 있으면 <b>동방 이각</b>(저녁 서쪽 하늘), 서쪽에 있으면 <b>서방 이각</b>(새벽 동쪽 하늘)이에요. 행성이 태양과 지구 사이에 오면 <b>내합</b>, 태양 뒤쪽에 있으면 <b>외합</b>이에요.</p>' +
        '<p>이 단계에서는 <b>천구 좌표 없이</b> 이각과 동·서 방향만 사용해요. 금성의 위치를 바꾸며 이각, 위상, 겉보기 크기가 어떻게 달라지는지 알아봐요.</p>',
      setup() { enterLevel(1); },
      recap: '내행성은 이각에 한계(최대 이각)가 있어요. 최대 이각에서 태양-행성-지구가 직각이라 sinθ = 궤도 반지름(AU)이에요(금성 약 46°, 수성 약 23°). 내합 부근에서는 초승달 모양으로 가장 크게, 외합 부근에서는 둥글고 가장 작게 보여요.',
      summary: '<ul><li><b>내합</b>: 행성이 태양과 지구 사이. <b>외합</b>: 태양 뒤쪽.</li><li><b>동방 최대 이각</b> 부근은 저녁 서쪽 하늘(초저녁 금성), <b>서방 최대 이각</b> 부근은 새벽 동쪽 하늘(샛별)이에요.</li><li>최대 이각: <b>sinθ = 궤도 반지름</b>. 금성 sinθ = 0.72 → 약 46°, 수성 sinθ = 0.39 → 약 23°예요.</li><li>위상: 최대 이각에서 반달, 내합 부근에서 초승달 모양(가장 가깝고 가장 크게), 외합 부근에서 둥근 모양(가장 멀고 가장 작게).</li><li>금성의 겉보기 지름은 외합 약 10″, 내합 약 60″로 약 6배 차이가 나요(거리 1.72 AU ↔ 0.28 AU).</li><li>내행성은 태양에서 멀리 떨어지지 못해 한밤중에 보이지 않아요. 금성(46°)은 해진 뒤 약 3시간이면 져요.</li></ul>',
      missions: [
        {
          title: '최대 이각 찾고 θ 계산하기',
          goal: '금성의 <b>동방</b>과 <b>서방</b> 최대 이각 위치를 찾고, 그 위치에서는 태양-금성-지구가 직각이므로 <b>sinθ = 0.72</b>예요. θ(°)를 구해 <b>📝 기록</b>해요.',
          hint: '버튼 <b>동방 최대</b>·<b>서방 최대</b>를 눌러도 돼요. 최대 이각에서는 금성 위에 직각 표시(90°)가 떠요. sin 45° ≈ 0.71, sin 50° ≈ 0.77이에요.',
          hold: 0.4, setup() { S.fl2 = { east: false, west: false }; S.thOk = false; S.showCalc2 = true; S.showCards2 = false; $('#inTh').value = ''; S.inner = 'venus'; setView('inner'); setBase2(); setU2(0); },
          status: () => '동방 최대 ' + mark(S.fl2.east) + ' · 서방 최대 ' + mark(S.fl2.west) + ' · θ 계산 ' + mark(S.thOk),
          check: () => S.fl2.east && S.fl2.west && S.thOk,
          explain: '최대 이각에서는 지구에서 금성으로 그은 시선이 금성 궤도에 접해서 태양-금성-지구가 직각이에요. 그래서 sinθ = (금성 궤도 반지름 0.72 AU) ÷ (지구 궤도 반지름 1 AU) = 0.72, <b>θ ≈ 46°</b>예요. 수성은 sinθ = 0.39이므로 약 23°예요.',
        },
        {
          title: '위상과 크기 짝짓기', manual: true, goal: '금성의 세 위치에서 지구에서 보이는 <b>모양과 크기</b>를 알맞게 골라요.',
          hint: '내합 부근에서는 가장 가까워 크게 보이지만 지구 쪽은 어두운 면이라 초승달 모양이에요. 외합 부근은 가장 멀어서 작고 둥글게 보여요. 슬라이더로 확인해 봐요.',
          setup() { S.showCalc2 = false; S.showCards2 = true; S.cards2 = []; $$('#cardsRows2 select').forEach((s) => (s.value = '')); S.inner = 'venus'; setView('inner'); updateCtl(); },
          status: () => '고른 것 ' + S.cards2.filter(Boolean).length + ' / 3',
          check: () => {
            if (S.cards2.filter(Boolean).length < 3) return '세 가지 모두 골라 주세요.';
            const bad = CARD2.map((c, i) => (S.cards2[i] === c.a ? null : i)).filter((v) => v != null);
            return bad.length ? (bad.length === 3 ? '모두 다시 생각해 봐요.' : bad.length + '개가 달라요. 슬라이더로 위상과 크기를 다시 확인해 봐요.') : true;
          },
          explain: '내합 부근: 태양빛을 받는 면이 거의 반대편이라 <b>초승달 모양</b>이고 거리 0.28 AU로 <b>가장 크게</b>(약 60″) 보여요. 최대 이각: 태양-금성-지구가 직각이라 <b>반달 모양</b>이에요. 외합 부근: 밝은 면이 지구를 향해 <b>둥글고</b>, 거리 1.72 AU로 <b>가장 작게</b>(약 10″) 보여요.',
        },
        {
          type: 'quiz', title: '금성이 한밤중에 보이지 않는 까닭', goal: '금성은 한밤중에 보이지 않고 저녁이나 새벽에만 보여요. 그 까닭은 무엇일까요?', setup() { S.showCards2 = false; setView('inner'); },
          choices: ['금성의 최대 이각이 약 46°뿐이라 태양에서 멀리 떨어지지 못해서, 해진 뒤 약 3시간 안에 지평선 아래로 지기 때문이에요', '한밤중에는 금성이 지구의 그림자 속에 들어가기 때문이에요', '금성은 스스로 빛을 내지 않아 한밤에는 보이지 않기 때문이에요', '금성은 외행성이라 새벽에만 볼 수 있기 때문이에요'],
          answer: 0,
          feedback: ['', '지구의 그림자는 달에만 영향을 줘요. 금성은 지구 그림자 속으로 들어가지 않아요.', '금성은 태양빛을 반사해서 보여요. 밤에도 위치만 맞으면 볼 수 있어요. 문제는 태양과의 각도예요.', '금성은 지구보다 안쪽을 도는 내행성이에요. 새벽과 저녁 모두 볼 수 있어요.'],
          explain: '금성은 태양에서 최대 약 46° 이상 떨어지지 않아요. 지구는 1시간에 15°씩 자전하므로 46° ÷ 15°/시간 ≈ 3시간 뒤면 금성도 져요. 그래서 금성은 <b>해진 뒤 3시간 안(저녁)</b>이나 <b>해뜨기 3시간 전부터(새벽)</b>에만 보이고 한밤중에는 보이지 않아요.',
        },
      ],
    },
    {
      title: '외행성: 합 · 충 · 구', short: '외행성', icon: '🔴', phase: '탐구', features: ['outer'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 내행성은 태양에서 멀리 떨어지지 못해 이각에 한계가 있다는 것을 알았어요. 지구보다 <b>바깥</b> 궤도를 도는 <b>외행성</b>(화성, 목성, 토성)은 이각이 0°부터 180°까지 모두 가능해요.</div>' +
        '<p>태양 뒤쪽에 있을 때가 <b>합</b>, 태양-지구-행성이 일직선으로 지구가 가운데일 때가 <b>충</b>, 태양-지구-행성이 직각일 때가 <b>구</b>(동구·서구)예요. 충일 때 행성은 한밤중에 남중하고 지구와 가장 가까워요.</p>' +
        '<p>버튼과 슬라이더로 화성의 배치를 바꿔 지구와의 거리, 위상, 남중 시각을 비교해 봐요.</p>',
      setup() { enterLevel(2); },
      recap: '외행성은 합·구·충의 모든 배치가 가능해요. 충일 때 가장 가깝고(화성 약 0.52 AU) 한밤중에 남중해 밤새 볼 수 있어요. 위상은 거의 변하지 않아요. 충은 회합 주기(화성 약 780일)마다 반복돼요.',
      summary: tb([['배치', '태양-지구-행성', '남중 시각', '특징'], ['합', '태양이 가운데', '낮(12시)', '해와 함께 있어 안 보임'], ['동구', '직각, 행성이 동쪽', '약 18시', '저녁에 보임'], ['충', '지구가 가운데 일직선', '자정(24시)', '가장 가깝고 가장 밝음'], ['서구', '직각, 행성이 서쪽', '약 6시', '새벽에 보임']]) + '<ul><li>남중 시각 ≈ 12시 + 이각 ÷ 15° (시간)</li><li>외행성은 위상이 거의 변하지 않아요(지구에서 볼 때 항상 대부분이 밝은 면).</li><li>화성의 충은 약 <b>780일</b>(약 2년 2개월)마다 반복돼요.</li></ul>',
      missions: [
        {
          title: '합·충·구 만들어 보기',
          goal: '화성의 배치를 바꿔서 <b>충</b>, <b>구</b>(동구 또는 서구), <b>합</b>을 하나씩 만들어 봐요.',
          hint: '“충으로부터” 슬라이더가 0일이면 충이에요. 버튼 서구·충·동구·합을 눌러도 돼요.',
          hold: 0.4, setup() { S.fl3 = { opp: false, quad: false, conj: false }; S.showCards3 = false; S.outer = 'mars'; setView('outer'); setBase3(); setU3(-Math.round(S.syn3 / 4)); },
          status: () => '충 ' + mark(S.fl3.opp) + ' · 구 ' + mark(S.fl3.quad) + ' · 합 ' + mark(S.fl3.conj),
          check: () => S.fl3.opp && S.fl3.quad && S.fl3.conj,
          explain: '<b>충</b>은 태양-지구-행성이 일직선이고 지구가 가운데일 때(이각 180°)예요. <b>구</b>는 이각 90°, <b>합</b>은 행성이 태양 뒤에 있어 이각 0°일 때예요. 화성은 충에서 지구와 가장 가까워(약 0.52 AU) 가장 크고 밝게 보여요.',
        },
        {
          title: '합과 충 판별 카드', manual: true, goal: '그림이 나타내는 배치를 <b>합, 충, 동구, 서구</b> 중에서 골라요. (위쪽 = 태양 방향, 왼쪽 = 동쪽)',
          hint: '파란 선이 지구에서 행성으로 가는 시선, 노란 선이 지구에서 태양으로 가는 방향이에요. 두 선의 사이각이 이각이에요.',
          setup() { S.showCards3 = true; S.cards3 = []; $$('#cardsRows3 select').forEach((s) => (s.value = '')); S.outer = 'mars'; setView('outer'); updateCtl(); },
          status: () => '고른 것 ' + S.cards3.filter(Boolean).length + ' / 4',
          check: () => {
            if (S.cards3.filter(Boolean).length < 4) return '네 가지 모두 골라 주세요.';
            const bad = CARD3.map((c, i) => (S.cards3[i] === c.a ? null : i)).filter((v) => v != null);
            return bad.length ? '그림 ' + (bad[0] + 1) + '번이 달라요. 이각이 몇 도인지, 행성이 태양의 어느 쪽인지 다시 봐요.' : true;
          },
          explain: '이각 180°에 지구가 가운데이면 <b>충</b>, 이각 0°에 태양이 가운데이면 <b>합</b>이에요. 이각이 90°일 때는 행성이 태양의 동쪽이면 <b>동구</b>(저녁에 남중), 서쪽이면 <b>서구</b>(새벽에 남중)예요.',
        },
        {
          type: 'quiz', title: '충일 때 화성이 가장 밝고 오래 보이는 까닭', goal: '충일 때 화성은 1년 중 가장 밝고 밤새 볼 수 있어요. 그 까닭은 무엇일까요?', setup() { S.showCards3 = false; setView('outer'); },
          choices: ['지구와 가장 가까워 크게 보이고, 태양의 반대쪽에 있어 한밤중에 남중하므로 밤새 볼 수 있기 때문이에요', '화성이 충일 때 스스로 더 밝게 빛나기 때문이에요', '충일 때 화성이 태양에 가장 가까워지기 때문이에요', '충일 때는 지구의 대기가 가장 맑기 때문이에요'],
          answer: 0,
          feedback: ['', '행성은 스스로 빛나지 않고 태양빛을 반사해요. 밝기가 달라지는 것은 거리 때문이에요.', '충일 때 화성은 태양에서 가장 먼 쪽(지구 바깥쪽)에 있어요. 지구와 가까워지는 거예요.', '대기 상태는 날마다 달라져요. 충이 가장 밝은 것은 배치 때문이에요.'],
          explain: '충에서는 지구가 화성과 태양 사이에 있어 거리가 약 0.52 AU로 가장 가까워요(합일 때는 약 2.5 AU). 또 태양의 반대편이라 <b>한밤중에 남중</b>하여 해질녘에 떠서 새벽에 져요. 외행성은 지구에서 볼 때 늘 밝은 면 대부분이 보여서 위상 변화는 거의 없어요.',
        },
      ],
    },
    {
      title: '역행: 별자리 사이를 거꾸로', short: '역행', icon: '↩', phase: '분석', features: ['retro'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 충 때 화성이 지구와 가장 가깝다는 것을 알았어요. 그런데 충 무렵의 화성은 별자리 사이를 평소와 반대 방향으로 움직이는 것처럼 보여요.</div>' +
        '<p>행성은 평소 별자리 사이를 서쪽에서 동쪽으로 움직여요(<b>순행</b>). 안쪽 궤도의 지구가 바깥 행성을 따라잡아 앞지를 때는 동쪽에서 서쪽으로 움직여 보여요(<b>역행</b>). 순행과 역행이 바뀌는 때는 멈춘 듯 보여서 <b>유(留)</b>라고 해요.</p>' +
        '<p>위에서 본 모형에서 10일마다의 시선을 겹쳐 보고, 아래 <b>하늘 띠</b>에서 별자리 배경 위의 행성 경로를 따라가 봐요. 행성은 실제로 거꾸로 돌지 않아요.</p>',
      setup() { enterLevel(3); },
      recap: '역행은 지구가 바깥 행성을 앞지를 때(충 전후) 시선 방향이 바뀌어서 생기는 겉보기 운동이에요. 내행성은 내합 전후에 역행해요. 충일 때 화성의 겉보기 속도는 약 0.36°/일(뒤로)이에요.',
      summary: '<ul><li>순행(서→동) → <b>유</b> → <b>역행</b>(동→서) → <b>유</b> → 순행. 하늘 띠에서 S자 또는 고리 모양으로 그려져요.</li><li>바깥 행성은 <b>충</b> 전후에, 안쪽 행성은 <b>내합</b> 전후에 역행해요. (행성이 실제로 거꾸로 공전하는 것은 아니에요.)</li><li>충일 때 화성의 역행 속도 = (29.8 − 24.1) km/s ÷ 7.8×10⁷ km ≈ 7.3×10⁻⁸ rad/s ≈ <b>0.36°/일</b>. 순행 때 평균은 약 0.5°/일이에요.</li><li>역행 기간(실제 관측 예시): 수성 약 21일, 금성 약 40일, 화성 약 72일, 목성 약 120일, 토성 약 138일 — 안쪽 행성은 짧고 바깥 행성은 길어요.</li></ul>',
      missions: [
        {
          title: '멈춘 것처럼 보이는 때(유) 찾기',
          goal: '▶ 재생이나 슬라이더로 화성을 따라가며, 점이 <b>순행 → 역행</b>, <b>역행 → 순행</b>으로 방향을 바꾸는 두 때를 <b>📍 표시</b>해요.',
          hint: '5일 간격의 점이 파란색에서 빨간색으로 바뀌는 곳이 첫 번째 유예요. 슬라이더를 천천히 움직이다가 점이 멈춘 듯한 때에 버튼을 눌러요.',
          hold: 0.4, setup() { S.marks = { s: null, e: null }; S.showMark = true; S.showCalc4 = false; S.pl4 = 'mars'; setView('retro'); setBase4(); setU4(-S.E4.W); updateCtl(); },
          status: () => '순행→역행 ' + mark(S.marks.s != null) + ' · 역행→순행 ' + mark(S.marks.e != null) + (S.marks.s != null && S.marks.e != null ? ' · 충은 두 때 사이 ✅' : ''),
          check: () => S.marks.s != null && S.marks.e != null,
          explain: '두 번의 <b>유</b> 사이가 역행 기간이에요(이 모형에서 화성은 약 73일). 충은 그 한가운데에 있어요. 충 무렵에 지구가 화성을 앞질러 지나가면서 시선 방향이 거꾸로 바뀌어 보이기 때문이에요.',
        },
        {
          title: '충일 때 화성의 역행 속도', goal: '지구 공전 속력 <b>29.8 km/s</b>, 화성 <b>24.1 km/s</b>, 충일 때 거리 <b>0.52 AU ≈ 7.8×10⁷ km</b>예요. 겉보기 역행 속도를 <b>°/일</b>로 구해 📝 기록해요.',
          hint: '상대 속력 = 29.8 − 24.1 km/s. 각속도(rad/s) = 상대 속력 ÷ 거리. 하루는 86400초, 1 rad ≈ 57.3°예요.',
          hold: 0.3, setup() { S.retroOk = false; S.showMark = false; S.showCalc4 = true; $('#inRetro').value = ''; S.pl4 = 'mars'; setView('retro'); setBase4(); updateCtl(); },
          status: () => '역행 속도 기록 ' + mark(S.retroOk),
          check: () => S.retroOk,
          explain: '(29.8 − 24.1) km/s ÷ 7.8×10⁷ km ≈ 7.3×10⁻⁸ rad/s ≈ 6.3×10⁻³ rad/일 ≈ <b>0.36°/일</b>이에요. 순행 때 평균 약 0.5°/일과는 반대 방향이에요.',
        },
        {
          type: 'quiz', title: '역행의 의미', goal: '화성이 역행하는 것처럼 보이는 까닭으로 알맞은 것을 골라요.', setup() { S.showMark = false; S.showCalc4 = false; setView('retro'); },
          choices: ['지구가 화성을 앞질러 지날 때 시선 방향이 바뀌어 그렇게 보일 뿐, 화성이 실제로 거꾸로 공전하는 것은 아니에요. 금성도 내합 전후에 역행하는 때가 있어요', '화성이 충 무렵에 실제로 공전 방향을 바꾸기 때문이에요', '지구의 자전 때문에 화성이 거꾸로 도는 것처럼 보여요', '화성이 지구의 중력에 끌려 되돌아오기 때문이에요'],
          answer: 0,
          feedback: ['', '행성은 늘 같은 방향(서→동)으로 공전해요. 달라지는 것은 지구에서 바라보는 방향이에요.', '자전은 모든 천체를 하루에 한 바퀴 돌아 보이게 할 뿐이에요. 별자리 사이에서 며칠에 걸쳐 일어나는 움직임과는 달라요.', '행성 사이의 중력은 이 현상에 영향을 주지 않아요. 지구가 안쪽 궤도에서 더 빨리 움직이는 것이 핵심이에요.'],
          explain: '달리는 자동차에서 느린 차를 추월하면 그 차가 먼 풍경에 대해 뒤로 물러나 보이는 것과 같아요. <b>빠르게 공전하는 안쪽 천체가 느린 바깥 천체를 앞지를 때</b> 겉보기 방향이 바뀌어요. 바깥 행성은 충 전후, 안쪽 행성(수성·금성)은 지구를 앞지르는 내합 전후에 역행해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-planet-motion', mount: '#game', badge: '행성 탐험가', homeHref: '../../index.html#he',
    featureLabels: { orbit: '🪐 공전 모형 · 시간 속도', inner: '🌕 내행성: 이각 · 위상 · 하늘 장면', outer: '🔴 외행성: 합 · 충 · 구 · 남중 시계', retro: '↩ 하늘 띠 · 시선 · 역행 비유' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    const v = S.view;
    if (v === 'orbit') {
      if (S.playing && SPEEDS[S.spIdx] > 0) S.t += SPEEDS[S.spIdx] * dt;
      S.tOrb = S.t;
      S.dprev = S.dprev || {};
      ['mercury', 'venus', 'mars', 'jupiter', 'saturn'].forEach((id) => {
        const d = delta(id, S.t), pv = S.dprev[id];
        if (pv != null && d < pv - 180 && S.t > (S.tprev || 0)) { const tAl = S.t - d / (360 / synodicD(id)), a = S.align[id] || {}; if (a.last != null) a.S = tAl - a.last; a.last = tAl; S.align[id] = a; }
        S.dprev[id] = d;
      });
      S.tprev = S.t;
    } else if (v === 'inner') {
      if (S.base2 == null) setBase2();
      if (S.playing) { S.u2 += (S.syn2 / 16) * dt; if (S.u2 >= S.syn2) { S.u2 = S.syn2; S.playing = false; updateCtl(); } setU2(S.u2); }
      S.t = S.base2 + S.u2;
      if (S.inner === 'venus') { const e = elongOf('venus', S.t); if (e >= 45.2) S.fl2.east = true; if (e <= -45.2) S.fl2.west = true; }
    } else if (v === 'outer') {
      if (S.oppT == null) setBase3();
      if (S.playing) { S.u3 += (S.syn3 / 16) * dt; if (S.u3 >= Math.round(S.syn3 / 2)) { S.u3 = Math.round(S.syn3 / 2); S.playing = false; updateCtl(); } setU3(S.u3); }
      S.t = S.oppT + S.u3;
      if (S.outer === 'mars') { const e = Math.abs(elongOf('mars', S.t)); if (e >= 176) S.fl3.opp = true; if (Math.abs(e - 90) <= 4) S.fl3.quad = true; if (e <= 6) S.fl3.conj = true; }
    } else {
      if (!S.E4) setBase4();
      if (S.playing) { S.u4 += (S.E4.W / 6) * dt; if (S.u4 >= S.E4.W) { S.u4 = S.E4.W; S.playing = false; updateCtl(); } setU4(S.u4); }
      S.t = S.E4.tc + S.u4;
    }
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (v === 'orbit') drawOrbit(t, dt); else if (v === 'inner') drawInner(t, dt); else if (v === 'outer') drawOuter(t, dt); else drawRetro(t, dt);
    parts.update(dt); parts.draw(ctx);
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  function readouts() {
    const v = S.view;
    if (v === 'orbit') {
      const p = PL[S.sel], al = S.align[S.sel];
      setReadouts(['모형 날짜', f0(S.t) + '일 (' + f1(S.t / YR) + '년)', '선택한 행성', p.name + ' · P ' + p.Pd + '년', '각속도 / 측정한 S', p.w + '°/일 · ' + (al && al.S != null ? f0(al.S) + '일' : '—')]);
    } else if (v === 'inner') {
      const id = S.inner, e = elongOf(id, S.t), g = geo(id, S.t), al = phaseAngle(id, S.t);
      setReadouts(['이각', eLabel(e), '밝은 부분', f0(illum(al) * 100) + ' %', '겉보기 지름', f0(angDiaArcsec(id, g.dist)) + '″']);
    } else if (v === 'outer') {
      const id = S.outer, e = elongOf(id, S.t), g = geo(id, S.t);
      setReadouts(['이각', eLabel(e), '지구와의 거리', f2(g.dist) + ' AU', '남중 시각', hrStr(12 + e / 15)]);
    } else {
      const id = S.pl4, dl = dlam(id, S.t), showNum = S.retroOk || (game && game.free);
      const ph = Math.abs(dl) < 0.03 ? '멈춘 듯(유)' : dl < 0 ? '역행(동→서)' : '순행(서→동)';
      setReadouts(['지금 움직임', ph, '겉보기 속도', showNum ? (dl > 0 ? '+' : '−') + f2(Math.abs(dl)) + '°/일' : (dl < 0 ? '뒤로' : '앞으로'), '시기', (S.u4 > 0 ? '+' : S.u4 < 0 ? '−' : '') + Math.abs(Math.round(S.u4)) + '일 (' + (PL[id].inner ? '내합' : '충') + ' 기준)']);
    }
  }

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, PL, get game() { return game; }, helio, geo, elongOf, phaseAngle, dlam, delta, findEvent, retroInfo, synodicD, ev4, bandData,
    setView, enterLevel, setBase2, setBase3, setBase4, setU2, setU3, setU4, updateCtl, markStat, stopAll,
  };
})();
