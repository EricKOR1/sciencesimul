(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const L = (a, b) => (PHONE ? b : a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const ease = SciSim.ease;
  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* 받침 유무에 따라 조사 고르기: josa('핵형', '은', '는') */
  function josa(w, a, b) { const ch = String(w).charCodeAt(String(w).length - 1); if (ch < 0xAC00 || ch > 0xD7A3) return b; return ((ch - 0xAC00) % 28) ? a : b; }

  const BG = '#f1f4ee';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FONT_EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function E(ch, x, y, size, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = size + 'px ' + FONT_EMO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; ctx.fillText(ch, 0, 0); ctx.restore();
  }
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '', sp = -1;
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; sp = -1; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) {
        if (sp > 0 && ch !== ' ') { out.push(line.slice(0, sp).trimEnd()); line = line.slice(sp + 1) + ch; } else { out.push(line); line = ch.trim() === '' ? '' : ch; }
        sp = line.lastIndexOf(' ');
      } else { line = t; if (ch === ' ') sp = line.length - 1; }
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
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  /* 염색 분체 한 가닥 (세로 막대): 가운데 y를 기준으로 len 길이, 동원체는 위에서 cen 비율 */

  /* 순서 고르기 (DOM): 보기 버튼을 누른 순서대로 번호 칩이 쌓여요 */
  function makePicker(root, items, onChange) {
    let seq = [];
    root.innerHTML = '';
    const pool = document.createElement('div'); pool.className = 'pk-pool';
    const row = document.createElement('div'); row.className = 'pk-seq';
    const rst = document.createElement('button'); rst.type = 'button'; rst.className = 'btn btn-sm pk-reset'; rst.textContent = '↺ 다시 고르기';
    root.append(pool, row, rst);
    const btns = items.map((it) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pk-item'; b.innerHTML = it.html; b.dataset.id = it.id;
      b.addEventListener('click', () => { if (seq.indexOf(it.id) >= 0) return; seq.push(it.id); Sound.click(); render(); onChange && onChange(seq.slice()); });
      pool.appendChild(b); return b;
    });
    function render() {
      row.innerHTML = '';
      seq.forEach((id, i) => {
        const it = items.find((x) => x.id === id);
        const c = document.createElement('button'); c.type = 'button'; c.className = 'pk-chip'; c.innerHTML = '<b>' + (i + 1) + '</b> ' + it.html; c.title = '눌러서 빼기';
        c.addEventListener('click', () => { seq = seq.slice(0, i); Sound.click(); render(); onChange && onChange(seq.slice()); });
        row.appendChild(c);
      });
      btns.forEach((b) => { b.disabled = seq.indexOf(b.dataset.id) >= 0; });
      row.classList.remove('bad'); row.classList.remove('ok');
    }
    rst.addEventListener('click', () => { seq = []; Sound.click(); render(); onChange && onChange([]); });
    render();
    return { get seq() { return seq.slice(); }, set(a) { seq = a.slice(); render(); onChange && onChange(seq.slice()); }, reset() { seq = []; render(); onChange && onChange([]); }, mark(cls) { row.classList.remove('bad', 'ok'); if (cls) row.classList.add(cls); } };
  }

  /* =========================================================
     고등학교 생명과학 Ⅲ. 생명의 연속성과 다양성 - 3역 6계 분류 (단원 39, 6차시)
     성취기준 [12생과03-04] 생물의 분류 체계를 바탕으로 각 분류군의 차이를 이해하고 생물군을 분류 체계에 따라 설명할 수 있다.
     ① 관찰: 분류 기준  ② 분석: 3역(rRNA 서열 차이)  ③ 모형: 6계 흐름도  ④ 적용: 분류하기
     (역과 계 수준까지만 다루고 문 · 강 · 목 · 과 · 속은 다루지 않음)
     ========================================================= */
  const S = { mode: 'crit', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { crit: '🗂️ 분류 기준에 따라 묶기', rrna: '🧬 rRNA 서열 차이 표', dtable: '📋 3역 비교표', six: '🌳 6계 흐름도', apply: '🔎 미지의 생물 분류하기' };
  const KN = ['진정세균계', '고세균계', '원생생물계', '식물계', '균계', '동물계'];
  const KID = ['eub', 'arc', 'pro', 'pla', 'fun', 'ani'];
  const KDOM = [0, 1, 2, 2, 2, 2];
  const DN = ['세균역', '고세균역', '진핵생물역'];
  const DCOL = ['#2563eb', '#dc2626', '#16a34a'], KCOL = ['#3b82f6', '#ef4444', '#a855f7', '#22a05a', '#d97706', '#0ea5e9'];
  /* 생물 카드 16장: 핵막(1/0) · 세포 수 · 세포벽 · 영양 방식 · 사는 곳 · 계(번호) */
  const ORG = [
    { id: 'ecoli', n: '대장균', e: '🦠', nuc: 0, cells: 'uni', wall: 'pept', nutr: 'hetero', hab: 'both', k: 0 },
    { id: 'cyano', n: '시아노박테리아', s: '시아노', e: '🟢', nuc: 0, cells: 'uni', wall: 'pept', nutr: 'photo', hab: 'water', k: 0 },
    { id: 'meth', n: '메테인 생성 고세균', s: '메테인 생성균', e: '💨', nuc: 0, cells: 'uni', wall: 'arch', nutr: 'chemo', hab: 'both', k: 1 },
    { id: 'halo', n: '호염성 고세균', s: '호염성균', e: '🧂', nuc: 0, cells: 'uni', wall: 'arch', nutr: 'hetero', hab: 'water', k: 1 },
    { id: 'amoeba', n: '아메바', e: '🫧', nuc: 1, cells: 'uni', wall: 'none', nutr: 'hetero', hab: 'both', k: 2 },
    { id: 'parame', n: '짚신벌레', e: '🥿', nuc: 1, cells: 'uni', wall: 'none', nutr: 'hetero', hab: 'water', k: 2 },
    { id: 'eugl', n: '유글레나', e: '🌟', nuc: 1, cells: 'uni', wall: 'none', nutr: 'photo', hab: 'water', k: 2 },
    { id: 'kelp', n: '다시마', e: '🌊', nuc: 1, cells: 'multi', wall: 'cellu', nutr: 'photo', hab: 'water', k: 2, tis: 0 },
    { id: 'moss', n: '이끼', e: '🍀', nuc: 1, cells: 'multi', wall: 'cellu', nutr: 'photo', hab: 'land', k: 3, tis: 1 },
    { id: 'fern', n: '고사리', e: '🌿', nuc: 1, cells: 'multi', wall: 'cellu', nutr: 'photo', hab: 'land', k: 3, tis: 1 },
    { id: 'pine', n: '소나무', e: '🌲', nuc: 1, cells: 'multi', wall: 'cellu', nutr: 'photo', hab: 'land', k: 3, tis: 1 },
    { id: 'oyster', n: '느타리버섯', s: '느타리', e: '🍄', nuc: 1, cells: 'multi', wall: 'chitin', nutr: 'hetero', hab: 'land', k: 4 },
    { id: 'yeast', n: '효모', e: '🍞', nuc: 1, cells: 'uni', wall: 'chitin', nutr: 'hetero', hab: 'both', k: 4 },
    { id: 'mold', n: '푸른곰팡이', s: '푸른곰팡이', e: '🧀', nuc: 1, cells: 'multi', wall: 'chitin', nutr: 'hetero', hab: 'land', k: 4 },
    { id: 'jelly', n: '해파리', e: '🪼', nuc: 1, cells: 'multi', wall: 'none', nutr: 'hetero', hab: 'water', k: 5 },
    { id: 'human', n: '사람', e: '🧑', nuc: 1, cells: 'multi', wall: 'none', nutr: 'hetero', hab: 'land', k: 5 },
  ];
  const CRIT = [
    { id: 'nuc', n: '핵막', good: true, vals: [{ k: 1, l: '핵막 있음' }, { k: 0, l: '핵막 없음' }] },
    { id: 'cells', n: '세포 수', good: true, vals: [{ k: 'uni', l: '단세포' }, { k: 'multi', l: '다세포' }] },
    { id: 'wall', n: '세포벽 성분', good: true, vals: [{ k: 'pept', l: '펩티도글리칸' }, { k: 'arch', l: '펩티도글리칸 없는 고세균형', s: '고세균형' }, { k: 'cellu', l: '셀룰로스' }, { k: 'chitin', l: '키틴' }, { k: 'none', l: '세포벽 없음' }] },
    { id: 'nutr', n: '영양 방식', good: true, vals: [{ k: 'photo', l: '광합성 (독립 영양)' }, { k: 'hetero', l: '섭취·흡수 (종속 영양)' }, { k: 'chemo', l: '화학 합성 (독립 영양)' }] },
    { id: 'hab', n: '사는 곳', good: false, vals: [{ k: 'water', l: '물' }, { k: 'land', l: '땅' }, { k: 'both', l: '물·땅 모두 (애매해요)', s: '물·땅 모두' }] },
  ];
  const sname = (o) => o.s || o.n;
  const orgById = (id) => ORG.find((o) => o.id === id);

  /* =========================================================
     ① 분류 기준: 기준 1~2개로 16장의 카드 묶기
     ========================================================= */
  const CAR = L({ x: 14, y: 76, w: 772, h: 364 }, { x: 6, y: 74, w: 468, h: 480 });
  const CHIP_H = L(27, 25), CHIP_FONT = L(12.5, 11.5);
  let chipWCache = {};
  function chipW(o) { const k = o.id + CHIP_FONT; if (!chipWCache[k]) { ctx.save(); ctx.font = D.font(CHIP_FONT, 800); chipWCache[k] = ctx.measureText(sname(o)).width + 34; ctx.restore(); } return chipWCache[k]; }
  function resetCrit() {
    const prev = S.cr;
    S.cr = { sel: [], zones: [], chips: ORG.map((o, i) => { const q = poolPos(i); return { o, x: q[0], y: q[1], tx: q[0], ty: q[1], shake: 0 }; }), settled: true, seen: prev ? prev.seen : {}, pickT: 0 };
    layoutCrit();
  }
  function poolPos(i) { const cols = PHONE ? 4 : 8, cw = (CAR.w - 20) / cols; return [CAR.x + 10 + (i % cols) * cw, CAR.y + 14 + Math.floor(i / cols) * (CHIP_H + 10)]; }
  function layoutCrit() {
    const q = S.cr, sel = q.sel.map((id) => CRIT.find((c) => c.id === id));
    q.zones = [];
    const RL = sel.length ? L(124, 88) : 0, CH = sel.length > 1 ? 28 : 0;
    const rows = sel.length ? sel[0].vals : [{ k: null, l: '' }], cols = sel.length > 1 ? sel[1].vals : [{ k: null, l: '' }];
    const cw = (CAR.w - RL) / cols.length, rh = (CAR.h - CH) / rows.length;
    q.rows = rows; q.cols = cols; q.RL = RL; q.CH = CH; q.cw = cw; q.rh = rh;
    rows.forEach((r, i) => cols.forEach((c, j) => {
      const z = { x: CAR.x + RL + j * cw, y: CAR.y + CH + i * rh, w: cw, h: rh, r, c, items: [] }; q.zones.push(z);
    }));
    ORG.forEach((o, idx) => {
      const ri = sel.length ? rows.findIndex((r) => o[sel[0].id] === r.k) : 0, ci = sel.length > 1 ? cols.findIndex((c) => o[sel[1].id] === c.k) : 0;
      q.zones[ri * cols.length + ci].items.push(idx);
    });
    q.zones.forEach((z) => {
      let x = z.x + 8, y = z.y + (z.h > 60 ? 8 : 4); const wmax = z.x + z.w - 8;
      z.items.forEach((idx) => { const w = chipW(ORG[idx]); if (x + w > wmax && x > z.x + 8) { x = z.x + 8; y += CHIP_H + 5; } q.chips[idx].tx = x; q.chips[idx].ty = y; x += w + 5; });
    });
    q.settled = false;
  }
  function critToggle(id) {
    const q = S.cr, i = q.sel.indexOf(id);
    if (i >= 0) q.sel.splice(i, 1); else if (q.sel.length < 2) q.sel.push(id); else q.sel[1] = id;
    q.sel.forEach((s) => { q.seen[s] = true; });
    layoutCrit(); Sound.click(); updateCtl();
  }
  const crOK = () => S.cr.sel.length === 2 && S.cr.sel.every((id) => CRIT.find((c) => c.id === id).good) && S.cr.settled;
  const crAmb = () => (S.cr.sel.indexOf('hab') >= 0 ? ORG.filter((o) => o.hab === 'both').length : 0);
  function stepCrit(dt) {
    const q = S.cr; if (!q) return; let moving = false;
    q.chips.forEach((c) => { const nx = SciSim.approach(c.x, c.tx, dt, 9), ny = SciSim.approach(c.y, c.ty, dt, 9); if (Math.abs(nx - c.tx) > 0.8 || Math.abs(ny - c.ty) > 0.8) moving = true; c.x = nx; c.y = ny; if (!moving || true) { if (Math.abs(nx - c.tx) <= 0.8 && Math.abs(ny - c.ty) <= 0.8) { c.x = c.tx; c.y = c.ty; } } });
    q.settled = !moving;
  }
  function drawChip(c, x, y, w, col, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    D.shadow(() => { D.roundRect(x, y, w, CHIP_H, CHIP_H / 2); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 4, y: 1.5 });
    D.roundRect(x, y, w, CHIP_H, CHIP_H / 2); ctx.lineWidth = 1.8; ctx.strokeStyle = col || '#94a3b8'; ctx.stroke();
    E(c.e, x + 13, y + CHIP_H / 2 + 1, CHIP_FONT + 2);
    T(x + 25, y + CHIP_H / 2 + 4.5, sname(c), CHIP_FONT, '#1f2d44', 'left', 800);
    ctx.restore();
  }
  function drawCrit(dt, t) {
    const q = S.cr;
    bgFill('#f2f4ec', '#e8efe9');
    T(L(14, 8), L(30, 22), '🗂️ 기준 1~2개를 골라 생물 카드를 묶어요', L(17, 15), '#27422f', 'left', 800);
    const sel = q.sel.map((id) => CRIT.find((c) => c.id === id));
    D.label(L(14, 8), L(58, 48), sel.length ? '기준 ① ' + sel[0].n + (sel[1] ? '  ·  기준 ② ' + sel[1].n : '') : '아래 버튼에서 기준을 골라요', { bg: sel.length ? '#16a34a' : '#94a3b8', size: L(14, 12.5), align: 'left' });
    panel(CAR.x - 2, CAR.y - 2, CAR.w + 4, CAR.h + 4, 16, '#fffefa');
    // 구역
    q.zones.forEach((z, k) => {
      const amb = sel.length && sel.some((s, si) => s.id === 'hab' && (si === 0 ? z.r.k === 'both' : z.c.k === 'both'));
      ctx.save(); D.roundRect(z.x + 3, z.y + 3, z.w - 6, z.h - 6, 12); ctx.fillStyle = amb ? 'rgba(249,115,22,.10)' : (sel.length ? ['rgba(34,197,94,.07)', 'rgba(59,130,246,.07)'][(Math.floor(k / q.cols.length) + k) % 2] : 'rgba(0,0,0,0)'); ctx.fill(); if (sel.length) { ctx.setLineDash([6, 5]); ctx.strokeStyle = amb ? '#f97316' : '#cbd5e1'; ctx.lineWidth = 1.8; ctx.stroke(); } ctx.restore();
    });
    q.rows.forEach((r, i) => { if (r.l) { const y = CAR.y + q.CH + i * q.rh; ctx.save(); ctx.beginPath(); ctx.rect(CAR.x, y, q.RL - 2, q.rh); ctx.clip(); textBlock(CAR.x + 10, y + q.rh / 2 - 8, q.RL - 18, r.l, L(13.5, 11.5), '#27422f', L(17, 14), 800); ctx.restore(); } });
    q.cols.forEach((c, j) => { if (q.CH && c.l) { ctx.save(); ctx.beginPath(); ctx.rect(CAR.x + q.RL + j * q.cw, CAR.y, q.cw, q.CH); ctx.clip(); T(CAR.x + q.RL + j * q.cw + q.cw / 2, CAR.y + 19, c.l, L(13, 11), '#0369a1', 'center', 800); ctx.restore(); } });
    // 칩
    q.chips.forEach((c) => { const w = chipW(c.o); drawChip(c.o, c.x, c.y, w, sel.length ? (c.o.nuc ? '#16a34a' : '#64748b') : '#94a3b8'); });
    // 설명 상자
    const iy = CAR.y + CAR.h + 14, ih = L(VH - iy - 8, VH - iy - 8);
    panel(L(14, 6), iy, L(772, 468), ih, 14);
    if (!sel.length) textBlock(L(28, 20), iy + 28, L(744, 440), '카드 16장이 섞여 있어요. 핵막, 세포 수, 세포벽, 영양 방식 중 하나를 골라 두 무리 이상으로 나누고, 한 번 더 다른 기준으로 나누어 봐요.', L(15, 14), '#475569', 22, 700);
    else {
      const sizes = (s) => s.vals.map((v) => { const n = ORG.filter((o) => o[s.id] === v.k).length; return (v.s || v.l.replace(/ \(.*\)/, '')) + ' ' + n; }).join(' · ');
      textBlock(L(28, 20), iy + 24, L(744, 440), '기준 ① ' + sel[0].n + ': ' + sizes(sel[0]), L(14, 13), '#27422f', L(21, 19), 800);
      if (sel[1]) textBlock(L(28, 20), iy + L(48, 50), L(744, 440), '기준 ② ' + sel[1].n + ': ' + sizes(sel[1]), L(14, 13), '#0369a1', L(21, 19), 800);
      const amb = crAmb();
      textBlock(L(28, 20), iy + L(76, 80), L(744, 440), amb ? '⚠️ 사는 곳은 ' + amb + '종이 물·땅 모두에 살아 경계가 애매해요. 좋은 분류 기준이 아니에요.' : '✅ 모든 생물에 적용되고 뚜렷하게 나뉘는 좋은 기준이에요.', L(14, 13), amb ? '#c2410c' : '#15803d', L(21, 19), 800);
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ② 3역: 가상 rRNA 염기 서열(12염기)의 차이 수 표와 3역 비교표
     ========================================================= */
  const SEQ = ['UCCGAACACCGU', 'UACCAACACCGU', 'GCCCAGGGAGGG', 'GCCCAGUGAGGU', 'GCUUUAGUCAUU', 'GCUCUAGUUAUU', 'GCUCUACUCAUU', 'GCUCUAGUCACU', 'GCUCUAAUCAUC', 'ACUCUAGUCAUU', 'GCUCGAGUCAUU', 'GCUCUAGUCAUA', 'GCUCUAGCCAUU', 'GCACUAGUCAUU', 'GAUCUAGUCAUU', 'GCUCUAGUCGUU'];
  const DOMOF = ORG.map((o) => KDOM[o.k]);
  const ham = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
  const DM = SEQ.map((a) => SEQ.map((b) => ham(a, b)));
  const DSTAT = (function () { let wMax = 0, bMin = 99, bMax = 0; for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) { if (DOMOF[i] === DOMOF[j]) wMax = Math.max(wMax, DM[i][j]); else { bMin = Math.min(bMin, DM[i][j]); bMax = Math.max(bMax, DM[i][j]); } } return { wMax, bMin, bMax }; })();
  const GRPC = ['#cbd5e1', '#f97316', '#0ea5e9', '#22c55e'];
  const RM_ = L({ x: 122, y: 100, c: 20 }, { x: 34, y: 84, c: 17 });
  const RLIST = L({ x: 478, y: 46, w: 308, h: 394 }, { x: 6, y: 420, w: 468, h: 274 });
  const RCMP = L({ x: 14, y: 450, w: 772, h: 98 }, { x: 6, y: 356, w: 468, h: 56 });
  function resetRrna() { S.rn = { grp: Array(16).fill(0), order: Array.from({ length: 16 }, (_, i) => i), pos: Array.from({ length: 16 }, (_, i) => i), sel: null, solved: false, glow: 0, msg: '' }; }
  const rnGrouped = () => S.rn.grp.filter((g) => g > 0).length;
  function rnEval() {
    const q = S.rn; if (q.grp.some((g) => g === 0)) return { ok: false, msg: '아직 집단을 정하지 않은 생물이 ' + q.grp.filter((g) => g === 0).length + '종 있어요.' };
    const used = [1, 2, 3].filter((g) => q.grp.indexOf(g) >= 0);
    let miss = 0; used.forEach((g) => { const cnt = [0, 0, 0]; q.grp.forEach((x, i) => { if (x === g) cnt[DOMOF[i]]++; }); miss += cnt.reduce((a, b) => a + b, 0) - Math.max.apply(null, cnt); });
    let domsSplit = 0; [0, 1, 2].forEach((d) => { const gs = new Set(); q.grp.forEach((g, i) => { if (DOMOF[i] === d) gs.add(g); }); if (gs.size > 1) domsSplit += gs.size - 1; });
    if (used.length !== 3) return { ok: false, msg: '집단이 ' + used.length + '개예요. 차이 수가 작은 것끼리 묶으면 집단이 3개가 돼요.' };
    if (miss || domsSplit) return { ok: false, msg: '서로 차이가 큰 생물이 한 집단에 있거나, 차이가 작은 생물이 갈라져 있어요. 표에서 차이가 작은 쪽끼리 묶어요.' };
    return { ok: true };
  }
  function rnSolve() { const q = S.rn; q.solved = true; q.order = Array.from({ length: 16 }, (_, i) => i).sort((a, b) => DOMOF[a] - DOMOF[b] || a - b); q.order.forEach((id, k) => { q.pos[id] = q.pos[id]; }); q.tgt = {}; q.order.forEach((id, k) => { q.tgt[id] = k; }); }
  function stepRrna(dt) { const q = S.rn; if (!q) return; q.pos = q.pos.map((p, id) => { if (!q.tgt) return p; return SciSim.approach(p, q.tgt[id], dt, 6); }); q.glow = q.solved ? Math.min(1, q.glow + dt * 0.9) : 0; }
  const distCol = (d) => { if (d === 0) return '#f1f5f9'; if (d <= 4) return C.mix('#dcfce7', '#86efac', d / 4); return C.mix('#e9d5ff', '#7e22ce', clamp((d - 6) / 4, 0, 1)); };
  function rnPick(p) {
    const q = S.rn;
    // 목록의 줄을 누르면 집단 색이 바뀌어요
    for (let i = 0; i < 16; i++) { const r = rowRect(i); if (inRect(p, r)) { q.grp[i] = (q.grp[i] + 1) % 4; Sound.click(); updateCtl(); return false; } }
    // 표의 칸을 누르면 두 서열을 비교
    const dpos = (id) => q.pos[id];
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const x = RM_.x + dpos(j) * RM_.c, y = RM_.y + dpos(i) * RM_.c;
      if (p.x >= x && p.x < x + RM_.c && p.y >= y && p.y < y + RM_.c) { q.sel = [i, j]; Sound.tick(); return false; }
    }
    return false;
  }
  function rowRect(i) {
    const q = S.rn, ro = q.pos[i];
    if (!PHONE) return { x: RLIST.x, y: RLIST.y + 34 + ro * 22, w: RLIST.w, h: 22 };
    return { x: RLIST.x + 6 + (Math.floor(ro / 8)) * 234, y: RLIST.y + 34 + (ro % 8) * 28, w: 228, h: 28 };
  }
  function drawRrna(dt, t) {
    const q = S.rn;
    bgFill('#eef3f6', '#f1eef7');
    T(L(14, 8), L(30, 22), '🧬 서열 차이가 작은 생물끼리 묶어 보세요', L(17, 15), '#334155', 'left', 800);
    // 행렬
    const mx = RM_.x, my = RM_.y, c = RM_.c;
    panel(L(14, 6), L(44, 38), L(450, 468), L(396, 314), 16, '#fffefa');
    T(L(24, 16), L(68, 60), '표의 숫자 = 두 서열에서 다른 글자 수 (눌러서 비교)', L(13, 12), '#64748b', 'left', 800);
    for (let k = 0; k < 16; k++) { T(mx + q.pos[k] * c + c / 2, my - 6, String(k + 1), L(11.5, 10.5), '#64748b', 'center', 800); }
    const sel = q.sel;
    for (let i = 0; i < 16; i++) {
      const y = my + q.pos[i] * c;
      T(mx - 6, y + c / 2 + 4, (PHONE ? '' : sname(ORG[i]) + ' ') + (i + 1), PHONE ? 11 : 12.5, q.grp[i] ? '#1f2d44' : '#64748b', 'right', 800);
      for (let j = 0; j < 16; j++) {
        const x = mx + q.pos[j] * c; ctx.fillStyle = distCol(DM[i][j]); ctx.fillRect(x + 0.5, y + 0.5, c - 1, c - 1);
        if (c >= 17) T(x + c / 2, y + c / 2 + 4, String(DM[i][j]), L(11.5, 10.5), DM[i][j] > 6 ? '#fff' : '#334155', 'center', 800);
      }
    }
    if (sel) { const [i, j] = sel; ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.4; ctx.strokeRect(mx + q.pos[j] * c, my + q.pos[i] * c, c, c); ctx.strokeRect(mx, my + q.pos[i] * c, 16 * c, c); ctx.strokeRect(mx + q.pos[j] * c, my, c, 16 * c); }
    if (q.solved) {
      const al = smooth(q.glow);
      [[0, 2], [2, 4], [4, 16]].forEach(([a, b], k) => { ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = DCOL[k]; ctx.lineWidth = 3.4; ctx.strokeRect(mx + a * c - 1, my + a * c - 1, (b - a) * c + 2, (b - a) * c + 2); ctx.restore(); });
      ctx.save(); ctx.globalAlpha = al; D.label(mx + 8 * c + 1, my + 16 * c + L(22, 18), '같은 역끼리는 차이 ' + DSTAT.wMax + ' 이하, 다른 역과는 ' + DSTAT.bMin + ' ~ ' + DSTAT.bMax, { bg: '#15803d', size: L(13, 12) }); ctx.restore();
    }
    // 서열 목록
    panel(RLIST.x, RLIST.y, RLIST.w, RLIST.h, 16, '#fffefa');
    T(RLIST.x + 14, RLIST.y + 24, '서열 (줄을 눌러 집단 색 고르기)', L(13.5, 13), '#26324a', 'left', 800);
    for (let i = 0; i < 16; i++) {
      const r = rowRect(i), g = q.grp[i];
      if (g) { ctx.fillStyle = GRPC[g] + '33'; D.roundRect(r.x + 2, r.y + 1, r.w - 4, r.h - 2, 6); ctx.fill(); }
      D.sphere(r.x + 14, r.y + r.h / 2, 6, GRPC[g], { gloss: g > 0 });
      T(r.x + 28, r.y + r.h / 2 + 4.5, (i + 1) + ' ' + sname(ORG[i]), L(12.5, 11), '#334155', 'left', 800);
      const sq = SEQ[i], sx = r.x + L(150, 108);
      ctx.save(); ctx.font = '700 ' + L(13, 11.5) + 'px ui-monospace, Menlo, Consolas, monospace'; ctx.textBaseline = 'alphabetic';
      for (let k = 0; k < 12; k++) { let mm = false; if (sel && (sel[0] === i || sel[1] === i)) { const o = sel[0] === i ? sel[1] : sel[0]; mm = SEQ[o][k] !== sq[k]; } ctx.fillStyle = mm ? '#dc2626' : '#475569'; ctx.fillText(sq[k], sx + k * L(11, 9.4), r.y + r.h / 2 + 4.5); }
      ctx.restore();
    }
    // 비교 상자
    panel(RCMP.x, RCMP.y, RCMP.w, RCMP.h, 14);
    if (sel) {
      const [i, j] = sel;
      T(RCMP.x + 14, RCMP.y + 24, (i + 1) + ' ' + sname(ORG[i]) + '  vs  ' + (j + 1) + ' ' + sname(ORG[j]), L(14.5, 13), '#26324a', 'left', 800);
      ctx.save(); ctx.font = '800 ' + L(16, 13) + 'px ui-monospace, Menlo, Consolas, monospace';
      [i, j].forEach((id, row) => { for (let k = 0; k < 12; k++) { const mm = SEQ[i][k] !== SEQ[j][k]; ctx.fillStyle = mm ? '#dc2626' : '#475569'; ctx.fillText(SEQ[id][k], RCMP.x + 14 + k * L(18, 15), RCMP.y + L(50, 40) + row * L(24, 0) + (PHONE ? row * 0 : 0)); } });
      ctx.restore();
      T(RCMP.x + RCMP.w - 14, RCMP.y + L(50, 24), '다른 글자 ' + DM[i][j] + '개', L(16, 14.5), DM[i][j] > 6 ? '#7e22ce' : '#15803d', 'right', 800);
    } else textBlock(RCMP.x + 14, RCMP.y + 26, RCMP.w - 28, '표의 칸을 누르면 두 서열을 나란히 비교해요. 다른 글자는 빨간색이에요.', L(14.5, 13), '#64748b', 20, 700);
    parts.update(dt); parts.draw(ctx);
  }

  /* ---------- 3역 비교표 ---------- */
  const DT_ROWS = [
    { n: '핵막', opts: ['있음', '없음'], ans: [1, 1, 0] },
    { n: '세포벽 성분', opts: ['펩티도글리칸', '펩티도글리칸 없음', '종에 따라 달라요'], ans: [0, 1, 2] },
    { n: '서식지', opts: ['다양한 환경', '극한 환경에서 많이 발견'], ans: [0, 1, 0] },
  ];
  const DTC = L({ x: 150, w: 208, y: 112, h: 78 }, { x: 96, w: 122, y: 108, h: 108 });
  function resetDtable() { S.dt = { pick: DT_ROWS.map(() => [null, null, null]), flag: DT_ROWS.map(() => [0, 0, 0]), pop: DT_ROWS.map(() => [1, 1, 1]) }; }
  const dtRight = () => { let n = 0; DT_ROWS.forEach((r, i) => r.ans.forEach((a, j) => { if (S.dt.pick[i][j] === a) n++; })); return n; };
  const dtFilled = () => S.dt.pick.reduce((n, r) => n + r.filter((v) => v != null).length, 0);
  const dtCell = (i, j) => ({ x: L(14, 6) + DTC.x - L(14, 6) + j * (DTC.w + 6), y: DTC.y + i * (DTC.h + 8), w: DTC.w, h: DTC.h });
  function dtDown(p) {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (inRect(p, dtCell(i, j))) {
      const q = S.dt, o = DT_ROWS[i].opts.length, v = q.pick[i][j];
      q.pick[i][j] = v == null ? 0 : v + 1 >= o ? null : v + 1; q.flag[i][j] = 0; q.pop[i][j] = 0.5; SciSim.tween(q.pop[i], { [j]: 1 }, { duration: 0.35, ease: 'outBack' }); Sound.click(); return false;
    }
    return false;
  }
  function drawDtable(dt, t) {
    const q = S.dt;
    bgFill('#f3f1f8', '#eef3ee');
    T(L(14, 8), L(30, 22), '📋 세 개의 역을 비교해요 (칸을 눌러 바꿔요)', L(17, 15), '#3b2f63', 'left', 800);
    DN.forEach((n, j) => { const c = dtCell(0, j); D.label(c.x + c.w / 2, DTC.y - 24, n, { bg: DCOL[j], size: L(15, 13.5), pad: 12 }); });
    DT_ROWS.forEach((r, i) => {
      T(L(14, 6) + 4, dtCell(i, 0).y + DTC.h / 2 + 5, r.n, L(15, 12.5), '#26324a', 'left', 800);
      for (let j = 0; j < 3; j++) {
        const c = dtCell(i, j), v = q.pick[i][j], fl = q.flag[i][j], pop = clamp(q.pop[i][j], 0, 1.2);
        ctx.save(); ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(0.94 + 0.06 * pop, 0.94 + 0.06 * pop); ctx.translate(-c.x - c.w / 2, -c.y - c.h / 2);
        D.shadow(() => { D.roundRect(c.x, c.y, c.w, c.h, 14); ctx.fillStyle = v == null ? '#fff' : fl === 1 ? '#dcfce7' : fl === 2 ? '#fee2e2' : '#ede9fe'; ctx.fill(); }, { blur: 5, y: 2 });
        D.roundRect(c.x, c.y, c.w, c.h, 14); ctx.setLineDash(v == null ? [6, 4] : []); ctx.lineWidth = 2.4; ctx.strokeStyle = v == null ? '#94a3b8' : fl === 1 ? '#16a34a' : fl === 2 ? '#dc2626' : DCOL[j]; ctx.stroke(); ctx.setLineDash([]);
        if (v == null) T(c.x + c.w / 2, c.y + c.h / 2 + 5, '👆 눌러서 고르기', L(14, 12.5), '#94a3b8', 'center', 800);
        else textBlock(c.x + c.w / 2, c.y + c.h / 2 - (wrap(r.opts[v], c.w - 16, L(15, 12.5)).length - 1) * L(10, 8.5) + 5, c.w - 16, r.opts[v], L(15, 12.5), '#1f2d44', L(20, 17), 800, 'center');
        ctx.restore();
      }
    });
    const by = DTC.y + 3 * (DTC.h + 8) + 6;
    panel(L(14, 6), by, L(772, 468), VH - by - 8, 14);
    T(L(28, 20), by + 28, '🧬 rRNA 서열(가상 자료 12염기)', L(15, 13.5), '#26324a', 'left', 800);
    textBlock(L(28, 20), by + 54, L(744, 440), '같은 역 안의 서열 차이는 ' + DSTAT.wMax + '개 이하이고, 서로 다른 역 사이는 ' + DSTAT.bMin + '~' + DSTAT.bMax + '개예요. 이 차이가 3개의 큰 무리로 나뉘는 근거예요.', L(14.5, 13.5), '#475569', L(22, 20), 700);
    textBlock(L(28, 20), by + L(100, 124), L(744, 440), '고세균은 세균처럼 핵막이 없지만, 실제 rRNA 분석에서는 세균보다 진핵생물과 더 가까운 점이 있어서 세균과는 다른 역으로 구분해요.', L(14.5, 13.5), '#7c3aed', L(22, 20), 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ③ 6계 흐름도: 핵막 → 세포벽 → 다세포 · 키틴 · 광합성과 조직 분화
     ========================================================= */
  const LEAF_ANS = [0, 1, 5, 2, 4, 3, 2];            // 위에서부터 7개 칸이 가리키는 계 번호 (진정세균, 고세균, 동물, 원생, 균, 식물, 원생)
  const LEAF_ID = ['eub', 'arc', 'ani', 'proA', 'fun', 'pla', 'proB'];
  const FNODES = [
    { id: 'N0', q: '핵막이 있는가?' },
    { id: 'N1', q: '세포벽에 펩티도글리칸이 있는가?' },
    { id: 'N2', q: '세포벽이 있는가?' },
    { id: 'N3', q: '다세포인가?' },
    { id: 'N4', q: '세포벽이 키틴인가?' },
    { id: 'N5', q: '광합성을 하고 뿌리 · 줄기 · 잎이 분화했는가?' },
  ];
  /* 생물이 지나는 길: [노드, 예(1)/아니오(0)] ... 마지막은 칸 번호 */
  function routeOf(o) {
    const r = [];
    r.push(['N0', o.nuc ? 1 : 0]);
    if (!o.nuc) { r.push(['N1', o.wall === 'pept' ? 1 : 0]); return { path: r, leaf: o.wall === 'pept' ? 0 : 1 }; }
    r.push(['N2', o.wall !== 'none' ? 1 : 0]);
    if (o.wall === 'none') { r.push(['N3', o.cells === 'multi' ? 1 : 0]); return { path: r, leaf: o.cells === 'multi' ? 2 : 3 }; }
    r.push(['N4', o.wall === 'chitin' ? 1 : 0]);
    if (o.wall === 'chitin') return { path: r, leaf: 4 };
    const t = o.cells === 'multi' && o.nutr === 'photo' && o.tis === 1;
    r.push(['N5', t ? 1 : 0]);
    return { path: r, leaf: t ? 5 : 6 };
  }
  const SIX_CARDS = ['ecoli', 'halo', 'parame', 'kelp', 'moss', 'yeast', 'oyster', 'jelly'];
  const FG = (function () {
    const g = PHONE ? { lw: 88, lh: 54, ly0: 38, ldy: 64, nw: 88, nh: 58, cols: [4, 98, 192, 286], lx: 388, fs: 11, lh2: 13 } : { lw: 150, lh: 54, ly0: 40, ldy: 61, nw: 120, nh: 58, cols: [8, 150, 292, 448], lx: 636, fs: 12, lh2: 14 };
    return g;
  })();
  function flowGeom() {
    const ly = (i) => FG.ly0 + FG.lh / 2 + i * FG.ldy;
    const N = {}; N.N1 = { y: (ly(0) + ly(1)) / 2, c: 2 }; N.N3 = { y: (ly(2) + ly(3)) / 2, c: 2 }; N.N5 = { y: (ly(5) + ly(6)) / 2, c: 3 };
    N.N4 = { y: (ly(4) + N.N5.y) / 2, c: 2 }; N.N2 = { y: (N.N3.y + N.N4.y) / 2, c: 1 }; N.N0 = { y: (N.N1.y + N.N2.y) / 2, c: 0 };
    FNODES.forEach((n) => { const g = N[n.id]; g.x = FG.cols[g.c]; g.w = FG.nw; g.h = FG.nh; g.q = n.q; });
    const leaves = LEAF_ID.map((id, i) => ({ id, i, x: FG.lx, y: ly(i) - FG.lh / 2, w: FG.lw, h: FG.lh }));
    return { N, leaves, ly };
  }
  const FGEO = flowGeom();
  /* 가지: [부모, 자식(노드/잎), 예/아니오] */
  const EDGES = [['N0', 'N1', 0], ['N0', 'N2', 1], ['N1', 'L0', 1], ['N1', 'L1', 0], ['N2', 'N3', 0], ['N2', 'N4', 1], ['N3', 'L2', 1], ['N3', 'L3', 0], ['N4', 'L4', 1], ['N4', 'N5', 0], ['N5', 'L5', 1], ['N5', 'L6', 0]];
  const nodeBox = (id) => (id[0] === 'L' ? FGEO.leaves[+id.slice(1)] : FGEO.N[id]);
  const leafMid = (i) => { const l = FGEO.leaves[i]; return [l.x, l.y + l.h / 2]; };
  function edgePts(a, b) {
    const A = nodeBox(a), B = nodeBox(b), ax = A.x + A.w, ay = A.y != null && A.h && a[0] === 'N' ? A.y : A.y + A.h / 2;
    const bx = B.x, by = b[0] === 'L' ? B.y + B.h / 2 : B.y;
    const mx = (ax + bx) / 2;
    return [[ax, ay], [mx, ay], [mx, by], [bx, by]];
  }
  const TRAY = L({ x: 14, y: 472, w: 772, h: 78 }, { x: 6, y: 540, w: 468, h: 154 });
  const TCARD = L({ w: 90, h: 30 }, { w: 108, h: 30 });
  const trayPos = (k) => { const cols = PHONE ? 4 : 8, cw = (TRAY.w - 16) / cols; return [TRAY.x + 8 + (k % cols) * cw + (cw - TCARD.w) / 2, TRAY.y + 34 + Math.floor(k / cols) * 36]; };
  function resetSix() {
    S.fc = { leaf: Array(7).fill(null), named: false, pop: Array(7).fill(1), cards: SIX_CARDS.map((id, k) => { const p = trayPos(k); return { id, o: orgById(id), x: p[0], y: p[1], leaf: -1, shake: 0, home: k }; }), drag: null, off: [0, 0], glow: [], hint: '', route: null, routeT: 0 };
  }
  const fcNamedOK = () => S.fc.leaf.every((v, i) => v === LEAF_ANS[i]);
  const fcNamedN = () => S.fc.leaf.filter((v, i) => v === LEAF_ANS[i]).length;
  const fcPlaced = () => S.fc.cards.filter((c) => c.leaf >= 0).length;
  function badgePos(leaf, k) { const l = FGEO.leaves[leaf]; return PHONE ? [l.x + 15 + k * 23, l.y + l.h - 10] : [l.x + l.w - 18 - k * 25, l.y + l.h / 2 + 2]; }
  function fcDown(p) {
    const q = S.fc;
    // 칸 이름 바꾸기 (흐름도 완성 미션 중에만)
    if (!q.named) for (let i = 0; i < 7; i++) { const l = FGEO.leaves[i]; if (inRect(p, l)) { q.leaf[i] = q.leaf[i] == null ? 0 : (q.leaf[i] + 1 >= 6 ? null : q.leaf[i] + 1); q.pop[i] = 0.4; SciSim.tween(q.pop, { [i]: 1 }, { duration: 0.35, ease: 'outBack' }); Sound.click(); updateCtl(); return false; } }
    if (!q.named && !(game && game.free)) return false;
    for (let i = q.cards.length - 1; i >= 0; i--) { const c = q.cards[i]; if (p.x >= c.x && p.x <= c.x + TCARD.w && p.y >= c.y && p.y <= c.y + TCARD.h) { if (c.leaf >= 0) return false; q.drag = c; q.off = [p.x - c.x, p.y - c.y]; q.cards.splice(i, 1); q.cards.push(c); Sound.tick(); return true; } }
    return false;
  }
  function fcMove(p) { const q = S.fc; if (q.drag) { q.drag.x = p.x - q.off[0]; q.drag.y = p.y - q.off[1]; } }
  function fcUp(p) {
    const q = S.fc, c = q.drag; if (!c) return; q.drag = null;
    let hit = -1; for (let i = 0; i < 7; i++) if (inRect(p, FGEO.leaves[i])) hit = i;
    if (hit < 0) { return; }
    const r = routeOf(c.o);
    if (hit === r.leaf) {
      c.leaf = hit; q.route = { path: r.path, leaf: hit }; q.routeT = 0; Sound.success();
      const m = leafMid(hit); parts.burst(m[0] + FG.lw / 2, m[1], { count: 12, colors: [KCOL[LEAF_ANS[hit]], '#fff'], speed: 110, size: 3, life: 0.7, gravity: 40 });
      showHint(c.o.n + ': ' + KN[LEAF_ANS[hit]], 2600); updateCtl();
    } else {
      c.shake = 1; Sound.fail();
      // 갈림길을 찾아 알려 줘요: 이 생물과 고른 칸의 길이 처음 달라지는 곳
      const rr_ = routeOfLeaf(hit); let msg = '그 칸이 아니에요.';
      for (let k = 0; k < r.path.length; k++) { const nodeId = r.path[k][0], mine = r.path[k][1], theirs = rr_.find((x) => x[0] === nodeId); if (theirs && theirs[1] !== mine) { msg = '"' + FGEO.N[nodeId].q + "\"에 이 생물은 '" + (mine ? '예' : '아니오') + "'예요."; break; } if (!theirs) { msg = '이 칸으로 가는 길과 다른 쪽으로 가야 해요. 흐름도의 질문을 위에서부터 답해 봐요.'; break; } }
      showHint(msg, 5200);
    }
  }
  function routeOfLeaf(i) { // 칸으로 가는 길 (노드 → 예/아니오)
    const m = { 0: [['N0', 0], ['N1', 1]], 1: [['N0', 0], ['N1', 0]], 2: [['N0', 1], ['N2', 0], ['N3', 1]], 3: [['N0', 1], ['N2', 0], ['N3', 0]], 4: [['N0', 1], ['N2', 1], ['N4', 1]], 5: [['N0', 1], ['N2', 1], ['N4', 0], ['N5', 1]], 6: [['N0', 1], ['N2', 1], ['N4', 0], ['N5', 0]] };
    return m[i];
  }
  function stepSix(dt) {
    const q = S.fc; if (!q) return;
    q.routeT = q.route ? Math.min(1.6, q.routeT + dt) : 0;
    q.cards.forEach((c) => {
      c.shake = SciSim.approach(c.shake, 0, dt, 6);
      if (c === q.drag || c.leaf >= 0) return;
      const p = trayPos(c.home); c.x = SciSim.approach(c.x, p[0], dt, 12); c.y = SciSim.approach(c.y, p[1], dt, 12);
    });
  }
  function drawSix(dt, t) {
    const q = S.fc;
    bgFill('#f0f4ee', '#eaf0f4');
    T(L(14, 8), L(30, 22) , '🌳 질문에 답하며 6계로 나누는 흐름도', L(17, 15), '#27422f', 'left', 800);
    // 가지
    const hot = {}; if (q.route) q.route.path.forEach(([n, ans]) => { hot[n] = ans; });
    EDGES.forEach(([a, b, ans]) => {
      const pts = edgePts(a, b), onRoute = q.route && ((hot[a] === ans) && (b[0] === 'L' ? +b.slice(1) === q.route.leaf || false : (hot[b] != null))) ;
      const rtOn = q.route && hot[a] === ans && (b[0] === 'N' ? hot[b] != null : +b.slice(1) === q.route.leaf);
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = rtOn ? '#f59e0b' : '#94a3b8'; ctx.lineWidth = rtOn ? 5 : 2.4;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      if (rtOn) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.6; ctx.setLineDash([8, 10]); ctx.lineDashOffset = -(t * 40); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); }
      ctx.restore();
      const lp = pts[0]; D.label(lp[0] + 18, lp[1] + (pts[3][1] > pts[0][1] ? 10 : -10), ans ? '예' : '아니오', { bg: ans ? '#16a34a' : '#64748b', size: PHONE ? 10.5 : 11.5, pad: 5 });
    });
    // 질문 상자
    FNODES.forEach((n) => {
      const g = FGEO.N[n.id], on = hot[n.id] != null;
      ctx.save(); D.shadow(() => { D.roundRect(g.x, g.y - g.h / 2, g.w, g.h, 12); ctx.fillStyle = on ? '#fff7d6' : '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
      D.roundRect(g.x, g.y - g.h / 2, g.w, g.h, 12); ctx.lineWidth = on ? 3 : 2; ctx.strokeStyle = on ? '#f59e0b' : '#a78bfa'; ctx.stroke(); ctx.restore();
      const ls = wrap(n.q, g.w - 12, FG.fs - 0.5, 800); ls.forEach((l, i) => T(g.x + g.w / 2, g.y - ((ls.length - 1) * FG.lh2) / 2 + i * FG.lh2 + 4.5, l, FG.fs - 0.5, '#3b2f63', 'center', 800));
    });
    // 칸(계 이름)
    FGEO.leaves.forEach((l, i) => {
      const v = q.leaf[i], ok = v === LEAF_ANS[i], pop = clamp(q.pop[i], 0, 1.2), named = v != null;
      ctx.save(); ctx.translate(l.x + l.w / 2, l.y + l.h / 2); ctx.scale(0.93 + 0.07 * pop, 0.93 + 0.07 * pop); ctx.translate(-l.x - l.w / 2, -l.y - l.h / 2);
      D.shadow(() => { D.roundRect(l.x, l.y, l.w, l.h, 12); ctx.fillStyle = !named ? '#fff' : q.named || ok ? KCOL[v] : '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
      D.roundRect(l.x, l.y, l.w, l.h, 12); ctx.setLineDash(named ? [] : [6, 4]); ctx.lineWidth = 2.4; ctx.strokeStyle = !named ? '#94a3b8' : (q.named || ok ? '#fff' : KCOL[v]); ctx.stroke(); ctx.setLineDash([]);
      if (!named) T(l.x + l.w / 2, l.y + l.h / 2 + 5, PHONE ? '👆 계 이름' : '👆 눌러서 계 이름 붙이기', FG.fs, '#94a3b8', 'center', 800);
      else { const al = PHONE ? 'center' : 'left', tx = PHONE ? l.x + l.w / 2 : l.x + 10; T(tx, l.y + (PHONE ? 17 : l.h / 2 - 3), KN[v], PHONE ? 13 : 15.5, q.named || ok ? '#fff' : KCOL[v], al, 800); T(tx, l.y + (PHONE ? 31 : l.h / 2 + 15), DN[KDOM[v]], PHONE ? 10.5 : 12, q.named || ok ? 'rgba(255,255,255,.85)' : '#64748b', al, 700); }
      ctx.restore();
    });
    // 카드 보관함
    panel(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 14, '#fffefa');
    T(TRAY.x + 12, TRAY.y + 22, q.named || (game && game.free) ? '🃏 카드를 끌어서 알맞은 칸에 놓아요 (' + fcPlaced() + ' / 8)' : '먼저 오른쪽 칸 7곳에 계 이름을 붙여 흐름도를 완성해요 (' + fcNamedN() + ' / 7)', L(14, 12.5), '#26324a', 'left', 800);
    q.cards.forEach((c) => { if (!(q.named || (game && game.free))) return; if (c.leaf >= 0) { const hp = trayPos(c.home); ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.6; D.roundRect(hp[0], hp[1], TCARD.w, TCARD.h, TCARD.h / 2); ctx.stroke(); ctx.restore(); return; } if (c === q.drag) return; drawSixCard(c); });
    const cntL = {}; q.cards.forEach((c) => { if (c.leaf >= 0) { const k = cntL[c.leaf] = (cntL[c.leaf] || 0); cntL[c.leaf]++; const bp = badgePos(c.leaf, k); D.sphere(bp[0], bp[1], 11, '#fff', { gloss: false, outline: '#fff' }); E(c.o.e, bp[0], bp[1] + 1, 14); } });
    if (q.drag) drawSixCard(q.drag, true);
    parts.update(dt); parts.draw(ctx);
  }
  function drawSixCard(c, lift) {
    const w = TCARD.w, h = TCARD.h, sx = c.shake > 0.02 && !RM ? Math.sin(c.shake * 30) * 4 * c.shake : 0;
    ctx.save(); ctx.translate(sx, lift ? -3 : 0);
    D.shadow(() => { D.roundRect(c.x, c.y, w, h, h / 2); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: lift ? 12 : 4, y: lift ? 6 : 1.5 });
    D.roundRect(c.x, c.y, w, h, h / 2); ctx.lineWidth = 2; ctx.strokeStyle = c.leaf >= 0 ? KCOL[c.o.k] : '#94a3b8'; ctx.stroke();
    E(c.o.e, c.x + 15, c.y + h / 2 + 1, 15); T(c.x + 29, c.y + h / 2 + 4.5, sname(c.o), L(12.5, 11.5), '#1f2d44', 'left', 800);
    ctx.restore();
  }

  /* =========================================================
     ④ 분류하기: 미지의 생물 6종의 역과 계 정하기 (+ 3역 6계 체계 그림)
     ========================================================= */
  const UNK = [
    { n: '미지의 생물 1', e: '🟢', clue: ['물 위에 녹색 덩어리로 떠 있어요.', '핵막이 없는 단세포예요.', '세포벽에 펩티도글리칸이 있어요.', '광합성을 해요.'], d: 0, k: 0 },
    { n: '미지의 생물 2', e: '♨️', clue: ['80 °C 온천에서 살아요.', '핵막이 없는 단세포예요.', '세포벽에 펩티도글리칸이 없어요.', 'rRNA 서열이 세균과 크게 달라요.'], d: 1, k: 1 },
    { n: '미지의 생물 3', e: '🫧', clue: ['연못에서 헛발로 움직이며 먹이를 삼켜요.', '핵막이 있는 단세포예요.', '세포벽이 없어요.'], d: 2, k: 2 },
    { n: '미지의 생물 4', e: '🍄', clue: ['썩은 나무 위에서 자라요.', '핵막이 있는 다세포예요.', '세포벽이 키틴이에요.', '몸 밖으로 소화액을 내 분해한 뒤 흡수해요.'], d: 2, k: 4 },
    { n: '미지의 생물 5', e: '🌱', clue: ['숲 바닥에서 자라요.', '핵막이 있는 다세포예요.', '세포벽이 셀룰로스이고 광합성을 해요.', '뿌리 · 줄기 · 잎이 분화해 있어요.'], d: 2, k: 3 },
    { n: '미지의 생물 6', e: '🪼', clue: ['바다에서 촉수로 작은 생물을 잡아 입으로 먹어요.', '핵막이 있는 다세포예요.', '세포벽이 없어요.'], d: 2, k: 5 },
  ];
  function resetApply() { S.ap = { cs: 0, dom: UNK.map(() => null), kin: UNK.map(() => null), flag: UNK.map(() => [0, 0]), pop: 1 }; }
  const apRight = () => UNK.filter((u, i) => S.ap.dom[i] === u.d && S.ap.kin[i] === u.k).length;
  const apFilled = () => UNK.filter((u, i) => S.ap.dom[i] != null && S.ap.kin[i] != null).length;
  function drawApply(dt, t) {
    const q = S.ap, u = UNK[q.cs];
    bgFill('#f1f3f9', '#eaf2ee');
    T(L(14, 8), L(30, 22), '🔎 단서를 읽고 역과 계를 정해요', L(17, 15), '#334155', 'left', 800);
    // 단서 카드
    const cx = L(14, 6), cy = L(44, 36), cw = L(380, 468), ch = L(250, 190);
    panel(cx, cy, cw, ch, 18, '#fffefa');
    E(u.e, cx + 40, cy + 44, 40);
    T(cx + 76, cy + 38, u.n, L(18, 16), '#26324a', 'left', 800); T(cx + 76, cy + 60, '현미경과 조사로 알아낸 특징', L(13.5, 12.5), '#64748b', 'left', 700);
    u.clue.forEach((c, i) => { const y = cy + 92 + i * L(34, 28); D.sphere(cx + 24, y - 4, 6, '#7c3aed', { gloss: false }); textBlock(cx + 40, y, cw - 56, c, L(15, 13.5), '#1f2d44', 20, 800); });
    // 결과 표시
    const dk = q.dom[q.cs], kn = q.kin[q.cs];
    D.label(cx + 14, cy + ch - 24, dk == null ? '역: 고르기' : DN[dk], { bg: dk == null ? '#94a3b8' : DCOL[dk], size: L(14, 13), align: 'left' });
    D.label(cx + L(150, 130), cy + ch - 24, kn == null ? '계: 고르기' : KN[kn], { bg: kn == null ? '#94a3b8' : KCOL[kn], size: L(14, 13), align: 'left' });
    // 3역 6계 체계 그림
    const px = L(410, 6), py = L(44, cy + ch + 10), pw = L(376, 468), ph = L(466, VH - (cy + ch + 10) - 8);
    panel(px, py, pw, ph, 18, '#fffefa');
    T(px + 14, py + 26, '3역 6계 체계', L(16, 15), '#26324a', 'left', 800);
    const gx = px + 14, gy = py + 40, gw = pw - 28;
    const boxes = [[0, [0]], [1, [1]], [2, [2, 3, 4, 5]]];
    let yy = gy;
    boxes.forEach(([d, ks]) => {
      const h = ks.length === 1 ? 60 : L(190, 176);
      ctx.save(); D.roundRect(gx, yy, gw, h, 14); ctx.fillStyle = DCOL[d] + '12'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = DCOL[d]; ctx.stroke(); ctx.restore();
      D.label(gx + 12, yy + 18, DN[d], { bg: DCOL[d], size: L(13.5, 12.5), align: 'left' });
      const kw = (gw - 24 - (ks.length === 1 ? 110 : 0)) / (ks.length === 1 ? 1 : 2);
      ks.forEach((k, i) => {
        const bx = ks.length === 1 ? gx + 120 : gx + 12 + (i % 2) * (kw + 6) + 0, by = ks.length === 1 ? yy + 8 : yy + 40 + Math.floor(i / 2) * (L(70, 64) + 6), bw = ks.length === 1 ? gw - 130 : kw, bh = ks.length === 1 ? 44 : L(70, 64);
        const here = q.kin[q.cs] === k, ex = UNK.map((x, ui) => ui).filter((ui) => q.kin[ui] === k && q.dom[ui] === KDOM[k]);
        ctx.save(); D.roundRect(bx, by, bw, bh, 10); ctx.fillStyle = KCOL[k] + (here ? '55' : '22'); ctx.fill(); ctx.lineWidth = here ? 3 : 1.6; ctx.strokeStyle = KCOL[k]; ctx.stroke(); ctx.restore();
        T(bx + 10, by + 22, KN[k], L(14.5, 13), '#1f2d44', 'left', 800);
        const exs = ORG.filter((o) => o.k === k).slice(0, 2).map(sname).join(' · ');
        T(bx + 10, by + 42, (PHONE ? '' : '예: ') + exs, L(12, 10.5), '#475569', 'left', 700);
        if (bh > 50) { ex.forEach((ui, n) => { E(UNK[ui].e, bx + bw - 18 - n * 24, by + 18, 16); }); } else ex.forEach((ui, n) => { E(UNK[ui].e, bx + bw - 18 - n * 24, by + 22, 16); });
      });
      yy += h + 10;
    });
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     화면 전환 · 조작 연결 · 읽음 칸
     ========================================================= */
  const LEAF_TIP = ['핵막이 없고 세포벽에 펩티도글리칸이 있는 무리예요.', '핵막이 없고 세포벽에 펩티도글리칸이 없는 무리예요.', '핵막이 있고 세포벽이 없는 다세포 생물이에요.', '핵막이 있고 세포벽이 없는 단세포 생물이에요.', '핵막과 세포벽이 있고 세포벽이 키틴이에요.', '핵막과 세포벽이 있고 광합성을 하며 뿌리 · 줄기 · 잎이 분화한 다세포예요.', '핵막과 세포벽이 있지만 키틴이 아니고 조직 분화가 약한 무리예요.'];
  const curId = () => { const m = game && game.current(); return m ? m.id : ''; };
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); hideHint(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    const curLv = game ? game.level + 1 : 1, showAll = !!(game && game.free);
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.classList.toggle('lv-off', !showAll && +b.dataset.lv !== curLv && b.dataset.mode !== S.mode); });
    const c = S.cr;
    if (c) $$('#critGrid button').forEach((b) => { const i = c.sel.indexOf(b.dataset.id); b.classList.toggle('on', i >= 0); const o = b.querySelector('.ord'); if (o) o.remove(); if (i >= 0) { const sp = document.createElement('span'); sp.className = 'ord'; sp.textContent = String(i + 1); b.prepend(sp); } });
    const r = S.rn; if (r) $('#rnNote').innerHTML = '집단을 정한 생물 <b>' + rnGrouped() + ' / 16</b>' + (r.solved ? ' · ✅ 3개의 역으로 묶였어요' : '');
    const d = S.dt; if (d) $('#dtNote').innerHTML = '고른 칸 <b>' + dtFilled() + ' / 9</b>';
    const f = S.fc; if (f) $('#sixNote').innerHTML = f.named || showAll ? '카드를 <b>끌어서</b> 알맞은 칸에 놓아요. 맞으면 지나온 질문의 길이 반짝여요. (' + fcPlaced() + ' / 8)' : '<b>오른쪽 칸을 눌러</b> 계 이름을 붙여요. 누를 때마다 이름이 바뀌어요. (' + fcNamedN() + ' / 7)';
    const a = S.ap;
    if (a) {
      $$('#apCases button').forEach((x, i) => { x.classList.toggle('on', i === a.cs); x.classList.toggle('ok', a.dom[i] === UNK[i].d && a.kin[i] === UNK[i].k); });
      $$('#apSels select').forEach((s) => { const k = +s.dataset.k; s.value = (k === 0 ? a.dom[a.cs] : a.kin[a.cs]) == null ? '' : String(k === 0 ? a.dom[a.cs] : a.kin[a.cs]); s.classList.toggle('ok', a.flag[a.cs][k] === 1); s.classList.toggle('bad', a.flag[a.cs][k] === 2); });
    }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  CRIT.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.id = c.id; b.textContent = c.n; if (!c.good) { b.classList.add('poor'); b.title = '경계가 애매한 기준'; } b.addEventListener('click', () => critToggle(c.id)); $('#critGrid').appendChild(b); });
  $$('#apCases button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ap.cs = +b.dataset.c; updateCtl(); }));
  function buildSel2(box, label, opts, kk, onPick) {
    const row = document.createElement('div'); row.className = 'sel-row'; row.innerHTML = '<div class="q">' + label + '</div>';
    const sel = document.createElement('select'); sel.className = 'sel-in'; sel.dataset.k = kk; sel.setAttribute('aria-label', label);
    sel.innerHTML = '<option value="">고르기</option>' + opts.map((o, j) => '<option value="' + j + '">' + o + '</option>').join('');
    sel.addEventListener('change', () => { onPick(sel.value === '' ? null : +sel.value); Sound.click(); updateCtl(); });
    row.appendChild(sel); box.appendChild(row);
  }
  buildSel2($('#apSels'), '이 생물은 어느 역일까요?', DN, 0, (v) => { S.ap.dom[S.ap.cs] = v; S.ap.flag[S.ap.cs][0] = 0; });
  buildSel2($('#apSels'), '이 생물은 어느 계일까요?', KN, 1, (v) => { S.ap.kin[S.ap.cs] = v; S.ap.flag[S.ap.cs][1] = 0; });

  SciSim.pointer(view, {
    down(p) { if (S.mode === 'rrna') return rnPick(p); if (S.mode === 'dtable') return dtDown(p); if (S.mode === 'six') return fcDown(p); return false; },
    move(p) { if (S.mode === 'six') fcMove(p); },
    up(p) { if (S.mode === 'six') fcUp(p); },
    hover(p) {
      if (S.mode === 'six') { if (!S.fc.named && FGEO.leaves.some((l) => inRect(p, l))) return 'pointer'; return S.fc.cards.some((c) => c.leaf < 0 && p.x >= c.x && p.x <= c.x + TCARD.w && p.y >= c.y && p.y <= c.y + TCARD.h) && (S.fc.named || (game && game.free)) ? 'grab' : 'default'; }
      if (S.mode === 'dtable') { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (inRect(p, dtCell(i, j))) return 'pointer'; }
      if (S.mode === 'rrna') { for (let i = 0; i < 16; i++) if (inRect(p, rowRect(i))) return 'pointer'; }
      return 'default';
    },
  });

  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c; const m = S.mode;
    if (m === 'crit') { const q = S.cr; L1 = '기준 ①'; a = q.sel[0] ? CRIT.find((x) => x.id === q.sel[0]).n : '—'; L2 = '기준 ②'; b = q.sel[1] ? CRIT.find((x) => x.id === q.sel[1]).n : '—'; L3 = '묶음(빈 칸 제외)'; c = q.zones.filter((z) => z.items.length).length + '개'; }
    else if (m === 'rrna') { L1 = '집단을 정한 생물'; a = rnGrouped() + ' / 16'; L2 = '같은 역 안 최대 차이'; b = DSTAT.wMax + '개'; L3 = '다른 역 사이 차이'; c = DSTAT.bMin + ' ~ ' + DSTAT.bMax + '개'; }
    else if (m === 'dtable') { L1 = '고른 칸'; a = dtFilled() + ' / 9'; L2 = '맞게 고른 칸'; b = dtRight() + ' / 9'; L3 = '비교한 역'; c = '3개'; }
    else if (m === 'six') { L1 = '이름 붙인 칸'; a = fcNamedN() + ' / 7'; L2 = '놓은 카드'; b = fcPlaced() + ' / 8'; L3 = '계 이름'; c = '6가지'; }
    else { L1 = '분류한 생물'; a = apFilled() + ' / 6'; L2 = '맞게 분류'; b = apRight() + ' / 6'; L3 = '고른 생물'; c = UNK[S.ap.cs].n.replace('미지의 생물 ', '') + '번'; }
    const key = [L1, a, L2, b, L3, c].join('|'); if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function autoFill() {
    if (!S.rn.solved) { S.rn.grp = DOMOF.map((d) => d + 1); rnSolve(); } S.rn.glow = 1;
    S.dt.pick = DT_ROWS.map((r) => r.ans.slice()); S.dt.flag = DT_ROWS.map(() => [1, 1, 1]);
    S.fc.leaf = LEAF_ANS.slice(); S.fc.named = true; S.fc.cards.forEach((c) => { c.leaf = routeOf(c.o).leaf; });
    S.ap.dom = UNK.map((u) => u.d); S.ap.kin = UNK.map((u) => u.k); S.ap.flag = UNK.map(() => [1, 1]);
    updateCtl();
  }

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '분류 기준: 무엇으로 나눌까?', short: '분류 기준', icon: '🗂️', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 지구의 수많은 생물을 누구나 같은 방식으로 정리하려면 무엇을 기준으로 삼아야 할까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 생물학적 종과 5계 분류(원핵생물계 · 원생생물계 · 식물계 · 균계 · 동물계)를 배웠어요. 이번 차시는 그 내용을 되풀이하지 않고, <b>분류 기준</b>에 따라 묶음이 달라지는 것과 이를 <b>3역 6계</b>로 넓히는 과정을 알아봐요.</div>' +
        '<p>생물 카드 16장을 <b>핵막 · 세포 수 · 세포벽 · 영양 방식</b> 기준으로 나누어 보면서 좋은 분류 기준의 조건을 찾아봐요.</p>',
      features: ['crit'],
      setup() { resetCrit(); setMode('crit'); },
      recap: '기준이 달라지면 묶음도 달라져요. 좋은 분류 기준은 모든 생물에 적용되고 차이가 뚜렷해 애매한 생물이 없는 기준이에요.',
      summary: '<ul><li><b>분류 기준</b>: 핵막 유무(원핵 · 진핵), 세포 수(단세포 · 다세포), 세포벽 성분(펩티도글리칸, 셀룰로스, 키틴 등), 영양 방식(광합성 독립 영양 · 섭취와 흡수 종속 영양).</li><li>기준을 바꾸면 같은 생물 16종도 다르게 묶여요. 곰팡이와 사람은 영양 방식으로는 같은 종속 영양이지만 세포벽으로는 달라요.</li><li><b>좋은 기준의 조건</b>: ① 모든 생물에 적용된다 ② 차이가 뚜렷해 애매한 생물이 없다. ("사는 곳"은 물 · 땅에 모두 사는 생물이 있어 좋지 않아요.)</li></ul>',
      missions: [
        {
          id: 'two', title: '기준 2개로 분류하기',
          goal: '<b>핵막 · 세포 수 · 세포벽 · 영양 방식</b> 중 서로 다른 <b>기준 2개</b>를 골라 생물 카드 16장을 나누어 보세요.',
          hint: '기준 버튼을 처음 누르면 기준 ①, 다른 버튼을 또 누르면 기준 ②가 돼요. "사는 곳"은 경계가 애매한 기준이라 이번 미션에서는 제외해요.',
          setup() { setMode('crit'); },
          check: () => crOK(), hold: 0.8,
          status: () => '기준 ① ' + (S.cr.sel[0] ? CRIT.find((x) => x.id === S.cr.sel[0]).n : '—') + ' &nbsp; 기준 ② ' + (S.cr.sel[1] ? CRIT.find((x) => x.id === S.cr.sel[1]).n : '—') + (S.cr.sel.indexOf('hab') >= 0 ? ' (사는 곳은 제외해요)' : ''),
          explain: '핵막으로는 진핵생물 12종과 원핵생물 4종으로, 세포벽 성분으로는 5무리로 나뉘어요. <b>기준이 달라지면 묶음도 달라져요.</b> 좋은 기준은 ① 모든 생물에 적용되고 ② 차이가 뚜렷해요. "사는 곳"은 물 · 땅에 모두 사는 생물이 있어 좋은 기준이 아니에요.',
        },
        {
          type: 'quiz', title: '곰팡이와 사람, 영양 방식으로는?', setup() { setMode('crit'); },
          goal: '푸른곰팡이와 사람을 <b>영양 방식</b> 기준으로 나누면 어떻게 될까요?',
          choices: ['곰팡이는 광합성을 하는 독립 영양이라 서로 다른 쪽에 묶인다', '사람은 화학 합성을 하므로 서로 다른 쪽에 묶인다', '둘 다 양분을 섭취하거나 흡수하는 종속 영양이라 같은 쪽으로 묶이지만, 세포벽 같은 다른 기준으로는 달라진다', '영양 방식으로는 두 생물을 구분할 수 없다'],
          answer: 2,
          feedback: ['곰팡이는 광합성을 하지 않고 몸 밖에서 분해해 흡수하는 종속 영양이에요.', '사람은 음식물을 섭취하는 종속 영양이에요.', '', '영양 방식은 종속 영양 · 광합성 독립 영양 등으로 구분하는 기준이에요. 이 기준에서 두 생물이 같은 쪽에 묶일 뿐이에요.'],
          explain: '두 생물 모두 <b>종속 영양</b>이라 영양 방식으로는 같은 쪽이지만, 곰팡이는 <b>키틴 세포벽</b>이 있고 사람은 세포벽이 없어요. 어떤 기준을 쓰느냐에 따라 묶음이 달라져요.',
        },
      ],
    },
    {
      title: '3역: 서열이 알려 주는 큰 무리', short: '3역 구분', icon: '🧬', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 기준에 따라 묶음이 달라지는 것을 확인했어요. 그런데 눈에 보이는 형질만으로는 원핵생물들을 더 나누기 어려워요. 이번에는 모든 생물이 가진 <b>리보솜 RNA(rRNA)의 염기 서열 차이</b>를 기준으로 삼아요.</div>' +
        '<p>16종의 가상 rRNA 서열(12염기)에서 차이 수가 작은 것끼리 묶으면 <b>3개의 큰 무리</b>가 나타나요. 이 무리를 <b>역</b>이라고 해요. 세균역 · 고세균역 · 진핵생물역을 비교표로 정리해요.</p>',
      features: ['rrna', 'dtable'],
      setup() { resetRrna(); resetDtable(); setMode('rrna'); },
      recap: 'rRNA 염기 서열의 차이가 큰 3집단으로 나뉘어 생물을 세균역, 고세균역, 진핵생물역의 3역으로 구분해요. 고세균은 세균과 달리 세포벽에 펩티도글리칸이 없어요.',
      summary: '<ul><li><b>3역</b>: 세균역 · 고세균역 · 진핵생물역. 근거는 rRNA 염기 서열의 차이가 큰 3집단이에요.</li><li>세균역과 고세균역은 핵막이 없는 원핵생물이에요. 세균은 세포벽에 <b>펩티도글리칸</b>이 있고, 고세균은 없어요. 고세균은 고온 · 고염 · 무산소 같은 극한 환경에서 많이 발견돼요.</li><li>진핵생물역은 핵막이 있고 세포벽은 종에 따라 달라요. 실제 rRNA 분석에서 고세균은 세균보다 진핵생물과 더 가까운 점이 있어요.</li></ul>',
      missions: [
        {
          id: 'group', title: '3집단으로 묶기',
          goal: '<b>서열 차이가 작은 것끼리</b> 같은 색으로 칠해 16종을 <b>3개의 집단</b>으로 묶으세요.',
          hint: '표에서 같은 집단끼리는 숫자가 작고(0~' + DSTAT.wMax + '), 다른 집단과는 숫자가 커요(' + DSTAT.bMin + '~' + DSTAT.bMax + '). 표의 칸을 눌러 두 서열을 비교해 보세요.',
          manual: true, setup() { setMode('rrna'); },
          check: () => { const e = rnEval(); return e.ok ? true : e.msg; },
          explain: '같은 집단 안에서는 서열 차이가 <b>' + DSTAT.wMax + ' 이하</b>이고, 다른 집단과는 <b>' + DSTAT.bMin + '~' + DSTAT.bMax + '</b>로 크게 달라요. 이렇게 나뉘는 3집단이 <b>세균역 · 고세균역 · 진핵생물역</b>이에요. 서열 차이를 표에서 가까운 것끼리 묶으면 표가 3개의 밝은 덩어리로 정리돼요.',
        },
        {
          id: 'dtable', title: '3역 비교표 완성',
          goal: '<b>세균역 · 고세균역 · 진핵생물역</b>을 핵막, 세포벽 성분, 서식지로 비교하는 표 9칸을 채우세요.',
          hint: '칸을 누르면 보기가 차례로 바뀌어요. 세균과 고세균은 모두 핵막이 없지만 세포벽 성분이 달라요.',
          manual: true, setup() { setMode('dtable'); },
          check: () => {
            const q = S.dt; let first = null;
            DT_ROWS.forEach((r, i) => r.ans.forEach((a, j) => { q.flag[i][j] = q.pick[i][j] == null ? 0 : q.pick[i][j] === a ? 1 : 2; }));
            for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { if (q.pick[i][j] == null) return '아직 고르지 않은 칸이 있어요. (' + DT_ROWS[i].n + ' · ' + DN[j] + ')'; if (q.pick[i][j] !== DT_ROWS[i].ans[j] && first == null) first = [i, j]; }
            if (first) return DN[first[1]] + '의 "' + DT_ROWS[first[0]].n + '" 칸을 다시 생각해 봐요.';
            return true;
          },
          explain: '세균역과 고세균역은 <b>핵막이 없어요</b>. 세균은 세포벽에 <b>펩티도글리칸</b>이 있지만 고세균은 없고, 고세균은 극한 환경에서 많이 발견돼요. 진핵생물역은 <b>핵막이 있고</b> 세포벽은 종에 따라 달라요.',
        },
        {
          type: 'quiz', title: '고세균을 세균과 구분하는 근거', setup() { setMode('dtable'); },
          goal: '고세균을 세균과 <b>다른 역</b>으로 구분하는 가장 알맞은 근거는?',
          choices: ['둘 다 핵막이 없으므로 같은 역으로 묶어야 한다', '세포벽에 펩티도글리칸이 없고 rRNA 염기 서열이 세균과 크게 다르다', '고세균은 모두 광합성을 한다', '고세균은 다세포 생물이고 세균은 단세포 생물이다'],
          answer: 1,
          feedback: ['핵막이 없는 것은 둘의 공통점이에요. 공통점만으로는 구분할 수 없어요.', '', '고세균 중에는 광합성을 하지 않는 것이 많아요. 구분 근거가 아니에요.', '세균과 고세균은 모두 단세포 원핵생물이에요.'],
          explain: '세균과 고세균은 모두 핵막이 없는 원핵생물이지만, 고세균은 <b>세포벽에 펩티도글리칸이 없고</b> <b>rRNA 서열이 크게 달라서</b> 다른 역으로 구분해요.',
        },
      ],
    },
    {
      title: '6계: 질문으로 나누는 흐름도', short: '6계 구분', icon: '🌳', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 생물을 3개의 역으로 나누었어요. 역을 더 작게 나눈 단계가 <b>계</b>예요. 세균역은 진정세균계, 고세균역은 고세균계이고, 진핵생물역은 <b>원생생물계 · 식물계 · 균계 · 동물계</b>의 4개 계로 나뉘어요. (모두 6계)</div>' +
        '<p>핵막, 세포벽, 세포 수, 키틴, 광합성과 조직 분화를 차례로 묻는 <b>흐름도</b>를 완성하고, 생물 카드를 알맞은 칸에 놓아 6계로 분류해요.</p>',
      features: ['six'],
      setup() { resetSix(); setMode('six'); },
      recap: '핵막, 세포벽, 세포 수, 키틴, 광합성과 조직 분화 같은 질문을 차례로 던져 생물을 6개의 계로 나눌 수 있어요.',
      summary: '<ul><li><b>6계</b>: 진정세균계(세균역), 고세균계(고세균역), 원생생물계 · 식물계 · 균계 · 동물계(진핵생물역).</li><li>진정세균계는 대장균, 시아노박테리아 / 고세균계는 메테인 생성균, 호염성 고세균 / 원생생물계는 아메바, 짚신벌레, 유글레나, 다시마(단세포이거나 단순한 다세포, 조직 분화 약함) / 식물계는 이끼, 고사리, 소나무(광합성 다세포) / 균계는 효모, 푸른곰팡이, 버섯(키틴 세포벽, 몸 밖에서 분해해 흡수) / 동물계는 해파리, 사람(다세포, 섭취, 세포벽 없음)이에요.</li><li>다시마는 다세포이고 광합성을 하지만 뿌리 · 줄기 · 잎 같은 조직이 뚜렷하지 않아 식물계가 아니라 원생생물계예요.</li></ul>',
      missions: [
        {
          id: 'flow', title: '흐름도 완성',
          goal: '흐름도 오른쪽 <b>7개 칸</b>을 눌러 알맞은 <b>계 이름</b>을 붙이세요. (원생생물계가 두 곳이에요)',
          hint: '질문의 "예 / 아니오" 가지를 따라가며 어떤 생물이 모이는지 생각해요. 핵막이 없는 두 칸은 세포벽의 펩티도글리칸으로 나뉘어요.',
          manual: true, setup() { setMode('six'); updateCtl(); },
          check: () => {
            const q = S.fc; const n = q.leaf.filter((v) => v != null).length;
            q.flag = q.leaf.map((v, i) => (v == null ? 0 : v === LEAF_ANS[i] ? 1 : 2));
            if (n < 7) return '아직 이름을 붙이지 않은 칸이 ' + (7 - n) + '곳 있어요.';
            const w = q.leaf.findIndex((v, i) => v !== LEAF_ANS[i]);
            if (w >= 0) return '위에서 ' + (w + 1) + '번째 칸의 이름을 다시 생각해 봐요. ' + LEAF_TIP[w];
            return true;
          },
          explain: '핵막이 <b>없으면</b> 세포벽의 펩티도글리칸 여부로 <b>진정세균계 / 고세균계</b>로 나뉘어요. 핵막이 <b>있으면</b> 세포벽이 없는 다세포는 <b>동물계</b>, 단세포는 <b>원생생물계</b>예요. 세포벽이 키틴이면 <b>균계</b>, 아니면 광합성을 하고 조직이 분화한 다세포는 <b>식물계</b>, 나머지는 <b>원생생물계</b>예요.',
        },
        {
          id: 'cards', title: '카드 8장 분류하기',
          goal: '생물 카드 8장을 끌어서 알맞은 칸에 놓으세요. 맞게 놓으면 지나온 길이 반짝여요.',
          hint: '카드를 끌어 칸 위에서 놓아요. 틀리면 어떤 질문에서 길이 갈렸는지 알려 줘요. 다시마와 효모는 조심해요.',
          setup() { setMode('six'); },
          check: () => fcPlaced() === 8, hold: 0.8,
          status: () => '놓은 카드 ' + fcPlaced() + ' / 8',
          explain: '다시마는 다세포이고 광합성을 하지만 조직 분화가 약해서 <b>원생생물계</b>, 효모는 단세포여도 세포벽이 키틴이라 <b>균계</b>예요. 단세포인지 다세포인지만으로는 계가 정해지지 않아요.',
        },
        {
          type: 'quiz', title: '다시마와 이끼는 같은 계일까?', setup() { setMode('six'); },
          goal: '다시마와 이끼는 같은 계일까요?',
          choices: ['같다. 둘 다 다세포이고 광합성을 하므로 모두 식물계이다', '다르다. 이끼는 식물계이고, 다시마는 조직 분화가 약한 원생생물계이다', '다르다. 다시마는 균계이고 이끼는 식물계이다', '같다. 둘 다 물속에 살기 때문에 원생생물계이다'],
          answer: 1,
          feedback: ['광합성을 하는 다세포라도 뿌리 · 줄기 · 잎 같은 조직이 뚜렷이 분화해야 식물계예요.', '', '다시마는 광합성을 하는 생물이에요. 키틴 세포벽도 없어서 균계가 아니에요.', '이끼는 주로 땅 위의 습한 곳에 살아요. 사는 곳은 계를 나누는 기준이 아니에요.'],
          explain: '이끼는 광합성을 하는 다세포이고 조직이 분화해 <b>식물계</b>예요. 다시마는 <b>조직 분화가 약한 다세포</b>라서 <b>원생생물계</b>예요.',
        },
      ],
    },
    {
      title: '분류하기: 미지의 생물 6종', short: '분류하기', icon: '🔎', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 질문 흐름도로 6계를 나누었어요. 이번에는 <b>특징 설명만 보고</b> 생물의 역과 계를 스스로 정해요.</div>' +
        '<p>미지의 생물 6종의 단서를 읽고 <b>역</b>과 <b>계</b>를 정한 뒤, 흔한 오개념 세 가지를 바로잡아요.</p>',
      features: ['apply'],
      setup() { resetApply(); setMode('apply'); },
      recap: '생물은 핵막, 세포벽 성분, 세포 수, 영양 방식 같은 특징과 rRNA 서열로 3역 6계 중 어디에 속하는지 정할 수 있어요.',
      summary: '<ul><li><b>3역 6계</b>: 세균역(진정세균계), 고세균역(고세균계), 진핵생물역(원생생물계 · 식물계 · 균계 · 동물계).</li><li>버섯은 식물이 아니라 <b>균계</b>예요(광합성을 하지 않고 키틴 세포벽, 몸 밖에서 분해해 흡수).</li><li>세균은 모두 같은 무리가 아니에요. 핵막이 없는 생물은 <b>세균역</b>과 <b>고세균역</b>으로 나뉘어요.</li><li>해조류(다시마, 미역 등)는 조직 분화가 약해 식물계가 아니라 <b>원생생물계</b>예요.</li></ul>',
      missions: [
        {
          id: 'unk', title: '미지의 생물 6종 분류',
          goal: '단서를 읽고 6종 모두의 <b>역</b>과 <b>계</b>를 정하세요. (12칸)',
          hint: '핵막 → 세포벽 성분 → 세포 수 → 영양 방식 순서로 흐름도를 떠올려요. 계는 역 안에 속해요. 진핵생물역에는 4개 계가 있어요.',
          manual: true, setup() { setMode('apply'); updateCtl(); },
          check: () => {
            const q = S.ap; let first = null;
            UNK.forEach((u, i) => { q.flag[i][0] = q.dom[i] == null ? 0 : q.dom[i] === u.d ? 1 : 2; q.flag[i][1] = q.kin[i] == null ? 0 : q.kin[i] === u.k ? 1 : 2; });
            for (let i = 0; i < 6; i++) { if (q.dom[i] == null || q.kin[i] == null) return UNK[i].n.replace('미지의 생물 ', '') + '번 생물의 ' + (q.dom[i] == null ? '역' : '계') + '을(를) 아직 고르지 않았어요.'; if (first == null && (q.dom[i] !== UNK[i].d || q.kin[i] !== UNK[i].k)) first = i; }
            if (first != null) { const u = UNK[first]; if (q.kin[first] != null && KDOM[q.kin[first]] !== q.dom[first]) return (first + 1) + '번 생물: 고른 계는 고른 역에 속하지 않아요. 진핵생물역에는 원생생물계 · 식물계 · 균계 · 동물계가 있어요.'; return (first + 1) + '번 생물의 ' + (q.dom[first] !== u.d ? '역' : '계') + '을(를) 단서로 다시 확인해 봐요.'; }
            return true;
          },
          explain: '1번 <b>세균역 · 진정세균계</b>(핵막 없음, 펩티도글리칸, 광합성), 2번 <b>고세균역 · 고세균계</b>(펩티도글리칸 없음, 극한 환경), 3번 <b>진핵생물역 · 원생생물계</b>(핵막 있는 단세포), 4번 <b>균계</b>(키틴, 몸 밖에서 분해해 흡수), 5번 <b>식물계</b>(셀룰로스, 광합성, 조직 분화), 6번 <b>동물계</b>(세포벽 없는 다세포, 섭취)예요.',
        },
        {
          type: 'quiz', title: '버섯은 식물일까?', setup() { setMode('apply'); },
          goal: '느타리버섯은 식물일까요?',
          choices: ['식물이다. 땅에서 자라고 움직이지 않기 때문이다', '식물이 아니다. 광합성을 하지 않고 키틴 세포벽을 가지며 몸 밖에서 분해해 흡수하는 균계이다', '동물이다. 양분을 섭취해서 살기 때문이다', '세균이다. 크기가 작기 때문이다'],
          answer: 1,
          feedback: ['땅에서 자라는 것은 계를 나누는 기준이 아니에요. 버섯은 광합성을 하지 못해요.', '', '동물은 세포벽이 없고 입으로 섭취해요. 버섯은 몸 밖에서 분해해 흡수해요.', '버섯은 핵막이 있는 진핵생물이에요.'],
          explain: '버섯은 <b>균계</b>예요. 광합성을 하지 않고 <b>키틴 세포벽</b>이 있으며 몸 밖에서 분해한 양분을 <b>흡수</b>해요.',
        },
        {
          type: 'quiz', title: '세균은 모두 같은 무리일까?', setup() { setMode('apply'); },
          goal: '핵막이 없는 단세포 생물을 모두 "세균"이라고 부르면 될까요?',
          choices: ['그렇다. 핵막이 없으면 모두 세균역이다', '아니다. 핵막이 없는 생물은 세균역(진정세균계)과 고세균역(고세균계)으로 나뉜다', '그렇다. 모든 원핵생물은 세포벽 성분이 같다', '아니다. 일부 세균은 핵막이 있다'],
          answer: 1,
          feedback: ['고세균도 핵막이 없지만 세균과는 rRNA 서열이 크게 달라 다른 역이에요.', '', '세균은 펩티도글리칸 세포벽이 있고 고세균은 없어요. 성분이 달라요.', '세균은 핵막이 없는 원핵생물이에요.'],
          explain: '핵막이 없는 생물은 <b>세균역</b>(진정세균계)과 <b>고세균역</b>(고세균계)으로 나뉘어요. 세포벽 성분과 rRNA 서열이 달라요.',
        },
        {
          type: 'quiz', title: '해조류와 식물은 같은 계일까?', setup() { setMode('apply'); },
          goal: '미역, 김 같은 해조류를 식물계가 아니라 <b>원생생물계</b>로 분류하는 근거는?',
          choices: ['물속에 살기 때문이다', '뿌리 · 줄기 · 잎 같은 조직이 뚜렷이 분화하지 않은 단순한 다세포 생물이기 때문이다', '광합성을 하지 못하기 때문이다', '세포벽이 키틴이기 때문이다'],
          answer: 1,
          feedback: ['사는 곳은 계를 나누는 기준이 아니에요. 물에 사는 식물도 있어요.', '', '해조류도 광합성을 해요. 그래서 식물과 닮았지만 조직 분화에서 달라요.', '키틴 세포벽은 균계의 특징이에요.'],
          explain: '해조류는 광합성을 하는 다세포 생물이지만 <b>조직 분화가 약해서</b> 식물계가 아니라 <b>원생생물계</b>로 분류해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-domain-kingdom', mount: '#game', badge: '분류학 탐험가', homeHref: '../../index.html#hb',
    featureLabels: { crit: '🗂️ 분류 기준 고르기', rrna: '🧬 rRNA 서열 차이 표', dtable: '📋 3역 비교표', six: '🌳 6계 흐름도와 카드', apply: '🔎 미지의 생물 분류' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetCrit(); resetRrna(); resetDtable(); resetSix(); resetApply();
  setMode('crit');
  let lastFree = false, lastMode = '', lastMission = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    const cmid = curId(); if (cmid !== lastMission) { lastMission = cmid; updateCtl(); }
    view.apply();
    stepCrit(dt); stepRrna(dt); stepSix(dt);
    switch (S.mode) {
      case 'crit': drawCrit(dt, t); break;
      case 'rrna': drawRrna(dt, t); break;
      case 'dtable': drawDtable(dt, t); break;
      case 'six': drawSix(dt, t); break;
      default: drawApply(dt, t);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,244,238,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    const cm = game && game.current();
    if (game && game.phase === 'success' && cm) {
      if (cm.id === 'group' && !S.rn.solved) { rnSolve(); updateCtl(); }
      if (cm.id === 'flow' && !S.fc.named) { S.fc.named = true; S.fc.leaf = LEAF_ANS.slice(); updateCtl(); }
    }
    if (game && game.free && !S.filled) { S.filled = true; autoFill(); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, levels, ORG, CRIT, DM, DOMOF, DSTAT, SEQ, RM_, RLIST, rowRect, DTC, dtCell, DT_ROWS, FGEO, LEAF_ANS, routeOf, TCARD, trayPos, UNK, KN, DN, KDOM, autoFill, critToggle, rnEval, chipW, SIX_CARDS,
  };
})();
