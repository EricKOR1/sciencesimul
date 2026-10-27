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
     지구과학 Ⅲ. 태양계 천체와 별과 우주의 진화 - 일식과 월식
     [12지구03-01] 태양-지구-달 시스템에서의 식 현상을 이해하고 ...
     ① 모형: 달 궤도의 기울기와 교점     ② 탐구: 지구-달 거리와 일식의 종류
     ③ 분석: 달 그림자의 이동과 개기 식 지속 시간     ④ 모형: 월식의 종류
     모형 날짜는 가상의 날짜예요(시작 시점은 임의). 천구 좌표계는 쓰지 않고, 길이 단위는 km로 계산해요.
     ========================================================= */
  const KM = { Rs: 696000, Re: 6371, Rm: 1737.4, a: 384400, dS: 149.6e6 };
  const EP = { L0: 0, Om0: 15, D0: 130, A0: 160, perih: 287 };
  const M_SUN = 0.985647, M_MOON = 13.176396, M_NODE = -0.052954, M_ANOM = 13.064993, M_SYN = 12.190749;
  const DAYMAX = 400;
  const sunLon = (d) => EP.L0 + M_SUN * d;
  const moonLon = (d) => EP.L0 + EP.D0 + M_MOON * d;
  const nodeLon = (d) => EP.Om0 + M_NODE * d;
  const dSun = (d) => KM.dS * (1 - 0.0167 * Math.cos(TAU * (d - EP.perih) / 365.25));
  const rMoon = (d) => KM.a * (1 - 0.0549 * Math.cos((EP.A0 + M_ANOM * d) * DEG));
  const elong = (d) => EP.D0 + M_SYN * d;                 // 달-태양 이각(도, 펼친 값)
  const betaOf = (d, i) => Math.asin(Math.sin(i * DEG) * Math.sin((moonLon(d) - nodeLon(d)) * DEG)) / DEG; // 황위(도)
  /* 일식: 달 그림자 원뿔 */
  function luOf(r, dS) { return KM.Rm * (dS - r) / (KM.Rs - KM.Rm); }               // 본영 길이(달 중심에서 끝까지)
  function penOf(r, dS, d) { return KM.Rm + d * (KM.Rs + KM.Rm) / (dS - r); }        // 달에서 d만큼 떨어진 곳의 반영 반지름
  function pathType(r, dS) { const Lu = luOf(r, dS); return r < Lu ? '개기' : r < Lu + KM.Re ? '혼성' : '금환'; }
  function solarType(r, dS, X) {
    const pen = penOf(r, dS, r);
    if (X >= KM.Re + pen) return '없음';
    if (X >= KM.Re) return '부분';
    return pathType(r, dS);
  }
  /* 월식: 지구 그림자(달 거리에서) */
  const umbraR = (r, dS) => KM.Re - r * (KM.Rs - KM.Re) / dS;
  const penumbraR = (r, dS) => KM.Re + r * (KM.Rs + KM.Re) / dS;
  function lunarType(r, dS, X) {
    const rU = umbraR(r, dS), rP = penumbraR(r, dS);
    if (X + KM.Rm <= rU) return '개기';
    if (X - KM.Rm < rU) return '부분';
    if (X - KM.Rm < rP) return '반영';
    return '없음';
  }
  /* 삭·망 목록 (현재 궤도 기울기에서) */
  function syzygies(tilt) {
    const out = [];
    for (let n = 1; n < 60; n++) {
      const d = (180 * n - EP.D0) / M_SYN;
      if (d < 0) continue; if (d > DAYMAX) break;
      const new_ = n % 2 === 0, r = rMoon(d), dS = dSun(d), X = r * Math.sin(Math.abs(betaOf(d, tilt)) * DEG);
      out.push({ d, n, kind: new_ ? 'new' : 'full', type: new_ ? solarType(r, dS, X) : lunarType(r, dS, X), r, X, beta: betaOf(d, tilt) });
    }
    return out;
  }
  function phaseName(Dw) { // Dw: 0~360
    const a = Dw;
    if (a < 6 || a > 354) return '삭(신월)';
    if (a < 84) return '초승달 쪽'; if (a <= 96) return '상현';
    if (a < 174) return '보름 전'; if (a <= 186) return '망(보름)';
    if (a < 264) return '보름 후'; if (a <= 276) return '하현';
    return '그믐달 쪽';
  }
  const norm360 = (a) => ((a % 360) + 360) % 360;
  const ECL_COLOR = { '개기': '#f97316', '금환': '#f59e0b', '혼성': '#a855f7', '부분': '#0ea5e9', '반영': '#64748b' };
  const stem = (t, kind) => (kind === 'new' ? t + ' 일식' : t === '반영' ? '반영식' : t + ' 월식');


  /* ---------- 상태 ---------- */
  const S = {
    view: 'orbit', clock: 0,
    // ① 궤도 모형
    day: 8, tilt: 5.1, tiltV: 5.1, az: 0.2, el: 0.5, playing: false, jumpT: null, dragCam: null,
    fl1: { noEcl: false, ecl: false, tilt0: false },
    // ② 그림자 원뿔
    coneR: 384400, eY: 0, eYv: 0, sweep: false, sweepDir: 1, fl2: { total: false, annular: false, hybrid: false }, cards: [], showCards: false,
    // ③ 그림자 궤적 (지구를 태양 쪽에서 본 모습)
    t: -9000, play3: false, site: 'A', custom: null, fl3: { total: false, partial: false, none: false }, calcOk: false, showCalc: false, drag3: false,
    // ④ 월식
    path: 'mid', lp: -1, play4: false, fl4: { 개기: false, 부분: false, 반영: false }, tab: [], showTab: false, lunDragT: false,
  };
  let game = null;
  const clickable = (el, fn) => el.addEventListener('click', () => { Sound.click(); fn(el); });
  const hasF = (n) => (game ? game.has(n) : true);

  /* 레이아웃 (가상 좌표) */
  function lay() {
    if (PHONE) return {
      cx: 260, cy: 222, rho: 124, skyX: 12, skyY: 440, skyW: VW - 24, skyH: 212, tlX: 14, tlY: 676, tlW: VW - 28, tlH: 74,
      sunScale: 1.85,
    };
    return { cx: 300, cy: 252, rho: 160, skyX: VW - 258, skyY: 40, skyW: 246, skyH: 228, tlX: 18, tlY: 488, tlW: VW - 36, tlH: 58, sunScale: 1.75 };
  }

  /* ======================================================
     ① 3차원 궤도 모형
     ====================================================== */
  let SYZ = syzygies(S.tilt);
  function nearSyz(d) {
    const e = elong(d), n = Math.round(e / 180);
    const ds = (180 * n - EP.D0) / M_SYN;
    const hit = SYZ.find((s) => s.n === n);
    return { n, ds, dd: d - ds, s: hit || null, kind: n % 2 === 0 ? 'new' : 'full' };
  }
  function proj3(x, y, z, L) {
    const ca = Math.cos(S.az), sa = Math.sin(S.az), ce = Math.cos(S.el), se = Math.sin(S.el);
    const x1 = x * ca - y * sa, y1 = x * sa + y * ca;
    return { X: L.cx + x1 * L.rho, Y: L.cy + (y1 * se - z * ce) * L.rho, dep: y1 * ce + z * se, sx: x1, sy: y1 * se - z * ce };
  }
  function moonVec(day, i) {
    const Om = nodeLon(day) * DEG, dl = (moonLon(day) - nodeLon(day)) * DEG;
    const u = Math.atan2(Math.sin(dl), Math.cos(dl) * Math.cos(i));
    return orbitPt(u, Om, i);
  }
  function orbitPt(u, Om, i) {
    return [Math.cos(Om) * Math.cos(u) - Math.sin(Om) * Math.cos(i) * Math.sin(u), Math.sin(Om) * Math.cos(u) + Math.cos(Om) * Math.cos(i) * Math.sin(u), Math.sin(i) * Math.sin(u)];
  }
  const seasonOn = (d) => {
    const i = S.tiltV; if (i < 0.05) return true;
    const xi = (sunLon(d) - nodeLon(d)) * DEG;
    const lim = Math.sin(Math.asin((KM.Re + penOf(KM.a, KM.dS, KM.a)) / KM.a)) / Math.sin(i * DEG);
    return Math.abs(Math.sin(xi)) < lim;
  };

  function drawOrbit(t, dt) {
    const L = lay(), day = S.day, i = S.tiltV * DEG;
    drawSpaceBg(t);
    const sLon = sunLon(day) * DEG, Om = nodeLon(day) * DEG;
    // 황도면
    const ring = (rad, n) => { const pts = []; for (let k = 0; k <= n; k++) { const a = (k / n) * TAU; const p = proj3(rad * Math.cos(a), rad * Math.sin(a), 0, L); pts.push([p.X, p.Y]); } return pts; };
    const plane = ring(1.5, 90);
    ctx.save();
    const gp = ctx.createRadialGradient(L.cx, L.cy, 4, L.cx, L.cy, L.rho * 1.6);
    gp.addColorStop(0, 'rgba(96,165,250,.28)'); gp.addColorStop(1, 'rgba(59,130,246,.10)');
    ctx.fillStyle = gp; ctx.beginPath(); plane.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
    ctx.restore();
    line(plane, 'rgba(147,197,253,.75)', 2);
    line(ring(1.0, 72), 'rgba(147,197,253,.22)', 1.2, { dash: [4, 5] });
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU, p0 = proj3(0, 0, 0, L), p1 = proj3(1.5 * Math.cos(a), 1.5 * Math.sin(a), 0, L); line([[p0.X, p0.Y], [p1.X, p1.Y]], 'rgba(147,197,253,.12)', 1); }
    const fr = proj3(1.5 * Math.sin(S.az), 1.5 * Math.cos(S.az), 0, L);
    D.text(clamp(fr.X, 80, VW - 80), Math.min(fr.Y + 20 * FS, L.tlY - 10), '황도면(지구 공전 궤도면)', { size: 13, weight: 800, color: '#bfdbfe', stroke: 'rgba(11,18,48,.8)' });
    // 교점선
    const n1 = proj3(1.28 * Math.cos(Om), 1.28 * Math.sin(Om), 0, L), n2 = proj3(-1.28 * Math.cos(Om), -1.28 * Math.sin(Om), 0, L), o0 = proj3(0, 0, 0, L);
    line([[n1.X, n1.Y], [n2.X, n2.Y]], 'rgba(250,204,21,.55)', 1.6, { dash: [7, 5] });
    // 달 궤도
    const N = 120, opts = [];
    for (let k = 0; k <= N; k++) { const u = (k / N) * TAU, v = orbitPt(u, Om, i), p = proj3(v[0], v[1], v[2], L); opts.push({ X: p.X, Y: p.Y, dep: p.dep, z: v[2], up: Math.sin(u) >= 0 }); }
    const drawArc = (front) => {
      for (let k = 0; k < N; k++) {
        const a = opts[k], b = opts[k + 1]; if (((a.dep + b.dep) / 2 >= 0) !== front) continue;
        const up = a.up && b.up;
        ctx.save(); ctx.strokeStyle = up ? 'rgba(248,250,252,.95)' : 'rgba(148,163,184,.65)'; ctx.lineWidth = up ? 2.6 : 2; if (!up) ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(a.X, a.Y); ctx.lineTo(b.X, b.Y); ctx.stroke(); ctx.restore();
      }
    };
    // 천체 위치
    const sp = proj3(L.sunScale * Math.cos(sLon), L.sunScale * Math.sin(sLon), 0, L);
    const mv = moonVec(day, i), mp = proj3(mv[0], mv[1], mv[2], L), mfoot = proj3(mv[0], mv[1], 0, L);
    const sunDir = proj3(Math.cos(sLon), Math.sin(sLon), 0, L);
    const earthR = (PHONE ? 15 : 22), moonR = (PHONE ? 8.5 : 11.5), sunR = PHONE ? 20 : 26;
    const drawSun = () => {
      D.glow(sp.X, sp.Y, sunR * 2.8, '#ffb400', 0.5);
      D.sphere(sp.X, sp.Y, sunR, '#ffd23f', { light: '#fff6c2', dark: '#f59e0b', gloss: false });
      D.text(sp.X, sp.Y + sunR + 17, '태양', { size: 14, weight: 800, color: '#fde68a', stroke: 'rgba(11,18,48,.8)' });
    };
    // 해-지구 선 (태양 방향 / 지구 그림자 방향)
    const ant = proj3(-1.45 * Math.cos(sLon), -1.45 * Math.sin(sLon), 0, L);
    const slAlpha = 0.9;
    line([[sp.X, sp.Y], [o0.X, o0.Y]], 'rgba(253,224,71,' + slAlpha + ')', 2, { dash: [9, 6] });
    line([[o0.X, o0.Y], [ant.X, ant.Y]], 'rgba(148,163,184,.8)', 2, { dash: [3, 6] });
    { const left = ant.X < L.cx; D.text(clamp(ant.X + (left ? -10 : 10), 12, VW - 12), clamp(ant.Y + 22, 20, L.tlY - 14), '지구 그림자 쪽', { size: 13, weight: 800, color: '#cbd5e1', stroke: 'rgba(11,18,48,.8)', align: left ? 'right' : 'left' }); }
    drawArc(false);
    if (sp.dep < 0) drawSun();
    const near = nearSyz(day), atSyz = Math.abs(near.dd) <= 0.11 && near.s;
    const drawMoon = () => {
      // 황도면까지의 높이 선
      line([[mp.X, mp.Y], [mfoot.X, mfoot.Y]], mv[2] >= 0 ? 'rgba(125,211,252,.9)' : 'rgba(251,191,36,.9)', 1.8, { dash: [3, 3] });
      ctx.save(); ctx.fillStyle = 'rgba(125,211,252,.35)'; ctx.beginPath(); ctx.ellipse(mfoot.X, mfoot.Y, 7, 3.2, 0, 0, TAU); ctx.fill(); ctx.restore();
      if (atSyz && near.s.type !== '없음') {
        const c = ECL_COLOR[near.s.type];
        D.glow(mp.X, mp.Y, moonR * 4.2, c, 0.55);
        D.ring(mp.X, mp.Y, moonR * 1.7, t, { color: c, speed: 1.3, width: 3 });
      }
      // 달 (해 방향에 따라 밝은 면)
      const sd = [Math.cos(sLon) - mv[0] * 0, Math.sin(sLon), 0];
      const sdp = proj3(sd[0], sd[1], sd[2], L), o = proj3(0, 0, 0, L);
      litSphere(mp.X, mp.Y, moonR, sdp.X - o.X, sdp.Y - o.Y, sdp.dep, '#2f3856', '#f1ecd9');
    };
    if (mp.dep < 0) drawMoon();
    // 지구
    D.glow(o0.X, o0.Y, earthR * 2.2, '#60a5fa', 0.35);
    D.sphere(o0.X, o0.Y, earthR, '#2f7de1', { light: '#8ec5ff', dark: '#173f86', shadow: true });
    ctx.save(); ctx.beginPath(); ctx.arc(o0.X, o0.Y, earthR - 1, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(74,184,108,.85)'; ctx.beginPath(); ctx.ellipse(o0.X - earthR * 0.3, o0.Y - earthR * 0.15, earthR * 0.4, earthR * 0.3, 0.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(o0.X + earthR * 0.4, o0.Y + earthR * 0.35, earthR * 0.25, earthR * 0.2, -0.4, 0, TAU); ctx.fill(); ctx.restore();
    D.text(o0.X, o0.Y + earthR + 17, '지구', { size: 14, weight: 800, color: '#bfdbfe', stroke: 'rgba(11,18,48,.8)' });
    drawArc(true);
    // 교점 표시
    const nodes = [[Om, '승교점'], [Om + Math.PI, '강교점']];
    nodes.forEach(([a, nm], k) => {
      const p = proj3(Math.cos(a), Math.sin(a), 0, L);
      ctx.save(); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(p.X, p.Y, 5.5, 0, TAU); ctx.fill(); ctx.restore();
      if (hasF('nodes')) D.ring(p.X, p.Y, 9, t + k * 0.5, { color: '#facc15', speed: 0.8, width: 2 });
      if (hasF('nodes')) D.text(p.X, p.Y - 12, nm, { size: 13, weight: 800, color: '#fde047', stroke: 'rgba(11,18,48,.85)' });
    });
    if (mp.dep >= 0) drawMoon();
    if (sp.dep >= 0) drawSun();
    // 달 이름표와 높이
    const hKm = KM.a * Math.sin(betaOf(day, S.tiltV) * DEG);
    D.label(mp.X + (PHONE ? 22 : 26), mp.Y - 14, '달', { bg: 'rgba(15,23,42,.8)', size: 13, pad: 7 });
    if (hasF('nodes')) {
      const hs = (hKm >= 0 ? '황도면 위 ' : '황도면 아래 ') + comma(Math.abs(hKm)) + ' km';
      D.text(clamp(mfoot.X, 70, VW - 70), mfoot.Y + (mv[2] >= 0 ? 18 : -10), Math.abs(hKm) < 5 ? '황도면 위' : hs, { size: 12.5, weight: 800, color: mv[2] >= 0 ? '#7dd3fc' : '#fcd34d', stroke: 'rgba(11,18,48,.85)' });
    }
    // 식 계절 배지
    if (hasF('nodes') && seasonOn(day)) {
      D.label(L.cx, 22, '☀ 태양이 교점 쪽에 있어요: 식이 일어날 수 있는 시기', { bg: 'rgba(250,204,21,.92)', color: '#422006', size: PHONE ? 13 : 14, pad: 11 });
    }
    // 판정 말풍선 (삭·망 때)
    if (atSyz) {
      const s = near.s, txt = (near.kind === 'new' ? '삭' : '망') + ' · ' + (s.type === '없음' ? (near.kind === 'new' ? '일식 없음' : '월식 없음') : stem(s.type, near.kind));
      D.label(clamp(mp.X, 90, VW - 90), clamp(mp.Y - 52, 44, L.tlY - 30), txt, { bg: s.type === '없음' ? 'rgba(71,85,105,.95)' : ECL_COLOR[s.type], size: 14, pad: 11 });
    }
    drawSky(L, t);
    drawTimeline(L, t);
  }

  /* 지구에서 본 하늘 (삭이면 태양과 달, 망이면 지구 그림자와 달) */
  function drawSky(L, t) {
    const x = L.skyX, y = L.skyY, w = L.skyW, h = L.skyH, day = S.day;
    const Dw = wrap360(elong(day)), solar = Math.abs(Dw) < 90;
    const r = rMoon(day), dS = dSun(day), beta = betaOf(day, S.tiltV);
    const e = solar ? Dw : wrap360(Dw - 180);        // 동쪽으로 벗어난 각(도)
    panel(x, y, w, h, { fill: 'rgba(8,15,40,.82)', line: 'rgba(148,163,184,.5)', title: solar ? '지구에서 본 태양과 달' : '태양 반대쪽 하늘: 지구 그림자와 달', tcolor: '#e2e8f0', tsize: PHONE ? 13 : 13 });
    const avail = h - 26 - 56, cx = x + w / 2, cy = y + 26 + avail / 2;
    const sc = Math.min((w / 2 - 14) / 2.6, avail / 2 / 1.62);
    const am = Math.asin(KM.Rm / r) / DEG;                // 달의 각반지름
    ctx.save(); ctx.beginPath(); rr(x + 2, y + 28, w - 4, avail, 8).clip();
    let rin, rout;
    if (solar) {
      const as = Math.asin(KM.Rs / dS) / DEG;
      rout = (KM.Re + penOf(r, dS, r)) / r / DEG * 1;  // 도 단위
      rout = Math.asin(Math.min(1, (KM.Re + penOf(r, dS, r)) / r)) / DEG; rin = Math.asin(KM.Re / r) / DEG;
      D.glow(cx, cy, as * sc * 4, '#ffb400', 0.5);
      D.sphere(cx, cy, as * sc, '#ffd23f', { light: '#fff6c2', dark: '#f59e0b', gloss: false });
      ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(250,204,21,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, rout * sc, 0, TAU); ctx.stroke();
      ctx.setLineDash([]); ctx.strokeStyle = 'rgba(248,113,113,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, rin * sc, 0, TAU); ctx.stroke();
    } else {
      const ru = Math.asin(umbraR(r, dS) / r) / DEG, rp = Math.asin(penumbraR(r, dS) / r) / DEG; rin = ru; rout = rp;
      ctx.fillStyle = 'rgba(100,116,139,.35)'; ctx.beginPath(); ctx.arc(cx, cy, rp * sc, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(15,23,42,.85)'; ctx.beginPath(); ctx.arc(cx, cy, ru * sc, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(203,213,225,.85)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(cx, cy, rp * sc, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(248,113,113,.9)'; ctx.beginPath(); ctx.arc(cx, cy, ru * sc, 0, TAU); ctx.stroke();
    }
    // 달 (동쪽 = 왼쪽)
    let mx = cx - e * sc, my = cy - beta * sc;
    const lim = w / 2 - 20, limY = avail / 2 - 4; let off = false;
    const dx = mx - cx, dy = my - cy;
    if (Math.abs(dx) > lim || Math.abs(dy) > limY) { off = true; const k = Math.min(lim / Math.max(1e-6, Math.abs(dx)), limY / Math.max(1e-6, Math.abs(dy)), 1); mx = cx + dx * k; my = cy + dy * k; }
    if (!off) {
      D.sphere(mx, my, Math.max(am * sc, 5), '#d9d4c0', { light: '#f4f0e0', dark: '#7c7a6e', gloss: false });
      if (!solar) {
        ctx.save(); ctx.beginPath(); ctx.arc(mx, my, Math.max(am * sc, 5), 0, TAU); ctx.clip();
        ctx.fillStyle = 'rgba(15,23,42,.38)'; ctx.beginPath(); ctx.arc(cx, cy, rout * sc, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(150,40,20,.62)'; ctx.beginPath(); ctx.arc(cx, cy, rin * sc, 0, TAU); ctx.fill(); ctx.restore();
      }
    } else {
      ctx.save(); ctx.translate(mx, my); ctx.rotate(Math.atan2(dy, dx)); ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.restore();
    D.text(x + 10, y + h - 41, solar ? '노란 점선 안: 일식 가능' : '점선 안: 월식 가능', { size: 12.5, weight: 700, color: '#cbd5e1', align: 'left' });
    D.text(x + 10, y + h - 25, solar ? '빨간 원 안: 개기·금환 가능' : '빨간 원 안: 본영(개기·부분)', { size: 12.5, weight: 700, color: '#fca5a5', align: 'left' });
    D.text(x + 10, y + h - 9, '왼쪽 = 동쪽', { size: 12.5, weight: 700, color: '#cbd5e1', align: 'left' });
    if (off) D.text(x + w - 10, y + h - 9, '달은 ' + f1(Math.hypot(e, beta)) + '° 떨어져 있어요', { size: 12.5, weight: 800, color: '#fca5a5', align: 'right' });
  }

  /* 날짜 줄: 삭·망 표시 (눌러서 이동) */
  function tlX(L, d) { return L.tlX + 40 + (d / DAYMAX) * (L.tlW - 56); }
  function drawTimeline(L, t) {
    const x = L.tlX, y = L.tlY, w = L.tlW, h = L.tlH;
    panel(x, y, w, h, { fill: 'rgba(8,15,40,.82)', line: 'rgba(148,163,184,.4)', r: 12 });
    // 식 계절 띠
    ctx.save(); ctx.fillStyle = 'rgba(250,204,21,.18)';
    let on = false, st = 0;
    for (let d = 0; d <= DAYMAX + 0.5; d += 1) { const o = d <= DAYMAX && seasonOn(d); if (o && !on) { on = true; st = d; } if ((!o || d >= DAYMAX) && on) { on = false; ctx.fillRect(tlX(L, st), y + 4, tlX(L, Math.min(d, DAYMAX)) - tlX(L, st), h - 8); } }
    ctx.restore();
    const rowN = y + h * 0.3, rowF = y + h * 0.72;
    D.text(x + 10, rowN + 5, '삭', { size: 12.5, weight: 800, color: '#94a3b8', align: 'left' });
    D.text(x + 10, rowF + 5, '망', { size: 12.5, weight: 800, color: '#94a3b8', align: 'left' });
    line([[x + 28, rowN], [x + w - 8, rowN]], 'rgba(148,163,184,.25)', 1);
    line([[x + 28, rowF], [x + w - 8, rowF]], 'rgba(148,163,184,.25)', 1);
    SYZ.forEach((s) => {
      const px = tlX(L, s.d), py = s.kind === 'new' ? rowN : rowF, hit = s.type !== '없음';
      if (hit) {
        const c = ECL_COLOR[s.type];
        ctx.save(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px, py, 9.5, 0, TAU); ctx.fill(); ctx.restore();
        D.text(px, py + 5, s.type === '반영' ? '반' : s.type[0], { size: 13, weight: 800, color: '#fff' });
      } else {
        ctx.save(); ctx.strokeStyle = s.kind === 'new' ? '#64748b' : '#cbd5e1'; ctx.lineWidth = 2; ctx.fillStyle = s.kind === 'new' ? '#0f172a' : 'rgba(241,245,249,.9)';
        ctx.beginPath(); ctx.arc(px, py, 5.5, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      }
    });
    const cxp = tlX(L, clamp(S.day, 0, DAYMAX));
    line([[cxp, y + 3], [cxp, y + h - 3]], '#38bdf8', 2.4);
    ctx.save(); ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(cxp, y + 3); ctx.lineTo(cxp - 6, y - 4); ctx.lineTo(cxp + 6, y - 4); ctx.closePath(); ctx.fill(); ctx.restore();
    D.text(x + w - 8, y - 8, '점을 누르면 그 날로 가요', { size: 12.5, weight: 700, color: '#94a3b8', align: 'right' });
    D.text(x + 6, y - 8, PHONE ? '개기·금환·혼성·부분 / 반=반영식' : '개 개기 · 금 금환 · 혼 혼성 · 부 부분 · 반 반영식 (월식)', { size: 12.5, weight: 700, color: '#94a3b8', align: 'left' });
  }

  /* ======================================================
     ② 달 그림자 원뿔과 일식의 종류
     ====================================================== */
  const DIST_MIN = 363000, DIST_MAX = 406000;
  function localType(r, eY) {          // 지구 중심이 축에서 eY(km) 벗어났을 때, 축이 지표와 만나는 곳의 일식 종류
    const dS = KM.dS, Lu = luOf(r, dS), pen = penOf(r, dS, r), a = Math.abs(eY);
    if (a >= KM.Re + pen) return { type: '없음', dHit: r, Lu, gap: 0 };
    if (a >= KM.Re) return { type: '부분', dHit: r, Lu, gap: 0 };
    const dHit = r - Math.sqrt(KM.Re * KM.Re - a * a);
    return { type: dHit < Lu ? '개기' : '금환', dHit, Lu, gap: dHit - Lu };
  }
  function drawCone(t, dt) {
    const ph = PHONE, DH = ph ? 318 : 338;
    ctx.fillStyle = '#e8eff8'; ctx.fillRect(0, 0, VW, VH);
    const x0 = ph ? 56 : 92, yc = ph ? 176 : 176, kx = (VW - 70 - x0 - (ph ? 30 : 36)) / DIST_MAX, ky = 0.0088;
    const r = S.coneRv, dS = KM.dS, dSM = dS - r, Lu = luOf(r, dS), kp = (KM.Rs + KM.Rm) / dSM;
    const xEnd = VW - 16, eYpx = S.eYv * ky;
    // 햇빛 판
    D.shadow(() => { const g = ctx.createLinearGradient(0, 0, VW, 0); g.addColorStop(0, '#fff3c4'); g.addColorStop(1, '#fffaf0'); ctx.fillStyle = g; rr(8, 8, VW - 16, DH - 16, 16).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(8, 8, VW - 16, DH - 16, 16).clip();
    ctx.strokeStyle = 'rgba(245,158,11,.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -(t * 50) % 18;
    for (let y = 26; y < DH - 14; y += 20) { ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(VW - 14, y); ctx.stroke(); }
    ctx.setLineDash([]);
    // 반영
    const pen = (x) => ky * (KM.Rm + ((x - x0) / kx) * kp);
    ctx.fillStyle = 'rgba(71,85,105,.30)'; ctx.beginPath(); ctx.moveTo(x0, yc - ky * KM.Rm); ctx.lineTo(xEnd, yc - pen(xEnd)); ctx.lineTo(xEnd, yc + pen(xEnd)); ctx.lineTo(x0, yc + ky * KM.Rm); ctx.closePath(); ctx.fill();
    // 본영
    const xTip = x0 + Lu * kx;
    ctx.fillStyle = 'rgba(15,23,42,.72)'; ctx.beginPath(); ctx.moveTo(x0, yc - ky * KM.Rm); ctx.lineTo(xTip, yc); ctx.lineTo(x0, yc + ky * KM.Rm); ctx.closePath(); ctx.fill();
    // 본영의 연장
    const anti = (x) => ky * KM.Rm * (((x - x0) / kx) / Lu - 1);
    ctx.fillStyle = 'rgba(100,116,139,.20)'; ctx.beginPath(); ctx.moveTo(xTip, yc); ctx.lineTo(xEnd, yc - anti(xEnd)); ctx.lineTo(xEnd, yc + anti(xEnd)); ctx.closePath(); ctx.fill();
    ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(71,85,105,.8)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(xTip, yc); ctx.lineTo(xEnd, yc - anti(xEnd)); ctx.moveTo(xTip, yc); ctx.lineTo(xEnd, yc + anti(xEnd)); ctx.stroke(); ctx.setLineDash([]);
    // 축
    line([[x0, yc], [xEnd, yc]], 'rgba(30,41,59,.45)', 1.4, { dash: [2, 6] });
    // 달
    D.sphere(x0, yc, ky * KM.Rm, '#d8d2bc', { light: '#f6f2e2', dark: '#7c7a6e', shadow: true });
    D.text(x0, yc + ky * KM.Rm + 19, '달', { size: 14, weight: 800, color: '#334155' });
    // 지구 (세로로 늘려 그림)
    const xe = x0 + r * kx, rx = KM.Re * kx, ry = KM.Re * ky, ye = yc - eYpx;
    const penE = ky * penOf(r, dS, r);
    ctx.save(); ctx.translate(xe, ye); ctx.scale(rx / ry, 1);
    D.sphere(0, 0, ry, '#2f7de1', { light: '#8ec5ff', dark: '#173f86', shadow: true, gloss: false }); ctx.restore();
    // 반영이 덮은 지표 구간
    ctx.save(); ctx.beginPath(); ctx.ellipse(xe, ye, rx, ry, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(15,23,42,.38)'; ctx.fillRect(xe - rx - 2, yc - penE, rx * 2 + 4, penE * 2); ctx.restore();
    // 본영 끝 표시 + 닿는 점
    const lt = localType(r, S.eYv);
    ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(xTip, yc, 5, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    D.text(xTip, yc - (ph ? 34 : 14), '본영의 끝', { size: 13, weight: 800, color: '#0f172a', stroke: 'rgba(255,250,235,.95)', strokeWidth: 4 });
    if (Math.abs(S.eYv) < KM.Re) {
      const hx = xe - rx * Math.sqrt(1 - (S.eYv / KM.Re) ** 2), c = lt.type === '개기' ? '#f97316' : '#eab308';
      D.ring(hx, yc, 11, t, { color: c, speed: 1.1, width: 3 });
      ctx.save(); ctx.fillStyle = lt.type === '개기' ? '#0f172a' : '#fde047'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, yc, 5, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      const gp = lt.gap;
      const gTxt = gp > 0 ? '본영이 ' + comma(Math.round(gp / 100) * 100) + ' km 모자라요' : '본영이 지표에 닿아요';
      D.label(clamp((hx + xTip) / 2, 90, VW - 90), yc + (ph ? 62 : 70), gTxt, { bg: gp > 0 ? '#b45309' : '#c2410c', size: 13, pad: 10 });
      line([[hx, yc + 10], [clamp((hx + xTip) / 2, 90, VW - 90), yc + (ph ? 62 : 70) - 14]], 'rgba(30,41,59,.5)', 1.3);
    }
    D.text(xe + 2, ye - ry - 9, '지구', { size: 14, weight: 800, color: '#1e3a8a', stroke: 'rgba(255,250,235,.95)', strokeWidth: 4 });
    ctx.restore();
    // 이름표
    const lx = x0 + 0.34 * (xe - x0);
    D.label(lx, yc - pen(lx) - 16, '반영: 일부만 가려요', { bg: '#475569', size: 13, pad: 9 });
    D.label(x0 + (xTip - x0) * 0.4, yc + ky * KM.Rm + 44, '본영: 완전히 가려요', { bg: '#0f172a', size: 13, pad: 9 });
    line([[x0 + (xTip - x0) * 0.4, yc + ky * KM.Rm + 33], [x0 + (xTip - x0) * 0.4, yc + 4]], 'rgba(15,23,42,.55)', 1.3);
    if (xEnd - xTip > 90) { const lx2 = xTip + (xEnd - xTip) * (ph ? 0.7 : 0.62); D.text(lx2, ph ? yc + 32 : yc - anti(lx2) - 12, '본영의 연장', { size: 13, weight: 800, color: '#475569' }); }
    D.text(18, 30, '☀ 햇빛 →', { size: 14, weight: 800, color: '#b45309', align: 'left' });
    D.text(VW / 2, DH - 16, '※ 가로 거리는 실제 비율, 달·지구의 크기는 세로로 늘려 그렸어요', { size: 12.5, weight: 700, color: '#64748b' });

    // 아래 판: 각지름 비교 + 거리 막대
    const by = DH + 6, bh = VH - by - 8;
    const lw = ph ? VW - 16 : 392;
    panel(8, by, lw, ph ? 190 : bh, { fill: 'rgba(255,255,255,.95)', title: '지표에서 본 태양과 달 (각지름)', tsize: 14 });
    const dSite = lt.type === '없음' || lt.type === '부분' ? r : lt.dHit;
    const as = Math.asin(KM.Rs / (dSM + dSite)) / DEG, am = Math.asin(KM.Rm / dSite) / DEG;
    const sc = ph ? 165 : 150, pcy = by + (ph ? 108 : 110), cxL = 8 + (ph ? 80 : 70);
    // 나란히 비교
    D.sphere(cxL, pcy - 16, as * sc, '#ffd23f', { light: '#fff6c2', dark: '#f59e0b', gloss: false });
    D.sphere(cxL + (ph ? 100 : 90), pcy - 16, am * sc, '#cfc9b4', { light: '#f1ecd9', dark: '#77756a', gloss: false });
    D.text(cxL, pcy + 38, '태양 ' + f2(as * 2) + '°', { size: 13.5, weight: 800, color: '#b45309' });
    D.text(cxL + (ph ? 100 : 90), pcy + 38, '달 ' + f2(am * 2) + '°', { size: 13.5, weight: 800, color: '#475569' });
    D.text(cxL + (ph ? 50 : 45), pcy + 58, am >= as ? '달 ≥ 태양' : '달 < 태양', { size: 14.5, weight: 800, color: am >= as ? '#c2410c' : '#a16207' });
    // 겹쳐 본 모습
    const ox = 8 + lw - (ph ? 100 : 98), oy = pcy - 10, osc = sc * 0.95;
    let sepDeg = 0;
    if (lt.type === '부분') sepDeg = (Math.abs(S.eYv) - KM.Re) / r / DEG; else if (lt.type === '없음') sepDeg = (Math.abs(S.eYv) - KM.Re) / r / DEG;
    ctx.save(); ctx.beginPath(); ctx.arc(ox, oy, 62, 0, TAU); ctx.clip();
    ctx.fillStyle = lt.type === '개기' ? '#0b1230' : '#8ec5ff'; ctx.fillRect(ox - 64, oy - 64, 128, 128);
    if (lt.type === '개기') D.glow(ox, oy, as * osc * 3, '#fff6c2', 0.55);
    D.sphere(ox, oy, as * osc, '#ffd23f', { light: '#fff6c2', dark: '#f59e0b', gloss: false });
    const msx = ox - (lt.type === '부분' || lt.type === '없음' ? sepDeg * osc : 0);
    D.sphere(msx, oy, am * osc, lt.type === '개기' ? '#05070f' : '#3a3f55', { light: '#4a5170', dark: '#05070f', gloss: false });
    ctx.restore();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, 62, 0, TAU); ctx.stroke();
    const typeTxt = lt.type === '없음' ? '일식이 보이지 않음' : lt.type === '부분' ? '부분 일식' : lt.type + ' 일식';
    D.label(ox, oy + 80 + (ph ? 4 : 0), typeTxt, { bg: lt.type === '없음' ? '#64748b' : ECL_COLOR[lt.type], size: 14, pad: 11 });
    // 거리 막대
    const bx = ph ? 8 : 408, bw = ph ? VW - 16 : VW - 416, byy = ph ? by + 200 : by, bhh = ph ? VH - (by + 200) - 8 : bh;
    panel(bx, byy, bw, bhh, { fill: 'rgba(255,255,255,.95)', title: '지구-달 거리와 일식의 종류', tsize: 14 });
    const barX = bx + 16, barW = bw - 32, barY = byy + 50, barH = 26;
    const vx = (km) => barX + (clamp(km, DIST_MIN, DIST_MAX) - DIST_MIN) / (DIST_MAX - DIST_MIN) * barW;
    const zA = vx(Lu), zB = vx(Lu + KM.Re);
    const seg = (xa, xb, c, tx) => { ctx.fillStyle = c; ctx.fillRect(xa, barY, xb - xa, barH); if (xb - xa > 34) D.text((xa + xb) / 2, barY + barH / 2 + 5, tx, { size: 13.5, weight: 800, color: '#fff' }); };
    ctx.save(); rr(barX, barY, barW, barH, 8).clip();
    seg(barX, zA, ECL_COLOR['개기'], '개기'); seg(zA, zB, ECL_COLOR['혼성'], '혼성'); seg(zB, barX + barW, ECL_COLOR['금환'], '금환'); ctx.restore();
    const px = vx(r);
    ctx.save(); ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(px, barY + barH + 2); ctx.lineTo(px - 8, barY + barH + 14); ctx.lineTo(px + 8, barY + barH + 14); ctx.closePath(); ctx.fill(); ctx.restore();
    D.text(px, barY + barH + 32, f1(r / 10000) + '만 km', { size: 14, weight: 800, color: '#0f172a' });
    D.text(barX, barY - 6, '36.3', { size: 12.5, weight: 700, color: '#64748b', align: 'left' });
    D.text(barX + barW, barY - 6, '40.6만 km', { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
    const pt = pathType(r, dS);
    drawWrap(bx + bw / 2, barY + barH + 56 + (ph ? 0 : 0), '이 거리에서 달 그림자의 중심이 지나가는 길은 ' + (pt === '혼성' ? '금환 → 개기 → 금환으로 바뀌는 혼성 일식' : pt + ' 일식') + '이에요. 본영 길이 약 ' + f1(Lu / 10000) + '만 km', bw - 28, 13.5, { color: '#334155', weight: 700 });
  }

  /* ======================================================
     ③ 달 그림자의 이동 (지구를 태양 쪽에서 본 모습)
     ====================================================== */
  const G = { r: 366000, dS: 150.9e6, vm: 1.0, vg: 0.46, phiM: 30, tMin: -10500, tMax: 10500 };
  G.dSM = G.dS - G.r; G.Lu = luOf(G.r, G.dS); G.kp = (KM.Rs + KM.Rm) / G.dSM; G.Ym = KM.Re * Math.sin(G.phiM * DEG); G.w = G.vg / KM.Re;
  const SITES = {
    A: { id: 'A', lat: 30, lon: 0, name: 'A', note: '그림자 중심선 위' },
    B: { id: 'B', lat: 50, lon: 25, name: 'B', note: '중심선에서 북쪽으로 멀어요' },
    C: { id: 'C', lat: -20, lon: 0, name: 'C', note: '반영 밖' },
  };
  const CONT = [
    [[35, -6], [37, 10], [31, 32], [12, 43], [11, 51], [-2, 41], [-15, 40], [-26, 33], [-34, 26], [-34, 18], [-18, 12], [-5, 9], [4, 9], [5, -8], [15, -17], [28, -13]],
    [[36, -9], [44, -9], [48, -5], [51, 2], [55, 8], [58, 5], [70, 20], [69, 35], [60, 30], [56, 22], [46, 30], [41, 28], [38, 24], [36, 15], [40, 10], [43, 3]],
    [[70, 35], [73, 80], [72, 130], [66, 170], [60, 163], [52, 157], [45, 140], [35, 128], [22, 114], [8, 105], [1, 104], [20, 92], [22, 70], [25, 57], [30, 48], [36, 36], [41, 28], [46, 30], [56, 22], [60, 30]],
    [[70, -160], [72, -120], [68, -85], [60, -65], [47, -53], [40, -72], [30, -81], [25, -80], [18, -95], [8, -80], [10, -85], [16, -100], [24, -110], [32, -117], [48, -125], [58, -137], [66, -165]],
    [[10, -75], [12, -62], [0, -50], [-8, -35], [-23, -42], [-34, -54], [-42, -64], [-54, -70], [-50, -75], [-38, -73], [-18, -70], [-5, -81], [8, -78]],
    [[-11, 132], [-12, 142], [-25, 153], [-38, 147], [-35, 138], [-32, 115], [-22, 114]],
  ];
  const axisAt = (t) => ({ x: G.vm * t, y: G.Ym });
  function groundPt(lat, lon, t) {
    const th = lon * DEG + G.w * t, ph = lat * DEG;
    return { x: KM.Re * Math.cos(ph) * Math.sin(th), y: KM.Re * Math.sin(ph), z: KM.Re * Math.cos(ph) * Math.cos(th) };
  }
  function siteState(site, t) {
    const p = groundPt(site.lat, site.lon, t), m = axisAt(t);
    const sinh = p.z / KM.Re;
    if (p.z <= 20) return { night: true, type: '밤', obsc: 0, sinh, p };
    const d = G.r - p.z, s = Math.hypot(m.x - p.x, m.y - p.y);
    const am = Math.asin(KM.Rm / d), as = Math.asin(KM.Rs / (G.dSM + d)), sep = s / d;
    let type = '없음';
    if (sep <= am - as) type = '개기'; else if (sep <= as - am) type = '금환'; else if (sep < as + am) type = '부분';
    let obsc = 0;
    if (sep < as + am) obsc = Math.min(1, lensArea(as, am, sep) / (Math.PI * as * as));
    return { night: false, type, obsc, sep, am, as, d, s, sinh, p, ex: (p.x - m.x) / d, ny: (m.y - p.y) / d };
  }
  const clockStr = (t) => { const T = Math.round(12 * 3600 + t), h = Math.floor(T / 3600), m = Math.floor((T % 3600) / 60), s = T % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; };
  const siteCache = {};
  function siteInfo(site) {
    const key = site.id + ':' + site.lat + ':' + site.lon;
    if (siteCache[key]) return siteCache[key];
    let c1 = null, c4 = null, c2 = null, c3 = null, best = { obsc: -1, t: 0 }, anyTot = false, anyAnn = false;
    for (let t = G.tMin; t <= G.tMax; t += 2) {
      const st = siteState(site, t);
      if (st.night) continue;
      if (st.obsc > 0) { if (c1 == null) c1 = t; c4 = t; }
      if (st.type === '개기' || st.type === '금환') { if (c2 == null) c2 = t; c3 = t; if (st.type === '개기') anyTot = true; else anyAnn = true; }
      if (st.obsc > best.obsc) best = { obsc: st.obsc, t };
    }
    const kind = anyTot ? '개기' : anyAnn ? '금환' : c1 != null ? '부분' : '없음';
    // 중심 지점에서의 본영 지름과 그림자 속력
    const tm = best.t, stm = siteState(site, tm), th = site.lon * DEG + G.w * tm;
    let dia = null;
    if (stm.d != null && (kind === '개기' || kind === '금환')) dia = 2 * KM.Rm * Math.abs(1 - stm.d / G.Lu);
    const vrel = G.vm - G.vg * Math.cos(site.lat * DEG) * Math.cos(th);
    const out = { c1, c2, c3, c4, tmax: tm, omax: Math.max(0, best.obsc), kind, dia, vrel, dur: c2 != null ? c3 - c2 + 2 : 0 };
    siteCache[key] = out; return out;
  }
  const curSite = () => (S.site === 'P' ? S.custom : SITES[S.site]);
  const latTxt = (v) => Math.abs(Math.round(v)) + '°' + (v >= 0 ? 'N' : 'S');
  const lonTxt = (v) => { v = ((Math.round(v) + 540) % 360) - 180; return Math.abs(v) + '°' + (v >= 0 ? 'E' : 'W'); };

  function gLay() {
    if (PHONE) return { cx: 260, cy: 134, R: 114, skyX: 10, skyY: 306, skyW: VW - 20, skyH: 186, infoX: 10, infoY: 498, infoW: VW - 20, infoH: 148, tlX: 12, tlY: 654, tlW: VW - 24, tlH: 90 };
    return { cx: 200, cy: 218, R: 150, skyX: 392, skyY: 12, skyW: VW - 404, skyH: 232, infoX: 392, infoY: 252, infoW: VW - 404, infoH: 168, tlX: 12, tlY: 446, tlW: VW - 24, tlH: 100 };
  }
  function gProj(L, x, y) { const k = L.R / KM.Re; return [L.cx + x * k, L.cy - y * k]; }
  function drawGlobe(t, dt) {
    const L = gLay(), k = L.R / KM.Re, tt = S.t;
    drawSpaceBg(t);
    // 지구
    D.glow(L.cx, L.cy, L.R * 1.25, '#60a5fa', 0.28);
    ctx.save(); ctx.beginPath(); ctx.arc(L.cx, L.cy, L.R, 0, TAU); ctx.clip();
    const og = ctx.createRadialGradient(L.cx - L.R * 0.3, L.cy - L.R * 0.3, L.R * 0.1, L.cx, L.cy, L.R);
    og.addColorStop(0, '#5fa8f2'); og.addColorStop(0.7, '#2f7de1'); og.addColorStop(1, '#1d4f9a'); ctx.fillStyle = og; ctx.fillRect(L.cx - L.R, L.cy - L.R, L.R * 2, L.R * 2);
    // 대륙
    ctx.fillStyle = 'rgba(90,170,100,.92)'; ctx.strokeStyle = 'rgba(40,110,60,.7)'; ctx.lineWidth = 1;
    CONT.forEach((poly) => {
      ctx.beginPath();
      let any = false;
      poly.forEach((ll, i) => {
        const p = groundPt(ll[0], ll[1], tt); let x = p.x, y = p.y;
        if (p.z > 0) any = true; else { const n = Math.hypot(x, y) || 1; x = x / n * KM.Re; y = y / n * KM.Re; }
        const q = gProj(L, x, y); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      });
      ctx.closePath(); if (any) { ctx.fill(); ctx.stroke(); }
    });
    // 위도·경도선
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) { ctx.beginPath(); let pen = false; for (let lon = -180; lon <= 180; lon += 4) { const p = groundPt(lat, lon - G.w * tt / DEG, tt); if (p.z > 0) { const q = gProj(L, p.x, p.y); pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); pen = true; } else pen = false; } ctx.stroke(); }
    for (let lon = -180; lon < 180; lon += 30) { ctx.beginPath(); let pen = false; for (let lat = -90; lat <= 90; lat += 4) { const p = groundPt(lat, lon, tt); if (p.z > 0) { const q = gProj(L, p.x, p.y); pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); pen = true; } else pen = false; } ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.6; { ctx.beginPath(); let pen = false; for (let lon = -180; lon <= 180; lon += 3) { const p = groundPt(0, lon, tt); if (p.z > 0) { const q = gProj(L, p.x, p.y); pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); pen = true; } else pen = false; } ctx.stroke(); }
    // 본영이 지나간 길 (지표에 붙어 있어요)
    if (hasF('track')) {
      const lat = G.phiM, cl = Math.cos(lat * DEG);
      ctx.strokeStyle = 'rgba(15,23,42,.85)'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.beginPath(); let pen = false;
      for (let tp = G.tMin; tp <= tt + 1; tp += 60) {
        const X = G.vm * tp, v = X / (KM.Re * cl); if (Math.abs(v) >= 1) { pen = false; continue; }
        const lon = Math.asin(v) / DEG - G.w * tp / DEG, p = groundPt(lat, lon, tt);
        if (p.z > 0) { const q = gProj(L, p.x, p.y); pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); pen = true; } else pen = false;
      }
      ctx.stroke(); ctx.lineCap = 'butt';
    }
    // 반영 (가장자리 곡선)
    const m = axisAt(tt);
    const poly = [];
    for (let a = 0; a < 48; a++) {
      const ang = (a / 48) * TAU; let s = KM.Rm + G.r * G.kp;
      for (let it = 0; it < 4; it++) { const px = m.x + s * Math.cos(ang), py = m.y + s * Math.sin(ang), rr2 = px * px + py * py, z = rr2 < KM.Re * KM.Re ? Math.sqrt(KM.Re * KM.Re - rr2) : 0; s = KM.Rm + (G.r - z) * G.kp; }
      poly.push(gProj(L, m.x + s * Math.cos(ang), m.y + s * Math.sin(ang)));
    }
    ctx.fillStyle = 'rgba(8,16,40,.34)'; ctx.beginPath(); poly.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    // 본영
    const inDisc = m.x * m.x + m.y * m.y < KM.Re * KM.Re;
    let umbraTxt = null;
    if (inDisc) {
      const zz = Math.sqrt(KM.Re * KM.Re - m.x * m.x - m.y * m.y), dh = G.r - zz, ru = KM.Rm * (1 - dh / G.Lu), q = gProj(L, m.x, m.y);
      const rad = Math.max(Math.abs(ru) * k, 3.6);
      ctx.fillStyle = ru > 0 ? '#050810' : 'rgba(250,204,21,.9)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q[0], q[1], rad, 0, TAU); ctx.fill(); ctx.stroke();
      D.ring(q[0], q[1], rad + 5, t, { color: ru > 0 ? '#f97316' : '#fde047', speed: 1.2, width: 2 });
      umbraTxt = { q, ru };
    }
    // 대기 가장자리 어둡게
    const lg = ctx.createRadialGradient(L.cx, L.cy, L.R * 0.72, L.cx, L.cy, L.R); lg.addColorStop(0, 'rgba(0,0,20,0)'); lg.addColorStop(1, 'rgba(0,0,20,.5)');
    ctx.fillStyle = lg; ctx.fillRect(L.cx - L.R, L.cy - L.R, L.R * 2, L.R * 2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(191,219,254,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(L.cx, L.cy, L.R, 0, TAU); ctx.stroke();
    // 지점 표시
    const sites = Object.values(SITES).concat(S.custom ? [S.custom] : []);
    sites.forEach((st) => {
      const p = groundPt(st.lat, st.lon, tt); if (p.z <= 0) return;
      const q = gProj(L, p.x, p.y), sel = S.site === st.id;
      if (sel) D.ring(q[0], q[1], 12, t, { color: '#facc15', speed: 1, width: 3 });
      ctx.save(); ctx.fillStyle = sel ? '#facc15' : '#fff'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q[0], q[1], 9, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      D.text(q[0], q[1] + 5, st.name, { size: 13, weight: 800, color: '#0f172a' });
    });
    D.text(L.cx, L.cy - L.R - 8, '북', { size: 13, weight: 800, color: '#bfdbfe' });
    D.text(L.cx + L.R + 12, L.cy + 5, '동', { size: 13, weight: 800, color: '#bfdbfe', align: 'left' });
    D.text(L.cx - L.R - 12, L.cy + 5, '서', { size: 13, weight: 800, color: '#bfdbfe', align: 'right' });
    D.label(L.cx, L.cy + L.R + (PHONE ? 19 : 22), '모형 시계 ' + clockStr(tt), { bg: 'rgba(15,23,42,.85)', size: 14, pad: 11 });
    if (umbraTxt) {
      const cx = umbraTxt.q[0], cy = umbraTxt.q[1], above = cy > L.cy;
      D.label(clamp(cx, 70, L.cx + L.R), cy + (above ? 26 : -26), umbraTxt.ru > 0 ? '본영' : '본영의 연장', { bg: umbraTxt.ru > 0 ? '#c2410c' : '#a16207', size: 13, pad: 8 });
    }
    if (hasF('track')) D.text(L.cx, L.cy + L.R + (PHONE ? 44 : 48), PHONE ? '검은 선: 본영이 지나간 길 (크게 그림)' : '검은 선: 본영이 지나간 길 · 본영은 실제보다 크게 그렸어요', { size: 12.5, weight: 700, color: '#cbd5e1' });
    drawSkyG(L, t);
    drawInfoG(L);
    drawTimeG(L);
  }
  function drawSkyG(L, t) {
    const site = curSite(), x = L.skyX, y = L.skyY, w = L.skyW, h = L.skyH;
    const st = siteState(site, S.t), inf = siteInfo(site);
    panel(x, y, w, h, { fill: 'rgba(8,15,40,.86)', line: 'rgba(148,163,184,.5)', title: '지점 ' + site.name + '에서 본 하늘', tcolor: '#e2e8f0', tsize: 14 });
    const cx = x + w / 2, cy = y + 28 + (h - 28 - 24) / 2, R0 = Math.min((h - 70) / 2, w / 2 - 36);
    ctx.save(); ctx.beginPath(); rr(x + 2, y + 30, w - 4, h - 34, 10).clip();
    if (st.night) {
      ctx.fillStyle = '#0b1230'; ctx.fillRect(x, y, w, h);
      D.text(cx, cy, '이 지점은 지금 밤이에요', { size: 15, weight: 800, color: '#94a3b8' }); D.text(cx, cy + 22, '(해가 지평선 아래)', { size: 13, weight: 700, color: '#64748b' });
    } else {
      const total = st.type === '개기';
      const g = ctx.createLinearGradient(0, y, 0, y + h); const dim = total ? 1 : st.obsc;
      g.addColorStop(0, mixc('#63b3ff', '#0c1535', total ? 0.97 : Math.pow(st.obsc, 3) * 0.7)); g.addColorStop(1, mixc('#bfe3ff', '#1a2550', total ? 0.9 : Math.pow(st.obsc, 3) * 0.7));
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      const sc = R0 / st.as;                       // px per rad: 태양 반지름 = R0
      const sx = cx, sy = cy;
      if (total) { D.glow(sx, sy, R0 * 3.2, '#fff6c2', 0.55); ctx.strokeStyle = 'rgba(255,246,194,.45)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(sx, sy, R0 * 1.18, 0, TAU); ctx.stroke(); }
      else D.glow(sx, sy, R0 * 2.4, '#ffe48a', 0.45);
      D.sphere(sx, sy, R0, '#ffd23f', { light: '#fff6c2', dark: '#f59e0b', gloss: false });
      const mx = sx + st.ex * sc, my = sy - st.ny * sc;
      D.sphere(mx, my, st.am * sc, total ? '#03050c' : '#2b3147', { light: '#3b4260', dark: '#03050c', gloss: false });
    }
    ctx.restore();
    if (!st.night) {
      D.text(x + w - 10, y + h - 9, '왼쪽 = 동쪽, 오른쪽 = 서쪽', { size: 12.5, weight: 700, color: st.type === '개기' ? '#cbd5e1' : '#334155', align: 'right' });
      const tp = st.type;
      D.label(x + 12 + 0, y + 48, tp === '없음' ? '식 없음' : tp === '부분' ? '부분 일식 ' + Math.round(st.obsc * 100) + ' %' : tp + ' 일식', { bg: tp === '없음' ? '#64748b' : ECL_COLOR[tp], size: 14, pad: 10, align: 'left' });
    }
  }
  function drawInfoG(L) {
    const site = curSite(), x = L.infoX, y = L.infoY, w = L.infoW, h = L.infoH, st = siteState(site, S.t), inf = siteInfo(site);
    panel(x, y, w, h, { fill: 'rgba(255,255,255,.96)' });
    const sz = 13.5, lh = 19 * FS;
    let yy = y + 22;
    D.text(x + 12, yy, '지점 ' + site.name + ' · 위도 ' + latTxt(site.lat) + ', 경도 ' + lonTxt(site.lon), { size: 14, weight: 800, color: '#0f172a', align: 'left' }); yy += lh;
    D.text(x + 12, yy, '태양 고도 ' + (st.night ? '지평선 아래' : f0(Math.asin(clamp(st.sinh, 0, 1)) / DEG) + '°') + ' · 가려진 정도 ' + (st.night ? '—' : Math.round(st.obsc * 100) + ' %'), { size: sz, weight: 700, color: '#334155', align: 'left' }); yy += lh;
    if (inf.kind === '없음') { D.text(x + 12, yy, '이 지점에서는 하루 종일 일식이 보이지 않아요.', { size: sz, weight: 700, color: '#64748b', align: 'left' }); return; }
    const tm = (a) => (a == null ? '—' : clockStr(a));
    D.text(x + 12, yy, '시작 ' + tm(inf.c1) + ' · 끝 ' + tm(inf.c4), { size: sz, weight: 700, color: '#334155', align: 'left' }); yy += lh;
    D.text(x + 12, yy, '최대 ' + tm(inf.tmax) + ' · 최대 ' + Math.round(inf.omax * 100) + ' % 가려져요', { size: sz, weight: 700, color: '#334155', align: 'left' }); yy += lh;
    if (inf.kind === '개기' || inf.kind === '금환') {
      D.text(x + 12, yy, S.showCalc && !S.calcOk ? inf.kind + ' 지속 시간: 아래 두 값으로 직접 구해 봐요' : inf.kind + ' 지속 약 ' + Math.floor(inf.dur / 60) + '분 ' + (inf.dur % 60) + '초 (' + inf.dur + '초)', { size: sz, weight: 800, color: ECL_COLOR[inf.kind], align: 'left' }); yy += lh;
      if (hasF('calc')) D.text(x + 12, yy, '본영 지름 약 ' + Math.round(inf.dia / 10) * 10 + ' km · 그림자 속력 약 ' + f2(inf.vrel) + ' km/s', { size: sz, weight: 800, color: '#0f172a', align: 'left' });
    }
  }
  function drawTimeG(L) {
    const site = curSite(), inf = siteInfo(site), x = L.tlX, y = L.tlY, w = L.tlW, h = L.tlH;
    panel(x, y, w, h, { fill: 'rgba(8,15,40,.86)', line: 'rgba(148,163,184,.4)', r: 12 });
    const ax = x + 22, aw = w - 44, ay = y + h * 0.52, tx = (tv) => ax + (tv - G.tMin) / (G.tMax - G.tMin) * aw;
    line([[ax, ay], [ax + aw, ay]], 'rgba(148,163,184,.6)', 3);
    for (let hr = -2; hr <= 2; hr++) { const px = tx(hr * 3600); line([[px, ay - 6], [px, ay + 6]], 'rgba(148,163,184,.8)', 2); D.text(px, ay + 24, (12 + hr) + ':00', { size: 12.5, weight: 700, color: '#94a3b8' }); }
    if (inf.c1 != null) {
      ctx.fillStyle = 'rgba(250,204,21,.55)'; ctx.fillRect(tx(inf.c1), ay - 8, Math.max(2, tx(inf.c4) - tx(inf.c1)), 16);
      if (inf.c2 != null) { ctx.fillStyle = ECL_COLOR[inf.kind]; ctx.fillRect(tx(inf.c2), ay - 12, Math.max(3, tx(inf.c3) - tx(inf.c2)), 24); }
      D.text(clamp((tx(inf.c1) + tx(inf.c4)) / 2, ax + 60, ax + aw - 60), ay - 18, '지점 ' + site.name + '의 식 (' + Math.round((inf.c4 - inf.c1) / 60) + '분)', { size: 13, weight: 800, color: '#fde68a' });
    } else D.text(ax + aw / 2, ay - 16, '지점 ' + site.name + '에서는 식이 없어요', { size: 13, weight: 800, color: '#94a3b8' });
    const cxp = tx(clamp(S.t, G.tMin, G.tMax));
    line([[cxp, y + 6], [cxp, y + h - 6]], '#38bdf8', 2.4);
    ctx.save(); ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(cxp, y + 6); ctx.lineTo(cxp - 6, y - 1); ctx.lineTo(cxp + 6, y - 1); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  /* ======================================================
     ④ 월식의 종류
     ====================================================== */
  const LU = { r: 384400, dS: KM.dS, vkmh: 3670 };
  LU.rU = umbraR(LU.r, LU.dS); LU.rP = penumbraR(LU.r, LU.dS); LU.vmin = LU.vkmh / 60;
  const PATHS = { up: { off: 7400, name: '① 위쪽 경로' }, mid: { off: 0, name: '② 가운데 경로' }, low: { off: -3900, name: '③ 아래쪽 경로' } };
  const LT_MAX = Math.ceil((LU.rP + KM.Rm + 1200) / LU.vmin);   // 분
  function lunarContacts(off) {
    const a = Math.abs(off), out = {};
    const half = (rho) => (rho > a ? Math.sqrt(rho * rho - a * a) / LU.vmin : null);
    out.p = half(LU.rP + KM.Rm); out.u = half(LU.rU + KM.Rm); out.t = half(LU.rU - KM.Rm);
    out.type = lunarType(LU.r, LU.dS, a);
    out.umag = (LU.rU + KM.Rm - a) / (2 * KM.Rm); out.pmag = (LU.rP + KM.Rm - a) / (2 * KM.Rm);
    return out;
  }
  const fmtMin = (m) => { const s = m < 0 ? '−' : '+', a = Math.round(Math.abs(m)); return s + Math.floor(a / 60) + ':' + (a % 60 < 10 ? '0' : '') + (a % 60); };
  function lLay() {
    if (PHONE) return { px: 8, py: 8, pw: VW - 16, ph: 372, tx: 8, ty: 388, tw: VW - 16, th: 214, bx: 8, by: 610, bw: VW - 16, bh: 76, k: 0.0158 };
    return { px: 8, py: 8, pw: 500, ph: 384, tx: 516, ty: 8, tw: VW - 524, th: 384, bx: 8, by: 402, bw: VW - 16, bh: 84, k: 0.0185 };
  }
  function drawLunar(t, dt) {
    const L = lLay(), pa = PATHS[S.path], cn = lunarContacts(pa.off), k = L.k, tm = S.lp;
    ctx.fillStyle = '#0b1230'; ctx.fillRect(0, 0, VW, VH);
    // 단면 판
    D.shadow(() => { const g = ctx.createLinearGradient(0, L.py, 0, L.py + L.ph); g.addColorStop(0, '#0a1128'); g.addColorStop(1, '#142148'); ctx.fillStyle = g; rr(L.px, L.py, L.pw, L.ph, 16).fill(); }, { blur: 6, y: 2 });
    const cx = L.px + L.pw / 2, cy = L.py + L.ph / 2 + 6;
    ctx.save(); rr(L.px, L.py, L.pw, L.ph, 16).clip();
    STARS.forEach((s) => { ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t + s[3]); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(L.px + s[0] * L.pw, L.py + s[1] * L.ph, s[2] * 0.8, 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
    // 지구 그림자: 반영, 본영
    const pg = ctx.createRadialGradient(cx, cy, LU.rU * k, cx, cy, LU.rP * k);
    pg.addColorStop(0, 'rgba(120,135,170,.34)'); pg.addColorStop(1, 'rgba(120,135,170,.04)');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, cy, LU.rP * k, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(2,4,14,.82)'; ctx.beginPath(); ctx.arc(cx, cy, LU.rU * k, 0, TAU); ctx.fill();
    ctx.setLineDash([7, 6]); ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(203,213,225,.85)'; ctx.beginPath(); ctx.arc(cx, cy, LU.rP * k, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(248,113,113,.95)'; ctx.beginPath(); ctx.arc(cx, cy, LU.rU * k, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    D.text(cx, cy + 5, '본영', { size: 15, weight: 800, color: '#fecaca' });
    D.text(cx + (LU.rP * k) * 0.74, cy - (LU.rP * k) * 0.74 - 4, '반영', { size: 14, weight: 800, color: '#e2e8f0' });
    // 달이 지나가는 길
    const mxk = (m) => cx - m * LU.vmin * k, myk = cy - pa.off * k;
    line([[mxk(-LT_MAX), myk], [mxk(LT_MAX), myk]], 'rgba(250,204,21,.65)', 2, { dash: [4, 7] });
    // 달
    const mx = mxk(tm), my = myk, mr = KM.Rm * k;
    ctx.save(); ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.clip();
    const mg = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr); mg.addColorStop(0, '#f7f3e4'); mg.addColorStop(1, '#b9b39c');
    ctx.fillStyle = mg; ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    ctx.fillStyle = 'rgba(120,115,100,.35)'; [[-0.35, -0.1, 0.22], [0.25, 0.3, 0.16], [0.3, -0.35, 0.12], [-0.1, 0.45, 0.1]].forEach((c) => { ctx.beginPath(); ctx.arc(mx + c[0] * mr, my + c[1] * mr, c[2] * mr, 0, TAU); ctx.fill(); });
    // 반영·본영 그림자 (번지는 가장자리)
    const sg = ctx.createRadialGradient(cx, cy, LU.rU * k, cx, cy, LU.rP * k); sg.addColorStop(0, 'rgba(20,25,50,.52)'); sg.addColorStop(1, 'rgba(20,25,50,0)');
    ctx.fillStyle = sg; ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    const ug = ctx.createRadialGradient(cx, cy, 0, cx, cy, LU.rU * k); ug.addColorStop(0, 'rgba(70,14,8,.9)'); ug.addColorStop(0.8, 'rgba(120,28,14,.84)'); ug.addColorStop(1, 'rgba(190,80,38,.55)');
    ctx.fillStyle = ug; ctx.beginPath(); ctx.arc(cx, cy, LU.rU * k, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.stroke();
    D.text(mx, my - mr - 9, '달', { size: 13.5, weight: 800, color: '#e2e8f0' });
    // 진행 방향
    D.text(L.px + L.pw - 12, L.py + 24, '서', { size: 14, weight: 800, color: '#93c5fd', align: 'right' });
    D.text(L.px + 12, L.py + 24, '동', { size: 14, weight: 800, color: '#93c5fd', align: 'left' });
    D.arrow(L.px + L.pw - 46, L.py + 40, L.px + L.pw - 120, L.py + 40, { color: '#facc15', width: 3 });
    D.text(L.px + L.pw - 83, L.py + 62, '달의 공전', { size: 13, weight: 800, color: '#fde68a' });
    ctx.restore();
    // 달 이름표(상태)
    const st = lunarStateAt(cn, tm);
    D.label(L.px + L.pw / 2, L.py + L.ph - 22, st.text, { bg: st.color, size: 15, pad: 13 });
    // 접촉 표
    panel(L.tx, L.ty, L.tw, L.th, { fill: 'rgba(255,255,255,.96)', title: pa.name + ' · ' + (cn.type === '반영' ? '반영식' : cn.type + ' 월식'), tsize: 14.5, tcolor: ECL_COLOR[cn.type] });
    const rows = [];
    if (cn.p != null) rows.push(['반영 식 시작', -cn.p, '#64748b']);
    if (cn.u != null) rows.push(['부분 식 시작', -cn.u, '#f59e0b']);
    if (cn.t != null) rows.push(['개기 식 시작', -cn.t, '#b91c1c']);
    rows.push(['최대 (식분 ' + f2(cn.type === '반영' ? cn.pmag : cn.umag) + ')', 0, '#0f172a']);
    if (cn.t != null) rows.push(['개기 식 끝', cn.t, '#b91c1c']);
    if (cn.u != null) rows.push(['부분 식 끝', cn.u, '#f59e0b']);
    if (cn.p != null) rows.push(['반영 식 끝', cn.p, '#64748b']);
    const rh = Math.min(30, (L.th - 70) / rows.length);
    rows.forEach((r, i) => {
      const y = L.ty + 40 + i * rh, done = tm >= r[1] - 0.01;
      ctx.save(); ctx.fillStyle = done ? r[2] : '#e2e8f0'; ctx.beginPath(); ctx.arc(L.tx + 20, y + 4, 8, 0, TAU); ctx.fill(); ctx.restore();
      if (done) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(L.tx + 16, y + 4); ctx.lineTo(L.tx + 19, y + 7); ctx.lineTo(L.tx + 24, y + 1); ctx.stroke(); ctx.lineCap = 'butt'; }
      D.text(L.tx + 36, y + 9, r[0], { size: 13.5, weight: 800, color: done ? '#0f172a' : '#94a3b8', align: 'left' });
      D.text(L.tx + L.tw - 12, y + 9, fmtMin(r[1]).replace('+0:00', '0:00').replace('−0:00', '0:00'), { size: 13.5, weight: 800, color: done ? r[2] : '#94a3b8', align: 'right' });
    });
    const dur = cn.t != null ? 2 * cn.t : null;
    D.text(L.tx + 12, L.ty + L.th - 12, dur != null ? (S.showLcalc && !S.minOk ? '개기 식 지속 시간은 직접 구해 봐요' : '개기 식 지속 ' + f0(dur) + '분') : cn.u != null ? '개기 식은 일어나지 않아요' : '본영에는 들어가지 않아요', { size: 14, weight: 800, color: dur != null ? '#b91c1c' : '#64748b', align: 'left' });
    // 진행 막대
    panel(L.bx, L.by, L.bw, L.bh, { fill: 'rgba(8,15,40,.86)', line: 'rgba(148,163,184,.4)', r: 12 });
    const ax = L.bx + 24, aw = L.bw - 48, ay = L.by + L.bh * 0.45, tx = (m) => ax + (m + LT_MAX) / (2 * LT_MAX) * aw;
    const seg = (a, b, c, hh) => { if (a == null) return; ctx.fillStyle = c; ctx.fillRect(tx(a), ay - hh / 2, Math.max(2, tx(b) - tx(a)), hh); };
    ctx.fillStyle = 'rgba(148,163,184,.35)'; ctx.fillRect(ax, ay - 3, aw, 6);
    if (cn.p != null) seg(-cn.p, cn.p, '#94a3b8', 14);
    if (cn.u != null) seg(-cn.u, cn.u, '#f59e0b', 20);
    if (cn.t != null) seg(-cn.t, cn.t, '#b91c1c', 26);
    const tk = [[-cn.p, 'P1'], [-cn.u, 'U1'], [-cn.t, 'U2'], [cn.t, 'U3'], [cn.u, 'U4'], [cn.p, 'P4']];
    [[cn.p, ''], [cn.u, ''], [cn.t, '']].forEach(() => {});
    const cxp = tx(tm);
    line([[cxp, L.by + 6], [cxp, L.by + L.bh - 6]], '#38bdf8', 2.4);
    ctx.save(); ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(cxp, L.by + 6); ctx.lineTo(cxp - 6, L.by - 1); ctx.lineTo(cxp + 6, L.by - 1); ctx.closePath(); ctx.fill(); ctx.restore();
    D.text(ax, L.by + L.bh - 8, fmtMin(-LT_MAX).replace('−', '−') + ' 시간', { size: 12.5, weight: 700, color: '#94a3b8', align: 'left' });
    D.text(ax + aw, L.by + L.bh - 8, fmtMin(LT_MAX) + ' 시간', { size: 12.5, weight: 700, color: '#94a3b8', align: 'right' });
    D.text(ax + aw / 2, L.by + L.bh - 8, '최대 식 0:00', { size: 12.5, weight: 700, color: '#94a3b8' });
    const lg = [['반영', '#94a3b8'], ['부분', '#f59e0b'], ['개기', '#b91c1c']];
    lg.forEach((g, i) => { const lx = ax + 8 + i * (PHONE ? 70 : 84), ly = L.by + 18; ctx.fillStyle = g[1]; ctx.fillRect(lx, ly - 8, 14, 10); D.text(lx + 19, ly + 1, g[0], { size: 12.5, weight: 800, color: '#cbd5e1', align: 'left' }); });
    drawWrap(L.bx + L.bw / 2, L.by + L.bh + 24, '달은 서쪽(오른쪽)에서 동쪽(왼쪽)으로 움직여서, 달의 동쪽 가장자리가 먼저 지구 그림자에 들어가요.', L.bw - 16, 13.5, { color: '#cbd5e1' });
  }
  function lunarStateAt(cn, m) {
    const a = Math.abs(m);
    if (cn.t != null && a < cn.t) return { text: '개기 월식 중: 달이 본영 안에 완전히 들어갔어요', color: '#b91c1c' };
    if (cn.u != null && a < cn.u) return { text: '부분 월식 중: 달 일부가 본영 안에 있어요', color: '#d97706' };
    if (cn.p != null && a < cn.p) return { text: cn.u == null ? '반영식 중: 반영 안을 지나요' : '반영 안을 지나는 중', color: '#64748b' };
    return { text: '식이 아직 시작되지 않았거나 이미 끝났어요', color: '#334155' };
  }

  /* ======================================================
     조작 · 포인터 · 단계
     ====================================================== */
  initStage('#0b1230', 800, 560, 520, 760, 1.2);
  const sDay = $('#sDay'), oDay = $('#oDay'), sTilt = $('#sTilt'), oTilt = $('#oTilt'), sDist = $('#sDist'), oDist = $('#oDist');
  const sT = $('#sT'), oT = $('#oT'), sL = $('#sL'), oL = $('#oL');

  function refreshSyz() { SYZ = syzygies(S.tiltV); }
  function setView(v) {
    S.view = v;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
    updateCtl();
  }
  function updateCtl() {
    const free = game && game.free;
    $('#modeSeg').hidden = !free;
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#cardsBox').hidden = !(S.view === 'cone' && (S.showCards || free));
    $('#calcBox').hidden = !(S.view === 'globe' && (S.showCalc || free));
    $('#lcalcBox').hidden = !(S.view === 'lunar' && (S.showLcalc || free));
    $('#tabBox').hidden = !(S.view === 'lunar' && (S.showTab || free));
    $('#bSiteP').hidden = !S.custom;
    $('#bPlay').textContent = S.playing ? '⏸ 멈춤' : '▶ 재생';
    $('#bSweep').textContent = S.sweep ? '⏸ 멈춤' : '▶ 그림자 지나가기';
    $('#bPlay3').textContent = S.play3 ? '⏸ 멈춤' : '▶ 재생';
    $('#bPlay4').textContent = S.play4 ? '⏸ 멈춤' : '▶ 지나가기';
    $$('#siteSeg .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === S.site));
    $$('#pathSeg .opt').forEach((b) => b.classList.toggle('on', b.dataset.k === S.path));
    const tl = $('#tbLabel');
    tl.textContent = S.view === 'orbit' ? '🌐 달 궤도 3차원 모형' : S.view === 'cone' ? '🌑 달 그림자 원뿔' : S.view === 'globe' ? '🌍 지구 위의 달 그림자' : '🌕 지구 그림자와 달';
  }
  $$('#modeSeg button').forEach((b) => clickable(b, () => { stopAll(); setView(b.dataset.view); enterSceneDefaults(b.dataset.view); }));

  function stopAll() {
    S.playing = false; S.sweep = false; S.play3 = false; S.play4 = false;
    if (S.jumpT) { S.jumpT.cancel(); S.jumpT = null; }
    SciSim.tween(S, { day: S.day }, { duration: 0.0001 });
  }
  function enterSceneDefaults(v) {
    if (v === 'orbit') { showHint('화면을 끌어서 돌려 봐요 · 날짜 줄의 점을 눌러요', 5000); }
    if (v === 'cone') { S.eY = 0; showHint('거리 슬라이더를 움직여 봐요', 4500); }
    if (v === 'globe') showHint('▶ 재생을 누르거나 아래 줄을 끌어 봐요 · 지구를 눌러 내 지점도 정해요', 5500);
    if (v === 'lunar') showHint('경로를 고르면 달이 지구 그림자를 지나가요', 4500);
    updateCtl();
  }

  /* ---- ① 날짜·기울기 ---- */
  bindSlider(sDay, oDay, (v) => f1(v) + '일', (v) => { stopMove(v); });
  function stopMove(v) { S.playing = false; if (S.jumpT) { S.jumpT.cancel(); S.jumpT = null; } if (v != null) S.day = v; SciSim.tween(S, { day: S.day }, { duration: 0.0001 }); updateCtl(); }
  function syncDay() { setSlider(sDay, oDay, clamp(S.day, 0, DAYMAX), (v) => f1(v) + '일'); }
  function jumpTo(d) {
    stopMove(); d = clamp(d, 0, DAYMAX);
    if (RM) { S.day = d; syncDay(); return; }
    S.jumpT = SciSim.tween(S, { day: d }, { duration: clamp(Math.abs(d - S.day) / 90, 0.35, 1.1), ease: 'inOutCubic', onUpdate: syncDay, onDone: () => { S.jumpT = null; syncDay(); } });
  }
  function stepSyz(dir) {
    const cur = S.day, list = SYZ.map((s) => s.d);
    let tgt = null;
    if (dir > 0) tgt = list.find((d) => d > cur + 0.15); else for (let i = list.length - 1; i >= 0; i--) if (list[i] < cur - 0.15) { tgt = list[i]; break; }
    if (tgt == null) { say(dir > 0 ? '모형의 끝이에요. ↺ 날짜를 앞으로 돌려 봐요.' : '모형의 처음이에요.', true, 2); return; }
    jumpTo(tgt);
  }
  clickable($('#bPrev'), () => stepSyz(-1));
  clickable($('#bNext'), () => stepSyz(1));
  clickable($('#bPlay'), () => { if (S.playing) { S.playing = false; } else { if (S.jumpT) { S.jumpT.cancel(); S.jumpT = null; } if (S.day >= DAYMAX - 0.2) S.day = 0; S.playing = true; } updateCtl(); });
  bindSlider(sTilt, oTilt, (v) => f1(v) + '°', (v) => { S.tilt = v; });

  /* ---- ② 거리·지구 이동 ---- */
  bindSlider(sDist, oDist, (v) => f1(v / 10000) + '만 km', (v) => { S.coneR = v; });
  clickable($('#bSweep'), () => { S.sweep = !S.sweep; if (S.sweep && Math.abs(S.eY) < 1) S.eY = -10400; updateCtl(); });
  clickable($('#bCenter'), () => { S.sweep = false; S.eY = 0; updateCtl(); });
  const CARD_Q = [
    { q: '(가) 반영 안쪽만 지나가는 지역', a: '부분 일식' },
    { q: '(나) 한 일식 중에 개기에서 금환으로(또는 금환에서 개기로) 바뀌는 경우', a: '혼성 일식' },
    { q: '(다) 본영이 지표에 닿는 지역', a: '개기 일식' },
    { q: '(라) 본영의 끝이 지표에 못 닿아 그 연장 부분이 닿는 지역', a: '금환 일식' },
  ];
  const cardsRows = $('#cardsRows');
  CARD_Q.forEach((c, i) => {
    const row = document.createElement('div'); row.className = 'card-row';
    row.innerHTML = '<div class="q">' + c.q + '</div><select class="mini-sel" data-i="' + i + '" aria-label="' + c.q + '"><option value="">고르세요</option><option>개기 일식</option><option>금환 일식</option><option>부분 일식</option><option>혼성 일식</option></select>';
    cardsRows.appendChild(row);
  });
  $$('#cardsRows select').forEach((s) => s.addEventListener('change', () => { Sound.click(); S.cards[s.dataset.i] = s.value || undefined; }));

  /* ---- ③ 지점·시간 ---- */
  $$('#siteSeg .opt').forEach((b) => clickable(b, () => selectSite(b.dataset.k)));
  function selectSite(k) { if (k === 'P' && !S.custom) return; S.site = k; updateCtl(); }
  bindSlider(sT, oT, (v) => clockStr(v), (v) => { S.play3 = false; S.t = v; updateCtl(); });
  function syncT() { setSlider(sT, oT, clamp(Math.round(S.t / 10) * 10, G.tMin, G.tMax), (v) => clockStr(v)); }
  clickable($('#bPlay3'), () => { if (S.play3) S.play3 = false; else { if (S.t >= G.tMax - 5) S.t = G.tMin; S.play3 = true; } updateCtl(); });
  clickable($('#bReset3'), () => { S.play3 = false; S.t = G.tMin; syncT(); updateCtl(); });
  clickable($('#bDur'), () => {
    const v = parseFloat(($('#inDur').value || '').replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'));
    if (!isFinite(v)) { say('초 단위 숫자를 입력해 주세요.', true, 2); return; }
    const inf = siteInfo(SITES.A), want = Math.round(inf.dia / 10) * 10 / Number(f2(inf.vrel));
    if (Math.abs(v - want) <= want * 0.04) { S.calcOk = true; say('좋아요! 본영 지름을 그림자 속력으로 나누면 ' + Math.round(want) + '초예요.', false, 3); } else say('다시 계산해 봐요: 본영 지름(km)을 그림자 속력(km/s)으로 나누면 몇 초일까요?', true, 3);
  });

  /* ---- ④ 경로·시간 ---- */
  $$('#pathSeg .opt').forEach((b) => clickable(b, () => { S.path = b.dataset.k; S.lp = -LT_MAX; S.play4 = true; updateCtl(); }));
  bindSlider(sL, oL, (v) => fmtMin(v), (v) => { S.play4 = false; S.lp = v; updateCtl(); });
  function syncL() { setSlider(sL, oL, clamp(Math.round(S.lp), -LT_MAX, LT_MAX), (v) => fmtMin(v)); }
  clickable($('#bPlay4'), () => { if (S.play4) S.play4 = false; else { if (S.lp >= LT_MAX - 1) S.lp = -LT_MAX; S.play4 = true; } updateCtl(); });
  clickable($('#bMin'), () => {
    const v = parseFloat(($('#inMin').value || '').replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'));
    if (!isFinite(v)) { say('분 단위 숫자를 입력해 주세요.', true, 2); return; }
    const want = 2 * lunarContacts(0).t;
    if (Math.abs(v - want) <= 4) { S.minOk = true; say('좋아요! 개기 월식은 약 ' + f0(want) + '분 동안 이어져요.', false, 3); } else say('다시 계산해 봐요: (본영 지름 − 달 지름)을 달의 속력으로 나누면 몇 시간일까요?', true, 3);
  });
  const TAB_Q = [
    { q: '밤인 지역이면 어디에서나 볼 수 있어요', a: '월식' },
    { q: '달이 삭일 때 일어나요', a: '일식' },
    { q: '개기 식이 최대 약 7분 30초 동안만 이어져요', a: '일식' },
    { q: '달의 동쪽 가장자리부터 가려지기 시작해요', a: '월식' },
  ];
  const tabRows = $('#tabRows');
  TAB_Q.forEach((c, i) => {
    const row = document.createElement('div'); row.className = 'card-row';
    row.innerHTML = '<div class="q">' + c.q + '</div><select class="mini-sel" data-i="' + i + '" aria-label="' + c.q + '"><option value="">고르세요</option><option>일식</option><option>월식</option></select>';
    tabRows.appendChild(row);
  });
  $$('#tabRows select').forEach((s) => s.addEventListener('change', () => { Sound.click(); S.tab[s.dataset.i] = s.value || undefined; }));

  /* ---------- 포인터 ---------- */
  let ptr = null;
  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'orbit') {
        const L = lay();
        if (p.y >= L.tlY - 6 && p.y <= L.tlY + L.tlH + 6 && p.x >= L.tlX && p.x <= L.tlX + L.tlW) {
          let best = null, bd = 18;
          SYZ.forEach((s) => { const px = tlX(L, s.d), py = L.tlY + L.tlH * (s.kind === 'new' ? 0.3 : 0.72), dd = Math.hypot(px - p.x, py - p.y); if (dd < bd) { bd = dd; best = s; } });
          if (best) jumpTo(best.d); else jumpTo((p.x - L.tlX - 40) / (L.tlW - 56) * DAYMAX);
          return false;
        }
        SciSim.tween(S, { az: S.az }, { duration: 0.0001 }); ptr = { x: p.x, y: p.y, az: S.az, el: S.el }; return true;
      }
      if (S.view === 'cone') {
        const ph = PHONE, x0 = ph ? 56 : 92, kx = (VW - 70 - x0 - (ph ? 30 : 36)) / DIST_MAX, xe = x0 + S.coneRv * kx;
        if (p.y < (ph ? 318 : 338) && Math.abs(p.x - xe) < 60) { S.sweep = false; ptr = { cone: true }; S.eY = clamp((176 - p.y) / 0.0088, -10500, 10500); updateCtl(); return true; }
        return false;
      }
      if (S.view === 'globe') {
        const L = gLay();
        if (p.y >= L.tlY - 6 && p.y <= L.tlY + L.tlH + 6 && p.x >= L.tlX && p.x <= L.tlX + L.tlW) { S.play3 = false; ptr = { tl: true }; setTFromX(p.x, L); updateCtl(); return true; }
        const k = L.R / KM.Re, dx = p.x - L.cx, dy = p.y - L.cy;
        if (Math.hypot(dx, dy) <= L.R) {
          const sites = Object.values(SITES).concat(S.custom ? [S.custom] : []);
          for (const st of sites) { const g = groundPt(st.lat, st.lon, S.t); if (g.z > 0 && Math.hypot(L.cx + g.x * k - p.x, L.cy - g.y * k - p.y) < 16) { selectSite(st.id); return false; } }
          const X = dx / k, Y = -dy / k, sinp = clamp(Y / KM.Re, -1, 1), cp = Math.sqrt(1 - sinp * sinp);
          if (cp > 0.12) {
            const th = Math.asin(clamp(X / (KM.Re * cp), -1, 1)), lat = Math.asin(sinp) / DEG, lon = th / DEG - G.w * S.t / DEG;
            S.custom = { id: 'P', lat: Math.round(lat), lon: Math.round(((lon + 540) % 360) - 180), name: '★' };
            Object.keys(siteCache).forEach((kk) => { if (kk.startsWith('P:')) delete siteCache[kk]; });
            selectSite('P'); Sound.click();
          }
        }
        return false;
      }
      if (S.view === 'lunar') {
        const L = lLay();
        if (p.y >= L.by - 6 && p.y <= L.by + L.bh + 6 && p.x >= L.bx && p.x <= L.bx + L.bw) { S.play4 = false; ptr = { lb: true }; setLFromX(p.x, L); updateCtl(); return true; }
      }
      return false;
    },
    move(p) {
      if (!ptr) return;
      if (S.view === 'orbit') { S.az = ptr.az - (p.x - ptr.x) * 0.012; S.el = clamp(ptr.el + (p.y - ptr.y) * 0.008, 0.18, 1.1); }
      else if (S.view === 'cone' && ptr.cone) S.eY = clamp((176 - p.y) / 0.0088, -10500, 10500);
      else if (S.view === 'globe' && ptr.tl) setTFromX(p.x, gLay());
      else if (S.view === 'lunar' && ptr.lb) setLFromX(p.x, lLay());
    },
    up() { ptr = null; },
    hover(p) {
      if (S.view === 'orbit') { const L = lay(); return p.y > L.tlY - 6 ? 'pointer' : 'grab'; }
      if (S.view === 'globe') return 'pointer';
      if (S.view === 'cone') return 'ns-resize';
      return 'default';
    },
  });
  function setTFromX(x, L) { const ax = L.tlX + 22, aw = L.tlW - 44; S.t = clamp(G.tMin + (x - ax) / aw * (G.tMax - G.tMin), G.tMin, G.tMax); syncT(); }
  function setLFromX(x, L) { const ax = L.bx + 24, aw = L.bw - 48; S.lp = clamp(-LT_MAX + (x - ax) / aw * 2 * LT_MAX, -LT_MAX, LT_MAX); syncL(); }

  /* ======================================================
     단계(STEP)와 미션
     ====================================================== */
  const tb = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
  const settled1 = () => Math.abs(S.tiltV - S.tilt) < 0.05;
  const atSyzNow = () => { const n = nearSyz(S.day); return Math.abs(n.dd) <= 0.11 && n.s && settled1() ? n : null; };

  function enterLevel(li) {
    stopAll(); clearTimeout(hintTimer);
    S.showCards = false; S.showCalc = false; S.showLcalc = false; S.showTab = false;
    if (li === 0) { S.tilt = 5.1; setSlider(sTilt, oTilt, 5.1, (v) => f1(v) + '°'); S.day = 8; SciSim.tween(S, { day: 8 }, { duration: 0.0001 }); syncDay(); S.az = 0.2; S.el = 0.5; setView('orbit'); if (!RM) SciSim.tween(S, { az: 0.95 }, { duration: 1.6, ease: 'inOutCubic' }); showHint('화면을 끌어서 돌려 봐요 · 날짜 줄의 점을 눌러요', 6000); }
    else if (li === 1) { S.coneR = 384400; S.coneRv = 384400; S.eY = 4500; S.eYv = 4500; setSlider(sDist, oDist, 384400, (v) => f1(v / 10000) + '만 km'); setView('cone'); showHint('거리 슬라이더로 본영의 끝을 지구에 닿게 해 봐요', 6000); }
    else if (li === 2) { S.site = 'A'; S.t = G.tMin; syncT(); setView('globe'); S.play3 = false; showHint('▶ 재생을 눌러 그림자가 훑는 모습을 봐요', 6000); }
    else { S.path = 'mid'; S.lp = -LT_MAX; syncL(); setView('lunar'); showHint('경로 ①②③을 눌러 달을 지나가게 해 봐요', 6000); }
    updateCtl();
  }

  const levels = [
    {
      title: '식의 조건: 달 궤도의 기울기와 교점', short: '식의 조건', icon: '🌐', phase: '모형', features: ['orbit', 'nodes'],
      intro: '<p class="si-q">❓ 탐구 질문: 보름과 그믐마다 식이 일어나지 않는 까닭은 무엇이고, 어떤 날은 개기, 어떤 날은 금환이 되는 까닭은 무엇일까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 삭(그믐)에는 일식, 망(보름)에는 월식이 일어날 수 있다고 배웠어요. 그런데 한 달에 한 번씩 삭과 망이 오는데도 식은 1년에 몇 번밖에 없어요.</div>' +
        '<p>이번 차시에서는 <b>3차원 궤도 모형</b>으로 그 까닭을 찾아요. 달의 공전 궤도면은 황도면(지구 공전 궤도면)에 대해 약 <b>5.1°</b> 기울어 있고, 두 면이 만나는 두 점이 <b>교점</b>이에요.</p>' +
        '<p>화면을 끌어서 돌려 보고, 아래 <b>날짜 줄</b>의 점(삭 ● 위쪽 줄, 망 ○ 아래쪽 줄)을 눌러 그날의 달 위치와 하늘 모습을 비교해 봐요. 날짜는 가상의 모형 날짜예요.</p>',
      setup() { enterLevel(0); },
      recap: '식은 삭·망일 때 달이 교점 가까이(황도면 가까이)에 있어야 일어나요. 달 궤도가 황도면에 약 5.1° 기울어 있어 대부분의 삭·망에는 달이 황도면에서 벗어나 있어요.',
      summary: '<ul><li>달의 공전 궤도면은 황도면에 대해 약 <b>5.1°</b> 기울어 있고, 두 면이 만나는 두 점이 <b>교점</b>이에요.</li><li><b>삭</b>에 달이 교점 가까이에 있으면 <b>일식</b>, <b>망</b>에 달이 교점 가까이에 있으면 <b>월식</b>이 일어나요.</li><li>태양이 교점 쪽에 있는 시기(식 계절)에는 삭·망 때 식이 일어날 수 있어요. 그 밖의 시기에는 삭·망이어도 식이 일어나지 않아요.</li><li>궤도 기울기가 0°라면 모든 삭에 일식, 모든 망에 월식이 일어날 거예요.</li><li>일식은 1년에 2~5회, 월식은 0~3회 정도 일어나요(예시).</li></ul>',
      missions: [
        {
          title: '식이 없는 삭과 있는 삭 찾기',
          goal: '날짜 줄이나 <b>삭·망 이동</b> 버튼으로 <b>삭</b>에 맞춰요. ① 일식이 <b>없는</b> 삭 ② 일식이 <b>있는</b> 삭을 찾고, ③ 기울기를 <b>0°</b>로 낮춰 ①의 삭을 다시 봐요.',
          hint: '위쪽 줄(삭)에서 속이 빈 작은 점은 식이 없는 삭, 색이 칠해진 큰 점은 일식이 있는 삭이에요. ③은 ①의 삭에 맞춘 채 기울기 슬라이더를 0°로 내려요. (기울기는 ①②를 찾은 뒤 바꿔요.)',
          hold: 0.5, setup() { S.fl1 = { noEcl: false, ecl: false, tilt0: false }; S.noEclDay = null; setView('orbit'); },
          status: () => '① 일식 없는 삭 ' + mark(S.fl1.noEcl) + ' · ② 일식 있는 삭 ' + mark(S.fl1.ecl) + ' · ③ 기울기 0° ' + mark(S.fl1.tilt0),
          check: () => S.fl1.noEcl && S.fl1.ecl && S.fl1.tilt0,
          explain: '삭이어도 달이 황도면에서 멀리 있으면 달 그림자가 지구를 비켜 가서 일식이 없어요. 교점 가까이에서 삭이 되면 달 그림자가 지구에 닿아 일식이 일어나요. 기울기를 0°로 줄이면 달이 늘 황도면 위에 있어서 <b>모든 삭에 일식</b>이 일어나요. 달 궤도의 기울기가 매달 식이 생기지 않는 까닭이에요.',
        },
        {
          type: 'quiz', title: '매달 식이 일어나지 않는 까닭', goal: '삭과 망이 매달 있는데도 일식과 월식이 매달 일어나지 않는 까닭은 무엇일까요?', setup() { setView('orbit'); },
          choices: ['달의 공전 궤도면이 황도면에 기울어 있어서, 삭·망이어도 달이 황도면에서 벗어나 있는 때가 많기 때문이에요', '달이 지구 그림자보다 항상 작아서 가려지지 않기 때문이에요', '삭과 망이 1년에 몇 번밖에 일어나지 않기 때문이에요', '달이 태양보다 훨씬 멀리 있어서 태양을 가릴 수 없기 때문이에요'],
          answer: 0,
          feedback: ['', '달의 크기가 아니라 달의 위치(황도면에서 벗어난 정도)가 문제예요.', '삭과 망은 약 29.5일마다 번갈아 와요. 그래도 식은 드물어요.', '달이 태양을 가릴 수 있는지는 크기와 거리의 비로 정해져요. 이 문제는 달이 늘 황도면 위에 있지 않다는 점과 관련 있어요.'],
          explain: '달 궤도가 황도면과 5.1° 기울어 있어 삭·망 때 달이 황도면 위나 아래로 벗어나 있으면 달 그림자(일식)나 지구 그림자(월식)가 서로 비켜 가요. <b>삭·망 + 교점 근처</b>일 때만 식이 일어나요.',
        },
      ],
    },
    {
      title: '일식의 종류: 달의 거리와 그림자', short: '일식 종류', icon: '🌑', phase: '탐구', features: ['cone'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 교점 근처의 삭에 일식이 일어난다는 것을 확인했어요. 그런데 같은 일식도 어떤 때는 태양이 완전히 가려지고, 어떤 때는 고리 모양으로 남아요.</div>' +
        '<p>달은 타원 궤도로 공전해서 지구와의 거리가 <b>36.3만 ~ 40.6만 km</b>로 달라져요. 달 그림자에는 <b>본영</b>(태양빛이 완전히 가려진 곳)과 <b>반영</b>(일부만 가려진 곳)이 있고, 본영은 달에서 약 <b>37.3만 km</b>까지 뻗어요.</p>' +
        '<p>거리를 바꿔 본영의 끝이 지표에 닿는지 확인하고, 지구가 그림자를 지나가는 모습을 관찰해요.</p>',
      setup() { enterLevel(1); },
      recap: '달이 가까우면 본영이 지표에 닿아 개기 일식, 멀면 닿지 못해 본영의 연장이 닿는 금환 일식이에요. 반영 안에서는 부분 일식이고, 지구가 둥글어서 한 일식에서 개기와 금환이 모두 나타나면 혼성 일식이에요.',
      summary: tb([['종류', '그림자와 지표', '달·태양 각지름'], ['개기', '본영이 지표에 닿음', '달 ≥ 태양'], ['금환', '본영이 닿지 못해 연장 부분이 닿음', '달 < 태양'], ['부분', '반영만 지남', '—'], ['혼성', '개기와 금환이 모두 나타남', '지표 위치에 따라 바뀜']]) + '<ul><li>지구-달 거리 36.3만 ~ 40.6만 km, 본영 길이 약 37.3만 km예요. 달의 각지름은 약 0.49°~0.55°, 태양은 약 0.53°예요.</li></ul>',
      missions: [
        {
          title: '개기 일식과 금환 일식 만들기',
          goal: '<b>지구-달 거리</b>를 바꿔서 지표에 <b>개기 일식</b>과 <b>금환 일식</b>이 되는 경우를 모두 만들어요. (지구의 한가운데가 그림자 축에 오도록 둬요.)',
          hint: '거리를 36.3만 km쪽으로 줄이면 본영이 지표에 닿아요(개기). 38만 km 쪽으로 늘리면 닿지 못해요(금환). 🎯 버튼을 누르면 지구가 그림자 축 위로 와요.',
          hold: 0.5, setup() { S.fl2 = { total: false, annular: false, hybrid: false }; S.showCards = false; S.sweep = false; setView('cone'); },
          status: () => '개기 ' + mark(S.fl2.total) + ' · 금환 ' + mark(S.fl2.annular),
          check: () => S.fl2.total && S.fl2.annular,
          explain: '본영의 길이는 약 37.3만 km예요. 지표까지 거리가 이보다 짧으면 본영이 지표에 닿아 <b>달이 태양을 모두 가리는 개기 일식</b>, 길면 본영이 닿지 못하고 그 연장(역원뿔)이 닿아 달이 태양보다 작게 보이는 <b>금환 일식</b>이 돼요.',
        },
        {
          title: '일식 종류 짝짓기', manual: true,
          goal: '네 가지 상황이 각각 어떤 일식인지 골라요.',
          hint: '그림에서 본영의 끝이 지표에 닿는지, 반영만 닿는지 보세요. 🎯과 ▶ 그림자 지나가기를 눌러 지구가 그림자를 지나가게 하면 혼성 일식(거리 약 37.4~38.0만 km)도 볼 수 있어요.',
          setup() { S.showCards = true; S.cards = []; $$('#cardsRows select').forEach((s) => (s.value = '')); updateCtl(); },
          status: () => '고른 것 ' + S.cards.filter(Boolean).length + ' / 4',
          check: () => {
            if (S.cards.filter(Boolean).length < 4) return '네 가지 모두 골라 주세요.';
            const bad = CARD_Q.map((c, i) => (S.cards[i] === c.a ? null : i)).filter((v) => v != null);
            if (!bad.length) return true;
            return '(' + ['가', '나', '다', '라'][bad[0]] + ')가 달라요. ' + (bad.length > 1 ? '그 밖에 ' + (bad.length - 1) + '개도 다시 봐요.' : '다시 생각해 봐요.');
          },
          explain: '본영이 지표에 닿으면 <b>개기</b>, 본영의 끝이 못 닿고 그 연장이 닿으면 <b>금환</b>, 반영 안쪽은 <b>부분</b>이에요. 지구는 둥글어서 지표의 가운데는 달에 더 가깝고 가장자리는 더 멀기 때문에, 본영의 끝이 그 사이에 있으면 <b>혼성</b>(개기 ↔ 금환)이 돼요.',
        },
        {
          type: 'quiz', title: '혼성 일식이 생기는 까닭', goal: '한 번의 일식에서 개기 일식과 금환 일식이 모두 나타나는 혼성 일식은 왜 생길까요?', setup() { S.showCards = false; setView('cone'); },
          choices: ['지구가 둥글어서 지표의 가운데는 달에 더 가깝고(본영이 닿음) 가장자리는 더 멀어서(닿지 못함) 한 그림자 길 위에서 둘 다 나타나기 때문이에요', '일식이 진행되는 동안 달이 갑자기 지구에 가까워졌다 멀어지기 때문이에요', '일식 도중에 태양의 크기가 변하기 때문이에요', '일식 도중에 달 궤도의 기울기가 달라지기 때문이에요'],
          answer: 0,
          feedback: ['', '일식이 진행되는 몇 시간 동안 달의 거리는 거의 변하지 않아요. 지표에서 달까지의 거리가 위치마다 다르기 때문이에요.', '태양의 크기(각지름)는 그 짧은 시간 동안 거의 변하지 않아요.', '궤도의 기울기는 일식이 진행되는 동안 변하지 않아요. 지표가 둥글다는 점에 주목해 봐요.'],
          explain: '본영의 끝이 지표의 가운데와 가장자리 사이(달-지구 거리 약 37.3만~38.0만 km)에 있으면, 가운데는 달과 가까워 본영이 닿아 개기, 가장자리는 달과 멀어서 본영의 연장이 닿아 금환이 돼요. 지구가 둥글기 때문에 생기는 <b>혼성 일식</b>이에요.',
        },
      ],
    },
    {
      title: '그림자 궤적: 개기 식은 얼마나 오래?', short: '그림자 궤적', icon: '🌍', phase: '분석', features: ['globe', 'track', 'calc'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 달의 본영이 지표에 닿으면 개기 일식이 된다는 것을 알았어요. 이제 태양 쪽에서 지구를 내려다보며, 그 그림자가 지표를 훑고 지나가는 모습을 분석해요.</div>' +
        '<p>달은 동쪽으로 약 <b>1.0 km/s</b>로 공전하고, 지표는 적도에서 <b>0.46 km/s</b>(위도 φ에서 0.46 × cosφ)로 같은 방향으로 자전해요. 그래서 달 그림자가 지표를 훑는 속력은 <b>약 1.0 − 0.46 cosφ</b>(km/s)예요. 개기 식의 지속 시간은 <b>본영 지름 ÷ 그림자 속력</b>이에요.</p>' +
        '<p>지구의 자전축 기울기와 계절은 생략한 단순한 모형이에요.</p>',
      setup() { enterLevel(2); },
      recap: '달 그림자는 서쪽에서 동쪽으로 약 1.0 − 0.46 cosφ (km/s)의 속력으로 지표를 훑어요. 본영이 지나가는 좁은 띠에서만 개기 식이 보이고, 그 지속 시간은 본영 지름 ÷ 그림자 속력이에요.',
      summary: '<ul><li>그림자 속력 ≈ 1.0 − 0.46 cosφ (km/s): 적도 약 0.54, 위도 30° 약 0.60, 서울(37.5°) 약 0.64 km/s예요.</li><li>개기 식 지속 시간 = 본영 지름 ÷ 그림자 속력. 예) 150 km ÷ 0.6 km/s = <b>250초</b>(약 4분 10초). 최대 약 7분 30초예요.</li><li>본영은 지름이 수백 km에 불과해, 개기 일식은 그림자가 지나가는 <b>좁은 띠</b>에서만 보여요. 반영이 덮는 넓은 지역에서는 부분 일식이에요.</li><li>달은 서쪽에서 동쪽으로 공전하므로 태양은 <b>서쪽 가장자리</b>부터 가려져요.</li></ul>',
      missions: [
        {
          title: '개기 식 지속 시간 계산하기',
          goal: '지점 <b>A</b>의 정보 판에서 <b>본영 지름</b>과 <b>그림자 속력</b>을 읽고, 지속 시간(초)을 구해 적고 <b>📝 기록</b>을 눌러요.',
          hint: '지속 시간(초) = 본영 지름(km) ÷ 그림자 속력(km/s). 정보 판에 적힌 두 숫자를 나눠요.',
          hold: 0.3, setup() { S.calcOk = false; S.showCalc = true; $('#inDur').value = ''; selectSite('A'); setView('globe'); },
          status: () => '계산 기록 ' + mark(S.calcOk),
          check: () => S.calcOk,
          explain: '본영 지름이 약 150 km이고 그림자가 지표를 훑는 속력이 위도 30°에서 약 0.60 km/s(= 1.0 − 0.46 × cos30°)이면, 개기 식은 <b>150 ÷ 0.60 = 250초</b>(약 4분 10초) 동안 이어져요.',
        },
        {
          title: '지점마다 다르게 보이는 일식', goal: '지점 <b>A·B·C</b>를 눌러 시간을 흘려 보며 <b>개기 일식</b>이 보이는 곳, <b>부분 일식</b>이 보이는 곳, <b>식이 없는</b> 곳을 찾아요.',
          hint: '▶ 재생을 누르고 지점을 바꿔 보세요. A는 그림자 중심선 위, B는 북쪽으로 멀리, C는 반영 바깥이에요. 부분 일식은 가려진 정도가 30 % 이상일 때 세요.',
          hold: 0.4, setup() { S.fl3 = { total: false, partial: false, none: false }; S.showCalc = false; setView('globe'); },
          status: () => '개기 ' + mark(S.fl3.total) + ' · 부분 ' + mark(S.fl3.partial) + ' · 식 없음 ' + mark(S.fl3.none),
          check: () => S.fl3.total && S.fl3.partial && S.fl3.none,
          explain: '달 그림자의 <b>본영</b>이 지나가는 좁은 띠(A)에서만 개기 일식이 보여요. <b>반영</b>이 덮는 넓은 지역(B)에서는 가려진 정도만 다른 부분 일식이고, 반영 바깥(C)에서는 일식이 보이지 않아요.',
        },
        {
          type: 'quiz', title: '태양이 가려지는 방향', goal: '일식이 시작될 때 태양은 어느 쪽 가장자리부터 가려질까요? 그 까닭도 골라요.', setup() { setView('globe'); },
          choices: ['서쪽 가장자리부터예요. 달이 서쪽에서 동쪽으로 공전하며 태양 앞을 지나가기 때문이에요', '동쪽 가장자리부터예요. 달이 동쪽에서 서쪽으로 공전하기 때문이에요', '위쪽(북쪽)부터예요. 달이 북쪽에서 남쪽으로 움직이기 때문이에요', '가장자리와 상관없이 한꺼번에 가려져요. 달 그림자가 둥글기 때문이에요'],
          answer: 0,
          feedback: ['', '달은 서쪽에서 동쪽으로 공전해요. 하늘 그림에서 달이 오른쪽(서쪽)에서 들어오는 것을 다시 봐요.', '달의 움직임은 주로 동서 방향이에요. 위아래 방향이 아니에요.', '달은 천천히 움직이므로 서쪽 가장자리부터 가려지기 시작해 몇십 분에 걸쳐 가려져요.'],
          explain: '달은 하루에 약 13°씩 <b>서쪽에서 동쪽으로</b> 공전하며 태양 앞을 지나가요(지구 자전보다 느린 움직임). 그래서 태양은 <b>서쪽 가장자리</b>부터 가려지고 동쪽 가장자리에서 끝나요. 월식은 반대로 달의 <b>동쪽</b> 가장자리부터 지구 그림자에 들어가요.',
        },
      ],
    },
    {
      title: '월식의 종류: 지구 그림자를 지나는 달', short: '월식 종류', icon: '🌕', phase: '모형', features: ['lunar'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 달 그림자가 지구를 훑는 일식을 분석했어요. 이번에는 거꾸로 <b>망</b>일 때 달이 <b>지구 그림자</b> 속으로 들어가는 월식을 살펴봐요.</div>' +
        '<p>달 위치에서 지구의 <b>본영</b>은 지름이 약 <b>9200 km</b>(달 지름 3474 km의 약 2.7배)이고 반영은 그보다 더 넓어요. 달은 지구 그림자를 약 <b>3670 km/h</b>로 가로질러요.</p>' +
        '<p>달이 지나는 경로 ①②③을 골라 개기·부분·반영 월식을 모두 만들어 봐요.</p>',
      setup() { enterLevel(3); },
      recap: '달이 본영에 완전히 들어가면 개기 월식, 일부만 들어가면 부분 월식, 반영만 지나면 반영식이에요. 개기 월식은 (9200 − 3474) ÷ 3670 ≈ 1.6시간(약 94분) 이어지고, 붉게 보이는 것은 지구 대기에서 굴절된 붉은빛 때문이에요.',
      summary: tb([['종류', '달의 경로', '특징'], ['개기 월식', '본영을 완전히 통과', '달이 붉게 보임'], ['부분 월식', '본영을 일부만 통과', '달 일부가 어두워짐'], ['반영식', '반영만 통과', '밝기 변화가 작아 눈으로 구별 어려움']]) + '<ul><li>개기 월식 지속 시간 = (9200 − 3474) ÷ 3670 ≈ 1.6시간 ≈ <b>94분</b>이에요. 본영 접촉부터 끝까지는 (9200 + 3474) ÷ 3670 ≈ 3.5시간이에요.</li><li>일식은 <b>삭</b>에 <b>좁은 지역</b>에서, 월식은 <b>망</b>에 <b>밤인 지구 전체</b>에서 볼 수 있어요.</li><li>월식 때 달이 붉게 보이는 까닭은 지구 대기를 지나며 굴절된 <b>붉은빛</b>이 본영 안으로 들어오기 때문이에요.</li></ul>',
      missions: [
        {
          title: '세 가지 월식 만들고 개기 월식 지속 시간 구하기',
          goal: '경로 ①②③을 골라 <b>개기·부분·반영</b> 월식을 모두 지나가게 하고, 개기 월식의 지속 시간(분)을 구해 <b>📝 기록</b>해요.',
          hint: '경로 ②(가운데)가 개기 월식이에요. 지속 시간 = (본영 지름 9200 km − 달 지름 3474 km) ÷ 달의 속력 3670 km/h를 시간으로 구하고 60을 곱해 분으로 바꿔요.',
          hold: 0.4, setup() { S.fl4 = { 개기: false, 부분: false, 반영: false }; S.minOk = false; S.showLcalc = true; S.showTab = false; $('#inMin').value = ''; setView('lunar'); },
          status: () => '개기 ' + mark(S.fl4.개기) + ' · 부분 ' + mark(S.fl4.부분) + ' · 반영 ' + mark(S.fl4.반영) + ' · 지속 시간 ' + mark(S.minOk),
          check: () => S.fl4.개기 && S.fl4.부분 && S.fl4.반영 && S.minOk,
          explain: '달이 본영 안에 완전히 들어 있는 동안은 달이 움직여야 하는 거리 (9200 − 3474) km = 5726 km를 3670 km/h로 나눈 <b>약 1.56시간 ≈ 94분</b>이에요. 경로가 중심에서 벗어날수록 본영과의 겹침이 줄어 부분 월식이 되고, 본영을 비켜 반영만 지나면 반영식이에요.',
        },
        {
          title: '일식과 월식 비교하기', manual: true, goal: '네 가지 설명이 일식과 월식 중 어느 쪽인지 골라요.',
          hint: '일식은 삭에 달 그림자가 지구에 닿는 현상이고, 월식은 망에 달이 지구 그림자 속으로 들어가는 현상이에요.',
          setup() { S.showLcalc = false; S.showTab = true; S.tab = []; $$('#tabRows select').forEach((s) => (s.value = '')); updateCtl(); },
          status: () => '고른 것 ' + S.tab.filter(Boolean).length + ' / 4',
          check: () => {
            if (S.tab.filter(Boolean).length < 4) return '네 가지 모두 골라 주세요.';
            const bad = TAB_Q.map((c, i) => (S.tab[i] === c.a ? null : i)).filter((v) => v != null);
            return bad.length ? '"' + TAB_Q[bad[0]].q + '"를 다시 생각해 봐요.' : true;
          },
          explain: '월식은 <b>망</b>에 일어나고 달이 지평선 위에 있는 밤의 지구 어디서나 보여요. 일식은 <b>삭</b>에 일어나고 개기 식은 좁은 띠에서 최대 약 7분 30초만 이어져요. 달이 서쪽에서 동쪽으로 움직이므로 월식은 달의 <b>동쪽</b> 가장자리부터, 일식은 태양의 서쪽 가장자리부터 시작돼요.',
        },
        {
          type: 'quiz', title: '월식 때 달이 붉은 까닭', goal: '개기 월식 때 달이 완전히 어두워지지 않고 붉게 보이는 까닭은 무엇일까요?', setup() { S.showTab = false; setView('lunar'); },
          choices: ['지구 대기를 통과하며 굴절된 붉은빛이 본영 안으로 들어와 달을 비추기 때문이에요', '달 표면이 원래 붉은색이어서 어두울 때만 드러나기 때문이에요', '지구 그림자 자체가 붉은색이기 때문이에요', '태양빛이 달 표면에서 반사될 때 붉게 변하기 때문이에요'],
          answer: 0,
          feedback: ['', '달 표면은 회백색이에요. 월식 때 달에 닿는 빛이 달라지는 거예요.', '그림자는 빛이 없는 곳이에요. 붉은색은 본영 안으로 들어온 빛의 색이에요.', '달 표면의 반사는 색을 크게 바꾸지 않아요. 달에 닿기 전 빛의 경로에 주목해 봐요.'],
          explain: '태양빛이 지구 대기를 통과할 때 파란빛은 많이 흩어지고 <b>붉은빛은 굴절되어</b> 지구 뒤쪽 본영 안으로 휘어 들어가요. 이 빛이 달을 비추어 개기 월식 때 달이 구리빛(붉은색)으로 보여요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-eclipse', mount: '#game', badge: '식 시뮬레이터', homeHref: '../../index.html#he',
    featureLabels: { orbit: '🌐 3차원 궤도 모형 · 날짜 줄', nodes: '🟡 교점 · 기울기 슬라이더', cone: '🌑 달 그림자 원뿔 · 거리 슬라이더', globe: '🌍 지구 위의 달 그림자 · 지점 · 시계', lunar: '🌕 지구 그림자 단면 · 월식 경로' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  S.coneRv = S.coneR;
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    // 기울기(부드럽게)
    if (Math.abs(S.tiltV - S.tilt) > 0.002) { S.tiltV = approach(S.tiltV, S.tilt, dt, 10); if (Math.abs(S.tiltV - S.tilt) < 0.004) S.tiltV = S.tilt; refreshSyz(); }
    if (S.playing) { S.day += dt * 9; if (S.day >= DAYMAX) { S.day = DAYMAX; S.playing = false; updateCtl(); } syncDay(); }
    S.coneRv = approach(S.coneRv, S.coneR, dt, 9);
    if (S.sweep) { S.eY += dt * 2800; if (S.eY > 10400) { S.eY = -10400; } S.eYv = S.eY; } else S.eYv = approach(S.eYv, S.eY, dt, 10);
    if (S.play3) {
      const inf = siteInfo(curSite()), inEcl = inf.c1 != null && S.t > inf.c1 - 240 && S.t < inf.c4 + 240;
      S.spd = approach(S.spd || 900, inEcl ? 70 : 900, dt, 4);
      S.t += dt * S.spd; if (S.t >= G.tMax) { S.t = G.tMax; S.play3 = false; updateCtl(); } syncT();
    }
    if (S.play4) { S.lp += dt * 28; if (S.lp >= LT_MAX) { S.lp = LT_MAX; S.play4 = false; updateCtl(); } syncL(); }
    // 진행 기록
    if (S.view === 'orbit') {
      const n = atSyzNow();
      if (n && n.kind === 'new') {
        if (n.s.type === '없음' && S.tilt >= 3) { S.fl1.noEcl = true; S.noEclDay = n.ds; }
        else if (n.s.type !== '없음' && S.tilt >= 3) S.fl1.ecl = true;
        else if (n.s.type !== '없음' && S.tilt <= 0.2 && S.noEclDay != null && Math.abs(n.ds - S.noEclDay) < 1) S.fl1.tilt0 = true;
      }
    }
    if (S.view === 'cone' && Math.abs(S.coneRv - S.coneR) < 150) {
      const lt = localType(S.coneRv, S.eYv);
      if (Math.abs(S.eYv) < KM.Re * 0.35) { if (lt.type === '개기') S.fl2.total = true; if (lt.type === '금환') S.fl2.annular = true; }
    }
    if (S.view === 'globe') {
      const st = siteState(curSite(), S.t), inf = siteInfo(curSite());
      if (st.type === '개기') S.fl3.total = true;
      if (st.type === '부분' && st.obsc >= 0.3) S.fl3.partial = true;
      if (inf.kind === '없음' && Math.abs(S.t) < 4000) S.fl3.none = true;
    }
    if (S.view === 'lunar') { const cn = lunarContacts(PATHS[S.path].off); if (S.lp >= 0 && S.fl4) S.fl4[cn.type] = true; }
    // 그리기
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.view === 'orbit') drawOrbit(t, dt); else if (S.view === 'cone') drawCone(t, dt); else if (S.view === 'globe') drawGlobe(t, dt); else drawLunar(t, dt);
    parts.update(dt); parts.draw(ctx);
    drawFlash(dt, PHONE ? 14 : 12);
    readouts();
  });

  function readouts() {
    const v = S.view;
    if (v === 'orbit') {
      const n = nearSyz(S.day), Dw = norm360(elong(S.day)), h = KM.a * Math.sin(betaOf(S.day, S.tiltV) * DEG), at = Math.abs(n.dd) <= 0.11 && n.s;
      setReadouts(['모형 날짜 · 달 위상', f1(S.day) + '일 · ' + phaseName(Dw), '달의 황도면 높이', (Math.abs(h) < 5 ? '0' : (h > 0 ? '+' : '−') + comma(Math.abs(h))) + ' km', '판정', at ? (n.kind === 'new' ? '삭 · ' : '망 · ') + (n.s.type === '없음' ? '식 없음' : stem(n.s.type, n.kind)) : (seasonOn(S.day) ? '식 계절(삭·망을 찾아요)' : '삭·망을 찾아요')]);
    } else if (v === 'cone') {
      const lt = localType(S.coneRv, S.eYv), Lu = luOf(S.coneRv, KM.dS);
      setReadouts(['지구-달 거리', f1(S.coneRv / 10000) + '만 km', '본영 길이', f1(Lu / 10000) + '만 km', '지금 지표에서', lt.type === '없음' ? '일식 없음' : lt.type === '부분' ? '부분 일식' : lt.type + ' 일식']);
    } else if (v === 'globe') {
      const st = siteState(curSite(), S.t);
      setReadouts(['모형 시계', clockStr(S.t), '지점 ' + curSite().name, st.night ? '밤' : (st.type === '없음' ? '식 없음' : st.type === '부분' ? '부분 일식' : st.type + ' 일식'), '가려진 정도', st.night ? '—' : Math.round(st.obsc * 100) + ' %']);
    } else {
      const cn = lunarContacts(PATHS[S.path].off);
      setReadouts(['경로', PATHS[S.path].name, '월식의 종류', cn.type === '반영' ? '반영식' : cn.type + ' 월식', '최대 식으로부터', fmtMin(S.lp).replace(/^\+0:00$|^−0:00$/, '0:00')]);
    }
  }

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, KM, G, SITES, LU, PATHS, get game() { return game; }, get SYZ() { return SYZ; },
    nearSyz, solarType, lunarType, luOf, localType, siteState, siteInfo, lunarContacts, setView, selectSite, jumpTo, stepSyz, enterLevel, refreshSyz, pathType, curSite, DAYMAX, LT_MAX,
    syncDay, syncT, syncL, updateCtl,
  };
})();
