/* =========================================================
   고등학교 생명과학 Ⅰ. 생명 시스템의 구성 - 군집 속 종간 관계 (단원 10차시)
   성취기준 [12생과01-07] 개체군과 군집의 특성을 이해하고 이들의 상호작용의 예를 조사하여 발표할 수 있다. (군집 내 상호작용 부분)
   ① 모형: 경쟁과 분서 (짚신벌레 배양 병 3개)  ② 분석: 포식과 피식 (그래프 순서, 사례 카드)
   ③ 모형: 공생과 기생 (이익·손해 표 분류)  ④ 적용: 관계 발표 (군집 카드, 발표문, 한 종 없애기)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const L = (a, b) => (PHONE ? b : a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef7f0' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FONT_EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function E(ch, x, y, size, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = size + 'px ' + FONT_EMO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3; }
    ctx.fillStyle = '#000'; ctx.fillText(ch, 0, 0); ctx.restore();
  }
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch.trim() === '' ? '' : ch; } else line = t;
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700);
    ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
    return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function bgFill(top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  /* 선 위의 점 (이차 곡선) */
  function ctl(x1, y1, x2, y2, bend) { const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1; return [(x1 + x2) / 2 - dy / len * bend * 2, (y1 + y2) / 2 + dx / len * bend * 2]; }
  function qPts(x1, y1, x2, y2, bend, n) {
    const c = ctl(x1, y1, x2, y2, bend), out = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * x1 + 2 * u * t * c[0] + t * t * x2, u * u * y1 + 2 * u * t * c[1] + t * t * y2]); }
    return out;
  }
  function cPts(p0, p1, p2, p3, n) {
    const out = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
    return out;
  }
  const ptAt = (pts, f) => { const n = pts.length - 1, v = clamp(f, 0, 1) * n, i = Math.min(n - 1, Math.floor(v)), r = v - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r]; };
  /* 곡선을 prog(0~1)까지 그리고 화살촉을 붙여요 */
  function strokeCurve(pts, prog, col, w, o) {
    o = o || {};
    const n = pts.length - 1, upto = clamp(prog, 0, 1) * n, fi = Math.min(n, Math.floor(upto));
    if (upto <= 0) return null;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w;
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.dash) ctx.setLineDash(o.dash);
    let hx = pts[0][0], hy = pts[0][1], px = hx, py = hy;
    ctx.beginPath(); ctx.moveTo(hx, hy);
    for (let i = 1; i <= fi; i++) { px = hx; py = hy; hx = pts[i][0]; hy = pts[i][1]; ctx.lineTo(hx, hy); }
    if (fi < n && upto > fi) { const f = upto - fi; px = hx; py = hy; hx = pts[fi][0] + (pts[fi + 1][0] - pts[fi][0]) * f; hy = pts[fi][1] + (pts[fi + 1][1] - pts[fi][1]) * f; ctx.lineTo(hx, hy); }
    ctx.stroke(); ctx.setLineDash([]);
    if (!o.noHead && upto > 0.6) {
      const head = o.head || Math.max(10, w * 2.8), dx = hx - px, dy = hy - py, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const bx = hx - ux * head, by = hy - uy * head;
      ctx.beginPath(); ctx.moveTo(hx + ux * 2, hy + uy * 2); ctx.lineTo(bx - uy * head * 0.5, by + ux * head * 0.5); ctx.lineTo(bx + uy * head * 0.5, by - ux * head * 0.5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    return [hx, hy];
  }

  const S = { mode: 'cul', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const jong = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 ? c % 28 : -1; };
  const josa = (w, pair) => { const [a, b] = pair.split('/'); return w + (jong(w) > 0 ? a : b); };
  const josaRo = (w) => { const j = jong(w); return w + (j > 0 && j !== 8 ? '으로' : '로'); };

  /* =========================================================
     ① 경쟁과 분서: 짚신벌레 배양 (개체 수/mL, 가상 예시)
     경쟁 모형: dN1 = r1 N1 (1 - (N1 + a12 N2) / K1), dN2 = r2 N2 (1 - (N2 + a21 N1) / K2)
     자원 겹침 s(0~1)가 클수록 서로의 영향(a12 = 0.8 s, a21 = 1.8 s)이 커져요.
     ========================================================= */
  const CUL_DAYS = 30, CUL_SPEED = 5, SP_COL = ['#2563eb', '#ea580c', '#16a34a'], SP_NM = ['P1', 'P2', 'P3'];
  const MOD = { r1: 0.45, K1: 200, r2: 1.0, K2: 160, A12: 0.8, A21: 1.8, r3: 0.6, K3: 150 };
  function integrate(kind, s) {
    // kind: 'alone' (P1, P2 따로), 'mix' (P1+P2, 겹침 s), 'zone' (P2+P3, 서식 공간이 달라요)
    const dt = 0.02, out = { a: [10], b: [10], a2: null };
    let n1 = 10, n2 = 10, n3 = 10;
    const steps = CUL_DAYS / dt, every = Math.round(0.1 / dt);
    if (kind === 'alone') { out.a2 = [10]; }
    for (let i = 0; i < steps; i++) {
      if (kind === 'alone') {
        n1 += MOD.r1 * n1 * (1 - n1 / MOD.K1) * dt; n2 += MOD.r2 * n2 * (1 - n2 / MOD.K2) * dt;
      } else if (kind === 'mix') {
        const a12 = MOD.A12 * s, a21 = MOD.A21 * s;
        const d1 = MOD.r1 * n1 * (1 - (n1 + a12 * n2) / MOD.K1), d2 = MOD.r2 * n2 * (1 - (n2 + a21 * n1) / MOD.K2);
        n1 += d1 * dt; n2 += d2 * dt; if (n2 < 0.5) n2 = 0;
      } else {
        const d2 = MOD.r2 * n2 * (1 - (n2 + 0.2 * n3) / MOD.K2), d3 = MOD.r3 * n3 * (1 - (n3 + 0.2 * n2) / MOD.K3);
        n2 += d2 * dt; n3 += d3 * dt;
      }
      if ((i + 1) % every === 0) {
        if (kind === 'alone') { out.a.push(n1); out.a2.push(n2); } else if (kind === 'mix') { out.a.push(n1); out.b.push(n2); } else { out.a.push(n2); out.b.push(n3); }
      }
    }
    if (kind === 'alone') out.b = out.a2;
    return out;
  }
  const BOT = [
    { t: '① 단독 배양', sub: 'P1과 P2를 따로 키워요', sp: [0, 1], kind: 'alone' },
    { t: '② 같은 먹이·공간 혼합', sub: 'P1 + P2', sp: [0, 1], kind: 'mix' },
    { t: '③ 서식 공간을 나눈 혼합', sub: 'P2 + P3 (위·아래)', sp: [1, 2], kind: 'zone' },
  ];
  let simCache = {};
  const getSim = (i, s) => { const k = i + ':' + (i === 1 ? s : 0); return simCache[k] || (simCache[k] = integrate(BOT[i].kind, s / 100)); };
  const idxAt = (arr, d) => { const f = clamp(d, 0, CUL_DAYS) * 10, i = Math.min(arr.length - 2, Math.floor(f)); return arr[i] + (arr[i + 1] - arr[i]) * (f - i); };
  const sUsed = (i) => (i !== 1 ? 0 : (S.cul.ran[1] || S.cul.run[1]) && S.cul.sRan[1] != null ? S.cul.sRan[1] : S.cul.s);
  const bottleN = (i, d) => { const r = getSim(i, sUsed(i)); return [idxAt(r.a, d), idxAt(r.b, d)]; };
  const dayInt = (arr, d) => Math.round(arr[Math.round(clamp(d, 0, CUL_DAYS) * 10)] || 0);
  function resetCul() {
    S.cul = { s: 100, ran: [false, false, false], p: [0, 0, 0], run: [false, false, false], sRan: [null, null, null], sel: 1, dots: [[[], []], [[], []], [[], []]], resKey: [null, null, null] };
    const sl = $('#sOv'); if (sl) sl.value = 100;
  }
  const culRunning = () => S.cul.run.some(Boolean);
  function culRun() {
    const q = S.cul; if (culRunning()) return;
    [0, 1, 2].forEach((i) => { const need = !q.ran[i] || (i === 1 && q.sRan[1] !== q.s); if (need) { q.run[i] = true; q.p[i] = 0; q.ran[i] = false; q.dots[i] = [[], []]; q.sRan[i] = i === 1 ? q.s : 0; } });
    if (!culRunning()) { showHint('이미 모두 실행했어요. 겹침을 바꾸면 ② 병을 다시 실행해요.', 3200); return; }
    Sound.click(); updateCtl();
  }
  function stepCul(dt) {
    const q = S.cul; if (!q) return;
    [0, 1, 2].forEach((i) => {
      if (q.run[i]) { q.p[i] = Math.min(CUL_DAYS, q.p[i] + dt * CUL_SPEED); if (q.p[i] >= CUL_DAYS) { q.run[i] = false; q.ran[i] = true; q.p[i] = CUL_DAYS; if (!culRunning()) { Sound.success(); updateCtl(); const n = bottleN(1, CUL_DAYS); if (q.sRan[1] === q.s) showHint(n[1] < 0.5 ? '② 병에서 P2가 밀려나 사라졌어요. 자원이 많이 겹치면 경쟁이 심해져요.' : '② 병에서 P1과 P2가 함께 살아남았어요. 자원이 덜 겹치면 공존해요(분서).', 5200); } } }
    });
  }
  /* 병 모양과 개체 입자 */
  const CP = PHONE ? [0, 1, 2].map((i) => ({ x: 6, y: 6 + i * 210, w: 468, h: 204 })) : [0, 1, 2].map((i) => ({ x: 10 + i * 264, y: 10, w: 252, h: 540 }));
  function flaskRects(i) {
    const c = CP[i];
    if (PHONE) { const bx = c.x + 14, by = c.y + 50, bw = BOT[i].kind === 'alone' ? 52 : 100, bh = 112; return BOT[i].kind === 'alone' ? [{ x: bx, y: by, w: bw, h: bh, sp: 0 }, { x: bx + 62, y: by, w: bw, h: bh, sp: 1 }] : [{ x: bx, y: by, w: bw, h: bh, sp: -1 }]; }
    const bx = c.x + 24, by = c.y + 62, bh = 118;
    return BOT[i].kind === 'alone' ? [{ x: bx, y: by, w: 88, h: bh, sp: 0 }, { x: bx + 116, y: by, w: 88, h: bh, sp: 1 }] : [{ x: c.x + 52, y: by, w: 148, h: bh, sp: -1 }];
  }
  // 종마다 머무는 구역(병 안의 세로 범위 비율)
  function zoneOf(i, k) {
    if (BOT[i].kind === 'alone') return [0, 1];
    if (BOT[i].kind === 'zone') return k === 0 ? [0, 0.5] : [0.5, 1];     // k=0: P2(위), k=1: P3(아래)
    const f = 0.5 + 0.5 * sUsed(1) / 100;   // ② 병: P1은 아래에서 f만큼, P2는 위에서 f만큼
    return k === 0 ? [1 - f, 1] : [0, f];
  }
  function updateDots(i, dt) {
    const q = S.cul, rects = flaskRects(i), [n0, n1] = bottleN(i, q.p[i]);
    const ns = [n0, n1];
    for (let k = 0; k < 2; k++) {
      const arr = q.dots[i][k], want = q.ran[i] || q.run[i] ? Math.round(ns[k] / 2.6) : 0, r = BOT[i].kind === 'alone' ? rects[k] : rects[0];
      const z = zoneOf(i, k);
      let adds = 0;
      while (arr.length < want && adds < 3) { arr.push({ x: Math.random(), y: z[0] + Math.random() * (z[1] - z[0]), vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 }); adds++; }
      let rem = 0; while (arr.length > want && rem < 3) { arr.pop(); rem++; }
      arr.forEach((d) => {
        d.vx += (Math.random() - 0.5) * dt * 1.6; d.vy += (Math.random() - 0.5) * dt * 1.6; d.vx = clamp(d.vx, -0.35, 0.35); d.vy = clamp(d.vy, -0.35, 0.35);
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.x < 0.04) { d.x = 0.04; d.vx = Math.abs(d.vx); } if (d.x > 0.96) { d.x = 0.96; d.vx = -Math.abs(d.vx); }
        if (d.y < z[0] + 0.03) { d.y = z[0] + 0.03; d.vy = Math.abs(d.vy); } if (d.y > z[1] - 0.03) { d.y = z[1] - 0.03; d.vy = -Math.abs(d.vy); }
      });
    }
  }
  function drawFlask(i, t, dt) {
    const q = S.cul, rects = flaskRects(i), kind = BOT[i].kind;
    rects.forEach((r) => {
      D.beaker(r.x, r.y, r.w, r.h, { level: 0.86, liquid: '#bfe8ff', t, ticks: 0, wave: 1 });
      // 구역 표시
      const ly = r.y + 10, lh = r.h - 16;
      if (kind === 'zone') { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(31,45,68,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r.x + 2, ly + lh / 2); ctx.lineTo(r.x + r.w - 2, ly + lh / 2); ctx.stroke(); ctx.restore(); T(r.x + r.w / 2, ly + lh * 0.25 + 4, '위쪽', 12, 'rgba(31,45,68,.7)', 'center', 800); T(r.x + r.w / 2, ly + lh * 0.75 + 4, '아래쪽', 12, 'rgba(31,45,68,.7)', 'center', 800); }
      if (kind === 'mix') {
        const f = 0.5 + 0.5 * sUsed(1) / 100, lo = ly + lh * (1 - f), hi = ly + lh * f;
        ctx.fillStyle = 'rgba(124,58,237,.14)'; ctx.fillRect(r.x + 3, Math.min(lo, hi), r.w - 6, Math.abs(hi - lo));
        if (f > 0.505) T(r.x + r.w / 2, (lo + hi) / 2 + 4, '겹침', 12, '#6d28d9', 'center', 800);
      }
    });
    for (let k = 0; k < 2; k++) {
      const r = kind === 'alone' ? rects[k] : rects[0], sp = BOT[i].sp[k], z = zoneOf(i, k), ly = r.y + 10, lh = r.h - 16;
      q.dots[i][k].forEach((d) => { D.sphere(r.x + 6 + d.x * (r.w - 12), ly + d.y * lh, 3.2, SP_COL[sp], { gloss: false, outline: '#fff', outlineWidth: 0.8 }); });
    }
    // 이름 표
    const c = CP[i];
    if (kind === 'alone') { rects.forEach((r, k) => D.label(r.x + r.w / 2, r.y + r.h + 18, SP_NM[k], { bg: SP_COL[k], size: 13 })); }
    else { D.label(rects[0].x + rects[0].w * 0.25, rects[0].y + rects[0].h + 18, SP_NM[BOT[i].sp[0]], { bg: SP_COL[BOT[i].sp[0]], size: 13 }); D.label(rects[0].x + rects[0].w * 0.75, rects[0].y + rects[0].h + 18, SP_NM[BOT[i].sp[1]], { bg: SP_COL[BOT[i].sp[1]], size: 13 }); }
  }
  function drawCulGraph(i, t) {
    const q = S.cul, c = CP[i];
    const g = PHONE ? { x: c.x + 188, y: c.y + 42, w: c.w - 214, h: 104 } : { x: c.x + 44, y: c.y + 258, w: c.w - 66, h: 190 };
    const gx_ = (d) => g.x + d / CUL_DAYS * g.w, gy_ = (v) => g.y + g.h - clamp(v / 250, 0, 1) * g.h;
    ctx.fillStyle = '#fbfdff'; ctx.fillRect(g.x, g.y, g.w, g.h); ctx.strokeStyle = '#e3eaf3'; ctx.lineWidth = 1;
    for (let v = 0; v <= 250; v += 50) { const y = gy_(v); ctx.beginPath(); ctx.moveTo(g.x, y); ctx.lineTo(g.x + g.w, y); ctx.stroke(); if (v % 100 === 0) T(g.x - 5, y + 4.5, String(v), 12.5, '#5d6879', 'right', 700); }
    for (let d = 0; d <= CUL_DAYS; d += 10) { const x = gx_(d); ctx.beginPath(); ctx.moveTo(x, g.y); ctx.lineTo(x, g.y + g.h); ctx.stroke(); T(x, g.y + g.h + 16, String(d), 12.5, '#5d6879', 'center', 700); }
    ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x, g.y + g.h); ctx.lineTo(g.x + g.w, g.y + g.h); ctx.stroke();
    T(g.x + g.w / 2, g.y + g.h + 33, '시간 (일)', 12.5, '#34445c', 'center', 800);
    if (!PHONE) { ctx.save(); ctx.translate(c.x + 14, g.y + g.h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, '개체 수 (마리/mL)', 12.5, '#34445c', 'center', 800); ctx.restore(); }
    const prog = q.run[i] ? q.p[i] : q.ran[i] ? CUL_DAYS : 0;
    if (prog > 0) {
      const r = getSim(i, sUsed(i));
      [['a', 0], ['b', 1]].forEach(([key, k]) => {
        const arr = r[key], sp = BOT[i].sp[k]; ctx.save(); ctx.strokeStyle = SP_COL[sp]; ctx.lineWidth = 3.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; if (BOT[i].kind === 'alone' && k === 1) ctx.setLineDash([]); ctx.beginPath();
        const last = Math.floor(prog * 10); for (let j = 0; j <= last; j++) { const x = gx_(j / 10), y = gy_(arr[j]); j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke(); ctx.restore(); D.sphere(gx_(prog), gy_(idxAt(arr, prog)), 5, SP_COL[sp], { gloss: false, outline: '#fff', outlineWidth: 1.5 });
      });
      if (q.ran[i] && i === 1) { const arr = r.b, z = arr.findIndex((v, j) => j > 20 && v === 0); if (z > 0) { const x = gx_(Math.ceil(z / 10)); ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, g.y); ctx.lineTo(x, g.y + g.h); ctx.stroke(); ctx.restore(); D.label(x, g.y + 14, 'P2 ' + Math.ceil(z / 10) + '일째 0', { bg: '#dc2626', size: 12.5 }); } }
    } else T(g.x + g.w / 2, g.y + g.h / 2 + 5, '▶ 실행해요', PHONE ? 13.5 : 14.5, '#9aa9bd', 'center', 800);
    // 결과 한 줄
    if (q.ran[i]) {
      const r = getSim(i, sUsed(i)), fin = [dayInt(r.a, CUL_DAYS), dayInt(r.b, CUL_DAYS)];
      let msg, col;
      if (BOT[i].kind === 'alone') { msg = '둘 다 S자 곡선: P1 ' + fin[0] + ' · P2 ' + fin[1]; col = '#475569'; }
      else if (fin[1] === 0 && BOT[i].kind === 'mix') { msg = 'P2가 밀려나 사라졌어요 (경쟁)'; col = '#b91c1c'; }
      else { msg = '두 종이 함께 살아남아요 (분서 · 공존)'; col = '#15803d'; }
      if (PHONE) T(c.x + 188, c.y + 198, msg, 13, col, 'left', 800); else textBlock(c.x + 14, c.y + 500, c.w - 28, msg + (BOT[i].kind === 'alone' ? '' : ' · ' + SP_NM[BOT[i].sp[0]] + ' ' + fin[0] + ' · ' + SP_NM[BOT[i].sp[1]] + ' ' + fin[1]), 13.5, col, 19, 800);
    }
  }
  function drawCul(dt, t) {
    const q = S.cul;
    bgFill('#e8f3f9', '#f1f8ef');
    for (let i = 0; i < 3; i++) {
      const c = CP[i];
      panel(c.x, c.y, c.w, c.h, 16);
      T(c.x + 14, c.y + 28, BOT[i].t, PHONE ? 15 : 16, '#26324a', 'left', 800);
      const stale = i === 1 && q.ran[1] && q.sRan[1] !== q.s;
      T(c.x + 14, c.y + 48, i === 1 ? (stale ? '겹침 ' + q.s + ' % → ▶ 다시 실행해요' : BOT[i].sub + ' · 자원 겹침 ' + sUsed(1) + ' %') : BOT[i].sub, PHONE ? 13 : 13.5, stale ? '#b91c1c' : '#64748b', 'left', 700);
      updateDots(i, dt); drawFlask(i, t, dt); drawCulGraph(i, t);
      if (q.run[i]) D.label(c.x + c.w - 54, c.y + 26, Math.floor(q.p[i]) + '일째', { bg: '#0f766e', size: 13 });
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ② 포식과 피식 (가상 자료): 피식자 정점 약 2.5년 뒤 포식자 정점, 약 10년 주기
     ========================================================= */
  const PP_YEARS = 30, PERIOD = 10, LAG = 2.5;
  const PREY = (t) => 600 - 400 * Math.cos(TAU * t / PERIOD), PRED = (t) => 60 - 40 * Math.cos(TAU * (t - LAG) / PERIOD);
  const PP_EV = [      // 카드 번호 → 그래프의 변화 시점 (한 주기: 10~20년)
    { txt: '피식자(토끼)가\n늘어난다', t: 10, who: 'prey', col: '#16a34a' },
    { txt: '포식자(여우)가\n늘어난다', t: 12.5, who: 'pred', col: '#ea580c' },
    { txt: '피식자(토끼)가\n줄어든다', t: 15, who: 'prey', col: '#16a34a' },
    { txt: '포식자(여우)가\n줄어든다', t: 17.5, who: 'pred', col: '#ea580c' },
  ];
  const PP_SHOW = [2, 0, 3, 1];                       // 화면에 보이는 카드 순서(섞어 둠)
  const PPG = PHONE ? { x: 6, y: 6, w: 468, h: 306 } : { x: 10, y: 10, w: 780, h: 336 };
  const PPB = PHONE ? { x: PPG.x + 46, y: PPG.y + 40, w: PPG.w - 92, h: PPG.h - 92 } : { x: PPG.x + 62, y: PPG.y + 42, w: PPG.w - 124, h: PPG.h - 96 };
  const PPA = PHONE ? { x: 6, y: 320, w: 468, h: 124 } : { x: 10, y: 356, w: 400, h: 194 };
  const PPC = PHONE ? { x: 6, y: 452, w: 468, h: 182 } : { x: 420, y: 356, w: 370, h: 194 };
  const px_ = (yr) => PPB.x + yr / PP_YEARS * PPB.w, pyPrey = (v) => PPB.y + PPB.h - clamp(v / 1000, 0, 1) * PPB.h, pyPred = (v) => PPB.y + PPB.h - clamp(v / 100, 0, 1) * PPB.h;
  const PC_PREY = '#16a34a', PC_PRED = '#ea580c';
  function resetPP() {
    S.pp = { t: 0, play: false, seq: [], lag: '', animals: { prey: [], pred: [] }, pop: [1, 1, 1, 1], bad: false, shakeT: -9, solved: false };
    const sel = $('#lagSel'); if (sel) { sel.value = ''; sel.classList.remove('ok', 'bad'); }
  }
  const ppCard = (j) => PHONE ? { x: PPC.x + 8 + (j % 2) * 232, y: PPC.y + 34 + Math.floor(j / 2) * 62, w: 224, h: 56 } : { x: PPC.x + 10 + (j % 2) * 180, y: PPC.y + 44 + Math.floor(j / 2) * 72, w: 170, h: 64 };
  function ppDown(p) {
    const q = S.pp;
    if (p.x >= PPB.x && p.x <= PPB.x + PPB.w && p.y >= PPB.y && p.y <= PPB.y + PPB.h) { q.t = clamp((p.x - PPB.x) / PPB.w * PP_YEARS, 0, PP_YEARS); q.play = false; updateCtl(); return true; }
    for (let j = 0; j < 4; j++) {
      const r = ppCard(j), ci = PP_SHOW[j];
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        const at = q.seq.indexOf(ci);
        if (at >= 0) { q.seq.splice(at); } else q.seq.push(ci);
        q.bad = false; q.pop[j] = 0.4; SciSim.tween(q.pop, { [j]: 1 }, { duration: 0.35, ease: 'outBack' }); Sound.click(); return false;
      }
    }
    return false;
  }
  function ppMove(p) { const q = S.pp; if (p.x >= PPB.x - 4 && p.x <= PPB.x + PPB.w + 4) q.t = clamp((p.x - PPB.x) / PPB.w * PP_YEARS, 0, PP_YEARS); }
  function stepPP(dt) {
    const q = S.pp; if (!q) return;
    if (q.play) { q.t += dt * 3; if (q.t >= PP_YEARS) { q.t = PP_YEARS; q.play = false; updateCtl(); } }
    // 장면의 동물 수는 그래프 시점의 개체 수를 따라가요 (토끼 1마리 = 40마리, 여우 1마리 = 4마리)
    const nPrey = Math.round(PREY(q.t) / 40), nPred = Math.round(PRED(q.t) / 4);
    const A = PPA;
    const mk = (k) => ({ x: A.x + 20 + Math.random() * (A.w - 40), y: A.y + 44 + Math.random() * (A.h - 70), vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, hunt: -1 });
    while (q.animals.prey.length < nPrey) q.animals.prey.push(mk());
    while (q.animals.prey.length > nPrey) q.animals.prey.pop();
    while (q.animals.pred.length < nPred) q.animals.pred.push(mk());
    while (q.animals.pred.length > nPred) q.animals.pred.pop();
    q.animals.pred.forEach((f) => {
      let best = null, bd = 1e9; q.animals.prey.forEach((r) => { const d = Math.hypot(r.x - f.x, r.y - f.y); if (d < bd) { bd = d; best = r; } });
      if (best) { const sp = 34; f.vx += ((best.x - f.x) / (bd + 1) * sp - f.vx) * dt * 2; f.vy += ((best.y - f.y) / (bd + 1) * sp - f.vy) * dt * 2; }
      f.x += f.vx * dt; f.y += f.vy * dt;
    });
    q.animals.prey.forEach((r) => {
      let near = null, nd = 70; q.animals.pred.forEach((f) => { const d = Math.hypot(r.x - f.x, r.y - f.y); if (d < nd) { nd = d; near = f; } });
      if (near) { r.vx += ((r.x - near.x) / (nd + 1) * 46 - r.vx) * dt * 3; r.vy += ((r.y - near.y) / (nd + 1) * 46 - r.vy) * dt * 3; } else { r.vx += (Math.random() - 0.5) * dt * 40; r.vy += (Math.random() - 0.5) * dt * 40; r.vx = clamp(r.vx, -26, 26); r.vy = clamp(r.vy, -26, 26); }
      r.x += r.vx * dt; r.y += r.vy * dt;
    });
    [q.animals.prey, q.animals.pred].forEach((arr) => arr.forEach((a) => { if (a.x < A.x + 14) { a.x = A.x + 14; a.vx = Math.abs(a.vx); } if (a.x > A.x + A.w - 14) { a.x = A.x + A.w - 14; a.vx = -Math.abs(a.vx); } if (a.y < A.y + 40) { a.y = A.y + 40; a.vy = Math.abs(a.vy); } if (a.y > A.y + A.h - 14) { a.y = A.y + A.h - 14; a.vy = -Math.abs(a.vy); } }));
  }
  function drawPP(dt, t) {
    const q = S.pp;
    bgFill('#eef7ee', '#f3fbf0');
    panel(PPG.x, PPG.y, PPG.w, PPG.h, 16);
    T(PPG.x + 16, PPG.y + 26, PHONE ? '📈 개체 수 (가상 자료)' : '📈 피식자와 포식자의 개체 수 (가상 자료)', PHONE ? 13.5 : 15.5, '#26324a', 'left', 800);
    ctx.fillStyle = '#fbfdff'; ctx.fillRect(PPB.x, PPB.y, PPB.w, PPB.h); ctx.strokeStyle = '#e3eaf3'; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) { const y = PPB.y + PPB.h - i / 5 * PPB.h; ctx.beginPath(); ctx.moveTo(PPB.x, y); ctx.lineTo(PPB.x + PPB.w, y); ctx.stroke(); T(PPB.x - 7, y + 4.5, String(i * 200), 12.5, PC_PREY, 'right', 800); T(PPB.x + PPB.w + 7, y + 4.5, String(i * 20), 12.5, PC_PRED, 'left', 800); }
    for (let yr = 0; yr <= PP_YEARS; yr += 5) { const x = px_(yr); ctx.beginPath(); ctx.moveTo(x, PPB.y); ctx.lineTo(x, PPB.y + PPB.h); ctx.stroke(); T(x, PPB.y + PPB.h + 18, String(yr), 12.5, '#5d6879', 'center', 700); }
    ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PPB.x, PPB.y); ctx.lineTo(PPB.x, PPB.y + PPB.h); ctx.lineTo(PPB.x + PPB.w, PPB.y + PPB.h); ctx.lineTo(PPB.x + PPB.w, PPB.y); ctx.stroke();
    T(PPB.x + PPB.w / 2, PPB.y + PPB.h + 38, '시간 (년)', 13, '#34445c', 'center', 800);
    ctx.save(); ctx.translate(PPG.x + 14, PPB.y + PPB.h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, '🐇 피식자 수', 13, PC_PREY, 'center', 800); ctx.restore();
    ctx.save(); ctx.translate(PPG.x + PPG.w - 12, PPB.y + PPB.h / 2); ctx.rotate(Math.PI / 2); T(0, 0, '🦊 포식자 수', 13, PC_PRED, 'center', 800); ctx.restore();
    const curve = (fn, ymap, col) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3.6; ctx.lineJoin = 'round'; ctx.beginPath(); for (let yr = 0; yr <= PP_YEARS + 1e-6; yr += 0.25) { const x = px_(yr), y = ymap(fn(yr)); yr === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); };
    curve(PREY, pyPrey, PC_PREY); curve(PRED, pyPred, PC_PRED);
    // 정점 시차 (두 번째 주기)
    [[15, '#16a34a'], [17.5, '#ea580c']].forEach((p) => { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = p[1]; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px_(p[0]), PPB.y); ctx.lineTo(px_(p[0]), PPB.y + PPB.h); ctx.stroke(); ctx.restore(); });
    // 변화 시점 표지
    PP_EV.forEach((e, ci) => {
      const x = px_(e.t), y = e.who === 'prey' ? pyPrey(PREY(e.t)) : pyPred(PRED(e.t)), at = q.seq.indexOf(ci);
      if (at >= 0) { D.sphere(x, y, 13, e.col, { gloss: false, outline: '#fff', outlineWidth: 2.5, text: String(at + 1), textScale: 1.2 }); }
      else { ctx.save(); ctx.strokeStyle = e.col; ctx.lineWidth = 2.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
    });
    // 시점 표시선
    const cx = px_(q.t); ctx.save(); ctx.strokeStyle = 'rgba(31,45,68,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, PPB.y); ctx.lineTo(cx, PPB.y + PPB.h); ctx.stroke(); ctx.restore();
    D.sphere(cx, pyPrey(PREY(q.t)), 5.5, PC_PREY, { gloss: false, outline: '#fff', outlineWidth: 1.5 }); D.sphere(cx, pyPred(PRED(q.t)), 5.5, PC_PRED, { gloss: false, outline: '#fff', outlineWidth: 1.5 });
    D.label(PPG.x + PPG.w - (PHONE ? 112 : 130), PPG.y + 24, Math.round(q.t * 10) / 10 + '년 · 🐇 ' + Math.round(PREY(q.t)) + ' · 🦊 ' + Math.round(PRED(q.t)), { bg: '#1f2d44', size: PHONE ? 12.5 : 13.5 });
    // 장면
    panel(PPA.x, PPA.y, PPA.w, PPA.h, 16);
    T(PPA.x + 14, PPA.y + 26, '🌿 초원 (🐇 1마리 = 40마리, 🦊 1마리 = 4마리)', PHONE ? 13 : 14, '#26324a', 'left', 800);
    ctx.save(); D.roundRect(PPA.x + 6, PPA.y + 34, PPA.w - 12, PPA.h - 40, 12); ctx.clip(); ctx.fillStyle = '#d9efc6'; ctx.fillRect(PPA.x, PPA.y, PPA.w, PPA.h);
    q.animals.prey.forEach((r) => E('🐇', r.x, r.y, 19, { flip: r.vx > 0 })); q.animals.pred.forEach((f) => E('🦊', f.x, f.y, 24, { flip: f.vx > 0 })); ctx.restore();
    // 카드
    panel(PPC.x, PPC.y, PPC.w, PPC.h, 16);
    if (q.solved) T(PPC.x + 14, PPC.y + 26, '✅ 포식자의 정점은 피식자보다 약 2~3년 늦어요', PHONE ? 13.5 : 14.5, '#15803d', 'left', 800); else T(PPC.x + 14, PPC.y + 26, '변화가 일어나는 순서대로 눌러요 (① → ④)', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    for (let j = 0; j < 4; j++) {
      const r = ppCard(j), ci = PP_SHOW[j], at = q.seq.indexOf(ci), pop = clamp(q.pop[j], 0, 1.1), e = PP_EV[ci];
      const sk = q.bad && at >= 0 ? Math.sin(t * 40) * 2.5 * Math.max(0, 1 - (t - q.shakeT) * 2.2) : 0;
      ctx.save(); ctx.translate(r.x + r.w / 2 + sk, r.y + r.h / 2); ctx.scale(0.95 + 0.05 * pop, 0.95 + 0.05 * pop);
      D.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 12); ctx.fillStyle = at >= 0 ? C.rgba(e.col, 0.14) : '#fff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = q.bad && at >= 0 ? '#dc2626' : at >= 0 ? e.col : '#cbd5e1'; ctx.setLineDash(at >= 0 ? [] : [6, 4]); ctx.stroke(); ctx.setLineDash([]);
      textBlock(-r.w / 2 + (at >= 0 ? 44 : 14), -6, r.w - (at >= 0 ? 54 : 24), e.txt, PHONE ? 13.5 : 14, '#1f2d44', 18, 800);
      if (at >= 0) D.sphere(-r.w / 2 + 24, 0, 14, q.bad ? '#dc2626' : e.col, { gloss: false, text: String(at + 1), textScale: 1.1 });
      ctx.restore();
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* 사례 카드: 포식자 지정, 포식자이면서 피식자인 생물 */
  const PAIRS = [
    { a: ['🦁', '사자'], b: ['🦓', '얼룩말'], pred: 0, note: '사자가 얼룩말을 잡아먹어요.' },
    { a: ['🐞', '무당벌레'], b: ['🐛', '진딧물'], pred: 0, note: '무당벌레가 진딧물을 잡아먹어요.' },
    { a: ['🦉', '올빼미'], b: ['🐭', '쥐'], pred: 0, note: '올빼미가 쥐를 잡아먹어요.' },
  ];
  const CHAIN = [['🦗', '메뚜기'], ['🐸', '개구리'], ['🐍', '뱀'], ['🦅', '매']];
  const CHAIN_DUAL = [1, 2];                 // 포식자이면서 피식자인 생물
  const CSP = PHONE ? { y: 6, h: 250 } : { y: 14, h: 232 };
  const pairRect = (i) => PHONE ? { x: 6 + i * 158, y: CSP.y, w: 152, h: CSP.h } : { x: 10 + i * 264, y: CSP.y, w: 252, h: CSP.h };
  const pairTile = (i, k) => { const r = pairRect(i); return PHONE ? { x: r.x + 8, y: r.y + 54 + k * 94, w: r.w - 16, h: 86 } : { x: r.x + 10 + k * 120, y: r.y + 60, w: 112, h: 150 }; };
  const chainTile = (j) => PHONE ? { x: 12 + j * 114, y: 330, w: 102, h: 130 } : { x: 36 + j * 190, y: 306, w: 150, h: 150 };
  function resetCase() { S.cs = { pick: [null, null, null], dual: {}, pop: [1, 1, 1], bad: {}, shakeT: -9, solved: false }; }
  const csPicked = () => S.cs.pick.filter((x) => x != null).length;
  const csPairOK = () => S.cs.pick.filter((v, i) => v === PAIRS[i].pred).length;
  const csDualSet = () => Object.keys(S.cs.dual).filter((k) => S.cs.dual[k]).map(Number).sort();
  function caseDown(p) {
    const q = S.cs; if (q.solved) return false;
    for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) { const r = pairTile(i, k); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { q.pick[i] = q.pick[i] === k ? null : k; delete q.bad['p' + i]; q.pop[i] = 0.4; SciSim.tween(q.pop, { [i]: 1 }, { duration: 0.35, ease: 'outBack' }); Sound.click(); return false; } }
    for (let j = 0; j < 4; j++) { const r = chainTile(j); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { q.dual[j] = !q.dual[j]; delete q.bad.chain; Sound.click(); return false; } }
    return false;
  }
  function drawCase(dt, t) {
    const q = S.cs;
    bgFill('#eef7ee', '#f3fbf0');
    for (let i = 0; i < 3; i++) {
      const r = pairRect(i), bad = q.bad['p' + i], sk = bad ? Math.sin(t * 40) * 2.5 * Math.max(0, 1 - (t - q.shakeT) * 2.2) : 0;
      ctx.save(); ctx.translate(sk, 0);
      panel(r.x, r.y, r.w, r.h, 16);
      if (bad) { D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.lineWidth = 3.5; ctx.strokeStyle = '#dc2626'; ctx.stroke(); }
      T(r.x + r.w / 2, r.y + 30, '사례 ' + (i + 1), PHONE ? 14 : 15.5, '#26324a', 'center', 800);
      for (let k = 0; k < 2; k++) {
        const tl = pairTile(i, k), an = k === 0 ? PAIRS[i].a : PAIRS[i].b, sel = q.pick[i];
        const isPred = sel === k, isPrey = sel != null && sel !== k;
        D.roundRect(tl.x, tl.y, tl.w, tl.h, 14); ctx.fillStyle = isPred ? '#ffedd5' : isPrey ? '#dcfce7' : '#f8fafc'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = isPred ? '#ea580c' : isPrey ? '#16a34a' : '#cbd5e1'; ctx.setLineDash(sel == null ? [6, 4] : []); ctx.stroke(); ctx.setLineDash([]);
        const bob = RM ? 0 : Math.sin(t * 2.4 + i + k) * 2;
        E(an[0], tl.x + tl.w / 2, tl.y + (PHONE ? 26 : 54) + bob, PHONE ? 36 : 58);
        T(tl.x + tl.w / 2, tl.y + (PHONE ? 59 : 104), an[1], PHONE ? 14 : 15.5, '#1f2d44', 'center', 800);
        const lab = isPred ? '🍽️ 포식자' : isPrey ? '🐾 피식자' : '👆 누르기';
        T(tl.x + tl.w / 2, tl.y + (PHONE ? 79 : 134), lab, PHONE ? 13.5 : 14.5, isPred ? '#c2410c' : isPrey ? '#15803d' : '#94a3b8', 'center', 800);
      }
      ctx.restore();
    }
    // 먹이 사슬
    const yh = PHONE ? 296 : 282;
    T(PHONE ? 12 : 36, yh, '🔗 먹이 사슬에서 포식자이면서 피식자인 생물을 모두 눌러요', PHONE ? 13.5 : 16, '#26324a', 'left', 800);
    for (let j = 0; j < 4; j++) {
      const r = chainTile(j), on = q.dual[j], sk = q.bad.chain && on !== (CHAIN_DUAL.indexOf(j) >= 0) ? Math.sin(t * 40) * 2.5 * Math.max(0, 1 - (t - q.shakeT) * 2.2) : 0;
      ctx.save(); ctx.translate(sk, 0);
      D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = on ? '#fef9c3' : '#fff'; ctx.fill(); ctx.lineWidth = on ? 3.5 : 2; ctx.strokeStyle = q.bad.chain ? '#dc2626' : on ? '#ca8a04' : '#cbd5e1'; ctx.setLineDash(on ? [] : [6, 4]); ctx.stroke(); ctx.setLineDash([]);
      E(CHAIN[j][0], r.x + r.w / 2, r.y + (PHONE ? 44 : 54), PHONE ? 44 : 58);
      T(r.x + r.w / 2, r.y + (PHONE ? 88 : 104), CHAIN[j][1], PHONE ? 14 : 15.5, '#1f2d44', 'center', 800);
      T(r.x + r.w / 2, r.y + (PHONE ? 114 : 132), on ? '⭐ 둘 다' : '👆 누르기', PHONE ? 13 : 14, on ? '#a16207' : '#94a3b8', 'center', 800);
      ctx.restore();
      if (j < 3) { const a = chainTile(j), b = chainTile(j + 1); D.arrow(a.x + a.w + 3, a.y + a.h / 2, b.x - 3, b.y + b.h / 2, { color: '#64748b', width: 3, head: 9 }); }
    }
    T(PHONE ? 240 : 400, PHONE ? 486 : 488, '화살표는 잡아먹히는 쪽에서 잡아먹는 쪽으로 향해요 (잡아먹는 쪽 = 포식자)', PHONE ? 12.5 : 14, '#64748b', 'center', 700);
    if (q.solved) D.label(PHONE ? 240 : 400, PHONE ? 520 : 526, '✅ 개구리와 뱀은 포식자이면서 피식자예요', { bg: '#15803d', size: PHONE ? 13 : 14.5 });
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ③ 공생과 기생: 이익·손해 표(+ / 0 / −)에 사례 카드 8장 옮기기
     ========================================================= */
  const COLS = [
    { n: '상리 공생', sg: ['+', '+'], desc: '두 종 모두 이익', c: '#16a34a' },
    { n: '편리 공생', sg: ['+', '0'], desc: '한 종만 이익, 다른 종은 이익도 손해도 없음', c: '#65a30d' },
    { n: '기생', sg: ['+', '−'], desc: '한 종은 이익, 다른 종은 손해', c: '#7c3aed' },
  ];
  const SYM = [
    { a: ['🌱', '콩과 식물'], b: ['🦠', '뿌리혹박테리아'], short: '콩과 식물 · 뿌리혹박테리아', type: 0, ab: '양분과 서식처', ba: '질소 양분', fact: '뿌리혹박테리아는 공기 중 질소를 식물이 쓸 수 있는 양분으로 바꿔 주고, 식물은 박테리아에게 양분과 살 곳을 줘요.' },
    { a: ['🌺', '말미잘'], b: ['🐠', '흰동가리'], short: '말미잘 · 흰동가리', type: 0, ab: '독 촉수로 보호', ba: '천적을 쫓고 찌꺼기 청소', fact: '흰동가리는 말미잘 촉수 사이에서 보호를 받고, 말미잘은 흰동가리 덕분에 천적을 피하고 몸이 깨끗해져요.' },
    { a: ['🐜', '개미'], b: ['🐛', '진딧물'], short: '개미 · 진딧물', type: 0, ab: '천적에게서 보호', ba: '달콤한 분비물', fact: '진딧물은 개미에게 단 분비물을 주고, 개미는 진딧물을 천적에게서 지켜 줘요.' },
    { a: ['🦈', '상어'], b: ['🐟', '빨판상어'], short: '빨판상어 · 상어', type: 1, ab: '이동 수단과 먹이 부스러기', ba: '', fact: '빨판상어는 상어에 붙어 이동하며 먹이 부스러기를 얻고, 상어는 이익도 손해도 없어요.' },
    { a: ['🐋', '고래'], b: ['🐚', '따개비'], short: '따개비 · 고래', type: 1, ab: '붙어 살 곳과 먹이가 많은 곳으로 이동', ba: '', fact: '따개비는 고래 몸에 붙어 먹이가 많은 곳으로 이동하고, 고래는 거의 영향을 받지 않아요.' },
    { a: ['🌳', '참나무'], b: ['🌿', '겨우살이'], short: '겨우살이 · 참나무', type: 2, ab: '물과 양분을 빼앗김', ba: '', fact: '겨우살이는 참나무에서 물과 양분을 빼앗아 살고, 참나무는 자라는 힘이 약해져요.' },
    { a: ['🧑', '사람'], b: ['🐛', '회충'], short: '회충 · 사람', type: 2, ab: '소화된 양분을 빼앗김', ba: '', fact: '회충은 사람의 장 속에서 양분을 빼앗아 살고, 사람은 영양 부족과 배앓이 같은 손해를 입어요.' },
    { a: ['🐕', '개'], b: ['🦟', '벼룩'], short: '벼룩 · 개', type: 2, ab: '피를 빨림', ba: '', fact: '벼룩은 개의 피를 빨아 먹고 살고, 개는 가려움과 빈혈 같은 손해를 입어요.' },
  ];
  // 기생·편리 공생은 두 번째 생물(b)이 이익을 얻는 쪽, 상리는 둘 다 이익
  const SYMG = PHONE
    ? { col: (c) => ({ x: 6 + c * 158, y: 6, w: 152, h: 280 }), ins: { x: 6, y: 292, w: 468, h: 152 }, tray: (i) => ({ x: 6 + (i % 2) * 237, y: 452 + Math.floor(i / 2) * 45, w: 231, h: 41 }), chip: (c, k) => ({ x: 6 + c * 158 + 6, y: 80 + k * 50, w: 140, h: 46 }) }
    : { col: (c) => ({ x: 10 + c * 186, y: 10, w: 178, h: 326 }), ins: { x: 574, y: 10, w: 216, h: 326 }, tray: (i) => ({ x: 10 + (i % 4) * 195, y: 366 + Math.floor(i / 4) * 92, w: 187, h: 84 }), chip: (c, k) => ({ x: 10 + c * 186 + 6, y: 92 + k * 58, w: 166, h: 52 }) };
  const TRAY_ORDER = [3, 0, 6, 1, 7, 4, 2, 5];
  function resetSym() {
    S.sym = { place: SYM.map(() => null), drag: null, sel: 0, bad: {}, shakeT: -9, solved: false, pop: SYM.map(() => 1), flowK: 1, viewed: {} };
  }
  const symPlaced = () => S.sym.place.filter((x) => x != null).length;
  const symRight = () => S.sym.place.filter((x, i) => x === SYM[i].type).length;
  function cardRect(id) {
    const q = S.sym, c = q.place[id];
    if (c == null) return SYMG.tray(TRAY_ORDER.indexOf(id));
    const k = [...q.place.keys()].filter((j) => q.place[j] === c).indexOf(id);
    return SYMG.chip(c, k);
  }
  function symAt(p) {
    for (let id = 0; id < SYM.length; id++) { if (S.sym.drag && S.sym.drag.id === id) continue; const r = cardRect(id); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return id; }
    return -1;
  }
  function symDown(p) {
    const q = S.sym; if (q.solved) return false;
    const id = symAt(p); if (id < 0) return false;
    const r = cardRect(id); q.drag = { id, x: p.x, y: p.y, ox: p.x - r.x, oy: p.y - r.y, sx: p.x, sy: p.y, moved: false };
    q.sel = id; q.viewed[id] = true; q.flowK = 0; SciSim.tween(q, { flowK: 1 }, { duration: 0.6, ease: 'outCubic' }); Sound.click();
    return true;
  }
  function symMove(p) { const d = S.sym.drag; if (!d) return; d.x = p.x; d.y = p.y; if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true; }
  function symUp(p) {
    const q = S.sym, d = q.drag; if (!d) return; q.drag = null;
    if (!d.moved) return;
    let col = -1; for (let c = 0; c < 3; c++) { const r = SYMG.col(c); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) col = c; }
    const old = q.place[d.id];
    if (col >= 0) {
      const cnt = q.place.filter((x) => x === col).length;
      if (old !== col && cnt >= 4) { showHint('한 칸에는 카드를 4장까지 놓을 수 있어요.', 2400); return; }
      q.place[d.id] = col; delete q.bad[d.id]; q.pop[d.id] = 0.4; SciSim.tween(q.pop, { [d.id]: 1 }, { duration: 0.4, ease: 'outBack' }); Sound.success();
      const r = cardRect(d.id); parts.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 6, colors: [COLS[col].c, '#fff'], speed: 70, size: 2.6, life: 0.5, gravity: 20 });
    } else { q.place[d.id] = null; delete q.bad[d.id]; Sound.tick(); }
    updateCtl();
  }
  function drawSymCard(id, r, o) {
    const s = SYM[id], pop = clamp(S.sym.pop[id], 0, 1.1), bad = S.sym.bad[id], sk = bad ? Math.sin(S.clock * 40) * 2.5 * Math.max(0, 1 - (S.clock - S.sym.shakeT) * 2.2) : 0;
    ctx.save(); ctx.translate(r.x + r.w / 2 + sk + (o && o.dx || 0), r.y + r.h / 2 + (o && o.dy || 0)); const sc = (0.95 + 0.05 * pop) * (o && o.lift ? 1.06 : 1); ctx.scale(sc, sc);
    const draw = () => { D.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 12); ctx.fillStyle = '#fff'; ctx.fill(); };
    if (o && o.lift) D.shadow(draw, { blur: 16, y: 8, color: 'rgba(20,40,80,.35)' }); else D.shadow(draw, { blur: 5, y: 2 });
    D.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 12); ctx.lineWidth = S.sym.sel === id ? 3.5 : 2; ctx.strokeStyle = bad ? '#dc2626' : S.sym.sel === id ? '#7c3aed' : '#cbd5e1'; ctx.stroke();
    const small = r.h < 60;
    E(s.a[0], -r.w / 2 + 20, small ? 0 : -8, small ? 22 : 26); E(s.b[0], -r.w / 2 + (small ? 42 : 46), small ? 0 : -8, small ? 22 : 26);
    const tx = -r.w / 2 + (small ? 62 : 14), tw = r.w - (small ? 70 : 24);
    const parts_ = s.short.split(' · ');
    if (small) { parts_.forEach((l, i) => T(tx, (parts_.length > 1 ? -3 : 5) + i * 15, l, PHONE ? 12.5 : 13, '#1f2d44', 'left', 800)); }
    else parts_.forEach((l, i) => T(0, 18 + i * 17 - (parts_.length > 1 ? 4 : 0), l, 13.5, '#1f2d44', 'center', 800));
    ctx.restore();
  }
  function drawSym(dt, t) {
    const q = S.sym;
    bgFill('#eef7f0', '#f3fbf0');
    for (let c = 0; c < 3; c++) {
      const r = SYMG.col(c), cn = COLS[c];
      panel(r.x, r.y, r.w, r.h, 16);
      D.roundRect(r.x, r.y, r.w, 62, 16); ctx.fillStyle = cn.c; ctx.fill(); ctx.fillRect(r.x, r.y + 40, r.w, 22);
      T(r.x + r.w / 2, r.y + 24, cn.n, PHONE ? 15 : 17, '#fff', 'center', 800);
      T(r.x + r.w / 2 - (PHONE ? 22 : 30), r.y + 52, '종 A ' + cn.sg[0], 13.5, '#fff', 'center', 800); T(r.x + r.w / 2 + (PHONE ? 26 : 34), r.y + 52, '종 B ' + cn.sg[1], 13.5, '#fff', 'center', 800);
      ctx.setLineDash([6, 5]); ctx.strokeStyle = C.rgba(cn.c, 0.35); ctx.lineWidth = 2; D.roundRect(r.x + 5, r.y + 68, r.w - 10, r.h - 74, 10); ctx.stroke(); ctx.setLineDash([]);
      if (!PHONE) T(r.x + r.w / 2, r.y + r.h - 12, cn.desc.length > 14 ? '' : cn.desc, 12.5, '#64748b', 'center', 700);
      if (q.place.filter((x) => x === c).length === 0) T(r.x + r.w / 2, r.y + r.h / 2 + 24, '여기에 놓아요', PHONE ? 13 : 14, C.rgba(cn.c, 0.55), 'center', 800);
    }
    // 확대 상자
    const I = SYMG.ins, s = SYM[q.sel], placedOK = q.place[q.sel] === s.type;
    panel(I.x, I.y, I.w, I.h, 16);
    T(I.x + 14, I.y + 26, '🔍 확대 그림', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    const ax = PHONE ? I.x + 70 : I.x + 52, bx_ = PHONE ? I.x + 400 : I.x + I.w - 52, ay = PHONE ? I.y + 56 : I.y + 90, k = clamp(q.flowK, 0, 1);
    [[s.a, ax, 0], [s.b, bx_, 1]].forEach(([an, x, kk]) => {
      D.sphere(x, ay, PHONE ? 28 : 30, kk ? '#fde68a' : '#bbf7d0', { shadow: true });
      E(an[0], x, ay + 1, PHONE ? 30 : 34); T(x, ay + (PHONE ? 46 : 50), an[1], 13.5, '#1f2d44', 'center', 800);
      D.sphere(x + 26, ay - 24, 12, placedOK ? (kk === 0 ? (s.type === 2 ? '#dc2626' : '#16a34a') : '#16a34a') : '#94a3b8', { gloss: false, outline: '#fff', outlineWidth: 2 });
      // 부호: 맞게 놓았을 때만 보여요 (상리 +/+, 편리 +/0, 기생 +/−) 단, a는 기생·편리에서 '줘서 손해/영향 없음' 쪽
      const sg = placedOK ? signOf(s, kk) : '?'; T(x + 26, ay - 18.5, sg, 15, '#fff', 'center', 800);
    });
    const x1 = ax + 40, x2 = bx_ - 40;
    if (s.ab) { ctx.save(); ctx.globalAlpha = k; D.arrow(x1, ay - 8, x1 + (x2 - x1) * k, ay - 8, { color: '#16a34a', width: 3.5, head: 11 }); ctx.restore(); }
    if (s.ba) { ctx.save(); ctx.globalAlpha = k; D.arrow(x2, ay + 12, x2 - (x2 - x1) * k, ay + 12, { color: '#0ea5e9', width: 3.5, head: 11 }); ctx.restore(); }
    if (!RM && k >= 1) { const n = 3; for (let i = 0; i < n; i++) { const f = (t * 0.45 + i / n) % 1; if (s.ab) D.sphere(x1 + (x2 - x1) * f, ay - 8, 3.4, '#16a34a', { gloss: false }); if (s.ba) D.sphere(x2 - (x2 - x1) * f, ay + 12, 3.4, '#0ea5e9', { gloss: false }); } }
    const lines = [(s.ab ? s.a[1] + ' → ' + s.b[1] + ': ' + s.ab : ''), (s.ba ? s.b[1] + ' → ' + s.a[1] + ': ' + s.ba : '')].filter(Boolean);
    let ty = ay + (PHONE ? 64 : 80);
    textBlock(I.x + 14, ty, I.w - 28, '💡 ' + s.fact, PHONE ? 12.5 : 12.5, '#475569', PHONE ? 16 : 16.5, 700);
    // 카드
    TRAY_ORDER.forEach((id) => { if (q.place[id] == null && !(q.drag && q.drag.id === id)) drawSymCard(id, cardRect(id), {}); });
    for (let id = 0; id < SYM.length; id++) if (q.place[id] != null && !(q.drag && q.drag.id === id)) drawSymCard(id, cardRect(id), {});
    if (q.drag && q.drag.moved) { const d = q.drag, r = cardRect(d.id); drawSymCard(d.id, { x: d.x - d.ox, y: d.y - d.oy, w: r.w, h: r.h }, { lift: true }); }
    else if (q.drag) drawSymCard(q.drag.id, cardRect(q.drag.id), {});
    if (q.solved) D.label(PHONE ? 240 : 400, PHONE ? 462 : 338, '✅ 8장을 모두 알맞게 분류했어요', { bg: '#15803d', size: 13.5 });
    else if (symPlaced() < 8 && PHONE === false) T(14, 356, '카드를 끌어 알맞은 칸에 놓아요 (' + symPlaced() + ' / 8)', 13.5, '#64748b', 'left', 800);
    parts.update(dt); parts.draw(ctx);
  }
  // 두 생물의 이익(+)/무관(0)/손해(−): kk=0 은 첫 번째(a), kk=1 은 두 번째(b)
  function signOf(s, kk) {
    if (s.type === 0) return '+';
    if (s.type === 1) return kk === 1 ? '+' : '0';       // b가 이익을 얻는 쪽(빨판상어, 따개비)
    return kk === 1 ? '+' : '−';                          // b가 기생하는 쪽
  }

  /* =========================================================
     ④ 관계 발표: 가상 군집 카드(사바나, 산호초, 숲 토양)에서 관계 쌍 찾기
     ========================================================= */
  const TYPES = [
    { n: '종간 경쟁', c: '#dc2626', hint: '두 종이 같은 먹이·공간을 두고 서로 손해를 봐요(− −).' },
    { n: '분서', c: '#0ea5e9', hint: '먹이·서식 공간이 달라 경쟁이 줄어 함께 살아요.' },
    { n: '포식과 피식', c: '#ea580c', hint: '한 종이 다른 종을 잡아먹어요(+ −).' },
    { n: '상리 공생', c: '#16a34a', hint: '두 종이 모두 이익을 얻어요(+ +).' },
    { n: '편리 공생', c: '#65a30d', hint: '한 종만 이익을 얻고 다른 종은 이익도 손해도 없어요(+ 0).' },
    { n: '기생', c: '#7c3aed', hint: '한 종은 이익, 다른 종은 손해를 입어요(+ −). 잡아먹는 것이 아니라 붙어살며 양분을 빼앗아요.' },
  ];
  // 관계 쌍: a, b = 종 번호, type, ev(근거: 첫째가 정답), sh(발표문에 쓰는 짧은 근거)
  const COMM = [
    { n: '사바나', ic: '🦁', bg: ['#fde68a', '#bef264'], sp: [['🦁', '사자', 0.14, 0.76], ['🦓', '얼룩말', 0.46, 0.74], ['🦌', '가젤', 0.76, 0.78], ['🦒', '기린', 0.84, 0.36], ['🐃', '물소', 0.18, 0.4], ['🐦', '소등쪼기새', 0.36, 0.2]],
      rel: [
        { a: 0, b: 1, type: 2, sh: '사자가 얼룩말을 잡아먹어요', ev: ['사자는 얼룩말을 잡아먹고 얼룩말은 잡아먹혀요', '두 종이 같은 풀을 먹으려고 서로 다퉈요', '서로 도움을 주고받으며 함께 살아요'] },
        { a: 1, b: 2, type: 0, sh: '같은 풀을 먹어요', ev: ['두 종이 같은 풀을 먹어서 먹이를 두고 서로 손해를 봐요', '한 종이 다른 종의 몸에서 양분을 빨아 먹어요', '먹이 위치가 달라서 경쟁이 줄어요'] },
        { a: 3, b: 1, type: 1, sh: '먹이 높이가 달라요', ev: ['기린은 높은 가지의 잎, 얼룩말은 땅의 풀을 먹어 먹이 위치가 달라 경쟁이 줄어요', '기린이 얼룩말을 잡아먹어요', '얼룩말이 기린의 몸에서 양분을 빨아 먹어요'] },
        { a: 5, b: 4, type: 3, sh: '진드기를 먹고 기생충이 줄어요', ev: ['새는 물소 몸의 진드기를 먹고, 물소는 기생충이 줄어 둘 다 이익을 얻어요', '새는 이익을 얻지만 물소는 손해를 입어요', '새는 이익을 얻고 물소는 이익도 손해도 없어요'] },
      ] },
    { n: '산호초', ic: '🐠', bg: ['#a5e8ff', '#3b9de0'], sp: [['🐠', '흰동가리', 0.2, 0.62], ['🌺', '말미잘', 0.34, 0.82], ['🦈', '상어', 0.74, 0.3], ['🐟', '빨판상어', 0.58, 0.5], ['🐙', '문어', 0.6, 0.82], ['🦀', '게', 0.84, 0.76]],
      rel: [
        { a: 0, b: 1, type: 3, sh: '보호받고 천적을 쫓아요', ev: ['흰동가리는 말미잘 촉수에서 보호를 받고, 말미잘은 천적을 피해 둘 다 이익이에요', '흰동가리가 말미잘을 잡아먹어요', '두 종이 같은 먹이를 두고 경쟁해요'] },
        { a: 3, b: 2, type: 4, sh: '붙어 이동해요', ev: ['빨판상어는 상어에 붙어 이동하며 이익을 얻고 상어는 이익도 손해도 없어요', '빨판상어가 상어를 잡아먹어요', '둘 다 이익을 얻어요'] },
        { a: 4, b: 5, type: 2, sh: '문어가 게를 잡아먹어요', ev: ['문어가 게를 잡아먹어요', '둘이 서로 도움을 주고받아요', '게는 이익을 얻지만 문어는 아무 변화가 없어요'] },
      ] },
    { n: '숲 토양', ic: '🌳', bg: ['#cfe8ff', '#a67c52'], sp: [['🌳', '참나무', 0.2, 0.3], ['🌿', '겨우살이', 0.34, 0.12], ['🌱', '콩과 식물', 0.62, 0.3], ['🦠', '뿌리혹박테리아', 0.62, 0.62], ['🐛', '지렁이', 0.26, 0.76], ['🦔', '고슴도치', 0.84, 0.36]],
      rel: [
        { a: 1, b: 0, type: 5, sh: '양분을 빼앗아요', ev: ['겨우살이는 참나무에서 물과 양분을 빼앗아 참나무가 손해를 봐요', '참나무는 겨우살이에게 아무 영향이 없어요', '둘이 서로 양분을 주고받아요'] },
        { a: 3, b: 2, type: 3, sh: '질소 양분과 양분을 주고받아요', ev: ['박테리아는 질소 양분을 주고 식물은 양분을 줘서 둘 다 이익이에요', '박테리아가 식물에서 일방적으로 양분을 빼앗아요', '둘이 같은 양분을 먹으려고 경쟁해요'] },
        { a: 5, b: 4, type: 2, sh: '지렁이를 잡아먹어요', ev: ['고슴도치가 지렁이를 잡아먹어요', '지렁이가 고슴도치에게서 양분을 빨아 먹어요', '서로 도움을 주고받아요'] },
      ] },
  ];
  const SRC_OK = '0';
  const NEED_PAIRS = 6, NEED_EACH = 2;
  const RSC = PHONE ? { x: 6, y: 6, w: 468, h: 304 } : { x: 10, y: 10, w: 556, h: 404 };
  const RBD = PHONE ? { x: 6, y: 318, w: 468, h: 206 } : { x: 576, y: 10, w: 214, h: 404 };
  const RBT = PHONE ? { x: 6, y: 532, w: 468, h: 102 } : { x: 10, y: 422, w: 780, h: 128 };
  const spPos = (ci, i) => { const s = COMM[ci].sp[i]; return [RSC.x + s[2] * RSC.w, RSC.y + 40 + s[3] * (RSC.h - 70)]; };
  function resetRep() {
    S.rep = { c: 0, mode: 'find', sel: [], cur: -1, pairs: [], removed: null, triedRemove: {}, type: null, ev: '', src: '', pred: '', pop: {}, shake: null, fly: [] };
    ['evSel', 'srcSel', 'predSel'].forEach((id) => { const e = $('#' + id); if (e) { e.value = ''; e.classList.remove('ok', 'bad'); } });
  }
  const repCount = () => S.rep.pairs.length;
  const repBy = (ci) => S.rep.pairs.filter((p) => p.c === ci).length;
  const repOK = () => repCount() >= NEED_PAIRS && COMM.every((c, i) => repBy(i) >= NEED_EACH);
  const repHas = (ci, ri) => S.rep.pairs.some((p) => p.c === ci && p.r === ri);
  function findRel(ci, a, b) { return COMM[ci].rel.findIndex((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a)); }
  function repDown(p) {
    const q = S.rep, cm = COMM[q.c];
    for (let i = 0; i < cm.sp.length; i++) {
      const pos = spPos(q.c, i);
      if (Math.hypot(p.x - pos[0], p.y - pos[1]) <= (PHONE ? 30 : 38)) { repTap(i); return false; }
    }
    return false;
  }
  function repTap(i) {
    const q = S.rep, cm = COMM[q.c];
    if (q.mode === 'remove') {
      q.removed = q.removed === i ? null : i; q.triedRemove[q.c + ':' + i] = true; Sound.click(); updateCtl();
      if (q.removed != null) { const pos = spPos(q.c, i); parts.burst(pos[0], pos[1], { count: 8, colors: ['#94a3b8', '#fff'], speed: 70, size: 3, life: 0.6, gravity: 20 }); }
      return;
    }
    const at = q.sel.indexOf(i);
    if (at >= 0) { q.sel.splice(at, 1); q.cur = -1; Sound.tick(); updateCtl(); return; }
    if (q.sel.length >= 2) q.sel = [];
    q.sel.push(i); Sound.click();
    if (q.sel.length === 2) {
      const ri = findRel(q.c, q.sel[0], q.sel[1]);
      if (ri < 0) { q.shake = { c: q.c, i: q.sel.slice(), t0: S.clock }; Sound.fail(); showHint(josa(cm.sp[q.sel[0]][1], '과/와') + ' ' + cm.sp[q.sel[1]][1] + ' 사이에는 뚜렷한 관계 사례가 없어요. 다른 쌍을 찾아봐요.', 3600); q.sel = []; q.cur = -1; }
      else if (repHas(q.c, ri)) { showHint('이 관계는 이미 발표문에 정리했어요. 다른 쌍을 찾아봐요.', 3000); q.sel = []; q.cur = -1; }
      else { q.cur = ri; q.type = null; q.ev = ''; $('#evSel').value = ''; Sound.success(); buildEv(); showHint('관계를 찾았어요! 관계 유형과 근거를 골라 발표문에 추가해요.', 3600); }
    } else q.cur = -1;
    updateCtl();
  }
  function buildEv() {
    const q = S.rep, sel = $('#evSel'); if (q.cur < 0) return;
    const r = COMM[q.c].rel[q.cur];
    const order = [0, 1, 2].sort((x, y) => ((x * 7 + q.cur * 3 + q.c) % 5) - ((y * 7 + q.cur * 3 + q.c) % 5));
    sel.innerHTML = '<option value="">— 근거 고르기 —</option>' + order.map((k) => '<option value="' + k + '">' + r.ev[k] + '</option>').join('');
  }
  function repAdd() {
    const q = S.rep; if (q.cur < 0) return;
    const r = COMM[q.c].rel[q.cur], tsel = q.type, ev = $('#evSel').value;
    if (tsel == null) { showHint('관계 유형을 먼저 골라요.', 2400); return; }
    if (ev === '') { showHint('근거를 골라요.', 2400); return; }
    if (tsel !== r.type) { Sound.fail(); showHint('✖ ' + josa(TYPES[tsel].n, '은/는') + ' 이런 관계예요: ' + TYPES[tsel].hint + ' 두 생물이 정말 그런지 따져 봐요.', 6000); return; }
    if (Number(ev) !== 0) { Sound.fail(); $('#evSel').classList.add('bad'); setTimeout(() => $('#evSel').classList.remove('bad'), 500); showHint('✖ 근거가 이 관계와 맞지 않아요. 두 생물의 이익과 손해가 어떻게 되는지 따져 봐요.', 5000); return; }
    q.pairs.push({ c: q.c, r: q.cur, type: tsel }); Sound.success();
    const a = spPos(q.c, r.a), b = spPos(q.c, r.b); parts.burst((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, { count: 14, colors: [TYPES[tsel].c, '#fff', '#fde047'], speed: 120, size: 3.4, life: 0.8 });
    q.fly.push({ k: 0, c: q.c, r: q.cur, idx: q.pairs.length - 1 }); const fl = q.fly[q.fly.length - 1]; SciSim.tween(fl, { k: 1 }, { duration: RM ? 0.01 : 0.7, ease: 'outCubic' });
    q.sel = []; q.cur = -1; q.type = null; $('#evSel').value = ''; hideHint(); updateCtl();
  }
  /* 한 종이 사라지면 나타나는 변화 (관계에서 만들어요) */
  function consequences(ci, i) {
    const cm = COMM[ci], nm_ = cm.sp[i][1], out = [];
    cm.rel.forEach((r) => {
      const isA = r.a === i, isB = r.b === i; if (!isA && !isB) return;
      const o = cm.sp[isA ? r.b : r.a][1];
      if (r.type === 2) out.push(isA ? o + ' 개체 수가 늘어나요(잡아먹는 포식자가 사라져서).' : o + '의 먹이가 줄어 개체 수가 줄어요.');
      else if (r.type === 0) out.push(o + josaVerb(o) + ' 경쟁이 줄어 개체 수가 늘 수 있어요.');
      else if (r.type === 1) out.push(josa(o, '과/와') + '는 먹이 위치가 달라 큰 영향이 없어요.');
      else if (r.type === 3) out.push(o + josaVerb(o) + ' 도움을 잃어 개체 수가 줄어들 가능성이 커요.');
      else if (r.type === 4) out.push(isA ? o + josaVerb(o) + ' 영향이 거의 없어요. (이익도 손해도 없던 쪽)' : o + josaVerb(o) + ' 붙어 살 곳과 이동 수단을 잃어 줄어들어요.');
      else out.push(isA ? o + josaVerb(o) + ' 손해에서 벗어나 회복돼요.' : o + josaVerb(o) + ' 양분을 얻을 곳을 잃어 줄어들어요.');
    });
    return out.length ? out : ['직접 이어진 관계가 이 카드에는 없어요.'];
  }
  const josaVerb = (w) => (jong(w) > 0 ? '은' : '는');
  function drawSceneBg(ci, t) {
    const cm = COMM[ci], r = RSC;
    ctx.save(); D.roundRect(r.x, r.y, r.w, r.h, 18); ctx.clip();
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, cm.bg[0]); g.addColorStop(1, cm.bg[1]); ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    if (ci === 0) { ctx.fillStyle = 'rgba(120,150,60,.55)'; ctx.fillRect(r.x, r.y + r.h * 0.55, r.w, r.h * 0.45); E('☀️', r.x + r.w - 44, r.y + 56, 40); E('🌳', r.x + r.w * 0.55, r.y + r.h * 0.45, 56); }
    else if (ci === 1) { for (let i = 0; i < 4; i++) { ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; ctx.beginPath(); for (let px = r.x; px <= r.x + r.w; px += 6) { const py = r.y + 36 + i * 22 + Math.sin((px - r.x) / 40 + t * 0.9 + i * 1.5) * 3; px === r.x ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke(); } ctx.fillStyle = 'rgba(240,200,140,.85)'; ctx.fillRect(r.x, r.y + r.h * 0.9, r.w, r.h * 0.1); }
    else { ctx.fillStyle = '#7ab55c'; ctx.fillRect(r.x, r.y + r.h * 0.42, r.w, 10); ctx.fillStyle = '#9a6b42'; ctx.fillRect(r.x, r.y + r.h * 0.42 + 10, r.w, r.h * 0.58); ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 30; i++) { ctx.beginPath(); ctx.arc(r.x + ((i * 97) % r.w), r.y + r.h * 0.5 + ((i * 53) % (r.h * 0.45)), 3, 0, TAU); ctx.fill(); } }
    ctx.restore();
  }
  function drawRep(dt, t) {
    const q = S.rep, cm = COMM[q.c];
    bgFill('#eef7f0', '#f3fbf0');
    panel(RSC.x, RSC.y, RSC.w, RSC.h, 18);
    drawSceneBg(q.c, t);
    D.label(RSC.x + 70, RSC.y + 22, cm.ic + ' ' + cm.n + (q.mode === 'remove' ? ' · 한 종 없애기' : ' · 관계 찾기'), { bg: 'rgba(31,45,68,.85)', size: PHONE ? 13 : 14.5 });
    // 찾은 관계 연결선
    q.pairs.forEach((p) => { if (p.c !== q.c) return; const r = COMM[p.c].rel[p.r], a = spPos(q.c, r.a), b = spPos(q.c, r.b); ctx.save(); ctx.strokeStyle = TYPES[p.type].c; ctx.lineWidth = 4; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore(); D.label((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, TYPES[p.type].n, { bg: TYPES[p.type].c, size: PHONE ? 12.5 : 13.5 }); });
    if (q.sel.length === 2 && q.cur >= 0) { const r = COMM[q.c].rel[q.cur], a = spPos(q.c, r.a), b = spPos(q.c, r.b); ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore(); }
    // 생물들
    cm.sp.forEach((s, i) => {
      const pos = spPos(q.c, i), sel = q.sel.indexOf(i) >= 0, rem = q.removed === i, bob = RM ? 0 : Math.sin(t * 2 + i) * 2.5;
      const sk = q.shake && q.shake.c === q.c && q.shake.i.indexOf(i) >= 0 ? Math.sin((t - q.shake.t0) * 44) * 4 * Math.max(0, 1 - (t - q.shake.t0) * 2.4) : 0;
      ctx.save(); ctx.translate(sk, 0); ctx.globalAlpha = rem ? 0.22 : 1;
      if (sel) { D.sphere(pos[0], pos[1], PHONE ? 30 : 36, '#ddd6fe', { gloss: false }); D.ring(pos[0], pos[1], PHONE ? 33 : 40, t, { color: '#7c3aed', width: 3 }); }
      else D.sphere(pos[0], pos[1], PHONE ? 27 : 32, 'rgba(255,255,255,.7)', { gloss: false });
      E(s[0], pos[0], pos[1] + bob + 1, PHONE ? 34 : 42);
      ctx.restore();
      D.label(pos[0], pos[1] + (PHONE ? 40 : 48), s[1], { bg: rem ? 'rgba(100,116,139,.75)' : 'rgba(31,45,68,.88)', size: PHONE ? 12.5 : 13.5 });
      if (rem) T(pos[0], pos[1] + 7, '✖', 26, '#dc2626', 'center', 800);
    });
    // 발표문 판
    panel(RBD.x, RBD.y, RBD.w, RBD.h, 18);
    T(RBD.x + 14, RBD.y + 26, '📋 발표문 ' + repCount() + ' / ' + NEED_PAIRS, PHONE ? 14 : 15.5, '#26324a', 'left', 800);
    T(RBD.x + 14, RBD.y + 46, COMM.map((c, i) => c.ic + ' ' + repBy(i)).join('   '), 13, '#64748b', 'left', 800);
    const rowH = PHONE ? 46 : 56;
    const off = Math.max(0, q.pairs.length - 6);
    q.pairs.slice(off).forEach((p, ii) => {
      const i = off + ii, r = COMM[p.c].rel[p.r], tp = TYPES[p.type], fl = q.fly.find((f) => f.idx === i), k = fl ? clamp(fl.k, 0, 1) : 1;
      const x = RBD.x + 8 + (PHONE ? (ii % 2) * 232 : 0), y = RBD.y + 58 + (PHONE ? Math.floor(ii / 2) : ii) * rowH, w = PHONE ? 226 : RBD.w - 16;
      ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * -30);
      D.roundRect(x, y, w, rowH - 6, 10); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = tp.c; ctx.stroke();
      T(x + 8, y + 18, COMM[p.c].sp[r.a][1] + ' – ' + COMM[p.c].sp[r.b][1], PHONE ? 13 : 13.5, '#1f2d44', 'left', 800);
      D.label(x + 8, y + 38, tp.n, { bg: tp.c, size: 12.5, align: 'left', pad: 6 });
      ctx.restore();
    });
    if (!q.pairs.length) textBlock(RBD.x + 14, RBD.y + 80, RBD.w - 28, '두 생물을 차례로 눌러 관계를 찾으면 여기에 정리돼요. 각 군집에서 2개 이상, 모두 6개를 찾아요.', 13.5, '#64748b', 19, 700);
    // 아래 안내
    panel(RBT.x, RBT.y, RBT.w, RBT.h, 16);
    if (q.mode === 'remove') {
      if (q.removed == null) textBlock(RBT.x + 14, RBT.y + 28, RBT.w - 28, '🚫 한 생물을 눌러 군집에서 없애 보세요. 그 생물과 이어진 생물이 어떻게 변할지 나타나요.', PHONE ? 13.5 : 14.5, '#475569', 19, 800);
      else {
        T(RBT.x + 14, RBT.y + 26, cm.sp[q.removed][0] + ' ' + josa(cm.sp[q.removed][1], '이/가') + ' 사라지면?', PHONE ? 14 : 15.5, '#b91c1c', 'left', 800);
        let y = RBT.y + 50; consequences(q.c, q.removed).slice(0, 3).forEach((c) => { y += textBlock(RBT.x + 14, y, RBT.w - 28, '• ' + c, PHONE ? 13 : 14, '#334155', 18, 700); });
      }
    } else {
      if (q.cur >= 0) { const r = COMM[q.c].rel[q.cur]; T(RBT.x + 14, RBT.y + 28, '🔗 ' + COMM[q.c].sp[r.a][1] + ' – ' + COMM[q.c].sp[r.b][1] + ': 유형과 근거를 골라 발표문에 추가해요.', PHONE ? 13.5 : 15, '#6d28d9', 'left', 800); textBlock(RBT.x + 14, RBT.y + 52, RBT.w - 28, '오른쪽(아래) 입력칸에서 ① 관계 유형 ② 근거를 고르고 ➕ 발표문에 추가를 눌러요.', PHONE ? 13 : 14, '#475569', 19, 700); }
      else textBlock(RBT.x + 14, RBT.y + 28, RBT.w - 28, '👆 서로 관계가 있을 것 같은 두 생물을 차례로 눌러요. 먹이, 도움, 경쟁, 사는 곳을 떠올려 보세요.', PHONE ? 13.5 : 14.5, '#475569', 19, 800);
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     화면 전환 · 조작 연결 · 읽음 칸
     ========================================================= */
  const MODE_LABEL = { cul: '🧫 짚신벌레 배양: 경쟁과 분서', pp: '📈 포식과 피식의 개체 수 변화', case: '🦁 포식자와 피식자 사례', sym: '🤝 공생과 기생 분류', rep: '🎤 군집 속 관계 찾아 발표하기' };
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); hideHint(); if (S.sym) S.sym.drag = null; }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  const culCoexist = () => S.cul.ran[1] && S.cul.sRan[1] <= 40 && bottleN(1, CUL_DAYS)[1] > 0.5;
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    const curLv = game ? game.level + 1 : 1, showAll = !!(game && game.free);
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.classList.toggle('lv-off', !showAll && +b.dataset.lv !== curLv && b.dataset.mode !== S.mode); });
    if (S.cul) {
      const run = culRunning(); $('#bCulRun').disabled = run; $('#bCulRun').textContent = run ? '⏳ 지켜보는 중…' : '▶ 30일 실행'; $('#sOv').disabled = run; $('#bCulReset').disabled = run;
      $('#sOv').value = S.cul.s; $('#oOv').textContent = S.cul.s + ' %'; $('#sOv').style.setProperty('--pct', S.cul.s + '%');
      $('#culNote').innerHTML = '② 병의 자원 겹침이 <b>' + S.cul.s + ' %</b>예요. 겹침이 클수록 두 종이 같은 먹이·공간을 더 많이 써요.';
    }
    if (S.pp) { $('#bPPPlay').textContent = S.pp.play ? '⏸ 멈추기' : '▶ 재생'; $('#ppNote').innerHTML = '그래프를 <b>눌러서</b> 시점을 옮길 수 있어요. 지금 <b>' + (Math.round(S.pp.t * 10) / 10) + '년</b>'; }
    if (S.rep) {
      $$('#commSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.c === S.rep.c));
      $$('#repMode button').forEach((b) => b.classList.toggle('on', b.dataset.m === S.rep.mode));
      $('#pairForm').hidden = !(S.rep.mode === 'find' && S.rep.cur >= 0); $('#findBox').hidden = S.rep.mode !== 'find'; $('#removeBox').hidden = S.rep.mode !== 'remove';
      $$('#typeChips button').forEach((b) => b.classList.toggle('on', S.rep.type === +b.dataset.t));
      if (S.rep.cur >= 0) { const r = COMM[S.rep.c].rel[S.rep.cur]; $('#pairName').textContent = COMM[S.rep.c].sp[r.a][1] + ' – ' + COMM[S.rep.c].sp[r.b][1]; }
      $('#repNote').innerHTML = '찾은 관계 <b>' + repCount() + ' / ' + NEED_PAIRS + '</b> · ' + COMM.map((c, i) => c.n + ' ' + repBy(i)).join(' · ') + '<br>(군집마다 2개 이상)';
    }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#sOv').addEventListener('input', (e) => { if (culRunning()) return; S.cul.s = +e.target.value; Sound.tick(); updateCtl(); });
  $('#bCulRun').addEventListener('click', culRun);
  $('#bCulReset').addEventListener('click', () => { if (culRunning()) return; Sound.click(); resetCul(); updateCtl(); hideHint(); });
  $('#bPPPlay').addEventListener('click', () => { Sound.click(); const q = S.pp; if (q.play) q.play = false; else { if (q.t >= PP_YEARS - 0.05) q.t = 0; q.play = true; } updateCtl(); });
  $('#bPPReset').addEventListener('click', () => { Sound.click(); S.pp.t = 0; S.pp.play = false; S.pp.seq = []; S.pp.bad = false; updateCtl(); });
  $('#lagSel').addEventListener('change', (e) => { S.pp.lag = e.target.value; e.target.classList.remove('ok', 'bad'); Sound.click(); });
  $$('#commSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const q = S.rep; q.c = +b.dataset.c; q.sel = []; q.cur = -1; q.removed = null; hideHint(); updateCtl(); }));
  $$('#repMode button').forEach((b) => b.addEventListener('click', () => { Sound.click(); const q = S.rep; q.mode = b.dataset.m; q.sel = []; q.cur = -1; q.removed = null; hideHint(); updateCtl(); }));
  $$('#typeChips button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.rep.type = +b.dataset.t; updateCtl(); }));
  $('#evSel').addEventListener('change', (e) => { S.rep.ev = e.target.value; e.target.classList.remove('bad'); Sound.click(); });
  $('#bRepAdd').addEventListener('click', repAdd);
  $('#srcSel').addEventListener('change', (e) => { S.rep.src = e.target.value; e.target.classList.remove('ok', 'bad'); Sound.click(); });
  $('#predSel').addEventListener('change', (e) => { S.rep.pred = e.target.value; e.target.classList.remove('ok', 'bad'); Sound.click(); });

  SciSim.pointer(view, {
    down(p) { if (S.mode === 'pp') return ppDown(p); if (S.mode === 'case') return caseDown(p); if (S.mode === 'sym') return symDown(p); if (S.mode === 'rep') return repDown(p); return false; },
    move(p) { if (S.mode === 'pp') ppMove(p); else if (S.mode === 'sym') symMove(p); },
    up(p) { if (S.mode === 'sym') symUp(p); },
    hover(p) {
      if (S.mode === 'pp') { if (p.x >= PPB.x && p.x <= PPB.x + PPB.w && p.y >= PPB.y && p.y <= PPB.y + PPB.h) return 'ew-resize'; for (let j = 0; j < 4; j++) { const r = ppCard(j); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return 'pointer'; } return 'default'; }
      if (S.mode === 'case') return 'pointer';
      if (S.mode === 'sym') return symAt(p) >= 0 ? 'grab' : 'default';
      if (S.mode === 'rep') { for (let i = 0; i < 6; i++) { const pos = spPos(S.rep.c, i); if (Math.hypot(p.x - pos[0], p.y - pos[1]) < 36) return 'pointer'; } }
      return 'default';
    },
  });

  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'cul') { const q = S.cul; L1 = '실행한 병'; a = q.ran.filter(Boolean).length + ' / 3'; L2 = '② 병의 자원 겹침'; b = sUsed(1) + ' %'; L3 = '② 병의 결과'; c = q.ran[1] ? (bottleN(1, CUL_DAYS)[1] > 0.5 ? 'P1·P2 공존' : 'P2 사라짐') : '—'; }
    else if (m === 'pp') { const q = S.pp; L1 = '시점'; a = (Math.round(q.t * 10) / 10) + '년'; L2 = '🐇 피식자'; b = Math.round(PREY(q.t)) + '마리'; L3 = '🦊 포식자'; c = Math.round(PRED(q.t)) + '마리'; }
    else if (m === 'case') { L1 = '포식자를 고른 사례'; a = csPicked() + ' / 3'; L2 = '둘 다인 생물로 고른'; b = csDualSet().length + '종'; L3 = '먹이 사슬'; c = '메뚜기 → 개구리 → 뱀 → 매'; }
    else if (m === 'sym') { const q = S.sym; L1 = '분류한 카드'; a = symPlaced() + ' / 8'; L2 = '맞게 놓은 카드'; b = q.solved ? '8 / 8' : '—'; L3 = '선택한 카드'; c = SYM[q.sel].short; }
    else { const q = S.rep; L1 = '찾은 관계'; a = repCount() + ' / ' + NEED_PAIRS; L2 = '고른 군집'; b = COMM[q.c].ic + ' ' + COMM[q.c].n; L3 = '화면'; c = q.mode === 'find' ? '관계 찾기' : '한 종 없애기'; }
    const keyS = [L1, a, L2, b, L3, c].join('|');
    if (keyS === rlast) return; rlast = keyS;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function autoFill() {
    const cu = S.cul; cu.s = 100; [0, 1, 2].forEach((i) => { cu.ran[i] = true; cu.p[i] = CUL_DAYS; cu.sRan[i] = i === 1 ? 100 : 0; cu.run[i] = false; });
    S.pp.seq = [0, 1, 2, 3]; S.pp.lag = '1'; $('#lagSel').value = '1'; S.pp.solved = true;
    S.cs.pick = PAIRS.map((p) => p.pred); S.cs.dual = {}; CHAIN_DUAL.forEach((j) => { S.cs.dual[j] = true; }); S.cs.solved = true;
    S.sym.place = SYM.map((s) => s.type); S.sym.solved = true;
    S.rep.pairs = []; [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]].forEach((x) => S.rep.pairs.push({ c: x[0], r: x[1], type: COMM[x[0]].rel[x[1]].type }));
    S.rep.src = SRC_OK; $('#srcSel').value = SRC_OK; S.rep.pred = '0'; $('#predSel').value = '0';
    updateCtl();
  }

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '경쟁과 분서: 함께 살아가는 방법', short: '경쟁과 분서', icon: '⚔️', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 같은 곳에 사는 여러 종은 어떻게 서로 영향을 주고받으며 함께 살아갈까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 같은 종끼리의 관계(텃세·순위제·리더제·사회생활·가족생활)를 배웠어요. 이번에는 <b>서로 다른 종</b> 사이의 관계(종간 경쟁, 분서, 포식과 피식, 공생, 기생)를 알아봐요. 통합과학에서 한 먹이 관계도 떠올려 보세요.</div>' +
        '<p>짚신벌레 배양 병 세 개(<b>단독 · 같은 먹이 혼합 · 공간을 나눈 혼합</b>)의 30일을 비교하고, 두 종이 <b>공존하는 조건</b>을 찾아요. (가상 실험 자료)</p>',
      features: ['cul'],
      setup() { resetCul(); setMode('cul'); },
      recap: '같은 먹이·공간을 많이 쓰는 두 종은 종간 경쟁으로 한 종이 밀려날 수 있어요. 먹이나 서식 공간을 달리하면(분서) 경쟁이 줄어 함께 살 수 있어요.',
      summary: '<ul><li><b>종간 경쟁</b>: 서로 다른 종이 같은 먹이·공간을 두고 다투어 서로 손해를 보는 관계 (예시: 같은 병에서 P2가 16일째 사라짐)</li><li><b>분서</b>: 먹이나 서식 공간을 달리해 경쟁을 줄이고 함께 사는 것 (예: 위·아래 서식 공간이 다른 P2와 P3, 서로 다른 높이에서 먹이를 구하는 새들)</li><li>단독으로 키우면 두 종 모두 <b>S자 곡선</b>이 나타나요.</li></ul>',
      missions: [
        {
          id: 'run3', title: '배양 병 세 개 비교',
          goal: '<b>▶ 30일 실행</b>으로 세 병 <b>① 단독 · ② 같은 먹이 혼합 · ③ 공간을 나눈 혼합</b>의 결과를 모두 지켜보세요.',
          hint: '실행을 누르면 30일이 빠르게 지나가요. 세 병의 그래프가 모두 끝까지 그려지면 돼요. 혼합한 병에서 P2가 어떻게 되는지 보세요.',
          setup() { setMode('cul'); },
          check: () => S.cul.ran.every(Boolean),
          hold: 0.6,
          status: () => mark(S.cul.ran[0]) + ' ① 단독 &nbsp; ' + mark(S.cul.ran[1]) + ' ② 같은 먹이 &nbsp; ' + mark(S.cul.ran[2]) + ' ③ 공간 나눔',
          explain: '① 단독 배양에서는 P1과 P2가 모두 <b>S자 곡선</b>이에요. ② 같은 먹이·공간에서 섞어 키우면(겹침 100 %) P2가 잠시 늘다가 <b>16일째에 0</b>이 돼요(종간 경쟁). ③ 서식 공간이 다른 P2와 P3는 <b>둘 다 유지</b>돼요(분서).',
        },
        {
          id: 'coex', title: '겹침을 줄여 공존시키기',
          goal: '② 병의 <b>자원 겹침</b>을 <b>40 % 이하</b>로 낮추고 다시 ▶ 30일 실행해 <b>P1과 P2가 함께 살아남게</b> 하세요.',
          hint: '자원 겹침 슬라이더를 왼쪽으로 옮기면 두 종이 쓰는 공간이 나뉘어요. 슬라이더를 바꾸면 ② 병만 다시 실행해요.',
          setup() { setMode('cul'); },
          check: () => culCoexist(),
          hold: 0.6,
          status: () => '자원 겹침 ' + S.cul.s + ' % (40 % 이하) &nbsp; ' + mark(culCoexist()) + ' 공존',
          explain: '겹침이 <b>60 % 이상</b>이면 P2가 밀려나고, <b>40 % 이하</b>로 줄이면 P1과 P2가 모두 남아요. 먹이나 서식 공간을 달리하는 <b>분서</b>가 경쟁을 줄여 줘요.',
        },
        {
          type: 'quiz', title: '경쟁과 분서',
          goal: '<b>종간 경쟁</b>과 <b>분서</b>의 차이로 알맞은 것은?',
          setup() { setMode('cul'); },
          choices: ['경쟁은 같은 자원을 두고 서로 손해를 보는 관계이고, 분서는 먹이·서식 공간을 달리해 경쟁을 줄여 함께 사는 것이다', '경쟁은 한 종이 다른 종을 잡아먹는 관계이고, 분서는 두 종이 서로 돕는 관계이다', '경쟁은 두 종이 모두 이익을 얻는 관계이고, 분서는 한 종만 이익을 얻는 관계이다', '분서는 두 종이 같은 곳에서 같은 먹이를 먹는 것이다'],
          answer: 0,
          feedback: ['', '잡아먹는 것은 포식과 피식이고, 서로 돕는 것은 공생이에요.', '경쟁은 두 종 모두 손해(−, −)를 보는 관계예요.', '같은 먹이를 먹으면 경쟁이 심해져요. 분서는 먹이나 공간을 달리하는 거예요.'],
          explain: '<b>종간 경쟁</b>은 같은 먹이·공간을 두고 서로 손해를 보는 관계이고(P2가 밀려남), <b>분서</b>는 먹이나 서식 공간을 달리해 경쟁을 줄이고 함께 사는 것이에요(P2와 P3).',
        },
      ],
    },
    {
      title: '포식과 피식: 늘고 줄고', short: '포식과 피식', icon: '🦊', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 경쟁과 분서를 봤어요. 다른 종과 관계 중 <b>잡아먹고 잡아먹히는 관계</b>도 있어요. 통합과학의 개체군 변동 모의실험을 떠올리며 이번에는 그래프를 읽고 사례를 분류해 봐요.</div>' +
        '<p>피식자와 포식자의 개체 수 그래프에서 <b>변화의 순서</b>와 <b>정점의 시차</b>를 읽고, 사례 카드에서 포식자와 피식자를 가려요.</p>',
      features: ['pp', 'case'],
      setup() { resetPP(); resetCase(); setMode('pp'); },
      recap: '피식자가 늘면 포식자가 늘고, 포식자가 늘면 피식자가 줄고, 피식자가 줄면 포식자도 줄어요. 포식자의 정점은 피식자보다 약간 늦게 나타나요. 한 생물이 포식자이면서 피식자일 수 있어요.',
      summary: '<ul><li><b>포식과 피식</b>: 포식자는 이익, 피식자는 손해(+ −). 개체 수가 늘고 줄며 서로 영향을 줘요.</li><li>변화 순서: <b>피식자 증가 → 포식자 증가 → 피식자 감소 → 포식자 감소</b> (이 가상 자료는 약 10년 주기, 포식자의 정점은 피식자보다 약 2~3년 늦어요).</li><li>먹이 사슬에서 한 생물이 <b>포식자이면서 피식자</b>일 수 있어요. (개구리: 메뚜기의 포식자, 뱀의 피식자)</li></ul>',
      missions: [
        {
          id: 'ppord', title: '변화의 순서와 정점의 시차', manual: true,
          goal: '아래 카드 4장을 <b>일어나는 순서대로</b> 눌러 번호를 붙이고, <b>포식자의 정점이 피식자보다 몇 년 늦는지</b> 고른 뒤 ✔ 확인하기를 누르세요.',
          hint: '그래프에서 흰 점은 변화가 시작되는 때예요. 왼쪽부터 어떤 곡선이 먼저 오르고 내리는지 보세요. 초록 점선(피식자 정점)과 주황 점선(포식자 정점)의 가로 거리를 눈금으로 읽어요.',
          setup() { setMode('pp'); },
          check() {
            const q = S.pp;
            if (q.seq.length < 4) return '카드 4장을 모두 눌러 번호를 붙이세요. (' + q.seq.length + ' / 4)';
            if (q.seq.join() !== '0,1,2,3') { q.bad = true; q.shakeT = S.clock; return '순서가 맞지 않아요. 그래프에서 왼쪽에서 오른쪽(시간 순서)으로 어떤 곡선이 먼저 변하는지 따라가 보세요. 먼저 피식자가 늘어요.'; }
            if (q.lag === '') return '포식자의 정점이 피식자보다 몇 년 늦는지도 골라요.';
            if (q.lag !== '1') { $('#lagSel').classList.add('bad'); return '그래프의 점선 사이 거리를 다시 읽어 보세요. 눈금 1칸이 1년이에요(5년마다 큰 눈금).'; }
            $('#lagSel').classList.remove('bad'); $('#lagSel').classList.add('ok');
            return true;
          },
          status: () => '누른 카드 ' + S.pp.seq.length + ' / 4 &nbsp; 시차 ' + (S.pp.lag === '' ? '—' : '선택'),
          explain: '순서는 <b>① 피식자 증가 → ② 포식자 증가 → ③ 피식자 감소 → ④ 포식자 감소</b>예요. 피식자가 먼저 많아져야 먹이가 풍부해진 포식자가 늘기 때문에 포식자의 정점은 피식자보다 <b>약 2~3년 늦어요</b>.',
        },
        {
          id: 'cases', title: '포식자와 피식자 지정', manual: true,
          goal: '<b>🦁 사례 카드</b> 화면에서 사례 3장의 <b>포식자</b>를 고르고, 먹이 사슬에서 <b>포식자이면서 피식자인 생물</b>을 모두 누른 뒤 ✔ 확인하기를 누르세요.',
          hint: '잡아먹는 쪽이 포식자예요. 먹이 사슬(메뚜기 → 개구리 → 뱀 → 매)에서 잡아먹으면서 동시에 잡아먹히는 생물은 양쪽에 화살표가 이어진 가운데 생물이에요.',
          setup() { setMode('case'); },
          check() {
            const q = S.cs;
            if (csPicked() < 3) return '사례 카드 3장 모두 포식자를 골라요. (' + csPicked() + ' / 3)';
            let bad = false; PAIRS.forEach((p, i) => { if (q.pick[i] !== p.pred) { bad = true; if (!q.bad['p' + i]) { q.bad['p' + i] = true; q.shakeT = S.clock; } } else delete q.bad['p' + i]; });
            if (bad) return '빨간 카드를 다시 보세요. 잡아먹는 쪽이 포식자, 잡아먹히는 쪽이 피식자예요.';
            if (csDualSet().join() !== CHAIN_DUAL.join()) { q.bad.chain = true; q.shakeT = S.clock; return '먹이 사슬에서 잡아먹으면서 동시에 잡아먹히는 생물을 모두 골라요. 사슬의 맨 앞과 맨 뒤는 아니에요.'; }
            delete q.bad.chain; return true;
          },
          status: () => '포식자 지정 ' + csPicked() + ' / 3 &nbsp; 둘 다인 생물 ' + csDualSet().length + '종',
          explain: '사자, 무당벌레, 올빼미가 <b>포식자</b>이고 얼룩말, 진딧물, 쥐가 <b>피식자</b>예요. 먹이 사슬 메뚜기 → 개구리 → 뱀 → 매에서 <b>개구리</b>(메뚜기의 포식자, 뱀의 피식자)와 <b>뱀</b>(개구리의 포식자, 매의 피식자)이 포식자이면서 피식자예요.',
        },
        {
          type: 'quiz', title: '포식자가 사라지면',
          goal: '어떤 초원에서 <b>포식자가 모두 사라지면</b> 피식자의 개체 수는 어떻게 될 가능성이 클까요?',
          setup() { setMode('pp'); },
          choices: ['먹이와 공간이 한정되어 있어도 계속 늘기만 한다', '한동안 늘어나지만 먹이·공간 부족 같은 환경 저항으로 결국 일정 수준에서 멈추거나 줄어들 수 있다', '곧바로 모두 사라진다', '아무 변화도 없다'],
          answer: 1,
          feedback: ['환경 수용력이 있어서 무한히 늘 수는 없어요.', '', '포식자가 없어졌다고 피식자가 사라지지는 않아요.', '포식자가 사라지면 잡아먹히는 개체가 줄어 처음에는 개체 수가 늘어요.'],
          explain: '포식자가 사라지면 잡아먹히는 개체가 줄어 피식자는 <b>한동안 늘어나요</b>. 하지만 먹이와 공간이 한정되어 있어 <b>환경 수용력</b>에서 멈추거나, 먹이가 모자라 줄어들 수 있어요.',
        },
      ],
    },
    {
      title: '공생과 기생: 이익과 손해 따지기', short: '공생과 기생', icon: '🤝', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 한 종이 이익을 얻고 다른 종이 손해를 보는 포식과 피식을 봤어요. 이번에는 <b>함께 붙어 사는 관계</b>를 두 생물이 얻는 <b>이익(+)과 손해(−)</b>로 나눠 봐요.</div>' +
        '<p>사례 카드 8장의 확대 그림을 보고 <b>상리 공생(+ +) · 편리 공생(+ 0) · 기생(+ −)</b> 칸으로 끌어다 놓아요.</p>',
      features: ['sym'],
      setup() { resetSym(); setMode('sym'); },
      recap: '공생은 함께 사는 두 종 중 적어도 한 종이 이익을 얻고 다른 종이 손해를 입지 않는 관계예요. 두 종 모두 이익이면 상리 공생, 한 종만 이익이면 편리 공생이에요. 기생은 한 종이 이익을 얻고 다른 종이 손해를 입어요.',
      summary: '<ul><li><b>상리 공생(+ +)</b>: 두 종 모두 이익 (콩과 식물과 뿌리혹박테리아, 말미잘과 흰동가리)</li><li><b>편리 공생(+ 0)</b>: 한 종만 이익, 다른 종은 이익도 손해도 없음 (빨판상어와 상어, 따개비와 고래)</li><li><b>기생(+ −)</b>: 한 종은 이익, 다른 종은 손해 (겨우살이와 참나무, 회충과 사람, 벼룩과 개)</li></ul>',
      missions: [
        {
          id: 'sym', title: '공생과 기생 분류', manual: true,
          goal: '카드 8장을 끌어 <b>상리 공생 · 편리 공생 · 기생</b> 칸에 놓은 뒤 ✔ 확인하기를 누르세요.',
          hint: '카드를 눌러 확대 그림을 보고, 화살표로 두 생물이 서로에게 무엇을 주는지 따져요. 두 생물 모두 얻으면 상리 공생, 한쪽은 얻기만 하고 다른 쪽은 영향이 없으면 편리 공생, 한쪽이 손해를 입으면 기생이에요.',
          setup() { setMode('sym'); },
          check() {
            const q = S.sym;
            if (symPlaced() < 8) return '아직 놓지 않은 카드가 ' + (8 - symPlaced()) + '장 있어요.';
            const bad = []; q.place.forEach((c, i) => { if (c !== SYM[i].type) { bad.push(i); if (!q.bad[i]) { q.bad[i] = true; q.shakeT = S.clock; } } else delete q.bad[i]; });
            if (bad.length) { const s = SYM[bad[0]]; return '빨간 카드 ' + bad.length + '장을 다시 놓아 보세요. ' + s.short + ': ' + s.fact.split('.')[0] + '. 두 생물의 이익(+)·손해(−)를 따져 봐요.'; }
            return true;
          },
          status: () => '놓은 카드 ' + symPlaced() + ' / 8',
          explain: '<b>상리 공생</b>: 콩과 식물·뿌리혹박테리아, 말미잘·흰동가리, 개미·진딧물. <b>편리 공생</b>: 빨판상어·상어, 따개비·고래. <b>기생</b>: 겨우살이·참나무, 회충·사람, 벼룩·개. 기생은 숙주가 손해를 입는 점이 공생과 달라요.',
        },
        {
          type: 'quiz', title: '편리 공생 찾기',
          goal: '다음 중 <b>편리 공생</b>(한 종만 이익, 다른 종은 이익도 손해도 없음)에 해당하는 것은?',
          setup() { setMode('sym'); },
          choices: ['콩과 식물과 뿌리혹박테리아', '빨판상어와 상어', '겨우살이와 참나무', '말미잘과 흰동가리'],
          answer: 1,
          feedback: ['두 종이 서로 질소 양분과 양분을 주고받는 상리 공생이에요.', '', '겨우살이는 이익을 얻고 참나무는 손해를 입는 기생이에요.', '두 종 모두 이익을 얻는 상리 공생이에요.'],
          explain: '빨판상어는 상어에 붙어 이동하며 이익을 얻지만 상어는 <b>이익도 손해도 없어요</b>(편리 공생). 상리 공생은 두 종 모두 이익, 기생은 한 종이 손해를 입어요.',
        },
      ],
    },
    {
      title: '관계 발표: 군집 속 쌍 찾기', short: '관계 발표', icon: '🎤', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 경쟁, 분서, 포식과 피식, 공생, 기생을 배웠어요. 이제 가상 군집 카드에서 실제로 <b>관계 쌍을 찾아 발표문</b>을 만들어요. 조사한 내용은 <b>출처</b>와 함께 발표해요.</div>' +
        '<p>사바나, 산호초, 숲 토양에서 두 생물을 눌러 관계를 찾고, <b>종 A – 종 B – 관계 유형 – 근거</b>를 발표문에 정리해요. 한 종이 사라지면 군집이 어떻게 변할지도 추론해요.</p>',
      features: ['rep'],
      setup() { resetRep(); setMode('rep'); },
      recap: '군집 속 생물은 경쟁, 분서, 포식과 피식, 공생, 기생으로 서로 이어져 있어서 한 종이 사라지면 이어진 다른 종도 영향을 받아요. 발표할 때는 근거와 출처를 함께 밝혀요.',
      summary: '<ul><li>군집 내 상호작용: <b>종간 경쟁, 분서, 포식과 피식, 공생(상리·편리), 기생</b>. 개체군 내 상호작용(텃세·순위제·리더제·사회생활·가족생활)과 구별해요.</li><li>발표문은 <b>종 A – 종 B – 관계 유형 – 근거</b>로 정리하고, 조사한 자료의 <b>출처</b>(책·누리집 이름, 확인한 날짜)를 밝혀요.</li><li>한 종이 사라지면 이어진 종이 영향을 받아요. 예: 산호초에서 말미잘이 사라지면 흰동가리는 보호처를 잃어 줄어들 가능성이 커요.</li></ul>',
      missions: [
        {
          id: 'rep', title: '관계 쌍 6개 발표문 만들기', manual: true,
          goal: '세 군집에서 관계 쌍을 <b>모두 6개</b>(군집마다 2개 이상) 찾아 <b>관계 유형과 근거</b>를 고르고, 마지막으로 <b>출처 표기</b>를 고른 뒤 ✔ 확인하기를 누르세요.',
          hint: '관계가 있어 보이는 두 생물을 차례로 눌러요. 찾으면 관계 유형과 근거를 골라 ➕ 발표문에 추가해요. 위의 🦁 🐠 🌳 버튼으로 군집을 바꿔요.',
          setup() { setMode('rep'); S.rep.mode = 'find'; updateCtl(); },
          check() {
            const q = S.rep;
            if (repCount() < NEED_PAIRS) return '발표문에 정리한 관계가 아직 ' + repCount() + '개예요. ' + NEED_PAIRS + '개를 채워요.';
            const low = COMM.findIndex((c, i) => repBy(i) < NEED_EACH); if (low >= 0) return COMM[low].n + '에서도 관계를 ' + NEED_EACH + '개 이상 찾아요.';
            if (q.src === '') return '발표 자료의 출처 표기 방법을 골라요.';
            if (q.src !== SRC_OK) { $('#srcSel').classList.add('bad'); return '조사한 자료는 이름과 확인한 날짜 같은 출처를 밝혀야 해요. 다른 사람의 글을 내 글처럼 쓰면 안 돼요.'; }
            $('#srcSel').classList.remove('bad'); $('#srcSel').classList.add('ok'); return true;
          },
          status: () => '찾은 관계 ' + repCount() + ' / ' + NEED_PAIRS + ' &nbsp; ' + COMM.map((c, i) => c.ic + repBy(i)).join(' ') + ' &nbsp; 출처 ' + (S.rep.src === SRC_OK ? '✅' : '⬜'),
          explain: '사바나: <b>사자–얼룩말(포식과 피식)</b>, <b>얼룩말–가젤(종간 경쟁)</b>, <b>기린–얼룩말(분서)</b>, <b>소등쪼기새–물소(상리 공생)</b>. 산호초: 흰동가리–말미잘(상리 공생), 빨판상어–상어(편리 공생), 문어–게(포식과 피식). 숲 토양: 겨우살이–참나무(기생), 콩과 식물–뿌리혹박테리아(상리 공생), 고슴도치–지렁이(포식과 피식)예요.',
        },
        {
          id: 'rm', title: '한 종이 사라지면?', manual: true,
          goal: '<b>🚫 한 종 없애기</b> 화면에서 <b>산호초의 말미잘</b>을 눌러 없애 본 뒤, 군집이 어떻게 변할지 예측해 고르고 ✔ 확인하기를 누르세요.',
          hint: '위에서 🐠 산호초를 고르고 🚫 한 종 없애기로 바꿔요. 말미잘을 누르면 이어진 생물의 변화가 나타나요.',
          setup() { setMode('rep'); },
          check() {
            const q = S.rep;
            if (!q.triedRemove['1:1']) return '산호초 화면에서 말미잘을 눌러 없애 보세요.';
            if (q.pred === '') return '예측하는 답을 골라요.';
            if (q.pred !== '0') { $('#predSel').classList.add('bad'); return '흰동가리와 말미잘의 관계(상리 공생)를 떠올려 보세요. 말미잘이 사라지면 흰동가리가 보호를 받을 수 있을까요?'; }
            $('#predSel').classList.remove('bad'); $('#predSel').classList.add('ok'); return true;
          },
          status: () => '말미잘 없애 보기 ' + mark(!!S.rep.triedRemove['1:1']) + ' &nbsp; 예측 ' + (S.rep.pred === '' ? '—' : '선택'),
          explain: '말미잘과 흰동가리는 <b>상리 공생</b>이라서, 말미잘이 사라지면 흰동가리는 <b>보호처와 도움을 잃어 줄어들 가능성</b>이 커요. 군집 속 관계는 서로 이어져 있어서 한 종의 변화가 다른 종에게 퍼져요.',
        },
        {
          type: 'quiz', title: '개체군 안과 군집 안의 상호작용',
          goal: '다음 중 <b>군집 내 종간 상호작용이 아닌</b>(개체군 내 상호작용인) 것은?',
          setup() { setMode('rep'); },
          choices: ['꿀벌 무리에서 일벌과 여왕벌이 일을 나누어 맡는다', '사자가 얼룩말을 잡아먹는다', '말미잘과 흰동가리가 서로 도움을 준다', '겨우살이가 참나무에서 양분을 빼앗는다'],
          answer: 0,
          feedback: ['', '서로 다른 종 사이의 포식과 피식이라 군집 내 상호작용이에요.', '서로 다른 두 종의 상리 공생이라 군집 내 상호작용이에요.', '서로 다른 두 종의 기생이라 군집 내 상호작용이에요.'],
          explain: '같은 종(꿀벌)끼리 일을 나누는 <b>사회생활</b>은 <b>개체군 내</b> 상호작용이고, 서로 다른 종 사이의 포식과 피식·공생·기생·경쟁은 <b>군집 내</b> 상호작용이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-species-interaction', mount: '#game', badge: '군집 관계 탐정', homeHref: '../../index.html#hb',
    featureLabels: { cul: '🧫 배양 병 3개 · 자원 겹침 슬라이더', pp: '📈 포식·피식 그래프', case: '🦁 포식자·피식자 사례 카드', sym: '🤝 공생·기생 분류 카드와 확대 그림', rep: '🎤 군집 카드 · 발표문 · 한 종 없애기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetCul(); resetPP(); resetCase(); resetSym(); resetRep();
  buildEv();
  setMode('cul');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepCul(dt); stepPP(dt);
    switch (S.mode) {
      case 'cul': drawCul(dt, t); break;
      case 'pp': drawPP(dt, t); break;
      case 'case': drawCase(dt, t); break;
      case 'sym': drawSym(dt, t); break;
      default: drawRep(dt, t);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,247,240,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    const cm = game && game.current();
    if (game && game.phase === 'success' && cm) {
      if (cm.id === 'ppord' && !S.pp.solved) { S.pp.solved = true; S.pp.bad = false; S.pp.t = 0; S.pp.play = true; updateCtl(); }
      if (cm.id === 'cases' && !S.cs.solved) S.cs.solved = true;
      if (cm.id === 'sym' && !S.sym.solved) { S.sym.solved = true; }
    }
    if (game && game.free && !S.filled) { S.filled = true; autoFill(); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, levels, BOT, getSim, bottleN, CP, MOD, PP_EV, PP_SHOW, ppCard, PPB, px_, pyPrey, pyPred, PAIRS, CHAIN_DUAL, pairTile, chainTile, SYM, SYMG, cardRect, TRAY_ORDER, symAt, COMM, TYPES, spPos, consequences, repTap, repAdd, buildEv, autoFill,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepCul(0.02); stepPP(0.02); } },
  };
})();
