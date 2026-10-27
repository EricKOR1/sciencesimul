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
  const ease = SciSim.ease;
  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* 받침 유무에 따라 조사 고르기: josa('핵형', '은', '는') */
  function josa(w, a, b) { const ch = String(w).charCodeAt(String(w).length - 1); if (ch < 0xAC00 || ch > 0xD7A3) return b; return ((ch - 0xAC00) % 28) ? a : b; }

  const PAT = '#2f6fdd', MAT = '#e0453f';   // 부계(파랑) / 모계(빨강)
  const BG = '#f1f6f3';

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
  function rod(x, y, len, w, ang, color, cen, o) {
    o = o || {};
    cen = cen == null ? 0.5 : cen;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const top = -len / 2, cy = top + len * cen, gap = Math.max(1.2, w * 0.14);
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, C.shade(color, 0.35)); g.addColorStop(0.45, color); g.addColorStop(1, C.shade(color, -0.3));
    ctx.fillStyle = g; ctx.strokeStyle = C.shade(color, -0.45); ctx.lineWidth = Math.max(1, w * 0.1);
    const arm = (y0, y1) => { if (y1 - y0 < 1) return; D.roundRect(-w / 2, y0, w, y1 - y0, Math.min(w / 2, (y1 - y0) / 2)); ctx.fill(); ctx.stroke(); };
    arm(top, cy - gap * 0.4); arm(cy + gap * 0.4, top + len);
    // 동원체(잘록한 부분)
    ctx.fillStyle = o.cenColor || 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.ellipse(0, cy, w * 0.42, Math.max(1.4, gap), 0, 0, TAU); ctx.fill();
    if (o.bands) {
      ctx.fillStyle = 'rgba(20,20,60,.42)';
      o.bands.forEach((b) => { const by = top + len * b[0], bh = Math.max(1.4, len * b[1]); ctx.fillRect(-w / 2 + w * 0.08, by - bh / 2, w * 0.84, bh); });
    }
    // 광택
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(-w * 0.28, top + len * 0.05, w * 0.16, len * 0.9);
    ctx.restore();
  }

  /* 라벨 지시선: (x1,y1)에서 (x2,y2)로 점선 + 알약 글자 */
  function callout(x1, y1, x2, y2, text, o) {
    o = o || {};
    D.dashedLine(x1, y1, x2, y2, { color: o.line || '#64748b', width: 1.6, dash: [4, 4] });
    ctx.fillStyle = o.line || '#64748b'; ctx.beginPath(); ctx.arc(x1, y1, 3, 0, TAU); ctx.fill();
    return D.label(x2, y2, text, { bg: o.bg || '#fff', color: o.color || '#1f2d44', border: o.border || '#cbd5e1', size: o.size || 13, align: o.align });
  }

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
     고등학교 생명과학 Ⅲ. 생명의 연속성과 다양성 - 감수 분열과 DNA 양 (단원 39, 2차시)
     성취기준 [12생과03-02] 생식세포 형성과정을 체세포분열 과정과 비교하고, ... (앞부분: 과정 비교)
     ① 분석: DNA 상대량 (체세포분열)  ② 모형: 감수 1분열  ③ 모형: 감수 2분열  ④ 분석: 비교하기
     모형: 2n = 4 (긴 상동 염색체 쌍, 짧은 상동 염색체 쌍), 부계 파랑 / 모계 빨강
     DNA 상대량은 G1기 2n 세포를 2로 놓았어요 (체세포분열 2 → 4 → 2, 감수 분열 2 → 4 → 2 → 1).
     ========================================================= */
  const S = { mode: 'mit', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const approach = SciSim.approach;

  /* ---------- 배치 ---------- */
  const SC = PHONE ? { x: 6, y: 8, w: 468, h: 300 } : { x: 12, y: 10, w: 776, h: 346 };
  const GR = PHONE ? { x: 6, y: 316, w: 468, h: 320 } : { x: 12, y: 366, w: 776, h: 186 };
  const U = Math.min(SC.w / 8 * 0.9, SC.h * 0.36);
  const LL = 0.85 * U, LS = 0.54 * U, WC = 0.17 * U;
  const CX0 = SC.x + SC.w / 2, CY0 = SC.y + SC.h / 2 + (PHONE ? 6 : -2);
  const R1 = Math.min(SC.h * 0.34, SC.w * 0.3);
  const D2 = SC.w / 4, R2 = Math.min(SC.h * 0.335, SC.w / 4 * 0.92), R4 = U * 0.95;
  const HSEP = WC * 2.55;               // 2가 염색체에서 두 상동 염색체의 가운데 사이 거리
  const OFF = WC * 0.55 + 0.6;          // 염색 분체가 붙어 있을 때 가운데에서 떨어진 거리
  const CHR = [0, 1, 2, 3].map((id) => ({ id, p: id >> 1, h: id & 1, len: (id >> 1) ? LS : LL, cen: (id >> 1) ? 0.38 : 0.45, col: (id & 1) ? MAT : PAT }));
  const SCAT = [[-0.52, -0.15, 0.35], [0.46, 0.22, -0.45], [0.28, -0.46, 1.15], [-0.3, 0.5, -0.95]];
  const ZP = [[-0.3, -0.5], [0.3, 0.5], [0.3, -0.5], [-0.3, 0.5]];

  /* ---------- 단계 정보 ---------- */
  const PROC = {
    mit: {
      n: 5,
      names: ['복제 전 (G1기)', '복제 (S기)', '중기: 적도면에 배열', '후기: 염색 분체 분리', '체세포분열 완료: 딸세포 2개'],
      short: PHONE ? ['복제 전', '복제 후', '중기', '후기', '딸세포'] : ['복제 전\n(G1기)', '복제 후\n(S기)', '중기', '후기', '딸세포\n2개'],
      dna: [2, 4, 4, 4, 2], chr: [4, 4, 4, 8, 4],
    },
    mei: {
      n: 9,
      names: ['복제 전 (G1기)', '복제 (S기)', '감수 1분열 전기: 2가 염색체 형성', '감수 1분열 중기', '감수 1분열 후기: 상동 염색체 분리', '감수 1분열 완료: 세포 2개', '감수 2분열 중기', '감수 2분열 후기: 염색 분체 분리', '감수 2분열 완료: 생식세포 4개'],
      short: PHONE ? ['복제 전', '복제 후', '전기Ⅰ', '중기Ⅰ', '후기Ⅰ', '2세포', '중기Ⅱ', '후기Ⅱ', '4세포'] : ['복제 전\n(G1기)', '복제 후\n(S기)', '전기Ⅰ', '중기Ⅰ', '후기Ⅰ', '세포\n2개', '중기Ⅱ', '후기Ⅱ', '생식세포\n4개'],
      dna: [2, 4, 4, 4, 4, 2, 2, 2, 1], chr: [4, 4, 4, 4, 4, 2, 2, 4, 2],
    },
  };
  const COL_MIT = '#ea580c', COL_MEI = '#16a34a';

  /* ---------- 상태 ---------- */
  S.proc = 'mit'; S.f = 0; S.fp = 0; S.lo = 0; S.hi = 4;
  S.sep = { off: [-HSEP / 2, -HSEP / 2], done: [false, false], lh: [0, 1], nd: false, drag: null, allT: 0 };
  S.biv = [false, false];                 // 찾은 2가 염색체
  S.plot = [null, null, null, null, null];  // 체세포분열 그래프에 찍은 점
  S.cmp = { x: 8, rdMit: '', rdMei: '', tbl: {}, tblOk: false };
  const cells = [0, 1, 2, 3].map((i) => ({ x: CX0, y: CY0, rx: R1, ry: R1, a: i === 0 ? 1 : 0, tx: CX0, ty: CY0, trx: R1, try_: R1, ta: i === 0 ? 1 : 0, parent: [-1, 0, 0, 2][i], dying: false }));
  const ct = []; for (let i = 0; i < 8; i++) ct.push({ x: CX0, y: CY0, ang: 0, a: 0, tx: CX0, ty: CY0, tang: 0, ta: 0 });

  const procOf = () => PROC[S.proc];
  const eps = () => Math.min(R1 * 0.5, 60);
  const RPOLE = () => R1 * 0.82;     // 감수 1분열 후기에서 상동 염색체가 가는 극 위치 (가운데에서의 거리)
  const sideOfHomolog = (p, h) => {   // -1: 왼쪽 극, +1: 오른쪽 극 (감수 1분열 후)
    const sp = S.sep;
    if (sp.nd && p === 0) return -1;
    const lhLeft = sp.off[p] < 0;
    return h === sp.lh[p] ? (lhLeft ? -1 : 1) : (lhLeft ? 1 : -1);
  };
  const fakeDone = () => { S.sep.done = [true, true]; S.sep.off = [-RPOLE(), -RPOLE()]; };

  /* ---------- 단계별 배치 계산 ---------- */
  function cellsSpec(proc, f) {
    const one = (rx, ry) => [{ x: CX0, y: CY0, rx, ry, a: 1 }, { a: 0 }, { a: 0 }, { a: 0 }];
    const two = (rx, ry) => [{ x: CX0 - D2, y: CY0, rx, ry, a: 1 }, { a: 0 }, { x: CX0 + D2, y: CY0, rx, ry, a: 1 }, { a: 0 }];
    if (proc === 'mit') {
      if (f <= 2) return one(R1, R1);
      if (f === 3) return one(R1 * 1.5, R1 * 0.82);
      return two(R2, R2);
    }
    if (f <= 3) return one(R1, R1);
    if (f === 4) return one(R1 * 1.5, R1 * 0.82);
    if (f === 5 || f === 6) return two(R2, R2);
    if (f === 7) { const rx7 = Math.min(R2 * 1.3, D2 * 0.95); return two(rx7, R2 * 0.8); }
    const xs = [0.125, 0.375, 0.625, 0.875].map((q) => SC.x + SC.w * q);
    return xs.map((x) => ({ x, y: CY0, rx: R4, ry: R4, a: 1 }));
  }
  function slotsX(n) { return n === 1 ? [0] : n === 2 ? [-0.34, 0.34] : [-0.55, 0, 0.55]; }
  /* 감수 1분열 뒤 각 세포가 가진 염색체 목록 (왼쪽/오른쪽) */
  function cellMembers(side) { return CHR.filter((c) => sideOfHomolog(c.p, c.h) === side); }
  function layout(proc, f) {
    const T8 = new Array(8);
    const put = (c, k, x, y, ang, a) => { T8[2 * c + k] = { x, y, ang: ang || 0, a }; };
    const dbl = (c, x, y, ang, on) => {
      const o = on ? OFF : 0, ca = Math.cos(ang || 0), sa = Math.sin(ang || 0);
      if (on) { put(c, 0, x - o * ca, y - o * sa, ang, 1); put(c, 1, x + o * ca, y + o * sa, ang, 1); }
      else { put(c, 0, x, y, ang, 1); put(c, 1, x, y, ang, 0); }
    };
    const cs = cellsSpec(proc, f);
    if (proc === 'mit') {
      if (f <= 1) CHR.forEach((c) => dbl(c.id, CX0 + SCAT[c.id][0] * U, CY0 + SCAT[c.id][1] * U, SCAT[c.id][2], f === 1));
      else if (f === 2) CHR.forEach((c) => dbl(c.id, CX0 + ZP[c.id][0] * U, CY0 + ZP[c.id][1] * U, 0, true));
      else if (f === 3) { const rp = cs[0].rx * 0.66; CHR.forEach((c) => { const y = CY0 + ZP[c.id][1] * U; put(c.id, 0, CX0 - rp + (c.id % 2 ? 7 : -3), y, 0, 1); put(c.id, 1, CX0 + rp + (c.id % 2 ? -7 : 3), y, 0, 1); }); }
      else CHR.forEach((c) => { for (let k = 0; k < 2; k++) put(c.id, k, cs[k * 2].x + ZP[c.id][0] * U * 0.9, CY0 + ZP[c.id][1] * U * 0.92, 0, 1); });
      return { cs, T8 };
    }
    // 감수 분열
    if (f <= 1) CHR.forEach((c) => dbl(c.id, CX0 + SCAT[c.id][0] * U, CY0 + SCAT[c.id][1] * U, SCAT[c.id][2], f === 1));
    else if (f === 2) CHR.forEach((c) => dbl(c.id, CX0 + (c.p ? 0.62 : -0.62) * U + (c.h ? 1 : -1) * HSEP / 2, CY0, 0, true));
    else if (f === 3) CHR.forEach((c) => { const left = c.h === S.sep.lh[c.p]; dbl(c.id, CX0 + (left ? -1 : 1) * HSEP / 2, CY0 + (c.p ? 0.5 : -0.5) * U, 0, true); });
    else if (f === 4) {
      CHR.forEach((c) => {
        const sp = S.sep, y = CY0 + (c.p ? 0.5 : -0.5) * U, left = c.h === sp.lh[c.p];
        let x;
        if (sp.nd && c.p === 0) { // 비분리: 두 상동 염색체가 함께 왼쪽 극으로
          const q = clamp((Math.abs(sp.off[0]) - HSEP / 2) / (RPOLE() - HSEP / 2), 0, 1);
          x = lerp(CX0 + (left ? -1 : 1) * HSEP / 2, CX0 - RPOLE() + (left ? 0 : HSEP), q);
        } else x = CX0 + (left ? sp.off[c.p] : -sp.off[c.p]);
        dbl(c.id, x, y, 0, true);
      });
    } else {
      // 감수 1분열이 끝난 뒤: 왼쪽 세포(슬롯 0), 오른쪽 세포(슬롯 2)
      const mem = { '-1': cellMembers(-1), '1': cellMembers(1) };
      [-1, 1].forEach((sd) => {
        const list = mem[String(sd)], cell = sd < 0 ? cs[0] : cs[2], n = list.length;
        if (f === 5) { const xs = slotsX(n); list.forEach((c, i) => dbl(c.id, cell.x + xs[i] * U * 0.95, cell.y, 0, true)); }
        else if (f === 6 || f === 7) {
          const gap = 12, tot = list.reduce((s, c) => s + c.len, 0) + gap * (n - 1);
          let yy = cell.y - tot / 2;
          list.forEach((c) => {
            const y = yy + c.len / 2; yy += c.len + gap;
            if (f === 6) dbl(c.id, cell.x, y, 0, true);
            else { const rp = cell.rx * 0.58; put(c.id, 0, cell.x - rp, y, 0, 1); put(c.id, 1, cell.x + rp, y, 0, 1); }
          });
        } else {
          const xs = slotsX(n);
          list.forEach((c, i) => { for (let k = 0; k < 2; k++) { const gc = cs[(sd < 0 ? 0 : 2) + k]; put(c.id, k, gc.x + xs[i] * U * 0.95, gc.y, 0, 1); } });
        }
      });
    }
    return { cs, T8 };
  }
  function applyFrame(snap) {
    const L2_ = layout(S.proc, S.f);
    L2_.cs.forEach((s, i) => {
      const c = cells[i];
      if (s.a > 0) {
        if (c.ta === 0 && c.a < 0.05 && c.parent >= 0) { const pc = cells[c.parent]; c.x = pc.x; c.y = pc.y; c.rx = pc.rx; c.ry = pc.ry; }
        c.tx = s.x; c.ty = s.y; c.trx = s.rx; c.try_ = s.ry; c.ta = 1; c.dying = false;
      } else if (c.ta > 0 || c.a > 0.02) {
        // 앞 단계로 돌아갈 때는 부모 세포와 합쳐지며 사라져요
        const pt = L2_.cs[c.parent] && L2_.cs[c.parent].a > 0 ? L2_.cs[c.parent] : null;
        if (pt) { c.tx = pt.x; c.ty = pt.y; c.trx = pt.rx; c.try_ = pt.ry; }
        c.ta = 0; c.dying = true;
      }
      if (snap) { c.x = c.tx; c.y = c.ty; c.rx = c.trx; c.ry = c.try_; c.a = c.ta; }
    });
  }
  function stepScene(dt) {
    const L2_ = layout(S.proc, S.f);
    const dragRate = S.sep.drag ? 26 : 7;
    const T8 = L2_.T8;
    for (let i = 0; i < 8; i++) {
      const t = T8[i], c = ct[i];
      if (!t) continue;
      const rate = (S.f === 4 && S.proc === 'mei') ? dragRate : 7;
      c.x = RM ? t.x : approach(c.x, t.x, dt, rate); c.y = RM ? t.y : approach(c.y, t.y, dt, rate);
      c.ang = RM ? t.ang : approach(c.ang, t.ang, dt, rate); c.a = RM ? t.a : approach(c.a, t.a, dt, 8);
    }
    cells.forEach((c) => {
      const r = RM ? 100 : 6;
      c.x = approach(c.x, c.tx, dt, r); c.y = approach(c.y, c.ty, dt, r); c.rx = approach(c.rx, c.trx, dt, r); c.ry = approach(c.ry, c.try_, dt, r);
      c.a = approach(c.a, c.ta, dt, c.dying ? 9 : 8);
      if (c.dying && c.a < 0.03) { c.a = 0; c.dying = false; }
    });
    S.fp = RM ? S.f : approach(S.fp, S.f, dt, 4.5);
    if (Math.abs(S.fp - S.f) < 0.004) S.fp = S.f;
    // 감수 1분열 후기: 두 상동 염색체 쌍을 모두 분리하면 자동으로 세포질 분열
    if (S.proc === 'mei' && S.f === 4 && S.sep.done[0] && S.sep.done[1] && !S.sep.drag && S.sep.armed) {
      S.sep.allT += dt;
      if (S.sep.allT > 0.9 && S.f === 4 && S.hi >= 5) { setFrame(5); }
    } else S.sep.allT = 0;
  }

  function setFrame(f, snap) {
    const P = procOf();
    f = clamp(f, S.lo, Math.min(S.hi, P.n - 1));
    S.sep.armed = false;
    if (S.proc === 'mei' && f >= 5 && !(S.sep.done[0] && S.sep.done[1])) {
      if (S.f < 5 && S.f === 4 && !snap) { showHint('먼저 두 쌍의 상동 염색체를 양극으로 끌어서 분리해 보세요.'); return; }
      fakeDone();
    }
    if (S.proc === 'mei' && f < 4) { S.sep.done = [false, false]; S.sep.off = [-HSEP / 2, -HSEP / 2]; }
    if (S.proc === 'mei' && f === 4 && S.f === 5 && S.sep.done[0] && S.sep.done[1]) { /* 뒤로 가기: 분리된 위치를 유지 */ }
    S.f = f;
    applyFrame(snap);
    if (snap) { const L2_ = layout(S.proc, f); L2_.T8.forEach((t, i) => { if (t) { ct[i].x = t.x; ct[i].y = t.y; ct[i].ang = t.ang; ct[i].a = t.a; } }); S.fp = f; }
    Sound.tick(); updateCtl();
  }
  function setProc(proc, lo, hi, f) {
    S.proc = proc; S.lo = lo; S.hi = hi;
    cells.forEach((c, i) => { c.x = CX0; c.y = CY0; c.rx = R1; c.ry = R1; c.tx = CX0; c.ty = CY0; c.trx = R1; c.try_ = R1; c.a = i === 0 ? 1 : 0; c.ta = c.a; c.dying = false; });
    if (proc === 'mei' && f >= 5) fakeDone();
    S.f = f; applyFrame(true);
    const L2_ = layout(proc, f); L2_.T8.forEach((t, i) => { if (t) { ct[i].x = t.x; ct[i].y = t.y; ct[i].ang = t.ang; ct[i].a = t.a; } });
    S.fp = f; updateCtl();
  }

  /* =========================================================
     그리기: 세포와 염색체
     ========================================================= */
  S.spA = 0; S.nuc = 1;
  const FONT_S = PHONE ? 13 : 14.5;
  const bivRect = (p) => {
    const f = S.f;
    const x = f === 2 ? CX0 + (p ? 0.62 : -0.62) * U : CX0, y = f === 2 ? CY0 : CY0 + (p ? 0.5 : -0.5) * U, len = p ? LS : LL;
    return { x: x - HSEP / 2 - WC * 1.3, y: y - len / 2 - 8, w: HSEP + WC * 2.6, h: len + 16, cx: x, cy: y, len };
  };
  function cellPath(c) { ctx.beginPath(); ctx.ellipse(c.x, c.y, Math.max(2, c.rx), Math.max(2, c.ry), 0, 0, TAU); }
  function drawCells(t) {
    // 막 윤곽을 먼저, 세포질을 나중에 그려 겹친 부분이 하나의 큰 세포처럼 보이게 해요
    cells.forEach((c) => { if (c.a < 0.02) return; ctx.save(); ctx.globalAlpha = c.a; cellPath(c); ctx.lineWidth = 6; ctx.strokeStyle = '#3f9a6c'; ctx.stroke(); ctx.restore(); });
    cells.forEach((c) => {
      if (c.a < 0.02) return; ctx.save(); ctx.globalAlpha = c.a;
      const g = ctx.createRadialGradient(c.x - c.rx * 0.3, c.y - c.ry * 0.35, c.ry * 0.1, c.x, c.y, Math.max(c.rx, c.ry));
      g.addColorStop(0, '#f6fcf8'); g.addColorStop(1, '#d4eedd');
      ctx.fillStyle = g; cellPath(c); ctx.fill(); ctx.restore();
    });
  }
  function drawNucleus() {
    const a = S.proc === 'mei' || S.proc === 'mit' ? clamp(2 - S.fp, 0, 1) : 0;
    if (a < 0.02 || cells[0].a < 0.5) return;
    ctx.save(); ctx.globalAlpha = a * cells[0].a;
    const r = U * 1.1;
    const g = ctx.createRadialGradient(cells[0].x - r * 0.3, cells[0].y - r * 0.3, r * 0.1, cells[0].x, cells[0].y, r);
    g.addColorStop(0, '#f3ecfd'); g.addColorStop(1, '#d9c9f3');
    ctx.fillStyle = g; ctx.strokeStyle = '#8b6bc9'; ctx.lineWidth = 2.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(cells[0].x, cells[0].y, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (a > 0.5) T(cells[0].x + r * 0.62, cells[0].y - r * 0.82, '핵', 13, '#6d4fc2', 'center', 800, { alpha: a });
  }
  const cenPt = (c, k) => { const ch = CHR[c], q = ct[2 * c + k], off = (ch.cen - 0.5) * ch.len; return { x: q.x - Math.sin(q.ang) * off, y: q.y + Math.cos(q.ang) * off }; };
  function drawSpindle() {
    const f = S.f, mei = S.proc === 'mei';
    const want = mei ? (f >= 3 && f <= 4) || f === 6 || f === 7 : f === 2 || f === 3;
    S.spA = approach(S.spA, want ? 1 : 0, 0.016, 5);
    if (S.spA < 0.03) return;
    const act = cells.filter((c) => c.a > 0.5);
    ctx.save(); ctx.globalAlpha = S.spA * 0.8; ctx.lineWidth = 1.5; ctx.strokeStyle = '#7b8aa0';
    const polesDrawn = [];
    for (let c = 0; c < 4; c++) for (let k = 0; k < 2; k++) {
      const q = ct[2 * c + k]; if (q.a < 0.5) continue;
      let cell = act[0], bd = 1e9; act.forEach((a) => { const d = Math.abs(a.x - q.x); if (d < bd) { bd = d; cell = a; } });
      if (!cell) continue;
      let sd;
      if (mei && f <= 4) sd = q.x - cell.x < -0.5 ? -1 : q.x - cell.x > 0.5 ? 1 : (CHR[c].h === S.sep.lh[CHR[c].p] ? -1 : 1);
      else sd = k === 0 ? -1 : 1;
      const px = cell.x + sd * cell.rx * 0.96, py = cell.y, cp = cenPt(c, k);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cp.x, cp.y); ctx.stroke();
      const key = Math.round(px) + '_' + Math.round(py); if (polesDrawn.indexOf(key) < 0) polesDrawn.push(key, [px, py]);
    }
    ctx.restore();
    ctx.save(); ctx.globalAlpha = S.spA;
    for (let i = 1; i < polesDrawn.length; i += 2) { const [px, py] = polesDrawn[i]; ctx.fillStyle = '#55657e'; ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawChromatids(t) {
    // 2가 염색체 강조
    if (S.proc === 'mei' && (S.f === 2 || S.f === 3 || (S.f === 4 && S.sep.drag == null && !S.sep.done[0] && !S.sep.done[1])) && S.fp > 1.6 && S.fp < 4.2) {
      for (let p = 0; p < 2; p++) {
        const r = bivRect(p), found = S.biv[p] || (game && game.free);
        if (found) { ctx.save(); ctx.globalAlpha = 0.9; D.glow(r.cx, r.cy, r.len * 0.8, '#fde047', 0.55); ctx.restore(); }
      }
    }
    for (let c = 0; c < 4; c++) {
      const ch = CHR[c];
      for (let k = 0; k < 2; k++) {
        const q = ct[2 * c + k]; if (q.a < 0.02) continue;
        rod(q.x, q.y, ch.len, WC, q.ang, ch.col, ch.cen, { alpha: q.a, cenColor: 'rgba(255,255,255,.7)' });
      }
      // 동원체에서 붙어 있는 표시
      const a = ct[2 * c], b = ct[2 * c + 1];
      if (b.a > 0.5 && Math.hypot(a.x - b.x, a.y - b.y) < OFF * 2 + 3) { const p0 = cenPt(c, 0), p1 = cenPt(c, 1); ctx.fillStyle = C.shade(ch.col, -0.5); ctx.beginPath(); ctx.arc((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, WC * 0.42, 0, TAU); ctx.fill(); }
    }
  }
  function cellTag(i) {
    // 세포 아래에 DNA 상대량 · 염색체 수 표시
    const c = cells[i]; if (c.a < 0.8) return null;
    const f = S.f, mei = S.proc === 'mei';
    if (S.mode === 'nondis') {
      if (f < 5) return null;
      const side = i < 2 ? -1 : 1, n = cellMembers(side).length;
      const nm = n === 3 ? 'n + 1' : n === 1 ? 'n − 1' : 'n';
      return f === 8 ? [nm, '염색체 ' + n + '개'] : [nm + ' : 염색체 ' + n + '개'];
    }
    if (!mei) { if (f === 4) return ['2n = 4', 'DNA 상대량 2']; return null; }
    if (f === 5) return ['n = 2', 'DNA 상대량 2'];
    if (f === 6) return ['n = 2', 'DNA 상대량 2'];
    if (f === 8) return ['n = 2', 'DNA 상대량 1'];
    return null;
  }
  function drawCellTags() {
    for (let i = 0; i < 4; i++) {
      const tg = cellTag(i); if (!tg) continue;
      const c = cells[i], y = c.y + c.ry + (PHONE ? 14 : 17);
      tg.forEach((s, j) => T(c.x, y + j * (PHONE ? 15 : 17), s, PHONE ? 13 : 14, j === 0 ? '#14532d' : '#2563eb', 'center', 800));
    }
  }
  function sceneCaption() {
    const P = procOf(), name = P.names[S.f];
    T(SC.x + 8, SC.y + 22, name, PHONE ? 15 : 18, '#14532d', 'left', 800);
    const lab = S.proc === 'mit' ? '체세포분열' : S.mode === 'nondis' ? (S.sep.nd ? '감수 분열 (염색체 비분리)' : '감수 분열 (정상 분리)') : '감수 분열';
    D.label(SC.x + SC.w - 8, SC.y + 20, lab, { bg: S.proc === 'mit' ? COL_MIT : COL_MEI, color: '#fff', size: PHONE ? 13 : 14, align: 'right' });
  }
  function drawHints() {
    // 2가 염색체 안내 / 상동 염색체 끌기 안내
    if (S.proc !== 'mei') return;
    if ((S.f === 2 || S.f === 3) && S.fp > 1.8) {
      for (let p = 0; p < 2; p++) {
        const r = bivRect(p), found = S.biv[p] || (game && game.free);
        if (found) { const lx = S.f === 2 ? r.cx : r.cx + HSEP * 1.6 + 40; D.label(S.f === 2 ? r.cx : r.cx + (PHONE ? 86 : 108), r.y - 14 + (S.f === 2 ? 0 : (r.h + 14) / 2), '2가 염색체', { bg: '#ca8a04', color: '#fff', size: PHONE ? 13 : 14 }); }
        else if (game && game.current && game.current() && game.current().id === 'biv') { D.ring(r.cx, r.cy, r.len * 0.62, S.clock + p * 0.4, { color: '#ca8a04' }); }
      }
    }
    if (S.f === 4 && !(S.sep.done[0] && S.sep.done[1])) {
      for (let p = 0; p < 2; p++) {
        if (S.sep.done[p]) continue;
        const y = CY0 + (p ? 0.5 : -0.5) * U, ar = RPOLE();
        if (Math.abs(S.sep.off[p]) > HSEP) continue;
        const tw = 0.5 + 0.5 * Math.sin(S.clock * 4);
        ctx.save(); ctx.globalAlpha = 0.35 + 0.45 * tw;
        D.arrow(CX0 - HSEP / 2 - WC * 2.3, y, CX0 - ar * 0.55, y, { color: '#ca8a04', width: 3, head: 11 });
        D.arrow(CX0 + HSEP / 2 + WC * 2.3, y, CX0 + ar * 0.55, y, { color: '#ca8a04', width: 3, head: 11 });
        ctx.restore();
      }
      T(CX0, SC.y + SC.h - 6, '염색체를 눌러 끌어 보세요 (양극으로)', PHONE ? 13 : 14.5, '#a16207', 'center', 800);
    }
  }
  function drawScene(dt, t) {
    panel(SC.x, SC.y, SC.w, SC.h, 16, '#ffffff');
    sceneCaption();
    drawCells(t); drawNucleus(); drawSpindle(); drawChromatids(t); drawHints(); drawCellTags();
  }

  /* =========================================================
     그래프: 세포 1개당 DNA 상대량
     ========================================================= */
  const GP = (() => {
    const l = PHONE ? 46 : 58, r = PHONE ? 14 : 22, tp = PHONE ? 44 : 40, bt = PHONE ? 62 : 56;
    return { x0: GR.x + l, x1: GR.x + GR.w - r, y0: GR.y + tp, y1: GR.y + GR.h - bt, YMAX: 4.5 };
  })();
  const gxOf = (i, n) => GP.x0 + (i + 0.5) * (GP.x1 - GP.x0) / n;
  const gyOf = (v) => GP.y1 - v / GP.YMAX * (GP.y1 - GP.y0);
  function valAt(vals, pos) { const i = clamp(Math.floor(pos), 0, vals.length - 1), j = Math.min(vals.length - 1, i + 1), f = clamp(pos - i, 0, 1); return lerp(vals[i], vals[j], f); }
  function drawAxes(n, shorts, o) {
    o = o || {};
    panel(GR.x, GR.y, GR.w, GR.h, 16, '#ffffff');
    T(GR.x + 14, GR.y + 24, '세포 1개당 DNA 상대량 (G1기 2n 세포 = 2)', PHONE ? 13.5 : 15.5, '#14532d', 'left', 800);
    for (let v = 0; v <= 4; v++) {
      const y = gyOf(v); ctx.strokeStyle = v === 0 ? '#64748b' : '#e2e8f0'; ctx.lineWidth = v === 0 ? 2 : 1.2; ctx.beginPath(); ctx.moveTo(GP.x0, y); ctx.lineTo(GP.x1, y); ctx.stroke();
      T(GP.x0 - 8, y + 5, String(v), 14, '#475569', 'right', 800);
    }
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(GP.x0, GP.y0 - 6); ctx.lineTo(GP.x0, GP.y1); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const x = gxOf(i, n), on = o.hi === i;
      if (on) { ctx.fillStyle = 'rgba(22,163,74,.1)'; ctx.fillRect(x - (GP.x1 - GP.x0) / n / 2 + 1, GP.y0 - 6, (GP.x1 - GP.x0) / n - 2, GP.y1 - GP.y0 + 6); }
      ctx.strokeStyle = '#eef2f6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, GP.y0 - 4); ctx.lineTo(x, GP.y1); ctx.stroke();
      const lines = shorts[i].split('\n');
      lines.forEach((s, j) => T(x, GP.y1 + 19 + j * 16, s, PHONE ? 13 : 13.5, on ? '#15803d' : '#475569', 'center', 800));
    }
  }
  function polyline(pts, upTo, color, w, dash) {
    // pts: [[x,y],...] , upTo: 0..pts.length-1 (소수 가능)
    if (upTo <= 0) return null;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    const fi = Math.min(pts.length - 1, Math.floor(upTo));
    for (let i = 1; i <= fi; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    let hx = pts[fi][0], hy = pts[fi][1];
    if (fi < pts.length - 1 && upTo > fi) { const f = upTo - fi; hx = lerp(pts[fi][0], pts[fi + 1][0], f); hy = lerp(pts[fi][1], pts[fi + 1][1], f); ctx.lineTo(hx, hy); }
    ctx.stroke(); ctx.restore();
    return [hx, hy];
  }
  function drawSeries(vals, xs, n, upTo, color, w, dash) {
    const pts = vals.map((v, i) => [gxOf(xs ? xs[i] : i, n), gyOf(v)]);
    const head = polyline(pts, upTo, color, w, dash);
    for (let i = 0; i < pts.length; i++) if (i <= upTo + 0.001) { ctx.fillStyle = '#fff'; ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], PHONE ? 5 : 6, 0, TAU); ctx.fill(); ctx.stroke(); }
    return head;
  }
  const plotAllSet = () => S.plot.every((v) => v !== null);
  const plotRight = (i) => S.plot[i] === PROC.mit.dna[i];
  const plotOK = () => plotAllSet() && S.plot.every((v, i) => v === PROC.mit.dna[i]);
  function drawGraphMain(dt, t) {
    const P = procOf(), n = P.n, color = S.proc === 'mit' ? COL_MIT : COL_MEI;
    drawAxes(n, P.short, { hi: Math.round(S.fp) });
    const solved = S.proc !== 'mit' || plotOK() || (game && game.free);
    if (S.proc === 'mit' && !solved) {
      // 학생이 찍는 점
      S.plot.forEach((v, i) => {
        if (v === null) return;
        const x = gxOf(i, n), y = gyOf(v), bad = plotAllSet() && !plotRight(i);
        D.sphere(x, y, PHONE ? 9 : 10, bad ? '#dc2626' : '#2563eb', { shadow: true });
        T(x + (PHONE ? 15 : 18), y - 6, String(v), 14, bad ? '#dc2626' : '#1d4ed8', 'left', 800);
        if (bad) T(x, y + 26, '다시', 13, '#dc2626', 'center', 800);
      });
      const cnt = S.plot.filter((v) => v !== null).length;
      if (cnt === 0) T((GP.x0 + GP.x1) / 2, (GP.y0 + GP.y1) / 2, PHONE ? '단계를 바꿔 가며 그래프를 눌러 점을 찍어요' : '단계를 바꿔 가며 그래프를 눌러 DNA 상대량 점을 찍어요', PHONE ? 13.5 : 16, '#94a3b8', 'center', 800);
      // 현재 단계 표시
      const cx = gxOf(S.fp, n) - 0; const xx = lerp(gxOf(0, n), gxOf(n - 1, n), S.fp / (n - 1));
      ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.moveTo(xx, GP.y1 + 2); ctx.lineTo(xx - 7, GP.y1 + 12); ctx.lineTo(xx + 7, GP.y1 + 12); ctx.closePath(); ctx.fill();
      return;
    }
    const upTo = S.proc === 'mit' ? S.fp : S.fp;
    const head = drawSeries(P.dna, null, n, upTo, color, 4.5);
    if (head) {
      const v = valAt(P.dna, S.fp);
      D.sphere(head[0], head[1], PHONE ? 8 : 9.5, color, { shadow: true });
      const near = head[0] > GR.x + GR.w - 110;
      D.label(head[0] + (near ? -14 : (PHONE ? 18 : 24)), head[1] - (v > 3 ? -2 : 14), 'DNA ' + (Math.round(v * 10) / 10), { bg: color, color: '#fff', size: PHONE ? 13 : 14, align: near ? 'right' : 'left' });
    }
  }
  function drawGraphCmp(dt, t) {
    const n = 9;
    drawAxes(n, PROC.mei.short, { hi: Math.round(S.cmp.x) });
    const mitX = [0, 1, 3, 4, 5];
    drawSeries(PROC.mei.dna, null, n, 8, COL_MEI, 7);
    drawSeries(PROC.mit.dna, mitX, n, 4, COL_MIT, 3.5, [9, 9]);
    T(gxOf(5, n), gyOf(2) - (PHONE ? 14 : 16), PHONE ? '끝' : '체세포분열 끝', PHONE ? 13 : 13.5, COL_MIT, 'center', 800);
    // 읽는 선
    const cx = lerp(gxOf(0, n), gxOf(n - 1, n), S.cmp.x / (n - 1));
    ctx.strokeStyle = 'rgba(30,41,59,.6)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx, GP.y0 - 6); ctx.lineTo(cx, GP.y1); ctx.stroke(); ctx.setLineDash([]);
    const vm = mitVal(S.cmp.x), ve = valAt(PROC.mei.dna, S.cmp.x);
    if (vm != null) { D.sphere(cx, gyOf(vm), PHONE ? 7 : 8, COL_MIT, { shadow: true }); }
    D.sphere(cx, gyOf(ve), PHONE ? 7 : 8, COL_MEI, { shadow: true });
    // 범례
    const lx = GR.x + GR.w - (PHONE ? 8 : 14);
    D.label(lx - (PHONE ? 0 : 0), GR.y + 20, '체세포분열', { bg: COL_MIT, color: '#fff', size: PHONE ? 13 : 14, align: 'right' });
    D.label(lx - (PHONE ? 104 : 118), GR.y + 20, '감수 분열', { bg: COL_MEI, color: '#fff', size: PHONE ? 13 : 14, align: 'right' });
  }
  /* 체세포분열 값을 감수 분열의 단계 위치(0~8)에 맞춰 읽기: 0, 1, (2: 전기), 3 중기, 4 후기, 5 딸세포 */
  function mitVal(x) {
    const xs = [0, 1, 3, 4, 5], vs = PROC.mit.dna;
    if (x > 5.0001) return null;
    for (let i = 0; i < xs.length - 1; i++) if (x >= xs[i] && x <= xs[i + 1]) return lerp(vs[i], vs[i + 1], (x - xs[i]) / (xs[i + 1] - xs[i]));
    return null;
  }

  /* 비교하기 화면의 위쪽: 두 분열의 결과 */
  function drawResultCards(dt, t) {
    const rowW = PHONE ? SC.w : SC.w / 2, rowH = PHONE ? SC.h / 2 : SC.h;
    const cards = [
      { x: SC.x, y: SC.y, w: rowW - (PHONE ? 0 : 6), h: rowH - (PHONE ? 4 : 0), n: 2, rods: 4, col: COL_MIT, title: '체세포분열 결과', l1: '딸세포 2개 · 각각 2n = 4', l2: 'DNA 상대량 2 (모세포와 같음)' },
      { x: SC.x + (PHONE ? 0 : rowW + 6), y: SC.y + (PHONE ? rowH + 4 : 0), w: rowW - (PHONE ? 0 : 6), h: rowH - (PHONE ? 4 : 0), n: 4, rods: 2, col: COL_MEI, title: '감수 분열 결과', l1: '생식세포 4개 · 각각 n = 2', l2: 'DNA 상대량 1 (모세포의 절반)' },
    ];
    cards.forEach((cd, ci) => {
      panel(cd.x, cd.y, cd.w, cd.h, 16, '#ffffff');
      D.label(cd.x + 12, cd.y + 22, cd.title, { bg: cd.col, color: '#fff', size: PHONE ? 14 : 15, align: 'left' });
      const r = Math.min(cd.w / cd.n / 2 * 0.86, cd.h * (PHONE ? 0.19 : 0.3)), cy = cd.y + cd.h * (PHONE ? 0.43 : 0.46);
      for (let i = 0; i < cd.n; i++) {
        const cx = cd.x + cd.w * (i + 0.5) / cd.n, pop = smooth((S.clock - 0.1 * i - (S.cmpT || 0)) * 3);
        ctx.save(); ctx.translate(cx, cy); ctx.scale(0.5 + 0.5 * pop, 0.5 + 0.5 * pop); ctx.globalAlpha = pop;
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r); g.addColorStop(0, '#f6fcf8'); g.addColorStop(1, '#d4eedd');
        ctx.fillStyle = g; ctx.strokeStyle = '#3f9a6c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
        const sc = r / (U * 0.95), w = WC * Math.max(0.8, sc * 0.8);
        const rods = cd.rods === 4 ? [[-0.3, -0.05, 0, 0], [-0.1, 0.1, 1, 0], [0.12, -0.05, 0, 1], [0.32, 0.1, 1, 1]] : [[-0.2, 0, 0, 0], [0.2, 0.0, 1, 1]];
        rods.forEach(([ox, oy, pp, hh]) => rod(ox * r * 1.4, oy * r, (pp ? LS : LL) * Math.min(1, r / (U * 0.95)) * 0.95, w, 0, hh ? MAT : PAT, pp ? 0.38 : 0.45));
        ctx.restore();
      }
      T(cd.x + cd.w / 2, cd.y + cd.h - (PHONE ? 38 : 50), cd.l1, PHONE ? 14 : 16, '#1f2d44', 'center', 800);
      T(cd.x + cd.w / 2, cd.y + cd.h - (PHONE ? 16 : 24), cd.l2, PHONE ? 13 : 14.5, cd.col, 'center', 800);
    });
  }
  /* 비분리 화면의 아래쪽 설명 카드 */
  function drawNdCard() {
    panel(GR.x, GR.y, GR.w, GR.h, 16, '#ffffff');
    const x = GR.x + 16, w = GR.w - 32;
    T(x, GR.y + 24, '사람의 21번 염색체가 감수 1분열에서 비분리되면', PHONE ? 14.5 : 16.5, '#14532d', 'left', 800);
    const rows = [
      ['정상 생식세포', '염색체 23개 (n)', '#16a34a'],
      ['n + 1 생식세포 (2개)', '염색체 24개 · 21번이 2개', '#ea580c'],
      ['n − 1 생식세포 (2개)', '염색체 22개 · 21번이 없음', '#7c3aed'],
    ];
    const rh = PHONE ? 30 : 28;
    rows.forEach((r, i) => {
      const y = GR.y + 48 + i * rh;
      D.label(x, y + 4, r[0], { bg: r[2], color: '#fff', size: PHONE ? 13 : 14, align: 'left' });
      T(x + (PHONE ? 180 : 214), y + 9, r[1], PHONE ? 13.5 : 15, '#1f2d44', 'left', 800);
    });
    const y2 = GR.y + 48 + 3 * rh + 10;
    textBlock(x, y2 + 6, w, PHONE ? '정상 생식세포(23개)와 수정하면 염색체 47개(n + 1) 또는 45개(n − 1)의 수정란이 돼요. 47개이고 21번이 3개이면 다운 증후군 핵형이에요.' : '정상 생식세포(23개)와 수정하면 염색체 47개(n + 1) 또는 45개(n − 1)의 수정란이 돼요. 47개이고 21번이 3개인 핵형이 다운 증후군이에요.', PHONE ? 13 : 14.5, '#475569', PHONE ? 18 : 19, 700);
  }

  /* =========================================================
     화면 전환 · 조작 연결 · 읽음 칸
     ========================================================= */
  const MODE_LABEL = { mit: '🔬 체세포분열과 DNA 상대량', m1: '🔬 감수 1분열: 상동 염색체 분리', m2: '🔬 감수 2분열: 염색 분체 분리', cmp: '📊 두 분열의 DNA 상대량 비교', nondis: '⚠️ 염색체 비분리' };
  S.ui = { rd: false, tbl: false };
  const NOTES = {
    mit: ['G1기 세포예요. 염색체(2n = 4)는 염색 분체가 1개씩이고, DNA 상대량은 2예요.', 'DNA가 복제되어 염색 분체가 2개씩이에요. DNA 상대량이 2배인 4가 돼요.', '염색체가 적도면에 한 줄로 배열돼요. DNA 상대량은 아직 4예요.', '염색 분체가 둘로 갈라져 양극으로 가요. 세포가 둘로 나뉘기 전이라 DNA는 세포 하나에 4예요.', '세포질이 나뉘어 딸세포 2개가 돼요. 딸세포마다 2n = 4, DNA 상대량 2예요.'],
    mei: ['G1기 세포예요. 염색체(2n = 4), DNA 상대량 2예요.', '복제되어 염색 분체가 2개씩이 돼요. DNA 상대량 4.', '상동 염색체끼리 붙어 <b>2가 염색체</b>(염색 분체 4개)가 만들어져요.', '2가 염색체가 적도면에 배열돼요. 부계·모계 염색체가 양쪽에 나뉘어 서요.', '<b>상동 염색체</b>가 양극으로 끌려가요. 염색 분체는 붙어 있어요.', '세포 2개! 염색체 수가 2n에서 n으로 줄고(4→2), DNA 상대량은 2예요. 염색 분체는 아직 붙어 있어요.', '복제 없이 염색체가 적도면에 배열돼요. 세포 하나에 염색체 n = 2, DNA 2.', '이번에는 <b>염색 분체</b>가 분리되어 양극으로 가요.', '생식세포 4개! 각각 염색체 n = 2, DNA 상대량 1이에요.'],
  };
  function resetSep() { S.sep.off = [-HSEP / 2, -HSEP / 2]; S.sep.done = [false, false]; S.sep.drag = null; S.sep.allT = 0; }
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); hideHint(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode];
    S.sep.nd = mode === 'nondis';
    if (mode === 'mit') setProc('mit', 0, 4, 0);
    else if (mode === 'm1') { resetSep(); setProc('mei', 0, 5, 0); }
    else if (mode === 'm2') { if (!(S.sep.done[0] && S.sep.done[1]) || S.sep.nd) { S.sep.nd = false; fakeDone(); } setProc('mei', 5, 8, 5); }
    else if (mode === 'nondis') { resetSep(); setProc('mei', 3, 8, 3); }
    else if (mode === 'cmp') { S.cmpT = S.clock; updateCtl(); }
    S.visM = {};
    updateCtl();
  }
  const FREE = () => !!(game && game.free);
  const cntNow = () => { const P = procOf(); return P.chr[S.f]; };
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    const curLv = game ? game.level + 1 : 1, showAll = FREE();
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.classList.toggle('lv-off', !showAll && +b.dataset.lv !== curLv && b.dataset.mode !== S.mode); });
    const P = procOf(), f = S.f, nav = S.mode !== 'cmp';
    if (nav) {
      $('#oStage').textContent = (f + 1) + ' / ' + P.n;
      $('#bPrev').disabled = f <= S.lo;
      const block = S.proc === 'mei' && f === 4 && !(S.sep.done[0] && S.sep.done[1]);
      $('#bNext').disabled = f >= Math.min(S.hi, P.n - 1) || block;
      $('#bNext').textContent = block ? '↔ 상동 염색체를 끌어요' : f >= Math.min(S.hi, P.n - 1) ? '마지막 단계' : '다음 단계 ▶';
      const note = (NOTES[S.proc] || [])[f] || '';
      $('#navNote').innerHTML = '<b>' + P.names[f] + '</b><br>' + note;
    }
    $('#bClearPts').disabled = S.plot.every((v) => v === null);
    $('#ndSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('on', (b.dataset.nd === '1') === S.sep.nd));
    $('#rdWrap').hidden = !(S.ui.rd && S.mode === 'cmp');
    $('#tblWrap').hidden = !(S.ui.tbl && S.mode === 'cmp');
    $('#sCmp').value = Math.round(S.cmp.tx != null ? S.cmp.tx : S.cmp.x); $('#sCmp').style.setProperty('--pct', ((S.cmp.tx != null ? S.cmp.tx : S.cmp.x) / 8 * 100) + '%');
    $('#oCmp').textContent = PROC.mei.names[Math.round(S.cmp.tx != null ? S.cmp.tx : S.cmp.x)].split(':')[0];
    $('#rdMit').classList.toggle('ok', S.cmp.rdMit === '2'); $('#rdMei').classList.toggle('ok', S.cmp.rdMei === '1');
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#bPrev').addEventListener('click', () => { Sound.click(); setFrame(S.f - 1); });
  $('#bNext').addEventListener('click', () => { Sound.click(); setFrame(S.f + 1); });
  $('#bClearPts').addEventListener('click', () => { Sound.click(); S.plot = [null, null, null, null, null]; updateCtl(); });
  $('#ndSeg').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.sep.nd = b.dataset.nd === '1'; resetSep(); S.visM = {}; setProc('mei', 3, 8, 3); }));
  $('#sCmp').addEventListener('input', (e) => { S.cmp.tx = +e.target.value; Sound.tick(); updateCtl(); });
  $('#rdMit').addEventListener('input', (e) => { S.cmp.rdMit = e.target.value.trim(); updateCtl(); });
  $('#rdMei').addEventListener('input', (e) => { S.cmp.rdMei = e.target.value.trim(); updateCtl(); });
  /* 비교표 */
  const TBL = [
    { k: 'times', label: '분열 횟수', opts: ['1회', '2회', '3회'], ans: [0, 1], why: '체세포분열은 1회, 감수 분열은 연속 2회(감수 1분열, 감수 2분열)예요.' },
    { k: 'cells', label: '딸세포 수', opts: ['2개', '4개', '8개'], ans: [0, 1], why: '체세포분열은 딸세포 2개, 감수 분열은 생식세포 4개가 만들어져요.' },
    { k: 'chr', label: '딸세포의 염색체 수', opts: ['2n', 'n', '4n'], ans: [0, 1], why: '체세포분열은 모세포와 같은 2n, 감수 분열은 절반인 n이에요.' },
    { k: 'biv', label: '2가 염색체 형성', opts: ['X (안 함)', 'O (함)'], ans: [0, 1], why: '2가 염색체는 감수 1분열 전기에만 형성돼요.' },
    { k: 'rep', label: 'DNA 복제 횟수', opts: ['0회', '1회', '2회'], ans: [1, 1], why: '두 분열 모두 분열 전에 DNA 복제가 1번 일어나요. 감수 2분열 전에는 복제가 없어요.' },
  ];
  S.cmp.tbl = {};
  (function buildTbl() {
    const t = $('#cmpTbl');
    t.innerHTML = '<tr><th></th><th>체세포분열</th><th>감수 분열</th></tr>';
    TBL.forEach((r) => {
      const tr = document.createElement('tr'); tr.innerHTML = '<td class="rowh">' + r.label + '</td>';
      [0, 1].forEach((c) => {
        const td = document.createElement('td'), sel = document.createElement('select');
        sel.setAttribute('aria-label', r.label + ' ' + (c ? '감수 분열' : '체세포분열'));
        sel.innerHTML = '<option value="">?</option>' + r.opts.map((o, i) => '<option value="' + i + '">' + o + '</option>').join('');
        sel.addEventListener('change', () => { S.cmp.tbl[r.k + c] = sel.value === '' ? null : +sel.value; sel.classList.remove('bad', 'ok'); Sound.click(); });
        td.appendChild(sel); tr.appendChild(td);
      });
      t.appendChild(tr);
    });
  })();
  const tblSels = () => $$('#cmpTbl select');
  const tblRight = (r, c) => S.cmp.tbl[r.k + c] === r.ans[c];

  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'mit') {
        const n = PROC.mit.n, cw = (GP.x1 - GP.x0) / n;
        if (p.y > GP.y0 - 14 && p.y < GP.y1 + 12 && p.x > GP.x0 && p.x < GP.x1 && !(plotOK() || FREE())) {
          const i = clamp(Math.floor((p.x - GP.x0) / cw), 0, n - 1);
          const v = clamp(Math.round((GP.y1 - p.y) / (GP.y1 - GP.y0) * GP.YMAX), 0, 4);
          S.plot[i] = v; Sound.tick(); updateCtl();
          parts.burst(gxOf(i, n), gyOf(v), { count: 5, colors: ['#2563eb', '#93c5fd'], speed: 60, size: 2.5, life: 0.4 });
        }
        return false;
      }
      if (S.mode === 'cmp') {
        if (p.y > GP.y0 - 14 && p.y < GP.y1 + 30 && p.x > GP.x0 && p.x < GP.x1) { S.cmp.tx = clamp(Math.floor((p.x - GP.x0) / ((GP.x1 - GP.x0) / 9)), 0, 8); Sound.tick(); updateCtl(); }
        return false;
      }
      if (S.proc !== 'mei') return false;
      if ((S.f === 2 || S.f === 3) && S.mode === 'm1') {
        for (let q = 0; q < 2; q++) { const r = bivRect(q); if (inRect(p, r)) { S.biv[q] = true; Sound.success(); parts.burst(r.cx, r.cy, { count: 10, colors: ['#ca8a04', '#fde047', '#fff'], speed: 90, size: 3, life: 0.6 }); updateCtl(); return false; } }
        return false;
      }
      if (S.f === 4 && Math.abs(S.fp - 4) < 0.5) {
        let best = null, bd = 1e9;
        CHR.forEach((c) => {
          const a = ct[2 * c.id], b = ct[2 * c.id + 1], cx = (a.x + b.x) / 2, dx = Math.abs(p.x - cx), dy = Math.abs(p.y - a.y);
          if (dx < WC * 2.1 + 8 && dy < c.len / 2 + 10 && dx + dy < bd) { bd = dx + dy; best = c; }
        });
        if (!best) return false;
        S.sep.drag = { c: best, sx: p.x, moved: false };
        return true;
      }
      return false;
    },
    move(p) {
      const d = S.sep.drag; if (!d) return;
      if (Math.abs(p.x - d.sx) > 5) d.moved = true;
      if (!d.moved) return;
      const c = d.c, left = c.h === S.sep.lh[c.p], dx = p.x - CX0;
      if (S.sep.nd && c.p === 0) S.sep.off[0] = -Math.max(HSEP / 2, Math.min(RPOLE(), Math.abs(dx)));
      else S.sep.off[c.p] = clamp(left ? dx : -dx, -RPOLE(), RPOLE());
      S.sep.done[c.p] = false;
    },
    up(p) {
      const d = S.sep.drag; if (!d) return;
      const c = d.c, pp = c.p, sp = S.sep; sp.drag = null;
      if (!d.moved) {
        // 눌렀다 뗐을 때: 이미 분리했으면 되돌리고, 아니면 자기 쪽 극으로 끌어요
        if (sp.done[pp]) { sp.off[pp] = -HSEP / 2; sp.done[pp] = false; }
        else { sp.off[pp] = -RPOLE(); sp.done[pp] = true; Sound.success(); }
      } else if (Math.abs(sp.off[pp]) > RPOLE() * 0.55) { sp.off[pp] = Math.sign(sp.off[pp]) * RPOLE(); sp.done[pp] = true; Sound.success(); }
      else { sp.off[pp] = -HSEP / 2; sp.done[pp] = false; Sound.fail(); }
      if (sp.nd && pp === 0 && sp.done[0]) sp.off[0] = -RPOLE();
      if (sp.done[pp]) sp.armed = true;
      else sp.armed = false;
      if (sp.done[pp]) { const x = CX0 - RPOLE(); parts.burst(CX0, CY0 + (pp ? 0.5 : -0.5) * U, { count: 12, colors: [PAT, MAT, '#fde047'], speed: 110, size: 3, life: 0.6 }); }
      updateCtl();
    },
    hover(p) {
      if (S.mode === 'mit' && p.x > GP.x0 && p.x < GP.x1 && p.y > GP.y0 - 14 && p.y < GP.y1 + 12) return 'crosshair';
      if (S.mode === 'cmp' && p.y > GP.y0 - 14 && p.x > GP.x0 && p.x < GP.x1) return 'pointer';
      if (S.proc === 'mei' && S.f === 4) return CHR.some((c) => Math.abs(p.x - (ct[2 * c.id].x + ct[2 * c.id + 1].x) / 2) < WC * 2.5 && Math.abs(p.y - ct[2 * c.id].y) < c.len / 2 + 8) ? 'grab' : 'default';
      return 'default';
    },
  });

  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const P = procOf(), m = S.mode;
    if (m === 'cmp') {
      const x = Math.round(S.cmp.x); L1 = '읽는 단계'; a = PROC.mei.names[x].split(':')[0]; L2 = '체세포분열 DNA'; const vm = mitVal(x); b = vm == null ? '— (이미 끝남)' : String(Math.round(vm * 10) / 10); L3 = '감수 분열 DNA'; c = String(PROC.mei.dna[x]);
      if (vm != null && Math.abs(vm - Math.round(vm)) > 0.01) b = String(Math.round(vm * 10) / 10);
    } else {
      L1 = '단계'; a = (S.f + 1) + ' / ' + P.n + ' · ' + P.names[S.f].split(':')[0];
      const hide = m === 'mit' && !(plotOK() || FREE());
      L2 = '세포 1개당 DNA 상대량'; b = hide ? '? (그래프에 찍어요)' : (m === 'nondis' ? '—' : String(P.dna[S.f]));
      L3 = '세포 1개당 염색체 수'; c = m === 'nondis' ? (S.f >= 5 ? '왼쪽 ' + cellMembers(-1).length + '개 · 오른쪽 ' + cellMembers(1).length + '개' : '2n = 4') : String(P.chr[S.f]) + (P.chr[S.f] === 8 || (S.proc === 'mei' && S.f === 7) ? ' (분리 중)' : '');
      if (m === 'nondis') { L2 = '비분리가 일어난 쌍'; b = S.sep.nd ? '긴 상동 염색체 쌍' : '없음 (정상 분리)'; }
    }
    const keyS = [L1, a, L2, b, L3, c].join('|');
    if (keyS === rlast) return; rlast = keyS;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function autoFill() {
    S.plot = PROC.mit.dna.slice(); S.biv = [true, true]; S.cmp.rdMit = '2'; S.cmp.rdMei = '1'; $('#rdMit').value = '2'; $('#rdMei').value = '1';
    TBL.forEach((r) => { [0, 1].forEach((c) => { S.cmp.tbl[r.k + c] = r.ans[c]; }); });
    tblSels().forEach((s, i) => { const r = TBL[Math.floor(i / 2)]; s.value = String(r.ans[i % 2]); s.classList.add('ok'); });
    updateCtl();
  }

  /* =========================================================
     미션
     ========================================================= */
  const mitCorrect = () => S.plot.filter((v, i) => v === PROC.mit.dna[i]).length;
  const levels = [
    {
      title: '체세포분열과 DNA 상대량', short: 'DNA 상대량', icon: '📈', phase: '분석',
      intro: '<p class="si-q">❓ 탐구 질문: 생식세포를 만들 때 DNA 양과 염색체 수는 어떻게 변할까? 체세포분열과는 어디서 달라질까?</p><p>🔗 <b>중학교</b>에서 체세포분열과 감수 분열의 염색체 변화를 배웠어요. 이번에는 세포 1개당 <b>DNA 상대량</b>을 그래프로 그려 두 분열을 비교해요.</p><p>G1기 세포(2n = 4)의 DNA 상대량을 <b>2</b>로 놓고, 먼저 체세포분열 과정에서 이 값이 어떻게 변하는지 그래프에 점을 찍어 봐요.</p>',
      features: ['mit'],
      setup() { setMode('mit'); },
      recap: '체세포분열에서는 DNA 상대량이 2 → 4(복제) → 2(분열 후)로 변하고, 딸세포는 모세포와 같은 2n이에요.',
      summary: '<ul><li>체세포분열: <b>DNA 복제(2 → 4)</b> → 분열 1회 → 딸세포 2개, 각각 <b>DNA 상대량 2</b>, 염색체 수 <b>2n</b>(모세포와 같음).</li><li>세포 1개당 DNA 상대량 그래프: 2 → 4(복제 후 분열 중) → 2.</li><li>G1기 세포의 DNA를 1로 놓는 교재에서는 1 → 2 → 1로 나타내요. 모양은 같아요.</li></ul>',
      missions: [
        {
          id: 'plot', title: '체세포분열 그래프 그리기',
          goal: '단계를 하나씩 넘기며 세포 1개당 <b>DNA 상대량</b>을 그래프에서 눌러 <b>점 5개</b>를 찍으세요. 점을 다시 누르면 고칠 수 있어요.',
          hint: 'G1기는 2예요. 복제하면 2배가 되고, 후기까지는 세포가 아직 1개예요. 세포가 둘로 나뉘면 딸세포 하나는 원래대로 돌아와요.',
          setup() { setMode('mit'); S.plot = [null, null, null, null, null]; updateCtl(); },
          check: plotOK, hold: 0.6,
          status: () => '점 ' + S.plot.filter((v) => v !== null).length + ' / 5' + (plotAllSet() ? ' &nbsp; 맞은 점 ' + mitCorrect() + ' / 5' : ''),
          explain: '체세포분열은 <b>DNA 복제(2 → 4)</b>로 시작해요. 복제 후 중기·후기까지는 세포 하나에 DNA 상대량이 4예요. 세포질 분열로 딸세포 2개가 되면 각각 <b>2</b>가 돼요. 딸세포는 모세포와 DNA 상대량도 염색체 수(2n)도 같아요.',
        },
        {
          type: 'quiz', title: '딸세포가 모세포와 같은 까닭',
          goal: '체세포분열로 만들어진 딸세포의 <b>DNA 상대량과 염색체 수</b>가 모세포(G1기)와 같은 까닭은?',
          setup() { setMode('mit'); },
          choices: ['DNA 복제 없이 세포만 둘로 나뉘기 때문이다', '분열 전에 DNA가 복제되어 2배가 된 뒤, 한 번 나뉘어 원래 양으로 돌아오기 때문이다', '딸세포끼리 DNA를 서로 절반씩 주고받기 때문이다', '분열이 두 번 연속으로 일어나기 때문이다'],
          answer: 1,
          feedback: ['복제 없이 나뉘면 딸세포의 DNA가 절반이 돼요. 체세포분열 전에는 DNA 복제가 있어요.', '', 'DNA를 주고받지 않아요. 복제된 염색 분체가 각각 한 딸세포로 가요.', '체세포분열은 1회만 일어나요. 연속 2회는 감수 분열이에요.'],
          explain: '체세포분열은 <b>복제 1회 + 분열 1회</b>예요. 복제로 2배가 된 DNA가 분열로 다시 반씩 나뉘어 딸세포의 DNA 상대량과 염색체 수가 모세포와 같아져요.',
        },
      ],
    },
    {
      title: '감수 1분열: 상동 염색체 분리', short: '감수 1분열', icon: '🔀', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 체세포분열은 복제 1번, 분열 1번이라 DNA와 염색체 수가 그대로임을 확인했어요.</div><p>이제 <b>감수 분열</b>의 첫 번째 분열을 따라가요. 모형은 2n = 4(긴 상동 염색체 쌍과 짧은 상동 염색체 쌍)이고, 아버지에게서 받은 염색체는 <b>파랑</b>, 어머니에게서 받은 염색체는 <b>빨강</b>이에요.</p>',
      features: ['m1'],
      setup() { setMode('m1'); },
      recap: '감수 1분열 전기에 상동 염색체가 붙어 2가 염색체를 만들고, 후기에 상동 염색체가 분리되어 염색체 수가 2n에서 n으로 줄어요(DNA 4 → 2).',
      summary: '<ul><li>감수 분열도 DNA 복제(2 → 4) 뒤에 시작해요.</li><li>감수 1분열 전기: 상동 염색체가 접합해 <b>2가 염색체</b>(염색 분체 4개)를 만들어요. 중기: 적도면에 배열.</li><li>후기: <b>상동 염색체</b>가 분리되어 양극으로 → 세포 2개, 염색체 수 <b>2n → n</b>, DNA 상대량 <b>4 → 2</b>. 염색 분체는 아직 붙어 있어요.</li></ul>',
      missions: [
        {
          id: 'biv', title: '2가 염색체 찾기',
          goal: '▶ 다음 단계로 <b>전기 Ⅰ</b>까지 가서, 상동 염색체가 붙어 만든 <b>2가 염색체 2개</b>를 눌러 찾으세요.',
          hint: '복제 후 세 번째 단계가 감수 1분열 전기예요. 파랑과 빨강 염색체가 한 쌍씩 붙어 있는 덩어리를 눌러요.',
          setup() { setMode('m1'); S.biv = [false, false]; updateCtl(); },
          check: () => S.biv[0] && S.biv[1], hold: 0.5,
          status: () => mark(S.biv[0]) + ' 긴 쌍 &nbsp; ' + mark(S.biv[1]) + ' 짧은 쌍',
          explain: '<b>2가 염색체</b>는 복제된 상동 염색체 2개가 나란히 붙은 것으로, 염색 분체가 모두 4개예요. 2가 염색체는 감수 1분열 전기에 만들어지고 체세포분열에서는 만들어지지 않아요.',
        },
        {
          id: 'sep', title: '상동 염색체 분리',
          goal: '▶ 다음 단계로 <b>후기 Ⅰ</b>까지 간 뒤, 두 쌍의 상동 염색체를 <b>양극으로 끌어서</b> 분리하세요.',
          hint: '염색체를 눌러 왼쪽이나 오른쪽 극으로 끌어요. 한쪽을 끌면 짝이 반대쪽으로 가요. 한 번 누르기만 해도 분리돼요.',
          setup() { setMode('m1'); resetSep(); setProc('mei', 0, 5, 3); updateCtl(); },
          check: () => S.sep.done[0] && S.sep.done[1] && S.f >= 5 && S.fp > 4.9, hold: 0.8,
          status: () => '분리한 쌍 ' + S.sep.done.filter(Boolean).length + ' / 2' + (S.sep.done[0] && S.sep.done[1] ? ' &nbsp; ✅ 세포 2개' : ''),
          explain: '감수 1분열 후기에 <b>상동 염색체</b>가 갈라져 양극으로 가요. 각 쌍에서 어느 쪽 염색체가 어느 극으로 가는지는 쌍마다 따로 정해져서, 생기는 세포의 염색체 조합이 달라질 수 있어요. 분리 뒤 세포는 염색체 수가 <b>n = 2</b>이고 염색 분체는 아직 붙어 있어요.',
        },
        {
          type: 'quiz', title: '감수 1분열에서 분리되는 것',
          goal: '감수 1분열 후기에 양극으로 <b>분리되는 것</b>은?',
          setup() { setMode('m1'); },
          choices: ['염색 분체', '상동 염색체', '핵막과 세포막', '복제된 DNA 가닥 한 줄'],
          answer: 1,
          feedback: ['염색 분체가 분리되는 것은 감수 2분열이에요.', '', '핵막과 세포막은 염색체와 다른 구조예요.', '염색체는 DNA 이중 나선 단위로 움직여요. 한 가닥씩 갈라지는 것이 아니에요.'],
          explain: '감수 1분열에서는 <b>상동 염색체</b>가 분리돼요(염색체 수 2n → n). 염색 분체는 아직 붙어 있다가 감수 2분열에서 분리돼요.',
        },
      ],
    },
    {
      title: '감수 2분열: 염색 분체 분리', short: '감수 2분열', icon: '✂️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 감수 1분열로 염색체 수가 n = 2인 세포 2개가 만들어졌어요. 염색체는 아직 염색 분체 2개씩이에요.</div><p>이제 두 번째 분열이에요. 이번에는 <b>DNA 복제 없이</b> 곧바로 분열해요. 무엇이 분리되는지, DNA 상대량이 어떻게 변하는지 그래프와 함께 봐요.</p>',
      features: ['m2'],
      setup() { setMode('m2'); },
      recap: '감수 2분열에서는 복제 없이 염색 분체가 분리되어 생식세포 4개(n, DNA 상대량 1)가 만들어져요.',
      summary: '<ul><li>감수 2분열: <b>복제 없이</b> 염색 분체가 분리돼요 → 생식세포 <b>4개</b>, 염색체 수 <b>n</b>, DNA 상대량 <b>1</b>.</li><li>그래프: 2 → 4 → (감수 1분열) 2 → (감수 2분열) 1.</li><li>분리되는 것 비교: 감수 1분열은 <b>상동 염색체</b>, 감수 2분열은 <b>염색 분체</b>(체세포분열과 같은 분리).</li></ul>',
      missions: [
        {
          id: 'gam', title: '생식세포 4개 완성하기',
          goal: '▶ 다음 단계로 감수 2분열의 <b>중기 → 후기 → 완료</b>까지 진행해 <b>생식세포 4개</b>를 완성하세요.',
          hint: '▶ 다음 단계를 세 번 누르면 돼요. 후기에 염색 분체가 둘로 갈라지는 것을 잘 봐요.',
          setup() { setMode('m2'); S.visM = {}; updateCtl(); },
          check: () => S.f === 8 && S.fp > 7.95 && cells.filter((c) => c.a > 0.9).length === 4, hold: 0.8,
          status: () => mark(S.f >= 6) + ' 중기 Ⅱ &nbsp; ' + mark(S.f >= 7) + ' 후기 Ⅱ &nbsp; ' + mark(S.f >= 8) + ' 생식세포 4개',
          explain: '감수 2분열은 체세포분열처럼 <b>염색 분체</b>가 분리돼요. 앞에 DNA 복제가 없어서 생식세포의 DNA 상대량이 <b>1</b>(모세포 2의 절반)이 되고, 염색체 수는 <b>n = 2</b>예요.',
        },
        {
          type: 'quiz', title: 'DNA 상대량이 1인 까닭',
          goal: '감수 2분열이 끝난 생식세포의 <b>DNA 상대량이 1</b>(처음 2의 절반)인 까닭은?',
          setup() { setMode('m2'); },
          choices: ['감수 1분열에서 DNA가 모두 없어지기 때문이다', '감수 2분열 전에 DNA가 한 번 더 복제되기 때문이다', '감수 2분열 전에 복제가 없는 채로 염색 분체가 나뉘어 DNA가 절반이 되기 때문이다', '상동 염색체가 한 번 더 분리되기 때문이다'],
          answer: 2,
          feedback: ['DNA가 없어지지 않아요. 감수 1분열 후에도 DNA 상대량은 2예요.', '복제가 한 번 더 일어나면 DNA가 늘어나요. 감수 2분열 전에는 복제가 없어요.', '', '상동 염색체는 감수 1분열에서 이미 분리됐어요. 감수 2분열에서는 염색 분체가 분리돼요.'],
          explain: '감수 분열은 <b>복제 1회, 분열 2회</b>예요. 복제로 4가 된 DNA가 감수 1분열(4 → 2)과 감수 2분열(2 → 1)로 두 번 나뉘어 생식세포는 1이 돼요.',
        },
      ],
    },
    {
      title: '두 분열 비교하기', short: '비교하기', icon: '⚖️', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 체세포분열과 감수 분열의 DNA 상대량 그래프를 따로 그려 봤어요.</div><p>이제 한 좌표에 <b>겹쳐서</b> 단계별 차이를 읽고 비교표를 완성해요. 마지막에는 감수 1분열에서 상동 염색체가 분리되지 않는 <b>염색체 비분리</b>가 일어나면 생식세포의 염색체 수가 어떻게 되는지 판단해요.</p>',
      features: ['cmp', 'nondis'],
      setup() { setMode('cmp'); },
      recap: '체세포분열은 2n 딸세포 2개(DNA 2), 감수 분열은 n 생식세포 4개(DNA 1)예요. 상동 염색체가 비분리되면 n+1, n−1 생식세포가 만들어져요.',
      summary: '<ul><li>그래프 비교: 두 분열 모두 복제로 2 → 4가 되지만, 체세포분열은 마지막이 <b>2</b>, 감수 분열은 <b>1</b>이에요.</li><li>비교표: 분열 횟수 1 / 2, 딸세포 수 2 / 4, 염색체 수 2n / n, 2가 염색체 X / O, 복제 횟수 1 / 1.</li><li>감수 1분열에서 21번 염색체가 <b>비분리</b>되면 n+1(24개), n−1(22개) 생식세포가 만들어져 수정 후 47개 또는 45개가 돼요.</li></ul>',
      missions: [
        {
          id: 'read', title: '겹친 그래프 읽기', manual: true,
          goal: '슬라이더로 단계를 옮기며 두 그래프를 비교한 뒤, <b>마지막 단계</b>의 DNA 상대량을 쓰세요.',
          hint: '체세포분열은 딸세포 2개가 된 단계, 감수 분열은 생식세포 4개가 된 단계의 값을 읽어요.',
          setup() { setMode('cmp'); S.ui.rd = true; S.ui.tbl = false; S.cmp.tx = 8; updateCtl(); },
          check() {
            const a = S.cmp.rdMit, b = S.cmp.rdMei;
            if (a === '' || b === '') return '체세포분열과 감수 분열의 마지막 DNA 상대량을 모두 쓰세요.';
            if (a !== '2') return '체세포분열은 딸세포 하나의 값을 읽어요. 복제 전과 같은 값이에요.';
            if (b !== '1') return '감수 분열은 생식세포 하나의 값을 읽어요. 감수 2분열 후의 값이에요.';
            return true;
          },
          explain: '체세포분열의 마지막 DNA 상대량은 <b>2</b>(모세포와 같음), 감수 분열은 <b>1</b>(절반)이에요. 두 분열 모두 복제로 4까지 올라가지만 감수 분열은 분열을 2번 해서 한 번 더 줄어요.',
        },
        {
          id: 'tbl', title: '비교표 완성하기', manual: true,
          goal: '체세포분열과 감수 분열의 <b>비교표</b>를 칸마다 골라 완성하세요.',
          hint: '분열 횟수와 딸세포 수는 앞에서 직접 봤어요. 2가 염색체는 감수 1분열 전기에만 나타났고, 복제는 두 분열 모두 분열 전에 1번이에요.',
          setup() { setMode('cmp'); S.ui.rd = false; S.ui.tbl = true; updateCtl(); },
          check() {
            const sels = tblSels(); let bad = null;
            TBL.forEach((r, ri) => [0, 1].forEach((c) => {
              const s = sels[ri * 2 + c], v = S.cmp.tbl[r.k + c];
              if (v == null) { if (!bad) bad = { r, msg: '빈칸이 있어요.' }; return; }
              if (v !== r.ans[c]) { if (!bad || bad.msg === '빈칸이 있어요.') bad = { r, msg: r.label + ': ' + r.why }; }
            }));
            if (bad) return bad.msg;
            return true;
          },
          explain: '체세포분열: 1회 분열, 딸세포 2개(2n), 2가 염색체 X. 감수 분열: 2회 분열, 생식세포 4개(n), 2가 염색체 O. DNA 복제는 두 분열 모두 분열 전에 <b>1회</b>뿐이에요.',
        },
        {
          type: 'quiz', title: '염색체 비분리',
          goal: '감수 1분열에서 21번 상동 염색체가 <b>분리되지 않았어요</b>(감수 2분열은 정상). 만들어진 생식세포 4개의 염색체 수는? (정상은 23개)',
          setup() { setMode('nondis'); S.ui.rd = false; S.ui.tbl = false; updateCtl(); },
          choices: ['24개 4개 (모두 n + 1)', '46개 2개와 0개 2개', '23개 4개 (모두 정상)', '24개 2개와 22개 2개'],
          answer: 3,
          feedback: ['한 세포는 21번을 둘 다 받고, 다른 세포는 하나도 받지 못해요. 4개가 모두 24개일 수는 없어요.', '감수 2분열에서 염색 분체가 정상으로 분리되므로 한 생식세포의 21번은 최대 2개(n + 1 = 24개)예요.', '비분리가 일어나면 정상 생식세포가 만들어지지 않아요.', ''],
          explain: '감수 1분열에서 21번 상동 염색체 두 개가 함께 한쪽 세포로 가면, 그 세포에서 생식세포 2개는 염색체 <b>24개(n + 1)</b>, 반대쪽 세포에서 2개는 <b>22개(n − 1)</b>가 돼요. 정상 생식세포(23개)와 수정하면 47개(21번이 3개: 다운 증후군) 또는 45개가 돼요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-meiosis', mount: '#game', badge: '감수 분열 탐험가', homeHref: '../../index.html#hb',
    featureLabels: { mit: '📈 체세포분열 그래프', m1: '🔀 감수 1분열 모형', m2: '✂️ 감수 2분열 모형', cmp: '⚖️ 그래프 겹쳐 보기 · 비교표', nondis: '⚠️ 염색체 비분리 모형' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  S.cmp.x = 8; S.cmp.tx = 8; S.cmpT = 0;
  setMode('mit');
  let lastFree = false, lastMode = '', lastLv = -1;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply();
    S.cmp.x = RM ? S.cmp.tx : approach(S.cmp.x, S.cmp.tx, dt, 9);
    stepScene(dt);
    if (S.f !== S.lastF) { S.lastF = S.f; updateCtl(); }
    ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    if (S.mode === 'cmp') { drawResultCards(dt, t); drawGraphCmp(dt, t); }
    else {
      drawScene(dt, t);
      if (S.mode === 'nondis') drawNdCard(); else drawGraphMain(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    if (game && game.free && !S.filled) { S.filled = true; autoFill(); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, setFrame, setProc, levels, CHR, ct, cells, PROC, SC, GP, gxOf, gyOf, bivRect, RPOLE, HSEP, CX0, CY0, U, TBL, tblSels, resetSep, layout, mitVal,
    pull(p, d) { S.sep.off[p] = d * RPOLE(); S.sep.done[p] = true; S.sep.armed = true; }, updateCtl,
  };
})();
