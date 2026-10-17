/* =========================================================
   중3 Ⅵ. 생식과 유전 - 사람의 유전  [9과21-05]
   ① 관찰: 연구 방법 (완두와 사람 비교, 연구 방법 짝짓기, 1란성·2란성 쌍둥이)
   ② 탐구: 가계도 읽기 (기호, 열성 판단)
   ③ 분석: 혈액형 유전 (ABO식, 유전자형 추론, 퍼넷 사각형)
   ④ 분석: 적록 색맹 (X 염색체 열성 유전, 보인자)
   ※ 모든 가족은 가상의 가족이며 이름 대신 번호를 씁니다. 학생 가족 정보를 입력하는 기능은 없습니다.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound } = SciSim;
  const TAU = Math.PI * 2;
  const RM = SciSim.reduceMotion;
  const ease = SciSim.ease;

  const view = SciSim.stage($('#cv'), { width: 800, height: 520, background: '#f4f9ef' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const { rgba, shade, mix } = SciSim.color;
  const parts = new SciSim.Particles();
  let game = null;
  let F = new Set();
  const on = (f) => (game ? game.has(f) : F.has(f));
  const isNew = (f) => !!(game && game.isNew(f));
  const smooth = (u, a, b) => clamp((u - a) / (b - a), 0, 1);
  const sm = (u, a, b) => ease.inOutCubic(smooth(u, a, b));
  let tNow = 0;
  let scene = null;

  const MALE = '#2f6fe0', FEMALE = '#e0518d', INK = '#334155', MUTED = '#64748b', LINE = '#475569';
  const GREEN = '#14a058', ORANGE = '#f08a24';
  const SCENES = ['cmp', 'meth', 'twin', 'ped', 'abo', 'cb'];
  const BG = {
    cmp: ['#f6faf1', '#e6f1df'], meth: ['#f6faf1', '#e6f1df'], twin: ['#fff6ee', '#fbe3d6'],
    ped: ['#f6faf1', '#e6f1df'], abo: ['#fdf7ee', '#f5e7d6'], cb: ['#f6faf1', '#e6f1df'],
  };
  const SC_TITLE = {
    cmp: '🔍 완두와 사람 비교', meth: '🧰 사람의 유전 연구 방법', twin: '👶 쌍둥이 연구',
    ped: '🌳 가계도 읽기 (가상의 가족)', abo: '🩸 ABO식 혈액형의 유전 (가상의 가족)', cb: '🎨 적록 색맹의 유전 (가상의 가족)',
  };

  /* ---------- 도우미 ---------- */
  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5000);
  }
  function hideHint() { hintEl.classList.add('hide'); }
  const mark = (b) => (b ? '✅' : '⬜');
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  /* 글자를 폭에 맞게 줄바꿈해 그리기 (공백 기준, 긴 단어는 글자 단위) */
  function wrapLines(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const words = str.split(' '), lines = []; let cur = '';
    words.forEach((w) => {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW) { cur = t; return; }
      if (cur) lines.push(cur);
      cur = w;
    });
    if (cur) lines.push(cur);
    ctx.restore();
    return lines;
  }
  function paragraph(x, y, str, maxW, o) {
    o = o || {};
    const size = o.size || 14, lh = o.lh || size * 1.4;
    const lines = wrapLines(str, maxW, size, o.weight);
    lines.forEach((ln, i) => D.text(x, y + i * lh, ln, { size, weight: o.weight || 700, color: o.color || INK, align: o.align || 'left', alpha: o.alpha }));
    return y + lines.length * lh;
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    D.shadow(() => { D.roundRect(x, y, w, h, o.r || 14); ctx.fillStyle = o.fill || 'rgba(255,255,255,.96)'; ctx.fill(); }, { blur: o.blur != null ? o.blur : 10, y: 3 });
    if (o.stroke) { D.roundRect(x, y, w, h, o.r || 14); ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); }
  }
  /* 사람 모양 (머리 + 몸) */
  function person(x, y, s, color, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.fillStyle = color;
    D.roundRect(-11, -2, 22, 26, 9); ctx.fill();
    D.sphere(0, -10, 8.5, o.skin || '#ffd9b8', { gloss: false, outline: 'rgba(0,0,0,.12)', outlineWidth: 1 });
    ctx.restore();
  }
  /* 완두 알 */
  function pea(x, y, r, wrinkled) {
    if (!wrinkled) { D.sphere(x, y, r, '#7ccf5a', { outline: 'rgba(30,90,30,.35)', outlineWidth: 1 }); return; }
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r * 1.1);
    g.addColorStop(0, '#d8e8a0'); g.addColorStop(1, '#8aa84a');
    ctx.fillStyle = g; ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, rr = r * (1 + 0.1 * Math.sin(a * 7)); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(70,90,20,.45)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
  /* 빨간 ✗ 표시 */
  function cross(x, y, r, p) {
    p = p == null ? 1 : p;
    ctx.save(); ctx.translate(x, y); ctx.scale(0.4 + 0.6 * p, 0.4 + 0.6 * p); ctx.globalAlpha = clamp(p * 1.4, 0, 1);
    D.sphere(0, 0, r, '#e2464b', { gloss: false });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.24; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * .4, -r * .4); ctx.lineTo(r * .4, r * .4); ctx.moveTo(r * .4, -r * .4); ctx.lineTo(-r * .4, r * .4); ctx.stroke();
    ctx.restore();
  }
  /* 염색체 아이콘: type 'X' | 'Y', mark = 색맹 유전자 X′ 표시 */
  function chrom(x, y, type, s, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.lineCap = 'round'; ctx.lineWidth = 5.4 * s;
    const col = o.color || (type === 'Y' ? '#64748b' : '#6d7fd0');
    ctx.strokeStyle = col;
    ctx.beginPath();
    if (type === 'X') { ctx.moveTo(-6 * s, -8 * s); ctx.lineTo(6 * s, 8 * s); ctx.moveTo(6 * s, -8 * s); ctx.lineTo(-6 * s, 8 * s); }
    else { ctx.moveTo(-5.5 * s, -8 * s); ctx.lineTo(0, 0); ctx.moveTo(5.5 * s, -8 * s); ctx.lineTo(0, 0); ctx.moveTo(0, 0); ctx.lineTo(0, 8.5 * s); }
    ctx.stroke();
    if (o.mark) {
      ctx.beginPath(); ctx.arc(-4.8 * s, -6.2 * s, 3.8 * s, 0, TAU); ctx.fillStyle = '#e11d48'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4 * s; ctx.stroke();
    }
    ctx.restore();
  }
  function chromPair(x, y, a, b, s, alpha) {
    // a, b: 'X' | "X'" | 'Y' | '?'
    [[x - 11 * s, a], [x + 11 * s, b]].forEach(([cx, k]) => {
      if (k === '?') { D.text(cx, y + 5 * s, '?', { size: 15 * s, weight: 800, color: MUTED, alpha }); return; }
      chrom(cx, y, k === 'Y' ? 'Y' : 'X', s, { mark: k === "X'", alpha });
    });
  }

  /* =========================================================
     가계도 엔진: 노드(사각형 = 남자, 원 = 여자), 부부선, 자녀선
     ========================================================= */
  const NR = 22;   // 노드 반지름
  function makePed(def) {
    const ped = { nodes: [], by: {}, couples: [], fams: [], t: 0, trait: def.trait || '#7c3aed', done: false };
    def.nodes.forEach((d) => { const n = Object.assign({ show: 0, hl: 0, shake: 0, ring: 0, extra: null }, d); ped.nodes.push(n); ped.by[n.id] = n; });
    def.couples.forEach(([a, b, at]) => ped.couples.push({ a: ped.by[a], b: ped.by[b], at: at, hl: 0, p: 0 }));
    def.fams.forEach(([a, b, kids, at]) => ped.fams.push({ a: ped.by[a], b: ped.by[b], kids: kids.map((k) => ped.by[k]), at: at, hl: 0, p: 0 }));
    return ped;
  }
  function pedReset(ped, instant) {
    ped.t = instant || RM ? 99 : 0;
    ped.nodes.forEach((n) => { n.show = instant || RM ? 1 : 0; n.hl = 0; n.shake = 0; n.ring = 0; });
    ped.couples.forEach((c) => { c.p = instant || RM ? 1 : 0; c.hl = 0; });
    ped.fams.forEach((f) => { f.p = instant || RM ? 1 : 0; f.hl = 0; });
  }
  function pedUpdate(ped, dt) {
    ped.t += dt;
    ped.nodes.forEach((n) => {
      n.show = ease.outBack(clamp((ped.t - n.at) / 0.5, 0, 1));
      if (n.shake > 0) n.shake = Math.max(0, n.shake - dt * 2.2);
      if (n.ringT > 0) n.ringT = Math.max(0, n.ringT - dt);
    });
    ped.couples.forEach((c) => { c.p = clamp((ped.t - c.at) / 0.4, 0, 1); });
    ped.fams.forEach((f) => { f.p = clamp((ped.t - f.at) / 0.6, 0, 1); });
  }
  /* 자녀선 경로: [줄기, 가로 막대, 아래로 내려가는 선들] */
  function famGeom(f) {
    const my = f.a.y, mx = (f.a.x + f.b.x) / 2;
    const ky = f.kids[0].y, barY = ky - NR - 34;
    const xs = f.kids.map((k) => k.x);
    const bx0 = Math.min(mx, ...xs), bx1 = Math.max(mx, ...xs);
    return { mx, my, barY, ky, bx0, bx1 };
  }
  function polyPartial(pts, p) {
    // pts: [[x,y],...] 앞에서부터 p(0~1)만큼 그리기
    let total = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
    let left = total * p;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      if (left <= 0) break;
      const l = seg[i - 1], k = Math.min(1, left / l);
      ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k);
      left -= l;
    }
    ctx.stroke();
  }
  function pedLines(ped) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const stroke = (pts, p, hl, color) => {
      if (p <= 0) return;
      if (hl > 0.02) { ctx.strokeStyle = rgba(color || '#ffb400', 0.55 * hl); ctx.lineWidth = 11; polyPartial(pts, p); }
      ctx.strokeStyle = LINE; ctx.lineWidth = 3; polyPartial(pts, p);
    };
    ped.couples.forEach((c) => {
      stroke([[c.a.x + NR, c.a.y], [c.b.x - NR, c.b.y]], c.p, c.hl, ped.hlColor);
    });
    ped.fams.forEach((f) => {
      const g = famGeom(f);
      const pm = clamp(f.p / 0.35, 0, 1), pb = clamp((f.p - 0.3) / 0.35, 0, 1), pk = clamp((f.p - 0.6) / 0.4, 0, 1);
      stroke([[g.mx, g.my], [g.mx, g.barY]], pm, f.hl, ped.hlColor);
      if (g.bx1 - g.bx0 > 1) stroke([[g.mx, g.barY], [g.bx0, g.barY]], pb, f.hl, ped.hlColor), stroke([[g.mx, g.barY], [g.bx1, g.barY]], pb, f.hl, ped.hlColor);
      f.kids.forEach((k) => stroke([[k.x, g.barY], [k.x, g.ky - NR]], pk, f.hl, ped.hlColor));
    });
    ctx.restore();
  }
  /* 노드 하나 그리기. o.fill(n) → 색 | null(흰색) */
  function pedNode(ped, n, o) {
    const s = n.show;
    if (s <= 0.02) return;
    const sx = n.x + Math.sin(tNow * 70) * 7 * n.shake;
    ctx.save(); ctx.translate(sx, n.y); ctx.scale(s, s);
    const col = n.sex === 'm' ? MALE : FEMALE;
    const fillC = o.fill ? o.fill(n) : (n.aff ? ped.trait : null);
    const path = () => { if (n.sex === 'm') D.roundRect(-NR, -NR, NR * 2, NR * 2, 5); else { ctx.beginPath(); ctx.arc(0, 0, NR, 0, TAU); } };
    D.shadow(() => { path(); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 8, y: 3 });
    if (fillC) {
      const g = ctx.createLinearGradient(-NR, -NR, NR, NR);
      g.addColorStop(0, shade(fillC, 0.28)); g.addColorStop(1, shade(fillC, -0.12));
      path(); ctx.fillStyle = g; ctx.fill();
    }
    path(); ctx.strokeStyle = col; ctx.lineWidth = 3.4; ctx.stroke();
    ctx.restore();
    D.text(sx, n.y + 6, String(n.id), { size: 18, weight: 800, color: fillC ? '#fff' : INK });
    if (n.hl > 0.02) { ctx.save(); ctx.globalAlpha = n.hl; D.ring(n.x, n.y, NR + 9, tNow, { color: o.hlColor || '#f59e0b', width: 3.5 }); ctx.restore(); }
  }
  function pedDraw(ped, o) {
    o = o || {};
    pedLines(ped);
    ped.nodes.forEach((n) => pedNode(ped, n, o));
  }
  function hitNode(ped, p) {
    let best = null, bd = 30;
    ped.nodes.forEach((n) => { if (n.show < 0.6) return; const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < bd) { bd = d; best = n; } });
    return best;
  }
  /* 부모 → 자녀로 가는 경로 (가계도 선을 따라) */
  function route(ped, fromId, toId) {
    const f = ped.fams.find((q) => (q.a.id === fromId || q.b.id === fromId) && q.kids.some((k) => k.id === toId));
    const a = ped.by[fromId], k = ped.by[toId], g = famGeom(f);
    const sideX = (a.x < g.mx) ? a.x + NR : a.x - NR;
    return [[a.x, a.y], [g.mx, g.my], [g.mx, g.barY], [k.x, g.barY], [k.x, k.y]];
  }
  function polyAt(pts, p) {
    let total = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
    let left = total * clamp(p, 0, 1);
    for (let i = 1; i < pts.length; i++) {
      const l = seg[i - 1];
      if (left <= l || i === pts.length - 1) { const k = l ? clamp(left / l, 0, 1) : 1; return { x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k }; }
      left -= l;
    }
    return { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] };
  }

  /* =========================================================
     장면 1 · 완두와 사람 비교
     ========================================================= */
  const CMP = { seen: new Set(), p: [0, 0, 0, 0], sel: -1, t: [0, 0, 0, 0] };
  const CMP_PILL = ['세대 시간', '자손 수', '교배 실험', '형질'];
  const ROW_Y = [118, 220, 322, 424];
  function resetCmp() {
    CMP.seen = new Set(); CMP.p = [0, 0, 0, 0]; CMP.sel = -1; CMP.t = [0, 0, 0, 0];
    $$('#cmpSeg button').forEach((b) => b.classList.remove('on'));
  }
  function pickCmp(k) {
    if (k < 0 || k > 3) return;
    if (!CMP.seen.has(k)) { CMP.t[k] = 0; if (RM) CMP.p[k] = 1; }
    CMP.seen.add(k); CMP.sel = k;
    $$('#cmpSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.k === k));
    Sound.tick(); hideHint();
    const y = ROW_Y[k];
    parts.burst(400, y, { count: 10, speed: 110, life: 0.6, size: 3.5, colors: ['#7ccf5a', '#f08a24', '#ffd36b'] });
  }
  function updCmp(dt) {
    for (let k = 0; k < 4; k++) if (CMP.seen.has(k)) { CMP.t[k] += dt; CMP.p[k] = SciSim.approach(CMP.p[k], 1, dt, 3.2); }
  }
  function drawCmp(t) {
    // 머리 카드
    D.label(175, 36, '완두', { bg: '#3f9d3a', size: 17, pad: 18 });
    D.label(625, 36, '사람', { bg: '#e07b1c', size: 17, pad: 18 });
    for (let k = 0; k < 4; k++) {
      const y = ROW_Y[k], p = CMP.p[k], seen = CMP.seen.has(k);
      // 행 바탕
      ctx.save();
      D.roundRect(22, y - 44, 756, 88, 16);
      if (seen) { ctx.fillStyle = rgba('#ffffff', 0.5 + 0.35 * p); ctx.fill(); ctx.strokeStyle = CMP.sel === k ? '#14a058' : 'rgba(100,116,139,.25)'; ctx.lineWidth = CMP.sel === k ? 3 : 1.5; ctx.stroke(); }
      else { ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill(); ctx.setLineDash([7, 7]); ctx.strokeStyle = 'rgba(100,116,139,.4)'; ctx.lineWidth = 1.6; ctx.stroke(); }
      ctx.restore();
      // 가운데 이름표
      D.label(400, y, CMP_PILL[k], { bg: seen ? '#334155' : '#a8b3c4', size: 15, pad: 14 });
      if (!seen) {
        D.text(175, y + 5, '?', { size: 24, weight: 800, color: 'rgba(100,116,139,.55)' });
        D.text(625, y + 5, '?', { size: 24, weight: 800, color: 'rgba(100,116,139,.55)' });
        continue;
      }
      ctx.save(); ctx.globalAlpha = clamp(p * 1.5, 0, 1);
      if (k === 0) {
        const L = 62 * p, R = 262 * p;
        D.roundRect(40, y - 22, Math.max(12, L), 20, 10); ctx.fillStyle = '#6cc34d'; ctx.fill();
        D.roundRect(488, y - 22, Math.max(12, R), 20, 10); ctx.fillStyle = '#f2a04a'; ctx.fill();
        D.text(40, y + 22, '짧다 (1년 이내)', { size: 15, weight: 800, color: '#2f7a2c', align: 'left' });
        D.text(488, y + 22, '길다 (약 20~30년)', { size: 15, weight: 800, color: '#b45d0a', align: 'left' });
        // 세대가 이어지는 점
      } else if (k === 1) {
        const n = Math.round(15 * clamp(p * 1.1, 0, 1));
        for (let i = 0; i < n; i++) {
          const pp = ease.outBack(clamp(p * 1.6 - i * 0.05, 0, 1));
          pea(48 + (i % 5) * 24, y - 22 + Math.floor(i / 5) * 22, 8.5 * pp, false);
        }
        D.text(190, y - 4, '많다', { size: 20, weight: 800, color: '#2f7a2c', align: 'left' });
        D.text(190, y + 20, '한 번에 수십 개 이상', { size: 14, weight: 700, color: MUTED, align: 'left' });
        const pp = ease.outBack(clamp(p * 1.4, 0, 1));
        person(500, y + 2, 1.15 * pp, '#f2a04a'); person(540, y + 2, 1.15 * clamp(pp - 0.1, 0, 1) / 1, '#f2a04a');
        D.text(590, y - 4, '적다', { size: 20, weight: 800, color: '#b45d0a', align: 'left' });
        D.text(590, y + 20, '한 번에 보통 1명', { size: 14, weight: 700, color: MUTED, align: 'left' });
      } else if (k === 2) {
        pea(54, y, 13, false); pea(116, y, 13, true);
        D.arrow(72, y, 98, y, { color: '#3f9d3a', width: 3, head: 8 });
        D.check(172, y, 15 * ease.outBack(clamp(p * 1.3, 0, 1)), clamp(p * 1.6 - 0.2, 0, 1));
        D.text(196, y - 2, '원하는 대로', { size: 15, weight: 800, color: '#2f7a2c', align: 'left' });
        D.text(196, y + 20, '교배할 수 있어요', { size: 15, weight: 800, color: '#2f7a2c', align: 'left' });
        person(500, y + 2, 1.1, '#f2a04a'); person(552, y + 2, 1.1, '#f2a04a');
        D.arrow(518, y, 536, y, { color: '#b9a28c', width: 3, head: 7, dash: [4, 4] });
        cross(606, y, 15, clamp(p * 1.6 - 0.2, 0, 1));
        D.text(630, y - 2, '자유로운 교배', { size: 15, weight: 800, color: '#b45d0a', align: 'left' });
        D.text(630, y + 20, '실험은 할 수 없어요', { size: 15, weight: 800, color: '#b45d0a', align: 'left' });
      } else {
        pea(54, y - 2, 15, false); pea(104, y - 2, 15, true);
        D.text(54, y + 30, '둥근', { size: 13, weight: 700, color: MUTED }); D.text(104, y + 30, '주름진', { size: 13, weight: 700, color: MUTED });
        D.text(140, y - 4, '뚜렷하게', { size: 15, weight: 800, color: '#2f7a2c', align: 'left' });
        D.text(140, y + 18, '구분되는 형질', { size: 15, weight: 800, color: '#2f7a2c', align: 'left' });
        person(494, y + 2, 1.15, '#f2a04a');
        D.label(572, y - 16, '환경', { bg: '#7aa8e8', size: 13, pad: 12 });
        D.label(572, y + 16, '여러 유전자', { bg: '#9b7fe0', size: 13, pad: 12 });
        D.arrow(527, y - 10, 535, y - 14, { color: '#9aa5b6', width: 2, head: 5 });
        D.text(636, y - 2, '영향을 받는', { size: 15, weight: 800, color: '#b45d0a', align: 'left' });
        D.text(636, y + 20, '형질이 많아요', { size: 15, weight: 800, color: '#b45d0a', align: 'left' });
      }
      ctx.restore();
    }
    if (CMP.seen.size >= 4) D.label(400, 488, '그래서 사람의 유전은 완두와 다른 방법으로 연구해요 →', { bg: 'rgba(30,90,170,.92)', size: 15, pad: 14 });
  }

  /* =========================================================
     장면 2 · 연구 방법 짝짓기 (그림 카드 4장)
     ========================================================= */
  const METH = [
    { name: '가계도 조사', ans: '(가)', short: '한 집안의 여러 세대를 조사' },
    { name: '쌍둥이 연구', ans: '(다)', short: '쌍둥이를 비교' },
    { name: '집단 조사', ans: '(나)', short: '많은 사람의 형질 비율 조사' },
    { name: 'DNA·염색체 분석', ans: '(라)', short: 'DNA와 염색체를 검사' },
  ];
  const CASES = { '(가)': '한 집안의 여러 세대를 조사', '(나)': '많은 사람의 혈액형 비율 조사', '(다)': '유전자가 같은 쌍둥이와 다른 쌍둥이 비교', '(라)': 'DNA 염기 서열·염색체 검사' };
  const MS = { sel: ['', '', '', ''], pop: [0, 0, 0, 0], ok: 0 };
  function resetMeth() { MS.sel = ['', '', '', '']; MS.pop = [0, 0, 0, 0]; $$('.msel').forEach((s) => { s.value = ''; s.classList.remove('has'); }); }
  function readMeth() { MS.sel = [0, 1, 2, 3].map((i) => { const s = document.querySelector('.msel[data-i="' + i + '"]'); return s ? s.value : ''; }); return MS.sel; }
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('msel')) { t.classList.toggle('has', !!t.value); readMeth(); MS.pop[+t.dataset.i] = 1; Sound.tick(); }
  });
  function pictoPedigree(cx, cy, t) {
    ctx.save(); ctx.strokeStyle = LINE; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx - 28, cy - 30); ctx.lineTo(cx + 28, cy - 30); ctx.moveTo(cx, cy - 30); ctx.lineTo(cx, cy - 6); ctx.moveTo(cx - 28, cy - 6); ctx.lineTo(cx + 28, cy - 6); ctx.moveTo(cx - 28, cy - 6); ctx.lineTo(cx - 28, cy + 8); ctx.moveTo(cx + 28, cy - 6); ctx.lineTo(cx + 28, cy + 8); ctx.stroke();
    const sq = (x, y, f) => { D.roundRect(x - 12, y - 12, 24, 24, 4); ctx.fillStyle = f || '#fff'; ctx.fill(); ctx.strokeStyle = MALE; ctx.lineWidth = 2.6; ctx.stroke(); };
    const ci = (x, y, f) => { ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fillStyle = f || '#fff'; ctx.fill(); ctx.strokeStyle = FEMALE; ctx.lineWidth = 2.6; ctx.stroke(); };
    sq(cx - 28, cy - 30); ci(cx + 28, cy - 30); sq(cx - 28, cy + 22, '#7c3aed'); ci(cx + 28, cy + 22);
    ctx.restore();
  }
  function pictoTwins(cx, cy, t) {
    person(cx - 26, cy - 4, 1.9, '#60a5fa'); person(cx + 26, cy - 4, 1.9, '#60a5fa');
    D.text(cx, cy + 14, '=', { size: 30, weight: 800, color: '#e11d48' });
  }
  function pictoPop(cx, cy, t) {
    const cols = ['#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b'];
    for (let i = 0; i < 20; i++) { const x = cx - 52 + (i % 5) * 16, y = cy - 40 + Math.floor(i / 5) * 16; D.sphere(x, y, 5.5, cols[(i * 7 + (i >> 2)) % 4], { gloss: false }); }
    const hs = [34, 24, 12, 18];
    hs.forEach((h, i) => { D.roundRect(cx + 38 + i * 15, cy + 38 - h, 11, h, 3); ctx.fillStyle = cols[i]; ctx.fill(); });
    ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + 34, cy - 2); ctx.lineTo(cx + 34, cy + 38); ctx.lineTo(cx + 104, cy + 38); ctx.stroke();
  }
  function pictoDNA(cx, cy, t) {
    ctx.save(); ctx.lineCap = 'round';
    const n = 9;
    for (let i = 0; i < n; i++) {
      const y = cy - 46 + i * 11.5, ph = t * 1.6 + i * 0.62, x1 = cx + Math.sin(ph) * 26, x2 = cx - Math.sin(ph) * 26;
      ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      D.sphere(x1, y, 5.5, '#e0518d', { gloss: false }); D.sphere(x2, y, 5.5, '#3b6fe0', { gloss: false });
    }
    ctx.restore();
  }
  function drawMeth(t) {
    const pos = [[28, 24], [412, 24], [28, 262], [412, 262]], W = 360, H = 224;
    const pic = [pictoPedigree, pictoTwins, pictoPop, pictoDNA];
    const done = game && game.phase === 'success';
    METH.forEach((m, i) => {
      const [x, y] = pos[i];
      MS.pop[i] = SciSim.approach(MS.pop[i], 0, 1 / 60, 6);
      const k = 1 + 0.03 * MS.pop[i];
      ctx.save(); ctx.translate(x + W / 2, y + H / 2); ctx.scale(k, k); ctx.translate(-(x + W / 2), -(y + H / 2));
      panel(x, y, W, H, { r: 18, stroke: done ? '#14a058' : (MS.sel[i] ? '#9ab8e8' : 'rgba(100,116,139,.25)'), lw: done ? 3 : 2 });
      D.label(x + 28, y + 30, String(i + 1), { bg: '#334155', size: 16, pad: 9 });
      D.text(x + 52, y + 36, m.name, { size: 20, weight: 800, color: INK, align: 'left' });
      pic[i](x + 100, y + 138, t);
      // 고른 사례
      const ch = MS.sel[i];
      if (ch) {
        D.label(x + 292, y + 86, ch, { bg: '#4b7be5', size: 20, pad: 14 });
        paragraph(x + 188, y + 128, CASES[ch], 160, { size: 14, weight: 700, color: INK });
      } else {
        D.roundRect(x + 186, y + 76, 160, 112, 12); ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
        D.text(x + 266, y + 138, '사례를 고르세요', { size: 14, weight: 700, color: MUTED });
      }
      if (done) D.check(x + W - 26, y + 28, 15, clamp((game.phase === 'success' ? 1 : 0), 0, 1));
      ctx.restore();
    });
  }

  /* =========================================================
     장면 3 · 쌍둥이 (1란성 / 2란성)
     ========================================================= */
  const TW = { type: 1, u: 0 };
  const GA = ['#e0518d', '#3b6fe0', '#f59e0b'], GB = ['#14a058', '#8b5cf6', '#ef4444'];
  const TW_END = 7.2;
  function startTwin(type) {
    if (type) TW.type = type;
    TW.u = 0; parts.clear();
    $$('#twSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.k === TW.type));
    TW.seen = TW.seen || new Set(); TW.seen.add(TW.type);
    Sound.click(); hideHint();
  }
  function updTwin(dt) { TW.u = Math.min(TW_END + 0.5, TW.u + dt); }
  function sperm(x, y, ang, t, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.strokeStyle = rgba(color, 0.8); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i <= 14; i++) { const xx = -i * 3.2, yy = Math.sin(t * 16 - i * 0.7) * (1.2 + i * 0.28); ctx[i ? 'lineTo' : 'moveTo'](xx, yy); }
    ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 4.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-1.5, -1.6, 2.6, 1.2, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function twCell(x, y, r, nuc, a) {
    ctx.save(); if (a != null) ctx.globalAlpha = a;
    D.sphere(x, y, r, '#ffc9a0', { outline: 'rgba(150,80,50,.5)', outlineWidth: 1.2 });
    D.sphere(x + r * 0.05, y + r * 0.08, Math.max(3, r * 0.3), nuc, { gloss: false });
    ctx.restore();
  }
  const L = [[[0, 0]], [[-1, 0], [1, 0]], [[-1, -1], [1, -1], [-1, 1], [1, 1]]];
  /* gen 0~2 의 배치에서 다음 세대로 frac(0~1) 만큼 분열한 모습. dy: 아래 둘/위 둘을 벌리는 거리 */
  function twCluster(cx, cy, gen, frac, nuc, a, sep) {
    const R = 44, r0 = R / Math.pow(Math.SQRT2, gen), r1 = R / Math.pow(Math.SQRT2, gen + 1);
    const nxt = L[gen + 1] || null;
    const cells = [];
    if (!nxt) { L[gen].forEach(([lx, ly]) => cells.push([lx * r0, ly * r0, r0, ly])); }
    else {
      const n = L[gen + 1].length;
      for (let i = 0; i < n; i++) {
        const par = L[gen][i >> 1], tg = L[gen + 1][i];
        const px = par[0] * r0, py = par[1] * r0, tx = tg[0] * r1, ty = tg[1] * r1;
        cells.push([lerp(px, tx, frac), lerp(py, ty, frac), lerp(r0, r1, frac), ty]);
      }
    }
    cells.forEach(([dx, dy, r, sgn]) => {
      const sy = sep ? (sgn < 0 ? -1 : 1) * sep : 0;
      twCell(cx + dx, cy + dy + sy, r * 0.97, nuc, a);
    });
  }
  function babyGlyph(x, y, genes, shirt, a, label) {
    ctx.save(); ctx.globalAlpha = a;
    D.shadow(() => { D.roundRect(x - 24, y - 4, 48, 54, 16); ctx.fillStyle = shirt; ctx.fill(); }, { blur: 8, y: 3 });
    D.sphere(x, y - 18, 20, '#ffdcc0', { outline: 'rgba(0,0,0,.14)', outlineWidth: 1.2 });
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x - 7, y - 20, 2.2, 0, TAU); ctx.arc(x + 7, y - 20, 2.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x, y - 13, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    genes.forEach((c, i) => { D.roundRect(x - 16 + i * 12, y + 8, 8, 30, 4); ctx.fillStyle = c; ctx.fill(); });
    ctx.restore();
  }
  function drawTwin(t) {
    const u = TW.u, type = TW.type;
    // 단계 열
    [[24, 250], [290, 230], [536, 240]].forEach(([x, w], i) => {
      D.roundRect(x, 54, w, 332, 18); ctx.fillStyle = 'rgba(255,255,255,.34)'; ctx.fill();
      ctx.strokeStyle = 'rgba(160,110,80,.22)'; ctx.lineWidth = 1.5; ctx.stroke();
    });
    // 단계 이름표
    const chip = (x, txt, at) => { const a = smooth(u, at, at + 0.4); if (a > 0) { ctx.save(); ctx.globalAlpha = a; D.label(x, 34, txt, { bg: '#334155', size: 15, pad: 14 }); ctx.restore(); } };
    chip(150, '① 수정', 0); chip(400, '② 난할', 1.9); chip(660, '③ 쌍둥이', 5.2);
    const eggs = type === 1 ? [[140, 262]] : [[140, 198], [140, 326]];
    const sgenes = type === 1 ? [GA] : [GA, GB];
    const fused = sm(u, 1.1, 1.5);
    eggs.forEach(([ex, ey], i) => {
      // 난자 + 정자
      const g = sgenes[i], a0 = 1 - smooth(u, 2.0, 2.3);
      if (a0 > 0) {
        ctx.save(); ctx.globalAlpha = a0;
        D.glow(ex, ey, 80, '#ffffff', 0.5);
        D.sphere(ex, ey, 46, '#ffd2a8', { outline: 'rgba(160,90,50,.55)', outlineWidth: 2 });
        // 난자 핵
        const nc = fused > 0.5 ? mix(g[0], '#3b6fe0', 0.5) : '#f0a8c8';
        D.sphere(ex + 2, ey + 3, 14, fused > 0.5 ? g[0] : '#e68db4', { gloss: false });
        if (fused > 0.5) D.sphere(ex + 11, ey - 2, 9, g[1], { gloss: false });
        const s = sm(u, 0.1 + i * 0.15, 1.1 + i * 0.15);
        if (s < 1 && u < 1.3) {
          const sx = lerp(30, ex - 52, s), sy = lerp(ey + 62, ey + 4, ease.outCubic(s));
          sperm(sx, sy, -0.5 * (1 - s), t + i, i ? '#2f9d63' : '#4b6fe0');
          if (i === 0 && type === 2) { sperm(sx - 24, sy + 22, -0.45, t + 3, '#9aa5c8'); }
          if (i === 0 && type === 1) { sperm(sx - 24, sy + 22, -0.45, t + 3, '#9aa5c8'); sperm(sx - 40, sy - 20, -0.4, t + 5, '#9aa5c8'); }
        }
        ctx.restore();
        // 수정막 고리
        const rk = smooth(u, 1.15, 2.1);
        if (rk > 0 && rk < 1) { ctx.save(); ctx.strokeStyle = rgba('#3b8de0', 0.8 * (1 - rk)); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ex, ey, 48 + rk * 20, 0, TAU); ctx.stroke(); ctx.restore(); }
        if (fused > 0.5) { ctx.save(); ctx.globalAlpha = a0; ctx.strokeStyle = 'rgba(59,141,224,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ex, ey, 49, 0, TAU); ctx.stroke(); ctx.restore(); }
      }
      if (u > 0.5 && u < 2.0) {
        const lab = type === 1 ? (i ? '' : '수정란 1개') : ('수정란 ' + (i + 1));
        const a = smooth(u, 1.4, 1.8) * (1 - smooth(u, 1.8, 2.0));
        if (lab) { ctx.save(); ctx.globalAlpha = a; D.label(ex, ey + 72, lab, { bg: '#d1337a', size: 14, pad: 10 }); ctx.restore(); }
      }
    });
    // 난할: 이동과 분열
    const mv = sm(u, 2.0, 3.0), gen1 = sm(u, 3.0, 3.5), gen2 = sm(u, 3.7, 4.2);
    const mvOut = sm(u, 5.4, 6.4);
    const babyA = smooth(u, 6.0, 6.7);
    if (u >= 2.0) {
      if (type === 1) {
        const cx0 = lerp(140, 400, mv), cx = lerp(cx0, 660, mvOut), a = 1 - babyA;
        const sep = sm(u, 4.6, 5.3) * 40;
        const gen = u < 3.5 ? 0 : (u < 4.3 ? 1 : 2);
        const fr = gen === 0 ? gen1 : gen === 1 ? gen2 : 0;
        // 2회 분열이 끝난 뒤 두 덩어리로 갈라짐
        if (u < 3.5) twCluster(cx, 262, 0, gen1, GA[0], a);
        else if (u < 4.3) twCluster(cx, 262, 1, gen2, GA[0], a);
        else twCluster(cx, 262, 2, 0, GA[0], a, sep);
        if (u > 4.8 && u < 6.4) { ctx.save(); ctx.globalAlpha = smooth(u, 4.8, 5.2) * (1 - babyA); D.label(cx, 262 - 100, '둘로 갈라져요', { bg: '#d1337a', size: 14, pad: 12 }); ctx.restore(); }
      } else {
        [[198, 0], [326, 1]].forEach(([ey, i]) => {
          const cx0 = lerp(140, 400, mv), cx = lerp(cx0, 660, mvOut), a = 1 - babyA, g = sgenes[i];
          if (u < 3.5) twCluster(cx, ey, 0, gen1, g[0], a);
          else if (u < 4.3) twCluster(cx, ey, 1, gen2, g[0], a);
          else twCluster(cx, ey, 2, 0, g[0], a);
        });
      }
    }
    if (u > 6.0) {
      const a = babyA;
      if (type === 1) {
        babyGlyph(620, 222, GA, '#8ec5ff', a); babyGlyph(700, 222, GA, '#8ec5ff', a);
        D.text(660, 306, '유전자가 같아요', { size: 17, weight: 800, color: '#b3144f', alpha: a });
        D.text(660, 328, '성별도 같아요', { size: 15, weight: 800, color: INK, alpha: a });
        D.text(660, 242, '=', { size: 32, weight: 800, color: '#b3144f', alpha: a });
      } else {
        babyGlyph(620, 222, GA, '#8ec5ff', a); babyGlyph(700, 222, GB, '#ffa8c6', a);
        D.text(660, 306, '유전자가 달라요', { size: 17, weight: 800, color: '#1d7a49', alpha: a });
        D.text(660, 328, '성별이 다를 수도 있어요', { size: 15, weight: 800, color: INK, alpha: a });
      }
    }
    // 마무리 설명
    const e = smooth(u, 6.8, 7.2);
    if (e > 0) {
      ctx.save(); ctx.globalAlpha = e;
      panel(40, 400, 720, 92, { r: 16, stroke: type === 1 ? '#e0518d' : '#14a058', lw: 2.5 });
      if (type === 1) {
        D.text(60, 432, '1란성 쌍둥이: 수정란 1개가 둘로 갈라져 만들어져요.', { size: 17, weight: 800, color: '#b3144f', align: 'left' });
        D.text(60, 460, '유전자가 같으므로 생김새의 차이는 환경의 영향이라고 볼 수 있어요.', { size: 15, weight: 700, color: INK, align: 'left' });
      } else {
        D.text(60, 432, '2란성 쌍둥이: 서로 다른 수정란 2개가 함께 자라서 만들어져요.', { size: 17, weight: 800, color: '#1d7a49', align: 'left' });
        D.text(60, 460, '유전자는 보통의 형제자매처럼 서로 달라요.', { size: 15, weight: 700, color: INK, align: 'left' });
      }
      ctx.restore();
    }
    parts.draw(ctx);
  }

  /* =========================================================
     장면 4 · 가계도 읽기 (가상 형질 ㉠, 열성)
     ========================================================= */
  const PED1 = makePed({
    trait: '#7c3aed',
    nodes: [
      { id: 1, sex: 'm', x: 100, y: 108, aff: false, at: 0 }, { id: 2, sex: 'f', x: 200, y: 108, aff: false, at: 0.25 },
      { id: 3, sex: 'm', x: 360, y: 108, aff: true, at: 0.5 }, { id: 4, sex: 'f', x: 460, y: 108, aff: false, at: 0.75 },
      { id: 5, sex: 'f', x: 60, y: 255, aff: true, at: 1.5 }, { id: 6, sex: 'm', x: 190, y: 255, aff: false, at: 1.7 },
      { id: 7, sex: 'f', x: 340, y: 255, aff: false, at: 2.0 }, { id: 8, sex: 'm', x: 480, y: 255, aff: false, at: 2.2 },
      { id: 9, sex: 'm', x: 215, y: 405, aff: true, at: 3.4 }, { id: 10, sex: 'f', x: 315, y: 405, aff: false, at: 3.6 },
    ],
    couples: [[1, 2, 0.6], [3, 4, 1.15], [6, 7, 2.7]],
    fams: [[1, 2, [5, 6], 0.95], [3, 4, [7, 8], 1.45], [6, 7, [9, 10], 2.9]],
  });
  const PEDS = { seen: new Set(), found: new Set(), msg: '', focus: -1, focusT: 0, quizFocus: false };
  const LEG = [[596, 52, 188, 96], [596, 156, 188, 96], [596, 260, 188, 96]];
  function resetPed() { pedReset(PED1); PEDS.seen = new Set(); PEDS.found = new Set(); PEDS.msg = ''; PEDS.focus = -1; PEDS.focusT = 0; PEDS.quizFocus = false; PEDS.pop = [0, 0, 0]; }
  function pickLegend(i) {
    PEDS.seen.add(i); PEDS.focus = i; PEDS.focusT = 3.0; PEDS.pop[i] = 1; Sound.tick(); hideHint();
    PEDS.msg = ['□ 는 남자, ○ 는 여자예요.', '색칠한 칸은 형질 ㉠이 나타난 사람, 색칠하지 않은 칸은 나타나지 않은 사람이에요.', '부부는 가로선(━)으로, 부모와 자녀는 세로선(│)으로 이어요.'][i];
    if (PEDS.seen.size === 3 && PEDS.found.size < 2) showHint('👆 부모는 정상인데 형질 ㉠이 나타난 자녀를 가계도에서 찾아 눌러 보세요', 6000);
  }
  function tapPed(n) {
    const fam = PED1.fams.find((f) => f.kids.includes(n));
    let m = n.id + '번 · ' + (n.sex === 'm' ? '남자' : '여자') + ' · ' + (n.aff ? '형질 ㉠이 나타남' : '형질 ㉠이 나타나지 않음') + '. ';
    n.ringT = 0.9;
    if (n.aff && fam && !fam.a.aff && !fam.b.aff) {
      const first = !PEDS.found.has(n.id); PEDS.found.add(n.id);
      m += '부모 ' + fam.a.id + '번, ' + fam.b.id + '번은 모두 정상인데 형질이 나타난 자녀예요!';
      if (first) { parts.burst(n.x, n.y, { count: 16, speed: 150 }); Sound.success(); }
    } else if (n.aff && !fam) { m += '부모가 그려져 있지 않아서 부모의 형질을 알 수 없어요.'; n.shake = 1; Sound.fail(); }
    else if (n.aff) { m += '부모 중에도 형질이 나타난 사람이 있어요.'; n.shake = 1; Sound.fail(); }
    else { m += '색칠된 자녀를 찾아보세요.'; n.shake = 1; Sound.fail(); }
    PEDS.msg = m;
  }
  function updPed(dt) {
    pedUpdate(PED1, dt);
    PEDS.focusT = Math.max(0, PEDS.focusT - dt);
    for (let i = 0; i < 3; i++) PEDS.pop[i] = SciSim.approach(PEDS.pop[i], 0, dt, 6);
    PED1.nodes.forEach((n) => {
      let want = 0; n.hlc = null;
      if (PEDS.focusT > 0 && PEDS.focus === 0) { want = 1; n.hlc = n.sex === 'm' ? MALE : FEMALE; }
      if (PEDS.focusT > 0 && PEDS.focus === 1 && n.aff) { want = 1; n.hlc = '#7c3aed'; }
      if (PEDS.quizFocus && (n.id === 1 || n.id === 2 || n.id === 5)) { want = 1; n.hlc = n.id === 5 ? '#7c3aed' : GREEN; }
      if (PEDS.found.has(n.id)) { want = Math.max(want, 0.0001); }
      n.hl = SciSim.approach(n.hl, want, dt, 8);
    });
    PED1.couples.forEach((c) => { c.hl = SciSim.approach(c.hl, PEDS.focusT > 0 && PEDS.focus === 2 ? 1 : 0, dt, 8); });
    PED1.fams.forEach((f) => { f.hl = SciSim.approach(f.hl, PEDS.focusT > 0 && PEDS.focus === 2 ? 1 : 0, dt, 8); });
  }
  function legendSym(x, y, sex, fill) {
    ctx.save(); ctx.translate(x, y);
    const path = () => { if (sex === 'm') D.roundRect(-13, -13, 26, 26, 4); else { ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); } };
    path(); ctx.fillStyle = fill || '#fff'; ctx.fill(); path(); ctx.strokeStyle = sex === 'm' ? MALE : FEMALE; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  function drawPed(t) {
    D.text(30, 34, '형질 ㉠ (가상의 형질) · 이름 대신 번호를 써요', { size: 14, weight: 800, color: MUTED, align: 'left' });
    PED1.nodes.forEach((n) => { n.hlColor = n.hlc; });
    pedLines(PED1);
    PED1.nodes.forEach((n) => {
      pedNode(PED1, n, { hlColor: n.hlc || '#f59e0b' });
      if (n.ringT > 0) { ctx.save(); ctx.globalAlpha = n.ringT; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(n.x, n.y, NR + 6 + (0.9 - n.ringT) * 14, 0, TAU); ctx.stroke(); ctx.restore(); }
      if (PEDS.found.has(n.id)) D.check(n.x + NR - 2, n.y - NR + 2, 11, 1);
    });
    if (PEDS.quizFocus) {
      D.label(150, 152, '정상인 부모 ①②', { bg: GREEN, size: 14, pad: 10 });
      D.label(60, 296, '㉠ 나타남', { bg: '#7c3aed', size: 14, pad: 10 });
      D.arrow(110, 150, 70, 224, { color: '#7c3aed', width: 2.5, head: 8, alpha: 0.9 });
    }
    // 기호 카드
    const titles = ['성별', '형질 ㉠', '선'];
    LEG.forEach(([x, y, w, h], i) => {
      const k = 1 + 0.05 * PEDS.pop[i];
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(k, k); ctx.translate(-(x + w / 2), -(y + h / 2));
      panel(x, y, w, h, { r: 14, stroke: PEDS.seen.has(i) ? '#14a058' : 'rgba(100,116,139,.28)', lw: PEDS.seen.has(i) ? 2.5 : 1.5 });
      D.text(x + 12, y + 22, titles[i], { size: 14, weight: 800, color: MUTED, align: 'left' });
      if (PEDS.seen.has(i)) D.check(x + w - 20, y + 20, 10, 1);
      if (i === 0) {
        legendSym(x + 36, y + 56, 'm'); D.text(x + 36, y + 87, '남자', { size: 14, weight: 800 });
        legendSym(x + 108, y + 56, 'f'); D.text(x + 108, y + 87, '여자', { size: 14, weight: 800 });
      } else if (i === 1) {
        legendSym(x + 36, y + 56, 'f', '#7c3aed'); D.text(x + 36, y + 87, '나타남', { size: 14, weight: 800 });
        legendSym(x + 118, y + 56, 'f'); D.text(x + 124, y + 87, '나타나지 않음', { size: 13, weight: 800 });
      } else {
        ctx.save(); ctx.strokeStyle = LINE; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + 18, y + 48); ctx.lineTo(x + 74, y + 48); ctx.moveTo(x + 124, y + 36); ctx.lineTo(x + 124, y + 66); ctx.stroke(); ctx.restore();
        D.text(x + 46, y + 78, '부부', { size: 14, weight: 800 }); D.text(x + 142, y + 87, '자녀', { size: 14, weight: 800, align: 'center' });
      }
      ctx.restore();
    });
    // 안내 상자
    panel(596, 372, 188, 120, { r: 14, fill: 'rgba(255,255,255,.9)' });
    if (PEDS.msg) paragraph(608, 394, PEDS.msg, 166, { size: 13.5, lh: 18, color: INK });
    else paragraph(608, 394, '기호 카드를 눌러 뜻을 확인하고, 가계도의 사람을 눌러 보세요.', 166, { size: 13.5, lh: 18, color: MUTED });
    if (PEDS.seen.size < 3) LEG.forEach(([x, y, w, h], i) => { if (!PEDS.seen.has(i) && game && game.phase === 'active' && game.has('pedigree') && PED1.t > 4) { const pp = 0.5 + 0.5 * Math.sin(t * 3.2 + i * 0.8); ctx.save(); ctx.globalAlpha = 0.35 + 0.55 * pp; D.roundRect(x - 3, y - 3, w + 6, h + 6, 16); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore(); } });
    parts.draw(ctx);
  }

  /* =========================================================
     장면 5 · ABO식 혈액형의 유전
     ========================================================= */
  const BT = { A: '#ef4444', B: '#3b82f6', AB: '#8b5cf6', O: '#f59e0b' };
  const AL = { A: '#ef4444', B: '#3b82f6', O: '#f59e0b' };
  const btOf = (g) => { const a = g.includes('A'), b = g.includes('B'); return a && b ? 'AB' : a ? 'A' : b ? 'B' : 'O'; };
  const sortG = (x, y) => [x, y].sort().join('');
  const PEDA = makePed({
    trait: '#999',
    nodes: [
      { id: 1, sex: 'm', x: 110, y: 100, bt: 'A', at: 0 }, { id: 2, sex: 'f', x: 250, y: 100, bt: 'B', at: 0.25 },
      { id: 3, sex: 'f', x: 55, y: 262, bt: 'O', at: 1.1 }, { id: 4, sex: 'm', x: 180, y: 262, bt: 'AB', at: 1.3 }, { id: 5, sex: 'm', x: 305, y: 262, bt: 'A', at: 1.5 },
    ],
    couples: [[1, 2, 0.6]], fams: [[1, 2, [3, 4, 5], 0.9]],
  });
  const ABO = { m: 0, target: 0, sel: { 1: '', 2: '', 3: '' }, cells: [], pop: 0, all: false };
  const FATHER = ['A', 'O'], MOTHER = ['B', 'O'];
  const CX0 = 520, CY0 = 172, CS = 112;
  function resetAbo() {
    pedReset(PEDA); ABO.m = 0; ABO.target = 0; ABO.pop = 0; ABO.all = false;
    ABO.cells = [0, 1, 2, 3].map((i) => ({ i, r: i >> 1, c: i & 1, t: -1 }));
    ABO.sel = { 1: '', 2: '', 3: '' };
    $$('.gsel').forEach((s) => { s.value = ''; s.classList.remove('has'); });
  }
  const cellsFilled = () => ABO.cells.filter((c) => c.t >= 0).length;
  function fillAll() { ABO.cells.forEach((c) => { if (c.t < 0) c.t = 5; }); ABO.all = true; }
  function readAbo() { [1, 2, 3].forEach((i) => { const s = document.querySelector('.gsel[data-id="' + i + '"]'); ABO.sel[i] = s ? s.value : ''; }); return ABO.sel; }
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('gsel')) { t.classList.toggle('has', !!t.value); readAbo(); ABO.pop = 1; Sound.tick(); }
  });
  function tapAboCell(c) {
    if (c.t >= 0) return;
    c.t = 0; Sound.tick(); hideHint();
    if (cellsFilled() === 4) { ABO.all = true; setTimeout(() => { Sound.success(); parts.burst(CX0 + CS, CY0 + CS, { count: 22, speed: 190 }); }, 650); }
  }
  function updAbo(dt) {
    pedUpdate(PEDA, dt);
    ABO.m = SciSim.approach(ABO.m, ABO.target, dt, 5);
    if (Math.abs(ABO.m - ABO.target) < 0.002) ABO.m = ABO.target;
    ABO.pop = SciSim.approach(ABO.pop, 0, dt, 6);
    ABO.cells.forEach((c) => { if (c.t >= 0 && c.t < 5) c.t += dt; });
  }
  function alleleBall(x, y, a, r) { D.sphere(x, y, r, AL[a], { text: a, textScale: 1.15, outline: 'rgba(0,0,0,.18)', outlineWidth: 1 }); }
  function genoPill(x, y, g, a) {
    // x,y = 중심. 두 대립유전자 구슬을 담은 알약
    ctx.save(); if (a != null) ctx.globalAlpha = a;
    D.roundRect(x - 41, y - 22, 82, 44, 22); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    alleleBall(x - 17, y, g[0], 14); alleleBall(x + 17, y, g[1], 14);
    ctx.restore();
  }
  function aboTruth(id) { return { 1: 'AO', 2: 'BO', 3: 'OO' }[id]; }
  function drawAbo(t) {
    const m = ABO.m;
    // 가계도 (왼쪽)
    pedLines(PEDA);
    PEDA.nodes.forEach((n) => {
      pedNode(PEDA, n, { fill: (q) => BT[q.bt] });
      if (n.show < 0.6) return;
      D.label(n.x, n.y + 40, n.bt + '형', { bg: BT[n.bt], size: 14, pad: 9 });
      let g = '';
      if (n.id <= 3) {
        const sel = ABO.sel[n.id];
        g = m > 0.5 ? aboTruth(n.id) : (sel || '?');
      } else if (n.id === 4) g = 'AB'; else g = '?';
      const ok = n.id <= 3 && (m > 0.5 || ABO.sel[n.id] === aboTruth(n.id));
      D.text(n.x, n.y + 74, g, { size: 19, weight: 800, color: ok ? '#0b6b39' : (g === '?' ? '#94a3b8' : INK) });
      if (ok) D.check(n.x + 26, n.y + 62, 8, 1);
    });
    D.text(30, 34, '가상의 가족 · 번호로 나타냈어요', { size: 14, weight: 800, color: MUTED, align: 'left' });
    panel(18, 392, 362, 100, { r: 14 });
    D.text(34, 420, '대립유전자 A, B, O', { size: 15, weight: 800, color: INK, align: 'left' });
    alleleBall(246, 414, 'A', 12); D.text(272, 420, '=', { size: 16, weight: 800, color: MUTED }); alleleBall(298, 414, 'B', 12); D.text(322, 420, '>', { size: 18, weight: 800, color: INK }); alleleBall(348, 414, 'O', 12);
    paragraph(34, 446, 'A와 B는 O에 대해 우성이에요.', 330, { size: 14, color: INK });
    paragraph(34, 466, 'A와 B 사이에는 우열이 없어요.', 330, { size: 14, color: INK });

    // 오른쪽: 유전자형 표 (m=0) → 퍼넷 사각형 (m=1)
    if (m < 0.98 && on('abo')) {
      ctx.save(); ctx.globalAlpha = 1 - m; ctx.translate(-70 * m, 0);
      panel(400, 40, 384, 452, { r: 18 });
      D.text(592, 78, '유전자형 → 혈액형', { size: 19, weight: 800, color: INK });
      const rows = [['A', ['AA', 'AO']], ['B', ['BB', 'BO']], ['AB', ['AB']], ['O', ['OO']]];
      rows.forEach(([bt, gs], i) => {
        const y = 150 + i * 86, rev = ease.outCubic(smooth(PEDA.t, 0.4 + i * 0.3, 0.9 + i * 0.3));
        ctx.save(); ctx.globalAlpha *= rev; ctx.translate(0, (1 - rev) * 12);
        gs.forEach((g, j) => genoPill(458 + j * 98, y, g));
        D.arrow(618, y, 656, y, { color: '#9aa5b6', width: 2.5, head: 8 });
        D.label(712, y, bt + '형', { bg: BT[bt], size: 19, pad: 16 });
        ctx.restore();
      });
      ctx.restore();
    }
    if (m > 0.02 && on('punnett')) {
      ctx.save(); ctx.globalAlpha = m; ctx.translate(70 * (1 - m), 0);
      panel(400, 40, 384, 452, { r: 18 });
      D.text(592, 74, '① 아버지 AO × ② 어머니 BO', { size: 17, weight: 800, color: INK });
      D.text(CX0 + CS, 108, '② 어머니의 생식세포', { size: 14, weight: 800, color: MUTED });
      ctx.save(); ctx.translate(432, CY0 + CS); ctx.rotate(-Math.PI / 2); D.text(0, 0, '① 아버지의 생식세포', { size: 14, weight: 800, color: MUTED }); ctx.restore();
      MOTHER.forEach((a, j) => alleleBall(CX0 + j * CS + CS / 2, CY0 - 22, a, 17));
      FATHER.forEach((a, i) => alleleBall(CX0 - 30, CY0 + i * CS + CS / 2, a, 17));
      ABO.cells.forEach((c) => {
        const x = CX0 + c.c * CS, y = CY0 + c.r * CS, cx = x + CS / 2, cy = y + CS / 2;
        const g = sortG(FATHER[c.r], MOTHER[c.c]), bt = btOf(g);
        if (c.t < 0) {
          D.roundRect(x + 4, y + 4, CS - 8, CS - 8, 14); ctx.fillStyle = 'rgba(241,245,249,.9)'; ctx.fill();
          ctx.save(); ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
          D.text(cx, cy + 10, '?', { size: 30, weight: 800, color: '#b4bfcd' });
          if (game && game.phase === 'active' && game.has('punnett') && ABO.target === 1 && !ABO.all) { const p = 0.5 + 0.5 * Math.sin(t * 3 + c.i); ctx.save(); ctx.globalAlpha = 0.35 + 0.4 * p; D.roundRect(x + 2, y + 2, CS - 4, CS - 4, 15); ctx.strokeStyle = GREEN; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); }
        } else {
          const k = clamp(c.t / 0.55, 0, 1), pop = ease.outBack(clamp((c.t - 0.45) / 0.4, 0, 1));
          D.roundRect(x + 4, y + 4, CS - 8, CS - 8, 14); ctx.fillStyle = rgba(BT[bt], 0.14 + 0.1 * pop); ctx.fill(); ctx.strokeStyle = rgba(BT[bt], 0.8); ctx.lineWidth = 2.5; ctx.stroke();
          if (k < 1) {
            const e = ease.inOutCubic(k);
            const a1 = { x: lerp(CX0 - 30, cx - 22, e), y: lerp(CY0 + c.r * CS + CS / 2, cy - 4, e) };
            const a2 = { x: lerp(CX0 + c.c * CS + CS / 2, cx + 22, e), y: lerp(CY0 - 22, cy - 4, e) };
            alleleBall(a1.x, a1.y, FATHER[c.r], 17); alleleBall(a2.x, a2.y, MOTHER[c.c], 17);
          } else {
            ctx.save(); ctx.translate(cx, cy - 12); ctx.scale(pop, pop);
            D.text(0, 10, g, { size: 36, weight: 800, color: shade(BT[bt], -0.25) });
            ctx.restore();
            ctx.save(); ctx.globalAlpha = pop; D.label(cx, y + CS - 22, bt + '형', { bg: BT[bt], size: 15, pad: 12 }); ctx.restore();
          }
        }
      });
      if (ABO.all) {
        const k = ease.outCubic(clamp((ABO.cells[3].t - 0.8) / 0.5, 0, 1));
        ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 10);
        [['A', 0], ['B', 1], ['AB', 2], ['O', 3]].forEach(([b, i]) => D.label(484 + i * 74, 428, b + '형', { bg: BT[b], size: 15, pad: 10 }));
        [0, 1, 2, 3].forEach((i) => D.text(484 + i * 74, 458, '1/4', { size: 17, weight: 800, color: INK }));
        ctx.restore();
      }
      ctx.restore();
    }
    parts.draw(ctx);
  }

  /* =========================================================
     장면 6 · 적록 색맹 (X 염색체 열성 유전)
     ========================================================= */
  const CBC = '#e8590c';
  const PED4 = makePed({
    trait: CBC,
    nodes: [
      { id: 1, sex: 'm', x: 110, y: 92, aff: true, at: 0, g: ["X'", 'Y'] }, { id: 2, sex: 'f', x: 240, y: 92, aff: false, at: 0.25, g: ['X', 'X'] },
      { id: 3, sex: 'm', x: 70, y: 238, aff: false, at: 1.2, g: ['X', 'Y'] }, { id: 4, sex: 'f', x: 190, y: 238, aff: false, at: 1.4, g: ["X'", 'X'] },
      { id: 5, sex: 'm', x: 330, y: 238, aff: false, at: 1.7, g: ['X', 'Y'] },
      { id: 6, sex: 'm', x: 170, y: 386, aff: true, at: 2.9, g: ["X'", 'Y'] }, { id: 7, sex: 'f', x: 260, y: 386, aff: false, at: 3.1, g: ['X', '?'] },
      { id: 8, sex: 'm', x: 350, y: 386, aff: false, at: 3.3, g: ['X', 'Y'] },
    ],
    couples: [[1, 2, 0.6], [4, 5, 2.1]],
    fams: [[1, 2, [3, 4], 0.9], [4, 5, [6, 7, 8], 2.4]],
  });
  PED4.hlColor = '#e11d48';
  const CB = { chr: false, rev: {}, path: false, pt: 0, pathDone: false, found: false, msg: '', tokens: [], leg: 0, pop: 0 };
  const CB_MSG = {
    1: "① 색맹인 남자(X′Y)예요. 보인자는 색맹은 아닌데 X′을 가진 사람이에요.",
    2: '② 정상인 여자(XX)예요. 이 가족에서 ②는 색맹 유전자가 없다고 해요.',
    3: '③ 정상인 남자(XY)예요. 남자는 X 염색체가 하나뿐이라 X′이 있으면 색맹이 돼요.',
    5: '⑤ 정상인 남자(XY)예요. X′이 있었다면 색맹이었을 거예요.',
    6: '⑥ 색맹인 남자(X′Y)예요. 색맹은 보인자가 아니에요.',
    7: '⑦은 보인자일 수도 있지만(확률 1/2) 가계도만으로는 확실하지 않아요.',
    8: '⑧ 정상인 남자(XY)예요. 남자는 X′이 있으면 색맹이 돼요.',
  };
  function resetCb() {
    pedReset(PED4); CB.chr = false; CB.rev = {}; CB.path = false; CB.pt = 0; CB.pathDone = false; CB.found = false; CB.msg = ''; CB.tokens = []; CB.leg = 0;
    const b = $('#chrBtn'); b.setAttribute('aria-pressed', 'false');
    $('#pathBtn').textContent = '▶ 전달 경로 보기';
  }
  function startPath() {
    if (CB.path) return;
    CB.rev = {}; CB.path = true; CB.pt = 0; CB.pathDone = false; CB.leg = 0; CB.msg = ''; Sound.click(); hideHint();
    $('#pathBtn').textContent = '↻ 경로 다시 보기';
  }
  function toggleChr() {
    CB.chr = !CB.chr; $('#chrBtn').setAttribute('aria-pressed', CB.chr ? 'true' : 'false'); Sound.click(); CB.pop = 1;
  }
  function tapCb(n) {
    n.ringT = 0.9;
    if (n.id === 4) {
      const first = !CB.found; CB.found = true; CB.msg = "④는 정상이지만 아버지 ①의 X′을 받은 보인자(X′X)예요!"; CB.rev[4] = true;
      if (first) { parts.burst(n.x, n.y, { count: 18, speed: 160 }); Sound.success(); }
      return;
    }
    CB.msg = CB_MSG[n.id] || ''; n.shake = 1; Sound.fail();
  }
  const LEGS = [
    { start: 0.5, dur: 1.9, toks: [{ from: 1, to: 4, k: "X'" }, { from: 1, to: 3, k: 'Y' }], msg: "아버지 ①의 X′은 딸 ④에게, Y는 아들 ③에게 가요.", reveal: [3, 4] },
    { start: 3.6, dur: 1.9, toks: [{ from: 4, to: 6, k: "X'" }, { from: 5, to: 6, k: 'Y' }], msg: "어머니 ④의 X′과 아버지 ⑤의 Y를 받은 아들 ⑥은 색맹이에요.", reveal: [5, 6] },
  ];
  function updCb(dt) {
    pedUpdate(PED4, dt);
    CB.pop = SciSim.approach(CB.pop, 0, dt, 6);
    PED4.nodes.forEach((n) => { n.hl = SciSim.approach(n.hl, 0, dt, 8); });
    PED4.fams.forEach((f) => { f.hl = SciSim.approach(f.hl, 0, dt, 6); });
    if (!CB.path) return;
    CB.pt += dt;
    const t = CB.pt;
    if (t === dt) { CB.rev[1] = true; }
    LEGS.forEach((lg, li) => {
      const u = (t - lg.start) / lg.dur;
      if (u >= 0 && u <= 1.6) {
        CB.msg = lg.msg; CB.leg = li;
        PED4.fams.forEach((f, fi) => { if (lg.toks.some((tk) => f.kids.some((k) => k.id === tk.to))) f.hl = Math.max(f.hl, 1); });
        lg.toks.forEach((tk) => { PED4.by[tk.from].hl = Math.max(PED4.by[tk.from].hl, 1); });
      }
      if (u >= 1) lg.reveal.forEach((id) => { if (!CB.rev[id]) { CB.rev[id] = true; const n = PED4.by[id]; parts.burst(n.x, n.y + 40, { count: 8, speed: 90, life: 0.5, size: 3, colors: ['#e11d48', '#6d7fd0'] }); } });
      if (u >= 1 && u < 1.05) lg.toks.forEach((tk) => { PED4.by[tk.to].hl = 1; });
    });
    if (t > 3.6 + 1.9 + 0.9 && !CB.pathDone) {
      CB.pathDone = true; CB.path = false; CB.rev[1] = true;
      showHint('👆 색맹은 아니지만 X′을 가진 사람(보인자)을 가계도에서 눌러 보세요', 7000);
    }
  }
  function drawCb(t) {
    D.text(30, 34, '가상의 가족 · ②는 색맹 유전자가 없다고 해요', { size: 14, weight: 800, color: MUTED, align: 'left' });
    pedLines(PED4);
    PED4.nodes.forEach((n) => {
      pedNode(PED4, n, { fill: (q) => (q.aff ? CBC : null), hlColor: '#e11d48' });
      if (n.ringT > 0) { ctx.save(); ctx.globalAlpha = n.ringT; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(n.x, n.y, NR + 6 + (0.9 - n.ringT) * 14, 0, TAU); ctx.stroke(); ctx.restore(); }
      if (n.show > 0.6 && on('chromo')) {
        const showIt = CB.chr || CB.rev[n.id];
        if (showIt) {
          const k = ease.outBack(clamp(((CB.chr ? 1 : 0.3) + (n.id === 4 && CB.found ? 1 : 0) + 1), 0, 1));
          ctx.save(); ctx.translate(n.x, n.y + 40); ctx.scale(k, k);
          D.roundRect(-30, -17, 60, 34, 12); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); ctx.strokeStyle = 'rgba(100,116,139,.3)'; ctx.lineWidth = 1.2; ctx.stroke();
          chromPair(0, 0, n.g[0], n.g[1], 0.95, 1);
          ctx.restore();
        }
      }
      if (n.id === 4 && CB.found) D.label(n.x, n.y - 34, '보인자', { bg: '#e11d48', size: 14, pad: 10 });
    });
    // 전달 경로의 염색체 토큰
    if (CB.path) {
      LEGS.forEach((lg) => {
        const u = (CB.pt - lg.start) / lg.dur;
        if (u < 0 || u > 1.05) return;
        const e = ease.inOutCubic(clamp(u, 0, 1));
        lg.toks.forEach((tk) => {
          const pts = route(PED4, tk.from, tk.to), q = polyAt(pts, e);
          const a = u > 0.95 ? clamp((1.05 - u) / 0.1, 0, 1) : 1;
          D.glow(q.x, q.y, 30, tk.k === 'Y' ? '#64748b' : '#e11d48', 0.4 * a);
          ctx.save(); ctx.globalAlpha = a;
          D.sphere(q.x, q.y, 17, '#fff', { gloss: false, outline: tk.k === 'Y' ? '#64748b' : '#e11d48', outlineWidth: 2 });
          chrom(q.x, q.y, tk.k === 'Y' ? 'Y' : 'X', 1.05, { mark: tk.k === "X'" });
          ctx.restore();
        });
      });
    }
    // 오른쪽 안내
    panel(528, 40, 256, 262, { r: 16 });
    D.text(656, 68, '염색체와 표현형', { size: 16, weight: 800, color: INK });
    const rows = [[["X'", 'Y'], "X′Y", '색맹 (남자)', true], [['X', 'Y'], 'XY', '정상 (남자)'], [["X'", "X'"], "X′X′", '색맹 (여자)', true], [["X'", 'X'], "X′X", '정상 · 보인자 (여자)'], [['X', 'X'], 'XX', '정상 (여자)']];
    rows.forEach(([g, name, ph, aff], i) => {
      const y = 104 + i * 38;
      chromPair(554, y, g[0], g[1], 0.8, 1);
      D.text(588, y + 5, name, { size: 15, weight: 800, color: INK, align: 'left' });
      D.text(646, y + 5, ph, { size: 13.5, weight: 800, color: aff ? CBC : (i === 3 ? '#e11d48' : MUTED), align: 'left' });
    });
    D.text(540, 290, "X′ = 색맹 유전자가 있는 X 염색체 (열성)", { size: 13, weight: 700, color: MUTED, align: 'left' });
    panel(528, 316, 256, 176, { r: 16, fill: 'rgba(255,255,255,.92)', stroke: CB.found ? '#14a058' : null });
    if (CB.msg) paragraph(542, 342, CB.msg, 230, { size: 14.5, lh: 20, color: INK });
    else paragraph(542, 342, CB.pathDone ? '색맹은 아니지만 X′을 가진 사람(보인자)을 눌러 보세요.' : '▶ 전달 경로 보기를 누르면 X′이 어떻게 전해지는지 볼 수 있어요.', 230, { size: 14.5, lh: 20, color: MUTED });
    parts.draw(ctx);
  }

  /* =========================================================
     입력 (탭)
     ========================================================= */
  function inRect(p, r) { return p.x >= r[0] && p.x <= r[0] + r[2] && p.y >= r[1] && p.y <= r[1] + r[3]; }
  SciSim.pointer(view, {
    down(p) {
      if (scene === 'ped') {
        const li = LEG.findIndex((r) => inRect(p, r));
        if (li >= 0) { pickLegend(li); return true; }
        const n = hitNode(PED1, p);
        if (n) { tapPed(n); return true; }
      } else if (scene === 'cb') {
        const n = hitNode(PED4, p);
        if (n) { tapCb(n); return true; }
      } else if (scene === 'abo' && ABO.target === 1 && ABO.m > 0.8) {
        const c = ABO.cells.find((q) => inRect(p, [CX0 + q.c * CS, CY0 + q.r * CS, CS, CS]));
        if (c) { tapAboCell(c); return true; }
      }
      return false;
    },
    hover(p) {
      if (scene === 'ped') return LEG.some((r) => inRect(p, r)) || hitNode(PED1, p) ? 'pointer' : null;
      if (scene === 'cb') return hitNode(PED4, p) ? 'pointer' : null;
      if (scene === 'abo' && ABO.target === 1) return ABO.cells.some((q) => q.t < 0 && inRect(p, [CX0 + q.c * CS, CY0 + q.r * CS, CS, CS])) ? 'pointer' : null;
      return null;
    },
  });

  /* =========================================================
     장면 전환 · 컨트롤
     ========================================================= */
  function setScene(name, quiet) {
    scene = name;
    parts.clear();
    $('#actions').setAttribute('data-sc', name);
    const sc = $('.stage-canvas');
    if (sc && BG[name]) sc.style.background = 'linear-gradient(' + BG[name][0] + ',' + BG[name][1] + ')';
    $('#sceneTitle').textContent = SC_TITLE[name];
    $('#sceneSub').textContent = '';
    if (name === 'cmp') resetCmp();
    else if (name === 'meth') resetMeth();
    else if (name === 'twin') { TW.seen = new Set(); startTwin(1); }
    else if (name === 'ped') resetPed();
    else if (name === 'abo') resetAbo();
    else if (name === 'cb') resetCb();
  }
  $$('#cmpSeg button').forEach((b) => b.addEventListener('click', () => pickCmp(+b.dataset.k)));
  $$('#twSeg button').forEach((b) => b.addEventListener('click', () => startTwin(+b.dataset.k)));
  $('#twPlay').addEventListener('click', () => startTwin());
  $('#pathBtn').addEventListener('click', () => { if (CB.path) return; startPath(); });
  $('#chrBtn').addEventListener('click', toggleChr);
  $('#resetBtn').addEventListener('click', () => {
    Sound.click(); setScene(scene);
    if (scene === 'cmp') showHint('👆 위의 버튼을 눌러 완두와 사람을 비교해 보세요', 5000);
  });

  /* =========================================================
     미션 · 퀴즈 내용
     ========================================================= */
  const SEL_M = '<option value="">선택</option><option>(가)</option><option>(나)</option><option>(다)</option><option>(라)</option>';
  const methFigure =
    '<ul class="case-list">' +
    '<li><b>(가)</b>한 집안에서 여러 세대에 걸쳐 어떤 형질이 나타난 사람을 조사해 그림으로 나타낸다.</li>' +
    '<li><b>(나)</b>많은 사람의 혈액형을 조사해 혈액형별 비율을 구한다.</li>' +
    '<li><b>(다)</b>유전자가 같은 쌍둥이와 유전자가 다른 쌍둥이를 비교한다.</li>' +
    '<li><b>(라)</b>DNA의 염기 서열이나 염색체의 수와 모양을 검사한다.</li></ul>' +
    '<table class="tbl-fill"><tbody>' + METH.map((m, i) => '<tr><td class="l">' + (i + 1) + '. ' + m.name + '</td><td><select class="msel" data-i="' + i + '" aria-label="' + m.name + '">' + SEL_M + '</select></td></tr>').join('') + '</tbody></table>';
  const SEL_G = '<option value="">선택</option><option>AA</option><option>AO</option><option>BB</option><option>BO</option><option>AB</option><option>OO</option>';
  const aboFigure =
    '<table class="tbl-fill"><thead><tr><th>번호</th><th>혈액형</th><th>유전자형</th></tr></thead><tbody>' +
    [[1, 'A형'], [2, 'B형'], [3, 'O형']].map(([i, b]) => '<tr><td class="k">' + i + '</td><td>' + b + '</td><td><select class="gsel" data-id="' + i + '" aria-label="' + i + '번 유전자형">' + SEL_G + '</select></td></tr>').join('') +
    '</tbody></table>';

  function levelSetup(name, hint) { return function () { setScene(name); if (hint) showHint(hint, 6000); }; }
  const only = (name) => () => { if (scene !== name) setScene(name); };

  game = SciSim.game({
    simId: 'm3-human-heredity',
    mount: '#game',
    badge: '유전 탐정',
    homeHref: '../../index.html#g3',
    featureLabels: {
      compare: '🔍 완두와 사람 비교', twins: '👶 쌍둥이 모형',
      pedigree: '🌳 가계도 기호 카드', abo: '🩸 유전자형 표', punnett: '🧮 퍼넷 사각형',
      path: '▶ X 염색체 전달 경로', chromo: '🧬 염색체 보기',
    },
    onFeatures(set) { F = set; },
    levels: [
      /* ---------------- STEP 1 ---------------- */
      {
        title: '사람의 유전은 어떻게 연구할까?', short: '연구 방법', icon: '🔍', phase: '관찰',
        features: ['compare', 'twins'],
        intro: '<p class="si-q">❓ 탐구 질문: 완두처럼 교배 실험을 할 수 없는 사람의 유전은 어떻게 연구할까?</p>' +
          '<p>멘델은 완두를 교배해 유전의 규칙을 찾았어요. 사람은 완두와 어떻게 다른지 비교해 보고, 사람의 유전을 연구하는 방법을 알아봐요.</p>' +
          '<p class="cards-note">이 차시의 가족은 모두 가상의 가족이에요. 이름은 쓰지 않고 번호로만 나타내요.</p>',
        setup: levelSetup('cmp', '👆 위의 버튼을 눌러 완두와 사람을 비교해 보세요'),
        recap: '사람은 <b>한 세대가 길고, 자손 수가 적고, 교배 실험을 할 수 없어서</b> 연구하기 어려워요. 그래서 <b>가계도 조사, 쌍둥이 연구, 집단 조사, DNA·염색체 분석</b> 같은 방법을 써요.',
        summary: '<p><b>사람의 유전 연구가 어려운 까닭</b>: ① 한 세대가 길다 ② 자손 수가 적다 ③ 자유로운 교배 실험을 할 수 없다 ④ 형질에 환경과 여러 유전자가 영향을 주는 경우가 많다.</p>' +
          '<p><b>연구 방법</b>: <b>가계도 조사</b>, <b>쌍둥이 연구</b>, <b>집단 조사</b>, <b>DNA·염색체 분석</b>.</p>' +
          '<p><b>1란성 쌍둥이</b>는 하나의 수정란이 둘로 갈라져 생겨 유전자가 같고, <b>2란성 쌍둥이</b>는 서로 다른 수정란 2개에서 생겨 유전자가 서로 달라요. 1란성 쌍둥이의 차이는 환경의 영향으로 볼 수 있어요.</p>',
        missions: [
          {
            title: '완두와 사람 비교하기',
            goal: '네 개의 버튼을 모두 눌러 완두와 사람을 비교해 보세요.',
            hint: '화면 아래의 세대 시간 · 자손 수 · 교배 실험 · 형질 버튼을 차례로 눌러요.',
            hold: 0.6, setup: only('cmp'),
            check: () => scene === 'cmp' && CMP.seen.size >= 4,
            status: () => '비교한 항목 <b>' + CMP.seen.size + ' / 4</b>' + ['세대 시간', '자손 수', '교배 실험', '형질'].map((n, i) => ' · ' + n + ' ' + mark(CMP.seen.has(i))).join(''),
            explain: '사람은 <b>한 세대가 길고</b>(약 20~30년), <b>자손 수가 적고</b>, <b>자유로운 교배 실험을 할 수 없어요</b>. 또 사람의 형질은 <b>환경과 여러 유전자의 영향</b>을 받는 경우가 많아요. 그래서 완두처럼 연구하기 어려워요.',
          },
          {
            title: '연구 방법 짝짓기', manual: true,
            goal: '사람의 유전을 연구하는 네 가지 방법에 알맞은 사례를 짝지어 보세요.',
            figure: methFigure, setup: only('meth'),
            hint: '쌍둥이 연구는 유전자가 같은 쌍둥이와 다른 쌍둥이를 비교해요. 집단 조사는 많은 사람을 대상으로 해요.',
            check: () => {
              const r = readMeth();
              if (r.some((v) => !v)) return '아직 고르지 않은 칸이 있어요.';
              if (new Set(r).size < 4) return '사례는 한 번씩만 쓸 수 있어요. 겹치게 고른 칸이 있는지 살펴보세요.';
              const bad = METH.findIndex((m, i) => r[i] !== m.ans);
              if (bad >= 0) return (bad + 1) + '번(' + METH[bad].name + ')의 사례를 다시 생각해 보세요. ' + ['가계도는 한 집안의 여러 세대를 그린 그림이에요.', '쌍둥이 연구는 쌍둥이끼리 비교해요.', '집단 조사는 많은 사람을 한꺼번에 조사해요.', 'DNA·염색체 분석은 세포 속 유전 물질을 직접 검사해요.'][bad];
              return true;
            },
            status: () => '고른 사례 <b>' + readMeth().filter((v) => v).length + ' / 4</b>',
            explain: '<b>가계도 조사</b>는 한 집안의 여러 세대를, <b>쌍둥이 연구</b>는 쌍둥이를, <b>집단 조사</b>는 많은 사람의 형질 비율을, <b>DNA·염색체 분석</b>은 유전 물질 자체를 조사해요.',
          },
          {
            type: 'quiz', title: '쌍둥이 연구',
            goal: '버튼으로 <b>1란성</b>과 <b>2란성</b> 쌍둥이가 만들어지는 과정을 살펴보세요. 1란성 쌍둥이를 비교하면 무엇을 알 수 있을까요?',
            setup() { setScene('twin'); showHint('👆 1란성과 2란성을 모두 눌러 보세요', 5000); },
            choices: [
              '둘 사이의 차이는 유전자가 달라서 생긴 것이다',
              '유전자가 같으므로, 둘 사이의 차이는 환경의 영향으로 볼 수 있다',
              '1란성 쌍둥이는 서로 성별이 반드시 다르다',
              '쌍둥이를 비교해서는 유전에 대해 아무것도 알 수 없다',
            ],
            answer: 1,
            feedback: ['1란성 쌍둥이는 하나의 수정란에서 갈라져 나와 유전자가 같아요. 차이가 있다면 무엇 때문일까요?', '', '1란성 쌍둥이는 같은 수정란에서 나와 성별도 같아요.', '유전자가 같은 쌍둥이와 다른 쌍둥이를 비교하면 유전과 환경의 영향을 알아볼 수 있어요.'],
            explain: '<b>1란성 쌍둥이</b>는 하나의 수정란이 둘로 갈라져 유전자가 같아요. 그래서 생김새나 성격에 차이가 있다면 <b>환경의 영향</b>이라고 볼 수 있어요. <b>2란성 쌍둥이</b>는 서로 다른 수정란에서 생겨 유전자가 서로 달라요.',
          },
        ],
      },
      /* ---------------- STEP 2 ---------------- */
      {
        title: '가계도 읽는 법', short: '가계도 읽기', icon: '🌳', phase: '탐구',
        features: ['pedigree'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 사람의 유전은 <b>가계도 조사</b> 같은 방법으로 연구한다는 것을 알았어요.</div>' +
          '<p><b>가계도</b>는 한 집안에서 어떤 형질이 어떻게 나타나는지 그린 그림이에요. 기호를 읽는 법을 배우고, 형질이 우성인지 열성인지 알아내 봐요.</p>' +
          '<p class="cards-note">형질 ㉠은 설명을 위한 가상의 형질이에요.</p>',
        setup: levelSetup('ped', '👆 오른쪽의 기호 카드를 눌러 보세요'),
        recap: '가계도에서 <b>□ 남자, ○ 여자, 색칠 = 형질이 나타남, 가로선 = 부부, 세로선 = 자녀</b>예요. 정상인 부모에게서 형질이 나타난 자녀가 태어나면 그 형질은 <b>열성</b>이에요.',
        summary: '<p><b>가계도 기호</b>: □ 남자, ○ 여자, 색칠한 것은 형질이 나타난 사람, 가로선은 부부, 세로선은 자녀.</p>' +
          '<p><b>열성 판단</b>: 부모에게는 형질이 나타나지 않았는데 자녀에게 나타났다면, 부모가 형질 유전자를 숨기고 있었던 것이므로 그 형질은 <b>열성</b>이다.</p>',
        missions: [
          {
            title: '가계도 기호 읽기',
            goal: '기호 카드 3개를 모두 눌러 뜻을 확인해요. 그다음 <b>부모는 정상인데 형질 ㉠이 나타난 자녀</b> 2명을 가계도에서 찾아 눌러 보세요.',
            hint: '색칠된 사람 중에서, 부모를 잇는 선이 있고 그 부모가 모두 색칠되지 않은 사람을 찾아요.',
            hold: 0.7, setup: only('ped'),
            check: () => scene === 'ped' && PEDS.seen.size >= 3 && PEDS.found.size >= 2,
            status: () => '기호 카드 <b>' + PEDS.seen.size + ' / 3</b> · 찾은 자녀 <b>' + PEDS.found.size + ' / 2</b>',
            explain: '정상인 ①②에게서 ⑤가, 정상인 ⑥⑦에게서 ⑨가 태어났어요. 두 부모에게는 형질 ㉠이 나타나지 않았는데 자녀에게는 나타났지요. (③은 부모가 그려져 있지 않아 알 수 없어요.)',
          },
          {
            type: 'quiz', title: '형질 ㉠은 우성일까, 열성일까?',
            goal: '정상인 부모 ①②에게서 형질 ㉠이 나타난 자녀 ⑤가 태어났어요. 형질 ㉠은 어떤 형질일까요?',
            setup() { only('ped')(); PEDS.quizFocus = true; },
            choices: ['우성 형질', '열성 형질', '우성인지 열성인지 알 수 없다', '우성도 열성도 아닌 형질'],
            answer: 1,
            feedback: ['우성 형질은 유전자를 하나만 가져도 나타나요. 그렇다면 부모에게도 나타났어야 해요.', '', '부모에게 없던 형질이 자녀에게 나타난 것이 단서예요.', '이 가계도에서는 우성과 열성으로 설명할 수 있어요.'],
            explain: '부모에게는 나타나지 않았는데 자녀에게 나타났으므로, 부모는 형질 ㉠의 유전자를 <b>숨기고</b> 있었어요. 숨어 있다가 나타나는 형질은 <b>열성</b>이에요.',
          },
        ],
      },
      /* ---------------- STEP 3 ---------------- */
      {
        title: 'ABO식 혈액형의 유전', short: '혈액형 유전', icon: '🩸', phase: '분석',
        features: ['abo', 'punnett'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 가계도에서 부모의 모습으로 유전 현상을 추론하는 방법을 익혔어요.</div>' +
          '<p>ABO식 혈액형은 대립유전자 <b>A, B, O</b> 중 두 개로 정해져요. <b>A와 B는 O에 대해 우성</b>이고, A와 B 사이에는 우열이 없어요. 가계도에서 유전자형을 추론하고 <b>퍼넷 사각형</b>으로 자녀의 혈액형을 예상해 봐요.</p>',
        setup() { setScene('abo'); ABO.target = 0; showHint('👀 가계도가 그려지는 걸 지켜보세요', 4000); },
        recap: 'A형 × B형 부모에게서 O형 자녀가 태어났다면 부모의 유전자형은 <b>AO와 BO</b>예요. AO × BO에서는 <b>A형·B형·AB형·O형이 각각 1/4</b>씩 나올 수 있어요.',
        summary: '<p><b>ABO식 혈액형의 유전자형</b>: A형 = AA, AO · B형 = BB, BO · AB형 = AB · O형 = OO.</p>' +
          '<p>A와 B는 O에 대해 우성이고, A와 B 사이에는 우열이 없다.</p>' +
          '<p><b>예</b>: A형(AO) × B형(BO) → 자녀는 A형, B형, AB형, O형이 각각 <b>1/4</b>의 확률로 태어날 수 있다.</p>',
        missions: [
          {
            title: '유전자형 추론하기', manual: true,
            goal: '①(A형)과 ②(B형) 사이에서 O형인 ③이 태어났어요. ①, ②, ③의 <b>유전자형</b>을 알아내 보세요.',
            figure: aboFigure,
            setup() { only('abo')(); ABO.target = 0; },
            hint: 'O형이 되려면 O를 두 개 가져야 해요. ③은 O를 부모에게서 하나씩 받았어요.',
            check: () => {
              const s = readAbo();
              if (!s[1] || !s[2] || !s[3]) return '아직 고르지 않은 칸이 있어요.';
              if (s[3] !== 'OO') return 'O형이 되려면 O가 두 개(OO) 있어야 해요. A나 B가 하나라도 있으면 O형이 아니에요.';
              if (s[1] !== 'AO') return '③은 부모에게서 O를 하나씩 받았어요. ①은 A형이면서 O를 가지고 있어요. AA일까요, AO일까요?';
              if (s[2] !== 'BO') return '③은 부모에게서 O를 하나씩 받았어요. ②는 B형이면서 O를 가지고 있어요. BB일까요, BO일까요?';
              return true;
            },
            status: () => '유전자형을 고른 사람 <b>' + [1, 2, 3].filter((i) => ABO.sel[i]).length + ' / 3</b>',
            explain: '③은 O형이라 <b>OO</b>예요. O를 하나는 ①에게서, 하나는 ②에게서 받았으니 ①은 A와 O를 가진 <b>AO</b>, ②는 B와 O를 가진 <b>BO</b>예요.',
          },
          {
            title: '퍼넷 사각형 채우기',
            goal: '①(AO)과 ②(BO)의 생식세포가 만나는 경우를 퍼넷 사각형의 빈칸을 눌러 모두 채워 보세요.',
            hint: '빈칸을 누르면 가로와 세로의 대립유전자가 만나요. 네 칸을 모두 눌러요.',
            hold: 0.8,
            setup() { only('abo')(); ABO.target = 1; showHint('👆 빈칸을 눌러 대립유전자를 만나게 해 보세요', 5000); },
            check: () => scene === 'abo' && cellsFilled() === 4 && ABO.cells[3].t > 1,
            status: () => '채운 칸 <b>' + cellsFilled() + ' / 4</b>',
            explain: 'AO × BO에서 자녀의 유전자형은 <b>AB, AO, BO, OO</b> 네 가지가 같은 확률로 나와요. 혈액형으로는 <b>AB형, A형, B형, O형</b>이에요.',
          },
          {
            type: 'quiz', title: 'O형 자녀가 태어날 확률',
            goal: 'AO인 아버지와 BO인 어머니 사이에서 태어나는 자녀가 <b>O형</b>일 확률은 얼마일까요?',
            setup() { only('abo')(); ABO.target = 1; fillAll(); },
            choices: ['0 (O형은 태어날 수 없다)', '1/4', '1/2', '3/4'],
            answer: 1,
            feedback: ['아버지도 어머니도 O를 가지고 있어요. 퍼넷 사각형에서 OO가 있는지 보세요.', '', 'OO는 네 칸 중 몇 칸일까요?', '퍼넷 사각형 네 칸 중 OO인 칸을 세어 보세요.'],
            explain: '퍼넷 사각형 네 칸 중 <b>OO</b>인 칸은 1칸이에요. 그래서 O형일 확률은 <b>1/4</b>이에요. 태어날 때마다 새로 정해지는 확률이라, 첫째가 O형이어도 둘째가 O형일 확률은 여전히 1/4이에요.',
          },
        ],
      },
      /* ---------------- STEP 4 ---------------- */
      {
        title: '적록 색맹의 유전', short: '적록 색맹', icon: '🎨', phase: '분석',
        features: ['path', 'chromo'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 혈액형 유전자는 부모에게서 하나씩 받는다는 것을 확인했어요.</div>' +
          '<p><b>적록 색맹</b> 유전자는 <b>X 염색체</b>에 있는 <b>열성</b> 유전자(X′)예요. 여자는 XX, 남자는 XY이므로 남자와 여자에게 나타나는 방식이 달라요. 가상의 가족에서 X′이 전해지는 길을 따라가 봐요.</p>' +
          '<p class="cards-note">②는 색맹 유전자가 없다고 가정해요.</p>',
        setup() { setScene('cb'); showHint('👀 가계도가 그려진 뒤 “전달 경로 보기”를 눌러 보세요', 5000); },
        recap: '색맹 유전자는 <b>X 염색체</b>에 있는 열성 유전자예요. 아들은 X 염색체를 <b>어머니</b>에게서 받아요. 남자는 X 염색체가 하나뿐이라 X′ 하나만 있어도 색맹이 되어 <b>남자에게 더 많이</b> 나타나요.',
        summary: '<p><b>적록 색맹</b>: X 염색체에 있는 <b>열성</b> 유전자(X′)에 의해 나타난다.</p>' +
          '<p>남자 X′Y → 색맹 · 여자 X′X′ → 색맹 · 여자 X′X → 정상이지만 색맹 유전자를 가진 <b>보인자</b>.</p>' +
          '<p>아들은 X 염색체를 <b>어머니</b>에게서 받는다. 남자는 X′ 하나만 있어도 색맹이 되므로, 색맹은 <b>남자에게 더 많이</b> 나타난다.</p>',
        missions: [
          {
            title: '전달 경로 따라가기',
            goal: '<b>▶ 전달 경로 보기</b>를 눌러 X′이 ①에서 ⑥까지 전해지는 길을 따라가요. 그다음 색맹은 아니지만 X′을 가진 사람(<b>보인자</b>)을 눌러 찾아요.',
            hint: '색맹인 외할아버지 ①의 X′을 받은 딸이 보인자예요. 딸은 정상이에요.',
            hold: 0.7, setup: only('cb'),
            check: () => scene === 'cb' && CB.pathDone && CB.found,
            status: () => '전달 경로 보기 <b>' + mark(CB.pathDone) + '</b> · 보인자 찾기 <b>' + mark(CB.found) + '</b>',
            explain: '①의 X′은 딸 ④에게 전해졌어요. ④는 정상(X′X)이지만 X′을 가진 <b>보인자</b>예요. ④는 다시 X′을 아들 ⑥에게 전해서, ⑥은 X′Y가 되어 색맹이 되었어요.',
          },
          {
            type: 'quiz', title: '아들 ⑥의 X′은 누구에게서?',
            goal: '색맹인 ⑥은 X′을 가졌어요. ⑥은 X′을 누구에게서 받았을까요?',
            setup() { only('cb')(); },
            choices: ['아버지 ⑤', '어머니 ④', '아버지와 어머니 모두', '외할머니 ②'],
            answer: 1,
            feedback: ['아들은 아버지에게서 Y 염색체를 받아요. ⑤는 정상이에요.', '', '아들은 Y 염색체를 아버지에게서, X 염색체를 어머니에게서 받아요.', '⑥에게 X 염색체를 준 사람은 부모 중 한 명이에요. ②는 색맹 유전자가 없어요.'],
            explain: '아들(XY)의 <b>Y 염색체는 아버지</b>에게서, <b>X 염색체는 어머니</b>에게서 받아요. 그래서 ⑥의 X′은 보인자인 어머니 ④에게서 왔어요.',
          },
          {
            type: 'quiz', title: '남자에게 더 많이 나타나는 까닭',
            goal: '적록 색맹은 여자보다 남자에게 더 많이 나타나요. 그 까닭은 무엇일까요?',
            setup() { only('cb')(); },
            choices: [
              '색맹 유전자가 Y 염색체에 있기 때문이다',
              '색맹 유전자가 우성이기 때문이다',
              '남자는 X 염색체가 하나뿐이어서, X′ 하나만 있어도 색맹이 되기 때문이다',
              '남자만 색맹 유전자를 물려받기 때문이다',
            ],
            answer: 2,
            feedback: ['색맹 유전자는 X 염색체에 있어요. 그림에서 X′ 표시를 확인해 보세요.', '색맹은 열성이에요. 여자는 X′X′일 때만 색맹이 돼요.', '', '여자도 X′을 물려받아요(보인자). 다만 X′X이면 정상으로 보여요.'],
            explain: '색맹 유전자는 X 염색체에 있는 <b>열성</b>이에요. 여자(XX)는 X′이 <b>두 개(X′X′)</b>여야 색맹이지만, 남자(XY)는 X 염색체가 하나뿐이라 <b>X′ 하나만</b> 있어도 색맹이에요. 그래서 남자에게 더 많이 나타나요.',
          },
        ],
      },
    ],
  });

  if (!scene) setScene(['cmp', 'ped', 'abo', 'cb'][clamp(game.level, 0, 3)]);

  /* =========================================================
     메인 루프
     ========================================================= */
  SciSim.loop((dt, t) => {
    tNow = t;
    if (scene === 'cmp') updCmp(dt);
    else if (scene === 'twin') updTwin(dt);
    else if (scene === 'ped') updPed(dt);
    else if (scene === 'abo') updAbo(dt);
    else if (scene === 'cb') updCb(dt);
    parts.update(dt);
    view.apply();
    ctx.clearRect(0, 0, 800, 520);
    if (scene === 'cmp') drawCmp(t);
    else if (scene === 'meth') drawMeth(t);
    else if (scene === 'twin') drawTwin(t);
    else if (scene === 'ped') drawPed(t);
    else if (scene === 'abo') drawAbo(t);
    else if (scene === 'cb') drawCb(t);
    // 새로 열린 도구 표시
    const act = game.phase === 'active';
    $('#pathBtn').classList.toggle('target', scene === 'cb' && !CB.path && !CB.pathDone && act && PED4.t > 4);
    $$('#cmpSeg button').forEach((b) => b.classList.toggle('target', scene === 'cmp' && act && !CMP.seen.has(+b.dataset.k) && CMP.seen.size < 4 && +b.dataset.k === Math.min(...[0, 1, 2, 3].filter((k) => !CMP.seen.has(k)))));
    $$('#twSeg button').forEach((b) => b.classList.toggle('target', scene === 'twin' && act && TW.seen && TW.seen.size < 2 && TW.u > TW_END && +b.dataset.k !== TW.type));
  });

  /* 시험용 */
  window.__sim = {
    game, get scene() { return scene; }, CMP, TW, PED1, PEDS, PEDA, ABO, PED4, CB, MS,
    toClient(x, y) {
      const r = view.canvas.getBoundingClientRect();
      return { x: r.left + x * r.width / 800, y: r.top + y * r.height / 520 };
    },
    nodePos(ped, id) { const n = ped.by[id]; return { x: n.x, y: n.y }; },
    legPos(i) { const r = LEG[i]; return { x: r[0] + r[2] / 2, y: r[1] + r[3] / 2 }; },
    cellPos(i) { const q = ABO.cells[i]; return { x: CX0 + q.c * CS + CS / 2, y: CY0 + q.r * CS + CS / 2 }; },
    setScene, startPath, startTwin, pickCmp,
  };
})();
