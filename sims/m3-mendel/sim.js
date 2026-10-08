/* =========================================================
   중3 Ⅵ. 생식과 유전 - 완두콩 유전 연구소
   멘델의 유전 원리
   - 우열의 원리 : 순종끼리 교배하면 잡종 1대에는 우성 형질만 나타난다
   - 분리의 법칙 : 생식세포를 만들 때 한 쌍의 유전자가 분리된다 (Rr × Rr → 3 : 1)
   - 독립의 법칙 : 두 쌍의 유전자는 서로 독립적으로 분리된다 (RrYy × RrYy → 9 : 3 : 3 : 1)
   - 검정 교배   : 열성 순종(rr)과 교배해 우성 개체의 유전자형을 알아낸다
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* =========================================================
     유전 규칙
     유전자형은 유전자 쌍을 이어 쓴 문자열: 'Rr', 'Yy', 'RrYy'
     ========================================================= */
  const GENES = {
    R: { up: 'R', lo: 'r', dom: '둥근', rec: '주름진', ink: '#c2410c' },
    Y: { up: 'Y', lo: 'y', dom: '노란색', rec: '초록색', ink: '#2563eb' },
  };
  const MODE_GENES = { shape: ['R'], color: ['Y'], both: ['R', 'Y'] };
  const CLASSES = {
    shape: [{ key: 'R', name: '둥근' }, { key: 'r', name: '주름진' }],
    color: [{ key: 'Y', name: '노란색' }, { key: 'y', name: '초록색' }],
    both: [
      { key: 'RY', name: '둥근·노란색' }, { key: 'Ry', name: '둥근·초록색' },
      { key: 'rY', name: '주름진·노란색' }, { key: 'ry', name: '주름진·초록색' },
    ],
  };

  const isUp = (c) => c !== c.toLowerCase();
  const pairs = (g) => g.match(/../g) || [];
  const normPair = (a, b) => (!isUp(a) && isUp(b) ? b + a : a + b);
  const phenoKey = (g) => pairs(g).map((p) => p[0]).join('');      // 정렬된 쌍의 첫 글자 = 나타나는 형질
  const isPure = (g) => pairs(g).every((p) => p[0] === p[1]);
  const geneOf = (c) => (c === '?' ? null : c.toUpperCase());
  function gametesOf(g) {                     // RrYy → [RY, Ry, rY, ry]
    return pairs(g).reduce((acc, p) => {
      const out = [];
      acc.forEach((a) => { out.push(a + p[0]); out.push(a + p[1]); });
      return out;
    }, ['']);
  }
  function fuse(ga, gb) {                     // 두 생식세포가 수정 → 자손 유전자형
    let s = '';
    for (let i = 0; i < ga.length; i++) s += normPair(ga[i], gb[i]);
    return s;
  }
  function looks(g, mode) {                   // 완두 그림: 모양, 색
    const k = phenoKey(g);
    const out = { round: true, yellow: true };
    MODE_GENES[mode].forEach((gn, i) => {
      const dom = k[i] === GENES[gn].up;
      if (gn === 'R') out.round = dom; else out.yellow = dom;
    });
    return out;
  }
  const className = (key, mode) => (CLASSES[mode].find((c) => c.key === key) || {}).name || '';
  const phenoName = (g, mode) => className(phenoKey(g), mode);
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);

  // 퍼넷 사각형으로 기대 비율 계산
  function expected(ga, gb, mode) {
    const A = gametesOf(ga), B = gametesOf(gb);
    const cnt = {};
    CLASSES[mode].forEach((c) => { cnt[c.key] = 0; });
    A.forEach((a) => B.forEach((b) => { cnt[phenoKey(fuse(a, b))]++; }));
    const vals = CLASSES[mode].map((c) => cnt[c.key]);
    const d = vals.filter((v) => v).reduce(gcd);
    return vals.map((v) => v / d);
  }
  function expectedText(ga, gb, mode, compact) {
    const v = expected(ga, gb, mode);
    const nz = v.filter((x) => x > 0);
    if (nz.length === 1) return '모두 ' + CLASSES[mode][v.findIndex((x) => x > 0)].name;
    return v.join(compact ? ':' : ' : ');
  }
  // 실제 비율 글자. 한 가지 형질: 열성 개수를 1로 (예 3.1 : 1)
  // 두 가지 형질: 예상 비의 합(예 9+3+3+1=16)에 맞춰 나눔 (예 9.2 : 3.1 : 2.8 : 0.9) → 예상 비와 바로 비교
  function ratioText(vals, mode, compact, exp) {
    const nz = vals.filter((v) => v > 0);
    const sep = compact ? ':' : ' : ';
    if (!nz.length) return '–';
    if (nz.length === 1) return '모두 ' + CLASSES[mode][vals.findIndex((x) => x > 0)].name;
    if (vals.length === 4 && exp && exp.filter((x) => x > 0).length > 2) {
      const E = exp.reduce((a, b) => a + b, 0), n = vals.reduce((a, b) => a + b, 0);
      return vals.map((v) => (v ? (v * E / n).toFixed(1) : '0')).join(sep);
    }
    const last = vals[vals.length - 1];
    const div = last > 0 ? last : Math.min.apply(null, nz);
    const f = (v) => {
      if (!v) return '0';
      const r = v / div;
      return Math.abs(r - Math.round(r)) < 0.05 ? String(Math.round(r)) : r.toFixed(1);
    };
    return vals.map(f).join(sep);
  }
  const expOf = (res) => (res.a.mystery || res.b.mystery ? null : expected(res.a.g, res.b.g, res.mode));

  /* =========================================================
     상태
     ========================================================= */
  let uid = 0;
  const plant = (g, gen, extra) => Object.assign({ id: 'p' + (++uid), g, gen }, extra || {});
  const mystery = plant(Math.random() < 0.5 ? 'RR' : 'Rr', null, { mystery: true, revealed: false });
  const PURE_RR = plant('RR', 0), PURE_rr = plant('rr', 0);
  const S = {
    mode: 'shape',
    n: 20,
    showG: false,
    sorted: false,
    modes: {
      shape: { bank: [PURE_RR, PURE_rr, mystery], slots: [null, null], stamp: [0, 0], result: null },
      color: { bank: [plant('YY', 0), plant('yy', 0)], slots: [null, null], stamp: [0, 0], result: null },
      both: { bank: [plant('RRYY', 0), plant('rryy', 0), plant('RRyy', 0), plant('rrYY', 0)], slots: [null, null], stamp: [0, 0], result: null },
    },
    drag: null,
    anim: null,
    targets: {},
    seq: 0,
    missionSeq: 0,
    history: [],
    small: [],            // 자손 4개로 한 Rr × Rr 결과 기록
    verdict: null,
    flash: [0, 0],
    pulse: null,
    hinted: false,
  };
  const cur = () => S.modes[S.mode];
  const known = (it) => !it.mystery || it.revealed;
  const shownG = (it) => (known(it) ? it.g : '?'.repeat(it.g.length));
  function labelOf(it, mode) {
    const ph = phenoName(it.g, mode);
    if (it.mystery) return '수수께끼 ' + ph;
    if (it.gen == null) return '자손 ' + ph;
    return (it.gen >= 1 ? 'F' + it.gen + ' ' : '') + ph;
  }
  const now = () => performance.now() / 1000;

  /* =========================================================
     캔버스
     ========================================================= */
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const BG = '#f3f8ef';
  const SLOT_STYLE = [
    { name: '♀ 암술 쪽', col: '#e0518d', soft: '#ffe4ef' },
    { name: '♂ 꽃가루 쪽', col: '#4b7be5', soft: '#e3edff' },
  ];
  // 화면 폭에 따라 두 가지 배치(가로형 / 세로형)를 씀. 각 배치 안에서는 가상 좌표가 고정됨.
  const LAYOUTS = {
    wide: {
      w: 800, h: 520, reserve: 300,
      bank: { x: 8, y: 8, w: 178, h: 504, titleY: 32, subY: 50, cols: 1, cardX: 16, cardY: 62, cardW: 162, cardH: 56, dx: 0, dy: 63 },
      slots: [{ x: 198, y: 28, w: 186, h: 94 }, { x: 606, y: 28, w: 186, h: 94 }], headY: 20,
      flower: { x: 495, y: 74, r: 40 }, capY: 138, longCap: true,
      gamY: 186, merge: { x: 495, y: 216 },
      tray: { x: 198, y: 248, w: 402, h: 264 }, peas: { x: 208, y: 288, w: 382, h: 216 },
      sort: { x: 504, y: 255, w: 88, h: 26 },
      res: { x: 612, y: 248, w: 180, h: 264, horiz: false },
    },
    tall: {
      w: 480, h: 836, reserve: 140,
      bank: { x: 6, y: 6, w: 468, h: 150, titleY: 28, subY: 28, cols: 3, cardX: 12, cardY: 38, cardW: 148, cardH: 52, dx: 152, dy: 57 },
      slots: [{ x: 8, y: 186, w: 182, h: 94 }, { x: 290, y: 186, w: 182, h: 94 }], headY: 178,
      flower: { x: 240, y: 233, r: 36 }, capY: 300, longCap: false,
      gamY: 334, merge: { x: 240, y: 362 },
      tray: { x: 8, y: 386, w: 464, h: 258 }, peas: { x: 18, y: 424, w: 444, h: 212 },
      sort: { x: 374, y: 393, w: 88, h: 26 },
      res: { x: 8, y: 654, w: 464, h: 176, horiz: true },
    },
  };
  let view, ctx, LAY;
  let BANK, SLOTS, FLOWER, GAM_Y, MERGE, TRAY, PEAS, SORT_BTN, RES;
  function applyLayout(kind) {
    LAY = Object.assign({ kind }, LAYOUTS[kind]);
    BANK = LAY.bank;
    SLOTS = LAY.slots.map((s, i) => Object.assign({ cx: s.x + s.w / 2 }, s, SLOT_STYLE[i]));
    FLOWER = LAY.flower; GAM_Y = LAY.gamY; MERGE = LAY.merge;
    TRAY = LAY.tray; PEAS = LAY.peas; SORT_BTN = LAY.sort; RES = LAY.res;
  }
  const BANK_MAX = 6;

  const bankRect = (i) => ({
    x: BANK.cardX + (i % BANK.cols) * BANK.dx,
    y: BANK.cardY + Math.floor(i / BANK.cols) * BANK.dy,
    w: BANK.cardW, h: BANK.cardH,
  });
  const inR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function font(size, weight) { return (weight || 700) + ' ' + size + 'px ' + FONT; }
  function text(s, x, y, o) {
    o = o || {};
    let size = o.size || 14;
    ctx.font = font(size, o.weight);
    if (o.max) {
      while (size > (o.min || 12) && ctx.measureText(s).width > o.max) { size -= 0.5; ctx.font = font(size, o.weight); }
    }
    ctx.fillStyle = o.color || '#1b2333';
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillText(s, x, y);
    ctx.textBaseline = 'alphabetic';
  }
  // 유전자 글자를 유전자별 색으로 그리기 (가운데 정렬)
  function alleleText(s, x, y, size, o) {
    o = o || {};
    ctx.font = font(size, 800);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const ws = Array.from(s).map((c) => ctx.measureText(c).width);
    const gap = size * 0.04;
    let tx = x - (ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1)) / 2;
    Array.from(s).forEach((c, i) => {
      const gn = geneOf(c);
      if (o.halo) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineJoin = 'round'; ctx.strokeText(c, tx, y + 1); }
      ctx.fillStyle = o.color || (gn ? GENES[gn].ink : '#8a95a6');
      ctx.fillText(c, tx, y + 1);
      tx += ws[i] + gap;
    });
    ctx.textBaseline = 'alphabetic';
  }

  /* ---------- 완두 그리기 ---------- */
  function peaColors(round, yellow) {
    if (yellow) return round ? ['#fff3ad', '#f6cc3c', '#b28812'] : ['#f6e08e', '#dcae33', '#8f6c10'];
    return round ? ['#d8f4b6', '#80c652', '#3f7f22'] : ['#c2e59e', '#69aa41', '#386c1e'];
  }
  function peaPath(x, y, r, round, seed) {
    ctx.beginPath();
    if (round) { ctx.arc(x, y, r, 0, Math.PI * 2); return; }
    const n = 18, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 0.9 + 0.07 * Math.sin(a * 5 + seed) + 0.05 * Math.sin(a * 7 + seed * 1.7);
      pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.93]);
    }
    const mid = (i) => { const p = pts[i % n], q = pts[(i + 1) % n]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
    const m0 = mid(n - 1);
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const m = mid(i); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
    ctx.closePath();
  }
  function drawPea(x, y, r, round, yellow, seed, alpha) {
    const c = peaColors(round, yellow);
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    peaPath(x, y, r, round, seed || 0);
    if (r > 9) {
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
      g.addColorStop(0, c[0]); g.addColorStop(0.55, c[1]); g.addColorStop(1, c[2]);
      ctx.fillStyle = g;
    } else ctx.fillStyle = c[1];
    ctx.fill();
    ctx.strokeStyle = c[2]; ctx.lineWidth = Math.max(1, r * 0.07); ctx.stroke();
    if (!round) {
      // 주름
      ctx.strokeStyle = 'rgba(60,40,0,.28)'; ctx.lineWidth = Math.max(1, r * 0.09); ctx.lineCap = 'round';
      const s = seed || 0;
      const nC = r > 9 ? 3 : 1;
      for (let j = 0; j < nC; j++) {
        const a = s + j * 2.1;
        const cx = x + Math.cos(a) * r * 0.32, cy = y + Math.sin(a) * r * 0.32;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.34, a + 0.7, a + 2.5); ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      ctx.beginPath(); ctx.ellipse(x - r * 0.36, y - r * 0.38, r * 0.27, r * 0.17, -0.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- 생식세포 위치 ---------- */
  function gameteSpec(g) {
    const gs = gametesOf(g);
    const m = gs.length;
    const sp = m === 2 ? 58 : 42;
    const r = m === 2 ? 19 : 17;
    return { gs, m, sp, r };
  }
  function gametePos(side, k, m) {
    const sp = m === 2 ? 58 : 42;
    return { x: SLOTS[side].cx + (k - (m - 1) / 2) * sp, y: GAM_Y };
  }
  function tokenRects(side, g) {
    const s = SLOTS[side], n = g.length;
    const w = n === 2 ? 26 : 21, gap = n === 2 ? 6 : 4;
    const x0 = s.x + 68;
    return Array.from(g).map((c, i) => ({ x: x0 + i * (w + gap), y: s.y + 46, w, h: 28, c }));
  }

  /* =========================================================
     그리기
     ========================================================= */
  function draw() {
    view.clear(BG);
    const t = now();
    const M = cur();
    drawBank(M, t);
    drawSlots(M, t);
    drawFlower(M, t);
    drawGametes(M, t);
    drawTray(M, t);
    drawResults(M, t);
    if (S.anim && S.anim.mode === S.mode) drawAnim(t);
    if (S.drag && S.drag.moved) drawGhost();
  }

  function ring(x, y, w, h, r, t) {
    const a = 0.55 + 0.45 * Math.sin(t * 6);
    ctx.save();
    ctx.strokeStyle = 'rgba(20,160,88,' + a.toFixed(2) + ')'; ctx.lineWidth = 3.5;
    rr(x - 4, y - 4, w + 8, h + 8, r + 4); ctx.stroke();
    ctx.restore();
  }

  function drawBank(M, t) {
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,80,.08)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#fff'; rr(BANK.x, BANK.y, BANK.w, BANK.h, 14); ctx.fill();
    ctx.restore();
    text('🫛 씨앗 보관함', BANK.x + 12, BANK.titleY, { size: 15, weight: 800 });
    if (BANK.subY === BANK.titleY) text('끌어 놓거나 눌러요', BANK.x + BANK.w - 12, BANK.subY, { size: 12, color: '#7a8597', weight: 600, align: 'right' });
    else text('끌어 놓거나 눌러요', BANK.x + 12, BANK.subY, { size: 12, color: '#7a8597', weight: 600 });
    M.bank.forEach((it, i) => drawCard(bankRect(i), it, t, false));
  }

  function drawCard(r, it, t, ghost) {
    const inSlot = cur().slots.includes(it);
    ctx.save();
    if (ghost) { ctx.globalAlpha = 0.92; ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4; }
    ctx.fillStyle = it.mystery ? '#faf5ff' : inSlot ? '#f2faef' : '#f8fafc';
    rr(r.x, r.y, r.w, r.h, 11); ctx.fill();
    ctx.restore();
    ctx.save();
    if (it.mystery && !it.revealed) ctx.setLineDash([5, 4]);
    ctx.strokeStyle = it.mystery ? '#a78bfa' : inSlot ? '#86c96a' : '#dbe2ec'; ctx.lineWidth = 2;
    rr(r.x, r.y, r.w, r.h, 11); ctx.stroke();
    ctx.restore();
    const L = looks(it.g, S.mode);
    const seed = parseInt(it.id.slice(1), 10) * 1.7;
    const ly = r.y + Math.round(r.h * 0.41), gy = r.y + Math.round(r.h * 0.73);
    drawPea(r.x + 25, r.y + r.h / 2, r.h > 54 ? 17 : 16, L.round, L.yellow, seed);
    if (it.mystery && !it.revealed) {
      ctx.fillStyle = '#7c3aed'; ctx.beginPath(); ctx.arc(r.x + 37, r.y + 13, 9, 0, Math.PI * 2); ctx.fill();
      text('?', r.x + 37, r.y + 14, { size: 13, weight: 800, color: '#fff', align: 'center', base: 'middle' });
    }
    text(labelOf(it, S.mode), r.x + 48, ly, { size: 13.5, weight: 800, max: r.w - 54 });
    // 유전자형 + 순종/잡종
    if (known(it)) {
      ctx.font = font(16, 800);
      const gw = ctx.measureText(it.g).width;
      alleleText(it.g, r.x + 48 + gw / 2, gy, 16);
      const tag = isPure(it.g) ? '순종' : '잡종';
      chip(tag, r.x + r.w - 7, gy, isPure(it.g) ? '#0b6b39' : '#9a5b00', isPure(it.g) ? '#e2f6eb' : '#fff4dc');
      if (it.mystery) text('✓', r.x + 48 + gw + 5, gy + 5, { size: 14, weight: 800, color: '#7c3aed' });
    } else {
      text('유전자형 ?', r.x + 48, gy + 5, { size: 14, weight: 800, color: '#7c3aed' });
    }
    const T = S.targets;
    if (!ghost && T.ids && T.ids.includes(it.id) && !inSlot) ring(r.x, r.y, r.w, r.h, 11, t);
    if (!ghost && S.pulse && S.pulse.id === it.id && t - S.pulse.t < 1.2) {
      const a = 1 - (t - S.pulse.t) / 1.2;
      ctx.save(); ctx.strokeStyle = 'rgba(236,72,153,' + a.toFixed(2) + ')'; ctx.lineWidth = 4;
      rr(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 13); ctx.stroke(); ctx.restore();
    }
  }
  function chip(s, right, cy, fg, bg) {
    ctx.font = font(12, 800);
    const w = ctx.measureText(s).width + 12;
    ctx.fillStyle = bg; rr(right - w, cy - 10, w, 20, 10); ctx.fill();
    text(s, right - w / 2, cy + 1, { size: 12, weight: 800, color: fg, align: 'center', base: 'middle' });
  }

  function drawSlots(M, t) {
    SLOTS.forEach((s, i) => {
      const it = M.slots[i];
      text(s.name, s.cx, LAY.headY, { size: 14, weight: 800, color: s.col, align: 'center' });
      const over = S.drag && S.drag.moved && inR(S.drag, s);
      ctx.save();
      ctx.fillStyle = over ? s.soft : it ? '#fff' : 'rgba(255,255,255,.6)';
      rr(s.x, s.y, s.w, s.h, 14); ctx.fill();
      if (!it) ctx.setLineDash([7, 5]);
      ctx.strokeStyle = over ? s.col : it ? s.col : '#b9c4d4'; ctx.lineWidth = over ? 3 : 2;
      rr(s.x, s.y, s.w, s.h, 14); ctx.stroke();
      ctx.restore();
      const fl = t - S.flash[i];
      if (fl < 0.5) {
        ctx.save(); ctx.strokeStyle = s.col; ctx.globalAlpha = 1 - fl / 0.5; ctx.lineWidth = 3;
        rr(s.x - fl * 14, s.y - fl * 14, s.w + fl * 28, s.h + fl * 28, 14 + fl * 10); ctx.stroke(); ctx.restore();
      }
      if (!it) {
        text('＋', s.cx, s.y + 44, { size: 28, weight: 700, color: '#b9c4d4', align: 'center', base: 'middle' });
        text('완두를 여기로', s.cx, s.y + 76, { size: 13, weight: 700, color: '#8a95a6', align: 'center' });
        if (S.targets.ids && S.targets.ids.length) ring(s.x, s.y, s.w, s.h, 14, t);
        return;
      }
      const L = looks(it.g, S.mode);
      drawPea(s.x + 36, s.y + 48, 25, L.round, L.yellow, parseInt(it.id.slice(1), 10) * 1.7);
      if (it.mystery && !it.revealed) {
        ctx.fillStyle = '#7c3aed'; ctx.beginPath(); ctx.arc(s.x + 54, s.y + 26, 10, 0, Math.PI * 2); ctx.fill();
        text('?', s.x + 54, s.y + 27, { size: 14, weight: 800, color: '#fff', align: 'center', base: 'middle' });
      }
      text(labelOf(it, S.mode), s.x + 68, s.y + 30, { size: 13.5, weight: 800, max: s.w - 68 - 28 });
      // 유전자 쌍 토큰
      const g = shownG(it);
      tokenRects(i, g).forEach((tk) => {
        const gn = geneOf(tk.c);
        ctx.fillStyle = '#fff'; rr(tk.x, tk.y, tk.w, tk.h, 7); ctx.fill();
        ctx.strokeStyle = gn ? GENES[gn].ink : '#a78bfa'; ctx.lineWidth = 2; ctx.stroke();
        alleleText(tk.c, tk.x + tk.w / 2, tk.y + tk.h / 2, g.length === 2 ? 18 : 16);
      });
      // 비우기 표시
      ctx.fillStyle = '#eef1f6'; ctx.beginPath(); ctx.arc(s.x + s.w - 14, s.y + 14, 9, 0, Math.PI * 2); ctx.fill();
      text('✕', s.x + s.w - 14, s.y + 15, { size: 12, weight: 800, color: '#6b768a', align: 'center', base: 'middle' });
    });
  }

  function drawFlower(M, t) {
    const [a, b] = M.slots;
    const ready = a && b && !S.anim;
    const f = FLOWER;
    const spin = S.anim ? (t - S.anim.t0) * 2.2 : 0;
    const pulse = ready ? 1 + 0.04 * Math.sin(t * 5) : 1;
    ctx.save();
    ctx.translate(f.x, f.y); ctx.scale(pulse, pulse); ctx.rotate(spin);
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.rotate((i / 5) * Math.PI * 2);
      ctx.fillStyle = ready || S.anim ? '#f9a8d4' : '#e2e6ee';
      ctx.strokeStyle = ready || S.anim ? '#ec4899' : '#c3cad6'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, -f.r * 0.56, f.r * 0.36, f.r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = ready || S.anim ? '#fde047' : '#eef1f6';
    ctx.beginPath(); ctx.arc(0, 0, f.r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ready || S.anim ? '#eab308' : '#c3cad6'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    text('교배', f.x, f.y + 1, { size: 15, weight: 800, color: ready || S.anim ? '#7a3b00' : '#9aa5b6', align: 'center', base: 'middle' });
    let cap = LAY.longCap ? '♀ × ♂ 부모를 놓아요' : '부모를 놓아요';
    if (a && b) cap = a === b ? '🌼 자가 수분' : LAY.longCap ? '타가 수분 (다른 개체끼리)' : '타가 수분';
    else if (a || b) cap = LAY.longCap ? '한쪽만 놓으면 자가 수분 가능' : '';
    text(cap, f.x, LAY.capY, { size: 13, weight: 700, color: a && b ? '#be185d' : '#8a95a6', align: 'center', max: LAY.longCap ? 200 : 96 });
    if (ready && S.targets.ids && S.targets.ids.length) {
      const al = 0.5 + 0.5 * Math.sin(t * 6);
      ctx.save(); ctx.strokeStyle = 'rgba(20,160,88,' + al.toFixed(2) + ')'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 8, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }

  function drawGametes(M, t) {
    const A = S.anim && S.anim.mode === S.mode ? S.anim : null;
    const el = A ? t - A.t0 : 99;
    const any = M.slots[0] || M.slots[1];
    if (!any) {
      text(LAY.longCap ? '부모를 놓으면 생식세포(유전자를 하나씩 가진 세포)가 여기에 나타나요' : '부모를 놓으면 생식세포가 여기에 나타나요',
        MERGE.x, GAM_Y + 5, { size: 13, weight: 700, color: '#9aa5b6', align: 'center', max: LAY.w - 40 });
      return;
    }
    M.slots.forEach((it, side) => {
      if (!it) return;
      const g = A ? A.shown[side] : shownG(it);
      const spec = gameteSpec(g);
      const toks = tokenRects(side, g);
      const appear = clamp((el - 0.35) / 0.2, 0, 1);       // 애니메이션 중 생식세포 등장
      // 분리 선: 유전자 토큰 → 생식세포
      ctx.save();
      ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
      spec.gs.forEach((gm, k) => {
        const gp = gametePos(side, k, spec.m);
        Array.from(gm).forEach((c, j) => {
          const s = spec.m === 2 ? k : j * 2 + (j === 0 ? (k >> 1) : (k & 1));
          const tk = toks[s];
          const gn = geneOf(c);
          ctx.strokeStyle = gn ? GENES[gn].ink + '55' : '#a78bfa55';
          ctx.beginPath(); ctx.moveTo(tk.x + tk.w / 2, tk.y + tk.h + 2); ctx.lineTo(gp.x, gp.y - spec.r - 2); ctx.stroke();
        });
      });
      ctx.restore();
      spec.gs.forEach((gm, k) => {
        const gp = gametePos(side, k, spec.m);
        const a = A ? appear : 1;
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha = a;
        gameteCircle(gp.x, gp.y, spec.r * (A ? 0.6 + 0.4 * a : 1), gm, side);
        ctx.restore();
        text(spec.m === 2 ? '½' : '¼', gp.x, gp.y + spec.r + 16, { size: 13, weight: 700, color: '#7a8597', align: 'center' });
      });
    });
    if (!A || el > 2.4) {
      text(LAY.longCap ? '◀  생식세포  ▶' : '◀ 생식세포 ▶', MERGE.x, GAM_Y + 5, { size: 13, weight: 800, color: '#7a8597', align: 'center' });
    }
  }
  function gameteCircle(x, y, r, letters, side) {
    const s = SLOTS[side];
    ctx.fillStyle = s.soft; ctx.strokeStyle = s.col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    alleleText(letters, x, y, letters.length === 1 ? Math.min(18, r * 0.95) : Math.min(15, r * 0.82));
  }

  /* ---------- 자손 트레이 ---------- */
  function drawTray(M, t) {
    ctx.save();
    const g = ctx.createLinearGradient(0, TRAY.y, 0, TRAY.y + TRAY.h);
    g.addColorStop(0, '#6b5644'); g.addColorStop(1, '#58463a');
    ctx.fillStyle = g; rr(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 14); ctx.fill();
    ctx.strokeStyle = '#4a3b30'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    const res = M.result;
    if (!res) {
      text('자손 트레이', TRAY.x + 14, TRAY.y + 23, { size: 14, weight: 800, color: '#f6efe6' });
      text('🌸 교배하면 자손 완두가 여기에 나와요', TRAY.x + TRAY.w / 2, TRAY.y + TRAY.h / 2 + 14, { size: 14, weight: 700, color: 'rgba(246,239,230,.75)', align: 'center' });
      return;
    }
    const shown = revealed(res, t);
    const genTxt = res.gen != null ? ' (F' + res.gen + ')' : '';
    text('자손' + genTxt + ' · ' + shown + '개', TRAY.x + 14, TRAY.y + 23, { size: 14, weight: 800, color: '#f6efe6' });
    // 정렬 버튼
    const sb = SORT_BTN;
    ctx.fillStyle = S.sorted ? '#fde68a' : 'rgba(255,255,255,.16)';
    rr(sb.x, sb.y, sb.w, sb.h, 13); ctx.fill();
    text(S.sorted ? '섞어 보기' : '모아 보기', sb.x + sb.w / 2, sb.y + sb.h / 2 + 1, { size: 12.5, weight: 800, color: S.sorted ? '#6b4a00' : '#f6efe6', align: 'center', base: 'middle' });
    // 완두
    const A = S.anim && S.anim.res === res ? S.anim : null;
    const el = A ? t - A.t0 : 99;
    const r = res.r;
    const showText = S.showG && r >= (res.mode === 'both' ? 16 : 10);
    const fs = clamp(r * (res.mode === 'both' ? 0.62 : 0.78), 12, 18);
    res.kids.forEach((k, i) => {
      let sc = 1;
      if (A) {
        const pt = popTime(i, res.n);
        if (el < pt) return;
        const u = (el - pt) / 0.18;
        sc = u >= 1 ? 1 : 0.3 + Math.sin(u * Math.PI * 0.75) * 0.95;
      }
      const L = looks(k.g, res.mode);
      drawPea(k.x, k.y, r * sc, L.round, L.yellow, k.seed);
      if (showText && sc >= 1) alleleText(k.g, k.x, k.y, fs, { halo: true });
    });
    if (S.showG && !showText && !A) {
      const note = '🧬 자손이 많아 유전자형 글자는 생략' + (res.mode === 'both' ? ' (자손 20개 이하에서 보여요)' : ' → 결과 표');
      ctx.font = font(12.5, 800);
      const w = Math.min(TRAY.w - 16, ctx.measureText(note).width + 20);
      ctx.fillStyle = 'rgba(30,22,16,.82)'; rr(TRAY.x + (TRAY.w - w) / 2, TRAY.y + TRAY.h - 30, w, 24, 12); ctx.fill();
      text(note, TRAY.x + TRAY.w / 2, TRAY.y + TRAY.h - 17, { size: 12.5, weight: 800, color: '#fdf6ec', align: 'center', base: 'middle', max: w - 14 });
    }
    // 선택한 자손
    if (res.sel >= 0 && !A) {
      const k = res.kids[res.sel];
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(k.x, k.y, r + 4, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(k.x, k.y, r + 6.5, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      const lab = phenoName(k.g, res.mode) + (S.showG ? ' · ' + k.g : '');
      ctx.font = font(13, 800);
      const w = ctx.measureText(lab).width + 18;
      let bx = clamp(k.x - w / 2, TRAY.x + 6, TRAY.x + TRAY.w - w - 6);
      let by = k.y - r - 38;
      const below = by < PEAS.y - 8;           // 위쪽 줄이면 머리글과 겹치지 않게 아래에 표시
      if (below) by = k.y + r + 10;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8;
      ctx.fillStyle = '#fff'; rr(bx, by, w, 26, 13); ctx.fill(); ctx.restore();
      text(lab, bx + w / 2, by + 14, { size: 13, weight: 800, align: 'center', base: 'middle' });
    }
  }
  const popTime = (i, n) => 1.15 + 1.0 * (i / Math.max(1, n));
  function revealed(res, t) {
    const A = S.anim && S.anim.res === res ? S.anim : null;
    if (!A) return res.n;
    const el = t - A.t0;
    if (el < 1.15) return 0;
    return Math.min(res.n, Math.floor(((el - 1.15) / 1.0) * res.n) + 1);
  }
  function countsOf(res, upto) {
    const c = {}, gc = {};
    CLASSES[res.mode].forEach((k) => { c[k.key] = 0; });
    for (let i = 0; i < upto; i++) { const k = res.kids[i]; c[k.key]++; gc[k.g] = (gc[k.g] || 0) + 1; }
    return { vals: CLASSES[res.mode].map((k) => c[k.key]), gc };
  }

  /* ---------- 결과 패널 ---------- */
  function drawResults(M, t) {
    ctx.save();
    ctx.shadowColor = 'rgba(20,40,80,.08)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#fff'; rr(RES.x, RES.y, RES.w, RES.h, 14); ctx.fill();
    ctx.restore();
    text('📊 결과 (표현형)', RES.x + 12, RES.y + 24, { size: 14, weight: 800 });
    const res = M.result;
    if (!res) {
      const cy = RES.y + RES.h / 2 + 4;
      if (RES.horiz) text('교배 결과가 여기에 나와요', RES.x + RES.w / 2, cy, { size: 13, weight: 700, color: '#8a95a6', align: 'center' });
      else {
        text('교배 결과가', RES.x + RES.w / 2, cy - 10, { size: 13, weight: 700, color: '#8a95a6', align: 'center' });
        text('여기에 나와요', RES.x + RES.w / 2, cy + 10, { size: 13, weight: 700, color: '#8a95a6', align: 'center' });
      }
      return;
    }
    const shown = revealed(res, t);
    const { vals, gc } = countsOf(res, shown);
    const cls = CLASSES[res.mode];
    const di = cls.length === 4;
    // 세로형 패널: 위에서 아래로 / 가로형 패널: 왼쪽 막대 + 오른쪽 비율 상자
    const H = RES.horiz;
    const x0 = RES.x + 12, x1 = H ? RES.x + 288 : RES.x + RES.w - 12;
    const bx = H ? RES.x + 300 : RES.x + 8, bw = H ? RES.w - 310 : RES.w - 16;
    const boxY = H ? RES.y + 36 : RES.y + 194, boxH = 64;
    const gY = H ? RES.y + 124 : RES.y + 156;
    const step = di ? (H ? 33 : 38) : 52;
    cls.forEach((c, i) => {
      const y0 = RES.y + (di ? 38 : 40) + i * step;
      const L = looks(c.key.split('').map((ch) => ch + ch).join(''), res.mode);
      drawPea(x0 + 10, y0 + 10, di ? 9 : 11, L.round, L.yellow, i * 2.3);
      text(c.name, x0 + 26, y0 + 15, { size: di ? 13 : 14, weight: 800, max: x1 - x0 - 70 });
      text(String(vals[i]), x1, y0 + 15, { size: di ? 14 : 16, weight: 800, align: 'right' });
      const barW = x1 - x0, bh = di ? 7 : 10, by = y0 + (di ? 22 : 27);
      ctx.fillStyle = '#eef2f7'; rr(x0, by, barW, bh, bh / 2); ctx.fill();
      const frac = shown ? vals[i] / shown : 0;
      if (frac > 0) {
        ctx.fillStyle = peaColors(L.round, L.yellow)[L.round ? 1 : 2];
        rr(x0, by, Math.max(bh, barW * frac), bh, bh / 2); ctx.fill();
      }
    });
    if (S.showG && !di) {
      const gene = GENES[MODE_GENES[res.mode][0]];
      const gs = [gene.up + gene.up, gene.up + gene.lo, gene.lo + gene.lo];
      text('유전자형 ' + gs.join(' : '), bx + 6, gY, { size: 12, weight: 700, color: '#7a8597', max: bw - 8 });
      text(gs.map((g) => gc[g] || 0).join(' : '), bx + 6, gY + 21, { size: 15, weight: 800, max: bw - 8 });
    }
    // 비율 상자
    ctx.fillStyle = '#f5f8fd'; rr(bx, boxY, bw, boxH, 10); ctx.fill();
    const ev = expOf(res);
    const lab = di && ev && ev.filter((x) => x > 0).length > 2 ? '표현형 비 (합 ' + ev.reduce((p, q) => p + q, 0) + ' 기준)' : '표현형 비';
    text(lab, bx + 8, boxY + 18, { size: 12, weight: 700, color: '#7a8597', max: bw - 14 });
    const rt = shown ? ratioText(vals, res.mode, false, expOf(res)) : '–';
    text(rt, bx + 8, boxY + 41, { size: di ? 16 : 19, weight: 800, color: '#14532d', max: bw - 14 });
    const ex = (res.a.mystery && !res.a.revealedAt) || (res.b.mystery && !res.b.revealedAt) ? '?' : expectedText(res.a.g, res.b.g, res.mode, false);
    text('예상 ' + ex, bx + 8, boxY + 58, { size: 12, weight: 700, color: '#7a8597', max: bw - 14 });
  }

  /* ---------- 교배 애니메이션 ---------- */
  function drawAnim(t) {
    const A = S.anim, el = t - A.t0, res = A.res;
    // ① 분리: 유전자 토큰이 생식세포로 이동
    if (el < 0.6) {
      [0, 1].forEach((side) => {
        const g = A.shown[side];
        const spec = gameteSpec(g);
        const toks = tokenRects(side, g);
        const u = clamp(el / 0.5, 0, 1), e = u * u * (3 - 2 * u);
        spec.gs.forEach((gm, k) => {
          const gp = gametePos(side, k, spec.m);
          Array.from(gm).forEach((c, j) => {
            const s = spec.m === 2 ? k : j * 2 + (j === 0 ? (k >> 1) : (k & 1));
            const tk = toks[s];
            const off = gm.length === 1 ? 0 : (j - 0.5) * 11;
            const x = tk.x + tk.w / 2 + (gp.x + off - tk.x - tk.w / 2) * e;
            const y = tk.y + tk.h / 2 + (gp.y - tk.y - tk.h / 2) * e;
            ctx.save(); ctx.globalAlpha = 1 - clamp((el - 0.45) / 0.15, 0, 1);
            alleleText(c, x, y, 17, { halo: true });
            ctx.restore();
          });
        });
      });
      if (el > 0.1) text('분리!', MERGE.x, GAM_Y + 5, { size: 15, weight: 800, color: '#be185d', align: 'center' });
    }
    // ② 수정: 생식세포가 만나 자손이 됨
    const K = Math.min(6, res.n);
    for (let e = 0; e < K; e++) {
      const st = 0.55 + e * 0.13;
      const u = (el - st) / 0.42;
      if (u < 0 || u > 2.1) continue;
      const kid = res.kids[e];
      const ga = gametesOf(A.shown[0])[kid.ia], gb = gametesOf(A.shown[1])[kid.ib];
      const mA = gametesOf(A.shown[0]).length, mB = gametesOf(A.shown[1]).length;
      const pa = gametePos(0, kid.ia, mA), pb = gametePos(1, kid.ib, mB);
      const r = mA === 2 ? 15 : 13;
      if (u <= 1) {
        const ee = u * u * (3 - 2 * u);
        gameteCircle(pa.x + (MERGE.x - 16 - pa.x) * ee, pa.y + (MERGE.y - pa.y) * ee, r, ga, 0);
        gameteCircle(pb.x + (MERGE.x + 16 - pb.x) * ee, pb.y + (MERGE.y - pb.y) * ee, r, gb, 1);
      } else {
        const v = clamp(u - 1, 0, 1);
        const zx = MERGE.x, zy = MERGE.y + v * 70;
        ctx.save(); ctx.globalAlpha = 1 - clamp((u - 1.6) / 0.5, 0, 1);
        ctx.fillStyle = '#ecfccb'; ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(zx, zy, r + 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        alleleText(fuseShown(ga, gb), zx, zy, ga.length === 1 ? 15 : 12);
        ctx.restore();
      }
    }
    if (el > 0.6 && el < 2.0) text('수정!', MERGE.x, MERGE.y - 26, { size: 15, weight: 800, color: '#15803d', align: 'center' });
  }
  function fuseShown(ga, gb) {
    let s = '';
    for (let i = 0; i < ga.length; i++) s += ga[i] === '?' || gb[i] === '?' ? ga[i] + gb[i] : normPair(ga[i], gb[i]);
    return s;
  }

  function drawGhost() {
    const d = S.drag;
    drawCard({ x: d.x - BANK.cardW / 2, y: d.y - BANK.cardH / 2, w: BANK.cardW, h: BANK.cardH }, d.item, now(), true);
  }

  /* =========================================================
     자손 배치
     ========================================================= */
  function layoutKids(res, snap) {
    const n = res.kids.length;
    let best = { c: 1, rws: n, s: 0 };
    for (let c = 1; c <= n; c++) {
      const rws = Math.ceil(n / c);
      const s = Math.min(PEAS.w / c, PEAS.h / rws);
      if (s > best.s) best = { c, rws, s };
    }
    res.cell = best.s;
    res.r = Math.min(30, best.s * 0.42);
    const order = res.kids.map((k, i) => i);
    if (S.sorted) {
      const ci = (k) => CLASSES[res.mode].findIndex((c) => c.key === k.key);
      order.sort((a, b) => ci(res.kids[a]) - ci(res.kids[b]) || (res.kids[a].g < res.kids[b].g ? -1 : res.kids[a].g > res.kids[b].g ? 1 : a - b));
    }
    const gw = best.c * best.s, gh = best.rws * best.s;
    const ox = PEAS.x + (PEAS.w - gw) / 2, oy = PEAS.y + (PEAS.h - gh) / 2;
    order.forEach((ki, slot) => {
      const k = res.kids[ki];
      const col = slot % best.c, row = Math.floor(slot / best.c);
      k.tx = ox + (col + 0.5) * best.s;
      k.ty = oy + (row + 0.5) * best.s;
      if (snap) { k.x = k.tx; k.y = k.ty; }
    });
  }
  function stepKids(dt) {
    const res = cur().result;
    if (!res) return;
    const f = Math.min(1, dt * 9);
    res.kids.forEach((k) => { k.x += (k.tx - k.x) * f; k.y += (k.ty - k.y) * f; });
  }
  function kidAt(p) {
    const res = cur().result;
    if (!res || !inR(p, PEAS)) return -1;
    let bi = -1, bd = Infinity;
    res.kids.forEach((k, i) => { const d = Math.hypot(k.x - p.x, k.y - p.y); if (d < bd) { bd = d; bi = i; } });
    return bd <= Math.max(res.r + 4, res.cell * 0.6) ? bi : -1;
  }

  /* =========================================================
     조작
     ========================================================= */
  function placeItem(side, item) {
    const M = cur();
    M.slots[side] = item;
    M.stamp[side] = now();
    S.flash[side] = now();
    Sound.click();
    changed();
  }
  function tapBank(item) {
    const M = cur();
    let side = M.slots[0] ? (M.slots[1] ? (M.stamp[0] <= M.stamp[1] ? 0 : 1) : 1) : 0;
    placeItem(side, item);
  }
  function clearSlot(side) {
    cur().slots[side] = null;
    Sound.tick();
    changed();
  }
  function clearSlots() { const M = cur(); M.slots = [null, null]; changed(); }

  function doCross(selfPlant) {
    if (S.anim) return;
    const M = cur();
    if (selfPlant) { M.slots = [selfPlant, selfPlant]; M.stamp = [now(), now()]; S.flash = [now(), now()]; changed(); }
    const [a, b] = M.slots;
    if (!a || !b) {
      Sound.fail();
      toast('♀ 자리와 ♂ 자리에 부모 완두를 모두 놓아 주세요', 'bad');
      return;
    }
    hideHint();
    const GA = gametesOf(a.g), GB = gametesOf(b.g);
    const kids = [];
    for (let i = 0; i < S.n; i++) {
      const ia = Math.floor(Math.random() * GA.length), ib = Math.floor(Math.random() * GB.length);
      const g = fuse(GA[ia], GB[ib]);
      kids.push({ g, key: phenoKey(g), ia, ib, seed: Math.random() * 10, x: 0, y: 0, tx: 0, ty: 0 });
    }
    const gen = a.gen != null && a.gen === b.gen ? a.gen + 1 : null;
    const snap = (it) => ({ id: it.id, g: it.g, gen: it.gen, mystery: !!it.mystery, revealedAt: !!it.revealed });
    const res = { seq: 0, mode: S.mode, a: snap(a), b: snap(b), self: a === b, n: S.n, kids, gen, sel: -1, done: false };
    layoutKids(res, true);
    M.result = res;
    S.anim = { t0: now(), res, mode: S.mode, shown: [shownG(a), shownG(b)], ticks: 0 };
    Sound.tone(660, 0.12, 'triangle', 0.08); Sound.tone(880, 0.14, 'triangle', 0.07, 0.08);
    updateButtons();
    revealScene();
  }
  // 세로형(휴대폰)에서 교배 버튼을 누르면 부모 → 생식세포 → 자손 장면이 화면에 보이도록 스크롤
  function revealScene() {
    if (LAY.kind !== 'tall') return;
    const r = view.canvas.getBoundingClientRect();
    const head = ($('.sim-header') || { offsetHeight: 0 }).offsetHeight;
    const top = r.top + view.scale * (LAY.headY - 18);
    const bottom = r.top + view.scale * (TRAY.y + TRAY.h);
    if (top < head || bottom > window.innerHeight) {
      try { window.scrollBy({ top: top - head - 6, behavior: 'smooth' }); } catch (e) { window.scrollBy(0, top - head - 6); }
    }
  }
  function stepAnim() {
    const A = S.anim;
    if (!A) return;
    const el = now() - A.t0;
    // 톡톡 효과음
    const shown = revealed(A.res, now());
    const want = Math.min(8, shown);
    if (want > A.ticks && el > 1.15) { A.ticks = want; Sound.tick(); }
    if (el >= 2.45) {
      S.anim = null;
      const res = A.res;
      res.done = true;
      res.seq = ++S.seq;
      S.history.push(res);
      if (S.history.length > 40) S.history.shift();
      if (res.mode === 'shape' && res.n === 4 && res.a.g === 'Rr' && res.b.g === 'Rr' && !res.a.mystery && !res.b.mystery) {
        const v = countsOf(res, res.n).vals;
        S.small.push(v[0] + ' : ' + v[1]);
        if (S.small.length > 6) S.small.shift();
      }
      updateButtons();
    }
  }

  function selectKid(i) {
    const res = cur().result;
    if (!res) return;
    res.sel = res.sel === i ? -1 : i;
    Sound.tick();
    updateButtons();
  }

  function addToBank(mode, g, gen) {
    const M = S.modes[mode];
    if (M.bank.length >= BANK_MAX) {
      const old = M.bank.find((it) => it.saved && !M.slots.includes(it));
      if (!old) return null;
      M.bank.splice(M.bank.indexOf(old), 1);
    }
    const it = plant(g, gen, { saved: true });
    M.bank.push(it);
    return it;
  }
  function saveKid() {
    const M = cur(), res = M.result;
    if (!res || res.sel < 0 || S.anim) return;
    const k = res.kids[res.sel];
    const dup = M.bank.find((it) => !it.mystery && it.g === k.g && it.gen === res.gen);
    if (dup) {
      S.pulse = { id: dup.id, t: now() };
      toast('보관함에 이미 같은 완두(' + dup.g + ')가 있어요');
      return;
    }
    const it = addToBank(S.mode, k.g, res.gen);
    if (!it) { toast('보관함이 가득 찼어요. 부모 자리를 비워 주세요', 'bad'); return; }
    S.pulse = { id: it.id, t: now() };
    Sound.success();
    toast('＋ 보관함에 추가: ' + labelOf(it, S.mode) + ' (' + it.g + ')', 'good');
    changed();
  }
  // 미션용: 보관함에 해당 유전자형이 없으면 넣어 줌
  function ensurePlant(mode, g, gen, announce) {
    const M = S.modes[mode];
    let it = M.bank.find((x) => !x.mystery && x.g === g);
    if (!it) {
      it = addToBank(mode, g, gen);
      if (announce && it) toast('🫛 보관함에 F' + gen + ' 완두(' + g + ')를 넣어 두었어요');
    }
    return it;
  }
  function setSlots(mode, a, b) {
    const M = S.modes[mode];
    M.slots = [a, b];
    M.stamp = [now(), now() + 0.001];
    if (mode === S.mode) S.flash = [now(), now()];
    changed();
  }

  /* ---------- 포인터 ---------- */
  function hitTest(p) {
    const M = cur();
    for (let i = 0; i < M.bank.length; i++) if (inR(p, bankRect(i))) return { type: 'bank', item: M.bank[i] };
    for (let i = 0; i < 2; i++) if (inR(p, SLOTS[i]) && M.slots[i]) return { type: 'slot', i };
    if (Math.hypot(p.x - FLOWER.x, p.y - FLOWER.y) <= FLOWER.r + 8) return { type: 'flower' };
    if (M.result) {
      if (inR(p, SORT_BTN)) return { type: 'sort' };
      const k = kidAt(p);
      if (k >= 0) return { type: 'kid', i: k };
    }
    return null;
  }
  const handlers = {
    hover(p) {
      const h = hitTest(p);
      if (!h) return null;
      if (S.anim && h.type !== 'sort') return 'wait';
      return h.type === 'bank' ? 'grab' : 'pointer';
    },
    down(p) {
      hideHint();
      const h = hitTest(p);
      if (!h) return false;
      if (h.type === 'sort') { toggleSort(); return false; }
      if (S.anim) return false;
      if (h.type === 'bank') { S.drag = { item: h.item, sx: p.x, sy: p.y, x: p.x, y: p.y, moved: false }; return true; }
      if (h.type === 'slot') { clearSlot(h.i); return false; }
      if (h.type === 'flower') { doCross(); return false; }
      if (h.type === 'kid') { selectKid(h.i); return false; }
      return false;
    },
    move(p) {
      const d = S.drag;
      if (!d) return;
      d.x = p.x; d.y = p.y;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true;
    },
    up(p) {
      const d = S.drag;
      S.drag = null;
      if (!d) return;
      if (!d.moved) { tapBank(d.item); return; }
      const side = SLOTS.findIndex((s) => inR(p, { x: s.x - 10, y: s.y - 14, w: s.w + 20, h: s.h + 40 }));
      if (side >= 0) placeItem(side, d.item);
    },
  };

  /* ---------- 무대(캔버스) 만들기: 좁은 화면에서는 세로형 배치 ---------- */
  const mq = window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
  function buildStage() {
    const kind = mq && mq.matches ? 'tall' : 'wide';
    if (LAY && LAY.kind === kind) return;
    let cv = $('#cv');
    if (view) {
      // 배치가 바뀌면 새 캔버스로 교체 (가상 좌표계가 달라지므로)
      const fresh = document.createElement('canvas');
      fresh.id = 'cv';
      fresh.setAttribute('aria-label', cv.getAttribute('aria-label') || '');
      cv.replaceWith(fresh);
      cv = fresh;
    }
    applyLayout(kind);
    S.drag = null;
    view = SciSim.stage(cv, { width: LAY.w, height: LAY.h, reserve: LAY.reserve });
    ctx = view.ctx;
    SciSim.pointer(view, handlers);
    Object.values(S.modes).forEach((M) => { if (M.result) layoutKids(M.result, true); });
  }
  buildStage();
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', buildStage);
    else if (mq.addListener) mq.addListener(buildStage);
  }
  function toggleSort() {
    S.sorted = !S.sorted;
    Sound.click();
    Object.values(S.modes).forEach((M) => { if (M.result) layoutKids(M.result, false); });
  }

  /* ---------- HTML 컨트롤 ---------- */
  const modeBtns = $$('#modeSeg button'), nBtns = $$('#nSeg button');
  function setMode(mode) {
    if (S.mode === mode) return;
    S.mode = mode;
    S.drag = null;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    changed();
  }
  function setN(n) {
    S.n = n;
    nBtns.forEach((b) => b.classList.toggle('on', +b.dataset.n === n));
    refreshTargets();
  }
  modeBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  nBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); setN(+b.dataset.n); }));
  $('#showG').addEventListener('change', (e) => { S.showG = e.target.checked; Sound.click(); });
  $('#crossBtn').addEventListener('click', () => doCross());
  $('#selfBtn').addEventListener('click', () => {
    const [a, b] = cur().slots;
    const p = a && b ? (a === b ? a : null) : a || b;
    if (!p) {
      Sound.fail();
      toast(a && b ? '자가 수분은 한 그루의 완두로 해요. 한쪽 자리만 남겨 주세요' : '먼저 완두 하나를 ♀ 또는 ♂ 자리에 놓아 주세요', 'bad');
      return;
    }
    doCross(p);
  });
  $('#clearBtn').addEventListener('click', () => { if (S.anim) return; Sound.click(); clearSlots(); });
  $('#saveBtn').addEventListener('click', saveKid);

  function updateButtons() {
    const M = cur(), [a, b] = M.slots;
    $('#crossBtn').disabled = !!S.anim;
    $('#selfBtn').disabled = !!S.anim || !(a || b) || (a && b && a !== b);
    $('#clearBtn').disabled = !!S.anim || !(a || b);
    const res = M.result;
    $('#saveBtn').disabled = !!S.anim || !res || res.sel < 0;
  }

  const hintEl = $('#stageHint');
  // 안내 말풍선은 캔버스 아래쪽(교배 버튼 줄 바로 위)에 띄움
  // 세로형 배치에서는 보관함 아래쪽 빈 줄 위에 띄움 (휴대폰 첫 화면에서 보이도록)
  function placeHint() {
    if (S.hinted) return;
    const msg = LAY.kind === 'tall' ? '👆 완두 카드를 ♀·♂ 자리로 끌거나 눌러요' : '👆 보관함의 완두를 ♀·♂ 자리로 끌어다 놓거나 눌러 보세요';
    if (hintEl.textContent !== msg) hintEl.textContent = msg;
    if (LAY.kind === 'tall') {
      hintEl.style.bottom = 'auto';
      hintEl.style.top = Math.round($('#toolbar').offsetHeight + view.scale * 106) + 'px';
    } else {
      hintEl.style.top = 'auto';
      hintEl.style.bottom = ($('.stage-actions').offsetHeight + 12) + 'px';
    }
  }
  function hideHint() { if (!S.hinted) { S.hinted = true; hintEl.classList.add('hide'); } }
  window.addEventListener('resize', placeHint);

  // 상태가 바뀔 때마다 (부모, 모드)
  function changed() {
    updateButtons();
    renderPunnett();
    refreshTargets();
  }

  /* =========================================================
     퍼넷 사각형 (HTML)
     ========================================================= */
  const pn = {
    key: '', fill: [], pal: null, ans: [], cells: [], missionMode: false,
    card: $('#pnCard'), grid: $('#pnGrid'), palEl: $('#pnPalette'), help: $('#pnHelp'), sub: $('#pnSub'),
    msg: $('#pnMsg'), check: $('#pnCheck'), clear: $('#pnClear'), foot: $('#pnFoot'),
  };
  let WRINKLE_D = '';
  (function () {
    const n = 18, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 0.9 + 0.07 * Math.sin(a * 5 + 1.3) + 0.05 * Math.sin(a * 7 + 2.2);
      pts.push([12 + Math.cos(a) * 9.6 * k, 12 + Math.sin(a) * 9.6 * k * 0.93]);
    }
    WRINKLE_D = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + 'Z';
  })();
  function peaSVG(round, yellow, size) {
    const c = peaColors(round, yellow);
    const body = round
      ? '<circle cx="12" cy="12" r="9.6" fill="' + c[1] + '" stroke="' + c[2] + '" stroke-width="1.4"/><ellipse cx="8.6" cy="8.4" rx="2.6" ry="1.7" fill="#fff" opacity=".65" transform="rotate(-35 8.6 8.4)"/>'
      : '<path d="' + WRINKLE_D + '" fill="' + c[1] + '" stroke="' + c[2] + '" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 9 q3 -2 5 1 M10 15 q3 1 6 -2" fill="none" stroke="rgba(60,40,0,.35)" stroke-width="1.3" stroke-linecap="round"/>';
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
  }
  const alleleHTML = (s) => Array.from(s).map((c) => {
    const gn = geneOf(c);
    return gn ? '<span class="pn-allele-' + gn + '">' + c + '</span>' : c;
  }).join('');

  function pnInfo() {
    const [a, b] = cur().slots;
    const di = S.mode === 'both';
    const hidden = (a && !known(a)) || (b && !known(b));
    const key = S.mode + '|' + (a ? shownG(a) + (known(a) ? '' : a.id) : '-') + '|' + (b ? shownG(b) + (known(b) ? '' : b.id) : '-');
    return { a, b, di, hidden, ok: !!(a && b) && !hidden, key };
  }

  function renderPunnett(force) {
    const st = pnInfo();
    if (!force && st.key === pn.key) return;
    pn.key = st.key;
    const { a, b, di } = st;
    const gene = GENES[MODE_GENES[S.mode][0]];
    const fG = a ? (known(a) ? gametesOf(a.g) : gametesOf(shownG(a))) : (di ? ['?', '?', '?', '?'] : ['?', '?']);
    const mG = b ? (known(b) ? gametesOf(b.g) : gametesOf(shownG(b))) : (di ? ['?', '?', '?', '?'] : ['?', '?']);
    const m = di ? 4 : 2;
    pn.sub.innerHTML = (a ? alleleHTML(shownG(a)) : '?') + ' × ' + (b ? alleleHTML(shownG(b)) : '?');
    pn.fill = []; pn.ans = []; pn.cells = [];
    pn.msg.textContent = ''; pn.msg.className = 'pn-msg';
    pn.grid.className = 'pn-grid ' + (di ? 'g4' : 'g2');
    pn.grid.innerHTML = '';

    // 도움말
    if (!a || !b) pn.help.innerHTML = '♀·♂ 자리에 부모 완두를 놓으면 <b>생식세포</b>가 가로·세로에 나타나요.';
    else if (st.hidden) pn.help.innerHTML = '🕵️ 유전자형을 모르는 부모(?)가 있어 칸을 채울 수 없어요. <b>검정 교배</b>로 알아내 보세요!';
    else if (di) pn.help.innerHTML = '두 가지 형질은 16칸이 자동으로 채워져요. <b>같은 표현형끼리 같은 색</b>이에요.';
    else pn.help.innerHTML = '① 채울 유전자형을 고르고 ② 칸을 눌러요. 각 칸 = <b>♀ 생식세포 + ♂ 생식세포</b>';

    // 팔레트 (한 가지 형질만)
    pn.palEl.innerHTML = '';
    const editable = st.ok && !di;
    pn.palEl.hidden = !editable;
    pn.foot.hidden = !editable;
    if (editable) {
      const opts = [gene.up + gene.up, gene.up + gene.lo, gene.lo + gene.lo];
      if (!opts.includes(pn.pal)) pn.pal = opts[0];
      opts.concat(['erase']).forEach((o) => {
        const L = o === 'erase' ? null : looks(o, S.mode);
        const btn = SciSim.el('button', {
          type: 'button', class: 'pn-pal' + (o === 'erase' ? ' erase' : '') + (pn.pal === o ? ' on' : ''), 'data-pal': o,
          html: o === 'erase' ? '🧽 지우개' : '<span>' + alleleHTML(o) + '</span>' + peaSVG(L.round, L.yellow, 20),
        });
        btn.addEventListener('click', () => {
          pn.pal = o; Sound.tick();
          $$('.pn-pal', pn.palEl).forEach((x) => x.classList.toggle('on', x === btn));
        });
        pn.palEl.appendChild(btn);
      });
    }

    // 표
    const E = SciSim.el;
    pn.grid.appendChild(E('div', { class: 'pn-corner', html: '♀ ＼ ♂' }));
    mG.forEach((g) => pn.grid.appendChild(E('div', { class: 'pn-gam ' + (b && known(b) ? 'm' : 'q') }, [E('span', { html: alleleHTML(g) })])));
    for (let i = 0; i < m; i++) {
      pn.grid.appendChild(E('div', { class: 'pn-gam ' + (a && known(a) ? 'f' : 'q') }, [E('span', { html: alleleHTML(fG[i]) })]));
      pn.fill.push([]); pn.ans.push([]); pn.cells.push([]);
      for (let j = 0; j < m; j++) {
        const ans = st.ok ? fuse(fG[i], mG[j]) : null;
        pn.ans[i][j] = ans;
        pn.fill[i][j] = null;
        let cell;
        if (di && st.ok) {
          const L = looks(ans, 'both');
          cell = E('div', { class: 'pn-cell c-' + phenoKey(ans), title: phenoName(ans, 'both') }, []);
          cell.innerHTML = '<span>' + alleleHTML(ans) + '</span>' + peaSVG(L.round, L.yellow, 18);
        } else {
          cell = E('button', { type: 'button', class: 'pn-cell', 'aria-label': (i + 1) + '행 ' + (j + 1) + '열 칸' });
          if (!editable) { cell.disabled = true; cell.textContent = '?'; }
          else cell.addEventListener('click', () => paintCell(i, j));
        }
        pn.cells[i][j] = cell;
        pn.grid.appendChild(cell);
      }
    }
    if (di && st.ok) {
      const cnt = {};
      CLASSES.both.forEach((c) => { cnt[c.key] = 0; });
      pn.ans.forEach((row) => row.forEach((g) => { cnt[phenoKey(g)]++; }));
      pn.msg.innerHTML = '16칸 → ' + CLASSES.both.map((c) => c.name + ' <b>' + cnt[c.key] + '</b>').join(' · ');
      pn.foot.hidden = false;
      pn.check.hidden = true; pn.clear.hidden = true;
    } else { pn.check.hidden = false; pn.clear.hidden = false; }
    updatePnButton();
  }
  function paintCell(i, j) {
    const v = pn.pal === 'erase' ? null : pn.fill[i][j] === pn.pal ? null : pn.pal;
    pn.fill[i][j] = v;
    const cell = pn.cells[i][j];
    cell.classList.remove('bad', 'warn', 'good');
    cell.classList.toggle('filled', !!v);
    if (v) {
      const L = looks(v, S.mode);
      cell.innerHTML = '<span>' + alleleHTML(v) + '</span>' + peaSVG(L.round, L.yellow, 22);
    } else cell.innerHTML = '';
    pn.msg.textContent = ''; pn.msg.className = 'pn-msg';
    Sound.tick();
  }
  function gradePunnett() {
    const st = pnInfo();
    if (!st.a || !st.b) return '♀·♂ 자리에 부모 완두를 먼저 놓아 주세요.';
    if (st.hidden) return '유전자형을 모르는 부모(?)가 있어 퍼넷 사각형을 채울 수 없어요.';
    if (st.di) return true;
    let wrong = 0, empty = 0;
    pn.cells.forEach((row, i) => row.forEach((cell, j) => {
      cell.classList.remove('bad', 'warn', 'good');
      const v = pn.fill[i][j];
      if (!v) { empty++; cell.classList.add('warn'); } else if (v !== pn.ans[i][j]) { wrong++; cell.classList.add('bad'); }
    }));
    if (wrong) return '빨간 칸 ' + wrong + '개가 틀렸어요. 그 칸의 왼쪽(♀)과 위쪽(♂) 생식세포 글자를 하나씩 합쳐 보세요.';
    if (empty) return '빈 칸(노란색)이 ' + empty + '개 있어요. 4칸을 모두 채워 주세요.';
    pn.cells.forEach((row) => row.forEach((cell) => cell.classList.add('good')));
    const gene = GENES[MODE_GENES[S.mode][0]];
    const gs = [gene.up + gene.up, gene.up + gene.lo, gene.lo + gene.lo];
    const gc = gs.map((g) => pn.ans.flat().filter((x) => x === g).length);
    const pc = [gc[0] + gc[1], gc[2]];
    pn.msg.className = 'pn-msg good';
    pn.msg.innerHTML = '✔ 정답! 유전자형 ' + gs.join(' : ') + ' = <b>' + gc.join(' : ') + '</b> · 표현형 ' + gene.dom + ' : ' + gene.rec + ' = <b>' + pc.join(' : ') + '</b>';
    return true;
  }
  pn.check.addEventListener('click', () => {
    if (pn.missionMode) {
      const mb = $('#game .mission-actions .btn-primary');
      if (mb && !mb.hidden) { mb.click(); return; }
    }
    const r = gradePunnett();
    if (r === true) { Sound.success(); toast('🎉 퍼넷 사각형 정답!', 'good'); } else { Sound.fail(); pn.msg.className = 'pn-msg'; pn.msg.textContent = '🤔 ' + r; }
  });
  pn.clear.addEventListener('click', () => { Sound.click(); renderPunnett(true); });
  function updatePnButton() { pn.check.innerHTML = pn.missionMode ? '✔ 확인하기 (미션 제출)' : '✔ 채점하기'; }

  /* =========================================================
     측정값
     ========================================================= */
  const rP = $('#rParents'), rN = $('#rN'), rRatio = $('#rRatio'), rExp = $('#rExpect');
  let lastUI = 0;
  const setVal = (node, html, small) => {
    if (node._html !== html) { node.innerHTML = html; node._html = html; }
    node.classList.toggle('sm', !!small);
  };
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    placeHint();
    const M = cur(), [a, b] = M.slots;
    const gt = (it) => (it ? shownG(it).replace(/\?\?/g, '?').replace(/\?{2,}/g, '?') : '–');
    const ptxt = a || b ? gt(a) + ' × ' + gt(b) : '–';
    setVal(rP, ptxt, ptxt.length > 9);
    const res = M.result;
    const shown = res ? revealed(res, now()) : 0;
    setVal(rN, shown + '<small>개</small>');
    const rt = res && shown ? ratioText(countsOf(res, shown).vals, res.mode, true, expOf(res)) : '–';
    setVal(rRatio, rt, rt.length > 8);
    let ex = '–';
    if (a && b) ex = known(a) && known(b) ? expectedText(a.g, b.g, S.mode, true) : '?';
    setVal(rExp, ex, ex.length > 8);
  }

  /* =========================================================
     미션 도우미
     ========================================================= */
  function refreshTargets() {
    const T = S.targets;
    modeBtns.forEach((b) => b.classList.toggle('target', !!T.mode && b.dataset.mode === T.mode && S.mode !== T.mode));
    nBtns.forEach((b) => b.classList.toggle('target', !!T.n && T.n.includes(+b.dataset.n) && !T.n.includes(S.n)));
    pn.card.classList.toggle('pn-target', !!T.punnett);
  }
  function setTargets(T) { S.targets = T || {}; refreshTargets(); }
  const fresh = () => S.history.filter((r) => r.seq > S.missionSeq);
  const lastFresh = () => { const f = fresh(); return f[f.length - 1] || null; };
  const sameSet = (res, g1, g2) => (res.a.g === g1 && res.b.g === g2) || (res.a.g === g2 && res.b.g === g1);
  const noMystery = (res) => !res.a.mystery && !res.b.mystery;
  function parentsHTML(mode) {
    const [a, b] = S.modes[mode].slots;
    const g = (it) => (it ? '<b>' + (known(it) ? it.g : '?') + '</b>' : '<span style="color:#9aa5b6">빈자리</span>');
    return '♀ ' + g(a) + ' × ♂ ' + g(b);
  }
  function resultHTML(res) {
    if (!res) return '';
    const v = countsOf(res, res.n).vals;
    return CLASSES[res.mode].map((c, i) => c.name + ' <b>' + v[i] + '</b>').join(' : ');
  }
  function modeGuard(mode) {
    const obj = { shape: '<b>씨 모양</b>을', color: '<b>씨 색깔</b>을', both: '<b>두 가지 함께</b>를' };
    return S.mode !== mode ? '👉 도구 막대에서 ' + obj[mode] + ' 골라요. ' : '';
  }

  /* =========================================================
     미션
     ========================================================= */
  const CONCEPT = `
    <h3>🫛 멘델은 왜 완두를 골랐을까?</h3>
    <p>완두는 <b>대립 형질</b>(둥근 ↔ 주름진처럼 하나의 형질에서 뚜렷하게 구별되는 형질)이 분명하고, 한 세대가 짧으며 자손 수가 많아요.
    또 스스로 꽃가루받이하는 <b>자가 수분</b>과, 사람이 다른 개체의 꽃가루를 묻혀 주는 <b>타가 수분(교배)</b>이 모두 쉬워요.</p>
    <h3>🧬 용어 정리</h3>
    <ul>
      <li><b>유전자형</b>: 유전자 구성 (예: RR, Rr, rr) / <b>표현형</b>: 겉으로 드러나는 형질 (예: 둥근, 주름진)</li>
      <li><b>순종</b>: 같은 유전자로만 이루어진 개체 (RR, rr) / <b>잡종</b>: 서로 다른 유전자로 이루어진 개체 (Rr)</li>
      <li>우성 유전자는 대문자(R), 열성 유전자는 소문자(r)로 써요. 유전자는 <b>쌍</b>으로 있고, 자손은 부모에게서 하나씩 받아요.</li>
    </ul>
    <h3>① 우열의 원리</h3>
    <p>대립 형질을 가진 순종끼리 교배하면 잡종 1대(F<sub>1</sub>)에는 한 가지 형질만 나타나요. 나타나는 형질이 <b>우성</b>, 나타나지 않는 형질이 <b>열성</b>이에요.</p>
    <span class="formula">RR(둥근) × rr(주름진) → Rr (모두 둥근)</span>
    <h3>② 분리의 법칙</h3>
    <p>생식세포를 만들 때 한 쌍의 유전자가 <b>분리</b>되어 서로 다른 생식세포로 하나씩 들어가요. 그래서 F<sub>1</sub> 속에 숨어 있던 열성 형질이 잡종 2대(F<sub>2</sub>)에서 다시 나타나요.</p>
    <span class="formula">Rr × Rr → RR : Rr : rr = 1 : 2 : 1<br>둥근 : 주름진 = 3 : 1</span>
    <h3>③ 독립의 법칙</h3>
    <p>두 쌍 이상의 대립 형질이 함께 유전될 때, 각 형질을 나타내는 유전자는 서로 영향을 주지 않고 <b>독립적으로</b> 분리되어 유전돼요.</p>
    <span class="formula">RrYy × RrYy → 9 : 3 : 3 : 1<br><small>(둥근·노란색 : 둥근·초록색 : 주름진·노란색 : 주름진·초록색)</small></span>
    <h3>🔍 검정 교배</h3>
    <p>우성 형질을 나타내는 개체의 유전자형을 알아보려고 <b>열성 순종(rr)</b>과 교배하는 방법이에요.</p>
    <ul>
      <li>자손이 모두 둥근 모양 → 유전자형 <b>RR</b></li>
      <li>둥근 : 주름진 ≈ 1 : 1 → 유전자형 <b>Rr</b></li>
    </ul>
    <h3>🧮 퍼넷 사각형</h3>
    <p>부모의 생식세포를 가로·세로에 쓰고, 만나는 칸에 자손의 유전자형을 채워 교배 결과를 예측해요. 각 칸이 나올 확률은 모두 같아요.</p>
    <p class="note">⚠️ 3 : 1, 9 : 3 : 3 : 1은 <b>확률</b>이에요. 자손 수가 적으면 우연 때문에 비율이 달라질 수 있고, 자손 수가 많을수록 예상한 비에 가까워져요. 또 부모의 유전자는 섞이지 않고 쌍을 이루어 전해지기 때문에, 잡종 1대에 숨어 있던 열성 형질이 잡종 2대에서 다시 나타날 수 있어요.</p>
  `;

  const L3M1 = {
    title: '수수께끼 완두의 정체',
    manual: true,
    goal: '보관함의 <b>수수께끼 둥근 완두(?)</b>는 RR일까요, Rr일까요? <b>순종 주름진 완두(rr)</b>와 교배(<b>검정 교배</b>)해서 자손을 <b>20개 이상</b> 얻은 뒤, 판정을 고르고 ✔ 확인하기를 누르세요.',
    figure: '<div class="verdict" role="group" aria-label="판정"><span class="verdict-label">🕵️ 판정</span><button type="button" data-v="RR">RR <small>순종</small></button><button type="button" data-v="Rr">Rr <small>잡종</small></button></div>',
    hint: '수수께끼 완두가 r을 숨기고 있다면, rr과 교배했을 때 주름진 자손(rr)이 나올 거예요. 주름진 자손이 하나라도 있나요?',
    setup() {
      setMode('shape');
      mystery.g = Math.random() < 0.5 ? 'RR' : 'Rr';
      mystery.revealed = false;
      S.verdict = null;
      S.modes.shape.result = null;
      setSlots('shape', null, null);
      if (S.n < 20) setN(20);
      setTargets({ ids: [mystery.id, PURE_rr.id] });
      $$('#game .verdict button').forEach((b) => b.addEventListener('click', () => {
        S.verdict = b.dataset.v; Sound.click();
        $$('#game .verdict button').forEach((x) => x.classList.toggle('on', x === b));
      }));
    },
    testCross() { return fresh().filter((r) => r.mode === 'shape' && ((r.a.mystery && r.b.g === 'rr' && !r.b.mystery) || (r.b.mystery && r.a.g === 'rr' && !r.a.mystery))).pop() || null; },
    check() {
      const tc = this.testCross();
      if (!tc) {
        const other = fresh().some((r) => r.a.mystery || r.b.mystery);
        return other ? '좋은 시도예요! 하지만 이번 미션은 <b>rr과의 검정 교배</b>예요. 수수께끼 완두 × 순종 주름진(rr)으로 해 보세요.'
          : '먼저 수수께끼 완두(?) × 순종 주름진 완두(rr)를 교배해 보세요. (자손 20개 이상)';
      }
      if (tc.n < 20) return '자손이 ' + tc.n + '개뿐이면 우연히 둥근 것만 나올 수도 있어요. 자손 수를 20개 이상으로 해서 다시 교배해 보세요.';
      if (!S.verdict) return '위의 판정 버튼(RR 또는 Rr) 중 하나를 골라 주세요.';
      if (S.verdict !== mystery.g) {
        return mystery.g === 'Rr'
          ? '자손 중에 <b>주름진 완두(rr)</b>가 있었어요. rr 부모는 r만 주니, 나머지 r은 누가 주었을까요?'
          : '주름진 자손이 하나도 없었어요. 수수께끼 완두가 r을 가졌다면 자손의 약 절반은 주름진 모양이었을 거예요.';
      }
      mystery.revealed = true;
      return true;
    },
    status() {
      const tc = this.testCross();
      if (!tc) return modeGuard('shape') + '검정 교배 결과: <b>아직 없음</b>';
      return '검정 교배 결과 (자손 ' + tc.n + '개): ' + resultHTML(tc);
    },
    get explain() {
      return mystery.g === 'RR'
        ? '자손이 <b>모두 둥근 완두</b> → 수수께끼 완두는 R만 가진 생식세포를 만들어요. 그래서 유전자형은 <b>RR(순종)</b>! 열성 순종(rr)은 r만 주기 때문에, 자손의 표현형을 보면 상대 부모의 생식세포가 그대로 드러나요. 이것이 <b>검정 교배</b>예요.'
        : '둥근 : 주름진 ≈ <b>1 : 1</b> → 수수께끼 완두는 R과 r 생식세포를 1 : 1로 만들어요. 그래서 유전자형은 <b>Rr(잡종)</b>! 열성 순종(rr)은 r만 주기 때문에, 자손의 표현형을 보면 상대 부모의 생식세포가 그대로 드러나요. 이것이 <b>검정 교배</b>예요.';
    },
  };

  const levels = [
    {
      title: '우열의 원리',
      missions: [
        {
          title: '순종끼리 교배하기',
          goal: '<b>순종 둥근 완두(RR)</b>와 <b>순종 주름진 완두(rr)</b>를 ♀·♂ 자리에 하나씩 놓고 <b>🌸 교배하기</b>를 눌러 보세요. 잡종 1대(F<sub>1</sub>)는 어떤 모양일까요?',
          hint: '왼쪽 보관함의 카드를 ♀ 암술 쪽, ♂ 꽃가루 쪽 자리로 끌어다 놓거나 차례로 눌러요. 그다음 아래의 🌸 교배하기 버튼(또는 가운데 꽃)을 눌러요.',
          setup() { setMode('shape'); setTargets({ ids: [PURE_RR.id, PURE_rr.id] }); },
          check: () => fresh().some((r) => r.mode === 'shape' && sameSet(r, 'RR', 'rr') && noMystery(r)),
          hold: 0.4,
          status: () => modeGuard('shape') + '부모: ' + parentsHTML('shape'),
          explain: '잡종 1대(F<sub>1</sub>)는 <b>모두 둥근 완두</b>예요! 대립 형질(둥근 ↔ 주름진)을 가진 순종끼리 교배하면 잡종 1대에는 한 가지 형질만 나타나요. 이때 나타나는 형질을 <b>우성</b>, 나타나지 않는 형질을 <b>열성</b>이라고 해요. → <b>우열의 원리</b>',
        },
        {
          type: 'quiz',
          title: '왜 모두 둥글까?',
          goal: '순종 둥근 완두 × 순종 주름진 완두의 잡종 1대가 <b>모두 둥근 완두</b>인 까닭으로 옳은 것은?',
          choices: [
            '주름진 모양 유전자가 잡종 1대에서 사라졌기 때문',
            '두 형질이 섞여서 둥근 모양이 되었기 때문',
            '둥근 모양이 주름진 모양에 대해 우성이기 때문',
            '♀(암술 쪽) 부모의 형질만 자손에게 전해지기 때문',
          ],
          answer: 2,
          feedback: [
            '사라지지 않아요! 주름진 유전자(r)는 잡종 1대 속에 숨어 있다가 다음 세대에서 다시 나타나요. (레벨 2에서 확인해요)',
            '섞인다면 둥근 것과 주름진 것의 <b>중간 모양</b>이 나와야겠죠? 유전자는 섞이지 않고 각각 따로 전해져요.',
            '',
            '♀와 ♂ 자리를 바꾸어 교배해 보세요. 결과가 똑같아요! 자손은 양쪽 부모에게서 유전자를 하나씩 받아요.',
          ],
          explain: '잡종 1대는 둥근 유전자(R)와 주름진 유전자(r)를 <b>모두</b> 가지고 있지만, 우성인 둥근 형질만 겉으로 나타나요. 열성 유전자 r은 사라진 것이 아니라 <b>숨어 있어요</b>.',
        },
        {
          type: 'quiz',
          title: '잡종 1대의 유전자형은?',
          goal: '잡종 1대(F<sub>1</sub>) 둥근 완두의 <b>유전자형</b>은 무엇일까요?',
          hint: '자손은 ♀ 부모와 ♂ 부모에게서 유전자를 <b>하나씩</b> 받아요. 🧬 유전자형 보기를 켜고 자손을 살펴봐도 좋아요.',
          choices: ['RR — 둥근 모양이니까', 'Rr — 부모에게서 R과 r을 하나씩 받아서', 'rr', 'R — 우성 유전자 하나만 남아서'],
          answer: 1,
          feedback: [
            '겉모습(표현형)이 같아도 유전자형은 다를 수 있어요. 주름진 부모(rr)에게서 받은 유전자는 어디로 갔을까요?',
            '',
            'rr이라면 주름진 모양이 나타나야 해요.',
            '유전자는 항상 <b>쌍</b>으로 있어요. 부모 양쪽에게서 하나씩 받아 두 개가 돼요.',
          ],
          explain: 'RR 부모는 R만, rr 부모는 r만 가진 생식세포를 만들어요. 둘이 수정하면 <b>Rr(잡종)</b>이 되고, R이 우성이라 둥근 모양으로 나타나요. 겉으로 드러나는 형질을 <b>표현형</b>, 유전자 구성을 <b>유전자형</b>이라고 해요.',
        },
        {
          title: '씨 색깔에서도 확인!',
          goal: '도구 막대에서 <b>씨 색깔</b>을 고른 뒤, <b>순종 노란색(YY)</b> × <b>순종 초록색(yy)</b>을 교배해 보세요. 어느 색이 우성일까요?',
          hint: '캔버스 위쪽 도구 막대의 [씨 색깔] 버튼을 누르면 보관함이 바뀌어요.',
          setup() {
            const c = S.modes.color.bank;
            setSlots('color', null, null);
            setTargets({ mode: 'color', ids: [c[0].id, c[1].id] });
          },
          check: () => fresh().some((r) => r.mode === 'color' && sameSet(r, 'YY', 'yy')),
          hold: 0.4,
          status: () => modeGuard('color') + (S.mode === 'color' ? '부모: ' + parentsHTML('color') : ''),
          explain: '잡종 1대가 모두 <b>노란색</b>! 씨 색깔에서는 <b>노란색이 우성</b>, 초록색이 열성이에요. 잡종 1대(Yy)는 초록색 유전자 y를 숨기고 있어요. 어떤 형질이든 순종끼리 교배하면 잡종 1대에 우성 형질만 나타나요.',
        },
      ],
    },
    {
      title: '분리의 법칙',
      missions: [
        {
          title: '잡종 1대의 자가 수분',
          goal: '잡종 1대 둥근 완두(<b>Rr</b>)를 <b>자가 수분</b>해서 잡종 2대(F<sub>2</sub>)를 <b>100개 이상</b> 얻어 보세요. 사라졌던 주름진 완두가 다시 나타날까요?',
          hint: 'F1 완두(Rr) 카드를 한쪽 자리에 놓고 <b>🌼 자가 수분</b>을 눌러요. 자손 수는 위쪽 도구 막대에서 100이나 400을 골라요.',
          setup() {
            setMode('shape');
            const f1 = ensurePlant('shape', 'Rr', 1, true);
            setSlots('shape', null, null);
            setTargets({ ids: [f1.id], n: [100, 400] });
          },
          check: () => fresh().some((r) => r.mode === 'shape' && r.a.g === 'Rr' && r.b.g === 'Rr' && noMystery(r) && r.n >= 100),
          hold: 0.4,
          status: () => modeGuard('shape') + '부모: ' + parentsHTML('shape') + ' · 자손 수 <b>' + S.n + '</b>',
          get explain() {
            const r = fresh().filter((x) => x.mode === 'shape' && x.a.g === 'Rr' && x.b.g === 'Rr').pop();
            const v = r ? countsOf(r, r.n).vals : [3, 1];
            return '주름진 완두가 다시 나타났어요! 둥근 : 주름진 = <b>' + v[0] + ' : ' + v[1] + ' ≈ ' + ratioText(v, 'shape') + '</b>로 약 <b>3 : 1</b>이에요. 잡종 1대(Rr)가 생식세포를 만들 때 한 쌍의 유전자 R과 r이 <b>분리</b>되어 서로 다른 생식세포로 하나씩 들어가기 때문이에요. → <b>분리의 법칙</b>';
          },
        },
        {
          title: '퍼넷 사각형 완성',
          manual: true,
          goal: '<b>🧮 퍼넷 사각형</b>에 Rr × Rr 자손의 유전자형 4칸을 채우고 <b>✔ 확인하기</b>를 누르세요. 각 칸은 ♀ 생식세포(왼쪽)와 ♂ 생식세포(위쪽)가 만난 결과예요.',
          hint: '칸의 왼쪽(♀)과 위쪽(♂) 글자를 합쳐요. 예: ♀ R과 ♂ r이 만나면 Rr. 대문자를 앞에 써요.',
          setup() {
            setMode('shape');
            const f1 = ensurePlant('shape', 'Rr', 1, false);
            setSlots('shape', f1, f1);
            pn.missionMode = true;
            renderPunnett(true);
            setTargets({ punnett: true });
          },
          check() {
            const [a, b] = S.modes.shape.slots;
            if (S.mode !== 'shape') return '도구 막대에서 <b>씨 모양</b>을 골라 주세요.';
            if (!a || !b || a.mystery || b.mystery || a.g !== 'Rr' || b.g !== 'Rr') return '♀·♂ 자리에 F1 완두(Rr)를 놓고 퍼넷 사각형을 채워 주세요.';
            return gradePunnett();
          },
          status() {
            const n = pn.fill.flat().filter((v) => v).length;
            return '채운 칸: <b>' + n + ' / 4</b>';
          },
          explain: '유전자형 RR : Rr : rr = <b>1 : 2 : 1</b> → 표현형 둥근 : 주름진 = <b>3 : 1</b>. 퍼넷 사각형의 각 칸이 나올 확률은 모두 ¼로 같아요. 그래서 실험에서도 약 3 : 1이 나온 거예요.',
        },
        {
          type: 'quiz',
          title: '주름진 완두가 나올 확률',
          goal: 'Rr × Rr 교배에서 자손 하나가 <b>주름진 완두</b>일 확률은?',
          choices: ['0% — 부모가 모두 둥근 완두라서', '25% (¼)', '50% (½) — 둥근 것과 주름진 것, 두 가지라서', '75% (¾)'],
          answer: 1,
          feedback: [
            '부모는 둥글지만 둘 다 r을 숨기고 있어요. 방금 실험에서 주름진 완두가 나왔죠?',
            '',
            '결과가 두 가지라고 확률이 반반은 아니에요. 퍼넷 사각형 4칸 중 rr은 몇 칸인가요?',
            '¾(75%)은 <b>둥근</b> 완두가 나올 확률이에요.',
          ],
          explain: '퍼넷 사각형 4칸 중 rr은 1칸 → <b>¼ = 25%</b>. ♀가 r을 줄 확률(½) × ♂가 r을 줄 확률(½) = ¼ 로도 구할 수 있어요.',
        },
        {
          type: 'quiz',
          title: '자손이 4개뿐이라면?',
          goal: '자손 수를 <b>4</b>로 놓고 Rr × Rr 교배를 <b>여러 번</b> 해 보세요. 그리고 옳은 설명을 고르세요.',
          setup() {
            setMode('shape');
            const f1 = ensurePlant('shape', 'Rr', 1, false);
            setSlots('shape', f1, f1);
            setN(4);
            S.small = [];
          },
          status: () => (S.small.length ? '자손 4개 교배 기록 (둥근 : 주름진): <b>' + S.small.join('</b> · <b>') + '</b>' : '🌸 교배하기를 여러 번 눌러 보세요.'),
          choices: [
            '자손이 4개면 반드시 둥근 3개, 주름진 1개가 나온다',
            '3 : 1은 확률이라서, 자손 수가 적으면 4 : 0이나 2 : 2처럼 달라질 수 있다',
            '3 : 1이 나오지 않았다면 분리의 법칙이 틀린 것이다',
            '자손 수를 늘려도 3 : 1에 가까워지지 않는다',
          ],
          answer: 1,
          feedback: [
            '정말 그런지 4개로 여러 번 교배해 보세요. 매번 3 : 1이 나오나요?',
            '',
            '법칙은 <b>확률</b>을 알려 줘요. 동전을 4번 던져도 앞면이 꼭 2번 나오지는 않는 것과 같아요.',
            '자손 100개, 400개로 교배했을 때를 떠올려 보세요. 3 : 1에 가까워졌죠?',
          ],
          explain: '3 : 1은 자손 하나하나가 둥근 모양일 확률(¾)과 주름진 모양일 확률(¼)의 비예요. 자손 수가 적으면 우연에 따라 결과가 들쭉날쭉하지만, 자손 수가 <b>많을수록 3 : 1에 가까워져요</b>.',
        },
      ],
    },
    {
      title: '유전 탐정',
      missions: [
        L3M1,
        {
          title: '두 가지 형질을 함께!',
          goal: '도구 막대에서 <b>두 가지 함께</b>를 고르고, 잡종 1대 <b>RrYy</b>(둥근·노란색)를 자가 수분해서 자손 <b>400개</b>를 얻어 보세요.',
          hint: '보관함의 F1 RrYy 카드를 한쪽 자리에 놓고 🌼 자가 수분! 자손 수는 400으로 골라요. 🧮 퍼넷 사각형 16칸도 살펴보세요.',
          setup() {
            const f1 = ensurePlant('both', 'RrYy', 1, false);
            setSlots('both', null, null);
            setTargets({ mode: 'both', ids: [f1.id], n: [400] });
          },
          check: () => fresh().some((r) => r.mode === 'both' && r.a.g === 'RrYy' && r.b.g === 'RrYy' && r.n >= 400),
          hold: 0.4,
          status: () => modeGuard('both') + (S.mode === 'both' ? '부모: ' + parentsHTML('both') + ' · 자손 수 <b>' + S.n + '</b>' : ''),
          get explain() {
            const r = fresh().filter((x) => x.mode === 'both' && x.a.g === 'RrYy' && x.b.g === 'RrYy').pop();
            const v = r ? countsOf(r, r.n).vals : [9, 3, 3, 1];
            return '표현형이 <b>4가지</b>나 나왔어요! 둥근·노란색 : 둥근·초록색 : 주름진·노란색 : 주름진·초록색 = <b>' + v.join(' : ') + '</b> → 합을 16으로 맞추면 <b>' + ratioText(v, 'both', false, [9, 3, 3, 1]) + '</b> ≈ <b>9 : 3 : 3 : 1</b>. 부모에게 없던 <b>새로운 조합</b>(둥근·초록색, 주름진·노란색)도 생겼어요.';
          },
        },
        {
          type: 'quiz',
          title: '9 : 3 : 3 : 1의 비밀',
          goal: 'RrYy × RrYy 자손의 표현형 비 (둥근·노란색 : 둥근·초록색 : 주름진·노란색 : 주름진·초록색)로 가장 알맞은 것은?',
          hint: '🧮 퍼넷 사각형 16칸에서 같은 색 칸끼리 세어 보세요.',
          choices: ['3 : 1', '1 : 1 : 1 : 1', '9 : 3 : 3 : 1', '1 : 2 : 1'],
          answer: 2,
          feedback: [
            '3 : 1은 한 가지 형질만 볼 때의 비예요. 지금은 표현형이 4가지예요!',
            '1 : 1 : 1 : 1은 RrYy가 만드는 <b>생식세포</b>(RY, Ry, rY, ry)의 비예요. 이 생식세포끼리 만나면?',
            '',
            '1 : 2 : 1은 Rr × Rr의 <b>유전자형</b> 비(RR : Rr : rr)예요.',
          ],
          explain: '퍼넷 사각형 16칸 중 둥근·노란색 9칸, 둥근·초록색 3칸, 주름진·노란색 3칸, 주름진·초록색 1칸이에요. 확률로는 ¾×¾ = 9/16, ¾×¼ = 3/16, ¼×¾ = 3/16, ¼×¼ = 1/16 이에요.',
        },
        {
          type: 'quiz',
          title: '독립의 법칙',
          goal: '400개 자손에서 <b>씨 모양만</b> 세면 둥근 : 주름진 ≈ 3 : 1, <b>씨 색깔만</b> 세면 노란색 : 초록색 ≈ 3 : 1이에요. 이 결과가 알려 주는 <b>독립의 법칙</b>으로 옳은 것은?',
          status() {
            const r = S.modes.both.result;
            if (!r || !r.done) return '';
            const v = countsOf(r, r.n).vals;
            return '내 실험 (자손 ' + r.n + '개) → 씨 모양 둥근 <b>' + (v[0] + v[1]) + '</b> : 주름진 <b>' + (v[2] + v[3]) + '</b> · 씨 색깔 노란색 <b>' + (v[0] + v[2]) + '</b> : 초록색 <b>' + (v[1] + v[3]) + '</b>';
          },
          choices: [
            '둥근 모양 유전자와 노란색 유전자는 항상 함께 붙어서 자손에게 전해진다',
            '두 쌍의 대립 형질은 서로 영향을 주지 않고, 각각 분리의 법칙에 따라 유전된다',
            '두 형질을 함께 교배하면 우열의 원리가 성립하지 않는다',
            '씨 모양이 씨 색깔을 결정한다',
          ],
          answer: 1,
          feedback: [
            '그렇다면 둥근·초록색이나 주름진·노란색 같은 새로운 조합은 나올 수 없겠죠? 실제로는 나왔어요!',
            '',
            '둥근(우성)과 노란색(우성)이 여전히 더 많이 나타났어요. 우열의 원리는 그대로 성립해요.',
            '둥근 완두 중에도 초록색이, 주름진 완두 중에도 노란색이 있었어요. 씨 모양과 씨 색깔은 서로 관계없이 정해져요.',
          ],
          explain: '씨 모양 유전자(R, r)와 씨 색깔 유전자(Y, y)는 생식세포를 만들 때 <b>서로 독립적으로</b> 분리되어 RY, Ry, rY, ry가 1 : 1 : 1 : 1로 만들어져요. 그래서 각 형질은 따로 3 : 1이 되고, 함께 보면 (3 : 1) × (3 : 1) = <b>9 : 3 : 3 : 1</b>이 돼요. → <b>독립의 법칙</b>',
        },
      ],
    },
  ];

  SciSim.game({
    simId: 'm3-mendel',
    mount: '#game',
    concept: CONCEPT,
    badge: '꼬마 멘델',
    homeHref: '../../index.html#g3',
    onMissionStart() {
      setTargets({});
      S.missionSeq = S.seq;
      if (pn.missionMode) { pn.missionMode = false; updatePnButton(); }
    },
    levels,
  });

  /* ---------- 시작 ---------- */
  changed();
  renderPunnett(true);
  placeHint();
  setTimeout(hideHint, 7000);
  SciSim.loop((dt, t) => {
    stepAnim();
    stepKids(dt);
    draw();
    updateReadouts(t);
  });
})();
