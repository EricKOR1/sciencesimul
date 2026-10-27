/* 화학 Ⅳ. 역동적인 화학 반응 - 표준 용액 만들기 [12화학04-02]
   ① 예측: 필요량 계산 (몰 → 질량, 도구 고르기) ② 실험: 용액 제조 (달기 → 녹이기 → 옮기기 → 표선 → 섞기)
   ③ 분석: 오차 찾기 (n 또는 V가 바뀌는 실수) ④ 적용: 희석 제조 (피펫, M₁V₁ = M₂V₂, 라벨)
   NaOH의 표정(농도 확인) 과정은 다루지 않아요. */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 760 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const INK = '#26324a', MUTED = '#5a6679', PUR = '#8b5cf6', BG = '#f3f0fb';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(str).split('\n').forEach((ln, li) => {
      if (li) { out.push(line.trimEnd()); line = ''; }
      const toks = ln.match(/[가-힣]|\s+|[^\s가-힣]+/g) || [];
      for (const tk of toks) {
        if (tk.trim() === '') { if (line) line += tk; continue; }
        const t = line + tk;
        if (ctx.measureText(t).width > maxW && line.trim()) { out.push(line.trimEnd()); line = tk; } else line = t;
      }
    });
    if (line) out.push(line.trimEnd());
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
  const parseNum = (s) => { const t = String(s).replace(',', '.').replace(/[−–]/g, '-').replace(/[^0-9.\-]/g, ''); return t === '' || isNaN(+t) ? NaN : +t; };
  const near = (v, a, tol) => !isNaN(v) && Math.abs(v - a) <= tol;
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const ap = SciSim.approach;

  /* ---------- 숫자 표기 ---------- */
  const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const supStr = (n) => String(n).split('').map((c) => (c === '-' ? '⁻' : SUPD[+c])).join('');
  function sciParts(x, dig) {
    if (!(x > 0)) return ['0', 0];
    let e = Math.floor(Math.log10(x) + 1e-9), m = +(x / Math.pow(10, e)).toPrecision(dig || 2);
    if (m >= 10) { m = +(m / 10).toPrecision(dig || 2); e++; }
    return [m.toFixed(Math.max(0, (dig || 2) - 1)), e];
  }
  const sci = (x, dig) => { const q = sciParts(x, dig); return q[0] + '×10' + supStr(q[1]); };
  const fm = (v, d) => String(+v.toFixed(d == null ? 3 : d));
  const f1 = (v) => v.toFixed(1);
  const f2 = (v) => v.toFixed(2);
  const MINUS = '−';

  /* ---------- 상태 (공통) ---------- */
  const S = { mode: '', sub: {}, gate: '', fade: 0, t: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function setRead(L1, a, L2, b, L3, c) {
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    const tb = $('#tbLabel'); if (tb && typeof MODE_LABEL !== 'undefined') tb.textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-gate')) on = n.getAttribute('data-gate').split(' ').indexOf(S.gate) >= 0;
      if (on && n.hasAttribute('data-gate-off')) on = S.gate !== n.getAttribute('data-gate-off');
      if (on && n.hasAttribute('data-sub')) on = S.sub[S.mode] === n.getAttribute('data-sub');
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (typeof uiExtra === 'function') uiExtra();
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  /* 보기 전환 단추: <div class="segmented" data-subsel="모드"> <button data-v="..."> */
  $$('[data-subsel]').forEach((box) => box.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; Sound.click();
    S.sub[box.dataset.subsel] = b.dataset.v; S.fade = 0.5;
    $$('button', box).forEach((x) => x.classList.toggle('on', x === b));
    updateCtl();
  }));
  function syncSubsel() { $$('[data-subsel]').forEach((box) => $$('button', box).forEach((x) => x.classList.toggle('on', S.sub[box.dataset.subsel] === x.dataset.v))); }

  /* ---------- 입력 칸 (십진수 / 과학적 표기) ---------- */
  function mkRow(host, sp, onChange) {
    const w = document.createElement('div'); w.className = sp.sci ? 'sci-line' : 'row-line';
    const lab = document.createElement('span'); lab.className = 'lab'; lab.innerHTML = sp.label; w.appendChild(lab);
    const box = document.createElement('div'); box.className = sp.sci ? 'sci-in' : 'in-wrap'; w.appendChild(box);
    const mk = (cls, ph, mode) => { const i = document.createElement('input'); i.type = 'text'; i.className = 'num-in ' + (cls || ''); i.inputMode = mode || 'decimal'; i.autocomplete = 'off'; i.placeholder = ph || ''; return i; };
    const r = { sp, el: w, ok: false };
    if (sp.sci) {
      r.c = mk('c', '1.0'); r.e = mk('e', '지수', 'text');
      const x = document.createElement('span'); x.className = 'x'; x.textContent = '×10';
      const u = document.createElement('span'); u.className = 'x'; u.textContent = sp.unit || '';
      box.append(r.c, x, r.e, u); r.ins = [r.c, r.e];
    } else {
      r.i = mk('', sp.ph || '0'); box.appendChild(r.i);
      if (sp.unit) { const u = document.createElement('span'); u.className = 'unit'; u.textContent = sp.unit; box.appendChild(u); }
      r.ins = [r.i];
    }
    r.read = () => (sp.sci ? (() => { const c = parseNum(r.c.value), e = parseNum(r.e.value); return isNaN(c) || isNaN(e) ? NaN : c * Math.pow(10, e); })() : parseNum(r.i.value));
    r.test = () => { const v = r.read(); if (isNaN(v)) return null; return sp.sci ? Math.abs(v / sp.ans - 1) <= (sp.rel || 0.03) : near(v, sp.ans, sp.tol); };
    r.paint = (showBad) => {
      const t = r.test(); r.ok = t === true;
      r.ins.forEach((i) => { i.classList.toggle('ok', t === true); if (t !== false) i.classList.remove('bad'); else if (showBad) i.classList.add('bad'); });
    };
    r.clear = () => { r.ins.forEach((i) => { i.value = ''; i.classList.remove('ok', 'bad'); }); r.ok = false; };
    r.setAns = () => { if (sp.sci) { const q = sciParts(sp.ans, 2); r.c.value = q[0]; r.e.value = q[1]; } else r.i.value = sp.show != null ? sp.show : String(sp.ans); r.paint(false); };
    r.ins.forEach((i) => {
      i.addEventListener('input', () => { const was = r.ok; r.paint(false); if (r.ok && !was) Sound.tick(); onChange && onChange(r, false); });
      i.addEventListener('change', () => { r.paint(true); onChange && onChange(r, true); });
    });
    host.appendChild(w);
    return r;
  }
  function numIn(el) { return parseNum(el.value); }

  /* ---------- 눈금 있는 비커 (유리) : 안쪽 기하를 돌려줌 ---------- */
  function beaker(x, y, w, h, o) {
    o = o || {};
    const ix = x + 5, iw = w - 10, iy = y + 5, ih = h - 11;
    const level = clamp(o.level == null ? 0 : o.level, 0, 1), ly = iy + ih * (1 - level);
    const rad = Math.min(14, w * 0.15);
    const path = (px, py, pw, ph, r) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph - r); ctx.quadraticCurveTo(px, py + ph, px + r, py + ph); ctx.lineTo(px + pw - r, py + ph); ctx.quadraticCurveTo(px + pw, py + ph, px + pw, py + ph - r); ctx.lineTo(px + pw, py); };
    // 유리 바닥 · 그림자
    D.shadow(() => { path(x, y, w, h, rad); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fillStyle = 'rgba(235,244,255,.75)'; ctx.fill(); }, { blur: 9, y: 4 });
    // 액체
    if (level > 0.002) {
      ctx.save(); path(ix, iy, iw, ih, Math.max(4, rad - 4)); ctx.closePath(); ctx.clip();
      const g = ctx.createLinearGradient(0, ly, 0, iy + ih);
      const c = o.color || '#9bc8ff'; g.addColorStop(0, C.rgba(c, o.alpha != null ? o.alpha : 0.62)); g.addColorStop(1, C.rgba(C.shade(c, -0.18), Math.min(0.95, (o.alpha != null ? o.alpha : 0.62) + 0.18)));
      ctx.fillStyle = g; ctx.fillRect(ix, ly, iw, iy + ih - ly);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(ix, ly, iw, 2.5);
      ctx.restore();
    }
    // 눈금
    (o.ticks || []).forEach((tk) => {
      const ty = iy + ih * (1 - tk.f);
      ctx.strokeStyle = 'rgba(70,90,120,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + w - 2, ty); ctx.lineTo(x + w - (tk.long ? 20 : 12), ty); ctx.stroke();
      if (tk.label) T(x + w + 5, ty + 4.5, tk.label, 13, MUTED, 'left', 700);
    });
    // 유리 테두리 · 반사광
    ctx.strokeStyle = 'rgba(70,100,140,.7)'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; path(x, y, w, h, rad); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 9, y + 12); ctx.lineTo(x + 9, y + h - rad - 8); ctx.stroke();
    return { x, y, w, h, ix, iw, iy, ih, ly, bottom: iy + ih, level };
  }
  /* 액체 안에 갇힌 입자 : 정규화 좌표(u, v)를 현재 액체 영역에 펼쳐 놓아요 (영역 밖으로 나가지 않음) */
  const r2 = (i) => [((i + 1) * 0.7548776662466927) % 1, ((i + 1) * 0.5698402909980532) % 1];
  function ballPos(g, i, r, wob, t) {
    const pad = r + 3, q = r2(i);
    const x0 = g.ix + pad, x1 = g.ix + g.iw - pad, y0 = g.ly + pad, y1 = g.bottom - pad;
    const px = x1 > x0 ? x0 + q[0] * (x1 - x0) : (g.ix + g.iw / 2), py = y1 > y0 ? y0 + q[1] * (y1 - y0) : (g.ly + g.bottom) / 2;
    const k = RM ? 0 : (wob == null ? 1.6 : wob);
    return [px + Math.sin(t * 1.3 + i * 1.9) * k, py + Math.cos(t * 1.1 + i * 2.3) * k];
  }
  function drawBalls(g, n, r, color, t, o) {
    o = o || {};
    for (let i = 0; i < n; i++) { const p = ballPos(g, (o.off || 0) + i, r, o.wob, t); D.sphere(p[0], p[1], r, color, { gloss: r > 5 }); }
  }
  function flash(x, y, colors) { parts.burst(x, y, { count: 16, speed: 150, size: 3.2, colors: colors || ['#ffb400', '#14a058', '#8b5cf6'] }); }
  function makeChips(box, items, onPick) {
    box.innerHTML = '';
    items.forEach(([v, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = label; b.addEventListener('click', () => { Sound.click(); onPick(v); }); box.appendChild(b); });
  }
  function markChips(box, cur, doneMap) { $$('button', box).forEach((b) => { b.classList.toggle('on', b.dataset.v === String(cur)); b.classList.toggle('done', !!(doneMap && doneMap[b.dataset.v])); }); }
  const pointInRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  const MODE_LABEL = { plan: '📋 필요량 계산', make: '🧪 용액 제조', err: '🔎 오차 찾기', dil: '💧 희석 제조' };
  const MAIN = PHONE ? { x: 8, y: 52, w: 464, h: 424 } : { x: 12, y: 52, w: 776, h: 342 };
  const INFO = PHONE ? { x: 8, y: 484, w: 464, h: 270 } : { x: 12, y: 402, w: 776, h: 148 };
  const COL_SOL = '#8b5cf6';
  const TODAY = (() => { const d = new Date(); return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0'); })();

  /* ---------- 자료 ---------- */
  const TARGETS = [
    { k: 'nacl', name: 'NaCl', MM: 58.5, label: '0.100 M NaCl 250 mL' },
    { k: 'naoh', name: 'NaOH', MM: 40, label: '0.100 M NaOH 250 mL' },
  ];
  TARGETS.forEach((q) => { q.c = 0.100; q.V = 250; q.n = q.c * q.V / 1000; q.mass = q.n * q.MM; });
  const MASS_NACL = +TARGETS[0].mass.toFixed(2);               // 1.46 g
  const TOOLS = [
    { k: 'bal', name: '전자저울', good: true }, { k: 'spoon', name: '약숟가락', good: true }, { k: 'bk', name: '비커', good: true }, { k: 'rod', name: '유리 막대', good: true },
    { k: 'fun', name: '깔때기', good: true }, { k: 'vf', name: '부피 플라스크 250 mL', good: true }, { k: 'wb', name: '증류수 병', good: true }, { k: 'drop', name: '스포이트', good: true },
    { k: 'cyl', name: '메스실린더', good: false }, { k: 'ef', name: '삼각 플라스크', good: false }, { k: 'lamp', name: '알코올램프', good: false },
  ];
  const ORDER_TXT = [
    '전자저울로 NaCl 1.46 g을 달아요',
    '비커에서 소량의 물에 완전히 녹여요',
    '깔때기로 부피 플라스크에 옮기고, 비커와 깔때기를 헹군 물도 넣어요',
    '표선 가까이 물을 붓고 스포이트로 표선에 맞춰요',
    '마개를 닫고 거꾸로 돌려 잘 섞어요',
  ];
  const ORDER_SHOW = [2, 0, 4, 1, 3];                       // 화면에 섞어 놓은 순서 (원래 번호)
  const ERRS = [
    { k: 'over', name: '표선을 넘겼어요', n: 0.0250, V: 0.255, why: '물을 표선 위(255 mL)까지 넣어 부피가 늘었어요.' },
    { k: 'rinse', name: '비커를 헹구지 않았어요', n: 0.0250 * 0.95, V: 0.250, why: '비커에 남은 용질 5 %가 플라스크에 들어가지 못했어요.' },
    { k: 'wet', name: '플라스크가 젖어 있었어요', n: 0.0250, V: 0.250, why: '플라스크 안의 물방울은 용질의 몰수를 바꾸지 않아요. 마지막에 표선에 맞추기 때문이에요.' },
    { k: 'undis', name: '용질을 덜 녹였어요', n: 0.0250 * 0.96, V: 0.250, why: '녹지 않은 용질 4 %가 바닥에 남아 용액에 녹은 몰수가 줄었어요.' },
  ];
  ERRS.forEach((e) => { e.c = e.n / e.V; });
  const SOLUTE = 'NaOH';
  const DIL_ROUNDS = [{ M0: 1.00, tag: '1.00 M NaOH 원액', target: 0.100 }, { M0: null, tag: '0.100 M NaOH', target: 0.0100 }];

  /* ---------- 상태 ---------- */
  Object.assign(S, {
    mode: 'plan', sub: {},
    pl: { k: 'nacl', tools: {}, shake: 0, popBox: {} },
    mk: { stage: 0, mass: 0, massD: 0, put: 0, dis: 0, tr: 0, mixA: 0, mixT: 0, L: 0, Ld: 0, act: null, ord: [], Lfix: 0, m0: 0, c: null, bLev: 0, stream: 0, shake: 0, okFlash: 0 },
    er: { k: 'over', run: {}, ran: {}, bar: {}, anim: 0, shake: 0 },
    dl: { round: 0, stage: 0, Vp: 0, L: 0, Ld: 0, act: null, p: { pip: 0, x: 0, y: 0, fill: 0 }, mixA: 0, M: [null, null], done: [false, false], Lfix: 0, Vfix: 0, stock: 1.0, label: { sol: '', safe: '' } },
  });

  /* ---------- 유리기구 그리기 ---------- */
  const FR = 62, FNH = 13, FH = 212, FSQ = Math.sqrt(FR * FR - FNH * FNH);
  const yOfL = (L, cap) => { const x = clamp(L / cap * 250, 0, 262); return x <= 235 ? -(x / 235) * 118 : -118 - (x - 235) / 25 * 88; };
  function flaskPath() {
    const a0 = Math.atan2(-FSQ, FNH), a1 = Math.atan2(-FSQ, -FNH);
    ctx.beginPath(); ctx.moveTo(FNH, -FH); ctx.lineTo(FNH, -FR - FSQ); ctx.arc(0, -FR, FR, a0, a1, false); ctx.lineTo(-FNH, -FH);
  }
  /* 부피 플라스크 (cx, base = 바닥 중심), cap = 표선의 부피(mL), o.L = 현재 부피(mL) */
  function vflask(cx, base, s, cap, o) {
    o = o || {};
    const L = o.L || 0, yl = yOfL(L, cap), ym = yOfL(cap, cap), rot = o.rot || 0;
    ctx.save();
    ctx.translate(cx, base - 100 * s); ctx.rotate(rot); ctx.translate(0, 100 * s); ctx.scale(s, s);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    D.shadow(() => { flaskPath(); ctx.closePath(); ctx.fillStyle = 'rgba(235,244,255,.72)'; ctx.fill(); }, { blur: 9, y: 4 });
    if (L > 0.05) {
      ctx.save(); flaskPath(); ctx.closePath(); ctx.clip();
      ctx.translate(0, yl); ctx.rotate(-rot);
      const c = o.color || '#c4b5fd', a = o.a != null ? o.a : 0.55, mx = o.mixed == null ? 1 : o.mixed, h = Math.max(20, -yl);
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, C.rgba(c, a * (1 - 0.55 * (1 - mx)))); g.addColorStop(1, C.rgba(C.shade(c, -0.12), Math.min(0.95, a + 0.12)));
      ctx.fillStyle = g; ctx.fillRect(-300, 0, 600, 700);
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(-300, 0, 600, 2.5);
      ctx.restore();
      // 녹아 있는 입자 (액체 안에만)
      const nb = o.balls || 0;
      if (nb > 0) {
        const fade = clamp(1 - Math.abs(rot) / 0.12, 0, 1) * (o.ballAlpha == null ? 1 : o.ballAlpha);
        if (fade > 0.02) {
          ctx.save(); ctx.globalAlpha *= fade;
          for (let i = 0; i < nb; i++) {
            const q = r2(i + 11), r = o.ballR || 4.4, top = yl + r + 3, bot = -r - 3;
            const y = bot - top < 2 ? (yl - 2) / 2 : top + q[1] * (bot - top);
            const dy = y + FR, hw = (y < -FR - FSQ ? FNH : Math.sqrt(Math.max(0, FR * FR - dy * dy))) - r - 3;
            const wob = RM ? 0 : Math.sin((o.t || 0) * 1.3 + i * 1.9) * 1.4;
            D.sphere((q[0] * 2 - 1) * Math.max(0, hw) + wob, y + (RM ? 0 : Math.cos((o.t || 0) * 1.1 + i * 2.3) * 1.2), r, o.ballColor || COL_SOL, { gloss: false });
          }
          ctx.restore();
        }
      }
      // 바닥에 가라앉은 녹지 않은 결정
      if (o.crystals) {
        ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.8;
        for (let i = 0; i < o.crystals; i++) { const q = r2(i + 3), x = (q[0] * 2 - 1) * 34, y = -3 - q[1] * 6 * (1 - (x / 36) * (x / 36)); ctx.fillRect(x - 2.5, y - 2.5, 5, 5); ctx.strokeRect(x - 2.5, y - 2.5, 5, 5); }
      }
    }
    // 젖은 안쪽 벽의 물방울
    if (o.drops) { ctx.fillStyle = 'rgba(120,180,255,.7)'; for (let i = 0; i < 16; i++) { const q = r2(i + 40), an = -2.6 + q[0] * 5.8, rr = FR - 5 - q[1] * 4; ctx.beginPath(); ctx.arc(Math.cos(an) * rr, -FR + Math.sin(an) * rr, 2.2, 0, TAU); ctx.fill(); } }
    // 표선
    if (!o.noMark) { ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-FNH - 7, ym); ctx.lineTo(FNH + 7, ym); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(70,100,140,.75)'; ctx.lineWidth = 2.8; ctx.lineJoin = 'round'; flaskPath(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(0, -FR, FR - 9, 2.2, 3.4); ctx.stroke();
    if (o.stopper) { ctx.fillStyle = '#7c8aa0'; ctx.beginPath(); ctx.moveTo(-FNH - 5, -FH - 16); ctx.lineTo(FNH + 5, -FH - 16); ctx.lineTo(FNH - 2, -FH + 5); ctx.lineTo(-FNH + 2, -FH + 5); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    return { markY: base + ym * s, levelY: base + yl * s, neckTop: base - FH * s, cx, base, s };
  }
  /* 표선 확대창: 눈높이에서 본 오목한 면 */
  function zoomMark(cx, cy, r, L, cap, label) {
    const zs = 32, dv = L - cap, sy = cy - dv * zs, nw = 24;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = '#fbfdff'; ctx.fill(); ctx.clip();
    ctx.strokeStyle = 'rgba(70,100,140,.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - nw, cy - r); ctx.lineTo(cx - nw, cy + r); ctx.moveTo(cx + nw, cy - r); ctx.lineTo(cx + nw, cy + r); ctx.stroke();
    const top = clamp(sy, cy - r - 10, cy + r + 10);
    ctx.fillStyle = 'rgba(139,92,246,.35)'; ctx.beginPath(); ctx.moveTo(cx - nw, top - 5); ctx.quadraticCurveTo(cx, top + 7, cx + nw, top - 5); ctx.lineTo(cx + nw, cy + r + 10); ctx.lineTo(cx - nw, cy + r + 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - nw, top - 5); ctx.quadraticCurveTo(cx, top + 7, cx + nw, top - 5); ctx.stroke();
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(cx - nw - 8, cy); ctx.lineTo(cx + nw + 8, cy); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    const dtxt = Math.abs(dv) < 0.05 ? '표선에 딱 맞아요!' : '표선 ' + (dv > 0 ? '+' : '−') + Math.abs(dv).toFixed(1) + ' mL';
    T(cx, cy + r + 18, dtxt, 14, Math.abs(dv) < 0.05 ? '#14803f' : '#b4231f', 'center', 800);
  }
  function toolIcon(k, cx, cy, s) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.lineWidth = 2; ctx.strokeStyle = '#52627d'; ctx.fillStyle = '#dbe6f7'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); ctx.fill(); ctx.stroke(); };
    if (k === 'bal') { rr(-26, 4, 52, 16, 5); rr(-15, -4, 30, 7, 3); ctx.fillStyle = '#16a34a'; rr(-9, 8, 18, 8, 2); }
    else if (k === 'spoon') { ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-22, 18); ctx.lineTo(6, -6); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(12, -11, 10, 6, -0.7, 0, TAU); ctx.fill(); ctx.stroke(); }
    else if (k === 'bk') { ctx.beginPath(); ctx.moveTo(-14, -18); ctx.lineTo(-14, 14); ctx.quadraticCurveTo(-14, 18, -10, 18); ctx.lineTo(10, 18); ctx.quadraticCurveTo(14, 18, 14, 14); ctx.lineTo(14, -18); ctx.stroke(); ctx.fillStyle = 'rgba(147,197,253,.7)'; ctx.fillRect(-12, 0, 24, 16); }
    else if (k === 'rod') { ctx.lineWidth = 5; ctx.strokeStyle = '#7aa6dc'; ctx.beginPath(); ctx.moveTo(-20, 17); ctx.lineTo(20, -17); ctx.stroke(); }
    else if (k === 'fun') { ctx.beginPath(); ctx.moveTo(-19, -16); ctx.lineTo(19, -16); ctx.lineTo(3.5, 2); ctx.lineTo(3.5, 19); ctx.lineTo(-3.5, 19); ctx.lineTo(-3.5, 2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (k === 'vf') { ctx.beginPath(); ctx.arc(0, 8, 13, 0, TAU); ctx.fill(); ctx.stroke(); rr(-3.5, -20, 7, 16, 2); ctx.strokeStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(-6, -11); ctx.lineTo(6, -11); ctx.stroke(); }
    else if (k === 'wb') { rr(-11, -4, 22, 24, 6); rr(-4.5, -16, 9, 13, 2); }
    else if (k === 'drop') { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.ellipse(0, -14, 6, 8, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#dbe6f7'; rr(-3, -7, 6, 24, 3); }
    else if (k === 'cyl') { rr(-8, -20, 16, 40, 3); ctx.beginPath(); for (let i = 0; i < 5; i++) { ctx.moveTo(-8, -14 + i * 8); ctx.lineTo(-2, -14 + i * 8); } ctx.stroke(); }
    else if (k === 'ef') { ctx.beginPath(); ctx.moveTo(-3.5, -19); ctx.lineTo(3.5, -19); ctx.lineTo(3.5, -6); ctx.lineTo(17, 17); ctx.lineTo(-17, 17); ctx.lineTo(-3.5, -6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (k === 'lamp') { rr(-11, 2, 22, 17, 6); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -4); ctx.stroke(); ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.ellipse(0, -10, 4.5, 7, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function chainBox(x, y, w, h, title, val, ok, pop, color) {
    const s = 0.92 + 0.08 * pop;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-w / 2, -h / 2);
    D.shadow(() => { D.roundRect(0, 0, w, h, 14); ctx.fillStyle = ok ? '#fff' : '#f7f3ff'; ctx.fill(); }, { blur: 7, y: 3 });
    ctx.strokeStyle = ok ? '#14a058' : PUR; ctx.lineWidth = 2.6; if (!ok) ctx.setLineDash([7, 5]); D.roundRect(0, 0, w, h, 14); ctx.stroke(); ctx.setLineDash([]);
    T(14, h / 2 + 5, title, 14, MUTED, 'left', 800);
    T(w - 14, h / 2 + 6, val, 18, ok ? color || INK : '#9aa5b6', 'right', 800);
    ctx.restore();
  }
  function cols2(tL, bL, tR, bR, foot) {
    const w2 = PHONE ? INFO.w - 32 : INFO.w / 2 - 28;
    const xL = INFO.x + 16, xR = PHONE ? INFO.x + 16 : INFO.x + INFO.w / 2 + 8, yR = PHONE ? INFO.y + 108 : INFO.y;
    T(xL, INFO.y + 26, tL, 15, '#b45309', 'left', 800); textBlock(xL, INFO.y + 50, w2, bL, 14, MUTED, 19, 700);
    T(xR, yR + 26, tR, 15, '#5b21b6', 'left', 800); textBlock(xR, yR + 50, w2, bR, 14, INK, 19, 800);
    if (!PHONE) { ctx.strokeStyle = '#e3def5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(INFO.x + INFO.w / 2, INFO.y + 14); ctx.lineTo(INFO.x + INFO.w / 2, INFO.y + INFO.h - 40); ctx.stroke(); }
    if (foot) textBlock(INFO.x + 16, INFO.y + INFO.h - (PHONE ? 36 : 24), INFO.w - 32, foot, 13.5, '#14803f', 18, 800);
  }
  /* ---------- UI 요소 ---------- */
  const planRows = {};
  TARGETS.forEach((q) => {
    const host = document.createElement('div'); host.dataset.pl = q.k; $('#planRows').appendChild(host);
    const cb = (i) => (r) => { if (r.ok) S.pl.popBox[q.k + i] = S.pl.popBox[q.k + i] || 0.001; updateCtl(); };
    planRows[q.k] = [
      mkRow(host, { label: '필요한 ' + q.name + '의 몰수 n (mol)', unit: 'mol', ans: +q.n.toFixed(4), tol: 0.0003 }, cb(0)),
      mkRow(host, { label: '필요한 ' + q.name + '의 질량 (g) · 몰질량 ' + q.MM + ' g/mol', unit: 'g', ans: +q.mass.toFixed(2), tol: 0.0105 }, cb(1)),
    ];
  });
  const planDone = (k) => planRows[k].every((r) => r.ok);
  makeChips($('#pSel'), TARGETS.map((q) => [q.k, q.label]), (v) => { S.pl.k = v; updateCtl(); });
  const ordBtns = ORDER_SHOW.map((id) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dataset.id = id;
    b.innerHTML = '<span class="no"></span>' + ORDER_TXT[id]; $('#ordList').appendChild(b);
    b.addEventListener('click', () => { Sound.click(); const i = S.mk.ord.indexOf(id); if (i >= 0) S.mk.ord.splice(i, 1); else if (S.mk.ord.length < 5) S.mk.ord.push(id); updateCtl(); });
    return b;
  });
  $('#bOrdClr').addEventListener('click', () => { Sound.click(); S.mk.ord = []; updateCtl(); });
  $('#bToolClr').addEventListener('click', () => { Sound.click(); S.pl.tools = {}; updateCtl(); });
  makeChips($('#eSel'), ERRS.map((e) => [e.k, e.name]), (v) => { S.er.k = v; updateCtl(); });
  const errRows = {};
  ERRS.filter((e) => e.k === 'over' || e.k === 'rinse').forEach((e) => {
    const host = document.createElement('div'); host.dataset.er = e.k; $('#errRows').appendChild(host);
    errRows[e.k] = mkRow(host, { label: '이 실수로 만든 용액의 실제 몰 농도 (mol/L)', unit: 'M', ans: +e.c.toFixed(4), tol: 0.00025, ph: '0.0000' }, () => updateCtl());
  });
  const errOK = (k) => !errRows[k] || errRows[k].ok;
  const errShown = (k) => !!S.er.ran[k] && errOK(k);
  const lblRow = mkRow($('#lblRow'), { label: '농도 (mol/L)', unit: 'M', ans: 0.0100, tol: 0.0003, ph: '0.0000' }, () => updateCtl());
  ['#selSol', '#selSafe'].forEach((id) => $(id).addEventListener('change', () => { Sound.click(); S.dl.label.sol = $('#selSol').value; S.dl.label.safe = $('#selSafe').value; }));

  /* ---------- 미세 조절 (슬라이더 + 단추) ---------- */
  function fineCfg() {
    if (S.gate === 'order' || S.gate === 'label') return null;
    const k = S.mk, d = S.dl;
    if (S.mode === 'make') {
      if (k.stage === 0 && !k.act) return { lab: '⚖️ 달 NaCl의 질량', unit: 'g', min: 0, max: 2.5, step: 0.01, dec: 2, big: 0.1, small: 0.01, get: () => k.mass, set: (v) => { k.mass = v; }, note: '목표 질량은 필요량 계산에서 구한 값이에요.' };
      if (k.stage === 3 && !k.act) return { lab: '💧 플라스크 속 액체의 부피', unit: 'mL', min: 100, max: 260, step: 1, dec: 1, big: 1, small: 0.1, get: () => k.L, set: (v) => { k.L = v; }, note: '표선은 250 mL예요. 오른쪽 확대창에서 오목한 면의 아랫부분을 표선에 맞춰요.' };
    }
    if (S.mode === 'dil') {
      if (d.stage === 0 && !d.act) return { lab: '🧪 피펫으로 취할 부피', unit: 'mL', min: 0, max: 25, step: 0.5, dec: 1, big: 1, small: 0.1, get: () => d.Vp, set: (v) => { d.Vp = v; }, note: '목표: ' + (d.round === 0 ? '1.00 M → 0.100 M' : '0.100 M → 0.0100 M') + ', 100 mL 부피 플라스크에 만들어요.' };
      if (d.stage === 2 && !d.act) return { lab: '💧 플라스크 속 액체의 부피', unit: 'mL', min: d.Vfix, max: 110, step: 1, dec: 1, big: 1, small: 0.1, get: () => d.L, set: (v) => { d.L = v; }, note: '표선은 100 mL예요. 확대창으로 표선에 맞춰요.' };
    }
    return null;
  }
  function uiExtra() {
    syncSubsel();
    const pk = {}; TARGETS.forEach((q) => { pk[q.k] = planDone(q.k); });
    markChips($('#pSel'), S.pl.k, pk);
    $$('#planRows > div').forEach((n) => { n.hidden = n.dataset.pl !== S.pl.k; });
    const ek = {}; ERRS.forEach((e) => { ek[e.k] = errShown(e.k); });
    markChips($('#eSel'), S.er.k, ek);
    $$('#errRows > div').forEach((n) => { n.hidden = n.dataset.er !== S.er.k; });
    $('#errRowsHead').hidden = !errRows[S.er.k];
    ordBtns.forEach((b) => { const i = S.mk.ord.indexOf(+b.dataset.id); b.classList.toggle('on', i >= 0); b.querySelector('.no').textContent = i >= 0 ? i + 1 : ''; });
    const cfg = fineCfg(), fb = $('#fineBox'); fb.hidden = !cfg || (S.mode !== 'make' && S.mode !== 'dil');
    if (cfg) {
      $('#fineLab').textContent = cfg.lab; $('#fineOut').textContent = cfg.get().toFixed(cfg.dec) + ' ' + cfg.unit;
      const sl = $('#fineS'); sl.min = cfg.min; sl.max = cfg.max; sl.step = cfg.step; sl.value = cfg.get(); sl.setAttribute('aria-label', cfg.lab);
      const fx = (v) => (v > 0 ? '+' : '−') + Math.abs(v);
      [[-cfg.big, 'fB1'], [-cfg.small, 'fB2'], [cfg.small, 'fB3'], [cfg.big, 'fB4']].forEach(([v, id]) => { $('#' + id).textContent = fx(v); $('#' + id).dataset.d = v; });
      $('#fineNote').textContent = cfg.note;
    }
    // 동작 단추
    const ab = $('#actBox'); ab.hidden = (S.mode !== 'make' && S.mode !== 'dil') || S.gate === 'order' || S.gate === 'label';
    const lab = actLabel(); $('#bAct').textContent = lab.t; $('#bAct').disabled = lab.off;
    $('#lblDate').textContent = TODAY;
  }
  function fineSet(v) { const cfg = fineCfg(); if (!cfg) return; v = clamp(+(+v).toFixed(cfg.dec), cfg.min, cfg.max); cfg.set(v); updateCtl(); }
  $('#fineS').addEventListener('input', (e) => fineSet(+e.target.value));
  ['fB1', 'fB2', 'fB3', 'fB4'].forEach((id) => $('#' + id).addEventListener('click', () => { const cfg = fineCfg(); if (!cfg) return; Sound.tick(); fineSet(cfg.get() + (+$('#' + id).dataset.d)); }));
  $('#bAct').addEventListener('click', () => { Sound.click(); if (S.mode === 'make') mkAct(); else dlAct(); });
  $('#bReset').addEventListener('click', () => { Sound.click(); if (S.mode === 'make') mkReset(); else dlReset(); });
  $('#bRun').addEventListener('click', () => { Sound.click(); const k = S.er.k; S.er.ran[k] = true; S.er.run[k] = 0; updateCtl(); });

  /* ================= ① 필요량 계산 ================= */
  const planGeom = () => (PHONE
    ? { chain: { x: MAIN.x + 12, y: MAIN.y + 40, w: MAIN.w - 24, h: 150, bh: 40 }, grid: { x: MAIN.x + 6, y: MAIN.y + 206, cols: 3, tw: 148, th: 50, gap: 4 }, head: MAIN.y + 198 }
    : { chain: { x: MAIN.x + 14, y: MAIN.y + 20, w: 350, h: MAIN.h - 40, bh: 56 }, grid: { x: MAIN.x + 378, y: MAIN.y + 52, cols: 4, tw: 96, th: 88, gap: 6 }, head: MAIN.y + 34 });
  const toolRect = (i) => { const g = planGeom().grid; return { x: g.x + (i % g.cols) * (g.tw + g.gap), y: g.y + Math.floor(i / g.cols) * (g.th + g.gap), w: g.tw, h: g.th }; };
  function toolCheck() {
    const miss = TOOLS.filter((t) => t.good && !S.pl.tools[t.k]), extra = TOOLS.filter((t) => !t.good && S.pl.tools[t.k]);
    return { miss, extra, n: Object.keys(S.pl.tools).filter((k) => S.pl.tools[k]).length };
  }
  function drawPlan(t) {
    const q = TARGETS.find((x) => x.k === S.pl.k), rows = planRows[q.k], g = planGeom();
    T(14, 26, '📋 목표 용액을 만들기 위한 계획', PHONE ? 15 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const ch = g.chain, bh = ch.bh, gap = (ch.h - 3 * bh) / 2, ys = [0, 1, 2].map((i) => ch.y + i * (bh + gap));
    const pop = (i) => (S.pl.popBox[q.k + i] != null ? Math.min(1, S.pl.popBox[q.k + i]) : rows[i].ok ? 1 : 0);
    const vals = [q.label.replace(q.name + ' ', '').replace(' 250 mL', '') + ' × 0.250 L', rows[0].ok ? q.n.toFixed(4) + ' mol' : '? mol', rows[1].ok ? q.mass.toFixed(2) + ' g' : '? g'];
    chainBox(ch.x, ys[0], ch.w, bh, q.name + ' 용액', vals[0], true, 1, INK);
    chainBox(ch.x, ys[1], ch.w, bh, '필요한 몰수 n', vals[1], rows[0].ok, pop(0), INK);
    chainBox(ch.x, ys[2], ch.w, bh, '필요한 질량', vals[2], rows[1].ok, pop(1), '#5b21b6');
    ['× 부피 0.250 L (250 mL = 0.250 L)', '× 몰질량 ' + q.MM + ' g/mol'].forEach((txt, i) => {
      const y1 = ys[i] + bh + 4, y2 = ys[i + 1] - 4, ax = ch.x + 34;
      D.arrow(ax, y1, ax, y2, { color: '#b45309', width: 4 }); T(ax + 18, (y1 + y2) / 2 + 5, txt, 14, '#b45309', 'left', 800);
    });
    // 도구 상자
    const tc = toolCheck();
    T(PHONE ? MAIN.x + 14 : g.grid.x, g.head, '🧰 쓸 도구를 눌러 고르세요 (' + tc.n + '개 선택)', 14.5, INK, 'left', 800);
    TOOLS.forEach((tl, i) => {
      const r = toolRect(i), on = !!S.pl.tools[tl.k];
      D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = on ? '#f3edff' : '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = on ? PUR : '#d7dce8'; ctx.lineWidth = on ? 3 : 1.6; D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.stroke();
      if (PHONE) { toolIcon(tl.k, r.x + 24, r.y + r.h / 2, 0.85); textBlock(r.x + 46, r.y + r.h / 2 - (tl.name.length > 7 ? 7 : -4), r.w - 50, tl.name, 13, INK, 15, 800); }
      else { toolIcon(tl.k, r.x + r.w / 2, r.y + 28, 1.1); textBlock(r.x + r.w / 2, r.y + 62, r.w - 8, tl.name, 13.5, INK, 16, 800, 'center'); }
      if (on) D.check(r.x + r.w - 12, r.y + 12, 9, 1);
    });
    if (S.pl.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + S.pl.shake * 0.2 + ')'; D.roundRect(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14); ctx.fill(); }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    cols2('① 필요한 몰수', 'n = M × V(L)\n250 mL = 0.250 L로 바꿔요.', '② 필요한 질량', '질량 = 몰수 × 몰질량\n' + q.name + '의 몰질량 ' + q.MM + ' g/mol', '⚠️ 안전: NaOH는 피부와 눈에 닿으면 위험해요. 보안경 · 장갑을 꼭 착용해요.');
  }
  function stepPlan(dt) { Object.keys(S.pl.popBox).forEach((k) => { S.pl.popBox[k] = Math.min(1, S.pl.popBox[k] + dt * 4); }); S.pl.shake = Math.max(0, S.pl.shake - dt); }

  /* ================= ② 용액 제조 ================= */
  const BN = PHONE ? { s: 0.72, xs: [MAIN.x + 72, MAIN.x + 224, MAIN.x + 392], base: MAIN.y + MAIN.h - 96 } : { s: 1, xs: [MAIN.x + 118, MAIN.x + 382, MAIN.x + 640], base: MAIN.y + MAIN.h - 84 };
  const nBalls = (m) => Math.max(1, Math.round(m / 0.18));
  const nCry = (m) => Math.round(m * 18);
  const mkActive = () => [0, 1, 2, 3, 5][S.mk.stage];
  function mkReset() { const k = S.mk; Object.assign(k, { stage: 0, mass: 0, massD: 0, put: 0, dis: 0, tr: 0, mixA: 0, mixT: 0, L: 0, Ld: 0, act: null, Lfix: 0, m0: 0, c: null, bLev: 0 }); parts.clear(); updateCtl(); }
  function actLabel() {
    if (S.mode === 'make') { const k = S.mk; return { t: ['① 비커에 넣기', '② 소량의 물에 녹이기', '③ 옮기고 헹구기', '⑤ 마개 닫고 섞기', '↺ 다시 만들기'][k.stage], off: !!k.act }; }
    const d = S.dl; return { t: d.stage === 0 ? '① 피펫으로 옮기기' : d.stage === 2 ? '③ 마개 닫고 섞기' : d.round === 0 ? '▶ 이 용액으로 한 번 더' : '↺ 처음부터', off: !!d.act };
  }
  function mkAct() {
    const k = S.mk; if (k.act) return;
    if (k.stage === 0) { if (k.mass < 0.01) { showHint('먼저 NaCl의 질량을 달아 보세요.'); return; } k.m0 = k.mass; k.act = { n: 'put', t: 0, d: 1.3 }; }
    else if (k.stage === 1) k.act = { n: 'dis', t: 0, d: 2.4 };
    else if (k.stage === 2) k.act = { n: 'tr', t: 0, d: 2.8 };
    else if (k.stage === 3) { k.Lfix = k.L; k.act = { n: 'mix', t: 0, d: 2.6 }; }
    else { mkReset(); return; }
    updateCtl();
  }
  function stepMake(dt) {
    const k = S.mk;
    k.massD = ap(k.massD, k.stage === 0 ? k.mass : k.massD, dt, 12); if (k.stage === 0 && Math.abs(k.massD - k.mass) < 0.004) k.massD = k.mass;
    if (k.stage !== 0 && !(k.act && k.act.n === 'put')) k.massD = ap(k.massD, 0, dt, 10);
    const a = k.act;
    if (a) {
      a.t += dt; const p = clamp(a.t / a.d, 0, 1);
      if (a.n === 'put') { k.put = sm(p); k.massD = k.m0 * (1 - k.put); }
      else if (a.n === 'dis') { k.dis = sm(p); k.bLev = 0.34 * sm(Math.min(1, p * 3)); }
      else if (a.n === 'tr') {
        k.tr = sm(p); k.L = k.Ld = 100 * sm(Math.min(1, p * 1.15)); k.bLev = 0.34 * (1 - sm(clamp((p - 0.1) / 0.8, 0, 1)));
        if (!RM && p < 0.9 && Math.random() < dt * 40) {
          const x0 = BN.xs[1] + 56 * BN.s, y0 = BN.base - 128 * BN.s, tx = BN.xs[2], ty = BN.base - (FH + 26) * BN.s, Tt = 0.42, g = 600;
          parts.emit({ x: x0, y: y0, vx: (tx - x0) / Tt, vy: (ty - y0 - 0.5 * g * Tt * Tt) / Tt, life: Tt, size: 3.4, color: '#c4b5fd', gravity: g, shape: 'circle' });
          parts.emit({ x: tx + (Math.random() - 0.5) * 4, y: ty + 44 * BN.s, vx: 0, vy: 60, life: 0.5, size: 2.8, color: '#c4b5fd', gravity: 500, shape: 'circle' });
        }
      }
      else if (a.n === 'mix') { k.mixT = p; k.mixA = sm(clamp((p - 0.15) / 0.75, 0, 1)); }
      if (a.t >= a.d) {
        k.act = null;
        if (a.n === 'put') { k.stage = 1; k.put = 1; k.massD = 0; }
        else if (a.n === 'dis') { k.stage = 2; k.dis = 1; flash(BN.xs[1], BN.base - 60 * BN.s, ['#c4b5fd', '#8b5cf6', '#fff']); }
        else if (a.n === 'tr') { k.stage = 3; k.tr = 1; k.L = k.Ld = 100; k.bLev = 0; }
        else if (a.n === 'mix') {
          k.stage = 4; k.mixA = 1; k.mixT = 1; k.c = k.m0 / 58.5 / (k.Lfix / 1000);
          const ok = Math.abs(k.m0 - MASS_NACL) <= 0.0101 && Math.abs(k.Lfix - 250) <= 0.1;
          if (ok) { flash(BN.xs[2], BN.base - 90 * BN.s); k.okFlash = 1; Sound.success(); } else { k.shake = 0.5; showHint('목표 농도(0.100 M)와 조금 달라요. 질량과 표선을 다시 확인하고 다시 만들어 보세요.', 5000); }
        }
        updateCtl();
      }
    }
    if (!(a && a.n === 'tr')) k.Ld = ap(k.Ld, k.L, dt, 6); if (Math.abs(k.Ld - k.L) < 0.02) k.Ld = k.L;
    k.shake = Math.max(0, k.shake - dt); k.okFlash = Math.max(0, k.okFlash - dt);
  }
  const mkOK = () => S.mk.stage === 4 && Math.abs(S.mk.m0 - MASS_NACL) <= 0.0101 && Math.abs(S.mk.Lfix - 250) <= 0.1;
  function drawMake(t) {
    const k = S.mk, s = BN.s, base = BN.base, X = BN.xs;
    T(14, 26, '🧪 NaCl 0.100 M 용액 250 mL 만들기', PHONE ? 15 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 단계 표시
    const chips = ['① 달기', '② 녹이기', '③ 옮기기', '④ 표선', '⑤ 섞기'], act = mkActive(), cw = (MAIN.w - 24) / 5;
    chips.forEach((c, i) => {
      const x = MAIN.x + 12 + i * cw, done = k.stage === 4 || (i < act && i < 4) || (i === 3 && k.stage === 4), cur = i === act;
      D.roundRect(x + 2, MAIN.y + 12, cw - 4, 28, 14); ctx.fillStyle = done ? '#dcfce7' : cur ? '#ede9fe' : '#f1f3f9'; ctx.fill(); ctx.strokeStyle = done ? '#14a058' : cur ? PUR : '#d7dce8'; ctx.lineWidth = cur ? 2.4 : 1.4; ctx.stroke();
      T(x + cw / 2, MAIN.y + 31, c, 13.5, done ? '#14803f' : cur ? '#5b21b6' : '#7a869c', 'center', 800);
    });
    // 전자저울
    const bx = X[0], dim = (n) => (act === n || k.stage === 4 ? 1 : 0.55);
    ctx.save(); ctx.globalAlpha = k.stage === 0 ? 1 : 0.6;
    ctx.translate(bx, base); ctx.scale(s, s);
    D.shadow(() => { D.roundRect(-82, -46, 164, 46, 10); ctx.fillStyle = '#e8edf6'; ctx.fill(); }, { blur: 7, y: 3 });
    ctx.strokeStyle = '#8a97ad'; ctx.lineWidth = 2; D.roundRect(-82, -46, 164, 46, 10); ctx.stroke();
    D.roundRect(-52, -37, 104, 28, 6); ctx.fillStyle = '#1f2937'; ctx.fill();
    ctx.fillStyle = '#c9d3e3'; D.roundRect(-52, -64, 104, 12, 6); ctx.fill(); ctx.strokeStyle = '#8a97ad'; ctx.stroke();
    ctx.restore();
    T(bx, base - 23 * s + 6, k.massD.toFixed(2) + ' g', PHONE ? 15 : 17, '#4ade80', 'center', 800);
    // 약포지 + 결정
    const nC = k.m0 && k.stage > 0 ? nCry(k.m0) : nCry(k.mass), left = k.stage === 0 ? nC : Math.round(nC * (1 - k.put));
    ctx.save(); ctx.translate(bx, base - 66 * s); ctx.scale(s, s);
    ctx.fillStyle = '#f5f7fb'; ctx.strokeStyle = '#a8b3c7'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-38, 0); ctx.lineTo(38, 0); ctx.lineTo(30, 7); ctx.lineTo(-30, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    const mh = 6 + 24 * Math.sqrt(clamp(nC / 45, 0, 1));
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.9;
    for (let i = 0; i < left; i++) { const q = r2(i), px = (q[0] * 2 - 1) * 30, py = -2 - Math.pow(q[1], 0.7) * mh * (1 - (px / 32) * (px / 32)); ctx.fillRect(px - 2.6, py - 2.6, 5.2, 5.2); ctx.strokeRect(px - 2.6, py - 2.6, 5.2, 5.2); }
    ctx.restore();
    // 비커
    const kx = X[1], tilt = k.act && k.act.n === 'tr' ? -0.5 * sm(Math.min(1, k.act.t / 0.5)) * (1 - sm(clamp((k.act.t - 2.2) / 0.5, 0, 1))) : 0;
    ctx.save(); ctx.globalAlpha = k.stage === 0 ? 0.55 : 1;
    ctx.translate(kx + 56 * s, base - 128 * s); ctx.rotate(tilt); ctx.translate(-(kx + 56 * s), -(base - 128 * s));
    ctx.translate(kx, base); ctx.scale(s, s);
    const bk = beaker(-60, -130, 120, 130, { level: k.bLev, color: '#c4b5fd', alpha: 0.5 });
    const nb = nBalls(k.m0 || 0), cryLeft = k.stage >= 1 ? Math.round(nCry(k.m0) * (1 - k.dis) * (k.stage >= 3 ? 0 : 1)) : 0;
    const putN = k.act && k.act.n === 'put' ? Math.round(nCry(k.m0) * k.put) : cryLeft;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.9;
    const cn = k.stage >= 1 && !(k.act && k.act.n === 'put') ? cryLeft : putN;
    for (let i = 0; i < cn; i++) { const q = r2(i + 5), px = (q[0] * 2 - 1) * 40, py = -6 - q[1] * 7 * (1 - (px / 44) * (px / 44)); ctx.fillRect(px - 2.6, py - 2.6, 5.2, 5.2); ctx.strokeRect(px - 2.6, py - 2.6, 5.2, 5.2); }
    if (k.bLev > 0.03) drawBalls(bk, Math.round(nb * k.dis * (1 - k.tr)), 4.6, COL_SOL, t, { off: 20 });
    if (k.act && k.act.n === 'dis' && !RM) { ctx.strokeStyle = '#7aa6dc'; ctx.lineWidth = 5; ctx.lineCap = 'round'; const ph = t * 6; ctx.beginPath(); ctx.moveTo(28 + Math.cos(ph) * 10, -36 + Math.sin(ph) * 3); ctx.lineTo(48, -150); ctx.stroke(); }
    ctx.restore();
    // 플라스크
    const fx = X[2], flaskDim = k.stage >= 2 || k.stage === 4 ? 1 : 0.6;
    const rock = k.act && k.act.n === 'mix' ? 0.36 * Math.sin(k.mixT * 9) * Math.min(1, k.mixT * 5) * (1 - sm(clamp((k.mixT - 0.9) / 0.1, 0, 1))) : 0;
    const shk = k.shake > 0 && !RM ? Math.sin(k.shake * 60) * 4 : 0;
    const mixed = k.stage === 4 ? 1 : k.mixA;
    const g = vflask(fx + shk, base, s, 250, { L: k.Ld, color: '#c4b5fd', a: 0.5, mixed: k.stage >= 4 ? 1 : (k.stage === 3 ? k.mixA : 0.45 + 0.55 * k.mixA), balls: k.stage >= 3 || (k.act && k.act.n === 'tr') ? Math.round(nb * k.tr) : 0, t, rot: rock, alpha: flaskDim, stopper: !!(k.act && k.act.n === 'mix') || k.stage === 4 });
    // 깔때기
    const fp = k.act && k.act.n === 'tr' ? sm(Math.min(1, k.act.t / 0.5)) * (1 - sm(clamp((k.act.t - 2.3) / 0.5, 0, 1))) : 0;
    if (fp > 0.01) {
      ctx.save(); ctx.translate(fx, g.neckTop - (1 - fp) * 60 * s + 8 * s); ctx.scale(s, s); ctx.globalAlpha = fp;
      ctx.fillStyle = 'rgba(219,230,247,.9)'; ctx.strokeStyle = '#52627d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-38, -34); ctx.lineTo(38, -34); ctx.lineTo(6, 4); ctx.lineTo(6, 40); ctx.lineTo(-6, 40); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    // 이름표
    T(bx, base + 24, '전자저울', 14, MUTED, 'center', 800); T(kx, base + 24, '비커', 14, MUTED, 'center', 800); T(fx, base + 24, '부피 플라스크 250 mL', 14, MUTED, 'center', 800);
    // 표선 확대창
    const zr = PHONE ? 34 : 38;
    const zx = PHONE ? X[1] + 90 : fx - 100, zy = PHONE ? g.markY - 44 : g.markY - 8;
    if (k.stage >= 3 || (k.act && k.act.n === 'tr')) {
      zoomMark(zx, zy, zr, k.Ld, 250);
      ctx.strokeStyle = 'rgba(139,92,246,.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(fx - FNH * s - 8, g.markY); ctx.lineTo(zx + zr * 0.8, zy + zr * 0.55); ctx.stroke(); ctx.setLineDash([]);
    }
    if (k.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + k.shake * 0.18 + ')'; D.roundRect(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14); ctx.fill(); }
    // 안내
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    const tips = [
      '① 전자저울에서 NaCl을 달아요. 슬라이더와 ± 단추로 질량을 맞춰요. (목표: 1.46 g)',
      '② 달아 놓은 NaCl이 비커에 들어 있어요. 소량의 물에 유리 막대로 저어 완전히 녹여요.',
      '③ 녹인 용액을 깔때기로 부피 플라스크에 옮기고, 비커와 깔때기를 증류수로 헹궈 그 물도 넣어요.',
      '④ 표선 가까이 증류수를 붓고, 스포이트로 눈높이에서 오목한 면의 아랫부분이 표선에 닿게 맞춰요. 그다음 ⑤ 마개를 닫고 섞어요.',
      k.c == null ? '' : '완성! 만든 용액의 몰 농도 = (' + k.m0.toFixed(2) + ' g / 58.5 g/mol) / ' + (k.Lfix / 1000).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') + ' L = ' + k.c.toFixed(4) + ' M',
    ];
    T(INFO.x + 16, INFO.y + 26, k.stage === 4 ? (mkOK() ? '✅ 표준 용액 완성' : '⚠️ 목표와 조금 달라요') : '지금 할 일', 15, k.stage === 4 && !mkOK() ? '#b4231f' : '#5b21b6', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, tips[k.stage], 14.5, INK, 21, 700);
    textBlock(INFO.x + 16, INFO.y + INFO.h - (PHONE ? 52 : 30), INFO.w - 32, '💡 부피 플라스크는 안쪽이 젖어 있어도 괜찮아요. 용질의 몰수는 변하지 않기 때문이에요. 마지막에 표선에 맞추면 돼요.', 13, MUTED, 17, 700);
  }
  /* ================= ③ 오차 찾기 ================= */
  const ERG = PHONE ? { fx: MAIN.x + 300, base: MAIN.y + 208, s: 0.6, bx: MAIN.x + 90, bs: 0.5, bars: { y: MAIN.y + 236, lx: MAIN.x + 12, x0: MAIN.x + 128, x1: MAIN.x + 450, rh: 36 } }
    : { fx: MAIN.x + 250, base: MAIN.y + MAIN.h - 56, s: 0.8, bx: MAIN.x + 80, bs: 0.6, bars: { y: MAIN.y + 62, lx: MAIN.x + 412, x0: MAIN.x + 530, x1: MAIN.x + 756, rh: 52 } };
  const AXMAX = 0.12;
  function drawErr(t) {
    const e = ERRS.find((x) => x.k === S.er.k), run = S.er.run[e.k] || 0, ran = !!S.er.ran[e.k], pr = sm(run);
    T(14, 26, '🔎 실수하면 농도가 어떻게 될까? (목표 0.100 M NaCl, 250 mL)', PHONE ? 13.5 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    // 그림: 실수 상황
    const g = ERG, k = e.k, base = g.base, s = g.s;
    let L = 250 + (k === 'over' ? 5 * pr : 0), nb = 20 - (k === 'rinse' ? Math.round(pr) : 0) - (k === 'undis' ? Math.round(pr) : 0);
    const cNow = ran ? e.c : 0.1;
    const fl = vflask(g.fx, base, s, 250, { L, color: '#c4b5fd', a: 0.2 + 0.4 * clamp(cNow / 0.1, 0, 1), balls: nb, ballR: 4.6, t, drops: k === 'wet' && pr > 0.3, crystals: k === 'undis' ? Math.round(3 * pr) : 0, ballAlpha: 1 });
    T(g.fx, base + 22, '부피 플라스크 250 mL', 14, MUTED, 'center', 800);
    T(g.fx, MAIN.y + (PHONE ? 46 : 64), ran ? e.name : '실수를 골라 ▶ 해 보세요', 15, ran ? '#b4231f' : MUTED, 'center', 800);
    if (k === 'over') {
      const zx = g.fx + (PHONE ? 100 : 128), zy = fl.markY + (PHONE ? 0 : 6);
      zoomMark(zx, zy, PHONE ? 32 : 38, 250 + 5 * pr, 250);
    }
    if (k === 'rinse') {
      ctx.save(); ctx.translate(g.bx, base); ctx.scale(g.bs, g.bs); const bk = beaker(-60, -130, 120, 130, { level: 0.06, color: '#c4b5fd', alpha: 0.5 });
      ctx.globalAlpha = pr; drawBalls(bk, 1, 5.5, COL_SOL, t, {}); ctx.restore();
      T(g.bx, base + 22, '비커 (헹구지 않음)', 14, MUTED, 'center', 800);
      if (pr > 0.4) T(g.bx, base - 140 * g.bs - 10, '남은 용질 5 %', 14, '#b4231f', 'center', 800, { alpha: pr });
    }
    if (k === 'wet' && pr > 0.3) T(g.bx + (PHONE ? 20 : 30), base - 60, '벽의 물방울', 14, '#2563eb', 'center', 800, { alpha: pr });
    if (k === 'undis' && pr > 0.5) T(g.bx + (PHONE ? 20 : 30), base - 60, '바닥에 남은 용질 4 %', 14, '#b4231f', 'center', 800, { alpha: pr });
    // 막대: 실제 농도 (0부터 그려 비교)
    const b = g.bars;
    T(b.lx, b.y - 20, '실제 몰 농도 (막대 끝 = 0.12 M)', 14, INK, 'left', 800);
    const xOf = (c) => b.x0 + (b.x1 - b.x0) * clamp(c / AXMAX, 0, 1);
    ERRS.forEach((er, i) => {
      const y = b.y + i * b.rh, cur = er.k === k;
      if (cur) { D.roundRect(b.lx - 4, y - 2, b.x1 - b.lx + 12, b.rh - 4, 8); ctx.fillStyle = 'rgba(139,92,246,.1)'; ctx.fill(); }
      textBlock(b.lx, y + (PHONE ? 15 : 16), b.x0 - b.lx - 8, er.name, PHONE ? 13 : 13.5, INK, 15, 800);
      D.roundRect(b.x0, y + 6, b.x1 - b.x0, 22, 7); ctx.fillStyle = '#eef1f7'; ctx.fill();
      const v = S.er.bar[er.k] || 0;
      if (v > 0.0005) {
        ctx.save(); D.roundRect(b.x0, y + 6, b.x1 - b.x0, 22, 7); ctx.clip();
        ctx.fillStyle = Math.abs(er.c - 0.1) < 0.0005 ? '#22a06b' : '#e2646b'; ctx.fillRect(b.x0, y + 6, xOf(v) - b.x0, 22); ctx.restore();
      }
      const shown = errShown(er.k);
      T(xOf(v) > b.x0 + 150 ? xOf(v) - 6 : xOf(v) + 6, y + 22, shown ? er.c.toFixed(4) + ' M' : '?', 13.5, xOf(v) > b.x0 + 150 ? '#fff' : INK, xOf(v) > b.x0 + 150 ? 'right' : 'left', 800);
    });
    const ty = b.y + 4 * b.rh;
    ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(xOf(0.1), b.y - 4); ctx.lineTo(xOf(0.1), ty - 2); ctx.stroke(); ctx.setLineDash([]);
    T(xOf(0.1), ty + 13, '목표 0.100 M', 13.5, '#6d28d9', 'center', 800);
    if (S.er.shake > 0) { ctx.fillStyle = 'rgba(226,70,75,' + S.er.shake * 0.2 + ')'; D.roundRect(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14); ctx.fill(); }
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    T(INFO.x + 16, INFO.y + 26, '실제 농도 = 용질의 몰수 / 용액의 부피(L)', 15, '#5b21b6', 'left', 800);
    textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, '올바르게 만들면 n = 0.0250 mol, V = 0.250 L → 0.100 M이에요.' + (ran ? '\n' + e.why : '\n실수를 해 보면 n과 V 중 무엇이 바뀌는지 볼 수 있어요.'), 14.5, INK, 21, 700);
    if (ran && errShown(k)) textBlock(INFO.x + 16, INFO.y + INFO.h - (PHONE ? 70 : 42), INFO.w - 32, k === 'wet' ? '→ n = 0.0250 mol, V = 0.250 L 그대로 → 0.100 M (영향 없음)' : '→ n = ' + e.n.toFixed(4) + ' mol, V = ' + e.V.toFixed(3) + ' L → ' + e.c.toFixed(4) + ' M (' + (e.c < 0.0999 ? '낮아져요' : '같아요') + ')', 14.5, '#14803f', 20, 800);
  }
  function stepErr(dt) {
    const o = S.er;
    ERRS.forEach((e) => { if (o.ran[e.k]) o.run[e.k] = Math.min(1, (o.run[e.k] || 0) + dt / 1.8); const tgt = errShown(e.k) && o.run[e.k] >= 1 ? e.c : 0; o.bar[e.k] = ap(o.bar[e.k] || 0, tgt, dt, 6); if (Math.abs(o.bar[e.k] - tgt) < 0.0003) o.bar[e.k] = tgt; });
    o.shake = Math.max(0, o.shake - dt);
  }

  /* ================= ④ 희석 제조 ================= */
  const DB = PHONE ? { s: 0.62, bx: MAIN.x + 80, fx: MAIN.x + 380, base: MAIN.y + MAIN.h - 90 } : { s: 0.8, bx: MAIN.x + 130, fx: MAIN.x + 630, base: MAIN.y + MAIN.h - 66 };
  const dlRest = () => ({ x: (DB.bx + DB.fx) / 2, y: DB.base - 6 });
  const dlStock = () => (S.dl.round === 0 ? 1.00 : (S.dl.M[0] != null ? S.dl.M[0] : 0.100));
  const dlResult = () => dlStock() * S.dl.Vfix / S.dl.Lfix;
  const dlRoundOK = (r) => S.dl.done[r];
  function dlReset() { const d = S.dl; Object.assign(d, { round: 0, stage: 0, Vp: 0, Vfix: 0, L: 0, Ld: 0, act: null, mixA: 0, mixT: 0 }); d.p = { pip: 0, x: dlRest().x, y: dlRest().y, fill: 0 }; parts.clear(); updateCtl(); }
  function dlAct() {
    const d = S.dl; if (d.act) return;
    if (d.stage === 0) { if (d.Vp < 0.5) { showHint('피펫으로 취할 부피를 먼저 정해요.'); return; } d.Vfix = d.Vp; d.act = { n: 'pip', t: 0, d: 3.2 }; }
    else if (d.stage === 2) { d.Lfix = d.L; d.act = { n: 'mix', t: 0, d: 2.6 }; }
    else if (d.stage === 3) { if (d.round === 0) { d.round = 1; Object.assign(d, { stage: 0, Vp: 0, L: 0, Ld: 0, mixA: 0, mixT: 0 }); d.p = { pip: 0, x: dlRest().x, y: dlRest().y, fill: 0 }; } else dlReset(); }
    updateCtl();
  }
  function stepDil(dt) {
    const d = S.dl, a = d.act, s = DB.s, R0 = dlRest(), hovB = { x: DB.bx, y: DB.base - 150 * s }, inB = { x: DB.bx, y: DB.base - 60 * s }, hovF = { x: DB.fx, y: DB.base - (FH + 16) * s };
    if (!a) { d.p.x = ap(d.p.x, R0.x, dt, 8); d.p.y = ap(d.p.y, R0.y, dt, 8); d.p.fill = ap(d.p.fill, 0, dt, 8); }
    if (a) {
      a.t += dt; const p = clamp(a.t / a.d, 0, 1), P = d.p;
      if (a.n === 'pip') {
        const seg = (u0, u1) => sm(clamp((p - u0) / (u1 - u0), 0, 1)), mv = (A, B, k) => ({ x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k });
        let q;
        if (p < 0.15) q = mv(R0, hovB, seg(0, 0.15)); else if (p < 0.30) q = mv(hovB, inB, seg(0.15, 0.30)); else if (p < 0.42) q = inB;
        else if (p < 0.55) q = mv(inB, hovB, seg(0.42, 0.55)); else if (p < 0.72) q = mv(hovB, hovF, seg(0.55, 0.72)); else if (p < 0.88) q = hovF; else q = mv(hovF, R0, seg(0.88, 1));
        P.x = q.x; P.y = q.y;
        P.fill = d.Vfix / 25 * (seg(0.30, 0.42) * (1 - seg(0.72, 0.88)));
        d.L = d.Ld = d.Vfix * seg(0.72, 0.88);
      } else if (a.n === 'mix') { d.mixT = p; d.mixA = sm(clamp((p - 0.15) / 0.75, 0, 1)); }
      if (a.t >= a.d) {
        d.act = null;
        if (a.n === 'pip') { d.stage = 2; d.L = d.Ld = d.Vfix; d.p.fill = 0; }
        else {
          d.stage = 3; d.mixA = 1; d.mixT = 1;
          const M = dlResult(); d.M[d.round] = M;
          const ok = Math.abs(d.Vfix - 10) <= 0.05 && Math.abs(d.Lfix - 100) <= 0.1 && (d.round === 0 || d.done[0]);
          if (ok) { d.done[d.round] = true; flash(DB.fx, DB.base - 90 * s); Sound.success(); } else showHint(d.round === 1 && !d.done[0] ? '1회차 용액이 0.100 M가 아니었어요. 처음부터 다시 해 보세요.' : '목표 농도와 달라요. 피펫 부피 10.0 mL와 표선 100 mL를 확인하고 다시 해 보세요.', 5200);
        }
        updateCtl();
      }
    }
    if (!(a && a.n === 'pip')) d.Ld = ap(d.Ld, d.L, dt, 6); if (Math.abs(d.Ld - d.L) < 0.02) d.Ld = d.L;
    if (!RM && d.stage === 2 && d.Ld < d.L - 0.6 && S.mode === 'dil' && Math.random() < dt * 24) parts.emit({ x: DB.fx + (Math.random() - 0.5) * 6, y: DB.base - (FH + 10) * s, vx: 0, vy: 40, life: 0.35, size: 3.2, color: '#60a5fa', gravity: 520, shape: 'circle' });
  }
  const SOLS = { nacl: 'NaCl 수용액', naoh: 'NaOH 수용액', hcl: 'HCl 수용액' };
  const SAFE = { base: '⚠️ 염기성 · 부식성: 보안경 · 장갑 착용', none: '표시 없음', fire: '🔥 인화성: 불꽃 주의' };
  function drawDil(t) {
    const d = S.dl, s = DB.s, base = DB.base, mix = d.act && d.act.n === 'mix';
    T(14, 26, '💧 피펫과 100 mL 부피 플라스크로 묽히기', PHONE ? 15 : 17, INK, 'left', 800);
    panel(MAIN.x, MAIN.y, MAIN.w, MAIN.h, 14);
    const stk = dlStock(), tgt = d.round === 0 ? 0.100 : 0.0100;
    T(MAIN.x + 14, MAIN.y + 28, (d.round + 1) + '회차: ' + (d.round === 0 ? '1.00 M' : stk.toPrecision(3) + ' M') + ' → ' + (d.round === 0 ? '0.100 M' : '0.0100 M') + ' (100 mL)', PHONE ? 14 : 15, '#5b21b6', 'left', 800);
    // 원액 병
    ctx.save(); ctx.translate(DB.bx, base); ctx.scale(s, s);
    D.shadow(() => { D.roundRect(-46, -112, 92, 112, 16); ctx.fillStyle = 'rgba(240,245,255,.8)'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.save(); D.roundRect(-46, -112, 92, 112, 16); ctx.clip(); ctx.fillStyle = C.rgba('#8b5cf6', 0.22 + 0.4 * clamp(stk, 0, 1)); ctx.fillRect(-46, -92, 92, 92); ctx.restore();
    ctx.strokeStyle = 'rgba(70,100,140,.75)'; ctx.lineWidth = 2.6; D.roundRect(-46, -112, 92, 112, 16); ctx.stroke(); D.roundRect(-16, -140, 32, 30, 5); ctx.fillStyle = 'rgba(235,244,255,.85)'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; D.roundRect(-34, -80, 68, 40, 6); ctx.fill(); ctx.restore();
    T(DB.bx, base - 52 * s + 2, (d.round === 0 ? '1.00' : stk.toPrecision(3)) + ' M', PHONE ? 13 : 15, INK, 'center', 800);
    T(DB.bx, base - 36 * s + 6, SOLUTE, 13, MUTED, 'center', 800);
    T(DB.bx, base + 22, '원액', 14, MUTED, 'center', 800);
    // 플라스크
    const rock = mix ? 0.36 * Math.sin(d.mixT * 9) * Math.min(1, d.mixT * 5) * (1 - sm(clamp((d.mixT - 0.9) / 0.1, 0, 1))) : 0;
    const res = d.stage === 3 ? d.M[d.round] : null;
    const g = vflask(DB.fx, base, s, 100, { L: d.Ld, color: '#c4b5fd', a: 0.15 + 0.4 * clamp((d.stage === 3 ? res : stk * d.Vfix / Math.max(d.Ld, 1)) / 1.0, 0, 1) * 1.6, mixed: d.stage === 3 ? 1 : (d.stage === 2 ? 0.5 : 1), balls: d.Ld > 0.5 ? Math.round(clamp(d.Vfix / 10, 0.3, 3) * 5) : 0, ballR: 3.6, t, rot: rock, stopper: mix || d.stage === 3 });
    T(DB.fx, base + 22, '부피 플라스크 100 mL', 14, MUTED, 'center', 800);
    // 피펫
    const P = d.p, vis = d.stage === 0 || (d.act && d.act.n === 'pip');
    if (vis) {
      ctx.save(); ctx.translate(P.x, P.y); ctx.scale(s, s);
      ctx.fillStyle = 'rgba(235,244,255,.92)'; ctx.strokeStyle = '#52627d'; ctx.lineWidth = 2.2;
      D.roundRect(-4, -104, 8, 98, 3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(0, 0); ctx.lineTo(4, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -70, 9.5, 15, 0, 0, TAU); ctx.fill(); ctx.stroke();
      if (P.fill > 0.002) { ctx.fillStyle = 'rgba(139,92,246,.75)'; const h = Math.min(62, P.fill * 62); ctx.fillRect(-2.8, -h, 5.6, h); }
      ctx.restore();
      T(P.x + 16 * s + 8, P.y - 56 * s, d.Vp.toFixed(1) + ' mL', 13.5, '#5b21b6', 'left', 800);
    }
    // 표선 확대창
    const zr = PHONE ? 34 : 38, zx = PHONE ? DB.fx - 92 : DB.fx - 100, zy = PHONE ? g.markY - 40 : g.markY - 8;
    if (d.stage >= 2) { zoomMark(zx, zy, zr, d.Ld, 100); ctx.strokeStyle = 'rgba(139,92,246,.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(DB.fx - (FNH * s + 8), g.markY); ctx.lineTo(zx + zr * 0.8, zy + zr * 0.55); ctx.stroke(); ctx.setLineDash([]); }
    // 안내 / 라벨
    panel(INFO.x, INFO.y, INFO.w, INFO.h, 14);
    if (S.gate === 'label') {
      const lx = INFO.x + 16, ly = INFO.y + 14, lw = INFO.w - 32, lh = INFO.h - 28;
      D.roundRect(lx, ly, lw, lh, 12); ctx.fillStyle = '#fffdf5'; ctx.fill(); ctx.strokeStyle = '#d9c98a'; ctx.lineWidth = 2.4; ctx.stroke();
      T(lx + 14, ly + 26, '🏷️ 표준 용액 라벨', 15, '#8a6d00', 'left', 800);
      const rows = [['용질', S.dl.label.sol ? SOLS[S.dl.label.sol] : '(고르세요)'], ['농도', lblRow.read() === lblRow.read() ? fm(lblRow.read(), 4) + ' M' : '(써 보세요)'], ['제조일', TODAY], ['안전', S.dl.label.safe ? SAFE[S.dl.label.safe] : '(고르세요)']];
      rows.forEach((r, i) => { const y = ly + 54 + i * (PHONE ? 36 : 22); T(lx + 14, y, r[0], 14, MUTED, 'left', 800); textBlock(lx + 78, y, lw - 92, r[1], 14.5, INK, 17, 800); });
    } else {
      const m1 = stk, Vp = d.stage === 0 ? d.Vp : d.Vfix, Lq = d.stage === 3 ? d.Lfix : d.stage === 2 ? d.L : 100;
      T(INFO.x + 16, INFO.y + 26, 'M₁V₁ = M₂V₂ (몰수 일정)', 15, '#b45309', 'left', 800);
      textBlock(INFO.x + 16, INFO.y + 52, INFO.w - 32, (m1 >= 0.5 ? '1.00' : m1.toPrecision(3)) + ' M × ' + Vp.toFixed(1) + ' mL = M₂ × ' + Lq.toFixed(1) + ' mL' + (d.stage === 3 ? '\n→ M₂ = ' + (d.M[d.round]).toPrecision(3) + ' M' + (d.done[d.round] ? '  ✅' : '  (목표 ' + tgt.toPrecision(3) + ' M와 달라요)') : '\n→ 목표 ' + (tgt === 0.1 ? '0.100' : '0.0100') + ' M가 되려면 M₁V₁ = ' + (tgt === 0.1 ? '0.100' : '0.0100') + ' × 100'), 15, INK, 22, 800);
      textBlock(INFO.x + 16, INFO.y + INFO.h - (PHONE ? 52 : 30), INFO.w - 32, '💡 피펫은 사용할 용액으로 헹궈서 써요. 부피 플라스크는 젖어 있어도 괜찮아요.', 13, MUTED, 17, 700);
    }
  }
  /* ---------- 입력 ---------- */
  function toolAt(p) { for (let i = 0; i < TOOLS.length; i++) { const r = toolRect(i); if (pointInRect(p, r)) return i; } return -1; }
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'plan') { const i = toolAt(p); if (i >= 0) { Sound.click(); const k = TOOLS[i].k; S.pl.tools[k] = !S.pl.tools[k]; updateCtl(); } }
      return false;
    },
    hover(p) { return S.mode === 'plan' && toolAt(p) >= 0 ? 'pointer' : 'default'; },
  });

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (S.mode === 'plan') {
      const q = TARGETS.find((x) => x.k === S.pl.k), r = planRows[q.k];
      setRead('목표 용액', q.label, '필요한 몰수', r[0].ok ? q.n.toFixed(4) + ' mol' : '?', '필요한 질량', r[1].ok ? q.mass.toFixed(2) + ' g' : '?');
    } else if (S.mode === 'make') {
      const k = S.mk;
      setRead('저울의 질량', (k.stage === 0 ? k.mass : k.m0).toFixed(2) + ' g', '액체의 부피', k.stage >= 3 ? k.L.toFixed(1) + ' mL' : '—', '만든 용액의 농도', k.c != null ? k.c.toFixed(4) + ' M' : '—');
    } else if (S.mode === 'err') {
      const e = ERRS.find((x) => x.k === S.er.k);
      setRead('실수', e.name, '실제 몰 농도', errShown(e.k) ? e.c.toFixed(4) + ' M' : '?', '목표', '0.100 M');
    } else {
      const d = S.dl, res = d.stage === 3 ? d.M[d.round] : null;
      setRead('피펫으로 취한 부피', (d.stage === 0 ? d.Vp : d.Vfix).toFixed(1) + ' mL', '플라스크 속 부피', d.stage >= 2 ? d.L.toFixed(1) + ' mL' : '—', '만든 용액의 농도', res != null ? res.toPrecision(3) + ' M' : '—');
    }
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '필요량 계산: 얼마나 달까?', short: '필요량 계산', icon: '📋', phase: '예측',
      intro: '<p class="si-q">❓ 탐구 질문: 정확한 농도의 용액은 어떻게 만들까? 물 250 mL에 소금 1.46 g을 넣으면 될까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 몰 농도 M = n ÷ V(L)와 n = M × V를 배웠어요. 이제 <b>원하는 농도의 용액</b>을 만들려면 용질을 몇 g 달아야 하는지 계산해요.</div>' +
        '<p>농도를 정확히 아는 용액을 <b>표준 용액</b>이라고 해요. 0.100 M NaCl 250 mL와 0.100 M NaOH 250 mL에 필요한 양을 구하고, 쓸 실험 도구를 골라 봐요.</p>',
      features: ['plan'],
      setup() { S.gate = ''; S.pl.k = 'nacl'; setScene('plan'); },
      recap: '필요한 몰수 = M × V(L), 필요한 질량 = 몰수 × 몰질량이에요. 정확한 부피는 눈금이 성긴 메스실린더가 아니라 부피 플라스크로 맞춰요.',
      summary: '<ul><li><b>표준 용액</b> = 농도를 정확히 아는 용액</li><li>0.100 M NaCl 250 mL: n = 0.100 × 0.250 = 0.0250 mol → 0.0250 × 58.5 = 1.4625 ≈ <b>1.46 g</b></li><li>0.100 M NaOH 250 mL: n = 0.0250 mol → 0.0250 × 40 = <b>1.00 g</b></li><li>도구: 전자저울, 약숟가락, 비커, 유리 막대, 깔때기, <b>부피 플라스크</b>, 증류수 병, 스포이트</li><li>안전: 보안경 · 장갑 착용, NaOH는 부식성, 폐액은 폐수 처리 기준에 따라 처리해요.</li></ul>',
      missions: [
        {
          title: '필요한 몰수와 질량 구하기',
          goal: '두 목표 용액마다 <b>필요한 몰수</b>와 <b>질량(g)</b>을 구해 쓰세요.',
          hint: 'n = 0.100 × 0.250 = 0.0250 mol이에요. 질량 = 0.0250 × 몰질량 (NaCl 58.5, NaOH 40)이에요. 질량은 소수 둘째 자리까지 써요.',
          setup() { S.gate = ''; S.pl.k = 'nacl'; Object.keys(planRows).forEach((k) => planRows[k].forEach((r) => r.clear())); S.pl.popBox = {}; setScene('plan'); },
          check: () => planDone('nacl') && planDone('naoh'), hold: 0.5,
          status: () => 'NaCl ' + mark(planDone('nacl')) + ' NaOH ' + mark(planDone('naoh')),
          explain: '두 용액 모두 n = 0.100 mol/L × 0.250 L = <b>0.0250 mol</b>이에요. 질량은 NaCl 0.0250 × 58.5 = 1.4625 ≈ <b>1.46 g</b>, NaOH 0.0250 × 40 = <b>1.00 g</b>이에요.',
        },
        {
          title: '쓸 도구 고르기', manual: true,
          goal: '0.100 M NaCl 250 mL를 만들 때 <b>꼭 필요한 도구만</b> 그림에서 눌러 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '질량을 달고(저울 · 숟가락), 녹이고(비커 · 유리 막대), 옮기고(깔때기), 정확한 부피로 맞추는(부피 플라스크 · 증류수 병 · 스포이트) 도구가 필요해요.',
          setup() { S.gate = 'tools'; S.pl.tools = {}; setScene('plan'); },
          check() {
            const c = toolCheck();
            if (c.n === 0) return '쓸 도구를 그림에서 눌러 고르세요.';
            S.pl.shake = 0.4;
            if (c.extra.length) { const x = c.extra[0]; return x.k === 'cyl' ? '메스실린더는 눈금이 성겨 정밀도가 낮아요. 정확한 부피는 <b>부피 플라스크</b>로 맞춰요.' : x.name + '은(는) 이 실험에 필요하지 않아요.'; }
            if (c.miss.length) return '아직 필요한 도구가 빠졌어요: ' + c.miss.map((x) => x.name).join(', ') + ' 등을 생각해 보세요.';
            S.pl.shake = 0; return true;
          },
          status: () => { const c = toolCheck(); return '고른 도구 ' + c.n + '개 &nbsp; 빠진 것 ' + c.miss.length + '개 &nbsp; 필요 없는 것 ' + c.extra.length + '개'; },
          explain: '무게를 재는 <b>전자저울 · 약숟가락</b>, 녹이는 <b>비커 · 유리 막대</b>, 옮기는 <b>깔때기</b>, 정확한 부피를 만드는 <b>부피 플라스크 · 증류수 병 · 스포이트</b>가 필요해요. 삼각 플라스크와 메스실린더는 부피가 정밀하지 않고, 알코올램프는 이 실험에 필요하지 않아요.',
        },
        {
          type: 'quiz', title: '물 250 mL에 1.46 g을 넣으면?',
          goal: '“물 250 mL에 NaCl 1.46 g을 녹이면 0.100 M NaCl 250 mL가 된다.” 이 설명은?',
          setup() { S.gate = ''; setScene('plan'); },
          choices: ['맞아요. 물이 250 mL이면 용액도 250 mL예요', '틀려요. 용액 전체의 부피가 250 mL가 되도록 맞춰야 해요', '틀려요. NaCl은 물에 녹으면 질량이 달라지기 때문이에요', '맞아요. 몰 농도는 용매의 부피로 구해요'],
          answer: 1,
          feedback: ['용질을 녹이면 용액의 부피가 물의 부피와 달라질 수 있어요. 부피 플라스크의 표선에 맞춰 <b>용액 전체</b>를 250 mL로 만들어야 해요.', '', '질량은 보존돼요. 문제는 용액 부피예요.', '몰 농도는 용매가 아니라 용액 전체의 부피(L)로 구해요.'],
          explain: '몰 농도의 부피는 <b>용액 전체의 부피</b>예요. 그래서 NaCl을 소량의 물에 녹인 뒤 부피 플라스크에서 표선까지 물을 채워 용액이 250 mL가 되게 해요.',
        },
      ],
    },
    {
      title: '용액 제조: 표선에 맞추기', short: '용액 제조', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 0.100 M NaCl 250 mL에 필요한 NaCl이 <b>1.46 g</b>이고 <b>부피 플라스크</b>를 써야 함을 알았어요. 이제 순서대로 직접 만들어 봐요.</div>' +
        '<p>① 달기 → ② 녹이기 → ③ 옮기기 → ④ 표선 맞추기 → ⑤ 섞기. 먼저 순서를 맞추고, 가상 실험대에서 직접 만들어요.</p>',
      features: ['make'],
      setup() { S.gate = ''; mkReset(); setScene('make'); },
      recap: '고체 → 소량의 물에 녹이기 → 부피 플라스크로 옮기고 헹구기 → 표선에 맞추기 → 마개를 닫고 섞기 순서로 표준 용액을 만들어요.',
      summary: '<ul><li>① 질량 달기 ② 비커에서 <b>소량의 물</b>에 완전히 녹이기 ③ 깔때기로 부피 플라스크에 옮기고 <b>헹군 물까지</b> 넣기 ④ 표선 가까이 물을 붓고 스포이트로 표선에 맞추기(눈높이, <b>오목한 면의 아랫부분</b>) ⑤ 마개를 닫고 거꾸로 돌려 섞기</li><li>NaCl 1.46 g → 250 mL: 1.46 ÷ 58.5 ÷ 0.250 = <b>0.0998 M ≈ 0.100 M</b></li><li>부피 플라스크는 물에 젖어 있어도 괜찮아요 (용질의 몰수는 그대로).</li><li>NaOH는 흡습성이 있어 정확히 달기 어려워요. 다음 차시들에서는 농도를 확인한 표준 용액을 쓴다고 가정해요.</li></ul>',
      missions: [
        {
          title: '제조 순서 맞추기', manual: true,
          goal: '표준 용액을 만드는 <b>순서대로</b> 5개의 카드를 차례로 눌러 번호를 붙이고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '먼저 달고, 비커에서 녹이고, 부피 플라스크로 옮겨요. 부피를 맞춘 다음 마지막에 섞어요.',
          setup() { S.gate = 'order'; S.mk.ord = []; setScene('make'); },
          check() {
            const o = S.mk.ord;
            if (o.length < 5) return '5개의 카드를 모두 눌러 순서를 정해 주세요.';
            const i = o.findIndex((v, j) => v !== j);
            if (i < 0) return true;
            return (i + 1) + '번째 카드가 맞지 않아요. ' + (i === 1 ? '용질을 먼저 비커에서 녹여야 해요.' : i === 4 ? '부피를 맞춘 다음 마지막에 섞어요.' : '다시 생각해 보세요.');
          },
          status: () => '번호 붙인 카드 ' + S.mk.ord.length + ' / 5',
          explain: '<b>달기 → 비커에서 소량의 물에 녹이기 → 부피 플라스크에 옮기고 헹구기 → 표선에 맞추기 → 마개를 닫고 섞기</b> 순서예요. 용질은 부피 플라스크에 바로 넣지 않고 비커에서 먼저 완전히 녹여요.',
        },
        {
          title: '0.100 M NaCl 250 mL 만들기',
          goal: 'NaCl <b>1.46 g</b>(±0.01)을 달아 5단계를 따라 만들고, 표선 <b>250.0 mL</b>(±0.1)에 맞춰 섞으세요.',
          hint: '질량: 슬라이더로 대략 맞추고 ±0.01 단추로 1.46 g을 맞춰요. 표선: 확대창에서 오목한 면의 아랫부분이 빨간 표선에 닿을 때까지 ±0.1 mL 단추로 조절해요.',
          setup() { S.gate = ''; mkReset(); setScene('make'); },
          check: () => mkOK(), hold: 0.6,
          status: () => '질량 ' + mark(S.mk.stage > 0 && Math.abs(S.mk.m0 - MASS_NACL) <= 0.0101) + (S.mk.stage > 0 ? ' ' + S.mk.m0.toFixed(2) + ' g' : '') + ' &nbsp; 표선 ' + mark(S.mk.stage === 4 && Math.abs(S.mk.Lfix - 250) <= 0.1) + ' &nbsp; 섞기 ' + mark(S.mk.stage === 4),
          explain: '1.46 g ÷ 58.5 g/mol = 0.02496 mol이고 용액이 250.0 mL이므로 몰 농도는 0.02496 ÷ 0.2500 = <b>0.0998 M ≈ 0.100 M</b>이에요. 달기와 표선 맞추기에서 생기는 작은 오차가 농도에 그대로 반영돼요.',
        },
        {
          type: 'quiz', title: '마지막에 섞는 까닭',
          goal: '표선을 맞춘 뒤 <b>마개를 닫고 거꾸로 돌려 섞는</b> 까닭은?',
          setup() { S.gate = ''; setScene('make'); },
          choices: ['용질의 몰수를 늘리려고', '용액 전체의 농도를 균일하게 하려고', '용액의 부피를 줄이려고', '용질을 더 많이 녹이려고'],
          answer: 1,
          feedback: ['섞는다고 용질이 늘어나지는 않아요.', '', '섞어도 부피는 표선(250.0 mL) 그대로예요.', '이미 비커에서 완전히 녹였어요. 섞는 것은 농도를 고르게 하기 위해서예요.'],
          explain: '물을 더 넣은 직후에는 위쪽이 묽고 아래쪽이 진할 수 있어요. 잘 섞어야 <b>용액 어디에서나 농도가 같은</b> 표준 용액이 돼요.',
        },
      ],
    },
    {
      title: '오차 찾기: 농도가 달라지는 실수', short: '오차 찾기', icon: '🔎', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 표준 용액을 순서대로 만들었어요. 그런데 작은 실수가 생기면 농도가 얼마나 달라질까요?</div>' +
        '<p>네 가지 실수를 하나씩 해 보며 <b>용질의 몰수 n</b>과 <b>용액의 부피 V</b> 중 무엇이 바뀌는지 보고, 실제 농도를 계산해 목표 0.100 M와 비교해요.</p>',
      features: ['err'],
      setup() { S.gate = ''; S.er.k = 'over'; setScene('err'); },
      recap: '실제 농도 = 실제 몰수 ÷ 실제 부피예요. 표선을 넘기거나 용질이 덜 들어가면 낮아지고, 플라스크가 젖어 있는 것은 영향이 없어요.',
      summary: '<ul><li>표선을 넘김(255 mL): 0.0250 ÷ 0.255 = <b>0.0980 M</b> (낮음) — 몰수 그대로, 부피만 늘어요.</li><li>비커를 헹구지 않음(용질 5 % 손실): 0.0250 × 0.95 ÷ 0.250 = <b>0.0950 M</b> (낮음)</li><li>플라스크가 젖어 있음: 몰수와 부피가 그대로 → <b>0.100 M</b> (영향 없음)</li><li>용질이 덜 녹음(4 %): 0.0250 × 0.96 ÷ 0.250 = <b>0.0960 M</b> (낮음)</li></ul>',
      missions: [
        {
          title: '두 가지 실수의 실제 농도',
          goal: '<b>표선을 넘긴 경우</b>(255 mL)와 <b>비커를 헹구지 않은 경우</b>(용질 5 % 손실)의 실제 몰 농도를 구하세요.',
          hint: '표선 초과: 몰수 0.0250 mol 그대로, 부피 0.255 L. 헹구지 않음: 몰수가 0.0250 × 0.95로 줄고, 부피는 0.250 L예요. 소수 넷째 자리까지 써요.',
          setup() { S.gate = ''; S.er.k = 'over'; errRows.over.clear(); errRows.rinse.clear(); setScene('err'); },
          check: () => errRows.over.ok && errRows.rinse.ok, hold: 0.5,
          status: () => '표선 초과 ' + mark(errRows.over.ok) + ' 헹구지 않음 ' + mark(errRows.rinse.ok),
          explain: '표선 초과: 0.0250 mol ÷ 0.255 L = <b>0.0980 M</b>. 헹구지 않음: 0.02375 mol ÷ 0.250 L = <b>0.0950 M</b>. 둘 다 목표 0.100 M보다 낮아요. 플라스크가 젖어 있어도 마지막에 표선에 맞추므로 농도는 바뀌지 않아요.',
        },
        {
          type: 'quiz', title: '표선을 넘기면 농도가 낮아지는 까닭',
          goal: '표선을 넘겨 물을 넣으면 농도가 <b>낮아지는</b> 까닭은?',
          setup() { S.gate = ''; S.er.k = 'over'; setScene('err'); },
          choices: ['용질의 몰수가 줄어서', '용질의 몰수는 그대로인데 용액의 부피가 늘어서', '물이 용질과 반응해서', '용질의 질량이 줄어서'],
          answer: 1,
          feedback: ['표선을 넘겨도 용질이 사라지지는 않아요.', '', '물은 용질과 반응하지 않아요.', '질량은 그대로예요. 부피가 커진 것이 원인이에요.'],
          explain: '표선을 넘기면 <b>몰수 n은 그대로</b>인데 <b>부피 V만 늘어</b> M = n ÷ V가 작아져요. 그래서 이미 넘겼다면 버리고 다시 만들어야 해요.',
        },
      ],
    },
    {
      title: '희석 제조: 피펫으로 묽히기', short: '희석 제조', icon: '💧', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 고체를 녹여 만든 용액의 오차를 살펴봤어요. 이번에는 <b>진한 용액을 묽혀</b> 표준 용액을 만들어요. 앞 차시에서 배운 M V = M′ V′를 실험으로 확인해요.</div>' +
        '<p>1.00 M NaOH 용액 10.0 mL를 피펫으로 취해 100 mL 부피 플라스크에서 0.100 M로, 같은 방법으로 0.0100 M로 묽혀요. NaOH 수용액은 보안경 · 장갑을 착용하고 다루고, 남은 폐액은 폐수 처리 기준에 따라 처리해요.</p>',
      features: ['dil'],
      setup() { S.gate = ''; dlReset(); setScene('dil'); },
      recap: '진한 용액에서 취한 부피 V₁에 물을 더해 V₂로 만들면 M₂ = M₁V₁ ÷ V₂예요. 10배 묽히려면 피펫으로 10.0 mL를 취해 100 mL로 채워요.',
      summary: '<ul><li>1.00 M 10.0 mL → 100 mL: 1.00 × 10.0 = 0.100 × 100 → <b>0.100 M</b></li><li>0.100 M 10.0 mL → 100 mL: <b>0.0100 M</b></li><li>피펫 · 뷰렛은 사용할 용액으로 헹궈 쓰고, 부피 플라스크는 젖어 있어도 돼요.</li><li>표준 용액의 <b>라벨</b>: 용질 · 농도 · 제조일 · 안전 표시(NaOH: 염기성 · 부식성)</li></ul>',
      missions: [
        {
          title: '두 단계로 묽히기',
          goal: '피펫으로 <b>10.0 mL</b>(±0.05)를 취해 100 mL 플라스크를 <b>표선</b>(±0.1)까지 채우고 섞어 <b>0.100 M</b>을, 이어서 같은 방법으로 <b>0.0100 M</b>을 만드세요.',
          hint: '① 피펫 부피를 10.0 mL로 맞춰 옮기기 → ② 물을 채워 확대창에서 표선에 맞추기 → ③ 섞기. 1회차가 끝나면 “이 용액으로 한 번 더”를 눌러요.',
          setup() { S.gate = ''; dlReset(); S.dl.done = [false, false]; S.dl.M = [null, null]; setScene('dil'); },
          check: () => S.dl.done[0] && S.dl.done[1], hold: 0.6,
          status: () => '1회차(0.100 M) ' + mark(S.dl.done[0]) + ' &nbsp; 2회차(0.0100 M) ' + mark(S.dl.done[1]),
          explain: '1회차: 1.00 M × 10.0 mL = M₂ × 100 mL → <b>0.100 M</b>. 2회차: 0.100 M × 10.0 mL = M₂ × 100 mL → <b>0.0100 M</b>. 10배씩 두 번 묽혀 100배 묽은 용액이 되었어요.',
        },
        {
          title: '표준 용액 라벨 쓰기', manual: true,
          goal: '방금 만든 <b>0.0100 M 용액</b>의 라벨을 완성하세요. 용질, 농도, 안전 표시를 고르거나 써요.',
          hint: '용액은 NaOH 수용액이고 농도는 0.0100 M이에요. NaOH는 염기성 · 부식성이라서 보안경과 장갑이 필요해요.',
          setup() { S.gate = 'label'; S.dl.label = { sol: '', safe: '' }; $('#selSol').value = ''; $('#selSafe').value = ''; lblRow.clear(); setScene('dil'); },
          check() {
            const l = S.dl.label;
            if (!l.sol || !l.safe) return '용질과 안전 표시를 모두 골라 주세요.';
            if (l.sol !== 'naoh') return '이 용액은 1.00 M <b>NaOH</b> 용액을 묽힌 것이에요.';
            if (!lblRow.ok) return '농도는 0.0100 M이에요. 숫자로 써 주세요.';
            if (l.safe !== 'base') return 'NaOH 용액에는 염기성 · 부식성 안전 표시를 붙여요.';
            return true;
          },
          status: () => '용질 ' + mark(S.dl.label.sol === 'naoh') + ' 농도 ' + mark(lblRow.ok) + ' 안전 ' + mark(S.dl.label.safe === 'base'),
          explain: '표준 용액 병에는 <b>용질 · 농도 · 제조일 · 안전 표시</b>를 써요. 이 용액은 <b>0.0100 M NaOH</b>이고, 염기성이라 보안경 · 장갑을 착용하고 취급해요. 쓰고 남은 폐액은 폐수 처리 기준에 따라 처리해요.',
        },
        {
          type: 'quiz', title: '0.0100 M 100 mL에 필요한 피펫 부피',
          goal: '0.100 M 용액으로 <b>0.0100 M 용액 100 mL</b>를 만들려면 피펫으로 몇 mL를 취해야 할까요?',
          setup() { S.gate = ''; setScene('dil'); },
          choices: ['1.0 mL', '10.0 mL', '100 mL', '0.10 mL'],
          answer: 1,
          feedback: ['0.100 × 1.0 ÷ 100 = 0.0010 M이에요. 10배 묽히려면 더 많이 취해야 해요.', '', '100 mL를 모두 취하면 묽히지 않은 거예요.', '너무 적어요. 0.100 × V = 0.0100 × 100을 풀어 보세요.'],
          explain: 'M₁V₁ = M₂V₂ → 0.100 × V₁ = 0.0100 × 100 → V₁ = <b>10.0 mL</b>이에요. 10배 묽히는 것이니까 전체 부피의 1/10을 취하면 돼요.',
        },
      ],
    },
  ];

  setScene('plan');
  dlReset();
  game = SciSim.game({
    simId: 'hc-standard-solution', mount: '#game', badge: '표준 용액 장인', homeHref: '../../index.html#hc',
    featureLabels: { plan: '📋 필요량 계산 · 도구 상자', make: '🧪 용액 제조 실험대', err: '🔎 오차 시뮬레이터', dil: '💧 희석 제조 (피펫 · 라벨)' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  function stepAll1(dt) { stepPlan(dt); stepMake(dt); stepErr(dt); stepDil(dt); }
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (S.gate && game && game.phase !== 'active') { S.gate = ''; updateCtl(); }
    view.apply();
    stepAll1(dt);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'plan') drawPlan(t); else if (S.mode === 'make') drawMake(t); else if (S.mode === 'err') drawErr(t); else drawDil(t);
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(243,240,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : ap(S.fade, 0, dt, 9); }
    readouts();
  });

  window.__sim = {
    S, VW, VH, TARGETS, TOOLS, ERRS, planRows, errRows, lblRow, ordBtns, get game() { return game; },
    setScene, planDone, toolCheck, toolRect, mkAct, mkReset, mkOK, dlAct, dlReset, fineCfg, fineSet, errShown, dlResult,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { S.t += 0.02; stepAll1(0.02); parts.update(0.02); } },
  };

})();
