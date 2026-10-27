/* =========================================================
   통합과학1 Ⅰ. 과학의 기초 - 측정과 어림, 표준 (단원 4차시)
   성취기준 [10통과1-01-03] 과학 탐구에서 측정과 어림의 의미를 알고, 일상생활의 여러 가지 상황에서
   측정 표준의 유용성과 필요성을 논증할 수 있다.
   ① 관찰: 제각각 측정 (뼘으로 책상 재기, 시장의 "한 줌")
   ② 실험: 측정과 어림 (눈금 읽기, 5회 측정과 평균, 버니어 캘리퍼스)
   ③ 탐구: 어림하기 (가정 카드를 끌어 자릿수 맞히기)
   ④ 적용: 표준의 필요 (사례 카드 → 주장·근거·이유)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 840 : 560;
  const RM = SciSim.reduceMotion;
  const KV = PHONE ? 1.4 : 1;
  const Y = (y) => Math.round(y * KV);
  const MINUS = '−';
  const SUPD = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const sup = (n) => String(n).split('').map((c) => SUPD[c] || c).join('');
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  let SPEED = 1;

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f3f6fb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FS = PHONE ? 1.2 : 1;
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  let game = null;
  const has = (n) => !!(game && game.has(n));

  function wrapText(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    const push = () => { if (line) out.push(line); line = ''; };
    str.split(' ').forEach((tok) => {
      const cand = line ? line + ' ' + tok : tok;
      if (ctx.measureText(cand).width <= maxW) { line = cand; return; }
      if (line) push();
      if (ctx.measureText(tok).width <= maxW) { line = tok; return; }
      tok.split('').forEach((ch) => { if (ctx.measureText(line + ch).width > maxW) push(); line += ch; });
    });
    push(); ctx.restore(); return out;
  }
  function paraText(x, y, str, maxW, size, o) {
    o = o || {};
    const lines = wrapText(str, maxW, size, o.weight || 700), lh = Math.round(size * (o.lh || 1.35) * FS);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, color: o.color || '#1b2333', weight: o.weight || 700, align: o.align || 'left' }));
    return lines.length * lh;
  }
  function sci(v, d) {
    if (!isFinite(v) || v <= 0) return '—';
    if (v >= 1 && v < 100) return String(+v.toPrecision(3));
    const e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e);
    return (+m.toFixed(d == null ? 1 : d)) + '×10' + sup(e);
  }

  /* ======================================================
     끌어 놓기 공통
     ====================================================== */
  function pickItem(p, list) {
    for (let i = list.length - 1; i >= 0; i--) { const c = list[i]; if (Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return c; }
    return null;
  }
  function cardBox(c, o) {
    o = o || {};
    const lift = c.lift || 0, sc = 1 + lift * 0.07, sh = c.shake > 0 ? Math.sin(c.shake * 40) * 5 * Math.min(1, c.shake * 3) : 0;
    ctx.save(); ctx.translate(c.x + sh, c.y); ctx.scale(sc, sc);
    D.shadow(() => { ctx.fillStyle = o.fill || '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 12).fill(); }, { blur: 5 + lift * 14, y: 2 + lift * 7, color: 'rgba(30,45,80,' + (0.16 + lift * 0.12) + ')' });
    ctx.strokeStyle = o.stroke || '#cbd5e1'; ctx.lineWidth = o.sw || 2; rr(-c.w / 2, -c.h / 2, c.w, c.h, 12).stroke();
    return () => ctx.restore();
  }
  function dragStart(c, p, list) {
    S.drag = { c, ox: p.x - c.x, oy: p.y - c.y };
    const i = list.indexOf(c); if (i >= 0) { list.splice(i, 1); list.push(c); }
    SciSim.tween(c, { lift: 1 }, { duration: 0.12 }); Sound.click();
    c.free = true;
  }
  function flyTo(c, x, y) {
    c.free = false; c.tx = x; c.ty = y;
    SciSim.tween(c, { lift: 0 }, { duration: 0.25 });
  }
  function stepItems(list, dt) {
    list.forEach((c) => {
      if (c.free) return;
      if (RM) { c.x = c.tx; c.y = c.ty; } else { c.x = SciSim.approach(c.x, c.tx, dt, 14); c.y = SciSim.approach(c.y, c.ty, dt, 14); }
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
    });
  }

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'span', clock: 0, fade: 0, drag: null,
    span: { who: -1, p: 0, running: false, res: [null, null, null], bars: [0, 0, 0], reveal: 0, last: -1, done: 0 },
    mk: { act: -1, ph: 0, res: [null, null, null], disp: [0, 0, 0], pan: [0, 0, 0], reveal: 0 },
    ruler: { tool: 'ruler', zoomT: 1, zoom: 1, meas: { ruler: [], vernier: [] }, mean: { ruler: 0, vernier: 0 }, flash: 0, readOK: false, avgOK: false, dotAge: [] },
    est: { q: 0, qs: [], gauge: 0, link: 0 },
    cs: { cards: [], sel: [], pick: null, ver: 0, done: 0 },
  };

  /* ======================================================
     공통 그림: 사람, 손
     ====================================================== */
  function person(cx, cy, col, s, t, o) {
    o = o || {};
    const bob = o.bob ? Math.sin(t * 7) * 2 : 0, y0 = cy + bob;
    D.shadow(() => { ctx.fillStyle = col; rr(cx - 26 * s, y0 + 2 * s, 52 * s, 52 * s, 16 * s).fill(); }, { blur: 8, y: 3 });
    ctx.fillStyle = 'rgba(255,255,255,.28)'; rr(cx - 20 * s, y0 + 8 * s, 14 * s, 36 * s, 7 * s).fill();
    D.sphere(cx, y0 - 20 * s, 21 * s, o.skin || '#fcd9b6');
    ctx.fillStyle = o.hair || '#3b2418'; ctx.beginPath(); ctx.arc(cx, y0 - 22 * s, 21.5 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillStyle = '#1b2333'; ctx.beginPath(); ctx.arc(cx - 7 * s, y0 - 17 * s, 2.2 * s, 0, 6.3); ctx.arc(cx + 7 * s, y0 - 17 * s, 2.2 * s, 0, 6.3); ctx.fill();
    ctx.strokeStyle = '#b4513a'; ctx.lineWidth = 1.8 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, y0 - 11 * s, 5 * s, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  /* 뼘: 엄지 끝에서 새끼손가락 끝까지 (x=왼쪽 끝, w=뼘 길이) */
  function handSpan(x, y, w, h, col, a) {
    ctx.save(); ctx.globalAlpha *= a == null ? 1 : a;
    const lw = Math.max(5, Math.min(w * 0.17, h * 0.2)), ix = x + lw / 2, iw = w - lw;
    const pcx = x + w * 0.5, pcy = y + h * 0.8;
    const tips = [[0, 0.56], [0.2, 0.22], [0.5, 0.08], [0.78, 0.18], [1, 0.5]];
    ctx.lineCap = 'round';
    [[lw + 3, '#c98f62'], [lw, '#f6d3ae']].forEach(([wd, c]) => {
      ctx.strokeStyle = c; ctx.lineWidth = wd;
      tips.forEach(([fx, fy]) => { ctx.beginPath(); ctx.moveTo(pcx, pcy); ctx.lineTo(ix + fx * iw, y + fy * h + lw / 2); ctx.stroke(); });
    });
    ctx.fillStyle = '#f6d3ae'; ctx.strokeStyle = '#c98f62'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(pcx, pcy, w * 0.27, h * 0.2, 0, 0, 6.3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f6d3ae'; ctx.beginPath(); ctx.ellipse(pcx, pcy, w * 0.27 - 1, h * 0.2 - 1, 0, 0, 6.3); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.beginPath();
    ctx.moveTo(x, y + h + 4); ctx.lineTo(x + w, y + h + 4); ctx.moveTo(x, y + h - 2); ctx.lineTo(x, y + h + 10); ctx.moveTo(x + w, y + h - 2); ctx.lineTo(x + w, y + h + 10); ctx.stroke();
    ctx.restore();
  }

  /* ======================================================
     화면 1: 뼘으로 책상 재기
     ====================================================== */
  const PEOPLE = [
    { n: '민지', cm: 18, col: '#ec6b8e', hair: '#3b2418' },
    { n: '준호', cm: 20, col: '#3867f4', hair: '#1f2937' },
    { n: '도윤', cm: 22, col: '#14a058', hair: '#5b3a29' },
  ];
  const DESK_CM = 200, STAMP_DUR = 0.3;
  const SL = () => { const x0 = Math.round(VW * 0.11), x1 = VW - x0; return { x0, x1, pxcm: (x1 - x0) / DESK_CM }; };
  function spanStart(i) {
    const sp = S.span; if (sp.running && sp.who === i) return;
    sp.who = i; sp.p = 0; sp.running = true; sp.last = -1; Sound.click();
    updateWho();
  }
  function stepSpan(dt) {
    const sp = S.span;
    for (let i = 0; i < 3; i++) sp.bars[i] = RM ? (sp.res[i] || 0) : SciSim.approach(sp.bars[i], sp.res[i] || 0, dt, 5);
    if (sp.running) {
      const n = DESK_CM / PEOPLE[sp.who].cm;
      sp.p = Math.min(n, sp.p + dt * SPEED / (RM ? 0.03 : STAMP_DUR));
      const k = Math.floor(sp.p);
      if (k !== sp.last) { sp.last = k; if (k > 0) Sound.tick(); }
      if (sp.p >= n) {
        sp.running = false; sp.res[sp.who] = n;
        const L = SL(); parts.burst(L.x1 - 20, Y(228), { count: 10, speed: 120, size: 3, life: 0.7, colors: [PEOPLE[sp.who].col, '#fde68a', '#fff'] });
        Sound.success(); updateWho();
        if (sp.res.every((v) => v != null) && !sp.reveal) SciSim.tween(sp, { reveal: 1 }, { duration: 1.1, delay: 0.5, ease: 'outCubic' });
      }
    }
    if (sp.who >= 0 && sp.res[sp.who] != null && !sp.running) sp.p = sp.res[sp.who];
  }
  function drawSpan(t) {
    const sp = S.span, L = SL();
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#e3e9f2'; ctx.fillRect(0, Y(352), VW, VH - Y(352));
    D.text(VW / 2, Y(24), '같은 책상을 세 친구가 각자의 뼘으로 재어 봐요', { size: 17, weight: 800, color: '#1b2333' });
    // 친구들
    PEOPLE.forEach((p, i) => {
      const cx = VW * (0.18 + 0.32 * i), cy = Y(88), sel = sp.who === i;
      if (sel) { D.glow(cx, cy, 70, p.col, 0.28); D.ring(cx, cy + 6, 50, t, { color: p.col, speed: 0.8, width: 2.5 }); }
      person(cx, cy, p.col, 0.9, t, { bob: sel && sp.running, hair: p.hair });
      D.text(cx, Y(152), p.n + ' · 뼘 ' + p.cm + ' cm', { size: 15, weight: 800, color: p.col });
    });
    // 책상 길이 표시
    const dy = Y(176);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L.x0, dy); ctx.lineTo(L.x1, dy); ctx.moveTo(L.x0, dy - 6); ctx.lineTo(L.x0, dy + 6); ctx.moveTo(L.x1, dy - 6); ctx.lineTo(L.x1, dy + 6); ctx.stroke();
    D.label(VW / 2, dy, sp.reveal > 0.6 ? '책상 길이 = 200 cm' : '책상 길이 = ?', { bg: sp.reveal > 0.6 ? '#14a058' : '#475569', size: 14 });
    // 책상
    const ty = Y(196), th = 72;
    const wood = ctx.createLinearGradient(0, ty, 0, ty + th); wood.addColorStop(0, '#e8c898'); wood.addColorStop(1, '#d7b07a');
    D.shadow(() => { ctx.fillStyle = wood; rr(L.x0 - 14, ty, L.x1 - L.x0 + 28, th, 8).fill(); }, { blur: 10, y: 5 });
    ctx.fillStyle = '#b98a52'; rr(L.x0 - 14, ty + th - 2, L.x1 - L.x0 + 28, 14, 4).fill();
    ctx.fillStyle = '#9a7040'; ctx.fillRect(L.x0 - 4, ty + th + 12, 14, Y(54)); ctx.fillRect(L.x1 - 10, ty + th + 12, 14, Y(54));
    // 뼘 도장
    if (sp.who >= 0) {
      const P = PEOPLE[sp.who], w = P.cm * L.pxcm, n = DESK_CM / P.cm, full = Math.floor(sp.p + 1e-9), hh = 54;
      for (let k = 0; k < full && k < n - 1e-9; k++) {
        const x = L.x0 + k * w;
        if (k % 2) { ctx.fillStyle = 'rgba(0,0,0,.05)'; ctx.fillRect(x, ty + 6, w, th - 12); }
        handSpan(x, ty + 6, w, hh, P.col, 1);
        D.text(x + w / 2, ty + th - 4, String(k + 1), { size: 13, weight: 800, color: P.col });
      }
      const finished = !sp.running && sp.p >= n - 1e-9;
      if (full < n - 1e-6 && (sp.running || finished)) {
        const x = L.x0 + full * w, wd = Math.min(w, L.x1 - x + 0.5), f = finished ? 1 : sp.p - full;
        if (wd > 1) {
          ctx.save(); ctx.beginPath(); ctx.rect(x, ty - 40, wd, th + 60); ctx.clip();
          const e = SciSim.ease.outBack(clamp(f * 1.4, 0, 1));
          ctx.globalAlpha = clamp(f * 3, 0, 1);
          handSpan(x, ty + 6 - (1 - e) * 34, w, hh, P.col, 1);
          if (wd < w - 1) { ctx.setLineDash([4, 4]); ctx.strokeStyle = P.col; ctx.lineWidth = 2; ctx.strokeRect(x + 1, ty + 5, wd - 2, hh + 6); ctx.setLineDash([]); }
          ctx.restore();
          if (wd >= w - 1) D.text(x + w / 2, ty + th - 4, String(full + 1), { size: 13, weight: 800, color: P.col, alpha: clamp(f * 2, 0, 1) });
          else if (finished) D.text(x + wd / 2, ty + th - 4, '0.' + String(Math.round((n - full) * 10)), { size: 13, weight: 800, color: P.col });
        }
      }
      const cnt = Math.min(Math.ceil(sp.p - 1e-9), Math.ceil(n - 1e-9));
      D.label(VW / 2, ty + th + Y(38), P.n + '의 뼘: ' + (sp.running ? Math.max(1, cnt) + '번째 뼘' : n.toFixed(1) + '뼘'), { bg: P.col, size: 15 });
    } else {
      D.text(VW / 2, ty + th / 2 + 5, '친구를 눌러 책상을 재어 보세요', { size: 16, weight: 700, color: 'rgba(90,70,40,.8)' });
    }
    // 결과 막대
    const by0 = Y(372), rh = PHONE ? 52 : 32, bx = L.x0, scale = (L.x1 - L.x0) / 12.5;
    D.text(L.x0, by0 - 4, '📏 재어 본 값: 책상 길이는 몇 뼘?', { size: 15, weight: 800, color: '#334155', align: 'left' });
    PEOPLE.forEach((p, i) => {
      const y = by0 + 12 + i * rh, v = sp.bars[i], has1 = sp.res[i] != null;
      ctx.fillStyle = 'rgba(100,116,139,.12)'; rr(bx, y, L.x1 - L.x0, 26, 13).fill();
      if (has1) {
        D.shadow(() => { ctx.fillStyle = p.col; rr(bx, y, Math.max(26, v * scale), 26, 13).fill(); }, { blur: 5, y: 2 });
        D.text(bx + 12, y + 18, p.n, { size: 14, weight: 800, color: '#fff', align: 'left' });
        D.text(bx + Math.max(26, v * scale) - 12, y + 18, (v).toFixed(1) + '뼘', { size: 14, weight: 800, color: '#fff', align: 'right' });
      } else D.text(bx + 12, y + 18, p.n + ' · 아직 안 쟀어요', { size: 14, weight: 700, color: '#94a3b8', align: 'left' });
    });
    if (sp.reveal > 0.01) {
      const y = by0 + 12 + 3 * rh + 2, hgt = PHONE ? 84 : 70, o = (1 - sp.reveal) * 14;
      ctx.save(); ctx.globalAlpha = sp.reveal;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(L.x0, y + o, L.x1 - L.x0, hgt, 14).fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2.5; rr(L.x0, y + o, L.x1 - L.x0, hgt, 14).stroke();
      D.text(VW / 2, y + o + 22, '(뼘 수) × (뼘의 길이) → 모두 약 200 cm', { size: 14, weight: 800, color: '#0b6b39' });
      D.text(VW / 2, y + o + 44, PHONE ? '11.1×18 ≈ 10×20 ≈ 9.1×22 ≈ 200' : '11.1 × 18 ≈ 200  ·  10.0 × 20 = 200  ·  9.1 × 22 ≈ 200', { size: PHONE ? 14 : 15, weight: 800, color: '#1b2333' });
      D.text(VW / 2, y + o + (PHONE ? 70 : 63), '같은 단위(cm)로 재면 값이 같아져요!', { size: 13.5, weight: 800, color: '#14a058' });
      ctx.restore();
    }
  }

  /* ======================================================
     화면 2: 시장의 "한 줌"
     ====================================================== */
  const VEND = [
    { n: '상인 A', g: 60, beans: 12, hs: 0.8, col: '#e07a3b', size: '작은 손' },
    { n: '상인 B', g: 80, beans: 16, hs: 1.0, col: '#8b5cf6', size: '보통 손' },
    { n: '상인 C', g: 100, beans: 20, hs: 1.2, col: '#0d9488', size: '큰 손' },
  ];
  const BEAN_POS = VEND.map((v, i) => { const r = rng(40 + i); return Array.from({ length: 24 }, () => ({ x: (r() - 0.5) * 38, y: -r() * 14, c: r() })); });
  const MKDUR = 2.4;
  const vx = (i) => VW * (0.17 + 0.33 * i);
  function mkStart(i) {
    const m = S.mk; if (m.act >= 0 && m.ph < 1) return;
    m.act = i; m.ph = 0; Sound.click(); updateVend();
  }
  function stepMarket(dt) {
    const m = S.mk;
    if (m.act >= 0 && m.ph < 1) {
      m.ph = Math.min(1, m.ph + dt * SPEED / (RM ? 0.05 : MKDUR));
      if (m.ph >= 1) {
        const i = m.act; m.res[i] = VEND[i].g; Sound.success(); updateVend();
        { const st = stall(i); parts.burst(st.cx + 58 * MO.dx, st.ry + MO.base - 56, { count: 6, speed: 70, size: 3, life: 0.5, colors: ['#fde68a', '#fff'] }); }
        if (m.res.every((v) => v != null) && !m.reveal) SciSim.tween(m, { reveal: 1 }, { duration: 1, delay: 0.4 });
      }
    }
    for (let i = 0; i < 3; i++) {
      const done = m.res[i] != null, dropping = m.act === i && m.ph > 0.84;
      const target = done ? VEND[i].g : 0;
      m.disp[i] = RM ? target : SciSim.approach(m.disp[i], dropping || done ? target : 0, dt, 4);
      m.pan[i] = RM ? target / 100 : SciSim.approach(m.pan[i], dropping || done ? target / 100 : 0, dt, 6);
    }
  }
  function cupHand(x, y, s, withBeans, n, ci) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    D.shadow(() => {
      ctx.fillStyle = '#f6d3ae'; ctx.strokeStyle = '#c98f62'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-22, -8); ctx.quadraticCurveTo(-22, 16, 0, 16); ctx.quadraticCurveTo(22, 16, 22, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(26, -4, 6, 0, 6.3); ctx.fill(); ctx.stroke();
    }, { blur: 6, y: 3 });
    if (withBeans) for (let k = 0; k < n; k++) { const q = BEAN_POS[ci][k]; D.sphere(q.x * 0.6, -8 + q.y * 0.5, 4.5, q.c > 0.5 ? '#a16207' : '#ca8a04', { gloss: false }); }
    ctx.fillStyle = '#f6d3ae'; ctx.strokeStyle = '#c98f62'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-22, -4); ctx.quadraticCurveTo(-22, 12, 0, 12); ctx.quadraticCurveTo(22, 12, 22, -4); ctx.lineTo(22, -2); ctx.quadraticCurveTo(0, 6, -22, -2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /* 가게 배치: 가로 화면은 세 칸, 휴대폰은 세 줄 */
  const MO = PHONE ? { vend: 46, name: 98, hand: 50, handLab: 82, sack: 150, base: 186, rowH: 206, top: 44, dx: 1.75 } : { vend: 52, name: 116, hand: 58, handLab: 90, sack: 210, base: 248, rowH: 0, top: 52, dx: 1 };
  const stall = (i) => (PHONE ? { cx: VW / 2, ry: MO.top + i * MO.rowH } : { cx: vx(i), ry: MO.top });
  function drawMarket(t) {
    const m = S.mk, dx = MO.dx;
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    if (!PHONE) { ctx.fillStyle = '#ecdfc0'; ctx.fillRect(0, Y(300), VW, VH - Y(300)); }
    D.text(VW / 2, PHONE ? 28 : 24, '시장에서 "한 줌만 주세요!" 라고 하면?', { size: 17, weight: 800, color: '#1b2333' });
    VEND.forEach((v, i) => {
      const { cx, ry } = stall(i), sx = cx - 56 * dx, sy = ry + MO.sack, cx2 = cx + 58 * dx, base = ry + MO.base;
      if (PHONE) { ctx.fillStyle = i % 2 ? '#fbf3df' : '#f7ecd0'; rr(20, ry - 6, VW - 40, MO.rowH - 6, 18).fill(); }
      // 가게 지붕
      const rw = PHONE ? 250 : 100;
      ctx.fillStyle = v.col; ctx.beginPath(); ctx.moveTo(cx - rw, ry); ctx.lineTo(cx + rw, ry); ctx.lineTo(cx + rw + 12, ry + 18); ctx.lineTo(cx - rw - 12, ry + 18); ctx.closePath(); ctx.fill();
      const nst = PHONE ? 10 : 6, stw = rw * 2 / nst;
      for (let k = 0; k < nst; k++) { ctx.fillStyle = k % 2 ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,0)'; ctx.fillRect(cx - rw + k * stw, ry, stw, 18); }
      person(cx - 30 * dx, ry + MO.vend, v.col, 0.78, t, { hair: '#3b2418' });
      D.text(cx - 30 * dx, ry + MO.name, v.n, { size: 15, weight: 800, color: v.col });
      // 손 크기 견본
      cupHand(cx + 54 * dx, ry + MO.hand, v.hs * 0.9, false, 0, i);
      D.text(cx + 54 * dx, ry + MO.handLab, v.size, { size: 13, weight: 800, color: '#7c5a2e' });
      // 자루
      D.shadow(() => { ctx.fillStyle = '#c9a56b'; ctx.beginPath(); ctx.moveTo(sx - 38, sy + 44); ctx.quadraticCurveTo(sx - 46, sy - 6, sx - 22, sy - 20); ctx.lineTo(sx + 22, sy - 20); ctx.quadraticCurveTo(sx + 46, sy - 6, sx + 38, sy + 44); ctx.closePath(); ctx.fill(); }, { blur: 8, y: 3 });
      ctx.fillStyle = '#a8864f'; ctx.fillRect(sx - 26, sy - 24, 52, 8);
      for (let k = 0; k < 14; k++) { const q = BEAN_POS[i][k % 24]; D.sphere(sx + (q.x * 1.1), sy - 22 + q.y * 0.6, 4.5, q.c > 0.5 ? '#a16207' : '#ca8a04', { gloss: false }); }
      D.text(sx, sy + 20, '콩', { size: 15, weight: 800, color: '#fff' });
      // 저울
      D.shadow(() => { ctx.fillStyle = '#e2e8f0'; rr(cx2 - 40, base - 40, 80, 40, 10).fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; rr(cx2 - 40, base - 40, 80, 40, 10).stroke();
      ctx.fillStyle = '#0f172a'; rr(cx2 - 30, base - 34, 60, 22, 5).fill();
      D.text(cx2, base - 18, Math.round(m.disp[i]) + ' g', { size: 16, weight: 800, color: '#4ade80' });
      const sink = m.pan[i] * 4;
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(cx2 - 3, base - 58 + sink, 6, 20);
      ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.ellipse(cx2, base - 58 + sink, 38, 9, 0, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
      // 저울 위 콩
      const shown = m.res[i] != null ? v.beans : (m.act === i && m.ph > 0.84 ? Math.round(v.beans * smooth(m.ph, 0.84, 0.97)) : 0);
      for (let k = 0; k < shown; k++) { const q = BEAN_POS[i][k]; D.sphere(cx2 + q.x, base - 62 + sink + q.y * (0.7 + k / 30), 4.8, q.c > 0.5 ? '#a16207' : '#ca8a04', { gloss: false }); }
      // 움직이는 손
      if (m.act === i && m.ph < 1) {
        const ph = Math.min(1, m.ph / 0.86), fade = m.ph < 0.86 ? 1 : 1 - (m.ph - 0.86) / 0.14;
        ctx.save(); ctx.globalAlpha = clamp(fade, 0, 1);
        const pts = [[sx, sy - 70], [sx, sy - 18], [sx, sy - 56], [cx2, base - 108]];
        let u, a, b;
        if (ph < 0.3) { u = ph / 0.3; a = pts[0]; b = pts[1]; }
        else if (ph < 0.5) { u = (ph - 0.3) / 0.2; a = pts[1]; b = pts[2]; }
        else { u = (ph - 0.5) / 0.5; a = pts[2]; b = pts[3]; }
        const e = SciSim.ease.inOutCubic(clamp(u, 0, 1));
        const hx = a[0] + (b[0] - a[0]) * e, hy = a[1] + (b[1] - a[1]) * e - (ph >= 0.5 ? Math.sin(e * Math.PI) * 22 : 0);
        cupHand(hx, hy, v.hs, ph > 0.3 && m.ph < 0.86, ph > 0.3 ? v.beans : 0, i);
        ctx.restore();
      }
    });
    // 아래: 결과
    let y0 = PHONE ? MO.top + 3 * MO.rowH + 6 : Y(338);
    if (!PHONE) {
      D.text(VW / 2, y0 + 14, '저울에 올린 "한 줌"의 질량', { size: 15, weight: 800, color: '#334155' });
      VEND.forEach((v, i) => {
        const w = (VW - 60) / 3 - 8, x = 30 + i * ((VW - 60) / 3), h = 62, yy = y0 + 30;
        ctx.fillStyle = '#fff'; D.shadow(() => rr(x + 4, yy, w, h, 14).fill(), { blur: 6, y: 2 });
        ctx.strokeStyle = m.res[i] != null ? v.col : '#cbd5e1'; ctx.lineWidth = 2.5; rr(x + 4, yy, w, h, 14).stroke();
        D.text(x + 4 + w / 2, yy + 24, v.n, { size: 14, weight: 800, color: v.col });
        D.text(x + 4 + w / 2, yy + 52, m.res[i] != null ? v.g + ' g' : '?', { size: 24, weight: 800, color: m.res[i] != null ? '#1b2333' : '#cbd5e1' });
      });
    }
    if (m.reveal > 0.01) {
      const yy = (PHONE ? y0 + 2 : y0 + 30 + 62 + 18) + (1 - m.reveal) * 12;
      ctx.save(); ctx.globalAlpha = m.reveal;
      const bw = VW - 60, bh = PHONE ? 112 : 78;
      ctx.fillStyle = '#fff'; D.shadow(() => rr(30, yy, bw, bh, 14).fill(), { blur: 8, y: 3 });
      ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2.5; rr(30, yy, bw, bh, 14).stroke();
      D.text(VW / 2, yy + 28, '같은 "한 줌"인데 60 g · 80 g · 100 g!', { size: 16, weight: 800, color: '#1b2333' });
      paraText(VW / 2, yy + 54, '사람마다 기준이 달라서 값이 달라요. 저울의 g처럼 모두가 같은 단위로 재면 누구나 같은 값을 얻어요.', bw - 40, 13.5, { align: 'center', color: '#0b6b39', weight: 800 });
      ctx.restore();
    }
  }

  /* ======================================================
     화면 3: 눈금 읽기 (측정과 어림)
     ====================================================== */
  const TRUE_CM = 7.434;
  const RV = [7.43, 7.45, 7.42, 7.44, 7.43], VV = [7.435, 7.440, 7.430, 7.435, 7.435];
  const RLY = () => ({
    x0: PHONE ? 40 : 60, x1: VW - (PHONE ? 40 : 60),
    ov: { y0: Math.round(VH * 0.03), y1: Math.round(VH * 0.2) },
    mg: { y0: Math.round(VH * 0.25), y1: Math.round(VH * 0.55) },
    dp: { y0: Math.round(VH * 0.575), y1: Math.round(VH * 0.985) },
  });
  function stepRuler(dt) {
    const R = S.ruler;
    R.zoom = RM ? R.zoomT : SciSim.approach(R.zoom, R.zoomT, dt, 8);
    R.flash = Math.max(0, R.flash - dt * 1.6);
    ['ruler', 'vernier'].forEach((k) => {
      const arr = R.meas[k];
      const target = arr.length >= 5 ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
      if (arr.length >= 5) R.mean[k] = RM ? target : SciSim.approach(R.mean[k] || 0, 1, dt, 2.2);
      else R.mean[k] = 0;
    });
  }
  function takeMeasure() {
    const R = S.ruler, k = R.tool, arr = R.meas[k], src = k === 'ruler' ? RV : VV;
    if (arr.length >= 5) { toast('5번 모두 쟀어요. 값을 지우고 다시 해 볼 수 있어요.', '', 1600); return; }
    arr.push(src[arr.length]); R.flash = 1; Sound.click();
    if (arr.length === 5) { Sound.success(); updateRulerCtl(); }
    updateRulerCtl();
  }
  function drawRuler(t) {
    const R = S.ruler, L = RLY();
    ctx.fillStyle = '#f2f6fb'; ctx.fillRect(0, 0, VW, VH);
    // ---- 위: 전체 눈금자와 연필
    const ox0 = L.x0, ox1 = L.x1, opx = (ox1 - ox0) / 10, oy = L.ov.y0 + 6;
    D.shadow(() => { const g = ctx.createLinearGradient(0, oy + 44, 0, oy + 80); g.addColorStop(0, '#fff7d6'); g.addColorStop(1, '#f1dd9a'); ctx.fillStyle = g; rr(ox0 - 14, oy + 44, ox1 - ox0 + 28, 36, 6).fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#7c6a2f'; ctx.fillStyle = '#5a4a1a'; ctx.lineWidth = 1.2;
    for (let mm = 0; mm <= 100; mm++) {
      const x = ox0 + mm * opx / 10, big = mm % 10 === 0, mid = mm % 5 === 0;
      ctx.beginPath(); ctx.moveTo(x, oy + 44); ctx.lineTo(x, oy + 44 + (big ? 14 : mid ? 9 : 5)); ctx.stroke();
      if (big) D.text(x, oy + 72, String(mm / 10), { size: 12.5, weight: 800, color: '#5a4a1a' });
    }
    D.text(ox1 + 4, oy + 92, 'cm', { size: 12, weight: 800, color: '#7c6a2f', align: 'right' });
    pencil(ox0 - 14, ox0 + TRUE_CM * opx, oy + 6, 28, true);
    // 확대 창 표시
    const win = R.tool === 'ruler' ? 10 / R.zoom : 3.4, center = R.tool === 'ruler' ? 5 + (TRUE_CM - 5) * smooth(R.zoom, 1, 4) : 8.3;
    const wl = center - win / 2, wr = center + win / 2;
    const wxl = ox0 + wl * opx, wxr = ox0 + wr * opx;
    ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 2.5; ctx.fillStyle = 'rgba(56,103,244,.12)';
    rr(wxl, oy - 2, Math.max(6, wxr - wxl), 84, 6).fill(); rr(wxl, oy - 2, Math.max(6, wxr - wxl), 84, 6).stroke();
    // 연결 선
    ctx.fillStyle = 'rgba(56,103,244,.08)'; ctx.beginPath(); ctx.moveTo(wxl, oy + 82); ctx.lineTo(wxr, oy + 82); ctx.lineTo(L.x1, L.mg.y0); ctx.lineTo(L.x0, L.mg.y0); ctx.closePath(); ctx.fill();
    // ---- 가운데: 확대 눈금
    if (R.tool === 'ruler') drawMagRuler(t, L, wl, win); else drawVernier(t, L);
    // ---- 아래: 측정값 점
    drawDots(t, L);
  }
  function pencil(xa, xtip, y, h, small) {
    const len = xtip - xa, body = Math.max(0, len - h * 0.9);
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fde68a'); g.addColorStop(0.5, '#f59e0b'); g.addColorStop(1, '#b45309');
    D.shadow(() => { ctx.fillStyle = g; ctx.fillRect(xa, y, body, h); }, { blur: 4, y: 2 });
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(xa, y + 3, body, 3);
    ctx.fillStyle = '#f2d2a0'; ctx.beginPath(); ctx.moveTo(xa + body, y); ctx.lineTo(xtip, y + h / 2); ctx.lineTo(xa + body, y + h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#374151'; ctx.beginPath(); ctx.moveTo(xtip - h * 0.34, y + h / 2 - h * 0.17); ctx.lineTo(xtip, y + h / 2); ctx.lineTo(xtip - h * 0.34, y + h / 2 + h * 0.17); ctx.closePath(); ctx.fill();
  }
  function drawMagRuler(t, L, wl, win) {
    const R = S.ruler, px0 = L.x0, px1 = L.x1, W = px1 - px0, y0 = L.mg.y0, y1 = L.mg.y1;
    const center = wl + win / 2, pxcm = W / win, X = (cm) => px0 + (cm - wl) * pxcm;
    const sp = pxcm / 10;                                     // 1 mm 간격(화면 px)
    ctx.save(); ctx.beginPath(); ctx.rect(px0 - 20, y0, W + 40, y1 - y0); ctx.clip();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(px0 - 20, y0, W + 40, y1 - y0);
    const ry = y0 + (y1 - y0) * 0.5;                          // 눈금자 윗변
    const gr = ctx.createLinearGradient(0, ry, 0, y1); gr.addColorStop(0, '#fff7d6'); gr.addColorStop(1, '#f1dd9a');
    ctx.fillStyle = gr; ctx.fillRect(px0 - 20, ry, W + 40, y1 - ry);
    ctx.strokeStyle = '#7c6a2f'; ctx.fillStyle = '#4a3b10';
    const mmLo = Math.floor(wl * 10) - 1, mmHi = Math.ceil((wl + win) * 10) + 1;
    for (let mm = mmLo; mm <= mmHi; mm++) {
      const x = X(mm / 10), big = mm % 10 === 0, mid = mm % 5 === 0;
      if (sp < 3.5 && !big && !mid) continue;
      ctx.lineWidth = big ? 2.2 : 1.4;
      ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry + (big ? 34 : mid ? 24 : 15)); ctx.stroke();
      if (sp >= 34) D.text(x, ry + 58, (mm / 10).toFixed(1), { size: 15, weight: 800, color: '#4a3b10' });
      else if (big) D.text(x, ry + 58, String(mm / 10), { size: 15, weight: 800, color: '#4a3b10' });
    }
    // 어림 눈금(1 mm를 10등분, 점선) - 많이 확대했을 때
    const ap = smooth(R.zoom, 4.5, 6.5);
    if (ap > 0.01 && sp >= 26) {
      const mm0 = Math.floor(TRUE_CM * 10);
      ctx.save(); ctx.globalAlpha = ap * 0.9; ctx.setLineDash([2, 3]); ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 1.2;
      for (let k = 1; k < 10; k++) { const x = X((mm0 + k / 10) / 10); ctx.beginPath(); ctx.moveTo(x, ry - 4); ctx.lineTo(x, ry + (k === 5 ? 20 : 12)); ctx.stroke(); }
      ctx.setLineDash([]); ctx.restore();
      ctx.save(); ctx.globalAlpha = ap;
      const xa = X(mm0 / 10), xb = X((mm0 + 1) / 10);
      ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xa, ry - 34); ctx.lineTo(xa, ry - 26); ctx.lineTo(xb, ry - 26); ctx.lineTo(xb, ry - 34); ctx.stroke();
      D.text((xa + xb) / 2, ry - 40 - (PHONE ? 4 : 0), '눈금 사이를 10등분해 어림해요', { size: 13, weight: 800, color: '#3867f4' });
      ctx.restore();
    }
    // 연필
    const tx = X(TRUE_CM), ph = Math.min(44, (ry - y0) * 0.42);
    pencil(px0 - 40, tx, ry - ph - 2, ph, false);
    // 끝 위치 안내선
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(tx, ry - ph - 2 + ph / 2); ctx.lineTo(tx, ry + 16); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(tx, ry + 2); ctx.lineTo(tx - 7, ry + 16); ctx.lineTo(tx + 7, ry + 16); ctx.closePath(); ctx.fill();
    // 읽은 값 표시선 (측정할 때마다)
    const arr = R.meas.ruler;
    if (arr.length) {
      const v = arr[arr.length - 1], vx2 = X(v), fl = R.flash;
      ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(vx2, ry + 4); ctx.lineTo(vx2, ry + 30); ctx.stroke();
      D.sphere(vx2, ry + 36, 5 + fl * 3, '#3867f4', { gloss: false });
    }
    ctx.restore();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; rr(px0 - 20, y0, W + 40, y1 - y0, 10).stroke();
    D.label(px0 - 8, y0 + 18, '🔍 확대 ' + (Math.round(R.zoom * 10) / 10) + '배', { bg: 'rgba(56,103,244,.92)', size: 13, align: 'left' });
    D.label(px1 + 8, y0 + 18, '최소 눈금 1 mm = 0.1 cm', { bg: 'rgba(30,41,59,.85)', size: 13, align: 'right' });
    // 읽는 법 안내
    const tipTxt = R.zoom < 3 ? '🔍 확대 슬라이더를 올려서 연필 끝을 자세히 봐요' : R.zoom < 5 ? '연필 끝은 7.4와 7.5 사이에 있어요' : '7.4 + (눈금 사이 어림) → 소수 둘째 자리까지 읽어요';
    D.text(VW / 2, y1 - 8, tipTxt, { size: 14, weight: 800, color: '#3867f4' });
  }
  function drawVernier(t, L) {
    const R = S.ruler, px0 = L.x0, px1 = L.x1, W = px1 - px0, y0 = L.mg.y0, y1 = L.mg.y1;
    const mm0 = 66, span = 44, pm = W / span, X = (mm) => px0 + (mm - mm0) * pm;
    const arr = R.meas.vernier, cur = arr.length ? arr[arr.length - 1] : VV[0], mmv = cur * 10;
    const hold = arr.length > 0;
    ctx.save(); ctx.beginPath(); ctx.rect(px0 - 20, y0, W + 40, y1 - y0); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(px0 - 20, y0, W + 40, y1 - y0);
    // 주척
    const my = y0 + 58, h1 = y1 - y0;
    const g1 = ctx.createLinearGradient(0, my, 0, my + 44); g1.addColorStop(0, '#e5e7eb'); g1.addColorStop(1, '#9ca3af');
    ctx.fillStyle = g1; ctx.fillRect(px0 - 20, my, W + 40, 44);
    ctx.strokeStyle = '#1f2937'; ctx.fillStyle = '#111827';
    for (let mm = mm0; mm <= mm0 + span; mm++) {
      const x = X(mm), big = mm % 10 === 0, mid = mm % 5 === 0;
      ctx.lineWidth = big ? 2 : 1.2; ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x, my + (big ? 22 : mid ? 17 : 12)); ctx.stroke();
      if (big) D.text(x, my + 38, String(mm / 10), { size: 13, weight: 800, color: '#111827' });
    }
    // 연필 + 고정 턱/움직이는 턱
    const jx = X(mmv);
    pencil(px0 - 60, jx, my - 50, 30, false);
    ctx.fillStyle = '#64748b'; rr(jx - 2, my - 56, 26, 56 + 52, 4).fill();     // 움직이는 턱(부척 포함)
    // 부척: 20칸, 한 칸 = 1.95 mm
    const vy = my + 44;
    const g2 = ctx.createLinearGradient(0, vy, 0, vy + 50); g2.addColorStop(0, '#f8fafc'); g2.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = g2; ctx.fillRect(jx - 2, vy, 20 * 1.95 * pm + 30, 46);
    ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 1.4;
    const frac = mmv - Math.floor(mmv), nAl = Math.round(frac / 0.05);
    for (let i = 0; i <= 20; i++) {
      const x = jx + i * 1.95 * pm, al = i === nAl;
      ctx.lineWidth = al ? 3 : 1.4; ctx.strokeStyle = al ? '#e2464b' : '#7f1d1d';
      ctx.beginPath(); ctx.moveTo(x, vy); ctx.lineTo(x, vy + (i % 5 === 0 ? 24 : 16)); ctx.stroke();
      if (i % 5 === 0) D.text(x, vy + 40, String(i), { size: 11.5, weight: 800, color: '#7f1d1d' });
    }
    // 일치하는 눈금 강조
    const ax = jx + nAl * 1.95 * pm;
    ctx.strokeStyle = 'rgba(226,70,75,.8)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(ax, my + 2); ctx.lineTo(ax, vy + 24); ctx.setLineDash([]); ctx.stroke();
    D.ring(ax, my + 22, 11, t, { color: '#e2464b', speed: 1, width: 2.5 });
    ctx.restore();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; rr(px0 - 20, y0, W + 40, y1 - y0, 10).stroke();
    D.label(px0 - 8, y0 + 18, '🗜️ 버니어 캘리퍼스 (최소 0.05 mm)', { bg: 'rgba(30,41,59,.88)', size: 13, align: 'left' });
    D.text(VW / 2, y1 - 8, hold ? '주척 ' + Math.floor(mmv) + ' mm + 부척 ' + nAl + '번째 일치 (' + nAl + ' × 0.05 mm) = ' + mmv.toFixed(2) + ' mm' : '📏 측정하기를 눌러 길이를 재어 봐요', { size: 13.5, weight: 800, color: '#b91c1c' });
  }
  function drawDots(t, L) {
    const R = S.ruler, x0 = L.x0 + 30, x1 = L.x1 - 30, y0 = L.dp.y0, y1 = L.dp.y1, H = y1 - y0;
    const lo = 7.405, hi = 7.465, X = (v) => x0 + (v - lo) / (hi - lo) * (x1 - x0);
    ctx.fillStyle = '#fff'; D.shadow(() => rr(L.x0 - 20, y0, L.x1 - L.x0 + 40, H, 14).fill(), { blur: 6, y: 2 });
    D.text(L.x0 - 8, y0 + 22, '측정값의 분포 (cm)', { size: 14, weight: 800, color: '#334155', align: 'left' });
    // 공통 눈금 (위)
    const ay = y0 + 50;
    for (let v = 7.41; v <= 7.4601; v += 0.01) {
      const x = X(v); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, ay + 6); ctx.lineTo(x, y1 - 10); ctx.stroke();
      D.text(x, ay, v.toFixed(2), { size: 12.5, weight: 700, color: '#64748b' });
    }
    const rows = [{ k: 'ruler', name: '눈금자 (1 mm)', col: '#3867f4', y: y0 + H * 0.52 }, { k: 'vernier', name: '버니어 캘리퍼스 (0.05 mm)', col: '#f26b3a', y: y0 + H * 0.88 }];
    rows.forEach((r) => {
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 - 10, r.y + 10); ctx.lineTo(x1 + 10, r.y + 10); ctx.stroke();
      D.text(L.x0 - 8, r.y - 42, '● ' + r.name, { size: 13.5, weight: 800, color: r.col, align: 'left' });
      const arr = R.meas[r.k], cnt = {};
      if (arr.length >= 5) {
        const mn = Math.min.apply(null, arr), mx = Math.max.apply(null, arr), k = clamp(R.mean[r.k] * 1.5, 0, 1);
        ctx.save(); ctx.globalAlpha = 0.14 * k; ctx.fillStyle = r.col; rr(X(mn) - 12, r.y - 40, X(mx) - X(mn) + 24, 54, 10).fill(); ctx.restore();
      }
      arr.forEach((v, i) => {
        const key = v.toFixed(3); cnt[key] = (cnt[key] || 0) + 1;
        const stack = cnt[key] - 1, tx = X(v), ty = r.y - 2 - stack * 14;
        const born = (i === arr.length - 1) ? R.flash : 0;
        D.sphere(tx, ty - born * 26, 7.5, r.col, { shadow: true });
        D.text(tx, ty + 3.5 - born * 26, String(i + 1), { size: 10.5, weight: 800, color: '#fff' });
      });
      if (arr.length >= 5) {
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length, k = R.mean[r.k] || 0;
        const mx = X(lerpv(lo, mean, k)), a = clamp(k * 1.5, 0, 1);
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = r.col; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(mx, r.y - 44); ctx.lineTo(mx, r.y + 10); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = r.col; ctx.beginPath(); ctx.moveTo(mx, r.y + 10); ctx.lineTo(mx - 7, r.y + 22); ctx.lineTo(mx + 7, r.y + 22); ctx.closePath(); ctx.fill();
        D.label(mx + 12, r.y + 18, '평균 ' + mean.toFixed(3) + ' cm', { bg: r.col, size: 13, align: 'left' });
        const w = mxv(arr) - mnv(arr);
        D.text(X(mnv(arr)) - 16, r.y - 20, '폭 ' + w.toFixed(2), { size: 12.5, weight: 800, color: r.col, align: 'right' });
        ctx.restore();
      }
      if (!arr.length) D.text((x0 + x1) / 2, r.y - 6, '측정하면 점이 찍혀요', { size: 13.5, weight: 700, color: '#cbd5e1' });
    });
    if (R.meas.ruler.length >= 5 && R.meas.vernier.length >= 5) {
      D.label(L.x1 - 6, y0 + 22, '흔들림 폭: ' + (mxv(R.meas.ruler) - mnv(R.meas.ruler)).toFixed(2) + ' → ' + (mxv(R.meas.vernier) - mnv(R.meas.vernier)).toFixed(2) + ' cm', { bg: '#14a058', size: 13, align: 'right' });
    }
  }
  const mxv = (a) => Math.max.apply(null, a), mnv = (a) => Math.min.apply(null, a);
  const lerpv = (a, b, k) => a + (b - a) * k;

  /* ======================================================
     화면 4: 어림하기
     ====================================================== */
  const QS = [
    {
      id: 'air', title: '교실 안 공기의 질량은 약 몇 kg일까?', unit: 'kg', op: 'mul', exp: 2, short: '공기의 질량',
      slots: [{ k: 'len', lab: '교실 가로', u: 'm' }, { k: 'len', lab: '교실 세로', u: 'm' }, { k: 'h', lab: '교실 높이', u: 'm' }, { k: 'rho', lab: '공기의 밀도', u: 'kg/m³' }],
      cards: [
        { t: '8', u: 'm', k: 'len', ok: true, v: 8 }, { t: '8', u: 'm', k: 'len', ok: true, v: 8 }, { t: '3', u: 'm', k: 'h', ok: true, v: 3 }, { t: '1.2', u: 'kg/m³', k: 'rho', ok: true, v: 1.2 },
        { t: '80', u: 'm', k: 'len', ok: false, v: 80, why: '교실 한 변이 80 m라면 축구장보다 훨씬 커요.' },
        { t: '30', u: 'm', k: 'h', ok: false, v: 30, why: '교실 높이 30 m는 10층 건물의 높이예요.' },
        { t: '1000', u: 'kg/m³', k: 'rho', ok: false, v: 1000, why: '1000 kg/m³는 물의 밀도예요. 공기는 물보다 훨씬 가벼워요.' },
      ],
      order: [4, 0, 5, 2, 6, 1, 3],
      done: '8 × 8 × 3 = 192 m³ 이고, 192 × 1.2 ≈ 2.3×10² kg 이에요. 약 수백 kg(자릿수 10²)!',
    },
    {
      id: 'heart', title: '평생 심장은 모두 몇 번 뛸까?', unit: '번', op: 'mul', exp: 9, short: '심장 박동',
      slots: [{ k: 'rate', lab: '1분 맥박', u: '회/분' }, { k: 'min', lab: '1시간', u: '분' }, { k: 'hr', lab: '하루', u: '시간' }, { k: 'day', lab: '1년', u: '일' }, { k: 'yr', lab: '수명', u: '년' }],
      cards: [
        { t: '70', u: '회/분', k: 'rate', ok: true, v: 70 }, { t: '60', u: '분/시간', k: 'min', ok: true, v: 60 }, { t: '24', u: '시간/일', k: 'hr', ok: true, v: 24 }, { t: '365', u: '일/년', k: 'day', ok: true, v: 365 }, { t: '80', u: '년', k: 'yr', ok: true, v: 80 },
        { t: '700', u: '회/분', k: 'rate', ok: false, v: 700, why: '1분에 700번이면 1초에 약 12번이에요. 사람 심장은 그렇게 빨리 뛰지 않아요.' },
        { t: '30', u: '일/년', k: 'day', ok: false, v: 30, why: '30일은 한 달이에요. 1년은 약 365일이에요.' },
        { t: '8', u: '년', k: 'yr', ok: false, v: 8, why: '8년은 초등학교 2학년 나이예요. 평생(수명)으로는 너무 짧아요.' },
      ],
      order: [5, 2, 0, 6, 3, 7, 1, 4],
      done: '70 × 60 × 24 × 365 × 80 ≈ 2.9×10⁹ 번이에요. 약 30억 번(자릿수 10⁹)!',
    },
    {
      id: 'track', title: '운동장 둘레에 줄을 서면 몇 명이 둘러쌀까?', unit: '명', op: 'div', exp: 2, short: '운동장 둘레',
      slots: [{ k: 'circ', lab: '운동장 둘레', u: 'm' }, { k: 'sh', lab: '한 사람 어깨너비', u: 'm' }],
      cards: [
        { t: '400', u: 'm', k: 'circ', ok: true, v: 400 }, { t: '0.5', u: 'm', k: 'sh', ok: true, v: 0.5 },
        { t: '4000', u: 'm', k: 'circ', ok: false, v: 4000, why: '둘레 4 km(4000 m)는 걸어서 1시간쯤 걸리는 거리예요. 학교 운동장은 그보다 훨씬 작아요.' },
        { t: '5', u: 'm', k: 'sh', ok: false, v: 5, why: '어깨너비가 5 m인 사람은 없어요. 보통 0.5 m쯤이에요.' },
      ],
      order: [3, 0, 2, 1],
      done: '400 ÷ 0.5 = 800 명이에요. 약 8×10² 명(자릿수 10²)!',
    },
  ];
  const EC = () => PHONE ? { cw: 112, ch: 52, sw: 100, sh: 78 } : { cw: 104, ch: 52, sw: 102, sh: 78 };
  function buildEst() {
    const e = S.est; e.qs = QS.map((q, qi) => {
      const E = EC();
      const cards = q.order.map((ci, n) => {
        const c = q.cards[ci], o = Object.assign({}, c, { kind: 'ecard', q: qi, x: 0, y: 0, tx: 0, ty: 0, hx: 0, hy: 0, w: E.cw, h: E.ch, lift: 0, shake: 0, free: false, slot: null, bad: false, id: qi + '-' + ci });
        return o;
      });
      const sw = q.slots.length >= 5 && !PHONE ? 94 : E.sw;
      const slots = q.slots.map((s, si) => ({ k: s.k, lab: s.lab, u: s.u, i: si, card: null, x: 0, y: 0, w: sw, h: E.sh }));
      return { q, cards, slots, done: false, val: null };
    });
    layoutEst();
  }
  function estLayoutFor(qs) {
    const E = EC(), q = qs.q, n = q.slots.length, pad = PHONE ? 14 : 24;
    const items = [];
    q.slots.forEach((s, i) => { if (i) items.push({ t: 'op', txt: q.op === 'div' ? '/' : '×', w: 24 }); items.push({ t: 'slot', i, w: qs.slots[i].w }); });
    items.push({ t: 'op', txt: '=', w: 24 }); items.push({ t: 'res', w: 136 });
    const rows = [[]]; let cur = 0; const maxW = VW - pad * 2;
    items.forEach((it) => { if (cur + it.w > maxW && rows[rows.length - 1].length) { rows.push([]); cur = 0; } rows[rows.length - 1].push(it); cur += it.w; });
    // 줄 시작이 연산자면 앞줄 끝으로
    for (let r = 1; r < rows.length; r++) { while (rows[r].length && rows[r][0].t === 'op') rows[r - 1].push(rows[r].shift()); }
    const fy = PHONE ? 250 : 212;
    rows.forEach((row, ri) => {
      const tw = row.reduce((a, b) => a + b.w, 0); let x = (VW - tw) / 2;
      row.forEach((it) => { it.x = x + it.w / 2; it.y = fy + ri * (E.sh + 22) + E.sh / 2; x += it.w; });
    });
    return { items, rows, fy, bottom: fy + rows.length * (E.sh + 22) };
  }
  function layoutEst() {
    const E = EC();
    S.est.qs.forEach((qs, qi) => {
      const lay = estLayoutFor(qs); qs.lay = lay;
      lay.items.forEach((it) => { if (it.t === 'slot') { const s = qs.slots[it.i]; s.x = it.x; s.y = it.y; } else if (it.t === 'res') { qs.res = { x: it.x, y: it.y, w: it.w, h: E.sh }; } });
      qs.gy = lay.bottom + 22; qs.trayY = qs.gy + 40;
      const ty = qs.trayY + 46, per = Math.max(1, Math.floor((VW - 24) / (E.cw + 8)));
      qs.cards.forEach((c, n) => {
        const row = Math.floor(n / per), col = n % per, inRow = Math.min(per, qs.cards.length - row * per);
        const totalW = inRow * (E.cw + 8) - 8, x = (VW - totalW) / 2 + col * (E.cw + 8) + E.cw / 2, y = ty + row * (E.ch + 10);
        c.hx = x; c.hy = y;
        if (!c.slot && !c.free) { c.tx = x; c.ty = y; if (!c._init) { c.x = x; c.y = y; c._init = true; } }
        c.w = c.slot ? E.sw - 10 : E.cw; c.h = c.slot ? 46 : E.ch;
        if (c.slot) { c.tx = c.slot.x; c.ty = c.slot.y + 10; if (!c._init) { c.x = c.tx; c.y = c.ty; c._init = true; } }
      });
    });
  }
  const curQ = () => S.est.qs[S.est.q];
  function estVal(qs) {
    if (qs.slots.some((s) => !s.card)) return null;
    const v = qs.slots.map((s) => s.card.v);
    return qs.q.op === 'div' ? v[0] / v[1] : v.reduce((a, b) => a * b, 1);
  }
  function slotAtEst(c) {
    const qs = curQ();
    return qs.slots.find((s) => Math.abs(c.x - s.x) <= s.w / 2 + 6 && Math.abs(c.y - s.y) <= s.h / 2 + 8);
  }
  function estDrop(c) {
    S.drag = null;
    const qs = curQ(), E = EC(), s = slotAtEst(c);
    const leave = () => { if (c.slot) { c.slot.card = null; c.slot = null; } };
    if (s) {
      if (s.k !== c.k) { // 종류가 다른 칸
        c.shake = 0.5; Sound.fail(); leave(); c.w = E.cw; c.h = E.ch; flyTo(c, c.hx, c.hy);
        toast('이 칸에는 "' + s.lab + '"에 해당하는 카드를 놓아요.', 'bad', 1700);
        return;
      }
      const other = s.card && s.card !== c ? s.card : null;
      leave();
      if (other) { other.slot = null; other.bad = false; other.w = E.cw; other.h = E.ch; flyTo(other, other.hx, other.hy); }
      s.card = c; c.slot = s; c.bad = false; c.w = s.w - 10; c.h = 46; Sound.tick(); flyTo(c, s.x, s.y + 10);
      parts.burst(s.x, s.y, { count: 5, speed: 60, size: 2.5, life: 0.4, gravity: 0, colors: ['#93c5fd', '#fff'] });
    } else { leave(); c.w = E.cw; c.h = E.ch; c.bad = false; flyTo(c, c.hx, c.hy); }
    qs.val = estVal(qs); qs.done = false;
  }
  function resetEst(qi) {
    const qs = S.est.qs[qi]; if (!qs) return;
    qs.slots.forEach((s) => { s.card = null; });
    qs.cards.forEach((c) => { c.slot = null; c.bad = false; c.w = EC().cw; c.h = EC().ch; flyTo(c, c.hx, c.hy); });
    qs.val = null; qs.done = false;
  }
  function checkEst(qi) {
    const qs = S.est.qs[qi], E = qs.slots;
    const empty = E.filter((s) => !s.card);
    if (empty.length) return '아직 빈칸이 <b>' + empty.length + '칸</b> 남았어요.';
    const bad = E.filter((s) => !s.card.ok);
    bad.forEach((s) => { if (!s.card.bad) { s.card.bad = true; s.card.shake = 0.5; } });
    if (bad.length) return bad.map((s) => '<b>' + s.card.t + ' ' + s.card.u + '</b>: ' + s.card.why).join('<br>');
    E.forEach((s) => { s.card.bad = false; });
    if (!qs.done) { qs.done = true; Sound.tick(); S.est.link = 0; SciSim.tween(S.est, { link: 1 }, { duration: 1.2, ease: 'outCubic' }); E.forEach((s) => parts.burst(s.x, s.y, { count: 6, speed: 90, size: 3, life: 0.6 })); parts.burst(qs.res.x, qs.res.y, { count: 14, speed: 140, size: 3.5, life: 0.8 }); }
    return true;
  }
  function estIllus(qi, x, y, w, h, t) {
    ctx.save(); ctx.translate(x, y);
    if (qi === 0) {
      const bx = w * 0.14, by = h * 0.3, bw = w * 0.56, bh = h * 0.56, dx = w * 0.24, dy = -h * 0.2;
      ctx.fillStyle = 'rgba(147,197,253,.28)'; ctx.strokeStyle = '#3867f4'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + dx, by + dy); ctx.lineTo(bx + bw + dx, by + dy); ctx.lineTo(bx + bw, by); ctx.closePath(); ctx.fillStyle = 'rgba(147,197,253,.4)'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + bw, by); ctx.lineTo(bx + bw + dx, by + dy); ctx.lineTo(bx + bw + dx, by + dy + bh); ctx.lineTo(bx + bw, by + bh); ctx.closePath(); ctx.fillStyle = 'rgba(147,197,253,.2)'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(56,103,244,.6)';
      for (let i = 0; i < 22; i++) { const px = bx + 6 + (((i * 37) % (bw - 12)) + t * 8 * (0.5 + (i % 5) / 5)) % (bw - 12), py = by + 8 + ((i * 53) % (bh - 20)) + Math.sin(t * 2 + i) * 4; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 6.3); ctx.fill(); }
      D.text(bx + bw / 2, by + bh + 16, '가로 × 세로 × 높이', { size: 12.5, weight: 800, color: '#3867f4' });
    } else if (qi === 1) {
      const cx = w * 0.5, cy = h * 0.5, k = 1 + 0.1 * Math.max(0, Math.sin(t * 7.3)) ** 2;
      D.ring(cx, cy, 40, t, { color: '#e2464b', speed: 1.1, width: 2 });
      ctx.save(); ctx.translate(cx, cy); ctx.scale(k * 1.05, k * 1.05);
      D.shadow(() => { ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(0, 26); ctx.bezierCurveTo(-52, -6, -26, -40, 0, -14); ctx.bezierCurveTo(26, -40, 52, -6, 0, 26); ctx.fill(); }, { blur: 8, y: 3 });
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(-14, -14, 9, 5, -0.6, 0, 6.3); ctx.fill();
      ctx.restore();
      D.text(cx, h - 2, '두근 두근…', { size: 12.5, weight: 800, color: '#e2464b' });
    } else {
      const cx = w * 0.5, cy = h * 0.46, rx = w * 0.44, ry = h * 0.34;
      ctx.strokeStyle = '#c2410c'; ctx.lineWidth = 12; ctx.fillStyle = '#86c97b'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fed7aa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.3); ctx.stroke();
      const n = 34, rot = t * 0.15;
      for (let i = 0; i < n; i++) { const a = rot + i / n * 6.283; D.sphere(cx + Math.cos(a) * (rx + 12), cy + Math.sin(a) * (ry + 12), 4.2, ['#3867f4', '#ec6b8e', '#14a058', '#f59e0b'][i % 4], { gloss: false }); }
      D.text(cx, cy + 5, '400 m', { size: 13, weight: 800, color: '#fff' });
    }
    ctx.restore();
  }
  function drawEst(t) {
    const e = S.est, qs = curQ(), q = qs.q, E = EC();
    ctx.fillStyle = '#f4f7fb'; ctx.fillRect(0, 0, VW, VH);
    // 상단: 그림 + 질문
    const iw = PHONE ? 150 : 170, ih = PHONE ? 118 : 120;
    estIllus(S.est.q, PHONE ? 14 : 24, 18, iw, ih, t);
    const tx = (PHONE ? 14 : 24) + iw + 14;
    D.text(tx, 36, '❓ 어림해 봐요', { size: 14, weight: 800, color: '#64748b', align: 'left' });
    const hh = paraText(tx, 62, q.title, VW - tx - 16, PHONE ? 19 : 21, { weight: 800 });
    paraText(tx, 62 + hh + 6, '빈칸에 알맞은 "가정 카드"를 놓으면 값이 계산돼요.', VW - tx - 16, 14, { color: '#5d6879' });
    // 식
    qs.lay.items.forEach((it) => {
      if (it.t === 'op') D.text(it.x, it.y + 8, it.txt, { size: 24, weight: 800, color: '#64748b' });
    });
    const dr = S.drag && S.drag.c.kind === 'ecard' ? S.drag.c : null;
    qs.slots.forEach((s) => {
      const hit = dr && slotAtEst(dr) === s, fit = hit && dr.k === s.k;
      ctx.save(); ctx.setLineDash(s.card ? [] : [6, 5]);
      ctx.fillStyle = hit ? (fit ? '#e0e9ff' : '#fee2e2') : '#fff'; ctx.strokeStyle = hit ? (fit ? '#3867f4' : '#e2464b') : qs.done ? '#14a058' : '#94a3b8'; ctx.lineWidth = hit ? 3 : 2;
      rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).fill(); rr(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 12).stroke(); ctx.setLineDash([]); ctx.restore();
      D.text(s.x, s.y - s.h / 2 + 16, s.lab, { size: 12.5, weight: 800, color: '#475569' });
      if (!s.card) D.text(s.x, s.y + 14, s.u, { size: 13, weight: 800, color: '#94a3b8' });
    });
    // 결과 상자
    const R0 = qs.res, v = qs.val;
    ctx.fillStyle = qs.done ? '#ecfdf3' : '#fff'; ctx.strokeStyle = qs.done ? '#14a058' : v != null ? '#3867f4' : '#94a3b8'; ctx.lineWidth = 2.5;
    D.shadow(() => rr(R0.x - R0.w / 2, R0.y - R0.h / 2, R0.w, R0.h, 14).fill(), { blur: 6, y: 2 }); rr(R0.x - R0.w / 2, R0.y - R0.h / 2, R0.w, R0.h, 14).stroke();
    D.text(R0.x, R0.y - R0.h / 2 + 16, '계산 결과', { size: 12.5, weight: 800, color: '#475569' });
    D.text(R0.x, R0.y + 16, v != null ? sci(v, 1) + ' ' + q.unit : '?', { size: v != null && sci(v, 1).length > 8 ? 17 : 21, weight: 800, color: v != null ? '#1b2333' : '#cbd5e1' });
    // 연결선: 가정 카드 → 계산 결과 (칸 위쪽으로 휘어 흐르는 점선)
    if (qs.done) {
      qs.slots.forEach((s, i) => {
        const a = clamp(e.link * 1.3 - i * 0.1, 0, 1);
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#14a058'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 22;
        const sx = s.x, sy = s.y - s.h / 2, ex = R0.x, ey = R0.y - R0.h / 2, up = 26 + i * 4;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx, Math.min(sy, ey) - up, ex, Math.min(sy, ey) - up, ex, ey); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      });
    }
    // 자릿수 눈금
    const gy = qs.gy, gx0 = 40, gx1 = VW - 40, G = (lv) => gx0 + (lv + 0.2) / 10.6 * (gx1 - gx0);
    const lg = v != null ? Math.log10(Math.max(1e-6, v)) : null;
    if (lg != null) e.gauge = RM ? lg : SciSim.approach(e.gauge, lg, 0.016, 7);
    ctx.fillStyle = 'rgba(100,116,139,.14)'; rr(gx0 - 8, gy - 8, gx1 - gx0 + 16, 16, 8).fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
    for (let k = 0; k <= 10; k++) { ctx.beginPath(); ctx.moveTo(G(k), gy - 6); ctx.lineTo(G(k), gy + 6); ctx.stroke(); if (k % 2 === 0) D.text(G(k), gy + 24, '10' + sup(k), { size: 12.5, weight: 800, color: '#64748b' }); }
    D.text(gx0 - 8, gy - 16, '자릿수 눈금 (10의 거듭제곱)', { size: 12.5, weight: 800, color: '#64748b', align: 'left' });
    if (qs.done) { ctx.fillStyle = 'rgba(20,160,88,.28)'; rr(G(q.exp), gy - 8, G(q.exp + 1) - G(q.exp), 16, 8).fill(); }
    if (lg != null) {
      const gxp = G(clamp(e.gauge, -0.1, 10.1));
      ctx.fillStyle = qs.done ? '#14a058' : '#f26b3a'; ctx.beginPath(); ctx.moveTo(gxp, gy - 10); ctx.lineTo(gxp - 8, gy - 24); ctx.lineTo(gxp + 8, gy - 24); ctx.closePath(); ctx.fill();
    }
    if (qs.done) D.label(gx1 + 8, gy - 18, '답: 약 ' + sci(v, 1) + ' ' + q.unit + ' → 자릿수 10' + sup(q.exp), { bg: '#14a058', size: 13.5, align: 'right' });
    // 트레이
    ctx.fillStyle = 'rgba(100,116,139,.08)'; rr(8, qs.trayY, VW - 16, VH - qs.trayY - 6, 14).fill();
    D.text(20, qs.trayY + 18, '🃏 가정 카드', { size: 13, weight: 800, color: '#64748b', align: 'left' });
    qs.cards.forEach((c) => {
      const end = cardBox(c, { stroke: c.bad ? '#e2464b' : qs.done && c.slot ? '#14a058' : c.slot ? '#3867f4' : '#cbd5e1', fill: c.slot ? '#f5f8ff' : '#fff', sw: c.slot ? 2.5 : 2 });
      D.text(0, c.slot ? 2 : 3, c.t, { size: c.slot ? 20 : 22, weight: 800, color: '#1b2333' });
      D.text(0, c.slot ? 17 : 19, c.u, { size: 12, weight: 800, color: '#5d6879' });
      end();
    });
  }

  /* ======================================================
     화면 5: 표준 사례
     ====================================================== */
  const CASES = [
    { ico: '⛽', t: '주유기의 1 L', std: '법으로 정한 기준 용기로 주유기의 1 L를 정기적으로 검정해요.',
      ev: ['받는 기름 양이 서로 달라져요', '기름값이 해마다 올라요', '기름을 빨리 넣게 돼요'], ev0: 0 },
    { ico: '🚕', t: '택시 요금 미터', std: '미터가 재는 거리와 시간을 정해진 기준과 맞춰 검정해요.',
      ev: ['택시 색깔이 달라져요', '같은 거리인데 요금이 달라져요', '승객이 더 늘어나요'], ev0: 1 },
    { ico: '🌡️', t: '체온계', std: '기준 온도계와 비교해 눈금을 맞춰(교정) 만들어요.',
      ev: ['같은 체온이 다르게 읽혀요', '체온계가 더 커져요', '체온을 아침에만 재요'], ev0: 0 },
    { ico: '🔌', t: '충전 단자 규격', std: 'USB-C처럼 모양과 전압을 국제 규격으로 정해요.',
      ev: ['충전기 색이 달라져요', '충전기를 서로 쓸 수 없어요', '충전기가 더 길어져요'], ev0: 1 },
    { ico: '🚆', t: '표준시와 열차 시각', std: '기준이 되는 표준시(한국은 UTC+9)를 정해 모두 같은 시각표를 써요.',
      ev: ['열차가 더 빨라져요', '열차가 낮에만 다녀요', '시각표가 맞지 않아 헷갈려요'], ev0: 2 },
    { ico: '⚖️', t: '길이·질량 단위의 정의', std: '뼘·큐빗 → 미터원기(1889) → 빛의 속력(1983). 질량은 킬로그램원기 → 플랑크 상수(2019)',
      ev: ['물건이 가벼워져요', '기준 물체의 질량이 변할 수 있어요', '기준 물체가 너무 커져요'], ev0: 1 },
  ];
  const REASONS = ['같은 기준이어야 비교·거래할 수 있어요', '표준을 쓰면 오차가 완전히 없어져요', '측정값은 사람마다 달라도 괜찮아요'];
  const CCARD = () => PHONE ? { w: 178, h: 172 } : { w: 232, h: 150 };
  function initCases() {
    const C = CCARD(), cols = PHONE ? 2 : 3, rows = PHONE ? 3 : 2;
    const gx = (VW - cols * C.w) / (cols + 1), top = PHONE ? 70 : 78, gy = PHONE ? 22 : 36;
    S.cs.cards = CASES.map((c, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      return { i, c, x: gx + C.w / 2 + col * (C.w + gx), y: top + C.h / 2 + row * (C.h + gy), w: C.w, h: C.h, flip: 0, sel: false, bad: false, shake: 0, ok: false, lift: 0 };
    });
    S.cs.sel = []; S.cs.pick = null; S.cs.done = 0; renderArg();
  }
  function toggleCase(c) {
    const cs = S.cs;
    if (c.sel) { c.sel = false; cs.sel = cs.sel.filter((x) => x !== c); SciSim.tween(c, { flip: 0 }, { duration: 0.35, ease: 'inOutCubic' }); }
    else {
      if (cs.sel.length >= 2) { const o = cs.sel.shift(); o.sel = false; SciSim.tween(o, { flip: 0 }, { duration: 0.35, ease: 'inOutCubic' }); }
      c.sel = true; cs.sel.push(c); SciSim.tween(c, { flip: 1 }, { duration: 0.4, ease: 'inOutCubic' });
    }
    Sound.click(); renderArg(); cs.done = 0; cs.cards.forEach((x) => { x.ok = false; x.bad = false; });
  }
  const PERM = [[0, 1, 2], [1, 2, 0], [2, 0, 1], [1, 0, 2], [2, 1, 0], [0, 2, 1]];
  const argState = [{ e: '', r: '' }, { e: '', r: '' }];
  function renderArg() {
    const box = $('#argBox'), note = $('#argNote'), cs = S.cs;
    box.innerHTML = '';
    note.innerHTML = cs.sel.length < 2 ? '카드를 눌러 <b>2장</b>을 고르면 근거와 이유를 고를 수 있어요. (지금 ' + cs.sel.length + '장)' : '선택한 사례마다 <b>근거</b>와 <b>이유</b>를 골라 주장을 완성해요.';
    cs.sel.forEach((c, k) => {
      const cc = c.c, div = document.createElement('div'); div.className = 'arg';
      const perm = PERM[c.i];
      const optE = ['<option value="">— 고르세요 —</option>'].concat(perm.map((j) => '<option value="' + j + '"' + (String(argState[k].e) === String(j) && argState[k].c === c.i ? ' selected' : '') + '>' + cc.ev[j] + '</option>')).join('');
      const optR = ['<option value="">— 고르세요 —</option>'].concat(PERM[(c.i + 2) % 6].map((j) => '<option value="' + j + '"' + (String(argState[k].r) === String(j) && argState[k].c === c.i ? ' selected' : '') + '>' + REASONS[j] + '</option>')).join('');
      div.innerHTML = '<h4>' + (k + 1) + '. ' + cc.ico + ' ' + cc.t + '</h4><label>📌 근거 (표준이 없다면 어떤 일이?)</label><select class="sel-in" data-k="' + k + '" data-w="e" aria-label="근거 고르기">' + optE + '</select><label>💡 이유 (표준이 필요한 까닭)</label><select class="sel-in" data-k="' + k + '" data-w="r" aria-label="이유 고르기">' + optR + '</select>';
      box.appendChild(div);
    });
    $$('#argBox select').forEach((s) => s.addEventListener('change', () => {
      const k = +s.dataset.k, c = cs.sel[k]; argState[k][s.dataset.w] = s.value; argState[k].c = c ? c.i : -1; Sound.tick();
    }));
  }
  function getArg(k) { const c = S.cs.sel[k]; if (!c) return null; const sels = $$('#argBox select').filter((s) => +s.dataset.k === k); return { c, e: sels[0] ? sels[0].value : '', r: sels[1] ? sels[1].value : '' }; }
  function checkArg() {
    const cs = S.cs;
    if (cs.sel.length < 2) return '사례 카드를 <b>2장</b> 골라 주세요. (지금 ' + cs.sel.length + '장)';
    const msgs = []; let ok = true;
    cs.sel.forEach((c, k) => {
      const a = getArg(k);
      if (a.e === '' || a.r === '') { msgs.push('<b>' + c.c.t + '</b>: 근거와 이유를 모두 골라 주세요.'); ok = false; return; }
      const eok = +a.e === c.c.ev0, rok = +a.r === 0;
      if (!eok) { msgs.push('<b>' + c.c.t + '</b>: 근거는 "표준이 없다면 실제로 어떤 불편이 생기는지"를 말해야 해요.'); ok = false; }
      else if (!rok) { msgs.push('<b>' + c.c.t + '</b>: 이유가 어긋났어요. 표준을 쓴다고 오차가 아예 없어지거나, 측정값이 달라도 되는 것은 아니에요.'); ok = false; }
      c.bad = !(eok && rok); if (c.bad) c.shake = 0.5;
    });
    if (!ok) return msgs.join('<br>');
    cs.sel.forEach((c) => { c.ok = true; c.bad = false; parts.burst(c.x, c.y, { count: 14, speed: 150, size: 3.5, life: 0.8 }); });
    if (!cs.done) SciSim.tween(cs, { done: 1 }, { duration: 0.8 });
    return true;
  }
  function drawCases(t) {
    const cs = S.cs, C = CCARD();
    ctx.fillStyle = '#f3f6fb'; ctx.fillRect(0, 0, VW, VH);
    D.text(VW / 2, 30, '⚖️ 생활 속 측정 표준 사례 6가지', { size: 18, weight: 800, color: '#1b2333' });
    D.text(VW / 2, 54, '카드를 눌러 뒤집고, 2장을 골라 보세요', { size: 14, weight: 700, color: '#64748b' });
    cs.cards.forEach((c) => {
      const f = c.flip, sx = Math.abs(Math.cos(f * Math.PI)), back = f > 0.5;
      const sh = c.shake > 0 ? Math.sin(c.shake * 40) * 5 : 0;
      ctx.save(); ctx.translate(c.x + sh, c.y); ctx.scale(Math.max(0.02, sx) * (1 + (c.sel ? 0.03 : 0)), 1 + (c.sel ? 0.03 : 0));
      const stroke = c.ok ? '#14a058' : c.bad ? '#e2464b' : c.sel ? '#3867f4' : '#cbd5e1';
      D.shadow(() => { ctx.fillStyle = back ? '#f2f7ff' : '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 16).fill(); }, { blur: c.sel ? 14 : 7, y: c.sel ? 6 : 3 });
      ctx.strokeStyle = stroke; ctx.lineWidth = c.sel ? 3.5 : 2; rr(-c.w / 2, -c.h / 2, c.w, c.h, 16).stroke();
      if (!back) {
        D.text(0, -10, c.c.ico, { size: PHONE ? 38 : 44 });
        D.text(0, PHONE ? 34 : 42, c.c.t, { size: PHONE ? 14.5 : 17, weight: 800, color: '#1b2333' });
        D.text(0, c.h / 2 - 12, '눌러서 뒤집기', { size: 12, weight: 700, color: '#94a3b8' });
      } else {
        { D.text(0, -c.h / 2 + 24, c.c.ico + ' ' + c.c.t, { size: PHONE ? 10.5 : 13.5, weight: 800, color: '#3867f4' });
        paraText(-c.w / 2 + 12, -c.h / 2 + 46, '표준: ' + c.c.std, c.w - 24, PHONE ? 11.5 : 13.5, { weight: 700, color: '#1b2333' }); }
      }
      ctx.restore();
      if (c.sel) { const n = cs.sel.indexOf(c) + 1; D.sphere(c.x + c.w / 2 - 10, c.y - c.h / 2 + 10, 14, c.ok ? '#14a058' : '#3867f4', { text: c.ok ? '✓' : String(n) }); }
    });
    if (cs.done > 0.01) {
      ctx.save(); ctx.globalAlpha = cs.done;
      D.label(VW / 2, VH - (PHONE ? 130 : 84), '주장 – 근거 – 이유가 연결됐어요!', { bg: '#14a058', size: 15 });
      ctx.restore();
    }
  }

  /* ---------- 입력 ---------- */
  let hintTimer = null;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000);
  }
  let tapStart = null;
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'est') {
        const c = pickItem(p, curQ().cards); if (!c) return false;
        if (c.slot) { c.slot.card = null; c.slot = null; curQ().val = estVal(curQ()); curQ().done = false; c.w = EC().cw; c.h = EC().ch; }
        dragStart(c, p, curQ().cards); return true;
      }
      if (S.mode === 'cases') {
        const c = S.cs.cards.find((x) => Math.abs(p.x - x.x) <= x.w / 2 && Math.abs(p.y - x.y) <= x.h / 2);
        if (c) { tapStart = { c, x: p.x, y: p.y }; return true; }
      }
      return false;
    },
    move(p) { const d = S.drag; if (d && S.mode === 'est') { d.c.x = p.x - d.ox; d.c.y = p.y - d.oy; } },
    up(p) {
      if (S.mode === 'est') { const d = S.drag; if (!d) return; d.c.x = p.x - d.ox; d.c.y = p.y - d.oy; estDrop(d.c); return; }
      if (S.mode === 'cases' && tapStart) { const ts = tapStart; tapStart = null; if (Math.hypot(p.x - ts.x, p.y - ts.y) < 14) toggleCase(ts.c); }
    },
    hover(p) {
      if (S.mode === 'est') return pickItem(p, curQ().cards) ? 'grab' : 'default';
      if (S.mode === 'cases') return S.cs.cards.some((x) => Math.abs(p.x - x.x) <= x.w / 2 && Math.abs(p.y - x.y) <= x.h / 2) ? 'pointer' : 'default';
      return 'default';
    },
  });

  /* ---------- 컨트롤 ---------- */
  const MODE_LABEL = { span: '📐 제각각 측정 · 뼘으로 책상 재기', market: '🛒 제각각 측정 · 시장의 "한 줌"', ruler: '🔎 측정과 어림 · 눈금 읽기', est: '🧮 어림하기 · 가정 카드', cases: '⚖️ 표준 사례 · 주장·근거·이유' };
  const modeSeg = $('#modeSeg');
  function setMode(m) {
    if (S.mode !== m) S.fade = 1;
    S.mode = m; S.drag = null; updateCtl();
    const hh = $('#stageHint'); if (hh) hh.classList.add('hide');
  }
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.mode); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    modeSeg.hidden = !(game && game.free);
    updateWho(); updateVend(); updateRulerCtl(); updateQBtns(); applyRsub();
  }
  let rsub = ['zoom', 'read'];
  function applyRsub() {
    if (S.mode !== 'ruler') return;
    const free = game && game.free;
    $$('#ctrlCard [data-modes="ruler"]').forEach((c) => {
      const sub = c.dataset.sub;
      let show = free ? ['tool', 'zoom', 'meas'].indexOf(sub) >= 0 : rsub.indexOf(sub) >= 0;
      if (sub === 'zoom' && S.ruler.tool !== 'ruler') show = false;
      c.hidden = !show;
    });
  }
  function updateWho() { $$('#whoBtns button').forEach((b) => { const i = +b.dataset.who; b.classList.toggle('who-on', S.span.who === i); b.classList.toggle('who-done', S.span.res[i] != null); }); }
  function updateVend() { $$('#vendBtns button').forEach((b) => { const i = +b.dataset.v; b.classList.toggle('who-on', S.mk.act === i && S.mk.ph < 1); b.classList.toggle('who-done', S.mk.res[i] != null); }); }
  function updateQBtns() { $$('#qBtns button').forEach((b) => { const i = +b.dataset.q; b.classList.toggle('who-on', S.est.q === i); b.classList.toggle('who-done', !!(S.est.qs[i] && S.est.qs[i].done)); }); }
  function updateRulerCtl() {
    const R = S.ruler, n = R.meas[R.tool].length;
    $$('#toolSeg button').forEach((b) => b.classList.toggle('on', b.dataset.tool === R.tool));
    const bm = $('#bMeasure'); bm.textContent = n >= 5 ? '✅ 5번 측정 완료' : '📏 측정하기 (' + n + ' / 5)'; bm.disabled = n >= 5;
    applyRsub();
  }
  $$('#whoBtns button').forEach((b) => b.addEventListener('click', () => spanStart(+b.dataset.who)));
  $$('#vendBtns button').forEach((b) => b.addEventListener('click', () => mkStart(+b.dataset.v)));
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $$('#qBtns button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.est.q = +b.dataset.q; S.est.link = 0; updateQBtns(); }));
  $('#bEstReset').addEventListener('click', () => { Sound.click(); resetEst(S.est.q); });
  $$('#toolSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ruler.tool = b.dataset.tool; updateRulerCtl(); }));
  const sZoom = $('#sZoom'), oZoom = $('#oZoom');
  SciSim.bindRange(sZoom, oZoom, (v) => (Math.round(v * 10) / 10) + '배', (v) => { S.ruler.zoomT = v; });
  $('#bMeasure').addEventListener('click', takeMeasure);
  $('#bMeasReset').addEventListener('click', () => { Sound.click(); S.ruler.meas = { ruler: [], vernier: [] }; S.ruler.mean = { ruler: 0, vernier: 0 }; updateRulerCtl(); });

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'span') {
      const sp = S.span, P = sp.who >= 0 ? PEOPLE[sp.who] : null;
      L1 = '재는 사람'; a = P ? P.n : '—'; L2 = '단위로 쓴 뼘'; b = P ? P.cm + ' cm' : '—'; L3 = '책상 길이'; c = P && sp.res[sp.who] != null ? sp.res[sp.who].toFixed(1) + '뼘' : P && sp.running ? '재는 중…' : '—';
    } else if (S.mode === 'market') {
      const m = S.mk, i = m.act;
      L1 = '주문한 상인'; a = i >= 0 ? VEND[i].n : '—'; L2 = '"한 줌"의 질량'; b = i >= 0 && m.res[i] != null ? VEND[i].g + ' g' : '—'; L3 = '확인한 상인'; c = m.res.filter((x) => x != null).length + ' / 3';
    } else if (S.mode === 'ruler') {
      const R = S.ruler, arr = R.meas[R.tool];
      L1 = '최소 눈금'; a = R.tool === 'ruler' ? '1 mm' : '0.05 mm'; L2 = '마지막 읽은 값'; b = arr.length ? arr[arr.length - 1].toFixed(R.tool === 'ruler' ? 2 : 3) + ' cm' : '—'; L3 = '측정 횟수'; c = arr.length + ' / 5';
    } else if (S.mode === 'est') {
      const qs = curQ();
      L1 = '채운 칸'; a = qs.slots.filter((s) => s.card).length + ' / ' + qs.slots.length; L2 = '계산 결과'; b = qs.val != null ? sci(qs.val, 1) + ' ' + qs.q.unit : '—'; L3 = '자릿수'; c = qs.val != null ? '10' + sup(Math.floor(Math.log10(qs.val))) : '—';
    } else {
      const cs = S.cs;
      L1 = '고른 사례'; a = cs.sel.length + ' / 2'; L2 = '선택한 카드'; b = cs.sel.length ? cs.sel.map((x) => x.c.t).join(', ') : '—'; L3 = '주장'; c = '표준은 꼭 필요하다';
    }
    const key = L1 + a + L2 + b + L3 + c;
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ---------- 단계 · 미션 ---------- */
  function enterLevel(li) {
    if (li === 0) { setMode('span'); S.span.who = -1; S.span.p = 0; S.span.running = false; S.span.res = [null, null, null]; S.span.reveal = 0; S.mk.act = -1; S.mk.ph = 0; S.mk.res = [null, null, null]; S.mk.reveal = 0; }
    else if (li === 1) { setMode('ruler'); S.ruler.meas = { ruler: [], vernier: [] }; S.ruler.tool = 'ruler'; S.ruler.mean = { ruler: 0, vernier: 0 }; sZoom.value = 1; S.ruler.zoomT = 1; S.ruler.zoom = 1; $('#inRead').value = ''; $('#inAvg').value = ''; updateCtl(); }
    else if (li === 2) { S.est.q = 0; S.est.qs.forEach((q, i) => resetEst(i)); setMode('est'); }
    else { initCases(); setMode('cases'); }
  }
  function ensure(m) { if (S.mode !== m) setMode(m); }
  function setSub(show) { rsub = show; applyRsub(); }

  const levels = [
    {
      title: '제각각 측정: 값이 왜 다를까?', short: '제각각 측정', icon: '📐', phase: '관찰',
      features: ['span', 'market'],
      intro: '<p class="si-q">❓ 탐구 질문: 같은 책상을 재어도 사람마다 값이 다르다면, 어떤 약속이 필요할까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 중1 \'과학적 탐구 방법\'(관찰·측정)을 배웠어요. 측정은 대상을 <b>기준(단위)</b>과 비교해 수치로 나타내는 일이에요. 기준이 사람마다 다르면 어떻게 될까요?</div>' +
        '<p>세 친구가 <b>자신의 뼘</b>으로 책상을 재고, 시장에서는 "<b>한 줌</b>"을 주문해 볼 거예요.</p>',
      setup() { enterLevel(0); showHint('👧 친구를 눌러 책상을 재어 보세요', 6000); },
      recap: '기준(단위)이 사람마다 다르면 같은 대상도 다른 값으로 재어져요. 같은 기준이 필요해요.',
      summary: '<ul><li><b>측정</b>: 대상을 기준(단위)과 비교해 수치로 나타내는 것이에요.</li><li>책상(200 cm)을 뼘(18·20·22 cm)으로 재면 <b>11.1뼘 · 10뼘 · 9.1뼘</b>으로 서로 달라요.</li><li>시장의 "한 줌"도 사람마다 60 g · 80 g · 100 g으로 달라요. → 모두가 같은 <b>기준</b>(예: cm, g)이 필요해요.</li></ul>',
      missions: [
        {
          title: '세 친구의 뼘으로 책상 재기',
          goal: '<b>민지 · 준호 · 도윤</b>이 차례로 책상 길이를 재어 보세요.',
          hint: '오른쪽 버튼에서 친구를 눌러요. 뼘 도장이 하나씩 찍히며 개수를 세요.',
          setup() { ensure('span'); },
          check: () => S.span.res.every((v) => v != null), hold: 0.4,
          status: () => mark(S.span.res[0] != null) + ' 민지 ' + (S.span.res[0] != null ? S.span.res[0].toFixed(1) + '뼘' : '') + ' · ' + mark(S.span.res[1] != null) + ' 준호 ' + (S.span.res[1] != null ? S.span.res[1].toFixed(1) + '뼘' : '') + ' · ' + mark(S.span.res[2] != null) + ' 도윤 ' + (S.span.res[2] != null ? S.span.res[2].toFixed(1) + '뼘' : ''),
          explain: '책상 길이는 모두 약 200 cm인데, 뼘의 길이가 18 cm · 20 cm · 22 cm로 달라서 <b>11.1뼘 · 10.0뼘 · 9.1뼘</b>으로 다르게 나왔어요. (200 ÷ 18 ≈ 11.1)',
        },
        {
          title: '시장에서 "한 줌 주세요"',
          goal: '세 상인에게 차례로 <b>"한 줌 주세요"</b> 하고 저울에 올려 보세요.',
          hint: '버튼을 누르면 상인의 손이 콩을 쥐어 저울에 올려요.',
          setup() { ensure('market'); },
          check: () => S.mk.res.every((v) => v != null), hold: 0.4,
          status: () => mark(S.mk.res[0] != null) + ' 상인 A · ' + mark(S.mk.res[1] != null) + ' 상인 B · ' + mark(S.mk.res[2] != null) + ' 상인 C',
          explain: '같은 "한 줌"이라도 손의 크기에 따라 <b>60 g · 80 g · 100 g</b>으로 달랐어요. 상인마다 기준이 달라서 사고파는 일에 다툼이 생겨요. 저울의 <b>g</b>처럼 모두가 같은 단위를 쓰면 이런 문제가 사라져요.',
        },
        {
          type: 'quiz', title: '값이 다른 까닭',
          goal: '같은 책상인데 친구마다 잰 값이 <b>달랐던 까닭</b>은 무엇일까요?',
          setup() { ensure('span'); },
          choices: ['책상의 길이가 재는 동안 변해서', '친구마다 기준이 되는 단위(뼘)의 길이가 달라서', '친구들이 숫자를 잘못 세서', '뼘으로는 길이를 잴 수 없어서'],
          answer: 1,
          feedback: ['책상 길이는 그대로 200 cm였어요.', '', '모두 정확히 셌어요. 값이 다른 것은 세는 실수가 아니에요.', '뼘으로도 길이를 잴 수 있지만, 사람마다 뼘의 길이가 달라서 값이 달라져요.'],
          explain: '측정값은 <b>(대상의 크기) ÷ (기준 단위의 크기)</b>예요. 기준 단위가 다르면 같은 대상도 다른 값이 돼요. 그래서 모두가 같은 단위를 쓰기로 <b>약속</b>하는 것이 필요해요.',
        },
      ],
    },
    {
      title: '측정과 어림: 마지막 자리는 어림', short: '측정과 어림', icon: '🔎', phase: '실험',
      features: ['ruler'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기준(단위)이 달라서 값이 달랐어요. 이번에는 <b>같은 기준(cm)</b>의 눈금자로 연필의 길이를 재 봐요.</div>' +
        '<p>눈금자를 읽을 때는 <b>최소 눈금의 1/10까지</b> 읽고, 마지막 자리는 <b>어림</b>으로 정해요. 그래서 모든 측정값에는 <b>불확정성</b>이 조금씩 들어 있어요.</p>',
      setup() { enterLevel(1); showHint('🔍 확대 슬라이더를 올려 연필 끝을 읽어요', 6000); setSub(['zoom', 'read']); },
      recap: '측정값의 마지막 자리는 어림한 값이라 불확정성이 있어요. 눈금이 촘촘한 도구일수록 더 정밀하게 읽을 수 있어요.',
      summary: '<ul><li>측정값은 <b>최소 눈금의 1/10까지</b> 읽어요. 연필 길이 7.43 cm에서 <b>7.4는 확실한 값, 마지막 3은 어림한 값</b>이에요.</li><li>같은 연필을 여러 번 재면 7.43 · 7.45 · 7.42 · 7.44 · 7.43 cm처럼 값이 조금씩 흔들려요. → <b>평균</b> 7.434 ≈ 7.43 cm.</li><li>더 정밀한 도구(버니어 캘리퍼스 0.05 mm)를 쓰면 자릿수가 늘고 값의 흔들림이 줄어요.</li></ul>',
      missions: [
        {
          title: '연필 끝을 읽어 보기',
          goal: '확대해서 연필의 길이를 <b>소수 둘째 자리(cm)</b>까지 읽어 입력하고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '연필 끝은 7.4 cm와 7.5 cm 눈금 사이에 있어요. 눈금 사이를 10등분해 보면 어느 쪽에 가까운지 어림할 수 있어요.',
          manual: true,
          setup() { ensure('ruler'); S.ruler.tool = 'ruler'; setSub(['zoom', 'read']); updateRulerCtl(); },
          check() {
            const raw = $('#inRead').value.trim();
            if (!raw) return '읽은 값을 입력칸에 적어 주세요. (단위: cm)';
            const v = parseFloat(raw.replace(',', '.'));
            if (!isFinite(v)) return '숫자로 적어 주세요.';
            if (v > 70 && v < 80) return '단위를 확인해요. 입력칸은 <b>cm</b> 단위예요. (예: 74.3 mm → 7.43 cm)';
            if (Math.abs(v - 7.4) < 0.0001 || Math.abs(v - 7.5) < 0.0001) return '눈금 사이를 한 자리 더 <b>어림</b>해서 소수 둘째 자리까지 적어 보세요.';
            if (v >= 7.415 && v <= 7.455) { S.ruler.readOK = true; return true; }
            if (v > 7.3 && v < 7.6) return '연필 끝 위치를 다시 보세요. 7.4와 7.5 눈금 사이에서 어느 쪽에 더 가까운가요?';
            return '연필 끝이 가리키는 눈금을 다시 확인해 보세요.';
          },
          explain: '연필 끝은 7.4 cm 눈금에서 조금 더 간 곳이에요. 7.4는 눈금에서 <b>확실히 읽은 값</b>이고, 눈금 사이에서 어림한 <b>마지막 자리(0.03)</b>를 더해 약 <b>7.43 cm</b>예요. 마지막 자리는 사람마다 ±1 정도 다를 수 있어요.',
        },
        {
          title: '5번 재고 평균 구하기',
          goal: '<b>눈금자</b>와 <b>버니어 캘리퍼스</b>로 각각 5번 재고, <b>눈금자 5회의 평균(cm)</b>을 입력해 확인하세요.',
          hint: '도구를 고르고 📏 측정하기를 5번 눌러요. 평균 = (다섯 값의 합) ÷ 5.',
          manual: true,
          setup() { ensure('ruler'); setSub(['tool', 'meas', 'avg']); updateRulerCtl(); showHint('📏 도구마다 5번씩 측정해요', 6000); },
          status: () => mark(S.ruler.meas.ruler.length >= 5) + ' 눈금자 ' + S.ruler.meas.ruler.length + '/5 · ' + mark(S.ruler.meas.vernier.length >= 5) + ' 버니어 ' + S.ruler.meas.vernier.length + '/5',
          check() {
            const R = S.ruler;
            if (R.meas.ruler.length < 5) return '눈금자로 <b>5번</b> 측정해 주세요. (지금 ' + R.meas.ruler.length + '번)';
            if (R.meas.vernier.length < 5) return '버니어 캘리퍼스로도 <b>5번</b> 측정해 주세요. (지금 ' + R.meas.vernier.length + '번)';
            const raw = $('#inAvg').value.trim();
            if (!raw) return '눈금자로 잰 5회의 <b>평균</b>을 입력칸에 적어 주세요.';
            const v = parseFloat(raw.replace(',', '.'));
            if (!isFinite(v)) return '숫자로 적어 주세요.';
            if (v >= 7.428 && v <= 7.440) { R.avgOK = true; return true; }
            if (Math.abs(v - 7.43 * 5) < 0.2) return '다섯 값의 <b>합</b>이에요. 평균은 합을 5로 나눠야 해요.';
            return '평균 = (7.43 + 7.45 + 7.42 + 7.44 + 7.43) ÷ 5 를 다시 계산해 보세요.';
          },
          explain: '눈금자: (7.43 + 7.45 + 7.42 + 7.44 + 7.43) ÷ 5 = <b>7.434 cm ≈ 7.43 cm</b>. 눈금자의 흔들림 폭은 0.03 cm인데, 버니어 캘리퍼스는 0.01 cm로 훨씬 작고 자릿수도 한 자리 늘었어요. <b>더 촘촘한 눈금 = 더 정밀한 측정</b>이에요.',
        },
        {
          type: 'quiz', title: '측정값과 불확정성',
          goal: '측정값에 대한 설명으로 <b>옳은</b> 것은 무엇일까요?',
          setup() { ensure('ruler'); setSub(['tool', 'meas']); },
          choices: ['눈금이 촘촘한 도구로 재면 어림한 자리가 필요 없다', '모든 측정값에는 어림한 자리(불확정성)가 있고, 눈금이 촘촘할수록 더 정밀하게 읽는다', '여러 번 재면 항상 똑같은 값이 나온다', '버니어 캘리퍼스로 재면 진짜 길이를 정확히 알 수 있다'],
          answer: 1,
          feedback: ['아무리 촘촘한 눈금이라도 눈금 사이를 어림하는 마지막 자리는 남아요.', '', '여러 번 재면 7.43 · 7.45 · 7.42처럼 값이 조금씩 달라져요.', '버니어 캘리퍼스도 최소 눈금(0.05 mm)이 있어서 불확정성이 완전히 없어지지는 않아요.'],
          explain: '어떤 도구로 재든 <b>마지막 자리는 어림</b>한 값이라 불확정성이 있어요. 눈금이 촘촘한 도구는 불확정성이 더 작아 더 정밀하지만, 참값을 완벽하게 알 수는 없어요.',
        },
      ],
    },
    {
      title: '어림하기: 자릿수 맞히기', short: '어림하기', icon: '🧮', phase: '탐구',
      features: ['est'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 측정값에는 어림한 자리가 있다는 것을 알았어요. 이번에는 직접 재기 어려운 양을 <b>어림(추정)</b>으로 구해 봐요.</div>' +
        '<p><b>어림</b>은 알고 있는 값을 곱하고 나누어 <b>자릿수(10의 몇 제곱쯤인지)</b>를 빠르게 구하는 방법이에요. 알맞은 <b>가정 카드</b>를 끌어다 빈칸에 놓아 보세요.</p>',
      setup() { enterLevel(2); showHint('🃏 카드를 끌어 빈칸에 놓아요', 6000); },
      recap: '어림은 정확한 값이 아니라 크기 수준(자릿수)을 빠르게 알아내는 방법이에요.',
      summary: '<ul><li><b>어림</b>: 알고 있는 값을 곱하고 나누어 크기 수준(자릿수)을 빠르게 구하는 것이에요.</li><li>교실 공기의 질량: 8 × 8 × 3 = 192 m³ → 192 × 1.2 ≈ <b>2.3×10² kg</b></li><li>평생 심장 박동: 70 × 60 × 24 × 365 × 80 ≈ <b>2.9×10⁹ 번</b></li><li>운동장 둘레에 선 사람: 400 ÷ 0.5 = <b>800 명</b></li><li>가정(입력값)이 현실과 크게 다르면 결과의 자릿수도 크게 어긋나요.</li></ul>',
      missions: [
        {
          title: '교실 공기의 질량 어림하기',
          goal: '<b>교실 공기의 질량</b> = 가로 × 세로 × 높이 × 공기의 밀도. 알맞은 카드를 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '교실은 가로 8 m, 세로 8 m, 높이 3 m쯤이에요. 공기의 밀도는 약 1.2 kg/m³예요.',
          manual: true,
          setup() { ensure('est'); S.est.q = 0; updateQBtns(); },
          check: () => { S.est.q = 0; return checkEst(0); },
          explain: '교실 부피 8 × 8 × 3 = <b>192 m³</b>, 공기의 질량은 192 × 1.2 ≈ <b>2.3×10² kg</b>(약 230 kg)이에요. 눈에 보이지 않는 공기도 교실 하나에 사람 서너 명의 질량만큼 들어 있어요.',
        },
        {
          title: '다른 문제도 어림하기',
          goal: '<b>평생 뛰는 심장 박동 수</b>나 <b>운동장을 둘러쌀 사람 수</b> 중 하나를 골라 어림해 보세요.',
          hint: '심장: 분당 70번 × 60분 × 24시간 × 365일 × 80년. 운동장: 둘레 400 m ÷ 어깨너비 0.5 m.',
          manual: true,
          setup() { ensure('est'); if (S.est.q === 0) S.est.q = 1; updateQBtns(); },
          check() {
            if (S.est.q === 0) return '<b>교실 공기</b> 말고, 다른 문제를 골라 풀어 주세요.';
            return checkEst(S.est.q);
          },
          explain: '심장은 70 × 60 × 24 × 365 × 80 ≈ <b>2.9×10⁹ 번</b>(약 30억 번), 운동장은 400 ÷ 0.5 = <b>800 명</b>이에요. 정확히 세지 않아도 <b>자릿수</b>를 알면 크기를 가늠할 수 있어요.',
        },
        {
          type: 'quiz', title: '어림의 쓸모',
          goal: '"어림값은 정확하지 않은 틀린 값이라 쓸모가 없다." 이 말에 대한 생각으로 알맞은 것은?',
          setup() { ensure('est'); },
          choices: ['맞다. 정확한 값이 아니므로 쓸모없다', '아니다. 크기 수준(자릿수)을 빠르게 판단하는 데 유용하다', '맞다. 계산기가 있으면 어림은 필요 없다', '아니다. 어림값은 정확한 값과 언제나 같다'],
          answer: 1,
          feedback: ['어림은 처음부터 정확한 값이 아니라 <b>크기 수준</b>을 알려 줘요.', '', '계산기를 쓰더라도 결과가 터무니없는지 판단하려면 어림이 필요해요.', '어림값은 정확한 값과 다를 수 있어요. 다만 자릿수는 맞아요.'],
          explain: '어림은 <b>자릿수가 맞는지</b>를 빠르게 판단하게 해 줘요. 계획을 세우거나 계산 결과가 말이 되는지 확인할 때 아주 유용해요.',
        },
      ],
    },
    {
      title: '표준의 필요: 주장 · 근거 · 이유', short: '표준의 필요', icon: '⚖️', phase: '적용',
      features: ['cases'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 측정에는 항상 어림과 불확정성이 있다는 것을 알았어요. 그래도 <b>같은 기준(표준)</b>이 있으면 서로의 값을 비교할 수 있어요.</div>' +
        '<p>생활 속에서 <b>측정 표준</b>이 쓰이는 사례 6가지가 있어요. 카드를 뒤집어 보고 <b>2장</b>을 골라 "측정 표준은 꼭 필요하다"는 <b>주장</b>의 <b>근거</b>와 <b>이유</b>를 완성해 보세요.</p>',
      setup() { enterLevel(3); showHint('🃏 카드를 눌러 뒤집어 보세요', 6000); },
      recap: '측정 표준은 모두가 같은 기준으로 재도록 한 약속이에요. 표준이 있어 비교·거래·소통이 가능해요.',
      summary: '<ul><li><b>측정 표준</b>: 모두가 같은 기준으로 재기 위한 약속(국제 단위계 SI, 법적 계량 등)이에요.</li><li>사례: 주유기 1 L 검정, 택시 미터, 체온계 교정, 충전 단자 규격, 표준시, 단위 정의.</li><li>길이: 신체(뼘·큐빗) → 미터원기(1889) → <b>빛의 속력</b>으로 정의(1983)</li><li>질량: 킬로그램원기(1889) → <b>플랑크 상수</b>로 정의(2019). 원기는 시간이 지나면 질량이 변할 수 있지만 상수는 어디서나 같아요.</li><li>논증: <b>주장</b>(표준은 필요하다) – <b>근거</b>(없으면 생기는 문제) – <b>이유</b>(같은 기준이어야 비교·거래할 수 있다)</li></ul>',
      missions: [
        {
          title: '표준이 필요한 까닭 논증하기',
          goal: '사례 카드를 <b>2장</b> 골라 각각 알맞은 <b>근거</b>와 <b>이유</b>를 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '근거는 "표준이 없으면 실제로 생기는 불편"이고, 이유는 "그래서 표준이 왜 필요한지"예요.',
          manual: true,
          setup() { ensure('cases'); renderArg(); },
          status: () => mark(S.cs.sel.length >= 2) + ' 사례 ' + S.cs.sel.length + ' / 2장 고름',
          check: () => checkArg(),
          explain: '<b>주장</b>: 측정 표준은 꼭 필요하다. <b>근거</b>: 표준이 없으면 기준이 서로 달라 같은 대상이 다르게 재어지고(요금·양·체온…) 불편과 다툼이 생겨요. <b>이유</b>: 모두가 같은 기준으로 재야 값을 비교하고 믿고 거래할 수 있기 때문이에요. (표준을 써도 어림과 불확정성이 완전히 없어지지는 않아요.)',
        },
        {
          type: 'quiz', title: '킬로그램 정의가 바뀐 까닭',
          goal: '질량의 단위가 <b>국제 킬로그램원기</b>(1889)에서 <b>플랑크 상수</b>(2019)로 정의가 바뀐 까닭은?',
          setup() { ensure('cases'); },
          choices: ['원기는 시간이 지나면 질량이 변할 수 있지만, 상수는 언제 어디서나 같기 때문에', '원기를 새로 만들 금속이 부족해서', '플랑크 상수는 나라마다 다르게 정할 수 있어서', '1 kg을 더 가볍게 만들려고'],
          answer: 0,
          feedback: ['', '금속이 부족해서가 아니에요. 기준이 흔들리는 것이 문제였어요.', '상수는 어디서나 같은 값이라서 나라마다 다르게 정할 수 없어요.', '1 kg의 크기는 그대로 유지돼요. 정의하는 방식만 바뀌었어요.'],
          explain: '원기는 하나뿐인 물체라서 먼지가 붙거나 닳으면 <b>질량이 조금씩 변할 수</b> 있어요. 자연의 상수는 언제 어디서나 같아서 기준이 흔들리지 않아요. 길이 단위도 미터원기에서 <b>빛의 속력</b>으로 정의하는 방식으로 바뀌었어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-measure-standard', mount: '#game', badge: '측정 논증가', homeHref: '../../index.html#h1a',
    featureLabels: { span: '📐 뼘으로 책상 재기', market: '🛒 시장의 "한 줌"', ruler: '🔎 확대 눈금 · 🗜️ 버니어 캘리퍼스', est: '🧮 가정 카드 · 자릿수 눈금', cases: '⚖️ 표준 사례 카드 · 논증 도구' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  buildEst(); initCases(); updateCtl();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode === 'span') stepSpan(dt); else stepSpan(0);
    stepMarket(dt); stepRuler(dt);
    S.est.qs.forEach((qs) => stepItems(qs.cards, dt));
    S.cs.cards.forEach((c) => { if (c.shake > 0) c.shake = Math.max(0, c.shake - dt); });
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'span') drawSpan(t);
    else if (S.mode === 'market') drawMarket(t);
    else if (S.mode === 'ruler') drawRuler(t);
    else if (S.mode === 'est') drawEst(t);
    else drawCases(t);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, QS, CASES, get game() { return game; }, setMode, enterLevel, setSpeed(n) { SPEED = n; },
    spanStart, mkStart, takeMeasure, checkEst, curQ, estDrop, resetEst,
    fillEst(qi, right) {
      const qs = S.est.qs[qi]; S.est.q = qi; resetEst(qi);
      qs.slots.forEach((s) => {
        const pool = qs.cards.filter((c) => c.k === s.k && !c.slot && (right === false ? !c.ok : c.ok));
        const c = pool[0] || qs.cards.find((x) => x.k === s.k && !x.slot); if (!c) return;
        s.card = c; c.slot = s; c.w = s.w - 10; c.h = 46; c.x = c.tx = s.x; c.y = c.ty = s.y + 10;
      });
      qs.val = estVal(qs); qs.done = false; updateQBtns();
    },
    pickCases(a, b, ok) {
      initCases(); toggleCase(S.cs.cards[a]); toggleCase(S.cs.cards[b]);
      [a, b].forEach((ci, k) => {
        const sels = $$('#argBox select').filter((s) => +s.dataset.k === k);
        const c = CASES[ci];
        sels[0].value = String(ok ? c.ev0 : (c.ev0 + 1) % 3); sels[0].dispatchEvent(new Event('change'));
        sels[1].value = ok ? '0' : '1'; sels[1].dispatchEvent(new Event('change'));
      });
    },
  };
})();
