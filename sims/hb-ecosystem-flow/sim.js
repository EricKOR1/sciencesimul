/* =========================================================
   고등학교 생명과학 Ⅰ. 생명 시스템의 구성 - 물질 순환과 에너지 흐름 (단원 7차시)
   성취기준 [12생과01-06] 생태계의 구조를 이해하고 물질의 순환과 에너지의 흐름을 추론하여
   생태계 구성 요소들의 중요성을 설명할 수 있다.
   ① 모형: 생태계 구조 (물질·에너지 연결, 분해자 제거)   ② 탐구: 탄소 순환 (고리, 화석 연료)
   ③ 분석: 에너지 흐름 (도표 빈칸, 비교표)   ④ 적용: 평형과 중요성 (교란 연쇄, 교란 크기)
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
  const S = { mode: 'link', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const CM = '#0e7490', CE = '#ea580c';
  const num = (v) => (Math.round(v * 10) / 10);

  /* =========================================================
     ① 생태계 구조: 물질 이동과 에너지 이동
     ========================================================= */
  const NR = PHONE ? 28 : 34;
  const NODE = {
    sun: { n: '햇빛', e: '☀️', c: '#f59e0b', ab: true },
    air: { n: '공기(CO₂)', e: '💨', c: '#0ea5e9', ab: true },
    soil: { n: '토양', c: '#a16207', ab: true },
    prod: { n: '생산자', e: '🌿', c: '#22c55e' },
    c1: { n: '1차 소비자', e: '🦗', c: '#84cc16' },
    c2: { n: '2차 소비자', e: '🐸', c: '#8b5cf6' },
    dec: { n: '분해자', e: '🍄', c: '#b4693a' },
  };
  const NPOS = PHONE
    ? { sun: [62, 76], air: [240, 76], soil: [62, 470], prod: [76, 266], c1: [240, 266], c2: [404, 266], dec: [240, 470] }
    : { sun: [90, 84], air: [400, 84], soil: [90, 436], prod: [150, 240], c1: [400, 240], c2: [650, 240], dec: [400, 436] };
  const NIDS = Object.keys(NODE);
  const REQ_M = ['air>prod', 'soil>prod', 'prod>c1', 'c1>c2', 'prod>dec', 'c1>dec', 'c2>dec', 'dec>soil'];
  const REQ_E = ['sun>prod', 'prod>c1', 'c1>c2', 'prod>dec', 'c1>dec', 'c2>dec'];
  const EXTRA_M = ['dec>air', 'prod>air', 'c1>air', 'c2>air'];
  const nm = (id) => NODE[id].n;
  function linkReason(a, b, t) {
    const k = a + '>' + b;
    if (t === 'e') {
      if (a === 'air' || a === 'soil') return '공기와 토양은 에너지를 전달하지 않아요. 에너지는 햇빛과 생물의 먹이(유기물)를 따라 이동해요.';
      if (a === 'dec') return '분해자의 에너지는 호흡으로 열이 되어 생태계 밖으로 나가요. 다른 구성 요소로 이어지지 않아요.';
      if (b === 'sun' || b === 'air' || b === 'soil') return '에너지는 ' + nm(b) + '(으)로 이동하지 않아요. 호흡에서 나온 에너지는 열로 빠져나가요.';
      if (a === 'sun') return '햇빛 에너지는 광합성을 하는 생산자만 이용해요.';
      if (k === 'prod>c2') return '생산자의 에너지는 1차 소비자를 거쳐요. 먹이 사슬 순서대로 이어요.';
      return '에너지는 먹히는 쪽에서 먹는 쪽으로 이동해요. 화살표 방향을 확인해 보세요.';
    }
    if (a === 'sun' || b === 'sun') return '햇빛은 물질이 아니라 에너지예요. 에너지 이동(주황)으로 연결해요.';
    if (a === 'air' || a === 'soil') {
      if (b === 'air' || b === 'soil') return '공기와 토양 사이의 이동은 생물의 활동을 거쳐요. 생물을 통한 연결을 찾아보세요.';
      return '소비자와 분해자는 공기·토양에서 직접 탄소 양분을 얻지 않아요. 먹이(유기물)를 통해 얻어요.';
    }
    if (k === 'prod>c2') return '생산자의 물질은 1차 소비자를 거쳐 2차 소비자로 가요.';
    if (b === 'prod' && (a === 'c1' || a === 'c2')) return '소비자의 물질이 생산자로 직접 가진 않아요. 먹이는 먹히는 쪽에서 먹는 쪽으로 이동해요.';
    if (k === 'c2>c1') return '먹이는 먹히는 쪽에서 먹는 쪽으로 이동해요. 화살표 방향을 바꿔 보세요.';
    if (a === 'dec') return '분해자는 유기물을 무기물로 분해해 토양과 공기로 돌려보내요. 생산자와 소비자는 그것을 직접 먹지 않아요.';
    if (b === 'soil' || b === 'air') return nm(a) + '의 사체·배설물은 분해자를 거쳐 토양으로 돌아가요.';
    return '이 연결은 알맞지 않아요. 먹이 관계와 분해 과정을 떠올려 보세요.';
  }
  const isValid = (a, b, t) => (t === 'm' ? REQ_M.concat(EXTRA_M) : REQ_E).indexOf(a + '>' + b) >= 0;

  function resetLink() { S.link = { type: 'm', list: [], sel: null, drag: null, shake: null, pop: {}, tries: 0 }; }
  const linkCount = (t) => S.link.list.filter((l) => l.t === t && (t === 'm' ? REQ_M : REQ_E).indexOf(l.a + '>' + l.b) >= 0).length;
  const linkHas = (a, b, t) => S.link.list.some((l) => l.a === a && l.b === b && l.t === t);
  function addLink(a, b, t) {
    t = t || S.link.type;
    if (a === b) return false;
    if (linkHas(a, b, t)) { showHint('이미 이은 연결이에요.', 2000); Sound.tick(); return false; }
    if (!isValid(a, b, t)) {
      S.link.shake = { a, b, t0: S.clock }; S.link.tries++;
      showHint('✖ ' + linkReason(a, b, t), 5200); Sound.fail(); return false;
    }
    const lk = { a, b, t, k: 0 };
    S.link.list.push(lk);
    SciSim.tween(lk, { k: 1 }, { duration: 0.55, ease: 'outCubic' });
    const p = NPOS[b];
    parts.burst(p[0], p[1], { count: 10, colors: [t === 'm' ? CM : CE, '#fff'], speed: 90, size: 3, life: 0.6, gravity: 40 });
    Sound.success(); hideHint(); updateCtl();
    return true;
  }
  function linkPath(a, b, t) {
    const A = NPOS[a], B = NPOS[b];
    if (a === 'dec' && b === 'air') {
      const rx = PHONE ? 520 : 836;
      return cPts([A[0] + NR + 2, A[1] - 6], [rx, A[1] - 40], [rx, B[1] + 30], [B[0] + NR + 8, B[1] + 8], 28);
    }
    const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const bend = (t === 'm' ? -1 : 1) * (len > 300 ? 22 : 16);
    return qPts(A[0] + ux * (NR + 4), A[1] + uy * (NR + 4), B[0] - ux * (NR + 10), B[1] - uy * (NR + 10), bend, 28);
  }
  const linkPathCache = {};
  function pathOf(l) { const k = l.a + '>' + l.b + ':' + l.t; return linkPathCache[k] || (linkPathCache[k] = linkPath(l.a, l.b, l.t)); }
  function nodeAt(p) {
    let best = null, bd = 1e9;
    NIDS.forEach((id) => { const q = NPOS[id], d = Math.hypot(p.x - q[0], p.y - q[1]); if (d <= NR + 8 && d < bd) { bd = d; best = id; } });
    return best;
  }
  function drawNode(id, o) {
    o = o || {};
    const d = NODE[id], p = NPOS[id];
    let x = p[0], y = p[1];
    const sh = S.link && S.link.shake && (S.link.shake.a === id || S.link.shake.b === id) ? Math.sin((S.clock - S.link.shake.t0) * 46) * 3 * Math.max(0, 1 - (S.clock - S.link.shake.t0) * 2.2) : 0;
    x += sh;
    const r = NR * (o.scale || 1);
    if (id === 'soil') {
      D.sphere(x, y, r, '#a16207', { shadow: true });
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      [[-10, -4, 3], [8, 6, 2.5], [-2, 12, 2], [12, -10, 2.2], [-14, 8, 2]].forEach((q) => { ctx.beginPath(); ctx.arc(x + q[0] * r / 34, y + q[1] * r / 34, q[2] * r / 34, 0, TAU); ctx.fill(); });
      E('🌰', x + 2, y - 2, r * 0.8);
    } else {
      D.sphere(x, y, r, d.c, { shadow: true });
      E(d.e, x, y + 1, r * 1.0);
    }
    if (d.ab) { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(55,65,85,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (o.sel) { D.ring(x, y, r + 8, S.clock, { color: '#7c3aed', width: 3 }); }
    if (o.target) { ctx.save(); ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 7, 0, TAU); ctx.stroke(); ctx.restore(); }
    D.label(x, y + r + (PHONE ? 14 : 16), d.n, { bg: d.ab ? '#475569' : 'rgba(31,45,68,.88)', size: PHONE ? 13 : 13 });
    if (d.ab) T(x, y - r - 9, '비생물', 13, '#64748b', 'center', 800);
  }
  function drawLinks(dt) {
    const t = S.clock;
    S.link.list.forEach((l) => {
      const pts = pathOf(l), col = l.t === 'm' ? CM : CE, w = l.t === 'm' ? 3.2 : 4.4;
      if (l.t === 'e') strokeCurve(pts, l.k, 'rgba(234,88,12,.22)', w + 5, { noHead: true });
      strokeCurve(pts, l.k, col, w);
      if (l.k >= 0.99 && !RM) {
        const n = l.t === 'm' ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const f = ((t * (l.t === 'm' ? 0.28 : 0.4)) + i / n + (l.a.charCodeAt(0) % 7) * 0.13) % 1, q = ptAt(pts, f * 0.92);
          if (l.t === 'm') D.sphere(q[0], q[1], 3.6, '#22d3ee', { gloss: false, outline: '#fff', outlineWidth: 1 });
          else { D.glow(q[0], q[1], 9, '#fb923c', 0.85); D.sphere(q[0], q[1], 3.4, '#fdba74', { gloss: false }); }
        }
      }
    });
  }
  function drawLink(dt, t) {
    const q = S.link;
    ctx.fillStyle = '#eef7f0'; ctx.fillRect(0, 0, VW, VH);
    // 땅과 하늘 띠
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#e6f4ff'); g.addColorStop(0.55, '#f1f9ec'); g.addColorStop(1, '#efe3cf'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    drawLinks(dt);
    // 끌고 있는 선
    if (q.drag && q.drag.x != null) {
      const A = NPOS[q.drag.from], col = q.type === 'm' ? CM : CE;
      ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(q.drag.x, q.drag.y); ctx.stroke(); ctx.restore();
    }
    NIDS.forEach((id) => drawNode(id, { sel: q.sel === id, target: q.drag && q.drag.over === id && q.drag.over !== q.drag.from }));
    // 범례
    const ly = VH - (PHONE ? 52 : 40), lx = PHONE ? 14 : 20;
    panel(lx - 8, ly - 20, PHONE ? 452 : 460, PHONE ? 46 : 38, 12, 'rgba(255,255,255,.92)');
    ctx.save(); ctx.strokeStyle = CM; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 36, ly); ctx.stroke(); ctx.fillStyle = CM; ctx.beginPath(); ctx.moveTo(lx + 44, ly); ctx.lineTo(lx + 32, ly - 6); ctx.lineTo(lx + 32, ly + 6); ctx.fill(); ctx.restore();
    T(lx + 52, ly + 5, '물질 이동 ' + linkCount('m') + '/' + REQ_M.length, PHONE ? 13 : 14, CM, 'left', 800);
    const ex = lx + (PHONE ? 190 : 200);
    ctx.save(); ctx.strokeStyle = CE; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(ex, ly); ctx.lineTo(ex + 36, ly); ctx.stroke(); ctx.fillStyle = CE; ctx.beginPath(); ctx.moveTo(ex + 44, ly); ctx.lineTo(ex + 32, ly - 6); ctx.lineTo(ex + 32, ly + 6); ctx.fill(); ctx.restore();
    T(ex + 52, ly + 5, '에너지 이동 ' + linkCount('e') + '/' + REQ_E.length, PHONE ? 13 : 14, CE, 'left', 800);
    if (!q.list.length && !q.drag) D.label(VW / 2, PHONE ? 168 : 160, '👆 노드를 끌어 다른 노드에 놓아 보세요', { bg: '#7c3aed', size: PHONE ? 13 : 15 });
    parts.update(dt); parts.draw(ctx);
  }
  function linkDown(p) {
    const q = S.link, id = nodeAt(p);
    if (!id) { q.sel = null; return false; }
    if (q.sel && q.sel !== id) { const a = q.sel; q.sel = null; addLink(a, id); return false; }
    q.drag = { from: id, x: p.x, y: p.y, over: id, moved: false };
    return true;
  }
  function linkMove(p) { const d = S.link.drag; if (!d) return; d.x = p.x; d.y = p.y; d.over = nodeAt(p); if (Math.hypot(p.x - NPOS[d.from][0], p.y - NPOS[d.from][1]) > NR + 6) d.moved = true; }
  function linkUp(p) {
    const q = S.link, d = q.drag; q.drag = null; if (!d) return;
    const over = nodeAt(p);
    if (over && over !== d.from) { q.sel = null; addLink(d.from, over); } else q.sel = q.sel === d.from ? null : d.from;
  }

  /* =========================================================
     ① 분해자를 빼면? (12주)
     ========================================================= */
  const REM_WEEKS = 12, REM_SPEED = 1.5;
  function remVals(dec, w) {
    if (dec) return { litter: 20, soil: 60, prod: 100 };
    const soil = 60 * Math.exp(-0.2 * w);
    return { litter: 20 + 10 * w, soil, prod: 40 + soil };
  }
  function resetRem() { S.rem = { dec: true, run: false, w: 0, disp: remVals(true, 0), done: { on: false, off: false }, flow: [] }; }
  function remRun() {
    const q = S.rem; if (q.run) return;
    q.run = true; q.w = 0; q.fin = false; Sound.click(); updateCtl();
  }
  function remReset() { const q = S.rem; q.run = false; q.w = 0; q.fin = false; q.flow.length = 0; q.disp = remVals(q.dec, 0); updateCtl(); }
  function stepRem(dt) {
    const q = S.rem;
    if (q.run) {
      q.w = Math.min(REM_WEEKS, q.w + dt * REM_SPEED);
      if (q.w >= REM_WEEKS) { q.run = false; q.fin = true; q.done[q.dec ? 'on' : 'off'] = true; Sound.success(); updateCtl(); showHint(q.dec ? '분해자가 있으면 12주 뒤에도 값이 그대로예요.' : '분해자가 없으면 사체·낙엽이 쌓이고 토양 양분이 줄어요!', 5200); }
    }
    const tgt = remVals(q.dec, q.w);
    q.disp.litter = SciSim.approach(q.disp.litter, tgt.litter, dt, 8); q.disp.soil = SciSim.approach(q.disp.soil, tgt.soil, dt, 8); q.disp.prod = SciSim.approach(q.disp.prod, tgt.prod, dt, 8);
  }
  const REMR = PHONE ? { x: 6, y: 6, w: 468, h: 336 } : { x: 10, y: 10, w: 520, h: 540 };
  const REMG = PHONE ? { x: 6, y: 350, w: 468, h: 284 } : { x: 540, y: 10, w: 250, h: 540 };
  const REM_MAX = { litter: 150, soil: 70, prod: 100 };
  function drawRem(dt, t) {
    const q = S.rem, r = REMR, d = q.disp;
    ctx.fillStyle = '#eef7f0'; ctx.fillRect(0, 0, VW, VH);
    panel(r.x, r.y, r.w, r.h, 18);
    ctx.save(); D.roundRect(r.x, r.y, r.w, r.h, 18); ctx.clip();
    const gy = r.y + r.h * 0.5;
    D.sky(r.x, r.y, r.w, gy - r.y, '#bfe3ff', '#f1fbff');
    // 땅(토양 단면)
    const sg = ctx.createLinearGradient(0, gy, 0, r.y + r.h); sg.addColorStop(0, '#9a6a3d'); sg.addColorStop(1, '#6b4423'); ctx.fillStyle = sg; ctx.fillRect(r.x, gy, r.w, r.h - (gy - r.y));
    ctx.fillStyle = '#5fb55a'; ctx.fillRect(r.x, gy - 6, r.w, 10);
    E('☀️', r.x + r.w - 46, r.y + 46, PHONE ? 34 : 44, { rot: RM ? 0 : Math.sin(t * 0.5) * 0.1 });
    // 생산자(식물)
    const sc = 0.3 + 0.7 * clamp(d.prod / 100, 0, 1), wilt = 1 - clamp(d.prod / 100, 0, 1);
    const nP = PHONE ? 7 : 9;
    for (let i = 0; i < nP; i++) {
      const px = r.x + 40 + (i + 0.5) * (r.w - 80) / nP, h = (PHONE ? 70 : 96) * sc * (0.85 + 0.15 * Math.sin(i * 2.3)), sway = RM ? 0 : Math.sin(t * 1.4 + i) * 3 * sc;
      const col = C.mix('#3fa84a', '#b9a24a', wilt * 0.9);
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px, gy - 4); ctx.quadraticCurveTo(px + sway * 0.4 - wilt * 6, gy - h * 0.5, px + sway - wilt * 14, gy - h); ctx.stroke();
      ctx.fillStyle = col;
      [[-1, 0.55], [1, 0.75], [-1, 0.9]].forEach((lf) => { ctx.beginPath(); const ly = gy - h * lf[1], lx = px + sway * lf[1] - wilt * 14 * lf[1]; ctx.ellipse(lx + lf[0] * 9 * sc, ly + wilt * 6, 10 * sc + 2, 4 * sc + 1.5, lf[0] * (-0.5 + wilt * 0.9), 0, TAU); ctx.fill(); });
    }
    E('🦗', r.x + r.w * 0.28, gy - (PHONE ? 70 : 100) * sc + Math.sin(t * 3) * 2, PHONE ? 24 : 30);
    E('🐸', r.x + r.w * 0.72, gy - 20, PHONE ? 28 : 34, { flip: true });
    // 사체·낙엽 더미
    const lh = clamp(d.litter / REM_MAX.litter, 0, 1) * r.h * 0.2;
    const mx = r.x + r.w * 0.5, mw = 70 + clamp(d.litter / REM_MAX.litter, 0, 1) * (r.w * 0.55);
    const lg = ctx.createLinearGradient(0, gy - lh, 0, gy); lg.addColorStop(0, '#c08a4a'); lg.addColorStop(1, '#8b5a2b');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(mx - mw / 2, gy - 2); ctx.quadraticCurveTo(mx - mw * 0.2, gy - lh * 1.5, mx, gy - lh); ctx.quadraticCurveTo(mx + mw * 0.25, gy - lh * 1.4, mx + mw / 2, gy - 2); ctx.closePath(); ctx.fill();
    const rr = mulberry(77);
    for (let i = 0; i < Math.round(d.litter / 6); i++) { const a = rr(), b = rr(); const lx = mx - mw / 2 + a * mw, ly = gy - 3 - b * lh * 0.8 * (1 - Math.abs(a - 0.5) * 1.6); ctx.fillStyle = ['#a96a2c', '#c99a3a', '#7a4a1e'][i % 3]; ctx.beginPath(); ctx.ellipse(lx, ly, 6, 2.6, a * 3, 0, TAU); ctx.fill(); }
    T(mx, gy - lh - 8, '사체·낙엽', PHONE ? 13 : 13, '#5b3a17', 'center', 800, { stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 });
    // 토양 양분 입자
    const nN = Math.round(d.soil / 60 * 36), rn = mulberry(11);
    for (let i = 0; i < 36; i++) { const nx = r.x + 16 + rn() * (r.w - 32), ny = gy + 22 + rn() * (r.y + r.h - gy - 36); if (i < nN) D.sphere(nx, ny + Math.sin(t * 2 + i) * (RM ? 0 : 1.2), 4.6, '#facc15', { gloss: false, outline: '#fff7c2', outlineWidth: 1 }); }
    T(r.x + 14, r.y + r.h - 10, '● 토양 양분(무기염류 등)', PHONE ? 13 : 13, '#fde68a', 'left', 800);
    // 분해자
    if (q.dec) {
      for (let i = 0; i < 4; i++) E('🍄', mx - 40 + i * 28, gy - lh * 0.3 - 4 + (i % 2) * 3, PHONE ? 20 : 24);
      const rb = mulberry(5);
      for (let i = 0; i < 14; i++) { const bx = r.x + 20 + rb() * (r.w - 40), by = gy + 14 + rb() * 60; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(bx + Math.sin(t * 2 + i) * 3, by, 5, 2.6, i, 0, TAU); ctx.fill(); }
      if (!RM && q.w < REM_WEEKS && (q.run || true) && Math.random() < dt * 4) { const sx = mx + (Math.random() - 0.5) * 40; parts.emit({ x: sx, y: gy + 4, vx: (Math.random() - 0.5) * 12, vy: 26, life: 1.6, size: 3.2, color: '#facc15', shape: 'circle' }); }
    } else {
      ctx.save(); ctx.globalAlpha = 0.9; D.label(r.x + r.w / 2, gy + 40, '🚫 분해자 없음', { bg: '#b91c1c', size: PHONE ? 14 : 16 }); ctx.restore();
    }
    ctx.restore();
    D.label(r.x + 80, r.y + 22, (q.dec ? '🍄 분해자 있음' : '🚫 분해자 없음') + ' · ' + Math.floor(q.w) + '주째', { bg: q.dec ? '#15803d' : '#b91c1c', size: PHONE ? 13 : 14.5 });
    // 게이지
    const g = REMG;
    panel(g.x, g.y, g.w, g.h, 18);
    T(g.x + 16, g.y + 28, '변화 (상대 단위, 예시)', PHONE ? 14 : 15.5, '#26324a', 'left', 800);
    const rows = [['litter', '사체·낙엽 더미', '#a96a2c'], ['soil', '토양 양분', '#d9a40a'], ['prod', '생산자의 양', '#22a04a']];
    const bh = PHONE ? 34 : 38, by0 = g.y + (PHONE ? 62 : 74), gap = PHONE ? 76 : 100;
    rows.forEach((rw, i) => {
      const y = by0 + i * gap, x = g.x + 16, w = g.w - 32, v = d[rw[0]], mx_ = REM_MAX[rw[0]];
      T(x, y - 8, rw[1], PHONE ? 14 : 15, '#26324a', 'left', 800); T(x + w, y - 8, String(Math.round(v)), 17, '#1f2d44', 'right', 800);
      ctx.fillStyle = '#eef2f7'; D.roundRect(x, y, w, bh, 10); ctx.fill();
      const bw = clamp(v / mx_, 0, 1) * w;
      if (bw > 1) { ctx.save(); D.roundRect(x, y, w, bh, 10); ctx.clip(); const gg = ctx.createLinearGradient(x, 0, x + w, 0); gg.addColorStop(0, C.shade(rw[2], 0.25)); gg.addColorStop(1, rw[2]); ctx.fillStyle = gg; ctx.fillRect(x, y, bw, bh); ctx.restore(); }
      T(x, y + bh + 15, '0', 13, '#8695aa', 'left', 700); T(x + w, y + bh + 15, String(mx_), 13, '#8695aa', 'right', 700);
    });
    // 주 진행 막대
    const py = g.y + g.h - (PHONE ? 36 : 44), px = g.x + 16, pw = g.w - 32;
    ctx.fillStyle = '#eef2f7'; D.roundRect(px, py, pw, 14, 7); ctx.fill();
    ctx.fillStyle = '#7c3aed'; if (q.w > 0.05) { D.roundRect(px, py, pw * q.w / REM_WEEKS, 14, 7); ctx.fill(); }
    T(px, py - 6, '0주', 13, '#8695aa', 'left', 700); T(px + pw, py - 6, REM_WEEKS + '주', 13, '#8695aa', 'right', 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ② 탄소 순환 고리 (연간 상대 단위)
     ========================================================= */
  const PROC = [
    { n: '광합성', c: '#16a34a' }, { n: '호흡', c: '#dc2626' }, { n: '먹이 섭취', c: '#d97706' }, { n: '분해', c: '#92400e' }, { n: '연소', c: '#475569' },
  ];
  const POOL = PHONE
    ? { air: { x: 190, y: 84, w: 170, h: 58, n: '대기', s: 'CO₂', e: '💨', c: '#0ea5e9' }, fos: { x: 400, y: 84, w: 120, h: 58, n: '화석 연료', s: '석탄·석유', e: '🛢️', c: '#475569' }, prod: { x: 190, y: 300, w: 150, h: 64, n: '생산자', s: '식물', e: '🌿', c: '#22c55e' }, dec: { x: 100, y: 490, w: 170, h: 64, n: '분해자·토양', s: '', e: '🍄', c: '#b4693a' }, cons: { x: 380, y: 490, w: 170, h: 64, n: '소비자', s: '', e: '🦗', c: '#f59e0b' } }
    : { air: { x: 330, y: 92, w: 210, h: 66, n: '대기', s: 'CO₂', e: '💨', c: '#0ea5e9' }, fos: { x: 690, y: 92, w: 150, h: 66, n: '화석 연료', s: '석탄·석유', e: '🛢️', c: '#475569' }, prod: { x: 330, y: 292, w: 150, h: 72, n: '생산자', s: '식물', e: '🌿', c: '#22c55e' }, dec: { x: 120, y: 420, w: 190, h: 72, n: '분해자·토양', s: '', e: '🍄', c: '#b4693a' }, cons: { x: 610, y: 420, w: 160, h: 72, n: '소비자', s: '', e: '🦗', c: '#f59e0b' } };
  // 화살표: 출발 · 도착 · 과정(정답) · 연간 흐름 · 모양 (x1,y1,x2,y2,굽음) · 이름표 위치(l/r/c)
  const ARR = [
    { id: 'a', f: 'air', t: 'prod', ans: 0, flow: 120, g: L([300, 127, 300, 254, 0], [160, 113, 160, 266, 0]), side: 'l' },
    { id: 'b', f: 'prod', t: 'air', ans: 1, flow: 50, g: L([362, 254, 362, 127, 0], [222, 266, 222, 113, 0]), side: 'r' },
    { id: 'c', f: 'prod', t: 'cons', ans: 2, flow: 20, g: L([385, 330, 560, 382, 0], [240, 334, 340, 456, 0]), side: 'r' },
    { id: 'd', f: 'cons', t: 'air', ans: 1, flow: 10, g: L([650, 382, 420, 127, 34], [400, 456, 262, 113, 30]), side: 'r' },
    { id: 'e', f: 'prod', t: 'dec', ans: 3, flow: 50, g: L([290, 330, 190, 382, 0], [130, 334, 110, 456, 0]), side: L('l', 'c') },
    { id: 'f', f: 'cons', t: 'dec', ans: 3, flow: 10, g: L([600, 458, 150, 458, -36], [330, 524, 150, 524, -28]), side: 'c' },
    { id: 'g', f: 'dec', t: 'air', ans: 1, flow: 60, g: L([80, 382, 235, 127, -34], [50, 456, 112, 113, -34]), side: L('l', 'c') },
    { id: 'h', f: 'fos', t: 'air', ans: 4, flow: 9, g: L([615, 92, 437, 92, 0], [340, 84, 277, 84, 0]), side: 'c' },
  ];
  ARR.forEach((a) => { a.pts = qPts(a.g[0], a.g[1], a.g[2], a.g[3], a.g[4], 24); a.mid = ptAt(a.pts, 0.5); });
  const CARB_N = ARR.length;
  function resetCarb() { S.carb = { lab: ARR.map(() => null), bad: {}, solved: false, pop: ARR.map(() => 1), shakeT: -9 }; }
  const carbOK = (i) => S.carb.lab[i] === ARR[i].ans;
  const carbDone = () => S.carb.lab.filter((v) => v != null).length;
  function carbCycle(i) {
    const q = S.carb; if (q.solved) return;
    q.lab[i] = q.lab[i] == null ? 0 : (q.lab[i] + 1 >= PROC.length ? null : q.lab[i] + 1);
    delete q.bad[i]; q.pop[i] = 0.3; SciSim.tween(q.pop, { [i]: 1 }, { duration: 0.35, ease: 'outBack' }); Sound.click();
  }
  function arrHit(p) {
    for (let i = 0; i < ARR.length; i++) {
      const a = ARR[i], lab = S.carb.lab[i];
      let bx = a.mid[0], by = a.mid[1];
      let w = 22, h = 22, cx = bx, cy = by;
      if (lab != null) { const tw = labW(i); if (a.side === 'l') cx = bx - 18 - tw / 2; else if (a.side === 'r') cx = bx + 18 + tw / 2; w = Math.max(22, tw / 2 + 4); h = 17; if (a.side !== 'c') { if (Math.abs(p.x - bx) <= 22 && Math.abs(p.y - by) <= 22) return i; } }
      if (Math.abs(p.x - cx) <= w + 4 && Math.abs(p.y - cy) <= h + 6) return i;
    }
    return -1;
  }
  const labText = (i) => PROC[S.carb.lab[i]].n + (S.carb.solved ? ' ' + ARR[i].flow : '');
  function labW(i) { ctx.save(); ctx.font = D.font(PHONE ? 13 : 14, 800); const w = ctx.measureText(labText(i)).width + 18; ctx.restore(); return w; }
  function drawPool(k, dim) {
    const p = POOL[k];
    panel(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 16, '#fff');
    const gg = ctx.createLinearGradient(p.x - p.w / 2, 0, p.x + p.w / 2, 0); gg.addColorStop(0, C.rgba(p.c, 0.28)); gg.addColorStop(1, C.rgba(p.c, 0.06));
    D.roundRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 16); ctx.fillStyle = gg; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = p.c; ctx.stroke();
    E(p.e, p.x - p.w / 2 + 26, p.y + 1, PHONE ? 26 : 32);
    if (k === 'cons') E('🐸', p.x - p.w / 2 + 26 + (PHONE ? 22 : 28), p.y + 1, PHONE ? 22 : 26);
    const tx = p.x - p.w / 2 + (k === 'cons' ? (PHONE ? 70 : 82) : 50);
    const nm_ = p.n;
    if (p.s) { T(p.x + 14, p.y - 2, nm_, PHONE ? 14 : 16, '#1f2d44', 'center', 800); T(p.x + 14, p.y + 17, p.s, PHONE ? 13 : 13, '#475569', 'center', 800); }
    else T(tx + (p.x + p.w / 2 - tx) / 2 - 4, p.y + 5, nm_, PHONE ? 14 : 16, '#1f2d44', 'center', 800);
  }
  function drawCarbArrows(t) {
    const q = S.carb;
    ARR.forEach((a, i) => {
      const lab = q.lab[i], bad = q.bad[i], solved = q.solved;
      let col = '#94a3b8', w = 3, al = 0.9;
      if (lab != null) col = PROC[lab].c;
      if (solved) { col = PROC[a.ans].c; w = 2.4 + 5.2 * Math.sqrt(a.flow / 120); }
      if (bad) col = '#dc2626';
      strokeCurve(a.pts, 1, col, w, { dash: solved || lab != null ? null : [7, 6], alpha: al });
      if (solved && !RM) {
        const n = Math.max(1, Math.round(a.flow / 30));
        for (let k = 0; k < n; k++) { const f = ((t * 0.22) + k / n + i * 0.11) % 1, p = ptAt(a.pts, 0.04 + f * 0.9); D.sphere(p[0], p[1], 4.6, '#1f2937', { gloss: true }); T(p[0], p[1] + 2.6, 'C', 6.5, '#fff', 'center', 800); }
      }
    });
    // 이름표 자리
    ARR.forEach((a, i) => {
      const lab = q.lab[i], bad = q.bad[i], bx = a.mid[0], by = a.mid[1], pop = clamp(q.pop[i], 0, 1.15);
      const sk = bad ? Math.sin(t * 40) * 2.5 * Math.max(0, 1 - (t - q.shakeT) * 2.2) : 0;
      if (lab == null) {
        ctx.save(); ctx.translate(bx + sk, by); ctx.scale(0.8 + 0.2 * pop, 0.8 + 0.2 * pop);
        const pulse = RM ? 0 : (Math.sin(t * 3 + i) * 0.5 + 0.5) * 2;
        D.sphere(0, 0, 14 + pulse * 0.5, '#fff', { gloss: false, outline: '#64748b', outlineWidth: 2.5 });
        T(0, 6, '❓', 15, '#64748b', 'center', 800);
        ctx.restore();
      } else {
        const tw = labW(i), txt = labText(i), pc = bad ? '#dc2626' : PROC[lab].c;
        let cx = bx;
        if (a.side === 'l') cx = bx - 18 - tw / 2; else if (a.side === 'r') cx = bx + 18 + tw / 2;
        if (a.side !== 'c') D.sphere(bx, by, 6, pc, { gloss: false, outline: '#fff', outlineWidth: 1.5 });
        ctx.save(); ctx.translate(cx + sk, by); ctx.scale(pop, pop);
        D.label(0, 0, txt, { bg: pc, size: PHONE ? 13 : 14, border: bad ? '#fff' : null });
        ctx.restore();
      }
    });
  }
  function drawCyc(dt, t) {
    const q = S.carb;
    bgFill('#e8f5ff', '#eef8ea');
    drawCarbArrows(t);
    Object.keys(POOL).forEach((k) => drawPool(k));
    if (q.solved) D.label(PHONE ? 240 : 400, PHONE ? 612 : 540, '✅ 탄소는 생태계 안에서 돌고 돌아요 (연간 상대 단위)', { bg: '#15803d', size: PHONE ? 13 : 14.5 });
    else T(PHONE ? 240 : 400, PHONE ? 616 : 538, '화살표 가운데 ❓을 눌러 이름표를 붙여요 (' + carbDone() + ' / ' + CARB_N + ')', PHONE ? 13 : 15, '#475569', 'center', 800);
    parts.update(dt); parts.draw(ctx);
  }
  function cycDown(p) { const i = arrHit(p); if (i >= 0) { carbCycle(i); return false; } return false; }

  /* ② 화석 연료 연소 -> 대기 탄소 */
  const BURN_YEARS = 50, BASE_C = 800, BURN_RATE = 9, BURN_SPEED = 12;
  const burnVal = (on, yr) => BASE_C + (on ? BURN_RATE : 0) * yr;
  function resetBurn() { S.burn = { on: false, run: false, p: 0, ran: { off: false, on: false }, cur: null, disp: BASE_C }; }
  function burnRun() {
    const q = S.burn; if (q.run) return;
    q.run = true; q.p = 0; q.cur = q.on; Sound.click(); updateCtl();
  }
  function stepBurn(dt) {
    const q = S.burn;
    if (q.run) {
      q.p = Math.min(BURN_YEARS, q.p + dt * BURN_SPEED);
      if (q.p >= BURN_YEARS) { q.run = false; q.ran[q.cur ? 'on' : 'off'] = true; Sound.success(); updateCtl(); showHint(q.cur ? '연소를 켜면 해마다 대기 탄소가 늘어요: 50년 뒤 ' + burnVal(true, BURN_YEARS) + ' (+' + BURN_RATE * BURN_YEARS + ')' : '연소가 없으면 흡수 120 = 방출 120이라 대기 탄소는 그대로예요.', 5200); }
    }
    const tgt = q.cur == null ? BASE_C : burnVal(q.cur, q.p);
    q.disp = SciSim.approach(q.disp, tgt, dt, 12);
  }
  const BG = PHONE ? { x: 6, y: 6, w: 468, h: 196 } : { x: 10, y: 10, w: 226, h: 540 };
  const BP = PHONE ? { x: 6, y: 210, w: 468, h: 424 } : { x: 246, y: 10, w: 544, h: 540 };
  const BPL = PHONE ? { x: BP.x + 56, y: BP.y + 44, w: BP.w - 78, h: BP.h - 112 } : { x: BP.x + 64, y: BP.y + 48, w: BP.w - 96, h: BP.h - 118 };
  const BY0 = 700, BY1 = 1300;
  const bx = (yr) => BPL.x + yr / BURN_YEARS * BPL.w, by = (v) => BPL.y + BPL.h - clamp((v - BY0) / (BY1 - BY0), 0, 1) * BPL.h;
  function drawBurn(dt, t) {
    const q = S.burn, g = BG, on = q.cur == null ? q.on : q.cur;
    ctx.fillStyle = '#eef7f0'; ctx.fillRect(0, 0, VW, VH);
    panel(g.x, g.y, g.w, g.h, 18);
    T(g.x + 14, g.y + 26, '한 해 탄소 출입', PHONE ? 14 : 15.5, '#26324a', 'left', 800);
    const barX = g.x + 14, barW = PHONE ? 250 : g.w - 28, maxF = 130;
    const rows = [['광합성으로 흡수', 120, '#16a34a'], ['호흡·분해로 방출', 120, '#dc2626'], ['연소로 추가 방출', q.on ? BURN_RATE : 0, '#475569']];
    rows.forEach((r, i) => {
      const y = g.y + 56 + i * (PHONE ? 38 : 56);
      T(barX, y - 6, r[0], PHONE ? 13 : 13.5, '#34445c', 'left', 800); T(barX + barW, y - 6, String(r[1]), 14, '#1f2d44', 'right', 800);
      ctx.fillStyle = '#eef2f7'; D.roundRect(barX, y, barW, 18, 9); ctx.fill();
      const w = r[1] / maxF * barW; if (w > 0.5) { ctx.fillStyle = r[2]; D.roundRect(barX, y, Math.max(w, 2), 18, 9); ctx.fill(); }
    });
    // 대기 탄소 탱크
    const tkv = q.disp;
    if (!PHONE) {
      const tx = g.x + 40, ty = g.y + 244, tw = 70, th = 250;
      T(g.x + 14, g.y + 226, '☁️ 대기 탄소', 15, '#26324a', 'left', 800);
      ctx.fillStyle = '#eef2f7'; D.roundRect(tx, ty, tw, th, 12); ctx.fill();
      const hh = clamp((tkv - BY0) / (BY1 - BY0), 0, 1) * th;
      ctx.save(); D.roundRect(tx, ty, tw, th, 12); ctx.clip(); const gg = ctx.createLinearGradient(0, ty + th - hh, 0, ty + th); gg.addColorStop(0, on ? '#ef4444' : '#38bdf8'); gg.addColorStop(1, on ? '#b91c1c' : '#0284c7'); ctx.fillStyle = gg; ctx.fillRect(tx, ty + th - hh, tw, hh); ctx.restore();
      for (let v = BY0; v <= BY1; v += 200) { const yy = ty + th - (v - BY0) / (BY1 - BY0) * th; ctx.strokeStyle = 'rgba(31,45,68,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx + tw, yy); ctx.lineTo(tx + tw + 8, yy); ctx.stroke(); T(tx + tw + 12, yy + 4.5, String(v), 13, '#5d6879', 'left', 700); }
      D.label(tx + tw / 2, ty + th - hh - 14, String(Math.round(tkv)), { bg: '#1f2d44', size: 13.5 });
    } else {
      const tx = g.x + 14, ty = g.y + 168, tw = 300, th = 16;
      T(tx, ty - 6, '☁️ 대기 탄소 ' + Math.round(tkv), 13, '#26324a', 'left', 800);
      ctx.fillStyle = '#eef2f7'; D.roundRect(tx, ty, tw, th, 8); ctx.fill();
      const ww = clamp((tkv - BY0) / (BY1 - BY0), 0, 1) * tw; ctx.save(); D.roundRect(tx, ty, tw, th, 8); ctx.clip(); ctx.fillStyle = on ? '#ef4444' : '#0ea5e9'; ctx.fillRect(tx, ty, ww, th); ctx.restore();
    }
    // 그래프
    panel(BP.x, BP.y, BP.w, BP.h, 18);
    ctx.fillStyle = '#fbfdff'; ctx.fillRect(BPL.x, BPL.y, BPL.w, BPL.h);
    ctx.strokeStyle = '#e3eaf3'; ctx.lineWidth = 1;
    for (let v = BY0; v <= BY1; v += 100) { const yy = by(v); ctx.beginPath(); ctx.moveTo(BPL.x, yy); ctx.lineTo(BPL.x + BPL.w, yy); ctx.stroke(); if ((v - BY0) % 200 === 0) T(BPL.x - 7, yy + 4.5, String(v), 13, '#5d6879', 'right', 700); }
    for (let yr = 0; yr <= BURN_YEARS; yr += 10) { const xx = bx(yr); ctx.beginPath(); ctx.moveTo(xx, BPL.y); ctx.lineTo(xx, BPL.y + BPL.h); ctx.stroke(); T(xx, BPL.y + BPL.h + 18, String(yr), 13, '#5d6879', 'center', 700); }
    ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(BPL.x, BPL.y); ctx.lineTo(BPL.x, BPL.y + BPL.h); ctx.lineTo(BPL.x + BPL.w, BPL.y + BPL.h); ctx.stroke();
    T(BPL.x + BPL.w / 2, BPL.y + BPL.h + 40, '시간 (년)', 13, '#34445c', 'center', 800);
    ctx.save(); ctx.translate(BP.x + 16, BPL.y + BPL.h / 2); ctx.rotate(-Math.PI / 2); T(0, 0, '대기 탄소 (상대 단위)', 13, '#34445c', 'center', 800); ctx.restore();
    T(BPL.x + 8, BPL.y - 14, '☁️ 대기 속 탄소의 양', PHONE ? 14 : 16, '#26324a', 'left', 800);
    const curve = (isOn, prog, col) => {
      const yrs = prog; if (yrs <= 0) return;
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx(0), by(burnVal(isOn, 0)));
      ctx.lineTo(bx(yrs), by(burnVal(isOn, yrs))); ctx.stroke(); ctx.restore();
      D.sphere(bx(yrs), by(burnVal(isOn, yrs)), 6, col, { gloss: false, outline: '#fff', outlineWidth: 2 });
    };
    ['off', 'on'].forEach((k) => {
      const isOn = k === 'on', running = q.run && q.cur === isOn;
      const prog = running ? q.p : (q.ran[k] ? BURN_YEARS : 0);
      curve(isOn, prog, isOn ? '#dc2626' : '#2563eb');
    });
    if (q.ran.off) D.label(bx(BURN_YEARS) - 4, by(BASE_C) + 18, '연소 없음 ' + BASE_C, { bg: '#2563eb', size: 13, align: 'right' });
    if (q.ran.on && !(q.run && q.cur)) D.label(bx(BURN_YEARS) - 4, by(burnVal(true, BURN_YEARS)) - 16, '연소 있음 ' + burnVal(true, BURN_YEARS), { bg: '#dc2626', size: 13, align: 'right' });
    if (!q.ran.off && !q.ran.on && !q.run) T(BPL.x + BPL.w / 2, BPL.y + BPL.h / 2, '▶ 50년을 눌러 대기 탄소의 변화를 그려요', PHONE ? 14 : 17, '#8ea0b6', 'center', 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ③ 에너지 흐름 도표 (생산자가 고정한 에너지 = 1000)
     ========================================================= */
  const EN_IN = 1000, EN_PH = 300, EN_PC1 = 100, EN_C1H = 50, EN_C12 = 10, EN_C2H = 4;
  const EN_ANS = [EN_IN - EN_PH - EN_PC1, EN_PC1 - EN_C1H - EN_C12, EN_C12 - EN_C2H, 0, EN_IN];
  EN_ANS[3] = EN_ANS[0] + EN_ANS[1] + EN_ANS[2];          // 분해자가 받은 에너지 = 분해자의 호흡 열
  const FL_LAB = [
    { k: 'pd', t: '① 생산자 → 분해자 (낙엽·사체)', u: '= 1000 − 300 − 100' },
    { k: 'c1d', t: '② 1차 소비자 → 분해자', u: '= 100 − 50 − 10' },
    { k: 'c2d', t: '③ 2차 소비자 → 분해자', u: '= 10 − 4' },
    { k: 'dh', t: '④ 분해자의 호흡 열', u: '= ①+②+③' },
    { k: 'tot', t: '⑤ 열의 총합', u: '= 300+50+4+④' },
  ];
  const FB = PHONE
    ? { P: { x: 14, y: 200, w: 116, h: 70 }, C1: { x: 182, y: 200, w: 116, h: 70 }, C2: { x: 350, y: 200, w: 116, h: 70 }, D: { x: 60, y: 420, w: 360, h: 70 } }
    : { P: { x: 50, y: 190, w: 170, h: 84 }, C1: { x: 315, y: 190, w: 170, h: 84 }, C2: { x: 580, y: 190, w: 170, h: 84 }, D: { x: 140, y: 410, w: 500, h: 84 } };
  function resetFlow() { S.flow = { inp: ['', '', '', '', ''], bad: {}, shakeT: -9, pop: 0 }; $$('#flowIn input').forEach((i) => { i.value = ''; i.classList.remove('ok', 'bad'); }); }
  const flowVal = (i) => { const s = S.flow.inp[i]; if (s === '' || s == null) return null; const v = Number(s); return isFinite(v) ? v : null; };
  const flowOK = (i) => flowVal(i) === EN_ANS[i];
  const flowFilled = () => S.flow.inp.filter((s) => s !== '').length;
  const flowRight = () => S.flow.inp.filter((s, i) => flowOK(i)).length;
  function buildFlowInputs() {
    const box = $('#flowIn'); box.innerHTML = '';
    FL_LAB.forEach((f, i) => {
      const lab = document.createElement('div'); lab.className = 'lab'; lab.innerHTML = f.t + '<div class="in-unit">' + f.u + '</div>';
      const inp = document.createElement('input'); inp.type = 'number'; inp.className = 'num-in'; inp.inputMode = 'numeric'; inp.min = '0'; inp.max = '2000'; inp.step = '1'; inp.id = 'fl' + i; inp.setAttribute('aria-label', f.t);
      inp.addEventListener('input', () => { S.flow.inp[i] = inp.value; delete S.flow.bad[i]; inp.classList.remove('bad'); inp.classList.toggle('ok', flowOK(i)); if (flowOK(i)) { Sound.tick(); S.flow.pop = 1; } });
      box.appendChild(lab); box.appendChild(inp);
    });
  }
  const eW = (v) => 2.4 + 15 * Math.sqrt(clamp(v, 0, 1000) / 1000);
  function eArrow(x1, y1, x2, y2, v, o) {
    o = o || {};
    const pts = qPts(x1, y1, x2, y2, o.bend || 0, 18), w = v == null ? 3 : eW(v);
    if (v == null) { strokeCurve(pts, 1, '#94a3b8', 3, { dash: [7, 6] }); return pts; }
    strokeCurve(pts, 1, 'rgba(234,88,12,.22)', w + 6, { noHead: true });
    strokeCurve(pts, 1, o.heat ? '#dc2626' : CE, w, { head: Math.max(11, w * 1.5) });
    if (!RM && v > 0) {
      const n = Math.max(1, Math.min(5, Math.round(Math.sqrt(v) / 6)));
      for (let k = 0; k < n; k++) { const f = ((S.clock * 0.3) + k / n + (x1 * 0.013)) % 1, q = ptAt(pts, 0.05 + f * 0.85); D.glow(q[0], q[1], 8, o.heat ? '#f87171' : '#fb923c', 0.9); D.sphere(q[0], q[1], 2.8 + w * 0.12, o.heat ? '#fecaca' : '#fed7aa', { gloss: false }); }
    }
    return pts;
  }
  function numPill(x, y, v, blankIdx, o) {
    o = o || {};
    const q = S.flow;
    if (blankIdx != null) {
      const val = flowVal(blankIdx), ok = flowOK(blankIdx), bad = q.bad[blankIdx];
      if (val == null) { D.label(x, y, '?', { bg: '#fff', color: '#7c3aed', border: '#7c3aed', size: PHONE ? 14 : 16 }); return; }
      D.label(x, y, String(val), { bg: bad ? '#dc2626' : ok ? '#15803d' : '#2563eb', size: PHONE ? 14 : 16 });
    } else D.label(x, y, String(v), { bg: o.bg || '#1f2d44', size: PHONE ? 14 : 16 });
  }
  function eBox(b, name, emoji, col) {
    panel(b.x, b.y, b.w, b.h, 16, '#fff');
    const gg = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0); gg.addColorStop(0, C.rgba(col, 0.3)); gg.addColorStop(1, C.rgba(col, 0.08));
    D.roundRect(b.x, b.y, b.w, b.h, 16); ctx.fillStyle = gg; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.stroke();
    E(emoji, b.x + (PHONE ? 22 : 28), b.y + b.h / 2 + 1, PHONE ? 26 : 34);
    T(b.x + b.w / 2 + (PHONE ? 15 : 16), b.y + b.h / 2 + 5, name, PHONE ? 13.5 : 16, '#1f2d44', 'center', 800);
  }
  function drawFlow(dt, t) {
    const q = S.flow, P = FB.P, C1 = FB.C1, C2 = FB.C2, Dd = FB.D;
    bgFill('#fff7ed', '#f1f9ec');
    // 제목 띠
    T(PHONE ? 240 : 400, PHONE ? 30 : 34, '생산자가 고정한 에너지를 1000이라 할 때 (상대 단위)', PHONE ? 14 : 17, '#9a3412', 'center', 800);
    // 햇빛 입력
    const sx = P.x + (PHONE ? 26 : 30), sy = PHONE ? 80 : 80;
    E('☀️', sx, sy, PHONE ? 34 : 42);
    eArrow(sx + 4, sy + (PHONE ? 22 : 28), P.x + P.w * 0.34, P.y - 3, EN_IN, { bend: 0 });
    numPill(sx - (PHONE ? 8 : 4), (sy + 28 + P.y) / 2 + 4, EN_IN, null, { bg: '#b45309' });
    // 상자
    eBox(P, '생산자', '🌿', '#22c55e'); eBox(C1, '1차 소비자', '🦗', '#84cc16'); eBox(C2, '2차 소비자', '🐸', '#8b5cf6'); eBox(Dd, '분해자 (세균·곰팡이)', '🍄', '#b4693a');
    // 열(호흡) 화살표: 위쪽
    const hy1 = P.y - (PHONE ? 62 : 74);
    const heat = [[P.x + P.w * 0.84, EN_PH, null], [C1.x + C1.w * 0.8, EN_C1H, null], [C2.x + C2.w * 0.8, EN_C2H, null]];
    heat.forEach((h) => { eArrow(h[0], P.y - 3, h[0], hy1 + 14, h[1], { heat: true }); numPill(h[0], hy1, h[1], null, { bg: '#dc2626' }); T(h[0], hy1 - 15, '🔥 열', PHONE ? 13 : 12.5, '#b91c1c', 'center', 800); });
    // 단계 사이
    const my = P.y + P.h / 2;
    eArrow(P.x + P.w + 2, my, C1.x - 4, my, EN_PC1); numPill((P.x + P.w + C1.x) / 2, my - (PHONE ? 20 : 24), EN_PC1);
    eArrow(C1.x + C1.w + 2, my, C2.x - 4, my, EN_C12); numPill((C1.x + C1.w + C2.x) / 2, my - (PHONE ? 20 : 24), EN_C12);
    // 분해자로
    const dy = Dd.y - 3;
    const dlist = [[P.x + P.w * 0.3, P.y + P.h + 3, Dd.x + Dd.w * 0.18, dy, 0], [C1.x + C1.w * 0.5, C1.y + C1.h + 3, C1.x + C1.w * 0.5, dy, 1], [C2.x + C2.w * 0.5, C2.y + C2.h + 3, Dd.x + Dd.w * 0.82, dy, 2]];
    dlist.forEach((d) => {
      const val = flowVal(d[4]), v = val == null ? null : val;
      eArrow(d[0], d[1], d[2], d[3], v);
      const mxp = (d[0] + d[2]) / 2, myp = (d[1] + d[3]) / 2;
      numPill(mxp, myp, 0, d[4]);
    });
    // 분해자 열
    const hx1 = Dd.x + Dd.w + 2, hy = Dd.y + Dd.h / 2;
    const dv = flowVal(3);
    eArrow(hx1, hy, hx1 + (PHONE ? 46 : 72), hy, dv, { heat: true });
    numPill(hx1 + (PHONE ? 30 : 46), hy - (PHONE ? 22 : 26), 0, 3);
    T(hx1 + (PHONE ? 30 : 46), hy + 24, '🔥 열', PHONE ? 13 : 12.5, '#b91c1c', 'center', 800);
    // 총합
    const ty = PHONE ? 570 : 532;
    const tv = flowVal(4);
    const allOk = flowRight() === 5;
    panel(PHONE ? 20 : 120, ty - 26, PHONE ? 440 : 560, 52, 16, allOk ? '#e2f6eb' : '#fff');
    if (allOk) T(PHONE ? 34 : 138, ty + 6, '✅ 열의 총합 = 입력 1000 → 에너지는 사라지지 않아요', PHONE ? 13 : 15, '#14532d', 'left', 800);
    else T(PHONE ? 34 : 138, ty + 6, '🔥 열의 총합 = 300 + 50 + 4 + ④', PHONE ? 13.5 : 15.5, '#7c2d12', 'left', 800);
    numPill(PHONE ? 420 : 640, ty, 0, 4);
    // 완성 표시
    parts.update(dt); parts.draw(ctx);
  }

  /* ③ 물질 순환 vs 에너지 흐름 비교표 */
  const CMP_ROWS = [
    { h: '이동 방향', o: ['순환해요 (돌고 돌아요)', '한 방향으로 흘러요'] },
    { h: '다시 쓸 수 있나요?', o: ['다시 쓸 수 있어요', '열이 되어 다시 못 써요'] },
    { h: '밖에서 계속 넣어 줘야 하나요?', o: ['새로 넣지 않아도 돼요', '빛에너지가 계속 들어와야 해요'] },
  ];
  const CMP_ANS = [[0, 1], [0, 1], [0, 1]];
  function resetCmp() { S.cmp = { v: [[null, null], [null, null], [null, null]], bad: {}, pop: [[1, 1], [1, 1], [1, 1]], shakeT: -9 }; }
  const cmpFilled = () => S.cmp.v.reduce((n, r) => n + r.filter((x) => x != null).length, 0);
  const cmpRight = () => S.cmp.v.reduce((n, r, i) => n + r.filter((x, j) => x === CMP_ANS[i][j]).length, 0);
  const CT = PHONE ? { x: 10, y: 120, hw: 92, cw: 182, rh: 132, gap: 6 } : { x: 30, y: 128, hw: 150, cw: 280, rh: 108, gap: 10 };
  const cmpCell = (i, j) => ({ x: CT.x + CT.hw + CT.gap + j * (CT.cw + CT.gap), y: CT.y + i * (CT.rh + CT.gap), w: CT.cw, h: CT.rh });
  function drawCmp(dt, t) {
    const q = S.cmp;
    bgFill('#eef7ff', '#f1f9ec');
    // 머리글
    const hx = [cmpCell(0, 0), cmpCell(0, 1)];
    [['🔄 물질(탄소)', '#0e7490', hx[0]], ['⚡ 에너지', '#ea580c', hx[1]]].forEach((h) => {
      D.roundRect(h[2].x, CT.y - 58, h[2].w, 46, 14); ctx.fillStyle = h[1]; ctx.fill();
      T(h[2].x + h[2].w / 2, CT.y - 28, h[0], PHONE ? 15 : 18, '#fff', 'center', 800);
    });
    // 작은 그림: 순환 고리, 한 방향 + 열
    for (let i = 0; i < 3; i++) {
      const y = CT.y + i * (CT.rh + CT.gap);
      panel(CT.x, y, CT.hw, CT.rh, 14, '#fff');
      const ls = wrap(CMP_ROWS[i].h, CT.hw - 18, PHONE ? 13 : 15, 800);
      const y0 = y + CT.rh / 2 - (ls.length - 1) * (PHONE ? 9 : 10) + 5;
      ls.forEach((l, k) => T(CT.x + CT.hw / 2, y0 + k * (PHONE ? 18 : 21), l, PHONE ? 13 : 15, '#26324a', 'center', 800));
      for (let j = 0; j < 2; j++) {
        const c = cmpCell(i, j), val = q.v[i][j], bad = q.bad[i + '_' + j], pop = clamp(q.pop[i][j], 0, 1.1);
        const sk = bad ? Math.sin(t * 40) * 2.5 * Math.max(0, 1 - (t - q.shakeT) * 2.2) : 0;
        ctx.save(); ctx.translate(c.x + c.w / 2 + sk, c.y + c.h / 2); ctx.scale(0.94 + 0.06 * pop, 0.94 + 0.06 * pop); ctx.translate(-c.w / 2, -c.h / 2);
        const colr = j === 0 ? '#0e7490' : '#ea580c';
        panel(0, 0, c.w, c.h, 14, val == null ? '#ffffff' : (j === 0 ? '#e0f7fa' : '#fff1e6'));
        D.roundRect(0, 0, c.w, c.h, 14); ctx.lineWidth = bad ? 3.5 : 2.5; ctx.strokeStyle = bad ? '#dc2626' : val == null ? '#b8c4d4' : colr; ctx.setLineDash(val == null ? [7, 5] : []); ctx.stroke(); ctx.setLineDash([]);
        if (val == null) { T(c.w / 2, c.h / 2 - 2, '👆 눌러서 고르기', PHONE ? 13 : 15, '#8ea0b6', 'center', 800); T(c.w / 2, c.h / 2 + 20, '(보기 2개)', 13, '#a8b4c4', 'center', 700); }
        else {
          const tx = CMP_ROWS[i].o[val], l2 = wrap(tx, c.w - 30, PHONE ? 14 : 17, 800);
          l2.forEach((l, k) => T(c.w / 2, c.h / 2 - (l2.length - 1) * (PHONE ? 10 : 12) + k * (PHONE ? 20 : 24) + 5, l, PHONE ? 14 : 17, '#1f2d44', 'center', 800));
        }
        ctx.restore();
      }
    }
    // 완성 후 그림
    const yb = CT.y + 3 * (CT.rh + CT.gap) + 6;
    if (cmpRight() === 6) {
      const c0 = cmpCell(0, 0), c1 = cmpCell(0, 1), cy = yb + (PHONE ? 40 : 36);
      // 순환 고리
      ctx.save(); ctx.strokeStyle = CM; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(c0.x + c0.w / 2, cy, 24, -2.4 + t * 1.5, 2.6 + t * 1.5); ctx.stroke(); ctx.restore();
      T(c0.x + c0.w / 2 + 46, cy + 5, '순환', 15, CM, 'left', 800);
      eArrow(c1.x + c1.w / 2 - 70, cy, c1.x + c1.w / 2 + 20, cy, 400);
      T(c1.x + c1.w / 2 + 28, cy + 5, '🔥', 20, '#dc2626', 'left', 800);
    } else T(PHONE ? 240 : 400, yb + 24, '채운 칸 ' + cmpFilled() + ' / 6', PHONE ? 13.5 : 15, '#475569', 'center', 800);
    parts.update(dt); parts.draw(ctx);
  }
  function cmpDown(p) {
    const q = S.cmp;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const c = cmpCell(i, j);
      if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) {
        q.v[i][j] = q.v[i][j] == null ? 0 : (q.v[i][j] === 0 ? 1 : null);
        delete q.bad[i + '_' + j]; q.pop[i][j] = 0.2; SciSim.tween(q.pop[i], { [j]: 1 }, { duration: 0.35, ease: 'outBack' }); Sound.click(); return false;
      }
    }
    return false;
  }

  /* =========================================================
     ④ 평형과 중요성: 교란 연쇄, 교란 크기
     ========================================================= */
  const BN = {
    abio: { n: '비생물 환경', e: '☀️', c: '#0ea5e9', p: L([130, 150], [80, 112]) },
    alien: { n: '외래종', e: '🐐', c: '#ef4444', p: L([530, 150], [400, 112]) },
    prod: { n: '생산자', e: '🌿', c: '#22c55e', p: L([130, 292], [80, 244]) },
    c1: { n: '1차 소비자', e: '🦗', c: '#84cc16', p: L([330, 292], [240, 244]) },
    c2: { n: '2차 소비자', e: '🐸', c: '#8b5cf6', p: L([530, 292], [400, 244]) },
    soil: { n: '토양 양분', e: '🌰', c: '#a16207', p: L([130, 440], [80, 392]) },
    dec: { n: '분해자', e: '🍄', c: '#b4693a', p: L([330, 440], [240, 392]) },
    litter: { n: '사체·낙엽', e: '🍂', c: '#c08a4a', p: L([530, 440], [400, 392]) },
  };
  const BR = PHONE ? 25 : 30;
  // 시나리오: 원인과 선택지 (각 선택지는 [노드, 변화(+1 늘어남, -1 줄어듦, 0 달라짐)]의 연쇄)
  const SCEN = [
    { n: '분해자 감소', ic: '🍄', cause: 'dec', ans: 0, opts: [
      { t: '분해자↓ → 낙엽↑ → 양분↓ → 생산자↓ → 1차↓', ch: [['dec', -1], ['litter', 1], ['soil', -1], ['prod', -1], ['c1', -1]] },
      { t: '분해자↓ → 토양 양분↑ → 생산자↑', ch: [['dec', -1], ['soil', 1], ['prod', 1]] },
      { t: '분해자↓ → 2차 소비자↑ → 1차 소비자↓', ch: [['dec', -1], ['c2', 1], ['c1', -1]] },
    ], why: '분해자가 줄면 사체·낙엽이 쌓이고, 토양 양분이 줄어 생산자가 자라지 못해요. 먹이를 얻기 어려워진 소비자도 줄어요.' },
    { n: '가뭄(생산자 감소)', ic: '☀️', cause: 'prod', ans: 1, opts: [
      { t: '생산자↑ → 1차↑ → 2차↑', ch: [['prod', 1], ['c1', 1], ['c2', 1]] },
      { t: '생산자↓ → 1차↓ → 2차↓', ch: [['prod', -1], ['c1', -1], ['c2', -1]] },
      { t: '생산자↓ → 1차↑ → 2차↑', ch: [['prod', -1], ['c1', 1], ['c2', 1]] },
    ], why: '생산자가 줄면 1차 소비자의 먹이가 줄고, 그다음 2차 소비자도 줄어요. 에너지가 먹이 사슬을 따라 전해지기 때문이에요.' },
    { n: '포식자(2차 소비자) 제거', ic: '🐸', cause: 'c2', ans: 2, opts: [
      { t: '2차↓ → 1차↓ → 생산자↑', ch: [['c2', -1], ['c1', -1], ['prod', 1]] },
      { t: '2차↓ → 생산자↑ → 1차↓', ch: [['c2', -1], ['prod', 1], ['c1', -1]] },
      { t: '2차↓ → 1차↑ → 생산자↓', ch: [['c2', -1], ['c1', 1], ['prod', -1]] },
    ], why: '잡아먹는 포식자가 없어지면 1차 소비자가 늘고, 늘어난 1차 소비자가 생산자를 많이 먹어 생산자가 줄어요.' },
    { n: '외래종 도입', ic: '🐐', cause: 'alien', ans: 1, opts: [
      { t: '외래종↑ → 생산자↑ → 1차↑', ch: [['alien', 1], ['prod', 1], ['c1', 1]] },
      { t: '외래종↑ → 토종 생산자↓ → 1차↓ → 2차↓', ch: [['alien', 1], ['prod', -1], ['c1', -1], ['c2', -1]] },
      { t: '외래종↑ → 분해자↑ → 양분↑', ch: [['alien', 1], ['dec', 1], ['soil', 1]] },
    ], why: '천적이 없는 외래종이 토종 생산자의 자리를 빼앗으면 토종 생산자가 줄고, 이를 먹는 소비자도 차례로 줄어요.' },
    { n: '대기 CO₂ 증가', ic: '🏭', cause: 'abio', ans: 2, opts: [
      { t: 'CO₂↑ → 2차 소비자↑ (에너지가 늘어요)', ch: [['abio', 1], ['c2', 1]] },
      { t: 'CO₂↑ → 분해자↓ → 낙엽↑', ch: [['abio', 1], ['dec', -1], ['litter', 1]] },
      { t: 'CO₂↑ → 기온·강수 변화 → 생물 서식 환경 달라짐', ch: [['abio', 1], ['prod', 0], ['c1', 0], ['c2', 0]] },
    ], why: '이산화 탄소는 물질이지 에너지가 아니에요. 늘어나면 온실 효과로 기온과 강수가 달라져 생물의 서식 환경이 바뀌고 평형이 흔들려요.' },
  ];
  function resetBal() { S.bal = { pick: SCEN.map(() => null), act: 0, k: 1, bad: {}, shakeT: -9, solved: false }; if (balSel.length) balSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }
  const balPicked = () => S.bal.pick.filter((v) => v != null).length;
  const balRight = () => S.bal.pick.filter((v, i) => v === SCEN[i].ans).length;
  const balSel = [];
  function buildBalRows() {
    const box = $('#chainRows'); box.innerHTML = '';
    SCEN.forEach((sc, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + sc.ic + ' ' + (i + 1) + '. ' + sc.n + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', sc.n + ' 영향 연쇄');
      sel.innerHTML = '<option value="">— 연쇄 고르기 —</option>' + sc.opts.map((o, k) => '<option value="' + k + '">' + o.t + '</option>').join('');
      const act = () => { S.bal.act = i; S.bal.k = 0; SciSim.tween(S.bal, { k: 1 }, { duration: 0.9, ease: 'outCubic' }); };
      sel.addEventListener('change', () => { S.bal.pick[i] = sel.value === '' ? null : +sel.value; delete S.bal.bad[i]; sel.classList.remove('ok', 'bad'); Sound.click(); act(); });
      sel.addEventListener('focus', () => { if (S.bal.act !== i) act(); });
      row.appendChild(sel); box.appendChild(row); balSel.push(sel);
    });
  }
  const bnPos = (id) => BN[id].p;
  function drawBalNode(id, st, o) {
    o = o || {};
    const d = BN[id], p = d.p, r = BR * (o.scale || 1);
    ctx.save(); ctx.globalAlpha = o.dim ? 0.42 : 1;
    D.sphere(p[0], p[1], r, d.c, { shadow: !o.dim });
    E(d.e, p[0], p[1] + 1, r * 1.0);
    ctx.restore();
    D.label(p[0], p[1] + r + (PHONE ? 13 : 15), d.n, { bg: o.dim ? 'rgba(31,45,68,.4)' : 'rgba(31,45,68,.9)', size: PHONE ? 13 : 12.5 });
    if (st != null) {
      const bx_ = p[0] + r * 0.8, by_ = p[1] - r * 0.8, col = st > 0 ? '#2563eb' : st < 0 ? '#dc2626' : '#d97706';
      D.sphere(bx_, by_, PHONE ? 11 : 13, col, { gloss: false, outline: '#fff', outlineWidth: 2 });
      T(bx_, by_ + 5.5, st > 0 ? '↑' : st < 0 ? '↓' : '~', PHONE ? 15 : 17, '#fff', 'center', 800);
    }
  }
  function drawChain(dt, t) {
    const q = S.bal, sc = SCEN[q.act], pk = q.pick[q.act];
    bgFill('#eef7ff', '#f1f9ec');
    const ids = Object.keys(BN);
    // 연결 점선(먹이·물질 관계 배경)
    const base = [['prod', 'c1'], ['c1', 'c2'], ['prod', 'litter'], ['c1', 'litter'], ['c2', 'litter'], ['litter', 'dec'], ['dec', 'soil'], ['soil', 'prod']];
    base.forEach((b) => { const A = bnPos(b[0]), B = bnPos(b[1]); ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.3)'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.restore(); });
    const chain = pk != null ? sc.opts[pk].ch : [[sc.cause, 0]];
    const inChain = {}; chain.forEach((c, i) => { inChain[c[0]] = { st: pk != null ? c[1] : null, i }; });
    // 고른 연쇄 화살표
    if (pk != null) {
      const n = chain.length - 1, prog = q.k * n;
      for (let i = 0; i < n; i++) {
        const f = clamp(prog - i, 0, 1); if (f <= 0) continue;
        const A = bnPos(chain[i][0]), B = bnPos(chain[i + 1][0]), dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
        const pts = qPts(A[0] + ux * (BR + 6), A[1] + uy * (BR + 6), B[0] - ux * (BR + 12), B[1] - uy * (BR + 12), 14, 16);
        strokeCurve(pts, f, '#7c3aed', 5, { head: 14 });
        if (f >= 1 && !RM) { const k = (t * 0.5 + i * 0.3) % 1, pp = ptAt(pts, k); D.sphere(pp[0], pp[1], 4, '#c4b5fd', { gloss: false }); }
      }
    }
    ids.forEach((id) => {
      const c = inChain[id];
      if (c && (pk == null || q.k * (chain.length - 1) >= c.i - 0.05 || c.i === 0)) drawBalNode(id, c.st, {});
      else drawBalNode(id, null, { dim: true });
    });
    // 원인 표시
    const cp = bnPos(sc.cause);
    D.ring(cp[0], cp[1], BR + 10, t, { color: '#dc2626', width: 3 });
    D.label(cp[0], cp[1] - BR - (PHONE ? 22 : 24), '원인: ' + sc.n, { bg: '#dc2626', size: PHONE ? 13 : 13 });
    // 설명 카드
    const cx = PHONE ? 8 : 600, cy = PHONE ? 452 : 20, cw = PHONE ? 464 : 192, chh = PHONE ? 180 : 520;
    panel(cx, cy, cw, chh, 16, '#fff');
    if (PHONE) {
      T(cx + 12, cy + 24, '🧬 생태계 = 하나의 살아 있는 유기체', 13.5, '#26324a', 'left', 800);
      [['🌿 생산자', '양분 만들기'], ['🍄 분해자', '재활용'], ['☀️ 비생물', '환경 조건']].forEach((r, i) => {
        const x = cx + 12 + i * 150; D.roundRect(x, cy + 36, 142, 56, 12); ctx.fillStyle = '#f1f5f9'; ctx.fill();
        T(x + 71, cy + 58, r[0], 13, '#1f2d44', 'center', 800); T(x + 71, cy + 80, '= ' + r[1], 13, '#15803d', 'center', 800);
      });
      textBlock(cx + 12, cy + 114, cw - 24, q.pick[q.act] != null ? SCEN[q.act].opts[q.pick[q.act]].t : (q.act + 1) + '. ' + sc.n + ': 아래에서 영향이 이어지는 길을 골라요.', 13, '#34445c', 18, 700);
    } else {
      T(cx + 14, cy + 28, '🧬 생태계 = 유기체', 15.5, '#26324a', 'left', 800);
      [['🌿 생산자', '양분 만들기', '#22c55e'], ['🍄 분해자', '재활용', '#b4693a'], ['☀️ 비생물', '환경 조건', '#0ea5e9']].forEach((r, i) => {
        const y = cy + 46 + i * 70; D.roundRect(cx + 12, y, cw - 24, 60, 12); ctx.fillStyle = '#f1f5f9'; ctx.fill();
        D.roundRect(cx + 12, y, 6, 60, 3); ctx.fillStyle = r[2]; ctx.fill();
        T(cx + 28, y + 24, r[0], 14.5, '#1f2d44', 'left', 800); T(cx + 28, y + 46, '↔ ' + r[1], 14.5, '#15803d', 'left', 800);
      });
      T(cx + 14, cy + 276, '🌱 생태계가 주는 혜택', 14.5, '#26324a', 'left', 800);
      ['🌬️ 맑은 공기', '💧 물 정화', '🌾 비옥한 토양', '🍚 식량'].forEach((b, i) => T(cx + 18, cy + 304 + i * 26, b, 14, '#34445c', 'left', 800));
      textBlock(cx + 14, cy + 424, cw - 28, '구성 요소 하나가 흔들리면 연쇄적으로 다른 요소에 영향을 줘요.', 13, '#64748b', 18, 700);
    }
    if (!PHONE) {
      const lines = pk != null ? wrap(sc.opts[pk].t, 560, 14, 800) : [];
      T(20, 34, (q.act + 1) + '. ' + sc.n, 18, '#26324a', 'left', 800);
      if (pk == null) T(20, 58, '오른쪽 아래에서 영향이 이어지는 길을 고르면 여기에 그려져요.', 13.5, '#64748b', 'left', 700);
      else lines.forEach((l, i) => T(20, 58 + i * 18, '고른 연쇄: ' + l, 14, '#6d28d9', 'left', 800));
    } else {
      T(12, 30, (q.act + 1) + '. ' + sc.n, 17, '#26324a', 'left', 800);
    }
    if (q.solved) D.label(PHONE ? 240 : 300, PHONE ? 430 : 530, '✅ 5가지 연쇄를 모두 이해했어요', { bg: '#15803d', size: PHONE ? 13 : 14 });
    parts.update(dt); parts.draw(ctx);
  }

  /* ④ 교란의 크기 (생태계 건강 지표 100 = 평형) */
  const D_YEARS = 40, D_EVENT = 5, TH_REC = 60, TH_COL = 30, EQ_NEW = 55, EQ_COL = 10, D_K = 0.35;
  function distOutcome(size) { const x0 = 100 - size; return x0 >= TH_REC ? 'rec' : x0 >= TH_COL ? 'new' : 'col'; }
  const D_OUT = { rec: { n: '회복', c: '#15803d', f: 100 }, new: { n: '새 평형(낮은 수준)', c: '#d97706', f: EQ_NEW }, col: { n: '붕괴', c: '#b91c1c', f: EQ_COL } };
  function distVal(size, yr) {
    if (yr < D_EVENT) return 100;
    const x0 = 100 - size, tgt = D_OUT[distOutcome(size)].f;
    return tgt + (x0 - tgt) * Math.exp(-D_K * (yr - D_EVENT));
  }
  function resetDist() { S.dist = { size: 20, run: false, p: 0, cur: null, runs: [], seen: {}, disp: 100 }; }
  function distRun() {
    const q = S.dist; if (q.run) return;
    q.run = true; q.p = 0; q.cur = q.size; Sound.click(); updateCtl();
  }
  function stepDist(dt) {
    const q = S.dist;
    if (q.run) {
      q.p = Math.min(D_YEARS, q.p + dt * 5);
      if (q.p >= D_YEARS) {
        q.run = false; const o = distOutcome(q.cur); q.seen[o] = true; q.runs.push({ size: q.cur, o }); if (q.runs.length > 4) q.runs.shift();
        Sound.success(); updateCtl(); showHint('교란 ' + q.cur + ' → ' + D_OUT[o].n + (o === 'rec' ? ': 되먹임으로 평형을 되찾았어요.' : o === 'new' ? ': 평형을 되찾지 못하고 더 낮은 수준에서 안정됐어요.' : ': 평형이 무너졌어요.'), 5200);
      }
    }
    const tgt = q.cur == null ? 100 : distVal(q.cur, q.p);
    q.disp = SciSim.approach(q.disp, tgt, dt, 14);
  }
  const DP = PHONE ? { x: 6, y: 6, w: 468, h: 628 } : { x: 10, y: 10, w: 780, h: 540 };
  const DL = PHONE ? { x: DP.x + 54, y: DP.y + 176, w: DP.w - 76, h: 330 } : { x: DP.x + 64, y: DP.y + 168, w: DP.w - 100, h: 300 };
  const dx_ = (yr) => DL.x + yr / D_YEARS * DL.w, dy_ = (v) => DL.y + DL.h - clamp(v / 100, 0, 1) * DL.h;
  function drawLand(x, y, w, h, health, t) {
    ctx.save(); D.roundRect(x, y, w, h, 14); ctx.clip();
    const sat = clamp(health / 100, 0, 1);
    D.sky(x, y, w, h, C.mix('#d6d3d1', '#bfe3ff', sat), C.mix('#e7e5e4', '#f1fbff', sat));
    const hg = C.mix('#a8a29e', '#4caf50', sat), hg2 = C.mix('#8d8680', '#2e8b3e', sat);
    ctx.fillStyle = hg2; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.quadraticCurveTo(x + w * 0.25, y + h * 0.35, x + w * 0.5, y + h * 0.6); ctx.quadraticCurveTo(x + w * 0.8, y + h * 0.3, x + w, y + h * 0.55); ctx.lineTo(x + w, y + h); ctx.fill();
    ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.55, x + w * 0.6, y + h * 0.78); ctx.quadraticCurveTo(x + w * 0.85, y + h * 0.6, x + w, y + h * 0.78); ctx.lineTo(x + w, y + h); ctx.fill();
    const nT = Math.round(2 + sat * (PHONE ? 6 : 10));
    for (let i = 0; i < nT; i++) { const tx = x + 30 + (i + 0.5) * (w - 60) / nT, ty = y + h * (0.68 + 0.1 * Math.sin(i * 2.1)); const sw = RM ? 0 : Math.sin(t * 1.2 + i) * 2; E('🌳', tx + sw, ty, (PHONE ? 22 : 28) * (0.7 + 0.5 * sat), { alpha: 0.35 + 0.65 * sat }); }
    ctx.restore();
  }
  function drawDist(dt, t) {
    const q = S.dist, P = DP;
    ctx.fillStyle = '#eef7f0'; ctx.fillRect(0, 0, VW, VH);
    panel(P.x, P.y, P.w, P.h, 18);
    drawLand(P.x + 12, P.y + 12, P.w - 24, PHONE ? 104 : 96, q.disp, t);
    D.label(P.x + P.w - 96, P.y + 34, '건강 지표 ' + Math.round(q.disp), { bg: q.disp >= TH_REC ? '#15803d' : q.disp >= TH_COL ? '#d97706' : '#b91c1c', size: PHONE ? 13 : 14.5 });
    T(DL.x, DL.y - 24, '🌍 생태계 건강 지표 (100 = 평형, 예시)', PHONE ? 13.5 : 15.5, '#26324a', 'left', 800);
    // 구간 색
    const y60 = dy_(TH_REC), y30 = dy_(TH_COL);
    ctx.fillStyle = 'rgba(34,197,94,.10)'; ctx.fillRect(DL.x, DL.y, DL.w, y60 - DL.y);
    ctx.fillStyle = 'rgba(245,158,11,.14)'; ctx.fillRect(DL.x, y60, DL.w, y30 - y60);
    ctx.fillStyle = 'rgba(239,68,68,.13)'; ctx.fillRect(DL.x, y30, DL.w, DL.y + DL.h - y30);
    ctx.strokeStyle = '#e3eaf3'; ctx.lineWidth = 1;
    for (let v = 0; v <= 100; v += 20) { const yy = dy_(v); ctx.beginPath(); ctx.moveTo(DL.x, yy); ctx.lineTo(DL.x + DL.w, yy); ctx.stroke(); T(DL.x - 7, yy + 4.5, String(v), 13, '#5d6879', 'right', 700); }
    for (let yr = 0; yr <= D_YEARS; yr += 10) { const xx = dx_(yr); ctx.beginPath(); ctx.moveTo(xx, DL.y); ctx.lineTo(xx, DL.y + DL.h); ctx.stroke(); T(xx, DL.y + DL.h + 18, String(yr), 13, '#5d6879', 'center', 700); }
    ctx.strokeStyle = '#8795a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(DL.x, DL.y); ctx.lineTo(DL.x, DL.y + DL.h); ctx.lineTo(DL.x + DL.w, DL.y + DL.h); ctx.stroke();
    T(DL.x + DL.w / 2, DL.y + DL.h + 40, '시간 (년)', 13, '#34445c', 'center', 800);
    // 한계선
    ctx.save(); ctx.setLineDash([7, 5]); ctx.lineWidth = 2;
    ctx.strokeStyle = '#15803d'; ctx.beginPath(); ctx.moveTo(DL.x, y60); ctx.lineTo(DL.x + DL.w, y60); ctx.stroke();
    ctx.strokeStyle = '#b91c1c'; ctx.beginPath(); ctx.moveTo(DL.x, y30); ctx.lineTo(DL.x + DL.w, y30); ctx.stroke();
    ctx.strokeStyle = '#7c3aed'; ctx.beginPath(); ctx.moveTo(dx_(D_EVENT), DL.y); ctx.lineTo(dx_(D_EVENT), DL.y + DL.h); ctx.stroke(); ctx.restore();
    T(DL.x + DL.w - 4, y60 - 5, '회복 한계 ' + TH_REC, 13, '#15803d', 'right', 800); T(DL.x + DL.w - 4, y30 - 5, '붕괴 한계 ' + TH_COL, 13, '#b91c1c', 'right', 800);
    D.label(dx_(D_EVENT), DL.y + 12, D_EVENT + '년: 교란', { bg: '#7c3aed', size: PHONE ? 13 : 12.5 });
    const curve = (size, prog, col, w, alpha) => {
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha = alpha; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
      let first = true;
      for (let yr = 0; yr <= prog + 1e-6; yr += 0.25) { const xx = dx_(yr), yy = dy_(distVal(size, yr)); if (first) { ctx.moveTo(xx, yy); first = false; } else ctx.lineTo(xx, yy); }
      const yr = Math.min(prog, D_YEARS); ctx.lineTo(dx_(yr), dy_(distVal(size, yr)));
      ctx.stroke(); ctx.restore();
    };
    q.runs.forEach((r) => { if (!(q.run && r === null)) curve(r.size, D_YEARS, D_OUT[r.o].c, 2.5, 0.28); });
    if (q.run || q.cur != null) {
      const o = distOutcome(q.cur), col = D_OUT[o].c, prog = q.run ? q.p : D_YEARS;
      curve(q.cur, prog, col, 4.5, 1);
      D.sphere(dx_(prog), dy_(distVal(q.cur, prog)), 6.5, col, { gloss: false, outline: '#fff', outlineWidth: 2 });
      if (!q.run) D.label(DL.x + DL.w * 0.52, DL.y + DL.h * 0.5, '교란 ' + q.cur + ' → ' + D_OUT[o].n, { bg: col, size: PHONE ? 14 : 17 });
    } else T(DL.x + DL.w / 2, DL.y + DL.h * 0.45, '교란의 크기를 고르고 ▶ 교란 적용을 눌러요', PHONE ? 14 : 17, '#8ea0b6', 'center', 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     화면 전환 · 조작 연결 · 읽음 칸
     ========================================================= */
  const MODE_LABEL = { link: '🔗 초원 생태계: 물질 이동과 에너지 이동', remove: '🍄 분해자를 빼면 어떻게 될까?', cyc: '🔄 탄소 순환 고리', burn: '📈 화석 연료와 대기 탄소', flow: '⚡ 에너지 흐름 도표', cmp: '🆚 물질 순환 vs 에너지 흐름', chain: '🌪️ 교란이 이어지는 길', dist: '📉 교란의 크기와 평형' };
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); hideHint(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    const curLv = game ? game.level + 1 : 1, showAll = !!(game && game.free);
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.classList.toggle('lv-off', !showAll && +b.dataset.lv !== curLv && b.dataset.mode !== S.mode); });
    if (S.link) {
      $$('#ltype button').forEach((b) => b.classList.toggle('on', b.dataset.t === S.link.type));
      $('#linkNote').innerHTML = '연결한 화살표: 물질 이동 <b>' + linkCount('m') + ' / ' + REQ_M.length + '</b>, 에너지 이동 <b>' + linkCount('e') + ' / ' + REQ_E.length + '</b>';
    }
    if (S.rem) {
      $$('#decSeg button').forEach((b) => { b.classList.toggle('on', (b.dataset.d === '1') === S.rem.dec); b.disabled = !!S.rem.run; });
      $('#bRemRun').disabled = !!S.rem.run; $('#bRemRun').textContent = S.rem.run ? '⏳ 실험 중…' : '▶ ' + REM_WEEKS + '주 실험';
    }
    if (S.carb) { $('#cycNote').innerHTML = '이름표를 붙인 화살표 <b>' + carbDone() + ' / ' + CARB_N + '</b>' + (S.carb.solved ? ' · 모두 맞았어요!' : ''); $('#bCycClear').disabled = !!S.carb.solved; }
    if (S.burn) {
      $$('#burnSeg button').forEach((b) => { b.classList.toggle('on', (b.dataset.b === '1') === S.burn.on); b.disabled = !!S.burn.run; });
      $('#bBurnRun').disabled = !!S.burn.run; $('#bBurnRun').textContent = S.burn.run ? '⏳ 계산 중…' : '▶ ' + BURN_YEARS + '년';
    }
    if (S.dist) {
      $('#sDist').value = S.dist.size; $('#oDist').textContent = String(S.dist.size); $('#sDist').style.setProperty('--pct', ((S.dist.size - 5) / 85 * 100) + '%');
      $('#bDistRun').disabled = !!S.dist.run; $('#bDistRun').textContent = S.dist.run ? '⏳ 지켜보는 중…' : '▶ 교란 적용';
      $('#distNote').innerHTML = '교란 <b>' + S.dist.size + '</b>이면 건강 지표가 100에서 <b>' + (100 - S.dist.size) + '</b>으로 떨어져요. 회복 한계 ' + TH_REC + ', 붕괴 한계 ' + TH_COL + '.';
    }
    if (S.cmp) $('#bCmpClear').disabled = false;
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $$('#ltype button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.link.type = b.dataset.t; S.link.sel = null; updateCtl(); }));
  $('#bUndo').addEventListener('click', () => { Sound.click(); S.link.list.pop(); S.link.sel = null; updateCtl(); });
  $('#bClear').addEventListener('click', () => { Sound.click(); S.link.list.length = 0; S.link.sel = null; hideHint(); updateCtl(); });
  $$('#decSeg button').forEach((b) => b.addEventListener('click', () => { if (S.rem.run) return; Sound.click(); S.rem.dec = b.dataset.d === '1'; remReset(); }));
  $('#bRemRun').addEventListener('click', remRun);
  $('#bRemReset').addEventListener('click', () => { Sound.click(); S.rem.run = false; remReset(); hideHint(); });
  $('#bCycClear').addEventListener('click', () => { if (S.carb.solved) return; Sound.click(); S.carb.lab = ARR.map(() => null); S.carb.bad = {}; updateCtl(); });
  $$('#burnSeg button').forEach((b) => b.addEventListener('click', () => { if (S.burn.run) return; Sound.click(); S.burn.on = b.dataset.b === '1'; updateCtl(); }));
  $('#bBurnRun').addEventListener('click', burnRun);
  $('#bBurnReset').addEventListener('click', () => { if (S.burn.run) return; Sound.click(); const on = S.burn.on, ran = S.burn.ran; resetBurn(); S.burn.on = on; S.burn.ran = { off: false, on: false }; S.burn.keep = ran; updateCtl(); });
  $('#bCmpClear').addEventListener('click', () => { Sound.click(); const p = S.cmp.pop; resetCmp(); S.cmp.pop = p; });
  $('#sDist').addEventListener('input', (e) => { if (S.dist.run) return; S.dist.size = +e.target.value; Sound.tick(); updateCtl(); });
  $('#bDistRun').addEventListener('click', distRun);
  $('#bDistReset').addEventListener('click', () => { if (S.dist.run) return; Sound.click(); const sz = S.dist.size, seen = S.dist.seen; resetDist(); S.dist.size = sz; S.dist.seen = seen; updateCtl(); });
  buildFlowInputs(); buildBalRows();

  SciSim.pointer(view, {
    down(p) { if (S.mode === 'link') return linkDown(p); if (S.mode === 'cyc') return cycDown(p); if (S.mode === 'cmp') return cmpDown(p); return false; },
    move(p) { if (S.mode === 'link') linkMove(p); },
    up(p) { if (S.mode === 'link') linkUp(p); },
    hover(p) {
      if (S.mode === 'link') return nodeAt(p) ? 'pointer' : 'default';
      if (S.mode === 'cyc') return arrHit(p) >= 0 ? 'pointer' : 'default';
      if (S.mode === 'cmp') return 'pointer';
      return 'default';
    },
  });

  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'link') { L1 = '물질 이동'; a = linkCount('m') + ' / ' + REQ_M.length; L2 = '에너지 이동'; b = linkCount('e') + ' / ' + REQ_E.length; L3 = '알맞지 않은 시도'; c = S.link.tries + '번'; }
    else if (m === 'remove') { const q = S.rem; L1 = '분해자'; a = q.dec ? '있음' : '없음'; L2 = '시간'; b = Math.floor(q.w) + ' / ' + REM_WEEKS + '주'; L3 = '토양 양분 · 생산자'; c = Math.round(q.disp.soil) + ' · ' + Math.round(q.disp.prod); }
    else if (m === 'cyc') { L1 = '이름표'; a = carbDone() + ' / ' + CARB_N; L2 = '연간 흡수(광합성)'; b = S.carb.solved ? '120' : '—'; L3 = '연간 방출(호흡·분해)'; c = S.carb.solved ? '50 + 10 + 60 = 120' : '—'; }
    else if (m === 'burn') { const q = S.burn; L1 = '연소'; a = q.on ? '켜짐 (연 ' + BURN_RATE + ')' : '꺼짐'; L2 = '대기 탄소'; b = String(Math.round(q.disp)); L3 = '50년 뒤 변화'; c = (q.ran.on || q.ran.off) ? (q.cur ? '+' + BURN_RATE * BURN_YEARS : '0') : '—'; }
    else if (m === 'flow') { L1 = '맞은 빈칸'; a = flowRight() + ' / 5'; L2 = '들어온 에너지'; b = String(EN_IN); L3 = '열로 나간 총합'; c = flowVal(4) == null ? '—' : String(flowVal(4)); }
    else if (m === 'cmp') { L1 = '채운 칸'; a = cmpFilled() + ' / 6'; L2 = '비교하는 것'; b = '물질 vs 에너지'; L3 = '비교 항목'; c = '방향 · 재사용 · 공급'; }
    else if (m === 'chain') { L1 = '고른 시나리오'; a = balPicked() + ' / ' + SCEN.length; L2 = '지금 보는 것'; b = SCEN[S.bal.act].n; L3 = '맞은 연쇄'; c = S.bal.solved ? SCEN.length + ' / ' + SCEN.length : '—'; }
    else { const q = S.dist; L1 = '교란의 크기'; a = String(q.size); L2 = '마지막 결과'; b = q.runs.length ? D_OUT[q.runs[q.runs.length - 1].o].n : '—'; L3 = '본 결과 종류'; c = Object.keys(q.seen).length + ' / 3'; }
    const keyS = [L1, a, L2, b, L3, c].join('|');
    if (keyS === rlast) return; rlast = keyS;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* 이미 학습을 마친 학습자가 자유 탐구로 돌아오면 완성된 그림을 보여 줘요 */
  function autoFill() {
    REQ_M.forEach((k) => { const [a, b] = k.split('>'); if (!linkHas(a, b, 'm')) S.link.list.push({ a, b, t: 'm', k: 1 }); });
    REQ_E.forEach((k) => { const [a, b] = k.split('>'); if (!linkHas(a, b, 'e')) S.link.list.push({ a, b, t: 'e', k: 1 }); });
    S.carb.lab = ARR.map((a) => a.ans); S.carb.bad = {}; S.carb.solved = true;
    S.flow.inp = EN_ANS.map(String); $$('#flowIn input').forEach((inp, i) => { inp.value = String(EN_ANS[i]); inp.classList.add('ok'); inp.classList.remove('bad'); });
    S.cmp.v = CMP_ANS.map((r) => r.slice());
    S.bal.pick = SCEN.map((s) => s.ans); balSel.forEach((s, i) => { s.value = String(SCEN[i].ans); s.classList.add('ok'); }); S.bal.solved = true;
    updateCtl();
  }

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '생태계 구조: 구성 요소와 연결', short: '생태계 구조', icon: '🌍', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 탄소는 계속 돌고 도는데, 에너지는 왜 계속 새로 들어와야 할까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 생태계의 구성 요소(생산자·소비자·분해자·비생물 환경)와 먹이 사슬을 배웠어요. 이번에는 구성 요소 사이로 <b>물질</b>이 어떻게 오가고 <b>에너지</b>가 어떻게 이동하는지 따져 봐요.</div>' +
        '<p>초원 생태계에서 <b>물질 이동(실선)</b>과 <b>에너지 이동(주황)</b>을 나누어 화살표로 잇고, <b>분해자</b>를 빼면 어떻게 되는지 실험해요.</p>',
      features: ['link', 'remove'],
      setup() { resetLink(); resetRem(); setMode('link'); },
      recap: '생산자는 빛으로 양분을 만들고, 소비자는 먹이로 물질과 에너지를 얻고, 분해자는 사체·배설물을 분해해 물질을 다시 생태계로 돌려보내요. 이 구성 요소들은 하나로 이어진 시스템이에요.',
      summary: '<ul><li><b>생태계 구성 요소</b>: 생산자(양분을 만들어요), 소비자(먹이를 먹어요), 분해자(사체·배설물을 분해해요), 비생물 환경(햇빛·공기·물·토양)</li><li><b>물질 이동</b>: 공기·토양 → 생산자 → 소비자 → 분해자 → 토양·공기 (실선)</li><li><b>에너지 이동</b>: 햇빛 → 생산자 → 소비자·분해자 (먹이를 따라 이동)</li><li>분해자가 없으면 사체·낙엽이 쌓이고 토양 양분이 줄어 생산자가 자라기 어려워져요.</li></ul>',
      missions: [
        {
          id: 'links', title: '물질 이동과 에너지 이동 연결', manual: true,
          goal: '<b>물질 이동 ' + REQ_M.length + '개</b>(실선)와 <b>에너지 이동 ' + REQ_E.length + '개</b>(주황)를 화살표로 이은 뒤 ✔ 확인하기를 누르세요.',
          hint: '물질: 공기·토양 → 생산자 → 소비자 → 분해자, 분해자 → 토양. 에너지: 햇빛 → 생산자 → 소비자 → 분해자. 위에서 연결 종류를 바꿔 가며 이어요.',
          setup() { setMode('link'); },
          check() {
            const m = linkCount('m'), e = linkCount('e');
            if (m < REQ_M.length || e < REQ_E.length) return '아직 이을 화살표가 남았어요. (물질 이동 ' + (REQ_M.length - m) + '개, 에너지 이동 ' + (REQ_E.length - e) + '개)';
            return true;
          },
          status: () => '물질 이동 ' + linkCount('m') + ' / ' + REQ_M.length + ' &nbsp; 에너지 이동 ' + linkCount('e') + ' / ' + REQ_E.length,
          explain: '<b>물질</b>은 공기·토양에서 생산자로 들어가 먹이 사슬을 따라 소비자로, 사체·배설물은 분해자로 가서 다시 토양과 공기로 돌아와요. <b>에너지</b>는 햇빛에서 생산자로 들어와 먹이를 따라 전해져요. 햇빛은 물질이 아니라 에너지이고, 분해자의 에너지는 호흡으로 열이 되어 빠져나가요.',
        },
        {
          id: 'nodec', title: '분해자 제거 실험',
          goal: '<b>🚫 분해자 없음</b>을 고르고 <b>▶ ' + REM_WEEKS + '주 실험</b>이 끝날 때까지 지켜보세요.',
          hint: '아래 연결 화면 말고 위쪽 🍄 분해자 화면에서 해요. 사체·낙엽 더미, 토양 양분, 생산자의 양이 어떻게 변하는지 보세요.',
          setup() { setMode('remove'); },
          check: () => S.rem.done.off,
          hold: 0.4,
          status: () => mark(S.rem.done.on) + ' 분해자 있음 실험(선택) &nbsp; ' + mark(S.rem.done.off) + ' 분해자 없음 실험',
          explain: '분해자가 없으면 사체·낙엽이 <b>20 → ' + Math.round(remVals(false, REM_WEEKS).litter) + '</b>로 쌓이고, 토양 양분은 <b>60 → ' + Math.round(remVals(false, REM_WEEKS).soil) + '</b>로 줄어요. 양분을 얻지 못한 생산자도 <b>100 → ' + Math.round(remVals(false, REM_WEEKS).prod) + '</b>로 줄어요. (상대 단위 예시)',
        },
        {
          type: 'quiz', title: '분해자의 역할',
          goal: '생태계에서 <b>분해자</b>의 역할로 가장 알맞은 것은?',
          setup() { setMode('remove'); },
          choices: ['먹이로 에너지를 얻어 새로운 에너지를 생태계에 들여온다', '사체와 배설물의 유기물을 분해해 물질이 다시 생산자에게 돌아가게 한다', '생산자를 잡아먹어 생산자의 수를 조절한다', '햇빛을 직접 받아 양분을 만든다'],
          answer: 1,
          feedback: ['생태계에 에너지를 들여오는 것은 빛을 이용하는 생산자예요. 분해자는 새 에너지를 들여오지 않아요.', '', '생산자를 먹는 것은 소비자예요.', '빛으로 양분을 만드는 것은 생산자예요.'],
          explain: '분해자는 사체·낙엽·배설물의 <b>유기물을 무기물로 분해</b>해 토양과 공기로 돌려보내요. 이 물질을 생산자가 다시 흡수하므로 물질이 순환할 수 있어요.',
        },
      ],
    },
    {
      title: '탄소 순환: 돌고 도는 물질', short: '탄소 순환', icon: '🔄', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 분해자가 물질을 토양과 공기로 돌려보내는 것을 봤어요. 이번에는 탄소가 생태계에서 어떤 길을 따라 도는지 따라가요.</div>' +
        '<p>탄소 저장고 5곳(대기·생산자·소비자·분해자와 토양·화석 연료) 사이의 화살표에 <b>과정 이름표</b>를 붙여 순환 고리를 완성하고, <b>화석 연료를 태우면</b> 대기 탄소가 어떻게 변하는지 알아봐요.</p>',
      features: ['cyc', 'burn'],
      setup() { resetCarb(); resetBurn(); setMode('cyc'); },
      recap: '탄소는 광합성, 먹이 섭취, 호흡, 분해를 거쳐 생태계 안에서 순환해요. 화석 연료의 연소는 오랫동안 묻혀 있던 탄소를 대기로 더해, 흡수와 방출의 균형을 깨뜨려요.',
      summary: '<ul><li><b>탄소 순환</b>: 대기 CO₂ → (광합성) 생산자 → (먹이 섭취) 소비자 → (분해) 분해자·토양, 모든 생물은 (호흡)으로 CO₂를 대기로 내보내요.</li><li>이 예시에서 한 해 <b>흡수 120 = 방출 120</b>(호흡 50 + 10 + 60)이라 대기 탄소는 일정해요.</li><li><b>화석 연료의 연소</b>는 해마다 약 9(상대 단위)를 더해 대기 탄소가 늘어나요.</li><li>물질은 순환하므로 같은 탄소 원자가 여러 번 다시 쓰여요.</li></ul>',
      missions: [
        {
          id: 'cyc', title: '탄소 순환 고리 완성', manual: true,
          goal: '화살표 ' + CARB_N + '개 모두에 알맞은 <b>과정 이름표</b>(광합성·호흡·먹이 섭취·분해·연소)를 붙인 뒤 ✔ 확인하기를 누르세요.',
          hint: '대기 → 생산자는 광합성, 생물이 대기로 CO₂를 내보내면 호흡이에요. 생산자 → 소비자는 먹이 섭취, 사체·낙엽·배설물이 분해자로 가면 분해, 화석 연료에서 대기로 가면 연소예요.',
          setup() { setMode('cyc'); },
          check() {
            const q = S.carb;
            if (carbDone() < CARB_N) return '아직 이름표가 없는 화살표가 ' + (CARB_N - carbDone()) + '개 있어요.';
            const bad = [];
            ARR.forEach((a, i) => { if (!carbOK(i)) { bad.push(i); if (!q.bad[i]) { q.bad[i] = true; q.shakeT = S.clock; } } else delete q.bad[i]; });
            if (bad.length) return '빨간 이름표 ' + bad.length + '개를 다시 생각해 보세요. 생산자·소비자·분해자가 모두 대기로 CO₂를 내보내는 과정은 같은 이름이에요.';
            return true;
          },
          status: () => '이름표 ' + carbDone() + ' / ' + CARB_N + ' &nbsp; 맞은 화살표 ' + ARR.filter((a, i) => carbOK(i)).length,
          explain: '<b>광합성</b>(대기 → 생산자), <b>호흡</b>(생산자·소비자·분해자 → 대기), <b>먹이 섭취</b>(생산자 → 소비자), <b>분해</b>(생산자·소비자의 낙엽·사체 → 분해자와 토양), <b>연소</b>(화석 연료 → 대기)예요. 한 해 흡수 120과 방출 50 + 10 + 60 = 120이 같아서 순환이 균형을 이뤄요.',
        },
        {
          id: 'burn', title: '화석 연료 연소 후 대기 탄소',
          goal: '<b>📈 대기 탄소</b> 화면에서 연소를 <b>끈 채</b>로 한 번, <b>켠 채</b>로 한 번 ▶ 50년을 실행해 두 그래프를 비교하세요.',
          hint: '연소 끄기/켜기를 고른 뒤 ▶ 50년을 눌러요. 두 번 모두 끝까지 그려져야 해요. 두 번째 그래프가 첫 번째와 어떻게 다른지 보세요.',
          setup() { setMode('burn'); },
          check: () => S.burn.ran.off && S.burn.ran.on,
          hold: 0.5,
          status: () => mark(S.burn.ran.off) + ' 연소 끔 ' + mark(S.burn.ran.on) + ' 연소 켬',
          explain: '연소를 끄면 흡수 120 = 방출 120이라 대기 탄소가 <b>' + BASE_C + '</b>으로 일정해요. 연소를 켜면 해마다 <b>' + BURN_RATE + '</b>이 더해져 50년 뒤 <b>' + burnVal(true, BURN_YEARS) + '</b>이 돼요. 땅속에 오랫동안 묻혀 있던 탄소가 대기로 옮겨 오기 때문이에요. (바다·숲의 추가 흡수는 단순화해 생략)',
        },
      ],
    },
    {
      title: '에너지 흐름: 한 방향으로 흘러요', short: '에너지 흐름', icon: '⚡', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 탄소가 돌고 돌아 다시 쓰이는 것을 봤어요. 에너지도 똑같이 돌까요? 에너지가 지나가는 길을 수로 따라가 봐요.</div>' +
        '<p>생산자가 고정한 에너지를 <b>1000</b>이라 하고, 각 단계에서 호흡 <b>열</b>로 나가는 양과 다음 단계·분해자로 가는 양을 구해요. 그런 뒤 물질 순환과 에너지 흐름을 표로 비교해요.</p>',
      features: ['flow', 'cmp'],
      setup() { resetFlow(); resetCmp(); setMode('flow'); },
      recap: '에너지는 단계마다 일부가 호흡 열로 빠져나가며 한 방향으로 흘러요. 열은 다시 쓸 수 없으므로 생태계에는 빛에너지가 계속 들어와야 해요. 물질은 순환하지만 에너지는 순환하지 않아요.',
      summary: '<ul><li>에너지 흐름 예(생산자가 고정한 에너지 1000): 생산자 호흡 열 300, 1차 소비자 100, 분해자 600 / 1차 소비자 → 호흡 50, 2차 10, 분해자 40 / 2차 소비자 → 호흡 4, 분해자 6 / 분해자 호흡 열 646.</li><li>열로 나간 총합 300 + 50 + 4 + 646 = <b>1000</b> = 입력. 에너지는 사라지지 않고 모두 열로 방출돼요.</li><li><b>물질</b>은 순환하고 다시 쓸 수 있으며 새로 넣지 않아도 되지만, <b>에너지</b>는 한 방향으로 흐르고 열로 빠져나가 다시 쓸 수 없어서 빛에너지가 계속 필요해요.</li></ul>',
      missions: [
        {
          id: 'flow', title: '에너지 흐름 도표 완성', manual: true,
          goal: '빈칸 <b>①~④</b>를 채우고 <b>⑤ 열의 총합</b>이 처음 입력(1000)과 같은지 확인한 뒤 ✔ 확인하기를 누르세요.',
          hint: '각 상자에서 (들어온 에너지) = (나간 에너지의 합)이에요. 1차 소비자가 받은 100 중 50은 열, 10은 2차 소비자로 가고 나머지가 분해자로 가요.',
          setup() { setMode('flow'); },
          check() {
            const q = S.flow;
            if (flowFilled() < 5) return '아직 비어 있는 칸이 ' + (5 - flowFilled()) + '개 있어요.';
            const badI = [];
            q.inp.forEach((s, i) => { const inp = $('#fl' + i); if (!flowOK(i)) { badI.push(i); if (!q.bad[i]) { q.bad[i] = true; q.shakeT = S.clock; inp.classList.add('bad'); } } else { delete q.bad[i]; inp.classList.remove('bad'); } });
            if (badI.length) return '빨간 칸을 다시 계산해 보세요. ' + (badI[0] === 0 ? '① = 1000 − 300(열) − 100(1차 소비자)' : badI[0] === 1 ? '② = 100 − 50(열) − 10(2차 소비자)' : badI[0] === 2 ? '③ = 10 − 4(열)' : badI[0] === 3 ? '④는 분해자가 받은 에너지의 합(①+②+③)이에요.' : '⑤는 열 300 + 50 + 4 + ④의 합이에요.');
            return true;
          },
          status: () => '맞은 빈칸 ' + flowRight() + ' / 5',
          explain: '① 1000 − 300 − 100 = <b>' + EN_ANS[0] + '</b>, ② 100 − 50 − 10 = <b>' + EN_ANS[1] + '</b>, ③ 10 − 4 = <b>' + EN_ANS[2] + '</b>, ④ 분해자가 받은 ' + EN_ANS[0] + ' + ' + EN_ANS[1] + ' + ' + EN_ANS[2] + ' = <b>' + EN_ANS[3] + '</b>(모두 호흡 열로 방출), ⑤ 300 + 50 + 4 + ' + EN_ANS[3] + ' = <b>1000</b>이에요. 들어온 에너지는 모두 열로 나가므로 <b>에너지는 사라지지 않고</b> 형태만 바뀌어요.',
        },
        {
          id: 'cmp', title: '물질 순환과 에너지 흐름 비교표', manual: true,
          goal: '<b>🆚 비교표</b>의 빈 칸 6개를 눌러 채운 뒤 ✔ 확인하기를 누르세요.',
          hint: '탄소 같은 물질은 분해자를 거쳐 다시 생산자에게 돌아와요. 에너지는 호흡 열로 나가서 다시 쓰이지 않아요.',
          setup() { setMode('cmp'); },
          check() {
            const q = S.cmp;
            if (cmpFilled() < 6) return '아직 채우지 않은 칸이 ' + (6 - cmpFilled()) + '개 있어요.';
            let nb = 0;
            q.v.forEach((r, i) => r.forEach((x, j) => { const k = i + '_' + j; if (x !== CMP_ANS[i][j]) { nb++; if (!q.bad[k]) { q.bad[k] = true; q.shakeT = S.clock; } } else delete q.bad[k]; }));
            if (nb) return '빨간 칸 ' + nb + '개를 다시 고르세요. 물질(탄소)은 생태계 안을 돌고, 에너지는 한 방향으로 흘러요.';
            return true;
          },
          status: () => '채운 칸 ' + cmpFilled() + ' / 6',
          explain: '<b>물질(탄소)</b>: 순환 · 다시 쓸 수 있음 · 새로 넣지 않아도 돼요. <b>에너지</b>: 한 방향 · 열이 되어 다시 못 씀 · 빛에너지가 계속 들어와야 해요.',
        },
        {
          type: 'quiz', title: '빛이 사라진다면',
          goal: '어떤 생태계에 <b>빛이 갑자기 사라지면</b> 일어날 일로 가장 알맞은 것은?',
          setup() { setMode('flow'); },
          choices: ['탄소가 순환하지 못해 곧바로 모든 물질이 사라진다', '생산자가 양분을 만들지 못해 새로 들어오는 에너지가 끊겨, 시간이 지나면 생태계의 에너지 공급이 줄어든다', '분해자가 대신 빛을 이용해 에너지를 만든다', '열로 나간 에너지가 다시 생물에게 쓰여 에너지가 모자라지 않는다'],
          answer: 1,
          feedback: ['물질은 사라지지 않고 계속 순환할 수 있어요. 문제는 새 에너지가 들어오지 않는 거예요.', '', '분해자는 빛을 이용해 양분을 만들지 못해요. 먹이(유기물)의 에너지를 써요.', '열은 다시 쓸 수 없어요. 그래서 에너지는 빛으로 계속 새로 들어와야 해요.'],
          explain: '에너지는 열로 빠져나가 다시 쓸 수 없으므로 <b>빛에너지가 계속 들어와야</b> 해요. 빛이 사라지면 생산자가 에너지를 고정하지 못해 먹이 사슬 전체의 에너지 공급이 줄어요. 물질은 순환하지만 에너지는 순환하지 않아요.',
        },
      ],
    },
    {
      title: '평형과 중요성: 하나가 흔들리면', short: '평형과 중요성', icon: '⚖️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물질은 순환하고 에너지는 흐른다는 것을 확인했어요. 이 흐름이 안정되어 있는 상태가 <b>생태계 평형</b>이에요. 구성 요소 하나가 흔들리면 어떻게 될까요?</div>' +
        '<p>생태계를 <b>하나의 살아 있는 유기체</b>처럼 생각하며, 교란이 이어지는 길을 고르고, 교란이 얼마나 크면 평형이 깨지는지 찾아요. 생태계가 주는 혜택도 함께 떠올려 봐요.</p>',
      features: ['chain', 'dist'],
      setup() { resetBal(); resetDist(); setMode('chain'); },
      recap: '생태계는 구성 요소가 서로 이어진 하나의 유기체와 같아요. 작은 교란은 회복되지만, 한계를 넘는 큰 교란은 새로운 평형이나 붕괴로 이어져요. 그래서 생산자·소비자·분해자·비생물 환경 모두가 중요해요.',
      summary: '<ul><li>생태계는 하나의 유기체에 비유할 수 있어요: 생산자 = <b>양분 만들기</b>, 분해자 = <b>재활용</b>, 비생물 환경 = <b>환경 조건</b>.</li><li>교란은 먹이 사슬과 물질 순환을 따라 연쇄적으로 퍼져요. (분해자 감소, 가뭄, 포식자 제거, 외래종 도입, 대기 CO₂ 증가)</li><li>작은 교란은 되먹임으로 <b>회복</b>되지만, 한계(예시: 회복 한계 ' + TH_REC + ', 붕괴 한계 ' + TH_COL + ')를 넘으면 <b>새로운 평형</b> 또는 <b>붕괴</b>가 일어나요.</li><li>생태계는 맑은 공기, 물 정화, 비옥한 토양, 식량 같은 혜택을 줘요. 생태계 구조와 기능을 지키는 일이 생태 전환 교육의 핵심이에요.</li></ul>',
      missions: [
        {
          id: 'chain', title: '교란이 이어지는 길', manual: true,
          goal: '시나리오 <b>5가지</b>마다 알맞은 <b>영향 연쇄</b>를 하나씩 고른 뒤 ✔ 확인하기를 누르세요.',
          hint: '고르면 그림에 연쇄가 그려져요. 먹이 사슬(생산자 → 1차 → 2차)과 물질 순환(분해자 → 양분 → 생산자)에서 한 쪽이 줄거나 늘면 이어진 쪽이 어떻게 변할지 생각해요.',
          setup() { setMode('chain'); },
          check() {
            const q = S.bal;
            if (balPicked() < SCEN.length) return '아직 고르지 않은 시나리오가 ' + (SCEN.length - balPicked()) + '개 있어요.';
            const bad = [];
            SCEN.forEach((sc, i) => { const ok = q.pick[i] === sc.ans; if (!ok) { bad.push(i); if (!balSel[i].classList.contains('bad')) { balSel[i].classList.add('bad'); q.shakeT = S.clock; } } else { balSel[i].classList.remove('bad'); balSel[i].classList.add('ok'); } });
            if (bad.length) return '빨간 칸(' + bad.map((i) => (i + 1) + '번').join(', ') + ')을 다시 골라요. 먹이를 잡아먹히는 쪽·먹는 쪽이 어떻게 변하는지 따라가 보세요.';
            return true;
          },
          status: () => '고른 시나리오 ' + balPicked() + ' / ' + SCEN.length,
          explain: SCEN.map((s, i) => '<b>' + (i + 1) + '. ' + s.n + '</b>: ' + s.why).join('<br>'),
        },
        {
          id: 'dist', title: '교란의 크기와 생태계 평형',
          goal: '<b>📉 교란 크기</b> 화면에서 교란의 크기를 바꿔 <b>회복</b>, <b>새 평형(낮은 수준)</b>, <b>붕괴</b>를 각각 한 번씩 확인하세요.',
          hint: '슬라이더를 작게(20), 중간(55), 크게(80)로 놓고 ▶ 교란 적용을 눌러요. 교란 직후 건강 지표가 회복 한계(60)와 붕괴 한계(30)보다 위인지 아래인지 보세요.',
          setup() { setMode('dist'); },
          check: () => !!(S.dist.seen.rec && S.dist.seen.new && S.dist.seen.col),
          hold: 0.5,
          status: () => mark(S.dist.seen.rec) + ' 회복 ' + mark(S.dist.seen.new) + ' 새 평형 ' + mark(S.dist.seen.col) + ' 붕괴',
          explain: '교란 직후 건강 지표가 <b>' + TH_REC + ' 이상</b>(교란 ' + (100 - TH_REC) + ' 이하)이면 되먹임으로 100까지 <b>회복</b>해요. <b>' + TH_COL + '~' + TH_REC + '</b>이면 회복하지 못하고 낮은 수준(약 ' + EQ_NEW + ')의 <b>새 평형</b>에 머물고, <b>' + TH_COL + ' 미만</b>이면 <b>붕괴</b>해요. 한계를 넘기 전에 교란을 막는 것이 중요해요.',
        },
        {
          type: 'quiz', title: '생태계를 유기체에 비유하면',
          goal: '생태계를 하나의 살아 있는 유기체에 비유할 때 <b>분해자</b>에 해당하는 일은?',
          setup() { setMode('chain'); },
          choices: ['몸에 필요한 양분을 만드는 일', '쓰고 남은 것을 분해해 다시 쓰게 하는 재활용', '몸을 둘러싼 온도와 빛 같은 환경 조건', '다른 부분을 잡아먹어 수를 조절하는 일'],
          answer: 1,
          feedback: ['양분을 만드는 일은 생산자에 해당해요.', '', '환경 조건은 비생물 환경에 해당해요.', '잡아먹는 일은 소비자(포식자)에 해당해요.'],
          explain: '생산자는 <b>양분 만들기</b>, 분해자는 <b>재활용</b>, 비생물 환경은 <b>환경 조건</b>에 비유할 수 있어요. 분해자가 줄면 토양이 메말라 식량과 맑은 공기를 주는 식물이 자라기 어려워지듯, 구성 요소 하나하나가 모두 중요해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-ecosystem-flow', mount: '#game', badge: '생태계 지킴이', homeHref: '../../index.html#hb',
    featureLabels: { link: '🔗 물질·에너지 연결', remove: '🍄 분해자 제거 실험', cyc: '🔄 탄소 순환 고리', burn: '📈 대기 탄소 그래프', flow: '⚡ 에너지 흐름 도표', cmp: '🆚 비교표', chain: '🌪️ 교란 연쇄 5가지', dist: '📉 교란 크기와 평형' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetLink(); resetRem(); resetCarb(); resetBurn(); resetFlow(); resetCmp(); resetBal(); resetDist();
  setMode('link');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    stepRem(dt); stepBurn(dt); stepDist(dt);
    switch (S.mode) {
      case 'link': drawLink(dt, t); break;
      case 'remove': drawRem(dt, t); break;
      case 'cyc': drawCyc(dt, t); break;
      case 'burn': drawBurn(dt, t); break;
      case 'flow': drawFlow(dt, t); break;
      case 'cmp': drawCmp(dt, t); break;
      case 'chain': drawChain(dt, t); break;
      default: drawDist(dt, t);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,247,240,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    const cm = game && game.current();
    if (game && game.phase === 'success' && cm) {
      if (cm.id === 'cyc' && !S.carb.solved) { S.carb.solved = true; updateCtl(); ARR.forEach((a) => parts.burst(a.mid[0], a.mid[1], { count: 6, colors: [PROC[a.ans].c, '#fff'], speed: 90, size: 3, life: 0.7 })); }
      if (cm.id === 'chain' && !S.bal.solved) S.bal.solved = true;
    }
    if (game && game.free && !S.filled) { S.filled = true; autoFill(); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, levels, addLink, linkCount, REQ_M, REQ_E, NPOS, NR, ARR, POOL, EN_ANS, SCEN, CMP_ANS, remVals, burnVal, distOutcome, distVal, nodeAt, arrHit, cmpCell, DL, dx_, dy_, bnPos, autoFill,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { stepRem(0.02); stepBurn(0.02); stepDist(0.02); } },
  };
})();
